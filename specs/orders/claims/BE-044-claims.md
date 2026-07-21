---
id: BE-044
title: "취소/교환/반품 백엔드 기능 명세"
functionalSpec: FS-044
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 2.0
date: 2026-07-22
---

# BE-044. 취소/교환/반품 백엔드 기능 명세

> ## 개정 이력 — v2.0 (2026-07-22): 교환/반품 계약이 **클레임 계약**이 됐다
>
> v1.0 은 `/products/returns`(교환/반품)의 계약이었다. 화면이 `/orders/claims` 로 이사하면서 계약이 다루어야 할
> 축이 둘 늘었고, v1.0 이 '없다'고 판정했던 것 하나가 코드에 생겼다. 본문 전체를 코드와 대조해 다시 도출했다.
>
> | 무엇이 | v1.0 | v2.0 |
> |---|---|---|
> | 리소스 | `/api/returns` | **`/api/claims`** (프론트 어댑터 `SCOPE = 'claims'`) |
> | 유형 | `exchange \| return` | **`cancel \| exchange \| return`** — 유형이 흐름을 결정한다(§3) |
> | **상태 전이 규칙** | **계약에 없다**(v1.0 §7.1 — '미정'으로 남겼다) | **있다.** 코드가 사유 문자열을 돌려주는 가드를 갖고, 어댑터가 화면과 **같은 함수**로 재판정한다 → 서버는 그 표를 그대로 못박는다(§7.1) |
> | 주문 참조 | `orderNo: string`(자유 문자열) | **`orderId` 참조**. 취소 가능 여부가 **주문의 사실**(`hasLeftWarehouse`)에서 나온다(§7.1·§7.4) |
> | 환불 | `refundAmount: number` 표시 전용(v1.0 §7.7) | **`refund: ClaimRefund` 한 벌** — 상태·금액 스냅숏·차감·복원 결과. 이 계약이 **기록**하고, 실제 송금은 여전히 결제 도메인의 것이다(§7.7) |
> | 부수효과 | 재고 이동 1종 | **재고 이동 + 적립금 원장 append 2종**, 멱등키도 2개(`stockAppliedAt` · `refund.completedAt`) — §7.2·§7.11 |
> | 재고와 취소 | (취소가 없었다) | **취소 클레임은 재고를 움직이지 않는다** — 복원 소유권이 주문에 있다(§7.4) |
> | 미배선 시 동작 | 규정 없음 | **조용한 성공을 만들지 않는다** — 적용기·기입기가 없으면 멱등키를 찍지 않고, 원장 미배선은 **500 으로 저장 전체를 거절**한다(§7.11) |
>
> v1.0 §7.11 의 #2(상태 전이 미정)는 **해소**됐다. #1(서버 소유 필드 제거)·#3(멱등키)·#4(409 UI)·#5(동시성 토큰)는
> 그대로 살아 있고 §7.12 에서 번호를 다시 매겼다.

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-044 취소/교환/반품 (`/orders/claims` · `/orders/claims/:id`) |
| 범위 | 클레임 목록 조회, 클레임 상세 조회, **처리 저장(상태 전이 · 처리 메모 · 교환 재발송 옵션 · 환불 처리) + 그에 수반하는 SKU 재고 이동과 적립금 원장 기입**, 교환 옵션(SKU) 조회 |
| **범위 밖** | **클레임 생성** — 취소·교환·반품은 고객이 접수한다. 관리자가 클레임을 만드는 API 는 이 계약에 존재하지 않는다. **클레임 삭제** — 재고·환불·적립이 걸린 감사 대상 기록이며 관리자 삭제 진입점이 없다(§7.6). **상품·SKU·재고의 정본 CRUD** — BE-042(상품) 소관(§7.4). **주문의 상태 전이·취소·재고 복원** — 주문 계약 소관이며 이 계약은 **읽기만** 한다(§7.4). **적립금 잔액·원장 조회** — 회원 계약 소관이며 이 계약은 **양수 1건을 덧붙이기만** 한다(§7.11). **실제 송금·결제 취소** — 결제/정산 계약이 소유한다(§7.7) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 날짜는 `YYYY-MM-DD` |
| 프론트 어댑터 | `apps/admin/src/pages/orders/claims/data-source.ts` (`claimAdapter` = 공용 `createCrudAdapter` · 전용 함수 `fetchClaimVariants` · 참조 조회 `findClaimOrder`) |
| 도메인 타입 | `apps/admin/src/pages/orders/claims/types.ts`(클레임·전이 가드·재고 규칙) + `refund.ts`(환불 축). 주문·옵션·재고·원장·정책 타입은 **공통 층에서 온다**(`shared/domain/{order,order-ref,stock,variant-ref,point-ledger,shipping-policy}`) |
| 검증 정본 | **zod 스키마가 없다.** 이 화면은 `useCrudForm`+zod 를 쓰지 않는다 — 검증 정본은 순수 규칙(`claimTransitionBlock` · `cancelBlock` · `refundTransitionBlock` · `validateStockPlan` · `parseFeeInput` · `CLAIM_NOTE_MAX`)이며 그것을 **어댑터가 저장 직전에 같은 함수로 재판정한다**(`data-source.ts:272-296,319-340`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 클레임 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 2건 — 목록·상세·저장 | `data-source.ts:386` `// TODO(backend): GET /api/claims · GET/PUT /api/claims/:id (상태 전이 · 환불 처리 · 처리 메모)` |
| 심이 **트랜잭션·422·멱등키 2개**를 명시한다 | `data-source.ts:387-389` `완료 전이는 재고 이동을, 환불완료는 적립금 원장 기입을 동반한다 — 서버는 클레임 갱신 + SKU 재고 증감 + 원장 append 를 한 트랜잭션으로 처리하고, 재고 부족이면 422 로 거절한다. 멱등키는 stockAppliedAt · refund.completedAt 이다.` |
| 심이 **POST 부재를 의도로 못박는다** | `data-source.ts:390` `POST 는 열지 않는다: 클레임을 만드는 것은 관리자가 아니라 고객의 접수다.` |
| 심 1건 — 교환 옵션(SKU)·재고 조회 | `data-source.ts:403-404` `// TODO(backend): GET /api/products/:id/variants — 교환 옵션(SKU)·재고 조회.` |
| 심 1건 — 쿠폰 재발급 | `data-source.ts:370-372` `// TODO(backend): 쿠폰 복원은 발급 1건을 새로 만드는 일이다(사용 표시를 지우는 것이 아니다). 지금은 복원 여부만 클레임에 기록하고, 재발급은 서버가 POST /api/members/:id/coupons 로 처리한다.` |
| 등록·삭제 심 **없음** — 의도된 부재 | `ClaimsListPage.tsx:3-5` · `data-source.ts:3-5` (`생성·삭제 UI 는 없다 — 클레임은 고객이 만들고 관리자는 처리만 한다. 감사 성격이라 지우지도 않는다`) · `create`/`remove` 호출부 0건 |
| 부수효과가 전부 어댑터 `patch` 안에 있다 | `data-source.ts:7-9,380-384` (`patchClaim` = `assertTransitions` → `applyStockEffects` → `applyRefundEffects`) |
| 전이 규칙이 **존재하고 화면·저장소가 같은 함수를 읽는다** | `data-source.ts:11-13,272-296` ↔ `ClaimDetailPage.tsx:217-225,526-531` · 정본 `types.ts:267-291` · `refund.ts:200-211` |
| 멱등 키 2개 | `types.ts:189-190`(`stockAppliedAt` — `재반영을 막는 멱등 키다`) · `refund.ts:98-99`(`completedAt` — `복원을 두 번 하지 않게 하는 멱등 키다`) · 회귀 `claims.test.ts:746-755,817-826` |
| **취소는 재고를 움직이지 않는다** | `types.ts:333-344`(`movesStock` 이 `kind !== 'cancel'` 를 요구) · 회귀 `claims.test.ts:475-479,778-788` |
| 적립 원장은 **양수만** 받는다(append-only) | `point-ledger.ts:15-18,64-70`(음수는 던진다 · 0은 성공 · 미배선은 false) · 회귀 `claims.test.ts:425-453` |
| 미배선을 '성공'으로 위장하지 않는다 | `stock.ts:21-25,102-107` · `point-ledger.ts:20-24` · 소비 `data-source.ts:333,363-368` · 회귀 `claims.test.ts:843-859` |
| 유령 저장·409 는 공용 어댑터가 막는다 | `shared/crud/crud.ts:144-146` (`if (!items.some(...)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`) |
| 멱등키 원장이 어댑터에 있으나 **이 화면이 키를 넘기지 않는다** | `crud.ts:67-89,137,139`(원장) ↔ `ClaimDetailPage.tsx:252-254` (`update.mutate` 의 variables 에 `idempotencyKey` 없음) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세·옵션) + **처리 저장**(EP-03) — 클레임 응대는 운영자의 본업이므로 쓰기를 연다(§7.8). 주문 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / **개별 클레임 404 은닉**(§7.5).
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. **처리 저장은 재고 트랜잭션 + 원장 기입을 포함하므로 10초 → 504**(§7.2).
- **엔타이틀먼트**: 이 리소스는 `commerce.orders` 모듈에 속한다(`shared/entitlements/module-resources.ts:31-36`). 플랜에 없으면 화면 진입이 잠기지만 **그 판정은 라우트 계층의 것이며 이 계약의 응답 코드가 아니다** — 서버는 권한(403/404)만 말한다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 `useRouteWritePermissions` 를 배선했지만(FS-044-EL-054) 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다. 권한 강제는 전적으로 서버 책임이다.

