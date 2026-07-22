// SitePagesPage — 페이지 관리 목록 (라우트: /content/pages)
//
// 홈페이지의 **임의 페이지**를 만드는 곳이다. 공용 목록 키트(useCrudList + CrudListShell)를 쓰고,
// 조회 상태(상태 필터·검색어)의 단일 원천은 URL 이다 (IA-13 · useListState).
//
// [상태 열이 저장값이 아니다] '예약' 배지는 status 가 아니라 publishAt + 지금 시각에서 나온다
// (shared/domain/publish-schedule). 그래서 예약 시각이 지나면 새로고침만으로 '발행' 이 된다 —
// 아무도 상태를 고쳐 주지 않아도 목록과 홈페이지가 같은 말을 한다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { cssVar, StatusBadge } from '@tds/ui';

import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { PUBLISH_STATUS_LABEL, PUBLISH_STATUS_TONE } from '../../../shared/domain/publish-schedule';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { Button, hintStyle, Icon, SearchField, SelectField } from '../../../shared/ui';
import { sitePageAdapter, SITE_PAGE_RESOURCE } from './data-source';
import {
  filterSitePages,
  SITE_PAGE_LIST_PATH,
  sitePageStatus,
  STATUS_FILTER_VALUES,
  STATUS_FILTERS,
} from './types';
import type { SitePage, SitePageInput, SitePageStatusFilter } from './types';

const ENTITY_LABEL = '페이지';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(같은 화면이 두 URL 을 갖지 않게) */
const FILTER_DEFAULTS = { status: 'all' } as const;

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

/** 필터 드롭다운의 폭 — SelectField 는 style 을 받지 않으므로(토큰 보호) 감싸는 쪽이 정한다 */
const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const titleCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const slugTextStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

const nameOf = (page: SitePage) => page.title;

/** 'YYYY-MM-DDTHH:mm' → 'YYYY-MM-DD HH:mm'. 저장한 그대로 보여 준다(시간대를 옮기지 않는다) */
function stampLabel(value: string): string {
  return value === '' ? '—' : value.replace('T', ' ');
}

export default function SitePagesPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const status: SitePageStatusFilter = parseFilter(
    list.filters['status'] ?? 'all',
    STATUS_FILTER_VALUES,
    'all',
  );

  const controller = useCrudList<SitePage, SitePageInput>({
    resource: SITE_PAGE_RESOURCE,
    adapter: sitePageAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });

  const { items } = controller;
  const { keyword } = list;
  /* 필터·검색은 화면이 소유한다(껍데기는 visibleItems 만 받는다). now 를 한 번만 만들어
     목록 전체가 **같은 시각 기준**으로 판정되게 한다 — 행마다 new Date() 를 부르면
     자정 근처에서 한 표 안의 두 행이 다른 날을 본다. */
  const visibleItems = useMemo(
    () => filterSitePages(items, status, keyword, new Date()),
    [items, status, keyword],
  );

  const createButton = canCreate ? (
    <Button variant="primary" size="md" onClick={() => navigate(`${SITE_PAGE_LIST_PATH}/new`)}>
      <Icon name="plus-circle" />
      페이지 등록
    </Button>
  ) : null;

  const columns: readonly CrudColumn<SitePage>[] = [
    {
      header: '제목',
      render: (page) => (
        <span style={titleCellStyle}>
          <span>{page.title}</span>
          <span style={slugTextStyle}>{`/${page.slug}`}</span>
        </span>
      ),
      sortValue: (page) => page.title,
    },
    {
      header: '상태',
      nowrap: true,
      render: (page) => {
        const effective = sitePageStatus(page);
        return (
          <StatusBadge
            tone={PUBLISH_STATUS_TONE[effective]}
            label={PUBLISH_STATUS_LABEL[effective]}
          />
        );
      },
    },
    {
      header: '공개 일시',
      nowrap: true,
      render: (page) => stampLabel(page.publishAt),
      sortValue: (page) => page.publishAt,
    },
    {
      header: '옛 주소',
      nowrap: true,
      // 옛 주소가 남아 있다는 것은 '이 페이지의 주소가 한 번 바뀌었다' 는 뜻이다 —
      // 링크가 깨진 신고가 들어왔을 때 가장 먼저 보게 되는 열이다.
      render: (page) =>
        page.previousSlugs.length === 0 ? (
          '—'
        ) : (
          <span style={slugTextStyle}>
            {page.previousSlugs.map((slug) => `/${slug}`).join(', ')}
          </span>
        ),
    },
    {
      header: '최근 수정',
      nowrap: true,
      render: (page) => stampLabel(page.updatedAt),
      sortValue: (page) => page.updatedAt,
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={toolbarLeftStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="페이지 제목·주소 검색"
          {...list.searchInputProps}
        />
        <span style={filterSlotStyle}>
          <SelectField
            aria-label="상태 필터"
            value={status}
            onChange={(event) =>
              list.setFilter('status', parseFilter(event.target.value, STATUS_FILTER_VALUES, 'all'))
            }
          >
            {STATUS_FILTERS.map((filter) => (
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
    <>
      <CrudListShell
        entityLabel={ENTITY_LABEL}
        controller={controller}
        visibleItems={visibleItems}
        columns={columns}
        nameOf={nameOf}
        selectAllLabelId="site-pages-select-all"
        toolbar={toolbar}
        onEdit={(page) => navigate(`${SITE_PAGE_LIST_PATH}/${page.id}/edit`)}
        rowTarget={{
          kind: 'edit',
          href: (page) => `${SITE_PAGE_LIST_PATH}/${page.id}/edit`,
        }}
        empty={{
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
          ...(createButton !== null && { createAction: createButton }),
        }}
      />
      <p style={hintStyle}>
        발행된 페이지의 주소를 바꾸면 기존 링크가 끊깁니다. 옛 주소는 보관되며 목록의 &apos;옛
        주소&apos; 열에서 확인할 수 있습니다.
      </p>
    </>
  );
}
