// 주문 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 목록/상세는 fetchAll/fetchOne,
// 상태 전이·입금 확인·취소·메모 저장은 update 를 쓴다. 삭제 UI 는 없다 — 주문은 거래 기록이라
// 지우지 않는다(감사 성격). 등록 UI 도 없다 — 주문은 고객의 결제가 만든다.
//
// [재고 부수효과는 어댑터 안에 있다] 상태를 옮기는 저장과 재고 이동을 화면이 두 번 호출하면
// 하나만 성공하는 창이 생긴다. 그래서 '주문 갱신 + 재고 증감' 을 patch 한 덩이로 묶는다 —
// 백엔드가 붙으면 이 덩이가 트랜잭션 엔드포인트 한 방으로 바뀐다(교환/반품 어댑터와 같은 구조).
//
// [차감 시점은 설정이 정한다] 언제 빼는지는 `_shared/store` 의 stockDeductAt 이고, 뺄지 말지의
// 판정은 도메인의 shouldDeductStock 하나가 한다 — 화면도 어댑터도 조건을 다시 쓰지 않는다.
import { createCrudAdapter } from '../../shared/crud';
import {
  planOrderDeduction,
  planOrderRestore,
  shouldDeductStock,
  shouldRestoreStock,
  withStockApplied,
  withStockRestored,
  orderAmounts,
} from '../../shared/domain/order';
import type { Order, OrderInput } from '../../shared/domain/order';
import { applyStockMovements } from '../../shared/domain/stock';
import type { OrderRef } from '../../shared/domain/order-ref';
import { sortOrders } from './types';
import { ORDER_SEED, readStockDeductAt } from './_shared/store';

export const ORDER_RESOURCE = 'orders';

let seq = ORDER_SEED.length;

/**
 * 저장 한 번의 재고 부수효과 — 차감과 복원이 **각자의 멱등 키**로 딱 한 번씩만 일어난다.
 *
 * 순서가 중요하다: 취소 복원을 먼저 본다. 같은 저장에서 '취소됨' 과 '아직 차감 안 됨' 이 동시에
 * 참일 수는 없기 때문이 아니라, 취소된 주문에는 shouldDeductStock 이 이미 false 를 주기 때문이다 —
 * 두 갈래가 겹치지 않는다는 사실을 순서로도 드러내 둔다.
 *
 * [배선되지 않았으면 못 박지 않는다] applyStockMovements 가 false('적용할 곳을 모른다')를 주면
 * stockAppliedAt 을 찍지 않고 그대로 둔다. 여기서 찍어 버리면 재고는 그대로인데 주문만 '차감
 * 완료' 라고 말하는 상태가 영구히 남고, 다시는 차감되지 않는다(shared/domain/stock.ts 머리말).
 */
function applyStockEffects(current: Order, input: OrderInput): Order {
  const next: Order = { ...current, ...input, id: current.id };
  const at = new Date().toISOString();

  if (shouldRestoreStock(next)) {
    const movements = planOrderRestore(next, at);
    return applyStockMovements(movements) ? withStockRestored(next, at, movements) : next;
  }

  if (shouldDeductStock(next, readStockDeductAt())) {
    const movements = planOrderDeduction(next, at);
    return applyStockMovements(movements) ? withStockApplied(next, at, movements) : next;
  }

  return next;
}

// TODO(backend): GET /api/orders · GET/PUT /api/orders/:id (상태 전이 · 입금 확인 · 취소 · 메모)
//   · 상태 전이는 재고 이동을 동반할 수 있다 — 서버는 주문 갱신 + SKU 재고 증감을 한 트랜잭션으로
//     처리하고, 재고가 모자라면 422 로 거절한다. 멱등키는 stockAppliedAt · stockRestoredAt 이다.
//   · POST 는 열지 않는다: 주문을 만드는 것은 관리자가 아니라 고객의 결제다.
export const orderAdapter = createCrudAdapter<Order, OrderInput>({
  scope: ORDER_RESOURCE,
  seed: ORDER_SEED,
  // 어댑터 계약이 요구해서 열어 둘 뿐, 이 문을 여는 버튼은 관리자 화면에 없다(고객 채널이 만든다)
  build: (input) => {
    seq += 1;
    const day = input.orderedAt.slice(0, 10).replaceAll('-', '');
    return { id: `ORD-${day}-${String(seq).padStart(4, '0')}`, ...input };
  },
  patch: applyStockEffects,
  sort: sortOrders,
});

/**
 * 다른 도메인이 주문번호를 풀 때 쓰는 목록 — `src/wiring.ts` 가 이것을 조회기로 꽂는다.
 *
 * 여기서 OrderRef 로 좁히는 이유: 반품·적립 원장이 필요로 하는 것은 '이 번호가 실재하는가 · 지금
 * 어떤 상태인가' 뿐이고, 품목·수령인·결제 상세까지 넘기면 그 화면들이 주문의 내부를 알게 된다
 * (shared/domain/order-ref.ts 머리말).
 *
 * [왜 어댑터가 아니라 시드인가] createCrudAdapter 는 현재 목록을 밖에 내주지 않는다(비공개 클로저).
 * 픽스처 단계에서는 시드가 곧 카탈로그이며, 방금 여기서 옮긴 상태가 반품 화면의 참조에 즉시
 * 반영되지 않는 것이 그 한계다 — 쿠폰 카탈로그(listCatalogCoupons)가 같은 자리에서 같은 선택을
 * 해 두었다. TODO(backend): GET /api/orders 응답으로 대체하면 사라진다.
 */
export function listOrderRefs(): readonly OrderRef[] {
  return ORDER_SEED.map((order) => ({
    id: order.id,
    orderedAt: order.orderedAt,
    status: order.status,
    customerName: order.customer.name,
    total: orderAmounts(order).total,
    canceled: order.canceledAt !== '',
  }));
}
