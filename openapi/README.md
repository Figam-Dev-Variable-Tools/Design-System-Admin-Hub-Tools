# `openapi/` — **이것은 스키마다. 서버 구현이 아니다.**

## 0. 이 디렉터리가 무엇이 아닌지부터 말한다

**여기에 서버가 없다.** 앞으로도 없다.

| 이 디렉터리에 있는 것 | 이 디렉터리에 **없는** 것 (그리고 만들지 않는 것) |
|---|---|
| `openapi.yaml` — API **계약**을 기술한 OpenAPI 3.1 문서 | 서버 코드 (express · fastify · nest · hono …) |
| `README.md` — 이 문서 | DB 스키마 · 마이그레이션 · ORM 모델 (prisma · typeorm · drizzle …) |
| | 서버 라우터 · 컨트롤러 · 미들웨어 |
| | mock 서버 · 스텁 서버 |

**백엔드 개발자가 이 스키마를 읽고 서버를 구현한다.** 이 리포는 프론트엔드 리포이며,
`openapi.yaml` 은 **프론트가 기대하는 계약을 기계가 읽을 수 있는 형식으로 적어 둔 것**이다.

> 이 경계를 지키는 이유: 계약은 **양쪽이 합의한 것**이어야 한다.
> 프론트 리포가 서버까지 들고 있으면, 그 서버는 **프론트의 가정을 그대로 구현한 서버**가 되고,
> 진짜 백엔드가 붙는 날 가정이 틀렸다는 사실이 한꺼번에 드러난다.
> 스키마는 합의의 대상이고, 서버는 합의의 결과다.

## 1. 원천 (Source of Truth)

**이 YAML 은 원천이 아니다.** 원천은 BE 명세다.

| 명세 | 엔드포인트 | 파일 |
|---|---|---|
| BE-001 로그인 | 1건 | `specs/login/BE-001-login.md` |
| BE-002 대시보드 | 2건 | `specs/dashboard/BE-002-dashboard.md` |
| BE-003 회원 목록 | 6건 | `specs/users/members/BE-003-members.md` |
| BE-004 회원 상세 | 5건 | `specs/users/members/detail/BE-004-member-detail.md` |
| **합계** | **14건** | |

**`openapi.yaml` 과 BE 명세가 어긋나면 명세가 옳다.** 이 YAML 을 고치기 전에 명세를 읽는다.
명세를 바꿔야 한다면 그것은 **백엔드 명세 쪽 일**이며, YAML 을 먼저 고쳐서 명세를 따라오게 만들지 않는다.

```
 FS 명세  →  BE 명세  →  openapi.yaml  →  schema.d.ts  →  프론트 타입 검증
    화면 요소        API 계약          기계 판독형        생성물          tsc 가 검증
                                    (여기)          (손대지 않는다)
```

## 2. 쓰는 법

### 2.1 타입 생성

```bash
pnpm openapi:types
# openapi/openapi.yaml → apps/admin/src/shared/api/schema.d.ts
```

`schema.d.ts` 는 **생성물이다. 손으로 고치지 않는다.**
(lint · prettier 대상에서 제외돼 있다 — `.prettierignore` · `apps/admin/eslint.config.js` 의 `ignores`)

스키마를 고쳤으면 **반드시 다시 생성하고 같은 커밋에 담는다.** 생성물과 원천이 어긋난 커밋은 거짓말이다.

### 2.2 프론트에서 쓰기

```ts
import type { paths, components } from '../shared/api/schema';

type Member = components['schemas']['Member'];
type MemberListResult = components['schemas']['MemberListResult'];
```

`openapi-fetch` 를 쓰면 경로·쿼리·응답이 전부 타입 검사된다:

```ts
import createClient from 'openapi-fetch';
import type { paths } from '../shared/api/schema';

const client = createClient<paths>({ baseUrl: '/api' });
const { data, error } = await client.GET('/members', { params: { query: { page: 1 } } });
```

