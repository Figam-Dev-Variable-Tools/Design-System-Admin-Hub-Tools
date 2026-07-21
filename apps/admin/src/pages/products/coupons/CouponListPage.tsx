// CouponListPage — 쿠폰 목록 (라우트: /products/coupons)
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 발급유형·발급기준 필터 + 검색 + 소진율 +
// 상태 배지 + 충돌 배지 + 발급 상태 인라인 토글 + 삭제팝업을 얹는다.
//
// [조회 상태의 소유자] issue·trigger·keyword 는 이 파일의 useState 가 아니라 shared/crud 의
// useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13) — '정률 할인' 쿠폰만 골라 한 건을 열어
// 소진율을 확인하고 Back 하면 예전에는 필터 없는 전체 목록에 착지했다. F5 도 같았다. 이제 그
// 조건이 URL 에 남아 복원되고, '이 조건 좀 봐주세요' 하며 링크로 공유된다. 검색은 IME 안전이다
// (COMP-10) — '신규가입' 을 치는 도중 자모마다 조회가 나가거나 Enter 가 '신규가ㅇ' 으로 제출되지 않는다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate, formatNumber } from '../../../shared/format';
import {
  Button,
  Icon,
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
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { conflictingProductsOf, couponAdapter } from './data-source';
import {
  conflictLabel,
  COUPON_FILTER_ALL,
  COUPON_ISSUE_OPTIONS,
  COUPON_TRIGGER_OPTIONS,
  couponStatus,
  couponStatusMeta,
  discountLabel,
  filterByTrigger,
  filterCoupons,
  toCouponInput,
  triggerSummary,
  usagePeriodLabel,
  usageRate,
} from './types';
import type { Coupon, CouponInput, CouponIssueFilter, CouponTriggerFilter } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'coupons';
const ENTITY_LABEL = '쿠폰';
const LIST_PATH = '/products/coupons';
const ISSUANCE_PATH = '/products/coupons/issuance';
const COUPON_FILTER_VALUES: readonly CouponIssueFilter[] = [
  COUPON_FILTER_ALL,
  ...COUPON_ISSUE_OPTIONS.map((option) => option.id),
];
const TRIGGER_FILTER_VALUES: readonly CouponTriggerFilter[] = [
  COUPON_FILTER_ALL,
  ...COUPON_TRIGGER_OPTIONS.map((option) => option.id),
];

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지워진다(공유 링크가 짧아진다) */
const FILTER_DEFAULTS = { issue: COUPON_FILTER_ALL, trigger: COUPON_FILTER_ALL } as const;

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

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 5)`,
};

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const nameOf = (item: Coupon) => item.name;

export default function CouponListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();
  // issue·trigger·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?issue=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const filter: CouponIssueFilter = parseFilter(
    list.filters['issue'] ?? COUPON_FILTER_ALL,
    COUPON_FILTER_VALUES,
    COUPON_FILTER_ALL,
  );
  const triggerFilter: CouponTriggerFilter = parseFilter(
    list.filters['trigger'] ?? COUPON_FILTER_ALL,
    TRIGGER_FILTER_VALUES,
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
  }, [filter, triggerFilter, keyword, clear]);

  const visible = useMemo(() => {
    const byType = filterByTrigger(filterCoupons(controller.items, filter), triggerFilter);
    const needle = keyword.trim().toLowerCase();
    if (needle === '') return byType;
    return byType.filter(
      (coupon) =>
        coupon.name.toLowerCase().includes(needle) || coupon.code.toLowerCase().includes(needle),
    );
  }, [controller.items, filter, triggerFilter, keyword]);

  const columns: readonly CrudColumn<Coupon>[] = [
    { header: '쿠폰명', render: (item) => item.name },
    { header: '코드', nowrap: true, render: (item) => item.code },
    { header: '할인', nowrap: true, render: (item) => discountLabel(item) },
    // 발급 기준은 '언제 나가는가' 라 목록에서 가장 자주 확인되는 축이다 — 파라미터까지 실어 보인다
    { header: '발급 기준', nowrap: true, render: (item) => triggerSummary(item.trigger) },
    {
      header: '사용 기간',
      nowrap: true,
      render: (item) => <span style={periodStyle}>{usagePeriodLabel(item)}</span>,
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
        // 충돌은 상태가 아니라 **경고**다 — 상태 배지를 덮지 않고 옆에 붙인다.
        // (승자는 상품이므로 쿠폰은 여전히 '진행중' 이다. 다만 그 상품에는 붙지 않는다.)
        const conflicts = conflictingProductsOf(item);
        return (
          <span style={badgeRowStyle}>
            <StatusBadge tone={meta.tone} label={meta.label} />
            {conflicts.length > 0 && (
              <StatusBadge tone="warning" label={conflictLabel(conflicts.length)} />
            )}
          </span>
        );
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
        <span style={selectWrapStyle}>
          <SelectField
            value={triggerFilter}
            onChange={(event) => list.setFilter('trigger', event.target.value)}
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
      <div style={actionsStyle}>
        {/* 발급 현황은 조회 전용이라 권한 게이팅이 없다 — read 는 라우트 가드가 이미 본다 */}
        <Button variant="secondary" size="md" onClick={() => navigate(ISSUANCE_PATH)}>
          <Icon name="bar-chart" />
          발급 현황
        </Button>
        {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
        {canCreate && (
          <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
            <Icon name="plus-circle" />
            쿠폰 등록
          </Button>
        )}
      </div>
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
