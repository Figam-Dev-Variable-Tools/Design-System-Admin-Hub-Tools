/**
 * Design System/Templates/Sales/Billing — 청구·입금 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/sales/billing` → 메뉴 en = "Sales"(영업 관리), 화면 en = "Billing"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Sales 그룹의
 * `['/sales/billing', '청구·입금', 'Billing']`).
 *
 * 대응 실화면: apps/admin/src/pages/sales/billing/BillingListPage.tsx (라우트 /sales/billing) 와
 * 그 하위 조립(types.ts) · 공용 껍데기(shared/crud/CrudReadListShell · shared/ui/FilterRail).
 *
 * [왜 이런 구조인가 — 결제대행이 없는 운영의 '결제완료'] 앱이 결제를 처리하지 않으므로 '입금됨'을
 * 만드는 것은 **판매자의 입금확인**이다. 그래서 이 목록의 중심 열은 청구액이 아니라 **잔액과 입금
 * 상태**이고, 운영자가 여기서 하는 판단은 '누구에게 다시 안내할까' 하나뿐이다. 좌측 안내가
 * 미수금 총액을 먼저 말하는 것도 그래서다.
 *
 * [등록 버튼이 없다] 청구는 **수주로 전환된 견적에서만** 생긴다 — 근거 없는 청구를 만들 문을 아예
 * 두지 않는다. 삭제·일괄작업도 없다: 청구는 회계 기록이고, 기록한 입금은 되돌리지 않는다.
 * 그래서 읽기 전용 껍데기(CrudReadListShell)를 쓴다.
 *
 * [입금 상태는 저장하지 않는다] 미입금/부분입금/입금완료는 입금 기록의 **누적 합에서 파생**한다.
 * 상태를 따로 저장하면 '입금 3건은 있는데 상태는 미입금' 인 순간이 생기고, 목록 배지와 잔액이
 * 동시에 거짓말을 한다. 완납 판정도 마지막 한 건이 아니라 누적 합이 청구액에 닿았는가로 한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   FilterRail/FilterPanel → 안내 문단 + aria-pressed 토글 버튼 목록 + 건수 Badge
 *   CrudReadListShell      → DS Table(leadingHead=순번만 · 선택 열 없음) + 툴바 + 요약 줄
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 입금 상태 필터        → aria-pressed 토글 버튼 목록 + Badge 건수 (실화면 FilterPanel)
 *   미수금 총액 · 운영 안내     → 토큰 <p>(muted)
 *   청구번호·견적번호·거래처 검색 → SearchField
 *   순번 열                   → SeqHeaderCell · SeqCell (선택 열은 없다)
 *   청구번호 · 원 견적 링크     → 토큰 <a>(상세 · 견적 상세로 가는 키보드 경로)
 *   안내 발송 배지             → StatusBadge (발송 N회 success / 미발송 warning)
 *   입금 상태 배지             → StatusBadge (미입금 warning · 부분입금 info · 입금완료 success)
 *   목록 표                   → Table (금액 열은 align='end')
 *   빈 결과                   → Empty (검색 지우기 · 필터 초기화)
 *   조회 권한만 있음           → 좌측 안내 한 줄 (EXC-03)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Empty as EmptyState,
  SearchField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Billing',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 sales/billing/types.ts 미러) ─────────────────────────────────────────── */

/**
 * 청구 방식 — 두 가지뿐인 것은 이 운영에 실제로 두 가지밖에 없기 때문이다.
 * '카드결제' 를 넣지 않는 이유도 같다: 앱이 카드를 받지 않는데 선택지에 있으면 운영자가 고르고,
 * 고른 뒤에 할 일이 없다.
 */
type BillingMethod = 'bank_transfer' | 'payment_link';

const METHOD_LABEL: Readonly<Record<BillingMethod, string>> = {
  bank_transfer: '계좌이체',
  payment_link: '개인결제창',
};

/** 입금 상태 — **저장하지 않는다.** 입금 기록의 누적 합에서 파생한다 */
type PaymentState = 'unpaid' | 'partial' | 'paid';

/**
 * 부분입금을 미입금과 같은 색으로 두지 않는다 — 둘은 운영자가 할 일이 다르다.
 * 미입금은 안내를 다시 보낼 자리이고, 부분입금은 잔액만 받아 내면 되는 자리다.
 */
const STATE_META: Readonly<
  Record<PaymentState, { readonly label: string; readonly tone: StatusBadgeTone }>
> = {
  unpaid: { label: '미입금', tone: 'warning' },
  partial: { label: '부분입금', tone: 'info' },
  paid: { label: '입금완료', tone: 'success' },
};

