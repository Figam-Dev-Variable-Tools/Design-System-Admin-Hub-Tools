---
id: BE-020
title: "파트너사 관리 백엔드 기능 명세"
functionalSpec: FS-020
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-020. 파트너사 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-020 파트너사 관리 (`/company/partners`) — 목록 · 등록/수정 모달 · 삭제 다이얼로그 |
| 범위 | 파트너사 목록 조회, 등록, 수정, 삭제(단건·일괄), 노출 여부 토글, 정렬 순서 재정렬 |
| 범위 밖 | **로고 이미지 업로드** — 프론트에 업로드 심이 없다(§4 EP-06 '심 없음' + §7.1 판정). **고객 화면 렌더** — §7.2 XSS 판정만. **일괄 전용 엔드포인트** — §7.3 판정. **검색·페이징** — 프론트가 전량을 받아 클라이언트에서 필터한다(§7.4) |
| 프론트 어댑터 | `apps/admin/src/pages/company/partners/data-source.ts`(시드 주입) → `apps/admin/src/pages/company/logo-list/adapter.ts`(`createLogoAdapter`) |
| 도메인 타입 | `apps/admin/src/pages/company/logo-list/types.ts` |
| 검증 정본 | `apps/admin/src/pages/company/logo-list/validation.ts`(`logoSchema`) |
| 자매 계약 | **BE-021(고객사)** — 같은 어댑터 팩토리를 `scope='clients'` 로 쓴다. 데이터 계약·예외 규칙은 동일하고 **경로만 다르다**(`/api/company/clients`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 파트너사 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드(`VALIDATION_FAILED`·`UNAUTHENTICATED`·`FORBIDDEN`·`CSRF_TOKEN_INVALID`·`NOT_FOUND`·`CONFLICT`·`UNPROCESSABLE`·`RATE_LIMITED`·`INTERNAL_ERROR`·`REQUEST_TIMEOUT`) 동일. 모든 4xx/5xx 는 `error.code`·`error.message`·`error.traceId` 를 싣는다.
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록)만, 쓰기(등록·수정·삭제·노출 토글·재정렬) → 403. 기업 관리 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2).
- **CSRF**: 쓰기(POST·PUT·PATCH·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-020 §4.1) — 권한 강제는 전적으로 서버 책임이다. **프론트는 쓰기 컨트롤을 권한으로 게이팅하지 않으므로**(FS-020 §7 #3) `operator` 는 '파트너사 추가'·수정·삭제·토글을 눌러 403 을 받는다. 그 403 은 각 요소의 일반 실패 문구로 표시된다.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `LogoItem`(목록 행 = 도메인 엔티티) | `id`(string) · `name`(string) · `logoUrl`(string) · `linkUrl`(string) · `order`(number) · `active`(boolean) | 목록이 곧 전문이다 — 별도 상세 타입이 없다(상세 라우트 없음). **`updatedAt`/`version` 필드가 없다** — §7.5 |
| `LogoInput`(등록·수정 입력) | `name` · `logoUrl` · `linkUrl` | `order`·`active` 는 입력에 없다 — 서버가 정한다(등록 시 끝·기본 노출), 변경은 EP-04/EP-05 전용 |
| 응답 형태 | `readonly LogoItem[]` | 목록 조회는 배열 그대로. 총 건수·페이지 메타 없음(§7.4) |

**검증 정본**(`logoSchema`, 프론트 제출 전 검사 — 서버가 동일 규칙을 재강제한다):

| 필드 | 규칙 | 위반 문구(프론트) |
|---|---|---|
| `name` | 앞뒤 공백 제거 후 1–60자(`requiredText('이름', 60)`) | '이름을 입력하세요.' / '이름은 60자를 넘을 수 없습니다.' — **리터럴 폴백이 아니다**: `requiredText` 가 `objectParticle`/`topicParticle` 로 조사를 파생한다(`shared/crud/validation.ts:17,21,24` → `shared/format.ts:269+`) |
| `logoUrl` | **비어 있지 않기만** 확인(`requiredImage('로고')`) — **형식·스킴을 강제하지 않는다(누락이 아니라 판정 — §7.1)** | '로고를 등록하세요.'(조사 받침 파생) |
| `linkUrl` | 비면 통과, 채우면 `^https?://\S+$`(`optionalHttpUrl('링크 URL')`) | '링크 URL 은 http:// 또는 https:// 로 시작해야 합니다.' |

## 4. 엔드포인트 명세

> **근거**: `apps/admin/src/pages/company/partners/data-source.ts:44` 의 단일 주석
> `// TODO(backend): GET/POST /api/company/partners · PUT/DELETE /api/company/partners/:id · PUT /api/company/partners/reorder · PATCH /api/company/partners/:id/active`
> 아래 EP-01~EP-05 는 **이 주석에 있는 것만**이다. EP-06(이미지 업로드)은 심에 없어 '심 없음(미정)' 으로 남긴다.

### BE-020-EP-01 · 파트너사 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-020-EL-001, EL-003, EL-005, EL-006, EL-007, EL-008 |
| 메서드·경로 | `GET /api/company/partners` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 전량 반환**(프론트가 페이지네이션을 갖지 않는다). 상한·페이징 도입은 §7.4 미정 |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 이름 검색(FS-020-EL-001)은 프론트가 받아온 배열에 대해 클라이언트에서 수행하므로(`filterLogos`) `keyword` 파라미터가 계약에 없다(§7.4).

**응답 200** — `readonly LogoItem[]`. **`order` 오름차순 정렬은 서버 책임**이다(어댑터가 `sortByOrder` 로 보장하던 것 — `adapter.ts:23`). `linkUrl` 이 없으면 `null` 이 아니라 **빈 문자열**로 내려야 한다(프론트가 `item.linkUrl.trim() !== ''` 로 판정 — `LogoListTable.tsx:185`).

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-020-EP-02 · 파트너사 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-020-EL-002, EL-009, EL-009.6(등록) |
| 메서드·경로 | `POST /api/company/partners` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **비멱등. 멱등키 없음** — 프론트에 동기 제출 락도 없어 중복 등록이 실제로 가능하다(§7.6) |
| 레이트리밋 | 분당 30회 |

**바디**(`LogoInput`): `name`(1–60자) · `logoUrl`(비어 있지 않은 문자열 — **서버가 스킴을 검증해야 한다, §7.1**) · `linkUrl`(빈 문자열 또는 `http(s)://…`).

**서버가 정하는 값**: `order` = 현재 최대 order + 1(목록 끝에 붙인다 — `nextLogoOrder`), `active` = `true`(신규는 기본 노출 — `adapter.ts:56-58` · `logo-list.test.ts:108-115`). **입력으로 받지 않는다.**

**응답 201** — 생성 `LogoItem`. 프론트 `create(...): Promise<void>` 라 본문을 읽지 않고 목록을 무효화한다(계약상 본문을 내려도 무방).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `name`·`logoUrl`·`linkUrl`) · 401 · 403 · 403 CSRF · 422 `INVALID_IMAGE_URL`(허용 스킴 밖 `logoUrl` — §7.1) · 429 · 500 · 504.

