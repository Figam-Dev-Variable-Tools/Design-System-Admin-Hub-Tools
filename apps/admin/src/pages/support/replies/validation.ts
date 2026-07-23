// 답변 템플릿 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { TEMPLATE_BODY_MAX, TEMPLATE_TITLE_MAX } from '../_shared/domain';

/* ── 마케팅 문법 혼입 차단 ────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [관리자 화면에 치환 문법이 두 벌 있다 — 그리고 그것은 실수가 아니다]
 *
 * 이 화면(고객센터 답변 템플릿)  : `{{고객명}}`      — **삽입 시점**에 치환된다
 * 마케팅 발송 템플릿             : `#{member.name}` — **발송 시점**에 치환된다
 *
 * 합치지 않은 이유는 표기가 아니라 **동작이 다르기 때문**이다.
 *
 *   · 치환 주체 — 이쪽은 우리 JS(`_shared/domain.ts` applyTemplate), 저쪽은 발송 대행사(솔라피·카카오).
 *   · 치환 시점 — 이쪽은 운영자가 템플릿을 고르는 **그 순간** 값이 박혀 작성칸에 들어간다
 *     (`tickets/TicketDetailPage.tsx` onSelectTemplate → setComposer). 저쪽은 토큰이 본문에
 *     **저장된 채 남아** 발송 때 수신자마다 다르게 치환된다.
 *   · 값의 출처 — 이쪽은 **지금 열려 있는 티켓 한 건**, 저쪽은 수신자 명부.
 *
 * 그래서 표기를 통일하면 `#{ticket.customerName}` 이 **화면에 따라 다른 뜻**을 갖게 된다 —
 * 여기서는 열린 티켓에서 즉시, 저기서는 수신자별로 발송 때. 생김새가 같아지므로 차이는
 * 사라지지 않고 **보이지 않게** 된다. 지금은 표기가 달라 경계가 눈에 보인다.
 *
 * [진짜 위험은 어디인가] 문법이 둘인 것이 아니라 **서로의 영역에 잘못 들어가는 것**이다.
 * 운영자가 여기에 `#{member.name}` 을 적으면 applyTemplate 이 모르는 문법이라 그대로 남고,
 * 작성칸을 눈으로 훑다 놓치면 고객에게 그 글자가 간다. 그 구멍을 막는 것이 아래 검사다.
 * 반대 방향(마케팅 본문에 `{{고객명}}`)은 `marketing/message-templates/validation.ts` 가 막는다.
 *
 * 근거와 판단 경위: 명세 FS-036 §7 #30.
 * ───────────────────────────────────────────────────────────────────────────── */
const MARKETING_TOKEN_RE = /#\{[^}]*\}/g;

/** 마케팅 발송 템플릿 문법이 섞였는가 — 섞였으면 문제의 토큰을 함께 돌려준다 */
export function marketingSyntaxError(body: string): string | null {
  const found = [...new Set(body.match(MARKETING_TOKEN_RE) ?? [])];
  if (found.length === 0) return null;

  return `발송 템플릿 문법이 섞였어요: ${found.join(' · ')} — 이 화면의 치환 변수는 {{고객명}}·{{문의번호}}·{{담당자}} 예요. #{...} 는 여기서 치환되지 않고 고객에게 그대로 전달돼요.`;
}

export const replyTemplateSchema = z
  .object({
    title: requiredText('템플릿 제목', TEMPLATE_TITLE_MAX),
    // 유형 태그 — 비면('') 전체 공용. 특정 유형 id 면 그 유형 티켓에만 노출된다.
    categoryId: z.string(),
    body: requiredText('본문', TEMPLATE_BODY_MAX),
  })
  .check((ctx) => {
    const error = marketingSyntaxError(ctx.value.body);
    if (error !== null) {
      ctx.issues.push({ code: 'custom', input: ctx.value.body, path: ['body'], message: error });
    }
  });

export type ReplyTemplateFormValues = z.infer<typeof replyTemplateSchema>;
