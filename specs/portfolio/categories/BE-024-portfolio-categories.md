---
id: BE-024
title: "포트폴리오 카테고리 관리 백엔드 기능 명세"
functionalSpec: FS-024
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-024. 포트폴리오 카테고리 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-024 포트폴리오 카테고리 관리 (`/portfolio/categories` · 등록/수정 모달 · 삭제 확인 다이얼로그). 하위 라우트 없음 |
| 범위 | 카테고리 목록 조회(사용량 포함), 등록, 수정, 삭제(사용 중 차단) |
| 범위 밖 | 포트폴리오 항목 CRUD(`/portfolio/items` — 별도 FS/BE). 고객 노출 렌더(§7.7 XSS 판정만). 카테고리 정렬 순서(화면에 개념 없음) |
| 프론트 어댑터 | `apps/admin/src/pages/portfolio/categories/data-source.ts` (`createStoreAdapter` · scope `portfolio-categories`) |
| 도메인 타입 | `apps/admin/src/pages/portfolio/categories/types.ts`(`PortfolioCategoryInput`) · `apps/admin/src/pages/portfolio/_shared/store.ts`(`PortfolioCategory` · `PortfolioCategoryUsage`) |
| 검증 정본 | `apps/admin/src/pages/portfolio/categories/validation.ts` — `portfolioCategorySchema` (`requiredText('카테고리 이름', 40)`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-010 §2 와 동일 선언). 아래는 포트폴리오 카테고리 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일. 5xx 는 `traceId` 를 실어 프론트가 참조 코드로 보일 수 있게 한다(EXC-20).
- **권한**: `admin` = 전체. `operator` = 조회 계열만(목록). 쓰기(등록·수정·삭제) → 403. 포트폴리오 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2).
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-024 §4.1) — 권한 강제는 **서버 책임**이다. 프론트는 쓰기 버튼조차 가리지 않으므로(§7.6) `operator` 는 버튼을 누르고 403 을 받는다.

## 3. 데이터 계약 (types.ts · _shared/store.ts 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `PortfolioCategory` | `id`(string) · `label`(string) | 카테고리 원본. **`updatedAt`/`version` 없음** — 낙관적 동시성 토큰을 실을 자리가 없다(§7.3) |
| `PortfolioCategoryUsage` | `PortfolioCategory` + `itemCount`(number) | 목록 행. `itemCount` = 그 카테고리를 참조하는 포트폴리오 수(`countItemsUsingCategory`). 삭제 차단 판단(1건 이상이면 막는다) |
| `PortfolioCategoryInput` | `name`(string) | 등록·수정 공용 입력. 어댑터가 `addCategory(input.name)`·`updateCategory(id, input.name)` 로 편다 |

**목록 응답은 `PortfolioCategoryUsage[]` 다** — 프론트 어댑터의 `list: listCategoryUsage` 가 사용량을 **같은 응답에** 요구한다. 별도 사용량 엔드포인트를 두지 않는다(BE-010 EP-03 과 다른 선택 — §7.5).

## 4. 엔드포인트 명세

### BE-024-EP-01 · 카테고리 목록 조회 (사용량 포함)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-024-EL-001, EL-003, EL-003.1, EL-003.2, EL-004, EL-006 |
| 메서드·경로 | `GET /api/portfolio/categories` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 전량.** 프론트가 페이지네이션·검색·필터를 갖지 않는다(FS-024-EL-003). 카테고리 수 상한 100개(§7.5) |
| 레이트리밋 | 분당 120회 |

**쿼리**: 없음.

**응답 200** — `readonly PortfolioCategoryUsage[]` (`{ id, label, itemCount }[]`). `itemCount` 는 그 카테고리에 속한(삭제되지 않은) 포트폴리오 수. 프론트는 `itemCount > 0` 이면 삭제 버튼을 잠근다(FS-024-EL-003.4). **정렬**: 저장소 배열 순서(추가 순)를 그대로 쓴다 — 프론트에 정렬 UI 가 없으므로 **서버가 안정된 순서를 보장**하면 된다(생성 순 오름차순 권고). 순서가 요청마다 흔들리면 목록이 튄다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-024-EP-02 · 카테고리 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-024-EL-002, EL-007.5(등록) |
| 메서드·경로 | `POST /api/portfolio/categories` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **비멱등.** 멱등키 없음 — 프론트에 동기 제출 락도 없어 중복 생성 위험이 실재한다(§7.8) |
| 레이트리밋 | 분당 10회 |

