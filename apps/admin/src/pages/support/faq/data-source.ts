// 고객노출 FAQ(큐레이션) 데이터 소스
//
// [행은 여기서 만들어지지 않는다] 목록의 원본은 콘텐츠 관리 FAQ 이고, 이 파일이 갖는 것은 그 위에
// 얹는 큐레이션 레코드(노출·BEST·순서)뿐이다. 원본은 배선된 조회기로 읽는다 — 고객센터 화면은
// 콘텐츠 화면을 import 하지 않는다(shared/domain/faq-catalog.ts 머리말 · src/wiring.ts).
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건. 큐레이션 전용이라
// 조회 + 순서 재정렬 + 노출 토글 + BEST 고정만 있다(작성/삭제는 콘텐츠 관리 FAQ 소관).
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { publishedFaqs } from '../../../shared/domain/faq-catalog';
import { applyCurationOrder, applyCurationPatch, curateFaqs } from './types';
import type { CustomerFaq, FaqCuration } from './types';

const CUSTOMER_FAQ_SCOPE = 'support-faq';

/**
 * 큐레이션 레코드 — **손댄 FAQ 만** 있다(types.ts FaqCuration 머리말). 나머지는 기본값으로 뜬다.
 *
 * faqId 는 콘텐츠 FAQ 의 id(FAQ-001…)다. 예전에는 이 배열이 질문·카테고리까지 들고 있어서
 * 콘텐츠 관리에서 쓴 FAQ 와 아무 관계가 없었다 — 지금은 '무엇을' 이 아니라 '어떻게 보일지' 만 갖는다.
 *
 * TODO(backend): GET /api/support/faq/curation — 서버도 원본 FAQ 가 아니라 이 축만 돌려준다.
 */
let curations: readonly FaqCuration[] = [
  { faqId: 'FAQ-002', pinned: true, order: 1 },
  { faqId: 'FAQ-003', pinned: true, order: 2 },
  { faqId: 'FAQ-004', order: 3 },
  // 콘텐츠에서는 노출 중이지만 고객센터에서는 잠시 내려 둔 FAQ — 두 축이 별개임이 여기서 보인다
  { faqId: 'FAQ-007', visible: false, order: 4 },
];

/**
 * 원본을 읽는다 — 배선되지 않았으면 **던진다**.
 *
 * 빈 배열로 뭉개면 화면이 '고객센터에 노출할 FAQ 가 없습니다' 라는 완결된 문장을 그리고, 운영자는
 * 배선 사고를 데이터 사고로 읽는다. 모르는 것은 모른다고 말한다(faq-catalog.ts 머리말).
 */
function readSource() {
  const source = publishedFaqs();
  if (source === null) {
    throw new Error('FAQ 원본(콘텐츠 관리)을 읽을 수 없어요');
  }
  return source;
}

// TODO(backend): GET /api/support/faq (고객노출 순서·플래그) · PUT /api/support/faq/order · PATCH /api/support/faq/:id
export async function fetchCustomerFaqs(signal: AbortSignal): Promise<readonly CustomerFaq[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'list');
  return curateFaqs(readSource(), curations);
}

export async function reorderCustomerFaqs(
  orderedIds: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'save');
  curations = applyCurationOrder(curations, orderedIds);
}

export async function setCustomerFaqVisible(id: string, visible: boolean): Promise<void> {
  await wait(LATENCY_MS);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'save');
  curations = applyCurationPatch(curations, id, { visible });
}

export async function setCustomerFaqPinned(id: string, pinned: boolean): Promise<void> {
  await wait(LATENCY_MS);
  failIfRequested(CUSTOMER_FAQ_SCOPE, 'save');
  curations = applyCurationPatch(curations, id, { pinned });
}
