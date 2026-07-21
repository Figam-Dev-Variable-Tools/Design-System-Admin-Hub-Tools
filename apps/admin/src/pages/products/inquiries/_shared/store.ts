// 상품 문의 저장소 — 목록·상세가 공유하는 정본 픽스처 + 상태 전이 규칙
//
// [이 문의는 어디서 들어오는가] 결제대행(PG)을 끄면 스토어프론트의 '구매하기' 버튼이 '문의하기'
// 로 바뀐다. 그때 고객이 상품 앞에서 남긴 글이 여기로 들어온다. 즉 항목을 만드는 것은 **고객**이고
// 관리자는 답변하고 종결할 뿐이다 — 그래서 화면에는 등록 폼이 없다(어댑터 계약이 요구하는
// add 만 열어 둔다).
//
// [왜 답변과 상태를 한 함수가 옮기는가] '답변은 저장됐는데 상태는 아직 접수' 인 순간이 생기면
// 미답변 집계·목록 배지·경과 문구가 한꺼번에 거짓말을 한다. 두 사실이 갈라지지 않게 답변 본문·
// 답변 시각·상태는 **applyAnswer 한 곳에서만 함께** 움직이고, 저장소 쓰기(answerInquiry)와
// 상세 화면의 저장 경로가 모두 그 함수를 지난다.
//
// [id 가 곧 문의번호다] 고객이 전화로 "PIQ-20260718-001 건이요" 라고 부르는 번호와 관리자가 여는
// URL 이 같은 값이어야 서로를 지목할 수 있다. 그래서 표시용 번호를 따로 두지 않고 id 를 사람이
// 읽는 번호로 만든다(접수일 + 일련번호).
//
// [시각은 UTC(Z)로 저장한다] 서버가 내려줄 형태 그대로다. 화면 표기는 shared/format 이 KST 로
// 환산한다(ERP-09) — 그래서 문의번호에 박히는 날짜도 문자열을 자르지 않고 **KST 달력일**로
// 계산한다. 자르면 한국 시각 오전 8시 접수 건이 전날 번호를 달게 된다.
import { seoulDayOf } from '../../../../shared/format';

/**
 * 처리 상태.
 *
 * `received`(접수) → `answering`(답변 중) → `answered`(답변 완료) → `closed`(종결).
 * 되돌아가는 전이는 없다 — 답변한 문의를 '접수' 로 되돌리면 그 사이의 응대 시간이 사라진다.
 */
export type InquiryStatus = 'received' | 'answering' | 'answered' | 'closed';

/** 유입 채널 — storefront 가 PG 를 끈 상품 페이지의 '문의하기' 버튼이다 */
export type ProductInquiryChannel = 'storefront' | 'app' | 'phone' | 'email' | 'kakao';

export interface ProductInquiry {
  /** 문의번호를 겸한다 — 'PIQ-YYYYMMDD-NNN' (머리말) */
  readonly id: string;
  readonly productId: string;
  /** 비정규화 상품명 — 목록이 상품을 다시 조회하지 않게 한다 */
  readonly productName: string;
  readonly customerName: string;
  /** 연락처 — 회신 수단(이메일 또는 전화). 채널에 따라 형태가 다르다 */
  readonly customerContact: string;
  readonly channel: ProductInquiryChannel;
  readonly subject: string;
  readonly message: string;
  readonly status: InquiryStatus;
  /** 접수 일시 ISO */
  readonly createdAt: string;
  /** 최초 답변 일시 ISO — 미답변이면 '' */
  readonly answeredAt: string;
  /** 답변 본문 — 미답변이면 '' */
  readonly answer: string;
}

export type ProductInquiryInput = Omit<ProductInquiry, 'id'>;

export const PRODUCT_INQUIRY_ANSWER_MAX = 1000;

/* ── 전이 규칙 (순수 함수) ────────────────────────────────────────────────────
 *
 * 규칙을 화면이 아니라 여기에 두는 이유: 버튼의 disabled 와 저장의 허용 여부가 서로 다른 판단을
 * 하면 '눌리는데 실패하는 버튼' 또는 '눌리지 않는데 서버는 허용하는 동작' 이 생긴다. 화면은
 * 아래 술어를 그대로 읽어 버튼을 그리고, 저장소도 같은 술어로 막는다. */

export const ANSWER_ON_CLOSED_ERROR = '종결된 문의는 답변을 수정할 수 없습니다.';
export const CLOSE_UNANSWERED_ERROR = '답변하지 않은 문의는 종결할 수 없습니다.';
export const EMPTY_ANSWER_ERROR = '답변 내용을 입력하세요.';
export const BEGIN_ANSWERING_ERROR = '접수 상태의 문의만 답변 착수로 바꿀 수 있습니다.';

