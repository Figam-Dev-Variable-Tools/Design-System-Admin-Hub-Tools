// CouponIssuanceListPage — 쿠폰 발급 현황 · 이력 (라우트: /products/coupons/issuance)
//
// [왜 별도 화면인가] 쿠폰 목록이 답하는 질문은 '무엇을 걸어 뒀나' 이고, 여기가 답하는 질문은
// **'그래서 얼마나 나갔고 얼마나 쓰였나'** 다. 두 질문을 한 표에 넣으면 열이 열두 개가 되고
// 어느 쪽도 읽히지 않는다. 그리고 이력은 도메인 읽기 전용이다 — 발급은 트리거가 만들고 운영자는
// 보기만 한다. 그래서 선택·삭제가 없는 CrudReadListShell 을 쓴다.
//
// [두 숫자가 무엇을 세는지 화면이 밝힌다] 위 카드의 '발급/사용' 은 **이력 표본**에서 센 값이고,
// 소진율은 쿠폰이 들고 있는 **운영 누계**(issuedCount)다. 픽스처 단계라 둘이 다르므로 각각
// 무엇인지 적어 둔다 — 숫자가 어긋나 보이는 것을 버그로 오해하지 않게.
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Card,
  CardTitle,
  hintStyle,
  mutedTextStyle,
  numericCellStyle,
  pageTitleStyle,
  SearchField,
  SelectField,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../../shared/ui';
import { CrudReadListShell, parseFilter, useCrudList, useListState } from '../../../shared/crud';
import type { CrudColumn, RowTarget } from '../../../shared/crud';
import { couponAdapter, fetchCouponIssuances } from './data-source';
import {
  COUPON_FILTER_ALL,
  COUPON_TRIGGER_OPTIONS,
  couponExpiryFor,
  filterIssuancesBySource,
  issuancesByCoupon,
  summarizeIssuances,
  triggerSummary,
  triggerTypeLabel,
  usageRate,
} from './types';
import type {
  Coupon,
  CouponInput,
  CouponIssuance,
  CouponTriggerFilter,
  CouponTriggerType,
} from './types';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '발급 이력';
const LIST_PATH = '/products/coupons';
const FILTER_DEFAULTS = { source: COUPON_FILTER_ALL, coupon: COUPON_FILTER_ALL } as const;

const TRIGGER_FILTER_VALUES: readonly CouponTriggerFilter[] = [
  COUPON_FILTER_ALL,
  ...COUPON_TRIGGER_OPTIONS.map((option) => option.id),
];

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const sourceListStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const nowrapCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

const nameOf = (item: CouponIssuance) => `${item.member} · ${item.issuedAt}`;

/** 사용률 배지 톤 — 절반을 넘기면 성공, 아무도 안 쓰면 경고(걸어 둔 의미가 없다) */
function usedRateTone(rate: number, issued: number): 'success' | 'info' | 'warning' {
  if (issued === 0) return 'info';
  if (rate === 0) return 'warning';
  return rate >= 50 ? 'success' : 'info';
}

