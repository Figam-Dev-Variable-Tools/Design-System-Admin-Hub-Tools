// 문의 → 견적 발행 이음매 — **자리만** 만든다 (견적의 정본은 영업 관리 견적이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 돈이 들어오는 길이 한 군데에만 나 있었다]
// 결제대행(PG)을 끄고 파는 운영에서 매출은 **문의 → 견적 → 수주 → 청구** 한 경로로만 들어온다.
// 그런데 그 첫 칸이 화면마다 달랐다.
//   · 영업 문의(/sales/inquiries)      — 상태를 '견적 발행'으로 바꾸면 견적이 자동 생성된다.
//   · 상품 문의(/products/inquiries)   — 답변하고 종결한다. 견적으로 가는 길이 **한 줄도 없었다**.
//   · 프로그램 문의(/programs/inquiries) — 같다.
// 그래서 '단체 주문 120장 단가 문의' 에 운영자가 답변만 남기면, 앱은 그 거래가 성사됐는지도
// 얼마인지도 영영 모른다. 견적서는 앱 밖(메일·전화)에서 만들어지고 매출은 기록되지 않는다.
//
// [왜 문의 화면이 견적을 직접 import 하지 않나]
// `pages/products → pages/sales`, `pages/programs → pages/sales` 는 페이지 간 결합이고
// code-quality 축1(page-coupling, blocker, 임계값 0건)이 그대로 잡는다. 그래서 방향을 뒤집는다:
// 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 발행기를 꽂는 일은 두 도메인을 모두 아는
// `src/wiring.ts` 가 한다. 문의 화면은 끝까지 '영업 관리' 라는 모듈을 모른 채 참조만 들고 있는다.
// (같은 결의 선례: shared/domain/faq-catalog.ts · shared/domain/coupon-catalog.ts.)
//
// [영업 문의는 왜 이 이음매를 지나지 않나] 같은 페이지(`pages/sales`) 안이라 결합이 아니다 —
// 그쪽은 예전처럼 견적 저장소를 직접 부른다. 이 파일은 **페이지 경계를 넘는 두 문의**를 위한 것이다.
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 배선이 없을 때 조용히 아무 일도 하지 않으면 운영자는 '견적 발행' 을 누르고 아무 반응도 못 본
// 채 다시 누른다. 그래서 미배선은 **거절 사유 문자열**로 드러난다(quoteIssueBlock) — 버튼이
// 비활성이 된 이유가 화면에 적히고, 저장 경로도 같은 술어로 막힌다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 견적이 어느 창구의 문의에서 나왔는가 — 역링크의 목적지가 갈린다.
 *
 * 경로 문자열은 모듈 import 가 아니라서 결합이 아니다(coupon-catalog 머리말과 같은 판단).
 * 다만 그 문자열을 어디에 둘지는 견적 쪽 관심사라 여기서는 **어휘만** 정한다.
 */
export type QuoteSourceChannel = 'sales' | 'product' | 'program';

/**
 * 견적으로 넘어가는 문의 한 건 — **문의 쪽이 소유하는 값만** 담는다.
 *
 * 단가·과세유형·유효기간은 여기 없다. 문의는 그 정보를 갖지 않는다(견적을 쓰는 사람이 채운다).
 * 계약에 섞으면 문의 화면이 견적서의 규칙을 알게 되고, 그 순간 어느 쪽이 주인인지 다시 흐려진다.
 */
export interface QuoteIssueSource {
  /** 문의 id — **멱등키다.** 같은 문의로 두 번 눌러도 견적은 하나다 */
  readonly id: string;
  /** 표시용 문의번호(스냅숏) — 견적서와 목록이 원본을 부르는 이름 */
  readonly no: string;
  readonly channel: QuoteSourceChannel;
  /**
   * 견적서 거래처(공급받는자) 표시 라벨의 출발점.
   *
   * 영업 문의는 회사명을 갖지만 상품·프로그램 문의는 **개인 고객**이라 회사가 없다 — 그때는
   * 문의자 이름이 들어온다. 어느 쪽이든 거래처 마스터 연결(accountId)은 비워 둔다: 이름을 맞춰
   * id 를 추측하면 동명이인 거래처에 남의 견적이 붙는다.
   */
  readonly accountLabel: string;
  readonly customerName: string;
  /**
   * 견적 품목의 출발점(상품명·프로그램명) — 없으면 ''.
   *
   * 영업 문의는 무엇을 파는지 모르므로 '' 로 온다(품목은 운영자가 세운다). 상품·프로그램 문의는
   * 무엇에 대한 문의인지 알고 있어서, 그 한 줄이 견적의 첫 품목이 된다 — **여러 문의를 한 견적으로
   * 합칠 때 이 줄들이 그대로 바구니가 된다.**
   */
  readonly itemName: string;
  readonly body: string;
}

