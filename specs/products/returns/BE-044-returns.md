---
id: BE-044
title: "교환/반품 백엔드 기능 명세"
functionalSpec: FS-044
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-044. 교환/반품 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-044 교환/반품 (`/products/returns` · `/products/returns/:id`) |
| 범위 | 요청 목록 조회, 요청 상세 조회, **처리 저장(상태 전이 · 처리 메모 · 교환 재발송 옵션) + 그에 수반하는 SKU 재고 이동**, 교환 옵션 조회(상품 참조) |
| **범위 밖** | **요청 생성** — 교환·반품은 고객이 접수한다. 관리자가 요청을 만드는 API 는 이 계약에 존재하지 않는다. **요청 삭제** — 요청은 재고·환불이 걸린 감사 대상 기록이며 관리자 삭제 진입점이 없다. 두 판정의 근거는 §7.6 이며, BE-003 §1 의 '회원 생성 — 고객은 회원가입으로만 유입된다' 와 같은 결이다. **상품·SKU·재고의 정본 CRUD** — BE-042(상품) 소관(이 화면은 소비자, §7.4). **환불 실행** — `refundAmount` 는 표시 전용 예정액이며 결제/정산 계약이 따로 소유한다(§7.7) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 날짜는 `YYYY-MM-DD` |
| 프론트 어댑터 | `apps/admin/src/pages/products/returns/data-source.ts` (`returnAdapter` = 공용 `createCrudAdapter` · 전용 함수 `fetchReturnProduct`) |
| 도메인 타입 | `apps/admin/src/pages/products/returns/types.ts` — 요청 타입·순수 재고 규칙. 옵션·재고 타입(`ProductVariant`)은 **상품 도메인에서 import** 한다(`types.ts:9`) |
| 검증 정본 | **zod 스키마가 없다.** 이 화면은 `useCrudForm`+zod 를 쓰지 않는다 — 검증 정본은 `types.ts` 의 순수 규칙(`validateStockPlan` · `isStockApplied` · `movesStock` · `findVariant` · `RETURN_NOTE_MAX`)이며 그것을 **어댑터가 저장 직전에 재판정**한다(`data-source.ts:143-177`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 교환/반품 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 3건 — 목록·상세·저장 | `data-source.ts:179-181` `// TODO(backend): GET /api/returns · GET/PUT /api/returns/:id (상태 전이·처리 메모)` |
| 심의 트랜잭션·422·멱등키 요구가 주석에 명시돼 있다 | `data-source.ts:180-181` `· 완료 전이는 재고 이동을 동반한다 — 서버는 요청 갱신 + SKU 재고 증감을 한 트랜잭션으로 처리하고 재고 부족이면 422(field: exchangeOptionValues)로 거절한다. 멱등키는 stockAppliedAt 이다.` |
| 심 1건 — 교환 옵션(상품) 조회 | `data-source.ts:193-194` `// TODO(backend): GET /api/products/:id — 교환 옵션(SKU)·재고 조회.` |
| 등록·삭제 심 **없음** — 의도된 부재 | `ReturnsListPage.tsx:2-4` · `data-source.ts:3-4` (`생성·삭제 UI 는 없다 — 요청은 고객이 만들고 관리자는 처리만 한다`) · `create`/`remove` 호출부 0건 |
| 재고 이동이 어댑터 `patch` 안에 있다 | `data-source.ts:6-8,143-191` (`spec.patch` = `applyStockOnComplete`) |
| 멱등 키는 `stockAppliedAt` 이다 | `types.ts:67` (`재고 반영 시각 ISO — '' 면 미반영. 재반영을 막는 멱등 키다`) · `data-source.ts:145` · 회귀 `returns.test.ts:212-221` |
| 상태 전이 규칙이 **없다** | `types.ts:93-98` `RETURN_FLOW` 는 **스텝퍼 표시 전용**(`ReturnStatusStepper.tsx:75`). `canTransition` 류 함수가 코드에 없다 — `grep` 0건 |
| 유령 저장·409 는 공용 어댑터가 막는다 | `shared/crud/crud.ts:126-128` (`if (!items.some(...)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`) |
| 멱등키 원장이 어댑터에 있으나 이 화면이 키를 넘기지 않는다 | `crud.ts:62-72,121` (원장) ↔ `ReturnDetailPage.tsx:180-190` (`update.mutate` 의 variables 에 `idempotencyKey` 없음) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세·상품 옵션) + **처리 저장**(EP-03) — 교환·반품 응대는 운영자의 본업이므로 쓰기를 연다(§7.8). 상품 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / **개별 요청 404 은닉**(§7.5).
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. **처리 저장은 재고 트랜잭션을 포함하므로 10초 → 504**(§7.2).
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 드물게 `useRouteWritePermissions` 를 배선했지만(FS-044-EL-036), 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다(`RequirePermission.tsx:8-11`). 권한 강제는 전적으로 서버 책임이다.

## 3. 데이터 계약 (`types.ts` · `_shared/store.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `ReturnRequest` | `id` · `orderNo` · `productId` · `productName`(비정규화) · `customer`(마스킹) · `kind` · `optionValues[]` · `exchangeOptionValues[]` · `reason` · `reasonDetail` · `quantity` · `refundAmount` · `requestedAt`(`YYYY-MM-DD`) · `status` · `stockAppliedAt`(ISO 또는 `''`) · `stockMovements[]` · `adminNote` | 목록·상세가 **같은 타입**이다 — 목록도 `reasonDetail`·`stockMovements` 를 받는다(§7.9) |
| `StockMovement` | `id` · `at`(ISO) · `direction`(`in`\|`out`) · `sku` · `optionLabel`(이동 시점 스냅숏) · `quantity` | append-only. **확정된 사실만** — 계획은 저장하지 않는다(`types.ts:28-31`) |
| `ReturnRequestInput` | `Omit<ReturnRequest, 'id'>` | 저장 입력. 불변 필드(`orderNo`·`productId`·`productName`·`customer`·`kind`·`optionValues`·`reason`·`reasonDetail`·`quantity`·`refundAmount`·`requestedAt`)와 **서버 소유 필드(`stockAppliedAt`·`stockMovements`)까지 포함한 전체 치환**이다(§7.3) |
| `ReturnKind` | `exchange` \| `return` | 접수 후 불변 |
| `ReturnStatus` | `requested` \| `collecting` \| `inspecting` \| `completed` \| `rejected` | **전이 규칙이 없다**(§7.1) |
| `ProductVariant` (상품 도메인) | `id` · `sku` · `optionValues[]` · `addPrice` · `stock` · `soldOut` | **BE-042 가 소유한다.** 이 계약은 읽기만 한다(EP-04) |
| 상수 | `RETURN_NOTE_MAX = 500` | 처리 메모 상한 |

