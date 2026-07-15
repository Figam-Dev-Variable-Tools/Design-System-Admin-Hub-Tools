---
id: BE-011
title: "팝업 관리 백엔드 기능 명세"
functionalSpec: FS-011
owner: A63
reviewer: A64
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-011. 팝업 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-011 팝업 관리 (`/content/popups` · `/new` · `/:id/edit`) |
| 범위 | 팝업 목록/상세(수정 폼용)/등록/수정/삭제(단건·일괄), ON/OFF 토글(단건·일괄), 우선순위 자동 채움 |
| 범위 밖 | 이미지 파일 업로드(§7.2 — 별도 `POST /api/uploads`). 고객 노출 렌더. |
| 프론트 어댑터 | `apps/admin/src/pages/content/popups/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/content/popups/types.ts` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 그대로 상속(BE-009 §2 와 동일 선언). 아래는 팝업 고유 차이만.

## 2. 공통 (상속)

- **권한**: `admin` = 전체. `operator` = 조회 계열만(목록·상세·next-priority), 쓰기(등록·수정·삭제·ON/OFF 토글) → 403. 콘텐츠 읽기 권한 없음 → 컬렉션 403 / 개별 404 은닉.
- **CSRF**: 쓰기(POST·PUT·PATCH·DELETE)에 `X-CSRF-Token`. **타임아웃**: 5초 → 504. **프론트 역할 분기 없음**.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 |
|---|---|
| `Popup` | `id` · `title` · `imageUrl` · `linkUrl` · `position`(`home`\|`event`\|`all`) · `startAt`·`endAt`(`YYYY-MM-DD`) · `enabled`(bool) · `priority`(number, 작을수록 먼저) |
| `PopupListResult` | `popups[]` · `total` |

목록·상세가 같은 `Popup` 스키마를 쓴다(팝업은 목록에도 전체 필드를 싣는다 — 본문 분리가 없다).

## 4. 엔드포인트 명세

### BE-011-EP-01 · 팝업 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-001, EL-002, EL-004, EL-006, EL-009, EL-010 |
| 메서드·경로 | `GET /api/popups` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | offset. `page` 1-base, `size` 기본 10 · 상한 100 |
| 레이트리밋 | 분당 120회 |

**쿼리**: `enabled`(`all`\|`on`\|`off`, 기본 `all`) · `keyword`(0–100자, 앞뒤 공백 제거, **제목** 부분 일치·대소문자 무시) · `page` · `size`. 정렬은 `priority` 오름차순 고정. **응답 200** — `PopupListResult`(`popups[]` + `total`). **에러**: 400 · 401 · 403 · 429 · 500 · 504.

---

### BE-011-EP-02 · 팝업 상세 조회 (수정 폼용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-025 |
| 메서드·경로 | `GET /api/popups/:id` |
| 권한 | `admin`, `operator`. 읽기 권한 없음 → 404 은닉 |

**응답 200** — `Popup`. 프론트 어댑터는 404 시 `Error('팝업을 찾을 수 없습니다')` 로 변환하며, 수정 폼이 이를 '팝업을 불러오지 못했습니다.'(FS-011-EL-025)로 표시한다. **에러**: 400 · 401 · 404 `POPUP_NOT_FOUND` · 429 · 500 · 504.

---

### BE-011-EP-03 · 팝업 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-024(등록) |
| 메서드·경로 | `POST /api/popups` · 권한 `admin` 만 · 비멱등 · 분당 30회 |

**바디**(`PopupInput`): `title`(1–100자) · `imageUrl`(http(s) URL, §7.3 서버 재검증) · `linkUrl`(빈 문자열 또는 http(s) URL) · `position`(enum) · `startAt`·`endAt`(실재 날짜, `endAt ≥ startAt`) · `enabled`(bool) · `priority`(정수 ≥ 0). **응답 201** — 생성 `Popup`. 프론트 `createPopup(...): Promise<void>`.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `title`·`imageUrl`·`linkUrl`·`startAt`·`endAt`·`priority`) · 401 · 403 · 403 CSRF · 422 `INVALID_DATE_RANGE`(종료<시작 — 프론트도 검증) · 429 · 500 · 504.

---

### BE-011-EP-04 · 팝업 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-024(수정) |
| 메서드·경로 | `PUT /api/popups/:id` · 권한 `admin` 만 · **멱등**(PUT 전체 치환) · 분당 30회 |

**바디**: `PopupInput`. **응답 200/204**. **에러**: 400 · 401 · 403 · 403 CSRF · 404 `POPUP_NOT_FOUND` · 409 `CONFLICT`(동시 수정, 마지막 쓰기 승리) · 422 `INVALID_DATE_RANGE` · 429 · 500 · 504.

---

