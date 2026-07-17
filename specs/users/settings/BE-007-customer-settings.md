---
id: BE-007
title: "고객 설정 (회원 등급 정책) 백엔드 기능 명세"
functionalSpec: FS-007
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-007. 고객 설정 (회원 등급 정책) 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-007 고객 설정 (`/users/settings`) |
| 범위 | 회원 등급 정책 조회, 등급 정책 저장(승급 조건·할인율·집계 기간·강등 허용·재계산 시점) 및 **서버 측 규칙 재검증** |
| 범위 밖 | **등급 분포 미리보기 계산** — 프론트가 브라우저 회원 데이터로 계산한다(FS-007 §7 #2). **실제 등급 재산정** — 저장한 정책으로 회원 등급을 실제로 다시 매기는 배치·트리거는 회원/주문 도메인의 관심사이며 이 계약의 범위 밖이다(§7.3) |
| 전제 | 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 쓰기는 `X-CSRF-Token` 필수. 응답 본문은 `application/json; charset=utf-8` |
| 프론트 어댑터 | `apps/admin/src/pages/customer-settings/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/customer-settings/types.ts` (`TierPolicy` · `TierRules` · `AggregationPeriod` · `RecalcTrigger`) |
| 검증 규칙 | `apps/admin/src/pages/customer-settings/validation.ts` (zod `tierPolicySchema`) — **서버가 같은 규칙을 재구현한다**(§7.1) |

## 2. 공통 에러 봉투

모든 4xx / 5xx 응답은 BE-003 §2 와 동일한 봉투를 따른다.

```json
{
  "error": {
    "code": "TIER_THRESHOLD_NOT_ASCENDING",
    "message": "VVIP 승급 조건은 VIP 승급 조건보다 커야 합니다.",
    "fields": [{ "name": "vvip-threshold", "code": "NOT_ASCENDING", "message": "VIP 승급 조건보다 커야 합니다." }],
    "traceId": "01J8X4K2M9P7Q3R5S6T8V0W2Y4"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `error.code` | string | O | 기계 판정용 에러코드 |
| `error.message` | string | O | 사용자 노출 가능 문구. **내부 정보 노출 금지** |
| `error.fields` | array \| null | X | 400/422 검증 실패 시. `name` 은 **화면 필드 id 와 일치**(`<tier>-threshold` \| `<tier>-discount`) — 프론트가 표 안 인라인 에러(FS-007-EL-001.4)로 짚을 수 있게 |
| `error.traceId` | string | O | 로그 상관관계 ID |

### 2.1 공통 에러코드

| HTTP | 에러코드 | 발생 조건 | 프론트 처리 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 형식 위반(정수 아님·범위 밖·enum 밖) | `error.fields` 를 표 칸에 매핑 |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 | `/login?returnUrl=` (현재 프론트 미구현 — §7.4) |
| 403 | `FORBIDDEN` | 고객 설정 권한 부족 · CSRF 실패 | 조회는 FS-007-EL-008, 저장은 FS-007-EL-005.3 |
| 422 | `UNPROCESSABLE` | 형식은 맞으나 정책 규칙 위반(승급 조건 비단조) | 저장 실패 배너(FS-007-EL-005.3) |
| 429 | `RATE_LIMITED` | 레이트리밋 초과 | 재시도 안내 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | 일반 문구 + `traceId` |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 상한 초과 | 500 과 동일 |

## 3. 인증 · 권한 모델

### 3.1 역할

| 역할 | 설명 | 비고 |
|---|---|---|
| 고객 설정 리소스 `update` 권한 보유 | 등급 정책을 조회·저장할 수 있다 | 정책 변경은 전 회원의 등급·할인율을 움직이므로 민감하다 |
| 고객 설정 리소스 `read` 권한만 | 정책 조회만. 저장(EP-02)은 **403** | 프론트에 role 분기 없음 — 화면은 편집 컨트롤을 보여주되 서버가 저장을 거절 |
| 고객 설정 read 권한 없음 | `/users/settings` 리소스 접근 불가 | `GET /api/member-tiers` → 403 (§3.2) |

### 3.2 403 vs 404 은닉 정책

| 리소스 | 권한 부족 시 응답 | 근거 |
|---|---|---|
| `GET /api/member-tiers` (단일 정책 리소스) | 403 `FORBIDDEN` | 등급 정책은 **하나뿐인 설정 리소스**다. 열거할 개별 id 가 없고 존재가 비밀이 아니다 |
| `PUT /api/member-tiers` | 403 `FORBIDDEN` | 위와 동일. 은닉할 개별 리소스가 없다 |

이 도메인에는 개별 리소스 id 가 없어 404 은닉이 성립하지 않는다.

### 3.3 CSRF · 3.4 타임아웃

- **CSRF**: `PUT /api/member-tiers` 는 `X-CSRF-Token` 필수. 누락·불일치 시 403.
- **타임아웃**: 조회·저장 서버 처리 상한 5초 → 초과 시 504. 프론트 권고 상한 10초(현재 상한 없음 — §7.4).

## 4. 엔드포인트 명세

### BE-007-EP-01 · 등급 정책 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-007-EL-001, FS-007-EL-002, FS-007-EL-008, FS-007-EL-008.1 |
| 메서드 · 경로 | `GET /api/member-tiers` |
| 권한 | 고객 설정 리소스 `read` |
| 멱등성 | 멱등 (GET). 재시도 안전. FS-007-EL-008.1('다시 시도')은 같은 요청을 다시 보낸다 |
| 페이징 | N/A — 단일 정책 리소스 |
| 레이트리밋 | 관리자당 분당 60회 |

**응답 200** — `TierPolicy`

```json
{
  "rules": {
    "normal": { "threshold": 0, "discountPercent": 0 },
    "vip": { "threshold": 1000000, "discountPercent": 3 },
    "vvip": { "threshold": 5000000, "discountPercent": 5 }
  },
  "period": "all",
  "allowDemotion": false,
  "recalcTrigger": "order-completed"
}
```

| 필드 | 타입 (types.ts) | 설명 |
|---|---|---|
| `rules` | `TierRules` = `Record<'normal'\|'vip'\|'vvip', { threshold: number, discountPercent: number }>` | 등급별 승급 조건(누적 구매금액, 0 이상 정수) + 할인율(0~100 정수). **`normal.threshold` 는 항상 0** (기본 등급 — 정책이 아니라 정의) |
| `period` | `AggregationPeriod` | `all` \| `last-12m` \| `last-6m` |
| `allowDemotion` | boolean | true 면 조건 미달 시 강등 |
| `recalcTrigger` | `RecalcTrigger` | `order-completed` \| `daily` \| `monthly` |

- 서버는 저장된 정책이 없으면 기본 정책을 내려준다. `rules` 는 세 등급이 항상 채워지며 승급 조건이 등급 오름차순으로 단조 증가한다(저장 시 §7.1 이 보장).

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | 고객 설정 read 권한 부족 (§3.2) |
| 429 | `RATE_LIMITED` | 분당 60회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

---

### BE-007-EP-02 · 등급 정책 저장

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-007-EL-004.1, FS-007-EL-005.1 |
| 메서드 · 경로 | `PUT /api/member-tiers` |
| 권한 | 고객 설정 리소스 `update` |
| 멱등성 | **멱등** (PUT — 정책 전체를 통째로 대체). 같은 바디 재요청은 같은 상태. FS-007-EL-005.1 재클릭(재시도)이 안전하다 |
| 페이징 | N/A — 단건 저장 |
| 레이트리밋 | 관리자당 분당 20회 |

**요청 — 바디** (`TierPolicy`)

| 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|
| `rules.normal` · `rules.vip` · `rules.vvip` | `{ threshold, discountPercent }` | O | `threshold` 0 이상 정수(`normal` 은 0 강제), `discountPercent` 0~100 정수 |
| `period` | `AggregationPeriod` | O | `all` \| `last-12m` \| `last-6m` |
| `allowDemotion` | boolean | O | — |
| `recalcTrigger` | `RecalcTrigger` | O | `order-completed` \| `daily` \| `monthly` |

- **승급 조건 단조 증가**: `vip.threshold > normal.threshold(0)` 이고 `vvip.threshold > vip.threshold` 여야 한다. 위반 시 422 `TIER_THRESHOLD_NOT_ASCENDING`.
- **할인율 역전은 거절하지 않는다**: 상위 등급 할인율이 하위보다 낮아도 저장한다 — 프론트가 경고(FS-007-EL-001.5)만 띄우고 저장을 허용하는 것과 일치한다(§7.2). 서버가 이를 422 로 바꾸면 지금까지 저장되던 정책이 거부된다.

**응답 200** — 저장된 `TierPolicy`(EP-01 과 동일 스키마). 프론트 `saveTierPolicy(...): Promise<void>` 는 본문을 쓰지 않지만, 표준 반환으로 저장 결과를 되돌린다.

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `threshold`·`discountPercent` 가 정수 아님·범위 밖, `period`·`recalcTrigger` enum 밖. `error.fields[].name` = `<tier>-threshold` \| `<tier>-discount` |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | 고객 설정 update 권한 부족 |
| 403 | `CSRF_TOKEN_INVALID` | `X-CSRF-Token` 누락·불일치 |
| 422 | `TIER_THRESHOLD_NOT_ASCENDING` | 승급 조건이 등급 오름차순으로 커지지 않는다 |
| 429 | `RATE_LIMITED` | 분당 20회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

- 프론트는 제출 전 같은 규칙을 zod 로 검증하므로(FS-007-EL-004.1) 정상 흐름에서 400·422 는 발생하지 않는다. 도달 시 저장 실패 배너(FS-007-EL-005.3)로 표시된다. 프론트가 코드별 문구를 분기하지 않으므로 §7.4 에 변경 요청 로 기록한다.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| BE-007-EP-01 정책 조회 | N/A — 요청 파라미터가 없다 | 401 `UNAUTHENTICATED`. 프론트는 FS-007-EL-008 배너(세션 만료 감지 미구현 — §7.4) | **403** — 단일 설정 리소스, 존재가 비밀이 아니다 (§3.2) | N/A — 정책은 항상 존재한다(없으면 기본값) | N/A — 읽기 전용이라 충돌이 없다 | N/A — 조회에 상태 전제가 없다 | 429 + `Retry-After`. 분당 60회 | 500 + `traceId`. 프론트는 FS-007-EL-008 + FS-007-EL-008.1 재시도 | 서버 5초 → 504. 프론트 권고 10초 |
| BE-007-EP-02 정책 저장 | `threshold`·`discountPercent`·`period`·`recalcTrigger` 위반 시 `fields` 에 화면 필드 id 를 담아 400 | 401 `UNAUTHENTICATED`. 프론트는 FS-007-EL-005.3 배너 | **403** — 단일 리소스, 은닉할 개별 리소스가 없다. update 부족 → 403. CSRF → 403 | N/A — 저장 대상이 항상 존재한다(PUT 전체 대체) | N/A — PUT 멱등·전체 대체라 병합 충돌이 없다. **마지막 저장이 이긴다**(§7.5 — 낙관적 잠금 없음) | **422 `TIER_THRESHOLD_NOT_ASCENDING`** — 승급 조건 비단조. 할인율 역전은 422 가 아니다(§7.2) | 429 + `Retry-After`. 분당 20회 | 500 + `traceId`. 다이얼로그를 연 채 버튼 재활성(FS-007-EL-005.1 실패 열) | 서버 5초 → 504. 프론트 권고 10초. 프론트는 요청 중 저장 버튼 비활성으로 중복 제출 차단 |

## 6. 프론트 연동 대조

| data-source.ts 함수 시그니처 | TODO(backend) 주석 | 엔드포인트 | 요청 타입 | 응답 타입 (types.ts) | 필드 일치 |
|---|---|---|---|---|---|
| `fetchTierPolicy(signal: AbortSignal): Promise<TierPolicy>` | `GET /api/member-tiers` | BE-007-EP-01 | 없음 | `TierPolicy` | O |
| `saveTierPolicy(policy: TierPolicy, signal?: AbortSignal): Promise<void>` | `PUT /api/member-tiers` (422 → 규칙 위반 / 200 → 저장된 정책) | BE-007-EP-02 | `TierPolicy` | `void` (200 본문 미사용) | O |

### 6.1 어댑터 함수 본문에 요구되는 사항 (시그니처 불변)

| 요구사항 | 대상 함수 | 내용 |
|---|---|---|
| CSRF 헤더 | `saveTierPolicy` | `X-CSRF-Token` 헤더를 싣는다 (§3.3) |
| 실패 경로 스위치 제거 | `fetchTierPolicy` · `saveTierPolicy` | 개발용 `?fail=` 쿼리 스위치(`failIfRequested`)는 HTTP 호출로 교체할 때 함께 제거된다 |

## 7. 핵심 판정 (근거를 남긴다)

### 7.1 서버가 정책 규칙을 재검증한다 — 프론트 검증은 보증이 아니다

`saveTierPolicy` 주석이 명시하듯 **프론트 zod 검증은 UX 이지 보증이 아니다.** 서버는 `PUT /api/member-tiers` 에서 같은 규칙을 다시 판정한다: ① `threshold`·`discountPercent` 가 정수·범위 안인가(400) ② 승급 조건이 등급 오름차순으로 단조 증가하는가(422 `TIER_THRESHOLD_NOT_ASCENDING`) ③ `normal.threshold==0` 강제. 프론트를 우회한 직접 호출이 모순된 정책을 저장하면 전 회원의 등급 산정이 깨진다.

### 7.2 할인율 역전은 저장을 막지 않는다 — 경고와 에러의 경계를 서버도 지킨다

프론트는 '등급이 오르는데 할인율이 작아짐' 을 **경고**로만 띄우고 저장을 허용한다(FS-007-EL-001.5 · `policyWarnings`). 서버도 이를 422 로 바꾸지 않는다 — 정책상 가능한 값이고(예: VIP 는 할인, VVIP 는 포인트 적립 중심), 지금까지 저장되던 정책을 갑자기 거부하면 동작 변경이다. 서버가 막는 것은 **에러(비단조 승급 조건·형식 위반)뿐**이다.

### 7.3 등급 재산정은 이 계약의 범위 밖이다

저장한 정책으로 **실제 회원 등급을 다시 매기는** 작업(재계산 시점 `recalcTrigger` 에 따른 배치·주문 완료 트리거)은 회원/주문 도메인의 관심사다. 이 문서는 **정책의 저장**만 계약하며, `recalcTrigger`·`period`·`allowDemotion` 은 그 재산정 배치가 읽는 파라미터로 저장될 뿐이다. FS-007 의 분포 미리보기(FS-007-EL-003)도 서버가 계산하지 않는다 — 프론트가 브라우저 회원 데이터로 근사한다(FS-007 §7 #2). 서버 집계 미리보기가 필요하면 별도 조회 엔드포인트로 승격한다.

### 7.4 후속 이관 (UI 기획 · 프론트 구현 · 백엔드 명세)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 401 감지 후 `/login?returnUrl=` 이동이 프론트에 없다 (FS-007 §4.1) | UI 기획 · 프론트 구현 |
| 2 | 프론트 요청 타임아웃 상한이 없다. 권고: 조회·저장 10초 (§3.4) | UI 기획 · 프론트 구현 |
| 3 | 저장 실패 문구가 코드별로 갈리지 않는다 — 400/422/403/500 이 같은 배너 문구로 표시된다. 규칙 위반(422)은 어느 칸이 문제인지 `fields` 로 짚을 수 있어야 한다 | UI 기획 쪽 변경 요청 |
| 4 | **해소됨(2026-07-17 재확인)** — 저장 성공 시 프론트가 정책 쿼리를 무효화해 재조회한다(`customer-settings/queries.ts:33-35`). 서버는 `PUT` 응답으로 정본 정책을 돌려주고, 프론트는 그와 별개로 재조회해 값을 다시 심는다 (FS-007 §7 #6) | ~~UI 기획 / 백엔드 명세~~ (종결) |
| 5 | 분포 미리보기가 브라우저 픽스처로 계산되고 집계 기간을 무시한다 (FS-007 §7 #2·#3) — 서버 집계 미리보기 승격 여부 | 아키텍처 · 백엔드 명세 |

### 7.5 저장은 전체 대체(PUT) — 마지막 저장이 이긴다

`PUT /api/member-tiers` 는 정책을 통째로 대체한다. 두 관리자가 동시에 저장하면 마지막 저장이 이긴다(낙관적 잠금 없음). 근거: 정책은 단일 리소스이고 저장이 드문 관리 작업이라 ETag 의 복잡성이 이득을 넘지 않는다. 동시 편집이 실제 문제가 되면 ETag 를 별도 계약으로 승격한다(FS-007 §7 #5).

## 8. 자기 점검 (제출 전 확인)

- [x] FS-007 §5 의 서버 연동 요소가 **전부** 엔드포인트로 커버됐다 — 누락 0건 (§9)
- [x] 모든 엔드포인트가 `근거 (FS)` 에 FS 요소 번호를 역참조한다 — 고아 엔드포인트 0건 (2/2)
- [x] §5 예외 9축에 빈칸 0건. 모든 `N/A` 에 사유가 붙어 있다 (2행 × 9열 전수)
- [x] §2 공통 에러 봉투를 1회 정의했고, 각 엔드포인트는 에러코드 목록만 나열한다
- [x] §3.2 403 vs 404 은닉 정책이 명시됐고 §5 와 모순되지 않는다 (단일 리소스라 404 은닉 없음)
- [x] §6 에서 `data-source.ts` 의 모든 export 함수(2개)가 매핑됐다. 필드명·타입 불일치 0건
- [x] 쓰기 엔드포인트의 멱등성을 판정했다 (EP-02 멱등·전체 대체)
- [x] 500 응답 문구에 내부 정보가 없다
- [x] **서버 코드·저장소 설계를 쓰지 않았다** — 데이터 모델은 응답 스키마로만 드러난다
- [x] **서버 재검증**(승급 조건 단조 증가·형식)을 §7.1 에 명시했다
- [x] 모호어 0건 — G9 #10 금지어 목록을 본문에서 1건도 쓰지 않았다

## 9. FS-007 §5 커버리지

| FS §5 요소번호 | 이름 | 커버 엔드포인트 |
|---|---|---|
| FS-007-EL-001 / FS-007-EL-002 | 등급 정책 조회 | BE-007-EP-01 |
| FS-007-EL-004.1 / FS-007-EL-005.1 | 등급 정책 저장 | BE-007-EP-02 |
| FS-007-EL-008 / FS-007-EL-008.1 | 조회 실패 배너와 재시도 | BE-007-EP-01 (같은 요청 재전송 — 멱등) |

**누락 0건.** FS-007 §5 의 3개 행이 2개 엔드포인트로 전부 커버된다.
