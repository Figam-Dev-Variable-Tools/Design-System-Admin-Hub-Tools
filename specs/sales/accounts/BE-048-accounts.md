---
id: BE-048
title: "거래처 백엔드 기능 명세"
functionalSpec: FS-048
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-048. 거래처 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-048 거래처 (`/sales/accounts` · `/new` · `/:id/edit`) |
| 범위 | 거래처 목록 조회, 거래처 상세 조회, 거래처 등록, 거래처 수정(거래 상태 인라인 토글 포함), 거래처 삭제 |
| **범위 밖** | **거래 이력·미수금·세금계산서** — `lastTradeAt` 은 사람이 입력하는 필드이며 거래에서 파생되지 않는다(§7.6). **여신 소진액·신용 심사** — `creditLimit`·`creditGrade` 는 운영자가 정하는 값이고 산정 엔진이 없다(§7.6). **주소 검색(우편번호)** — 화면에 진입점이 없다(§4 EP-07). **일괄 삭제 전용 계약** — 프론트가 N 건의 개별 DELETE 를 병렬로 낸다(§4 EP-06 · §7.5). **거래처 ↔ 계약/견적 참조 무결성** — 계약(BE-049)·견적(BE-050)은 거래처를 **이름 문자열**로만 들고 FK 가 없다(§7.7) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 달력일은 `'YYYY-MM-DD'` 문자열 |
| 프론트 어댑터 | `apps/admin/src/pages/sales/accounts/data-source.ts` (`accountAdapter` — `createCrudAdapter` 로 조립) |
| 도메인 타입 | `apps/admin/src/pages/sales/accounts/types.ts` · 공용 순수 규칙 `apps/admin/src/pages/sales/_shared/business.ts`(견적 FS-050 과 공유) |
| 검증 정본 | `apps/admin/src/pages/sales/accounts/validation.ts` (`accountSchema` — zod/mini). 사업자등록번호 체크섬은 `_shared/business.ts:29-42` `isValidBizNo` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-026 §2 와 동일 선언). 아래는 거래처 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 판정 대상 | 코드 근거 | 확인 결과 |
|---|---|---|
| 어댑터 팩토리 | `data-source.ts:111` `createCrudAdapter<Account, AccountInput>({ scope: 'sales-accounts', … })` | `createStoreAdapter` 가 **아니다**. 자체 클로저 배열(`crud.ts:90`)을 갖는다 — 다른 어댑터가 이 배열을 쓸 수 없다 |
| 연동 심 | `data-source.ts:110` `// TODO(backend): GET/POST /api/sales/accounts · GET/PUT/DELETE /api/sales/accounts/:id` | **이 한 줄이 이 화면의 유일한 심**이다. 일괄 삭제·주소 검색·토글 전용 심은 **없다** |
| 404 발생 | `crud.ts:105-107` `if (found === undefined) throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')` | `fetchOne` 이 status 를 실어 던진다 → `useCrudForm` 의 `isNotFound` 분기가 발현된다(EXC-12 성립) |
| 409 발생 | `crud.ts:126-128`(update) · `:139-141`(remove) | **'존재 여부' 기반**이다. `version`/`ETag` 비교가 아니다 — §7.1 |
| 멱등키 | `crud.ts:41` `WriteContext.idempotencyKey` · `:114,116`(create) · `:121,131`(update) · `useCrudForm.ts:118-123,228,235` | **폼 저장에만 도달**한다. 삭제·인라인 토글은 키 없이 온다(`crud.ts:32-41` 의 명시적 판정) |
| 낙관적 동시성 토큰 | `types.ts:29-55` `Account` 필드 전수 | `version`·`updatedAt`·`etag` **없음**. 어댑터가 `If-Match` 를 보내지 않는다 — §7.1 |
| 사업자번호 검증 | `validation.ts:47-57` → `business.ts:29-42` | 10자리 + 국세청 체크섬. **클라이언트에만 있다** — §7.3 |
| 담당자 저장 형태 | `types.ts:58` `AccountInput = Omit<Account, 'id'>` · `AccountFormPage.tsx:147-154` | 배열 **전체 치환**. append/patch 경로 없음 — §7.2 |
| 담당자 id 채번 | `AccountContactsField.tsx:86` `ct-new-${Date.now()}-${난수 0~1000}` | **클라이언트가 정한다** — §7.2 |
| 쓰기 권한 게이팅 | `useRouteWritePermissions` grep — 소비처 9곳(`shared/permissions/RequirePermission.tsx` 정의 + settings 4 · products 3 · logs 1) | `pages/sales/**` **없음**. 프론트에 쓰기 게이팅이 없다(FS-048 §7 #3) — §7.4 |
| 상태 필드 | `types.ts:51` `active: boolean` | 삭제와 별개의 '거래중지' 플래그다 — soft-delete 가 아니다(§7.5) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회 계열(목록·상세) 전용** — 등록·수정·삭제·상태 토글은 **403**(§7.8). 영업 도메인 읽기 권한 없는 관리자 → 컬렉션 **403** / 개별 거래처 **404 은닉**(§7.4).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-048 §4.1) — 권한 강제는 서버 책임. 프론트에 쓰기 게이팅이 배선돼 있지 않다(FS-048 §7 #3)는 사실이 이 원칙을 **바꾸지 않는다** — 오히려 서버가 유일한 방어선임을 뜻한다(§7.4).

## 3. 데이터 계약 (`types.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Account` | `id` · `name`(상호) · `bizNo` · `ceoName` · `bizType`(업태) · `bizItem`(종목) · `tradeType` · `taxType` · `creditGrade` · `creditLimit`(원, 0=미설정) · `paymentTerm` · `address` · `phone` · `contacts[]` · `active` · `lastTradeAt`('YYYY-MM-DD' \| `''`) · `note` | 목록·상세가 **같은 타입**이다 — 목록도 `contacts`·`note`·`address` 전문을 받는다(§7.9) |
| `AccountContact` | `id` · `name` · `department` · `position` · `phone` · `email` · `primary` | **개인정보**. `primary` 는 한 명만 true 로 유지한다 — **UI 규칙일 뿐 스키마가 강제하지 않는다**(§7.2) |
| `AccountInput` | `Omit<Account, 'id'>` | 등록·수정·토글이 **모두 같은 입력**을 쓴다. 전체 치환이다 |
| `TradeType` | `sales` \| `purchase` \| `both` | 매출처/매입처/매입매출 |
| `TaxType` | `general` \| `simplified` \| `exempt` \| `zero_rated` | 일반/간이/면세/영세율 |
| `CreditGrade` | `A` \| `B` \| `C` \| `D` | 우량→불량. **산정 근거 없음**(§7.6) |
| `PaymentTerm` | `cash` \| `eom` \| `net_30` \| `net_60` \| `next_eom` | 현금/말일/Net-30/Net-60/익월말 |
| 상수 | `ACCOUNT_NAME_MAX = 60` · `ACCOUNT_NOTE_MAX = 500` · `ACCOUNT_MAX_CONTACTS = 8` | `types.ts:60-62` |

**서버가 정본인 필드 (프론트 요청을 믿지 않는다)**

| 필드 | 정본 | 근거 |
|---|---|---|
| `id` | 서버 채번 | 픽스처는 `acc-<seq>`(`data-source.ts:114-117`) — 프로세스 지역 카운터라 계약이 아니다 |
| `contacts[].id` | **서버 채번** | 현재 클라이언트가 `ct-new-<Date.now()>-<난수>` 로 정한다(`AccountContactsField.tsx:86`) — §7.2 |
| `createdAt` / `updatedAt` / `version` | 서버 | **현재 타입에 없다.** §7.1 이 `version` 을 계약에 넣을 것을 요구한다 |

**클라이언트 파생값 — 서버 계약 아님(✕)**

| 값 | 산출 | 근거 |
|---|---|---|
| 대표담당(`primaryContact`) | `contacts.find(primary) ?? contacts[0]` | `types.ts:120-122`. 순수 함수 — 서버가 별도 필드로 내려주지 않는다 |
| 사업자번호 표기(`formatBizNo`) | 숫자 10자리 → `000-00-00000` | `business.ts:17-23`. **저장 값 자체가 하이픈 표기**다(`types.ts:33` 주석 · 시드 `'124-81-00998'`) — §7.3 이 이를 판정한다 |
| 원화 표기(`formatWon`) | `formatNumber(n) + '원'` | `business.ts:45-47`. 표시 전용 |
| 배지 톤 | `tradeTypeTone` · `creditGradeTone` | `types.ts:105-117`. 표시 전용 |

**검증 규칙 (`accountSchema` — 서버가 재판정한다)**

| 필드 | 규칙 | 위반 시 |
|---|---|---|
| `name` | 공백 불가 · ≤60자 | 400 `VALIDATION_FAILED` |
| `bizNo` | 10자리 + **국세청 체크섬**(`isValidBizNo`) | 400 (§7.3) |
| `ceoName` | 공백 불가 · ≤40자 | 400 |
| `creditLimit` | 폼은 문자열 `/^\d+$/`, 저장 시 `digitsToNumber` 로 정수화 | 400. **상한이 없다** — 서버가 정해야 한다(§7.6) |
| `contacts` | ≥1명 · 각 행 `name` 공백 불가 · `email` 은 채우면 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | 400 |
| `note` | ≤500자 | 400 |
| `tradeType`·`taxType`·`creditGrade`·`paymentTerm` | `z.enum` | 400 |
| `bizType`·`bizItem`·`address`·`phone` | **제약 없음**(`z.string()`) — 길이 상한도 없다 | 서버가 상한을 정해야 한다(§7.6) |
| `lastTradeAt` | **제약 없음**(`z.string()`) — 달력일 실재를 확인하지 않는다 | 서버가 `'YYYY-MM-DD'` 또는 `''` 를 강제해야 한다(§7.6) |
| `active` | `z.boolean()` | 400 |
| **`contacts[].primary` 가 정확히 1건** | **스키마에 없다** — UI 규칙일 뿐(`AccountContactsField.tsx:146-156`) | 서버가 강제해야 한다(§7.2) |

## 4. 엔드포인트 명세

### BE-048-EP-01 · 거래처 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-048-EL-006, EL-007, EL-009, EL-009.1~.12, EL-010, EL-011, EL-012, EL-016, EL-017 |
| 메서드·경로 | `GET /api/sales/accounts` |
| 근거 (심) | `data-source.ts:110` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.9) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 거래유형 필터·검색·정렬을 **전부 클라이언트에서** 수행하므로(`AccountListPage.tsx:114-117` · `filterAccounts`/`searchAccounts`/`sortAccounts`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly Account[]`. **상호 가나다 오름차순**(`localeCompare(…, 'ko')`)으로 내려준다 — 프론트가 `sortAccounts` 로 한 번 더 정렬하지만 서버 순서가 정본이어야 페이징 도입 시(§7.9) 계약이 유지된다. **`localeCompare` 의 한국어 대조 규칙과 서버 DB 콜레이션이 일치해야 한다** — 어긋나면 페이징 도입 순간 행이 페이지 경계에서 중복·누락된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-048-EP-02 · 거래처 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-048-EL-004, EL-022~EL-038, EL-040, EL-044, EL-045, EL-048 |
| 메서드·경로 | `POST /api/sales/accounts` |
| 근거 (심) | `data-source.ts:110` |
| 권한 | `admin` 만 (§7.8) |
| 멱등성 | **멱등키로 멱등**(`Idempotency-Key: <uuid>`) — 같은 키의 재시도는 두 번 만들지 않고 최초 응답을 재생한다. 키는 `useCrudForm.ts:118-123` 이 제출 **시도** 단위로 만들어 variables 로 싣고(`:235`), 어댑터가 `WriteContext.idempotencyKey`(`crud.ts:41,47`)로 받는다 |
| 레이트리밋 | 분당 60회 |

**바디**: `AccountInput` 전체. **`id` 와 `contacts[].id` 는 서버가 채번한다** — 요청의 `contacts[].id`(`ct-new-…`)는 **무시**한다(§7.2).

**서버 검증**: §3 의 규칙 전건 재판정 + `bizNo` 체크섬(§7.3) + **`contacts` 중 `primary` 가 정확히 1건**(§7.2) + `creditLimit`·자유 텍스트 필드의 상한(§7.6).

**응답 201** — 프론트 `create(input, context): Promise<void>` 는 **응답 본문을 읽지 않는다**. 성공 시 목록을 무효화하고(`crud.ts:290-292`) `/sales/accounts` 로 이동한다. 다만 `Location` 헤더에 새 리소스 경로를 실어야 한다 — 프론트가 지금 쓰지 않을 뿐 계약의 일부다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **409 `ACCOUNT_BIZ_NO_DUPLICATED`**(§7.3) · 422 `UNPROCESSABLE` · 429 · 500 · 504.

---

### BE-048-EP-03 · 거래처 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-048-EL-022~EL-038, EL-041 |
| 메서드·경로 | `GET /api/sales/accounts/:id` |
| 근거 (심) | `data-source.ts:110` |
| 권한 | `admin`, `operator`. 영업 도메인 읽기 권한 없음 → **404 은닉**(§7.4) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Account`(담당자 전체 포함). **`version` 을 함께 내려준다**(§7.1) — 프론트가 수정 시 되돌려 보내야 한다.

**에러**: 400(id 형식) · 401 · **404 `ACCOUNT_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.4) · 429 · 500 · 504.

> **어댑터 요구사항 충족**: `fetchOne` 은 이미 `HttpError(404, '항목을 찾을 수 없습니다.')` 를 던진다(`crud.ts:105-107`) — BE-026 이 이관했던 '404 를 `HttpError` 로 변환' 요구가 이 화면에서는 **이미 만족돼 있다**. 그래서 FS-048-EL-041 의 404/5xx 분기가 실제로 발현된다(EXC-12 성립). 백엔드 연결 시 이 동작을 **유지**해야 한다.

---

### BE-048-EP-04 · 거래처 수정 (인라인 상태 토글 포함)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-048-EL-009.10, EL-022~EL-038, EL-040, EL-042, EL-044, EL-045, EL-047, EL-048 |
| 메서드·경로 | `PUT /api/sales/accounts/:id` |
| 근거 (심) | `data-source.ts:110` |
| 권한 | `admin` 만 (§7.8). 영업 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **폼 저장은 멱등키로 멱등.** **인라인 토글(FS-048-EL-009.10)은 키 없이 온다** — `useCrudRowUpdate.run` 이 `{ id, input, signal }` 만 싣는다(`useCrudRowUpdate.ts:45`). 값이 멱등이라(같은 `active`) 최종 상태는 같지만 **감사 로그가 두 줄 남는다** |
| 레이트리밋 | 분당 60회 |

**바디**: `AccountInput` 전체 + **`version`**(§7.1) + `If-Match` 헤더(택1). **부분 갱신(PATCH)이 아니라 전체 치환**이다 — 상태 토글조차 `toAccountInput(item)` 으로 전체를 되돌려 보낸다(`AccountListPage.tsx:161-163`).

**서버 검증**
1. **불변 필드**: `id`. 그 밖의 모든 필드는 관리자가 바꿀 수 있다.
2. **낙관적 동시성**: `version` 불일치 → **409**(§7.1).
3. **담당자**: 요청의 `contacts[].id` 중 **서버가 아는 id 는 갱신, 모르는 id(`ct-new-…`)는 신규 채번, 요청에 없는 기존 id 는 삭제**로 해석한다(§7.2).
4. `primary` 가 정확히 1건인지 재판정(§7.2).
5. §3 의 규칙 전건 재판정.

**응답 200/204** — 프론트 `update(id, input, context): Promise<void>` — 응답 본문을 읽지 않고 목록·상세를 무효화한다(`crud.ts:312-315`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `ACCOUNT_NOT_FOUND`** · **409 `CONFLICT`**(version 불일치 — §7.1) · **409 `ACCOUNT_BIZ_NO_DUPLICATED`**(§7.3) · 422 `UNPROCESSABLE` · 429 · 500 · 504.

---

### BE-048-EP-05 · 거래처 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-048-EL-009.11, EL-013 |
| 메서드·경로 | `DELETE /api/sales/accounts/:id` |
| 근거 (심) | `data-source.ts:110` |
| 권한 | `admin` 만 (§7.8). 영업 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **멱등키 없이 온다**(`useCrudList.tsx:102` — `{ id, signal }` 만). DELETE 자체가 멱등이나 **이미 없는 id 는 409 를 준다**(`crud.ts:139-141`)라 엄밀히는 멱등이 아니다 — §7.5 가 이를 판정한다 |
| 레이트리밋 | 분당 60회 |

**서버 검증**: **참조 무결성** — 이 거래처를 참조하는 계약·견적이 있으면 **409 `ACCOUNT_IN_USE`** 로 거절해야 한다. 그러나 현재 참조가 **이름 문자열**이라 서버가 이를 알 수 없다 — §7.7 이 이를 판정한다.

**응답 204**.

**에러**: 400 · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `ACCOUNT_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제 — 현재 어댑터 동작) · **409 `ACCOUNT_IN_USE`**(§7.7) · 429 · 500 · 504.

