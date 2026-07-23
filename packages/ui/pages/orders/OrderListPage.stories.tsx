/**
 * Design System/Templates/Orders/Order List — 주문 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/orders` → 메뉴 en = "Orders"(주문 관리), 화면 en = "Orders"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Orders 그룹의 `['/orders', '주문', 'Orders']`).
 *
 * 대응 실화면: apps/admin/src/pages/orders/OrderListPage.tsx (라우트 /orders) 와 그 하위 조립
 * (components/OrderTable.tsx · types.ts · _shared/store.ts).
 *
 * [왜 이런 구조인가 — 주문은 관리자가 만들지 않는다] 항목을 만드는 것은 고객의 결제다. 그래서 이
 * 화면에는 등록 버튼이 없고 삭제도 없다(거래 기록이다). 관리자가 하는 일은 둘뿐이라 화면도 둘로
 * 갈린다: **무엇이 어디에 고여 있는지 보는 것**(좌측 상태 필터의 건수)과 **여러 건을 골라 다음
 * 단계로 옮기는 것**(선택 바의 일괄 상태 처리).
 *
 * [취소는 상태가 아니라 나란한 축이다] 7단 상태(입금전→배송준비중→배송보류→배송대기→배송중→
 * 배송완료→구매확정)와 별개로 `canceledAt` 이 선다. 그래서 좌측 필터에서 '취소' 는 상태 항목들과
 * 나란히 서고, 표의 상태 칸은 상태 배지를 지우지 않은 채 옆에 '취소' 배지를 하나 더 세운다.
 * 부분 배송도 같은 어법이다 — 상태를 만들지 않고 '부분배송 1/3' 배지로 말한다.
 *
 * [전이 버튼은 거절 사유가 있으면 그리지 않는다] 일괄 처리 버튼은 **처리 가능한 건수**를 미리 세어
 * 글자에 싣고, 0 이면 누를 수 없다 — 30건을 골라 눌렀는데 28건이 조용히 거절당하는 일을 만들지
 * 않는다. 판정은 실화면 도메인의 orderTransitionBlock 을 미러한 순수 함수 하나가 한다.
 *
 * [결제가 꺼져 있으면 목록이 자라지 않는다] PG 를 쓰지 않는 설정에서는 스토어프론트의 '구매하기'
 * 가 '문의하기' 로 바뀐다 — 주문이 들어올 통로 자체가 없다. 그것은 '오늘 주문이 없다' 와 구조적으로
 * 다른 사실이라 빈 화면의 문구도 갈 곳도 다르다(PaymentOff 스토리).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   FilterRail/FilterPanel → aria-pressed 토글 버튼 목록 + 건수 Badge
 *   OrderTable            → DS Table(leading=선택·순번) + StatusBadge
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 주문 상태 필터        → aria-pressed 토글 버튼 목록 + Badge 건수 (실화면 FilterPanel)
 *   주문번호·주문자·상품명 검색 → SearchField
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   상태 · 취소 · 부분배송 배지  → StatusBadge ×3 (색만으로 말하지 않는다)
 *   선택 일괄 상태 처리 바      → SelectionBar + Button(secondary) ×4
 *   일괄 전이 확인             → ConfirmDialog(intent=update)
 *   목록 표                   → Table (leadingHead=선택+순번 · 취소 행은 tone='danger')
 *   빈 결과                   → Empty (검색 지우기)
 *   결제 미사용 빈 화면        → Alert(info) + 결제 설정·상품 문의 링크
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Orders/Order List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 shared/domain/order.ts 미러) ────────────────────────────────────────── */

type OrderStatus =
  'pending' | 'preparing' | 'holding' | 'waiting' | 'shipping' | 'delivered' | 'confirmed';

/** 흐르는 순서 = 표시 순서. 전이 가능 여부를 **이 배열의 인덱스**로 판정하므로 순서가 곧 규칙이다 */
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

