/**
 * Design System/Templates/Content/Banners — 배너 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/banners` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Banners"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의 `['/content/banners', '배너 관리', 'Banners']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/banners/BannersPage.tsx (라우트 /content/banners).
 * 팝업 관리와 같은 구조의 **삭제 가능 CRUD 목록**이되 위치 필터가 메인/서브이고, 팝업에 없는
 * **정렬 재정렬**이 있다 — 배너는 나란히 노출되므로 순서 자체가 콘텐츠다. 재정렬은 필터·검색이
 * 걸리지 않은 자연 순서 화면(reorderable)에서만 켠다: 걸러진 목록에서 순서를 바꾸면 화면에 보이지
 * 않는 배너와의 상대 순서를 알 수 없다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   BannersTable(앱)        → DS Table(+ 선택·순번·재정렬·행 액션 셀)
 *   useReorderableRows(드래그) → DS moveArrayItem + ReorderMoveButtons (Table 이 <tr> 을 소유하므로
 *                              드래그 핸들러 대신 키보드 이동 버튼 경로만 재현한다)
 *   useListState(URL 소유)   → 스토리 로컬 useState(검색·필터·페이지·선택)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   배너 제목 검색            → SearchField
 *   위치 필터(전체·메인·서브)  → SegmentedControl
 *   배너 등록 버튼            → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸  → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                  → SeqHeaderCell · SeqCell
 *   재정렬 손잡이 열          → ReorderGripHeaderCell · ReorderGripCell
 *   위/아래 이동 버튼         → ReorderMoveButtons (+ moveArrayItem)
 *   노출 인라인 토글          → ToggleSwitch
 *   행 액션(수정·삭제)        → RowActions
 *   선택 일괄 ON/OFF/삭제     → SelectionBar + Button ×3
 *   삭제 확인 · 일괄 삭제 확인 → ConfirmDialog(intent=delete)
 *   목록 표                  → Table (leadingHead=선택+손잡이+순번 / trailingHead=행 액션)
 *   빈 결과                  → Empty
 *   목록 조회 실패            → Alert(danger) + 다시 시도 Button
 *   페이지네이션              → Pagination
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
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
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
  moveArrayItem,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Banners',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/banners/types.ts 미러 — 레이어 경계라 값으로 복사) ────────────── */

type BannerPlacement = 'main' | 'sub';

const PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  main: '메인',
  sub: '서브',
};

type PlacementFilter = 'all' | BannerPlacement;

const PLACEMENT_FILTERS: readonly { readonly id: PlacementFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'main', label: '메인' },
  { id: 'sub', label: '서브' },
];

const PAGE_SIZE = 10;

/* ── 데모 데이터(실화면 Banner 를 목록이 쓰는 필드만 축약해 미러 — 정렬 순서 오름차순) ──────── */

interface DemoBanner {
  readonly id: string;
  readonly title: string;
  readonly placement: BannerPlacement;
  /** 노출 기간 — 'YYYY-MM-DD' */
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  /** 정렬 순서 — 작을수록 앞(왼쪽/위)에 노출된다 */
  readonly order: number;
}

