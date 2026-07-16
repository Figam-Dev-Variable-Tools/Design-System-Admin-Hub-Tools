// AccountListPage — 거래처 목록 (라우트: /sales/accounts) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 거래유형 필터 + 검색 + 신용등급 배지 +
// 거래 상태 인라인 토글 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다(상세/폼에서 다룬다).
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  PlusCircleIcon,
  SearchField,
  SelectField,
  StatusBadge,
  ToggleSwitch,
} from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { accountAdapter } from './data-source';
import {
  creditGradeLabel,
  creditGradeTone,
  filterAccounts,
  primaryContact,
  searchAccounts,
  toAccountInput,
  TRADE_FILTER_ALL,
  tradeTypeLabel,
  tradeTypeTone,
  TRADE_TYPE_OPTIONS,
} from './types';
import type { Account, AccountInput, TradeFilter } from './types';

const RESOURCE = 'sales-accounts';
const ENTITY_LABEL = '거래처';
const LIST_PATH = '/sales/accounts';
const TRADE_FILTER_VALUES: readonly TradeFilter[] = [
  TRADE_FILTER_ALL,
  ...TRADE_TYPE_OPTIONS.map((option) => option.id),
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

const selectWrapStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 5)',
};

const mutedStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
};

const nameOf = (item: Account) => item.name;

export default function AccountListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TradeFilter>(TRADE_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const controller = useCrudList<Account, AccountInput>({
    resource: RESOURCE,
    adapter: accountAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<Account, AccountInput>(RESOURCE, accountAdapter);

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchAccounts(filterAccounts(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<Account>[] = [
    {
      header: '사업자명',
      render: (item) => item.name,
    },
    { header: '대표자', nowrap: true, render: (item) => item.ceoName },
    {
      header: '거래유형',
      nowrap: true,
      render: (item) => (
        <StatusBadge tone={tradeTypeTone(item.tradeType)} label={tradeTypeLabel(item.tradeType)} />
      ),
    },
    {
      header: '신용등급',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={creditGradeTone(item.creditGrade)}
          label={creditGradeLabel(item.creditGrade)}
        />
      ),
    },
    {
      header: '대표담당',
      render: (item) => primaryContact(item)?.name ?? '—',
    },
    {
      header: '최근거래',
      nowrap: true,
      render: (item) => (
        <span style={mutedStyle}>{item.lastTradeAt === '' ? '—' : item.lastTradeAt}</span>
      ),
    },
    {
      header: '상태',
      nowrap: true,
      render: (item) => (
        <ToggleSwitch
          checked={item.active}
          busy={toggle.pendingId === item.id}
          onChange={(next) =>
            toggle.run(
              item.id,
              { ...toAccountInput(item), active: next },
              {
                success: next
                  ? `'${item.name}' 을(를) 거래중으로 바꿨습니다.`
                  : `'${item.name}' 거래를 중지했습니다.`,
              },
            )
          }
          label={`${item.name} 거래 여부`}
          onLabel="거래중"
          offLabel="중지"
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="사업자명·사업자번호·대표자 검색"
          placeholder="사업자명 · 사업자번호 · 대표자 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) =>
              setFilter(parseFilter(event.target.value, TRADE_FILTER_VALUES, TRADE_FILTER_ALL))
            }
            aria-label="거래유형으로 거르기"
          >
            <option value={TRADE_FILTER_ALL}>전체 유형</option>
            {TRADE_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        거래처 등록
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
        hasActiveFilters: filter !== TRADE_FILTER_ALL,
        onClearSearch: () => setKeyword(''),
        onResetFilters: () => setFilter(TRADE_FILTER_ALL),
      }}
      selectAllLabelId="account-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
