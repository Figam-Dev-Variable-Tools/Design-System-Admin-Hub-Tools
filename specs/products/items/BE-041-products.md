---
id: BE-041
title: "상품 백엔드 기능 명세"
functionalSpec: FS-041
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-041. 상품 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-041 상품 (`/products` · `/products/new` · `/products/:id/edit`) |
| 범위 | 상품 목록 조회, 상품 상세 조회, 상품 등록, 상품 수정(전체 치환 — 전시 토글 포함), 상품 삭제 |
| **범위 밖** | **카테고리 CRUD** — BE-042 소관(이 화면은 소비자, §7.7). **이미지 업로드**(`POST /api/uploads`) — 심은 있으나 `packages/ui`/`shared/crud` 소유이며 이 화면의 data-source 에 없다(§7.5). **전역 배송 정책**(BE-043) · **전역 적립금 정책**(`/products/points`) — 상품의 `shipping`/`points` 는 그 정책의 **상품 단위 오버라이드**이며 정책 자신의 계약은 별개다(§7.8). **재고 차감** — 주문 도메인의 관심사다(§7.4) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/products/items/data-source.ts` (`productAdapter` · `fetchProductCategoryOptions`) |
| 도메인 타입 | `apps/admin/src/pages/products/_shared/store.ts` — **이 화면의 `types.ts` 는 뷰 헬퍼 전용**(배지 톤·`toProductInput`)이다. 상품 도메인 모델·순수 규칙·픽스처는 상품 화면과 카테고리 화면이 공유하는 잎 모듈에 모여 있다(`store.ts:3-6` 이 그 이유를 못박는다) |
| 검증 정본 | `apps/admin/src/pages/products/items/validation.ts` 의 zod 스키마(`productSchema`) + `_shared/store.ts` 의 상수·순수 규칙(`PRODUCT_*_MAX` · `finalPrice` · `earnedPoints` · `buildVariantMatrix`) |

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 어댑터가 **공용 `createStoreAdapter`** 로 만들어진다 | `items/data-source.ts:20-27` |
| 연동 심은 **두 줄뿐**이다 | `items/data-source.ts:19` · `items/data-source.ts:29` |
| `fetchOne` 없는 id → `HttpError(404)` | `shared/crud/crud.ts:192-194` |
| `update`/`remove` 없는 id → `HttpError(409)` (유령 저장 해소) | `shared/crud/crud.ts:219-221` · `:232-234` |
| 멱등 원장이 어댑터까지 연결됐다 | `shared/crud/crud.ts:168,200-203,208` ← `useCrudForm.ts:118-123` → `crud.ts:288,310` |
| **`Product` 에 `version`/`updatedAt` 필드가 없다** | `_shared/store.ts:111-137` (전수 확인) |
| 목록이 조건을 받지 않는다(전량 반환) | `CrudAdapter.fetchAll(signal)` — `shared/crud/crud.ts:45` · 필터·검색은 `ProductListPage.tsx:164-168` |
| `categoryLabel` 은 서버 조인 비정규화 값이다 | `_shared/store.ts:117-118` · `store.ts:638,645` `labelOf(input.categoryId)` |
| 상품코드 전역 유일성 검증이 **없다** | `items/validation.ts:40` `requiredText('상품코드', 40)` — 유일성 `.check` 부재 |
| SKU 중복 검사는 **한 상품 안**에 갇혀 있다 | `items/validation.ts:88-94` |
| 이미지 값은 `blob:` 아니면 `''` 뿐이고 http(s) 를 강제하지 않는다 | `shared/crud/validation.ts:39-71` `requiredImage` |
| `GET /api/products/:id` 를 **다른 화면도 소비한다** | `products/returns/data-source.ts:193-195` `fetchReturnProduct` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 상품 도메인 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회 계열(목록·상세)만**. 등록·수정·삭제는 **403** — BE-010(콘텐츠)과 같은 판정이고 BE-026(1:1 문의)과 반대다(§7.9). 상품 도메인 읽기 권한 없는 관리자 → **컬렉션 403 / 개별 상품 403**(§7.1 — 회원·문의와 달리 404 은닉을 하지 **않는다**).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기**: **일부 있다**. `/products` 의 '상품 등록' 버튼만 `can(resource,'create')` 로 게이팅된다(`ProductListPage.tsx:119,255-261`). 행 수정·행 삭제·일괄 삭제·폼 제출은 게이팅되지 않는다(FS-041 §7 #7). **이 사실이 서버 책임을 바꾸지 않는다** — 프론트 게이팅은 UX 이며 실제 차단은 전적으로 서버의 몫이다(`RequirePermission.tsx:8-11` 이 그 경계를 명시한다).

## 3. 데이터 계약 (`_shared/store.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Product` | `id` · `name` · `code` · `categoryId` · `categoryLabel`(서버 조인·비정규화) · `brand` · `pricing` · `saleStatus` · `displayed` · `optionGroups[]` · `variants[]` · `shipping` · `points` · `coverImageUrl` · `imageUrls[]` · `description` · `tags[]` | 목록·상세가 **같은 타입**이다 — 목록도 옵션·이미지·설명 전문을 받는다(§7.6). **`version`/`updatedAt`/`createdAt` 이 없다**(§7.2) |
| `ProductInput` | `Omit<Product, 'id' \| 'categoryLabel'>` | 저장 입력. **라벨은 서버가 조인하므로 제외.** 전체 치환이다 |
| `ProductPricing` | `price`(원) · `discountType` · `discountValue`(amount=원 \| percent=% \| none=0) · `taxable` | `taxable` 은 **최종가에 영향을 주지 않는다**(`store.ts:196-197`) |
| `ProductOptionGroup` | `id` · `name` · `values[]` | 조합형 옵션의 축. 최대 3개(`MAX_OPTION_GROUPS`) |
| `ProductVariant` | `id` · `sku` · `optionValues[]`(`optionGroups` 순서 정렬) · `addPrice`(원) · `stock` · `soldOut` | 데카르트 곱 한 칸. 옵션이 없으면 `optionValues: []` 단일 SKU. **`addPrice` 타입 주석은 음수를 허용하나 UI·스키마가 둘 다 막는다**(FS-041 §7 #20) |
| `ProductShipping` | `method`(courier\|direct\|pickup) · `feeType`(free\|paid\|conditional) · `fee` · `freeThreshold` | **상품별 오버라이드**. 전역 정책(BE-043)과 별개 |
| `ProductPoints` | `mode`(rate\|fixed\|none) · `rate`(%) · `amount`(원) | **상품별 오버라이드**. 쓰이지 않는 축은 저장 시 0 으로 눕는다(`ProductFormPage.tsx:169-172`) |
| `ProductSaleStatus` | `on_sale` \| `sold_out` \| `stopped` | **전이 제약이 없다**(§7.10) |
| `ProductCategory` | `id` · `label` | 선택지 전용. 정본은 BE-042 |
| 상수 | `PRODUCT_NAME_MAX=100` · `PRODUCT_CODE_MAX=40` · `PRODUCT_BRAND_MAX=40` · `PRODUCT_DESCRIPTION_MAX=2000` · `PRODUCT_PRICE_MAX=100_000_000` · `PRODUCT_STOCK_MAX=999_999` · `PRODUCT_POINTS_RATE_MAX=100` · `MAX_PRODUCT_IMAGES=10` · `MAX_OPTION_GROUPS=3` · `MAX_TAGS=20` | `store.ts:171-181` |

**검증 규칙 (`productSchema` — 서버가 정본이어야 한다)**

| 필드 | 규칙 | 조건부 |
|---|---|---|
| `name` | 공백만 금지 · ≤100자 | — |
| `code` | 공백만 금지 · ≤40자 | **전역 유일성 검증 없음**(§7.3) |
| `categoryId` | 공백만 금지 | 존재 여부 검증 없음(§7.7) |
| `brand` | ≤40자 | 선택 |
| `price` | `^\d+$` · ≤100,000,000 | **하한이 없다 — '0' 이 통과한다**(FS-041 §7 #28) |
| `discountValue` | percent: 1~100 · amount: 1 이상 **`price` 미만** | `discountType !== 'none'` 일 때만 |
| `points.rate` | `^\d+$` · 1~100 | `mode === 'rate'` 일 때만 |
| `points.amount` | `^\d+$` · ≥1 | `mode === 'fixed'` 일 때만. **상한 없음**(FS-041 §7 #29) |
| `shipping.fee` | `^\d+$` · ≥1 | `feeType !== 'free'` 일 때만 |
| `shipping.freeThreshold` | `^\d+$` · ≥1 | `feeType === 'conditional'` 일 때만. **`fee` 와의 대소 관계 미검증** |
| `variants` | ≥1행 · `0 ≤ stock ≤ 999,999` · `addPrice ≥ 0` · **비어 있지 않은 SKU 끼리 유일** | 빈 SKU 는 유일성 검사에서 제외 |
| `coverImageUrl` | **등록 여부만** — 형식 미강제 | §7.5 알려진 빚 |
| `imageUrls` | ≤10장 | — |
| `description` | ≤2000자 | — |
| `tags` | ≤20개 | 개별 길이·중복 미검증 |

**파생 규칙 (프론트 순수 함수 — 서버가 내려주지 않는다)**: `finalPrice`(할인 반영 최종가) · `discountRate`(할인율 환산) · `totalStock`(SKU 재고 합) · `isLowStock`(0 초과 10 미만 · 판매중지 제외) · `earnedPoints`(최종가 × 적립률, 원 단위 절사) · `buildVariantMatrix`(데카르트 곱 + 기존 조합 보존). **서버 계약에 이 필드들이 없다** — §7.11.

## 4. 엔드포인트 명세

### BE-041-EP-01 · 상품 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-041-EL-002.4, EL-004, EL-007, EL-008, EL-010, EL-010.1~.12, EL-011, EL-012, EL-013 |
| 메서드·경로 | `GET /api/products` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.6) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 카테고리·판매상태 필터와 키워드 검색을 **전부 클라이언트에서** 수행하므로(`ProductListPage.tsx:164-168` — `filterProducts`/`filterBySaleStatus`/`searchProducts`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly Product[]`. **상품명 가나다 오름차순**(동명은 `id` 오름차순 안정 정렬)로 내려준다 — 프론트 `sortProducts` 가 한 번 더 정렬하지만 서버 순서가 정본이어야 페이징 도입 시(§7.6) 계약이 유지된다. 각 항목의 `categoryLabel` 은 서버가 조인한 조회 시점 표시명이다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-041-EP-02 · 상품 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-041-EL-023~EL-030, EL-033, EL-037 |
| 메서드·경로 | `GET /api/products/:id` |
| 권한 | `admin`, `operator`. 권한 부족 → **403**(§7.1 — 404 은닉을 하지 않는다) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Product` 전체.

**에러**: 400(id 형식) · 401 · 403 `FORBIDDEN` · **404 `PRODUCT_NOT_FOUND`** · 429 · 500 · 504.

> **어댑터 요구사항**: `createStoreAdapter.fetchOne` 이 이미 없는 id 를 `HttpError(404)` 로 던진다(`crud.ts:192-194`). 그래서 FS-041-EL-033 의 404/오류 분기가 **실제로 발현된다** — `useCrudForm.ts:143-149` `isNotFound` 가 status 를 보고 판정하기 때문이다. HTTP 연동 시 **서버의 404 를 같은 `HttpError(404)` 로 변환**해야 이 분기가 유지된다. `store.ts:630` 의 `throw new Error('상품을 찾을 수 없습니다')`(status 없는 generic Error)는 **어댑터가 앞에서 가로채므로 화면에 도달하지 않는다** — 그 방어가 사라지면 404 분기가 함께 죽는다.

> **이 엔드포인트는 다른 화면도 소비한다**: `products/returns/data-source.ts:193-195` `fetchReturnProduct` 가 `// TODO(backend): GET /api/products/:id — 교환 옵션(SKU)·재고 조회` 로 같은 경로를 가리킨다(옵션의 정본은 상품이라 반품 화면이 자기 사본을 들지 않는다). **응답 계약을 바꾸면 반품 화면이 함께 깨진다** — 변경 시 그 소비자를 빼먹지 말 것.

