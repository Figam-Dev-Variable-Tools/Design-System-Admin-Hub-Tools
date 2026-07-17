---
id: BE-010
title: "FAQ 관리 백엔드 기능 명세"
functionalSpec: FS-010
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-010. FAQ 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-010 FAQ 관리 (`/content/faq` · `/:id` · `/new` · `/:id/edit` · 카테고리 관리 모달) |
| 범위 | FAQ 목록/상세/등록/수정/삭제(단건·일괄), 노출 여부 토글(단건·일괄), 정렬 순서 재정렬, 정렬 순서 자동 채움, 카테고리 목록·사용량·생성·삭제(사용 중 차단) |
| 범위 밖 | 고객 노출 렌더(§7.2 XSS 판정만). 일괄 전용 엔드포인트(§7.1). |
| 프론트 어댑터 | `apps/admin/src/pages/content/faq/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/content/faq/types.ts` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-009 §2 와 동일 선언). 아래는 FAQ 고유 차이만 기술한다.

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일.
- **권한**: `admin` = 전체. `operator` = 조회 계열만(목록·상세·카테고리·사용량·next-order), 쓰기(등록·수정·삭제·노출 토글·재정렬·카테고리 생성/삭제) → 403. 콘텐츠 읽기 권한 없는 관리자 → 컬렉션 403 / 개별 404 은닉(BE-003 §3.2).
- **CSRF**: 쓰기(POST·PUT·PATCH·DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-010 §4.1) — 권한 강제는 서버 책임.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `FaqSummary`(목록 행) | `id` · `question` · `categoryId` · `categoryLabel`(서버 조인) · `visible`(bool) · `order`(number) | 답변(answer) 없음 |
| `Faq`(상세) | `FaqSummary` + `answer` | 상세만 answer |
| `FaqCategory` | `id` · `label` | 필터·폼 선택지 |
| `FaqCategoryUsage` | `id` · `label` · `faqCount` | 삭제 차단 판단(1건 이상이면 막는다) |
| `FaqListResult` | `faqs[]` · `visibilityCounts` · `categoryCounts`(키=카테고리 id, `all` 포함) · `total` | 건수는 전체 기준 |

## 4. 엔드포인트 명세

### BE-010-EP-01 · FAQ 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-001, EL-002, EL-003, EL-004, EL-007, EL-009, EL-012, EL-013 |
| 메서드·경로 | `GET /api/faqs` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | offset. `page` 1-base, `size` 기본 10 · 상한 100 |
| 레이트리밋 | 분당 120회 |

**쿼리**: `categoryId`(카테고리 id 또는 `all`, 기본 `all`) · `visibility`(`all`\|`visible`\|`hidden`) · `keyword`(0–100자, 앞뒤 공백 제거, **질문** 부분 일치·대소문자 무시) · `page` · `size`. `categoryId` 와 `visibility` 는 AND 결합(FS-010-EL-003). 정렬은 `order` 오름차순 고정.

**응답 200** — `FaqListResult`. `visibilityCounts`·`categoryCounts` 는 **검색·다른 필터와 무관한 전체 기준**(좌측 배지 안정성). `categoryCounts` 는 `all` 키 + 모든 카테고리 id 를 키로 포함하며 0인 카테고리도 0 으로 채운다.

**에러**: 400(파라미터·`keyword`>100자) · 401 · 403 · 429 · 500 · 504.

---

### BE-010-EP-02 · 카테고리 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-001, EL-027 |
| 메서드·경로 | `GET /api/faq-categories` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | 없음 — 전량. **카테고리 수 상한 100개**(§7.3) |

**응답 200** — `readonly FaqCategory[]` (`{ id, label }[]`). 좌측 필터(FS-010-EL-001)와 폼 카테고리 select(FS-010-EL-027)가 같은 목록을 쓴다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-010-EP-03 · 카테고리 사용량 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-016.1, EL-016.2 |
| 메서드·경로 | `GET /api/faq-categories?include=usage` (또는 사용량을 포함한 별도 표현) |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |

**응답 200** — `readonly FaqCategoryUsage[]` (`{ id, label, faqCount }[]`). `faqCount` 는 그 카테고리에 속한(삭제되지 않은) FAQ 수. 프론트는 `faqCount > 0` 이면 삭제 버튼을 잠근다(FS-010-EL-016.2). **어댑터 시그니처는 `fetchFaqCategoryUsage(signal)` 로 EP-02 와 분리돼 있다** — 사용량 계산이 무거우면 별도 엔드포인트로 둘 수 있고, 가벼우면 EP-02 응답에 `faqCount` 를 얹어도 계약(프론트 반환 타입)은 만족된다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-010-EP-04 · FAQ 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-020, EL-022, EL-033 |
| 메서드·경로 | `GET /api/faqs/:id` |
| 권한 | `admin`, `operator`. 읽기 권한 없음 → 404 은닉 |

**응답 200** — `Faq`. **어댑터는 404 `FAQ_NOT_FOUND` 를 `Error('FAQ 를 찾을 수 없습니다')` 로 변환**한다.

**에러**: 400 · 401 · 404 `FAQ_NOT_FOUND` · 429 · 500 · 504.

---

### BE-010-EP-05 · FAQ 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-032(등록) |
| 메서드·경로 | `POST /api/faqs` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 비멱등. 멱등키 없음 |

**바디**(`FaqInput`): `question`(1–200자) · `categoryId`(존재하는 카테고리 id) · `answer`(1–5000자, **서버 정제 §7.2**) · `visible`(bool) · `order`(정수 ≥ 0). **응답 201** — 생성 `Faq`. 프론트 `createFaq(...): Promise<void>`.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `question`·`categoryId`·`answer`·`order`) · 401 · 403 · 403 CSRF · 422 `CATEGORY_NOT_FOUND`(존재하지 않는 `categoryId`) · 429 · 500 · 504.

---

### BE-010-EP-06 · FAQ 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-032(수정) |
| 메서드·경로 | `PUT /api/faqs/:id` |
| 권한 | `admin` 만 |
| 멱등성 | 멱등(PUT 전체 치환) |

**바디**: `FaqInput`(EP-05 동일). **응답 200/204**. **에러**: 400 · 401 · 403 · 403 CSRF · 404 `FAQ_NOT_FOUND` · 409 `CONFLICT`(동시 수정 — 마지막 쓰기 승리, §7.4) · 422 `CATEGORY_NOT_FOUND` · 429 · 500 · 504.

---

### BE-010-EP-07 · FAQ 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-009.10, EL-014, EL-015, EL-023 |
| 메서드·경로 | `DELETE /api/faqs/:id` |
| 권한 | `admin` 만 |
| 멱등성 | **멱등**. 이미 삭제 재요청 → 204 |
| 레이트리밋 | 분당 60회(일괄이 항목당 개별 요청) |

**응답 204**. 일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE(§7.1). **에러**: 400 · 401 · 403 · 403 CSRF · 404 `FAQ_NOT_FOUND`(존재한 적 없는 id만) · 429 · 500 · 504.

---

### BE-010-EP-08 · 노출 여부 토글 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-009.7, EL-008.2, EL-008.3 |
| 메서드·경로 | `PATCH /api/faqs/:id/visibility` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **멱등**. 바디의 `visible` 목표 상태를 그대로 세팅하므로 같은 값 재요청은 무변화 — 프론트의 낙관적 토글·재시도(FS-010-EL-009.7 경합 열)와 일치 |
| 레이트리밋 | 분당 120회(일괄이 항목당 개별 요청) |

**바디**: `{ visible: boolean }`. **응답 200/204**. 프론트 `setFaqVisibility(id, visible)`. 낙관적 업데이트는 프론트가 하고, 실패 시 롤백(FS-010-EL-009.7). 일괄 토글은 항목마다 병렬 PATCH(`settleAll`, 부분 실패 건수 보고).

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `FAQ_NOT_FOUND` · 429 · 500 · 504.

