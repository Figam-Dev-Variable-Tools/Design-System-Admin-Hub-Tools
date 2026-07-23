/**
 * Design System/Templates/Orders/Claim Detail — 클레임 상세·처리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/orders/claims/:id` → 메뉴 en = "Orders"(주문 관리), 화면 en =
 * "Claims" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Orders 그룹의
 * `['/orders/claims', '취소/교환/반품', 'Claims']`. 상세는 그 잎의 하위 경로다).
 *
 * 대응 실화면: apps/admin/src/pages/orders/claims/ClaimDetailPage.tsx (라우트 /orders/claims/:id) 와
 * 그 하위 조립(components/ExchangeOptionField · components/RefundSection · components/StockMovementTable).
 *
 * [왜 이런 구조인가 — 두 축을 각자의 카드로 나눈다] 클레임 처리(접수→수거→검수→완료)와 환불
 * (없음→접수→완료)은 별개의 축이고 끝나는 시점도 다르다. 한 카드에 섞으면 '완료' 버튼이 무엇을
 * 완료하는지 화면에서 읽히지 않는다. 그래서 카드가 넷이다: 요청 정보(+상태 전이) · 교환 재발송
 * (교환만) · 환불 처리(교환 아닌 것만) · 재고 이동 이력.
 *
 * [유형이 흐름을 바꾼다] 취소의 진행 스텝퍼는 접수 → 완료 둘뿐이다 — 물건이 아직 창고에 있어
 * 수거·검수가 없다. 없는 단계를 흐름에 남겨 두면 스텝퍼가 영원히 채워지지 않는 칸 둘을 그리고,
 * 운영자는 '무엇을 더 해야 하나' 를 계속 찾게 된다. 반려·철회는 흐름 밖 종료라 배지로 따로 알린다.
 *
 * [취소는 재고를 움직이지 않는다] 취소된 주문의 재고를 되돌리는 주체는 **주문**이다. 클레임이
 * 여기서 또 되돌리면 같은 수량이 두 번 들어오고, 두 원장 중 어느 쪽이 거짓인지 나중에는 아무도
 * 가리지 못한다. 재고 이동 이력 카드가 그 사실을 문장으로 말한다.
 *
 * [적립금·쿠폰은 환불완료에서만 복원된다] 접수·수거 시점에 미리 되돌리면 반려·철회된 클레임의
 * 고객이 적립금을 그대로 챙긴다. 쿠폰을 복원하면 고객은 같은 할인을 두 번 받으므로 그 할인액을
 * 환불에서 회수한다 — 복원과 회수는 언제나 같이 움직이는 한 쌍이다.
 *
 * [막힌 동작은 사유를 그대로 보여 준다] 전이 가드가 돌려준 문자열을 버튼 옆에 쓴다 — 화면은 사유를
 * 다시 지어내지 않는다. 되돌릴 수 없는 것(재고 반영·환불완료)에만 확인 창이 붙는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   CardTitle          → Card + 토큰만 쓴 <h2>
 *   StockMovementTable → DS Table(입고/출고 StatusBadge)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                   → Icon(chevron-left) + 토큰 <a>
 *   유형 배지                  → StatusBadge (취소 danger · 교환 info · 반품 warning)
 *   처리 진행 스텝퍼            → Stepper (유형별 흐름 · 반려/철회는 StatusBadge 로 대체)
 *   요청 정보                  → 토큰 <dl> + 주문 상세로 가는 토큰 <a>
 *   처리 상태 선택             → FormField + SelectField (갈 수 있는 상태만 연다)
 *   처리 메모                  → TextareaField
 *   교환할 옵션 · 재고 예고      → FormField + SelectField + 토큰 미리보기 박스 + StatusBadge
 *   환불 내역 · 실제 환불액      → 토큰 <dl> + 상단 경계선 합계 줄
 *   반품배송비 · 쿠폰 복원       → TextField + Checkbox
 *   환불 완료 결과             → Alert(success)
 *   재고 반영 · 환불 완료 확인   → ConfirmDialog(intent=update)
 *   재고 이동 이력             → Table (입고 success · 출고 warning) / 없으면 토큰 <p>
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
  Checkbox,
  ConfirmDialog,
  FormField,
  Icon,
  SelectField,
  StatusBadge,
  Stepper,
  Table,
  TextField,
  TextareaField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Orders/Claim Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 claims/types.ts · claims/refund.ts 미러) ─────────────────────────────── */

type ClaimKind = 'cancel' | 'exchange' | 'return';

const KIND_LABEL: Readonly<Record<ClaimKind, string>> = {
  cancel: '취소',
  exchange: '교환',
  return: '반품',
};

const KIND_TONE: Readonly<Record<ClaimKind, StatusBadgeTone>> = {
  cancel: 'danger',
  exchange: 'info',
  return: 'warning',
};

type ClaimStatus =
  'requested' | 'collecting' | 'inspecting' | 'completed' | 'rejected' | 'withdrawn';

const CLAIM_STATUSES: readonly ClaimStatus[] = [
  'requested',
  'collecting',
  'inspecting',
  'completed',
  'rejected',
  'withdrawn',
];

const STATUS_META: Readonly<
  Record<ClaimStatus, { readonly label: string; readonly tone: StatusBadgeTone }>
