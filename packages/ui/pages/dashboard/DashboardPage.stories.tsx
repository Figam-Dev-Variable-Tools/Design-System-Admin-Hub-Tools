/**
 * Design System/Templates/Dashboard/Dashboard Screen — 실제 어드민 /dashboard 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/dashboard/DashboardPage.tsx
 *   구성(원본 순서 그대로): 업무 탭(상품/문의/영업) → [에러 시 Alert] → 오늘의 할일 + 리스트 카드 2종 → 통계(방문자 차트 · 기간별 분석)
 *
 * 사용 DS 컴포넌트: Tabs · TodoCard · ListCard · Icon · StatsCard · SegmentedControl · LineAreaChart · DataTable · Alert
 * 재현 상태: Default(정상) · Loading(탭 데이터·통계 재조회 스켈레톤) · Empty(건수 0·행 0) · Error(상단 Alert danger + 카드 인라인 에러)
 *
 * [원본에 있으나 DS 대응이 없는 것] 원본 RowIcon 은 apps/admin 의 아이콘(BoxIcon 등)을 쓴다 —
 *   레이어 경계상 여기서 import 할 수 없어, DS `Icon` 의 동일 글리프(box·file-text·headset·briefcase)로 대응한다.
 *   원본 BarChartIcon(통계 제목) 도 같은 이유로 DS `Icon name="bar-chart"` 로 대응한다.
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  DataTable,
  Icon,
  LineAreaChart,
  ListCard,
  SegmentedControl,
  StatsCard,
  Tabs,
  TodoCard,
  tabId,
  tabPanelId,
  typography,
} from '../../src';
import type { IconName } from '../../src';
import { cssVar } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Design System/Templates/Dashboard/Dashboard Screen',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 화면 전체가 재현하는 상태 (원본 DashboardPage 의 loading/error 흐름 + 빈 응답) */
type ScreenState = 'default' | 'loading' | 'empty' | 'error';

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 사용 (원본 grid minmax 규약과 동일) */
const track = (multiple: number): string => `minmax(calc(${cssVar('space.6')} * ${multiple}), 1fr)`;

/* ── 도메인 타입 (원본 types.ts / stats-types.ts 의 표시용 축소본) ───────────── */

type TabId = 'products' | 'inquiries' | 'sales';
type StatsRange = 'day' | 'week' | 'month';
type CardIcon = 'order' | 'tag' | 'question' | 'contract';

interface DemoTodo {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly to: string;
}
interface DemoRow {
  readonly id: string;
  readonly title: string;
  readonly actor: string;
  readonly date: string;
}
interface DemoCard {
  readonly title: string;
  readonly count: number;
  readonly icon: CardIcon;
  readonly moreTo: string;
  readonly rows: readonly DemoRow[];
}
interface DemoTab {
  readonly todos: readonly DemoTodo[];
  readonly cards: readonly DemoCard[];
}

/** 원본 상단 탭 — 업무 영역 (types.ts TABS) */
const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'products', label: '상품' },
  { id: 'inquiries', label: '문의' },
  { id: 'sales', label: '영업' },
];

/** 원본 RowIcon 의 매핑을 DS Icon 글리프로 옮긴다 (BoxIcon→box 등) */
const ICON_NAME: Record<CardIcon, IconName> = {
  order: 'box',
  tag: 'file-text',
  question: 'headset',
  contract: 'briefcase',
};