**처리 상태 (`STATUS_META` — 표시)**

| 값 | 라벨 | 톤 | 흐름상 위치 |
|---|---|---|---|
| `requested` | 접수 | neutral | `RETURN_FLOW[0]` |
| `collecting` | 수거중 | info | `RETURN_FLOW[1]` |
| `inspecting` | 검수중 | warning | `RETURN_FLOW[2]` |
| `completed` | 완료 | success | `RETURN_FLOW[3]` — **여기서만 재고가 움직인다**(`movesStock` — `types.ts:215-217`) |
| `rejected` | 반려 | danger | **흐름 밖 종료** — 스텝퍼에 없다 |

> **`RETURN_FLOW` 는 전이 규칙이 아니다.** `ReturnStatusStepper.tsx:75` 가 `indexOf` 로 현재 단계를 찾는 **표시 배열**일 뿐이며, 어떤 코드도 `from → to` 를 판정하지 않는다. §7.1 이 이 부재를 판정한다.

**재고 규칙 (순수 — `types.ts:190-305`, 회귀 `returns.test.ts:62-179`)**

| 규칙 | 정의 |
|---|---|
| `findVariant(variants, optionValues)` | 값과 **순서가 모두 같아야** 같은 SKU (`:198-207`, 테스트 `:69-73`) |
| `isStockApplied(request)` | `stockAppliedAt !== ''` — **멱등 키**(`:210-212`) |
| `movesStock(status)` | `status === 'completed'` 만 true (`:215-217`) |
| `validateStockPlan(request, variants)` | `unknown-origin`(주문 옵션이 상품에 없음) → `no-option`(교환 옵션 미선택) → `unknown-option`(교환 옵션이 상품에 없음) → `insufficient-stock`(`target.stock < quantity`) → null (`:238-249`). **반품은 첫 검사만 통과하면 된다**(`:243`) |
| `planStockMovements(request, variants, at)` | 반품 = 회수분 입고 1건. 교환 = 회수분 입고 + 재발송 출고 2건 (`:257-288`). 이동 id 는 `mv-<at>-in`/`mv-<at>-out` |
| `applyMovements(variants, movements)` | 입고 +, 출고 −. **`Math.max(0, …)` 로 음수 재고를 만들지 않는다**(`:291-305`, 테스트 `:166-178`) — §7.10 |

## 4. 엔드포인트 명세

### BE-044-EP-01 · 요청 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-004, EL-006, EL-007, EL-007.1~.10, EL-008, EL-009, EL-010 |
| 심 | `data-source.ts:179` `GET /api/returns` |
| 메서드·경로 | `GET /api/returns` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.9) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 필터(유형·상태)·검색을 **전부 클라이언트에서** 수행하므로(FS-044-EL-004) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다(`crud.ts:94`).

**응답 200** — `readonly ReturnRequest[]`. **접수일 내림차순 정렬**(동시 날짜는 `id` 내림차순 안정 정렬 — `sortReturns` `types.ts:161-166`)로 내려준다. 프론트가 어댑터 안에서 한 번 더 정렬하지만(`crud.ts:89,97`) 서버 순서가 정본이어야 페이징 도입 시(§7.9) 계약이 유지된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-044-EP-02 · 요청 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-013, EL-014, EL-015, EL-017, EL-018, EL-034 |
| 심 | `data-source.ts:179` `GET /api/returns/:id` |
| 메서드·경로 | `GET /api/returns/:id` |
| 권한 | `admin`, `operator`. 상품 도메인 읽기 권한 없음 → **404 은닉**(§7.5) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `ReturnRequest`(재고 이동 이력 전체 포함). `stockMovements` 는 **`at` 오름차순**으로 내려준다 — 프론트가 정렬하지 않고 받은 순서 그대로 렌더한다(`StockMovementTable.tsx:73`).

