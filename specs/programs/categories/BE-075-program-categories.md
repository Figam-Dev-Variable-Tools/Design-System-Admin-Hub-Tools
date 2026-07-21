---
id: BE-075
title: "프로그램 카테고리 백엔드 기능 명세"
functionalSpec: FS-075
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-075. 프로그램 카테고리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-075 프로그램 카테고리 (`/programs/categories` — **단일 라우트**, 등록·수정은 모달) |
| 범위 | 카테고리 목록 조회(**쓰는 프로그램 수 + 하위 보유 여부 포함**), 등록, 이름·상위 수정, 삭제(**사용 중이거나 하위가 있으면 차단**) |
| **범위 밖** | **카테고리 단건 조회** — 어댑터가 `fetchOne` 을 채우지만 **화면에 호출부가 0건이고 심 주석도 `GET /:id` 를 적지 않는다**(§7.9). **3단계 이상의 계층** — `assertAssignableParent` 가 중분류 밑 생성을 막는다(§7.1). **노출 순서** — `ProgramCategory` 에 `order`/`sort` 필드가 아예 없다(§7.2). **프로그램 CRUD** — BE-074 소관. **프로그램의 분류 일괄 변경** — 이 화면에 그 경로가 없다(사용량 배지가 `/programs?category=<id>` 로 데려다줄 뿐이다) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8` |
| 프론트 어댑터 | `apps/admin/src/pages/programs/data-source.ts` (`programCategoryAdapter` = 공용 `createStoreAdapter`) |
| 도메인 타입 | `apps/admin/src/pages/programs/_shared/store.ts`(`ProgramCategory` · `ProgramCategoryUsage` + 계층·삭제 규칙 `:471-521`) + `../types.ts`(`ProgramCategoryInput` · `categoryUsageLabel` · `filterCategoriesByUsage`) — **카테고리 정본이 `_shared` 에 있는 이유**: 프로그램이 카테고리를 참조하고 카테고리 삭제가 프로그램에 달려 있어, 두 화면이 서로의 모듈을 가져오면 순환이 된다(`store.ts:10-11`) |
| 검증 정본 | `apps/admin/src/pages/programs/validation.ts:105-109` (`programCategorySchema` = `requiredText('카테고리 이름', 40)` + `parentId: z.string()`) + **저장소의 순수 규칙 넷**(`_shared/store.ts:472-482,499-501,513-521`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 카테고리 도메인 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 1건 — `GET /:id` 가 없다 | `data-source.ts:36` `// TODO(backend): GET/POST /api/programs/categories · PUT/DELETE /api/programs/categories/:id (사용 중이면 409)` |
| **심이 차단 사유를 하나만 적었다** — 실제는 둘이다 | `data-source.ts:36`(`사용 중이면 409`) ↔ `_shared/store.ts:513-521`(사용 중 **+ 하위 있음**). 파일 머리말은 둘 다 적는다(`data-source.ts:4`) |
| 목록 항목이 `ProgramCategoryUsage`(= 카테고리 + `programCount` + `hasChildren`)다 | `_shared/store.ts:22-26` · `:453-459` |
| **`parentId` 로 2단계를 만들고 3단계를 막는다** | `_shared/store.ts:471-482` · 회귀 `programs.test.ts:269-274` |
| **하위를 가진 카테고리의 이동을 막는다** | `_shared/store.ts:499-501` · 회귀 `programs.test.ts:275-279` |
| **삭제 차단 사유 2종이 저장소에 있다** | `_shared/store.ts:513-521` · 회귀 `programs.test.ts:281-291` |
| 그 throw 가 전부 **status 없는 generic `Error`** 다 | `_shared/store.ts:475,478,480,500,515,518` (전부 `new Error(...)`) |
| **순서(order/sort) 필드가 없다** | `_shared/store.ts:15-20` 전수 확인 — `id` · `label` · `parentId` 뿐 |
| **`version`/`updatedAt` 이 없다** | 같은 자리(`:15-20`) · `apps/admin/src/pages/programs` 전체 `If-Match` grep **0건**(실측 2026-07-22) |
| 이름 수정이 **프로그램의 비정규화 라벨을 전파**한다 | `_shared/store.ts:507-509` (같은 함수 안에서 `programs` 를 map) |
| **이름 중복 검증이 없다** | `validation.ts:105-109`(유일성 `.check` 부재) · `_shared/store.ts:484-491`(그냥 append) |
| 화면이 삭제 차단을 **같은 순서로** 흉내 낸다 | `ProgramCategoriesPage.tsx:218-220` (`inUse ? usage : hasChildren ? '하위 카테고리 있음' : null`) |
| 그 판정 근거가 **조회 시점 스냅샷**이다 | `ProgramCategoriesPage.tsx:327-333`(`useCrudListQuery` 결과) — 저장소는 실시간 배열을 본다 |
| **`'모른다'` 를 표현할 자리가 타입에 없다** | `programCount: number` · `hasChildren: boolean`(`_shared/store.ts:24-25`) — 대조군 `carrierDeleteBlock(carrier, usage: number \| null)`(`shared/domain/shipment.ts:154-163`) |
| 모달이 **`useCrudForm` 을 쓰지 않는다** | `ProgramCategoryFormModal.tsx:11,74-75` (`useCrudCreate`/`useCrudUpdate` 직접) |
| **멱등키·동기 제출 락이 없다** | `ProgramCategoryFormModal.tsx:103-113` (`mutate({ input, signal })` — `idempotencyKey` 부재) |
| **`onSuccess` 에 `aborted` 가드가 없다** | `ProgramCategoryFormModal.tsx:105,112` ↔ 삭제는 갖고 있다(`ProgramCategoriesPage.tsx:392`) |
| 상위 셀렉트가 **어댑터를 지나지 않는다** | `ProgramCategoryFormModal.tsx:55` (`listProgramCategoryRoots()` 를 렌더 중 동기 호출) |
| `fetchOne` 호출부가 **화면에 0건**이다 | `ProgramCategoriesPage.tsx:327-330`(`useCrudListQuery` 만) · 수정 모달은 행 데이터를 그대로 받는다(`:483,524`) |
| 사용량 집계가 **카테고리마다 프로그램 전량 + 카테고리 전량 스캔**이다 | `_shared/store.ts:453-459` → `:420-422` |
| 이 라우트는 **어떤 엔타이틀먼트 모듈에도 속하지 않는다** | `shared/entitlements/module-resources.ts:29-91` 전수 — `/programs` 계열 0건 |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회(목록)만**. 등록·수정·삭제는 **403**(§7.11 — BE-074 §7.11 과 같은 판정).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504. **저장 1회가 이름 + 상위 둘뿐이라 프로그램 저장(BE-074 §2 의 10초)과 달리 늘릴 이유가 없다.** 다만 **이름 수정은 라벨 전파를 동반하므로**(§7.7) 프로그램 수에 비례하는 트랜잭션이다 — 그 경로만 10초로 잡는다.
- **엔타이틀먼트**: 이 리소스도 **어떤 모듈에도 매핑되지 않는다**(`module-resources.ts:29-91`). 플랜 판정은 `granted` 로 수렴하며(fail-open) **이 계약의 응답 코드에 플랜 축이 없다.**
- **권한 리소스가 `/programs` 와 갈린다**: `findCoveringLeaf` 의 '더 긴 잎이 더 구체적이다' 규칙(`nav-config.ts:382-391`)에 따라 `/programs/categories` 는 별개 리소스다. **즉 프로그램 read 권한만 가진 역할은 이 화면에 들어오지 못한다** — 그럼에도 그 역할이 프로그램 폼에서 카테고리 선택지를 읽어야 한다(§7.11).
- **프론트 권한 게이팅이 절반뿐이다**: 이 화면은 `useRouteWritePermissions` 에서 **`canCreate` 만** 꺼낸다(`ProgramCategoriesPage.tsx:311`). 행 수정·행 삭제·모달 저장은 `canUpdate`/`canRemove` 를 묻지 않는다. **이 사실이 서버 책임을 바꾸지 않는다** — 서버가 403 을 내야 하고, 지금은 그 403 이 '잠시 후 다시 시도' 라는 거짓 문구로 보인다(§7.6).

## 3. 데이터 계약 (`_shared/store.ts` · `types.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `ProgramCategory` | `id` · `label` · **`parentId: string \| null`**(null=1Depth) | **필드가 셋뿐이다.** `order`·`version`·`updatedAt`·`visible` 이 **없다**(전수 확인 `:15-20`). BE-074 EP-06 이 이 형태를 읽어 간다 |
| `ProgramCategoryUsage` | `extends ProgramCategory` + **`programCount: number`** + **`hasChildren: boolean`** | **목록 응답의 항목**. 둘 다 **서버 집계값**이며 저장 필드가 아니다(§7.4). **둘 다 non-nullable 이다** — '모른다' 를 표현할 자리가 없다(§7.4 【정합 판정】) |
| `ProgramCategoryInput` | `{ name: string; parentId: string \| null }` | 등록·수정 입력(`types.ts:226-230`). **`id` 도 `programCount` 도 `hasChildren` 도 없다** — 전자는 서버 채번, 나머지는 파생 |
| 폼 값 | `{ name: string; parentId: string }` | 셀렉트의 `'없음 (대분류)'` 이 **빈 문자열**이고 저장 직전 `null` 로 바뀐다(`ProgramCategoryFormModal.tsx:95`) |
| 상수 | `PROGRAM_CATEGORY_NAME_MAX = 40` | `_shared/store.ts:132` |

