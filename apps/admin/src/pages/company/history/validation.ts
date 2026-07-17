// 연혁 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { objectParticle, topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import { CONTENT_MAX_LENGTH, YEAR_MAX, YEAR_MIN } from './types';

/** 정수 문자열 + 범위 검사 */
function intInRange(label: string, min: number, max: number) {
  return z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => /^\d+$/.test(value.trim()), {
      error: `${label}${topicParticle(label)} 숫자여야 합니다.`,
    }),
    z.refine(
      (value) => {
        const n = Number(value.trim());
        return n >= min && n <= max;
      },
      { error: `${label}${topicParticle(label)} ${String(min)} ~ ${String(max)} 범위여야 합니다.` },
    ),
  );
}

export const historySchema = z.object({
  year: intInRange('연도', YEAR_MIN, YEAR_MAX),
  month: intInRange('월', 1, 12),
  content: requiredText('내용', CONTENT_MAX_LENGTH),
});

export type HistoryFormValues = z.infer<typeof historySchema>;
