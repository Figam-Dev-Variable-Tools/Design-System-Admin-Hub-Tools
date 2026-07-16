// 배송 정책 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { objectParticle, topicParticle } from '../../../shared/format';

const INT_RE = /^\d+$/;

/** 필수 정수 문자열 — 비면 막고, 숫자 형식이 아니면 막는다 */
const intString = (label: string) =>
  z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => INT_RE.test(value.trim()), {
      error: `${label}${topicParticle(label)} 0 이상의 정수만 입력할 수 있습니다.`,
    }),
  );

export const shippingPolicySchema = z
  .object({
    carrier: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '택배사를 입력하세요.' }),
      z.refine((value) => value.trim().length <= 40, {
        error: '택배사는 40자를 넘을 수 없습니다.',
      }),
    ),
    feeType: z.enum(['free', 'paid', 'conditional']),
    baseFee: intString('기본 배송비'),
    freeThreshold: z.string(),
    jejuExtraFee: intString('제주 추가배송비'),
    islandExtraFee: intString('도서산간 추가배송비'),
    returnFee: intString('반품 배송비'),
    bundleShipping: z.boolean(),
  })
  .check((ctx) => {
    // 조건부 무료면 무료 기준 금액이 필요하다.
    if (ctx.value.feeType !== 'conditional') return;
    const raw = ctx.value.freeThreshold.trim();
    if (raw === '' || !INT_RE.test(raw) || Number(raw) < 1) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.freeThreshold,
        path: ['freeThreshold'],
        message: '무료배송 기준 금액을 1원 이상 입력하세요.',
      });
    }
  });

export type ShippingPolicyValues = z.infer<typeof shippingPolicySchema>;
