/**
 * Design System/Templates/Dashboard/Dashboard Screen — 실제 DS 조립 스토리 (조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * `../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 대응 화면정의서: docs/plan/ui/SCR-002-dashboard.md
 *
 * 사용 DS 컴포넌트: SelectField · StatsCard · StatusBadge · Table · Pagination · Empty · Alert · Button · Skeleton
 * 재현 상태 (SCR-002 §3 최근 활동 목록 + §3.1/§3.2 보충):
 *   Default(정상) · Loading(KPI/표 로딩) · Empty(표 빈 상태) · Error(표 위 Alert danger)
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Empty as EmptyResult,
  Pagination,
  SelectField,
  StatsCard,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Dashboard/Dashboard Screen',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 사용 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

/** 화면이 재현하는 최근 활동 목록의 상태 (SCR-002 §3) */
type ListState = 'default' | 'loading' | 'empty' | 'error';

/** 기간 필터 옵션 (SCR-002 §3 필터: 오늘 / 최근 7일 / 최근 30일, 기본값 최근 7일) */
const PERIOD_OPTIONS = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
] as const;

const PAGE_SIZE = 10;

/** KPI 스탯 4종 (SCR-002 §3.1) — 값·증감은 호출부가 포맷 끝낸 문자열/tone 으로 넘긴다 */
type Kpi = {
  title: string;
  value: string;
  deltaLabel: string;
  deltaTone: 'success' | 'danger' | 'neutral';
};

const KPIS: readonly Kpi[] = [
  { title: '주문 수', value: '1,284', deltaLabel: '+12.5%', deltaTone: 'success' },
  { title: '매출액', value: '3.2억 원', deltaLabel: '+8.1%', deltaTone: 'success' },
  { title: '신규 가입', value: '342', deltaLabel: '-3.4%', deltaTone: 'danger' },
  { title: '미처리 문의', value: '17', deltaLabel: '변동 없음', deltaTone: 'neutral' },
];

/** 최근 활동 행 (SCR-002 §3 컬럼: 발생 시각 · 행위자 · 활동 유형 · 대상 · 요약) */
type Activity = {
  id: string;
  time: string;
  actor: string;
  typeLabel: string;
  typeTone: 'info' | 'success' | 'warning' | 'danger';
  target: string;
  summary: string;
  rowTone?: 'danger' | 'warning' | 'success' | 'info';
};

const ACTIVITIES: readonly Activity[] = [
  {
    id: 'a1',
    time: '2026-07-21 14:32',
    actor: '김운영',
    typeLabel: '주문',
    typeTone: 'info',
    target: '주문 #10293',
    summary: '신규 주문 접수',
  },
  {
    id: 'a2',
    time: '2026-07-21 13:05',
    actor: '이관리',
    typeLabel: '가입',
    typeTone: 'success',
    target: 'member@example.com',
    summary: '신규 회원 가입',
  },
  {
    id: 'a3',
    time: '2026-07-21 11:48',
    actor: '시스템',
    typeLabel: '문의',
    typeTone: 'warning',
    target: '문의 #558',
    summary: '미처리 문의 접수',
  },
  {
    id: 'a4',
    time: '2026-07-21 09:12',
    actor: '박뷰어',
    typeLabel: '경고',
    typeTone: 'danger',
    target: '관리자 콘솔',
    summary: '로그인 실패 3회 연속',
    rowTone: 'danger',
  },
];

const ACTIVITY_COLUMNS = [
  { id: 'time', header: '발생 시각', nowrap: true },
  { id: 'actor', header: '행위자' },
  { id: 'type', header: '활동 유형' },
  { id: 'target', header: '대상' },
  { id: 'summary', header: '요약' },
] as const;

function activityRows(items: readonly Activity[]) {
  return items.map((it) => ({
    id: it.id,
    // tone 은 값이 있을 때만 포함한다 (exactOptionalPropertyTypes: undefined 를 넣지 않는다)
    ...(it.rowTone ? { tone: it.rowTone } : {}),
    cells: [
      it.time,
      it.actor,
      <StatusBadge key="type" tone={it.typeTone} label={it.typeLabel} />,
      it.target,
      it.summary,
    ] as ReactNode[],
  }));
}

