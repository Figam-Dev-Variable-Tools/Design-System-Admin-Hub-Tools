---
id: BE-001
title: "로그인 백엔드 기능 명세"
functionalSpec: FS-001
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-001. 로그인 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-001 로그인 (`/login`) |
| 범위 | 이메일·비밀번호 인증 1건. 인증 성공 시 세션 객체 발급, 실패 4종(자격 증명 불일치 · 계정 잠금 · 계정 비활성 · 서버 오류) 판정, 계정 단위 실패 카운트·30분 잠금, IP 단위 무차별 대입 방어 |
| 범위 밖 | (1) 로그아웃 — FS-001·FS-002 어디에도 로그아웃 요소가 없다(FS-002 §4.1 '세션 만료' 행: "현재 구현의 대시보드에는 세션 검사·로그아웃 요소가 없다"). 근거 FS 요소가 없는 엔드포인트는 만들지 않는다. (2) 세션 검증·갱신 엔드포인트 — 프론트는 브라우저 저장소의 세션을 동기적으로 읽어 형식만 검사한다(FS-001-EL-025). 서버 검증 요소가 FS에 없다. (3) 비밀번호 재설정·회원가입 — FS-001 §3에 요소가 없다. (4) 세션 자격 증명의 후속 API 전달 방식 — §7.1 참조 |
| 전제 | 모든 경로는 `/api` 프리픽스. 요청·응답 본문은 `application/json; charset=utf-8`. 이 엔드포인트는 미인증(익명) 호출 전용이다 |
| 프론트 어댑터 | `apps/admin/src/pages/login/api.ts` (`login`, `normalizeEmail`, `LOGIN_TIMEOUT_MS`, `MAX_LOGIN_ATTEMPTS`, `LOCK_DURATION_MS`) |
| 도메인 타입 | `apps/admin/src/pages/login/api.ts` (`LoginInput`, `LoginResult`, `AuthSession`, `UserRole`) |
| 유효성 규칙 원천 | `apps/admin/src/pages/login/validation.ts` 의 **zod 스키마 `loginSchema`**(`:44`)가 정본이다. 길이 상수는 **모듈 사설**이며 export 되지 않는다 — `EMAIL_MAX_LENGTH=254`(`:16`) · `PASSWORD_MIN_LENGTH=8`(`:18`) · `PASSWORD_MAX_LENGTH=64`(`:19`). 값은 이 문서 §4 서버 제약과 짝을 이루며, 서버도 같은 값을 다시 검증한다 — 프론트 검증은 UX 이지 보증이 아니다(`validation.ts:10-12`) |

## 2. 공통 에러 봉투

모든 4xx / 5xx 응답은 아래 봉투를 따른다. 예외 없다. 엔드포인트별로 다른 응답 형식을 정의하지 않는다.

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 일치하지 않습니다.",
    "fields": null,
    "details": { "failedCount": 3, "maxAttempts": 5 },
    "traceId": "01J8X4K2M9P7Q3R5S6T8V0W2Y4"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `error.code` | string | O | 기계 판정용 에러코드 (SCREAMING_SNAKE_CASE). 프론트 분기의 유일한 근거 |
| `error.message` | string | O | 사용자에게 그대로 보여줄 수 있는 문구. **내부 정보(스택·쿼리·경로·계정 존재 여부) 노출 금지** |
| `error.fields` | array \| null | O (없으면 `null`) | 400 검증 실패 시에만 채운다. 원소 = `{ name, code, message }`. 프론트가 `name` 으로 입력 필드에 매핑한다 |
| `error.details` | object \| null | O (없으면 `null`) | 코드별 부가 데이터. **키 집합은 `error.code` 마다 §4의 에러 목록이 확정한다.** 봉투 구조 자체는 바뀌지 않는다 |
| `error.traceId` | string | O | 로그 상관관계 ID. 500 문의 시 사용자가 그대로 전달한다 |

`error.fields[]` 의 `code` 값은 `REQUIRED` · `INVALID_FORMAT` · `OUT_OF_RANGE` 3종으로 한정한다.

