/**
 * @tds/reuse-guard — 모듈 추출 스캐너 진입점 (A75 Component Reuse AI)
 *
 * page-module-pipeline **② 페이지 조사 · 공통 모듈 후보 추출** 단계의 자동화 도구
 * (docs/tds/guidelines/page-module-pipeline.md).
 *
 * 실행:
 *   pnpm --filter @tds/reuse-guard run scan
 *   pnpm --filter @tds/reuse-guard run scan --min 3
 *
 * 동작:
 *   1. apps/<app>/src 아래 .tsx 전체를 간이 JSX 토크나이저(src/lib/jsx.ts — 외부 파서 의존성 0)로 파싱
 *   2. JSX 엘리먼트 시그니처 정규화(태그 구조 + 주요 속성 키) 후 파일 간 반복 출현 집계
 *      — 동일 시그니처끼리 묶고, 유사 구조(태그 골격 동일 + 속성 키 자카드 >= 60%)는 병합
 *      (외부 패키지 import 컴포넌트는 후보 제외 — 앱 로컬·@tds/* 는 유지)
 *   3. 출현 >= 2회(--min 조정 가능)면 모듈 후보 판정: 구조 기반 후보명 제안, 위치(파일:라인),
 *      제안 atomic level(리프 atom / 깊이 2 molecule / 깊이 3+ organism),
 *      기존 contracts/ 와의 유사도(check 모드와 동일한 similarity 로직 재사용) 병기
 *   4. 권고: 계약 유사도 >= 85% REUSE · 60~85% EXTEND · < 60% CREATE
 *
 * 산출물: reports/reuse/module-candidates-<YYYY-MM-DD>.json + .md
 * 종료 코드: 0 (스캔은 게이트가 아니라 ③ G0 접수의 입력값 생성) · 2 실행 오류
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadContractLites, type ContractLite } from './lib/contracts.ts';
import { findRepoRoot, walkFiles } from './lib/fsutil.ts';
import { parseJsx, type JsxNode } from './lib/jsx.ts';
import type {
  ModuleCandidate,
  ModuleScanReport,
  ScanContractMatch,
  ScanOccurrence,
  ScanRecommendation,
  SuggestedLevel,
} from './scan-report.ts';
import { writeScanReport } from './scan-report.ts';
import {
  jaccard,
  nameSimilarity,
  THRESHOLD_CREATE_BLOCKED,
  THRESHOLD_EXTEND_RECOMMENDED,
  weightedScore,
} from './similarity.ts';

/** 모듈 후보 판정 최소 출현 수 (동일/유사 구조 2회 이상) */
const DEFAULT_MIN_OCCURRENCES = 2;
/** 유사 구조 병합 임계값 — 태그 골격이 같을 때 위치-속성 키 집합 자카드가 이 값 이상이면 병합 */
const THRESHOLD_SIMILAR_STRUCTURE = 0.6;
/** 시그니처에서 제외하는 속성 키 (React 내부용/스프레드) */
const IGNORED_ATTR_KEYS = new Set(['key', 'ref', '...']);
/** 스캔에서 제외하는 파일 (페이지 구현이 아닌 것) */
const EXCLUDED_FILE_RE = /\.(test|spec|stories)\.tsx$/;

interface CliArgs {
  min: number;
}

function parseArgs(argv: string[]): CliArgs {
  let min = DEFAULT_MIN_OCCURRENCES;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined || a === '--') continue;
    if (a === '--min') {
      const v = Number.parseInt(argv[++i] ?? '', 10);
      if (Number.isFinite(v) && v >= 2) min = v;
    } else if (a.startsWith('--min=')) {
      const v = Number.parseInt(a.slice('--min='.length), 10);
      if (Number.isFinite(v) && v >= 2) min = v;
    }
  }
  return { min };
}

// ---------------------------------------------------------------------------
// 스캔 대상 수집
// ---------------------------------------------------------------------------

