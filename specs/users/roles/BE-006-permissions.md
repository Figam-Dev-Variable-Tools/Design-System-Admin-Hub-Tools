---
id: BE-006
title: "권한 관리 백엔드 기능 명세"
functionalSpec: FS-006
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-15
---

# BE-006. 권한 관리 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-006 권한 관리 (`/users/roles`) |
| 범위 | 역할 목록 조회, 역할 생성·이름 변경·삭제, 역할의 권한 매트릭스·대시보드 위젯 저장, 데이터 접근 범위(scope) 저장, 적용 역할 전환. **그리고 이 문서의 핵심 — 모든 API 요청에 대한 서버 측 권한 강제**(§3·§7) |
| 범위 밖 | 운영자↔역할 배정(누가 어떤 역할을 갖는가) — FS-005 관리자 관리 도메인의 관심사다. 이 문서는 **역할의 정의**만 다루고 **배정**은 다루지 않는다 |
| 전제 | 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 쓰기는 `X-CSRF-Token` 필수(§3.3). 응답 본문은 `application/json; charset=utf-8` |
| 프론트 어댑터 | **없다.** 현재 `apps/admin/src/pages/permissions/` 에 `data-source.ts` 가 없고, 읽기/쓰기를 `apps/admin/src/shared/permissions/PermissionProvider.tsx` 가 `localStorage` 로 처리한다 |
| 도메인 타입 | `apps/admin/src/shared/permissions/roles.ts` (`Role` · `RoleState` · `RoleScope`) · `resources.ts` (`PermissionMatrix` · `PermissionAction`) · `feature-registry.ts` (`WidgetMap`) |

> **⚠ 이 문서는 이 리포지토리에서 보안이 가장 중요한 명세다.** 권한 관리 화면은 UI 를 그리는 규칙을 편집하지만, **실제 접근 차단은 이 문서가 정의하는 서버 강제가 유일한 보증**이다. §3·§7 의 판정이 FS-006 의 어떤 화면 동작보다 우선한다.

## 2. 공통 에러 봉투

모든 4xx / 5xx 응답은 BE-003 §2 와 동일한 봉투를 따른다. 각 엔드포인트는 **에러코드 목록만** 나열한다.

