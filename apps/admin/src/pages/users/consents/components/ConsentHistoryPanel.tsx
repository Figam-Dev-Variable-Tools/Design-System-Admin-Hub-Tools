// 동의 이력 목록 — 조회 전용 (라우트: /users/consents)
//
// [행 클릭이 없다] 목적지가 `none` 이다. 이력 한 줄에는 '상세' 가 없다 — 줄 자체가 사실의 전부이고,
// 열어 볼 하위 문서가 없다. 갈 곳이 없는데 커서를 pointer 로 바꾸면 그것이 조용한 무반응이다
// (shared/crud/rowTarget.ts 머리말).
//
// [조회 조건은 URL 이 소유한다] 항목·행위·검색어가 쿼리스트링에 실린다(IA-13) — '마케팅 문자
// 철회만' 을 걸어 놓은 화면을 법무 담당자에게 링크로 그대로 넘길 수 있어야 한다.
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import { cssVar, StatusBadge } from '@tds/ui';

import { formatDateTime } from '../../../../shared/format';
import { SearchField, SelectField } from '../../../../shared/ui';
import {
  CrudReadListShell,
  parseFilter,
  useListState,
  type CrudColumn,
  type RowTarget,
} from '../../../../shared/crud';
import { filterConsentEvents, searchConsentEvents } from '../rules';
import {
  CONSENT_ACTION_FILTERS,
  CONSENT_ACTION_FILTER_VALUES,
  CONSENT_ACTION_LABEL,
  CONSENT_FILTER_ALL,
  consentActionTone,
  consentSourceLabel,
} from '../types';
import type { ConsentActionFilter, ConsentEvent, ConsentItemDef } from '../types';

const ENTITY_LABEL = '동의 이력';

/** 기본값과 같은 값은 URL 에서 지운다 — 공유 링크가 짧아진다 (IA-13) */
const FILTER_DEFAULTS = { item: CONSENT_FILTER_ALL, action: CONSENT_FILTER_ALL } as const;

/** 이력은 열어 볼 상세가 없다 — 캡션도 '조회 전용' 이라고 말한다 */
const ROW_TARGET: RowTarget<ConsentEvent> = { kind: 'none' };

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 6)` };

interface ConsentHistoryPanelProps {
  readonly items: readonly ConsentItemDef[];
  readonly query: UseQueryResult<readonly ConsentEvent[], Error>;
}

export function ConsentHistoryPanel({ items, query }: ConsentHistoryPanelProps) {
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });

  const itemValues: readonly string[] = [CONSENT_FILTER_ALL, ...items.map((item) => item.id)];
  // 손으로 고친 ?item=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체' 로 되돌린다
  const itemId = parseFilter(
    list.filters['item'] ?? CONSENT_FILTER_ALL,
    itemValues,
    CONSENT_FILTER_ALL,
  );
  const action: ConsentActionFilter = parseFilter(
    list.filters['action'] ?? CONSENT_FILTER_ALL,
    CONSENT_ACTION_FILTER_VALUES,
    CONSENT_FILTER_ALL,
  );

  const { data, isFetching, error, refetch } = query;
  // [STATE-01] 스켈레톤은 최초 로드에서만 — 재조회 중에는 이전 행을 유지한다
  const firstLoading = isFetching && data === undefined;
  const { keyword } = list;

  const visible = useMemo(
    () => searchConsentEvents(filterConsentEvents(data ?? [], itemId, action), keyword),
    [data, itemId, action, keyword],
  );

  const labelOf = (id: string): string => items.find((item) => item.id === id)?.label ?? id;

  const columns: readonly CrudColumn<ConsentEvent>[] = [
    { header: '시각', nowrap: true, render: (event) => formatDateTime(event.occurredAt) },
    { header: '대상', render: (event) => event.subjectLabel },
    { header: '항목', render: (event) => labelOf(event.itemId) },
    {
      header: '구분',
      nowrap: true,
      render: (event) => (
        <StatusBadge
          tone={consentActionTone(event.action)}
          label={CONSENT_ACTION_LABEL[event.action]}
        />
      ),
    },
    {
      header: '약관 버전',
      nowrap: true,
      // 철회에는 버전이 없다 — 없는 것을 '-' 로 적는 것이 v1.1 로 지어내는 것보다 정확하다
      render: (event) => event.termsVersion ?? '—',
    },
    { header: '출처', nowrap: true, render: (event) => consentSourceLabel(event.source) },
  ];

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <SearchField
        value={list.searchInput}
        onChange={list.setSearchInput}
        label="대상·회원 ID·약관 버전 검색"
        placeholder="대상 · 회원 ID · 약관 버전"
        {...list.searchInputProps}
      />
      <span style={selectWrapStyle}>
        <SelectField
          aria-label="동의 항목 필터"
          value={itemId}
          onChange={(event) => {
            list.setFilter('item', event.target.value);
          }}
        >
          <option value={CONSENT_FILTER_ALL}>전체 항목</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          aria-label="구분 필터"
          value={action}
          onChange={(event) => {
            list.setFilter('action', event.target.value);
          }}
        >
          {CONSENT_ACTION_FILTERS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </SelectField>
      </span>
    </div>
  );

  return (
    <CrudReadListShell
      entityLabel={ENTITY_LABEL}
      state={{
        firstLoading,
        refreshing: isFetching && data !== undefined,
        error,
        refetch: () => {
          void refetch();
        },
      }}
      visibleItems={visible}
      columns={columns}
      nameOf={(event) => `${event.subjectLabel} ${labelOf(event.itemId)}`}
      rowTarget={ROW_TARGET}
      toolbar={toolbar}
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
        createVerb: '기록',
      }}
    />
  );
}
