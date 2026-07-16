---
id: BE-042
title: "상품 카테고리 백엔드 기능 명세"
functionalSpec: FS-042
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-042. 상품 카테고리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-042 상품 카테고리 (`/products/categories`) |
| 범위 | 카테고리 목록 조회(**사용 중 상품 수 포함**), 카테고리 등록, 카테고리 이름 수정, 카테고리 삭제(**사용 중이면 차단**) |
| **범위 밖** | **카테고리 단건 조회** — 어댑터가 `fetchOne` 을 채우지만 **화면에 호출부가 0건이고 `// TODO(backend)` 주석도 `GET /:id` 를 적지 않는다**(§7.6 — 심 없음). **상품 CRUD** — BE-041 소관. **카테고리 순서·계층** — 도메인에 존재하지 않는다(`ProductCategory` = `id` + `label` 뿐)이며 도입 여부는 A01 확정 대상(FS-042 §7 #20). **상품의 분류 일괄 변경** — 이 화면에 그 경로가 없다(FS-042 §7 #6) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/products/categories/data-source.ts` (`productCategoryAdapter`) |
| 도메인 타입 | `apps/admin/src/pages/products/_shared/store.ts`(`ProductCategory` · `ProductCategoryUsage`) + `categories/types.ts`(`ProductCategoryInput` · 사용 여부 필터의 순수 규칙) — **카테고리 정본이 `_shared` 에 있는 이유**: 상품이 카테고리를 참조하고 카테고리 삭제가 상품에 달려 있어, 두 `data-source` 가 서로를 import 하면 순환이 된다(`store.ts:3-6`) |
| 검증 정본 | `apps/admin/src/pages/products/categories/validation.ts` (`productCategorySchema` = `requiredText('카테고리 이름', 40)`) + `_shared/store.ts:690-696` 의 삭제 차단 규칙 |

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 어댑터가 **공용 `createStoreAdapter`** 로 만들어진다 | `categories/data-source.ts:21-31` |
| 연동 심은 **한 줄뿐**이다(`GET /:id` 가 없다) | `categories/data-source.ts:20` |
| 목록 항목이 `ProductCategoryUsage`(= 카테고리 + `productCount`)다 | `categories/data-source.ts:21-22,26` → `_shared/store.ts:22-25,661-666` |
| **사용 중이면 저장소가 던진다** | `_shared/store.ts:690-696` |
| 그 throw 가 **status 없는 generic `Error`** 다 | `_shared/store.ts:693` `throw new Error('사용 중인 카테고리는 삭제할 수 없습니다.')` |
| 이름 수정이 **상품의 비정규화 라벨을 전파**한다 | `_shared/store.ts:679-688` (주석: '백엔드가 붙으면 서버가 정합성을 맡는다') |
| **이름 중복 검증이 없다** | `categories/validation.ts:7-9` (유일성 `.check` 부재) · `_shared/store.ts:674-677` (그냥 append) |
| **`ProductCategory` 에 `version`/`updatedAt` 이 없다** | `_shared/store.ts:17-25` (전수 확인) |
| `fetchOne` 호출부가 **화면에 0건**이다 | `ProductCategoriesPage.tsx:195` (`useCrudListQuery` 만) · `ProductCategoryFormModal.tsx:305` 경유로 행 데이터를 직접 받는다 |
| 모달이 **`useCrudForm` 을 쓰지 않는다** | `ProductCategoryFormModal.tsx:11,57-58` (`useCrudCreate`/`useCrudUpdate` 직접) |
| 사용량 집계가 **카테고리마다 상품 전량 스캔**이다 | `_shared/store.ts:661-666` → `:317-319` `countProductsUsingCategory` |
| **`GET /api/products/categories` 를 BE-041 도 소비한다** | `items/data-source.ts:29-36` `fetchProductCategoryOptions` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 카테고리 도메인 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회 계열(목록)만**. 등록·수정·삭제는 **403** — BE-041 §7.9 와 같은 판정이다(§7.8). 상품 도메인 읽기 권한 없는 관리자 → **컬렉션 403 / 개별 카테고리 403**(§7.5 — BE-041 §7.1 과 같은 결론).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기**: **일부 있다**. '카테고리 추가' 버튼만 `can(resource,'create')` 로 게이팅된다(`ProductCategoriesPage.tsx:181,252-258`). 행 수정·행 삭제·모달 저장은 게이팅되지 않는다(FS-042 §7 #5). **이 사실이 서버 책임을 바꾸지 않는다.**
- **권한 리소스가 `/products` 와 갈린다**: `/products/categories` 는 nav 잎(`nav-config.ts:147`)이고 `findCoveringLeaf` 가 **'자기를 감싸는 가장 긴 잎'** 을 고르므로(`:274-275` — '더 긴 잎이 더 구체적이다 — `/products/categories` 가 `/products` 를 이긴다') **`products` 와 `product-categories` 는 별개 권한 리소스**다. `covers()` 가 세그먼트 경계에서만 매칭해(`:255-257`) `/products` 가 `/products-archive` 를 삼키지 않는 것과 같은 규칙이다. **즉 상품 read 권한만 가진 역할은 이 화면에 들어오지 못한다** — 그것이 의도인지는 §7.9.

## 3. 데이터 계약 (`_shared/store.ts` · `categories/types.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `ProductCategory` | `id` · `label` | 선택지의 최소 형태. **BE-041 이 이것을 읽어 간다**(§7.6) |
| `ProductCategoryUsage` | `extends ProductCategory` + **`productCount`** | **목록 응답의 항목**. `productCount` 는 **서버 집계값**이며 저장 필드가 아니다(§7.7) |
| `ProductCategoryInput` | `{ name: string }` | 등록·수정 입력. **`id` 도 `productCount` 도 없다** — 전자는 서버 채번, 후자는 파생 |
| 상수 | `CATEGORY_NAME_MAX = 40` | `categories/types.ts:13` |

**검증 규칙 (`productCategorySchema` — 서버가 정본이어야 한다)**

| 필드 | 규칙 | 비고 |
|---|---|---|
| `name` | 공백만 금지 · trim 후 ≤40자 | `requiredText('카테고리 이름', 40)`. **유일성 검증이 없다**(§7.3) |

**삭제 차단 규칙 (서버가 정본)**: `countProductsUsingCategory(id) > 0` 이면 삭제하지 않는다. 프론트가 두 겹으로 흉내 낸다 — ① 버튼 잠금(`ProductCategoriesPage.tsx:161-167` — `disabled={inUse || deleting}`) ② 저장소 throw(`_shared/store.ts:690-696`). **①은 조회 시점 스냅샷 기반이라 경합에서 반드시 뚫린다** — 그것이 ②가 존재하는 이유이며, 서버 연동 시 **409 가 ②를 대체한다**(§7.2).

**사용 여부 필터 (프론트 순수 함수 — 서버가 내려주지 않는다)**: `filterCategoriesByUsage`(전체/사용 중/미사용) · `countCategoriesByUsage`(세 갈래 건수) — `categories/types.ts:46-61`. 서버는 `productCount` 만 주고 분류·집계는 클라이언트가 한다. **§7.7 의 페이징이 도입되면 이 판정이 뒤집힌다.**

## 4. 엔드포인트 명세

### BE-042-EP-01 · 카테고리 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-042-EL-002.1, EL-003, EL-005, EL-005.1, EL-005.2, EL-006, EL-007, EL-011, EL-016 |
| 메서드·경로 | `GET /api/products/categories` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.7) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 사용 여부 필터를 **클라이언트에서** 수행하므로(`filterCategoriesByUsage`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly ProductCategoryUsage[]`(= `{ id, label, productCount }[]`). **`productCount` 는 서버가 집계해 내린다** — 프론트는 그 값을 그대로 배지·필터·삭제 차단에 쓴다. 정렬은 **등록 순**(현재 저장소 배열 순서 — `listProductCategoryUsage` 에 정렬 함수가 없다)이며 정렬 변경 UI 도 없다. **서버 순서가 정본이어야 한다** — 그렇지 않으면 새로고침마다 목록이 재배열된다.

**에러**: 401 · 403 · 429 · 500 · 504.

> **이 엔드포인트는 BE-041 도 소비한다**: `items/data-source.ts:29` `// TODO(backend): GET /api/products/categories (폼·목록의 분류 선택지)` 가 **같은 경로**를 가리킨다. `ProductCategoryUsage` 는 `ProductCategory` 의 초집합이므로(`store.ts:22-25` `extends`) **응답 하나가 두 소비자를 모두 먹인다** — 상품 화면은 `productCount` 를 무시하면 된다. §7.6 이 이 판정과 그것이 드러낸 프론트 결함을 다룬다.

---

### BE-042-EP-02 · 카테고리 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-042-EL-004, EL-008, EL-008.1, EL-008.4(등록), EL-013 |
| 메서드·경로 | `POST /api/products/categories` |
| 권한 | `admin` 만(§7.8) |
| 멱등성 | **`Idempotency-Key` 로 멱등해야 한다 — 그러나 프론트가 키를 싣지 않는다**(§7.4) |
| 레이트리밋 | 분당 60회 |

**바디** — `{ name: string }`.

**서버 검증**
1. `name` — trim 후 공백만 금지 · ≤40자. 프론트 검증은 UX 다.
2. **`name` 유일성** — 프론트에 이 검증이 없다(§7.3). 중복이면 422.
3. **`id` 는 서버가 채번한다** — 요청에 있어도 무시. 현재 픽스처는 `prd-cat-<seq>`(`store.ts:676`)이나 그 형식은 계약이 아니다.

**응답 201/204**. 프론트 `create(input, context): Promise<void>` — 응답 본문을 읽지 않고 목록을 무효화한 뒤 모달을 닫는다. **id 를 쓰지 않는다.**

**에러**: 400 `VALIDATION_FAILED`(`error.fields: [{ name: 'name' }]`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **422 `DUPLICATE_CATEGORY_NAME`**(§7.3) · 429 · 500 · 504.

---

### BE-042-EP-03 · 카테고리 이름 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-042-EL-005.3, EL-008, EL-008.1, EL-008.4(수정), EL-013, EL-017 |
| 메서드·경로 | `PUT /api/products/categories/:id` |
| 권한 | `admin` 만(§7.8) |
| 멱등성 | 멱등(PUT). **`Idempotency-Key` 미탑재**(§7.4) |
| 레이트리밋 | 분당 60회 |

**바디** — `{ name: string }`.

**서버 검증** — EP-02 와 동일 + 아래.
4. **`name` 유일성은 자기 자신을 제외**하고 판정한다.
5. **낙관적 동시성** — §7.1.
6. **비정규화 라벨 전파** — §7.4.

**응답 200/204**.

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `CATEGORY_NOT_FOUND`** · **409 `CONFLICT`**(§7.1) · **422 `DUPLICATE_CATEGORY_NAME`** · 429 · 500 · 504.

---

### BE-042-EP-04 · 카테고리 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-042-EL-005.4, EL-009, EL-013, EL-015 |
| 메서드·경로 | `DELETE /api/products/categories/:id` |
| 권한 | `admin` 만(§7.8) |
| 멱등성 | 멱등(DELETE). **키 자리 없음**(§7.4) |
| 레이트리밋 | 분당 60회 |

**서버 검증**
7. **사용 중이면 삭제하지 않는다** — `productCount > 0` 이면 **409 `CATEGORY_IN_USE`**. 심이 이것을 명시한다: `data-source.ts:20` `… PUT/DELETE /api/products/categories/:id (**사용 중이면 409**)`. §7.2.

**응답 204**.

**에러**: 400(id 형식) · 401 · 403 `FORBIDDEN` · **404 `CATEGORY_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제됨 — `crud.ts:232-234`) · **409 `CATEGORY_IN_USE`**(§7.2) · 429 · 500 · 504.

---

### BE-042-EP-05 · 카테고리 단건 조회 — **심 없음 (미정)**

`createStoreAdapter` 가 `CrudAdapter` 인터페이스를 채우려 `getOne: getProductCategoryUsage` 를 요구해 `fetchOne` 이 존재한다(`categories/data-source.ts:27`). **그러나**:

- **화면에 호출부가 0건이다** — 수정 모달이 `useCrudItem` 을 쓰지 않고 **행 데이터를 그대로 받는다**(`ProductCategoriesPage.tsx:305` `setModal({ kind: 'edit', category: target })` → `ProductCategoryFormModal` 의 `editing` prop).
- **`// TODO(backend)` 주석이 `GET /:id` 를 적지 않는다** — `data-source.ts:20` 은 `GET/POST /api/products/categories · PUT/DELETE /api/products/categories/:id` 뿐이다.

- 엔드포인트: **미정.** 이 문서는 소비자도 심도 없는 경로를 만들지 않는다.
- 판정: §7.6.

## 5. 예외 매트릭스

> EP-05 는 **심도 소비자도 없어 계약이 존재하지 않으므로** 이 매트릭스에 행이 없다(§7.6). 아래 4행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(사용 여부 필터가 클라이언트) | 401 → 전역 인터셉터가 재인증으로. 화면은 FS-042-EL-011 배너 | **403** 컬렉션 — 카테고리 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1). 상품과 같은 판정(§7.5) | N/A — 0건이면 200 빈 배열 → FS-042-EL-007 빈 상태(2분기) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-042-EL-011. **툴바의 '전체 0개' 가 배너와 함께 남는다**(FS-042 §7 #13) | 5초 → 504 → FS-042-EL-011 |
| EP-02 등록 | 400 `VALIDATION_FAILED` — `name` 공백만·40자 초과. `error.fields` 로 내려보낸다. **프론트에 필드 매핑 경로가 없어**(모달이 `useCrudForm` 미사용) FS-042-EL-008.2 배너로 뭉개진다(§7.4) | 401 → 전역 인터셉터. 미저장 모달 입력은 유실되나 이름 한 줄이라 손실이 작다 | **403 `FORBIDDEN`** — `operator` 는 등록할 수 없다(§7.8). 컬렉션 쓰기라 은닉할 개별 리소스가 없다. **프론트는 `canCreate` 로 버튼을 숨기지만 그것은 UX 다** | N/A — 생성이라 대상이 없다 | N/A — 생성에 충돌 대상이 없다. **중복 이름은 409 가 아니라 422 로 낸다**(§7.3 — 409 의 UX 는 '최신 불러오기'인데 그것이 해결책이 아니다) | **422 `DUPLICATE_CATEGORY_NAME`** — 프론트에 이 검증이 없다(§7.3). **연타가 같은 이름을 두 번 보내는 경로가 실재한다**(§7.4 — 동기 락·멱등키 부재) | 429 분당 60 + `Retry-After` → FS-042-EL-008.2 배너로 뭉개진다 | 500 + `traceId` → FS-042-EL-008.2 배너, **입력 보존**. **reference code 를 보이지 않는다**(`useCrudForm` 미사용 — §7.4) | 5초 → 504 → FS-042-EL-008.2 배너 |
| EP-03 수정 | 400 `VALIDATION_FAILED` — 위와 동일 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 수정할 수 없다. 읽기 권한이 있는 주체에게는 403 을 준다(존재를 이미 안다 — BE-003 §3.2) | **404 `CATEGORY_NOT_FOUND`** — 존재한 적 없는 id. 어댑터는 **`if (!exists(id)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`**(`crud.ts:219-221`)로 **409 를 준다** — 픽스처는 '없음'과 '먼저 삭제됨'을 구분할 수 없기 때문이다. HTTP 연동 시 **서버는 그 둘을 구분한다** | **409 `CONFLICT`** — ① 낙관적 동시성 토큰 불일치(§7.1 — **현재 토큰이 없어 발생할 수 없다**) ② 대상 부재(어댑터가 이미 이것을 낸다 — 유령 저장 해소). **프론트에 409 를 해소할 UI 가 없다** — 모달이 `useCrudForm` 의 conflict 다이얼로그를 쓰지 않아 generic 배너로 뭉개진다(§7.4) | **422 `DUPLICATE_CATEGORY_NAME`** — 자기 자신 제외 유일성(§7.3) | 429 분당 60 | 500 + `traceId` → FS-042-EL-008.2 배너, 입력 보존 | 5초 → 504 → 위와 동일 |
| EP-04 삭제 | 400 — id 형식 위반 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 삭제할 수 없다. 읽기 권한이 있으므로 404 로 숨기지 않는다 | **404 `CATEGORY_NOT_FOUND`** — 어댑터는 같은 자리에서 **409 '이미 삭제된 항목입니다.'**(`crud.ts:232-234`)를 준다. 서버는 404(존재한 적 없음)와 409(먼저 삭제됨)를 구분한다 | **409 `CONFLICT`**(이미 삭제됨) · **409 `CATEGORY_IN_USE`**(§7.2 — 심이 명시한 코드). **프론트가 둘을 구분하지 않고 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉갠다 — `CATEGORY_IN_USE` 에 그 문구는 거짓 안내다**(영원히 실패한다 — §7.2) | N/A — 삭제에 전제 상태가 없다. 참조 무결성 위반은 **409** 로 낸다(§7.2). 상품 삭제(BE-041 §7.14)와 같은 결 | 429 분당 60 + `Retry-After`. **일괄 삭제가 없어**(FS-042 §2) 폭풍이 나지 않는다 — BE-041 §7.13 과 대조 | 500 + `traceId` → FS-042-EL-009 다이얼로그 배너 | 5초 → 504 → 다이얼로그 배너 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `productCategoryAdapter.fetchAll(signal)` | `GET /api/products/categories` | EP-01 | `readonly ProductCategoryUsage[]` | O |
| `productCategoryAdapter.create(input, context)` | `POST /api/products/categories` | EP-02 | `void` | **△ — `Idempotency-Key` 헤더 배선 필요.** 단 **키가 도달하지 않는다** — 모달이 `useCrudCreate` 를 직접 쓰며 `idempotencyKey` 를 넘기지 않는다(§7.4) |
| `productCategoryAdapter.update(id, input, context)` | `PUT /api/products/categories/:id` | EP-03 | `void` | **△ — `If-Match`/`version` 없음**(§7.1) · 멱등키 미도달(§7.4) |
| `productCategoryAdapter.remove(id, context)` | `DELETE /api/products/categories/:id (사용 중이면 409)` | EP-04 | `void` | **△ — 409 를 화면이 분기하지 않는다**(§7.2). `DeleteVars` 에 키 필드가 없다(`crud.ts:319-322`) |
| `productCategoryAdapter.fetchOne(id, signal)` | **없음** | **EP-05 심 없음(미정)** | `ProductCategoryUsage` | **X — 화면에 호출부가 0건이다**(§7.6) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

- **쓰기(POST · PUT · DELETE)에 `X-CSRF-Token` 헤더**.
- **`POST`/`PUT` 에 `Idempotency-Key: <context.idempotencyKey>` 헤더** — 자리는 이미 있다(`WriteContext` — `crud.ts:30-42`). **그러나 이 화면은 키를 만들지 않는다** — 어댑터 본문이 아니라 **호출부(모달)가 바뀌어야 한다**(§7.4).
- **`PUT` 에 `If-Match: <version>` 헤더** — `ProductCategory` 에 그 필드가 없으므로 **타입 변경이 선행된다**(§7.1).
- **404 → `HttpError(404, …)` · 409 → `HttpError(409, …)` · 422 → `HttpError(422, …, { violations })` 변환** — `createStoreAdapter` 가 이미 404·409 를 그렇게 한다. **HTTP 연동이 그 계약을 깨지 않는 것이 핵심이다.** 다만 **이 화면은 그 status 를 읽지 않으므로**(§7.4) 변환만으로는 UX 가 개선되지 않는다 — 화면 코드가 함께 바뀌어야 한다.
- **`CATEGORY_IN_USE` 는 `error.code` 로 구분 가능해야 한다** — 409 안에서도 '이미 삭제됨'과 '사용 중'은 **복구 수단이 정반대**다(전자는 새로고침, 후자는 상품 분류 변경). `HttpError` 는 현재 `status` 와 `message` 만 실으므로(`http-error.ts:48-59`) **`code` 를 실을 자리가 필요하다**(§7.2).

## 7. 핵심 판정

### 7.1 낙관적 동시성 토큰이 없다 — `version` 을 도입한다 【정합 판정】

**F3b 가 절반을 고쳤다는 사실을 정확히 적는다.**

`createStoreAdapter.update`/`remove` 는 이제 **없는 id 를 409 로 막는다**(`crud.ts:219-221,232-234`). 그전에는 store 의 `map`/`filter` 가 **없는 id 를 조용히 지나치고 성공을 반환**해(`_shared/store.ts:679-696`) '저장했습니다' 토스트가 뜨는 **유령 저장(ghost saved)** 이었다. 그것은 해소됐다.

**그러나 그것은 '존재 여부' 기반이지 낙관적 동시성 토큰이 아니다.** `ProductCategory` 에 `version`/`updatedAt`/`ETag` 가 **없고**(`store.ts:17-25` 전수 확인) 어댑터가 `If-Match` 를 보내지 않는다.

| 시나리오 | 현재 동작 |
|---|---|
| A 가 모달을 열고, B 가 카테고리를 **삭제**한 뒤, A 가 저장 | **409 가 발생한다** — 어댑터가 던진다 ✔. **그러나 화면이 그것을 generic '저장하지 못했습니다' 로 뭉갠다**(§7.4) ✕ |
| A 가 모달을 열고, B 가 이름을 **수정**한 뒤, A 가 저장 | **둘 다 존재하므로 409 가 나지 않는다 → A 가 B 를 조용히 덮는다** ✕ **last-write-wins** |

**이 화면에서는 위험이 상품(BE-041 §7.2)보다 작다** — 덮이는 값이 이름 한 줄이고, 수정 모달이 **행 데이터를 그대로 쓰므로**(상세를 재조회하지 않는다 — FS-042 §7 #14) 애초에 30초 낡은 값을 편집한다. 그러나 그 낡음이 바로 문제다: 목록이 stale 인 채로 열린 모달은 **자기가 무엇을 덮는지 모른다.**

**판정**: `ProductCategoryUsage` 의 기저 `ProductCategory` 에 **`version: number`**(또는 `updatedAt`)를 더하고 `PUT`/`DELETE` 가 `If-Match: <version>` 을 요구한다. 불일치면 **409 `CONFLICT`** + 응답에 서버 최신본을 싣는다.

**프론트 후속(A11)**: 토큰은 어댑터 본문만으로 붙지 않는다 — 모달이 `editing.version` 을 `context` 로 흘려야 하고, **그전에 409 를 읽는 코드가 있어야 한다**(§7.4). 순서: ① 모달을 `useCrudForm` 으로 이관(또는 그 conflict 경로를 직접 배선) ② `version` 추가 ③ `If-Match`. **①이 없으면 ②③은 보이지 않는 개선이다.**

### 7.2 사용 중 삭제 차단 — 409 `CATEGORY_IN_USE` 이고, 지금의 문구는 거짓말이다 【정합 판정】

**심이 이 계약을 명시한다**: `data-source.ts:20` `// TODO(backend): … PUT/DELETE /api/products/categories/:id (**사용 중이면 409**)`.

**현재 프론트는 두 겹으로 막는다**:
1. **버튼 잠금** — `disabled={inUse || deleting}`(`ProductCategoriesPage.tsx:167`), 접근 이름과 `title` 이 이유를 말한다(`:162-165`). **UX 이며 강제가 아니다.**
2. **저장소 throw** — `removeProductCategory`(`_shared/store.ts:690-696`)가 `countProductsUsingCategory(id, products) > 0` 이면 `throw new Error('사용 중인 카테고리는 삭제할 수 없습니다.')`.

**①은 경합에서 반드시 뚫린다.** `productCount` 는 **조회 시점 스냅샷**(`staleTime` 30초)이라, A 가 '미사용' 배지를 보는 동안 B 가 그 카테고리로 상품을 등록하면 A 의 삭제 버튼은 여전히 열려 있다. 그때 ②가 받는다 — **그것이 이 이중 방어의 존재 이유다.**

**그런데 ②의 실패가 거짓 안내로 보인다.** `store.ts:693` 의 throw 는 **status 없는 generic `Error`** 이고, 화면의 `onError`(`ProductCategoriesPage.tsx:237-240`)는 `isAbort` 만 보고 나머지를 **'삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'** 로 뭉갠다. **'잠시 후 다시 시도'해도 그 카테고리는 영원히 지워지지 않는다** — 상품의 분류를 바꾸기 전에는. 운영자는 재시도를 반복하다 포기한다. **저장소가 정확한 문구를 알고 있는데 화면이 그것을 버린다.**

**판정**: EP-04 는 사용 중이면 **409 `CATEGORY_IN_USE`** + `error.message` 에 **N 을 포함한 구체 문구**('12개 상품이 이 카테고리를 사용 중입니다. 먼저 그 상품들의 분류를 바꿔 주세요.')를 낸다.

**그리고 `HttpError` 에 `code` 를 실을 자리가 필요하다**(§6.1). 409 안에서 '이미 삭제됨'과 '사용 중'은 **복구 수단이 정반대**다:

| `error.code` | 뜻 | 복구 |
|---|---|---|
| `CONFLICT` | 다른 관리자가 먼저 지웠다 | **새로고침** — 이미 원하는 상태다 |
| `CATEGORY_IN_USE` | 상품이 참조 중이다 | **상품의 분류를 먼저 바꾼다** — 재시도는 무의미 |

`status` 만으로는 이 둘을 가를 수 없다. `HttpError`(`http-error.ts:48-59`)가 `status`·`message`·`violations`·`reference` 를 싣지만 **`code` 는 싣지 않는다** — BE-003 §2 의 봉투가 `error.code` 를 '프론트 분기의 유일한 근거' 라고 못박는데 **그것을 받을 타입이 없다.** A11·A40 이관.

**FS-042 §7 #6 과 함께 가야 한다**: 옳은 UX 는 문구만이 아니라 **경로**다. 사용량 배지('12개 상품')를 `/products?category=<id>` 링크로 만들면 운영자가 한 번의 클릭으로 그 상품들에 닿는다 — **그 URL 은 이미 실재한다**(FS-041-EL-017 이 카테고리 필터를 URL 로 소유한다). 백엔드와 무관하게 지금 할 수 있다.

### 7.3 카테고리 이름 유일성 — 서버가 강제하고, 409 가 아니라 422 로 낸다 【정합 판정】

`productCategorySchema`(`validation.ts:7-9`)가 `requiredText` 뿐이고 저장소도 그냥 append 한다(`store.ts:674-677`). **'아우터' 를 두 번 만들 수 있다.**

**이것이 만드는 사고**: 상품 폼의 카테고리 select(FS-041-EL-023.4)에 **같은 이름이 두 개** 뜬다 — 운영자는 어느 것을 골라야 할지 알 수 없고, 그 선택이 목록 필터·집계를 갈라놓는다('아우터 7' 과 '아우터 5' 가 나란히 보인다). 게다가 **§7.4 의 동기 락·멱등키 부재로 연타 하나가 정확히 이 사고를 만든다** — 같은 이름의 요청이 두 번 나가고 둘 다 성공한다.

**판정**: 서버가 `name` 에 **유일 제약**(trim + 대소문자·공백 정규화 기준은 A01 확정)을 걸고 위반 시 **422 `DUPLICATE_CATEGORY_NAME`** 를 낸다.

**왜 409 가 아닌가**: 409 의 UX 는 '다른 사용자가 먼저 변경했다 → 최신을 불러올까?' 인데, **중복 이름에 '최신 불러오기'는 해결책이 아니다.** 사용자가 할 일은 **다른 이름을 치는 것**이므로 **그 입력에 인라인 오류**가 붙어야 한다 — 그것이 422 + `error.fields: [{ name: 'name', code: 'DUPLICATE', message: '이미 있는 카테고리 이름입니다.' }]` 다. BE-041 §7.3 이 상품코드 중복에 내린 것과 같은 판정이다.

**프론트 후속(A11)**: 422 필드 매핑 경로가 **이 화면에 없다** — `useCrudForm.ts:182-191` 이 `cause.violations` 를 RHF `setError` 로 꽂는데 모달이 그 훅을 쓰지 않는다(§7.4). 서버가 422 를 정확히 내려도 화면은 generic 배너로 뭉갠다.

### 7.4 이 화면이 프레임워크의 절반을 상속하지 못한다 【연동 판정】

**이 판정이 위 셋(§7.1·§7.2·§7.3)의 프론트 측 공통 원인이다.**

`ProductCategoryFormModal` 은 `useCrudForm` 을 쓰지 않고 `useForm` + `useCrudCreate`/`useCrudUpdate` 를 **직접** 조립한다(`:47-58,72-95`). 목록도 `useCrudList` 가 아니라 `useCrudListQuery`/`useCrudDelete` 를 직접 쓴다(`ProductCategoriesPage.tsx:195-199`). 그 결과 **`useCrudForm`/`useCrudList` 가 제공하는 다섯 장치를 상속하지 못했다**:

| 장치 | 정본 | 이 화면 |
|---|---|---|
| **status 분기**(404 · 409 · 422+fields · 그 밖) | `useCrudForm.ts:159-196` | **없다** — `isAbort` 만 보고 전부 generic 배너(`ProductCategoryFormModal.tsx:78-81`) |
| **conflict 다이얼로그**(입력 보존 + 최신 불러오기/닫기) | `useCrudForm.ts:166-178` | **없다** — 409 가 generic 배너로 뭉개진다(§7.1) |
| **422 필드 매핑 + 포커스** | `useCrudForm.ts:182-191` | **없다**(§7.3) |
| **동기 제출 락(`submitLockRef`)** | `useCrudForm.ts:103,201-202` | **없다** — RHF `handleSubmit` 이 비동기라(`:108`) 연타 창이 열려 있다 |
| **제출 시도 단위 멱등키** | `useCrudForm.ts:118-123` → variables → `crud.ts:288` | **없다** — `create.mutate({ input, signal })`(`:92`)에 키가 없다 |
| **행 단위 `deletingId`** | `useCrudList.tsx:192` | **없다** — `deleting` 이 화면 단위라 삭제 중 모든 행이 잠긴다(FS-042 §7 #15) |
| **`onSuccess` 의 `aborted` 가드** | `useCrudForm.ts:218` · `useCrudList.tsx:105` | **없다** — 취소된 요청이 완료되면 닫힌 모달의 성공 토스트가 뜬다(FS-042 §7 #18) |
| **reference code(5xx)** | `useCrudForm.ts:195` → `FormFeedback.tsx:44` | **없다** — 고정 문구뿐 |

**마지막 두 줄(락 + 멱등키)이 §7.3 과 만나 실제 사고가 된다**: 연타 → 요청 2건 → 유일 제약이 없으므로 둘 다 성공 → **같은 이름의 카테고리 2개**. 유일 제약이 생겨도(§7.3) 멱등키가 없으면 **두 번째 요청이 422 를 받아** 성공한 등록이 실패로 보인다.

**판정**: 이 문서는 **계약을 그에 맞춰 낮추지 않는다.** 서버는 `Idempotency-Key`(EP-02·EP-03)를 **요구**하고 422 `error.fields` 를 정확히 내린다. **프론트가 그것을 받도록 바뀌어야 한다** — 그 작업의 형태는 둘 중 하나다:

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | 모달을 `useCrudForm` 위로 이관한다 | 여덟 장치를 한 번에 얻는다. **그러나 `useCrudForm` 은 `useParams`/`useNavigate` 에 묶여 있다**(`:74,76,223` — 라우트 폼 전제) — 모달에 그대로 쓸 수 없다. **훅을 라우트 비의존 코어와 라우트 어댑터로 쪼개는 선행 작업**이 필요하다 |
| **B (차선)** | 모달에 락·키·status 분기를 손으로 더한다 | 싸다. 그러나 **`useCrudForm` 과 두 벌이 되어** 다음 계약 변경(예: `If-Match`)이 두 곳을 고치게 한다 — 지금 이 화면이 겪는 문제가 그것이다 |

**A 를 권한다.** 같은 모양의 모달이 앱에 여럿이다(`PortfolioCategoryFormModal` · `RoleFormModal` · `LogoFormModal` · `CreateGroupModal` — quality-bar FEEDBACK-06 의 appliesTo 가 그 목록이다). **한 화면의 문제가 아니다.**

**해소된 것도 정확히 적는다**: FEEDBACK-06(모달 4경로 dirty 가드)은 **이 화면이 충족한다** — `useModalDirtyGuard(isDirty && !saving, onClose)` 를 `Modal.onClose` 와 취소 버튼에 **둘 다** 넘겨(`:65,104,113`) Esc·딤·×·취소를 한 번에 덮고, 파기 확인을 모달 **밖**에 렌더한다(`:154` — 안에 두면 포커스 트랩이 가둔다). 그 계약은 상속했다.

### 7.5 카테고리도 403 으로 거절한다 — 404 로 은닉하지 않는다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용하면 **BE-041 §7.1 과 같은 결론**이 나온다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/products/categories` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 카테고리 리소스의 존재는 개인정보가 아니다** → `PUT`/`DELETE /api/products/categories/:id` 권한 부족 시에도 **403 `FORBIDDEN`**.

**근거**: 회원(BE-003 §3.2)·문의(BE-026 §7.6)를 404 로 은닉하는 이유는 **'그 리소스의 존재 자체가 개인정보'** 이기 때문이다. 카테고리는 `id` 와 `label` 뿐이고 **그 label 은 고객 스토어의 분류 메뉴에 그대로 공개된다** — 은닉할 것이 없다. 카테고리 id 열거로 알아낼 수 있는 것은 이미 공개된 분류 체계다.

**`productCount` 는 공개 값이 아니다** — '이 카테고리에 12개 상품' 은 카탈로그 규모를 드러내는 영업 정보다. 그러나 그것은 **필드 수준 노출**이지 리소스 존재 은닉 문제가 아니다 — 권한 없는 주체는 애초에 200 을 받지 못한다.

**결론**: EP-01~EP-04 전부 권한 부족 시 **403**. 404 는 오직 '그 id 의 카테고리가 없다' 는 뜻으로만 쓴다.

### 7.6 단건 조회 — 심도 소비자도 없다 【범위 판정】

**F3b/통합 코드로 재확인한 사실**:
- `productCategoryAdapter.fetchOne` 이 **존재한다** — `createStoreAdapter` 의 `StoreAdapterSpec` 이 `getOne` 을 요구하고(`crud.ts:149-157`) `data-source.ts:27` 이 `getOne: getProductCategoryUsage` 를 채운다.
- **그러나 화면에 호출부가 0건이다** — 목록은 `useCrudListQuery`(`ProductCategoriesPage.tsx:195`), 수정 모달은 **행 데이터를 그대로 받는다**(`:305` → `ProductCategoryFormModal` 의 `editing` prop). `useCrudItem` 을 부르는 곳이 이 화면에 없다.
- **`// TODO(backend)` 주석이 `GET /:id` 를 적지 않는다** — `data-source.ts:20` 은 `GET/POST /api/products/categories · PUT/DELETE /api/products/categories/:id` 뿐이다.

**판정**: `GET /api/products/categories/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **이 화면이 그 조회를 필요로 하지 않는다**는 사실의 반영이다 — 카테고리는 `label` 하나뿐이라 목록 응답이 곧 상세다. `fetchOne` 은 **`CrudAdapter` 인터페이스를 채우기 위한 구현**이며, BE-026 §7.7 이 `ticketAdapter.create`/`remove` 를 '자리만 채운 거절 구현' 으로 판정한 것과 같은 결이다(다만 여기는 거절이 아니라 동작하는 구현이라는 차이가 있다).

**단 그것이 무해하지는 않다**: 수정 모달이 **30초 낡을 수 있는 목록 스냅샷을 편집한다**(FS-042 §7 #14). §7.1 의 `version` 토큰이 그 위험을 막지만, **토큰이 없는 지금은 낡은 값이 최신을 덮는다.** `fetchOne` 을 쓰지 않는 것이 옳은 선택인지는 §7.1 이관과 함께 재검토한다.

### 7.7 목록이 전량을 내려주고 사용량이 O(카테고리 × 상품)이다

**현재 계약의 두 문제**:
1. **페이징이 없다.** `fetchAll(signal)` 이 전량을 반환하고 프론트가 사용 여부 필터를 클라이언트에서 한다. 카테고리는 **운영자가 만드는 만큼 늘어난다** — 상품(BE-041 §7.6)만큼 무한하지는 않지만 상한도 없다. 픽스처는 5건이다.
2. **`productCount` 집계가 O(카테고리 × 상품)이다.** `listProductCategoryUsage()`(`store.ts:661-666`)가 카테고리마다 `countProductsUsingCategory` 를 부르고, 그 함수가 **상품 전량을 filter** 한다(`:317-319`). 카테고리 50 × 상품 10,000 = **50만 회 비교**가 매 조회마다 일어난다.

**판정**:
- **집계는 서버가 한 번의 GROUP BY 로 한다.** `productCount` 는 저장 필드가 아니라 **조회 시점 집계값**이며(§3), 그 계산 방식은 서버 구현의 자유다 — 이 계약이 정하는 것은 '응답에 정확한 `productCount` 가 있다' 뿐이다. 픽스처의 O(n×m)은 **연동 시 사라진다.**
- **페이징은 도입하지 않는다.** 카테고리는 **좌측 필터의 선택지**로도 쓰이는 목록이라(FS-041-EL-002.2) 전량이 한 번에 필요하다. 페이징을 넣으면 상품 화면의 필터가 '1페이지의 카테고리만' 보이게 된다. **상한을 두는 것이 옳다** — 예: 200개. 넘으면 등록을 422 로 막는다. 상한값은 A01 확정.

**다만 FS-042 §7 #4(페이지네이션 부재)는 여전히 IA-04 gap 이다** — quality-bar 는 'page size 초과 가능 시' 를 요구하고 카테고리는 그 조건에 닿을 수 있다. **위 판정은 '전량 응답이 옳다' 는 것이지 '화면에 200행을 한 번에 그려도 된다' 는 뜻이 아니다.** 목록 표현(가상화·클라이언트 페이징·`<ul>` → `CrudTable` 이관)은 프론트 결정이며 이 계약과 무관하게 진행할 수 있다.

### 7.8 `operator` 는 조회만 — BE-041 과 같은 판정

**근거**: 카테고리는 **상품의 분류 체계**다. 이름을 바꾸면 **그 카테고리를 쓰는 모든 상품의 표시가 바뀌고**(§7.4 라벨 전파), 지우면 상품이 고아가 된다(그래서 막는다 — §7.2). 즉 카테고리 쓰기는 **상품 다수를 한 번에 건드리는 행위**다 — 상품 하나를 고치는 것(BE-041 §7.9 가 `admin` 만으로 잠근 것)보다 **영향 범위가 넓다.**

**결론**: EP-01 은 `admin` + `operator`. **EP-02·EP-03·EP-04 는 `admin` 만.**

**프론트 영향**: `operator` 로 로그인하면 '카테고리 추가' 버튼은 사라지지만(`canCreate`) **행의 연필·휴지통은 그대로 보인다**(FS-042 §7 #5). `operator` 가 이름을 고치고 '저장' 을 눌러 **403 을 받은 뒤에야** 자기가 할 수 없는 일이었음을 안다 — 그것도 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 라는 거짓 문구로(§7.4). quality-bar EXC-03 P0.

### 7.9 권한 리소스가 `/products` 와 갈린다 — 그것이 의도인가 【범위 판정】

`findCoveringLeaf` 의 '가장 긴 잎' 규칙(`nav-config.ts:269-279`)에 따라 **`/products/categories` 는 `/products` 와 별개 권한 리소스**다(§2). 코드 주석이 이 사례를 **명시적으로 예로 든다**: `route-resource.ts:10-12` — `/products/9/edit → 잎 /products ('/products/categories' 가 아니다 — 접두가 아니다)` · `/products/categories → 잎 /products/categories (정확히 일치하는 더 긴 잎이 이긴다)`.

**그 결과**: 상품 read 권한만 가진 역할은 **`/products/categories` 에 들어오지 못한다**(403 화면). 그런데 **상품 폼은 카테고리 선택지를 읽는다**(FS-041-EL-023.4 → `GET /api/products/categories`).

**판정**: **이것은 두 개의 다른 질문이며 섞으면 안 된다.**
1. **화면 접근 권한** — `product-categories` read. 카테고리를 *관리*하는 화면이라 별개 리소스가 옳다.
2. **선택지 조회 권한** — 상품 폼이 카테고리 목록을 읽는 것은 **상품 편집의 일부**다. 여기에 `product-categories` read 를 요구하면 **상품만 관리하는 역할이 상품을 등록하지 못한다.**

**결론**: **EP-01 의 권한을 `product-categories:read` 로 좁히지 않는다.** `products:read` **또는** `product-categories:read` 중 하나만 있으면 200 을 준다 — 카테고리 목록은 상품 도메인의 공용 참조 데이터이며 은닉할 것이 없다(§7.5). EP-02·EP-03·EP-04(쓰기)만 `product-categories` 권한을 요구한다.

**A01 확정 필요**: 권한 모델이 nav 잎에서 파생되는 현재 구조(`resources.ts` ← `nav-config`)에서는 '읽기는 넓게, 쓰기는 좁게' 를 표현할 자리가 없을 수 있다 — 리소스가 곧 잎이고 액션(`read`/`create`/`update`/`remove`)이 그 아래 붙기 때문이다. **이 판정을 구현하려면 권한 모델이 '이 리소스의 read 는 다른 리소스의 read 로도 만족된다' 를 표현해야 한다.**

### 7.10 라벨 전파는 서버가 트랜잭션으로 한다 【정합 판정】

`updateProductCategory`(`_shared/store.ts:679-688`)가 카테고리 이름을 바꾸면서 **그 카테고리를 쓰는 상품의 `categoryLabel` 도 함께 갱신**한다. 주석이 그 성격을 명시한다: '라벨 변경을 상품의 비정규화 라벨에도 반영한다(**백엔드가 붙으면 서버가 정합성을 맡는다**)'.

**판정**: **픽스처가 임시로 하는 일이며 계약이 아니다.** `Product.categoryLabel` 은 **조회 시점 조인값**이고(BE-041 §3) 서버는 두 선택지를 갖는다:

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `categoryLabel` 을 **저장하지 않고 조회 시 조인**한다 | 전파가 필요 없다 — 정합성이 구조적으로 보장된다. `Product` 테이블에 라벨 컬럼이 없다 |
| **B** | 비정규화 컬럼을 두고 `PUT /categories/:id` 가 **같은 트랜잭션에서** 상품을 갱신한다 | 목록 조회가 빠르다. 그러나 전파가 부분 실패하면 **일부 상품만 옛 라벨을 단다** — 트랜잭션 필수 |

**A 를 권한다.** 카테고리 수는 작고(§7.7) 조인 비용이 무시할 만하다. **프론트는 어느 안이든 무변경이다** — `Product.categoryLabel` 이 응답에 있기만 하면 된다.

**단 한 가지가 계약에 걸린다**: `labelOf`(`store.ts:368-369`)가 없는 `categoryId` 에 **id 를 그대로 뱉는다**(`?? categoryId`). 서버는 고아 `categoryId` 를 애초에 만들지 않아야 하고(BE-041 §7.7 의 422 `CATEGORY_NOT_FOUND`), 그럼에도 생긴다면 **조인 실패를 id 노출이 아니라 명시적 표기**('(삭제된 분류)')로 그려야 한다 — id 는 내부 식별자다.

### 7.11 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **모달을 `useCrudForm` 위로 이관(§7.4 안 A)** — status 분기·conflict 다이얼로그·422 필드 매핑·동기 락·멱등키·reference code 를 한 번에 얻는다. **선행: `useCrudForm` 을 라우트 비의존 코어 + 라우트 어댑터로 분리**(현재 `useParams`/`useNavigate` 에 묶여 있다). **같은 모양의 모달이 앱에 5개 더 있다** — 한 화면의 문제가 아니다 | A11 (최우선 · 횡단) |
| 2 | **`CATEGORY_IN_USE` 의 문구가 거짓 안내다**(§7.2) — '잠시 후 다시 시도' 해도 영원히 실패한다. 서버 409 + `error.code` 구분 + N 을 포함한 구체 문구. **`HttpError` 에 `code` 를 실을 자리가 없다**(`http-error.ts:48-59` — `status`·`message`·`violations`·`reference` 뿐)인데 BE-003 §2 는 `error.code` 를 '프론트 분기의 유일한 근거' 라고 못박는다 | A63 · **A11/A40(`HttpError.code`)** |
| 3 | **사용량 배지를 `/products?category=<id>` 링크로** — 안내문이 '그 상품들의 분류를 바꾸라' 고 말하면서 거기로 데려가지 않는다(FS-042 §7 #6). **그 URL 은 이미 실재한다**(FS-041-EL-017). 백엔드와 무관하게 지금 할 수 있다 | A11 change_request |
| 4 | **이름 유일성 — 서버 제약 + 422 `error.fields`**(§7.3). 409 가 아니라 422 로 내려 필드 인라인 경로를 태운다(그 경로는 #1 이 선행돼야 산다) | A63 · A11 |
| 5 | **`ProductCategory.version` 도입 + `PUT`/`DELETE` 의 `If-Match`**(§7.1). **#1 이 선행돼야 보인다** — 409 를 읽는 코드가 없으면 토큰은 무의미하다 | A63 · A11 |
| 6 | **카테고리 목록의 react-query 키가 두 벌이다**(`['product-categories','list']` vs `[products,'category-options']`) — 여기서 카테고리를 바꿔도 상품 화면의 선택지가 무효화되지 않는다(FS-042 §7 #8 · BE-041 §7.7). **백엔드와 무관하게 지금 고칠 수 있다** | A11 change_request |
| 7 | **EP-01 의 권한을 `product-categories:read` 로 좁히면 상품만 관리하는 역할이 상품을 등록하지 못한다**(§7.9) — 권한 모델이 '이 리소스의 read 는 다른 리소스의 read 로도 만족된다' 를 표현할 수 있어야 한다 | **A01 · A11(권한 모델)** |
| 8 | **쓰기 게이팅이 '추가' 버튼 하나뿐이다**(§7.8) — `operator` 가 저장을 눌러 403 을 받고 '잠시 후 다시 시도해 주세요' 를 본다(quality-bar EXC-03 P0) | A11 change_request |
| 9 | **라벨 전파 — 조인(안 A) 또는 트랜잭션(안 B)**(§7.10). 픽스처가 임시로 하는 일이며 계약이 아니다. `labelOf` 의 id 노출 폴백도 함께 | A63 |
| 10 | **`productCount` 집계가 O(카테고리 × 상품)** — 서버는 GROUP BY 한 번(§7.7). **카테고리 수 상한**(예: 200)이 필요한지 도메인 확정 | A63 · A01 |
| 11 | **카테고리에 순서·계층이 없다**(FS-042 §7 #20) — 커머스 카테고리는 보통 트리 + 노출 순서를 갖는다. 의도된 단순화인지 미구현인지 확정 필요. **도입하면 이 계약이 크게 바뀐다**(`parentId`·`order` + 재정렬 엔드포인트) | **A01 (도메인 경계)** |
| 12 | **`fetchOne` 심 없음 — 수정 모달이 30초 낡은 스냅샷을 편집한다**(§7.6 · FS-042 §7 #14). #5 의 토큰이 그 위험을 막지만, 토큰 전에는 낡은 값이 최신을 덮는다 | A11 |
| 13 | `DELETE` 멱등키 자리 부재(`DeleteVars` — `crud.ts:319-322`) · 삭제 확인 동기 락 부재 · `deleting` 이 화면 단위(FS-042 §7 #15) · `onSuccess` 에 `aborted` 가드 부재(FS-042 §7 #18) | A11 · A63 |
| 14 | 401 감지·리다이렉트는 구현됐으나 **미저장 모달 입력이 유실**된다(EXC-19 P1 — 이름 한 줄이라 손실은 작다). 프론트 타임아웃 상한 없음(EXC-05 P1) · 오프라인 감지 없음(EXC-11 P1) | A11 · A40 |
| 15 | **삭제 버튼 접근 이름의 조사 오류** — `'N개 상품라 삭제할 수 없습니다'`(`ProductCategoriesPage.tsx:163`). `shared/format` 에 이 조사(이라/라)를 고르는 헬퍼가 없다(FS-042 §7 #11) | A11 change_request |

## 8. 자기 점검

- [x] FS-042 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 4건(EP-01~04) 매핑 완료. **심도 소비자도 없는 `fetchOne`(EP-05)을 '심 없음(미정)' 으로 명시**하고 §7.6 판정을 남겼다
- [x] **엔드포인트를 발명하지 않았다** — `categories/data-source.ts:20` 한 줄의 심에서만 파생했다(`GET/POST /api/products/categories` · `PUT/DELETE /api/products/categories/:id` + 그 주석이 명시한 '사용 중이면 409')
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (4행 × 9열 — 심 없는 EP-05 는 계약이 없어 행이 없음을 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **고유 차이 셋**(§7.5 403 vs 404 판정 · §7.8 `operator` 조회 전용 · §7.9 권한 리소스가 `/products` 와 갈린다)을 근거와 함께 기술
- [x] 멱등성 판정 — 조회 GET 멱등 / 등록·수정은 `Idempotency-Key` 를 **요구**하되 **프론트가 키를 만들지 않아 도달하지 않음**을 §7.4 에 명시(BE-041 과 대조 — 거기서는 키가 도달한다)
- [x] **보안 판정 포함** — §7.5 **【보안 판정】 403 vs 404 은닉 (회원·문의와 반대 결론, 근거 명시)**. 그 밖 정합 판정 4건(§7.1 동시성 토큰 · §7.2 사용 중 차단과 거짓 문구 · §7.3 이름 유일성 · §7.10 라벨 전파) + 연동 판정 1건(§7.4) + 범위 판정 2건(§7.6 · §7.9)
- [x] **`createStoreAdapter` 가 준 것(404·409·멱등 원장)과 이 화면이 활용하지 못하는 것을 구분**했다 — 409 는 발생하나 화면이 generic 배너로 뭉개고(§7.1·§7.4), 멱등 원장은 키가 도달하지 않아 놀고 있다(§7.4). **'존재 여부' 기반이라 동시 편집은 여전히 last-write-wins** 임을 §7.1 표로 못박았다
- [x] **FEEDBACK-06(모달 4경로 dirty 가드)을 이 화면이 충족함**을 §7.4 말미에 코드 근거(`:65,104,113,154`)와 함께 기록했다 — 상속하지 못한 것만 적고 상속한 것을 빠뜨리지 않았다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
</content>
