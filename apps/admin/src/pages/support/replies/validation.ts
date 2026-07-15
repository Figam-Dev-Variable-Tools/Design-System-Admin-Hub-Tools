// 답변 템플릿 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { TEMPLATE_BODY_MAX, TEMPLATE_TITLE_MAX } from '../_shared/domain';

export const replyTemplateSchema = z.object({
  title: requiredText('템플릿 제목', TEMPLATE_TITLE_MAX),
  // 유형 태그 — 비면('') 전체 공용. 특정 유형 id 면 그 유형 티켓에만 노출된다.
  categoryId: z.string(),
  body: requiredText('본문', TEMPLATE_BODY_MAX),
});

export type ReplyTemplateFormValues = z.infer<typeof replyTemplateSchema>;