**바디**(`PortfolioCategoryInput`): `{ name: string }` — 앞뒤 공백 제거 후 1–40자(`CATEGORY_NAME_MAX`). **서버 정제 §7.7**.

**응답 201** — 생성 `PortfolioCategoryUsage`(`itemCount` = 0). 프론트 `create(...): Promise<void>` 로 반환값을 쓰지 않고 목록을 무효화한다(FS-024-EL-011) — 응답 바디는 계약상 자유지만 EP-01 과 같은 표현을 권고한다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields.name`) · 401 · 403 · 403 CSRF · **409 `CATEGORY_NAME_DUPLICATED`**(정규화 이름 중복 — §7.2) · 422 `CATEGORY_LIMIT_EXCEEDED`(상한 100개 — §7.5) · 429 · 500 · 504.

프론트는 409·422·500 을 구분하지 않고 '저장하지 못했습니다…'(FS-024-EL-007.3)로 표시한다 — §7.9 change_request.

---

### BE-024-EP-03 · 카테고리 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-024-EL-003.3, EL-007.5(수정), EL-012 |
| 메서드·경로 | `PUT /api/portfolio/categories/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 멱등(PUT 전체 치환). 같은 `name` 재요청은 무변화 |
| 레이트리밋 | 분당 10회 |

**바디**: `PortfolioCategoryInput`(EP-02 동일). **응답 200/204**.

**라벨 전파 (§7.4)**: 포트폴리오 항목이 `categoryLabel` 을 비정규화 보관한다(`PortfolioItem.categoryLabel`). 서버는 **같은 트랜잭션 안에서** 참조 항목의 표시 라벨을 정합시키거나(비정규화 유지), 조회 시 조인해 내려준다(정규화). 둘 중 하나를 택하고 계약으로 고정한다 — 프론트 픽스처는 전자를 흉내 낸다(`updateCategory` 가 `items` 를 함께 갱신).

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 CSRF · **404 `CATEGORY_NOT_FOUND`**(§7.3) · **409 `CATEGORY_NAME_DUPLICATED`**(다른 카테고리와 이름 충돌 — §7.2) · 429 · 500 · 504.

---

### BE-024-EP-04 · 카테고리 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-024-EL-003.4, EL-008, EL-009 |
| 메서드·경로 | `DELETE /api/portfolio/categories/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **비멱등으로 둔다** — 이미 삭제된 id 는 404 로 답한다(§7.3). 참조 무결성 검사가 선행한다 |
| 레이트리밋 | 분당 10회 |

**응답 204**.

**참조 무결성 (§7.1 보안·정합 판정)**: 그 카테고리를 참조하는 포트폴리오가 1건이라도 있으면 **422 `CATEGORY_IN_USE`** 로 거절한다(고아 포트폴리오 방지). `message` = '사용 중인 카테고리는 삭제할 수 없습니다.'

**에러**: 400 · 401 · 403 · 403 CSRF · **404 `CATEGORY_NOT_FOUND`** · **422 `CATEGORY_IN_USE`**(§7.1) · 429 · 500 · 504.

---

### BE-024-EP-05 · 카테고리 단건 조회 — **심 없음 (미정)**

프론트 어댑터가 `fetchOne`(→ `getCategoryUsage(id)`)을 배선하지만 **`// TODO(backend)` 주석에 `GET /api/portfolio/categories/:id` 가 없고, 이 화면에 소비자도 없다**(수정 모달은 목록 행 데이터를 그대로 받는다 — FS-024 §7 #12). `CrudAdapter` 인터페이스를 채우기 위한 배선이다.