/** 키를 다 적은 Record — 상태가 하나 늘면 컴파일이 막아 준다(`find ?? 기본값` 을 쓰지 않는 이유) */
const ORDER_STATUS_TONE: Readonly<Record<OrderStatus, StatusBadgeTone>> = {
  pending: 'warning',
  preparing: 'info',
  holding: 'danger',
  waiting: 'info',
  shipping: 'info',
  delivered: 'success',
  confirmed: 'neutral',
};

type PaymentMethod = 'card' | 'transfer' | 'vbank' | 'easypay';

const PAYMENT_METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: '신용·체크카드',
  transfer: '계좌이체',
  vbank: '가상계좌',
  easypay: '간편결제',
};

const STATUS_FILTER_ALL = 'all';
const STATUS_FILTER_CANCELED = 'canceled';
type OrderStatusFilter = typeof STATUS_FILTER_ALL | typeof STATUS_FILTER_CANCELED | OrderStatus;

/** 좌측 필터 항목 — 전체 · 상태 7종 · 취소. 상태 순서는 도메인의 흐름 순서를 그대로 따른다 */
const STATUS_FILTERS: readonly { readonly id: OrderStatusFilter; readonly label: string }[] = [
  { id: STATUS_FILTER_ALL, label: '전체' },
  ...ORDER_STATUS_SEQUENCE.map((status) => ({ id: status, label: ORDER_STATUS_LABEL[status] })),
  { id: STATUS_FILTER_CANCELED, label: '취소' },
];

/**
 * 목록 툴바가 제공하는 일괄 전이 대상.
 *
 * 7개 상태를 전부 열지 않는다: 입금전은 되돌아가는 방향이라 애초에 갈 수 없고, 구매확정은 고객의
 * 의사(또는 자동 확정)이지 운영자가 무더기로 찍을 일이 아니다.
 */
const BULK_TRANSITIONS: readonly OrderStatus[] = ['preparing', 'waiting', 'shipping', 'delivered'];

const TRANSITION_UNPAID = '입금이 확인되지 않아 배송 단계로 넘길 수 없어요.';

/* ── 데모 데이터(실화면 _shared/store 의 ORDER_SEED 를 목록이 쓰는 필드만 축약해 미러) ────────── */

interface DemoLine {
  readonly id: string;
  readonly productName: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly shippedQuantity: number;
}

interface DemoOrder {
  readonly id: string;
  readonly orderedAt: string;
  readonly status: OrderStatus;
  readonly customerName: string;
  readonly lines: readonly DemoLine[];
  readonly method: PaymentMethod;
  readonly shippingFee: number;
  readonly discount: number;
  readonly couponDiscount: number;
  readonly pointUsed: number;
  /** 입금·결제 확인 시각 ISO — '' 면 아직 돈이 들어오지 않았다 */
  readonly paidAt: string;
  /** 취소 시각 ISO — '' 면 취소되지 않았다. **상태가 아니라 나란한 사실이다** */
  readonly canceledAt: string;
}