**에러**: 400(id 형식) · 401 · **404 `RETURN_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.5) · 429 · 500 · 504.

> **어댑터는 이미 옳다**: 공용 `createCrudAdapter.fetchOne` 이 없는 id 에 **`HttpError(404, '항목을 찾을 수 없습니다.')`** 를 던진다(`crud.ts:105-107`). 그래서 화면이 404 와 5xx 를 문구·복구 수단으로 가를 수 있다(FS-044-EL-014). 백엔드 연결 시 응답 404 를 같은 타입으로 옮기기만 하면 `EXC-12` 계약이 그대로 유지된다.

---

### BE-044-EP-03 · 처리 저장 (상태 · 메모 · 교환 옵션 + **재고 이동**)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-019, EL-020, EL-023, EL-024, EL-027, EL-032, EL-032.1, EL-034 |
| 심 | `data-source.ts:179-181` `PUT /api/returns/:id (상태 전이·처리 메모)` + 트랜잭션·422·멱등키 요구 |
| 메서드·경로 | `PUT /api/returns/:id` |
| 권한 | `admin`, `operator`(§7.8). 상품 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다**(§7.3). 재고 이동은 **`stockAppliedAt` 이 도메인 멱등 키**이므로 키가 없어도 이중 이동은 나지 않지만, 상태·메모 저장은 두 번 적용될 수 있다 |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `ReturnRequestInput`): `orderNo` · `productId` · `productName` · `customer` · `kind` · `optionValues[]` · `exchangeOptionValues[]` · `reason` · `reasonDetail` · `quantity` · `refundAmount` · `requestedAt` · `status` · `stockAppliedAt` · `stockMovements[]` · `adminNote`.

**서버 검증 (요청을 그대로 믿지 않는다)**
1. **불변 필드 무시**: `orderNo` · `productId` · `productName` · `customer` · `kind` · `optionValues` · `reason` · `reasonDetail` · `quantity` · `refundAmount` · `requestedAt` 는 관리자가 바꿀 수 없다. 프론트가 `toReturnInput(request)`(`types.ts:169-188`)로 되돌려 보내지만 **서버는 저장된 값을 정본으로 유지하고 요청 값을 무시**한다 — 프론트가 낡은 스냅샷을 되돌려 보내 고객 신청 내용을 덮는 사고를 막는다(§7.3).
2. **서버 소유 필드 무시**: `stockAppliedAt` · `stockMovements` 는 **절대 요청에서 받지 않는다** — 서버가 찍는다(§7.3 【보안 판정】).
3. **재고 판정 재실행**: `status === 'completed'` 이고 아직 미반영이면 서버가 `validateStockPlan` 등가 판정을 **저장 시점 재고로** 다시 한다. 위반 시 422(§5). 프론트 판정(FS-044-EL-027)은 UX 이며 정본이 아니다.
4. `adminNote` 는 앞뒤 공백 제거 후 0–500자(`RETURN_NOTE_MAX`).
5. `status` 가 `ReturnStatus` 가 아니면 400.

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 응답 본문을 읽지 않고 상세와 상품을 재조회한다(`ReturnDetailPage.tsx:199-201`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `status`·`adminNote`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `RETURN_NOT_FOUND`** · **409 `CONFLICT`**(§7.3) · **422 `STOCK_UNAVAILABLE`**(`error.fields`: `exchangeOptionValues`) · **422 `OPTION_NOT_FOUND`**(`error.fields`: `optionValues` 또는 `exchangeOptionValues`) · **422 `PRODUCT_NOT_FOUND`** · 429 · 500 · 504.

---

### BE-044-EP-04 · 교환 옵션(SKU)·재고 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-044-EL-029, EL-030, EL-032, EL-032.1, EL-032.2 |
| 심 | `data-source.ts:193-194` `GET /api/products/:id — 교환 옵션(SKU)·재고 조회` |
| 메서드·경로 | `GET /api/products/:id` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Product`(`variants` 포함). **이 계약의 정본은 BE-042(상품)다** — 이 문서는 엔드포인트를 만들지 않고 **소비 사실만 기록**한다(§7.4). 요청이 옵션 사본을 들지 않는 것이 설계 의도다(`data-source.ts:193-194`).

**에러**: 400 · 401 · 403 · **404 `PRODUCT_NOT_FOUND`** · 429 · 500 · 504.