/** 아직 고객이 답을 못 받은 상태인가 — 미답변 집계·경과 문구의 단일 정의 */
export function isUnanswered(status: InquiryStatus): boolean {
  return status === 'received' || status === 'answering';
}

/** 답변을 쓰거나 고칠 수 있나 — 종결된 문의는 기록이라 손대지 않는다 */
export function canAnswer(status: InquiryStatus): boolean {
  return status !== 'closed';
}

/** 종결할 수 있나 — 답변이 나간 뒤에만 닫는다 */
export function canClose(status: InquiryStatus): boolean {
  return status === 'answered';
}

/** 답변 착수로 바꿀 수 있나 — 접수 직후 한 번만 */
export function canBeginAnswering(status: InquiryStatus): boolean {
  return status === 'received';
}

/**
 * 답변을 얹는다 — 본문·답변 시각·상태가 **함께** 옮겨 간다(머리말).
 *
 * `answeredAt` 은 **최초 답변 시각**이라 재수정에서 바뀌지 않는다: 그 값은 '얼마나 빨리
 * 응대했는가' 라는 사실이고, 오탈자를 고칠 때마다 갱신되면 응대 속도가 사후에 조작된다.
 * `at`(시각)을 인자로 받는 이유는 테스트·스토리가 시계를 고정할 수 있어야 하기 때문이다.
 */
export function applyAnswer(inquiry: ProductInquiry, answer: string, at: string): ProductInquiry {
  if (!canAnswer(inquiry.status)) throw new Error(ANSWER_ON_CLOSED_ERROR);
  const body = answer.trim();
  if (body === '') throw new Error(EMPTY_ANSWER_ERROR);
  return {
    ...inquiry,
    answer: body,
    answeredAt: inquiry.answeredAt === '' ? at : inquiry.answeredAt,
    status: 'answered',
  };
}

/** 종결 — 답변이 나간 문의만 닫는다 */
export function applyClose(inquiry: ProductInquiry): ProductInquiry {
  if (!canClose(inquiry.status)) throw new Error(CLOSE_UNANSWERED_ERROR);
  return { ...inquiry, status: 'closed' };
}

/** 답변 착수 — 담당자가 잡았다는 표시. 고객에게는 아직 아무것도 나가지 않았다 */
export function applyBeginAnswering(inquiry: ProductInquiry): ProductInquiry {
  if (!canBeginAnswering(inquiry.status)) throw new Error(BEGIN_ANSWERING_ERROR);
  return { ...inquiry, status: 'answering' };
}

/** 저장소 쓰기용 입력으로 되돌린다 — 상세 화면이 저장 직전에 부른다 */
export function toProductInquiryInput(inquiry: ProductInquiry): ProductInquiryInput {
  return {
    productId: inquiry.productId,
    productName: inquiry.productName,
    customerName: inquiry.customerName,
    customerContact: inquiry.customerContact,
    channel: inquiry.channel,
    subject: inquiry.subject,
    message: inquiry.message,
    status: inquiry.status,
    createdAt: inquiry.createdAt,
    answeredAt: inquiry.answeredAt,
    answer: inquiry.answer,
  };
}

/* ── 픽스처 (가상 인물·가상 연락처 — 실명 없음) ──────────────────────────────
 *
 * 상품명·상품 id 는 상품 저장소(pages/products/_shared/store.ts)의 것과 맞춰 두었다 — 같은 상품을
 * 두 화면에서 다른 이름으로 부르면 운영자가 같은 물건인지 알 수 없다. */

