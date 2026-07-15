// 고객노출 FAQ(큐레이션) 데이터 소스 (A41 소유 — apps/admin/src/pages/support/faq/**)
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건. 큐레이션 전용이라
// 조회 + 순서 재정렬 + 노출 토글 + BEST 고정만 있다(작성/삭제는 콘텐츠 관리 FAQ 소관).
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { applyFaqOrder, sortCustomerFaqs } from './types';
import type { CustomerFaq } from './types';

const CUSTOMER_FAQ_SCOPE = 'support-faq';

let faqs: readonly CustomerFaq[] = [
  {
    id: 'cfaq-1',
    question: '주문을 취소하고 싶어요',
    categoryLabel: '주문/결제',
    visible: true,
    pinned: true,
    order: 1,
  },
  {
    id: 'cfaq-2',
    question: '배송 조회는 어디서 하나요?',
    categoryLabel: '배송',
    visible: true,
    pinned: true,
    order: 2,
  },
  {
    id: 'cfaq-3',
    question: '반품/교환 절차가 궁금해요',
    categoryLabel: '교환/반품',
    visible: true,
    pinned: false,
    order: 3,
  },
  {
    id: 'cfaq-4',
    question: '비밀번호를 잊어버렸어요',
    categoryLabel: '회원/계정',
    visible: true,
    pinned: false,
    order: 4,
  },
  {
    id: 'cfaq-5',
    question: '적립금은 어떻게 사용하나요?',
    categoryLabel: '주문/결제',
    visible: false,
    pinned: false,
    order: 5,
  },
  {
    id: 'cfaq-6',
    question: '해외 배송이 되나요?',
    categoryLabel: '배송',
    visible: true,
    pinned: false,
    order: 6,
  },
];

// TODO(backend): GET /api/support/faq (고객노출 순서·플래그) · PUT /api/support/faq/order · PATCH /api/support/faq/:id
export async function fetchCustomerFaqs(signal: AbortSignal): Promise<readonly CustomerFaq[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'list');
  return sortCustomerFaqs(faqs);
}

export async function reorderCustomerFaqs(
  orderedIds: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'save');
  faqs = applyFaqOrder(faqs, orderedIds);
}

export async function setCustomerFaqVisible(id: string, visible: boolean): Promise<void> {
  await wait(LATENCY_MS);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'save');
  faqs = faqs.map((faq) => (faq.id === id ? { ...faq, visible } : faq));
}

export async function setCustomerFaqPinned(id: string, pinned: boolean): Promise<void> {
  await wait(LATENCY_MS);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'save');
  faqs = faqs.map((faq) => (faq.id === id ? { ...faq, pinned } : faq));
}
