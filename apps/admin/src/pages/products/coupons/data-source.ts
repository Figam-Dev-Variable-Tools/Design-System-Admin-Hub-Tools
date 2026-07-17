// 쿠폰 데이터 소스 어댑터
//
// [백엔드 연동 지점] 카테고리 결합이 없어 프레임워크 createCrudAdapter 에 시드를 넣는다.
// 실제 연동 시 // TODO(backend) 로 어댑터 본문만 교체하고 화면은 그대로 둔다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortCoupons } from './types';
import type { Coupon, CouponInput } from './types';

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
