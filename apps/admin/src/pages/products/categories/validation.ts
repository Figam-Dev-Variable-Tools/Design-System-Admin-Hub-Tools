// 상품 카테고리 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { CATEGORY_NAME_MAX } from './types';

export const productCategorySchema = z.object({
  name: requiredText('카테고리 이름', CATEGORY_NAME_MAX),
  /** 상위 카테고리 id. 빈 문자열이면 최상위(1Depth) — 셀렉트가 빈 값을 주므로 문자열로 받는다 */
  parentId: z.string(),
});

export type ProductCategoryFormValues = z.infer<typeof productCategorySchema>;
