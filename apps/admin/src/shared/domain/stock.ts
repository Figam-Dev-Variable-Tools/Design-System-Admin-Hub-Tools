// 재고 이동 도메인 — 확정된 이동 기록 한 벌과, 그것을 SKU 재고에 적용하는 순수 규칙
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 페이지 밖으로 나왔나 — 같은 이동을 두 도메인이 기록한다]
// 재고를 움직이는 사건은 하나가 아니다.
//   · 교환/반품 완료(/products/returns) — 회수분이 들어오고, 재발송분이 나간다.
//   · 주문 확정(/orders)                — 팔린 수량이 나가고, 취소되면 되돌아온다.
// 이 기록이 페이지 안에 있으면 주문은 반품의 타입을 가로질러 import 해야 하고
// (code-quality 축1 page-coupling · blocker · 임계값 0건), 그렇게 하지 않으면 **같은 사실을
// 두 벌로 적게 된다** — 그 순간 '이 SKU 가 왜 3개 줄었는가' 를 한 화면에서 읽을 수 없다.
// 그래서 이동 기록과 산술은 공통 층이 갖고, 두 화면은 서로를 끝까지 모른 채 같은 원장을 쓴다.
// (승격 이전 자리: pages/products/returns/types.ts — 그쪽은 이제 여기서 재수출한다.)
//
// [왜 적용기(applier)가 조회기 모양인가]
// 이동을 **계산**하는 것과 실제 상품 SKU 에 **반영**하는 것은 소유자가 다르다. 재고 수치의 정본은
// 상품 저장소(pages/products/_shared/store)이고, 주문·반품은 '무엇이 몇 개 움직였는가' 만 안다.
// 여기서 상품 저장소를 직접 부르면 shared → pages 역의존이 생긴다. 그래서 공통 층은 **자리만**
// 만들고, 두 도메인을 모두 아는 `src/wiring.ts` 가 구현을 꽂는다
// (선례: shared/domain/coupon-catalog.ts · faq-catalog.ts · supplier.ts).
//
// [왜 배선 전에 '적용했다' 고 말하지 않는가]
// 미배선 상태에서 조용히 성공을 반환하면, 주문은 stockAppliedAt 을 못 박고 **다시는 차감하지
// 않는다** — 재고는 그대로인데 원장만 '차감 완료' 라고 말하는 상태가 영구히 남는다. 그래서
// applyStockMovements 는 배선되지 않았으면 false('모른다')를 돌려주고, 호출부는 멱등 키를
// 찍지 않은 채 다음 기회에 다시 시도한다.
// ─────────────────────────────────────────────────────────────────────────────

/** 재고 이동 방향 — 입고(창고로 들어옴) / 출고(고객에게 나감) */
export type StockDirection = 'in' | 'out';

/**
 * 확정된 재고 이동 한 건 — 완료·차감 시점에 기록되어 원장(요청·주문)에 남는다(감사 이력).
 * 어떤 SKU 가 몇 개 움직였는지를 상품 옵션이 나중에 바뀌어도 읽을 수 있게 스냅숏으로 들고 있다.
 */
export interface StockMovement {
  readonly id: string;
  /** 이동 시각 ISO */
  readonly at: string;
  readonly direction: StockDirection;
  readonly sku: string;
  /** 이동 시점의 옵션 표기 — '블랙 / M' */
  readonly optionLabel: string;
  readonly quantity: number;
}

/**
 * 이동이 적용될 수 있는 재고 단위의 **최소 모양**.
 *
 * 상품 옵션(ProductVariant)이 지금의 유일한 소비자지만, 이 파일이 그 타입을 알 필요는 없다 —
 * 알면 shared → pages 역의존이다. 구조만 요구하고 나머지 필드는 제네릭이 그대로 통과시킨다.
 */
interface StockUnit {
  readonly sku: string;
  readonly stock: number;
}

/**
 * 재고 이동을 SKU 재고에 적용한다(순수) — 입고 +, 출고 −. 음수 재고는 만들지 않는다.
 *
 * 제네릭인 이유: 호출부는 ProductVariant 배열을 넣고 **ProductVariant 배열을 그대로** 돌려받아야
 * 한다. StockUnit[] 로 좁혀 반환하면 옵션 추가금액·품절 플래그가 반환값에서 사라진다.
 */
export function applyMovements<T extends StockUnit>(
  units: readonly T[],
  movements: readonly StockMovement[],
): readonly T[] {
  return units.map((unit) => {
    const delta = movements.reduce(
      (sum, movement) =>
        movement.sku === unit.sku
          ? sum + (movement.direction === 'in' ? movement.quantity : -movement.quantity)
          : sum,
      0,
    );
    return delta === 0 ? unit : { ...unit, stock: Math.max(0, unit.stock + delta) };
  });
}

/* ── 적용기 배선 자리 (머리말 참조) ────────────────────────────────────────── */

type StockApplier = (movements: readonly StockMovement[]) => void;

/** 미배선 상태 — null 은 '적용할 재고가 없다' 가 아니라 '적용할 곳을 모른다' 다 */
let applier: StockApplier | null = null;

/** 적용기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerStockApplier(next: StockApplier): void {
  applier = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetStockApplier(): void {
  applier = null;
}

/**
 * 이동을 실제 재고에 반영한다. **반영했으면 true, 배선되지 않았으면 false**.
 *
 * 빈 이동 목록은 반영할 것이 없으므로 true 다 — 아무 일도 일어나지 않은 것과 실패는 다르다.
 * 적용기가 던지면 그대로 올려보낸다: 여기서 삼키면 재고 사고가 '조용한 성공' 으로 둔갑한다.
 */
export function applyStockMovements(movements: readonly StockMovement[]): boolean {
  if (movements.length === 0) return true;
  if (applier === null) return false;
  applier(movements);
  return true;
}
