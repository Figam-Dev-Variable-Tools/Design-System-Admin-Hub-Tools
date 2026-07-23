// 배송 정책 · 택배사 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { objectParticle, topicParticle } from '../../../shared/format';
import { CARRIER_CODE_MAX, CARRIER_NAME_MAX, INVOICE_TOKEN } from '../../../shared/domain/shipment';

const INT_RE = /^\d+$/;

/** 필수 정수 문자열 — 비면 막고, 숫자 형식이 아니면 막는다 */
const intString = (label: string) =>
  z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => INT_RE.test(value.trim()), {
      error: `${label}${topicParticle(label)} 0 이상의 정수만 입력할 수 있어요.`,
    }),
  );

export const shippingPolicySchema = z
  .object({
    /**
     * 기본 택배사 — **등록된 목록에서 고른 id** 다(자유 텍스트가 아니다).
     * 선택지 자체가 화면에서 오므로 여기서는 '골랐는가' 만 본다.
     */
    defaultCarrierId: z
      .string()
      .check(z.refine((value) => value.trim() !== '', { error: '기본 택배사를 선택하세요.' })),
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

/* ── 택배사 ──────────────────────────────────────────────────────────────── */

/**
 * 연동 키 — 영문 대문자·숫자·하이픈만.
 *
 * 소문자·한글을 막는 이유: code 는 사람이 읽는 이름이 아니라 **시스템이 대조하는 값**이다.
 * 'cj' 와 'CJ' 가 다른 택배사가 되는 순간 이름을 유한 집합으로 좁힌 이유가 사라진다.
 */
const CARRIER_CODE_RE = /^[A-Z0-9-]+$/;

/** 템플릿은 http(s) 여야 하고, 치환 토큰을 반드시 품어야 한다 */
const HTTP_URL_RE = /^https?:\/\/\S+$/;

export const carrierSchema = z.object({
  name: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '택배사 이름을 입력하세요.' }),
    z.refine((value) => value.trim().length <= CARRIER_NAME_MAX, {
      error: `택배사 이름은 ${String(CARRIER_NAME_MAX)}자를 넘을 수 없어요.`,
    }),
  ),
  code: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '택배사 코드를 입력하세요.' }),
    z.refine((value) => value.trim().length <= CARRIER_CODE_MAX, {
      error: `택배사 코드는 ${String(CARRIER_CODE_MAX)}자를 넘을 수 없어요.`,
    }),
    z.refine((value) => value.trim() === '' || CARRIER_CODE_RE.test(value.trim()), {
      error: '택배사 코드는 영문 대문자·숫자·하이픈(-)만 사용할 수 있어요.',
    }),
  ),
  trackingUrlTemplate: z.string().check(
    z.refine((value) => value.trim() === '' || HTTP_URL_RE.test(value.trim()), {
      error: '추적 URL 은 http:// 또는 https:// 로 시작해야 해요.',
    }),
    z.refine((value) => value.trim() === '' || value.includes(INVOICE_TOKEN), {
      error: `추적 URL 에는 ${INVOICE_TOKEN} 이 한 번 들어가야 해요 — 송장번호를 끼울 자리가 없으면 링크를 만들 수 없어요.`,
    }),
  ),
  active: z.boolean(),
});

export type CarrierFormValues = z.infer<typeof carrierSchema>;
