/**
 * Design System/Templates/Sales/Billing Detail — 청구 상세·입금확인 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/sales/billing/:id` → 메뉴 en = "Sales"(영업 관리), 화면 en =
 * "Billing" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Sales 그룹의
 * `['/sales/billing', '청구·입금', 'Billing']`. 상세는 그 잎의 하위 경로다).
 *
 * 대응 실화면: apps/admin/src/pages/sales/billing/BillingDetailPage.tsx (라우트 /sales/billing/:id).
 *
 * [왜 이런 구조인가 — 이 화면은 한 동작을 위해 있다] 결제대행이 없으므로 '결제완료' 를 만드는 것은
 * **사람의 입금확인**이다. 그래서 화면이 두 단으로 갈린다: 왼쪽은 읽는 것(청구 요약 · 청구 방식),
 * 오른쪽은 기록하는 것(입금확인 · 청구 안내). 각 기록은 표로 쌓이고 지워지지 않는다.
 *
 * [되돌리는 버튼이 없다] 입금 기록은 회계 기록이라 고치지도 지우지도 않는다. 실수를 되돌리는 문을
 * 열면 그것이 곧 '입금 취소' 가 된다 — 잘못 넣었다면 반대 부호의 기록을 덧붙이는 것이 회계의
 * 방식이고, 그 문(감액 기록)은 아직 열지 않는다.
 *
 * [상태를 고르는 select 가 없다] 미입금/부분입금/입금완료는 입금 기록의 **누적 합에서 파생**한다.
 * 기록 하나만 덧붙이면 상단 배지·잔액·완납일이 동시에 따라온다 — 파생이면 갈라질 수 없다.
 *
 * [막힌 버튼은 이유를 말한다] 입금확인 버튼의 disabled 조건과 저장의 거절 조건이 **같은 술어**를
 * 읽는다. 초과 입금을 막는 이유도 여기 있다: 청구액보다 많이 받았다면 그것은 입금 기록이 아니라
 * 과오납 처리라는 다른 업무이고, 조용히 받아 두면 잔액이 음수가 된다.
 *
 * [개인결제창은 링크를 보관만 한다] 앱은 그 링크를 눌러 결제 상태를 조회하지 않고 결제 완료를
 * 추측하지도 않는다(백엔드가 없다). 링크가 없으면 안내에 실을 것이 없어 발송 기록도 막힌다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   CardTitle → Card + 토큰만 쓴 <h2>
 *   controlStyle 이 붙은 raw <input> → TextField / FormField + 토큰 <input>(date·url)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                   → Icon(chevron-left) + 토큰 <a>
 *   입금 상태 · 청구 방식 배지   → StatusBadge ×2
 *   청구 요약                  → 토큰 <dl>(청구액 · 입금액(누적) · 잔액 · 입금 완료일)
 *   청구 방식 · 개인결제창 링크  → FormField + SelectField · FormField + 토큰 <input type="url">
 *   비고                      → TextareaField
 *   입금일 · 입금액 · 메모       → FormField + 토큰 <input type="date"> · TextField ×2
 *   막힌 입금확인 사유          → Alert(warning)
 *   입금확인 기록 · 안내 발송 기록 → Button(primary/secondary)
 *   입금 내역 · 안내 발송 기록 표  → Table (덧붙이기만 하는 기록)
 *   조회 권한만 있음            → Alert(info) + 기록 버튼 자체를 그리지 않음 (EXC-03)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  StatusBadge,
  Table,
  TextField,
  TextareaField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Billing Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 sales/billing/types.ts 미러) ─────────────────────────────────────────── */

type BillingMethod = 'bank_transfer' | 'payment_link';

const METHOD_OPTIONS: readonly { readonly id: BillingMethod; readonly label: string }[] = [
  { id: 'bank_transfer', label: '계좌이체' },
  { id: 'payment_link', label: '개인결제창' },
];

const METHOD_LABEL: Readonly<Record<BillingMethod, string>> = {
  bank_transfer: '계좌이체',
  payment_link: '개인결제창',
};

type NoticeChannel = 'email' | 'sms' | 'kakao' | 'phone';