/** 탭별 데모 데이터 (api.ts fixture 축소 — 대표 표본) */
const TAB_DATA: Record<TabId, DemoTab> = {
  products: {
    todos: [
      { key: 'new-order', label: '신규주문', count: 1, to: '/products' },
      { key: 'cancel', label: '취소관리', count: 0, to: '/products/returns' },
      { key: 'return', label: '반품관리', count: 0, to: '/products/returns' },
      { key: 'exchange', label: '교환관리', count: 0, to: '/products/returns' },
    ],
    cards: [
      {
        title: '최근 주문',
        count: 2,
        icon: 'order',
        moreTo: '/products',
        rows: [
          {
            id: 'o-1',
            title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
            actor: '테스***',
            date: '2026-07-10',
          },
          {
            id: 'o-2',
            title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
            actor: '테스***',
            date: '2026-07-07',
          },
        ],
      },
      {
        title: '판매 신청',
        count: 4,
        icon: 'tag',
        moreTo: '/products/categories',
        rows: [
          { id: 's-1', title: 'Pioneer DJ CDJ-3000', actor: '테스***', date: '2026-07-13' },
          {
            id: 's-2',
            title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
            actor: '테스***',
            date: '2026-07-09',
          },
          {
            id: 's-3',
            title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 블랙',
            actor: '테스***',
            date: '2026-07-06',
          },
        ],
      },
    ],
  },
  inquiries: {
    todos: [
      { key: 'new-inquiry', label: '신규문의', count: 3, to: '/support/tickets' },
      { key: 'awaiting-reply', label: '답변대기', count: 2, to: '/support/replies' },
      { key: 'on-hold', label: '보류문의', count: 0, to: '/support/tickets' },
    ],
    cards: [
      {
        title: '최근 문의',
        count: 3,
        icon: 'question',
        moreTo: '/support/tickets',
        rows: [
          {
            id: 'q-1',
            title: '헤드폰 케이블 단선 A/S 문의드립니다',
            actor: '김민***',
            date: '2026-07-14',
          },
          {
            id: 'q-2',
            title: 'CDJ-3000 재고 입고 일정 문의',
            actor: '이서***',
            date: '2026-07-13',
          },
          { id: 'q-3', title: '렌탈 기간 연장 가능한가요?', actor: '박지***', date: '2026-07-12' },
        ],
      },
      {
        title: '답변 대기',
        count: 2,
        icon: 'question',
        moreTo: '/support/replies',
        rows: [
          { id: 'w-1', title: '교환 신청 후 회수 일정 문의', actor: '최유***', date: '2026-07-11' },
          { id: 'w-2', title: '세금계산서 재발행 요청', actor: '정하***', date: '2026-07-09' },
        ],
      },
    ],
  },
  sales: {
    todos: [
      { key: 'new-lead', label: '신규문의', count: 2, to: '/sales/inquiries' },
      { key: 'new-contract', label: '신규계약', count: 1, to: '/sales/contracts' },
      { key: 'lead-waiting', label: '문의대기', count: 4, to: '/sales/inquiries' },
      { key: 'contract-waiting', label: '계약대기', count: 0, to: '/sales/contracts' },
    ],
    cards: [
      {
        title: '최근 문의',
        count: 2,
        icon: 'question',
        moreTo: '/sales/inquiries',
        rows: [
          {
            id: 'c-1',
            title: '스튜디오 음향 시공 견적 문의',
            actor: '한음***',
            date: '2026-07-14',
          },
          { id: 'c-2', title: '연습실 방음 공사 일정 협의', actor: '오준***', date: '2026-07-12' },
        ],
      },
      {
        title: '계약 대기',
        count: 1,
        icon: 'contract',
        moreTo: '/sales/contracts',
        rows: [
          {
            id: 'k-1',
            title: '메이플 스튜디오 — 음향 장비 납품 계약',
            actor: '한음***',
            date: '2026-07-13',
          },
        ],
      },
    ],
  },
};

/** 빈 응답 재현 — 할일 라벨은 남기고 건수 0, 리스트 카드는 행을 비운다 (api.ts toEmpty) */
function toEmptyTab(tab: DemoTab): DemoTab {
  return {
    todos: tab.todos.map((todo) => ({ ...todo, count: 0 })),
    cards: tab.cards.map((card) => ({ ...card, count: 0, rows: [] })),
  };
}

/* ── 통계 데모 데이터 (stats-api.ts fixture) ───────────────────────────────── */

interface VisitorPoint {
  readonly label: string;
  readonly visitors: number;
  readonly pageViews: number;
}

/** 기간 토글별 x축 라벨·표본 (일/주/월) */
const VISITOR_SERIES: Record<StatsRange, readonly VisitorPoint[]> = {
  day: [
    { label: '7.8', visitors: 18, pageViews: 62 },
    { label: '7.9', visitors: 8, pageViews: 430 },
    { label: '7.10', visitors: 17, pageViews: 210 },
    { label: '7.11', visitors: 1, pageViews: 6 },
    { label: '7.12', visitors: 7, pageViews: 24 },
    { label: '7.13', visitors: 8, pageViews: 72 },
    { label: '7.14', visitors: 9, pageViews: 18 },
  ],
  week: [
    { label: '6월 3주', visitors: 42, pageViews: 310 },
    { label: '6월 4주', visitors: 61, pageViews: 520 },
    { label: '7월 1주', visitors: 55, pageViews: 480 },
    { label: '7월 2주', visitors: 68, pageViews: 822 },
  ],
  month: [
    { label: '3월', visitors: 180, pageViews: 1240 },
    { label: '4월', visitors: 240, pageViews: 1810 },
    { label: '5월', visitors: 205, pageViews: 1520 },
    { label: '6월', visitors: 260, pageViews: 2100 },
    { label: '7월', visitors: 80, pageViews: 940 },
  ],
};

const STATS_RANGE_OPTIONS: readonly { id: StatsRange; label: string }[] = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
];