## 3. 데이터 계약 (`types.ts` · `refund.ts` · `shared/domain/**` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Claim` | `id` · **`orderId`**(주문번호를 겸하는 주문 id) · `productId` · `productName`(스냅숏) · `customer`(마스킹) · **`memberId`**(비회원이면 `''`) · `kind` · `optionValues[]` · `exchangeOptionValues[]` · `reason` · `reasonDetail` · `quantity` · `requestedAt`(`YYYY-MM-DD`) · `status` · `stockAppliedAt`(ISO 또는 `''`) · `stockMovements[]` · **`refund: ClaimRefund`** · `adminNote` | 목록·상세가 **같은 타입**이다 — 목록도 `reasonDetail`·`stockMovements`·`refund` 전문을 받는다(§7.9). `refundAmount: number` 는 **사라졌다** — 금액은 `refund` 안에 내역과 함께 있다 |
| `ClaimRefund` | `status` · `paidAmount`(스냅숏) · `pointUsed`(스냅숏) · `couponDiscount`(스냅숏) · `couponName` · `returnShippingFee` · `couponRestored` · `completedAt`(ISO 또는 `''`) · `restoredPoint` | **금액 3종은 접수 시점 스냅숏**이다(`refund.ts:77-82`) — 주문서가 사후 정정돼도 지난 환불의 근거가 바뀌지 않는다. **총액을 저장하지 않는다**(§7.7) |
| `StockMovement`(공통 층) | `id` · `at`(ISO) · `direction`(`in`\|`out`) · `sku` · `optionLabel`(이동 시점 스냅숏) · `quantity` | append-only. **확정된 사실만** — 계획은 저장하지 않는다. **주문도 같은 타입을 쓴다**(`shared/domain/stock.ts:4-12`) — 같은 SKU 의 증감이 두 이야기가 되지 않게 |
| `ClaimInput` | `Omit<Claim, 'id'>` | 저장 입력. 불변 필드(`orderId`·`productId`·`productName`·`customer`·`memberId`·`kind`·`optionValues`·`reason`·`reasonDetail`·`quantity`·`requestedAt`)와 **서버 소유 필드(`stockAppliedAt`·`stockMovements`·`refund.completedAt`·`refund.restoredPoint`)까지 포함한 전체 치환**이다(§7.3) |
| `ClaimKind` | `cancel` \| `exchange` \| `return` | 접수 후 불변. **유형이 흐름을 결정한다**(아래) |
| `ClaimStatus` | `requested` \| `collecting` \| `inspecting` \| `completed` \| `rejected` \| `withdrawn` | **전이 규칙이 있다**(§7.1) |
| `RefundStatus` | `none` \| `requested` \| `completed` | 클레임 상태와 **나란한 별개의 축**. 되돌리는 전이가 없다 |
| `OrderRef`(공통 층) | `id` · `orderedAt` · `status` · `customerName` · `total` · `canceled` | 이 계약이 **읽기만** 한다. 취소 가능 여부가 `status` 에서 나온다(§7.1) |
| `VariantRef`(공통 층) | `id` · `sku` · `optionValues[]` · `stock` | **BE-042 가 소유한다.** 이 계약은 읽기만 한다(EP-04). 옵션 추가금액·품절 플래그는 계약에 없다 — 필요하지 않다 |
| `PointRestore`(공통 층) | `memberId` · `orderNo` · `reason` · `amount`(**양수만**) · `date` | 원장에 덧붙일 지급 1건. **음수를 넣을 통로가 없다**(§7.11) |
| 상수 | `CLAIM_NOTE_MAX = 500` | 처리 메모 상한 |

**처리 상태 (`STATUS_META` — 표시)**

| 값 | 라벨 | 톤 | 흐름상 위치 |
|---|---|---|---|
| `requested` | 접수 | neutral | 모든 유형의 시작 |
| `collecting` | 수거중 | info | **교환·반품에만 있다** — 취소는 물건이 아직 창고에 있다 |
| `inspecting` | 검수중 | warning | **교환·반품에만 있다** |
| `completed` | 완료 | success | 모든 유형의 종착 — **여기서만 재고가 움직인다**(단, 취소는 제외 — §7.4) |
| `rejected` | 반려 | danger | **흐름 밖 종료** — 어느 단계에서나 갈 수 있다 |
| `withdrawn` | 철회 | neutral | **흐름 밖 종료이자 유일한 역방향 전이** — 되돌릴 수 없는 것이 이미 일어났으면 막힌다(§7.1) |

**유형별 흐름 (`claimFlow` — `types.ts:125-128`)**

| 유형 | 흐름 | 근거 |
|---|---|---|
| `cancel` | `접수 → 완료` (**2단**) | 물건이 아직 창고에 있어 수거·검수가 없다. 없는 단계를 남기면 영원히 채워지지 않는 칸 둘이 생긴다 |
| `exchange` · `return` | `접수 → 수거중 → 검수중 → 완료` (4단) | 나갔다 돌아오는 물건이 있다 |

> **`claimFlow` 는 표시 배열이 아니라 규칙이다.** v1.0 의 `RETURN_FLOW` 는 스텝퍼가 `indexOf` 로 읽는 표시 전용이었고 그 부재가 v1.0 §7.1 의 판정이었다. 지금은 **전이 가드가 같은 배열을 읽고**(`types.ts:284-288`), 흐름에 없는 상태의 위치를 −1 이 아니라 **끝 다음**으로 보아 fail-closed 로 수렴시킨다(`:142-146`).

**클레임 전이 규칙 (순수 — `types.ts:267-291`, 회귀 `claims.test.ts:162-229`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | `to === status` | `이미 그 상태입니다.` |
| ② | 현재가 종료 상태(`completed`·`rejected`·`withdrawn`) | `완료·반려·철회된 클레임은 상태를 바꿀 수 없습니다.` |
| ③ | `to === 'withdrawn'` 이고 `stockAppliedAt !== ''` | `재고가 이미 반영되어 철회할 수 없습니다. 반영된 재고는 되돌아가지 않습니다.` |
| ③' | `to === 'withdrawn'` 이고 `refund.status !== 'none'` | `환불이 접수되어 철회할 수 없습니다. 환불 처리를 먼저 정리하세요.` |
| ④ | `to === 'rejected'` | **허용** — 출고된 취소 건이라도 종료는 시킬 수 있어야 한다 |
| ⑤ | `to` 가 그 유형의 흐름에 없음 | `이 유형에는 없는 처리 단계입니다.` |
| ⑥ | 역방향(또는 같은 자리) | `클레임 처리는 되돌릴 수 없습니다. 접수를 취소하려면 철회로 종료하세요.` |
| ⑦ | `kind === 'cancel'` → `cancelBlock(order)` | 주문 미확인 `연결된 주문을 확인할 수 없어 취소를 진행할 수 없습니다. …` / 출고됨 `배송이 시작된 주문은 취소로 처리할 수 없습니다. 반품으로 접수해 주세요.` |

**환불 전이 규칙 (순수 — `refund.ts:200-211`, 회귀 `claims.test.ts:315-376`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | `to === refund.status` | `이미 그 환불 상태입니다.` |
| ② | `kind === 'exchange'` | `교환은 환불 대상이 아닙니다.` |
| ③ | `refund.status === 'completed'` | `환불이 완료되어 더 이상 바꿀 수 없습니다.` |
| ④ | 역방향 | `환불 처리는 되돌릴 수 없습니다.` |
| ⑤ | 클레임이 `rejected`·`withdrawn` | `반려·철회된 클레임은 환불할 수 없습니다.` |
| ⑥ | `to === 'completed'` 이고 클레임이 미완료 | `클레임 처리를 완료해야 환불을 완료할 수 있습니다.` |
| ⑦ | `to === 'completed'` 이고 `pointUsed > 0` 이며 `memberId === ''` | `비회원 주문이라 적립금 원장이 없습니다. …` |

**재고 규칙 (순수 — `types.ts:329-419`, 회귀 `claims.test.ts:469-577`)**

| 규칙 | 정의 |
|---|---|
| `findVariant(variants, optionValues)` | 값과 **순서가 모두 같아야** 같은 SKU (`:317-326`) |
| `isStockApplied(claim)` | `stockAppliedAt !== ''` — **멱등 키**(`:329-331`) |
| `movesStock(claim)` | `status === 'completed' && kind !== 'cancel'` (`:342-344`) — **취소는 언제나 false**(§7.4) |
| `validateStockPlan(claim, variants)` | `cancel` → 즉시 null · `unknown-origin`(주문 옵션이 상품에 없음) → 반품이면 여기서 null · `no-option` → `unknown-option` → `insufficient-stock`(`target.stock < quantity`) → null (`:366-378`) |
| `planStockMovements(claim, variants, at)` | 취소 = **빈 배열** · 반품 = 회수분 입고 1건 · 교환 = 회수분 입고 + 재발송 출고 2건 (`:387-419`). 이동 id 는 `mv-<at>-in`/`mv-<at>-out` |
| `applyMovements(units, movements)`(공통 층) | 입고 +, 출고 −. **`Math.max(0, …)` 로 음수 재고를 만들지 않는다**(`stock.ts:63-77`) — §7.10 |

**환불 계산 규칙 (순수 — `refund.ts:135-173`, 회귀 `claims.test.ts:251-293`)**

| 규칙 | 정의 |
|---|---|
| `refundBreakdown(refund)` | `couponClawback = couponRestored ? couponDiscount : 0` · `total = max(0, paidAmount − returnShippingFee − couponClawback)`. **총액은 저장하지 않는다** — 차감을 정정한 순간 총액과 항목이 어긋난 환불서가 남는다 |
| `defaultReturnFee(kind, policyFee)` | 취소는 **언제나 0**(되돌아오는 물건이 없다) · 그 밖은 정책값 그대로. **정책을 모르면 `null` 이지 0 이 아니다** |
| `parseFeeInput(value)` | `/^\d+$/` + `Number.isSafeInteger` 만 통과. `'3,000'`·`'2.5'`·`'-100'`·`''` 전부 `null` |
| `planRefundRestoration(claim)` | `completedAt !== ''`(멱등) 또는 비회원이면 `point = 0`. 쿠폰은 `!already && couponRestored && couponDiscount > 0` 일 때만 |
| `restoreReason(kind)` | `주문 취소 환불 적립금 복원` / `반품 환불 적립금 복원` — 원장만 보고도 무엇이 돌려준 것인지 안다 |

## 4. 엔드포인트 명세

### BE-044-EP-01 · 클레임 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-004, EL-006, EL-006.1, EL-007, EL-007.1~.11, EL-008, EL-009, EL-010 |
| 심 | `data-source.ts:386` `GET /api/claims` |
| 메서드·경로 | `GET /api/claims` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.9) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 필터(유형·상태)·검색을 **전부 클라이언트에서** 수행하므로(FS-044-EL-004) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다(`crud.ts:99-100`).

**응답 200** — `readonly Claim[]`. **접수일 내림차순 정렬**(동시 날짜는 `id` 내림차순 안정 정렬 — `sortClaims` `types.ts:442-447`)로 내려준다. 프론트가 어댑터 안에서 한 번 더 정렬하지만(`crud.ts:94-95`) 서버 순서가 정본이어야 페이징 도입 시(§7.9) 계약이 유지된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-044-EP-02 · 클레임 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-013, EL-016, EL-017, EL-017.2, EL-036~EL-043, EL-048, EL-049, EL-050 |
| 심 | `data-source.ts:386` `GET /api/claims/:id` |
| 메서드·경로 | `GET /api/claims/:id` |
| 권한 | `admin`, `operator`. 주문 도메인 읽기 권한 없음 → **404 은닉**(§7.5) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Claim`(환불 한 벌 + 재고 이동 이력 전체 포함). `stockMovements` 는 **`at` 오름차순**으로 내려준다 — 프론트가 정렬하지 않고 받은 순서 그대로 렌더한다(`StockMovementTable.tsx:77`).

**주문 참조의 해소**: 상세 화면은 `orderId` 로 **주문의 상태·취소 여부**를 읽어 취소 가드와 '주문 상태' 행을 그린다(FS-044-EL-017.2 · EL-028). 프론트에서는 이것이 **동기 조회기**(`shared/domain/order-ref`)이고 실제 목록은 주문 모듈이 꽂는다. **서버에서는 두 선택지가 있다**: ① 이 응답에 `order: OrderRef` 를 임베드한다 ② 프론트가 `GET /api/orders/:id` 를 따로 부른다. **①을 권장한다** — 취소 가드가 fail-closed 라(§7.1 ⑦) 주문을 못 읽으면 화면이 취소를 아예 막는다. 두 번째 요청이 실패하는 순간 정상 클레임이 처리 불가로 보인다. 어느 쪽이든 **'모른다'와 '없다'를 응답에서 구분할 수 없다**는 현 프론트 계약(둘 다 `null`)은 유지된다(§7.12 #8).

**에러**: 400(id 형식) · 401 · **404 `CLAIM_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.5) · 429 · 500 · 504.

