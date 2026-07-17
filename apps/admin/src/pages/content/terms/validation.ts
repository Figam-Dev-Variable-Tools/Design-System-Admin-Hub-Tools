// 약관 버전 폼 검증 규칙 (ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini`.
import * as z from 'zod/mini';

import { isCalendarDate } from '../../../shared/format';

import { BODY_MAX_LENGTH, VERSION_MAX_LENGTH } from './types';

export const termsVersionSchema = z.object({
  version: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '버전을 입력하세요. (예: v1.2)' }),
    z.refine((value) => value.trim().length <= VERSION_MAX_LENGTH, {
      error: `버전 표기는 ${String(VERSION_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
  effectiveDate: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '시행일을 입력하세요.' }),
    z.refine((value) => isCalendarDate(value.trim()), {
      error: '시행일을 YYYY-MM-DD 형식으로 입력하세요.',
    }),
  ),
  status: z.enum(['active', 'scheduled', 'archived']),
  body: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '본문을 입력하세요.' }),
    z.refine((value) => value.length <= BODY_MAX_LENGTH, {
      error: `본문은 ${String(BODY_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
});

export type TermsVersionFormValues = z.infer<typeof termsVersionSchema>;