const NOTICE_CHANNEL_OPTIONS: readonly { readonly id: NoticeChannel; readonly label: string }[] = [
  { id: 'email', label: '이메일' },
  { id: 'sms', label: '문자' },
  { id: 'kakao', label: '카카오톡' },
  { id: 'phone', label: '전화' },
];

const NOTICE_CHANNEL_LABEL: Readonly<Record<NoticeChannel, string>> = {
  email: '이메일',
  sms: '문자',
  kakao: '카카오톡',
  phone: '전화',
};

/** 입금 상태 — 저장하지 않는다. 입금 기록의 누적 합에서 파생한다 */
type PaymentState = 'unpaid' | 'partial' | 'paid';

const STATE_META: Readonly<
  Record<PaymentState, { readonly label: string; readonly tone: StatusBadgeTone }>
> = {
  unpaid: { label: '미입금', tone: 'warning' },
  partial: { label: '부분입금', tone: 'info' },
  paid: { label: '입금완료', tone: 'success' },
};

const BILLING_NOTE_MAX = 300;
const BILLING_MEMO_MAX = 60;

const PAYMENT_ALREADY_PAID = '이미 입금이 완료된 청구예요.';
const PAYMENT_AMOUNT_POSITIVE = '입금액은 0보다 커야 해요.';
const PAYMENT_OVER_OUTSTANDING = '입금액이 잔액보다 클 수 없어요.';
const PAYMENT_DATE_REQUIRED = '입금일을 YYYY-MM-DD 형식으로 입력하세요.';
const NOTICE_LINK_REQUIRED = '개인결제창 링크를 먼저 등록해야 안내를 보낼 수 있어요.';

/** 입금일의 초기값 — 화면이 `new Date()` 를 읽으면 스토리 비교가 매일 깨진다 */
const TODAY = '2026-07-21';

/* ── 데모 데이터(실화면 BILLING_SEED 미러 — 상호·계좌 표기는 전부 가상이다) ────────────────────── */

interface DemoPayment {
  readonly id: string;
  readonly paidOn: string;
  readonly amount: number;
  /** 입금자명·메모 — 통장 표기가 주문자와 다를 때 이 칸이 유일한 단서다 */
  readonly memo: string;
}

interface DemoNotice {
  readonly id: string;
  readonly at: string;
  readonly channel: NoticeChannel;
  readonly memo: string;
}

interface DemoBilling {
  readonly id: string;
  readonly billNo: string;
  readonly accountName: string;
  readonly quoteNo: string;
  readonly method: BillingMethod;
  /** 개인결제창 링크 — 계좌이체 청구면 ''. 앱은 **보관만** 한다 */
  readonly paymentLinkUrl: string;
  readonly amount: number;
  readonly issuedAt: string;
  readonly notices: readonly DemoNotice[];
  readonly payments: readonly DemoPayment[];
  readonly note: string;
}

/** 부분입금 — 절반만 들어왔다. 잔액을 받아 내는 것이 남은 일이다 */
const PARTIAL_BILLING: DemoBilling = {
  id: 'bl-1',
  billNo: 'BL-20260706-001',
  accountName: '대성물산 주식회사',
  quoteNo: 'Q-20260705-001',
  method: 'bank_transfer',
  paymentLinkUrl: '',
  amount: 3960000,
  issuedAt: '2026-07-06',
  notices: [
    {
      id: 'bn-1',
      at: '2026-07-06T01:20:00.000Z',
      channel: 'email',
      memo: '계좌이체 안내 메일 발송(세금계산서 별도 발행 예정).',
    },
  ],
  payments: [{ id: 'bp-1', paidOn: '2026-07-08', amount: 2000000, memo: '대성물산(선금)' }],
  note: '잔금은 검수 후 입금 예정.',
};