---

### BE-020-EP-03 · 파트너사 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-020-EL-005.9(수정), EL-009, EL-009.6(수정) |
| 메서드·경로 | `PUT /api/company/partners/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 멱등(PUT — 같은 바디 재요청은 같은 결과) |
| 레이트리밋 | 분당 30회 |

**바디**: `LogoInput`(EP-02 동일). **`order`·`active` 는 바디에 없으며 이 요청으로 바뀌지 않는다** — 어댑터가 `{ ...item, ...input }` 로 세 필드만 덮는다(`adapter.ts:48`). 서버도 부분 갱신(name·logoUrl·linkUrl)만 수행한다.

**응답 200/204**.

**동시성 (§7.5)**: `If-Match`/`updatedAt` 을 **보내지 않는다** — 마지막 쓰기가 이긴다.

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 CSRF · **404 `PARTNER_NOT_FOUND`**(§7.5 — 현재 프론트 픽스처는 같은 상황에 **409** 를 던지고, 화면은 그것을 generic 배너로 뭉갠다) · 422 `INVALID_IMAGE_URL` · 429 · 500 · 504.

---

### BE-020-EP-04 · 파트너사 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-020-EL-005.9(삭제), EL-004.2, EL-010, EL-011 |
| 메서드·경로 | `DELETE /api/company/partners/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **멱등**. 이미 삭제된 id 재요청 → 204 |
| 레이트리밋 | 분당 60회(일괄이 항목당 개별 요청) |

