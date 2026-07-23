// 프로모션 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 할인값은 원값 보존을 위해 문자열로 받는다. 기간 역전·할인값 0/정률 100 초과·쿠폰 연동 시 선택 누락을
// 경계값으로 막는다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isCalendarDate } from '../../../shared/format';
import { DISCOUNT_RATE_MAX, PROMOTION_DESC_MAX, PROMOTION_TITLE_MAX } from './types';

const INT_RE = /^\d+$/;

export const promotionSchema = z
  .object({
    title: requiredText('프로모션명', PROMOTION_TITLE_MAX),
    startAt: z.string(),
    endAt: z.string(),
    phase: z.enum(['upcoming', 'ongoing', 'ended']),
    target: requiredText('대상', 60),
    discountType: z.enum(['rate', 'amount']),
    discountValue: z.string(),
    minOrderAmount: z.string(),
    // 폼 전용 스위치 — 저장되는 값이 아니다(연동 여부의 정본은 couponId 가 비었는가다).
    // 토글을 끄면 선택이 사라지고, 켜면 카탈로그에서 고른다.
    couponLinked: z.boolean(),
    couponId: z.string(),
    description: z.string().check(
      z.refine((value) => value.trim().length <= PROMOTION_DESC_MAX, {
        error: `설명은 ${String(PROMOTION_DESC_MAX)}자를 넘을 수 없어요.`,
      }),
    ),
  })
  .check((ctx) => {
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isCalendarDate(start) || !isCalendarDate(end)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '프로모션 기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (end < start) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endAt,
        path: ['endAt'],
        message: '종료일은 시작일보다 빠를 수 없어요.',
      });
    }
  })
  .check((ctx) => {
    // 할인값 — 숫자 + 0 초과. 정률은 100 이하.
    const raw = ctx.value.discountValue.trim();
    if (!INT_RE.test(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.discountValue,
        path: ['discountValue'],
        message: '할인값은 숫자만 입력할 수 있어요.',
      });
      return;
    }
    const value = Number(raw);
    if (value <= 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.discountValue,
        path: ['discountValue'],
        message: '할인값은 0보다 커야 해요.',
      });
      return;
    }
    if (ctx.value.discountType === 'rate' && value > DISCOUNT_RATE_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.discountValue,
        path: ['discountValue'],
        message: `정률 할인은 ${String(DISCOUNT_RATE_MAX)}%를 넘을 수 없어요.`,
      });
    }
  })
  .check((ctx) => {
    // 최소 주문금액 — 비었으면 0, 채우면 숫자.
    const raw = ctx.value.minOrderAmount.trim();
    if (raw !== '' && !INT_RE.test(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.minOrderAmount,
        path: ['minOrderAmount'],
        message: '최소 주문금액은 숫자만 입력할 수 있어요.',
      });
    }
  })
  .check((ctx) => {
    // 쿠폰 연동 — 연동 시 쿠폰 선택 필수. 값은 카탈로그의 id 라 '존재하지 않는 쿠폰' 은
    // 여기까지 오지 않는다(선택 목록 자체가 카탈로그에서 만들어진다).
    if (ctx.value.couponLinked && ctx.value.couponId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.couponId,
        path: ['couponId'],
        message: '연동할 쿠폰을 선택하세요.',
      });
    }
  });

export type PromotionFormValues = z.infer<typeof promotionSchema>;