> **⚠️ 백엔드가 생길 때까지 실제 호출을 하지 않는다.** 지금 `data-source.ts` · `api.ts` 는 mock 이며,
> **함수 시그니처는 바뀌지 않는다** (BE-003 §6.1 · BE-004 §6.1). 교체는 **함수 본문**에서만 일어난다.

## 3. 스키마가 담고 있는 것

### 3.1 공통 에러 봉투 — 1회만 정의한다

모든 4xx/5xx 는 `components/schemas/ErrorEnvelope` **하나**를 따른다. 예외 없다.

```json
{
  "error": {
    "code": "INSUFFICIENT_POINTS",
    "message": "보유 적립금보다 많이 차감할 수 없습니다.",
    "fields": [{ "name": "amount", "code": "OUT_OF_RANGE", "message": "1 이상 1,000,000 이하여야 합니다." }],
    "details": null,
    "traceId": "01J8X4K2M9P7Q3R5S6T8V0W2Y4"
  }
}
```

- `error.code` — **프론트 분기의 유일한 근거**다 (SCREAMING_SNAKE_CASE).
- `error.message` — 사용자에게 그대로 보여줄 수 있는 문구. **내부 정보(스택·쿼리·경로·계정 존재 여부) 노출 금지.**
- `error.fields[].code` — `REQUIRED` · `INVALID_FORMAT` · `OUT_OF_RANGE` **3종으로 한정**.
- `error.traceId` — 500 문의 시 사용자가 그대로 전달한다.

> **도메인마다 다른 에러 형식을 만들면 백엔드가 두 벌을 구현하게 된다** (BE-003 §2 머리말).

### 3.2 예외 9축 → `responses`

BE 명세 §5 의 예외 매트릭스(400 검증 · 401 인증 · 403 vs 404 · 404 대상없음 · 409 충돌 · 422 상태위반 ·
429 과부하 · 500 오류 · 타임아웃)가 각 엔드포인트의 `responses` 로 옮겨져 있다.
재사용되는 응답은 `components/responses` 에 1회 정의했다:

`ValidationFailed` · `Unauthenticated` · `Forbidden` · `ForbiddenOrCsrf` · `MemberNotFound` ·
`RateLimited` · `InternalError` · `RequestTimeout` · `UpstreamTimeout`

### 3.3 명세의 '결정'을 그대로 반영한 것들

이것들은 **장식이 아니라 판정**이다. 구현할 때 빠뜨리면 계약 위반이다.

| 결정 | 어디에 | 왜 (명세 근거) |
|---|---|---|
| `Idempotency-Key` **필수** | `POST /members/{id}/points` | **적립금은 돈이다.** 전송 재시도로 두 번 지급되면 안 된다. 같은 키+같은 바디 → 최초 응답 재생. 다른 바디 → 409. **키 누락 → 400** (선택 사항으로 두면 실수로 누락된 요청이 정확히 위험한 요청이 된다) — BE-004 §7.1 |
| `Idempotency-Key` 선택 | `POST /members/{id}/notifications` | 생략하면 **60초 중복 흡수 창**이 적용된다 (프론트에 중복 클릭 차단이 없으므로 서버가 방어한다) — BE-003-EP-06 |
| `If-Match` **필수** + `ETag` | `PUT /members/{id}/memo` | 메모는 **이전 값을 읽고 고쳐 쓰는** 값이다. 낙관적 잠금이 없으면 A 가 저장하는 순간 **B 의 문장이 통째로 사라진다** — BE-004 §7.4 |
| **`ETag` 는 메모 버전만** 반영 | `GET /members/{id}` | 응답 전체 해시를 쓰면 남이 **적립금만 조정해도 메모 저장이 409 로 실패하는 가짜 충돌**이 생긴다 — BE-004 §7.4 |
| `X-CSRF-Token` | 모든 쓰기 (POST·PUT·PATCH·DELETE) | 세션 쿠키 기반 인증 — BE-003 §3.3 |
| `Retry-After` | 429 · 423 | 재시도 대기 시간 |
| `TabData.cards` 가 **튜플** | `GET /dashboard/tabs/{tab}` | 프론트 타입이 `readonly [ListCardData, ListCardData]` 다. `minItems`/`maxItems` 만으로는 타입 생성기가 튜플을 만들지 못해 **`prefixItems`**(JSON Schema 2020-12)를 썼다 |
| 삭제 재요청이 **204** | `DELETE /members/{id}` | 멱등. 404 는 **존재한 적 없는 id** 에만 — 이미 삭제된 회원에 404 를 주면 **삭제 이력이 노출된다** — BE-003 §5 |
| 404 가 **권한 은닉을 겸한다** | `GET /members/{id}` 등 | 개별 회원 리소스의 **존재 자체가 개인정보**다. 없는 id · 탈퇴 회원 · 읽기 권한 없음을 **구분하지 않는다** — BE-003 §3.2 |
| 403 이지 404 가 아니다 | `GET /dashboard/tabs/{tab}` | 탭 3종은 고정 열거값이라 존재가 비밀이 아니다. 404 로 숨기면 정당한 운영자가 **권한 문제를 '데이터 없음'과 혼동한다** — BE-002 §3.2 |
| 한쪽 권한만 없으면 **200 + 부분 소거** | 대시보드 2건 | 전체 403 으로 막으면 **권한 있는 위젯의 데이터까지 잃고** 실패 배너가 뜬다(오탐) — BE-002 §3.2 |