---

### BE-041-EP-03 · 상품 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-041-EL-023~EL-029, EL-032(등록) |
| 메서드·경로 | `POST /api/products` |
| 권한 | `admin` 만(§7.9) |
| 멱등성 | **`Idempotency-Key` 로 멱등** — 프론트가 제출 시도 단위 키를 만들어 보낸다(§7.12) |
| 레이트리밋 | 분당 60회 |

**바디** — `ProductInput` 전체(`categoryLabel` 제외).

**서버 검증 (요청을 그대로 믿지 않는다)**
1. §3 의 zod 규칙 전부를 **서버가 재판정**한다 — 프론트 검증은 UX 다.
2. **`code` 전역 유일성** — 프론트에 이 검증이 없다(§7.3). 중복이면 409.
3. **`categoryId` 존재 여부** — 프론트에 이 검증이 없다(§7.7). 없으면 422.
4. **`categoryLabel` 은 서버가 조인해 채운다** — 요청에 있어도 무시한다.
5. **`variants` 정합성** — `optionValues` 가 `optionGroups` 의 데카르트 곱과 일치하는지, `optionValues` 순서가 `optionGroups` 순서인지. 프론트는 `buildVariantMatrix` 로 만들지만 **요청은 조작될 수 있다**.
6. **`coverImageUrl`/`imageUrls`** — §7.5.

**응답 201/204**. 프론트 `create(input, context): Promise<void>` — 응답 본문을 읽지 않고 목록을 무효화한 뒤 `/products` 로 이동한다. **id 를 쓰지 않는다.**

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **409 `DUPLICATE_PRODUCT_CODE`**(§7.3) · **422 `CATEGORY_NOT_FOUND`**(§7.7) · **422 `INVALID_VARIANT_MATRIX`** · 429 · 500 · 504.

---

### BE-041-EP-04 · 상품 수정 (전체 치환)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-041-EL-010.9(전시 토글), EL-023~EL-029, EL-032(수정), EL-034 |
| 메서드·경로 | `PUT /api/products/:id` |
| 권한 | `admin` 만(§7.9) |
| 멱등성 | 멱등(PUT) + `Idempotency-Key`. **단 그 멱등성이 곧 lost update 다**(§7.2·§7.4) |
| 레이트리밋 | 분당 60회 |

**바디** — `ProductInput` 전체. **부분 갱신(PATCH)이 아니다.** 목록의 전시 토글(FS-041-EL-010.9)조차 `toProductInput(item)` 전체에 `displayed` 만 갈아 끼워 보낸다(`ProductListPage.tsx:229`).

**서버 검증** — EP-03 과 동일 + 아래.
7. **`code` 유일성은 자기 자신을 제외**하고 판정한다.
8. **낙관적 동시성** — §7.2.
9. **`variants[].stock`** — §7.4.

**응답 200/204**. 프론트 `update(id, input, context): Promise<void>` — 응답 본문을 읽지 않고 목록·상세를 무효화한다(`crud.ts:312-316`).

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `PRODUCT_NOT_FOUND`** · **409 `CONFLICT`**(§7.2) · **409 `DUPLICATE_PRODUCT_CODE`** · **422 `CATEGORY_NOT_FOUND`** · **422 `INVALID_VARIANT_MATRIX`** · 429 · 500 · 504.

---

### BE-041-EP-05 · 상품 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-041-EL-010.11, EL-014, EL-015 |
| 메서드·경로 | `DELETE /api/products/:id` |
| 권한 | `admin` 만(§7.9) |
| 멱등성 | 멱등(DELETE). **프론트가 멱등키를 싣지 않는다**(§7.12) |
| 레이트리밋 | 분당 60회. **일괄 삭제는 선택 건수만큼 동시에 발사된다**(§7.13) |

**응답 204**.

