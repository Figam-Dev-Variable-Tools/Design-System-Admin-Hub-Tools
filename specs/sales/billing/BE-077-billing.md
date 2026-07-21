---
id: BE-077
title: "청구·입금 백엔드 기능 명세"
functionalSpec: FS-077
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-077. 청구·입금 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-077 청구·입금 (`/sales/billing` · `/sales/billing/:id`) |
| 범위 | 청구 목록 조회, 청구 상세 조회, **청구 설정 저장**(청구 방식·개인결제창 링크·비고), **입금확인 기록**(사람이 확인한 입금 1건의 append), **청구 안내 발송 기록**(append), **견적 → 청구 생성**(견적 id 가 멱등키) |
| **범위 밖** | **결제 처리 그 자체** — 이 앱에 PG 연동이 없다. 개인결제창은 **링크를 보관만** 하고 결제는 링크 너머에서 일어나며, 앱은 그 링크로 결제 상태를 조회하지도 완료를 추측하지도 않는다(`types.ts:8-13,75-80`). **은행 입금의 정본** — 통장이 정본이고 이 계약은 사람이 확인한 사실을 **기록**한다(§7.9). **메시지 발송** — '청구 안내'는 보낸 사실의 기록이지 발송 기능이 아니다(`BillingDetailPage.tsx:552-555`). **입금의 정정·취소·환불** — 되돌리는 전이가 코드에 **없다**(§7.4). **과오납 처리** — 잔액을 넘는 입금은 다른 업무로 보고 거절한다(`types.ts:176-179`). **세금계산서 발행** — 비고에 적을 뿐 발행 수단이 없다. **청구 삭제** — 어댑터에 `remove` 가 있으나 두 화면 어디에도 호출부가 없고 심도 없다(§7.13 #11). **견적의 정본** — BE-050 소관이며 이 계약은 **읽고 복사**만 한다(§7.9) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 달력일은 `'YYYY-MM-DD'` 문자열 |
| 프론트 어댑터 | `apps/admin/src/pages/sales/billing/data-source.ts` — **모듈 지역 저장소 + `createStoreAdapter`**(`:93-94,167-174`). `createCrudAdapter` 가 아닌 이유를 파일 머리말이 밝힌다(`:6-8`): 견적 상세가 '이 견적에 이미 청구가 있는가'를 **동기로** 물어야 하는데 `createCrudAdapter` 는 목록을 클로저에 가둔다. 그 밖에 **어댑터를 지나지 않는 동기 함수 2개**(`findBillingIdByQuote` · `createBillingFromQuote`)가 있다(§7.8) |
| 도메인 타입 | `apps/admin/src/pages/sales/billing/types.ts`(청구·입금 기록·가드·파생). 거래처 참조는 `pages/sales/_shared/account-reference`(`AccountRef`), 원화 표기는 `pages/sales/_shared/business.ts`, 견적 합계·상태는 `pages/sales/quotes/types`(`computeTotals` · `isOrderedQuote`) |
| 검증 정본 | **zod 스키마가 없다.** `pages/sales/billing/validation.ts` 가 존재하지 않는다 — 검증 정본은 순수 술어 3종(`billingCreateBlock` · `recordPaymentBlock` · `sendNoticeBlock`)과 상수 2개(`BILLING_NOTE_MAX = 300` · `BILLING_MEMO_MAX = 60`)뿐이고, 그것을 **저장 층이 재판정하지 않는다**(§7.5) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 청구·입금 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 4건 — 목록·상세·입금·안내 | `data-source.ts:164-166` `// TODO(backend): GET /api/sales/billing · GET/PUT /api/sales/billing/:id · POST /api/sales/billing/:id/payments (입금확인 수기 처리 — 되돌리는 전이는 없다) · POST /api/sales/billing/:id/notices (청구 안내 발송 기록)` |
| 심 1건 — 견적 → 청구 생성 | `data-source.ts:151-152` `// TODO(backend): POST /api/sales/quotes/:id/billing — 서버가 견적 상태 확인 + 청구 생성 + 역링크를 한 트랜잭션으로 처리하고, 이미 청구된 견적이면 409 로 거절한다.` |
| **심이 입금·안내를 `POST`(append)로 예고하는데 구현은 `PUT` 전체 치환이다** | 심 `data-source.ts:165-166` ↔ 구현 `BillingDetailPage.tsx:189-210`(`commit` 하나로 셋을 보낸다) · `types.ts:348-363`(`toBillingInput` 12필드 전량) · `data-source.ts:126`(`{ ...billing, ...input, id }`) — **이 갈림이 이 계약의 중심 판정이다**(§7.7) |
| 삭제 심 **없음** | `data-source.ts` 전수 — `removeBilling`(`:130-135`)·어댑터 `remove`(`:173`)는 있으나 **화면 호출부 0건**(`BillingListPage`·`BillingDetailPage` grep). `CrudReadListShell` 이 삭제를 그리지 않는다(`CrudReadListShell.tsx:145-146`) |
| **`quoteId` 가 멱등키다** | `types.ts:70` `/** 청구 대상 견적 id — **멱등키다.** 한 견적에 청구는 하나다 */` · 판정 `billingCreateBlock`(`:162-169`) · 이중 방어 `createBillingFromQuote`(`data-source.ts:153-159`) · 회귀 `billing.test.ts:210-225` |
| **입금 상태를 저장하지 않는다** | `Billing` 인터페이스(`types.ts:66-89`)에 상태 필드가 없다 · `billingPaymentState`(`:114-120`)가 `paidAmount`(`:99-101`)의 누적 합에서 매번 만든다 · 근거 주석 `:108-113` · 상세에 상태 select 가 없다(`BillingDetailPage.tsx:9-10`) · 회귀 `billing.test.ts:66-105` |
| 완료 판정은 **합**이다 | `billing.test.ts:82-90` (400,000 + 600,000 = 1,000,000 → `paid`) · 완납일은 잔액을 0 으로 만든 그 입금의 날짜(`types.ts:123-130` · 회귀 `:92-98`) |
| 입금 기록 가드가 **사유 문자열**을 돌려준다 | `recordPaymentBlock`(`types.ts:180-190`) · 사유 4종(`:150-153`) · 회귀 `billing.test.ts:109-136` |
| 안내 가드 | `sendNoticeBlock`(`types.ts:198-205`) · 사유 1종(`:154`) · 회귀 `billing.test.ts:160-175` |
| 화면 disabled 와 저장 거절이 **같은 술어** | 규약 `types.ts:142-146` · 파생 `BillingDetailPage.tsx:253-254` → 버튼 `:495,596` · 사유 문장 `:485-487,590` · 실행 재확인 `:257,272` · `applyPayment`/`applyNotice` 가 막힌 기록에 **던진다**(`types.ts:216-217,223-224`, 회귀 `billing.test.ts:151-155`) |
| **저장 층에는 그 술어가 없다** | `updateBilling`(`data-source.ts:120-128`)은 **존재 여부만** 검사하고 전이 가드를 재판정하지 않는다 — 클레임 어댑터(`orders/claims/data-source.ts` 의 `assertTransitions`)와 정반대다(§7.5) |
| 원장은 append-only(화면 층) | `applyPayment`·`applyNotice`(`types.ts:215-226`)가 spread-append 뿐 · 감액 엔트리는 `amount <= 0` 거절(`:186`)로 봉쇄 · 두 표에 행 액션 0건(`BillingDetailPage.tsx:503-547,604-640`) |
| **그러나 저장 계약이 그것을 깬다** | `BillingInput`(`types.ts:91,348-363`)이 `payments`·`notices` 배열 전문을 담고 `updateBilling` 이 통째로 치환한다(`data-source.ts:126`) — §7.4 |
| 청구액은 **견적 합계의 스냅숏** | `buildBillingFromQuote`(`types.ts:381-397`, `:391` `amount: computeTotals(quote.items, quote.taxMode).total`) · 근거 주석 `:371-377` · 회귀 `billing.test.ts:227-255` |
| 청구번호는 서버가 채번한다(자리) | `nextBilling`(`data-source.ts:97-101`) → `makeBillNo`(`types.ts:366-369`) · `billNo: ''` 가 자동 부여 신호(`types.ts:383-384`) · `seq` 는 **모듈 지역 카운터**(`data-source.ts:94`) |
| 404 발생 | `getBilling`(`data-source.ts:112`) `throw new HttpError(HTTP_STATUS.notFound, '청구를 찾을 수 없습니다.')` + 어댑터(`crud.ts:217-219`). 저장소가 먼저 던져 그 문구가 이긴다 |
| 409 발생 — **존재 여부 기반** | `updateBilling`(`data-source.ts:122-124`) `'다른 사용자가 먼저 삭제한 청구입니다.'` + 어댑터(`crud.ts:256-258`). **낙관적 동시성 비교가 아니다** — §7.6 |
| 낙관적 동시성 토큰 **없음** | `grep -rn "version\|updatedAt\|If-Match" apps/admin/src/pages/sales/billing` → **0건**(2026-07-22 실측) |
| 멱등키 **미전달** | `BillingDetailPage.tsx:195-196` `update.mutate({ id, input: toBillingInput(next), signal: controller.signal })` — `idempotencyKey` 없음. **자리와 원장은 이미 있다**(`crud.ts:340-346` `UpdateVars.idempotencyKey` · 원장 `crud.ts:193,232,245`) |
| 기록 id·발송 시각을 **클라이언트가 만든다** | `bp-${String(Date.now())}`(`BillingDetailPage.tsx:260`) · `bn-${String(Date.now())}`(`:275`) · `at: new Date().toISOString()`(`:276`) |
| 생성 쓰기가 **어댑터를 지나지 않는다** | `createBillingFromQuote`(`data-source.ts:153-159`)는 동기 함수다 — `fixtureRequest` 를 타지 않아 지연·실패 재현·abort·멱등 원장이 **전부 없다**. 호출부 `QuoteDetailPage.tsx:181-187` |
| 이 라우트는 **어떤 엔타이틀먼트 모듈에도 속하지 않는다** | `module-resources.ts:52-60`(`sales.pipeline` 에 `/sales/billing` 없음) → `entitlementKeyForResource` null → `GRANTED`(`route-entitlement.ts:20,27-28`) — §7.11 |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세) + **입금확인 기록·안내 기록·청구 설정 저장** — 입금확인은 운영자의 본업이고 화면도 그렇게 배선돼 있다(`useRouteWritePermissions` 를 목록·상세가 모두 소비 — `BillingListPage.tsx:99` · `BillingDetailPage.tsx:161`). **견적을 청구로 만드는 EP-06 은 견적 도메인의 쓰기 권한**을 따른다(BE-050 §2 — `operator` 는 견적 쓰기 403). 영업 도메인 읽기 권한 없는 관리자 → 컬렉션 **403** / 개별 청구 **404 은닉**(§7.10).
- **CSRF**: 쓰기(PUT · POST)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. **쓰기 5초 → 504** — 이 도메인의 쓰기는 문서 한 벌 또는 기록 1건이며 다중 원장 트랜잭션이 아니다(클레임의 10초와 다른 이유가 여기 있다). 단 EP-06 은 견적 조회 + 채번 + 역링크가 한 트랜잭션이라 **7초**.
- **엔타이틀먼트**: **이 리소스는 어떤 모듈에도 속하지 않는다**(`module-resources.ts:52-60`). 플랜 축의 판정은 `granted` 로 수렴하며(fail-open — `route-entitlement.ts:10-12`) 이 계약의 응답 코드가 아니다. 그 매핑 누락 자체는 §7.11 의 판정 대상이다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 `canUpdate` 로 버튼을 감추고 입력을 비활성화하지만(`BillingDetailPage.tsx:326-328,382,447,490,593`) 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다. 권한 강제는 전적으로 서버 책임이다.

