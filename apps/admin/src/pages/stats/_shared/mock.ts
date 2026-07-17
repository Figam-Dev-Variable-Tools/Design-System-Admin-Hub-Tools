// 통계 mock 조회 골격
//
// [백엔드 0] 통계는 아직 픽스처다. 백엔드가 붙으면 각 화면 data-source.ts 의 build 안쪽만
// 교체한다 — 지연·실패·빈 상태의 재현 경로(아래)는 그대로 둔다.
//
// [재현 파라미터 — 기존 문법을 그대로 쓴다] 통계만의 새 문법을 만들지 않는다.
//   ?delay=<ms>              조회 지연 (기본 LATENCY_MS=400) — 스켈레톤 재현 (members·dashboard 관례)
//   ?fail=list               모든 통계 조회 실패          — 인라인 에러 배너 (shared/crud/dev.ts 문법)
//   ?fail=stats-visitors:list  방문자 통계만 실패          — 스코프 지정
//   ?empty=all | ?empty=stats-keywords   0행/0값        — 빈 상태 (members 의 ?empty= 관례)
// 6개 화면이 각자 스코프를 가지므로 한 화면만 실패시키는 재현이 가능하다.
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';

/** 화면별 실패/빈 상태 스코프 — data-source 가 이 값을 넘긴다 */
type StatsScope =
  | 'stats-visitors'
  | 'stats-members'
  | 'stats-revenue'
  | 'stats-orders'
  | 'stats-traffic'
  | 'stats-keywords';

function readDelayMs(): number {
  const raw = Number(new URLSearchParams(window.location.search).get('delay'));
  return Number.isFinite(raw) && raw > 0 ? raw : LATENCY_MS;
}

function isEmptyRequested(scope: StatsScope): boolean {
  const flags = new URLSearchParams(window.location.search).get('empty');
  if (flags === null) return false;
  const requested = flags.split(',').map((flag) => flag.trim());
  return requested.includes('all') || requested.includes(scope);
}

/**
 * 통계 한 벌을 불러온다 — 6개 화면이 공유하는 유일한 조회 골격.
 *
 * build/emptyValue 를 **함수로** 받는 이유: 빈 상태에서는 픽스처 생성 자체를 하지 않는다.
 *
 * @param scope   ?fail= · ?empty= 가 지목하는 이름
 * @param build   실제 데이터 — 백엔드가 붙으면 여기가 fetch 로 바뀐다
 * @param empty   0행/0값 — '아직 집계된 게 없다'를 재현한다
 */
export async function loadStats<T>(
  scope: StatsScope,
  signal: AbortSignal,
  build: () => T,
  empty: () => T,
): Promise<T> {
  await wait(readDelayMs(), signal);
  failIfRequested(scope, 'list');
  return isEmptyRequested(scope) ? empty() : build();
}

/* ── 결정론적 난수 ───────────────────────────────────────────────────────────
 *
 * 픽스처가 Math.random 을 쓰면 새로고침마다 숫자가 바뀌어 스크린샷·VRT·눈으로 하는 회귀가
 * 전부 무의미해진다. 날짜 문자열을 seed 로 삼아 **같은 날은 언제나 같은 값**을 낸다.
 * (mulberry32 — 짧고 분포가 고르다. 통계 픽스처에 암호학적 품질은 필요 없다.)
 */
function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** seed 로 0..1 난수를 내는 함수를 만든다 */
export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 날짜별 값 — 주말에 낮아지는 커머스 트래픽의 실제 모양을 흉내낸다.
 * 픽스처가 평평하면 '추이'가 있는지 없는지 화면에서 판단할 수 없다.
 */
export function seededSeries(
  scope: string,
  days: readonly string[],
  base: number,
  variance: number,
): readonly number[] {
  return days.map((day) => {
    const random = seededRandom(`${scope}:${day}`);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    // 0=일 6=토 — 주말은 평일의 60~70% 수준
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.65 : 1;
    return Math.max(0, Math.round((base + (random() - 0.5) * variance) * weekendFactor));
  });
}
