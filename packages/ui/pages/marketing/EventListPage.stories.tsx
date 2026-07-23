/**
 * Design System/Templates/Marketing/Events — 이벤트 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/marketing/events` → 메뉴 en = "Marketing"(마케팅 관리), 화면 en =
 * "Events" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Marketing 그룹의
 * `['/marketing/events', '이벤트', 'Events']`).
 *
 * 대응 실화면: apps/admin/src/pages/marketing/events/EventListPage.tsx (라우트 /marketing/events).
 * 이벤트는 **삭제 가능 CRUD 목록**이라 선택 체크박스 + 순번 + 행 액션(수정 연필·삭제 휴지통) + 일괄
 * 삭제 바를 갖는다. 실화면은 shared/crud 의 CrudListShell → CrudTable → DS Table 로 조립되고,
 * 조회 조건(phase·keyword)의 단일 원천은 URL 쿼리스트링(useListState · IA-13)이다. 목록엔 이미지
 * 열이 없다 — 배너 연동은 폼에서 다룬다.
 *
 * [상태 열이 배지 두 개인 이유] 관리자가 손으로 고른 phase 와 기간에서 파생한 phase 가 어긋날 수
 * 있다. 어긋나면 '기간상 XX' 힌트 배지를 덧붙여 알린다(_shared/campaign 의 derivePhase 미러) —
 * 종료일이 지난 이벤트가 '진행' 으로 남아 있는 것을 목록에서 바로 본다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·
 *   RowActions·SelectionBar·tableSelectionState)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   상단 라이브 리전(A11Y-16)    → 토큰만 쓴 visually-hidden div(aria-live=polite)
 *   이벤트명·대상 검색           → SearchField
 *   상태 필터                   → SelectField
 *   등록 CTA(canCreate 게이팅)   → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸     → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                     → SeqHeaderCell · SeqCell
 *   요약 줄('전체 N건 · N건 선택됨') → 토큰만 쓴 <p>
 *   상태 배지 · 기간상 힌트 배지   → StatusBadge ×2
 *   행 액션(수정·삭제)           → RowActions (연필 → 폼, 휴지통 → 삭제 확인)
 *   선택 일괄 삭제 바            → SelectionBar + Button(danger)
 *   삭제 확인                   → ConfirmDialog(intent=delete)
 *   목록 표(데이터 5열)          → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                     → Empty (검색 지우기 / 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·em 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Events',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수 · 순수 규칙(실화면 events/types.ts · _shared/campaign.ts 미러) ─────────────────── */

type CampaignPhase = 'upcoming' | 'ongoing' | 'ended';
type BenefitType = 'none' | 'coupon' | 'points';

const CAMPAIGN_PHASE_OPTIONS: readonly { readonly id: CampaignPhase; readonly label: string }[] = [
  { id: 'upcoming', label: '예정' },
  { id: 'ongoing', label: '진행' },
  { id: 'ended', label: '종료' },
];

interface PhaseMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/** 상태 → 라벨·톤(키 접근 안전) — 실화면 campaignPhaseLabel · campaignPhaseTone 미러 */
const PHASE_META: Record<CampaignPhase, PhaseMeta> = {
  upcoming: { label: '예정', tone: 'info' },
  ongoing: { label: '진행', tone: 'success' },
  ended: { label: '종료', tone: 'neutral' },
};

const BENEFIT_TYPE_LABEL: Record<BenefitType, string> = {
  none: '혜택 없음',
  coupon: '쿠폰 발급',
  points: '적립금 지급',
};

/** 기간에서 파생한 상태 — 지정 상태와 어긋나면 '기간상 XX' 힌트를 붙인다(derivePhase 미러) */
function derivePhase(startAt: string, endAt: string, today: string): CampaignPhase {
  if (startAt !== '' && today < startAt) return 'upcoming';
  if (endAt !== '' && today > endAt) return 'ended';
  return 'ongoing';
}

const EVENT_FILTER_ALL = 'all';
type EventPhaseFilter = typeof EVENT_FILTER_ALL | CampaignPhase;

