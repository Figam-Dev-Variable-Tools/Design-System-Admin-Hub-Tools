---
id: BE-025
title: "성공 사례 백엔드 기능 명세"
functionalSpec: FS-025
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-025. 성공 사례 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-025 성공 사례 (`/portfolio/case-studies` · `/new` · `/:id/edit`) |
| 범위 | 성공 사례 목록/상세/등록/수정/삭제(단건·일괄), 노출 여부 토글(수정 재사용) |
| 범위 밖 | 고객 노출 렌더(§7.1 XSS 판정만) · 일괄 전용 엔드포인트(§7.4) · **이미지 파일 업로드(심 없음 — §4 EP-06 · §7.2)** · **업종 목록 조회(엔드포인트가 아니다 — §3.1)** |
| 프론트 어댑터 | `apps/admin/src/pages/portfolio/case-studies/data-source.ts` (`createCrudAdapter` + 자체 시드) |
| 도메인 타입 | `apps/admin/src/pages/portfolio/case-studies/types.ts` (`CaseStudy` · `CaseStudyInput` · `CaseIndustry`) |
| 검증 정본 | `apps/admin/src/pages/portfolio/case-studies/validation.ts` (`caseStudySchema`) |
| 판정 기준일 | **2026-07-17 · HEAD = `a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었고 그때 §1.1 · §7.3 · §7.8 이 갱신됐다. **이번 기준 갱신으로 이 문서의 판정이 뒤집힌 것은 없다** — PR #26·#30·#32 는 DS·토큰 층 변경이라 이 문서가 다루는 엔드포인트·보안 계약에 닿지 않는다. 관련 프론트 변화는 NFR-025 §2 에 기록했다(A11Y-11 · MOTION-03 이 pass/종속 으로 뒤집혔다) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-010 §2 · BE-023 §2 와 동일 선언). 아래는 성공 사례 고유 차이만 기술한다.

> **BE-023 과의 관계 (2026-07-17 · HEAD = `4b805ad` 기준 갱신)**: 두 도메인은 같은 프론트 프레임워크 위에 있어 엔드포인트 모양이 거의 같다. **이 문서는 BE-023 과 다른 것을 온전히 기술하고**(§1.1), 같은 판정은 BE-023 을 참조한다. **⚠ 예전에 '결정적 차이'라 적었던 어댑터 차이는 F3b 에서 사라졌다** — BE-023 의 화면이 쓰는 `createStoreAdapter` 에도 존재 검사가 들어가(`shared/crud/crud.ts:171` `exists()` → `fetchOne` 404 `:192-194` · `update` 409 `:219-221` · `remove` 409 `:232-234`) **두 팩토리가 같은 계약을 갖는다.** 그래서 BE-023 §7.3 도 이제 이 문서와 같은 자리에 선다: **유령 저장은 양쪽 다 해소됐고, 남은 것은 양쪽 다 '낙관적 동시성 토큰 부재'** 다(§7.3). 남은 실질 차이는 **업종이 서버 조회가 아니라 소스 상수**라는 것 하나다(§3.1).

### 1.1 BE-023 과의 차이 (전수)

| 축 | BE-023 포트폴리오 | BE-025 성공 사례 |
|---|---|---|
| 경로 prefix | `/api/portfolio/items` | `/api/portfolio/case-studies` |
| 분류 축 | `categoryId` — **참조 무결성 대상**. EP-03/EP-04 가 422 `CATEGORY_NOT_FOUND` 를 낸다 | `industry` — **고정 enum**. 참조가 아니라 값이라 400 `VALIDATION_FAILED` 로 족하다(§3.1 · §7.5) |
| 분류 선택지 엔드포인트 | **EP-06 `GET /api/portfolio/categories`**(심 존재) | **없다 — 엔드포인트가 아니다**(소스 상수. §3.1) |
| 비정규화 필드 | `categoryLabel` — 서버가 조인해 채운다 | **없다** — 라벨은 프론트 상수(`industryLabel`)가 만든다 |
| 본문 필드 | `summary` 1개 | `challenge`·`solution`·`result` 3개 |
| 어댑터 존재 검사 | ~~없다 → 유령 저장~~ **→ F3b 이후 있다**(`createStoreAdapter` 도 `crud.ts:171` `exists()` 로 409/404) — **차이 소멸** | **있다**(`createCrudAdapter`) → 409/404 정상 |
| 404 실어 보내기 | **안 한다**(generic Error) → EXC-12 분기 사망 | **한다**(`HttpError(404)`) → 404 분기 생존 |
| `?fail=` scope | `portfolio` | `case-studies` |
| read query 수 | 3(목록·상세·분류 선택지) — 선택지 실패에 표면 없음(BE-023 §7.6) | 2(목록·상세) — **사각지대 없음** |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일. `error.traceId` ↔ 프론트 오류 참조 코드(FS-025-EL-016) 대응 — §7.6.
- **권한**: `admin` = 전체. `operator` = 조회 계열만(목록·상세), 쓰기(등록·수정·삭제·노출 토글) → 403. 성공 사례 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2, §7.5).
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504. **프론트에는 타임아웃 상한이 없다**(FS-025 §7 #21) — 서버 상한이 유일한 천장이다.
- **프론트 역할 분기 없음**(FS-025 §4.1) — 쓰기 컨트롤이 권한과 무관하게 렌더되므로(FS-025 §7 #2) **권한 강제는 전적으로 서버 책임**이다.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `CaseStudy`(목록 행 = 상세) | `id` · `title` · `industry`(`CaseIndustry`) · `client` · `challenge` · `solution` · `result` · `coverImageUrl` · `imageUrls`(`readonly string[]`) · `published`(bool) · `date`(`'YYYY-MM-DD'`) | **목록과 상세가 같은 타입이다** — 목록 응답이 이미 전문(과제·해결·성과·이미지)을 담는다. 목록 표는 그중 업종·제목·고객사·성과·노출만 그린다 |
| `CaseStudyInput`(쓰기 바디) | `title` · `industry` · `client` · `challenge` · `solution` · `result` · `coverImageUrl` · `imageUrls` · `published` · `date` | `id` 만 제외. **BE-023 과 달리 서버가 채우는 비정규화 필드가 없다** |
| `CaseIndustry` | `'manufacturing' \| 'retail' \| 'finance' \| 'public' \| 'healthcare' \| 'it'` | **6종 고정 enum** — §3.1 |

**제약(`caseStudySchema` 대조)** — `title` 1–120자(trim) · `industry` 위 6종 중 하나 · `client` 1–60자 · `challenge`/`solution`/`result` 각 1–500자 · `date` `^\d{4}-\d{2}-\d{2}$` · `coverImageUrl` 비어 있지 않음(**스킴 미검사** — §7.2) · `imageUrls` 최대 10장 · `published` boolean.

> **`updatedAt`/`version` 이 없다** — BE-023 §3 과 동일. §7.3 이 판정한다.

### 3.1 `industry` enum — 계약의 정본이 어디인가 【판정】

**관측 사실**: 업종 목록은 **서버에서 오지 않는다.** `CASE_INDUSTRY_OPTIONS`(`types.ts:51-58`)가 id·라벨·배지 톤을 함께 들고 있는 **프론트 소스 상수**이고, 필터 select(FS-025-EL-001)와 폼 select(FS-025-EL-018)가 그것을 직접 렌더한다. `data-source.ts` 에 업종 관련 `// TODO(backend)` 주석이 없다 — **엔드포인트를 지어내지 않는다.**