**판정(§7.6)**: 지금 계약에 넣지 않는다. 필요해지는 시점(모달이 열릴 때 최신 값을 재조회하기로 하면)에 `GET /api/portfolio/categories/:id` → `PortfolioCategoryUsage` · 404 `CATEGORY_NOT_FOUND` 로 승격한다.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — 파라미터 없음 | 401 → 전역 인터셉터가 재인증 경로로. 화면은 FS-024-EL-006 | **403** 컬렉션(은닉 아님) | N/A — 0개면 200 빈 배열 → FS-024-EL-004 | N/A 읽기 전용 | N/A 읽기 전용 | 429 분당 120 → FS-024-EL-006 | 500 + `traceId` → FS-024-EL-006 | 5초 → 504 → FS-024-EL-006 |
| EP-02 등록 | `name` 1–40자 → `error.fields.name` | 401 → FS-024-EL-007.3 | **403** 컬렉션 쓰기 | N/A 생성 | **409 `CATEGORY_NAME_DUPLICATED`** 정규화 이름 중복(§7.2) | **422 `CATEGORY_LIMIT_EXCEEDED`** 100개 상한(§7.5) | 429 분당 10 | 500 + `traceId` → FS-024-EL-007.3, 입력 유지 | 5초 → 504 |
| EP-03 수정 | `name` + id 형식 | 401 → FS-024-EL-007.3 | `operator` → **403** / 읽기 없음 → **404** 은닉 | **404 `CATEGORY_NOT_FOUND`** — 다른 관리자가 먼저 삭제(§7.3) | **409 `CATEGORY_NAME_DUPLICATED`** 다른 카테고리와 이름 충돌 | N/A — 수정에 상태 규칙 없음 | 429 분당 10 | 500 + `traceId` → FS-024-EL-007.3 | 5초 → 504 |
| EP-04 삭제 | id 형식 | 401 → FS-024-EL-008.1 | `operator` → **403** / 읽기 없음 → **404** 은닉 | **404 `CATEGORY_NOT_FOUND`** — 이미 삭제(§7.3) | N/A — 이름 충돌은 삭제와 무관 | **422 `CATEGORY_IN_USE`** 사용 중 차단(§7.1) | 429 분당 10 | 500 + `traceId` → FS-024-EL-008.1 | 5초 → 504 |
| EP-05 단건 조회 | **심 없음 (미정)** — §7.6 | 심 없음 | 심 없음 | 심 없음 | 심 없음 | 심 없음 | 심 없음 | 심 없음 | 심 없음 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `portfolioCategoryAdapter.fetchAll(signal)` → `listCategoryUsage()` | `GET /api/portfolio/categories` | EP-01 | `PortfolioCategoryUsage[]` (사용량 포함) | O |
| `portfolioCategoryAdapter.create(input, signal)` → `addCategory(input.name)` | `POST /api/portfolio/categories` | EP-02 | `void`(201) | O |
| `portfolioCategoryAdapter.update(id, input, signal)` → `updateCategory(id, input.name)` | `PUT /api/portfolio/categories/:id` | EP-03 | `void` | O |
| `portfolioCategoryAdapter.remove(id, signal)` → `removeCategory(id)` | `DELETE /api/portfolio/categories/:id` | EP-04 | `void`(204) | **△ — 상태코드 불일치, 아래 참조** |
| `portfolioCategoryAdapter.fetchOne(id, signal)` → `getCategoryUsage(id)` | **주석에 없음** | EP-05 (심 없음 · 미정) | — | **X — 심 없음. 소비자도 없다(§7.6)** |