---

### BE-048-EP-06 · 거래처 일괄 삭제 — **심 없음 (미정)**

FS-048-EL-014(일괄 삭제 다이얼로그)가 필요로 하는 쓰기다. **`data-source.ts` 에 이 조작의 어댑터도 `// TODO(backend)` 주석도 없다.** 프론트는 `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`)로 **N 건의 개별 DELETE 를 병렬로** 낸다.

- 엔드포인트: **미정.** 이 문서는 `POST /api/sales/accounts/bulk-delete` 류를 **만들지 않는다** — 심이 없다.
- 판정: §7.5.

---

### BE-048-EP-07 · 주소 검색(우편번호) — **심 없음 (미정)**

FS-048-EL-028(사업장 주소)이 자유 텍스트인 근본 원인이다. **어댑터도 주석도 없고 화면에 검색 진입점 자체가 없다.**

- 엔드포인트: **미정.** 국내 관례상 외부 서비스(도로명주소 API) 연동이지 이 도메인의 계약이 아닐 수 있다 — 아키텍처 이 도메인 경계를 정해야 한다.
- 판정: §7.11 #9.

## 5. 예외 매트릭스

> EP-06·EP-07 은 **심이 없어 계약이 존재하지 않으므로** 이 매트릭스에 행이 없다(§7.5 · §7.11 #9). 아래 5행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:38`)가 재인증으로. 화면은 FS-048-EL-012 배너 | **403** 컬렉션 — 거래처 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1). 열거할 개별 id 가 노출되지 않는다 | N/A — 0건이면 200 빈 배열 → FS-048-EL-011 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-048-EL-012 (**status 로 분기하지 않아 403·404·500 이 같은 문구** — FS-048 §7 #8) | 5초 → 504 → FS-048-EL-012 |
| EP-02 등록 | 400 `VALIDATION_FAILED` — `name`·`bizNo`(체크섬)·`ceoName`·`creditLimit`·`contacts`·`note` 위반. `error.fields` 로 내려보낸다 — 프론트가 422 만 필드에 꽂으므로(§6.1) **400 은 배너로 뭉개진다** | 401 → 전역 인터셉터. **미저장 입력은 유실된다**(FS-048 §7 #24) | **403 `FORBIDDEN`** — 컬렉션 쓰기라 은닉할 개별 리소스가 없다. `operator` 도 403(§7.8) | N/A — 생성이라 대상이 없다 | **409 `ACCOUNT_BIZ_NO_DUPLICATED`** — 같은 사업자등록번호의 거래처가 이미 있다(§7.3). **프론트가 이를 충돌 다이얼로그로 받아** '최신 내용 불러오기'를 권하는데 **등록 폼에는 불러올 최신본이 없다** — 오작동이다(§7.3 이관) | 422 `UNPROCESSABLE` — 형식은 맞으나 상태 위반(예: 폐업 사업자번호) | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-048-EL-021 배너 + 오류 코드(EXC-20 충족) | 5초 → 504 → FS-048-EL-021. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |
| EP-03 상세 | 400 — id 형식 위반 | 401 → 전역 인터셉터. 화면은 FS-048-EL-041 배너 | **읽기 권한 없음 → 404 은닉**(§7.4) — 거래처 1건은 사업자정보 + 담당자 개인정보다. 읽기 권한이 있는 `operator` 에게는 쓰기 거절 시 403 | **404 `ACCOUNT_NOT_FOUND`** — 어댑터가 **이미** `HttpError(404)` 를 던진다(`crud.ts:105-107`) → FS-048-EL-041 의 '찾을 수 없습니다' + '목록으로'(재시도 없음) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-048-EL-041 의 '불러오지 못했습니다' + '다시 시도' + '목록으로' | 5초 → 504 → 위와 같은 'error' 분기 |
| EP-04 수정·토글 | 400 `VALIDATION_FAILED` — EP-02 와 같은 규칙 + `version` 형식. **인라인 토글도 같은 검증을 받는다** — 전체 치환이라 낡은 스냅샷의 위반이 드러날 수 있다 | 401 → 전역 인터셉터. 폼은 입력 유실, 토글은 리다이렉트 | **`operator` → 403**(§7.8). **읽기 권한 없음 → 404 은닉** | **404 `ACCOUNT_NOT_FOUND`** — 존재한 적 없는 id. 현재 어댑터는 **없는 id 에 409** 를 준다(`crud.ts:126-128`) — 계약상 404 가 옳으나 **프론트 UX 는 409 쪽이 낫다**(충돌 다이얼로그가 입력을 보존한다). §7.1 이 이를 판정한다 | **409 `CONFLICT`** — `version` 불일치(§7.1) 또는 대상 부재. 프론트는 `FormConflictDialog` 로 **입력을 보존한 채** '최신 내용 불러오기'/'이어서 편집'을 준다(`FormFeedback.tsx:58-74`) — **폼 경로는 완비**. **인라인 토글 경로에는 이 다이얼로그가 없어** 일반 토스트로 뭉개진다(FS-048 §7 #20). **409 `ACCOUNT_BIZ_NO_DUPLICATED`** 도 같은 다이얼로그로 떨어져 문구가 어긋난다(§7.3) | 422 `UNPROCESSABLE` — 프론트가 `violations` 를 `setError` 로 필드에 꽂고 첫 위반으로 포커스한다(`useCrudForm.ts:182-192`) — **경로는 완비, 다만 백엔드가 없어 미발현**(FS-048-EL-047) | 429 분당 60 + `Retry-After`. **일괄 삭제(§7.5)가 N 건을 병렬로 내므로 여기에 먼저 걸린다** | 500 + `traceId` → 폼은 FS-048-EL-021 배너 + 입력 보존, 토글은 토스트 | 5초 → 504 → 위와 동일 |
| EP-05 삭제 | 400 — id 형식 위반 | 401 → 전역 인터셉터 | **`operator` → 403**(§7.8). **읽기 권한 없음 → 404 은닉** | **404 `ACCOUNT_NOT_FOUND`** — 현재 어댑터는 **409('이미 삭제된 항목입니다.' — `crud.ts:140`)** 를 준다. 삭제의 멱등성 관점에서는 **204 가 옳고**, 사용자 통지 관점에서는 409 가 낫다 — §7.5 가 판정한다 | **409 `ACCOUNT_IN_USE`** — 이 거래처를 참조하는 계약·견적이 있다(§7.7). **현재 참조가 이름 문자열이라 서버가 이를 판정할 수 없다.** 프론트는 이 409 를 다이얼로그 안 배너('삭제하지 못했습니다…')로 뭉갠다(`useCrudList.tsx:112`) | N/A — 삭제에 상태 전이 규칙이 없다. `active` 는 삭제와 무관한 별개 플래그다(§7.5) | 429 분당 60. **일괄 삭제가 N 건을 병렬로 낸다** — 100건 선택이 곧 100요청이다(§7.5) | 500 + `traceId` → 다이얼로그 안 danger 배너, 다이얼로그 유지, 재클릭이 재시도 | 5초 → 504 → 위와 동일 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `accountAdapter.fetchAll(signal)` | `GET /api/sales/accounts` | EP-01 | `readonly Account[]` | O |
| `accountAdapter.fetchOne(id, signal)` | `GET /api/sales/accounts/:id` | EP-03 | `Account` | **△ — `version` 필드를 계약에 추가해야 한다**(§7.1). 404 → `HttpError` 변환은 **이미 충족**(`crud.ts:105-107`) |
| `accountAdapter.create(input, context)` | `POST /api/sales/accounts` | EP-02 | `void` | **△ — `Idempotency-Key` 헤더 · `X-CSRF-Token` 헤더를 본문에서 실어야 한다**(§6.1). 시그니처는 이미 키를 받는다(`crud.ts:47`) |
| `accountAdapter.update(id, input, context)` | `PUT /api/sales/accounts/:id` | EP-04 | `void` | **△ — `If-Match`/`version` 미전송**(§7.1) · `Idempotency-Key`·`X-CSRF-Token` 헤더 필요 |
| `accountAdapter.remove(id, context)` | `DELETE /api/sales/accounts/:id` | EP-05 | `void` | **△ — `X-CSRF-Token` 필요.** 멱등키는 오지 않는다(`useCrudList.tsx:102`) — 프레임워크의 명시적 판정(`crud.ts:32-41`) |
| **일괄 삭제** (`useCrudList.tsx:133` → `crud.ts:349-350`) | **없음** | **EP-06 심 없음(미정)** | `settleAll` → 실패 건수 | **X — 전용 계약이 없다. N 건의 개별 DELETE 다**(§7.5) |
| **인라인 상태 토글** (`AccountListPage.tsx:161-169` → `useCrudRowUpdate.ts:45`) | **없음(EP-04 를 재사용)** | EP-04 | `void` | **△ — 전용 엔드포인트가 아니라 전체 치환 PUT 이다.** 멱등키가 없다 |
| **주소 검색** | **없음** | **EP-07 심 없음(미정)** | — | **X — 화면에 진입점이 없다**(§7.11 #9) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

`accountAdapter` 는 `createCrudAdapter` 가 만든다 — **본문을 바꾼다는 것은 곧 `shared/crud/crud.ts` 의 팩토리를 fetch 구현으로 바꾼다는 뜻이고, 그 순간 이 팩토리를 쓰는 모든 화면이 함께 연동된다.** 화면 코드는 0줄 바뀐다. 요구사항:

1. **CSRF**: 쓰기(`create`·`update`·`remove`)에 `X-CSRF-Token` 헤더.
2. **멱등키**: `context.idempotencyKey` 를 `Idempotency-Key: <uuid>` 헤더로. 값은 이미 어댑터까지 도달한다(`crud.ts:41,114,121`) — **헤더로 내보내기만 하면 된다**. 이 앱에 선례가 있다(`pages/members/data-source.ts:243-253`).
3. **404 → `HttpError(404)`**: **이미 충족**(`crud.ts:105-107`). fetch 구현에서도 유지할 것 — `useCrudForm.ts:147` 의 `isNotFound` 가 이것에 의존한다.
4. **409 → `HttpError(409)`**: **이미 충족**(`crud.ts:126-128,139-141`). 단, 현재는 '존재 여부' 기반이므로 서버 연결 시 **`version` 불일치도 409 로 매핑**해야 한다(§7.1).
5. **422 → `HttpError` + `violations`**: `useCrudForm.ts:182-192` 가 `cause.violations` 를 읽는다. 서버의 `error.fields` 를 그 형태로 변환해야 필드 인라인 오류가 발현된다. **현재 `dev.ts:84` 는 `violations` 없는 `HttpError` 를 던져 이 경로가 죽어 있다.**
6. **`version` 왕복**: `fetchOne` 응답의 `version` 을 `Account` 에 실어 폼이 `toValues`→`toInput` 으로 되돌려 보내게 하거나, 어댑터가 마지막으로 읽은 `ETag` 를 기억해 `If-Match` 로 낸다. **전자를 권한다** — 어댑터에 상태를 두면 두 탭이 서로의 토큰을 덮는다.

## 7. 핵심 판정

### 7.1 409 는 '존재 여부' 기반이다 — 동시 편집은 여전히 last-write-wins 【정합 판정】

**F3b 가 고친 것과 고치지 않은 것을 정확히 갈라야 한다.**

`createCrudAdapter.update` 는 없는 id 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던진다(`crud.ts:126-128`). 그래서 **유령 저장(ghost saved)은 해소됐다** — 다른 관리자가 방금 지운 거래처를 편집해도 '저장했습니다' 토스트가 뜨지 않고 `FormConflictDialog` 가 입력을 보존한 채 뜬다. quality-bar EXC-04 의 acceptanceCheck 두 절이 모두 성립한다.

**그러나 그것은 낙관적 동시성 제어가 아니다.**

| 시나리오 | 현재 동작 |
|---|---|
| A 가 편집 중 B 가 **삭제** → A 저장 | **409 → 충돌 다이얼로그** ✔ |
| A 가 편집 중 B 가 **수정** → A 저장 | **200 — A 가 B 를 조용히 덮는다** ✕ |

`Account` 에 `version`·`updatedAt`·`etag` 가 **없고**(`types.ts:29-55` 전수 확인), 어댑터가 `If-Match` 를 보내지 않는다. `crud.ts:126` 의 가드는 `items.some((item) => item.id === id)` — **대상이 있기만 하면 통과**한다. 두 관리자가 같은 거래처의 여신한도를 각각 5천만/2천만으로 바꾸면 **나중에 저장한 값이 이긴다. 앞선 변경은 흔적 없이 사라지고 아무도 그것을 모른다.**

**판정**: EP-04 는 **`version`(또는 `If-Match`/ETag)** 을 요구한다. 불일치 시 **409 `CONFLICT`**. 이것은 UX 개선이 아니라 데이터 정합 요구다 — 여신한도·신용등급은 **금액 결정에 쓰이는 값**이고(계약 BE-049·견적 BE-050 이 이 거래처를 참조한다) 조용한 덮어쓰기는 곧 잘못된 여신 판단이다.

**프론트 비용은 거의 0 이다**: `FormConflictDialog` 가 이미 배선돼 있고(`AccountFormPage.tsx:558`) `useCrudForm.handleWriteError` 가 `isConflict` 를 이미 분기한다(`useCrudForm.ts:166-178`). **서버가 409 를 주기만 하면 복구 경로가 열린다.** 필요한 것은 `Account.version` 필드 추가와 어댑터의 헤더 한 줄이다(§6.1 #6).

**단, 인라인 토글은 예외 처리가 필요하다**(§7.11 #6) — `useCrudRowUpdate` 에는 충돌 다이얼로그가 없어 409 가 '변경하지 못했습니다' 토스트로 뭉개진다.

### 7.2 담당자 배열 전체 치환 — 서버가 id 를 채번하고 대표담당을 강제한다 【보안·정합 판정】

**현재 프론트가 담당자 배열 전체를 조립해 PUT 한다.** `AccountInput = Omit<Account, 'id'>`(`types.ts:58`)라 `contacts` 가 통째로 실린다. 세 가지 문제가 겹친다.

**① 클라이언트가 id 를 정한다.** `AccountContactsField.tsx:86`:
```
id: `ct-new-${String(Date.now())}-${String(Math.round(Math.random() * 1000))}`
```
난수 공간이 **1,001**(0~1000 정수)이고 앞자리는 밀리초다. 같은 밀리초에 두 행을 추가하면 충돌 확률이 1/1001 이다 — '담당자 추가'를 빠르게 두 번 누르면 실제로 도달 가능한 구간이다. 충돌하면 `patch(id, …)`(`:135-137`)가 **두 행을 동시에 고친다**. 그리고 이 id 가 그대로 저장돼 **영구 키가 된다.**

**② 동시 편집이 담당자를 지운다.** A 가 폼을 열고(담당자 2명 스냅샷) 편집하는 동안 B 가 담당자 1명을 추가한다(3명). A 가 저장하면 **A 의 2명 스냅샷이 서버의 3명을 덮는다** — B 가 추가한 담당자가 사라진다. 전체 치환 PUT 이라 서버는 이것이 '삭제 의도'인지 '낡은 스냅샷'인지 구분할 수 없다.

**③ `primary` 가 정확히 1건임을 스키마가 강제하지 않는다.** `contactValuesSchema`(`validation.ts:14-22`)는 `primary: z.boolean()` 일 뿐이고, `.check()` 3단계(`:69-102`)도 이를 보지 않는다. '대표담당 1명'은 **UI 규칙일 뿐**이다(`AccountContactsField.tsx:139-141,146-148,156`). 조작된 클라이언트나 미래의 다른 진입점(가져오기·API)은 **대표담당 0명 또는 3명**을 만들 수 있고, 그러면 `primaryContact`(`types.ts:120-122`)가 `contacts[0]` 으로 말없이 떨어져 **목록과 견적서가 엉뚱한 담당자를 보인다**.

**판정**:
1. **`contacts[].id` 는 서버가 채번한다.** 요청의 `ct-new-…` 는 **무시**하고 신규로 본다(EP-04 서버 검증 #3). 서버가 아는 id 는 갱신, 요청에 없는 기존 id 는 삭제로 해석한다.
2. **`primary` 가 정확히 1건**임을 서버가 재판정한다 — 위반 시 **400 `VALIDATION_FAILED`**(`fields: [{ name: 'contacts', code: 'PRIMARY_CONTACT_REQUIRED' }]`).
3. **②(lost update)는 §7.1 의 `version` 이 해소한다** — 별도 계약이 필요 없다. `version` 이 어긋나면 A 의 저장이 409 로 막히고 충돌 다이얼로그가 최신본을 권한다. **이것이 `version` 을 P0 로 두는 두 번째 이유다.**

**대안(담당자 하위 컬렉션 분리 — `POST/PUT/DELETE /api/sales/accounts/:id/contacts/:cid`)은 채택하지 않는다.** 담당자는 상한 8명의 작은 배열이고 거래처와 함께 편집되는 것이 자연스럽다 — BE-026 §7.3 이 타임라인을 분리한 것과 다르다. 거기서는 **append-only 감사 기록**이라 유실이 곧 증거 소실이었지만, 여기서는 `version` 이 유실을 막으면 충분하다.

### 7.3 사업자등록번호 — 서버가 재검증하고 중복을 막는다 【보안·정합 판정】

**국세청 체크섬은 클라이언트에만 있다.** `isValidBizNo`(`business.ts:29-42`)는 순수 함수이고 `accountSchema.check`(`validation.ts:47-57`)가 이를 부른다. **서버는 이 규칙을 모른다.** 프론트 검증은 UX 이지 방어선이 아니다 — API 를 직접 때리면 `'000-00-00000'` 같은 아무 문자열이나 저장된다.

**판정 1 — 서버가 체크섬을 재판정한다.** 위반 시 400 `VALIDATION_FAILED`(`fields: [{ name: 'bizNo', code: 'INVALID_CHECKSUM' }]`). 규칙은 `business.ts:26-27` 의 주석이 정본이다: `sum = Σ dᵢ·wᵢ(i=0..8, w=[1,3,7,1,3,7,1,3,5]) + ⌊(d₈·5)/10⌋`, 검증숫자 `= (10 − sum%10) % 10 = d₉`.

**판정 2 — 사업자등록번호는 유일해야 한다.** 현재 **어떤 유일성 제약도 없다** — 같은 사업자번호의 거래처를 몇 개든 만들 수 있다. 그러면 검색(FS-048-EL-001.1 이 사업자번호로 찾는다)이 여러 건을 내고, 어느 것이 진짜 원장인지 알 수 없으며, 여신한도가 **거래처별로 쪼개져 실효 한도가 배가 된다**. EP-02·EP-04 는 중복 시 **409 `ACCOUNT_BIZ_NO_DUPLICATED`** 를 준다.

**판정 3 — 저장 표현은 하이픈 표기(`'000-00-00000'`)를 유지한다.** `types.ts:33` 이 그렇게 못박고 시드·`toInput`(`AccountFormPage.tsx:136` `formatBizNo(values.bizNo)`)이 일치한다. **정규화는 저장 시 서버가 한 번 더** 한다 — 클라이언트가 `'1248100998'` 을 보내도 서버가 `'124-81-00998'` 로 정규화해야 유일성 인덱스가 성립한다. (검색은 이미 양쪽 하이픈을 제거해 비교한다 — `types.ts:137,142`.)

> **프론트 후속(UI 기획) — 409 문구가 어긋난다**: `FormConflictDialog` 는 **모든** 409 를 '다른 사용자가 먼저 변경했습니다'로 그린다(`FormFeedback.tsx:63`). `ACCOUNT_BIZ_NO_DUPLICATED` 가 그 다이얼로그로 떨어지면 **'최신 내용 불러오기'** 를 권하는데, 등록 폼(`/new`)에는 불러올 최신본이 없다(`detailQuery` 가 `enabled: id !== ''` 로 꺼져 있다 — `crud.ts:266`). 사용자는 아무 일도 일어나지 않는 버튼을 누른다. **중복 사업자번호는 409 가 아니라 422 + `error.fields[bizNo]` 로 내려** `setError` 경로(`useCrudForm.ts:182-192`)를 타게 하는 것이 옳다 — §7.11 #3.

### 7.4 거래처 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/sales/accounts` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 거래처 리소스의 존재 자체가 보호 대상이다** → 영업 도메인 **읽기 권한이 없는** 주체에게는 **404 `ACCOUNT_NOT_FOUND`** 로 은닉한다.

**근거**: 거래처 1건은 ① **사업자정보**(상호·사업자등록번호·대표자·주소) ② **담당자 개인정보**(이름·부서·직급·휴대전화·이메일 — 최대 8명) ③ **거래 조건**(여신한도·신용등급·결제조건)을 담는다. ②는 명백한 개인정보다. ③은 **영업 기밀**이다 — 경쟁사가 우리 거래처의 신용등급과 여신한도를 알면 그것으로 협상한다. `Account` 는 회원 레코드보다 민감도가 낮지 않다 — BE-003 §3.2 가 `GET /api/members/:id` 를 404 로 은닉하는 것과 **같은 이유로** `GET /api/sales/accounts/:id` 도 404 여야 한다. 거래처 id 열거로 '이 회사가 우리 거래처인가'를 알아내는 경로를 닫는다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 거래처의 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없고, 정당한 운영자가 권한 문제를 인지하지 못하게 만든다.

**프론트 영향**: FS-048-EL-041 이 404 를 '거래처 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'로 그린다 — **은닉은 성립하지만 정당한 운영자도 원인을 모른다.** 이것은 은닉의 대가이며 의도된 것이다(BE-003 §3.2 선례).

**추가 위험 — 목록이 전문을 내려준다**: EP-01 이 `Account` 전량(담당자 포함)을 내려주므로 **영업 도메인 읽기 권한만 있으면 전 거래처의 전 담당자 개인정보를 한 번에 받는다**. §7.9 의 `AccountSummary` 분리가 이 노출을 줄인다 — **§7.4 의 취지와 §7.9 는 같은 뿌리다.**

### 7.5 일괄 삭제 · 삭제 멱등성 【정합 판정】

**① 일괄 삭제에 전용 계약이 없다.** FS-048-EL-014 는 다이얼로그로 'N건 삭제'를 확인받지만, 프론트는 `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`)로 **N 건의 개별 DELETE 를 병렬로** 낸다. 결과:

- **원자성이 없다.** 100건 중 40건 성공·60건 실패면 40건은 이미 지워졌고 되돌릴 수 없다. 프론트는 'N건 중 M건을 삭제하지 못했습니다'만 알리고 **어느 것이 실패했는지 말하지 않는다**(`useCrudList.tsx:139-141`).
- **레이트리밋에 자기가 걸린다.** EP-05 가 분당 60회인데 100건 선택은 100요청이다 — 뒤쪽이 429 로 실패하고, 사용자는 그것을 '서버 오류'로 읽는다.
- **감사 로그가 N 줄**이지 '일괄 삭제 1건'이 아니다.

**판정**: **이 문서는 `POST /api/sales/accounts/bulk-delete` 를 만들지 않는다** — 심이 없다(§4 EP-06). 발명하지 않는 것이 이 문서의 원칙이다. 대신 **판정을 남긴다**: 전용 계약이 필요하며, 그것은 `{ ids: string[] }` 를 받아 **전건 성공 또는 전건 실패**를 반환하고 실패 시 `error.fields` 에 실패 id 를 담아야 한다(quality-bar EXC-10 이 요구하는 'retry failed only'의 전제). 심을 심는 것이 선행 작업이다 — **UI 기획 이 `data-source.ts` 에 `// TODO(backend): POST /api/sales/accounts/bulk-delete` 를 넣고 어댑터에 `removeMany` 를 추가해야** 이 계약을 쓸 수 있다.

**② 삭제의 멱등성.** 현재 `remove` 는 없는 id 에 **409 '이미 삭제된 항목입니다.'**(`crud.ts:139-141`)를 던진다. HTTP 관례로는 DELETE 가 멱등이므로 **204 가 옳다.** 그러나 이 앱의 판정은 다르다 — 두 관리자가 같은 행을 지울 때 두 번째 사람에게 '지웠습니다' 토스트를 띄우면 **자기가 지운 줄 안다.** 실제로는 남이 지웠다.

**판정: 409 를 유지한다.** 다만 **일괄 삭제에서는 409 를 실패로 세지 않는다** — '이미 없음'은 일괄 삭제의 목표(그 id 들이 없는 상태)를 이미 달성한 것이므로 성공으로 본다. 현재 `settleAll` 은 이를 구분하지 못하고 실패 count 에 넣는다 — §7.11 #7.

**③ `active` 는 soft-delete 가 아니다.** `active: false` 는 '거래중지'이지 삭제가 아니다(`types.ts:50-51`). 두 개념이 화면에 나란히 있다(토글 · 휴지통) — 서버도 그렇게 다뤄야 한다. **거래 이력이 있는 거래처는 삭제 대신 `active: false` 를 권해야** 하는데(§7.7) 화면에 그 안내가 없다.

### 7.6 사람이 손으로 넣는 값 — 서버가 상한을 정한다 【정합 판정】

세 필드가 **파생되지 않고 사람이 입력한다**:

| 필드 | 현재 | 문제 |
|---|---|---|
| `lastTradeAt` (최근 거래일) | `<input type="date">` · 스키마 `z.string()` | **거래 이력에서 파생되지 않는다.** 검증이 없어 `'9999-99-99'` 도 통과한다(네이티브 위젯이 유일한 방어). 목록의 '최근거래' 열이 **사실이 아니라 주장**이다 |
| `creditGrade` (신용등급) | `z.enum(['A','B','C','D'])` | **산정 근거가 없다.** 사람이 고르고, 그 값이 여신 판단의 근거가 된다 |
| `creditLimit` (여신한도) | 폼 `/^\d+$/`, 저장 시 `Number()` | **상한이 없다.** 20자리 숫자도 통과하고 `Number.MAX_SAFE_INTEGER` 를 넘으면 값이 조용히 뭉개진다(FS-048 §7 #21) |

**판정 — 서버가 다음을 강제한다**:
1. `lastTradeAt` 은 **`'YYYY-MM-DD'` 실재 달력일 또는 `''`**. 위반 시 400. **미래 날짜도 거절한다** — '최근 거래일'이 내일일 수는 없다.
2. `creditLimit` 은 **0 이상 · 상한 있음**(정책값 — 예: 1,000억). 위반 시 400 `OUT_OF_RANGE`. 상한 없는 정수 필드는 계약이 아니다.
3. **제약 없는 자유 텍스트에 상한을 준다** — `bizType`·`bizItem`·`address`·`phone`·`contacts[].{department,position,phone,email}` 이 전부 `z.string()` 이고 `maxLength` 도 없다(§3). 서버가 상한을 정하지 않으면 **1MB 짜리 주소**를 받는다.

**`lastTradeAt`·`creditGrade` 의 파생화는 이 계약의 범위 밖이다**(§1) — 거래 이력 도메인이 생기면 `lastTradeAt` 은 읽기 전용 파생 필드가 되고 이 화면의 입력이 사라진다. **아키텍처 이 도메인 경계를 정해야 한다**(§7.11 #8).

### 7.7 거래처 참조가 이름 문자열이다 — 삭제가 계약·견적을 고아로 만든다 【정합 판정】

**코드로 확인한 사실**:
- `Contract.accountName: string` — `contracts/types.ts:16-17` 의 주석이 자백한다: `/** 거래처명 — FE 전용이라 이름 문자열로 보관(연동 시 거래처 FK) */`
- `Quote.accountName` · `Quote.accountBizNo` · `Quote.accountCeo` — `quotes/types.ts:29-32`. **거래처 정보의 스냅샷 복사본**이지 참조가 아니다.
- 계약 폼(`ContractFormPage.tsx:293-305`)·견적 폼(`QuoteFormPage.tsx:328-344`)의 거래처 입력이 **자유 텍스트**다 — 거래처 목록에서 고르는 선택기가 없다.

**결과 세 가지**:
1. **삭제가 고아를 만든다.** 거래처를 지워도 계약·견적은 그 이름을 그대로 들고 남는다. 서버는 `ACCOUNT_IN_USE`(EP-05 의 409)를 **판정할 수 없다** — 이름으로 join 할 수는 있으나 그것은 참조가 아니라 우연의 일치다.
2. **상호를 바꾸면 과거 문서와 어긋난다.** 거래처의 `name` 을 '(주)한빛소프트웨어'→'한빛(주)'로 바꿔도 기존 계약·견적은 옛 이름이다. **문서로서는 그것이 옳다**(계약서에 찍힌 이름은 계약 시점의 이름이다) — 그러나 **원장으로서는 틀렸다**(어느 거래처의 계약인지 알 수 없다).
3. **오타가 곧 새 거래처다.** '(주)한빛소프트웨어'와 '㈜한빛소프트웨어'가 다른 문자열이라 집계가 갈린다.

**판정**: 계약·견적은 **`accountId` FK 를 들고, 표시명은 문서 발행 시점의 스냅샷으로 별도 보관**해야 한다(②를 살리면서 ①③을 푼다). 이것은 **BE-049·BE-050 과 함께 결정할 계약 변경**이며 이 문서 혼자 정할 수 없다 — 세 문서가 같은 판정을 공유한다(BE-049 §7.5 · BE-050 §7.6).

**그때까지 EP-05 의 `ACCOUNT_IN_USE` 는 판정 불가**다. 서버가 이름으로 추정 검사를 하는 것은 **하지 않는다** — 우연의 일치로 정당한 삭제를 막는 것이 고아를 만드는 것보다 나쁘다.

### 7.8 `operator` 는 조회 전용이다 — BE-026 과 다른 판정

BE-026(1:1 문의)은 `operator` 에게 쓰기를 열었다. **이 도메인은 반대다.**

**근거**: 거래처 원장의 쓰기는 **여신한도·신용등급·결제조건**을 바꾸는 일이다. 그것은 응대가 아니라 **재무 결정**이다. `operator` 가 여신한도를 5천만원으로 올릴 수 있다면 역할 구분이 무의미하다. 1:1 문의 응대는 '한 고객에게 보내는 답변'이지만 거래처 수정은 '회사가 이 거래처에 얼마까지 외상을 줄 것인가'다 — BE-010(FAQ)이 '전체 고객에게 공표되는 콘텐츠'라 신중했던 것보다 **더** 신중해야 한다.

**거래 상태 토글(`active`)도 같다.** 목록에서 스위치 한 번으로 거래처를 중지시키는 것은 가벼운 조작처럼 보이지만, 그 거래처와의 신규 계약·견적을 막는 결정이다.

**결론**: EP-01·EP-03(조회)은 `admin` + `operator`. **EP-02·EP-04·EP-05(쓰기)는 `admin` 만.** 영업 도메인 권한이 아예 없는 역할은 컬렉션 403 / 개별 404(§7.4).

> **이 판정이 §7.4 의 프론트 공백과 만나는 지점**: 프론트에 쓰기 게이팅이 없어(FS-048 §7 #3) **`operator` 는 '거래처 등록'·수정·삭제·토글 버튼을 전부 본다.** 누르면 서버가 403 을 주고, 그 403 은 '저장하지 못했습니다'(폼)·'변경하지 못했습니다'(토글)로 뭉개진다 — **운영자는 자기가 권한이 없다는 사실을 영영 모르고 서버 장애로 오해한다.** 서버 계약은 옳지만 그 옳음이 화면에 닿지 않는다. §7.11 #1·#5.

### 7.9 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:
1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 필터·검색·정렬을 전부 클라이언트에서 한다. 거래처는 **상한 없이 늘어나는 원장**이다.
2. **목록이 상세 전문을 담는다.** `Account` 타입 하나를 목록·상세가 공유해 목록 응답에 `contacts`(최대 8명 × 6필드 개인정보) · `note` · `address` · `terms` 성격의 전문이 실린다. 목록 화면이 쓰는 것은 `name`·`ceoName`·`tradeType`·`creditGrade`·`primaryContact().name`·`lastTradeAt`·`active` 뿐이다 — **나머지는 쓰이지 않으면서 개인정보 노출면만 넓힌다**(§7.4).

**판정**: BE-010 이 `FaqSummary`/`Faq` 를 나눈 것과 같이 **`AccountSummary` / `Account` 를 분리**하고, EP-01 에 `tradeType`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `AccountSummary` 는 `contacts` 를 **대표담당 1명(`primaryContactName`)으로 축약**하고 `note`·`address`·`bizType`·`bizItem` 을 뺀다.

**이관**: 이 변경은 **프론트 대공사**다 — `filterAccounts`/`searchAccounts`/`sortAccounts` 가 서버로 올라가고, 페이지네이션 UI(FS-048 §7 #2)·`SeqCell` 오프셋·`useListState.clampPage` 소비가 함께 붙어야 한다. quality-bar IA-04 P0 가 이미 이 화면을 gap 으로 잡고 있으므로 **한 배치로 묶는 것이 옳다.** IA-13(URL state)은 **이미 충족**돼 있어(`useListState` 소비) 그 부담은 없다 — 페이징만 얹으면 된다. 그전까지 현 계약(전량)을 유지한다 — 픽스처 3건에서는 드러나지 않는다.

### 7.10 사업자정보·담당자 XSS — 서버가 저장 시 정제한다 【보안 판정】

`name`·`address`·`note`·`contacts[].name` 등은 **관리자가 자유 입력**하고 여러 표면에 렌더된다. 관리자 화면은 전부 텍스트 노드라(React 기본 이스케이프) 현재는 안전하다. **그러나 이 값들은 여기서 끝나지 않는다**:

- **견적서**(FS-050)가 `accountName`·`accountCeo`·`accountBizNo` 를 **문서로** 렌더한다(`QuotePreview.tsx:215-222`).
- quality-bar ERP-10(`specs/quality-bar.md:468`, **P2**)이 **견적서 PDF(react-pdf)** 를 로드맵에 올려 두었다. PDF 렌더러·메일 템플릿·거래명세서는 **React 의 이스케이프를 상속하지 않는다.**
  - ⚠ **오해 방지 — 인용은 로드맵이지 예정된 도입이 아니다.** 기준일 `a5c2639` 확인: **react-pdf 는 저장소에 없다**(`package.json` 19개 전수 0건 · import 0건 · `pnpm-lock.yaml` 0건). **print/document 토큰도 존재하지 않는다**(`grep -i print tokens/` = **0건**, `tokens/` 에는 `tokens.json` 뿐). quality-bar 자신이 ERP-10 을 '문서/print 토큰, 견적서가 소비, **px=0**' 으로 기록하고(`:694`) NFR-050 §4 가 print/document 토큰 소비 0 · `window.print` 0 · PDF 라이브러리 0 을 판정한다.
  - **도입 시점·선후 관계는 어느 파일에도 없다 — 미정.** ERP-10 이 언제 착수되는지, 토큰이 라이브러리에 선행하는지를 기술한 ADR·이슈·문서를 **찾지 못했다.** 이 절의 요구(**서버 저장 시 정제**)는 **그 일정과 무관하게 유효하다** — 저장된 값이 언제 어느 렌더러로 나갈지 서버가 알 수 없기 때문이며, 그것이 저장 시점 정제를 요구하는 이유다.

**판정**: BE-010 §7.2 · BE-026 §7.1 과 동일 — 서버가 **저장 시** 허용 태그 화이트리스트 밖의 마크업 · `javascript:`/`data:` 스킴 · 이벤트 핸들러 속성을 제거한다. 계약은 '저장된 거래처 정보에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다. 정제는 **저장 시 1회**이며 렌더 시점 이스케이프에 의존하지 않는다 — 소비 표면이 여러 개(관리자 화면·견적서·PDF·메일)라 각각의 이스케이프를 신뢰할 수 없기 때문이다.

### 7.11 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **`Account.version` 추가 + EP-04 의 `If-Match`/`version` 검증(§7.1)** — 현재 409 는 '존재 여부' 기반이라 **동시 편집이 last-write-wins 로 조용히 덮인다**. 프론트는 `FormConflictDialog` 가 이미 배선돼 있어 **서버가 409 를 주기만 하면 복구 경로가 열린다** | **백엔드 명세 · UI 기획 (최우선)** |
| 2 | `contacts[].id` 를 서버가 채번(§7.2) — 프론트 `ct-new-<Date.now()>-<0~1000 난수>` 제거. 난수 공간 1,001 이라 같은 ms 의 두 추가가 충돌한다 | 백엔드 명세 · UI 기획 |
| 3 | **중복 사업자번호를 409 가 아니라 422 + `error.fields[bizNo]` 로**(§7.3) — 409 는 `FormConflictDialog` 로 떨어져 등록 폼에서 **불러올 최신본이 없는 '최신 내용 불러오기'** 를 권한다 | 백엔드 명세 · UI 기획 |
| 4 | 사업자등록번호 서버 재검증(체크섬) + 유일성 인덱스 + 저장 시 하이픈 정규화(§7.3) | 백엔드 명세 |
| 5 | **쓰기 게이팅 부재(§7.8)** — `operator` 가 `admin` 전용 버튼을 전부 보고 누르며, 403 이 '저장하지 못했습니다'로 뭉개진다. `useRouteWritePermissions` 소비처 9곳에 `pages/sales/**` 가 없다(quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 6 | **인라인 토글의 409 가 일반 토스트로 뭉개진다**(§7.1) — `useCrudRowUpdate` 에 충돌 다이얼로그가 없다. 폼 경로는 완비 | UI 기획 |
| 7 | **일괄 삭제 전용 계약 부재(§7.5)** — 심을 먼저 심어야 한다(`// TODO(backend): POST /api/sales/accounts/bulk-delete` + 어댑터 `removeMany`). 현재 N 건 병렬 DELETE 라 원자성·레이트리밋·실패 식별이 전부 깨진다. `settleAll` 이 '이미 없음' 409 를 실패로 센다 | 백엔드 명세 · UI 기획 |
| 8 | `lastTradeAt`·`creditGrade` 의 **파생화 여부**(§7.6) — 거래 이력 도메인이 생기면 읽기 전용이 된다. 그전까지 서버가 달력일 실재·미래 날짜·`creditLimit` 상한·자유 텍스트 상한을 강제해야 한다 | 아키텍처 (도메인 경계) · 백엔드 명세 |
| 9 | **주소 검색(우편번호) 심 없음**(EP-07) — 화면에 진입점 자체가 없다. 외부 서비스 연동인지 이 도메인의 계약인지 아키텍처 이 정해야 한다(quality-bar ERP-14 P1) | 아키텍처 · UI 기획 |
| 10 | **거래처 참조가 이름 문자열이다(§7.7)** — 계약(BE-049)·견적(BE-050)이 `accountId` FK + 발행 시점 스냅샷으로 바뀌어야 한다. 그전까지 EP-05 의 `ACCOUNT_IN_USE` 는 판정 불가다. **세 문서 공동 판정** | **백엔드 명세 (BE-049 §7.5 · BE-050 §7.6 과 함께)** |
| 11 | 사업자정보·담당자 저장 시 XSS 정제(§7.10) — 견적서 PDF(ERP-10)가 React 이스케이프를 상속하지 않는다 | 백엔드 명세 |
| 12 | 목록 페이징 + `AccountSummary` 분리(§7.9) — IA-04 P0 와 한 배치로. IA-13 은 이미 충족 | 백엔드 명세 · UI 기획 |
| 13 | 400 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다 — `useCrudForm` 은 **422 만** `setError` 로 꽂는다(`useCrudForm.ts:182`). 서버가 400 으로 필드를 거절하면 배너로 뭉개진다. **서버가 필드 거절을 422 로 통일하거나 프론트가 400 도 매핑해야** 한다 | UI 기획 · 백엔드 명세 |
| 14 | 401 감지·리다이렉트는 구현됐으나(`queryClient.ts:38,42-43` + `RequireAuth`) **미저장 입력이 유실**된다(quality-bar EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) · 오프라인 감지 없음(EXC-11 P1) | UI 기획 · 프론트 구현 |
| 15 | 목록 엑셀 내보내기 부재(quality-bar ERP-12 P1) — 거래처 원장은 세무·오프라인 검토의 대표 대상이다. **현재 필터 조건 전체**를 내보내는 계약이 필요하다 | UI 기획 · 백엔드 명세 |

## 8. 자기 점검

- [x] FS-048 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 5건(EP-01~05) 매핑 완료, **심 없는 2건(EP-06 일괄삭제 · EP-07 주소검색)을 '심 없음(미정)' 으로 명시**하고 §7.5 · §7.11 #9 판정을 남겼다. **엔드포인트를 발명하지 않았다** — `data-source.ts:110` 의 심 한 줄이 EP-01~05 전부의 근거다
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열 — 심 없는 EP-06·07 은 계약이 없어 행이 없음을 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한만 고유 차이**(`operator` 조회 전용 — §7.8)를 근거와 함께 기술
- [x] **`createCrudAdapter` 소비를 코드로 확인**하고(`data-source.ts:111`) §1.1 근거표에 남겼다. **409 가 '존재 여부' 기반이지 version/ETag 토큰이 아님을 §7.1 이 표로 갈랐다** — 유령 저장은 해소, 동시 편집은 여전히 last-write-wins
- [x] 멱등성 판정 — GET 멱등 / POST·PUT 은 **멱등키로 멱등**(키가 실제로 어댑터까지 도달함을 `crud.ts:41,114,121` 로 확인) / **DELETE·인라인 토글은 키 없이 옴**(`useCrudList.tsx:102` · `useCrudRowUpdate.ts:45`)을 명시
- [x] **보안 판정 4건 이상** — 담당자 id 위조·대표담당 미강제(§7.2) · **사업자번호 서버 미검증 + 중복 허용**(§7.3) · **403 vs 404 은닉**(§7.4) · **XSS 저장 시 정제**(§7.10). 정합 판정 — §7.1 동시성 · §7.5 일괄삭제 · §7.6 입력 상한 · §7.7 참조 무결성
- [x] `AccountContact`·`bizNo`·`phone` 을 **개인정보/사업자정보**로 판정하고 은닉(§7.4)·노출면 축소(§7.9)·정제(§7.10)를 각각 다뤘다
- [x] 클라이언트 파생값(대표담당·표기·톤)을 **서버 계약 아님(✕)** 으로 §3 에 분리했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
</content>