**검증 규칙 (`programCategorySchema` — 서버가 정본이어야 한다)**

| 필드 | 규칙 | 근거 |
|---|---|---|
| `name` | 공백만 금지(`'카테고리 이름을 입력하세요.'`) · trim 후 ≤40자(`'카테고리 이름은 40자를 넘을 수 없습니다.'`) | `validation.ts:106` · 회귀 `programs.test.ts:623-630` |
| `parentId` | `z.string()` — **형태만**. 계층 판정은 스키마가 아니라 저장소가 한다 | `validation.ts:108` |
| `name` 유일성 | **없다** | §7.5 |

**계층 규칙 (순수 — `assertAssignableParent` `_shared/store.ts:472-482` + `updateProgramCategory` 의 추가 판정 `:499-501`. 판정 순서가 곧 규칙이다)**

| 판정 순서 | 조건 | 거절 사유 (문자열 그대로) |
|---|---|---|
| ① | `parentId === null` | **통과** — 대분류로 만든다 |
| ② | `selfId !== undefined && parentId === selfId` | `자기 자신을 상위 카테고리로 지정할 수 없습니다.` |
| ③ | 그 `parentId` 의 카테고리가 없다 | `상위 카테고리를 찾을 수 없습니다.` |
| ④ | `parent.parentId !== null` (= 중분류를 상위로 지정) | `카테고리는 2단계까지만 만들 수 있습니다.` |
| ⑤ (수정에만) | `parentId !== null && hasProgramCategoryChildren(id)` | `하위 카테고리가 있는 카테고리는 다른 카테고리 밑으로 옮길 수 없습니다.` |

> ②는 `selfId` 가 넘어올 때만 판정한다 — 등록(`addProgramCategory:485`)은 `selfId` 를 넘기지 않고 수정(`updateProgramCategory:498`)은 넘긴다. **⑤가 존재하는 이유는 손자를 만들지 않기 위해서다**: 하위를 가진 대분류를 다른 대분류 밑으로 옮기면 그 하위가 3단계가 된다.

**화면은 그중 셋을 선택지 자체로 막는다**(`ProgramCategoryFormModal.tsx:55-59`): 후보를 `listProgramCategoryRoots()`(1Depth 만)로 좁혀 ④를, 자기 자신을 빼서 ②를, `parentLocked = isEdit && editing.hasChildren` 로 셀렉트를 잠가 ⑤를. **③(없는 상위)만 선택지로 막히지 않는다** — 모달이 열린 사이 다른 관리자가 그 대분류를 지우면 도달한다.

**삭제 차단 규칙 (순수 — `removeProgramCategory` `_shared/store.ts:513-521`. 판정 순서가 곧 규칙이다)**

| 판정 순서 | 조건 | 거절 사유 (문자열 그대로) |
|---|---|---|
| ① | `countProgramsUsingCategory(id) > 0` | `사용 중인 카테고리는 삭제할 수 없습니다.` |
| ② | `hasProgramCategoryChildren(id)` | `하위 카테고리가 있는 카테고리는 삭제할 수 없습니다.` |

**화면의 버튼 잠금이 같은 순서를 쓴다**(`ProgramCategoriesPage.tsx:218-220`): `blockReason = inUse ? usage : hasChildren ? '하위 카테고리 있음' : null`. 접근 이름이 사유를 말하고(`:290-294` — `'<이름> — <사유>이라 삭제할 수 없습니다'`) `title` 도 같은 사유를 단다. **순서는 같으나 근거 데이터가 다르다** — 화면은 조회 시점 스냅샷을, 저장소는 실시간 배열을 본다. 그것이 §7.3·§7.4 의 출발점이다.

**사용 여부 필터 (프론트 순수 함수 — 서버가 내려주지 않는다)**: `filterCategoriesByUsage`(전체/사용 중/미사용 — `types.ts:217-224`) · `countCategoriesByUsage`(세 갈래 건수 — `ProgramCategoriesPage.tsx:63-68`) · `categoryUsageLabel`(`'미사용'` / `'N개 프로그램'` — `types.ts:213-215`). 서버는 `programCount`·`hasChildren` 만 주고 분류·집계·트리 조립은 클라이언트가 한다.

## 4. 엔드포인트 명세

### BE-075-EP-01 · 카테고리 목록 조회 (사용량 · 하위 보유 포함)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-075-EL-001.1, EL-002, EL-004, EL-004.1, EL-005, EL-005.1, EL-005.2, EL-005.3, EL-006, EL-007, EL-011, EL-018 |
| 심 | `data-source.ts:36` `GET /api/programs/categories` |
| 메서드·경로 | `GET /api/programs/categories` |
| 권한 | `admin`, `operator`. **`programs:read` 만으로도 200 을 준다**(§7.11) |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 전량 반환이다**(§7.10) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 사용 여부 필터가 클라이언트이고(`filterCategoriesByUsage`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly ProgramCategoryUsage[]`(= `{ id, label, parentId, programCount, hasChildren }[]`).

- **`programCount` 는 그 카테고리에 직접 배정된 프로그램 수다** — 롤업이 아니다. 저장소가 `program.categoryId === id` 만 센다(`_shared/store.ts:420-422`). 대분류의 배지가 **자기 아래 중분류의 프로그램을 포함하지 않는다**는 뜻이며, 화면이 그 사실을 알고 있다(`ProgramCategoriesPage.tsx:244-248` — 배지가 여는 목록은 롤업이라 **숫자보다 넓을 수 있고 그것이 맞다**).
- **`hasChildren` 은 전량 기준이다** — 필터와 무관하다(`:457`).
- **정렬은 서버가 정본이다** — 어댑터에 정렬 함수가 없고(`StoreAdapterSpec` 에 `sort` 자체가 없다 — `crud.ts:174-182`) 화면도 재정렬하지 않는다. 현재는 등록 순이며 정렬 UI 도 없다(§7.2).
- **평면 배열로 내려준다** — 트리 조립은 클라이언트가 한다(`ProgramCategoriesPage.tsx:350-362`). 중첩 응답으로 바꾸면 그 화면 코드가 통째로 바뀐다.

**에러**: 401 · 403 · 429 · 500 · 504.

> **이 엔드포인트는 BE-074 도 소비한다**: `fetchProgramCategoryOptions`(`data-source.ts:49-55`)가 프로그램 목록의 좌측 필터와 폼의 2단 셀렉트를 먹인다. `ProgramCategoryUsage` 는 `ProgramCategory` 의 초집합이므로(`_shared/store.ts:23`) **응답 하나가 두 소비자를 모두 먹인다** — 프로그램 화면은 `programCount`·`hasChildren` 를 무시하면 된다. **다만 그쪽에는 심 주석이 없다**(BE-074 §7.9).

---

### BE-075-EP-02 · 카테고리 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-075-EL-003, EL-005.4, EL-008, EL-008.1, EL-008.2, EL-008.5(등록), EL-013, EL-016 |
| 심 | `data-source.ts:36` `POST /api/programs/categories` |
| 메서드·경로 | `POST /api/programs/categories` |
| 권한 | **`admin` 만**(§7.11) |
| 멱등성 | **`Idempotency-Key` 로 멱등해야 한다 — 그러나 프론트가 키를 싣지 않는다**(§7.6) |
| 레이트리밋 | 분당 60회 |

**바디** — `{ name: string, parentId: string | null }`.

**서버 검증 (순서가 곧 규칙이다)**
1. `name` — trim 후 공백만 금지 · ≤40자. 프론트 검증은 UX 다.
2. **`name` 유일성** — 프론트에 이 검증이 없다(§7.5). 중복이면 **422**.
3. **계층 판정** — §3 의 표 ①③④를 그대로 재판정한다(등록에는 ②·⑤가 걸리지 않는다). 위반은 **422**.
4. **`id` 는 서버가 채번한다** — 요청에 있어도 무시. 현재 픽스처는 `pgm-cat-<seq>`(`_shared/store.ts:489`)이나 그 형식은 계약이 아니다.

**응답 201/204**. 프론트 `create(input, context): Promise<void>` — 응답 본문을 읽지 않고 목록을 무효화한 뒤 모달을 닫고 토스트를 띄운다(`ProgramCategoriesPage.tsx:404-409`). **id 를 쓰지 않는다.**

**에러**: 400 `VALIDATION_FAILED`(`error.fields: [{ field: 'name' }]`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **422 `DUPLICATE_CATEGORY_NAME`**(§7.5) · **422 `PARENT_NOT_FOUND`** · **422 `MAX_DEPTH_EXCEEDED`**(§7.1) · 429 · 500 · 504.

---

### BE-075-EP-03 · 카테고리 이름 · 상위 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-075-EL-005.5, EL-008, EL-008.1, EL-008.2, EL-008.5(수정), EL-013, EL-016, EL-017 |
| 심 | `data-source.ts:36` `PUT /api/programs/categories/:id` |
| 메서드·경로 | `PUT /api/programs/categories/:id` |
| 권한 | **`admin` 만**(§7.11) |
| 멱등성 | 멱등(PUT). **`Idempotency-Key` 미탑재**(§7.6) |
| 레이트리밋 | 분당 60회 |
| 타임아웃 | **10초** — 라벨 전파를 동반하면 프로그램 수에 비례한다(§7.7) |

**바디** — `{ name: string, parentId: string | null }`. **상위도 함께 바뀐다** — 상품 카테고리(BE-042 EP-03)가 이름만 받는 것과 다르다.

**서버 검증** — EP-02 의 1~2 + 아래.
5. **`name` 유일성은 자기 자신을 제외**하고 판정한다.
6. **계층 판정 전체** — §3 의 표 ①②③④**⑤**를 순서대로 재판정한다. **⑤(하위를 가진 카테고리의 이동 금지)가 수정에만 걸린다.**
7. **낙관적 동시성** — §7.8.
8. **라벨 전파** — §7.7. 이 갱신과 프로그램의 `categoryLabel` 갱신은 **한 트랜잭션**이다.

**응답 200/204**.

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `CATEGORY_NOT_FOUND`** · **409 `CONFLICT`**(§7.8) · **422 `DUPLICATE_CATEGORY_NAME`** · **422 `PARENT_NOT_FOUND`** · **422 `MAX_DEPTH_EXCEEDED`** · **422 `SELF_PARENT`** · **422 `HAS_CHILDREN`**(⑤ 위반) · 429 · 500 · 504.

---

### BE-075-EP-04 · 카테고리 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-075-EL-005.6, EL-009, EL-013, EL-015 |
| 심 | `data-source.ts:36` `DELETE /api/programs/categories/:id (사용 중이면 409)` — **그 주석이 두 번째 사유를 빠뜨렸다**(§7.3) |
| 메서드·경로 | `DELETE /api/programs/categories/:id` |
| 권한 | **`admin` 만**(§7.11) |
| 멱등성 | 멱등(DELETE). **키 자리 없음**(`DeleteVars` — `crud.ts:363-366`) |
| 레이트리밋 | 분당 60회 |

**서버 검증**
9. **사용 중이면 삭제하지 않는다** — `programCount > 0` 이면 **409 `CATEGORY_IN_USE`**.
10. **하위가 있으면 삭제하지 않는다** — `hasChildren` 이면 **409 `CATEGORY_HAS_CHILDREN`**. **판정 순서는 ⑨ → ⑩** 이다(저장소가 그 순서이고 화면의 사유 문구도 그 순서를 따른다 — §3).
11. **판정 근거는 서버의 실시간 값이다** — 요청의 어떤 값도, 프론트가 본 스냅샷도 근거가 되지 않는다(§7.4).

**응답 204**.

**에러**: 400(id 형식) · 401 · 403 `FORBIDDEN` · **404 `CATEGORY_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제됨 — 어댑터가 `'이미 삭제된 항목입니다.'` 를 이 자리에서 낸다 · `crud.ts:275-277`) · **409 `CATEGORY_IN_USE`** · **409 `CATEGORY_HAS_CHILDREN`** · 429 · 500 · 504.

