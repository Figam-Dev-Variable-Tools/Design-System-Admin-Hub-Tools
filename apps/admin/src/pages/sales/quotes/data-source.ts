// 견적 데이터 소스 · 저장소
//
// [백엔드 연동 지점] 실제 연동 시 // TODO(backend) 엔드포인트로 저장소 함수 본문만 교체하고 화면은
// 그대로 둔다. 견적번호는 채번(견적일+순번)이 정본이라 입력이 비어 있을 때 여기서 부여한다.
//
// [왜 createCrudAdapter 가 아니라 저장소인가] 견적은 견적 화면만 만들지 않는다 — 문의 상태를
// '견적 발행'으로 바꾸면 문의 어댑터가 여기에 견적을 꽂는다(H). createCrudAdapter 는 배열을 클로저에
// 가둬 다른 어댑터가 쓸 수 없다. 그래서 저장소를 노출하고 그 위에 createStoreAdapter 를 얹는다
// (products/_shared/store 선례). 저장소 함수가 409/404 를 직접 던져 프레임워크와 같은 계약을 지킨다.
//
// [거래처 참조] 시드의 accountId 는 accounts/data-source 의 실제 거래처 id(acc-1~3)를 가리킨다 —
// 이름만 같고 연결이 없는 행이 하나라도 있으면 거래처 상세의 역방향 조회가 조용히 비어 보인다.
import { createStoreAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { buildQuoteFromSources, makeQuoteNo, quoteConvertBlock, sortQuotes } from './types';
import type { Quote, QuoteInput } from './types';
import type { IssuedQuoteRef, QuoteIssueSource } from '../../../shared/domain/quote-issue';

const SCOPE = 'sales-quotes';

const QUOTE_SEED: readonly Quote[] = [
  {
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
      { id: 'li-1', name: 'ERP 라이선스(연간)', spec: '100석', quantity: 1, unitPrice: 24000000 },
      { id: 'li-2', name: '초기 구축 컨설팅', spec: '4주', quantity: 1, unitPrice: 6000000 },
    ],
    status: 'sent',
    note: '유효기간 내 발주 시 구축비 10% 할인 가능.',
    sources: [],
  },
  {
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
      { id: 'li-3', name: '사무기기 유지보수', spec: '월 정기', quantity: 12, unitPrice: 300000 },
    ],
    status: 'accepted',
    note: '',
    sources: [],
  },
  {
    id: 'qt-3',
    quoteNo: 'Q-20260620-002',
    accountId: 'acc-3',
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
    sources: [],
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

/* ── 견적 저장소 (어댑터가 위임한다 — 밖으로는 어댑터만 내보낸다) ─────────── */

/** 목록 — 문의 연동 테스트가 발행 결과를 확인할 때도 쓴다 */
export function listQuotes(): readonly Quote[] {
  return sortQuotes(quotes);
}

function getQuote(id: string): Quote {
  const found = quotes.find((quote) => quote.id === id);
  // 404 와 500 은 복구 수단이 다르다 — '목록으로' vs '다시 시도' (EXC-12).
  if (found === undefined) throw new HttpError(HTTP_STATUS.notFound, '견적을 찾을 수 없어요.');
  return found;
}

function addQuote(input: QuoteInput): void {
  quotes = sortQuotes([...quotes, nextQuote(input)]);
}

function updateQuote(id: string, input: QuoteInput): void {
  // [EXC-04] 없는 id 를 조용히 지나치고 성공을 반환하면 '저장했습니다' 유령 토스트가 뜬다.
  if (!quotes.some((quote) => quote.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 견적이에요.');
  }
  quotes = sortQuotes(
    quotes.map((quote) => (quote.id === id ? { ...quote, ...input, id } : quote)),
  );
}

function removeQuote(id: string): void {
  if (!quotes.some((quote) => quote.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 견적이에요.');
  }
  quotes = quotes.filter((quote) => quote.id !== id);
}

/** 그 문의로 발행된 견적 — 중복 발행 방지 판정의 정본(문의의 quoteId 와 교차 확인한다) */
export function findQuoteBySource(sourceId: string): Quote | undefined {
  return quotes.find((quote) => quote.sources.some((source) => source.id === sourceId));
}

/** 견적 한 건 — 계약 초안·청구가 원본 금액을 읽을 때 쓴다(같은 페이지 안이라 결합이 아니다) */
export function findQuote(quoteId: string): Quote | undefined {
  return quotes.find((quote) => quote.id === quoteId);
}

/**
 * 되돌려 쓰기 — 계약이 만들어졌으니 그 견적을 '수주(계약 진행)'로 찍는다.
 * **성공했으면 null**, 못 찍었으면 그 이유를 문자열로 돌려준다.
 *
 * ┌ 무엇이 없었나 ───────────────────────────────────────────────────────────┐
 * │ 계약을 만들어도 견적 상태가 그대로였다. 그래서 견적 목록은 계약이 생긴 뒤에도 │
 * │ 아무 일도 없었던 것처럼 보였고, 운영자는 '수주 전환' 버튼을 따로 눌러야 했다.  │
 * │ 두 번 누르는 것을 한 번 빠뜨리면 두 화면이 서로 다른 사실을 말했다.           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * [왜 던지지 않고 사유를 돌려주나] 백엔드가 없어 **트랜잭션이 없다.** 계약은 이미 만들어진
 * 뒤라 여기서 던지면 호출부는 '계약 생성이 실패했다' 로 오해하거나, 삼키면 '전부 성공' 이라는
 * 거짓말이 된다. 무엇이 됐고 무엇이 안 됐는지 호출부가 **따로** 말할 수 있어야 한다
 * (../contracts/data-source 의 createContractFromQuote 반환값 참조).
 *
 * [이미 수주면 실패가 아니다] 같은 계약으로 두 번 들어와도 결과가 같다(멱등) — 그때는 이미
 * 원하는 상태이므로 null 을 준다. 거절 사유를 그대로 올려보내면 '멀쩡한 재시도' 가 실패로 보인다.
 */
// TODO(backend): POST /api/sales/quotes/:id/order — 계약 생성과 한 트랜잭션으로 묶인다.
//   그때 이 함수는 사라지고 반쪽 저장이라는 상태 자체가 없어진다.
export function markQuoteOrdered(quoteId: string): string | null {
  const quote = quotes.find((item) => item.id === quoteId);
  if (quote === undefined) return '견적을 찾을 수 없어요. 이미 삭제되었을 수 있어요.';
  if (quote.status === 'ordered') return null;
  // 저장 경로의 거절도 화면의 버튼과 **같은 술어**를 읽는다.
  const blocked = quoteConvertBlock(quote.status);
  if (blocked !== null) return blocked;
  quotes = sortQuotes(
    quotes.map((item) => (item.id === quoteId ? { ...item, status: 'ordered' } : item)),
  );
  return null;
}

/**
 * 문의 → 견적 발행. 영업 문의 어댑터가 상태 전이 안에서 부르고, 상품·프로그램 문의는
 * `shared/domain/quote-issue` 의 발행기로 배선되어 같은 함수에 닿는다 — 실 HTTP 없음.
 *
 * **이미 그 문의로 발행된 견적이 있으면 새로 만들지 않고 기존 견적을 돌려준다.** 여러 건을 넘기면
 * 한 견적으로 합쳐지고(견적 바구니), 그중 **하나라도** 이미 견적을 갖고 있으면 합치지 않고 그
 * 견적을 돌려준다: 이미 발행된 문의를 다른 견적에 끌어들이면 한 문의가 견적 두 장을 갖게 된다.
 */
// TODO(backend): POST /api/sales/quotes/issue — 서버가 문의 잠금 + 견적 생성 + 역링크 설정을
//   한 트랜잭션으로 처리하고, 이미 발행된 문의가 섞여 있으면 409 로 거절한다.
export function issueQuoteFromSources(
  sources: readonly QuoteIssueSource[],
  issueDate: string = new Date().toISOString().slice(0, 10),
): Quote {
  for (const source of sources) {
    const existing = findQuoteBySource(source.id);
    if (existing !== undefined) return existing;
  }
  const created = nextQuote(buildQuoteFromSources(sources, issueDate));
  quotes = sortQuotes([...quotes, created]);
  return created;
}

/**
 * `shared/domain/quote-issue` 에 꽂히는 발행기 — 상품·프로그램 문의가 지나는 문.
 *
 * 견적 전체가 아니라 **최소 참조만** 돌려준다: 문의 화면이 견적 객체를 손에 쥐면 그 화면이
 * 견적의 필드를 읽기 시작하고, 그것이 곧 페이지 결합의 시작이다(축1).
 */
export function issueQuoteRef(sources: readonly QuoteIssueSource[]): IssuedQuoteRef {
  const quote = issueQuoteFromSources(sources);
  return { id: quote.id, quoteNo: quote.quoteNo };
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
