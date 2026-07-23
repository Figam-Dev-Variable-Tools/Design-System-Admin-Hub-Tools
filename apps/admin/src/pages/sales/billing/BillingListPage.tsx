// BillingListPage — 청구·입금 목록 (라우트: /sales/billing)
//
// [무엇을 보는 화면인가] 결제대행(PG)을 끈 운영에서 '결제완료' 를 만드는 것은 시스템이 아니라
// **판매자의 입금확인**이다. 그래서 이 목록의 중심 열은 청구액이 아니라 **잔액과 입금 상태**다 —
// 운영자가 여기서 하는 판단은 '누구에게 다시 안내할까' 하나뿐이다.
//
// [읽기 전용 껍데기] 청구는 수주 전환된 견적에서만 생긴다(types 규칙 ③). 목록에 '청구 등록'
// 버튼이 없는 이유가 그것이다 — 근거 없는 청구를 만들 문을 아예 두지 않는다. 삭제·일괄작업도
// 없다: 청구는 회계 기록이다. 그래서 CrudListShell 이 아니라 CrudReadListShell 을 쓴다.
//
// [조회 상태의 소유자] state·keyword 는 이 화면의 useState 가 아니라 useListState 가 **URL
// 쿼리스트링**으로 소유한다 (IA-13). 검색은 IME 안전이다 (COMP-10).
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { FilterPanel, FilterRail, hintStyle, SearchField, StatusBadge } from '../../../shared/ui';
import {
  CrudReadListShell,
  DetailCellLink,
  parseFilter,
  useCrudListQuery,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn, RowTarget } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { formatWon } from '../_shared/business';
import { AccountLink } from '../_shared/AccountLink';
import { BILLING_RESOURCE, billingAdapter } from './data-source';
import {
  BILLING_FILTER_ALL,
  BILLING_STATE_FILTER_VALUES,
  BILLING_STATE_FILTERS,
  billingMethodLabel,
  billingPaymentState,
  billingStateMeta,
  countBillingsByState,
  filterBillings,
  hasSentNotice,
  outstandingAmount,
  paidAmount,
  paidOnDate,
  searchBillings,
  totalOutstanding,
} from './types';
import type { Billing, BillingStateFilter } from './types';

const ENTITY_LABEL = '청구';
const LIST_PATH = '/sales/billing';
const QUOTE_PATH = '/sales/quotes';

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { state: BILLING_FILTER_ALL } as const;

/** 행 클릭 목적지 — 상세(입금확인·안내 발송). 표의 캡션 문장도 여기서 파생된다 */
const ROW_TARGET: RowTarget<Billing> = {
  kind: 'detail',
  href: (item) => `${LIST_PATH}/${item.id}`,
};

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const monoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const nameOf = (item: Billing) => item.billNo;

