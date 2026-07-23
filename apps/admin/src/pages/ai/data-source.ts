// 데이터 소스 어댑터 (AI 에이전트)
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다. 지금은 픽스처
// (_shared/conversations.ts)와 결정적 파서(_shared/parser.ts)로 답한다. 백엔드가 준비되면
// **이 파일의 함수 본문만** 교체하면 되고 화면 코드는 바뀌지 않는다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [언어 모델 연동 자리 — 지금은 비어 있다]
//
// `askAgent` 가 그 자리다. 현재 구현은 질문을 **제한된 문법**으로 파싱해 픽스처에 조회를 건다.
// 언어 모델이 붙으면 달라지는 것은 이 함수 안쪽뿐이며, 그때도 아래 계약은 유지되어야 한다:
//
//   1. 답변은 AgentAnswer 유니온을 벗어나지 않는다. 모델이 자유 문장을 돌려주더라도 화면이
//      그것을 **데이터 답변인 것처럼** 그리지 않게 하려면 종류가 값으로 구분돼야 한다.
//   2. 'result' 답변의 행·건수는 **조회 결과**여야 한다. 모델이 숫자를 만들어 내는 경로를
//      열면 이 화면은 그 순간부터 신뢰할 수 없다.
//   3. 알아듣지 못한 요청은 'guidance' 로 남는다 — 모델이 있다고 해서 아무 답이나 내지 않는다.
//
// 모델 없이 할 수 없는 것(요약·분석·예측·추천)은 지금 화면이 거절한다(parser.ts
// UNSUPPORTED_VERBS). 그 거절을 답으로 바꾸는 것이 연동의 범위다.
// ─────────────────────────────────────────────────────────────────────────────
//
// [재현 스위치 — 기존 문법을 그대로 쓴다] shared/crud/dev.ts 의 관례를 따른다.
//   /ai/chat?delay=3000   조회 지연 — '조회 중' 표시와 스켈레톤 경로를 실제로 탄다
//   /ai/chat?fail=ask     질문 1건이 실패 — 대화가 살아남는지 본다
//   /ai/chat?empty=list   대화 목록이 0건으로 온다 — 빈 상태
import { wait } from '../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../shared/crud';
import { buildAnswer } from './_shared/answer';
import type { AgentAnswer } from './_shared/answer';
import {
  appendMessages,
  createConversation,
  findConversation,
  listConversations,
  makeMessage,
  removeConversations,
  titleFromQuestion,
} from './_shared/conversations';
import type { ChatMessage, Conversation } from './_shared/conversations';
// 제공자 등록 부수효과 — 회원 도메인은 이 import 로 자기를 꽂는다.
// (상품·문의는 src/wiring.ts 가 꽂는다 — 그쪽은 페이지 스토어를 읽어야 하기 때문이다.)
import './_shared/provider-members';

const SCOPE = 'ai';

function readDelayMs(): number {
  const raw = Number(new URLSearchParams(window.location.search).get('delay'));
  return Number.isFinite(raw) && raw > 0 ? raw : LATENCY_MS;
}

function isEmptyRequested(flag: string): boolean {
  const raw = new URLSearchParams(window.location.search).get('empty');
  if (raw === null) return false;
  const requested = raw.split(',').map((item) => item.trim());
  return requested.includes('all') || requested.includes(flag);
}

/** 대화 목록 조회 */
export async function fetchConversations(signal: AbortSignal): Promise<readonly Conversation[]> {
  await wait(readDelayMs(), signal);
  failIfRequested(SCOPE, 'list');
  // TODO(backend): GET /api/ai/conversations
  return isEmptyRequested('list') ? [] : listConversations();
}

/** 대화 1건 조회 — 없으면 null (열어 둔 사이 지워졌을 수 있다) */
export async function fetchConversation(
  id: string,
  signal: AbortSignal,
): Promise<Conversation | null> {
  await wait(readDelayMs(), signal);
  failIfRequested(SCOPE, 'detail');
  // TODO(backend): GET /api/ai/conversations/{id}
  return findConversation(id);
}

export interface AskInput {
  /** 이어서 물을 대화 — null 이면 새 대화를 연다 */
  readonly conversationId: string | null;
  readonly question: string;
}

export interface AskResult {
  readonly conversation: Conversation;
  readonly answer: AgentAnswer;
}

/** 대화가 사라진 뒤 이어 물으려 했을 때 — 화면이 이 종류를 보고 안내를 바꾼다 */
export class ConversationGoneError extends Error {
  constructor() {
    super('대화를 찾을 수 없어요.');
    this.name = 'ConversationGoneError';
  }
}

/**
 * 질문 1건을 처리한다.
 *
 * [여기가 언어 모델 자리다 — 위 머리말 참조] 지금은 파서 + 픽스처 조회다.
 */
export async function askAgent(input: AskInput, signal: AbortSignal): Promise<AskResult> {
  const startedAt = Date.now();
  await wait(readDelayMs(), signal);
  failIfRequested(SCOPE, 'ask');

  const nowIso = new Date().toISOString();

  // TODO(backend): POST /api/ai/conversations/{id}/messages
  //   현재는 클라이언트에서 파싱·조회한다. 서버가 붙으면 질문을 그대로 올리고 AgentAnswer 를 받는다.
  const answer = buildAnswer(input.question, new Date());
  const elapsedMs = Date.now() - startedAt;

  const target =
    input.conversationId === null
      ? createConversation(titleFromQuestion(input.question), nowIso)
      : findConversation(input.conversationId);

  if (target === null) throw new ConversationGoneError();

  const messages: readonly ChatMessage[] = [
    makeMessage('user', input.question, null, 0, nowIso),
    makeMessage('agent', '', answer, elapsedMs, nowIso),
  ];

  const updated = appendMessages(target.id, messages, nowIso);
  if (updated === null) throw new ConversationGoneError();

  return { conversation: updated, answer };
}

/** 대화 삭제 (목록의 일괄 삭제 포함) */
export async function deleteConversations(
  ids: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  await wait(readDelayMs(), signal);
  failIfRequested(SCOPE, 'delete');
  // TODO(backend): DELETE /api/ai/conversations
  removeConversations(ids);
}