### BE-011-EP-05 · 팝업 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-006.9, EL-011, EL-012 |
| 메서드·경로 | `DELETE /api/popups/:id` · 권한 `admin` 만 · **멱등**(이미 삭제 → 204) · 분당 60회 |

일괄 삭제는 프론트가 `settleAll` 로 항목마다 병렬 DELETE(§7.1). **에러**: 400 · 401 · 403 · 403 CSRF · 404 `POPUP_NOT_FOUND`(존재한 적 없는 id만) · 429 · 500 · 504.

---

### BE-011-EP-06 · ON/OFF 토글 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-006.7, EL-005.2, EL-005.3 |
| 메서드·경로 | `PATCH /api/popups/:id/enabled` · 권한 `admin` 만 · **멱등**(목표 상태 세팅) · 분당 120회 |

**바디**: `{ enabled: boolean }`. **응답 200/204**. 프론트 `setPopupEnabled(id, enabled)` — 낙관적 업데이트, 실패 시 롤백(FS-011-EL-006.7). 일괄은 항목마다 병렬 PATCH(`settleAll`).

**게시(노출) 권한 판정 (§7.5)**: ON 전이는 고객 노출을 의미하며 `admin` 만 가능하다(`operator` 는 애초에 403). **에러**: 400 · 401 · 403 · 403 CSRF · 404 `POPUP_NOT_FOUND` · 429 · 500 · 504.

---

### BE-011-EP-07 · 우선순위 자동 채움
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-011-EL-019 |
| 메서드·경로 | `GET /api/popups/next-priority` · 권한 `admin`, `operator` · 멱등(GET) |

**응답 200** — `number`(현재 최대 `priority` + 1, 비면 1). **제안값일 뿐 유니크 예약이 아니다** — `priority` 는 유니크가 아니며 같은 값이 허용된다(§7.4). 목록 응답(EP-01)에 최대 priority 를 얹어 왕복을 없앨 수도 있다. **에러**: 401 · 403 · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | 파라미터·`keyword`(100자) → `error.fields` | 401 → FS-011-EL-009 | **403** 컬렉션 | N/A — 0건이면 200 빈 배열 → FS-011-EL-008 | N/A 읽기 전용 | N/A | 429 분당 120 | 500 + `traceId` → FS-011-EL-009 | 5초 → 504 |
| EP-02 상세 | id 형식 | 401 → 수정 폼 대체(FS-011-EL-025) | 읽기 없음 → **404 은닉** | 404 `POPUP_NOT_FOUND` | N/A | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-03 등록 | `title`·`imageUrl`·`linkUrl`·날짜·`priority` → `error.fields`. 프론트 `popupSchema` 자체 검증 | 401 → FS-011-EL-014 | **403** 컬렉션 쓰기 | N/A 생성 | N/A | **422 `INVALID_DATE_RANGE`** | 429 분당 30 | 500 → FS-011-EL-014, 입력 유지 | 5초 → 504 |
| EP-04 수정 | 위 + id | 401 → FS-011-EL-014 | `operator` → **403** / 읽기 없음 → **404** | 404 `POPUP_NOT_FOUND` | **409** 동시 수정(마지막 쓰기 승리) | 422 `INVALID_DATE_RANGE` | 429 | 500 + `traceId` | 5초 → 504 |
| EP-05 삭제 | id 형식 | 401 → 다이얼로그 배너(FS-011-EL-011.1) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id만. **이미 삭제 204** | N/A DELETE 멱등 | N/A | 429 분당 60 | 500 → 단건 배너 / 일괄 부분 실패 건수 | 5초 → 504 |
| EP-06 ON/OFF 토글 | `enabled`·id 형식 | 401. 프론트 롤백 + 재시도 토스트 | `operator` → **403** / 읽기 없음 → **404** | 404 `POPUP_NOT_FOUND` | N/A — 멱등(목표 상태 세팅) | N/A | 429 분당 120 | 500 → 롤백 + 재시도 토스트(FS-011-EL-006.7) | 5초 → 504 |
| EP-07 next-priority | N/A — 파라미터 없음 | 401 → 자동 채움 빈 값 | **403** | N/A | N/A | N/A | 429 | 500 → 자동 채움 실패, 빈 값 | 5초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `fetchPopups(query, signal)` | `GET /api/popups?enabled=&keyword=&page=&size=` | EP-01 | `PopupListResult` | O |
| `fetchPopup(id, signal)` | `GET /api/popups/:id` | EP-02 | `Popup` | O |
| `createPopup(input, signal?)` | `POST /api/popups` | EP-03 | `void`(201) | O |
| `updatePopup(id, input, signal?)` | `PUT /api/popups/:id` | EP-04 | `void` | O |
| `deletePopup(id, signal?)` | `DELETE /api/popups/:id` | EP-05 | `void`(204) | O |
| `setPopupEnabled(id, enabled, signal?)` | `PATCH /api/popups/:id/enabled` | EP-06 | `void` | O |
| `fetchNextPopupPriority(signal?)` | `GET /api/popups/next-priority` | EP-07 | `number` | O |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` · `fetchPopup` 404 → `Error('팝업을 찾을 수 없습니다')` · `fetchPopups` 는 `size` 쿼리(10).

## 7. 핵심 판정

### 7.1 일괄 삭제·일괄 ON/OFF — 전용 엔드포인트 없음
프론트가 `settleAll` 로 단건 DELETE(EP-05)·단건 PATCH(EP-06)를 병렬 호출하고 부분 실패를 건수로 집계한다. 단건 멱등이라 재시도 안전. BE-009 §7.1 과 같은 근거.

### 7.2 이미지 — URL 문자열 저장. 업로드는 별도 계약
현재 팝업은 `imageUrl` 문자열만 저장한다(운영자가 이미 호스팅된 URL 을 붙여넣는다, FS-011-EL-016). 파일 업로드(`POST /api/uploads` → URL 반환)는 이 계약 밖이며, 붙으면 `ImageUrlField` 에 '파일 선택' 경로가 추가되고 업로드 응답 URL 을 값으로 채운다 — 어댑터 시그니처는 그대로다.

### 7.3 이미지 URL 검증 — 서버가 재검증한다 【보안 판정】
프론트는 `http(s)://` 형식만 본다(FS-011-EL-016 · `isHttpUrl`). 이것으로는 부족하다: ① **SSRF** — 서버가 이 URL 을 프록시·프리페치하면 내부망(`http://169.254.169.254` 등)을 찌를 수 있다. 서버는 이미지를 가져오지 않거나, 가져온다면 사설 IP·루프백·링크로컬 대역을 차단한다. ② **XSS/스킴** — `javascript:`·`data:` 스킴을 거부하고 `http(s)` 만 허용한다(프론트 정규식이 이미 `https?://` 로 제한하나 서버가 정본). ③ **혼합 콘텐츠** — 고객 페이지가 HTTPS 면 `http://` 이미지는 차단될 수 있으므로 저장 시 경고하거나 `https` 를 권고한다. ④ **MIME/크기** — 서버가 검증할 수 있으면 이미지가 아닌 응답·과대 파일을 거부한다. 계약은 '**저장된 `imageUrl` 이 안전한 스킴의 외부 이미지 주소**'라는 관측 동작만 정하고, 검증 깊이(HEAD 프리플라이트 여부)는 백엔드 결정이다. `linkUrl` 도 `javascript:` 등 위험 스킴을 거부한다.

