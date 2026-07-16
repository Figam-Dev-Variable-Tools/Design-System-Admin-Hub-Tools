---
id: BE-052
title: "프로젝트 백엔드 기능 명세"
functionalSpec: FS-052
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-052. 프로젝트 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-052 프로젝트 (`/sales/projects` · `/sales/projects/new` · `/sales/projects/:id/edit`) |
| 범위 | 프로젝트(영업 기회) 목록 조회, 상세 조회, 등록, 수정, 단건 삭제, 일괄 삭제 — **이 섹션에서 유일하게 전체 CRUD 를 갖는 화면이다** |
| **범위 밖** | **읽기 전용 상세 조회 화면** — 라우트가 없다(`App.tsx:252-254` 가 목록·`/new`·`/:id/edit` 3개만 등록). `GET /api/sales/projects/:id` 는 **수정 폼의 프리필 용도로만** 존재한다. **견적·계약·문의와의 연결** — `Project` 에 그 참조가 없다(§7.5). **거래처 마스터 조인** — `accountName` 은 자유 텍스트 사본이다(§7.5). **파이프라인 집계·리포트** — 별도 계약(BE-05x stats) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 날짜는 `YYYY-MM-DD` |
| 프론트 어댑터 | `apps/admin/src/pages/sales/projects/data-source.ts` (`projectAdapter` = 공용 `createCrudAdapter`) |
| 도메인 타입 | `apps/admin/src/pages/sales/projects/types.ts` — `Project` · `ProjectInput` · `Milestone` + 순수 규칙(`STAGES` · `PIPELINE_FLOW` · `defaultProbability` · `weightedRevenue` · `milestoneProgress` · `sortProjects`) |
| 검증 정본 | **`apps/admin/src/pages/sales/projects/validation.ts` 의 zod 스키마(`projectSchema`)** — 이 화면은 `useCrudForm`+zod 를 쓴다. §3 이 그 규칙을 서버 계약으로 옮긴다. **단 그 스키마에 없는 것(금액 상한·길이 상한·단계 전이)은 서버가 신설한다**(§3·§7.2) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-010 §1 과 동일 선언). 아래는 프로젝트 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 판정 대상 | 코드 근거 (file:line) | 확인한 사실 |
|---|---|---|
| 어댑터 팩토리 | `data-source.ts:67-76` | `createCrudAdapter({ scope:'sales-projects', seed, build, patch: (item, input) => ({ ...item, ...input }), sort: sortProjects })` — **부수효과 없는 순수 patch**(FS-051 의 견적 발행과 갈린다) |
| 연동 심 | `data-source.ts:66` | `// TODO(backend): GET/POST /api/sales/projects · GET/PUT/DELETE /api/sales/projects/:id` — **이 문서의 5개 엔드포인트는 전부 이 한 줄에서 나온다. 발명 0건** |
| 404 발현 | `shared/crud/crud.ts:105-107` | `fetchOne` 의 없는 id → `HttpError(404, '항목을 찾을 수 없습니다.')` → 화면의 `loadFailure='not-found'` 분기(`useCrudForm.ts:144-149` → `ProjectFormPage.tsx:248`) |
| 409 발현 (update) | `shared/crud/crud.ts:126-128` | 없는 id → `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` → `FormConflictDialog`(`ProjectFormPage.tsx:532`) |
| 409 발현 (remove) | `shared/crud/crud.ts:139-141` | 없는 id → `HttpError(409, '이미 삭제된 항목입니다.')` → 삭제 다이얼로그 배너 |
| 멱등 원장 | `shared/crud/crud.ts:62-72, 114, 121` | `create`/`update` 가 `context.idempotencyKey` 로 재생. **호출부가 실제로 넘긴다**(`useCrudForm.ts:211,228,235`) — FS-051 과 갈리는 지점 |
| 삭제의 멱등키 | `shared/crud/crud.ts:319-322, 330` | `DeleteVars` 에 `idempotencyKey` 자리가 **없다** — `remove(id, { signal })` 만. 의도된 설계(`crud.ts:36-38` 주석 '확인 다이얼로그를 거치는 조작은 키 없이 온다') |
| 일괄 삭제 | `shared/crud/crud.ts:343-356` | `settleAll(ids, (id) => adapter.remove(id, { signal }))` — **서버 일괄 엔드포인트가 아니라 개별 요청 N개** |
| 검증 스키마 | `validation.ts:35-108` | 필수 2(name·accountName) · 퍼센트 2(probability·progress) · 숫자 1(expectedRevenue) · 기간 · 실주사유 조건부 · 마일스톤 |
| **단계 전이 규칙** | **부재 — 코드 확인** | `validation.ts:39` 는 `z.enum([...])` 뿐. `types.ts` 에 `canSetStage`/`STAGE_FLOW` 가 **없다**. `PipelineStepper.tsx:74-93` 은 **onClick 0건 — 읽기 전용 표시** |
| 금액·길이 상한 | **부재 — 코드 확인** | `expectedRevenue` 는 `^\d+$` 만(`validation.ts:41-45`). `ownerName`·`note`·마일스톤 `name` 에 상한 없음(`:48,50,53`) |
| 쓰기 게이팅 | **부재 — grep 확인** | `useRouteWritePermissions` 소비 7곳에 `pages/sales` 없음 |
| 낙관적 동시성 토큰 | **부재 — 코드 확인** | `Project`(`types.ts:18-38`)에 `version`/`updatedAt`/`etag` **없음** |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 + **등록·수정** — 파이프라인 관리는 영업 담당자의 본업이다(BE-051 §7.6 과 같은 결). **단 삭제는 `admin` 전용**(§7.6). 영업 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / **개별 프로젝트 404 은닉**(§7.1).
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-052 §4.1) — 권한 강제는 서버 책임. 프론트에 쓰기 게이팅이 배선돼 있지 않다(FS-052 §7 #10)는 사실이 이 원칙을 바꾸지 않는다.

## 3. 데이터 계약 (`types.ts` · `validation.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Project` | `id` · `name` · `accountName` · `stage` · `probability`(0~100) · `expectedRevenue`(원) · `startAt`(`YYYY-MM-DD`) · `endAt` · `ownerName` · `progress`(0~100) · `milestones` · `deliverables` · `lostReason` · `note` | 목록·상세가 **같은 타입**이다(§7.4) |
| `Milestone` | `id` · `name` · `dueDate`(`YYYY-MM-DD`) · `done` | **id 를 클라이언트가 만든다** — `ms-new-<Date.now()>-<0~1000 난수>`(`ProjectMilestonesField.tsx:59-64`) → §7.3 |
| `ProjectInput` | `Omit<Project, 'id'>` | 저장 입력. **전체 치환** — 부분 갱신(PATCH)이 아니다 |
| `PipelineStage` | `lead` \| `qualified` \| `proposal` \| `negotiation` \| `won` \| `lost` | 라벨: 리드·상담·제안·협상·수주·실주 |
| 단계 메타 (`STAGES`) | `{ id, label, probability, inFlow, tone }` | 기본 확률: 리드10 · 상담30 · 제안50 · 협상70 · 수주100 · 실주0. `inFlow`: 실주만 false(`types.ts:63-70`) |
| 상수 | `PROJECT_NAME_MAX = 80` · `PROJECT_MAX_MILESTONES = 12`(`types.ts:42-43`) | **`expectedRevenue` 상한 · `ownerName`/`note`/마일스톤 이름 길이 상한은 코드에 없다 — 이 문서가 정한다**(§4 EP-03·04) |

**검증 규칙 — 프론트 스키마를 서버가 재판정한다**

| 필드 | 프론트 규칙 (`validation.ts`) | 서버 계약 |
|---|---|---|
| `name` | 필수 · ≤80(`requiredText('프로젝트명', 80)` — `:37`). 화면도 `maxLength=80`(`ProjectFormPage.tsx:304`) | 동일. 400 `VALIDATION_FAILED` (`error.fields.name`) |
| `accountName` | 필수 · ≤60(`:38`). **화면에 `maxLength` 가 없어** 61자 입력이 가능하고 제출 시 거절된다 | 동일 |
| `stage` | `z.enum` 6개(`:39`). **전이 규칙 없음** | §3 의 `STAGE_FLOW` 를 **신설해 422 로 강제**(§7.2) |
| `probability` | 문자열 · `^\d+$` · ≤100(`percentString('확률')` — `:25-33,40`) | 정수 0~100. 400 |
| `expectedRevenue` | 문자열 · `^\d+$`(`:41-45`). **상한 없음** | 정수 0 ~ **1,000,000,000,000(1조)**. 초과 시 400 — §7.4 |
| `startAt`·`endAt` | 실재 날짜(`isRealDate` — `:13-16`) · `endAt >= startAt`(`:55-76`) | 동일. 400(형식) / **422 `INVALID_PERIOD`**(역전) |
| `ownerName` | `z.string()` — **검증 없음**(`:48`) | ≤30. 400 |
| `progress` | 문자열 · `^\d+$` · ≤100(`:49`) | 정수 0~100. 400 |
| `milestones` | 배열. 각 행 `name.trim() !== ''` · `dueDate` 실재 날짜(`:88-108`). **개수 상한이 스키마에 없다** — UI 만 12개에서 추가 버튼을 감춘다(`ProjectMilestonesField.tsx:86,142`) | **≤12 를 서버가 강제**(`PROJECT_MAX_MILESTONES`) · 각 `name` ≤60 · `dueDate` 실재 날짜. 초과 시 400 — §7.3 |
| `deliverables` | `z.array(z.string())` — **검증 없음**(`:51`). 화면이 textarea 1000자로 자른다 | 각 항목 ≤200 · 개수 ≤50. 400 |
| `lostReason` | `stage==='lost'` 이면 필수(`:77-87`). 그 밖에는 `toInput` 이 `''` 로 비운다(`ProjectFormPage.tsx:168`) | 동일 + ≤200. **`stage!=='lost'` 인데 값이 오면 무시하고 `''` 로 저장**(프론트가 이미 그렇게 한다 — 서버가 정본) |
| `note` | `z.string()` — **검증 없음**(`:53`). 화면이 textarea 500자로 자른다 | ≤500. 400 |

**단계 전이 규칙 — 【판정: 계약에 신설한다. 코드에는 없다】**

**코드에 전이 규칙이 존재하지 않는다**(§1.1). `PipelineStepper` 는 **읽기 전용 표시**이고(`PipelineStepper.tsx:74-93` — onClick 0건, `<ol>`+`<span>` 만), select 는 6개 단계 전부를 언제나 보여주며(`ProjectFormPage.tsx:360-364`), 스키마는 `z.enum` 뿐이다. **따라서 아래 표는 코드를 서술한 것이 아니라 이 계약이 신설하는 규칙**이며, §7.2 가 그 판정 근거다. **A01 의 도메인 확정이 선행돼야 한다.**

| 현재 | 허용되는 다음 단계 | 비고 |
|---|---|---|
| `lead` | `qualified` · `lost` | |
| `qualified` | `proposal` · `lost` | |
| `proposal` | `negotiation` · `qualified`(후퇴) · `lost` | |
| `negotiation` | `won` · `proposal`(후퇴) · `lost` | |
| `won` | **없음** | 종착 — 수주는 계약으로 넘어간다 |
| `lost` | `qualified`(재접촉) | 시드가 그 시나리오를 담고 있다 — `prj-3` 의 note '차기 발주 시 재접촉 예정.'(`data-source.ts:60`) |

- 현재 단계 → 자기 자신은 언제나 허용(단계를 안 바꾸는 저장이 정상 경로다).
- **`inFlow` 를 건너뛰지 않는다**: `PIPELINE_FLOW`(`types.ts:73-75`)의 인접 단계로만 전진한다. 리드에서 곧장 수주로 갈 수 없다 — **`PipelineStepper` 가 그리는 그 순서가 곧 규칙이라는 것이 이 표의 근거**다.
- **`lost` 는 어느 진행 단계에서도 갈 수 있다**(위 표의 각 행) — 실주는 언제든 일어난다.
- 위반 시 **422 `INVALID_STAGE_TRANSITION`**(§5).

## 4. 엔드포인트 명세

### BE-052-EP-01 · 프로젝트 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-052-EL-005, EL-006, EL-008, EL-008.1~.10, EL-009, EL-010, EL-011 |
| 메서드·경로 | `GET /api/sales/projects` |
| 근거 (심) | `data-source.ts:66` `GET/POST /api/sales/projects` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.4) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 필터(단계)·검색·정렬을 **전부 클라이언트에서** 수행하므로(FS-052-EL-002 · `filterProjects`/`searchProjects`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly Project[]`. **종료일 오름차순(임박이 위) 정렬**(동일 날짜는 `id` 오름차순 안정 정렬 — `types.ts:125-130` `sortProjects`)로 내려준다. 프론트도 어댑터의 `sort` 로 한 번 더 정렬하지만 서버 순서가 정본이어야 페이징 도입 시(§7.4) 계약이 유지된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-052-EP-02 · 프로젝트 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-052-EL-018, EL-020~EL-034(수정 폼 프리필) |
| 메서드·경로 | `GET /api/sales/projects/:id` |
| 근거 (심) | `data-source.ts:66` `GET/PUT/DELETE /api/sales/projects/:id` |
| 권한 | `admin`, `operator`. 영업 도메인 읽기 권한 없음 → **404 은닉**(§7.1) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Project`(마일스톤·산출물 포함). **읽기 전용 상세 화면이 없으므로 이 조회의 유일한 소비자는 수정 폼의 프리필**이다(`useCrudItem` — `crud.ts:258-268`, `enabled: id !== ''`).

**에러**: 400(id 형식) · 401 · **404 `PROJECT_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.1) · 429 · 500 · 504.

> **어댑터 상태**: `fetchOne` 은 **이미 `HttpError(404)` 를 던지고**(`crud.ts:105-107`) **화면이 그것을 소비한다** — `useCrudForm` 의 `isNotFound` 판정(`useCrudForm.ts:144-149`)이 `loadFailure='not-found'` 를 내고 `ProjectFormPage.tsx:242-264` 가 '다시 시도'를 **숨긴다**. **EXC-12 가 이 화면에서 이미 충족**이며 서버는 그 계약을 이어받기만 하면 된다.

---

### BE-052-EP-03 · 프로젝트 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-052-EL-004, EL-020~EL-031, EL-036, EL-037, EL-038 |
| 메서드·경로 | `POST /api/sales/projects` |
| 근거 (심) | `data-source.ts:66` `GET/POST /api/sales/projects` |
| 권한 | `admin`, `operator` |
| 멱등성 | **`Idempotency-Key` 헤더로 보장한다** — 프론트가 실제로 보낸다(`useCrudForm.ts:211,235` → `crud.ts:288-289` → `:114`). 24시간 보존, 같은 키의 재요청은 최초 응답을 재생한다 |
| 레이트리밋 | 분당 60회 |

**바디**: `ProjectInput` 전체(§3).

**서버 검증**: §3 의 표 전량 + `stage` 는 `lead`~`lost` 아무 값이나 허용(**등록에는 전이 규칙이 걸리지 않는다** — 시작점이 없다. 다만 `won`/`lost` 로 바로 등록하는 것이 정당한지는 A01 소관 — §7.2). `id` 는 **서버가 채번한다**(프론트 `build` 는 `prj-<seq>` — `data-source.ts:70-73`). **마일스톤 `id` 도 서버가 채번한다**(§7.3).

**응답 201** — `Location: /api/sales/projects/<id>` + 본문 없음(또는 `Project`). 프론트 `create(input, context?): Promise<void>` — 응답 본문을 읽지 않고 목록으로 이동한다(`useCrudForm.ts:223`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **422 `INVALID_PERIOD`** · **422 `LOST_REASON_REQUIRED`** · 429 · 500 · 504.

---

### BE-052-EP-04 · 프로젝트 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-052-EL-008.10, EL-018, EL-020~EL-031, EL-036, EL-037, EL-038, EL-039, EL-040 |
| 메서드·경로 | `PUT /api/sales/projects/:id` |
| 근거 (심) | `data-source.ts:66` `GET/PUT/DELETE /api/sales/projects/:id` |
| 권한 | `admin`, `operator` |
| 멱등성 | `Idempotency-Key` + **낙관적 동시성 토큰**(§7.3) |
| 레이트리밋 | 분당 60회 |

**바디**: `ProjectInput` 전체 — **부분 갱신이 아니라 전체 치환**이다.

**서버 검증**: §3 의 표 전량 + **단계 전이**(`STAGE_FLOW`, 저장된 `stage` → 요청 `stage`) → 위반 시 **422 `INVALID_STAGE_TRANSITION`**. **프론트에 전이 규칙이 없으므로 이 422 는 1차이자 유일한 방어선**이다(§7.2).

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 응답 본문을 읽지 않고 목록으로 이동한다.

**에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · **404 `PROJECT_NOT_FOUND`** · **409 `CONFLICT`**(§7.3) · **422 `INVALID_STAGE_TRANSITION`** · **422 `INVALID_PERIOD`** · **422 `LOST_REASON_REQUIRED`** · 429 · 500 · 504.

---

### BE-052-EP-05 · 프로젝트 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-052-EL-008.9, EL-012 |
| 메서드·경로 | `DELETE /api/sales/projects/:id` |
| 근거 (심) | `data-source.ts:66` `GET/PUT/DELETE /api/sales/projects/:id` |
| 권한 | **`admin` 전용**(§7.6) |
| 멱등성 | **멱등(DELETE)** — 이미 없는 id 는 204 가 관례이나 **이 계약은 409 를 준다**(§7.3). `Idempotency-Key` **없음** — 프론트가 보낼 자리가 없다(`crud.ts:319-322`) |
| 레이트리밋 | 분당 30회 |

**응답 204**.

**에러**: 400(id 형식) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `PROJECT_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제됨 — §7.3) · 429 · 500 · 504.

