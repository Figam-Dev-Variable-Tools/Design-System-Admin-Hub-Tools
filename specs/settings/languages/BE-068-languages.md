---
id: BE-068
title: "언어 관리 백엔드 기능 명세"
functionalSpec: FS-068
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-068. 언어 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-068 언어 관리 (`/settings/languages`) |
| 범위 | 언어 설정 문서 1건(기본 언어 · 지원 언어 목록 · 폴백 언어)의 조회·저장. 낙관적 동시성(revision/ETag) · 감사 추적 |
| **범위 밖** | **번역 리소스·번역문 CRUD** — 이 계약은 **언어 정책만** 다룬다. 번역 문자열을 저장·조회하는 API 는 존재하지 않으며, 앱에 i18n 라이브러리도 없다(`validation.ts:3-18`). **로케일 카탈로그 조회** — 후보 4종은 **코드 상수**(`LANGUAGE_META` — `validation.ts:34-39`)이며 서버가 주지 않는다(§7.6 #1). **언어 정책의 적용** — 저장될 뿐 어떤 소비자도 읽지 않는다(FS-068 §7 #14) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/settings/languages/data-source.ts` (`languageSettingsStore` = `createRevisionedStore<LanguageSettingsValues>('languages', …)`) |
| 도메인 타입 | `apps/admin/src/pages/settings/languages/validation.ts` (`LanguageSettingsValues` · `LanguageCode`) · 봉투 타입은 `pages/settings/_shared/store.ts` (`Revisioned<T>` · `AuditInfo`) |
| 검증 정본 | **zod 스키마 `languageSettingsSchema`**(`validation.ts:45-85`). 서버는 이 규칙을 재현하되 **프론트 검증을 신뢰하지 않는다**(§7.1) |
| 공통 계약 | **BE-067 §2·§3(봉투)·§7.2(동시성)·§7.3(감사)·§7.5(403)·§7.7(권한) 과 동일하다** — 같은 `createRevisionedStore` 를 쓰는 형제 화면이다. 아래는 **언어 설정 고유 차이만** 기술한다 |

### 1.1 코드 대조 근거표

| 계약 항목 | 코드 근거 | 확인 내용 |
|---|---|---|
| 엔드포인트 2건 | `data-source.ts:20` `// TODO(backend): GET /api/settings/languages · PUT /api/settings/languages` | **심이 실재한다** — 발명하지 않았다 |
| PUT 요청 형태 | `data-source.ts:21` `PUT 요청: If-Match: <revision> + 바디 { defaultLanguage, supported[], fallback }` | 헤더 + 3필드가 심에 명시 |
| 응답 형태 | `data-source.ts:22` `응답: 200 → { value, revision, audit } / 409·412 → 동시 편집 충돌 / 422 → 검증 실패` | 200·409·412·422 가 심에 명시 |
| 낙관적 동시성 | `_shared/store.ts:124-126` | **토큰 기반**(BE-067 §7.2 와 동일 메커니즘) |
| 감사 주체 | `_shared/store.ts:83-84` `// TODO(backend): 저장 주체는 서버가 세션에서 읽어 기록한다` + `CURRENT_ADMIN = '김운영'` | §7.3(=BE-067 §7.3) |
| 후보 로케일이 상수임 | `validation.ts:22` `const LANGUAGE_CODES = ['ko','en','ja','zh-CN'] as const` · `:34-39` `LANGUAGE_META` | **서버 카탈로그 엔드포인트가 없다 — 심도 없다**(§7.6 #1) |
| i18n 미도입 | `validation.ts:12-18` `// TODO(lib): i18n — 두 번째 로케일이 실제로 필요해지는 시점에 라이브러리를 도입한다` | **정책은 저장되나 소비자가 없다**(§7.6 #2) |
| 실패 재현 | `data-source.ts:3-4` `/settings/languages?fail=load · ?fail=save · ?fail=conflict` | scope = `languages`, op 2종 + conflict |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. **BE-067 §2 와 동일**하다 — 재정의하지 않는다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 조회 + 저장. **`operator` = 조회만** — BE-067 §7.7 의 판정을 그대로 적용한다(네 설정 화면이 같은 `시스템 설정` 권한 축을 공유한다). 리소스는 `page:/settings/languages`(`route-resource.ts:32-35`).
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기**: `useRouteWritePermissions().canUpdate`(`LanguagesPage.tsx:126`)가 쓰기 컨트롤을 게이팅하나 **그것은 UX 층이며 권한 강제는 서버 책임**이다(`RequirePermission.tsx:8-11`).
- **낙관적 동시성·감사·403 은닉**: **BE-067 §7.2 · §7.3 · §7.5 와 동일**. 같은 `createRevisionedStore` 를 쓰므로 메커니즘이 하나다 — 여기서 재정의하지 않는다.

## 3. 데이터 계약

| 타입 | 필드 | 비고 |
|---|---|---|
| `Revisioned<T>` | `value: T` · `revision: string` · `audit: AuditInfo` | BE-067 §3 과 동일 봉투 |
| `AuditInfo` | `updatedBy: string` · `updatedAt: string`(ISO) | 동일 |
| `LanguageSettingsValues` | `defaultLanguage: LanguageCode` · `supported: LanguageCode[]` · `fallback: LanguageCode` | **3필드 평면 객체.** `validation.ts:45-87` |
| `LanguageCode` | `'ko'` \| `'en'` \| `'ja'` \| `'zh-CN'` | **BCP 47 태그를 그대로 쓴다** — 라이브러리가 붙어도 그대로 넘어간다(`validation.ts:21`) |

**필드 규칙 (`languageSettingsSchema` 대조 — 서버가 정본)**

| 필드 | 타입 | 규칙 | 코드 근거 |
|---|---|---|---|
| `defaultLanguage` | enum | `LANGUAGE_CODES` 중 하나 | `validation.ts:47` |
| `supported` | array\<enum\> | 각 항목이 `LANGUAGE_CODES` 중 하나 | `validation.ts:49` |
| `fallback` | enum | `LANGUAGE_CODES` 중 하나 | `validation.ts:50` |

**교차 규칙 (`.check()` — 이 화면의 핵심. 서버가 재판정)**

| # | 규칙 | 위반 시 path | 이유 (코드 주석) | 근거 |
|---|---|---|---|---|
| 1 | `supported.length > 0` | `supported` | '지원 언어가 하나도 없으면 사이트가 아무 언어로도 뜨지 않는다' | `validation.ts:55-64` |
| 2 | `supported.includes(defaultLanguage)` | `defaultLanguage` | '기본 언어를 지원하지 않으면 첫 화면을 그릴 로케일이 없다' | `validation.ts:66-74` |
| 3 | `supported.includes(fallback)` | `fallback` | '폴백을 지원하지 않으면 번역이 빠졌을 때 읽을 곳이 없다' | `validation.ts:76-84` |

> **규칙 1 이 먼저 걸리면 2·3 을 검사하지 않는다** — `validation.ts:63` 이 `return` 한다. 지원 목록이 비었으면 '기본 언어가 목록에 없다'는 파생 오류이지 원인이 아니기 때문이다. **서버도 같은 순서를 지켜야** `error.fields` 가 원인 하나만 가리킨다.

**후보 로케일이 서버 계약에 없다**: `LANGUAGE_CODES`(`validation.ts:22`)는 **빌드 시점 상수**다. 서버가 카탈로그를 내려주지 않으며 **심도 없다**(§7.6 #1). 서버는 이 4개 값만 받는다 — 그 밖의 코드는 422.

## 4. 엔드포인트 명세

### BE-068-EP-01 · 언어 설정 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-068-EL-011, EL-016, EL-017, EL-024 |
| 근거 (심) | `data-source.ts:20` `GET /api/settings/languages` |
| 메서드·경로 | `GET /api/settings/languages` |
| 권한 | `admin`, `operator`(조회) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**쿼리**: 없다. 단일 문서다.

**응답 200** — `{ value: LanguageSettingsValues, revision: string, audit: AuditInfo }` + `ETag: <revision>` 헤더. `revision` 은 **불투명 문자열**이다(BE-067 EP-01 과 동일 규약).

**서버 불변식**: 응답의 `value` 는 **§3 의 교차 규칙 3개를 반드시 만족**해야 한다. 서버가 규칙을 어긴 문서를 내려주면 화면이 즉시 검증 실패 상태로 렌더되고(`shouldValidate` 없이도 제출 시 걸린다) 사용자는 **자기가 만들지 않은 오류**를 본다. 저장 경로가 규칙을 강제하므로(EP-02) 정상 경로로는 발생하지 않으나, **마이그레이션·시딩이 이 불변식을 깰 수 있다** — §7.6 #4.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-068-EP-02 · 언어 설정 저장
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-068-EL-013, EL-018, EL-020, EL-020.2, EL-022, EL-022.3 |
| 근거 (심) | `data-source.ts:20-22` `PUT /api/settings/languages` + `If-Match` + 3필드 바디 + 200/409·412/422 |
| 메서드·경로 | `PUT /api/settings/languages` |
| 권한 | **`admin` 만**(BE-067 §7.7) |
| 멱등성 | **조건부 멱등** — `If-Match` 가 재적용을 막는다(BE-067 §7.4 와 동일 판정) |
| 레이트리밋 | 분당 30회 |

**요청 헤더**: `If-Match: <revision>`(force 면 `If-Match: *`) · `X-CSRF-Token: <token>`.

**요청 바디**: `{ defaultLanguage, supported[], fallback }` — 3필드 전체. **전체 치환**이다.

**서버 검증**
1. **§3 의 필드 규칙 + 교차 규칙 3개를 전부 재판정**한다(§7.1). 규칙 1 → 2·3 순서를 지킨다.
2. **`supported` 배열을 정규화한다** — 중복 제거 + `LANGUAGE_CODES` 정의 순서로 정렬. 프론트가 이미 정규화하지만(`LanguagesPage.tsx:182-183`) **API 직접 호출은 `['en','ko','en']` 같은 배열을 보낼 수 있다.** 정규화하지 않으면 `divergedLabels` 의 배열 내용 비교(`diff.ts:13-20`)가 순서 차이를 '변경됨'으로 읽어 **거짓 충돌**이 난다(§7.2).
3. `audit` 를 요청에서 받지 않는다 — 서버가 세션·서버 시각으로 찍는다(BE-067 §7.3).
4. `revision` 을 바디에서 받지 않는다 — `If-Match` 가 정본.

**응답 200** — `{ value, revision, audit }`(새 revision + 새 audit). 프론트가 **캐시에 직접 심으므로**(`_shared/queries.ts:45`) **새 revision 이 반드시 실려야 한다**(BE-067 EP-02 와 동일).

**에러**: 400 · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **412 `PRECONDITION_FAILED`**(최신 문서 동봉) · 428 `PRECONDITION_REQUIRED` · **422 `VALIDATION_FAILED`**(`error.fields`) · 429 · 500 · 504.

---

### BE-068-EP-03 · 로케일 카탈로그 조회 — **심 없음 (미정)**

FS-068-EL-004(언어 체크박스 목록)·EL-004.2(원어 표기)가 쓰는 후보 목록이다. **`data-source.ts` 에 이 조회의 어댑터도 `// TODO(backend)` 주석도 없다.** 화면이 `validation.ts:34-39` 의 **코드 상수 `LANGUAGE_META`** 를 직접 import 한다(`LanguagesPage.tsx:38`).

- 엔드포인트: **미정.** 이 문서는 만들지 않는다 — 판정은 §7.6 #1.
- **이것이 누락인지**: 아니다. 후보를 서버가 주려면 서버가 '어떤 로케일을 번역할 수 있는가'를 알아야 하는데, **번역 리소스 자체가 없다**(§1 범위 밖). 카탈로그만 먼저 만들면 서버가 지원한다고 말하는 로케일과 실제 번역 사이가 벌어진다.

## 5. 예외 매트릭스

> EP-03 은 **심이 없어 계약이 존재하지 않으므로** 이 매트릭스에 행이 없다(§7.6 #1). 아래 2행이 이 문서가 정의하는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 조회 | N/A — **쿼리 파라미터가 없다**(단일 문서) | 401 → 전역 인터셉터가 재인증으로. 화면은 FS-068-EL-016 배너 | **403** — 시스템 설정 리소스의 **존재는 비밀이 아니다**(BE-067 §7.5). 사이드바에 메뉴가 있고 라우트가 공개돼 있다. 은닉할 개인정보가 없다 | N/A — **문서는 항상 존재한다.** 미설정이어도 기본값(`{ ko, ['ko'], ko }`)을 200 으로 내려준다(§7.6 #4) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` → FS-068-EL-016(문구 구분 없음 — FS-068 §7 #10) | 500 + `traceId` → FS-068-EL-016 | 5초 → 504 → FS-068-EL-016 |
| EP-02 저장 | 400 — 바디가 JSON 이 아니거나 타입 불일치(예: `supported` 가 배열이 아님). **값 규칙 위반은 422** | 401 → 전역 인터셉터. **미저장 입력은 유실된다**(FS-068 §4.1) | **403 `FORBIDDEN`** — `operator` 가 저장을 시도한 경우(BE-067 §7.7). 정상 UI 경로로는 도달하지 않는다(FS-068-EL-013 이 컨트롤을 숨긴다) — **위조된 권한 스토어·직접 API 호출에서 발생.** 404 은닉은 **하지 않는다** | N/A — 문서는 항상 존재한다. **'먼저 삭제됨' 경합이 구조적으로 없다** | **412 `PRECONDITION_FAILED`** — `If-Match` 불일치. **최신 문서를 본문에 실어 보낸다** → FS-068-EL-022 충돌 다이얼로그. `If-Match` 부재 시 **428**. `409` 를 쓰더라도 어댑터가 같은 경로로 받는다(BE-067 §7.2) | **422 `VALIDATION_FAILED`** — `error.fields` 로: **`supported`**(빈 배열 → '지원 언어를 하나 이상 선택하세요.') · **`defaultLanguage`**(지원 목록 밖 → '기본 언어는 지원 언어 목록에 있어야 합니다.') · **`fallback`**(지원 목록 밖 → '폴백 언어는 지원 언어 목록에 있어야 합니다.') · 알 수 없는 로케일(`LANGUAGE_CODES` 밖). **규칙 1 이 걸리면 2·3 을 보내지 않는다**(§3). ⚠ 프론트에 `error.fields` 매핑이 없어 FS-068-EL-018 배너로 뭉개진다(§7.6 #3) | 429 분당 30 + `Retry-After` → FS-068-EL-018 | 500 + `traceId` → FS-068-EL-018, **입력 보존** | 5초 → 504 → FS-068-EL-018. **프론트 타임아웃 상한 없음**(FS-068 §7 #11) |

## 6. 프론트 연동 대조

| data-source.ts / store.ts | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `languageSettingsStore.fetch(signal)` | `GET /api/settings/languages` (`data-source.ts:20`) | EP-01 | `Revisioned<LanguageSettingsValues>` | O |
| `languageSettingsStore.save({ value, expectedRevision, force? }, signal)` | `PUT /api/settings/languages` + `If-Match: <revision>` (`data-source.ts:20-21`) | EP-02 | `Revisioned<LanguageSettingsValues>` | **△ — 412 → `SettingsConflictError(latest)` 변환 필요. `force: true` → `If-Match: *` 매핑 필요** |
| `LANGUAGE_FIELD_LABELS` (`data-source.ts:30-34`) | — | **없음(프론트 전용)** | 충돌 다이얼로그 항목 라벨 | O — 계약 밖이 정답(표시 문구) |
| **`LANGUAGE_META` / `LANGUAGE_CODES`** (`validation.ts:22,34-39`) | **없음** | **EP-03 심 없음(미정)** | **코드 상수 — 서버를 거치지 않는다** | **O — 계약 없음이 현재로선 정답**(§7.6 #1) |

### 6.1 어댑터 함수 본문에 요구되는 사항 (시그니처 불변)

BE-067 §6.1 과 **동일**하다(같은 `createRevisionedStore` 를 쓴다). 요약:
1. 쓰기에 `X-CSRF-Token`.
2. `If-Match: <expectedRevision>` · `force === true` 면 `If-Match: *`.
3. **412(또는 409) → `new SettingsConflictError(latest)`** 변환 — 화면의 `isSettingsConflict` 분기(`LanguagesPage.tsx:214`)를 살린다.
4. 200 응답의 `{ value, revision, audit }` 를 그대로 반환 — `onSuccess` 가 캐시에 심는다.
5. `failIfRequested`/`conflictRequested`/`wait(LATENCY_MS)` 는 연동 시 사라진다.
6. **`CURRENT_ADMIN` 상수를 보내지 않는다** — 감사 주체는 서버가 세션에서 읽는다.

**이 화면 고유 추가 사항**: `supported` 배열은 **정규화된 상태로 전송**된다(`LanguagesPage.tsx:182-183`). 서버도 정규화하되(EP-02 검증 2) **프론트 정규화를 제거하면 안 된다** — 제거하면 체크 순서가 배열 순서를 흔들어 무의미한 dirty 와 거짓 충돌이 발생한다(§7.2).

## 7. 핵심 판정

### 7.1 프론트 검증은 보증이 아니다 — 서버가 교차 규칙을 재판정한다 【보안 판정】

`languageSettingsSchema`(`validation.ts:45-85`)는 **브라우저에서만 돈다.** `PUT /api/settings/languages` 를 직접 호출하면 한 줄도 거치지 않는다. `data-source.ts:22` 의 심이 `422 → 검증 실패` 를 명시하는 것은 서버가 재검증한다는 선언이다.

**이 화면에서 그것이 왜 중요한가** — 세 교차 규칙은 **전부 사이트를 못 뜨게 만드는 규칙**이다:
- `supported: []` → '사이트가 아무 언어로도 뜨지 않는다'(`validation.ts:55`).
- `defaultLanguage ∉ supported` → '첫 화면을 그릴 로케일이 없다'(`:66`).
- `fallback ∉ supported` → '번역이 빠졌을 때 읽을 곳이 없다'(`:76`).

즉 **이 규칙들의 위반은 검증 실수가 아니라 서비스 장애**다. 프론트는 그것을 **두 겹으로** 막는다: 스키마(제출 시) + 잠금(만들지 못하게 — `LanguagesPage.tsx:305`). 서버가 세 번째 겹이어야 한다 — 앞 두 겹은 브라우저 안에 있고 우회 가능하다.

**보안 등급은 낮다**(시크릿·개인정보가 없다). 그러나 **가용성 등급은 높다** — 잘못된 문서 1건이 사이트 전체를 내린다. `maintenanceMode` 와 성질이 같다(BE-067 §7.1).

**XSS 정제는 필요 없다** — 이 문서에 자유 텍스트가 없다. 세 필드 전부 **enum 이거나 enum 의 배열**이다(`validation.ts:47-50`). 서버가 enum 화이트리스트만 지키면 임의 문자열이 저장될 경로가 없다. **BE-067(사이트 설정)·BE-070(OAuth)과 다른 점**이며, 이 화면이 시크릿·자유 텍스트를 다루지 않는다는 사실의 직접적 귀결이다.

### 7.2 `supported` 배열의 정규화는 계약이다 — 순서가 의미를 갖지 않는다 【정합 판정】

`supported` 는 **집합(set)이지 순열이 아니다.** 그러나 JSON 배열로 전송되므로 순서가 표현된다. 이 간극이 두 곳에서 사고를 만든다:

1. **거짓 dirty** — 체크 순서대로 배열을 쌓으면 `['ko','en']` 과 `['en','ko']` 가 다른 값이 된다. 프론트가 `LANGUAGE_META` 순서로 정규화해 이를 막는다(`LanguagesPage.tsx:182-183` '체크 순서가 저장값을 흔들지 않는다(무의미한 dirty 방지)').
2. **거짓 충돌** — `divergedLabels` 가 배열을 **내용**으로 비교하지만(`diff.ts:13-20`) 그 비교는 **인덱스별 대응**이다(`mine.every((item, index) => Object.is(item, theirs[index]))`). 즉 **순서가 다르면 '달라졌다'로 읽는다.** `diff.ts:9-11` 이 참조 비교의 함정을 지적하며 이 화면을 예로 들지만(`supported: ['ko']` vs `['ko']`), **순서 차이는 여전히 잡지 못한다** — 내용 비교가 아니라 순서 포함 비교이기 때문이다.

**판정**: **서버가 `supported` 를 정규화해 저장하고 정규화된 배열을 응답한다** — 중복 제거 + `LANGUAGE_CODES` 정의 순서 정렬. 그러면 순서가 계약이 되어 클라이언트 간 비교가 안정된다.

**정규화하지 않으면**: API 로 `['en','ko']` 를 저장한 뒤 화면을 열면, 화면은 정규화된 `['ko','en']` 을 만들어 **아무것도 안 바꿔도 dirty** 가 되고, 충돌 시 '지원 언어가 달라졌다'고 **거짓말**한다. 프론트 정규화만으로는 부족하다 — 프론트를 거치지 않는 쓰기가 존재하기 때문이다.

**프론트 정규화를 제거하면 안 된다**(§6.1) — 서버 정규화는 저장 후에야 반영되므로, 편집 중 dirty 판정은 여전히 프론트 정규화에 의존한다.

### 7.3 감사·동시성·403 — BE-067 을 그대로 상속한다

**이 문서는 재정의하지 않는다.** 같은 `createRevisionedStore`(`_shared/store.ts:100-136`)를 쓰므로 메커니즘이 하나다:

- **낙관적 동시성 = revision 토큰 기반**(`store.ts:124-126`) — '존재 여부' 기반이 아니다. `createStoreAdapter` 와의 차이는 BE-067 §7.2 가 상술한다. 회귀 테스트 `_shared/store.test.ts` 6건이 이 계약을 못박으며 **네 설정 화면이 그 테스트를 공유한다**.
- **감사 주체 위조** — `updatedBy` 하드코딩 `'김운영'`(`store.ts:84`) · `updatedAt` 클라이언트 시각(`:131`). 서버가 세션·서버 시각으로 찍는다. 심이 선언한다(`store.ts:83`). BE-067 §7.3.
- **403 vs 404** — 은닉하지 않는다. 컬렉션·문서의 존재가 비밀이 아니다. BE-067 §7.5.
- **`operator` 쓰기 차단** — BE-067 §7.7.

**언어 설정 고유의 감사 관점**: 이 문서의 감사 가치는 사이트 설정보다 **낮다** — 언어 정책 변경은 사이트를 내리지 않고 되돌리기 쉽다. 그러나 **i18n 이 도입된 뒤에는 달라진다**: 지원 언어를 끄면 그 언어 사용자가 갑자기 폴백을 보게 되므로 '누가 언제 껐나'가 중요해진다. **지금 감사를 제대로 만들어 두는 것이 옳다** — 나중에 소급할 수 없다.

### 7.4 멱등성 판정 — BE-067 §7.4 와 동일

**프론트에 멱등키가 없다**(`grep Idempotency pages/settings/` → 0건). 방어는 `useSubmitLock`(`_shared/queries.ts:58-75`) 하나다.

**PUT + `If-Match` 라 재적용이 구조적으로 불가능**하다 — 첫 요청 성공 후 revision 이 바뀌므로 같은 `If-Match` 재시도는 412 다. **데이터는 안전하다.** 남는 것은 UX: 사용자가 '저장이 안 됐나?' 하고 재시도했다가 **자기 자신을 '다른 관리자'라 부르는 거짓 충돌 다이얼로그**를 본다.

**판정**: 멱등키는 **선택**. 도입하면 `Idempotency-Key: <uuid>` 24h 보존 + 같은 키 재요청에 **최초 응답 재생**(412 가 아니라 200). 우선순위 낮음 — §7.6 #3.

### 7.5 이 계약은 지금 **소비자가 없다** — 그것을 문서에 고정한다 【범위 판정】

**저장은 되는데 아무 일도 일어나지 않는다.** 이 앱은 한국어 단일이고 i18n 라이브러리가 없다(`validation.ts:6-9` '지금 들이면 번들과 모든 문자열 호출부가 바뀌는데, 정작 번역할 두 번째 언어가 없다').

**화면은 이 사실을 감추지 않는다** — 상단 info 배너가 항상 떠 있다(FS-068-EL-010): '이 화면은 언어 정책을 저장할 뿐, 저장한다고 화면이 번역되지는 않습니다.' `LanguagesPage.tsx:5-7` 이 그 근거를 밝힌다: '감추면 운영자는 영어를 켜 놓고 사이트가 영어로 나오길 기다리게 된다.'

**픽스처도 같은 정직성을 지킨다** — 한국어 하나만 켜져 있다(`data-source.ts:11-13` '영어를 켜 두면 화면은 "지원함" 이라 말하는데 번역이 없어 거짓말이 된다').

**판정**: 이 계약을 **지금 만드는 것이 옳다.** 근거:
1. **모델이 라이브러리 설정의 입력이 된다** — `validation.ts:13-16` 이 매핑을 미리 적어 뒀다: `defaultLanguage → i18n.language` · `supported → i18n.supportedLngs` · `fallback → i18n.fallbackLng`. 모델이 먼저 서 있으면 라이브러리 도입이 배선 작업이 된다.
2. **그러나 계약이 죽은 데이터를 쌓는 기간이 있다** — 그 사실을 BE 문서가 인정해야 한다. `updatedAt` 만 쌓이고 아무도 읽지 않는 문서가 된다.

**선행 조건이 계약 밖에 있다**: `validation.ts:17-18` 이 밝힌다 — '문자열 추출(EXC-17: named interpolation whole string)이 선행 조건이다. 문장을 조각내 이어 붙인 copy 가 남아 있으면 추출이 기계적으로 되지 않는다.' **번역 리소스 계약(EP 미정)은 그 다음이다.**

### 7.6 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **로케일 카탈로그(EP-03)가 심 없음(미정)** — 후보 4종이 코드 상수다(`validation.ts:22,34-39`). **현재로선 그것이 옳다**(§4 EP-03): 서버가 '지원 가능 로케일'을 말하려면 번역 리소스가 있어야 하는데 없다. **i18n 도입 시 이 판정을 뒤집는다** — 그때 카탈로그는 '번역이 존재하는 로케일'의 파생이 된다. **연동 시 화면 코드가 함께 바뀐다**(`LANGUAGE_META` import → `useQuery`) — 어댑터만 바꾸면 되는 작업으로 산정하면 빠진다 | A63 · A11 (i18n 도입 시) |
| 2 | **이 계약에 소비자가 없다**(§7.5) — 정책이 저장되나 아무도 읽지 않는다. i18n 도입(`validation.ts:12` `// TODO(lib)`)이 선행돼야 하고, 그 선행 조건은 문자열 추출(EXC-17)이다 | A01 (도메인 경계) · A11 |
| 3 | **422 `error.fields` 를 프론트가 필드 인라인 오류로 매핑하지 않는다** — `useCrudForm` 미사용이라 그 훅의 422 처리를 상속하지 못했다. 모든 저장 실패가 FS-068-EL-018 배너로 뭉개진다(quality-bar EXC-07 P1). **멱등키 부재**(§7.4)도 함께 — 데이터는 `If-Match` 로 안전하고 잔여는 UX(quality-bar EXC-08 P0) | A11 · A63 |
| 4 | **서버 불변식 위반 문서의 가능성**(EP-01) — 시딩·마이그레이션이 교차 규칙을 깬 문서를 만들면(예: `supported: []`) 화면이 **사용자가 만들지 않은 오류**를 보인다. 아울러 **미설정 상태의 계약**이 미정이다 — 서버가 기본값 문서를 시딩하지 않으면 EP-01 이 404 를 낼 수 있고 화면에 그 분기가 **없다**(BE-067 §7.6 #5 와 같은 뿌리) | A63 |
| 5 | **`supported` 정규화를 서버가 하지 않으면 거짓 dirty·거짓 충돌이 난다**(§7.2) — `diff.ts:13-20` 의 비교가 **순서를 포함**하기 때문이다. 서버 정규화(중복 제거 + 정의 순서 정렬)를 계약에 넣는다 | A63 |
| 6 | **감사 주체·시각을 서버가 찍는다**(§7.3 = BE-067 §7.3) — `CURRENT_ADMIN` 하드코딩 제거. **심이 이미 선언**(`_shared/store.ts:83`) | **A63 (최우선 — 4화면 공통)** |
| 7 | `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않아** 화면이 401/403/404/500 을 구분하지 못한다 — 409 만 `SettingsConflictError` 로 갈린다(quality-bar EXC-06 · EXC-12 P1). **설정 4화면 공통** | A11 · A63 |
| 8 | `revision` 이 `rev-<seq>` 전역 단조 증가라 **모든 설정 문서가 시퀀스를 공유**한다(`store.ts:86-91`) — 픽스처 한정이며 서버는 문서별 ETag 를 쓴다. 현재 프론트는 revision 을 불투명 문자열로만 다뤄 의존이 없다 | A63 |

## 8. 자기 점검

- [x] FS-068 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 2건(EP-01·02) 매핑 완료, 심 없는 1건(EP-03 로케일 카탈로그)을 '심 없음(미정)' 으로 명시**하고 §7.6 #1 판정을 남겼다
- [x] **엔드포인트를 발명하지 않았다** — `GET/PUT /api/settings/languages` 는 `data-source.ts:20` 에 실재하고 `If-Match`·바디 3필드·200/409·412/422 도 `:21-22` 에 실재한다. §1.1 근거표가 각 항목의 file:line 을 댄다. **EP-03 은 만들지 않았다**
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (2행 × 9열 — 심 없는 EP-03 은 계약이 없어 행이 없음을 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **동시성·감사·403·권한을 BE-067 상속으로 선언**하고 **언어 고유 차이만**(교차 규칙 3개 · 배열 정규화 · 소비자 부재) 기술했다
- [x] 멱등성 판정 — 조회 GET 멱등 / **저장은 `If-Match` 로 조건부 멱등이며 그것이 멱등키의 안전 목표를 이미 달성함을 §7.4 에 명시**
- [x] **보안 판정** — 서버 재검증(§7.1)에서 **이 화면은 보안 등급이 낮고 가용성 등급이 높음**을 구분했고, **XSS 정제가 필요 없는 이유**(전 필드가 enum — 자유 텍스트 0)를 BE-067·BE-070 과 대조해 명시했다. 상속 판정(§7.3)에 동시성·감사 위조·403 은닉을 모았다
- [x] **낙관적 동시성이 revision 토큰 기반**임을 `store.ts:124-126` + `store.test.ts` 로 확인하고 §7.3 에 BE-067 상속으로 선언했다
- [x] `validation.ts` 의 교차 규칙 3개와 **평가 순서(규칙 1 이 걸리면 return)** 를 §3 표와 §5 의 422 축에 정확히 반영했다
- [x] **기본 언어·폴백 삭제 방지가 화면 잠금(FS-068-EL-004.4)과 스키마 교차 규칙 두 겹임을 확인**하고, 서버가 세 번째 겹이어야 함을 §7.1 에 근거와 함께 기술했다 — §5 의 422 상태위반 축에 세 규칙을 전부 나열했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
</content>
