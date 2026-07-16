---
id: BE-033
title: "뉴스레터 백엔드 기능 명세"
functionalSpec: FS-033
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-033. 뉴스레터 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-033 뉴스레터 (`/marketing/newsletters` · `/new` · `/:id/edit`) |
| 범위 | 발송회차 목록/상세/등록/수정/삭제(단건·일괄), 회차번호 채번, 발신자 라벨·구독자 수 비정규화 |
| 범위 밖 | **발송 실행**(§4 EP-05 — 심은 있으나 호출부 0건) · **세그먼트/발신자 레지스트리**(§4 EP-06/EP-07 — 심 없음) · 이메일 템플릿 CRUD(BE-036 소유) · 고객 수신 렌더(§7.2 XSS 판정만) · 일괄 전용 엔드포인트(§7.7) |
| 프론트 어댑터 | `apps/admin/src/pages/marketing/newsletters/data-source.ts` (`createCrudAdapter`, scope `marketing-newsletters`) |
| 도메인 타입 | `apps/admin/src/pages/marketing/newsletters/types.ts` · 공용 `apps/admin/src/pages/marketing/_shared/messaging.ts` |
| 검증 정본 | `apps/admin/src/pages/marketing/newsletters/validation.ts` (`newsletterSchema`) — **서버가 같은 규칙을 재검증한다**(§7.5) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 뉴스레터 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일. **5xx·예상외 실패는 `traceId`(참조 코드)를 반드시 싣는다** — 프론트가 저장 실패 배너에 '오류 코드 <ref>' 로 노출하고 운영자가 신고에 붙인다(FS-033-EL-015).
- **권한**: `admin` = 전체. `operator` = 조회 계열만(목록·상세), 쓰기(등록·수정·삭제) → 403. 마케팅 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2).
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504. (**프론트에는 타임아웃 상한이 없다** — FS-033 §7 #9.)
- **프론트 역할 분기 없음**(FS-033 §4.1) — 쓰기 버튼이 권한과 무관하게 렌더되므로 **권한 강제는 전적으로 서버 책임**이다(§7.6).
- **낙관적 동시성**: 쓰기 요청에 `If-Match`(또는 `updatedAt`/`version`)를 실어 보낸다. 불일치 → 409/412 → 프론트 충돌 다이얼로그(FS-033-EL-030).
- **멱등키**: 등록·수정 요청은 제출 **시도** 단위 `Idempotency-Key` 헤더를 싣는다(재시도가 같은 키를 재사용 — FS-033 §4.1).

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `NewsletterIssue`(목록 행 = 상세) | `id` · `issueNo`(number, **서버 채번**) · `title` · `senderId` · `senderEmail`(서버 조인) · `senderName`(서버 조인) · `segmentIds`(readonly string[]) · `recipientCount`(number, **서버 계산**) · `body` · `status`(`SendStatus`) · `scheduledAt`(string) · `stats`(`MailStats`) | 목록과 상세가 **같은 타입**이다 — 목록 응답이 본문(`body`)까지 싣는다(§7.8) |
| `NewsletterIssueInput` | `NewsletterIssue` − `id`·`issueNo`·`senderEmail`·`senderName`·`recipientCount`·`stats` = `title`·`senderId`·`segmentIds`·`body`·`status`·`scheduledAt` | **파생값은 클라이언트가 보내지 않는다** — 서버가 채번·조인·계산한다 |
| `SendStatus`(`_shared/messaging.ts`) | `'draft'` \| `'scheduled'` \| `'sending'` \| `'sent'` \| `'canceled'` | 5상태. **입력으로 오는 것은 `draft`·`scheduled` 뿐이어야 한다**(§7.1) |
| `MailStats`(`_shared/messaging.ts`) | `total` · `success` · `failed` · `opened` · `clicked` | 발송 결과. **서버 누적 · 읽기 전용** |
| `Segment`(`_shared/messaging.ts`) | `id` · `label` · `recipientCount` · `description` | EP-06 — **심 없음(미정)** |
| `SenderEmail`(`_shared/messaging.ts`) | `id` · `email` · `name` · `verified` | EP-07 — **심 없음(미정)** |

**파생 규칙 (프론트 픽스처가 흉내 내는 것 = 서버가 실제로 해야 하는 것)**
- `issueNo` = 현재 최대 회차 + 1 (비면 1). **채번은 서버 트랜잭션 안** — §7.3
- `senderEmail`/`senderName` = `senderId` 로 발신자 레지스트리 조인. 모르면 빈 문자열
- `recipientCount` = 선택 세그먼트 `recipientCount` 합 — **중복 수신자 제거는 서버 몫** (§7.4)
- `stats` = 신규 생성 시 전부 0. 수정 시 **보존**(입력에 없다)
- 정렬 = `issueNo` 내림차순, 동률은 `id` 내림차순 (`sortNewsletters`)

## 4. 엔드포인트 명세

### BE-033-EP-01 · 회차 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-033-EL-001, EL-002, EL-005, EL-007, EL-010 |
| 메서드·경로 | `GET /api/marketing/newsletters` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **현재 없음 — 전량 반환**. 프론트가 필터·검색을 클라이언트에서 수행한다(FS-033-EL-035). §7.5 |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트 어댑터 시그니처가 `fetchAll(signal)` 이라 필터·검색·페이지 파라미터를 보내지 않는다.

**응답 200** — `readonly NewsletterIssue[]`. `issueNo` 내림차순. `senderEmail`·`senderName` 은 서버가 조인해 내려준다.

**에러**: 401 · 403 · 429 · 500 · 504.

> **§7.5 판정 필수** — 페이징·서버 검색 계약을 이 엔드포인트에 얹을지 여부.

---

### BE-033-EP-02 · 회차 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-033-EL-028, EL-029 |
| 메서드·경로 | `GET /api/marketing/newsletters/:id` |
| 권한 | `admin`, `operator`. 읽기 권한 없음 → 404 은닉 |
| 멱등성 | 멱등(GET) |

**응답 200** — `NewsletterIssue`. **404 는 반드시 status 404 로 내려야 한다** — 프론트가 `isNotFound` 로 '찾을 수 없음'(재시도 없음) 갈래를 고른다(FS-033-EL-029). status 없는 generic error 로 내려오면 삭제된 회차에 '다시 시도' 를 권하게 된다.

**응답에 `ETag`(또는 `updatedAt`)를 실어** 프론트가 수정 시 `If-Match` 로 되돌려줄 수 있게 한다(§7.9).

**에러**: 400(id 형식) · 401 · 404 `NEWSLETTER_NOT_FOUND` · 429 · 500 · 504.

---

### BE-033-EP-03 · 회차 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-033-EL-016 ~ EL-023, EL-027(등록) |
| 메서드·경로 | `POST /api/marketing/newsletters` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **비멱등이나 `Idempotency-Key` 로 중복 생성을 막는다**(§7.10) |
| 레이트리밋 | 분당 30회 |

**바디**(`NewsletterIssueInput`): `title`(1–120자) · `senderId`(**등록·검증된 발신자 id**) · `segmentIds`(1개 이상, 존재하는 세그먼트) · `body`(1–5000자, **서버 정제 §7.2**) · `status`(**`draft`\|`scheduled` 만** — §7.1) · `scheduledAt`(`status==='scheduled'` 이면 필수·**미래 시각**, 아니면 빈 문자열).

**응답 201** — 생성된 `NewsletterIssue`(서버 채번 `issueNo`·조인 발신자·계산 `recipientCount`·0 통계). 프론트 `create(...): Promise<void>` 라 본문을 쓰지 않지만, 목록 무효화로 최신값을 다시 읽는다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `title`·`senderId`·`segmentIds`·`body`·`scheduledAt`) · 401 · 403 · 403 CSRF · 422 `SENDER_NOT_VERIFIED`(미검증 발신자 — §7.6) · 422 `SEGMENT_NOT_FOUND` · 422 `SCHEDULE_IN_PAST`(제출~저장 사이에 시각이 지난 경우) · 422 `INVALID_SEND_STATUS`(§7.1) · 429 · 500 · 504.

