/**
 * Design System/Templates/Content/Notices — 공지사항 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/notices` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Notices"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의 `['/content/notices', '공지사항', 'Notices']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/notices/NoticesPage.tsx (라우트 /content/notices) 와 그
 * 하위 조립(components/NoticeFilters.tsx · components/NoticesTable.tsx).
 * 공지는 **분류 × 상태 두 축으로 좁혀 읽는 목록**이라 좌측에 필터 레일(건수 배지 포함)을 두고, 우측에
 * 검색 + 등록 + 표 + 페이지네이션을 쌓는다. 삭제 가능 CRUD 라 선택 체크박스 + 순번 + 행 삭제 + 일괄
 * 삭제 바를 갖는다(수정은 행에 없다 — 상세에서 한다). 상단 고정(pinned) 공지가 목록 맨 위에 온다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 DS 표면으로 갈음한다:
 *   FilterRail/FilterPanel(앱) → aria-pressed 토글 버튼 목록 + Badge 건수
 *   NoticesTable(앱)          → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   공지 제목 검색(IME 안전)   → SearchField
 *   좌측 분류·상태 필터        → aria-pressed 토글 버튼 목록 + Badge 건수 (실화면 FilterPanel ×2)
 *   공지 등록 버튼             → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   상단 고정 표식             → StatusBadge(warning, '고정')
 *   게시 상태 배지             → StatusBadge (게시=success · 임시저장=neutral · 예약=info)
 *   행 액션(삭제만)            → RowActions (수정은 상세에서 — onEdit 를 주지 않는다)
 *   선택 일괄 삭제 바          → SelectionBar + Button(danger)
 *   삭제 확인 · 일괄 삭제 확인  → ConfirmDialog(intent=delete)
 *   목록 표                    → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                    → Empty (검색 지우기 · 필터 초기화 · 등록)
 *   페이지네이션(범위+번호)     → Pagination
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  Pagination,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
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
  title: 'Design System/Templates/Content/Notices',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 라벨·톤(실화면 content/notices/types.ts 미러 — @tds/ui 경계라 값으로 복사) ─────────── */

type NoticeCategory = 'notice' | 'event' | 'maintenance';
type NoticeStatus = 'published' | 'draft' | 'scheduled';

type CategoryFilter = NoticeCategory | 'all';
type StatusFilter = NoticeStatus | 'all';

const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  notice: '공지',
  event: '이벤트',
  maintenance: '점검',
};

const STATUS_LABEL: Record<NoticeStatus, string> = {
  published: '게시',
  draft: '임시저장',
  scheduled: '예약',
};

/** 게시 상태의 색 의도 — 게시=성공, 임시저장=중립, 예약=정보 (실화면 STATUS_TONE 미러) */
const STATUS_TONE: Record<NoticeStatus, StatusBadgeTone> = {
  published: 'success',
  draft: 'neutral',
  scheduled: 'info',
};

const CATEGORY_FILTERS: readonly { readonly id: CategoryFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'notice', label: '공지' },
  { id: 'event', label: '이벤트' },
  { id: 'maintenance', label: '점검' },
];

const STATUS_FILTERS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'published', label: '게시' },
  { id: 'draft', label: '임시저장' },
  { id: 'scheduled', label: '예약' },
];

/* ── 데모 데이터(실화면 data-source 픽스처를 목록이 쓰는 필드만 축약해 미러) ──────────────────── */

interface DemoNotice {
  readonly id: string;
  readonly title: string;
  readonly category: NoticeCategory;
  readonly status: NoticeStatus;
  /** 상단 고정 — 목록 맨 위에 고정으로 노출된다 */
  readonly pinned: boolean;
  readonly author: string;
  /** 게시일(예약이면 예약 시각) — 'YYYY-MM-DDTHH:mm:ss' */
  readonly publishedAtIso: string;
  readonly views: number;
}

