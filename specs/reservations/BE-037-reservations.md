---
id: BE-037
title: "예약 관리 백엔드 기능 명세"
functionalSpec: FS-037
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.1
date: 2026-07-17
---

# BE-037. 예약 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-037 예약 관리 (`/reservations` · `/reservations/new` · `/reservations/:id/edit`) |
| 범위 | 예약 목록/상세/등록/수정/삭제(단건·일괄), 자원 카탈로그 조회, 담당자 카탈로그 조회, **시간 슬롯 충돌(더블부킹) 판정**, **상태 전이 강제** |
| 범위 밖 | 예약 일정(달력) 화면의 렌더 — 데이터는 이 문서의 EP-01 을 재사용한다(BE-040 §1). 일괄 삭제 전용 엔드포인트(§7.7). 고객이 예약을 넣는 접수 경로(관리자 화면 밖) |
| 전제 | BE-003 §1 과 동일 — 세션 쿠키 인증, `/api` 프리픽스, `application/json; charset=utf-8` |
| 프론트 어댑터 | `apps/admin/src/pages/reservations/_shared/reservation-store.ts`(`reservationAdapter`) · `_shared/resources.ts` |
| 도메인 타입 | `apps/admin/src/pages/reservations/_shared/reservation.ts` · `_shared/booking.ts` · `_shared/resources.ts` |
| 검증 정본(프론트) | `apps/admin/src/pages/reservations/reservation-validation.ts`(`reservationSchema`) — **서버가 이를 재현하고 정본은 서버다**(§7.3) |
| 예약 일정 명세 | BE-040 (`specs/reservations/schedule/BE-040-schedule.md`) — 이 문서의 EP-01 을 재사용하며 전용 엔드포인트를 갖지 않는다 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 예약 도메인 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세·자원·담당자) + **예약 등록·수정**(예약 접수는 운영 업무다), **삭제는 403**(§3 아래 표). 예약 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2 · §7.5).
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-037 §4.1) — 권한 강제는 서버 책임. 프론트는 등록·수정·삭제 컨트롤을 권한과 무관하게 렌더한다(FS-037 §7 #9).

### 2.1 역할별 액션 (BE-003 §3.1 확장)

| 역할 | 조회(EP-01·03·06·07) | 등록(EP-02) | 수정(EP-04) | 삭제(EP-05) |
|---|---|---|---|---|
| `admin` | O | O | O | O |
| `operator` | O | O | O | **403** — 삭제는 감사 대상이다. 취소는 `status: 'cancelled'` 로 하는 것이 도메인 정본(`_shared/booking.ts` 의 전이 규칙이 그렇게 설계됐다) |
| 예약 도메인 읽기 권한 없음 | 컬렉션 **403** / 개별 **404** 은닉 | 403 | 404 | 404 |

## 3. 데이터 계약 (`_shared/reservation.ts` · `_shared/booking.ts` · `_shared/resources.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Reservation` | `id` · `code` · `customerName` · `customerPhone` · `date` · `startTime` · `endTime` · `partySize`(number) · `resourceId` · `staffId` · `deposit`(number) · `request` · `status` · `memo` | **목록과 상세가 같은 타입이다** — 요약 타입이 따로 없다(§7.5) |
| `ReservationInput` | `Omit<Reservation, 'id' \| 'code'>` | `id`·`code` 는 서버가 배정(§7.6) |
| `BookingStatus` | `'requested'` \| `'confirmed'` \| `'visited'` \| `'noshow'` \| `'cancelled'` | 라벨·톤은 프론트 소유. `visited` 의 표시 라벨만 도메인이 정한다('방문완료') |
| `ReservationResource` | `id` · `name` · `kind`(`'room'` \| `'seat'`) · `capacity`(number) | `capacity` = 동시 수용 **인원** |
| `ReservationStaff` | `id` · `name` · `role` | `role` 은 표시용 자유 문자열 |

**필드 규약**

| 필드 | 형식 | 제약 (프론트 `reservationSchema` 기준) |
|---|---|---|
| `code` | `RSV-YYYYMMDD-NNN` | 서버 배정. 유니크(§7.6) |
| `customerName` | string | 1–40자(앞뒤 공백 제거 후) |
| `customerPhone` | string | 1–20자. **형식 검증 없음**(§7.4) |
| `date` | `YYYY-MM-DD` | 달력상 실재하는 날짜 |
| `startTime` · `endTime` | `HH:MM`(24시간) | 형식 + `endTime > startTime`(분 단위). 경계 접함은 겹침이 아니다 |
| `partySize` | integer | 1 이상, 100(`PARTY_SIZE_MAX`) 이하, **선택 자원의 `capacity` 이하** |
| `resourceId` | string | 자원 카탈로그(EP-06)에 존재해야 한다 |
| `staffId` | string | 담당자 카탈로그(EP-07)에 존재하거나 `''`(미배정) |
| `deposit` | integer | 0 이상. 상한 없음 |
| `request` · `memo` | string | 0–500자(앞뒤 공백 제거 후). `memo` 는 **내부 전용**(§7.4) |
| `status` | `BookingStatus` | 5개 중 하나 + **전이 규칙**(§7.2) |

## 4. 엔드포인트 명세

> 근거가 되는 심은 두 줄뿐이다:
> - `_shared/reservation-store.ts:5` — `// TODO(backend): GET/POST /api/reservations · GET/PUT/DELETE /api/reservations/:id`
> - `_shared/resources.ts:7` — `// TODO(backend): GET /api/reservations/resources · GET /api/reservations/staff`
>
> 아래 7개가 전부다. 일괄 삭제·달력 범위 조회·발번·상태 전이 전용 엔드포인트는 **심이 없다**(§7.7 · §7.8).

### BE-037-EP-01 · 예약 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-004, EL-005, EL-007, EL-007.12, EL-008, EL-009, EL-010, EL-015 |
| 메서드·경로 | `GET /api/reservations` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 전량.** 프론트에 페이지네이션이 없고(FS-037 §7 #2) 어댑터가 `fetchAll(signal)` 하나만 노출한다 |
| 레이트리밋 | 분당 120회 |

**쿼리**: 없다. 필터(`status`)·검색(`keyword`)·정렬이 전부 클라이언트에서 일어난다(FS-037-EL-001·EL-002). **서버가 필터·페이징 파라미터를 추가하려면 프론트 어댑터 시그니처(`fetchAll(signal)`)가 바뀌어야 한다 — 계약 변경이다**(§7.8 #1).

**응답 200** — `readonly Reservation[]`. 정렬은 서버가 보장하지 않아도 된다(프론트 `sortReservations` 가 방문일시 내림차순으로 다시 정렬한다). 단 **전량이어야 한다**: 더블부킹 판정(FS-037-EL-007.12 · EL-015)과 예약 일정 달력(BE-040)이 이 응답 하나를 판정 근거로 쓴다 — 행 단위로 범위를 좁히면 두 기능이 조용히 틀린다(§7.1).

**에러**: 401 · **403**(컬렉션) · 429 · 500 · 504.

---

### BE-037-EP-02 · 예약 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-003, EL-030(등록) |
| 메서드·경로 | `POST /api/reservations` |
| 권한 | `admin`, `operator` |
| 멱등성 | **비멱등. 단 `Idempotency-Key` 헤더를 받는다** — 프론트가 제출 시도 단위로 키를 만들어 재시도가 같은 키를 재사용한다(`useCrudForm` 의 `idempotencyKeyRef`). 같은 키의 재요청은 최초 응답을 재생한다 |
| 레이트리밋 | 분당 60회 |

**바디**(`ReservationInput`): §3 필드 규약 전량. **응답 201** — 생성된 `Reservation`(서버가 `id`·`code` 배정 — §7.6). 프론트 `create(...): Promise<void>` 라 본문을 읽지 않지만, 201 본문은 계약에 둔다(달력·목록이 무효화 후 재조회한다).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `customerName`·`customerPhone`·`date`·`startTime`·`endTime`·`partySize`·`resourceId`·`deposit`·`request`·`memo`) · 401 · 403 · 403 CSRF · **422 `RESERVATION_SLOT_CONFLICT`**(시간 슬롯 충돌 — §7.1) · **422 `RESOURCE_NOT_FOUND`**(존재하지 않는 `resourceId`) · **422 `STAFF_NOT_FOUND`**(존재하지 않는 `staffId`) · **422 `PARTY_SIZE_EXCEEDS_CAPACITY`**(정원 초과 — §7.3) · 429 · 500 · 504.

---

### BE-037-EP-03 · 예약 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-031, EL-032 |
| 메서드·경로 | `GET /api/reservations/:id` |
| 권한 | `admin`, `operator`. 읽기 권한 없음 → **404 은닉**(§7.5) |
| 멱등성 | 멱등(GET) |

**응답 200** — `Reservation`. 프론트 어댑터는 404 를 `HttpError(404)` 로 올려 폼 셸이 '찾을 수 없습니다 + 목록으로'(재시도 없음)를 그린다 — **404 와 5xx 를 문구·복구 수단으로 가르므로 status 를 정확히 실어야 한다**(FS-037-EL-032).

**⚠ 연락처 왕복**: `customerPhone` 을 마스킹해 내려주면 안 된다 — §7.4 판정 참조.

**에러**: 400(id 형식) · 401 · **404 `RESERVATION_NOT_FOUND`**(없음 또는 읽기 권한 없음 — 은닉) · 429 · 500 · 504.

---

### BE-037-EP-04 · 예약 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-007.13(수정), EL-030(수정), EL-034 |
| 메서드·경로 | `PUT /api/reservations/:id` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(PUT 전체 치환) |
| 레이트리밋 | 분당 60회 |

**바디**: `ReservationInput`(EP-02 동일 — **전체 치환**이다. 프론트가 폼 값 전량을 보낸다). **헤더**: `If-Match: <version>` — §7.3 판정에 따라 **필수로 승격해야 한다**(현재 프론트 미구현).

**응답 200/204**.

**에러**: 400 · 401 · 403 · 403 CSRF · **404 `RESERVATION_NOT_FOUND`**(없음·삭제됨·읽기 권한 없음) · **409 `RESERVATION_CONFLICT`**(다른 관리자가 먼저 변경 — §7.3) · **412 `PRECONDITION_FAILED`**(`If-Match` 불일치 — 409 와 같은 UX 로 수렴한다) · **422 `RESERVATION_SLOT_CONFLICT`**(§7.1) · 422 `RESOURCE_NOT_FOUND` · 422 `STAFF_NOT_FOUND` · 422 `PARTY_SIZE_EXCEEDS_CAPACITY` · **422 `INVALID_STATUS_TRANSITION`**(§7.2) · 429 · 500 · 504.

---

### BE-037-EP-05 · 예약 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-007.13(삭제), EL-011, EL-006.2, EL-012 |
| 메서드·경로 | `DELETE /api/reservations/:id` |
| 권한 | **`admin` 만**. `operator` → 403 (§2.1) |
| 멱등성 | **멱등**. 이미 삭제 재요청 → 204 |
| 레이트리밋 | 분당 60회 (일괄이 항목당 개별 요청이다 — §7.7) |

**응답 204**. 일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE 한다(§7.7).

**에러**: 400 · 401 · **403**(`operator`) · 403 CSRF · **404 `RESERVATION_NOT_FOUND`**(존재한 적 없는 id, 또는 읽기 권한 없음) · 429 · 500 · 504.

> **멱등성 주의**: 현재 프론트 어댑터(`createCrudAdapter.remove`)는 **이미 삭제된 id 에 409 를 던진다**(`crud.ts:139-141` — '이미 삭제된 항목입니다.'). 이는 '유령 삭제'(없는 것을 지우고 성공 보고)를 막으려는 픽스처의 안전 기본값이고, **서버 계약은 멱등(204)이다.** 두 관리자가 같은 예약을 동시에 지우면 둘 다 성공해야 한다 — 뒤늦은 쪽에 409 를 주면 이미 목표가 달성된 작업이 실패로 보인다. 어댑터 교체 시 이 차이를 반영한다(§6.1 #3).

---

### BE-037-EP-06 · 자원 카탈로그 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-007.8, EL-022, EL-023 |
| 메서드·경로 | `GET /api/reservations/resources` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | 없음 — 전량 |

**응답 200** — `readonly ReservationResource[]` (`{ id, name, kind, capacity }[]`). `kind` 는 `'room' \| 'seat'` 두 값만 — **열린 집합이 아니다**. 값을 늘리려면 프론트 타입(`ResourceKind`)을 함께 바꿔야 한다.

**⚠ 이 엔드포인트는 어댑터 본문 교체만으로 연결되지 않는다 — §7.3 판정 참조.**

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-037-EP-07 · 담당자 카탈로그 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-037-EL-007.9, EL-024 |
| 메서드·경로 | `GET /api/reservations/staff` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | 없음 — 전량 |

**응답 200** — `readonly ReservationStaff[]` (`{ id, name, role }[]`). 이 목록은 **예약에 배정 가능한 담당자**이지 관리자 계정 목록이 아니다 — `/users/admins` 도메인과 다른 리소스다.

**⚠ EP-06 과 같은 아키텍처 제약 — §7.3.**

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-037-EP-08 · 일괄 삭제 — **심 없음 (미정)**
프론트가 `settleAll` 로 단건 DELETE(EP-05)를 병렬 호출한다. 전용 벌크 계약을 만들지 않는다 — §7.7 판정.

### BE-037-EP-09 · 예약번호 발번 — **심 없음 (미정)**
현재 클라이언트 어댑터가 `RSV-${YYYYMMDD}-${같은 날 건수+1}` 로 만든다(`reservation-store.ts:110-114`). 서버 배정으로 옮겨야 하며 별도 엔드포인트가 아니라 EP-02 의 응답에 실린다 — §7.6 판정.

### BE-037-EP-10 · 슬롯 가용량 조회 — **심 없음 (미정)**
예약 일정 달력이 '예약 수 / 수용량'을 보이지만(BE-040), 수용량은 `slotCapacity() = listResources().length` 로 **클라이언트가 자원 수에서 계산**한다. 전용 엔드포인트 심이 없다 — BE-040 §7 참조.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — 쿼리 파라미터가 없다(전량 조회) | 401 → 쿼리 계층이 재인증 경로로. 화면은 FS-037-EL-010 | **403** 컬렉션 — 예약 목록의 존재는 비밀이 아니다(§7.5) | N/A — 0건이면 200 빈 배열 → FS-037-EL-009 | N/A 읽기 전용 | N/A | 429 분당 120 | 500 + `traceId` → FS-037-EL-010 | 5초 → 504 → FS-037-EL-010 |
| EP-02 등록 | 필드 전량 → `error.fields` → 각 입력 인라인(EXC-07) | 401 → FS-037-EL-017 | **403** 컬렉션 쓰기(권한 없는 역할) | N/A 생성 | N/A — 생성엔 대상이 없다. **슬롯 경합은 409 가 아니라 422**(§7.1) | **422** `RESERVATION_SLOT_CONFLICT` · `RESOURCE_NOT_FOUND` · `STAFF_NOT_FOUND` · `PARTY_SIZE_EXCEEDS_CAPACITY` | 429 분당 60 | 500 + `traceId` → FS-037-EL-017(+ 오류 코드) | 5초 → 504 → FS-037-EL-017 |
| EP-03 상세 | id 형식 | 401 | 읽기 권한 없음 → **404 은닉**(개인정보 — §7.5) | 404 `RESERVATION_NOT_FOUND` → FS-037-EL-032 '찾을 수 없습니다 + 목록으로'(재시도 없음) | N/A | N/A | 429 | 500 + `traceId` → FS-037-EL-032 '다시 시도 + 목록으로' | 5초 → 504 → EL-032 error 분기 |
| EP-04 수정 | 위 + id | 401 → FS-037-EL-017 | 읽기 없음 → **404** / 읽기 있고 쓰기 없음 → **403**(BE-003 §3.2 두 번째 원칙) | 404 `RESERVATION_NOT_FOUND`(다른 관리자가 먼저 삭제) → **FS-037-EL-034 충돌 다이얼로그가 아니라 EL-017 배너**로 떨어진다(§7.3) | **409 `RESERVATION_CONFLICT`** / **412** `If-Match` 불일치 → FS-037-EL-034(입력 보존) | **422** `INVALID_STATUS_TRANSITION`(§7.2) · `RESERVATION_SLOT_CONFLICT`(§7.1) · `RESOURCE_NOT_FOUND` · `STAFF_NOT_FOUND` · `PARTY_SIZE_EXCEEDS_CAPACITY` | 429 분당 60 | 500 + `traceId` → FS-037-EL-017 | 5초 → 504 → FS-037-EL-017 |
| EP-05 삭제 | id 형식 | 401 → 다이얼로그 안 배너(FS-037-EL-011) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id 만. **이미 삭제는 204(멱등)** — 어댑터의 409 와 다르다(§6.1 #3) | N/A DELETE 멱등 | N/A | 429 분당 60 | 500 → 단건은 다이얼로그 배너 / 일괄은 부분 실패 건수(FS-037-EL-012) | 5초 → 504 → 같은 실패 자리 |
| EP-06 자원 | N/A — 파라미터 없음 | 401 | **403** 컬렉션 — 자원 카탈로그는 개인정보가 아니다 | N/A — 0개면 빈 배열 | N/A | N/A | 429 | 500 + `traceId`. **프론트에 전용 실패 표면이 없다** — 자원 select 가 조용히 비고 인원 정원 검사가 통과해 버린다(§7.3) | 5초 → 504 → 위와 동일 |
| EP-07 담당자 | N/A — 파라미터 없음 | 401 | **403** 컬렉션 | N/A — 0개면 빈 배열 | N/A | N/A | 429 | 500 + `traceId`. EP-06 과 같이 전용 실패 표면 없음 — 담당 select 가 '미배정' 하나만 남는다(§7.3) | 5초 → 504 → 위와 동일 |

## 6. 프론트 연동 대조

| 어댑터 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `reservationAdapter.fetchAll(signal)` | `GET /api/reservations` | EP-01 | `readonly Reservation[]` | O |
| `reservationAdapter.create(input, signal?)` | `POST /api/reservations` | EP-02 | `void`(201) | O |
| `reservationAdapter.fetchOne(id, signal)` | `GET /api/reservations/:id` | EP-03 | `Reservation` (404 → `HttpError(404)`) | O |
| `reservationAdapter.update(id, input, signal?)` | `PUT /api/reservations/:id` | EP-04 | `void` | **△** — 어댑터가 `If-Match` 를 보내지 않는다(§7.3) |
| `reservationAdapter.remove(id, signal?)` | `DELETE /api/reservations/:id` | EP-05 | `void`(204) | **△** — 어댑터가 이미 삭제된 id 에 409 를 던진다(계약은 204 멱등 — §6.1 #3) |
| `listResources()` · `findResource(id)` · `resourceCapacity(id)` | `GET /api/reservations/resources` | EP-06 | `readonly ReservationResource[]` | **✕** — **동기 함수라 시그니처가 맞지 않는다**(§7.3) |
| `listStaff()` · `staffName(id)` | `GET /api/reservations/staff` | EP-07 | `readonly ReservationStaff[]` | **✕** — 동기 함수(§7.3) |

### 6.1 어댑터 본문 요구사항

1. 쓰기 함수 전부 `X-CSRF-Token` 헤더.
2. ~~`create` 는 `Idempotency-Key` 헤더 — `useCrudForm` 이 키를 만들지만 어댑터로 넘기지 않는다.~~ → **해소됨(F3b · `HEAD = 4b805ad`).** `CrudAdapter.create/update` 가 `WriteContext`(`crud.ts:30-42`)를 받고 그 안에 `idempotencyKey` 자리가 생겼다. `useCrudForm` 이 키를 **variables 에 실어**(`:211,228,235`) `useCrudCreate`/`useCrudUpdate` 의 `mutationFn` 이 `adapter.create(input, { signal, idempotencyKey })` 로 넘긴다(`crud.ts:288-289,310-311`). 픽스처도 `createIdempotencyLedger`(`:62-72`)로 재생을 흉내 내며 **적용에 성공한 뒤에만 키를 기록한다**(`:114-116`). **어댑터 교체 시 남은 일은 이 키를 `Idempotency-Key: <key>` 헤더로 내보내는 것뿐이다** — 시그니처 변경은 필요 없다(계약이 이미 맞다). `crud.ts:39` 의 `TODO(backend)` 주석이 그 지점을 표시한다.
3. `remove` 는 **없는 id 에 409 를 던지지 말고 성공 처리**해야 한다(멱등). 현재 `crud.ts:139-141` 의 409 는 픽스처의 유령 삭제 방지책이며 서버 계약과 어긋난다.
4. `update` 는 `If-Match` 헤더를 실어야 한다 — 그러려면 `Reservation` 에 `version`(또는 `updatedAt`) 필드가 추가되고 `CrudAdapter.update` 시그니처가 바뀐다(§7.3).
5. `fetchOne` 은 404 를 `HttpError(404)` 로 올린다 — **이미 그렇다**(`crud.ts:54-56`). 유지한다.
6. `fetchAll` 은 5xx/401 을 `HttpError` 로 올려야 쿼리 계층의 401 인터셉터가 동작한다 — `failIfRequested` 의 `?status=` 경로는 이미 `HttpError` 를 던지지만 `?fail=` 경로는 generic `Error` 를 던진다(개발용 재현 스위치의 차이 — 프로덕션 경로와 무관).
7. **`listResources`/`listStaff` 는 어댑터가 아니라 모듈 상수 접근자다.** 비동기화하려면 §7.3 의 세 호출부를 함께 고쳐야 한다.

## 7. 핵심 판정

### 7.1 시간 슬롯 충돌(더블부킹) — 서버가 트랜잭션 안에서 재확인한다 【정합 판정】

**프론트의 판정은 편의이고 서버가 정본이다.** `_shared/reservation.ts:66-87` 의 `findConflicts` 는 순수 함수로, **호출 시점에 클라이언트 캐시에 들어 있는 배열**(`useCrudListQuery` 의 `data`)만 훑는다. 그 캐시는 `staleTime: 30_000` 이라 **최대 30초 낡았다**. 따라서:

1. 관리자 A 가 `/reservations/new` 를 열고 room-b 10:00~11:00 을 입력한다. 캐시에 겹치는 예약이 없어 경고 배너(FS-037-EL-015)가 뜨지 않는다.
2. 그 사이 관리자 B 가 room-b 10:30~11:30 을 저장한다.
3. A 가 저장한다. **클라이언트는 아무것도 모르고, 어댑터에도 충돌 검사가 없다**(`createCrudAdapter.create` 는 `build` 후 배열에 밀어 넣을 뿐이다 — `crud.ts:59-63`). 더블부킹이 저장된다.

이것이 정확히 BE-010 §7.7(카테고리 참조 무결성)이 다룬 구조다 — **조회 시점과 쓰기 시점 사이의 간극(TOCTOU)은 클라이언트가 원리적으로 닫을 수 없다.** 클라이언트가 아무리 자주 재조회해도 '확인 후 전송' 사이의 창은 남는다. 닫을 수 있는 곳은 쓰기를 직렬화하는 지점, 즉 **서버 트랜잭션 안**뿐이다.

**계약**: EP-02·EP-04 는 예약을 커밋하기 전, **같은 트랜잭션 안에서** 같은 `resourceId` · 같은 `date` 에 시간이 겹치는(`aStart < bEnd && bStart < aEnd`) **유효 예약**(`status ∈ {requested, confirmed, visited}` — 취소·노쇼는 자리를 비운다)이 있는지 재확인하고, 있으면 거절한다. 수정(EP-04)은 자기 자신을 제외한다. 동시성 보장은 구현 자유이나(자원+날짜 범위 잠금, 유니크 배타 제약, 직렬화 격리 수준 중 택일) **'조회 후 삽입' 두 문장으로는 충족되지 않는다** — 두 트랜잭션이 나란히 조회하면 둘 다 통과한다.

**409 가 아니라 422 로 거절한다 — 근거 3가지**:

1. **409 는 '대상 리소스의 현재 상태와 충돌'이다.** 슬롯 경합은 대상(내가 만드는/고치는 예약)이 아니라 **다른 예약**과의 경합이다. 등록(EP-02)에는 애초에 '대상 리소스'가 없다 — 409 를 줄 자리가 아니다.
2. **프론트 배관이 그렇게 갈라져 있다.** `useCrudForm.handleWriteError` 는 409/412 를 `FormConflictDialog` 로 보내는데(`useCrudForm.ts:166-179`), 그 다이얼로그의 문구는 '다른 사용자가 먼저 **변경했습니다**'이고 선택지는 '최신 내용 불러오기'(= 내 입력을 버리고 이 예약의 최신본을 다시 읽는다) / '이어서 편집'이다. 슬롯 경합에서 이 다이얼로그는 **거짓말을 한다** — 내 예약은 변경되지 않았고, 최신본을 다시 읽어도 경합하는 남의 예약은 보이지 않으며, 재조회는 아무 문제도 해결하지 못한다. 반면 422 + `error.fields` 는 `setError`+`setFocus` 로 **`startTime`·`resourceId` 입력에 인라인 오류를 꽂고 포커스를 옮긴다**(`useCrudForm.ts:182-192`) — 그것이 관리자가 실제로 해야 할 일(시간을 옮기거나 다른 자원을 고르기)을 정확히 가리킨다.
3. **BE-003 §2.1 의 정의와 일치한다** — 422 `UNPROCESSABLE` = '형식은 맞으나 상태 위반'. 슬롯 충돌은 바로 그것이다.

**응답**: `422 RESERVATION_SLOT_CONFLICT`. `error.fields` 에 `{ name: 'startTime', code: 'SLOT_CONFLICT', message: '같은 자원에 시간이 겹치는 예약이 있습니다.' }` 와 `{ name: 'resourceId', … }` 를 함께 싣는다(둘 중 어느 쪽을 고쳐도 해소되므로 둘 다 표시하고 첫 필드로 포커스가 간다). `error.message` = '같은 자원에 시간이 겹치는 예약이 있습니다. 시간을 조정하거나 다른 자원을 선택하세요.'

**⚠ 이 판정은 프론트의 현재 동작과 충돌한다** — FS-037-EL-015 는 더블부킹을 **비차단 경고**로 다룬다(저장을 막지 않는다). 서버가 422 로 막으면 '경고를 보고도 저장할 수 있다'는 화면의 약속이 깨진다. **정합을 위해 프론트 경고를 차단으로 승격해야 한다**(§7.8 #3). 반대로 '의도적 더블부킹을 허용한다'가 도메인 정책이라면 서버는 막지 않고 **응답에 충돌 사실을 실어** 프론트가 배지로 표시하게 해야 한다 — 어느 쪽이든 **정책을 코드가 아니라 계약이 정해야 하고, 지금 코드는 두 정책 사이에 걸쳐 있다**(§7.8 #4).

**⚠ 담당자 겹침은 판정 대상이 아니다.** `findConflicts` 는 `resourceId` 만 본다 — 같은 담당자를 같은 시각의 두 예약에 배정해도 아무도 막지 않는다(FS-037 §7 #13). 서버 계약에 `staffId` 축을 추가할지는 도메인 결정이다(§7.8 #5).

**⚠ 범위 축소 금지.** EP-01 이 예약을 **전량** 내려주지 않으면(행 단위 권한·지점별 필터 등) 프론트의 더블부킹 배지(FS-037-EL-007.12)와 달력 집계(BE-040)가 **조용히 과소 보고한다** — 보이지 않는 예약과의 충돌은 배지가 뜨지 않는다. 목록 범위를 좁히는 순간 충돌 판정은 서버 전용이 되어야 한다.

### 7.2 상태 전이 — 서버가 정본이다 【정합 판정】

`_shared/booking.ts:44-64` 가 전이 규칙을 정의한다: `requested → {confirmed, cancelled}` · `confirmed → {visited, noshow, cancelled}` · `visited`·`noshow`·`cancelled` 는 **종료**(전이 없음). 파일 헤더가 이유를 밝힌다 — '되돌리기(확정→요청 등)는 막는다 — 감사 성격상 상태는 앞으로만 나아간다'. `booking.test.ts` 가 이 동작을 고정한다.

**그런데 예약 폼은 이 규칙을 강제하지 않는다.** `ReservationFormPage.tsx:40` 이 `FORM_STATUSES = ['requested','confirmed','visited','noshow','cancelled']` 를 하드코딩하고 `:352-356` 이 그 5개를 전부 `<option>` 으로 그린다. `statusChoices(from)` 은 import 조차 되지 않는다. 결과: **'방문완료'된 예약을 '요청'으로 되돌릴 수 있고, '취소'된 예약을 '확정'으로 살릴 수 있다.** `reservationSchema` 도 `z.enum([...5개])` 로 값의 소속만 검사하고 전이는 보지 않는다(현재 상태를 스키마가 알지 못한다 — 폼 값에 원래 상태가 없다).

**같은 섹션의 상담 예약 폼은 규칙을 지킨다** — `ConsultationBookingFormPage.tsx:114` 가 `statusChoices(originalStatus)` 로 선택지를 좁힌다. **같은 공용 모듈이 두 화면에서 다르게 강제되고 있다** — 이것이 이 판정을 필요하게 만드는 사실 자체다: 프론트의 규칙 강제는 화면마다 빠질 수 있고 실제로 빠졌다.

**계약**: EP-04 는 저장 전 현재 저장된 상태(`from`)를 읽고 `canTransition(from, to)` 를 재현해 위반이면 **422 `INVALID_STATUS_TRANSITION`** 으로 거절한다. `from === to`(상태 미변경 저장)는 허용한다. `error.fields` = `{ name: 'status', code: 'INVALID_TRANSITION', message: '<from 라벨>에서 <to 라벨>(으)로 바꿀 수 없습니다.' }` — 422+fields 라 폼의 상태 select 에 인라인 오류가 꽂힌다(EXC-07 경로).

EP-02(등록)의 초기 상태는 `requested` 또는 `confirmed` 만 허용한다 — 존재한 적 없는 예약을 '방문완료'로 만드는 것은 감사 기록의 위조다. 위반 시 같은 422.

**전이 규칙의 정본은 서버다.** 프론트가 선택지를 좁히는 것(상담 폼)은 UX 편의이고, 좁히지 않는 것(예약 폼)은 결함이다 — 그러나 **서버가 강제하면 결함은 '불편'에 그치고, 서버가 강제하지 않으면 결함은 '데이터 오염'이 된다.** 프론트 수정(§7.8 #6)과 무관하게 서버는 막는다.

### 7.3 자원·담당자 카탈로그 — 어댑터 교체로 연결되지 않는다 【아키텍처 판정】

`_shared/resources.ts:7` 에 `// TODO(backend): GET /api/reservations/resources · GET /api/reservations/staff` 심이 있다. **그러나 그 심이 가리키는 함수들은 조회 어댑터가 아니라 동기 접근자다** — `listResources(): readonly ReservationResource[]` 는 모듈 상수 배열을 그대로 돌려준다. 세 호출부가 이 동기성에 의존한다:

| 호출부 | 코드 | 왜 비동기로 못 바꾸는가 |
|---|---|---|
| `ReservationFormPage.tsx:41-42` | `const RESOURCES = listResources(); const STAFF = listStaff();` | **모듈 스코프**다 — 컴포넌트 밖, 앱 번들 평가 시점에 한 번 실행된다. React 훅도 `await` 도 쓸 수 없다 |
| `reservation-validation.ts:77` | `if (findResource(ctx.value.resourceId) === undefined)` | **zod `.check()` 콜백 안**이다. `reservationSchema` 는 모듈 상수이고 `zodResolver` 가 동기로 돌린다 |
| `reservation-validation.ts:108` | `const capacity = resourceCapacity(ctx.value.resourceId)` | 동일 |

즉 EP-06·EP-07 을 붙이려면 **어댑터 본문 교체(다른 화면들의 연동 방식)로는 불가능하고 호출부를 재구조화해야 한다**:
- 폼: `useQuery` 로 카탈로그를 읽고 로딩·실패 상태를 만든다(현재 두 select 에는 **로딩 표면도 실패 표면도 없다** — §5 EP-06/07 의 500 열 참조). 조회 실패 시 자원 select 가 조용히 비고, 관리자는 '배정할 자원을 선택하세요'만 보게 된다.
- 검증: 스키마가 카탈로그를 **주입받아야** 한다(`makeReservationSchema(resources)` 같은 팩토리) — 모듈 상수 스키마로는 런타임 데이터를 볼 수 없다.

**이것을 백엔드 연동 이전에 처리해야 하는 이유**: 스키마가 카탈로그를 못 보면 정원 검사(`PARTY_SIZE_EXCEEDS_CAPACITY`)와 자원 존재 검사(`RESOURCE_NOT_FOUND`)가 **프론트에서 사라지고 서버 422 로만 남는다** — 그 자체는 옳지만(서버가 정본), 매 제출이 왕복해야 오류를 알게 되므로 UX 가 후퇴한다. 재구조화가 선행되어야 두 층이 함께 선다.

**정원 검증의 정본은 서버다.** 현재 정원(`capacity`)은 클라이언트 모듈 상수라 **관리자가 코드를 새로 받기 전까지 낡은 정원으로 검증한다.** 서버가 EP-02·EP-04 에서 `partySize ≤ resource.capacity` 를 재확인하고 위반 시 422 `PARTY_SIZE_EXCEEDS_CAPACITY`(`error.fields[].name = 'partySize'`)로 거절한다.

**낙관적 동시성(`If-Match`)이 이 화면에 없다**(`HEAD = 4b805ad` 재확인 — **판정 불변**) — `apps/admin/src` 전체에서 `If-Match` 는 `shared/api/schema.d.ts`(회원 메모 전용, BE-004)에만 있고 예약 경로에는 없다. **F3b 가 `WriteContext`(`crud.ts:30-42`)를 도입해 `signal` 옆에 `idempotencyKey` 자리를 만들었으나 `If-Match`/`version` 자리는 만들지 않았다** — 멱등키는 '같은 요청의 재시도'를 다루고 낙관적 동시성은 '다른 사람의 개입'을 다루는 **서로 다른 축**이다. `createCrudAdapter.update`(`crud.ts:126-128`)는 **대상이 사라졌을 때만** 409 를 던진다 — 유령 저장은 막지만 **둘 다 존재하는 동시 수정은 마지막 쓰기가 조용히 이긴다.** PUT 이 전체 치환이므로 결과는 단순한 '늦은 쪽 우선'이 아니다: 관리자 A 가 시간을 옮기고 B 가 담당자만 바꾸면, B 의 폼이 들고 있던 **낡은 시간**이 A 의 변경을 되돌린다. 예약은 다중 관리자가 동시에 만지는 전형적 경합 대상이므로 **`Reservation` 에 `version`(불투명 문자열)을 추가하고 EP-04 에 `If-Match` 를 필수로 두어야 한다**(§7.8 #7). 불일치 시 412(또는 409) → 프론트의 `FormConflictDialog` 가 입력을 보존한 채 뜬다 — **이 경우에는 그 다이얼로그의 문구('다른 사용자가 먼저 변경했습니다')와 선택지가 정확히 맞는다**(§7.1 과 대조된다).

### 7.4 고객 개인정보 · 관리자 메모 【보안 판정】

**(a) 관리자 메모는 고객에게 나가지 않는다.** `memo` 는 '내부 처리 메모'다(픽스처 예: '단체 예약 — 확정 전 인원 재확인 필요' · '고객 요청으로 취소 · 예약금 환불 완료'). 이 필드는 **고객 대상 어떤 응답에도 포함되지 않아야 한다** — 예약 확인 메일·고객 예약 조회·SMS 템플릿에 `Reservation` 을 통째로 넘기면 그대로 샌다. 관리자용 표현(`Reservation`)과 고객용 표현을 분리하고, 고객 표현에서 `memo` 를 **필드 자체로 제외**한다(마스킹이 아니라 부재).

**(b) 저장형 XSS.** `request`(고객 요청사항)와 `customerName` 은 고객 유래 문자열이고, `memo` 는 관리자 입력이다. 관리자 화면은 전부 텍스트 노드로 렌더하지만(FS-037-EL-007.5 · EL-015 의 `<li>`), 예약 확인 메일·고객 예약 조회가 HTML 로 해석하면 저장형 XSS 가 된다. BE-010 §7.2 와 동일 판정 — 서버가 저장 시 허용 태그 화이트리스트 밖 마크업·`javascript:` 스킴·이벤트 핸들러를 제거하고, 계약은 '저장된 값에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다.

**(c) ⚠ 연락처 마스킹은 왕복을 파괴한다 — 이 계약의 핵심 함정.** `_shared/reservation.ts:19` 의 타입 주석이 `customerPhone` 을 '**마스킹된 표기(실번호 아님)**'라 선언하고 픽스처가 `010-1234-**56` 을 담는다. 그런데 **폼은 이 값을 그대로 편집 대상으로 싣고 그대로 되쓴다**: `toValues(reservation)` → `customerPhone: reservation.customerPhone` → 화면에 `010-1234-**56` → 관리자가 담당자만 바꾸고 저장 → `toInput(values)` → `customerPhone: '010-1234-**56'` → PUT 전체 치환. **서버가 EP-03 에서 마스킹해 내려주는 순간, 모든 수정 저장이 실번호를 마스크 문자열로 덮어쓴다 — 되돌릴 수 없는 데이터 파괴다.**

정합하는 선택지는 둘뿐이다:

1. **EP-03(상세)은 실번호를 내려준다.** 목록(EP-01)만 마스킹한다 — 목록은 편집 대상이 아니라 표시 전용이므로 왕복 위험이 없다. 상세를 여는 것은 이미 그 예약의 개인정보에 접근하는 행위이고 권한으로 통제된다(§7.5). 이 경우 **`Reservation` 타입 하나로 목록·상세를 겸할 수 없다** — 목록 응답에 마스킹된 `customerPhone` 이, 상세 응답에 실번호가 담기는데 타입이 같으면 어느 쪽인지 알 수 없다. `ReservationSummary`(마스킹) / `Reservation`(실번호)로 갈라야 한다(§7.8 #8).
2. **`customerPhone` 을 읽기 전용으로 만든다** — 마스킹된 값만 내려주고 `ReservationInput` 에서 제외하며, 번호 변경은 별도 경로로 둔다. 이 경우 프론트의 연락처 입력(FS-037-EL-019)이 사라져야 한다.

**기본 판정은 1번**이다 — 관리자 예약 화면의 목적이 고객에게 전화해 예약을 확인하는 것이므로 실번호가 필요하고, 그것을 편집할 수 있어야 오기입을 고친다. 다만 **현재 프론트는 두 표현이 같은 타입이라는 전제 위에 서 있으므로**(FS-037 §5 — 목록과 상세가 같은 `Reservation`), 마스킹 도입은 타입 분리와 함께여야 한다. **결정 전까지는 마스킹하지 않는다** — 어중간한 도입이 데이터를 파괴하는 쪽이 침묵하는 쪽보다 나쁘다.

**(d) 감사 로그.** 예약은 고객 개인정보(이름·연락처)를 담고 `operator` 도 조회·수정할 수 있다. 누가 언제 어떤 예약을 조회·수정했는지 서버가 기록한다 — 프론트에 감사 표면은 없다(범위 밖).

### 7.5 403 vs 404 은닉 정책 — 개별 예약은 404 로 숨긴다 【보안 판정】

BE-003 §3.2 의 두 원칙을 그대로 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → EP-01(목록) · EP-06(자원) · EP-07(담당자)은 권한 부족 시 **403**. '예약 기능이 있다'는 사실은 사이드바에 이미 있다.
2. **개별 예약 리소스의 존재 자체가 개인정보다** → EP-03·EP-04·EP-05 는 **예약 도메인 읽기 권한이 없는 주체에게 404 `RESERVATION_NOT_FOUND`** 로 은닉한다. 예약 id 를 훑어 403/404 를 가르는 것만으로 '이 시간에 예약이 있다'와 '누군가 방문한다'는 사실이 새기 때문이다 — 회원 리소스와 같은 등급의 개인정보다.
3. **읽기 권한이 있고 쓰기 권한만 없는 주체**(예: `operator` 의 삭제)에게는 **403** — 이미 그 예약의 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없고, 정당한 운영자가 '왜 안 되는지' 모르게 만든다.

| 리소스 | 권한 부족 시 | 근거 |
|---|---|---|
| `GET /api/reservations` | **403** `FORBIDDEN` | 컬렉션. 열거할 개별 id 가 노출되지 않는다 |
| `GET /api/reservations/resources` · `/staff` | **403** `FORBIDDEN` | 컬렉션. 자원·담당자는 개인정보가 아니다 |
| `GET/PUT/DELETE /api/reservations/:id` — 읽기 권한 없음 | **404** `RESERVATION_NOT_FOUND` | 개별 리소스의 존재 = 고객 개인정보 |
| `DELETE /api/reservations/:id` — `operator`(읽기 O, 삭제 X) | **403** `FORBIDDEN` | 존재를 이미 아는 주체 |

**프론트는 이 구분을 표시하지 않는다.** 404 는 FS-037-EL-032 의 '찾을 수 없습니다 + 목록으로'로, 403 은 FS-037-EL-017/EL-011 의 일반 실패 문구로 떨어진다 — 은닉이 UX 상으로도 성립한다(운영자는 '없는 예약'과 '못 보는 예약'을 구별할 수 없다). 이는 의도된 결과이며, 정당한 운영자가 혼란스러울 수 있다는 비용을 은닉의 대가로 받아들인다.

### 7.6 예약번호(`code`) — 서버가 배정한다

현재 클라이언트가 만든다: `reservation-store.ts:110-114` 의 `nextCode` 가 `RSV-${YYYYMMDD}-${그 날짜의 기존 건수 + 1}` 을 조립한다. 세 가지가 깨진다:

1. **동시 생성 시 중복** — 두 관리자가 같은 날짜의 예약을 동시에 만들면 둘 다 같은 건수를 세어 같은 번호를 받는다.
2. **삭제 후 재사용** — 건수 기반이라 3건 중 2번을 지우고 새로 만들면 `-003` 이 다시 나온다. 예약번호는 고객에게 고지되는 식별자이므로 재사용은 오배정을 낳는다.
3. **클라이언트가 전량을 봐야 계산된다** — `build(input, existing)` 가 현재 목록을 받아 센다. EP-01 이 범위를 좁히면 번호가 틀린다.

**계약**: `code` 는 **서버가 배정**하고 EP-02 의 201 응답에 실린다. 유니크 제약을 둔다(중복 시 재시도는 서버 내부 관심사). 프론트는 `ReservationInput` 에 `code` 를 담지 않는다 — **이미 그렇다**(`Omit<Reservation, 'id' | 'code'>`). 즉 타입 계약은 이미 서버 배정을 전제하고 있고, 픽스처 어댑터만 그것을 흉내 내고 있다 — **어댑터 교체 시 자연히 해소된다.**

### 7.7 일괄 삭제 — 전용 엔드포인트를 만들지 않는다

프론트가 `settleAll`(`shared/bulk.ts`)로 단건 DELETE(EP-05)를 항목마다 병렬 호출하고 취소가 아닌 실패의 **개수**를 집계한다(FS-037-EL-012). BE-010 §7.1 과 같은 근거로 전용 벌크 계약을 두지 않는다: 단건이 멱등이므로 부분 실패 후 재시도가 안전하고, 벌크 계약은 '부분 성공을 어떻게 표현하는가'라는 문제를 서버로 옮길 뿐이다.

**다만 이 결정에는 값이 붙어 있다** — 선택 건수에 상한이 없으므로(FS-037 §7 #2) 수백 건 선택 시 수백 개의 DELETE 가 동시에 나간다. EP-05 의 레이트리밋(분당 60)이 그 자체로 부분 실패를 만든다. 프론트에 페이지네이션이 붙어 선택 범위가 한 페이지로 제한되기 전까지는 **레이트리밋이 실질 상한**이며, 429 는 '삭제하지 못했습니다' 건수로 뭉개진다(FS-037 §7 #11). 페이지네이션 도입 시 재검토한다.

### 7.8 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | EP-01 이 전량 조회다 — 필터·페이징을 서버로 옮기려면 `CrudAdapter.fetchAll(signal)` 시그니처가 바뀐다(계약 변경). 예약은 무한 증가하는 데이터라 언젠가 반드시 필요하다 | A63 · A11 |
| ~~2~~ | ~~`useCrudForm` 이 멱등키를 만들지만 어댑터로 넘기지 않는다 — `CrudAdapter.create` 시그니처에 키를 실어야 EP-02 의 `Idempotency-Key` 가 성립한다~~ → **해소됨(F3b).** `WriteContext.idempotencyKey`(`crud.ts:30-42`)로 키가 어댑터까지 도달하고 픽스처가 재생을 구현한다(`:62-72,114-116`). **EP-02 의 `Idempotency-Key` 계약이 프론트 쪽에서 성립한다** — 남은 것은 어댑터 본문에서 헤더로 내보내는 일뿐이다(`crud.ts:39` 의 `TODO(backend)`) | **닫힘** |
| 3 | **더블부킹 정책 미확정** — 프론트는 비차단 경고, 서버 판정(§7.1)은 422 차단. 정책이 '차단'이면 FS-037-EL-015 를 차단으로 승격해야 하고, '허용'이면 서버가 막지 않고 충돌 사실만 실어야 한다 | **A11 · A01 (도메인 결정)** |
| 4 | **자원 모델이 둘로 갈려 있다** — `capacity`(정원, 인원 수용)와 '자리 하나에 예약 하나'(배타 점유)가 공존한다. `findConflicts` 는 인원과 무관하게 시간 겹침만으로 충돌을 선언하고(정원 12명 방에 3명 + 4명도 '중복'), `slotCapacity()` 는 **자원 수**를 슬롯 수용량으로 쓴다(BE-040). 두 모델 중 하나를 골라야 계약이 확정된다 | **A11 · A01 (도메인 결정)** · A63 |
| 5 | 담당자 겹침을 아무도 막지 않는다 — 충돌 판정에 `staffId` 축을 넣을지 결정 필요 | A11 · A01 |
| 6 | 예약 폼이 상태 전이 규칙을 강제하지 않는다(§7.2) — `statusChoices` 를 쓰도록 고쳐야 상담 폼과 같아진다 | A11 change_request |
| 7 | `If-Match`/`version` 이 예약 경로에 없다(§7.3) — `Reservation` 에 `version` 추가 + `CrudAdapter.update` 시그니처 변경 | A63 · A41 |
| 8 | 연락처 마스킹 도입 시 `ReservationSummary`(목록·마스킹) / `Reservation`(상세·실번호) 타입 분리가 선행돼야 한다(§7.4c) — 하지 않으면 수정 저장이 번호를 파괴한다 | **A63 · A11 (차단 사안)** |
| 9 | 자원·담당자 카탈로그 조회에 프론트 로딩·실패 표면이 없다(§7.3) — EP-06/07 이 500 이면 select 가 조용히 빈다 | A11 change_request |
| 10 | 401 재인증은 쿼리 계층이 처리하지만 폼 입력은 보존되지 않는다 · 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 | A11 · A40 |

## 8. 자기 점검
- [x] FS-037 §5 의 연동 지점이 전부 엔드포인트로 커버됐다 — 누락 0건 (7 엔드포인트 + 심 없음 3건 명시)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] **심에 없는 엔드포인트를 지어내지 않았다** — 일괄 삭제(EP-08)·발번(EP-09)·슬롯 가용량(EP-10)을 '심 없음(미정)'으로 표기하고 §7.6·§7.7 · BE-040 §7 에서 판정했다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (7행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함 (§2.1 은 역할별 액션 확장일 뿐 모델 재정의가 아니다)
- [x] 멱등성 판정 — 조회 GET / 수정 PUT·삭제 DELETE 멱등 / 등록 비멱등(멱등키)
- [x] **보안 판정** — 관리자 메모 유출(§7.4a) · 저장형 XSS(§7.4b) · **연락처 마스킹 왕복 파괴**(§7.4c) · 403 vs 404 은닉(§7.5)
- [x] **정합 판정** — 시간 슬롯 충돌 TOCTOU + 409 vs 422(§7.1) · 상태 전이(§7.2) · 낙관적 동시성(§7.3) · 예약번호 발번(§7.6)
- [x] **프론트 연동 대조에서 '일치'가 아닌 3건**(`update`·`remove`·카탈로그)의 사유를 §6.1 · §7.3 에 적었다
- [x] 서버 코드·저장소 설계를 쓰지 않았다 (§7.1 의 '잠금·유니크 제약·격리 수준'은 **선택지 나열**이며 구현을 지정하지 않는다)
