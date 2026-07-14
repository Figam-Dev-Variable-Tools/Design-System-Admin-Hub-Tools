---
# ── D10 · Backend Spec (백엔드 기능 명세) 템플릿 ───────────────────────────
# 소유자: A63 (Backend Spec Writer) · 경로 규칙: specs/<라우트 경로>/BE-NNN-<slug>.md
# 게이트: G9 (승인자 A64 Spec Reviewer) · 체크리스트: docs/_templates/checklists/G9.md
id: BE-NNN
title: "<대상 화면명> 백엔드 기능 명세"
functionalSpec: FS-NNN        # 근거 기능 명세(D9) 역참조 — 번호를 FS와 동일하게 맞춘다
owner: A63
reviewer: A64
gate: G9
status: draft                 # draft | reviewed | approved
version: 1.0
date: YYYY-MM-DD
---

<!--
[작성 지침 — 문서 전체]

★ **백엔드를 구현하지 않는다. 명세만 쓴다.**
   - 서버 코드(컨트롤러·서비스·리포지토리·마이그레이션) 작성 금지 — 백엔드 개발자의 일이다.
   - **DB 스키마 설계 금지** — 저장소 선택·인덱스·정규화는 백엔드의 결정이다.
     데이터 모델은 오직 **응답 스키마로만** 드러난다.
   - 이 문서의 산출물 경계는 **API 계약**(요청 / 응답 / 에러 / 권한 / 멱등성 / 페이징)까지다.

★ **프론트가 이미 뚫어둔 연동 지점에서 출발한다.**
   `apps/admin/src/pages/<domain>/data-source.ts` 의 함수 시그니처와 `// TODO(backend):` 주석,
   그리고 `types.ts` 의 도메인 타입이 **프론트가 기대하는 계약의 초안**이다.
   백지에서 새 모양을 설계하지 않는다. 프론트를 바꿔야 할 이유가 있으면 A40에 change_request를 내고,
   임의로 다른 모양을 명세하지 않는다.

★ **추적성**: 모든 엔드포인트는 FS 요소 번호를 `근거` 로 역참조한다.
   근거 없는 엔드포인트 = 고아 엔드포인트 = G9 blocker.
   반대로 FS의 `[서버]` 요소가 엔드포인트로 커버되지 않으면 = 누락 = G9 blocker.

★ **빈칸 금지**: 모든 표의 셀을 채운다. 해당 없음이면 `N/A — <사유>`.
★ **모호어 0건**: `적절히`, `직관적으로`, `필요 시`, `알아서`.
-->

# BE-NNN. <대상 화면명> 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-NNN <화면명> (`/<route>`) |
| 범위 | <채울 것 — 예: 회원 목록 조회·검색·필터·내보내기, 회원 상세 조회, 적립금 증감, 메모 저장, 회원 삭제> |
| 범위 밖 | <채울 것 — 예: 회원 생성. 고객은 회원가입으로만 유입되므로 관리자 생성 API는 계약에 존재하지 않는다> |
| 전제 | <채울 것 — 예: 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스> |
| 프론트 어댑터 | `apps/admin/src/pages/<domain>/data-source.ts` |
| 도메인 타입 | `apps/admin/src/pages/<domain>/types.ts` |

## 2. 공통 에러 봉투

<!-- **에러 응답 형식은 전 엔드포인트가 동일해야 한다.** 여기서 한 번 정의하고,
     각 엔드포인트(§4)는 발생 가능한 **에러코드 목록만** 나열한다.
     엔드포인트마다 다른 모양의 에러를 내면 프론트가 엔드포인트마다 다른 파서를 갖게 된다. -->

모든 4xx / 5xx 응답은 아래 봉투를 따른다. 예외 없다.

