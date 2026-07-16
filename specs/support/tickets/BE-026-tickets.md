---
id: BE-026
title: "1:1 문의 백엔드 기능 명세"
functionalSpec: FS-026
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-026. 1:1 문의 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-026 1:1 문의 (`/support/tickets` · `/support/tickets/:id`) |
| 범위 | 문의 목록 조회, 문의 상세 조회, 문의 처리 저장(담당 배정 · 상태 전이 · 답변/내부메모 타임라인 기록) |
| **범위 밖** | **문의 생성** — 문의는 고객 채널(웹·카카오톡·네이버톡톡·전화·이메일)이 접수한다. 관리자가 문의를 만드는 API 는 이 계약에 존재하지 않는다. **문의 삭제** — 문의는 감사 대상 기록이며 관리자 삭제 진입점이 없다. 두 판정의 근거는 §7.7 이며, BE-003 §1 의 '회원 생성 — 고객은 회원가입으로만 유입된다' 와 같은 결이다. **문의 유형 CRUD** — BE-027 소관(이 화면은 소비자, §7.4). **답변 템플릿 CRUD** — BE-028 소관(이 화면은 소비자, §7.4). **고객 노출 렌더** — §7.1 XSS 판정만 다룬다 |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/support/tickets/data-source.ts` (`ticketAdapter` — **손조립 `CrudAdapter`**. 팩토리를 쓰지 않지만 F3b 이후 `exists()` 가드로 `createCrudAdapter` 와 같은 404/409 계약을 자기 자리에서 갖는다 — §7.5) |
| 판정 기준일 | **2026-07-17 · HEAD = `4b805ad`** (F3a·F3b·통합 머지 후). 이전 판정은 F2(`3cd3078`) 기준이었다 — §7.5 · §7.11 이 그 사이 바뀐 프론트 사실을 반영해 갱신됐다 |
| 도메인 타입 | `apps/admin/src/pages/support/_shared/domain.ts` — **이 화면에 `types.ts` 가 없다.** 티켓 도메인 타입·순수 규칙을 세 고객센터 화면이 공유하는 잎 모듈에 모았다 |
| 검증 정본 | **zod 스키마가 없다.** 이 화면은 `useCrudForm`+zod 를 쓰지 않는다 — 검증 정본은 `_shared/domain.ts` 의 순수 규칙(`canSetStatus` · `statusRequiresAssignee` · `allowedNextStatuses` · `TICKET_REPLY_MAX`)과 `tickets/process.ts`(`assigneeError`)다 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-010 §1 과 동일 선언). 아래는 1:1 문의 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세) + **처리 저장**(EP-03) — 1:1 문의 응대는 운영자의 본업이므로 BE-010(콘텐츠)과 달리 쓰기를 연다(§7.8). 고객센터 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / **개별 문의 404 은닉**(§7.6).
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-026 §4.1) — 권한 강제는 서버 책임. 프론트에 쓰기 게이팅이 배선돼 있지 않다(FS-026 §7 #29)는 사실이 이 원칙을 바꾸지 않는다.

## 3. 데이터 계약 (`_shared/domain.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Ticket` | `id` · `ticketNo` · `title` · `categoryId` · `categoryLabel`(서버 조인·비정규화) · `channel` · `priority` · `status` · `assignee`(미배정이면 `''`) · `customerName` · `contact` · `receivedAt`(ISO) · `body` · `timeline` | 목록·상세가 **같은 타입**이다 — 목록도 `body`·`timeline` 을 받는다(§7.9) |
| `TicketEvent` | `id` · `at`(ISO) · `author` · `kind` · `text` | append-only. `kind` = `received`\|`assign`\|`note`\|`reply`\|`status` |
| `TicketInput` | `Omit<Ticket, 'id' \| 'categoryLabel'>` | 저장 입력. **라벨은 서버가 조인하므로 제외.** 불변 필드(`ticketNo`·`receivedAt`·`body`·`customerName`·`contact`·`channel`·`priority`)까지 포함한 **전체 치환**이다(§7.9) |
| `TicketStatus` | `received` \| `assigned` \| `in_progress` \| `answered` \| `closed` | 책임 이관 흐름 |
| `TicketChannel` | `web` \| `kakao` \| `naver` \| `phone` \| `email` | 접수 후 불변 |
| `TicketPriority` | `urgent` \| `high` \| `normal` \| `low` | SLA 목표시간의 입력 |
| 상수 | `TICKET_REPLY_MAX = 1000` | 답변·메모 본문 상한 |

**상태 전이 규칙 (`STATUS_FLOW` — 서버가 정본)**

| 현재 | 허용되는 다음 상태 | 비고 |
|---|---|---|
| `received` | `assigned` · `closed` | |
| `assigned` | `in_progress` · `closed` | |
| `in_progress` | `answered` · `closed` | |
| `answered` | `closed` · `in_progress` | 재오픈 허용 |
| `closed` | **없음** | 종착 — 어떤 상태로도 나가지 못한다 |

- 현재 상태 → 자기 자신은 언제나 허용(변경 없음도 유효한 저장) — `canTransition(from, to)` 는 `from === to` 를 true 로 본다.
- **담당 요건**: `in_progress`·`answered` 로 가려면 `assignee.trim() !== ''` 이어야 한다(`statusRequiresAssignee`).
- 최종 판정 `canSetStatus(from, to, assignee)` = 전이 허용 **AND** 담당 요건 충족.

**SLA (서버가 파생을 내려주지 않는다 — 프론트 순수 계산)**: 목표시간은 우선순위 환산(`urgent` 1h · `high` 4h · `normal` 24h · `low` 72h), 마감 = `receivedAt + 목표시간`, 남은 시간이 목표창의 25% 이하면 '임박', 0 이하면 '초과', `answered`/`closed` 면 '응답완료'. **이 계산은 전적으로 클라이언트에 있다** — 서버 계약에 SLA 필드가 없다(§7.10).

## 4. 엔드포인트 명세

### BE-026-EP-01 · 문의 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-026-EL-006, EL-007, EL-008, EL-008.1~.12, EL-009, EL-010, EL-011, EL-012 |
| 메서드·경로 | `GET /api/support/tickets` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.9) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 필터(상태·채널·우선순위·유형)·검색·정렬을 **전부 클라이언트에서** 수행하므로(FS-026-EL-006 · `filterTickets`/`searchTickets`/`sortTickets`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly Ticket[]`. **접수일시 내림차순 정렬**(동시각은 `id` 내림차순 안정 정렬)로 내려준다 — 프론트가 `sortTickets` 로 한 번 더 정렬하지만 서버 순서가 정본이어야 페이징 도입 시(§7.9) 계약이 유지된다. 각 항목의 `categoryLabel` 은 서버가 조인한 조회 시점 표시명이다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-026-EP-02 · 문의 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-026-EL-015, EL-016, EL-017, EL-019, EL-020, EL-029 |
| 메서드·경로 | `GET /api/support/tickets/:id` |
| 권한 | `admin`, `operator`. 고객센터 읽기 권한 없음 → **404 은닉**(§7.6) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Ticket`(타임라인 전체 포함). 타임라인은 **`at` 오름차순**으로 내려준다 — 프론트가 정렬하지 않고 받은 순서 그대로 렌더한다(FS-026-EL-029).

**에러**: 400(id 형식) · 401 · **404 `TICKET_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.6) · 429 · 500 · 504.

