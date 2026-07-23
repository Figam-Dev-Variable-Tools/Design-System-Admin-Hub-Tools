/**
 * Design System/Templates/Orders/Order Detail — 주문 상세·처리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/orders/:id` → 메뉴 en = "Orders"(주문 관리), 화면 en = "Orders"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Orders 그룹의 `['/orders', '주문', 'Orders']`.
 * 상세는 그 잎의 하위 경로라 별도 인벤토리 행을 갖지 않는다).
 *
 * 대응 실화면: apps/admin/src/pages/orders/OrderDetailPage.tsx (라우트 /orders/:id).
 *
 * [왜 이런 구조인가 — 등록 폼이 없는 화면 유형 E(처리 워크플로)] 관리자가 여기서 만드는 것은 없다.
 * 상태를 앞으로 옮기고, 입금을 확인하고, 필요하면 취소하고, 메모를 남길 뿐이다. 그래서 카드가
 * 다섯이고(요약·주문자/수령인·품목·결제·이력) 그 위에 처리 버튼 줄이 하나 얹힌다.
 *
 * [버튼과 저장이 같은 술어를 읽는다] 어떤 단계로 갈 수 있는지는 순수 함수(transitionBlock)가 정하고
 * 그 결과가 곧 버튼 목록이다. **갈 수 없는 단계는 버튼이 아예 없고**, 왜 없는지는 그 술어가 만든
 * 문장을 그대로 옆에 쓴다 — 화면이 사유를 다시 지어내지 않는다. 취소도 같다: 막혀 있으면 비활성
 * 버튼 대신 이유가 선다(없는 버튼을 찾게 하지 않는다).
 *
 * [취소·부분배송은 상태가 아니라 나란한 사실이다] 취소는 상태 배지를 지우지 않고 옆에 배지를 하나
 * 더 세우고, 부분배송은 '부분배송 1/3' 배지와 품목 표의 warning 행으로 말한다.
 *
 * [되돌릴 수 없는 것에만 확인을 묻는다] 상태 전이·입금 확인은 ConfirmDialog 를, 취소는 사유를 받아야
 * 하므로 Modal 을 지난다. 처리 메모 저장은 되돌릴 수 있으므로 곧바로 저장한다 — 되돌릴 수 있는
 * 일에까지 확인을 붙이면 정작 중요한 확인이 무시된다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   CardTitle          → Card + 토큰만 쓴 <h2>(DS Card 는 표면만 소유)
 *   dl/dt/dd 정의 목록  → 토큰 그리드 <dl>
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                  → Icon(chevron-left) + 토큰 <a>
 *   상태 · 취소 · 부분배송 배지 → StatusBadge ×3
 *   취소 안내 · 권한 안내       → Alert(warning / info)
 *   요약 정의 목록             → 토큰 <dl>(주문일시 · 입금·결제 · 재고 차감/복원)
 *   입금 확인 · 다음 단계 버튼   → Button(primary/secondary) — 갈 수 없는 단계는 그리지 않는다
 *   주문 취소                  → Button(danger) → Modal + TextareaField(사유)
 *   전이·취소 확인             → ConfirmDialog(intent=update)
 *   주문 품목 표               → Table (미출고 줄은 tone='warning')
 *   결제 정보                  → 토큰 <dl>(최종 결제금액만 굵게)
 *   처리 이력                  → Timeline
 *   처리 메모                  → TextareaField + Button(primary)
 *   상세 조회 중               → Card + 토큰 <p>(불러오는 중…)
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
  ConfirmDialog,
  Icon,
  Modal,
  StatusBadge,
  Table,
  TextareaField,
  Timeline,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps, TimelineProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Orders/Order Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 shared/domain/order.ts 미러) ────────────────────────────────────────── */

type OrderStatus =
  'pending' | 'preparing' | 'holding' | 'waiting' | 'shipping' | 'delivered' | 'confirmed';

const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  'pending',
  'preparing',
  'holding',
  'waiting',
  'shipping',
  'delivered',
  'confirmed',
];

const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  pending: '입금전',
  preparing: '배송준비중',
  holding: '배송보류',
  waiting: '배송대기',
  shipping: '배송중',
  delivered: '배송완료',
  confirmed: '구매확정',
};

const ORDER_STATUS_TONE: Readonly<Record<OrderStatus, StatusBadgeTone>> = {
  pending: 'warning',
  preparing: 'info',
  holding: 'danger',
  waiting: 'info',
  shipping: 'info',
  delivered: 'success',
  confirmed: 'neutral',
};

