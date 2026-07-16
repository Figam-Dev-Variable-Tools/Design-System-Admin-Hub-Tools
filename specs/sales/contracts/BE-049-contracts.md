---
id: BE-049
title: "계약 백엔드 기능 명세"
functionalSpec: FS-049
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-049. 계약 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-049 계약 (`/sales/contracts` · `/new` · `/:id/edit`) |
| 범위 | 계약 목록 조회, 계약 상세 조회, 계약 등록, 계약 수정, 계약 삭제 |
| **범위 밖** | **전자서명 발송·수집·검증** — `signStatus` 는 사람이 고르는 select 일 뿐 워크플로가 없다(§7.9). **자동갱신 실행·통지 발송** — `autoRenew`·`renewNoticeDays` 는 데이터이고 이를 실행하는 배치가 없다. 화면은 `isRenewalDue` 로 배지만 띄운다(§7.9). **첨부 업로드** — 심은 있으나(`POST /api/uploads`) **DS 컴포넌트가 소유**하며 이 문서의 계약이 아니다(§4 EP-06). **일괄 삭제 전용 계약** — 심이 없다(§4 EP-07 · §7.5). **거래처 참조 무결성** — 계약이 거래처를 **이름 문자열**로만 들고 FK 가 없다(§7.5) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 달력일은 `'YYYY-MM-DD'` 문자열 |
| 프론트 어댑터 | `apps/admin/src/pages/sales/contracts/data-source.ts` (`contractAdapter` — `createCrudAdapter` 로 조립) |
| 도메인 타입 | `apps/admin/src/pages/sales/contracts/types.ts` · 원화 표기 `apps/admin/src/pages/sales/_shared/business.ts:45-47` |
| 검증 정본 | `apps/admin/src/pages/sales/contracts/validation.ts` (`contractSchema` — zod/mini). 잔여일수·갱신임박은 `types.ts:104-116` 의 순수 함수 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-026 §2 와 동일 선언). 아래는 계약 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 판정 대상 | 코드 근거 | 확인 결과 |
|---|---|---|
| 어댑터 팩토리 | `data-source.ts:69` `createCrudAdapter<Contract, ContractInput>({ scope: 'sales-contracts', … })` | `createStoreAdapter` 가 **아니다**. 자체 클로저 배열(`crud.ts:90`)을 갖는다 |
| 연동 심 | `data-source.ts:68` `// TODO(backend): GET/POST /api/sales/contracts · GET/PUT/DELETE /api/sales/contracts/:id` | **이 한 줄이 이 화면 data-source 의 유일한 심**이다. 일괄 삭제 심은 **없다** |
| 첨부 업로드 심 | `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:7-9` `TODO(backend): POST /api/uploads` · `shared/crud/validation.ts:56-58` 의 같은 심 | **심은 있으나 DS/공용 소유**다 — 이 화면의 `data-source.ts` 에 없다(§4 EP-06) |
| 404 발생 | `crud.ts:105-107` `throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')` | `fetchOne` 이 status 를 실어 던진다 → `useCrudForm` 의 `isNotFound` 분기가 발현된다(EXC-12 성립) |
| 409 발생 | `crud.ts:126-128`(update) · `:139-141`(remove) | **'존재 여부' 기반**이다. `version`/`ETag` 비교가 아니다 — §7.1 |
| 멱등키 | `crud.ts:41,114,121` · `useCrudForm.ts:118-123,228,235` | **폼 저장에만 도달**한다. 삭제는 키 없이 온다(`useCrudList.tsx:102`) |
| 낙관적 동시성 토큰 | `types.ts:13-36` `Contract` 필드 전수 | `version`·`updatedAt`·`etag` **없음** — §7.1 |
| 상태 전이 규칙 | `types.ts` 전수 · `validation.ts` 전수 | **없다.** `STATUS_FLOW`/`canSetStatus` 류가 이 도메인에 존재하지 않는다(고객센터 `_shared/domain.ts` 와 대비) — §7.3 |
| 첨부 저장 형태 | `types.ts:31-32` `attachments: readonly string[]` · `validation.ts:30` `z.array(z.string())` | **검증이 전무**하다. 어떤 문자열 배열이든 통과 — §7.2 |
| 첨부 실제 값 | `ImageGalleryField.tsx:153` `URL.createObjectURL(file)` · `:126-132` 언마운트 revoke | **`blob:…` 뿐이다.** 저장하면 깨진다 — 알려진 빚(§7.2) |
| 거래처 참조 | `types.ts:16-17` `/** 거래처명 — FE 전용이라 이름 문자열로 보관(연동 시 거래처 FK) */` | **FK 가 아니다.** 주석이 자백한다 — §7.5 |
| 쓰기 권한 게이팅 | `useRouteWritePermissions` grep — 소비처 9곳 | `pages/sales/**` **없음** — §7.8 |
| 인라인 쓰기 | `ContractListPage.tsx` 전수 | **`useCrudRowUpdate` 를 쓰지 않는다** — 거래처(FS-048)·견적(FS-050)과 달리 목록에 인라인 쓰기가 없다. 목록의 유일한 쓰기는 삭제다 |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회 계열(목록·상세) 전용** — 등록·수정·삭제는 **403**(§7.8). 영업 도메인 읽기 권한 없는 관리자 → 컬렉션 **403** / 개별 계약 **404 은닉**(§7.4).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-049 §4.1) — 권한 강제는 서버 책임. 프론트에 쓰기 게이팅이 배선돼 있지 않다(FS-049 §7 #3)는 사실이 이 원칙을 **바꾸지 않는다** — 오히려 서버가 유일한 방어선임을 뜻한다(§7.8).

## 3. 데이터 계약 (`types.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Contract` | `id` · `title` · `accountName`(**FK 아님 — §7.5**) · `contractType` · `startAt`·`endAt`('YYYY-MM-DD') · `amount`(원) · `vatIncluded` · `autoRenew` · `renewNoticeDays`(일) · `status` · `signStatus` · `ownerName` · `attachments[]` · `terms` · `note` | 목록·상세가 **같은 타입**이다 — 목록도 `terms`·`attachments`·`note` 전문을 받는다(§7.6) |
| `ContractInput` | `Omit<Contract, 'id'>` | 등록·수정이 같은 입력을 쓴다. **전체 치환**이다 |
| `ContractType` | `supply` \| `service` \| `maintenance` \| `license` \| `lease` \| `nda` | 공급/용역/유지보수/라이선스/임대/NDA |
| `ContractStatus` | `draft` \| `review` \| `active` \| `expired` \| `terminated` | 초안→검토→진행, 종료는 만료/해지. **전이 규칙 없음**(§7.3) |
| `SignStatus` | `unsigned` \| `sent` \| `partial` \| `signed` | 미발송/서명대기/일부서명/서명완료. **워크플로 없음**(§7.9) |
| 상수 | `CONTRACT_TITLE_MAX = 80` · `CONTRACT_TERMS_MAX = 1000` · `CONTRACT_MAX_ATTACHMENTS = 5` | `types.ts:40-42` |

**서버가 정본인 필드 (프론트 요청을 믿지 않는다)**

| 필드 | 정본 | 근거 |
|---|---|---|
| `id` | 서버 채번 | 픽스처는 `ct-<seq>`(`data-source.ts:72-75`) — 프로세스 지역 카운터라 계약이 아니다 |
| `createdAt` / `updatedAt` / `version` | 서버 | **현재 타입에 없다.** §7.1 이 `version` 을 계약에 넣을 것을 요구한다 |
| `attachments[]` | 서버(업로드 응답 URL) | 현재 클라이언트가 `blob:` object URL 을 싣는다 — §7.2 |
| `status` 전이 | 서버 | 현재 규칙이 아예 없다 — §7.3 |

**클라이언트 파생값 — 서버 계약 아님(✕)**

| 값 | 산출 | 근거 |
|---|---|---|
| 잔여일수(`daysRemaining`) | `Math.round((end − today) / 86,400,000)` | `types.ts:104-109`. 순수 함수 — 서버가 내려주지 않는다 |
| 갱신임박(`isRenewalDue`) | `status === 'active' && autoRenew && 0 <= 잔여 <= renewNoticeDays` | `types.ts:112-116`. **표시 규칙이다** — 서버 계약에 없다(§7.9) |
| 상태 라벨·톤(`contractStatusMeta`·`signStatusTone`) | `STATUS_META` 조회 | `types.ts:84-101`. 표시 전용 |
| 원화 표기(`formatWon`) | `formatNumber(n) + '원'` | `business.ts:45-47`. 표시 전용 |

**검증 규칙 (`contractSchema` — 서버가 재판정한다)**

| 필드 | 규칙 | 위반 시 |
|---|---|---|
| `title` | 공백 불가 · ≤80자 | 400 `VALIDATION_FAILED` |
| `accountName` | 공백 불가 · ≤60자 | 400. **화면에 `maxLength` 가 없어** 61자를 치면 제출 시점에야 안다 |
| `amount` | 폼은 문자열 `/^\d+$/` **AND** `Number(raw) > 0`, 저장 시 `digitsToNumber` 로 정수화 | 400. **상한이 없다** — 서버가 정해야 한다(§7.7) |
| `startAt`·`endAt` | `/^\d{4}-\d{2}-\d{2}$/` + 실재 날짜 + `endAt >= startAt` | 400 |
| `renewNoticeDays` | **`autoRenew` 가 true 일 때만** `/^\d+$/`. 저장 시 `autoRenew` 가 false 면 **0 으로 강제**(`ContractFormPage.tsx:142`) | 400. **하한·상한이 없다** — `'0'`·`'9999'` 도 통과(§7.7) |
| `terms` | ≤1000자 | 400 |
| `contractType`·`status`·`signStatus` | `z.enum` | 400 |
| `vatIncluded`·`autoRenew` | `z.boolean()` | 400 |
| `attachments` | **`z.array(z.string())` — 검증 전무** | 서버가 정해야 한다(§7.2) |
| `ownerName`·`note` | **제약 없음**(`z.string()`) — 길이 상한도 없다 | 서버가 상한을 정해야 한다(§7.7) |
| **상태 전이** | **스키마에 없다** — 어느 상태에서 어느 상태로도 갈 수 있다 | 서버가 정본을 세워야 한다(§7.3) |
| **`signStatus` ↔ `attachments` 정합** | **없다** — '서명완료'인데 첨부 0장이 통과한다 | §7.9 |

## 4. 엔드포인트 명세

### BE-049-EP-01 · 계약 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-049-EL-006, EL-007, EL-009, EL-009.1~.11, EL-010, EL-010.1, EL-011, EL-012, EL-016, EL-017 |
| 메서드·경로 | `GET /api/sales/contracts` |
| 근거 (심) | `data-source.ts:68` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.6) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 상태 필터·검색·정렬을 **전부 클라이언트에서** 수행하므로(`ContractListPage.tsx:105-108`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly Contract[]`. **시작일 내림차순**(같은 날짜는 `id` 내림차순 안정 정렬 — `types.ts:140-145`)으로 내려준다. 서버 순서가 정본이어야 페이징 도입 시(§7.6) 계약이 유지된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-049-EP-02 · 계약 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-049-EL-004, EL-022~EL-036, EL-038, EL-042, EL-043, EL-046 |
| 메서드·경로 | `POST /api/sales/contracts` |
| 근거 (심) | `data-source.ts:68` |
| 권한 | `admin` 만 (§7.8) |
| 멱등성 | **멱등키로 멱등**(`Idempotency-Key: <uuid>`) — 키는 `useCrudForm.ts:118-123` 이 제출 **시도** 단위로 만들어 variables 로 싣고(`:235`), 어댑터가 `WriteContext.idempotencyKey`(`crud.ts:41,47`)로 받는다 |
| 레이트리밋 | 분당 60회 |

**바디**: `ContractInput` 전체. **`id` 는 서버가 채번한다.**

**서버 검증**: §3 의 규칙 전건 재판정 + `amount`·`renewNoticeDays`·자유 텍스트의 상한(§7.7) + `attachments` 의 URL 형태(§7.2) + `status` 초기값 제약(§7.3).

**응답 201** — 프론트 `create(input, context): Promise<void>` 는 **응답 본문을 읽지 않는다**. 성공 시 목록을 무효화하고(`crud.ts:290-292`) `/sales/contracts` 로 이동한다. `Location` 헤더에 새 리소스 경로를 실어야 한다 — 프론트가 지금 쓰지 않을 뿐 계약의 일부다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **422 `INVALID_STATUS_TRANSITION`**(§7.3 — 초기 상태 제약) · 429 · 500 · 504.

---

### BE-049-EP-03 · 계약 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-049-EL-022~EL-036, EL-039 |
| 메서드·경로 | `GET /api/sales/contracts/:id` |
| 근거 (심) | `data-source.ts:68` |
| 권한 | `admin`, `operator`. 영업 도메인 읽기 권한 없음 → **404 은닉**(§7.4) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Contract`(첨부 URL·조항 전문 포함). **`version` 을 함께 내려준다**(§7.1).

**에러**: 400(id 형식) · 401 · **404 `CONTRACT_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.4) · 429 · 500 · 504.

> **어댑터 요구사항 충족**: `fetchOne` 은 이미 `HttpError(404, '항목을 찾을 수 없습니다.')` 를 던진다(`crud.ts:105-107`) — FS-049-EL-039 의 404/5xx 분기가 실제로 발현된다(EXC-12 성립). 백엔드 연결 시 이 동작을 **유지**해야 한다.

---

### BE-049-EP-04 · 계약 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-049-EL-022~EL-036, EL-038, EL-040, EL-042, EL-043, EL-045, EL-046 |
| 메서드·경로 | `PUT /api/sales/contracts/:id` |
| 근거 (심) | `data-source.ts:68` |
| 권한 | `admin` 만 (§7.8). 영업 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **멱등키로 멱등** |
| 레이트리밋 | 분당 60회 |

**바디**: `ContractInput` 전체 + **`version`**(§7.1) + `If-Match` 헤더(택1). **부분 갱신(PATCH)이 아니라 전체 치환**이다 — `attachments` 배열도 통째로 실린다.

**서버 검증**
1. **불변 필드**: `id`.
2. **낙관적 동시성**: `version` 불일치 → **409**(§7.1).
3. **상태 전이**: 저장된 `status` → 요청 `status` 가 허용 전이인지 **서버가 재판정**한다(§7.3). 위반 시 422.
4. **첨부**: 요청의 `attachments` 는 **업로드 응답으로 받은 URL 만** 받는다 — `blob:`/`data:` 스킴은 거절(§7.2).
5. §3 의 규칙 전건 재판정.

**응답 200/204** — 프론트 `update(id, input, context): Promise<void>` — 응답 본문을 읽지 않고 목록·상세를 무효화한다(`crud.ts:312-315`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `CONTRACT_NOT_FOUND`** · **409 `CONFLICT`**(version 불일치 — §7.1) · **422 `INVALID_STATUS_TRANSITION`**(§7.3) · **422 `ATTACHMENT_REQUIRED`**(서명완료인데 첨부 0장 — §7.9) · 429 · 500 · 504.

---

### BE-049-EP-05 · 계약 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-049-EL-009.10, EL-013 |
| 메서드·경로 | `DELETE /api/sales/contracts/:id` |
| 근거 (심) | `data-source.ts:68` |
| 권한 | `admin` 만 (§7.8). 영업 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **멱등키 없이 온다**(`useCrudList.tsx:102`). 이미 없는 id 는 409 를 준다(`crud.ts:139-141`)라 엄밀히는 멱등이 아니다 — §7.5 |
| 레이트리밋 | 분당 60회 |

**서버 검증**: **상태 기반 제약** — 진행중(`active`)·서명완료(`signed`) 계약은 **삭제 대신 해지(`terminated`)를 거쳐야** 한다(§7.5). 위반 시 **409 `CONTRACT_IN_FORCE`**.

**응답 204**.

**에러**: 400 · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `CONTRACT_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제 — 현재 어댑터 동작) · **409 `CONTRACT_IN_FORCE`**(§7.5) · 429 · 500 · 504.

