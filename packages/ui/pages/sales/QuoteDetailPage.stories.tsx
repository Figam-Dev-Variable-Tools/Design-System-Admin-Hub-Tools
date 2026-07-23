/**
 * Design System/Templates/Sales/Quote Detail — 견적 상세(읽기 전용 견적서) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹의 Quotes 엔트리(`/sales/quotes`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/quotes/QuoteDetailPage.tsx (라우트 /sales/quotes/:id)
 * 와 그 하위 조각(components/QuotePreview · quotes.css 의 `@media print`).
 *
 * [왜 이 화면이 생겼나] 견적에는 읽기 전용 표면이 없었다. 그래서 문의 화면의 '견적 보기' 링크가
 * 실제로는 **수정 폼**을 열었다 — 이름은 보기인데 열리는 것은 편집이었고, 이미 발송되었거나 수주로
 * 전환된 견적까지 편집 화면으로 열렸다. 여기가 그 '보기' 다: 본문은 **인쇄 가능한 견적서 미리보기**
 * 하나이고, 고치는 길은 명시적 버튼 하나뿐이다(권한이 없으면 그 버튼도 없다).
 *
 * [문서는 다시 그리지 않는다] 실화면에서 견적서 모습의 정본은 QuotePreview 한 벌이다(폼의 미리보기와
 * **같은 컴포넌트**). 상세가 자기 사본을 만들면 두 화면의 견적서가 언젠가 갈라지고, 인쇄 규칙이
 * 그 컴포넌트의 className 을 집으므로 사본은 인쇄도 못 한다. 이 템플릿은 그 문서 레이아웃을 토큰만으로
 * 미러한다 — 종이 전용 규칙(@media print · A4 치수)은 인라인 style 로 표현할 수 없어 스토리 밖이다.
 *
 * [공급자는 회사 정보에서 온다] 견적서 상단 '공급자' 블록은 예전에 이 모듈에 하드코딩돼 있어 회사
 * 정보를 고쳐도 인쇄물이 바뀌지 않았다. 지금은 공통 층의 조회기가 값을 주고, 배선이 없으면 그럴듯한
 * 가짜 상호 대신 '(회사 정보 미등록)' 자리표시가 종이에 그대로 드러난다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   QuotePreview(문서)  → 토큰만 쓴 문서 레이아웃 + 손으로 쓴 품목 <table> + StatusBadge
 *   CardTitle · dl/dt/dd · pageTitleStyle → 토큰만 쓴 로컬 조립(신규 DS 컴포넌트 아님)
 *   AccountLink · Link  → 토큰만 쓴 <a>
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로 복귀             → Icon(chevron-left) + 토큰 <button>
 *   견적번호 제목 + 상태 배지    → 토큰 <h1> + StatusBadge (quoteStatusMeta 미러)
 *   문의에서 자동 발행 표시      → StatusBadge(info) — isInherited 미러
 *   인쇄 · PDF 저장           → Button(secondary) (ERP-10 — 인쇄 대상 지정은 CSS 가 한다)
 *   견적 수정                 → Button(primary) — 권한이 없으면 그리지 않는다 (EXC-03)
 *   계약 만들기               → Button(secondary) — 승인된 견적에서만 (contractDraftBlock 미러)
 *   상태 관리                 → Card + Button ×3 (전이표가 열어 준 것만 활성 · 거절 사유는 title)
 *   수주(계약 진행) 안내        → Alert(info) (막지는 않되 밝힌다)
 *   견적서 문서                → Card + 토큰 문서 레이아웃(공급자/공급받는자 · 품목표 · 합계)
 *   연결 · 요약                → Card + dl/dt/dd + 거래처·원본 문의로 가는 토큰 <a>
 *   최초 로드                 → Card + Skeleton ×N (재조회로는 덮지 않는다 · STATE-01)
 *   404 / 조회 실패            → Alert(danger) (+ 서버 오류에만 다시 시도 · EXC-12)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import { Alert, Button, Card, Icon, Skeleton, StatusBadge, cssVar, typography } from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Quote Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 sales/quotes/types 미러) ────────────────────────────────────────── */