type OrderEventKind = 'order' | 'payment' | 'status' | 'stock' | 'cancel' | 'note';

const EVENT_TONE: Readonly<Record<OrderEventKind, StatusBadgeTone>> = {
  order: 'neutral',
  payment: 'success',
  status: 'info',
  stock: 'warning',
  cancel: 'danger',
  note: 'neutral',
};

type PaymentMethod = 'card' | 'transfer' | 'vbank' | 'easypay';

const PAYMENT_METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: '신용·체크카드',
  transfer: '계좌이체',
  vbank: '가상계좌',
  easypay: '간편결제',
};

const ORDER_NOTE_MAX = 500;
const ORDER_CANCEL_REASON_MAX = 200;

const TRANSITION_CANCELED = '취소된 주문은 상태를 바꿀 수 없어요.';
const TRANSITION_CONFIRMED = '구매확정된 주문은 더 이상 진행할 단계가 없어요.';
const TRANSITION_BACKWARD = '주문 상태는 되돌릴 수 없어요.';
const TRANSITION_UNPAID = '입금이 확인되지 않아 배송 단계로 넘길 수 없어요.';
const CANCEL_SHIPPED = '배송이 시작된 주문은 취소할 수 없어요. 교환/반품으로 접수해 주세요.';
const CANCEL_DONE = '이미 취소된 주문이에요.';

/** 재고를 언제 빼는가 — 카페24가 실제로 갖는 스위치. 이 픽스처의 설정은 '입금 확인 시' 다 */
const STOCK_DEDUCT_LABEL = '입금 확인 시';

/* ── 데모 데이터(실화면 _shared/store 의 ORDER_SEED 를 상세가 쓰는 필드까지 미러) ─────────────── */

interface DemoLine {
  readonly id: string;
  readonly productName: string;
  readonly sku: string;
  readonly optionLabel: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly shippedQuantity: number;
  /** 주문 시점의 적립률(%, 스냅숏) — 적립금 정책을 바꿔도 지난 주문의 적립액은 그대로다 */
  readonly pointRate: number;
}

interface DemoEvent {
  readonly id: string;
  readonly at: string;
  readonly kind: OrderEventKind;
  readonly label: string;
  readonly actor: string;
  readonly note: string;
}

interface DemoOrder {
  readonly id: string;
  readonly orderedAt: string;
  readonly status: OrderStatus;
  readonly customer: {
    readonly name: string;
    readonly phone: string;
    readonly email: string;
    /** 회원 id — 비회원 주문이면 ''(링크할 회원 상세가 없다) */
    readonly memberId: string;
  };
  readonly receiver: {
    readonly name: string;
    readonly phone: string;
    readonly zipCode: string;
    readonly address: string;
    readonly addressDetail: string;
    readonly request: string;
  };
  readonly lines: readonly DemoLine[];
  readonly method: PaymentMethod;
  readonly shippingFee: number;
  readonly discount: number;
  readonly couponDiscount: number;
  readonly couponName: string;
  readonly pointUsed: number;
  readonly paidAt: string;
  readonly canceledAt: string;
  readonly cancelReason: string;
  /** 재고 차감 시각 ISO — '' 면 미차감. 재차감을 막는 멱등 키다 */
  readonly stockAppliedAt: string;
  readonly stockRestoredAt: string;
  readonly history: readonly DemoEvent[];
  readonly adminNote: string;
}

