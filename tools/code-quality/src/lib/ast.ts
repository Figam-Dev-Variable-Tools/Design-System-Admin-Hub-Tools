/**
 * AST 계층 — TypeScript 컴파일러 API(ts.createSourceFile)로 소스를 파싱하고
 * import/export/함수/토큰을 추출한다.
 *
 * 왜 정규식이 아닌가: 축 4·5·6은 **모듈 해석 기반 import 그래프**여야 하고(SKILL 절차 1),
 * 축 1·3(중복)·2(복잡도)는 AST 없이는 JSX·템플릿 리터럴·주석 안의 코드 조각을
 * 코드로 오인한다. 오탐은 blocker 를 잘못 켠다 — 측정 도구의 오탐은 게이트의 거짓말이다.
 *
 * 의존성: typescript (리포 전 도구의 공통 devDependency — 신규 외부 의존성 아님)
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { RESOLVABLE_EXTENSIONS, WORKSPACE_ALIASES } from '../thresholds.ts';
import { dirnamePosix, joinPosix } from './fsutil.ts';

export type ImportKind = 'import' | 'side-effect' | 'dynamic' | 're-export' | 'export-star';

export interface ImportEdge {
  /** import 하는 파일 (리포 루트 기준 POSIX 상대경로) */
  from: string;
  /** 소스에 쓰인 원문 specifier */
  specifier: string;
  /** 해석된 대상 파일. 외부 패키지·해석 실패 시 null */
  to: string | null;
  /** 1-based 라인 */
  line: number;
  kind: ImportKind;
  /** import 된 원본 심볼명 (default / * 포함). side-effect 는 빈 배열 */
  names: string[];
  /** import * as X */
  namespace: boolean;
  typeOnly: boolean;
}

export interface ExportSymbol {
  file: string;
  /** 외부에 노출되는 이름 (`export { A as B }` → B) */
  name: string;
  line: number;
  /** 다른 모듈에서 온 재export(배럴)인가 — 정의부가 아니다 */
  reexportFrom: string | null;
  /** 재export 일 때 원본 모듈에서의 이름 (`export { A as B } from` → A) */
  sourceName: string | null;
}

export interface FunctionMetric {
  file: string;
  name: string;
  line: number;
  complexity: number;
}

export interface ParsedFile {
  file: string;
  sourceFile: ts.SourceFile;
  lineCount: number;
  imports: ImportEdge[];
  exports: ExportSymbol[];
  functions: FunctionMetric[];
  /** 중복 검사용: 라인별 정규화 토큰열 (식별자 익명화, 리터럴 익명화, 주석 제거) */
  normalizedLines: { line: number; text: string }[];
  /**
   * 파일 내부의 식별자 참조 횟수 (선언 자체 포함).
   * 축 5에서 "파일 안에서만 쓰이는 export"(= export 키워드가 불필요)와
   * "아무도 참조하지 않는 export"(= 삭제 대상)를 구분하는 데 쓴다.
   * property 이름·import/export 절의 이름은 세지 않는다 (오탐 방지).
   */
  identifierRefs: Map<string, number>;
}

export function parse(root: string, file: string, text: string): ParsedFile {
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const lineOf = (pos: number): number => sourceFile.getLineAndCharacterOfPosition(pos).line + 1;

  return {
    file,
    sourceFile,
    lineCount: sourceFile.getLineStarts().length,
    imports: collectImports(root, file, sourceFile, lineOf),
    exports: collectExports(root, file, sourceFile, lineOf),
    functions: collectFunctions(file, sourceFile, lineOf),
    normalizedLines: normalizeLines(sourceFile),
    identifierRefs: collectIdentifierRefs(sourceFile),
  };
}

/**
 * 파일 안의 식별자 참조 횟수. 아래는 "참조"가 아니므로 제외한다:
 *   - `obj.name` 의 name (property 접근)     - `{ name: v }` 의 키
 *   - import/export 절의 이름                - JSX 속성 이름
 *   - 타입 멤버 시그니처의 이름
 */