---

### BE-033-EP-04 · 회차 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-033-EL-016 ~ EL-023, EL-027(수정), EL-030, EL-032 |
| 메서드·경로 | `PUT /api/marketing/newsletters/:id` |
| 권한 | `admin` 만 |
| 멱등성 | 멱등(PUT 전체 치환) + `If-Match` |
| 레이트리밋 | 분당 30회 |

**바디**: `NewsletterIssueInput`(EP-03 동일). **헤더**: `If-Match: <etag>`.

**서버가 보존하는 것**: `issueNo` · `stats` — 입력에 없으므로 절대 초기화하지 않는다. `senderEmail`·`senderName`·`recipientCount` 는 새 입력으로 다시 조인·계산한다.

**응답 200/204**.

> **§7.1 판정 필수 — 상태 전이는 서버가 정본이다.** 프론트가 `sent`/`sending`/`canceled` 회차를 편집으로 열고 상태를 `draft` 로 강등한 입력을 보낼 수 있다(FS-033-EL-032). 서버는 **현재 저장된 상태**를 보고 전이를 거절한다 — 아래 §5 의 422 축.

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 CSRF · 404 `NEWSLETTER_NOT_FOUND` · **409 `CONFLICT` / 412 `PRECONDITION_FAILED`**(동시 수정 — §7.9) · **422 `ISSUE_NOT_EDITABLE`**(발송중·발송완료·취소 회차 편집 시도 — §7.1) · 422 `INVALID_STATUS_TRANSITION`(§7.1) · 422 `SENDER_NOT_VERIFIED` · 422 `SEGMENT_NOT_FOUND` · 422 `SCHEDULE_IN_PAST` · 429 · 500 · 504.

---

