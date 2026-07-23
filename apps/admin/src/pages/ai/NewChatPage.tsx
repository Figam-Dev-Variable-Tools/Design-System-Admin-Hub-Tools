// NewChatPage — 새 채팅 (라우트: /ai/chat)
//
// [화면 구성] 좌측 레일(검색 · 새 채팅 · 기록[오늘/이전]) + 본문(메시지 목록) + 하단 입력줄.
//
// [이 화면이 하는 일] 관리자가 `@데이터` 를 멘션하고 조건을 적으면, 그 조건으로 **실제 픽스처를
// 조회해** 표를 돌려준다. 답을 짓는 언어 모델은 이 앱에 없다 — 못 알아들은 요청은 알아듣지
// 못했다고 말하고 할 수 있는 것을 대신 보여준다(FEEDBACK-03: 없는 기능을 있는 척하지 않는다).
//
// [상태 소유] 대화는 서버 상태(TanStack Query)다. 입력값·열린 대화 id·응답 모드만 화면이 쥔다.
// 열린 대화 id 는 URL(`?c=`)에 둔다 — 새로고침·뒤로가기가 대화를 잃지 않게 (IA-13).
//
// [실패 처리] 조회 실패는 대화를 죽이지 않는다. 실패도 **메시지 한 건**으로 남는다 — 그래야
// 그때까지의 대화가 살아남고, 관리자가 무엇을 물었는지 잃지 않는다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';

