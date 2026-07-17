---
id: BE-012
title: "배너 관리 백엔드 기능 명세"
functionalSpec: FS-012
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-012. 배너 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-012 배너 관리 (`/content/banners` · `/new` · `/:id/edit`) |
| 범위 | 배너 목록/상세(수정 폼용)/등록/수정/삭제(단건·일괄), ON/OFF 토글(단건·일괄), 정렬 순서 재정렬, 정렬 순서 자동 채움 |
| 범위 밖 | 이미지 파일 업로드(§7.2). 고객 노출 렌더. |
| 프론트 어댑터 | `apps/admin/src/pages/content/banners/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/content/banners/types.ts` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 그대로 상속. 팝업(BE-011)과 '닮은 쌍'이며 **재정렬(EP-07)이 추가**된다. 이미지 URL 검증(§7.3)·노출 권한(§7.5) 판정은 BE-011 과 동일 근거를 상속한다.

## 2. 공통 (상속)

- **권한**: `admin` = 전체. `operator` = 조회 계열만(목록·상세·next-order), 쓰기(등록·수정·삭제·ON/OFF·재정렬) → 403. 콘텐츠 읽기 권한 없음 → 컬렉션 403 / 개별 404 은닉.
- **CSRF**: 쓰기(POST·PUT·PATCH·DELETE)에 `X-CSRF-Token`. **타임아웃**: 5초 → 504. **프론트 역할 분기 없음**.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 |
|---|---|
| `Banner` | `id` · `title` · `imageUrl` · `linkUrl` · `placement`(`main`\|`sub`) · `startAt`·`endAt`(`YYYY-MM-DD`) · `enabled`(bool) · `order`(number, 작을수록 앞) |
| `BannerListResult` | `banners[]` · `total` |

## 4. 엔드포인트 명세

### BE-012-EP-01 · 배너 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-001, EL-002, EL-004, EL-006, EL-009, EL-010 |
| 메서드·경로 | `GET /api/banners` · 권한 `admin`, `operator` · 멱등(GET) · offset(`page`/`size` 10·100) · 분당 120회 |

**쿼리**: `placement`(`all`\|`main`\|`sub`, 기본 `all`) · `keyword`(0–100자, 제목 부분 일치·대소문자 무시) · `page` · `size`. 정렬 `order` 오름차순 고정. **응답 200** — `BannerListResult`. **에러**: 400 · 401 · 403 · 429 · 500 · 504.

---

### BE-012-EP-02 · 배너 상세 조회 (수정 폼용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-025 |
| 메서드·경로 | `GET /api/banners/:id` · 권한 `admin`, `operator`. 읽기 없음 → 404 은닉 |

**응답 200** — `Banner`. 어댑터 404 → `Error('배너를 찾을 수 없습니다')`. **에러**: 400 · 401 · 404 `BANNER_NOT_FOUND` · 429 · 500 · 504.

---

### BE-012-EP-03 · 배너 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-024(등록) · `POST /api/banners` · `admin` 만 · 비멱등 · 분당 30회 |

**바디**(`BannerInput`): `title`(1–100자) · `imageUrl`(http(s), §7.3) · `linkUrl`(빈 문자열 또는 http(s)) · `placement`(enum) · `startAt`·`endAt`(실재 날짜, `endAt ≥ startAt`) · `enabled`(bool) · `order`(정수 ≥ 0). **응답 201** — `Banner`. **에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 CSRF · 422 `INVALID_DATE_RANGE` · 429 · 500 · 504.

---

### BE-012-EP-04 · 배너 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-024(수정) · `PUT /api/banners/:id` · `admin` 만 · **멱등**(전체 치환) · 분당 30회 |

**에러**: 400 · 401 · 403 · 403 CSRF · 404 `BANNER_NOT_FOUND` · 409 `CONFLICT`(동시 수정, 마지막 쓰기 승리) · 422 `INVALID_DATE_RANGE` · 429 · 500 · 504.

---

### BE-012-EP-05 · 배너 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-006.11, EL-011, EL-012 · `DELETE /api/banners/:id` · `admin` 만 · **멱등**(이미 삭제 → 204) · 분당 60회 |

일괄은 프론트 `settleAll` 병렬 DELETE. **에러**: 400 · 401 · 403 · 403 CSRF · 404 `BANNER_NOT_FOUND`(존재한 적 없는 id만) · 429 · 500 · 504.

