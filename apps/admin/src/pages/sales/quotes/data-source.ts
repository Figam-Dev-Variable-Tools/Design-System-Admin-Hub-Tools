// 견적 데이터 소스 · 저장소 (A41 소유 — apps/admin/src/pages/sales/**)
//
// [백엔드 연동 지점] 실제 연동 시 // TODO(backend) 엔드포인트로 저장소 함수 본문만 교체하고 화면은
// 그대로 둔다. 견적번호는 채번(견적일+순번)이 정본이라 입력이 비어 있을 때 여기서 부여한다.
//
// [왜 createCrudAdapter 가 아니라 저장소인가] 견적은 견적 화면만 만들지 않는다 — 문의 상태를
// '견적 발행'으로 바꾸면 문의 어댑터가 여기에 견적을 꽂는다(H). createCrudAdapter 는 배열을 클로저에
// 가둬 다른 어댑터가 쓸 수 없다. 그래서 저장소를 노출하고 그 위에 createStoreAdapter 를 얹는다
// (products/_shared/store 선례). 저장소 함수가 409/404 를 직접 던져 프레임워크와 같은 계약을 지킨다.
import { createStoreAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { buildQuoteFromInquiry, makeQuoteNo, sortQuotes } from './types';
import type { Quote, QuoteInheritance, QuoteInput } from './types';

const SCOPE = 'sales-quotes';

const QUOTE_SEED: readonly Quote[] = [
  {
    id: 'qt-1',
    quoteNo: 'Q-20260710-001',
    accountName: '(주)한빛소프트웨어',
    accountBizNo: '124-81-00998',
    accountCeo: '김한빛',
    contactName: '김담당',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items: [
      { id: 'li-1', name: 'ERP 라이선스(연간)', spec: '100석', quantity: 1, unitPrice: 24000000 },
      { id: 'li-2', name: '초기 구축 컨설팅', spec: '4주', quantity: 1, unitPrice: 6000000 },
    ],
    status: 'sent',
    note: '유효기간 내 발주 시 구축비 10% 할인 가능.',
    inquiryId: '',
    inquiryNo: '',
    inquiryBody: '',
  },
  {
    id: 'qt-2',
    quoteNo: 'Q-20260705-001',
    accountName: '대성물산 주식회사',
    accountBizNo: '220-81-62517',
    accountCeo: '정대성',
    contactName: '',
    issueDate: '2026-07-05',
    validUntil: '2026-07-25',
    taxMode: 'standard',
    items: [
      { id: 'li-3', name: '사무기기 유지보수', spec: '월 정기', quantity: 12, unitPrice: 300000 },
    ],
    status: 'accepted',
    note: '',
    inquiryId: '',
    inquiryNo: '',
    inquiryBody: '',
  },
  {
    id: 'qt-3',
    quoteNo: 'Q-20260620-002',
    accountName: '미래테크놀로지',
    accountBizNo: '120-81-47521',
    accountCeo: '오미래',
    contactName: '',
    issueDate: '2026-06-20',
    validUntil: '2026-07-05',
    taxMode: 'zero_rated',
    items: [
      { id: 'li-4', name: '수출용 부품 설계', spec: 'Rev.A', quantity: 3, unitPrice: 1500000 },
    ],
    status: 'expired',
    note: '영세율 적용(수출).',
    inquiryId: '',
    inquiryNo: '',
    inquiryBody: '',
  },
];

let quotes: readonly Quote[] = sortQuotes(QUOTE_SEED);
let seq = QUOTE_SEED.length;

/** 견적번호가 비어 있으면(신규) 견적일+순번으로 채번한다 — 자동 부여 값의 단일 지점 */
function nextQuote(input: QuoteInput): Quote {
  seq += 1;
  const quoteNo = input.quoteNo.trim() === '' ? makeQuoteNo(input.issueDate, seq) : input.quoteNo;
  return { id: `qt-${String(seq)}`, ...input, quoteNo };
}

/* ── 견적 저장소 API (어댑터 · 문의 연동이 부른다) ────────────────────────── */

export function listQuotes(): readonly Quote[] {
  return sortQuotes(quotes);
}

export function getQuote(id: string): Quote {
  const found = quotes.find((quote) => quote.id === id);
  // 404 와 500 은 복구 수단이 다르다 — '목록으로' vs '다시 시도' (EXC-12).
  if (found === undefined) throw new HttpError(HTTP_STATUS.notFound, '견적을 찾을 수 없습니다.');
  return found;
}

export function addQuote(input: QuoteInput): void {
  quotes = sortQuotes([...quotes, nextQuote(input)]);
}

export function updateQuote(id: string, input: QuoteInput): void {
  // [EXC-04] 없는 id 를 조용히 지나치고 성공을 반환하면 '저장했습니다' 유령 토스트가 뜬다.
  if (!quotes.some((quote) => quote.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 견적입니다.');
  }
  quotes = sortQuotes(
    quotes.map((quote) => (quote.id === id ? { ...quote, ...input, id } : quote)),
  );
}

export function removeQuote(id: string): void {
  if (!quotes.some((quote) => quote.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 견적입니다.');
  }
  quotes = quotes.filter((quote) => quote.id !== id);
}

/** 문의로 발행된 견적 — 중복 발행 방지 판정의 정본(문의의 quoteId 와 교차 확인한다) */
export function findQuoteByInquiry(inquiryId: string): Quote | undefined {
  return quotes.find((quote) => quote.inquiryId === inquiryId);
}

/**
 * 문의 → 견적 발행 (H). 문의 어댑터가 상태 전이 안에서 부른다 — 실 HTTP 없음.
 * 이미 그 문의로 발행된 견적이 있으면 **새로 만들지 않고 기존 견적을 돌려준다**(중복 발행 방지).
 */
// TODO(backend): POST /api/sales/inquiries/:id/issue-quote — 서버가 문의 잠금 + 견적 생성 +
//   역링크 설정을 한 트랜잭션으로 처리하고, 이미 발행된 문의면 409 로 거절한다.
export function issueQuoteFromInquiry(inheritance: QuoteInheritance): Quote {
  const existing = findQuoteByInquiry(inheritance.inquiryId);
  if (existing !== undefined) return existing;
  const created = nextQuote(buildQuoteFromInquiry(inheritance));
  quotes = sortQuotes([...quotes, created]);
  return created;
}

// TODO(backend): GET/POST /api/sales/quotes · GET/PUT/DELETE /api/sales/quotes/:id
//   · POST /api/sales/quotes/:id/convert (수주 전환 — 견적을 수주(주문)로 복사)
export const quoteAdapter = createStoreAdapter<Quote, QuoteInput>({
  scope: SCOPE,
  list: listQuotes,
  getOne: getQuote,
  add: addQuote,
  update: updateQuote,
  remove: removeQuote,
});