---

### BE-075-EP-05 · 상위 카테고리 선택지 조회 — **심 없음 (EP-01 로 흡수한다)**

모달의 상위 셀렉트가 `listProgramCategoryRoots()` 를 **렌더 중 동기로 직접 호출**한다(`ProgramCategoryFormModal.tsx:55`). **어댑터를 지나지 않고, `fixtureRequest` 도 지나지 않으며, `// TODO(backend)` 주석도 없다** — 이 화면이 저장소 모듈을 직접 읽는 유일한 자리다.

- 엔드포인트: **만들지 않는다.** 1Depth 목록은 **EP-01 응답의 부분집합**(`parentId === null`)이라 새 경로가 필요 없다.
- **그러나 프론트는 그대로 둘 수 없다**: 백엔드가 붙으면 이 한 줄이 비동기가 되어 **모달에 로딩·실패 상태가 생긴다**(지금은 둘 다 없다). 그리고 지금은 **react-query 캐시 밖**이라 모달이 열린 시점의 모듈 배열로 고정된다 — 무효화와도 무관하다.
- 판정: §7.9.

---

### BE-075-EP-06 · 카테고리 단건 조회 — **심 없음 (미정)**

`createStoreAdapter` 가 `StoreAdapterSpec.getOne` 을 요구해 `fetchOne` 이 존재한다(`data-source.ts:43`). **그러나**:

- **화면에 호출부가 0건이다** — 목록은 `useCrudListQuery`(`ProgramCategoriesPage.tsx:327-330`), 수정 모달은 **행 데이터를 그대로 받는다**(`:483,524` → `editing` prop).
- **`// TODO(backend)` 주석이 `GET /:id` 를 적지 않는다** — `data-source.ts:36` 은 `GET/POST /api/programs/categories · PUT/DELETE /api/programs/categories/:id` 뿐이다.

- 엔드포인트: **미정.** 이 문서는 소비자도 심도 없는 경로를 만들지 않는다. 판정은 §7.9.

## 5. 예외 매트릭스

