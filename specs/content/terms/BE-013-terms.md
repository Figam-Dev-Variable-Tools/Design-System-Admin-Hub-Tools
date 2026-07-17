---
id: BE-013
title: "약관 관리 백엔드 기능 명세"
functionalSpec: FS-013
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-013. 약관 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-013 약관 관리 (`/content/terms` · `/:id` · `/new?type=` · `/:id/edit`) |
| 범위 | 약관 종류 목록, 종류별 버전 이력, 버전 상세(전문), 버전 등록·수정·삭제(단건·일괄) |
| 범위 밖 | 고객 노출 렌더. 종류(type) 자체의 생성/삭제 — 이 계약에 종류 쓰기 진입점이 없다(종류는 서버 시드/설정). |
| 프론트 어댑터 | `apps/admin/src/pages/content/terms/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/content/terms/types.ts` |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 그대로 상속. 개인정보 처리방침(BE-014)과 '버전 문서 쌍'이며, 두 문서는 §3(본문 XSS)·§4(현재 시행본 보호)·§5(버전 유니크) 판정을 공유한다.

## 2. 공통 (상속)

- **권한**: `admin` = 전체. `operator` = 조회 계열만(종류·이력·상세), 쓰기(등록·수정·삭제) → 403. 콘텐츠 읽기 권한 없음 → 컬렉션 403 / 개별 404 은닉.
- **CSRF**: 쓰기(POST·PUT·DELETE)에 `X-CSRF-Token`. **타임아웃**: 5초 → 504. **프론트 역할 분기 없음**.

## 3. 데이터 계약 (types.ts 대조)

| 타입 | 필드 |
|---|---|
| `TermsType` | `id` · `label` |
| `TermsVersion` | `id` · `typeId` · `version`(표기) · `effectiveDate`(YYYY-MM-DD) · `status`(`active`\|`scheduled`\|`archived`) · `body` |

`status='active'` 가 현재 시행본(FS 의 '현재' 배지). 이력은 시행일 내림차순 정렬.

## 4. 엔드포인트 명세

### BE-013-EP-01 · 약관 종류 목록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-013-EL-001 · `GET /api/terms-types` · 권한 `admin`, `operator` · 멱등(GET) · 전량(종류 수가 작다) · 분당 60회 |

**응답 200** — `readonly TermsType[]`. **에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-013-EP-02 · 종류별 버전 이력
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-013-EL-005, EL-002 · `GET /api/terms?typeId=` · 권한 `admin`, `operator` · 멱등(GET) · 분당 120회 |

**쿼리**: `typeId`(필수). **정렬은 시행일 내림차순 고정**. 페이징 없음(종류당 버전 수가 작다). 검색(FS-013-EL-002)은 **클라이언트 필터**라 이 엔드포인트에 `keyword` 를 보내지 않는다. **응답 200** — `readonly TermsVersion[]`. **에러**: 400(`typeId` 누락·형식) · 401 · 403 · 404 `TERMS_TYPE_NOT_FOUND` · 429 · 500 · 504.

---

### BE-013-EP-03 · 버전 상세(전문)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-013-EL-014, EL-016, EL-026 · `GET /api/terms/:id` · 권한 `admin`, `operator`. 읽기 없음 → 404 은닉 |

**응답 200** — `TermsVersion`. 어댑터 404 → `Error('약관 버전을 찾을 수 없습니다')`. **에러**: 400 · 401 · 404 `TERMS_VERSION_NOT_FOUND` · 429 · 500 · 504.

---

### BE-013-EP-04 · 버전 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-013-EL-025(등록) · `POST /api/terms` · `admin` 만 · 비멱등 · 분당 20회 |

**바디**(`TermsVersionInput`): `typeId`(존재하는 종류) · `version`(1–20자) · `effectiveDate`(실재 날짜) · `status`(enum) · `body`(1–20000자, **서버 정제 §3 상속 = XSS**). **응답 201** — `TermsVersion`. 프론트 `createTermsVersion(...): Promise<void>`.

**현재 시행본 전이 (§4)**: `status='active'` 로 등록·수정하면 그 종류의 **기존 active 버전을 자동으로 archived 로 밀어낸다**(종류당 시행본은 1개). 이 규칙은 서버가 강제하며 프론트는 상태를 자유롭게 고를 뿐이다. **에러**: 400 `VALIDATION_FAILED`(`typeId`·`version`·`effectiveDate`·`status`·`body`) · 401 · 403 · 403 CSRF · 404 `TERMS_TYPE_NOT_FOUND` · 409 `VERSION_DUPLICATED`(같은 종류 안 버전 표기 중복 — §5) · 429 · 500 · 504.

