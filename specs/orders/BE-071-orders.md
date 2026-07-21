---
id: BE-071
title: "주문 백엔드 기능 명세"
functionalSpec: FS-071
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-071. 주문 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-071 주문 (`/orders` · `/orders/:id`) |
| 범위 | 주문 목록 조회, 주문 상세 조회, **주문 갱신(상태 전이 · 입금 확인 · 취소 · 처리 메모) + 그에 수반하는 SKU 재고 차감·복원**, 다른 도메인이 주문번호를 푸는 참조 목록, **재고 차감 시점 설정**의 조회·저장 |
| **범위 밖** | **주문 생성** — 주문을 만드는 것은 관리자가 아니라 **고객의 결제**다. 심이 이를 명시적으로 닫는다(`data-source.ts:64`). **주문 삭제** — 거래 기록이라 지우지 않는다(`data-source.ts:4-5`). **송장 등록·발송처리** — 배송 계약(FS-072) 소관이며 이 계약은 그 결과인 `shippedQuantity` 를 **받아 저장할 뿐**이다(§7.9). **취소/교환/반품의 접수·심사·환불** — 클레임 계약(BE-044) 소관(§7.8). **상품·SKU 재고의 정본 CRUD** — 상품 계약 소관이며 이 계약은 증감을 **요청만** 한다(§7.4). **적립금 원장** — 이 계약은 적립 '예정액'을 **계산해 보일 뿐 한 푼도 지급하지 않는다**(§7.6). **PG 결제·실제 입금 대조** — 결제/정산 계약이 소유한다. '입금 확인'은 운영자가 사실을 **기록**하는 것이다(§7.3) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/orders/data-source.ts` (`orderAdapter` = 공용 `createCrudAdapter` + `patch: applyStockEffects` · 참조 목록 `listOrderRefs`) |
| 도메인 타입 | `apps/admin/src/shared/domain/order.ts`(주문·상태 기계·금액·재고 차감 시점) + `stock.ts`(이동 기록·적용기) + `order-ref.ts`(참조). 화면 표시 규칙(필터·배지·요약)은 `pages/orders/types.ts` 이며 **계약이 아니다** |
| 검증 정본 | **zod 스키마 2벌**(`validation.ts:17-32` — `orderNoteSchema` · `orderCancelSchema`)과 **순수 술어**(`orderTransitionBlock` · `orderCancelBlock` · `shouldDeductStock` · `shouldRestoreStock`). 전이 적법성을 zod 로 다시 쓰지 않는 이유가 코드에 있다(`validation.ts:5-9` — `같은 판단을 zod 로 한 번 더 쓰면 규칙이 두 벌이 되고, 언젠가 한쪽만 고쳐진다`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 주문 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 1건 — 목록·상세·갱신 + 재고 트랜잭션 | `data-source.ts:61-63` `// TODO(backend): GET /api/orders · GET/PUT /api/orders/:id (상태 전이 · 입금 확인 · 취소 · 메모)` + `서버는 주문 갱신 + SKU 재고 증감을 한 트랜잭션으로 처리하고, 재고가 모자라면 422 로 거절한다. 멱등키는 stockAppliedAt · stockRestoredAt 이다.` |
| 심이 **POST 부재를 의도로 못박는다** | `data-source.ts:64` `POST 는 열지 않는다: 주문을 만드는 것은 관리자가 아니라 고객의 결제다.` |
| 심 1건 — 참조 목록의 대체 | `data-source.ts:88` `TODO(backend): GET /api/orders 응답으로 대체하면 사라진다.` |
| 심 1건 — 재고 차감 시점 설정 | `_shared/store.ts:35-37` `// TODO(backend): GET /api/settings/orders · PUT /api/settings/orders { stockDeductAt }` + `차감 시점을 바꾸는 것은 앞으로의 주문에만 적용된다` |
| 등록·삭제 심 **없음** — 의도된 부재 | `data-source.ts:3-5` · `_shared/store.ts:3-5` · `OrderListPage.tsx:3-5` · `build` 에 호출부 0건(`data-source.ts:68` `이 문을 여는 버튼은 관리자 화면에 없다`) · `remove` 호출부 0건 |
| 멱등 키 2개 | `order.ts:238-241`(`stockAppliedAt` — `재차감을 막는 멱등 키다` · `stockRestoredAt` — `복원을 두 번 하지 않게 하는 멱등 키`) · 회귀 `orders.test.ts:308,324,581` |
| 부수효과가 전부 어댑터 `patch` 안에 있다 | `data-source.ts:7-9,44-59,74` (`화면이 '주문 저장'과 '재고 증감'을 두 번 호출하면 하나만 성공하는 창이 생긴다`) |
| 전이 규칙이 존재하고 **화면·저장이 같은 함수를 읽는다** | 정본 `order.ts:293-303` → 버튼 `order.ts:313-317` → `OrderDetailPage.tsx:387-398` / 저장 `order.ts:349-351`(던진다) · 일괄 대상 `types.ts:207-209`. 회귀 `orders.test.ts:173` |
| 취소는 상태가 아니라 나란한 사실이다 | `order.ts:17-22,232-237` · 필터 `types.ts:22,66` · 배지 `OrderTable.tsx:149` |
| 파생값을 저장하지 않는다 | `Order` 에 합계 필드 0건(`order.ts:218-246` 전수) · `orderAmounts`(`:169-175`) · `shipmentProgress`(`:558-562`) |
| **스냅숏은 저장한다** | `OrderLine.productName/optionLabel/unitPrice/pointRate`(`order.ts:100-116`) · `OrderPayment.couponName`(`:138-139`) · 머리말 `order.ts:24-29` |
| 적용기 미배선이면 **멱등키를 찍지 않는다** | `stock.ts:21-25,102-107` · 소비 `data-source.ts:40-42,50,55` · 회귀 `orders.test.ts:373` |
| 유령 저장·409 는 공용 어댑터가 막는다 | `crud.ts:144-146` (`if (!items.some(...)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`) |
| 404 는 공용 어댑터가 이미 던진다 | `crud.ts:109-113` (`HttpError(404, '항목을 찾을 수 없습니다.')`) |
| 낙관적 동시성 토큰 **부재** | `Order` 에 `version`/`updatedAt` 0건(`order.ts:218-246`) · `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/orders` 이 이 화면 파일에서 **0건**(2026-07-22 실측 — 히트는 `claims/` 하위뿐) |
| 멱등키 원장은 있는데 **호출부가 비어 있다** | 원장 `crud.ts:67-77,137-139,149` · 자리 `crud.ts:340-346` ↔ `OrderDetailPage.tsx:191` · `OrderListPage.tsx:187-191` (`idempotencyKey` 없음) |
| 배송 축이 **같은 어댑터로 주문을 쓴다** | `shipments/ShipmentListPage.tsx:59`(`import { ORDER_RESOURCE, orderAdapter }`) · `:288-292`(송장 → 배송대기) · `:337-341`(발송 → `shippedQuantity` + 배송중) |
| 이 라우트의 모듈 소속 | `shared/entitlements/module-resources.ts:31-36` (`commerce.orders` = `group:/orders` · `page:/orders` · `page:/orders/shipments` · `page:/orders/claims`) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열 + **주문 갱신**(EP-03) — 상태를 옮기고 입금을 확인하고 취소하는 것이 운영자의 본업이다(§7.11). **설정 저장(EP-05)은 `admin` 전용** — 차감 시점은 한 번 바꾸면 이후 모든 주문의 재고 흐름이 달라진다.
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. **주문 갱신은 재고 트랜잭션을 포함하므로 10초 → 504**(§7.5).
- **엔타이틀먼트**: 이 리소스는 `commerce.orders` 모듈에 속한다(`module-resources.ts:31-36`). 플랜에 없으면 화면 진입이 잠기지만 **그 판정은 라우트 계층의 것이며 이 계약의 응답 코드가 아니다** — 서버는 권한(403/404)만 말한다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 `useRouteWritePermissions` 를 배선했지만(`OrderListPage.tsx:121` · `OrderDetailPage.tsx:152`) 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다. 권한 강제는 전적으로 서버 책임이다.

## 3. 데이터 계약 (`shared/domain/order.ts` · `stock.ts` · `order-ref.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Order` | `id`(**주문번호를 겸한다** — `ORD-YYYYMMDD-NNNN`) · `orderedAt` · `status` · `customer` · `receiver` · `lines[]` · `payment` · **`canceledAt`**(ISO 또는 `''`) · `cancelReason` · **`stockAppliedAt`**(ISO 또는 `''`) · **`stockRestoredAt`**(ISO 또는 `''`) · `stockMovements[]` · `history[]` · `adminNote` | 목록·상세가 **같은 타입**이다 — 목록도 품목·수령인·결제·이력·재고 이동 전문을 받는다(§7.13). **합계 필드가 없다**(`:218-246` 전수) |
| `OrderLine` | `id` · `productId`(링크용 참조) · **`productName`** · `sku` · **`optionLabel`** · **`unitPrice`** · `quantity` · **`shippedQuantity`** · **`pointRate`** | 굵은 넷은 **주문 시점 스냅숏**(`:100-116`). `productId` 는 표시값의 정본이 아니다 — 상품이 지워져도 이 행은 자기 이름과 금액을 말한다(`:98`). **`shippedQuantity` 만 예외적으로 파생값인데 저장된다**(§7.6·§7.9) |
| `OrderPayment` | `method` · `shippingFee` · `discount` · `couponDiscount` · **`couponName`**(스냅숏) · `pointUsed` · **`paidAt`**(ISO 또는 `''` — 입금 미확인) | `method` 어휘의 정본은 `shared/commerce/payment-settings`(`:131`). **최종 결제금액을 저장하지 않는다**(`:129`) |
| `OrderEvent` | `id`(`evt-<at>-<kind>-<순번>`) · `at` · `kind`(`order`\|`payment`\|`status`\|`stock`\|`cancel`\|`note`) · `label` · `actor` · `note` | **추가만 되는 원장**(`:205`). 중간 삽입이 없어 순서가 흔들리지 않는다(`:337-338`). 상태와 **한 함수에서 함께** 움직인다(`withEvent` — `:340-343`). 회귀 `orders.test.ts:182` |
| `StockMovement`(공통 층) | `id` · `at` · `direction`(`in`\|`out`) · `sku` · `optionLabel`(이동 시점 스냅숏) · `quantity` | append-only. **확정된 사실만** — 계획은 저장하지 않는다. **클레임도 같은 타입을 쓴다**(`stock.ts:4-12`) — 같은 SKU 의 증감이 두 이야기가 되지 않게 |
| `OrderInput` | `Omit<Order, 'id'>` | 저장 입력. **불변 필드(주문일시·주문자·수령인·품목·결제)와 서버 소유 필드(`stockAppliedAt`·`stockRestoredAt`·`stockMovements`·`history`)까지 포함한 전체 치환**이다(`order.ts:254-270` — §7.7) |
| `OrderStatus` | `pending`\|`preparing`\|`holding`\|`waiting`\|`shipping`\|`delivered`\|`confirmed` | **어휘를 새로 짓지 않고 통계에서 승격했다**(`:12-15`). 회귀가 개수·순서를 못 박는다(`orders.test.ts:630`) |
| `OrderRef`(공통 층) | `id` · `orderedAt` · `status` · `customerName` · `total` · `canceled` | **다른 도메인이 주문을 가리킬 때의 최소한**(`order-ref.ts:31-49`). 클레임의 취소 가드가 이 `status` 를 읽는다 |
| `StockDeductAt` | `'order'` \| `'payment'` | **주문이 아니라 설정에 속한다**(§7.3). 기본값 `'payment'`(`_shared/store.ts:31`) |
| 상수 | `ORDER_NOTE_MAX = 500` · `ORDER_CANCEL_REASON_MAX = 200` | `order.ts:250-251` |