### 2.1 공통 에러코드

전 엔드포인트에서 발생할 수 있는 코드다. 엔드포인트 고유 코드는 §4의 '에러 목록'에 기술한다.

| HTTP | 에러코드 | 발생 조건 | 프론트 처리 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 요청 파라미터가 제약 위반 | `error.fields` 를 입력 필드에 매핑해 표시 |
| 401 | `UNAUTHENTICATED` | 세션 자격 증명 없음·만료 | `/login?returnUrl=<현재경로>&reason=session_expired` 로 이동. **BE-001-EP-01 에는 발생하지 않는다 — §3.3 참조** |
| 403 | `FORBIDDEN` | 인증됐으나 역할 부족 | 권한 없음 표시 |
| 429 | `RATE_LIMITED` | 레이트리밋 초과. `Retry-After` 헤더(초)를 함께 반환 | `Retry-After` 초 뒤 재시도 안내 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | 일반 문구 + `traceId` 표시. **원인 노출 금지** |

## 3. 인증 · 권한 모델

### 3.1 역할

| 역할 | 설명 | 비고 |
|---|---|---|
| `system_admin` | 시스템 관리자. 전체 기능 + 기능 권한(feature key) 설정 변경 | 프론트 `UserRole` 의 첫 번째 값 (api.ts) |
| `operator` | 운영자. 업무 데이터 조회·처리 | |
| `viewer` | 조회 전용 사용자 | |

역할은 **인증 성공 응답(`session.role`)으로만 전달**된다. BE-001-EP-01 자체는 미인증 호출 전용이므로 역할로 접근을 제한하지 않는다 — FS-001 §4.1 '권한 없음' 규칙: "이 화면은 인증 이전 화면이므로 역할 기반 권한 판정이 성립하지 않는다".

### 3.2 403 vs 404 은닉 정책

| 리소스 | 권한 부족 시 응답 | 근거 |
|---|---|---|
| `POST /api/auth/session` — 미등록 이메일 | **401 `INVALID_CREDENTIALS`** (404 사용 금지) | FS-001-EL-019 비고: "존재하지 않는 계정도 동일 결과로 처리된다(계정 존재 여부 비노출)". 404 를 쓰면 그 자체가 계정 열거 오라클이 된다. 미등록 이메일은 오답 비밀번호와 **에러코드·문구·`details.failedCount` 까지 동일**한 응답을 받는다 |
| `POST /api/auth/session` — 잠긴 계정 | **423 `ACCOUNT_LOCKED`** | 미등록 이메일도 동일 임계값(연속 5회)에서 동일하게 잠긴다(§4 잠금 규칙 3). 따라서 423 응답은 계정 존재를 노출하지 않는다 |
| `POST /api/auth/session` — 비활성 계정 | **403 `ACCOUNT_INACTIVE`** | 자격 증명(비밀번호)이 **일치한 경우에만** 반환한다. 비밀번호를 아는 시점에 계정 존재는 이미 알려진 정보이므로 증분 노출이 없다. 비밀번호가 틀린 비활성 계정은 401 `INVALID_CREDENTIALS` 로 응답한다 |
| `POST /api/auth/session` — 엔드포인트 자체 | 404 를 사용하지 않는다 | 경로는 익명에게 항상 존재한다. 이 계약에서 404 는 어떤 조건에서도 반환되지 않는다 |

### 3.3 401 의 이중 의미 — 이 엔드포인트의 예외 규칙

공통 401 `UNAUTHENTICATED`(§2.1)의 프론트 처리는 **로그인 화면으로 리다이렉트**다. 이 규칙을 BE-001-EP-01 에 적용하면 로그인 화면이 자기 자신으로 리다이렉트하는 무한 루프가 된다.

확정 규칙:

