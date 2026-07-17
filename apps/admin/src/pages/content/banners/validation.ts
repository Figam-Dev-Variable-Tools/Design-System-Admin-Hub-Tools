// 배너 폼 검증 규칙 (ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini`. 팝업과 규칙 형태는 닮았지만
// 위치(placement)·정렬(order) 필드가 달라 각자 스키마를 갖는다(도메인은 페이지에 남긴다).
import * as z from 'zod/mini';

import { isCalendarDate } from '../../../shared/format';

import { TITLE_MAX_LENGTH } from './types';

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value.trim());
}

export const bannerSchema = z
  .object({
    title: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '제목을 입력하세요.' }),
      z.refine((value) => value.trim().length <= TITLE_MAX_LENGTH, {
        error: `제목은 ${String(TITLE_MAX_LENGTH)}자를 넘을 수 없습니다.`,
      }),
    ),
    // 업로드된 이미지 값(object/data URL 또는 업로드 응답 URL) — 형식은 강제하지 않고 등록 여부만 본다
    imageUrl: z
      .string()
      .check(z.refine((value) => value.trim() !== '', { error: '이미지를 등록하세요.' })),
    linkUrl: z.string().check(
      z.refine((value) => value.trim() === '' || isHttpUrl(value), {
        error: 'http(s):// 로 시작하는 URL 을 입력하세요.',
      }),
    ),
    placement: z.enum(['main', 'sub']),
    startAt: z.string(),
    endAt: z.string(),
    enabled: z.boolean(),
    order: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '정렬 순서를 입력하세요.' }),
      z.refine((value) => /^\d+$/.test(value.trim()), {
        error: '정렬 순서는 0 이상의 정수입니다.',
      }),
    ),
  })
  .check((ctx) => {
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isCalendarDate(start)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '노출 기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (!isCalendarDate(end)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endAt,
        path: ['endAt'],
        message: '노출 기간을 YYYY-MM-DD 형식으로 입력하세요.',
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

export type BannerFormValues = z.infer<typeof bannerSchema>;