### BE-033-EP-05 · 회차 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-033-EL-007.10, EL-011, EL-012 |
| 메서드·경로 | `DELETE /api/marketing/newsletters/:id` |
| 권한 | `admin` 만 |
| 멱등성 | **비멱등으로 취급한다 — 프론트 어댑터가 이미 삭제된 id 에 409 를 던진다**(§7.2) |
| 레이트리밋 | 분당 60회(일괄이 항목당 개별 요청) |

**응답 204**. 일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE(§7.7).

> **§7.2 판정** — 프론트 픽스처는 이미 삭제된 id 에 **409 '이미 삭제된 항목입니다.'** 를 던진다(유령 삭제 방지). 서버가 404 를 주면 일괄 삭제에서 '방금 다른 관리자가 지운 건'이 **실패 건수로 집계**된다. 계약 결정: **이미 삭제 → 204(멱등)**. 프론트 픽스처의 409 는 백엔드 연결 시 제거 대상이다 — §7.11 이관.

> **§7.1 판정 필수** — 발송중(`sending`) 회차 삭제는 **422 `ISSUE_NOT_DELETABLE`** 로 거절한다. 전송이 진행 중인 회차를 지우면 결과 통계가 고아가 된다.

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `NEWSLETTER_NOT_FOUND`(존재한 적 없는 id) · 422 `ISSUE_NOT_DELETABLE`(발송중) · 429 · 500 · 504.

---

### BE-033-EP-06 · 발송 실행 — **심은 있으나 호출부 0건 (미정)**

`data-source.ts:64` 에 심 주석이 있다:
```
// TODO(backend): … 발송 실행: POST /api/marketing/newsletters/:id/send (예약은 스케줄러가 실행) — 프론트는 트리거만.
```

