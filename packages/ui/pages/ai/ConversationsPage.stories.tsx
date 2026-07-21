/**
 * Design System/Templates/AI Agent/Conversations — 대화 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/ai/conversations` → 메뉴 en = "AI Agent"(AI 에이전트), 화면 en =
 * "Conversations"(대화 목록) — packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인.
 *
 * 대응 실화면: apps/admin/src/pages/ai/ConversationsPage.tsx (라우트 /ai/conversations).
 *   구성(원본 순서 그대로): [우측 정렬 '새 채팅' 버튼] → 휘발성 안내 Alert(info) →
 *   [에러 Alert(danger) | 로딩 문구 | 빈 상태 Empty | 목록 Card] → 삭제 확인 ConfirmDialog.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   상단 안내 배너            → Alert(tone="info")
 *   조회 실패 배너            → Alert(tone="danger")
 *   '새 채팅' / 행 '삭제'      → Button(primary · ghost)
 *   목록 컨테이너             → Card + 토큰 레이아웃의 <ul>/<li> (원본도 Card 속 손표다)
 *   빈 결과                   → Empty(label="대화" · createVerb="시작" · action=Button)
 *   삭제 확인                 → ConfirmDialog(intent="delete")
 *
 * [원본에 있으나 여기서 갈음한 것] 제목 <h1> 은 실화면에서 AppHeader 가 nav 라벨로 그린다 —
 *   템플릿에는 셸이 없어 이 스토리는 본문만 비춘다. 행 제목/‘새 채팅’은 원본에서 react-router
 *   <Link> 지만, 레이어 경계상 라우터를 끌어오지 않고 링크 톤의 표면으로 대응한다(이동 없음).
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

// DS Empty 는 EmptyState 로 별칭 — 아래 'Empty' 스토리 export 와 이름이 겹치지 않게 한다
import { Alert, Button, Card, ConfirmDialog, Empty as EmptyState } from '../../src';
import { cssVar } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Design System/Templates/AI Agent/Conversations',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 화면 전체가 재현하는 상태 (원본 ConversationsPage 의 error/firstLoading/empty/list 분기) */
type ScreenState = 'default' | 'loading' | 'empty' | 'error';

/* ── 데모 데이터(실화면 _shared/conversations 의 Conversation 을 화면이 쓰는 필드만 축약) ───────── */

interface DemoConversation {
  readonly id: string;
  readonly title: string;
  readonly messageCount: number;
  readonly updatedAtIso: string;
}

const DEMO_CONVERSATIONS: readonly DemoConversation[] = [
  {
    id: 'CV-0007',
    title: '이번달 가입한 VIP 회원',
    messageCount: 4,
    updatedAtIso: '2026-07-21T09:12:00',
  },
  {
    id: 'CV-0006',
    title: '구매 이력이 있는 VVIP 회원',
    messageCount: 2,
    updatedAtIso: '2026-07-21T08:40:00',
  },
  {
    id: 'CV-0005',
    title: '처리중인 1:1 문의',
    messageCount: 6,
    updatedAtIso: '2026-07-20T17:03:00',
  },
  {
    id: 'CV-0004',
    title: '판매중인 상품 목록',
    messageCount: 2,
    updatedAtIso: '2026-07-19T11:26:00',
  },
];

/**
 * 갱신 시각을 현지 시각으로 — 원본 formatWhen 그대로(저장값은 UTC ISO, 화면은 현지).
 * 문자열을 자르지 않고 Date 로 파싱해 연·월·일·시·분을 조립한다.
 */
