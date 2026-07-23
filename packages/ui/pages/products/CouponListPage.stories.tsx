/**
 * Design System/Templates/Products/Coupon List — 쿠폰 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Products"(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Products 그룹, `/products/coupons` → 화면 en = "Coupons" 에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/coupons/CouponListPage.tsx (라우트 /products/coupons)
 * 와 그 데이터 배선(shared/crud 의 CrudListShell + CrudTable). 발급유형 필터 + 검색 + 소진율 +
 * 상태 배지 + 발급 상태 인라인 토글 + 일괄 삭제.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 껍데기(CrudListShell/CrudTable)가 그리던 것을 DS 표면으로 되돌린다:
 *   검색 입력                  → SearchField
 *   발급유형 필터              → SelectField
 *   등록 버튼                  → Button(primary) + Icon(plus-circle)
 *   선택 일괄 삭제 바          → SelectionBar + Button(danger)
 *   전체선택 헤더 / 행 선택칸  → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   목록 표                    → Table (leadingHead=선택·순번 / trailingHead=행 액션)
 *   상태 배지                  → StatusBadge (couponStatusMeta 미러: 예정/진행중/만료/중지)
 *   발급 인라인 토글           → ToggleSwitch (발급중/중지)
 *   행 ⋯ 액션(수정/삭제)       → RowActions
 *   빈 결과                    → Empty
 *   조회 실패 배너             → Alert(danger) + Button(secondary)
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  ToggleSwitch,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Coupon List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 coupons/types 모델을 화면이 쓰는 필드만 축약해 흉내) ──────────────────────── */

type CouponIssueType = 'amount' | 'percent' | 'free_shipping';

interface DemoCoupon {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: number;
  readonly totalQuantity: number;
  readonly issuedCount: number;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
}

/** 발급유형 필터 선택지 — 실화면 COUPON_ISSUE_OPTIONS 미러 */
const ISSUE_OPTIONS: readonly { readonly id: CouponIssueType; readonly label: string }[] = [
  { id: 'amount', label: '정액 할인(원)' },
  { id: 'percent', label: '정률 할인(%)' },
  { id: 'free_shipping', label: '무료배송' },
];

const FILTER_ALL = 'all';
type IssueFilter = typeof FILTER_ALL | CouponIssueType;

/** 오늘 — 상태 파생 기준(진행중/예정/만료). 실화면은 formatDate(new Date()) */
const TODAY = '2026-07-21';