function collectIdentifierRefs(sf: ts.SourceFile): Map<string, number> {
  const counts = new Map<string, number>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const skip =
        (p && ts.isPropertyAccessExpression(p) && p.name === n) ||
        (p && ts.isPropertyAssignment(p) && p.name === n) ||
        (p && ts.isPropertySignature(p) && p.name === n) ||
        (p && ts.isPropertyDeclaration(p) && p.name === n) ||
        (p && ts.isMethodDeclaration(p) && p.name === n) ||
        (p && ts.isMethodSignature(p) && p.name === n) ||
        (p && ts.isEnumMember(p) && p.name === n) ||
        (p && ts.isJsxAttribute(p) && p.name === n) ||
        (p && ts.isImportSpecifier(p)) ||
        (p && ts.isExportSpecifier(p)) ||
        (p && ts.isImportClause(p)) ||
        (p && ts.isNamespaceImport(p)) ||
        (p && ts.isQualifiedName(p) && p.right === n);
      if (!skip) counts.set(n.text, (counts.get(n.text) ?? 0) + 1);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return counts;
}

/* ── 모듈 해석 ────────────────────────────────────────────────────────────── */

/**
 * specifier → 리포 루트 기준 파일 경로. 해석 불가(외부 패키지)면 null.
 * 확장자 없는 상대 경로는 .ts/.tsx/index.ts 순으로 탐색한다 (Bundler moduleResolution).
 */
export function resolveSpecifier(root: string, fromFile: string, spec: string): string | null {
  if (WORKSPACE_ALIASES[spec]) return WORKSPACE_ALIASES[spec];
  if (!spec.startsWith('.')) return null; // 외부 패키지 (react, typescript, …)

  const base = joinPosix(dirnamePosix(fromFile), spec);
  const candidates = [
    base,
    ...RESOLVABLE_EXTENSIONS.map((e) => `${base}${e}`),
    ...RESOLVABLE_EXTENSIONS.map((e) => `${base}/index${e}`),
  ];
  for (const cand of candidates) {
    if (cand.endsWith('/')) continue;
    if (isFile(root, cand)) return cand;
  }
  // .js 확장자로 쓴 ESM 스타일 import (Foo.js → Foo.ts)
  if (/\.jsx?$/.test(base)) {
    const stem = base.replace(/\.jsx?$/, '');
    for (const e of ['.ts', '.tsx']) {
      if (isFile(root, `${stem}${e}`)) return `${stem}${e}`;
    }
  }
  return null;
}

function isFile(root: string, rel: string): boolean {
  try {
    return fs.statSync(path.join(root, ...rel.split('/'))).isFile();
  } catch {
    return false;
  }
}

/* ── import 추출 ──────────────────────────────────────────────────────────── */

function collectImports(
  root: string,
  file: string,
  sf: ts.SourceFile,
  lineOf: (pos: number) => number,
): ImportEdge[] {
  const edges: ImportEdge[] = [];

  const push = (
    spec: string,
    pos: number,
    kind: ImportKind,
    names: string[],
    namespace: boolean,
    typeOnly: boolean,
  ): void => {
    edges.push({
      from: file,
      specifier: spec,
      to: resolveSpecifier(root, file, spec),
      line: lineOf(pos),
      kind,
      names,
      namespace,
      typeOnly,
    });
  };

  const visit = (node: ts.Node): void => {
    // import … from '…' / import '…'
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (!clause) {
        push(spec, node.getStart(sf), 'side-effect', [], false, false);
      } else {
        const names: string[] = [];
        let namespace = false;
        if (clause.name) names.push('default');
        const b = clause.namedBindings;
        if (b && ts.isNamespaceImport(b)) {
          namespace = true;
          names.push('*');
        } else if (b && ts.isNamedImports(b)) {
          for (const el of b.elements) {
            // import { A as B } → 원본 심볼은 A (propertyName)
            names.push((el.propertyName ?? el.name).text);
          }
        }
        push(spec, node.getStart(sf), 'import', names, namespace, clause.isTypeOnly);
      }
    }

    // export { a } from '…' / export * from '…'  (배럴 재export)
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text;
      const clause = node.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        const names = clause.elements.map((el) => (el.propertyName ?? el.name).text);
        push(spec, node.getStart(sf), 're-export', names, false, node.isTypeOnly);
      } else {
        push(spec, node.getStart(sf), 'export-star', ['*'], false, node.isTypeOnly);
      }
    }

    // 동적 import('…')  — React.lazy 라우트 등
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]!)
    ) {
      push(
        (node.arguments[0] as ts.StringLiteral).text,
        node.getStart(sf),
        'dynamic',
        ['*'],
        true,
        false,
      );
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return edges;
}

