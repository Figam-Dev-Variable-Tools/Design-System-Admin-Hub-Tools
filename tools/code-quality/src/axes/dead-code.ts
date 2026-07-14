/**
 * 축 5 — 죽은 코드 (major, 임계값 0건)
 *
 * export 됐으나 **어디서도 import 되지 않는 심볼**.
 * **배럴 재export 는 사용으로 세지 않는다** — `shared/ui/index.ts` 가 다시 내보냈다는 사실은
 * 누군가 그것을 쓴다는 뜻이 아니다. 배럴을 통해 실제로 import 될 때만 살아 있다.
 *
 * 살아 있다고 보는 진입점(live root) — 정적 import 그래프 밖에서 소비되는 것들:
 *   - 앱 엔트리       apps/<app>/src/main.tsx      (번들러가 부른다)
 *   - 패키지 공개 API packages/<pkg>/src/index.ts  (라이브러리의 계약. 소비자는 리포 밖에도 있다)
 *   - Story/테스트    .stories.tsx · .test.ts(x) · .play.ts (Storybook/vitest 가 glob 으로 부른다)
 */
import type { ExportSymbol, ImportEdge, ParsedFile } from '../lib/ast.ts';
import type { AxisResult, Violation } from '../report.ts';
import { DEAD_CODE } from '../thresholds.ts';

const LIVE_ROOT_RE = [
  /^apps\/[^/]+\/src\/main\.tsx$/,
  /^packages\/[^/]+\/src\/index\.ts$/,
  /\.stories\.tsx$/,
  /\.test\.tsx?$/,
  /\.play\.ts$/,
];

function isLiveRoot(file: string): boolean {
  return LIVE_ROOT_RE.some((re) => re.test(file));
}

export function checkDeadCode(files: ParsedFile[]): AxisResult {
  const byFile = new Map<string, ParsedFile>(files.map((f) => [f.file, f]));

  /** file → 정의된 export 이름 */
  const defined = new Map<string, Set<string>>();
  /** "file#name" → "srcFile#srcName" (배럴 별칭) */
  const alias = new Map<string, string>();
  /** file → export * from 대상들 */
  const starOf = new Map<string, string[]>();

  for (const pf of files) {
    const names = new Set<string>();
    for (const e of pf.exports) {
      if (e.name === '*') {
        if (e.reexportFrom) starOf.set(pf.file, [...(starOf.get(pf.file) ?? []), e.reexportFrom]);
        continue;
      }
      names.add(e.name);
      if (e.reexportFrom) {
        alias.set(`${pf.file}#${e.name}`, `${e.reexportFrom}#${e.sourceName ?? e.name}`);
      }
    }
    defined.set(pf.file, names);
  }

  /* ── 사용 집합 seed ──────────────────────────────────────────────────── */
  const used = new Set<string>();
  const queue: string[] = [];
  const mark = (key: string): void => {
    if (used.has(key)) return;
    used.add(key);
    queue.push(key);
  };

  const isUsage = (e: ImportEdge): boolean => e.kind === 'import' || e.kind === 'dynamic';

  for (const pf of files) {
    for (const edge of pf.imports) {
      if (edge.to === null || !isUsage(edge)) continue; // 재export 는 사용이 아니다
      if (edge.namespace || edge.names.includes('*')) mark(`${edge.to}#*`);
      else for (const n of edge.names) mark(`${edge.to}#${n}`);
    }
    if (isLiveRoot(pf.file)) mark(`${pf.file}#*`);
  }

  /* ── 전파 (배럴 별칭 · export * 를 따라 정의부까지) ──────────────────── */
  while (queue.length > 0) {
    const key = queue.pop()!;
    const hash = key.lastIndexOf('#');
    const file = key.slice(0, hash);
    const name = key.slice(hash + 1);

    if (name === '*') {
      for (const n of defined.get(file) ?? []) mark(`${file}#${n}`);
      for (const src of starOf.get(file) ?? []) mark(`${src}#*`);
      continue;
    }
    const target = alias.get(key);
    if (target) mark(target);
    // export * 로 흘러온 이름일 수 있다 — 대상이 정의하지 않으면 mark 는 무해하다
    for (const src of starOf.get(file) ?? []) {
      if (byFile.has(src)) mark(`${src}#${name}`);
    }
  }

  /* ── 판정: 정의부인데 아무도 안 쓰는 export ─────────────────────────── */
  const violations: Violation[] = [];
  let exportCount = 0;

  for (const pf of files) {
    if (isLiveRoot(pf.file)) continue;
    for (const e of pf.exports as ExportSymbol[]) {
      if (e.name === '*' || e.reexportFrom !== null) continue; // 배럴 항목은 정의부가 아니다
      exportCount += 1;
      if (used.has(`${pf.file}#${e.name}`) || used.has(`${pf.file}#*`)) continue;

      // 선언 자체가 1회로 세어지므로, 2회 이상이면 파일 내부에서 실제로 쓰인다.
      const localRefs = Math.max(0, (pf.identifierRefs.get(e.name) ?? 0) - 1);
      const localOnly = localRefs > 0;

      violations.push({
        axis: DEAD_CODE.axis,
        id: DEAD_CODE.id,
        severity: DEAD_CODE.severity,
        file: pf.file,
        line: e.line,
        symbol: e.name,
        measured: localOnly
          ? `import 하는 곳 0건 · 파일 내부 참조 ${localRefs}회 (local-only export)`
          : `import 하는 곳 0건 · 파일 내부 참조 0회 (unreferenced)`,
        threshold: DEAD_CODE.threshold,
        message: localOnly
          ? `export '${e.name}' 를 import 하는 파일이 없다 — 파일 내부에서만 쓰인다 (배럴 재export 는 사용으로 세지 않는다).`
          : `export '${e.name}' 를 import 하는 파일도, 참조하는 코드도 없다.`,
        suggestion: localOnly
          ? `\`export\` 키워드를 제거해 파일 지역 심볼로 되돌린다 (공개 표면을 넓히지 않는다).`
          : '삭제한다. 외부 소비자가 있는 공개 API 라면 패키지 공개 배럴(packages/<pkg>/src/index.ts)로 올린다.',
      });
    }
  }

  return {
    spec: DEAD_CODE,
    scanned: `정의부 export ${exportCount}개`,
    violations,
  };
}
