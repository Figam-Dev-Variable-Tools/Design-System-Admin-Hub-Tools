// CaseStudyListPage — 성공 사례 목록 (라우트: /portfolio/case-studies)
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 업종 필터 + 노출 인라인 토글을 얹는다.
// 목록엔 이미지 열을 넣지 않는다 — 이미지는 상세/등록/수정 폼에서만.
//
// [조회 상태의 소유자] 업종 필터는 이 파일의 useState 였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '제조' 만 골라 한 건을 고치러 갔다 Back 하면 그 조건이
// 그대로 살아 있고, 그 URL 을 그대로 공유할 수 있다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, SelectField, StatusBadge } from '../../../shared/ui';
import {
  CrudListShell,
  parseFilter,
  useCrudList,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { caseStudyAdapter } from './data-source';
import {
  CASE_FILTER_ALL,
  CASE_INDUSTRY_OPTIONS,
  filterCaseStudies,
  industryLabel,
  industryTone,
  toCaseStudyInput,
} from './types';
import type { CaseFilter, CaseStudy, CaseStudyInput } from './types';
import { publishToggleColumn } from '../_shared/publishColumn';
import { objectParticle } from '../../../shared/format';
import { cssVar } from '@tds/ui';

const RESOURCE = 'case-studies';
const ENTITY_LABEL = '성공 사례';
const LIST_PATH = '/portfolio/case-studies';
const CASE_FILTER_VALUES: readonly CaseFilter[] = [
  CASE_FILTER_ALL,
  ...CASE_INDUSTRY_OPTIONS.map((option) => option.id),
];

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

const resultCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: CaseStudy) => item.title;

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { industry: CASE_FILTER_ALL } as const;

export default function CaseStudyListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 업종의 단일 원천 = URL (IA-13). 손으로 고친 ?industry=거짓말 은 '전체'로 되돌린다
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const filter: CaseFilter = parseFilter(
    list.filters['industry'] ?? CASE_FILTER_ALL,
    CASE_FILTER_VALUES,
    CASE_FILTER_ALL,
  );

  const controller = useCrudList<CaseStudy, CaseStudyInput>({
    resource: RESOURCE,
    adapter: caseStudyAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<CaseStudy, CaseStudyInput>(RESOURCE, caseStudyAdapter);

  useEffect(() => {
    clear();
  }, [filter, clear]);

  const visible = useMemo(
    () => filterCaseStudies(controller.items, filter),
    [controller.items, filter],
  );

  const columns: readonly CrudColumn<CaseStudy>[] = [
    {
      header: '업종',
      nowrap: true,
      render: (item) => (
        <StatusBadge tone={industryTone(item.industry)} label={industryLabel(item.industry)} />
      ),
    },
    { header: '제목', render: (item) => item.title },
    { header: '고객사', nowrap: true, render: (item) => item.client },
    { header: '성과', render: (item) => <span style={resultCellStyle}>{item.result}</span> },
    publishToggleColumn<CaseStudy>(toggle.pendingId, toggle.canUpdate, (item, next) =>
      toggle.run(
        item.id,
        { ...toCaseStudyInput(item), published: next },
        {
          success: next
            ? `'${item.title}'${objectParticle(item.title)} 게시했어요.`
            : `'${item.title}'${objectParticle(item.title)} 숨겼어요.`,
        },
      ),
    ),
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <span style={filterStyle}>
        <SelectField
          value={filter}
          onChange={(event) => list.setFilter('industry', event.target.value)}
          aria-label="업종으로 거르기"
        >
          <option value={CASE_FILTER_ALL}>전체 업종</option>
          {CASE_INDUSTRY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          성공 사례 등록
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
      selectAllLabelId="case-study-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