> **어댑터 요구사항**: 현재 `fetchOne` 은 없으면 **status 없는 일반 `Error('문의를 찾을 수 없습니다')`** 를 던진다. 화면이 404 와 5xx 를 분기할 수 없는 원인이다(FS-026 §7 #12). 백엔드 연결 시 **404 를 `HttpError(404, …)` 로 변환**해야 `EXC-12` 계약(‘찾을 수 없음’ = 목록으로 / ‘불러오지 못함’ = 다시 시도 + 목록으로)이 성립한다. `shared/errors/http-error.ts` 의 `HttpError` 가 그 타입이며 `createCrudAdapter` 는 이미 그렇게 한다(`crud.ts:55`).

---

### BE-026-EP-03 · 문의 처리 저장 (담당 · 상태 · 타임라인)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-026-EL-021, EL-022, EL-023, EL-026, EL-028, EL-029.1, EL-033 |
| 메서드·경로 | `PUT /api/support/tickets/:id` |
| 권한 | `admin`, `operator`(§7.8). 고객센터 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **멱등하지 않다 — 계약을 바꿔야 한다**(§7.2·§7.3). 현재 형태(타임라인 배열 전체 치환)는 같은 요청을 두 번 보내면 같은 최종 상태가 되므로 형식적으로는 PUT 멱등이지만, **그 멱등성이 곧 lost update 다** — 두 상담원의 답변 중 하나가 조용히 사라진다 |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `TicketInput`): `ticketNo` · `title` · `categoryId` · `channel` · `priority` · `status` · `assignee` · `customerName` · `contact` · `receivedAt` · `body` · `timeline[]`.

**서버 검증 (요청을 그대로 믿지 않는다)**
1. **불변 필드 무시**: `ticketNo` · `receivedAt` · `body` · `customerName` · `contact` · `channel` · `priority` 는 관리자가 바꿀 수 없다. 프론트가 `toTicketInput(ticket)` 으로 되돌려 보내지만(FS-026-EL-028) **서버는 저장된 값을 정본으로 유지하고 요청 값을 무시**한다 — 프론트가 낡은 스냅샷을 되돌려 보내 고객 원문을 덮는 사고를 막는다(§7.9).
2. **상태 전이**: `canSetStatus(저장된 status, 요청 status, 요청 assignee)` 를 **서버가 재판정**한다. 위반 시 422(§5).
3. **타임라인**: 요청의 `timeline` 을 **신뢰하지 않는다** — §7.2·§7.3 이 계약을 대체한다.
4. `assignee` 는 앞뒤 공백 제거 후 0–100자.