let inquiries: ProductInquiry[] = [
  {
    id: 'PIQ-20260718-001',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    customerName: '김서연',
    customerContact: '010-2481-7735',
    channel: 'storefront',
    subject: '구매 전 재고 확인 부탁드립니다',
    message:
      '차콜 M 사이즈가 품절로 표시되는데 재입고 예정이 있을까요? 이번 주 안에 받아야 해서 문의드립니다.',
    status: 'received',
    createdAt: '2026-07-18T01:12:00Z',
    answeredAt: '',
    answer: '',
  },
  {
    id: 'PIQ-20260720-002',
    productId: 'prd-3',
    productName: '테라 스니커즈 데일리',
    customerName: '박지훈',
    customerContact: 'jihoon.p@example.com',
    channel: 'app',
    subject: '사이즈 교환이 가능한지 궁금합니다',
    message: '260 을 받았는데 조금 큽니다. 착용 전이라면 250 으로 교환할 수 있나요?',
    status: 'answering',
    createdAt: '2026-07-20T05:40:00Z',
    answeredAt: '',
    answer: '',
  },
  {
    id: 'PIQ-20260715-003',
    productId: 'prd-2',
    productName: '노바 베이직 코튼 티셔츠',
    customerName: '이하늘',
    customerContact: '02-6412-8890',
    channel: 'phone',
    subject: '단체 주문 시 가격 문의',
    message: '사내 행사용으로 120장을 한 번에 주문하려고 합니다. 별도 단가가 있을까요?',
    status: 'answered',
    createdAt: '2026-07-15T00:05:00Z',
    answeredAt: '2026-07-16T02:20:00Z',
    answer:
      '100장 이상 단체 주문은 별도 단가가 적용됩니다. 담당자가 남겨 주신 번호로 견적서를 보내 드리겠습니다.',
  },
  {
    id: 'PIQ-20260710-004',
    productId: 'prd-5',
    productName: '오브제 미니멀 크로스백',
    customerName: '정민우',
    customerContact: 'minwoo.j@example.com',
    channel: 'email',
    subject: '카드 결제 대신 계좌이체가 가능한가요',
    message: '결제 단계에서 카드 결제가 진행되지 않습니다. 무통장 입금으로 주문할 수 있을까요?',
    status: 'closed',
    createdAt: '2026-07-10T07:30:00Z',
    answeredAt: '2026-07-10T09:02:00Z',
    answer:
      '현재 카드 결제를 잠시 중단하고 있어 무통장 입금으로 안내드렸습니다. 입금 확인 후 발송 처리되었습니다.',
  },
  {
    id: 'PIQ-20260721-005',
    productId: 'prd-4',
    productName: '카밀 워시드 데님 팬츠',
    customerName: '최유진',
    customerContact: '010-3390-5521',
    channel: 'kakao',
    subject: '입고 알림을 받고 싶습니다',
    message: '30 사이즈가 다시 들어오면 알려 주실 수 있나요?',
    status: 'received',
    createdAt: '2026-07-20T23:30:00Z',
    answeredAt: '',
    answer: '',
  },
];

let seq = inquiries.length;

/** 접수일 기준 번호를 만든다 — 고객이 부르는 번호와 URL 이 같은 값이어야 한다(머리말) */
function nextInquiryId(createdAt: string): string {
  seq += 1;
  // 읽을 수 없는 시각이면 번호를 지어내지 않고 오늘(KST)로 붙인다 — 'NaN' 번호를 만들지 않는다
  const day = seoulDayOf(createdAt) ?? seoulDayOf(new Date().toISOString()) ?? '';
  return `PIQ-${day.replaceAll('-', '')}-${String(seq).padStart(3, '0')}`;
}

/* ── 저장소 API ───────────────────────────────────────────────────────────── */

export function listProductInquiries(): readonly ProductInquiry[] {
  return inquiries;
}

export function getProductInquiry(id: string): ProductInquiry {
  const found = inquiries.find((inquiry) => inquiry.id === id);
  if (found === undefined) throw new Error('문의를 찾을 수 없습니다');
  return found;
}

/** 고객 채널이 만든다 — 관리자 화면에는 이 문을 여는 버튼이 없다(머리말) */
export function addProductInquiry(input: ProductInquiryInput): void {
  inquiries = [...inquiries, { id: nextInquiryId(input.createdAt), ...input }];
}

export function updateProductInquiry(id: string, input: ProductInquiryInput): void {
  inquiries = inquiries.map((inquiry) =>
    inquiry.id === id ? { ...inquiry, ...input, id: inquiry.id } : inquiry,
  );
}

export function removeProductInquiry(id: string): void {
  inquiries = inquiries.filter((inquiry) => inquiry.id !== id);
}

/**
 * 답변 저장 — 본문과 상태가 한 번에 옮겨 간다(applyAnswer 가 정본).
 * 상세 화면은 어댑터 update 를 지나가지만 같은 applyAnswer 를 통과한다.
 */
export function answerInquiry(
  id: string,
  answer: string,
  at: string = new Date().toISOString(),
): void {
  const next = applyAnswer(getProductInquiry(id), answer, at);
  updateProductInquiry(id, toProductInquiryInput(next));
}

/** 종결 — 답변이 나간 문의만 닫는다 */
export function closeInquiry(id: string): void {
  const next = applyClose(getProductInquiry(id));
  updateProductInquiry(id, toProductInquiryInput(next));
}

/** 답변 착수 — 접수 → 답변 중 */
export function beginAnsweringInquiry(id: string): void {
  const next = applyBeginAnswering(getProductInquiry(id));
  updateProductInquiry(id, toProductInquiryInput(next));
}