import './ai.css';
import { isAbort } from '../../shared/async';
import { useRouteCan, WRITE_DENIED } from '../../shared/permissions/RequirePermission';
import { Alert, Button, useToast, visuallyHiddenStyle } from '../../shared/ui';
import { AnswerView } from './components/AnswerView';
import { Composer } from './components/Composer';
import { ConversationRail } from './components/ConversationRail';
import { errorAnswer, STARTER_FOLLOW_UPS } from './_shared/answer';
import type { AgentAnswer, FollowUp } from './_shared/answer';
import { DEFAULT_MODE_ID } from './_shared/modes';
import type { ResponseModeId } from './_shared/modes';
import type { ChatMessage } from './_shared/conversations';
import { ConversationGoneError } from './data-source';
import { useAskAgent, useConversationQuery, useConversationsQuery } from './queries';
import { cssVar, typography } from '@tds/ui';

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 레일은 고정 폭, 본문은 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
  gridTemplateColumns: `calc(${cssVar('space.10')} * 5) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  // 입력줄이 항상 보이게 본문에 최소 높이를 준다
  minHeight: `calc(${cssVar('space.10')} * 12)`,
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  flexGrow: 1,
  margin: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const userRowStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end' };

const userBubbleStyle: CSSProperties = {
  maxWidth: `calc(${cssVar('space.10')} * 8)`,
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const agentRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const thinkingStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const followUpListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: cssVar('space.1'),
  margin: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const emptyStateStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.8'),
  paddingBottom: cssVar('space.8'),
  paddingLeft: 0,
  paddingRight: 0,
};

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
};

/** 조회에 걸린 실측 시간 — 참조 디자인의 '47s동안 생각함' 자리. 지어낸 숫자가 아니다 */
function elapsedText(elapsedMs: number): string {
  const seconds = elapsedMs / 1000;
  return seconds >= 1
    ? `${seconds.toFixed(1)}초 동안 조회함`
    : `${String(Math.max(elapsedMs, 1))}ms 동안 조회함`;
}

export default function NewChatPage() {
  const [params, setParams] = useSearchParams();
  const conversationId = params.get('c');

  const [draft, setDraft] = useState('');
  const [modeId, setModeId] = useState<ResponseModeId>(DEFAULT_MODE_ID);

  /**
   * 레일 검색어도 URL 에 둔다 (IA-13) — 좁혀 둔 기록 view 가 새로고침·뒤로가기·링크 공유에서
   * 살아남아야 한다. 열어 둔 대화(`?c=`)와 같은 이유다.
   */
  const railKeyword = params.get('q') ?? '';
  const setRailKeyword = (value: string): void => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === '') next.delete('q');
        else next.set('q', value);
        return next;
      },
      { replace: true },
    );
  };
  /** 방금 보낸 질문 — 응답이 오기 전까지 화면에 먼저 세운다(관리자가 자기 말을 잃지 않게) */
  const [pending, setPending] = useState<string | null>(null);
  const [gone, setGone] = useState(false);

  const conversations = useConversationsQuery();
  const conversation = useConversationQuery(conversationId);
  const ask = useAskAgent();
  const abortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  /**
   * [EXC-03] 질문을 보내는 것이 이 화면의 **생성**이다 — 한 번 보내면 대화가 만들어지고 저장된다.
   * 그런데 입력줄에는 쓰기 판정이 하나도 없어, 조회 권한만 가진 역할이 대화를 만들 수 있었다.
   *
   * 지난 대화를 **읽는 것**은 그대로 열린다 — 막는 것은 새로 쓰는 일뿐이다.
   */
  const canCreate = useRouteCan('create');

  useEffect(() => () => abortRef.current?.abort(), []);

  const messages: readonly ChatMessage[] = conversation.data?.messages ?? [];

  // 열어 둔 대화가 사라졌다 — 목록 조회는 성공했는데 이 대화만 없는 경우다
  const deletedWhileOpen =
    conversationId !== null && conversation.isSuccess && conversation.data === null;

  /**
   * 대화를 **처음** 불러오는 중인가 (STATE-01).
   *
   * `messages` 는 `data?.messages ?? []` 라 도착 전에는 0건이다. 이 상태를 그대로 두면
   * `?c=` 로 대화를 여는 동안 '무엇을 조회할까요?' 빈 상태가 번쩍인 뒤 메시지로 바뀐다 —
   * 관리자는 대화가 비었다고 오판한다. 재조회(data 가 이미 있을 때)에는 걸리지 않는다.
   */
  const conversationFirstLoading =
    conversationId !== null && conversation.isFetching && conversation.data === undefined;

  const send = (question: string): void => {
    const text = question.trim();
    if (text === '') return;
    // 입력줄을 없앤 술어가 전송 경로도 막는다. 화면에는 이미 사유 배너가 서 있지만, 이 경로는
    // 렌더 이후 다른 탭에서 강등된 세션의 잔여 Enter 로도 닿는다 — 그때는 토스트가 사유를 말한다.
    if (!canCreate) {
      toast.error(WRITE_DENIED.create);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPending(text);
    setDraft('');
    setGone(false);

    ask.mutate(
      { conversationId, question: text, signal: controller.signal },
      {
        onSuccess: (result) => {
          setPending(null);
          if (conversationId === null) {
            // 새 대화가 열렸다 — URL 에 붙여 새로고침해도 같은 대화로 돌아오게 한다
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.set('c', result.conversation.id);
              return next;
            });
          }
        },
        onError: (error) => {
          setPending(null);
          if (isAbort(error)) return;
          if (error instanceof ConversationGoneError) setGone(true);
        },
      },
    );
  };

  const startNew = (): void => {
    abortRef.current?.abort();
    setPending(null);
    setGone(false);
    setDraft('');
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('c');
      return next;
    });
  };

  const failedAnswer: AgentAnswer | null =
    ask.isError && !gone && !isAbort(ask.error)
      ? errorAnswer('조회하지 못했어요. 잠시 후 다시 시도해 주세요.')
      : null;

  const renderFollowUps = (followUps: readonly FollowUp[]) => (
    <ul style={followUpListStyle}>
      {followUps.map((followUp) => (
        <li key={followUp.query}>
          <button
            type="button"
            className="tds-ai-followup"
            onClick={() => {
              send(followUp.query);
            }}
          >
            {`↳ ${followUp.label}`}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div style={layoutStyle}>
      <ConversationRail
        conversations={conversations.data ?? []}
        activeId={conversationId}
        keyword={railKeyword}
        onKeywordChange={setRailKeyword}
        onNewChat={startNew}
        loading={conversations.isFetching && conversations.data === undefined}
        failed={conversations.isError}
      />

      <section style={mainStyle} aria-label="대화">
        {deletedWhileOpen || gone ? (
          <div style={agentRowStyle}>
            <Alert tone="warning">이 대화는 삭제되었어요. 새 채팅을 시작해 주세요.</Alert>
            <span>
              <Button type="button" size="sm" variant="secondary" onClick={startNew}>
                새 채팅 시작
              </Button>
            </span>
          </div>
        ) : null}

        {/*
          응답은 스크린리더에 알려져야 한다 — 시각 사용자는 표가 나타나는 것을 보지만
          비시각 사용자에게는 아무 일도 일어나지 않은 것과 같다 (A11Y).
          목록 전체를 live 로 두면 과거 메시지까지 다시 읽히므로 status 는 목록 **바깥**에 둔다.
        */}
        <p role="status" aria-live="polite" aria-label="응답 상태" style={visuallyHiddenStyle}>
          {ask.isPending
            ? '조회 중이에요.'
            : messages.length > 0
              ? `응답이 도착했어요. 메시지 ${String(messages.length)}건.`
              : ''}
        </p>

        {conversationFirstLoading ? (
          <p style={thinkingStyle} aria-busy="true">
            대화를 불러오는 중…
          </p>
        ) : null}

        {!conversationFirstLoading && messages.length === 0 && pending === null ? (
          <div style={emptyStateStyle}>
            <h2 style={headingStyle}>무엇을 조회할까요?</h2>
            <p style={thinkingStyle}>
              `@` 로 데이터를 지목하고 조건을 적어 주세요. 저장된 데이터를 조건으로 거르는 조회만
              해요 — 요약·분석·예측은 하지 않아요.
            </p>
            {renderFollowUps(STARTER_FOLLOW_UPS)}
          </div>
        ) : null}

        <ul style={listStyle}>
          {messages.map((message) =>
            message.role === 'user' ? (
              <li key={message.id} style={userRowStyle}>
                <div style={userBubbleStyle}>{message.text}</div>
              </li>
            ) : (
              <li key={message.id} style={agentRowStyle}>
                <p style={thinkingStyle}>{elapsedText(message.elapsedMs)}</p>
                {message.answer === null ? null : <AnswerView answer={message.answer} />}
                {message.answer === null ? null : renderFollowUps(message.answer.followUps)}
              </li>
            ),
          )}

          {pending !== null ? (
            <li style={userRowStyle}>
              <div style={userBubbleStyle}>{pending}</div>
            </li>
          ) : null}

          {ask.isPending ? (
            <li style={agentRowStyle}>
              <p style={thinkingStyle}>조회 중…</p>
            </li>
          ) : null}

          {failedAnswer !== null ? (
            <li style={agentRowStyle}>
              <AnswerView answer={failedAnswer} />
              {renderFollowUps(failedAnswer.followUps)}
            </li>
          ) : null}
        </ul>

        {/* 권한이 없으면 입력줄은 '비활성' 이 아니라 '부재' 다 — 대신 왜 없는지가 그 자리에 선다 */}
        {canCreate ? (
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={() => {
              send(draft);
            }}
            busy={ask.isPending}
            modeId={modeId}
            onModeChange={setModeId}
          />
        ) : (
          <Alert tone="warning">{WRITE_DENIED.create}</Alert>
        )}
      </section>
    </div>
  );
}