const DEMO_COUPONS: readonly DemoCoupon[] = [
  {
    id: 'c-1',
    name: '신규 가입 15% 할인',
    code: 'WELCOME15',
    issueType: 'percent',
    discountValue: 15,
    totalQuantity: 1000,
    issuedCount: 620,
    startAt: '2026-07-01',
    endAt: '2026-08-31',
    enabled: true,
  },
  {
    id: 'c-2',
    name: '5천원 즉시 할인',
    code: 'SAVE5000',
    issueType: 'amount',
    discountValue: 5000,
    totalQuantity: 500,
    issuedCount: 500,
    startAt: '2026-06-01',
    endAt: '2026-06-30',
    enabled: true,
  },
  {
    id: 'c-3',
    name: '여름맞이 무료배송',
    code: 'FREESHIP',
    issueType: 'free_shipping',
    discountValue: 0,
    totalQuantity: 0,
    issuedCount: 1840,
    startAt: '2026-07-15',
    endAt: '2026-09-15',
    enabled: true,
  },
  {
    id: 'c-4',
    name: 'VIP 전용 20% 쿠폰',
    code: 'VIP20',
    issueType: 'percent',
    discountValue: 20,
    totalQuantity: 300,
    issuedCount: 45,
    startAt: '2026-08-01',
    endAt: '2026-08-15',
    enabled: true,
  },
  {
    id: 'c-5',
    name: '가을 프리뷰 1만원 할인',
    code: 'AUTUMN10000',
    issueType: 'amount',
    discountValue: 10000,
    totalQuantity: 200,
    issuedCount: 12,
    startAt: '2026-09-01',
    endAt: '2026-09-30',
    enabled: false,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 할인 요약 문구 — 실화면 discountLabel 미러 */
const discountLabel = (coupon: DemoCoupon): string => {
  if (coupon.issueType === 'free_shipping') return '무료배송';
  if (coupon.issueType === 'percent') return `${String(coupon.discountValue)}% 할인`;
  return `${fmt(coupon.discountValue)}원 할인`;
};

/** 소진율(%) — 무제한(0)이면 0. 실화면 usageRate 미러 */
const usageRate = (coupon: DemoCoupon): number => {
  if (coupon.totalQuantity <= 0) return 0;
  return Math.min(100, Math.round((coupon.issuedCount / coupon.totalQuantity) * 100));
};

const usageText = (coupon: DemoCoupon): string =>
  coupon.totalQuantity <= 0
    ? '무제한'
    : `${fmt(coupon.issuedCount)}/${fmt(coupon.totalQuantity)} (${String(usageRate(coupon))}%)`;

type CouponStatus = 'scheduled' | 'active' | 'expired' | 'disabled';

/** 상태 파생 — 실화면 couponStatus 미러 */
const couponStatus = (coupon: DemoCoupon): CouponStatus => {
  if (!coupon.enabled) return 'disabled';
  if (TODAY < coupon.startAt) return 'scheduled';
  if (TODAY > coupon.endAt) return 'expired';
  return 'active';
};

/** 상태 배지 메타 — 실화면 STATUS_META 미러 */
const STATUS_META: Record<
  CouponStatus,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  scheduled: { label: '예정', tone: 'info' },
  active: { label: '진행중', tone: 'success' },
  expired: { label: '만료', tone: 'neutral' },
  disabled: { label: '중지', tone: 'neutral' },
};

/* ── 표 열 정의(데이터 열 7개 — 선택/순번/액션 열은 leadingHead·trailingHead 로 별도) ─────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '쿠폰명' },
  { id: 'code', header: '코드', nowrap: true },
  { id: 'discount', header: '할인', nowrap: true },
  { id: 'period', header: '사용기간', nowrap: true },
  { id: 'usage', header: '소진율', align: 'end' },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'enabled', header: '발급', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'coupon-select-all-label';
const PAGE_SIZE = 10;

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

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

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 5)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

const errorRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const actionCellWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface CouponListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 조회 실패 배너 — Alert(danger) */
  readonly error?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
  /** 삭제 확인 다이얼로그를 이 쿠폰에 대해 연 채로 시작 */
  readonly initialDeleteId?: string;
}