function formatWhen(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  const date = `${String(at.getFullYear())}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return `${date} ${time}`;
}

/* ── 스타일(토큰·rem 만 — 원본 각 style 객체를 그대로 옮긴다) ───────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderBottom: `thin solid ${cssVar('color.border.subtle')}`,
};

const titleCellStyle: CSSProperties = { flexGrow: 1, minWidth: 0 };

/** 제목 — 원본은 react-router <Link>. 라우터 없이 링크 톤만 옮긴다(이동 없음) */
const titleLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  cursor: 'pointer',
};

const mutedStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const spacerStyle: CSSProperties = { flexGrow: 1 };

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아닌 Capitalized 컴포넌트에서 useState) ────── */

interface ConversationsScreenProps {
  readonly state: ScreenState;
  /** 삭제 확인 다이얼로그를 열어 둔 채로 그리는 대화 id — 미지정이면 닫힘 */
  readonly initialConfirmingId?: string;
}

function ConversationsScreen({ state, initialConfirmingId }: ConversationsScreenProps) {
  const [confirming, setConfirming] = useState<string | null>(initialConfirmingId ?? null);

  const items = state === 'empty' ? [] : DEMO_CONVERSATIONS;

  return (
    <div style={pageStyle}>
      {/*
        제목(<h1>)은 여기서 그리지 않는다 — 실화면은 nav 잎이라 AppHeader 가 이미 h1 을 그린다.
        템플릿에는 셸이 없어 본문만 비춘다. 우측 정렬 '새 채팅' 버튼만 이 줄에 둔다.
      */}
      <div style={headerRowStyle}>
        <span style={spacerStyle} />
        <Button type="button" size="sm" variant="primary">
          새 채팅
        </Button>
      </div>

      <Alert tone="info">
        대화는 브라우저 메모리에만 있습니다 — 새로고침하면 사라집니다. 보관은 백엔드 연동 후
        가능합니다.
      </Alert>

      {state === 'error' ? (
        <Alert tone="danger">대화 목록을 불러오지 못했습니다.</Alert>
      ) : state === 'loading' ? (
        <p style={mutedStyle}>불러오는 중…</p>
      ) : items.length === 0 ? (
        <EmptyState
          label="대화"
          createVerb="시작"
          action={
            <Button type="button" size="sm" variant="primary">
              새 채팅 시작
            </Button>
          }
        />
      ) : (
        <Card>
          <ul style={listStyle}>
            {items.map((conversation) => (
              <li key={conversation.id} style={rowStyle}>
                <span style={titleCellStyle}>
                  <span style={titleLinkStyle}>{conversation.title}</span>
                </span>
                <span style={mutedStyle}>{`${String(conversation.messageCount)}개 메시지`}</span>
                <span style={mutedStyle}>{formatWhen(conversation.updatedAtIso)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setConfirming(conversation.id);
                  }}
                >
                  삭제
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 열려 있을 때만 렌더한다 — 이 다이얼로그에는 open 프롭이 없다(존재 = 열림) */}
      {confirming === null ? null : (
        <ConfirmDialog
          title="대화를 삭제할까요?"
          message="삭제한 대화는 되돌릴 수 없습니다."
          intent="delete"
          onConfirm={() => {
            setConfirming(null);
          }}
          onCancel={() => {
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}

/** 정상 — 최근 갱신 순 대화 목록 + 휘발성 안내 배너 (원본 성공 응답) */
export const Default: Story = {
  render: () => <ConversationsScreen state="default" />,
};

/** 최초 로드 — 목록 도착 전 '불러오는 중…' (원본 firstLoading) */
export const Loading: Story = {
  render: () => <ConversationsScreen state="loading" />,
};

/** 빈 상태 — 대화가 하나도 없음. Empty(시작 CTA)로 새 채팅으로 유도 (원본 items.length === 0) */
export const Empty: Story = {
  render: () => <ConversationsScreen state="empty" />,
};

/** 조회 실패 — 상단 안내는 남기고 목록 자리에 danger 배너 (원본 isError) */
export const Error: Story = {
  render: () => <ConversationsScreen state="error" />,
};

/** 삭제 확인 — 행 '삭제'를 눌러 ConfirmDialog(delete)가 목록 위에 뜬 상태 */
export const DeleteConfirm: Story = {
  render: () => <ConversationsScreen state="default" initialConfirmingId="CV-0005" />,
};