const FILTER_ALL = 'all';
type StateFilter = typeof FILTER_ALL | PaymentState;

const STATE_FILTERS: readonly { readonly id: StateFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체' },
  { id: 'unpaid', label: '미입금' },
  { id: 'partial', label: '부분입금' },
  { id: 'paid', label: '입금완료' },
];

/* ── 데모 데이터(실화면 BILLING_SEED 미러 — 상호·계좌 표기는 전부 가상이다) ────────────────────── */

interface DemoPayment {
  readonly id: string;
  /** 입금일 'YYYY-MM-DD' — 통장에 찍힌 날이다(입력한 날이 아니다) */
  readonly paidOn: string;
  readonly amount: number;
  readonly memo: string;
}

interface DemoBilling {
  readonly id: string;
  /** 청구번호 — 'BL-YYYYMMDD-NNN'. 사람이 정하지 않고 채번한다 */
  readonly billNo: string;
  readonly accountName: string;
  /** 원 견적번호(승계 스냅숏) — 견적 없이 만든 청구면 '' */
  readonly quoteNo: string;
  readonly method: BillingMethod;
  /** 청구액(원) — 견적 합계의 스냅숏. 견적을 고쳐도 이미 청구한 금액은 움직이지 않는다 */
  readonly amount: number;
  readonly issuedAt: string;
  /** 청구 안내 발송 횟수 — 되돌리지 않는다(보낸 것은 보낸 것이다) */
  readonly noticeCount: number;
  readonly payments: readonly DemoPayment[];
}

/** 청구일 내림차순(최근이 위) — 실화면 sortBillings 가 낸 순서 그대로 */
const DEMO_BILLINGS: readonly DemoBilling[] = [
  {
    id: 'bl-1',
    billNo: 'BL-20260706-001',
    accountName: '대성물산 주식회사',
    quoteNo: 'Q-20260705-001',
    method: 'bank_transfer',
    amount: 3960000,
    issuedAt: '2026-07-06',
    noticeCount: 1,
    // 부분 입금 — 절반만 들어왔다. 누적 합이 청구액에 닿아야 완료다
    payments: [{ id: 'bp-1', paidOn: '2026-07-08', amount: 2000000, memo: '대성물산(선금)' }],
  },
  {
    id: 'bl-2',
    billNo: 'BL-20260702-001',
    accountName: '(주)한빛소프트웨어',
    // 견적 없이 만든 청구 — 원 견적 열이 '—' 로 남는다
    quoteNo: '',
    method: 'payment_link',
    amount: 1200000,
    issuedAt: '2026-07-02',
    noticeCount: 2,
    payments: [],
  },
  {
    id: 'bl-3',
    billNo: 'BL-20260620-001',
    accountName: '미래테크놀로지',
    quoteNo: '',
    method: 'bank_transfer',
    amount: 4500000,
    issuedAt: '2026-06-20',
    noticeCount: 1,
    // 두 번에 나눠 들어와 합계가 청구액에 닿았다 — 완료 판정은 누적 합이다
    payments: [
      { id: 'bp-2', paidOn: '2026-06-25', amount: 2500000, memo: '미래테크(1차)' },
      { id: 'bp-3', paidOn: '2026-07-03', amount: 2000000, memo: '미래테크(잔금)' },
    ],
  },
];

/* ── 순수 규칙(실화면 미러 — 화면이 각자 다시 더하지 않는다) ─────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');
const formatWon = (value: number): string => `${fmt(value)}원`;

/** 지금까지 들어온 금액 — **누적 합**이다. 마지막 한 건이 아니다 */
const paidAmount = (billing: DemoBilling): number =>
  billing.payments.reduce((sum, payment) => sum + payment.amount, 0);

/** 아직 안 들어온 금액. 초과 입금을 막으므로 음수가 되지 않는다 */
const outstandingAmount = (billing: DemoBilling): number => billing.amount - paidAmount(billing);

function billingPaymentState(billing: DemoBilling): PaymentState {
  const paid = paidAmount(billing);
  if (paid <= 0) return 'unpaid';
  return paid >= billing.amount ? 'paid' : 'partial';
}

/** 완납일 — 잔액을 0 으로 만든 그 입금의 날짜. 아직이면 '' */
function paidOnDate(billing: DemoBilling): string {
  let running = 0;
  for (const payment of billing.payments) {
    running += payment.amount;
    if (running >= billing.amount) return payment.paidOn;
  }
  return '';
}

