// FAQ 폼 검증 규칙 (ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini` 다.
import * as z from 'zod/mini';

import { ANSWER_MAX_LENGTH, CATEGORY_NAME_MAX_LENGTH, QUESTION_MAX_LENGTH } from './types';

/* ── FAQ 등록/수정 ───────────────────────────────────────────────────────── */

export const faqSchema = z.object({
  question: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '질문을 입력하세요.' }),
    z.refine((value) => value.trim().length <= QUESTION_MAX_LENGTH, {
      error: `질문은 ${String(QUESTION_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
  categoryId: z
    .string()
    .check(z.refine((value) => value !== '', { error: '카테고리를 선택하세요.' })),
  answer: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '답변을 입력하세요.' }),
    z.refine((value) => value.length <= ANSWER_MAX_LENGTH, {
      error: `답변은 ${String(ANSWER_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
  visible: z.boolean(),
  // 정렬 순서 — 0 이상의 정수. 화면은 number input 이지만 RHF 는 문자열로 받으므로 문자열로 검증한다.
  order: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '정렬 순서를 입력하세요.' }),
    z.refine((value) => /^\d+$/.test(value.trim()), { error: '정렬 순서는 0 이상의 정수입니다.' }),
  ),
});

export type FaqFormValues = z.infer<typeof faqSchema>;

/* ── 카테고리 등록 (모달) ────────────────────────────────────────────────── */

export const faqCategorySchema = z.object({
  name: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '카테고리명을 입력하세요.' }),
    z.refine((value) => value.trim().length <= CATEGORY_NAME_MAX_LENGTH, {
      error: `카테고리명은 ${String(CATEGORY_NAME_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
});

export type FaqCategoryFormValues = z.infer<typeof faqCategorySchema>;
