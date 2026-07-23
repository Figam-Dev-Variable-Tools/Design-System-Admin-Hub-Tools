/**
 * Design System/Templates/Content/Popups — 팝업 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/popups` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Popups"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의 `['/content/popups', '팝업 관리', 'Popups']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/popups/PopupsPage.tsx (라우트 /content/popups).
 * 팝업은 **삭제 가능 CRUD 목록**이라 선택 체크박스 + 순번 + 행 액션(수정 연필·삭제 휴지통) + 일괄 바를
 * 갖는다. 등록/수정은 별도 폼 라우트(/content/popups/new · /:id/edit)로 나가고, 상세 페이지는 없다 —
 * 목록 행이 곧 요약이다. ON/OFF 는 배지가 아니라 **목록에서 바로 켜고 끄는 토글**이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   PopupsTable(앱)          → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *   useListState(URL 소유)    → 스토리 로컬 useState(검색·필터·페이지·선택)
 *   useToast·낙관적 업데이트   → 템플릿에서는 상태 전이만 재현한다
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   팝업 제목 검색             → SearchField
 *   ON/OFF 상태 필터           → SegmentedControl (전체 · ON · OFF)
 *   팝업 등록 버튼             → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   노출 인라인 토글           → ToggleSwitch
 *   행 액션(수정·삭제)         → RowActions (연필 → 폼, 휴지통 → 삭제 확인)
 *   선택 일괄 ON/OFF/삭제      → SelectionBar + Button ×3
 *   삭제 확인 · 일괄 삭제 확인  → ConfirmDialog(intent=delete)
 *   목록 표                   → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                   → Empty
 *   목록 조회 실패             → Alert(danger) + 다시 시도 Button
 *   페이지네이션               → Pagination
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  Pagination,
  RowActions,
  RowSelectCell,
  SearchField,
  SegmentedControl,
  SelectAllHeaderCell,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  Table,
  ToggleSwitch,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Popups',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/popups/types.ts 미러 — 레이어 경계라 값으로 복사) ─────────────── */

type PopupPosition = 'home' | 'event' | 'all';

const POSITION_LABEL: Record<PopupPosition, string> = {
  home: '메인 홈',
  event: '이벤트 페이지',
  all: '전체 페이지',
};

type EnabledFilter = 'all' | 'on' | 'off';

const ENABLED_FILTERS: readonly { readonly id: EnabledFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'on', label: 'ON' },
  { id: 'off', label: 'OFF' },
];

const PAGE_SIZE = 10;

/* ── 데모 데이터(실화면 Popup 을 목록이 쓰는 필드만 축약해 미러 — 우선순위 오름차순) ─────────── */

interface DemoPopup {
  readonly id: string;
  readonly title: string;
  readonly position: PopupPosition;
  /** 노출 기간 — 'YYYY-MM-DD' */
  readonly startAt: string;
  readonly endAt: string;
  /** ON/OFF — 끄면 기간 안이라도 노출되지 않는다 */
  readonly enabled: boolean;
  /** 우선순위 — 작을수록 먼저(위에) 뜬다 */
  readonly priority: number;
}

