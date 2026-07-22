/**
 * Design System/Templates/Content/Site Pages — 페이지 관리 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/pages` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "Pages" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/pages', '페이지 관리', 'Pages']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/pages/SitePagesPage.tsx (라우트 /content/pages) 와
 * 그 하위 조립(types.ts · data-source.ts) · 공용 껍데기(shared/crud/CrudListShell).
 *
 * [상태 열은 저장된 값이 아니다 — 이 화면에서 가장 헷갈리는 지점] 저장되는 것은
 * `status: draft|published|archived` 와 `publishAt` **둘뿐**이다. '예약' 이라는 상태는 어디에도
 * 저장되지 않고 그 둘 + 지금 시각에서 **파생**된다(shared/domain/publish-schedule). 그래서 예약
 * 시각이 지나면 아무도 손대지 않아도 다음 조회에서 '발행' 으로 바뀐다 — 새벽 0시에 상태를 고쳐
 * 줄 배치가 필요 없고, 배치가 하루 실패해서 목록과 홈페이지가 다른 말을 하는 일도 없다.
 * (스토리는 판정 기준 시각을 `NOW` 로 고정한다 — `new Date()` 를 읽으면 회귀 비교가 매일 깨진다.)
 *
 * [옛 주소 열이 왜 목록에 있나] 발행된 페이지의 슬러그를 바꾸면 그 주소를 가리키던 외부 링크·
 * 북마크·검색 결과가 전부 죽는다. 그래서 폼은 **막지 않고 경고**하고, 옛 슬러그를 버리지 않고
 * 보관한다 — 백엔드가 붙는 날 301 리다이렉트를 걸 근거가 그것뿐이기 때문이다. 링크가 깨졌다는
 * 신고가 들어왔을 때 운영자가 가장 먼저 보는 열이 이 열이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지
 * 않고 apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   제목·주소 검색             → SearchField
 *   상태 필터(전체·초안·예약·발행·보관) → SelectField
 *   페이지 등록                → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   제목 셀(제목 + /슬러그)     → 토큰만 쓴 <span> 2줄
 *   상태 배지(파생값)           → StatusBadge (draft·scheduled·published·archived)
 *   행 액션(수정·삭제)          → RowActions
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *   목록 표                    → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                    → Empty (검색 지우기 · 필터 초기화 · 등록)
 *   하단 안내(옛 주소 보관)      → 토큰만 쓴 <p>
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
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
  title: 'Design System/Templates/Content/Site Pages',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 발행 상태(실화면 shared/domain/publish-schedule 미러) ─────────────────────────────────── */

/** 저장되는 상태 — 셋뿐이다. '예약' 은 여기 없다 */
type StoredPublishStatus = 'draft' | 'published' | 'archived';

/** 화면이 말하는 상태 — 저장값 + 시각에서 파생된다 */
type PublishStatus = StoredPublishStatus | 'scheduled';

const PUBLISH_STATUS_LABEL: Readonly<Record<PublishStatus, string>> = {
  draft: '초안',
  scheduled: '예약',
  published: '발행',
  archived: '보관',
};

const PUBLISH_STATUS_TONE: Readonly<Record<PublishStatus, StatusBadgeTone>> = {
  draft: 'neutral',
  scheduled: 'info',
  published: 'success',
  archived: 'neutral',
};

/**
 * 판정 기준 시각 — 실화면은 `new Date()` 를 한 번만 만들어 목록 전체가 같은 시각을 보게 한다.
 * 스토리는 그 '한 번' 을 상수로 고정한다: 회귀 비교가 날짜에 흔들리면 안 된다.
 */
const NOW = '2026-07-22T09:00';

/** 지금 이 페이지의 상태 — 저장값이 아니라 파생값이다(머리말) */
function effectiveStatus(page: DemoSitePage): PublishStatus {
  if (page.status !== 'published') return page.status;
  if (page.publishAt === '') return 'published';
  return page.publishAt > NOW ? 'scheduled' : 'published';
}

/* ── 데모 데이터(실화면 data-source.ts 의 SEEDS 미러) ──────────────────────────────────────── */

