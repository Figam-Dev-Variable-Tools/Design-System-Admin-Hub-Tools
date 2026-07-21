---
id: BE-074
title: "프로그램(후원형 펀딩) 백엔드 기능 명세"
functionalSpec: FS-074
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-074. 프로그램(후원형 펀딩) 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-074 프로그램 (`/programs` · `/programs/:id` · `/programs/new` · `/programs/:id/edit`) |
| 범위 | 프로그램 목록 조회, 상세 조회, **등록**, **수정(전체 치환)**, **삭제(단건·일괄)**. 저장 1회가 본문·이미지 2종·옵션 그룹·리워드를 **한 덩이로** 받는다 |
| **범위 밖** | **모금액·후원자 수의 갱신** — 후원이 만드는 값이라 `ProgramInput` 에 없다(`_shared/store.ts:112-128`). 이 계약은 그 둘을 **읽기만** 한다(§7.1). **후원(결제) 실행** — 상세의 후원 CTA 는 `<span>` 이고 관리자가 대신 후원하지 않는다(`ProgramDetailPage.tsx:169-172`). **카테고리 CRUD** — BE-075 소관이며 이 계약은 선택지를 **읽기만** 한다(§7.8 · EP-06). **프로그램 문의** — FS-076 소관. PG 를 끄면 CTA 가 그 창구를 가리키지만 문의 자체는 다른 계약이다(§7.5). **결제(PG) 설정의 저장** — `payment-settings.ts:190-193` 이 자기 심을 갖는 별개 계약이다. **SKU·재고** — 펀딩에 그 축이 없다(`_shared/store.ts:38-45`) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 날짜는 `YYYY-MM-DD` |
| 프론트 어댑터 | `apps/admin/src/pages/programs/data-source.ts` (`programAdapter` = 공용 `createStoreAdapter` · 전용 함수 `fetchProgramCategoryOptions`) |
| 도메인 타입 | `apps/admin/src/pages/programs/_shared/store.ts`(`Program` · `ProgramInput` · `ProgramOptionGroup` · `ProgramReward` · 파생 함수 3개 · 옵션 정리 규칙 2개) + `types.ts`(표시·필터 규칙) + `shared/commerce/payment-settings.ts`(CTA 축) |
| 검증 정본 | `apps/admin/src/pages/programs/validation.ts` 의 `programSchema` — 필드 규칙 + 교차 refine 2건(기간 순서 · 리워드 참조 무결성). 저장 경로는 `toInput`(`ProgramFormPage.tsx:718-751`)이 정규화까지 한 뒤 어댑터로 보낸다 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 프로그램 도메인 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 1건이 CRUD 다섯을 전부 덮는다 | `data-source.ts:26` `// TODO(backend): GET/POST /api/programs · PUT/DELETE /api/programs/:id` |
| 파일 머리말이 **카테고리 삭제 차단의 서버 계약**을 미리 적는다 | `data-source.ts:3-4` `카테고리는 삭제 차단(사용 중·하위 있음)을 store 가 강제한다 — 서버는 409 로 같은 규칙을 건다.` (실행은 BE-075 소관) |
| 카테고리 선택지 조회에 **`// TODO(backend)` 주석이 없다** | `data-source.ts:49-55` (`fetchProgramCategoryOptions`) — 같은 파일의 두 어댑터는 갖고 있다(`:26,36`) |
| 어댑터가 **공용 `createStoreAdapter`** 다 — 404·409·멱등 원장이 화면 코드 0줄로 온다 | `data-source.ts:27-34` → `crud.ts:190-284` |
| **달성률·목표 달성·남은 일수는 필드가 아니라 함수**다 | `_shared/store.ts:6-8`(사유) · `:144-164`(정의) · 회귀 `programs.test.ts:47-89` |
| **모금액·후원자 수는 저장 필드**이며 입력에 없다 | `_shared/store.ts:91-92`(필드) ↔ `:112-128`(`ProgramInput` 에 부재) · `:401-402`(등록 시 0) · `:410`(수정 시 보존) |
| **상태 전이 규칙이 어느 층에도 없다** | `validation.ts:58` (`z.enum` 뿐) · 저장소에 전이 술어 0건 · 폼 셀렉트가 5개 전부 열려 있다(`types.ts:40-46`) |
| `categoryLabel` 은 **서버가 파생해 저장**한다 | `_shared/store.ts:76-77`(주석) · `:400,410`(`labelOf(input.categoryId)`) · `:234-235`(없는 id 는 **id 를 그대로 뱉는다**) |
| **`reward.claimedCount` 가 요청 바디에 있다** | `_shared/store.ts:61`(필드) → `:127`(`ProgramInput.rewards`) → `ProgramFormPage.tsx:770-773`(`toValues` 복사) → `:745-749`(`toInput` 통과) |
| 리워드·옵션 **id 를 클라이언트가 만든다** | `ProgramFormPage.tsx:370`(`pog-${crypto.randomUUID()}`) · `:485`(`rw-${crypto.randomUUID()}`, 주석은 '저장 뒤 서버가 준 id 로 대체된다'고 적는다) |
| 후원된 리워드 삭제 차단의 **유일한 근거가 `claimedCount`** 다 | `ProgramFormPage.tsx:661-668` · 사유 주석 `:471-472` (`서버도 같은 이유로 막는다`) |
| 저장 경로가 **옵션 정리 → 리워드 참조 정리 순서**를 지킨다 | `ProgramFormPage.tsx:719-722` · 규칙 `_shared/store.ts:178-198,206-217` · 회귀 `programs.test.ts:509-578` |
| PG 판정이 **fail-closed** 다 | `payment-settings.ts:128-130`(`usePg && merchantId.trim() !== ''`) · `:120-122`(사유) · 기본값 `usePg: false`(`:179-186`) |
| CTA 를 **어디에도 저장하지 않는다** | `payment-settings.ts:133-138` · 소비 `ProgramDetailPage.tsx:323,398-410` |
| **`version`/`updatedAt`/`If-Match` 가 없다** | `apps/admin/src/pages/programs` 전체 grep **0건**(실측 2026-07-22) · `_shared/store.ts:72-110` 전수 확인 |
| 409 는 **존재 기반**이고, 화면이 그것을 **실제로 해소한다** | `crud.ts:256-258,275-277` ↔ `useCrudForm.ts:193-206` → `ProgramFormPage.tsx:1402`(`FormConflictDialog`) |
| 멱등키가 **호출부에서 어댑터까지 도달한다** | `useCrudForm.ts:145-150,238,255,262` → `crud.ts:229,243` → 원장 `:193,232,245` |
| **삭제에는 멱등키가 없다** | `crud.ts:363-366`(`DeleteVars` 에 키 필드 부재) · 호출부 `useCrudList.tsx:164,196` |
| 목록 정렬 함수가 **없다** | `data-source.ts:29`(`list: listPrograms`) · `StoreAdapterSpec` 에 `sort` 자체가 없다(`crud.ts:174-182`) |
| 이 라우트는 **어떤 엔타이틀먼트 모듈에도 속하지 않는다** | `shared/entitlements/module-resources.ts:29-91` 전수 — `/programs` 계열 0건 |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회 계열(목록·상세·카테고리 선택지)만**. 등록·수정·삭제는 **403**(§7.11).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. **저장은 옵션·리워드를 포함한 한 덩이라 10초 → 504**(§7.3).
- **엔타이틀먼트**: 이 리소스는 **어떤 모듈에도 매핑되지 않는다**(`module-resources.ts:29-91`). 따라서 플랜 판정은 `granted` 로 수렴하며(fail-open — `route-entitlement.ts` 의 '판정 실패가 기능 정지가 되면 안 된다'), **이 계약의 응답 코드에 플랜 축이 없다**. 서버는 권한(403/404)만 말한다.
- **권한 리소스가 `/programs/categories`·`/programs/inquiries` 와 갈린다**: `findCoveringLeaf` 의 '더 긴 잎이 더 구체적이다' 규칙(`nav-config.ts:382-391`)에 따라 세 잎이 별개 리소스다. 다만 `/programs/:id` · `/programs/new` · `/programs/:id/edit` 는 전부 `/programs` 잎에 덮인다 — 목록·상세·폼이 **한 권한 리소스**다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 세 층으로 게이팅한다(껍데기 · 화면 CTA · 폼 `canSubmit`). 그 전부가 UX 이며 위조된 로컬 권한 스토어로 우회된다.

## 3. 데이터 계약 (`_shared/store.ts` · `types.ts` · `shared/commerce` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Program` | `id` · `title` · `categoryId` · **`categoryLabel`** · `creator` · `summary` · `story` · `description` · `goalAmount` · **`pledgedAmount`** · **`backerCount`** · `startDate` · `endDate` · `status` · `coverImageUrl` · `thumbnailUrl` · `optionGroups[]` · `rewards[]` | 목록·상세·폼이 **같은 타입**이다. `story`·`description` 은 **sanitize 된 HTML**(`:82-86`). `categoryLabel` 은 비정규화 조인값 |
| `ProgramInput` | `Program` − `id` − `categoryLabel` − `pledgedAmount` − `backerCount` | **14 필드 + 배열 2개.** 모금액·후원자 수·라벨이 빠진 것이 이 계약의 핵심 경계다(§7.1). 그러나 **`rewards[].claimedCount` 는 그대로 들어 있다**(§7.4) |
| `ProgramOptionGroup` | `id` · `name` · `values[]` | **`variants` 가 없다** — 펀딩에는 조합마다 값을 붙일 축(재고·SKU)이 없다(`:38-45`). 최대 3개(`MAX_PROGRAM_OPTION_GROUPS`) |
| `ProgramReward` | `id` · `title` · `amount` · `description` · `limitCount`(0=무제한) · **`claimedCount`** · `optionGroupIds[]` | **정의는 프로그램이 갖고 적용은 리워드가 고른다**(`:62-69`). 개수 상한 없음 |
| `ProgramCategory` | `id` · `label` · `parentId`(null=1Depth) | **BE-075 가 소유한다.** 이 계약은 EP-06 으로 읽기만 한다 |
| `PaymentSettings` | `usePg` · `provider` · `merchantId` · `mode` · `methods[]` · `inquiryGuide` | **결제 설정 계약이 소유한다**(`payment-settings.ts:190-193`). 이 계약은 CTA 파생에만 읽는다(§7.5) |
| 상수 | `PROGRAM_TITLE_MAX = 60` · `PROGRAM_SUMMARY_MAX = 120` · `PROGRAM_DESCRIPTION_MAX = 2000` · `MAX_PROGRAM_OPTION_GROUPS = 3` | `_shared/store.ts:130-139`. **스토리 상한은 없다**(§7.10) |

