---
id: BE-078
title: "결제 설정 백엔드 기능 명세"
functionalSpec: FS-078
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-078. 결제 설정 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-078 결제 설정 (`/settings/payment`) — 단일 라우트, 하위 라우트 없음 |
| 범위 | **결제 설정 문서 1건(6필드)의 조회·저장.** 낙관적 동시성(revision / `If-Match`) · 감사 추적. 그리고 **그 저장이 앱 안 12개 소비 지점의 동작을 바꾼다는 사실**을 계약으로 못박는 일(§7.4) |
| **범위 밖** | **PG 자격증명(API 키·시크릿)** — 심이 명시적으로 배제한다(`payment-settings.ts:192-193`). 상점 ID(MID)는 식별자이며 시크릿은 `/settings/api-keys` 규약(저장 여부만 알고 평문을 돌려주지 않는다)의 것이다(§7.5). **결제 실행·결제창 호출·거래 조회** — 이 앱은 결제를 처리하지 않는다. **상점 ID 의 PG 사 확인(연결 테스트)** — **심이 없다**(§7.8). 형제 화면 BE-070 은 그 심이 있어 EP 를 만들었으나 여기에는 호출부도 주석도 없다. **파생값의 저장** — `pgSellable`·`checkoutCta`·`pgLock`·`resolvePriceDisplay`·`inquiryMenuState` 는 저장하지 않는다(§7.2). **잠기는 여섯 구획의 편집** — 이 화면은 잠금의 **원인**이고 그 구획들은 각자의 계약(BE-042 상품 · 쿠폰 · 적립금 정책)이 소유한다. **상품 단위 가격 표시(축 B)** — 상품 계약의 것이다 |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함) |
| 프론트 어댑터 | `apps/admin/src/pages/settings/payment/data-source.ts` — `paymentSettingsStore` = `createRevisionedStore<PaymentSettings>('payment', readPaymentSettings(), …)`(`:29-32`) **+ 저장 성공 뒤의 부수효과 한 줄**(`:41-46` `writePaymentSettings(saved.value)`) |
| 도메인 타입 | **`apps/admin/src/shared/commerce/payment-settings.ts:63-73`** (`PaymentSettings` 6필드) — 화면 폴더가 아니라 **공통 층**이 소유한다. 봉투 타입은 `pages/settings/_shared/store.ts`(`Revisioned<T>` `:24-29` · `AuditInfo` `:17-21`) |
| 검증 정본 | **zod `paymentSettingsSchema`**(`validation.ts:32-93`). **이 화면의 검증은 전부 교차 필드다**(`:6-12`) — 어떤 칸이 필수인지가 `usePg` 하나에 달려 있다. 상점 ID 의 **형식은 검사하지 않는다**(`:14-17`) |
| **하류 소비자** | **이 문서는 12개 지점이 읽는다**(§7.4 표). 다른 설정 문서와 달리 저장이 **화면 밖을 즉시 바꾼다**(`data-source.ts:3-9`) |
| 공통 계약 | **BE-067 §2 · §3(봉투) · §7.2(동시성) · §7.3(감사) · §7.5(403) 를 상속**한다 — 같은 `createRevisionedStore` 를 쓰는 형제 화면이다(BE-069 · BE-070 과 같은 자리). 아래는 **결제 설정 고유 차이만** 기술하며 그 중심은 **§7.1 fail-closed 축**이다 |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. **BE-067 §2 와 동일**하며 재정의하지 않는다.

### 1.1 코드 대조 근거표

| 계약 항목 | 코드 근거 (file:line) | 확인 내용 |
|---|---|---|
| **심은 정확히 2곳이고 같은 계약을 말한다** | ① `shared/commerce/payment-settings.ts:190-193` `TODO(backend): GET /api/settings/payment · PUT /api/settings/payment` + `PUT 바디 { usePg, provider, merchantId, mode, methods, inquiryGuide } + If-Match: <revision>` ② `pages/settings/payment/data-source.ts:34-35` 같은 두 엔드포인트 + `200 → { value, revision, audit } / 409·412 → 동시 편집 충돌 / 422 → 필드 검증 실패` | **심이 실재한다 — 발명하지 않았다.** 두 곳이 같은 계약을 말하므로 이 문서가 그것을 **하나로 접는다**(FS-078 §5 각주가 그 요구를 남겼다) |
| **심이 시크릿을 명시적으로 배제한다** | `payment-settings.ts:192-193` `⚠ 상점 ID 는 식별자이지 비밀키가 아니다 — PG 시크릿(API 키)은 이 문서에 넣지 않는다. 자격증명은 /settings/api-keys 규약을 따른다` | **§7.5 의 직접 근거** |
| **백엔드 0 — 저장소는 모듈 지역 변수 하나다** | `payment-settings.ts:16-17`(`실제 HTTP 호출은 한 줄도 없다. 모듈 지역 변수 하나가 '지금 저장된 설정' 이고…`) · `:188` `let current: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;` · 읽기 `:195-198` · 쓰기 `:200-203` | **실제 네트워크 0건.** 이 변수 하나가 **12개 소비 지점의 정본**이다 |
| **판정은 fail-closed 다** | `payment-settings.ts:128-130` `return settings.usePg && settings.merchantId.trim() !== '';` · 근거 `:116-127` | **§7.1.** 회귀 `pg-axes.test.ts:51-57`(`PG_ON`·`PG_HALF`·`PG_OFF`) · `payment-settings.test.ts:66-77` |
| 파생값을 저장하지 않는다 | `payment-settings.ts:132-142`(CTA) · `pg-lock.ts:66-71`(잠금) · `price-display.ts:13-15`(가격 표시) | **§7.2.** 세 파일이 같은 이유를 각자 적는다 |
| **잠금은 값을 지우지 않는다** | `pg-lock.ts:7-10`(제1원칙) · `:72-75`(`pgLock` 은 `{ locked, reason }` 만 돌려주고 **어떤 저장도 하지 않는다**) | **§7.3** |
| 무엇이 잠기지 **않는가** 도 규칙이다 | `pg-lock.ts:12-16`(옵션은 잠기지 않고 **재고 수량만** 잠긴다 · 상품 등록·수정도 잠기지 않는다) | §7.3 표 |
| 잠금 구획은 6개, 사유는 한 벌 | `pg-lock.ts:26-33`(`PG_LOCK_SECTIONS`) · `:52-64`(`LOCK_REASON`) | 회귀 `pg-axes.test.ts:93-118` |
| 전역이 상품별 축을 이긴다 | `price-display.ts:88-99`(`!pgSellable` 이면 상품이 '금액 노출' 이어도 문구로 대체) | 회귀 `pg-axes.test.ts:71-75` |
| 저장이 성립한 **뒤에만** 판매 방식을 바꾼다 | `data-source.ts:41-46`(`await revisioned.save(...)` → `writePaymentSettings(saved.value)`) · 근거 `:8-9` | 실패·409 에서는 부르지 않는다(§7.4) |
| **낙관적 동시성은 토큰 기반이다** | `_shared/store.ts:144-146` `if (input.force !== true && input.expectedRevision !== current.revision) throw new SettingsConflictError(current);` | **last-write-wins 가 아니다**(§7.7). 회귀 `_shared/store.test.ts`(섹션 공용) |
| 감사 주체가 하드코딩이고 심이 그것을 인정한다 | `_shared/store.ts:99-100` `// TODO(backend): 저장 주체는 서버가 세션에서 읽어 기록한다 — 프론트가 보내는 값을 신뢰하면 안 된다.` + `const CURRENT_ADMIN = '김운영';` | BE-067 §7.3 과 동일 |
| **감사 이력은 마지막 1건뿐이다** | `_shared/store.ts:148-152`(저장이 `audit` 를 **덮어쓴다**) · `AuditInfo` `:17-21`(필드 2개) | **되돌릴 수 없다**(§7.7) |
| 동기 제출 잠금은 있고 **멱등키는 없다** | `_shared/queries.ts:58-75`(`useSubmitLock`) · `PaymentSettingsPage.tsx:242` · `grep -rn "Idempotency\|idempotencyKey" pages/settings/payment` = **0건**(실측 2026-07-22) | §7.7 |
| 재현 스위치 | `data-source.ts:26` `const SCOPE = 'payment';` · `:11-14`(`?fail=load` · `?fail=save` · `?fail=conflict`) | NFR-078 §6 |
| 엔타이틀먼트 대상이 아니다 | `shared/entitlements/module-resources.ts:29-91` 에 `/settings/**` 가 **없다** → `route-entitlement.ts:27-28` 이 `granted` | §2 |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: **`admin` = 조회 + 저장 / `operator` = 조회만** — BE-067 §7.7 을 상속한다. **이 화면은 형제들보다 더 강한 근거를 갖는다**: `mode: 'live'` 저장은 고객의 카드가 실제로 승인되기 시작하는 스위치이고(`payment-settings.ts:160-164` · 확인 문구 `PaymentSettingsPage.tsx:176`), `usePg: false` 저장은 사이트의 모든 구매 버튼을 한 번에 문의로 바꾼다. 리소스는 `page:/settings/payment`(라우트에서 파생).
- **CSRF**: 쓰기(PUT)에 `X-CSRF-Token`.
- **타임아웃**: 조회·저장 **5초 → 504**. 이 계약에는 외부 왕복이 없다 — 연결 테스트가 **없기 때문**이다(§7.8). BE-070 이 EP-03 에 10초를 둔 것과 다른 점이 그것이다.
- **낙관적 동시성 · 감사 · 403 은닉**: **BE-067 §7.2 · §7.3 · §7.5 와 동일**하다. 같은 `createRevisionedStore` 를 쓰므로 메커니즘이 하나이며 여기서 재정의하지 않는다 — **결제 설정 고유의 함의만 §7.7 에 적는다.**
- **엔타이틀먼트**: 이 라우트는 **어떤 모듈에도 속하지 않는다** — `MODULE_RESOURCES`(`module-resources.ts:29-91`)에 `/settings/**` 가 없어 `entitlementStateForResource` 가 곧바로 `granted` 를 돌려준다(`route-entitlement.ts:22-28`). 즉 **플랜은 이 화면을 잠그지 않으며 그 판정은 이 계약의 응답 코드가 아니다** — 서버는 권한(403)만 말한다. 반대 방향의 판정은 BE-079 가 갖는다.
- **프론트 검증·권한 게이팅은 보안 경계가 아니다**: zod 는 브라우저에서만 돌고(`validation.ts:3-4`), `useRouteWritePermissions().canUpdate`(`PaymentSettingsPage.tsx:185`)는 저장 컨트롤을 감출 뿐이다. **`PUT /api/settings/payment` 를 직접 호출하면 두 가드를 한 줄도 거치지 않는다.** 서버가 §3 의 규칙 전부를 재판정한다(BE-067 §7.1 과 같은 판정).

