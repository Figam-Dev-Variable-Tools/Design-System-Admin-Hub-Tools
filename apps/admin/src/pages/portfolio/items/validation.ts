// 포트폴리오 항목 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredImage, requiredText } from '../../../shared/crud';
import {
  MAX_PORTFOLIO_IMAGES,
  PORTFOLIO_CLIENT_MAX,
  PORTFOLIO_SUMMARY_MAX,
  PORTFOLIO_TITLE_MAX,
} from '../_shared/store';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const portfolioSchema = z.object({
  title: requiredText('제목', PORTFOLIO_TITLE_MAX),
  categoryId: z
    .string()
    .check(z.refine((value) => value.trim() !== '', { error: '카테고리를 선택하세요.' })),
  client: requiredText('고객사', PORTFOLIO_CLIENT_MAX),
  summary: requiredText('소개', PORTFOLIO_SUMMARY_MAX),
  date: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '일자를 입력하세요.' }),
    z.refine((value) => ISO_DATE_RE.test(value.trim()), {
      error: '일자 형식이 올바르지 않아요.',
    }),
  ),
  coverImageUrl: requiredImage('대표 이미지'),
  imageUrls: z.array(z.string()).check(
    z.refine((values) => values.length <= MAX_PORTFOLIO_IMAGES, {
      error: `본문 이미지는 최대 ${String(MAX_PORTFOLIO_IMAGES)}장까지 등록할 수 있어요.`,
    }),
  ),
  published: z.boolean(),
});

export type PortfolioFormValues = z.infer<typeof portfolioSchema>;
