// 탭 패널 — 오늘의 할일 + 리스트 카드 2장 (A41 소유)
//
// 탭바가 가리키는 패널이다 (aria-labelledby ↔ aria-controls). 어떤 위젯이 보이는지는 권한이 정하고,
// 그 판정은 DashboardPage 가 내려 준다 — 이 컴포넌트는 받은 것만 렌더한다.
//
// [카드는 @tds/ui 가 소유한다] ListCard · TodoCard 는 디자인 시스템 모듈이다. 여기 남은 것은
// 도메인 → 데이터 prop 변환과 **SPA 내비게이션**뿐이다 (아래 useSpaLink 참조).
import { useCallback } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { ListCard, TodoCard, tabId, tabPanelId } from '@tds/ui';
import { useNavigate } from 'react-router-dom';

import { RowIcon } from './RowIcon';
import type { TabData, TabId } from '../types';

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const cardsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 16), 1fr))',
  gap: 'var(--tds-space-4)',
  alignItems: 'start',
};

/** 최초 조회 중 카드 자리를 미리 잡는 빈 카드 — 레이아웃이 튀지 않게 한다 (FS-002-EL-026) */
const SKELETON_CARD = {
  title: '',
  count: 0,
  moreTo: '/dashboard',
  icon: 'order',
  rows: [],
} as const;

/**
 * href 를 살린 채 SPA 로 이동하는 클릭 핸들러.
 *
 * **href 를 지우면 안 된다** — 지우면 카드 행이 <button> 이 되어 새 탭(⌘/Ctrl+클릭)·가운데 클릭·
 * 링크 미리보기·"새 탭에서 열기" 가 전부 죽는다.
 * **preventDefault 를 빼도 안 된다** — 빼면 브라우저가 진짜 내비게이션을 해서 **전체 새로고침**이 된다.
 *
 * 그래서 정확히 이렇게 한다: 평범한 좌클릭만 가로채고(preventDefault → navigate), 수식키·가운데 클릭은
 * **손대지 않고 브라우저에 맡긴다.** 이 조합이 가능하도록 계약 2.0.0 이 콜백에 MouseEvent 를 넘긴다.
 */
function useSpaLink(): (to: string, event: MouseEvent) => void {
  const navigate = useNavigate();

  return useCallback(
    (to: string, event: MouseEvent) => {
      // 새 탭/새 창을 의도한 클릭은 브라우저의 것이다 — 가로채지 않는다
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      event.preventDefault();
      navigate(to);
    },
    [navigate],
  );
}

interface DashboardTabPanelProps {
  readonly activeTab: TabId;
  readonly data: TabData | undefined;
  readonly loading: boolean;
  readonly showTodo: boolean;
  readonly showLists: boolean;
}

export function DashboardTabPanel({
  activeTab,
  data,
  loading,
  showTodo,
  showLists,
}: DashboardTabPanelProps) {
  const followLink = useSpaLink();

  const todos = data?.todos ?? [];
  const cards = data?.cards ?? [];

  // 로딩 중에는 자리표시 카드 2장을 미리 렌더해 레이아웃 높이를 지킨다
  const listCards = data === undefined && loading ? [SKELETON_CARD, SKELETON_CARD] : cards;

  return (
    // id 규약은 @tds/ui Tabs 가 공개한다 — 탭의 aria-controls 와 이 패널의 id 가 같은 함수에서 나온다
    <div
      id={tabPanelId(activeTab)}
      role="tabpanel"
      aria-labelledby={tabId(activeTab)}
      style={panelStyle}
    >
      {showTodo && (
        <TodoCard
          items={todos.map((todo) => ({
            key: todo.key,
            label: todo.label,
            count: todo.count,
            href: todo.to,
          }))}
          loading={loading}
          onItemClick={({ key, event }) => {
            const todo = todos.find((item) => item.key === key);
            if (todo !== undefined) followLink(todo.to, event);
          }}
        />
      )}

      {showLists && (
        <div style={cardsGridStyle}>
          {listCards.map((card, index) => (
            <ListCard
              key={card.title === '' ? `skeleton-${String(index)}` : card.title}
              title={card.title}
              count={card.count}
              icon={<RowIcon name={card.icon} />}
              loading={loading}
              // 카드의 모든 행은 같은 '더 보기' 목적지로 간다 (도메인 규칙 — 카드가 아니라 여기가 안다)
              rows={card.rows.map((row) => ({
                id: row.id,
                title: row.title,
                meta: `${row.actor} · ${row.date}`,
                href: card.moreTo,
              }))}
              onRowClick={({ event }) => {
                followLink(card.moreTo, event);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