```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "회원을 찾을 수 없습니다.",
    "fields": [
      { "name": "amount", "code": "OUT_OF_RANGE", "message": "1 이상 1,000,000 이하여야 합니다." }
    ],
    "traceId": "01J8X4K2M9P7Q3R5S6T8V0W2Y4"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `error.code` | string | O | 기계 판정용 에러코드 (SCREAMING_SNAKE_CASE). 프론트 분기의 유일한 근거 |
| `error.message` | string | O | 사용자에게 그대로 보여줄 수 있는 문구. **내부 정보(스택·쿼리·경로) 노출 금지** |
| `error.fields` | array \| null | X | 400/422 검증 실패 시에만. 프론트가 입력 필드에 매핑한다 |
| `error.traceId` | string | O | 로그 상관관계 ID. 500 문의 시 사용자가 그대로 전달한다 |

### 2.1 공통 에러코드

<!-- 전 엔드포인트에서 발생할 수 있는 코드. 엔드포인트 고유 코드는 §4의 각 '에러 목록'에 쓴다. -->

| HTTP | 에러코드 | 발생 조건 | 프론트 처리 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 요청 파라미터가 제약 위반 | `error.fields` 를 입력 필드에 매핑해 표시 |
| 401 | `UNAUTHENTICATED` | 세션 없음·만료 | `/login?returnUrl=<현재경로>` 로 이동 |
| 403 | `FORBIDDEN` | 인증됐으나 역할 부족 (존재 은닉 불필요한 리소스) | 권한 없음 화면 렌더 |
| 404 | `NOT_FOUND` | 대상 리소스 없음 (또는 은닉 정책상 403 대신 404) | 목록으로 복귀 + 안내 |
| 409 | `CONFLICT` | 동시 수정·중복 생성 | 최신 상태 재조회 후 재시도 안내 |
| 422 | `UNPROCESSABLE` | 형식은 맞으나 상태 위반 | 상태별 안내 문구 표시 |
| 429 | `RATE_LIMITED` | 레이트리밋 초과 | `Retry-After` 초 뒤 재시도 안내 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | 일반 문구 + `traceId` 표시. **원인 노출 금지** |

## 3. 인증 · 권한 모델

### 3.1 역할

| 역할 | 설명 | 비고 |
|---|---|---|
| <채울 것 — 예: admin> | <채울 것 — 예: 전체 권한> | |
| <채울 것 — 예: operator> | <채울 것 — 예: 조회·메모 저장만> | |

### 3.2 403 vs 404 은닉 정책

<!-- **리소스의 존재 자체를 숨겨야 하는가**를 리소스별로 확정한다.
     "권한 없으면 403" 이라고만 쓰면, 공격자가 403/404 차이로 리소스 존재를 열거할 수 있다.
     반대로 전부 404로 숨기면 정당한 운영자가 권한 문제를 인지하지 못한다. 둘 중 하나를 **명시적으로** 고른다. -->

| 리소스 | 권한 부족 시 응답 | 근거 |
|---|---|---|
| <채울 것 — 예: /api/members/:id> | <채울 것 — 예: 404 NOT_FOUND> | <채울 것 — 예: 회원 id 열거를 막는다. 존재 여부 자체가 개인정보> |
| <채울 것 — 예: /api/members (목록)> | <채울 것 — 예: 403 FORBIDDEN> | <채울 것 — 예: 컬렉션 존재는 비밀이 아니다> |

## 4. 엔드포인트 명세

<!-- 엔드포인트마다 아래 블록을 **빠짐없이** 채운다. 항목 하나라도 비면 G9 blocker.
     경로는 **리소스 중심**이다 — `/api/getMemberList` 같은 동사 경로 금지.
     응답 스키마의 필드명·타입은 프론트 `types.ts` 와 **정확히 일치**해야 한다 (불일치 = major). -->

### BE-NNN-EP-01 · 회원 목록 조회

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-NNN-EL-001, FS-NNN-EL-002, FS-NNN-EL-003, FS-NNN-EL-008 |
| 메서드 · 경로 | `GET /api/members` |
| 권한 | admin, operator |
| 멱등성 | 멱등 (GET). 재시도 안전 |
| 페이징 | offset 방식. `page` 1-base, `size` 기본 10 · 상한 100 (프론트 `PAGE_SIZE = 10`) |

**요청 — 쿼리**

| 이름 | 타입 | 필수 | 제약 | 설명 |
|---|---|---|---|---|
| `tier` | string | X | `all` \| `normal` \| `vip` \| `vvip` (기본 `all`) | 등급 필터 |
| `keyword` | string | X | 0–50자. 공백 trim | 닉네임·계정 부분 일치 |
| `page` | number | X | 정수 ≥ 1 (기본 1) | 페이지 번호 |
| `size` | number | X | 정수 1–100 (기본 10) | 페이지 크기 |

**응답 200**

```json
{
  "members": [
    {
      "id": "m-001",
      "nickname": "테스터",
      "account": "test@example.com",
      "tier": "vip",
      "group": "일반",
      "joinedAt": "2026-03-02",
      "joinedAtIso": "2026-03-02T09:14:00+09:00",
      "points": 12000,
      "activity": { "posts": 3, "comments": 12, "reviews": 1, "inquiries": 0 },
      "totalPurchase": 480000,
      "memo": ""
    }
  ],
  "counts": { "all": 128, "normal": 90, "vip": 30, "vvip": 8 },
  "total": 42
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `members` | `Member[]` | 현재 페이지의 회원. `types.ts` 의 `Member` 와 필드명·타입 일치 |
| `counts` | `TierCounts` | 등급별 **전체** 건수. **검색·필터와 무관하게 전체 기준** (좌측 필터 배지가 흔들리면 안 된다) |
| `total` | number | 필터·검색 **적용 후** 전체 건수 (페이지네이션용) |

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `tier` 가 enum 밖 / `page` < 1 / `size` > 100 |
| 401 | `UNAUTHENTICATED` | 세션 없음 |
| 403 | `FORBIDDEN` | 역할 부족 (컬렉션은 은닉하지 않는다 — §3.2) |
| 429 | `RATE_LIMITED` | 분당 <채울 것>회 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |

---

### BE-NNN-EP-02 · 적립금 지급 / 차감

| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-NNN-EL-0nn <채울 것> |
| 메서드 · 경로 | `POST /api/members/:id/points` |
| 권한 | admin (operator 차단) |
| 멱등성 | **비멱등** — 재시도 시 중복 지급 위험. `Idempotency-Key` 헤더 필수 (UUID v4, 24h 보존) |
| 페이징 | N/A — 단건 생성 |

**요청 — 경로 / 바디**

| 위치 | 이름 | 타입 | 필수 | 제약 |
|---|---|---|---|---|
| 경로 | `id` | string | O | 회원 ID |
| 바디 | `kind` | string | O | `grant` \| `deduct` |
| 바디 | `amount` | number | O | 정수 1 – 1,000,000 (부호 없음. 부호는 `kind` 가 결정) |
| 바디 | `reason` | string | O | 1–<채울 것>자 |

**응답 200** — 생성된 내역 1행 (`types.ts` 의 `PointEntry`)

```json
{ "id": "pe-9001", "date": "2026-07-14", "reason": "이벤트 보상", "orderNo": null, "amount": 5000 }
```

`amount` 는 **부호 포함** — `grant` 는 양수, `deduct` 는 음수로 내려준다 (프론트가 부호를 만들지 않는다).

**에러 목록**

| HTTP | 에러코드 | 조건 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `amount` 범위 밖 / `kind` enum 밖 / `reason` 공백 |
| 401 | `UNAUTHENTICATED` | 세션 없음 |
| 404 | `NOT_FOUND` | 회원 없음 **또는** 권한 부족 (§3.2 은닉 정책) |
| 409 | `IDEMPOTENCY_CONFLICT` | 동일 `Idempotency-Key` 로 다른 바디 재요청 |
| 422 | `MEMBER_WITHDRAWN` | 탈퇴 회원에게 적립금 증감 시도 |
| 422 | `INSUFFICIENT_POINTS` | 차감액 > 보유 적립금 |
| 429 | `RATE_LIMITED` | 레이트리밋 초과 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |

---

<!-- 나머지 엔드포인트는 위 블록을 복제해 채운다. FS의 §5(서버 연동 지점) 행이
     전부 하나 이상의 엔드포인트로 덮일 때까지 반복한다.
     BE-NNN-EP-03 · <채울 것>
     BE-NNN-EP-04 · <채울 것> ... -->

## 5. 예외 매트릭스

<!-- ★ 엔드포인트별 예외 9축. **"정상 동작"은 명세의 절반도 안 된다.**
     빈칸 금지 — 해당 없으면 `N/A — <사유>`. 빈칸 1건 = G9 blocker.

     축이 확정하는 것:
       400        검증 실패 — 어떤 필드가 왜 틀렸는지 프론트가 필드에 매핑 가능한 형태인가
       401        인증 없음 — 프론트는 /login?returnUrl= 로 보낸다
       403 vs 404 권한 부족 — **리소스 존재를 숨겨야 하는가** (§3.2와 일치해야 한다)
       404        대상 없음 — 삭제된 리소스와 애초에 없던 리소스를 구분하는가
       409        충돌 — 동시 수정·중복 생성. 낙관적 잠금(버전/ETag) 필요 여부
       422        상태 위반 — 예: 이미 탈퇴한 회원에게 알림 발송
       429        과부하 — 레이트리밋 기준과 재시도 안내
       500        서버 오류 — 프론트 문구 일반화(내부 정보 노출 금지), traceId 반환
       타임아웃    프론트 상한(예: 10초)과 서버 상한이 어긋나지 않는지 -->

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| BE-NNN-EP-01 | <채울 것 — 예: tier/page/size 위반 시 fields 에 필드명 반환> | <채울 것> | <채울 것 — 예: 403 (컬렉션 은닉 불필요)> | N/A — <사유: 컬렉션은 항상 존재, 0건은 빈 배열> | N/A — <사유: 읽기 전용> | N/A — <사유> | <채울 것> | <채울 것 — 예: traceId 반환, 프론트는 EL-006 배너> | <채울 것 — 예: 서버 5s / 프론트 10s> |
| BE-NNN-EP-02 | <채울 것> | <채울 것> | <채울 것 — 예: 404 은닉> | <채울 것 — 예: 삭제 회원과 미존재 회원 모두 NOT_FOUND (구분하지 않음)> | <채울 것 — 예: Idempotency-Key 충돌 시 409> | <채울 것 — 예: 탈퇴 회원 422, 잔액 부족 422> | <채울 것> | <채울 것> | <채울 것> |
| BE-NNN-EP-03 | <채울 것> | <채울 것> | <채울 것> | <채울 것> | <채울 것> | <채울 것> | <채울 것> | <채울 것> | <채울 것> |

## 6. 프론트 연동 대조

<!-- 프론트 `data-source.ts` 의 **모든** export 함수가 이 표에 나타나야 한다.
     매핑되지 않은 함수가 있으면 = 엔드포인트 누락. 매핑되지 않은 엔드포인트가 있으면 = 고아.
     `필드 일치` 열은 응답 스키마의 필드명·타입이 `types.ts` 와 일치하는지 O/X 로 판정한다
     (X = major — 프론트를 바꿔야 한다면 A40에 change_request). -->

| data-source.ts 함수 시그니처 | TODO(backend) 주석 | 엔드포인트 | 요청 타입 | 응답 타입 (types.ts) | 필드 일치 |
|---|---|---|---|---|---|
| `fetchMembers(query: MemberQuery, signal): Promise<MemberListResult>` | `GET /api/members?tier=&keyword=&page=&size=` | BE-NNN-EP-01 | `MemberQuery` = `{ tier, keyword, page }` (+ `size`) | `MemberListResult` = `{ members, counts, total }` | O |
| `addPointHistory(id: string, input: PointAdjustInput): Promise<PointEntry>` | `POST /api/members/:id/points` | BE-NNN-EP-02 | `PointAdjustInput` = `{ kind, amount, reason }` | `PointEntry` = `{ id, date, reason, orderNo, amount }` | O |
| `fetchMembersForExport(query, signal): Promise<readonly Member[]>` | `GET /api/members/export?tier=&keyword=` | <채울 것> | <채울 것> | `Member[]` | <채울 것> |
| `fetchMemberDetail(id, signal): Promise<MemberDetail>` | `GET /api/members/:id` | <채울 것> | <채울 것> | `MemberDetail` | <채울 것> |
| `changePassword(id, password): Promise<void>` | `PATCH /api/members/:id/password` | <채울 것> | <채울 것> | `void` (204) | <채울 것> |
| `removePointHistory(id, entryId): Promise<void>` | `DELETE /api/members/:id/points/:entryId` | <채울 것> | <채울 것> | `void` (204) | <채울 것> |
| `saveMemo(id, memo): Promise<void>` | `PUT /api/members/:id/memo` | <채울 것> | <채울 것> | `void` (204) | <채울 것> |
| `deleteMember(id): Promise<void>` | `DELETE /api/members/:id` | <채울 것> | <채울 것> | `void` (204) | <채울 것> |
| `sendNotification(id): Promise<void>` | `POST /api/members/:id/notifications` | <채울 것> | <채울 것> | `void` (202) | <채울 것> |

<!-- `toCsv(members)` 는 프론트 전용 직렬화이므로 엔드포인트 대상이 아니다.
     서버가 CSV 를 직접 내려주게 되면 이 함수가 사라지고 export 엔드포인트의 Content-Type 이 바뀐다 —
     그 결정은 이 문서에서 명시적으로 내린다. -->

## 7. 자기 점검 (제출 전 확인)

- [ ] FS의 §5(서버 연동 지점) 요소가 **전부** 엔드포인트로 커버됐다 (누락 0건 — blocker)
- [ ] 모든 엔드포인트가 `근거 (FS)` 에 FS 요소 번호를 역참조한다 (고아 엔드포인트 0건 — blocker)
- [ ] §5 예외 9축에 **빈칸 0건**. 모든 `N/A` 에 사유가 붙어 있다
- [ ] §2 공통 에러 봉투를 정의했고, 각 엔드포인트는 **에러코드 목록만** 나열한다 (봉투 재정의 0건)
- [ ] §3.2 403 vs 404 은닉 정책이 리소스별로 명시됐고, §5의 `403 vs 404` 열과 모순되지 않는다
- [ ] §6에서 `data-source.ts` 의 모든 export 함수가 매핑됐고, 필드명·타입 불일치 0건
- [ ] 쓰기 엔드포인트마다 멱등성을 판정했다 (비멱등이면 멱등키 정책 명시)
- [ ] 목록 엔드포인트마다 페이징 방식·기본값·상한을 명시했다
- [ ] 500 응답 문구에 내부 정보(스택·쿼리·경로)가 없다
- [ ] **서버 코드·DB 스키마를 쓰지 않았다** (컨트롤러·테이블·인덱스 0건)
- [ ] 모호어 0건 (`적절히`, `직관적으로`, `필요 시`, `알아서`)
- [ ] review_request(D5) + handoff envelope 작성 후 `orchestration/tasks/` 에 기록 (P2)
