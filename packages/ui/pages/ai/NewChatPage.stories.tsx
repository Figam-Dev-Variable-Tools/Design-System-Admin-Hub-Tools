/**
 * Design System/Templates/AI Agent/New Chat — 새 채팅(대화) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/ai/chat` → 메뉴 en = "AI Agent"(AI 에이전트), 화면 en =
 * "New Chat"(새 채팅) — packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인.
 *
 * 대응 실화면: apps/admin/src/pages/ai/NewChatPage.tsx (라우트 /ai/chat) 와 그 하위 조립
 *   components/ConversationRail.tsx · components/Composer.tsx · components/ModePicker.tsx ·
 *   components/AnswerView.tsx.
 *   구성(원본 그대로): [좌 레일: 검색 · 새 채팅 · 기록(오늘/이전)] + [본문: 상태알림 · 빈 프롬프트
 *   또는 메시지 목록(사용자 말풍선 / 에이전트 답변) · 하단 입력줄(알약형 Composer)].
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌 레일 검색             → SearchField
 *   '새 채팅'                → Button(secondary)
 *   기록 항목(오늘/이전)      → 토큰 레이아웃의 링크 톤 표면(원본 .tds-ai-railitem, 앱 CSS)
 *   답변 표(조회 결과)        → DataTable (원본 AnswerView 의 손표를 도메인 중립 표로 갈음)
 *   요청과 답이 다른 지점      → Alert(tone="warning") (원본 notices)
 *   삭제된 대화 열림          → Alert(tone="warning") + Button
 *   입력줄 알약(+·모드·마이크·보내기) → Icon(plus·chevron-down·mic·send) + 토큰 레이아웃
 *   @ 멘션 자동완성           → role="listbox"/"option" 토큰 레이아웃(원본 Composer combobox)
 *
 * [원본에 있으나 DS 대응이 없어 갈음/보류한 것]
 *   · 알약형 Composer·ModePicker·ConversationRail 은 앱 전용 조각이다 — DS 에 대응 컴포넌트가 없어
 *     DS Icon 글리프 + 토큰 레이아웃으로 겉모습만 옮긴다(새 DS 컴포넌트 금지). 원본 전용 아이콘
 *     PlusIcon·MicIcon·SendIcon(icons.tsx)·ChevronDownIcon 은 DS Icon(plus·mic·send·chevron-down)로 대응.
 *   · :hover/:focus-within/:focus-visible 등 의사클래스(원본 ai.css)는 인라인 스타일로 옮길 수 없어
 *     기본(정적) 표시만 재현한다. ModePicker 메뉴 펼침은 이 템플릿에서 닫힌 트리거만 비춘다.
 *   · 답변 표 첫 칸은 원본에서 상세로 가는 <Link> 지만, DataTable 셀은 텍스트라 링크 없이 값만 둔다.
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';

import { Alert, Button, DataTable, Icon, SearchField } from '../../src';
import { cssVar, typography } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Design System/Templates/AI Agent/New Chat',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 _shared/conversations · answer · domains 를 화면이 그리는 값만 축약) ────── */

interface DemoConversation {
  readonly id: string;
  readonly title: string;
  readonly today: boolean;
}

/** 좌 레일 기록 — 원본은 updatedAtIso 로 오늘/이전을 가른다. 여기선 표시용 플래그로 축약 */
const DEMO_HISTORY: readonly DemoConversation[] = [
  { id: 'CV-0007', title: '이번달 가입한 VIP 회원', today: true },
  { id: 'CV-0006', title: '구매 이력이 있는 VVIP 회원', today: true },
  { id: 'CV-0005', title: '처리중인 1:1 문의', today: false },
  { id: 'CV-0004', title: '판매중인 상품 목록', today: false },
];

const ACTIVE_ID = 'CV-0007';

/** 못 알아들었을 때 대신 보여줄 기본 제안 — 실화면 STARTER_FOLLOW_UPS 미러(반드시 파싱되는 질의) */
const STARTER_FOLLOW_UPS: readonly { readonly label: string; readonly query: string }[] = [
  { label: '이번달 가입한 VIP 회원 보기', query: '@회원목록 이번달 가입한 VIP 보여줘' },
  { label: '구매 이력이 있는 VVIP 회원 보기', query: '@회원목록 구매한 VVIP 보여줘' },
  { label: '처리중인 1:1 문의 보기', query: '@문의 처리중 보여줘' },
];

/** 결과 뒤 이어 물을 제안 — 실화면 followUpsForOutcome 미러 */
const RESULT_FOLLOW_UPS: readonly { readonly label: string; readonly query: string }[] = [
  { label: '회원 목록 전체 건수 보기', query: '@회원목록 몇 건이야' },
];

