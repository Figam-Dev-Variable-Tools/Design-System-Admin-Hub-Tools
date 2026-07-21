// 쿠폰 데이터 소스 어댑터
//
// [백엔드 연동 지점] 카테고리 결합이 없어 프레임워크 createCrudAdapter 에 시드를 넣는다.
// 실제 연동 시 // TODO(backend) 로 어댑터 본문만 교체하고 화면은 그대로 둔다.
import { createCrudAdapter } from '../../../shared/crud';
import { discountLabel, sortCoupons } from './types';
import type { Coupon, CouponInput } from './types';
import type { CatalogCoupon } from '../../../shared/domain/coupon-catalog';

const COUPON_SEED: readonly Coupon[] = [
  {
    id: 'cpn-1',
    name: '신규 가입 15% 할인',
    code: 'WELCOME15',
    issueType: 'percent',
    discountValue: 15,
    maxDiscount: 20000,
    minOrderAmount: 30000,
    target: 'all',
    totalQuantity: 1000,
    issuedCount: 640,
    startAt: '2026-07-01',
    endAt: '2026-09-30',
    enabled: true,
  },
  {
    id: 'cpn-2',
    name: '5,000원 재구매 쿠폰',
    code: 'AGAIN5000',
    issueType: 'amount',
    discountValue: 5000,
    maxDiscount: 0,
    minOrderAmount: 50000,
    target: 'member_grade',
    totalQuantity: 500,
    issuedCount: 500,
    startAt: '2026-06-01',
    endAt: '2026-08-31',
    enabled: true,
  },
  {
    id: 'cpn-3',
    name: '무료배송 데이',
    code: 'FREESHIP',
    issueType: 'free_shipping',
    discountValue: 0,
    maxDiscount: 0,
    minOrderAmount: 0,
    target: 'all',
    totalQuantity: 0,
    issuedCount: 3120,
    startAt: '2026-08-01',
    endAt: '2026-08-07',
    enabled: true,
  },
  {
    id: 'cpn-4',
    name: '아우터 카테고리 10% 쿠폰',
    code: 'OUTER10',
    issueType: 'percent',
    discountValue: 10,
    maxDiscount: 30000,
    minOrderAmount: 0,
    target: 'category',
    totalQuantity: 300,
    issuedCount: 45,
    startAt: '2026-05-01',
    endAt: '2026-06-30',
    enabled: false,
  },
];

/**
 * 다른 도메인이 쿠폰을 **참조**할 때 보는 목록 (shared/domain/coupon-catalog 의 조회기 구현).
 *
 * [왜 여기서 내보내나] 프로모션의 쿠폰 연동, 회원 상세의 보유 쿠폰이 이 목록을 참조한다. 그들이
 * 이 모듈을 직접 import 하면 페이지 간 결합이라 방향을 뒤집었다 — '무엇을 참조할 수 있는가' 는
 * 정의하는 쪽이 답하는 질문이고, 꽂는 일은 `src/wiring.ts` 가 한다.
 *
 * [왜 어댑터가 아니라 시드인가] createCrudAdapter 는 현재 목록을 밖에 내주지 않는다(비공개 클로저).
 * 픽스처 단계에서는 시드가 곧 카탈로그다 — 이 화면에서 방금 만든 쿠폰이 프로모션 선택 목록에
 * 나타나지 않는 것은 그 한계다. TODO(backend): GET /api/coupons 응답으로 대체하면 사라진다.
 *
 * [왜 중지·만료된 쿠폰까지 주나] 카탈로그는 선택 목록이자 **표시값의 정본**이다. 걸러 내면 이미
 * 그 쿠폰을 발급받은 회원의 보유 쿠폰이 '삭제된 쿠폰' 으로 보인다 — 끝난 것과 없는 것은 다르다.
 */
export function listCatalogCoupons(): readonly CatalogCoupon[] {
  return COUPON_SEED.map((coupon) => ({
    id: coupon.id,
    name: coupon.name,
    code: coupon.code,
    benefitLabel: discountLabel(coupon),
    endAt: coupon.endAt,
  }));
}

let seq = COUPON_SEED.length;

// TODO(backend): GET/POST /api/coupons · GET/PUT/DELETE /api/coupons/:id
export const couponAdapter = createCrudAdapter<Coupon, CouponInput>({
  scope: 'coupons',
  seed: COUPON_SEED,
  build: (input) => {
    seq += 1;
    return { id: `cpn-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortCoupons,
});
