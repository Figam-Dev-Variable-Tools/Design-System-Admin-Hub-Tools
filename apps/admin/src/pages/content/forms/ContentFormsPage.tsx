// ContentFormsPage — 폼 관리 목록 (라우트: /content/forms)
//
// 홈페이지의 문의 폼 구성을 목록으로 본다. 공용 목록 키트(useCrudList + CrudListShell)를 쓰고,
// 조회 상태(상태 필터·검색어)의 단일 원천은 URL 이다 (IA-13 · useListState).
//
// [세는 것은 '보이는 항목' 이다] 숨긴 항목은 방문자에게 나오지 않으므로 항목 수에 넣지 않는다 —
// 목록의 숫자와 실제 폼의 칸 수가 어긋나면 그 숫자는 아무 뜻이 없다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { cssVar, SelectField, StatusBadge } from '@tds/ui';

import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { formatNumber } from '../../../shared/format';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { Button, hintStyle, Icon, SearchField } from '../../../shared/ui';
import { contentFormAdapter, FORM_RESOURCE } from './data-source';
import {
  activeFields,
  filterContentForms,
  FORM_LIST_PATH,
  FORM_STATUS_FILTER_VALUES,
  FORM_STATUS_FILTERS,
  FORM_STATUS_LABEL,
  FORM_STATUS_TONE,
  hasConsentField,
} from './types';
import type { ContentForm, ContentFormInput, FormStatusFilter } from './types';

const ENTITY_LABEL = '폼';

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

/** SelectField 는 style 을 받지 않는다(토큰 보호) — 폭은 감싸는 쪽이 정한다 */
const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const nameCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

const nameOf = (form: ContentForm) => form.name;

export default function ContentFormsPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const status: FormStatusFilter = parseFilter(
    list.filters['status'] ?? 'all',
    FORM_STATUS_FILTER_VALUES,
    'all',
  );

  const controller = useCrudList<ContentForm, ContentFormInput>({
    resource: FORM_RESOURCE,
    adapter: contentFormAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });

  const { items } = controller;
  const { keyword } = list;
  const visibleItems = useMemo(
    () => filterContentForms(items, status, keyword),
    [items, status, keyword],
  );

  const createButton = canCreate ? (
    <Button variant="primary" size="md" onClick={() => navigate(`${FORM_LIST_PATH}/new`)}>
      <Icon name="plus-circle" />폼 등록
    </Button>
  ) : null;

  const columns: readonly CrudColumn<ContentForm>[] = [
    {
      header: '폼 이름',
      render: (form) => (
        <span style={nameCellStyle}>
          <span>{form.name}</span>
          {form.description !== '' && <span style={mutedStyle}>{form.description}</span>}
        </span>
      ),
      sortValue: (form) => form.name,
    },
    {
      header: '상태',
      nowrap: true,
      render: (form) => (
        <StatusBadge tone={FORM_STATUS_TONE[form.status]} label={FORM_STATUS_LABEL[form.status]} />
      ),
    },
    {
      header: '항목',
      numeric: true,
      nowrap: true,
      render: (form) => `${formatNumber(activeFields(form.fields).length)}개`,
      sortValue: (form) => activeFields(form.fields).length,
    },
    {
      header: '개인정보 동의',
      nowrap: true,
      // 동의 항목의 유무는 목록에서 바로 보여야 한다 — 없는 폼을 발행하면 법적 문제가 된다
      render: (form) =>
        hasConsentField(form.fields) ? (
          <StatusBadge tone="success" label="있음" />
        ) : (
          <StatusBadge tone="danger" label="없음" />
        ),
    },
    {
      header: '수신 담당자',
      render: (form) =>
        form.recipients.length === 0 ? (
          <span style={mutedStyle}>미지정</span>
        ) : (
          form.recipients.join(', ')
        ),
    },
    {
      header: '최근 수정',
      nowrap: true,
      render: (form) => form.updatedAt.replace('T', ' '),
      sortValue: (form) => form.updatedAt,
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={toolbarLeftStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="폼 이름 검색"
          {...list.searchInputProps}
        />
        <span style={filterSlotStyle}>
          <SelectField
            aria-label="상태 필터"
            value={status}
            onChange={(event) =>
              list.setFilter(
                'status',
                parseFilter(event.target.value, FORM_STATUS_FILTER_VALUES, 'all'),
              )
            }
          >
            {FORM_STATUS_FILTERS.map((filter) => (
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
        selectAllLabelId="content-forms-select-all"
        toolbar={toolbar}
        onEdit={(form) => navigate(`${FORM_LIST_PATH}/${form.id}/edit`)}
        rowTarget={{ kind: 'edit', href: (form) => `${FORM_LIST_PATH}/${form.id}/edit` }}
        empty={{
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
          ...(createButton !== null && { createAction: createButton }),
        }}
      />
      <p style={hintStyle}>
        항목 수는 방문자에게 보이는 항목만 셉니다. 발행된 폼의 항목은 삭제할 수 없고 숨기기만 할 수
        있습니다.
      </p>
    </>
  );
}