> **어댑터 요구사항**: `fetchReturnProduct` 는 store 의 status 없는 일반 `Error`(`_shared/store.ts:630`)를 **`HttpError(404, '연결된 상품을 찾을 수 없습니다.')` 로 이미 변환한다**(`data-source.ts:202-205`). 화면이 404/5xx 를 가르는 근거가 여기서 나온다(FS-044-EL-029).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts`)가 재인증으로. 화면은 FS-044-EL-010 배너 | **403** 컬렉션 — 상품 도메인 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-044-EL-009 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-044-EL-010 | 5초 → 504 → FS-044-EL-010 |
| EP-02 상세 | 400 — id 형식 위반 → 화면은 FS-044-EL-014 의 **일반 오류 분기**(400 을 404 와 구분하지 않는다) | 401 → 전역 인터셉터. 화면은 FS-044-EL-014 | **읽기 권한 없음 → 404 은닉**(§7.5) — 개별 요청은 고객명·주문번호·환불액을 담는다. 읽기 권한이 있는 `operator` 에게는 403 | **404 `RETURN_NOT_FOUND`** — 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:105-107`). 화면이 '다시 시도'를 숨기고 '목록으로'만 준다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-044-EL-014 일반 분기(재시도 제공) | 5초 → 504 → FS-044-EL-014 |
| EP-03 처리 저장 | 400 `VALIDATION_FAILED` — `status` 가 `ReturnStatus` 가 아님 · `adminNote` 500자 초과. **현재 프론트에 `error.fields` → 인라인 매핑이 없어**(EXC-07) FS-044-EL-016 배너로 뭉개진다(§7.11 #6) | 401 → 전역 인터셉터가 재인증으로. **미저장 처리 내용은 유실된다**(FS-044 §7 #17) | `operator` 도 쓰기가 허용되므로(§7.8) 역할 부족 403 은 상품 쓰기 권한 없는 그 밖의 역할에만. **읽기 권한 없음 → 404 은닉**. 화면은 403 을 일반 배너로 뭉갠다(FS-044 §7 #10) | **404 `RETURN_NOT_FOUND`** — 존재한 적 없는 id | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.3). 어댑터는 **없는 id 에 이미 409 를 던진다**(`crud.ts:126-128`)나 **화면에 해소 UI 가 없어** 일반 배너로 뭉개진다(FS-044 §7 #8) | **422 `STOCK_UNAVAILABLE`**(교환 옵션 재고 < 수량) · **422 `OPTION_NOT_FOUND`**(주문/교환 옵션이 상품에 없음) · **422 `PRODUCT_NOT_FOUND`**(상품 삭제됨). **상태 전이 위반 422 는 계약에 없다 — 전이 규칙 자체가 없기 때문이다**(§7.1). 어댑터가 이미 `violations` 를 실은 422 를 던지고(`data-source.ts:155-163`) 화면이 그 입력의 인라인 오류로 되돌린다(`ReturnDetailPage.tsx:206-209`) | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-044-EL-016 배너 + 참조 코드, 입력 보존. **재고 트랜잭션이 부분 적용되면 안 된다**(§7.2) | **10초 → 504**(재고 트랜잭션 포함 — §2). **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |
| EP-04 상품 조회 | 400 — id 형식 위반 → FS-044-EL-029 일반 분기 | 401 → 전역 인터셉터. 화면은 FS-044-EL-029 | **403** — 이 시점에 이미 요청 상세를 봤으므로 상품의 존재를 숨길 이유가 없다. 상품 도메인 읽기 권한 없음 → 404(BE-042 소관) | **404 `PRODUCT_NOT_FOUND`** — 어댑터가 이미 변환한다(`data-source.ts:202-205`). 화면이 '다시 시도'를 숨긴다. **상품이 지워지면 이 요청은 완료 불가 상태로 고아가 된다**(§7.4) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-044-EL-029 일반 분기 | 5초 → 504 → FS-044-EL-029 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `returnAdapter.fetchAll(signal)` | `GET /api/returns` | EP-01 | `readonly ReturnRequest[]` | O |
| `returnAdapter.fetchOne(id, signal)` | `GET /api/returns/:id` | EP-02 | `ReturnRequest` | O — **404 를 이미 `HttpError` 로 던진다**(`crud.ts:105-107`) |
| `returnAdapter.update(id, input, context?)` | `PUT /api/returns/:id (상태 전이·처리 메모)` + 트랜잭션·422·멱등키 주석 | EP-03 | `void` | **△ — 전체 치환 계약 변경 필요**(§7.3) · **멱등키 미전달**(§7.3) · **409 해소 UI 없음**(FS-044 §7 #8) |
| `fetchReturnProduct(productId, signal)` | `GET /api/products/:id` | EP-04 | `Product` | O — 404 변환까지 되어 있다. **다만 이 엔드포인트의 정본은 BE-042 다**(§7.4) |
| `returnAdapter.create(...)` | — | **없음(범위 밖)** | `createCrudAdapter` 가 제공하나 **호출부 0건** | O — 계약 없음이 정답(§7.6) |
| `returnAdapter.remove(...)` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답(§7.6) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`update`)에 `X-CSRF-Token` 헤더를 싣는다. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` · `fetchReturnProduct` **이미 충족** — 응답 404 를 `HttpError(404, …)` 로 옮기기만 한다. |
| 409 변환 | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다 — `isConflict` 가 412 도 같은 UX 로 수렴시킨다(`http-error.ts:105-107`). **화면 쪽 해소 UI 는 별도 작업이다**(§7.11 #4). |
| 422 변환 | `update` 는 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]`)로 옮긴다 — 어댑터가 **이미 그 형태로 던지고 있고**(`data-source.ts:158-163`) 화면이 `violations[0]?.message` 를 읽는다(`ReturnDetailPage.tsx:207`). **`field` 이름은 프론트 폼 키(`optionValues`·`exchangeOptionValues`)와 일치해야 한다.** |
| 멱등키 | `update` 는 `context?.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — 자리는 이미 있다(`crud.ts:39-41,118`). **비어 있는 것은 호출부다**(§7.11 #3). |
| 재고 부수효과 제거 | `applyStockOnComplete`(`data-source.ts:143-177`)는 **픽스처 전용**이다 — 백엔드가 붙으면 `updateProduct` 호출과 `stockAppliedAt`/`stockMovements` 생성이 **전부 사라지고** 서버 응답이 그 자리를 대신한다. 이 함수를 남긴 채 서버도 이동시키면 **이중 이동**이 된다. |

## 7. 핵심 판정

### 7.1 상태 전이 규칙이 계약에 없다 — 서버가 정본을 세운다 【정합 판정】

**코드로 확인한 사실**: `ReturnStatus` 5개 사이에 **어떤 전이 판정도 없다.** `RETURN_FLOW`(`types.ts:93-98`)는 스텝퍼가 `indexOf` 로 현재 단계를 찾는 **표시 배열**이고(`ReturnStatusStepper.tsx:75`), 상태 select 는 5개 전부를 연다(`ReturnDetailPage.tsx:325-329`). `canTransition`·`allowedNextStatuses` 류 함수가 `grep` 0건이다.

**이것이 만드는 사고**:
- **완료 → 접수** 로 되돌릴 수 있다. 그런데 `stockAppliedAt` 은 그대로라(§7.3) 재고는 움직이지 않는다 — **상태는 '접수'인데 재고는 이미 반영된** 모순 상태가 남는다. 다시 완료로 올려도 어댑터가 `isStockApplied` 로 건너뛴다(`data-source.ts:145`). 운영자는 재고가 반영됐는지 화면(FS-044-EL-028 배지)으로만 알 수 있다.
- **접수 → 완료** 로 수거·검수를 건너뛰고 재고를 넣을 수 있다. 물건을 받지도 않고 입고가 잡힌다.
- **반려 → 완료** 도 열려 있다. 반려한 요청의 재고가 움직인다.

**판정**: 상태 전이는 **서버가 정본**이며 계약에 못박는다. BE-026 §3 의 `STATUS_FLOW` 가 같은 자리에서 하는 일이다. 흐름 상수는 이미 코드에 있으므로(`RETURN_FLOW`) 그것을 **표시가 아니라 규칙**으로 승격하고 서버가 재판정한다.

| 현재 | 허용되는 다음 상태 | 비고 |
|---|---|---|
| `requested` | `collecting` · `rejected` | |
| `collecting` | `inspecting` · `rejected` | |
| `inspecting` | `completed` · `rejected` | **완료 직전에만 재고 판정이 걸린다** |
| `completed` | **없음** | 종착 — 재고가 움직였으므로 되돌리려면 역이동 계약이 필요하다(§7.11 #7) |
| `rejected` | **없음** | 종착 |

- 현재 상태 → 자기 자신은 언제나 허용(변경 없이 메모만 저장하는 것이 정상 경로다).
- 위반 시 **422 `INVALID_STATUS_TRANSITION`**. 이 코드는 **§5 매트릭스에 아직 없다** — 규칙이 채택되는 시점에 추가된다.
- **이 표는 제안이며 아키텍처 의 도메인 확정을 기다린다.** 현 코드에는 근거가 없으므로(`RETURN_FLOW` 는 표시 전용) **'미정'으로 남긴다** — 서버가 임의로 흐름을 정하면 프론트 select 와 갈린다.

### 7.2 재고 이동은 한 트랜잭션이다 — 부분 적용을 만들지 않는다 【정합 판정】

**심이 이것을 명시한다**: `data-source.ts:180-181` — `서버는 요청 갱신 + SKU 재고 증감을 한 트랜잭션으로 처리하고 재고 부족이면 422(field: exchangeOptionValues)로 거절한다.` 프론트도 같은 이유로 부수효과를 어댑터 `patch` 안에 넣었다(`:6-8` — `화면이 '요청 저장'과 '재고 갱신'을 두 번 호출하면 하나만 성공하는 창이 생기기 때문이다`).

**판정**: EP-03 은 **요청 갱신 + SKU 재고 증감 + 이동 이력 기록**을 **하나의 트랜잭션**으로 수행한다. 어느 하나가 실패하면 전부 롤백한다. 이유:
- **재고만 움직이고 요청이 '검수중'에 남으면** 다음 완료 시도가 재고를 **두 번** 움직인다(`stockAppliedAt` 이 기록되지 않았으므로 멱등 가드가 걸리지 않는다).
- **요청만 '완료'가 되고 재고가 안 움직이면** 창고 수량과 시스템이 갈린다 — 오프라인 실사 전까지 아무도 모른다.

**타임아웃이 조회보다 길어야 하는 이유**: 재고 락 + 다중 SKU 갱신 + 이력 기록이 한 트랜잭션이라 조회보다 느리다. **10초**로 잡고(§2), 그보다 **프론트 상한을 크게** 둔다 — 서버가 먼저 결과를 확정해야 프론트가 결과를 모른 채 끊는 구간이 없다(BE-003 §3.4 와 같은 원칙). **현재 프론트에 상한이 없다**(FS-044 §7 #17).

### 7.3 재고·이력 필드를 요청에서 받지 않는다 — 서버가 찍는다 【보안 판정】

**현재 클라이언트가 `stockAppliedAt` 과 `stockMovements` 를 바디에 실어 보낸다**: `toReturnInput(request)`(`types.ts:169-188`)가 두 필드를 **그대로 복사**해 `ReturnRequestInput` 에 넣고(`:184-185`), 화면이 그것을 `update.mutate` 의 `input` 으로 보낸다(`ReturnDetailPage.tsx:182-188`). 픽스처 어댑터는 그 값을 `{ ...current, ...input }` 으로 덮은 뒤(`data-source.ts:144`) 자기가 다시 계산해 넣지만(`:172-176`), **계약상 이 필드들은 요청 바디에 존재한다.**

**이것이 만드는 사고 — 조작된 클라이언트 하나면 충분하다**:
1. **`stockAppliedAt: ''` 로 되돌려 보내면 재고를 두 번 넣을 수 있다.** 이 값이 멱등 가드의 **유일한** 근거다(`:145` `isStockApplied(current)`). 픽스처는 `current`(저장된 값)를 보므로 안전하지만, **서버가 요청 값을 신뢰하는 순간 무한 입고**가 된다 — 반품 1건으로 재고를 원하는 만큼 만들 수 있다.
2. **`stockMovements` 를 조작하면 감사 이력이 위조된다.** 이동 이력은 '어떤 SKU 가 언제 몇 개 움직였는가'의 유일한 기록이며(`types.ts:28-31`), 재고 실사 불일치의 조사 근거다. 클라이언트가 배열을 쓰면 과거 이동을 지우거나 수량을 바꿀 수 있다.
3. **이동 `id` 가 `mv-${at}-in`/`mv-${at}-out`** 이다(`types.ts:266,279`). `at` 은 **클라이언트 시각이 아니라 어댑터의 `new Date().toISOString()`**(`data-source.ts:165`)이라 현재는 안전하지만, 서버가 요청의 `at` 을 받으면 **같은 밀리초의 두 요청이 같은 id 를 만든다.**

**판정**: `stockAppliedAt` · `stockMovements` · 이동 `id` · 이동 `at` 은 **전부 서버가 찍는다.** 요청 바디의 이 값들은 **무시**한다 — 파싱조차 하지 않는다. 이것은 UX 개선이 아니라 **재고 무결성 요구**다: 재고는 금액이다.

**계약을 둘 중 하나로 바꾼다.**

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `PUT /api/returns/:id` 는 **관리자가 실제로 바꾸는 3개만** 받는다: `{ status, adminNote, exchangeOptionValues }`. 재고 이동·`stockAppliedAt`·이력은 **서버가 완료 전이의 부수효과로 자동 기록** | 위조가 구조적으로 불가능하다. 요청 크기가 이력에 비례해 커지지 않는다. 프론트 `toReturnInput` 이 통째로 사라진다. **어댑터 시그니처는 그대로다**(`CrudAdapter.update(id, input)` — `Input` 타입만 좁아진다) — 화면 코드는 `:182-188` 한 곳만 바뀐다 |
| **B (차선)** | PUT 을 유지하되 서버가 불변 필드·서버 소유 필드를 **무시** | 어댑터를 덜 흔든다. 그러나 `ReturnRequestInput` 이 실제로 쓰이지 않는 필드를 계속 실어 보내는 기형이 남고, '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨진다 — 안 A 는 타입이 강제한다 |

**어느 안이든 서버는 요청의 `stockAppliedAt`·`stockMovements` 를 절대 신뢰하지 않는다.**

**낙관적 동시성**: `ReturnRequest` 에 `version`/`updatedAt` 필드가 **없다**(`types.ts:43-73`). 어댑터의 409 는 **'존재 여부' 기반**이다(`crud.ts:126-128` — 없는 id 면 409). 즉 **동시 편집(둘 다 존재)은 last-write-wins** 다 — 두 운영자가 같은 요청을 열어 하나는 '반려', 하나는 '완료'를 저장하면 나중 것이 이긴다. **재고 이동만은 `stockAppliedAt` 이 막지만 상태는 덮인다.** 판정: 안 A 채택 시 다투는 필드가 3개로 줄어 `If-Match`(ETag) 또는 `ReturnRequest.version` 이 **선택**, 안 B 유지 시 **필수**.

### 7.4 상품·SKU·재고의 정본은 이 계약이 아니다 — 그러나 고아 요청을 만든다 【경계 판정】

`fetchReturnProduct`(`data-source.ts:195-206`)는 상품 저장소를 읽을 뿐이고, 재고 갱신은 `updateProduct`(`_shared/store.ts:642-648`)를 부른다. **옵션·재고의 정본은 상품 도메인이다**(`types.ts:6-7` 주석 — `여기서 옵션 매트릭스를 재정의하지 않고 ProductVariant 를 그대로 소비한다`).

**판정**: 이 문서는 `GET /api/products/:id`(EP-04)의 **엔드포인트를 만들지 않는다** — BE-042(상품)가 정본이다. 이 화면은 **소비자**이며, 계약이 EP-04 에 기록되는 것은 '이 화면이 그것을 필요로 한다'는 사실뿐이다.

**그러나 경계에 구멍이 있다 — 코드로 확인했다**: `removeProduct(id)`(`_shared/store.ts:650-652`)는 **`products.filter` 한 줄**이다. 형제 함수 `removeProductCategory`(`:691-696`)는 사용 중이면 던지는데(`if (countProductsUsingCategory(id, products) > 0) throw …`), **상품 삭제는 그것을 참조하는 교환/반품 요청을 검사하지 않는다.** 결과:
- 그 요청의 상세는 열리지만 교환 카드가 404 배너를 그린다(FS-044-EL-029).
- **완료 처리가 영원히 불가능해진다** — 어댑터가 `상품을 찾을 수 없어 재고를 반영할 수 없습니다` 422 를 던진다(`data-source.ts:148-153`).
- 반품 요청도 마찬가지다 — 회수분을 넣을 SKU 가 없다.

**판정**: `DELETE /api/products/:id` 는 **미처리 교환/반품 요청(`status ∉ {completed, rejected}`)이 있으면 409 로 막는다** — 카테고리가 이미 그 규칙을 갖고 있다(`_shared/store.ts:690-696` 의 '사용 중이면 삭제하지 않는다(서버는 409 로 막는다)'). **이 판정의 실행은 BE-042 소관이며 백엔드 명세 이 두 문서를 함께 봐야 한다** — 여기서만 적으면 상품 쪽이 모른다.

### 7.5 요청 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/returns` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 요청 리소스의 존재 자체가 개인정보다** → 상품 도메인 **읽기 권한이 없는** 주체에게는 **404 `RETURN_NOT_FOUND`** 로 은닉한다.

