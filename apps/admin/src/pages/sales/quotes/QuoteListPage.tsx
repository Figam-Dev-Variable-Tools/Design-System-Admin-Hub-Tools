// QuoteListPage — 견적 목록 (라우트: /sales/quotes)
//
// CRUD 프레임워크(useCrudList + CrudListShell) 위에 상태 필터 + 검색 + 합계금액 + 상태 배지 +
// 사슬의 앞뒤(원본 문의 · 연결된 계약) 링크 + 삭제팝업을 얹는다. 목록엔 이미지 열이 없다.
//
// [등록 CTA 도, 인라인 '수주 전환' 도 없다] 견적은 문의에서만 발행되고, 수주는 계약이 만들어진
// 결과다. 둘 다 이 목록이 시작할 수 있는 일이 아니다 — 이유는 각 자리의 주석에 적혀 있다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SearchField, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { AccountLink } from '../_shared/AccountLink';
import { formatWon } from '../_shared/business';
import { findContractIdByQuote } from '../contracts/data-source';
import { quoteAdapter } from './data-source';
import {
  computeTotals,
  filterQuotes,
  isInherited,
  primaryQuoteSource,
  QUOTE_FILTER_ALL,
  QUOTE_STATUS_OPTIONS,
  quoteSourceHref,
  quoteStatusMeta,
  searchQuotes,
} from './types';
import type { Quote, QuoteInput, QuoteStatusFilter } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-quotes';
const ENTITY_LABEL = '견적';
const LIST_PATH = '/sales/quotes';
const CONTRACT_PATH = '/sales/contracts';
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
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const monoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
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

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 — 화면에 없는 행이 선택된 채
  // '선택 3건 삭제' 가 되지 않게 한다. 선택은 useCrudList(=CrudListShell)가 쥐고 있으므로
  // 조건 변화를 여기서 그 선택에 이어 준다 (STATE-04-b).
  //
  // 이 화면의 머리말은 원래부터 '선택 해제도 여기가 맡는다' 고 적고 있었으나 **그 effect 가
  // 없었다** — 형제 화면(AccountListPage:110-112 · ContractListPage:101-103)에는 있다.
  // 주석이 약속한 것을 코드가 지키지 않던 자리다.
  const { clear } = controller;
  useEffect(() => {
    clear();
  }, [filter, list.keyword, clear]);

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
    // 거래처 링크와 아래 '원본 문의' 링크는 **다른 목적지**다 — DS Table 가드가 <a> 내부
    // 클릭을 행 활성화에서 제외해 둘과 행 클릭이 함께 산다
    { header: '거래처', render: (item) => <AccountLink account={item} /> },
    {
      // 원본 문의로 가는 역링크 — 문의 ↔ 견적은 양방향이다. 수동 등록 견적은 원본이 없다.
      // 여러 문의를 합친 견적은 대표 한 건만 링크하고 나머지 건수를 덧붙인다: 한 칸에 링크를
      // 여럿 넣으면 행 클릭과 겹치는 표적이 늘어 어느 것을 눌렀는지 알기 어려워진다.
      header: '원본 문의',
      nowrap: true,
      render: (item) => {
        const primary = primaryQuoteSource(item);
        if (!isInherited(item) || primary === undefined) return <span style={mutedStyle}>—</span>;
        const extra = item.sources.length - 1;
        return (
          <Link
            to={quoteSourceHref(primary)}
            className="tds-ui-link tds-ui-focusable"
            aria-label={`${item.quoteNo} 원본 문의 ${primary.no}`}
          >
            {extra > 0 ? `${primary.no} 외 ${String(extra)}건` : primary.no}
          </Link>
        );
      },
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
      // [예전에는 여기가 '수주 전환' 버튼이었다] 그 버튼은 사라졌다 — 수주는 이제 사람이 따로
      // 누르는 일이 아니라 **계약이 만들어진 결과**다(./types 의 상태 전이 머리말). 대신 이 칸은
      // 사슬의 다음 문서가 실제로 생겼는지를 보여 준다: 견적 목록에서 '계약까지 갔는가' 를
      // 알 수 없다는 것이 운영자가 말한 '따로 노는 느낌' 의 한 조각이었다.
      header: '계약',
      nowrap: true,
      render: (item) => {
        const contractId = findContractIdByQuote(item.id);
        if (contractId === '') return <span style={mutedStyle}>—</span>;
        return (
          <Link
            to={`${CONTRACT_PATH}/${contractId}/edit`}
            className="tds-ui-link tds-ui-focusable"
            aria-label={`${item.quoteNo} 의 계약 열기`}
          >
            계약 열기
          </Link>
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
      {/* [등록 CTA 가 없다 — 권한 문제가 아니라 순서 문제다]
          견적은 문의에서만 발행된다. 그래서 create 권한이 있어도 이 자리에 버튼을 두지 않는다:
          빈 폼으로 세운 견적은 원본 문의가 없어 '어느 요청에 대한 견적인가' 를 앱이 영영 답하지
          못한다. 주소로 직접 들어오는 /new 도 막혀 있고, 왜 막혔는지와 어디서 만드는지를 말한다
          (./QuoteFormPage 의 ChainOnlyCreateNotice). */}
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