---

### BE-052-EP-06 · 프로젝트 일괄 삭제 — **심 없음 (미정)**

FS-052-EL-007·EL-013(일괄 선택 바 · 일괄 삭제 다이얼로그)이 필요로 하는 쓰기다. **`data-source.ts` 에 이 조작의 어댑터도 `// TODO(backend)` 주석도 없다** — 심의 문자열은 `DELETE /api/sales/projects/:id`(단건)뿐이다.

**현재 구현**: 프론트가 **단건 삭제를 N번 병렬로** 부른다 — `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`). 즉 **일괄 삭제라는 서버 개념이 존재하지 않고**, 화면의 '선택 N건 삭제'는 N개의 `DELETE /api/sales/projects/:id` 다.

- 엔드포인트: **미정.** `DELETE /api/sales/projects?ids=` 나 `POST /api/sales/projects/bulk-delete` 를 **이 문서가 만들지 않는다** — 심이 없고, 프론트가 그것을 부를 코드도 없다.
- 판정: §7.7.

## 5. 예외 매트릭스

> EP-06 은 **심이 없고 프론트가 부르지도 않으므로**(단건 N회로 대체) 이 매트릭스에 행이 없다(§7.7). 아래 5행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터가 재인증으로. 화면은 FS-052-EL-011 배너 | **403** 컬렉션 — 영업 기회 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-052-EL-010 의 '진짜 0건' 분기 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-052-EL-011 (화면이 status 로 분기하지 않아 403·429·500 이 같은 배너 — FS-052 §7 #23) | 5초 → 504 → FS-052-EL-011 |
| EP-02 상세 | 400 — id 형식 위반 | 401 → 전역 인터셉터. 화면은 FS-052-EL-018 배너 | **읽기 권한 없음 → 404 은닉**(§7.1). 읽기 권한이 있는 `operator` 에게는 403 | **404 `PROJECT_NOT_FOUND`** — **화면이 이것을 정확히 소비한다**: `isNotFound` → `loadFailure='not-found'` → '찾을 수 없습니다' + **'다시 시도' 숨김**(`ProjectFormPage.tsx:248-256`). EXC-12 충족 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-052-EL-018 의 `'error'` 분기(다시 시도 + 목록으로) | 5초 → 504 → 위와 동일 |
| EP-03 등록 | 400 `VALIDATION_FAILED` — §3 표 위반(`name` 필수/80자 · `accountName` 필수/60자 · `probability`/`progress` 0~100 정수 · `expectedRevenue` 정수/1조 이하 · `ownerName` 30자 · `note` 500자 · 마일스톤 12개/각 60자 · `deliverables` 50개/각 200자). `error.fields` 로 내려보낸다 — **프론트가 이것을 필드 인라인 에러로 정확히 매핑한다**(§6.1) | 401 → 전역 인터셉터. **미저장 폼 내용은 유실된다**(FS-052 §7 #27) | `operator` 도 등록이 허용되므로 역할 부족 403 은 영업 쓰기 권한 없는 그 밖의 역할에만 | N/A — 생성이라 대상이 없다 | N/A — **`Idempotency-Key` 재요청은 409 가 아니라 최초 응답 재생**이다(멱등). 프로젝트명 중복은 허용한다(§7.5 — 자연 키가 없다) | **422 `INVALID_PERIOD`**(`endAt < startAt`) · **422 `LOST_REASON_REQUIRED`**(`stage='lost'` 인데 사유 공백). **전이 422 는 등록에 걸리지 않는다**(시작점이 없다 — §4 EP-03) | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-052-EL-019 배너 + **참조 코드**(`referenceOf(cause)` — `useCrudForm.ts:195`), 입력 보존 | 5초 → 504 → FS-052-EL-019. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다. 504 후 재시도는 **같은 `Idempotency-Key`** 를 재사용해 이중 등록을 막는다 |
| EP-04 수정 | EP-03 과 동일 + `id` 형식 | 401 → 전역 인터셉터 | EP-03 과 동일. **읽기 권한 없음 → 404 은닉** | **404 `PROJECT_NOT_FOUND`** — 존재한 적 없는 id. **프론트 어댑터는 이 경우 409 를 던진다**(`crud.ts:126-128`) — 픽스처에는 '존재한 적 없음'과 '먼저 삭제됨'을 가를 정보가 없기 때문이다. 서버는 둘을 가른다(§7.3) | **409 `CONFLICT`** — ① 낙관적 동시성 토큰(`If-Match`/`version`) 불일치 ② 대상이 그 사이 삭제됨. **화면이 이것을 정확히 소비한다** — `isConflict` → `FormConflictDialog`(`ProjectFormPage.tsx:532`)가 **입력을 보존한 채** '최신 불러오기'/'닫기'를 준다(`useCrudForm.ts:166-179`). **EXC-04 의 UI 절이 이 화면에서 이미 충족**이다 | **422 `INVALID_STAGE_TRANSITION`**(§3 `STAGE_FLOW` 위반 — 예: `won`→`lead`, `lead`→`won`) · **422 `INVALID_PERIOD`** · **422 `LOST_REASON_REQUIRED`**. **프론트에 전이 1차 차단이 없어 첫 422 가 유일한 방어선**이다(§7.2). **프론트가 422 의 `violations` 를 필드에 꽂고 포커스를 옮긴다**(`useCrudForm.ts:182-192`) — 단 `stage` 는 select 라 인라인 에러 슬롯이 `FormField error` 로 연결돼 있지 않다(§7.2 프론트 후속) | 429 분당 60 | 500 + `traceId` → FS-052-EL-019 + 참조 코드 | 5초 → 504. 재시도는 같은 `Idempotency-Key` |
| EP-05 삭제 | 400 — id 형식 위반 | 401 → 전역 인터셉터 | **`admin` 전용이라 `operator` 는 403 `FORBIDDEN`**(§7.6) — 이미 프로젝트의 존재를 아는 주체이므로 은닉하지 않는다. **읽기 권한 없음 → 404 은닉** | **404 `PROJECT_NOT_FOUND`** — 존재한 적 없는 id. 프론트 어댑터는 409 로 던진다(`crud.ts:139-141`) | **409 `CONFLICT`** — 이미 삭제됨. **화면이 다이얼로그 내부 배너로 그린다**(`useCrudList.tsx:112` '삭제하지 못했습니다…') — **409 를 문구로 구분하지 않는다**(§7.7 프론트 후속). 일괄 삭제 중 일부가 409 면 `settleAll` 이 실패로 세어 'N건 중 M건' 배너 | N/A — 삭제에 상태 규칙이 없다. **`won` 프로젝트의 삭제를 막을 것인가는 A01 소관**(§7.6) | 429 분당 30. **일괄 삭제가 N개 요청을 병렬로 내므로 100건 선택 시 즉시 429 에 걸린다**(§7.7) | 500 + `traceId` → 다이얼로그 배너 | 5초 → 504 → 다이얼로그 배너. **취소/Esc 가 in-flight 를 abort** 하고 `reset()` 한다(`useCrudList.tsx:86-92`) — false toast 없음 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `projectAdapter.fetchAll(signal)` | `GET /api/sales/projects` (`:66`) | EP-01 | `readonly Project[]` | O |
| `projectAdapter.fetchOne(id, signal)` | `GET /api/sales/projects/:id` (`:66`) | EP-02 | `Project` | **O — 404 를 `HttpError` 로 던지고 화면이 그것을 소비한다**(EXC-12 충족) |
| `projectAdapter.create(input, context?)` | `POST /api/sales/projects` (`:66`) | EP-03 | `void` | **O — `context.idempotencyKey` 를 실제로 받는다**(`useCrudForm.ts:235`) |
| `projectAdapter.update(id, input, context?)` | `PUT /api/sales/projects/:id` (`:66`) | EP-04 | `void` | **△ — 낙관적 동시성 토큰이 없다**(§7.3). 멱등키·409 UI 는 충족 |
| `projectAdapter.remove(id, context?)` | `DELETE /api/sales/projects/:id` (`:66`) | EP-05 | `void` | **△ — `Idempotency-Key` 를 실을 자리가 없다**(`DeleteVars` — `crud.ts:319-322`). 확인 다이얼로그가 그 자리를 대신한다(의도) |
| `settleAll(ids, remove)` (`crud.ts:349-350`) | **없음** | **EP-06 심 없음(미정)** | `number`(실패 건수) | **X — 서버 일괄 개념이 없다. 단건 N회다**(§7.7) |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token` 헤더 · `context.idempotencyKey` → `Idempotency-Key` 헤더 · 404/409/422 → `HttpError` 변환(`isNotFound`/`isConflict`/`isUnprocessable` 판정 경로가 이미 `shared/errors/http-error.ts` 에 있다) · **422 의 `violations` 를 `HttpError.violations` 로 파싱**(`useCrudForm.ts:182-191` 이 그것을 읽는다).

### 6.1 시그니처를 바꿔야 하는 항목 — **없다**

BE-026 §6 은 두 동기 store 호출 때문에, BE-051 §6.1 은 `quoteId` 입력 제거 때문에 화면 코드가 함께 바뀐다고 경고했다. **이 화면에는 그 문제가 없다** — 모든 서버 접점이 `CrudAdapter` 시그니처 안에 있고, 동기 store 직접 호출이 0건이며, 서버가 소유해야 할 필드가 `ProjectInput` 에 섞여 있지 않다.

**즉 어댑터 본문만 fetch 로 바꾸면 연동이 끝난다.** 이 섹션 3화면 중 **유일하게 그렇다.** 이유는 하나다 — **이 화면이 공용 CRUD 프레임워크를 전량 소비하기 때문**이다(`useCrudList`·`CrudListShell`·`useCrudForm`·`createCrudAdapter`).

**단 §7.4(페이징)·§7.3(동시성 토큰)을 채택하면 그때는 화면이 함께 바뀐다** — 연동 산정에 포함할 것.

## 7. 핵심 판정

### 7.1 프로젝트 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/sales/projects` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 프로젝트 리소스의 존재 자체가 영업 기밀이다** → 영업 도메인 **읽기 권한이 없는** 주체에게는 **404 `PROJECT_NOT_FOUND`** 로 은닉한다.

**근거**: 프로젝트 1건은 `accountName`(거래처 실명) · `expectedRevenue`(예상 계약 금액) · `probability`(수주 확률) · `lostReason`(경쟁 패인) · `note`(협상 카드)를 담는다. 시드가 그 민감도를 그대로 보여준다 — `'경쟁사 대비 가격 우위. 협상 마무리 단계.'`(`data-source.ts:28`) · `'경쟁사 대비 납기 조건 불리'`(`:59`). **이것은 회원 개인정보와 종류가 다른 민감정보이되 민감도가 낮지 않다**: 프로젝트 id 열거로 '우리 회사가 어느 거래처와 얼마짜리를 몇 % 확률로 협상 중인가'를 알아내는 경로는 경쟁사에게 그대로 가치다. BE-003 §3.2 가 `GET /api/members/:id` 를 404 로 은닉하는 것과 **같은 이유로** `GET /api/sales/projects/:id` 도 404 여야 한다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 삭제에서 거절될 때는 **403** 을 준다(§7.6) — 이미 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다.

**프론트 영향**: **이 화면은 404 를 정확히 소비한다** — `useCrudForm` 의 `isNotFound` 판정이 '프로젝트 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'(재시도 없음)를 그린다(`ProjectFormPage.tsx:248-256`). 은닉이 성립하면서도 정당한 운영자가 원인을 안다 — **FS-051·FS-026 과 갈리는 지점**이다. (단 그 문구는 조사가 빠진 비문이다 — FS-052 §7 #4.)

### 7.2 단계 전이 규칙이 코드에 없다 — 서버가 정본을 신설한다 【정합 판정】

**코드로 재확인한 사실**: `PipelineStepper` 는 **읽기 전용 표시**다 — `PipelineStepper.tsx:74-93` 에 `onClick`·`onKeyDown`·`<button>` 이 **하나도 없고** `<ol>` 안에 `<span>` 만 있다. 즉 **스텝퍼는 전이를 강제하기는커녕 전이의 입력조차 아니다.** 실제 단계 변경은 select(`ProjectFormPage.tsx:350-366`)가 하고, 그 select 는 `STAGES` 6개를 **언제나 전부** 렌더한다. `validation.ts:39` 는 `z.enum([...])` 뿐이고 `types.ts` 에 `canSetStage`/`STAGE_FLOW` 가 없다. **전이 규칙은 어느 층에도 없다.**

**이것이 만드는 사고**:
- **리드에서 곧장 수주로** 갈 수 있다 — 상담도 제안도 협상도 없이 수주가 집계된다. `PipelineStepper` 는 그 순간 5칸을 모두 채워 그린다(`done = index <= currentIndex`) — **화면이 '이 단계들을 거쳤다'고 말하는데 실제로는 아니다.**
- **수주(`won`)에서 리드로 되돌아갈** 수 있다 — 파이프라인 전환율 통계가 무너진다.
- **실주에서 다른 단계로 되돌아가면 `lostReason` 이 조용히 `''` 가 된다**(`ProjectFormPage.tsx:168` — `values.stage === 'lost' ? trim : ''`). 경쟁 패인 기록이 클릭 한 번에 사라지고 되돌릴 수 없다.
- **단계 변경이 확률을 덮어쓴다**(`:234-238`) — 협상에서 85%로 손조정한 뒤 제안으로 후퇴시켰다 다시 협상으로 오면 **85가 아니라 70**이다. 이것은 규칙이 아니라 편의인데 **손실이 비가역**이다.

**판정**: 서버가 §3 의 `STAGE_FLOW` 를 정본으로 신설하고 **422 `INVALID_STAGE_TRANSITION`** 으로 강제한다. 프론트에 1차 차단이 없으므로 **이 422 는 유일한 방어선**이며 관용적으로 처리해선 안 된다.

**이 표의 근거는 코드 안에 있다** — FS-051(문의)과 다르게, 이 도메인에는 전이 규칙의 **형태**가 이미 그려져 있다: `PIPELINE_FLOW`(`types.ts:73-75`)는 `inFlow` 단계를 순서대로 담은 배열이고, `PipelineStepper` 는 그 순서를 화면에 그린다. **화면이 매일 운영자에게 보여주는 그 순서가 규칙이 아니라면 그것은 거짓말이다.** §3 의 표는 그 순서를 계약으로 승격한 것이다.

**단, 세 가지는 정책 결정이라 A01 확정이 선행돼야 한다**: ① 후퇴 허용 범위(제안→상담을 허용할지) ② `won` 종착 여부(수주 후 실주로 뒤집는 일이 실무에 있는지) ③ `lost` → `qualified` 재접촉(시드 `prj-3` 의 note 가 그 시나리오를 담고 있어 제안했다). **확정 전에 서버가 임의의 표를 강제하면 운영자가 정당한 전이에서 막힌다** — A01 확정과 서버 구현은 같은 배치여야 한다.

**프론트 후속(A11)**: 확정된 표는 **3중으로** 내려와야 한다 — ① select 선택지를 `allowedNextStages(현재)` 로 좁힘 ② `PipelineStepper` 에 `aria-current="step"` 추가(지금은 현재 단계가 색·굵기로만 인코딩 — FS-052 §7 #21) ③ 저장 직전 재확인. 지금은 서버 422 하나뿐이며, **그 422 조차 `stage` select 에 인라인 에러 슬롯이 없어**(`ProjectFormPage.tsx:350-366` 의 `FormField` 에 `error` prop 이 없다) `setError('stage', …)`(`useCrudForm.ts:184`)가 꽂혀도 **화면에 아무것도 안 뜬다.** 이것을 함께 고쳐야 422 가 실제로 보인다 — §7.8 #3.

### 7.3 마일스톤 id 와 낙관적 동시성 【정합 판정】

**마일스톤 id 를 클라이언트가 만든다**: `ms-new-${Date.now()}-${Math.round(Math.random() * 1000)}`(`ProjectMilestonesField.tsx:59-64`). 두 문제가 있다.
1. **충돌 가능**: 난수 공간이 1,001 이라 같은 밀리초에 두 행을 추가하면 1/1001 로 충돌한다. React 의 `key` 와 `patch(id, …)`(`:79-83`)가 그 id 로 행을 식별하므로 **충돌하면 두 행이 함께 편집된다.**
2. **접두사가 영구히 남는다**: `ms-new-…` 로 만들어진 id 가 그대로 저장된다 — `toInput` 은 이름만 trim 하고 id 를 건드리지 않는다(`ProjectFormPage.tsx:163-166`). 즉 **DB 에 `ms-new-1752...` 같은 id 가 영구 보존**되며, '신규'라는 뜻의 접두사가 3년 된 마일스톤에 붙어 있게 된다.

**판정**: **마일스톤 `id` 는 서버가 채번한다.** 요청 바디의 마일스톤 id 중 **저장된 프로젝트에 이미 존재하는 id 는 그 행의 갱신**으로, **모르는 id(또는 `ms-new-` 접두)는 신규 행**으로 보고 **서버가 새 id 를 부여**한다. 응답은 서버 id 를 담은 `Project` 여야 하고, 프론트는 저장 후 목록으로 이동하므로(`useCrudForm.ts:223`) 다음 수정 진입 시 서버 id 를 받는다 — **화면 코드 변경 없이 성립한다.**

**낙관적 동시성 — 정확히 쓴다**: 어댑터의 409(`crud.ts:126-128`)는 **'대상이 존재하는가'** 만 본다 — `Project` 에 `version`/`updatedAt`/`etag` 필드가 **없다**(`types.ts:18-38`). 따라서:
- **해소된 것**: 유령 저장. 다른 관리자가 지운 프로젝트를 편집하면 409 가 나고 `FormConflictDialog` 가 입력을 보존한 채 뜬다(`ProjectFormPage.tsx:532`) — **EXC-04 의 UI 절이 이 화면에서 이미 충족**이다.
- **남은 것**: **둘 다 존재하는 프로젝트를 두 관리자가 동시에 편집하면 409 없이 last-write-wins** 다. A 가 확률을 85로, B 가 예상매출을 5,000만으로 바꾸면 **나중 저장이 앞선 변경을 통째로 덮는다**(전체 치환 PUT). 이 둘을 뭉개면 안 된다.

**판정**: 서버가 **`Project.version`(정수) 또는 `If-Match` ETag** 를 도입하고 불일치 시 409 를 준다. **프론트 비용이 거의 0 이다** — `FormConflictDialog` 가 이미 있고 `useCrudForm` 의 `isConflict` 분기가 이미 그것을 띄운다(`useCrudForm.ts:166-179`). **`ProjectInput` 에 `version` 을 얹고 어댑터가 `If-Match` 헤더로 보내면 화면 코드 0줄로 성립한다.** 이 섹션에서 **동시성 토큰의 투자 대비 효과가 가장 높은 화면**이다 — 나머지 두 화면은 UI 부터 만들어야 한다.

**단 `Milestone` 배열의 동시 편집은 토큰으로도 해결되지 않는다** — 전체 치환이라 A 가 마일스톤 1개를 추가하고 B 가 다른 1개를 추가하면 하나가 사라진다. 토큰이 있으면 **409 로 알려주기라도 한다**는 것이 이 판정의 값어치다(BE-051 §7.3 의 타임라인처럼 append-only 로 쪼갤 필요는 없다 — 마일스톤은 감사 기록이 아니라 편집 대상이다).

### 7.4 목록이 전량·전문을 내려준다 — 페이징과 금액 상한

**현재 계약의 두 문제**:
1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 필터·검색·정렬을 전부 클라이언트에서 한다. **`CrudListShell` 자체에 `<Pagination>` 이 없다**(`CrudListShell.tsx:97-169` 에 0건) — 이 화면만의 문제가 아니라 **셸 소비 화면 전부에 걸린다.**
2. **목록이 상세 전문을 담는다.** `Project` 타입 하나를 목록·상세가 공유해 목록 응답에 `milestones`(최대 12개 × 4필드) · `deliverables` · `lostReason`(경쟁 패인) · `note`(협상 카드)가 실린다 — **목록 화면이 쓰지 않는 필드**이며, §7.1 의 취지와 충돌한다: 목록 한 번 조회로 **모든 프로젝트의 협상 메모가 브라우저에 내려온다.**

**판정**: **`ProjectSummary` / `Project` 를 분리**하고, EP-01 에 `stage`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ProjectSummary` 는 `milestones`·`deliverables`·`lostReason`·`note` 를 뺀다(목록이 쓰는 것은 `name`·`accountName`·`stage`·`expectedRevenue`·`startAt`·`endAt`·`progress` 뿐 — `ProjectListPage.tsx:133-158`).

**금액 상한 — §3 이 신설한 1조의 근거**: `expectedRevenue` 는 `^\d+$` 만 본다(`validation.ts:41-45`). 상한이 없으면 ① 오타('42000000' 대신 '420000000')가 그대로 저장돼 **파이프라인 합계를 조 단위로 오염**시키고 ② `weightedRevenue` 의 `Math.round(expectedRevenue * probability / 100)`(`types.ts:96`)가 `Number.MAX_SAFE_INTEGER`(9,007조)를 넘으면 **정밀도가 조용히 깨진다.** 1조는 국내 B2B 단일 영업 기회의 현실적 상한을 넉넉히 덮으면서 안전 정수 범위를 지킨다. **A01 이 다른 값을 정하면 따른다** — 중요한 것은 상한이 **존재해야 한다**는 것이다.

**이관**: 페이징은 **프론트 대공사**다 — `filterProjects`/`searchProjects`/`sortProjects` 가 서버로 올라가고, 페이지네이션 UI(FS-052 §7 #2)·`SeqCell` 오프셋(#12)·`clampPage`(STATE-04-a)가 함께 붙어야 한다. **IA-13 은 이 화면에서 이미 충족**(`useListState` 소비)이라 `page` 키만 얹으면 되고 `clampPage`(`useListState.ts:217-223`)도 준비돼 있다. **셸에 붙이면 소비 화면 전부가 함께 받는다** — 한 배치로 묶는 것이 옳다. 금액 상한은 **지금 당장 넣을 수 있다**(서버 400 + 프론트 zod 한 줄).

### 7.5 프로젝트는 고립된 레코드다 — 그것이 이 계약의 가장 큰 미결이다 【도메인 판정】

**코드로 확인한 사실**: `Project`(`types.ts:18-38`)에 **다른 리소스로 가는 참조가 하나도 없다.**
- 거래처: `accountName: string` — **자유 텍스트**(`ProjectFormPage.tsx:316-335` 가 `<input type="text" placeholder="예: (주)한빛소프트웨어">`). `/sales/accounts` 의 `Account.id` 참조가 아니다.
- 담당자: `ownerName: string` — 자유 텍스트, 운영자 계정 참조 아님.
- 견적·계약·문의: **필드 자체가 없다.**

**이것이 만드는 사고**:
1. **거래처를 개명·병합해도 프로젝트는 옛 이름을 들고 있다** — 참조가 아니라 **조회 시점 사본**이기 때문이다. 사업자등록번호로 정규화된 거래처 마스터(`_shared/business.ts:29-42` `isValidBizNo`)가 이미 있는데 프로젝트가 그것을 쓰지 않는다.
2. **표기 흔들림이 집계를 깬다** — '(주)한빛소프트웨어'와 '한빛소프트웨어'가 두 거래처가 된다. **거래처별 파이프라인 합계를 낼 수 없다** — 그것이 CRM 파이프라인의 첫 번째 질문인데도.
3. **수주(`won`) 프로젝트가 계약으로 이어지지 않는다** — `/sales/contracts` 에 그 프로젝트로 가는 링크가 없고 반대도 없다. FS-051(문의→견적)이 `quoteId` 로 양방향 링크를 만든 것과 대조된다 — **같은 섹션 안에서 도메인 연결 전략이 갈렸다.**

**판정: 이 문서는 참조를 신설하지 않는다.** 근거 — ① 코드에 필드가 없어 심으로 삼을 것이 없고 ② 참조를 도입하면 `ProjectInput` 이 바뀌어 **화면·검증·목록 셀이 전부 바뀐다**(§6.1 의 '어댑터만 바꾸면 된다'가 무너진다) ③ 무엇보다 **어느 방향으로 연결할지는 도메인 결정**이다(프로젝트가 견적을 갖는가, 견적이 프로젝트를 갖는가, 계약이 둘 다 갖는가).

**그러나 이것은 '미구현'이 아니라 '미결'이다** — 백엔드 착수 전에 반드시 답이 나와야 한다. `accountName` 을 자유 텍스트로 서버에 저장하기 시작하면 **나중에 마스터로 정규화할 때 문자열 매칭으로 소급 연결해야 하고, 그때는 이미 표기가 흔들려 있다.** A01 이관 — §7.8 #5. **연동 순서 권고: 거래처 참조(`accountId`) 결정이 프로젝트 백엔드 착수보다 앞서야 한다.**

**프로젝트명 중복을 허용하는 이유**(§5 EP-03 의 409 N/A): 자연 키가 없다 — 같은 거래처에 '2026 ERP 구축'이 두 번 있을 수 있고(1차/2차), `accountName` 이 자유 텍스트라 '거래처+이름' 조합도 신뢰할 수 없다. 중복 검사를 넣으면 **자유 텍스트의 흔들림 때문에 오탐이 난다.** 참조가 도입되면(위) 이 판정을 재검토한다.

### 7.6 삭제는 `admin` 전용이다 — `operator` 는 등록·수정까지 【권한 판정】

BE-051 §7.6 은 문의 응대가 영업 담당자의 본업이라 `operator` 에게 쓰기를 열었다. **파이프라인 관리도 같다** — 시드의 담당자가 '이영업'·'박계약'·'이수주'인 것(`data-source.ts:19,39,55`)이 이 도메인이 담당자 다수를 전제함을 보여준다. `operator` 가 자기 기회를 등록·수정할 수 없다면 이 화면을 쓸 사람이 `admin` 뿐이다.

**그러나 삭제는 다르다** 【판정】: 프로젝트는 **파이프라인 집계의 단위**다. 하나가 사라지면 그 분기의 예상매출·전환율이 조용히 바뀌고, **삭제된 것은 집계에서 '없었던 일'이 된다** — 실주(`lost`)로 남기는 것과 근본적으로 다르다. 실주는 '졌다'는 기록이고 삭제는 '없다'는 주장이다. **영업에서 진 기회를 지우고 싶은 유인은 실재한다.**

**결론**: `DELETE /api/sales/projects/:id` 는 **`admin` 전용**. `operator` 에게는 403 `FORBIDDEN`(404 은닉 대상 아님 — 이미 존재를 안다). **오등록 정정은 `admin` 이 하고, `operator` 는 실주로 닫는다.**

**추가 판정이 필요한 것**: **`won` 프로젝트의 삭제를 막을 것인가.** 수주 프로젝트는 계약·매출로 이어지므로 지워지면 안 될 가능성이 높지만, **§7.5 가 미결이라 그 연결이 코드에 없다** — 무엇이 이 프로젝트를 참조하는지 서버가 알 수 없으므로 지금은 판정할 수 없다. §7.5 확정 후 재검토 — §7.8 #6.

**프론트에는 이 분기가 없다**: `RowActions` 의 휴지통(`CrudTable.tsx:192-197`)과 '선택 N건 삭제'(`CrudListShell.tsx:126-132`)가 **무조건 렌더**된다. `ProductListPage` 가 같은 셸을 쓰면서 `useRouteWritePermissions` 로 게이팅하므로 **선례가 있다** — §7.8 #4.

### 7.7 일괄 삭제는 서버 개념이 아니다 — 만들지 않는다 【연동 판정】

`CrudListShell` 의 '선택 N건 삭제'(FS-052-EL-007·EL-013)는 서버 일괄 엔드포인트를 부르지 않는다. `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`)가 **단건 삭제를 N번 병렬로** 낸다. `data-source.ts:66` 의 심에도 일괄 경로가 없다.

**판정: `DELETE /api/sales/projects?ids=` 나 `POST /api/sales/projects/bulk-delete` 를 만들지 않는다.** 심이 없고, 프론트가 그것을 부를 코드도 없다. **엔드포인트를 발명하지 않는다.**

**그러나 현 형태에는 서버가 대비해야 할 것이 있다**:
1. **레이트리밋에 즉시 걸린다** — 100건을 선택해 삭제하면 `DELETE` 100개가 **동시에** 나간다. EP-05 의 분당 30 이면 30건째부터 429 다. `settleAll` 은 그것을 실패로 세어 'N건 중 70건을 삭제하지 못했습니다' 배너를 띄우고(`useCrudList.tsx:138-142`), **운영자는 무엇이 지워졌는지 모른 채 재시도해 다시 100개를 낸다.** 이미 지워진 70건은 409 가 되고 결과가 더 헷갈린다.
2. **트랜잭션이 아니다** — 부분 성공이 정상 경로다.
3. **`settleAll` 이 실패한 id 를 돌려주지 않는다**(반환값이 `number` — `crud.ts:349`) → retry 가 전체를 재실행한다(quality-bar EXC-10 P1).

**판정**: 서버는 **EP-05 의 레이트리밋을 분당 30 으로 두되, 일괄 삭제가 도입되기 전까지 이 화면의 '선택 N건 삭제'에 UI 상한(예: 20건)을 두는 것을 프론트에 권고**한다. 진짜 해법(일괄 엔드포인트 또는 순차 실행 + 진행률)은 quality-bar EXC-18 P1 배치에 속하며, **그때 심이 생기면 이 문서를 갱신한다** — §7.8 #7.

**409 문구가 뭉개지는 것도 함께**: 어댑터가 '이미 삭제된 항목입니다.'(`crud.ts:140`)를 던지는데 화면은 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`useCrudList.tsx:112`)로 덮는다 — **재시도해도 영원히 없는 항목에 재시도를 권한다.** EXC-12 가 폼에서 푼 문제를 삭제 다이얼로그가 그대로 갖고 있다 — §7.8 #8.

### 7.8 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **단계 전이 규칙 확정(§7.2)** — §3 의 표는 **제안**이다(`PIPELINE_FLOW` 의 순서를 계약으로 승격). A01 확정과 서버 구현이 같은 배치여야 하고, 확정 후 프론트에 3중 방어(select 좁히기 · `aria-current="step"` · 저장 전 재확인)를 내려야 한다 | **A01 (선행)** · A63 · A11 |
| 2 | **낙관적 동시성 토큰(§7.3)** — `Project.version` 또는 `If-Match`. **프론트 비용이 거의 0** 이다(`FormConflictDialog` + `isConflict` 분기가 이미 있다) — 이 섹션에서 투자 대비 효과가 가장 높다 | A63 · A11 (저비용) |
| 3 | **`stage` select 에 인라인 에러 슬롯이 없다** — `FormField htmlFor="project-stage"` 에 `error` prop 이 없어(`ProjectFormPage.tsx:350`) 서버 422 의 `setError('stage', …)` 가 꽂혀도 **화면에 아무것도 안 뜬다.** §7.2 의 422 를 실제로 보이게 하려면 이것이 선행돼야 한다 | A11 (§7.2 와 한 묶음) |
| 4 | **쓰기 게이팅 미배선(§7.6)** — 등록·행 액션·일괄 삭제·제출이 무조건 렌더된다. **`ProductListPage` 가 같은 셸에서 `useRouteWritePermissions` 를 쓰는 선례가 있다**(EXC-03 P0) | A11 change_request |
| 5 | **프로젝트가 고립된 레코드다(§7.5)** — 거래처가 참조가 아니라 자유 텍스트 사본이고, 견적·계약·문의와의 연결이 없다. **거래처 참조(`accountId`) 결정이 백엔드 착수보다 앞서야 한다** — 자유 텍스트로 저장하기 시작하면 소급 정규화가 불가능해진다 | **A01 (최우선 · 선행)** · A63 |
| 6 | **`won` 프로젝트의 삭제를 막을 것인가(§7.6)** — §7.5 가 미결이라 무엇이 이 프로젝트를 참조하는지 알 수 없어 지금은 판정 불가 | A01 (§7.5 후) · A63 |
| 7 | **일괄 삭제가 단건 N회다(§7.7)** — 100건 선택 시 즉시 429. 서버 일괄 엔드포인트를 만들지 않았으므로 **프론트에 UI 상한 또는 순차 실행 + 진행률**이 필요하다. `settleAll` 이 실패 id 를 안 돌려줘 retry 가 전체를 재실행한다(EXC-10 · EXC-18 P1) | A11 (셸 배치) · A63 |
| 8 | **삭제 다이얼로그가 409 를 뭉갠다(§7.7)** — 어댑터의 '이미 삭제된 항목입니다.'가 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'로 덮여 **영원히 없는 항목에 재시도를 권한다**. 폼(EXC-12)이 푼 문제를 삭제가 그대로 갖고 있다 | A11 (셸 배치) |
| 9 | **마일스톤 id 를 서버가 채번한다(§7.3)** — 클라이언트의 `ms-new-<Date.now()>-<난수>` 가 충돌 가능(1/1001)하고 **'신규' 접두사가 영구 보존**된다. **화면 코드 변경 없이 성립**한다 | A63 |
| 10 | **금액·길이 상한 신설(§3·§7.4)** — `expectedRevenue` 1조 · `ownerName` 30자 · 마일스톤 12개/각 60자 · `deliverables` 50개/각 200자 · `note`/`lostReason` 상한. **`expectedRevenue` 상한은 `weightedRevenue` 의 정밀도 문제라 지금 당장 넣을 수 있다**(서버 400 + 프론트 zod 한 줄) | A63 · A11 (저비용) |
| 11 | **목록 페이징 + `ProjectSummary` 분리(§7.4)** — 목록이 **모든 프로젝트의 협상 메모·실주 사유**를 내려보낸다. **`CrudListShell` 에 `<Pagination>` 이 없는 것이 근본 원인**이라 셸에 붙이면 소비 화면 전부가 함께 받는다. IA-13 은 이미 충족이라 `page` 키만 얹으면 된다(IA-04 P0) | A63 · A11 (셸 배치) |
| 12 | **폼 조회 실패 문구가 비문이다** — '프로젝트 찾을 수 없습니다'/'프로젝트 불러오지 못했습니다'에 조사 '를' 이 빠졌다(`ProjectFormPage.tsx:249-250`). `objectParticle` 이 이미 있고 같은 훅이 토스트에서 쓴다. 형제 화면(`QuoteFormPage`·`ContractFormPage`)은 옳다(ERP-13 P1) | A11 change_request (저비용) |
| 13 | **마일스톤 힌트가 사실과 다르다** — '완료 표시에 따라 아래 진척률이 계산됩니다'라 쓰여 있지만 `milestoneProgress` 는 표시 전용이고 `progress` 를 바꾸지 않는다. **문구를 고치거나 자동 계산을 구현해야 한다 — 어느 쪽인지는 도메인 결정**이다(진척률이 마일스톤 파생이면 그것은 입력 필드가 아니어야 한다) | A01 (결정) · A11 |
| 14 | **단계 변경이 확률을 확인 없이 덮는다** — 손조정한 확률이 비가역으로 사라진다(`ProjectFormPage.tsx:234-238`). 기본 확률은 **등록 시 초기값**으로만 쓰고 수정 시에는 덮지 않는 것이 옳을 수 있다 | A01 (결정) · A11 |
| 15 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 폼 내용이 유실**된다(EXC-19 P1). 프론트 타임아웃 상한 없음(EXC-05 P1) | A11 · A40 |

## 8. 자기 점검

- [x] FS-052 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 5건(EP-01~05) 매핑 완료, **심 없는 1건(EP-06 일괄 삭제)을 '심 없음(미정)' 으로 명시**하고 §7.7 판정을 남겼다
- [x] **엔드포인트를 발명하지 않았다** — EP-01~05 는 전부 `data-source.ts:66` 심 한 줄(`GET/POST /api/sales/projects · GET/PUT/DELETE /api/sales/projects/:id`)의 메서드·경로 그대로다. 심 없는 경로 0건
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (5행 × 9열 — 심 없는 EP-06 이 행이 없는 이유를 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한 고유 차이 2건**(`operator` 등록·수정 허용 · **삭제는 `admin` 전용** — §7.6)을 근거와 함께 기술
- [x] **`PipelineStepper` 가 상태 전이 컨트롤이 아니라 읽기 전용 표시임을 코드로 확인**(`PipelineStepper.tsx:74-93` — onClick 0건)하고, **전이 규칙이 어느 층에도 없음을 §1.1 대조표에 grep 근거로** 남겼다. §3 의 표가 **코드 서술이 아니라 계약이 신설하는 제안**임을 명시하고 A01 확정을 선행 조건으로 §7.2·§7.8 #1 에 걸었다 — **없는 규칙을 있는 것처럼 쓰지 않았다**
- [x] **§5 의 422 상태위반 축에 전이(`INVALID_STAGE_TRANSITION`)를 정확히 반영**하고, **그 422 가 프론트에서 보이지 않는다는 사실**(`stage` select 에 `error` 슬롯 부재)까지 §7.2·§7.8 #3 에 적었다
- [x] 멱등성 판정 — 조회 GET 멱등 / 등록·수정은 **`Idempotency-Key` 를 프론트가 실제로 보낸다**(`useCrudForm.ts:211,228,235`) / **삭제는 키 자리가 없다**(`DeleteVars` — 확인 다이얼로그가 대신하는 의도된 설계)
- [x] **【보안 판정】 3건 이상** — 403 vs 404 은닉(§7.1 — 영업 기밀의 민감도 근거) · **목록이 모든 프로젝트의 협상 메모·실주 사유를 내려보냄(§7.4)** · **삭제 권한 분리(§7.6 — 진 기회를 지우려는 유인)** · 정합 판정(§7.2 전이 부재 · §7.3 동시성 토큰 부재 + 마일스톤 id 위조)
- [x] 어댑터가 `createCrudAdapter` 임을 확인하고(§1.1) 404·409·멱등원장이 **발현될 뿐 아니라 화면이 실제로 소비함**을 대조했다(404 → `loadFailure` 분기 · 409 → `FormConflictDialog` · 키 → `takeIdempotencyKey`). **409 가 '존재 여부' 기반이지 version/ETag 토큰이 아니며 동시 편집은 last-write-wins 임**을 §7.3 에 못 박았다
- [x] **일괄 삭제가 서버 개념이 아니라 단건 N회임을 코드로 확인**(`crud.ts:349-350`)하고 엔드포인트를 만들지 않았으며, 그 형태가 만드는 429 사고를 §7.7 에 기록했다
- [x] **`ProjectMilestonesField`(동적 배열)의 계약 문제**(id 채번·개수 상한·길이 상한)를 §3·§7.3 에 반영했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
