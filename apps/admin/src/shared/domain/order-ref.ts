// 주문 조회기 — **자리만** 만든다 (목록의 정본은 주문 관리가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 주문번호를 가리키는 손가락이 없었다]
// 주문번호를 말하는 화면은 셋인데 어느 것도 주문에 닿지 못했다.
//   · 교환/반품(/products/returns) — `orderNo: string`. 그냥 문자열이다. 'ORD-20260712-0031' 이
//     실재하는 주문인지, 그 주문이 지금 어떤 상태인지 화면은 모른다.
//   · 회원 상세의 적립금 원장      — PointEntry.orderNo 도 같다. 어떤 주문이 적립을 만들었는지
//     써 놓고도 그 주문을 열 수 없다.
//   · 주문 통계(/stats/orders)     — 상태별 건수를 세면서 그 건들이 무엇인지 가리키지 못한다.
// 그래서 운영자는 반품 화면에서 주문번호를 **손으로 외워** 다른 화면에 옮겨 적었다.
//
// [왜 소비자가 주문 모듈을 직접 import 하지 않나]
// `pages/products` → `pages/orders`, `pages/members` → `pages/orders` 는 페이지 간 결합이고
// code-quality 축1(page-coupling, blocker, 임계값 0건)이 그대로 잡는다. 그래서 방향을 뒤집는다:
// 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 목록을 꽂는 일은 두 도메인을 모두 아는
// `src/wiring.ts` 가 한다. 소비 화면은 끝까지 '주문 관리' 라는 모듈을 모른 채 번호만 들고 있는다.
// (같은 결의 선례: shared/domain/coupon-catalog.ts · faq-catalog.ts.)
//
// [왜 링크 경로가 여기 있나] 화면 사이를 잇는 실은 **경로 문자열 하나뿐**이다. 경로는 모듈
// import 가 아니라서 결합이 아니고, 한 곳에 모아 두어야 라우트가 바뀔 때 한 번만 고친다.
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 조회기가 없을 때 빈 배열을 주면 반품 화면은 **'주문 정보를 찾을 수 없습니다'** 라는 완결된
// 문장을 그린다 — 운영자는 그것을 사실로 읽고 '주문이 삭제됐구나' 라고 결론짓는다. 배선 사고를
// 데이터 사고처럼 보이게 만드는 화면이다. 그래서 '없다' 와 '모른다' 를 가른다.
// ─────────────────────────────────────────────────────────────────────────────
import type { OrderStatus } from './order';

/**
 * 다른 화면이 주문을 가리킬 때 필요한 **최소한**의 사실.
 *
 * 품목·수령인·결제 상세는 여기 없다. 그것은 주문 관리가 소유하는 축이고, 가리키는 쪽이 알아야 할
 * 이유가 없다 — 계약에 섞으면 어느 화면이 주인인지 다시 흐려진다. 가리키는 쪽에 필요한 것은
 * '이 번호가 실재하는가 · 지금 어떤 상태인가 · 누가 얼마를 냈는가' 뿐이다.
 */
export interface OrderRef {
  /** 주문번호를 겸하는 주문 id — 반품·적립 원장이 이 값을 키로 삼는다 */
  readonly id: string;
  /** 주문 일시 ISO */
  readonly orderedAt: string;
  readonly status: OrderStatus;
  /** 주문자 이름 — 표시용 스냅숏 */
  readonly customerName: string;
  /** 최종 결제금액(원) — 계산의 정본은 주문 모듈의 orderAmounts 다 */
  readonly total: number;
  /** 취소된 주문인가 — 취소는 상태가 아니라 나란한 사실이다(order.ts 머리말) */
  readonly canceled: boolean;
}

type OrderLookup = () => readonly OrderRef[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let lookup: OrderLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerOrderLookup(next: OrderLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetOrderLookup(): void {
  lookup = null;
}

/**
 * 지금 가리킬 수 있는 주문 — **배선되지 않았으면 null**(빈 배열이 아니다).
 *
 * 조회기가 던지면 그대로 올려보낸다. 여기서 삼키면 주문 쪽 사고가 '주문 0건' 으로 둔갑한다.
 */
export function orderCatalog(): readonly OrderRef[] | null {
  if (lookup === null) return null;
  return lookup();
}

/**
 * 주문번호 → 주문 색인.
 *
 * `find` 대신 Record 를 쓰는 이유: 조인은 목록 길이만큼 반복되고, 무엇보다 `find(...) ?? list[0]`
 * 같은 '못 찾으면 아무거나' 실수를 구조적으로 막는다 — 못 찾은 것은 undefined 로 드러나야 한다.
 */
export function orderById(catalog: readonly OrderRef[]): Readonly<Record<string, OrderRef>> {
  const byId: Record<string, OrderRef> = {};
  for (const order of catalog) byId[order.id] = order;
  return byId;
}

/** 카탈로그에서 한 건 — 없으면 null(삭제됐거나 아직 모르는 번호) */
export function findOrderRef(catalog: readonly OrderRef[], orderNo: string): OrderRef | null {
  return orderById(catalog)[orderNo] ?? null;
}

/** 주문 상세로 가는 경로 — 주문번호를 눌러 원본으로 건너뛰는 유일한 실 */
export function orderDetailPath(orderNo: string): string {
  return `/orders/${orderNo}`;
}