const DEMO_ORDERS: readonly DemoOrder[] = [
  {
    id: 'ORD-20260721-0001',
    orderedAt: '2026-07-21T02:14:00.000Z',
    status: 'pending',
    customerName: '한지우',
    lines: [
      {
        id: 'ln-1',
        productName: '카밀 워시드 데님 팬츠',
        unitPrice: 59000,
        quantity: 1,
        shippedQuantity: 0,
      },
    ],
    method: 'vbank',
    shippingFee: 3000,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '',
    canceledAt: '',
  },
  {
    id: 'ORD-20260720-0002',
    orderedAt: '2026-07-20T05:02:00.000Z',
    status: 'preparing',
    customerName: '오세린',
    lines: [
      {
        id: 'ln-1',
        productName: '오브제 미니멀 크로스백',
        unitPrice: 38250,
        quantity: 1,
        shippedQuantity: 0,
      },
      {
        id: 'ln-2',
        productName: '노바 베이직 코튼 티셔츠',
        unitPrice: 19900,
        quantity: 1,
        shippedQuantity: 0,
      },
    ],
    method: 'card',
    shippingFee: 0,
    discount: 0,
    couponDiscount: 5000,
    pointUsed: 1000,
    paidAt: '2026-07-20T05:03:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260719-0003',
    orderedAt: '2026-07-19T08:41:00.000Z',
    status: 'pending',
    customerName: '배승호',
    lines: [
      {
        id: 'ln-1',
        productName: '루미엔 경량 패딩 점퍼',
        unitPrice: 103200,
        quantity: 1,
        shippedQuantity: 0,
      },
    ],
    method: 'transfer',
    shippingFee: 0,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '',
    // 입금 전에 멈춘 주문 — 취소는 상태를 덮지 않고 나란히 선다
    canceledAt: '2026-07-19T23:12:00.000Z',
  },
  {
    id: 'ORD-20260718-0004',
    orderedAt: '2026-07-18T01:30:00.000Z',
    status: 'holding',
    customerName: '문가온',
    lines: [
      {
        id: 'ln-1',
        productName: '루미엔 경량 패딩 점퍼',
        unitPrice: 103200,
        quantity: 1,
        shippedQuantity: 0,
      },
    ],
    method: 'transfer',
    shippingFee: 0,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '2026-07-18T04:22:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260716-0005',
    orderedAt: '2026-07-16T07:05:00.000Z',
    status: 'waiting',
    customerName: '서다인',
    lines: [
      {
        id: 'ln-1',
        productName: '테라 스니커즈 데일리',
        unitPrice: 79000,
        quantity: 1,
        shippedQuantity: 0,
      },
    ],
    method: 'easypay',
    shippingFee: 0,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 3000,
    paidAt: '2026-07-16T07:06:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260712-0031',
    orderedAt: '2026-07-12T03:18:00.000Z',
    status: 'shipping',
    customerName: '김서연',
    // 부분배송 — 패딩만 먼저 나갔고 티셔츠 2개는 아직 창고에 있다
    lines: [
      {
        id: 'ln-1',
        productName: '루미엔 경량 패딩 점퍼',
        unitPrice: 103200,
        quantity: 1,
        shippedQuantity: 1,
      },
      {
        id: 'ln-2',
        productName: '노바 베이직 코튼 티셔츠',
        unitPrice: 19900,
        quantity: 2,
        shippedQuantity: 0,
      },
    ],
    method: 'card',
    shippingFee: 0,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '2026-07-12T03:19:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260710-0148',
    orderedAt: '2026-07-10T00:44:00.000Z',
    status: 'delivered',
    customerName: '박지훈',
    lines: [
      {
        id: 'ln-1',
        productName: '테라 스니커즈 데일리',
        unitPrice: 79000,
        quantity: 1,
        shippedQuantity: 1,
      },
    ],
    method: 'card',
    shippingFee: 0,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '2026-07-10T00:45:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260708-0092',
    orderedAt: '2026-07-08T06:12:00.000Z',
    status: 'confirmed',
    customerName: '이하늘',
    lines: [
      {
        id: 'ln-1',
        productName: '노바 베이직 코튼 티셔츠',
        unitPrice: 19900,
        quantity: 2,
        shippedQuantity: 2,
      },
    ],
    method: 'transfer',
    shippingFee: 3000,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '2026-07-08T09:30:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260705-0210',
    orderedAt: '2026-07-05T02:50:00.000Z',
    status: 'delivered',
    customerName: '최유진',
    lines: [
      {
        id: 'ln-1',
        productName: '오브제 미니멀 크로스백',
        unitPrice: 38250,
        quantity: 1,
        shippedQuantity: 1,
      },
    ],
    method: 'card',
    shippingFee: 3000,
    discount: 0,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '2026-07-05T02:51:00.000Z',
    canceledAt: '',
  },
  {
    id: 'ORD-20260703-0177',
    orderedAt: '2026-07-03T08:05:00.000Z',
    status: 'confirmed',
    customerName: '정민우',
    lines: [
      {
        id: 'ln-1',
        productName: '카밀 워시드 데님 팬츠',
        unitPrice: 59000,
        quantity: 1,
        shippedQuantity: 1,
      },
    ],
    method: 'card',
    shippingFee: 0,
    discount: 3000,
    couponDiscount: 0,
    pointUsed: 0,
    paidAt: '2026-07-03T08:06:00.000Z',
    canceledAt: '',
  },
];