interface DemoSitePage {
  readonly id: string;
  readonly title: string;
  /** 홈페이지 주소 조각 — 소문자·숫자·하이픈 */
  readonly slug: string;
  readonly status: StoredPublishStatus;
  /** 'YYYY-MM-DDTHH:mm' — '' 면 발행 즉시 공개 */
  readonly publishAt: string;
  /** 옛 슬러그 — 최근 것이 앞. 지금 슬러그는 여기 없다 */
  readonly previousSlugs: readonly string[];
  readonly updatedAt: string;
}

/** 최근 수정이 위 — 방금 만진 페이지를 찾으러 스크롤하지 않게 한다(실화면 sortSitePages) */
const DEMO_PAGES: readonly DemoSitePage[] = [
  {
    id: 'pg-005',
    title: '채용 안내',
    slug: 'recruit',
    status: 'draft',
    publishAt: '',
    previousSlugs: [],
    updatedAt: '2026-06-01T09:00',
  },
  {
    id: 'pg-004',
    title: '데이터 분석',
    slug: 'business-analytics',
    // 미래 시각 — 저장값은 '발행' 이지만 화면은 '예약' 이라고 말한다
    status: 'published',
    publishAt: '2026-12-01T09:00',
    previousSlugs: [],
    updatedAt: '2026-06-01T09:00',
  },
  {
    id: 'pg-003',
    title: '시공 관리',
    slug: 'business-construction',
    status: 'published',
    publishAt: '',
    previousSlugs: [],
    updatedAt: '2026-03-10T09:00',
  },
  {
    id: 'pg-001',
    title: '사업영역',
    slug: 'business',
    status: 'published',
    publishAt: '',
    previousSlugs: [],
    updatedAt: '2026-03-02T10:00',
  },
  {
    id: 'pg-002',
    title: '공간 기획',
    slug: 'business-planning',
    status: 'published',
    publishAt: '',
    previousSlugs: [],
    updatedAt: '2026-03-02T10:00',
  },
  {
    id: 'pg-006',
    title: '2025 브랜드 소개',
    slug: 'brand-2025',
    status: 'archived',
    publishAt: '',
    // 주소가 한 번 바뀐 페이지 — 옛 주소를 버리지 않고 보관한다(머리말)
    previousSlugs: ['brand'],
    updatedAt: '2025-01-05T09:00',
  },
];

/* ── 필터(실화면 STATUS_FILTERS · filterSitePages 미러) ────────────────────────────────────── */

type SitePageStatusFilter = PublishStatus | 'all';

const STATUS_FILTERS: readonly { readonly id: SitePageStatusFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'scheduled', label: '예약' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
];

function filterPages(
  list: readonly DemoSitePage[],
  status: SitePageStatusFilter,
  keyword: string,
): readonly DemoSitePage[] {
  const needle = keyword.trim().toLowerCase();
  return list.filter((page) => {
    if (status !== 'all' && effectiveStatus(page) !== status) return false;
    if (needle === '') return true;
    return page.title.toLowerCase().includes(needle) || page.slug.toLowerCase().includes(needle);
  });
}

const ENTITY_LABEL = '페이지';
const SELECT_ALL_LABEL_ID = 'site-pages-select-all';
const PAGE_SIZE = 10;

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 'YYYY-MM-DDTHH:mm' → 'YYYY-MM-DD HH:mm'. 저장한 그대로 보여 준다(시간대를 옮기지 않는다) */
const stampLabel = (value: string): string => (value === '' ? '—' : value.replace('T', ' '));

/* ── 표 열 정의(데이터 열 5개 — 선택·순번은 leading, 액션은 trailing) ─────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'publishAt', header: '공개 일시', nowrap: true },
  { id: 'previousSlugs', header: '옛 주소', nowrap: true },
  { id: 'updatedAt', header: '최근 수정', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

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
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

/** SelectField 는 style 을 받지 않는다(토큰 보호) — 폭은 감싸는 쪽이 정한다 */
const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const titleCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const slugTextStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
};

const stampStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
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

interface SitePagesScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialStatus?: SitePageStatusFilter;
  readonly initialSelectedIds?: readonly string[];
}

