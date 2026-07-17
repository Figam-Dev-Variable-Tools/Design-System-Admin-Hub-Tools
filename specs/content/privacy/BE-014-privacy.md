---
id: BE-014
title: "개인정보 처리방침 관리 백엔드 기능 명세"
functionalSpec: FS-014
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-014. 개인정보 처리방침 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-014 개인정보 처리방침 관리 (`/content/privacy` · `/:id` · `/new` · `/:id/edit`) |
| 범위 | 버전 이력, 버전 상세(전문), 버전 등록·수정·삭제(단건·일괄) |
| 범위 밖 | 고객 노출 렌더. **단일 문서**라 종류(type) 개념이 없다 |
| 프론트 어댑터 | `apps/admin/src/pages/content/privacy/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/content/privacy/types.ts` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 그대로 상속. 약관(BE-013)과 '버전 문서 쌍'이며, **본문 XSS(BE-013 §7.2)·현재 시행본 보호(BE-013 §7.4)·버전 유니크(BE-013 §7.5)·시행 권한(BE-013 §7.7) 판정을 그대로 상속**한다. 차이는 종류(typeId)가 없다는 것뿐이다.

## 2. 공통 (상속)

- **권한**: `admin` = 전체. `operator` = 조회 계열만(이력·상세), 쓰기(등록·수정·삭제) → 403. 콘텐츠 읽기 권한 없음 → 컬렉션 403 / 개별 404 은닉.
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`. **타임아웃**: 5초 → 504. **프론트 역할 분기 없음**.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 |
|---|---|
| `PrivacyVersion` | `id` · `version`(표기) · `effectiveDate`(YYYY-MM-DD) · `status`(`active`\|`scheduled`\|`archived`) · `body` |

`typeId` 가 없다(단일 문서). `status='active'` 가 현재 시행본. 이력은 시행일 내림차순.

## 4. 엔드포인트 명세

### BE-014-EP-01 · 버전 이력 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-014-EL-004, EL-001 · `GET /api/privacy-policy` · 권한 `admin`, `operator` · 멱등(GET) · 분당 120회 |

**요청**: 파라미터 없음(단일 문서 전량). 정렬 시행일 내림차순 고정. 검색(FS-014-EL-001)은 **클라이언트 필터**라 `keyword` 를 보내지 않는다. **응답 200** — `readonly PrivacyVersion[]`. **에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-014-EP-02 · 버전 상세(전문)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-014-EL-013, EL-015, EL-025 · `GET /api/privacy-policy/:id` · 권한 `admin`, `operator`. 읽기 없음 → 404 은닉 |

**응답 200** — `PrivacyVersion`. 어댑터 404 → `Error('처리방침 버전을 찾을 수 없습니다')`. **에러**: 400 · 401 · 404 `PRIVACY_VERSION_NOT_FOUND` · 429 · 500 · 504.

---

### BE-014-EP-03 · 버전 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-014-EL-024(등록) · `POST /api/privacy-policy` · `admin` 만 · 비멱등 · 분당 20회 |

**바디**(`PrivacyVersionInput`): `version`(1–20자) · `effectiveDate`(실재 날짜) · `status`(enum) · `body`(1–20000자, **서버 정제 §7.2 = XSS**). **응답 201** — `PrivacyVersion`. `status='active'` 등록 시 기존 active 를 archived 로 자동 전이(문서당 시행본 1개, §7.4). **에러**: 400 `VALIDATION_FAILED` · 401 · 403 · 403 CSRF · 409 `VERSION_DUPLICATED`(버전 표기 중복 — §7.5) · 429 · 500 · 504.

---

### BE-014-EP-04 · 버전 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-014-EL-024(수정) · `PUT /api/privacy-policy/:id` · `admin` 만 · **멱등**(전체 치환) · 분당 20회 |

**바디**: `PrivacyVersionInput`. `status='active'` 전이 시 §7.4 규칙. **에러**: 400 · 401 · 403 · 403 CSRF · 404 `PRIVACY_VERSION_NOT_FOUND` · 409 `VERSION_DUPLICATED` / `CONFLICT`(동시 수정) · 429 · 500 · 504.

---

### BE-014-EP-05 · 버전 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-014-EL-004.7, EL-008, EL-009, EL-016 · `DELETE /api/privacy-policy/:id` · `admin` 만 · **멱등**(이미 삭제 → 204) · 분당 30회 |

일괄은 프론트 `settleAll` 병렬 DELETE. **현재 시행본 보호(§7.4)**: `status='active'` 버전 삭제는 **422 `CANNOT_DELETE_ACTIVE`** 로 거절(고객에게 노출 중인 처리방침 보호). **에러**: 400 · 401 · 403 · 403 CSRF · 404 `PRIVACY_VERSION_NOT_FOUND`(존재한 적 없는 id만) · 422 `CANNOT_DELETE_ACTIVE` · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 이력 | N/A — 파라미터 없음 | 401 → FS-014-EL-007(전체 대체) | **403** 컬렉션 | N/A — 0건이면 200 빈 배열 → FS-014-EL-006 | N/A 읽기 전용 | N/A | 429 분당 120 | 500 + `traceId` → FS-014-EL-007 | 5초 → 504 |
| EP-02 상세 | id 형식 | 401 → FS-014-EL-015 | 읽기 없음 → **404 은닉** | 404 `PRIVACY_VERSION_NOT_FOUND` → '처리방침 버전을 찾을 수 없습니다' | N/A | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-03 등록 | `version`·`effectiveDate`·`body`·`status` → `error.fields`. 프론트 `privacyVersionSchema` 자체 검증 | 401 → FS-014-EL-018 | **403** 컬렉션 쓰기 | N/A 생성 | **409 `VERSION_DUPLICATED`** 버전 표기 중복(§7.5) | N/A(active 전이는 기존을 archived 로 밀 뿐) | 429 분당 20 | 500 → FS-014-EL-018, 입력 유지 | 5초 → 504 |
| EP-04 수정 | 위 + id | 401 → FS-014-EL-018 | `operator` → **403** / 읽기 없음 → **404** | 404 `PRIVACY_VERSION_NOT_FOUND` | **409** `VERSION_DUPLICATED` 또는 `CONFLICT`(동시 수정, 마지막 쓰기 승리) | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-05 삭제 | id 형식 | 401 → 다이얼로그 배너(FS-014-EL-008.1) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id만. **이미 삭제 204** | N/A DELETE 멱등 | **422 `CANNOT_DELETE_ACTIVE`** 시행 중 버전 보호(§7.4) | 429 분당 30 | 500 → 단건 배너 / 일괄 부분 실패 건수 | 5초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `fetchPrivacyVersions(signal)` | `GET /api/privacy-policy` | EP-01 | `PrivacyVersion[]` | O |
| `fetchPrivacyVersion(id, signal)` | `GET /api/privacy-policy/:id` | EP-02 | `PrivacyVersion`(404 변환) | O |
| `createPrivacyVersion(input, signal?)` | `POST /api/privacy-policy` | EP-03 | `void`(201) | O |
| `updatePrivacyVersion(id, input, signal?)` | `PUT /api/privacy-policy/:id` | EP-04 | `void` | O |
| `deletePrivacyVersion(id, signal?)` | `DELETE /api/privacy-policy/:id` | EP-05 | `void`(204, 422 시행중) | O |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` · `fetchPrivacyVersion` 404 → `Error('처리방침 버전을 찾을 수 없습니다')`.