/* ── 순수 규칙(실화면 도메인 미러 — 화면이 각자 다시 세지 않는다) ────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/**
 * ISO → 'YYYY-MM-DD HH:mm'.
 *
 * Date 로 되살리지 않고 문자열을 자른다 — 뷰어의 표준시가 스토리 스냅숏을 흔들지 않게 한다.
 */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

const isCanceled = (order: DemoOrder): boolean => order.canceledAt !== '';

/** 최종 결제금액 — 계산의 정본은 이 함수 하나다(화면은 더하지 않는다) */
function orderTotal(order: DemoOrder): number {
  const itemsTotal = order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return Math.max(
    0,
    itemsTotal + order.shippingFee - order.discount - order.couponDiscount - order.pointUsed,
  );
}

/** 목록의 상품 열 — '루미엔 경량 패딩 점퍼 외 2건'. 전부는 상세가 보여 준다 */
function orderLinesSummary(order: DemoOrder): string {
  const [first] = order.lines;
  if (first === undefined) return '품목 없음';
  const rest = order.lines.length - 1;
  return rest === 0 ? first.productName : `${first.productName} 외 ${fmt(rest)}건`;
}

/** 부분배송 표기 — 부분배송이 아니면 null(붙일 배지가 없다) */
function partialShipmentLabel(order: DemoOrder): string | null {
  const shipped = order.lines.reduce((sum, line) => sum + line.shippedQuantity, 0);
  const total = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  if (shipped <= 0 || shipped >= total) return null;
  return `부분배송 ${fmt(shipped)}/${fmt(total)}`;
}

function statusIndex(status: OrderStatus): number {
  const index = ORDER_STATUS_SEQUENCE.indexOf(status);
  // 모르는 값은 −1 이 아니라 **끝 다음**으로 본다 — 어떤 전이도 허용하지 않는 쪽으로 수렴한다
  return index === -1 ? ORDER_STATUS_SEQUENCE.length : index;
}

/**
 * 이 주문을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null.
 *
 * 문자열을 돌려주는 이유: 화면이 비활성 버튼 옆에 **왜 못 누르는지**를 그대로 쓸 수 있어야 한다.
 */
function transitionBlock(order: DemoOrder, to: OrderStatus): string | null {
  if (isCanceled(order)) return '취소된 주문은 상태를 바꿀 수 없어요.';
  if (order.status === 'confirmed') return '구매확정된 주문은 더 이상 진행할 단계가 없어요.';
  if (statusIndex(to) <= statusIndex(order.status)) return '주문 상태는 되돌릴 수 없어요.';
  if (order.status === 'pending' && order.paidAt === '') return TRANSITION_UNPAID;
  return null;
}

/** 선택한 주문 중 이 전이를 **실제로 받을 수 있는** 것들 — 버튼 글자의 건수가 여기서 나온다 */
function eligibleForTransition(
  orders: readonly DemoOrder[],
  to: OrderStatus,
): readonly DemoOrder[] {
  return orders.filter((order) => transitionBlock(order, to) === null);
}

/** 좌측 필터의 건수 배지 — **필터 이전** 전체 집합에서 센다(키를 다 적은 Record) */
const STATUS_COUNTS: Readonly<Record<OrderStatusFilter, number>> = (() => {
  const counts: Record<OrderStatusFilter, number> = {
    [STATUS_FILTER_ALL]: DEMO_ORDERS.length,
    [STATUS_FILTER_CANCELED]: 0,
    pending: 0,
    preparing: 0,
    holding: 0,
    waiting: 0,
    shipping: 0,
    delivered: 0,
    confirmed: 0,
  };
  for (const order of DEMO_ORDERS) {
    if (isCanceled(order)) counts[STATUS_FILTER_CANCELED] += 1;
    else counts[order.status] += 1;
  }
  return counts;
})();