/** 아직 다 받지 못한 청구의 잔액 합 — 좌측 안내가 '지금 얼마가 미수인가' 를 말한다 */
const totalOutstanding = (list: readonly DemoBilling[]): number =>
  list.reduce((sum, billing) => sum + Math.max(outstandingAmount(billing), 0), 0);

/** 건수 배지 — **필터 이전** 전체 집합에서 센다(필터가 자기 배지를 흔들면 비교가 불가능하다) */
const STATE_COUNTS: Readonly<Record<StateFilter, number>> = (() => {
  const counts: Record<StateFilter, number> = {
    [FILTER_ALL]: DEMO_BILLINGS.length,
    unpaid: 0,
    partial: 0,
    paid: 0,
  };
  for (const billing of DEMO_BILLINGS) counts[billingPaymentState(billing)] += 1;
  return counts;
})();

function filterBillings(list: readonly DemoBilling[], filter: StateFilter): readonly DemoBilling[] {
  if (filter === FILTER_ALL) return list;
  return list.filter((billing) => billingPaymentState(billing) === filter);
}

function searchBillings(list: readonly DemoBilling[], keyword: string): readonly DemoBilling[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (billing) =>
      billing.billNo.toLowerCase().includes(needle) ||
      billing.quoteNo.toLowerCase().includes(needle) ||
      billing.accountName.toLowerCase().includes(needle),
  );
}

/* ── 표 열 정의(데이터 열 10개 — 순번은 leading 으로 별도) ───────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'billNo', header: '청구번호', nowrap: true },
  { id: 'account', header: '거래처' },
  { id: 'quote', header: '원 견적', nowrap: true },
  { id: 'method', header: '청구 방식', nowrap: true },
  { id: 'amount', header: '청구액', align: 'end', nowrap: true },
  { id: 'paid', header: '입금액', align: 'end', nowrap: true },
  { id: 'outstanding', header: '잔액', align: 'end', nowrap: true },
  { id: 'notice', header: '안내 발송', nowrap: true },
  { id: 'state', header: '입금 상태', nowrap: true },
  { id: 'paidOn', header: '입금일', nowrap: true },
];

const PAGE_SIZE = 3;

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
  marginBottom: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const railNoticeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const filterHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const filterButtonStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: active ? cssVar('color.border.default') : 'transparent',
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  cursor: 'pointer',
  textAlign: 'start',
  ...typography('typography.label.md'),
});

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
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

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
  ...monoStyle,
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/* ── 좌측 필터 패널 조립(FilterPanel 미러) ───────────────────────────────────────────────────── */