/** @ 멘션 후보 — 실화면 mentionSuggestions()(도메인 대표 별칭 + 라벨) 미러 */
const MENTION_CANDIDATES: readonly { readonly alias: string; readonly label: string }[] = [
  { alias: '회원목록', label: '회원 목록' },
  { alias: '상품목록', label: '상품 목록' },
  { alias: '문의목록', label: '1:1 문의' },
];

/** 조회 결과 표 — 원본 AnswerView 의 outcome(columns/rows)을 DataTable 스키마로 옮긴다 */
const ANSWER_COLUMNS = [
  { key: 'nickname', label: '닉네임', align: 'left' as const },
  { key: 'account', label: '계정', align: 'left' as const },
  { key: 'tier', label: '등급', align: 'left' as const },
  { key: 'joined', label: '가입일', align: 'left' as const },
];

const ANSWER_ROWS: readonly Record<string, string | number>[] = [
  { nickname: '김서연', account: 'seoyeon@example.com', tier: 'VIP', joined: '2026-07-14' },
  { nickname: '윤아름', account: 'areum@example.com', tier: 'VIP', joined: '2026-07-09' },
  { nickname: '정우성', account: 'woosung@example.com', tier: 'VIP', joined: '2026-07-03' },
];

/* ── 스타일(토큰·rem 만 — 원본 NewChatPage/ConversationRail/Composer 의 style 을 옮긴다) ───────── */

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌 레일 고정 폭 + 본문 남는 폭 전부. minmax(0,…) 이라야 표가 그리드를 밀지 않는다(원본 주석)
  gridTemplateColumns: `calc(${cssVar('space.10')} * 5) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  boxSizing: 'border-box',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

/* 좌 레일 */

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  border: `thin solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const groupTitleStyle: CSSProperties = {
  marginTop: cssVar('space.2'),
  marginBottom: cssVar('space.1'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const railListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

/** 기록 항목 — 원본 .tds-ai-railitem 기본형(활성이면 raised 배경 + action 색). :hover 는 옮기지 못함 */
function railItemStyle(active: boolean): CSSProperties {
  return {
    display: 'block',
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderRadius: cssVar('radius.md'),
    background: active ? cssVar('color.surface.raised') : cssVar('color.transparent'),
    color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
    fontSize: cssVar('typography.caption.md.font-size'),
    lineHeight: cssVar('typography.caption.md.line-height'),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  };
}

/* 본문 */

const mainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minHeight: `calc(${cssVar('space.10')} * 12)`,
};

const messageListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  flexGrow: 1,
  margin: 0,
  padding: 0,
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

const answerBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const thinkingStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const summaryStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
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
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
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

/** 후속 제안(↳) — 원본 .tds-ai-followup 기본형(링크처럼 보이나 질의를 다시 던지는 버튼) */
const followUpStyle: CSSProperties = {
  padding: 0,
  border: 'none',
  background: cssVar('color.transparent'),
  color: cssVar('color.action.primary.default'),
  fontFamily: cssVar('typography.body.md.font-family'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  textAlign: 'left',
  cursor: 'pointer',
};

const listLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  cursor: 'pointer',
};

/* 입력줄(알약형 Composer) */

const composerStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  border: `thin solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.default'),
};

const composerInputStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: cssVar('color.transparent'),
  color: cssVar('color.text.default'),
  fontFamily: cssVar('typography.body.md.font-family'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const composerTrailingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexShrink: 0,
};

const ICON_BUTTON_SIZE = `calc(${cssVar('space.4')} + ${cssVar('space.3')})`;

/** 연결되지 않은 아이콘 버튼(+·마이크) — 원본은 aria-disabled + 흐린 표시 */
const iconButtonDisabledStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: ICON_BUTTON_SIZE,
  height: ICON_BUTTON_SIZE,
  padding: 0,
  border: 'none',
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.transparent'),
  color: cssVar('color.text.disabled'),
  cursor: 'not-allowed',
};

/** 모드 선택 트리거 — 원본은 테두리 없는 글자 + 작은 꺾쇠(닫힌 상태) */
const modeTriggerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexShrink: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  border: 'none',
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.transparent'),
  color: cssVar('color.text.muted'),
  fontFamily: cssVar('typography.label.sm.font-family'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

/** 보내기 — 채워진 원형(활성이면 text-default 배경). 원본 sendButtonStyle */
function sendButtonStyle(enabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    padding: 0,
    border: 'none',
    borderRadius: cssVar('radius.full'),
    background: enabled ? cssVar('color.text.default') : cssVar('color.surface.disabled'),
    color: enabled ? cssVar('color.surface.default') : cssVar('color.text.disabled'),
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

/* @ 멘션 자동완성 목록 — 원본 Composer 의 listbox(입력 위로 띄운다) */

const listboxStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: `calc(100% + ${cssVar('space.2')})`,
  zIndex: 2,
  maxHeight: `calc(${cssVar('space.10')} * 4)`,
  overflowY: 'auto',
  margin: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  border: `thin solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  listStyle: 'none',
};

function optionStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'baseline',
    gap: cssVar('space.2'),
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    background: active ? cssVar('color.surface.raised') : cssVar('color.transparent'),
    color: cssVar('color.text.default'),
    cursor: 'pointer',
  };
}

const optionMetaStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 렌더 조각 ─────────────────────────────────────────────────────────────────────────────── */

function renderFollowUps(
  followUps: readonly { readonly label: string; readonly query: string }[],
): ReactNode {
  return (
    <ul style={followUpListStyle}>
      {followUps.map((followUp) => (
        <li key={followUp.query}>
          <button type="button" style={followUpStyle}>
            {`↳ ${followUp.label}`}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** 좌 레일 — 검색 · 새 채팅 · 기록(오늘/이전) */
function ConversationRail({ loading = false }: { readonly loading?: boolean }) {
  const today = DEMO_HISTORY.filter((conversation) => conversation.today);
  const earlier = DEMO_HISTORY.filter((conversation) => !conversation.today);

  const renderGroup = (title: string, items: readonly DemoConversation[]): ReactNode =>
    items.length === 0 ? null : (
      <div>
        <h3 style={groupTitleStyle}>{title}</h3>
        <ul style={railListStyle}>
          {items.map((conversation) => {
            const active = conversation.id === ACTIVE_ID;
            return (
              <li key={conversation.id}>
                <span style={railItemStyle(active)} aria-current={active ? 'page' : undefined}>
                  {conversation.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <nav style={railStyle} aria-label="대화 기록">
      <SearchField value="" placeholder="검색" label="대화 검색" onChange={() => undefined} />

      <Button type="button" size="sm" variant="secondary">
        새 채팅
      </Button>

      {loading ? (
        <p style={thinkingStyle}>기록을 불러오는 중…</p>
      ) : (
        <>
          {renderGroup('오늘', today)}
          {renderGroup('이전', earlier)}
        </>
      )}
    </nav>
  );
}

/** 입력줄 알약 — +(연결 안 됨) · 입력 · 모드 · 마이크(연결 안 됨) · 보내기 */
function Composer({
  value,
  mentionOpen = false,
}: {
  readonly value: string;
  readonly mentionOpen?: boolean;
}) {
  const canSend = value.trim() !== '';
  return (
    <div style={composerStyle}>
      {mentionOpen ? (
        <ul role="listbox" aria-label="데이터 멘션 후보" style={listboxStyle}>
          {MENTION_CANDIDATES.map((candidate, index) => (
            <li
              key={candidate.alias}
              role="option"
              aria-selected={index === 0}
              style={optionStyle(index === 0)}
            >
              <span>{`@${candidate.alias}`}</span>
              <span style={optionMetaStyle}>{candidate.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* 첨부 — 연결되지 않았다(원본: aria-disabled + 사유) */}
      <button
        type="button"
        aria-label="내용 첨부"
        aria-disabled="true"
        title="내용 첨부 — 이 기능은 아직 연결되지 않았습니다."
        style={iconButtonDisabledStyle}
      >
        <Icon name="plus" />
      </button>

      <input
        type="text"
        role="combobox"
        aria-label="질문 입력"
        aria-expanded={mentionOpen}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="무엇을 알고 싶으세요?"
        defaultValue={value}
        style={composerInputStyle}
      />

      <span style={composerTrailingStyle}>
        {/* 응답 모드(ModePicker) — 이 템플릿은 닫힌 트리거만 비춘다 */}
        <button
          type="button"
          aria-label="응답 모드: 규칙 기반 조회"
          aria-haspopup="menu"
          aria-expanded={false}
          style={modeTriggerStyle}
        >
          <span>규칙 기반</span>
          <Icon name="chevron-down" size="sm" />
        </button>

        {/* 음성 입력 — 연결되지 않았다 */}
        <button
          type="button"
          aria-label="음성 입력"
          aria-disabled="true"
          title="음성 입력 — 이 기능은 아직 연결되지 않았습니다."
          style={iconButtonDisabledStyle}
        >
          <Icon name="mic" />
        </button>

        {/* 보내기 — 참조 디자인의 채워진 원형 자리. 이 자리만 실제로 동작한다 */}
        <button
          type="button"
          aria-label={canSend ? '보내기' : '보내기(보낼 내용 없음)'}
          disabled={!canSend}
          style={sendButtonStyle(canSend)}
        >
          <Icon name="send" />
        </button>
      </span>
    </div>
  );
}

/** 에이전트 결과 답변 — 통지(먼저) · 요약 · 조건 · 표 · 목록 링크 (원본 AnswerView 의 result) */
function ResultAnswer() {
  return (
    <div style={answerBlockStyle}>
      {/* 통지를 표보다 먼저 그린다 — 요청과 답이 다른 지점을 결과보다 앞서 읽힌다(원본) */}
      <Alert tone="warning">
        누적 구매액에는 기간 정보가 없어, 기간 조건은 가입일에 적용했습니다.
      </Alert>

      <p style={summaryStyle}>회원 목록 3건을 찾았습니다.</p>
      <p style={thinkingStyle}>조건 — 등급: VIP · 이번달 가입</p>

      <DataTable
        columns={ANSWER_COLUMNS}
        rows={ANSWER_ROWS}
        rowKey="nickname"
        caption="회원 목록 조회 결과 — 등급 VIP · 이번달 가입"
      />

      <p style={thinkingStyle}>
        <span style={listLinkStyle}>목록 화면에서 보기</span>
      </p>
    </div>
  );
}

/* ── 화면 조립 ─────────────────────────────────────────────────────────────────────────────── */

interface NewChatScreenProps {
  /** 열린 대화가 있는가(메시지 목록) 없는가(빈 프롬프트) */
  readonly hasConversation: boolean;
  /** 좌 레일·본문 최초 로딩 */
  readonly loading?: boolean;
  /** 열어 둔 대화가 삭제됨(원본 deletedWhileOpen/gone) */
  readonly gone?: boolean;
  /** 입력줄 초기값 */
  readonly draft?: string;
  /** @ 멘션 자동완성 목록 펼침 */
  readonly mentionOpen?: boolean;
}

function NewChatScreen({
  hasConversation,
  loading = false,
  gone = false,
  draft = '',
  mentionOpen = false,
}: NewChatScreenProps) {
  return (
    <div style={layoutStyle}>
      <ConversationRail loading={loading} />

      <section style={mainStyle} aria-label="대화">
        {gone ? (
          <div style={agentRowStyle}>
            <Alert tone="warning">이 대화는 삭제되었습니다. 새 채팅을 시작해 주세요.</Alert>
            <span>
              <Button type="button" size="sm" variant="secondary">
                새 채팅 시작
              </Button>
            </span>
          </div>
        ) : null}

        {/* 응답 상태 — 목록 바깥의 live 영역(원본: 과거 메시지 재낭독 방지) */}
        <p role="status" aria-live="polite" aria-label="응답 상태" style={visuallyHidden} />

        {loading ? <p style={thinkingStyle}>대화를 불러오는 중…</p> : null}

        {!loading && !hasConversation && !gone ? (
          <div style={emptyStateStyle}>
            <h2 style={headingStyle}>무엇을 조회할까요?</h2>
            <p style={thinkingStyle}>
              `@` 로 데이터를 지목하고 조건을 적어 주세요. 저장된 데이터를 조건으로 거르는 조회만
              합니다 — 요약·분석·예측은 하지 않습니다.
            </p>
            {renderFollowUps(STARTER_FOLLOW_UPS)}
          </div>
        ) : null}

        {!loading && hasConversation ? (
          <ul style={messageListStyle}>
            <li style={userRowStyle}>
              <div style={userBubbleStyle}>@회원목록 이번달 가입한 VIP 보여줘</div>
            </li>
            <li style={agentRowStyle}>
              <p style={thinkingStyle}>0.4초 동안 조회함</p>
              <ResultAnswer />
              {renderFollowUps(RESULT_FOLLOW_UPS)}
            </li>
          </ul>
        ) : null}

        <Composer value={draft} mentionOpen={mentionOpen} />
      </section>
    </div>
  );
}

/** 정상 — 열린 대화 1건(사용자 질문 + 에이전트 조회 결과 표) + 레일 기록 + 입력줄 */
export const Default: Story = {
  render: () => <NewChatScreen hasConversation />,
};

/** 새 채팅 — 열린 대화 없음. '무엇을 조회할까요?' 프롬프트 + 기본 제안(↳) + 입력줄 */
export const NewConversation: Story = {
  render: () => <NewChatScreen hasConversation={false} />,
};

/** @ 멘션 자동완성 — 입력줄에 '@' 를 쳐 도메인 후보 listbox 가 펼쳐진 상태 */
export const MentionAutocomplete: Story = {
  render: () => <NewChatScreen hasConversation={false} draft="@" mentionOpen />,
};

/** 최초 로딩 — 좌 레일 '기록 불러오는 중…' + 본문 '대화를 불러오는 중…' (원본 firstLoading) */
export const Loading: Story = {
  render: () => <NewChatScreen hasConversation loading />,
};

/** 삭제된 대화 열림 — 열어 둔 대화가 사라져 경고 배너 + '새 채팅 시작' (원본 deletedWhileOpen/gone) */
export const DeletedWhileOpen: Story = {
  render: () => <NewChatScreen hasConversation={false} gone />,
};