/** 정상 처리 중인 주문 — 결제 완료 · 배송준비중 · 쿠폰과 적립금을 함께 쓴 두 품목 주문 */
const PREPARING_ORDER: DemoOrder = {
  id: 'ORD-20260720-0002',
  orderedAt: '2026-07-20T05:02:00.000Z',
  status: 'preparing',
  customer: {
    name: '오세린',
    phone: '010-2295-6614',
    email: 'serin.o@example.com',
    memberId: 'mem-2',
  },
  receiver: {
    name: '오세린',
    phone: '010-2295-6614',
    zipCode: '13529',
    address: '경기도 성남시 분당구 판교역로 235',
    addressDetail: 'H스퀘어 N동 5층',
    request: '',
  },
  lines: [
    {
      id: 'ln-1',
      productName: '오브제 미니멀 크로스백',
      sku: 'OBJ-BAG-338',
      optionLabel: '단일 상품',
      unitPrice: 38250,
      quantity: 1,
      shippedQuantity: 0,
      pointRate: 0,
    },
    {
      id: 'ln-2',
      productName: '노바 베이직 코튼 티셔츠',
      sku: 'NVA-TEE-014-네이비',
      optionLabel: '네이비',
      unitPrice: 19900,
      quantity: 1,
      shippedQuantity: 0,
      pointRate: 1,
    },
  ],
  method: 'card',
  shippingFee: 0,
  discount: 0,
  couponDiscount: 5000,
  couponName: '여름맞이 5천원 할인',
  pointUsed: 1000,
  paidAt: '2026-07-20T05:03:00.000Z',
  canceledAt: '',
  cancelReason: '',
  stockAppliedAt: '2026-07-20T05:03:00.000Z',
  stockRestoredAt: '',
  history: [
    {
      id: 'evt-1',
      at: '2026-07-20T05:02:00.000Z',
      kind: 'order',
      label: '주문 접수',
      actor: '고객',
      note: '',
    },
    {
      id: 'evt-2',
      at: '2026-07-20T05:03:00.000Z',
      kind: 'payment',
      label: '결제 완료',
      actor: '고객',
      note: '신용·체크카드',
    },
    {
      id: 'evt-3',
      at: '2026-07-20T05:03:00.000Z',
      kind: 'stock',
      label: '재고 차감',
      actor: '시스템',
      note: 'OBJ-BAG-338 1개, NVA-TEE-014-네이비 1개',
    },
    {
      id: 'evt-4',
      at: '2026-07-20T06:10:00.000Z',
      kind: 'status',
      label: '입금전 → 배송준비중',
      actor: '운영자',
      note: '',
    },
  ],
  adminNote: '',
};

/** 입금 전 — 가상계좌 발급만 된 주문. 배송 단계로 넘기는 길이 술어에서 막힌다 */
const UNPAID_ORDER: DemoOrder = {
  id: 'ORD-20260721-0001',
  orderedAt: '2026-07-21T02:14:00.000Z',
  status: 'pending',
  customer: {
    name: '한지우',
    phone: '010-4417-2280',
    email: 'jiwoo.h@example.com',
    // 비회원 주문 — 회원 상세로 갈 곳이 없다
    memberId: '',
  },
  receiver: {
    name: '한지우',
    phone: '010-4417-2280',
    zipCode: '06236',
    address: '서울특별시 강남구 테헤란로 132',
    addressDetail: '9층 902호',
    request: '부재 시 경비실에 맡겨 주세요.',
  },
  lines: [
    {
      id: 'ln-1',
      productName: '카밀 워시드 데님 팬츠',
      sku: 'CML-DNM-051-30',
      optionLabel: '30',
      unitPrice: 59000,
      quantity: 1,
      shippedQuantity: 0,
      pointRate: 1,
    },
  ],
  method: 'vbank',
  shippingFee: 3000,
  discount: 0,
  couponDiscount: 0,
  couponName: '',
  pointUsed: 0,
  paidAt: '',
  canceledAt: '',
  cancelReason: '',
  stockAppliedAt: '',
  stockRestoredAt: '',
  history: [
    {
      id: 'evt-1',
      at: '2026-07-21T02:14:00.000Z',
      kind: 'order',
      label: '주문 접수',
      actor: '고객',
      note: '가상계좌 발급',
    },
  ],
  adminNote: '',
};