/** 미입금 + 개인결제창 — 링크를 보관만 하고, 안내는 두 번 나갔다 */
const LINK_BILLING: DemoBilling = {
  id: 'bl-2',
  billNo: 'BL-20260702-001',
  accountName: '(주)한빛소프트웨어',
  // 견적 없이 만든 청구 — 원 견적 자리가 그 사실을 말한다
  quoteNo: '',
  method: 'payment_link',
  paymentLinkUrl: 'https://pay.example.com/link/hanbit-2026-07',
  amount: 1200000,
  issuedAt: '2026-07-02',
  notices: [
    {
      id: 'bn-2',
      at: '2026-07-02T05:10:00.000Z',
      channel: 'sms',
      memo: '개인결제창 링크 문자 발송.',
    },
    { id: 'bn-3', at: '2026-07-09T00:40:00.000Z', channel: 'phone', memo: '미입금 안내 통화.' },
  ],
  payments: [],
  note: '',
};

/** 입금완료 — 두 번에 나눠 들어와 누적 합이 청구액에 닿았다. 입금 입력이 잠긴다 */
const PAID_BILLING: DemoBilling = {
  id: 'bl-3',
  billNo: 'BL-20260620-001',
  accountName: '미래테크놀로지',
  quoteNo: '',
  method: 'bank_transfer',
  paymentLinkUrl: '',
  amount: 4500000,
  issuedAt: '2026-06-20',
  notices: [
    { id: 'bn-4', at: '2026-06-20T02:00:00.000Z', channel: 'email', memo: '청구 안내 메일 발송.' },
  ],
  payments: [
    { id: 'bp-2', paidOn: '2026-06-25', amount: 2500000, memo: '미래테크(1차)' },
    { id: 'bp-3', paidOn: '2026-07-03', amount: 2000000, memo: '미래테크(잔금)' },
  ],
  note: '',
};

/* ── 순수 규칙(실화면 미러 — 화면이 각자 다시 더하지 않는다) ─────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');
const formatWon = (value: number): string => `${fmt(value)}원`;

/** ISO → 'YYYY-MM-DD HH:mm'. 문자열을 자른다 — 뷰어의 표준시가 스토리를 흔들지 않게 한다 */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

const paidAmount = (billing: DemoBilling): number =>
  billing.payments.reduce((sum, payment) => sum + payment.amount, 0);

const outstandingAmount = (billing: DemoBilling): number => billing.amount - paidAmount(billing);

function billingPaymentState(billing: DemoBilling): PaymentState {
  const paid = paidAmount(billing);
  if (paid <= 0) return 'unpaid';
  return paid >= billing.amount ? 'paid' : 'partial';
}

function paidOnDate(billing: DemoBilling): string {
  let running = 0;
  for (const payment of billing.payments) {
    running += payment.amount;
    if (running >= billing.amount) return payment.paidOn;
  }
  return '';
}

/** 'YYYY-MM-DD' 모양인가 — 입금일 검증의 최소선 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 숫자만 남긴다 — '1,200,000원' 을 붙여 넣어도 값이 살아남는다 */
function digitsToNumber(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

/**
 * 지금 이 입금을 기록할 수 없는 이유 — 기록할 수 있으면 null.
 *
 * 초과 입금을 막는 이유: 청구액보다 많이 받았다면 그것은 **과오납 처리**라는 다른 업무다.
 * 조용히 받아 두면 잔액이 음수가 되고, 그 음수를 화면마다 다르게 그린다.
 */
function recordPaymentBlock(billing: DemoBilling, amount: number, paidOn: string): string | null {
  if (billingPaymentState(billing) === 'paid') return PAYMENT_ALREADY_PAID;
  if (!Number.isInteger(amount) || amount <= 0) return PAYMENT_AMOUNT_POSITIVE;
  if (amount > outstandingAmount(billing)) return PAYMENT_OVER_OUTSTANDING;
  if (!DATE_RE.test(paidOn)) return PAYMENT_DATE_REQUIRED;
  return null;
}

/**
 * 지금 청구 안내를 보낼 수 없는 이유 — 보낼 수 있으면 null.
 * 개인결제창인데 링크가 없으면 고객은 '결제해 달라' 는 말만 받고 결제할 수단을 못 받는다.
 */
const sendNoticeBlock = (method: BillingMethod, linkUrl: string): string | null =>
  method === 'payment_link' && linkUrl.trim() === '' ? NOTICE_LINK_REQUIRED : null;

/* ── 표 열 정의 ───────────────────────────────────────────────────────────────────────────── */

const PAYMENT_COLUMNS: TableProps['columns'] = [
  { id: 'paidOn', header: '입금일', nowrap: true },
  { id: 'amount', header: '입금액', align: 'end', nowrap: true },
  { id: 'memo', header: '입금자명 · 메모' },
];

const NOTICE_COLUMNS: TableProps['columns'] = [
  { id: 'at', header: '발송 시각', nowrap: true },
  { id: 'channel', header: '창구', nowrap: true },
  { id: 'memo', header: '메모' },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  alignSelf: 'flex-start',
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  marginTop: cssVar('space.2'),
};

/** 두 단 — 좁아지면 자동으로 한 단이 된다(실화면 layoutStyle 미러) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr)`,
  gap: cssVar('space.2'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const numericStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const controlStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function DetailCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card aria-labelledby={titleId}>
        <div style={cardBodyStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            {title}
          </h2>
          {children}
        </div>
      </Card>
    </section>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface BillingDetailScreenProps {
  readonly billing?: DemoBilling;
  readonly loading?: boolean;
  /** 입금확인 권한이 없는 역할 — 기록 버튼 자체를 그리지 않는다 (EXC-03) */
  readonly canUpdate?: boolean;
  /** 입금액 초기값 — 막힌 사유 배너를 보여 주는 스토리가 쓴다 */
  readonly initialAmountInput?: string;
}

