---
id: BE-072
title: "배송 처리 백엔드 기능 명세"
functionalSpec: FS-072
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-072. 배송 처리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-072 배송 처리 (`/orders/shipments` — **상세 라우트 없음**, `App.tsx:306-317` 전수) |
| 범위 | 배송 건(= 송장 1장) 목록 조회, **송장 등록(배송 건 생성)**, **발송처리(배송 건 상태 전이)**, 택배사별 배송 건수 조회(역방향 — 택배사 삭제 가드가 묻는다) |
| **범위 밖** | **배송 건 삭제** — 진입점이 없다. 잘못 붙인 송장은 지우는 것이 아니라 다시 붙이는 것이고 나간 배송의 기록은 남아야 한다(`data-source.ts:4-5` · §7.10). **주문의 상태 전이·재고 부수효과** — 주문 계약 소관이며 이 화면은 `orderAdapter` 를 **지나갈 뿐** 자기 어댑터로 주문을 고치지 않는다(`data-source.ts:7-10` · §7.7). **택배사 카탈로그 CRUD** — BE-043(배송 정책) 소관이며 이 계약은 **읽기만** 한다(§7.7). **실시간 배송 추적** — 링크까지만 만든다. 상태·진행률을 지어내지 않는다(`shipment.ts:105-109` · §7.6). **고객 알림** — 발송처리가 발화 지점이라고 심이 적어 두었으나 **알림 자체가 없다**(`data-source.ts:98` · §7.13 #9) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/orders/shipments/data-source.ts` (`shipmentAdapter` = 공용 `createCrudAdapter`, `SCOPE = 'shipments'` · 역방향 조회기 `countShipmentsByCarrier`). **주문 쪽은 `pages/orders/data-source.ts` 의 `orderAdapter` 를 그대로 쓴다** |
| 도메인 타입 | **`apps/admin/src/shared/domain/shipment.ts`(494행)** — 택배사·배송 건·송장 검증·부분 발송 판정·전이가 전부 여기 있다. 화면 전용 표시 규칙은 `pages/orders/shipments/types.ts`, 주문 축은 `shared/domain/order.ts` |
| 검증 정본 | **zod 스키마가 없다.** 이 화면은 `useCrudForm` 을 쓰지 않는다 — 검증 정본은 순수 규칙(`invoiceNoBlock` · `duplicateInvoiceBlock` · `shipmentTransitionBlock` · `orderShipmentBlock`)이며 다이얼로그가 저장 직전에 그것을 부른다(`InvoiceBulkDialog.tsx:153-181`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 배송 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 1건에 목록·생성·수정이 함께 있다 | `data-source.ts:95` `// TODO(backend): GET /api/shipments · POST /api/shipments · PUT /api/shipments/:id` |
| 심이 **유일 제약을 서버 책임으로 못박는다** | `data-source.ts:96-97` `POST 는 (carrierId, invoiceNo) 유일 제약을 서버에서도 건다 — 화면의 중복 검사는 사전 안내이고, 동시에 두 운영자가 같은 번호를 넣는 경합은 서버만 막을 수 있다(409).` |
| 심이 **알림의 발화 지점**을 지목한다(구현은 없다) | `data-source.ts:98` `발송처리(waiting → shipping)는 고객 알림의 발화 지점이다. 지금은 이력만 남는다.` |
| 심 1건 — 택배사별 배송 건수(역방향) | `data-source.ts:118` `TODO(backend): GET /api/shipments?carrierId= 의 총건수로 대체하면 사라진다.` |
| **삭제 심 없음 — 의도된 부재** | `data-source.ts:4-5` · `shipmentAdapter.remove` 호출부 **0건**(grep) |
| 멱등키 = 송장 중복 판정 | `shipment.ts:282-297` (`duplicateInvoiceBlock` — 같은 `carrierId` + 정규화된 같은 `invoiceNo`) · 회귀 `shipment.test.ts:235-256` · 픽스처 불변식 `shipments.test.ts:89-92` |
| 송장번호 규칙 | `shipment.ts:241`(`INVOICE_NO_MAX = 30`) · `:250`(`INVOICE_NO_RE`) · `:252-255`(거절 상수 3종) · `:257-260`(`normalizeInvoiceNo` — 앞뒤 공백만) · 회귀 `shipment.test.ts:204-233` |
| 배송 건 전이 가드 | `shipment.ts:450-461` · 회귀 `shipment.test.ts:385-421` |
| 주문 축 다리 — **주문에 먼저 묻는다** | `shipment.ts:414-431`(`orderShipmentBlock` 이 `:419` 에서 `orderTransitionBlock` 을 먼저 부른다) · 회귀 `shipment.test.ts:324-381` |
| 시각 도장을 덮지 않는다 | `shipment.ts:485-492` · 회귀 `shipment.test.ts:410-415` |
| 부분 발송 셈의 정본이 하나다 | `shipment.ts:312-328`(`allocateCovered` — **module-private, export 되지 않는다**) → `:347` · `:378` · `:394` · 회귀 `shipment.test.ts:260-320` |
| `shippedQuantity` 는 **계산의 결과**다 | `shipment.ts:388-399` · 소비 `ShipmentListPage.tsx:327-330` · 주문 쪽 소비 `order.ts:557-562`(`shipmentProgress`) |
| 카탈로그 조회기는 **미배선 시 null** | `shipment.ts:77-98` · 회귀 `shipment.test.ts:137-155` · 화면 분기 `InvoiceBulkDialog.tsx:215-225` |
| 택배사 삭제는 **fail-closed** | `shipment.ts:147-163`(`carrierDeleteBlock` — usage `null` → `CARRIER_DELETE_UNKNOWN`) · 소비 `pages/products/shipping/components/CarrierSection.tsx:166-168` · 회귀 `shipment.test.ts:188-193` |
| 배선 지점 2개(방향이 반대) | `apps/admin/src/wiring.ts:171-173` (`registerCarrierCatalogLookup(listShippingCarriers)` · `registerCarrierUsageLookup(countShipmentsByCarrier)`) |
| **동시성 토큰이 없다** | `grep -rn "If-Match\|updatedAt\|version" apps/admin/src/pages/orders/shipments apps/admin/src/shared/domain/shipment.ts` = **0건**(2026-07-22 실측) |
| **멱등키를 넘기지 않는다** | `grep -rn "idempotencyKey\|submitLock" apps/admin/src/pages/orders` = **0건**. 자리(`crud.ts:323,345`)와 원장(`crud.ts:67-77,128,149`)은 **있다** |
| 유령 저장·409 는 공용 어댑터가 막는다 | `crud.ts:144-146` (`throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 + **송장 등록·발송처리**(§7.11) — 오늘 무엇을 내보내는가는 운영자의 본업이고, 여기를 닫으면 이 화면을 쓸 사람이 `admin` 뿐이다. 주문 도메인 읽기 권한 없는 주체 → 컬렉션 403 / **개별 배송 건 404 은닉**(§7.11).
- **CSRF**: 쓰기(POST·PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. **쓰기 10초 → 504** — 이 화면의 저장은 **한 조작이 두 리소스를 지나고**(배송 건 + 주문), 주문 PUT 은 `orderAdapter.patch` 안에서 **재고 트랜잭션을 동반할 수 있다**(`pages/orders/data-source.ts:44-59` — 입금은 확인됐으나 아직 미차감인 주문이 배송준비중으로 넘어가는 저장이 그렇다). §7.5.
- **엔타이틀먼트**: 이 리소스는 `commerce.orders` 모듈에 속한다(`shared/entitlements/module-resources.ts:31-36` — `group:/orders` · `page:/orders` · `page:/orders/shipments` · `page:/orders/claims` 가 한 묶음이다). 플랜 판정은 라우트 계층의 것이며 **이 계약의 응답 코드가 아니다** — 서버는 권한(403/404)만 말한다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 `useRouteWritePermissions` 를 배선해 체크박스·일괄 처리 바를 통째로 가리지만(`ShipmentListPage.tsx:133,435,461`), 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다. 권한 강제는 전적으로 서버 책임이다.

## 3. 데이터 계약 (`shared/domain/shipment.ts` · `pages/orders/shipments/types.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Shipment` | `id` · `orderId`(= `Order.id`) · `carrierId` · `invoiceNo` · `lines: ShipmentLine[]` · `status` · `shippedAt`(ISO 또는 `''`) · `deliveredAt`(ISO 또는 `''`) | **배송 건 1건 = 송장 1장.** 원장의 키는 주문번호가 아니라 자기 id 다 — 주문 1건에 배송 건이 여럿일 수 있고 그것이 부분 발송이다(`shipment.ts:202-208`) |
| `ShipmentLine` | `sku` · `quantity` | **재고를 움직이는 단위(SKU)와 수량만** 든다. 상품명·옵션 표기를 담지 않는다 — 커버리지 판정이 SKU 문자열 대조다(`shipment.ts:196-200`) |
| `ShipmentInput` | `Omit<Shipment, 'id'>` | 저장 입력. **서버 소유 필드(`status`·`shippedAt`·`deliveredAt`)를 그대로 싣는다**(`toShipmentInput` — `shipment.ts:227-237`) → §7.8 |
| `ShipmentStatus` | `waiting` \| `shipping` \| `delivered` | **주문 상태의 배송 구간과 같은 낱말**을 쓴다(`shipment.ts:167-173`). 같은 사건에 두 어휘가 생기면 운영자는 둘이 같은 것인지 확인할 방법이 없다 |
| `Carrier` | `id` · `name` · **`code`**(연동 키) · `trackingUrlTemplate` · `active` | **이 계약이 읽기만 한다.** 정본은 BE-043(배송 정책)이다(§7.7). **이름이 아니라 `code` 가 식별자**다 — 표기는 바뀌고, 바뀌는 값을 키로 쓰면 지난 배송 건이 어느 택배사였는지 영영 알 수 없다(`shipment.ts:29-47`) |
| `ShipmentCoverage` | `covered` · `total` · `complete` · `partial` | **파생값이다 — 저장하지 않는다**(§7.4) |
| `ShipmentRow`(화면) | `id`(= 주문번호) · `order` · `shipments` · `work` · `coverage` · `remaining` | **행은 배송 건이 아니라 주문이다**(`types.ts:8-11`). 서버 응답 타입이 아니라 두 조회의 조인 결과이며 **클라이언트에서 만든다** |
| `ShipmentWorkStatus`(화면) | `pending` \| `waiting` \| `shipping` \| `delivered` | **`pending`(발송대기)은 도메인에 없다**(`types.ts:26-30`) — 배송 건 하나의 상태가 아니라 '배송 건이 아직 없다'는 **주문의 작업 상태**다. 서버가 이 값을 내려보내지 않는다 |
| 상수 | `INVOICE_NO_MAX = 30` · `INVOICE_TOKEN = '{{invoice}}'` · `CARRIER_NAME_MAX = 40` · `CARRIER_CODE_MAX = 20` | |

**송장번호 규칙 (순수 — `shipment.ts:239-273`, 회귀 `shipment.test.ts:204-233`)**

| 판정 순서 | 조건 | 거절 사유 (상수 그대로) |
|---|---|---|
| ⓪ | `normalizeInvoiceNo(value)` = **`value.trim()`** — 앞뒤 공백만 뗀다 | (거절 아님) **가운데 공백은 오류이지 정리 대상이 아니다** — 조용히 고치지 않는다(`:257`) |
| ① | 정규화 후 `''` | `INVOICE_NO_REQUIRED` = `송장번호를 입력하세요.` |
| ② | 길이 > `INVOICE_NO_MAX`(30) | `INVOICE_NO_TOO_LONG` = `송장번호는 30자를 넘을 수 없습니다.` |
| ③ | `INVOICE_NO_RE = /^\d(?:[\d-]*\d)?$/` 불일치 | `INVOICE_NO_FORMAT` = `송장번호는 숫자와 하이픈(-)만 입력할 수 있습니다. 한글·공백이 섞이면 택배사 접수 파일이 깨집니다.` |

> **정규식이 뜻하는 것**: 숫자와 하이픈만, **양 끝은 반드시 숫자**. `-1234` · `1234-` · `1234 5678` · `CJ1234` · `일이삼` 전부 거절이다(회귀 `shipment.test.ts:214-223`). 좁히는 이유가 코드에 있다(`shipment.ts:246-248`): 국내 송장번호는 전부 숫자이고 운영자는 엑셀에서 복사해 붙여 넣는데, **한글·공백이 섞이면 택배사 접수 파일이 그 행에서 깨지고 그것을 아는 시점은 이미 물건이 나간 뒤다.**

**송장 중복 규칙 (순수 — `shipment.ts:282-297`, 회귀 `shipment.test.ts:235-256`)** → §7.1

| 판정 순서 | 조건 | 결과 |
|---|---|---|
| ① | 정규화된 `invoiceNo === ''` | `null` — **중복 판정 대상이 아니다**(형식 검증이 먼저 잡는다) |
| ② | `existing` 중 `id !== ignoreShipmentId` **이고** `carrierId` 가 같고 **이고** `normalizeInvoiceNo(invoiceNo)` 가 같은 건이 있다 | `이미 {clash.orderId} 주문에 쓰인 송장번호입니다. 같은 택배사에 같은 번호를 두 번 붙일 수 없습니다.` |
| ③ | 그 밖 | `null` |

**배송 건 전이 규칙 (순수 — `shipment.ts:450-461`, 회귀 `shipment.test.ts:385-396`)**

| 판정 순서 | 조건 | 거절 사유 (상수 그대로) |
|---|---|---|
| ① | `index(to) <= index(status)` — **역방향 또는 제자리** | `SHIPMENT_TRANSITION_BACKWARD` = `배송 상태는 되돌릴 수 없습니다.` |
| ② | `to === 'shipping'` 이고 `!isValidInvoiceNo(shipment.invoiceNo)` | `SHIPMENT_DISPATCH_NO_INVOICE` = `송장번호가 없어 발송처리할 수 없습니다.` |
| ③ | 그 밖 | `null` |

> **모르는 상태는 끝 다음이다**(`shipment.ts:438-442`) — `indexOf` 가 −1 이면 `SEQUENCE.length` 로 본다. 그래야 **어떤 전이도 허용되지 않는 쪽(fail-closed)** 으로 수렴한다. 서버도 알 수 없는 `status` 값을 만나면 같은 방향으로 수렴해야 한다 — −1 로 두면 모르는 값이 **모든 전이를 통과**한다.
>
> **②의 이유가 계약이다**: 송장 없는 '배송중'은 **고객에게 알릴 번호도 추적할 링크도 없다**(`:457`). 그 상태가 만들어지면 고객 문의에 답할 근거가 시스템 어디에도 없다.

**주문 축과의 다리 (순수 — `shipment.ts:414-431`, 회귀 `shipment.test.ts:324-381`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | **`orderTransitionBlock(order, to)`** 가 사유를 주면 그것을 그대로 돌려준다 | `ORDER_TRANSITION_CANCELED` · `ORDER_TRANSITION_CONFIRMED` · `ORDER_TRANSITION_BACKWARD` · `ORDER_TRANSITION_UNPAID`(`order.ts:279-303`) |
| ② | `to === 'waiting'` → **배송 건 전부**로 커버리지를 낸다 = '송장이 다 붙었는가'. `complete` 가 아니면 거절 | `송장이 붙지 않은 품목이 있어 배송대기로 넘길 수 없습니다 ({covered}/{total}).` |
| ②' | `to === 'shipping'` → **`dispatchedShipments` 만**으로 커버리지를 낸다 = '실제로 다 나갔는가'. `complete` 가 아니면 거절 | `전 품목이 발송되어야 배송중으로 넘어갑니다 ({covered}/{total}).` |
| ③ | 그 밖 | `null` |

> **배송 축이 얹는 것은 커버리지 하나뿐이다**(`shipment.ts:407-412`). 취소·구매확정·역방향·미입금은 **전부 주문의 판단**이고, 그것을 배송 쪽에서 다시 쓰면 규칙이 두 벌이 되어 주문 목록의 버튼과 이 화면의 버튼이 같은 주문을 두고 다른 답을 한다. **서버도 이 순서를 지킨다** — 주문 축 위반은 주문의 사유 문자열 그대로, 커버리지 위반만 진행 문자열과 함께 낸다.

**부분 발송 규칙 (순수 — `shipment.ts:299-400`, 회귀 `shipment.test.ts:260-320`)**

| 규칙 | 정의 |
|---|---|
| `allocateCovered(lines, shipments)` | **module-private — export 되지 않는다.** SKU 별 배송 수량을 모아 품목 **순서대로** 배정하고 남지 않으면 0. **`Math.min(line.quantity, available)` 으로 품목 수량을 넘겨 배정하지 않는다**(`:324`) → §7.4 |
| `shipmentCoverage(lines, shipments)` | `covered` = 배정 합 · `total` = 품목 수량 합 · `complete = total > 0 && covered >= total` · `partial = covered > 0 && covered < total`. **품목이 0건인 주문은 `complete` 로 통과시키지 않는다**(`:354-358`) — '전 품목 발송'이라고 말할 대상이 없다 |
| `hasShipmentLeft(shipment)` | `status !== 'waiting'` — **배송대기는 송장만 붙은 상태이지 나간 것이 아니다** |
| `dispatchedShipments(shipments)` | `hasShipmentLeft` 인 것만 |
| `uninvoicedLines(lines, shipments)` | 아직 송장이 붙지 않은 잔량. 비면 새 송장을 만들 이유가 없다(화면이 그 행을 제외한다) |
| `applyShippedQuantities(lines, shipments)` | `dispatchedShipments` 로 배정해 **`OrderLine.shippedQuantity` 를 다시 만든다.** 화면이 직접 더하지 않는다(`:388-392`) → §7.4 |

**택배사 조회·판정 (순수 + 조회기 — `shipment.ts:57-163`)**

| 함수 | 정의 |
|---|---|
| `carrierCatalog()` / `activeCarriers()` | **배선 전에는 `null`('모른다')** 이지 빈 배열이 아니다(`:77-91`). `activeCarriers` 는 `active` 만 → §7.6 |
| `findCarrier(id)` / `carrierNameOf(id)` | 없거나 미배선이면 `null` / `'알 수 없는 택배사'`. **두 사실이 한 문구로 뭉개진다**(§7.13 #4) |
| `trackingUrl(carrier, invoiceNo)` | 템플릿이 비었거나 `{{invoice}}` 토큰이 없거나 송장번호가 무효면 **`null`**. 값은 `encodeURIComponent` 된다(`:111-120`) → §7.6 |
| `carrierUsageCount(carrierId)` | 배선 전에는 `null` |
| `carrierDeleteBlock(carrier, usage)` | `usage === null` → **`CARRIER_DELETE_UNKNOWN` = `배송 건을 확인하지 못해 삭제할 수 없습니다. 잠시 후 다시 시도해 주세요.`**(fail-closed) · `usage > 0` → `'{name}' 으로 나간 배송 {usage}건이 있어 삭제할 수 없습니다. 사용 여부를 끄면 새 송장의 선택지에서만 빠집니다.` · 그 밖 `null` |

## 4. 엔드포인트 명세

### BE-072-EP-01 · 배송 건 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-072-EL-005 ~ EL-023, EL-019.6, EL-019.7, EL-019.8 |
| 심 | `data-source.ts:95` `GET /api/shipments` |
| 메서드·경로 | `GET /api/shipments` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.12) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 어댑터 시그니처가 `fetchAll(signal)` 이라 파라미터를 받지 않고(`crud.ts:99-100`), 필터(작업 상태)·검색이 **전부 클라이언트**다(`ShipmentListPage.tsx:166-169`).

**응답 200** — `readonly Shipment[]`. **`shippedAt` 내림차순**으로 내려준다(`data-source.ts:107-109`) — 아직 안 나간 건(`shippedAt === ''`)이 가장 위에 모이고 **그것이 오늘 할 일이다**. 프론트가 정렬을 다시 하지 않으므로 **서버 순서가 곧 표시 순서**다.

> **이 화면은 두 조회로 만들어진다**: 주문 목록(행)과 배송 건 목록(그 행에 딸린 송장). 배송 건만 읽으면 **송장이 아직 없는 주문이 목록에서 사라진다**(`types.ts:8-11`). 주문 조회는 **주문 계약 소관**이며 이 문서가 엔드포인트를 만들지 않는다 — 소비 사실만 §6 에 적는다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-072-EP-02 · 송장 등록 (배송 건 생성)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-072-EL-016, EL-026 ~ EL-032 |
| 심 | `data-source.ts:95-97` `POST /api/shipments` + **`(carrierId, invoiceNo)` 유일 제약 · 409** |
| 메서드·경로 | `POST /api/shipments` |
| 권한 | `admin`, `operator`(§7.11) |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다.** 도메인 멱등키는 **`(carrierId, normalize(invoiceNo))` 유일 제약**이며 그것이 이 도메인의 마지막 방어선이다(§7.1) |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `ShipmentInput`): `orderId` · `carrierId` · `invoiceNo` · `lines[]` · `status` · `shippedAt` · `deliveredAt`.

**서버 검증 (요청을 그대로 믿지 않는다 — 순서가 곧 규칙이다)**
1. **`orderId` 실재·권한 확인**. 없으면 404. 주문 도메인 읽기 권한이 없으면 404 은닉(§7.11).
2. **대상 자격**: 취소된 주문·입금 전(`pending`) 주문에는 송장을 붙일 수 없다 — 화면이 그 행을 아예 만들지 않는 것과 같은 규칙이다(`isShippable` — `types.ts:118-120`, 회귀 `shipments.test.ts:105-110`). 위반 시 422.
3. **송장번호 검증**: §3 의 세 판정을 **그 순서대로**. 위반 시 400 `VALIDATION_FAILED`(`error.fields`: `invoiceNo`).
4. **`carrierId` 검증**: 등록된 택배사여야 한다. **자유 입력이 아니다**(`shipment.ts:213`). 모르는 id 면 422 `CARRIER_NOT_FOUND`. **`active === false` 인 택배사로는 새 송장을 만들 수 없다** — 화면이 `activeCarriers()` 만 선택지로 준다(`ShipmentListPage.tsx:514`).
5. **중복 판정**: `(carrierId, normalize(invoiceNo))` 유일 제약 위반이면 **409 `INVOICE_DUPLICATE`** 이고 사유는 §3 의 문자열 그대로다(§7.1).
6. **`lines` 검증**: 각 `sku` 가 그 주문의 품목에 실재해야 하고, **`quantity` 합이 그 SKU 의 잔량(`uninvoicedLines`)을 넘지 않아야 한다.** 위반 시 422 `SHIPMENT_LINES_INVALID`. 넘겨 받아도 `allocateCovered` 가 `Math.min` 으로 깎지만(§7.4) **깎는 것과 거절하는 것은 다르다** — 서버는 거절한다.
7. **서버 소유 필드 무시**: `status` · `shippedAt` · `deliveredAt` 는 **요청에서 받지 않는다.** 새 배송 건은 언제나 `status: 'waiting'` · `shippedAt: ''` · `deliveredAt: ''` 다(§7.8).

**응답 201** — 생성된 `Shipment`(서버가 붙인 `id` 포함). 프론트 `create(input, context?): Promise<void>` 는 본문을 읽지 않고 목록을 무효화한다(`crud.ts:334-336`) — 응답 본문을 주는 것은 계약을 넓히는 쪽이며 프론트를 바꾸지 않는다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `invoiceNo` · `carrierId`) · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · **404 `ORDER_NOT_FOUND`** · **409 `INVOICE_DUPLICATE`**(§7.1) · **422 `ORDER_NOT_SHIPPABLE`** · **422 `CARRIER_NOT_FOUND`** · **422 `SHIPMENT_LINES_INVALID`** · 429 · 500 · 504.

---

### BE-072-EP-03 · 배송 건 상태 전이 (발송처리 · 배송완료)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-072-EL-017, EL-033, EL-034 |
| 심 | `data-source.ts:95` `PUT /api/shipments/:id` + `:98`(알림 발화 지점) |
| 메서드·경로 | `PUT /api/shipments/:id` |
| 권한 | `admin`, `operator`(§7.11) |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다.** 도메인 쪽 보강은 **전이 가드 ①(역방향·제자리 금지)** 이다 — 같은 전이를 두 번 보내면 두 번째는 `SHIPMENT_TRANSITION_BACKWARD` 로 **422** 가 된다(§7.1) |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `ShipmentInput` — 전체 치환): `orderId` · `carrierId` · `invoiceNo` · `lines[]` · `status` · `shippedAt` · `deliveredAt`.

**서버 검증 (순서가 곧 규칙이다)**
1. **불변 필드 무시**: `orderId` 는 바꿀 수 없다 — 배송 건이 다른 주문으로 옮겨 가면 두 주문의 커버리지가 동시에 거짓이 된다.
2. **`carrierId`·`invoiceNo` 수정은 `status === 'waiting'` 일 때만 허용한다.** 이미 나간 배송의 송장을 고치는 것은 이력의 위조다. 위반 시 422 `SHIPMENT_FROZEN`. 수정 시 **중복 판정을 `ignoreShipmentId = :id` 로 다시 한다**(`shipment.ts:285,291` — 자기 자신은 중복이 아니다, 회귀 `shipment.test.ts:247-251`).
3. **전이 재판정**: `status` 가 바뀌면 §3 의 배송 건 전이 표를 **저장 시점의 값으로** 다시 판정한다. 위반 시 422 `INVALID_SHIPMENT_TRANSITION`(`error.fields`: `status`). 프론트 판정은 UX 이며 정본이 아니다.
4. **시각 도장은 서버가 찍는다 — 이미 찍힌 것은 덮지 않는다**: `shippedAt` 은 `''` 일 때만, `deliveredAt` 은 `to === 'delivered'` 이고 `''` 일 때만 채운다(`shipment.ts:485-492`, 회귀 `shipment.test.ts:410-415`). **이것도 멱등 규약이다** — 같은 전이가 두 번 도달해도(재시도·중복 제출) 최초 시각이 남는다. §7.8.
5. **주문 원장 갱신은 이 요청의 결과다**(§7.5): 서버는 이 배송 건의 상태 변경 뒤 그 주문의 `shippedQuantity` 를 `applyShippedQuantities` 등가 계산으로 **다시 만들고**, `orderShipmentBlock(order, shipments, 'shipping') === null` 일 때만 주문 상태를 `shipping` 으로 민다. **일부만 나간 주문은 상태를 그대로 두고 수량만 올라간다**(`ShipmentListPage.tsx:298-303`).
6. **`waiting → shipping` 은 고객 알림의 발화 지점이다**(`data-source.ts:98` · `shipment.ts:22`). **알림은 아직 계약에 없다** — 이 문서는 발화 지점만 기록하고 엔드포인트를 만들지 않는다(§7.13 #9).

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 본문을 읽지 않고 목록을 무효화한다(`crud.ts:356-358`).

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · **404 `SHIPMENT_NOT_FOUND`** · **409 `CONFLICT`**(§7.9) · **409 `INVOICE_DUPLICATE`**(송장 수정 시) · **422 `INVALID_SHIPMENT_TRANSITION`** · **422 `SHIPMENT_FROZEN`** · 429 · 500 · 504.

---

### BE-072-EP-04 · 택배사별 배송 건수 (역방향 — 삭제 가드가 묻는다)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-072-EL-039 |
| 심 | `data-source.ts:118` `GET /api/shipments?carrierId= 의 총건수로 대체하면 사라진다` |
| 메서드·경로 | `GET /api/shipments?carrierId=<id>&limit=0` (총건수만 필요하다 — 목록 엔드포인트의 필터이지 새 리소스가 아니다) |
| 권한 | `admin`, `operator`. **호출부는 배송 정책 화면이다** — 택배사를 지울 수 있는 역할이 부른다 |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `{ total: number }`(또는 EP-01 응답 봉투의 `total`). **0 과 '모른다'를 구분해야 한다**: 조회가 실패하면 **`total: 0` 을 만들어 내지 말고 오류로 올린다** — 소비 쪽 `carrierDeleteBlock` 이 `null`(모른다)을 **fail-closed 로 삭제 차단**에 쓰기 때문이다(§7.6).

> **현재 프론트의 한계**: `countShipmentsByCarrier` 가 어댑터가 아니라 **`SHIPMENT_SEED` 를 센다**(`data-source.ts:120-122`) — 방금 등록한 송장이 삭제 가드에 즉시 반영되지 않는다. 코드가 그 한계를 스스로 적어 두었고(`:115-118`) 주문의 `listOrderRefs` 가 같은 자리에서 같은 선택을 했다(`pages/orders/data-source.ts:85-88`). **이 엔드포인트가 붙으면 사라진다**(§7.13 #6).

**에러**: 400(`carrierId` 형식) · 401 · 403 · 429 · 500 · 504. **404 는 쓰지 않는다** — 배송 건이 0인 택배사는 '없음'이 아니라 **0**이다.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색이 전부 클라이언트 — `ShipmentListPage.tsx:166-169`) | 401 → 전역 인터셉터(`shared/query/queryClient.ts:60,65-66`)가 재인증으로. 화면은 FS-072-EL-023 배너 | **403** 컬렉션 — 주문 도메인 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-072-EL-022 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → EL-023. **주문 조회 실패와 한 문구로 뭉개진다**(§7.13 #3) | 5초 → 504 → EL-023 |
| EP-02 송장 등록 | 400 `VALIDATION_FAILED` — `invoiceNo` 3분기 · `carrierId` 공란. **프론트가 같은 판정을 이미 하므로**(EL-029) 정상 경로에서는 도달하지 않는다. 도달하면 다이얼로그 상단 `Alert` 로 뭉개진다 — **필드 인라인 매핑 경로가 없다**(§7.13 #7) | 401 → 전역 인터셉터. **모달에 입력하던 송장번호는 전부 유실된다** — 프로그램적 이동이라 `useModalDirtyGuard` 가 발화하지 않는다(FS-072 §4.1) | `operator` 에게 쓰기를 열므로(§7.11) 역할 부족 403 은 주문 쓰기 권한 없는 그 밖의 역할에만. **주문 읽기 권한 없음 → 404 은닉** | **404 `ORDER_NOT_FOUND`** — `orderId` 가 없다. 화면은 이 건을 '실패 1건'으로만 센다(EL-018) | **409 `INVOICE_DUPLICATE`** — **이 계약의 핵심 방어선**(§7.1). 심이 이것을 명시적으로 요구한다(`data-source.ts:96-97`). 화면에 해소 UI 가 없어 '`N`건을 처리하지 못했습니다'로 뭉개진다(§7.13 #2) | **422 `ORDER_NOT_SHIPPABLE`**(취소·입금 전) · **422 `CARRIER_NOT_FOUND`**(모르거나 비활성 택배사) · **422 `SHIPMENT_LINES_INVALID`**(잔량 초과·모르는 SKU) | 429 분당 60 + `Retry-After`. **N건 병렬 POST 라 이 상한에 닿기 쉽다**(§7.12) | 500 + `traceId` → 모달 상단 `Alert` + **모달 유지**(재클릭이 재시도). **부분 성공이 남는다**(§7.5) | **10초 → 504**(§2). **프론트 타임아웃 상한이 없다**(`AbortSignal.timeout` 앱 전역 0건) |
| EP-03 상태 전이 | 400 — `status` 가 유니온 밖 · `:id` 형식 | 401 → 전역 인터셉터. 진행 중이던 일괄 발송처리는 중단된다 | 위와 같다 | **404 `SHIPMENT_NOT_FOUND`** — 없는 배송 건. 어댑터는 **없는 id 에 이미 409 를 던진다**(`crud.ts:144-146`) — PUT 경로에서는 **409 로 수렴하는 것이 현 프론트 계약**이다 | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.9). **토큰이 없어 현재는 '존재 여부' 기반이며 동시 편집은 last-write-wins** | **422 `INVALID_SHIPMENT_TRANSITION`**(역방향·제자리 · 송장 없는 발송) · **422 `SHIPMENT_FROZEN`**(나간 배송의 송장 수정) | 429 분당 60. **한 행이 배송 건 여러 장을 `Promise.all` 로 보낸다**(`ShipmentListPage.tsx:314-322`) | 500 + `traceId` → 확인 다이얼로그 안 배너 + **다이얼로그 유지**. **배송 건은 나갔는데 주문 갱신이 실행되지 않는 창이 있다**(§7.5) | **10초 → 504**(§2) |
| EP-04 택배사 사용 건수 | 400 — `carrierId` 형식 | 401 → 전역 인터셉터. 호출부는 배송 정책 화면이다 | **403** — 이 시점에 이미 택배사 목록을 보고 있으므로 숨길 것이 없다 | **N/A — 대상이 없을 수 없다.** 0건은 '없음'이 아니라 **0**이다(§7.6) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 → **소비 쪽이 `null` 로 받아 삭제를 fail-closed 로 막는다**(`CARRIER_DELETE_UNKNOWN`). **0 을 만들어 내면 안 된다**(§7.6) | 5초 → 504 → 위와 같은 fail-closed |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `shipmentAdapter.fetchAll(signal)` | `GET /api/shipments` | EP-01 | `readonly Shipment[]` | O — 정렬(`shippedAt` 내림차순)까지 계약이다 |
| `shipmentAdapter.create(input, context?)` | `POST /api/shipments` + 유일 제약·409 | EP-02 | `void` | **△ — ① 서버 소유 필드(`status`·`shippedAt`·`deliveredAt`)를 바디에 싣는다**(§7.8) **② 멱등키 미전달**(§7.13 #2) **③ 409 해소 UI 없음** |
| `shipmentAdapter.update(id, input, context?)` | `PUT /api/shipments/:id` | EP-03 | `void` | **△ — 전체 치환 계약. 위와 같은 세 문제 + 동시성 토큰 없음**(§7.9) |
| `countShipmentsByCarrier(carrierId)` | `GET /api/shipments?carrierId=` 총건수 | EP-04 | `number` | **△ — 어댑터가 아니라 `SHIPMENT_SEED` 를 센다**(§7.13 #6). **실패를 표현할 수단이 없다** — 반환 타입이 `number` 라 '모른다'를 낼 수 없고, 조회기 자리(`carrierUsageCount`)가 `null` 을 미배선에만 쓴다 |
| `orderAdapter.fetchAll(signal)` | `GET /api/orders`(주문 계약) | **이 계약이 만들지 않는다** | `readonly Order[]` | O — 소비 사실만 기록(§7.7) |
| `orderAdapter.update(id, input, context?)` | `PUT /api/orders/:id`(주문 계약) | **이 계약이 만들지 않는다** | `void` | O — 배송준비중·배송대기·배송중 세 전이가 전부 **주문 어댑터를 지난다**(`data-source.ts:7-10`). §7.5·§7.7 |
| `activeCarriers()` · `findCarrier()` · `trackingUrl()` | — (동기 seam) | **BE-043 소관** | `Carrier[] \| null` · `Carrier \| null` · `string \| null` | O — **미배선이 `null` 이고 화면이 그것을 분기한다**(§7.6) |
| `carrierUsageCount()` ← `countShipmentsByCarrier` | — (동기 seam · **역방향**) | EP-04 | `number \| null` | O — **`null` 이면 삭제를 막는다**(fail-closed · §7.6) |
| `shipmentAdapter.fetchOne(...)` | — | **없음(범위 밖)** | `createCrudAdapter` 가 제공하나 **호출부 0건** | O — 배송 건 상세 라우트가 없다(`ShipmentTable.tsx:8-9`) |
| `shipmentAdapter.remove(...)` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답(§7.10) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`create`·`update`)에 `X-CSRF-Token` 헤더를 싣는다. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` 은 호출부가 없어 해당 없음. **EP-02 의 `ORDER_NOT_FOUND` 는 `HttpError(404, …)` 로 옮긴다** — 일괄 처리의 실패 사유가 되기 때문이다(`settleAllDetailed` 가 `reason` 을 이미 들고 온다 — `bulk.ts:39-51`). |
| **409 변환 (중복 송장)** | `create` 는 응답 **409 `INVOICE_DUPLICATE` 를 `HttpError(409, <서버 사유>)` 로** 옮긴다. **사유 문자열은 도메인 상수와 같은 문장이어야 한다**(§3) — 화면의 사전 안내와 서버의 거절이 다른 말을 하면 운영자는 둘이 같은 규칙인지 알 수 없다. |
| 409 변환 (동시성) | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다. **화면 쪽 해소 UI 는 별도 작업이다**(§7.13 #2). |
| 422 변환 | `create`·`update` 는 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]`)로 옮긴다. **`field` 이름은 프론트가 아는 키(`invoiceNo`·`carrierId`·`status`·`lines`)와 일치해야 한다.** 다만 **현재 화면에 인라인 렌더러가 있는 것은 송장 다이얼로그의 줄 단위 오류뿐**이고 그것은 클라이언트 검증에서만 채워진다 — 서버 422 는 전부 배너·건수로 수렴한다(§7.13 #7). |
| 멱등키 | `create`·`update` 는 `context?.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — 자리는 이미 있다(`crud.ts:118-130,132-151`). **비어 있는 것은 호출부다**(§7.13 #2). |
| 부수효과 제거 | **이 어댑터에는 제거할 부수효과가 없다** — 주문을 만지지 않고(`data-source.ts:7-10`), 재고도 원장도 건드리지 않는다. 백엔드가 붙어도 `patch: (shipment, input) => ({ ...shipment, ...input })` 자리가 그대로 서버 응답이 된다. **대신 화면이 쥔 순서(배송 건 저장 → 주문 갱신)가 서버로 올라가야 한다**(§7.5). |
| 가드 유지 | `invoiceNoBlock` · `duplicateInvoiceBlock` · `shipmentTransitionBlock` · `orderShipmentBlock` 은 **지우지 않는다** — 서버가 정본이 되어도 버튼의 건수와 저장의 허용이 같은 술어를 읽는 자리가 필요하다(`types.ts:202-205`). 다만 저장의 최종 판정은 서버다. |
| 택배사 조회 | 조회기(`activeCarriers`)가 **동기**라 네트워크가 붙으면 비동기가 된다. **그때도 `null`('모른다')과 `[]`('없다')를 구분해야 한다** — 화면의 두 배너가 그 구분 위에 서 있다(EL-027 · §7.6). |

## 7. 핵심 판정

### 7.1 송장 중복 판정이 이 도메인의 멱등키다 — 서버는 부분 유니크 제약으로 못박는다 【정합 판정】

이 계약에는 주문의 `stockAppliedAt` 이나 클레임의 `refund.completedAt` 같은 **타임스탬프 멱등키가 없다.** 그 자리를 대신하는 것이 **송장번호의 유일성**이다.

**규칙**(`duplicateInvoiceBlock` — `shipment.ts:282-297`): 같은 `carrierId` **이고** 정규화된 `invoiceNo` 가 같으면 거절한다. 사유는 그대로:

> `이미 {orderId} 주문에 쓰인 송장번호입니다. 같은 택배사에 같은 번호를 두 번 붙일 수 없습니다.`

**택배사를 함께 보는 이유가 계약이다**(`shipment.ts:275-281`): **송장번호 체계는 택배사마다 따로**라 다른 택배사에서 같은 숫자가 나오는 것은 **정상**이다. 전역 유일로 걸면 정상 입력을 거절하게 되고, 운영자는 진짜 오입력과 구분할 수 없다. 실제 사고는 **앞 주문의 송장을 복사한 채 다음 행에 붙여 넣는 것**이고 그것은 언제나 같은 택배사 안에서 일어난다. 회귀가 두 방향을 모두 고정한다(`shipment.test.ts:238-245`).

**판정 — 서버가 걸어야 하는 제약**: `(carrierId, normalize(invoiceNo))` 의 **부분 유니크 제약**(`normalize` = 앞뒤 공백 제거, `invoiceNo <> ''` 인 행만). 세 가지가 함께 못박힌다.

1. **정규화된 값으로 건다.** 앞뒤 공백만 다른 두 값이 서로 다른 행이 되면 제약이 뚫린다 — 붙여넣기가 가장 흔한 입력 경로다(`shipment.test.ts:225-228`).
2. **빈 값은 제약 대상이 아니다.** `duplicateInvoiceBlock` 이 `''` 를 통과시킨다(`:288`) — 형식 검증이 먼저 잡기 때문이다. 부분 유니크(`WHERE invoiceNo <> ''`)로 걸어야 '송장 없는 배송 건'이 서로 충돌하지 않는다.
3. **수정 시 자기 자신은 제외한다**(`ignoreShipmentId` — `:285,291`). 제약 위반 판정을 서버가 다시 할 때 대상 행을 빼지 않으면 **자기 번호를 그대로 저장하는 것조차 거절**된다(회귀 `shipment.test.ts:247-251`).

**어떤 재시도가 안전하고 어떤 것이 거절인가** — 이것이 이 절의 실질이다.

| 상황 | 서버 응답 | 안전한가 |
|---|---|---|
| **같은 요청의 재시도**(같은 `Idempotency-Key`) | 최초 응답 재생 — 두 번 만들지 않는다 | **안전.** 키가 있으면 그렇다. **현재 프론트는 키를 넘기지 않아**(§7.13 #2) 이 경로가 발현되지 않는다 |
| **키 없는 재시도**(네트워크 오류 후 운영자가 다시 누른다) | **409 `INVOICE_DUPLICATE`** — 첫 요청이 서버에 닿았다면 유일 제약이 두 번째를 막는다 | **결과적으로 안전.** 다만 화면은 이것을 '처리하지 못했습니다'로 보고해 **성공한 것을 실패로 말한다**(§7.13 #2) |
| **첫 요청이 서버에 닿지 않은 재시도** | 정상 201 | 안전 |
| **다른 주문에 같은 번호**(같은 택배사) | **409** | 안전 — 그것이 이 제약의 목적이다 |
| **다른 택배사에 같은 번호** | **201 정상** | **의도된 허용.** 번호 체계가 다르다 |
| **같은 주문에 다른 번호를 두 장**(두 운영자 동시 등록) | **201 두 번 다 성공** | **막히지 않는다** — §7.9 |
| **이미 나간 배송 건의 송장 수정** | **422 `SHIPMENT_FROZEN`** | 재시도가 풀지 못하는 실패다(§4 EP-03 검증 2) |

**409 와 422 의 경계**: 송장번호 충돌은 **409**(다른 행의 존재가 원인이며, 그 행이 사라지면 같은 요청이 성공한다). 형식 위반은 **400**(요청 자체가 틀렸다). 대상 자격·전이·잔량 위반은 **422**(요청은 잘 만들어졌으나 현재 상태에서 수행할 수 없다).

### 7.2 송장번호는 조용히 고치지 않는다 【정합 판정】

`normalizeInvoiceNo` 는 **`value.trim()` 이 전부다**(`shipment.ts:257-260`). 주석이 그 선을 명시한다 — **가운데 공백은 오류이지 정리 대상이 아니다.**

**판정**: 서버도 하이픈·공백을 임의로 제거하거나 채워 넣지 않는다. `1234 5678` 은 **`12345678` 로 고쳐 저장하는 값이 아니라 400 으로 거절할 값**이다. 이유:

- **정규화가 관대해지면 유일 제약이 뜻을 잃는다.** 공백을 지우고 저장하기 시작하면 `1234 5678` 과 `12345678` 이 같은 행이 되고, 그 순간 운영자가 **의도적으로 구분한 두 번호**가 하나로 합쳐진다.
- **택배사 접수 파일이 깨지는 것을 막는 것이 규칙의 목적**인데(`shipment.ts:246-248`), 고쳐서 통과시키면 **잘못된 번호가 조용히 접수 파일에 실린다** — 그것을 아는 시점은 이미 물건이 나간 뒤다.
- **입력을 고치는 서버는 화면이 보여 준 값과 저장된 값이 다르다고 말하지 않는다.** 운영자는 자기가 친 번호가 그대로 들어갔다고 믿는다.

세 거절 상수(`INVOICE_NO_REQUIRED` · `INVOICE_NO_FORMAT` · `INVOICE_NO_TOO_LONG`)는 §3 의 문장 그대로 쓴다 — **왜 막았는지를 말하는 문장**이라 요약하면 규칙의 근거가 사라진다.

### 7.3 전이 가드 두 벌을 서버가 그대로 재판정한다 【정합 판정】

이 도메인은 **화면과 저장이 같은 순수 함수를 읽는다**. 일괄 처리 버튼의 건수(`eligibleForDispatch` — `types.ts:218-220`)와 저장의 허용(`applyShipmentStatus` 가 던진다 — `shipment.ts:480-481`)이 같은 술어를 지난다.

**판정**: 서버는 §3 의 **두 표를 그대로** 구현하고 위반을 **422 `INVALID_SHIPMENT_TRANSITION`** 으로 거절한다. 세 가지를 특히 못박는다.

1. **주문 축에 먼저 묻는다.** `orderShipmentBlock` 이 **가장 먼저** `orderTransitionBlock` 을 부른다(`shipment.ts:419`). 서버가 배송 테이블 안에서 '취소됐는가'·'입금됐는가'를 다시 정의하면 안 된다 — 주문 상태가 정본이고, 둘이 갈라지면 **주문 상세는 '진행 불가'라 하고 배송 API 는 밀어 준다**. 배송 축이 얹는 것은 **커버리지 하나뿐**이다.
2. **거절 사유에 진행률을 싣는다.** `({covered}/{total})` 이 붙은 두 문장(§3)이 계약이다 — 운영자가 '무엇이 모자란가'를 그 자리에서 안다. 진행률 없이 '넘길 수 없습니다'만 주면 화면이 그것을 다시 계산하게 되고, 그 순간 규칙이 두 벌이 된다.
3. **모르는 상태는 fail-closed 다**(`shipment.ts:438-442` · `order.ts:78-81`). 인덱스를 못 찾으면 **끝 다음**으로 본다. 서버가 `-1` 로 두면 알 수 없는 값이 **모든 전이를 통과**한다 — 방향이 정반대다.

**`applyShipmentStatus` 가 시각을 덮지 않는 것도 이 표의 일부다**(`:485-492`): `shippedAt` 은 비어 있을 때만, `deliveredAt` 은 `delivered` 로 갈 때만 채운다. **대기 → 완료로 건너뛴 건도 자기 발송 시각을 갖는다**(회귀 `shipment.test.ts:410-415`). 이것은 표시 편의가 아니라 **멱등 규약**이다 — 같은 전이가 두 번 도달해도(재시도·연타·서버 내부 재처리) **최초 시각이 남아야** '언제 나갔는가'가 한 값으로 유지된다. 도장을 매번 덮는 구현은 재시도할 때마다 발송 시각을 미래로 밀어 SLA·정산의 근거를 흔든다.

### 7.4 파생값을 저장하지 않는다 — `shippedQuantity` 는 결과이지 사실이 아니다 【정합 판정】

**셈의 정본은 `allocateCovered` 하나다**(`shipment.ts:312-328`). 그것은 **module-private 이고 export 되지 않는다** — 밖에서 다른 방식으로 세는 길을 막아 둔 것이다. 그 위에 공개 함수 셋이 선다: `shipmentCoverage`(`:347`) · `uninvoicedLines`(`:378`) · `applyShippedQuantities`(`:394`). **넘기는 배송 건 집합만 바꿔 두 질문에 답한다** — 전부를 넘기면 '송장이 다 붙었는가', 발송된 것만 넘기면 '실제로 다 나갔는가'(`:341-346`). 규칙이 하나라 **두 답이 어긋날 수 없다.**

**판정 1 — `covered`·`total`·`complete`·`partial` 을 저장하지 않는다.** 저장하는 순간 송장 한 장을 더 붙이거나 지운 뒤에도 옛 값이 남고, 그때 목록의 '부분발송 1/3' 배지와 저장의 허용 여부가 서로 다른 근거를 읽는다. 커버리지는 **배송 건 원장에서 매번 낸다.**

**판정 2 — `OrderLine.shippedQuantity` 의 정본은 배송 원장이다.** 이 값은 주문 테이블에 실재하지만(`order.ts:109-114`) **독립된 사실이 아니라 `applyShippedQuantities` 의 결과**다(`shipment.ts:388-392` 가 그렇게 적는다). 화면이 직접 더해 넣으면 **주문 목록의 '부분배송 1/3' 배지**(`shipmentProgress` — `order.ts:557-562`)와 **배송 화면의 판정**(`shipmentCoverage`)이 다른 셈에서 나오고, 같은 주문을 두 화면이 다르게 설명하는 순간이 반드시 온다.

**서버가 취할 수 있는 두 안**:

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `shippedQuantity` 를 주문 응답의 **파생 필드**로 낸다 — 저장하지 않고 배송 원장에서 조인해 계산한다 | 두 값이 어긋날 통로가 구조적으로 없다. 주문 PUT 의 바디에서 이 필드가 사라지므로 §7.8 의 위조 경로도 함께 닫힌다. 비용은 주문 조회마다의 조인 하나다 |
| **B (차선)** | 저장하되 **정본은 배송 원장**이라고 못박고, **배송 건이 바뀌는 모든 경로에서 서버가 재계산해 덮어쓴다.** 요청 바디의 값은 무시한다 | 조회가 싸다. 그러나 '재계산해 덮어쓴다'는 계약은 **경로 하나를 빠뜨리면 조용히 깨지고**, 깨진 것을 아는 방법은 창고 실사뿐이다 |

**어느 안이든 `shippedQuantity` 를 요청 바디에서 받지 않는다.** 현재 프론트는 그것을 싣는다 — `toOrderInput` 이 `lines` 를 통째로 복사하고(`order.ts:260`) 화면이 `applyShippedQuantities` 결과를 넣어 보낸다(`ShipmentListPage.tsx:327-341`). 백엔드가 붙으면 **그 계산은 서버로 올라가고 화면의 계산은 표시 전용이 된다.**

**판정 3 — `allocateCovered` 의 `Math.min` 을 그대로 옮긴다**(`:324`). 한 SKU 에 과다 입력된 수량이 **다른 품목까지 '발송됨'으로 만들면, 실제로는 창고에 남아 있는 물건이 화면에서 사라진다**(`:308-310`, 회귀 `shipment.test.ts:286-292`). 다만 **깎는 것과 거절하는 것은 다르다** — 서버는 EP-02 검증 6 에서 **잔량 초과를 422 로 거절**하고, `Math.min` 은 그 뒤에도 남는 마지막 안전망이다. 배정을 캡 없이 두면 잘못된 송장 한 장이 주문 전체를 '발송 완료'로 만든다.

**판정 4 — 품목이 0건인 주문은 `complete` 가 아니다**(`:354-358`). '전 품목 발송'이라고 말할 대상이 없기 때문이다. `total > 0` 조건을 빼면 빈 주문이 **모든 전이를 통과**한다.

### 7.5 한 조작이 두 리소스를 지난다 — 트랜잭션 경계가 없다 【정합 판정】

이 화면의 두 조작은 **각각 두 번의 저장**이다.

| 조작 | 순서 | 사이에 실패하면 |
|---|---|---|
| **송장 등록**(EL-031) | ① `POST /api/shipments` ② `orderShipmentBlock(...,'waiting') === null` 이면 `PUT /api/orders/:id` | **송장만 남고 주문은 배송준비중에 머문다**(`ShipmentListPage.tsx:284-292`) |
| **발송처리**(EL-034) | ① 그 행의 배송 건들을 **`Promise.all` 로 병렬** `PUT` ② `applyShippedQuantities` 로 수량 재계산 ③ 커버리지 완성이면 주문을 `shipping` 으로, 아니면 **수량만** `PUT` | **일부 배송 건만 나가고** `await` 가 reject 해 **주문 갱신이 아예 실행되지 않는다**(`:314-341`) — 나간 배송 건과 주문의 출고 수량이 어긋난 채 남는다 |

**심이 이것을 예고하지 않는다** — `data-source.ts:95-98` 은 유일 제약과 알림만 적는다. 주문 어댑터의 심(`pages/orders/data-source.ts:61-63`)은 '주문 갱신 + SKU 재고 증감을 한 트랜잭션으로'라고 적지만 **배송 건까지 묶으라고는 하지 않는다.**

**판정**: 서버는 **송장 등록과 발송처리를 각각 하나의 트랜잭션**으로 처리한다. 구체적으로 `POST /api/shipments` 는 **배송 건 생성 + (커버리지 완성 시) 주문 상태 전이**를, `PUT /api/shipments/:id` 는 **배송 건 전이 + 주문 `shippedQuantity` 재계산 + (완성 시) 주문 상태 전이**를 한 덩이로 수행한다. 이유:

- **배송 건만 나가고 주문이 안 따라오면** 주문 목록은 '배송대기'라 말하는데 물건은 이미 창고 밖이다. 고객 문의에 두 화면이 다른 답을 한다.
- **주문만 '배송중'이 되고 배송 건이 안 움직이면** `applyShippedQuantities` 가 다음 계산에서 그 수량을 0 으로 되돌린다 — 상태와 수량이 영구히 어긋난다.
- **재고까지 걸린다.** 이 화면의 주문 PUT 은 `orderAdapter.patch` 를 지나고, 그 안에서 `shouldDeductStock` 이 참이면 **SKU 재고가 실제로 빠진다**(`pages/orders/data-source.ts:44-59` · `order.ts:443-450`). 배송 조작이 재고를 움직일 수 있다는 뜻이고, 부분 적용은 곧 재고 불일치다.

**일괄(bulk)의 트랜잭션 경계는 다르다 — 건별이다.** 화면은 `settleAllDetailed` 로 **전건을 병렬 시도**하고 부분 실패를 건수로 보고한다(`ShipmentListPage.tsx:219-238` · `bulk.ts:39-51`). **판정**: 서버는 **일괄 엔드포인트를 만들지 않는다**(심이 없다 — 발명하지 않는다). 대신 **건별 요청이 각각 원자적**이어야 하고, **부분 성공은 정상 결과**다. 그 결과 계약은 이렇다.

- **전건 성공** → 화면이 토스트 + 선택 해제 + 다이얼로그 닫기(`:223-228`).
- **일부 실패** → **다이얼로그를 닫지 않고** `{N}건을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.` 재클릭이 곧 재시도다. **성공한 건은 이미 저장돼 있고**, 재시도는 그것들을 다시 시도한다 — 그때 **멱등키가 없으면 송장은 409 로, 전이는 422 로 막힌다**(§7.1). 즉 **재시도가 안전한 이유가 도메인 제약뿐**이다.
- **어느 건이 실패했는지 화면이 말하지 않는다** — `settleAllDetailed` 는 사유를 함께 돌려주는데 화면이 `failed` 만 꺼내 쓴다(`:220`). **서버는 실패 사유를 정확히 실어야 한다** — 그것이 없으면 화면이 나중에 고쳐도 말할 것이 없다(§7.13 #3).

### 7.6 미배선을 성공으로 위장하지 않는다 — `null` 은 '모른다'다 【정합 판정】

이 코드베이스의 규약이 배송 도메인에서 특히 선명하다. **조회기가 배선되기 전의 값은 빈 배열이 아니라 `null` 이다**(`shipment.ts:77-82`) — 화면은 '**등록된 택배사가 없습니다(등록하러 가기)**'와 '**목록을 아직 못 읽었습니다**'에 서로 다른 답을 해야 하고, **전자는 운영자가 할 일이 있고 후자는 없다.**

| 부수효과/조회 | 미배선(또는 실패) 시 | 판정 |
|---|---|---|
| `carrierCatalog()` · `activeCarriers()` | **`null`** — 빈 배열이 아니다(`:83-91`, 회귀 `shipment.test.ts:138-142`) | 화면이 두 배너로 가른다(EL-027): `null` → '택배사 목록을 확인하지 못해 송장을 등록할 수 없습니다.' / `[]` → '사용 중인 택배사가 없습니다. 상품 관리 > 배송에서 택배사를 먼저 등록해 주세요.'(`InvoiceBulkDialog.tsx:215-225`). **둘 다 저장 버튼을 잠근다**(`:192,206`) — 확인하지 않은 택배사로 송장을 만들지 않는다 |
| `findCarrier(id)` · `carrierNameOf(id)` | `null` / `'알 수 없는 택배사'` | **삭제된 택배사와 미배선이 같은 문구로 뭉개진다**(§7.13 #4). 그래도 **이름을 지어내지 않는다** |
| `trackingUrl(carrier, invoiceNo)` | 템플릿 없음·토큰 없음·송장번호 무효 → **`null`** | **링크를 그리지 않고 번호만 그린다**(`ShipmentTable.tsx:77-79`). **없는 링크를 그리는 것보다 안 그리는 편이 정직하다**(`shipment.ts:42-43`). **실시간 추적을 흉내 내지 않는다** — 진행률·상태를 지어내면 그것은 거짓말이다(`:105-109`) |
| `carrierUsageCount(carrierId)` | **`null`** | `carrierDeleteBlock` 이 **fail-closed 로 삭제를 막는다**(`CARRIER_DELETE_UNKNOWN` — `:158`). **여기서 통과시키면 배송 건이 가리키던 택배사가 사라져 송장 열의 이름과 추적 링크가 동시에 죽는다**(`:150-152`). 회귀 `shipment.test.ts:188-193` |
| 배송 건 목록 조회 실패 | 화면 배너 + '다시 시도' | **빈 목록으로 폴백하지 않는다.** 0건과 실패는 다른 사실이다 |
| 필터 건수 배지 | 아직 못 셌으면 **`null` → `'—'`**(`ShipmentListPage.tsx:163-164`) | 0 으로 뭉개면 '할 일이 없다'로 읽힌다 |

**【정합 판정】 서버가 붙어도 같은 규약을 지킨다.**

- **`GET /api/shipping/carriers` 가 실패하면 빈 배열을 만들어 내지 않는다.** 오류로 올려 소비 쪽이 `null` 로 받게 한다. 200 + `[]` 는 **'택배사를 하나도 등록하지 않았다'는 서술**이고, 그것을 본 운영자는 있지도 않은 등록 작업을 하러 간다.
- **EP-04(사용 건수)가 실패하면 `0` 을 주지 않는다.** `0` 은 **'삭제해도 된다'** 는 뜻이고, 그 답 하나로 배송 건 수백 장이 택배사를 잃는다. 조회 실패는 5xx 로 올리고 소비 쪽이 fail-closed 로 막는다.
- **추적 URL 을 서버가 만들어 내려보내는 경우에도 같다** — 템플릿이 없으면 `null` 이지 `''` 나 택배사 홈 URL 이 아니다. 링크가 있는데 아무 데도 닿지 않는 것이 링크가 없는 것보다 나쁘다.
- **일반화하면**: 이 도메인에서 `null` 은 언제나 **'모른다'** 이고, 그것을 **0·빈 배열·기본값으로 접는 것이 이 프론트온리 앱의 최악 실패 모드(조용한 거짓 성공)** 다.

### 7.7 소유 경계 — 두 원장이 서로에게 반대 방향으로 닿는다 【경계 판정】

| 사실 | 정본 | 이 계약의 역할 |
|---|---|---|
| 택배사 목록(등록·수정·삭제·사용여부) | **배송 정책 화면**(`pages/products/shipping/components/CarrierSection.tsx` · 심 `pages/products/shipping/data-source.ts:64` `GET/POST /api/shipping/carriers · PUT/DELETE /api/shipping/carriers/:id`) — BE-043 소관 | **읽기만** 한다(EP-02 검증 4 · §7.6). 화면의 안내도 그쪽을 가리킨다(`InvoiceBulkDialog.tsx:222`) |
| 배송 건(송장) 원장 | **이 계약** | 소유한다 |
| 주문의 상태·재고·이력 | 주문 계약(`pages/orders/data-source.ts:61-64` 심) | **읽고, 전이를 요청한다.** 자기 어댑터로 주문을 고치지 않는다(`data-source.ts:7-10`) |
| 배송비·반품배송비 정책 | BE-043 | 이 화면은 읽지도 않는다 |

**두 조회기가 반대 방향으로 서로에게 닿는다** — 이것이 이 도메인의 구조다(`shipment.ts:122-125`).

- **정방향**(`registerCarrierCatalogLookup` — `wiring.ts:172`): 배송 처리 화면이 **택배사 이름·추적 템플릿**을 묻는다. 정본 → 소비자.
- **역방향**(`registerCarrierUsageLookup` — `wiring.ts:173`): 배송 정책 화면이 **'이 택배사로 나간 배송 건이 몇 건인가'** 를 묻는다. 소비자 → 정본. **삭제 가드가 그 답 위에 선다.**

**두 화면이 서로를 import 하지 않는 것이 규약이고**(`shipment.ts:9-13` — 페이지 간 결합), 공통 층이 **자리만** 만들고 `wiring.ts` 가 구현을 꽂는다. **테스트조차 그 결합을 만들지 않는다**(`shipments.test.ts:36-41` — '제품 코드에 금지한 것을 테스트에서 하면 결합은 그대로 생긴다').

**【경계 판정】 서버도 이 방향을 지킨다.**

1. **`DELETE /api/shipping/carriers/:id` 는 배송 건을 검사한다.** 배송 건이 1건이라도 있으면 **409** 로 막고 사유를 준다 — `'{name}' 으로 나간 배송 {N}건이 있어 삭제할 수 없습니다. 사용 여부를 끄면 새 송장의 선택지에서만 빠집니다.` **대안(`active: false`)을 사유에 함께 담는 것이 계약이다** — 막기만 하면 운영자는 무엇을 해야 하는지 모른다.
2. **검사에 실패하면 삭제하지 않는다**(fail-closed · §7.6). 배송 원장을 못 읽었다는 이유로 삭제가 열리면 안 된다.
3. **이 판정의 실행은 BE-043 소관이며 두 문서를 함께 봐야 한다** — 여기서만 적으면 그쪽이 모른다. **BE-043 v1.0 은 `carrier` 를 자유 텍스트로 판정하고 '택배사 코드 마스터의 소유 확정 필요'를 이관해 두었는데**(BE-043 §7.8), **코드가 그 사이에 앞서 나가 `Carrier`(id·code·템플릿·active)와 삭제 가드를 실제로 만들었다.** BE-043 을 그 사실에 맞춰 개정해야 한다(§7.13 #5).
4. **주문을 이 계약이 쓰지 않는다.** 배송이 주문을 미는 것은 맞지만 **쓰기는 언제나 주문 리소스를 지난다** — 여기서 주문 테이블을 함께 만지면 **재고 부수효과를 우회하는 경로가 생긴다**(`data-source.ts:7-10`). 서버에서 트랜잭션으로 묶는 것과(§7.5) 주문 규칙을 배송 쪽에 복제하는 것은 다르다.

### 7.8 서버 소유 필드를 요청에서 받지 않는다 — 시각 도장은 서버가 찍는다 【보안 판정】

**현재 클라이언트가 세 개의 서버 소유 필드를 바디에 싣는다**: `toShipmentInput`(`shipment.ts:227-237`)이 `status` · `shippedAt` · `deliveredAt` 를 **그대로 복사**해 넣고, 화면이 그것을 `create`/`update` 의 `input` 으로 보낸다(`ShipmentListPage.tsx:284,318`).

**이것이 만드는 사고 — 조작된 클라이언트 하나면 충분하다**:

1. **`status: 'shipping'` 을 POST 로 곧장 만들 수 있다.** 새 배송 건은 반드시 `waiting` 으로 태어나야 하는데(화면은 그렇게 만든다 — `:279`), 서버가 요청을 믿으면 **송장을 붙이는 조작 하나가 발송처리까지 건너뛴다.** 그러면 '배송대기'라는 구간이 사라지고 **나가지도 않은 물건이 고객에게 '배송중'으로 통지된다**(도메인이 존재하는 이유 그 자체 — `shipment.ts:20-22`).
2. **`shippedAt` 을 임의 시각으로 위조할 수 있다.** 이 값은 **목록 정렬의 키**이고(`data-source.ts:107-109`) 발송 SLA·정산의 근거다. 과거로 밀면 지연 발송이 정상 발송으로 보이고, `''` 로 되돌리면 이미 나간 건이 '오늘 할 일' 맨 위로 돌아온다.
3. **`deliveredAt` 을 위조하면 배송완료가 조작된다.** 배송완료는 구매확정·반품 기한의 기산점이 되는 사실이다 — 이 앱이 그 계산을 아직 하지 않을 뿐, 값의 성격은 그렇다.
4. **`status` 를 역방향으로 되돌릴 수 있다.** 전이 가드는 `applyShipmentStatus` 안에 있고(`:480-481`) **PUT 바디는 그 함수를 지나지 않는다** — 화면이 지나갈 뿐이다. 서버가 재판정하지 않으면 `delivered → waiting` 이 그대로 저장된다.
5. **`lines` 도 위조 대상이다.** 수량을 부풀리면 `allocateCovered` 가 `Math.min` 으로 캡하더라도(§7.4) **커버리지가 조기에 `complete` 가 되어 아직 안 나간 품목이 '다 나갔다'로 바뀐다.**

**판정**: `status` · `shippedAt` · `deliveredAt` 은 **전부 서버가 소유한다.** 요청 바디의 이 값들은 **무시**한다.

- **POST**: 언제나 `status: 'waiting'` · `shippedAt: ''` · `deliveredAt: ''`. 요청에 무엇이 실려 있든 파싱하지 않는다.
- **PUT**: `status` 는 **전이 요청으로만** 해석하고 §3 의 표로 재판정한다. **시각은 서버가 찍는다** — `shippedAt`/`deliveredAt` 를 요청에서 읽지 않고, 이미 찍힌 값은 덮지 않는다(§7.3).
- **`lines`**: EP-02 에서 잔량 대조로 검증하고(검증 6), **EP-03 에서는 아예 받지 않는다** — 나간 배송 건의 품목 구성이 바뀌면 커버리지의 과거가 위조된다.

**계약을 둘 중 하나로 좁힌다.**

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `POST` 는 `{ orderId, carrierId, invoiceNo, lines }` 만, `PUT` 은 `{ status }`(전이 요청) 또는 `{ carrierId, invoiceNo }`(대기 상태의 송장 정정)만 받는다 | 위조가 구조적으로 불가능하다. `toShipmentInput` 이 **두 개의 좁은 입력**으로 갈리고 어댑터 시그니처는 그대로다 — 화면 코드는 두 자리(`:284`·`:318`)만 바뀐다 |
| **B (차선)** | 전체 치환을 유지하되 서버가 서버 소유 필드를 **무시** | 어댑터를 덜 흔든다. 그러나 '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨지고, 그 깨짐은 **위조된 발송 시각**으로만 드러난다 — 안 A 는 타입이 강제한다 |

**어느 안이든 서버는 요청의 상태·시각·품목 구성을 신뢰하지 않는다.**

### 7.9 동시성 — 토큰이 없어 last-write-wins 이고, 같은 주문에 송장 둘이 붙는다 【정합 판정】

**`Shipment` 에 `version`·`updatedAt` 이 없고 어댑터가 `If-Match` 를 보내지 않는다** — `grep -rn "If-Match\|updatedAt\|version" apps/admin/src/pages/orders/shipments apps/admin/src/shared/domain/shipment.ts` = **0건**(2026-07-22 실측). 어댑터의 409 는 **'존재 여부' 기반**이다(`crud.ts:144-146`).

**판정 1 — 합법 범위의 동시 편집은 `last-write-wins` 다.** 두 운영자가 같은 배송 건의 송장번호를 각각 고치면 나중 것이 이긴다. **부분 방어 둘이 있다**: 전이는 §3 의 가드가 재판정하므로 **역방향은 422 로 막히고**, 송장 충돌은 유일 제약이 **409 로 막는다**(§7.1). 그러나 **같은 배송 건의 `carrierId` 정정 같은 합법 변경은 덮인다.**

**판정 2 — 두 운영자가 같은 주문에 동시에 송장을 붙이면 무엇이 일어나는가.** 코드로 확인한 사실이다.

1. 두 사람이 각각 '송장 입력'을 연다. 다이얼로그의 줄은 **여는 시점의 `rows` 스냅숏**이고(`InvoiceBulkDialog.tsx:129-131`) 중복 대조군 `existing` 도 **그 시점의 목록**이다(`ShipmentListPage.tsx:516`).
2. 각자 `row.remaining` **전부**를 실은 배송 건을 만든다(`:277-278`) — 잔량을 쪼갤 수단이 이 화면에 없다.
3. **다른 택배사를 골랐다면 중복 판정이 걸리지 않는다**(§7.1 — 의도된 허용). **같은 택배사라도 번호가 다르면 걸리지 않는다.** 즉 **같은 물건에 송장 두 장이 붙는다.**
4. 커버리지는 **초과되지 않는다** — `allocateCovered` 의 `Math.min` 이 품목 수량에서 캡한다(§7.4). 그래서 `covered > total` 인 배지는 나오지 않는다.
5. **그러나 원장은 거짓이 된다**: 배송 건 두 장이 같은 SKU·수량을 주장하고, 발송처리하면 두 장 모두 `shipping` 이 되며 고객에게는 **추적 링크 두 개**가 존재한다. 창고에서 나간 것은 한 번이다.

**판정 — 서버가 이것을 막는다.** 유일 제약(§7.1)은 이 경합을 잡지 못한다. 그러므로 **EP-02 는 잔량 대조를 서버에서 다시 한다**(검증 6): 요청의 `lines` 수량 합이 **저장 시점의 `uninvoicedLines`** 를 넘으면 **422 `SHIPMENT_LINES_INVALID`**. 두 번째 요청은 잔량이 0 이므로 거절된다. **이 검증은 주문 단위 잠금(또는 직렬화 격리) 안에서 수행해야 한다** — 두 요청이 같은 순간에 잔량을 읽으면 둘 다 통과한다. **이것이 이 계약에서 잠금이 필요한 유일한 지점이다.**

**판정 3 — 일괄 처리의 창이 넓다.** 화면은 N건을 **병렬**로 보내고(`bulk.ts:44`) **멱등키를 넘기지 않는다**(grep 0건). 연타 방어는 다이얼로그의 `busy` 잠금 하나뿐이고 **동기 제출 락(`submitLockRef`)이 없다.** 도메인 제약 둘이 사고를 막는다 — **송장 등록의 이중 실행은 409 로**, **전이의 이중 실행은 422(역방향)로**. 그러나 **그것은 '막힌다'이지 '멱등이다'가 아니다**: 성공한 재시도가 실패로 보고되고(§7.5), 운영자는 무엇이 저장됐는지 모른다. **`Idempotency-Key` 를 붙이면 이 셋이 한꺼번에 정리된다.**

### 7.10 배송 건 삭제 — 계약에 존재하지 않는다 【범위 판정】

**코드로 확인한 사실**:

- `data-source.ts:4-5`: `삭제 UI 는 없다 — 잘못 붙인 송장은 지우는 것이 아니라 다시 붙이는 것이고(수정), 이미 나간 배송의 기록은 남아야 한다(감사 성격).`
- `shipmentAdapter.remove` 호출부 **0건**(grep). 표에 행 액션 열이 없고(`ShipmentTable.tsx:33-41`) 선택은 **삭제가 아니라 '골라서 내보낸다'** 이다(`:3-6`).
- 화면이 `CrudListShell` 을 쓰지 않는 이유도 그것이다 — **쓰기 껍데기의 체크박스는 일괄 삭제에 묶여 있다.**

**판정**: `DELETE /api/shipments/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**다. 잘못 붙인 송장의 복구 경로는 **삭제가 아니라 `status === 'waiting'` 인 동안의 정정**이다(EP-03 검증 2).

**남는 구멍 하나**: **이미 나간 배송 건(`shipping`·`delivered`)의 오입력을 되돌릴 길이 없다.** 전이는 역방향이 막히고(§7.3) 송장 정정은 `waiting` 에서만 열린다. 취소 배송 건이라는 개념도 없다. **역이동 계약이 없다는 사실을 이관한다**(§7.13 #8) — 클레임 계약이 같은 자리에서 같은 것을 남겼다(BE-044 §7.12 #19).

**부수 사실**: `create`/`remove` 는 공용 팩토리가 **인터페이스로 제공**할 뿐이라 실수로 호출하면 실제로 동작한다 — 부재가 코드로 강제되지 않는다(BE-044 §7.12 #11 과 같은 결).

### 7.11 배송 건은 404 로 은닉하고, `operator` 에게 쓰기를 연다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/shipments` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 배송 건은 주문을 가리킨다** → 주문 도메인 **읽기 권한이 없는** 주체에게는 **404 `SHIPMENT_NOT_FOUND`** 로 은닉한다.

**근거**: 배송 건 1건은 `orderId`(주문번호) · `invoiceNo`(송장번호) · `carrierId` 를 담는다. **송장번호는 그 자체로 조회 키다** — 택배사 사이트에 넣으면 **수령인 이름과 배송 주소 일부가 나온다.** 즉 이 응답은 개인정보로 가는 외부 링크를 들고 있다. 주문번호는 `ORD-YYYYMMDD-NNNN` 형식(`pages/orders/data-source.ts:71-72`)이라 **열거로 그 날의 주문 볼륨을 추정**할 수 있다. BE-044 §7.5 가 클레임 상세를 404 로 은닉하는 것과 **같은 이유**다.

**수령인 정보는 이 응답에 없다** — `Shipment` 에 이름·주소가 없고, 화면은 그것을 **주문 조회에서** 얻는다(`ShipmentTable.tsx:151`). **이 분리를 유지한다**: 배송 건 응답에 수령인을 임베드하면 목록 한 번으로 전체 고객 명부가 나간다.

**`operator` 에게 쓰기를 연다**(BE-044 §7.8 · BE-026 §7.8 과 같은 결). 근거: **오늘 무엇을 내보내는가는 운영자의 본업**이다. 여기를 막으면 화면을 쓸 사람이 `admin` 뿐이고 역할 구분이 무의미해진다. 여는 것이 안전한 이유:

- **금액을 만지지 않는다.** 이 계약에 운영자가 고칠 수 있는 금액이 **하나도 없다**(클레임의 `returnShippingFee` 같은 자리가 없다).
- **수량을 만들 수 없다.** 배송 건의 `lines` 는 **주문의 잔량에서 나오고**(`uninvoicedLines`) 서버가 그것을 대조한다(EP-02 검증 6).
- **재고 이동을 직접 지시할 수 없다.** 재고는 주문 어댑터의 부수효과로만 움직인다(§7.5).

**결론**: EP-01 · EP-02 · EP-03 · EP-04 모두 `admin` + `operator`. 주문 도메인 권한이 아예 없는 역할만 차단한다.

### 7.12 목록이 전량을 내려준다 — 페이징을 도입한다

**현재 계약의 문제**: `fetchAll(signal)` 이 파라미터를 받지 않고 **배송 건 전량**을 반환하며, 같은 화면이 **주문도 전량** 받는다. 필터·검색·조인이 전부 클라이언트다. **배송 건은 매일 쌓이는 무한 증가 컬렉션**이고, 이 화면은 '오늘 할 일 목록'이라 **건수가 곧 작업량**인데 300건이면 300행이 한 DOM 에 그려진다(FS-072 §7 #5).

**행이 주문이라는 사실이 페이징을 어렵게 만든다**(§3): 한 페이지를 만들려면 **주문 페이지와 그 주문들의 배송 건**이 함께 필요하다. 배송 건을 따로 페이징하면 행이 반쯤 채워진다.

**판정**: 페이징은 **주문 축에 건다.** `GET /api/orders` 에 `page`·`size`(기본 20 · 상한 100)와 배송 필터를 붙이고, `GET /api/shipments` 에는 **`orderIds` 필터**(또는 그 페이지의 주문에 딸린 배송 건만 내려주는 조인 응답)를 붙인다. **작업 상태 필터(`pending`/`waiting`/`shipping`/`delivered`)는 커버리지 파생값이라 서버가 같은 규칙으로 계산해야 한다**(§7.4) — 클라이언트 규칙(`types.ts:86-95`)을 그대로 옮긴다.

**이관**: 이 변경은 **프론트 대공사**다 — `buildShipmentRows`·`filterRowsByWork`·`searchShipmentRows`·`countRowsByWork` 가 서버로 올라가고, 페이지네이션 UI 와 순번 오프셋이 함께 붙어야 한다. **URL list state 는 이미 있다**(`useListState` — `page`·`sort` 가 소비되지 않을 뿐이다). quality-bar IA-04 P0 가 이 화면을 gap 으로 잡고 있다. 그전까지 현 계약(전량)을 유지한다 — 픽스처 6건에서는 드러나지 않는다.

### 7.13 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **서버 소유 필드를 요청 바디에서 제거(§7.8 안 A)** — `status`·`shippedAt`·`deliveredAt`·`lines`. **발송 시각 위조가 이 계약에서 가장 직접적인 무결성 손실 경로다** | 백엔드 명세 · UI 기획 (최우선) |
| 2 | **멱등키가 전혀 전달되지 않는다** — `grep idempotencyKey pages/orders` **0건**. 자리(`crud.ts:323,345`)와 원장(`crud.ts:67-77`)이 있는데 호출부가 비어 있다. `submitLockRef` 도 없다(quality-bar EXC-08 P0). **송장 등록은 `create` 라 값이 멱등이 아니다** — 지금은 서버가 없어 `(carrierId, invoiceNo)` 유일 제약도 없고, **픽스처에서는 같은 송장 두 장이 실제로 만들어질 수 있다** | UI 기획 · 백엔드 명세 (최우선) |
| 3 | **일괄 처리의 부분 실패가 건수만 말한다** — `settleAllDetailed` 가 사유를 함께 돌려주는데 화면이 `failed` 만 꺼내 쓴다(`ShipmentListPage.tsx:220`). **409(중복 송장)와 422(전이 위반)와 500 이 한 문장으로 뭉개진다** — 재시도가 푸는 실패와 아닌 실패를 운영자가 가릴 수 없다. 조회 실패도 주문/배송 건을 가르지 않는다(`:153`) | UI 기획 · 프론트 구현 |
| 4 | **'택배사를 모른다'와 '택배사가 삭제됐다'가 표에서 뭉개진다**(§7.6) — `carrierNameOf` 가 두 경우 모두 `'알 수 없는 택배사'`. **송장 다이얼로그는 그 둘을 정확히 가르는데** 표는 가르지 않는다 | UI 기획 · 프론트 구현 |
| 5 | **BE-043 이 코드보다 낡았다**(§7.7) — 그 문서는 `carrier` 를 자유 텍스트로 판정하고 '택배사 코드 마스터 소유 확정'을 이관해 두었으나, 코드는 이미 `Carrier`(id·code·`trackingUrlTemplate`·`active`)와 **삭제 가드**를 갖췄다. **택배사 CRUD 엔드포인트와 삭제 409 계약을 BE-043 에 적어야 한다** — 여기서만 적으면 그쪽이 모른다 | **백엔드 명세 (연동 · BE-043 개정)** |
| 6 | **`countShipmentsByCarrier` 가 어댑터가 아니라 `SHIPMENT_SEED` 를 센다**(`data-source.ts:120-122`) — **방금 등록한 송장이 삭제 가드에 반영되지 않는다.** 그 상태에서 택배사를 지우면 그 송장은 이름도 추적 링크도 잃는다. 코드가 한계를 스스로 적어 두었다(`:115-118`) | 백엔드 명세 (EP-04) |
| 7 | **400/422 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다** — 송장 다이얼로그의 줄 단위 오류 자리(`InvoiceBulkDialog.tsx:298-302`)는 **클라이언트 검증에서만** 채워진다. 서버가 어느 줄을 거절했는지 말해도 그릴 자리가 없다(quality-bar EXC-07 P1) | UI 기획 |
| 8 | **역이동 계약이 없다**(§7.10) — 이미 나간 배송 건의 오입력을 되돌릴 길이 없다(전이는 역방향 금지, 송장 정정은 `waiting` 에서만, 삭제 없음). 취소 배송 건 개념도 없다 | 백엔드 명세 · 아키텍처 |
| 9 | **고객 알림이 없다**(§4 EP-03 검증 6) — 도메인(`shipment.ts:22`)과 심(`data-source.ts:98`)이 모두 `waiting → shipping` 을 발화 지점으로 적어 두었으나 **지금은 이력만 남는다.** 발송 알림 없이 송장만 등록되면 고객은 배송 여부를 스스로 확인해야 한다 | **백엔드 명세 (우선)** · UI 기획 |
| 10 | **송장을 나눠 붙일 수 없다** — 도메인은 부분 발송을 완전히 지원하는데(`uninvoicedLines`) 다이얼로그가 **잔량 전부를 한 송장에 싣는다**(`ShipmentListPage.tsx:277-278`). 그 결과 **픽스처가 만들어 둔 부분발송 상태를 화면에서 재현할 수 없다.** 계약(EP-02)은 이미 부분 등록을 받을 수 있다 — 막고 있는 것은 UI 다 | **UI 기획 (최우선)** |
| 11 | **목록 페이징 + 작업 상태 필터의 서버 이관**(§7.12) — IA-04 P0 와 한 배치로. 행이 주문이라 **주문 축에 페이징을 걸어야 한다** | 백엔드 명세 · UI 기획 |
| 12 | **제외 사유 문구가 도메인 상수를 인용하지 않는다** — 배송준비중 다이얼로그의 '나머지는 이미 지난 단계이거나 입금이 확인되지 않은 주문입니다.'(`ShipmentListPage.tsx:499`)는 **화면이 직접 쓴 문장**이다. 주문 목록은 같은 자리에서 `ORDER_TRANSITION_UNPAID` 를 그대로 인용한다 — 규칙이 바뀌면 이쪽만 낡는다 | 프론트 구현 (경미) |
| 13 | **`runInvoice` 가 못 찾은 행을 조용히 건너뛴다**(`:268-269`) — `settleAllDetailed` 가 그것을 **성공으로 센다.** '3건에 송장을 등록했습니다' 토스트가 뜨는데 실제로는 2건일 수 있다. **조용한 성공은 이 리포가 가장 경계하는 실패 모드다**(§7.6) | 프론트 구현 |
| 14 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건) — §2 의 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다. 오프라인 감지 없음(`navigator.onLine` 0건). 세션 만료가 **송장 모달의 입력을 버린다**(가드 미발화) | 프론트 구현 (quality-bar EXC-05 · EXC-11 · EXC-19) |
| 15 | 저장 중 이탈 abort 는 **클라이언트만 결과를 버릴 뿐 서버 도달 여부를 보장하지 않는다** — 송장이 이미 만들어졌는데 화면에 안 보일 수 있고, 그때 재시도는 409 를 받는다 | 백엔드 명세 · UI 기획 |
| 16 | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다**(§7.10) — 부재가 코드로 강제되지 않는다 | UI 기획 쪽 변경 요청 |

## 8. 자기 점검

- [x] FS-072 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 4건(EP-01·02·03·04) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**: 삭제는 §7.10 에서 '계약 없음'으로 판정, 주문 조회·전이는 주문 계약의 것을 **소비 사실로만** 기록, 택배사 카탈로그는 BE-043 의 것을 소비 사실로만 기록, 고객 알림은 **'발화 지점만 있고 계약은 없다'** 로 남겼다(§7.13 #9)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (4행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한(§7.11 `operator` 쓰기 허용)·타임아웃(§2 쓰기 10초)·엔타이틀먼트 모듈 소속만 고유 차이**를 근거와 함께 기술
- [x] **멱등성 판정** — 조회 GET 멱등 / **이 도메인의 멱등키는 타임스탬프가 아니라 `(carrierId, normalize(invoiceNo))` 부분 유니크 제약**임을 §7.1 에서 판정하고, 어떤 재시도가 안전하고 어떤 것이 409/422 인지 표로 못박았다. **`applyShipmentStatus` 가 시각을 덮지 않는 것도 멱등 규약**으로 승격했다(§7.3)
- [x] **전이 가드 두 벌을 판정 순서 그대로** §3 표로 들어 올리고 **거절 사유 문자열을 상수 그대로** 적었다(`SHIPMENT_TRANSITION_BACKWARD` · `SHIPMENT_DISPATCH_NO_INVOICE` · 진행률 포함 두 문장). **주문 축에 먼저 묻는다**는 사실을 §7.3 의 첫 항으로 세웠다
- [x] **파생값 비저장 판정** — `allocateCovered`(module-private) 하나가 소유하고 `shipmentCoverage`·`uninvoicedLines`·`applyShippedQuantities` 가 그 위에 선다는 사실, **`OrderLine.shippedQuantity` 가 결과이지 독립된 사실이 아니라는 판정**, `Math.min` 캡의 이유를 §7.4 에 적고 서버 안 A/B 를 제시했다
- [x] **미배선 규약을 표로 정리**하고(§7.6 · 6칸) 서버가 붙어도 같은 규약(빈 배열·0 을 만들어 내지 않는다)을 지켜야 함을 【정합 판정】으로 남겼다
- [x] **경계 판정** — 택배사 목록의 정본은 BE-043, 배송 건의 정본은 이 계약이며 **두 조회기가 반대 방향으로 서로에게 닿는다**는 사실과 택배사 삭제의 409 계약을 §7.7 에 적고, **BE-043 이 코드보다 낡았다**는 사실을 §7.13 #5 로 이관했다
- [x] **동시성** — `version`/`updatedAt`/`If-Match` grep **0건**을 실측하고 **last-write-wins** 로 단정했다. **두 운영자가 같은 주문에 동시에 송장을 붙이는 경합을 코드로 추적**해(다른 택배사면 중복 판정이 안 걸린다 · 커버리지는 `Math.min` 이 캡한다 · 그러나 원장은 거짓이 된다) **주문 단위 잠금 안의 잔량 재대조**를 유일한 방어로 판정했다(§7.9). 일괄의 트랜잭션 경계는 **건별 원자성 + 부분 성공은 정상 결과**로 못박았다(§7.5)
- [x] **보안 판정 2건** — **서버 소유 필드 위조(§7.8 — 발송 시각·상태·품목 구성)** · **403 vs 404 은닉 + 송장번호가 외부 조회 키라는 사실 + 수령인 비임베드(§7.11)**
- [x] **확인하지 못한 것을 쓰지 않았다** — 고객 알림은 '발화 지점만 있고 구현·계약이 없다'로, 역이동은 '계약 없음'으로, BE-043 과의 정합은 '그쪽 개정 필요'로 남겼다. 실측 grep 3건(동시성 토큰·멱등키·타임아웃)은 명령과 결과를 함께 적었다
- [x] 서버 코드·저장소 설계를 쓰지 않았다 — 유일 제약과 잠금 지점은 **계약이 요구하는 보장**으로만 서술했다