**판정 세 줄:**

1. **`industry` 는 참조가 아니라 값이다.** BE-023 의 `categoryId` 는 다른 리소스를 가리키므로 참조 무결성(422 `CATEGORY_NOT_FOUND`)이 필요했지만, `industry` 는 도메인 enum 이라 **형식 검증(400)으로 족하다** — 가리킬 대상이 없다.
2. **그러나 정본이 둘로 갈릴 위험이 실재한다.** 서버 DB 가 enum 을 확장하거나(예: `education` 추가) 다른 문자열을 저장하면, 프론트 select 에는 그 옵션이 **없다**. 수정 진입 시 `<select>` 가 값을 표시하지 못하고 조용히 첫 옵션처럼 보이며, 사용자가 손대지 않아도 **저장 시 그 값이 다른 업종으로 바뀐다**(FS-025 §7 #13). 목록 배지는 `industryLabel` 의 `?? industry` 폴백으로 원문을 보여 크래시하지는 않는다.
3. **따라서 계약은 이렇게 고정한다**: **서버의 `industry` 허용 집합은 위 6종이며, 확장은 계약 변경이다.** 서버가 6종 밖의 값을 반환하지 않는다(응답 불변식). 확장이 필요하면 **① 프론트 상수 ② 서버 enum 을 같은 배치에서 함께 바꾸거나, ③ `GET /api/portfolio/industries` 를 신설해 정본을 서버로 옮긴다** — ③ 은 심이 없으므로 지금 만들지 않고 §7.7 로 이관한다.

## 4. 엔드포인트 명세

### BE-025-EP-01 · 성공 사례 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-025-EL-003, EL-004, EL-006, EL-009 |
| 근거 (심) | `// TODO(backend): GET/POST /api/portfolio/case-studies` |
| 메서드·경로 | `GET /api/portfolio/case-studies` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 전량 반환**. 프론트에 페이지네이션이 없다(FS-025 §7 #3) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 어댑터 시그니처가 `fetchAll(signal)` 로 파라미터를 받지 않으며, 업종 필터는 클라이언트가 받은 배열을 거른다(`filterCaseStudies`).

**응답 200** — `readonly CaseStudy[]`. **정렬은 서버가 확정한다**: `date` 내림차순, 같은 날짜는 `id` 내림차순(안정) — 프론트도 `sortCaseStudies` 로 같은 규칙을 적용한다. **응답의 `industry` 는 §3.1 의 6종 중 하나여야 한다.**

**에러**: 401 · 403 · 429 · 500 · 504.

> **후속 계약 변경 예고(§7.7)**: BE-023 EP-01 과 동일 — 항목 수가 늘면 `page`·`size`·`industry` 쿼리와 `{ items, total }` 응답으로 승격한다. 지금 전량 반환으로 확정하는 것은 프론트에 페이지네이션 표면이 없기 때문이다.

---

### BE-025-EP-02 · 성공 사례 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-025-EL-015, EL-017, EL-018~EL-027(수정 진입) |
| 근거 (심) | `// TODO(backend): … GET/PUT/DELETE /api/portfolio/case-studies/:id` |
| 메서드·경로 | `GET /api/portfolio/case-studies/:id` |
| 권한 | `admin`, `operator`. 읽기 권한 없음 → **404 은닉**(§7.5) |
| 멱등성 | 멱등(GET) |

**응답 200** — `CaseStudy`. 프론트 `caseStudyAdapter.fetchOne(id, signal)`.

**에러**: 400(id 형식) · 401 · **404 `CASE_STUDY_NOT_FOUND`** · 429 · 500 · 504.

> **어댑터가 이미 옳다.** `createCrudAdapter.fetchOne`(`shared/crud/crud.ts:54-57`)이 없는 id 에 `HttpError(HTTP_STATUS.notFound, …)` 를 던진다 → `useCrudForm.ts:141` `isNotFound` 가 `'not-found'` 로 갈라 `FormPageShell.tsx:127-135` 가 '찾을 수 없습니다 + 목록으로'(재시도 없음)를 그린다. **백엔드 연결 시 이 status 를 그대로 유지해야 한다** — BE-023 이 §7.10 #7 로 이관해야 했던 항목이 여기서는 이미 성립한다.

---

### BE-025-EP-03 · 성공 사례 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-025-EL-029(등록) |
| 근거 (심) | `// TODO(backend): GET/POST /api/portfolio/case-studies` |
| 메서드·경로 | `POST /api/portfolio/case-studies` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **선택적 `Idempotency-Key` 로 멱등화.** F3b 가 전달 경로(`WriteContext.idempotencyKey` — `crud.ts:30-42`)를 만들어 키가 어댑터까지 도달한다. 같은 키의 재요청은 최초 응답을 재생한다. §7.8 |
| 레이트리밋 | 분당 30회 |

**바디**(`CaseStudyInput`): §3 제약. **응답 201** — 생성된 `CaseStudy`. 프론트 `create(input, signal): Promise<void>` 로 응답 본문을 쓰지 않고 목록 키를 무효화한다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `title`·`industry`·`client`·`challenge`·`solution`·`result`·`date`·`coverImageUrl`·`imageUrls`) · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · 429 · 500 · 504.

> **422 가 없다.** BE-023 EP-03 은 `categoryId` 참조 무결성 때문에 422 `CATEGORY_NOT_FOUND` 를 냈지만, 여기는 참조가 없다(§3.1) — `industry` 위반은 **400** 이다(형식 오류).

---

### BE-025-EP-04 · 성공 사례 수정 (폼 저장 · 노출 토글 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-025-EL-029(수정), **FS-025-EL-006.8(노출 토글)**, FS-025-EL-031(충돌) |
| 근거 (심) | `// TODO(backend): … GET/PUT/DELETE /api/portfolio/case-studies/:id` |
| 메서드·경로 | `PUT /api/portfolio/case-studies/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 멱등(PUT 전체 치환) |
| 레이트리밋 | 분당 60회 |

**바디**: `CaseStudyInput`(EP-03 동일 — **전체 치환**). **응답 200/204**.

> **노출 토글이 전용 엔드포인트를 갖지 않는다 (§7.4).** BE-023 EP-04 와 같은 판정 — 심에 PATCH 가 없고 프론트도 `useCrudRowUpdate` → `adapter.update` 로 이 PUT 을 재사용한다(`toCaseStudyInput(item)` + 새 `published`). 지어내지 않는다.

**에러**: 400 · 401 · 403 · 403 CSRF · **404 `CASE_STUDY_NOT_FOUND`**(존재한 적 없는 id) · **409 `CONFLICT`**(§7.3) · 429 · 500 · 504.

---

### BE-025-EP-05 · 성공 사례 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-025-EL-006.9, EL-010, EL-005.2, EL-011 |
| 근거 (심) | `// TODO(backend): … GET/PUT/DELETE /api/portfolio/case-studies/:id` |
| 메서드·경로 | `DELETE /api/portfolio/case-studies/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **멱등.** 이미 삭제 재요청 → 204 |
| 레이트리밋 | 분당 60회(일괄이 항목당 개별 요청 — §7.4) |

**응답 204**. 일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE 한다.

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `CASE_STUDY_NOT_FOUND`(존재한 적 없는 id만) · 429 · 500 · 504.

> **어댑터와의 불일치 하나(의도적)**: 현재 `createCrudAdapter.remove`(`crud.ts:82-84`)는 이미 삭제된 id 에 **409 를 던진다**(멱등이 아니다). 백엔드는 **204(멱등)** 로 확정한다 — 일괄 삭제의 부분 실패 후 재시도가 안전해야 하기 때문이다(§7.4). 픽스처의 409 는 '이미 삭제된 항목'을 화면에서 관측하게 하려는 **개발용 강도(强度)** 이며, 실서버에서 멱등 204 가 되면 프론트는 그것을 성공으로 처리한다 — 화면 변경이 필요 없다.

---

### BE-025-EP-06 · 이미지 파일 업로드 — **심 없음 (미정)**

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-025-EL-025(대표 이미지), FS-025-EL-026(본문 이미지) |
| 근거 (심) | **없음.** `data-source.ts` 에 업로드 관련 `// TODO(backend)` 주석이 없다 |
| 상태 | **미정 — 계약을 정의하지 않는다** |

BE-023 EP-07 과 **동일한 상황이며 동일한 판정**을 받는다(같은 공용 컴포넌트 `PortfolioMediaFields` → `ImageUploadField`/`ImageGalleryField` 를 쓴다). `URL.createObjectURL(file)` 이 만든 **`blob:` URL 이 그대로 `coverImageUrl`·`imageUrls` 에 실려** EP-03/EP-04 로 저장된다 — 생성한 문서(탭)의 수명에만 유효하므로 새로고침·타 관리자·고객 화면에서 깨진다.

**엔드포인트를 지어내지 않는다.** 그때까지의 방어는 §7.2 가 EP-03/EP-04 의 400 조건으로 못 박는다.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — 쿼리 파라미터가 없다 | 401 → 전역 인터셉터가 재인증 경로로. 화면은 FS-025-EL-009 배너 | **403** 컬렉션(존재는 비밀이 아니다) | N/A — 0건이면 200 빈 배열 → FS-025-EL-008 빈 상태 | N/A — 읽기 전용 | N/A — 상태 전이 없음 | 429 분당 120 | 500 + `traceId` → FS-025-EL-009 | 5초 → 504. **프론트 상한 없음**(FS-025 §7 #21) |
| EP-02 상세 | id 형식 → 400 | 401 → FS-025-EL-015 | 읽기 권한 없음 → **404 은닉**(§7.5) | **404 `CASE_STUDY_NOT_FOUND`** → 셸의 '찾을 수 없습니다' + '목록으로'(재시도 없음). **어댑터가 이미 status 를 실어 이 분기가 산다** | N/A | N/A | 429 | 500 + `traceId` → '불러오지 못했습니다' + '다시 시도' | 5초 → 504 |
| EP-03 등록 | `title`·`industry`·`client`·`challenge`·`solution`·`result`·`date`·`coverImageUrl`·`imageUrls` → `error.fields`. **`industry` enum 위반도 400**(참조가 아니다 — §3.1). **`blob:`/`data:` 이미지 URL 도 여기서 거절**(§7.2) | 401 → FS-025-EL-016 | **403** 컬렉션 쓰기 | N/A — 생성 | N/A — 생성에 충돌 없음(제목 유니크 제약을 두지 않는다 — §7.9) | **N/A — 참조 무결성 대상이 없다**(BE-023 의 422 `CATEGORY_NOT_FOUND` 에 대응하는 것이 없다 — §3.1) | 429 분당 30 | 500 + `traceId` → FS-025-EL-016 배너 + 오류 참조 코드 | 5초 → 504 |
| EP-04 수정·토글 | 위 + id 형식 | 401 → 폼은 FS-025-EL-016, 토글은 실패 토스트 | `operator` → **403** / 읽기 권한 없음 → **404** 은닉 | **404 `CASE_STUDY_NOT_FOUND`** — 존재한 적 없는 id | **409 `CONFLICT`** 동시 삭제(§7.3) → FS-025-EL-031 충돌 다이얼로그(입력 보존). **동시 수정은 감지하지 않는다 — 마지막 쓰기 승리**(§7.3) | **N/A — 참조 무결성 대상이 없다** | 429 분당 60 | 500 + `traceId` → 폼 배너 / 토글 실패 토스트 | 5초 → 504 |
| EP-05 삭제 | id 형식 | 401 → 다이얼로그 안 배너(FS-025-EL-010) | `operator` → **403** / 읽기 권한 없음 → **404** | 404 = 존재한 적 없는 id만. **이미 삭제는 204(멱등)** — 픽스처의 409 와 다르다(EP-05 인용문) | N/A — DELETE 멱등 | N/A | 429 분당 60 | 500 → 단건 다이얼로그 배너 / 일괄은 부분 실패 건수(FS-025-EL-011) | 5초 → 504 |
| EP-06 업로드 | **심 없음(미정)** — 계약 미정. 단, 업로드 없이 들어오는 `blob:`/`data:` 값은 EP-03/EP-04 의 400 이 막는다(§7.2) | 심 없음(미정) | 심 없음(미정) | 심 없음(미정) | 심 없음(미정) | 심 없음(미정) | 심 없음(미정) | 심 없음(미정) | 심 없음(미정) |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `caseStudyAdapter.fetchAll(signal)` | `GET /api/portfolio/case-studies` | EP-01 | `CaseStudy[]` | O |
| `caseStudyAdapter.fetchOne(id, signal)` | `GET /api/portfolio/case-studies/:id` | EP-02 | `CaseStudy`(404 → `HttpError(404)`) | **O — status 를 이미 실어 던진다** |
| `caseStudyAdapter.create(input, signal)` | `POST /api/portfolio/case-studies` | EP-03 | `void`(201 본문 무시) | O |
| `caseStudyAdapter.update(id, input, signal)` | `PUT /api/portfolio/case-studies/:id` | EP-04 | `void`(없는 id → `HttpError(409)`) | **O — 존재 검사가 있다** |
| `caseStudyAdapter.remove(id, signal)` | `DELETE /api/portfolio/case-studies/:id` | EP-05 | `void`(없는 id → `HttpError(409)`) | **△ — 서버는 멱등 204 로 확정**(EP-05 인용문). 화면 변경 불필요 |
| **(없음 — 소스 상수)** | **(없음)** | **엔드포인트 아님** — `CASE_INDUSTRY_OPTIONS`(§3.1) | — | **의도된 부재.** 확장은 계약 변경(§7.7) |
| **(없음)** | **(없음)** | **EP-06 — 심 없음(미정)** | — | **X — 업로드 경로 부재**(§7.2) |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` 헤더 · 모든 실패를 `HttpError(status, message, { violations, reference })` 로 변환 · 400 응답의 `error.fields` → `HttpError.violations`(그래야 `useCrudForm.ts:176-186` 이 RHF `setError` 로 그 입력에 꽂고 포커스를 옮긴다. **주의: 현 프론트는 `isUnprocessable`(422)일 때만 violations 를 매핑한다** — 400 으로 필드 오류를 주면 generic 배너로 폴백한다. 필드 단위 거절은 **422 로 보내거나** 프론트의 조건을 400 까지 넓혀야 한다 → §7.7) · 500 응답의 `error.traceId` → `HttpError.reference`.

> **필드 오류의 status 를 여기서 확정한다**: **필드 단위 거절은 422 `UNPROCESSABLE` + `error.fields` 로 보낸다.** 위 매트릭스가 `industry` enum 위반을 '400' 이라 부른 것은 **의미론적 분류**(형식 오류이지 참조 오류가 아니다)이고, **전송 status 는 422** 다 — 그래야 `useCrudForm` 의 필드 인라인 경로(EXC-07)가 발화한다. 순수 형식 오류(id 가 UUID 가 아님, JSON 파싱 실패)만 400 이다.

## 7. 핵심 판정

### 7.1 본문 XSS — 서버가 저장 시 정제한다 【보안 판정】

성공 사례의 `title`·`challenge`·`solution`·`result`·`client` 는 관리자 입력이며 **고객 성공 사례 화면에 노출**된다. **BE-023 §7.1 보다 표면이 넓다** — 자유 텍스트 필드가 3개 더 있고(과제·해결·성과, 각 500자) 이 도메인은 **마케팅 목적상 고객 화면에 전문이 실린다**(포트폴리오의 `summary` 는 요약이지만 여기는 서사 전체다).

관리자 화면은 평문 셀/`TextareaField` 로만 렌더하지만(FS-025-EL-006.5·EL-022~024), **고객 렌더가 HTML 로 해석하면 저장형 XSS 가 된다**. BE-010 §7.2 · BE-023 §7.1 과 동일 판정: **서버가 저장 시(EP-03·EP-04) 다섯 필드를 전부 정제**한다 — 허용 태그 화이트리스트 밖의 마크업·`javascript:`/`vbscript:` 스킴·이벤트 핸들러 속성 제거. 계약은 '저장된 값에 실행 가능한 스크립트가 없다'는 **관측 동작만** 정한다.

**목록 truncate 가 방어가 아님을 명시한다**: `result` 는 관리자 목록에서 CSS ellipsis 로 잘려 보이지만(FS-025-EL-006.7) 이는 **시각 처리일 뿐 값은 전문이 DOM 에 있다** — 고객 화면에서는 전문이 렌더된다. 잘려 보인다고 안전하지 않다.

### 7.2 이미지 URL 스킴 화이트리스트 — 서버가 `blob:`/`data:` 를 거절한다 【보안 판정】

**BE-023 §7.2 와 동일 판정을 이 도메인에도 적용한다** — 같은 공용 컴포넌트(`PortfolioMediaFields` → `ImageUploadField`/`ImageGalleryField`)를 쓰고 같은 검증(`requiredImage`, 스킴 미검사)을 쓰므로 취약점이 동일하다.

1. **저장 계약** — EP-03·EP-04 는 `coverImageUrl`·`imageUrls[]` 에 **스킴 화이트리스트**를 강제한다: 자사 업로드 오리진의 `https:` URL 만 허용하고 **`blob:` · `data:` · `javascript:` · `file:` · 그 밖의 스킴은 422 `UNPROCESSABLE`(`error.fields[].name = coverImageUrl | imageUrls`)로 거절**한다(§6 의 status 확정에 따라 400 이 아니라 422 — 그래야 필드 인라인으로 간다).
2. **거절이 곧 신호다** — EP-06 이 정해지기 전에 **먼저** 들어가야 한다. 지금 넣지 않으면 백엔드 연결 첫날 `blob:` 문자열이 조용히 저장되고, 고객 화면에서 전량이 깨진 이미지가 된다.
3. **방증**: `case-studies.test.ts:24`·`:80` 이 `coverImageUrl: 'blob:cover'` 를 **정상 입력으로** 쓰고 스키마가 통과시킨다 — 프론트 검증이 스킴을 보지 않는다는 것이 테스트로 고정돼 있다.

### 7.3 낙관적 동시성 — 어댑터는 옳고, 토큰은 없다 【정합 판정】

**~~BE-023 §7.3 과 갈리는 지점이다~~ → 정정: F3b 이후 두 문서가 같은 자리에 선다.** 절반은 이미 지켜지고 있고, 그 절반은 이제 BE-023 의 화면에서도 지켜진다(`createStoreAdapter` 도 `crud.ts:171` `exists()` 로 409/404 를 낸다). 남은 미충족은 양쪽 모두 **토큰 하나**다.

**지켜지는 것(확인)**: 이 화면은 `createCrudAdapter` 를 쓰므로 `update`(`crud.ts:126-128`)·`remove`(`:139-141`)가 **트랜잭션 전에 대상 존재를 확인하고 없으면 409 를 던진다**. 그래서 —
- 다른 관리자가 삭제한 사례를 저장하면 **충돌 다이얼로그가 실제로 열린다**(FS-025-EL-031) — 입력이 보존되고 유령 토스트가 없다.
- 삭제된 사례를 토글하면 실패 토스트가 뜬다(유령 성공 아님).
- `fetchOne` 은 404 를 실어 폼 셸의 not-found 분기를 살린다.

**BE-023 이 §7.3 에서 '고쳐야 한다' 고 판정했던 것을 F3b 가 실제로 고쳤으므로**(형제 팩토리에도 같은 검사가 들어갔다) **백엔드는 이 동작을 계약으로 유지한다** — EP-04 는 대상이 없으면 409 `CONFLICT`(`message`: '다른 사용자가 먼저 삭제한 항목입니다.'), EP-02 는 404. ⚠ 단 **BE-023 §4 EP-05 는 '이미 삭제 = 204 멱등'** 을 정했는데 어댑터는 409 를 던진다 — 두 문서의 DELETE 계약이 갈리므로 백엔드 연결 전에 확정해야 한다(BE-023 §7.10 #9).

**지켜지지 않는 것(판정)**: `CaseStudy`(`types.ts:9-25`)에 `updatedAt`·`version` 이 **없어** If-Match/ETag 로 보낼 토큰이 없다 → **동시 *수정* 은 감지하지 못하고 마지막 쓰기가 이긴다.** BE-023 §7.3 과 같은 결이며, **같은 이유로 대가가 크다**: 노출 토글이 전용 PATCH 가 아니라 **PUT 전체 치환**이라(§7.4), A 가 목록을 연 뒤 B 가 과제·해결·성과를 고쳤고 A 가 노출 스위치만 눌렀다면 **A 의 낡은 전체 항목이 B 의 수정을 통째로 되돌린다**. 자유 텍스트가 3개라 손실량이 포트폴리오보다 크다.

**확정**: '토큰 없음 + 존재 재확인 409' 를 현재 계약으로 한다. `updatedAt` + `If-Match` 승격은 **도메인 타입 변경이 선행돼야 하므로** §7.7 로 이관한다.

### 7.4 일괄 삭제·노출 토글 — 전용 엔드포인트를 만들지 않는다

BE-023 §7.4 와 **동일 판정**이다. 심에 벌크·PATCH 가 없고 프론트도 `settleAll` + 단건 DELETE, `useCrudRowUpdate` + `adapter.update` 를 쓴다. 단건 DELETE 가 **멱등(204)** 이어야 부분 실패 후 재시도가 안전하다는 것이 EP-05 인용문의 근거다.

### 7.5 403 vs 404 은닉 【보안 판정】

BE-003 §3.2 상속. 컬렉션(EP-01·EP-03)은 권한 부족 시 **403**. 개별 리소스(EP-02·EP-04·EP-05)는 **성공 사례 읽기 권한이 없는 주체에게 404 은닉**, 읽기는 되고 쓰기만 없는 주체(`operator`)에게는 **403**.

**BE-023 §7.5 와 달리 참조 무결성 절이 없다** — `industry` 가 enum 이라 TOCTOU 대상이 아니다(§3.1). 이 도메인은 다른 리소스를 참조하지 않으므로 **참조 무결성 판정 자체가 성립하지 않는다.**

**다만 은닉의 실효성에 한계가 있다**: `RequirePermission`(`route-resource.ts:36-46`)이 라우트 리소스를 nav leaf 에서 파생하므로 `/portfolio/case-studies/:id/edit` 는 leaf `/portfolio/case-studies` 의 권한을 따른다 — **개별 사례 단위 권한이라는 개념이 프론트에 없다.** 서버가 개별 404 은닉을 하더라도 프론트는 그것을 '불러오지 못함' 으로 뭉갤 뿐이다(FS-025-EL-015). 이 도메인은 개인정보가 아니라 마케팅 콘텐츠이므로 **존재 은닉의 가치가 낮다** — 실효를 위해 복잡도를 더하지 않는다.

### 7.6 오류 참조 코드 — `traceId` 를 실어 보낸다

`useCrudForm.ts:189` 가 `referenceOf(cause)` 로 `HttpError.reference` 를 꺼내 FS-025-EL-016 배너에 '오류 코드 TDS-…' 로 보인다(`FormFeedback.tsx:38-47`, `user-select: all`). **어댑터는 500/504 응답의 `error.traceId` 를 `HttpError` 의 `reference` 옵션으로 넘겨야 한다** — 그러지 않으면 `http-error.ts:59` 가 자체 생성한 코드가 붙어 **서버 로그와 상관되지 않는다**(운영자가 신고해도 개발자가 찾을 수 없다). raw 서버 body·stack·status 는 산문으로 노출하지 않는다.

### 7.7 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **이미지 업로드 엔드포인트 계약 미정**(EP-06 심 없음) — 경로·멀티파트 규약·용량·MIME·바이러스 검사·응답 URL 수명·CDN 오리진. 그때까지 §7.2 의 `blob:`/`data:` 422 거절이 유일한 방어. **BE-023 §7.10 #1 과 동일 사안 — 같은 컴포넌트를 쓰므로 한 번에 정해야 한다** | 백엔드 명세 · UI 기획 |
| 2 | 낙관적 동시성 토큰(`updatedAt`/`version` + `If-Match`) 승격 — 동시 수정을 412 로 흡수한다(§7.3). **도메인 타입 변경 선행**. BE-023 §7.10 #2 와 동일 사안 | 백엔드 명세 · UI 기획 |
| 3 | 노출 토글 전용 `PATCH /:id/visibility` 승격 — §7.3 의 손실 시나리오를 근본에서 없앤다. BE-023 §7.10 #3 과 동일 사안 | 백엔드 명세 · UI 기획 |
| 4 | **`industry` enum 의 정본 이원화**(§3.1) — 프론트 상수와 서버 enum 이 갈리면 수정 폼이 조용히 값을 바꾼다. 확장이 예상되면 `GET /api/portfolio/industries` 신설로 정본을 서버로 옮긴다(**심이 없어 지금 만들지 않는다**). 그때까지는 '6종 = 계약' 을 양쪽이 지킨다 | 백엔드 명세 · UI 기획 |
| 5 | 목록 페이징·필터 쿼리 승격(§7.7 EP-01 인용문) — 프론트 페이지네이션 도입과 동시 | 백엔드 명세 · UI 기획 |
| ~~6~~ | ~~멱등키 전달 경로~~ **— 해소됨(F3b)**: `WriteContext.idempotencyKey`(`crud.ts:30-42`)로 키가 어댑터에 도달한다. §7.8 이 이제 계약(헤더·24h 창·재생 규칙)을 **확정**한다 — 서버 구현만 남았다. BE-023 §7.10 #5 와 동일 | 백엔드 명세 |
| 7 | **필드 오류 status 정합** — 서버는 필드 단위 거절을 422 + `error.fields` 로 보내야 한다(§6). 프론트는 `isUnprocessable` 일 때만 매핑하므로 400 으로 보내면 generic 배너로 폴백한다. 계약(422)과 프론트 조건 중 어느 쪽을 정본으로 할지 확정 필요 | 백엔드 명세 · UI 기획 |
| 8 | 프론트 타임아웃 상한 부재 — 서버 5초 상한이 유일한 천장이다(EXC-05) | 프론트 구현 · UI 기획 |

### 7.8 멱등키 — 경로가 생겼다. 계약을 확정한다 (F3b — 이전 판정 정정)

BE-023 §7.8 과 동일. ~~키가 생성되지만 전달 경로가 없다~~ → **정정**: F3b 가 `CrudAdapter.create/update` 시그니처에 `WriteContext`(`crud.ts:30-42`)를 넣어 **키가 앉을 자리를 만들었다**. `useCrudForm.ts:118-123` 의 `idempotencyKeyRef` 가 잡은 **제출 시도 단위** 키가 `:211` → `:228`·`:235`(mutation variables) → `crud.ts:288`·`:310` 을 거쳐 어댑터까지 도달한다. 키를 mutationFn **밖**(variables)에 두는 이유는 `crud.ts:273-278` 에 있다 — 안에서 만들면 react-query 재시도마다 새 키가 생겨 서버가 두 요청을 별개 거래로 본다. `:220` 은 **성공했을 때만** 키를 버린다.

픽스처의 `createCrudAdapter` 가 그 키로 서버를 흉내 낸다 — `createIdempotencyLedger()`(`crud.ts:62-72`)를 `:91` 에서 만들고 `create`(`:113-116`)·`update`(`:121`)·`remove`(`:136`)가 통과시킨다. **기록은 적용에 성공한 뒤에만** 한다(`:55-60`: 미리 기록하면 실패한 첫 시도가 키를 태워 재시도가 영원한 no-op 이 된다).

**계약 판정**: EP-03(등록)은 선택적 **`Idempotency-Key: <uuid>` 요청 헤더**를 받는다 — 심은 `crud.ts:39`. 같은 키의 재요청은 **재처리 없이 최초 응답을 재생**하고, 키 보존 창은 **24시간**(`pages/members/data-source.ts:243-253` 의 선례 심과 같은 값). 키가 없는 요청(노출 토글 — `useCrudRowUpdate.ts:45`)은 평소대로 처리한다. 프론트의 동기 제출 락은 **한 탭 안**의 중복만 막으므로(네트워크 재전송·새로고침 후 재제출은 못 막는다) 서버 측 키 처리가 그 구멍을 닫는다.

### 7.9 제목 유니크 제약을 두지 않는다

BE-023 §7.9 와 동일 근거. 화면이 사례를 `id` 로 구분하고 업종 배지·고객사로 함께 식별한다. 같은 제목의 사례가 실제로 둘일 수 있다(같은 고객사의 연차별 사례). 제약을 걸면 정당한 등록이 막힌다 → **EP-03 에 409 없음**.

## 8. 자기 점검

- [x] FS-025 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (5 엔드포인트 + 심 없음 1건 + '엔드포인트 아님' 1건)
- [x] 모든 엔드포인트가 FS 요소와 **`// TODO(backend)` 주석**을 역참조한다. **심에 없는 엔드포인트를 만들지 않았다** — 노출 토글 PATCH·일괄 삭제 벌크·이미지 업로드·업종 목록 조회를 지어내지 않고 각각 §7.4 · §7.4 · EP-06(심 없음) · §3.1('엔드포인트가 아니다')로 처리했다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A`·'심 없음(미정)' 에 사유 (6행 × 9열). **BE-023 에 있던 422 열이 여기서 N/A 인 이유(참조 무결성 대상 부재)를 명시했다**
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함
- [x] 멱등성 판정 — 조회 GET / 수정·삭제 멱등 / **등록은 선택적 `Idempotency-Key` 로 멱등화**(§7.8 — F3b 가 전달 경로를 만들어 계약을 확정할 수 있게 됐다). **픽스처의 409(이미 삭제)와 서버 계약의 204(멱등)가 다른 이유를 EP-05 에 명시했다**
- [x] **`4b805ad`(2026-07-17) 코드로 재대조했다.** F2 기준 판정 중 **§1.1 의 어댑터 차이 행**(F3b 가 `createStoreAdapter` 에도 존재 검사를 넣어 **차이 소멸**)과 **§7.8 의 '키가 나갈 경로가 없다'** 가 뒤집혀 정정했다 — 다만 두 절의 **계약 판정 자체는 유지**했다. **새 엔드포인트를 발명하지 않았다** — 여전히 5 엔드포인트 + 심 없음 1건이다
- [x] **보안 판정 2건 이상**: 저장형 XSS(§7.1 — 표면이 BE-023 보다 넓은 이유 포함) · 이미지 스킴 화이트리스트(§7.2) · 403/404 은닉(§7.5 — 참조 무결성이 왜 없는지 포함) · 정합 판정 동시성(§7.3)
- [x] **BE-023 과의 차이를 §1.1 에 전수 표로 못 박았다** — **⚠ F3b 로 어댑터 차이 행이 소멸했음을 그 표와 §7.3 에 명시했다.** 남은 실질 차이는 업종이 서버 조회가 아니라 소스 상수라는 것(§3.1) 하나다
- [x] 서버 코드·저장소 설계·정제 라이브러리를 지정하지 않았다 — 관측 동작만 정했다
- [x] FS-025 §7 ↔ 이 문서 §7.7 ↔ NFR-025 §5 의 이관 항목을 일치시켰다