```json
{
  "error": {
    "code": "ROLE_NAME_DUPLICATED",
    "message": "이미 같은 이름의 역할이 있습니다.",
    "fields": [{ "name": "name", "code": "DUPLICATED", "message": "이미 같은 이름의 역할이 있습니다." }],
    "traceId": "01J8X4K2M9P7Q3R5S6T8V0W2Y4"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `error.code` | string | O | 기계 판정용 에러코드 |
| `error.message` | string | O | 사용자에게 보여줄 문구. **내부 정보 노출 금지** |
| `error.fields` | array \| null | X | 400 검증 실패 시. `name` = `name` \| `scope` \| `permissions` \| `widgets` |
| `error.traceId` | string | O | 로그 상관관계 ID |

### 2.1 공통 에러코드

| HTTP | 에러코드 | 발생 조건 | 프론트 처리 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 요청 바디·파라미터 제약 위반 | 모달 안 문구(FS-006-EL-006.2) 또는 실패 토스트 |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 | `/login?returnUrl=` (현재 프론트 미구현 — §7.6) |
| 403 | `FORBIDDEN` | 인증됐으나 **권한 관리 권한 부족**(§3.2) 또는 **시스템 역할 편집 시도**(§3.4) 또는 CSRF 실패 | 실패 토스트/모달 문구 |
| 404 | `ROLE_NOT_FOUND` | 역할 id 없음 | 실패 토스트 '역할을 찾을 수 없습니다.' |
| 409 | `ROLE_NAME_DUPLICATED` | 정규화된 이름 중복 | 모달 안 문구(FS-006-EL-006.2) |
| 422 | `LAST_ROLE_PROTECTED` | 마지막 남은 역할 삭제 시도 | 실패 토스트(FS-006-EL-007.3) |
| 429 | `RATE_LIMITED` | 레이트리밋 초과. `Retry-After` 동반 | 재시도 안내 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | 일반 문구 + `traceId` |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 상한 초과 | 500 과 동일 |

## 3. 인증 · 권한 모델 · ⚠ 서버 강제 (이 문서의 핵심)

### 3.1 역할

| 역할 | 설명 | 비고 |
|---|---|---|
| 권한 관리 리소스의 `update` 권한을 가진 역할 | 역할을 만들고·고치고·지우고·권한 매트릭스를 저장할 수 있다 | 권한을 부여하는 권한이므로 **가장 민감한 권한**이다 |
| 권한 관리 리소스의 `read` 권한만 가진 역할 | 역할 목록·매트릭스를 조회만 할 수 있다. 쓰기(§4 EP-02~06)는 **403** | 화면은 편집 컨트롤을 그대로 보여주지만, 서버가 저장을 거절한다(프론트에 role 분기 없음 — FS-006 §4.1) |
| 권한 관리 read 권한이 없는 역할 | `/users/roles` 리소스에 접근할 수 없다 | `GET /api/roles` → 403 (§3.2) |

### 3.2 403 vs 404 은닉 정책

| 리소스 | 권한 부족 시 응답 | 근거 |
|---|---|---|
| `GET /api/roles` (컬렉션) | 403 `FORBIDDEN` | 역할 컬렉션의 존재는 비밀이 아니다. 역할 정의는 개인정보가 아니다 |
| `POST /api/roles` · `PUT /api/roles/:id/*` · `DELETE /api/roles/:id` (쓰기) | 403 `FORBIDDEN` | 권한 관리 read 권한이 있는 주체는 역할의 존재를 이미 안다. 쓰기 권한만 없어 거절될 때 404 로 숨기면 정당한 운영자가 권한 문제를 인지하지 못한다 |

역할 id 는 열거해도 개인정보가 노출되지 않으므로 404 은닉을 쓰지 않는다 — 회원 도메인(BE-003 §3.2)과 다른 지점이다.

### 3.3 CSRF

세션 쿠키 인증이므로 상태 변경 요청(POST · PATCH · PUT · DELETE)은 `X-CSRF-Token` 헤더를 요구한다. 누락·불일치 시 `403 CSRF_TOKEN_INVALID`. 어댑터가 붙을 때 본문이 헤더를 싣는다(BE-003 §3.3 과 동일).

### 3.4 ⚠ 서버 강제 — 프론트 권한은 보안 경계가 아니다 (판정)

**FS-006 이 편집하는 매트릭스·scope·위젯은 UI 를 그리는 규칙일 뿐이며, 서버 접근을 막지 못한다.** 실제 강제는 아래 다섯 가지를 서버가 매 요청마다 판정하는 것으로만 성립한다.

1. **모든 API 요청은 세션 주체의 유효 권한을 서버가 재판정한다.** 프론트가 '이 버튼을 숨겼다/보였다' 는 것은 접근 여부와 무관하다. 어떤 도메인의 어떤 엔드포인트든(회원 삭제·적립금 조정·내보내기 등) 호출 시점에 서버가 세션 역할의 리소스×액션을 확인하고, 부족하면 403(개별 회원 리소스는 404 은닉 — BE-003 §3.2)을 반환한다. **프론트에서 체크를 켰다는 사실이 서버 판정을 대신하지 않는다.**
2. **scope(데이터 접근 범위)는 클라이언트가 보낸 값을 신뢰하지 않는다.** 목록·상세 질의의 실제 필터링은 서버가 하며, scope 는 **세션 주체의 역할에서 서버가 다시 읽는다**(`roles.ts` TODO 주석 명시). 요청 바디·쿼리에 실린 scope 를 필터 조건으로 쓰지 않는다 — 그러면 own 역할이 all 을 요청해 전체 데이터를 읽을 수 있다.
3. **의존 규칙을 서버가 강제한다.** 프론트 모델(`enforceMatrix`)이 'read=false 면 나머지 액션 off / 그룹=자식 합집합' 을 강제하지만, 이는 UI 편의다. `PUT /api/roles/:id/permissions` 는 crafted 바디(read=false 인데 update=true)를 받으면 **서버가 동일 규칙으로 정규화하거나 400 으로 거절**해야 한다. 저장값이 모순 상태로 남으면 서버 판정 ①이 그 모순을 그대로 읽게 된다.
4. **시스템 역할 편집을 서버가 거절한다.** 슈퍼어드민(시스템 역할)의 이름 변경·삭제·권한 수정·scope 변경은 프론트에서 비활성이지만, 서버는 해당 역할 id 에 대한 쓰기 요청을 **403 `SYSTEM_ROLE_IMMUTABLE`** 로 거절해야 한다. 프론트 비활성은 우회 가능하다.
5. **적용 역할 전환(activate)은 세션 범위여야 한다.** 유효 권한을 결정하는 '적용 중 역할' 은 요청 주체 자신에게만 적용되며, 서버가 그 주체의 세션에 묶어 관리한다. 전역 싱글턴으로 두면 한 관리자의 전환이 다른 관리자의 권한을 바꾼다(§7.2 판정 참조).

### 3.5 타임아웃 상한

| 계열 | 서버 처리 상한 | 초과 시 | 프론트 상한(권고) |
|---|---|---|---|
| 조회(역할 목록) | 5초 | 504 `REQUEST_TIMEOUT` | 10초 (현재 상한 없음 — §7.6) |
| 쓰기(생성·이름·삭제·권한 저장·적용) | 5초 | 504 `REQUEST_TIMEOUT` | 10초 |

## 4. 엔드포인트 명세

### BE-006-EP-01 · 역할 목록 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-006-EL-001, FS-006-EL-001.4, FS-006-EL-003, FS-006-EL-004, FS-006-EL-005 |
| 메서드 · 경로 | `GET /api/roles` |
| 권한 | 권한 관리 리소스 `read` |
| 멱등성 | 멱등 (GET). 재시도 안전 |
| 페이징 | 없음 — 전량 반환. **역할 수 상한 100개**(FS-006 §7 #4 를 서버가 막는다) |
| 레이트리밋 | 관리자당 분당 60회 |

**응답 200** — `RoleState`

```json
{
  "version": 2,
  "roles": [
    {
      "id": "role-super-admin",
      "name": "슈퍼어드민(전체권한)",
      "system": true,
      "scope": "all",
      "permissions": { "group:/users": { "read": true, "create": true, "update": true, "remove": true, "export": true }, "page:/users/members": { "read": true, "create": true, "update": true, "remove": true, "export": true } },
      "widgets": { "dashboard.todo": true }
    }
  ],
  "activeRoleId": "role-operator"
}
```

| 필드 | 타입 (roles.ts) | 설명 |
|---|---|---|
| `version` | `2` | 저장 형태 버전. 서버가 마이그레이션 후 최신 버전을 내려준다 |
| `roles` | `readonly Role[]` | 역할 배열. 각 `Role` = `{ id, name, system, scope, permissions, widgets }` |
| `roles[].permissions` | `PermissionMatrix` = `Record<ResourceId, Record<PermissionAction, boolean>>` | 리소스 id(`group:<basePath>` \| `page:<to>`) → 액션 5종 on/off. **서버가 의존 규칙을 정규화해 내려준다** |
| `roles[].widgets` | `WidgetMap` = `Record<DashboardWidgetKey, boolean>` | 위젯 7종 노출 맵 |
| `activeRoleId` | string | 요청 주체 세션에 적용 중인 역할 id (§3.4 ⑤ — 세션 범위) |

- 리소스 id 는 `nav-config` 파생값(`group:/users`·`page:/users/members` 등)이다. 프론트가 `resources.ts` 에서 같은 규칙으로 리소스를 만들므로 키가 일치한다.
- 시스템 역할은 저장값과 무관하게 **항상 전 권한 ON** 으로 내려온다(`normalizeRole` — 서버도 동일 강제).

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | 권한 관리 read 권한 부족 (컬렉션은 은닉하지 않는다 — §3.2) |
| 429 | `RATE_LIMITED` | 분당 60회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

---

### BE-006-EP-02 · 역할 생성

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-006-EL-006.5 (create) |
| 메서드 · 경로 | `POST /api/roles` |
| 권한 | 권한 관리 리소스 `update` |
| 멱등성 | **비멱등**. 이름 유니크 제약(409)이 중복 생성을 차단한다. 멱등키를 요구하지 않는다 |
| 페이징 | N/A — 단건 생성 |
| 레이트리밋 | 관리자당 분당 20회 |

**요청 — 바디**

| 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|
| `name` | string | O | 앞뒤 공백 제거 후 1–30자(`ROLE_NAME_MAX_LENGTH`). 정규화(공백 제거+대소문자 무시) 중복 금지 |

**응답 201** — 생성된 `Role`. 새 역할은 **전 권한 OFF · 전 위젯 OFF · scope='all'** 로 시작한다(최소 권한 — FS-006-EL-006.3). `Location: /api/roles/<id>` 헤더 동반.

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `name` 공백·30자 초과·제어문자. `error.fields[].name = "name"` |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | 권한 관리 update 권한 부족 |
| 403 | `CSRF_TOKEN_INVALID` | `X-CSRF-Token` 누락·불일치 |
| 409 | `ROLE_NAME_DUPLICATED` | 정규화된 이름이 이미 있다 |
| 422 | `ROLE_LIMIT_EXCEEDED` | 역할 수 상한 100개 도달 |
| 429 | `RATE_LIMITED` | 분당 20회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

---

### BE-006-EP-03 · 역할 이름 · scope 변경

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-006-EL-006.5 (rename) · FS-006-EL-003.3 (scope) |
| 메서드 · 경로 | `PATCH /api/roles/:id` |
| 권한 | 권한 관리 리소스 `update` |
| 멱등성 | 멱등 (PATCH — 같은 바디 재요청은 같은 상태). 이름 유니크 제약은 별개 |
| 페이징 | N/A |
| 레이트리밋 | 관리자당 분당 60회 |

**요청 — 경로 / 바디**

| 위치 | 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|---|
| 경로 | `id` | string | O | 역할 id |
| 바디 | `name` | string | X | 앞뒤 공백 제거 후 1–30자. 자기 자신 제외 중복 금지 |
| 바디 | `scope` | `RoleScope` | X | `all` \| `department` \| `own` |

- `name` 과 `scope` 중 최소 하나를 보낸다. **시스템 역할이면 403 `SYSTEM_ROLE_IMMUTABLE`**(§3.4 ④).
- **scope 저장은 표시일 뿐이며, 조회 질의의 필터는 서버가 세션 역할에서 scope 를 다시 읽어 강제한다**(§3.4 ②). 클라이언트가 보낸 scope 를 다른 도메인 조회의 필터로 그대로 신뢰하지 않는다.

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `name`·`scope` 제약 위반 |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | update 권한 부족 |
| 403 | `SYSTEM_ROLE_IMMUTABLE` | 시스템 역할 편집 시도 (§3.4 ④) |
| 403 | `CSRF_TOKEN_INVALID` | CSRF 헤더 누락·불일치 |
| 404 | `ROLE_NOT_FOUND` | 역할 id 없음 |
| 409 | `ROLE_NAME_DUPLICATED` | 정규화된 이름 중복 |
| 429 | `RATE_LIMITED` | 분당 60회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

---

### BE-006-EP-04 · 역할 권한 매트릭스 · 위젯 저장

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-006-EL-004.2, FS-006-EL-004.3, FS-006-EL-004.5, FS-006-EL-004.6, FS-006-EL-005.1, FS-006-EL-005.2 |
| 메서드 · 경로 | `PUT /api/roles/:id/permissions` |
| 권한 | 권한 관리 리소스 `update` |
| 멱등성 | **멱등** (PUT — 전체 매트릭스를 통째로 대체). 프론트가 토글마다 전체 상태를 보내므로 재전송이 안전하다 |
| 페이징 | N/A |
| 레이트리밋 | 관리자당 분당 120회 (토글마다 저장되므로 넉넉히) |

**요청 — 경로 / 바디**

| 위치 | 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|---|
| 경로 | `id` | string | O | 역할 id |
| 바디 | `permissions` | `PermissionMatrix` | O | 리소스 id → 액션 5종 맵. 알 수 없는 리소스 id 는 서버가 버린다 |
| 바디 | `widgets` | `WidgetMap` | O | 위젯 7종 노출 맵. 알 수 없는 키는 버린다 |

- **서버가 의존 규칙을 재강제한다(§3.4 ③)**: read=false 인 리소스의 나머지 액션은 off 로 정규화하고, 그룹 리소스 권한은 자식 합집합으로 다시 계산한다. crafted 바디를 그대로 저장하지 않는다.
- **시스템 역할이면 403 `SYSTEM_ROLE_IMMUTABLE`**.

**응답 200** — 정규화 후 저장된 `Role`(프론트가 표시 상태를 서버 정본으로 되돌릴 수 있게).

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `permissions`·`widgets` 형식 위반(액션 키·boolean 아님) |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | update 권한 부족 |
| 403 | `SYSTEM_ROLE_IMMUTABLE` | 시스템 역할 편집 시도 |
| 403 | `CSRF_TOKEN_INVALID` | CSRF 헤더 누락·불일치 |
| 404 | `ROLE_NOT_FOUND` | 역할 id 없음 |
| 429 | `RATE_LIMITED` | 분당 120회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

---

### BE-006-EP-05 · 역할 삭제

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-006-EL-007.3 |
| 메서드 · 경로 | `DELETE /api/roles/:id` |
| 권한 | 권한 관리 리소스 `update` |
| 멱등성 | **멱등**. 이미 삭제된 역할 재요청은 상태를 바꾸지 않고 204 를 반환한다 |
| 페이징 | N/A |
| 레이트리밋 | 관리자당 분당 20회 |

**요청 — 경로**: `id`(역할 id).

**응답 204** — 본문 없음.

- **시스템 역할이면 403 `SYSTEM_ROLE_IMMUTABLE`.**
- **마지막 남은 역할이면 422 `LAST_ROLE_PROTECTED`** — 권한 없는 상태로 남지 않게 한다(FS-006-EL-007.3).
- 삭제된 역할이 어떤 주체의 적용 역할이었으면, 그 주체의 세션 적용 역할을 **남은 첫 역할로** 전환한다(FS-006-EL-007.1). 삭제 행위는 감사 로그에 남긴다(행위자 id · 대상 역할 id · 시각 · `traceId`).

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | update 권한 부족 |
| 403 | `SYSTEM_ROLE_IMMUTABLE` | 시스템 역할 삭제 시도 |
| 403 | `CSRF_TOKEN_INVALID` | CSRF 헤더 누락·불일치 |
| 404 | `ROLE_NOT_FOUND` | 존재한 적 없는 id (이미 삭제는 204) |
| 422 | `LAST_ROLE_PROTECTED` | 마지막 남은 역할 삭제 시도 |
| 429 | `RATE_LIMITED` | 분당 20회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

---

### BE-006-EP-06 · 적용 역할 전환

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-006-EL-003.2 |
| 메서드 · 경로 | `PUT /api/roles/active` |
| 권한 | 권한 관리 리소스 `read` (자신의 세션 적용 역할 전환) |
| 멱등성 | **멱등** (PUT — 같은 roleId 재요청은 같은 상태) |
| 페이징 | N/A |
| 레이트리밋 | 관리자당 분당 30회 |

**요청 — 바디**: `{ "roleId": "<역할 id>" }`.

**응답 200** — `{ "activeRoleId": "<역할 id>" }`.

- **세션 범위다(§3.4 ⑤ · §7.2)**: 이 전환은 요청 주체 자신의 세션에만 적용되며 다른 관리자의 유효 권한을 바꾸지 않는다. 전역 싱글턴으로 구현하지 않는다.
- 존재하지 않는 roleId 는 404. 전환 후 이 주체의 후속 API 요청은 새 역할의 권한으로 판정된다(§3.4 ①).

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `roleId` 누락·형식 위반 |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 |
| 403 | `FORBIDDEN` | 권한 관리 read 권한 부족 |
| 403 | `CSRF_TOKEN_INVALID` | CSRF 헤더 누락·불일치 |
| 404 | `ROLE_NOT_FOUND` | roleId 없음 |
| 429 | `RATE_LIMITED` | 분당 30회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 504 | `REQUEST_TIMEOUT` | 서버 처리 5초 초과 |

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| BE-006-EP-01 역할 목록 | N/A — 파라미터가 없다 | 401 `UNAUTHENTICATED`. 프론트는 로컬 폴백으로 기본 역할을 보인다(현재) | **403** — 컬렉션 존재는 비밀이 아니다 (§3.2) | N/A — 컬렉션은 항상 존재한다. 역할은 최소 1개다 | N/A — 읽기 전용이라 충돌이 없다 | N/A — 조회에 상태 전제가 없다 | 429 + `Retry-After`. 분당 60회 | 500 + `traceId`. 원인 노출 금지 | 서버 5초 → 504. 프론트 권고 10초 |
| BE-006-EP-02 역할 생성 | `name` 공백·30자·제어문자 → 400 + `fields[name]` | 401 `UNAUTHENTICATED` | **403** — 컬렉션 쓰기. update 권한 부족 → 403 (§3.2). CSRF 실패 → 403 | N/A — 생성이라 대상 리소스가 없는 것이 정상 | **409 `ROLE_NAME_DUPLICATED`** — 정규화 이름 중복. 유니크 제약이 판정 | **422 `ROLE_LIMIT_EXCEEDED`** — 역할 수 상한 100개 | 429 + `Retry-After`. 분당 20회 | 500 + `traceId`. 모달·입력값 유지 | 서버 5초 → 504. 프론트 권고 10초 |
| BE-006-EP-03 이름·scope 변경 | `name`·`scope` 위반 → 400 + `fields` | 401 `UNAUTHENTICATED` | update 부족 → **403**. **시스템 역할 편집 → 403 `SYSTEM_ROLE_IMMUTABLE`**(§3.4 ④). CSRF → 403 | **404 `ROLE_NOT_FOUND`** — 없는 역할 id | **409 `ROLE_NAME_DUPLICATED`** — 자기 자신 제외 중복 | N/A — 이름·scope 변경에 별도 상태 전제가 없다 | 429 + `Retry-After`. 분당 60회 | 500 + `traceId` | 서버 5초 → 504. 프론트 권고 10초 |
| BE-006-EP-04 매트릭스·위젯 저장 | `permissions`·`widgets` 형식 위반 → 400 | 401 `UNAUTHENTICATED` | update 부족 → **403**. **시스템 역할 저장 → 403**. CSRF → 403 | **404 `ROLE_NOT_FOUND`** — 없는 역할 id | N/A — PUT 전체 대체라 병합 충돌이 없다. 마지막 저장이 이긴다(경합은 §7.4) | N/A — 매트릭스 저장에 상태 전제가 없다. 의존 규칙 위반은 400 이 아니라 **서버가 정규화**한다(§3.4 ③) | 429 + `Retry-After`. 분당 120회 | 500 + `traceId` | 서버 5초 → 504. 프론트 권고 10초 |
| BE-006-EP-05 역할 삭제 | 경로 `id` 형식 위반 → 400 | 401 `UNAUTHENTICATED` | update 부족 → **403**. **시스템 역할 삭제 → 403**. CSRF → 403 | **404 `ROLE_NOT_FOUND`** — 존재한 적 없는 id. **이미 삭제는 204(멱등)** | N/A — DELETE 멱등. 동시 요청은 역할 단위 원자 연산으로 직렬화 | **422 `LAST_ROLE_PROTECTED`** — 마지막 남은 역할 | 429 + `Retry-After`. 분당 20회 | 500 + `traceId` | 서버 5초 → 504. 프론트 권고 10초 |
| BE-006-EP-06 적용 역할 전환 | `roleId` 누락·형식 → 400 | 401 `UNAUTHENTICATED` | read 부족 → **403**. CSRF → 403 | **404 `ROLE_NOT_FOUND`** — 없는 roleId | N/A — PUT 멱등. 세션 단위라 다른 주체와 충돌하지 않는다(§3.4 ⑤) | N/A — 전환에 상태 전제가 없다 | 429 + `Retry-After`. 분당 30회 | 500 + `traceId` | 서버 5초 → 504. 프론트 권고 10초 |

## 6. 프론트 연동 대조

프론트에 `data-source.ts` 어댑터가 **없다.** 아래는 `PermissionProvider`(localStorage)의 함수가 어느 엔드포인트로 승격되는지의 대조다 — 어댑터를 신설할 때 이 표를 시그니처의 출발점으로 쓴다.

| PermissionProvider 함수 | 현재 저장 | 엔드포인트 | 요청 | 응답 | 필드 일치 |
|---|---|---|---|---|---|
| `loadState()` | `localStorage` 읽기 | BE-006-EP-01 | 없음 | `RoleState` | O (형태 그대로) |
| `createRole(name)` | `saveState` | BE-006-EP-02 | `{ name }` | `Role` (201) | O |
| `renameRole(id, name)` · `setScope(scope)` | `saveState` | BE-006-EP-03 | `{ name? , scope? }` | `Role` | O |
| `setResourceAction` · `setActionForAll` · `setAllPermissions` · `setWidget` · `setAllWidgets` | `saveState` | BE-006-EP-04 | `{ permissions, widgets }` | `Role` | O (토글마다 전체 매트릭스 전송) |
| `deleteRole(id)` | `saveState` | BE-006-EP-05 | 경로 `id` | `void` (204) | O |
| `activateRole(id)` | `saveState` | BE-006-EP-06 | `{ roleId }` | `{ activeRoleId }` | O |

### 6.1 어댑터 신설 시 요구사항

| 요구사항 | 내용 |
|---|---|
| CSRF 헤더 | EP-02~06 쓰기 요청에 `X-CSRF-Token` 을 싣는다 (§3.3) |
| 로컬 폴백 제거 | `localStorage` 는 서버 SSOT 로 대체된다(§7.3). 오프라인 캐시로만 쓰거나 제거한다 |
| 로딩·실패·경합 처리 | 현재 즉시 저장 UX 가 서버 왕복으로 바뀌므로 진행 표시·실패 통지·낙관적 갱신 롤백이 필요하다(FS-006 §7 #3) |

## 7. 핵심 판정 (⚠ 보안 — 근거를 남긴다)

### 7.1 프론트 권한은 보안 경계가 아니다 — 서버 강제가 유일한 보증

FS-006 이 편집하는 매트릭스·scope·위젯은 **UI 를 그리는 규칙**이다. 사이드바에서 메뉴를 숨기고 버튼을 비활성하지만, 그것은 **접근을 막지 않는다** — 사용자는 URL 을 직접 치거나 API 를 직접 호출할 수 있다. 따라서 §3.4 의 다섯 강제(요청마다 재판정 · scope 서버 재도출 · 의존 규칙 서버 강제 · 시스템 역할 서버 거절 · 적용 역할 세션 범위)가 **실제 보안의 전부**다. 이 문서가 정의하는 것은 화면의 저장 계약이 아니라, **그 저장값을 서버가 어떻게 신뢰하지 않는가**이다.

### 7.2 적용 역할은 세션 범위여야 한다 — 현재 전역 싱글턴은 결함

현재 구현은 `activeRoleId` 를 `localStorage` 의 전역 값으로 둔다. 관리자 앱을 여러 사람이 쓰는데 '적용 중 역할' 이 하나뿐이면, **한 관리자가 역할을 전환하면 그것이 곧 앱 전체의 유효 권한**이 된다(그 브라우저 한정이지만, 서버 연동 시 전역이 되면 모두에게 영향). 올바른 모델은 **주체별 역할 배정**(FS-005 도메인)이고, 유효 권한은 그 주체에게 배정된 역할에서 나와야 한다. 이 화면의 '적용 중' 은 역할 정의를 시험해보는 **미리보기 장치**로 한정하고, 실제 유효 권한은 세션 주체의 배정 역할에서 서버가 도출해야 한다 — §7.5 로 이관한다.

### 7.3 localStorage 는 SSOT 가 될 수 없다

권한은 현재 브라우저 `localStorage`(`tds-admin.roles`)에만 있다. 그 결과 **권한이 브라우저마다 다르다**: A 관리자가 만든 역할을 B 관리자는 볼 수 없고, 같은 사람이 다른 기기로 로그인하면 기본 역할 3종으로 시작한다. 권한은 조직 전체가 공유하는 정책이므로 **서버가 SSOT** 여야 한다. BE-006-EP-01~06 이 그 SSOT 의 계약이다. `localStorage` 는 서버 연동 후 오프라인 캐시로만 쓰거나 제거한다.

### 7.4 매트릭스 저장은 전체 대체(PUT) — 마지막 저장이 이긴다

`PUT /api/roles/:id/permissions` 는 매트릭스를 통째로 대체한다. 두 관리자가 같은 역할을 동시에 편집하면 마지막 저장이 이긴다(낙관적 잠금 없음). 근거: 프론트가 토글마다 전체 매트릭스를 보내므로 부분 병합 충돌이 없고, 권한 편집은 드문 관리 작업이라 낙관적 잠금(ETag)의 복잡성이 이득을 넘지 않는다. 동시 편집이 실제 문제가 되면 ETag 를 별도 계약으로 승격한다.

### 7.5 후속 이관 (아키텍처 · 백엔드 명세 · UI 기획)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | **적용 역할을 주체별 배정으로 전환** — 전역 싱글턴 `activeRoleId` 를 세션/주체 범위로. 유효 권한은 배정 역할에서 도출(§7.2) | 아키텍처 · 백엔드 명세 |
| 2 | **localStorage → 서버 SSOT 이관**(§7.3) — 어댑터 신설 + provider 의 저장 경로 교체 | 백엔드 명세 · 프론트 구현 |
| 3 | **서버 강제 5종 구현 검증**(§3.4) — 요청마다 재판정·scope 재도출·의존 규칙·시스템 역할·세션 적용을 서버가 실제로 강제하는지 보안 리뷰 이 검수 | 보안 리뷰 (보안 검수) |
| 4 | 401 감지 후 `/login?returnUrl=` 이동이 프론트에 없다(FS-006 §4.1) | UI 기획 · 프론트 구현 |
| 5 | 서버 연동 시 로딩·실패·경합 처리가 필요하다(FS-006 §7 #3) — 즉시 저장 UX 가 서버 왕복으로 바뀐다 | UI 기획 · 백엔드 명세 |
| 6 | 이 화면 자체의 접근·저장 권한(`권한 관리` read/update)을 프론트가 강제하지 않는다 — 서버가 강제(FS-006 §7 #5) | 백엔드 명세 |

### 7.6 타임아웃·인증 미결

401 세션 만료 감지·프론트 타임아웃 상한이 현재 구현에 없다(로컬 저장이라 발생하지 않지만, 서버 연동 시 필요). §3.5 의 권고 상한을 어댑터 신설 시 적용한다.

## 8. 자기 점검 (제출 전 확인)

- [x] FS-006 §5 의 서버 연동 요소가 **전부** 엔드포인트로 커버됐다 — 누락 0건 (§9)
- [x] 모든 엔드포인트가 `근거 (FS)` 에 FS 요소 번호를 역참조한다 — 고아 엔드포인트 0건 (6/6)
- [x] §5 예외 9축에 빈칸 0건. 모든 `N/A` 에 사유가 붙어 있다 (6행 × 9열 전수)
- [x] §2 공통 에러 봉투를 1회 정의했고, 각 엔드포인트는 에러코드 목록만 나열한다
- [x] §3.2 403 vs 404 은닉 정책이 리소스별로 명시됐고 §5 와 모순되지 않는다
- [x] §6 에서 `PermissionProvider` 의 모든 변경 함수가 매핑됐다(어댑터 부재를 명시). 필드명·타입 불일치 0건
- [x] 쓰기 엔드포인트마다 멱등성을 판정했다 (EP-02 유니크 / EP-03·04·05·06 멱등)
- [x] 목록 엔드포인트의 페이징 방식·상한을 명시했다 (EP-01 전량·100개 상한)
- [x] 500 응답 문구에 내부 정보가 없다
- [x] **서버 코드·저장소 설계를 쓰지 않았다** — 데이터 모델은 응답 스키마로만 드러난다
- [x] **⚠ 보안 판정(프론트 비보안경계·서버 재판정·scope 재도출·의존규칙·시스템역할·세션적용)을 §3.4·§7 에 명시적 절로 남겼다** (보안 리뷰 검수 대상)
- [x] 모호어 0건 — G9 #10 금지어 목록을 본문에서 1건도 쓰지 않았다

## 9. FS-006 §5 커버리지

| FS §5 요소번호 | 이름 | 커버 엔드포인트 |
|---|---|---|
| FS-006-EL-001 / 001.4 / 003 / 004 / 005 | 역할 목록 로드 | BE-006-EP-01 |
| FS-006-EL-003.2 | 역할 적용 | BE-006-EP-06 |
| FS-006-EL-003.3 | 데이터 접근 범위 저장 | BE-006-EP-03 (`scope`) |
| FS-006-EL-004.2 / 004.3 / 004.5 / 004.6 | 권한 매트릭스 저장 | BE-006-EP-04 (`permissions`) |
| FS-006-EL-005.1 / 005.2 | 대시보드 위젯 저장 | BE-006-EP-04 (`widgets`) |
| FS-006-EL-006.5 | 역할 생성 / 이름 변경 | BE-006-EP-02 (create) · BE-006-EP-03 (rename) |
| FS-006-EL-007.3 | 역할 삭제 | BE-006-EP-05 |

**누락 0건.** FS-006 §5 의 7개 행이 6개 엔드포인트로 전부 커버된다.