> EP-05·EP-06 은 **심도 소비자도 없거나(EP-06) EP-01 에 흡수되므로(EP-05)** 이 매트릭스에 행이 없다(§7.9). 아래 4행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(사용 여부 필터가 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:60-66`)가 `/login?returnUrl=%2Fprograms%2Fcategories&reason=session_expired` 로. 화면은 FS-075-EL-011 배너 | **403** 컬렉션 — 분류 체계의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1 · §7.10) | N/A — 0건이면 200 빈 배열 → EL-007 빈 상태(2분기) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` → EL-011 배너 | 500 + `traceId` → EL-011. **툴바의 '전체 0개' 가 배너와 함께 남는다**(FS-075 §7 #17) — 배너가 카드만 대체하기 때문 | 5초 → 504 → EL-011 |
| EP-02 등록 | 400 `VALIDATION_FAILED` — `name` 공백만·40자 초과. `error.fields` 로 내려보낸다. **프론트에 필드 매핑 경로가 없어**(모달이 `useCrudForm` 미사용) EL-008.3 배너로 뭉개진다(§7.6) | 401 → 전역 인터셉터. **미저장 모달 입력은 유실**되나 이름 한 줄 + 셀렉트 하나라 손실이 작다 | **403 `FORBIDDEN`** — `operator` 는 등록할 수 없다(§7.11). 컬렉션 쓰기라 은닉할 개별 리소스가 없다. 프론트는 `canCreate` 로 버튼을 숨기지만 그것은 UX 다 | N/A — 생성이라 대상이 없다. **없는 `parentId` 는 404 가 아니라 422** 다(§3 표 ③) | N/A — 생성에 충돌 대상이 없다. **중복 이름은 409 가 아니라 422 로 낸다**(§7.5) | **422** `DUPLICATE_CATEGORY_NAME` · `PARENT_NOT_FOUND` · `MAX_DEPTH_EXCEEDED`. **연타가 같은 이름을 두 번 보내는 경로가 실재한다**(§7.6 — 동기 락·멱등키 부재) | 429 분당 60 + `Retry-After` → EL-008.3 배너로 뭉개진다 | 500 + `traceId` → EL-008.3 배너, **입력 보존**. **참조 코드를 보이지 않는다**(`useCrudForm` 미사용 — §7.6) | 5초 → 504 → EL-008.3 배너 |
| EP-03 수정 | EP-02 와 동일 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 수정할 수 없다. 읽기 권한이 있는 주체에게는 존재를 숨기지 않는다(§7.10) | **404 `CATEGORY_NOT_FOUND`** — 존재한 적 없는 id. **어댑터는 같은 자리에서 409('다른 사용자가 먼저 삭제한 항목입니다.' — `crud.ts:256-258`)를 낸다** — 픽스처는 '없음'과 '먼저 삭제됨'을 구분할 수 없기 때문이다. HTTP 연동 시 **서버가 그 둘을 구분한다** | **409 `CONFLICT`** — ① 낙관적 동성성 토큰 불일치(**현재 토큰이 없어 발생할 수 없다** — §7.8) ② 대상 부재(어댑터가 이미 낸다). **화면에 409 해소 UI 가 없다** — 모달이 `isConflict` 를 읽지 않아 generic 배너로 뭉개진다(§7.6) | **422** `DUPLICATE_CATEGORY_NAME`(자기 제외) · `PARENT_NOT_FOUND` · `MAX_DEPTH_EXCEEDED` · `SELF_PARENT` · **`HAS_CHILDREN`**(§3 표 ⑤). **화면이 셋을 선택지로 막지만 ③은 뚫린다** — 모달이 열린 사이 대분류가 지워지면 도달한다 | 429 분당 60 | 500 + `traceId` → EL-008.3 배너, 입력 보존 | **10초** — 라벨 전파를 동반한다(§7.7) → 504 → EL-008.3 |
| EP-04 삭제 | 400 — id 형식 위반 → EL-009 다이얼로그 배너 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 삭제할 수 없다. 읽기 권한이 있으므로 404 로 숨기지 않는다 | **404 `CATEGORY_NOT_FOUND`** — 어댑터는 같은 자리에서 **409 '이미 삭제된 항목입니다.'**(`crud.ts:275-277`). 서버는 404(존재한 적 없음)와 409(먼저 삭제됨)를 구분한다 | **409 세 갈래**: `CONFLICT`(이미 삭제됨) · **`CATEGORY_IN_USE`** · **`CATEGORY_HAS_CHILDREN`**(§7.3). **프론트가 셋을 구분하지 않고 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉갠다 — 뒤 둘에 그 문구는 거짓 안내다**(영원히 실패한다 — §7.3) | N/A — 삭제에 전제 상태가 없다. 참조 무결성 위반은 **409** 로 낸다(§7.3) | 429 분당 60 + `Retry-After`. **일괄 삭제가 없어**(FS-075 §2) 폭풍이 나지 않는다 | 500 + `traceId` → EL-009 다이얼로그 배너 | 5초 → 504 → 다이얼로그 배너 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `programCategoryAdapter.fetchAll(signal)` | `GET /api/programs/categories` | EP-01 | `readonly ProgramCategoryUsage[]` | O — **정렬 함수가 없어 서버 순서가 곧 화면 순서다**(§7.2) |
| `programCategoryAdapter.create(input, context)` | `POST /api/programs/categories` | EP-02 | `void` | **△ — `Idempotency-Key` 헤더 배선 필요.** 단 **키가 도달하지 않는다**(§7.6) |
| `programCategoryAdapter.update(id, input, context)` | `PUT /api/programs/categories/:id` | EP-03 | `void` | **△ — `If-Match`/`version` 없음**(§7.8) · 멱등키 미도달 · **라벨 전파가 서버 책임으로 넘어간다**(§7.7) |
| `programCategoryAdapter.remove(id, context)` | `DELETE …/:id (사용 중이면 409)` | EP-04 | `void` | **△ — 심이 차단 사유를 하나만 적었고**(§7.3) **화면이 409 를 분기하지 않는다**(§7.6) |
| `programCategoryAdapter.fetchOne(id, signal)` | **없음** | **EP-06 심 없음(미정)** | `ProgramCategoryUsage` | **X — 화면에 호출부가 0건이다**(§7.9) |
| `listProgramCategoryRoots()` (모달 직접 호출) | **없음** | **EP-05 — EP-01 로 흡수** | `readonly ProgramCategory[]` | **X — 어댑터도 `fixtureRequest` 도 지나지 않는다**(§7.9) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token` 헤더. |
| 404 변환 | `fetchOne` 은 이미 `HttpError(404)` 를 던진다(`crud.ts:217-219`) — **호출부가 없어 발현하지 않는다**(§7.9). |
| 409 변환 | `update`/`remove` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다. **`message` 는 사용자가 읽을 문장이어야 한다** — 지금 화면이 그것을 버리지만(§7.6), 화면이 고쳐지는 즉시 그 문장이 유일한 설명이 된다. |
| 409 의 `code` 구분 | **`CATEGORY_IN_USE` · `CATEGORY_HAS_CHILDREN` · `CONFLICT` 는 복구 수단이 정반대다**(§7.3). `status` 만으로는 가를 수 없는데 **`HttpError` 에 `code` 를 실을 자리가 없다**(`http-error.ts:52-67` — `status`·`message`·`violations`·`reference` 뿐). BE-003 §2 는 `error.code` 를 '프론트 분기의 유일한 근거' 라고 못박는다 — **타입에 자리가 필요하다**(§7.12 #3). |
| 422 변환 | 응답 422 의 `error.fields` 를 `HttpError.violations` 로 옮긴다. **소비할 코드가 지금 없다**(§7.6) — 모달이 `useCrudForm` 을 쓰지 않아 `setError` 경로가 없다. |
| 멱등키 | `create`/`update` 는 `context.idempotencyKey` 를 `Idempotency-Key` 헤더로 내보낸다 — 자리는 이미 있다(`WriteContext` — `crud.ts:35-47`). **그러나 이 화면은 키를 만들지 않는다** — 어댑터 본문이 아니라 **호출부(모달)가 바뀌어야 한다**(§7.6). |
| `If-Match` | `PUT`/`DELETE` 에 `If-Match: <version>` — `ProgramCategory` 에 그 필드가 없으므로 **타입 변경이 선행된다**(§7.8). |
| 부수효과 제거 | `updateProgramCategory` 의 라벨 전파(`_shared/store.ts:507-509`)는 **픽스처 전용**이다 — 백엔드가 붙으면 서버가 정합성을 맡고 이 줄은 사라진다. 남겨 두면 프로그램 라벨의 정본이 둘이 된다(§7.7). |
| 상위 셀렉트 | `listProgramCategoryRoots()` 직접 호출(`ProgramCategoryFormModal.tsx:55`)을 **EP-01 의 캐시에서 파생**하도록 바꾼다 — 어댑터 시그니처는 바뀌지 않지만 **모달의 구조가 바뀐다**(로딩·실패 상태가 생긴다 — §7.9). |

## 7. 핵심 판정

### 7.1 2단계 계층은 네 술어로 강제된다 — 서버가 그 표를 그대로 구현한다 【정합 판정】

**규칙이 실재하고 회귀가 사유 문자열까지 고정한다**(`programs.test.ts:269-280`). §3 의 계층 표가 그 전부이며 이 문서는 그것을 **승격**할 뿐 새로 만들지 않는다.

**세 가지를 특히 못 박는다**:

1. **상한은 2단계이고 재귀가 없다.** `assertAssignableParent` 는 `parent.parentId !== null` 한 줄로 3단계를 막는다(`:479-481`). 그래서 이 도메인의 어떤 규칙에도 재귀가 없다 — 롤업 필터(`categoryFamily` — `types.ts:79-88`)도 '자기 자신 + 직계 자식' 한 겹뿐이고, 그 함수의 주석이 **'2단계가 상한이므로 재귀가 필요 없다'** 고 근거를 적는다. **상한을 3단계로 넓히면 이 계약과 BE-074 의 롤업이 함께 바뀐다.**
2. **⑤(하위를 가진 카테고리의 이동 금지)가 상한을 지키는 두 번째 문이다.** ④만 있으면 '대분류 A(자식 있음)를 대분류 B 밑으로' 가 통과해 손자가 생긴다. **두 술어가 함께여야 상한이 성립한다** — 하나만 구현하면 조용히 뚫린다.
3. **화면이 셋을 선택지로 막지만 ③은 막지 못한다.** 모달이 열린 사이 그 대분류가 지워지면 `'상위 카테고리를 찾을 수 없습니다.'` 에 도달한다(FS-075 §4 EL-005.4). **선택지로 막힌 것도 서버는 다시 판정한다** — 프론트의 선택지 좁히기는 UX 이며 조작된 클라이언트는 임의 `parentId` 를 보낼 수 있다.

**판정**: 서버는 §3 의 다섯 판정을 **그 순서로** 구현하고 위반을 **422**(`PARENT_NOT_FOUND` · `MAX_DEPTH_EXCEEDED` · `SELF_PARENT` · `HAS_CHILDREN`)로 거절한다. **409 가 아니라 422 인 이유**는 §7.5 와 같다 — '최신을 불러올까?' 가 해결책이 아니라 **다른 상위를 고르는 것**이 해결책이기 때문이다.

### 7.2 순서 필드가 없다 — 재정렬 계약이 존재하지 않는다 【범위 판정】

**전수 확인한 사실**: `ProgramCategory` 는 `id` · `label` · `parentId` **셋뿐이다**(`_shared/store.ts:15-20`). `order`·`sort`·`position`·`displayOrder` 가 **없고**, 저장소에 재정렬 함수가 없으며(grep 0건), 화면에 드래그·화살표·정렬 UI 가 없다.

**따라서 이 문서는 재정렬 엔드포인트를 만들지 않는다.** 심이 없는 것은 누락이 아니라 **도메인에 그 축이 없다**는 사실의 반영이다.

**그 대신 정렬 정본이 서버에 있다는 것을 못 박는다.** `createStoreAdapter` 의 `StoreAdapterSpec` 에 `sort` 자체가 없고(`crud.ts:174-182`) 화면도 재정렬하지 않으므로 **응답 순서가 곧 화면 순서**다. 그 순서는 세 곳에 동시에 나타난다:

| 소비처 | 근거 |
|---|---|
| 이 화면의 트리(대분류 순 · 각 대분류의 자식 순) | `ProgramCategoriesPage.tsx:350-362` |
| 프로그램 목록의 좌측 카테고리 필터 | `ProgramListPage.tsx:205-219` |
| 프로그램 폼의 2단 셀렉트 | `ProgramFormPage.tsx:845-849` |

**판정**: 서버는 **안정 정렬**을 보장한다 — 순서가 흔들리면 새로고침마다 세 화면이 동시에 재배열된다. 현재 등록 순이며, **노출 순서를 도입할지는 도메인 확정 대상**이다(§7.12 #8). 커머스·펀딩 카테고리는 보통 노출 순서를 갖는다 — **도입하면 `order` 필드 + 재정렬 엔드포인트가 함께 생기고, 그때 '전량 치환인가 부분 갱신인가' 를 정해야 한다.** 지금은 그 질문 자체가 성립하지 않는다.

### 7.3 삭제 차단은 **두 사유**이고, 심은 하나만 적었으며, 지금의 문구는 거짓말이다 【정합 판정】

**심이 절반만 적었다**: `data-source.ts:36` 은 `(사용 중이면 409)` 뿐이다. **실제 차단 사유는 둘이고**(`_shared/store.ts:513-521`) 같은 파일 머리말은 그것을 알고 있다(`data-source.ts:4` — `삭제 차단(사용 중·하위 있음)을 store 가 강제한다 — 서버는 409 로 같은 규칙을 건다`). **백엔드가 심 주석만 보고 구현하면 하위 보유 차단이 빠진다** — 그러면 대분류를 지웠을 때 중분류가 **부모 없는 고아**가 되고, `programCategoryPath` 는 부모를 못 찾아 자식 라벨만 뱉으며(`:449-450`) 프로그램 목록의 필터는 `'테크·가전 > 음향기기'` 대신 `'음향기기'` 만 보이게 된다.

**현재 프론트는 두 겹으로 막는다**:
1. **버튼 잠금** — `blockReason`(`ProgramCategoriesPage.tsx:218-220`), `disabled={blocked || deleting}`(`:296`), 접근 이름·`title` 이 사유를 말한다(`:290-295`). **UX 이며 강제가 아니다.**
2. **저장소 throw** — `removeProgramCategory`(`_shared/store.ts:513-521`)의 두 판정.

**①은 경합에서 반드시 뚫린다.** `programCount`·`hasChildren` 는 **조회 시점 스냅샷**(`staleTime` 30초)이라, A 가 '미사용' 배지를 보는 동안 B 가 그 카테고리로 프로그램을 등록하면 A 의 삭제 버튼은 여전히 열려 있다. 그때 ②가 받는다 — **그것이 이 이중 방어의 존재 이유다.**

**그런데 ②의 실패가 거짓 안내로 보인다.** 두 throw 는 **status 없는 generic `Error`** 이고(`:515,518`), 화면의 `onError`(`ProgramCategoriesPage.tsx:396-399`)는 `isAbort` 만 보고 나머지를 **'삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'** 로 뭉갠다. **'잠시 후 다시 시도' 해도 그 카테고리는 영원히 지워지지 않는다** — 프로그램의 분류를 바꾸거나 중분류를 먼저 지우기 전에는. **저장소가 정확한 문구를 알고 있는데 화면이 그것을 버린다.**

**판정**: EP-04 는 두 사유를 **다른 코드**로 낸다.

| `error.code` | 뜻 | 문구 | 복구 |
|---|---|---|---|
| `CONFLICT` | 다른 관리자가 먼저 지웠다 | (어댑터 문장) | **새로고침** — 이미 원하는 상태다 |
| `CATEGORY_IN_USE` | 프로그램이 참조 중이다 | `'N개 프로그램이 이 카테고리를 사용 중입니다. 먼저 그 프로그램들의 분류를 바꿔 주세요.'` | **프로그램의 분류를 먼저 바꾼다** — 재시도는 무의미 |
| `CATEGORY_HAS_CHILDREN` | 중분류가 달려 있다 | `'하위 카테고리 N개가 있습니다. 먼저 하위를 옮기거나 삭제해 주세요.'` | **하위를 먼저 정리한다** — 재시도는 무의미 |

**판정 순서는 사용 중 → 하위 있음** 이다(저장소·화면이 그 순서이고, 그것이 운영자가 먼저 해결해야 하는 순서이기도 하다 — 프로그램의 분류를 옮기지 않으면 하위를 지울 수도 없다).

**그리고 `HttpError` 에 `code` 를 실을 자리가 필요하다**(§6.1). `status` 만으로 세 갈래를 가를 수 없다.

**이 화면은 복구 경로 하나를 이미 갖고 있다** — 사용량 배지가 `/programs?category=<id>` 링크다(`ProgramCategoriesPage.tsx:249-255`). BE-042 §7.11 #3 이 상품 카테고리에 요청한 바로 그것이 여기서는 구현돼 있다. **문구만 고치면 안내와 경로가 처음으로 맞아떨어진다.** 다만 **상시 안내문은 두 번째 사유를 말하지 않고**(`:514-518` — '사용 중인 카테고리는 삭제할 수 없습니다' 로만 시작한다) '하위 있음' 으로 막힌 운영자는 **버튼의 `title` 을 마우스로 올려 봐야** 이유를 안다(키보드·터치에는 그 경로가 없다).

### 7.4 `'모른다'` 를 표현할 자리가 없다 — 집계 실패를 0 으로 뭉개면 삭제가 열린다 【정합 판정】

**이 리포에는 이미 옳은 형태가 있다.** `carrierDeleteBlock(carrier, usage: number | null)`(`shared/domain/shipment.ts:154-163`)은 사용량을 **3상태**로 받고, `usage === null`(= 조회기 미배선·조회 실패)이면 `CARRIER_DELETE_UNKNOWN`(`'배송 건을 확인하지 못해 삭제할 수 없습니다. 잠시 후 다시 시도해 주세요.'`)을 돌려준다. 그 주석이 규약을 못 박는다(`:150-152`):

> `[미배선은 '삭제 가능' 이 아니다] 조회기가 없으면 fail-closed 로 막는다.`

**프로그램 카테고리에는 그 규약이 없다.** `programCount: number` · `hasChildren: boolean`(`_shared/store.ts:24-25`) — 둘 다 non-nullable 이고, 저장소가 같은 모듈의 배열을 직접 세므로(`:453-459`) '모른다' 가 발생할 여지 자체가 지금은 없다. **그래서 이 화면은 fail-closed 를 구현하지 않은 것이 아니라, 그 상태를 만들 통로가 없어 문제가 드러나지 않고 있는 것이다.**

**서버가 붙는 순간 그 통로가 생긴다.** `programCount` 는 집계 쿼리의 결과이고 집계는 실패할 수 있다.

**판정 — 세 줄로 못 박는다**:

1. **집계에 실패하면 EP-01 은 200 을 내지 않는다.** `programCount: 0` 이나 `hasChildren: false` 로 대체해 200 을 주는 구현을 **금지한다.** 그 응답은 화면에서 **'미사용 · 하위 없음' 으로 읽히고 삭제 버튼이 열린다** — 그다음 삭제 요청은 서버의 실시간 판정(EP-04 검증 9·10)이 막지만, 운영자는 **왜 막히는지 모르는 상태로** '잠시 후 다시 시도' 를 반복한다(§7.3). 조용한 거짓 성공이 프론트 온리 앱의 최악 실패 모드이고, **여기서는 조용한 거짓 '삭제 가능' 이 그 형태다.**
2. **EP-04 의 판정 근거는 언제나 서버의 실시간 값이다**(검증 11). 요청의 어떤 값도, 프론트가 본 스냅샷도 근거가 되지 않는다. 프론트의 버튼 잠금은 **스냅샷 기반이라 반드시 뚫리고**, 그것이 뚫린다는 전제 위에 이 계약이 서 있다.
3. **부분 집계를 내려보내지 않는다.** 카테고리 8건 중 5건만 집계에 성공했다면 나머지 3건을 0 으로 채워 200 을 주는 것이 아니라 전체를 실패시킨다 — 한 화면 안에서 어떤 배지는 사실이고 어떤 배지는 거짓인 상태를 만들지 않는다.

**프론트 후속(선택)**: `programCount`/`hasChildren` 를 `number | null` / `boolean | null` 로 넓히고 `carrierDeleteBlock` 과 같은 3상태 술어를 세우면 **부분 실패도 정직하게 표현**할 수 있다. 그러나 위 판정 1이 서면 그 상태가 애초에 오지 않으므로, **넓히는 것은 선택이고 판정 1은 필수다**(§7.12 #4).

### 7.5 이름 유일성 — 서버가 강제하고, 409 가 아니라 422 로 낸다 【정합 판정】

`programCategorySchema`(`validation.ts:105-109`)가 `requiredText` 뿐이고 저장소도 그냥 append 한다(`_shared/store.ts:484-491`). **같은 대분류 아래 '음향기기' 를 두 번 만들 수 있고, 서로 다른 대분류 아래에서도 만들 수 있다.**

**이것이 만드는 사고**: 프로그램 폼의 중분류 셀렉트(FS-074-EL-038.1)에 **같은 이름이 두 개** 뜬다 — 운영자는 어느 것을 골라야 할지 알 수 없고, 그 선택이 목록 필터·롤업 집계를 갈라놓는다('음향기기 3' 과 '음향기기 1' 이 나란히 보인다). 게다가 **§7.6 의 동기 락·멱등키 부재로 연타 하나가 정확히 이 사고를 만든다** — 같은 이름의 요청이 두 번 나가고 둘 다 성공한다.

**판정**: 서버가 `name` 에 유일 제약을 걸고 위반 시 **422 `DUPLICATE_CATEGORY_NAME`** + `error.fields: [{ field: 'name', message: '이미 있는 카테고리 이름입니다.' }]` 를 낸다.

**유일성의 범위는 도메인 확정 대상이다** — 전역 유일인가, **같은 부모 아래에서만** 유일인가. 후자가 자연스럽다('테크·가전 > 액세서리' 와 '리빙·생활 > 액세서리' 는 서로 다른 분류다). **정규화 기준**(trim · 대소문자 · 공백·중점 처리)도 함께 정해야 한다(§7.12 #5).

**왜 409 가 아닌가**: 409 의 UX 는 '다른 사용자가 먼저 변경했다 → 최신을 불러올까?' 인데, **중복 이름에 '최신 불러오기' 는 해결책이 아니다.** 사용자가 할 일은 **다른 이름을 치는 것**이므로 **그 입력에 인라인 오류**가 붙어야 한다. BE-042 §7.3 과 같은 판정이다.

**프론트 후속**: 422 필드 매핑 경로가 **이 화면에 없다**(§7.6) — 서버가 422 를 정확히 내려도 화면은 generic 배너로 뭉갠다.

### 7.6 이 화면이 프레임워크의 절반을 상속하지 못한다 【연동 판정】

**이 판정이 §7.3·§7.5·§7.8 의 프론트 측 공통 원인이다.** BE-042 §7.4 가 상품 카테고리에 내린 것과 **같은 결함이 그대로 복제됐다.**

`ProgramCategoryFormModal` 은 `useCrudForm` 을 쓰지 않고 `useForm` + `useCrudCreate`/`useCrudUpdate` 를 **직접** 조립한다(`:11,66-75,103-113`). 목록도 `useCrudList` 가 아니라 `useCrudListQuery`/`useCrudDelete` 를 직접 쓴다(`ProgramCategoriesPage.tsx:327-331`).

| 장치 | 정본 | 이 화면 |
|---|---|---|
| **status 분기**(404 · 409 · 422+fields · 그 밖) | `useCrudForm.ts:186-225` | **없다** — `isAbort` 만 보고 전부 generic 배너(`ProgramCategoryFormModal.tsx:97-100` · `ProgramCategoriesPage.tsx:396-399`) |
| **conflict 다이얼로그**(입력 보존 + 최신 불러오기/닫기) | `useCrudForm.ts:193-206` | **없다** — 409 가 generic 배너로 뭉개진다(§7.8) |
| **422 필드 매핑 + 포커스** | `useCrudForm.ts:209-219` | **없다**(§7.5) |
| **동기 제출 락(`submitLockRef`)** | `useCrudForm.ts:130,229-230` | **없다** — RHF `handleSubmit` 이 비동기라(`:127`) 연타 창이 열려 있다 |
| **제출 시도 단위 멱등키** | `useCrudForm.ts:145-150,238` → variables → `crud.ts:229,243` | **없다** — `create.mutate({ input, signal })`(`:111`)에 키가 없다. **어댑터 원장(`crud.ts:193,232,245`)이 영원히 발현되지 않는다** |
| **행 단위 `deletingId`** | `useCrudList.tsx:252` | **없다** — `deleting` 이 화면 단위(`ProgramCategoriesPage.tsx:332`)라 한 행을 지우는 동안 **모든 행의 삭제 버튼이 잠긴다** |
| **`onSuccess` 의 `aborted` 가드** | `useCrudForm.ts:245` · `useCrudList.tsx:169` | **삭제만 갖고 있다**(`ProgramCategoriesPage.tsx:392`). **모달 저장에는 없다**(`:105,112`) — 취소된 요청이 완료되면 **닫힌 모달의 성공 토스트**가 뜬다 |
| **reference code(5xx)** | `useCrudForm.ts:222` → `FormServerError` | **없다** — 고정 문구뿐 |
| **409 문장 보존**(단건 삭제) | `useCrudList.tsx:65-68`(`deleteErrorMessage`) | **없다** — 어댑터가 들고 온 문장을 버린다 |

**마지막에서 넷째 줄(락 + 멱등키)이 §7.5 와 만나 실제 사고가 된다**: 연타 → 요청 2건 → 유일 제약이 없으므로 둘 다 성공 → **같은 이름의 카테고리 2개**. 유일 제약이 생겨도(§7.5) 멱등키가 없으면 **두 번째 요청이 422 를 받아** 성공한 등록이 실패로 보인다.

**판정**: 이 문서는 **계약을 그에 맞춰 낮추지 않는다.** 서버는 `Idempotency-Key`(EP-02·EP-03)를 **요구**하고, 409 를 `code` 로 갈라 내리며, 422 `error.fields` 를 정확히 낸다. **프론트가 그것을 받도록 바뀌어야 한다** — 그 작업의 형태는 BE-042 §7.4 가 이미 판정한 둘 중 하나이며(모달을 `useCrudForm` 위로 이관 / 손으로 더하기) **같은 모양의 모달이 앱에 여럿이라 한 화면의 문제가 아니다.**

**해소된 것도 정확히 적는다**: **FEEDBACK-06(모달 4경로 dirty 가드)은 이 화면이 충족한다** — `useModalDirtyGuard(isDirty && !saving, onClose)` 를 `Modal.onClose`(`:123`)와 취소 버튼(`:132`)에 **둘 다** 넘겨 Esc·딤·×·취소를 한 번에 덮고, 파기 확인을 모달 **밖**에 렌더한다(`:197`). 그리고 **검증 실패 시 이름 입력으로 포커스를 옮긴다**(`:127` — `handleSubmit(onValid, () => nameRef.current?.focus())`). 그 계약은 상속했다.

### 7.7 라벨 전파는 서버가 트랜잭션으로 한다 — 또는 조인이 그것을 없앤다 【정합 판정】

`updateProgramCategory`(`_shared/store.ts:493-510`)가 카테고리 이름을 바꾸면서 **그 카테고리를 쓰는 프로그램의 `categoryLabel` 도 함께 갱신**한다(`:507-509`). 픽스처는 같은 함수 안에서 두 배열을 한 번에 바꾸므로 **원자적**이다.

**판정**: **픽스처가 임시로 하는 일이며 계약이 아니다.** `Program.categoryLabel` 은 **비정규화 조인값**이고(BE-074 §3) 서버는 두 선택지를 갖는다:

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `categoryLabel` 을 **저장하지 않고 조회 시 조인**한다 | 전파가 필요 없다 — 정합성이 구조적으로 보장된다. 카테고리 수가 작아(§7.10) 조인 비용이 무시할 만하다. **EP-03 의 타임아웃도 5초로 돌아온다** |
| **B** | 비정규화 컬럼을 두고 EP-03 이 **같은 트랜잭션에서** 프로그램을 갱신한다 | 프로그램 목록 조회가 빠르다. 그러나 전파가 부분 실패하면 **일부 프로그램만 옛 이름을 단다** — 트랜잭션 필수이고, 프로그램 수에 비례해 EP-03 이 느려진다(§2 의 10초는 이 안을 전제한 값이다) |

**A 를 권한다**(BE-042 §7.10 과 같은 판정). **프론트는 어느 안이든 무변경이다** — `Program.categoryLabel` 이 응답에 있기만 하면 된다.

**단 하나가 계약에 걸린다**: `labelOf`(`_shared/store.ts:234-235`)가 없는 `categoryId` 에 **id 를 그대로 뱉는다**(`?? categoryId`). 서버는 고아 `categoryId` 를 애초에 만들지 않고(EP-04 의 사용 중 차단이 그것을 막는다), 그럼에도 생기면 **id 노출이 아니라 명시적 표기**('(삭제된 분류)')로 내려야 한다.

**그리고 어느 안이든 캐시 무효화가 함께 가야 한다**: 이 화면의 성공은 `['program-categories','list']` 만 무효화하는데(`crud.ts:335,357-358`) 프로그램 화면은 `[programs,'category-options']` 와 `[programs,'list']` 를 본다. **이름을 고쳐도 프로그램 목록의 라벨과 필터 선택지가 새로고침 전까지 낡은 값을 보인다**(§7.12 #7 · BE-074 §7.12 #14).

### 7.8 낙관적 동시성 토큰이 없다 — 동시 편집은 last-write-wins 【정합 판정】

**절반은 이미 옳다.** `createStoreAdapter.update`/`remove` 가 없는 id 를 **409 로 막는다**(`crud.ts:256-258,275-277`) — 그전 store 의 `map`/`filter` 는 없는 id 를 조용히 지나치고 성공을 반환해 **유령 저장**이었다. 그것은 해소됐다.

**그러나 그것은 '존재 여부' 기반이지 낙관적 동시성 토큰이 아니다.** `ProgramCategory` 에 `version`/`updatedAt`/`ETag` 가 **없고**(`:15-20` 전수) 어댑터가 `If-Match` 를 보내지 않는다(grep 0건).

| 시나리오 | 현재 동작 |
|---|---|
| A 가 모달을 열고, B 가 그 카테고리를 **삭제**한 뒤, A 가 저장 | **409 가 발생한다** ✔. **그러나 화면이 generic '저장하지 못했습니다' 로 뭉갠다**(§7.6) ✕ |
| A 가 모달을 열고, B 가 **이름을 수정**한 뒤, A 가 저장 | 둘 다 존재하므로 409 가 나지 않는다 → **A 가 B 를 조용히 덮는다** ✕ **last-write-wins** |
| A 가 모달을 열고, B 가 그 대분류에 **자식을 추가**한 뒤, A 가 상위를 바꿔 저장 | `parentLocked` 판정이 **모달을 연 시점의 `hasChildren`** 이라(`ProgramCategoryFormModal.tsx:59`) 셀렉트가 잠기지 않는다 → 저장소가 ⑤로 던진다 ✔ **그러나 그 사유가 generic 문구로 보인다** ✕ |
| 두 관리자가 **재정렬**을 동시에 시도 | **해당 없음** — 순서 필드가 없다(§7.2) |

**이 화면에서 위험이 프로그램(BE-074 §7.6)보다 작다** — 덮이는 값이 이름 한 줄 + 상위 하나다. 그러나 **수정 모달이 행 데이터를 그대로 쓰고 상세를 재조회하지 않아**(`ProgramCategoriesPage.tsx:483,524`) 애초에 `staleTime` 만큼 낡은 값을 편집한다. **그 낡음이 바로 문제다**: 목록이 stale 인 채로 열린 모달은 **자기가 무엇을 덮는지 모른다.** 게다가 이름 수정은 라벨 전파를 동반하므로(§7.7) **덮인 이름이 프로그램 전체로 퍼진다.**

**판정**: `ProgramCategory` 에 **`version: number`**(또는 `updatedAt`)를 더하고 `PUT`/`DELETE` 가 `If-Match: <version>` 을 요구한다. 불일치면 **409 `CONFLICT`** + 응답에 서버 최신본을 싣는다.

**프론트 후속(UI 기획)**: 토큰은 어댑터 본문만으로 붙지 않는다 — 모달이 `editing.version` 을 흘려야 하고, **그전에 409 를 읽는 코드가 있어야 한다**(§7.6). 순서: ① 모달의 status 분기 확보 ② `version` 추가 ③ `If-Match`. **①이 없으면 ②③은 보이지 않는 개선이다.**

### 7.9 심 없는 두 조회 — 하나는 흡수하고 하나는 만들지 않는다 【범위 판정】

**① 상위 카테고리 선택지(EP-05) — EP-01 로 흡수한다.**

모달이 `listProgramCategoryRoots()` 를 **렌더 중 동기로 직접 호출**한다(`ProgramCategoryFormModal.tsx:55`). 이 한 줄은 **페이지가 저장소 모듈을 직접 읽는 이 도메인의 유일한 자리**이고, 그래서 셋이 없다: 로딩 상태 · 실패 상태 · 캐시 무효화 연동.

**판정**: 별도 엔드포인트를 **만들지 않는다** — 1Depth 목록은 EP-01 응답의 부분집합(`parentId === null`)이다. **그러나 프론트 구조가 바뀌어야 한다**: 백엔드가 붙으면 이 한 줄이 비동기가 되고, 모달은 '선택지를 아직 못 읽었다' 와 '대분류가 하나도 없다' 를 **구분해 말해야 한다**(§7.4 와 같은 규약). 지금은 둘 다 `'없음 (대분류)'` 한 항목으로 보인다.

**② 카테고리 단건 조회(EP-06) — 만들지 않는다.**

`fetchOne` 이 존재하나 **화면에 호출부가 0건**이고 **심 주석도 `GET /:id` 를 적지 않는다**. 카테고리는 `label` + `parentId` 뿐이라 **목록 응답이 곧 상세**다. `fetchOne` 은 `CrudAdapter` 인터페이스를 채우기 위한 구현이며, BE-042 §7.6 이 같은 자리에 내린 판정과 같다.

**단 그것이 무해하지는 않다**: 수정 모달이 **낡을 수 있는 목록 스냅샷을 편집한다**(§7.8). `version` 토큰이 그 위험을 막지만, **토큰이 없는 지금은 낡은 값이 최신을 덮고 그 이름이 프로그램 전체로 전파된다**(§7.7).

### 7.10 카테고리 컬렉션은 403 으로 거절하고, 페이징하지 않는다 【보안 판정 · 범위 판정】

**403 vs 404**: BE-003 §3.2 의 원칙 두 줄을 적용하면 **BE-042 §7.5 와 같은 결론**이다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/programs/categories` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 카테고리의 존재도 개인정보가 아니다** → `PUT`/`DELETE /:id` 권한 부족 시에도 **403**.

**근거**: 카테고리는 `id`·`label`·`parentId` 뿐이고 **그 label 은 고객 펀딩 화면의 분류 메뉴에 그대로 공개된다** — 은닉할 것이 없다. 열거로 알아낼 수 있는 것은 이미 공개된 분류 체계다.

**`programCount` 는 공개 값이 아니다** — '이 분류에 12개 프로그램' 은 카탈로그 규모를 드러내는 영업 정보다. 그러나 그것은 **필드 수준 노출**이지 리소스 존재 은닉 문제가 아니다 — 권한 없는 주체는 애초에 200 을 받지 못한다.

**페이징**: **도입하지 않는다.** 카테고리는 **프로그램 목록의 좌측 필터 선택지**로도, **프로그램 폼의 2단 셀렉트**로도 쓰이는 목록이라(BE-074 EP-06) 전량이 한 번에 필요하다. 페이징을 넣으면 프로그램 화면의 필터가 '1페이지의 카테고리만' 보이게 된다. **상한을 두는 것이 옳다** — 대분류·중분류 합쳐 예: 200개. 넘으면 등록을 422 로 막는다. 상한값은 아키텍처 확정.

**다만 FS-075 §7 #3(페이지네이션 부재)은 여전히 quality-bar IA-04 gap 이다** — 위 판정은 '전량 응답이 옳다' 는 것이지 '화면에 200행을 한 번에 그려도 된다' 는 뜻이 아니다. 목록 표현(`<ul>` → 공유 `CrudTable` 이관 · 클라이언트 페이징)은 프론트 결정이며 이 계약과 무관하다.

**집계 비용**: `listProgramCategoryUsage()`(`_shared/store.ts:453-459`)가 카테고리마다 `countProgramsUsingCategory`(프로그램 전량 filter — `:420-422`)와 자식 탐색(카테고리 전량 some — `:457`)을 돈다 — **O(카테고리 × (프로그램 + 카테고리))**. **판정**: 서버는 **집계 쿼리 한 번**(GROUP BY + 자식 존재 여부)으로 낸다. `programCount`·`hasChildren` 는 저장 필드가 아니라 조회 시점 집계값이며(§3) 그 계산 방식은 서버 구현의 자유다 — **이 계약이 정하는 것은 '응답에 정확한 값이 있거나, 아니면 200 을 주지 않는다' 뿐이다**(§7.4).

### 7.11 `operator` 는 조회만 — 그러나 EP-01 의 권한은 좁히지 않는다

**근거**: 카테고리는 **프로그램의 분류 체계**다. 이름을 바꾸면 **그 카테고리를 쓰는 모든 프로그램의 표시가 바뀌고**(§7.7 라벨 전파), 지우면 프로그램이 고아가 된다(그래서 막는다 — §7.3). 즉 카테고리 쓰기는 **프로그램 다수를 한 번에 건드리는 행위**다 — 프로그램 하나를 고치는 것(BE-074 §7.11 이 `admin` 만으로 잠근 것)보다 **영향 범위가 넓다.**

**결론**: EP-01 은 `admin` + `operator`. **EP-02 · EP-03 · EP-04 는 `admin` 만.**

**프론트 영향 — 그리고 이 화면의 결함**: `operator` 로 로그인하면 '카테고리 추가' 버튼은 사라지지만(`canCreate` — `ProgramCategoriesPage.tsx:311,412`) **행의 연필·휴지통은 그대로 보인다**(`:277-300`). `operator` 가 이름을 고치고 '저장' 을 눌러 **403 을 받은 뒤에야** 자기가 할 수 없는 일이었음을 안다 — 그것도 '저장하지 못했습니다. **잠시 후 다시 시도해 주세요.**' 라는 거짓 문구로(§7.6). quality-bar EXC-03 P0 이며 BE-042 §7.8 이 상품 카테고리에 적은 것과 **글자까지 같은 결함**이다(§7.12 #6).

**EP-01 의 권한은 좁히지 않는다.** 프로그램 폼이 카테고리 선택지를 읽는 것은 **프로그램 편집의 일부**다 — `program-categories:read` 를 요구하면 프로그램만 관리하는 역할이 프로그램을 등록하지 못한다. `programs:read` **또는** `program-categories:read` 중 하나면 200 을 준다. **아키텍처 확정 필요**: 권한 모델이 nav 잎에서 파생되는 현재 구조에서는 '이 리소스의 read 는 다른 리소스의 read 로도 만족된다' 를 표현할 자리가 없을 수 있다(BE-042 §7.9 와 같은 제약).

### 7.12 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **심 주석이 차단 사유를 하나만 적었다**(§7.3 · `data-source.ts:36`) — 실제는 둘(사용 중 · 하위 있음). **백엔드가 그 주석만 보고 구현하면 하위 보유 차단이 빠지고 고아 중분류가 생긴다.** 주석부터 고쳐야 한다 | **백엔드 명세 (최우선)** · 프론트 구현 |
| 2 | **집계 실패를 0 으로 뭉개지 않는다**(§7.4) — `programCount: 0`·`hasChildren: false` 로 대체한 200 은 화면에서 **'삭제 가능' 으로 읽힌다.** 이 리포의 `carrierDeleteBlock`(`shared/domain/shipment.ts:154-163`)이 3상태로 이미 세운 규약을 이 도메인은 갖고 있지 않다 | **백엔드 명세 (최우선)** · UI 기획 |
| 3 | **409 를 `code` 로 갈라 낸다**(§7.3) — `CONFLICT` / `CATEGORY_IN_USE` / `CATEGORY_HAS_CHILDREN` 은 복구 수단이 **정반대**다. **`HttpError` 에 `code` 를 실을 자리가 없다**(`http-error.ts:52-67`)인데 BE-003 §2 는 `error.code` 를 '프론트 분기의 유일한 근거' 라고 못박는다 | 백엔드 명세 · **UI 기획/프론트 구현(`HttpError.code`)** |
| 4 | **모달·삭제의 status 분기 확보**(§7.6) — 지금은 403·409·422·500 이 전부 '잠시 후 다시 시도해 주세요' 다. **그중 셋은 영원히 실패하는 실패라 거짓 안내다.** 이것이 #3 의 소비자이며, 이것 없이는 서버가 무엇을 내려도 화면이 같다 | UI 기획 · 프론트 구현 |
| 5 | **이름 유일성 — 서버 제약 + 422 `error.fields`**(§7.5). 범위(전역 vs 같은 부모 아래)와 정규화 기준을 함께 확정한다. 인라인 경로는 #4 가 선행돼야 산다 | 백엔드 명세 · 아키텍처 |
| 6 | **쓰기 게이팅이 '추가' 버튼 하나뿐이다**(§7.11 · `ProgramCategoriesPage.tsx:311`) — 행 수정·행 삭제·모달 저장이 `canUpdate`/`canRemove` 를 묻지 않는다. 조회 전용 역할이 연필과 휴지통을 그대로 보고 누른다(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 7 | **라벨 전파 — 조인(안 A) 또는 트랜잭션(안 B)**(§7.7). 픽스처가 원자적으로 하는 일이며 계약이 아니다. **그리고 이 화면의 무효화가 프로그램 화면에 닿지 않는다** — 두 쿼리 키가 갈려 있다(BE-074 §7.12 #14). `labelOf` 의 id 노출 폴백도 함께 | 백엔드 명세 · UI 기획 |
| 8 | **노출 순서를 도입할지 확정**(§7.2) — `ProgramCategory` 에 `order` 가 없어 목록·필터·셀렉트 셋이 전부 등록 순이다. **도입하면 재정렬 엔드포인트가 함께 생기고 '전량 치환인가 부분 갱신인가' 를 정해야 한다** — 지금은 그 질문이 성립하지 않는다 | **아키텍처 (도메인 경계)** |
| 9 | **`ProgramCategory.version` 도입 + `PUT`/`DELETE` 의 `If-Match`**(§7.8) — 수정 모달이 낡은 스냅샷을 편집하고, 덮인 이름이 §7.7 로 프로그램 전체에 퍼진다. **#4 가 선행돼야 보인다** | 백엔드 명세 · UI 기획 |
| 10 | **멱등키·동기 제출 락 부재**(§7.6) — `create.mutate({ input, signal })`(`ProgramCategoryFormModal.tsx:111`)에 키가 없어 어댑터 원장이 놀고 있다. #5 와 만나면 **같은 이름의 카테고리 2개**가 된다(quality-bar EXC-08 P0). 삭제 쪽은 `DeleteVars` 에 자리 자체가 없다(`crud.ts:363-366`) | UI 기획 · 프론트 구현 · 백엔드 명세 |
| 11 | **상위 셀렉트가 어댑터를 지나지 않는다**(§7.9 · `ProgramCategoryFormModal.tsx:55`) — 백엔드가 붙으면 이 한 줄이 비동기가 되어 **모달의 구조가 바뀐다**(로딩·실패 상태 신설). '아직 못 읽었다' 와 '대분류가 없다' 를 구분해야 한다 | 프론트 구현 · 백엔드 명세 |
| 12 | **모달 저장의 `onSuccess` 에 `aborted` 가드가 없다**(§7.6 · `:105,112`) — 삭제는 정확히 갖고 있다(`ProgramCategoriesPage.tsx:392`). 한 화면 안에서 규약이 갈렸다. **닫힌 모달의 성공 토스트가 뜬다** | 프론트 구현 |
| 13 | **`deleting` 이 화면 단위**(§7.6 · `:332`) — 한 행을 지우는 동안 모든 행의 삭제 버튼이 잠긴다. `useCrudList` 의 `deletingId`(`useCrudList.tsx:252`)를 상속하지 못했다 | UI 기획 쪽 변경 요청 |
| 14 | **집계가 O(카테고리 × (프로그램 + 카테고리))**(§7.10) — 서버는 집계 쿼리 한 번. **카테고리 수 상한**(예: 200)이 필요한지 도메인 확정 | 백엔드 명세 · 아키텍처 |
| 15 | 상시 안내문이 **두 번째 차단 사유를 말하지 않는다**(§7.3 · `:514-518`) — '하위 있음' 으로 막힌 운영자는 버튼 `title` 을 마우스로 올려 봐야 이유를 안다(키보드·터치에는 그 경로가 없다) | UI 기획 쪽 변경 요청 |
| 16 | 401 감지·리다이렉트는 구현됐으나 **미저장 모달 입력이 유실**된다(EXC-19 P1 — 이름 한 줄이라 손실은 작다). 프론트 타임아웃 상한 없음(EXC-05 P1) · 오프라인 감지 없음(EXC-11 P1) | UI 기획 · 프론트 구현 |

## 8. 자기 점검

- [x] FS-075 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 4건(EP-01~EP-04) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명**했다(EP-05 는 EP-01 의 부분집합으로 흡수, EP-06 은 '심 없음(미정)' 으로 판정)
- [x] **엔드포인트를 발명하지 않았다** — `data-source.ts:36` 한 줄의 심에서만 파생했고, **그 주석이 빠뜨린 두 번째 차단 사유는 저장소 코드(`_shared/store.ts:517-519`)를 근거로 계약에 넣었다**(§7.3)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 에 사유 있음 (4행 × 9열 — 심 없는 EP-05·EP-06 은 계약이 없어 행이 없음을 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **고유 차이 넷**(§2 이름 수정만 10초 · §7.10 403 판정 · §7.11 `operator` 조회 전용 · **엔타이틀먼트 매핑 부재 → 플랜 축 없음**)만 근거와 함께 기술
- [x] **2Depth 계층 규칙을 판정 순서 그대로 표로 들어 올렸다**(§3 · §7.1) — 다섯 판정과 **거절 사유 문자열 그대로**. ⑤(하위를 가진 카테고리의 이동 금지)가 상한을 지키는 두 번째 문임을 못 박았다. **순서(order) 필드가 없어 재정렬 계약이 성립하지 않음**을 전수 확인으로 §7.2 에 판정했다
- [x] **삭제 가드를 판정 순서 그대로 표로** 들어 올리고(§3), 그 두 사유가 **화면과 저장소에서 같은 순서·다른 근거 데이터**를 쓴다는 사실을 §7.3 에 남겼다. **미배선/집계 실패를 '삭제 가능' 으로 읽으면 안 된다**는 것을 `carrierDeleteBlock` 대조와 함께 §7.4 【정합 판정】으로 못 박았다
- [x] 멱등성 판정 — 조회 GET 멱등 / 등록·수정은 `Idempotency-Key` 를 **요구**하되 **프론트가 키를 만들지 않아 어댑터 원장이 발현되지 않음**을 §7.6 에 명시(BE-074 와 대조 — 거기서는 키가 도달한다)
- [x] 보안 판정 1건(§7.10 403 vs 404 — 회원·클레임과 반대 결론, 근거 명시) + 정합 판정 6건(§7.1 계층 · §7.3 삭제 차단과 거짓 문구 · §7.4 '모른다' 부재 · §7.5 이름 유일성 · §7.7 라벨 전파 · §7.8 동시성) + 연동 판정 1건(§7.6) + 범위 판정 2건(§7.2 순서 부재 · §7.9 심 없는 두 조회)
- [x] **`createStoreAdapter` 가 준 것(404·409·멱등 원장)과 이 화면이 활용하지 못하는 것을 구분**했다 — `fetchOne` 은 호출부가 없고, 409 는 발생하나 generic 배너로 뭉개지며, 원장은 키가 도달하지 않아 놀고 있다. **'존재 여부' 기반이라 동시 편집은 last-write-wins** 임을 §7.8 표로 못박았다
- [x] **FEEDBACK-06(모달 4경로 dirty 가드)과 검증 실패 포커스를 이 화면이 충족함**을 §7.6 말미에 코드 근거와 함께 기록했다 — 상속하지 못한 것만 적고 상속한 것을 빠뜨리지 않았다
- [x] **확인하지 못한 것을 쓰지 않았다** — 이름 유일성의 범위(전역 vs 부모 아래)와 노출 순서 도입 여부는 '도메인 확정 대상' 으로 남겼다(§7.5 · §7.2)
- [x] 서버 코드·저장소 설계를 쓰지 않았다