**진행 상태 (`STATUS_META` — `types.ts:24-30`, 표시)**

| 값 | 라벨 | 톤 | 흐름상 위치 |
|---|---|---|---|
| `draft` | 작성 중 | neutral | 등록의 기본값(`ProgramFormPage.tsx:711`) |
| `scheduled` | 오픈 예정 | info | 기간 시작 전 |
| `live` | 진행 중 | success | 모금 중 |
| `succeeded` | 성공 | success | 종료 — 목표 달성 |
| `failed` | 실패 | danger | 종료 — 목표 미달 |

**전이 규칙 표 — 만들 수 없다. 코드에 술어가 없기 때문이다.**

`programSchema.status` 는 `z.enum(['draft','scheduled','live','succeeded','failed'])` 하나이며(`validation.ts:58`) **형태만 본다**. 저장소·타입·화면 어디에도 `canTransition`/`transitionBlock` 류 함수가 없고(grep 0건), 폼의 상태 셀렉트는 `PROGRAM_STATUS_OPTIONS` 5개를 **언제나 전부** 그린다(`types.ts:40-46` → `ProgramFormPage.tsx` 펀딩 설정 구획). 즉 **화면 disabled 도, 저장 거절도, 사유 문자열도 존재하지 않는다.** 상태를 읽는 유일한 술어는 표시 규칙 둘이다:

| 술어 | 정의 | 쓰는 곳 | 성격 |
|---|---|---|---|
| `daysLeftText(program)` | `succeeded\|failed` → `'종료'` · `draft` → `'—'` · 그 밖 `daysLeft` 0 이면 `'오늘 마감'`, 아니면 `N일` (`ProgramListPage.tsx:143-148`) | 목록 '남은 일수' 열 | **표시 전용** |
| `ended = status === 'succeeded' \|\| status === 'failed'` | `ProgramDetailPage.tsx:314` | 상세의 후원 CTA **노출 여부** | **표시 전용** — 저장을 막지 않는다 |

**판정은 §7.2 에 있다.** 이 표의 부재가 이 계약에서 가장 큰 공백이다.

**파생 규칙 (순수 — `_shared/store.ts:144-164`, 회귀 `programs.test.ts:47-89`)**

| 함수 | 정의 | 저장 여부 |
|---|---|---|
| `fundingRate(goal, pledged)` | `goal <= 0` 이면 **0**(0으로 나누지 않는다) · 그 밖 `round(pledged/goal*100)`. **100 을 넘을 수 있다** | **저장하지 않는다** |
| `isGoalReached(goal, pledged)` | `goal > 0 && pledged >= goal` — 목표 0 은 달성으로 치지 않는다 | **저장하지 않는다** |
| `daysLeft(endDate, today)` | 종료일 포함, 이미 지났으면 **0**. 날짜를 못 읽어도 **0**(`:161`) | **저장하지 않는다** |
| `fundingSummary` / `fundingTone` | `'143% · 14,320,000원'` / 달성이면 success (`types.ts:167-175`) | **저장하지 않는다** |
| `checkoutCta(settings, 'program')` | §7.5 | **저장하지 않는다** |
| `categoryLabel` | `labelOf(input.categoryId)`(`_shared/store.ts:400,410`) | **저장한다**(비정규화 — §7.8) |

**옵션·리워드 정리 규칙 (순수 — 회귀 `programs.test.ts:509-578`)**

| 규칙 | 정의 |
|---|---|
| `normalizeProgramOptionGroups(groups)` | 셋을 버린다: 값이 하나도 없는 그룹 · 값 안의 빈 문자열/중복 · **이름이 같은 그룹(뒤엣것)**. 이름이 빈 그룹도 버린다(`_shared/store.ts:178-198`) |
| `applyOptionGroupsToRewards(rewards, groups)` | 살아 있는 그룹 id 만 남긴다. 바뀌지 않은 리워드는 **같은 참조를 돌려준다**(`:206-217`) |
| 순서 | **옵션을 먼저 눕히고 그다음 리워드를 맞춘다**(`ProgramFormPage.tsx:719-722`). 뒤집으면 가리킬 곳 없는 id 가 저장된다 |

**검증 규칙 (`programSchema` — 서버가 정본이어야 한다)**

| 필드 | 규칙 | 근거 |
|---|---|---|
| `title` · `creator` · `summary` | 공백만 금지 + 각각 60 · 40 · 120자 | `validation.ts:38,40,41` |
| `categoryId` | 길이 ≥ 1 — `'카테고리를 선택하세요.'` | `:39` · 회귀 `programs.test.ts:327-331` |
| `story` | **없다** — 창작자의 서술을 자르지 않는다. 화면의 5000 은 작성 가이드다 | `:46` 주석 · 회귀 `:413-418` |
| `description` | `richTextLength(value) <= 2000` — **마크업이 아니라 평문 길이** | `:43-51` · 회귀 `:401-412` |
| `goalAmount` | `/^\d+$/` + `Number(...) > 0` (문자열로 받는다) | `:52-55` · 회귀 `:332-339` |
| `startDate` · `endDate` | 각각 필수 + **`startDate <= endDate`**(오류를 `endDate` 에 붙인다). 같은 날 허용 | `:56-57,83-86` · 회귀 `:340-356` |
| `status` | `z.enum` 5값 — **형태만**(§7.2) | `:58` |
| `coverImageUrl` · `thumbnailUrl` | **`z.string()` 뿐** — 형식·용량·비율·URL 유효성 검증 없음 | `:59-60` |
| `optionGroups` | ≤3개 · **값이 있는데 이름이 없는 그룹 금지** · **이름 중복 금지**. 값이 빈 그룹은 막지 않는다 | `:64-79` · 회귀 `:420-494` |
| `rewards` | **타입만 본다** — 제목이 비어도, 금액이 0이어도 통과한다 | `:19-28`(§7.10) |
| 폼 레벨 | 리워드는 **정의된 옵션 그룹만** 가리킬 수 있다 | `:89-100` · 회귀 `:496-506` |

## 4. 엔드포인트 명세

### BE-074-EP-01 · 프로그램 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-074-EL-003.1, EL-004.1, EL-004.2, EL-007, EL-011, EL-013~EL-016.9, EL-019, EL-020, EL-021 |
| 심 | `data-source.ts:26` `GET /api/programs` |
| 메서드·경로 | `GET /api/programs` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.10) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 상태 필터·카테고리 롤업 필터·검색을 **전부 클라이언트에서** 수행하므로 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다(`crud.ts:199-200`).