type QuoteTaxMode = 'standard' | 'zero_rated' | 'exempt';
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'ordered';

interface BadgeMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

const STATUS_META: Record<QuoteStatus, BadgeMeta> = {
  draft: { label: '작성중', tone: 'neutral' },
  sent: { label: '발송', tone: 'info' },
  accepted: { label: '승인', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  expired: { label: '만료', tone: 'neutral' },
  ordered: { label: '수주(계약 진행)', tone: 'success' },
};

/** 과세유형 — 세율을 데이터로 들고 있다(일반 10% · 영세 0% · 면세 없음) */
const TAX_MODE_META: Record<QuoteTaxMode, { readonly label: string; readonly rate: number }> = {
  standard: { label: '과세(10%)', rate: 0.1 },
  zero_rated: { label: '영세율(0%)', rate: 0 },
  exempt: { label: '면세', rate: 0 },
};

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const formatNumber = (value: number): string => KO_NUMBER.format(value);
const formatWon = (value: number): string => `${formatNumber(value)}원`;

/** '000-00-00000' 표기 — 실화면 formatBizNo 미러(자릿수만 취해 3-2-5 로 끊는다) */
function formatBizNo(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

const dash = (value: string): string => (value.trim() === '' ? '—' : value.trim());

interface DemoLineItem {
  readonly id: string;
  readonly name: string;
  readonly spec: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

/** 라인 공급가액 = 수량 × 단가 — 저장하지 않고 파생한다(단일 원천) */
const lineSupply = (item: Pick<DemoLineItem, 'quantity' | 'unitPrice'>): number =>
  item.quantity * item.unitPrice;

interface QuoteTotals {
  readonly supply: number;
  readonly vat: number;
  readonly total: number;
}

/** 합계 — 라인별 공급가액 합산, 세액은 **라인별 반올림 후 합산**(문서 규칙 고정) */
function computeTotals(items: readonly DemoLineItem[], taxMode: QuoteTaxMode): QuoteTotals {
  const rate = TAX_MODE_META[taxMode].rate;
  let supply = 0;
  let vat = 0;
  for (const item of items) {
    const amount = lineSupply(item);
    supply += amount;
    vat += Math.round(amount * rate);
  }
  return { supply, vat, total: supply + vat };
}

interface DemoQuote {
  readonly id: string;
  /** 견적번호 — 'Q-YYYYMMDD-NNN' */
  readonly quoteNo: string;
  /** 마스터를 가리키는 정본. '' 이면 미등록 거래처다 */
  readonly accountId: string;
  /** 발행 시점의 상호 — 거래처가 개명해도 이미 보낸 견적서는 바뀌지 않아야 한다 */
  readonly accountName: string;
  readonly accountBizNo: string;
  readonly accountCeo: string;
  readonly contactName: string;
  readonly issueDate: string;
  readonly validUntil: string;
  readonly taxMode: QuoteTaxMode;
  readonly items: readonly DemoLineItem[];
  readonly status: QuoteStatus;
  readonly note: string;
  /** 원본 문의 id — '' 면 수동 등록 견적 */
  readonly inquiryId: string;
  readonly inquiryNo: string;
}

/** 문의에서 자동 생성된 견적인가 — 승계 표시·역링크의 단일 판정(실화면 isInherited 미러) */
const isInherited = (quote: Pick<DemoQuote, 'inquiryId'>): boolean => quote.inquiryId !== '';

/**
 * 공급자(자사) 정보 — 회사 정보 화면이 정본이다. 배선이 없으면 그럴듯한 가짜 상호 대신
 * '(회사 정보 미등록)' 자리표시가 인쇄된다(실화면 SUPPLIER_FALLBACK 과 같은 판단).
 */
interface DemoSupplier {
  readonly name: string;
  readonly bizNo: string;
  readonly ceoName: string;
  readonly address: string;
  readonly phone: string;
}

const DEMO_SUPPLIER: DemoSupplier = {
  name: '주식회사 예시플래닝',
  bizNo: '123-45-67890',
  ceoName: '홍대표',
  address: '서울특별시 강남구 테헤란로 501, 12층',
  phone: '02-6000-1000',
};

/* ── 데모 데이터(실화면 QUOTE_SEED 미러 — acc-1 발송 견적) ─────────────────────────────────────── */

/** 발송된 수동 등록 견적 — 거래처 마스터(acc-1)에 연결돼 있다 */
const DEMO_SENT: DemoQuote = {
  id: 'qt-1',
  quoteNo: 'Q-20260710-001',
  accountId: 'acc-1',
  accountName: '(주)한빛소프트웨어',
  accountBizNo: '124-81-00998',
  accountCeo: '김한빛',
  contactName: '김담당',
  issueDate: '2026-07-10',
  validUntil: '2026-08-09',
  taxMode: 'standard',
  items: [
    { id: 'li-1', name: 'ERP 라이선스(연간)', spec: '100석', quantity: 1, unitPrice: 24_000_000 },
    { id: 'li-2', name: '초기 구축 컨설팅', spec: '4주', quantity: 1, unitPrice: 6_000_000 },
  ],
  status: 'sent',
  note: '유효기간 내 발주 시 구축비 10% 할인 가능.',
  inquiryId: '',
  inquiryNo: '',
};

/**
 * 문의에서 자동 발행된 견적 — 거래처는 **미등록으로 시작한다**(accountId '').
 * 문의는 고객이 적어 넣은 회사명 문자열만 갖는다: 이름으로 id 를 추측하면 동명이인 거래처에
 * 남의 견적이 붙는다. 품목은 승계 대상이 아니라 아직 비어 있고 상태는 '작성중' 이다.
 */
const DEMO_INHERITED: DemoQuote = {
  id: 'qt-4',
  quoteNo: 'Q-20260721-004',
  accountId: '',
  accountName: '누리플랜 주식회사',
  accountBizNo: '',
  accountCeo: '',
  contactName: '조은비',
  issueDate: '2026-07-21',
  validUntil: '2026-08-20',
  taxMode: 'standard',
  items: [],
  status: 'draft',
  note: '',
  inquiryId: 'inq-7',
  inquiryNo: 'INQ-20260720-007',
};

/**
 * 손으로 고르는 상태 칸 — 실화면 QUOTE_MANUAL_STATUSES 미러.
 * `ordered` 는 없다: 수주는 사람이 누르는 일이 아니라 계약이 만들어진 결과다.
 */
const MANUAL_STATUSES: readonly QuoteStatus[] = ['sent', 'accepted', 'rejected'];

/** 지금 상태에서 손으로 갈 수 있는 칸 — 실화면 QUOTE_STATUS_FLOW 미러 */
const STATUS_FLOW: Readonly<Record<QuoteStatus, readonly QuoteStatus[]>> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
  expired: [],
  ordered: [],
};

/**
 * 거절 사유 — 실화면 quoteStatusChangeBlock 미러. 거절은 boolean 이 아니라 문장이다.
 * 되돌리는 전이를 열면 '계약이 이미 생긴 견적을 되돌리면 무엇이 되는가' 에 답해야 하는데,
 * 답할 수 없으므로 막는다.
 */
const statusChangeBlock = (from: QuoteStatus, to: QuoteStatus): string | null => {
  if (from === to) return `이미 '${STATUS_META[to].label}' 상태예요.`;
  if (from === 'accepted') {
    return "'승인' 다음 칸은 상태가 아니라 계약이에요. '계약 만들기'를 누르면 계약이 생기고 견적이 '수주(계약 진행)'로 바뀌어요.";
  }
  const targets = STATUS_FLOW[from];
  if (targets.length === 0) {
    return `'${STATUS_META[from].label}' 상태의 견적은 상태를 되돌리거나 더 바꿀 수 없어요 — 계약·청구가 이 상태를 근거로 삼아요.`;
  }
  if (!targets.includes(to)) {
    const allowed = targets.map((target) => `'${STATUS_META[target].label}'`).join(' · ');
    return `'${STATUS_META[from].label}'에서 '${STATUS_META[to].label}'으로 바꿀 수 없어요. 지금 바꿀 수 있는 것: ${allowed}.`;
  }
  return null;
};

/** 수주(계약 진행) 견적 — 지금 고쳐도 이미 발송된 견적서와 맺은 계약은 바뀌지 않는다 */
const DEMO_ORDERED: DemoQuote = {
  id: 'qt-2',
  quoteNo: 'Q-20260705-001',
  accountId: 'acc-2',
  accountName: '대성물산 주식회사',
  accountBizNo: '220-81-62517',
  accountCeo: '정대성',
  contactName: '',
  issueDate: '2026-07-05',
  validUntil: '2026-07-25',
  taxMode: 'standard',
  items: [
    { id: 'li-3', name: '사무기기 유지보수', spec: '월 정기', quantity: 12, unitPrice: 300_000 },
  ],
  status: 'ordered',
  note: '',
  inquiryId: '',
  inquiryNo: '',
};

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

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
  cursor: 'pointer',
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
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

const headActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 15), 1fr))`,
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
  gridTemplateColumns: `calc(${cssVar('space.6')} * 5) minmax(0, 1fr)`,
  gap: cssVar('space.2'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.sm'),
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

const mutedTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const detailLinkStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 견적서 문서 스타일(실화면 QuotePreview 미러 — 화면 모습만. 종이 규칙은 CSS 가 갖는다) ────── */

const docStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.5'),
  paddingRight: cssVar('space.5'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

const docHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const docTitleStyle: CSSProperties = {
  margin: 0,
  letterSpacing: cssVar('space.1'),
  color: cssVar('color.text.default'),
  ...typography('typography.title.lg'),
};

const docMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: cssVar('space.1'),
  textAlign: 'right',
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.label.sm'),
};

const partiesStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 5), 1fr))`,
  gap: cssVar('space.3'),
};

const partyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
};

const partyLabelStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const partyNameStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const partyLineStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
  ...typography('typography.caption.md'),
};

/**
 * 사업자등록번호 줄 — 자릿수를 하나씩 대조해 읽는 값이다(ERP-10).
 * 비례폭에서는 0/O·1/l 이 붙어 오독을 부르고, 두 블록이 나란히 설 때 자리수가 어긋나 비교가 안 된다.
 */
const partyBizNoStyle: CSSProperties = {
  ...partyLineStyle,
  fontVariantNumeric: 'tabular-nums',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  ...typography('typography.label.sm'),
};

const cellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
  color: cssVar('color.text.default'),
  verticalAlign: 'top',
};

const headCellStyle: CSSProperties = {
  ...cellStyle,
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const headCellEndStyle: CSSProperties = { ...headCellStyle, textAlign: 'right' };

/** 수량·단가·공급가액이 세로로 쌓인다 — 자릿수가 맞아야 눈으로 검산된다 (ERP-10) */
const numCellStyle: CSSProperties = {
  ...cellStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const emptyCellStyle: CSSProperties = {
  ...cellStyle,
  textAlign: 'center',
  color: cssVar('color.text.muted'),
};

const totalsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  alignItems: 'flex-end',
};

/** 공급가액 → 부가세 → 합계가 세로로 쌓인다 — 세 값의 자릿수가 맞아야 덧셈이 눈으로 검산된다 */
const totalRowStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.4'),
  justifyContent: 'space-between',
  minWidth: `calc(${cssVar('space.6')} * 6)`,
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.label.sm'),
};