**주문 상태 (`ORDER_STATUS_SEQUENCE` — `order.ts:45-53` · 라벨 `:56-64`)**

| 순서 | 값 | 라벨 | 흐름상 위치 |
|---|---|---|---|
| 0 | `pending` | 입금전 | 시작. **여기서 배송 단계로 넘어가려면 입금 확인이 선행**한다 |
| 1 | `preparing` | 배송준비중 | — |
| 2 | `holding` | 배송보류 | **준비 이후에 걸리고 풀리면 대기로 나간다** — 그래서 이 자리다(`:41-43`) |
| 3 | `waiting` | 배송대기 | 송장은 붙었으나 아직 나가지 않았다(배송 계약) |
| 4 | `shipping` | 배송중 | **`hasLeftWarehouse` 의 경계**(`:84-86`) — 여기부터 취소가 아니라 반품이다 |
| 5 | `delivered` | 배송완료 | — |
| 6 | `confirmed` | 구매확정 | 종점 |

> **순서가 곧 규칙이다**(`:41`). 전이 가능 여부를 이 배열의 **인덱스**로 판정한다. 모르는 값은 −1 이 아니라 **끝 다음**으로 보아 fail-closed 로 수렴시킨다(`:78-81`).

**주문 전이 규칙 (순수 — `orderTransitionBlock` `order.ts:293-303`, 회귀 `orders.test.ts:132-180`)**

**판정 순서가 곧 규칙이다.** 코드의 `if` 순서 그대로 옮긴다.

| 판정 순서 | 조건 | 거절 사유 (상수 그대로) |
|---|---|---|
| ① | `order.canceledAt !== ''` | `ORDER_TRANSITION_CANCELED` = `취소된 주문은 상태를 바꿀 수 없습니다.` |
| ② | `order.status === 'confirmed'` | `ORDER_TRANSITION_CONFIRMED` = `구매확정된 주문은 더 이상 진행할 단계가 없습니다.` |
| ③ | `statusIndex(to) <= statusIndex(order.status)` — **역방향 또는 제자리** | `ORDER_TRANSITION_BACKWARD` = `주문 상태는 되돌릴 수 없습니다.` |
| ④ | `order.status === 'pending' && order.payment.paidAt === ''` | `ORDER_TRANSITION_UNPAID` = `입금이 확인되지 않아 배송 단계로 넘길 수 없습니다.` — 코드의 사유가 주석에 있다(`:300`): `돈을 받지 않은 물건이 재고에서 빠져 나간다` |
| — | 그 밖 | `null`(허용). **앞으로는 얼마든지 건너뛴다** — ③이 뒤로만 막는다(§7.10) |

**취소 가드 (순수 — `orderCancelBlock` `order.ts:320-325`, 회귀 `orders.test.ts:199-208`)**

| 판정 순서 | 조건 | 거절 사유 (상수 그대로) |
|---|---|---|
| ① | `order.canceledAt !== ''` | `ORDER_CANCEL_DONE` = `이미 취소된 주문입니다.` |
| ② | `hasLeftWarehouse(order.status)` (= `shipping` 이상) | `ORDER_CANCEL_SHIPPED` = `배송이 시작된 주문은 취소할 수 없습니다. 교환/반품으로 접수해 주세요.` |
| — | 그 밖 | `null`(허용) |

> **클레임의 취소 가드가 같은 `hasLeftWarehouse` 를 읽는다**(`claims/types.ts:256`). 두 화면이 '이 주문을 취소할 수 있는가'에 **같은 답**을 한다 — 서버도 이 사실을 주문 상태 하나에서 낸다(§7.8).

**전이 적용 규칙 (`order.ts:340-394`)**

| 함수 | 정의 |
|---|---|
| `withEvent(order, event)` | 이력 1줄을 덧붙인다. id 에 시각과 종류를 함께 넣어 **같은 밀리초의 두 사건이 키를 겹치지 않게** 한다(`:341`) |
| `applyOrderStatus(order, to, at, actor)` | 가드를 **다시 지나고 막히면 던진다**(`:350-351`). 상태와 이력이 **한 함수에서 함께** 움직인다 |
| `applyOrderPaid(order, at, actor)` | 취소된 주문이면 던진다(`:366`). **이미 확인된 주문에는 아무 일도 하지 않는다**(`:367` — 같은 객체를 그대로 돌려준다. 이력이 늘지 않는다. 회귀 `orders.test.ts:189`) |
| `applyOrderCancel(order, reason, at, actor)` | 가드를 다시 지나고 막히면 던진다(`:382-383`). **상태를 지우지 않고 취소 사실만 얹는다**. 회귀 `orders.test.ts:210` |

**재고 규칙 (순수 — `order.ts:433-546` · `stock.ts:63-107`, 회귀 `orders.test.ts:292-383`)**

| 규칙 | 정의 |
|---|---|
| `isOrderStockApplied(order)` | `stockAppliedAt !== ''` — **멱등 키의 단일 정의**(`:433-435`) |
| `shouldDeductStock(order, deductAt)` | ① 취소되지 않았고 ② `stockAppliedAt === ''` 이고 ③ 시점이 지났다(`'order'` → 언제나 참 / `'payment'` → `payment.paidAt !== ''`). 세 조건이 **모두** 참일 때만(`:443-450`) |
| `shouldRestoreStock(order)` | `canceledAt !== '' && stockAppliedAt !== '' && stockRestoredAt === ''`(`:453-457`) — **차감된 적 없는 주문은 취소해도 복원할 것이 없다**(회귀 `orders.test.ts:340`) |
| `planOrderDeduction(order, at)` | 품목마다 출고 1건. **수량 0 인 품목은 빠진다**(`:465`). id 는 `mv-<at>-out-<line.id>` |
| `planOrderRestore(order, at)` | **`stockMovements` 중 `direction === 'out'` 만 뒤집는다**(`:486-487`) — 품목에서 다시 만들지 않는다(§7.4). id 는 `mv-<at>-in-<movement.id>` |
| `withStockApplied(order, at, movements)` | **이미 찍혔으면 그대로 반환**(`:504`). 아니면 `stockAppliedAt` + 이동 이력 + `kind:'stock'` 이력을 함께 붙인다 |
| `withStockRestored(order, at, movements)` | **이미 찍혔으면 그대로 반환**(`:529`). 같은 멱등 규약 |
| `applyStockMovements(movements)`(공통 층) | 실제 SKU 에 반영. **반영했으면 `true`, 배선되지 않았으면 `false`**. **빈 배열은 `true`**(`stock.ts:102-107`) |
| `applyMovements(units, movements)`(공통 층) | 입고 +, 출고 −. **`Math.max(0, …)` 로 음수 재고를 만들지 않는다**(`stock.ts:75`) — §7.12 |

**저장 한 번의 부수효과 순서 (`applyStockEffects` — `data-source.ts:44-59`)**

1. `next = { ...current, ...input, id: current.id }` — 입력을 덮되 **id 는 저장된 것을 유지**한다.
2. `shouldRestoreStock(next)` → `planOrderRestore` → `applyStockMovements` 가 `true` 면 `withStockRestored`, `false` 면 **`next` 를 그대로**(키를 찍지 않는다).
3. `shouldDeductStock(next, readStockDeductAt())` → `planOrderDeduction` → 같은 규약.
4. 둘 다 아니면 `next`.

> **순서를 복원 우선으로 둔 이유가 코드에 있다**(`:36-38`): 취소된 주문에는 `shouldDeductStock` 이 이미 `false` 를 주므로 두 갈래는 겹치지 않는다 — **그 사실을 순서로도 드러내 둔 것**이다.

**파생값 (저장하지 않는다 — §7.6)**

| 파생 | 함수 | 소비 |
|---|---|---|
| 금액 한 벌(상품금액·배송비·할인·쿠폰·적립금·**최종 결제금액**·**적립 예정액**) | `orderAmounts`(`order.ts:169-175`) | 목록 `types.ts:175-177` · 상세 `OrderDetailPage.tsx:297` |
| 출고 진행(부분배송 여부) | `shipmentProgress`(`order.ts:558-562`) | 배지 `types.ts:168-172` |
| 송장 커버리지 | `shipmentCoverage`(`shipment.ts:347-361`) | 배송 계약이 주문을 밀 수 있는지 판정(`shipment.ts:414-431`) |

## 4. 엔드포인트 명세

### BE-071-EP-01 · 주문 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-071-EL-005, EL-006, EL-008~EL-018, EL-024, EL-025 |
| 심 | `data-source.ts:61` `GET /api/orders` |
| 메서드·경로 | `GET /api/orders` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.13) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 상태 필터·검색·정렬·**금액 계산**을 전부 클라이언트에서 수행하므로 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다(`crud.ts:99-100`).