---

### BE-010-EP-09 · 정렬 순서 재정렬
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-009.9, EL-009.12 |
| 메서드·경로 | `PUT /api/faqs/reorder` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | **멱등**. 같은 `orderedIds` 재요청은 같은 최종 순서 |
| 레이트리밋 | 분당 60회 |

**바디**: `{ orderedIds: string[] }` — 재정렬 대상(현재 페이지) 항목의 새 순서. **서버는 이 id 들이 원래 차지하던 슬롯 안에서 새 순서로 재배치하고 전체 `order` 를 1..n 으로 다시 매긴다**(`reorderByIds` 규칙). 화면에 없는(다른 페이지) 항목의 상대 순서는 보존된다. **응답 200/204**.

**동시성 판정 (§7.4)**: 두 관리자가 동시에 재정렬하면 **마지막 요청이 이긴다**(낙관적 잠금 미도입). 프론트는 낙관 반영 후 실패 시 롤백하고 성공 시 서버 결과로 재조회 정합한다.

**에러**: 400 `VALIDATION_FAILED`(`orderedIds` 에 존재하지 않는 id·중복·현재 페이지 구성 불일치) · 401 · 403 · 403 CSRF · 429 · 500 · 504.

---

### BE-010-EP-10 · 정렬 순서 자동 채움
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-028 |
| 메서드·경로 | `GET /api/faqs/next-order` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET). 단, 반환값은 조회 시점의 최대 order + 1 이라 시점마다 다를 수 있다 |

**응답 200** — `number`(현재 최대 `order` + 1, 목록이 비면 1). **자동 채움은 제안값일 뿐 유니크 예약이 아니다** — 프론트가 편집 가능하며(FS-010-EL-028), 자동 채움 후 다른 관리자가 항목을 추가하면 값이 겹칠 수 있다. `order` 는 유니크가 아니며 재정렬(EP-09)이 정합한다. 목록 응답(EP-01)에 최대 order 를 얹어 이 왕복을 없앨 수도 있다(계약 변경 아님).

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-010-EP-11 · 카테고리 생성
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-016.7, EL-016.8 |
| 메서드·경로 | `POST /api/faq-categories` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 비멱등. 유니크 제약이 중복을 차단(§7.5) |
| 레이트리밋 | 분당 10회 |

**바디**(`FaqCategoryInput`): `{ name: string }` — 앞뒤 공백 제거 후 1–30자. **응답 201** — 생성 `FaqCategory`. 프론트 `createFaqCategory(...): Promise<void>` 후 카테고리·사용량 무효화.

**에러**: 400 `VALIDATION_FAILED`(`name`) · 401 · 403 · 403 CSRF · 409 `CATEGORY_NAME_DUPLICATED`(정규화 이름 중복 — §7.5) · 422 `CATEGORY_LIMIT_EXCEEDED`(상한 100개 — §7.3) · 429 · 500 · 504. 프론트는 409·422·500 을 구분하지 않고 '카테고리를 만들지 못했습니다…'(FS-010-EL-016.4)로 표시한다 — §7.6 변경 요청.

---

### BE-010-EP-12 · 카테고리 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-010-EL-016.2, EL-016.9 |
| 메서드·경로 | `DELETE /api/faq-categories/:id` |
| 권한 | `admin` 만. `operator` → 403 |
| 멱등성 | 멱등(이미 삭제 → 204). 단 참조 무결성 검사가 선행 |
| 레이트리밋 | 분당 10회 |