**그러나 이 경로를 부르는 코드가 앱 전체에 0건이다** — 목록·폼 어디에도 발송 버튼이 없다(FS-033 §7 #12). 따라서 이 문서는 **요청/응답/에러 계약을 확정하지 않는다.** 확정된 사실만 적는다:

- 경로·메서드: `POST /api/marketing/newsletters/:id/send` (심 문구 그대로)
- 예약 회차의 실제 전송 주체는 **서버 스케줄러**다(심 주석). 프론트는 트리거만 한다는 의도가 적혀 있으나 **그 트리거 UI 가 없다**.
- **미정**: 요청 바디 유무 · 응답(202 비동기 vs 200 동기) · 멱등키 필수 여부 · 발송 취소 경로(`canceled` 상태로 가는 문) · 부분 발송 실패 표현.

> **§7.12 판정 필수** — 발송은 quality-bar EXC-08 이 멱등키를 명시적으로 요구하는 3대 작업('금액/생성/**발송**') 중 하나다. 계약을 확정할 때 **반드시** `Idempotency-Key` 를 필수로 둔다 — 재시도가 수천 통을 두 번 보내는 것이 이 엔드포인트의 실패 양상이다.

---

### BE-033-EP-07 · 세그먼트 목록 — **심 없음 (미정)**

FS-033-EL-018·EL-025 가 세그먼트 목록과 수신자 수를 쓴다. 그러나 프론트는 `_shared/store.ts` 의 **동기 함수 `listSegments()`** 로 픽스처 배열을 읽는다 — **`// TODO(backend)` 주석이 없다.**

**엔드포인트를 지어내지 않는다.** 확정된 것은 데이터 형태(`Segment` = `id`·`label`·`recipientCount`·`description`)뿐이다.

> **§7.6 판정** — 백엔드 연결 시 이 호출부는 **동기 → 비동기 조회로 재구조화**해야 한다. 지금은 로딩·실패·취소 경로가 아예 없어(FS-033-EL-018 예외 열) 세그먼트 조회가 실패하면 폼이 '세그먼트 0개' 로 조용히 그려진다. 계약 신설은 세그먼트 빌더 범위(상태·그룹·맞춤필드로 수신자 수를 서버가 계산)와 함께 정해야 한다 — A63 후속.

---

### BE-033-EP-08 · 발신자(발신 이메일) 목록 — **심 없음 (미정)**

FS-033-EL-017 이 발신 이메일 목록과 **검증 여부**를 쓴다(미검증은 선택 불가). 프론트는 동기 함수 `listSenderEmails()` 로 픽스처를 읽는다 — **`// TODO(backend)` 주석이 없다.**

확정된 것은 데이터 형태(`SenderEmail` = `id`·`email`·`name`·`verified`)와 **검증 규칙이 클라이언트 검증에 들어 있다**는 사실(`validation.ts:11-14` `senderIsVerified`)뿐이다.

> **§7.6 판정 필수** — `verified` 는 **보안 결정 값**이다. 클라이언트가 픽스처에서 읽은 `verified` 로 발신을 허가하면, 서버가 재확인하지 않는 한 사전등록되지 않은 주소로 발신할 수 있다. 서버가 발신 시점에 재검증해야 한다(EP-03/EP-04 의 422 `SENDER_NOT_VERIFIED`).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(전량 반환) | 401 → 전역 인터셉터가 재인증. 화면은 FS-033-EL-010 | **403** 컬렉션 | N/A — 0건이면 200 빈 배열 → FS-033-EL-009 | N/A 읽기 전용 | N/A — 상태 없는 조회 | 429 분당 120 → FS-033-EL-010 | 500 + `traceId` → FS-033-EL-010 | 5초 → 504 → FS-033-EL-010 |
| EP-02 상세 | id 형식 → 400 | 401 → 전역 인터셉터 | 읽기 권한 없음 → **404 은닉** | **404 `NEWSLETTER_NOT_FOUND`** — 프론트가 '찾을 수 없음'(재시도 없음) 갈래로 분기. **status 404 필수** | N/A | N/A | 429 | 500 + `traceId` → '불러오지 못했습니다' + 다시 시도 | 5초 → 504 → 같은 갈래 |
| EP-03 등록 | `title`·`senderId`·`segmentIds`·`body`·`scheduledAt` → `error.fields` → FS-033-EL-033 인라인 | 401 → 전역 인터셉터. **작성 중 본문이 사라진다**(FS-033 §7 #10) | **403** 컬렉션 쓰기 → FS-033-EL-015 배너 | N/A 생성 | N/A — 생성. **`Idempotency-Key` 재사용 시 최초 응답 재생**(§7.10) | **422** `SENDER_NOT_VERIFIED` · `SEGMENT_NOT_FOUND` · `SCHEDULE_IN_PAST` · `INVALID_SEND_STATUS` | 429 분당 30 | 500 + `traceId` → FS-033-EL-015(오류 코드 표시) | 5초 → 504 → FS-033-EL-015 |
| EP-04 수정 | 위 + id → `error.fields` | 401 → 전역 인터셉터 | `operator` → **403** / 읽기 없음 → **404** | 404 `NEWSLETTER_NOT_FOUND` — 다른 관리자가 지운 회차 | **409/412** `If-Match` 불일치 → FS-033-EL-030 충돌 다이얼로그(입력 보존·이동 없음) | **422 `ISSUE_NOT_EDITABLE`**(현재 상태가 `sending`\|`sent`\|`canceled`) · **422 `INVALID_STATUS_TRANSITION`**(§7.1) · `SENDER_NOT_VERIFIED` · `SEGMENT_NOT_FOUND` · `SCHEDULE_IN_PAST` | 429 분당 30 | 500 + `traceId` → FS-033-EL-015 | 5초 → 504 → FS-033-EL-015 |
| EP-05 삭제 | id 형식 → 400 | 401 → 다이얼로그 안 배너 | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id. **이미 삭제 → 204(멱등, §7.2)** | N/A — 멱등 삭제로 확정 | **422 `ISSUE_NOT_DELETABLE`**(발송중 회차) | 429 분당 60(일괄이 항목당 요청) | 500 → 단건은 다이얼로그 배너 / 일괄은 부분 실패 건수 | 5초 → 504 → 같은 자리 |
| EP-06 발송 실행 | **미정 — 심 없음(호출부 0건)** | 미정 | 미정 | 미정 | 미정 — **§7.12 는 멱등키를 요구한다** | 미정 — 초안·예약만 발송 가능해야 한다(§7.1) | 미정 | 미정 | 미정 |
| EP-07 세그먼트 | **미정 — 심 없음** | 미정 — 현재 동기 픽스처라 **401 경로 자체가 없다** | 미정 | 미정 | N/A 읽기 전용 | N/A | 미정 | 미정 — **현재 실패 경로 없음**(§7.6) | 미정 |
| EP-08 발신자 | **미정 — 심 없음** | 미정 — 현재 동기 픽스처 | 미정 | 미정 | N/A 읽기 전용 | N/A | 미정 | 미정 — **현재 실패 경로 없음**(§7.6) | 미정 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `newsletterAdapter.fetchAll(signal)` | `GET /api/marketing/newsletters` | EP-01 | `NewsletterIssue[]` | O (**쿼리 파라미터 없음** — 전량) |
| `newsletterAdapter.fetchOne(id, signal)` | `GET /api/marketing/newsletters/:id` | EP-02 | `NewsletterIssue`(404 → `HttpError(404)`) | O |
| `newsletterAdapter.create(input, signal)` | `POST /api/marketing/newsletters` | EP-03 | `void`(201) | O |
| `newsletterAdapter.update(id, input, signal)` | `PUT /api/marketing/newsletters/:id` | EP-04 | `void` | O (**409 유령 저장 방지 포함**) |
| `newsletterAdapter.remove(id, signal)` | `DELETE /api/marketing/newsletters/:id` | EP-05 | `void`(204) | △ — 픽스처는 이미 삭제 시 **409**, 계약은 **204 멱등**(§7.2 · §7.11) |
| — (호출부 0건) | `POST /api/marketing/newsletters/:id/send` | EP-06 | — | **✗ 심만 있고 호출부가 없다** |
| `listSegments()` (`_shared/store.ts`, 동기) | **없음** | EP-07 | `Segment[]` | **✗ 심 없음(미정)** |
| `listSenderEmails()` (`_shared/store.ts`, 동기) | **없음** | EP-08 | `SenderEmail[]` | **✗ 심 없음(미정)** |
| `listSendableTemplates('email')` (`_shared/store.ts`, 동기) | **없음**(정본은 BE-036 EP-01) | — | `MessageTemplate[]` | **✗ 심 없음** — 템플릿 화면 소유 |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` + `Idempotency-Key`(등록·수정) + `If-Match`(수정) 헤더 · `fetchOne` 은 404 를 **`HttpError(404)` 로 유지**(status 를 잃으면 EXC-12 분기가 무너진다) · 5xx 는 `traceId` 를 `HttpError.reference` 로 옮긴다 · 422 필드 위반은 `HttpError.violations` 로 옮긴다(폼이 인라인 에러로 꽂는다).

## 7. 핵심 판정

### 7.1 발송 상태 머신 — 서버가 정본으로 강제한다 【핵심 판정】

**프론트는 상태 머신을 강제하지 않는다.** 확인된 사실:

- `_shared/messaging.ts:362` 에 `isEditableSend(status)`(초안·예약만 편집)가 있으나 **UI 어디에서도 호출되지 않는다** — `messaging.test.ts` 에서만 쓰인다(앱 전체 grep 확인).
- `NewsletterListPage.tsx:181` 의 `onEdit` 은 상태를 보지 않고 모든 행을 `/:id/edit` 로 보낸다. `CrudTable` 의 행 클릭·`RowActions` 연필도 같은 콜백이다.
- `NewsletterFormPage.tsx:128` 의 `toValues` 는 `draft`·`scheduled` 가 아닌 상태를 **조용히 `'draft'` 로 바꾼다**. 폼의 발송 방식 select 에는 그 상태를 표현할 선택지가 없다(`draft`\|`scheduled` 2択).

**결과**: 발송완료 회차를 열어 아무것도 바꾸지 않고 저장만 해도 **`status: 'sent'` → `status: 'draft'`** 입력이 서버로 간다. 회차가 발송된 적 없는 것처럼 뒤집히고, `stats`(오픈율·클릭율)만 남아 목록에서 '초안인데 통계가 있는' 모순 상태가 된다.

**판정**: 서버가 **전이의 정본**이다. `PUT /api/marketing/newsletters/:id`(EP-04)는 요청 바디의 `status` 를 **신뢰하지 않는다**:

1. **현재 저장된 상태**가 `sending`·`sent`·`canceled` 면 바디와 무관하게 **422 `ISSUE_NOT_EDITABLE`** 로 거절한다. (프론트 잠금은 없으므로 서버가 유일한 방어선이다.)
2. 현재 상태가 `draft`·`scheduled` 일 때만 편집을 받고, 허용 전이는 **`draft ↔ scheduled`** 뿐이다. 그 외 값이 오면 **422 `INVALID_STATUS_TRANSITION`**.
3. `sending`·`sent`·`canceled` 로의 전이는 **관리자 입력이 아니라 발송 파이프라인·스케줄러만** 만든다(EP-06 · 취소 경로). 클라이언트가 이 값들을 보내면 거절한다 — **422 `INVALID_SEND_STATUS`**(EP-03 등록도 동일: 등록 시 `sent` 로 시작할 수 없다).
4. `stats` 는 입력에 없으므로 수정이 통계를 초기화할 수 없다 — 서버가 보존한다.

프론트 수정 이관: A11 change_request — 행 클릭·'수정'을 `isEditableSend` 로 가두고, 비편집 회차는 읽기 전용 상세로 보낸다(FS-033 §7 #1). **그 수정이 들어와도 이 서버 판정은 그대로 남는다** — 프론트 게이팅은 UX 이고 서버 검사가 정본이다.

### 7.2 삭제 멱등성 — 계약은 204, 프론트 픽스처는 409

프론트 픽스처(`createCrudAdapter.remove`)는 없는 id 에 **409 '이미 삭제된 항목입니다.'** 를 던진다. 이는 픽스처가 '유령 삭제'(없는 id 를 조용히 성공 처리)를 막으려고 도입한 안전장치다.

**판정**: 실제 서버는 **이미 삭제된 id 에 204(멱등)** 를 반환한다. 근거 — 일괄 삭제(FS-033-EL-012)가 `settleAll` 로 병렬 DELETE 를 쏘는데, 다른 관리자가 방금 지운 건이 409 로 떨어지면 **'N건 중 M건 실패'** 로 집계되어 운영자가 아무것도 잘못하지 않았는데 실패를 본다. 존재한 적 없는 id 만 404 로 가른다. 픽스처의 409 는 백엔드 연결 시 제거한다 — §7.11 이관.

### 7.3 회차번호 채번 — 서버 트랜잭션 안에서

`nextIssueNo(existing)`(`types.ts:61`)는 **클라이언트가 들고 있는 목록의 최대 회차 + 1** 이다. 두 관리자가 동시에 등록하면 같은 번호가 나온다.

**판정**: `issueNo` 는 **서버가 등록 트랜잭션 안에서 채번**한다(시퀀스 또는 `SELECT MAX(...) FOR UPDATE`). 클라이언트 입력에 `issueNo` 가 없는 것(`NewsletterIssueInput` 이 이를 `Omit`)은 이미 이 계약을 표현하고 있다 — 서버가 그 계약을 실제로 지키면 된다. **유니크 제약**을 걸어 중복 채번을 DB 레벨에서도 막는다.

### 7.4 구독자 수 — 중복 제거는 서버 몫

`totalRecipients()`(`_shared/messaging.ts:411`)는 선택 세그먼트의 `recipientCount` 를 **단순 합산**한다. 그런데 화면 문구는 '중복 수신자는 발송 시 1회로 합산됩니다.'(`SegmentPicker.tsx:143`) 라고 약속한다 — **두 세그먼트에 모두 속한 사람은 프론트 합계에서 두 번 세어진다.**

**판정**: 저장 시 `recipientCount` 는 **서버가 세그먼트 교집합을 제거해 계산**한다(입력에 없으므로 계약상 이미 서버 몫이다). 프론트 합계는 **선택 중 보여주는 추정치**이며, 저장 후 목록의 구독자수(서버 계산값)와 다를 수 있다. 이 차이가 운영자를 혼란시키면 세그먼트 선택 시 서버에 실시간 카운트를 묻는 계약(EP-07 확장)을 신설한다 — §7.6 과 함께 결정.

### 7.5 목록 페이징·서버 검색 — 계약을 신설해야 한다

EP-01 은 **쿼리 파라미터가 없고 전량을 반환**한다. 프론트가 받아서 거른다(`filterNewsletters`·`searchNewsletters`). 회차는 발행할수록 누적되며 삭제되지 않는다.

**판정**: 현재 어댑터 시그니처(`fetchAll(signal)`)는 페이징을 **표현할 수 없다**. 백엔드 연결 시 다음을 함께 바꾼다:
- `GET /api/marketing/newsletters?status=&keyword=&page=&size=` — `status` 는 `all`\|5상태, `keyword` 는 제목 부분 일치(0–100자), `size` 기본 10 · 상한 100
- 응답을 `{ items, total }` 봉투로 바꾼다
- 프론트는 `useListState`(URL 직렬화 · page clamp · 선택 해제)를 소비하도록 재구조화한다 — FS-033 §7 #3

**이 변경 전까지 이 화면은 quality-bar IA-04(P0)·IA-13(P0)·ERP-15 를 충족할 수 없다**(NFR-033 §2 참조). 프론트·백엔드 동시 변경이라 A11·A63 공동 이관이다.

### 7.6 발신자 검증·세그먼트 — 클라이언트 값을 신뢰하지 않는다 【보안 판정】

`validation.ts:11-14` 의 `senderIsVerified(id)` 는 **브라우저 안 픽스처**(`listSenderEmails()`)에서 `verified` 를 읽어 판정한다. `NewsletterFormPage.tsx:283` 은 미검증 발신자 옵션을 `disabled` 로 잠근다.

**둘 다 클라이언트 측 UX 다.** 발신번호/발신자 사전등록제(전기통신사업법 제84조의2)는 **등록·검증된 주체로만 발신**하도록 요구하는데, 클라이언트 판정은 다음으로 우회된다: `disabled` 옵션을 DOM 에서 풀거나, `senderId` 를 임의 값으로 바꿔 POST 하거나, 픽스처가 서버 응답으로 바뀐 뒤 그 응답을 조작하거나.

**판정**: 서버가 **등록·수정 시점에 발신자 레지스트리를 재조회해 `verified` 를 재확인**한다. 미검증·미등록·타 테넌트 소유 발신자면 **422 `SENDER_NOT_VERIFIED`**. 세그먼트도 같다 — 존재하지 않거나 이 관리자가 접근할 수 없는 세그먼트 id 가 오면 **422 `SEGMENT_NOT_FOUND`**(존재 여부를 알려주지 않도록 문구는 동일하게 둔다). 클라이언트 검증은 **오타 예방**이고 서버 검사가 **정본**이다.

**부가 판정 — 재구조화 필요**: 세그먼트·발신자는 지금 **동기 함수**로 읽혀 로딩·실패·취소 경로가 없다(EP-07/EP-08 '심 없음'). 백엔드 연결은 **`_shared/store.ts` 호출부의 비동기 재구조화**를 수반한다 — 어댑터 본문만 바꾸면 되는 다른 연동과 성격이 다르다. 이 작업을 계획에 반드시 포함한다.

### 7.7 일괄 삭제 — 전용 엔드포인트를 만들지 않는다

프론트가 `settleAll` 로 단건 DELETE(EP-05)를 병렬 호출하고 부분 실패를 건수로 집계한다(FS-033-EL-012). 단건이 멱등이므로(§7.2) 부분 실패 후 재시도가 안전하다. BE-010 §7.1 과 같은 근거로 전용 벌크 계약을 두지 않는다.

**단, 한계를 기록한다**: 실패한 **id 를 돌려주지 않아** 재시도가 성공분까지 재실행한다(FS-033 §7 #5, quality-bar EXC-10). 선택 건수 상한이 없어 수백 건 선택 시 수백 개 요청이 동시에 나간다(EXC-18). 레이트리밋(분당 60)이 그 앞에서 429 를 뱉으면 실패 건수만 늘어난다 — 프론트 동시성 제한이 필요하다. A11 이관.

### 7.8 목록 응답이 본문을 싣는다 — 축소 검토

`NewsletterIssue` 는 목록 행과 상세가 같은 타입이라 목록 응답이 `body`(최대 5000자) × 전 회차를 싣는다. 그런데 목록 표는 본문을 **렌더하지 않는다**(회차·제목·구독자수·상태·오픈율·클릭율뿐). 전량 반환(§7.5)과 겹치면 응답이 회차 수 × 5KB 로 자란다.

**판정**: §7.5 의 페이징 계약을 신설할 때 목록 응답에서 `body` 를 뺀 `NewsletterIssueSummary` 를 함께 도입한다. **지금 타입을 가르지 않는다** — 프론트가 목록 데이터로 상세를 채우지는 않으므로(수정 진입 시 `fetchOne` 을 따로 부른다) 안전하지만, 어댑터 타입 변경이 필요해 §7.5 와 한 배치로 묶는다.

### 7.9 동시 수정 — `If-Match` 로 충돌을 올린다

프론트는 **409/412 를 받을 준비가 되어 있다** — `useCrudForm` 이 `isConflict` 로 잡아 전용 다이얼로그를 띄우고 입력을 보존한다(FS-033-EL-030). BE-010 §7.4(마지막 쓰기 승리)와 **다른 판정**을 내리는 이유: 그때는 해소 UI 가 없었지만 지금은 있다.

**판정**: EP-02 가 `ETag`(또는 `updatedAt`)를 내려주고, EP-04 가 `If-Match` 를 요구한다. 불일치 → **412 `PRECONDITION_FAILED`**(또는 409 — 프론트는 둘을 같은 UX 로 수렴시킨다). 헤더가 아예 없는 요청은 **428 이 아니라 412** 로 거절해 낡은 클라이언트가 조용히 덮어쓰지 못하게 한다.

### 7.10 등록 멱등키 — 중복 회차를 막는다

프론트는 제출 **시도** 단위로 `Idempotency-Key` 를 만들고(mutationFn 밖 ref), 성공하면 버린다(`useCrudForm.ts:112-117`). 동기 제출 락도 있다.

**판정**: `POST /api/marketing/newsletters`(EP-03)는 `Idempotency-Key` 를 **필수**로 받는다. 같은 키의 재요청은 **최초 응답을 재생**한다(새 회차를 만들지 않는다). 키 보존 기간 24시간. 근거 — 이중 등록은 회차번호를 태우고(§7.3) 운영자가 지워야 하며, quality-bar EXC-08 이 '생성' 작업에 이를 명시적으로 요구한다.

### 7.11 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **발송 상태 머신이 UI 에 강제되지 않는다** — `isEditableSend` 미호출, `toValues` 가 `sent`/`sending`/`canceled` 를 `draft` 로 강등(§7.1) | A11 change_request · A63 |
| 2 | 프론트 픽스처 `remove` 의 409(이미 삭제)를 백엔드 연결 시 204 멱등으로 교체(§7.2) | A63 |
| 3 | 목록 페이징·서버 검색 계약 신설 + `useListState` 재구조화(§7.5 · §7.8) — IA-04/IA-13 P0 해소의 전제 | A11 · A63 |
| 4 | **세그먼트·발신자 엔드포인트 심 없음** — 동기 호출부의 비동기 재구조화가 선행돼야 한다(§7.6 · EP-07 · EP-08) | A63 · A11 |
| 5 | **발송 실행 계약 미정** — 심만 있고 호출부 0건. 확정 시 멱등키 필수(§7.12 · EP-06) | A01 · A63 |
| 6 | 일괄 삭제가 실패 id 를 돌려주지 않고 선택 상한·동시성 제한이 없다(§7.7) | A11 |
| 7 | 401 감지 시 작성 중 폼이 사라진다 · 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 | A40 · A63 |
| 8 | 쓰기 권한 게이팅(`useRouteWritePermissions`)이 이 화면(및 앱 전역)에 배선돼 있지 않다 — 서버 403 이 유일 방어선(§2) | A11 · A40 |
| 9 | 구독자 수 중복 제거 차이(프론트 추정 vs 서버 계산)의 표기 방식(§7.4) | A11 · A63 |

### 7.12 본문 저장형 XSS — 서버가 저장 시 정제한다 【보안 판정】

뉴스레터 본문(`body`)은 **관리자 입력**이며 **구독자에게 이메일로 발송**된다 — 이 앱에서 관리자 입력이 외부인에게 도달하는 가장 넓은 경로다(회차당 수천 통).

관리자 화면은 안전하다: `EmailPreview` 가 `pre-wrap` 텍스트 노드로만 렌더하고(`dangerouslySetInnerHTML` 0건), 목록도 본문을 그리지 않는다. **위험은 발송 파이프라인에 있다** — HTML 메일로 조립하면 본문이 마크업으로 해석된다.

**판정** — 서버가 **저장 시점**에 정제하고, 계약은 '저장된 본문에 실행 가능한 마크업이 없다'는 관측 동작만 정한다:

1. **HTML 메일 조립 시**: 허용 태그 화이트리스트(`p` `br` `strong` `em` `ul` `ol` `li` `a` `img` 등) 밖의 마크업, `<script>`/`<style>`/`<iframe>`, 이벤트 핸들러 속성(`on*`), `javascript:`·`data:`(이미지 제외) 스킴을 제거한다. `a[href]` 는 **http/https 만** 허용한다.
2. **평문 메일로만 보낼 계약이면** 본문을 그대로 두되 **텍스트 파트에만** 싣고 HTML 파트를 만들지 않는다 — 어느 쪽인지 계약에 못 박는다. **현재 미정**(발송 파이프라인이 없다).
3. `title`(메일 제목)도 같이 정제한다 — 헤더 인젝션(CR/LF 삽입으로 헤더를 추가하는 공격)을 막기 위해 **개행 문자를 제거**한다. 제목은 메일 헤더로 나가므로 XSS 보다 헤더 인젝션이 먼저다.

**치환변수 관련 판정**(`#{이름}` 등 — FS-033-EL-021):

4. **화이트리스트**: 서버는 **알려진 토큰만** 치환한다(`MESSAGE_VARIABLES` 정본 5종). 임의 `#{...}` 를 내부 필드 조회로 해석하면 관리자가 `#{password_hash}` 같은 토큰으로 **템플릿 인젝션**을 시도할 수 있다. 모르는 토큰은 **치환하지 않고 거절**한다 — 아래 5.
5. **미해석 변수 발송 금지**: `applyVariableSamples`(`_shared/messaging.ts:131`)는 **모르는 변수를 그대로 둔다** — 미리보기 전용이라 그 자리에선 안전하지만, 발송 시 같은 규칙이면 **구독자가 `#{쿠폰명}` 을 날것으로 받는다**. 서버는 발송 전 본문을 스캔해 **해석되지 않는 `#{...}` 가 하나라도 있으면 발송을 거절**한다(등록·수정 시 422 `UNKNOWN_VARIABLE`, 발송 시 사전 검증). 오타(`#{이 름}`)가 수천 통에 그대로 나가는 것을 막는 유일한 지점이다.
6. **치환값 자체를 정제한다**: 수신자 이름 등 치환값은 **다른 사용자(회원)가 입력한 데이터**다. 회원이 이름을 `<script>...` 로 등록해 두면 치환이 그것을 HTML 메일에 주입한다 — **저장형 XSS 의 2차 경로**다. 치환은 **HTML 이스케이프 후** 삽입한다.
7. **발송 실행에 멱등키 필수**: EP-06 계약 확정 시 `Idempotency-Key` 를 필수로 둔다(§4 EP-06). 재시도가 수천 통을 두 번 보내는 것이 이 엔드포인트의 실패 양상이며, quality-bar EXC-08 이 '발송' 을 명시적으로 지목한다.

## 8. 자기 점검

- [x] FS-033 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 5개(EP-01~EP-05) + **심 없음 3개(EP-06 발송 · EP-07 세그먼트 · EP-08 발신자)를 '미정'으로 명시**
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A`·`미정` 에 사유 (8행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 상속으로 선언, 재정의 안 함
- [x] 멱등성 판정 — 조회 GET / 수정 PUT+If-Match / 삭제 **204 멱등으로 확정**(픽스처 409 와의 차이 기록) / 등록 비멱등 + `Idempotency-Key`
- [x] **보안 판정 3건** — 발송 상태 머신 서버 강제(§7.1) · 발신자 검증 클라이언트 불신(§7.6) · 본문 XSS + 변수 화이트리스트 + 미해석 변수 + 헤더 인젝션(§7.12)
- [x] **심에 없는 엔드포인트를 지어내지 않았다** — `/send` 는 심 문구만 인용하고 계약을 확정하지 않았으며, 세그먼트·발신자는 '심 없음(미정)' 으로 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
