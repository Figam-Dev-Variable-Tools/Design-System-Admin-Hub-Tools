// 문의 유형 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { CATEGORY_LABEL_MAX } from '../_shared/domain';

export const supportCategorySchema = z.object({
  label: requiredText('유형 이름', CATEGORY_LABEL_MAX),
  active: z.boolean(),
});

export type SupportCategoryFormValues = z.infer<typeof supportCategorySchema>;
