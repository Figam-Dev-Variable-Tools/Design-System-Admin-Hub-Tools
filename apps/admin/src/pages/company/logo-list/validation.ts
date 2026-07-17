// 로고 목록 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { optionalHttpUrl, requiredImage, requiredText } from '../../../shared/crud';
import { NAME_MAX_LENGTH } from './types';

export const logoSchema = z.object({
  name: requiredText('이름', NAME_MAX_LENGTH),
  logoUrl: requiredImage('로고'),
  linkUrl: optionalHttpUrl('링크 URL'),
});

export type LogoFormValues = z.infer<typeof logoSchema>;
