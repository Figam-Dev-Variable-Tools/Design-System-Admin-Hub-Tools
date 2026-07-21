// 주문 저장소 — 목록·상세가 공유하는 정본 픽스처 + 운영 설정(재고 차감 시점)
//
// [주문은 관리자가 만들지 않는다] 항목을 만드는 것은 **고객의 결제**다. 그래서 이 화면에는 등록
// 폼이 없고(화면 유형 E — 처리 워크플로), 저장소도 add 를 열지 않는다. 관리자가 하는 일은
// 상태를 앞으로 옮기고, 입금을 확인하고, 필요하면 취소하고, 메모를 남기는 것뿐이다.
//
// [결제(PG)가 꺼져 있으면 이 목록은 자라지 않는다] shared/commerce/payment-settings 의
// checkoutCta 가 'inquiry' 를 내는 동안 스토어프론트의 '구매하기' 는 '문의하기' 다 — 주문이
// 만들어질 통로 자체가 없고, 그 글은 상품 문의(/products/inquiries)로 들어간다. 목록 화면이
// 그 사실을 빈 결과와 구분해 말한다(OrderListPage).
//
// [픽스처는 다른 모듈과 같은 사건을 가리킨다] 교환/반품 요청 5건의 orderNo 가 아래 주문 5건과
// 같은 번호다(ORD-20260712-0031 …). 번호만 같은 것이 아니라 상품·옵션·수량·금액도 맞춰 두었다 —
// 반품 화면의 '79,000원 환불' 과 주문 상세의 결제금액이 어긋나면 둘 중 하나는 거짓말이고,
// 운영자는 어느 쪽이 사실인지 확인할 방법이 없다.
//
// [실명 없음] 인물·연락처·주소는 전부 가상이다.
import { checkoutCta, readPaymentSettings } from '../../../shared/commerce/payment-settings';
import { isStockDeductAt } from '../../../shared/domain/order';
import type { Order, StockDeductAt } from '../../../shared/domain/order';

/* ── 운영 설정 ────────────────────────────────────────────────────────────── */

/**
 * 재고 차감 시점의 기본값 — **입금 확인 시**.
 *
 * 주문 즉시로 시작하면 결제하지 않을 주문이 재고를 잠근 채 남는다. 판매를 여는 쪽이 아니라
 * 재고를 지키는 쪽이 기본값이어야 한다는 판단은 결제 설정이 PG 를 끈 채 출발하는 것과 같은 결이다
 * (payment-settings.ts 의 DEFAULT_PAYMENT_SETTINGS).
 */
export const DEFAULT_STOCK_DEDUCT_AT: StockDeductAt = 'payment';

let stockDeductAt: StockDeductAt = DEFAULT_STOCK_DEDUCT_AT;

// TODO(backend): GET /api/settings/orders · PUT /api/settings/orders { stockDeductAt }
//   차감 시점을 바꾸는 것은 **앞으로의 주문**에만 적용된다 — 이미 차감된 주문을 되돌리지 않는다
//   (되돌리면 창고에 없는 재고가 장부에 생긴다). 그래서 이 값은 주문에 저장되지 않고 설정으로 남는다.

/** 지금 저장된 차감 시점 — 어댑터가 쓰기 시점에 읽는다(설정을 바꾸면 다음 저장부터 새 규칙) */
export function readStockDeductAt(): StockDeductAt {
  return stockDeductAt;
}

/** 설정 저장이 성공한 뒤에만 부른다 */
export function writeStockDeductAt(next: StockDeductAt): void {
  stockDeductAt = next;
}

/** 문자열(select 값)을 받아 저장한다 — 모르는 값은 무시한다(잘못된 설정으로 좁혀지지 않는다) */
export function setStockDeductAtFromValue(value: string): void {
  if (isStockDeductAt(value)) stockDeductAt = value;
}

/** 초기 상태로 되돌린다 — 테스트가 서로의 저장을 물려받지 않게 한다 */
export function resetStockDeductAt(): void {
  stockDeductAt = DEFAULT_STOCK_DEDUCT_AT;
}