const grandTotalStyle: CSSProperties = {
  ...totalRowStyle,
  ...typography('typography.title.md'),
  paddingTop: cssVar('space.2'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.medium'),
  borderTopColor: cssVar('color.border.default'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const docNoteStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
  ...typography('typography.caption.md'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function DetailCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

/* ── 견적서 문서(실화면 QuotePreview 미러) ────────────────────────────────────────────────── */

function QuotePreview({
  quote,
  supplier = DEMO_SUPPLIER,
}: {
  readonly quote: DemoQuote;
  readonly supplier?: DemoSupplier;
}) {
  const totals = computeTotals(quote.items, quote.taxMode);

  return (
    <div style={docStyle} aria-label="견적서 미리보기">
      <div style={docHeadStyle}>
        <h3 style={docTitleStyle}>견 적 서</h3>
        <div style={docMetaStyle}>
          <span>{quote.quoteNo === '' ? '(자동 부여)' : quote.quoteNo}</span>
          <span>{`견적일 ${dash(quote.issueDate)}`}</span>
          <span>{`유효기간 ${dash(quote.validUntil)}`}</span>
          <StatusBadge
            tone={STATUS_META[quote.status].tone}
            label={STATUS_META[quote.status].label}
          />
        </div>
      </div>

      <div style={partiesStyle}>
        <div style={partyStyle}>
          <span style={partyLabelStyle}>공급받는자</span>
          <span style={partyNameStyle}>
            {quote.accountName.trim() === '' ? '(거래처 미입력)' : quote.accountName.trim()}
          </span>
          <span style={partyBizNoStyle}>
            {`사업자 ${quote.accountBizNo.trim() === '' ? '—' : formatBizNo(quote.accountBizNo)}`}
          </span>
          <span style={partyLineStyle}>{`대표 ${dash(quote.accountCeo)}`}</span>
          <span style={partyLineStyle}>{`담당 ${dash(quote.contactName)}`}</span>
        </div>
        <div style={partyStyle}>
          <span style={partyLabelStyle}>공급자</span>
          <span style={partyNameStyle}>{supplier.name}</span>
          <span style={partyBizNoStyle}>{`사업자 ${formatBizNo(supplier.bizNo)}`}</span>
          <span style={partyLineStyle}>{`대표 ${supplier.ceoName}`}</span>
          <span style={partyLineStyle}>{supplier.address}</span>
          <span style={partyLineStyle}>{supplier.phone}</span>
        </div>
      </div>

      <table style={tableStyle}>
        <caption style={mutedTextStyle}>{`${quote.quoteNo} 품목 명세`}</caption>
        <thead>
          <tr>
            <th scope="col" style={headCellStyle}>
              품목
            </th>
            <th scope="col" style={headCellStyle}>
              규격
            </th>
            <th scope="col" style={headCellEndStyle}>
              수량
            </th>
            <th scope="col" style={headCellEndStyle}>
              단가
            </th>
            <th scope="col" style={headCellEndStyle}>
              공급가액
            </th>
          </tr>
        </thead>
        <tbody>
          {quote.items.length === 0 ? (
            <tr>
              <td colSpan={5} style={emptyCellStyle}>
                품목이 없어요.
              </td>
            </tr>
          ) : (
            quote.items.map((item) => (
              <tr key={item.id}>
                <td style={cellStyle}>{dash(item.name)}</td>
                <td style={cellStyle}>{dash(item.spec)}</td>
                <td style={numCellStyle}>{formatNumber(item.quantity)}</td>
                <td style={numCellStyle}>{formatNumber(item.unitPrice)}</td>
                <td style={numCellStyle}>{formatNumber(lineSupply(item))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={totalsStyle}>
        <div style={totalRowStyle}>
          <span>공급가액</span>
          <span>{formatNumber(totals.supply)}</span>
        </div>
        <div style={totalRowStyle}>
          <span>{`부가세(${TAX_MODE_META[quote.taxMode].label})`}</span>
          <span>{formatNumber(totals.vat)}</span>
        </div>
        <div style={grandTotalStyle}>
          <span>합계금액</span>
          <span>{formatWon(totals.total)}</span>
        </div>
      </div>

      {quote.note.trim() !== '' && <p style={docNoteStyle}>{`비고: ${quote.note.trim()}`}</p>}
    </div>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

interface QuoteDetailScreenProps {
  readonly quote?: DemoQuote;
  readonly loading?: boolean;
  /** 조회 실패의 종류 — 404 에는 '다시 시도'를 권하지 않는다(영원히 실패한다 · EXC-12) */
  readonly failure?: 'not-found' | 'error';
  readonly canUpdate?: boolean;
}

function QuoteDetailScreen({
  quote = DEMO_SENT,
  loading = false,
  failure,
  canUpdate = true,
}: QuoteDetailScreenProps) {
  const backLink = (
    <button type="button" style={backLinkStyle}>
      <Icon name="chevron-left" />
      목록으로
    </button>
  );

  if (failure !== undefined) {
    const notFound = failure === 'not-found';
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>
              {notFound
                ? '견적을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '견적을 불러오지 못했어요.'}
            </span>
            <span style={headActionsStyle}>
              {!notFound && <Button variant="secondary">다시 시도</Button>}
              <Button variant="secondary">목록으로</Button>
            </span>
          </div>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        {backLink}
        <div style={layoutStyle} aria-busy="true">
          {[0, 1].map((column) => (
            <Card key={`col-${String(column)}`}>
              <div style={skeletonBodyStyle}>
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const inherited = isInherited(quote);
  const totals = computeTotals(quote.items, quote.taxMode);

  return (
    <div style={pageStyle}>
      {backLink}

      <div style={headRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>{`견적 ${quote.quoteNo}`}</h1>
          <div style={badgeRowStyle}>
            <StatusBadge
              tone={STATUS_META[quote.status].tone}
              label={STATUS_META[quote.status].label}
            />
            {inherited && <StatusBadge tone="info" label="문의에서 자동 발행" />}
          </div>
        </div>
        <div style={headActionsStyle}>
          {/* 인쇄 대상 지정은 화면이 아니라 종이 규칙(@media print)이 한다 — 버튼은 부르기만 한다 */}
          <Button variant="secondary">인쇄 · PDF 저장</Button>
          {/* 사슬의 다음 칸 — 전이 규칙(contractDraftBlock)이 열어 준 것만 존재한다 (EXC-03).
              한 번 누르면 계약이 생기고 견적이 '수주(계약 진행)'로 바뀐다(되돌려 쓰기). */}
          {canUpdate && quote.status === 'accepted' && (
            <Button variant="secondary">계약 만들기</Button>
          )}
          {/* 이 화면은 읽기 전용이다 — 고치는 길은 이 버튼 하나뿐이고, 권한이 없으면 없다 (EXC-03) */}
          {canUpdate && (
            <Button variant="primary" size="md">
              견적 수정
            </Button>
          )}
        </div>
      </div>

      {/* 종료된 견적을 고치면 이미 나간 문서와 앱의 기록이 어긋난다 — 막지는 않되 밝힌다 */}
      {quote.status === 'ordered' && (
        <Alert tone="info">
          &lsquo;수주(계약 진행)&rsquo; 견적이에요. 지금 수정해도 이미 발송된 견적서와 맺은 계약은
          바뀌지 않아요.
        </Alert>
      )}

      {/* ── 상태 관리 ────────────────────────────────────────────────────────
          예전에는 이 카드가 없었다. 그래서 발송한 견적을 승인으로 넘길 방법이 화면에 없었고,
          다음 칸(계약)이 영원히 잠겨 있었다.

          막힌 칸을 감추지 않고 **왜 막혔는지**를 title 에 싣는다 — 실화면은 그 문장을
          quoteStatusChangeBlock 하나에서 받아 버튼의 disabled 와 함께 쓴다(둘이 갈라질 수 없다). */}
      {canUpdate && (
        <DetailCard title="상태 관리">
          <div style={badgeRowStyle}>
            {MANUAL_STATUSES.map((target) => {
              const blocked = statusChangeBlock(quote.status, target);
              const label = STATUS_META[target].label;
              return (
                <Button
                  key={target}
                  variant="secondary"
                  disabled={blocked !== null}
                  title={blocked ?? undefined}
                  aria-label={blocked === null ? `${label}(으)로 바꾸기` : `${label} — ${blocked}`}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </DetailCard>
      )}

      <div style={layoutStyle}>
        <DetailCard title="견적서">
          <QuotePreview quote={quote} />
        </DetailCard>

        <DetailCard title="연결 · 요약">
          <dl style={dlStyle}>
            <dt style={dtStyle}>거래처</dt>
            <dd style={ddStyle}>
              {quote.accountId === '' ? (
                // 거래처 마스터에 연결되지 않은 견적 — 이름만 있고 갈 곳이 없다
                <span style={mutedTextStyle}>{`${quote.accountName} (거래처 미등록)`}</span>
              ) : (
                <a href="#sales-account-detail" style={detailLinkStyle}>
                  {quote.accountName}
                </a>
              )}
            </dd>
            <dt style={dtStyle}>담당자</dt>
            <dd style={ddStyle}>
              {quote.contactName === '' ? <span style={mutedTextStyle}>—</span> : quote.contactName}
            </dd>
            <dt style={dtStyle}>원본 문의</dt>
            <dd style={ddStyle}>
              {inherited ? (
                <a href="#inquiry-detail" style={detailLinkStyle}>
                  {quote.inquiryNo}
                </a>
              ) : (
                <span style={mutedTextStyle}>수동 등록 견적이에요.</span>
              )}
            </dd>
            <dt style={dtStyle}>견적일 · 유효기간</dt>
            <dd
              style={{ ...ddStyle, ...numericStyle }}
            >{`${quote.issueDate} ~ ${quote.validUntil}`}</dd>
            <dt style={dtStyle}>과세유형</dt>
            <dd style={ddStyle}>{TAX_MODE_META[quote.taxMode].label}</dd>
            <dt style={dtStyle}>합계금액</dt>
            <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(totals.total)}</dd>
          </dl>
        </DetailCard>
      </div>

      <div style={actionsStyle}>
        <Button variant="secondary">목록으로</Button>
      </div>
    </div>
  );
}

/** 정상: 발송된 수동 등록 견적 — 인쇄 가능한 견적서 + 거래처로 가는 연결 */
export const Default: Story = {
  render: () => <QuoteDetailScreen />,
};

/** 최초 로드: 카드 본문 스켈레톤 — 아직 데이터가 없을 때만 켠다(재조회로는 덮지 않는다 · STATE-01) */
export const Loading: Story = {
  render: () => <QuoteDetailScreen loading />,
};

/**
 * 문의에서 자동 발행: 승계 배지 + 원본 문의 역링크. 거래처는 미등록으로 시작하고 품목은 아직 비어
 * 있다 — 승계되지 않는 값(품목·금액)을 운영자가 채운다.
 */
export const Inherited: Story = {
  render: () => <QuoteDetailScreen quote={DEMO_INHERITED} />,
};

/** 수주(계약 진행): 종료된 견적 — 수정을 막지는 않되 '이미 나간 문서는 안 바뀐다' 고 밝힌다 */
export const Ordered: Story = {
  render: () => <QuoteDetailScreen quote={DEMO_ORDERED} />,
};

/** 404: 이미 삭제된 견적 — '다시 시도'를 권하지 않고 목록으로만 돌려보낸다 (EXC-12) */
export const NotFound: Story = {
  render: () => <QuoteDetailScreen failure="not-found" />,
};
