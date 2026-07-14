/**
 * @tds/reuse-guard — 중복 컴포넌트 차단 진입점 (A75 Component Reuse AI)
 *
 * 실행:
 *   pnpm --filter @tds/reuse-guard run check --name StatusFilter --props options,value,multiple,onChange
 *   pnpm reuse:check -- --name StatusFilter --props options,value,multiple
 *
 * 판정 (설계서 §3 A75 · §13):
 *   종합 유사도 = 이름(레벤슈타인 정규화) 40% + props 집합 자카드 60%
 *   >= 85%      → CREATE_BLOCKED  (신규 생성 차단 — EXTEND 강제, exit 1)
 *   60% ~ 85%   → EXTEND_RECOMMENDED
 *   < 60%       → CREATE_OK
 *
 * 산출물: reports/reuse/<name>.json + <name>.md
 */
import { loadContractLites } from './lib/contracts.ts';
import { findRepoRoot } from './lib/fsutil.ts';
import type { CandidateScore, ReuseReport } from './report.ts';
import { writeReport } from './report.ts';
import type { Verdict } from './similarity.ts';
import {
  jaccard,
  nameSimilarity,
  THRESHOLD_CREATE_BLOCKED,
  THRESHOLD_EXTEND_RECOMMENDED,
  verdictOf,
  weightedScore,
  WEIGHT_NAME,
  WEIGHT_PROPS,
} from './similarity.ts';

const TOP_CANDIDATES = 5;

interface CliArgs {
  name: string | null;
  props: string[];
}

function parseArgs(argv: string[]): CliArgs {
  let name: string | null = null;
  const props: string[] = [];
  const pushProps = (raw: string | undefined): void => {
    if (!raw) return;
    for (const p of raw.split(',')) {
      const t = p.trim();
      if (t.length > 0 && !props.includes(t)) props.push(t);
    }
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined || a === '--') continue;
    if (a === '--name') {
      name = argv[++i] ?? null;
    } else if (a.startsWith('--name=')) {
      name = a.slice('--name='.length) || null;
    } else if (a === '--props') {
      pushProps(argv[++i]);
    } else if (a.startsWith('--props=')) {
      pushProps(a.slice('--props='.length));
    }
  }
  return { name, props };
}

function usage(): void {
  console.error(
    '[reuse-guard] 사용법: pnpm --filter @tds/reuse-guard run check --name <컴포넌트명> [--props a,b,c]',
  );
  console.error(
    '[reuse-guard] 예시:   pnpm --filter @tds/reuse-guard run check --name StatusFilter --props options,value,multiple,onChange',
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name) {
    usage();
    process.exitCode = 2;
    return;
  }

  const root = findRepoRoot(process.cwd());
  const contracts = loadContractLites(root);
  const nameOnly = args.props.length === 0;
  const targetProps = new Set(args.props.map((p) => p.toLowerCase()));

  const candidates: CandidateScore[] = contracts
    .map((c) => {
      const ns = nameSimilarity(args.name as string, c.name);
      const candidateProps = new Set(c.propNames.map((p) => p.toLowerCase()));
      const jc = nameOnly ? null : jaccard(targetProps, candidateProps);
      const shared = nameOnly ? [] : c.propNames.filter((p) => targetProps.has(p.toLowerCase()));
      return {
        name: c.name,
        version: c.version,
        level: c.level,
        status: c.status,
        contractPath: c.relPath,
        nameSimilarity: ns,
        propsJaccard: jc,
        score: weightedScore(ns, jc),
        sharedProps: shared,
        candidateProps: c.propNames,
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = candidates.slice(0, TOP_CANDIDATES);
  const best = candidates[0] ?? null;
  const verdict: Verdict = verdictOf(best ? best.score : null);

  const report: ReuseReport = {
    generatedAt: new Date().toISOString(),
    target: { name: args.name, props: args.props },
    mode: nameOnly ? 'name-only' : 'name+props',
    weights: { name: WEIGHT_NAME, props: WEIGHT_PROPS },
    thresholds: {
      createBlocked: THRESHOLD_CREATE_BLOCKED,
      extendRecommended: THRESHOLD_EXTEND_RECOMMENDED,
    },
    contractsCompared: contracts.length,
    bestMatch: best,
    verdict,
    candidates: top,
  };
  writeReport(root, report);

  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  console.log(
    `[reuse-guard] 대상: ${args.name}${nameOnly ? ' (props 미제공 — 이름 단독 모드)' : ` (props ${args.props.length}개)`}`,
  );
  if (best) {
    console.log(
      `[reuse-guard] 최고 유사도: ${best.name}@${best.version} ${pct(best.score)} → ${verdict}`,
    );
  } else {
    console.log('[reuse-guard] 비교할 기존 계약 없음 → CREATE_OK (부트스트랩 단계)');
  }
  console.log(`[reuse-guard] 리포트: reports/reuse/${args.name}.json / .md`);

  if (verdict === 'CREATE_BLOCKED') {
    console.error(
      `[reuse-guard] 유사도 >= ${pct(THRESHOLD_CREATE_BLOCKED)} — 신규 생성 차단, ${best?.name ?? '기존 컴포넌트'} EXTEND 강제 (exit 1)`,
    );
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

try {
  main();
} catch (e) {
  console.error(`[reuse-guard] 실행 오류: ${(e as Error).message}`);
  process.exitCode = 2;
}