---

### BE-013-EP-05 · 버전 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-013-EL-025(수정) · `PUT /api/terms/:id` · `admin` 만 · **멱등**(전체 치환) · 분당 20회 |

**바디**: `TermsVersionInput`. `status='active'` 전이 시 §4 규칙 적용. **에러**: 400 · 401 · 403 · 403 CSRF · 404 `TERMS_VERSION_NOT_FOUND` · 409 `VERSION_DUPLICATED` / `CONFLICT`(동시 수정) · 429 · 500 · 504.

---

### BE-013-EP-06 · 버전 삭제 (단건·일괄 공용)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-013-EL-005.7, EL-009, EL-010, EL-017 · `DELETE /api/terms/:id` · `admin` 만 · **멱등**(이미 삭제 → 204) · 분당 30회 |

일괄은 프론트 `settleAll` 병렬 DELETE. **현재 시행본 보호 (§4)**: `status='active'` 인 버전 삭제는 **422 `CANNOT_DELETE_ACTIVE`** 로 거절한다 — 고객에게 노출 중인 약관을 지우면 시행본이 사라진다. `message` = '시행 중인 버전은 삭제할 수 없습니다.' **에러**: 400 · 401 · 403 · 403 CSRF · 404 `TERMS_VERSION_NOT_FOUND`(존재한 적 없는 id만) · 422 `CANNOT_DELETE_ACTIVE` · 429 · 500 · 504.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 종류 목록 | N/A — 파라미터 없음 | 401 → 사이드바 빈다(FS-013-EL-001 실패) | **403** 컬렉션 | N/A — 0개면 빈 배열 | N/A 읽기 전용 | N/A | 429 분당 60 | 500 + `traceId`. 프론트 전용 재시도 없음(§7) | 5초 → 504 |
| EP-02 이력 | `typeId` 누락·형식 → 400 | 401 → FS-013-EL-008 | **403** 컬렉션 | 404 `TERMS_TYPE_NOT_FOUND`(없는 종류) | N/A 읽기 전용 | N/A | 429 분당 120 | 500 + `traceId` → FS-013-EL-008 | 5초 → 504 |
| EP-03 상세 | id 형식 | 401 → FS-013-EL-016 | 읽기 없음 → **404 은닉** | 404 `TERMS_VERSION_NOT_FOUND` → '약관 버전을 찾을 수 없습니다' | N/A | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-04 등록 | `version`·`effectiveDate`·`body`·`status` → `error.fields`. 프론트 `termsVersionSchema` 자체 검증 | 401 → FS-013-EL-019 | **403** 컬렉션 쓰기 | 404 `TERMS_TYPE_NOT_FOUND`(없는 종류) | **409 `VERSION_DUPLICATED`** 같은 종류 표기 중복(§5) | N/A(등록 시 active 전이는 기존을 archived 로 밀 뿐 거절 아님) | 429 분당 20 | 500 → FS-013-EL-019, 입력 유지 | 5초 → 504 |
| EP-05 수정 | 위 + id | 401 → FS-013-EL-019 | `operator` → **403** / 읽기 없음 → **404** | 404 `TERMS_VERSION_NOT_FOUND` | **409** `VERSION_DUPLICATED` 또는 `CONFLICT`(동시 수정, 마지막 쓰기 승리) | N/A | 429 | 500 + `traceId` | 5초 → 504 |
| EP-06 삭제 | id 형식 | 401 → 다이얼로그 배너(FS-013-EL-009.1) | `operator` → **403** / 읽기 없음 → **404** | 404 = 존재한 적 없는 id만. **이미 삭제 204** | N/A DELETE 멱등 | **422 `CANNOT_DELETE_ACTIVE`** 시행 중 버전 보호(§4) | 429 분당 30 | 500 → 단건 배너 / 일괄 부분 실패 건수 | 5초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `fetchTermsTypes(signal)` | `GET /api/terms-types` | EP-01 | `TermsType[]` | O |
| `fetchTermsVersions(typeId, signal)` | `GET /api/terms?typeId=` | EP-02 | `TermsVersion[]` | O |
| `fetchTermsVersion(id, signal)` | `GET /api/terms/:id` | EP-03 | `TermsVersion`(404 변환) | O |
| `createTermsVersion(input, signal?)` | `POST /api/terms` | EP-04 | `void`(201) | O |
| `updateTermsVersion(id, input, signal?)` | `PUT /api/terms/:id` | EP-05 | `void` | O |
| `deleteTermsVersion(id, signal?)` | `DELETE /api/terms/:id` | EP-06 | `void`(204, 422 시행중) | O |

