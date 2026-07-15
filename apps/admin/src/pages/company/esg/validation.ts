// ESG 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../_shared/validation';
import { SUMMARY_MAX_LENGTH, TITLE_MAX_LENGTH } from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const esgSchema = z.object({
  category: z.string().check(
    z.refine((value) => value === 'environment' || value === 'social' || value === 'governance', {
      error: '분류를 선택하세요.',
    }),
  ),
  title: requiredText('제목', TITLE_MAX_LENGTH),
  summary: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '내용을 입력하세요.' }),
    z.refine((value) => value.length <= SUMMARY_MAX_LENGTH, {
      error: `내용은 ${String(SUMMARY_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
  date: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '일자를 입력하세요.' }),
    z.refine((value) => ISO_DATE_RE.test(value.trim()), {
      error: '일자 형식이 올바르지 않습니다.',
    }),
  ),
});

export type EsgFormValues = z.infer<typeof esgSchema>;