/** 오늘 — 실화면은 formatDate(new Date()). 템플릿은 스냅샷이 흔들리지 않게 고정한다 */
const TODAY = '2026-07-21';

/* ── 데모 데이터(실화면 MarketingEvent 를 목록이 쓰는 필드만 축약해 흉내) ─────────────────────── */

interface DemoEvent {
  readonly id: string;
  readonly title: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly phase: CampaignPhase;
  readonly target: string;
  readonly benefitType: BenefitType;
  readonly benefitDetail: string;
}

/** 시작일 내림차순 — 실화면 sortEvents 가 이미 정렬해 넘긴다 */
const DEMO_EVENTS: readonly DemoEvent[] = [
  {
    id: 'ev-5',
    title: '신규가입 웰컴 이벤트',
    startAt: '2026-09-01',
    endAt: '2026-09-30',
    phase: 'upcoming',
    target: '신규 가입 회원',
    benefitType: 'coupon',
    benefitDetail: '가입 즉시 15% 할인쿠폰',
  },
  {
    id: 'ev-2',
    title: '가을 신상품 출시 사전알림',
    startAt: '2026-08-15',
    endAt: '2026-08-31',
    phase: 'upcoming',
    target: '뉴스레터 구독자',
    benefitType: 'coupon',
    benefitDetail: '사전알림 신청 시 10% 할인쿠폰',
  },
  {
    id: 'ev-1',
    title: '여름맞이 리뷰 이벤트',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    phase: 'ongoing',
    target: '전체 회원',
    benefitType: 'points',
    benefitDetail: '리뷰 작성 시 3,000 적립금',
  },
  {
    id: 'ev-4',
    title: '가정의달 감사 이벤트',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    phase: 'ongoing',
    target: 'VIP 등급',
    benefitType: 'points',
    benefitDetail: '구매금액 5% 추가 적립',
  },
  {
    id: 'ev-3',
    title: '봄맞이 감사제',
    startAt: '2026-03-01',
    endAt: '2026-03-31',
    phase: 'ended',
    target: '전체 회원',
    benefitType: 'none',
    benefitDetail: '',
  },
];

/** 혜택 표기 — '혜택 없음' 은 상세를 붙이지 않는다(실화면 benefitText 미러) */
function benefitText(item: DemoEvent): string {
  const label = BENEFIT_TYPE_LABEL[item.benefitType];
  if (item.benefitType === 'none') return label;
  return `${label} · ${item.benefitDetail}`;
}

/* ── 표 열 정의(데이터 5열 — 선택·순번은 leadingHead, 액션은 trailingHead 로 별도) ─────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '이벤트명' },
  { id: 'period', header: '기간', nowrap: true },
  { id: 'target', header: '대상' },
  { id: 'benefit', header: '혜택' },
  { id: 'phase', header: '상태', nowrap: true },
];

const ENTITY_LABEL = '이벤트';
const SELECT_ALL_LABEL_ID = 'marketing-events-select-all';
const PAGE_SIZE = 10;

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const actionCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface EventListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 상태 필터 초기값 — 실화면은 URL ?phase=… 가 소유한다(IA-13) */
  readonly initialFilter?: EventPhaseFilter;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 → SelectionBar 노출 */
  readonly initialSelectedIds?: readonly string[];
}