**응답 200** — `readonly Program[]`(**상세 전문 그대로** — 목록도 `story`·`description`·`optionGroups`·`rewards` 전부를 받는다). **정렬은 서버가 정본이다** — 어댑터에 정렬 함수가 없어(`crud.ts:174-182` 의 `StoreAdapterSpec` 에 `sort` 자체가 없다) 응답 순서가 그대로 화면 순서가 된다. 현재는 등록 순이며 정렬 UI 도 없다(§7.10).

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-074-EP-02 · 프로그램 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-074-EL-025, EL-029~EL-034, EL-038~EL-048.1(폼 진입), EL-054 |
| 심 | `data-source.ts:26` `GET /api/programs/:id` |
| 메서드·경로 | `GET /api/programs/:id` |
| 권한 | `admin`, `operator`. 프로그램 도메인 읽기 권한 없음 → **403**(§7.7) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Program`. **상세 화면과 수정 폼이 같은 쿼리 키를 공유한다**(`[programs,'detail',id]` — `ProgramDetailPage.tsx:264` ↔ `useCrudItem`(`crud.ts:302-311`)). 하나의 응답이 두 소비자를 먹인다.

**에러**: 400(id 형식) · 401 · 403 · **404 `PROGRAM_NOT_FOUND`** · 429 · 500 · 504.

> **어댑터는 이미 옳다**: `createStoreAdapter.fetchOne` 이 없는 id 에 **`HttpError(404, '항목을 찾을 수 없습니다.')`** 를 던지고(`crud.ts:217-219`) 화면·폼이 그것을 404 분기로 읽는다(`ProgramDetailPage.tsx:280` · `useCrudForm.ts:171-176`). 응답 404 를 같은 타입으로 옮기기만 하면 EXC-12 계약이 그대로 유지된다.

---

### BE-074-EP-03 · 프로그램 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-074-EL-006, EL-038~EL-047, EL-050(등록), EL-051, EL-053 |
| 심 | `data-source.ts:26` `POST /api/programs` |
| 메서드·경로 | `POST /api/programs` |
| 권한 | **`admin` 만**(§7.11) |
| 멱등성 | **`Idempotency-Key` 로 멱등하다 — 그리고 프론트가 실제로 키를 보낸다**(§7.6) |
| 레이트리밋 | 분당 60회 |

**바디** — `ProgramInput`: `title` · `categoryId` · `creator` · `summary` · `story` · `description` · `goalAmount`(number) · `startDate` · `endDate` · `status` · `coverImageUrl` · `thumbnailUrl` · `optionGroups[]` · `rewards[]`.

**서버 검증 (순서가 곧 규칙이다)**
1. **필드 검증** — §3 의 검증 표를 그대로 재판정한다. 프론트 검증은 UX 다.
2. **`categoryId` 존재 확인** — 없는 분류면 **422 `CATEGORY_NOT_FOUND`**. `labelOf` 가 없는 id 에 **id 를 그대로 뱉는 폴백**(`_shared/store.ts:234-235`)을 서버가 복제해서는 안 된다 — 내부 식별자가 고객 화면에 새어 나간다(§7.8).
3. **파생값을 요청에서 받지 않는다** — `pledgedAmount` · `backerCount` · `categoryLabel` 은 바디에 **없어야 하고**, 있으면 무시한다. 등록은 `pledgedAmount = 0` · `backerCount = 0` 으로 시작한다(`_shared/store.ts:401-402`).
4. **`rewards[].claimedCount` 를 무시한다** — 등록에서는 언제나 0 이다(§7.4 【보안 판정】).
5. **id 를 서버가 채번한다** — 프로그램 id 는 물론 **옵션 그룹 id·리워드 id 도** 서버가 배정한다. 요청의 `pog-<uuid>`·`rw-<uuid>` 는 **한 요청 안에서 리워드가 그룹을 가리키는 임시 참조**로만 읽고 저장하지 않는다(§7.4).
6. **옵션·리워드 정리** — `normalizeProgramOptionGroups` → `applyOptionGroupsToRewards` **순서로** 재실행한다. 프론트가 `toInput` 에서 이미 하지만(`ProgramFormPage.tsx:719-722`) 정본은 서버다.
7. **HTML 재정화** — `story`·`description` 은 **서버가 다시 sanitize 한다**. 프론트의 저장 지점 sanitize(`:733,736`)는 두 번째 방어선이지 첫 번째가 아니다.

**응답 201/204**. 프론트 `create(input, context): Promise<void>` — 응답 본문을 읽지 않고 목록을 무효화한 뒤 `/programs` 로 이동한다(`useCrudForm.ts:244-251`). **id 를 쓰지 않는다.**

**에러**: 400 `VALIDATION_FAILED`(`error.fields` — 필드 이름은 `programSchema` 의 키와 같아야 한다) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **422 `CATEGORY_NOT_FOUND`** · **422 `INVALID_PERIOD`**(`error.fields: [{ field: 'endDate' }]`) · **422 `INVALID_OPTION_GROUPS`** · **422 `INVALID_REWARD_REFERENCE`**(`error.fields: [{ field: 'rewards' }]`) · 429 · 500 · 504.

> **`error.fields` 의 이름이 계약이다**: `useCrudForm.handleWriteError` 가 422 의 `violations` 를 **RHF `setError` 로 그 입력에 꽂고 첫 위반으로 포커스를 옮긴다**(`useCrudForm.ts:209-219`). 필드 이름이 `ProgramFormValues` 의 키(`title`·`categoryId`·`goalAmount`·`endDate`·`optionGroups`·`rewards` …)와 일치해야 그 경로가 산다. **다만 `optionGroups`·`rewards` 는 인라인 슬롯이 구획 하단 `role="alert"` 한 줄뿐이라**(`ProgramFormPage.tsx:449-453,689-693`) 어느 그룹·어느 행인지 말하지 못한다(§7.12 #7).

---

### BE-074-EP-04 · 프로그램 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-074-EL-017(연필), EL-026(상세 '수정'), EL-038~EL-047, EL-050(수정), EL-052, EL-054 |
| 심 | `data-source.ts:26` `PUT /api/programs/:id` |
| 메서드·경로 | `PUT /api/programs/:id` |
| 권한 | **`admin` 만**(§7.11) |
| 멱등성 | 멱등(PUT) + **`Idempotency-Key` 가 실제로 도달한다**(§7.6) |
| 레이트리밋 | 분당 60회 |

**바디** — EP-03 과 같은 `ProgramInput`. **전체 치환이다** — 폼이 14 필드 + 옵션 그룹 전체 + 리워드 전체를 매번 다시 보낸다.

**서버 검증** — EP-03 의 1~7 + 아래.
8. **불변·서버 소유 필드 유지**: `pledgedAmount` · `backerCount` 는 요청에 없고, 있어도 **저장된 값을 유지**한다(`_shared/store.ts:410` 이 `{ ...program, ...input }` 으로 그것을 보존하는 것과 같은 결과). `rewards[].claimedCount` 는 **요청 값을 무시하고 저장된 값을 유지**한다(§7.4).
9. **후원된 리워드를 지우지 않는다**: 저장된 `claimedCount > 0` 인 리워드 id 가 요청의 `rewards[]` 에서 사라졌으면 **422 `REWARD_IN_USE`**. 프론트가 같은 이유로 버튼을 잠그지만(`ProgramFormPage.tsx:661-668`) 그것은 UX 이고 **판정 근거가 요청 바디 안에 있다**(§7.4).
10. **부분 적용 금지** — 본문·이미지·옵션·리워드는 **한 트랜잭션**이다(§7.3).

**응답 200/204**.

**에러**: EP-03 의 전부 + **404 `PROGRAM_NOT_FOUND`** · **409 `CONFLICT`**(§7.6) · **422 `REWARD_IN_USE`**.

> **어댑터의 409 와 화면의 해소가 이미 짝을 이룬다**: `createStoreAdapter.update` 가 없는 id 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던지고(`crud.ts:256-258`), `useCrudForm` 이 그것을 **입력을 보존한 채** `FormConflictDialog`(reload / dismiss)로 옮긴다(`:193-206` → `ProgramFormPage.tsx:1402`). **이 도메인은 409 를 실제로 쓰는 소수 화면이다** — 서버가 409 를 낼 때 응답에 서버 최신본을 실으면 `reload` 가 곧바로 그것을 쓴다.

---

### BE-074-EP-05 · 프로그램 삭제 (단건 · 일괄)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-074-EL-009, EL-017(휴지통), EL-022, EL-023 |
| 심 | `data-source.ts:26` `DELETE /api/programs/:id` |
| 메서드·경로 | `DELETE /api/programs/:id` |
| 권한 | **`admin` 만**(§7.11) |
| 멱등성 | 멱등(DELETE). **키 자리가 `DeleteVars` 에 없다**(`crud.ts:363-366` — §7.6) |
| 레이트리밋 | 분당 60회 |

**일괄 삭제도 이 엔드포인트다.** `useCrudBulkDelete` 가 **id 마다 `adapter.remove` 를 부르고** `settleAllDetailed` 로 결과를 모은다(`crud.ts:394-407`). **일괄 전용 엔드포인트를 발명하지 않는다** — 심이 없고 호출부도 단건 반복이다. 화면은 부분 실패를 사유별로 말한다(`bulkDeleteErrorMessage` — `useCrudList.tsx:94-107`): 같은 409 사유는 한 번만, 재시도 가능한 실패가 섞였을 때만 재시도를 권한다.

**서버 검증**
11. **참조 무결성** — 프로그램을 지우면 **그 프로그램을 가리키는 프로그램 문의**(FS-076)가 고아가 된다. 이 계약은 그 검사를 **정의하지 않는다** — 프론트에도 서버에도 코드가 없기 때문이다(§7.12 #9). **후원 이력이 있는 프로그램**(`pledgedAmount > 0` 또는 `backerCount > 0`)의 삭제도 현재 아무 층도 막지 않는다.

**응답 204**.

**에러**: 400(id 형식) · 401 · 403 `FORBIDDEN` · **404 `PROGRAM_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제됨 — 어댑터가 `'이미 삭제된 항목입니다.'` 를 이 자리에서 낸다 · `crud.ts:275-277`) · 429 · 500 · 504.

> **409 문장이 그대로 화면에 뜬다**: `deleteErrorMessage`(`useCrudList.tsx:65-68`)가 409 면 어댑터의 문장을 그대로 보이고 그 밖에만 '잠시 후 다시 시도' 를 권한다. **서버 409 의 `message` 는 사용자가 읽을 문장이어야 한다.**

---

### BE-074-EP-06 · 카테고리 선택지 조회 — **정본은 BE-075 다**
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-074-EL-004, EL-004.1, EL-004.2, EL-004.3, EL-038.1 |
| 심 | **없다** — `fetchProgramCategoryOptions`(`data-source.ts:49-55`)에 `// TODO(backend)` 주석이 없다(§7.9) |
| 메서드·경로 | `GET /api/programs/categories` (**BE-075 EP-01 과 같은 경로**) |
| 권한 | `admin`, `operator` — **`programs:read` 만으로도 200 을 준다**(§7.11) |
| 멱등성 | 멱등(GET) |

**응답 200** — `readonly ProgramCategory[]`(`id` · `label` · `parentId`). **이 문서는 엔드포인트를 만들지 않고 소비 사실만 기록한다.** BE-075 EP-01 이 내려주는 `ProgramCategoryUsage[]` 는 `ProgramCategory` 의 초집합이므로(`_shared/store.ts:23`) **응답 하나가 두 소비자를 먹인다** — 이 화면은 `programCount`·`hasChildren` 를 무시하면 된다.