/**
 * 지금 새 주문이 들어올 수 있는가.
 *
 * 판단을 화면이 직접 하지 않는 이유: '구매하기인가 문의하기인가' 의 규칙은 결제 설정이 소유한다
 * (checkoutCta). 화면이 usePg 를 직접 읽어 다시 판단하면 상점 ID 가 비어 있는 경우를 놓친다.
 */
export function ordersCanArrive(): boolean {
  return checkoutCta(readPaymentSettings(), 'product').kind === 'purchase';
}

/* ── 픽스처 ───────────────────────────────────────────────────────────────── */

export const ORDER_SEED: readonly Order[] = [
  {
    id: 'ORD-20260721-0001',
    orderedAt: '2026-07-21T02:14:00.000Z',
    status: 'pending',
    customer: {
      name: '한지우',
      phone: '010-4417-2280',
      email: 'jiwoo.h@example.com',
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
        productId: 'prd-4',
        productName: '카밀 워시드 데님 팬츠',
        sku: 'CML-DNM-051-30',
        optionLabel: '30',
        unitPrice: 59000,
        quantity: 1,
        shippedQuantity: 0,
        pointRate: 1,
      },
    ],
    payment: {
      method: 'vbank',
      shippingFee: 3000,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '',
    stockRestoredAt: '',
    stockMovements: [],
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
  },
  {
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
        productId: 'prd-5',
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
        productId: 'prd-2',
        productName: '노바 베이직 코튼 티셔츠',
        sku: 'NVA-TEE-014-네이비',
        optionLabel: '네이비',
        unitPrice: 19900,
        quantity: 1,
        shippedQuantity: 0,
        pointRate: 1,
      },
    ],
    payment: {
      method: 'card',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 5000,
      couponName: '여름맞이 5천원 할인',
      pointUsed: 1000,
      paidAt: '2026-07-20T05:03:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-20T05:03:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord2-out-1',
        at: '2026-07-20T05:03:00.000Z',
        direction: 'out',
        sku: 'OBJ-BAG-338',
        optionLabel: '단일 상품',
        quantity: 1,
      },
      {
        id: 'mv-ord2-out-2',
        at: '2026-07-20T05:03:00.000Z',
        direction: 'out',
        sku: 'NVA-TEE-014-네이비',
        optionLabel: '네이비',
        quantity: 1,
      },
    ],
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
  },
  {
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
        productId: 'prd-1',
        productName: '루미엔 경량 패딩 점퍼',
        sku: 'LMN-PAD-001-베이지-M',
        optionLabel: '베이지 / M',
        unitPrice: 103200,
        quantity: 1,
        shippedQuantity: 0,
        pointRate: 2,
      },
    ],
    payment: {
      method: 'transfer',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '',
    },
    // 입금 전에 멈춘 주문이라 재고는 애초에 빠지지 않았다 — 되돌릴 것도 없다(stockRestoredAt 도 '')
    canceledAt: '2026-07-19T23:12:00.000Z',
    cancelReason: '고객 요청 — 다른 색상으로 다시 주문 예정',
    stockAppliedAt: '',
    stockRestoredAt: '',
    stockMovements: [],
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
  },
  {
    id: 'ORD-20260718-0004',
    orderedAt: '2026-07-18T01:30:00.000Z',
    status: 'holding',
    customer: {
      name: '문가온',
      phone: '010-5583-1147',
      email: 'gaon.m@example.com',
      memberId: 'mem-4',
    },
    receiver: {
      name: '문가온',
      phone: '010-5583-1147',
      zipCode: '34126',
      address: '대전광역시 유성구 대덕대로 512',
      addressDetail: '',
      request: '배송 전 연락 부탁드립니다.',
    },
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-1',
        productName: '루미엔 경량 패딩 점퍼',
        sku: 'LMN-PAD-001-차콜-L',
        optionLabel: '차콜 / L',
        unitPrice: 103200,
        quantity: 1,
        shippedQuantity: 0,
        pointRate: 2,
      },
    ],
    payment: {
      method: 'transfer',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-18T04:22:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-18T04:22:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord4-out-1',
        at: '2026-07-18T04:22:00.000Z',
        direction: 'out',
        sku: 'LMN-PAD-001-차콜-L',
        optionLabel: '차콜 / L',
        quantity: 1,
      },
    ],
    history: [
      {
        id: 'evt-1',
        at: '2026-07-18T01:30:00.000Z',
        kind: 'order',
        label: '주문 접수',
        actor: '고객',
        note: '',
      },
      {
        id: 'evt-2',
        at: '2026-07-18T04:22:00.000Z',
        kind: 'payment',
        label: '입금 확인',
        actor: '운영자',
        note: '계좌이체',
      },
      {
        id: 'evt-3',
        at: '2026-07-18T04:22:00.000Z',
        kind: 'stock',
        label: '재고 차감',
        actor: '시스템',
        note: 'LMN-PAD-001-차콜-L 1개',
      },
      {
        id: 'evt-4',
        at: '2026-07-18T05:40:00.000Z',
        kind: 'status',
        label: '입금전 → 배송보류',
        actor: '운영자',
        note: '수령 주소 확인 필요',
      },
    ],
    adminNote: '주소 상세가 비어 있어 연락 후 배송 예정.',
  },
  {
    id: 'ORD-20260716-0005',
    orderedAt: '2026-07-16T07:05:00.000Z',
    status: 'waiting',
    customer: {
      name: '서다인',
      phone: '010-3308-9925',
      email: 'dain.s@example.com',
      memberId: 'mem-5',
    },
    receiver: {
      name: '서다인',
      phone: '010-3308-9925',
      zipCode: '61947',
      address: '광주광역시 서구 상무중앙로 58',
      addressDetail: '302호',
      request: '',
    },
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-3',
        productName: '테라 스니커즈 데일리',
        sku: 'TRA-SNK-207-250',
        optionLabel: '250',
        unitPrice: 79000,
        quantity: 1,
        shippedQuantity: 0,
        pointRate: 2,
      },
    ],
    payment: {
      method: 'easypay',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 3000,
      paidAt: '2026-07-16T07:06:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-16T07:06:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord5-out-1',
        at: '2026-07-16T07:06:00.000Z',
        direction: 'out',
        sku: 'TRA-SNK-207-250',
        optionLabel: '250',
        quantity: 1,
      },
    ],
    history: [
      {
        id: 'evt-1',
        at: '2026-07-16T07:05:00.000Z',
        kind: 'order',
        label: '주문 접수',
        actor: '고객',
        note: '',
      },
      {
        id: 'evt-2',
        at: '2026-07-16T07:06:00.000Z',
        kind: 'payment',
        label: '결제 완료',
        actor: '고객',
        note: '간편결제',
      },
      {
        id: 'evt-3',
        at: '2026-07-16T07:06:00.000Z',
        kind: 'stock',
        label: '재고 차감',
        actor: '시스템',
        note: 'TRA-SNK-207-250 1개',
      },
      {
        id: 'evt-4',
        at: '2026-07-17T00:20:00.000Z',
        kind: 'status',
        label: '입금전 → 배송대기',
        actor: '운영자',
        note: '',
      },
    ],
    adminNote: '',
  },
  {
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
    // 부분배송 — 패딩만 먼저 나갔고 티셔츠는 아직 창고에 있다
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-1',
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
        productId: 'prd-2',
        productName: '노바 베이직 코튼 티셔츠',
        sku: 'NVA-TEE-014-화이트',
        optionLabel: '화이트',
        unitPrice: 19900,
        quantity: 2,
        shippedQuantity: 0,
        pointRate: 1,
      },
    ],
    payment: {
      method: 'card',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-12T03:19:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-12T03:19:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord31-out-1',
        at: '2026-07-12T03:19:00.000Z',
        direction: 'out',
        sku: 'LMN-PAD-001-블랙-M',
        optionLabel: '블랙 / M',
        quantity: 1,
      },
      {
        id: 'mv-ord31-out-2',
        at: '2026-07-12T03:19:00.000Z',
        direction: 'out',
        sku: 'NVA-TEE-014-화이트',
        optionLabel: '화이트',
        quantity: 2,
      },
    ],
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
  },
  {
    id: 'ORD-20260710-0148',
    orderedAt: '2026-07-10T00:44:00.000Z',
    status: 'delivered',
    customer: {
      name: '박지훈',
      phone: '010-6620-4471',
      email: 'jihoon.p@example.com',
      memberId: 'mem-3',
    },
    receiver: {
      name: '박지훈',
      phone: '010-6620-4471',
      zipCode: '21554',
      address: '인천광역시 남동구 예술로 152',
      addressDetail: '1801호',
      request: '',
    },
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-3',
        productName: '테라 스니커즈 데일리',
        sku: 'TRA-SNK-207-260',
        optionLabel: '260',
        unitPrice: 79000,
        quantity: 1,
        shippedQuantity: 1,
        pointRate: 2,
      },
    ],
    payment: {
      method: 'card',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-10T00:45:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-10T00:45:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord148-out-1',
        at: '2026-07-10T00:45:00.000Z',
        direction: 'out',
        sku: 'TRA-SNK-207-260',
        optionLabel: '260',
        quantity: 1,
      },
    ],
    history: [
      {
        id: 'evt-1',
        at: '2026-07-10T00:44:00.000Z',
        kind: 'order',
        label: '주문 접수',
        actor: '고객',
        note: '',
      },
      {
        id: 'evt-2',
        at: '2026-07-10T00:45:00.000Z',
        kind: 'payment',
        label: '결제 완료',
        actor: '고객',
        note: '신용·체크카드',
      },
      {
        id: 'evt-3',
        at: '2026-07-11T02:00:00.000Z',
        kind: 'status',
        label: '입금전 → 배송완료',
        actor: '운영자',
        note: '',
      },
    ],
    adminNote: '반품 접수됨(수거 진행 중).',
  },
  {
    id: 'ORD-20260708-0092',
    orderedAt: '2026-07-08T06:12:00.000Z',
    status: 'confirmed',
    customer: {
      name: '이하늘',
      phone: '010-8834-0217',
      email: 'haneul.l@example.com',
      memberId: 'mem-6',
    },
    receiver: {
      name: '이하늘',
      phone: '010-8834-0217',
      zipCode: '31169',
      address: '충청남도 천안시 서북구 불당대로 168',
      addressDetail: '502동 1104호',
      request: '',
    },
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-2',
        productName: '노바 베이직 코튼 티셔츠',
        sku: 'NVA-TEE-014-화이트',
        optionLabel: '화이트',
        unitPrice: 19900,
        quantity: 2,
        shippedQuantity: 2,
        pointRate: 1,
      },
    ],
    payment: {
      method: 'transfer',
      shippingFee: 3000,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-08T09:30:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-08T09:30:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord92-out-1',
        at: '2026-07-08T09:30:00.000Z',
        direction: 'out',
        sku: 'NVA-TEE-014-화이트',
        optionLabel: '화이트',
        quantity: 2,
      },
    ],
    history: [
      {
        id: 'evt-1',
        at: '2026-07-08T06:12:00.000Z',
        kind: 'order',
        label: '주문 접수',
        actor: '고객',
        note: '',
      },
      {
        id: 'evt-2',
        at: '2026-07-08T09:30:00.000Z',
        kind: 'payment',
        label: '입금 확인',
        actor: '운영자',
        note: '계좌이체',
      },
      {
        id: 'evt-3',
        at: '2026-07-09T01:10:00.000Z',
        kind: 'status',
        label: '입금전 → 배송완료',
        actor: '운영자',
        note: '',
      },
      {
        id: 'evt-4',
        at: '2026-07-14T00:00:00.000Z',
        kind: 'status',
        label: '배송완료 → 구매확정',
        actor: '시스템',
        note: '배송완료 5일 경과 자동 확정',
      },
    ],
    adminNote: '',
  },
  {
    id: 'ORD-20260705-0210',
    orderedAt: '2026-07-05T02:50:00.000Z',
    status: 'delivered',
    customer: {
      name: '최유진',
      phone: '010-3390-5521',
      email: 'yujin.c@example.com',
      memberId: 'mem-7',
    },
    receiver: {
      name: '최유진',
      phone: '010-3390-5521',
      zipCode: '05854',
      address: '서울특별시 송파구 올림픽로 300',
      addressDetail: '롯데월드타워 27층',
      request: '',
    },
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-5',
        productName: '오브제 미니멀 크로스백',
        sku: 'OBJ-BAG-338',
        optionLabel: '단일 상품',
        unitPrice: 38250,
        quantity: 1,
        shippedQuantity: 1,
        pointRate: 0,
      },
    ],
    payment: {
      method: 'card',
      shippingFee: 3000,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-05T02:51:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-05T02:51:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord210-out-1',
        at: '2026-07-05T02:51:00.000Z',
        direction: 'out',
        sku: 'OBJ-BAG-338',
        optionLabel: '단일 상품',
        quantity: 1,
      },
    ],
    history: [
      {
        id: 'evt-1',
        at: '2026-07-05T02:50:00.000Z',
        kind: 'order',
        label: '주문 접수',
        actor: '고객',
        note: '',
      },
      {
        id: 'evt-2',
        at: '2026-07-05T02:51:00.000Z',
        kind: 'payment',
        label: '결제 완료',
        actor: '고객',
        note: '신용·체크카드',
      },
      {
        id: 'evt-3',
        at: '2026-07-06T01:30:00.000Z',
        kind: 'status',
        label: '입금전 → 배송완료',
        actor: '운영자',
        note: '',
      },
    ],
    adminNote: '반품 완료(2026-07-09) — 환불 38,250원.',
  },
  {
    id: 'ORD-20260703-0177',
    orderedAt: '2026-07-03T08:05:00.000Z',
    status: 'confirmed',
    customer: {
      name: '정민우',
      phone: '010-7126-4408',
      email: 'minwoo.j@example.com',
      memberId: 'mem-8',
    },
    receiver: {
      name: '정민우',
      phone: '010-7126-4408',
      zipCode: '42196',
      address: '대구광역시 수성구 동대구로 351',
      addressDetail: '1102호',
      request: '',
    },
    lines: [
      {
        id: 'ln-1',
        productId: 'prd-4',
        productName: '카밀 워시드 데님 팬츠',
        sku: 'CML-DNM-051-30',
        optionLabel: '30',
        unitPrice: 59000,
        quantity: 1,
        shippedQuantity: 1,
        pointRate: 1,
      },
    ],
    payment: {
      method: 'card',
      shippingFee: 0,
      discount: 3000,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-03T08:06:00.000Z',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '2026-07-03T08:06:00.000Z',
    stockRestoredAt: '',
    stockMovements: [
      {
        id: 'mv-ord177-out-1',
        at: '2026-07-03T08:06:00.000Z',
        direction: 'out',
        sku: 'CML-DNM-051-30',
        optionLabel: '30',
        quantity: 1,
      },
    ],
    history: [
      {
        id: 'evt-1',
        at: '2026-07-03T08:05:00.000Z',
        kind: 'order',
        label: '주문 접수',
        actor: '고객',
        note: '',
      },
      {
        id: 'evt-2',
        at: '2026-07-03T08:06:00.000Z',
        kind: 'payment',
        label: '결제 완료',
        actor: '고객',
        note: '신용·체크카드',
      },
      {
        id: 'evt-3',
        at: '2026-07-04T00:40:00.000Z',
        kind: 'status',
        label: '입금전 → 배송완료',
        actor: '운영자',
        note: '',
      },
      {
        id: 'evt-4',
        at: '2026-07-09T00:00:00.000Z',
        kind: 'status',
        label: '배송완료 → 구매확정',
        actor: '시스템',
        note: '배송완료 5일 경과 자동 확정',
      },
    ],
    adminNote: '교환 요청 반려(착용 흔적).',
  },
];