## 3. 데이터 계약 (`shared/commerce/payment-settings.ts` · `validation.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Revisioned<T>` | `value: T` · `revision: string` · `audit: AuditInfo` | BE-067 §3 과 동일 봉투(`_shared/store.ts:24-29`) |
| `AuditInfo` | `updatedBy: string`(표시용 이름) · `updatedAt: string`(ISO) | `_shared/store.ts:17-21`. **이력이 아니라 마지막 1건이다**(§7.7) |
| **`PaymentSettings`** | `usePg: boolean` · `provider: PaymentProvider` · `merchantId: string` · `mode: PaymentMode` · `methods: readonly PaymentMethod[]` · `inquiryGuide: string` | **완전한 평면 6필드**(`payment-settings.ts:63-73`). 중첩이 없어 충돌 비교기(`_shared/diff.ts:13-20`)가 그대로 감당한다 — 형제 화면 `../site` 가 객체 필드 때문에 거짓 양성을 내는 것과 다르다 |
| `PaymentProvider` | `'toss'` \| `'inicis'` \| `'nice'` \| `'kakaopay'` | 코드 상수(`payment-settings.ts:22`). 표시명 `:42-47`. **카탈로그 엔드포인트가 없다 — 심도 없다**(§7.8) |
| `PaymentMethod` | `'card'` \| `'transfer'` \| `'vbank'` \| `'phone'` \| `'easypay'` | `payment-settings.ts:27`. 표시명 `:49-55` |
| `PaymentMode` | `'test'` \| `'live'` | `payment-settings.ts:32`. **같은 상점 ID 라도 실제로 돈이 움직이는지가 갈린다**(`:31` 주석) |
| 상수 | `MERCHANT_ID_MAX = 60`(`validation.ts:27`) · `INQUIRY_GUIDE_MAX = 200`(`:30`) | 둘 다 **형식 판정이 아니라 폭주 방지**다(`:14-17,26`) |
| 출하 기본값 | `DEFAULT_PAYMENT_SETTINGS`(`payment-settings.ts:179-186`) — `usePg: false` · `merchantId: ''` · `mode: 'test'` · `methods: ['card','transfer']` | 근거 `:175-178`: '켜져 있는 것으로 시작하면 **결제되지 않는 「구매하기」가 기본값**이 된다'. **서버의 미설정 테넌트 시드도 이 값이어야 한다**(§7.9 #1) |

**필드 규칙 (`paymentSettingsSchema` 대조 — 판정 순서가 곧 규칙이다 · `validation.ts:41-93`)**

| 판정 순서 | 조건 | 위반 문구 | 근거 |
|---|---|---|---|
| ① | `merchantId.trim().length > 60` — **`usePg` 와 무관하게** 본다 | `상점 ID 는 60자를 넘을 수 없습니다.` | `validation.ts:44-52`(`꺼진 채로도 저장되는 값이라 폭주를 그대로 두면 안 된다`) |
| ② | `usePg === true` 이고 `merchantId.trim() === ''` | `PG 결제를 켰다면 상점 ID 를 입력하세요. PG 사에서 발급한 값입니다.` | `validation.ts:54-64`. **§7.1 의 검증 쪽 짝이다** |
| ③ | `usePg === true` 이고 `methods.length === 0` | `결제수단을 하나 이상 선택하세요.` | `validation.ts:66-74`(`결제창이 열려도 고를 것이 없다`) |
| ④ | `usePg === false` 이고 `inquiryGuide.trim() === ''` | `PG 결제를 끄면 고객에게 보일 안내 문구가 필요합니다.` | `validation.ts:75-83`(`고객은 왜 살 수 없는지 모른 채 '문의하기' 만 본다`) |
| ⑤ | `inquiryGuide.trim().length > 200` — **`usePg` 와 무관하게** 본다 | `안내 문구는 200자를 넘을 수 없습니다.` | `validation.ts:85-92` |
| — | `provider`·`mode`·`methods[]` 가 유니온 밖 | 스키마 파싱 실패(400) | `validation.ts:35,37,38` |

> **형식을 검사하지 않는 것이 규칙이다**(`validation.ts:14-17`): 상점 ID 의 길이·문자셋·접두어를 판정하지 않는다 — PG 사마다 다르고 어느 형식도 문서로 보장받지 못했다. **서버도 형식 정규식을 걸지 않는다.** 걸면 채번 규칙이 바뀌는 날 멀쩡한 값이 거절되고, 그 실패는 운영자가 손쓸 수 없다(BE-070 §3 이 자격증명에서 세운 것과 같은 규율). **그 대가는 §7.1 의 경계에 적었다 — fail-closed 는 「비었을 때」만 닫히고 「틀렸을 때」는 열린다.**

**파생 규칙 — 전부 저장하지 않는다 (§7.2)**

| 함수 | 정의 | 소유 파일 |
|---|---|---|
| **`pgSellable(settings)`** | `settings.usePg && settings.merchantId.trim() !== ''` — **축 A. 이 계약의 중심 술어** | `payment-settings.ts:128-130` |
| `checkoutCta(settings, domain)` | `!pgSellable` → `{ kind:'inquiry', label:'문의하기', reason, inquiryPath }`(사유 2갈래 — 상점 ID 공란 / 아예 꺼짐 `:148-150`) · `pgSellable` → `{ kind:'purchase', label: 구매하기\|후원하기, reason: 모드별 `:161-164`, inquiryPath: null }` | `payment-settings.ts:143-167` |
| `pgLock(settings, section)` | `pgSellable` 이면 `{ locked:false, reason:'' }` · 아니면 `{ locked:true, reason: LOCK_REASON[section] }` | `pg-lock.ts:72-75` |
| `resolvePriceDisplay(settings, policy)` | `!pgSellable` → 무조건 `inquiry`(**전역이 축 B 를 이긴다**) · 그 밖에는 상품 정책을 따른다 | `price-display.ts:88-99` |
| `inquiryMenuState(settings, backlog)` | `!pgSellable` → `open` · 잔여를 모르면 `archive`(**fail-open**) · 잔여 0이면 `hidden` | `inquiry-backlog.ts:114-123` |

**잠금 구획 — 무엇이 잠기고 무엇이 잠기지 않는가 (`pg-lock.ts:12-16,26-33,52-64`)**

| 구획 id | 잠기는 것 | **잠기지 않는 것(같은 화면 안)** | 소비처 |
|---|---|---|---|
| `product-points` | 상품의 적립 설정 입력 | 저장된 적립률 값 — **보존된다** | `ProductPricingCards.tsx:234,261` |
| `product-coupons` | 상품의 쿠폰 사용 설정 입력 · 쿠폰 목록 조회(`enabled` 차단) | 저장된 쿠폰 사용 설정 | `ProductFormPage.tsx:443,493` · `ProductCouponCard.tsx:102,137` |
| `product-stock` | **재고 수량·품절 토글만** | **옵션(색상·사이즈) 구성 · 상품 등록·수정 자체** — 견적 품목 명세로 계속 쓰인다 | `ProductOptionMatrix.tsx:103` · `ProductListPage.tsx:196,350` |
| `product-shipping` | 상품의 배송비 입력 | 저장된 배송 설정 | `ProductPricingCards.tsx:344,362` |
| `coupon-admin` | 새 발급 · 발급 기준 변경 | **기존 쿠폰 조회** | `CouponListPage.tsx:126,232` |
| `points-policy` | 적립금 정책의 **저장** | 정책 화면 자체는 열려 있다 | `PointsPolicyPage.tsx:103,138` |

> **`/settings/payment` 자신은 `PG_LOCK_SECTIONS` 에 없다** — 잠금의 원인이 자기 자신에게 걸리면 되돌릴 길이 사라진다. 이 화면이 읽기 전용으로 내려가는 유일한 조건은 **쓰기 권한 부족**이다(FS-078-EL-017).

## 4. 엔드포인트 명세

### BE-078-EP-01 · 결제 설정 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-078-EL-014, EL-018, EL-019, EL-021.1, EL-026 |
| 근거 (심) | `payment-settings.ts:190` · `data-source.ts:34-35` `GET /api/settings/payment` → `200 → { value, revision, audit }` |
| 메서드·경로 | `GET /api/settings/payment` |
| 권한 | `admin`, `operator`(조회) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**쿼리**: 없다. **단일 문서다.**

**응답 200** — `{ value: PaymentSettings, revision: string, audit: AuditInfo }`.

- `revision` 은 **불투명 문자열**이다 — 프론트는 해석하지 않고 그대로 되돌려 보낸다(`_shared/queries.ts:23`). 서버는 ETag 를 써도 되고 버전 번호를 써도 된다. **`ETag: <revision>` 응답 헤더를 함께 준다**(BE-067 EP-01 과 동일).
- **문서는 항상 존재한다.** 미설정 테넌트에도 404 를 내지 않고 `DEFAULT_PAYMENT_SETTINGS`(§3)를 200 으로 내려준다 — 프론트에 '설정 없음' 분기가 없다(`PaymentSettingsPage.tsx:219-222` 는 `data` 가 오면 무조건 `reset` 한다).
- **`merchantId` 를 마스킹하지 않는다** — 평문 그대로 실린다(§7.5). 대신 **`Cache-Control: no-store`** 를 건다.
- **시크릿·API 키를 이 응답에 싣지 않는다.** 필드 자체가 없다(§7.5).

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-078-EP-02 · 결제 설정 저장
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-078-EL-016, EL-020, EL-022, EL-022.1, EL-022.2, EL-022.3, EL-024, EL-024.4 |
| 근거 (심) | `payment-settings.ts:190-191` `PUT /api/settings/payment` + `PUT 바디 { usePg, provider, merchantId, mode, methods, inquiryGuide } + If-Match: <revision>` · `data-source.ts:35` `409·412 → 동시 편집 충돌 / 422 → 필드 검증 실패` |
| 메서드·경로 | `PUT /api/settings/payment` |
| 권한 | **`admin` 만**(§2 · BE-067 §7.7 상속) |
| 멱등성 | **조건부 멱등** — `If-Match` 가 있으면 같은 요청의 재시도는 두 번째부터 412/409 로 거절된다. **멱등키는 없다**(§7.7) |
| 레이트리밋 | 분당 30회 |

**요청 헤더**: `If-Match: <revision>` · `X-CSRF-Token: <token>`.

**요청 바디**: **부분 갱신(PATCH)이 아니라 전체 치환**이다 — 프론트가 6필드 전량을 보낸다(`PaymentSettingsPage.tsx:286-293` 의 `onValid` 가 폼 전체를 쥔다). 심이 나열한 6필드가 곧 계약의 전부이며 **그 밖의 키는 무시한다.**

> **사라진 구획의 값도 함께 온다** — `usePg` 가 꺼져 있어도 `provider`·`merchantId`·`methods` 가 바디에 실리고(FS-078-EL-012), 켜져 있어도 `inquiryGuide` 가 실린다. **서버는 그것을 그대로 저장한다.** 이것이 §7.3 의 값 보존 원칙이 저장 계약에서 성립하는 방식이다 — 서버가 '지금 안 쓰는 필드'를 비워서 저장하면 PG 를 다시 켠 순간 상점 ID 가 사라진다.

**서버 검증 (요청을 그대로 믿지 않는다 — 순서가 곧 규칙이다)**

1. **§3 의 필드 규칙 5건을 그 순서대로 재판정한다.** 위반 시 **422 `VALIDATION_FAILED`** + `error.fields`. 프론트 zod 는 UX 이며 정본이 아니다(§2).
2. **`merchantId`·`inquiryGuide` 는 trim 후 판정한다.** 프론트의 정상 경로는 `onValid` 가 trim 한 값을 보내지만(`PaymentSettingsPage.tsx:290-291`) **'덮어쓰기' 경로는 `getValues()` 원값을 보낸다**(`:321-323` — FS-078 §7 #16). 서버가 trim 하지 않으면 앞뒤 공백이 그대로 저장되고, 그 순간 `pgSellable` 의 `trim()` 판정과 저장값이 어긋난 상태(공백만 든 상점 ID)가 만들어진다.
3. **`methods` 는 카탈로그 순서로 정규화해 저장한다** — 프론트가 이미 그렇게 조립하지만(`PaymentSettingsPage.tsx:341-352`, 근거 `:344` '켰다 껐다 한 순서가 저장 값에 남지 않게') **덮어쓰기 경로와 직접 API 호출은 그 정규화를 거치지 않는다.** 순서가 남으면 충돌 다이얼로그의 배열 비교(`_shared/diff.ts:14-19`)가 **내용이 같은데 다르다고 말한다.** 중복 값도 제거한다.
4. **`audit` 를 요청에서 받지 않는다** — 바디에 없고, 있어도 무시한다. 서버가 세션 주체와 서버 시각으로 찍는다(BE-067 §7.3 · 심 `_shared/store.ts:99`).
5. **`revision` 을 요청 바디에서 받지 않는다** — `If-Match` 헤더가 정본이다.
6. **파생값을 받지 않는다** — `pgSellable`·`checkoutCta`·`pgLock` 에 해당하는 필드가 바디에 **존재하지 않으며**, 만들지도 않는다(§7.2).
7. **PG 사에 상점 ID 를 확인하지 않는다** — 이 엔드포인트는 외부 왕복을 하지 않는다(§7.8). 저장은 '이 값을 쓰겠다'는 선언이지 '이 값이 유효하다'는 확인이 아니다.

**`If-Match` 처리** — BE-067 EP-02 와 동일 메커니즘.

- 헤더가 **없으면 428 `PRECONDITION_REQUIRED`** — 토큰 없는 맹목적 덮어쓰기를 허용하지 않는다.
- **현재 revision 과 다르면 412 `PRECONDITION_FAILED`**, 응답 본문에 **최신 문서를 그대로 실어 보낸다**(`{ value, revision, audit }`). 프론트가 '무엇이 달라졌는지'를 6개 라벨(`data-source.ts:50-57`)로 짚으려면 최신 값이 필요하다(FS-078-EL-024.2).
- **덮어쓰기(force)**: 충돌 다이얼로그의 '내 변경으로 덮어쓰기'(FS-078-EL-024.4)는 `force: true` 로 다시 저장한다. **계약 표현은 `If-Match: *`** — 새 필드를 만들지 않는다.

**응답 200** — `{ value, revision, audit }`(새 revision + 새 audit). 프론트가 이것을 **캐시에 직접 심으므로**(`_shared/queries.ts:42-46`) **응답에 새 revision 이 반드시 실려야 한다.** 실리지 않으면 연속 저장이 낡은 토큰으로 412 를 맞는다 — 그 함정을 코드가 주석으로 못박고 있다(`queries.ts:43-44`).

**에러**: 400 `VALIDATION_FAILED`(바디가 JSON 이 아니거나 유니온 밖 값) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **412 `PRECONDITION_FAILED`**(최신 문서 동봉) · **428 `PRECONDITION_REQUIRED`** · **422 `VALIDATION_FAILED`**(`error.fields`: `merchantId` · `methods` · `inquiryGuide`) · 429 · 500 · 504.

> **`error.fields` 의 이름이 계약이다**: 폼이 아는 키는 6개(`PAYMENT_FIELD_LABELS` — `data-source.ts:50-57`)이고 **검증 위반이 실제로 발생하는 것은 셋(`merchantId`·`methods`·`inquiryGuide`)** 이다. ⚠ **다만 현재 프론트에 422 → RHF `setError` 매핑이 없다** — `createRevisionedStore` 가 `HttpError` 를 던지지 않아(`_shared/store.ts:134-146`) 화면이 status 로 분기할 근거가 없고, 전부 `'결제 설정을 저장하지 못했습니다…'` 한 문구로 뭉개진다(`PaymentSettingsPage.tsx:277` · FS-078 §7 #6). **필드 이름 계약은 그럼에도 지금 확정해 둔다** — 어댑터가 변환을 얻는 날 화면이 그대로 쓴다.

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 조회 | N/A — **쿼리 파라미터가 없다**(단일 문서 조회) | 401 → 전역 인터셉터(`shared/query/queryClient.ts:60-66`)가 재인증으로. 화면은 FS-078-EL-018 배너 | **403** — 시스템 설정 리소스의 **존재는 비밀이 아니다**(BE-003 §3.2 원칙 1 · BE-067 §7.5). 사이드바에 '결제 설정' 메뉴가 있고 라우트가 공개돼 있다. **404 은닉을 하지 않는다** | N/A — **문서는 항상 존재한다.** 미설정 테넌트에도 `DEFAULT_PAYMENT_SETTINGS` 를 200 으로 준다(§4 EP-01) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After`. 화면은 FS-078-EL-018 배너(status 구분 없음 — FS-078 §7 #6) | 500 + `traceId` → FS-078-EL-018. **참조 코드가 화면에 없다**(EXC-20 gap) | 5초 → 504 → FS-078-EL-018 |
| EP-02 저장 | 400 — 바디가 JSON 이 아니거나 `provider`·`mode`·`methods[]` 가 유니온 밖 · `usePg` 가 불리언이 아님. **필드 규칙 위반은 400 이 아니라 422** | 401 → 전역 인터셉터. **미저장 입력은 유실된다** — 프로그램적 이동이라 이탈 가드(FS-078-EL-025)가 발화하지 않는다(FS-078 §7 #11) | **403 `FORBIDDEN`** — `operator` 의 저장 시도(§2). 화면이 저장 컨트롤을 아예 렌더하지 않으므로(FS-078-EL-016) 정상 UI 경로로는 도달하지 않는다 — **위조된 권한 스토어·직접 API 호출에서 발생한다.** 404 은닉은 **하지 않는다** | N/A — 문서는 항상 존재하고 **삭제되지 않는다.** '먼저 삭제됨' 경합이 구조적으로 없다 | **412 `PRECONDITION_FAILED`**(+`If-Match` 부재 시 **428**) — 최신 문서 동봉 → FS-078-EL-024 충돌 다이얼로그(3-액션 · 입력 보존). **`409` 가 아니라 `412` 가 정확한 코드**이고 어댑터의 `SettingsConflictError`(`_shared/store.ts:37-45`)가 둘을 같은 화면 경로로 모은다 | **422 `VALIDATION_FAILED`** — §3 규칙 5건 위반. `error.fields`: `merchantId`(60자 초과 / 켠 채 공란) · `methods`(켠 채 0개) · `inquiryGuide`(끈 채 공란 / 200자 초과). ⚠ **화면이 필드로 되돌리지 못하고 배너로 뭉갠다**(§4 각주) | 429 분당 30 + `Retry-After` → FS-078-EL-020 배너 | 500 + `traceId` → FS-078-EL-020 배너, **입력 보존**(reset 하지 않는다). **판매 방식은 바뀌지 않는다** — `writePaymentSettings` 는 성공 뒤에만 불린다(`data-source.ts:41-46`) | 5초 → 504 → FS-078-EL-020. **프론트 타임아웃 상한이 없어**(`AbortSignal.timeout` 앱 전역 0건) 서버가 먼저 끊는 구간에만 의존한다 |

## 6. 프론트 연동 대조

| data-source.ts / store.ts | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `paymentSettingsStore.fetch(signal)` (`data-source.ts:39`) | `GET /api/settings/payment`(`:34`) | EP-01 | `Revisioned<PaymentSettings>` | O |
| `paymentSettingsStore.save({ value, expectedRevision, force? }, signal)` (`data-source.ts:41-46`) | `PUT /api/settings/payment` + `If-Match`(`payment-settings.ts:190-191` · `data-source.ts:34-35`) | EP-02 | `Revisioned<PaymentSettings>` | **△ — 412 → `SettingsConflictError(latest)` 변환 필요**(현재는 클로저 비교 `_shared/store.ts:144-146`). `force: true` → `If-Match: *` 매핑 필요 |
| **`writePaymentSettings(saved.value)`** (`data-source.ts:44`) | — (앱 내부 부수효과) | **없음 — 서버 호출이 아니다** | `void` | **△ — 연동 후에도 남는다.** 이 한 줄이 12개 소비 지점의 정본을 갱신한다(§7.4). **다만 소스가 모듈 지역 변수(`payment-settings.ts:188`)에서 react-query 캐시로 옮겨야 한다**(§7.9 #4) |
| `readPaymentSettings()` (`payment-settings.ts:195-198`) | — (동기 조회기) | **없음** | `PaymentSettings` | **△ — 12개 소비 지점이 렌더 시점에 동기로 읽는다.** 서버가 붙으면 이 동기 계약이 성립하지 않는다(§7.4 · §7.9 #4) |
| `refetch()` (react-query) | — | EP-01 | 위와 동일 | O — 충돌 해소·조회 실패 재시도 경로(FS-078-EL-018 · EL-024.3) |
| `PAYMENT_FIELD_LABELS` (`data-source.ts:50-57`) | — | **없음(프론트 전용)** | 충돌 다이얼로그 라벨 6건 | O — 계약 밖이 정답(표시 문구) |
| (연결 테스트) | — | **없음(범위 밖)** | — | O — **심이 0건인 것이 정답**(§7.8) |
| (결제 실행·거래 조회) | — | **없음(범위 밖)** | — | O — 이 앱은 결제를 처리하지 않는다 |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`save`)에 `X-CSRF-Token` 헤더를 싣는다. `RevisionedStore<T>` 시그니처(`_shared/store.ts:67-90`)는 바뀌지 않는다. |
| `If-Match` | `expectedRevision` 을 `If-Match: <revision>` 으로 싣는다. `force === true` 면 **`If-Match: *`**. |
| 412/409 변환 | **응답 412(또는 409)를 `new SettingsConflictError(latest)` 로 변환**한다 — `latest` 는 응답 본문의 `{ value, revision, audit }`. 이 변환이 화면의 `isSettingsConflict` 분기(`PaymentSettingsPage.tsx:271`)를 살린다. 빠지면 충돌이 일반 배너로 뭉개진다. |
| 422 변환 | 응답 422 의 `error.fields` 를 화면이 읽을 수 있는 형태로 옮긴다. **지금은 그 통로가 없다** — `createRevisionedStore` 가 `HttpError`(status 보유)를 던지지 않는다. **어댑터를 서버에 연결할 때 함께 만든다**(§7.9 #3). |
| 200 반환 | 응답의 `{ value, revision, audit }` 를 **그대로 반환**한다 — `useSaveSettings.onSuccess` 가 캐시에 심는다(`queries.ts:45`). |
| **부수효과 순서 유지** | `save` 는 **응답이 성공한 뒤에만** `writePaymentSettings(saved.value)` 를 부른다(`data-source.ts:41-46`). **이 순서를 바꾸거나 낙관적으로 먼저 쓰면 거절된 저장이 판매 방식을 바꾼다**(§7.4). |
| 감사 주체 제거 | `CURRENT_ADMIN`(`_shared/store.ts:100`)을 보내지 않는다 — 삭제한다. 서버가 세션에서 읽는다. |
| 재현 장치 제거 | `failIfRequested`/`conflictRequested`/`wait(LATENCY_MS)`(`_shared/store.ts:129-141`)는 개발용이며 연동 시 사라진다. |

## 7. 핵심 판정

### 7.1 축 A 는 **fail-closed** 다 — 서버도 같은 술어 위에 선다 【정합 판정】

이 계약의 중심은 한 줄이다.

```
pgSellable(settings) = settings.usePg && settings.merchantId.trim() !== ''
```

(`shared/commerce/payment-settings.ts:128-130`)

**`usePg` 만 보지 않는 이유를 코드가 스스로 적는다**(`:116-127`): PG 를 켜 두고 상점 ID(MID)가 공란이면 결제창을 띄울 수 없다 — 그 상태에서 '구매하기'를 그리면 **고객은 눌러 놓고 아무 일도 일어나지 않는 버튼을 만난다.** 그래서 이 술어는 **애매하면 닫는 쪽으로 수렴한다.**

**검증과 규칙이 두 곳에 있어도 결론이 갈리지 않는다.** `paymentSettingsSchema`(`validation.ts:54-64`)가 '켠 채 공란'인 저장을 애초에 막지만, **그 방어가 뚫려도**(직접 API 호출 · 덮어쓰기 경로 · 서버 데이터 손상) 규칙 자체가 판매 불가로 수렴한다. 판단이 두 겹인데 방향이 같다는 것이 이 설계의 요점이다.

**세 가지를 못박는다.**

1. **서버는 `pgSellable` 을 저장하지 않고, 저장할 필요도 없다**(§7.2). 서버가 이 판정을 **재현**해야 하는 자리는 하나다 — **자기 도메인의 결정에 쓰는 경우**(예: 주문 수신을 열지 말지). 그때도 규칙은 위 한 줄과 **같아야 한다.**
2. **`pgLock`(잠금)과 `resolvePriceDisplay`(축 B)가 같은 술어 위에 서 있다.** 둘 다 `usePg` 를 다시 읽지 않고 `pgSellable` 을 부른다(`pg-lock.ts:73` · `price-display.ts:92`). 코드가 그 이유를 적는다(`payment-settings.ts:124-127`): 각자 `usePg` 를 읽으면 **상점 ID 가 빈 상태를 놓치는 화면이 생기고, 그 화면만 '결제됨'을 전제로 그린다.** 서버가 이 축을 다시 표현할 때도 술어는 **하나여야 한다.**
3. **형제 축은 방향이 반대다.** 플랜/엔타이틀먼트는 **fail-open** 이며(매핑 없음·저장값 파손·응답에 키 없음이 전부 `granted` 로 수렴한다 — `route-entitlement.ts:10-12,23-29,38-42` · `plan.ts:19-28`), 그 계약은 **BE-079 §7.2** 가 갖는다. 권한(RBAC) 축은 이 문서와 같은 fail-closed 다. **세 축의 방향 차이가 quality-bar EXC-22 의 근거이고, 한 화면이 두 계열을 동시에 말하지 않게 하는 것이 EXC-21 이다.**

**남은 경계 — fail-closed 가 닫는 것은 「비어 있음」뿐이다.** 상점 ID 의 형식을 검사하지 않고(§3) PG 사에 확인도 하지 않으므로(§7.8), **오타 하나가 저장되면 `pgSellable` 은 `true` 가 되고 앱 전체가 '결제창이 열린다'를 전제로 그린다.** 실제로는 열리지 않는다. **이 축은 「비었을 때」만 닫히고 「틀렸을 때」는 열린다** — FS-078 §7 #17 이 이관한 그 구멍이며 §7.9 #2 가 그것을 받는다.

### 7.2 `pgSellable`·`checkoutCta`·`pgLock` 은 파생값이다 — 저장하지 않는다 【정합 판정】

**세 파일이 각자 같은 이유를 적어 두었다.**

- `checkoutCta`(`payment-settings.ts:132-138`): 'CTA 를 상품/프로그램마다 들고 있으면 설정 스위치를 내리는 순간 **이미 등록된 수백 건이 전부 낡은 값이 된다.** 그때 필요한 일괄 갱신은 **실패하면 절반만 바뀌고, 절반은 열리지 않는 결제창으로 고객을 보낸다.**'
- `pgLock`(`pg-lock.ts:66-71`): '**파생값이다. 어디에도 저장하지 않는다.** 판정 근거는 `pgSellable` 하나다.'
- `resolvePriceDisplay`(`price-display.ts:13-15`): '화면이 그리는 것은 함수의 결과이지 어딘가 저장된 표시 상태가 아니다.'

**판정**: 서버는 **`PaymentSettings` 6필드만 저장한다.** `pgSellable`·`checkoutCta.kind`·`checkoutCta.label`·`pgLock.locked`·`priceDisplay` 의 해석 결과를 **어떤 테이블에도 비정규화하지 않고, 어떤 응답에도 별도 필드로 싣지 않는다.** 사실은 하나(PG 로 파는가)이고 나머지는 그 결과다.

**왜 저장하면 어긋나는가.** 이 파생값들은 **상품·프로그램 레코드 수만큼 복제된다.** 상품 500건이 각자 `ctaLabel: '구매하기'` 를 들고 있는 상태에서 운영자가 스위치를 내리면 500건을 갱신해야 하고, 그 배치가 절반에서 실패하면 **같은 목록 안에 결제되는 상품과 안 되는 상품이 섞인다.** 어느 쪽이 사실인지 나중에는 아무도 가리지 못한다 — 설정 문서는 '문의'라고 말하고 상품 레코드는 '구매'라고 말하기 때문이다. **파생값을 매번 규칙에서 만들면 이 상태가 구조적으로 만들어지지 않는다.** BE-044 §7.7 이 환불 총액을 저장하지 않는 것과 같은 판정이다.

### 7.3 잠금은 값을 지우지 않는다 — 서버가 그것을 어겨서는 안 된다 【정합 판정】

`pg-lock.ts:7-10` 이 이것을 **제1원칙**으로 못박는다:

> 잠긴 섹션의 입력은 disabled 가 되지만 **저장된 값은 그대로 남는다.** PG 를 다시 켜면 적립률·쿠폰 설정·배송비가 **저장해 둔 그대로** 살아난다. 지우는 구현은 되돌릴 수 없다: 운영자는 **결제를 잠시 끄는 것과 정책을 폐기하는 것을 구분해서** 하고 있는데, 코드가 그 둘을 같은 것으로 만든다.

**판정 — 이것은 화면 규약이 아니라 데이터 계약이다.** 서버가 붙어도:

1. **`PUT /api/settings/payment` 로 `usePg: false` 가 오는 것이 다른 도메인의 데이터를 지우는 트리거가 되면 안 된다.** 적립률·쿠폰 설정·배송비·재고 수량을 비우거나 0으로 만드는 캐스케이드를 **금지한다.**
2. **이 화면 자신의 값도 마찬가지다.** `usePg: false` 로 저장돼도 `provider`·`merchantId`·`methods` 는 그대로 저장된다(§4 EP-02 요청 바디 절). 켜져 있어도 `inquiryGuide` 가 남는다. **꺼진 구획의 값을 서버가 정리하면 다시 켠 순간 상점 ID 가 사라지고, 그때 `pgSellable` 은 fail-closed 로 판매를 막는다** — 운영자가 보기에는 '켰는데 안 팔린다'가 된다.
3. **잠기지 않는 것도 규칙이다**(`pg-lock.ts:12-16` · §3 표). 옵션(색상·사이즈)과 상품 등록·수정은 잠기지 않고 **재고 수량만** 잠긴다. 기존 쿠폰 조회도 열려 있다. **서버가 잠금을 「모듈 전체 차단」으로 일반화하면 결제 없이 문의로 파는 운영이 통째로 멈춘다** — 그 운영에서 옵션은 견적 품목 명세이기 때문이다.

**회귀가 이 원칙의 절반을 이미 고정한다**: `pg-axes.test.ts:86-90`('파생일 뿐 정책을 건드리지 않는다 — 값 보존') · `:94-108`(여섯 구획 전수). **나머지 절반(다른 도메인 데이터의 비파괴)은 서버가 지켜야 하며 지금은 어디에도 강제되지 않는다** — §7.9 #5.

### 7.4 한 번의 저장이 12개 지점의 동작을 바꾼다 【경계 판정】

이 문서는 **다른 설정 문서와 성질이 다르다.** 저장이 자기 화면 안에서 끝나지 않는다(`data-source.ts:3-6`).

| 소비 지점 | 무엇이 바뀌는가 | 근거 (file:line) |
|---|---|---|
| 대시보드 | 주문이 들어오는 사이트인지(`ordersArrive`)로 위젯 구성이 갈린다 | `pages/dashboard/DashboardPage.tsx:85` |
| 대시보드 통계 섹션 | 같은 축 | `pages/dashboard/components/StatsSection.tsx:171` |
| 주문 통계 | `!pgSellable` 이면 화면이 대체된다 | `pages/stats/orders/OrderStatsPage.tsx:272` |
| 프로그램 상세 | '후원하기' ↔ '문의하기' | `pages/programs/ProgramDetailPage.tsx:323` |
| 상품 폼 | CTA · 가격 표시 · **잠금 4구획** · 쿠폰 조회 `enabled` | `pages/products/items/ProductFormPage.tsx:443,481-495` |
| 상품 목록 | 금액 칸 · 주문 도착 여부 · 재고 잠금 안내 | `pages/products/items/ProductListPage.tsx:194-202,350` |
| 상품 가격 카드 | 적립·배송 구획 잠금 + 사유 배너 | `components/ProductPricingCards.tsx:234,261,344,362` |
| 상품 쿠폰 카드 | 쿠폰 구획 잠금 | `components/ProductCouponCard.tsx:102,137` |
| 상품 옵션 행렬 | **재고 수량만** 잠금 | `components/ProductOptionMatrix.tsx:103` |
| 쿠폰 목록 | 발급·기준 변경 잠금 | `pages/products/coupons/CouponListPage.tsx:126,232` |
| 적립금 정책 | 저장 잠금 | `pages/products/points/PointsPolicyPage.tsx:103,138` |
| **사이드바** | 상품·프로그램 '문의' 잎의 존재/꼬리표 | `shared/layout/nav-config.ts:318` |

**지금 이 파급이 성립하는 방식**: 12개 지점이 전부 `readPaymentSettings()`(`payment-settings.ts:195-198`)를 **렌더 시점에 동기로** 읽고, 저장이 `writePaymentSettings`(`:200-203`)로 모듈 지역 변수를 갈아 끼운다. 그래서 다음 렌더가 곧바로 새 규칙을 쓴다.

**판정 — 서버가 붙으면 이 동기 계약이 깨진다. 그것이 이 계약의 가장 큰 미결이다.**

- 서버 값은 **비동기**이고 react-query 캐시(`['settings','payment']` — `data-source.ts:23`)에 산다. `readPaymentSettings()` 는 그때 **캐시를 읽는 함수로 바뀌어야 한다** — `_shared/store.ts:80-82` 가 형제 축에서 같은 전환을 이미 예고한다('백엔드가 붙으면 이 표면은 사라진다 … 조회기는 **react-query 캐시**를 읽어야 한다').
- 그 전환 전까지 **어긋남의 창**이 실재한다: 설정을 저장한 탭에서는 12개 지점이 즉시 새 값을 쓰지만, **다른 탭·다른 세션은 자기 캐시가 만료될 때까지 옛 값으로 그린다**(`staleTime` 30초). 그동안 한 운영자는 '구매하기'를, 다른 운영자는 '문의하기'를 본다. **저장은 localStorage 에도 남지 않아 새로고침하면 시드로 되돌아간다**(FS-078 §7 #10).
- **판정**: 서버는 이 문서의 응답에 **강한 캐시를 걸지 않는다**(`Cache-Control: no-store`). 그리고 **저장 성공 응답이 곧 소비 정본의 갱신 트리거**여야 한다 — 부분 성공(설정은 저장됐는데 소비 지점은 옛 값)을 만들지 않는 유일한 방법은 **소비 지점이 파생값을 들지 않는 것**이며(§7.2) 그 조건은 이미 충족돼 있다.

**순서는 이미 옳다**: 어댑터가 `await revisioned.save(...)` **뒤에** `writePaymentSettings` 를 부른다(`data-source.ts:41-46`). 실패·412 에서는 부르지 않는다. **연동 후에도 이 순서를 지킨다**(§6.1) — 거절된 저장이 판매 방식을 바꾸면 화면이 말한 것과 앱이 하는 일이 갈라진다.

### 7.5 `merchantId`·`provider`·`mode` 의 보안 등급 — MID 는 비밀이 아니다 【보안 판정】

**코드로 확인한 사실 셋.**

1. **심이 명시적으로 선을 긋는다**(`payment-settings.ts:192-193`): '⚠ **상점 ID 는 식별자이지 비밀키가 아니다** — PG 시크릿(API 키)은 이 문서에 넣지 않는다. 자격증명은 `/settings/api-keys` 규약(저장 여부만 알고 평문은 돌려주지 않는다)을 따른다.'
2. **화면도 같은 말을 한다** — 상점 ID 입력의 힌트가 '**결제 API 키는 여기가 아니라 API 연동 설정에서 관리합니다**'(`PaymentSettingsPage.tsx:460`).
3. **이 경로에 마스킹 코드가 0건이다.** 섹션의 시크릿 헬퍼(`pages/settings/_shared/secret.ts`)를 결제 설정이 **소비하지 않는다**(`grep -rn "secret" pages/settings/payment` = 0건, 실측 2026-07-22). 폼도 `type="password"` 를 쓰지 않고 평문 `TextInputField` 다(`:453-464`).

**판정**:

| 값 | 등급 | 응답에 실리는가 | 마스킹 |
|---|---|---|---|
| `merchantId`(MID) | **식별자.** 비밀이 아니다 — 결제창 호출 시 클라이언트에 노출되는 값이다 | **평문으로 그대로 실린다** | **하지 않는다.** BE-070 §3 이 `nativeAppKey` 에 세운 판정과 같은 결이다 — '**비밀이 아닌 값을 비밀처럼 다루면 진짜 비밀의 취급이 헐거워진다**' |
| `provider` · `mode` · `methods` | 설정값. 비밀이 아니다 | 평문 | 해당 없음 |
| `inquiryGuide` | 고객에게 렌더되는 문구 | 평문 | 마스킹이 아니라 **정제 대상**이다(아래) |
| **PG API 키·시크릿** | **비밀** | **이 계약에 필드가 없다** | `/settings/api-keys` 규약(BE-069) — 이 문서가 다루지 않는다 |

**그럼에도 세 가지를 요구한다.**

- **`Cache-Control: no-store`** — MID 는 비밀이 아니지만 결제 자격증명의 일부이고 감사 대상 설정이다. BE-070 §7.2.3 과 같은 취급.
- **서버가 이 엔드포인트로 시크릿을 받지 않는다.** 바디에 `secret`·`apiKey` 류 키가 오면 **무시한다** — 여기에 시크릿을 받아 주는 순간 두 번째 자격증명 저장소가 생기고, `/settings/api-keys` 의 write-only 규약(BE-069)이 우회된다.
- **`inquiryGuide` 는 XSS 정제 대상이다.** 이 값은 어드민 화면에서는 텍스트 노드로만 그려지지만(`CheckoutCtaPreview.tsx:102-104`) **고객 화면의 상품 카드·프로그램 상세에 그대로 렌더된다**(FS-078-EL-011 힌트). 소비자가 HTML 로 해석하면 저장형 XSS 다. BE-067 §7.1 이 `siteName`·`siteDescription` 에 세운 것과 같은 판정 — **정제는 저장 시 1회**이며 렌더 시점 이스케이프에 의존하지 않는다.

**미결로 남기는 것은 없다** — 세 값의 등급이 코드에 명시돼 있어 확인이 끝났다. 다만 **마스킹 정책이 문서로만 존재하고 테스트가 없다**(§7.9 #6).

### 7.6 `mode: 'live'` 는 돈이 움직이기 시작하는 스위치다

`payment-settings.ts:31` 이 그 사실을 적는다: '테스트/운영 — **같은 상점 ID 라도 실제로 돈이 움직이는지가 갈린다.**' `checkoutCta` 도 두 모드를 뭉뚱그리지 않고 사유 문구를 가른다(`:160-164` — '테스트 모드는 결제창이 뜨지만 돈이 움직이지 않는다 — 「연동됨」과 뭉뚱그리면 운영 전환을 잊는다').

**프론트는 이 전환을 이미 앞세운다** — `saveConfirmMessage`(`PaymentSettingsPage.tsx:169-179`)가 '켜는 중'을 모드별로 갈라 **운영이면 '저장하는 즉시 고객이 상품·프로그램을 실제로 결제할 수 있습니다'** 라고 말한다.

**판정 — 서버 쪽 요구는 아직 어디에도 없다.** 이 계약은 `mode` 를 **다른 5필드와 같은 문자열 하나로** 저장한다. 확인 게이트도, 별도 권한도, 감사 이벤트도 없다. **그것이 지금의 사실이며 이 문서는 그것을 발명하지 않는다.** 대신 **후속으로 이관한다**(§7.9 #7):

1. `test → live` 전이를 **별도 감사 이벤트**로 남긴다(누가·언제·어느 MID 로). 지금의 `audit` 는 마지막 1건만 남아 '언제 운영으로 올렸나'에 답할 수 없다(§7.7).
2. 그 전이에 **더 좁은 권한**(예: `admin` 중에서도 결제 담당)을 요구할지 결정한다 — 지금은 시스템 설정 수정 권한 하나로 충분하다.
3. `live` 전환과 **PG 계약 상태의 실물 확인**을 잇는다 — 지금은 연결 테스트가 없어(§7.8) '운영으로 올렸는데 계약이 아직 안 됐다'를 저장 시점에 알 방법이 없다.

### 7.7 동시성 — 토큰 기반이며 last-write-wins 가 아니다. 그러나 되돌릴 수 없다 【정합 판정】

**동시성**: 이 문서는 단일 레코드이고 두 운영자가 동시에 저장하면 **나중 저장이 이기지 않는다.** `createRevisionedStore.save` 가 `input.expectedRevision !== current.revision` 이면 **`SettingsConflictError(current)` 를 던진다**(`_shared/store.ts:144-146`). 이것은 `shared/crud` 의 `createStoreAdapter`(존재 여부 기반 409 → 동시 편집은 last-write-wins)와 **다른 메커니즘**이며, 이 섹션이 그 차이를 파일 머리말에 적어 두었다(`_shared/store.ts:3-8`). 화면은 `isSettingsConflict`(`:48-50`)로 일반 실패와 갈라 3-액션 충돌 다이얼로그를 세우고 **입력을 버리지 않는다**(`PaymentSettingsPage.tsx:271-275`).

**판정**: 서버는 `If-Match` 필수(부재 시 428) · 불일치 시 412 + 최신 문서 동봉(§4 EP-02). **`force` 는 `If-Match: *` 로만 표현하고 새 필드를 만들지 않는다.**

**멱등키는 없다.** `grep -rn "Idempotency\|idempotencyKey" pages/settings/payment` = **0건**(실측). 방어는 두 겹이다 — 버튼 `disabled`(`SettingsFormShell.tsx:181`)와 **동기 제출 잠금** `useSubmitLock`(`_shared/queries.ts:58-75` · 호출 `PaymentSettingsPage.tsx:242`). **응답 유실 후의 재시도는 새 요청이 되지만 `If-Match` 덕에 중복 적용이 아니라 412 가 된다** — 데이터는 안전하고 **잔여 위험은 UX 다**(운영자가 자기 저장에 대해 '다른 관리자가 변경했다'는 거짓 충돌을 본다). BE-067 §7.4 와 같은 판정이며, **선례가 같은 섹션 안에 있다**(`api-keys/ApiKeysPage.tsx` 의 발급 멱등키).

**되돌릴 수 있는가 — 없다.** 확인한 사실:

- `AuditInfo` 는 `updatedBy`·`updatedAt` **두 필드뿐**이고(`_shared/store.ts:17-21`), 저장이 그것을 **덮어쓴다**(`:148-152`). 즉 **이력이 아니라 마지막 1건**이다.
- 이전 값을 보관하는 자리가 어디에도 없다 — 저장소는 `Revisioned<T>` 하나를 통째로 교체한다(`:148-152`).
- 화면에도 '이전 설정으로 되돌리기'가 없다(FS-078 §3 전수).

**판정**: **현재 계약에는 롤백도 변경 이력도 없다.** 잘못 저장한 결제 설정은 **손으로 다시 입력해서** 되돌리는 수밖에 없고, `usePg` 를 잘못 내린 저장은 그 사이에 발생한 고객 이탈을 되돌리지 못한다. **변경 이력(누가·언제·무엇을 무엇으로)은 서버가 신설해야 한다** — §7.9 #7 과 한 묶음이다.

### 7.8 연결 테스트·PG 카탈로그 — 계약에 존재하지 않는다 【범위 판정】

**코드로 재확인한 사실**:

- `pages/settings/payment/**` 전체에 연결 테스트 호출부·버튼·`TODO(backend)` 주석이 **0건**이다. FS-078 §5 가 같은 사실을 적는다('상점 ID 는 저장할 뿐 PG 사에 검증 요청을 보내지 않는다').
- PG 사 목록은 **코드 상수**다(`payment-settings.ts:22` · 표시명 `:42-47` · 선택지 파생 `types.ts:28-31`). 카탈로그 조회 심이 없다.
- 결제 실행·거래 조회에 해당하는 코드가 이 앱에 없다.

**판정**: `POST /api/settings/payment/test` · `GET /api/payment/providers` · 결제·거래 API 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**다. **형제 화면과 대조하면 이 판정이 뚜렷해진다** — BE-070 은 `OAuthProviderCard.tsx:502-505` 에 연결 테스트 심이 실재해서 EP-03 을 만들었다. **여기에는 그 심이 없으므로 만들지 않는다.**

**그러나 그 부재가 만드는 구멍은 §7.1 이 이미 지목했다** — 형식도 안 보고 확인도 안 하므로 오타 난 MID 는 `pgSellable === true` 로 통과한다. **연결 테스트를 신설할지는 아키텍처가 정할 일이며 이 문서가 발명하지 않는다**(§7.9 #2).

### 7.9 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **미설정 테넌트의 시드 계약** — EP-01 은 문서가 없어도 200 을 주어야 하는데(§4), 그때 무엇을 주는지가 서버 몫이다. **`DEFAULT_PAYMENT_SETTINGS`(OFF · MID 공란 · test)를 그대로 시드로 삼을 것을 요구한다** — `payment-settings.ts:175-178` 이 그 근거를 이미 적었다(켜진 채 시작하면 결제되지 않는 '구매하기'가 기본값이 된다) | 백엔드 명세 |
| 2 | **오타 난 MID 를 잡을 수단이 없다**(§7.1 · §7.8) — fail-closed 가 '비었을 때'만 닫힌다. ① 연결 테스트 엔드포인트를 신설할지 ② PG 사별 형식을 서버가 알고 경고만 낼지 ③ 그대로 둘지가 미정. **어느 쪽이든 프론트에 심이 먼저 생겨야 한다** | **아키텍처 (선행)** · 백엔드 명세 |
| 3 | **422 `error.fields` → 필드 인라인 매핑이 없다**(§4 각주) — 근본 원인은 `createRevisionedStore` 가 `HttpError`(status 보유)를 던지지 않는 것이다. 403/422/429/500 이 한 문구로 뭉개지고 **참조 코드도 없다**(`referenceOf` 가 이미 있는데 이 경로가 쓰지 않는다) | UI 기획 · 백엔드 명세 (FS-078 §7 #6) |
| 4 | **소비 정본이 모듈 지역 변수다**(§7.4) — `readPaymentSettings()` 가 동기 계약이라 서버가 붙으면 성립하지 않는다. **react-query 캐시 조회로 전환**해야 하며, 그 전까지 '저장했는데 새로고침하면 되돌아간다'가 남는다(FS-078 §7 #10) | **아키텍처 · 프론트 구현** |
| 5 | **잠금의 비파괴성을 서버가 강제할 근거가 없다**(§7.3) — `usePg: false` 저장이 다른 도메인 데이터를 지우지 않는다는 것은 지금 **원칙 문장과 프론트 구현**으로만 보장된다. 상품·쿠폰·적립금 계약이 같은 문장을 갖도록 **세 문서를 함께 봐야 한다** | **백엔드 명세 (연동)** · BE-042 |
| 6 | **`merchantId` 취급에 회귀가 없다**(§7.5) — '마스킹하지 않는다 · 시크릿을 받지 않는다'가 계약 문장으로만 존재한다. 서버 연동 시 **응답에 `secret` 계열 키가 0건임을 고정하는 테스트**가 필요하다 | 백엔드 명세 |
| 7 | **`mode: 'live'` 전환의 감사·게이트가 없다**(§7.6) — 그리고 **변경 이력 자체가 없다**(§7.7). `audit` 가 마지막 1건뿐이라 '언제 운영으로 올렸나'·'누가 PG 를 껐나'에 답할 수 없다. **되돌리기(이전 설정 복원)도 없다** | **백엔드 명세 (우선)** · UI 기획 |
| 8 | **덮어쓰기 경로가 trim 과 재검증을 건너뛴다**(FS-078 §7 #16 · §4 검증 2·3) — 서버가 trim·정규화를 하면 데이터는 안전하나 **사용자는 검증을 거치지 않은 값을 저장할 수 있다**(충돌 다이얼로그가 떠 있는 동안 값을 바꾼 경우). 서버 422 가 그때 유일한 방어인데 화면이 그것을 필드로 되돌리지 못한다(#3 과 한 묶음) | 프론트 구현 · 백엔드 명세 |
| 9 | **심이 두 곳에 중복돼 있었다**(`payment-settings.ts:190-193` · `data-source.ts:34-35`) — 이 문서가 하나로 접었다. **연동 시 둘 중 하나만 남기고, 남기는 쪽은 어댑터 파일이어야 한다**(공통 층이 HTTP 계약을 들고 있을 이유가 없다) | 프론트 구현 (정리) |
| 10 | **이 화면의 검증에 테스트가 0건이다**(FS-078 §7 #2) — `paymentSettingsSchema` 를 부르는 파일이 정의(`validation.ts`)와 소비(`PaymentSettingsPage.tsx`) 둘뿐이라 **교차 규칙 4갈래가 하나도 고정돼 있지 않다.** 서버가 §3 표를 구현할 때 **대조군이 없다** — 순수 규칙 쪽(`payment-settings.test.ts` · `pg-axes.test.ts`)만 촘촘하다 | **프론트 구현 (최우선)** · 명세 리뷰 |

## 8. 자기 점검

- [x] FS-078 §5 의 서버 연동 지점이 전부 엔드포인트로 커버됐다 — **심 있는 2건(EP-01 조회 · EP-02 저장) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**(연결 테스트·PG 카탈로그·결제 실행은 §7.8 에서 '계약 없음'으로 판정)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 에 사유 있음 (2행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언하고 재정의하지 않았다. **동시성·감사·403 은닉은 BE-067 상속**으로 선언하고 **결제 설정 고유 함의만** 기술했다
- [x] **fail-closed 판정을 코드 한 줄로 확정**했다(`payment-settings.ts:128-130` · 근거 `:116-127` · 회귀 `pg-axes.test.ts:51-57`)하고, **다른 축이 반대 방향(fail-open)임을 §7.1 #3 에 명시**해 BE-079 §7.2 와 짝을 맞췄다
- [x] 멱등성 판정 — 조회 GET 멱등 / **저장은 `If-Match` 조건부 멱등이며 멱등키는 0건**(grep 실측)임을 §7.7 에 단정하고, 그 잔여 위험이 데이터가 아니라 UX 임을 근거와 함께 적었다
- [x] **동시성을 grep 으로 확인해 단정**했다 — `expectedRevision` 토큰이 실재하므로 **last-write-wins 가 아니다**(`_shared/store.ts:144-146`). **되돌리기·변경 이력은 없다**(`AuditInfo` 2필드 · 저장이 덮어쓴다)
- [x] 보안 판정 — **MID 는 비밀이 아니다(마스킹하지 않는다) · 시크릿은 이 계약에 필드가 없다 · `inquiryGuide` 는 XSS 정제 대상**을 §7.5 에 코드 근거(`payment-settings.ts:192-193` · `PaymentSettingsPage.tsx:460` · 마스킹 grep 0건)와 함께 확정했다. **미결로 남긴 보안 항목은 없다**
- [x] **파생값을 저장하지 않는다**를 §7.2 에 【정합 판정】으로, **잠금이 값을 지우지 않는다**를 §7.3 에 【정합 판정】으로 세우고 **무엇이 잠기지 않는가**를 §3 표에 실었다
- [x] **저장 1건이 12개 소비 지점을 바꾼다**를 §7.4 에 전수 표로 적고, 그것이 만드는 캐시 어긋남의 창을 판정으로 남겼다
- [x] **확인하지 못한 것을 쓰지 않았다** — 연결 테스트·PG 카탈로그·결제 실행은 '심 0건 → 계약 없음'으로 판정했고, `mode: 'live'` 의 게이트·감사는 **지금 없다**고 적은 뒤 후속으로 이관했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