---

### BE-049-EP-06 · 계약서 첨부 업로드 — **심 있음, 그러나 이 문서의 소유가 아니다**

FS-049-EL-034(계약서 첨부 갤러리)가 필요로 하는 쓰기다. **심은 실재한다**: `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:7-9` 의 `TODO(backend): POST /api/uploads — 파일을 보내고 응답 URL을 onChange 로 넘겨야 한다` 와 `shared/crud/validation.ts:56-58` 의 같은 심.

- 엔드포인트: **`POST /api/uploads`(심 인용).** 그러나 **이 계약의 소유자는 DS/공유 계층**이다 — 심이 `pages/sales/contracts/data-source.ts` 가 아니라 `packages/ui` 와 `shared/crud` 에 있고, 5개 이상의 화면이 같은 심을 공유한다. **이 문서는 그 계약을 정의하지 않는다** — 요청/응답 형태·크기 상한·바이러스 검사·서명 URL 정책은 공유 업로드 계약이 정할 일이다.
- 이 문서가 정하는 것은 **경계 조건 하나**다: EP-02·EP-04 는 `attachments` 에 **업로드 응답 URL 만** 받고 `blob:`/`data:` 를 거절한다(§7.2).
- 판정: §7.2.

---

### BE-049-EP-07 · 계약 일괄 삭제 — **심 없음 (미정)**