### 7.4 우선순위 — 유니크가 아니다
자동 채움(EP-07)은 제안값이며 `priority` 유니크 제약을 걸지 않는다(FS-011-EL-019). 같은 우선순위 팝업이 공존할 수 있고, 동순위의 노출 순서 규칙(등록순·id순)은 고객 노출 도메인의 관심사다(§7.6 미결). 유니크를 강제하면 자동 채움과 다른 관리자의 동시 등록이 충돌해 등록이 실패하게 되는데, 그럴 실익이 없다.

### 7.5 노출(게시) 권한 서버 판정 【보안 판정】
팝업의 노출(ON 전이·`enabled=true` 등록)은 고객 노출을 의미하므로 **서버가 역할로 판정**한다. `operator` 는 쓰기 자체가 403 이라 노출을 만들 수 없고 `admin` 만 가능하다. 프론트에 역할 분기가 없으므로(FS-011 §4.1) 이 판정을 서버가 전담한다.

### 7.6 후속 이관
| # | 내용 | 이관 |
|---|---|---|
| 1 | 이미지 파일 업로드(`POST /api/uploads`) 미구현 | A63 · A11 |
| 2 | 동순위(같은 priority) 팝업의 노출 순서 규칙 미정 — 고객 노출 도메인 소관 | A01 |
| 3 | 401 감지·리다이렉트·프론트 타임아웃 상한 없음 | A11 · A40 |
| 4 | 수정 동시성 — 낙관적 잠금 미도입, 마지막 쓰기 승리 | A63 · A11 |
| 5 | 이미지 URL 의 도달 가능성·MIME·크기 검증 깊이 미확정(§7.3) | A63 |

## 8. 자기 점검
- [x] FS-011 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (7 엔드포인트)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 (7행 × 9열)
- [x] 에러 봉투·권한 모델 BE-003 상속 선언
- [x] 멱등성 판정 — GET 조회 / 삭제·토글·수정 멱등 / 등록 비멱등
- [x] 보안 판정(이미지 URL 검증 §7.3 · 노출 권한 §7.5)을 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