**에러**: 401 · 403 · 429 · 500 · 504. **다만 이 실패가 폼에서는 아무 데도 표시되지 않는다**(§7.9).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:60-66`)가 재인증으로. 화면은 FS-074-EL-021 배너 | **403** 컬렉션 — 프로그램 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1 · §7.7) | N/A — 0건이면 200 빈 배열 → FS-074-EL-020 빈 상태(3분기) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` → EL-021 배너 | 500 + `traceId` → EL-021. **status 로 분기하지 않는다** — 403·429·500 이 한 문구다(§7.12 #6) | 5초 → 504 → EL-021 |
| EP-02 상세 | 400 — id 형식 위반 → 상세는 EL-028 의 **일반 오류 분기**, 폼은 EL-054 의 `'error'` 분기(둘 다 404 와 구분한다) | 401 → 전역 인터셉터. 화면은 EL-028 | **403** — 프로그램은 공개 카탈로그의 대상이라 존재를 은닉할 이유가 없다(§7.7) | **404 `PROGRAM_NOT_FOUND`** — 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:217-219`). 상세는 '다시 시도'를 숨기고, 폼은 '목록으로'만 준다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → EL-028 일반 분기(재시도 제공). **참조 코드가 없다** — 폼 저장만 갖는다(§7.12 #6) | 5초 → 504 → EL-028 |
| EP-03 등록 | 400 `VALIDATION_FAILED` — `error.fields` 를 프론트가 **필드 인라인으로 매핑하지 못한다**(`useCrudForm.ts:209` 이 422 만 본다) → EL-051 배너 + 참조 코드로 뭉개진다(§7.12 #8) | 401 → 전역 인터셉터. **작성 중 입력이 유실된다** — 프로그램 이동이라 EL-055 가드가 발화하지 않는다(FS-074 §4.1) | **403 `FORBIDDEN`** — `operator` 는 등록할 수 없다(§7.11). 컬렉션 쓰기라 은닉할 개별 리소스가 없다. 프론트는 `canCreate`·`canSubmit` 로 미리 막지만 그것은 UX 다 | N/A — 생성이라 대상이 없다. **`categoryId` 가 없는 분류를 가리키면 404 가 아니라 422** 다(EP-03 검증 2) | N/A — 생성에 충돌 대상이 없다. **`Idempotency-Key` 재시도는 최초 응답을 재생한다**(§7.6) | **422** `CATEGORY_NOT_FOUND` · `INVALID_PERIOD` · `INVALID_OPTION_GROUPS` · `INVALID_REWARD_REFERENCE`. `violations` 를 RHF `setError` + 포커스로 옮긴다(`useCrudForm.ts:209-219`) | 429 분당 60 + `Retry-After` → EL-051 배너 | 500 + `traceId` → EL-051 배너 + **참조 코드**(`referenceOf` — `useCrudForm.ts:222`), 입력 보존 | **10초 → 504**(옵션·리워드 포함 — §2). **프론트 상한이 없다**(§7.12 #12) |
| EP-04 수정 | EP-03 과 동일 | EP-03 과 동일 | **403 `FORBIDDEN`**. 읽기 권한이 있는 주체에게는 존재를 숨기지 않는다(§7.7) | **404 `PROGRAM_NOT_FOUND`** — 존재한 적 없는 id. **어댑터는 같은 자리에서 409 를 낸다**(픽스처는 '없음'과 '먼저 삭제됨'을 구분할 수 없다). HTTP 연동 시 **서버가 그 둘을 구분한다** | **409 `CONFLICT`** — ① 낙관적 동시성 토큰 불일치(**현재 토큰이 없어 발생할 수 없다** — §7.6) ② 대상 부재(어댑터가 이미 낸다). **화면에 해소 UI 가 있다** — `FormConflictDialog` 가 입력을 보존한 채 reload/dismiss 를 준다(EL-052) | EP-03 의 422 + **`REWARD_IN_USE`**(후원된 리워드 삭제 시도 — EP-04 검증 9) | 429 분당 60 | 500 + `traceId` → EL-051 + 참조 코드 | **10초 → 504** |
| EP-05 삭제 | 400 — id 형식 위반 → EL-022 다이얼로그 배너 | 401 → 전역 인터셉터 | **403 `FORBIDDEN`** — `operator` 는 삭제할 수 없다. 읽기 권한이 있으므로 404 로 숨기지 않는다 | **404 `PROGRAM_NOT_FOUND`** — 어댑터는 같은 자리에서 **409 '이미 삭제된 항목입니다.'**(`crud.ts:275-277`). 서버는 404(존재한 적 없음)와 409(먼저 삭제됨)를 구분한다 | **409 `CONFLICT`** — 이미 삭제됨. `deleteErrorMessage`(`useCrudList.tsx:65-68`)가 **그 문장을 그대로 보이고 재시도를 권하지 않는다**. 일괄은 사유별 집계(`:94-107`) | N/A — 삭제에 전제 상태가 없다. **참조 무결성 위반은 409 로 낸다**(§7.12 #9 — 현재 어느 층도 검사하지 않는다) | 429 분당 60 + `Retry-After`. **일괄 삭제가 선택 건수만큼 요청을 낸다** — 상한이 없다(§7.12 #10) | 500 + `traceId` → EL-022·EL-023 다이얼로그 배너 | 5초 → 504 → 다이얼로그 배너 |
| EP-06 카테고리 선택지 | N/A — 쿼리 파라미터가 없다 | 401 → 전역 인터셉터 | **403** — BE-075 §7 의 판정을 따른다. `programs:read` 로도 200(§7.11) | N/A — 0건이면 200 빈 배열 → 셀렉트에 '선택' 항목만 남는다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 → **목록 화면은 패널 안에서 말하고(EL-004.3) 폼은 아무 말도 하지 않는다**(§7.9) | 5초 → 504 → 위와 동일 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `programAdapter.fetchAll(signal)` | `GET /api/programs` | EP-01 | `readonly Program[]` | O — **정렬 함수가 없어 서버 순서가 곧 화면 순서다**(§7.10) |
| `programAdapter.fetchOne(id, signal)` | `GET /api/programs/:id` | EP-02 | `Program` | O — **404 를 이미 `HttpError` 로 던진다**(`crud.ts:217-219`) |
| `programAdapter.create(input, context)` | `POST /api/programs` | EP-03 | `void` | **△ — `claimedCount`·클라이언트 id 가 바디에 있다**(§7.4). 멱등키는 **도달한다**(§7.6) |
| `programAdapter.update(id, input, context)` | `PUT /api/programs/:id` | EP-04 | `void` | **△ — 전체 치환 + `claimedCount` 위조 가능**(§7.4) · **`If-Match`/`version` 없음**(§7.6). 409 해소 UI 는 **있다** |
| `programAdapter.remove(id, context)` | `DELETE /api/programs/:id` | EP-05 | `void` | **△ — `DeleteVars` 에 멱등키 자리가 없다**(`crud.ts:363-366`) |
| `fetchProgramCategoryOptions(signal)` | **없음** | EP-06(정본은 BE-075 EP-01) | `readonly ProgramCategory[]` | **X — 심 주석이 없고 `fixtureRequest` 를 지나지 않는다**(§7.9) |
| `readPaymentSettings()` | (설정 계약의 심 — `payment-settings.ts:190-193`) | 이 계약 밖 | `PaymentSettings` | O — **동기 읽기이며 CTA 는 파생값이다**(§7.5) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token` 헤더. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` **이미 충족** — 응답 404 를 `HttpError(404, …)` 로 옮기기만 한다. |
| 409 변환 | `update`/`remove` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다. **`message` 는 사용자가 읽을 문장이어야 한다** — `deleteErrorMessage` 와 `FormConflictDialog` 가 그것을 그대로 보인다. |
| 422 변환 | 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]`)로 옮긴다. **`field` 는 `ProgramFormValues` 의 키여야 한다** — `useCrudForm` 이 그것으로 `setError`+`setFocus` 를 한다(`:209-219`). |
| 멱등키 | `create`/`update` 는 `context.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — **키는 이미 호출부에서 온다**(`useCrudForm.ts:238`). `remove` 는 **자리부터 만들어야 한다**(§7.12 #4). |
| 부수효과 제거 | `addProgram`/`updateProgram` 의 `categoryLabel: labelOf(...)`·`pledgedAmount: 0`(`_shared/store.ts:400-402,410`)은 **픽스처 전용**이다 — 백엔드가 붙으면 서버 응답이 그 자리를 대신한다. 남겨 두면 라벨 정본이 둘이 된다. |
| 선택지 조회 | `fetchProgramCategoryOptions` 는 **`fixtureRequest` 를 지나지 않는 유일한 조회**다(`data-source.ts:53-54`가 `Promise.resolve` 를 바로 돌려준다) — HTTP 연동 시 이 함수만 지연·취소·실패 재현 계약 밖에 남는다(§7.9). |
| 정렬 | `StoreAdapterSpec` 에 `sort` 가 없다(`crud.ts:174-182`) — **응답 순서를 프론트가 다시 정렬하지 않는다.** 서버가 안정 정렬을 보장해야 한다(§7.10). |

## 7. 핵심 판정

### 7.1 달성률·남은 일수·성공 여부를 **저장하지 않는다** — 모금액·후원자 수는 저장한다 【정합 판정】

**코드가 이 선을 스스로 긋고, 그 이유까지 적어 두었다.** `_shared/store.ts:6-8`:

> `달성률·남은 기간·성공 여부는 전부 저장된 두 값에서 계산되는 파생값이다. 파생값을 필드로 두면 모금액만 바뀌고 달성률이 옛값으로 남는 순간이 생긴다 — 그래서 여기서는 계산 함수로만 노출한다.`

**전수 확인**: `Program` 의 18 필드 어디에도 `rate`·`achieved`·`daysLeft` 가 없다(`:72-110`). 세 함수(`fundingRate` · `isGoalReached` · `daysLeft` — `:144-164`)만 존재하고, **목록·상세·폼 미리보기가 같은 함수를 부른다**(`ProgramListPage.tsx:146,266` · `ProgramDetailPage.tsx:312-315` · `ProgramFormPage.tsx:895-896`). 회귀가 계산을 고정한다(`programs.test.ts:47-89`).

**판정**: 서버도 이 셋을 **저장하지 않는다.** 응답에도 넣지 않는다 — `goalAmount`·`pledgedAmount`·`endDate` 만 내려주면 세 값은 클라이언트가 만든다. 넣으면 그 순간 정본이 둘이 되고, 정정이 한쪽만 닿는 창이 생긴다.

**반대쪽 선도 정확히 긋는다 — `pledgedAmount`·`backerCount` 는 저장 필드다.** 그리고 **이 계약이 그것을 쓰지 않는다**:

- `ProgramInput` 에 두 필드가 **없다**(`:112-128`).
- 등록은 서버가 0 으로 시작한다(`:401-402`).
- 수정은 `{ ...program, ...input }` 이라 입력이 덮을 수 없다(`:410`).

**즉 이 계약에는 모금액을 바꾸는 경로가 없다.** 후원이 그것을 만든다 — 그 계약은 이 문서 밖이며 **이 문서가 발명하지 않는다.** 서버는 `PUT /api/programs/:id` 가 두 값을 **절대 건드리지 않는다**는 것을 보장하면 된다.

**남은 위험(코드가 만든 것)**: `daysLeft` 의 기준일이 **하드코딩 상수**(`TODAY = '2026-07-21'`)이고 **세 파일에 각각 복제**돼 있다(`ProgramListPage.tsx:77` · `ProgramDetailPage.tsx:57` · `ProgramFormPage.tsx:101`). 세 주석이 전부 '백엔드가 붙으면 서버가 내려주는 기준 시각으로 바뀐다'고 적는다. **판정**: 서버는 응답에 **기준 시각(서버 now)** 을 실어 세 화면이 같은 시계를 읽게 한다. 지금은 날짜가 지나도 남은 일수가 줄지 않고, 상수 하나만 고치면 세 화면이 갈린다(§7.12 #1).

**그리고 `daysLeft` 는 날짜를 못 읽어도 0 을 낸다**(`:161`) — 그 값이 화면에서 **'오늘 마감'** 으로 보인다. 같은 리포의 문의 도메인은 같은 상황에서 `'—'` 를 내며 '0일로 위장하지 않는다'고 명시한다(`products/inquiries/types.ts:146-147`). **서버는 파싱 불가능한 날짜를 애초에 저장하지 않는다**(EP-03 검증 1). 그럼에도 생기면 그것은 **모른다**이지 **오늘**이 아니다.

### 7.2 상태 전이 규칙이 **어느 층에도 없다** — 서버가 유일한 소유자가 된다 【정합 판정】

**BE-044 와 정반대의 사실이다.** 클레임 계약은 화면과 저장소가 **같은 전이 가드 함수**를 읽어 서버가 그 표를 승격하기만 하면 됐다. 이 도메인에는 **그 함수가 없다.**

| 층 | 상태를 어떻게 다루는가 | 근거 |
|---|---|---|
| 스키마 | `z.enum` 5값 — **형태만** | `validation.ts:58` |
| 저장소 | 전이 술어 **0건**. `updateProgram` 이 `status` 를 그대로 덮는다 | `_shared/store.ts:407-413` |
| 어댑터 | 재판정 **없음**. `createStoreAdapter` 는 도메인 규칙을 모른다 | `crud.ts:238-263` |
| 화면 | 상태 셀렉트가 5개를 **언제나 전부** 그린다. disabled 도 사유 문자열도 없다 | `types.ts:40-46` |

**그 결과 지금 가능한 저장**: `succeeded → draft`(끝난 펀딩을 초안으로 되돌리기) · 기간이 남았는데 `live → succeeded` · 종료일이 지난 `live` 를 영원히 `live` 로 두기. 화면은 '성공·실패는 기간이 끝난 뒤 목표 달성 여부로 갈립니다'라고 **두 번** 말하지만(`ProgramListPage.tsx:325-326` · 펀딩 설정 구획 hint) **그것을 강제하는 코드가 한 줄도 없다.**

**판정**: 서버가 이 규칙의 **유일한 소유자**가 된다. 이 문서는 규칙을 발명하지 않고 **무엇을 정해야 하는지**만 못 박는다 — 확정은 아키텍처의 몫이다(§7.12 #2):

1. **`succeeded`/`failed` 는 운영자가 고르는 값인가, 시스템이 판정하는 값인가.** 코드의 서술('기간이 끝난 뒤 목표 달성 여부로 갈린다')을 그대로 계약으로 올리면 **그 둘은 요청으로 받지 않고 서버가 배치로 전이시킨다** — 그러면 `ProgramInput.status` 의 유니온이 `draft|scheduled|live` 로 좁아진다.
2. **종료일이 지난 `live` 를 서버가 자동 종료시키는가.** 지금은 아무도 하지 않아 '진행 중' 이 영원히 남는다.
3. **되돌리는 전이(`succeeded → live` 등)를 허용하는가.**

**어느 안을 택하든 서버는 위반을 422 `INVALID_STATUS_TRANSITION`(`error.fields: [{ field: 'status' }]`)로 거절한다.** 그리고 **그 거절이 화면에 도달할 자리는 이미 있다** — `useCrudForm` 이 422 `violations` 를 `status` 필드의 인라인 오류로 꽂는다(`:209-219`). 다만 **상태 셀렉트에는 오류 슬롯이 없다**(`z.enum` 이라 프론트 검증이 그 필드를 만들지 않는다) — 서버 전이 규칙을 도입하면 폼에 그 슬롯을 함께 만들어야 한다.

**공개 여부라는 별도 축은 없다.** `Program` 에 `visible`/`published` 필드가 없고(전수 확인 `:72-110`), 고객 노출은 `status` 하나가 결정한다. **그래서 '전이 가드'와 '공개 가드'가 같은 필드에 걸린다** — 상태 규칙을 정하는 일이 곧 공개 규칙을 정하는 일이다.

### 7.3 저장 한 번은 한 트랜잭션이다 — 1407줄 폼이 한 덩이로 나간다 【정합 판정】

**세어 본 값이다.** 저장 1회(`EP-03`/`EP-04`)가 옮기는 것:

| 묶음 | 내용 | 개수 |
|---|---|---|
| 기본 정보 | `title` · `categoryId` · `creator` · `summary` | 4 |
| 펀딩 설정 | `goalAmount` · `startDate` · `endDate` · `status` | 4 |
| 본문 | `story` · `description`(둘 다 sanitize 된 HTML) | 2 |
| 이미지 | `thumbnailUrl` · `coverImageUrl` | 2 |
| 옵션 | `optionGroups[]` — 최대 3그룹 × 값 배열(상한 없음) | 배열 |
| 리워드 | `rewards[]` — **개수 상한 없음** × 7필드 + `optionGroupIds[]` | 배열 |

**부분 적용이 만드는 사고**는 이 도메인에서 정확히 한 형태다: **옵션과 리워드가 갈린다.**

- **옵션만 저장되고 리워드가 안 되면** — 지워진 그룹을 가리키는 리워드가 저장소에 남는다. 그것은 `programSchema` 의 폼 레벨 refine 이 **막으려고 존재하는 바로 그 상태**이고(`validation.ts:89-100`), 후원 화면은 **이름 없는 선택지**를 그리게 된다(`_shared/store.ts:200-205`). 게다가 그 프로그램은 **다시 저장할 수 없다** — 폼이 그 상태를 열자마자 refine 이 걸려 운영자가 손으로 고치기 전에는 저장이 막힌다.
- **리워드만 저장되고 옵션이 안 되면** — 새 그룹을 가리키는 리워드가 존재하지 않는 id 를 든다. 같은 결과다.
- **본문만 저장되고 이미지가 안 되면** — 목록 카드가 빈 썸네일로 남는다. 되돌릴 수 있는 사고이나 운영자는 저장이 성공했다고 믿는다.

**판정**: EP-03·EP-04 는 **본문 + 이미지 2종 + 옵션 그룹 전체 + 리워드 전체**를 **하나의 트랜잭션**으로 처리한다. 어느 하나가 실패하면 전부 롤백한다. 그리고 **정리 순서를 서버가 다시 지킨다** — `normalizeProgramOptionGroups` 로 옵션을 눕힌 **뒤** `applyOptionGroupsToRewards` 로 참조를 맞춘다(`ProgramFormPage.tsx:719-722` 의 순서 그대로). 뒤집으면 살아남은 리워드가 방금 버려진 그룹을 가리킨다.

**타임아웃이 조회보다 길어야 하는 이유**: 리워드 개수에 상한이 없어 요청 크기가 유일하게 무한한 축이다(§7.10). **10초**로 잡고(§2) **프론트 상한을 그보다 크게** 둔다 — 현재 프론트에 상한이 없다(§7.12 #12).

### 7.4 서버 소유 필드가 요청 바디에 있다 — `claimedCount` 와 두 개의 id 【보안 판정】

**세 값이 클라이언트를 왕복한다.** `ProgramInput.rewards` 가 `ProgramReward` 전체를 실어 나르고(`_shared/store.ts:127`), 그 타입에 **`claimedCount` 가 들어 있다**(`:61`). `toValues`(`ProgramFormPage.tsx:770-773`)가 서버 값을 폼으로 복사하고 `toInput`(`:745-749`)이 **그대로 되돌려 보낸다** — 화면은 그 칸을 읽기 전용 텍스트로만 그리지만(`:655-656`) **계약상 그 값은 요청 바디에 있다.**

**이것이 만드는 사고 — 조작된 클라이언트 하나면 충분하다**:

1. **`claimedCount: 0` 으로 되돌려 보내면 후원된 리워드를 지울 수 있다.** 삭제 차단의 **유일한** 근거가 그 값이다(`:661-668` — `claimed` 판정). 코드 주석이 그 위험을 스스로 적는다(`:471-472`): `그 줄을 지우면 후원자가 무엇을 받기로 했는지 가리키는 곳이 사라진다 — 서버도 같은 이유로 막는다.` **서버가 요청 값을 신뢰하는 순간 그 방어가 통째로 사라진다.**
2. **`claimedCount` 를 키우면 리워드가 '마감' 으로 보인다.** 상세의 마감 배지(`ProgramDetailPage.tsx:221,226`)와 후원 가능 여부가 이 값에서 나온다 — 판매를 임의로 닫을 수 있다.
3. **리워드·옵션 id 를 클라이언트가 만든다.** `pog-${crypto.randomUUID()}`(`:370`) · `rw-${crypto.randomUUID()}`(`:485`). 주석은 '저장 뒤에는 서버가 준 id 로 대체된다'고 적지만 **픽스처는 대체하지 않는다** — 그대로 저장한다. 서버가 요청의 id 를 그대로 받으면 **다른 프로그램의 리워드 id 와 충돌시키거나 이미 후원된 리워드의 id 를 새 리워드에 붙일 수 있다.**

**판정**: `rewards[].claimedCount` · `rewards[].id` · `optionGroups[].id` · `pledgedAmount` · `backerCount` · `categoryLabel` 은 **전부 서버가 소유한다.**

- `claimedCount` 는 **요청에서 파싱조차 하지 않는다.** 저장된 값을 유지하고, 삭제 차단(EP-04 검증 9)은 **저장된 값으로만** 판정한다.
- id 는 **한 요청 안의 임시 참조로만** 읽는다 — 리워드의 `optionGroupIds` 가 같은 요청의 `optionGroups[].id` 를 가리키는 데 쓰이고, 저장 시 서버 채번 id 로 치환된다. **기존 리워드를 유지하려면 요청이 저장된 id 를 그대로 실어야 하므로**, 서버는 '요청의 id 가 이 프로그램에 실재하는가'를 확인하고 **다른 프로그램의 id 는 거절한다**(422).

**계약을 둘 중 하나로 정리한다.**

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `ProgramInput.rewards` 를 `Omit<ProgramReward, 'claimedCount'>` 로 좁힌다 | 위조가 **타입으로** 불가능해진다. 프론트 변경은 `toInput` 에서 한 필드를 빼는 것뿐이고(`ProgramFormPage.tsx:745-749`) 화면은 이미 그 칸을 편집하지 않는다. **어댑터 시그니처는 그대로다** |
| **B (차선)** | 바디를 유지하고 서버가 `claimedCount` 를 **무시** | 프론트를 안 건드린다. 그러나 '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨지고, 안 A 는 타입이 강제한다 |

**어느 안이든 서버는 요청의 후원 수·집계·라벨을 절대 신뢰하지 않는다.** 이것은 UX 개선이 아니라 **후원 무결성 요구**다.

### 7.5 PG 축은 fail-closed 이고, CTA 는 어디에도 저장하지 않는다 【정합 판정】

**판정 술어가 하나다**: `pgSellable(settings) = settings.usePg && settings.merchantId.trim() !== ''`(`payment-settings.ts:128-130`). 그 파일이 왜 `usePg` 만 보지 않는지 적는다(`:120-122`): **켜 두고 상점 ID 가 비어 있으면 결제창을 띄울 수 없고, 그 상태에서 '후원하기' 를 그리면 고객은 눌러 놓고 아무 일도 일어나지 않는 버튼을 만난다.** 규칙 자체가 애매하면 **닫는 쪽으로 수렴한다(fail-closed).**

**프로그램에서의 파급 — 코드가 하는 것 그대로**:

| 상태 | CTA 라벨 | `kind` | 사유 | 문의 창구 |
|---|---|---|---|---|
| `pgSellable` = true, `mode='live'` | **후원하기** | `purchase` | `<PG사> 결제창이 열립니다.` | `null` |
| `pgSellable` = true, `mode='test'` | **후원하기** | `purchase` | `<PG사> 테스트 모드로 결제창이 열립니다. 실제 결제는 일어나지 않습니다.` | `null` |
| `usePg` = true, `merchantId` 공란 | **문의하기** | `inquiry` | `PG 상점 ID 가 비어 있어 결제창을 열 수 없습니다. 지금은 문의로 받습니다.` | `/programs/inquiries` |
| `usePg` = false | **문의하기** | `inquiry` | `PG 결제를 쓰지 않도록 설정되어 있어 결제 대신 문의로 받습니다.` | `/programs/inquiries` |

(`payment-settings.ts:143-167` · `INQUIRY_PATH.program` `:100-103` · 소비 `ProgramDetailPage.tsx:323,398-410`)

**그리고 기본값이 fail-closed 쪽이다** — `DEFAULT_PAYMENT_SETTINGS.usePg = false`(`:179-186`), 주석이 이유를 적는다: `켜져 있는 것으로 시작하면 결제되지 않는 '구매하기' 가 기본값이 된다`. **설정을 한 번도 저장하지 않은 상태가 '후원 불가'로 수렴한다.** 이것이 이 축의 미배선 규약이다(§7.9).

**판정 1 — CTA 를 프로그램 레코드에 저장하지 않는다.** 그 파일의 주석이 이유를 이미 적었고(`:133-138`), 그것을 계약으로 올린다:

> CTA 를 프로그램마다 들고 있으면 설정 스위치를 내리는 순간 이미 등록된 수백 건이 전부 낡은 값이 된다. 그때 필요한 일괄 갱신은 **실패하면 절반만 바뀌고**, 절반은 열리지 않는 결제창으로 고객을 보낸다. 사실은 하나(PG 를 쓰는가)이고 버튼은 그 결과다.

**따라서 `Program` 에 `ctaKind`·`ctaLabel`·`sellable` 류 필드를 만들지 않는다.** 프로그램 응답에도 넣지 않는다 — 결제 설정 응답 하나면 클라이언트가 만든다. 전수 확인: 현재 `Program` 18 필드에 그런 값이 없다(`_shared/store.ts:72-110`).

**판정 2 — `pgLock` 의 제1원칙은 적용되지만, 프로그램에는 잠기는 섹션이 없다.** `PG_LOCK_SECTIONS`(`pg-lock.ts:26-33`)는 여섯 개이며 **전부 상품·쿠폰·적립 계열**이다 — `product-points` · `product-coupons` · `product-stock` · `product-shipping` · `coupon-admin` · `points-policy`. **프로그램 섹션이 없고, `pages/programs` 에 `pgLock` 소비가 0건이다**(grep 실측). 즉 **PG 를 꺼도 프로그램 폼의 어떤 입력도 잠기지 않는다.**

그것이 이 도메인에서 옳은 이유는 같은 파일이 이미 적었다(`pg-lock.ts:12-16`): **잠기는 것은 '결제가 있어야 의미가 생기는 값'뿐이고, 옵션처럼 '무엇을 문의하는가'의 축은 잠기지 않는다.** 펀딩의 리워드·목표 금액·기간은 후자다 — PG 를 끄면 후원이 문의로 들어올 뿐, 그 문의가 가리키는 리워드 명세는 여전히 필요하다.

**그럼에도 제1원칙은 서버 계약에 남는다**(`pg-lock.ts:7-10`): **잠금은 저장된 값을 지우지 않는다.** PG 를 껐다가 다시 켰을 때 목표 금액·리워드·기간이 **저장해 둔 그대로** 살아나야 한다. 서버는 `usePg` 변경을 프로그램 레코드에 전파하지 않는다 — 전파할 필드가 애초에 없어야 하고(판정 1), 그것이 이 원칙을 구조적으로 보장한다.

### 7.6 낙관적 동시성 토큰이 없다 — 그러나 이 화면은 409 를 실제로 해소한다 【정합 판정】

**절반은 이미 옳다.** `createStoreAdapter.update`/`remove` 가 없는 id 를 **409 로 막고**(`crud.ts:256-258,275-277`), `useCrudForm.handleWriteError` 가 `isConflict` 를 읽어 **입력을 보존한 채** `FormConflictDialog`(reload / dismiss)를 세운다(`:193-206` → `ProgramFormPage.tsx:1402`). 유령 저장이 불가능하고 복구 경로가 실재한다.

**그러나 그것은 '존재 여부' 기반이지 낙관적 동시성 토큰이 아니다.** `Program` 에 `version`/`updatedAt`/`ETag` 가 **없고**(`_shared/store.ts:72-110` 전수) `apps/admin/src/pages/programs` 전체에 `If-Match` grep **0건**이다(실측 2026-07-22).

| 시나리오 | 현재 동작 |
|---|---|
| A 가 폼을 열고, B 가 프로그램을 **삭제**한 뒤, A 가 저장 | **409 → 충돌 다이얼로그** ✔ |
| A 가 폼을 열고, B 가 리워드를 **수정**한 뒤, A 가 저장 | 둘 다 존재하므로 409 가 나지 않는다 → **A 가 B 를 통째로 덮는다** ✕ **last-write-wins** |

**이 화면에서 위험이 큰 이유**: 저장이 **전체 치환**이라(§7.3) 덮이는 것이 필드 하나가 아니라 **리워드 목록 전체**다. B 가 리워드를 하나 추가한 사이 A 가 30초 낡은 폼을 저장하면 그 리워드가 사라진다 — 그리고 그 리워드에 이미 후원이 들어왔다면 **§7.4 의 삭제 차단이 서버 값 기준으로 도는 한**(EP-04 검증 9) 422 로 막히지만, 후원 0건이면 조용히 없어진다.

**판정**: `Program` 에 **`version: number`**(또는 `updatedAt`)를 더하고 `PUT`/`DELETE` 가 `If-Match: <version>` 을 요구한다. 불일치면 **409 `CONFLICT`** + 응답에 **서버 최신본**을 싣는다 — `FormConflictDialog.reload` 가 그것을 곧바로 쓴다(`useCrudForm.ts:198-202` 가 상세를 재조회한다). **프론트 후속은 작다**: 어댑터가 헤더를 싣고, `loaded.version`(`useCrudForm.ts:77` 의 `loaded` — 서버 원본)을 흘려 주면 된다. **화면 코드는 이미 준비돼 있다.**

**멱등키는 반대로 이미 완전하다.** `useCrudForm` 이 제출 **시도** 단위 키를 만들고(`:145-150`) 성공 시 버리며(`:247`) `create`/`update` 의 variables 에 실어(`:255,262`) 어댑터 원장까지 도달한다(`crud.ts:229,232,243,245`). 동기 제출 락(`submitLockRef` — `:130,229-230`)도 있다. **판정**: EP-03·EP-04 는 `Idempotency-Key` 를 **요구**한다 — 프론트가 이미 그것을 보낸다.

**단 하나 비어 있다 — 삭제다.** `DeleteVars`(`crud.ts:363-366`)에 키 필드가 아예 없고 호출부도 넘기지 않는다(`useCrudList.tsx:164,196`). **일괄 삭제는 그 창이 더 넓다** — 선택 건수만큼 요청이 나가고 부분 실패가 재시도를 부른다. 서버는 `DELETE` 를 **id 기준 멱등**으로 구현하고(두 번째 호출은 404/409), 키가 붙기 전까지 그것이 유일한 방어다(§7.12 #4).

### 7.7 프로그램은 403 으로 거절한다 — 404 로 은닉하지 않는다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용하면 **BE-042 §7.5 와 같은 결론**이 나온다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/programs` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 프로그램의 존재도 개인정보가 아니다** → `GET`/`PUT`/`DELETE /api/programs/:id` 권한 부족 시에도 **403 `FORBIDDEN`**.

