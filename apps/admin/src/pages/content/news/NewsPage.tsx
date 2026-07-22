// NewsPage — 뉴스·보도자료 목록 (라우트: /content/news)
//
// 좌: 분류 필터 / 우: 검색 + 상태 + 등록 + 표. 공용 목록 키트(useCrudList + CrudListShell)를 쓰고
// 조회 상태의 단일 원천은 URL 이다 (IA-13 · useListState).
//
// [정렬은 고정 → 발행일이다] 저장소가 그 순서로 내려주므로 표는 받은 순서를 그대로 그린다.
// 고정글이 오래됐다고 아래로 밀리면 고정의 의미가 사라진다(types.sortNewsPosts 머리말).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { cssVar, SelectField, StatusBadge } from '@tds/ui';

import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { mediaCatalog } from '../../../shared/domain/media-library';
import { PUBLISH_STATUS_LABEL, PUBLISH_STATUS_TONE } from '../../../shared/domain/publish-schedule';
import { formatNumber } from '../../../shared/format';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { Button, FilterPanel, FilterRail, hintStyle, Icon, SearchField } from '../../../shared/ui';
import { NEWS_CATEGORIES, NEWS_RESOURCE, newsPostAdapter } from './data-source';
import {
  attachmentWarning,
  CATEGORY_FILTER_ALL,
  categoryLabelOf,
  countByCategory,
  filterNewsPosts,
  NEWS_LIST_PATH,
  NEWS_STATUS_FILTER_VALUES,
  NEWS_STATUS_FILTERS,
  newsStatus,
  sortNewsPosts,
} from './types';
import type { NewsPost, NewsPostInput, NewsStatusFilter } from './types';

const ENTITY_LABEL = '뉴스';

const FILTER_DEFAULTS = { category: CATEGORY_FILTER_ALL, status: 'all' } as const;

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainStyle: CSSProperties = {
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

const toolbarLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** SelectField 는 style 을 받지 않는다(토큰 보호) — 폭은 감싸는 쪽이 정한다 */
const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const titleCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const CATEGORY_OPTIONS = [
  { id: CATEGORY_FILTER_ALL, label: '전체' },
  ...NEWS_CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
];

const nameOf = (post: NewsPost) => post.title;

export default function NewsPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const categoryId = list.filters['category'] ?? CATEGORY_FILTER_ALL;
  const status: NewsStatusFilter = parseFilter(
    list.filters['status'] ?? 'all',
    NEWS_STATUS_FILTER_VALUES,
    'all',
  );

  const controller = useCrudList<NewsPost, NewsPostInput>({
    resource: NEWS_RESOURCE,
    adapter: newsPostAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });

  const { items, error } = controller;
  const { keyword } = list;

  /** 첨부가 살아 있는지 판정할 원본 — null 은 '없다' 가 아니라 '모른다' 다 */
  const catalog = mediaCatalog();

  const counts = useMemo(
    () => (error === null ? countByCategory(items, NEWS_CATEGORIES) : null),
    [items, error],
  );

  const visibleItems = useMemo(
    // 정렬은 저장소가 이미 했지만, 필터가 걸린 뒤에도 같은 규칙이 유지되어야 한다
    () => sortNewsPosts(filterNewsPosts(items, status, categoryId, keyword, new Date())),
    [items, status, categoryId, keyword],
  );

  const createButton = canCreate ? (
    <Button variant="primary" size="md" onClick={() => navigate(`${NEWS_LIST_PATH}/new`)}>
      <Icon name="plus-circle" />
      뉴스 등록
    </Button>
  ) : null;

  const columns: readonly CrudColumn<NewsPost>[] = [
    {
      header: '제목',
      render: (post) => {
        const warning = attachmentWarning(post.attachmentIds, catalog);
        return (
          <span style={titleCellStyle}>
            {post.pinned && <StatusBadge tone="info" label="고정" />}
            <span>{post.title}</span>
            {post.attachmentIds.length > 0 && (
              <StatusBadge
                tone={warning === null ? 'neutral' : 'danger'}
                label={
                  warning === null
                    ? `첨부 ${formatNumber(post.attachmentIds.length)}`
                    : '첨부 확인 필요'
                }
              />
            )}
          </span>
        );
      },
      sortValue: (post) => post.title,
    },
    {
      header: '분류',
      nowrap: true,
      render: (post) => categoryLabelOf(NEWS_CATEGORIES, post.categoryId),
    },
    {
      header: '상태',
      nowrap: true,
      render: (post) => {
        const effective = newsStatus(post);
        return (
          <StatusBadge
            tone={PUBLISH_STATUS_TONE[effective]}
            label={PUBLISH_STATUS_LABEL[effective]}
          />
        );
      },
    },
    {
      header: '발행일',
      nowrap: true,
      render: (post) => (post.publishAt === '' ? '—' : post.publishAt.replace('T', ' ')),
      sortValue: (post) => post.publishAt,
    },
    {
      header: '최근 수정',
      nowrap: true,
      render: (post) => post.updatedAt.replace('T', ' '),
      sortValue: (post) => post.updatedAt,
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={toolbarLeftStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="뉴스 제목 검색"
          {...list.searchInputProps}
        />
        <span style={filterSlotStyle}>
          <SelectField
            aria-label="상태 필터"
            value={status}
            onChange={(event) =>
              list.setFilter(
                'status',
                parseFilter(event.target.value, NEWS_STATUS_FILTER_VALUES, 'all'),
              )
            }
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
  );

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <p style={hintStyle}>
            목록은 고정 글이 먼저, 그 다음 발행일 순입니다. 첨부파일은 미디어 라이브러리의 파일을
            참조합니다.
          </p>
        }
      >
        <FilterPanel
          navLabel="분류 필터"
          heading="분류"
          options={CATEGORY_OPTIONS}
          value={categoryId}
          counts={counts}
          onChange={(next) => list.setFilter('category', next)}
        />
      </FilterRail>

      <div style={mainStyle}>
        <CrudListShell
          entityLabel={ENTITY_LABEL}
          controller={controller}
          visibleItems={visibleItems}
          columns={columns}
          nameOf={nameOf}
          selectAllLabelId="news-select-all"
          toolbar={toolbar}
          onEdit={(post) => navigate(`${NEWS_LIST_PATH}/${post.id}/edit`)}
          rowTarget={{ kind: 'edit', href: (post) => `${NEWS_LIST_PATH}/${post.id}/edit` }}
          empty={{
            hasQuery: list.hasQuery,
            hasActiveFilters: list.hasActiveFilters,
            onClearSearch: list.clearSearch,
            onResetFilters: list.resetFilters,
            ...(createButton !== null && { createAction: createButton }),
          }}
        />
      </div>
    </div>
  );
}