**근거**: 요청 1건은 `customer`(신청자) · `orderNo`(주문번호) · `refundAmount`(환불액) · `reasonDetail`(고객이 쓴 원문 — '착용 흔적이 있어…' 같은 사적 사정)을 담는다. 주문번호는 **주문 도메인의 열거 키**이기도 하다 — `ORD-20260712-0031` 형식(`data-source.ts:31`)은 날짜+일련번호라 요청 id 열거로 **그 날의 주문 볼륨을 추정**할 수 있다. `ReturnRequest` 는 회원 레코드보다 민감도가 낮지 않다 — BE-003 §3.2 가 `GET /api/members/:id` 를 404 로 은닉하는 것과 **같은 이유로** 404 여야 한다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 요청의 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다. 다만 이 도메인은 `operator` 에게 쓰기를 열므로(§7.8) 그 403 은 상품 쓰기 권한 없는 그 밖의 역할에만 발생한다.

**신청자 마스킹**: 픽스처는 `'김**'`(`data-source.ts:34`)처럼 **이미 마스킹된 값**을 담는다. 판정: **마스킹은 서버가 한다** — 원본 이름을 내려보내고 프론트가 가리면 응답 본문에 평문이 남는다(개발자 도구·프록시·로그에 그대로 보인다). 교환/반품 처리에 실명 전체가 필요한 경우(택배 수거 접수)는 **별도 권한의 별도 엔드포인트**로 분리한다 — 목록에 평문을 뿌리지 않는다.

