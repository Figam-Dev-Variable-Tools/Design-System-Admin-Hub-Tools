// 적립금 정책 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { objectParticle, topicParticle } from '../../../shared/format';

const INT_RE = /^\d+$/;

const intString = (label: string) =>
  z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => INT_RE.test(value.trim()), {
      error: `${label}${topicParticle(label)} 0 이상의 정수만 입력할 수 있습니다.`,
    }),
  );

/** 백분율 문자열 — 0~100 정수 */
const percentString = (label: string) =>
  z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => INT_RE.test(value.trim()) && Number(value.trim()) <= 100, {
      error: `${label}${topicParticle(label)} 0% 이상 100% 이하로 입력하세요.`,
    }),
  );

/** 1 이상 정수 문자열 */
const positiveIntString = (label: string) =>
  z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => INT_RE.test(value.trim()) && Number(value.trim()) >= 1, {
      error: `${label}${topicParticle(label)} 1 이상의 정수로 입력하세요.`,
    }),
  );

export const pointsPolicySchema = z.object({
  earnRate: percentString('적립률'),
  earnBaseline: z.enum(['payment', 'order']),
  signupBonus: intString('회원가입 적립금'),
  minUseAmount: intString('최소 사용 포인트'),
  useUnit: positiveIntString('사용 단위'),
  maxUseRate: percentString('1회 사용 한도'),
  expireMonths: positiveIntString('유효기간(개월)'),
});

export type PointsPolicyValues = z.infer<typeof pointsPolicySchema>;