function CouponListScreen({
  loading = false,
  error = false,
  initialKeyword = '',
  initialSelectedIds = [],
  initialDeleteId,
}: CouponListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [issue, setIssue] = useState<IssueFilter>(FILTER_ALL);
  const [enabledMap, setEnabledMap] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(DEMO_COUPONS.map((coupon) => [coupon.id, coupon.enabled])),
  );
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [pendingDelete, setPendingDelete] = useState<DemoCoupon | null>(
    () => DEMO_COUPONS.find((coupon) => coupon.id === initialDeleteId) ?? null,
  );

  // 현재 발급 토글 상태를 반영한 목록
  const coupons = useMemo(
    () =>
      DEMO_COUPONS.map((coupon) => ({
        ...coupon,
        enabled: enabledMap[coupon.id] ?? coupon.enabled,
      })),
    [enabledMap],
  );

  // 발급유형 필터 + 쿠폰명/코드 키워드 — 실화면 filterCoupons + 검색 미러
  const visible = useMemo(() => {
    const byType =
      issue === FILTER_ALL ? coupons : coupons.filter((coupon) => coupon.issueType === issue);
    const needle = keyword.trim().toLowerCase();
    if (needle === '') return byType;
    return byType.filter(
      (coupon) =>
        coupon.name.toLowerCase().includes(needle) || coupon.code.toLowerCase().includes(needle),
    );
  }, [coupons, issue, keyword]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;
  const hasActiveFilters = issue !== FILTER_ALL;

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const coupon of visible) {
        if (checked) next.add(coupon.id);
        else next.delete(coupon.id);
      }
      return next;
    });
  };

  const setEnabled = (id: string, next: boolean): void => {
    setEnabledMap((prev) => ({ ...prev, [id]: next }));
  };

  const rows: TableProps['rows'] = visible.map((coupon, index) => {
    const meta = STATUS_META[couponStatus(coupon)];
    return {
      id: coupon.id,
      selected: selectedIds.has(coupon.id),
      onActivate: () => {
        /* 실화면에서는 쿠폰 수정(/products/coupons/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
      },
      leading: [
        <RowSelectCell
          key="select"
          id={coupon.id}
          label={`${coupon.name} 선택`}
          checked={selectedIds.has(coupon.id)}
          onToggle={(checked) => toggleOne(coupon.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        coupon.name,
        coupon.code,
        discountLabel(coupon),
        <span key="period" style={periodStyle}>{`${coupon.startAt} ~ ${coupon.endAt}`}</span>,
        usageText(coupon),
        <StatusBadge key="status" tone={meta.tone} label={meta.label} />,
        <ToggleSwitch
          key="enabled"
          checked={coupon.enabled}
          onChange={(next) => setEnabled(coupon.id, next)}
          label={`${coupon.name} 발급 여부`}
          onLabel="발급중"
          offLabel="중지"
        />,
      ],
      trailing: [
        <td key="actions" className="tds-table__cell tds-table__cell--end">
          <span style={actionCellWrapStyle}>
            <RowActions
              label={coupon.name}
              onEdit={() => {
                /* 실화면: 쿠폰 수정 화면으로 이동 */
              }}
              onDelete={() => setPendingDelete(coupon)}
            />
          </span>
        </td>,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>쿠폰</h1>

      {/* 툴바 — 검색 + 발급유형 필터 + 등록 */}
      <div style={toolbarStyle}>
        <div style={filtersStyle}>
          <div style={searchWrapStyle}>
            <SearchField
              label="쿠폰명·코드 검색"
              value={keyword}
              placeholder="쿠폰명 · 코드 검색"
              onChange={setKeyword}
            />
          </div>
          <span style={selectWrapStyle}>
            <SelectField
              value={issue}
              onChange={(event) => setIssue(event.target.value as IssueFilter)}
              aria-label="발급유형으로 거르기"
            >
              <option value={FILTER_ALL}>전체 유형</option>
              {ISSUE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>

        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          쿠폰 등록
        </Button>
      </div>

      {error ? (
        <Alert tone="danger">
          <div style={errorRowStyle}>
            <span>쿠폰 목록을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <>
          {/* 선택 일괄 삭제 바 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
          <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
            <Button variant="danger" size="sm">
              {`선택 ${fmt(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <p style={summaryStyle}>
            {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          <Table
            caption="쿠폰 목록 — 행을 누르면 쿠폰 수정으로 이동해요. 체크박스·발급 토글·수정·삭제 버튼은 각자 따로 동작해요."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 쿠폰 전체 선택"
                labelId={SELECT_ALL_LABEL_ID}
                selection={selection}
                onToggleAll={toggleAll}
              />,
              <SeqHeaderCell key="seq" />,
            ]}
            trailingHead={[
              <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
                <span style={visuallyHidden}>행 액션</span>
              </th>,
            ]}
            loading={loading}
            skeletonRows={PAGE_SIZE}
            empty={
              <EmptyState
                label="쿠폰"
                hasQuery={keyword.trim() !== ''}
                hasActiveFilters={hasActiveFilters}
                onClearSearch={() => setKeyword('')}
                onResetFilters={() => setIssue(FILTER_ALL)}
              />
            }
          />
        </>
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="쿠폰 삭제"
          message={`'${pendingDelete.name}' 쿠폰을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="쿠폰 삭제"
          onConfirm={() => setPendingDelete(null)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** 정상: 쿠폰 목록이 채워진 기본 상태(상태 배지 + 발급 토글 + 소진율) */
export const Default: Story = {
  render: () => <CouponListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CouponListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <CouponListScreen initialKeyword="존재하지 않는 쿠폰" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <CouponListScreen initialSelectedIds={['c-1', 'c-3']} />,
};

/** 조회 실패: danger 배너 + 다시 시도 (STATE-02) */
export const LoadError: Story = {
  render: () => <CouponListScreen error />,
};

/** 삭제 확인: 행 액션의 휴지통 → ConfirmDialog(intent=delete) */
export const DeleteConfirm: Story = {
  render: () => <CouponListScreen initialDeleteId="c-4" />,
};
