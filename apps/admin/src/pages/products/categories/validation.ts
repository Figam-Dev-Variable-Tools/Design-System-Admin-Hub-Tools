// 상품 카테고리 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { CATEGORY_NAME_MAX } from './types';

export const productCategorySchema = z.object({
  name: requiredText('카테고리 이름', CATEGORY_NAME_MAX),
});

export type ProductCategoryFormValues = z.infer<typeof productCategorySchema>;