/** 부분배송 — 패딩만 먼저 나갔고 티셔츠 2개는 아직 창고에 있다. 배송중이라 취소는 막힌다 */
const PARTIAL_ORDER: DemoOrder = {
  id: 'ORD-20260712-0031',
  orderedAt: '2026-07-12T03:18:00.000Z',
  status: 'shipping',
  customer: {
    name: '김서연',
    phone: '010-2481-7735',
    email: 'seoyeon.k@example.com',
    memberId: 'mem-1',
  },
  receiver: {
    name: '김서연',
    phone: '010-2481-7735',
    zipCode: '04524',
    address: '서울특별시 중구 세종대로 110',
    addressDetail: '5층',
    request: '문 앞에 놓아 주세요.',
  },
  lines: [
    {
      id: 'ln-1',
      productName: '루미엔 경량 패딩 점퍼',
      sku: 'LMN-PAD-001-블랙-M',
      optionLabel: '블랙 / M',
      unitPrice: 103200,
      quantity: 1,
      shippedQuantity: 1,
      pointRate: 2,
    },
    {
      id: 'ln-2',
      productName: '노바 베이직 코튼 티셔츠',
      sku: 'NVA-TEE-014-화이트',
      optionLabel: '화이트',
      unitPrice: 19900,
      quantity: 2,
      shippedQuantity: 0,
      pointRate: 1,
    },
  ],
  method: 'card',
  shippingFee: 0,
  discount: 0,
  couponDiscount: 0,
  couponName: '',
  pointUsed: 0,
  paidAt: '2026-07-12T03:19:00.000Z',
  canceledAt: '',
  cancelReason: '',
  stockAppliedAt: '2026-07-12T03:19:00.000Z',
  stockRestoredAt: '',
  history: [
    {
      id: 'evt-1',
      at: '2026-07-12T03:18:00.000Z',
      kind: 'order',
      label: '주문 접수',
      actor: '고객',
      note: '',
    },
    {
      id: 'evt-2',
      at: '2026-07-12T03:19:00.000Z',
      kind: 'payment',
      label: '결제 완료',
      actor: '고객',
      note: '신용·체크카드',
    },
    {
      id: 'evt-3',
      at: '2026-07-13T01:00:00.000Z',
      kind: 'status',
      label: '입금전 → 배송중',
      actor: '운영자',
      note: '패딩 1건 선출고(부분배송)',
    },
  ],
  adminNote: '티셔츠 재입고 후 분할 발송 예정.',
};

/** 취소된 주문 — 상태는 그대로 두고 취소 사실만 얹혔다. 전이 버튼이 하나도 서지 않는다 */
const CANCELED_ORDER: DemoOrder = {
  id: 'ORD-20260719-0003',
  orderedAt: '2026-07-19T08:41:00.000Z',
  status: 'pending',
  customer: {
    name: '배승호',
    phone: '010-7702-3318',
    email: 'seungho.b@example.com',
    memberId: '',
  },
  receiver: {
    name: '배승호',
    phone: '010-7702-3318',
    zipCode: '48058',
    address: '부산광역시 해운대구 센텀중앙로 79',
    addressDetail: '1203호',
    request: '',
  },
  lines: [
    {
      id: 'ln-1',
      productName: '루미엔 경량 패딩 점퍼',
      sku: 'LMN-PAD-001-베이지-M',
      optionLabel: '베이지 / M',
      unitPrice: 103200,
      quantity: 1,
      shippedQuantity: 0,
      pointRate: 2,
    },
  ],
  method: 'transfer',
  shippingFee: 0,
  discount: 0,
  couponDiscount: 0,
  couponName: '',
  pointUsed: 0,
  paidAt: '',
  canceledAt: '2026-07-19T23:12:00.000Z',
  cancelReason: '고객 요청 — 다른 색상으로 다시 주문 예정',
  // 입금 전에 멈춘 주문이라 재고는 애초에 빠지지 않았다 — 되돌릴 것도 없다
  stockAppliedAt: '',
  stockRestoredAt: '',
  history: [
    {
      id: 'evt-1',
      at: '2026-07-19T08:41:00.000Z',
      kind: 'order',
      label: '주문 접수',
      actor: '고객',
      note: '',
    },
    {
      id: 'evt-2',
      at: '2026-07-19T23:12:00.000Z',
      kind: 'cancel',
      label: '주문 취소',
      actor: '운영자',
      note: '고객 요청 — 다른 색상으로 다시 주문 예정',
    },
  ],
  adminNote: '입금 전 취소라 환불 처리 없음.',
};

/* ── 순수 규칙(실화면 도메인 미러 — 화면이 각자 다시 세지 않는다) ────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** ISO → 'YYYY-MM-DD HH:mm'. 문자열을 자른다 — 뷰어의 표준시가 스토리를 흔들지 않게 한다 */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

const isCanceled = (order: DemoOrder): boolean => order.canceledAt !== '';

const lineAmount = (line: DemoLine): number => line.unitPrice * line.quantity;
/** 품목 1행의 적립 예정액 — 원 단위 미만은 버린다(지급하지 않는 소수점을 표시하지 않는다) */
const linePoint = (line: DemoLine): number => Math.floor((lineAmount(line) * line.pointRate) / 100);

interface OrderAmounts {
  readonly itemsTotal: number;
  readonly shippingFee: number;
  readonly discount: number;
  readonly couponDiscount: number;
  readonly pointUsed: number;
  readonly total: number;
  readonly point: number;
}