**에러**: 400(id 형식) · 401 · 403 · **404 `PRODUCT_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제됨 — `crud.ts:232-234`) · **409 `PRODUCT_IN_USE`**(주문·반품이 참조 중 — §7.14) · 429 · 500 · 504.

---

### BE-041-EP-06 · 카테고리 선택지 조회 — **BE-042 소유 (이 문서는 만들지 않는다)**

FS-041-EL-002.2(좌측 카테고리 필터)·EL-023.4(폼 카테고리 select)가 필요로 하는 읽기다. 심은 **있다**: `items/data-source.ts:29` `// TODO(backend): GET /api/products/categories (폼·목록의 분류 선택지)`.

**그런데 그 경로는 BE-042-EP-01 이 이미 소유한다** — `categories/data-source.ts:20` 이 같은 `GET /api/products/categories` 를 카테고리 목록 조회로 선언한다.

- 판정: §7.7. **이 문서는 새 엔드포인트를 만들지 않는다.**
- FS-026 과 달리 **어댑터를 거친다**(동기 store 직접 호출이 아니다) — 로딩·실패·재시도가 실재하고, HTTP 연동 시 **어댑터 본문만 바꾸면 된다**(화면 코드 무변경).

## 5. 예외 매트릭스

> EP-06 은 **BE-042 가 소유하는 계약**이므로 이 매트릭스에 행이 없다(§7.7). 아래 5행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색이 전부 클라이언트) | 401 → 전역 인터셉터가 재인증으로. 화면은 FS-041-EL-013 배너 | **403** 컬렉션 — 상품 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-041-EL-012 빈 상태(3분기) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-041-EL-013 | 5초 → 504 → FS-041-EL-013 |
| EP-02 상세 | 400 — id 형식 위반 | 401 → 전역 인터셉터. 화면은 FS-041-EL-033 의 'error' 분기 | **403** — 상품은 공개 카탈로그 대상이라 **존재를 숨기지 않는다**(§7.1). 회원·문의와 다른 판정 | **404 `PRODUCT_NOT_FOUND`** → FS-041-EL-033 의 'not-found' 분기('찾을 수 없습니다' + **'목록으로'만**). 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:192-194`) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-041-EL-033 의 'error' 분기('다시 시도' + '목록으로') | 5초 → 504 → 'error' 분기. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |
| EP-03 등록 | 400 `VALIDATION_FAILED` — §3 의 규칙 위반. `error.fields` 로 내려보낸다 | 401 → 전역 인터셉터. **미저장 입력은 유실된다**(FS-041 §7 #33) | **403 `FORBIDDEN`** — `operator` 는 등록할 수 없다(§7.9). 컬렉션 쓰기라 은닉할 개별 리소스가 없다. **프론트는 `canCreate` 로 버튼을 숨기지만 그것은 UX 다** | N/A — 생성이라 대상이 없다 | **409 `DUPLICATE_PRODUCT_CODE`** — `code` 중복(§7.3). **프론트에 이 검증이 없어** FS-041-EL-034 충돌 다이얼로그가 뜨는데, 문구가 '다른 사용자가 먼저 삭제한 항목입니다'가 아니라 서버 문구여야 옳다(`useCrudForm.ts:170-172` 가 `HttpError.message` 를 그대로 쓴다 — 서버 문구가 곧 UX 다) | **422 `CATEGORY_NOT_FOUND`**(없는 `categoryId` — §7.7) · **422 `INVALID_VARIANT_MATRIX`**(`optionValues` 가 `optionGroups` 의 곱과 불일치). **프론트에 필드 매핑 경로가 있다** — `useCrudForm.ts:182-191` 이 `error.fields` 를 RHF `setError` 로 꽂고 첫 필드로 포커스한다(EXC-07 충족) | 429 분당 60 + `Retry-After` → FS-041-EL-022 배너로 뭉개진다 | 500 + `traceId` → FS-041-EL-022 배너 + **복사 가능한 오류 코드**(`HttpError.reference`), 입력 보존 | 5초 → 504 → FS-041-EL-022 배너, 입력 보존 |
| EP-04 수정 | 400 `VALIDATION_FAILED` — 위와 동일 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 수정할 수 없다. 읽기 권한이 있는 주체에게는 403 을 준다(존재를 이미 안다 — BE-003 §3.2). **전시 토글도 이 403 을 받는다** — 그 실패는 토스트로만 보인다(FS-041 §7 #10) | **404 `PRODUCT_NOT_FOUND`** — 존재한 적 없는 id. 어댑터는 **`if (!exists(id)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`**(`crud.ts:219-221`)로 **409 를 준다** — 픽스처는 '없음'과 '먼저 삭제됨'을 구분할 수 없기 때문이다. HTTP 연동 시 **서버는 그 둘을 구분한다**: 존재한 적 없으면 404, 로드 후 삭제됐으면 409 | **409 `CONFLICT`** — ① 낙관적 동시성 토큰 불일치(§7.2 — **현재 토큰이 없어 발생할 수 없다**) ② 대상 부재(어댑터가 이미 이것을 낸다 — 유령 저장 해소) ③ **409 `DUPLICATE_PRODUCT_CODE`**(§7.3). 프론트는 ①②③을 **같은 충돌 다이얼로그**로 그린다(`useCrudForm.ts:166-178`) — 서버 문구로만 갈린다 | **422 `CATEGORY_NOT_FOUND`** · **422 `INVALID_VARIANT_MATRIX`** · **422 `STOCK_CONFLICT`**(§7.4 — 주문이 깎은 재고를 폼이 되살리려 할 때). 전이 위반은 **없다** — `saleStatus` 에 전이 제약이 없다(§7.10) | 429 분당 60. **일괄 삭제가 아니라도 전시 토글 연타가 이 상한에 닿을 수 있다** | 500 + `traceId` → FS-041-EL-022 배너(폼) / 실패 토스트(전시 토글) | 5초 → 504 → 위와 동일 |
| EP-05 삭제 | 400 — id 형식 위반 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 삭제할 수 없다. 읽기 권한이 있으므로 404 로 숨기지 않는다 | **404 `PRODUCT_NOT_FOUND`** — 어댑터는 같은 자리에서 **409 '이미 삭제된 항목입니다.'**(`crud.ts:232-234`)를 준다. 서버는 404(존재한 적 없음)와 409(먼저 삭제됨)를 구분한다. 프론트는 둘 다 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 **뭉갠다**(`useCrudList.tsx:112` — FS-041 §7 #10) | **409 `CONFLICT`**(이미 삭제됨) · **409 `PRODUCT_IN_USE`**(주문·반품이 참조 — §7.14). 프론트가 둘을 구분하지 않는다 | N/A — 상태 위반 개념이 없다(삭제에 전제 상태가 없다). 참조 무결성 위반은 409 로 낸다(§7.14) | 429 분당 60 + `Retry-After`. **일괄 삭제가 선택 건수만큼 동시에 발사돼 이 상한을 넘기기 쉽다**(§7.13) — 429 는 부분 실패 건수로만 보인다 | 500 + `traceId` → FS-041-EL-014/EL-015 다이얼로그 배너 | 5초 → 504 → 다이얼로그 배너. 일괄이면 부분 실패 건수 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `productAdapter.fetchAll(signal)` | `GET /api/products` | EP-01 | `readonly Product[]` | O |
| `productAdapter.fetchOne(id, signal)` | `GET /api/products/:id` | EP-02 | `Product` | O — **404 를 이미 `HttpError(404)` 로 던진다**(`crud.ts:192-194`) |
| `productAdapter.create(input, context)` | `POST /api/products` | EP-03 | `void` | **△ — `Idempotency-Key` 헤더 배선 필요**(키는 이미 `context.idempotencyKey` 로 도달한다 — §7.12) |
| `productAdapter.update(id, input, context)` | `PUT /api/products/:id` | EP-04 | `void` | **△ — `If-Match`/`version` 없음**(§7.2) · `Idempotency-Key` 헤더 배선 필요 |
| `productAdapter.remove(id, context)` | `DELETE /api/products/:id` | EP-05 | `void` | **△ — 멱등키를 싣지 않는다**(`crud.ts:319-322` `DeleteVars` 에 키 필드가 없다 — §7.12) |
| `fetchProductCategoryOptions(signal)` | `GET /api/products/categories` | **BE-042-EP-01** | `readonly ProductCategory[]` | **△ — 경로가 BE-042 와 충돌한다**(§7.7). 어댑터 시그니처는 이미 비동기·취소 가능이라 **본문만 바꾸면 된다** |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

- **쓰기(POST · PUT · DELETE)에 `X-CSRF-Token` 헤더**.
- **`POST`/`PUT` 에 `Idempotency-Key: <context.idempotencyKey>` 헤더** — 키는 이미 `WriteContext` 로 도달한다(`crud.ts:30-42`). **키가 `undefined` 면 헤더를 싣지 않는다**(단건 삭제처럼 확인 다이얼로그를 거치는 조작 — `crud.ts:33-37`).
- **`DELETE` 에도 멱등키를 싣게 하려면 `DeleteVars`(`crud.ts:319-322`)에 필드를 더해야 한다** — 시그니처 변경이므로 별도 티켓(§7.12).
- **`PUT` 에 `If-Match: <version>` 헤더** — **`Product` 에 그 필드가 없으므로 타입 변경이 선행된다**(§7.2). 시그니처는 그대로다(`update(id, input, context)`) — 버전은 `input` 이 아니라 로드한 항목에서 와야 하므로 **`useCrudForm` 이 그것을 들고 있어야 한다**. 어댑터 본문만으로 끝나지 않는다.
- **404 → `HttpError(404, …)` · 409/412 → `HttpError(409, …)` · 422 → `HttpError(422, …, { violations })` 변환** — `useCrudForm` 의 세 분기(`isNotFound`/`isConflict`/`isUnprocessable`)가 전부 status 로 판정한다. `createStoreAdapter` 가 이미 404·409 를 그렇게 하고 있어 **HTTP 연동이 그 계약을 깨지 않는 것이 핵심이다**.
- **500 등의 `error.traceId` 를 `HttpError.reference` 로** 실어야 FS-041-EL-022 의 '오류 코드' 가 서버 로그와 상관된다 — 현재는 클라이언트가 `TDS-<base36>` 를 스스로 만든다(`http-error.ts:59,68-75`).

## 7. 핵심 판정

### 7.1 상품은 403 으로 거절한다 — 404 로 은닉하지 않는다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용하면 **회원·1:1 문의와 반대 결론**이 나온다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/products` 권한 부족 시 **403 `FORBIDDEN`**. (원칙 1 그대로)
2. **개별 상품 리소스의 존재는 개인정보가 아니다** → `GET /api/products/:id` 권한 부족 시에도 **403 `FORBIDDEN`**.

**근거**: BE-003 §3.2 가 회원을, BE-026 §7.6 이 문의를 404 로 은닉하는 이유는 **'그 리소스의 존재 자체가 개인정보'** 이기 때문이다(`customerName`·`contact`·`body`). 상품에는 그런 성질이 없다 — `Product` 는 `name`·`code`·`price`·`stock`·`description` 을 담고, **그중 이름·가격·설명·이미지는 고객 스토어에 공개될 값이다**(`ProductCardPreview` 가 바로 그 공개 모습을 그린다). 상품 id 열거로 알아낼 수 있는 것은 이미 공개된 카탈로그다. 존재하지 않는 위험을 막으려고 404 로 은닉하면 **정당한 운영자가 '권한이 없다'와 '상품이 지워졌다'를 구분하지 못한다** — FS-041-EL-033 이 그 둘을 애써 갈라 놓았는데(404='목록으로'만 · 5xx='다시 시도'+'목록으로') 은닉이 그 구분을 무의미하게 만든다.

**다만 공개되지 않는 필드가 있다**: `variants[].stock`(재고)·`variants[].sku`·`pricing.taxable`·`points`(적립 정책)·`shipping.fee` 는 **경쟁사에 유용한 영업 정보**다. 그러나 그것은 **필드 수준 노출 문제**이지 리소스 존재 은닉 문제가 아니다 — 권한 없는 주체는 애초에 200 을 받지 못한다.

**결론**: EP-01~EP-05 전부 권한 부족 시 **403**. 404 는 오직 **'그 id 의 상품이 없다'** 는 뜻으로만 쓴다.

### 7.2 낙관적 동시성 토큰이 없다 — `version` 을 도입한다 【정합 판정】

**F3b 가 절반을 고쳤다는 사실을 정확히 적는다.**

`createStoreAdapter.update` 는 이제 **없는 id 를 409 로 막는다**(`crud.ts:219-221`). 그전에는 store 의 `map` 이 **없는 id 를 조용히 지나치고 성공을 반환**해(`_shared/store.ts:642-648`) 다른 관리자가 방금 지운 상품을 편집하면 '저장했습니다' 토스트가 뜨고 목록으로 돌아가지만 저장된 것은 아무것도 없었다 — **유령 저장(ghost saved)**. 그것은 해소됐고, 소비 화면인 `ProductFormPage` 가 `useCrudForm` 의 409 충돌 다이얼로그를 이미 갖고 있어 **화면 코드 0줄로 복구 경로가 열렸다**(FS-041-EL-034).

**그러나 그것은 '존재 여부' 기반이지 낙관적 동시성 토큰이 아니다.** `Product` 에 `version`/`updatedAt`/`ETag` 가 **없고**(`store.ts:111-137` 전수 확인) 어댑터가 `If-Match` 를 보내지 않는다. 따라서:

| 시나리오 | 현재 동작 |
|---|---|
| A 가 폼을 열고, B 가 상품을 **삭제**한 뒤, A 가 저장 | **409 → 충돌 다이얼로그** ✔ (해소됨) |
| A 가 폼을 열고, B 가 상품을 **수정**한 뒤, A 가 저장 | **둘 다 존재하므로 409 가 나지 않는다 → A 가 B 를 조용히 덮는다** ✕ **last-write-wins data loss** |

**두 번째 행이 EXC-04 가 막으려는 바로 그것이다.** 그리고 이 화면에서는 그것이 특히 아프다 — `PUT` 이 **전체 치환**이라(§7.4) A 가 덮는 것은 한 필드가 아니라 **상품 전체**(가격·재고·옵션·이미지·설명)다. 전시 토글(FS-041-EL-010.9)조차 `toProductInput(item)` 전체를 보내므로, **목록 스냅샷이 30초 낡은 상태에서 토글 하나를 누르면 그 사이의 모든 수정이 되돌아간다.**

**판정**: `Product` 에 **`version: number`**(또는 `updatedAt`)를 더하고 `PUT`/`DELETE` 가 `If-Match: <version>` 을 요구한다. 불일치면 **409 `CONFLICT`** + 응답에 서버 최신본을 실어 프론트가 diverge 한 필드를 보일 수 있게 한다.

**프론트 후속(A11)**: 토큰은 **어댑터 본문만으로 붙지 않는다.** `update(id, input, context)` 의 `input` 은 폼 값에서 나오고 버전은 **로드한 항목**에서 와야 하므로 `useCrudForm` 이 `detailQuery.data.version` 을 `context` 로 흘려야 한다 — `WriteContext`(`crud.ts:30-42`)에 자리를 하나 더 만드는 일이다(`idempotencyKey` 가 그 선례다). **연동 산정에 반드시 포함할 것.** 목록의 전시 토글도 같은 배선이 필요하다(`useCrudRowUpdate`).

### 7.3 상품코드(SKU) 전역 유일성 — 서버가 강제한다 【정합 판정】

`productSchema` 의 SKU 중복 검사는 **한 상품의 variants 안**에 갇혀 있다(`validation.ts:88-94` — `values.map(v => v.sku)` 는 그 상품의 조합들이다). **두 상품이 같은 `code` 를 가질 수 있고, 같은 `sku` 를 가질 수 있다.** 저장소도 막지 않는다(`addProduct` 는 그냥 append — `store.ts:634-640`).

**이것이 만드는 사고**: `code`/`sku` 는 **재고 집계·주문 매핑·물류 연동의 키**다. 두 상품이 `LMN-PAD-001` 을 공유하면 주문이 어느 상품의 재고를 깎아야 하는지 알 수 없다. 그리고 두 관리자가 같은 코드로 **동시에** 등록하면 프론트 검증이 있더라도(현재는 없다) 통과한다 — 유일성은 **원자적 제약**이라 클라이언트가 강제할 수 없다.

**판정**: 서버가 `code` 에 **유일 제약**을 걸고 위반 시 **409 `DUPLICATE_PRODUCT_CODE`** 를 낸다. `variants[].sku` 도 전역 유일해야 하는지는 **도메인 결정이 필요하다**(A01): 옵션 SKU 를 상품 접두로 파생시키는 현재 관례(`buildVariantMatrix` 의 `${code}-${suffix}`)에서는 `code` 가 유일하면 `sku` 도 대체로 유일해지지만, 사용자가 손으로 고칠 수 있으므로 **보장되지 않는다**.

**프론트 후속(A11)**: 409 는 FS-041-EL-034 충돌 다이얼로그로 떨어진다 — 문구는 서버가 정한다(`useCrudForm.ts:170-172` 가 `HttpError.message` 를 그대로 쓴다). 그러나 **'다른 사용자가 먼저 변경했습니다' 계열의 다이얼로그는 중복 코드에 맞지 않는 UX** 다('최신 내용 불러오기'가 해결책이 아니다). 코드 중복은 **422 + `error.fields: [{ name: 'code' }]`** 로 내려 `useCrudForm` 의 필드 매핑 경로(`:182-191`)를 태우는 것이 옳다 — 그러면 '상품코드' 입력에 인라인 오류가 붙고 포커스가 간다. **결론: `DUPLICATE_PRODUCT_CODE` 는 409 가 아니라 422 로 낸다.**

### 7.4 전체 치환 PUT 이 재고를 되살린다 — 재고를 계약에서 분리한다 【정합 판정】

**재고는 이 폼이 소유하지 않는 값이다.** `variants[].stock` 은 주문이 실시간으로 깎고 반품이 되돌린다(`products/returns/data-source.ts` 의 `applyStockOnComplete` 가 그 증거다 — 반품 완료가 재고를 건드린다). 그런데 상품 수정은 **전체 치환**이라 `ProductInput.variants` 전체를 보낸다.

**이것이 만드는 사고**: 관리자가 상품 폼을 열고(재고 12) 상세설명을 고치는 동안 고객이 3개를 산다(서버 재고 9). 관리자가 저장하면 **재고가 12 로 되돌아간다** — 팔린 3개가 되살아나 과판매(oversell)가 된다. 관리자는 재고를 건드린 적이 없다. §7.2 의 `version` 토큰이 붙어도 **관리자는 '최신 불러오기'를 누르고 다시 저장할 뿐** 같은 일이 반복된다(그동안 또 팔린다).

**판정**: 둘 중 하나로 계약을 바꾼다.

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `PUT /api/products/:id` 가 **`variants[].stock` 을 무시**한다(요청 값을 믿지 않는다 — BE-026 §4 의 '불변 필드 무시'와 같은 결). 재고 조정은 **별도 엔드포인트** `PATCH /api/products/:id/variants/:variantId/stock` `{ delta \| absolute, reason }` 로 분리하고 **감사 이력을 남긴다** | 과판매가 구조적으로 불가능해진다. 재고 조정에 사유·이력이 붙어 실사(實査)와 대조된다. **폼 코드는 그대로**(보내도 무시되므로) — 다만 화면의 재고 입력은 '표시 전용'이 되거나 그 엔드포인트를 부르도록 바뀌어야 한다 |
| **B (차선)** | `PUT` 이 재고를 받되 **`version` 불일치 시 409**(§7.2)로 막는다 | 토큰 하나로 끝나 싸다. 그러나 **관리자가 재고를 덮어쓰는 것 자체는 여전히 정당한 요청**이라 서버가 사고와 의도를 구분할 수 없다 — 재조회 후 재저장이 같은 사고를 반복한다 |

**같은 뿌리의 두 번째 사고**: 목록의 전시 토글(FS-041-EL-010.9)이 `toProductInput(item)` 전체를 보낸다. `item` 은 **30초 캐시된 목록 스냅샷**이다(`staleTime: 30_000`). 그 사이 누군가 가격을 고쳤다면 **토글 한 번이 가격을 되돌린다.** 안 A 를 채택하면 이 경로도 함께 좁혀야 한다 — 전시 토글은 `PATCH /api/products/:id` `{ displayed }` 여야 옳다.

### 7.5 이미지는 아직 업로드되지 않는다 — 알려진 빚이며 이 계약이 그것을 만들지 않는다 【범위 판정】

`coverImageUrl`/`imageUrls` 로 들어오는 값은 **`blob:…` 아니면 `''`** 뿐이다. `ImageUploadField` 가 아직 업로드하지 않고 `URL.createObjectURL(file)` 을 그대로 값으로 내며(`ImageUploadField.tsx:178`), 그 필드에 URL 을 손으로 칠 입력이 없기 때문이다.

`shared/crud/validation.ts:39-71` 이 이 사실과 그 결론을 길게 못박는다: **스키마가 http(s) 를 강제하면 등록 폼이 영영 제출되지 않고 수정 폼이 이미지를 두 번 다시 바꿀 수 없다** — '검증을 조이는 것은 고침이 아니라 막다른 길이다'. `blob:` 은 언마운트 시 revoke 되어 죽으므로 **저장하면 이미지가 깨진다. 그것을 아는 채로 통과시킨다.**

**판정**: **이것은 결함이 아니라 의도적으로 남긴 빚이다.** 이 문서는 `POST /api/uploads` 를 **만들지 않는다** — 심이 있으나(`shared/crud/validation.ts:57` · `ImageUploadField.tsx:11` · `ImageGalleryField.tsx:7`) 그 셋 다 **`packages/ui`/`shared/crud` 소유**이며 상품 화면의 data-source 에 없다. 업로드는 **앱 전역 계약**(모든 이미지 폼이 공유)이라 화면 단위 BE 문서가 소유할 대상이 아니다 — A63 이 별도 문서로 잡아야 한다.

**다만 이 계약이 정해야 할 것은 있다**: `POST /api/products` 가 `blob:` URL 을 받으면 **거절한다**(400 `VALIDATION_FAILED` — `coverImageUrl` 은 서버가 발급한 URL 이어야 한다). 그 순간 프론트는 제출 불가가 되므로, **업로드 이음매와 이 서버 검증은 같은 배치로 붙어야 한다.** 어느 한쪽만 붙이면 폼이 죽는다. 연동 순서: ① `POST /api/uploads` ② `ImageUploadField` 가 응답 URL 을 값으로 ③ `requiredImage` 를 `optionalHttpUrl` 규칙으로 조임 ④ 서버가 `blob:` 거절. **①~④ 를 한 배치로.**

### 7.6 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:
1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 필터·검색을 전부 클라이언트에서 한다. 상품은 **상한 없이 늘어나는 컬렉션**이다.
2. **목록이 상세 전문을 담는다.** `Product` 타입 하나를 목록·상세가 공유해 목록 응답에 `optionGroups`·`variants`(8,000개일 수 있다 — FS-041 §7 #19)·`imageUrls`·`description`(2,000자)이 실린다 — **목록 화면이 쓰지 않는 필드**다. 목록이 쓰는 것은 `name`·`code`·`categoryLabel`·`pricing`·`saleStatus`·`displayed`와 **`variants[].stock` 의 합**뿐이다.

**판정**: **`ProductSummary` / `Product` 를 분리**하고 EP-01 에 `categoryId`·`saleStatus`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ProductSummary` 는 `optionGroups`·`variants`·`imageUrls`·`description`·`tags`·`shipping`·`points` 를 빼고, **재고는 서버가 집계한 `totalStock: number` 로** 내린다(프론트의 `totalStock` 순수 함수가 하던 일 — §7.11).

**단 목록의 전시 토글(FS-041-EL-010.9)이 이 분리를 막는다** — 토글이 `toProductInput(item)` 전체를 보내려면 `item` 이 전문이어야 한다. §7.4 안 A(`PATCH { displayed }`)를 채택하면 그 의존이 사라진다. **두 판정은 함께 간다.**

**이관**: 이 변경은 **프론트 대공사**다 — `filterProducts`/`filterBySaleStatus`/`searchProducts` 가 서버로 올라가고, 페이지네이션 UI(FS-041 §7 #5)·`SeqCell` 오프셋·건수 배지 산출(FS-041-EL-002.4 — **현재는 '필터 이전 전체 집합'에서 세는데 그 집합이 더는 클라이언트에 없다** → 서버가 facet count 를 내려야 한다)이 함께 붙어야 한다. quality-bar IA-04 P0 가 이미 이 화면을 gap 으로 잡고 있으므로 **한 배치로 묶는 것이 옳다.** IA-13(URL state)은 **이미 충족**돼 있어(`useListState`) 그 절반은 공짜다. 그전까지 현 계약(전량)을 유지한다 — 픽스처 5건에서는 드러나지 않는다.

### 7.7 카테고리 선택지 — 경로가 BE-042 와 충돌한다 【연동 판정】

**두 개의 심이 같은 경로를 가리킨다**:

| 심 | 경로 | 응답 타입 | 소유 |
|---|---|---|---|
| `items/data-source.ts:29` | `GET /api/products/categories` | `readonly ProductCategory[]`(`id`·`label`) | **소비자** |
| `categories/data-source.ts:20` | `GET/POST /api/products/categories` | `readonly ProductCategoryUsage[]`(`id`·`label`·**`productCount`**) | **BE-042 정본** |

**판정**: **엔드포인트는 하나다.** `ProductCategoryUsage` 는 `ProductCategory` 의 **초집합**이므로(`store.ts:22-25` `interface ProductCategoryUsage extends ProductCategory`) BE-042-EP-01 의 응답 하나가 두 소비자를 모두 먹인다 — 상품 화면은 `productCount` 를 무시하면 된다. **이 문서는 새 엔드포인트를 만들지 않는다.**

**대안(경량 응답)을 채택하지 않는 이유**: `?fields=` 나 `/products/categories/options` 같은 두 번째 표현을 만들면 **캐시 키가 둘로 갈리고**(이미 갈려 있다 — 아래) 같은 데이터의 두 진실이 생긴다. 카테고리는 수십 개 규모라 `productCount` 를 함께 내리는 비용이 무시할 만하다.

**프론트 후속(A11) — 이 판정이 드러낸 실제 결함**: 두 화면이 **같은 서버 리소스를 서로 다른 react-query 키로** 캐시한다 — `[products, 'category-options']`(`ProductListPage.tsx:142` · `ProductFormPage.tsx:285`) vs `['product-categories', 'list']`(`crud.ts:244` `listKey('product-categories')`). 그래서 **FS-042 에서 카테고리를 추가·수정·삭제해도 상품 화면의 선택지가 무효화되지 않는다** — 새로고침 전에는 낡은 목록을 본다. 엔드포인트를 통합하는 순간 **키도 통합해야 한다**(FS-041 §7 #9). 이것은 백엔드 연결과 무관하게 지금 고칠 수 있다.

**추가**: `categoryId` 가 실재하는 카테고리인지 **프론트가 검증하지 않는다**(`validation.ts:41-43` 은 공백만 막는다). 서버가 **422 `CATEGORY_NOT_FOUND`** 로 막아야 한다 — 그러지 않으면 고아 `categoryId` 를 가진 상품이 생기고 `categoryLabel` 조인이 id 를 그대로 뱉는다(`store.ts:369` `?? categoryId`).

### 7.8 상품별 `shipping`·`points` 는 정책의 오버라이드다 — 계약을 합치지 않는다

`Product.shipping`·`Product.points` 는 전역 정책(BE-043 배송 · `/products/points` 적립금)과 **같은 모양의 다른 값**이다. `store.ts:85-97,157-169` 가 그 관계를 명시한다: 정책이 **기본값**(`DEFAULT_SHIPPING` 조건부무료 · `DEFAULT_POINTS` rate 1%)을 정하고, 상품이 필요할 때만 덮어쓴다.

**판정: 현 구조를 유지한다.** 상품 계약에 정책을 참조(`shippingPolicyId` 등)로 넣지 않는다 — 오버라이드는 **값의 복사**여야 한다. 그래야 ① 정책을 바꿔도 이미 등록된 상품의 배송비가 조용히 바뀌지 않고(운영자가 의도하지 않은 소급) ② 주문 시점의 배송비가 상품에 박혀 있어 **주문 이력이 정책 변경에 영향받지 않는다**.

**단 두 가지가 계약에 걸린다**:
1. **`DEFAULT_POINTS`/`DEFAULT_SHIPPING` 이 코드 상수다**(`store.ts:158-169`). 새 상품의 초기값이 전역 정책에서 와야 한다면 **등록 폼이 정책을 읽어야 한다** — 현재는 읽지 않는다(`ProductFormPage.tsx:139-150` 이 상수를 그대로 쓴다). 정책 화면이 기본 적립률을 2% 로 바꿔도 새 상품은 1% 로 시작한다. **이 불일치는 지금 실재한다.**
2. 주문 계산이 상품의 `shipping`·`points` 와 전역 정책 중 **무엇을 정본으로 보는지** 이 계약이 정하지 않는다 — 주문 도메인 소관이며 A01 이 확정해야 한다.

### 7.9 `operator` 는 조회만 — BE-026 과 반대 판정

BE-026(1:1 문의)은 `operator` 에게 쓰기를 연다('문의 응대는 운영자의 본업'). **이 도메인은 반대다.**

**근거**: 상품 등록·수정은 **가격·재고·적립금을 정하는 행위**다. 판매가 오타 하나가 곧 손실이고(129,000 → 12,900), 적립률 오타는 포인트 과지급이며, 삭제는 주문 이력의 참조를 끊는다(§7.14). BE-010(FAQ)이 `operator` 를 조회 전용으로 두는 이유 — '전체 고객에게 공표되는 콘텐츠라 신중해야 한다' — 가 여기 그대로, 더 강하게 적용된다. 상품은 **공표되는 콘텐츠이자 돈이다.**

**결론**: EP-01·EP-02 는 `admin` + `operator`. **EP-03·EP-04·EP-05 는 `admin` 만.**

**프론트 영향**: `operator` 로 로그인하면 '상품 등록' 버튼은 사라지지만(`canCreate`) **행 수정·행 삭제·일괄 삭제·폼 저장 버튼은 그대로 보인다**(FS-041 §7 #7). 즉 `operator` 가 상품을 편집하고 '저장' 을 눌러 **403 을 받은 뒤에야** 자기가 할 수 없는 일이었음을 안다 — 그것도 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 라는, **다시 시도해도 영원히 실패할 문구**로. 이 판정이 그 gap 을 P0 로 만든다(quality-bar EXC-03).

### 7.10 `saleStatus` 에 전이 제약이 없다 — 그대로 둔다

BE-026 의 `STATUS_FLOW` 와 달리 `ProductSaleStatus`(판매중·품절·판매중지)에는 **허용 전이 표가 없다.** 어느 상태에서 어느 상태로든 간다.

**판정: 현 상태를 유지한다.** 문의의 상태는 **책임 이관 흐름**(접수→배정→처리중→답변완료→종결)이라 되돌리면 이력이 거짓말이 되지만, 상품의 판매상태는 **현재 사실의 표기**다 — 품절이던 상품이 입고되면 판매중이 되고, 판매중지했다가 되살릴 수도 있다. 모든 전이가 정당하다.

**단 한 가지가 계약에 걸린다**: `saleStatus === 'sold_out'` 과 `totalStock === 0` 이 **독립 값**이다. 재고가 0인데 '판매중'일 수 있고, 재고가 100인데 '품절'일 수 있다(픽스처 `prd-4` 가 전자, 운영자의 수동 품절 처리가 후자). 이것이 의도인지 — 즉 `sold_out` 이 **자동 파생**이어야 하는지 **수동 표기**여야 하는지 — 를 이 계약이 정하지 않는다. 현재 코드는 **수동**이다(어디에도 자동 전이가 없다). `isLowStock` 이 `stopped` 만 제외하고 `sold_out` 은 제외하지 않는 것(`store.ts:235-239`)도 그 전제 위에 있다. **A01 확정 필요** — 자동 파생으로 정하면 §7.4 의 재고 분리와 같은 배치다.

### 7.11 파생값은 클라이언트가 계산한다 — 서버 계약에 넣지 않는다(단 목록 페이징이 그것을 뒤집는다)

최종가(`finalPrice`)·할인율(`discountRate`)·총 재고(`totalStock`)·재고 부족(`isLowStock`)·적립 포인트(`earnedPoints`)·SKU 매트릭스(`buildVariantMatrix`)는 **전부 프론트 순수 함수**다(`_shared/store.ts:189-287`). 서버는 원본 필드만 주고 파생은 하지 않는다.

**판정: 현 상태를 유지한다.** 이 계산들은 **표시·입력 보조 규칙**이며 서버 왕복이 필요 없다. 순수 함수라 테스트도 이미 있다(`products.test.ts` — `finalPrice`·`earnedPoints`·`totalStock`·`isLowStock`·`buildVariantMatrix` 전부 커버).

**단 세 가지가 계약에 걸린다**:
1. **§7.6 의 페이징이 도입되는 순간 `totalStock` 은 서버 계산이 된다** — 목록 응답에서 `variants` 가 빠지면 클라이언트가 합할 것이 없다. '재고 부족만 보기' 필터도 그때 서버 기능이 된다.
2. **최종가·적립 산식이 주문 계산과 일치해야 한다.** 지금은 프론트 상수(`LOW_STOCK_THRESHOLD = 10`)와 프론트 산식이 정본인데, 실제 결제 금액은 서버가 계산한다. **두 벌이 되는 순간 미리보기가 거짓말을 한다.** 산식의 정본은 서버여야 하고 프론트는 그 사본임을 명시해야 한다 — 현재 그 선언이 어디에도 없다.
3. `earnedPoints` 가 **할인 반영 최종가**를 기준으로 쓰는데(`store.ts:220-232`) 전역 정책의 '적립 기준'(실결제금액/주문금액)이 다른 값을 고를 수 있다 — 코드 주석도 그것을 '근사값'이라 부른다(`:224-226`). **주문 단위 계산이 붙으면 미리보기와 실제가 어긋난다.**

### 7.12 멱등키는 도달하지만 삭제에는 없다 【정합 판정】

**F3b 가 고친 것**: `WriteContext.idempotencyKey`(`crud.ts:30-42`)가 생겨 `useCrudForm` 이 만들던 키가 **실제로 어댑터에 도달한다**. 그전에는 키를 만들고 **반환값을 버렸다** — '재시도가 같은 키를 재사용한다'는 약속이 어디에서도 지켜지지 않았다(`crud.ts:20-23` 이 그 역사를 적는다). 키는 `mutationFn` **밖**(ref → variables)에 있어 react-query 재시도가 같은 키를 쓴다(`crud.ts:270-280`). 픽스처의 멱등 원장은 **적용에 성공한 뒤에만 기록**한다(`crud.ts:52-72`) — 실패한 첫 시도가 키를 태워 재시도를 영영 no-op 으로 만들지 않는다.

**남은 구멍 셋**:
1. **`DELETE` 에 키 자리가 없다.** `DeleteVars`(`crud.ts:319-322`)에 `idempotencyKey` 필드가 없고 `useCrudDelete` 가 `adapter.remove(id, { signal })` 만 부른다(`:330`). 삭제는 본질적으로 멱등이라(두 번 지워도 결과가 같다) 실무 위험은 낮으나, **두 번째 요청이 409 '이미 삭제된 항목입니다'로 돌아와 성공한 삭제를 실패로 보이게 할 수 있다.**
2. **전시 토글에 키가 없다.** `useCrudRowUpdate`(`useCrudRowUpdate.ts:45`)가 `{ id, input, signal }` 만 보낸다. 새 `run` 이 이전 요청을 abort 하므로(`:39`) 연타의 실무 위험은 낮다.
3. **삭제 확인 버튼에 동기 락이 없다.** `ConfirmDialog` 는 `busy` 로 확인 버튼을 잠그지만(`ConfirmDialog.tsx:151-152`) `busy` 는 리렌더 후에야 true 가 된다 — 그 사이의 두 번째 클릭이 두 번째 요청을 만든다. `useCrudForm` 이 그 틈을 `submitLockRef` 로 닫은 것과 대조된다(`useCrudForm.ts:96-103`).

**판정**: EP-03·EP-04 는 `Idempotency-Key` 를 **요구**하고 24시간 창 안에서 최초 응답을 재생한다. EP-05 는 키가 **없어도 처리**한다(멱등 DELETE) — 다만 **이미 삭제된 대상에 204 를 주는 것이 409 보다 낫다**(멱등의 정의). 그러면 위 구멍 1이 자동으로 닫힌다.

**후속(A11)**: 구멍 3(삭제 확인 동기 락)은 백엔드와 무관하게 지금 고칠 수 있다 — `useCrudList` 에 `submitLockRef` 를 더하면 된다.

### 7.13 일괄 삭제가 상한 없이 병렬 발사한다 【정합 판정】

`useCrudBulkDelete` 가 `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`)로 **선택 건수만큼 동시에** 요청을 쏜다. `settleAll` 은 `Promise.allSettled(items.map(run))`(`bulk.ts:19`) — **동시 요청 상한이 없다.**

**이것이 만드는 사고**: 200건을 선택해 삭제하면 200개 요청이 동시에 나간다. EP-05 의 레이트리밋(분당 60)이 그중 140개를 **429 로 거절**하고, 프론트는 그것을 '200건 중 140건을 삭제하지 못했습니다' 로 보고한다 — **실패 원인이 서버 장애가 아니라 자기 자신인데** 운영자는 알 수 없고, '다시 시도'가 같은 폭풍을 반복한다.

**판정**: 둘 중 하나.

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | **일괄 삭제 엔드포인트** `POST /api/products/bulk-delete` `{ ids[] }` → `{ deleted[], failed: [{ id, code, message }] }`. 레이트리밋은 요청 1건 기준 | 요청이 1개라 429 가 구조적으로 사라진다. **실패한 id 를 서버가 알려주므로** 프론트가 '실패한 것만 재시도'(quality-bar EXC-10 P1)를 할 수 있게 된다 — 현재는 건수만 안다. 어댑터 시그니처가 바뀐다(`CrudAdapter` 에 없는 함수) |
| **B (차선)** | 현 계약 유지 + 프론트가 동시 요청을 제한(예: 6개씩 배치) | 백엔드 무변경. 그러나 실패 id 를 여전히 모르고, 1,000건이면 여전히 느리며 진행률·취소도 별도로 만들어야 한다 |

**어느 안이든** 레이트리밋 응답은 `Retry-After` 를 실어야 하고, 프론트는 429 를 **다른 실패와 구분**해야 한다 — 현재는 전부 '잠시 후 다시 시도해 주세요' 다.

### 7.14 상품 삭제와 참조 무결성 — 주문이 참조하면 막는다 【정합 판정】

`removeProduct` 는 그냥 filter 다(`store.ts:650-652`) — **아무것도 확인하지 않는다.** 그런데 상품은 **참조되는 리소스**다: 주문 이력, 반품(`products/returns` 가 `fetchReturnProduct` 로 `GET /api/products/:id` 를 부른다 — EP-02 참조), 리뷰(`products/reviews`), 쿠폰의 적용 대상.

**이것이 만드는 사고**: 상품을 지우면 그것을 참조하던 반품 화면이 **404 '연결된 상품을 찾을 수 없습니다.'**(`returns/data-source.ts:203`)를 던진다 — 그 화면은 이미 그 경우를 그리고 있다. 그러나 **주문 이력이 상품명·가격을 상품 테이블에서 조인해 읽는다면 과거 주문의 상품명이 사라진다.**

**판정**: 카테고리가 '사용 중이면 삭제하지 않는다'(BE-042 §7.2)와 **같은 결로 상품도 막는다** — 주문·반품이 참조하는 상품은 **409 `PRODUCT_IN_USE`**. 참조가 없는 상품(등록만 하고 팔린 적 없는 것)만 물리 삭제한다.

**다만 더 나은 답이 있다**: 상품은 **판매중지(`saleStatus: 'stopped'`) + 숨김(`displayed: false`)** 이라는 **소프트 삭제 경로를 이미 갖고 있다.** 픽스처 `prd-5`(오브제 크로스백)가 정확히 그 상태다. 팔린 적 있는 상품에 필요한 것은 삭제가 아니라 **단종**이다. **A01 확정 필요**: 상품 삭제를 UI 에서 **제거하고**(단종으로 대체) 물리 삭제는 '등록 실수 되돌리기'(참조 0건)로만 남기는 것이 ERP 관례에 맞다. 그러면 FS-041 §7 #7 의 '삭제 게이팅 부재'도 함께 좁혀진다.

**주문 이력 보호는 별도로 필요하다**: 과거 주문은 상품명·가격을 **주문 시점 값으로 비정규화**해 들고 있어야 한다(`categoryLabel` 이 상품에 비정규화된 것과 같은 이유). 상품이 살아 있어도 이름·가격이 바뀌면 과거 주문서가 거짓말을 한다 — 주문 도메인 소관, A01 이관.

### 7.15 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **`Product.version` 도입 + `PUT`/`DELETE` 의 `If-Match`**(§7.2) — 어댑터 본문만으로 끝나지 않는다. `WriteContext` 에 자리를 더하고 `useCrudForm`·`useCrudRowUpdate` 가 로드한 버전을 흘려야 한다 | A63 · A11 (최우선) |
| 2 | **전체 치환 PUT 이 재고를 되살린다(§7.4 안 A: 재고를 `PATCH .../stock` 으로 분리 + `PUT` 이 `stock` 무시)** — 전시 토글도 `PATCH { displayed }` 로 좁힌다 | A63 · A11 (최우선) |
| 3 | **`code` 전역 유일성 — 서버 제약 + 422 `error.fields`**(§7.3). 409 가 아니라 422 로 내려 `useCrudForm` 의 필드 인라인 경로를 태운다 | A63 · A11 |
| 4 | **`categoryId` 존재 검증 — 422 `CATEGORY_NOT_FOUND`**(§7.7). 프론트에 이 검증이 없다 | A63 |
| 5 | **카테고리 선택지의 react-query 키가 두 벌이다**(`[products,'category-options']` vs `['product-categories','list']`) — 같은 서버 리소스를 두 캐시가 나눠 갖는다. **백엔드와 무관하게 지금 고칠 수 있다**(§7.7) | A11 change_request |
| 6 | **목록 페이징 + `ProductSummary` 분리 + 서버 facet count**(§7.6) — IA-04 P0 와 한 배치로. §7.4 안 A 가 선행돼야 전시 토글의 전문 의존이 사라진다 | A63 · A11 |
| 7 | **일괄 삭제 엔드포인트**(§7.13 안 A) — 429 폭풍 방지 + 실패 id 반환(EXC-10 P1 이 그것을 요구한다) | A63 · A11 |
| 8 | **상품 삭제 vs 단종**(§7.14) — 참조 무결성 409 `PRODUCT_IN_USE`, 그리고 '삭제를 UI 에서 빼고 단종으로 대체'가 옳은지 도메인 확정 | A01 · A63 |
| 9 | `POST /api/uploads` + `blob:` 서버 거절 + `requiredImage` 조이기 — **넷을 한 배치로**(§7.5). 어느 하나만 붙이면 폼이 죽는다 | A63 · A41/DS · A11 |
| 10 | **쓰기 게이팅이 '등록' 버튼 하나뿐이다**(§7.9) — `operator` 가 저장을 눌러 403 을 받고 '잠시 후 다시 시도해 주세요' 를 본다(quality-bar EXC-03 P0) | A11 change_request |
| 11 | **`DELETE` 멱등키 자리 부재 · 삭제 확인 동기 락 부재**(§7.12) — 후자는 백엔드와 무관하게 지금 고칠 수 있다 | A11 · A63 |
| 12 | **목록·삭제·토글이 `useCrudForm` 의 status 분기를 상속하지 못한다** — 403/409/422/429/500 이 전부 같은 문구로 뭉개진다(quality-bar EXC-06 P1) | A11 change_request |
| 13 | `sold_out` 이 자동 파생인가 수동 표기인가(§7.10) · `addPrice` 음수 허용 여부(FS-041 §7 #20) · `code`/`sku` 유일성 범위(§7.3) — **도메인 확정 필요** | A01 |
| 14 | **`DEFAULT_POINTS`/`DEFAULT_SHIPPING` 이 코드 상수라 전역 정책과 어긋난다**(§7.8) — 정책이 기본 적립률을 바꿔도 새 상품은 1% 로 시작한다. 등록 폼이 정책을 읽어야 한다 | A11 · A01 |
| 15 | **최종가·적립 산식의 정본이 어디인가**(§7.11) — 프론트 순수 함수와 서버 결제 계산이 두 벌이 되는 순간 미리보기가 거짓말을 한다 | A63 · A01 |
| 16 | 401 감지·리다이렉트는 구현됐으나 **미저장 폼 입력이 유실**된다(EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) · 오프라인 감지 없음(EXC-11 P1) | A11 · A40 |
| 17 | **`EP-02` 를 반품 화면도 소비한다**(`returns/data-source.ts:193`) — 응답 계약을 바꾸면 그 화면이 함께 깨진다. 변경 시 소비자 목록에 포함할 것 | A63 |

## 8. 자기 점검

- [x] FS-041 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 5건(EP-01~05) 매핑 완료. **카테고리 선택지(EP-06)는 심이 있으나 BE-042 가 소유하는 경로임을 확인하고 새 엔드포인트를 만들지 않았다**(§7.7)
- [x] **엔드포인트를 발명하지 않았다** — `items/data-source.ts:19,29` 두 줄의 심에서만 파생했다. §7 이 제안하는 신규 경로(`PATCH .../stock` · `POST .../bulk-delete` · `POST /api/uploads`)는 **전부 §7 판정 안의 제안**이며 §4 엔드포인트 명세에 넣지 않았다
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열 — BE-042 소유인 EP-06 은 행이 없음을 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **두 가지 고유 차이**(§7.1 403 vs 404 판정 반전 · §7.9 `operator` 조회 전용)를 근거와 함께 기술
- [x] 멱등성 판정 — 조회 GET 멱등 / 등록·수정은 `Idempotency-Key`(**키가 실제로 어댑터까지 도달함을 `crud.ts:288,310` 으로 확인**) / **삭제에는 키 자리가 없음을 §7.12 에 명시**
- [x] **보안 판정 포함** — §7.1 **【보안 판정】 403 vs 404 은닉 (회원·문의와 반대 결론, 근거 명시)**. 그 밖 정합 판정 6건(§7.2 동시성 토큰 · §7.3 코드 유일성 · §7.4 재고 되살리기 · §7.12 멱등 · §7.13 429 폭풍 · §7.14 참조 무결성)
- [x] **`createStoreAdapter` 가 준 것(404·409·멱등 원장)과 주지 않은 것(version/ETag 토큰)을 구분**했다 — '존재 여부' 기반이라 **동시 편집(둘 다 존재)은 여전히 last-write-wins** 임을 §7.2 표로 못박았다
- [x] `blob:` 이미지를 **'결함'이 아니라 '알려진 빚'** 으로 §7.5 에 기록하고, 이 문서가 `POST /api/uploads` 를 만들지 않는 이유(타 모듈 소유 · 앱 전역 계약)를 댔다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
</content>