**프론트 영향**: FS-044-EL-014 가 404 를 '요청을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' 로 그리므로 **은닉이 정당한 운영자에게도 그럴듯하게 읽힌다** — 다만 403 을 404 와 구분하지 않아(FS-044 §7 #10) 권한 문제인지 알 수 없다.

### 7.6 요청 생성·삭제 — 계약에 존재하지 않는다 【범위 판정】

**코드로 재확인한 사실**:
- `ReturnsListPage.tsx:2-4` 헤더 주석: `요청은 감사 성격이라 삭제·일괄작업이 없다(고객이 만들고 관리자는 처리만 한다). 그래서 CrudListShell 대신 읽기 전용 표를 쓴다`.
- `data-source.ts:3-4`: `목록/상세는 fetchAll/fetchOne, 상태·메모 저장은 update 를 쓴다(생성·삭제 UI 는 없다 — 요청은 고객이 만들고 관리자는 처리만 한다)`.
- `types.ts:3-4`: `요청은 감사 성격이라 목록에서 삭제하지 않고 상태만 진행한다`.
- 화면에 등록 버튼·행 선택·삭제·일괄 작업이 **없다**(FS-044 §2 — `ReturnsListPage` 는 `CrudListShell` 을 쓰지 않는다).
- `returnAdapter.create`/`remove` 는 `createCrudAdapter` 가 **인터페이스로 제공**할 뿐 **호출부가 0건**이다. (BE-026 의 `ticketAdapter` 가 명시적 거절 구현을 둔 것과 달리 여기는 공용 팩토리를 써서 자리가 자동으로 채워졌다 — **부재의 표현이 약하다**: 실수로 호출하면 실제로 만들어진다. §7.11 #8)

**판정**: `POST /api/returns` · `DELETE /api/returns/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**이며, 코드가 세 겹(주석 3곳 · 호출부 0건 · UI 부재)으로 이를 못박는다. BE-003 §1 이 '**회원 생성** — 고객은 회원가입으로만 유입된다' 로, BE-026 §7.7 이 '**문의 생성** — 문의는 고객 채널이 접수한다' 로 확정한 것과 같은 결이다.

**삭제에 대한 추가 근거**: 교환/반품 요청은 **재고와 환불이 걸린 감사 대상 기록**이다. 요청을 지우면 `stockMovements` 가 함께 사라져 **재고가 왜 그 수치인지 설명할 수 없게 된다** — 실사 불일치의 조사 경로가 끊긴다. 개인정보 파기 요구(고객 탈퇴·보존기간 만료)는 단건 삭제 버튼이 아니라 **보존정책 배치**로 처리해야 할 별도 계약이며, 이 화면의 범위가 아니다 — 백엔드 명세 이관.

### 7.7 `refundAmount` 는 표시 전용이다 — 이 계약이 환불을 실행하지 않는다 【범위 판정】

`refundAmount` 는 반품 요청에만 값이 있고(교환은 0 — `types.ts:62-63`), 화면은 그것을 정의 목록에 **읽기 전용으로** 보인다(FS-044-EL-018, `ReturnDetailPage.tsx:306-311`). **어떤 코드도 이 값으로 결제를 취소하지 않는다** — `refund`/`payment` grep 이 이 화면에 0건이고, 픽스처는 관리자가 메모에 '환불 완료(2026-07-09).'(`data-source.ts:112`)라고 **손으로 적는다**.

**판정**: 이 계약은 **환불을 실행하지 않는다.** `refundAmount` 는 접수 시점에 확정된 **예정액 스냅숏**이며 서버는 이를 불변으로 유지한다(§7.3 불변 필드). 완료 전이가 결제 취소를 트리거하는지는 **결제/정산 도메인의 계약**이며 미정이다 — 이 문서가 정하지 않는다.

**이것이 남기는 위험(기록만 한다)**: 지금 운영자는 '완료'를 눌러 재고를 넣고, 환불은 **다른 시스템에서 손으로** 한 뒤 메모에 적는다. 두 작업 사이에 원자성이 없다 — 재고는 들어왔는데 환불이 안 나가거나 그 반대가 될 수 있고, 시스템은 그것을 모른다. **아키텍처 이 이 경계를 확정해야 한다.**

### 7.8 `operator` 에게 쓰기를 연다 — BE-010 과 다른 판정

BE-010(FAQ)은 `operator` 를 조회 전용으로 두고 모든 쓰기를 403 으로 막는다. **이 도메인은 반대이며, BE-026(1:1 문의) §7.8 과 같은 결이다.**

**근거**: 교환·반품 처리는 **운영자의 본업**이다. `operator` 가 상태 전이·메모·교환 옵션 선택을 할 수 없다면 이 화면을 쓸 사람이 `admin` 뿐이고, 그러면 역할 구분이 무의미해진다. FAQ 는 '전체 고객에게 공표되는 콘텐츠'라 신중해야 하지만, 교환/반품은 '한 고객의 한 주문을 처리하는 응대'다.

**단, 재고가 걸린다 — 그래도 연다**: 완료 처리는 재고를 움직이므로 FAQ 편집보다 무겁다. 그럼에도 여는 이유는 ① 이동 방향·수량이 **요청에서 결정**돼 운영자가 임의 수치를 넣을 수 없고(`planStockMovements` 가 `request.quantity` 를 쓴다) ② 모든 이동이 **이력으로 남아**(§7.3) 사후 추적이 가능하며 ③ 완료 전이는 검수(`inspecting`)를 거쳐야 하므로(§7.1 채택 시) 단독 판단이 아니기 때문이다.

**결론**: EP-01 · EP-02 · EP-03 · EP-04 모두 `admin` + `operator`. 상품 도메인 권한이 아예 없는 역할만 차단한다.

### 7.9 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:
1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며(`crud.ts:94-98`), 프론트가 필터·검색을 전부 클라이언트에서 한다. 교환/반품은 **매일 쌓이는 무한 증가 컬렉션**이다 — 회원·FAQ 와 달리 상한이 없다.
2. **목록이 상세 전문을 담는다.** `ReturnRequest` 타입 하나를 목록·상세가 공유해 목록 응답에 `reasonDetail`(고객 원문)과 `stockMovements`(이동 이력)가 실린다 — **목록 화면이 쓰지 않는 필드**이며(FS-044 §3 의 `COLUMNS` 8개에 없다), 동시에 **개인정보를 필요 이상으로 넓게 노출**한다(§7.5 의 취지와 충돌한다).

**판정**: BE-010 이 `FaqSummary`/`Faq` 로 나눈 것과 같이 **`ReturnRequestSummary` / `ReturnRequest` 를 분리**하고, EP-01 에 `kind`·`status`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ReturnRequestSummary` 는 `reasonDetail`·`stockMovements`·`refundAmount` 를 뺀다.

**이관**: 이 변경은 **프론트 대공사**다 — `filterByStatus`/`searchReturns` 가 서버로 올라가고, 페이지네이션 UI(FS-044 §7 #2)·`SeqCell` 오프셋·스켈레톤 행 수가 함께 붙어야 한다. **URL list state 는 이미 있다**(`useListState` — FS-044-EL-005) — `page` 파라미터를 쓰기만 하면 되므로 IA-13 은 선행 조건이 아니다. quality-bar IA-04 P0 가 이 화면을 gap 으로 잡고 있다. 그전까지 현 계약(전량)을 유지한다 — 픽스처 5건에서는 드러나지 않는다.

### 7.10 음수 재고를 만들지 않는 것은 **버그를 숨긴다** 【정합 판정】

`applyMovements`(`types.ts:291-305`)가 `Math.max(0, variant.stock + delta)` 로 **음수 재고를 0 으로 깎는다**. 테스트가 이 동작을 고정한다(`returns.test.ts:166-178` — '재고를 음수로 만들지 않는다').

**판정: 서버는 이 동작을 복제하지 않는다.** 이유:
- 표시 계층에서 음수 재고는 보기 싫지만, **데이터 계층에서 음수는 사실이다** — '팔린 것보다 적게 갖고 있다'는 실사 불일치의 신호이며, 0 으로 깎으면 그 신호가 사라진다.
- `validateStockPlan` 이 `target.stock < request.quantity` 를 이미 막으므로(`types.ts:247`) **정상 경로에서는 음수가 나올 수 없다.** 음수가 나온다는 것은 **다른 경로가 재고를 이미 뺐다**는 뜻이고(동시 주문·다른 관리자), 그것이야말로 알아야 할 사실이다.
- 서버는 **재고 락 안에서 판정하고 위반이면 422** 를 낸다(§7.2). 깎지 않는다.

**프론트 후속**: `Math.max(0, …)` 는 픽스처가 서버 없이 그럴듯하게 동작하기 위한 방어이며 계약이 아니다. 백엔드 연결 시 `applyMovements` 는 어댑터와 함께 사라진다(§6.1).

### 7.11 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **`stockAppliedAt`·`stockMovements` 를 요청 바디에서 제거(§7.3 안 A)** — 프론트 `toReturnInput` 축소 + `ReturnRequestInput` 타입 좁히기. **재고 무결성의 핵심** | 백엔드 명세 · UI 기획 (최우선) |
| 2 | **상태 전이 규칙 확정(§7.1)** — 현 코드에 근거가 없어 **'미정'** 으로 남겼다. 아키텍처 이 흐름을 확정하면 `RETURN_FLOW` 를 표시 상수에서 규칙으로 승격하고 서버가 422 `INVALID_STATUS_TRANSITION` 로 재판정한다. 그전까지 완료→접수 역행·접수→완료 건너뛰기가 열려 있다 | **아키텍처 (선행)** · 백엔드 명세 · UI 기획 |
| 3 | EP-03 에 멱등키가 전달되지 않는다 — 자리는 있고(`crud.ts:39-41,301,310`) 원장도 있는데(`crud.ts:62-72,121`) **호출부가 비어 있다**(`ReturnDetailPage.tsx:180-190`). 프론트에 `submitLockRef` 도 없다(quality-bar EXC-08 P0). 재고 이중 이동은 `stockAppliedAt` 이 막지만 상태·메모는 두 번 나갈 수 있다 | UI 기획 · 백엔드 명세 |
| 4 | 409 충돌 해소 UI 부재 — 어댑터가 409 를 던지는데(`crud.ts:126-128`) 화면 `onError` 에 `isConflict` 분기가 없다(`ReturnDetailPage.tsx:203-212`). `useCrudForm` 의 conflict 다이얼로그를 쓰지 않는다 | UI 기획 |
| 5 | 낙관적 동시성 토큰(`If-Match`/`version`) 부재 — 현 409 는 '존재 여부' 기반이라 **동시 편집은 last-write-wins** 다(§7.3). §7.3 안 A 채택 시 선택, 안 B 유지 시 필수 | 백엔드 명세 |
| 6 | 400 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다(EXC-07 P1) — `useCrudForm` 미사용이라 `setError` 경로가 없다. **422 만 수동으로 매핑한다**(`:206-209`) | UI 기획 |
| 7 | **재고 역이동 계약 부재(§7.1)** — 완료를 잘못 눌러도 재고를 되돌릴 수 없다. 취소 전이 + 역이동 이력이 필요하다면 별도 계약이다 | **아키텍처 (선행)** · 백엔드 명세 |
| 8 | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다**(§7.6) — BE-026 의 `ticketAdapter` 는 명시적 거절 구현을 뒀는데(`Promise.reject('문의는 삭제할 수 없습니다.')`) 이 어댑터는 `createCrudAdapter` 를 써서 자리가 자동으로 채워졌다. **부재가 코드로 강제되지 않는다** — 실수로 호출하면 요청이 만들어지거나 지워진다 | UI 기획 쪽 변경 요청 |
| 9 | **상품 삭제가 미처리 요청을 검사하지 않는다(§7.4)** — `removeProduct` 는 `filter` 한 줄(`_shared/store.ts:650-652`). 형제 `removeProductCategory` 는 사용 중이면 던진다(`:691-696`). **BE-042 와 함께 봐야 한다** | **백엔드 명세 (BE-042 연동)** · UI 기획 |
| 10 | 신청자 마스킹을 서버가 한다(§7.5) — 현재 픽스처가 마스킹된 값을 갖고 있어 계약이 검증되지 않는다 | 백엔드 명세 |
| 11 | 목록 페이징 + `ReturnRequestSummary` 분리(§7.9) — IA-04 P0 와 한 배치로 | 백엔드 명세 · UI 기획 |
| 12 | **환불 실행 경계 미정(§7.7)** — 완료 전이가 결제 취소를 트리거하는지 계약이 없다. 지금은 운영자가 다른 시스템에서 손으로 하고 메모에 적는다 | **아키텍처 (선행)** · 백엔드 명세 |
| 13 | 요청 보존정책·개인정보 파기 배치(§7.6) — 관리자 삭제 API 가 아닌 별도 계약. `stockMovements` 가 함께 사라지면 재고 설명이 끊긴다는 제약이 있다 | 백엔드 명세 |
| 14 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 처리 내용이 유실**된다(EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) — §7.2 가 요구하는 '서버 상한 < 프론트 상한' 관계가 성립하지 않는다 | UI 기획 · 프론트 구현 |
| 15 | 이탈 abort 는 클라이언트만 결과를 버릴 뿐 서버 도달 여부를 보장하지 않는다 — **재고가 이미 움직였는데 화면에 안 보일 수 있다**. 저장 중 이탈이 실제로 위험한 유일한 화면이다 | 백엔드 명세 · UI 기획 |

## 8. 자기 점검

- [x] FS-044 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 4건(EP-01·02·03·04) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다** (등록·삭제는 §7.6 에서 '계약 없음'으로 판정, 상품 조회는 BE-042 의 것을 소비 사실로만 기록)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (4행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한(§7.8 `operator` 쓰기 허용)과 타임아웃(§2 저장 10초 — 재고 트랜잭션)만 고유 차이**를 근거와 함께 기술
- [x] **생성·삭제를 '범위 밖'으로 판정**하고 코드 세 겹(주석 3곳 `ReturnsListPage.tsx:2-4`·`data-source.ts:3-4`·`types.ts:3-4` · 호출부 0건 · UI 부재)으로 근거를 댔다 — BE-003 §1 · BE-026 §7.7 선례 인용. **동시에 공용 팩토리 때문에 부재가 코드로 강제되지 않는다는 사실을 §7.11 #8 에 남겼다**
- [x] 멱등성 판정 — 조회 GET 멱등 / **처리 저장은 `stockAppliedAt` 이 도메인 멱등 키이나 그것이 요청 바디에 있어 위조 가능함을 §7.3 에 명시**
- [x] 보안 판정 3건 이상 — **재고·이력 필드 위조(§7.3)** · **403 vs 404 은닉 + 신청자 마스킹(§7.5)** · 정합 판정(§7.1 전이 규칙 부재 · §7.2 트랜잭션 · §7.4 고아 요청 · §7.10 음수 재고)
- [x] 재고 이동 규칙(`validateStockPlan`·`planStockMovements`·`applyMovements`·`isStockApplied`·`movesStock`)을 §3 표와 §5 의 422 축(`STOCK_UNAVAILABLE`·`OPTION_NOT_FOUND`·`PRODUCT_NOT_FOUND`)에 정확히 반영했다
- [x] **상태 전이 규칙이 코드에 없음을 확인하고 '미정'으로 남겼다**(§7.1 · §7.11 #2) — `RETURN_FLOW` 가 표시 전용임을 `ReturnStatusStepper.tsx:75` 로 입증. 제안 표를 두되 아키텍처 확정 대기임을 명시했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