## 7. 핵심 판정

### 7.1 일괄 삭제 — 전용 엔드포인트 없음
프론트 `settleAll` 로 단건 멱등 DELETE(EP-05) 병렬 호출·부분 실패 집계.

### 7.2 본문 XSS — 서버가 저장 시 정제한다 【보안 판정】
처리방침 본문은 관리자 입력이며 **고객에게 법적 고지로 노출**된다. BE-013 §7.2 를 상속 — 서버가 저장 시 위험 마크업·스킴·핸들러를 제거하고, 정제가 고지 의미를 바꾸지 않도록 허용 태그를 보수적으로 둔다. 계약은 '저장된 본문에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다.

### 7.3 문서(type) 개념 없음
처리방침은 단일 문서다 — 종류 선택·종류 쓰기가 없다(FS-014 §1). 버전만 관리한다.

### 7.4 현재 시행본 보호 — 시행 중 삭제 불가, active 1개 【정합 판정】
BE-013 §7.4 상속(단, 문서 전체에 대해 active 1개). `status='active'` 삭제는 422 `CANNOT_DELETE_ACTIVE`. 새 버전을 active 로 만들면 기존 active 를 archived 로 자동 전이. `scheduled` → `active` 자동 승격은 서버 스케줄러(§7.6 미결).

### 7.5 버전 표기 중복 — 유니크(409)
단일 문서 안에서 버전 표기(정규화) 중복을 409 `VERSION_DUPLICATED` 로 막는다 — 이력 표(FS-014-EL-004.4)가 두 버전을 구분하지 못하기 때문.

### 7.6 후속 이관
| # | 내용 | 이관 |
|---|---|---|
| 1 | `scheduled` → `active` 자동 승격 스케줄러의 관측 계약 상세 미확정 | 백엔드 명세 |
| 2 | 401 감지·리다이렉트·프론트 타임아웃 상한 없음 | UI 기획 · 프론트 구현 |
| 3 | 수정 동시성 — 마지막 쓰기 승리 | 백엔드 명세 · UI 기획 |
| 4 | 같은 시행일 두 버전의 우선순위 규칙 미정 | 백엔드 명세 |

### 7.7 시행 권한 서버 판정 【보안 판정】
버전을 `active`/`scheduled` 로 만드는 것(=고객 노출)은 **서버가 역할로 판정**(BE-013 §7.7 상속). `operator` 는 쓰기 403, `admin` 만 시행본을 만든다. 프론트 역할 분기 없음 → 서버 전담.

## 8. 자기 점검
- [x] FS-014 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (5 엔드포인트)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 (5행 × 9열)
- [x] 에러 봉투·권한 모델 BE-003 상속, XSS·시행본 보호·유니크 판정은 BE-013 상속 선언
- [x] 멱등성 판정 — GET 조회 / 삭제·수정 멱등 / 등록 비멱등
- [x] 보안·정합 판정(본문 XSS §7.2 · 현재 시행본 보호 §7.4 · 시행 권한 §7.7)을 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