FS-049-EL-014(일괄 삭제 다이얼로그)가 필요로 하는 쓰기다. **`data-source.ts` 에 이 조작의 어댑터도 `// TODO(backend)` 주석도 없다.** 프론트는 `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`)로 **N 건의 개별 DELETE 를 병렬로** 낸다.

- 엔드포인트: **미정.** 이 문서는 `POST /api/sales/contracts/bulk-delete` 류를 **만들지 않는다** — 심이 없다.
- 판정: §7.5.

## 5. 예외 매트릭스

> EP-06 은 **이 문서의 소유가 아니고**(공유 업로드 계약), EP-07 은 **심이 없어 계약이 존재하지 않으므로** 이 매트릭스에 행이 없다(§7.2 · §7.5). 아래 5행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:38`)가 재인증으로. 화면은 목록 실패 배너(`CrudListShell.tsx:157-164`) | **403** 컬렉션 — 계약 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-049-EL-012 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → 목록 실패 배너(**status 로 분기하지 않아 403·500 이 같은 문구**) | 5초 → 504 → 같은 배너 |
| EP-02 등록 | 400 `VALIDATION_FAILED` — `title`·`accountName`·`amount`(숫자·0 초과)·기간(형식·역전)·`renewNoticeDays`·`terms` 위반. `error.fields` 로 내려보낸다 — 프론트가 **422 만** 필드에 꽂으므로(§6.1) **400 은 배너로 뭉개진다** | 401 → 전역 인터셉터. **미저장 입력은 유실된다**(FS-049 §7 #30) | **403 `FORBIDDEN`** — 컬렉션 쓰기라 은닉할 개별 리소스가 없다. `operator` 도 403(§7.8) | N/A — 생성이라 대상이 없다 | N/A — 계약에 유일성 제약이 없다. **같은 계약명·거래처·기간의 계약을 몇 개든 만들 수 있다**(§7.7 이 이를 판정한다 — 유일성을 강제하지 **않는다**) | **422 `INVALID_STATUS_TRANSITION`** — 신규 계약의 초기 `status` 는 `draft`·`review` 만 허용한다(§7.3). **현재 폼은 '진행중'·'만료'·'해지'로도 등록할 수 있다** | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-049-EL-021 배너 + 오류 코드(EXC-20 충족) | 5초 → 504 → FS-049-EL-021. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |
| EP-03 상세 | 400 — id 형식 위반 | 401 → 전역 인터셉터. 화면은 FS-049-EL-039 배너 | **읽기 권한 없음 → 404 은닉**(§7.4) — 계약 1건은 금액·조항·거래처를 담은 영업 기밀이다. 읽기 권한이 있는 `operator` 에게는 쓰기 거절 시 403 | **404 `CONTRACT_NOT_FOUND`** — 어댑터가 **이미** `HttpError(404)` 를 던진다(`crud.ts:105-107`) → FS-049-EL-039 의 '찾을 수 없습니다' + '목록으로'(재시도 없음) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → '불러오지 못했습니다' + '다시 시도' + '목록으로' | 5초 → 504 → 같은 'error' 분기 |
| EP-04 수정 | 400 `VALIDATION_FAILED` — EP-02 와 같은 규칙 + `version` 형식 + **`attachments` 의 `blob:`/`data:` 스킴 거절**(§7.2) | 401 → 전역 인터셉터. 입력 유실 | **`operator` → 403**(§7.8). **읽기 권한 없음 → 404 은닉** | **404 `CONTRACT_NOT_FOUND`** — 존재한 적 없는 id. 현재 어댑터는 **없는 id 에 409**(`crud.ts:126-128`) — 계약상 404 가 옳으나 **프론트 UX 는 409 쪽이 낫다**(충돌 다이얼로그가 입력을 보존한다). §7.1 이 판정한다 | **409 `CONFLICT`** — `version` 불일치(§7.1) 또는 대상 부재. 프론트는 `FormConflictDialog` 로 **입력을 보존한 채** '최신 내용 불러오기'/'이어서 편집'을 준다(`FormFeedback.tsx:58-74`) — **완비**. 이 화면은 인라인 쓰기가 없어 **거래처(FS-048)와 달리 뭉개지는 409 경로가 없다** | **422 `INVALID_STATUS_TRANSITION`**(§7.3 — 예: `terminated` → `draft`) · **422 `ATTACHMENT_REQUIRED`**(`signStatus === 'signed'` 인데 `attachments` 0장 — §7.9). 프론트가 `violations` 를 `setError` 로 필드에 꽂고 첫 위반으로 포커스한다(`useCrudForm.ts:182-192`) — **경로는 완비, 다만 백엔드가 없어 미발현** | 429 분당 60 + `Retry-After`. **일괄 삭제(§7.5)가 N 건을 병렬로 내므로 EP-05 쪽에 먼저 걸린다** | 500 + `traceId` → FS-049-EL-021 배너 + 입력 보존 | 5초 → 504 → 위와 동일 |
| EP-05 삭제 | 400 — id 형식 위반 | 401 → 전역 인터셉터 | **`operator` → 403**(§7.8). **읽기 권한 없음 → 404 은닉** | **404 `CONTRACT_NOT_FOUND`** — 현재 어댑터는 **409('이미 삭제된 항목입니다.' — `crud.ts:140`)** 를 준다. 삭제의 멱등성 관점에서는 204 가 옳고, 사용자 통지 관점에서는 409 가 낫다 — §7.5 가 판정한다 | **409 `CONTRACT_IN_FORCE`** — 진행중·서명완료 계약은 해지를 거쳐야 한다(§7.5). **현재 프론트에 이 제약이 없어 아무 계약이나 지운다.** 프론트는 이 409 를 다이얼로그 안 배너('삭제하지 못했습니다…')로 뭉갠다(`useCrudList.tsx:112`) | N/A — 삭제 자체에 상태 **전이**는 없다. 상태 **제약**은 409 축이 담당한다(§7.5) | 429 분당 60. **일괄 삭제가 N 건을 병렬로 낸다** — 100건 선택이 곧 100요청이다(§7.5) | 500 + `traceId` → 다이얼로그 안 danger 배너, 다이얼로그 유지, 재클릭이 재시도 | 5초 → 504 → 위와 동일 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `contractAdapter.fetchAll(signal)` | `GET /api/sales/contracts` | EP-01 | `readonly Contract[]` | O |
| `contractAdapter.fetchOne(id, signal)` | `GET /api/sales/contracts/:id` | EP-03 | `Contract` | **△ — `version` 필드를 계약에 추가해야 한다**(§7.1). 404 → `HttpError` 변환은 **이미 충족**(`crud.ts:105-107`) |
| `contractAdapter.create(input, context)` | `POST /api/sales/contracts` | EP-02 | `void` | **△ — `Idempotency-Key` · `X-CSRF-Token` 헤더를 본문에서 실어야 한다**(§6.1). 시그니처는 이미 키를 받는다 |
| `contractAdapter.update(id, input, context)` | `PUT /api/sales/contracts/:id` | EP-04 | `void` | **△ — `If-Match`/`version` 미전송**(§7.1) · 헤더 필요 · **`attachments` 가 `blob:` 이다**(§7.2) |
| `contractAdapter.remove(id, context)` | `DELETE /api/sales/contracts/:id` | EP-05 | `void` | **△ — `X-CSRF-Token` 필요.** 멱등키는 오지 않는다(`useCrudList.tsx:102`) |
| **일괄 삭제** (`useCrudList.tsx:133` → `crud.ts:349-350`) | **없음** | **EP-07 심 없음(미정)** | `settleAll` → 실패 건수 | **X — 전용 계약이 없다. N 건의 개별 DELETE 다**(§7.5) |
| **첨부 업로드** (`ImageGalleryField.tsx:153` `URL.createObjectURL`) | **`POST /api/uploads`**(`ImageGalleryField.tsx:8` — **DS 소유**) | **EP-06 — 이 문서의 소유 아님** | `blob:` object URL | **X — 업로드하지 않는다.** 값이 언마운트 시 revoke 돼 저장하면 깨진다(§7.2) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

`contractAdapter` 는 `createCrudAdapter` 가 만든다 — **본문을 바꾼다는 것은 곧 `shared/crud/crud.ts` 의 팩토리를 fetch 구현으로 바꾼다는 뜻이고, 그 순간 이 팩토리를 쓰는 모든 화면이 함께 연동된다.** 화면 코드는 0줄 바뀐다. 요구사항은 BE-048 §6.1 과 **동일**하다(같은 팩토리이므로):

1. **CSRF**: 쓰기에 `X-CSRF-Token` 헤더.
2. **멱등키**: `context.idempotencyKey` → `Idempotency-Key: <uuid>` 헤더. 값은 이미 어댑터까지 도달한다(`crud.ts:41,114,121`). 선례: `pages/members/data-source.ts:243-253`.
3. **404 → `HttpError(404)`**: **이미 충족**(`crud.ts:105-107`). fetch 구현에서도 유지할 것.
4. **409 → `HttpError(409)`**: **이미 충족**(`crud.ts:126-128,139-141`). 서버 연결 시 **`version` 불일치도 409 로 매핑**해야 한다(§7.1).
5. **422 → `HttpError` + `violations`**: `useCrudForm.ts:182-192` 가 `cause.violations` 를 읽는다. 서버의 `error.fields` 를 그 형태로 변환해야 필드 인라인 오류가 발현된다. **현재 `dev.ts:84` 는 `violations` 없는 `HttpError` 를 던져 이 경로가 죽어 있다.** 이 화면은 **422 축이 둘**(`INVALID_STATUS_TRANSITION`·`ATTACHMENT_REQUIRED`)이라 이 변환이 특히 중요하다 — 배너로 뭉개지면 '어느 상태로 갈 수 없는지'를 알 수 없다.
6. **`version` 왕복**: BE-048 §6.1 #6 과 동일 — `fetchOne` 응답의 `version` 을 `Contract` 에 실어 폼이 되돌려 보내게 한다.

**이 화면 고유 요구사항**: **`attachments` 를 업로드 응답 URL 로 바꾸는 것은 어댑터 본문의 일이 아니다** — `ImageGalleryField` 가 파일을 받아 업로드하고 URL 을 `onChange` 로 넘겨야 한다(§7.2). 즉 **DS 컴포넌트가 먼저 바뀌어야** 이 어댑터가 의미 있는 값을 보낸다. 연동 산정 시 이 선후를 빠뜨리면 안 된다.

## 7. 핵심 판정

### 7.1 409 는 '존재 여부' 기반이다 — 동시 편집은 여전히 last-write-wins 【정합 판정】

**BE-048 §7.1 과 같은 판정이며, 같은 팩토리(`createCrudAdapter`)를 쓰므로 근거도 같다.**

`createCrudAdapter.update` 는 없는 id 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던진다(`crud.ts:126-128`). **유령 저장은 해소됐다** — quality-bar EXC-04 의 acceptanceCheck 두 절이 성립한다.

**그러나 낙관적 동시성 제어가 아니다.**

| 시나리오 | 현재 동작 |
|---|---|
| A 가 편집 중 B 가 **삭제** → A 저장 | **409 → 충돌 다이얼로그** ✔ |
| A 가 편집 중 B 가 **수정** → A 저장 | **200 — A 가 B 를 조용히 덮는다** ✕ |

`Contract` 에 `version`·`updatedAt`·`etag` 가 **없다**(`types.ts:13-36` 전수 확인). `crud.ts:126` 의 가드는 `items.some(item => item.id === id)` — 대상이 있기만 하면 통과한다.

**이 도메인에서 그것이 왜 더 위험한가**: 계약은 **금액·기간·조항**을 담는다. 두 관리자가 같은 계약의 금액을 3,600만/1,800만으로 각각 고치면 **나중 값이 이기고 앞선 변경은 흔적 없이 사라진다.** 계약금액은 청구·수금·매출 인식의 근거다 — 거래처의 여신한도(BE-048)보다 직접적인 금전 효과를 갖는다. 게다가 **`attachments` 도 함께 덮인다**(§7.2) — B 가 부속합의서 스캔을 올린 뒤 A 가 저장하면 그 첨부가 사라진다.

**판정**: EP-04 는 **`version`(또는 `If-Match`/ETag)** 을 요구한다. 불일치 시 **409 `CONFLICT`**.

**프론트 비용은 거의 0 이다**: `FormConflictDialog` 가 이미 배선돼 있고(`ContractFormPage.tsx:507`) `useCrudForm.handleWriteError` 가 `isConflict` 를 이미 분기한다(`useCrudForm.ts:166-178`). **서버가 409 를 주기만 하면 복구 경로가 열린다.**

**거래처(BE-048)와 다른 점 하나**: 이 화면은 **인라인 쓰기가 없다**(`ContractListPage.tsx` 에 `useCrudRowUpdate` 소비 0건). 그래서 BE-048 §7.11 #6 이 남긴 '인라인 토글의 409 가 일반 토스트로 뭉개진다' 문제가 **여기에는 없다** — 모든 쓰기가 폼 아니면 삭제 다이얼로그를 거친다.

### 7.2 첨부는 저장되지 않는다 — 알려진 빚이며 서버가 경계를 세운다 【정합·보안 판정】

**코드로 확인한 사실**:
- `ImageGalleryField` 가 낼 수 있는 값은 `URL.createObjectURL(file)`(`ImageGalleryField.tsx:153`) = **`blob:…`** 과 제거(`''`) 뿐이다. URL 을 손으로 칠 입력이 없다.
- 그 URL 은 **언마운트 시 revoke** 된다(`:126-132`) — 폼을 떠나는 순간 죽는다.
- 스키마는 `attachments: z.array(z.string())`(`validation.ts:30`) — **검증이 전무**하다.
- 컴포넌트 헤더가 이를 자백한다(`ImageGalleryField.tsx:7-9`): `[이 필드도 **업로드하지 않는다**] TODO(backend): POST /api/uploads … 그대로 저장하면 폼을 떠나는 순간 깨진다.`

**이것은 결함이 아니라 알려진 빚이다.** `shared/crud/validation.ts:39-63` 이 그 판정을 길게 적어 두었다: http(s) 를 강제하면 **사용자가 그것을 만족시킬 방법이 없어** 폼이 영영 제출되지 않는다 — 검증을 조이는 것은 고침이 아니라 막다른 길이다. 진짜 고칠 곳은 검증이 아니라 **업로드 이음매**다.

**그러나 이 화면에서 그 빚은 다른 화면보다 무겁다.** 다른 5개 폼의 이미지는 **표시용**(로고·인증서 사본·ESG 사진)이지만, 계약서 스캔본은 **계약의 법적 실체**다. `terms` 의 1000자 요약은 요약일 뿐이고 분쟁 시 증거가 되는 것은 스캔본이다. **'서명완료' 계약을 첨부 0장으로 저장할 수 있고, 첨부를 올려도 저장되지 않는다** — 두 사실이 겹치면 이 화면은 계약서를 보관하지 못한다.

**판정 — 서버가 세우는 경계 두 줄**:
1. **EP-02·EP-04 는 `attachments` 에 업로드 응답 URL 만 받는다.** `blob:`·`data:` 스킴은 **400 `VALIDATION_FAILED`** 로 거절한다. 이 규칙은 **업로드 이음매가 붙는 순간 클라이언트가 blob 을 보낼 수 없게** 만들고, 그때 `validation.ts` 의 관대함도 함께 조인다(그 파일의 주석이 예고한 그대로다).
2. **`attachments` 는 서버가 소유하는 참조다** — 배열 전체 치환 PUT 이 §7.1 의 lost update 를 그대로 상속한다(B 가 올린 부속합의서가 A 의 저장에 사라진다). **`version` 이 이를 해소한다** — 별도 계약이 필요 없다.

**연동 선후(중요)**: **DS `ImageGalleryField` 가 먼저 바뀌어야 한다.** 어댑터 본문만 fetch 로 바꾸면 `blob:` 이 그대로 서버로 가고 서버가 그것을 400 으로 거절한다 — **연동 직후 이 폼은 첨부가 있으면 저장되지 않는다.** 어댑터만 바꾸면 되는 작업으로 산정하면 반드시 빠진다(§7.10 #3).

**추가 — `accept="image/*"` 가 PDF 를 막는다**: 계약서 스캔본은 보통 PDF 인데 `ImageGalleryField` 는 이름 그대로 **이미지 갤러리**다(`:290` `accept="image/*"`, `imageFileError` 가 타입을 본다). 문서 첨부용 컴포넌트가 필요하다 — A41(DS) 이관(§7.10 #4).

### 7.3 계약 상태에 전이 규칙이 없다 — 서버가 정본을 세운다 【정합 판정】

**코드로 확인한 사실**: `types.ts` 와 `validation.ts` 전수에 **`STATUS_FLOW`/`canSetStatus` 류가 존재하지 않는다.** `status` 는 `z.enum(['draft','review','active','expired','terminated'])`(`validation.ts:27`)일 뿐이고 select 도 5개 전부를 항상 보인다(`ContractFormPage.tsx:418-424`). 고객센터(`support/_shared/domain.ts`)가 `STATUS_FLOW`·`canTransition`·`canSetStatus`·`allowedNextStatuses` 를 **순수 규칙으로** 갖고 select 선택지를 좁히는 것과 정면으로 대비된다.

**결과**: **'해지'된 계약을 '초안'으로 되돌릴 수 있고 아무도 막지 않는다.** '만료'를 '진행중'으로 바꿀 수 있다. 신규 계약을 처음부터 '해지' 상태로 등록할 수 있다. 상태가 **자유 변수**라 그것으로 무엇도 보장할 수 없다 — 그런데 `isRenewalDue`(`types.ts:112-116`)는 `status === 'active'` 를 전제로 갱신임박을 판정하고, 목록 필터는 상태로 거른다.

**판정 — 서버가 전이 규칙의 정본이다.**

| 현재 | 허용되는 다음 상태 | 근거 |
|---|---|---|
| `draft` | `review` · `terminated` | 초안은 검토로 올리거나 폐기한다 |
| `review` | `draft` · `active` · `terminated` | 검토는 보완(초안 복귀)·체결(진행)·폐기 |
| `active` | `expired` · `terminated` | 진행중은 만료되거나 해지된다. **진행중으로 되돌아오는 경로는 없다** |
| `expired` | **없음** | 종착 — 갱신은 **새 계약**이지 상태 되돌리기가 아니다 |
| `terminated` | **없음** | 종착 |

- 현재 상태 → 자기 자신은 언제나 허용(변경 없음도 유효한 저장).
- **신규 등록(EP-02)의 초기 상태는 `draft`·`review` 만** 허용한다 — 존재한 적 없는 계약이 '만료'로 태어날 수는 없다.
- **`expired` 를 서버가 자동 전이할 것인가**는 §7.9 가 다룬다(현재는 사람이 손으로 바꾼다).

**위반 시 422 `INVALID_STATUS_TRANSITION`** — `error.fields: [{ name: 'status', … }]` 로 내려보내면 프론트의 `setError` 경로(`useCrudForm.ts:182-192`)가 **그 select 에 인라인 오류**를 꽂는다. 배너로 뭉개면 '어느 상태로 갈 수 없는지'를 알 수 없다.

**프론트 후속(A11)**: 이 규칙을 순수 함수로 프론트에도 두면 select 선택지를 좁혀 1차 차단할 수 있다 — FS-026 이 그렇게 한다(`allowedNextStatuses`). **그러나 서버가 정본이라는 사실은 바뀌지 않는다.** 프론트 규칙은 UX 이지 방어선이 아니다.

**`signStatus` 도 같다** — 미발송→서명대기→일부서명→서명완료가 자연스러운 흐름인데 어느 방향으로도 갈 수 있다. 다만 §7.9 가 판정하듯 **서명 워크플로 자체가 없어** 이 필드는 지금 '사람이 적는 메모'에 가깝다. 워크플로가 생기면 이 필드는 **서버 파생**이 되고 폼에서 사라진다 — 그때 전이 규칙도 함께 온다.

### 7.4 계약 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/sales/contracts` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 계약 리소스의 존재 자체가 보호 대상이다** → 영업 도메인 **읽기 권한이 없는** 주체에게는 **404 `CONTRACT_NOT_FOUND`** 로 은닉한다.

