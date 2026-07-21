// 쿠폰 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 숫자 필드(할인값·최대할인·최소주문·발급수량)는 입력 원값 보존을 위해 문자열로 받고 정수 형식을 판정한다.
//
// [폼은 평평하고 도메인은 유니온이다] 트리거·사용기간은 도메인에서 판별 유니온이지만(types.ts),
// RHF 가 다루는 폼 값은 칸 하나에 문자열 하나인 평평한 모양이다. 그래서 여기서는 **고른 종류에
// 필요한 칸만** 검사하고, 유니온으로 올리는 일은 buildCouponTrigger 한 곳이 한다.
// 검사 문구는 '무엇을 고쳐야 하는지' 를 말한다 — '올바르지 않습니다' 는 고칠 방법을 알려 주지 않는다.
import * as z from 'zod/mini';

import { isCalendarDate, objectParticle, topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import {
  BIRTHDAY_DAYS_MAX,
  COUPON_CODE_MAX,
  COUPON_NAME_MAX,
  targetNeedsIds,
  targetPickerLabel,
  USAGE_DAYS_MAX,
} from './types';

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

    /* ── 발급 기준 — 종류에 따라 아래 세 칸 중 필요한 것만 검사한다 ── */
    triggerType: z.enum(['manual', 'signup', 'tier_up', 'birthday', 'first_order', 'download']),
    triggerTier: z.enum(['normal', 'vip', 'vvip']),
    triggerBirthdayDays: z.string(),
    triggerFrom: z.string(),
    triggerTo: z.string(),

    /* ── 사용 조건 ── */
    target: z.enum(['all', 'member_grade', 'category', 'product']),
    targetIds: z.array(z.string()),
    stackable: z.boolean(),
    usageKind: z.enum(['fixed', 'days_from_issue']),
    usageDays: z.string(),

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
    // 캠페인 기간 — 실재 날짜 + 종료 ≥ 시작.
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
  })
  .check((ctx) => {
    // 발급 기준 — 고른 종류가 요구하는 값만 본다. 나머지 칸은 저장될 때 버려지므로 검사하지 않는다.
    const { triggerType, triggerBirthdayDays, triggerFrom, triggerTo, endAt } = ctx.value;

    if (triggerType === 'birthday') {
      const raw = triggerBirthdayDays.trim();
      if (raw === '' || !INT_RE.test(raw) || Number(raw) > BIRTHDAY_DAYS_MAX) {
        ctx.issues.push({
          code: 'custom',
          input: triggerBirthdayDays,
          path: ['triggerBirthdayDays'],
          message: `생일 발급 시점은 0일(당일) 이상 ${String(BIRTHDAY_DAYS_MAX)}일 이전 사이로 입력하세요.`,
        });
      }
      return;
    }

    if (triggerType !== 'download') return;

    const from = triggerFrom.trim();
    const to = triggerTo.trim();
    if (!isCalendarDate(from) || !isCalendarDate(to)) {
      ctx.issues.push({
        code: 'custom',
        input: triggerFrom,
        path: ['triggerFrom'],
        message: '다운로드 기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (to < from) {
      ctx.issues.push({
        code: 'custom',
        input: triggerTo,
        path: ['triggerTo'],
        message: '다운로드 종료일은 시작일보다 빠를 수 없습니다.',
      });
      return;
    }
    // 받을 수는 있는데 쓸 수 없는 쿠폰을 만들지 않는다 — 다운로드가 캠페인보다 늦게 끝날 수 없다.
    if (isCalendarDate(endAt.trim()) && to > endAt.trim()) {
      ctx.issues.push({
        code: 'custom',
        input: triggerTo,
        path: ['triggerTo'],
        message: '다운로드 종료일을 쿠폰 사용 종료일 이내로 맞추세요. 받아도 쓸 수 없습니다.',
      });
    }
  })
  .check((ctx) => {
    // 사용 대상 — '전체 회원' 이 아니면 실제 대상을 한 개 이상 골라야 한다.
    // (target 이 무엇을 가리키는지 정하는 값이라, 비어 있으면 target 은 아무 말도 하지 않는다.)
    const { target, targetIds } = ctx.value;
    if (!targetNeedsIds(target)) return;
    if (targetIds.length > 0) return;
    const label = targetPickerLabel(target);
    ctx.issues.push({
      code: 'custom',
      input: targetIds,
      path: ['targetIds'],
      message: `${label}${objectParticle(label)} 한 개 이상 선택하세요.`,
    });
  })
  .check((ctx) => {
    // 사용 기간 — '발급일 기준' 을 골랐으면 일수가 필요하다.
    const { usageKind, usageDays } = ctx.value;
    if (usageKind !== 'days_from_issue') return;
    const raw = usageDays.trim();
    if (raw === '' || !INT_RE.test(raw) || Number(raw) < 1 || Number(raw) > USAGE_DAYS_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: usageDays,
        path: ['usageDays'],
        message: `사용 가능 일수는 1일 이상 ${String(USAGE_DAYS_MAX)}일 이하로 입력하세요.`,
      });
    }
  });

export type CouponFormValues = z.infer<typeof couponSchema>;