function EventListScreen({
  loading = false,
  initialKeyword = '',
  initialFilter = EVENT_FILTER_ALL,
  initialSelectedIds = [],
}: EventListScreenProps) {
  const [events, setEvents] = useState<readonly DemoEvent[]>(DEMO_EVENTS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<EventPhaseFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoEvent | null>(null);

  // 상태 필터 + 이벤트명/대상 키워드 — 실화면 filterEvents/searchEvents 미러
  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return events.filter((item) => {
      if (filter !== EVENT_FILTER_ALL && item.phase !== filter) return false;
      if (needle === '') return true;
      return (
        item.title.toLowerCase().includes(needle) || item.target.toLowerCase().includes(needle)
      );
    });
  }, [events, keyword, filter]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of visible) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const removeEvent = (id: string): void => {
    setEvents((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // 조건이 바뀌면 선택을 비운다 — 화면에 없는 행이 선택된 채 '선택 N건 삭제' 가 되지 않게 (STATE-04-b)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };
  const changeFilter = (value: EventPhaseFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = filter !== EVENT_FILTER_ALL;

  const rows: TableProps['rows'] = visible.map((item, index) => {
    const meta = PHASE_META[item.phase];
    const derived = derivePhase(item.startAt, item.endAt, TODAY);
    return {
      id: item.id,
      // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 CrudTable 미러)
      selected: selectedIds.has(item.id),
      onActivate: () => {
        /* 실화면: 행 클릭 → 이벤트 수정(/marketing/events/:id/edit) */
      },
      leading: [
        <RowSelectCell
          key="select"
          id={item.id}
          label={`${item.title} 선택`}
          checked={selectedIds.has(item.id)}
          onToggle={(checked) => toggleOne(item.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        item.title,
        <span key="period" style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
        item.target,
        benefitText(item),
        <span key="phase" style={statusCellStyle}>
          <StatusBadge tone={meta.tone} label={meta.label} />
          {derived !== item.phase && (
            <StatusBadge tone="warning" label={`기간상 ${PHASE_META[derived].label}`} />
          )}
        </span>,
      ],
      trailing: [
        <td key="actions" className="tds-table__cell tds-table__cell--end">
          <span style={actionCellStyle}>
            <RowActions
              label={item.title}
              onEdit={() => {
                /* 실화면: 연필 → 이벤트 수정 화면으로 이동 */
              }}
              onDelete={() => setConfirming(item)}
            />
          </span>
        </td>,
      ],
    };
  });

  const announcement = loading
    ? ''
    : visible.length === 0
      ? '조건에 맞는 이벤트 결과가 없어요.'
      : `이벤트 ${String(visible.length)}건을 찾았어요.`;

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={changeKeyword}
          label="이벤트명·대상 검색"
          placeholder="이벤트명 · 대상 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => changeFilter(event.target.value as EventPhaseFilter)}
            aria-label="상태로 거르기"
          >
            <option value={EVENT_FILTER_ALL}>전체 상태</option>
            {CAMPAIGN_PHASE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      {/* 등록 CTA — 실화면은 create 권한이 있을 때만 존재한다(EXC-03). 템플릿은 항상 표시 */}
      <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
        이벤트 등록
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>이벤트</h1>

      <div aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {announcement}
      </div>

      {toolbar}

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${visible.length.toLocaleString('ko-KR')}건`}
        {selectedCount > 0 ? ` · ${selectedCount.toLocaleString('ko-KR')}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            for (const id of selectedIds) removeEvent(id);
          }}
        >
          {`선택 ${selectedCount.toLocaleString('ko-KR')}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="이벤트 목록 — 행을 누르면 이벤트 수정 화면으로 이동해요. 체크박스·수정·삭제 버튼은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 이벤트 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
          <SeqHeaderCell key="seq" />,
        ]}
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={PAGE_SIZE}
        empty={
          <EmptyState
            label={ENTITY_LABEL}
            hasQuery={hasQuery}
            hasActiveFilters={hasActiveFilters}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setFilter(EVENT_FILTER_ALL)}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="이벤트 삭제"
          message={`${confirming.title} 이벤트를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="이벤트 삭제"
          onConfirm={() => {
            removeEvent(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 이벤트 목록이 채워진 기본 상태(선택 없음 · '기간상 종료' 힌트 배지 포함) */
export const Default: Story = {
  render: () => <EventListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <EventListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <EventListScreen initialKeyword="등록되지 않은 이벤트" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <EventListScreen initialSelectedIds={['ev-1', 'ev-4']} />,
};

/** 필터 적용: 상태='진행' — 실화면은 이 조건이 URL(?phase=ongoing)에 남아 복원·공유된다(IA-13) */
export const Filtered: Story = {
  render: () => <EventListScreen initialFilter="ongoing" />,
};
