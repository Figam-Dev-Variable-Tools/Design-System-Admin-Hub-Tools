// CouponListPage — 쿠폰 목록 (라우트: /products/coupons) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 발급유형 필터 + 검색 + 소진율 + 상태 배지
// + 발급 상태 인라인 토글 + 삭제팝업을 얹는다.
//
// [조회 상태의 소유자] issue·keyword 는 이 파일의 useState 2개였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '정률 할인' 쿠폰만 골라 한 건을 열어 소진율을 확인하고
// Back 하면 예전에는 필터 없는 전체 목록에 착지했다. F5 도 같았다. 이제 그 조건이 URL 에 남아
// 복원되고, '이 조건 좀 봐주세요' 하며 링크로 공유된다. 검색은 IME 안전이다 (COMP-10) —
// '신규가입' 을 치는 도중 자모마다 조회가 나가거나 Enter 가 '신규가ㅇ' 으로 제출되지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate, formatNumber } from '../../../shared/format';
import {
  Button,
  PlusCircleIcon,
  SearchField,
  SelectField,
  StatusBadge,
  ToggleSwitch,
} from '../../../shared/ui';
import {
  CrudListShell,
  parseFilter,
  useCrudList,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { couponAdapter } from './data-source';
import {
  COUPON_FILTER_ALL,
  COUPON_ISSUE_OPTIONS,
  couponStatus,
  couponStatusMeta,
  discountLabel,
  filterCoupons,
  toCouponInput,
  usageRate,
} from './types';
import type { Coupon, CouponInput, CouponIssueFilter } from './types';

const RESOURCE = 'coupons';
const ENTITY_LABEL = '쿠폰';
const LIST_PATH = '/products/coupons';
const COUPON_FILTER_VALUES: readonly CouponIssueFilter[] = [
  COUPON_FILTER_ALL,
  ...COUPON_ISSUE_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { issue: COUPON_FILTER_ALL } as const;

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

const periodStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
};

const nameOf = (item: Coupon) => item.name;

export default function CouponListPage() {
  const navigate = useNavigate();
  // issue·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?issue=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: CouponIssueFilter = parseFilter(
    list.filters['issue'] ?? COUPON_FILTER_ALL,
    COUPON_FILTER_VALUES,
    COUPON_FILTER_ALL,
  );
  const { keyword } = list;
  const today = formatDate(new Date());

  const controller = useCrudList<Coupon, CouponInput>({
    resource: RESOURCE,
    adapter: couponAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<Coupon, CouponInput>(RESOURCE, couponAdapter);

  useEffect(() => {
    clear();
  }, [filter, keyword, clear]);

  const visible = useMemo(() => {
    const byType = filterCoupons(controller.items, filter);
    const needle = keyword.trim().toLowerCase();
    if (needle === '') return byType;
    return byType.filter(
      (coupon) =>
        coupon.name.toLowerCase().includes(needle) || coupon.code.toLowerCase().includes(needle),
    );
  }, [controller.items, filter, keyword]);

  const columns: readonly CrudColumn<Coupon>[] = [
    { header: '쿠폰명', render: (item) => item.name },
    { header: '코드', nowrap: true, render: (item) => item.code },
    { header: '할인', nowrap: true, render: (item) => discountLabel(item) },
    {
      header: '사용기간',
      nowrap: true,
      render: (item) => <span style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
    {
      header: '소진율',
      numeric: true,
      render: (item) =>
        item.totalQuantity <= 0
          ? '무제한'
          : `${formatNumber(item.issuedCount)}/${formatNumber(item.totalQuantity)} (${String(usageRate(item))}%)`,
    },
    {
      header: '상태',
      nowrap: true,
      render: (item) => {
        const meta = couponStatusMeta(couponStatus(item, today));
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
    {
      header: '발급',
      nowrap: true,
      render: (item) => (
        <ToggleSwitch
          checked={item.enabled}
          busy={toggle.pendingId === item.id}
          onChange={(next) =>
            toggle.run(
              item.id,
              { ...toCouponInput(item), enabled: next },
              {
                success: next
                  ? `'${item.name}' 쿠폰을 발급중으로 바꿨습니다.`
                  : `'${item.name}' 쿠폰 발급을 중지했습니다.`,
              },
            )
          }
          label={`${item.name} 발급 여부`}
          onLabel="발급중"
          offLabel="중지"
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="쿠폰명·코드 검색"
          placeholder="쿠폰명 · 코드 검색"
          // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => list.setFilter('issue', event.target.value)}
            aria-label="발급유형으로 거르기"
          >
            <option value={COUPON_FILTER_ALL}>전체 유형</option>
            {COUPON_ISSUE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        쿠폰 등록
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
      selectAllLabelId="coupon-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