**응답 204**. **참조 무결성 (§7.7 보안·정합 판정)**: 그 카테고리에 속한 FAQ 가 1건이라도 있으면 **422 `CATEGORY_IN_USE`** 로 거절한다(고아 FAQ 방지). 프론트는 사용량(EP-03)으로 버튼을 미리 잠그지만(FS-010-EL-016.2), **서버가 정본**이다 — 프론트가 사용량을 조회한 뒤 다른 관리자가 그 카테고리에 FAQ 를 붙였다면 프론트 버튼은 열려 있어도 서버가 막는다. `message` = '사용 중인 카테고리는 삭제할 수 없습니다.'

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `CATEGORY_NOT_FOUND` · 422 `CATEGORY_IN_USE` · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | 파라미터·`keyword`(100자) → `error.fields` | 401 → FS-010-EL-012 | **403** 컬렉션 | N/A — 0건이면 200 빈 배열 → FS-010-EL-011 | N/A 읽기 전용 | N/A | 429 분당 120 | 500 + `traceId` → FS-010-EL-012 | 5초 → 504 |
| EP-02/03 카테고리·사용량 | N/A — 파라미터 없음/최소 | 401 (카테고리 목록 없이 '전체'만) | **403** 컬렉션 | N/A — 0개면 빈 배열 | N/A | N/A | 429 | 500 + `traceId`. 프론트에 전용 재시도 없음(§7.6) | 5초 → 504 |
| EP-04 상세 | id 형식 | 401 → FS-010-EL-022 | 읽기 권한 없음 → **404 은닉** | 404 `FAQ_NOT_FOUND` → '찾을 수 없습니다' 변환 | N/A | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-05 등록 | `question`·`answer`·`order`·`categoryId` → `error.fields` | 401 → FS-010-EL-025 | **403** 컬렉션 쓰기 | N/A 생성 | N/A | **422 `CATEGORY_NOT_FOUND`** | 429 | 500 + `traceId` → FS-010-EL-025 | 5초 → 504 |
| EP-06 수정 | 위 + id | 401 → FS-010-EL-025 | `operator` → **403** / 읽기 없음 → **404** | 404 `FAQ_NOT_FOUND` | **409** 동시 수정(마지막 쓰기 승리) | 422 `CATEGORY_NOT_FOUND` | 429 | 500 + `traceId` | 5초 → 504 |
| EP-07 삭제 | id 형식 | 401 → 다이얼로그 배너(FS-010-EL-014.1) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id만. **이미 삭제 204(멱등)** | N/A DELETE 멱등 | N/A | 429 분당 60 | 500 → 단건 배너 / 일괄 부분 실패 건수 | 5초 → 504 |
| EP-08 노출 토글 | `visible` 형식·id | 401. 프론트는 롤백 + 재시도 토스트 | `operator` → **403** / 읽기 없음 → **404** | 404 `FAQ_NOT_FOUND` | N/A — 멱등(목표 상태 세팅) | N/A | 429 분당 120 | 500 → 롤백 + 재시도 토스트(FS-010-EL-009.7) | 5초 → 504 |
| EP-09 재정렬 | `orderedIds` 미존재·중복·구성 불일치 → 400 | 401. 프론트 롤백 + 재시도 토스트 | `operator` → **403** | N/A — 대상은 목록 전체 | **동시 재정렬은 마지막 쓰기 승리**(§7.4) — 충돌을 409 로 올리지 않는다 | N/A | 429 분당 60 | 500 → 롤백 + 재시도(FS-010-EL-009.12) | 5초 → 504 |
| EP-10 next-order | N/A — 파라미터 없음 | 401 → 자동 채움 빈 값 | **403** | N/A | N/A | N/A | 429 | 500 → 자동 채움 실패, 빈 값(제출 검증이 잡음) | 5초 → 504 |
| EP-11 카테고리 생성 | `name` 1–30자 | 401 → FS-010-EL-016.4 | **403** 컬렉션 쓰기 | N/A 생성 | **409 `CATEGORY_NAME_DUPLICATED`** 정규화 이름 중복(§7.5) | **422 `CATEGORY_LIMIT_EXCEEDED`** 100개 상한 | 429 분당 10 | 500 → FS-010-EL-016.4, 입력 유지 | 5초 → 504 |
| EP-12 카테고리 삭제 | id 형식 | 401 → 다이얼로그 배너 | `operator` → **403** | 404 `CATEGORY_NOT_FOUND` | N/A | **422 `CATEGORY_IN_USE`** 사용 중 차단(§7.7) | 429 분당 10 | 500 → 다이얼로그 배너 | 5초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `fetchFaqs(query, signal)` | `GET /api/faqs?categoryId=&visibility=&keyword=&page=&size=` | EP-01 | `FaqListResult` | O |
| `fetchFaqCategories(signal)` | `GET /api/faq-categories` | EP-02 | `FaqCategory[]` | O |
| `fetchFaqCategoryUsage(signal)` | `GET /api/faq-categories` (사용 수 포함) | EP-03 | `FaqCategoryUsage[]` | O |
| `fetchFaq(id, signal)` | `GET /api/faqs/:id` | EP-04 | `Faq`(404 → 문구 변환) | O |
| `createFaq(input, signal?)` | `POST /api/faqs` | EP-05 | `void`(201) | O |
| `updateFaq(id, input, signal?)` | `PUT /api/faqs/:id` | EP-06 | `void` | O |
| `deleteFaq(id, signal?)` | `DELETE /api/faqs/:id` | EP-07 | `void`(204) | O |
| `setFaqVisibility(id, visible, signal?)` | `PATCH /api/faqs/:id/visibility` | EP-08 | `void` | O |
| `reorderFaqs(orderedIds, signal?)` | `PUT /api/faqs/reorder { orderedIds }` | EP-09 | `void` | O |
| `fetchNextFaqOrder(signal?)` | `GET /api/faqs/next-order` | EP-10 | `number` | O |
| `createFaqCategory(input, signal?)` | `POST /api/faq-categories` | EP-11 | `void` | O |
| `deleteFaqCategory(id, signal?)` | `DELETE /api/faq-categories/:id` | EP-12 | `void`(422 사용 중) | O |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` 헤더 · `fetchFaq` 는 404 → `Error('FAQ 를 찾을 수 없습니다')` 변환 · `fetchFaqs` 는 `size` 쿼리(`PAGE_SIZE`=10).

## 7. 핵심 판정

### 7.1 일괄 삭제·일괄 토글 — 전용 엔드포인트를 만들지 않는다
프론트가 `settleAll` 로 단건 DELETE(EP-07)·단건 PATCH(EP-08)를 병렬 호출하고 부분 실패를 건수로 집계한다(FS-010-EL-008.2/.3/.4/.15). 단건이 멱등이므로 부분 실패 후 재시도가 안전하다. BE-009 §7.1 과 같은 근거로 전용 벌크 계약을 두지 않는다.

### 7.2 답변 XSS — 서버가 저장 시 정제한다 【보안 판정】
FAQ 답변은 관리자 입력이며 **고객 FAQ 화면에 노출**된다. 관리자 화면은 pre-wrap 텍스트로만 렌더하지만(FS-010-EL-020), 고객 렌더가 HTML 로 해석하면 저장형 XSS 가 된다. BE-009 §7.3 과 동일 판정 — 서버가 저장 시 허용 태그 화이트리스트 밖의 마크업·`javascript:` 스킴·이벤트 핸들러를 제거하고, 계약은 '저장된 답변에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다. 질문(question)도 동일하게 정제한다.

### 7.3 카테고리 수 상한 — 100개
필터 사이드바(FS-010-EL-001)와 폼 select(FS-010-EL-027)가 카테고리 수에 비례해 늘어난다(FS-010 §7 #5). 상한 100개에 도달하면 EP-11 이 422 로 거절한다.

### 7.4 재정렬·수정 동시성 — 마지막 쓰기 승리
재정렬(EP-09)·수정(EP-06)에 낙관적 잠금(ETag/version)을 두지 않는다. 프론트가 낙관적 업데이트 후 실패 시 롤백하고 성공 시 재조회로 정합하는 구조라(FS-010-EL-009.7/.12), 서버가 충돌을 409 로 올려도 프론트에 이를 해소할 UI 가 없다. 동시 편집이 실제 문제가 되면 낙관적 잠금을 별도 계약으로 승격한다.

### 7.5 카테고리명 중복 — 정규화 이름 유니크(409)
좌측 필터(FS-010-EL-001)·폼 select 가 카테고리를 **표시명으로 구분**하므로 동명 카테고리 둘은 관리자를 혼란시킨다. 앞뒤 공백 제거 + 대소문자 무시로 정규화한 이름의 중복을 409 `CATEGORY_NAME_DUPLICATED` 로 막는다. FAQ(질문)는 이 제약을 받지 않는다(§7 BE-009 와 같은 결).

### 7.6 후속 이관
| # | 내용 | 이관 |
|---|---|---|
| 1 | 카테고리 목록·사용량 조회 실패 시 프론트에 전용 재시도 배너 없음 | UI 기획 |
| 2 | 카테고리 생성 실패 문구가 코드별로 갈리지 않음(409/422/500 동일 문구) | UI 기획 |
| 3 | 401 감지·리다이렉트·프론트 타임아웃 상한 없음 | UI 기획 · 프론트 구현 |
| 4 | 재정렬 동시성 — 마지막 쓰기 승리(§7.4) | 백엔드 명세 · UI 기획 |
| 5 | ⚠ **프론트 mock 주석이 이 계약과 어긋난다 (신규 발견 2026-07-17)** — `apps/admin/src/pages/content/faq/data-source.ts:211` 이 사용 중 카테고리 삭제를 두고 '서버는 **409** 로 막는다' 라고 적었으나, 이 문서 §7.7 · EP-12(`:216`,`:218`,`:234`,`:251`)는 **422 `CATEGORY_IN_USE`** 를 정본으로 정한다. 이 문서의 코드 체계(409 = 유일성 충돌 — §7.5 `CATEGORY_NAME_DUPLICATED` · 422 = 상태 위반 — §7.3 `CATEGORY_LIMIT_EXCEEDED` · §7.7 `CATEGORY_IN_USE`)와 일관된 쪽은 **422** 이나, 백엔드가 아직 없어 실코드로 확정할 수 없다. 주석을 422 로 맞추거나 계약을 409 로 바꾸는 **판정 필요** — 어느 쪽이든 한 곳으로 모아야 한다. (FS-010 은 이번에 HTTP 코드 표기를 걷어내 '서버가 거절한다'로만 기술하도록 고쳤다 — FS 는 에러코드를 쓰지 않는다는 자기 점검 규칙에 맞춘 것이며, 이 판정의 대상이 아니다) | 백엔드 명세 · 프론트 구현 |

### 7.7 카테고리 참조 무결성 — 서버가 정본 【보안·정합 판정】
사용 중 카테고리 삭제 차단은 프론트 버튼 잠금(FS-010-EL-016.2)만으로는 불충분하다 — 프론트가 사용량을 조회한 시점과 삭제 시점 사이에 다른 관리자가 그 카테고리에 FAQ 를 붙일 수 있다(TOCTOU). **서버가 삭제 트랜잭션 안에서 참조를 재확인**하고 1건이라도 있으면 422 `CATEGORY_IN_USE` 로 거절한다. 프론트 잠금은 UX 편의이고 서버 검사가 정본이다.

## 8. 자기 점검
- [x] FS-010 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (12 엔드포인트)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (12행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 상속으로 선언, 재정의 안 함
- [x] 멱등성 판정 — 조회 GET / 삭제·토글·재정렬·수정 멱등 / 등록·카테고리 생성 비멱등
- [x] 보안 판정(XSS §7.2 · 카테고리 참조 무결성 §7.7)을 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
