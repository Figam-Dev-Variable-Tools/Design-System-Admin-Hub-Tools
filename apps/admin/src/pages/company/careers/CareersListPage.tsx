// CareersListPage — 채용 공고 목록 (라우트: /company/careers)
//
// 목록 + 등록/수정 폼(별도 라우트) + 삭제팝업. 직무·고용형태·상태 3축 필터. 공용 목록 키트를 쓴다.
//
// [상태 열은 저장된 값이 아니다] 마감 여부는 마감일과 오늘의 비교에서 매번 나온다
// (./types.ts 의 careerStateOf). 그래서 아무도 로그인하지 않은 새벽에 마감일이 지나도
// 다음 조회에서 곧바로 '마감' 으로 보인다 — 고쳐 줄 배치가 필요 없다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { cssVar, StatusBadge } from '@tds/ui';

import { formatDate } from '../../../shared/format';
import { Button, Icon, SearchField, SelectField } from '../../../shared/ui';
import {
  CrudListShell,
  parseFilter,
  useCrudList,
  useListState,
  type CrudColumn,
} from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { careersAdapter } from './data-source';
import {
  CAREER_FILTER_ALL,
  CAREER_STATE_LABEL,
  careerStateOf,
  careerStateTone,
  closesOnText,
  EMPLOYMENT_TYPES,
  employmentTypeLabel,
  filterCareers,
  JOB_FUNCTIONS,
  jobFunctionLabel,
  searchCareers,
} from './types';
import type { Career, CareerInput, CareerState } from './types';

const RESOURCE = 'careers';
const ENTITY_LABEL = '채용 공고';
const LIST_PATH = '/company/careers';

const JOB_VALUES: readonly string[] = [
  CAREER_FILTER_ALL,
  ...JOB_FUNCTIONS.map((option) => option.id),
];
const EMPLOYMENT_VALUES: readonly string[] = [
  CAREER_FILTER_ALL,
  ...EMPLOYMENT_TYPES.map((option) => option.id),
];
const STATE_VALUES: readonly string[] = [CAREER_FILTER_ALL, 'always', 'open', 'closed', 'draft'];

const STATE_OPTIONS: readonly { readonly id: CareerState; readonly label: string }[] = [
  { id: 'always', label: CAREER_STATE_LABEL.always },
  { id: 'open', label: CAREER_STATE_LABEL.open },
  { id: 'closed', label: CAREER_STATE_LABEL.closed },
  { id: 'draft', label: CAREER_STATE_LABEL.draft },
];

const FILTER_DEFAULTS = {
  job: CAREER_FILTER_ALL,
  employment: CAREER_FILTER_ALL,
  state: CAREER_FILTER_ALL,
} as const;

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filterWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const nameOf = (career: Career) => career.title;

export default function CareersListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 조회 조건의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10)
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const job = parseFilter(list.filters['job'] ?? CAREER_FILTER_ALL, JOB_VALUES, CAREER_FILTER_ALL);
  const employment = parseFilter(
    list.filters['employment'] ?? CAREER_FILTER_ALL,
    EMPLOYMENT_VALUES,
    CAREER_FILTER_ALL,
  );
  const state = parseFilter(
    list.filters['state'] ?? CAREER_FILTER_ALL,
    STATE_VALUES,
    CAREER_FILTER_ALL,
  );

  const controller = useCrudList<Career, CareerInput>({
    resource: RESOURCE,
    adapter: careersAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  // 필터가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다
  useEffect(() => {
    clear();
  }, [job, employment, state, clear]);

  /**
   * '오늘' 을 렌더마다 새로 만들지 않는다 — 목록이 다시 그려질 때마다 판정 기준이 흔들리면
   * 자정 언저리에 같은 화면이 두 답을 낸다.
   */
  const today = useMemo(() => formatDate(new Date()), []);
  const { keyword } = list;

  const visible = useMemo(
    () => searchCareers(filterCareers(controller.items, job, employment, state, today), keyword),
    [controller.items, job, employment, state, today, keyword],
  );

  const columns: readonly CrudColumn<Career>[] = [
    { header: '공고 제목', render: (career) => career.title },
    { header: '직무', nowrap: true, render: (career) => jobFunctionLabel(career.jobFunction) },
    {
      header: '고용형태',
      nowrap: true,
      render: (career) => employmentTypeLabel(career.employmentType),
    },
    { header: '근무지', nowrap: true, render: (career) => career.location },
    { header: '마감일', nowrap: true, render: (career) => closesOnText(career) },
    {
      header: '상태',
      nowrap: true,
      render: (career) => {
        const current = careerStateOf(career, today);
        return <StatusBadge tone={careerStateTone(current)} label={CAREER_STATE_LABEL[current]} />;
      },
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filterWrapStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="공고 제목·근무지 검색"
          placeholder="공고 제목 · 근무지"
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            aria-label="직무 필터"
            value={job}
            onChange={(event) => {
              list.setFilter('job', event.target.value);
            }}
          >
            <option value={CAREER_FILTER_ALL}>전체 직무</option>
            {JOB_FUNCTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            aria-label="고용형태 필터"
            value={employment}
            onChange={(event) => {
              list.setFilter('employment', event.target.value);
            }}
          >
            <option value={CAREER_FILTER_ALL}>전체 고용형태</option>
            {EMPLOYMENT_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            aria-label="상태 필터"
            value={state}
            onChange={(event) => {
              list.setFilter('state', event.target.value);
            }}
          >
            <option value={CAREER_FILTER_ALL}>전체 상태</option>
            {STATE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>

      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          채용 공고 등록
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
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="careers-select-all"
      toolbar={toolbar}
      rowTarget={{ kind: 'edit', href: (career) => `${LIST_PATH}/${career.id}/edit` }}
      onEdit={(career) => navigate(`${LIST_PATH}/${career.id}/edit`)}
    />
  );
}