1. BE-001-EP-01 은 **`UNAUTHENTICATED` 를 반환하지 않는다.** 세션 없이 호출하는 것이 이 엔드포인트의 정상 경로다.
2. BE-001-EP-01 이 반환하는 401 은 `INVALID_CREDENTIALS` **1종뿐**이며, 의미는 '인증 시도 실패'다. 프론트는 리다이렉트하지 않고 FS-001-EL-019 danger Alert 를 렌더한다.
3. 이미 유효한 세션을 들고 호출해도 거부하지 않고 새 세션을 발급한다. (프론트는 FS-001-EL-025 로 진입 자체를 막으므로 정상 경로에서 발생하지 않는다.)

## 4. 엔드포인트 명세

### BE-001-EP-01 · 인증 (세션 발급)

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-001-EL-016 (제출 버튼 → 인증 요청, FS-001 §5의 유일한 `[서버]` 요소). 응답 분기 근거: FS-001-EL-019(자격 증명 불일치·실패 카운트) · FS-001-EL-020(계정 잠금 5회·30분) · FS-001-EL-021(계정 비활성) · FS-001-EL-022(서버 오류) · FS-001-EL-024(프론트 10초 타임아웃) |
| 메서드 · 경로 | `POST /api/auth/session` |
| 권한 | 익명(미인증) 호출 전용. 역할 판정 없음 (§3.1) |
| 멱등성 | **멱등** — 동일 요청을 재시도해도 자원이 중복 생성되지 않는다(세션은 응답 바디로만 전달되고 서버에 세션 레코드를 만들지 않는다 — §4.1). `Idempotency-Key` 를 요구하지 않는다. 사유: 실패 요청의 재시도가 실패 카운트를 증가시키는 것은 **무차별 대입 방어의 정상 동작**이며 중복 억제 대상이 아니다 |
| 페이징 | N/A — 단건 인증이며 목록 응답이 아니다 |

**요청 — 바디**

| 위치 | 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|---|
| 바디 | `email` | string | O | 1–254자. 형식 `로컬부@도메인부.TLD` (공백 불가, `@` 정확히 1개, 도메인부에 `.` 1개 이상). 프론트가 소문자·trim 정규화(`normalizeEmail`)해 보내지만, **서버는 신뢰 경계이므로 동일 정규화를 재수행한 뒤 검증한다** |
| 바디 | `password` | string | O | 8–64자. 구성 문자 제한 없음. **trim 하지 않는다** — 공백도 유효 문자다 (`validatePassword` 와 동일 규칙) |

```json
{ "email": "admin@tds.local", "password": "password123" }
```

**응답 200** — 발급된 세션 (프론트 `AuthSession`)