/** 카드/패널 공통 표면 스타일 (토큰만) */
const surfacePanel: CSSProperties = {
  border: `thin solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

/** 차트 영역 — SCR-002 §3.2: 본 릴리스는 플레이스홀더 패널 고정 (데이터 요청 없음) */
function ChartPlaceholder() {
  return (
    <section
      aria-label="지표 추이 차트"
      style={{
        ...surfacePanel,
        display: 'grid',
        placeItems: 'center',
        minBlockSize: size(6),
        padding: cssVar('space.5'),
        textAlign: 'center',
      }}
    >
      <p
        style={{
          ...typography('typography.label.md'),
          margin: 0,
          color: cssVar('color.text.muted'),
        }}
      >
        지표 추이 차트 — 준비 중
      </p>
    </section>
  );
}

/**
 * 대시보드 화면 조립 — 기간 필터 값과 페이지 번호는 controlled(useState)로,
 * Decorator 화살표가 아니라 이 Capitalized 컴포넌트 안에서 다룬다 (rules-of-hooks).
 */
function DashboardScreen({ listState }: { listState: ListState }) {
  const [period, setPeriod] = useState<string>('7d');
  const [page, setPage] = useState<number>(1);

  const loading = listState === 'loading';

  return (
    <div
      style={{
        display: 'grid',
        gap: cssVar('space.5'),
        padding: cssVar('space.6'),
        minBlockSize: size(20),
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
      }}
    >
      {/* 헤더 — 화면 제목 + 기간 필터 (SCR-002 §3) */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: cssVar('space.4'),
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ ...typography('typography.title.md'), margin: 0 }}>대시보드</h1>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: cssVar('space.2') }}>
          <span style={{ ...typography('typography.label.md'), color: cssVar('color.text.muted') }}>
            기간
          </span>
          <SelectField
            aria-label="기간 필터"
            value={period}
            disabled={loading}
            onChange={(e) => {
              setPeriod(e.currentTarget.value);
              setPage(1);
            }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
        </label>
      </header>

      {/* KPI 스탯 카드 4종 — SCR-002 §3.1 (카드 단위 독립 상태). auto-fit 그리드, gap 은 토큰 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${size(3.5)}, 1fr))`,
          gap: cssVar('space.4'),
        }}
      >
        {KPIS.map((kpi) => (
          <StatsCard key={kpi.title} title={kpi.title} value={kpi.value} loading={loading}>
            <StatusBadge tone={kpi.deltaTone} label={kpi.deltaLabel} />
          </StatsCard>
        ))}
      </div>

      {/* 차트 영역 — SCR-002 §3.2 플레이스홀더 */}
      <ChartPlaceholder />

      {/* 최근 활동 — SCR-002 §3 목록. 에러는 표 영역만 인라인 Alert (전체 화면 에러로 확대 금지) */}
      <section aria-label="최근 활동" style={{ display: 'grid', gap: cssVar('space.4') }}>
        <h2 style={{ ...typography('typography.title.md'), margin: 0 }}>최근 활동</h2>

        {listState === 'error' ? (
          <Alert tone="danger">
            <div style={{ display: 'grid', gap: cssVar('space.2'), justifyItems: 'start' }}>
              <span>활동 내역을 불러오지 못했습니다.</span>
              <Button variant="secondary" size="sm">
                다시 시도
              </Button>
            </div>
          </Alert>
        ) : (
          <>
            <div style={{ ...surfacePanel, overflowX: 'auto' }}>
              <Table
                caption="최근 활동 목록 — 발생 시각 내림차순, 페이지당 10건"
                columns={ACTIVITY_COLUMNS}
                rows={listState === 'default' ? activityRows(ACTIVITIES) : []}
                loading={loading}
                skeletonRows={PAGE_SIZE}
                empty={
                  <EmptyResult
                    label="활동"
                    hasActiveFilters
                    onResetFilters={() => {
                      setPeriod('7d');
                      setPage(1);
                    }}
                  />
                }
              />
            </div>

            {listState === 'default' ? (
              <Pagination
                page={page}
                totalPages={5}
                total={42}
                pageSize={PAGE_SIZE}
                label="최근 활동 목록 페이지"
                onChange={setPage}
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

/** 정상 — KPI + 표 데이터 + 페이지네이션 (SCR-002 §3 목록-정상) */
export const Default: Story = {
  render: () => <DashboardScreen listState="default" />,
};

/** 로딩 — StatsCard loading + Table 스켈레톤 (SCR-002 §3 목록-로딩, §3.1 카드 로딩) */
export const Loading: Story = {
  render: () => <DashboardScreen listState="loading" />,
};

/** 빈 상태 — 표가 비어 Empty 안내 (SCR-002 §3 목록-빈 상태: 선택 기간 내 0건) */
export const Empty: Story = {
  render: () => <DashboardScreen listState="empty" />,
};

/** 에러 — 표 위 Alert(danger) + [다시 시도] (SCR-002 §3 목록-에러: 표 영역만 인라인 에러) */
export const Error: Story = {
  render: () => <DashboardScreen listState="error" />,
};