## 3. 데이터 계약 (`types.ts` · `_shared/**` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Billing`(`AccountRef` 확장) | `id` · `billNo`('BL-YYYYMMDD-NNN') · **`quoteId`**(멱등키) · `quoteNo`(승계 스냅숏) · `accountId`·`accountName`(승계, `accountId === ''` 면 미등록) · `method` · `paymentLinkUrl` · **`amount`**(견적 합계 스냅숏) · `issuedAt`('YYYY-MM-DD') · `notices[]` · `payments[]` · `note` | 목록·상세가 **같은 타입**이다 — 목록도 `payments`·`notices` 전문을 받는다(§7.12). **입금 상태·입금액·잔액·완납일 필드가 없다** — 전부 파생이다(아래) |
| `BillingPayment` | `id` · `paidOn`('YYYY-MM-DD' — **통장에 찍힌 날이지 입력한 날이 아니다** `:59`) · `amount`(양의 정수) · `memo`(입금자명 — 통장 표기가 다를 때 **유일한 단서** `:62`) | **회계 기록**이다. 고치지도 지우지도 않는다(`:51-55`) |
| `BillingNotice` | `id` · `at`(발송 시각 ISO) · `channel`(`email`\|`sms`\|`kakao`\|`phone`) · `memo` | append-only. **`at` 이 현재 클라이언트 시계다**(`BillingDetailPage.tsx:276`) — §7.3 |
| `BillingInput` | `Omit<Billing, 'id'>` — 12필드 전량 | 저장 입력. **불변 승계 필드(`quoteId`·`quoteNo`·`accountId`·`accountName`·`amount`·`issuedAt`)와 채번 필드(`billNo`)와 원장(`payments`·`notices`)까지 포함한 전체 치환**이다(§7.3) |
| `BillingMethod` | `bank_transfer` \| `payment_link` | 두 값뿐인 이유가 코드에 있다(`types.ts:30-31`): 앱이 카드를 받지 않는데 선택지에 있으면 운영자가 고르고 고른 뒤에 할 일이 없다 |
| `BillingPaymentState` | `unpaid` \| `partial` \| `paid` | **타입만 있고 필드는 없다**(`:35-36`). 저장 금지(§7.2) |
| 상수 | `BILLING_NOTE_MAX = 300`(비고) · `BILLING_MEMO_MAX = 60`(입금자명·안내 메모) | `:93-94`. 화면은 `maxLength` 로만 강제한다 — zod 가 없다 |

**파생값 (순수 — 저장하지 않는다)**

| 규칙 | 정의 | 근거 |
|---|---|---|
| `paidAmount(billing)` | `payments.reduce((s, p) => s + p.amount, 0)` — **누적 합**이다 | `:99-101` |
| `outstandingAmount(billing)` | `amount − paidAmount`. 초과 입금을 막으므로 음수가 되지 않는다 | `:104-106` |
| `billingPaymentState(billing)` | `paid <= 0` → `unpaid` · `paid >= amount` → `paid` · 그 밖 → `partial` | `:114-120` |
| `paidOnDate(billing)` | 배열 **저장 순서**로 누적하다가 처음 `amount` 에 닿은 **그 입금**의 `paidOn`. 아직이면 `''` | `:123-130` |
| `hasSentNotice` · `lastNoticeAt` | `notices.length > 0` · `notices.at(-1)?.at ?? ''` | `:133-140` |
| `totalOutstanding(list)` | `Σ max(outstandingAmount, 0)` — 완납 건은 0 으로 들어간다 | `:325-327` |

> **경계 셋을 못박는다.** ① **동치는 완납이다** — `paid >= amount` 라 정확히 맞아떨어진 입금이 `paid` 다. ② **반올림이 개입할 자리가 없다** — `recordPaymentBlock` 이 `Number.isInteger(amount)` 를 요구하고(`:186`) 청구액은 `computeTotals` 의 라인별 `Math.round` 결과라 정수다(`quotes/types.ts:262`). 두 정수의 비교이므로 부동소수 오차가 없다. ③ **음수는 통로 자체가 없다** — `amount <= 0` 이 거절되어 `paidAmount` 는 단조 증가한다. 세 성질이 함께여야 파생이 안전하다. 서버가 소수 금액이나 감액 엔트리를 허용하면 **세 개가 동시에 무너진다**.

**입금 기록 가드 (순수 — `recordPaymentBlock` `types.ts:180-190`, 회귀 `billing.test.ts:109-136`)**

| 판정 순서 | 조건 | 거절 사유 (문자열 그대로) |
|---|---|---|
| ① | `billingPaymentState(billing) === 'paid'` | `이미 입금이 완료된 청구입니다.` |
| ② | `!Number.isInteger(amount) \|\| amount <= 0` | `입금액은 0보다 커야 합니다.` |
| ③ | `amount > outstandingAmount(billing)` | `입금액이 잔액보다 클 수 없습니다.` |
| ④ | `!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)` | `입금일을 YYYY-MM-DD 형식으로 입력하세요.` |
| ⑤ | — | **허용**(`null`) |