**응답 204**. 일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE 한다(§7.3). 삭제 후 남은 항목의 `order` 를 1..n 으로 다시 매길지는 서버 재량이다 — 프론트는 순번(FS-020-EL-005.4)을 배열 인덱스로 그리므로 빈 번호가 생겨도 화면은 깨지지 않는다.

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `PARTNER_NOT_FOUND`(존재한 적 없는 id 만 — 이미 삭제는 204) · 429 · 500 · 504.

---

### BE-020-EP-05 · 노출 여부 토글
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-020-EL-005.7 |
| 메서드·경로 | `PATCH /api/company/partners/:id/active` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **멱등**. 바디의 `active` 목표 상태를 그대로 세팅하므로 같은 값 재요청은 무변화 — 프론트의 낙관적 토글·재시도(FS-020-EL-005.7)와 일치 |
| 레이트리밋 | 분당 120회 |

**바디**: `{ active: boolean }`. **응답 200/204**. 프론트 `setActive(id, active, signal)`. 낙관적 업데이트는 프론트가 하고 실패 시 스냅샷 롤백한다(`queries.ts:96-117`).

**에러**: 400(`active` 형식·id) · 401 · 403 · 403 CSRF · 404 `PARTNER_NOT_FOUND` · 429 · 500 · 504.

---

### BE-020-EP-06 · 정렬 순서 재정렬
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-020-EL-005.3, EL-005.8, EL-005.10 |
| 메서드·경로 | `PUT /api/company/partners/reorder` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **멱등**. 같은 `orderedIds` 재요청은 같은 최종 순서 |
| 레이트리밋 | 분당 60회 |

**바디**: `{ orderedIds: string[] }` — 새 순서. 프론트는 **검색어가 없을 때만** 재정렬을 켜므로(FS-020-EL-005.11) `orderedIds` 는 언제나 **전체 목록의 순열**이다. **서버는 이 순서대로 `order` 를 1..n 으로 다시 매긴다**(`reorderLogosByIds` 규칙 — `types.ts:42-54`). **응답 200/204**.

**동시성 판정 (§7.5)**: 두 관리자가 동시에 재정렬하면 **마지막 요청이 이긴다**(낙관적 잠금 미도입). 프론트는 직전 재정렬 요청을 abort 하고 새 요청을 보내므로 자기 자신과는 경합하지 않는다.

**에러**: 400 `VALIDATION_FAILED`(`orderedIds` 에 존재하지 않는 id · 중복 · 전체 구성 불일치) · 401 · 403 · 403 CSRF · 429 · 500 · 504.

---

### BE-020-EP-07 · 로고 이미지 업로드 — **심 없음 (미정)**

`// TODO(backend)` 주석에 **없다.** 프론트에 업로드 어댑터도, 업로드를 부르는 코드도 없다.

현재 동작: `ImageUploadField`(`packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:178-181`)가 선택한 파일을 `URL.createObjectURL(file)` 로 감싼 **`blob:` URL** 을 `onChange` 로 넘기고, 그 문자열이 `logoUrl` 로 그대로 EP-02/EP-03 바디에 실린다. 검증(`requiredImage`)이 비어 있지 않은지만 보므로 통과한다 — **그 관대함은 프론트의 의도된 빚이다**(§7.1).

