// CouponListPage — 쿠폰 목록 (라우트: /products/coupons) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 발급유형 필터 + 검색 + 소진율 + 상태 배지
// + 발급 상태 인라인 토글 + 삭제팝업을 얹는다.
import { useEffect, useMemo, useState } from 'react';
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
import { CrudListShell, parseFilter, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
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
  const [filter, setFilter] = useState<CouponIssueFilter>(COUPON_FILTER_ALL);
  const [keyword, setKeyword] = useState('');
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
          value={keyword}
          onChange={setKeyword}
          label="쿠폰명·코드 검색"
          placeholder="쿠폰명 · 코드 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) =>
              setFilter(parseFilter(event.target.value, COUPON_FILTER_VALUES, COUPON_FILTER_ALL))
            }
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
      selectAllLabelId="coupon-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