/** apps/<app>/src 아래 .tsx 페이지 파일의 리포 상대경로(POSIX) 목록 */
function findPageFiles(root: string): { files: string[]; scanRoots: string[] } {
  const appsDir = path.join(root, 'apps');
  const files: string[] = [];
  const scanRoots: string[] = [];
  if (!fs.existsSync(appsDir)) return { files, scanRoots };
  for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const srcRel = `apps/${entry.name}/src`;
    const srcAbs = path.join(root, 'apps', entry.name, 'src');
    if (!fs.existsSync(srcAbs)) continue;
    scanRoots.push(srcRel);
    for (const rel of walkFiles(srcAbs)) {
      if (rel.endsWith('.tsx') && !EXCLUDED_FILE_RE.test(rel)) {
        files.push(`${srcRel}/${rel}`);
      }
    }
  }
  files.sort();
  scanRoots.sort();
  return { files, scanRoots };
}

// ---------------------------------------------------------------------------
// 시그니처 정규화 · 집계
// ---------------------------------------------------------------------------

/** 루트 엘리먼트의 정규화 속성 키 (key/ref/스프레드 제외, 중복 제거, 정렬) */
function normalizedAttrs(node: JsxNode): string[] {
  return [...new Set(node.attrKeys.filter((a) => !IGNORED_ATTR_KEYS.has(a)))].sort();
}

/** 정규화 시그니처: 태그 구조 + 주요 속성 키. 예) div[className](h3[]+span[className,title]) */
function signatureOf(node: JsxNode): string {
  const head = `${node.tag}[${normalizedAttrs(node).join(',')}]`;
  if (node.children.length === 0) return head;
  return `${head}(${node.children.map(signatureOf).join('+')})`;
}

/** 병합용 태그 골격: 속성 키를 제외한 태그 구조만. 예) section(h3+strong) */
function shapeOf(node: JsxNode): string {
  if (node.children.length === 0) return node.tag;
  return `${node.tag}(${node.children.map(shapeOf).join('+')})`;
}

/** 병합용 위치-속성 키 집합 — preorder 노드 인덱스를 접두해 노드별 속성 키를 평탄화 */
function attrKeySetOf(node: JsxNode): Set<string> {
  const out = new Set<string>();
  let index = 0;
  const visit = (n: JsxNode): void => {
    const i = index++;
    for (const a of normalizedAttrs(n)) out.add(`${i}:${a}`);
    for (const c of n.children) visit(c);
  };
  visit(node);
  return out;
}

function nodeCountOf(node: JsxNode): number {
  return 1 + node.children.reduce((sum, c) => sum + nodeCountOf(c), 0);
}

function depthOf(node: JsxNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(depthOf));
}

/**
 * 외부 패키지에서 import 한 컴포넌트 로컬명 집합 — 후보 루트에서 제외한다.
 * 상대 경로(앱 로컬 — 모듈 승격 후보)와 @tds/*(기존 계약 REUSE 판정 대상)는 제외하지 않는다.
 * 예) react-router-dom 의 <Route> 반복은 모듈 후보가 아니다.
 */
function externalComponentNames(source: string): Set<string> {
  const out = new Set<string>();
  const importRe = /import\s+([^'";]+?)\s+from\s+['"]([^'"]+)['"]/g;
  for (const m of source.matchAll(importRe)) {
    const clause = m[1] ?? '';
    const from = m[2] ?? '';
    const isExternal = !from.startsWith('.') && !from.startsWith('@tds/');
    if (!isExternal) continue;
    // default / 네임스페이스 부분 (중괄호 밖)
    const braceStart = clause.indexOf('{');
    const outside = braceStart === -1 ? clause : clause.slice(0, braceStart);
    for (const raw of outside.split(',')) {
      const t = raw.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const ns = /^\*\s+as\s+([\w$]+)$/.exec(t);
      if (ns?.[1]) out.add(ns[1]);
      else if (/^[\w$]+$/.test(t)) out.add(t);
    }
    // 명명 import (중괄호 안): { A, B as C, type D }
    const braceEnd = clause.indexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      for (const raw of clause.slice(braceStart + 1, braceEnd).split(',')) {
        const t = raw.trim().replace(/^type\s+/, '');
        if (!t) continue;
        const asMatch = /\s+as\s+([\w$]+)$/.exec(t);
        const local = asMatch?.[1] ?? t;
        if (/^[\w$]+$/.test(local)) out.add(local);
      }
    }
  }
  return out;
}

