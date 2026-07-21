// PortfolioListPage — 포트폴리오 목록 (라우트: /portfolio/items)
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 분류 필터 + 노출 인라인 토글을 얹는다.
// 목록엔 이미지 열을 넣지 않는다(전 섹션 규칙) — 이미지는 상세/등록/수정 폼에서만 다룬다.
//
// [조회 상태의 소유자] 분류 필터는 이 파일의 useState 였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — 분류를 걸어 놓고 한 건을 고치러 갔다 Back 하면 그
// 조건이 그대로 살아 있고, 그 URL 을 그대로 공유할 수 있다. 카테고리 관리 화면의 '3개 사용 중'
// 배지도 이 파라미터로 이 목록을 연다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList, useCrudRowUpdate, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { fetchPortfolioCategoryOptions, portfolioAdapter } from './data-source';
import { categoryTone, toPortfolioInput } from './types';
import { publishToggleColumn } from '../_shared/publishColumn';
import { filterPortfolioItems, PORTFOLIO_FILTER_ALL } from '../_shared/store';
import type { PortfolioItem, PortfolioItemInput } from '../_shared/store';
import { objectParticle } from '../../../shared/format';
import { cssVar } from '@tds/ui';

const RESOURCE = 'portfolio';
const ENTITY_LABEL = '포트폴리오';
const LIST_PATH = '/portfolio/items';

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filterStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const summaryCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: PortfolioItem) => item.title;

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { category: PORTFOLIO_FILTER_ALL } as const;

export default function PortfolioListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 분류의 단일 원천 = URL (IA-13).
  // [왜 parseFilter 를 쓰지 않나] 분류 id 는 운영자가 만드는 값이라 닫힌 유니온이 없고, 목록은
  // 비동기로 늦게 온다 — 허용값과 대조하면 도착 전의 정상 id 까지 '전체'로 되돌려 버린다.
  // 모르는 id 는 filterPortfolioItems 가 빈 목록으로 흘려보낸다(조회가 깨지지 않는다 — 상품 목록과 같다).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const filter = list.filters['category'] ?? PORTFOLIO_FILTER_ALL;

  const controller = useCrudList<PortfolioItem, PortfolioItemInput>({
    resource: RESOURCE,
    adapter: portfolioAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<PortfolioItem, PortfolioItemInput>(RESOURCE, portfolioAdapter);

  const categoriesQuery = useQuery({
    queryKey: [RESOURCE, 'category-options'],
    queryFn: ({ signal }) => fetchPortfolioCategoryOptions(signal),
  });
  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    clear();
  }, [filter, clear]);

  const visible = useMemo(
    () => filterPortfolioItems(controller.items, filter),
    [controller.items, filter],
  );

  const columns: readonly CrudColumn<PortfolioItem>[] = [
    {
      header: '분류',
      nowrap: true,
      render: (item) => (
        <StatusBadge tone={categoryTone(item.categoryId)} label={item.categoryLabel} />
      ),
    },
    { header: '제목', render: (item) => item.title },
    { header: '고객사', render: (item) => <span style={summaryCellStyle}>{item.client}</span> },
    { header: '일자', nowrap: true, render: (item) => item.date },
    publishToggleColumn<PortfolioItem>(toggle.pendingId, (item, next) =>
      toggle.run(
        item.id,
        { ...toPortfolioInput(item), published: next },
        {
          success: next
            ? `'${item.title}'${objectParticle(item.title)} 게시했습니다.`
            : `'${item.title}'${objectParticle(item.title)} 숨겼습니다.`,
        },
      ),
    ),
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <span style={filterStyle}>
        <SelectField
          value={filter}
          onChange={(event) => list.setFilter('category', event.target.value)}
          aria-label="분류로 거르기"
        >
          <option value={PORTFOLIO_FILTER_ALL}>전체 분류</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
      </span>
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          포트폴리오 등록
        </Button>
      )}
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      empty={{
        hasActiveFilters: list.hasActiveFilters,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="portfolio-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
