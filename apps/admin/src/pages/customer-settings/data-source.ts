// 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// **여기에 서버·엔드포인트·비즈니스 로직을 구현하지 않는다.** 지금은 fixtures.ts 의 더미를
// Promise 로 돌려줄 뿐이고, 실제 네트워크 호출은 한 줄도 없다 — 실행되는 서버가 없다.
// 백엔드가 준비되면 **이 파일의 함수 본문만** 교체하면 되고, 화면 코드는 바뀌지 않는다.
//
// [쓰기 계열] saveTierPolicy 는 저장하지 않는다 — resolve 만 하고, 화면이 성공 안내를 띄운다.
import { wait } from '../../shared/async';
import { DEFAULT_TIER_POLICY } from './fixtures';
import type { TierPolicy } from './types';

/** 네트워크 왕복 체감 — 화면의 로딩/저장 중 경로를 실제로 타게 하는 최소한의 지연 */
const LATENCY_MS = 400;

/**
 * 실패 경로 재현 스위치 (개발용) — members/data-source.ts 와 같은 관례.
 *
 * 백엔드가 없어 이 어댑터는 항상 성공한다. 그러면 실패 배너·재시도 경로를 눈으로 확인할 수 없다.
 * 그래서 **쿼리 파라미터로만** 실패를 재현한다. 서버를 흉내 내는 것이 아니다(상태를 만들지도,
 * 저장하지도 않는다).
 *
 *   /users/settings?fail=save    → 저장이 실패한다
 *   /users/settings?fail=policy  → 정책 조회가 실패한다
 *   /users/settings?fail=all     → 이 화면의 모든 호출이 실패한다
 *
 * 백엔드가 붙으면 이 함수와 호출부는 함께 사라진다.
 */
type FailureOp = 'all' | 'policy' | 'save';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;

  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

/** 현재 등급 정책 조회 */
// TODO(backend): GET /api/member-tiers
export async function fetchTierPolicy(signal: AbortSignal): Promise<TierPolicy> {
  await wait(LATENCY_MS, signal);
  failIfRequested('policy');
  return DEFAULT_TIER_POLICY;
}

/**
 * 등급 정책 저장 — 지금은 저장하지 않는다.
 *
 * 전달되는 policy 는 validateDraft() 를 통과한 값이다(승급 조건 단조 증가·할인율 0~100).
 * 백엔드도 같은 규칙을 서버에서 다시 검증해야 한다 — 프론트 검증은 UX 이지 보증이 아니다.
 */
// TODO(backend): PUT /api/member-tiers
//   바디: { rules: { normal|vip|vvip: { threshold, discountPercent } }, period, allowDemotion, recalcTrigger }
//   422 → 규칙 위반(승급 조건 역전 등) / 200 → 저장된 정책 반환
export async function saveTierPolicy(policy: TierPolicy, signal?: AbortSignal): Promise<void> {
  void policy;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}