/** 금액 계산의 **유일한 자리** — 합계는 저장하지 않고 입력에서 매번 만든다 */
function orderAmounts(order: DemoOrder): OrderAmounts {
  const itemsTotal = order.lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const point = order.lines.reduce((sum, line) => sum + linePoint(line), 0);
  return {
    itemsTotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    couponDiscount: order.couponDiscount,
    pointUsed: order.pointUsed,
    total: Math.max(
      0,
      itemsTotal + order.shippingFee - order.discount - order.couponDiscount - order.pointUsed,
    ),
    point,
  };
}

function partialShipmentLabel(order: DemoOrder): string | null {
  const shipped = order.lines.reduce((sum, line) => sum + line.shippedQuantity, 0);
  const total = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  if (shipped <= 0 || shipped >= total) return null;
  return `부분배송 ${fmt(shipped)}/${fmt(total)}`;
}

function statusIndex(status: OrderStatus): number {
  const index = ORDER_STATUS_SEQUENCE.indexOf(status);
  return index === -1 ? ORDER_STATUS_SEQUENCE.length : index;
}

/** 배송이 이미 떠났는가 — 취소와 반품을 가르는 선 */
const hasLeftWarehouse = (status: OrderStatus): boolean =>
  statusIndex(status) >= statusIndex('shipping');

/** 이 주문을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null(사유 문자열을 화면이 그대로 쓴다) */
function transitionBlock(order: DemoOrder, to: OrderStatus): string | null {
  if (isCanceled(order)) return TRANSITION_CANCELED;
  if (order.status === 'confirmed') return TRANSITION_CONFIRMED;
  if (statusIndex(to) <= statusIndex(order.status)) return TRANSITION_BACKWARD;
  if (order.status === 'pending' && order.paidAt === '') return TRANSITION_UNPAID;
  return null;
}

/** 지금 이 주문이 갈 수 있는 다음 상태들 — 이 목록이 곧 버튼 목록이다 */
function nextOrderStatuses(order: DemoOrder): readonly OrderStatus[] {
  return ORDER_STATUS_SEQUENCE.filter((status) => transitionBlock(order, status) === null);
}

/** 취소할 수 없는 이유 — 취소할 수 있으면 null */
function cancelBlock(order: DemoOrder): string | null {
  if (isCanceled(order)) return CANCEL_DONE;
  if (hasLeftWarehouse(order.status)) return CANCEL_SHIPPED;
  return null;
}

/** 도메인 사건 → DS Timeline 이 아는 모양. 옮기는 자리는 여기 하나다 */
function toTimelineEvents(order: DemoOrder): TimelineProps['events'] {
  return order.history.map((event) => ({
    id: event.id,
    at: event.at,
    badgeTone: EVENT_TONE[event.kind],
    badgeLabel: event.label,
    author: event.actor,
    text: event.note,
  }));
}

/** 취소 사유 검증 — 사유 없는 취소는 '왜 취소됐나' 에 답할 수 없는 기록이다 */
function cancelReasonError(value: string): string | null {
  if (value.trim() === '') return '취소 사유를 입력하세요.';
  if (value.trim().length > ORDER_CANCEL_REASON_MAX) {
    return `취소 사유는 ${fmt(ORDER_CANCEL_REASON_MAX)}자를 넘을 수 없어요.`;
  }
  return null;
}

/* ── 표 열 정의 ───────────────────────────────────────────────────────────────────────────── */