**근거**: 계약 1건은 ① **거래처명** ② **계약금액**(부가세 기준 포함) ③ **계약 기간** ④ **주요 조항 요약**(지급조건·해지조건·SLA — 시드가 '미납 시 서비스 일시중지 조항 포함'·'착수금 30% / 중도금 40% / 잔금 30%' 를 담는다) ⑤ **계약서 스캔본**을 담는다. **이것은 영업 기밀의 정의 그 자체다** — 경쟁사가 우리가 특정 거래처와 얼마에 어떤 조건으로 계약했는지 알면 그것으로 입찰한다. 거래처 원장(BE-048 §7.4)보다 민감도가 **높다**. 계약 id 열거로 '이 회사와 계약이 있는가'를 알아내는 경로를 닫는다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 계약의 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다.

**프론트 영향**: FS-049-EL-039 가 404 를 '계약을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'로 그린다 — **은닉은 성립하지만 정당한 운영자도 원인을 모른다.** 은닉의 대가이며 의도된 것이다.

**추가 위험 — 목록이 전문을 내려준다**: EP-01 이 `Contract` 전량(`terms`·`attachments`·`note` 포함)을 내려주므로 **영업 도메인 읽기 권한만 있으면 전 계약의 조항 전문과 첨부 URL 을 한 번에 받는다.** §7.6 의 `ContractSummary` 분리가 이 노출을 줄인다.