/** 발행된 견적으로 가는 최소 참조 — 문의 화면은 견적의 나머지를 알 필요가 없다 */
export interface IssuedQuoteRef {
  readonly id: string;
  readonly quoteNo: string;
}

/**
 * 발행된 견적 상세 경로 — 문의 화면의 역링크가 쓴다.
 *
 * 경로 문자열은 모듈 import 가 아니라서 페이지 결합이 아니다(축1). 한 곳에 모아 두어야 라우트가
 * 바뀔 때 한 번만 고친다 (coupon-catalog 의 '왜 링크 경로가 여기 있나' 와 같은 판단).
 */
export function issuedQuoteHref(quoteId: string): string {
  return `/sales/quotes/${quoteId}`;
}

/**
 * 발행 가능 여부를 묻는 최소 모양.
 *
 * `issuable` 의 판정은 **각 문의 모듈의 규칙**이 한다(종결된 문의인가 등) — 여기서 상태 어휘를
 * 알면 문의 모듈마다 다른 상태 집합을 이 파일이 전부 알아야 한다.
 */
export interface QuoteIssueCandidate {
  readonly id: string;
  /** 이미 발행된 견적 id — '' 면 미발행. 중복 발행을 막는 멱등키다 */
  readonly quoteId: string;
  /** 지금 이 문의가 견적을 낼 수 있는 상태인가 */
  readonly issuable: boolean;
}

export const QUOTE_ISSUE_EMPTY = '견적을 발행할 문의를 한 건 이상 선택하세요.';
export const QUOTE_ISSUE_ALREADY = '이미 견적이 발행된 문의가 있어요. 발행된 견적을 여세요.';
export const QUOTE_ISSUE_NOT_ISSUABLE = '종결된 문의는 견적을 발행할 수 없어요.';
export const QUOTE_ISSUE_UNWIRED = '견적 발행을 사용할 수 없어요. 관리자에게 문의하세요.';

type QuoteIssuer = (sources: readonly QuoteIssueSource[]) => IssuedQuoteRef;

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let issuer: QuoteIssuer | null = null;

/** 발행기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerQuoteIssuer(next: QuoteIssuer): void {
  issuer = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetQuoteIssuer(): void {
  issuer = null;
}

/** 지금 견적을 발행할 수 있게 배선되어 있는가 — 거절 사유 판정이 읽는다 */
export function isQuoteIssuerWired(): boolean {
  return issuer !== null;
}

/** 이미 견적이 발행된 문의인가 — 중복 발행 방지·역링크 판정의 단일 정의 */
export function hasIssuedQuote(candidate: Pick<QuoteIssueCandidate, 'quoteId'>): boolean {
  return candidate.quoteId !== '';
}

/**
 * 지금 이 문의들로 견적을 발행할 수 없는 이유 — 발행할 수 있으면 null.
 *
 * **버튼의 disabled 조건과 저장의 거절 조건이 이 한 술어를 읽는다** — 둘이 갈라지면
 * '눌리는데 실패하는 버튼' 또는 '눌리지 않는데 저장은 되는 동작' 이 생긴다
 * (shared/domain/order.ts 의 orderTransitionBlock 과 같은 규약).
 */
export function quoteIssueBlock(candidates: readonly QuoteIssueCandidate[]): string | null {
  if (candidates.length === 0) return QUOTE_ISSUE_EMPTY;
  if (candidates.some(hasIssuedQuote)) return QUOTE_ISSUE_ALREADY;
  if (candidates.some((candidate) => !candidate.issuable)) return QUOTE_ISSUE_NOT_ISSUABLE;
  if (!isQuoteIssuerWired()) return QUOTE_ISSUE_UNWIRED;
  return null;
}

/**
 * 견적을 발행한다 — **배선되지 않았으면 null**(빈 참조가 아니다).
 *
 * 여러 건을 넘기면 **한 견적으로 합쳐진다**(견적 바구니). 합쳐진 문의는 모두 같은 견적 id 를
 * 갖게 되고, 발행기는 그중 어느 하나라도 이미 견적을 갖고 있으면 새로 만들지 않고 그 견적을
 * 돌려준다 — 저장소 쪽의 두 번째 방어선이다(호출부의 quoteIssueBlock 이 첫 번째다).
 *
 * 발행기가 던지면 그대로 올려보낸다. 여기서 삼키면 영업 쪽 사고가 '아무 일도 없었음' 으로 둔갑한다.
 */
export function issueQuote(sources: readonly QuoteIssueSource[]): IssuedQuoteRef | null {
  if (issuer === null || sources.length === 0) return null;
  return issuer(sources);
}
