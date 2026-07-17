// ESG 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { MAX_ESG_IMAGES, SUMMARY_MAX_LENGTH, TITLE_MAX_LENGTH } from './types';

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
  // 본문 이미지 — 선택, 최대 MAX_ESG_IMAGES 장. 형식은 강제하지 않는다(업로드 값).
  imageUrls: z.array(z.string()).check(
    z.refine((values) => values.length <= MAX_ESG_IMAGES, {
      error: `본문 이미지는 최대 ${String(MAX_ESG_IMAGES)}장까지 등록할 수 있습니다.`,
    }),
  ),
});

export type EsgFormValues = z.infer<typeof esgSchema>;
