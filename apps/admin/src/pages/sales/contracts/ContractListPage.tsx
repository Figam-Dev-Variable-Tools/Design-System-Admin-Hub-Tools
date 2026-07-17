// ContractListPage — 계약 목록 (라우트: /sales/contracts)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 금액·기간·상태 배지 + 만료임박
// 표시 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다(첨부는 폼에서 다룬다).
//
// [조회 상태의 소유자] 상태 필터·검색어는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '갱신 대상' 만 걸러 계약 상세를 열고 Back 하면 그 필터가
// 그대로다. '이 조건 좀 확인해 주세요' 하며 그 URL 을 그대로 공유할 수도 있다.
// 검색은 IME 안전이다 (COMP-10).
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { formatWon } from '../_shared/business';
import { contractAdapter } from './data-source';
import {
  CONTRACT_FILTER_ALL,
  CONTRACT_STATUS_OPTIONS,
  contractStatusMeta,
  contractTypeLabel,
  filterContracts,
  isRenewalDue,
  searchContracts,
} from './types';
import type { Contract, ContractInput, ContractStatusFilter } from './types';

const RESOURCE = 'sales-contracts';
const ENTITY_LABEL = '계약';
const LIST_PATH = '/sales/contracts';
const CONTRACT_STATUS_FILTER_VALUES: readonly ContractStatusFilter[] = [
  CONTRACT_FILTER_ALL,
  ...CONTRACT_STATUS_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { status: CONTRACT_FILTER_ALL } as const;

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

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  flexWrap: 'wrap',
};

const nameOf = (item: Contract) => item.title;

export default function ContractListPage() {
  const navigate = useNavigate();

  // 상태·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: ContractStatusFilter = parseFilter(
    list.filters['status'] ?? CONTRACT_FILTER_ALL,
    CONTRACT_STATUS_FILTER_VALUES,
    CONTRACT_FILTER_ALL,
  );
  const { keyword } = list;
  const today = formatDate(new Date());

  const controller = useCrudList<Contract, ContractInput>({
    resource: RESOURCE,
    adapter: contractAdapter,
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
    () => searchContracts(filterContracts(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<Contract>[] = [
    { header: '계약명', render: (item) => item.title },
    { header: '거래처', render: (item) => item.accountName },
    { header: '유형', nowrap: true, render: (item) => contractTypeLabel(item.contractType) },
    {
      header: '계약기간',
      nowrap: true,
      render: (item) => <span style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
    { header: '금액', numeric: true, render: (item) => formatWon(item.amount) },
    {
      header: '상태',
      nowrap: true,
      render: (item) => {
        const meta = contractStatusMeta(item.status);
        return (
          <span style={statusCellStyle}>
            <StatusBadge tone={meta.tone} label={meta.label} />
            {isRenewalDue(item, today) && <StatusBadge tone="warning" label="갱신임박" />}
          </span>
        );
      },
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="계약명·거래처 검색"
          placeholder="계약명 · 거래처 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '유지보수' 를 치는 도중 '유지보ㅅ' 로 검색되지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('status', event.target.value)}
            aria-label="상태로 거르기"
          >
            <option value={CONTRACT_FILTER_ALL}>전체 상태</option>
            {CONTRACT_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        계약 등록
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
      // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="contract-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