**응답 200** — `readonly Order[]`. **주문 일시 내림차순**(같은 시각은 주문번호로 안정 정렬 — `sortOrders` `types.ts:112-117`)로 내려준다. 어댑터가 응답 직전에 한 번 더 정렬하지만(`data-source.ts:75`) 서버 순서가 정본이어야 페이징 도입 시(§7.13) 계약이 유지된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-071-EP-02 · 주문 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-071-EL-028~EL-043, EL-048, EL-049 |
| 심 | `data-source.ts:61` `GET /api/orders/:id` |
| 메서드·경로 | `GET /api/orders/:id` |
| 권한 | `admin`, `operator`. 주문 도메인 읽기 권한 없음 → **404 은닉**(§7.14) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Order`(품목·결제·수령인·**처리 이력 전체**·**재고 이동 이력 전체** 포함). `history` 는 **`at` 오름차순**, `stockMovements` 도 **`at` 오름차순**으로 내려준다 — 프론트가 정렬하지 않고 받은 순서 그대로 렌더한다(`OrderDetailPage.tsx:137-146,500-504`).

**에러**: 400(id 형식) · 401 · **404 `ORDER_NOT_FOUND`**(없거나 읽기 권한 없음) · 429 · 500 · 504.

> **어댑터는 이미 옳다**: 공용 `createCrudAdapter.fetchOne` 이 없는 id 에 **`HttpError(404, '항목을 찾을 수 없습니다.')`** 를 던진다(`crud.ts:109-113`). 그래서 화면이 404 와 5xx 를 문구·복구 수단으로 가른다(FS-071-EL-049 — 404 면 '다시 시도'를 아예 숨긴다). 백엔드 연결 시 응답 404 를 같은 타입으로 옮기기만 하면 `EXC-12` 계약이 그대로 유지된다.

---

### BE-071-EP-03 · 주문 갱신 (상태 전이 · 입금 확인 · 취소 · 처리 메모 + **재고 이동**)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-071-EL-014, EL-019, EL-020, EL-023, EL-033, EL-034, EL-036, EL-043, EL-044, EL-045, EL-046, EL-047, EL-050, EL-053 |
| 심 | `data-source.ts:61-63` `PUT /api/orders/:id` + 트랜잭션·422·멱등키 2개 요구 |
| 메서드·경로 | `PUT /api/orders/:id` |
| 권한 | `admin`, `operator`(§7.11). 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다**(§7.7). 부수효과는 **도메인 멱등키 2개**(`stockAppliedAt` · `stockRestoredAt`)가 따로 막지만, 상태·이력·메모 저장은 두 번 적용될 수 있다 |
| 레이트리밋 | 분당 60회. **일괄 처리가 N건의 개별 PUT 을 병렬로 낸다**(§7.10) — 상한을 이 사실 위에서 잡는다 |

**바디**(현재 `OrderInput` — `order.ts:254-270`): `orderedAt` · `status` · `customer` · `receiver` · `lines[]` · `payment` · `canceledAt` · `cancelReason` · `stockAppliedAt` · `stockRestoredAt` · `stockMovements[]` · `history[]` · `adminNote`.

**네 조작이 모두 이 하나의 PUT 이다** — 전용 엔드포인트가 없다. 화면이 도메인 함수(`applyOrderStatus`·`applyOrderPaid`·`applyOrderCancel`·`{...order, adminNote}`)로 **다음 주문을 만들고** 그것을 통째로 보낸다(`OrderDetailPage.tsx:184-206`).

**서버 검증 (요청을 그대로 믿지 않는다 — 순서가 곧 규칙이다)**

1. **불변 필드 무시**: `orderedAt` · `customer` · `receiver` · `lines`(그 안의 `productId`·`productName`·`sku`·`optionLabel`·`unitPrice`·`quantity`·`pointRate`) · `payment.method`·`shippingFee`·`discount`·`couponDiscount`·`couponName`·`pointUsed` 는 관리자가 바꿀 수 없다. 프론트가 `toOrderInput(order)` 로 되돌려 보내지만 **서버는 저장된 값을 정본으로 유지하고 요청 값을 무시한다**(§7.7).
2. **서버 소유 필드 무시**: `stockAppliedAt` · `stockRestoredAt` · `stockMovements` · `history` · `payment.paidAt` · `canceledAt` · `lines[].shippedQuantity` 는 **절대 요청에서 받지 않는다** — 서버가 찍는다(§7.7 【보안 판정】).
3. **전이 재판정**: `status` 가 바뀌면 §3 의 전이 표를 **저장된 주문의 상태·취소·입금으로** 다시 판정한다. 위반 시 **422 `INVALID_STATUS_TRANSITION`**. 프론트 판정은 UX 이며 정본이 아니다(다만 코드가 이미 같은 술어를 두 번 지난다 — `order.ts:350-351`).
4. **취소 재판정**: 취소 요청이면 §3 의 취소 표를 다시 판정한다. 위반 시 **422 `ORDER_CANCEL_BLOCKED`**. **그 사이에 배송이 시작됐으면 거절**된다(`order.ts:382-383`).
5. **입금 확인의 멱등**: 이미 `paidAt !== ''` 이면 **아무 일도 하지 않고 성공**을 반환한다(이력을 늘리지 않는다 — `order.ts:367`). 취소된 주문의 입금 확인은 422.
6. **재고 판정 재실행**: `shouldRestoreStock` → `shouldDeductStock(order, <서버 설정>)` 순서로 **재고 락 안에서** 다시 판정한다. 차감 시점은 **요청이 아니라 EP-05 의 설정**에서 읽는다(§7.3). 재고 부족이면 **422 `STOCK_UNAVAILABLE`**(심이 요구한다 — `data-source.ts:63`).
7. `adminNote` 는 앞뒤 공백 제거 후 0–500자(`ORDER_NOTE_MAX` · `orderNoteSchema`).
8. `cancelReason` 은 **공백만이면 거절**하고 200자 이하(`ORDER_CANCEL_REASON_MAX` · `orderCancelSchema` — `validation.ts:25-32`). 사유 없는 취소를 받지 않는 이유가 코드에 있다(`validation.ts:11-12`).
9. `status` 가 유니온 밖이면 400.

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 응답 본문을 읽지 않고 상세를 재조회한다(`OrderDetailPage.tsx:196`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `status` · `adminNote` · `cancelReason`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `ORDER_NOT_FOUND`** · **409 `CONFLICT`**(§7.7) · **422 `INVALID_STATUS_TRANSITION`**(`error.fields`: `status`) · **422 `ORDER_CANCEL_BLOCKED`**(`error.fields`: `canceledAt`) · **422 `STOCK_UNAVAILABLE`**(`error.fields`: `lines`) · 429 · 500 · 504.

> **`error.fields` 를 프론트가 아직 읽지 않는다.** 화면은 `onError` 에서 status 를 가르지 않고 `'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'` 한 문구 + 참조 코드로 뭉갠다(`OrderDetailPage.tsx:199-203`). **다만 도메인 술어가 던진 사유는 그대로 배너에 실린다**(`:228,247`) — 서버 422 의 문구도 같은 자리에 도달하게 하려면 프론트 변경이 필요하다(§7.15 #6).

---

### BE-071-EP-04 · 주문 참조 목록 (다른 도메인용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-071-EL-055 |
| 심 | `data-source.ts:88` `TODO(backend): GET /api/orders 응답으로 대체하면 사라진다.` |
| 메서드·경로 | **새 엔드포인트를 만들지 않는다** — EP-01 의 응답을 소비 측이 `OrderRef` 로 좁힌다 |
| 권한 | EP-01 과 동일 |
| 멱등성 | 멱등(GET) |

**형태** — `readonly OrderRef[]`(`id` · `orderedAt` · `status` · `customerName` · `total` · `canceled`). 좁히는 이유가 코드에 있다(`data-source.ts:80-83` · `order-ref.ts:31-35`): 클레임·적립 원장·통계가 필요로 하는 것은 '이 번호가 실재하는가 · 지금 어떤 상태인가 · 누가 얼마를 냈는가' 뿐이고, 품목·수령인·결제 상세까지 넘기면 그 화면들이 주문의 내부를 알게 된다.

**판정**: 이 계약은 **엔드포인트를 추가하지 않는다.** `total` 은 EP-01 응답의 파생값이며(`orderAmounts(order).total` — `data-source.ts:96`) 서버가 계산해 실어 줄지, 소비 측이 계산할지는 §7.6 의 '한 곳에서만 계산한다' 규칙을 따라 **서버가 낸다**.

> **현재의 한계 — 시드를 읽는다**: `listOrderRefs()` 가 어댑터가 아니라 `ORDER_SEED` 를 읽는다(`data-source.ts:91`). 그래서 **이 화면에서 방금 옮긴 상태·취소가 클레임의 취소 가드에 즉시 반영되지 않는다.** 코드가 그 한계를 스스로 적어 두었다(`:85-88`). 백엔드가 붙으면 사라진다.

**에러**: EP-01 과 동일.

---

### BE-071-EP-05 · 주문 설정(재고 차감 시점) 조회·저장
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-071-EL-031, EL-054 |
| 심 | `_shared/store.ts:35-37` `GET /api/settings/orders · PUT /api/settings/orders { stockDeductAt }` |
| 메서드·경로 | `GET /api/settings/orders` · `PUT /api/settings/orders` |
| 권한 | 조회 `admin`, `operator`(주문 상세가 값을 표시한다) / **저장 `admin` 전용**(§2) |
| 멱등성 | GET 멱등. PUT 은 **값이 멱등**(같은 값을 두 번 써도 결과가 같다) |
| 레이트리밋 | 분당 30회 |

**응답/바디** — `{ stockDeductAt: 'order' | 'payment' }`. 유니온 밖이면 400. 프론트의 정규화(`setStockDeductAtFromValue` 가 모르는 값을 **무시**한다 — `_shared/store.ts:50-52`)는 UX 이며 정본이 아니다.

**판정 — 이 값은 주문에 저장되지 않는다.** 심이 그 이유를 적는다(`_shared/store.ts:36-37`): `차감 시점을 바꾸는 것은 앞으로의 주문에만 적용된다 — 이미 차감된 주문을 되돌리지 않는다(되돌리면 창고에 없는 재고가 장부에 생긴다).` 서버는 EP-03 의 재고 판정 시점에 **이 설정의 현재값**을 읽는다(§7.3).

**현재 상태**: **이 설정을 바꾸는 화면이 앱에 없다**(FS-071 §7 #1). `writeStockDeductAt`·`setStockDeductAtFromValue`·`STOCK_DEDUCT_OPTIONS` 의 소비처가 **테스트뿐**이고(`orders.test.ts:55,613`), 화면은 `readStockDeductAt()` 을 표시에만 쓴다(`OrderDetailPage.tsx:359-360`). **PUT 의 호출부가 0건**이라는 뜻이다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `stockDeductAt`) · 401 · 403 · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient`)가 재인증으로. 화면은 FS-071-EL-018 배너 | **403** 컬렉션 — 주문 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1). **화면은 403 도 EL-018 의 한 문구로 뭉갠다**(§7.15 #6) | N/A — 0건이면 200 빈 배열 → FS-071-EL-017 의 4분기 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-071-EL-018 | 5초 → 504 → FS-071-EL-018 |
| EP-02 상세 | 400 — id 형식 위반 → 화면은 FS-071-EL-049 의 **일반 오류 분기**(400 을 404 와 구분하지 않는다) | 401 → 전역 인터셉터. 화면은 EL-049 | **읽기 권한 없음 → 404 은닉**(§7.14) — 상세 1건은 전화·이메일·주소·결제 내역을 담는다. 읽기 권한이 있는 `operator` 에게는 403 | **404 `ORDER_NOT_FOUND`** — 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:109-113`). 화면이 '다시 시도'를 숨기고 '목록으로'만 준다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → EL-049 일반 분기(재시도 제공) | 5초 → 504 → EL-049 |
| EP-03 갱신 | 400 `VALIDATION_FAILED` — `status` 유니온 밖 · `adminNote` 500자 초과 · `cancelReason` 공백/200자 초과. **프론트에 400 → 인라인 매핑이 없어**(§7.15 #6) EL-029 배너로 뭉개진다 | 401 → 전역 인터셉터가 재인증으로. **미저장 처리 메모는 유실된다**(FS-071 §7 #18) | `operator` 도 쓰기가 허용되므로(§7.11) 역할 부족 403 은 주문 쓰기 권한 없는 그 밖의 역할에만. **읽기 권한 없음 → 404 은닉**. 화면은 403 을 일반 배너로 뭉갠다 | **404 `ORDER_NOT_FOUND`** — 존재한 적 없는 id | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.7). 어댑터는 **없는 id 에 이미 409 를 던진다**(`crud.ts:144-146`)나 **화면에 `isConflict` 분기가 없어**(grep 0건) 일반 배너로 뭉개진다 | **422 `INVALID_STATUS_TRANSITION`**(§3 전이 표 위반 — 취소됨·구매확정·역방향/제자리·입금전) · **422 `ORDER_CANCEL_BLOCKED`**(이미 취소·출고됨) · **422 `STOCK_UNAVAILABLE`**(재고 부족 — 심이 요구한다). 일괄 처리에서는 **그 건만 실패**하고 나머지는 반영된다(§7.10) | 429 분당 60 + `Retry-After`. **일괄이 N건을 병렬로 내므로 이 축이 가장 먼저 걸린다**(§7.10) | 500 + `traceId` → EL-029 배너 + **참조 코드**(`referenceOf` — `OrderDetailPage.tsx:202,339`), 입력 보존. **재고 트랜잭션이 부분 적용되면 안 된다**(§7.5) | **10초 → 504**(재고 트랜잭션 — §2). **프론트 타임아웃 상한이 없어**(`AbortSignal.timeout` 앱 전역 0건) 서버가 먼저 끊는 구간에만 의존한다 |
| EP-04 참조 목록 | N/A — EP-01 의 응답을 좁혀 쓸 뿐 별도 요청이 없다 | EP-01 과 동일 | EP-01 과 동일(**403**) | N/A — 0건이면 빈 배열. **개별 번호를 못 찾는 것은 소비 측의 `null`** 이다(`order-ref.ts:89-91`) | N/A — 읽기 전용 | N/A — 읽기 전용 | EP-01 의 레이트리밋을 따른다 | EP-01 과 동일 | EP-01 과 동일 |
| EP-05 설정 | 400 `VALIDATION_FAILED` — `stockDeductAt` 이 `'order'\|'payment'` 밖 | 401 → 전역 인터셉터 | **403** — 설정 리소스의 존재는 비밀이 아니다. **저장은 `admin` 전용**이라 `operator` 의 PUT 은 403 | N/A — 단일 설정 리소스이며 언제나 존재한다(기본값 `'payment'`) | N/A — **값이 멱등**이라 last-write-wins 가 곧 정상 의미론이다(§7.3) | N/A — 상태 기계가 없다 | 429 분당 30 | 500 + `traceId`. **화면이 없어 표시 경로도 없다**(§7.15 #1) | 5초 → 504. 위와 같다 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `orderAdapter.fetchAll(signal)` | `GET /api/orders` | EP-01 | `readonly Order[]` | O — **△ 전량·전문이라 페이징·목록 전용 표현이 필요하다**(§7.13) |
| `orderAdapter.fetchOne(id, signal)` | `GET /api/orders/:id` | EP-02 | `Order` | O — **404 를 이미 `HttpError` 로 던진다**(`crud.ts:109-113`) |
| `orderAdapter.update(id, input, context?)` | `PUT /api/orders/:id (상태 전이 · 입금 확인 · 취소 · 메모)` + 트랜잭션·422·멱등키 2개 주석 | EP-03 | `void` | **△ — 전체 치환 계약 변경 필요**(§7.7) · **멱등키 미전달**(§7.7) · **409/422 해소 UI 없음**(§7.15 #6) |
| `applyStockEffects`(어댑터 `patch`) | — (동기 seam) | EP-03 의 부수효과 | `Order` | O — **`applyStockMovements` 가 `false` 면 멱등키를 찍지 않는다**(§7.14) |
| `listOrderRefs()` | `GET /api/orders` (`:88`) | EP-04 | `readonly OrderRef[]` | **△ — 어댑터가 아니라 `ORDER_SEED` 를 읽는다**(`:91`) → 방금 옮긴 상태가 소비 화면에 반영되지 않는다 |
| `readStockDeductAt()` | `GET /api/settings/orders` | EP-05 | `StockDeductAt` | **△ — 모듈 지역 변수다**(`_shared/store.ts:33`). 새로고침하면 기본값으로 되돌아간다 |
| `writeStockDeductAt` · `setStockDeductAtFromValue` | `PUT /api/settings/orders` | EP-05 | `void` | **X — 화면 호출부가 0건**(소비처가 테스트뿐 — FS-071 §7 #1) |
| `ordersCanArrive()` | — (로컬 설정 판정) | **없음(범위 밖)** | `boolean` | O — 결제 설정 계약의 소비. `checkoutCta(readPaymentSettings(),'product')` 를 읽을 뿐 자기 규칙을 만들지 않는다(`_shared/store.ts:62-67`) |
| `orderAdapter.build(...)` | — | **없음(범위 밖)** | `createCrudAdapter` 가 제공하나 **호출부 0건** | O — 계약 없음이 정답(§7.2) |
| `orderAdapter.remove(...)` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답(§7.2) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`update`)에 `X-CSRF-Token` 헤더를 싣는다. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` **이미 충족** — 응답 404 를 `HttpError(404, …)` 로 옮기기만 한다. |
| 409 변환 | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다 — `isConflict` 가 412 도 같은 UX 로 수렴시킨다. **화면 쪽 해소 UI 는 별도 작업이다**(§7.15 #6). |
| 422 변환 | `update` 는 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]`)로 옮긴다. **`field` 이름은 화면이 아는 셋(`status`·`adminNote`·`cancelReason`)과 일치해야 한다.** 현재 화면은 `violations` 를 읽지 않으므로(grep 0건) 배너 문구가 `HttpError.message` 로 수렴하도록 서버 메시지를 사람이 읽는 문장으로 준다. |
| 멱등키 | `update` 는 `context?.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — **자리는 이미 있다**(`crud.ts:44-46,137`). **비어 있는 것은 호출부다**(`OrderDetailPage.tsx:191` · `OrderListPage.tsx:187-191` — §7.15 #3). |
| 부수효과 제거 | `applyStockEffects`(`data-source.ts:44-59`)는 **픽스처 전용**이다 — 백엔드가 붙으면 `applyStockMovements` 호출과 `stockAppliedAt`/`stockRestoredAt`/`stockMovements` 생성이 **전부 사라지고** 서버 응답이 그 자리를 대신한다. 이 함수를 남긴 채 서버도 움직이면 **재고가 이중으로 반영된다**. |
| 가드 유지 | 도메인 술어(`orderTransitionBlock`·`orderCancelBlock`·`applyOrderStatus` 의 `throw`)는 **지우지 않는다** — 서버가 정본이 되어도 화면 버튼과 같은 술어를 읽는 자리가 필요하다(§7.1). 다만 저장의 최종 판정은 서버다. |
| 참조 목록 | `listOrderRefs` 는 EP-01 응답에서 파생하도록 바꾼다 — 시그니처(`() => readonly OrderRef[]`)는 유지하되 시드가 아니라 캐시/응답을 읽는다(§7.15 #8). |

## 7. 핵심 판정

### 7.1 전이·취소 가드 표를 서버가 **그대로** 재판정한다 【정합 판정】

이 도메인의 규칙은 화면이 아니라 도메인이 소유하고, **버튼과 저장이 같은 함수를 읽는다**:

- 정본 `orderTransitionBlock`(`order.ts:293-303`) · `orderCancelBlock`(`:320-325`).
- **버튼 목록**은 `nextOrderStatuses`(`:313-317`)가 그 술어로 걸러 낸 것이고(`OrderDetailPage.tsx:387-398`), **일괄 대상**도 같은 술어다(`eligibleForTransition` — `types.ts:207-209`), **저장**은 `applyOrderStatus` 가 같은 문자열을 `throw` 한다(`:350-351`).
- 회귀 `orders.test.ts:173` 이 그 등가를 **전 상태에 대해** 못 박는다(`버튼(nextOrderStatuses)과 저장(applyOrderStatus)이 같은 술어를 읽는다`).

**판정**: 서버는 §3 의 두 표를 **판정 순서 그대로** 구현하고 위반을 **422 `INVALID_STATUS_TRANSITION` / `ORDER_CANCEL_BLOCKED`** 로 거절한다. 거절 사유 문자열도 상수 그대로 내려준다 — 화면이 사유를 지어내지 않기 때문이다(`OrderDetailPage.tsx:303` · `:413`).

**세 가지를 특히 못박는다**:

1. **취소는 상태가 아니다.** `canceledAt` 이 상태 유니온 **밖에** 있다(`order.ts:232-237`). 서버도 `canceled` 를 상태 값으로 만들면 안 된다 — 같은 유니온에 끼워 넣으면 '배송중이면서 취소 접수된' 주문을 담을 자리가 사라진다(`:17-22`).
2. **취소와 반품을 가르는 선은 `hasLeftWarehouse` 하나다.** 클레임의 취소 가드가 **같은 함수**를 읽으므로(`claims/types.ts:256`), 서버가 클레임 테이블 안에서 '출고했는가'를 다시 정의하면 두 API 가 갈라진다(BE-044 §7.1 과 같은 판정, 반대편에서).
3. **불가능은 비활성 버튼이 아니라 문장으로 표현된다.** 갈 수 없는 단계는 버튼이 아예 없고(`OrderDetailPage.tsx:6-8`), 취소 불가는 버튼 대신 사유가 선다(`:412-415`). 서버의 422 메시지가 **같은 문장**이어야 화면과 서버가 같은 말을 한다.

### 7.2 주문 생성·삭제 — 계약에 존재하지 않는다 【범위 판정】

**코드로 재확인한 사실**:

- `data-source.ts:64`: **`POST 는 열지 않는다: 주문을 만드는 것은 관리자가 아니라 고객의 결제다.`** — 명시적 계약 문장이다.
- `data-source.ts:4-5`: `삭제 UI 는 없다 — 주문은 거래 기록이라 지우지 않는다(감사 성격). 등록 UI 도 없다`.
- `_shared/store.ts:3-5` · `OrderListPage.tsx:3-5` 가 같은 말을 반복한다.
- `App.tsx:306-317` 전수에 `/orders/new`·`/orders/:id/edit`·삭제 경로가 **없다**.
- `orderAdapter.build` 는 `createCrudAdapter` 계약이 요구해 열어 둘 뿐 **호출부가 0건**이다(`data-source.ts:68`). `remove` 도 같다.

**판정**: `POST /api/orders` · `DELETE /api/orders/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**이며, 코드가 다섯 겹(주석 3곳 · 명시 문장 1곳 · 라우트 부재 · 호출부 0건)으로 이를 못박는다. BE-044 §7.6(클레임 생성)과 같은 결이다.

**삭제에 대한 추가 근거**: 주문은 **재고 이동·처리 이력·적립 예정액이 걸린 감사 대상 기록**이다. 지우면 `stockMovements` 와 `history` 가 함께 사라져 **재고가 왜 그 수치인지 설명할 수 없게 된다**. 개인정보 파기 요구는 단건 삭제가 아니라 **보존정책 배치**로 처리할 별도 계약이다(§7.15 #12).

### 7.3 재고 차감 시점 설정이 차감을 지배한다 — 그 값은 **주문이 아니라 설정에 속한다** 【범위 판정】

**정본을 코드로 확인했다**: 모듈 지역 변수 `stockDeductAt`(`_shared/store.ts:33`), 기본값 `'payment'`(`:31`), 읽기 `readStockDeductAt()`(`:40-42`), 쓰기 `writeStockDeductAt`/`setStockDeductAtFromValue`(`:45-52`). 어댑터가 **저장 시점에** 그것을 읽는다(`data-source.ts:53`). **바꾸는 화면은 앱에 없다**(§4 EP-05).

**판정**: 이 값은 **`Order` 에 저장되지 않고 주문 설정 리소스에 속한다.** 근거는 심 주석이다(`_shared/store.ts:36-37`) — 차감 시점 변경은 **앞으로의 주문에만** 적용되고 이미 차감된 주문을 되돌리지 않는다. 되돌리면 **창고에 없는 재고가 장부에 생긴다**.

**따라서 계약에 못박을 것**:

1. **서버는 EP-03 의 재고 판정에서 요청 바디가 아니라 설정 정본을 읽는다.** 클라이언트가 `'order'` 를 실어 보낼 통로를 만들면 **입금 전 주문이 재고를 뺄 수 있다** — 돈을 받지 않은 물건이 재고에서 나가는 바로 그 사고다(`order.ts:300`).
2. **기본값이 `'payment'` 인 것도 계약이다**(`_shared/store.ts:26-30`): `판매를 여는 쪽이 아니라 재고를 지키는 쪽이 기본값이어야 한다`. 결제 설정이 PG 를 끈 채 출발하는 것(`pgSellable` fail-closed)과 **같은 방향**이다.
3. **표시의 한계**: 화면은 `readStockDeductAt()` 을 **렌더 시점**에 읽어 `설정: 입금 확인 시` 를 보인다(`OrderDetailPage.tsx:355-361`). 설정을 바꾸면 **이미 차감된 주문의 문구도 새 설정 이름을 말한다** — '이 주문이 실제로 어떤 규칙에서 차감됐는지'는 데이터에 없다(§7.15 #2).

### 7.4 복원은 품목에서 다시 만들지 않고 **기록된 출고를 뒤집는다** 【정합 판정】

`planOrderRestore`(`order.ts:482-496`)는 `order.lines` 를 보지 않는다. `order.stockMovements` 중 **`direction === 'out'` 인 것만** 골라 방향을 뒤집는다(`:486-487`).

**코드가 그 이유를 적는다**(`:477-481`): `주문서를 나중에 정정해 수량이 바뀌면 빠진 양과 되돌린 양이 어긋나고, 그 차이는 아무도 눈치채지 못한 채 재고에 남는다.`

**판정**: 서버도 **품목이 아니라 이동 원장에서 복원 계획을 만든다.** 이것은 구현 편의가 아니라 계약이다 —

- 품목에서 만들면 `quantity` 가 정정된 주문에서 **차감 3개 · 복원 5개** 같은 비대칭이 생기고, 그 차이는 재고 실사 전까지 드러나지 않는다.
- 이동 원장은 **확정된 사실만** 담으므로(§3) 뒤집기는 언제나 실제로 나간 만큼이다. 회귀가 그 등가를 고정한다(`orders.test.ts:324` — `취소 복원은 실제로 빠져나간 이동만 뒤집는다`).
- **차감된 적이 없으면 복원할 것이 없다** — `shouldRestoreStock` 이 `stockAppliedAt !== ''` 를 요구한다(`order.ts:456`). 회귀 `orders.test.ts:340`.

**부수 계약**: 복원 이동은 원본을 지우지 않고 **입고 1건을 덧붙인다**(`withStockRestored` — `:534`). 그래서 한 SKU 의 증감을 시간순으로 이어 읽을 수 있다. **차감 이동을 삭제해 '없던 일'로 만드는 구현을 금지한다.**

### 7.5 저장 한 번은 한 트랜잭션이다 — 부분 적용을 만들지 않는다 【정합 판정】

**심이 이것을 명시한다**(`data-source.ts:62-63`): `서버는 주문 갱신 + SKU 재고 증감을 한 트랜잭션으로 처리하고, 재고가 모자라면 422 로 거절한다.` 프론트도 같은 이유로 부수효과를 어댑터 `patch` 안에 넣었다(`:7-9` — `화면이 '주문 저장'과 '재고 증감'을 두 번 호출하면 하나만 성공하는 창이 생긴다`).

**판정**: EP-03 은 **주문 갱신 + SKU 재고 증감 + 이동 이력 기록 + 처리 이력 append** 를 **하나의 트랜잭션**으로 수행한다. 어느 하나가 실패하면 전부 롤백한다. 이유:

- **재고만 움직이고 주문이 '입금전'에 남으면** 다음 저장이 재고를 **두 번** 뺀다(`stockAppliedAt` 이 기록되지 않아 멱등 가드가 걸리지 않는다).
- **주문만 '배송중'이 되고 재고가 안 움직이면** 창고 수량과 시스템이 갈린다 — 오프라인 실사 전까지 아무도 모른다.
- **상태만 옮기고 이력이 안 남으면** '배송중인데 이력에는 없는' 주문이 생긴다. 도메인은 그것을 **한 함수로 묶어** 구조적으로 막았다(`withEvent` — `order.ts:340-343`, 회귀 `orders.test.ts:182`). 서버도 같은 원자성을 지킨다.
- **취소만 걸리고 복원이 안 되면** 취소 모달이 사용자에게 한 약속(`이미 차감된 재고는 자동으로 복원됩니다` — `OrderDetailPage.tsx:594`)이 거짓이 된다.

**타임아웃이 조회보다 길어야 하는 이유**: 재고 락 + 다중 SKU 갱신 + 이력 기록이 한 트랜잭션이라 조회보다 느리다. **10초**로 잡고(§2), 그보다 **프론트 상한을 크게** 둔다 — 서버가 먼저 결과를 확정해야 프론트가 결과를 모른 채 끊는 구간이 없다. **현재 프론트에 상한이 없다**(`AbortSignal.timeout` 앱 전역 0건 — §7.15 #10).

### 7.6 파생값을 저장하지 않는다 · 스냅숏은 저장한다 — 그 비대칭이 옳은 이유 【정합 판정】

**저장하지 않는 것**: `orderAmounts`(합계·적립 예정액) · `shipmentProgress`(부분배송) · `shipmentCoverage`(송장 커버리지). `Order` 에 합계 필드가 **0건**이다(`order.ts:218-246` 전수).

**저장하면 무엇이 어긋나는가.** 합계를 저장하는 순간 그 값은 **입력과 독립적으로 늙기 시작한다**. 배송비를 정정하거나 쿠폰 할인을 고치면 항목은 새 값이고 총액은 옛 값인 주문서가 남고, 그때 **어느 쪽이 사실인지 아무도 답할 수 없다** — 고객은 항목을 더해 보고, 정산은 총액을 읽고, 둘은 영원히 다른 숫자를 말한다. 도메인이 그 이유를 직접 적는다(`order.ts:159-167`): `합계까지 저장하면 배송비를 정정한 순간 총액과 항목이 어긋난 주문서가 남는다.` 화면이 각자 더하는 것도 같은 이유로 막는다 — **목록과 상세가 다른 금액을 말하는 사고는 언제나 '두 곳에서 더했다'에서 시작한다**(`:164-165`). 실제로 목록(`types.ts:175-177`)과 상세(`OrderDetailPage.tsx:297`)가 **같은 함수** 하나를 읽는다.

**반대로 스냅숏은 저장한다**: `OrderLine.productName`·`optionLabel`·`unitPrice`·`pointRate` · `OrderPayment.couponName`(`order.ts:100-116,138-139`).

**비대칭이 옳은 이유**: **스냅숏은 입력이고, 파생값은 그 입력의 함수다.** 입력은 시간이 지나면 원본이 **사라지거나 바뀐다** — 상품 가격을 고친 날 3개월 전 주문의 결제금액이 함께 바뀌면 이미 돈이 오간 거래가 사후에 다른 금액이 되고, 그 주문서를 근거로 한 환불·정산이 전부 어긋난다(`:24-29`). 그래서 입력은 **거래 시점에 못 박아야** 하고, 함수는 **언제 계산해도 같은 답이 나오므로 못 박을 이유가 없다**. `productId` 를 함께 드는 것이 그 구분을 보여 준다 — 그것은 '지금 이 상품을 보러 간다'는 링크일 뿐 **표시값의 정본이 아니다**(`:98`).

**판정**: 서버는 `Order` 에 합계·부분배송·커버리지 컬럼을 만들지 않는다. 응답에 파생값을 실을 수는 있으나(EP-04 의 `total` 처럼) **그 값의 정본은 언제나 계산식 하나**여야 한다.

**예외 1건 — `shippedQuantity` 는 파생값인데 저장된다**(§7.9). `applyShippedQuantities`(`shipment.ts:394-400`)가 배송 원장에서 계산한 결과를 주문 품목에 써 넣는다. 이것은 **의도적 비정규화**이며 그 대가는 §7.9 에서 계약으로 다룬다.

**프론트 잔여 1건**: 상세가 적립 예정액을 **직접 `reduce`** 한다(`OrderDetailPage.tsx:468`) — 같은 값이 `amounts.point` 로 이미 계산돼 있는데 쓰지 않는다(`order.ts:171` ↔ `:297`). 지금은 결과가 같지만 규칙이 바뀌면 두 곳이 갈라진다(§7.15 #11).

### 7.7 서버 소유 필드를 요청에서 받지 않는다 · 동시 편집은 last-write-wins 다 【보안 판정】

**현재 클라이언트가 서버 소유 필드 전부를 바디에 실어 보낸다**: `toOrderInput(order)`(`order.ts:254-270`)가 `stockAppliedAt`(`:264`) · `stockRestoredAt`(`:265`) · `stockMovements`(`:266`) · `history`(`:267`) · `payment.paidAt` · `canceledAt` · `lines[].shippedQuantity` 를 **그대로 복사**해 넣고, 화면이 그것을 `update.mutate` 의 `input` 으로 보낸다(`OrderDetailPage.tsx:191` · `OrderListPage.tsx:189`). 픽스처 어댑터는 `{ ...current, ...input }`(`data-source.ts:45`) 로 덮은 뒤 자기가 다시 계산해 넣지만, **계약상 이 필드들은 요청 바디에 존재한다.**

**이것이 만드는 사고 — 조작된 클라이언트 하나면 충분하다**:

1. **`stockAppliedAt: ''` 로 되돌려 보내면 재고를 몇 번이고 뺄 수 있다.** 이 값이 `shouldDeductStock` 의 **유일한** 멱등 근거다(`order.ts:448`).
2. **`stockRestoredAt: ''` 로 되돌려 보내면 취소 1건으로 재고를 무한히 불릴 수 있다.** 이쪽이 더 나쁘다 — 차감은 재고를 줄이지만 **복원은 창고에 없는 재고를 장부에 만든다**. 그 재고로 팔린 주문은 영영 출고되지 않는다.
3. **`stockMovements` 를 조작하면 복원 계획 자체가 위조된다.** `planOrderRestore` 는 **요청으로 온 이동 배열을 그대로 뒤집는다**(§7.4) — 가짜 출고 이동을 심고 취소를 한 번 걸면 **임의 수량 입고**가 만들어진다. 이 화면에서 가장 직접적인 재고 조작 경로다.
4. **`history` 를 조작하면 감사 원장이 위조된다.** '누가 언제 왜 취소했는가'가 사라지고, 이력이 곧 원장인 이 도메인에서 그것은 사고 조사의 근거 전체가 사라지는 일이다.
5. **`payment.paidAt` 을 채워 보내면 입금 확인을 우회한다.** 그 순간 ④ 가드(`ORDER_TRANSITION_UNPAID`)가 풀리고, 차감 시점이 `'payment'` 면 **재고까지 함께 나간다**.
6. **`lines[].unitPrice`·`quantity`·`pointRate` 가 바디에 있다.** 조작하면 결제금액과 적립 예정액이 임의로 바뀐다 — 스냅숏의 목적 자체가 무너진다.
7. **`lines[].shippedQuantity` 를 조작하면 배송 축과 갈라진다** — 부분배송 배지는 이 값을, 커버리지 판정은 배송 원장을 읽는다(§7.9).
8. **이동 id 가 `mv-${at}-out-${line.id}`** 다(`order.ts:467`). `at` 은 현재 어댑터의 `new Date().toISOString()`(`data-source.ts:46`)이라 안전하지만, 서버가 요청의 `at` 을 받으면 **같은 밀리초의 두 요청이 같은 id 를 만든다**.

**판정**: `stockAppliedAt` · `stockRestoredAt` · `stockMovements` · `history` · `payment.paidAt` · `canceledAt` · `lines[]` 전부 · 이동 `id`·`at` 은 **서버가 소유한다.** 요청 바디의 이 값들은 **무시한다** — 파싱조차 하지 않는다. 이것은 UX 개선이 아니라 **재고·금액 무결성 요구**다.

**계약을 둘 중 하나로 바꾼다.**

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | 조작별 좁은 바디로 나눈다: `PUT /api/orders/:id/status { to }` · `POST /api/orders/:id/payment-confirmation` · `POST /api/orders/:id/cancellation { reason }` · `PUT /api/orders/:id/note { adminNote }` | 위조가 구조적으로 불가능하다. **네 조작이 서버에서도 네 사건이 되어** 이력·권한·레이트리밋을 따로 걸 수 있다. 요청 크기가 이력에 비례해 커지지 않는다. 프론트 `toOrderInput` 이 사라진다. **다만 어댑터가 `CrudAdapter` 계약을 벗어나므로** `update` 한 통로에 조작 종류를 실어 보내는 얇은 층이 필요하다 |
| **B (차선)** | PUT 하나를 유지하되 서버가 불변·서버 소유 필드를 **무시**하고 `{ status?, adminNote?, cancelReason? }` 만 읽는다 | 어댑터·화면을 흔들지 않는다. 그러나 `OrderInput` 이 실제로 쓰이지 않는 필드를 계속 실어 보내는 기형이 남고, '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨진다 — 안 A 는 타입이 강제한다 |

**어느 안이든 서버는 요청의 멱등키·이력·이동·스냅숏 금액을 절대 신뢰하지 않는다.**

**낙관적 동시성**: `Order` 에 `version`/`updatedAt` 필드가 **없고**(`order.ts:218-246` 전수), `update` 가 `If-Match` 를 보내지 않는다(`pages/orders` 전 파일 grep **0건** — 2026-07-22 실측). 어댑터의 409 는 **'존재 여부' 기반**이다(`crud.ts:144-146`). 즉 **동시 편집(둘 다 존재)은 last-write-wins** 다 — 두 운영자가 하나는 '배송중', 하나는 '메모'를 저장하면 나중 것이 이긴다. **전체 치환이라 피해가 크다**: 메모만 고친 저장이 상대의 상태 전이를 **통째로 되돌린다**(이력까지 함께). **부수효과만은 두 멱등키가 막지만 상태·이력·메모는 덮인다.** 판정: **안 A 채택 시 다투는 필드가 조작별로 격리되어 `If-Match` 가 선택, 안 B 유지 시 `Order.version` 또는 ETag 가 필수**다.

### 7.8 주문 취소와 클레임의 경계 — **복원 소유권은 주문에 있다** 【경계 판정】

**두 도메인이 같은 재고를 만지는데 소유가 갈려 있다.**

| 사실 | 정본 | 반대편의 역할 |
|---|---|---|
| 주문의 상태·취소·**취소 시 재고 복원** | **이 계약**(`canceledAt` · `stockRestoredAt` · `shouldRestoreStock`) | 클레임은 **읽기만** 한다 |
| 취소·교환·반품의 접수·심사·환불·**교환/반품의 재고 이동** | 클레임 계약(BE-044) | 이 계약은 관여하지 않는다 |

**클레임 쪽의 판정과 정확히 맞물린다**: `movesStock` 이 `kind !== 'cancel'` 을 요구하므로(BE-044 §7.4 · `claims/types.ts:342-344`) **취소 클레임이 완료되어도 클레임 계약은 재고를 한 개도 움직이지 않는다.** 복원은 **주문이 소유한다**.

**판정**: 서버도 이 분업을 그대로 지킨다. **둘 다 복원하면 같은 수량이 두 번 돌아오고, 두 원장 중 어느 쪽이 거짓인지 나중에는 아무도 가리지 못한다.** 주문의 `stockMovements` 와 클레임의 `stockMovements` 는 **같은 공통 타입**이라(§3 · `stock.ts:4-12`) 한 SKU 의 증감을 시간순으로 이어 읽을 수 있는데, 중복 기입은 그 판독을 영구히 망가뜨린다.

**그러나 두 사건을 잇는 계약이 없다 — 이관한다.** **취소 클레임의 완료가 주문 취소를 자동으로 트리거하지 않는다.** 이 앱에는 그 배선이 없다(주문 어댑터를 부르는 클레임 코드 0건) — 클레임 완료와 주문 취소는 **서로 다른 두 번의 조작**이다. 그 결과 **'취소 클레임은 완료됐는데 주문은 취소되지 않은' 상태가 만들어질 수 있고, 그때 재고는 영원히 돌아오지 않는다.** BE-044 §7.12 #9 가 같은 미결을 반대편에서 이관했고, **이 문서도 그대로 이관한다**(§7.15 #7) — 한쪽만 적으면 다른 쪽이 모른다.

**경계의 두 번째 구멍**: 주문이 지워지면(현재 삭제 API 는 없다) 클레임의 취소 가드가 fail-closed 로 막히고 주문번호 링크가 404 로 이어진다. **미처리 클레임을 검사하는 삭제 가드가 어느 쪽에도 없다**(BE-044 §7.12 #14 와 짝).

### 7.9 배송 축이 **같은 PUT 의 두 번째 필자**다 【경계 판정】

**코드로 확인한 사실**: 배송 처리 화면이 주문 어댑터를 직접 import 해서(`shipments/ShipmentListPage.tsx:59`) `PUT` 을 두 지점에서 낸다 —

- **송장 등록** → `orderShipmentBlock(row.order, next, 'waiting')` 이 null 이면 주문을 `waiting` 으로 민다(`:287-292`).
- **발송처리** → `applyShippedQuantities(row.order.lines, next)` 로 **품목의 `shippedQuantity` 를 다시 써 넣고**, `orderShipmentBlock(..., 'shipping')` 이 null 이면 `shipping` 으로 민다(`:327-341`).

`orderShipmentBlock`(`shipment.ts:414-431`)은 **주문 축을 먼저 묻는다** — `orderTransitionBlock` 을 그대로 호출하고(`:419-420`), 그 위에 **'전 품목이 덮였는가'** 하나만 얹는다(`shipmentCoverage` — `:424`).

**판정**:

1. **엔드포인트는 하나다.** 배송 축을 위한 별도 주문 갱신 엔드포인트를 만들지 않는다 — 심이 하나뿐이고 어댑터도 하나다. 다만 서버는 **누가 밀었는지**를 이력(`OrderEvent.actor`)으로 구분해 기록한다.
2. **`shippedQuantity` 의 정본은 배송 원장이다.** 주문 품목의 그 값은 **캐시된 파생값**이며(§7.6 예외) 서버는 **요청에서 받지 않고 배송 원장에서 다시 계산한다**. 받으면 부분배송 배지(`shipmentProgress`)와 커버리지 판정(`shipmentCoverage`)이 서로 다른 셈에서 나온다 — 코드가 그 위험을 직접 적는다(`shipment.ts:391-392`).
3. **배송이 미는 상태 전이도 주문 가드를 먼저 지난다.** 이미 코드가 그렇게 한다(`shipment.ts:419-420`). 서버가 배송 경로에서만 가드를 건너뛰면 **입금 전 주문이 배송중이 되는** 경로가 생긴다.
4. **그러나 두 축의 엄격도가 다르다 — 미결이다.** 이 화면은 **단계 건너뛰기를 허용하고**(③은 뒤로만 막는다 — 입금 확인 직후 '배송완료' 버튼이 '배송준비중'과 나란히 선다. 회귀 `orders.test.ts:149` 가 그것을 **정상으로 못 박는다**), 배송 축은 **전 품목 커버리지를 요구한다**. 같은 주문에 두 규칙이 있고, 주문 화면에서 '배송중'을 직접 누르면 **송장 없이 배송중이 된다**. 어느 쪽이 정본인지 아키텍처가 정해야 한다(§7.15 #5 · FS-071 §7 #5).

### 7.10 일괄 상태 처리 — 부분 실패가 **정상 의미론**이고 트랜잭션 경계는 주문 1건이다 【정합 판정】

**표면이 실재한다**: 목록의 선택 바가 `BULK_TRANSITIONS = ['preparing','waiting','shipping','delivered']`(`types.ts:188-193`) 네 버튼을 세우고, `runBulk`(`OrderListPage.tsx:176-214`)가 `settleAllDetailed`(`shared/bulk.ts`)로 **N건의 개별 `update.mutateAsync` 를 병렬로** 낸다(`:186-192`).

**계약**:

1. **일괄 엔드포인트를 만들지 않는다.** 심이 없고(`data-source.ts:61-64` 에 bulk 언급 0건) 호출부도 EP-03 을 N번 부를 뿐이다. **트랜잭션 경계는 주문 1건**이며, 서버는 건별 원자성만 보장한다(§7.5).
2. **부분 실패는 오류가 아니라 결과다**(EXC-10). 실패한 건은 실패하고 **나머지는 반영된다** — 화면이 그 규약을 명시한다(`:185` `부분 실패도 건수로 알린다`). 실패가 남으면 다이얼로그를 닫지 않고 `M건을 처리하지 못했습니다.` 를 그 안 배너로 보인다(`:204-207`).
3. **적격 판정을 클라이언트가 먼저 한다** — 버튼 글자에 **처리 가능한 건수**가 실린다(`eligibleForTransition` — `:320,332`), 확인 다이얼로그가 **제외되는 건수와 그 이유**를 함께 말한다(`:382-386`). 화면의 규약이 코드에 있다(`OrderListPage.tsx:7-10` — `30건을 골라 눌렀는데 28건이 조용히 거절당하지 않는다`). **그러나 서버는 그 사전 판정을 신뢰하지 않고 건마다 §3 표를 다시 지난다** — 판정과 저장 사이에 다른 운영자가 상태를 옮겼으면 그 건만 422 다.
4. **선택 범위는 current-page(= 현재 보이는 행) 다**(EXC-18). `selectedOrders` 를 `visible` 안에서만 고르고(`:158-161`), '전체 선택'도 보이는 행만 담는다(`:348-353`). 필터·검색이 바뀌면 선택이 지워진다(`useListState` 의 `viewSignature`). **서버는 '조건에 맞는 전부'를 처리하는 API 를 제공하지 않는다** — 그런 요청이 오면 그것은 이 계약 밖이다.
5. **한 배치의 이력이 같은 시각을 갖는다** — `at` 을 루프 **밖에서 한 번** 만든다(`:179`). 서버도 배치 요청들이 같은 `at` 을 실어 보내는 것을 허용하지 말고(§7.7), **자기 시각을 찍되** 같은 배치임을 구분할 필요가 있으면 상관 id 를 별도 헤더로 받는다.

**남은 결함 2건**: (a) **어느 주문이 왜 실패했는지 말하지 않는다** — `settleAllDetailed` 가 사유를 함께 돌려주는데 화면이 `failed` 만 꺼내 쓴다(`:193`). (b) **N건이 멱등키 없이 병렬로 나간다**(§7.7) — 재시도 창이 N배다. 둘 다 §7.15 로 이관한다.

### 7.11 `operator` 에게 쓰기를 연다

BE-010(FAQ)은 `operator` 를 조회 전용으로 두고 모든 쓰기를 403 으로 막는다. **이 도메인은 반대이며, BE-044 §7.8(클레임)과 같은 결이다.**

**근거**: 상태를 옮기고 입금을 확인하고 취소하는 것이 **운영자의 본업**이다. `operator` 가 그것을 할 수 없다면 이 화면을 쓸 사람이 `admin` 뿐이고, 그러면 역할 구분이 무의미해진다. 화면도 그 전제로 서 있다 — 권한이 없으면 체크박스·일괄 바·전이/취소/메모 버튼이 **전부 사라지고** 그 사실을 문구로 알린다(`OrderListPage.tsx:267` · `OrderDetailPage.tsx:370-372`).

**그럼에도 재고가 걸린다 — 그래도 여는 이유**: ① 이동 방향·수량이 **주문에서 결정**돼 운영자가 임의 수치를 넣을 수 없고(`planOrderDeduction` 은 `line.quantity` 를, `planOrderRestore` 는 기록된 이동을 쓴다) ② 모든 이동·전이가 **이력으로 남아**(`history`) 사후 추적이 가능하며 ③ 되돌릴 수 없는 조작에는 **전부 확인 게이트**가 있다(전이·입금 = `ConfirmDialog` `OrderDetailPage.tsx:536-554` · 취소 = 사유를 받는 `Modal` `:558-611` · 일괄 = `ConfirmDialog` `OrderListPage.tsx:378-393`).

**단 하나 분리할 것**: **재고 차감 시점 설정(EP-05)은 `admin` 전용**이다. 그 값은 주문 1건이 아니라 **이후 모든 주문의 재고 흐름**을 바꾼다.

**결론**: EP-01 · EP-02 · EP-03 · EP-04 는 `admin` + `operator`. EP-05 의 PUT 만 `admin`.

### 7.12 음수 재고를 만들지 않는 것은 **버그를 숨긴다** 【정합 판정】

`applyMovements`(`stock.ts:63-77`)가 `Math.max(0, unit.stock + delta)` 로 **음수 재고를 0 으로 깎는다**(`:75`). 회귀가 이 동작을 고정한다(`orders.test.ts:366`).

**판정: 서버는 이 동작을 복제하지 않는다.** 이유:

- 표시 계층에서 음수 재고는 보기 싫지만, **데이터 계층에서 음수는 사실이다** — '팔린 것보다 적게 갖고 있다'는 실사 불일치의 신호이며, 0 으로 깎으면 그 신호가 사라진다.
- **이 도메인에는 차감 전 재고 검사가 없다.** 클레임의 `validateStockPlan` 에 해당하는 것이 주문에는 없다 — `shouldDeductStock` 은 재고 수량을 **보지 않는다**(`order.ts:443-450`). 즉 재고보다 많이 팔린 주문이 그대로 차감을 시도하고, `Math.max` 가 그것을 0 으로 덮는다. **심이 요구하는 `422`(재고 부족 거절 — `data-source.ts:63`)를 실제로 내는 코드가 프론트에 없다.**
- 서버는 **재고 락 안에서 판정하고 위반이면 422 `STOCK_UNAVAILABLE`** 를 낸다(§7.5). 깎지 않는다.

**프론트 후속**: `Math.max(0, …)` 는 픽스처가 서버 없이 그럴듯하게 동작하기 위한 방어이며 계약이 아니다. 다만 이 함수는 **클레임도 쓰는 공통 층**이라(§3) 제거는 두 도메인을 함께 봐야 한다(BE-044 §7.10 과 같은 판정).

### 7.13 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:

1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 필터·검색·정렬·**금액 계산까지** 클라이언트에서 한다. 주문은 **커머스에서 가장 빨리 쌓이는 컬렉션**이고, 행마다 `orderAmounts` 를 다시 계산하므로 비용이 **건수 × 품목수**에 비례한다.
2. **목록이 상세 전문을 담는다.** `Order` 하나를 목록·상세가 공유해 목록 응답에 `receiver`(전화·주소) · `payment` 전문 · `history` · `stockMovements` 가 실린다 — **목록 화면이 쓰는 것은 주문번호·일시·주문자명·상품 요약·결제수단·총액·상태뿐**인데(`OrderTable.tsx:133-152`) 수령인 주소와 처리 이력 전체가 내려온다. §7.14 의 취지와 정면으로 충돌한다.

**판정**: **`OrderSummary` / `Order` 를 분리**하고, EP-01 에 `status`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `OrderSummary` 는 `receiver`·`history`·`stockMovements`·`customer.phone/email` 을 빼고 `lines` 를 **요약 문자열 + 총 수량**으로 축약하며 **`total` 을 서버가 계산해 싣는다**(§7.6 — 계산은 여전히 한 곳이다).

**이관**: 이 변경은 **프론트 대공사**다 — `filterOrdersByStatus`/`searchOrders`/`sortOrders` 와 **건수 배지**(`countOrdersByStatus` — 필터 이전 전체에서 센다)가 서버로 올라가야 하고, 페이지네이션 UI·순번 오프셋(`SeqCell seq={index + 1}` — `OrderTable.tsx:168`)이 함께 붙어야 한다. **URL list state 는 이미 있다**(`useListState`) — `page` 파라미터를 쓰기만 하면 된다. quality-bar IA-04 P0 가 이 화면을 gap 으로 잡고 있다. 그전까지 현 계약(전량)을 유지한다 — 픽스처 10건에서는 드러나지 않는다.

### 7.14 부수효과 seam 이 미배선일 때 **성공을 흉내 내지 않는다** 【정합 판정】

이 코드베이스가 세운 규약 하나가 계약으로 올라가야 한다. **코드가 실제로 하는 것만 적는다.**

| 부수효과 | 멱등키 | 미배선·실패 시 |
|---|---|---|
| 재고 **차감** | `Order.stockAppliedAt`(ISO 또는 `''`) | `applyStockMovements` 가 **`false`** → **멱등키를 찍지 않고 이동도 기록하지 않는다.** 어댑터가 `next` 를 그대로 돌려준다(`data-source.ts:55`). **저장 자체는 성공한다** — 상태·메모는 저장되고 재고만 다음 기회에 다시 시도된다 |
| 재고 **복원** | `Order.stockRestoredAt`(ISO 또는 `''`) | 같은 규약(`data-source.ts:50`). 취소는 기록되고 복원만 미뤄진다 |
| 주문 참조 조회(다른 도메인) | — (읽기) | `orderCatalog()` 가 **`null`** — 빈 배열이 아니다(`order-ref.ts:71-74`). **'없다'와 '모른다'를 가른다**. 회귀 `orders.test.ts:510` |
| 적립금 원장 기입 | — | **존재하지 않는다.** 이 계약은 적립 **예정액**을 계산해 보일 뿐(`linePoint` — `order.ts:125-127`) **한 푼도 지급하지 않는다.** 지급 시점·주체는 이 문서가 정하지 않는다(§7.15 #9) |
| PG 결제·입금 대조 | — | **존재하지 않는다.** '입금 확인'은 운영자가 사실을 **기록**하는 것이고(`applyOrderPaid`), 어떤 코드도 PG 를 조회하지 않는다(이 모듈에 결제 연동 grep 0건) |

**두 재고 처리가 '저장 성공 + 부수효과 보류'인 이유**(`stock.ts:21-25`): `미배선 상태에서 조용히 성공을 반환하면, 주문은 stockAppliedAt 을 못 박고 다시는 차감하지 않는다 — 재고는 그대로인데 원장만 '차감 완료'라고 말하는 상태가 영구히 남는다.` **키를 먼저 찍는 구현이 최악이고, 저장 전체를 거절하는 것은 과하다** — 상태 전이는 재고와 독립적으로 유효한 사실이기 때문이다. (클레임의 적립금 원장은 append-only 라 되돌릴 수 없어 **500 으로 저장 전체를 거절한다** — BE-044 §7.11. 두 규약의 차이는 '되돌릴 수 있는가'에서 나온다.)

**0건은 실패가 아니다**: `applyStockMovements([])` 는 `true` 다(`stock.ts:103`). 회귀 `orders.test.ts:373` 이 두 경로를 함께 고정한다.

**판정**: 서버도 같은 규약을 따른다. **의존 서비스가 응답하지 않을 때 멱등키를 먼저 찍는 구현을 금지한다.** 다만 서버에는 재고 저장소가 **언제나 있으므로** 이 규약이 실제로 걸리는 것은 트랜잭션 실패이고, 그때는 §7.5 에 따라 **전체 롤백**이 옳다 — 미배선 경로는 픽스처 고유의 상태다.

### 7.15 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **🔴 재고 차감 시점 설정을 바꾸는 화면이 없다**(§7.3 · EP-05) — 모델·라벨·선택지·저장 함수가 전부 있는데 소비처가 테스트뿐이고, 값은 프로세스 지역 변수라 새로고침하면 되돌아간다. 운영자는 '설정: 입금 확인 시'를 보지만 그 설정을 어디서도 바꿀 수 없다 | **UI 기획 (화면 신설 — 최우선)** · 백엔드 명세 |
| 2 | **어떤 규칙에서 차감됐는지가 데이터에 없다**(§7.3) — 화면이 렌더 시점의 설정값을 보이므로 설정을 바꾸면 **이미 차감된 주문의 문구도 새 이름을 말한다**. 차감 시점에 적용된 규칙을 이력(`OrderEvent.note`)에 남길지 결정해야 한다 | 백엔드 명세 · UI 기획 |
| 3 | **모든 쓰기에 멱등키가 없다**(§7.7) — 자리(`crud.ts:340-346`)와 원장(`crud.ts:67-77`)이 열려 있는데 호출부가 비어 있다. **일괄 전이는 N건을 병렬로 내므로 창이 N배**다(quality-bar EXC-08 P0). 완화는 값의 멱등성뿐이다 | 프론트 구현 · 백엔드 명세 |
| 4 | **낙관적 동시성 토큰이 없다**(§7.7) — `version`/`updatedAt`/`If-Match` 0건. **전체 치환이라 last-write-wins 의 피해가 크다**(메모 저장이 상대의 상태 전이를 통째로 되돌린다). 화면에도 `isConflict` 분기가 없다(quality-bar EXC-04 P0) | **백엔드 명세 (우선)** · UI 기획 |
| 5 | **주문 축과 배송 축의 엄격도가 다르다**(§7.9) — 주문은 단계 건너뛰기를 허용하고 배송은 커버리지를 요구한다. 주문 화면에서 '배송중'을 직접 누르면 송장 없이 배송중이 된다. 어느 쪽이 정본인지 미정 | **아키텍처 (도메인 · 선행)** · 백엔드 명세 |
| 6 | **실패가 상태코드를 가르지 않는다** — 목록 조회와 저장이 400/403/409/422/500 을 **한 문구**로 뭉갠다(`OrderListPage.tsx:360-372` · `OrderDetailPage.tsx:199-203`). `isForbidden`·`isConflict`·`isUnprocessable` 이 이미 있는데 이 화면이 쓰지 않는다(grep 0건). 서버 422 의 `error.fields` 를 필드 인라인으로 되돌릴 경로도 없다 | UI 기획 · 프론트 구현 |
| 7 | **취소 클레임 완료와 주문 취소를 잇는 계약이 없다**(§7.8) — 클레임만 완료되고 주문이 취소되지 않으면 **재고가 영원히 돌아오지 않는다**. BE-044 §7.12 #9 와 **같은 미결**이며 두 문서를 함께 봐야 한다 | **아키텍처 (선행)** · 백엔드 명세 |
| 8 | **`listOrderRefs()` 가 어댑터가 아니라 시드를 읽는다**(EP-04) — 방금 옮긴 상태·취소가 클레임의 취소 가드에 즉시 반영되지 않는다. `GET /api/orders` 로 대체하면 사라진다 | 백엔드 명세 · 아키텍처 |
| 9 | **적립 예정액이 언제 지급으로 바뀌는지 계약이 없다**(§7.14) — 화면은 '적립 예정 N원'을 보이는데 그것을 원장에 얹는 사건이 이 앱 어디에도 없다. 구매확정이 방아쇠인지, 별도 정산 배치인지 미정 | **아키텍처 (선행)** · 백엔드 명세 |
| 10 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) — §7.5 가 요구하는 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다. 오프라인 감지도 없다(`navigator.onLine` 0건) | 프론트 구현 (quality-bar EXC-05 · EXC-11) |
| 11 | **금액 '유일한 자리' 규칙에 예외 1건**(§7.6) — 적립 예정액을 상세가 직접 `reduce` 한다(`OrderDetailPage.tsx:468`). 같은 값이 `amounts.point` 에 이미 있다 | 프론트 구현 (경미) |
| 12 | 주문 보존정책·개인정보 파기 배치(§7.2) — 관리자 삭제 API 가 아닌 별도 계약. `stockMovements`·`history` 가 함께 사라지면 재고 설명이 끊긴다는 제약이 있다 | 백엔드 명세 |
| 13 | **개인정보 마스킹 기준이 앱 안에 두 벌이다**(§7.14 아래) — 이 화면은 전화·이메일·주소를 **평문 그대로** 보이는데(`OrderDetailPage.tsx:423-438`) 클레임은 신청자를 `'김**'` 으로 마스킹해 든다(`claims/data-source.ts:50`). 목록·상세의 노출 범위와 역할별 마스킹을 서버가 정해야 한다 | **백엔드 명세** · UI 기획 |
| 14 | **일괄 처리의 부분 실패가 건수만 말한다**(§7.10) — `settleAllDetailed` 가 사유를 함께 돌려주는데 화면이 `failed` 만 쓴다. 진행률·취소 UI 도 없다 | UI 기획 · 프론트 구현 |
| 15 | 목록 페이징 + `OrderSummary` 분리(§7.13) — IA-04 P0 와 한 배치로. 건수 배지·정렬 변경도 함께 서버로 올라간다 | 백엔드 명세 · UI 기획 |
| 16 | **금액·수량에 상한이 없다**(§7.12 · FS-071 §7 #14) — `unitPrice`·`quantity` 는 고객 채널이 만든 값이라 지금은 표면이 없지만, 백엔드가 붙으면 신뢰 경계가 생긴다. `orderAmounts` 에 안전 정수 검사가 없다 | 백엔드 명세 · 아키텍처 |
| 17 | 이탈 abort 는 클라이언트만 결과를 버릴 뿐 서버 도달 여부를 보장하지 않는다(`OrderDetailPage.tsx:169,550,563`) — **재고가 이미 움직였는데 화면에 안 보일 수 있다** | 백엔드 명세 · UI 기획 |
| 18 | 401 리다이렉트가 **미저장 처리 메모를 버린다**(프로그램 이동이라 이탈 가드가 발화하지 않는다 — quality-bar EXC-19) | 프론트 구현 |

## 8. 자기 점검

- [x] FS-071 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 4건(`data-source.ts:61-63` · `:88` · `_shared/store.ts:35-37`)을 EP-01·02·03·04·05 로 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**(등록·삭제는 §7.2 에서 '계약 없음'으로 판정, 참조 목록은 EP-01 의 좁힌 표현으로 적고 새 경로를 만들지 않았다, 일괄 처리는 EP-03 의 N회 호출로 §7.10 에 적었다)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한(§7.11 `operator` 쓰기 허용 · EP-05 만 `admin`)·타임아웃(§2 저장 10초)·엔타이틀먼트 모듈 소속만 고유 차이**를 근거와 함께 기술
- [x] **전이 가드 표 2벌을 코드의 `if` 순서 그대로** 들어 올리고 거절 사유 **상수 문자열을 그대로** 적었다(§3). 화면의 버튼 목록과 저장의 거절이 **같은 술어**를 읽는다는 사실을 회귀(`orders.test.ts:173`)로 확인해 §7.1 에 판정으로 남겼다
- [x] 멱등성 판정 — 조회 GET 멱등 / **부수효과 멱등키 2개(`stockAppliedAt` · `stockRestoredAt`)의 안전한 재시도와 거절되는 재시도를 §7.7·§7.14 에 문장으로** 적고, **미배선 시 키를 찍지 않는 규약을 §7.14 로 계약화**했다. `applyOrderPaid` 의 no-op 멱등(`order.ts:367`)도 EP-03 검증 5에 반영했다
- [x] **`StockDeductAt` 의 정본을 코드로 확인**(`_shared/store.ts:31,33,40-42`)하고 **주문이 아니라 설정 리소스에 속한다**고 판정했다(§7.3 · EP-05). 그 값을 요청 바디에서 받으면 안 되는 이유도 적었다
- [x] **복원이 품목이 아니라 기록된 출고 이동을 뒤집는다**는 사실(`order.ts:486-487`)과 그 이유를 §7.4 로 계약화했다
- [x] **파생값 3종을 저장하지 않는 이유와 스냅숏 5종을 저장하는 이유의 비대칭**을 §7.6 에 한 문단으로 썼고, **예외 1건(`shippedQuantity`)**을 §7.9 와 함께 다뤘다
- [x] 보안 판정 2건 — **서버 소유 필드 위조 8경로 + last-write-wins(§7.7)** · **403 vs 404 은닉과 마스킹 기준 이원화(§5 · §7.15 #13)**. 정합 판정 6건 · 범위 판정 2건 · 경계 판정 2건
- [x] **일괄 처리의 부분 실패 의미론과 트랜잭션 경계**를 §7.10 에 적었다 — 일괄 엔드포인트를 **발명하지 않고** EP-03 의 N회 호출임을 코드(`OrderListPage.tsx:186-192`)로 확인했다
- [x] **주문이 재고 복원을 소유한다**는 경계를 §7.8 에 판정으로 남기고, **클레임 완료가 주문 취소를 트리거하지 않는다**는 미결을 BE-044 §7.12 #9 에서 그대로 이관했다(§7.15 #7)
- [x] **확인하지 못한 것을 쓰지 않았다** — 적립금 지급 사건은 '이 앱에 없다'로 적고 시점을 미결로 남겼다(§7.14 · §7.15 #9). PG 연동 부재도 확인 후 적었다. 배송 축의 두 규칙 충돌은 '미결'로 남겼다(§7.9 #4)
- [x] 서버 코드·저장소 설계를 쓰지 않았다