### 7.5 삭제 — 계약은 감사 대상 기록이다 【정합 판정】

**① 상태 무관 삭제가 열려 있다.** FS-049-EL-013 은 **서명완료·진행중 계약도 아무 경고 없이** 지운다 — 확인 다이얼로그의 문구가 `'<계약명>'을 삭제합니다. 이 작업은 되돌릴 수 없습니다.` 하나뿐이고 상태를 언급하지 않는다. 진행중인 계약을 지우면 **청구 근거가 사라진다.**

**판정**: EP-05 는 **진행중(`active`)·서명완료(`signed`) 계약을 409 `CONTRACT_IN_FORCE` 로 거절**한다. 지우려면 먼저 **해지(`terminated`)** 로 전이해야 한다(§7.3 이 그 경로를 연다). 이것은 UX 제약이 아니라 **감사 요구**다 — 효력 있는 계약이 흔적 없이 사라지는 경로를 닫는다.

**BE-026 §7.7('문의는 삭제할 수 없다')만큼 강하게는 가지 않는다** — 잘못 입력한 초안 계약을 지울 수 있어야 한다. 초안·검토중·만료·해지는 삭제를 허용한다.

**② 일괄 삭제에 전용 계약이 없다.** BE-048 §7.5 와 **동일한 구조적 문제**다 — 프론트가 `settleAll` 로 N 건의 개별 DELETE 를 병렬로 낸다(`crud.ts:349-350`). 원자성이 없고, 레이트리밋(분당 60)에 자기가 걸리며(100건 = 100요청), 실패 id 를 모르고, 감사 로그가 N 줄이다. **여기서는 §7.5 ①의 409 가 그 위에 얹혀** 더 나빠진다 — 진행중 계약 40건이 섞인 100건 일괄 삭제는 '100건 중 40건을 삭제하지 못했습니다'만 알리고 **어느 40건인지 말하지 않는다.**