> **순서가 곧 규칙이다.** 완료된 청구에는 금액·날짜를 보지 않고 ①로 끝난다. 그래서 화면에는 **한 번에 한 사유만** 뜬다(첫 위반이 이긴다). ④의 `DATE_RE` 는 **모양만** 본다(`:172` 가 그렇게 밝힌다) — `2026-02-31` 도, **미래 날짜도** 통과한다. 서버는 달력 실재와 '청구일 이전 금지·미래 금지'를 더해야 한다(§7.13 #7).

**안내 발송 가드 (순수 — `sendNoticeBlock` `types.ts:198-205`, 회귀 `billing.test.ts:160-175`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | `method === 'payment_link'` 이고 `paymentLinkUrl.trim() === ''` | `개인결제창 링크를 먼저 등록해야 안내를 보낼 수 있습니다.` |
| ② | — | **허용**. 계좌이체는 막지 않는다 — 계좌 안내가 문면에 있다(`:195-196`) |

**청구 생성 가드 (순수 — `billingCreateBlock` `types.ts:162-169`, 회귀 `billing.test.ts:210-225`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | `!isOrderedQuote(quoteStatus)` | `수주로 전환된 견적만 청구할 수 있습니다.` |
| ② | `existingBillingId !== ''` | `이미 청구가 생성된 견적입니다.` |
| ③ | — | **허용** |

> `ordered` **하나만** 문을 연다. 승인(`accepted`)만으로는 열리지 않으며 그 이유가 견적 쪽에 적혀 있다(`quotes/types.ts:228-236` — 전환하지 않은 견적에 돈 이야기가 먼저 붙지 않게 한다). 회귀가 `draft`·`sent`·`accepted`·`rejected`·`expired` **다섯을 전수**로 막는다(`billing.test.ts:216-220`).

**표시 규칙 (`types.ts:278-286`)**: `unpaid`=warning '미입금' · `partial`=info '부분입금' · `paid`=success '입금완료'. 부분입금을 미입금과 같은 색으로 두지 않는 이유가 `:272-277` 에 있다 — 운영자가 할 일이 다르다.

## 4. 엔드포인트 명세

### BE-077-EP-01 · 청구 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-077-EL-001, EL-005.2, EL-009~EL-015 |
| 심 | `data-source.ts:164` `GET /api/sales/billing` |
| 메서드·경로 | `GET /api/sales/billing` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.12) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 상태 필터·검색을 **전부 클라이언트에서** 수행하므로(`BillingListPage.tsx:120-123`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다(`crud.ts:199-200`).

**응답 200** — `readonly Billing[]`. **청구일 내림차순, 같은 날짜는 청구번호 내림차순**(`sortBillings` `types.ts:341-346`)으로 내려준다. 저장소가 조회·쓰기 직후마다 그 정렬을 적용하고(`data-source.ts:106,117,125,157`) 프론트는 다시 정렬하지 않는다 — **서버 순서가 정본이어야** 페이징 도입 시(§7.12) 계약이 유지된다.

**응답에 넣지 않는 것**: `paymentState` · `paidAmount` · `outstanding` · `paidOn` **필드를 만들지 않는다.** 넣는 순간 §7.2 가 깨진다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-077-EP-02 · 청구 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-077-EL-019, EL-020, EL-023, EL-034, EL-039, EL-041, EL-042 |
| 심 | `data-source.ts:164` `GET /api/sales/billing/:id` |
| 메서드·경로 | `GET /api/sales/billing/:id` |
| 권한 | `admin`, `operator`. 영업 도메인 읽기 권한 없음 → **404 은닉**(§7.10) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Billing`(입금 내역·안내 기록 전문 포함). `payments` 는 **기록된 순서 그대로** 내려준다 — 프론트가 정렬하지 않고 받은 순서로 렌더하며(`BillingDetailPage.tsx:529`), **`paidOnDate` 가 그 순서에 의존한다**(§7.2). `notices` 도 같다.

**에러**: 400(id 형식) · 401 · **404 `BILLING_NOT_FOUND`**(없거나 읽기 권한 없음) · 429 · 500 · 504.

> **어댑터는 이미 옳다**: 저장소가 없는 id 에 `HttpError(404, '청구를 찾을 수 없습니다.')` 를 던지고(`data-source.ts:112`) 어댑터가 한 겹 더 막는다(`crud.ts:217-219`). 화면이 `isNotFound` 로 404 와 5xx 를 문구·복구 수단으로 가른다(`BillingDetailPage.tsx:213-236`). 백엔드 연결 시 응답 404 를 같은 타입으로 옮기기만 하면 EXC-12 계약이 그대로 유지된다.

---

### BE-077-EP-03 · 청구 설정 저장 (방식 · 개인결제창 링크 · 비고)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-077-EL-025, EL-025.1, EL-026, EL-027, EL-043, EL-047 |
| 심 | `data-source.ts:164` `PUT /api/sales/billing/:id` |
| 메서드·경로 | `PUT /api/sales/billing/:id` |
| 권한 | `admin`, `operator` |
| 멱등성 | 치환이므로 **자연 멱등**(같은 바디의 재시도는 같은 결과). 다만 §7.6 의 lost update 는 멱등성으로 풀리지 않는다 |
| 레이트리밋 | 분당 60회 |

**바디 (판정 — 안 A)**: `{ method, paymentLinkUrl, note }` **3개만** 받는다. 현재 프론트는 `toBillingInput` 으로 12필드 전량을 보내지만(`types.ts:348-363`) 관리자가 실제로 바꾸는 것은 이 셋뿐이다(`BillingDetailPage.tsx:285-295,409-414,422`). 나머지 9필드의 소유권 판정은 §7.3.

**서버 검증 (순서가 곧 규칙이다)**
1. **승계·채번·원장 필드 무시**: `quoteId` · `quoteNo` · `accountId` · `accountName` · `amount` · `issuedAt` · `billNo` · `payments` · `notices` 는 **요청에서 받지 않는다**(§7.3 【보안 판정】).
2. `method` 가 `bank_transfer`\|`payment_link` 유니온 밖이면 400. 프론트는 타입가드로 이미 거른다(`BillingDetailPage.tsx:149-151,385`).
3. **`method === 'bank_transfer'` 이면 `paymentLinkUrl` 을 `''` 로 비운다** — 프론트가 그렇게 하고(`:291`) 그 이유를 밝힌다: 남겨 두면 안내 문면과 어긋난다. **서버가 이 규칙의 정본이어야 한다** — 클라이언트만 비우면 조작된 요청이 '계좌이체인데 결제 링크가 살아 있는' 청구를 만든다.
4. `method === 'payment_link'` 이면 `paymentLinkUrl` 을 **URL 로 검증한다** — 현재 프론트에는 검증이 **없다**(`type="url"` 이지만 `<form>` 밖이라 브라우저 검증이 걸리지 않고 zod 도 없다 — FS-077 §7 #2). 스킴은 `https` 만 허용한다(고객에게 그대로 발송될 링크다).
5. `note` 는 앞뒤 공백 제거 후 0–300자(`BILLING_NOTE_MAX`).
6. **저장이 `payments`/`notices` 를 건드리지 않는다** — 이 엔드포인트로 원장이 바뀌는 경로는 없어야 한다(§7.4).

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 응답 본문을 읽지 않고 상세를 재조회한다(`BillingDetailPage.tsx:201`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `method`·`paymentLinkUrl`·`note`) · 401 · 403 · 403 `CSRF_TOKEN_INVALID` · **404 `BILLING_NOT_FOUND`** · **409 `CONFLICT`**(§7.6) · 429 · 500 · 504.

> **`error.fields` 를 프론트가 읽을 자리가 없다**: `onError`(`:204-207`)가 status 도 `violations` 도 보지 않고 `'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'` 한 문장으로 뭉갠다 — **저장소가 이미 들고 온 `'다른 사용자가 먼저 삭제한 청구입니다.'` 조차 버려진다**(§7.13 #5). 필드 이름 계약은 서버가 지키되, 그것이 화면에 도달하려면 프론트 변경이 선행한다.

---

### BE-077-EP-04 · 입금확인 기록 (append)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-077-EL-029~EL-034, EL-045 |
| 심 | `data-source.ts:165` `POST /api/sales/billing/:id/payments (입금확인 수기 처리 — 되돌리는 전이는 없다)` |
| 메서드·경로 | `POST /api/sales/billing/:id/payments` |
| 권한 | `admin`, `operator` |
| 멱등성 | **`Idempotency-Key` 헤더를 필수로 한다**(§7.7). append 엔드포인트에서 키 없는 재시도는 **곧 이중 입금**이고, 이 도메인에는 그것을 지울 수단이 없다 |
| 레이트리밋 | 분당 60회 |

**바디**: `{ paidOn, amount, memo }` **3개.** `id` 는 **서버가 만든다** — 현재 프론트가 `bp-${Date.now()}` 로 만들고(`BillingDetailPage.tsx:260`) 같은 밀리초의 두 요청이 같은 키를 낳는다(§7.3 #7).

**서버 검증 (§3 입금 기록 가드를 **저장 시점의 저장된 `payments`** 로 재판정한다 — 순서 그대로)**
1. 대상 청구가 이미 `paid` → **422 `PAYMENT_ALREADY_PAID`**.
2. `amount` 가 정수가 아니거나 0 이하 → **422 `PAYMENT_AMOUNT_POSITIVE`**.
3. `amount > outstanding` → **422 `PAYMENT_OVER_OUTSTANDING`**. **행 락 안에서 판정한다** — 그러지 않으면 두 요청이 각각 잔액을 통과해 합이 청구액을 넘는다(§7.6).
4. `paidOn` 이 `YYYY-MM-DD` 가 아니면 **422 `PAYMENT_DATE_REQUIRED`**. 여기에 서버는 **달력 실재**와 **`issuedAt` 이전·미래 금지**를 더한다(§7.13 #7).
5. `memo` 는 앞뒤 공백 제거 후 0–60자(`BILLING_MEMO_MAX`). 프론트도 `memo.trim()` 을 보낸다(`:263`).
6. 성공 시 `payments` **끝에 1건을 덧붙인다.** 기존 원소를 고치지도 지우지도 않는다 — 그것이 `paidOnDate` 의 전제다(§7.2).

**응답 201** — 갱신된 `Billing` 전문을 돌려주는 것을 **권장한다**. 프론트가 저장 직후 상세를 재조회하므로(`:201`) 응답 본문 없이도 동작하지만, 응답에 실으면 그 왕복이 사라지고 **파생값(상태·잔액·완납일)이 서버 판정으로 확정된다**.

**에러**: 400 · 401 · 403 · **404 `BILLING_NOT_FOUND`** · **409 `CONFLICT`**(같은 키의 **다른** 바디 — §7.7) · **422**(위 4종) · 429 · 500 · 504.

---

### BE-077-EP-05 · 청구 안내 발송 기록 (append)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-077-EL-035~EL-039, EL-045 |
| 심 | `data-source.ts:166` `POST /api/sales/billing/:id/notices (청구 안내 발송 기록)` |
| 메서드·경로 | `POST /api/sales/billing/:id/notices` |
| 권한 | `admin`, `operator` |
| 멱등성 | **`Idempotency-Key` 헤더 필수** — EP-04 와 같은 이유 |
| 레이트리밋 | 분당 60회 |

**바디**: `{ channel, memo }` **2개.** `id` 와 **`at`(발송 시각)은 서버가 찍는다** — 현재 프론트가 클라이언트 시계로 만든다(`:275-276`). 감사 성격의 기록이 사용자의 시계를 신뢰해서는 안 된다(§7.3 #4).

**서버 검증**
1. `channel` 이 `email`\|`sms`\|`kakao`\|`phone` 밖이면 400.
2. §3 안내 가드 재판정 — 저장된 `method`·`paymentLinkUrl` 로 본다. 위반 시 **422 `NOTICE_LINK_REQUIRED`**. **요청의 method 를 믿지 않는다**: 프론트는 방식 변경과 안내 기록이 서로 다른 두 번의 저장이라 그 사이에 값이 바뀔 수 있다.
3. `memo` 0–60자.
4. `notices` 끝에 1건 append.

**이 엔드포인트가 하지 않는 것**: **메시지를 보내지 않는다.** 화면도 그렇게 말한다(`BillingDetailPage.tsx:552-555` — '앱이 메시지를 보내지는 않습니다'). 발송 자체는 마케팅/메시지 계약의 것이며, 그 계약이 붙으면 이 기록은 **발송 결과의 사본**이 되어야 한다(§7.13 #8).

**응답 201** — EP-04 와 같다. **에러**: 400 · 401 · 403 · 404 · 409 · **422 `NOTICE_LINK_REQUIRED`** · 429 · 500 · 504.

---

### BE-077-EP-06 · 견적 → 청구 생성 (`quoteId` 가 멱등키)
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-077-EL-016, EL-016.1~.5 |
| 심 | `data-source.ts:151-152` `POST /api/sales/quotes/:id/billing — 서버가 견적 상태 확인 + 청구 생성 + 역링크를 한 트랜잭션으로 처리하고, 이미 청구된 견적이면 409 로 거절한다.` |
| 메서드·경로 | `POST /api/sales/quotes/:id/billing` |
| 권한 | **견적 도메인 쓰기 권한**(BE-050 §2 — `admin`). 청구가 아니라 **견적에서 파생되는 행위**다 |
| 멱등성 | **`Billing.quoteId` 가 도메인 멱등키다**(§7.1). 경로의 `:id` 가 곧 키이므로 별도 헤더가 없어도 멱등이 성립한다 |
| 레이트리밋 | 분당 30회 |

**바디**: **없다.** 물어볼 것이 견적에 이미 다 있다(`QuoteDetailPage.tsx:174-179`). 청구일은 **서버가 찍는다** — 현재 프론트가 `seoulDayOf(new Date().toISOString())` 로 만들어 넘긴다(`:183`).

**서버 처리 (한 트랜잭션)**
1. 견적 조회. 없으면 **404**.
2. `isOrderedQuote(quote.status)` 재판정 — 아니면 **422 `BILLING_CREATE_NOT_ORDERED`**(§3 표 ①).
3. **`quoteId` 로 기존 청구를 찾는다.** 있으면 §7.1 의 판정에 따라 **기존 청구를 돌려준다**(200).
4. 승계값을 **서버가 계산한다**: `quoteNo`·`accountId`·`accountName` 복사, `amount = computeTotals(items, taxMode).total`(§7.9 — **요청이 준 금액을 쓰지 않는다**), `method = 'bank_transfer'`, `paymentLinkUrl = ''`, `notices = []`·`payments = []`, `note = ''`. 규칙의 단일 정의는 `buildBillingFromQuote`(`types.ts:381-397`)이고 회귀가 4건으로 고정한다(`billing.test.ts:227-255`).
5. `billNo` 채번 — `'BL-' + 청구일숫자 + '-' + 3자리 순번`(`makeBillNo` `types.ts:366-369`). **사람이 정하지 않는다**(`:383`). 순번의 정본은 서버다 — 현재는 프로세스 지역 카운터라 재시작하면 되돌아간다(`data-source.ts:94`).
6. 견적 → 청구 역링크를 확정한다(견적 상세가 `billingId` 로 읽는다 — §6).

**응답**: **201**(새로 만들었다) / **200**(이미 있어 기존 청구를 돌려준다). 두 경우 모두 본문은 `Billing` 이며 **호출부는 `id` 로 상세로 이동한다**(`QuoteDetailPage.tsx:186`).

**에러**: 401 · 403 · **404**(견적 없음) · **422 `BILLING_CREATE_NOT_ORDERED`** · 429 · 500 · 504. **409 는 내지 않는다** — 판정은 §7.1.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:60-66`)가 재인증으로. 화면은 FS-077-EL-013 배너 | **403** 컬렉션 — 영업 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-077-EL-012 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → EL-013. **미수금 안내문은 그때도 '세는 중'이라고 말한다**(NFR-077 §5 #7) | 5초 → 504 → EL-013 |
| EP-02 상세 | 400 — id 형식 위반 → 화면은 EL-041 의 **일반 오류 분기**(400 을 404 와 구분하지 않는다) | 401 → 전역 인터셉터 | **읽기 권한 없음 → 404 은닉**(§7.10) — 개별 청구는 거래처·청구액·입금 내역·입금자명을 담는다. 읽기 권한이 있는 `operator` 에게는 403 | **404 `BILLING_NOT_FOUND`** — 저장소가 이미 던진다(`data-source.ts:112`). 화면이 '다시 시도'를 숨기고 '목록으로'만 준다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → EL-041 일반 분기(재시도 제공) | 5초 → 504 → EL-041 |
| EP-03 설정 저장 | 400 `VALIDATION_FAILED` — `method` 유니온 밖 · `paymentLinkUrl` 형식 · `note` 300자 초과. **화면이 필드로 되돌릴 경로가 없다**(폼이 아니다 — §7.13 #5) → EL-021 배너 1종으로 뭉개진다 | 401 → 전역 인터셉터. **입력한 비고·링크는 유실된다**(EXC-19) | `operator` 도 쓰기가 허용되므로 역할 부족 403 은 영업 쓰기 권한 없는 그 밖의 역할에만. **읽기 권한 없음 → 404 은닉** | **404 `BILLING_NOT_FOUND`** — 존재한 적 없는 id | **409 `CONFLICT`** — 어댑터가 **없는 id 에 이미 409 를 던지고 문구까지 갖고 있다**(`data-source.ts:122-124`). **그런데 화면이 그 문구를 버린다**(`:206`) — 해소 UI 도 없다(§7.6) | N/A — 상태 전이가 없는 축이다(방식은 두 값 자유 전환). 링크 형식 위반은 400 으로 낸다 | 429 분당 60 + `Retry-After` | 500 + `traceId` → EL-021 배너. **참조 코드가 표시되지 않는다** — `referenceOf`(`http-error.ts:151`)가 있는데 이 경로가 쓰지 않는다 | 5초 → 504 → EL-021. **프론트 타임아웃 상한이 없다**(`AbortSignal.timeout` 앱 전역 0건) |
| EP-04 입금 기록 | 400 — `paidOn`·`amount`·`memo` 타입/길이 위반. **`digitsToNumber`(`BillingDetailPage.tsx:144-147`)가 `'12abc34'` 를 조용히 `1234` 로 읽어 보내므로** 서버가 원문을 받는 계약이면 여기서 갈린다(§7.13 #9) | 401 → 전역 인터셉터. **친 금액·입금자명은 이미 비워졌다**(`:267-268` 이 `commit` 밖) | 위와 동일 | **404 `BILLING_NOT_FOUND`** | **409 `CONFLICT`** — ① 없는 id ② **같은 `Idempotency-Key` 로 다른 바디가 왔다**(§7.7). 재생(같은 키·같은 바디)은 409 가 아니라 **최초 응답을 재생**한다 | **422** 4종 — `PAYMENT_ALREADY_PAID` · `PAYMENT_AMOUNT_POSITIVE` · `PAYMENT_OVER_OUTSTANDING` · `PAYMENT_DATE_REQUIRED`. §3 표의 순서 그대로 판정하고 **행 락 안에서** 잔액을 다시 본다 | 429 분당 60 | 500 + `traceId`. **부분 적용이 있어서는 안 된다** — append 1건은 그 자체로 원자적이어야 한다 | 5초 → 504. **재시도가 안전하려면 멱등키가 있어야 한다** — 지금은 없다(§7.7) |
| EP-05 안내 기록 | 400 — `channel` 유니온 밖 · `memo` 60자 초과 | 401 → 전역 인터셉터 | 위와 동일 | **404 `BILLING_NOT_FOUND`** | **409** — EP-04 와 같은 두 경우 | **422 `NOTICE_LINK_REQUIRED`** — 저장된 `method`·`paymentLinkUrl` 로 재판정 | 429 분당 60 | 500 + `traceId` | 5초 → 504 |
| EP-06 견적→청구 생성 | N/A — **바디가 없다**. 경로의 견적 id 만 받는다 | 401 → 전역 인터셉터. **현재 화면에는 이 경로의 실패 표시가 0건이다**(§7.8) | **403** — 견적 쓰기 권한 부족. 견적 읽기 권한 없음 → **404 은닉**(BE-050 §7.3) | **404** — 견적이 없다. **현재 프론트는 이 경우를 그리지 못한다**(동기 호출이라 실패 경로가 없다) | **N/A — 409 를 내지 않는다.** 이미 청구된 견적은 **기존 청구를 200 으로 돌려준다**(§7.1). 심(`data-source.ts:152`)이 예고한 409 를 채택하지 않는 이유가 §7.1 에 있다 | **422 `BILLING_CREATE_NOT_ORDERED`** — 저장 시점의 견적 상태로 재판정. 화면 버튼은 이미 그 술어로 잠겨 있다(`QuoteDetailPage.tsx:278`) | 429 분당 30 | 500 + `traceId` — **견적 상태 확인 + 청구 생성 + 채번 + 역링크가 한 트랜잭션**이라 부분 적용이 있으면 '청구는 생겼는데 견적이 그것을 모르는' 상태가 남는다 | 7초 → 504 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `billingAdapter.fetchAll(signal)` | `GET /api/sales/billing` | EP-01 | `readonly Billing[]` | O |
| `billingAdapter.fetchOne(id, signal)` | `GET /api/sales/billing/:id` | EP-02 | `Billing` | O — **404 를 이미 `HttpError` 로 던진다**(`data-source.ts:112` · `crud.ts:217-219`) |
| `billingAdapter.update(id, input, ctx?)` | `PUT /api/sales/billing/:id` | EP-03 | `void` | **△ — 전체 치환 계약 변경 필요**(§7.3) · **멱등키 미전달**(`BillingDetailPage.tsx:195-196`) · **409 문구 폐기**(`:206`) |
| (입금 기록) | `POST /api/sales/billing/:id/payments` | **EP-04** | — | **X — 호출부가 없다.** 지금은 `commit` 이 PUT 으로 보낸다(`:258-266`). **심이 예고하는 모양과 구현이 다르다** — §7.7 |
| (안내 기록) | `POST /api/sales/billing/:id/notices` | **EP-05** | — | **X — 호출부가 없다.** 위와 같다(`:273-281`) |
| `createBillingFromQuote(quote, issuedAt)` | `POST /api/sales/quotes/:id/billing` | EP-06 | `Billing` | **△ — 동기 함수다.** 어댑터를 지나지 않아 지연·실패·abort·멱등 원장이 전부 없다(§7.8). 호출부 `QuoteDetailPage.tsx:181-187` |
| `findBillingIdByQuote(quoteId)` | — (동기 seam) | **EP 아님 — 견적 상세 응답의 `billingId`** | `string`(`''` = 없음) | **△ — 렌더 중에 모듈 지역 배열을 직접 읽는다**(`data-source.ts:142-145`, 호출부 `QuoteDetailPage.tsx:171`). 백엔드가 붙으면 동기 계약이 성립하지 않는다(§7.8) |
| `billingAdapter.create(...)` | — | **없음(범위 밖)** | `createStoreAdapter` 가 제공하나 **호출부 0건** | O — 청구는 EP-06 으로만 생긴다 |
| `billingAdapter.remove(...)` · `removeBilling` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답. **다만 표면이 살아 있다**(§7.13 #11) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`update` · 신설 `recordPayment`/`recordNotice`)에 `X-CSRF-Token` 헤더를 싣는다. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` **이미 충족** — 응답 404 를 `HttpError(404, '청구를 찾을 수 없습니다.')` 로 옮기기만 한다. |
| 409 변환 | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다 — `isConflict`(`http-error.ts:141`)가 412 도 같은 UX 로 수렴시킨다. **화면 쪽 소비가 0건이므로**(grep) 서버 문구가 도달하려면 `onError`(`BillingDetailPage.tsx:204-207`)의 변경이 함께 와야 한다. |
| 422 변환 | 신설 `POST` 두 개는 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]` — `http-error.ts:55`)로 옮긴다. **필드 이름은 프론트가 아는 셋(`amount`·`paidOn`·`memo`)과 일치해야 한다.** 다만 이 화면에는 인라인 오류 슬롯이 없고 차단 사유가 카드 안 `Alert` 로만 나가므로(`:485-487,590`), 서버 422 도 그 자리로 수렴시켜야 한다. |
| 멱등키 | `update`·신설 `POST` 두 개는 `context?.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — **자리도 원장도 이미 있다**(`crud.ts:340-346` · `:193,232,245`). **비어 있는 것은 호출부다**(§7.7). |
| 입력 초기화 시점 | `setAmountInput('')`·`setMemo('')`(`:267-268`)가 `commit` **밖**에 있어 **저장 실패에도 입력이 사라진다.** 백엔드가 붙으면 이 두 줄은 성공 콜백 안으로 들어가야 한다 — 그러지 않으면 실패한 입금 기록을 운영자가 통장을 다시 보며 재입력한다. |
| 부수효과 위치 | `applyPayment`·`applyNotice`(`types.ts:215-226`)는 **다음 문서 한 벌을 만드는 순수 함수**다. EP-04·EP-05 가 붙으면 화면은 **기록 1건만** 보내고 이 두 함수는 **서버 판정의 프리뷰**로만 남는다 — 남긴 채 서버도 append 하면 **입금이 두 번 쌓인다**(§7.4). |
| 가드 유지 | `recordPaymentBlock`·`sendNoticeBlock`·`billingCreateBlock` 은 **지우지 않는다** — 서버가 정본이 되어도 버튼과 사유 문장이 같은 술어를 읽는 자리가 필요하다(`types.ts:142-146`). 다만 저장의 최종 판정은 서버다. |
| 견적 역참조 | EP-06 이 붙으면 `findBillingIdByQuote` 는 **견적 상세 응답의 `billingId` 를 읽는 함수**로 바뀐다 — 반환 규약(`''` = 없음)은 유지하되 **'모른다'(조회 실패)와 '없다'를 구분**할 수 있어야 한다. 지금은 둘 다 `''` 라 조회가 깨져도 '청구 만들기' 버튼이 되살아난다(§7.8). |

## 7. 핵심 판정

### 7.1 `Billing.quoteId` 가 멱등키다 — 그리고 재요청은 409 가 아니라 **재생**이다 【정합 판정】

**코드가 그것을 이름으로 말한다**: `types.ts:70` `/** 청구 대상 견적 id — **멱등키다.** 한 견적에 청구는 하나다 */`. 그 위에 방어가 **셋**이다.

| 방어선 | 위치 | 하는 일 | 거절 사유 |
|---|---|---|---|
| ① 표시 | `QuoteDetailPage.tsx:171,278` — `findBillingIdByQuote` 를 **렌더 시점에 동기로** 물어 버튼 표시를 정한다 | 이미 청구가 있으면 버튼이 아예 없다(대신 '청구 열기' 역링크 — `:367-376`) | — |
| ② 실행 | `QuoteDetailPage.tsx:182` — `billingCreateBlock(quote.status, billingId) !== null` 이면 `return` | 클릭 경로에서 한 번 더 막는다 | `수주로 전환된 견적만 청구할 수 있습니다.` / `이미 청구가 생성된 견적입니다.` |
| ③ 저장 | `data-source.ts:153-159` — `createBillingFromQuote` 가 같은 조회를 다시 하고, **있으면 새로 만들지 않고 기존 청구를 돌려준다**(`:155`) | 화면이 쥔 `billingId` 가 낡아도 청구는 하나다 | (거절하지 않는다 — **재생한다**) |

**동기 조회인 이유가 코드에 있다**(`QuoteDetailPage.tsx:161-165` 계열 주석 · FS-077-EL-016.2): 비동기로 나중에 알면 버튼이 잠깐 살아 있다가 죽고, 그 사이 누른 사람이 두 번째 청구를 만든다.

**심과 코드가 갈린다.** 심(`data-source.ts:152`)은 `이미 청구된 견적이면 409 로 거절한다` 고 예고하는데, **구현은 409 를 내지 않고 기존 청구를 돌려준다**(`:155`). 둘 다 코드에 있는 사실이므로 계약이 하나를 골라야 한다.

**판정: 재생(200 + 기존 청구)을 채택한다.** 근거 셋.

1. **호출부가 실패를 그릴 자리를 갖고 있지 않다.** `onCreateBilling`(`:181-187`)은 동기 호출이라 try/catch 도 실패 배너도 없다 — 409 를 받으면 **아무 일도 일어나지 않은 것처럼 보인다**. 성공 경로만 있는 호출부에 거절을 주는 것은 침묵을 주는 것과 같다.
2. **거절할 것이 없다.** 사용자가 원한 결과('이 견적의 청구를 연다')는 이미 존재하고, 재생은 그 결과로 정확히 데려간다. 409 는 **입력이 충돌했을 때** 쓰는 코드이지 '요청이 이미 이뤄졌을 때'가 아니다.
3. **`Idempotency-Key` 규약과 결이 같다**(`crud.ts:58-66`): 같은 키의 재요청은 재적용 없이 **최초 응답을 재생**한다. `quoteId` 는 헤더가 아니라 **도메인이 들고 있는 키**일 뿐 성질은 같다.

**따라서 재시도의 안전 경계는 이렇다.**

| 재시도 | 결과 | 근거 |
|---|---|---|
| 같은 견적으로 '청구 만들기' 재클릭·새로고침 후 재요청 | **안전 — 200 + 같은 청구**. 두 번째 청구는 만들어지지 않는다 | `data-source.ts:155` · `billing.test.ts:222-224` |
| 수주 전환되지 않은 견적으로 요청 | **422** `BILLING_CREATE_NOT_ORDERED`. 재시도해도 같다 — 견적을 먼저 전환해야 풀린다 | `types.ts:166` · 회귀 `billing.test.ts:216-220`(다섯 상태 전수) |
| 청구를 다른 견적에 재부착(`quoteId` 변경) | **거절한다 — `quoteId` 는 불변이다**(§7.3). 허용하면 멱등키가 옮겨 다니고 한 견적에 청구가 둘이 된다 |
| EP-04·EP-05 의 응답 유실 후 재시도 | **`Idempotency-Key` 가 없으면 안전하지 않다 — 입금·안내가 두 건 쌓인다**(§7.7) | `BillingDetailPage.tsx:195-196` |
| EP-03 의 재시도 | **안전 — 치환이라 같은 바디면 같은 결과**. 다만 그 사이 다른 사람이 저장했으면 그것을 덮는다(§7.6) | `data-source.ts:126` |

**미결로 남긴 것**: 견적이 **삭제된 뒤** 같은 견적번호로 다시 만들어졌을 때(견적 id 가 새로 발급된다) 이 멱등키는 두 청구를 허용한다. 그것이 옳은지는 견적 삭제 정책과 함께 봐야 한다(§7.13 #13).

### 7.2 입금 상태는 파생값이다 — 저장하지 않는다 【정합 판정】

**코드가 그 판단과 이유를 함께 들고 있다**(`types.ts:108-113`): *'상태를 따로 저장하면 「입금 3건은 있는데 상태는 미입금」 인 순간이 생기고, 목록 배지와 잔액이 동시에 거짓말을 한다. 파생이면 갈라질 수 없다.'* `Billing` 인터페이스(`:66-89`)에 상태 필드가 없고, 상세에 상태를 고르는 select 가 없으며(`BillingDetailPage.tsx:9-10`), 회귀가 이것을 **가장 먼저** 고정한다(`billing.test.ts:64-105`).

**판정: 서버도 상태·입금액·잔액·완납일을 저장하지 않는다.** 응답에 그 필드를 만들지도 않는다(EP-01·EP-02).

**저장하면 어긋나는 이유는 하나가 아니라 넷이다.** 이 도메인에서 상태를 결정하는 입력은 `payments` 배열과 `amount` **둘**이고, 그 둘을 바꾸는 경로가 각각 따로 있다. 저장된 상태는 그 둘 중 **어느 하나만 움직여도** 즉시 거짓이 된다 — 입금 1건이 들어오면 상태를, 잔액을, 완납일을, 목록 배지를, 미수금 합계를, 필터 건수 배지를 전부 같이 옮겨야 하고, 그 여섯 중 하나라도 빠지면 화면마다 다른 답을 말한다. 파생은 그 동기화 문제를 **존재하지 않게** 만든다: `applyPayment` 는 배열에 1건을 붙일 뿐인데(`types.ts:218`) 배지·잔액·완납일이 **동시에** 따라온다(`:212-213` 이 그렇게 밝힌다). 이것은 BE-044 §7.7 이 환불 총액을 저장하지 않는 것과 같은 결이며, 여기서는 **읽는 곳이 여섯 군데라 위험이 더 크다**.

**완료 판정은 마지막 한 건이 아니라 합이다.** 400,000 + 600,000 = 1,000,000 이면 **어느 한 건도 청구액에 닿지 않았는데 완료**다(`billing.test.ts:82-90`). 마지막 입금만 보고 판정하는 구현은 이 청구를 영원히 부분입금으로 남긴다.

**경계 넷을 서버가 그대로 지킨다.**

| 경계 | 규칙 | 근거 |
|---|---|---|
| 동치 | `paid === amount` 는 **완료**(`>=`) | `types.ts:119` |
| 초과 | 발생하지 않는다 — EP-04 가 `amount > outstanding` 을 422 로 막는다. **서버가 이 가드를 빠뜨리면 잔액이 음수가 되고**, 그때 `totalOutstanding` 의 `Math.max(…, 0)`(`:326`)이 그 음수를 0 으로 삼켜 **미수금 합계가 조용히 부풀려진다**(BE-044 §7.10 과 같은 결 — 방어가 신호를 지운다) | `:187,326` |
| 음수 | 통로가 없다 — `amount <= 0` 거절(`:186`). 감액 기록은 이 계약에 **존재하지 않는다**(§7.4) | `:186` · 회귀 `billing.test.ts:116-119` |
| 반올림 | 개입할 자리가 없다 — 입금액은 `Number.isInteger` 를 통과한 원 단위 정수, 청구액은 라인별 `Math.round` 후 합산된 정수(`quotes/types.ts:262`). **서버가 소수 금액을 허용하면 `paid >= amount` 가 오차로 갈린다** | `:186` |

**완납일은 '마지막으로 돈이 들어온 날'이 아니다.** `paidOnDate`(`:123-130`)는 배열을 **저장 순서대로** 누적하다가 처음 청구액에 닿은 **그 입금**의 날짜를 준다. 그래서 ① 부분입금 상태에서는 언제나 `''` 이고 ② **응답의 `payments` 순서가 곧 판정의 일부**다. 서버가 목록을 날짜순으로 정렬해 내려주면 같은 데이터가 다른 완납일을 낸다 — **기록된 순서를 정본으로 유지한다**(EP-02).

**연체·달성률은 이 계약에 없다.** `Billing` 에 **지급기한(due date) 필드가 없고**(`:66-89` 전수) 목표 개념도 없다. 그래서 '연체 N일'·'수금률'을 계산할 근거가 **데이터에 존재하지 않는다** — 화면이 미입금 건을 고르는 유일한 축은 `hasSentNotice` 와 상태 배지뿐이다(`BillingListPage.tsx:160-178`). 이것은 구현 누락이 아니라 **필드 부재**이므로 발명하지 않고 §7.13 #6 으로 남긴다.

### 7.3 서버 소유 필드를 요청에서 받지 않는다 — 12필드 중 **9개**가 그렇다 【보안 판정】

**현재 클라이언트가 문서 전체를 되돌려 보낸다**: `toBillingInput(billing)`(`types.ts:348-363`)이 `id` 만 빼고 12필드를 그대로 복사하고, `commit` 이 그것을 `PUT` 으로 보내며(`BillingDetailPage.tsx:195-196`), 저장소가 `{ ...billing, ...input, id }` 로 통째로 덮는다(`data-source.ts:126`). **관리자가 실제로 바꾸는 것은 `method`·`paymentLinkUrl`·`note` 셋뿐이다.**

**나머지 아홉이 만드는 사고 — 조작된 클라이언트 하나면 충분하다.**

1. **`amount` 를 낮추면 받지 않은 돈이 받은 것이 된다.** 잔액이 즉시 0 이 되어 상태가 `paid` 로 바뀌고(§7.2 파생), 목록 배지·입금일·미수금 합계가 **동시에** 거짓이 된다. 파생값이라 되돌릴 흔적도 없다 — **이 계약에서 가장 직접적인 금전 손실 경로다.**
2. **`payments` 에 엔트리를 넣으면 입금 사실 자체를 지어낼 수 있다.** 가드(`recordPaymentBlock`)는 **화면에만** 있고 저장 층에 없다(§7.5) — 초과 입금도, 음수 입금도, 소수 금액도 PUT 하나로 들어간다.
3. **`payments` 에서 한 건을 빼면 받은 입금이 사라진다.** append-only 원장의 정면 위반이고 **흔적이 남지 않는다.** 지운 것과 처음부터 없던 것을 구별할 방법이 응답에 없다.
4. **`notices[].at` 이 클라이언트 시계다**(`BillingDetailPage.tsx:276`). 독촉 이력은 감사 대상인데 발송 시각을 앞뒤로 옮길 수 있다 — '보냈다고 하는데 안 왔다'는 분쟁에서 이 값이 근거가 된다.
5. **`billNo` 를 바꾸면 두 청구가 같은 청구번호를 갖는다.** 채번의 정본은 `nextBilling`(`data-source.ts:97-101`)인데 중복 검사가 없다.
6. **`quoteId` 를 바꾸면 멱등키를 옮길 수 있다.** 이미 청구된 견적에 두 번째 청구를 붙이거나 청구를 다른 견적에 재부착하면, `findBillingIdByQuote`(`:142-145`)가 다른 답을 내고 견적 상세의 '청구 만들기' 버튼이 **되살아난다**(§7.1 ①이 무력화된다).
7. **기록 id 가 `bp-${Date.now()}`·`bn-${Date.now()}`**(`:260,275`)다. 같은 밀리초의 두 요청이 **같은 id** 를 만든다 — React `key` 중복이 먼저 드러나고, 서버가 그 id 를 PK 로 쓰면 충돌한다.
8. **`accountId`·`accountName`·`quoteNo`·`issuedAt`** 은 견적에서 승계한 스냅숏이다(`types.ts:381-397`). 바꾸면 청구서가 **다른 거래처의 것으로 보인다**.

**판정**: `billNo` · `quoteId` · `quoteNo` · `accountId` · `accountName` · `amount` · `issuedAt` · `payments` · `notices` · 기록의 `id`·`at` 은 **전부 서버가 소유한다.** 요청 바디의 이 값들은 **무시**한다 — 파싱조차 하지 않는다. 이것은 UX 개선이 아니라 **금액·원장 무결성 요구**다.

**계약을 둘 중 하나로 바꾼다.**

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | EP-03 이 `{ method, paymentLinkUrl, note }` **3개만** 받고, 원장은 EP-04·EP-05 의 **append 전용 엔드포인트**로만 자란다(심이 이미 그렇게 예고한다 — `data-source.ts:165-166`) | 위조가 구조적으로 불가능하다. 요청 크기가 이력에 비례해 커지지 않는다. **동시성 문제도 함께 사라진다**(§7.6). `toBillingInput` 이 통째로 사라지고 화면은 저장 3곳(`:258-266,273-281,287-294`)만 바뀐다 |
| **B (차선)** | PUT 을 유지하되 서버가 9필드를 **무시** | 어댑터를 덜 흔든다. 그러나 `BillingInput` 이 실제로 쓰이지 않는 필드를 계속 실어 보내는 기형이 남고, **lost update(§7.6)가 그대로 살아 있다** — 그것은 '무시'로 풀리지 않는다 |

**안 A 를 택한다.** 안 B 는 §7.3 은 막지만 §7.4·§7.6 을 못 막는다.

### 7.4 원장은 append-only 인데 **저장 계약이 그것을 강제하지 않는다** 【보안 판정】

**화면 층의 규율은 완전하다.** `applyPayment`·`applyNotice`(`types.ts:215-226`)가 배열 끝에 덧붙이기만 하고, 감액 엔트리는 `amount <= 0` 거절(`:186`)로 **만들 수 없으며**, 두 표에 수정·삭제 액션이 0건이고(`BillingDetailPage.tsx:503-547,604-640`), 상세에 삭제 버튼이 없다(`:6-7`). 화면이 사용자에게 그 사실을 **입금하기 전에** 말한다(`:436` — '기록한 입금은 되돌릴 수 없습니다' 만 `<strong>`). 그 문을 열지 않는 이유가 코드에 있다(`types.ts:51-55`): *'되돌리는 문을 미리 열어 두면 그것이 곧 「입금 취소」 버튼이 된다.'*

**그런데 저장 계약은 정반대다.** `BillingInput` 이 `payments`·`notices` 전문을 담고(`:348-363`) `updateBilling` 이 통째로 치환한다(`data-source.ts:126`). 즉 **append-only 는 화면의 규율일 뿐 계약의 불변식이 아니다.** 서버가 이 모양을 그대로 받으면 §7.3 #3 이 곧바로 실현되고, 그때 원장이라는 말은 의미를 잃는다.

**판정**: 서버는 `payments`·`notices` 를 **요청 바디에서 받지 않는다.** 두 배열이 자라는 유일한 경로는 EP-04·EP-05 이며, **그 엔드포인트에 수정·삭제 메서드를 만들지 않는다**(`PATCH /payments/:pid` · `DELETE /payments/:pid` 를 **열지 않는다**). 심이 그것을 이미 못박고 있다 — `POST /api/sales/billing/:id/payments (입금확인 수기 처리 — **되돌리는 전이는 없다**)`(`data-source.ts:165`).

**이 판정이 남기는 위험을 정직하게 적는다.** 잘못 기록한 입금을 **앱 안에서 고칠 방법이 전혀 없다.** 회계의 정석인 **반대 부호 기록(감액 엔트리)** 도 `amount <= 0` 거절로 함께 막혀 있어서, 실수의 유일한 복구가 '데이터베이스를 직접 고친다'가 된다. 그것은 감사 관점에서 최악이다 — 원장을 지키자고 만든 규칙이 **원장 밖에서의 수정**을 강제한다.

**따라서 문은 삭제가 아니라 감액으로 연다**(언제 여는지는 미정 — §7.13 #4): ① 기존 엔트리를 고치지 않고 **음수 엔트리 1건을 덧붙인다** ② 그 엔트리는 `reason` 과 `correctsPaymentId` 를 필수로 갖는다 ③ `recordPaymentBlock` 의 ②는 **정정 경로에서만** 완화되고 일반 입금 경로는 그대로 막는다. 이 셋이 함께여야 '입금 취소 버튼'이 되지 않는다. **이 문서는 그 엔드포인트를 만들지 않는다** — 코드에 없는 것을 계약으로 쓰지 않는다.

### 7.5 전이 가드는 **화면에만** 있다 — 저장 층에 술어가 없다 【정합 판정】

**같은 술어 규약은 이 도메인에서도 명시적이다**(`types.ts:142-146`): *'버튼의 disabled 조건과 저장의 거절 조건이 같은 술어를 읽는다 — 둘이 갈라지면 「눌리는데 실패하는 버튼」 또는 「눌리지 않는데 저장은 되는 동작」이 생긴다.'* 코드가 그것을 **세 겹**으로 지킨다.

| 겹 | 코드 | 성립 |
|---|---|---|
| 버튼 잠금 | `disabled={saving \|\| paymentBlock !== null}`(`BillingDetailPage.tsx:495`) · `disabled={saving \|\| noticeBlock !== null}`(`:596`) | ✅ |
| 사유 문장 | `<Alert tone="warning">{paymentBlock}</Alert>`(`:485-487`) · `{noticeBlock}`(`:590`) — **같은 변수를 그대로 그린다** | ✅ 잠금과 문장이 갈라질 수 없다 |
| 실행 재확인 | `if (paymentBlock !== null) return;`(`:257`) · `if (noticeBlock !== null) return;`(`:272`) | ✅ |
| 적용 함수 | `applyPayment`/`applyNotice` 가 막힌 기록에 **던진다**(`types.ts:216-217,223-224`) — 술어가 먼저 걸렀어야 하므로 도달하면 버그다. 회귀가 그것을 고정한다(`billing.test.ts:151-155`) | ✅ **그러나 그 예외는 렌더 트리로 올라가 `ErrorBoundary`(`AppShell.tsx:395`)가 화면 전체를 대체한다** — 마지막 방어선이 '화면이 사라진다'인 것은 의도가 아니다 |

**빠진 것은 네 번째 겹이다.** `updateBilling`(`data-source.ts:120-128`)은 **존재 여부만** 검사하고 가드를 **재판정하지 않는다.** 클레임의 어댑터가 저장 직전에 같은 함수로 다시 막는 것(BE-044 §7.1)과 정반대이고, 그래서 이 도메인은 **화면을 우회하면 아무 규칙도 남지 않는다.**

**판정**: 서버는 §3 의 세 표를 **저장 시점의 저장된 값으로** 재판정한다. 특히 EP-04 의 ③(`amount > outstanding`)은 **행 락 안에서** 다시 본다 — 프론트 판정은 자기 스냅숏 기준이라 두 요청이 각각 통과할 수 있다(§7.6). 위반은 **422** 이며 §3 의 **사유 문자열을 그대로** 돌려준다: 화면이 그 문장을 이미 그리고 있으므로(`:485-487,590`) 서버 문구가 같으면 사용자는 같은 말을 듣는다.

**한 번에 한 사유만 준다.** 판정 순서가 곧 규칙이고 첫 위반이 이긴다(§3) — 다중 위반을 모아 보내면 화면의 `Alert` 한 칸이 그것을 표현하지 못한다.

### 7.6 동시성 — 전체 치환은 과입금이 아니라 **입금을 잃는다** 【정합 판정】

**낙관적 동시성 토큰이 없다.** `grep -rn "version|updatedAt|If-Match" apps/admin/src/pages/sales/billing` → **0건**(2026-07-22 실측). 409 는 `updateBilling`(`data-source.ts:122-124`)과 어댑터(`crud.ts:256-258`)가 **존재 여부**로만 낸다. 따라서 **동시 편집은 last-write-wins** 다.

**두 운영자가 같은 청구에 동시에 입금을 등록하면 무슨 일이 일어나는가.** 코드로 따라가면 이렇다.

1. 둘 다 상세를 열어 같은 스냅숏 `billing`(payments = [P1])을 쥔다.
2. A 가 400,000 을 기록한다 → `applyPayment` 가 `[P1, A]` 를 만들고(`types.ts:218`) `commit` 이 **문서 전체**를 PUT 한다(`BillingDetailPage.tsx:195-196`).
3. B 가 600,000 을 기록한다 → B 의 `billing` 은 아직 `[P1]` 이므로 `[P1, B]` 를 만들어 PUT 한다.
4. `updateBilling` 이 `{ ...billing, ...input, id }` 로 덮는다(`data-source.ts:126`) → 최종 `payments = [P1, B]`.

**결과: A 의 입금이 사라진다.** 과입금이 되는 것이 아니라 **하나가 진다** — 그리고 진 쪽은 성공 통지를 받았고(그 시점에는 참이었다) 화면에도 잠깐 보였다. **append-only 원장이 저장 층에서 정확히 반대로 뒤집힌다.** 각자의 `recordPaymentBlock` 은 자기 스냅숏 기준이라 **둘 다 통과**하므로 가드도 이것을 잡지 못한다. 이 경로를 고정하는 회귀는 **없다** — `billing.test.ts` 312행은 전부 순수 함수 회귀이고 어댑터 경계 테스트가 0건이다.

**같은 탭 연타는 다르다.** `commit` 이 이전 요청을 **abort** 하고(`:192`) 두 요청 모두 같은 스냅숏에서 파생되므로 최종 결과는 **입금 1건**이다 — 전체 치환이 우연히 완화 역할을 한다. **그러나 그 완화는 EP-04(POST append)로 가는 순간 사라진다**(§7.7). 그리고 abort 는 클라이언트가 결과를 버릴 뿐 **서버 도달을 막지 않는다**.

**판정**: 안 A(§7.3·§7.7)를 채택하면 **다투는 필드가 3개(`method`·`paymentLinkUrl`·`note`)로 줄고 원장은 append 라 충돌 자체가 사라진다.** 그 위에 EP-03 에 `If-Match`(ETag) 또는 `Billing.version` 을 **선택적으로** 얹는다 — 세 설정 필드의 last-write-wins 는 잃을 것이 작다. **안 B 를 유지한다면 낙관적 동시성 토큰이 필수다** — 그러지 않으면 입금이 조용히 사라지는 경로가 계약에 남는다.

**409 가 화면에 도달하지 않는 문제는 별개다**: 저장소가 `'다른 사용자가 먼저 삭제한 청구입니다.'` 라는 **정확한 문장을 이미 들고 오는데**(`data-source.ts:123`) 화면이 그것을 버리고 자기 문구를 쓴다(`:206`). `isConflict`(`http-error.ts:141`)·`referenceOf`(`:151`)가 이미 있다 — 소비만 하면 된다(§7.13 #5).

### 7.7 심은 `POST` 를 말하고 구현은 `PUT` 을 한다 — 이 갈림이 멱등키의 필요를 결정한다 【경계 판정】

**두 사실이 나란히 있다.** 심(`data-source.ts:165-166`)은 입금·안내를 **각각 `POST`(append)** 로 예고하고, 구현(`BillingDetailPage.tsx:189-210`)은 셋을 **하나의 `PUT` 전체 치환**으로 보낸다. FS-077 §5 각주도 이 갈림을 사실로 남겼다. **계약이 하나를 골라야 한다.**

| 축 | 현 구현 (PUT 전체 치환) | 심이 예고하는 계약 (POST append) |
|---|---|---|
| 연타·재시도 | **입금 1건** — 나중 요청이 앞선 것을 덮는다(§7.6) | **입금 2건** — 키가 없으면 append 가 두 번 일어난다 |
| 두 운영자 동시 등록 | **하나가 사라진다**(lost update — §7.6) | **둘 다 남는다** — 충돌이 원리상 없다 |
| 위조 표면 | 12필드 전량(§7.3) | 3필드(설정) + 기록 1건 |
| 요청 크기 | 이력에 비례해 무한히 커진다 | 상수 |
| 멱등키 | 자연 멱등(같은 바디면 같은 결과) | **필수** |

**판정: POST append 를 채택하고 `Idempotency-Key` 를 필수로 한다.** 두 위험은 교환 관계이며 **원장 도메인에서는 lost update 가 더 나쁘다** — 사라진 입금은 흔적조차 남지 않아 아무도 발견하지 못하지만, 이중 입금은 표에 두 줄로 남아 발견되고 (감액 문이 열리면) 정정할 수 있다. 그리고 사라진 쪽은 **통장에 실재하는 돈**이다.

**멱등키의 자리와 원장은 이미 코드에 있다.** `UpdateVars.idempotencyKey`(`crud.ts:340-346`) · `createIdempotencyLedger`(`crud.ts:67-77`) · 소비 지점(`crud.ts:232,245,272`) · 헤더 규약(`client.ts:70` `Idempotency-Key`). **비어 있는 것은 호출부 하나다** — `update.mutate({ id, input, signal })`(`BillingDetailPage.tsx:195-196`)가 키를 넣지 않아 **원장이 영원히 발현되지 않는다.** 형제 화면은 그 자리를 채워 쓴다(`pages/members/components/PointsCard.tsx`).

**서버의 키 처리 규약**(픽스처 원장이 이미 흉내 내는 것 — `crud.ts:58-66`):
1. 같은 키 + 같은 바디 → **최초 응답을 재생한다.** 두 번 적용하지 않는다.
2. 같은 키 + **다른 바디** → **409 `CONFLICT`.** 키를 재사용해 다른 입금을 밀어 넣는 것을 막는다.
3. **기록은 성공한 뒤에만 한다** — 미리 기록하면 실패한 첫 시도가 키를 태워 **재시도가 영원히 no-op** 이 된다(`crud.ts:60-65` 가 그 함정을 명시한다). 사용자는 '기록했습니다'를 보지만 통장의 돈은 어디에도 없다.
4. 키의 수명은 **최소 24시간** — 세션 만료·재로그인 후의 재시도가 같은 키를 쓸 수 있어야 한다.

**프론트에 함께 와야 하는 것**(이 계약만으로는 성립하지 않는다): 제출 **시도** 단위 키 생성 + **동기 제출 락**(`submitLockRef` — grep 0건, 선례 `pages/settings/_shared/queries.ts` 의 `useSubmitLock`). `disabled={saving}` 만으로는 클릭과 리렌더 사이 틈이 남는다.

### 7.8 이 도메인에는 **미배선 seam 이 없다** — 대신 '실패할 수 없는 쓰기'가 있다 【정합 판정】

BE-044 §7.11 이 세운 규약('미배선을 성공으로 위장하지 않는다')을 이 도메인에 적용하려면 먼저 사실을 확인해야 한다. **확인 결과: 등록기 seam 이 하나도 없다.** `src/wiring.ts` 전수 grep 에 `billing` **0건** — 클레임의 `registerStockApplier`·`registerPointLedgerAppender` 같은 자리가 이 도메인에는 존재하지 않는다. 청구가 견적에 닿는 방식은 **같은 페이지(`pages/sales`) 안의 직접 import** 이고, 그것은 페이지 결합이 아니라서 이음매를 세울 이유가 없었다(`shared/domain/quote-issue.ts:20-21` 이 같은 판단을 밝힌다 — 페이지 경계를 넘는 두 문의만 이음매를 지난다).

**그래서 이 도메인의 '조용한 거짓 성공'은 다른 모양이다.**

| 부수효과·조회 | 멱등키 | 미배선·실패 시 |
|---|---|---|
| `createBillingFromQuote`(`data-source.ts:153-159`) — 청구 생성 | **`quoteId`**(§7.1) | **실패 경로가 없다.** 동기 함수라 `fixtureRequest` 를 타지 않는다 — 지연·`?fail=`·`?status=`·abort·멱등 원장이 **전부 걸리지 않는다.** 던지면 렌더 트리로 올라가 `ErrorBoundary`(`AppShell.tsx:395`)가 화면을 대체한다. **이 쓰기는 언제나 성공한다** |
| `findBillingIdByQuote`(`:142-145`) — 견적→청구 역조회 | — (조회) | **'모른다'와 '없다'가 같은 `''` 다.** 모듈 지역 배열을 렌더 중에 직접 읽으므로 지금은 실패할 수 없지만, **서버가 붙는 순간 조회 실패가 `''` 로 보이고 그때 '청구 만들기' 버튼이 되살아난다** — 두 번째 청구를 만들 문이 조회 장애로 열린다 |
| `billingAdapter.update`(`:167-174`) — 설정·입금·안내(현재) | **미전달**(`BillingDetailPage.tsx:195-196`) | 409/generic 모두 배너 문구 1종(`:206`). 저장소가 들고 온 사유가 버려진다 |
| `applyPayment`·`applyNotice`(`types.ts:215-226`) | — (순수) | **막힌 기록이 오면 던진다** → `ErrorBoundary` 가 화면 전체를 대체한다. 술어가 먼저 거르므로 정상 경로에서는 도달하지 않지만, **도달했을 때의 표현이 '화면이 사라진다'인 것은 의도가 아니다** |
| `computeTotals`(`quotes/types.ts:255-265`) — 청구액 산출 | — (순수, 생성 시 1회) | 실패하지 않는다. 다만 **결과가 스냅숏으로 굳으므로**(§7.9) 잘못된 값이 굳으면 되돌릴 경로가 없다 |

**판정**: **'실패할 수 없는 쓰기'가 이 도메인의 최악 실패 모드다.** 조용한 거짓 성공과 성질이 같다 — 사용자는 성공만 보고, 실패는 표현될 자리가 없다. 서버가 붙는 순간 EP-06 에는 401·403·404·422·429·500·504 가 **전부 생기는데** 그것을 받을 코드가 호출부(`QuoteDetailPage.tsx:181-187`)에 0줄이다. 따라서 백엔드 연동은 **EP-06 을 react-query 뮤테이션으로 승격하는 프론트 변경과 한 배치여야 한다** — 그러지 않으면 '청구 만들기'를 눌렀는데 아무 일도 일어나지 않는 화면이 남는다(§7.13 #3).

**그리고 역조회는 응답에 실려야 한다**: 견적 상세 응답이 `billingId` 를 갖고 오면 동기 계약이 자연스럽게 성립하고, **'모른다'(조회 실패)와 '없다'(`''`)를 서버가 구분해 줄 수 있다.**

### 7.9 소유 경계 — 이 계약이 **기록**하는 것과 하지 않는 것 【범위 판정】

**세 도메인의 경계가 이 화면에서 만난다.** 각각의 정본은 여기가 아니다.

| 사실 | 정본 | 이 계약의 역할 |
|---|---|---|
| 견적의 품목·금액·상태 | **견적 계약(BE-050)** | **읽고 복사한다.** `quoteNo`·`accountId`·`accountName`·`amount` 는 생성 시점의 **스냅숏**이며 이후 견적 변경과 무관하다(`types.ts:371-377`) |
| 견적의 수주 전환 | 견적 계약 | **읽기만** 한다 — `isOrderedQuote` 가 청구의 문을 여는 유일한 조건(§3) |
| 거래처 마스터 | 거래처 계약(FS-048) | 이름·id 사본을 든다. **FK 가 아니다** — `accountId === ''` 면 미등록으로 그린다(`AccountLink.tsx`) |
| **실제 입금(은행 계좌)** | **앱 밖 — 통장이 정본이다** | 사람이 확인한 사실을 **기록**한다. 앱은 계좌를 조회하지 않는다 |
| **개인결제창의 결제 결과** | **앱 밖 — 링크 너머** | **링크를 보관만** 한다. 눌러서 상태를 조회하지도, 완료를 추측하지도 않는다(`types.ts:75-80`) |
| 안내 메시지의 실제 발송 | 마케팅/메시지 계약 | **보낸 사실만** 기록한다. 앱이 보내지 않는다(`BillingDetailPage.tsx:552-555`) |

**따라서 이 계약이 기록하는 것과 하지 않는 것은 이렇다.**

| 기록한다 | 기록하지 않는다 |
|---|---|
| 얼마를 청구했는가(`amount` — 견적 합계의 스냅숏) | 그 금액이 지금도 견적과 같은가 |
| 어떤 방식으로 청구했는가(`method`) · 개인결제창 링크(보관) | 그 링크로 결제가 일어났는가 |
| 누가 언제 얼마를 넣었다고 **사람이 확인했는가**(`payments`) | 은행에 그 입금이 실재하는가 |
| 언제 무엇으로 안내했다고 **사람이 기록했는가**(`notices`) | 그 메시지가 실제로 발송·도달했는가 |
| 파생: 상태·잔액·완납일·미수금 합계(§7.2) | 연체 여부·수금률 — **지급기한 필드가 없다**(§7.2) |

**청구액이 스냅숏인 것은 설계다.** 참조로 두면 견적을 나중에 고쳤을 때 **이미 보낸 청구서의 금액이 사후에 바뀌고, 그 청구서를 근거로 받은 입금이 전부 어긋난다**(`types.ts:371-377`). 서버도 이 분업을 지킨다 — EP-06 이 생성 시점에 `computeTotals` 를 **한 번** 계산해 값으로 굳히고, 이후 어떤 엔드포인트도 그것을 다시 계산하지 않는다. **요청이 준 금액도 쓰지 않는다**(§7.3 #1).

**미정으로 남기는 것 — 실제 입금과 기록이 함께 확정되는가.** 이 앱에는 계좌 연동도 PG webhook 도 없다(이 모듈에 `payment`/PG 호출 grep 0건). 운영자는 통장을 보고 '입금확인 기록'을 누르며, **두 사건 사이에 원자성이 없다.** 사람이 잘못 보면 받지 않은 돈이 기록되고, 기록을 잊으면 받은 돈이 미수로 남는다 — 그리고 이 계약은 어느 쪽도 감지하지 못한다. **은행 거래내역 연동(오픈뱅킹)이 붙었을 때 이 기록이 「사람의 판정」으로 남는지 「자동 매칭의 확인」이 되는지가 아키텍처 결정이며, 이 문서는 그것을 정하지 않는다**(§7.13 #10).

### 7.10 청구 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/sales/billing` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 청구 리소스의 존재 자체가 거래 정보다** → 영업 도메인 **읽기 권한이 없는** 주체에게는 **404 `BILLING_NOT_FOUND`** 로 은닉한다.

**근거**: 청구 1건은 `accountName`(거래처) · `amount`(거래 규모) · `payments[].memo`(입금자명 — 통장 표기) · `quoteNo` 를 담는다. 즉 **한 거래처와 얼마짜리 거래를 했고 언제 얼마가 들어왔는지**가 이 응답 하나에 들어 있다. 청구번호는 `'BL-' + 청구일 + 3자리 순번`(`types.ts:366-369`)이라 **열거로 그 날의 청구 볼륨을 추정**할 수 있고, 견적번호도 같은 형식이다. BE-050 §7.3 이 개별 견적을 404 로 은닉하는 것과 **같은 이유로** 404 여야 한다.

**반대로 읽기 권한이 있는 주체**가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다.

**입금자명은 마스킹하지 않는다.** `memo` 는 '통장 표기가 주문자와 다를 때 **유일한 단서**'이며(`types.ts:62`) 그 단서를 가리면 필드의 목적이 사라진다. 대신 **읽기 권한 자체를 좁히는 것**이 옳은 통제다. 다만 목록 응답에까지 실릴 이유는 없다(§7.12).

### 7.11 이 라우트는 **어떤 플랜 모듈에도 속하지 않는다** 【경계 판정】

**실측**: `MODULE_RESOURCES` 의 `sales.pipeline` 은 `/sales/accounts` · `/sales/contracts` · `/sales/quotes` · `/sales/inquiries` · `/sales/projects` · `/sales/consultations` 를 지배하는데(`module-resources.ts:52-60`) **`/sales/billing` 이 그 목록에 없다.** 따라서 `entitlementKeyForResource` 가 `null` 을 주고 `entitlementStateForResource` 가 곧바로 **`GRANTED`** 를 돌려준다(`route-entitlement.ts:20,27-28`).

**그 결과**: `sales.pipeline` 을 내린 플랜에서 **견적은 잠기는데 그 견적에서 나온 청구는 열린다.** 청구 상세는 `quoteNo`·`accountName`·`amount` 를 담으므로, 잠긴 견적의 내용 일부가 청구를 통해 그대로 보인다.

**판정**: 이것은 **패키징 매핑의 누락**이지 엔타이틀먼트 축의 설계 실패가 아니다 — fail-open 은 의도된 방향이고 그 이유가 코드에 적혀 있다(`route-entitlement.ts:10-12` — *'판정 실패가 기능 정지가 되면 안 된다'*). 판정 축의 방향은 그대로 유지한다: **권한 = fail-closed · 엔타이틀먼트 = fail-open.** 다만 `/sales/billing` 을 `sales.pipeline` 에 **넣어야 한다** — 청구 없이 견적만 파는 계약도, 견적 없이 청구만 파는 계약도 이 앱에는 없다(청구를 만드는 유일한 경로가 견적 상세다). **이 판정의 실행은 엔타이틀먼트 소유 모듈의 일이며 이 계약의 응답 코드가 아니다**(§7.13 #12).

### 7.12 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제.**

1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며 프론트가 필터·검색을 전부 클라이언트에서 한다(`BillingListPage.tsx:120-123`). **청구는 시간이 갈수록 단조 증가하는 회계 기록**이라 이 화면이 앱에서 가장 먼저 커진다.
2. **목록이 원장 전문을 담는다.** `Billing` 타입 하나를 목록·상세가 공유해 목록 응답에 `payments`(입금자명 포함) · `notices`(메모 포함) · `note` 가 전부 실린다 — **목록이 실제로 쓰는 것은 그 배열들의 파생값 넷(`paidAmount`·`outstandingAmount`·`billingPaymentState`·`paidOnDate`)과 `notices.length` 뿐**인데(`:154-186`) 입금자명과 메모 원문이 통째로 내려온다. §7.10 의 취지와 충돌한다.

**판정**: **`BillingSummary` / `Billing` 을 분리**하고 EP-01 에 `state`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `BillingSummary` 는 `payments`·`notices`·`note` 를 빼고 **서버가 계산한 파생값 넷 + `noticeCount`** 를 싣는다.

> **⚠ 그 순간 §7.2 와 충돌하는 것처럼 보인다.** 충돌하지 않는다 — §7.2 가 금지하는 것은 **저장**이지 **계산해서 내려주는 것**이 아니다. 목록 요약의 파생값은 **응답을 만들 때 원장에서 계산**하며 어떤 테이블에도 컬럼으로 남지 않는다. 그래야 '입금 3건은 있는데 상태는 미입금'이 생길 자리가 없다. **저장된 파생값과 계산된 파생값의 차이가 이 계약의 핵심이다.**

**이관**: 이 변경은 프론트 대공사다 — `filterBillings`·`searchBillings`·`countBillingsByState`·`totalOutstanding` 이 서버로 올라가고 페이지네이션 UI 가 함께 붙어야 한다. **URL list state 는 이미 있다**(`useListState`) — `page` 파라미터를 쓰기만 하면 된다. quality-bar IA-04 P0 가 이 화면을 gap 으로 잡고 있다. 그전까지 현 계약(전량)을 유지한다 — 시드 3건에서는 드러나지 않는다.

**미수금 합계와 건수 배지는 별개다.** 둘 다 **필터 이전 전체 집합**에서 세며(`types.ts:312` · `BillingListPage.tsx:117-118`) 페이징이 도입되면 클라이언트가 그것을 셀 수 없다 — **EP-01 응답에 `summary: { outstandingTotal, counts }` 를 실어야 한다.** '아직 못 셌으면 `null`'(0 으로 위장하지 않는다 — `:114-115`)이라는 현 규약을 서버도 지킨다.

### 7.13 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **서버 소유 9필드를 요청 바디에서 제거(§7.3 안 A)** — 특히 `amount`·`payments`·`notices`. **금액·원장 무결성의 핵심이다** | **백엔드 명세 (최우선)** · UI 기획 |
| 2 | **입금·안내를 `POST` append 로 승격하고 `Idempotency-Key` 를 필수화(§7.7)** — 자리도 원장도 이미 있고 호출부만 비어 있다(`BillingDetailPage.tsx:195-196`). 프론트에 동기 제출 락도 없다(quality-bar EXC-08 P0) | **백엔드 명세 · UI 기획 (최우선)** |
| 3 | **EP-06 을 react-query 뮤테이션으로 승격(§7.8)** — 지금은 동기 호출이라 로딩·실패·중복 클릭 방어가 **전부 없다.** 백엔드 연동과 **한 배치여야 한다** | **아키텍처 (선행)** · 프론트 구현 |
| 4 | **감액(정정) 기록의 문을 언제 어떻게 여는가(§7.4)** — 지금은 잘못 기록한 입금을 앱 안에서 고칠 방법이 전혀 없고, 유일한 복구가 DB 직접 수정이다 | **아키텍처 (도메인)** · UI 기획 |
| 5 | 409·403·422·5xx 가 화면에서 **한 문구로 뭉개진다**(`:206`) — 저장소가 들고 온 정확한 문장도, `referenceOf` 의 참조 코드도 버려진다. `isConflict`·`isForbidden`·`referenceOf` 가 이미 있다 | UI 기획 (quality-bar EXC-06 · EXC-20) |
| 6 | **지급기한(due date) 필드가 없다**(§7.2) — 연체 판정·독촉 우선순위·수금 SLA 를 계산할 근거가 데이터에 없다. `Billing` 에 `dueOn` 을 더할지 결정해야 한다 | 백엔드 명세 · UI 기획 |
| 7 | 입금일 검증이 **모양만** 본다(`DATE_RE` — `types.ts:172`) — `2026-02-31` 도 미래 날짜도 통과한다. 서버가 달력 실재 + `issuedAt` 이전·미래 금지를 더한다 | 백엔드 명세 |
| 8 | **안내 기록이 실제 발송과 무관하다**(§7.9) — 메시지 계약이 붙으면 이 기록은 발송 결과의 사본이 되어야 한다. 지금은 사람이 '보냈다'고 적는 것이 전부이고 발송 시각도 클라이언트 시계다 | 백엔드 명세 · 아키텍처 |
| 9 | `digitsToNumber`(`BillingDetailPage.tsx:144-147`)가 `'12abc34'` 를 **조용히** `1234` 로 읽는다 — 사용자는 무엇이 저장됐는지 화면에서 확인할 수 없다. 서버가 원문을 받는 계약이면 400 으로 갈린다 | UI 기획 · 백엔드 명세 |
| 10 | **실제 입금과 기록이 함께 확정되지 않는다(§7.9 — 미정)** — 계좌 연동(오픈뱅킹)이 붙었을 때 이 기록이 '사람의 판정'인지 '자동 매칭의 확인'인지 정해야 한다 | **아키텍처 (선행)** · 백엔드 명세 |
| 11 | **소비자 0건인 삭제 경로**(`removeBilling` · 어댑터 `remove`) — 계약에 없는 표면이 코드에 살아 있어 다음 사람에게 '여기 삭제가 있다'고 잘못 말한다 | UI 기획 쪽 변경 요청 |
| 12 | **`/sales/billing` 이 어떤 플랜 모듈에도 속하지 않는다(§7.11)** — `sales.pipeline` 에 넣어야 한다. 지금은 견적이 잠긴 플랜에서 청구가 열린다 | 엔타이틀먼트 소유 모듈 · 명세 리뷰 |
| 13 | **견적 삭제와 청구의 관계가 미정(§7.1)** — 견적이 지워지면 `quoteNo` 문자열은 남고 링크만 깨진다. 견적 삭제가 청구를 검사하지 않으며, 삭제 후 재발행된 견적은 새 id 라 멱등키를 우회한다 | 백엔드 명세 (BE-050 연동) |
| 14 | 청구번호 `seq` 가 **프로세스 지역 카운터**(`data-source.ts:94`) — 서버가 채번의 정본이어야 하고 중복 검사도 필요하다(§7.3 #5) | 백엔드 명세 |
| 15 | 목록 페이징 + `BillingSummary` 분리 + `summary` 집계(§7.12) — IA-04 P0 와 한 배치로 | 백엔드 명세 · UI 기획 |
| 16 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료가 입력한 입금액·메모를 버린다 | 프론트 구현 (quality-bar EXC-05 · EXC-11 · EXC-19) |
| 17 | **이탈 abort 는 클라이언트만 결과를 버릴 뿐 서버 도달을 보장하지 않는다**(`:183,192`) — 입금이 이미 기록됐는데 화면에 안 보일 수 있고, 그때 운영자는 다시 누른다(§7.7 이 그 재시도를 안전하게 만든다) | 백엔드 명세 · UI 기획 |
| 18 | **어댑터 경계 회귀가 0건이다** — `billing.test.ts` 312행은 전부 순수 함수다. §7.6 의 lost update 도, 409 경로도, 멱등 재생도 고정하는 테스트가 없다 | 프론트 구현 · 명세 리뷰 |

## 8. 자기 점검

- [x] FS-077 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 6건(EP-01·02·03·04·05·06) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**(삭제는 §1 '범위 밖'·§6 에서 계약 없음으로 판정했고, 감액 기록 엔드포인트는 §7.4 에서 **만들지 않는다**고 명시했다)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (6행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한(§2 `operator` 쓰기 허용 · EP-06 은 견적 권한)·타임아웃(EP-06 7초)·엔타이틀먼트 미매핑(§7.11)만 고유 차이**를 근거와 함께 기술
- [x] **멱등성 판정** — `Billing.quoteId` 가 도메인 멱등키임을 코드로 확인하고(`types.ts:70` · `data-source.ts:153-159` · 회귀 `billing.test.ts:210-225`), **심의 409 와 구현의 재생이 갈리는 사실**을 §7.1 에 표로 올린 뒤 **재생을 채택**했다. 어떤 재시도가 안전하고 어떤 것이 422/409 인지 표로 못박았다
- [x] **입금 상태가 파생값임을 코드로 확인**하고(`types.ts:66-89` 에 필드 없음 · `:114-120` 매 호출 계산 · 회귀 `billing.test.ts:64-105`) 저장 금지를 §7.2 로 계약화했다. 경계 넷(동치·초과·음수·반올림)을 각각 코드 근거와 함께 적었고, **연체·달성률은 지급기한 필드가 없어 판정 불가**임을 발명 없이 미결로 남겼다
- [x] **전이 가드 표를 코드의 `if` 순서 그대로** 옮기고 **거절 사유 문자열을 그대로** 적었다(§3 세 표). 화면 disabled 와 저장 거절이 같은 술어를 읽는 사실을 §7.5 에 판정으로 남기고, **네 번째 겹(저장 층 재판정)이 빠져 있다**는 사실을 함께 못박았다
- [x] **원장 성격을 코드로 확인**했다 — 화면 층은 append-only 이나 **저장 계약이 그것을 강제하지 않는다**(§7.4). 그 위험(사후 정정 불가 → DB 직접 수정)을 정직하게 적고, 문을 여는 방식은 삭제가 아니라 감액임을 밝히되 **엔드포인트를 만들지 않았다**
- [x] **미배선 seam 을 코드로 확인**했다 — `wiring.ts` 에 `billing` **0건**이라 이 도메인에는 등록기 seam 이 없다. 대신 '실패할 수 없는 쓰기'(동기 생성·동기 역조회)를 `부수효과·조회 \| 멱등키 \| 미배선·실패 시` 표로 정리하고 그것이 이 도메인의 최악 실패 모드임을 §7.8 에 판정으로 남겼다
- [x] **동시성** — `version`/`updatedAt`/`If-Match` grep **0건**을 실측하고 last-write-wins 로 단정했다. 두 운영자의 동시 입금이 **과입금이 아니라 lost update** 를 만드는 것을 코드로 4단계 추적해 §7.6 에 적었고, 409 의 출처(`data-source.ts:122-124` · `crud.ts:256-258`)와 그것이 화면에 도달하지 않는 사실(`:206`)을 함께 밝혔다
- [x] 보안 판정 3건 — **서버 소유 9필드 위조(§7.3)** · **원장 치환(§7.4)** · **403 vs 404 은닉(§7.10)**. 정합 판정 4건(§7.1·§7.2·§7.5·§7.6·§7.8) · 경계 판정 2건(§7.7·§7.11) · 범위 판정 1건(§7.9)
- [x] **소유 경계를 【범위 판정】으로 갈랐다**(§7.9) — 견적의 정본은 BE-050, 실제 입금·결제·발송의 정본은 **앱 밖**이다. 기록하는 것/하지 않는 것을 표로 나누고, **실제 입금과 기록이 함께 확정되는지는 미정**으로 남겼다
- [x] **확인하지 못한 것을 쓰지 않았다** — 감액 엔드포인트·연체 판정·지급기한 필드·계좌 연동은 전부 '코드에 없다'고 적고 미결로 이관했다. 심이 예고하나 호출부가 없는 EP-04·EP-05 는 §6 에 **X** 로 표시했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