**△ 심과 다르게 정한 것 — 사용 중 삭제는 409 가 아니라 422 다.**
`data-source.ts:20` 의 심 주석은 `(사용 중이면 409)` 라고 적고 있으나, 본 명세는 **422 `CATEGORY_IN_USE`** 로 정했다. 근거는 §7.1 에 있다(요약: 이 화면은 409 를 **이름 중복 유니크**에 이미 쓰므로 — §7.2 — 두 semantic 이 같은 상태코드를 나눠 쓰면 상태코드 기반 분기가 무너진다. BE-010 §7.7 이 같은 상황을 이미 422 로 확정했다). **심 주석을 이 명세에 맞춰 갱신해야 한다 — §7.9 이관 #5.**

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` 헤더 · `fetchAll` 은 사용량(`itemCount`)이 실린 표현을 그대로 받는다 · 현재 `wait(LATENCY_MS=400)`+`failIfRequested(scope, op)` 자리가 실제 `fetch` 로 바뀐다. **`createStoreAdapter` 는 존재 검사를 하지 않으므로(§7.3) 실연동 시 서버 404/422 를 그대로 던지는 경로가 반드시 생겨야 한다.**

## 7. 핵심 판정

### 7.1 카테고리 참조 무결성 — 서버가 정본, 사용 중은 422 【보안·정합 판정】

사용 중 카테고리 삭제 차단을 **프론트 버튼 잠금(FS-024-EL-003.4)만으로 두는 것은 불충분하다.** 프론트는 목록 조회 시점의 `itemCount` 로 버튼을 잠그는데(`PortfolioCategoriesPage.tsx:118` `const inUse = category.itemCount > 0`), 그 값은 **조회 시점의 스냅샷**이다. 조회와 삭제 클릭 사이에 다른 관리자가 그 카테고리에 포트폴리오를 붙이면 프론트 버튼은 **열려 있는 채로** 삭제 요청이 나간다 — 고전적 TOCTOU(time-of-check to time-of-use)다. `staleTime` 30초는 이 창을 최소 30초로 벌려 놓는다.

**서버가 삭제 트랜잭션 안에서 참조를 재확인**하고 1건이라도 있으면 거절한다. 프론트 잠금은 **UX 편의**(왜 못 지우는지 미리 알려 주는 것)이고, **서버 검사가 정본**이다. BE-010 §7.7 과 같은 논증 구조다.

**상태코드는 422 `CATEGORY_IN_USE` 로 정한다 — 심 주석(`409`)과 다르다.** 근거 셋:

1. **409 는 이 화면에서 이미 임자가 있다.** §7.2 가 카테고리명 중복을 409 `CATEGORY_NAME_DUPLICATED` 로 막는다. 사용 중 삭제까지 409 로 두면 **한 리소스에서 409 가 두 가지 전혀 다른 의미**(이름이 겹친다 / 참조가 남아 있다)를 갖는다. 복구 행동이 정반대인데(이름을 바꿔라 / 참조를 먼저 끊어라) 상태코드로는 갈리지 않아, 클라이언트는 결국 `error.code` 를 봐야 한다 — 그러면 상태코드가 정보를 잃는다.
2. **semantic 이 다르다.** 409 Conflict 는 '요청이 리소스의 **현재 표현**과 충돌한다'(같은 이름이 이미 존재)에 맞고, 422 Unprocessable Content 는 '요청은 문법·형식상 유효하나 **도메인 상태 규칙**을 위반한다'(참조가 남아 있어 지울 수 없다)에 맞는다. 삭제 요청 자체에 충돌하는 표현이 있는 게 아니라, 도메인 불변식이 삭제를 거부하는 것이다.
3. **선례가 이미 확정돼 있다.** BE-010 §7.7 이 **완전히 같은 문제**(사용 중 FAQ 카테고리 삭제 차단)를 422 `CATEGORY_IN_USE` 로 정했다. 같은 앱에서 같은 도메인 문제가 화면마다 다른 상태코드를 쓰면 에러 계약이 화면 지식이 된다 — BE-027(문의 유형)도 같은 판정을 공유한다.

심 주석의 `409` 는 코드 작성 시점의 약칭으로 보이며, 저장소 구현(`removeCategory` 가 던지는 것)은 상태코드를 갖지 않는 generic `Error` 라 **실제로 409 를 반환하는 코드는 없다**. 계약을 이 명세로 고정하고 주석을 갱신한다(§7.9 #5).

### 7.2 카테고리명 중복 — 정규화 이름 유니크(409)

`addCategory`(`_shared/store.ts:212`)는 **중복 검사 없이 배열에 덧붙인다.** 프론트도 검사하지 않는다(FS-024-EL-007.1 경합 열). 그래서 지금은 '주거 공간' 카테고리가 둘 만들어질 수 있다.

카테고리는 **표시명(label)이 유일한 식별 단서**다 — 포트폴리오 폼의 분류 선택지와 목록 배지가 label 로만 구분된다. 동명 카테고리 둘은 관리자가 어느 쪽을 고르는지 알 수 없게 만들고, 사용량이 둘로 갈려 삭제 차단 판단도 흐려진다.

**앞뒤 공백 제거 + 대소문자 무시**로 정규화한 이름의 중복을 **409 `CATEGORY_NAME_DUPLICATED`** 로 막는다(EP-02 등록 · EP-03 수정 모두). 유니크 제약은 DB 레벨에 둬 동시 생성 경합에서도 성립하게 한다 — 애플리케이션 선검사만으로는 두 요청이 동시에 통과한다. BE-010 §7.5 와 같은 판정이다.

### 7.3 유령 저장·유령 삭제 — 존재 검사가 서버 책임 【정합 판정】

`createStoreAdapter`(`shared/crud/crud.ts:107-137`)는 `update`/`remove` 에서 **존재 검사를 하지 않고** store 함수에 그대로 위임한다. 그리고 store 는:

- `updateCategory`(`_shared/store.ts:217`) — `categories.map(...)` 이라 **없는 id 는 조용히 지나가고 성공을 반환**한다.
- `removeCategory`(`_shared/store.ts:229`) — 없는 id 면 `countItemsUsingCategory` 가 0 을 반환해 차단을 통과하고, `filter` 가 아무것도 지우지 않은 채 성공을 반환한다.

결과: 다른 관리자가 방금 지운 카테고리를 수정·삭제하면 **'저장했습니다'/'삭제했습니다' 토스트가 뜨지만 실제로 일어난 일은 없다.** 이것이 quality-bar EXC-04 가 이름 붙인 유령 저장(ghost saved)이다.

주목할 점은 **같은 파일의 `createCrudAdapter` 는 이미 이것을 고쳤다는 것이다** — `update`(crud.ts:71-73)·`remove`(crud.ts:82-84)가 `items.some(...)` 로 확인하고 없으면 409 를 던진다. `createStoreAdapter` 만 그 검사를 물려받지 못했다(비대칭 — FS-024 §7 #5).

**판정**: 서버가 정본이다. EP-03·EP-04 는 대상이 없으면 **404 `CATEGORY_NOT_FOUND`** 로 답한다(409 가 아니다 — 충돌이 아니라 대상 부재다). 프론트는 이를 '저장/삭제하지 못했습니다' 배너로 받는다. **낙관적 동시성 토큰(If-Match/ETag)은 이 엔티티에 도입하지 않는다** — `PortfolioCategory` 에 `updatedAt`/`version` 필드가 없고(§3), 필드가 `label` 하나뿐이라 '다른 사람이 먼저 바꾼 값'과 병합할 것이 없다. 마지막 쓰기가 이긴다(BE-010 §7.4 와 같은 결). 단 **대상 부재는 반드시 404 로 알린다** — 이것이 유령 저장을 없애는 최소 계약이다.

### 7.4 라벨 비정규화 전파 — 서버 트랜잭션이 정합

`PortfolioItem` 이 `categoryLabel` 을 비정규화 보관하고(`_shared/store.ts:27-28`), 픽스처의 `updateCategory` 가 카테고리 라벨 변경 시 참조 항목들의 `categoryLabel` 을 함께 갱신한다(store.ts:222-225). 백엔드 연결 후 이 정합은 **서버 트랜잭션 책임**이다: EP-03 이 카테고리 라벨을 바꾸면 같은 트랜잭션 안에서 참조 항목 표시 라벨도 정합시키거나, 애초에 조인으로 내려준다. 둘 중 하나를 택해 계약으로 고정한다 — 어느 쪽이든 **'라벨을 바꿨는데 포트폴리오 목록에는 옛 라벨이 남는' 상태가 관측되면 안 된다**는 것이 계약이다.

### 7.5 카테고리 수 상한 — 100개

프론트가 목록을 **전량 렌더**하고(FS-024-EL-003) 페이지네이션이 없다. 포트폴리오 폼의 분류 선택지도 이 목록에 비례해 늘어난다. 상한 없이 두면 목록 화면과 폼 select 가 함께 늘어진다(FS-024 §7 #8).

**상한 100개.** 도달하면 EP-02 가 **422 `CATEGORY_LIMIT_EXCEEDED`** 로 거절한다. BE-010 §7.3 과 같은 값·같은 근거다. 상한을 넘길 만큼 카테고리가 필요하다면 그것은 taxonomy 가 아니라 태그이며, 별도 설계가 필요하다는 신호로 읽는다.

### 7.6 단건 조회 — 지금은 계약에 넣지 않는다

어댑터가 `fetchOne` 을 배선했지만 심 주석에 없고 소비자도 없다(§4 EP-05). **심 없는 엔드포인트를 계약에 지어 넣지 않는다.** 수정 모달이 목록 행 데이터를 그대로 쓰는 현재 설계에서는 필요하지 않다.

다만 이 설계에는 관측 가능한 결과가 있다: 모달이 열린 사이 다른 관리자가 그 카테고리 이름을 바꿔도 모달은 **열릴 때의 값**을 보여주고, 저장하면 그 값으로 덮는다. §7.3 의 '마지막 쓰기 승리'와 일관된다. 모달 진입 시 재조회를 도입하기로 하면 EP-05 를 승격한다.

### 7.7 카테고리명 XSS — 서버가 저장 시 정제한다 【보안 판정】

카테고리명은 **관리자 입력**이며 **고객 화면에 노출된다** — 포트폴리오는 공개 콘텐츠이고 카테고리는 그 분류 필터·배지로 그대로 나간다. 관리자 화면은 JSX 텍스트 보간(`{category.label}`)이라 자동 이스케이프되지만, **고객 렌더가 HTML 로 해석하면 저장형 XSS** 가 된다. 관리자 화면이 안전하다는 것은 계약이 아니다 — 저장된 값이 안전해야 계약이다.

BE-010 §7.2 와 동일 판정 — 서버가 저장 시 마크업·`javascript:` 스킴·이벤트 핸들러를 제거하고, 계약은 '저장된 카테고리명에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다. 카테고리명은 **서식이 필요 없는 짧은 라벨**이므로 허용 태그 화이트리스트는 **빈 집합**이다(모든 마크업 제거) — FAQ 답변보다 강하게 잠글 수 있다.

정제는 **정규화(§7.2)보다 먼저** 적용한다 — 정제 후 이름으로 중복을 판정해야 `<b>A</b>` 와 `A` 가 같은 이름으로 수렴한다.

### 7.8 등록 중복 제출 — 서버가 방어선을 겸한다

EP-02 는 비멱등이고 멱등키가 없다. 그런데 프론트에 **동기 제출 락이 없다**(FS-024 §7 #3 — 모달이 `useCrudCreate` 저수준 훅을 직접 쓰고 `disabled={saving}` 렌더 가드에만 의존한다. `useCrudForm` 의 `submitLockRef` 를 물려받지 못했다). RHF 의 zod resolver 가 비동기라 `isPending` 이 true 로 렌더되기 전 빠른 두 번째 Enter 가 **두 번째 POST 를 만든다.**

프론트 수정이 정답이고 그것을 이관했다(§7.9 #2). 그러나 **서버도 방어선을 하나 갖는다**: §7.2 의 이름 유니크 제약이 중복 생성을 **자동으로 막는다** — 두 번째 요청은 409 `CATEGORY_NAME_DUPLICATED` 를 받는다. 이는 우연한 방어이지 설계가 아니며, 사용자는 성공 토스트 대신 '저장하지 못했습니다' 를 보게 된다(첫 요청은 성공했는데). 그래서 프론트 락이 여전히 필요하다. **멱등키(`Idempotency-Key`)는 도입하지 않는다** — 카테고리 생성은 금액·발송이 아니고 유니크 제약이 이미 결과적 멱등성을 준다.

### 7.9 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | `isFetching` 을 loading 으로 직결해 재조회가 first-load 로 표시된다(`PortfolioCategoriesPage.tsx:163` — STATE-01 P0) | A11 |
| 2 | 모달에 동기 제출 락·멱등키 없음. `useCrudForm` 패턴 이식 또는 `useCrudCreate` 에 락 승격(EXC-08 P0 — §7.8) | A11 |
| 3 | `createStoreAdapter.update/remove` 에 존재 검사 부재 — `createCrudAdapter` 와 비대칭. 유령 저장/삭제(EXC-04 P0 — §7.3) | A11 · A63 |
| 4 | `useRouteWritePermissions()` 소비자 0 — 쓰기 버튼이 권한과 무관하게 렌더(EXC-03 P0 · 앱 전역) | A11 |
| 5 | **심 주석 `(사용 중이면 409)` 를 `422 CATEGORY_IN_USE` 로 갱신**(§7.1 판정 반영) | A11 · A63 |
| 6 | 저장 실패 문구가 코드별로 갈리지 않음(409/422/500 동일 문구 — FS-024-EL-007.3) | A11 |
| 7 | 401 감지 후 재인증은 전역 인터셉터가 하나, 프론트 타임아웃 상한·오프라인 감지 없음 | A11 · A40 |
| 8 | 403 은닉 정책(컬렉션 403 / 개별 404)이 프론트 화면에서 구분되지 않음 — 둘 다 같은 배너 | A63 · A11 |

## 8. 자기 점검
- [x] FS-024 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (4 엔드포인트 + 심 없음 1건 명시)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열 — EP-05 는 '심 없음' 전열 명시)
- [x] 에러 봉투·권한 모델을 BE-003 상속으로 선언, 재정의 안 함
- [x] 멱등성 판정 — 조회 GET / 수정 PUT 멱등 / 등록 비멱등 / 삭제는 404 로 답하므로 비멱등(§7.3)
- [x] 보안 판정을 남겼다 — 참조 무결성 TOCTOU(§7.1) · 이름 중복 유니크(§7.2) · 카테고리명 XSS(§7.7)
- [x] **심에 없는 엔드포인트를 지어내지 않았다** — `fetchOne` 은 EP-05 '심 없음(미정)'으로 표기(§7.6)
- [x] 심과 다르게 정한 상태코드(409→422)를 §7.1 에 근거와 함께 남기고 §6 대조표에 명시했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
