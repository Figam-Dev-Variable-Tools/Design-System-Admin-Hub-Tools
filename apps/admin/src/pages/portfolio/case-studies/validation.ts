// 성공 사례 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredImage, requiredText } from '../../../shared/crud';
import { CASE_CLIENT_MAX, CASE_TEXT_MAX, CASE_TITLE_MAX, MAX_CASE_IMAGES } from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const INDUSTRIES = ['manufacturing', 'retail', 'finance', 'public', 'healthcare', 'it'] as const;

export const caseStudySchema = z.object({
  title: requiredText('제목', CASE_TITLE_MAX),
  industry: z.string().check(
    z.refine((value) => (INDUSTRIES as readonly string[]).includes(value), {
      error: '업종을 선택하세요.',
    }),
  ),
  client: requiredText('고객사', CASE_CLIENT_MAX),
  challenge: requiredText('과제', CASE_TEXT_MAX),
  solution: requiredText('해결', CASE_TEXT_MAX),
  result: requiredText('성과', CASE_TEXT_MAX),
  date: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '일자를 입력하세요.' }),
    z.refine((value) => ISO_DATE_RE.test(value.trim()), {
      error: '일자 형식이 올바르지 않습니다.',
    }),
  ),
  coverImageUrl: requiredImage('대표 이미지'),
  imageUrls: z.array(z.string()).check(
    z.refine((values) => values.length <= MAX_CASE_IMAGES, {
      error: `본문 이미지는 최대 ${String(MAX_CASE_IMAGES)}장까지 등록할 수 있습니다.`,
    }),
  ),
  published: z.boolean(),
});

export type CaseStudyFormValues = z.infer<typeof caseStudySchema>;
