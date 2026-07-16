// EsgListPage — ESG 목록 (라우트: /company/esg) · A41 소유
//
// 카테고리별(환경/사회/지배구조) 좌측 필터 + 목록 + 등록/수정 폼(별도 라우트) + 삭제팝업.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList, type CrudColumn } from '../../../shared/crud';
import { esgAdapter } from './data-source';
import { EsgCategoryFilter } from './EsgCategoryFilter';
import {
  countEsgByCategory,
  esgCategoryLabel,
  esgCategoryTone,
  ESG_FILTER_ALL,
  filterEsg,
} from './types';
import type { EsgFilter, EsgInput, EsgItem } from './types';

const RESOURCE = 'esg';
const ENTITY_LABEL = 'ESG 활동';
const LIST_PATH = '/company/esg';

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'calc(var(--tds-space-6) * 8) minmax(0, 1fr)',
  gap: 'var(--tds-space-6)',
  alignItems: 'start',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const summaryCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 12)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: EsgItem) => item.title;

export default function EsgListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<EsgFilter>(ESG_FILTER_ALL);

  const controller = useCrudList<EsgItem, EsgInput>({
    resource: RESOURCE,
    adapter: esgAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [filter, clear]);

  const counts = useMemo(() => countEsgByCategory(controller.items), [controller.items]);
  const visible = useMemo(() => filterEsg(controller.items, filter), [controller.items, filter]);

  const columns: readonly CrudColumn<EsgItem>[] = [
    {
      header: '분류',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={esgCategoryTone(item.category)}
          label={esgCategoryLabel(item.category)}
        />
      ),
    },
    { header: '제목', render: (item) => item.title },
    { header: '내용', render: (item) => <span style={summaryCellStyle}>{item.summary}</span> },
    { header: '일자', nowrap: true, render: (item) => item.date },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        ESG 활동 등록
      </Button>
    </div>
  );

  return (
    <div style={layoutStyle}>
      <EsgCategoryFilter filter={filter} counts={counts} onChange={setFilter} />

      <CrudListShell
        entityLabel={ENTITY_LABEL}
        controller={controller}
        visibleItems={visible}
        columns={columns}
        nameOf={nameOf}
        empty={{
          hasActiveFilters: filter !== ESG_FILTER_ALL,
          onResetFilters: () => setFilter(ESG_FILTER_ALL),
        }}
        selectAllLabelId="esg-select-all"
        toolbar={toolbar}
        onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
      />
    </div>
  );
}