**판정**: **이 문서는 `POST /api/sales/contracts/bulk-delete` 를 만들지 않는다** — 심이 없다(§4 EP-07). 발명하지 않는 것이 이 문서의 원칙이다. 판정만 남긴다: 전용 계약이 필요하며 `{ ids: string[] }` 를 받아 **전건 성공 또는 전건 실패**를 반환하고 실패 시 `error.fields` 에 실패 id 와 사유(`CONTRACT_IN_FORCE`)를 담아야 한다. **심을 심는 것이 선행 작업**이다(§7.10 #7).

**③ 삭제의 멱등성**: BE-048 §7.5 ②와 동일 판정 — **409 를 유지한다**(두 관리자가 같은 행을 지울 때 두 번째 사람이 '자기가 지웠다'고 오해하지 않게). 다만 일괄 삭제에서는 '이미 없음' 409 를 실패로 세지 않아야 한다.

### 7.6 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**(BE-048 §7.9 와 같은 구조):
1. **페이징이 없다.** `fetchAll(signal)` 이 전량을 반환하며 프론트가 필터·검색·정렬을 전부 클라이언트에서 한다. 계약은 **해마다 쌓이는 컬렉션**이다.
2. **목록이 상세 전문을 담는다.** `Contract` 타입 하나를 목록·상세가 공유해 목록 응답에 `terms`(조항 전문 1000자) · `attachments`(첨부 URL) · `note`(내부 메모)가 실린다 — **목록 화면이 쓰지 않는 필드**이며 §7.4 의 취지와 충돌한다.

**판정**: **`ContractSummary` / `Contract` 를 분리**하고 EP-01 에 `status`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ContractSummary` 는 `terms`·`attachments`·`note`·`ownerName` 을 뺀다.

**이 도메인 고유의 추가 요구 — 정렬과 갱신임박 필터**: FS-049 §7 #20 이 지적하듯 **정렬이 시작일 내림차순 고정**이라 만료 임박 순으로 훑을 수 없고, 갱신임박 배지가 있어도 **그것으로 거르거나 정렬할 수 없다.** 페이징이 도입되는 순간 이 둘은 **서버 기능이 된다** — 클라이언트는 현재 페이지만 알기 때문이다. `sort=endAt:asc` · `renewalDue=true` 쿼리를 그때 함께 넣어야 한다. **`isRenewalDue` 는 지금 클라이언트 파생값이지만(§3), 필터·정렬 대상이 되는 순간 서버 계산이 된다** — BE-026 §7.10 이 SLA 에 대해 내린 판정과 같은 구조다.

**이관**: 프론트 대공사다 — `filterContracts`/`searchContracts`/`sortContracts` 가 서버로 올라가고 페이지네이션 UI(FS-049 §7 #2)·`SeqCell` 오프셋이 함께 붙어야 한다. quality-bar IA-04 P0 가 이미 이 화면을 gap 으로 잡고 있으므로 **한 배치로 묶는 것이 옳다.** IA-13(URL state)은 **이미 충족**돼 있다(`useListState` 소비). 그전까지 현 계약(전량)을 유지한다 — 픽스처 3건에서는 드러나지 않는다.

### 7.7 금액·기간·통지기한에 상한이 없다 — 서버가 정한다 【정합 판정】

| 필드 | 현재 | 문제 |
|---|---|---|
| `amount` (계약금액) | `/^\d+$/` **AND** `> 0` | **상한이 없다.** 20자리 숫자도 통과하고 `Number()` 가 `MAX_SAFE_INTEGER` 를 넘으면 값이 조용히 뭉개진다 |
| `renewNoticeDays` (통지기한) | `autoRenew` 일 때만 `/^\d+$/` | **하한·상한이 없다.** `'0'` 이면 만료 당일에야 임박 배지가 뜨고(통지의 의미가 사라진다), `'9999'` 면 계약 시작부터 임박이다 |
| `startAt`·`endAt` | 실재 날짜 + `end >= start` | **범위 상한이 없다.** `'9999-12-31'` 계약이 통과한다. `end === start`(0일 계약)도 통과한다 |
| `ownerName`·`note` | **제약 없음**(`z.string()`), `maxLength` 없음 | 서버가 상한을 정하지 않으면 1MB 짜리 담당자명을 받는다 |
| `accountName` | 스키마 ≤60자, **화면에 `maxLength` 없음** | 61자를 치면 제출 시점에야 안다 — 다른 필드(계약명 80자)는 `maxLength` 가 있어 일관되지 않다 |

**판정 — 서버가 다음을 강제한다**:
1. `amount` 는 **1 이상 · 상한 있음**(정책값 — 예: 1조). 위반 시 400 `OUT_OF_RANGE`.
2. `renewNoticeDays` 는 **1~365**. `autoRenew` 가 false 면 0(프론트가 이미 강제한다 — `ContractFormPage.tsx:142`).
3. `startAt`·`endAt` 은 **실재 달력일**이고 `endAt > startAt`(같은 날 계약을 허용할 것인가는 A01 판정 — 현재 스키마는 `end < start` 만 막아 **같은 날을 허용**한다). 종료일의 상한(예: 시작일 + 30년)을 둔다.
4. 자유 텍스트(`ownerName`·`note`)에 상한을 준다.

**유일성은 강제하지 않는다.** 같은 계약명·거래처·기간의 계약이 둘 있는 것은 **정상**일 수 있다(1차/2차 발주). BE-048 §7.3 이 사업자등록번호에 유일성을 요구한 것과 **다른 판정**이며, 그 차이는 '원장 키'와 '거래 문서'의 차이다.

### 7.8 `operator` 는 조회 전용이다 — BE-048 과 같은 판정

BE-048 §7.8 과 **동일**하다. 계약의 쓰기는 **금액·기간·조항·상태**를 바꾸는 일이다 — 그것은 응대가 아니라 **계약 행위의 기록**이다. `operator` 가 계약금액을 고치거나 진행중 계약을 해지로 바꿀 수 있다면 역할 구분이 무의미하다. BE-026(1:1 문의)이 `operator` 에게 쓰기를 연 것은 '한 고객에게 보내는 답변'이 운영자 직무이기 때문이며, 계약은 그 반대편에 있다.

**결론**: EP-01·EP-03(조회)은 `admin` + `operator`. **EP-02·EP-04·EP-05(쓰기)는 `admin` 만.** 영업 도메인 권한이 아예 없는 역할은 컬렉션 403 / 개별 404(§7.4).

> **이 판정이 프론트 공백과 만나는 지점**: 프론트에 쓰기 게이팅이 없어(FS-049 §7 #3) **`operator` 는 '계약 등록'·행 수정/삭제·일괄 삭제 버튼을 전부 본다.** 누르면 서버가 403 을 주고, 그 403 은 '저장하지 못했습니다'·'삭제하지 못했습니다'로 뭉개진다 — **운영자는 자기가 권한이 없다는 사실을 영영 모르고 서버 장애로 오해한다.** 서버 계약은 옳지만 그 옳음이 화면에 닿지 않는다(§7.10 #5).

### 7.9 전자서명·자동갱신은 계약에 존재하지 않는다 【범위 판정】

**F2/F3b 코드로 재확인한 사실**:
- `signStatus` 는 `SelectField` 로 사람이 고른다(`ContractFormPage.tsx:426-434`). **발송·수집·검증 어디에도 코드가 없다** — `pages/sales/contracts/**` 전수에 서명 관련 호출·심이 0건이다.
- `autoRenew`·`renewNoticeDays` 는 데이터일 뿐이고 **이를 실행하는 배치·통지 발송이 없다.** 화면은 `isRenewalDue`(`types.ts:112-116`)로 **배지만** 띄운다(`ContractListPage.tsx:128`).
- `status` 의 `expired` 도 **사람이 손으로 바꾼다** — 종료일이 지나도 자동으로 만료가 되지 않는다.

**판정**: `POST /api/sales/contracts/:id/sign-request` · `POST /api/sales/contracts/:id/renew` · 만료 자동 전이 배치를 **만들지 않는다.** 심이 없고, 화면에 진입점이 없으며, 이것들은 **별도 도메인**(전자서명 서비스 연동 · 스케줄러)이다. BE-026 §7.7 이 '문의 생성·삭제'를 범위 밖으로 확정한 것과 같은 결이다.

**그러나 이 부재는 '의도된 부재'가 아니라 '미구현'이다** — BE-026 의 문의 생성이 코드 네 겹(어댑터 거절·저장소 함수 부재·주석·UI 부재)으로 못박혔던 것과 다르다. 여기서는 **필드가 존재하는데 그 필드를 움직이는 것이 없을 뿐**이다. 그 차이가 실제 위험을 만든다:

| 사실 | 결과 |
|---|---|
| '서명완료'가 사람이 고르는 값이다 | 서명되지 않은 계약이 '서명완료'로 보인다. 첨부 0장이어도 막지 않는다 |
| 자동갱신이 실행되지 않는다 | `autoRenew: true` 계약이 만료되면 **아무 일도 일어나지 않는다** — 그런데 화면은 '자동갱신' 배지를 보여 운영자에게 '알아서 갱신된다'고 말한다 |
| 갱신 통지가 발송되지 않는다 | `renewNoticeDays: 30` 이 **배지 색을 바꾸는 것 외에 아무것도 하지 않는다.** 배지를 못 보고 지나가면 통지 기한이 지나간다 |
| 만료가 자동 전이되지 않는다 | 종료일이 지난 계약이 '진행중'으로 남는다 → `isRenewalDue` 가 계속 true 를 준다(잔여일수가 음수면 false 로 떨어지나, **상태를 손으로 안 바꾸면 목록 필터 '진행중'에 계속 잡힌다**) |

**최소 계약 하나는 지금 정할 수 있다 — `ATTACHMENT_REQUIRED`**: EP-04 는 `signStatus === 'signed'` 인데 `attachments` 가 0장이면 **422 `ATTACHMENT_REQUIRED`** 로 거절한다. 서명완료를 주장하려면 증거가 있어야 한다. **다만 §7.2 의 업로드 이음매가 선행돼야** 이 규칙이 의미를 갖는다 — 지금은 첨부가 `blob:` 이라 서버에 도달하지도 않는다.

**나머지는 A01 이관**(§7.10 #8) — 서명 워크플로와 갱신 스케줄러는 도메인 경계 결정이 먼저다.

### 7.10 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **`Contract.version` 추가 + EP-04 의 `If-Match`/`version` 검증(§7.1)** — 현재 409 는 '존재 여부' 기반이라 **동시 편집이 last-write-wins 로 조용히 덮인다**. 계약금액·첨부가 함께 덮인다. 프론트는 `FormConflictDialog` 가 이미 배선돼 있어 **서버가 409 를 주기만 하면 복구 경로가 열린다** | **A63 · A11 (최우선)** |
| 2 | **계약 상태 전이 규칙(§7.3)** — 현재 `STATUS_FLOW`/`canSetStatus` 류가 **존재하지 않아** '해지'에서 '초안'으로 되돌릴 수 있다. 서버가 정본을 세우고 422 `INVALID_STATUS_TRANSITION` 으로 막는다. 프론트는 순수 규칙으로 select 를 좁혀 1차 차단(FS-026 의 `allowedNextStatuses` 선례) | **A63 · A11** |
| 3 | **첨부 업로드 이음매(§7.2)** — **`ImageGalleryField` 가 먼저 바뀌어야 한다.** 어댑터 본문만 fetch 로 바꾸면 `blob:` 이 서버로 가고 400 으로 거절돼 **첨부 있는 폼이 저장되지 않는다.** 연동 산정에 반드시 포함. EP-02·EP-04 는 `blob:`/`data:` 를 400 으로 거절한다 | **A41(DS) · A63 · A11** |
| 4 | 첨부가 **`accept="image/*"` 라 PDF 를 받지 않는다**(§7.2) — 계약서 스캔본은 보통 PDF 다. 문서 첨부용 컴포넌트가 필요하다 | A41 (DS) · A11 |
| 5 | **쓰기 게이팅 부재(§7.8)** — `operator` 가 `admin` 전용 버튼을 전부 보고 누르며, 403 이 '저장하지 못했습니다'로 뭉개진다(quality-bar EXC-03 P0) | A11 change_request |
| 6 | **진행중·서명완료 계약의 삭제 제약(§7.5)** — 409 `CONTRACT_IN_FORCE`. 효력 있는 계약이 흔적 없이 사라지는 경로를 닫는다. 지우려면 해지를 거쳐야 한다 | A63 · A11 |
| 7 | **일괄 삭제 전용 계약 부재(§7.5)** — 심을 먼저 심어야 한다(`// TODO(backend): POST /api/sales/contracts/bulk-delete` + 어댑터 `removeMany`). 현재 N 건 병렬 DELETE 라 원자성·레이트리밋·실패 식별이 깨지고, `CONTRACT_IN_FORCE` 가 얹히면 '어느 40건이 실패했는지'를 모른다 | A63 · A11 |
| 8 | **전자서명 워크플로 · 자동갱신 실행 · 만료 자동 전이(§7.9)** — 필드는 있는데 그것을 움직이는 것이 없다. '자동갱신' 배지가 실제로는 아무것도 하지 않는다. 도메인 경계 결정이 선행 | **A01 · A63** |
| 9 | `signStatus === 'signed'` 인데 첨부 0장이면 422 `ATTACHMENT_REQUIRED`(§7.9) — **#3 이 선행돼야 의미를 갖는다** | A63 |
| 10 | **금액·기간·통지기한·자유 텍스트 상한(§7.7)** — `amount` 상한 없음, `renewNoticeDays` `'0'`·`'9999'` 통과, `endAt === startAt`(0일 계약) 통과, `ownerName`·`note` 무제약. `accountName` 은 스키마 60자인데 화면에 `maxLength` 가 없다 | A63 · A11 |
| 11 | **거래처 참조가 이름 문자열이다(§7.5 · BE-048 §7.7)** — `types.ts:16-17` 의 주석이 자백한다. 계약이 `accountId` FK + 발행 시점 스냅샷으로 바뀌어야 한다. 그전까지 BE-048 EP-05 의 `ACCOUNT_IN_USE` 는 판정 불가다. **BE-048 §7.7 · BE-050 §7.6 과 공동 판정** | **A63 (세 문서 공동)** |
| 12 | 조항(`terms`)·비고 저장 시 XSS 정제 — 관리자 화면은 텍스트 노드라 안전하나, quality-bar ERP-10 이 **계약서 PDF** 를 로드맵에 올려 두었고 PDF 렌더러는 React 이스케이프를 상속하지 않는다. BE-048 §7.10 · BE-050 §7.7 과 같은 뿌리 | A63 |
| 13 | 목록 페이징 + `ContractSummary` 분리(§7.6) — IA-04 P0 와 한 배치로. **정렬(`sort=endAt:asc`)·갱신임박 필터(`renewalDue=true`)가 그때 서버 기능이 된다** — 만료 임박 순으로 훑는 것은 계약 운영의 핵심 루프다 | A63 · A11 |
| 14 | 400 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다 — `useCrudForm` 은 **422 만** `setError` 로 꽂는다(`useCrudForm.ts:182`). **이 화면은 422 축이 둘**(`INVALID_STATUS_TRANSITION`·`ATTACHMENT_REQUIRED`)이라 변환이 특히 중요하다 | A11 · A63 |
| 15 | 401 감지·리다이렉트는 구현됐으나 **미저장 입력이 유실**된다(quality-bar EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) · 오프라인 감지 없음(EXC-11 P1) | A11 · A40 |
| 16 | 목록 엑셀 내보내기 부재(quality-bar ERP-12 P1) — 계약 목록은 법무·회계 검토의 대표 대상이다 | A11 · A63 |

## 8. 자기 점검

- [x] FS-049 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 5건(EP-01~05) 매핑 완료. **EP-06(첨부 업로드)은 '심 있음, 그러나 이 문서의 소유 아님'**(DS 소유 — `ImageGalleryField.tsx:8`), **EP-07(일괄 삭제)은 '심 없음(미정)'** 으로 명시하고 §7.2 · §7.5 판정을 남겼다. **엔드포인트를 발명하지 않았다** — `data-source.ts:68` 의 심 한 줄이 EP-01~05 전부의 근거이고, EP-06 은 심 문구(`POST /api/uploads`)를 인용만 했다
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열 — EP-06·07 이 행이 없는 이유를 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한만 고유 차이**(`operator` 조회 전용 — §7.8)를 근거와 함께 기술
- [x] **`createCrudAdapter` 소비를 코드로 확인**하고(`data-source.ts:69`) §1.1 근거표에 남겼다. **409 가 '존재 여부' 기반이지 version/ETag 토큰이 아님을 §7.1 이 표로 갈랐다** — 유령 저장은 해소, 동시 편집은 여전히 last-write-wins. **이 화면은 인라인 쓰기가 없어** BE-048 §7.11 #6 의 '토글 409 뭉개짐'이 없음도 확인해 적었다
- [x] 멱등성 판정 — GET 멱등 / POST·PUT 은 **멱등키로 멱등**(키가 실제로 어댑터까지 도달함을 `crud.ts:41,114,121` 로 확인) / **DELETE 는 키 없이 옴**(`useCrudList.tsx:102`)
- [x] **보안 판정 3건 이상** — **403 vs 404 은닉**(§7.4 — 계약은 거래처보다 민감하다) · **첨부의 `blob:`/`data:` 거절 경계**(§7.2) · **XSS 저장 시 정제**(§7.10 #12). 정합 판정 — §7.1 동시성 · §7.3 상태 전이 부재 · §7.5 감사 기록 삭제 · §7.7 상한 부재
- [x] **상태 전이 규칙이 코드에 존재하지 않음을 전수로 확인**하고(`types.ts`·`validation.ts` 에 `STATUS_FLOW`/`canSetStatus` 0건) §7.3 에 서버 정본 표를 세웠다. 고객센터 `_shared/domain.ts` 와의 대비를 근거로 댔다
- [x] **`blob:` 첨부를 '결함'이 아니라 '알려진 빚 + 그 근거'** 로 적고(`shared/crud/validation.ts:39-63`), **이 도메인에서 그 빚이 더 무거운 이유**(계약서 = 법적 실체)와 **연동 선후**(DS 가 먼저)를 §7.2 · §7.10 #3 에 명시했다
- [x] 클라이언트 파생값(잔여일수·갱신임박·라벨·톤·원화 표기)을 **서버 계약 아님(✕)** 으로 §3 에 분리하고, **페이징 도입 시 갱신임박이 서버 계산이 됨**을 §7.6 에 예고했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
</content>