> **어댑터는 이미 옳다**: 공용 `createCrudAdapter.fetchOne` 이 없는 id 에 **`HttpError(404, '항목을 찾을 수 없습니다.')`** 를 던진다(`crud.ts:109-113`). 그래서 화면이 404 와 5xx 를 문구·복구 수단으로 가를 수 있다(FS-044-EL-050). 백엔드 연결 시 응답 404 를 같은 타입으로 옮기기만 하면 `EXC-12` 계약이 그대로 유지된다.

---

### BE-044-EP-03 · 처리 저장 (상태 전이 · 메모 · 교환 옵션 · **환불** + **재고 이동** + **적립금 복원**)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-018, EL-019, EL-023, EL-024, EL-027~EL-029, EL-034, EL-039, EL-041, EL-044, EL-045, EL-046, EL-048 |
| 심 | `data-source.ts:386-389` `PUT /api/claims/:id (상태 전이 · 환불 처리 · 처리 메모)` + 트랜잭션·422·멱등키 2개 요구 |
| 메서드·경로 | `PUT /api/claims/:id` |
| 권한 | `admin`, `operator`(§7.8). 주문 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다**(§7.3). 부수효과는 **도메인 멱등키 2개**(`stockAppliedAt` · `refund.completedAt`)가 따로 막지만, 상태·메모·환불 상태 저장은 두 번 적용될 수 있다(§7.11) |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `ClaimInput`): `orderId` · `productId` · `productName` · `customer` · `memberId` · `kind` · `optionValues[]` · `exchangeOptionValues[]` · `reason` · `reasonDetail` · `quantity` · `requestedAt` · `status` · `stockAppliedAt` · `stockMovements[]` · `refund{...}` · `adminNote`.

