---
id: BE-067
title: "사이트 설정 백엔드 기능 명세"
functionalSpec: FS-067
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-067. 사이트 설정 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-067 사이트 설정 (`/settings/site`) |
| 범위 | 사이트 설정 문서 1건의 조회·저장. 낙관적 동시성(revision/ETag) · 감사 추적(누가 언제) |
| **범위 밖** | **유지보수 모드의 실제 집행** — 이 계약은 `maintenanceMode` 를 **저장**할 뿐 방문자 요청을 막는 주체가 아니다. 사이트 게이트웨이·프론트 서버가 이 값을 읽어 집행한다(별도 계약 — §7.6 #6). **표시 시간대의 적용** — 저장될 뿐 어드민 렌더가 읽지 않는다(FS-067 §7 #6). **설정 이력 조회** — 이 계약은 '마지막 변경자·시각' 1건만 내려주며 변경 이력 목록은 로그 도메인 소관 |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/settings/site/data-source.ts` (`siteSettingsStore` = `createRevisionedStore<SiteSettingsValues>('site', …)`) |
| 도메인 타입 | `apps/admin/src/pages/settings/site/validation.ts` (`SiteSettingsValues` = `z.infer<typeof siteSettingsSchema>`) · 봉투 타입은 `pages/settings/_shared/store.ts` (`Revisioned<T>` · `AuditInfo`) |
| 검증 정본 | **zod 스키마 `siteSettingsSchema`**(`validation.ts:27-77`). 서버는 이 규칙을 재현하되 **프론트 검증을 신뢰하지 않는다**(§7.1) |

### 1.1 코드 대조 근거표

| 계약 항목 | 코드 근거 | 확인 내용 |
|---|---|---|
| 엔드포인트 2건 | `data-source.ts:28` `// TODO(backend): GET /api/settings/site · PUT /api/settings/site` | **심이 실재한다** — 이 문서는 심을 계약으로 옮길 뿐 발명하지 않았다 |
| PUT 요청 형태 | `data-source.ts:29-30` `PUT 요청: If-Match: <revision> 헤더 + 바디 { siteName, siteDescription, baseUrl, contactEmail, contactPhone, timezone, signupEnabled, maintenanceMode, maintenanceMessage }` | 헤더·바디 9필드가 심에 명시돼 있다 |
| 응답 형태 | `data-source.ts:31-32` `응답: 200 → { value, revision, audit } / 409·412 → 동시 편집 충돌(최신 문서를 실어 보낸다) / 422 → 필드 검증 실패` | 200·409·412·422 가 심에 명시돼 있다 |
| 낙관적 동시성 | `_shared/store.ts:124-126` `if (input.force !== true && input.expectedRevision !== current.revision) throw new SettingsConflictError(current)` | **토큰 기반**(존재 여부 기반이 아니다) |
| revision → ETag | `_shared/store.ts:8` '백엔드가 붙으면 revision 은 ETag / If-Match 헤더가 되고, 이 파일의 본문만 교체된다' | 마이그레이션 경로가 코드에 선언돼 있다 |
| 감사 주체 | `_shared/store.ts:83` `// TODO(backend): 저장 주체는 서버가 세션에서 읽어 기록한다 — 프론트가 보내는 값을 신뢰하면 안 된다.` · `:84` `const CURRENT_ADMIN = '김운영'` | **심이 §7.3 을 미리 선언한다** |
| 서버 재검증 | `data-source.ts:32` `422 → 필드 검증 실패(프론트 검증은 UX 이지 보증이 아니다 — 서버가 다시 검증한다)` | §7.1 의 근거 |
| 실패 재현 | `_shared/store.ts:110,116` `failIfRequested(scope, 'load'\|'save')` · `:119` `conflictRequested(scope)` | op 2종 + conflict 스위치 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-010 §1 과 동일 선언). 아래는 사이트 설정 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 조회 + 저장. **`operator` = 조회만** — 시스템 설정 쓰기는 열지 않는다(§7.7). BE-026(1:1 문의)이 `operator` 에게 쓰기를 연 것과 반대 판정이며, 그 근거는 §7.7 에 있다.
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기**: 이 화면은 `useRouteWritePermissions().canUpdate` 로 **쓰기 컨트롤을 게이팅한다**(`SiteSettingsPage.tsx:109` · FS-067-EL-015). 그러나 그것은 UX 층이며 **권한 강제는 서버 책임**이다(`RequirePermission.tsx:8-11` 이 이 경계를 스스로 선언한다: '위조된 localStorage 로 이 가드는 우회된다').

## 3. 데이터 계약