**응답 200/204**. 프론트 `update(id, input, signal): Promise<void>` — 응답 본문을 읽지 않고 상세를 재조회한다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `status`·`assignee`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `TICKET_NOT_FOUND`** · **409 `CONFLICT`**(§7.5 — 유령 저장 방지) · **422 `INVALID_STATUS_TRANSITION`** · **422 `ASSIGNEE_REQUIRED`** · 429 · 500 · 504.

---

### BE-026-EP-04 · 활성 문의 유형 목록 — **심 없음 (미정)**

FS-026-EL-005(유형 필터 선택지)가 필요로 하는 읽기다. **`data-source.ts` 에 이 조회의 어댑터도 `// TODO(backend)` 주석도 없다.** 화면이 `_shared/store.ts` 의 `listActiveCategories()` 를 **동기 직접 호출**한다(`TicketListPage.tsx:107`).

- 엔드포인트: **미정.** 문의 유형의 정본 계약은 BE-027 이 소유한다 — 이 문서는 엔드포인트를 만들지 않는다.
- 판정: §7.4.

---

### BE-026-EP-05 · 답변 템플릿 목록 — **심 없음 (미정)**

FS-026-EL-025(템플릿 삽입 선택지)가 필요로 하는 읽기다. **어댑터도 `// TODO(backend)` 주석도 없다.** 화면이 `_shared/store.ts` 의 `listTemplates()` 를 **동기 직접 호출**한다(`TicketDetailPage.tsx:98`).

- 엔드포인트: **미정.** 답변 템플릿의 정본 계약은 BE-028(`GET /api/support/reply-templates`)이 소유한다 — 이 화면은 그 계약의 소비자다.
- 판정: §7.4.

## 5. 예외 매트릭스

