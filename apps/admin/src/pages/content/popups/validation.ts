// 팝업 폼 검증 규칙 (A41 — ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini`.
import * as z from 'zod/mini';

import { TITLE_MAX_LENGTH } from './types';

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const [y, m, d] = value.split('-').map(Number);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
}

/** URL 형식(http/https)인가 — 이미지·링크에 공통으로 쓴다 */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value.trim());
}

export const popupSchema = z
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
    // 링크는 선택 — 입력했다면 형식은 맞아야 한다
    linkUrl: z.string().check(
      z.refine((value) => value.trim() === '' || isHttpUrl(value), {
        error: 'http(s):// 로 시작하는 URL 을 입력하세요.',
      }),
    ),
    position: z.enum(['home', 'event', 'all']),
    startAt: z.string(),
    endAt: z.string(),
    enabled: z.boolean(),
    priority: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '우선순위를 입력하세요.' }),
      z.refine((value) => /^\d+$/.test(value.trim()), { error: '우선순위는 0 이상의 정수입니다.' }),
    ),
  })
  .check((ctx) => {
    // 노출 기간 — 시작/종료 모두 실재하는 날짜여야 하고 종료 ≥ 시작이어야 한다.
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isRealDate(start)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '노출 기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (!isRealDate(end)) {
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

export type PopupFormValues = z.infer<typeof popupSchema>;