**어댑터 본문 요구사항(시그니처 불변)**: 쓰기 함수 전부 `X-CSRF-Token` · `fetchTermsVersion` 404 → `Error('약관 버전을 찾을 수 없습니다')`.

## 7. 핵심 판정

### 7.1 일괄 삭제 — 전용 엔드포인트 없음
프론트 `settleAll` 로 단건 멱등 DELETE(EP-06) 병렬 호출·부분 실패 집계. BE-009 §7.1 근거.

### 7.2 본문 XSS — 서버가 저장 시 정제한다 【보안 판정】
약관 조문은 관리자 입력이며 **고객에게 법적 효력을 갖는 문서로 노출**된다. 관리자 화면은 pre-wrap 텍스트로만 렌더하지만(FS-013-EL-014), 고객 렌더가 HTML 이면 저장형 XSS 가 된다. BE-009 §7.3 판정을 상속 — 서버가 저장 시 위험 마크업·스킴·핸들러를 제거하고, 계약은 '저장된 조문에 실행 가능한 스크립트가 없다'는 관측 동작만 정한다. **다만 약관은 법적 문서이므로 정제가 조문의 의미를 바꾸지 않도록** 허용 태그를 보수적으로 두고, 정제 전후 차이가 있으면 감사 로그에 남긴다.

### 7.3 종류(type) 쓰기 없음
약관 종류는 서버 시드/설정이며 이 계약에 생성/삭제 진입점이 없다(FS 에 종류 관리 UI 가 없다). 종류가 늘면 서버 설정으로 추가된다.

### 7.4 현재 시행본 보호 — 시행 중 버전은 삭제 불가, active 는 종류당 1개 【정합 판정】
`status='active'` 버전은 고객에게 노출 중인 시행본이다. ① **삭제 거절**(EP-06, 422 `CANNOT_DELETE_ACTIVE`) — 시행본이 사라지면 고객에게 보여줄 약관이 없어진다. ② **종류당 active 1개 강제**(EP-04·EP-05) — 새 버전을 active 로 만들면 기존 active 를 archived 로 자동 전이한다. 프론트에 이 규칙이 없으므로(상태를 자유롭게 고름) 서버가 강제한다. `scheduled` 버전은 `effectiveDate` 도달 시 서버가 active 로 승격하고 기존 active 를 archived 로 민다(§7.6 미결 — 자동 승격 스케줄러).

### 7.5 버전 표기 중복 — 같은 종류 안 유니크(409)
같은 종류 안에서 버전 표기(정규화)가 중복되면 이력 표(FS-013-EL-005.4)가 두 버전을 구분하지 못한다. 409 `VERSION_DUPLICATED` 로 막는다. 다른 종류면 허용(소비 화면이 다르다).

### 7.6 후속 이관
| # | 내용 | 이관 |
|---|---|---|
| 1 | 종류 목록 조회 실패 시 프론트 전용 재시도 배너 없음 | UI 기획 |
| 2 | `scheduled` → `active` 자동 승격 스케줄러의 관측 계약 상세 미확정 | 백엔드 명세 |
| 3 | 401 감지·리다이렉트·프론트 타임아웃 상한 없음 | UI 기획 · 프론트 구현 |
| 4 | 수정 동시성 — 마지막 쓰기 승리 | 백엔드 명세 · UI 기획 |
| 5 | 같은 시행일 두 버전의 우선순위 규칙(어느 것이 시행본인가) 미정 | 백엔드 명세 |

### 7.7 게시(시행) 권한 서버 판정 【보안 판정】
버전을 `active`/`scheduled` 로 만드는 것(=고객 노출)은 **서버가 역할로 판정**한다. `operator` 는 쓰기 403 이라 시행본을 만들 수 없고 `admin` 만 가능하다. 프론트 역할 분기 없음 → 서버 전담.

## 8. 자기 점검
- [x] FS-013 §5 요소가 전부 엔드포인트로 커버됐다 — 누락 0건 (6 엔드포인트)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 (6행 × 9열)
- [x] 에러 봉투·권한 모델 BE-003 상속 선언
- [x] 멱등성 판정 — GET 조회 / 삭제·수정 멱등 / 등록 비멱등
- [x] 보안·정합 판정(본문 XSS §7.2 · 현재 시행본 보호 §7.4 · 시행 권한 §7.7)을 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