**근거**: 회원(BE-003 §3.2)·클레임(BE-044 §7.5)을 404 로 은닉하는 이유는 **'그 리소스의 존재 자체가 개인정보'** 이기 때문이다. 프로그램은 정반대다 — **고객에게 공개하려고 만드는 레코드**이고, 제목·창작자·목표 금액·모금액·리워드가 전부 후원자 화면에 그대로 나간다. `pgSellable` 이면 그 화면에서 결제까지 일어난다. 은닉할 것이 없다.

**단 두 가지가 공개 값이 아니다**:

- **`status = 'draft'` 인 프로그램**은 아직 공개되지 않은 기획이다. 관리자 API 는 그것을 내려주지만(목록이 전량이다) **고객 API 는 `draft`·`scheduled` 를 내려주면 안 된다.** 고객 API 는 이 계약의 대상이 아니나, `status` 가 그 경계를 지는 유일한 필드라는 사실은 여기에 적는다(§7.2 와 같은 뿌리).
- **`backerCount`·`pledgedAmount`** 는 카탈로그 규모를 드러내는 영업 정보다. 그러나 그것은 필드 수준 노출이지 리소스 존재 은닉 문제가 아니며, 후원형 펀딩은 관례적으로 그 둘을 공개한다.

**결론**: EP-01~EP-06 전부 권한 부족 시 **403**. 404 는 오직 '그 id 의 프로그램이 없다'는 뜻으로만 쓴다. **어댑터의 404(`crud.ts:217-219`)가 이미 그 의미다.**