/** 실화면 픽스처처럼 고정 → 최신순으로 이미 정렬된 상태로 내려온다(서버 정렬을 흉내) */
const DEMO_NOTICES: readonly DemoNotice[] = [
  {
    id: 'NT-001',
    title: '[중요] 개인정보 처리방침 개정 안내',
    category: 'notice',
    status: 'published',
    pinned: true,
    author: '콘텐츠 운영팀',
    publishedAtIso: '2026-07-20T09:00:00',
    views: 3820,
  },
  {
    id: 'NT-008',
    title: '[중요] 결제 수단 추가(카카오페이) 안내',
    category: 'notice',
    status: 'published',
    pinned: true,
    author: '시스템 관리자',
    publishedAtIso: '2026-07-14T10:30:00',
    views: 2145,
  },
  {
    id: 'NT-002',
    title: '여름맞이 가입 축하 이벤트',
    category: 'event',
    status: 'published',
    pinned: false,
    author: '마케팅팀',
    publishedAtIso: '2026-07-18T11:00:00',
    views: 1764,
  },
  {
    id: 'NT-003',
    title: '정기 점검 안내 (07/25 02:00~05:00)',
    category: 'maintenance',
    status: 'scheduled',
    pinned: false,
    author: '시스템 관리자',
    publishedAtIso: '2027-01-25T02:00:00',
    views: 0,
  },
  {
    id: 'NT-004',
    title: '고객센터 운영 시간 변경 안내',
    category: 'notice',
    status: 'published',
    pinned: false,
    author: '콘텐츠 운영팀',
    publishedAtIso: '2026-07-16T09:00:00',
    views: 902,
  },
  {
    id: 'NT-005',
    title: '리뷰 작성 적립금 이벤트 (작성 중)',
    category: 'event',
    status: 'draft',
    pinned: false,
    author: '마케팅팀',
    publishedAtIso: '2026-07-15T14:00:00',
    views: 0,
  },
  {
    id: 'NT-006',
    title: '배송 지연 관련 사과 말씀',
    category: 'notice',
    status: 'published',
    pinned: false,
    author: '콘텐츠 운영팀',
    publishedAtIso: '2026-07-13T17:20:00',
    views: 2640,
  },
  {
    id: 'NT-007',
    title: '앱 서버 긴급 점검 결과 보고',
    category: 'maintenance',
    status: 'published',
    pinned: false,
    author: '시스템 관리자',
    publishedAtIso: '2026-07-12T08:10:00',
    views: 1188,
  },
  {
    id: 'NT-009',
    title: '가을 신상품 사전 예약 이벤트',
    category: 'event',
    status: 'scheduled',
    pinned: false,
    author: '마케팅팀',
    publishedAtIso: '2027-02-01T09:00:00',
    views: 0,
  },
  {
    id: 'NT-010',
    title: '이용약관 개정 예고 (초안)',
    category: 'notice',
    status: 'draft',
    pinned: false,
    author: '콘텐츠 운영팀',
    publishedAtIso: '2026-07-10T13:45:00',
    views: 0,
  },
  {
    id: 'NT-011',
    title: '결제 모듈 정기 점검 안내',
    category: 'maintenance',
    status: 'published',
    pinned: false,
    author: '시스템 관리자',
    publishedAtIso: '2026-07-08T09:00:00',
    views: 736,
  },
  {
    id: 'NT-012',
    title: '친구 초대 이벤트 종료 안내',
    category: 'event',
    status: 'published',
    pinned: false,
    author: '마케팅팀',
    publishedAtIso: '2026-07-05T18:00:00',
    views: 1521,
  },
];

const PAGE_SIZE = 10;

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계라 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 'YYYY-MM-DD HH:mm' — 실화면 shared/format.formatDateTime 규약(픽스처가 로컬 시각 문자열이라 잘라 쓴다) */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

/* 건수 배지는 **검색·필터 이전** 전체 집합에서 센다 — 실화면도 좌측 배지는 전체 기준이다 */

const CATEGORY_COUNTS: Record<CategoryFilter, number> = (() => {
  const counts: Record<CategoryFilter, number> = {
    all: DEMO_NOTICES.length,
    notice: 0,
    event: 0,
    maintenance: 0,
  };
  for (const notice of DEMO_NOTICES) counts[notice.category] += 1;
  return counts;
})();

const STATUS_COUNTS: Record<StatusFilter, number> = (() => {
  const counts: Record<StatusFilter, number> = {
    all: DEMO_NOTICES.length,
    published: 0,
    draft: 0,
    scheduled: 0,
  };
  for (const notice of DEMO_NOTICES) counts[notice.status] += 1;
  return counts;
})();