const DEMO_POPUPS: readonly DemoPopup[] = [
  {
    id: 'PU-001',
    title: '신규 가입 혜택 (001)',
    position: 'home',
    startAt: '2026-01-01',
    endAt: '2026-01-28',
    enabled: false,
    priority: 1,
  },
  {
    id: 'PU-006',
    title: '시즌 프로모션 (006)',
    position: 'all',
    startAt: '2026-06-01',
    endAt: '2026-06-28',
    enabled: true,
    priority: 1,
  },
  {
    id: 'PU-011',
    title: '점검 안내 (011)',
    position: 'event',
    startAt: '2026-11-01',
    endAt: '2026-11-28',
    enabled: true,
    priority: 1,
  },
  {
    id: 'PU-002',
    title: '시즌 프로모션 (002)',
    position: 'event',
    startAt: '2026-02-01',
    endAt: '2026-02-28',
    enabled: true,
    priority: 2,
  },
  {
    id: 'PU-007',
    title: '점검 안내 (007)',
    position: 'home',
    startAt: '2026-07-01',
    endAt: '2026-07-28',
    enabled: true,
    priority: 2,
  },
  {
    id: 'PU-012',
    title: '앱 다운로드 (012)',
    position: 'all',
    startAt: '2026-12-01',
    endAt: '2026-12-28',
    enabled: true,
    priority: 2,
  },
  {
    id: 'PU-003',
    title: '점검 안내 (003)',
    position: 'all',
    startAt: '2026-03-01',
    endAt: '2026-03-28',
    enabled: true,
    priority: 3,
  },
  {
    id: 'PU-008',
    title: '앱 다운로드 (008)',
    position: 'event',
    startAt: '2026-08-01',
    endAt: '2026-08-28',
    enabled: true,
    priority: 3,
  },
  {
    id: 'PU-004',
    title: '앱 다운로드 (004)',
    position: 'home',
    startAt: '2026-04-01',
    endAt: '2026-04-28',
    enabled: true,
    priority: 4,
  },
  {
    id: 'PU-009',
    title: '신규 가입 혜택 (009)',
    position: 'all',
    startAt: '2026-09-01',
    endAt: '2026-09-28',
    enabled: false,
    priority: 4,
  },
  {
    id: 'PU-005',
    title: '신규 가입 혜택 (005)',
    position: 'event',
    startAt: '2026-05-01',
    endAt: '2026-05-28',
    enabled: false,
    priority: 5,
  },
  {
    id: 'PU-010',
    title: '시즌 프로모션 (010)',
    position: 'home',
    startAt: '2026-10-01',
    endAt: '2026-10-28',
    enabled: true,
    priority: 5,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

const SELECT_ALL_LABEL_ID = 'popups-select-all-label';

/* ── 표 열 정의(데이터 열 5개 — 선택·순번은 leading, 액션은 trailing) ──────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'position', header: '위치', nowrap: true },
  { id: 'period', header: '노출 기간', nowrap: true },
  { id: 'enabled', header: '상태', nowrap: true },
  { id: 'priority', header: '우선순위', align: 'end' },
];

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

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

const toolbarLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  minWidth: 0,
  width: `calc(${cssVar('space.6')} * 10)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const titleCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
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

interface PopupsScreenProps {
  /** 최초 로드 스켈레톤 — 실화면 firstLoading(isFetching && data === undefined) 미러 */
  readonly loading?: boolean;
  /** 목록 조회 실패 — 인라인 Alert 로 갈린다 */
  readonly failed?: boolean;
  readonly initialKeyword?: string;
  readonly initialFilter?: EnabledFilter;
  readonly initialSelectedIds?: readonly string[];
}

function PopupsScreen({
  loading = false,
  failed = false,
  initialKeyword = '',
  initialFilter = 'all',
  initialSelectedIds = [],
}: PopupsScreenProps) {
  const [popups, setPopups] = useState<readonly DemoPopup[]>(DEMO_POPUPS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<EnabledFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoPopup | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return popups.filter((popup) => {
      if (filter === 'on' && !popup.enabled) return false;
      if (filter === 'off' && popup.enabled) return false;
      if (kw === '') return true;
      return popup.title.toLowerCase().includes(kw);
    });
  }, [popups, keyword, filter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(startIndex, startIndex + PAGE_SIZE);

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
      for (const popup of visible) {
        if (checked) next.add(popup.id);
        else next.delete(popup.id);
      }
      return next;
    });
  };

  const setEnabled = (id: string, enabled: boolean): void => {
    setPopups((prev) => prev.map((popup) => (popup.id === id ? { ...popup, enabled } : popup)));
  };

  const setBulkEnabled = (enabled: boolean): void => {
    setPopups((prev) =>
      prev.map((popup) => (selectedIds.has(popup.id) ? { ...popup, enabled } : popup)),
    );
  };

  const removePopups = (ids: ReadonlySet<string>): void => {
    setPopups((prev) => prev.filter((popup) => !ids.has(popup.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((popup, index) => ({
    id: popup.id,
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 PopupsTable 미러)
    selected: selectedIds.has(popup.id),
    leading: [
      <RowSelectCell
        key="select"
        id={popup.id}
        label={`${popup.title} 선택`}
        checked={selectedIds.has(popup.id)}
        onToggle={(checked) => toggleOne(popup.id, checked)}
      />,
      <SeqCell key="seq" seq={startIndex + index + 1} />,
    ],
    cells: [
      <span key="title" style={titleCellStyle}>
        {popup.title}
      </span>,
      POSITION_LABEL[popup.position],
      `${popup.startAt} ~ ${popup.endAt}`,
      <ToggleSwitch
        key="enabled"
        checked={popup.enabled}
        label={`${popup.title} 노출 여부`}
        onLabel="ON"
        offLabel="OFF"
        onChange={(next) => setEnabled(popup.id, next)}
      />,
      fmt(popup.priority),
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={popup.title}
          onEdit={() => {
            /* 실화면: 연필 → 팝업 수정 폼(/content/popups/:id/edit) */
          }}
          onDelete={() => setConfirming(popup)}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>팝업 관리</h1>

      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              label="팝업 제목 검색"
              placeholder="팝업 제목 검색"
              value={keyword}
              onChange={(value) => {
                setKeyword(value);
                setPage(1);
              }}
            />
          </span>
          <SegmentedControl
            value={filter}
            options={ENABLED_FILTERS.map((option) => ({ id: option.id, label: option.label }))}
            ariaLabel="팝업 상태 필터"
            onChange={(id) => {
              setFilter(id as EnabledFilter);
              setPage(1);
            }}
          />
        </div>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          팝업 등록
        </Button>
      </div>

      {failed ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>팝업 목록을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <>
          <p style={summaryStyle} aria-busy={loading}>
            {loading ? '불러오는 중…' : `전체 ${fmt(total)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          {/* 선택 일괄 액션 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
          <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
            <Button variant="secondary" onClick={() => setBulkEnabled(true)}>
              일괄 ON
            </Button>
            <Button variant="secondary" onClick={() => setBulkEnabled(false)}>
              일괄 OFF
            </Button>
            <Button variant="danger" onClick={() => setBulkOpen(true)}>
              {`선택 ${fmt(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <Table
            caption="팝업 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 팝업을 관리해요. 상태 스위치는 노출을 바로 켜고 꺼요."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 팝업 전체 선택"
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
                label="팝업"
                hasQuery={keyword.trim() !== ''}
                hasActiveFilters={filter !== 'all'}
                onClearSearch={() => setKeyword('')}
                onResetFilters={() => setFilter('all')}
              />
            }
          />

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            label="팝업 페이지"
            onChange={setPage}
          />
        </>
      )}

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="팝업 삭제"
          message={`'${confirming.title}' 팝업을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="팝업 삭제"
          onConfirm={() => {
            removePopups(new Set([confirming.id]));
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="팝업 일괄 삭제"
          message={`선택한 팝업 ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removePopups(selectedIds);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 우선순위 오름차순 팝업 12건(1페이지 10건) — ON/OFF 토글이 행에서 바로 동작한다 */
export const Default: Story = {
  render: () => <PopupsScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <PopupsScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <PopupsScreen initialKeyword="등록되지 않은 팝업" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 ON/OFF·삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <PopupsScreen initialSelectedIds={['PU-001', 'PU-006', 'PU-011']} />,
};

/** 에러: 목록 조회 실패 — 인라인 Alert(danger) + 다시 시도(실화면 refetch) */
export const Error: Story = {
  render: () => <PopupsScreen failed />,
};
