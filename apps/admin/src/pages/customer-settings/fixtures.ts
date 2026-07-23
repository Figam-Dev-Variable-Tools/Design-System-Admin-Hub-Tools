// 고객 설정 더미 데이터
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 저장소가 아니다 — 저장해도 여기 값은 바뀌지 않는다(지금 값은 data-source 가 들고 있다).
// 백엔드가 붙으면 data-source.ts 가 이 파일 대신 실제 응답을 돌려주고, 이 파일은 삭제된다.
//
// [등급 3종의 id·라벨을 여기서 지어내지 않는다] 정본은 shared/domain/member.ts 다 — 회원이 들고
// 있는 참조값과 회원 목록이 그리는 이름이 그것이라, 여기서 베껴 적으면 언젠가 한쪽만 바뀐다.
import { TIER_LABEL } from '../../shared/domain/member';
import { BUILT_IN_TIER_ORDER } from './types';
import type { TierPolicy, TierRow } from './types';

/** 기본 제공 등급의 초기 정책값(승급 조건·할인율) — id 와 라벨은 도메인이 준다 */
const BUILT_IN_DEFAULTS: Readonly<
  Record<string, { readonly threshold: number; readonly discountPercent: number }>
> = {
  // 일반회원은 기본 등급 — 승급 조건이 없다(항상 0원). 할인율만 정책 대상이다
  normal: { threshold: 0, discountPercent: 0 },
  vip: { threshold: 1_000_000, discountPercent: 3 },
  vvip: { threshold: 5_000_000, discountPercent: 5 },
};

const BUILT_IN_TIERS: readonly TierRow[] = BUILT_IN_TIER_ORDER.map((id) => ({
  id,
  label: TIER_LABEL[id],
  // 기본 제공 등급 — 이름 변경·삭제가 잠긴다 (types.ts 의 SYSTEM_TIER_REASON)
  system: true,
  threshold: BUILT_IN_DEFAULTS[id]?.threshold ?? 0,
  discountPercent: BUILT_IN_DEFAULTS[id]?.discountPercent ?? 0,
}));

/** 현재 운영 중인 등급 정책(이라고 가정하는 값) — 화면의 초기 상태다 */
export const DEFAULT_TIER_POLICY: TierPolicy = {
  tiers: BUILT_IN_TIERS,
  period: 'all',
  allowDemotion: false,
  recalcTrigger: 'order-completed',
};