/* ── 표 열 정의(데이터 열 6개 — 선택·순번은 leading, 액션은 trailing 으로 별도) ────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'category', header: '분류', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'author', header: '작성자', nowrap: true },
  { id: 'publishedAt', header: '게시일', nowrap: true },
  { id: 'views', header: '조회수', align: 'end' },
];

/** 헤더 전체선택의 보이지 않는 라벨 id — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'notices-select-all-label';

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

/** 좌: 고정 폭 필터 레일 / 우: 남는 폭 전부(minmax(0,…) 이라야 표가 그리드를 밀지 않는다 — 실화면과 같다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const filterGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const filterHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const filterButtonStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: active ? cssVar('color.border.default') : 'transparent',
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  cursor: 'pointer',
  textAlign: 'start',
  ...typography('typography.label.md'),
});

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const titleCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const titleTextStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  color: cssVar('color.action.primary.default'),
};

const actionCellWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
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

/* ── 좌측 필터 패널 조립(FilterPanel 미러: 제목 + 목록 + aria-pressed + 건수 Badge) ─────────── */

interface FilterGroupProps<V extends string> {
  readonly heading: string;
  readonly navLabel: string;
  readonly options: readonly { readonly id: V; readonly label: string }[];
  readonly value: V;
  readonly counts: Readonly<Record<string, number>> | null;
  readonly onChange: (value: V) => void;
}

