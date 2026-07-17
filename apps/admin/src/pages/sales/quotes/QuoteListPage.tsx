// QuoteListPage — 견적 목록 (라우트: /sales/quotes)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 합계금액 + 상태 배지 +
// 승인 견적 인라인 '수주 전환' 액션 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { objectParticle } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import {
  CrudListShell,
  parseFilter,
  useCrudList,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { formatWon } from '../_shared/business';
import { quoteAdapter } from './data-source';
import {
  canConvertToOrder,
  computeTotals,
  filterQuotes,
  isInherited,
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
const INQUIRY_PATH = '/sales/inquiries';
const QUOTE_STATUS_FILTER_VALUES: readonly QuoteStatusFilter[] = [
  QUOTE_FILTER_ALL,
  ...QUOTE_STATUS_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다 (IA-13) */
const FILTER_DEFAULTS = { status: QUOTE_FILTER_ALL } as const;

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
  // 조회 상태의 단일 원천은 URL 이다 (IA-13) — 선택 해제도 여기가 맡는다 (STATE-04).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const filter: QuoteStatusFilter = parseFilter(
    list.filters['status'] ?? QUOTE_FILTER_ALL,
    QUOTE_STATUS_FILTER_VALUES,
    QUOTE_FILTER_ALL,
  );

  const controller = useCrudList<Quote, QuoteInput>({
    resource: RESOURCE,
    adapter: quoteAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const convert = useCrudRowUpdate<Quote, QuoteInput>(RESOURCE, quoteAdapter);

  const visible = useMemo(
    () => searchQuotes(filterQuotes(controller.items, filter), list.keyword),
    [controller.items, filter, list.keyword],
  );

  const columns: readonly CrudColumn<Quote>[] = [
    {
      header: '견적번호',
      nowrap: true,
      render: (item) => <span style={monoStyle}>{item.quoteNo}</span>,
    },
    { header: '거래처', render: (item) => item.accountName },
    {
      // 원본 문의로 가는 역링크 — 문의 ↔ 견적은 양방향이다. 수동 등록 견적은 원본이 없다.
      header: '원본 문의',
      nowrap: true,
      render: (item) =>
        isInherited(item) ? (
          <Link
            to={`${INQUIRY_PATH}/${item.inquiryId}`}
            className="tds-ui-link tds-ui-focusable"
            aria-label={`${item.quoteNo} 원본 문의 ${item.inquiryNo}`}
          >
            {item.inquiryNo}
          </Link>
        ) : (
          <span style={mutedStyle}>—</span>
        ),
    },
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
                // [ERP-13] 조사는 shared/format 이 런타임에 고른다 — 견적번호마다 받침이 달라도
                // objectParticle 이 마지막 글자를 보고 '을/를' 을 정한다.
                {
                  success: `'${item.quoteNo}'${objectParticle(item.quoteNo)} 수주로 전환했습니다.`,
                },
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
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="견적번호·거래처 검색"
          placeholder="견적번호 · 거래처 검색"
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('status', event.target.value)}
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
      empty={{
        hasQuery: list.hasQuery,
        hasActiveFilters: list.hasActiveFilters,
        onClearSearch: list.clearSearch,
        onResetFilters: list.resetFilters,
      }}
      selectAllLabelId="quote-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
