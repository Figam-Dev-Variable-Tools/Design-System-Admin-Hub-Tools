/**
 * Design System/Templates/Content/News — 뉴스·보도자료 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/news` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "News" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/news', '뉴스·보도자료', 'News']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/news/NewsPage.tsx (라우트 /content/news) 와
 * 그 규칙(types.ts) · 데이터(data-source.ts) · 공용 껍데기(shared/crud/CrudListShell).
 *
 * [왜 공지사항과 따로인가] 공지는 **서비스 이용자에게 알리는 글**이고, 뉴스는 회사가 밖으로
 * 내보내는 소식이다. 독자·톤·수명이 다르고 홈페이지에서 서는 자리도 다르다 — 한 게시판에 섞으면
 * 방문자가 점검 안내와 수상 소식을 같은 목록에서 보게 된다.
 *
 * [정렬은 고정 → 발행일 내림차순이다] 고정을 발행일보다 **먼저** 본다. 순서가 뒤집히면 오래된
 * 고정글이 최신글 아래로 밀려 고정의 의미가 사라진다. 공개 시각이 비어 있는 글(즉시 공개·초안)은
 * 최근 수정 시각을 대신 본다 — 정렬 기준이 비었다고 맨 아래로 몰리면 방금 쓴 초안을 찾을 수 없다.
 *
 * [상태는 저장값이 아니다] '예약' 은 status + publishAt + 지금 시각의 파생값이다(페이지 관리와
 * 같은 규칙). 스토리는 판정 기준 시각을 `NOW` 로 고정한다 — `new Date()` 를 읽으면 회귀 비교가
 * 매일 깨진다.
 *
 * [첨부 축은 없다] 예전에는 미디어 라이브러리의 자산을 첨부로 걸었다. 그 화면이 IA 에서 빠지면서
 * 참조가 가리킬 정본이 사라졌고, 실화면과 함께 이 스토리에서도 첨부를 걷었다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 조각은 DS 표면으로 갈음한다:
 *   FilterRail/FilterPanel  → Panel(notice) + 토큰 <nav>(aria-pressed + 건수 배지)
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 분류 필터            → Panel + 토큰 <nav>(aria-pressed + 건수 배지)
 *   뉴스 제목 검색            → SearchField
 *   상태 필터                → SelectField
 *   뉴스 등록                → Button(primary) + Icon(plus-circle)
 *   전체선택 / 행 선택칸       → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                  → SeqHeaderCell · SeqCell
 *   고정 배지                → StatusBadge(info)
 *   상태 배지(파생)           → StatusBadge
 *   행 액션(수정·삭제)        → RowActions
 *   선택 일괄 삭제 바         → SelectionBar + Button(danger)
 *   삭제 확인                → ConfirmDialog(intent=delete)
 *   목록 표                  → Table
 *   빈 결과                  → Empty
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
  Panel,
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
  title: 'Design System/Templates/Content/News',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 발행 상태(실화면 shared/domain/publish-schedule 미러) ─────────────────────────────────── */

type StoredPublishStatus = 'draft' | 'published' | 'archived';
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

/** 판정 기준 시각 — 실화면은 `new Date()` 를 한 번만 만든다. 스토리는 그 한 번을 고정한다 */
const NOW = '2026-07-22T09:00';

function newsStatus(post: DemoPost): PublishStatus {
  if (post.status !== 'published') return post.status;
  if (post.publishAt === '') return 'published';
  return post.publishAt > NOW ? 'scheduled' : 'published';
}

/* ── 분류 · 글(실화면 types.ts · data-source.ts 미러) ──────────────────────────────────────── */

interface NewsCategory {
  readonly id: string;
  readonly label: string;
}

/**
 * 분류는 **한 단계뿐**이다. 보도자료의 분류는 열 개를 넘지 않는다 — 그 규모에 2뎁스를 열면
 * 운영자가 어디에 넣을지 매번 고민하고 방문자는 두 번 눌러야 목록에 닿는다.
 */
const NEWS_CATEGORIES: readonly NewsCategory[] = [
  { id: 'press', label: '언론보도' },
  { id: 'award', label: '수상·인증' },
  { id: 'notice', label: '공시·알림' },
];

interface DemoPost {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  /** 상단 고정 — 목록 맨 위에 붙는다. 발행일과 무관하다 */
  readonly pinned: boolean;
  readonly status: StoredPublishStatus;
  readonly publishAt: string;
  readonly updatedAt: string;
}