function StateFilterPanel({
  value,
  onChange,
  counts,
}: {
  readonly value: StateFilter;
  readonly onChange: (next: StateFilter) => void;
  readonly counts: Readonly<Record<string, number>> | null;
}) {
  return (
    <nav aria-label="청구 입금 상태 필터">
      <p style={filterHeadingStyle}>입금 상태</p>
      <ul style={filterListStyle}>
        {STATE_FILTERS.map((option) => {
          const active = option.id === value;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={active}
                style={filterButtonStyle(active)}
                onClick={() => onChange(option.id)}
              >
                <span>{option.label}</span>
                {/* 건수를 아직 모르면 '—' 를 둔다 — 0 과 '모름' 은 다른 사실이다 */}
                {counts === null ? (
                  <span aria-hidden>—</span>
                ) : (
                  <Badge count={counts[option.id] ?? 0} hideWhenZero={false} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface BillingListScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialState?: StateFilter;
  /** 입금확인 권한이 없는 역할 — 좌측 안내가 그 사실을 미리 밝힌다 (EXC-03) */
  readonly canUpdate?: boolean;
}

function BillingListScreen({
  loading = false,
  initialKeyword = '',
  initialState = FILTER_ALL,
  canUpdate = true,
}: BillingListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [state, setState] = useState<StateFilter>(initialState);

  const visible = useMemo(
    () => searchBillings(filterBillings(DEMO_BILLINGS, state), keyword),
    [state, keyword],
  );

  const rows: TableProps['rows'] = visible.map((billing, index) => {
    const stateMeta = STATE_META[billingPaymentState(billing)];
    const on = paidOnDate(billing);
    return {
      id: billing.id,
      onActivate: () => {
        /* 실화면: 행 클릭 → 청구 상세(/sales/billing/:id — 입금확인·안내 발송) */
      },
      leading: [<SeqCell key="seq" seq={index + 1} />],
      cells: [
        // 청구번호는 상세로 가는 **키보드 경로**다 — 행 클릭은 마우스 전용이다
        <a key="billNo" href="#billing-detail" style={linkStyle}>
          {billing.billNo}
        </a>,
        <span key="account">{billing.accountName}</span>,
        billing.quoteNo === '' ? (
          <span key="quote" style={mutedStyle}>
            —
          </span>
        ) : (
          <a
            key="quote"
            href="#quote-detail"
            style={linkStyle}
            aria-label={`${billing.billNo} 원 견적 ${billing.quoteNo}`}
          >
            {billing.quoteNo}
          </a>
        ),
        <span key="method">{METHOD_LABEL[billing.method]}</span>,
        <span key="amount" style={monoStyle}>
          {formatWon(billing.amount)}
        </span>,
        <span key="paid" style={monoStyle}>
          {formatWon(paidAmount(billing))}
        </span>,
        <span key="outstanding" style={monoStyle}>
          {formatWon(outstandingAmount(billing))}
        </span>,
        // 미입금인데 안내조차 안 나간 건이 운영자가 가장 먼저 집을 행이다
        billing.noticeCount > 0 ? (
          <StatusBadge key="notice" tone="success" label={`발송 ${fmt(billing.noticeCount)}회`} />
        ) : (
          <StatusBadge key="notice" tone="warning" label="미발송" />
        ),
        <StatusBadge key="state" tone={stateMeta.tone} label={stateMeta.label} />,
        on === '' ? (
          <span key="paidOn" style={mutedStyle}>
            —
          </span>
        ) : (
          <span key="paidOn" style={monoStyle}>
            {on}
          </span>
        ),
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>청구·입금</h1>

      <div style={layoutStyle}>
        <aside style={railStyle}>
          <p style={railNoticeStyle}>
            {loading
              ? '미수금을 세는 중이에요.'
              : `아직 받지 못한 금액은 ${formatWon(totalOutstanding(DEMO_BILLINGS))}이에요.`}
          </p>
          <p style={railNoticeStyle}>
            청구는 수주로 전환된 견적에서만 만들어져요. 견적 상세의 &lsquo;청구 만들기&rsquo;로
            시작하세요.
          </p>
          <p style={railNoticeStyle}>
            결제대행을 쓰지 않으므로 입금은 사람이 확인해 기록해요. 기록한 입금은 되돌릴 수 없어요.
          </p>
          {!canUpdate && <p style={railNoticeStyle}>입금확인 권한이 없어 조회만 가능해요.</p>}
          <StateFilterPanel
            value={state}
            onChange={setState}
            counts={loading ? null : STATE_COUNTS}
          />
        </aside>

        <div style={columnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                value={keyword}
                onChange={setKeyword}
                label="청구번호·견적번호·거래처 검색"
                placeholder="청구번호 · 견적번호 · 거래처 검색"
              />
            </span>
          </div>

          <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}</p>

          <div style={tableScrollStyle}>
            <Table
              caption="청구 목록 — 행을 누르면 청구 상세(입금확인·안내 발송)로 이동해요. 입금 상태는 입금 기록의 누적 합에서 파생돼요."
              columns={COLUMNS}
              rows={rows}
              leadingHead={[<SeqHeaderCell key="seq" />]}
              loading={loading}
              skeletonRows={PAGE_SIZE}
              empty={
                <EmptyState
                  label="청구"
                  createVerb="생성"
                  hasQuery={keyword.trim() !== ''}
                  hasActiveFilters={state !== FILTER_ALL}
                  onClearSearch={() => setKeyword('')}
                  onResetFilters={() => setState(FILTER_ALL)}
                />
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 정상: 세 갈래가 모두 있는 목록 — 부분입금(잔액 1,960,000원) · 미입금(안내 2회) ·
 * 입금완료(두 번에 나눠 들어와 누적 합이 청구액에 닿았다).
 */
export const Default: Story = {
  render: () => <BillingListScreen />,
};

/** 최초 로드: 표 스켈레톤 + 좌측 건수 '—' + 미수금 '세는 중'(0 과 '모름' 은 다르다 · STATE-01) */
export const Loading: Story = {
  render: () => <BillingListScreen loading />,
};

/** 미입금 필터: 안내는 나갔는데 돈이 안 들어온 건 — 운영자가 다시 안내할 자리다 */
export const Unpaid: Story = {
  render: () => <BillingListScreen initialState="unpaid" />,
};

/** 조회 전용: 입금확인 권한이 없다 — 좌측 안내가 그 사실을 미리 밝힌다 (EXC-03) */
export const ReadOnly: Story = {
  render: () => <BillingListScreen canUpdate={false} />,
};

/** 빈 결과: 검색이 맞지 않음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화) */
export const Empty: Story = {
  render: () => <BillingListScreen initialKeyword="BL-19990101-001" />,
};