export default function BillingListPage() {
  // 입금확인 권한이 없으면 이 화면은 '읽는 화면' 이다 — 좌측 안내가 그 사실을 미리 밝힌다 (EXC-03)
  const { canUpdate } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?state=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체' 로 되돌린다
  const state: BillingStateFilter = parseFilter(
    list.filters['state'] ?? BILLING_FILTER_ALL,
    BILLING_STATE_FILTER_VALUES,
    BILLING_FILTER_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(BILLING_RESOURCE, billingAdapter);
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;
  const items = useMemo(() => data ?? [], [data]);

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 —
  // 0 과 '모름' 은 다른 사실이라 FilterPanel 이 '—' 를 띄운다.
  const loaded = !firstLoading && error === null;
  const stateCounts = useMemo(() => (loaded ? countBillingsByState(items) : null), [items, loaded]);
  const outstanding = useMemo(() => totalOutstanding(items), [items]);

  const visible = useMemo(
    () => searchBillings(filterBillings(items, state), list.keyword),
    [items, state, list.keyword],
  );

  const columns: readonly CrudColumn<Billing>[] = [
    {
      // 청구번호는 상세로 가는 **키보드 경로**다 — 행 클릭은 마우스 전용이다(DetailCellLink 머리말)
      header: '청구번호',
      nowrap: true,
      render: (item) => (
        <DetailCellLink to={`${LIST_PATH}/${item.id}`}>{item.billNo}</DetailCellLink>
      ),
    },
    { header: '거래처', render: (item) => <AccountLink account={item} /> },
    {
      // 원 견적으로 가는 역링크 — 청구의 근거가 무엇인지 한 번에 열린다
      header: '원 견적',
      nowrap: true,
      render: (item) =>
        item.quoteId === '' ? (
          <span style={mutedStyle}>—</span>
        ) : (
          <Link
            to={`${QUOTE_PATH}/${item.quoteId}`}
            className="tds-ui-link tds-ui-focusable"
            aria-label={`${item.billNo} 원 견적 ${item.quoteNo}`}
          >
            {item.quoteNo}
          </Link>
        ),
    },
    { header: '청구 방식', nowrap: true, render: (item) => billingMethodLabel(item.method) },
    { header: '청구액', numeric: true, render: (item) => formatWon(item.amount) },
    { header: '입금액', numeric: true, render: (item) => formatWon(paidAmount(item)) },
    {
      header: '잔액',
      numeric: true,
      render: (item) => formatWon(outstandingAmount(item)),
    },
    {
      // 안내가 나갔는지 — 미입금인데 안내조차 안 나간 건이 운영자가 가장 먼저 집을 행이다
      header: '안내 발송',
      nowrap: true,
      render: (item) =>
        hasSentNotice(item) ? (
          <StatusBadge tone="success" label={`발송 ${String(item.notices.length)}회`} />
        ) : (
          <StatusBadge tone="warning" label="미발송" />
        ),
    },
    {
      header: '입금 상태',
      nowrap: true,
      render: (item) => {
        const meta = billingStateMeta(billingPaymentState(item));
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
    {
      header: '입금일',
      nowrap: true,
      render: (item) => {
        const on = paidOnDate(item);
        return on === '' ? <span style={mutedStyle}>—</span> : <span style={monoStyle}>{on}</span>;
      },
    },
  ];

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <span style={searchWrapStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="청구번호·견적번호·거래처 검색"
          placeholder="청구번호 · 견적번호 · 거래처 검색"
          // 조합 중 커밋 금지 + Enter 차단 (COMP-10)
          {...list.searchInputProps}
        />
      </span>
    </div>
  );

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <>
            <p style={hintStyle}>
              {loaded
                ? `아직 받지 못한 금액은 ${formatWon(outstanding)}이에요.`
                : '미수금을 세는 중이에요.'}
            </p>
            <p style={hintStyle}>
              청구는 수주로 전환된 견적에서만 만들어져요. 견적 상세의 &lsquo;청구 만들기&rsquo;로
              시작하세요.
            </p>
            <p style={hintStyle}>
              결제대행을 쓰지 않으므로 입금은 사람이 확인해 기록해요. 기록한 입금은 되돌릴 수
              없어요.
            </p>
            {!canUpdate && <p style={hintStyle}>입금확인 권한이 없어 조회만 가능해요.</p>}
          </>
        }
      >
        <FilterPanel
          navLabel="청구 입금 상태 필터"
          heading="입금 상태"
          options={BILLING_STATE_FILTERS}
          value={state}
          counts={stateCounts}
          onChange={(next) => list.setFilter('state', next)}
        />
      </FilterRail>

      <CrudReadListShell
        entityLabel={ENTITY_LABEL}
        state={{
          firstLoading,
          refreshing: isFetching && !firstLoading,
          error,
          refetch: () => void refetch(),
        }}
        visibleItems={visible}
        columns={columns}
        nameOf={nameOf}
        rowTarget={ROW_TARGET}
        toolbar={toolbar}
        // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
        empty={{
          createVerb: '생성',
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
        }}
      />
    </div>
  );
}
