// 적립금 원장 기입기 — **자리만** 만든다 (원장의 정본은 회원 관리가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 환불이 적립금을 돌려주지 못했다]
// 고객이 적립금을 써서 결제한 주문을 반품하면, 카페24는 **'환불완료' 처리를 한 순간에** 그 적립금을
// 되돌려 준다. 우리 앱에는 그 자리가 없었다: 반품이 '완료' 가 되어도 고객이 쓴 적립금은 사라진 채였고,
// 화면 어디에도 그 사실이 드러나지 않았다.
//
// [왜 클레임 화면이 회원 저장소를 직접 부르지 않나]
// `pages/orders → pages/members` 는 페이지 간 결합이고 code-quality 축1(blocker · 임계값 0건)이
// 그대로 잡는다. 그리고 방향도 틀렸다 — '적립금 잔액이 얼마인가' 는 회원 관리가 답하는 질문이고,
// 클레임은 '이 환불이 얼마를 되돌려야 하는가' 만 안다. 그래서 공통 층은 계약과 등록기만 갖고,
// 두 도메인을 모두 아는 `src/wiring.ts` 가 구현을 꽂는다(shared/domain/stock.ts 와 같은 이음매).
//
// [원장은 덧붙이기만 한다 — 이 파일에서 가장 중요한 제약]
// 복원은 기존 차감 행을 고치거나 지우는 것이 **아니라** 양수 행을 하나 더 붙이는 일이다. 과거 행을
// 손대면 '고객이 3,000원을 썼다' 는 사실 자체가 장부에서 사라지고, 그 순간 잔액은 맞는데 왜 맞는지
// 아무도 설명할 수 없는 원장이 된다. 그래서 계약은 **양수 1건**만 받는다 — 음수를 넣을 통로가 없다.
//
// [배선 전에 '복원했다' 고 말하지 않는다]
// 미배선 상태에서 조용히 성공을 반환하면, 클레임은 환불 완료 시각(멱등 키)을 못 박고 **다시는
// 복원하지 않는다** — 적립금은 그대로인데 원장만 '복원 완료' 라고 말하는 상태가 영구히 남는다.
// 그래서 append 는 배선되지 않았으면 false('모른다')를 돌려주고, 호출부는 키를 찍지 않는다
// (shared/domain/stock.ts 의 applyStockMovements 와 똑같은 규약).
// ─────────────────────────────────────────────────────────────────────────────

/** 원장에 덧붙일 지급 1건 — **양수만** 받는다(머리말) */
export interface PointRestore {
  /** 회원 id — 비회원 주문에는 원장이 없다(호출부가 먼저 거른다) */
  readonly memberId: string;
  /** 어떤 주문이 만든 지급인가 — 회원 상세의 원장이 이 번호로 주문을 가리킨다 */
  readonly orderNo: string;
  /** 원장에 남을 사유 — '반품 환불 적립금 복원' */
  readonly reason: string;
  /** 지급액(원) — 0 이하는 기입할 것이 없다는 뜻이고, 음수는 이 통로로 들어올 수 없다 */
  readonly amount: number;
  /** 기입일 'YYYY-MM-DD' — 원장 행의 date 와 같은 모양 */
  readonly date: string;
}

type PointLedgerAppender = (entry: PointRestore) => void;

/** 미배선 상태 — null 은 '원장이 비었다' 가 아니라 '원장이 어디 있는지 모른다' 다 */
let appender: PointLedgerAppender | null = null;

/** 기입기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerPointLedgerAppender(next: PointLedgerAppender): void {
  appender = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetPointLedgerAppender(): void {
  appender = null;
}

/**
 * 원장에 지급 1건을 덧붙인다. **기입했으면 true, 배선되지 않았으면 false**.
 *
 * 0원은 기입할 것이 없으므로 true 다 — 아무 일도 일어나지 않은 것과 실패는 다르다(적립금을 쓰지
 * 않은 주문의 환불이 '원장 미배선' 으로 막히면, 있지도 않은 문제로 환불이 멈춘다).
 * 음수는 계약 위반이라 던진다: 복원이 차감으로 둔갑하는 것은 조용히 넘길 사고가 아니다.
 * 기입기가 던지면 그대로 올려보낸다 — 여기서 삼키면 원장 사고가 '조용한 성공' 으로 둔갑한다.
 */
export function appendPointRestore(entry: PointRestore): boolean {
  if (entry.amount < 0) throw new Error('적립금 복원은 양수만 기입할 수 있어요.');
  if (entry.amount === 0) return true;
  if (appender === null) return false;
  appender(entry);
  return true;
}
