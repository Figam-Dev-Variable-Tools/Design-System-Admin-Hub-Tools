// 상품 문의 답변 검증 규칙 (ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini` 다.
// 답변은 고객에게 그대로 나가는 글이다 — 빈 답변이 '답변 완료' 로 상태를 넘기면 고객은 아무것도
// 받지 못한 채 처리된 것으로 집계된다. 그래서 공백만 남은 입력을 여기서 막는다(저장소도 같은
// 규칙으로 한 번 더 막는다 — _shared/store 의 applyAnswer).
import * as z from 'zod/mini';

import { PRODUCT_INQUIRY_ANSWER_MAX } from './_shared/store';

export const productInquiryAnswerSchema = z.object({
  answer: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '답변 내용을 입력하세요.' }),
    z.refine((value) => value.trim().length <= PRODUCT_INQUIRY_ANSWER_MAX, {
      error: `답변은 ${String(PRODUCT_INQUIRY_ANSWER_MAX)}자를 넘을 수 없어요.`,
    }),
  ),
});

/**
 * 필드 하나짜리 폼이라 RHF 를 얹지 않는다 — 상세 화면은 textarea 한 칸과 저장 버튼뿐이고,
 * 그 한 칸의 오류를 화면이 직접 들고 있는 편이 얇다. 대신 **판정은 위 스키마가 한다**:
 * 화면이 자기만의 조건문으로 다시 판단하면 규칙이 둘로 갈라진다.
 */
export function answerError(answer: string): string | null {
  const result = productInquiryAnswerSchema.safeParse({ answer });
  if (result.success) return null;
  return result.error.issues[0]?.message ?? '답변을 저장할 수 없어요.';
}