/**
 * 상태 필터 적용 — 취소된 주문은 **상태 필터에서 빠진다**.
 *
 * '배송준비중' 을 고른 운영자가 보려는 것은 지금 준비해야 할 주문이고, 취소된 건이 섞이면 그
 * 목록의 건수가 곧 할 일의 양이 아니게 된다.
 */
function filterByStatus(
  list: readonly DemoOrder[],
  filter: OrderStatusFilter,
): readonly DemoOrder[] {
  if (filter === STATUS_FILTER_ALL) return list;
  if (filter === STATUS_FILTER_CANCELED) return list.filter((order) => isCanceled(order));
  return list.filter((order) => !isCanceled(order) && order.status === filter);
}

function searchOrders(list: readonly DemoOrder[], keyword: string): readonly DemoOrder[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (order) =>
      order.id.toLowerCase().includes(needle) ||
      order.customerName.toLowerCase().includes(needle) ||
      order.lines.some((line) => line.productName.toLowerCase().includes(needle)),
  );
}

/* ── 표 열 정의(데이터 열 7개 — 선택·순번은 leading 으로 별도) ───────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'no', header: '주문번호', nowrap: true },
  { id: 'orderedAt', header: '주문일시', nowrap: true },
  { id: 'customer', header: '주문자', nowrap: true },
  { id: 'lines', header: '상품' },
  { id: 'method', header: '결제수단', nowrap: true },
  { id: 'total', header: '결제금액', align: 'end', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'orders-select-all';
const PAGE_SIZE = 10;

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

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다) */
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

const bulkActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 주문번호는 고객이 전화로 부르는 값이다 — 줄바꿈 없이 한 덩이로 읽힌다 */
const orderNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 상품 요약 — 열이 길어져 금액·상태를 밀어내지 않게 한 줄로 자른다 */
const linesStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