function SitePagesScreen({
  loading = false,
  initialKeyword = '',
  initialStatus = 'all',
  initialSelectedIds = [],
}: SitePagesScreenProps) {
  const [pages, setPages] = useState<readonly DemoSitePage[]>(DEMO_PAGES);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<SitePageStatusFilter>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoSitePage | null>(null);

  const visible = useMemo(() => filterPages(pages, status, keyword), [pages, status, keyword]);

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
      for (const page of visible) {
        if (checked) next.add(page.id);
        else next.delete(page.id);
      }
      return next;
    });
  };

  const removePage = (id: string): void => {
    setPages((prev) => prev.filter((page) => page.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((page, index) => {
    const current = effectiveStatus(page);
    return {
      id: page.id,
      onActivate: () => {
        /* 실화면: 행 클릭 → 페이지 수정(/content/pages/:id/edit) */
      },
      selected: selectedIds.has(page.id),
      leading: [
        <RowSelectCell
          key="select"
          id={page.id}
          label={`${page.title} 선택`}
          checked={selectedIds.has(page.id)}
          onToggle={(checked) => toggleOne(page.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        <span key="title" style={titleCellStyle}>
          <span>{page.title}</span>
          <span style={slugTextStyle}>{`/${page.slug}`}</span>
        </span>,
        <StatusBadge
          key="status"
          tone={PUBLISH_STATUS_TONE[current]}
          label={PUBLISH_STATUS_LABEL[current]}
        />,
        <span key="publishAt" style={stampStyle}>
          {stampLabel(page.publishAt)}
        </span>,
        page.previousSlugs.length === 0 ? (
          <span key="previous-slugs-none">—</span>
        ) : (
          <span key="previous-slugs" style={slugTextStyle}>
            {page.previousSlugs.map((slug) => `/${slug}`).join(', ')}
          </span>
        ),
        <span key="updatedAt" style={stampStyle}>
          {stampLabel(page.updatedAt)}
        </span>,
      ],
      trailing: [
        <td key="actions" style={actionCellStyle}>
          <RowActions
            label={page.title}
            onEdit={() => {
              /* 실화면: 연필 → 페이지 수정 */
            }}
            onDelete={() => setConfirming(page)}
          />
        </td>,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>페이지 관리</h1>

      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              value={keyword}
              onChange={setKeyword}
              label="페이지 제목·주소 검색"
              placeholder="제목 · 주소(슬러그) 검색"
            />
          </span>
          <span style={filterSlotStyle}>
            <SelectField
              value={status}
              aria-label="상태 필터"
              onChange={(event) => {
                const next = STATUS_FILTERS.find((filter) => filter.id === event.target.value);
                setStatus(next === undefined ? 'all' : next.id);
              }}
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          페이지 등록
        </Button>
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removePage(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <div style={tableScrollStyle}>
        <Table
          caption="페이지 목록 — 행을 누르면 페이지 수정으로 이동합니다. 상태는 저장값이 아니라 공개 일시에서 파생됩니다."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[
            <SelectAllHeaderCell
              key="select-all"
              label="이 페이지의 항목 전체 선택"
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
              hasQuery={keyword.trim() !== ''}
              hasActiveFilters={status !== 'all'}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => setStatus('all')}
              action={
                <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
                  페이지 등록
                </Button>
              }
            />
          }
        />
      </div>

      <p style={hintStyle}>
        발행된 페이지의 주소를 바꾸면 기존 링크가 끊깁니다. 옛 주소는 보관되며 목록의 &apos;옛
        주소&apos; 열에서 확인할 수 있습니다.
      </p>

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="페이지 삭제"
          message={`'${confirming.title}' 페이지를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="페이지 삭제"
          onConfirm={() => {
            removePage(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 초안·예약·발행·보관이 한 화면에 섞여 있다 — 상태 열이 파생값임이 여기서 보인다 */
export const Default: Story = {
  render: () => <SitePagesScreen />,
};

/** 최초 로드: 표 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <SitePagesScreen loading />,
};

/**
 * 예약 필터: 저장된 상태는 '발행' 인데 공개 일시가 미래라 아직 나가지 않은 페이지만 남는다.
 * 이 행은 예약 시각이 지나면 **아무도 손대지 않아도** 다음 조회에서 '발행' 으로 바뀐다.
 */
export const Scheduled: Story = {
  render: () => <SitePagesScreen initialStatus="scheduled" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <SitePagesScreen initialSelectedIds={['pg-005', 'pg-006']} />,
};

/** 빈 결과: 검색이 맞지 않음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화 · 등록) */
export const Empty: Story = {
  render: () => <SitePagesScreen initialKeyword="존재하지 않는 페이지" />,
};
