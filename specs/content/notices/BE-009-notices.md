---
id: BE-009
title: "공지사항 관리 백엔드 기능 명세"
functionalSpec: FS-009
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-009. 공지사항 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-009 공지사항 관리 (`/content/notices` · `/:id` · `/new` · `/:id/edit`) |
| 범위 | 공지 목록 조회(분류 × 상태 AND · 제목 검색 · 페이징 · 분류별/상태별 건수), 공지 상세 조회, 공지 등록·수정·삭제(단건·일괄) |
| 범위 밖 | **CSV/직렬화** — 없음. **사용자(고객) 노출 렌더** — 게시된 공지가 고객 화면에서 어떻게 보이는지의 계약은 이 문서 밖(§7.3 XSS 판정만 남긴다). **자동 게시 스케줄러의 내부 구현** — 관측 가능한 계약만 정한다(§7.4) |
| 전제 | 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/content/notices/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/content/notices/types.ts` |

> **에러 봉투·인증/권한 모델 상속**: 이 문서는 **BE-003 §2(공통 에러 봉투)·§3(인증·권한 모델)을 그대로 상속**한다(도메인마다 다른 형식을 만들면 백엔드가 두 벌을 구현하게 된다). 아래 §2 는 상속을 선언하고 **콘텐츠 도메인 고유의 차이만** 기술한다. 콘텐츠 6종(공지·FAQ·팝업·배너·약관·개인정보)은 이 봉투·권한 모델을 공유한다.

## 2. 공통 에러 봉투 · 권한 모델 (상속)

### 2.1 에러 봉투 — BE-003 §2 상속

모든 4xx/5xx 는 BE-003 §2 의 봉투(`{ error: { code, message, fields?, traceId } }`)를 따른다. **재정의하지 않는다.** 각 엔드포인트(§4)는 에러코드 목록만 나열한다. 공통 에러코드(`VALIDATION_FAILED` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `CSRF_TOKEN_INVALID` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `UNPROCESSABLE` 422 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500 · `REQUEST_TIMEOUT` 504)는 BE-003 §2.1 과 동일하다.

### 2.2 인증·권한 모델 — BE-003 §3 상속 + 콘텐츠 역할 매핑

| 역할 | 공지 도메인 권한 |
|---|---|
| `admin` | 조회 · 등록 · 수정 · 삭제 전부 |
| `operator` | **조회 계열만**(목록·상세). 쓰기(등록·수정·삭제) → **403 `FORBIDDEN`** |
| 콘텐츠 도메인 권한 없는 인증 관리자 | 컬렉션(`GET /api/notices`) → 403. 개별(`GET /api/notices/:id`) → **404 `NOTICE_NOT_FOUND`** 은닉 |

- **403 vs 404 은닉 정책은 BE-003 §3.2 를 상속한다.** 컬렉션의 존재는 비밀이 아니므로 403. 개별 리소스는 읽기 권한이 없는 주체에게 404 로 은닉하되, 읽기 권한이 있고 쓰기 권한만 없는 주체(`operator`)에게는 403 을 준다.
- **단, 공지는 회원 개인정보가 아니다** — 개별 공지의 존재 은닉(404)은 개인정보 보호가 아니라 **id 열거 차단**의 이유로만 적용한다. 프론트는 404 를 '공지를 찾을 수 없습니다.'(FS-009-EL-020)로 표시한다.
- **프론트에는 역할 분기가 없다**(FS-009 §4.1). 권한 강제는 전적으로 서버 책임이며 프론트는 403 을 다른 실패와 같은 문구로 표시한다.
- **CSRF**: 쓰기 요청(POST·PUT·DELETE)은 `X-CSRF-Token` 헤더 요구(BE-003 §3.3). 어댑터 함수 시그니처는 불변, 본문이 헤더를 싣는다.
- **타임아웃 상한**: 조회 5초 · 쓰기 5초, 초과 시 504(BE-003 §3.4). 프론트 상한 없음(§7.5).

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `NoticeSummary`(목록 행) | `id` · `title` · `category`(`notice`\|`event`\|`maintenance`) · `status`(`published`\|`draft`\|`scheduled`) · `pinned`(bool) · `author` · `publishedAtIso`(ISO date-time) · `views`(number) | **본문(body) 없음** — 목록 응답은 body 를 싣지 않는다 |
| `Notice`(상세) | `NoticeSummary` + `body`(string) | 상세 응답만 body 포함 |
| `NoticeListResult` | `notices: NoticeSummary[]` · `categoryCounts` · `statusCounts` · `total` | 건수는 §4 EP-01 참조 |

## 4. 엔드포인트 명세

### BE-009-EP-01 · 공지 목록 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-009-EL-001, EL-002, EL-003, EL-004, EL-006, EL-008, EL-011, EL-012 |
| 메서드 · 경로 | `GET /api/notices` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET). 재시도 안전. FS-009-EL-011 '다시 시도'는 같은 조건 재요청 |
| 페이징 | offset. `page` 1-base, `size` 기본 10 · 상한 100(프론트 `PAGE_SIZE = 10`) |
| 레이트리밋 | 관리자당 분당 120회 |

**요청 — 쿼리**

| 이름 | 타입 | 필수 | 제약 | 설명 |
|---|---|---|---|---|
| `category` | string | X | `all`\|`notice`\|`event`\|`maintenance`(기본 `all`) | 분류 필터 |
| `status` | string | X | `all`\|`published`\|`draft`\|`scheduled`(기본 `all`) | 상태 필터 |
| `keyword` | string | X | 0–100자. 서버가 앞뒤 공백 제거. 빈 문자열이면 조건 없음 | **제목**에 대한 대소문자 무시 부분 일치 |
| `page` | number | X | 정수 ≥ 1(기본 1) | 페이지 |
| `size` | number | X | 정수 1–100(기본 10) | 페이지 크기 |

- `category` 와 `status` 가 둘 다 `all` 이 아니면 **AND** 결합(FS-009-EL-003).
- 정렬은 **고정** — `pinned` 우선(상단 고정), 그다음 `publishedAtIso` 내림차순. 클라이언트 정렬 파라미터 없음(FS-009 §1.1).
- `page` 가 총 페이지를 넘으면 `notices` 빈 배열 + `total` 은 실제 건수. **서버는 페이지를 자동 보정하지 않는다**(프론트가 마지막 페이지로 보정 — FS-009-EL-012 경합 열).

**응답 200** — `NoticeListResult`

```json
{
  "notices": [
    { "id": "NT-001", "title": "[서비스 이용 안내] 001호", "category": "notice",
      "status": "published", "pinned": true, "author": "콘텐츠 운영팀",
      "publishedAtIso": "2026-01-01T09:00:00+09:00", "views": 128 }
  ],
  "categoryCounts": { "all": 24, "notice": 8, "event": 8, "maintenance": 8 },
  "statusCounts": { "all": 24, "published": 8, "draft": 8, "scheduled": 8 },
  "total": 8
}
```

- `categoryCounts` · `statusCounts` 는 **검색·다른 필터와 무관한 전체 공지 기준**이다(FS-009-EL-001 비고 — 좌측 배지가 검색할 때마다 흔들리면 안 된다).
- `total` 은 필터·검색 적용 후 건수(페이지네이션·요약이 쓴다).
- 목록 응답은 `body` 를 싣지 않는다(§3).

**에러 목록**: 400 `VALIDATION_FAILED`(파라미터 위반, `keyword` > 100자) · 401 · 403(컬렉션은 은닉하지 않음) · 429 · 500 · 504.

---

### BE-009-EP-02 · 공지 상세 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-009-EL-018, EL-020, EL-032 |
| 메서드 · 경로 | `GET /api/notices/:id` |
| 권한 | `admin`, `operator`. 콘텐츠 읽기 권한 없음 → 404 은닉 |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 관리자당 분당 120회 |

**응답 200** — `Notice`(목록 행 + `body`). **어댑터는 404 `NOTICE_NOT_FOUND` 를 `Error('공지를 찾을 수 없습니다')` 로 변환**한다 — `NoticeDetailPage`·`NoticeFormPage` 가 이 메시지로 FS-009-EL-020 / EL-032 를 분기한다.

**에러 목록**: 400(id 형식) · 401 · 403(`operator` 는 읽기 허용이라 발생하지 않음; 콘텐츠 읽기 권한 자체가 없으면 404) · 404 `NOTICE_NOT_FOUND` · 429 · 500 · 504.

---

### BE-009-EP-03 · 공지 등록

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-009-EL-031(등록) |
| 메서드 · 경로 | `POST /api/notices` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 비멱등. 멱등키를 요구하지 않는다 — 공지는 중복 유니크 제약 대상이 아니다(제목 중복 허용, §7.2). 전송 재시도로 중복 생성이 발생할 수 있음을 §7.5 에 미결로 남긴다 |
| 레이트리밋 | 관리자당 분당 30회 |

**요청 — 바디** (`NoticeInput`)

| 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|
| `title` | string | O | 앞뒤 공백 제거 후 1–100자(FS-009-EL-024) |
| `category` | enum | O | `notice`\|`event`\|`maintenance` |
| `status` | enum | O | `published`\|`draft`\|`scheduled` |
| `pinned` | boolean | O | — |
| `publishedAt` | string | 조건부 | `status='scheduled'` 일 때 필수·`YYYY-MM-DD`·**오늘 이후**. 그 외 상태에서는 무시하거나 서버 게시 시각으로 대체 |
| `body` | string | O | 앞뒤 공백 제거 후 1자 이상, 5000자 이하. **서버가 정제(sanitize)한다 — §7.3** |

**응답 201** — 생성된 `Notice`. `Location: /api/notices/<id>`. 프론트 `createNotice(...): Promise<void>` 는 본문을 쓰지 않고 성공 후 목록 무효화.

**게시 상태 판정 (§7.4)**: `status='published'` 는 즉시 공개, `scheduled` 는 `publishedAt` 도달 시 자동 공개(서버 스케줄러), `draft` 는 비공개. **게시 권한은 서버가 판정**한다 — `operator` 는 애초에 403 이며, `admin` 만 `published`/`scheduled` 로 전이할 수 있다(§7.6 보안 판정).

**에러 목록**: 400 `VALIDATION_FAILED`(`error.fields[].name` = 위반 필드; 예약인데 게시일 없음/과거 → `publishedAt`) · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · 422 `UNPROCESSABLE`(상태 전이 규칙 위반) · 429 · 500 · 504.

---

### BE-009-EP-04 · 공지 수정

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-009-EL-031(수정) |
| 메서드 · 경로 | `PUT /api/notices/:id` |
| 권한 | `admin` 만. `operator` → 403. 콘텐츠 읽기 권한 없음 → 404 은닉 |
| 멱등성 | **멱등**(PUT — 전체 치환). 같은 바디 재요청은 같은 결과 |
| 레이트리밋 | 관리자당 분당 30회 |

**요청**: 경로 `id` + 바디 `NoticeInput`(EP-03 과 동일 제약). **응답 200**(또는 204) — 프론트 `updateNotice(...): Promise<void>` 는 본문을 쓰지 않고 성공 후 목록·상세 무효화.

**에러 목록**: 400 · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · 404 `NOTICE_NOT_FOUND` · 409 `CONFLICT`(동시 수정 — §7.5 낙관적 잠금 미도입, 마지막 쓰기 승리) · 422 · 429 · 500 · 504.

---

### BE-009-EP-05 · 공지 삭제 (단건·일괄 공용)

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-009-EL-013, EL-014, EL-021 |
| 메서드 · 경로 | `DELETE /api/notices/:id` |
| 권한 | `admin` 만. `operator` → 403. 콘텐츠 읽기 권한 없음 → 404 은닉 |
| 멱등성 | **멱등**. 이미 삭제된 공지 재요청은 상태 변경 없이 204 — 프론트의 경합 성공 처리(FS-009-EL-013 경합 열)와 일치 |
| 레이트리밋 | 관리자당 분당 60회(일괄 삭제가 항목마다 개별 요청이므로 목록 삭제보다 넉넉히) |

**응답 204** — 본문 없음. 프론트 `deleteNotice(id): Promise<void>`.

**일괄 삭제 계약**: 프론트는 선택 전원에 대해 `deleteNotice(id)` 를 **병렬로** 호출하고(`settleAll`) 취소가 아닌 실패 건수만 집계한다(FS-009-EL-014). **서버에 일괄 삭제 전용 엔드포인트가 없다** — 항목마다 단건 DELETE 다. 부분 실패는 성공한 것은 삭제되고 실패한 것만 남는 관측 가능한 결과가 된다(원자적 전체 롤백이 아니다).

**삭제 정책**: 공지는 회원처럼 법정 보존 대상이 아니므로 소프트/하드 삭제 여부는 백엔드 결정이며 계약은 관측 동작만 정한다 — 삭제 후 조회에서 404, 재삭제가 204 멱등, 목록·건수에서 즉시 제외.

**에러 목록**: 400(id 형식) · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · 404 `NOTICE_NOT_FOUND`(존재한 적 없는 id만; 이미 삭제는 204) · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 조회 | `category`·`status`·`keyword`(100자)·`page`·`size` 위반 → `error.fields` 에 쿼리명 | 401. 프론트는 FS-009-EL-011 배너(세션 만료 감지 미구현 §7.5) | **403** — 컬렉션 존재는 비밀이 아니다 | N/A — 컬렉션은 항상 존재. 0건이면 200 + 빈 배열 → FS-009-EL-010 | N/A — 읽기 전용 | N/A — 상태 전제 없음 | 429 + `Retry-After`, 분당 120 | 500 + `traceId`. FS-009-EL-011 + 재시도 | 5초 → 504 |
| EP-02 상세 조회 | id 형식 위반 → 400 | 401 → FS-009-EL-020 | 콘텐츠 읽기 권한 없음 → **404 은닉** | 404 `NOTICE_NOT_FOUND` → 어댑터가 '공지를 찾을 수 없습니다' 로 변환 | N/A — 읽기 전용 | N/A | 429 + `Retry-After` | 500 + `traceId` → FS-009-EL-020 | 5초 → 504 |
| EP-03 등록 | `title`·`body`·`publishedAt`(예약 조건) 위반 → 400 + `error.fields`. 프론트는 제출 전 `noticeSchema` 로 자체 검증 | 401 → FS-009-EL-023 배너 | **403** — 컬렉션 쓰기. `operator` → 403 | N/A — 생성이라 대상 없음이 정상 | N/A — 생성 | **422 `UNPROCESSABLE`** — 상태 전이 규칙 위반 | 429 + `Retry-After`, 분당 30 | 500 + `traceId` → FS-009-EL-023, 입력 유지 | 5초 → 504 |
| EP-04 수정 | 위 + id 형식 | 401 → FS-009-EL-023 | `operator` → **403**. 읽기 권한 없음 → **404 은닉** | 404 `NOTICE_NOT_FOUND` | **409 `CONFLICT`** — 동시 수정. 낙관적 잠금 미도입, 마지막 쓰기 승리(§7.5) | 422 상태 전이 위반 | 429 + `Retry-After` | 500 + `traceId` | 5초 → 504 |
| EP-05 삭제 | id 형식 위반 → 400 | 401. 프론트는 다이얼로그 안 배너(FS-009-EL-013.1) | `operator` → **403**. 읽기 권한 없음 → **404 은닉** | 404 = **존재한 적 없는 id만**. **이미 삭제는 204(멱등)** — 프론트 경합 성공과 일치 | N/A — DELETE 멱등, 회원 단위 원자 연산으로 직렬화 | N/A — 상태 전제 없음(진행 중 참조 제약 없음) | 429 + `Retry-After`, 분당 60. 일괄은 항목당 개별 요청이라 이 상한에 함께 걸린다 | 500 + `traceId`. 단건은 FS-009-EL-013.1, 일괄은 부분 실패 건수로 집계 | 5초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 시그니처 | TODO(backend) 주석 | 엔드포인트 | 응답 타입 | 필드 일치 |
|---|---|---|---|---|
| `fetchNotices(query: NoticeQuery, signal): Promise<NoticeListResult>` | `GET /api/notices?category=&status=&keyword=&page=&size=` | EP-01 | `NoticeListResult` | O |
| `fetchNotice(id, signal): Promise<Notice>` | `GET /api/notices/:id` | EP-02 | `Notice` | O |
| `createNotice(input: NoticeInput, signal?): Promise<void>` | `POST /api/notices` | EP-03 | `void`(201 본문 미사용) | O |
| `updateNotice(id, input, signal?): Promise<void>` | `PUT /api/notices/:id` | EP-04 | `void` | O |
| `deleteNotice(id, signal?): Promise<void>` | `DELETE /api/notices/:id` | EP-05 | `void`(204) | O |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구사항 | 대상 함수 | 내용 |
|---|---|---|
| CSRF 헤더 | `createNotice`·`updateNotice`·`deleteNotice` | `X-CSRF-Token` 헤더를 싣는다 |
| 404 → 문구 변환 | `fetchNotice` | 404 `NOTICE_NOT_FOUND` 를 `new Error('공지를 찾을 수 없습니다')` 로 변환 |
| `size` 파라미터 | `fetchNotices` | `PAGE_SIZE`(10)를 `size` 쿼리로 싣는다 |

## 7. 핵심 판정 (근거를 남긴다)

### 7.1 일괄 삭제 — 전용 엔드포인트를 만들지 않는다
프론트가 `settleAll` 로 항목마다 단건 DELETE 를 병렬 호출하고 부분 실패를 건수로 집계한다(FS-009-EL-014). 서버에 `POST /api/notices/bulk-delete` 를 두면 '부분 실패를 어떻게 응답 봉투로 표현하는가'라는 새 계약이 필요해지고, 프론트가 이미 기대하는 단건 멱등 DELETE 의 모양을 뒤집는다. 현재 규모(선택 상한 = 현재 페이지 10건)에서 그럴 근거가 없다. 규모가 커지면 별도 계약으로 승격한다.

### 7.2 제목 중복 — 허용한다
공지는 좌측 필터가 표시명으로 구분하는 회원 그룹과 다르다 — 제목이 같아도 상세는 id 로 구분되고 목록은 게시일로 정렬된다. 유니크 제약을 걸 근거가 없다. 따라서 409 `CONFLICT` 는 **수정의 동시성 충돌**에만 쓰고 등록에는 쓰지 않는다.

### 7.3 본문 XSS — 서버가 저장 시 정제(sanitize)한다 【보안 판정】
공지 본문은 관리자가 자유 입력하는 텍스트이며, **게시되면 고객 화면에 노출**된다. 관리자 화면은 순수 텍스트로만 렌더하지만(`white-space: pre-wrap`, FS-009-EL-018 — 스크립트 실행 위험 없음), 고객 렌더가 HTML 로 해석하면 저장된 스크립트가 실행된다(저장형 XSS). **판정**: ① 서버가 저장 시 본문을 정제한다 — 허용 태그 화이트리스트 밖의 마크업·`javascript:` 스킴·이벤트 핸들러 속성을 제거한다. ② 정제는 **저장 시점**에 하되 렌더 시점 이스케이프도 고객 도메인이 이중으로 책임진다(방어 심층화). ③ 관리자 화면이 pre-wrap 텍스트라는 사실에 기대어 정제를 생략하지 않는다 — 같은 데이터가 고객 도메인에서 HTML 로 소비될 수 있다. 정제 라이브러리·허용 태그 목록은 백엔드 결정이며 계약은 '**저장된 본문에 실행 가능한 스크립트가 없다**'는 관측 동작만 정한다.

### 7.4 게시 상태·자동 게시 — 서버 스케줄러가 판정한다
`scheduled` 공지는 `publishedAt` 도달 시 서버가 자동으로 `published` 로 전이한다(FS-009-EL-022 안내 문구가 사용자에게 이를 고지). **관측 계약**: ① 예약 공지는 `publishedAt` 이전에는 고객 노출·목록의 게시 대상에서 제외된다. ② 관리자 목록은 `scheduled` 상태로 보이며 게시일(미래)이 함께 표시된다. ③ 자동 전이는 서버 시각 기준이며, 스케줄러 구현(폴링·큐)은 백엔드 결정이다. `publishedAt` 은 미래(오늘 이후)만 허용한다(EP-03 검증).

### 7.5 후속 이관
| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 401 감지 → `/login?returnUrl=` 처리가 프론트에 없다 | UI 기획 · 프론트 구현 |
| 2 | 프론트 요청 타임아웃 상한 없음(권고: 조회·쓰기 10초) | UI 기획 · 프론트 구현 |
| 3 | 수정 동시성 — 낙관적 잠금(ETag/version) 미도입, 마지막 쓰기 승리. 두 관리자가 같은 공지를 동시 편집하면 늦은 저장이 이긴다 | 백엔드 명세 · UI 기획 |
| 4 | 등록 전송 재시도로 중복 생성 가능(멱등키 없음). 현재 규모에서 허용 | 백엔드 명세 |
| 5 | `keyword` 100자 상한이 프론트에 없다 — 초과 시 400 이 조회 실패 배너로 표시된다 | UI 기획 |

### 7.6 게시 권한 서버 판정 【보안 판정】
`published`/`scheduled` 로의 상태 전이(=고객 노출)는 **서버가 역할로 판정**한다. `operator` 는 쓰기 자체가 403 이므로 게시할 수 없고, `admin` 만 게시 상태를 만들 수 있다. 프론트에 역할 분기가 없으므로(FS-009 §4.1) 이 판정을 프론트에 위임하면 우회 가능하다 — 전적으로 서버 책임이다.

## 8. 자기 점검 (제출 전 확인)

- [x] FS-009 §5 의 서버 연동 요소가 전부 엔드포인트로 커버됐다 — 누락 0건
- [x] 모든 엔드포인트가 `근거 (FS)` 로 FS 요소를 역참조한다 (고아 0건)
- [x] §5 예외 9축에 빈칸 0건. 모든 `N/A` 에 사유가 붙어 있다 (5행 × 9열)
- [x] §2 에서 에러 봉투·권한 모델을 BE-003 상속으로 선언하고 재정의하지 않았다
- [x] §6 에서 `data-source.ts` 의 export 함수가 전부 매핑됐다. 필드 불일치 0건
- [x] 쓰기 엔드포인트마다 멱등성을 판정했다(EP-03 비멱등 / EP-04 멱등 / EP-05 멱등)
- [x] 보안 판정(XSS §7.3 · 게시 권한 §7.6)을 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다 — 데이터 모델은 응답 스키마로만 드러난다