/** 후보 집계 대상 여부 — Fragment/외부 패키지 컴포넌트 제외, 구조/속성/커스텀 컴포넌트 중 하나는 있어야 한다 */
function isEligible(node: JsxNode, externals: Set<string>): boolean {
  if (node.tag === 'Fragment') return false;
  const rootIdent = node.tag.split('.')[0] ?? node.tag;
  if (externals.has(rootIdent)) return false;
  if (node.children.length > 0) return true;
  if (normalizedAttrs(node).length > 0) return true;
  return /^[A-Z]/.test(node.tag); // 속성 없는 커스텀 컴포넌트 리프 (<Spinner /> 등)
}

function collectElements(node: JsxNode, out: JsxNode[]): void {
  out.push(node);
  for (const c of node.children) collectElements(c, out);
}

interface RawOccurrence extends ScanOccurrence {
  start: number;
  end: number;
}

/** 시그니처 단위 집계 그룹 (유사 구조 병합 후에는 대표 시그니처 아래로 합쳐진다) */
interface SigGroup {
  signature: string;
  /** 병합 판정용 태그 골격 (속성 제외) */
  shape: string;
  /** 병합 판정용 위치-속성 키 집합 */
  attrKeySet: Set<string>;
  rootTag: string;
  rootAttrs: string[];
  childTags: string[];
  classTokens: string[];
  nodeCount: number;
  depth: number;
  occurrences: RawOccurrence[];
  mergedSignatures: string[];
}

/** 파일별 파싱 결과를 시그니처 그룹으로 집계 */
function aggregate(root: string, files: string[]): { groups: SigGroup[]; elementsSeen: number } {
  const bySignature = new Map<string, SigGroup>();
  let elementsSeen = 0;
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const externals = externalComponentNames(source);
    const { roots, elementCount } = parseJsx(source);
    elementsSeen += elementCount;
    const all: JsxNode[] = [];
    for (const r of roots) collectElements(r, all);
    for (const el of all) {
      if (!isEligible(el, externals)) continue;
      const sig = signatureOf(el);
      let group = bySignature.get(sig);
      if (!group) {
        group = {
          signature: sig,
          shape: shapeOf(el),
          attrKeySet: attrKeySetOf(el),
          rootTag: el.tag,
          rootAttrs: normalizedAttrs(el),
          childTags: el.children.map((c) => c.tag),
          classTokens: [],
          nodeCount: nodeCountOf(el),
          depth: depthOf(el),
          occurrences: [],
          mergedSignatures: [],
        };
        bySignature.set(sig, group);
      }
      group.classTokens.push(...el.classTokens);
      group.occurrences.push({ file, line: el.line, start: el.start, end: el.end });
    }
  }
  return { groups: [...bySignature.values()], elementsSeen };
}

/**
 * 유사 구조 병합 — 태그 골격(shape)이 같고 위치-속성 키 집합 자카드(기존 similarity 로직 재사용)가
 * THRESHOLD_SIMILAR_STRUCTURE 이상이면 대표 그룹에 흡수한다.
 * (출현 1회짜리 유사 구조 두 개가 합쳐져 후보가 될 수 있으므로 최소 출현 필터보다 먼저 수행)
 */
function mergeSimilarGroups(groups: SigGroup[]): SigGroup[] {
  const sorted = [...groups].sort(
    (a, b) => b.occurrences.length - a.occurrences.length || a.signature.localeCompare(b.signature),
  );
  const byShape = new Map<string, SigGroup[]>();
  const clusters: SigGroup[] = [];
  for (const g of sorted) {
    const peers = byShape.get(g.shape) ?? [];
    let host: SigGroup | null = null;
    for (const c of peers) {
      if (jaccard(c.attrKeySet, g.attrKeySet) >= THRESHOLD_SIMILAR_STRUCTURE) {
        host = c;
        break;
      }
    }
    if (host) {
      host.occurrences.push(...g.occurrences);
      host.classTokens.push(...g.classTokens);
      host.mergedSignatures.push(g.signature);
    } else {
      peers.push(g);
      byShape.set(g.shape, peers);
      clusters.push(g);
    }
  }
  return clusters;
}

