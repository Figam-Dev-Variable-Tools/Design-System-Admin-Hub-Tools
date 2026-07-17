// 쿠폰 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 숫자 필드(할인값·최대할인·최소주문·발급수량)는 입력 원값 보존을 위해 문자열로 받고 정수 형식을 판정한다.
import * as z from 'zod/mini';

import { isCalendarDate, objectParticle, topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import { COUPON_CODE_MAX, COUPON_NAME_MAX } from './types';

const INT_RE = /^\d+$/;

const intString = (label: string) =>
  z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => INT_RE.test(value.trim()), {
      error: `${label}${topicParticle(label)} 숫자만 입력할 수 있습니다.`,
    }),
  );

export const couponSchema = z
  .object({
    name: requiredText('쿠폰명', COUPON_NAME_MAX),
    code: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '쿠폰 코드를 입력하세요.' }),
      z.refine((value) => value.trim().length <= COUPON_CODE_MAX, {
        error: `쿠폰 코드는 ${String(COUPON_CODE_MAX)}자를 넘을 수 없습니다.`,
      }),
      z.refine((value) => /^[A-Za-z0-9-]+$/.test(value.trim()), {
        error: '쿠폰 코드는 영문·숫자·하이픈만 사용할 수 있습니다.',
      }),
    ),
    issueType: z.enum(['amount', 'percent', 'free_shipping']),
    discountValue: z.string(),
    maxDiscount: z.string(),
    minOrderAmount: intString('최소 주문 금액'),
    target: z.enum(['all', 'member_grade', 'category', 'product']),
    totalQuantity: intString('발급 수량'),
    startAt: z.string(),
    endAt: z.string(),
    enabled: z.boolean(),
    // 발급된 수량 — 사용자가 편집하지 않고 소진율 계산을 위해 보존만 한다(생성 시 0).
    issuedCount: z.number(),
  })
  .check((ctx) => {
    // 할인값 — 무료배송이 아니면 필요하고, 정률이면 1~100%.
    const { issueType, discountValue } = ctx.value;
    if (issueType === 'free_shipping') return;
    const raw = discountValue.trim();
    if (raw === '' || !INT_RE.test(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: discountValue,
        path: ['discountValue'],
        message: '할인값은 숫자만 입력할 수 있습니다.',
      });
      return;
    }
    if (issueType === 'percent' && (Number(raw) < 1 || Number(raw) > 100)) {
      ctx.issues.push({
        code: 'custom',
        input: discountValue,
        path: ['discountValue'],
        message: '할인율은 1% 이상 100% 이하로 입력하세요.',
      });
    }
  })
  .check((ctx) => {
    // 사용 기간 — 실재 날짜 + 종료 ≥ 시작.
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isCalendarDate(start) || !isCalendarDate(end)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '사용 기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (end < start) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endAt,
        path: ['endAt'],
        message: '종료일은 시작일보다 빠를 수 없습니다.',
      });
    }
  });

export type CouponFormValues = z.infer<typeof couponSchema>;
