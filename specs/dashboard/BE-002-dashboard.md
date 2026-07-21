---
id: BE-002
title: "대시보드 백엔드 기능 명세"
functionalSpec: FS-002
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-002. 대시보드 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-002 대시보드 (`/dashboard`) |
| 범위 | 읽기 전용 조회 2건 — (1) 업무 탭(상품·문의·영업)별 데이터(오늘의 할일 + 리스트 카드 2장), (2) 기간(일·주·월)별 통계(방문자 계열 + 기간별 분석 표 + 합계 행). 두 조회 모두 **서버가 위젯 권한을 재판정**한다(§3.4) |
| 범위 밖 | (1) 기능 권한(feature key) 조회·변경 엔드포인트 — FS-002 §5에 서버 연동 요소가 없다(EL-007 · EL-042는 브라우저 저장소 판정). 판단과 후속 경로는 §7.1. (2) 쓰기 요청 — 이 화면은 읽기 전용이다(FS-002 §4.1 '중복 제출'). (3) 사이드바 메뉴 구성 — 정적 구성(`nav-config`)이며 서버가 내려주지 않는다. (4) 헤더의 로그인 계정 표시(FS-002-EL-011) — 현재 구현이 상수값이며 `[서버]` 요소가 아니다 |
| 전제 | 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. **두 엔드포인트 모두 유효한 세션 자격 증명을 요구한다** — 자격 증명의 전달 방식(HttpOnly 쿠키 vs `Authorization` 헤더)은 BE-001 §7.1의 미확정 항목이며 아키텍처 판정 대상이다. 401 판정은 전달 방식과 무관하게 '유효한 자격 증명 없음'으로 성립한다 |
| 프론트 어댑터 | `apps/admin/src/pages/dashboard/api.ts` (`fetchTabData`, `ApiError`) · `apps/admin/src/pages/dashboard/stats-api.ts` (`fetchStats`) |
| 도메인 타입 | **전송 타입은 손으로 쓰지 않는다** — `openapi/openapi.yaml`(그 원천이 이 문서다)에서 `pnpm openapi:types` 가 생성한 `components['schemas']` 를 그대로 참조한다(ADR-0008 §3.5). `types.ts:40-41` (`ListCardData`, `TabData`) · `stats-types.ts:30-33` (`VisitorPoint`, `PeriodRow`, `PeriodSummary`, `StatsData`) — 전부 `DeepReadonly<…>` 로 감싼다. 화면 전용 개념만 손으로 남는다: `types.ts:6,18,24` (`TabId`, `TABS`, `DEFAULT_TAB`) · `stats-types.ts:6,13,19` (`StatsRange`, `STATS_RANGES`, `DEFAULT_STATS_RANGE`). `TodoItem`·`ListRow` 는 **별도 별칭이 없다** — `ListRow` 는 `ListCardData.rows` 안에서만 쓰이므로 별칭을 두지 않는다(`types.ts:37`). 스키마가 바뀌면 재생성만으로 따라오고 어긋나면 `tsc` 가 깨진다 |
| 권한 키 원천 | `apps/admin/src/shared/permissions/feature-registry.ts` (`FeatureKey` — `dashboard.tab.products` · `dashboard.tab.inquiries` · `dashboard.tab.sales` · `dashboard.todo` · `dashboard.lists` · `dashboard.stats.visitors` · `dashboard.stats.period`) |

## 2. 공통 에러 봉투

모든 4xx / 5xx 응답은 아래 봉투를 따른다. 예외 없다. 엔드포인트별로 다른 응답 형식을 정의하지 않는다.