function FilterGroup<V extends string>({
  heading,
  navLabel,
  options,
  value,
  counts,
  onChange,
}: FilterGroupProps<V>) {
  return (
    <nav aria-label={navLabel} style={filterGroupStyle}>
      <p style={filterHeadingStyle}>{heading}</p>
      <ul style={filterListStyle}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={active}
                style={filterButtonStyle(active)}
                onClick={() => onChange(option.id)}
              >
                <span>{option.label}</span>
                {/* 건수를 아직 모르면 '—' 를 둔다(0 과 '모름' 은 다르다) — 첫 로드 중이 그렇다 */}
                {counts === null ? (
                  <span aria-hidden>—</span>
                ) : (
                  <Badge count={counts[option.id] ?? 0} hideWhenZero={false} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface NoticesScreenProps {
  /** 최초 로드 스켈레톤 — Table loading (재조회가 아니라 첫 로드만 · STATE-01) */
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialCategory?: CategoryFilter;
  readonly initialStatus?: StatusFilter;
  readonly initialSelectedIds?: readonly string[];
}

function NoticesScreen({
  loading = false,
  initialKeyword = '',
  initialCategory = 'all',
  initialStatus = 'all',
  initialSelectedIds = [],
}: NoticesScreenProps) {
  const [notices, setNotices] = useState<readonly DemoNotice[]>(DEMO_NOTICES);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [pendingDelete, setPendingDelete] = useState<DemoNotice | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // 분류 + 상태(AND) + 제목 키워드 — 실화면 data-source.applyQuery 미러
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return notices.filter((notice) => {
      if (category !== 'all' && notice.category !== category) return false;
      if (status !== 'all' && notice.status !== status) return false;
      if (kw === '') return true;
      return notice.title.toLowerCase().includes(kw);
    });
  }, [notices, keyword, category, status]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIndex = (safePage - 1) * PAGE_SIZE;

  const selection = tableSelectionState(pageRows, selectedIds);
  const selectedCount = selectedIds.size;
  const hasActiveFilters = category !== 'all' || status !== 'all';

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
      for (const notice of pageRows) {
        if (checked) next.add(notice.id);
        else next.delete(notice.id);
      }
      return next;
    });
  };

  // 조건이 바뀌면 1페이지로 되돌리고 선택을 비운다(실화면 useListState 미러 · STATE-04-b)
  const changeKeyword = (next: string): void => {
    setKeyword(next);
    setPage(1);
    setSelectedIds(new Set());
  };
  const changeCategory = (next: CategoryFilter): void => {
    setCategory(next);
    setPage(1);
    setSelectedIds(new Set());
  };
  const changeStatus = (next: StatusFilter): void => {
    setStatus(next);
    setPage(1);
    setSelectedIds(new Set());
  };

  const removeNotices = (ids: readonly string[]): void => {
    const doomed = new Set(ids);
    setNotices((prev) => prev.filter((notice) => !doomed.has(notice.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of doomed) next.delete(id);
      return next;
    });
  };

  const createButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      공지 등록
    </Button>
  );

  const rows: TableProps['rows'] = pageRows.map((notice, index) => ({
    id: notice.id,
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 NoticesTable 미러)
    selected: selectedIds.has(notice.id),
    onActivate: () => {
      /* 실화면: 행을 누르면 공지 상세(/content/notices/:id)로 이동한다 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={notice.id}
        label={`${notice.title} 선택`}
        checked={selectedIds.has(notice.id)}
        onToggle={(checked) => toggleOne(notice.id, checked)}
      />,
      <SeqCell key="seq" seq={startIndex + index + 1} />,
    ],
    cells: [
      <span key="title" style={titleCellStyle}>
        {notice.pinned && <StatusBadge tone="warning" label="고정" />}
        <span style={titleTextStyle}>{notice.title}</span>
      </span>,
      CATEGORY_LABEL[notice.category],
      <StatusBadge
        key="status"
        tone={STATUS_TONE[notice.status]}
        label={STATUS_LABEL[notice.status]}
      />,
      notice.author,
      formatDateTime(notice.publishedAtIso),
      fmt(notice.views),
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <span style={actionCellWrapStyle}>
          {/* 수정은 상세에서 한다 — 실화면도 행에는 삭제만 둔다(onEdit 없음) */}
          <RowActions label={notice.title} onDelete={() => setPendingDelete(notice)} />
        </span>
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>공지사항</h1>

      <div style={layoutStyle}>
        <aside style={railStyle}>
          <FilterGroup
            heading="분류"
            navLabel="공지 분류 필터"
            options={CATEGORY_FILTERS}
            value={category}
            counts={loading ? null : CATEGORY_COUNTS}
            onChange={changeCategory}
          />
          <FilterGroup
            heading="상태"
            navLabel="공지 상태 필터"
            options={STATUS_FILTERS}
            value={status}
            counts={loading ? null : STATUS_COUNTS}
            onChange={changeStatus}
          />
        </aside>

        <div style={columnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                label="공지 제목 검색"
                value={keyword}
                placeholder="공지 제목 검색"
                onChange={changeKeyword}
              />
            </span>
            {createButton}
          </div>

          <p style={summaryStyle} aria-busy={loading}>
            {loading ? '불러오는 중…' : `전체 ${fmt(total)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
          <SelectionBar count={selectedCount} noun="건" onClear={() => setSelectedIds(new Set())}>
            <Button variant="danger" onClick={() => setBulkOpen(true)}>
              {`선택 ${fmt(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <Table
            caption="공지사항 목록 — 행을 누르면 공지 상세로 이동해요. 체크박스·삭제 버튼은 각자 따로 동작해요."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 공지 전체 선택"
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
                label="공지사항"
                hasQuery={keyword.trim() !== ''}
                hasActiveFilters={hasActiveFilters}
                action={createButton}
                onClearSearch={() => changeKeyword('')}
                onResetFilters={() => {
                  changeCategory('all');
                  setStatus('all');
                }}
              />
            }
          />

          <Pagination
            page={safePage}
            totalPages={totalPages}
            label="공지사항 페이지"
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </div>

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="공지 삭제"
          message={`'${pendingDelete.title}' 공지를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="공지 삭제"
          onConfirm={() => {
            removeNotices([pendingDelete.id]);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="공지 일괄 삭제"
          message={`선택한 공지 ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removeNotices([...selectedIds]);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 고정 공지 2건이 맨 위에 오고 게시·임시저장·예약이 섞인 기본 목록(선택 없음 · 12건 · 2페이지) */
export const Default: Story = {
  render: () => <NoticesScreen />,
};

/** 최초 로드: 표 스켈레톤 + 좌측 건수 '—'(모름) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <NoticesScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 · 등록 복구 경로) */
export const Empty: Story = {
  render: () => <NoticesScreen initialKeyword="등록되지 않은 공지" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <NoticesScreen initialSelectedIds={['NT-002', 'NT-004']} />,
};

/** 필터 적용: 분류=점검 · 상태=예약(AND) — 좌측 두 축이 함께 걸린 좁힌 목록 */
export const Filtered: Story = {
  render: () => <NoticesScreen initialCategory="maintenance" initialStatus="scheduled" />,
};