/**
 * 포함 억제 — 더 큰 후보의 출현 범위 안에만 나타나는 하위 구조는 별도 후보로 보고하지 않는다
 * (부모가 모듈로 승격되면 자식은 그 내부 구현이므로 이중 보고 방지).
 */
function suppressContained(groups: SigGroup[]): SigGroup[] {
  const sorted = [...groups].sort(
    (a, b) =>
      b.nodeCount - a.nodeCount ||
      b.occurrences.length - a.occurrences.length ||
      a.signature.localeCompare(b.signature),
  );
  const kept: SigGroup[] = [];
  for (const g of sorted) {
    const containedEverywhere = g.occurrences.every((o) =>
      kept.some((k) =>
        k.occurrences.some(
          (ko) =>
            ko.file === o.file &&
            ko.start <= o.start &&
            o.end <= ko.end &&
            (ko.start < o.start || o.end < ko.end),
        ),
      ),
    );
    if (!containedEverywhere) kept.push(g);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// 후보명 · 레벨 · 계약 유사도
// ---------------------------------------------------------------------------

function pascal(s: string): string {
  return s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w[0] ?? '').toUpperCase() + w.slice(1))
    .join('');
}

/**
 * 구조 기반 후보명 제안 (확정 명칭 아님):
 *   1) 루트가 커스텀 컴포넌트 → 그 이름 (자식 포함이면 +Group)
 *   2) 정적 className 최빈 토큰 → PascalCase (페이지 마크업의 의도가 가장 잘 드러나는 신호)
 *   3) 폴백: 루트 태그 + 최빈 자식 태그 + 레벨 접미사
 */
