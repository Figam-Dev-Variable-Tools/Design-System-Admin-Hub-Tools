---
id: BE-036
title: "발송 템플릿 백엔드 기능 명세"
functionalSpec: FS-036
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-036. 발송 템플릿 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-036 발송 템플릿 (`/marketing/templates` · `/new` · `/:id/edit`) |
| 범위 | 템플릿 목록/상세/등록/수정/삭제(단건·일괄), 채널별 필드 요건, 알림톡 승인 상태의 **서버 정본화** |
| 범위 밖 | **카카오 심사 제출**(§4 EP-05 — 심은 있으나 호출부 0건) · 실제 발송(SMS/이메일/뉴스레터 화면 소유) · 세그먼트/발신자 레지스트리(BE-033 EP-07/EP-08 — 심 없음) · 고객 수신 렌더(§7.2 XSS 판정만) · 일괄 전용 엔드포인트(§7.9) |
| 프론트 어댑터 | `apps/admin/src/pages/marketing/templates/data-source.ts` (**`createStoreAdapter`**, scope `marketing-templates`) → `apps/admin/src/pages/marketing/_shared/store.ts` |
| 도메인 타입 | **`apps/admin/src/pages/marketing/_shared/messaging.ts`** — 이 화면에는 `types.ts` 가 없다. SMS·이메일·뉴스레터 발송 화면이 같은 템플릿을 삽입해 쓰므로 타입·규칙이 공용 잎 모듈에 있다 |
| 검증 정본 | `apps/admin/src/pages/marketing/templates/validation.ts` (`templateSchema`) — **서버가 같은 규칙을 재검증한다**(§7.3) |
| 경로 주의 | 라우트는 `/marketing/templates` 인데 **심의 API 경로는 `/api/marketing/message-templates`** 다(`data-source.ts:18`). 심 문구를 그대로 따른다 — 라우트에 맞춰 고쳐 쓰지 않는다 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 발송 템플릿 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일. **5xx·예상외 실패는 `traceId`(참조 코드)를 싣는다** — 프론트가 저장 실패 배너에 '오류 코드 <ref>' 로 노출한다(FS-036-EL-014).
- **권한**: `admin` = 전체. `operator` = 조회 계열만, 쓰기(등록·수정·삭제) → 403. 마케팅 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2).
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504. (**프론트에는 타임아웃 상한이 없다** — FS-036 §7 #12.)
- **프론트 역할 분기 없음**(FS-036 §4.1) — 쓰기 버튼과 **승인상태 select 가 권한과 무관하게 렌더되므로 권한 강제는 전적으로 서버 책임**이다(§7.1).
- **낙관적 동시성**: 쓰기 요청에 `If-Match`(또는 `updatedAt`)를 실어 보낸다. 불일치 → 409/412 → 프론트 충돌 다이얼로그(FS-036-EL-030). **현재 프론트 어댑터가 409 를 만들지 않아 그 다이얼로그가 죽어 있다** — §7.5.
- **멱등키**: 등록·수정 요청은 제출 **시도** 단위 `Idempotency-Key` 헤더를 싣는다(§7.10).

## 3. 데이터 계약 (`_shared/messaging.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `MessageTemplate`(목록 행 = 상세) | `id` · `name` · `channel`(`MessageChannel`) · `title` · `body` · `approvalStatus`(`ApprovalStatus`) · `rejectReason` · `updatedAt` | 목록과 상세가 **같은 타입** — 목록 응답이 본문까지 싣는다(§7.11) |
| `MessageTemplateInput` | `Omit<MessageTemplate, 'id' \| 'updatedAt'>` = `name`·`channel`·`title`·`body`·**`approvalStatus`**·`rejectReason` | **`approvalStatus` 가 입력에 들어 있다 — 이것이 §7.1 의 뿌리다.** 서버는 이 필드를 신뢰하지 않는다 |
| `MessageChannel` | `'sms'` \| `'email'` \| `'alimtalk'` | `MESSAGE_CHANNEL_OPTIONS` 가 라벨 정본 |
| `ApprovalStatus`(**타입 미export**) | `'draft'` \| `'inspecting'` \| `'approved'` \| `'rejected'` | 카카오 심사 흐름: 등록(초안)→검수중→승인/반려. **알림톡 전용**(`requiresApproval(channel)`) |
| `Segment` · `SenderNumber` · `SenderEmail` | — | 이 화면은 쓰지 않는다 — BE-033 EP-07/EP-08 소유 |

**상수·규칙 정본 (프론트가 강제하는 것 = 서버가 재검증해야 하는 것)**

| 규칙 | 값·함수 | 서버 재검증 |
|---|---|---|
| 템플릿명 길이 | `TEMPLATE_NAME_MAX = 60` | 1–60자 |
| 제목 길이 | `TEMPLATE_TITLE_MAX = 100` | 0–100자. **`usesTitle(channel)`(email·alimtalk)이면 필수, sms 면 `''`** |
| 본문 길이 | `TEMPLATE_BODY_MAX = 2000` | 1–2000자. **문자 수 기준** — 바이트 기준이 아니다(§7.8) |
| 알림톡 변수 상한 | `TEMPLATE_VARIABLE_MAX = 40` · `countVariables(body)` | 알림톡만. 초과 시 거절 |
| 알림톡 변수 전용 본문 금지 | `isVariableOnlyBody(body)` | 알림톡만. 변수를 지운 나머지가 공백이면 거절 |
| 발송 가능 판정 | `isSendableTemplate(channel, status)` — 알림톡은 `approved` 만, 그 외 채널은 항상 true | **§7.1 · §7.4** |
| SMS 바이트 | `byteLengthOf`(EUC-KR: 비ASCII 2byte) · `classifySms(bytes, hasImage)` · `SMS 90byte` / `LMS_MAX_BYTES = 2000` | **프론트는 표시만 하고 저장을 막지 않는다** — §7.8 |
| 치환변수 목록 | `MESSAGE_VARIABLES` 5종 · 문법 `#{...}` | **화이트리스트** — §7.2 |

## 4. 엔드포인트 명세

### BE-036-EP-01 · 템플릿 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-036-EL-001, EL-002, EL-005, EL-007, EL-010 |
| 메서드·경로 | `GET /api/marketing/message-templates` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **현재 없음 — 전량 반환**. 프론트가 필터·검색을 클라이언트에서 수행한다(FS-036-EL-034). §7.8 |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 어댑터 시그니처가 `fetchAll(signal)` 이다.

**응답 200** — `readonly MessageTemplate[]`. **정렬 규칙이 계약에 없다** — 프론트가 받은 순서 그대로 그린다(FS-036 §7 #4). 계약으로 **`updatedAt` 내림차순**을 정한다(최근 수정이 위) — 배열 순서에 의존하는 현재 동작을 명시적 계약으로 대체한다.

**이 응답의 두 번째 소비자**: 발송 화면(SMS·이메일·뉴스레터)이 `listSendableTemplates(channel)` 로 같은 데이터를 읽어 **삽입 후보**를 만든다 — §7.4.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-036-EP-02 · 템플릿 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-036-EL-028, EL-029 |
| 메서드·경로 | `GET /api/marketing/message-templates/:id` |
| 권한 | `admin`, `operator`. 읽기 권한 없음 → 404 은닉 |
| 멱등성 | 멱등(GET) |

**응답 200** — `MessageTemplate` + `ETag`(또는 `updatedAt`)를 헤더에 실어 수정 시 `If-Match` 로 되돌려받는다(§7.5).

> **§7.5 판정 필수 — 404 는 status 404 로 내려야 한다.** 프론트 폼은 `isNotFound(cause)`(= `HttpError.status === 404`)로 '찾을 수 없음'(재시도 없음) 갈래를 고르는데, **현재 저장소가 status 없는 generic `Error` 를 던져 그 갈래가 죽어 있다**(`store.ts:170`). 어댑터 본문을 바꿀 때 반드시 `HttpError(404)` 로 승격한다.

**에러**: 400(id 형식) · 401 · **404 `TEMPLATE_NOT_FOUND`** · 429 · 500 · 504.

---

### BE-036-EP-03 · 템플릿 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-036-EL-015 ~ EL-023, EL-027(등록) |
| 메서드·경로 | `POST /api/marketing/message-templates` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 비멱등이나 `Idempotency-Key` 로 중복 생성을 막는다(§7.10) |
| 레이트리밋 | 분당 30회 |

**바디**(`MessageTemplateInput`): `name`(1–60자) · `channel`(`sms`\|`email`\|`alimtalk`) · `title`(email·alimtalk 필수 1–100자 / sms 는 `''`) · `body`(1–2000자, **서버 정제 §7.2**) · `approvalStatus`(**서버가 무시한다 — §7.1**) · `rejectReason`(**서버가 무시한다 — §7.1**).

**서버가 정하는 것**: `id` · `updatedAt` · **`approvalStatus`** · **`rejectReason`**.

> **§7.1 판정 — 신규 템플릿의 승인 상태는 서버가 정한다.** 알림톡이면 항상 **`'draft'`** 로 시작한다(심사 전). 그 외 채널이면 승인 개념이 없으므로 `'draft'` 고정(또는 null). **클라이언트가 보낸 `approvalStatus` 는 읽지 않는다** — `'approved'` 로 시작하는 템플릿을 만들 수 있으면 심사가 무의미해진다. `rejectReason` 도 항상 `''` 로 시작한다(심사 결과가 아직 없다).

**응답 201** — 생성된 `MessageTemplate`.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `name`·`title`·`body`) · 401 · 403 · 403 CSRF · 409 `TEMPLATE_NAME_DUPLICATED`(§7.7) · 422 `TITLE_REQUIRED_FOR_CHANNEL` · 422 `TOO_MANY_VARIABLES`(알림톡 변수 40 초과) · 422 `VARIABLE_ONLY_BODY`(알림톡) · 422 `UNKNOWN_VARIABLE`(§7.2) · 422 `SMS_BYTE_LIMIT_EXCEEDED`(§7.8) · 429 · 500 · 504.

---

### BE-036-EP-04 · 템플릿 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-036-EL-015 ~ EL-023, EL-024, EL-025, EL-027(수정), EL-030, EL-035 |
| 메서드·경로 | `PUT /api/marketing/message-templates/:id` |
| 권한 | `admin` 만 |
| 멱등성 | 멱등(PUT 전체 치환) + `If-Match` |
| 레이트리밋 | 분당 30회 |

**바디**: `MessageTemplateInput`(EP-03 동일). **헤더**: `If-Match: <etag>` · `Idempotency-Key`.

**서버가 무시하는 것**: `approvalStatus` · `rejectReason` — **§7.1**. 이 둘은 심사 파이프라인(EP-05)과 카카오 웹훅만 바꾼다.

> **§7.1 판정 필수 — 본문·제목이 바뀌면 승인을 무효화한다.** 승인된 알림톡 템플릿의 `body`/`title` 이 바뀌면 서버가 **`approvalStatus` 를 `'draft'` 로 되돌린다**(재심사 필요). 프론트는 이를 강제하지 않는다(FS-036-EL-024) — 승인된 문구와 실제 발송 문구가 갈리는 것을 막는 유일한 지점이다.

> **§7.1 판정 필수 — 채널 변경 시 승인을 재평가한다.** 알림톡 → 다른 채널로 바뀌면 승인 개념이 사라지므로 `approvalStatus` 를 `'draft'` 로 되돌린다(FS-036-EL-035 의 잔여값 문제를 서버에서 닫는다). 다른 채널 → 알림톡이면 `'draft'` 로 시작한다(심사 전).

> **§7.5 판정 필수 — 없는 id 에 조용히 성공하지 않는다.** 프론트 어댑터가 `map` 이라 없는 id 를 통과시키고 성공을 반환한다(유령 저장). 서버는 **404** 로 거절한다.

**응답 200/204**.

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 CSRF · **404 `TEMPLATE_NOT_FOUND`** · **409/412** 동시 수정(§7.5) · 409 `TEMPLATE_NAME_DUPLICATED` · **422 `TEMPLATE_LOCKED`**(심사 중(`inspecting`) 템플릿 편집 — §7.1) · 422 `TITLE_REQUIRED_FOR_CHANNEL` · 422 `TOO_MANY_VARIABLES` · 422 `VARIABLE_ONLY_BODY` · 422 `UNKNOWN_VARIABLE` · 422 `SMS_BYTE_LIMIT_EXCEEDED` · 429 · 500 · 504.

---

### BE-036-EP-05 · 카카오 심사 제출 — **심은 있으나 호출부 0건 (미정)**

`data-source.ts:19` 에 심 주석이 있다:
```
// TODO(backend): … 알림톡은 POST /api/marketing/message-templates/:id/submit 로 카카오 심사에 제출한다(승인 후 발송 가능).
```

**그러나 이 경로를 부르는 코드가 앱 전체에 0건이다** — 폼·목록 어디에도 '심사 제출' 버튼이 없다. 반려 배지가 '재편집 후 다시 제출하세요' 라고 안내하지만 **제출할 방법이 화면에 없다**(FS-036 §7 #3). 따라서 이 문서는 **요청/응답/에러 계약을 확정하지 않는다.** 확정된 사실만 적는다:

- 경로·메서드: `POST /api/marketing/message-templates/:id/submit` (심 문구 그대로)
- 의미: 알림톡 템플릿을 카카오 심사에 제출한다. **승인 후 발송 가능**(`isSendableTemplate` 이 그 계약을 이미 표현한다).
- **미정**: 요청 바디 유무 · 응답(202 비동기 vs 200) · 심사 결과 수신 방식(**웹훅 vs 폴링**) · 재제출 규칙 · 제출 취소 경로 · 심사 소요 시간 표기.

> **§7.1 판정 필수** — 이 엔드포인트가 **`approvalStatus` 를 `draft` → `inspecting` 으로 옮기는 유일한 문**이어야 한다. 그리고 `inspecting` → `approved`/`rejected` 는 **카카오 심사 결과만**(웹훅 수신 또는 폴링) 만든다. 어느 경로로도 관리자 입력이 승인 상태를 정하지 못해야 한다.

---

### BE-036-EP-06 · 발송 화면 삽입 후보 — **별도 엔드포인트를 두지 않는다**

발송 화면(SMS·이메일·뉴스레터)이 `listSendableTemplates(channel)`(`store.ts:213`)로 **채널별 발송 가능 템플릿**을 읽는다 — `sendableTemplatesFor` = 채널 일치 + (알림톡이면 `approved` 만). `TODO(backend)` 심이 없다.

**판정**: **EP-01 로 충분하다.** `sendableTemplatesFor` 는 EP-01 응답에 대한 순수 필터이므로 별도 계약을 만들지 않는다. 다만 **§7.4 의 서버 재검증**은 반드시 필요하다 — 삽입 후보 필터링은 UX 이고, 발송 시점의 발송 가능 여부는 서버가 판정한다.

**단, 재구조화 필요**: 현재 **동기 함수**라 발송 폼에 로딩·실패 경로가 없다(뉴스레터 FS-033-EL-019 와 동일 구조). 백엔드 연결 시 이 호출부들도 비동기 조회로 바꿔야 한다 — BE-033 §7.6 과 같은 작업 묶음이다.

---

### BE-036-EP-07 · 템플릿 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-036-EL-007.9, EL-011, EL-012 |
| 메서드·경로 | `DELETE /api/marketing/message-templates/:id` |
| 권한 | `admin` 만 |
| 멱등성 | **멱등** — 이미 삭제 재요청 → 204 |
| 레이트리밋 | 분당 60회(일괄이 항목당 개별 요청) |

**응답 204**. 일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE(§7.9).

> **§7.6 판정 — 참조 무결성.** 이 템플릿을 삽입해 쓰는 발송 회차가 있어도 프론트는 경고 없이 지운다(FS-036 §7 #2). **판정: 삭제를 막지 않는다.** 근거 — 템플릿 삽입은 **값 복사**다(`applyTemplate` 이 제목·본문을 폼에 채울 뿐 참조를 남기지 않는다 — 뉴스레터 FS-033-EL-019). 이미 만들어진 회차는 템플릿이 사라져도 자기 본문을 갖는다. FAQ 카테고리(BE-010 §7.7)처럼 고아를 만들지 않는다. **단** 심사 중(`inspecting`) 알림톡 템플릿 삭제는 **422 `TEMPLATE_LOCKED`** 로 거절한다 — 외부 심사가 진행 중인 대상을 지우면 웹훅이 고아가 된다.

> **§7.5 판정 필수** — ~~프론트 어댑터가 `filter` 라 없는 id 에 조용히 성공한다(유령 삭제)~~ **F3b 에서 해소**: `createStoreAdapter.remove` 가 `crud.ts:232-234` 에서 없는 id 에 **409 `'이미 삭제된 항목입니다.'`** 를 던진다. **⚠ 서버 계약과 픽스처가 갈린다** — 서버는 존재한 적 없는 id 에 **404**, 이미 삭제된 id 에 **204**(멱등)로 답하기로 돼 있는데 픽스처는 둘 다 409 다. 연동 시 **204 를 받는 경로가 이 화면에 처음 생긴다**(현재 재현 불가). 그때 일괄 삭제의 '실패 건수' 집계가 달라지므로 §7.12 로 이관한다.

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `TEMPLATE_NOT_FOUND`(존재한 적 없는 id) · 422 `TEMPLATE_LOCKED`(심사 중) · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(전량 반환) | 401 → 전역 인터셉터. 화면은 FS-036-EL-010 | **403** 컬렉션 | N/A — 0건이면 200 빈 배열 → FS-036-EL-009 | N/A 읽기 전용 | N/A — 상태 없는 조회 | 429 분당 120 → FS-036-EL-010 | 500 + `traceId` → FS-036-EL-010 | 5초 → 504 → FS-036-EL-010 |
| EP-02 상세 | id 형식 → 400 | 401 → 전역 인터셉터 | 읽기 권한 없음 → **404 은닉** | **404 `TEMPLATE_NOT_FOUND`** — **status 404 필수**. 현재 프론트 저장소는 status 없는 generic Error 를 던져 이 갈래가 죽어 있다(§7.5) | N/A | N/A | 429 | 500 + `traceId` → '불러오지 못했습니다' + 다시 시도 | 5초 → 504 → 같은 갈래 |
| EP-03 등록 | `name`·`title`·`body` → `error.fields` → FS-036-EL-026 인라인 | 401 → 전역 인터셉터. **작성 중 본문이 사라진다**(FS-036 §7 #13) | **403** 컬렉션 쓰기 → FS-036-EL-014 배너 | N/A 생성 | **409 `TEMPLATE_NAME_DUPLICATED`**(§7.7). `Idempotency-Key` 재사용 시 최초 응답 재생(§7.10) | **422** `TITLE_REQUIRED_FOR_CHANNEL` · `TOO_MANY_VARIABLES` · `VARIABLE_ONLY_BODY` · `UNKNOWN_VARIABLE`(§7.2) · `SMS_BYTE_LIMIT_EXCEEDED`(§7.8). **`approvalStatus` 는 거절이 아니라 무시**(§7.1) | 429 분당 30 | 500 + `traceId` → FS-036-EL-014(오류 코드 표시) | 5초 → 504 → FS-036-EL-014 |
| EP-04 수정 | 위 + id → `error.fields` | 401 → 전역 인터셉터 | `operator` → **403** / 읽기 없음 → **404** | **404 `TEMPLATE_NOT_FOUND`** — 다른 관리자가 지운 템플릿. **현재 프론트는 이를 성공으로 처리한다**(유령 저장 · §7.5) | **409/412** `If-Match` 불일치 → FS-036-EL-030 충돌 다이얼로그(**현재 도달 불가** — §7.5) · 409 `TEMPLATE_NAME_DUPLICATED` | **422 `TEMPLATE_LOCKED`**(심사 중 편집) · `TITLE_REQUIRED_FOR_CHANNEL` · `TOO_MANY_VARIABLES` · `VARIABLE_ONLY_BODY` · `UNKNOWN_VARIABLE` · `SMS_BYTE_LIMIT_EXCEEDED`. **본문 변경 시 승인 무효화는 에러가 아니라 서버 부수효과**(§7.1) | 429 분당 30 | 500 + `traceId` → FS-036-EL-014 | 5초 → 504 → FS-036-EL-014 |
| EP-05 심사 제출 | **미정 — 심 없음(호출부 0건)** | 미정 | 미정 | 미정 | 미정 | 미정 — `draft`\|`rejected` 만 제출 가능해야 한다(§7.1) | 미정 | 미정 | 미정 |
| EP-06 삽입 후보 | N/A — **별도 엔드포인트를 두지 않는다**(EP-01 의 순수 필터) | EP-01 과 동일 | EP-01 과 동일 | N/A | N/A 읽기 전용 | N/A — **발송 시점 재검증은 발송 엔드포인트 몫**(§7.4) | EP-01 과 동일 | EP-01 과 동일 | EP-01 과 동일 |
| EP-07 삭제 | id 형식 → 400 | 401 → 다이얼로그 안 배너 | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id. **이미 삭제 → 204(멱등)**. **현재 프론트 픽스처는 없는 id 에 409 를 던진다**(`crud.ts:232-234` — F3b. 유령 삭제는 해소됐으나 **서버의 204 멱등 계약과는 갈린다** · §7.5) | N/A — 멱등 삭제 | **422 `TEMPLATE_LOCKED`**(심사 중 템플릿 삭제 — §7.6) | 429 분당 60(일괄이 항목당 요청) | 500 → 단건은 다이얼로그 배너 / 일괄은 부분 실패 건수 | 5초 → 504 → 같은 자리 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `templateAdapter.fetchAll(signal)` → `listTemplates()` | `GET /api/marketing/message-templates` | EP-01 | `MessageTemplate[]` | O (**쿼리 파라미터 없음** — 전량. 정렬 계약 신설 필요) |
| `templateAdapter.fetchOne(id, signal)` → `getTemplate(id)` | `GET /api/marketing/message-templates/:id` | EP-02 | `MessageTemplate` | **△ — 404 를 status 없는 generic `Error` 로 던진다**(`store.ts:170`) → 폼의 not-found 갈래가 죽어 있다(§7.5) |
| `templateAdapter.create(input, signal)` → `addTemplate(input)` | `POST /api/marketing/message-templates` | EP-03 | `void`(201) | **△ — `approvalStatus`·`rejectReason` 를 클라이언트가 보내고 저장소가 그대로 기록한다**(`store.ts:184-185`) → §7.1 |
| `templateAdapter.update(id, input, signal)` → `updateTemplate(id, input)` | `PUT /api/marketing/message-templates/:id` | EP-04 | `void` | **△ — 없는 id 에 조용히 성공**(`map`, `store.ts:192`) + `approvalStatus` 클라이언트 지정(`:200`) → §7.1 · §7.5 |
| `templateAdapter.remove(id, signal)` → `removeTemplate(id)` | `DELETE /api/marketing/message-templates/:id` | EP-07 | `void`(204) | **△ — 없는 id 에 조용히 성공**(`filter`, `store.ts:209`) → §7.5 |
| — (호출부 0건) | `POST /api/marketing/message-templates/:id/submit` | EP-05 | — | **✗ 심만 있고 호출부가 없다** |
| `listSendableTemplates(channel)` (`_shared/store.ts`, 동기) | **없음** | EP-06(= EP-01 필터) | `MessageTemplate[]` | **✗ 심 없음** — 발송 화면이 호출. 비동기 재구조화 필요 |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` + `Idempotency-Key`(등록·수정) + `If-Match`(수정) 헤더 · **`fetchOne` 은 404 를 `HttpError(404)` 로 승격**(§7.5 — 지금은 generic Error 라 EXC-12 분기가 죽어 있다) · **`update`/`remove` 는 서버 404/409 를 그대로 던진다**(지금은 조용히 성공한다) · 5xx 는 `traceId` 를 `HttpError.reference` 로 · 422 필드 위반은 `HttpError.violations` 로.

> **어댑터 교체 시 주의**: 이 화면은 `createStoreAdapter`(공유 store 위임)를 쓰고 뉴스레터는 `createCrudAdapter`(자체 상태 + 존재 검사)를 쓴다. **두 어댑터의 계약이 갈려 있다** — `createCrudAdapter` 는 없는 id 에 409 를 던지지만 `createStoreAdapter` 는 던지지 않는다(`shared/crud/crud.ts:126-135`). 백엔드 연결 전에 **`createStoreAdapter` 에 같은 존재 검사를 넣거나**, 넣지 않는다면 그 결정을 문서화해야 한다 — §7.12 이관.

## 7. 핵심 판정

### 7.1 알림톡 승인 상태 — 서버·외부 심사가 정본이다. 클라이언트 입력을 신뢰하지 않는다 【보안 판정】

**확인된 사실**:

- `MessageTemplateInput` 에 **`approvalStatus` 가 들어 있다**(`messaging.ts:154` — `Omit<MessageTemplate, 'id' | 'updatedAt'>` 이므로 승인상태·반려사유가 입력에 남는다).
- `TemplateFormPage` 가 알림톡일 때 **승인상태 select 를 렌더하고**(`TemplateFormPage.tsx:202-216`) 초안·검수중·승인·반려 **4종 전부**를 선택지로 준다. 전이 제약이 없다 — 초안에서 '승인' 으로 바로 갈 수 있다.
- `toInput` 이 그 값을 그대로 입력에 싣는다(`TemplateFormPage.tsx:58`).
- 저장소가 그대로 기록한다(`store.ts:184` 등록 · `:200` 수정).
- `isSendableTemplate(channel, status)`(`messaging.ts:92-95`)가 알림톡을 `approved` 일 때만 발송 가능으로 보고, `listSendableTemplates` 가 그 판정으로 **발송 화면의 삽입 후보**를 만든다(`store.ts:213`).
- **쓰기 권한 게이팅도 없다**(FS-036 §4.1) — `useRouteWritePermissions` 미배선이라 권한 축으로도 막히지 않는다.

**결과**: 관리자가 알림톡 템플릿을 만들며 승인상태를 **'승인'** 으로 고르면, 카카오 심사를 **한 번도 거치지 않은** 템플릿이 즉시 발송 화면의 삽입 후보가 된다. `data-source.ts:4` 의 주석이 이 사실을 스스로 인정한다 — '알림톡 템플릿은 사전 승인 대상이라 저장 시 서버가 승인 상태를 관리한다(**여기선 폼이 상태를 직접 지정**)'.

**부수 경로 3개**:
1. **승인 후 본문 변경**(FS-036-EL-024): 승인된 템플릿의 `body` 를 바꿔도 승인이 유지된다 → **심사받은 문구 ≠ 실제 발송 문구**. 심사를 통과한 뒤 내용을 갈아치우는 것은 심사 우회의 가장 쉬운 형태다.
2. **채널 전환 잔여값**(FS-036-EL-035): 알림톡 → SMS 로 바꿔도 `approvalStatus: 'approved'` 가 남는다. 다시 알림톡으로 되돌리면 **심사 없이 승인 상태가 부활한다**.
3. **반려 사유 자작**(FS-036-EL-023): 관리자가 카카오 반려 사유를 직접 쓴다 — 외부 심사 결과를 내부 자유 입력으로 위조한다.

**판정** — 서버가 **승인 상태의 정본**이며 클라이언트 입력을 **읽지 않는다**:

1. **EP-03(등록)·EP-04(수정)는 바디의 `approvalStatus`·`rejectReason` 를 무시한다.** 400/422 로 거절할 필요도 없다 — **읽지 않는 것**이 가장 단순하고 안전하다(거절하면 프론트가 그 필드를 계속 보내면서 에러를 처리해야 한다). 서버는 자기 저장값을 유지한다.
2. **`draft` → `inspecting` 은 EP-05(심사 제출)만** 만든다. `draft`·`rejected` 상태에서만 제출 가능하다.
3. **`inspecting` → `approved`/`rejected` 는 카카오 심사 결과만** 만든다(웹훅 수신 또는 폴링). 어떤 관리자 입력도 이 전이를 만들지 못한다. `rejectReason` 은 **카카오가 준 문자열만** 기록한다.
4. **본문·제목이 바뀌면 승인을 무효화한다**(EP-04) — `approved` 인 알림톡의 `body`/`title` 이 바뀌면 `approvalStatus` 를 `'draft'` 로 되돌리고 재심사를 요구한다. 이것이 위 부수 경로 ①을 닫는다.
5. **채널이 바뀌면 승인을 재평가한다**(EP-04) — 알림톡을 벗어나면 `'draft'`, 알림톡으로 들어오면 `'draft'`. 부수 경로 ②를 닫는다.
6. **심사 중(`inspecting`) 템플릿은 편집·삭제를 거절한다** — **422 `TEMPLATE_LOCKED`**. 외부 심사가 진행 중인 대상이 바뀌면 웹훅 결과가 엉뚱한 내용에 붙는다.
7. **발송 시점 재검증**(§7.4)이 최후 방어선이다 — 어떤 경로로든 `approved` 가 아닌 알림톡 템플릿으로 발송이 시도되면 발송 엔드포인트가 거절한다.

프론트 수정 이관: UI 기획 쪽 변경 요청 — 승인상태 select·반려 사유 입력을 **읽기 전용 표시**로 바꾸고(현재 상태 배지 + 카카오 반려 사유 표시), 그 자리에 **'심사 제출' 버튼**(EP-05 호출)을 둔다. **그 수정이 들어와도 이 서버 판정은 그대로 남는다** — 프론트는 UX 이고 서버가 정본이다.

### 7.2 본문 저장형 XSS · 변수 화이트리스트 · 헤더 인젝션 【보안 판정】

템플릿 본문(`body`)·제목(`title`)은 **관리자 입력**이며, 발송 화면이 이를 복사해 **고객에게 SMS·이메일·알림톡으로 발송**한다. 관리자 화면은 안전하다 — 목록은 `bodyPreview` 로 잘라 텍스트 노드로 그리고(`TemplateListPage.tsx:98`), 폼은 `<textarea>` 값이며, 이 화면에는 미리보기가 없다(`dangerouslySetInnerHTML` 0건). **위험은 발송 파이프라인에 있다.**

**판정** — 서버가 **저장 시점**에 정제하고, 계약은 '저장된 본문에 실행 가능한 마크업이 없다'는 관측 동작만 정한다:

1. **이메일 채널 템플릿**: HTML 메일로 조립되면 본문이 마크업으로 해석된다. 허용 태그 화이트리스트 밖의 마크업, `<script>`/`<style>`/`<iframe>`, 이벤트 핸들러 속성(`on*`), `javascript:`·`data:`(이미지 제외) 스킴을 제거한다. `a[href]` 는 **http/https 만**. BE-033 §7.12 와 같은 판정이다 — 뉴스레터가 이 템플릿을 본문으로 복사해 가므로 **두 곳이 같은 규칙을 써야 한다**.
2. **제목(`title`)**: 이메일 제목은 **메일 헤더**로 나간다 — **개행 문자(CR/LF)를 제거**해 헤더 인젝션(임의 헤더·수신자 추가)을 막는다. XSS 보다 이것이 먼저다.
3. **SMS/알림톡 채널**: 평문이라 마크업 해석이 없다. 단 **URL 은 다르다** — 본문에 넣은 링크가 그대로 고객에게 간다. 스미싱 방지 관점에서 발신 도메인 화이트리스트가 필요한지는 **미정**(발송 파이프라인 부재) — §7.12 이관.

**치환변수 판정** (`#{...}` — FS-036-EL-020):

4. **화이트리스트**: 서버는 **알려진 토큰만** 치환한다(`MESSAGE_VARIABLES` 5종이 정본). 임의 `#{...}` 를 내부 필드 조회로 해석하면 관리자가 `#{password_hash}`·`#{admin_token}` 같은 토큰으로 **템플릿 인젝션**을 시도할 수 있다 — 템플릿은 관리자가 자유 텍스트로 쓰는 필드이므로 이 표면이 실재한다.
5. **미해석 변수 발송 금지**: `applyVariableSamples`(`messaging.ts:131`)는 **모르는 변수를 그대로 둔다**. 미리보기 전용이면 안전하지만 발송 시 같은 규칙이면 **고객이 `#{쿠폰명}` 을 날것으로 받는다**. 서버는 저장 시 본문을 스캔해 화이트리스트에 없는 `#{...}` 가 하나라도 있으면 **422 `UNKNOWN_VARIABLE`** 로 거절한다. **템플릿 단계에서 막는 것이 가장 싸다** — 여기서 통과시키면 이 템플릿을 삽입한 모든 발송 회차가 오염된다. `countVariables`(`messaging.ts:120`)가 이미 `#{[^}]+}` 를 세고 있으므로 같은 정규식으로 미지 토큰을 가려낼 수 있다.
6. **치환값 자체를 정제한다**: 치환값(수신자 이름 등)은 **다른 사용자(회원)가 입력한 데이터**다. 회원이 이름을 `<script>...` 로 등록해 두면 치환이 그것을 HTML 메일에 주입한다 — **저장형 XSS 의 2차 경로**. 치환은 **HTML 이스케이프 후** 삽입한다.
7. **알림톡 변수 상한은 심사 규칙이자 검증 규칙**: `TEMPLATE_VARIABLE_MAX = 40` 초과 시 **422 `TOO_MANY_VARIABLES`**, 변수 전용 본문은 **422 `VARIABLE_ONLY_BODY`**. 프론트가 이미 막지만(`validation.ts:46-64`) 서버가 재검증한다 — 클라이언트 검증은 카카오 반려를 미리 막는 UX 이고 서버가 정본이다.

### 7.3 검증 이중화 — 클라이언트 스키마는 UX, 서버가 정본

`templateSchema`(`validation.ts`)가 채널별 제목 요건·알림톡 심사 규칙을 막는다. 이는 **카카오 반려를 사전 예방하는 UX** 다. 서버는 §3 의 규칙표 전부를 재검증한다 — 클라이언트 검증은 우회 가능하다(DevTools·직접 POST). 문구까지 같을 필요는 없다: 서버 문구는 `error.fields` 로 내려가 프론트가 그 입력의 인라인 에러로 꽂는다(FS-036-EL-026).

### 7.4 발송 가능 판정 — 삽입 후보 필터는 UX, 발송 시점 재검증이 정본 【보안 판정】

`sendableTemplatesFor`(`messaging.ts:184`)가 발송 화면의 드롭다운을 채널 + 승인 여부로 거른다. **이것은 목록 필터일 뿐이다** — 발송 화면은 템플릿의 제목·본문을 **자기 폼에 복사**하고(뉴스레터 `applyTemplate`), 발송은 그 폼 값으로 나간다. 즉 **발송 요청에 템플릿 id 가 실리지 않는다**.

**판정 두 갈래**:
- **현재 구조(값 복사)라면**: 승인 판정은 발송 화면의 **본문 내용**에 대해 이뤄져야 한다 — 알림톡 발송 시 서버가 '이 본문과 정확히 일치하는 승인된 템플릿이 있는가' 를 확인한다. 삽입 후보 필터링만으로는 부족하다: 관리자가 승인 템플릿을 삽입한 뒤 본문을 **고쳐서** 보낼 수 있다.
- **템플릿 id 를 발송 요청에 싣는 구조로 바꾼다면**: 서버가 id 로 승인 상태를 조회해 판정한다(더 단순·안전). 다만 이는 발송 화면의 계약 변경이다.

**어느 쪽이든 §7.1 이 선행 조건이다** — 승인 상태 자체가 클라이언트 손에 있으면 두 갈래 모두 무의미하다. 발송 엔드포인트 계약이 아직 없으므로(BE-033 EP-06 도 '미정') **이 판정은 발송 계약 확정 시 함께 확정한다** — §7.12 이관.

### 7.5 유령 저장·유령 삭제·죽은 404 갈래 — **해소됨 (F3b · 2026-07-17)**. 남은 것은 동시성 토큰

**이 절의 F2 판정 #2('백엔드 연결 전 임시 조치: `createStoreAdapter` 에 존재 검사를 넣어 두 어댑터의 계약을 맞춘다')가 그대로 이행됐다.** 어댑터는 여전히 `createStoreAdapter`(`templates/data-source.ts:20`)지만 그 팩토리가 바뀌었다 — `crud.ts:165-240`:

| 함수 | 현재 (`4b805ad`) | 결과 |
|---|---|---|
| `fetchOne` | **`:192-194` `if (!exists(id)) throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')`** — store 위임보다 **먼저** | 폼의 404 갈래(`isNotFound` — `useCrudForm.ts:143-149`)가 **살아났다**. 삭제된 템플릿에 '찾을 수 없습니다' + '목록으로'만(재시도 권유 없음) — FS-036-EL-029 **pass** |
| `update` | **`:219-221` `if (!exists(id)) throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 항목입니다.')`** | **유령 저장 해소**: 충돌 다이얼로그 + 입력 보존, 성공 토스트·이동 0건 |
| `remove` | **`:232-234` `if (!exists(id)) throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 항목입니다.')`** | **유령 삭제 해소**: 다이얼로그 안 실패 배너. 일괄 삭제에서 없는 id 가 **실패 건수에 포함**된다 |
| 멱등 | `:168` `createIdempotencyLedger()` → `:201,208` `isReplay` · `:202-203,224` 적용 후 기록 | 같은 키의 재시도가 두 벌을 만들지 않는다 — §7.10 |

`:171` 이 그 근거다: `const exists = (id) => spec.list().some((item) => item.id === id)` — **store 의 `map`/`filter` 가 없는 id 를 조용히 지나치는 것을 어댑터가 먼저 막는다.** `_shared/store.ts` 는 **한 줄도 바뀌지 않았고**(`getTemplate` 은 여전히 generic `Error` 를 던지지만 그 경로에 도달하지 않는다), `TemplateFormPage.tsx` 도 **한 줄도 바뀌지 않았다** — `crud.ts:210-218` 주석이 그 설계를 명시한다: '소비 화면들은 `useCrudForm` 의 409 충돌 다이얼로그를 이미 갖고 있다. 어댑터가 409 를 주기만 하면 **화면 코드 0 줄로** 복구 경로가 열린다.'

**`createStoreAdapter` 와 `createCrudAdapter` 의 계약이 다시 합쳐졌다** — `crud.ts:105-107`(404) · `:126-128`(409 update) · `:139-141`(409 remove) 과 대칭이다. **이 화면은 더 이상 '갈린 쪽'이 아니다.** 같은 팩토리를 쓰는 다른 화면(상품·포트폴리오·카테고리·답변템플릿·고객센터 유형)도 함께 해소됐다.

**남은 판정**:
1. **서버 계약(변경 없음)**: EP-02 는 **404 status** 를, EP-04/EP-07 은 없는 id 에 **404** 를, 동시 수정에 **409/412** 를 반환한다. 실 HTTP 어댑터는 이를 `HttpError` 로 승격해 그대로 던진다 — 픽스처가 이미 그 계약을 흉내 내고 있으므로 **화면 동작이 연동 전후로 같다.**
2. **⚠ 이것은 낙관적 동시성이 아니다 — 흐리지 말 것.** 어댑터의 409 는 **'존재 여부' 기반**(`:171` `exists`)이지 `version`/`ETag` 토큰이 아니다. **대상이 삭제됐을 때만 발현되며, 두 관리자가 같은 템플릿을 동시에 편집하면(둘 다 존재) 나중 저장이 조용히 이긴다** — last-write-wins. `MessageTemplate`(`_shared/messaging.ts:137-147`)에 `version` 이 없고 `updatedAt`(`:146`)은 서버가 찍는 표시값일 뿐 토큰으로 쓰이지 않는다. **§7.12 로 남는 것은 이 축뿐이다** — EP-04 의 `If-Match`(`:130`)를 실제로 요구하고 `version`/ETag 를 응답에 실어야 한다.

### 7.6 템플릿 삭제 — 참조 무결성을 강제하지 않는다(단, 심사 중은 잠근다)

EP-07 참조. **삭제를 막지 않는다** — 템플릿 삽입은 값 복사라 이미 만들어진 발송 회차는 자기 본문을 갖는다. 고아가 생기지 않는다(FAQ 카테고리 BE-010 §7.7 과 다른 판정인 이유가 이것이다: 그쪽은 FAQ 가 카테고리 id 를 **참조**한다).

**단 심사 중(`inspecting`) 알림톡 템플릿은 422 `TEMPLATE_LOCKED`** — 외부 심사가 진행 중인 대상을 지우면 웹훅 결과가 고아가 된다.

### 7.7 템플릿명 중복 — 정규화 이름 유니크(409)

발송 화면의 삽입 드롭다운이 템플릿을 **이름으로만 구분한다**(뉴스레터 FS-033-EL-019 의 옵션 라벨이 `template.name`). 동명 템플릿 둘은 운영자가 어느 것을 고르는지 알 수 없게 만든다 — 잘못된 문구가 수천 명에게 나가는 경로다.

**판정**: 앞뒤 공백 제거 + 대소문자 무시로 정규화한 이름의 중복을 **409 `TEMPLATE_NAME_DUPLICATED`** 로 막는다(BE-010 §7.5 와 같은 결). 프론트에는 중복 검사가 없다(FS-036 §7 #5) — 서버가 유일 판정자다. **범위**: 채널별이 아니라 **전역 유니크**로 둔다 — 드롭다운이 채널로 이미 걸러지지만, 관리자가 목록에서 템플릿을 찾을 때는 채널을 넘나든다.

### 7.8 길이 기준 — 문자 수와 바이트 수가 갈려 있다

| 표면 | 기준 | 값 |
|---|---|---|
| 본문 카운터·`maxLength`·스키마 | **문자 수** | 2000 |
| SMS 바이트 힌트(`byteLengthOf`) | **EUC-KR 바이트** | SMS 90 / LMS 2000 |

**한글 SMS 본문 2000자 = 4000byte 로 LMS 한도(2000byte)를 두 배 넘긴다.** 그런데 바이트 힌트는 **표시 전용**이라 저장을 막지 않는다(FS-036-EL-019). 즉 **저장은 되지만 발송할 수 없는 템플릿**을 만들 수 있다.

**판정**: 서버가 **채널별로 다른 기준을 강제**한다:
- `sms`/`alimtalk`: `byteLengthOf(body)` ≤ **2000byte**(LMS 한도) → 초과 시 **422 `SMS_BYTE_LIMIT_EXCEEDED`**. 90byte 초과는 거절이 아니라 **LMS 승격**이다(발송 시 유형 자동 판정).
- `email`: 문자 수 2000자.
- 알림톡의 실제 상한은 카카오 규격을 따른다 — **현재 미정**(심사 규격 확인 필요). §7.12 이관.

프론트 이관: UI 기획 — 본문 카운터를 채널에 따라 문자/바이트로 바꾸고, 한도 초과를 **검증으로 막는다**(지금은 힌트만 뜬다). quality-bar COMP-12 가 'counting 기준(code point vs byte)을 정의하고 서버 강제와 일치시킨다' 를 요구한다.

### 7.9 일괄 삭제 — 전용 엔드포인트를 만들지 않는다

프론트가 `settleAll` 로 단건 DELETE(EP-07)를 병렬 호출하고 부분 실패를 건수로 집계한다(FS-036-EL-012). 단건이 멱등이므로 재시도가 안전하다. BE-010 §7.1 · BE-033 §7.7 과 같은 근거.

**한계 기록**: 실패한 **id 를 돌려주지 않아** 재시도가 성공분까지 재실행한다(FS-036 §7 #11, quality-bar EXC-10). 선택 건수 상한·동시성 제한이 없어 레이트리밋(분당 60)에 걸리면 실패 건수만 늘어난다(EXC-18). UI 기획 이관.

### 7.10 등록·수정 멱등키

프론트가 제출 **시도** 단위로 `Idempotency-Key` 를 만들고 성공하면 버린다(`useCrudForm.ts:118-123` · `:220`). 동기 제출 락도 있다(`:103,202-203`). **F3b 에서 그 키가 어댑터까지 연결됐다** — `:211,228,235`(mutation variables) → `crud.ts:288-289,310-311` → `WriteContext.idempotencyKey`(`crud.ts:41,47-48`) → **`createStoreAdapter` 의 ledger**(`crud.ts:168`)가 `:201`(create) · `:208`(update) · `:229`(remove) 에서 `isReplay` 로 재생 판정한다. **기록은 적용에 성공한 뒤에만** 한다(`:202-203,224,237` · 근거는 `:54-60` 주석). **즉 프론트 배선은 끝났고 남은 것은 실 HTTP 어댑터가 그 값을 헤더로 옮기는 한 줄이며, 그 자리를 `crud.ts:39` 의 `TODO(backend)` 가 표시한다.**

**판정**: `POST`(EP-03)는 `Idempotency-Key` 를 **필수**로 받는다 — 같은 키의 재요청은 **최초 응답을 재생**한다(중복 템플릿을 만들지 않는다). 보존 기간 24시간. `PUT`(EP-04)은 본래 멱등이지만 키를 받아 **재시도 시 승인 무효화 부수효과(§7.1-4)가 두 번 적용되지 않게** 한다 — 이것이 이 화면에서 PUT 에도 키가 필요한 이유다. **서버도 ledger 의 순서 계약을 지킨다**: 키는 **적용에 성공한 뒤에만** 기록한다. 미리 태우면 실패한 첫 시도가 재시도를 영원히 no-op 으로 만들어 사용자에게 '저장했습니다'를 보이고 아무것도 저장하지 않는다(픽스처가 `crud.ts:54-60` 에서 같은 함정을 명시한다).

### 7.11 목록 응답이 본문을 싣는다 — 축소 검토

`MessageTemplate` 은 목록 행과 상세가 같은 타입이라 목록 응답이 `body`(최대 2000자) × 전 템플릿을 싣는다. **그런데 목록이 본문을 실제로 쓴다** — `bodyPreview`(60자 컷)로 미리보기 셀을 그리고(`TemplateListPage.tsx:98`), **검색이 본문을 대상으로 한다**(`searchTemplates` — `messaging.ts:171-181`).

**판정**: **지금은 타입을 가르지 않는다.** 뉴스레터(BE-033 §7.8, 본문을 안 쓴다)와 다른 판정이다 — 여기서 본문을 빼면 목록 검색이 깨진다. §7.8(서버 검색) 계약을 신설할 때 **검색을 서버로 옮기면서** 목록 응답에는 `bodyPreview`(서버가 자른 60자)만 싣는 방식을 함께 검토한다.

### 7.12 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **승인상태·반려사유를 폼이 직접 지정한다** — 카카오 심사 우회. 승인 후 본문 변경·채널 전환 잔여값·반려 사유 자작 3개 부수 경로 포함(§7.1) | **UI 기획 쪽 변경 요청 · 백엔드 명세(최우선)** |
| ~~2~~ | ~~**`createStoreAdapter` 가 존재 검사를 하지 않는다**~~ — **해소 (F3b · 2026-07-17)**. `crud.ts:171` `exists()` → `:192-194` `fetchOne` 404 · `:219-221` `update` 409 · `:232-234` `remove` 409. 유령 저장·유령 삭제·죽은 404 갈래·도달 불가 충돌 다이얼로그가 한꺼번에 닫혔고, **`createCrudAdapter` 와 계약이 다시 합쳐졌다**. 이 팩토리를 쓰는 모든 화면이 함께 해소됐다(화면 코드 0줄 변경 — `crud.ts:210-218`) | — (**닫힘**) |
| 2' | **낙관적 동시성 토큰이 없다** — 위 409 는 '존재 여부' 기반이지 `version`/ETag 가 아니다. **둘 다 존재하는 동시 편집은 last-write-wins** 다. `MessageTemplate`(`_shared/messaging.ts:137-147`)에 `version` 이 없고 `updatedAt`(`:146`)은 표시값일 뿐이다. EP-04 의 `If-Match`(§4)를 실제로 요구하려면 서버가 `version`/ETag 를 응답에 실어야 한다(§7.5 판정 2) | **백엔드 명세 · 프론트 리팩터(`_shared/messaging.ts`·어댑터)** |
| 2'' | **삭제 멱등 계약이 픽스처와 갈린다** — 서버는 이미 삭제된 id 에 **204**(멱등)로 답하기로 돼 있는데 픽스처는 **409** 를 던진다(`crud.ts:232-234`). 연동 시 일괄 삭제의 '실패 건수' 집계가 달라진다(현재 재현 불가 — §7.5 · §4 EP-07) | 백엔드 명세 · UI 기획 |
| 3 | **심사 제출 계약 미정** — 심만 있고 호출부 0건. 심사 결과 수신 방식(웹훅 vs 폴링)이 미정(§4 EP-05) | 아키텍처 · 백엔드 명세 |
| 4 | **발송 시점 승인 재검증 방식 미정** — 값 복사 구조라 발송 요청에 템플릿 id 가 없다. 발송 계약 확정 시 함께 정한다(§7.4) | 백엔드 명세 |
| 5 | 길이 기준이 문자/바이트로 갈려 있고 SMS 본문이 LMS 한도를 넘겨도 저장된다. 알림톡 실제 상한 미정(§7.8) | UI 기획 · 백엔드 명세 |
| 6 | 목록 정렬 계약 신설(`updatedAt` 내림차순) + 페이징·서버 검색(§4 EP-01 · §7.11) | UI 기획 · 백엔드 명세 |
| 7 | 템플릿명 전역 유니크(409) — 프론트에 중복 검사 없음(§7.7) | 백엔드 명세 |
| 8 | 일괄 삭제가 실패 id 를 돌려주지 않고 선택 상한·동시성 제한이 없다(§7.9) | UI 기획 |
| 9 | SMS/알림톡 본문의 URL 스미싱 방지(발신 도메인 화이트리스트) 필요 여부 미정(§7.2-3) | 백엔드 명세 |
| 10 | 401 감지 시 작성 중 폼이 사라진다 · 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 | 프론트 구현 · 백엔드 명세 |
| 11 | 쓰기 권한 게이팅 미배선 — **승인상태 select(`TemplateFormPage.tsx:202-216`)도 권한 축으로 막히지 않는다**(§2 · §7.1). **`useRouteWritePermissions`(`RequirePermission.tsx:45`) 소비처는 F3b 이후 0 → 7곳**(products 3 · settings 4)이 됐으나 **`pages/marketing/**` 소비는 0건**이다 — 훅·선례는 완비돼 있고 이 섹션 배선만 남았다 | UI 기획 · 프론트 구현 |
| 12 | 세그먼트·발신자와 마찬가지로 `listSendableTemplates` 가 **동기 함수**라 발송 폼에 로딩·실패 경로가 없다 — 비동기 재구조화 필요(§4 EP-06 · BE-033 §7.6 과 같은 묶음) | 백엔드 명세 |

## 8. 자기 점검

- [x] FS-036 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 5개(EP-01·EP-02·EP-03·EP-04·EP-07) + **심 없음 2개(EP-05 심사 제출 · EP-06 삽입 후보)를 각각 '미정' · '별도 엔드포인트 없음(EP-01 필터)' 로 명시**
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A`·`미정` 에 사유 (7행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 상속으로 선언, 재정의 안 함
- [x] 멱등성 판정 — 조회 GET / 수정 PUT+If-Match+키(**승인 무효화 부수효과 때문에 키가 필요**) / 삭제 204 멱등 / 등록 비멱등 + `Idempotency-Key`
- [x] **보안 판정 3건** — **승인 상태 서버 정본화(§7.1, 카카오 심사 우회 차단)** · 본문 XSS + 변수 화이트리스트 + 미해석 변수 + 헤더 인젝션(§7.2) · 발송 시점 승인 재검증(§7.4)
- [x] **심에 없는 엔드포인트를 지어내지 않았다** — `/submit` 은 심 문구만 인용하고 계약을 확정하지 않았으며, 삽입 후보는 EP-01 의 필터로 판정했다
- [x] **심 경로를 그대로 썼다** — 라우트는 `/marketing/templates` 이지만 API 는 `/api/marketing/message-templates`(§1 에 명시)
- [x] `types.ts` 부재와 타입 정본 위치(`_shared/messaging.ts`)를 §1·§3 에 명시했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
