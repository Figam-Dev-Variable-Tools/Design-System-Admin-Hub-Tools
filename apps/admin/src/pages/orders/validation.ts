// 주문 처리 입력의 검증 규칙 (ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini` 다.
//
// [무엇을 검증하는가 — 그리고 무엇을 검증하지 않는가]
// 이 화면에는 등록 폼이 없다. 관리자가 타이핑하는 것은 처리 메모와 취소 사유 둘뿐이고, 그 둘만
// 여기서 본다. **상태 전이가 가능한가**는 검증이 아니라 도메인 규칙이라 여기 없다
// (shared/domain/order.ts 의 orderTransitionBlock) — 같은 판단을 zod 로 한 번 더 쓰면 규칙이
// 두 벌이 되고, 언젠가 한쪽만 고쳐진다.
//
// [왜 취소 사유는 필수인가] 취소는 되돌릴 수 없고, 나중에 '왜 취소됐나' 를 묻는 사람은 반드시
// 나타난다(고객·정산·CS). 사유 없는 취소는 그 질문에 답할 수 없는 기록이다.
import * as z from 'zod/mini';

import { ORDER_CANCEL_REASON_MAX, ORDER_NOTE_MAX } from '../../shared/domain/order';

export const orderNoteSchema = z.object({
  note: z.string().check(
    z.refine((value) => value.length <= ORDER_NOTE_MAX, {
      error: `처리 메모는 ${String(ORDER_NOTE_MAX)}자를 넘을 수 없어요.`,
    }),
  ),
});

export const orderCancelSchema = z.object({
  reason: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '취소 사유를 입력하세요.' }),
    z.refine((value) => value.trim().length <= ORDER_CANCEL_REASON_MAX, {
      error: `취소 사유는 ${String(ORDER_CANCEL_REASON_MAX)}자를 넘을 수 없어요.`,
    }),
  ),
});

/**
 * 필드 하나짜리 입력이라 RHF 를 얹지 않는다 — 상세 화면은 textarea 한 칸과 버튼뿐이고, 그 한 칸의
 * 오류를 화면이 직접 들고 있는 편이 얇다. 대신 **판정은 위 스키마가 한다**: 화면이 자기만의
 * 조건문으로 다시 판단하면 규칙이 둘로 갈라진다(상품 문의 answerError 와 같은 판단).
 */
export function orderNoteError(note: string): string | null {
  const result = orderNoteSchema.safeParse({ note });
  if (result.success) return null;
  return result.error.issues[0]?.message ?? '처리 메모를 저장할 수 없어요.';
}

export function orderCancelReasonError(reason: string): string | null {
  const result = orderCancelSchema.safeParse({ reason });
  if (result.success) return null;
  return result.error.issues[0]?.message ?? '주문을 취소할 수 없어요.';
}
