// 좌측 레일 — 검색 · 새 채팅 · 기록(오늘 / 이전)
//
// [왜 날짜로 묶는가] 참조 디자인의 구성이자, 대화가 쌓였을 때 관리자가 찾는 축이 '언제 물었나'
// 이기 때문이다. 묶음은 두 개뿐이다 — 더 잘게 쪼개면(어제·이번주·지난달) 대화가 적을 때
// 머리글만 늘어선다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { Button, SearchField } from '../../../shared/ui';
import type { Conversation } from '../_shared/conversations';
import { cssVar } from '@tds/ui';

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

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const mutedStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/**
 * 이 시각이 오늘인가.
 *
 * 저장된 값은 UTC ISO 문자열이고 화면의 '오늘'은 **현지 날짜**다. 앞 10글자를 잘라 비교하면
 * 한국 시간 오전에 만든 대화가 전날(UTC)로 읽혀 '이전' 으로 묶인다 — 방금 한 대화가 어제 것이
 * 되어 버린다. 그래서 문자열이 아니라 Date 로 파싱해 현지 연·월·일을 비교한다.
 */
function isToday(iso: string, now: Date): boolean {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  return (
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()
  );
}

export interface ConversationRailProps {
  readonly conversations: readonly Conversation[];
  readonly activeId: string | null;
  readonly keyword: string;
  readonly onKeywordChange: (value: string) => void;
  readonly onNewChat: () => void;
  readonly loading: boolean;
  readonly failed: boolean;
}

export function ConversationRail({
  conversations,
  activeId,
  keyword,
  onKeywordChange,
  onNewChat,
  loading,
  failed,
}: ConversationRailProps) {
  const now = new Date();
  const trimmed = keyword.trim();
  const visible =
    trimmed === ''
      ? conversations
      : conversations.filter((conversation) => conversation.title.includes(trimmed));

  const today = visible.filter((conversation) => isToday(conversation.updatedAtIso, now));
  const earlier = visible.filter((conversation) => !isToday(conversation.updatedAtIso, now));

  const renderGroup = (title: string, items: readonly Conversation[]) =>
    items.length === 0 ? null : (
      <div>
        <h3 style={groupTitleStyle}>{title}</h3>
        <ul style={listStyle}>
          {items.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to={`/ai/chat?c=${conversation.id}`}
                className="tds-ai-railitem"
                aria-current={conversation.id === activeId ? 'page' : undefined}
              >
                {conversation.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <nav style={railStyle} aria-label="대화 기록">
      <SearchField
        value={keyword}
        onChange={onKeywordChange}
        placeholder="검색"
        label="대화 검색"
      />

      <Button type="button" size="sm" variant="secondary" onClick={onNewChat}>
        새 채팅
      </Button>

      {failed ? (
        <p style={mutedStyle}>기록을 불러오지 못했어요.</p>
      ) : loading ? (
        <p style={mutedStyle}>기록을 불러오는 중…</p>
      ) : visible.length === 0 ? (
        <p style={mutedStyle}>{trimmed === '' ? '아직 대화가 없어요.' : '검색 결과가 없어요.'}</p>
      ) : (
        <>
          {renderGroup('오늘', today)}
          {renderGroup('이전', earlier)}
        </>
      )}
    </nav>
  );
}