| 타입 | 필드 | 비고 |
|---|---|---|
| `Revisioned<T>` | `value: T` · `revision: string` · `audit: AuditInfo` | 조회·저장 응답의 **봉투**. `_shared/store.ts:24-29` |
| `AuditInfo` | `updatedBy: string` · `updatedAt: string`(ISO) | 마지막으로 이 설정을 바꾼 사람과 시각. `store.ts:17-21` |
| `SiteSettingsValues` | `siteName` · `siteDescription` · `baseUrl` · `contactEmail` · `contactPhone` · `timezone` · `signupEnabled` · `maintenanceMode` · `maintenanceMessage` | 9필드 **평면 객체**(중첩 없음). `validation.ts:27-79` |

**필드 규칙 (`siteSettingsSchema` 대조 — 서버가 정본)**

| 필드 | 타입 | 규칙 | 코드 근거 |
|---|---|---|---|
| `siteName` | string | trim 후 비어 있지 않다 · trim 길이 ≤ **60** | `validation.ts:9,29-32` |
| `siteDescription` | string | 비어도 된다 · trim 길이 ≤ **160** | `validation.ts:10,33-36` |
| `baseUrl` | string | trim 후 비어 있지 않다 · **`^https:\/\/[^\s/]+\S*$`** | `validation.ts:25,37-42` |
| `contactEmail` | string | trim 후 비어 있지 않다 · `^[^\s@]+@[^\s@]+\.[^\s@]+$` | `_shared/validation.ts:35` |
| `contactPhone` | string | trim 후 비어 있지 않다 · `^(\d{2,4})-(\d{3,4})-(\d{4})$\|^\d{4}-\d{4}$` | `_shared/validation.ts:45` |
| `timezone` | enum | `'Asia/Seoul'` \| `'UTC'` | `validation.ts:22,51` |
| `signupEnabled` | boolean | — | `validation.ts:52` |
| `maintenanceMode` | boolean | — | `validation.ts:53` |
| `maintenanceMessage` | string | **교차 규칙**: `maintenanceMode === true` 면 trim 이 비어 있지 않아야 한다 · trim 길이 ≤ **200** | `validation.ts:56-77` |

**교차 규칙 (`.check()` — 서버가 재판정)**

1. `maintenanceMode && maintenanceMessage.trim() === ''` → `maintenanceMessage` 에 위반. 근거: 유지보수 모드를 켜면 방문자는 이 문구만 보게 된다 — **빈 화면을 내보내지 않는다**(`validation.ts:59-67`).
2. `maintenanceMessage.trim().length > 200` → `maintenanceMessage` 에 위반. **모드와 무관하게 걸린다**(`validation.ts:69-76`) — 꺼져 있어도 200자를 넘는 문구는 저장되지 않는다.

**`baseUrl` 이 https 만 받는 이유**: `validation.ts:24` — '사이트 주소가 http 면 로그인 쿠키가 평문으로 흐른다'. 이것은 표시 규칙이 아니라 **보안 규칙**이며 서버가 반드시 재현해야 한다(§7.1).

