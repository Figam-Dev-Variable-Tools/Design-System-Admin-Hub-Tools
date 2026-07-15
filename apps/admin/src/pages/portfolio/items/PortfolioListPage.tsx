// PortfolioListPage — 포트폴리오 목록 (라우트: /portfolio/items) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 분류 필터 + 노출 인라인 토글을 얹는다.
// 목록엔 이미지 열을 넣지 않는다(전 섹션 규칙) — 이미지는 상세/등록/수정 폼에서만 다룬다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { fetchPortfolioCategoryOptions, portfolioAdapter } from './data-source';
import { categoryTone, toPortfolioInput } from './types';
import { publishToggleColumn } from '../_shared/publishColumn';
import { filterPortfolioItems, PORTFOLIO_FILTER_ALL } from '../_shared/store';
import type { PortfolioItem, PortfolioItemInput } from '../_shared/store';

const RESOURCE = 'portfolio';
const ENTITY_LABEL = '포트폴리오';
const LIST_PATH = '/portfolio/items';

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filterStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 6)',
};

const summaryCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 10)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: PortfolioItem) => item.title;

export default function PortfolioListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState(PORTFOLIO_FILTER_ALL);

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
            ? `'${item.title}' 을(를) 게시했습니다.`
            : `'${item.title}' 을(를) 숨겼습니다.`,
        },
      ),
    ),
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <span style={filterStyle}>
        <SelectField
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
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
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        포트폴리오 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      selectAllLabelId="portfolio-select-all"
      emptyLabel="등록된 포트폴리오가 없습니다."
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
