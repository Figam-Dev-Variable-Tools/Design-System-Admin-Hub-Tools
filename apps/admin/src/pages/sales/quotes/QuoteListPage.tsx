// QuoteListPage — 견적 목록 (라우트: /sales/quotes) · A41 소유
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 합계금액 + 상태 배지 +
// 승인 견적 인라인 '수주 전환' 액션 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { formatWon } from '../_shared/business';
import { quoteAdapter } from './data-source';
import {
  canConvertToOrder,
  computeTotals,
  filterQuotes,
  QUOTE_FILTER_ALL,
  QUOTE_STATUS_OPTIONS,
  quoteStatusMeta,
  searchQuotes,
  toQuoteInput,
} from './types';
import type { Quote, QuoteInput, QuoteStatusFilter } from './types';

const RESOURCE = 'sales-quotes';
const ENTITY_LABEL = '견적';
const LIST_PATH = '/sales/quotes';
const QUOTE_STATUS_FILTER_VALUES: readonly QuoteStatusFilter[] = [
  QUOTE_FILTER_ALL,
  ...QUOTE_STATUS_OPTIONS.map((option) => option.id),
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

const monoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const nameOf = (item: Quote) => item.quoteNo;

export default function QuoteListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<QuoteStatusFilter>(QUOTE_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

  const controller = useCrudList<Quote, QuoteInput>({
    resource: RESOURCE,
    adapter: quoteAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const convert = useCrudRowUpdate<Quote, QuoteInput>(RESOURCE, quoteAdapter);

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(
    () => searchQuotes(filterQuotes(controller.items, filter), keyword),
    [controller.items, filter, keyword],
  );

  const columns: readonly CrudColumn<Quote>[] = [
    {
      header: '견적번호',
      nowrap: true,
      render: (item) => <span style={monoStyle}>{item.quoteNo}</span>,
    },
    { header: '거래처', render: (item) => item.accountName },
    {
      header: '합계금액',
      numeric: true,
      render: (item) => formatWon(computeTotals(item.items, item.taxMode).total),
    },
    {
      header: '유효기간',
      nowrap: true,
      render: (item) => <span style={mutedStyle}>{item.validUntil}</span>,
    },
    {
      header: '상태',
      nowrap: true,
      render: (item) => {
        const meta = quoteStatusMeta(item.status);
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
    {
      header: '수주 전환',
      nowrap: true,
      render: (item) =>
        canConvertToOrder(item.status) ? (
          <Button
            variant="secondary"
            disabled={convert.pendingId === item.id}
            onClick={() =>
              convert.run(
                item.id,
                { ...toQuoteInput(item), status: 'ordered' },
                { success: `'${item.quoteNo}' 을(를) 수주로 전환했습니다.` },
              )
            }
          >
            수주 전환
          </Button>
        ) : (
          <span style={mutedStyle}>—</span>
        ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="견적번호·거래처 검색"
          placeholder="견적번호 · 거래처 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) =>
              setFilter(
                parseFilter(event.target.value, QUOTE_STATUS_FILTER_VALUES, QUOTE_FILTER_ALL),
              )
            }
            aria-label="상태로 거르기"
          >
            <option value={QUOTE_FILTER_ALL}>전체 상태</option>
            {QUOTE_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        견적 등록
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
      selectAllLabelId="quote-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
