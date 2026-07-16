// ProjectListPage — 프로젝트(영업 기회) 목록 (라우트: /sales/projects) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 단계 필터 + 검색 + 진척률 + 단계 배지 + 삭제팝업을
// 얹는다. 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { formatWon } from '../_shared/business';
import { projectAdapter } from './data-source';
import {
  filterProjects,
  PROJECT_FILTER_ALL,
  searchProjects,
  STAGES,
  stageLabel,
  stageTone,
} from './types';
import type { Project, ProjectInput, StageFilter } from './types';

const RESOURCE = 'sales-projects';
const ENTITY_LABEL = '프로젝트';
const LIST_PATH = '/sales/projects';
const STAGE_FILTER_VALUES: readonly StageFilter[] = [
  PROJECT_FILTER_ALL,
  ...STAGES.map((stage) => stage.id),
];

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 5)' };

const periodStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const progressWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 'calc(var(--tds-space-6) * 3)',
};

const progressTrackStyle: CSSProperties = {
  position: 'relative',
  flexGrow: 1,
  height: 'var(--tds-space-2)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-surface-raised)',
  overflow: 'hidden',
};

function progressFillStyle(progress: number): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: `${String(Math.max(0, Math.min(100, progress)))}%`,
    background: 'var(--tds-color-action-primary-default)',
  };
}

const progressLabelStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--tds-color-text-muted)',
};

const nameOf = (item: Project) => item.name;

export default function ProjectListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StageFilter>(PROJECT_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const controller = useCrudList<Project, ProjectInput>({
    resource: RESOURCE,
    adapter: projectAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchProjects(filterProjects(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<Project>[] = [
    {
      header: '단계',
      nowrap: true,
      render: (item) => <StatusBadge tone={stageTone(item.stage)} label={stageLabel(item.stage)} />,
    },
    { header: '프로젝트명', render: (item) => item.name },
    { header: '거래처', render: (item) => item.accountName },
    { header: '예상매출', numeric: true, render: (item) => formatWon(item.expectedRevenue) },
    {
      header: '기간',
      nowrap: true,
      render: (item) => <span style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
    {
      header: '진척',
      render: (item) => (
        <span style={progressWrapStyle}>
          <span style={progressTrackStyle} aria-hidden="true">
            <span style={progressFillStyle(item.progress)} />
          </span>
          <span style={progressLabelStyle}>{`${formatNumber(item.progress)}%`}</span>
        </span>
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="프로젝트명·거래처 검색"
          placeholder="프로젝트명 · 거래처 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) =>
              setFilter(parseFilter(event.target.value, STAGE_FILTER_VALUES, PROJECT_FILTER_ALL))
            }
            aria-label="단계로 거르기"
          >
            <option value={PROJECT_FILTER_ALL}>전체 단계</option>
            {STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        프로젝트 등록
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
      empty={{
        hasQuery: keyword !== '',
        hasActiveFilters: filter !== PROJECT_FILTER_ALL,
        onClearSearch: () => setKeyword(''),
        onResetFilters: () => setFilter(PROJECT_FILTER_ALL),
      }}
      selectAllLabelId="project-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
