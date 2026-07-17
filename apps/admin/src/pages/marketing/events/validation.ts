// 이벤트 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 기간 역전·혜택 상세 누락·배너 연동 시 배너명 누락을 경계값으로 막는다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isCalendarDate } from '../../../shared/format';
import { benefitNeedsDetail } from '../_shared/campaign';
import { EVENT_DESC_MAX, EVENT_TITLE_MAX } from './types';

export const eventSchema = z
  .object({
    title: requiredText('이벤트명', EVENT_TITLE_MAX),
    startAt: z.string(),
    endAt: z.string(),
    phase: z.enum(['upcoming', 'ongoing', 'ended']),
    target: requiredText('대상', 60),
    benefitType: z.enum(['none', 'coupon', 'points']),
    benefitDetail: z.string(),
    bannerLinked: z.boolean(),
    bannerLabel: z.string(),
    description: z.string().check(
      z.refine((value) => value.trim().length <= EVENT_DESC_MAX, {
        error: `설명은 ${String(EVENT_DESC_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
  })
  .check((ctx) => {
    // 기간 — 실재 날짜 + 종료 ≥ 시작.
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isCalendarDate(start) || !isCalendarDate(end)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '이벤트 기간을 YYYY-MM-DD 형식으로 입력하세요.',
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
    // 혜택 상세 — 쿠폰/적립이면 상세값 필수.
    if (benefitNeedsDetail(ctx.value.benefitType) && ctx.value.benefitDetail.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.benefitDetail,
        path: ['benefitDetail'],
        message: '혜택 상세(쿠폰명·적립액)를 입력하세요.',
      });
    }
  })
  .check((ctx) => {
    // 배너 연동 — 연동 시 배너명 필수.
    if (ctx.value.bannerLinked && ctx.value.bannerLabel.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.bannerLabel,
        path: ['bannerLabel'],
        message: '연동할 배너명을 입력하세요.',
      });
    }
  });

export type EventFormValues = z.infer<typeof eventSchema>;
