// CaseStudyListPage — 성공 사례 목록 (라우트: /portfolio/case-studies) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 업종 필터 + 노출 인라인 토글을 얹는다.
// 목록엔 이미지 열을 넣지 않는다 — 이미지는 상세/등록/수정 폼에서만.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
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

const RESOURCE = 'case-studies';
const ENTITY_LABEL = '성공 사례';
const LIST_PATH = '/portfolio/case-studies';

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

const resultCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 12)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: CaseStudy) => item.title;

export default function CaseStudyListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CaseFilter>(CASE_FILTER_ALL);

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
    publishToggleColumn<CaseStudy>(toggle.pendingId, (item, next) =>
      toggle.run(
        item.id,
        { ...toCaseStudyInput(item), published: next },
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
          onChange={(event) => setFilter(event.target.value as CaseFilter)}
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
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        성공 사례 등록
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
      selectAllLabelId="case-study-select-all"
      emptyLabel="등록된 성공 사례가 없습니다."
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
