// ContractListPage — 계약 목록 (라우트: /sales/contracts) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 금액·기간·상태 배지 + 만료임박
// 표시 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다(첨부는 폼에서 다룬다).
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList } from '../../../shared/crud';
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
  const [filter, setFilter] = useState<ContractStatusFilter>(CONTRACT_FILTER_ALL);
  const [keyword, setKeyword] = useState('');
  const today = formatDate(new Date());

  const controller = useCrudList<Contract, ContractInput>({
    resource: RESOURCE,
    adapter: contractAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

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
          value={keyword}
          onChange={setKeyword}
          label="계약명·거래처 검색"
          placeholder="계약명 · 거래처 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) =>
              setFilter(
                parseFilter(event.target.value, CONTRACT_STATUS_FILTER_VALUES, CONTRACT_FILTER_ALL),
              )
            }
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
      empty={{
        hasQuery: keyword !== '',
        hasActiveFilters: filter !== CONTRACT_FILTER_ALL,
        onClearSearch: () => setKeyword(''),
        onResetFilters: () => setFilter(CONTRACT_FILTER_ALL),
      }}
      selectAllLabelId="contract-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