const DEMO_POSTS: readonly DemoPost[] = [
  {
    id: 'nw-001',
    title: '공간 데이터 분석 솔루션 정식 출시',
    categoryId: 'press',
    pinned: true,
    status: 'published',
    publishAt: '2026-05-12T09:00',
    updatedAt: '2026-05-12T09:00',
  },
  {
    id: 'nw-002',
    title: '기업부설 연구소 인증 획득',
    categoryId: 'award',
    pinned: false,
    status: 'published',
    publishAt: '2026-04-03T10:00',
    updatedAt: '2026-04-03T10:00',
  },
  {
    id: 'nw-003',
    title: '본사 이전 안내',
    categoryId: 'notice',
    pinned: false,
    status: 'published',
    publishAt: '2026-02-20T14:00',
    updatedAt: '2026-02-20T14:00',
  },
  {
    id: 'nw-004',
    title: '하반기 채용 브랜딩 캠페인 시작',
    categoryId: 'press',
    pinned: false,
    status: 'published',
    // 미래 시각 — '예약' 상태 경로를 목록에서 실제로 밟게 하는 씨앗이다
    publishAt: '2026-12-15T09:00',
    updatedAt: '2026-07-01T11:20',
  },
  {
    id: 'nw-005',
    title: '연말 결산 자료 (작성 중)',
    categoryId: 'notice',
    pinned: false,
    status: 'draft',
    publishAt: '',
    updatedAt: '2026-07-05T16:40',
  },
];

/**
 * 고정 → 발행일 내림차순(실화면 sortNewsPosts 미러).
 * 공개 시각이 비어 있는 글은 최근 수정 시각을 대신 본다.
 */
function sortPosts(list: readonly DemoPost[]): readonly DemoPost[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const left = a.publishAt === '' ? a.updatedAt : a.publishAt;
    const right = b.publishAt === '' ? b.updatedAt : b.publishAt;
    if (left !== right) return right.localeCompare(left);
    return a.id.localeCompare(b.id);
  });
}

/* ── 필터(실화면 NEWS_STATUS_FILTERS · filterNewsPosts · countByCategory 미러) ──────────────── */

type NewsStatusFilter = PublishStatus | 'all';

const NEWS_STATUS_FILTERS: readonly { readonly id: NewsStatusFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'scheduled', label: '예약' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
];

const CATEGORY_FILTER_ALL = 'all';

const CATEGORY_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: CATEGORY_FILTER_ALL, label: '전체' },
  ...NEWS_CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
];

