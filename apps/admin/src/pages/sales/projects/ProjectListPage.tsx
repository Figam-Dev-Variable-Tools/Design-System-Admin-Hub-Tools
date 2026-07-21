// ProjectListPage — 프로젝트(영업 기회) 목록 (라우트: /sales/projects)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 단계 필터 + 검색 + 진척률 + 단계 배지 + 삭제팝업을
// 얹는다. 목록엔 이미지 열이 없다.
//
// [조회 상태의 소유자] 단계 필터·검색어는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '제안' 단계만 걸러 놓고 프로젝트 상세로 갔다 Back 하면
// 그 파이프라인 view 가 그대로 살아 있고, 주간 회의에 그 URL 을 그대로 붙여 넣을 수 있다.
// 검색은 IME 안전이다 (COMP-10).
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import { Button, Icon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { AccountLink } from '../_shared/AccountLink';
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
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-projects';
const ENTITY_LABEL = '프로젝트';
const LIST_PATH = '/sales/projects';
const STAGE_FILTER_VALUES: readonly StageFilter[] = [
  PROJECT_FILTER_ALL,
  ...STAGES.map((stage) => stage.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { stage: PROJECT_FILTER_ALL } as const;

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const progressWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: `calc(${cssVar('space.6')} * 3)`,
};

const progressTrackStyle: CSSProperties = {
  position: 'relative',
  flexGrow: 1,
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  overflow: 'hidden',
};

function progressFillStyle(progress: number): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: `${String(Math.max(0, Math.min(100, progress)))}%`,
    background: cssVar('color.action.primary.default'),
  };
}

const progressLabelStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  color: cssVar('color.text.muted'),
};

const nameOf = (item: Project) => item.name;

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 단계·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?stage=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: StageFilter = parseFilter(
    list.filters['stage'] ?? PROJECT_FILTER_ALL,
    STAGE_FILTER_VALUES,
    PROJECT_FILTER_ALL,
  );
  const { keyword } = list;

  const controller = useCrudList<Project, ProjectInput>({
    resource: RESOURCE,
    adapter: projectAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 — 화면에 없는 행이 선택된 채
  // '선택 3건 삭제' 가 되지 않게 한다. 선택은 useCrudList(=CrudListShell)가 쥐고 있으므로
  // 조건 변화를 여기서 그 선택에 이어 준다 (STATE-04-b)
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
    // 거래처는 이제 문이다 — 이 행에서 그 거래처의 계약·견적·상담 이력으로 건너간다
    { header: '거래처', render: (item) => <AccountLink account={item} /> },
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
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="프로젝트명·거래처 검색"
          placeholder="프로젝트명 · 거래처 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '신사옥' 을 치는 도중 '신사ㅇ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('stage', event.target.value)}
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
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          프로젝트 등록
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
      // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="project-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