// info Alert(파란 surface) 안의 링크 — action.primary(blue.600)는 그 배경(blue.200) 위에서 3.64:1 로
// 미달(axe color-contrast)이다. 이 문맥의 링크는 그 surface 와 짝지어진 feedback.info.text(blue.800,
// 6.02:1)를 쓴다. '더 진한 텍스트 토큰으로 바꾼' 마크업 수정이며 밑줄로 링크임을 유지한다.
const alertInfoLinkStyle: CSSProperties = {
  color: cssVar('color.feedback.info.text'),
  textDecoration: 'underline',
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/* ── 좌측 필터 패널 조립(FilterPanel 미러: 제목 + 목록 + aria-pressed + 건수 Badge) ─────────── */

function StatusFilterPanel({
  value,
  onChange,
  counts,
}: {
  readonly value: OrderStatusFilter;
  readonly onChange: (next: OrderStatusFilter) => void;
  readonly counts: Readonly<Record<string, number>> | null;
}) {
  return (
    <nav aria-label="주문 상태 필터">
      <p style={filterHeadingStyle}>주문 상태</p>
      <ul style={filterListStyle}>
        {STATUS_FILTERS.map((option) => {
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

interface OrderListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading (재조회로는 덮지 않는다 · STATE-01) */
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialSelectedIds?: readonly string[];
  /**
   * 결제(PG)로 주문이 들어올 수 있는가 — false 면 목록이 자라지 않는다.
   * '오늘 0건' 과 구조적으로 다른 사실이라 빈 화면의 문구도 갈 곳도 다르다.
   */
  readonly canArrive?: boolean;
}

function OrderListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
  canArrive = true,
}: OrderListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<OrderStatusFilter>(STATUS_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [pendingTransition, setPendingTransition] = useState<OrderStatus | null>(null);

  /* 결제가 꺼져 있으면 들어온 주문 자체가 없다 — 필터·검색 이전의 원천이 비는 것이다.
     빈 배열 리터럴을 useMemo 밖에 두면 렌더마다 새 참조가 되므로 콜백 안에서 고른다. */
  const visible = useMemo(
    () => searchOrders(filterByStatus(canArrive ? DEMO_ORDERS : [], status), keyword),
    [canArrive, status, keyword],
  );

  const selection = tableSelectionState(visible, selectedIds);
  const selectedOrders = visible.filter((order) => selectedIds.has(order.id));
  const selectedCount = selectedOrders.length;
  const eligible =
    pendingTransition === null ? [] : eligibleForTransition(selectedOrders, pendingTransition);

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
      for (const order of visible) {
        if (checked) next.add(order.id);
        else next.delete(order.id);
      }
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((order, index) => {
    const canceled = isCanceled(order);
    const partial = partialShipmentLabel(order);
    return {
      id: order.id,
      selected: selectedIds.has(order.id),
      // 취소 행은 위험 색조 — 뜻은 상태 칸의 '취소' 배지가 전한다(색만으로 말하지 않는다)
      ...(canceled ? { tone: 'danger' as const } : {}),
      onActivate: () => {
        /* 실화면: 행 클릭 → 주문 상세(/orders/:id) */
      },
      leading: [
        <RowSelectCell
          key="select"
          id={order.id}
          label={`${order.id} 주문 선택`}
          checked={selectedIds.has(order.id)}
          onToggle={(checked) => toggleOne(order.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        <span key="no" style={orderNoStyle}>
          {order.id}
        </span>,
        <span key="orderedAt" style={orderNoStyle}>
          {formatDateTime(order.orderedAt)}
        </span>,
        <span key="customer">{order.customerName}</span>,
        <span key="lines" style={linesStyle}>
          {orderLinesSummary(order)}
        </span>,
        <span key="method">{PAYMENT_METHOD_LABEL[order.method]}</span>,
        <span key="total" style={orderNoStyle}>{`${fmt(orderTotal(order))}원`}</span>,
        <span key="status" style={badgeRowStyle}>
          <StatusBadge
            tone={ORDER_STATUS_TONE[order.status]}
            label={ORDER_STATUS_LABEL[order.status]}
          />
          {canceled && <StatusBadge tone="danger" label="취소" />}
          {!canceled && partial !== null && <StatusBadge tone="warning" label={partial} />}
        </span>,
      ],
    };
  });

  /* 왜 비었는가에 따라 답이 다르다 — 결제를 쓰지 않는 상태는 '결과 없음' 이 아니다(STATE-05 + 1) */
  const emptyNode =
    !canArrive && keyword.trim() === '' && status === STATUS_FILTER_ALL ? (
      <Alert tone="info">
        <div style={alertRowStyle}>
          <span>
            현재 결제를 사용하지 않아 주문이 들어오지 않아요. 지금 상품 페이지의 버튼은
            &lsquo;구매하기&rsquo; 대신 &lsquo;문의하기&rsquo;이며, 고객의 글은 상품 문의로
            접수돼요.
          </span>
          <a href="#payment-settings" style={alertInfoLinkStyle}>
            결제 설정 열기
          </a>
          <a href="#product-inquiries" style={alertInfoLinkStyle}>
            상품 문의 열기
          </a>
        </div>
      </Alert>
    ) : (
      <EmptyState
        label="주문"
        createVerb="접수"
        hasQuery={keyword.trim() !== ''}
        hasActiveFilters={status !== STATUS_FILTER_ALL}
        onClearSearch={() => setKeyword('')}
        onResetFilters={() => setStatus(STATUS_FILTER_ALL)}
      />
    );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>주문</h1>

      <div style={layoutStyle}>
        <aside style={railStyle}>
          <p style={railNoticeStyle}>
            주문은 고객의 결제로 만들어져요. 이 화면에서는 상태를 진행하고 취소·메모를 남겨요.
          </p>
          {!canArrive && (
            <p style={railNoticeStyle}>
              결제 설정이 꺼져 있어 새 주문이 들어오지 않아요.{' '}
              <a href="#payment-settings" style={linkStyle}>
                결제 설정
              </a>{' '}
              ·{' '}
              <a href="#product-inquiries" style={linkStyle}>
                상품 문의
              </a>
            </p>
          )}
          <StatusFilterPanel
            value={status}
            onChange={setStatus}
            counts={loading ? null : STATUS_COUNTS}
          />
        </aside>

        <div style={columnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                value={keyword}
                onChange={setKeyword}
                label="주문번호·주문자·상품명 검색"
                placeholder="주문번호 · 주문자 · 상품명 검색"
              />
            </span>
          </div>

          <p style={summaryStyle}>
            {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
            <span style={bulkActionsStyle}>
              {BULK_TRANSITIONS.map((target) => {
                const count = eligibleForTransition(selectedOrders, target).length;
                return (
                  <Button
                    key={target}
                    variant="secondary"
                    // 처리 가능한 건이 하나도 없으면 누를 수 없다 — 눌러 놓고 전부 거절당하지 않는다
                    disabled={count === 0}
                    onClick={() => setPendingTransition(target)}
                  >
                    {`${ORDER_STATUS_LABEL[target]} 처리 (${fmt(count)})`}
                  </Button>
                );
              })}
            </span>
          </SelectionBar>

          <div style={tableScrollStyle}>
            <Table
              caption="주문 목록 — 행을 누르면 주문 상세로 이동해요. 체크박스로 여러 건을 골라 상태를 한 번에 처리할 수 있어요."
              columns={COLUMNS}
              rows={rows}
              leadingHead={[
                <SelectAllHeaderCell
                  key="select-all"
                  label="이 페이지의 주문 전체 선택"
                  labelId={SELECT_ALL_LABEL_ID}
                  selection={selection}
                  onToggleAll={toggleAll}
                />,
                <SeqHeaderCell key="seq" />,
              ]}
              loading={loading}
              skeletonRows={PAGE_SIZE}
              empty={emptyNode}
            />
          </div>
        </div>
      </div>

      {/* 일괄 전이 확인 — 제외되는 건수와 그 이유를 함께 말한다. 상태 전이는 되돌릴 수 없다.
          intent='update' 인 이유: 이것은 삭제가 아니라 '진행' 이다. */}
      {pendingTransition !== null && (
        <ConfirmDialog
          intent="update"
          title={`${ORDER_STATUS_LABEL[pendingTransition]} 일괄 처리`}
          message={
            eligible.length === selectedCount
              ? `선택한 주문 ${fmt(selectedCount)}건을 ${ORDER_STATUS_LABEL[pendingTransition]}(으)로 진행해요. 주문 상태는 되돌릴 수 없어요.`
              : `선택한 ${fmt(selectedCount)}건 중 ${fmt(eligible.length)}건만 ${ORDER_STATUS_LABEL[pendingTransition]}(으)로 진행해요. 나머지 ${fmt(selectedCount - eligible.length)}건은 이미 지난 단계이거나, 취소되었거나, ${TRANSITION_UNPAID}`
          }
          confirmLabel={`${fmt(eligible.length)}건 처리`}
          onConfirm={() => {
            setPendingTransition(null);
            setSelectedIds(new Set());
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  );
}

/** 정상: 7단 상태가 고루 섞인 목록 — 취소 1건(danger 행 + 취소 배지)과 부분배송 1건이 함께 보인다 */
export const Default: Story = {
  render: () => <OrderListScreen />,
};

/** 최초 로드: 표 스켈레톤 + 좌측 건수 '—'(0 과 '모름' 은 다르다) — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <OrderListScreen loading />,
};

/** 선택됨: 세 건 선택 → 일괄 전이 버튼이 **처리 가능한 건수**를 글자에 싣는다(0 이면 비활성) */
export const Selection: Story = {
  render: () => (
    <OrderListScreen
      initialSelectedIds={['ORD-20260720-0002', 'ORD-20260718-0004', 'ORD-20260716-0005']}
    />
  ),
};

/** 빈 결과: 검색이 맞지 않음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화) */
export const Empty: Story = {
  render: () => <OrderListScreen initialKeyword="존재하지 않는 주문번호" />,
};

/**
 * 결제 미사용: 주문이 들어올 통로 자체가 없다 — '오늘 0건' 이 아니라 **구조적으로 다른 사실**이라
 * 빈 화면이 결제 설정과 상품 문의로 가는 길을 함께 준다.
 */
export const PaymentOff: Story = {
  render: () => <OrderListScreen canArrive={false} />,
};