const LINE_COLUMNS: TableProps['columns'] = [
  { id: 'product', header: '상품' },
  { id: 'option', header: '옵션', nowrap: true },
  { id: 'sku', header: 'SKU', nowrap: true },
  { id: 'quantity', header: '수량', align: 'end', nowrap: true },
  { id: 'shipped', header: '출고', align: 'end', nowrap: true },
  { id: 'unitPrice', header: '단가', align: 'end', nowrap: true },
  { id: 'amount', header: '금액', align: 'end', nowrap: true },
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

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 정의 목록 — 라벨 고정 폭 / 값은 남는 폭 (실화면 dlStyle 미러) */
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

/** 최종 결제금액 줄 — 다른 값보다 굵게. 운영자가 가장 먼저 찾는 숫자다 */
const totalValueStyle: CSSProperties = {
  ...ddStyle,
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const spreadActionsStyle: CSSProperties = {
  ...actionsStyle,
  justifyContent: 'space-between',
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

type PendingAction =
  { readonly kind: 'status'; readonly to: OrderStatus } | { readonly kind: 'paid' };

interface OrderDetailScreenProps {
  readonly order?: DemoOrder;
  /** 상세 조회 중 — 실화면은 카드 하나에 '불러오는 중…' 만 남긴다 */
  readonly loading?: boolean;
  /** 처리 권한이 없는 역할 — 전이·취소·메모 저장 컨트롤 자체를 그리지 않는다 (EXC-03) */
  readonly canUpdate?: boolean;
}

function OrderDetailScreen({
  order = PREPARING_ORDER,
  loading = false,
  canUpdate = true,
}: OrderDetailScreenProps) {
  const [note, setNote] = useState(order.adminNote);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTouched, setCancelTouched] = useState(false);

  if (loading) {
    return (
      <div style={pageStyle}>
        <a href="#orders" style={backLinkStyle}>
          <Icon name="chevron-left" />
          목록으로
        </a>
        <Card>
          <p style={hintStyle}>주문을 불러오는 중…</p>
        </Card>
      </div>
    );
  }

  const amounts = orderAmounts(order);
  const canceled = isCanceled(order);
  const partial = partialShipmentLabel(order);
  const nextStatuses = nextOrderStatuses(order);
  const cancelBlocked = cancelBlock(order);
  const unpaid = order.paidAt === '';
  // 다음 단계가 없을 때 **왜 없는지** — 술어가 만든 문장을 그대로 쓴다(화면이 지어내지 않는다)
  const stuckReason = nextStatuses.length === 0 ? transitionBlock(order, 'confirmed') : null;
  const noteDirty = note !== order.adminNote;
  const cancelError = cancelReasonError(cancelReason);

  const lineRows: TableProps['rows'] = order.lines.map((line) => ({
    id: line.id,
    // 아직 다 나가지 않은 줄에 색조를 얹는다 — 뜻은 '출고' 칸의 숫자가 전한다
    ...(line.shippedQuantity < line.quantity ? { tone: 'warning' as const } : {}),
    cells: [
      <span key="product">{line.productName}</span>,
      <span key="option">{line.optionLabel}</span>,
      <span key="sku">{line.sku}</span>,
      <span key="quantity">{`${fmt(line.quantity)}개`}</span>,
      <span key="shipped">{`${fmt(line.shippedQuantity)}개`}</span>,
      <span key="unitPrice">{`${fmt(line.unitPrice)}원`}</span>,
      <span key="amount">{`${fmt(lineAmount(line))}원`}</span>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <a href="#orders" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <h1 style={pageTitleStyle}>주문 상세</h1>

      <DetailCard
        title={order.id}
        badges={
          <span style={badgeRowStyle}>
            <StatusBadge
              tone={ORDER_STATUS_TONE[order.status]}
              label={ORDER_STATUS_LABEL[order.status]}
            />
            {canceled && <StatusBadge tone="danger" label="취소" />}
            {!canceled && partial !== null && <StatusBadge tone="warning" label={partial} />}
          </span>
        }
      >
        {canceled && (
          <Alert tone="warning">
            {`${formatDateTime(order.canceledAt)}에 취소된 주문이에요. 사유: ${order.cancelReason}`}
          </Alert>
        )}

        <dl style={dlStyle}>
          <dt style={dtStyle}>주문일시</dt>
          <dd style={ddStyle}>{formatDateTime(order.orderedAt)}</dd>
          <dt style={dtStyle}>입금·결제</dt>
          <dd style={ddStyle}>{unpaid ? '미확인' : formatDateTime(order.paidAt)}</dd>
          <dt style={dtStyle}>재고 차감</dt>
          {/* 차감 시점은 설정값이다 — 지금 규칙과 실제 결과를 나란히 보여야 '왜 아직 안 빠졌나' 에 답한다 */}
          <dd style={ddStyle}>
            {order.stockAppliedAt === ''
              ? `아직 차감되지 않았어요 (설정: ${STOCK_DEDUCT_LABEL})`
              : `${formatDateTime(order.stockAppliedAt)} 차감 (설정: ${STOCK_DEDUCT_LABEL})`}
          </dd>
          {order.stockRestoredAt !== '' && (
            <>
              <dt style={dtStyle}>재고 복원</dt>
              <dd style={ddStyle}>{`${formatDateTime(order.stockRestoredAt)} 복원`}</dd>
            </>
          )}
        </dl>

        {!canUpdate && <Alert tone="info">이 주문을 처리할 권한이 없어요. 조회만 가능해요.</Alert>}

        {canUpdate && (
          <div style={spreadActionsStyle}>
            <span style={actionsStyle}>
              {unpaid && !canceled && (
                <Button variant="primary" size="md" onClick={() => setPending({ kind: 'paid' })}>
                  입금 확인
                </Button>
              )}
              {nextStatuses.map((target, index) => (
                <Button
                  key={target}
                  // 바로 다음 단계가 기본 동작이다 — 나머지는 건너뛰는 예외 경로라 보조 버튼이다
                  variant={index === 0 && !unpaid ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => setPending({ kind: 'status', to: target })}
                >
                  {`${ORDER_STATUS_LABEL[target]} 처리`}
                </Button>
              ))}
              {stuckReason !== null && <p style={hintStyle}>{stuckReason}</p>}
            </span>

            <span style={actionsStyle}>
              {cancelBlocked === null ? (
                <Button variant="danger" size="md" onClick={() => setCancelOpen(true)}>
                  주문 취소
                </Button>
              ) : (
                // 취소할 수 없으면 비활성 버튼 대신 **이유**를 둔다 — 없는 버튼을 찾게 하지 않는다
                <p style={hintStyle}>{cancelBlocked}</p>
              )}
            </span>
          </div>
        )}
      </DetailCard>

      <DetailCard title="주문자 · 수령인">
        <dl style={dlStyle}>
          <dt style={dtStyle}>주문자</dt>
          <dd style={ddStyle}>{`${order.customer.name} · ${order.customer.phone}`}</dd>
          <dt style={dtStyle}>이메일</dt>
          <dd style={ddStyle}>{order.customer.email}</dd>
          <dt style={dtStyle}>회원 구분</dt>
          <dd style={ddStyle}>{order.customer.memberId === '' ? '비회원 주문' : '회원 주문'}</dd>
          <dt style={dtStyle}>수령인</dt>
          <dd style={ddStyle}>{`${order.receiver.name} · ${order.receiver.phone}`}</dd>
          <dt style={dtStyle}>배송지</dt>
          <dd style={ddStyle}>
            {`(${order.receiver.zipCode}) ${order.receiver.address} ${order.receiver.addressDetail}`.trim()}
          </dd>
          <dt style={dtStyle}>요청사항</dt>
          <dd style={ddStyle}>{order.receiver.request === '' ? '없음' : order.receiver.request}</dd>
        </dl>
      </DetailCard>

      <DetailCard title="주문 품목">
        {/* 값은 주문 시점의 스냅숏이다 — 상품을 고쳐도 이 표는 움직이지 않는다 */}
        <p style={hintStyle}>
          상품명·옵션·단가는 주문 시점에 복사된 값이에요. 상품을 수정해도 지난 주문의 금액은 바뀌지
          않아요.
        </p>
        <div style={tableScrollStyle}>
          <Table
            caption="주문 품목 — 주문 시점의 상품명·옵션·단가와 수량별 금액이에요."
            columns={LINE_COLUMNS}
            rows={lineRows}
            empty="주문 품목이 없어요."
          />
        </div>
        <p style={hintStyle}>
          {`적립 예정 ${fmt(amounts.point)}원 — 주문 시점의 적립률로 계산해요.`}
        </p>
      </DetailCard>

      <DetailCard title="결제 정보">
        <dl style={dlStyle}>
          <dt style={dtStyle}>결제수단</dt>
          <dd style={ddStyle}>{PAYMENT_METHOD_LABEL[order.method]}</dd>
          <dt style={dtStyle}>상품금액</dt>
          <dd style={ddStyle}>{`${fmt(amounts.itemsTotal)}원`}</dd>
          <dt style={dtStyle}>배송비</dt>
          <dd style={ddStyle}>
            {amounts.shippingFee === 0 ? '무료' : `${fmt(amounts.shippingFee)}원`}
          </dd>
          <dt style={dtStyle}>할인</dt>
          <dd style={ddStyle}>{`-${fmt(amounts.discount)}원`}</dd>
          <dt style={dtStyle}>쿠폰 할인</dt>
          <dd style={ddStyle}>
            {order.couponName === ''
              ? `-${fmt(amounts.couponDiscount)}원`
              : `-${fmt(amounts.couponDiscount)}원 (${order.couponName})`}
          </dd>
          <dt style={dtStyle}>적립금 사용</dt>
          <dd style={ddStyle}>{`-${fmt(amounts.pointUsed)}원`}</dd>
          <dt style={dtStyle}>최종 결제금액</dt>
          <dd style={totalValueStyle}>{`${fmt(amounts.total)}원`}</dd>
        </dl>
      </DetailCard>

      <DetailCard title="처리 이력">
        <Timeline
          events={toTimelineEvents(order)}
          label="주문 처리 이력"
          emptyLabel="기록된 처리 이력이 없어요."
        />
      </DetailCard>

      <DetailCard title="처리 메모">
        <TextareaField
          label="처리 메모"
          value={note}
          onChange={setNote}
          maxLength={ORDER_NOTE_MAX}
          disabled={!canUpdate}
          placeholder="배송 지연 사유, 고객 통화 내용 등 처리 내역을 기록하세요."
          rows={4}
        />
        {canUpdate && (
          <div style={actionsStyle}>
            <Button variant="primary" size="md" disabled={!noteDirty}>
              메모 저장
            </Button>
          </div>
        )}
      </DetailCard>

      {/* 되돌릴 수 없는 진행의 확인 창구 — 무엇이 일어나는지와 되돌릴 수 없다는 사실을 함께 밝힌다 */}
      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title={pending.kind === 'paid' ? '입금 확인' : `${ORDER_STATUS_LABEL[pending.to]} 처리`}
          message={
            pending.kind === 'paid'
              ? `입금을 확인 처리해요. 재고 차감 시점이 '${STOCK_DEDUCT_LABEL}'이면 이 시점에 재고가 빠지며, 되돌릴 수 없어요.`
              : `주문 ${order.id}을(를) ${ORDER_STATUS_LABEL[pending.to]}(으)로 진행해요. 주문 상태는 되돌릴 수 없어요.`
          }
          confirmLabel={pending.kind === 'paid' ? '입금 확인' : '진행'}
          onConfirm={() => setPending(null)}
          onCancel={() => setPending(null)}
        />
      )}

      {/* 취소는 사유를 받아야 해서 확인 다이얼로그가 아니라 모달이다 —
          사유 없는 취소는 '왜 취소됐나' 라는 질문에 답할 수 없는 기록이다. */}
      {cancelOpen && (
        <Modal
          title="주문 취소"
          icon={<Icon name="x-circle" />}
          onClose={() => {
            setCancelOpen(false);
            setCancelTouched(false);
          }}
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelTouched(false);
                }}
              >
                닫기
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  setCancelTouched(true);
                  if (cancelError === null) setCancelOpen(false);
                }}
              >
                주문 취소
              </Button>
            </>
          }
        >
          <p style={fieldLabelStyle}>
            {`주문 ${order.id}을(를) 취소해요. 취소는 되돌릴 수 없으며, 이미 차감된 재고는 자동으로 복원돼요.`}
          </p>
          <TextareaField
            label="취소 사유"
            value={cancelReason}
            onChange={setCancelReason}
            maxLength={ORDER_CANCEL_REASON_MAX}
            placeholder="고객 요청, 재고 소진 등 취소 사유를 남겨 주세요."
            rows={3}
            {...(cancelTouched && cancelError !== null ? { error: cancelError } : {})}
          />
        </Modal>
      )}
    </div>
  );
}