### 7.8 소유 경계 — 이 계약이 만들지 않는 것 【경계 판정】

**세 도메인의 경계가 이 화면에서 만난다.**

| 사실 | 정본 | 이 계약의 역할 |
|---|---|---|
| 카테고리의 존재·이름·계층 | **BE-075** | EP-06 으로 **읽기만** 한다. `categoryId` 를 저장하고 라벨은 파생한다 |
| PG 사용 여부·상점 ID | 결제 설정 계약(`payment-settings.ts:190-193`) | **읽기만** 한다. CTA 는 파생값이며 저장하지 않는다(§7.5) |
| 프로그램 문의 | FS-076 | **가리키기만** 한다(`INQUIRY_PATH.program`). 문의를 만들지도 읽지도 않는다 |
| 모금액·후원자 수·`claimedCount` | 후원(결제) 계약 — **이 앱에 없다** | **읽기만** 한다(§7.1). 쓰는 경로가 이 계약에 없다 |

**가장 중요한 경계 — 카테고리 라벨의 소유권.** `Program.categoryLabel` 은 **비정규화 사본**이다(`_shared/store.ts:76-77` — `목록이 카테고리를 다시 조회하지 않게 한다`). 저장 시 서버가 `labelOf(categoryId)` 로 파생해 넣고(`:400,410`), **카테고리 이름이 바뀌면 BE-075 가 그것을 전파한다**(`:507-509`).