**길이 상한이 없는 필드**: `baseUrl` · `contactEmail` · `contactPhone` 은 스키마에 길이 규칙이 없고 화면에도 `maxLength` 가 없다(FS-067 §7 #13). **서버는 자체 상한을 둔다** — §7.6 #4.

## 4. 엔드포인트 명세

### BE-067-EP-01 · 사이트 설정 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-067-EL-013, EL-018, EL-019, EL-026 |
| 근거 (심) | `data-source.ts:28` `GET /api/settings/site` |
| 메서드·경로 | `GET /api/settings/site` |
| 권한 | `admin`, `operator`(조회) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**쿼리**: 없다. 단일 문서다.

**응답 200** — `{ value: SiteSettingsValues, revision: string, audit: AuditInfo }`.
- `revision` 은 **불투명 문자열**이다 — 프론트는 이 값을 해석하지 않고 그대로 되돌려 보낸다(`queries.ts:23` '내가 읽은 문서의 토큰'). 서버는 ETag 를 그대로 써도 되고 버전 번호를 써도 된다.
- **`ETag: <revision>` 응답 헤더를 함께 준다** — 어댑터가 본문의 `revision` 을 쓰든 헤더를 쓰든 같은 값이어야 한다(`store.ts:8` 의 마이그레이션 선언).
- `audit.updatedBy` 는 **표시용 이름**이다(운영자가 읽는다). 계정 id 가 아니다 — `AuditNote.tsx:32` 가 그대로 렌더한다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-067-EP-02 · 사이트 설정 저장
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-067-EL-015, EL-020, EL-022, EL-022.2, EL-024, EL-024.4 |
| 근거 (심) | `data-source.ts:28-32` `PUT /api/settings/site` + `If-Match` + 9필드 바디 + 200/409·412/422 |
| 메서드·경로 | `PUT /api/settings/site` |
| 권한 | **`admin` 만**(§7.7) |
| 멱등성 | **조건부 멱등** — `If-Match` 가 있으면 같은 요청의 재시도는 두 번째부터 412/409 로 거절된다(§7.4) |
| 레이트리밋 | 분당 30회 |

**요청 헤더**: `If-Match: <revision>` · `X-CSRF-Token: <token>`.

**요청 바디**: `SiteSettingsValues` 9필드 전체. **부분 갱신(PATCH)이 아니라 전체 치환**이다 — 프론트가 `getValues()` 전량을 보낸다(`SiteSettingsPage.tsx:171`).

**서버 검증 (요청을 그대로 믿지 않는다)**
1. **§3 의 필드 규칙·교차 규칙을 전부 재판정**한다(§7.1). 위반 시 422(§5).
2. **`audit` 를 요청에서 받지 않는다** — 바디에 없고, 있어도 무시한다. 서버가 세션 주체와 서버 시각으로 찍는다(§7.3).
3. **`revision` 을 요청 바디에서 받지 않는다** — `If-Match` 헤더가 정본이다.
4. `baseUrl` 의 https 강제는 **서버가 다시 건다**(§7.1) — 클라이언트 정규식을 우회한 요청을 막는다.

**`If-Match` 처리**
- 헤더가 **없으면 428 `PRECONDITION_REQUIRED`** — 토큰 없는 맹목적 덮어쓰기를 허용하지 않는다(§7.2).
- 헤더가 **현재 revision 과 다르면 412 `PRECONDITION_FAILED`** — 응답 본문에 **최신 문서를 실어 보낸다**(`{ value, revision, audit }`). 프론트가 '무엇이 달라졌는지'를 짚으려면 최신 값이 필요하다(FS-067-EL-024.2 · `store.ts:34-35`).
- **덮어쓰기(force)**: 사용자가 충돌 다이얼로그에서 '내 변경으로 덮어쓰기'를 고르면(FS-067-EL-024.4) 프론트가 `force: true` 로 다시 저장한다. **계약 표현은 `If-Match: *`** — '어떤 revision 이든 상관없다'는 HTTP 표준 표현이며 새 필드를 만들지 않는다. 서버는 `*` 일 때 토큰 검사를 건너뛴다.

**응답 200** — `{ value, revision, audit }` (새 revision + 새 audit). 프론트가 이것을 **캐시에 직접 심는다**(`_shared/queries.ts:45` `client.setQueryData(key, saved)`) — 그래서 **응답에 새 revision 이 반드시 실려야 한다.** 실리지 않으면 다음 저장이 낡은 토큰으로 412 를 맞는다(`queries.ts:44` 가 이 함정을 주석으로 못박는다).

**에러**: 400 · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **412 `PRECONDITION_FAILED`**(최신 문서 동봉) · 428 `PRECONDITION_REQUIRED` · **422 `VALIDATION_FAILED`**(`error.fields`) · 429 · 500 · 504.

> **어댑터 요구사항(시그니처 불변)**: `RevisionedStore<T>` 인터페이스(`store.ts:67-74`)는 `fetch(signal)` · `save(input, signal?)` 두 함수다. 백엔드 연결 시 **`createRevisionedStore` 의 본문만 fetch 로 교체**하면 되고 화면 코드는 바뀌지 않는다 — `store.ts:8` 이 그렇게 설계됐다고 선언한다. 다만 **412 를 `SettingsConflictError(latest)` 로 변환**해야 한다(현재는 클로저 비교로 던진다). `isSettingsConflict`(`store.ts:48-50`)가 화면의 분기 근거이므로 이 변환이 빠지면 충돌이 generic 배너로 뭉개진다(FS-067-EL-020).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 조회 | N/A — **쿼리 파라미터가 없다**(단일 문서 조회) | 401 → 전역 인터셉터가 재인증으로(FS-067 §4.1). 화면은 FS-067-EL-018 배너 | **403** — 시스템 설정 리소스의 **존재는 비밀이 아니다**(BE-003 §3.2 원칙 1). 사이드바에 메뉴가 있고 라우트가 공개돼 있다. 은닉할 개인정보가 아니다(§7.5) | N/A — **문서는 항상 존재한다.** 미설정 상태여도 기본값 문서를 200 으로 내려준다(빈 폼을 그릴 근거가 필요하다 — §7.6 #5) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After`. 화면은 FS-067-EL-018 배너(문구 구분 없음 — FS-067 §7 #2) | 500 + `traceId` → FS-067-EL-018 | 5초 → 504 → FS-067-EL-018 |
| EP-02 저장 | 400 — 바디가 JSON 이 아니거나 필드 타입이 스키마와 다름(예: `signupEnabled` 가 문자열). **필드 규칙 위반은 400 이 아니라 422**(아래) | 401 → 전역 인터셉터. **미저장 입력은 유실된다**(FS-067 §4.1 · §7 #11) | **403 `FORBIDDEN`** — `operator` 가 저장을 시도한 경우(§7.7). 이 화면은 쓰기 컨트롤을 이미 숨기므로(FS-067-EL-015) 정상 UI 경로로는 도달하지 않는다 — **위조된 권한 스토어·직접 API 호출에서 발생한다**(`RequirePermission.tsx:8-11`). 404 은닉은 **하지 않는다**(§7.5) | N/A — 문서는 항상 존재한다. **'먼저 삭제됨' 경합이 구조적으로 없다** — 이 문서는 삭제되지 않는다(§7.2) | **412 `PRECONDITION_FAILED`** — `If-Match` 불일치. **최신 문서를 본문에 실어 보낸다** → FS-067-EL-024 충돌 다이얼로그. **`409` 가 아니라 `412` 가 정확한 코드다** — 조건부 요청의 전제 실패이기 때문(§7.2). 어댑터의 `SettingsConflictError` 가 둘을 같은 화면 경로로 모은다. `If-Match` 부재 시 **428** | **422 `VALIDATION_FAILED`** — §3 규칙 위반. `error.fields` 로 필드별 문구를 내려보낸다: `siteName`(빈/60자 초과) · `baseUrl`(빈/https 아님) · `contactEmail`(빈/형식) · `contactPhone`(빈/형식) · `timezone`(목록 밖) · **`maintenanceMessage`(모드 켬 + 빈 → 교차 규칙 위반 / 200자 초과)**. 프론트가 1차 차단하지만 **서버가 정본**이다(§7.1). ⚠ **현재 프론트에 `error.fields` → RHF `setError` 매핑이 없다** — 전부 FS-067-EL-020 배너로 뭉개진다(§7.6 #2) | 429 분당 30 + `Retry-After`. 화면은 FS-067-EL-020 배너 | 500 + `traceId` → FS-067-EL-020 배너, **입력 보존**(reset 하지 않는다) | 5초 → 504 → FS-067-EL-020. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다(FS-067 §7 #11) |

## 6. 프론트 연동 대조

| data-source.ts / store.ts | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `siteSettingsStore.fetch(signal)` | `GET /api/settings/site` (`data-source.ts:28`) | EP-01 | `Revisioned<SiteSettingsValues>` | O |
| `siteSettingsStore.save({ value, expectedRevision, force? }, signal)` | `PUT /api/settings/site` + `If-Match: <revision>` (`data-source.ts:28-31`) | EP-02 | `Revisioned<SiteSettingsValues>` | **△ — 412 → `SettingsConflictError(latest)` 변환이 필요**(현재는 클로저 비교). `force: true` → `If-Match: *` 매핑 필요 |
| `SITE_FIELD_LABELS` (`data-source.ts:40-50`) | — | **없음(프론트 전용)** | 충돌 다이얼로그의 항목 라벨 | O — 계약 밖이 정답(표시 문구) |

### 6.1 어댑터 함수 본문에 요구되는 사항 (시그니처 불변)

1. **쓰기에 `X-CSRF-Token` 헤더**를 싣는다.
2. **`If-Match: <expectedRevision>`** 을 싣는다. `force === true` 면 **`If-Match: *`**.
3. **412(또는 409) → `new SettingsConflictError(latest)`** 로 변환한다 — `latest` 는 응답 본문의 `{ value, revision, audit }`. 이 변환이 화면의 `isSettingsConflict` 분기를 살린다(`SiteSettingsPage.tsx:188`).
4. **200 응답의 `{ value, revision, audit }` 를 그대로 반환**한다 — `useSaveSettings.onSuccess` 가 이것을 캐시에 심는다(`queries.ts:45`).
5. `failIfRequested`/`conflictRequested`/`wait(LATENCY_MS)` 는 **개발용 재현 장치**이며 연동 시 사라진다(`store.ts:12,58`).
6. **`CURRENT_ADMIN` 상수를 보내지 않는다** — 삭제한다. 감사 주체는 서버가 세션에서 읽는다(§7.3).

## 7. 핵심 판정

### 7.1 프론트 검증은 보증이 아니다 — 서버가 전부 재검증한다 【보안 판정】

`siteSettingsSchema`(`validation.ts:27-77`)는 **브라우저에서만 돈다.** `PUT /api/settings/site` 를 직접 호출하면 이 스키마를 한 줄도 거치지 않는다. 그러므로 서버는 §3 의 규칙 전부를 재현한다. 이 원칙은 코드가 스스로 선언한다 — `data-source.ts:32` `'프론트 검증은 UX 이지 보증이 아니다 — 서버가 다시 검증한다'`. BE-007 §7.1 이 고객 설정에서 세운 것과 같은 판정이다.

**그중 두 규칙은 보안 규칙이라 특히 중요하다:**

1. **`baseUrl` https 강제** — `validation.ts:24` 가 이유를 적어 뒀다: '사이트 주소가 http 면 로그인 쿠키가 평문으로 흐른다'. 이 값은 사이트가 자기 절대 URL 을 만들 때 쓰이므로(메일 링크·OAuth redirect 기준·canonical) **http 로 저장되면 그 순간부터 앱 전체가 평문 링크를 발행한다.** 서버가 막지 않으면 API 직접 호출 한 번으로 그 상태가 된다. 나아가 서버는 **`javascript:`·`data:` 같은 스킴을 정규식이 아니라 파서로 거절**해야 한다 — `HTTPS_URL_RE` 는 `https://` 접두만 보므로 `https://evil@real.example.com` 같은 authority 트릭을 거르지 못한다(§7.6 #4).
2. **`maintenanceMessage` 교차 규칙** — 모드를 켜면서 문구를 비우면 **방문자가 빈 화면을 본다.** 프론트는 막지만(`validation.ts:60-67`) 서버가 막지 않으면 API 호출로 그 상태를 만들 수 있다.

**`maintenanceMessage` 는 방문자에게 렌더되는 문구다 → XSS 정제 대상**: BE-010 §7.2 · BE-026 §7.1 과 같은 판정이다. 어드민 화면은 `<input>` 값으로만 다루지만, **방문자 사이트가 이 문구를 HTML 로 해석하면 저장형 XSS 가 된다.** 서버가 **저장 시** 허용 태그 밖의 마크업 · `javascript:`/`data:` 스킴 · 이벤트 핸들러 속성을 제거한다. 정제는 저장 시 1회이며 렌더 시점 이스케이프에 의존하지 않는다 — 이 문구를 읽는 소비자(웹·에러 페이지·상태 페이지)가 여럿이라 각자의 이스케이프를 신뢰할 수 없다. **`siteName`·`siteDescription` 도 같은 처리를 받는다**(`siteDescription` 은 `<meta name="description">` 에 들어간다 — 속성 컨텍스트 이스케이프가 별도로 필요하다).

### 7.2 낙관적 동시성은 **토큰 기반**이다 — 존재 여부 기반이 아니다 【정합 판정】

**이 판정은 이 섹션과 앱의 다른 섹션을 가르는 지점이므로 정확히 기록한다.**

`shared/crud/crud.ts` 의 `createStoreAdapter` 는 409 를 **'대상이 아직 존재하는가'** 로 판정한다 — 즉 '다른 사용자가 먼저 **삭제**한 항목'만 잡고, **둘 다 존재하는 동시 편집은 last-write-wins** 로 통과시킨다. 반면 이 섹션의 `createRevisionedStore` 는 다르다:

```
_shared/store.ts:124-126
if (input.force !== true && input.expectedRevision !== current.revision) {
  throw new SettingsConflictError(current);
}
```

**`revision` 이라는 진짜 동시성 토큰을 비교한다.** 문서가 존재하든 말든 상관없다 — **내가 읽은 뒤에 누가 저장했으면 무조건 거절**된다. 회귀 테스트가 이 계약을 못박는다(`store.test.ts:54-69`): '낡은 revision 으로 저장하면 덮어쓰지 않고 409 를 던진다' + '거절됐으므로 상대의 값이 그대로 살아 있다 — 내 값이 덮어쓰지 않았다'. 그 파일의 머리말(`store.test.ts:3-4`)이 이유를 적는다: '이것이 깨지면 마지막 저장이 이기고, 그 사실을 아무도 모른 채 설정이 사라진다.'

**왜 이 섹션만 다른가** — `store.ts:3-7` 이 스스로 답한다: `createDocumentStore`(회사 정보·적립금 정책)는 last-write-wins 로 충분하지만 '유지보수 모드·API 스코프·OAuth 자격증명은 두 관리자가 동시에 편집하면 한쪽의 변경이 조용히 사라진다'. **유지보수 모드가 그 예다**: A 가 모드를 켜고 문구를 쓰는 동안 B 가 사이트명을 고쳐 저장하면, last-write-wins 하에서 A 의 저장이 B 의 사이트명을 되돌린다 — 아무도 모른 채.

**판정**: 이 계약은 **`If-Match` 를 필수로 요구한다**(헤더 없으면 428). HTTP 표준 표현으로 옮기면 `409 CONFLICT` 가 아니라 **`412 PRECONDITION_FAILED`** 가 정확하다 — 조건부 요청의 전제가 깨진 것이지 리소스 상태 충돌이 아니기 때문이다. 심(`data-source.ts:31`)이 `409·412` 를 나란히 적은 것은 두 코드 중 하나를 고르라는 뜻이며, **이 문서는 412 를 고르고 409 도 어댑터가 같은 경로로 받도록 남긴다**(서버 구현이 409 를 쓰더라도 화면이 깨지지 않게).

**'유령 저장'이 구조적으로 불가능하다**: BE-026 §7.5 가 다룬 `tickets.map(...)` no-op 성공 문제는 여기 없다 — `createRevisionedStore` 는 `map` 이 아니라 클로저 1건을 통째로 교체하므로(`store.ts:128-132`) '없는 대상을 조용히 지나치는' 경로 자체가 없다. **문서는 항상 존재하고 항상 교체된다.**

### 7.3 감사 주체·시각을 서버가 찍는다 — 프론트 값을 신뢰하지 않는다 【보안 판정】

**현재 클라이언트(픽스처)가 감사 정보를 만든다:**
- `updatedBy` = 하드코딩 `'김운영'`(`_shared/store.ts:84` `const CURRENT_ADMIN = '김운영'`) — **누가 유지보수 모드를 켰는지 기록되지 않는다.**
- `updatedAt` = `new Date().toISOString()`(`store.ts:131`) — 클라이언트 시각.

**코드가 이 판정을 미리 선언해 뒀다** — `store.ts:83`: `// TODO(backend): 저장 주체는 서버가 세션에서 읽어 기록한다 — 프론트가 보내는 값을 신뢰하면 안 된다.`

**판정**: `audit` 는 **요청 바디에 존재하지 않는다.** 서버가 `updatedBy` 를 **세션 주체**에서, `updatedAt` 을 **서버 시각**에서 찍는다. 클라이언트가 보낸 `audit` 는 무시한다 — 신뢰하면 **인증된 아무 관리자나 다른 관리자 이름으로 유지보수 모드를 켤 수 있다**(감사 위조). BE-026 §7.2 와 같은 뿌리다.

**이것이 UX 문제가 아닌 이유**: 사이트 설정의 감사 기록은 '왜 사이트가 내려가 있지?'에 답하는 유일한 화면 단서다(`AuditNote.tsx:3-5` 가 그렇게 적는다). 그 답이 위조 가능하면 기록이 아니라 장식이다.

**추가**: `updatedBy` 는 표시용 이름이므로 **계정이 삭제·개명돼도 기록은 그 시점 이름을 유지**해야 한다(스냅샷) — 조인해서 현재 이름을 보이면 과거 기록이 소급 변조된다. 서버는 저장 시점 이름을 비정규화해 남긴다.

### 7.4 멱등성 판정 — `If-Match` 가 멱등키를 대신한다(부분적으로) 【정합 판정】

**프론트에 멱등키가 없다.** 방어는 `useSubmitLock`(`_shared/queries.ts:58-75`) 하나뿐이다 — 동기 ref 잠금이라 '클릭과 리렌더 사이 틈'(`queries.ts:54-55`)은 닫지만 **네트워크 재시도는 닫지 못한다.** 앱에는 선례가 있다(`pages/members/components/PointsCard.tsx:103,162-173` — `idempotencyKeyRef`, 성공해야 키를 버린다 · `pages/members/data-source.ts:248` 심 `Idempotency-Key: <uuid>`, 24h).

**그러나 이 엔드포인트에서는 위험의 성질이 다르다.** PUT + `If-Match` 는 **재적용이 구조적으로 불가능**하다:
- 첫 요청이 성공 → revision 이 `rev-N` → `rev-N+1` 로 바뀐다.
- 응답이 유실돼 사용자가 재시도 → 같은 `If-Match: rev-N` → **412.** 두 번 적용되지 않는다.

**즉 `If-Match` 가 멱등키의 안전 목표(중복 적용 방지)를 이미 달성한다.** 남는 것은 **UX 문제**다: 사용자는 '저장이 안 됐나?' 하고 재시도했는데 **영문 모를 충돌 다이얼로그**를 본다(사실은 자기 저장이 이미 성공했다). 충돌 다이얼로그는 '다른 관리자가 저장했다'고 말하지만 그 '다른 관리자'가 자기 자신이다 — **거짓말이다.**

**판정**: 멱등키는 **선택**이되 도입하면 이 UX 를 고친다. 도입 시 `Idempotency-Key: <uuid>` 를 24h 보존하고, 같은 키의 재요청에는 **최초 응답을 재생**한다(412 가 아니라 200 + 새 revision). 그러면 사용자는 성공을 본다. 우선순위는 낮다(데이터는 이미 안전하다) — §7.6 #3.

### 7.5 403 이지 404 가 아니다 — 시스템 설정은 은닉하지 않는다 【보안 판정】

BE-003 §3.2 의 원칙을 이 도메인에 적용하면 **은닉하지 않는 쪽**이 답이다.

1. **리소스의 존재가 비밀이 아니다** → 권한 부족 시 **403 `FORBIDDEN`**.
2. 근거: `GET /api/members/:id` 를 404 로 은닉하는 이유는 **개별 회원의 존재 자체가 개인정보**이기 때문이다(BE-003 §3.2 · BE-026 §7.6). 사이트 설정은 그 반대다 — **사이트에 설정이 있다는 사실은 누구나 안다.** 사이드바에 '사이트 설정' 메뉴가 있고(`nav-config.ts:227`), 라우트가 공개돼 있으며, 유지보수 모드의 결과는 방문자에게 그대로 보인다. 존재를 숨겨서 얻는 것이 없다.
3. **은닉이 오히려 해롭다**: 404 를 주면 정당한 `operator` 가 '설정 화면이 없어졌나?'로 오해한다. 403 은 '있지만 당신 권한이 아니다'를 정확히 말한다.

**대칭성**: `operator` 는 EP-01(조회)에 200, EP-02(저장)에 **403** 을 받는다 — 이미 문서의 존재를 아는 주체에게 존재를 숨기는 것은 무의미하다(BE-026 §7.6 의 같은 논리).

### 7.6 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **`maintenanceMessage`·`siteName`·`siteDescription` 저장 시 XSS 정제(§7.1)** — 방문자에게 렌더되는 문구다. `siteDescription` 은 속성 컨텍스트(`<meta>`) 이스케이프가 추가로 필요 | A63 |
| 2 | **422 `error.fields` 를 프론트가 필드 인라인 오류로 매핑하지 않는다** — 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 422 처리(`useCrudForm.ts:176-186`)를 상속하지 못했다. 모든 저장 실패가 FS-067-EL-020 배너로 뭉개진다(quality-bar EXC-07 P1) | A11 |
| 3 | 멱등키 부재(§7.4) — **데이터는 `If-Match` 로 이미 안전하다.** 남는 것은 '자기 저장에 대해 충돌 다이얼로그를 보는' UX 결함이다. 우선순위 낮음(quality-bar EXC-08 P0 의 2절) | A11 · A63 |
| 4 | **`baseUrl` 을 정규식이 아니라 URL 파서로 검증**한다 — `HTTPS_URL_RE`(`validation.ts:25`)는 `https://evil@real.example.com` 류 authority 트릭을 거르지 못한다. **OAuth 화면은 이미 파서를 쓴다**(`oauth/validation.ts:60-65` `new URL(trimmed)`) — 같은 섹션 안에서 두 방식이 갈렸다. 아울러 `baseUrl`·`contactEmail`·`contactPhone` 에 **길이 상한이 없다**(FS-067 §7 #13) — 서버가 자체 상한(예: 2048 / 254 / 20)을 둔다 | A63 · A11 |
| 5 | **미설정 상태의 계약** — 이 문서는 '문서는 항상 존재한다'(§5 404 축)를 전제한다. 서버가 최초 배포 시 기본값 문서를 시딩하지 않으면 EP-01 이 404 를 낼 수 있고, 화면에는 그 분기가 **없다**(FS-067-EL-018 이 generic 배너로 받는다). 시딩을 계약에 포함하거나 EP-01 이 기본값을 합성해 200 을 줘야 한다 | A63 |
| 6 | **유지보수 모드의 집행 주체가 이 계약 밖이다**(§1 범위 밖). 저장은 되는데 사이트가 안 내려가면 이 화면은 거짓말이 된다 — 게이트웨이/프론트 서버가 이 값을 읽는 계약이 별도로 필요하다. **관리자는 계속 접속할 수 있다**(FS-067-EL-010 힌트가 약속한다)는 예외 규칙도 그 계약이 보장해야 한다 | A63 · A40 |
| 7 | `timezone` 이 저장되지만 아무도 읽지 않는다(FS-067 §7 #6) — 계약을 만들었으니 소비자를 만들거나, 소비자가 생길 때까지 화면이 그 사실을 밝혀야 한다(언어 화면 선례 — FS-068-EL-010) | A11 · A01 |
| 8 | 설정 **변경 이력**(누가 언제 무엇을) 계약이 없다 — 현재는 '마지막 1건'만 있다(§1 범위 밖). '유지보수 모드가 지난주에 왜 켜졌나'는 답할 수 없다. 로그 도메인과의 경계를 정해야 한다 | A63 · A01 |
| 9 | `revision` 이 `rev-<seq>` 전역 단조 증가 문자열이라(`store.ts:86-91`) **모든 설정 문서가 시퀀스를 공유한다** — 픽스처 한정 구현 세부이며 서버는 문서별 ETag 를 쓴다. 연동 시 이 가정에 의존하는 코드가 없음을 확인할 것(현재 프론트는 revision 을 불투명 문자열로만 다룬다 — 의존 없음) | A63 |

### 7.7 `operator` 에게 쓰기를 열지 않는다 — BE-026 과 반대 판정

BE-026(1:1 문의)은 `operator` 에게 쓰기를 **연다** — 문의 응대가 운영자의 본업이기 때문이다. **이 도메인은 반대다.**

**근거**:
1. **결과의 범위가 다르다.** 문의 답변은 '한 고객에게 보내는 응대'다. 사이트 설정 저장은 **사이트 전체를 내리고**(유지보수 모드) **신규 가입을 막고**(회원가입 허용) **앱 전체의 링크 생성 기준을 바꾼다**(기본 URL). 되돌릴 수 있더라도 되돌리는 동안 사이트는 내려가 있다.
2. **빈도가 다르다.** 문의는 하루에도 여러 건 처리한다 — `admin` 만 할 수 있으면 역할 구분이 무의미해진다. 사이트 설정은 드물게 바뀐다 — `admin` 을 기다려도 업무가 막히지 않는다.
3. **화면이 이미 그렇게 말한다.** 읽기 전용 안내 문구가 '**시스템 설정 수정 권한**이 필요합니다'(`SiteSettingsPage.tsx:54-55`)라고 별도 권한을 전제하며, 권한 모델이 리소스를 `page:/settings/site` 로 분리해 둔다(`resources.ts:66-68` · `route-resource.ts:32-35`).

**결론**: EP-01 은 `admin` + `operator`. **EP-02 는 `admin` 만.** 이 판정은 언어(BE-068)·API Key(BE-069)·OAuth(BE-070)에도 동일하게 적용된다 — 네 화면이 같은 `시스템 설정` 권한 축을 공유한다.

## 8. 자기 점검

- [x] FS-067 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 2건(EP-01·02) 매핑 완료. 심 없는 엔드포인트가 없다** — 이 화면은 모든 서버 호출이 `data-source.ts` 의 TODO 심에 대응한다
- [x] **엔드포인트를 발명하지 않았다** — `GET/PUT /api/settings/site` 는 `data-source.ts:28` 에 실재하고, `If-Match`·바디 9필드·200/409·412/422 도 `:29-32` 에 실재한다. §1.1 근거표가 각 항목의 file:line 을 댄다
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (2행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한만 고유 차이**(`operator` 쓰기 **차단** — §7.7, BE-026 과 반대 판정)를 근거와 함께 기술
- [x] 멱등성 판정 — 조회 GET 멱등 / **저장은 `If-Match` 로 조건부 멱등이며 그것이 멱등키의 안전 목표를 이미 달성함을 §7.4 에 명시**하고, 남은 것이 UX 문제임을 구분했다
- [x] **보안 판정 4건** — 서버 재검증 + XSS 정제(§7.1) · **낙관적 동시성 토큰 기반(§7.2)** · **감사 주체 위조(§7.3)** · **403 vs 404 은닉(§7.5)**
- [x] **낙관적 동시성이 '존재 여부'가 아니라 revision 토큰 기반임을 `store.ts:124-126` + `store.test.ts:54-69` 로 확인**하고 §7.2 에 `createStoreAdapter` 와의 차이를 명시했다
- [x] `validation.ts` 의 필드 규칙·교차 규칙을 §3 표와 §5 의 422 축에 정확히 반영했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
</content>