```json
{
  "error": {
    "code": "WIDGET_FORBIDDEN",
    "message": "이 항목을 조회할 권한이 없습니다.",
    "fields": null,
    "details": { "requiredKeys": ["dashboard.todo", "dashboard.lists"] },
    "traceId": "01J8X4K2M9P7Q3R5S6T8V0W2Y4"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `error.code` | string | O | 기계 판정용 에러코드 (SCREAMING_SNAKE_CASE). 프론트 분기의 유일한 근거 |
| `error.message` | string | O | 사용자에게 그대로 보여줄 수 있는 문구. **내부 정보(스택·쿼리·경로) 노출 금지** |
| `error.fields` | array \| null | O (없으면 `null`) | 400 검증 실패 시에만 채운다. 원소 = `{ name, code, message }` |
| `error.details` | object \| null | O (없으면 `null`) | 코드별 부가 데이터. **키 집합은 `error.code` 마다 §4의 에러 목록이 확정한다.** 봉투 구조 자체는 바뀌지 않는다 |
| `error.traceId` | string | O | 로그 상관관계 ID. 500 문의 시 사용자가 그대로 전달한다 |

`error.fields[]` 의 `code` 값은 `REQUIRED` · `INVALID_FORMAT` · `OUT_OF_RANGE` 3종으로 한정한다.

### 2.1 공통 에러코드

전 엔드포인트에서 발생할 수 있는 코드다. 엔드포인트 고유 코드는 §4의 '에러 목록'에 기술한다.

| HTTP | 에러코드 | 발생 조건 | 프론트 처리 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 요청 파라미터가 제약(열거값) 위반 | `error.fields` 를 매핑. 정상 경로에서는 발생하지 않는다(§4 각 엔드포인트) |
| 401 | `UNAUTHENTICATED` | 유효한 세션 자격 증명 없음·만료 | **현재 프론트에 401 처리 경로가 없다** — `ApiError` 로 흡수되어 FS-002-EL-041 / EL-035 · EL-040 로 표시된다. 기대 동작(`/login?reason=session_expired` 이동)과의 차이는 §7.2-1 |
| 403 | `FORBIDDEN` | 인증됐으나 역할 부족 (§3.1) | `ApiError` → FS-002-EL-041 / EL-035 · EL-040 |
| 429 | `RATE_LIMITED` | 레이트리밋 초과. `Retry-After` 헤더(초)를 함께 반환 | `ApiError` → 동일 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | 일반 문구 + `traceId`. **원인 노출 금지** |
| 504 | `UPSTREAM_TIMEOUT` | 서버 처리 상한(3초) 초과 | `ApiError` → 동일 |

## 3. 인증 · 권한 모델

### 3.1 역할

| 역할 | 설명 | 대시보드 조회 권한 |
|---|---|---|
| `system_admin` | 시스템 관리자. 전체 기능 + 기능 권한(feature key) 설정 변경 | BE-002-EP-01 · EP-02 호출 가능 |
| `operator` | 운영자. 업무 데이터 조회·처리 | BE-002-EP-01 · EP-02 호출 가능 |
| `viewer` | 조회 전용 사용자 | BE-002-EP-01 · EP-02 호출 가능 (대시보드는 읽기 전용이므로 세 역할 모두 허용한다) |

역할 값의 원천은 BE-001-EP-01 의 `session.role` 이다 (FS-001 §1의 역할 3종). 대시보드에는 쓰기 요청이 없으므로 **역할만으로 거부되는 경로가 없다** — 실제 접근 제어는 §3.4의 **기능 권한 키**가 수행한다.

### 3.2 403 vs 404 은닉 정책

| 리소스 | 권한 부족 시 응답 | 근거 |
|---|---|---|
| `GET /api/dashboard/tabs/{tab}` | **403 `TAB_FORBIDDEN`** | 탭 3종(`products` · `inquiries` · `sales`)은 **고정 열거값**이며 존재가 비밀이 아니다(FS-002-EL-013 · EL-013.1 · EL-013.2 에 라벨까지 공개돼 있다). 404 로 숨기면 정당한 운영자가 권한 문제를 인지하지 못하고 '데이터 없음'과 혼동한다 |
| `GET /api/dashboard/tabs/{tab}` — 할일·리스트 권한이 **둘 다** 없음 | **403 `WIDGET_FORBIDDEN`** | 응답에 담을 데이터가 하나도 없다. 프론트는 이 상태에서 요청을 발행하지 않으므로(FS-002-EL-042) 정상 경로에서 발생하지 않는다 — 직접 호출 방어다 |
| `GET /api/dashboard/tabs/{tab}` — 할일·리스트 중 **한쪽만** 없음 | **200 + 부분 소거** (403 아님) | 복합 조회다. 한 위젯 권한이 없다고 응답 전체를 403 으로 막으면 **권한이 있는 나머지 위젯의 데이터까지 잃고** 프론트가 FS-002-EL-041 실패 배너를 띄운다(오탐). 소거 규칙은 §4 BE-002-EP-01 |
| `GET /api/dashboard/stats` | **403 `WIDGET_FORBIDDEN`** (방문자·기간별 분석 권한이 **둘 다** 없을 때) | 단일 컬렉션이며 존재가 비밀이 아니다. 한쪽만 없으면 200 + 부분 소거 |
| 두 엔드포인트 공통 | **404 를 사용하지 않는다** | 단건 리소스 식별자가 없는 컬렉션 조회다. 데이터 0건은 빈 배열(200)이지 404 가 아니다(FS-002-EL-025 · EL-037 빈 상태) |

### 3.3 요약 — 이 계약의 상태코드 사용 규칙

- **404 는 어떤 조건에서도 반환하지 않는다.**
- **403 은 권한 부족의 유일한 표현**이며, 존재 은닉을 목적으로 하지 않는다.
- **열거값 밖의 `tab` · `range` 는 400** 이다 (404 가 아니다 — §4 각 엔드포인트).

### 3.4 기능 권한의 보안 경계 — 서버가 판정한다

현재 위젯 권한(`dashboard.*` 7종)은 **프론트 `localStorage` 에만 존재한다**
(`apps/admin/src/shared/permissions/PermissionProvider.tsx` — `STORAGE_KEY = 'tds-admin.permissions'`, `loadPermissions()` / `savePermissions()`).

**브라우저 저장소의 권한 값은 보안 경계가 아니다.** 사용자가 개발자 도구로 값을 바꾸거나 API 를 직접 호출하면 우회된다.
따라서 백엔드 연동 후의 권한 판정을 아래로 확정한다.

| # | 규칙 |
|---|---|
| 1 | **서버가 호출자의 기능 권한을 재판정한다.** BE-002-EP-01 · EP-02 는 요청자의 서버 측 권한을 기준으로 응답 데이터를 구성한다. 프론트가 보낸 권한 정보(있더라도)를 신뢰하지 않는다 — 요청 파라미터에 권한 키를 받지 않는 이유가 이것이다 |
| 2 | **프론트 권한(localStorage)의 역할은 표시 최적화로 축소된다.** 꺼진 위젯을 렌더하지 않고 그 위젯을 위한 조회를 발행하지 않는 규칙(FS-002-EL-042)은 유지되지만, 이것은 **접근 제어가 아니라 요청 절감**이다 |
| 3 | **권한 없는 위젯의 데이터는 응답에 담지 않는다.** 프론트가 렌더하지 않는다는 이유로 서버가 데이터를 내려보내면, API 직접 호출로 유출된다. 소거는 서버가 수행한다(§4) |
| 4 | **서버 권한과 프론트 권한이 어긋날 수 있다.** 프론트가 ON 으로 알고 요청했는데 서버가 OFF 로 판정하면 403 이 오고, 프론트는 이를 조회 실패(FS-002-EL-041 / EL-035 · EL-040)로 표시한다 — 사용자에게는 '권한 없음'이 아니라 '오류'로 보인다. **이 불일치를 없애려면 권한을 서버에서 조회해야 한다**(§7.1) |

## 4. 엔드포인트 명세

### BE-002-EP-01 · 탭 데이터 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-002-EL-014 (탭 패널 — 탭 데이터 조회. FS-002 §5의 `[서버]` 요소). 응답 구성 근거: FS-002-EL-018 · FS-002-EL-019 (할일 항목·건수) · FS-002-EL-021 · FS-002-EL-022 · FS-002-EL-023 · FS-002-EL-024 · FS-002-EL-024.1 (리스트 카드 2장·카운트·행·아이콘). 권한 소거 근거: FS-002-EL-042 |
| 메서드 · 경로 | `GET /api/dashboard/tabs/{tab}` |
| 권한 | `system_admin` · `operator` · `viewer` (§3.1) + 기능 권한 키 `dashboard.tab.{tab}` · `dashboard.todo` · `dashboard.lists` (§3.4) |
| 멱등성 | 멱등 (GET). 재시도 안전. 서버 상태를 바꾸지 않으므로 abort 된 요청이 부작용을 남기지 않는다 |
| 페이징 | **없다.** 응답 행 수가 계약 상한으로 고정되며(아래 상한 규칙) 프론트에 페이징·가상화 UI 가 없다(FS-002-EL-024 대량: "받은 행을 페이징·가상화 없이 전부 렌더한다") |

**요청 — 경로**

| 이름 | 타입 | 필수 | 제약 | 설명 |
|---|---|---|---|---|
| `tab` | string | O | `products` \| `inquiries` \| `sales` (프론트 `TabId`) | 활성 업무 탭. 열거값 밖이면 400 (404 가 아니다 — §3.3) |

**응답 200** — 프론트 `TabData`

```json
{
  "todos": [
    { "key": "new-product", "label": "신규 상품", "count": 1, "to": "/products" },
    { "key": "cancel", "label": "취소관리", "count": 0, "to": "/products/returns" }
  ],
  "cards": [
    {
      "title": "최근 등록 상품",
      "count": 0,
      "moreTo": "/products",
      "icon": "order",
      "rows": [
        { "id": "o-1", "title": "야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트", "actor": "테스***", "date": "2026-07-10" }
      ]
    },
    {
      "title": "최근 구매평",
      "count": 4,
      "moreTo": "/products/categories",
      "icon": "tag",
      "rows": []
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `todos` | `TodoItem[]` | 오늘의 할일 항목. `TodoItem` = `{ key: string, label: string, count: number, to: string }` |
| `todos[].count` | number | 정수 ≥ 0. 프론트는 1 이상이면 danger, 0 이면 disabled 색으로 렌더한다(FS-002-EL-019) |
| `todos[].to` | string | 클릭 시 이동할 **프론트 라우트 경로**(예: `/products/returns`). 프론트 `nav-config` 의 경로와 같은 값이다 (§7.2-3 결합 주의) |
| `cards` | `[ListCardData, ListCardData]` | **정확히 2장.** 프론트 타입이 튜플이므로 1장·3장은 계약 위반이다 |
| `cards[].title` | string | 카드 제목. 탭별 고정값 (§ 카드 고정값 표) |
| `cards[].count` | number | 정수 ≥ 0. **`rows` 를 상한으로 자르기 전의 전체 건수**다 — `rows.length` 와 일치하지 않을 수 있다(FS-002-EL-023 비고와 일치). 0 이하이면 프론트가 뱃지를 숨긴다 |
| `cards[].moreTo` | string | '더보기' 이동 경로 (프론트 라우트) |
| `cards[].icon` | string | `order` \| `tag` \| `question` \| `contract` — 4종으로 한정(FS-002-EL-024.1) |
| `cards[].rows` | `ListRow[]` | `ListRow` = `{ id: string, title: string, actor: string, date: string }` |
| `cards[].rows[].actor` | string | **마스킹된 값**으로 내려준다(예: `테스***`). 원문 성명을 응답에 담지 않는다 — 마스킹은 서버가 수행한다 (FS-002-EL-024 비고) |
| `cards[].rows[].date` | string | `YYYY-MM-DD` 형식 문자열 |

**카드 고정값** (탭별 — FS-002-EL-021 · EL-022)

| 탭 | 카드 A `title` · `icon` | 카드 B `title` · `icon` |
|---|---|---|
| `products` | '최근 등록 상품' · `order` | '최근 구매평' · `tag` |
| `inquiries` | '최근 문의' · `question` | '답변 대기' · `question` |
| `sales` | '최근 상담' · `question` | '계약 대기' · `contract` |

**응답 상한 규칙** (대량 방어 — 프론트에 페이징·가상화가 없다)

| 항목 | 상한 | 근거 |
|---|---|---|
| `todos` 항목 수 | **4건** | 탭별 고정 목록이다 (상품 4 · 문의 3 · 영업 4 — FS-002-EL-018) |
| `cards` 장수 | **2장 고정** | 프론트 타입이 튜플 `[ListCardData, ListCardData]` 다 |
| `cards[].rows` 행 수 | **카드당 5행** | 카드가 '최근 N건' 요약 위젯이다. 서버가 `date` 내림차순(최신 우선)으로 정렬해 5행까지 자른다. 잘라내기 전 전체 건수는 `count` 로 전달한다 |
| `cards[].rows[].title` 길이 | 200자 (초과분은 서버가 자르고 말줄임표 없이 그대로 보낸다) | 프론트는 길면 줄바꿈해 카드 높이를 늘린다(FS-002-EL-024 대량) — 무제한 길이는 레이아웃을 파괴한다 |
| `count` 값 | 상한 없음 (정수 ≥ 0) | FS-002-EL-023 대량: "자릿수 상한을 두지 않고 값을 그대로 표시한다" |

**권한 소거 규칙** (§3.4 — 서버가 수행한다)

| 서버 권한 상태 | 응답 |
|---|---|
| `dashboard.tab.{tab}` OFF | **403 `TAB_FORBIDDEN`** (`details.requiredKeys = ["dashboard.tab.{tab}"]`) |
| `dashboard.todo` OFF **and** `dashboard.lists` OFF | **403 `WIDGET_FORBIDDEN`** (`details.requiredKeys = ["dashboard.todo", "dashboard.lists"]`). 프론트는 이 상태에서 요청을 발행하지 않는다(FS-002-EL-042) — 직접 호출 방어다 |
| `dashboard.todo` OFF (lists 는 ON) | 200. **`todos: []`** 로 소거한다. `cards` 는 정상 |
| `dashboard.lists` OFF (todo 는 ON) | 200. **`cards[].rows: []` · `cards[].count: 0`** 로 소거한다. `title` · `moreTo` · `icon` 은 탭별 고정 라벨이므로 유지한다(업무 데이터가 아니다). 카드 2장 튜플은 유지한다 — 타입 계약이다 |

**에러 목록**

| HTTP | 에러코드 | 조건 | `error.details` |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | `tab` 이 `products` \| `inquiries` \| `sales` 밖 | `null`. `error.fields = [{ name: "tab", code: "INVALID_FORMAT", message }]` |
| 401 | `UNAUTHENTICATED` | 유효한 세션 자격 증명 없음·만료 | `null` |
| 403 | `TAB_FORBIDDEN` | `dashboard.tab.{tab}` 권한 없음 | `{ "requiredKeys": ["dashboard.tab.products"] }` |
| 403 | `WIDGET_FORBIDDEN` | `dashboard.todo` · `dashboard.lists` 권한이 **둘 다** 없음 | `{ "requiredKeys": ["dashboard.todo", "dashboard.lists"] }` |
| 429 | `RATE_LIMITED` | 레이트리밋 초과 (§4.1) | `null`. 잔여 초는 `Retry-After` 헤더 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | `null`. `traceId` 필수 |
| 504 | `UPSTREAM_TIMEOUT` | 서버 처리 상한 3초 초과 | `null` |

---

### BE-002-EP-02 · 통계 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-002-EL-027 (통계 섹션 — 통계 조회. FS-002 §5의 `[서버]` 요소). 응답 구성 근거: FS-002-EL-031 · FS-002-EL-033 (방문자 계열·x축 라벨) · FS-002-EL-037 (기간별 분석 표 7컬럼) · FS-002-EL-038 (합계 행 2건). 기간 파라미터 근거: FS-002-EL-029. 권한 소거 근거: FS-002-EL-042 |
| 메서드 · 경로 | `GET /api/dashboard/stats?range={range}` |
| 권한 | `system_admin` · `operator` · `viewer` (§3.1) + 기능 권한 키 `dashboard.stats.visitors` · `dashboard.stats.period` (§3.4) |
| 멱등성 | 멱등 (GET). 재시도 안전 |
| 페이징 | **없다.** 행 수가 계약으로 고정된다(방문자 점 4~7개 · 일자 행 7건 · 합계 행 2건). 프론트에 페이지네이션·정렬 토글이 없다(FS-002-EL-037 유효성) |

**엔드포인트를 1개로 유지하는 근거** — 방문자 카드와 기간별 분석 카드는 **화면상 2개 위젯이지만 조회는 1건**이다(FS-002-EL-027: "두 카드의 데이터를 1건의 조회로 함께 가져온다", FS-002-EL-040 비고: "동일 조회의 실패이므로 두 문구는 함께 나타난다"). 프론트 어댑터도 `fetchStats` 1개다. 2개로 분해하면 프론트를 바꿔야 하므로 분해하지 않는다.

**요청 — 쿼리**

| 이름 | 타입 | 필수 | 제약 | 설명 |
|---|---|---|---|---|
| `range` | string | O | `day` \| `week` \| `month` (프론트 `StatsRange`) | 조회 기간. 기본값은 프론트가 `day` 로 보낸다(`DEFAULT_STATS_RANGE`). 열거값 밖이면 400 |

`range` 열거값 밖일 때 서버는 **400 을 반환하고 조용히 폴백하지 않는다.** 프론트의 `day` 폴백(`stats-api.ts` 의 `isStatsRange`, FS-002-EL-027 유효성 열)은 클라이언트 방어이며 유지된다 — 프론트 폴백이 선행하므로 정상 경로에서 400 은 발생하지 않는다. 서버가 조용히 폴백하면 클라이언트 버그가 은폐되고, 사용자는 선택하지 않은 기간의 데이터를 보게 된다.

**응답 200** — 프론트 `StatsData`

```json
{
  "visitors": [
    { "label": "7.13", "visitors": 8, "pageViews": 72 },
    { "label": "7.14", "visitors": 9, "pageViews": 18 }
  ],
  "periodRows": [
    { "date": "2026-07-14", "orders": 0, "revenue": 0, "visitors": 9, "signups": 0, "inquiries": 0, "reviews": 0 }
  ],
  "summaries": [
    { "label": "최근 7일 합계", "orders": 2, "revenue": 150004, "visitors": 68, "signups": 0, "inquiries": 0, "reviews": 0 },
    { "label": "이번달 합계", "orders": 12, "revenue": 600022, "visitors": 80, "signups": 4, "inquiries": 3, "reviews": 2 }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `visitors` | `VisitorPoint[]` | 방문자 차트 계열. `VisitorPoint` = `{ label: string, visitors: number, pageViews: number }` |
| `visitors[].label` | string | **x축 라벨 문자열을 서버가 만든다.** 형식은 `range` 에 종속된다 — `day`: `7.14` / `week`: `7월 2주` / `month`: `7월` (FS-002-EL-033). 프론트는 이 값을 그대로 렌더한다(포맷팅하지 않는다) |
| `visitors[].visitors` · `pageViews` | number | 정수 ≥ 0 |
| `periodRows` | `PeriodRow[]` | 기간별 분석 표의 일자 행. `PeriodRow` = `{ date, orders, revenue, visitors, signups, inquiries, reviews }` |
| `periodRows[].date` | string | `YYYY-MM-DD`. **최신 날짜가 배열 앞**에 오도록 서버가 내림차순 정렬한다(FS-002-EL-037: "최신 날짜가 위") |
| `periodRows[].revenue` | number | 원 단위 정수. 프론트가 ko-KR 천 단위 구분 기호와 '원' 단위를 붙인다 — **서버는 숫자만 보낸다**(문자열·통화 기호 금지) |
| `summaries` | `PeriodSummary[]` | 합계 행. `PeriodSummary` = `{ label, orders, revenue, visitors, signups, inquiries, reviews }` — `date` 대신 `label` 을 갖는다 |
| `summaries[].label` | string | 합계 행 라벨. **2건 고정**: `최근 7일 합계` · `이번달 합계` (FS-002-EL-038) |

**응답 상한 규칙** (대량 방어)

| 항목 | 상한 | 근거 |
|---|---|---|
| `visitors` 점 수 | `day` **7개** · `week` **4개** · `month` **5개** (기간별 고정) | FS-002-EL-031 비고: "데이터 점 개수 — 일 7개 · 주 4개 · 월 5개". 프론트 x축은 점 수로 균등 분할하며 솎아내기 규칙이 없다(FS-002-EL-033 대량) — 서버가 상한을 지켜야 한다 |
| `periodRows` 행 수 | **7행 고정** | FS-002-EL-037: "본문은 일자별 행 7건". `range` 값과 무관하게 7행이다(FS-002 §5 비고: "기간별 분석 표의 행은 현재 구현에서 기간 값에 따라 달라지지 않는다") |
| `summaries` 행 수 | **2행 고정** | FS-002-EL-038: 합계 행 2건 |
| 숫자 값 자릿수 | 상한 없음 (정수 ≥ 0) | 프론트가 값을 그대로 표시한다 |

**권한 소거 규칙** (§3.4 — 서버가 수행한다)

| 서버 권한 상태 | 응답 |
|---|---|
| `dashboard.stats.visitors` OFF **and** `dashboard.stats.period` OFF | **403 `WIDGET_FORBIDDEN`** (`details.requiredKeys = ["dashboard.stats.visitors", "dashboard.stats.period"]`). 프론트는 이 상태에서 요청을 발행하지 않는다(FS-002-EL-042 · EL-027) — 직접 호출 방어다 |
| `dashboard.stats.visitors` OFF (period 는 ON) | 200. **`visitors: []`** 로 소거한다 |
| `dashboard.stats.period` OFF (visitors 는 ON) | 200. **`periodRows: []` · `summaries: []`** 로 소거한다 |

**에러 목록**

| HTTP | 에러코드 | 조건 | `error.details` |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | `range` 가 `day` \| `week` \| `month` 밖 (또는 누락) | `null`. `error.fields = [{ name: "range", code: "INVALID_FORMAT", message }]` |
| 401 | `UNAUTHENTICATED` | 유효한 세션 자격 증명 없음·만료 | `null` |
| 403 | `WIDGET_FORBIDDEN` | `dashboard.stats.visitors` · `dashboard.stats.period` 권한이 **둘 다** 없음 | `{ "requiredKeys": ["dashboard.stats.visitors", "dashboard.stats.period"] }` |
| 429 | `RATE_LIMITED` | 레이트리밋 초과 (§4.1) | `null`. 잔여 초는 `Retry-After` 헤더 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | `null`. `traceId` 필수 |
| 504 | `UPSTREAM_TIMEOUT` | 서버 처리 상한 3초 초과 | `null` |

---

### 4.1 레이트리밋 규칙 (두 엔드포인트 공통)

**문제**: 탭 전환(FS-002-EL-013)과 기간 토글(FS-002-EL-029)을 빠르게 반복하면 요청이 쏟아진다. 프론트는 이전 요청을 중단하지만(이제 react-query 가 `queryFn({ signal })` 로 내려주는 `AbortSignal` 을 `fetchTabData`/`fetchStats` 에 그대로 넘긴다 — `queries.ts:27,40`. 손으로 만든 `useAsyncData.ts` 의 cleanup 은 삭제됐다), **서버는 이미 요청을 받았다.** abort 는 클라이언트가 응답을 버리는 것이지 서버 처리를 취소하는 것이 아니다.

| 기준 | 상한 | 초과 시 |
|---|---|---|
| 세션(사용자) 단위 | 분당 120회 | 429 `RATE_LIMITED` + `Retry-After`(초) |
| 클라이언트 IP 단위 | 분당 300회 | 429 `RATE_LIMITED` + `Retry-After`(초) |

상한 산정 근거: 정상 사용자가 탭 3개 + 기간 3개를 연속으로 눌러도 초당 2~3회를 넘기기 어렵다. 분당 120회는 사람의 조작 속도를 막지 않으면서 스크립트 폭주를 차단한다. 두 제한은 독립이며 동시에 적용된다(공유 NAT 환경을 고려해 IP 상한을 사용자 상한보다 넉넉히 잡는다).

**서버 부담 완화**: 두 엔드포인트는 읽기 전용이므로, 서버가 클라이언트 연결 종료(abort)를 감지하면 진행 중인 처리를 중단해도 안전하다 — 부작용이 없다.

**프론트 처리**: `fetchTabData` · `fetchStats` 는 429 를 다른 실패와 구분하지 않고 `ApiError` 로 던진다 → FS-002-EL-041 배너 / FS-002-EL-035 · EL-040 문구. `Retry-After` 안내 경로가 프론트에 없다 (§7.2-2).

### 4.2 타임아웃 규칙 (두 엔드포인트 공통)

| 항목 | 확정값 |
|---|---|
| 서버 처리 상한 | **3초.** 초과 시 요청을 중단하고 504 `UPSTREAM_TIMEOUT` 을 반환한다 |
| 프론트 상한 | **없다.** FS-002 §4.1 '요청 타임아웃': "프론트 타임아웃 상한이 설정되어 있지 않다". 진행 중 요청은 탭·기간 변경 또는 화면 이탈 시에만 abort 된다 |
| 어긋남 여부 | 서버가 3초 안에 반드시 응답(성공 또는 504)하므로, **서버가 살아 있는 한** 프론트 스켈레톤(FS-002-EL-020 · EL-026 · EL-034 · EL-039)은 최대 3초 + 네트워크 왕복 시간 안에 해소된다 |
| 남는 위험 | **네트워크 단절 시 프론트가 무한 대기한다** — 상한이 없으므로 스켈레톤이 영구히 고정된다. 서버 상한으로는 해결되지 않는다 (§7.2-4) |

## 5. 예외 매트릭스

행 수 = §4의 엔드포인트 수(2건). 빈칸 없음.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| BE-002-EP-01 | `tab` 이 `products`\|`inquiries`\|`sales` 밖이면 400 `VALIDATION_FAILED` + `error.fields = [{ name: "tab", ... }]`. **404 가 아니다** — `tab` 은 경로 세그먼트로 표현된 고정 열거값이지 리소스 식별자가 아니다(§3.3). 프론트는 `TabId` 타입으로 제한하므로 정상 경로에서 발생하지 않는다 | 401 `UNAUTHENTICATED`. 프론트에 401 분기가 없어 `ApiError` → FS-002-EL-041 배너로 표시된다 — 기대 동작(`/login?reason=session_expired`)과의 차이는 §7.2-1 | **403** (`TAB_FORBIDDEN` · `WIDGET_FORBIDDEN`) — 탭 3종은 고정 열거값이라 존재가 비밀이 아니고, 404 로 숨기면 운영자가 권한 문제를 '데이터 없음'과 혼동한다(§3.2). 권한 없는 위젯이 **한쪽뿐이면 403 이 아니라 200 + 부분 소거**다(`todos: []` 또는 `rows: []`·`count: 0`) — 전체 403 은 권한 있는 위젯의 데이터까지 잃게 해 FS-002-EL-041 오탐을 만든다 | N/A — 단건 리소스 식별자가 없는 컬렉션 조회다. 데이터 0건은 404 가 아니라 200 + 빈 배열이며 프론트가 빈 상태(FS-002-EL-025)로 렌더한다. 삭제된 리소스 개념이 없다 | N/A — 읽기 전용 조회다. 서버 상태를 바꾸지 않으므로 동시 수정 충돌·중복 생성이 성립하지 않는다(FS-002 §4.1 '중복 제출': "이 화면에는 쓰기 요청이 없다"). 낙관적 잠금(버전/ETag) 불요 | N/A — 요청 파라미터가 열거값 `tab` 1개뿐이고, 열거값이면 언제나 처리 가능하다. 상태 전이가 없는 조회이므로 '상태 위반'이 성립하는 자원이 없다 | 429 `RATE_LIMITED` — 세션 분당 120회 · IP 분당 300회 (§4.1). 탭을 빠르게 반복 전환하면 프론트가 abort 해도 **서버는 이미 요청을 받는다**. `Retry-After` 반환. 프론트는 `ApiError` → FS-002-EL-041 (§7.2-2) | 500 `INTERNAL_ERROR` + `traceId`. 문구는 일반화하며 스택·쿼리·경로를 담지 않는다. 프론트는 FS-002-EL-041 배너('대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')로 표시한다 | 서버 3초(504 `UPSTREAM_TIMEOUT`) / **프론트 상한 없음**(FS-002 §4.1). 서버가 3초 안에 반드시 응답하므로 스켈레톤은 해소된다. 네트워크 단절 시 프론트 무한 대기가 남는다 (§4.2 · §7.2-4). abort 는 부작용을 남기지 않는다(멱등 GET) |
| BE-002-EP-02 | `range` 가 `day`\|`week`\|`month` 밖이거나 누락이면 400 `VALIDATION_FAILED` + `error.fields = [{ name: "range", ... }]`. **서버는 조용히 폴백하지 않는다** — 프론트의 `day` 폴백(`isStatsRange`, FS-002-EL-027 유효성)은 클라이언트 방어로 유지되며, 그 덕에 정상 경로에서 400 은 발생하지 않는다 | 401 `UNAUTHENTICATED`. BE-002-EP-01 과 동일하게 `ApiError` → FS-002-EL-035 · EL-040 문구로 표시된다 (§7.2-1) | **403** (`WIDGET_FORBIDDEN`) — 통계는 단일 컬렉션이라 존재가 비밀이 아니다(§3.2). 방문자·기간별 분석 권한이 **둘 다** 없을 때만 403 이고, **한쪽만 없으면 200 + 부분 소거**다(`visitors: []` 또는 `periodRows: []`·`summaries: []`) — FS-002-EL-027 권한없음 열("한쪽만 꺼지면 조회는 그대로 발행되고 켜진 카드만 렌더된다")과 일치한다 | N/A — 단건 리소스 식별자가 없는 컬렉션 조회다. 계열·행이 0건이어도 404 가 아니라 200 + 빈 배열이며, 프론트는 차트를 눈금만(FS-002-EL-032 하한 규칙), 표를 헤더·합계 행만 렌더한다(FS-002-EL-027 빈 상태) | N/A — 읽기 전용 조회다. 서버 상태를 바꾸지 않으므로 충돌이 성립하지 않는다. 낙관적 잠금 불요 | N/A — 요청 파라미터가 열거값 `range` 1개뿐이고, 열거값이면 언제나 처리 가능하다. 상태 전이가 없는 조회다 | 429 `RATE_LIMITED` — 세션 분당 120회 · IP 분당 300회 (§4.1). 기간 토글을 빠르게 반복하면 프론트가 abort 해도 서버는 이미 요청을 받는다. `Retry-After` 반환. 프론트는 `ApiError` → FS-002-EL-035 · EL-040 (§7.2-2) | 500 `INTERNAL_ERROR` + `traceId`. 문구는 일반화한다. 프론트는 두 카드에 각각 '방문자 통계를 불러오지 못했습니다.'(EL-035) · '기간별 분석을 불러오지 못했습니다.'(EL-040)를 렌더한다 — 동일 조회의 실패이므로 두 문구가 함께 나타난다 | 서버 3초(504 `UPSTREAM_TIMEOUT`) / **프론트 상한 없음**. BE-002-EP-01 과 동일하다. abort 된 요청은 실패로 표시되지 않는다(FS-002 §4.1 '요청 취소') — 늦게 도착한 이전 기간의 응답이 최신 상태를 덮어쓰지 않는다 |

## 6. 프론트 연동 대조

### 6.1 어댑터 ↔ 엔드포인트 매핑

`api.ts` · `stats-api.ts` 의 export 를 전수 나열한다.

| 어댑터 export | 교체 지점 주석 | 엔드포인트 | 요청 타입 | 응답 타입 (types.ts / stats-types.ts) | 필드 일치 |
|---|---|---|---|---|---|
| `fetchTabData(tab: TabId, signal: AbortSignal): Promise<TabData>` (`api.ts`) | 파일 헤더: "실제 API 가 붙으면 fetchTabData 의 내부만 교체하면 되고 화면 코드는 그대로다" | BE-002-EP-01 | `TabId` = `'products' \| 'inquiries' \| 'sales'` → 경로 파라미터 `{tab}` | `TabData` = `{ todos, cards }` | O (§6.2) |
| `fetchStats(range: StatsRange, signal: AbortSignal): Promise<StatsData>` (`stats-api.ts`) | 파일 헤더: "백엔드가 붙으면 fetchStats 내부만 교체한다" | BE-002-EP-02 | `StatsRange` = `'day' \| 'week' \| 'month'` → 쿼리 `range` | `StatsData` = `{ visitors, periodRows, summaries }` | O (§6.3) |
| `ApiError` (`api.ts`) | — | BE-002-EP-01 · EP-02 공통 실패 타입 | — | — | O — 모든 4xx/5xx 를 `ApiError` 로 던진다. **상태코드·`error.code` 별 분기가 없다** (§7.2-1 · §7.2-2) |
| `TABS` · `DEFAULT_TAB` (`types.ts`) | — | N/A — 탭 목록·기본 탭은 프론트 정적 구성이며 서버가 내려주지 않는다 | — | — | N/A |
| `STATS_RANGES` · `DEFAULT_STATS_RANGE` (`stats-types.ts`) | — | N/A — 기간 선택지·기본 기간은 프론트 정적 구성이다 | — | — | N/A |
| `useTabDataQuery(tab, enabled)` · `useStatsQuery(range, enabled)` (`queries.ts:24,34`) | 파일 헤더: "화면은 useQuery 를 직접 부르지 않는다 — 여기 도메인 훅만 부른다" | N/A — 조회 훅이며 서버 호출 어댑터가 아니다. `enabled=false` 로 권한 OFF 위젯의 요청을 막는다(FS-002-EL-042) | — | — | N/A — 손으로 만든 `useAsyncData` 를 대체한 TanStack Query 훅이다(ADR-0008 §7.1) |
| `loadPermissions()` · `savePermissions()` (`shared/permissions/PermissionProvider.tsx`) | 파일 헤더: "백엔드가 붙으면 loadPermissions/savePermissions 두 함수만 API 호출로 교체하면 되고, 화면 코드는 건드릴 필요가 없다" | **엔드포인트 없음** — FS-002 §5에 서버 연동 요소가 없다 | — | `PermissionMap` = `Record<FeatureKey, boolean>` | **X** — §7.1 (기능 명세 쪽 변경 요청 대상) |

### 6.2 응답 필드 대조 — `TabData` (`types.ts`)

| 프론트 타입 · 필드 | 프론트 타입 | 응답 스키마 필드 | 응답 타입 | 일치 |
|---|---|---|---|---|
| `TabData.todos` | `readonly TodoItem[]` | `todos` | array | O |
| `TabData.cards` | `readonly [ListCardData, ListCardData]` | `cards` | array (길이 2 고정) | O |
| `TodoItem.key` | `string` | `todos[].key` | string | O |
| `TodoItem.label` | `string` | `todos[].label` | string | O |
| `TodoItem.count` | `number` | `todos[].count` | number | O |
| `TodoItem.to` | `string` | `todos[].to` | string | O |
| `ListCardData.title` | `string` | `cards[].title` | string | O |
| `ListCardData.count` | `number` | `cards[].count` | number | O |
| `ListCardData.moreTo` | `string` | `cards[].moreTo` | string | O |
| `ListCardData.icon` | `'order' \| 'tag' \| 'question' \| 'contract'` | `cards[].icon` | string (동일 enum) | O |
| `ListCardData.rows` | `readonly ListRow[]` | `cards[].rows` | array | O |
| `ListRow.id` | `string` | `cards[].rows[].id` | string | O |
| `ListRow.title` | `string` | `cards[].rows[].title` | string | O |
| `ListRow.actor` | `string` | `cards[].rows[].actor` | string (마스킹됨) | O |
| `ListRow.date` | `string` (`YYYY-MM-DD`) | `cards[].rows[].date` | string (`YYYY-MM-DD`) | O |

### 6.3 응답 필드 대조 — `StatsData` (`stats-types.ts`)

| 프론트 타입 · 필드 | 프론트 타입 | 응답 스키마 필드 | 응답 타입 | 일치 |
|---|---|---|---|---|
| `StatsData.visitors` | `readonly VisitorPoint[]` | `visitors` | array | O |
| `StatsData.periodRows` | `readonly PeriodRow[]` | `periodRows` | array | O |
| `StatsData.summaries` | `readonly PeriodSummary[]` | `summaries` | array | O |
| `VisitorPoint.label` | `string` | `visitors[].label` | string | O |
| `VisitorPoint.visitors` | `number` | `visitors[].visitors` | number | O |
| `VisitorPoint.pageViews` | `number` | `visitors[].pageViews` | number | O |
| `PeriodRow.date` | `string` (`YYYY-MM-DD`) | `periodRows[].date` | string | O |
| `PeriodRow.orders` | `number` | `periodRows[].orders` | number | O |
| `PeriodRow.revenue` | `number` | `periodRows[].revenue` | number | O |
| `PeriodRow.visitors` | `number` | `periodRows[].visitors` | number | O |
| `PeriodRow.signups` | `number` | `periodRows[].signups` | number | O |
| `PeriodRow.inquiries` | `number` | `periodRows[].inquiries` | number | O |
| `PeriodRow.reviews` | `number` | `periodRows[].reviews` | number | O |
| `PeriodSummary.label` | `string` | `summaries[].label` | string | O |
| `PeriodSummary.orders` · `revenue` · `visitors` · `signups` · `inquiries` · `reviews` | `number` × 6 | `summaries[].*` | number × 6 | O |

## 7. 결정 필요 사항 · 프론트 변경 필요

### 7.1 권한 조회 엔드포인트 — 판단과 결론

**판단: 백엔드 연동 시 필요하다. 그러나 이 계약(v1.0)에서는 확정하지 않는다.**

| 근거 | 내용 |
|---|---|
| 필요한 이유 | §3.4-4 — 서버가 권한을 판정하는 순간, 프론트의 `localStorage` 권한과 서버 권한이 어긋날 수 있다. 프론트가 ON 으로 알고 요청 → 서버 403 → 사용자에게 '권한 없음'이 아니라 '조회 실패'(FS-002-EL-041)로 보인다. 이 불일치는 권한을 서버에서 조회해야만 사라진다. 프론트 어댑터도 교체 지점을 이미 표시해 뒀다(`PermissionProvider.tsx` 헤더 주석) |
| 만들지 않는 이유 1 | **FS-002 §5(서버 연동 지점)에 해당 요소가 없다.** `[서버]` = O 요소는 FS-002-EL-014 · FS-002-EL-027 2건뿐이고, 권한 요소(FS-002-EL-007 · FS-002-EL-042)는 브라우저 저장소 판정으로 명세돼 있다. 근거 없는 엔드포인트는 유령 기능이 된다 |
| 만들지 않는 이유 2 | **프론트를 바꿔야 한다.** `loadPermissions(): PermissionMap` 은 **동기** 함수다(`useState(loadPermissions)` 로 초기 상태를 만든다). API 호출로 바꾸면 비동기가 되고, 권한 로딩 중의 화면 상태(스켈레톤·기본값 렌더 여부)라는 **새 요소**가 필요하다. 이는 FS-002 개정 사항이며 백엔드 명세 이 임의로 확정할 수 없다 |
| 후속 경로 | **기능 명세 에 변경 요청** — FS-002 에 (a) 권한 조회 서버 연동 지점, (b) 권한 로딩 중 화면 상태 요소를 추가 요청한다. FS 개정 후 BE-002 v1.1 에서 엔드포인트를 확정한다 |
| 그때까지의 보안 | **BE-002-EP-01 · EP-02 의 서버 측 권한 재판정(§3.4)은 v1.0 에서 이미 확정된다.** 데이터 유출 경로는 이 두 엔드포인트뿐이므로, 권한 조회 엔드포인트가 없어도 **보안 경계는 성립한다.** 남는 문제는 보안이 아니라 사용자에게 보이는 오류 문구의 정확도다 |

### 7.2 프론트 변경 필요 (임의로 다른 모양을 확정하지 않고 기록만 한다)

| # | 내용 | 영향 | 권고 |
|---|---|---|---|
| 1 | **401 처리 경로가 없다.** `fetchTabData` · `fetchStats` 는 모든 실패를 `ApiError` 로 던지고, 대시보드에는 세션 검사·만료 처리 요소가 없다(FS-002 §4.1 '세션 만료') | 세션이 만료되면 사용자는 '대시보드 데이터를 불러오지 못했습니다.'(FS-002-EL-041)를 보고, 다시 로그인해야 한다는 사실을 알 수 없다. FS-001-EL-023(`?reason=session_expired` 안내)으로 가는 트리거가 대시보드에 없다 | 401 `UNAUTHENTICATED` 수신 시 `/login?returnUrl=<현재경로>&reason=session_expired` 로 이동하는 요소를 FS-002 에 추가 → **기능 명세 쪽 변경 요청** (FS-001-EL-023 · EL-026 이 이미 수신 측을 정의하고 있다) |
| 2 | **`error.code` 별 분기가 없다.** `ApiError` 는 메시지 문자열만 갖는다 | 403(권한 없음) · 429(재시도 대기) · 500(서버 오류)이 모두 같은 문구로 표시된다. `Retry-After` 안내를 할 수 없다 | `ApiError` 에 `status` · `code` · `retryAfterSec` 필드 추가 → 프론트 구현 쪽 변경 요청. 현행 계약은 단일 문구로 동작한다 |
| 3 | **`todos[].to` · `cards[].moreTo` 가 프론트 라우트 경로 문자열이다.** 서버가 프론트 라우팅을 알아야 한다(결합) | 프론트 라우트가 바뀌면 서버 응답도 바꿔야 한다 | **현행 유지한다** — 프론트가 이미 기대하는 모양이고(`TodoItem.to` · `ListCardData.moreTo` 가 `string`), 임의로 바꾸지 않는다. 결합을 끊으려면 서버가 키(예: `new-order`)만 주고 프론트가 경로로 매핑해야 하며, 이는 프론트 구현 쪽 변경 요청 사항이다 |
| 4 | **프론트 요청 타임아웃 상한이 없다** (FS-002 §4.1) | 네트워크가 끊기면 스켈레톤(FS-002-EL-020 · EL-026 · EL-034 · EL-039)이 영구히 고정된다. 서버 상한 3초로는 해결되지 않는다 | `fetchTabData` · `fetchStats` 호출부에 상한(10초 — FS-001 의 `LOGIN_TIMEOUT_MS` 와 동일 값) 도입 → 프론트 구현 쪽 변경 요청 + FS-002 예외 명세 개정(기능 명세) |

## 8. 자기 점검 (제출 전 확인)

- [x] FS-002 §5(서버 연동 지점)의 요소 — FS-002-EL-014 · FS-002-EL-027 2건 — 이 BE-002-EP-01 · BE-002-EP-02 로 커버됐다 (누락 0건)
- [x] 모든 엔드포인트(2건)가 `근거 (FS)` 에 FS 요소 번호를 역참조한다 (고아 엔드포인트 0건). 인용한 번호는 전부 FS-002 §3에 실재한다
- [x] §5 예외 9축에 빈칸 0건 (2행 × 9열 = 18칸). 모든 `N/A` 에 사유가 붙어 있다
- [x] §2 공통 에러 봉투를 1회 정의했고, §4는 에러코드 목록만 나열한다 (봉투 재정의 0건 — `details` 는 §2 봉투의 필드다)
- [x] §3.2 403 vs 404 은닉 정책이 리소스별로 명시됐고 §5의 `403 vs 404` 열과 모순되지 않는다 (404 미사용 · 403 사용 · 부분 소거 규칙 일치)
- [x] §3.4 에 권한의 보안 경계(서버 판정)를 명시했다 — 프론트 `localStorage` 권한은 표시 최적화이며 접근 제어가 아니다
- [x] §6에서 두 어댑터의 모든 export 가 매핑됐고, 응답 필드명·타입 불일치 0건 (§6.2 · §6.3). 미매핑 1건(`loadPermissions`)은 §7.1에 판단과 후속 경로를 기록했다
- [x] 쓰기 엔드포인트가 없으므로 멱등키가 불요하다 — 두 엔드포인트 모두 멱등 GET (사유 기술)
- [x] 목록 엔드포인트의 페이징을 판정했다 — 행 수가 계약 상한으로 고정되며 페이징이 없다 (사유 기술)
- [x] 대량 상한을 확정했다 — 리스트 카드 행 5행/카드 · 할일 4건 · 방문자 점 7·4·5개 · 일자 행 7건 · 합계 행 2건
- [x] 500 응답 문구에 내부 정보(스택·쿼리·경로)가 없다
- [x] 서버 코드·데이터 저장 설계를 쓰지 않았다 — API 계약(요청·응답·에러·권한·멱등성)까지만 기술했다
- [x] 모호어 0건