**판정**: 서버는 두 선택지를 갖는다 — ① `categoryLabel` 을 **저장하지 않고 조회 시 조인**한다 ② 비정규화 컬럼을 두고 **BE-075 의 이름 수정이 같은 트랜잭션에서** 프로그램을 갱신한다. **①을 권한다**(BE-042 §7.10 과 같은 판정) — 카테고리 수가 작아 조인 비용이 무시할 만하고, 전파가 부분 실패해 **일부 프로그램만 옛 이름을 다는** 상태가 원리적으로 생기지 않는다. **프론트는 어느 안이든 무변경이다** — 응답에 `categoryLabel` 이 있기만 하면 된다.

**단 하나가 계약에 걸린다**: `labelOf`(`:234-235`)가 없는 `categoryId` 에 **id 를 그대로 뱉는다**(`?? categoryId`). 서버는 고아 `categoryId` 를 애초에 만들지 않고(EP-03 검증 2 의 422), 그럼에도 생기면 **id 노출이 아니라 명시적 표기**('(삭제된 분류)')로 내려야 한다 — id 는 내부 식별자다.

**경계의 구멍 — 카테고리 삭제와 프로그램의 관계는 BE-075 가 막는다.** `removeProgramCategory` 가 사용 중이면 던지므로(`:513-521`) 고아 프로그램은 생기지 않는다. **반대 방향은 막혀 있지 않다** — 프로그램을 지울 때 그것을 가리키는 문의를 검사하는 코드가 없다(§7.12 #9).

### 7.9 조회 실패를 '없다'로 읽지 않는다 — 이 도메인의 미배선 규약 【정합 판정】

**이 화면에는 등록형 조회기(lookup registry)가 없다.** 클레임 계약의 `findClaimOrder`/`applyStockMovements` 같은 '배선되면 값을 주고 아니면 `null`/`false` 를 주는' 심이 없고, 조회는 셋 다 직접 호출이다. 그래서 규약을 **조회기 미배선**이 아니라 **조회 실패**의 언어로 적는다.

| 조회 | 실패·미설정 시 실제 동작 | 판정 |
|---|---|---|
| 프로그램 목록(EP-01) | `CrudListShell` 이 요약·표를 인라인 danger 배너로 대체 + '다시 시도'(`CrudListShell.tsx:225-232`). 툴바·좌측 레일은 남는다 | **옳다.** 빈 목록으로 폴백하지 않는다 |
| 프로그램 상세(EP-02) | 404 와 그 밖을 가른다(`ProgramDetailPage.tsx:279-300` · `useCrudForm.ts:171-176`) | **옳다** |
| 카테고리 선택지(EP-06) — **목록 화면** | `FilterPanel failed + onRetry`(`ProgramListPage.tsx:351-352`)가 패널 안에서 사실을 밝힌다. 프로그램 목록은 살아 있다 | **옳다** |
| 카테고리 선택지(EP-06) — **폼** | **아무 말도 하지 않는다.** `categoriesQuery.error` 를 읽지 않아(`ProgramFormPage.tsx:829-833`) 선택지가 빈 배열이 되고 셀렉트에 '선택' 항목만 남는다 | **조용한 거짓이다** — 운영자는 **카테고리가 하나도 없다**고 읽는다 |
| 카테고리 선택지 — **롤업 필터** | 도착 전에는 `categories=[]` 라 `categoryFamily` 가 자기 자신뿐 → **대분류를 고른 상태로 새로고침하면 잠시 0건**이다(`types.ts:101-109`) | 같은 계열 — '아직 모른다'가 '0건'으로 보인다 |
| 결제 설정 | 저장 이력이 없으면 `DEFAULT_PAYMENT_SETTINGS`(`usePg: false`) → CTA '문의하기' | **옳다 — fail-closed**(§7.5) |

**판정**: 서버가 붙어도 이 규약을 지킨다.

1. **집계·참조 조회의 실패는 200 으로 내려오지 않는다.** 카테고리 목록을 못 읽었을 때 **빈 배열을 주면 안 된다** — 5xx 로 실패해야 화면이 '못 읽었다'와 '없다'를 가른다. 지금 목록 화면은 그 구분을 하고, **폼은 하지 못한다**(§7.12 #5).
2. **`fetchProgramCategoryOptions` 는 `fixtureRequest` 를 지나지 않는 유일한 조회다**(`data-source.ts:53-54`). 그래서 **`?fail=`·`?status=` 스위치가 이 실패를 재현하지 못하고**, FS-074-EL-004.3 의 실패 표시는 브라우저에서 도달 불가능한 경로다. HTTP 연동 시 이 함수만 지연·취소·실패 계약 밖에 남는다 — **연동 시 누락될 자리이며, 심 주석이 없는 것이 그 위험을 키운다**(§7.12 #5).
3. **모르는 `categoryId` 는 빈 목록으로 수렴한다**(`types.ts:98-99`) — 조회가 깨지는 것보다 낫고 빈 상태가 '필터 초기화'로 되돌릴 길을 준다. 이것은 **의도된 동작이며 서버가 바꾸지 않는다.**

### 7.10 목록이 전량·전문을 내려주고 정렬 정본이 서버에 있다

**현재 계약의 세 문제**:

1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 상태 필터·카테고리 롤업·검색이 전부 클라이언트다. 프로그램은 **상한 없이 쌓이는 컬렉션**이다.
2. **목록이 상세 전문을 담는다.** `Program` 하나를 목록·상세·폼이 공유해 목록 응답에 `story`(HTML) · `description`(HTML) · `optionGroups` · `rewards` 전체가 실린다 — **목록 화면이 쓰는 것은 9개 열뿐**이다.
3. **정렬 UI 도 정렬 함수도 없다.** `StoreAdapterSpec` 에 `sort` 자체가 없어(`crud.ts:174-182`) **응답 순서가 곧 화면 순서**다. 이 화면의 핵심 질문이 '무엇이 곧 끝나는가' 인데(`ProgramListPage.tsx:3-6`) **마감 임박순으로 볼 방법이 없다.**

**판정**:

- **정렬은 서버가 정본이며 안정 정렬이어야 한다.** 프론트가 재정렬하지 않으므로 순서가 흔들리면 새로고침마다 목록이 재배열된다. 기본은 등록 순(현재 동작)을 유지하되, **`sort` 쿼리(`endDate` · `pledgedAmount` · `createdAt`)를 여는 것을 권고한다** — `CrudColumn.sortValue`·`onToggleSort` 배선이 공용 표에 이미 있다(FS-074 §7 #27).
- **`ProgramSummary` / `Program` 을 분리하고** EP-01 에 `status`·`categoryId`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ProgramSummary` 는 `story`·`description`·`optionGroups`·`rewards` 를 빼고 `rewardCount` 정도만 남긴다.
- **그전까지 현 계약(전량·전문)을 유지한다** — 픽스처 5건에서는 드러나지 않는다. 다만 **카테고리 롤업 필터가 서버로 올라가면 `categoryFamily` 규칙도 함께 올라가야 한다**(`types.ts:79-88`) — 거르는 규칙과 세는 규칙이 갈리는 순간 배지가 표에 대해 거짓말한다(회귀 `programs.test.ts:164-172` 가 그 등식을 고정한다).

**요청 크기의 유일한 무한 축은 리워드다.** 개수 상한이 없고(`validation.ts:80` 이 `z.array(rewardSchema)` 뿐) `description` 도 리워드마다 붙는다. **서버가 상한을 정해야 한다**(§7.12 #11).

### 7.11 `operator` 는 조회만 — 그러나 카테고리 선택지는 넓게 연다

**근거**: 프로그램은 **고객에게 공개되는 상품격 레코드**이고, 저장 1회가 목표 금액·기간·리워드 금액을 한꺼번에 바꾼다(§7.3). 리워드 금액은 **고객이 실제로 지불할 금액**이다 — 상품(BE-041 §7.9)·상품 카테고리(BE-042 §7.8)가 `admin` 만으로 잠근 것과 같은 결이며, 클레임(BE-044 §7.8)이 `operator` 에게 쓰기를 연 것과는 성격이 다르다(그쪽은 응대가 본업이다).

**결론**: EP-01 · EP-02 · EP-06 은 `admin` + `operator`. **EP-03 · EP-04 · EP-05 는 `admin` 만.**

**프론트 영향**: `operator` 로 로그인하면 등록 CTA(`canCreate`) · 행 액션 · 선택 열 · 상세 '수정' 링크가 **전부 사라지고**, 폼 라우트에 직접 들어가면 `<ForbiddenScreen />` 이 화면을 대체한다(`ProgramFormPage.tsx:905`). 제출까지 도달해도 `useCrudForm.submit` 이 배너로 막는다(`:290-298`). **이 도메인은 세 층이 전부 배선된 소수 화면이다** — BE-042 §7.8 이 지적한 '누를 수 없는 컨트롤이 남는' 문제가 여기엔 없다.

**단 EP-06 의 권한은 좁히지 않는다.** 카테고리 선택지 조회는 **프로그램 편집의 일부**다 — `program-categories:read` 를 요구하면 프로그램만 관리하는 역할이 프로그램을 등록하지 못한다. `programs:read` **또는** `program-categories:read` 중 하나면 200 을 준다(BE-042 §7.9 와 같은 판정이며, 권한 모델이 그것을 표현할 수 있어야 한다는 제약도 같다).

### 7.12 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **기준 시각을 서버가 내려준다**(§7.1) — `TODAY = '2026-07-21'` 이 세 파일에 복제돼 있고(`ProgramListPage.tsx:77` · `ProgramDetailPage.tsx:57` · `ProgramFormPage.tsx:101`) 날짜가 지나도 남은 일수가 줄지 않는다. `daysLeft` 가 파싱 실패에 0('오늘 마감')을 내는 것도 함께 | 백엔드 명세 · 프론트 구현 |
| 2 | **상태 전이 규칙 확정**(§7.2) — 성공/실패를 서버가 판정하는가, 기간 종료가 자동 전이를 일으키는가, 역행을 허용하는가. **어느 층에도 규칙이 없어 지금은 무엇이든 저장된다.** 확정 뒤 422 `INVALID_STATUS_TRANSITION` + 폼의 상태 오류 슬롯이 함께 필요하다 | **아키텍처 (선행)** · 백엔드 명세 · UI 기획 |
| 3 | **서버 소유 필드를 요청 바디에서 제거(§7.4 안 A)** — `rewards[].claimedCount` 와 클라이언트 생성 id 2종. **후원된 리워드 삭제 차단의 유일한 근거가 위조 가능하다** | **백엔드 명세 (최우선)** · UI 기획 |
| 4 | **`Program.version` 도입 + `PUT`/`DELETE` 의 `If-Match`**(§7.6) — 전체 치환이라 덮이는 것이 리워드 목록 전체다. **화면의 충돌 다이얼로그는 이미 있다** — 토큰만 붙이면 산다. 삭제 멱등키 자리(`DeleteVars` — `crud.ts:363-366`)도 함께 | 백엔드 명세 · UI 기획 |
| 5 | **카테고리 선택지 조회에 심 주석이 없고 `fixtureRequest` 도 지나지 않는다**(§7.9 · `data-source.ts:49-55`) — 연동 시 누락될 자리이며, 실패 재현 스위치도 걸리지 않아 EL-004.3 이 브라우저에서 도달 불가능하다. **폼은 그 실패를 아예 말하지 않는다** | 백엔드 명세 · 프론트 구현 |
| 6 | 목록·상세의 실패가 **403·429·500 을 한 문구로 뭉갠다**(§5) — 폼은 참조 코드까지 갖는데(`useCrudForm.ts:222`) 목록·상세는 갖지 못했다. 같은 도메인 안에서 실패 표현의 깊이가 갈린다(quality-bar EXC-06 · EXC-20 P1) | UI 기획 쪽 변경 요청 |
| 7 | **옵션·리워드의 422 가 어느 그룹·어느 행인지 말하지 못한다**(EP-03 주석) — 손조립 입력이라 `aria-invalid`/`aria-describedby` 가 없고 오류가 구획 하단 `role="alert"` 한 줄이다(`ProgramFormPage.tsx:449-453,689-693`) | UI 기획 쪽 변경 요청 |
| 8 | **400 `error.fields` 를 필드 인라인으로 매핑하지 않는다** — `useCrudForm.handleWriteError` 가 422 만 본다(`:209`). 400 은 배너로 뭉개진다(quality-bar EXC-07 P1) | UI 기획 |
| 9 | **프로그램 삭제가 참조를 검사하지 않는다**(EP-05 검증 11) — 그 프로그램을 가리키는 **프로그램 문의**(FS-076)가 고아가 되고, **후원 이력이 있는 프로그램도 그냥 지워진다.** 어느 층에도 검사가 없다 | **백엔드 명세 (연동)** · 아키텍처 |
| 10 | **일괄 삭제가 단건 반복이다**(EP-05) — 선택 건수만큼 요청이 나가고 상한이 없다. 서버에서 **부분 실패 계약**(어느 id 가 왜 실패했는가)이 필요하다. `bulkDeleteErrorMessage` 는 그 형태를 이미 소비할 준비가 돼 있다(`useCrudList.tsx:94-107`) | 백엔드 명세 · UI 기획 |
| 11 | **리워드 검증이 사실상 없다**(§3 · `validation.ts:19-28`) — 제목이 빈 리워드, 금액 0원 리워드, 개수 상한 없음. **스토리에도 상한이 없다**(`:46`) — 10만 자도 저장된다. 이미지 두 필드는 `z.string()` 뿐이라 형식·용량 검증이 없다 | 백엔드 명세 · 아키텍처 |
| 12 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건) — §7.3 이 요구하는 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다. 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료가 폼 입력을 버린다 | 프론트 구현 · UI 기획 |
| 13 | 목록 페이징 + `ProgramSummary` 분리 + **정렬 쿼리**(§7.10) — quality-bar IA-04 P0 와 한 배치로. 롤업 규칙이 서버로 함께 올라가야 배지가 표에 대해 거짓말하지 않는다 | 백엔드 명세 · UI 기획 |
| 14 | **카테고리를 두 개의 react-query 키로 캐시한다** — 이 화면은 `[programs,'category-options']`, 카테고리 화면은 `['program-categories','list']`(`crud.ts:288`). 카테고리를 고쳐도 이 화면의 선택지가 무효화되지 않는다. **백엔드와 무관하게 지금 고칠 수 있다**(FS-074 §7 #13 · BE-075 §7.12) | UI 기획 쪽 변경 요청 |
| 15 | **대표 이미지(`coverImageUrl`)와 상세 설명(`description`)을 그리는 화면이 없다**(FS-074 §7 #11) — 폼이 받고 저장소가 들고 있지만 아무도 읽지 않는다. 시드 5건 전부 `coverImageUrl: ''` 다. **저장만 되고 쓰이지 않는 필드를 계약에 남길지 확정이 필요하다** | UI 기획 · 아키텍처 |

## 8. 자기 점검

- [x] FS-074 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 5건(EP-01~EP-05) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명**했다(EP-06 은 BE-075 의 것을 소비 사실로만 기록했고, 결제 설정·프로그램 문의·후원은 §7.8 에서 소유 경계로 판정했다)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 에 사유 있음 (6행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **고유 차이 넷**(§2 저장 타임아웃 10초 · §7.7 403 판정 · §7.11 `operator` 조회 전용 · **엔타이틀먼트 매핑 부재 → 플랜 축 없음**)만 근거와 함께 기술
- [x] **파생값 판정을 코드로 확정**했다(§7.1) — 달성률·목표 달성·남은 일수는 **저장하지 않고**, 모금액·후원자 수는 **저장하되 이 계약이 쓰지 않는다**. 추측하지 않고 `ProgramInput` 의 필드 목록과 `addProgram`/`updateProgram` 의 동작만으로 판정했다
- [x] **전이 규칙의 부재를 사실로 확정**했다(§7.2) — 네 층 전수 확인(스키마 `z.enum` · 저장소 술어 0건 · 어댑터 재판정 없음 · 화면 셀렉트 전부 열림). **없는 표를 지어내지 않고** 무엇을 정해야 하는지만 적었다
- [x] 멱등성 판정 — 조회 GET 멱등 / **등록·수정은 키가 호출부에서 어댑터까지 실제로 도달**하고(§7.6) **삭제만 자리가 비어 있음**을 명시했다
- [x] 보안 판정 2건 — **서버 소유 필드 위조(§7.4 — `claimedCount` 가 삭제 차단의 유일한 근거다)** · **403 vs 404(§7.7 — 클레임·회원과 반대 결론, 근거 명시)**. 그 밖 정합 판정 5건(§7.1 파생값 · §7.2 전이 부재 · §7.3 트랜잭션 · §7.5 PG fail-closed · §7.6 동시성 · §7.9 조용한 거짓 금지) + 경계 판정 1건(§7.8)
- [x] **PG 축을 코드로 확인**했다 — `pgSellable` 의 두 조건, `checkoutCta` 의 4갈래 표, `INQUIRY_PATH.program`, 기본값이 `usePg: false` 인 것, **`PG_LOCK_SECTIONS` 에 프로그램 섹션이 없어 이 도메인은 잠기는 입력이 0건**이라는 것까지. 제1원칙(잠금은 저장값을 지우지 않는다)은 '전파할 필드를 만들지 않는다'로 계약에 반영했다
- [x] **확인하지 못한 것을 쓰지 않았다** — 후원(결제) 계약은 이 앱에 존재하지 않아 §7.1·§7.8 에서 '이 문서 밖'으로 남겼고, 상태 전이 규칙은 '아키텍처 확정 대상'으로 남겼다(§7.12 #2)
- [x] 서버 코드·저장소 설계를 쓰지 않았다