function BillingDetailScreen({
  billing = PARTIAL_BILLING,
  loading = false,
  canUpdate = true,
  initialAmountInput = '',
}: BillingDetailScreenProps) {
  const [method, setMethod] = useState<BillingMethod>(billing.method);
  const [linkUrl, setLinkUrl] = useState(billing.paymentLinkUrl);
  const [note, setNote] = useState(billing.note);
  const [paidOn, setPaidOn] = useState(TODAY);
  const [amountInput, setAmountInput] = useState(initialAmountInput);
  const [memo, setMemo] = useState('');
  const [channel, setChannel] = useState<NoticeChannel>('email');
  const [noticeMemo, setNoticeMemo] = useState('');

  if (loading) {
    return (
      <div style={pageStyle}>
        <a href="#billing" style={backLinkStyle}>
          <Icon name="chevron-left" />
          목록으로
        </a>
        <Card>
          <p style={hintStyle}>불러오는 중…</p>
        </Card>
      </div>
    );
  }

  const state = billingPaymentState(billing);
  const stateMeta = STATE_META[state];
  const outstanding = outstandingAmount(billing);
  const amount = digitsToNumber(amountInput);
  // 버튼의 disabled 와 저장의 거절이 **같은 술어**를 읽는다
  const paymentBlock = recordPaymentBlock(billing, amount, paidOn);
  const noticeBlock = sendNoticeBlock(method, linkUrl);
  const inputsLocked = !canUpdate || state === 'paid';

  const paymentRows: TableProps['rows'] = billing.payments.map((payment) => ({
    id: payment.id,
    cells: [
      <span key="paidOn" style={numericStyle}>
        {payment.paidOn}
      </span>,
      <span key="amount" style={numericStyle}>
        {formatWon(payment.amount)}
      </span>,
      payment.memo === '' ? (
        <span key="memo" style={mutedStyle}>
          —
        </span>
      ) : (
        <span key="memo">{payment.memo}</span>
      ),
    ],
  }));

  const noticeRows: TableProps['rows'] = billing.notices.map((notice) => ({
    id: notice.id,
    cells: [
      <span key="at" style={numericStyle}>
        {formatDateTime(notice.at)}
      </span>,
      <span key="channel">{NOTICE_CHANNEL_LABEL[notice.channel]}</span>,
      notice.memo === '' ? (
        <span key="memo" style={mutedStyle}>
          —
        </span>
      ) : (
        <span key="memo">{notice.memo}</span>
      ),
    ],
  }));

  return (
    <div style={pageStyle}>
      <a href="#billing" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{`청구 ${billing.billNo}`}</h1>
        <div style={badgeRowStyle}>
          <StatusBadge tone={stateMeta.tone} label={stateMeta.label} />
          <StatusBadge tone="info" label={METHOD_LABEL[method]} />
        </div>
      </div>

      {!canUpdate && <Alert tone="info">입금확인 권한이 없어요. 이 화면은 조회만 가능해요.</Alert>}

      <div style={layoutStyle}>
        <div style={columnStyle}>
          <DetailCard title="청구 요약">
            <dl style={dlStyle}>
              <dt style={dtStyle}>거래처</dt>
              <dd style={ddStyle}>{billing.accountName}</dd>
              <dt style={dtStyle}>원 견적</dt>
              <dd style={ddStyle}>
                {billing.quoteNo === '' ? (
                  <span style={mutedStyle}>견적 없이 만든 청구예요.</span>
                ) : (
                  <a href="#quote-detail" style={linkStyle}>
                    {billing.quoteNo}
                  </a>
                )}
              </dd>
              <dt style={dtStyle}>청구일</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{billing.issuedAt}</dd>
              <dt style={dtStyle}>청구액</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(billing.amount)}</dd>
              <dt style={dtStyle}>입금액(누적)</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(paidAmount(billing))}</dd>
              <dt style={dtStyle}>잔액</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(outstanding)}</dd>
              <dt style={dtStyle}>입금 완료일</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>
                {paidOnDate(billing) === '' ? (
                  <span style={mutedStyle}>—</span>
                ) : (
                  paidOnDate(billing)
                )}
              </dd>
            </dl>
          </DetailCard>

          <DetailCard title="청구 방식">
            <p style={hintStyle}>
              결제대행을 쓰지 않으므로 앱은 결제를 처리하지 않아요. 개인결제창은 링크를 보관만 하고,
              입금 사실은 아래에서 사람이 확인해 기록해요.
            </p>
            <div style={formRowStyle}>
              <FormField htmlFor="billing-method" label="청구 방식">
                <SelectField
                  id="billing-method"
                  value={method}
                  disabled={!canUpdate}
                  onChange={(event) => {
                    const next = METHOD_OPTIONS.find((option) => option.id === event.target.value);
                    if (next === undefined) return;
                    setMethod(next.id);
                    // 계좌이체로 되돌리면 보관하던 링크는 의미가 없다 — 남겨 두면 안내 문면과 어긋난다
                    if (next.id === 'bank_transfer') setLinkUrl('');
                  }}
                >
                  {METHOD_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              {method === 'payment_link' && (
                <FormField
                  htmlFor="billing-link"
                  label="개인결제창 링크"
                  hint="링크만 보관해요 — 결제 상태를 조회하지 않아요."
                >
                  <input
                    id="billing-link"
                    type="url"
                    style={controlStyle}
                    value={linkUrl}
                    placeholder="https://"
                    disabled={!canUpdate}
                    onChange={(event) => setLinkUrl(event.target.value)}
                  />
                </FormField>
              )}
            </div>
            <TextareaField
              label="비고"
              value={note}
              onChange={setNote}
              maxLength={BILLING_NOTE_MAX}
              disabled={!canUpdate}
              placeholder="결제조건·세금계산서 발행 등을 기록하세요."
              rows={2}
            />
          </DetailCard>
        </div>

        <div style={columnStyle}>
          <DetailCard title="입금확인">
            <p style={hintStyle}>
              통장에 찍힌 입금을 기록해요. 여러 번 나눠 들어오면 그때마다 기록하고, 누적 합이
              청구액에 닿으면 입금완료가 돼요. <strong>기록한 입금은 되돌릴 수 없어요.</strong>
            </p>

            <div style={formRowStyle}>
              <FormField htmlFor="payment-date" label="입금일" required>
                <input
                  id="payment-date"
                  type="date"
                  style={controlStyle}
                  value={paidOn}
                  disabled={inputsLocked}
                  onChange={(event) => setPaidOn(event.target.value)}
                />
              </FormField>
              <TextField
                id="payment-amount"
                label="입금액"
                required
                inputMode="numeric"
                value={amountInput}
                placeholder="0"
                disabled={inputsLocked}
                onChange={(event) => setAmountInput(event.target.value)}
              />
              <TextField
                id="payment-memo"
                label="입금자명 · 메모"
                value={memo}
                maxLength={BILLING_MEMO_MAX}
                placeholder="통장 표기가 다르면 적어 두세요"
                disabled={inputsLocked}
                onChange={(event) => setMemo(event.target.value)}
              />
            </div>

            <p style={hintStyle}>{`잔액 ${formatWon(outstanding)}`}</p>

            {/* 왜 못 누르는지를 버튼 옆에 적는다 — disabled 와 이 문장이 같은 술어에서 나온다 */}
            {canUpdate && paymentBlock !== null && amountInput !== '' && (
              <Alert tone="warning">{paymentBlock}</Alert>
            )}

            {canUpdate && (
              <div style={actionsStyle}>
                <Button variant="primary" size="md" disabled={paymentBlock !== null}>
                  입금확인 기록
                </Button>
              </div>
            )}

            <div style={tableScrollStyle}>
              <Table
                caption="입금 내역 — 덧붙이기만 하는 기록이에요."
                columns={PAYMENT_COLUMNS}
                rows={paymentRows}
                empty="아직 입금 기록이 없어요."
              />
            </div>
          </DetailCard>

          <DetailCard title="청구 안내">
            <p style={hintStyle}>
              고객에게 청구를 안내한 사실을 남겨요. 앱이 메시지를 보내지는 않아요 — 보낸 사실을
              기록할 뿐이에요.
            </p>

            <div style={formRowStyle}>
              <FormField htmlFor="notice-channel" label="안내 창구">
                <SelectField
                  id="notice-channel"
                  value={channel}
                  disabled={!canUpdate}
                  onChange={(event) => {
                    const next = NOTICE_CHANNEL_OPTIONS.find(
                      (option) => option.id === event.target.value,
                    );
                    if (next !== undefined) setChannel(next.id);
                  }}
                >
                  {NOTICE_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <TextField
                id="notice-memo"
                label="메모"
                value={noticeMemo}
                maxLength={BILLING_MEMO_MAX}
                placeholder="무엇을 안내했는지 적어 두세요"
                disabled={!canUpdate}
                onChange={(event) => setNoticeMemo(event.target.value)}
              />
            </div>

            {canUpdate && noticeBlock !== null && <Alert tone="warning">{noticeBlock}</Alert>}

            {canUpdate && (
              <div style={actionsStyle}>
                <Button variant="secondary" disabled={noticeBlock !== null}>
                  안내 발송 기록
                </Button>
              </div>
            )}

            <div style={tableScrollStyle}>
              <Table
                caption="청구 안내 발송 기록"
                columns={NOTICE_COLUMNS}
                rows={noticeRows}
                empty="아직 안내를 보내지 않았어요."
              />
            </div>
          </DetailCard>
        </div>
      </div>
    </div>
  );
}