const DEMO_BANNERS: readonly DemoBanner[] = [
  {
    id: 'BN-001',
    title: '봄 시즌 기획전 (001)',
    placement: 'main',
    startAt: '2026-01-01',
    endAt: '2026-01-28',
    enabled: false,
    order: 1,
  },
  {
    id: 'BN-002',
    title: '신상품 입고 (002)',
    placement: 'sub',
    startAt: '2026-02-01',
    endAt: '2026-02-28',
    enabled: true,
    order: 2,
  },
  {
    id: 'BN-003',
    title: '무료배송 이벤트 (003)',
    placement: 'main',
    startAt: '2026-03-01',
    endAt: '2026-03-28',
    enabled: true,
    order: 3,
  },
  {
    id: 'BN-004',
    title: '브랜드데이 (004)',
    placement: 'sub',
    startAt: '2026-04-01',
    endAt: '2026-04-28',
    enabled: true,
    order: 4,
  },
  {
    id: 'BN-005',
    title: '봄 시즌 기획전 (005)',
    placement: 'main',
    startAt: '2026-05-01',
    endAt: '2026-05-28',
    enabled: false,
    order: 5,
  },
  {
    id: 'BN-006',
    title: '신상품 입고 (006)',
    placement: 'sub',
    startAt: '2026-06-01',
    endAt: '2026-06-28',
    enabled: true,
    order: 6,
  },
  {
    id: 'BN-007',
    title: '무료배송 이벤트 (007)',
    placement: 'main',
    startAt: '2026-07-01',
    endAt: '2026-07-28',
    enabled: true,
    order: 7,
  },
  {
    id: 'BN-008',
    title: '브랜드데이 (008)',
    placement: 'sub',
    startAt: '2026-08-01',
    endAt: '2026-08-28',
    enabled: true,
    order: 8,
  },
  {
    id: 'BN-009',
    title: '봄 시즌 기획전 (009)',
    placement: 'main',
    startAt: '2026-09-01',
    endAt: '2026-09-28',
    enabled: false,
    order: 9,
  },
  {
    id: 'BN-010',
    title: '신상품 입고 (010)',
    placement: 'sub',
    startAt: '2026-10-01',
    endAt: '2026-10-28',
    enabled: true,
    order: 10,
  },
  {
    id: 'BN-011',
    title: '무료배송 이벤트 (011)',
    placement: 'main',
    startAt: '2026-11-01',
    endAt: '2026-11-28',
    enabled: true,
    order: 11,
  },
  {
    id: 'BN-012',
    title: '브랜드데이 (012)',
    placement: 'sub',
    startAt: '2026-12-01',
    endAt: '2026-12-28',
    enabled: true,
    order: 12,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

const SELECT_ALL_LABEL_ID = 'banners-select-all-label';

/* ── 표 열 정의(데이터 열 5개 — 선택·손잡이·순번은 leading, 액션은 trailing) ────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'placement', header: '위치', nowrap: true },
  { id: 'period', header: '노출 기간', nowrap: true },
  { id: 'enabled', header: '상태', nowrap: true },
  { id: 'order', header: '정렬 순서', align: 'end' },
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

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const reorderHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

interface BannersScreenProps {
  /** 최초 로드 스켈레톤 — 실화면 firstLoading(isFetching && data === undefined) 미러 */
  readonly loading?: boolean;
  /** 목록 조회 실패 — 인라인 Alert 로 갈린다 */
  readonly failed?: boolean;
  readonly initialKeyword?: string;
  readonly initialFilter?: PlacementFilter;
  readonly initialSelectedIds?: readonly string[];
}

function BannersScreen({
  loading = false,
  failed = false,
  initialKeyword = '',
  initialFilter = 'all',
  initialSelectedIds = [],
}: BannersScreenProps) {
  const [banners, setBanners] = useState<readonly DemoBanner[]>(DEMO_BANNERS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<PlacementFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoBanner | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return banners.filter((banner) => {
      if (filter !== 'all' && banner.placement !== filter) return false;
      if (kw === '') return true;
      return banner.title.toLowerCase().includes(kw);
    });
  }, [banners, keyword, filter]);

  // 재정렬은 필터·검색이 없는 자연 순서 화면에서만 (실화면 reorderable 규칙 그대로)
  const reorderable = filter === 'all' && keyword.trim() === '';

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
      for (const banner of visible) {
        if (checked) next.add(banner.id);
        else next.delete(banner.id);
      }
      return next;
    });
  };

  const setEnabled = (id: string, enabled: boolean): void => {
    setBanners((prev) =>
      prev.map((banner) => (banner.id === id ? { ...banner, enabled } : banner)),
    );
  };

  const setBulkEnabled = (enabled: boolean): void => {
    setBanners((prev) =>
      prev.map((banner) => (selectedIds.has(banner.id) ? { ...banner, enabled } : banner)),
    );
  };

  const removeBanners = (ids: ReadonlySet<string>): void => {
    setBanners((prev) => prev.filter((banner) => !ids.has(banner.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  /** 위/아래 이동 — 새 순서로 정렬 값(order)을 다시 매긴다(실화면 reorderBanners 미러) */
  const moveBy = (index: number, delta: number): void => {
    setBanners((prev) => {
      const from = startIndex + index;
      const to = from + delta;
      if (to < 0 || to >= prev.length) return prev;
      return moveArrayItem(prev, from, to).map((banner, position) => ({
        ...banner,
        order: position + 1,
      }));
    });
  };

  const rows: TableProps['rows'] = visible.map((banner, index) => ({
    id: banner.id,
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 BannersTable 미러)
    selected: selectedIds.has(banner.id),
    leading: [
      <RowSelectCell
        key="select"
        id={banner.id}
        label={`${banner.title} 선택`}
        checked={selectedIds.has(banner.id)}
        onToggle={(checked) => toggleOne(banner.id, checked)}
      />,
      ...(reorderable ? [<ReorderGripCell key="grip" />] : []),
      <SeqCell key="seq" seq={startIndex + index + 1} />,
    ],
    cells: [
      <span key="title" style={titleCellStyle}>
        {banner.title}
      </span>,
      PLACEMENT_LABEL[banner.placement],
      `${banner.startAt} ~ ${banner.endAt}`,
      <ToggleSwitch
        key="enabled"
        checked={banner.enabled}
        label={`${banner.title} 노출 여부`}
        onLabel="ON"
        offLabel="OFF"
        onChange={(next) => setEnabled(banner.id, next)}
      />,
      fmt(banner.order),
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <span style={rowActionsWrapStyle}>
          {reorderable && (
            <ReorderMoveButtons
              label={banner.title}
              index={index}
              count={visible.length}
              locked={false}
              onMove={moveBy}
            />
          )}
          <RowActions
            label={banner.title}
            onEdit={() => {
              /* 실화면: 연필 → 배너 수정 폼(/content/banners/:id/edit) */
            }}
            onDelete={() => setConfirming(banner)}
          />
        </span>
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>배너 관리</h1>

      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              label="배너 제목 검색"
              placeholder="배너 제목 검색"
              value={keyword}
              onChange={(value) => {
                setKeyword(value);
                setPage(1);
              }}
            />
          </span>
          <SegmentedControl
            value={filter}
            options={PLACEMENT_FILTERS.map((option) => ({ id: option.id, label: option.label }))}
            ariaLabel="배너 위치 필터"
            onChange={(id) => {
              setFilter(id as PlacementFilter);
              setPage(1);
            }}
          />
        </div>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          배너 등록
        </Button>
      </div>

      {failed ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>배너 목록을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <>
          <p style={summaryStyle} aria-busy={loading}>
            {loading ? '불러오는 중…' : `전체 ${fmt(total)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          <p style={reorderHintStyle}>
            {reorderable
              ? '각 행의 위/아래 버튼으로 노출 순서를 바꿔요.'
              : '필터나 검색이 걸린 목록에서는 순서를 바꿀 수 없어요 — 전체 보기로 돌아가세요.'}
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
            caption="배너 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 배너를 관리해요. 각 행의 위/아래 버튼으로 정렬 순서를 바꿔요."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 배너 전체 선택"
                labelId={SELECT_ALL_LABEL_ID}
                selection={selection}
                onToggleAll={toggleAll}
              />,
              ...(reorderable ? [<ReorderGripHeaderCell key="grip-head" />] : []),
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
                label="배너"
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
            label="배너 페이지"
            onChange={setPage}
          />
        </>
      )}

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="배너 삭제"
          message={`'${confirming.title}' 배너를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="배너 삭제"
          onConfirm={() => {
            removeBanners(new Set([confirming.id]));
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="배너 일괄 삭제"
          message={`선택한 배너 ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removeBanners(selectedIds);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 정렬 순서대로 놓인 배너 12건(1페이지 10건) — 손잡이 열과 위/아래 이동 버튼이 켜져 있다 */
export const Default: Story = {
  render: () => <BannersScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <BannersScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <BannersScreen initialKeyword="등록되지 않은 배너" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 ON/OFF·삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <BannersScreen initialSelectedIds={['BN-002', 'BN-005']} />,
};

/** 위치 필터: '메인'만 남긴 화면 — 걸러진 목록이라 재정렬 손잡이·이동 버튼이 사라진다 */
export const Filtered: Story = {
  render: () => <BannersScreen initialFilter="main" />,
};
