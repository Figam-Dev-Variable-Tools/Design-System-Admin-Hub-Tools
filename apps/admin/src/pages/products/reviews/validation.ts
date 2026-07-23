// 리뷰 상세(관리자 답변 · 노출 상태) 검증 규칙
//
// **검증 규칙의 정본은 이 zod 스키마다.** 진입점은 `zod/mini` — 상품 문의 답변(../inquiries/validation.ts)과
// 같은 한 벌이다.
//
// [왜 이 화면에 스키마가 필요한가] 리뷰 상세는 이 앱에서 **저장 규칙을 아무도 갖지 않은** 폼이었다.
// 길이 제한은 `<textarea maxLength>` 하나에만 걸려 있었는데, 그것은 타이핑을 막는 **편의**이지
// 저장을 막는 **규칙**이 아니다: 붙여넣기·IME 조합·자동완성은 브라우저에 따라 그 한도를 넘겨
// 들어오고, 그렇게 들어온 값은 아무 검사 없이 그대로 저장 요청으로 나갔다.
//
// [왜 빈 답변은 통과시키나] 리뷰 답변은 문의 답변과 다르다. 문의는 빈 답변이 '답변 완료' 로
// 집계되면 고객이 아무것도 받지 못하므로 막는다. 리뷰 답변은 **비우는 것이 곧 답변 내리기**이며,
// 화면도 그렇게 안내한다('비우면 답변이 노출되지 않아요'). 없는 규칙을 만들지 않는다.
import * as z from 'zod/mini';

import { REVIEW_REPLY_MAX } from './types';

export const reviewReplySchema = z.object({
  reply: z.string().check(
    z.refine((value) => value.trim().length <= REVIEW_REPLY_MAX, {
      error: `관리자 답변은 ${String(REVIEW_REPLY_MAX)}자를 넘을 수 없어요.`,
    }),
  ),
  visible: z.boolean(),
});

/**
 * 저장 전 판정 — 통과하면 null, 아니면 고칠 방법을 말하는 문장.
 *
 * 필드 둘짜리 폼이라 RHF 를 얹지 않는다(문의 답변 화면과 같은 판단). 대신 **판정은 위 스키마가
 * 한다**: 화면이 자기만의 조건문으로 다시 판단하면 규칙이 둘로 갈라진다.
 */
export function reviewReplyError(reply: string, visible: boolean): string | null {
  const result = reviewReplySchema.safeParse({ reply, visible });
  if (result.success) return null;
  return result.error.issues[0]?.message ?? '리뷰를 저장할 수 없어요.';
}
