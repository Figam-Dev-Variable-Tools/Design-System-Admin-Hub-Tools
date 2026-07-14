// 고객 설정 더미 데이터 (A40 소유)
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 저장소가 아니다 — 저장해도 여기 값은 바뀌지 않는다. 백엔드가 붙으면 data-source.ts 가
// 이 파일 대신 실제 응답을 돌려주고, 이 파일은 삭제된다.
import type { TierPolicy } from './types';

/** 현재 운영 중인 등급 정책(이라고 가정하는 값) — 화면의 초기 상태다 */
export const DEFAULT_TIER_POLICY: TierPolicy = {
  rules: {
    // 일반회원은 기본 등급 — 승급 조건이 없다(항상 0원). 할인율만 정책 대상이다
    normal: { threshold: 0, discountPercent: 0 },
    vip: { threshold: 1_000_000, discountPercent: 3 },
    vvip: { threshold: 5_000_000, discountPercent: 5 },
  },
  period: 'all',
  allowDemotion: false,
  recalcTrigger: 'order-completed',
};
