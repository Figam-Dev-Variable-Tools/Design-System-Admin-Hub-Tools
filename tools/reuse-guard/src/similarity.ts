/**
 * 유사도 계산 — 이름(레벤슈타인 정규화) + props 집합(자카드).
 * 판정 가중치: 이름 40% + props 60% (설계서 §3 A75, §13 재사용 충돌 규칙)
 */

/** 레벤슈타인 편집 거리 (동적 계획법, O(mn)) */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Int32Array(n + 1);
  let curr = new Int32Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const del = (prev[j] ?? 0) + 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n] ?? 0;
}

/** 이름 유사도: 1 - dist/maxLen (대소문자 무시), 0..1 */
export function nameSimilarity(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const max = Math.max(x.length, y.length);
  if (max === 0) return 1;
  return 1 - levenshtein(x, y) / max;
}

/** 자카드 유사도: |A∩B| / |A∪B|, 0..1 (양쪽 모두 공집합이면 1) */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const v of a) {
    if (b.has(v)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export const WEIGHT_NAME = 0.4;
export const WEIGHT_PROPS = 0.6;
export const THRESHOLD_CREATE_BLOCKED = 0.85;
export const THRESHOLD_EXTEND_RECOMMENDED = 0.6;

export type Verdict = 'CREATE_BLOCKED' | 'EXTEND_RECOMMENDED' | 'CREATE_OK';

/**
 * 가중 종합 점수.
 * props 미제공 시(name-only 모드) 이름 유사도 단독으로 판정한다 —
 * 자카드를 0으로 두면 동명 컴포넌트도 차단하지 못하므로 가드 목적상 이름 단독이 안전하다.
 */
export function weightedScore(nameSim: number, propsJaccard: number | null): number {
  if (propsJaccard === null) return nameSim;
  return WEIGHT_NAME * nameSim + WEIGHT_PROPS * propsJaccard;
}

export function verdictOf(bestScore: number | null): Verdict {
  if (bestScore === null) return 'CREATE_OK'; // 비교 대상 계약이 없음
  if (bestScore >= THRESHOLD_CREATE_BLOCKED) return 'CREATE_BLOCKED';
  if (bestScore >= THRESHOLD_EXTEND_RECOMMENDED) return 'EXTEND_RECOMMENDED';
  return 'CREATE_OK';
}