따라서 **업로드 엔드포인트·응답 URL 규약·용량/타입 서버 재검증·저장소 수명주기가 전부 미정**이다. §7.1 이 이 공백의 판정과 서버측 방어선을 정한다.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — 쿼리 파라미터가 없다(§7.4) | 401 → 전역 인터셉터가 재인증. 화면은 FS-020-EL-008 | **403** 컬렉션(존재는 비밀이 아니다) | N/A — 0건이면 200 빈 배열 → FS-020-EL-007 | N/A 읽기 전용 | N/A — 상태 없음 | 429 분당 120 | 500 + `traceId` → FS-020-EL-008 | 5초 → 504 → FS-020-EL-008 |
| EP-02 등록 | `name`·`logoUrl`·`linkUrl` → `error.fields`. 프론트는 필드 매핑 없이 FS-020-EL-009.1 배너(§7.7 #2) | 401 → FS-020-EL-009.1 | **403** 컬렉션 쓰기 | N/A — 생성 | N/A — 중복 이름을 막지 않는다(§7.8) | **422 `INVALID_IMAGE_URL`** 허용 스킴 밖 `logoUrl`(§7.1) | 429 분당 30 | 500 + `traceId` → FS-020-EL-009.1 | 5초 → 504 |
| EP-03 수정 | 위 + id 형식 | 401 → FS-020-EL-009.1 | `operator` → **403** / 기업 관리 읽기 없음 → **404** | **404 `PARTNER_NOT_FOUND`** — 동시 삭제된 항목. **프론트 픽스처는 F3b 이후 같은 상황에 409 를 던져 유령 저장을 막지만, 화면이 그 응답을 generic 배너로 뭉갠다(§7.5)** | N/A — 낙관적 잠금 미도입. **어댑터의 409 는 '존재 여부' 기반이라 둘 다 존재하는 동시 편집은 마지막 쓰기 승리**(§7.5) | 422 `INVALID_IMAGE_URL` | 429 분당 30 | 500 + `traceId` | 5초 → 504 |
| EP-04 삭제 | id 형식 | 401 → 다이얼로그 배너(FS-020-EL-010.1) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id 만. **이미 삭제 204(멱등)** | N/A — DELETE 멱등 | N/A — 참조 무결성 제약 없음(§7.9) | 429 분당 60 | 500 → 단건 배너 / 일괄 부분 실패 건수(FS-020-EL-011.1) | 5초 → 504 |
| EP-05 노출 토글 | `active` 형식·id | 401. 프론트는 롤백 + 재시도 토스트 | `operator` → **403** / 읽기 없음 → **404** | 404 `PARTNER_NOT_FOUND` → 롤백 + 재시도 토스트 | N/A — 멱등(목표 상태 세팅) | N/A | 429 분당 120 | 500 → 롤백 + 재시도 토스트(FS-020-EL-005.7) | 5초 → 504 |
| EP-06 재정렬 | `orderedIds` 미존재 id · 중복 · 전체 구성 불일치 → 400 | 401. 프론트는 롤백 + 재시도 토스트 | `operator` → **403** | N/A — 대상은 목록 전체 | **동시 재정렬은 마지막 쓰기 승리**(§7.5) — 409 로 올리지 않는다 | N/A | 429 분당 60 | 500 → 롤백 + 재시도 토스트(FS-020-EL-005.10) | 5초 → 504 |
| EP-07 이미지 업로드 | N/A — **심 없음(미정, §7.1)** | N/A — 심 없음 | N/A — 심 없음 | N/A — 심 없음 | N/A — 심 없음 | N/A — 심 없음 | N/A — 심 없음 | N/A — 심 없음 | N/A — 심 없음 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `partnersAdapter.fetchAll(signal)` | `GET /api/company/partners` | EP-01 | `readonly LogoItem[]` | O |
| `partnersAdapter.create(input, signal?)` | `POST /api/company/partners` | EP-02 | `void`(201) | O |
| `partnersAdapter.update(id, input, signal?)` | `PUT /api/company/partners/:id` | EP-03 | `void` | O |
| `partnersAdapter.remove(id, signal?)` | `DELETE /api/company/partners/:id` | EP-04 | `void`(204) | O |
| `partnersAdapter.setActive(id, active, signal?)` | `PATCH /api/company/partners/:id/active` | EP-05 | `void` | O |
| `partnersAdapter.reorder(orderedIds, signal?)` | `PUT /api/company/partners/reorder { orderedIds }` | EP-06 | `void` | O |
| **없음** — `ImageUploadField` 가 `blob:` URL 을 만든다 | **없음** | EP-07 **심 없음(미정)** | — | **X — §7.1** |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` 헤더 · `fetchAll` 은 `order` 오름차순을 서버가 보장하므로 클라이언트 재정렬(`sortByOrder`)을 지워도 된다 · `update`/`remove`/`setActive` 는 **404 를 던져야 한다**(현재 픽스처는 같은 자리에서 **409** 를 던진다 — `adapter.ts:40-44`. 방향은 같고 status 만 다르다. §7.5) · **멱등키를 실으려면 `LogoAdapter` 시그니처 변경이 필요하다**(현재 `create(input, signal?)` — `adapter.ts:16`. 공용 `CrudAdapter` 의 `WriteContext` 선례 — `crud.ts:30-42`) · 어댑터 팩토리(`createLogoAdapter`)는 `scope` 로 경로 베이스(`/api/company/${scope}`)를 파생할 수 있다 — 파트너사/고객사가 같은 본문을 공유하는 지점이다(BE-021 §6 동일).

## 7. 핵심 판정

### 7.1 로고 이미지 스킴 화이트리스트 — 서버가 거절해야 한다 【보안 판정】

**관측 사실**: `logoUrl` 은 관리자 입력이 아니라 `ImageUploadField` 의 출력이지만, 그 출력이 **`blob:` URL** 이다(`ImageUploadField.tsx:178-181`). 프론트 검증 `requiredImage`(`shared/crud/validation.ts`)는 **비어 있지 않은지만** 보고 형식을 강제하지 않으며, 테스트가 이 관대함을 **명시적으로 단언**한다 — `logo-list.test.ts:98-99` (`logoUrl: 'blob:abc-123'` → `success: true`). 즉 서버가 받게 될 `logoUrl` 은 임의 문자열이다.

**⚠ 이 관대함은 프론트의 결함이 아니라 '알려진 빚(known debt)'이다 — 서버 계약을 세울 때 그렇게 읽어야 한다.** `ImageUploadField` 에는 URL 을 칠 입력이 없어 **사용자 조작으로 도달 가능한 값이 `blob:…` 과 빈 문자열뿐이고**, 프론트가 http(s) 를 강제하면 사용자가 그것을 만족시킬 방법이 없어 **회사 관리 5개 폼이 제출 불가**가 된다(근거 전문: `shared/crud/validation.ts` 의 `requiredImage` 주석). 그래서 **깨질 것을 아는 채로 통과시키고**, 테스트 이름과 주석이 그 상태를 못 박는다 — `logo-list.test.ts:96` 의 `TODO(backend): POST /api/uploads 가 붙으면 이 단언은 뒤집힌다(blob: 거절)` · `:90-97` 의 '이 단언을 설계로 읽지 말 것'. **즉 프론트는 EP-07 이 붙는 순간 조일 준비가 되어 있고, 아래 화이트리스트 계약과 충돌하지 않는다.** (같은 파일의 `linkUrl` 은 `optionalHttpUrl` 로 http(s) 를 **강제한다** — 사람이 칠 수 있는 값이기 때문이다. 두 필드의 규칙 차이는 일관성 부족이 아니라 **이음매의 유무**다.)

**두 가지 결과**:
1. **정합 파손(현재 확정)** — `blob:` URL 은 그 문서(탭)에서만 유효하고, `ImageUploadField` 는 교체·제거·언마운트 시 `URL.revokeObjectURL` 한다(`ImageUploadField.tsx:156-161,163-168`). 모달이 닫히는 순간 저장된 `logoUrl` 이 죽는다. 새로고침·다른 관리자·고객 화면에서는 처음부터 깨진 이미지다.
2. **보안(서버가 막아야 함)** — `logoUrl` 은 고객 화면의 `<img src>` 로 나간다. 형식 제약이 없으면 `javascript:`·`data:text/html`·`vbscript:` 스킴이 저장될 수 있고, 렌더러가 이를 `<img>` 밖 컨텍스트(예: 링크·CSS `url()`·서버 사이드 템플릿)로 흘리면 **저장형 XSS** 가 된다. 프론트 검증은 우회 가능하므로(요청을 직접 만들면 그만) 방어선은 서버에 있어야 한다.

**계약**: 서버는 `logoUrl` 을 **허용 스킴 화이트리스트로 검증**한다 — 업로드 응답으로 받은 자사 저장소 URL(`https://` 절대 URL 또는 서버가 발급한 상대 경로)만 허용하고, 그 밖의 스킴(`blob:`·`data:`·`javascript:`·`vbscript:`·`file:`)은 **422 `INVALID_IMAGE_URL`** 로 거절한다. 화이트리스트는 **거부 목록이 아니라 허용 목록**이어야 한다 — 스킴은 계속 생기고 거부 목록은 반드시 뒤처진다.

**후속(EP-07)**: 근본 해결은 업로드 엔드포인트다. 서버가 파일을 받아 타입·용량을 **재검증**(클라이언트 검증 `imageFileError` 는 UX 이지 방어선이 아니다)하고 자사 URL 을 발급하면, `logoUrl` 은 '서버가 발급한 URL' 만 허용하는 더 좁은 계약이 된다. 그때까지 위 화이트리스트가 최소 방어선이다.

### 7.2 파트너사명 XSS — 서버가 저장 시 정제한다 【보안 판정】

파트너사명(`name`)·링크(`linkUrl`)는 관리자 입력이며 **고객 화면에 그대로 노출**된다(파트너사 로고 목록은 존재 이유가 고객 노출이다). 관리자 화면은 텍스트 노드로만 렌더하지만(`LogoListTable.tsx:183`), 고객 렌더가 HTML 로 해석하면 **저장형 XSS** 가 된다. BE-010 §7.2 와 동일 판정 — 서버가 저장 시 마크업·`javascript:` 스킴·이벤트 핸들러를 제거하고, 계약은 '저장된 이름·링크에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다.

`linkUrl` 은 추가로 **스킴 화이트리스트(`http`/`https`)** 를 서버가 재강제한다 — 프론트 `optionalHttpUrl` 이 같은 규칙을 갖지만 우회 가능하고, 이 값은 고객 화면의 `<a href>` 로 나가므로 `javascript:` 가 통과하면 클릭 한 번이 스크립트 실행이다.

### 7.3 일괄 삭제 — 전용 엔드포인트를 만들지 않는다

프론트가 `settleAll` 로 단건 DELETE(EP-04)를 병렬 호출하고 부분 실패를 건수로 집계한다(FS-020-EL-011). 단건이 멱등이므로 부분 실패 후 재시도가 안전하다 — **재시도가 이미 삭제된 id 를 재전송해도 204 로 흡수된다**(§7.7 #4 가 이 프론트 결함의 피해를 서버 멱등성이 덮는 구조임을 기록한다). BE-010 §7.1 과 같은 근거로 전용 벌크 계약을 두지 않는다.

### 7.4 검색·페이징 — 현재 계약에 없다

FS-020-EL-001 의 이름 검색은 **클라이언트 필터**이고(`filterLogos`), 화면에 페이지네이션이 없다(FS-020 §7 #4). 그래서 EP-01 은 쿼리 파라미터도 페이지 메타도 없이 전량을 내린다 — `// TODO(backend)` 주석에도 쿼리가 없다. **파트너사 수가 늘면 이 계약이 먼저 깨진다**: 전량 응답이 커지고, 프론트는 전량을 렌더한다. 페이징·서버 검색 도입은 EP-01 의 쿼리(`keyword`·`page`·`size`)와 응답 형태(배열 → `{ items, total }`) **양쪽을 바꾸는 계약 변경**이며, 재정렬(EP-06)이 '전체 순열' 가정을 잃으므로 BE-010-EP-09 처럼 '슬롯 안 재배치' 규칙으로 바꿔야 한다. §7.7 #1 로 이관한다.

### 7.5 참조 무결성 · 동시성 — 서버가 404 를 줘야 한다 【정합 판정】

**⚠ 관측 사실이 F3b 에서 바뀌었다 — 프론트가 이미 절반을 막는다.** 직전 판정은 `update`·`remove`·`setActive` 가 '없는 id 에 대해 조용히 no-op 하고 resolve' 한다고 적었으나, 그것은 이제 사실이 아니다: `createLogoAdapter` 는 `requireExisting(id, message)` 게이트를 갖고(`adapter.ts:40-44`) 없는 id 면 `throw new HttpError(HTTP_STATUS.conflict, …)` 한다 — `update`(`:63` — '다른 사용자가 먼저 삭제한 항목입니다.') · `remove`(`:69` — '이미 삭제된 항목입니다.') · `setActive`(`:80`). `adapter.ts:32-39` 주석이 그 판정을 기록한다('공용 CRUD 프레임워크의 두 팩토리가 같은 자리에서 같은 판정을 한다. 이 팩토리만 뚫려 있을 이유가 없다'). **유령 저장 토스트는 사라졌다.**

**그러나 계약은 여전히 필요하다 — 두 가지 이유다.** ① **픽스처의 409 는 서버 계약이 아니다**: 그것은 프론트가 자기 배열을 보고 내는 것이고, 실제 백엔드가 붙으면 그 판정의 정본은 서버여야 한다. ② **프론트가 그 응답을 아직 쓰지 못한다**: `LogoFormModal.tsx:94-97` 의 `onError` 가 `isAbort` 만 거르고 나머지를 generic '저장하지 못했습니다…' 로 뭉개, **어댑터가 실어 보낸 정확한 문구가 그 자리에서 버려진다**(공용 `useCrudForm.ts:166-179` 는 같은 자리에 `isConflict` 분기를 갖는다). 즉 서버가 404 를 줘도 지금 화면은 그것을 구분해 보여 주지 못한다 — 계약과 프론트 수선이 함께 가야 한다(§7.7 #3).

**계약**: 서버는 대상이 없으면 **404 `PARTNER_NOT_FOUND`** 를 반환한다(EP-03·EP-05). DELETE(EP-04)만 멱등성을 위해 204 를 준다.

**낙관적 잠금은 두지 않는다**: `LogoItem` 에 `updatedAt`/`version` 이 없고(§3) 프론트에 충돌 해소 UI 가 없다 — 서버가 409/412 를 올려도 프론트가 '최신 reload / overwrite' 를 물을 화면이 없어 일반 실패 배너로 붕괴한다. 수정(EP-03)·재정렬(EP-06)은 **마지막 쓰기 승리**로 확정한다. 파트너사는 소수의 관리자가 드물게 만지는 큐레이션 목록이라 동시 편집 확률이 낮다는 판단이다. 이 판단이 틀리면(동시 편집이 실제 문제가 되면) `updatedAt` 을 `LogoItem` 에 추가하고 `If-Match` 를 EP-03 계약으로 승격한다 — **데이터 계약 변경이므로 그때 BE-021 과 함께 간다.** §7.7 #3 으로 이관한다.

### 7.6 등록 멱등성 — 서버가 방어선을 갖지 않는다

EP-02 는 비멱등이고 `Idempotency-Key` 를 받지 않는다(`// TODO(backend)` 주석에 없다). 프론트도 동기 제출 락이 없어(FS-020 §7 #9 — `LogoFormModal.tsx:88` 의 `onValid` 는 `disabled={saving}` 에만 의존) **비활성 렌더 전의 빠른 재클릭이 두 건을 만든다**. 파트너사 등록은 돈이 걸린 작업이 아니라 중복분을 지우면 되지만, 중복 이름 제약도 없어(§7.8) 서버가 이를 걸러 낼 근거도 없다.

**판정**: 이 배치에서 계약을 늘리지 않는다 — 옳은 수선은 **프론트의 `submitLockRef`**(공용 `useCrudForm.ts:103,202-203` 패턴)이며 서버 계약 없이 닫힌다. 다만 그것이 붙기 전까지 중복 등록은 열려 있다. **⚠ F3b 가 멱등 ledger 를 공용 CRUD 두 팩토리(`createCrudAdapter`·`createStoreAdapter`)에 넣었지만**(`shared/crud/crud.ts:62-72` `createIdempotencyLedger`) **이 화면의 `createLogoAdapter` 에는 이식되지 않았다** — 그 팩토리의 `create(input, signal?)` 시그니처(`adapter.ts:16`)에 **키가 앉을 자리조차 없다**(공용 `CrudAdapter` 는 `WriteContext` 로 그 자리를 만들었다 — `crud.ts:30-42,47`). 즉 프론트 수선은 어댑터 시그니처 변경을 포함한다. §7.7 #2 로 이관한다.

### 7.7 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | 목록 페이징·서버 검색 미정 — 파트너사 수가 늘면 EP-01 전량 응답과 프론트 전량 렌더가 함께 깨진다(§7.4 · FS-020 §7 #4) | A63 · A11 |
| 2 | 등록 중복 방지 — 프론트 동기 제출 락 부재(§7.6 · FS-020 §7 #9). 서버 계약 변경 없이 프론트에서 닫는다 | A11 · A40 |
| 3 | 수정·재정렬 동시성 — 마지막 쓰기 승리(§7.5). `updatedAt`/`If-Match` 승격 시 BE-021 과 동시 변경 | A63 · A11 |
| 4 | 일괄 삭제가 실패 id 를 돌려받지 못해 재시도가 전원을 재전송한다(FS-020 §7 #10) — EP-04 의 멱등성이 피해를 흡수하지만 요청 수가 낭비되고 부분 실패 시 목록이 무효화되지 않아 화면이 stale 하다 | A11 · A40 |
| 5 | 저장 실패가 status 별로 갈리지 않는다 — 422 `error.fields` 를 입력에 매핑하지 않는다(FS-020 §7 #6 · EXC-06/07) | A11 · A40 |
| 6 | 로고 이미지 업로드 엔드포인트 부재(EP-07 · §7.1) — 저장값이 `blob:` 이라 현재도 깨진다. **프론트의 관대한 검증은 결함이 아니라 이 엔드포인트를 기다리는 '알려진 빚'이며**(§7.1), EP-07 이 붙는 순간 `requiredImage` 가 조여지고 `logo-list.test.ts:98-99` 의 단언이 뒤집힌다 | A63 · A11 |

## 8. 자기 점검

- [x] FS-020 §5 요소가 전부 엔드포인트로 커버됐다 — 심에 있는 6개(EP-01~EP-06) + 심 없는 1개(EP-07) 명시
- [x] `// TODO(backend)` 주석에 없는 엔드포인트를 지어내지 않았다 — 업로드는 '심 없음(미정)'
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (7행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함
- [x] 멱등성 판정 — 조회 GET / 수정·삭제·토글·재정렬 멱등 / 등록 비멱등(멱등키 없음)
- [x] 보안 판정 2건 — 이미지 스킴 화이트리스트(§7.1) · 파트너사명/링크 XSS(§7.2). 정합 판정 1건 — 참조 무결성·동시성(§7.5)
- [x] 서버 코드·저장소 설계를 쓰지 않았다
