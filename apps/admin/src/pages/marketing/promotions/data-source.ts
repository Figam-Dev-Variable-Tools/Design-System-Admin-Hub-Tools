// 프로모션 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// [백엔드 연동 지점] createCrudAdapter 에 시드를 넣는다. 실연동 시 // TODO(backend) 로 본문만 바꾼다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortPromotions } from './types';
import type { Promotion, PromotionInput } from './types';

const PROMOTION_SEED: readonly Promotion[] = [
  {
    id: 'pr-1',
    title: '전 상품 20% 할인',
    startAt: '2026-07-10',
    endAt: '2026-07-20',
    phase: 'ongoing',
    target: '전체 회원',
    discountType: 'rate',
    discountValue: 20,
    minOrderAmount: 30000,
    couponLinked: true,
    couponCode: 'SUMMER20',
    description: '3만원 이상 구매 시 전 상품 20% 할인.',
  },
  {
    id: 'pr-2',
    title: '신규회원 5,000원 할인',
    startAt: '2026-08-01',
    endAt: '2026-08-31',
    phase: 'upcoming',
    target: '신규 가입 회원',
    discountType: 'amount',
    discountValue: 5000,
    minOrderAmount: 0,
    couponLinked: true,
    couponCode: 'WELCOME5000',
    description: '신규 가입 회원 대상 즉시 할인.',
  },
  {
    id: 'pr-3',
    title: '봄 시즌 10% 특가',
    startAt: '2026-03-01',
    endAt: '2026-03-31',
    phase: 'ended',
    target: '전체 회원',
    discountType: 'rate',
    discountValue: 10,
    minOrderAmount: 0,
    couponLinked: false,
    couponCode: '',
    description: '봄 시즌 특가(종료).',
  },
];

let seq = PROMOTION_SEED.length;

// TODO(backend): GET/POST /api/marketing/promotions · GET/PUT/DELETE /api/marketing/promotions/:id
export const promotionAdapter = createCrudAdapter<Promotion, PromotionInput>({
  scope: 'marketing-promotions',
  seed: PROMOTION_SEED,
  build: (input) => {
    seq += 1;
    return { id: `pr-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortPromotions,
});