function countByCategory(posts: readonly DemoPost[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = { [CATEGORY_FILTER_ALL]: posts.length };
  for (const category of NEWS_CATEGORIES) {
    counts[category.id] = posts.filter((post) => post.categoryId === category.id).length;
  }
  return counts;
}

function filterPosts(
  posts: readonly DemoPost[],
  status: NewsStatusFilter,
  categoryId: string,
  keyword: string,
): readonly DemoPost[] {
  const needle = keyword.trim().toLowerCase();
  return posts.filter((post) => {
    if (status !== 'all' && newsStatus(post) !== status) return false;
    if (categoryId !== CATEGORY_FILTER_ALL && post.categoryId !== categoryId) return false;
    if (needle === '') return true;
    return post.title.toLowerCase().includes(needle);
  });
}

const categoryLabelOf = (categoryId: string): string =>
  NEWS_CATEGORIES.find((category) => category.id === categoryId)?.label ?? '미분류';

const ENTITY_LABEL = '뉴스';
const SELECT_ALL_LABEL_ID = 'news-select-all';
const PAGE_SIZE = 10;

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 5개 — 선택·순번은 leading, 액션은 trailing) ─────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'category', header: '분류', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'publishAt', header: '발행일', nowrap: true },
  { id: 'updatedAt', header: '최근 수정', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const mainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const filterNavStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const filterHeadingStyle: CSSProperties = {
  margin: 0,
  marginLeft: cssVar('space.3'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const filterItemStyle = (active: boolean): CSSProperties => ({
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
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  textAlign: 'left',
  cursor: 'pointer',
});

const countBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: cssVar('space.5'),
  aspectRatio: '1',
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
  lineHeight: '1',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const noticeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
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
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  minWidth: 0,
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

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

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

interface NewsScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialStatus?: NewsStatusFilter;
  readonly initialCategoryId?: string;
  readonly initialSelectedIds?: readonly string[];
}

function NewsScreen({
  loading = false,
  initialKeyword = '',
  initialStatus = 'all',
  initialCategoryId = CATEGORY_FILTER_ALL,
  initialSelectedIds = [],
}: NewsScreenProps) {
  const [posts, setPosts] = useState<readonly DemoPost[]>(DEMO_POSTS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<NewsStatusFilter>(initialStatus);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoPost | null>(null);

  const counts = useMemo(() => countByCategory(posts), [posts]);

  // 정렬은 저장소가 이미 했지만, 필터가 걸린 뒤에도 같은 규칙이 유지되어야 한다
  const visible = useMemo(
    () => sortPosts(filterPosts(posts, status, categoryId, keyword)),
    [posts, status, categoryId, keyword],
  );

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
      for (const post of visible) {
        if (checked) next.add(post.id);
        else next.delete(post.id);
      }
      return next;
    });
  };

  const removePost = (id: string): void => {
    setPosts((prev) => prev.filter((post) => post.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((post, index) => {
    const current = newsStatus(post);
    return {
      id: post.id,
      onActivate: () => {
        /* 실화면: 행 클릭 → 뉴스 수정(/content/news/:id/edit) */
      },
      selected: selectedIds.has(post.id),
      leading: [
        <RowSelectCell
          key="select"
          id={post.id}
          label={`${post.title} 선택`}
          checked={selectedIds.has(post.id)}
          onToggle={(checked) => toggleOne(post.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        <span key="title" style={titleCellStyle}>
          {post.pinned && <StatusBadge tone="info" label="고정" />}
          <span>{post.title}</span>
        </span>,
        <span key="category">{categoryLabelOf(post.categoryId)}</span>,
        <StatusBadge
          key="status"
          tone={PUBLISH_STATUS_TONE[current]}
          label={PUBLISH_STATUS_LABEL[current]}
        />,
        <span key="publishAt" style={stampStyle}>
          {post.publishAt === '' ? '—' : post.publishAt.replace('T', ' ')}
        </span>,
        <span key="updatedAt" style={stampStyle}>
          {post.updatedAt.replace('T', ' ')}
        </span>,
      ],
      trailing: [
        <td key="actions" style={actionCellStyle}>
          <RowActions
            label={post.title}
            onEdit={() => {
              /* 실화면: 연필 → 뉴스 수정 */
            }}
            onDelete={() => setConfirming(post)}
          />
        </td>,
      ],
    };
  });

  const createButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      뉴스 등록
    </Button>
  );

  return (
    <div style={layoutStyle}>
      <Panel notice={<p style={noticeStyle}>목록은 고정 글이 먼저, 그 다음 발행일 순이에요.</p>}>
        <nav style={filterNavStyle} aria-label="분류 필터">
          <h2 style={filterHeadingStyle}>분류</h2>
          <ul style={filterListStyle}>
            {CATEGORY_OPTIONS.map((option) => {
              const active = categoryId === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => setCategoryId(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={countBadgeStyle}>{fmt(counts[option.id] ?? 0)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </Panel>

      <div style={mainStyle}>
        <div style={toolbarStyle}>
          <div style={toolbarLeftStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                value={keyword}
                onChange={setKeyword}
                label="뉴스 제목 검색"
                placeholder="뉴스 제목 검색"
              />
            </span>
            <span style={filterSlotStyle}>
              <SelectField
                value={status}
                aria-label="상태 필터"
                onChange={(event) => {
                  const next = NEWS_STATUS_FILTERS.find(
                    (filter) => filter.id === event.target.value,
                  );
                  setStatus(next === undefined ? 'all' : next.id);
                }}
              >
                {NEWS_STATUS_FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </SelectField>
            </span>
          </div>
          {createButton}
        </div>

        <p style={summaryStyle}>
          {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
          {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
        </p>

        <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
          <Button
            variant="danger"
            onClick={() => {
              for (const id of selectedIds) removePost(id);
            }}
          >
            {`선택 ${fmt(selectedCount)}건 삭제`}
          </Button>
        </SelectionBar>

        <div style={tableScrollStyle}>
          <Table
            caption="뉴스·보도자료 목록 — 고정 글이 먼저, 그 다음 발행일 순이에요. 행을 누르면 수정으로 이동해요."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 뉴스 전체 선택"
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
                hasActiveFilters={status !== 'all' || categoryId !== CATEGORY_FILTER_ALL}
                onClearSearch={() => setKeyword('')}
                onResetFilters={() => {
                  setStatus('all');
                  setCategoryId(CATEGORY_FILTER_ALL);
                }}
                action={createButton}
              />
            }
          />
        </div>
      </div>

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="뉴스 삭제"
          message={`'${confirming.title}' 글을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="뉴스 삭제"
          onConfirm={() => {
            removePost(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 고정 글이 발행일과 무관하게 맨 위에 서고, 미래 시각의 글은 '예약' 으로 표시된다. */
export const Default: Story = {
  render: () => <NewsScreen />,
};

/** 최초 로드: 표 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <NewsScreen loading />,
};

/** 예약 필터: 저장값은 '발행' 인데 아직 공개되지 않은 글 — 시각이 지나면 스스로 '발행' 이 된다 */
export const Scheduled: Story = {
  render: () => <NewsScreen initialStatus="scheduled" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <NewsScreen initialSelectedIds={['nw-002', 'nw-005']} />,
};

/** 빈 결과: 분류 + 검색이 맞지 않음 — Empty(검색 지우기 · 필터 초기화 · 등록) */
export const Empty: Story = {
  render: () => <NewsScreen initialCategoryId="award" initialKeyword="본사 이전" />,
};
