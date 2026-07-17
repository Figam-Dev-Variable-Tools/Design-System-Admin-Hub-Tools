// 인증서/특허 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredImage, requiredText } from '../../../shared/crud';
import { ISSUER_MAX_LENGTH, NAME_MAX_LENGTH } from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const certSchema = z.object({
  name: requiredText('명칭', NAME_MAX_LENGTH),
  issuer: requiredText('발급기관', ISSUER_MAX_LENGTH),
  issuedOn: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '발급일을 입력하세요.' }),
    z.refine((value) => ISO_DATE_RE.test(value.trim()), {
      error: '발급일 형식이 올바르지 않습니다.',
    }),
  ),
  kind: z.string().check(
    z.refine((value) => value === 'certificate' || value === 'patent', {
      error: '구분을 선택하세요.',
    }),
  ),
  imageUrl: requiredImage('이미지'),
});

export type CertFormValues = z.infer<typeof certSchema>;