export default function CouponIssuanceListPage() {
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });

  const source: CouponTriggerFilter = parseFilter(
    list.filters['source'] ?? COUPON_FILTER_ALL,
    TRIGGER_FILTER_VALUES,
    COUPON_FILTER_ALL,
  );
  const couponFilter = list.filters['coupon'] ?? COUPON_FILTER_ALL;
  const { keyword } = list;

  // 쿠폰 목록은 이미 CRUD 컨트롤러가 들고 있다 — 같은 자료를 두 번 조회하지 않는다
  const coupons = useCrudList<Coupon, CouponInput>({
    resource: 'coupons',
    adapter: couponAdapter,
    entityLabel: '쿠폰',
    nameOf: (item) => item.name,
  });

  const issuancesQuery = useQuery({
    queryKey: ['coupons', 'issuances'],
    queryFn: ({ signal }) => fetchCouponIssuances(signal),
  });

  const issuances = useMemo(() => issuancesQuery.data ?? [], [issuancesQuery.data]);
  const byCoupon = useMemo(() => issuancesByCoupon(issuances), [issuances]);
  const couponNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const coupon of coupons.items) names[coupon.id] = coupon.name;
    return names;
  }, [coupons.items]);

  const visible = useMemo(() => {
    const bySource = filterIssuancesBySource(issuances, source);
    const byCouponId =
      couponFilter === COUPON_FILTER_ALL
        ? bySource
        : bySource.filter((entry) => entry.couponId === couponFilter);
    const needle = keyword.trim().toLowerCase();
    if (needle === '') return byCouponId;
    return byCouponId.filter(
      (entry) =>
        entry.member.toLowerCase().includes(needle) ||
        (couponNames[entry.couponId] ?? '').toLowerCase().includes(needle),
    );
  }, [issuances, source, couponFilter, keyword, couponNames]);

  const firstLoading = issuancesQuery.isFetching && issuancesQuery.data === undefined;

  /** 발급 1건이 언제 만료되는가 — 쿠폰의 사용 기간 규칙이 정한다(발급일 기준이면 회원마다 다르다) */
  const expiryOf = (entry: CouponIssuance): string => {
    const coupon = coupons.items.find((item) => item.id === entry.couponId);
    if (coupon === undefined) return '—';
    return couponExpiryFor(coupon, entry.issuedAt);
  };

  const columns: readonly CrudColumn<CouponIssuance>[] = [
    {
      header: '쿠폰',
      render: (item) => couponNames[item.couponId] ?? `삭제된 쿠폰 (${item.couponId})`,
    },
    { header: '발급 기준', nowrap: true, render: (item) => triggerTypeLabel(item.source) },
    { header: '회원', nowrap: true, render: (item) => item.member },
    { header: '발급일', nowrap: true, render: (item) => item.issuedAt },
    { header: '만료일', nowrap: true, render: (item) => expiryOf(item) },
    {
      header: '사용',
      nowrap: true,
      render: (item) =>
        item.usedAt === null ? (
          <StatusBadge tone="neutral" label="미사용" />
        ) : (
          <StatusBadge tone="success" label={`${item.usedAt} 사용`} />
        ),
    },
  ];

  const rowTarget: RowTarget<CouponIssuance> = {
    kind: 'edit',
    href: (item) => `${LIST_PATH}/${item.couponId}/edit`,
  };

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <SearchField
        value={list.searchInput}
        onChange={list.setSearchInput}
        label="회원·쿠폰명 검색"
        placeholder="회원 · 쿠폰명 검색"
        // 조합 중 커밋 금지 + Enter 차단 (COMP-10)
        {...list.searchInputProps}
      />
      <span style={selectWrapStyle}>
        <SelectField
          value={couponFilter}
          onChange={(event) => list.setFilter('coupon', event.target.value)}
          aria-label="쿠폰으로 거르기"
        >
          <option value={COUPON_FILTER_ALL}>전체 쿠폰</option>
          {coupons.items.map((coupon) => (
            <option key={coupon.id} value={coupon.id}>
              {coupon.name}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={source}
          onChange={(event) => list.setFilter('source', event.target.value)}
          aria-label="발급 기준으로 거르기"
        >
          <option value={COUPON_FILTER_ALL}>전체 발급 기준</option>
          {COUPON_TRIGGER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
    </div>
  );

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>쿠폰 발급 현황</h1>
        <p style={hintStyle}>
          쿠폰별 발급·사용 건수와 트리거별 유입을 확인해요. 행을 누르면 해당 쿠폰 설정으로 이동해요.
        </p>
      </div>

      <Card aria-labelledby="coupon-issuance-summary-title">
        <CardTitle id="coupon-issuance-summary-title">쿠폰별 요약</CardTitle>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <caption style={hintStyle}>
              발급·사용·사용률은 아래 발급 이력에서 센 값이고, 소진율은 쿠폰의 운영 누계 기준이에요.
            </caption>
            <thead>
              <tr>
                <th style={thStyle} scope="col">
                  쿠폰
                </th>
                <th style={thStyle} scope="col">
                  발급 기준
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} scope="col">
                  발급
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} scope="col">
                  사용
                </th>
                <th style={thStyle} scope="col">
                  사용률
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} scope="col">
                  소진율
                </th>
                <th style={thStyle} scope="col">
                  트리거별 발급
                </th>
              </tr>
            </thead>
            <tbody>
              {coupons.items.map((coupon) => {
                const stats = summarizeIssuances(byCoupon[coupon.id] ?? []);
                const sources = (
                  Object.entries(stats.bySource) as readonly [CouponTriggerType, number][]
                ).filter(([, count]) => count > 0);
                return (
                  <tr key={coupon.id}>
                    <td style={tdStyle}>
                      <Link
                        to={`${LIST_PATH}/${coupon.id}/edit`}
                        className="tds-ui-link tds-ui-focusable"
                      >
                        {coupon.name}
                      </Link>
                    </td>
                    <td style={nowrapCellStyle}>{triggerSummary(coupon.trigger)}</td>
                    <td style={numericCellStyle}>{formatNumber(stats.issued)}</td>
                    <td style={numericCellStyle}>{formatNumber(stats.used)}</td>
                    <td style={nowrapCellStyle}>
                      <StatusBadge
                        tone={usedRateTone(stats.usedRate, stats.issued)}
                        label={`${String(stats.usedRate)}%`}
                      />
                    </td>
                    <td style={numericCellStyle}>
                      {coupon.totalQuantity <= 0 ? '무제한' : `${String(usageRate(coupon))}%`}
                    </td>
                    <td style={tdStyle}>
                      {sources.length === 0 ? (
                        <span style={mutedTextStyle}>발급 없음</span>
                      ) : (
                        <span style={sourceListStyle}>
                          {sources.map(([type, count]) => (
                            <StatusBadge
                              key={type}
                              tone="info"
                              label={`${triggerTypeLabel(type)} ${formatNumber(count)}`}
                            />
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <CrudReadListShell
        entityLabel={ENTITY_LABEL}
        state={{
          firstLoading,
          refreshing: issuancesQuery.isFetching && !firstLoading,
          error: issuancesQuery.error,
          refetch: () => void issuancesQuery.refetch(),
        }}
        visibleItems={visible}
        columns={columns}
        nameOf={nameOf}
        rowTarget={rowTarget}
        toolbar={toolbar}
        empty={{
          createVerb: '발급',
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
        }}
      />

      <p style={hintStyle}>
        <Link to={LIST_PATH} className="tds-ui-link tds-ui-focusable">
          쿠폰 목록으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