**서버 검증 (요청을 그대로 믿지 않는다 — 순서가 곧 규칙이다)**
1. **불변 필드 무시**: `orderId` · `productId` · `productName` · `customer` · `memberId` · `kind` · `optionValues` · `reason` · `reasonDetail` · `quantity` · `requestedAt` 는 관리자가 바꿀 수 없다. 프론트가 `toClaimInput(claim)`(`types.ts:203-223`)으로 되돌려 보내지만 **서버는 저장된 값을 정본으로 유지하고 요청 값을 무시**한다(§7.3).
2. **서버 소유 필드 무시**: `stockAppliedAt` · `stockMovements` · `refund.completedAt` · `refund.restoredPoint` 는 **절대 요청에서 받지 않는다** — 서버가 찍는다(§7.3 【보안 판정】).
3. **클레임 전이 재판정**: `status` 가 바뀌면 §3 의 전이 표를 **저장 시점의 주문 상태로** 다시 판정한다. 위반 시 422(§5). 프론트 판정은 UX 이며 정본이 아니다.
4. **환불 전이 재판정**: `refund.status` 가 바뀌면 §3 의 환불 표를 판정하되 **저장 이후의 클레임 상태**로 본다(`data-source.ts:280-286`) — 완료와 환불완료를 한 번에 저장하는 경로가 있고, 이전 상태로 판정하면 방금 완료한 클레임을 '아직 완료 전'이라며 막는다.
5. **완료된 환불의 차감 동결**: 저장된 `refund.completedAt !== ''` 이면 `returnShippingFee`·`couponRestored`·`paidAmount` 변경을 422 로 거절한다(`data-source.ts:288-295`) — 이미 나간 돈의 근거를 사후에 고치는 일이다.
6. **재고 판정 재실행**: `status === 'completed'` 이고 `kind !== 'cancel'` 이고 아직 미반영이면 서버가 `validateStockPlan` 등가 판정을 **재고 락 안에서** 다시 한다. 위반 시 422.
7. **환불 완료의 복원**: `refund.status` 가 `completed` 로 **처음** 들어오면 적립금 원장에 **양수 1건**을 덧붙이고(`amount = pointUsed`, 비회원·재실행이면 0) `completedAt`·`restoredPoint` 를 찍는다. 쿠폰 복원은 **발급 1건을 새로 만드는 일**이다(EP-05).
8. `adminNote` 는 앞뒤 공백 제거 후 0–500자(`CLAIM_NOTE_MAX`).
9. `returnShippingFee` 는 **0 이상의 원 단위 정수**(`parseFeeInput` 등가). `status`·`refund.status` 가 유니온 밖이면 400.

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 응답 본문을 읽지 않고 상세(교환이면 옵션까지)를 재조회한다(`ClaimDetailPage.tsx:257-260`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `status`·`adminNote`·`returnShippingFee`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `CLAIM_NOT_FOUND`** · **409 `CONFLICT`**(§7.3) · **422 `INVALID_STATUS_TRANSITION`**(`error.fields`: `status`) · **422 `INVALID_REFUND_TRANSITION`**(`error.fields`: `refundStatus`) · **422 `REFUND_FROZEN`**(`error.fields`: `returnShippingFee`) · **422 `STOCK_UNAVAILABLE`**(`error.fields`: `exchangeOptionValues`) · **422 `OPTION_NOT_FOUND`**(`error.fields`: `optionValues` 또는 `exchangeOptionValues`) · **422 `PRODUCT_NOT_FOUND`** · **500 `POINT_LEDGER_UNAVAILABLE`**(원장에 기입하지 못하면 저장 전체가 실패한다 — §7.11) · 429 · 504.

> **`error.fields` 의 이름이 계약이다**: 프론트가 `violations[0]?.message` 를 읽어 그 필드의 인라인 오류로 되돌린다(`ClaimDetailPage.tsx:265-268`). 어댑터가 이미 `status`·`refundStatus`·`returnShippingFee`·`optionValues`·`exchangeOptionValues` 다섯 이름으로 던지고 있다(`data-source.ts:265-295,326-328`). **다만 현재 프론트는 그 필드를 교환 옵션 하나에만 그린다** — 취소·반품의 422 는 화면 어디에도 뜨지 않는다(FS-044 §7 #4 · §7.12 #6).

---

### BE-044-EP-04 · 교환 옵션(SKU)·재고 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-031, EL-032, EL-034, EL-034.1, EL-034.2 |
| 심 | `data-source.ts:403-404` `GET /api/products/:id/variants — 교환 옵션(SKU)·재고 조회` |
| 메서드·경로 | `GET /api/products/:id/variants` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `readonly VariantRef[]`(`id` · `sku` · `optionValues[]` · `stock`). **이 계약의 정본은 BE-042(상품)다** — 이 문서는 엔드포인트를 만들지 않고 **소비 사실만 기록**한다(§7.4). 클레임이 옵션 사본을 들지 않는 것이 설계 의도다(`data-source.ts:403-404`).

> **v1.0 과 달라진 점**: 예전에는 `GET /api/products/:id`(상품 전문)를 받아 화면이 `variants` 를 꺼냈다. 지금 계약은 **필요한 것만**(SKU·옵션 조합·재고) 받는다 — 옵션 추가금액·품절 플래그는 상품이 소유하는 축이고, 계약에 섞으면 클레임이 상품 규칙을 다시 해석하기 시작한다(`variant-ref.ts:15-19`).

**에러**: 400 · 401 · 403 · **404 `PRODUCT_NOT_FOUND`** · 429 · 500 · 504.

> **어댑터 요구사항**: `fetchClaimVariants` 는 조회기의 `null`('모른다')을 **`HttpError(404, '연결된 상품의 옵션을 찾을 수 없습니다.')` 로 이미 변환한다**(`data-source.ts:411-415`). 화면이 404/5xx 를 가르는 근거가 여기서 나온다(FS-044-EL-031).

---

### BE-044-EP-05 · 쿠폰 재발급 (환불완료의 부수효과)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-041, EL-043, EL-045 |
| 심 | `data-source.ts:370-372` `재발급은 서버가 POST /api/members/:id/coupons 로 처리한다` |
| 메서드·경로 | `POST /api/members/:id/coupons` |
| 권한 | 이 계약의 소비 대상이 아니다 — **EP-03 의 트랜잭션 안에서 서버가 스스로 수행한다**. 관리자 클라이언트가 직접 부르지 않는다 |
| 멱등성 | **`refund.completedAt` 이 멱등 키다** — 이미 찍힌 클레임은 재발급을 다시 만들지 않는다 |

**판정**: 쿠폰 복원은 **사용 표시를 지우는 것이 아니라 발급 1건을 새로 만드는 일**이다(`data-source.ts:370-371`). '언제 썼다'는 사실은 남아야 하기 때문이다 — 적립 원장이 append-only 인 것과 같은 이유다(§7.11).

**현재 상태**: **프론트는 `couponRestored` 플래그와 회수 금액만 기록하고 재발급을 수행하지 않는다.** 화면의 완료 배너는 '<쿠폰명> 쿠폰도 복원했습니다'라고 말하지만 **대응하는 사건이 어디에도 없다**(FS-044 §7 #18 · §7.12 #10). 이 계약이 붙기 전까지 그 문장은 사실이 아니다.

**에러**(EP-03 에서 관측되는 형태): 실패 시 EP-03 전체가 롤백되고 **500** 으로 떨어진다 — 적립금은 복원됐는데 쿠폰은 안 된 반쪽 환불을 만들지 않는다(§7.2).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts`)가 재인증으로. 화면은 FS-044-EL-010 배너 | **403** 컬렉션 — 주문 도메인 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-044-EL-009 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-044-EL-010 | 5초 → 504 → FS-044-EL-010 |
| EP-02 상세 | 400 — id 형식 위반 → 화면은 FS-044-EL-050 의 **일반 오류 분기**(400 을 404 와 구분하지 않는다) | 401 → 전역 인터셉터. 화면은 FS-044-EL-050 | **읽기 권한 없음 → 404 은닉**(§7.5) — 개별 클레임은 고객명·주문번호·결제액·적립금·쿠폰·사적 사정을 담는다. 읽기 권한이 있는 `operator` 에게는 403 | **404 `CLAIM_NOT_FOUND`** — 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:109-113`). 화면이 '다시 시도'를 숨기고 '목록으로'만 준다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-044-EL-050 일반 분기(재시도 제공) | 5초 → 504 → FS-044-EL-050 |
| EP-03 처리 저장 | 400 `VALIDATION_FAILED` — `status`·`refund.status` 가 유니온 밖 · `adminNote` 500자 초과 · `returnShippingFee` 비정수. **현재 프론트에 `error.fields` → 인라인 매핑이 없어**(EXC-07) FS-044-EL-014 배너로 뭉개진다(§7.12 #7) | 401 → 전역 인터셉터가 재인증으로. **미저장 처리 내용은 유실된다**(FS-044 §7 #16) | `operator` 도 쓰기가 허용되므로(§7.8) 역할 부족 403 은 주문 쓰기 권한 없는 그 밖의 역할에만. **읽기 권한 없음 → 404 은닉**. 화면은 403 을 일반 배너로 뭉갠다(FS-044 §7 #14) | **404 `CLAIM_NOT_FOUND`** — 존재한 적 없는 id | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.3). 어댑터는 **없는 id 에 이미 409 를 던진다**(`crud.ts:144-146`)나 **화면에 해소 UI 가 없어** 일반 배너로 뭉개진다(FS-044 §7 #5) | **422 `INVALID_STATUS_TRANSITION`**(§3 전이 표 위반 — 역방향·종료 상태·유형 밖 단계·철회 차단 2종·취소의 출고 조건) · **422 `INVALID_REFUND_TRANSITION`**(환불 표 위반 — 교환·완료 후 변경·역방향·반려/철회·클레임 미완료·비회원 적립금) · **422 `REFUND_FROZEN`** · **422 `STOCK_UNAVAILABLE`** · **422 `OPTION_NOT_FOUND`** · **422 `PRODUCT_NOT_FOUND`**. 어댑터가 `violations` 를 실은 422 를 던지고(`data-source.ts:265-269`) 화면이 그 입력의 인라인 오류로 되돌린다 — **다만 교환 옵션 필드가 없는 취소·반품에서는 아무 데도 뜨지 않는다**(§7.12 #6) | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-044-EL-014 배너 + 참조 코드, 입력 보존. **`POINT_LEDGER_UNAVAILABLE`(원장 미배선/장애)도 여기다** — 어댑터가 이미 500 을 던지고 멱등키를 찍지 않는다(`data-source.ts:363-368`). **재고·원장 트랜잭션이 부분 적용되면 안 된다**(§7.2) | **10초 → 504**(재고 트랜잭션 + 원장 기입 — §2). **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |
| EP-04 옵션 조회 | 400 — id 형식 위반 → FS-044-EL-031 일반 분기 | 401 → 전역 인터셉터. 화면은 FS-044-EL-031 | **403** — 이 시점에 이미 클레임 상세를 봤으므로 상품의 존재를 숨길 이유가 없다. 상품 도메인 읽기 권한 없음 → 404(BE-042 소관) | **404 `PRODUCT_NOT_FOUND`** — 어댑터가 이미 변환한다(`data-source.ts:411-415`). 화면이 '다시 시도'를 숨긴다. **상품이 지워지면 이 클레임은 완료 불가 상태로 고아가 된다**(§7.4) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-044-EL-031 일반 분기 | 5초 → 504 → FS-044-EL-031 |
| EP-05 쿠폰 재발급 | N/A — 관리자 클라이언트가 바디를 만들지 않는다(EP-03 내부 호출) | N/A — 서버 내부 경로 | N/A — 서버 내부 경로 | **404** 회원/쿠폰 정의 없음 → EP-03 을 롤백하고 500 으로 올린다 | **중복 발급은 `refund.completedAt` 멱등키가 막는다** | N/A | N/A — EP-03 의 레이트리밋을 따른다 | 실패 시 **EP-03 전체 롤백** — 반쪽 환불을 만들지 않는다 | EP-03 의 10초 안에 든다 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `claimAdapter.fetchAll(signal)` | `GET /api/claims` | EP-01 | `readonly Claim[]` | O |
| `claimAdapter.fetchOne(id, signal)` | `GET /api/claims/:id` | EP-02 | `Claim` | O — **404 를 이미 `HttpError` 로 던진다**(`crud.ts:109-113`). **△ 주문 참조는 응답에 없다** — 프론트가 동기 조회기로 푼다(EP-02 주석) |
| `claimAdapter.update(id, input, context?)` | `PUT /api/claims/:id (상태 전이 · 환불 처리 · 처리 메모)` + 트랜잭션·422·멱등키 2개 주석 | EP-03 | `void` | **△ — 전체 치환 계약 변경 필요**(§7.3) · **멱등키 미전달**(§7.3) · **409 해소 UI 없음** · **422 표시 경로가 교환에만 있다**(§7.12 #6) |
| `fetchClaimVariants(productId, signal)` | `GET /api/products/:id/variants` | EP-04 | `readonly VariantRef[]` | O — 404 변환까지 되어 있다. **다만 이 엔드포인트의 정본은 BE-042 다**(§7.4) |
| `findClaimOrder(orderId)` | — (동기 seam) | EP-02 에 임베드 권장 | `OrderRef \| null` | **△ — '모른다'와 '없다'가 같은 `null` 이다**(§7.12 #8) |
| `appendPointRestore(entry)` | — (동기 seam) | EP-03 의 부수효과 | `boolean` | O — **false 면 500 으로 저장을 거절한다**(§7.11) |
| `applyStockMovements(movements)` | — (동기 seam) | EP-03 의 부수효과 | `boolean` | O — **false 면 멱등키를 찍지 않는다**(§7.11) |
| `policyReturnFee()` | — (동기 seam) | 배송 정책 계약 소관 | `number \| null` | O — 음수·NaN 을 걸러 `null` 로 만든다 |
| (쿠폰 재발급) | `POST /api/members/:id/coupons` | EP-05 | — | **X — 프론트에 호출부가 없다**(플래그만 기록). §7.12 #10 |
| `claimAdapter.create(...)` | — | **없음(범위 밖)** | `createCrudAdapter` 가 제공하나 **호출부 0건** | O — 계약 없음이 정답(§7.6) |
| `claimAdapter.remove(...)` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답(§7.6) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`update`)에 `X-CSRF-Token` 헤더를 싣는다. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` · `fetchClaimVariants` **이미 충족** — 응답 404 를 `HttpError(404, …)` 로 옮기기만 한다. |
| 409 변환 | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다 — `isConflict` 가 412 도 같은 UX 로 수렴시킨다. **화면 쪽 해소 UI 는 별도 작업이다**(§7.12 #4). |
| 422 변환 | `update` 는 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]`)로 옮긴다 — 어댑터가 **이미 그 형태로 던지고 있고** 화면이 `violations[0]?.message` 를 읽는다. **`field` 이름은 프론트가 아는 다섯 키(`status`·`refundStatus`·`returnShippingFee`·`optionValues`·`exchangeOptionValues`)와 일치해야 한다.** |
| 멱등키 | `update` 는 `context?.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — 자리는 이미 있다(`crud.ts:44-46,137`). **비어 있는 것은 호출부다**(§7.12 #3). |
| 부수효과 제거 | `applyStockEffects`·`applyRefundEffects`(`data-source.ts:319-377`)는 **픽스처 전용**이다 — 백엔드가 붙으면 `applyStockMovements`·`appendPointRestore` 호출과 `stockAppliedAt`/`stockMovements`/`completedAt`/`restoredPoint` 생성이 **전부 사라지고** 서버 응답이 그 자리를 대신한다. 이 함수를 남긴 채 서버도 움직이면 **재고와 적립금이 이중으로 반영된다**. |
| 가드 유지 | `assertTransitions`(`:272-296`)는 **지우지 않는다** — 서버가 정본이 되어도 화면 버튼과 같은 술어를 읽는 자리가 필요하다(§7.1). 다만 저장의 최종 판정은 서버다. |
| 주문 참조 | EP-02 가 `order` 를 임베드하면 `findClaimOrder` 는 **응답에서 읽는 함수**로 바뀐다 — 시그니처(`(orderId) => OrderRef \| null`)는 유지하되 '모른다'와 '없다'를 구분하도록 반환 타입을 넓히는 것이 §7.12 #8 이다. |

## 7. 핵심 판정

### 7.1 상태 전이 규칙이 **계약에 들어왔다** — 서버는 같은 표를 재판정한다 【정합 판정】

**v1.0 의 판정이 뒤집혔다.** 그때는 `RETURN_FLOW` 가 스텝퍼 표시 전용이고 `canTransition` 류 함수가 `grep` 0건이라 계약을 '미정'으로 남겼다. 지금은 **가드가 실재하고, 화면과 저장소가 같은 함수를 부른다**:

- 정본 `claimTransitionBlock`(`types.ts:267-291`) · `cancelBlock`(`:254-258`) · `refundTransitionBlock`(`refund.ts:200-211`).
- 화면은 선택지를 `nextClaimStatuses` 로 좁히고(`ClaimDetailPage.tsx:217-220`), 어댑터는 저장 직전에 같은 함수로 다시 막는다(`data-source.ts:272-296`).
- 회귀 `claims.test.ts:162-229,315-376,699-704,770-776,790-798` 이 사유 문자열까지 고정한다.

**판정**: 서버는 §3 의 두 전이 표를 **그대로** 구현하고 위반을 **422 `INVALID_STATUS_TRANSITION` / `INVALID_REFUND_TRANSITION`** 로 거절한다. 이것은 제안이 아니라 **코드가 이미 세운 규칙의 승격**이다 — v1.0 처럼 '아키텍처 확정 대기'로 남기지 않는다.

**세 가지를 특히 못박는다**:

1. **취소 가능 여부는 주문의 사실이다.** `cancelBlock` 은 `hasLeftWarehouse(order.status)` 를 **읽을 뿐 다시 만들지 않는다**(`shared/domain/order.ts:83-86`). 서버도 클레임 테이블 안에서 '출고했는가'를 다시 정의하면 안 된다 — 주문 상태가 정본이고, 둘이 갈라지면 주문 상세는 '취소 불가'라 하고 클레임 API 는 취소를 받는다.
2. **주문을 모르면 막는다(fail-closed).** 조회 실패·미존재 둘 다 취소를 거절한다. 모르는 채로 취소를 완료하면 이미 나간 물건을 '출고 전'으로 처리해 재고와 정산이 함께 어긋난다.
3. **철회는 유일한 역방향 전이이며 조건부다.** 재고가 이미 적용됐거나 환불이 접수됐으면 거절한다 — 되돌릴 수 없는 것이 이미 일어났기 때문이다. **철회를 삭제로 대체하지 않는다**: 지우면 고객이 접수했다는 사실 자체가 사라지고, 같은 건이 다시 들어왔을 때 재접수인지 최초인지 아무도 모른다(`types.ts:72-77`).

**남은 경계**: 이 앱은 상태 역행을 **하드 차단**한다. 국내 관행(고도몰)은 경고 후 허용에 가깝다(FS-044 §7.2 #19 재평가). 그 차이는 철회로 흡수했다고 보되, 확정은 UI 기획의 몫이다.

### 7.2 저장 한 번은 한 트랜잭션이다 — 부분 적용을 만들지 않는다 【정합 판정】

**심이 이것을 명시한다**: `data-source.ts:387-389` — `서버는 클레임 갱신 + SKU 재고 증감 + 원장 append 를 한 트랜잭션으로 처리하고, 재고 부족이면 422 로 거절한다.` 프론트도 같은 이유로 부수효과를 어댑터 `patch` 안에 넣었다(`:7-9` — `화면이 '클레임 저장'과 '재고 갱신'과 '원장 기입'을 따로 호출하면 하나만 성공하는 창이 생긴다`).

**판정**: EP-03 은 **클레임 갱신 + SKU 재고 증감 + 이동 이력 기록 + 적립금 원장 append + 쿠폰 재발급(EP-05)** 을 **하나의 트랜잭션**으로 수행한다. 어느 하나가 실패하면 전부 롤백한다. 이유:

- **재고만 움직이고 클레임이 '검수중'에 남으면** 다음 완료 시도가 재고를 **두 번** 움직인다(`stockAppliedAt` 이 기록되지 않아 멱등 가드가 걸리지 않는다).
- **클레임만 '완료'가 되고 재고가 안 움직이면** 창고 수량과 시스템이 갈린다 — 오프라인 실사 전까지 아무도 모른다.
- **적립금만 복원되고 환불 상태가 안 바뀌면** 다음 저장이 원장에 **두 번째 지급**을 얹는다. 원장은 append-only 라 되돌릴 수 없다 — 가장 고치기 어려운 종류의 사고다.
- **돈은 나갔는데 쿠폰이 안 돌아오면** 고객은 그 사실을 알 방법이 없고, 시스템에도 흔적이 없다.

**타임아웃이 조회보다 길어야 하는 이유**: 재고 락 + 다중 SKU 갱신 + 원장 기입 + 이력 기록이 한 트랜잭션이라 조회보다 느리다. **10초**로 잡고(§2), 그보다 **프론트 상한을 크게** 둔다 — 서버가 먼저 결과를 확정해야 프론트가 결과를 모른 채 끊는 구간이 없다. **현재 프론트에 상한이 없다**(FS-044 §7 #16).

### 7.3 서버 소유 필드를 요청에서 받지 않는다 — 서버가 찍는다 【보안 판정】

**현재 클라이언트가 네 개의 서버 소유 필드를 바디에 실어 보낸다**: `toClaimInput(claim)`(`types.ts:203-223`)이 `stockAppliedAt`·`stockMovements`·`refund`(그 안의 `completedAt`·`restoredPoint` 포함)를 **그대로 복사**해 넣고, 화면이 그것을 `update.mutate` 의 `input` 으로 보낸다(`ClaimDetailPage.tsx:252-254`). 픽스처 어댑터는 `{ ...current, ...input }` 으로 덮은 뒤(`data-source.ts:381`) 자기가 다시 계산해 넣지만, **계약상 이 필드들은 요청 바디에 존재한다.**

**이것이 만드는 사고 — 조작된 클라이언트 하나면 충분하다**:

1. **`stockAppliedAt: ''` 로 되돌려 보내면 재고를 두 번 넣을 수 있다.** 이 값이 멱등 가드의 **유일한** 근거다(`:320`). 픽스처는 `current`(저장된 값)를 보므로 안전하지만, **서버가 요청 값을 신뢰하는 순간 무한 입고**가 된다.
2. **`refund.completedAt: ''` 로 되돌려 보내면 적립금을 반복 복원할 수 있다.** 이쪽이 더 나쁘다 — 원장은 append-only 라 **잘못 얹은 지급을 지울 수 없다**. 반품 1건으로 적립금을 원하는 만큼 만들 수 있다.
3. **`stockMovements` 를 조작하면 감사 이력이 위조된다.** 재고 실사 불일치의 조사 근거가 사라진다.
4. **`refund.paidAmount`·`pointUsed`·`couponDiscount` 는 접수 시점 스냅숏**인데 바디에 있다. 조작하면 **환불액과 복원 적립금이 임의로 커진다** — 이 계약에서 가장 직접적인 금전 손실 경로다.
5. **이동 `id` 가 `mv-${at}-in`/`mv-${at}-out`** 이다(`types.ts:398,410`). `at` 은 현재 어댑터의 `new Date().toISOString()`(`:331`)이라 안전하지만, 서버가 요청의 `at` 을 받으면 **같은 밀리초의 두 요청이 같은 id 를 만든다.**

**판정**: `stockAppliedAt` · `stockMovements` · `refund.completedAt` · `refund.restoredPoint` · `refund.paidAmount` · `refund.pointUsed` · `refund.couponDiscount` · `refund.couponName` · 이동 `id`·`at` 은 **전부 서버가 소유한다.** 요청 바디의 이 값들은 **무시**한다 — 파싱조차 하지 않는다. 이것은 UX 개선이 아니라 **재고·금액 무결성 요구**다.

**계약을 둘 중 하나로 바꾼다.**

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `PUT /api/claims/:id` 는 **관리자가 실제로 바꾸는 5개만** 받는다: `{ status, adminNote, exchangeOptionValues, refundStatus, refund: { returnShippingFee, couponRestored } }`. 재고 이동·복원·스냅숏 금액·멱등키는 **서버가 부수효과로 기록** | 위조가 구조적으로 불가능하다. 요청 크기가 이력에 비례해 커지지 않는다. 프론트 `toClaimInput` 이 통째로 사라진다. **어댑터 시그니처는 그대로다**(`Input` 타입만 좁아진다) — 화면 코드는 저장 3곳(`:278-297`)만 바뀐다 |
| **B (차선)** | PUT 을 유지하되 서버가 불변·서버 소유 필드를 **무시** | 어댑터를 덜 흔든다. 그러나 `ClaimInput` 이 실제로 쓰이지 않는 필드를 계속 실어 보내는 기형이 남고, '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨진다 — 안 A 는 타입이 강제한다 |

**어느 안이든 서버는 요청의 멱등키·이력·스냅숏 금액을 절대 신뢰하지 않는다.**

**낙관적 동시성**: `Claim` 에 `version`/`updatedAt` 필드가 **없다**(`types.ts:163-196`). 어댑터의 409 는 **'존재 여부' 기반**이다(`crud.ts:144-146`). 즉 **동시 편집(둘 다 존재)은 last-write-wins** 다 — 두 운영자가 하나는 '반려', 하나는 '완료'를 저장하면 나중 것이 이긴다. **부수효과만은 두 멱등키가 막지만 상태·메모·환불 상태는 덮인다.** 판정: 안 A 채택 시 다투는 필드가 5개로 줄어 `If-Match`(ETag) 또는 `Claim.version` 이 **선택**, 안 B 유지 시 **필수**.

### 7.4 소유 경계 — 이 계약이 만들지 않는 것과, 그럼에도 만드는 구멍 【경계 판정】

**세 도메인의 경계가 이 화면에서 만난다.** 각각의 정본은 여기가 아니다.

| 사실 | 정본 | 이 계약의 역할 |
|---|---|---|
| 주문의 상태·취소·**취소 시 재고 복원** | 주문 계약(`shared/domain/order.ts` 의 `canceledAt`·`stockRestoredAt`·`shouldRestoreStock`) | **읽기만** 한다. 취소 클레임은 재고를 움직이지 않는다 |
| 상품 옵션(SKU)·재고 수치 | BE-042(상품) | EP-04 로 읽고, EP-03 에서 증감을 **요청**한다 |
| 적립금 잔액·원장 | 회원 계약 | **양수 1건을 덧붙이기만** 한다 |
| 반품배송비 기본값 | 배송 정책 계약 | 읽어서 기본값으로 제시한다. 못 읽으면 `null` |

**가장 중요한 경계 — 취소된 주문의 재고는 누가 되돌리는가**:

`movesStock` 이 `kind !== 'cancel'` 을 요구한다(`types.ts:342-344`). 취소 클레임이 완료되어도 이 계약은 **재고를 한 개도 움직이지 않는다**(`claims.test.ts:778-788` 이 고정한다). 복원은 주문이 `canceledAt`/`stockRestoredAt` 로 소유한다.

**판정**: 서버도 이 분업을 그대로 지킨다. **둘 다 복원하면 같은 수량이 두 번 돌아오고, 두 원장 중 어느 쪽이 거짓인지 나중에는 아무도 가리지 못한다.** 클레임의 `stockMovements` 와 주문의 `stockMovements` 는 **같은 공통 타입**이라(§3) 한 SKU 의 증감을 시간순으로 이어 읽을 수 있는데, 중복 기입은 그 판독을 영구히 망가뜨린다.

**따라서 계약에 못박을 것**: 취소 클레임의 완료가 주문 취소를 **자동으로 트리거하지 않는다.** 이 앱에는 그 배선이 없다 — 클레임 완료와 주문 취소는 **서로 다른 두 번의 조작**이다. 그 결과 **'취소 클레임은 완료됐는데 주문은 취소되지 않은' 상태가 만들어질 수 있고, 그때 재고는 영원히 돌아오지 않는다.** 이 앱은 그것을 막지 않는다 — 화면은 재고 이력 카드에서 소유자만 알려 준다(FS-044-EL-048.1). **두 사건을 잇는 계약이 필요하다**(§7.12 #9).

**경계의 두 번째 구멍 — 삭제가 참조를 검사하지 않는다**: 상품이 지워지면 EP-04 가 404 를 내고 **완료 처리가 영원히 422** 다. 주문이 지워지면 취소가 fail-closed 로 막히고 주문번호 링크가 404 로 이어진다. 두 삭제 모두 미처리 클레임(`status ∉ {completed, rejected, withdrawn}`)을 검사하지 않는다.

**판정**: `DELETE /api/products/:id` 와 주문 삭제는 **미처리 클레임이 있으면 409 로 막는다.** **이 판정의 실행은 BE-042·주문 계약 소관이며 세 문서를 함께 봐야 한다** — 여기서만 적으면 그쪽이 모른다.

### 7.5 클레임 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/claims` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 클레임 리소스의 존재 자체가 개인정보다** → 주문 도메인 **읽기 권한이 없는** 주체에게는 **404 `CLAIM_NOT_FOUND`** 로 은닉한다.

**근거 — v1.0 보다 민감도가 높아졌다**: 클레임 1건은 `customer`(신청자) · `orderId`(주문번호) · `reasonDetail`(고객이 쓴 원문) 에 더해 **`memberId` · `refund.paidAmount` · `pointUsed` · `couponDiscount` · `couponName`** 을 담는다. 즉 **한 고객의 결제·적립·쿠폰 사용 내역이 이 응답 하나에 들어 있다.** 주문번호는 **주문 도메인의 열거 키**이기도 하다 — `ORD-20260712-0031` 형식(`data-source.ts:47`)은 날짜+일련번호라 열거로 **그 날의 주문 볼륨을 추정**할 수 있다. BE-003 §3.2 가 `GET /api/members/:id` 를 404 로 은닉하는 것과 **같은 이유로** 404 여야 한다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다. 다만 이 도메인은 `operator` 에게 쓰기를 열므로(§7.8) 그 403 은 주문 쓰기 권한 없는 그 밖의 역할에만 발생한다.

**신청자 마스킹**: 픽스처는 `'김**'`(`data-source.ts:50`)처럼 **이미 마스킹된 값**을 담는다. 판정: **마스킹은 서버가 한다** — 원본 이름을 내려보내고 프론트가 가리면 응답 본문에 평문이 남는다. 실명 전체가 필요한 경우(택배 수거 접수)는 **별도 권한의 별도 엔드포인트**로 분리한다.

**`memberId` 노출 범위**: 이 값은 적립금 원장의 주인이라 EP-03 의 복원 대상을 정한다. **그러나 목록 응답에까지 실릴 이유는 없다**(§7.9) — 목록은 회원을 가리키지 않는다.

### 7.6 클레임 생성·삭제 — 계약에 존재하지 않는다 【범위 판정】

**코드로 재확인한 사실**:

- `ClaimsListPage.tsx:3-5`: `클레임은 감사 성격이라 삭제·일괄작업이 없다(고객이 접수하고 관리자는 처리만 한다). 그래서 삭제-CRUD 용 CrudListShell 이 아니라 읽기 전용 껍데기 CrudReadListShell 을 쓴다`.
- `data-source.ts:3-5`: `생성·삭제 UI 는 없다 — 클레임은 고객이 만들고 관리자는 처리만 한다. 감사 성격이라 지우지도 않는다`.
- `data-source.ts:390`: **`POST 는 열지 않는다: 클레임을 만드는 것은 관리자가 아니라 고객의 접수다.`** — v1.0 때는 없던 **명시적 계약 문장**이다.
- `types.ts:75-77`: 철회가 상태인 이유 = `지우면 고객이 접수했다는 사실 자체가 사라지고, 같은 건이 다시 들어왔을 때 재접수인지 최초인지 아무도 모른다`.
- `claimAdapter.create`/`remove` 는 `createCrudAdapter` 가 **인터페이스로 제공**할 뿐 **호출부가 0건**이다. (**부재의 표현이 약하다**: 실수로 호출하면 실제로 만들어진다 — §7.12 #11)

**판정**: `POST /api/claims` · `DELETE /api/claims/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**이며, 코드가 네 겹(주석 3곳 · 명시 문장 1곳 · 호출부 0건 · UI 부재)으로 이를 못박는다. BE-003 §1 이 '**회원 생성** — 고객은 회원가입으로만 유입된다'로 확정한 것과 같은 결이다.

**삭제에 대한 추가 근거**: 클레임은 **재고·환불·적립금이 걸린 감사 대상 기록**이다. 지우면 `stockMovements` 와 `refund.restoredPoint` 가 함께 사라져 **재고가 왜 그 수치인지, 적립금이 왜 그 잔액인지 설명할 수 없게 된다**. 개인정보 파기 요구는 단건 삭제 버튼이 아니라 **보존정책 배치**로 처리해야 할 별도 계약이다.

**철회가 삭제를 대신한다**: '없던 일로 하고 싶다'는 실무 요구는 `withdrawn` 이 받는다 — 그리고 되돌릴 수 없는 것이 이미 일어났으면 그것마저 막는다(§7.1).

### 7.7 이 계약은 환불을 **기록**한다 — 실제 송금은 결제 도메인의 것이다 【범위 판정】

**v1.0 에서 달라진 것**: 그때 `refundAmount` 는 표시 전용 숫자였고 '어떤 코드도 이 값으로 결제를 취소하지 않는다'가 판정이었다. 지금은 **환불이 상태·차감·복원까지 갖춘 축**이 됐고, **적립금과 쿠폰이라는 두 자산은 실제로 움직인다**(적립금은 구현, 쿠폰은 EP-05 미구현).

**그러나 돈 자체는 여전히 움직이지 않는다.** `refund.status = 'completed'` 는 '**환불이 완료되었다고 기록한다**'는 뜻이지 PG 취소 요청을 보내는 것이 아니다 — 이 앱에 결제 연동이 없다(`payment`/PG grep 이 이 모듈에 0건).

**판정**:

- 이 계약은 **환불의 원장**이다: 얼마를 왜 그만큼 돌려주기로 했는가, 무엇을 되돌렸는가, 언제 확정했는가.
- **실제 송금·PG 취소는 결제/정산 계약이 소유한다.** EP-03 의 `refund.status → completed` 가 그 계약을 호출하는지는 **미정이며 이 문서가 정하지 않는다**.
- **총액을 저장하지 않는다**(`refundBreakdown` 이 매번 낸다 — `refund.ts:128-133`). 차감을 정정한 순간 총액과 항목이 어긋난 환불서가 남고, 그때 어느 쪽이 사실인지 아무도 답할 수 없다. **다만 완료된 환불은 차감이 동결되므로**(EP-03 검증 5) 확정 후에는 재계산해도 값이 변하지 않는다.

**이것이 남기는 위험(기록만 한다)**: 운영자는 '환불 완료'를 눌러 적립금을 복원하고, 실제 송금은 **다른 시스템에서 손으로** 한다. 두 작업 사이에 원자성이 없다 — 적립금은 돌아왔는데 돈이 안 나가거나 그 반대가 될 수 있고, 시스템은 그것을 모른다. **아키텍처가 이 경계를 확정해야 한다**(§7.12 #12).

### 7.8 `operator` 에게 쓰기를 연다

BE-010(FAQ)은 `operator` 를 조회 전용으로 두고 모든 쓰기를 403 으로 막는다. **이 도메인은 반대이며, BE-026(1:1 문의) §7.8 과 같은 결이다.**

**근거**: 클레임 처리는 **운영자의 본업**이다. `operator` 가 상태 전이·메모·교환 옵션·환불 접수를 할 수 없다면 이 화면을 쓸 사람이 `admin` 뿐이고, 그러면 역할 구분이 무의미해진다.

**단, v1.0 보다 무거워졌다 — 그래도 연다**: 이제 완료 처리는 재고를, 환불완료는 **적립금 원장을** 움직인다. 그럼에도 여는 이유는 ① 이동 방향·수량과 복원 금액이 **클레임에서 결정**돼 운영자가 임의 수치를 넣을 수 없고(`planStockMovements` 는 `quantity` 를, `planRefundRestoration` 은 `pointUsed` 를 쓴다) ② 모든 이동·복원이 **이력과 스냅숏으로 남아**(§7.3) 사후 추적이 가능하며 ③ 환불완료는 **클레임 완료를 선행 조건으로** 요구해 단독 판단이 아니기 때문이다.

**단 하나 유보할 것**: 운영자가 **직접 고칠 수 있는 금액**이 하나 있다 — `returnShippingFee`(EP-03 검증 9). 정책 기본값을 그 자리에서 덮어쓰는 것이 설계 의도이나(FS-044-EL-039), 상한·감사 로그가 없다. **이 필드의 변경만 감사 이벤트로 남기는 것을 권고한다**(§7.12 #13).

**결론**: EP-01 · EP-02 · EP-03 · EP-04 모두 `admin` + `operator`. 주문 도메인 권한이 아예 없는 역할만 차단한다.

### 7.9 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:

1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 필터·검색을 전부 클라이언트에서 한다. 클레임은 **매일 쌓이는 무한 증가 컬렉션**이다.
2. **목록이 상세 전문을 담는다.** `Claim` 타입 하나를 목록·상세가 공유해 목록 응답에 `reasonDetail`(고객 원문) · `stockMovements`(이동 이력) · **`refund` 전문(결제액·적립금·쿠폰)** · `memberId` 가 실린다 — **목록 화면이 쓰는 것은 `refund.status` 하나뿐**인데(FS-044-EL-007.10) 결제 내역 전체가 내려온다. §7.5 의 취지와 정면으로 충돌한다.

**판정**: **`ClaimSummary` / `Claim` 을 분리**하고, EP-01 에 `kind`·`status`·`refundStatus`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ClaimSummary` 는 `reasonDetail`·`stockMovements`·`memberId` 를 빼고 `refund` 를 **`refundStatus` 한 필드로 축약**한다.

**이관**: 이 변경은 **프론트 대공사**다 — `filterByStatus`/`searchClaims` 가 서버로 올라가고, 페이지네이션 UI(FS-044 §7 #2)·순번 오프셋이 함께 붙어야 한다. **URL list state 는 이미 있다**(`useListState`) — `page` 파라미터를 쓰기만 하면 된다. quality-bar IA-04 P0 가 이 화면을 gap 으로 잡고 있다. 그전까지 현 계약(전량)을 유지한다 — 픽스처 8건에서는 드러나지 않는다.

### 7.10 음수 재고를 만들지 않는 것은 **버그를 숨긴다** 【정합 판정】

`applyMovements`(`shared/domain/stock.ts:63-77`)가 `Math.max(0, unit.stock + delta)` 로 **음수 재고를 0 으로 깎는다**. 테스트가 이 동작을 고정한다(`claims.test.ts:564-576`).

**판정: 서버는 이 동작을 복제하지 않는다.** 이유:

- 표시 계층에서 음수 재고는 보기 싫지만, **데이터 계층에서 음수는 사실이다** — '팔린 것보다 적게 갖고 있다'는 실사 불일치의 신호이며, 0 으로 깎으면 그 신호가 사라진다.
- `validateStockPlan` 이 `target.stock < quantity` 를 이미 막으므로 **정상 경로에서는 음수가 나올 수 없다.** 음수가 나온다는 것은 **다른 경로가 재고를 이미 뺐다**는 뜻이고(동시 주문·주문 확정), 그것이야말로 알아야 할 사실이다.
- 서버는 **재고 락 안에서 판정하고 위반이면 422** 를 낸다(§7.2). 깎지 않는다.

**프론트 후속**: `Math.max(0, …)` 는 픽스처가 서버 없이 그럴듯하게 동작하기 위한 방어이며 계약이 아니다. 다만 이 함수는 **주문도 쓰는 공통 층**이라(§3) 제거는 두 도메인을 함께 봐야 한다.

### 7.11 멱등키는 둘이고, **미배선을 성공으로 위장하지 않는다** 【정합 판정】

이 코드베이스가 세운 규약 하나가 계약으로 올라가야 한다.

| 부수효과 | 멱등키 | 미배선/실패 시 |
|---|---|---|
| 재고 이동 | `stockAppliedAt`(ISO 또는 `''`) | `applyStockMovements` 가 **`false`** → **멱등키를 찍지 않고 이동도 기록하지 않는다.** 저장 자체는 성공한다(다음 기회에 다시 시도) |
| 적립금 복원 | `refund.completedAt`(ISO 또는 `''`) | `appendPointRestore` 가 **`false`** → **저장 전체를 `HttpError(500)` 로 거절한다.** 멱등키를 찍지 않는다 |

**두 처리가 다른 이유**(`stock.ts:21-25` · `point-ledger.ts:20-24` · `data-source.ts:316-317,348-349`): 둘 다 '조용한 성공'을 금지하지만, **적립금은 되돌릴 수 없어 더 강하게 막는다.** 재고는 다음 저장이 다시 시도하면 되지만, 원장에 잘못 얹힌 지급은 append-only 라 지울 수 없다. 그래서 원장 실패는 **환불 완료 자체를 거절**한다.

**0원·빈 이동은 성공이다**: `appendPointRestore` 는 `amount === 0` 이면 기입 없이 `true` 를 준다 — 적립금을 쓰지 않은 주문의 환불이 '원장 미배선'으로 막히면 있지도 않은 문제로 환불이 멈춘다. `applyStockMovements` 도 빈 배열이면 `true` 다. **아무 일도 일어나지 않은 것과 실패는 다르다.**

**음수는 통로 자체가 없다**: `appendPointRestore` 는 음수를 **던진다**(`point-ledger.ts:65`). 복원이 차감으로 둔갑하는 것은 조용히 넘길 사고가 아니다.

**판정**: 서버도 같은 규약을 따른다. **의존 서비스가 응답하지 않을 때 멱등키를 먼저 찍는 구현을 금지한다** — 재고는 그대로인데 원장만 '반영 완료'라고 말하는 상태, 적립금은 그대로인데 클레임만 '복원 완료'라고 말하는 상태가 영구히 남는다. 회귀 `claims.test.ts:438-452,843-859` 가 이 규약을 고정한다.

### 7.12 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **서버 소유 필드를 요청 바디에서 제거(§7.3 안 A)** — 특히 `refund.completedAt`·`restoredPoint`·스냅숏 금액 3종. **금액 무결성의 핵심이며 v1.0 #1 보다 범위가 넓어졌다** | 백엔드 명세 · UI 기획 (최우선) |
| 2 | **~~상태 전이 규칙 확정~~ — 해소됨**(§7.1). 코드가 가드를 갖고 어댑터가 재판정한다. 서버는 §3 의 두 표를 그대로 구현한다 | — (종결) |
| 3 | EP-03 에 멱등키가 전달되지 않는다 — 자리는 있고 원장도 있는데 **호출부가 비어 있다**(`ClaimDetailPage.tsx:252-254`). 프론트에 `submitLockRef` 도 없다(quality-bar EXC-08 P0). 부수효과 이중 실행은 도메인 멱등키가 막지만 상태·메모·환불 상태는 두 번 나갈 수 있다 | UI 기획 · 백엔드 명세 |
| 4 | 409 충돌 해소 UI 부재 — 어댑터가 409 를 던지는데 화면 `onError` 에 `isConflict` 분기가 없다. 낙관적 동시성 토큰(`If-Match`/`version`)도 없어 **동시 편집은 last-write-wins**(§7.3) | UI 기획 · 백엔드 명세 |
| 5 | **환불 완료 버튼의 잠금과 저장의 거절이 다른 술어를 읽는다** — 버튼은 드래프트 상태로, 저장은 저장된 상태로 판정한다(`ClaimDetailPage.tsx:291-297,530`). 규칙 7('같은 술어')의 유일한 위반이며 **재현 가능한 422 를 만든다** | **프론트 구현 (선행)** |
| 6 | **취소·반품의 422 가 화면 어디에도 표시되지 않는다** — `setFieldError` 의 값을 그리는 곳이 교환 옵션 필드 하나뿐이다. `error.fields` 이름을 다섯으로 늘린 계약(§6.1)이 소비되지 않는다. **#5 와 겹쳐 '눌렀는데 아무 일도 없는' 경로를 만든다** | **UI 기획 (P0급)** · 프론트 구현 |
| 7 | 400 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다(EXC-07 P1) — `useCrudForm` 미사용이라 `setError` 경로가 없다 | UI 기획 |
| 8 | **주문 참조의 '모른다'와 '없다'가 같은 `null` 이다** — 화면이 둘을 같은 문장으로 그리고(FS-044-EL-017.2) 취소는 둘 다 fail-closed 로 막는다. 안전 쪽으로 틀리지만 **운영자는 배선 사고인지 데이터 사고인지 알 수 없다.** EP-02 가 `order` 를 임베드하면 서버가 둘을 구분해 줄 수 있다 | 백엔드 명세 · UI 기획 |
| 9 | **취소 클레임 완료와 주문 취소를 잇는 계약이 없다**(§7.4) — 클레임만 완료되고 주문이 취소되지 않으면 **재고가 영원히 돌아오지 않는다.** 자동 트리거로 할지, 완료 시 주문 취소를 강제할지, 화면이 그 사실을 경고할지가 전부 미정 | **아키텍처 (선행)** · 백엔드 명세 |
| 10 | **쿠폰 재발급이 구현되지 않았다**(EP-05) — 화면은 '쿠폰도 복원했습니다'라고 말하는데 대응 사건이 없다. 환불액에서 회수는 **이미 하고 있으므로**, 지금은 고객이 할인을 잃고 쿠폰도 못 받는 쪽으로 틀려 있다 | **백엔드 명세 (우선)** · UI 기획 |
| 11 | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다**(§7.6) — 부재가 코드로 강제되지 않는다 | UI 기획 쪽 변경 요청 |
| 12 | **실제 송금 경계 미정(§7.7)** — `refund.status = 'completed'` 가 PG 취소를 트리거하는지 계약이 없다. 지금은 운영자가 다른 시스템에서 손으로 한다 | **아키텍처 (선행)** · 백엔드 명세 |
| 13 | `returnShippingFee` 는 **운영자가 그 자리에서 고칠 수 있는 유일한 금액**인데 상한·감사 로그가 없다(§7.8). 변경을 감사 이벤트로 남길 것을 권고한다 | 백엔드 명세 |
| 14 | 상품·주문 삭제가 미처리 클레임을 검사하지 않는다(§7.4) — **BE-042·주문 계약과 함께 봐야 한다** | **백엔드 명세 (연동)** |
| 15 | 신청자 마스킹을 서버가 한다(§7.5) — 현재 픽스처가 마스킹된 값을 갖고 있어 계약이 검증되지 않는다. `memberId` 의 목록 노출도 함께 정리한다 | 백엔드 명세 |
| 16 | 목록 페이징 + `ClaimSummary` 분리(§7.9) — IA-04 P0 와 한 배치로 | 백엔드 명세 · UI 기획 |
| 17 | 클레임 보존정책·개인정보 파기 배치(§7.6) — 관리자 삭제 API 가 아닌 별도 계약. `stockMovements`·`restoredPoint` 가 함께 사라지면 재고·적립금 설명이 끊긴다는 제약이 있다 | 백엔드 명세 |
| 18 | 401 감지·리다이렉트는 구현됐으나 **미저장 처리 내용이 유실**된다(EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) — §7.2 가 요구하는 '서버 상한 < 프론트 상한' 관계가 성립하지 않는다 | UI 기획 · 프론트 구현 |
| 19 | 이탈 abort 는 클라이언트만 결과를 버릴 뿐 서버 도달 여부를 보장하지 않는다 — **재고가 이미 움직였거나 적립금이 이미 복원됐는데 화면에 안 보일 수 있다.** 저장 중 이탈이 실제로 위험한 유일한 화면이다 | 백엔드 명세 · UI 기획 |
| 20 | **환불 접수 시각 필드가 없다** — 전자상거래법의 '반환받은 날부터 3영업일' SLA 를 계산할 근거가 데이터에 없다(FS-044 §7.2 #20). `refund` 에 `requestedAt` 을 더할지 결정해야 한다 | 백엔드 명세 · UI 기획 |

## 8. 자기 점검

- [x] FS-044 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 5건(EP-01·02·03·04·05) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**(등록·삭제는 §7.6 에서 '계약 없음'으로 판정, 옵션 조회는 BE-042 의 것을 소비 사실로만 기록, 주문·원장·정책은 동기 seam 으로 §6 에 적었다)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한(§7.8 `operator` 쓰기 허용)·타임아웃(§2 저장 10초)·엔타이틀먼트 모듈 소속만 고유 차이**를 근거와 함께 기술
- [x] **v1.0 이 '미정'으로 남긴 상태 전이 규칙을 코드 근거로 확정**했다(§7.1 · §3 두 표) — `RETURN_FLOW` 가 표시 전용이던 시절의 판정을 명시적으로 뒤집었다
- [x] **생성·삭제를 '범위 밖'으로 판정**하고 코드 네 겹(주석 3곳 · `data-source.ts:390` 의 명시 문장 · 호출부 0건 · UI 부재)으로 근거를 댔다
- [x] 멱등성 판정 — 조회 GET 멱등 / **부수효과 멱등키 2개(`stockAppliedAt` · `refund.completedAt`)가 요청 바디에 있어 위조 가능함을 §7.3 에 명시**하고, **미배선 시 키를 찍지 않는 규약을 §7.11 로 계약화**했다
- [x] 보안 판정 3건 이상 — **서버 소유 필드·스냅숏 금액 위조(§7.3)** · **403 vs 404 은닉 + 마스킹 + `memberId` 노출(§7.5)** · 정합 판정(§7.1 전이 규칙 · §7.2 트랜잭션 · §7.10 음수 재고 · §7.11 멱등·fail-loud) · 경계 판정(§7.4 재고 복원 소유권)
- [x] **취소가 재고를 움직이지 않는다는 소유 경계**를 §3·§7.4 에 반영하고, 그 분업이 남기는 구멍(클레임만 완료되고 주문은 안 된 상태)을 §7.12 #9 로 이관했다
- [x] 환불 축(`refund`)의 전이·계산·복원·동결을 §3 표와 §4 검증 절차와 §5 의 422 축(`INVALID_REFUND_TRANSITION`·`REFUND_FROZEN`)에 정확히 반영했다
- [x] **확인하지 못한 것을 쓰지 않았다** — 쿠폰 재발급은 미구현임을 EP-05 에 명시했고, 실제 송금 경계는 '미정'으로 남겼다(§7.7)
- [x] 서버 코드·저장소 설계를 쓰지 않았다