## 4. 미확정 항목 (아키텍처 판정 대상 — 이 스키마가 정하지 않는다)

| # | 항목 | 현재 스키마의 처리 |
|---|---|---|
| 1 | **세션 자격 증명의 전달 방식** (HttpOnly 쿠키 vs `Authorization` 헤더) | BE-001 §7.1 이 명시적으로 **확정을 보류**했다. `securitySchemes.sessionAuth` 를 쿠키로 표기했으나, **401 판정은 전달 방식과 무관하게 '유효한 자격 증명 없음'으로 성립한다**. 아키텍처가 판정하면 그 블록만 고친다 — **엔드포인트 계약은 바뀌지 않는다** |
| 2 | **역할 어휘 불일치** | BE-001/002 는 `system_admin`·`operator`·`viewer`, BE-003/004 는 `admin`·`operator` 다. 스키마의 `UserRole` 은 **프론트 타입과 일치하는 BE-001 쪽**을 따랐다. `admin` = `system_admin` 인지 명세에 없다 → **아키텍처/백엔드 명세** |
| 3 | **에러 봉투의 `details` 필드** | BE-001/002 는 **필수**(`WIDGET_FORBIDDEN` 의 `requiredKeys` 등이 여기 실린다), BE-003/004 §2 봉투 표에는 **행이 없다**. 스키마는 **선택(nullable)** 으로 모델링해 양쪽을 만족시켰다 → **백엔드 명세** |
| 4 | **권한 조회 엔드포인트** | **만들지 않았다.** FS-002 §5 에 서버 연동 요소가 없다 (BE-002 §7.1 — 기능 명세 변경 요청 대기). 근거 FS 요소가 없는 엔드포인트는 **유령 기능**이 된다 |

## 5. 이 스키마를 고쳐야 할 때

1. **BE 명세를 먼저 읽는다.** 명세에 없는 것을 스키마에 넣지 않는다 (유령 엔드포인트).
2. 명세가 틀렸다면 **백엔드 명세에 변경 요청** 을 보낸다. 스키마를 먼저 고치지 않는다.
3. 스키마를 고쳤으면 **`pnpm openapi:types` 를 다시 돌리고 같은 커밋에 담는다.**
4. `tsc --noEmit` 이 프론트 타입과의 불일치를 **기계적으로** 잡아 준다 — 그것이 이 파이프라인의 존재 이유다.
5. **서버 코드를 만들고 싶어지면, 그때가 이 문서를 다시 읽을 때다.**