/** 정상(부분입금): 잔액 1,960,000원 — 입금 기록 1건이 표에 쌓여 있고 상태 배지는 그 합에서 파생된다 */
export const Default: Story = {
  render: () => <BillingDetailScreen />,
};

/**
 * 개인결제창(미입금): 링크를 보관만 한다. 링크를 지우면 안내 발송 기록이 막히고 그 사유가 배너로 선다.
 * 안내는 두 번 나갔는데도 돈이 안 들어온 건이다.
 */
export const PaymentLink: Story = {
  render: () => <BillingDetailScreen billing={LINK_BILLING} />,
};

/** 입금완료: 누적 합이 청구액에 닿았다 — 입금 입력이 잠기고 완납일이 채워진다 */
export const Paid: Story = {
  render: () => <BillingDetailScreen billing={PAID_BILLING} />,
};

/** 초과 입금 시도: 잔액보다 큰 금액을 넣으면 기록이 막힌다 — 그것은 과오납이라는 다른 업무다 */
export const OverPayment: Story = {
  render: () => <BillingDetailScreen initialAmountInput="3,000,000" />,
};

/** 조회 전용: 입금확인 권한 없음 → 기록 버튼이 없고 입력이 잠긴다 (EXC-03) */
export const ReadOnly: Story = {
  render: () => <BillingDetailScreen canUpdate={false} />,
};

/** 상세 조회 중: 카드 하나에 안내만 남는다(골격을 흉내 내지 않는다) */
export const Loading: Story = {
  render: () => <BillingDetailScreen loading />,
};