/** 정상: 결제 완료 · 배송준비중 — 다음 단계 버튼 넷(배송보류·배송대기·배송중·배송완료·구매확정) */
export const Default: Story = {
  render: () => <OrderDetailScreen />,
};

/**
 * 입금 전: 가상계좌 발급만 된 주문 — '입금 확인' 이 주 동작이고, 다음 단계 버튼은 하나도 서지 않는다
 * (입금이 확인되지 않아 배송 단계로 넘길 수 없다는 사유가 그 자리에 대신 선다).
 */
export const Unpaid: Story = {
  render: () => <OrderDetailScreen order={UNPAID_ORDER} />,
};

/** 부분배송: 두 품목 중 하나만 출고 — 상태 배지 옆 '부분배송 1/3' + 미출고 줄의 warning 색조 */
export const PartialShipment: Story = {
  render: () => <OrderDetailScreen order={PARTIAL_ORDER} />,
};

/** 취소됨: 상태는 그대로 두고 취소 사실만 얹혔다 — 전이 버튼 0개 + 취소 사유 배너 */
export const Canceled: Story = {
  render: () => <OrderDetailScreen order={CANCELED_ORDER} />,
};

/** 상세 조회 중: 카드 하나에 안내만 남는다(실화면과 같게 골격을 흉내 내지 않는다) */
export const Loading: Story = {
  render: () => <OrderDetailScreen loading />,
};