function proposeName(g: SigGroup): string {
  if (/^[A-Z]/.test(g.rootTag)) {
    const base = pascal(g.rootTag);
    return g.depth === 1 ? base : `${base}Group`;
  }
  const freq = new Map<string, number>();
  for (const t of g.classTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (top) return pascal(top[0]);
  if (g.depth === 1) return `${pascal(g.rootTag)}Item`;
  if (g.depth === 2) {
    const child = g.childTags[0] ? pascal(g.childTags[0]) : '';
    return `${pascal(g.rootTag)}${child}Group`;
  }
  return `${pascal(g.rootTag)}Section`;
}

/** 리프(깊이 1) atom · 깊이 2 molecule · 깊이 3+ organism — Storybook 카테고리 기준과 정렬 */
function suggestLevel(depth: number): SuggestedLevel {
  if (depth <= 1) return 'atom';
  if (depth === 2) return 'molecule';
  return 'organism';
}

/**
 * 기존 계약과의 유사도 — check 모드와 동일한 similarity 로직 재사용.
 * 스캔 후보의 속성 키는 계약 props 만큼 정제되어 있지 않으므로
 * 이름 단독 유사도를 하한으로 사용한다 (동명 후보를 자카드가 끌어내리는 것 방지).
 */
function bestContractMatch(
  candidateName: string,
  rootAttrs: string[],
  contracts: ContractLite[],
): ScanContractMatch | null {
  let best: ScanContractMatch | null = null;
  const attrSet = new Set(rootAttrs.map((a) => a.toLowerCase()));
  for (const c of contracts) {
    const ns = nameSimilarity(candidateName, c.name);
    const jc =
      attrSet.size === 0
        ? null
        : jaccard(attrSet, new Set(c.propNames.map((p) => p.toLowerCase())));
    const score = Math.max(ns, weightedScore(ns, jc));
    if (!best || score > best.score) {
      best = {
        name: c.name,
        version: c.version,
        level: c.level,
        contractPath: c.relPath,
        nameSimilarity: ns,
        propsJaccard: jc,
        score,
      };
    }
  }
  return best;
}

/** check 모드와 동일한 임계값을 page-module-pipeline 용어로 매핑 */
function recommendationOf(bestScore: number | null): ScanRecommendation {
  if (bestScore === null) return 'CREATE';
  if (bestScore >= THRESHOLD_CREATE_BLOCKED) return 'REUSE';
  if (bestScore >= THRESHOLD_EXTEND_RECOMMENDED) return 'EXTEND';
  return 'CREATE';
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

function todayStamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const root = findRepoRoot(process.cwd());
  const contracts = loadContractLites(root);
  const { files, scanRoots } = findPageFiles(root);

  const { groups, elementsSeen } = aggregate(root, files);
  const merged = mergeSimilarGroups(groups);
  const repeated = merged.filter((g) => g.occurrences.length >= args.min);
  const surviving = suppressContained(repeated);

  // 후보명 충돌 시 접미 번호 부여 (결정적 정렬 후 순서대로)
  const ordered = [...surviving].sort(
    (a, b) =>
      b.occurrences.length - a.occurrences.length ||
      b.nodeCount - a.nodeCount ||
      a.signature.localeCompare(b.signature),
  );
  const usedNames = new Map<string, number>();
  const candidates: ModuleCandidate[] = ordered.map((g) => {
    let name = proposeName(g);
    const seen = usedNames.get(name) ?? 0;
    usedNames.set(name, seen + 1);
    if (seen > 0) name = `${name}${seen + 1}`;

    const best = bestContractMatch(name, g.rootAttrs, contracts);
    const occurrences: ScanOccurrence[] = g.occurrences
      .map((o) => ({ file: o.file, line: o.line }))
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    return {
      name,
      signature: g.signature,
      rootTag: g.rootTag,
      rootAttrs: g.rootAttrs,
      suggestedLevel: suggestLevel(g.depth),
      nodeCount: g.nodeCount,
      depth: g.depth,
      occurrenceCount: occurrences.length,
      fileCount: new Set(occurrences.map((o) => o.file)).size,
      occurrences,
      mergedSignatures: g.mergedSignatures,
      bestContract: best,
      recommendation: recommendationOf(best ? best.score : null),
    };
  });

  const report: ModuleScanReport = {
    generatedAt: new Date().toISOString(),
    scanDate: todayStamp(),
    scanRoots,
    scannedFiles: files.length,
    elementsSeen,
    minOccurrences: args.min,
    similarStructureThreshold: THRESHOLD_SIMILAR_STRUCTURE,
    thresholds: {
      reuse: THRESHOLD_CREATE_BLOCKED,
      extend: THRESHOLD_EXTEND_RECOMMENDED,
    },
    contractsCompared: contracts.length,
    candidates,
  };
  writeScanReport(root, report);

  console.log(
    `[reuse-guard] 스캔 범위: ${scanRoots.length > 0 ? scanRoots.join(', ') : '(apps/*/src 없음)'} — .tsx ${files.length}개, 엘리먼트 ${elementsSeen}개`,
  );
  if (candidates.length === 0) {
    console.log(`[reuse-guard] 모듈 후보 없음 (최소 출현 ${args.min}회 기준)`);
  } else {
    console.log(`[reuse-guard] 모듈 후보 ${candidates.length}건:`);
    for (const c of candidates) {
      console.log(
        `[reuse-guard]   ${c.name} — ${c.occurrenceCount}회/${c.fileCount}개 파일 · ${c.suggestedLevel} · 권고 ${c.recommendation}`,
      );
    }
  }
  console.log(
    `[reuse-guard] 리포트: reports/reuse/module-candidates-${report.scanDate}.json / .md`,
  );
  process.exitCode = 0; // 스캔은 게이트가 아니다 — ③ G0 접수의 입력값 생성
}

try {
  main();
} catch (e) {
  console.error(`[reuse-guard] 실행 오류: ${(e as Error).message}`);
  process.exitCode = 2;
}