---

### BE-012-EP-06 · ON/OFF 토글 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-006.8, EL-005.2, EL-005.3 · `PATCH /api/banners/:id/enabled` · `admin` 만 · **멱등**(목표 상태 세팅) · 분당 120회 |

**바디**: `{ enabled: boolean }`. 프론트 낙관적 업데이트, 실패 시 롤백(FS-012-EL-006.8). 일괄은 병렬 PATCH(`settleAll`). ON 전이(노출)는 `admin` 만(§7.5). **에러**: 400 · 401 · 403 · 403 CSRF · 404 `BANNER_NOT_FOUND` · 429 · 500 · 504.

---

### BE-012-EP-07 · 정렬 순서 재정렬
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-006.10, EL-006.12 · `PUT /api/banners/reorder` · `admin` 만 · **멱등**(같은 `orderedIds` → 같은 최종 순서) · 분당 60회 |

**바디**: `{ orderedIds: string[] }`. 서버는 이 id 들을 원래 슬롯 안에서 새 순서로 재배치하고 전체 `order` 를 1..n 으로 다시 매긴다(`reorderByIds`, FAQ EP-09 와 동일 규칙). 화면 밖 항목의 상대 순서는 보존. **동시성**: 마지막 요청 승리(낙관적 잠금 미도입 — §7.4). **에러**: 400 `VALIDATION_FAILED`(미존재 id·중복·구성 불일치) · 401 · 403 · 403 CSRF · 429 · 500 · 504.

---

### BE-012-EP-08 · 정렬 순서 자동 채움
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-012-EL-019 · `GET /api/banners/next-order` · 권한 `admin`, `operator` · 멱등(GET) |