> EP-04·EP-05 는 **심이 없어 계약이 존재하지 않으므로** 이 매트릭스에 행이 없다(§7.4). 아래 3행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터가 재인증으로. 화면은 FS-026-EL-011 배너 | **403** 컬렉션 — 고객센터 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-026-EL-010 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-026-EL-011 | 5초 → 504 → FS-026-EL-011 |
| EP-02 상세 | 400 — id 형식 위반 | 401 → 전역 인터셉터. 화면은 FS-026-EL-016 배너 | **읽기 권한 없음 → 404 은닉**(§7.6) — 개별 문의의 존재 자체가 고객 개인정보다. 읽기 권한이 있는 `operator` 에게는 403 을 준다 | **404 `TICKET_NOT_FOUND`** — 어댑터가 `HttpError(404)` 로 변환해야 한다(EP-02 어댑터 요구사항). 현재는 일반 `Error` 라 5xx 와 뭉개진다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-026-EL-016 (문구가 404 와 같다 — FS-026 §7 #12) | 5초 → 504 → FS-026-EL-016 |
| EP-03 처리 저장 | 400 `VALIDATION_FAILED` — `status` 가 `TicketStatus` 가 아님 · `assignee` 100자 초과. `error.fields` 로 내려보낸다(현재 프론트에 필드 매핑이 없어 FS-026-EL-018 배너로 뭉개진다 — §7.11) | 401 → 전역 인터셉터가 재인증으로. **미저장 처리 내용은 유실된다**(FS-026 §7 #28) | `operator` 도 쓰기가 허용되므로(§7.8) 역할 부족 403 은 고객센터 쓰기 권한 없는 그 밖의 역할에만. **읽기 권한 없음 → 404 은닉** | **404 `TICKET_NOT_FOUND`** — 존재한 적 없는 id. **F3b 이후 프론트 픽스처도 대상 부재를 막는다**(`data-source.ts:44-46` 이 409 를 던진다 — 유령 저장 해소. ⚠ 계약은 404, 픽스처는 409 로 status 가 갈린다 — §7.11) | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.5). `If-Match`/`version` 불일치 또는 대상 부재. **프론트 어댑터는 대상 부재에 409 를 내지만 이를 해소할 UI 가 없다**(§7.5 이관) | **422 `INVALID_STATUS_TRANSITION`**(`STATUS_FLOW` 위반 — 예: `closed` → `in_progress`, `received` → `answered`) · **422 `ASSIGNEE_REQUIRED`**(`in_progress`/`answered` 인데 담당 공백). 둘 다 프론트가 1차 차단하지만 **서버가 정본**이다 | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-026-EL-018 배너, 입력 보존 | 5초 → 504 → FS-026-EL-018 배너. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `ticketAdapter.fetchAll(signal)` | `GET /api/support/tickets` | EP-01 | `readonly Ticket[]` | O |
| `ticketAdapter.fetchOne(id, signal)` | `GET /api/support/tickets/:id` | EP-02 | `Ticket` | **△ — 404 를 `HttpError` 로 변환해야 한다**(현재 일반 `Error`) |
| `ticketAdapter.update(id, input, signal)` | `PUT /api/support/tickets/:id (답변·상태·담당 저장)` | EP-03 | `void` | **△ — 타임라인 계약 변경 필요**(§7.2·§7.3) · **409 미발생**(§7.5) · **멱등키 없음**(§7.11) |
| `ticketAdapter.create(...)` | — | **없음(범위 밖)** | 항상 `Promise.reject('문의는 고객 채널에서 접수됩니다.')` | O — 계약 없음이 정답(§7.7) |
| `ticketAdapter.remove(...)` | — | **없음(범위 밖)** | 항상 `Promise.reject('문의는 삭제할 수 없습니다.')` | O — 계약 없음이 정답(§7.7) |
| **`_shared/store.listActiveCategories()`** (`TicketListPage.tsx:107`) | **없음** | **EP-04 심 없음(미정)** | `readonly SupportCategory[]` — **동기 반환** | **X — 어댑터를 거치지 않는다**(§7.4) |
| **`_shared/store.listTemplates()`** (`TicketDetailPage.tsx:98`) | **없음** | **EP-05 심 없음(미정)** | `readonly ReplyTemplate[]` — **동기 반환** | **X — 어댑터를 거치지 않는다**(§7.4) |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기(`update`)에 `X-CSRF-Token` 헤더 · `fetchOne` 은 404 → `HttpError(404, '문의를 찾을 수 없습니다')` 변환 · `update` 는 409 → `HttpError(409, …)` 변환(현재 `isConflict` 판정 경로가 이미 `shared/errors/http-error.ts` 에 있다).

**시그니처를 바꿔야 하는 항목(§7.4)**: `listActiveCategories()` · `listTemplates()` 는 **동기·비취소·비실패** 함수다. 백엔드 연결 시 `Promise<T>` + `AbortSignal` 로 바뀌어야 하며, 그 순간 **호출부(`TicketListPage.tsx:107` · `TicketDetailPage.tsx:97-100`)의 `useMemo` 가 `useQuery` 로 바뀌어야 한다.** 어댑터 본문만 바꿔 끝나는 다른 연동과 달리 **화면 코드가 함께 바뀐다** — 연동 작업 산정 시 이 두 화면을 빼먹지 말 것.

## 7. 핵심 판정

### 7.1 답변 본문 XSS — 서버가 저장 시 정제한다 【보안 판정】

타임라인의 `kind='reply'` 이벤트 `text` 는 **관리자가 쓰고 고객에게 전달되는 문구**다(FS-026-EL-026 → EL-029.1). 관리자 화면은 `Timeline` 이 텍스트 노드로만 렌더하지만(`packages/ui/.../Timeline.tsx:41`), **고객 채널(웹 마이페이지·카카오톡 알림톡·이메일)이 이를 HTML 로 해석하면 저장형 XSS 가 된다**. BE-010 §7.2 와 동일 판정 — 서버가 **저장 시** 허용 태그 화이트리스트 밖의 마크업 · `javascript:`/`data:` 스킴 · 이벤트 핸들러 속성을 제거하고, 계약은 '저장된 답변에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다. 정제는 **저장 시 1회**이며 렌더 시점 이스케이프에 의존하지 않는다 — 고객 채널이 여러 개(웹·톡·메일)라 각 채널의 이스케이프를 신뢰할 수 없기 때문이다.

**고객 문의 원문(`body`)도 같은 처리를 받는다** — 고객이 넣은 스크립트가 관리자 화면(FS-026-EL-020)에 렌더된다. 관리자 화면이 텍스트 노드라 현재는 안전하지만, 정제 없이 저장하면 향후 어떤 화면이 HTML 로 렌더하는 순간 관리자가 피해자가 된다.

### 7.2 타임라인 작성자·시각 위조 — 서버가 정본을 찍는다 【보안 판정】

**현재 클라이언트가 타임라인 이벤트의 `author`·`at`·`id` 를 전부 정한다:**
- `author` 는 하드코딩 문자열 `'관리자'`(`tickets/process.ts:8` `const ADMIN_AUTHOR = '관리자'`) — **누가 답변했는지 기록되지 않는다.**
- `at` 은 클라이언트 시각(`TicketDetailPage.tsx:143` `new Date().toISOString()`) — 시계가 틀리거나 조작되면 이력의 시간순이 무너진다.
- `id` 는 `ev-${Date.now()}-a|s|c`(`process.ts:42`) — 두 상담원이 같은 밀리초에 저장하면 충돌한다.

**판정**: 이 세 값은 **전부 서버가 찍는다.** 요청 바디의 `author`·`at`·`id` 는 **무시**한다 — 클라이언트가 보낸 작성자를 신뢰하면 **인증된 아무 관리자나 다른 관리자 이름으로 답변을 남길 수 있다**(감사 로그 위조). `author` 는 **세션 주체**에서, `at` 은 **서버 시각**에서, `id` 는 **서버 채번**에서 온다. 이것은 UX 개선이 아니라 감사 무결성 요구다 — 1:1 문의 이력은 고객 분쟁 시 증거로 쓰인다.

### 7.3 타임라인 전체 치환 → append-only 이벤트로 계약을 바꾼다 【보안·정합 판정】

**현재 프론트는 조회 시점 타임라인 배열 전체를 클라이언트에서 재조립해 PUT 한다**(`process.ts:35-59` `buildTimeline` — `let timeline = ticket.timeline` 에서 시작해 `appendEvent` 로 덧붙인 **배열 전체**를 `TicketInput.timeline` 에 실어 보낸다).

**이것이 만드는 사고**: 상담원 A 가 상세를 열고(타임라인 3건 스냅샷) 답변을 쓰는 동안 상담원 B 가 답변을 저장한다(타임라인 4건). A 가 저장하면 **A 의 3건 스냅샷 + A 의 새 이벤트 = 4건**이 서버의 4건을 덮는다 — **B 의 답변이 흔적 없이 사라진다.** 고객에게는 이미 전송됐을 수 있는 답변이다. 전체 치환 PUT 이라 서버는 이것이 유실인지 정상 갱신인지 구분할 수 없다.

**판정**: 타임라인은 **서버가 소유하는 append-only 컬렉션**이다. 계약을 둘 중 하나로 바꾼다.

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `PUT /api/support/tickets/:id` 는 **담당·상태만** 받고(`{ assignee, status }`), 답변/메모는 **별도 append 엔드포인트** `POST /api/support/tickets/:id/events` `{ kind, text }` 로 분리. 배정·상태변경 이벤트는 **서버가 PUT 의 부수효과로 자동 기록** | 유실이 구조적으로 불가능하다. 프론트 `buildTimeline` 이 통째로 사라지고 §7.2 도 자동 해결된다. **어댑터 시그니처가 바뀐다** — `CrudAdapter.update` 로 표현할 수 없어 화면 코드가 함께 바뀐다 |
| **B (차선)** | PUT 을 유지하되 서버가 요청의 `timeline` 을 **무시**하고, 새 이벤트만 별도 필드(`newEvent?: { kind, text }`)로 받아 서버가 append | 어댑터 형태를 덜 흔든다. 그러나 `TicketInput` 이 실제로 쓰이지 않는 `timeline` 을 계속 실어 보내는 기형이 남고, 요청 크기가 이력에 비례해 계속 커진다 |

**어느 안이든 서버는 요청의 `timeline` 배열을 절대 신뢰하지 않는다.** 이 판정이 §7.2 를 포함한다.

### 7.4 유형·템플릿 조회 — 심이 없고, 연결하려면 화면 코드가 바뀐다 【연동 판정】

`TicketListPage.tsx:107` 이 `listActiveCategories()` 를, `TicketDetailPage.tsx:98` 이 `listTemplates()` 를 **어댑터를 거치지 않고 `_shared/store` 에서 동기 직접 호출**한다. `// TODO(backend)` 주석이 없다 — 즉 **연동 심이 아예 없다.**

**이것이 왜 문제인가**: 다른 화면은 어댑터 본문만 fetch 로 바꾸면 연동이 끝난다(시그니처 불변이 이 앱의 연동 전략이다). 그러나 이 두 호출은 **동기 함수**라 `Promise` 를 반환하는 순간 `useMemo(() => listActiveCategories(), [])` 가 성립하지 않는다. **화면이 `useQuery` 를 새로 배선해야 하고**, 그러면 FS-026 §4 가 'N/A — 로딩 상태가 없다'로 적어 둔 칸들(EL-005·EL-025의 로딩·실패)이 **전부 새 요구사항으로 살아난다** — 로딩 스켈레톤, 실패 배너, 재시도, 취소.

**판정**: 이 문서는 EP-04·EP-05 의 엔드포인트를 **만들지 않는다** — 문의 유형은 BE-027, 답변 템플릿은 BE-028(`GET /api/support/reply-templates`)이 정본이다. 이 화면은 **소비자**이며, 연동 시 그 계약을 호출하도록 화면 코드를 고치는 것이 작업 범위다. 백엔드 착수 전 A11 이 이 두 호출부의 비동기화를 별도 티켓으로 잡아야 한다 — **어댑터만 바꾸면 되는 작업으로 산정하면 반드시 빠진다.**

### 7.5 유령 저장 · 낙관적 동시성 — 서버가 409 로 막는다 【정합 판정】 *(F3b 로 프론트 전제가 바뀌어 정정)*

**정정 — 프론트가 이미 막는다.** `updateTicket(id, input)`(`_shared/store.ts`)은 여전히 `tickets.map(...)` 이라 없는 id 를 조용히 지나치지만, **어댑터가 그 앞을 막는다**: `data-source.ts:17` `const exists = (id) => listTickets().some((ticket) => ticket.id === id)` · `:44-46` `if (!exists(id)) throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 변경한 문의입니다.')`. `fetchOne` 도 `:31-33` 에서 `HttpError(HTTP_STATUS.notFound, '문의를 찾을 수 없습니다.')` 를 던진다. **즉 '유령 저장'과 '404 미도달'은 F3b 에서 해소됐고, 손조립 어댑터가 `createCrudAdapter` 의 가드와 같은 계약을 자기 자리에서 갖췄다**(`crud.ts:126-128` 과 같은 모양).

**남은 결손은 하나다: 낙관적 동시성 토큰.** 그 409 는 **'대상이 아직 존재하는가'** 로만 판정하므로 **둘 다 존재하는 동시 편집은 last-write-wins** 다 — 이 화면에서는 그것이 곧 §7.3 의 답변 유실이다. 이 구분을 흐리지 말 것.

**판정**: EP-03 은 **대상이 없으면 404**, **낙관적 동시성 토큰이 어긋나면 409** 를 반환한다. 문의는 삭제되지 않으므로(§7.7) '먼저 삭제됨' 경합은 없지만 **동시 편집 경합은 실재한다**(§7.3). 토큰은 `If-Match`(ETag) 또는 `Ticket.version` 중 하나로 두되, **§7.3 안 A 를 채택하면 담당·상태만 다투므로 last-write-wins 로 충분**할 수 있다 — 답변 유실이라는 진짜 위험이 append 로 사라지기 때문이다. 결론: **§7.3 안 A 채택 시 409 는 선택, 안 B 유지 시 409 는 필수.**

**프론트 후속(A11) — 여전히 유효하다**: 이 화면에 409 를 해소할 UI 가 없다 — `useCrudForm` 의 `conflict` 다이얼로그(`useCrudForm.ts:166-179`, 입력 보존 + reload/dismiss)를 쓰지 않기 때문이다. **어댑터가 이제 409 를 실제로 던지므로 이 결손이 관측 가능해졌다** — 대상이 사라진 저장은 성공하지 않지만, 사용자는 '다른 사용자가 먼저 변경했다'는 사실도 재조회 경로도 얻지 못하고 FS-026-EL-018 의 generic '저장하지 못했습니다' 배너만 본다. 즉 **생산자는 생겼고 소비자가 없다** — F2 때와 정확히 반대 상황이다.

### 7.6 문의 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/support/tickets` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 문의 리소스의 존재 자체가 개인정보다** → 고객센터 도메인 **읽기 권한이 없는** 주체에게는 **404 `TICKET_NOT_FOUND`** 로 은닉한다.

**근거**: 문의 1건은 `customerName` · `contact`(이메일·전화번호) · `body`(고객이 쓴 원문 — 결제 정보·주소·불만이 담긴다)를 담는다. `Ticket` 은 회원 레코드보다 민감도가 낮지 않다 — BE-003 §3.2 가 `GET /api/members/:id` 를 404 로 은닉하는 것과 **같은 이유로** `GET /api/support/tickets/:id` 도 404 여야 한다. 티켓 id 열거로 '이 고객이 무엇을 문의했는가'를 알아내는 경로를 닫는다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 문의의 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다. 다만 이 도메인은 `operator` 에게 쓰기를 열므로(§7.8) 그 403 은 고객센터 쓰기 권한 없는 그 밖의 역할에만 발생한다.

**프론트 영향**: FS-026-EL-016 이 404 와 5xx 를 같은 문구로 그리므로(FS-026 §7 #12) **은닉은 성립하지만 정당한 운영자도 원인을 모른다.** EP-02 어댑터 요구사항(404 → `HttpError`)이 선행돼야 한다.

### 7.7 문의 생성·삭제 — 계약에 존재하지 않는다 【범위 판정】

**F2 코드로 재확인한 사실**:
- `ticketAdapter.create()` = `Promise.reject(new Error('문의는 고객 채널에서 접수됩니다.'))` (`data-source.ts:27-29`) — 어댑터 인터페이스(`CrudAdapter`)가 5개 함수를 요구해 **자리만 채운 거절 구현**이다. 호출부가 없다.
- `ticketAdapter.remove()` = `Promise.reject(new Error('문의는 삭제할 수 없습니다.'))` (`data-source.ts:35-37`) — 위와 동일.
- `_shared/store.ts:273` 의 섹션 주석: `/* ── 티켓 저장소 API (문의는 고객이 만든다 — 관리자 생성/삭제 없음) ─────── */` — 저장소에 `addTicket`·`removeTicket` 이 **아예 없다**(`listTickets`·`getTicket`·`updateTicket` 3개뿐).
- `TicketListPage.tsx:3` 헤더 주석: '문의는 고객 채널이 만들고 관리자는 처리·답변만 한다 → 읽기 전용 트리아지 표(삭제·일괄 없음)'.
- 화면에 등록 버튼·행 선택·삭제·일괄 작업이 **없다**(FS-026 §2).

**판정**: `POST /api/support/tickets` · `DELETE /api/support/tickets/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**이며, 코드가 네 겹(어댑터 거절·저장소 부재·주석·UI 부재)으로 이를 못박는다. BE-003 §1 이 '**회원 생성** — 고객은 회원가입으로만 유입된다. 관리자가 회원을 만드는 API 는 이 계약에 존재하지 않는다' 로 확정한 것과 같은 결이다.

**삭제에 대한 추가 근거**: 1:1 문의는 **감사 대상 기록**이다(고객 분쟁 시 증거). 개인정보 파기 요구(고객 탈퇴·보존기간 만료)는 관리자 화면의 단건 삭제 버튼이 아니라 **보존정책 배치**로 처리해야 할 별도 계약이며, 이 화면의 범위가 아니다 — A63 이관.

### 7.8 `operator` 에게 쓰기를 연다 — BE-010 과 다른 판정

BE-010(FAQ)은 `operator` 를 조회 전용으로 두고 모든 쓰기를 403 으로 막는다. **이 도메인은 반대다.**

**근거**: 1:1 문의 응대는 **운영자의 본업**이다. `operator` 가 담당 배정·상태 전이·답변 작성을 할 수 없다면 이 화면을 쓸 사람이 `admin` 뿐이고, 그러면 역할 구분이 무의미해진다. FAQ 는 '전체 고객에게 공표되는 콘텐츠'라 신중해야 하지만, 문의 답변은 '한 고객에게 보내는 응대'이며 그것이 운영자 직무다. 픽스처 타임라인의 작성자가 '김상담'·'최지원'(`_shared/store.ts`)인 것도 이 도메인이 상담원 다수를 전제함을 보여준다.

**결론**: EP-01·EP-02·EP-03 모두 `admin` + `operator`. 고객센터 도메인 권한이 아예 없는 역할만 차단한다.

### 7.9 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:
1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 필터·검색·정렬을 전부 클라이언트에서 한다. 문의는 **매일 쌓이는 무한 증가 컬렉션**이다 — 회원·FAQ 와 달리 상한이 없다. 1년 뒤 수만 건을 매 진입마다 전송하게 된다.
2. **목록이 상세 전문을 담는다.** `Ticket` 타입 하나를 목록·상세가 공유해 목록 응답에 `body`(고객 원문)와 `timeline`(전체 이력)이 실린다 — **목록 화면이 쓰지 않는 필드**이며, 동시에 **개인정보를 필요 이상으로 넓게 노출**한다(§7.6 의 취지와 충돌한다).

**판정**: BE-010 이 `FaqSummary`(목록 행) / `Faq`(상세 = Summary + answer)로 나눈 것과 같이 **`TicketSummary` / `Ticket` 를 분리**하고, EP-01 에 `status`·`channel`·`priority`·`categoryId`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `TicketSummary` 는 `body`·`timeline` 을 뺀다.

**이관**: 이 변경은 **프론트 대공사**다 — `filterTickets`/`searchTickets`/`sortTickets` 가 서버로 올라가고, 페이지네이션 UI(FS-026 §7 #1)·URL list state(#14)·`SeqCell` 오프셋(#20)이 함께 붙어야 한다. quality-bar IA-04 P0(페이지네이션)·IA-13 P0(URL state)가 이미 이 화면을 gap 으로 잡고 있으므로 **한 배치로 묶는 것이 옳다.** 그전까지 현 계약(전량)을 유지한다 — 픽스처 4건에서는 드러나지 않는다.

### 7.10 SLA 는 클라이언트 파생값이다 — 서버 계약에 넣지 않는다

SLA 상태(정상/임박/초과/응답완료)·마감 시각·잔여 시간은 **전부 프론트 순수 함수**다(`_shared/domain.ts` `slaDueAt`·`ticketSlaState`·`slaRemainingLabel`). 서버는 `receivedAt`·`priority`·`status` 만 주고 파생은 하지 않는다.

**판정: 현 상태를 유지한다.** 목표시간 정책(긴급 1h · 높음 4h · 보통 24h · 낮음 72h)은 **표시 규칙**이며 서버 왕복이 필요 없다. 순수 함수라 테스트도 이미 있다(`_shared/domain.test.ts` 'SLA(순수)').

**단, 두 가지가 계약에 걸린다**:
1. **SLA 로 필터·정렬하려면** 서버가 계산해야 한다(클라이언트는 현재 페이지만 안다). §7.9 의 페이징이 도입되는 순간 'SLA 초과만 보기'는 서버 기능이 된다 — 그때 이 판정을 재검토한다.
2. **목표시간 정책이 운영자 설정으로 승격되면** 서버가 정본이 된다. 현재는 코드 상수다.

**프론트 후속(A11)**: 기준 시각이 목록(마운트 고정)과 상세(렌더마다)에서 다른 것(FS-026 §7 #9)은 **서버와 무관한 프론트 버그**다 — 이 판정이 그것을 정당화하지 않는다.

### 7.11 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **타임라인 계약 변경(§7.3 안 A: `POST /api/support/tickets/:id/events` 분리)** — 프론트 `buildTimeline`·`toTicketInput` 제거 + 어댑터 시그니처 변경이 따라온다 | A63 · A11 (최우선) |
| 2 | 타임라인 `author`/`at`/`id` 를 서버가 찍는다(§7.2) — 프론트 `ADMIN_AUTHOR` 하드코딩 제거 | A63 · A11 |
| 3 | 답변·문의 본문 저장 시 XSS 정제(§7.1) | A63 |
| 4 | **유형·템플릿 조회의 비동기화(§7.4)** — 어댑터만으로 끝나지 않고 `TicketListPage`·`TicketDetailPage` 가 `useQuery` 를 새로 배선해야 한다. 로딩·실패·재시도 UI 가 신규 요구사항으로 발생 | A11 (연동 산정에 반드시 포함) |
| 5 | `fetchOne` 404 → `HttpError(404)` 변환(EP-02) — EXC-12 의 전제 | A11 · A63 |
| 6 | 409 충돌 해소 UI 부재(§7.5) — `useCrudForm` 의 conflict 다이얼로그를 쓰지 않는다 | A11 |
| 7 | **목록 페이징 + `TicketSummary` 분리(§7.9)** — IA-04 P0 · IA-13 P0 와 한 배치로 | A63 · A11 |
| 8 | 400 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다(EXC-07 P1) — `useCrudForm` 미사용이라 `setError` 경로가 없다 | A11 |
| 9 | EP-03 에 멱등키(`Idempotency-Key`)가 없다 — 프론트에 `submitLockRef` 도 없어(EXC-08 P0) 연타가 두 요청을 만들 수 있다 | A11 · A63 |
| 10 | 문의 보존정책·개인정보 파기 배치(§7.7) — 관리자 삭제 API 가 아닌 별도 계약 | A63 |
| 11 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 처리 내용이 유실**된다(EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) | A11 · A40 |
| 12 | **계약(404 `TICKET_NOT_FOUND`) ↔ 픽스처 어댑터(409) 불일치** — 대상 부재 시 §5 EP-03 은 404 를, `data-source.ts:44-46` 은 409 를 낸다. 두 status 는 화면에서 다른 경로로 간다(409 는 `useCrudForm` 의 conflict 다이얼로그, 404 는 generic 배너). **이 화면은 `useCrudForm` 을 쓰지 않아 지금은 둘 다 같은 배너로 수렴하지만**(우연히 관측 차이가 없다) 백엔드 연결 전에 어느 쪽이 정본인지 확정해야 한다 — §7.5 가 '문의는 삭제되지 않으므로 먼저 삭제됨 경합은 없다'(§7.7)고 판정한 것과도 맞물린다 | A63 · A11 |
| 13 | 내부메모(`kind='note'`)의 고객 노출 경계 — 서버가 고객 채널로 내보낼 때 `note` 를 반드시 제외해야 한다(§7.1 과 같은 뿌리) | A63 |

## 8. 자기 점검

- [x] FS-026 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 3건(EP-01·02·03) 매핑 완료, **심 없는 2건(EP-04·05)을 '심 없음(미정)' 으로 명시**하고 §7.4 판정을 남겼다
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (3행 × 9열 — 심 없는 EP-04·05 는 계약이 없어 행이 없음을 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한만 고유 차이**(`operator` 쓰기 허용 — §7.8)를 근거와 함께 기술
- [x] **생성·삭제를 '범위 밖'으로 판정**하고 F2 코드 네 겹(어댑터 거절 `data-source.ts:27-29,35-37` · 저장소 함수 부재 `store.ts:273` · 화면 주석 · UI 부재)으로 근거를 댔다 — BE-003 §1 선례 인용
- [x] 멱등성 판정 — 조회 GET 멱등 / **처리 저장은 형식상 PUT 멱등이나 그 멱등성이 곧 lost update 임을 §7.3 에 명시**
- [x] 보안 판정 3건 이상 — XSS(§7.1) · **타임라인 author/at 위조(§7.2)** · **전체 치환 lost update(§7.3)** · **403 vs 404 은닉(§7.6)** · 정합 판정(§7.5 유령 저장)
- [x] `process.ts`·`_shared/domain.ts` 의 상태 전이 로직을 §3 표와 §5 의 422 축(`INVALID_STATUS_TRANSITION` · `ASSIGNEE_REQUIRED`)에 정확히 반영했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