```json
{
  "session": {
    "userId": "u-001",
    "email": "admin@tds.local",
    "role": "system_admin",
    "issuedAt": 1784044800000
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `session.userId` | string | 사용자 식별자. 프론트 `AuthSession.userId` 와 필드명·타입 일치 |
| `session.email` | string | **정규화된**(소문자·trim) 이메일. 요청값이 아니라 서버 정규화 결과를 돌려준다 |
| `session.role` | string | `system_admin` \| `operator` \| `viewer` (프론트 `UserRole`) |
| `session.issuedAt` | number | 발급 시각. **epoch milliseconds 정수** (프론트 `session.ts` 의 `isAuthSession` 이 `typeof === 'number'` 로 검사한다) |

세션 발급 방식: **응답 바디의 `session` 객체 1건**이다. `Set-Cookie` 를 발급하지 않는다 — 프론트는 이 객체를 브라우저 저장소에 직접 기록한다(`writeSession`). 세션 보관 위치·returnUrl 이동 경로(FS-001-EL-026)·'이메일 저장'(FS-001-EL-015)은 전부 프론트 소관이며 이 계약의 관심사가 아니다. 이 문서는 **발급 시점의 응답 스키마까지만** 확정한다.

**잠금 · 실패 카운트 규칙** (FS-001-EL-019 · FS-001-EL-020)

1. 실패 카운트는 **정규화된 이메일 문자열 1건을 키로** 서버가 관리한다. 계정 존재 여부와 무관하게 누적한다.
2. 자격 증명 불일치 1건마다 카운트를 1 증가시키고, 증가 후 값을 `details.failedCount` 로 반환한다. `details.maxAttempts` 는 상한 5 고정(프론트 `MAX_LOGIN_ATTEMPTS = 5`).
3. 카운트가 5에 도달하면 그 응답부터 **423 `ACCOUNT_LOCKED`** 로 전환하고 30분(프론트 `LOCK_DURATION_MS = 30 * 60 * 1000`) 잠근다. **미등록 이메일도 동일하게 잠근다** — 그렇지 않으면 "5회를 넘겨도 잠기지 않는 이메일 = 미등록"이라는 계정 열거 오라클이 생긴다.
4. 잠금 중 제출은 카운트를 더 증가시키지 않고 423 을 반환한다. 잠금 만료 시각이 지나면 카운트를 0으로 리셋하고 다시 판정한다.
5. 인증 성공 시 카운트와 잠금을 0으로 리셋한다.
6. 400 검증 실패는 카운트를 증가시키지 않는다 — 자격 증명 검증 이전 단계다. (IP 레이트리밋에는 포함된다.)
7. 잠금 해제 시각은 **응답 바디에 넣지 않는다.** 사유: 프론트 `LoginResult` 의 `account_locked` 배리언트가 `{ ok: false, kind: 'account_locked' }` 로 부가 필드를 갖지 않고, FS-001-EL-020 의 문구가 '30분'을 고정 문구로 포함한다. 대신 잔여 초를 **`Retry-After` 헤더**로 반환한다 — 헤더는 프론트 타입에 영향을 주지 않으면서 운영·클라이언트 재시도 정책에 쓰인다.

**레이트리밋 규칙** (계정 잠금과 **별개**로 필요하다)

계정 단위 잠금(5회)만으로는 무차별 대입을 막지 못한다. 공격자가 이메일을 바꿔가며 시도하면(패스워드 스프레이·계정 열거) 이메일당 5회 × 무한 이메일 = 사실상 무제한 시도가 된다. 따라서 **호출자 단위 제한을 별도로 둔다.**

| 기준 | 상한 | 초과 시 |
|---|---|---|
| 클라이언트 IP | 분당 20회 · 시간당 100회 | 429 `RATE_LIMITED` + `Retry-After`(초) |
| 정규화된 이메일 | 연속 실패 5회 (레이트리밋이 아니라 잠금) | 423 `ACCOUNT_LOCKED` (위 잠금 규칙) |

두 제한은 독립이며 동시에 적용된다. IP 기준 429 는 계정 존재 여부를 노출하지 않는다(요청 수만으로 판정한다). 인증 성공 요청도 IP 카운트에 포함한다.

**타임아웃 규칙** (FS-001-EL-024 — 프론트 상한 `LOGIN_TIMEOUT_MS = 10초`)

| 항목 | 확정값 |
|---|---|
| 서버 인증 처리 상한 | **5초**. 5초 안에 판정을 끝내지 못하면 요청을 중단하고 504 `AUTH_TIMEOUT` 을 반환한다 |
| 프론트 상한 | 10초 (`AbortController.abort()` → `LoginAbortError` → FS-001-EL-022) |
| 어긋남 여부 | 서버 5초 < 프론트 10초 — **서버가 먼저 끊는다.** 정상 네트워크에서 프론트 abort 는 발생하지 않는다 |

**abort 이후 세션 발급 경합** — 프론트가 10초에 abort 한 뒤 서버 응답이 도착하는 경우가 이론적으로 남는다(네트워크 지연). 대응을 아래로 확정한다.

1. **세션은 응답 바디로만 전달되고 서버는 세션 레코드를 만들지 않는다.** 응답이 프론트에 도달하지 못하면 세션은 어디에도 남지 않는다 — 사용자가 실패 배너를 보는 동안 서버에 유령 세션이 살아 있는 상태가 성립하지 않는다.
2. **`Set-Cookie` 를 발급하지 않는 두 번째 이유가 이것이다.** 쿠키는 abort 이후에도 브라우저에 설치될 수 있어, 프론트가 FS-001-EL-022 실패 배너를 띄운 채 인증 상태가 되는 모순이 생긴다.
3. 실패 카운트 갱신은 abort 여부와 무관하게 커밋된다. 인증이 성공 판정된 요청이 abort 되면 카운트는 0으로 리셋된 상태로 남는다 — 사용자가 재제출하면 다시 성공하므로 무해하다.
4. 서버는 클라이언트 연결 종료를 감지해도 인증 판정을 롤백하지 않는다. 이 엔드포인트는 멱등하므로 재시도가 안전하다.

**에러 목록**

| HTTP | 에러코드 | 조건 | `error.details` | 프론트 표시 문구 (FS 요소) |
|---|---|---|---|---|
| 400 | `VALIDATION_FAILED` | `email` 미입력·형식 위반·254자 초과 / `password` 미입력·8자 미만·64자 초과 | `null`. `error.fields[]` 에 `{ name: "email" \| "password", code: "REQUIRED" \| "INVALID_FORMAT" \| "OUT_OF_RANGE", message }` 를 채운다 | 프론트 선검증(FS-001-EL-016)을 통과한 요청에서는 발생하지 않는다. 도달 시 FS-001-EL-022 문구 (§6.1 매핑 · §7.2 한계) |
| 401 | `INVALID_CREDENTIALS` | 비밀번호 불일치 **또는** 미등록 이메일 **또는** 비활성 계정의 비밀번호 불일치 — 세 경우가 **완전히 동일한 응답**이다 (§3.2) | `{ "failedCount": number, "maxAttempts": 5 }` | FS-001-EL-019 — '이메일 또는 비밀번호가 일치하지 않습니다. (실패 N/5회)' |
| 403 | `ACCOUNT_INACTIVE` | 비밀번호가 **일치**하고 계정이 비활성 | `null` | FS-001-EL-021 — '사용이 중지된 계정입니다. 시스템 관리자에게 문의하세요.' |
| 423 | `ACCOUNT_LOCKED` | 연속 실패 5회 도달 또는 잠금(30분) 유지 중. 미등록 이메일도 동일 | `null`. 잔여 초는 `Retry-After` 헤더 | FS-001-EL-020 — '비밀번호 5회 오류로 계정이 잠겼습니다. 30분 후 다시 시도하거나 시스템 관리자에게 문의하세요.' |
| 429 | `RATE_LIMITED` | IP 기준 분당 20회 또는 시간당 100회 초과 | `null`. 잔여 초는 `Retry-After` 헤더 | FS-001-EL-022 (§6.1 매핑 · §7.2 한계) |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류. 스택·쿼리·경로·계정 존재 여부를 문구에 담지 않는다 | `null`. `traceId` 필수 | FS-001-EL-022 — '일시적인 오류로 로그인하지 못했습니다. 다시 시도해 주세요.' |
| 504 | `AUTH_TIMEOUT` | 서버 인증 처리가 5초 상한 초과 | `null` | FS-001-EL-022 |

## 5. 예외 매트릭스

행 수 = §4의 엔드포인트 수(1건). 빈칸 없음.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| BE-001-EP-01 | `VALIDATION_FAILED` + `error.fields[]` 에 `name`(`email`\|`password`) · `code`(`REQUIRED`\|`INVALID_FORMAT`\|`OUT_OF_RANGE`) 반환 → 프론트가 FS-001-EL-009 / FS-001-EL-013 인라인 에러에 매핑 가능. 카운트 미증가(잠금 규칙 6) | **`UNAUTHENTICATED` 는 N/A** — 세션 없이 호출하는 것이 정상 경로이며, 리다이렉트 대상이 자기 자신이라 루프가 된다(§3.3). 이 엔드포인트의 401 은 `INVALID_CREDENTIALS`(인증 시도 실패) 1종이며 프론트는 리다이렉트하지 않고 FS-001-EL-019 배너를 렌더한다 | **404 를 쓰지 않는다.** 미등록 이메일·오답 비밀번호·비활성 계정의 오답 = 전부 401 `INVALID_CREDENTIALS`(동일 코드·문구·`failedCount`) — 계정 존재 비노출(FS-001-EL-019). 403 은 `ACCOUNT_INACTIVE` 에만 쓰며 **비밀번호 일치 이후에만** 반환하므로 열거 오라클이 되지 않는다(§3.2) | N/A — 계정 존재 여부 자체가 비노출 대상이므로 404 를 반환하지 않는다. 미등록 이메일은 401 `INVALID_CREDENTIALS` 로 흡수된다. 엔드포인트 경로는 익명에게 항상 존재한다 | N/A — 세션 생성은 기존 자원을 수정하지 않으며 동일 계정의 동시 로그인을 허용한다(단말 수 제한 요소가 FS-001 §3에 없다). 낙관적 잠금(버전/ETag) 대상 자원이 없다 | N/A — 계정 상태 위반(비활성)은 '접근 금지' 의미가 강해 403 `ACCOUNT_INACTIVE` 로 응답한다(§3.2). 그 외 상태 위반(비밀번호 만료·약관 미동의 등)은 FS-001 §3에 요소가 없어 이 계약에 존재하지 않는다 | 429 `RATE_LIMITED` — IP 기준 분당 20회 · 시간당 100회. `Retry-After`(초) 반환. **계정 잠금(5회)과 독립**이다: 잠금만으로는 이메일을 바꿔가며 시도하는 패스워드 스프레이·계정 열거를 막지 못한다. 프론트는 `server_error` 로 흡수 → FS-001-EL-022 (§7.2 한계) | 500 `INTERNAL_ERROR` + `traceId`. 문구는 '일시적인 오류로 로그인하지 못했습니다. 다시 시도해 주세요.'(FS-001-EL-022)로 일반화하며 스택·쿼리·경로·계정 존재 여부를 담지 않는다 | 서버 5초 / 프론트 10초(`LOGIN_TIMEOUT_MS`) — **서버가 먼저 끊는다**(504 `AUTH_TIMEOUT`). abort 이후 세션 발급 경합은 세션 레코드·`Set-Cookie` 를 만들지 않는 설계로 차단한다(§4 타임아웃 규칙 1·2). 실패 카운트는 abort 와 무관하게 커밋되며 재제출이 안전하다(멱등) |

## 6. 프론트 연동 대조

### 6.1 어댑터 ↔ 엔드포인트 매핑

`apps/admin/src/pages/login/api.ts` 의 export 를 전수 나열한다.

| api.ts export | 교체 지점 주석 | 엔드포인트 | 요청 타입 | 응답 타입 | 필드 일치 |
|---|---|---|---|---|---|
| `login(input: LoginInput, signal: AbortSignal): Promise<LoginResult>` | 파일 헤더: "실제 API가 준비되면 이 모듈만 교체하면 된다(호출부 시그니처 유지)" | BE-001-EP-01 | `LoginInput` = `{ email, password }` → 요청 바디와 동일 | `LoginResult` (판별 유니온) ← HTTP 응답을 §6.2 표로 매핑 | O |
| `normalizeEmail(email: string): string` | — | BE-001-EP-01 (요청 전처리) | `string` | `string` | O — 서버가 동일 정규화(소문자·trim)를 **재수행**한다 |
| `MAX_LOGIN_ATTEMPTS = 5` | — | BE-001-EP-01 (`details.maxAttempts`) | — | `number` | O — 서버 확정값 5와 동일 |
| `LOCK_DURATION_MS = 30 * 60 * 1000` | — | BE-001-EP-01 (잠금 규칙 3) | — | `number` | O — 서버 확정값 30분과 동일 |
| `LOGIN_TIMEOUT_MS = 10 * 1000` | — | BE-001-EP-01 (타임아웃 규칙) | — | `number` | O — 서버 상한 5초 < 프론트 10초 |
| `AuthSession` / `UserRole` / `LoginInput` / `LoginResult` (타입) | — | BE-001-EP-01 | — | — | O — §6.3 필드 대조 |
| `LoginAbortError` | — | N/A — 클라이언트 abort 를 표현하는 프론트 전용 에러다. 서버 응답이 아니다 | — | — | N/A |
| `session.ts` — `readSession` · `writeSession` · `readRememberedEmail` · `writeRememberedEmail` · `clearRememberedEmail` | — | N/A — 브라우저 저장소 접근이며 서버 호출이 아니다(FS-001-EL-015 · EL-025). 이 계약의 대상이 아니다 | — | — | N/A |
| `validation.ts` — `loginSchema`(zod) · 길이 상수(모듈 사설) | — | BE-001-EP-01 (400 제약과 동일 규칙) | `LoginFormValues` = `{ email, password, rememberEmail }` | — | O — 이메일 254자·비밀번호 8~64자·비밀번호 미trim 규칙이 서버 검증과 동일. **손으로 쓴 `validateEmail`/`validatePassword` 는 삭제됐다** — 규칙의 정본은 이제 zod 스키마 1벌뿐이다(`validation.ts:3-4`). `rememberEmail` 은 검증 대상이 아니며 서버로 보내지 않는다(폼 값이라 스키마에 함께 둔 것) |

### 6.2 HTTP 응답 ↔ `LoginResult` 매핑 (어댑터 내부 변환)

`login()` 내부가 이 표대로 변환한다. **`LoginResult` 타입 자체는 바뀌지 않는다.**

| HTTP · `error.code` | `LoginResult` |
|---|---|
| 200 | `{ ok: true, session: body.session }` |
| 401 `INVALID_CREDENTIALS` | `{ ok: false, kind: 'invalid_credentials', failedCount: details.failedCount, maxAttempts: details.maxAttempts }` |
| 423 `ACCOUNT_LOCKED` | `{ ok: false, kind: 'account_locked' }` |
| 403 `ACCOUNT_INACTIVE` | `{ ok: false, kind: 'account_inactive' }` |
| 400 `VALIDATION_FAILED` | `{ ok: false, kind: 'server_error' }` — 프론트 선검증을 통과한 요청이 400 을 받는 것은 클라이언트 버그다. `LoginResult` 에 필드 매핑 경로가 없다 (§7.2) |
| 429 `RATE_LIMITED` | `{ ok: false, kind: 'server_error' }` (§7.2) |
| 500 `INTERNAL_ERROR` · 504 `AUTH_TIMEOUT` | `{ ok: false, kind: 'server_error' }` |
| 네트워크 예외 · `AbortSignal` 중단 | `LoginAbortError` throw → 호출부가 FS-001-EL-022 로 처리 |

### 6.3 응답 필드 대조 (`AuthSession`)

| 프론트 타입 필드 (api.ts) | 프론트 타입 | 응답 스키마 필드 | 응답 타입 | 일치 |
|---|---|---|---|---|
| `userId` | `string` | `session.userId` | string | O |
| `email` | `string` | `session.email` | string | O |
| `role` | `'system_admin' \| 'operator' \| 'viewer'` | `session.role` | string (동일 enum) | O |
| `issuedAt` | `number` | `session.issuedAt` | number (epoch ms) | O |

`session.ts` 의 `isAuthSession` 이 위 4개 필드의 타입과 `role` enum 을 검사한다 — 서버 응답이 이 검사를 통과해야 세션이 유효로 인정된다(FS-001-EL-025).

## 7. 결정 필요 사항 · 프론트 변경 필요

### 7.1 범위 밖 — 이 계약이 확정하지 않는 것

| 항목 | 판단 | 후속 |
|---|---|---|
| 로그아웃 엔드포인트 | **만들지 않는다.** FS-001 §3 · FS-002 §3 어디에도 로그아웃 요소가 없다(FS-002 §4.1: "대시보드에는 세션 검사·로그아웃 요소가 없다"). 근거 FS 요소가 없는 엔드포인트는 유령 기능이 된다 | 로그아웃 요소가 화면에 도입되면 기능 명세 가 FS 에 요소를 추가한 뒤 BE 를 개정한다 |
| 세션 검증·갱신 엔드포인트 | **만들지 않는다.** 프론트는 브라우저 저장소의 세션을 동기적으로 읽어 **형식만** 검사한다(FS-001-EL-025). 서버 검증 요소가 FS 에 없다 | 동일 |
| 세션 자격 증명의 후속 API 전달 방식 (HttpOnly 쿠키 vs `Authorization` 헤더) | **이 문서에서 확정하지 않는다.** FS-001 에 해당 요소가 없고, 현재 프론트는 세션 객체를 브라우저 저장소에 보관하기만 한다. BE-001-EP-01 은 **발급 응답 스키마까지만** 확정한다 | **아키텍처 판정 대상.** BE-002 의 401 `UNAUTHENTICATED` 는 전달 방식과 무관하게 '유효한 자격 증명 없음'으로 정의된다 |

### 7.2 프론트 변경 필요 (임의로 다른 모양을 확정하지 않고 기록만 한다)

| # | 내용 | 영향 | 권고 |
|---|---|---|---|
| 1 | `LoginResult` 에 레이트리밋 배리언트가 없다 | 429 `RATE_LIMITED` 를 `server_error` 로 흡수하므로 사용자는 '일시적인 오류' 문구를 본다 — 재시도 대기 시간을 안내하지 못한다 | `kind: 'rate_limited'` + `retryAfterSec` 배리언트 추가 → 프론트 구현 쪽 변경 요청. 현행 계약은 `server_error` 매핑으로 동작한다 |
| 2 | `LoginResult` 에 400 필드 검증 배리언트가 없다 | 서버 400 을 `server_error` 로 흡수한다. 정상 경로에서는 프론트 선검증이 선행하므로 발생하지 않는다 | 현행 유지로 충분하다. 서버 검증은 신뢰 경계로서 유지한다 |
| 3 | mock `api.ts` 는 **비밀번호 확인 전에** 비활성 계정을 판정한다 (`if (account && !account.active)` — 130~160행) | mock 은 비밀번호 없이도 계정 비활성 여부를 노출한다 = 계정 열거 오라클. 서버 규칙(§3.2)은 **비밀번호 일치 이후에만** `ACCOUNT_INACTIVE` 를 반환한다 | mock 교체 시 자연히 해소된다. `LoginResult` 타입 변경은 없다 |

## 8. 자기 점검 (제출 전 확인)

- [x] FS-001 §5(서버 연동 지점)의 요소 — FS-001-EL-016 1건 — 이 BE-001-EP-01 로 커버됐다 (누락 0건)
- [x] 모든 엔드포인트(1건)가 `근거 (FS)` 에 FS 요소 번호를 역참조한다 (고아 엔드포인트 0건)
- [x] §5 예외 9축에 빈칸 0건. 모든 `N/A` 에 사유가 붙어 있다
- [x] §2 공통 에러 봉투를 1회 정의했고, §4는 에러코드 목록만 나열한다 (봉투 재정의 0건 — `details` 는 §2 봉투의 필드다)
- [x] §3.2 403 vs 404 은닉 정책이 조건별로 명시됐고 §5의 `403 vs 404` 열과 모순되지 않는다
- [x] §6에서 `api.ts` 의 모든 export 가 매핑됐고, 응답 필드명·타입 불일치 0건 (§6.3)
- [x] 쓰기 엔드포인트의 멱등성을 판정했다 (멱등 — 멱등키 불요, 사유 기술)
- [x] 목록 엔드포인트가 없으므로 페이징은 N/A (사유 기술)
- [x] 500 응답 문구에 내부 정보(스택·쿼리·경로·계정 존재 여부)가 없다
- [x] 서버 코드·데이터 저장 설계를 쓰지 않았다 — API 계약(요청·응답·에러·권한·멱등성)까지만 기술했다
- [x] 모호어 0건