**응답 200** — `number`(최대 `order` + 1, 비면 1). 제안값이며 유니크 예약 아님(§7.4). **에러**: 401 · 403 · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | 파라미터·`keyword`(100자) → `error.fields` | 401 → FS-012-EL-009 | **403** 컬렉션 | N/A — 0건이면 200 빈 배열 → FS-012-EL-008 | N/A 읽기 전용 | N/A | 429 분당 120 | 500 + `traceId` → FS-012-EL-009 | 5초 → 504 |
| EP-02 상세 | id 형식 | 401 → 수정 폼 대체(FS-012-EL-025) | 읽기 없음 → **404 은닉** | 404 `BANNER_NOT_FOUND` | N/A | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-03 등록 | `title`·`imageUrl`·`linkUrl`·날짜·`order` → `error.fields`. 프론트 `bannerSchema` 자체 검증 | 401 → FS-012-EL-014 | **403** 컬렉션 쓰기 | N/A 생성 | N/A | **422 `INVALID_DATE_RANGE`** | 429 분당 30 | 500 → FS-012-EL-014, 입력 유지 | 5초 → 504 |
| EP-04 수정 | 위 + id | 401 → FS-012-EL-014 | `operator` → **403** / 읽기 없음 → **404** | 404 `BANNER_NOT_FOUND` | **409** 동시 수정(마지막 쓰기 승리) | 422 `INVALID_DATE_RANGE` | 429 | 500 + `traceId` | 5초 → 504 |
| EP-05 삭제 | id 형식 | 401 → 다이얼로그 배너(FS-012-EL-011.1) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id만. **이미 삭제 204** | N/A DELETE 멱등 | N/A | 429 분당 60 | 500 → 단건 배너 / 일괄 부분 실패 건수 | 5초 → 504 |
| EP-06 ON/OFF 토글 | `enabled`·id 형식 | 401. 프론트 롤백 + 재시도 토스트 | `operator` → **403** / 읽기 없음 → **404** | 404 `BANNER_NOT_FOUND` | N/A — 멱등(목표 상태 세팅) | N/A | 429 분당 120 | 500 → 롤백 + 재시도 토스트(FS-012-EL-006.8) | 5초 → 504 |
| EP-07 재정렬 | `orderedIds` 미존재·중복·구성 불일치 → 400 | 401. 프론트 롤백 + 재시도 토스트 | `operator` → **403** | N/A — 대상은 목록 전체 | **동시 재정렬은 마지막 쓰기 승리**(§7.4) — 409 로 올리지 않는다 | N/A | 429 분당 60 | 500 → 롤백 + 재시도(FS-012-EL-006.12) | 5초 → 504 |
| EP-08 next-order | N/A — 파라미터 없음 | 401 → 자동 채움 빈 값 | **403** | N/A | N/A | N/A | 429 | 500 → 자동 채움 실패, 빈 값 | 5초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `fetchBanners(query, signal)` | `GET /api/banners?placement=&keyword=&page=&size=` | EP-01 | `BannerListResult` | O |
| `fetchBanner(id, signal)` | `GET /api/banners/:id` | EP-02 | `Banner` | O |
| `createBanner(input, signal?)` | `POST /api/banners` | EP-03 | `void`(201) | O |
| `updateBanner(id, input, signal?)` | `PUT /api/banners/:id` | EP-04 | `void` | O |
| `deleteBanner(id, signal?)` | `DELETE /api/banners/:id` | EP-05 | `void`(204) | O |
| `setBannerEnabled(id, enabled, signal?)` | `PATCH /api/banners/:id/enabled` | EP-06 | `void` | O |
| `reorderBanners(orderedIds, signal?)` | `PUT /api/banners/reorder { orderedIds }` | EP-07 | `void` | O |
| `fetchNextBannerOrder(signal?)` | `GET /api/banners/next-order` | EP-08 | `number` | O |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` · `fetchBanner` 404 → `Error('배너를 찾을 수 없습니다')` · `fetchBanners` 는 `size` 쿼리(10).

## 7. 핵심 판정

### 7.1 일괄 삭제·일괄 ON/OFF — 전용 엔드포인트 없음
BE-011 §7.1 과 동일. 프론트 `settleAll` 로 단건 멱등 요청 병렬 호출·부분 실패 집계.

### 7.2 이미지 — URL 문자열 저장. 업로드는 별도 계약
BE-011 §7.2 상속. `imageUrl` 문자열만 저장, 파일 업로드는 `POST /api/uploads` 별도 계약.

### 7.3 이미지 URL 검증 — 서버가 재검증한다 【보안 판정】
BE-011 §7.3 을 상속한다 — SSRF(사설 IP·루프백·링크로컬 차단)·위험 스킴(`javascript:`·`data:`) 거부·혼합 콘텐츠·MIME/크기 검증. 계약은 '저장된 `imageUrl` 이 안전한 스킴의 외부 이미지 주소'라는 관측 동작만 정한다. `linkUrl` 도 위험 스킴 거부.

### 7.4 정렬 순서·재정렬 동시성 — 유니크 아님, 마지막 쓰기 승리
`order` 는 유니크가 아니다(자동 채움은 제안값). 재정렬(EP-07)이 전체를 1..n 으로 재매김해 정합한다. 동시 재정렬은 낙관적 잠금 없이 마지막 요청이 이긴다 — 프론트가 낙관 반영 후 실패 시 롤백·성공 시 재조회 정합하는 구조라 서버가 409 를 올려도 해소할 UI 가 없다(FAQ BE-010 §7.4 와 같은 근거).

### 7.5 노출(게시) 권한 서버 판정 【보안 판정】
BE-011 §7.5 상속 — 배너 노출(ON 전이·`enabled=true` 등록)은 고객 노출이므로 `admin` 만. `operator` 는 쓰기 403. 프론트 역할 분기 없음 → 서버 전담.

### 7.6 후속 이관
| # | 내용 | 이관 |
|---|---|---|
| 1 | 이미지 파일 업로드 미구현 | 백엔드 명세 · UI 기획 |
| 2 | 동값(같은 order) 배너의 노출 순서 규칙 미정 | 아키텍처 |
| 3 | 401 감지·리다이렉트·프론트 타임아웃 상한 없음 | UI 기획 · 프론트 구현 |
| 4 | 재정렬·수정 동시성 — 마지막 쓰기 승리 | 백엔드 명세 · UI 기획 |
| 5 | 이미지 URL 도달 가능성·MIME·크기 검증 깊이 미확정(§7.3) | 백엔드 명세 |

## 8. 자기 점검
- [x] FS-012 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (8 엔드포인트)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 (8행 × 9열)
- [x] 에러 봉투·권한 모델 BE-003 상속, 이미지·노출 판정은 BE-011 상속 선언
- [x] 멱등성 판정 — GET 조회 / 삭제·토글·수정·재정렬 멱등 / 등록 비멱등
- [x] 보안 판정(이미지 URL 검증 §7.3 · 노출 권한 §7.5)을 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