/* ── export 추출 ──────────────────────────────────────────────────────────── */

function hasExportModifier(node: ts.Node): boolean {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return (mods ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function hasDefaultModifier(node: ts.Node): boolean {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return (mods ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

function collectExports(
  root: string,
  file: string,
  sf: ts.SourceFile,
  lineOf: (pos: number) => number,
): ExportSymbol[] {
  const out: ExportSymbol[] = [];
  const add = (
    name: string,
    pos: number,
    reexportFrom: string | null = null,
    sourceName: string | null = null,
  ): void => {
    out.push({ file, name, line: lineOf(pos), reexportFrom, sourceName });
  };

  for (const st of sf.statements) {
    // export const/let/var
    if (ts.isVariableStatement(st) && hasExportModifier(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) add(d.name.text, d.getStart(sf));
        else collectBindingNames(d.name, (n, p) => add(n, p));
      }
      continue;
    }
    // export function / class / interface / type / enum
    if (
      (ts.isFunctionDeclaration(st) ||
        ts.isClassDeclaration(st) ||
        ts.isInterfaceDeclaration(st) ||
        ts.isTypeAliasDeclaration(st) ||
        ts.isEnumDeclaration(st)) &&
      hasExportModifier(st)
    ) {
      const name = hasDefaultModifier(st) ? 'default' : st.name?.text;
      if (name) add(name, st.getStart(sf));
      continue;
    }
    // export default <expr>
    if (ts.isExportAssignment(st) && !st.isExportEquals) {
      add('default', st.getStart(sf));
      continue;
    }
    // export { a, b as c }  /  export { a } from '…'  /  export * from '…'
    if (ts.isExportDeclaration(st)) {
      const from =
        st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)
          ? resolveSpecifier(root, file, st.moduleSpecifier.text)
          : null;
      const clause = st.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        for (const el of clause.elements) {
          // 외부에 노출되는 이름은 el.name (as 이후), 원본 모듈에서의 이름은 el.propertyName
          add(
            el.name.text,
            el.getStart(sf),
            st.moduleSpecifier ? from : null,
            st.moduleSpecifier ? (el.propertyName ?? el.name).text : null,
          );
        }
      } else if (st.moduleSpecifier) {
        add('*', st.getStart(sf), from, '*');
      }
    }
  }
  return out;
}

function collectBindingNames(name: ts.BindingName, add: (n: string, pos: number) => void): void {
  if (ts.isIdentifier(name)) {
    add(name.text, name.pos);
    return;
  }
  for (const el of name.elements) {
    if (ts.isBindingElement(el)) collectBindingNames(el.name, add);
  }
}

/* ── 축 4: 순환 복잡도 ────────────────────────────────────────────────────── */

const FUNCTION_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

/**
 * 함수 단위 cyclomatic complexity = 1 + 분기 수.
 * 분기: if / for / for-in / for-of / while / do / case / catch / ?: / && / || / ??
 * **중첩 함수의 분기는 그 함수의 것으로 따로 센다** (부모에 합산하지 않는다) —
 * React 컴포넌트의 인라인 핸들러가 부모 복잡도를 부풀리는 것을 막는다.
 */
function collectFunctions(
  file: string,
  sf: ts.SourceFile,
  lineOf: (pos: number) => number,
): FunctionMetric[] {
  const out: FunctionMetric[] = [];

  const isBranch = (n: ts.Node): boolean => {
    switch (n.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        return true;
      case ts.SyntaxKind.BinaryExpression: {
        const op = (n as ts.BinaryExpression).operatorToken.kind;
        return (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        );
      }
      default:
        return false;
    }
  };

  /** fn 본문의 분기 수 — 중첩 함수 본문은 건너뛴다 */
  const branchesOf = (fn: ts.Node): number => {
    let count = 0;
    const walk = (n: ts.Node): void => {
      if (n !== fn && FUNCTION_KINDS.has(n.kind)) return; // 중첩 함수는 별도 측정
      if (n !== fn && isBranch(n)) count += 1;
      ts.forEachChild(n, walk);
    };
    ts.forEachChild(fn, walk);
    return count;
  };

  const nameOf = (fn: ts.Node): string => {
    const f = fn as ts.FunctionLikeDeclaration;
    if (f.name && ts.isIdentifier(f.name)) return f.name.text;
    // const Foo = () => {} / const foo = function () {}
    const p = fn.parent;
    if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (p && ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (fn.kind === ts.SyntaxKind.Constructor) return 'constructor';
    return '<anonymous>';
  };

  const visit = (n: ts.Node): void => {
    if (FUNCTION_KINDS.has(n.kind)) {
      out.push({
        file,
        name: nameOf(n),
        line: lineOf(n.getStart(sf)),
        complexity: 1 + branchesOf(n),
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/* ── 축 3: 정규화 라인 (중복 탐지 입력) ───────────────────────────────────── */

/**
 * 라인별 정규화 토큰열을 만든다.
 *  - 주석: AST 토큰이 아니므로 자동 제거된다
 *  - 식별자: `$` 로 익명화 (변수명만 다른 복붙을 잡기 위함)
 *  - 문자열/숫자/JSX 텍스트 리터럴: `@` 로 익명화
 *  - 키워드/구두점: 원문 유지 (구조가 같아야 중복이다)
 */
function normalizeLines(sf: ts.SourceFile): { line: number; text: string }[] {
  const byLine = new Map<number, string[]>();

  const emit = (line: number, sym: string): void => {
    const arr = byLine.get(line);
    if (arr) arr.push(sym);
    else byLine.set(line, [sym]);
  };

  const visit = (n: ts.Node): void => {
    let isLeaf = true;
    ts.forEachChild(n, () => {
      isLeaf = false;
    });
    if (isLeaf) {
      const start = n.getStart(sf, /* includeJsDocComment */ false);
      const line = sf.getLineAndCharacterOfPosition(start).line + 1;
      const sym = symbolOf(n);
      if (sym !== null) emit(line, sym);
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  return [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([line, syms]) => ({ line, text: syms.join(' ') }))
    .filter((l) => l.text.length > 0);
}

function symbolOf(n: ts.Node): string | null {
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) return '$';
  if (
    ts.isStringLiteral(n) ||
    ts.isNumericLiteral(n) ||
    ts.isBigIntLiteral(n) ||
    ts.isRegularExpressionLiteral(n) ||
    ts.isNoSubstitutionTemplateLiteral(n) ||
    ts.isTemplateHead(n) ||
    ts.isTemplateMiddle(n) ||
    ts.isTemplateTail(n)
  ) {
    return '@';
  }
  if (ts.isJsxText(n)) {
    return n.text.trim().length === 0 ? null : '@';
  }
  if (n.kind === ts.SyntaxKind.EndOfFileToken) return null;
  const text = ts.tokenToString(n.kind as ts.TokenSyntaxKind);
  return text ?? `k${n.kind}`;
}