/**
 * 기간별 분석 표 — 원본 StatsSection.PERIOD_COLUMNS 그대로.
 * 매출액만 본문 행에도 단위('원')를 붙인다 (unitInBody).
 */
const PERIOD_COLUMNS = [
  { key: 'period', label: '일자', align: 'left' },
  { key: 'orders', label: '주문수', unit: '건' },
  { key: 'revenue', label: '매출액', unit: '원', unitInBody: true },
  { key: 'visitors', label: '방문자', unit: '명' },
  { key: 'signups', label: '가입', unit: '명' },
  { key: 'inquiries', label: '문의' },
  { key: 'reviews', label: '후기' },
] as const;

const PERIOD_ROWS: readonly Record<string, string | number>[] = [
  {
    period: '2026-07-14',
    orders: 0,
    revenue: 0,
    visitors: 9,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '2026-07-13',
    orders: 0,
    revenue: 0,
    visitors: 8,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '2026-07-12',
    orders: 0,
    revenue: 0,
    visitors: 7,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '2026-07-11',
    orders: 0,
    revenue: 0,
    visitors: 1,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '2026-07-10',
    orders: 1,
    revenue: 1,
    visitors: 17,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '2026-07-09',
    orders: 1,
    revenue: 150003,
    visitors: 8,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '2026-07-08',
    orders: 0,
    revenue: 0,
    visitors: 18,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
];

const PERIOD_SUMMARIES: readonly Record<string, string | number>[] = [
  {
    period: '최근 7일 합계',
    orders: 2,
    revenue: 150004,
    visitors: 68,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    period: '이번달 합계',
    orders: 12,
    revenue: 600022,
    visitors: 80,
    signups: 4,
    inquiries: 3,
    reviews: 2,
  },
];

/* ── 스타일 (원본 각 컴포넌트의 토큰 스타일을 그대로 옮긴다) ─────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

/** 리스트 카드 2장 그리드 (DashboardTabPanel.cardsGridStyle) */
const cardsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, ${track(16)})`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

/** 통계 섹션 그리드 (StatsSection.gridStyle) */
const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, ${track(18)})`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const statsSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/** 통계 제목 — 원본 sectionTitleStyle: 액션 프라이머리 색 + label.md 위 medium 굵기 */
const statsTitleStyle: CSSProperties = {
  ...typography('typography.label.md'),
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  margin: 0,
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

/** 리스트 행 아이콘 래퍼 — DS Icon 은 currentColor 를 따르므로 여기서 액션 색을 준다 (원본 RowIcon.iconStyle) */
const iconWrapStyle: CSSProperties = {
  display: 'inline-flex',
  flexShrink: 0,
  color: cssVar('color.action.primary.default'),
};

/** 카드 행의 메타 — 원본 DashboardTabPanel: `${actor} · ${date}` */
function metaOf(row: DemoRow): string {
  return `${row.actor} · ${row.date}`;
}

/**
 * 대시보드 화면 조립 — 활성 탭과 통계 기간은 controlled(useState)로,
 * Decorator 화살표가 아니라 이 Capitalized 컴포넌트 안에서 다룬다 (rules-of-hooks).
 */
function DashboardScreen({ state }: { state: ScreenState }) {
  const [activeTab, setActiveTab] = useState<TabId>('products');
  const [range, setRange] = useState<StatsRange>('day');

  const loading = state === 'loading';
  const failed = state === 'error';
  const isEmpty = state === 'empty';

  // Tabs 는 도메인을 모른다 — onChange 의 string 을 보이는 목록에서 되찾아 좁힌다 (원본 handleTabChange)
  const handleTabChange = (id: string) => {
    const next = TABS.find((tab) => tab.id === id);
    if (next !== undefined) setActiveTab(next.id);
  };
  const handleRangeChange = (id: string) => {
    const next = STATS_RANGE_OPTIONS.find((option) => option.id === id);
    if (next !== undefined) setRange(next.id);
  };

  const rawTab = TAB_DATA[activeTab];
  const tab = isEmpty ? toEmptyTab(rawTab) : rawTab;

  // 방문자 차트 — 면적(페이지뷰)이 먼저다: 나중에 그리는 선(방문자)이 위로 올라와 가려지지 않는다 (원본 chart useMemo)
  const points = isEmpty ? [] : VISITOR_SERIES[range];
  const chartLabels = points.map((point) => point.label);
  const chartMax = points.reduce((max, point) => Math.max(max, point.visitors, point.pageViews), 0);
  const chartSeries = [
    {
      id: 'pageViews',
      label: '페이지뷰',
      kind: 'area' as const,
      values: points.map((p) => p.pageViews),
    },
    {
      id: 'visitors',
      label: '방문자',
      kind: 'line' as const,
      values: points.map((p) => p.visitors),
    },
  ];

  const periodRows = isEmpty ? [] : PERIOD_ROWS;
  const periodSummaries = isEmpty ? [] : PERIOD_SUMMARIES;

  // 기간 토글 — 로딩 중에도 떠 있는 채 비활성된다 (원본: StatsCard 액션 슬롯을 언마운트하지 않는다)
  const rangeToggle = (
    <SegmentedControl
      value={range}
      options={STATS_RANGE_OPTIONS}
      ariaLabel="조회 기간"
      disabled={loading}
      onChange={handleRangeChange}
    />
  );

  return (
    <div style={pageStyle}>
      {/* 업무 영역 탭 (FS-002-EL-012 · EL-013) */}
      <Tabs value={activeTab} items={TABS} ariaLabel="업무 영역" onChange={handleTabChange} />

      {/* 탭 데이터 조회 실패 — 상단 배너, 아래 패널은 감춘다 (원본 error !== null) */}
      {failed && (
        <Alert tone="danger">
          대시보드 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </Alert>
      )}

      {/* 탭 패널 — 오늘의 할일 + 리스트 카드 2장. id 규약은 Tabs 가 공개한다 */}
      {!failed && (
        <div
          id={tabPanelId(activeTab)}
          role="tabpanel"
          aria-labelledby={tabId(activeTab)}
          style={panelStyle}
        >
          <TodoCard
            items={tab.todos.map((todo) => ({
              key: todo.key,
              label: todo.label,
              count: todo.count,
              href: todo.to,
            }))}
            loading={loading}
            onItemClick={({ event }) => {
              // 스토리 안에서는 실제 이동 대신 좌클릭만 가로챈다 (원본 useSpaLink 의 축소)
              event.preventDefault();
            }}
          />

          <div style={cardsGridStyle}>
            {tab.cards.map((card) => (
              <ListCard
                key={card.title}
                title={card.title}
                count={card.count}
                icon={
                  <span style={iconWrapStyle}>
                    <Icon name={ICON_NAME[card.icon]} />
                  </span>
                }
                loading={loading}
                rows={card.rows.map((row) => ({
                  id: row.id,
                  title: row.title,
                  meta: metaOf(row),
                  href: card.moreTo,
                }))}
                onRowClick={({ event }) => {
                  event.preventDefault();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 통계 — 방문자 차트 카드 + 기간별 분석 카드 (두 카드는 서로 독립) */}
      <section style={statsSectionStyle} aria-labelledby="dashboard-stats-title">
        <h2 id="dashboard-stats-title" style={statsTitleStyle}>
          <Icon name="bar-chart" />
          통계
        </h2>

        <div style={statsGridStyle}>
          <StatsCard
            title="방문자"
            action={rangeToggle}
            loading={loading}
            error={failed ? '방문자 통계를 불러오지 못했어요.' : ''}
          >
            <LineAreaChart
              series={chartSeries}
              labels={chartLabels}
              ariaLabel={`기간별 방문자 및 페이지뷰 추이 — 최대 ${String(chartMax)}`}
            />
          </StatsCard>

          <StatsCard
            title="기간별 분석"
            loading={loading}
            error={failed ? '기간별 분석을 불러오지 못했어요.' : ''}
          >
            <DataTable
              columns={PERIOD_COLUMNS}
              rows={periodRows}
              summaryRows={periodSummaries}
              rowKey="period"
              caption="일자별 주문수 · 매출액 · 방문자 · 가입 · 문의 · 후기와 기간 합계"
            />
          </StatsCard>
        </div>
      </section>
    </div>
  );
}

/** 정상 — 탭·할일·리스트 카드 + 통계 차트·표 (원본 성공 응답) */
export const Default: Story = {
  render: () => <DashboardScreen state="default" />,
};

/** 로딩 — 탭 데이터·통계 재조회 중. TodoCard/ListCard/StatsCard 모두 스켈레톤, 기간 토글은 떠 있는 채 비활성 */
export const Loading: Story = {
  render: () => <DashboardScreen state="loading" />,
};

/** 빈 상태 — 할일 건수 0 · 리스트/표 행 0 (원본 empty=1 응답) */
export const Empty: Story = {
  render: () => <DashboardScreen state="empty" />,
};

/** 에러 — 상단 Alert(danger)로 탭 데이터 실패를 알리고 패널을 감춘다 + 통계 카드는 인라인 에러 (원본 error 흐름) */
export const Error: Story = {
  render: () => <DashboardScreen state="error" />,
};