> = {
  requested: { label: '접수', tone: 'neutral' },
  collecting: { label: '수거중', tone: 'info' },
  inspecting: { label: '검수중', tone: 'warning' },
  completed: { label: '완료', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  withdrawn: { label: '철회', tone: 'neutral' },
};

/** 유형별 정상 처리 흐름 — 스텝퍼와 전이 가드가 **같은 배열**을 읽는다 */
function claimFlow(kind: ClaimKind): readonly ClaimStatus[] {
  // 취소에 수거·검수가 없는 이유: 물건이 아직 창고에 있다
  if (kind === 'cancel') return ['requested', 'completed'];
  return ['requested', 'collecting', 'inspecting', 'completed'];
}

const OFF_FLOW: readonly ClaimStatus[] = ['rejected', 'withdrawn'];

const isTerminal = (status: ClaimStatus): boolean =>
  status === 'completed' || OFF_FLOW.includes(status);

function flowIndex(kind: ClaimKind, status: ClaimStatus): number {
  const flow = claimFlow(kind);
  const index = flow.indexOf(status);
  // 흐름에 없는 값은 **끝 다음**으로 본다 — 어떤 전이도 허용되지 않는 쪽(fail-closed)으로 수렴한다
  return index === -1 ? flow.length : index;
}

const CLAIM_TRANSITION_SAME = '이미 그 상태예요.';
const CLAIM_TRANSITION_TERMINAL = '완료·반려·철회된 클레임은 상태를 바꿀 수 없어요.';
const CLAIM_TRANSITION_BACKWARD =
  '클레임 처리는 되돌릴 수 없어요. 접수를 취소하려면 철회로 종료하세요.';
const CLAIM_TRANSITION_OFF_FLOW = '이 유형에는 없는 처리 단계예요.';
const CLAIM_WITHDRAW_STOCK =
  '재고가 이미 반영되어 철회할 수 없어요. 반영된 재고는 되돌아가지 않아요.';
const CLAIM_WITHDRAW_REFUND = '환불이 접수되어 철회할 수 없어요. 환불 처리를 먼저 정리하세요.';
const CLAIM_CANCEL_SHIPPED =
  '배송이 시작된 주문은 취소로 처리할 수 없어요. 반품으로 접수해 주세요.';

/** 환불 진행 — 없음 → 접수 → 완료. 클레임 상태와 나란한 별개의 축이다 */
type RefundStatus = 'none' | 'requested' | 'completed';

const REFUND_SEQUENCE: readonly RefundStatus[] = ['none', 'requested', 'completed'];

const REFUND_META: Readonly<
  Record<RefundStatus, { readonly label: string; readonly tone: StatusBadgeTone }>
> = {
  none: { label: '환불 없음', tone: 'neutral' },
  requested: { label: '환불 접수', tone: 'warning' },
  completed: { label: '환불 완료', tone: 'success' },
};

const REFUND_TRANSITION_SAME = '이미 그 환불 상태예요.';
const REFUND_TRANSITION_DONE = '환불이 완료되어 더 이상 바꿀 수 없어요.';
const REFUND_TRANSITION_BACKWARD = '환불 처리는 되돌릴 수 없어요.';
const REFUND_NOT_REFUNDABLE = '교환은 환불 대상이 아니에요.';
const REFUND_CLAIM_CLOSED = '반려·철회된 클레임은 환불할 수 없어요.';
const REFUND_CLAIM_INCOMPLETE = '클레임 처리를 완료해야 환불을 완료할 수 있어요.';
const REFUND_NO_MEMBER =
  '비회원 주문이라 적립금 원장이 없어요. 사용한 적립금을 복원할 수 없어 환불을 완료할 수 없어요.';
const REFUND_FEE_INVALID = '반품배송비는 0 이상의 원 단위 숫자로 입력하세요.';

const CLAIM_NOTE_MAX = 500;
/** 배송 정책이 준 반품배송비 기본값 — 모르면 null 이고 화면이 그 사실을 그대로 밝힌다 */
const POLICY_RETURN_FEE = 3000;

/* ── 데모 데이터(실화면 CLAIM_SEED · variant-ref 를 상세가 쓰는 필드까지 미러) ────────────────── */

interface DemoRefund {
  readonly status: RefundStatus;
  /** 이 클레임 대상분의 결제액(원, 스냅숏) — 환불 계산의 출발점 */
  readonly paidAmount: number;
  /** 주문에서 쓴 적립금(원, 스냅숏) — 환불완료가 되돌릴 대상 */
  readonly pointUsed: number;
  readonly couponDiscount: number;
  readonly couponName: string;
  readonly returnShippingFee: number;
  /** 쿠폰을 복원(재발급)하는가 — 복원하면 그 할인액을 환불에서 회수한다 */
  readonly couponRestored: boolean;
  /** 환불 완료 시각 ISO — '' 면 미완료. 복원을 두 번 하지 않게 하는 멱등 키다 */
  readonly completedAt: string;
  readonly restoredPoint: number;
}

const NO_REFUND: DemoRefund = {
  status: 'none',
  paidAmount: 0,
  pointUsed: 0,
  couponDiscount: 0,
  couponName: '',
  returnShippingFee: 0,
  couponRestored: false,
  completedAt: '',
  restoredPoint: 0,
};

interface DemoMovement {
  readonly id: string;
  readonly at: string;
  readonly direction: 'in' | 'out';
  readonly sku: string;
  readonly optionLabel: string;
  readonly quantity: number;
}

/** 상품이 소유한 옵션·재고 — 클레임은 사본을 들지 않고 조회기가 준 목록을 그대로 쓴다 */
interface DemoVariant {
  readonly id: string;
  readonly sku: string;
  readonly optionValues: readonly string[];
  readonly stock: number;
}

interface DemoOrderRef {
  readonly id: string;
  readonly statusLabel: string;
  readonly canceled: boolean;
  /** 배송이 이미 떠났는가 — 취소로 처리할 수 있는지의 유일한 근거 */
  readonly leftWarehouse: boolean;
}

interface DemoClaim {
  readonly id: string;
  readonly order: DemoOrderRef;
  readonly productName: string;
  readonly customer: string;
  /** 회원 id — 적립금 원장의 주인. 비회원 주문이면 ''(되돌릴 원장이 없다) */
  readonly memberId: string;
  readonly kind: ClaimKind;
  readonly optionValues: readonly string[];
  readonly exchangeOptionValues: readonly string[];
  readonly reason: string;
  readonly reasonDetail: string;
  readonly quantity: number;
  readonly requestedAt: string;
  readonly status: ClaimStatus;
  /** 재고 반영 시각 ISO — '' 면 미반영. 재반영을 막는 멱등 키다 */
  readonly stockAppliedAt: string;
  readonly stockMovements: readonly DemoMovement[];
  readonly refund: DemoRefund;
  readonly adminNote: string;
  /** 교환일 때만 쓰이는 옵션 카탈로그 */
  readonly variants: readonly DemoVariant[];
}

/** 반품 · 수거중 — 단순 변심이라 반품배송비를 고객이 부담한다(정책 기본값 3,000원) */
const RETURN_CLAIM: DemoClaim = {
  id: 'clm-2',
  order: {
    id: 'ORD-20260710-0148',
    statusLabel: '배송완료',
    canceled: false,
    leftWarehouse: true,
  },
  productName: '테라 스니커즈 데일리',
  customer: '박**',
  memberId: 'mem-3',
  kind: 'return',
  optionValues: ['260'],
  exchangeOptionValues: [],
  reason: '단순 변심',
  reasonDetail: '착용감이 기대와 달라 반품해요.',
  quantity: 1,
  requestedAt: '2026-07-10',
  status: 'collecting',
  stockAppliedAt: '',
  stockMovements: [],
  refund: { ...NO_REFUND, status: 'requested', paidAmount: 79000, returnShippingFee: 3000 },
  adminNote: '수거 택배 접수 완료(2026-07-11).',
  variants: [],
};

/** 교환 · 접수 — 환불 축 자체가 해당 없음이고, 대신 재발송 옵션을 골라야 한다 */
const EXCHANGE_CLAIM: DemoClaim = {
  id: 'clm-1',
  order: {
    id: 'ORD-20260712-0031',
    statusLabel: '배송중',
    canceled: false,
    leftWarehouse: true,
  },
  productName: '루미엔 경량 패딩 점퍼',
  customer: '김**',
  memberId: 'mem-1',
  kind: 'exchange',
  optionValues: ['블랙', 'M'],
  exchangeOptionValues: [],
  reason: '사이즈 교환',
  reasonDetail: 'M 사이즈가 작아 L 로 교환 요청해요.',
  quantity: 1,
  requestedAt: '2026-07-12',
  status: 'requested',
  stockAppliedAt: '',
  stockMovements: [],
  refund: NO_REFUND,
  adminNote: '',
  variants: [
    { id: 'prd1-2', sku: 'LMN-PAD-001-블랙-M', optionValues: ['블랙', 'M'], stock: 8 },
    { id: 'prd1-3', sku: 'LMN-PAD-001-블랙-L', optionValues: ['블랙', 'L'], stock: 5 },
    { id: 'prd1-5', sku: 'LMN-PAD-001-차콜-M', optionValues: ['차콜', 'M'], stock: 3 },
    // 재고가 수량보다 적은 조합은 고를 수 없다 — 유효성이 선택지 자체를 막는다
    { id: 'prd1-8', sku: 'LMN-PAD-001-베이지-M', optionValues: ['베이지', 'M'], stock: 0 },
  ],
};

/** 취소 · 쿠폰과 적립금을 함께 쓴 주문 — 쿠폰을 복원하면 그 할인액을 환불에서 회수한다 */
const CANCEL_CLAIM: DemoClaim = {
  id: 'clm-8',
  order: {
    id: 'ORD-20260720-0002',
    statusLabel: '배송준비중',
    canceled: false,
    leftWarehouse: false,
  },
  productName: '오브제 미니멀 크로스백 외 1건',
  customer: '오**',
  memberId: 'mem-2',
  kind: 'cancel',
  optionValues: [],
  exchangeOptionValues: [],
  reason: '배송 지연',
  reasonDetail: '배송이 늦어져 주문 전체를 취소해요.',
  quantity: 1,
  requestedAt: '2026-07-21',
  status: 'requested',
  stockAppliedAt: '',
  stockMovements: [],
  refund: {
    ...NO_REFUND,
    status: 'requested',
    paidAmount: 52150,
    pointUsed: 1000,
    couponDiscount: 5000,
    couponName: '여름맞이 5천원 할인',
    couponRestored: true,
    // 취소는 출고 전이라 되돌아오는 물건이 없다 — 반품배송비는 언제나 0이다
    returnShippingFee: 0,
  },
  adminNote: '',
  variants: [],
};

/** 반품 · 완료 + 환불 완료 — 재고 이동이 확정됐고 차감 내역은 더 이상 고칠 수 없다 */
const COMPLETED_CLAIM: DemoClaim = {
  id: 'clm-4',
  order: {
    id: 'ORD-20260705-0210',
    statusLabel: '배송완료',
    canceled: false,
    leftWarehouse: true,
  },
  productName: '오브제 미니멀 크로스백',
  customer: '최**',
  memberId: 'mem-7',
  kind: 'return',
  optionValues: [],
  exchangeOptionValues: [],
  reason: '단순 변심',
  reasonDetail: '색상이 화면과 달라 반품해요.',
  quantity: 1,
  requestedAt: '2026-07-05',
  status: 'completed',
  stockAppliedAt: '2026-07-09T10:20:00.000Z',
  stockMovements: [
    {
      id: 'mv-clm4-in',
      at: '2026-07-09T10:20:00.000Z',
      direction: 'in',
      sku: 'OBJ-BAG-338',
      optionLabel: '단일 상품',
      quantity: 1,
    },
  ],
  refund: {
    ...NO_REFUND,
    status: 'completed',
    paidAmount: 38250,
    completedAt: '2026-07-09T10:25:00.000Z',
  },
  adminNote: '환불 완료(2026-07-09).',
  variants: [],
};

/* ── 순수 규칙(실화면 도메인 미러 — 화면이 각자 다시 판단하지 않는다) ────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** ISO → 'YYYY-MM-DD HH:mm'. 문자열을 자른다 — 뷰어의 표준시가 스토리를 흔들지 않게 한다 */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

/** 옵션 조합 표기 — '블랙 / M'. 옵션이 없는 상품은 '단일 상품' */
const optionLabel = (values: readonly string[]): string =>
  values.length === 0 ? '단일 상품' : values.join(' / ');

const findVariant = (
  variants: readonly DemoVariant[],
  values: readonly string[],
): DemoVariant | undefined =>
  variants.find(
    (variant) =>
      variant.optionValues.length === values.length &&
      variant.optionValues.every((value, index) => value === values[index]),
  );

/** 취소로 **처리**할 수 없는 이유 — 판정의 근거는 주문의 출고 여부 하나다 */
const cancelBlock = (order: DemoOrderRef): string | null =>
  order.leftWarehouse ? CLAIM_CANCEL_SHIPPED : null;

/**
 * 이 클레임을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null.
 *
 * 순서에 뜻이 있다: ① 같은 자리 ② 종료된 클레임 ③ 철회(유일한 역방향) ④ 흐름 밖 단계 ⑤ 역방향
 * ⑥ 취소의 출고 조건. 앞의 것이 더 근본적인 거절이라 사유가 더 정확해진다.
 */
function claimTransitionBlock(claim: DemoClaim, to: ClaimStatus): string | null {
  if (to === claim.status) return CLAIM_TRANSITION_SAME;
  if (isTerminal(claim.status)) return CLAIM_TRANSITION_TERMINAL;

  if (to === 'withdrawn') {
    if (claim.stockAppliedAt !== '') return CLAIM_WITHDRAW_STOCK;
    if (claim.refund.status !== 'none') return CLAIM_WITHDRAW_REFUND;
    return null;
  }
  // 반려는 어느 단계에서나 낼 수 있다 — 출고된 취소 건이라도 종료는 시킬 수 있어야 한다
  if (to === 'rejected') return null;

  const flow = claimFlow(claim.kind);
  if (!flow.includes(to)) return CLAIM_TRANSITION_OFF_FLOW;
  if (flowIndex(claim.kind, to) <= flowIndex(claim.kind, claim.status)) {
    return CLAIM_TRANSITION_BACKWARD;
  }
  if (claim.kind === 'cancel') return cancelBlock(claim.order);
  return null;
}

/** 지금 갈 수 있는 상태들 — 상세의 상태 선택지가 이것만 연다 */
const nextClaimStatuses = (claim: DemoClaim): readonly ClaimStatus[] =>
  CLAIM_STATUSES.filter((status) => claimTransitionBlock(claim, status) === null);

/** 이 클레임이 재고를 움직이는가 — **취소는 움직이지 않는다**(복원은 주문 취소가 한다) */
const movesStock = (kind: ClaimKind, status: ClaimStatus): boolean =>
  status === 'completed' && kind !== 'cancel';

const isRefundable = (kind: ClaimKind): boolean => kind !== 'exchange';

interface RefundBreakdown {
  readonly paid: number;
  readonly returnShippingFee: number;
  /** 회수 쿠폰분 — 쿠폰을 복원하지 않으면 0 */
  readonly couponClawback: number;
  readonly total: number;
}

/** 환불 내역(순수) — 화면은 이 결과만 그리고 스스로 빼지 않는다. 0 아래로 내려가지 않는다 */
function refundBreakdown(refund: DemoRefund): RefundBreakdown {
  const couponClawback = refund.couponRestored ? refund.couponDiscount : 0;
  return {
    paid: refund.paidAmount,
    returnShippingFee: refund.returnShippingFee,
    couponClawback,
    total: Math.max(0, refund.paidAmount - refund.returnShippingFee - couponClawback),
  };
}

function refundIndex(status: RefundStatus): number {
  const index = REFUND_SEQUENCE.indexOf(status);
  return index === -1 ? REFUND_SEQUENCE.length : index;
}

/** 환불을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null(버튼 옆 문장이 이 값이다) */
function refundTransitionBlock(
  claim: DemoClaim,
  status: ClaimStatus,
  to: RefundStatus,
): string | null {
  if (to === claim.refund.status) return REFUND_TRANSITION_SAME;
  if (!isRefundable(claim.kind)) return REFUND_NOT_REFUNDABLE;
  if (claim.refund.status === 'completed') return REFUND_TRANSITION_DONE;
  if (refundIndex(to) < refundIndex(claim.refund.status)) return REFUND_TRANSITION_BACKWARD;
  if (status === 'rejected' || status === 'withdrawn') return REFUND_CLAIM_CLOSED;
  if (to !== 'completed') return null;
  if (status !== 'completed') return REFUND_CLAIM_INCOMPLETE;
  // 적립금을 쓴 주문인데 되돌릴 원장이 없으면 환불이 반쪽이 된다 — 돈만 가고 적립금은 사라진다
  if (claim.refund.pointUsed > 0 && claim.memberId === '') return REFUND_NO_MEMBER;
  return null;
}

/** 차감 입력(문자열) → 금액. **유효하지 않으면 null** — 원 단위 정수만 받는다 */
function parseFeeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

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

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const stepperWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
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

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/** 실제 환불액 — 다른 값보다 굵게. 운영자가 가장 먼저 찾는 숫자다 */
const totalRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

const totalValueStyle: CSSProperties = {
  ...ddStyle,
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const deductionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
};

const previewStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
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

const moveRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  color: cssVar('color.text.default'),
  ...typography('typography.label.sm'),
};

const deltaStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
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

function DetailCard({
  title,
  badges,
  children,
}: {
  readonly title: string;
  readonly badges?: ReactNode;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card aria-labelledby={titleId}>
        <div style={cardBodyStyle}>
          <div style={cardTitleRowStyle}>
            <h2 id={titleId} style={cardTitleStyle}>
              {title}
            </h2>
            {badges}
          </div>
          {children}
        </div>
      </Card>
    </section>
  );
}

/* ── 재고 이동 이력 표(StockMovementTable 미러) ─────────────────────────────────────────────── */

const MOVEMENT_COLUMNS: TableProps['columns'] = [
  { id: 'direction', header: '구분', nowrap: true },
  { id: 'option', header: '옵션', nowrap: true },
  { id: 'sku', header: 'SKU', nowrap: true },
  { id: 'quantity', header: '수량', align: 'end', nowrap: true },
  { id: 'at', header: '반영 시각', nowrap: true },
];

function StockMovementSection({ claim }: { readonly claim: DemoClaim }) {
  if (claim.stockMovements.length === 0) {
    return (
      <p style={hintStyle}>
        {claim.kind === 'cancel'
          ? '취소는 이 화면에서 재고를 움직이지 않아요. 출고 전 재고는 주문을 취소할 때 되돌아가요.'
          : '아직 반영된 재고 이동이 없어요. 완료 처리 시 기록돼요.'}
      </p>
    );
  }

  const rows: TableProps['rows'] = claim.stockMovements.map((movement) => ({
    id: movement.id,
    cells: [
      movement.direction === 'in' ? (
        <StatusBadge key="direction" tone="success" label="입고" />
      ) : (
        <StatusBadge key="direction" tone="warning" label="출고" />
      ),
      <span key="option">{movement.optionLabel}</span>,
      <span key="sku" style={deltaStyle}>
        {movement.sku}
      </span>,
      <span key="quantity" style={deltaStyle}>
        {`${movement.direction === 'in' ? '+' : '−'}${fmt(movement.quantity)}개`}
      </span>,
      <span key="at" style={deltaStyle}>
        {formatDateTime(movement.at)}
      </span>,
    ],
  }));

  return (
    <div style={tableScrollStyle}>
      <Table
        caption="이 클레임으로 확정된 재고 이동 이력 — 입고는 회수분, 출고는 교환 재발송분이에요."
        columns={MOVEMENT_COLUMNS}
        rows={rows}
        empty="기록된 재고 이동이 없어요."
      />
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ClaimDetailScreenProps {
  readonly claim?: DemoClaim;
  readonly loading?: boolean;
}

function ClaimDetailScreen({ claim = RETURN_CLAIM, loading = false }: ClaimDetailScreenProps) {
  const [status, setStatus] = useState<ClaimStatus>(claim.status);
  const [note, setNote] = useState(claim.adminNote);
  const [exchangeValues, setExchangeValues] = useState<readonly string[]>(
    claim.exchangeOptionValues,
  );
  const [feeInput, setFeeInput] = useState(() =>
    claim.refund.status === 'none'
      ? String(claim.kind === 'cancel' ? 0 : POLICY_RETURN_FEE)
      : String(claim.refund.returnShippingFee),
  );
  const [couponRestored, setCouponRestored] = useState(claim.refund.couponRestored);
  const [confirmStock, setConfirmStock] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  if (loading) {
    return (
      <div style={pageStyle}>
        <a href="#claims" style={backLinkStyle}>
          <Icon name="chevron-left" />
          목록으로
        </a>
        <Card>
          <p style={hintStyle}>불러오는 중…</p>
        </Card>
      </div>
    );
  }

  const parsedFee = parseFeeInput(feeInput);
  const feeError = feeInput.trim() === '' || parsedFee !== null ? undefined : REFUND_FEE_INVALID;

  /** 편집 중인 값이 반영된 환불 정보 — 계산·전이 판정이 모두 이 한 벌을 읽는다 */
  const draftRefund: DemoRefund = {
    ...claim.refund,
    returnShippingFee: parsedFee ?? claim.refund.returnShippingFee,
    couponRestored,
  };
  const breakdown = refundBreakdown(draftRefund);
  const refundDone = claim.refund.completedAt !== '';

  const statusOptions: readonly ClaimStatus[] = [claim.status, ...nextClaimStatuses(claim)];
  const transitionHint = status === claim.status ? null : claimTransitionBlock(claim, status);
  const cancelWarning = claim.kind === 'cancel' ? cancelBlock(claim.order) : null;
  const applied = claim.stockAppliedAt !== '';
  // 이 저장이 **재고를 실제로 움직이는가** — 움직이면 되돌릴 수 없어 확인을 한 번 받는다
  const willMoveStock = movesStock(claim.kind, status) && !applied;

  const selectedVariant =
    exchangeValues.length === 0 ? undefined : findVariant(claim.variants, exchangeValues);
  const originVariant = findVariant(claim.variants, claim.optionValues);
  // 같은 옵션으로의 교환은 입고·출고가 서로 상쇄한다 — 두 줄로 보여 주면 거짓말이 된다
  const sameOption =
    selectedVariant !== undefined &&
    originVariant !== undefined &&
    selectedVariant.id === originVariant.id;

  const requestBlock = refundTransitionBlock(claim, status, 'requested');
  const completeBlock =
    parsedFee === null ? REFUND_FEE_INVALID : refundTransitionBlock(claim, status, 'completed');

  return (
    <div style={pageStyle}>
      <a href="#claims" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <h1 style={pageTitleStyle}>클레임 처리</h1>

      <DetailCard
        title="요청 정보"
        badges={<StatusBadge tone={KIND_TONE[claim.kind]} label={KIND_LABEL[claim.kind]} />}
      >
        {cancelWarning !== null && <Alert tone="warning">{cancelWarning}</Alert>}

        <div style={stepperWrapStyle}>
          <span style={fieldLabelStyle}>처리 진행</span>
          {status === 'rejected' || status === 'withdrawn' ? (
            <StatusBadge
              tone={STATUS_META[status].tone}
              label={`${STATUS_META[status].label} — 처리 종료`}
            />
          ) : (
            <Stepper
              steps={claimFlow(claim.kind).map((step) => ({
                id: step,
                label: STATUS_META[step].label,
              }))}
              current={status}
              ariaLabel="처리 진행 단계"
            />
          )}
        </div>

        <dl style={dlStyle}>
          <dt style={dtStyle}>주문번호</dt>
          <dd style={ddStyle}>
            {/* 원 주문으로 건너뛰는 유일한 실 */}
            <a href="#order-detail" style={linkStyle}>
              {claim.order.id}
            </a>
          </dd>
          <dt style={dtStyle}>주문 상태</dt>
          <dd style={ddStyle}>
            {`${claim.order.statusLabel}${claim.order.canceled ? ' · 취소됨' : ''}`}
          </dd>
          <dt style={dtStyle}>상품</dt>
          <dd style={ddStyle}>{claim.productName}</dd>
          <dt style={dtStyle}>주문 옵션</dt>
          <dd style={ddStyle}>{optionLabel(claim.optionValues)}</dd>
          <dt style={dtStyle}>신청자</dt>
          <dd style={ddStyle}>{claim.customer}</dd>
          <dt style={dtStyle}>수량</dt>
          <dd style={ddStyle}>{`${fmt(claim.quantity)}개`}</dd>
          <dt style={dtStyle}>사유</dt>
          <dd style={ddStyle}>{claim.reason}</dd>
          <dt style={dtStyle}>상세 사유</dt>
          <dd style={ddStyle}>{claim.reasonDetail}</dd>
          <dt style={dtStyle}>접수일</dt>
          <dd style={ddStyle}>{claim.requestedAt}</dd>
        </dl>

        {/* 갈 수 없는 상태를 열어 두고 저장에서 막으면 운영자는 이미 마음을 정한 뒤에 거절당한다 */}
        <FormField htmlFor="claim-status" label="처리 상태">
          <SelectField
            id="claim-status"
            value={status}
            onChange={(event) => {
              const next = CLAIM_STATUSES.find((option) => option === event.target.value);
              if (next !== undefined) setStatus(next);
            }}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {STATUS_META[option].label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <TextareaField
          label="처리 메모"
          value={note}
          onChange={setNote}
          maxLength={CLAIM_NOTE_MAX}
          placeholder="수거·검수·환불 등 처리 내역을 기록하세요."
          rows={4}
        />

        <div style={actionsStyle}>
          {transitionHint !== null && <span style={hintStyle}>{transitionHint}</span>}
          <Button variant="secondary">목록으로</Button>
          <Button
            variant="primary"
            size="md"
            disabled={transitionHint !== null}
            onClick={() => {
              // 재고를 움직이지 않는 저장(진행·반려·메모 수정)은 확인을 묻지 않는다 —
              // 되돌릴 수 있는 일에까지 확인을 붙이면 정작 중요한 확인이 무시된다.
              if (willMoveStock) setConfirmStock(true);
            }}
          >
            처리 저장
          </Button>
        </div>
      </DetailCard>

      {claim.kind === 'exchange' && (
        <DetailCard
          title="교환 재발송 · 재고"
          badges={applied ? <StatusBadge tone="success" label="재고 반영 완료" /> : undefined}
        >
          {applied ? (
            <p style={hintStyle}>
              {`재고가 이미 반영되어 교환 옵션을 바꿀 수 없어요. 재발송 옵션: ${optionLabel(claim.exchangeOptionValues)}`}
            </p>
          ) : (
            <>
              <FormField
                htmlFor="claim-exchange-option"
                label="교환할 옵션"
                required
                hint="재고가 남은 옵션만 선택할 수 있어요. 완료 처리 시 이 옵션으로 재발송돼요."
              >
                <SelectField
                  id="claim-exchange-option"
                  value={selectedVariant?.id ?? ''}
                  onChange={(event) => {
                    const next = claim.variants.find(
                      (variant) => variant.id === event.target.value,
                    );
                    setExchangeValues(next === undefined ? [] : next.optionValues);
                  }}
                >
                  <option value="">옵션을 선택하세요</option>
                  {claim.variants.map((variant) => {
                    const short = claim.quantity > variant.stock;
                    return (
                      <option key={variant.id} value={variant.id} disabled={short}>
                        {`${optionLabel(variant.optionValues)} — 재고 ${fmt(variant.stock)}개${short ? ' (재고 부족)' : ''}`}
                      </option>
                    );
                  })}
                </SelectField>
              </FormField>

              {selectedVariant !== undefined && (
                <div style={previewStyle} aria-live="polite">
                  <span style={hintStyle}>완료 처리 시 재고가 이렇게 움직여요</span>
                  {sameOption ? (
                    <span style={moveRowStyle}>
                      주문과 같은 옵션이라 회수분 입고와 재발송 출고가 서로 상쇄돼요 — 재고 변화
                      없음.
                    </span>
                  ) : (
                    <>
                      {originVariant !== undefined && (
                        <span style={moveRowStyle}>
                          <StatusBadge tone="success" label="입고" />
                          {`${optionLabel(originVariant.optionValues)} · ${originVariant.sku}`}
                          <span style={deltaStyle}>
                            {`${fmt(originVariant.stock)} → ${fmt(originVariant.stock + claim.quantity)}개`}
                          </span>
                        </span>
                      )}
                      <span style={moveRowStyle}>
                        <StatusBadge tone="warning" label="출고" />
                        {`${optionLabel(selectedVariant.optionValues)} · ${selectedVariant.sku}`}
                        <span style={deltaStyle}>
                          {`${fmt(selectedVariant.stock)} → ${fmt(Math.max(0, selectedVariant.stock - claim.quantity))}개`}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </DetailCard>
      )}

      {isRefundable(claim.kind) && (
        <DetailCard
          title="환불 처리"
          badges={
            <StatusBadge
              tone={REFUND_META[claim.refund.status].tone}
              label={REFUND_META[claim.refund.status].label}
            />
          }
        >
          <div style={sectionStyle}>
            <dl style={dlStyle}>
              <dt style={dtStyle}>결제액</dt>
              <dd style={ddStyle}>{`${fmt(breakdown.paid)}원`}</dd>
              <dt style={dtStyle}>반품배송비 차감</dt>
              <dd style={ddStyle}>{`− ${fmt(breakdown.returnShippingFee)}원`}</dd>
              <dt style={dtStyle}>회수 쿠폰분</dt>
              <dd style={ddStyle}>
                {draftRefund.couponDiscount === 0
                  ? '사용한 쿠폰 없음'
                  : `− ${fmt(breakdown.couponClawback)}원${
                      draftRefund.couponRestored
                        ? ` (${draftRefund.couponName} 복원)`
                        : ' (쿠폰을 복원하지 않아 회수하지 않아요)'
                    }`}
              </dd>
            </dl>

            <div style={totalRowStyle}>
              <span style={hintStyle}>실제 환불액</span>
              <span style={totalValueStyle}>{`${fmt(breakdown.total)}원`}</span>
            </div>

            <div style={deductionStyle}>
              <TextField
                id="claim-return-fee"
                label="반품배송비(원)"
                inputMode="numeric"
                value={feeInput}
                // 완료된 환불의 차감은 이미 나간 돈의 근거다 — 사후에 고칠 수 없다
                disabled={refundDone}
                error={feeError ?? ''}
                onChange={(event) => setFeeInput(event.target.value)}
              />
              <span style={hintStyle}>
                {`배송 정책 기본값 ${fmt(POLICY_RETURN_FEE)}원 — 이 건만 다르게 정할 수 있어요.`}
              </span>
              {draftRefund.couponDiscount > 0 && (
                <Checkbox
                  id="claim-coupon-restore"
                  label={`${draftRefund.couponName} 복원(환불액에서 ${fmt(draftRefund.couponDiscount)}원 회수)`}
                  checked={draftRefund.couponRestored}
                  disabled={refundDone}
                  onChange={(event) => setCouponRestored(event.target.checked)}
                />
              )}
            </div>

            {refundDone ? (
              <Alert tone="success">
                {`${formatDateTime(claim.refund.completedAt)} 환불 완료 — 적립금 ${fmt(claim.refund.restoredPoint)}원을 원장에 복원했어요.${
                  claim.refund.couponRestored
                    ? ` ${claim.refund.couponName} 쿠폰도 복원했어요.`
                    : ''
                }`}
              </Alert>
            ) : (
              <>
                <p style={hintStyle}>
                  {draftRefund.pointUsed === 0
                    ? '이 주문에는 사용한 적립금이 없어요. 환불완료 시 복원할 적립금도 없어요.'
                    : `환불완료 처리를 해야 사용한 적립금 ${fmt(draftRefund.pointUsed)}원이 원장으로 돌아가요.`}
                </p>
                <div style={actionsStyle}>
                  {(requestBlock ?? completeBlock) !== null && (
                    <span style={hintStyle}>{requestBlock ?? completeBlock}</span>
                  )}
                  <Button variant="secondary" disabled={requestBlock !== null}>
                    환불 접수
                  </Button>
                  <Button
                    variant="primary"
                    disabled={completeBlock !== null || feeError !== undefined}
                    onClick={() => setConfirmRefund(true)}
                  >
                    환불 완료 처리
                  </Button>
                </div>
              </>
            )}
          </div>
        </DetailCard>
      )}

      <DetailCard title="재고 이동 이력">
        <StockMovementSection claim={claim} />
      </DetailCard>

      {/* 되돌릴 수 없는 재고 이동의 확인 창구. intent='update' 인 이유: 삭제가 아니라 '확정' 이다 */}
      {confirmStock && (
        <ConfirmDialog
          intent="update"
          title={claim.kind === 'exchange' ? '교환 재고 반영' : '반품 재고 반영'}
          message={`'${claim.productName}' ${fmt(claim.quantity)}개의 재고가 이동해요. 재고 반영은 되돌릴 수 없으며, 반영 후에는 교환 옵션을 바꿀 수 없어요.`}
          confirmLabel="재고 반영"
          onConfirm={() => setConfirmStock(false)}
          onCancel={() => setConfirmStock(false)}
        />
      )}

      {/* 환불완료도 되돌릴 수 없다 — 적립금 원장은 추가만 되는 장부라 잘못 얹으면 지울 수 없다 */}
      {confirmRefund && (
        <ConfirmDialog
          intent="update"
          title="환불 완료 처리"
          message={`${fmt(breakdown.total)}원을 환불 완료로 기록하고, 사용한 적립금 ${fmt(draftRefund.pointUsed)}원을 원장에 복원해요. 이 처리는 되돌릴 수 없어요.`}
          confirmLabel="환불 완료"
          onConfirm={() => setConfirmRefund(false)}
          onCancel={() => setConfirmRefund(false)}
        />
      )}
    </div>
  );
}

/**
 * 정상(반품 · 수거중): 처리 축은 수거중, 환불 축은 접수 — 두 축이 각자의 카드에서 각자 움직인다.
 * 환불 완료 버튼은 '클레임 처리를 완료해야 환불을 완료할 수 있습니다.' 로 막혀 있다.
 */
export const Default: Story = {
  render: () => <ClaimDetailScreen />,
};

/**
 * 교환: 환불 카드 자체가 없다(교환은 돈이 오가지 않는다). 대신 재발송 옵션을 고르면 완료 시
 * 재고가 어떻게 움직이는지 먼저 보여 준다 — 재고가 모자란 조합은 선택지에서 잠긴다.
 */
export const Exchange: Story = {
  render: () => <ClaimDetailScreen claim={EXCHANGE_CLAIM} />,
};

/**
 * 취소 + 쿠폰 복원: 반품배송비는 언제나 0이고(출고 전이라 돌아올 물건이 없다), 쿠폰을 복원하면
 * 그 할인 5,000원을 환불액에서 회수한다 — 복원과 회수는 한 쌍이다.
 */
export const CancelWithCoupon: Story = {
  render: () => <ClaimDetailScreen claim={CANCEL_CLAIM} />,
};

/**
 * 환불 완료: 차감 입력이 잠기고(이미 나간 돈의 근거다) 복원 결과가 배너로 남는다.
 * 재고 이동 이력에 확정된 입고 1건이 보인다.
 */
export const RefundCompleted: Story = {
  render: () => <ClaimDetailScreen claim={COMPLETED_CLAIM} />,
};

/** 상세 조회 중: 카드 하나에 안내만 남는다 */
export const Loading: Story = {
  render: () => <ClaimDetailScreen loading />,
};
