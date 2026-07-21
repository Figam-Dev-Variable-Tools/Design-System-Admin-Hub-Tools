---
id: BE-073
title: "상품 문의 백엔드 기능 명세"
functionalSpec: FS-073
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-073. 상품 문의 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-073 상품 문의 (`/products/inquiries` · `/products/inquiries/:id`) |
| 범위 | 문의 목록 조회, 문의 상세 조회, **답변·상태 전이 저장**(답변 작성/수정 · 답변 착수 · 종결 · 견적 발행 결과 기록), **문의 → 견적 발행**(발행 사실의 기록까지) |
| **범위 밖** | **문의 등록** — 문의를 만드는 것은 고객이다. 관리자가 문의를 만드는 API 는 이 계약에 존재하지 않는다(§7.2). **문의 삭제** — 화면에 진입점이 없고, 문의는 고객이 남긴 응대 기록이다(§7.2). **견적의 정본**(품목·단가·과세유형·유효기간·발송·수주 전환) — 이 계약은 **발행 사실만 기록**하고 나머지는 견적 계약이 소유한다(§7.4). **상품 CRUD·SKU·재고** — BE-042 소관. 이 계약은 `productName` 스냅숏만 들고 상품을 조회하지 않는다. **결제(PG) 설정** — 이 화면의 유입량을 지배하지만 정본은 설정 계약이다(§7.6). **잔여 문의 집계** — 사이드바·대시보드·통계가 읽는 값이며 이 화면은 소비자가 아니다. 심이 없어 엔드포인트를 만들지 않는다(§6 · §7.13 #7) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601 **UTC(Z)** 로 저장하고 표기 환산은 프론트가 한다(`_shared/store.ts:17-19`), 날짜 계산은 **KST 달력일** 기준이다 |
| 프론트 어댑터 | `apps/admin/src/pages/products/inquiries/data-source.ts` (`productInquiryAdapter` = 공용 `createStoreAdapter`, `scope = 'product-inquiries'`) + 페이지 경계를 넘는 이음매 `shared/domain/quote-issue.ts` |
| 도메인 타입 | `apps/admin/src/pages/products/inquiries/_shared/store.ts`(문의 · 전이 술어 · 전이 함수 · 견적 발행 매핑). 견적 쪽 계약 타입은 **공통 층에서 온다**(`shared/domain/quote-issue.ts` 의 `QuoteIssueSource` · `QuoteIssueCandidate` · `IssuedQuoteRef`) |
| 검증 정본 | **답변 본문은 zod 다** — `productInquiryAnswerSchema`(`validation.ts:11-18`), 화면은 `answerError`(`:25-29`)만 부르고 자기 조건문을 갖지 않는다(`:20-23`). **상태 전이는 순수 술어 4개**(`canAnswer` · `canClose` · `canBeginAnswering` · `canIssueQuote` — `_shared/store.ts:101-118`)이고 전이 함수가 같은 술어로 **던진다**(`:128,141,147,161`). **견적 발행 가드는 공통 층**(`quoteIssueBlock` — `quote-issue.ts:136-142`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 상품 문의 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 1건 — 목록·상세·저장 | `data-source.ts:23` `// TODO(backend): GET /api/products/inquiries · GET/PUT /api/products/inquiries/:id` |
| 심이 **트랜잭션과 409 를 명시한다** | `data-source.ts:24-25` `답변 저장은 본문·답변시각·상태를 한 트랜잭션으로 옮긴다(applyAnswer 와 같은 규칙). · 종결은 답변이 나간 문의에만 허용하고, 위반은 409 로 되돌린다.` |
| 심 1건 — 견적 발행(다른 페이지 소유) | `pages/sales/quotes/data-source.ts:142-143` `// TODO(backend): POST /api/sales/quotes/issue — 서버가 문의 잠금 + 견적 생성 + 역링크 설정을 한 트랜잭션으로 처리하고, 이미 발행된 문의가 섞여 있으면 409 로 거절한다.` |
| 등록·삭제 심 **없음** — 의도된 부재 | `_shared/store.ts:3-6`(`항목을 만드는 것은 **고객**이고 관리자는 답변하고 종결할 뿐이다 — 그래서 화면에는 등록 폼이 없다`) · `:315`(`고객 채널이 만든다 — 관리자 화면에는 이 문을 여는 버튼이 없다`) · `data-source.ts:4-5` · `create`/`remove` 호출부 **0건**(grep 실측 2026-07-22) |
| 전이 술어가 **화면과 저장소에서 같다** | 정본 `_shared/store.ts:72-76`(`버튼의 disabled 와 저장의 허용 여부가 서로 다른 판단을 하면 '눌리는데 실패하는 버튼' … 이 생긴다`) · 화면 소비 `ProductInquiryDetailPage.tsx:365,370,376,381` · 저장 소비 `_shared/store.ts:128,141,147,161` · 회귀 `inquiries.test.ts:140-165,187-191` |
| 답변·답변시각·상태가 **한 함수에서만** 움직인다 | `_shared/store.ts:8-11,127-137` · 회귀 `inquiries.test.ts:75-115` |
| **최초 답변 시각은 불변** | `_shared/store.ts:134`(`inquiry.answeredAt === '' ? at : inquiry.answeredAt`) · 근거 `:122-125` · 회귀 `inquiries.test.ts:97-107` |
| 견적 발행 멱등키는 **`quoteId`** | `_shared/store.ts:60-65,160` · 공통 층 `quote-issue.ts:44-45,93` · 저장소 교차 확인 `quotes/data-source.ts:148-151` · 회귀 `inquiries.test.ts:439-442` · `quote-issue.test.ts:95-136` |
| 발행 가드가 **미배선을 문장으로 드러낸다** | `quote-issue.ts:23-26,136-142`(`QUOTE_ISSUE_UNWIRED`) · 회귀 `quote-issue.test.ts:86-92` |
| 처리 이력이 **저장된 사실의 파생값**이다 | `types.ts:203-210,211-269` — 별도 이력 테이블이 없다(§7.9) |
| 유령 저장·409 는 공용 어댑터가 막는다 | `shared/crud/crud.ts:256-258` (`if (!exists(id)) throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 항목입니다.')`) |
| 404 변환은 이미 되어 있다 | `crud.ts:217-219` · 소비 `ProductInquiryDetailPage.tsx:235-258` |
| 멱등키 원장이 어댑터에 있으나 **호출부가 키를 넘기지 않는다** | `crud.ts:67-77,229,243,354-355`(자리) ↔ `ProductInquiryDetailPage.tsx:171-172` · `ProductInquiryListPage.tsx:215-218` (`idempotencyKey` grep **0건**) |
| 낙관적 동시성 토큰이 **없다** | `version`·`updatedAt`·`If-Match` grep **0건**(두 디렉터리 실측 2026-07-22) |
| 이 리소스는 `commerce.products` 모듈이다 | `shared/entitlements/module-resources.ts:40-46` |
| 이 화면의 유입은 **결제 설정에 종속된다** | `shared/commerce/payment-settings.ts:100-103`(`INQUIRY_PATH.product = '/products/inquiries'`) · `:128-130`(`pgSellable`) · `:143-153`(`checkoutCta`) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세) + **답변·상태 전이 저장**(EP-03) — 상품 문의 응대는 운영자의 본업이므로 BE-010(콘텐츠)과 달리 쓰기를 연다(§7.10). **단 견적 발행(EP-04)과 `status='quote_issued'` 저장은 예외이며 견적 `create` 권한을 함께 요구한다**(§7.4 — BE-051 §7.6 과 같은 결). 상품 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / **개별 문의 404 은닉**(§7.8).
- **CSRF**: 쓰기(PUT · POST)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. 답변 저장 5초 → 504. **견적 발행은 견적 생성 + 문의 다건 잠금이 한 트랜잭션이라 10초 → 504**(§7.4).
- **엔타이틀먼트**: 이 리소스는 `commerce.products` 모듈에 속한다(`module-resources.ts:40-46`). 플랜에 없으면 화면 진입이 잠기지만 **그 판정은 라우트 계층의 것이며 이 계약의 응답 코드가 아니다** — 서버는 권한(403/404)만 말한다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 `useRouteWritePermissions` 를 실제로 배선했지만(목록 `ProductInquiryListPage.tsx:148` · 상세 `ProductInquiryDetailPage.tsx:129`) 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다. 권한 강제는 전적으로 서버 책임이다.

## 3. 데이터 계약 (`_shared/store.ts` · `shared/domain/quote-issue.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `ProductInquiry` | `id` · `productId` · `productName`(스냅숏) · `customerName` · `customerContact` · `channel` · `subject` · `message` · `status` · `createdAt`(ISO UTC) · `answeredAt`(ISO 또는 `''`) · `answer`(`''` 이면 미답변) · `quoteId`(`''` 이면 미발행) | **`id` 가 곧 문의번호다** — `PIQ-YYYYMMDD-NNN`(`_shared/store.ts:13-15,296-301`, 회귀 `inquiries.test.ts:416-420`). 고객이 전화로 부르는 번호와 URL 이 같은 값이다. **목록과 상세가 같은 타입이다** — 목록 응답에도 `customerContact`·`message` 전문이 실린다(§7.11) |
| `ProductInquiryInput` | `Omit<ProductInquiry, 'id'>` — 12필드 | 저장 입력. **전체 치환**이며 불변 필드(`productId`·`productName`·`customerName`·`customerContact`·`channel`·`subject`·`message`·`createdAt`)와 **서버 소유 필드(`answeredAt`·`quoteId`·`status`)까지 포함한다**(§7.9) |
| `InquiryStatus` | `received` \| `answering` \| `quote_issued` \| `answered` \| `closed` | **5종.** 되돌아가는 전이가 없다(`:26-28`). 영업 문의(7종)와 값 집합이 다르고 `quote_issued` 라는 낱말만 빌렸다(`:30-33`) |
| `ProductInquiryChannel` | `storefront` \| `app` \| `phone` \| `email` \| `kakao` | `storefront` = **PG 를 끈 상품 페이지의 '문의하기' 버튼**(`:37`) — 이 모듈이 존재하는 이유다(§7.6) |
| `QuoteIssueSource`(공통 층) | `id`(**멱등키**) · `no` · `channel`(`'product'`) · `accountLabel` · `customerName` · `itemName` · `body` | **문의 쪽이 소유하는 값만** 담는다 — 단가·과세유형·유효기간은 없다(`quote-issue.ts:37-42`). 상품 문의의 매핑은 `toQuoteIssueSource`(`_shared/store.ts:172-182`): 거래처 라벨·문의자 = `customerName`(개인 고객이라 회사가 없다), **품목명 = `productName`** |
| `QuoteIssueCandidate`(공통 층) | `id` · `quoteId` · `issuable` | 발행 가능 판정이 읽는 최소 모양. **상태 어휘는 넘기지 않는다** — 판정은 각 문의 모듈이 하고 공통 층은 불리언만 본다(`quote-issue.ts:85-97`) |
| `IssuedQuoteRef`(공통 층) | `id` · `quoteNo` | 견적의 나머지를 문의가 알지 못하게 한 최소 참조(`quotes/data-source.ts:159-162`) |
| 상수 | `PRODUCT_INQUIRY_ANSWER_MAX = 1000`(`_shared/store.ts:70`) | 답변 본문 상한 |

**처리 상태 (`STATUS_META` — 표시 · `types.ts:26-34`)**

| 값 | 라벨 | 톤 | 흐름상 위치 |
|---|---|---|---|
| `received` | 접수 | **warning** | 시작. 아직 아무도 붙지 않았다 |
| `answering` | 답변 중 | info | 담당자가 잡았다. **고객에게는 아직 아무것도 나가지 않았다** |
| `quote_issued` | 견적 발행 | info | 산출물이 나온 **진행** 단계 — 종료가 아니다 |
| `answered` | 답변 완료 | success | 답변이 나갔다 |
| `closed` | 종결 | neutral | **유일한 종료 상태.** 답변 수정·견적 발행이 모두 닫힌다 |

> **미답변 두 상태를 같은 색으로 묶지 않는다**(`types.ts:20-25`) — '답변 중'은 이미 사람이 붙은 상태라 방치된 '접수'와 색이 같으면 우선순위 판단이 불가능하다. **미답변의 단일 정의는 `isUnanswered`**(`_shared/store.ts:90-92`) = `received` 또는 `answering`. **견적을 발행한 문의는 미답변이 아니다**(`:87-88` — 견적서가 나갔다면 그것이 응답이다. 회귀 `inquiries.test.ts:459-461`).

**전이 규칙 — 판정 순서 그대로 (순수 · `_shared/store.ts:127-163`, 회귀 `inquiries.test.ts:75-165,187-191,431-457`)**

| 전이 | 판정 순서 | 조건 | 거절 사유 |
|---|---|---|---|
| **답변 저장** `applyAnswer` | ① | `status === 'closed'`(= `!canAnswer`) | `종결된 문의는 답변을 수정할 수 없습니다.` |
| | ② | `answer.trim() === ''` | `답변 내용을 입력하세요.` |
| | ③ | 통과 | `answer = trim(body)` · `answeredAt` 은 **비어 있을 때만** `at` · `status = 'answered'` |
| **답변 착수** `applyBeginAnswering` | ① | `status !== 'received'`(= `!canBeginAnswering`) | `접수 상태의 문의만 답변 착수로 바꿀 수 있습니다.` |
| | ② | 통과 | `status = 'answering'` |
| **종결** `applyClose` | ① | `status !== 'answered'`(= `!canClose`) | `답변하지 않은 문의는 종결할 수 없습니다.` |
| | ② | 통과 | `status = 'closed'` |
| **견적 발행 기록** `applyQuoteIssued` | ① | `quoteId !== ''` | **거절이 아니다 — 원본을 그대로 돌려준다**(멱등, `:160`) |
| | ② | `status === 'closed'`(= `!canIssueQuote`) | `종결된 문의는 견적을 발행할 수 없습니다.` |
| | ③ | 통과 | `quoteId` 부여 · `status = 'quote_issued'` |

**견적 발행 가드 — 판정 순서 그대로 (공통 층 순수 · `quote-issue.ts:136-142`, 회귀 `quote-issue.test.ts:58-93`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | `candidates.length === 0` | `견적을 발행할 문의를 한 건 이상 선택하세요.` |
| ② | 하나라도 `quoteId !== ''` | `이미 견적이 발행된 문의가 있습니다. 발행된 견적을 여세요.` |
| ③ | 하나라도 `issuable === false`(= 종결) | `종결된 문의는 견적을 발행할 수 없습니다.` |
| ④ | 발행기 **미배선** | `견적 발행을 사용할 수 없습니다. 관리자에게 문의하세요.` |
| ⑤ | 전부 통과 | `null` |

**답변 검증 (순수 — `validation.ts:11-18`, 회귀 `inquiries.test.ts:392-411`)**

| 규칙 | 정의 |
|---|---|
| 공백 금지 | `value.trim() !== ''` 위반 시 `답변 내용을 입력하세요.` — **빈 답변이 '답변 완료'로 집계되면 고객은 아무것도 받지 못한 채 처리된다**(`validation.ts:4-6`) |
| 길이 상한 | `value.trim().length <= 1000` 위반 시 `답변은 1000자를 넘을 수 없습니다.` (UTF-16 code unit 기준) |
| 이중 방어 | 화면은 `answerError` 로 1차, **저장소도 `applyAnswer` 안에서 같은 규칙으로 한 번 더 막는다**(`_shared/store.ts:129-130`) |

**순수 표시 규칙 (`types.ts` — 서버 계약에 넣지 않는다 · §7.9)**

| 함수 | 정의 |
|---|---|
| `unansweredCount(list)`(`:114-116`) | `isUnanswered` 인 건수. **필터 이전 전체 집합**에서 센다 |
| `countInquiriesByStatus(list)`(`:98-111`) | 전체 + 상태 5종 건수. 필터가 자기 배지를 흔들지 않게 필터 이전 집합에서 센다(`:97`) |
| `searchProductInquiries(list, kw)`(`:119-132`) | **문의번호·상품명·문의자·제목** 4필드 대소문자 무시 부분 일치 |
| `sortProductInquiries(list)`(`:135-140`) | 접수 최신순, 동시각은 `id` 내림차순 **안정 정렬**. 원본을 바꾸지 않는다 |
| `elapsedLabel`/`elapsedTone`(`:171-196`) | 미답변은 접수일→오늘, 답변된 건은 접수일→최초 답변일. **`OVERDUE_DAYS = 3`**(`:145`) 이상이면 danger. 읽을 수 없으면 `'—'` — **0일로 위장하지 않는다** |
| `inquiryHistory(inquiry)`(`:211-269`) | 접수 → (답변 중) → (`quoteId` 있으면) 견적 발행 → (`answeredAt` 있으면) 답변 → (종결) **최대 5칸**. 저장된 사실의 파생값이다 |

## 4. 엔드포인트 명세

### BE-073-EP-01 · 문의 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-073-EL-001, EL-006, EL-009, EL-010, EL-011, EL-011.1~.9, EL-012, EL-013, EL-014 |
| 심 | `data-source.ts:23` `GET /api/products/inquiries` |
| 메서드·경로 | `GET /api/products/inquiries` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.11) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 상태 필터·검색·정렬을 프론트가 **전부 클라이언트에서** 수행하므로(`ProductInquiryListPage.tsx:177-180`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다(`crud.ts:199-200`).

**응답 200** — `readonly ProductInquiry[]`. **접수 최신순 정렬**(동시각은 `id` 내림차순 안정 정렬)로 내려준다. 프론트가 어댑터 `list` 에서 한 번 더 정렬하지만(`data-source.ts:28`) **서버 순서가 정본이어야** 페이징 도입 시(§7.11) 계약이 유지된다. 정렬을 화면이 아니라 어댑터에 둔 이유가 코드에 있다(`data-source.ts:7-8` — `'최근 접수가 위' 는 이 도메인의 성질이지 화면의 취향이 아니다`).

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-073-EP-02 · 문의 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-073-EL-019, EL-020, EL-021, EL-023, EL-024, EL-024.1, EL-025.1, EL-036, EL-037 |
| 심 | `data-source.ts:23` `GET /api/products/inquiries/:id` |
| 메서드·경로 | `GET /api/products/inquiries/:id` |
| 권한 | `admin`, `operator`. 상품 도메인 읽기 권한 없음 → **404 은닉**(§7.8) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `ProductInquiry`(목록과 **같은 타입**). 처리 이력은 응답에 없다 — 프론트가 저장된 값에서 파생한다(§7.9).

**에러**: 400(id 형식) · 401 · **404 `INQUIRY_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.8) · 429 · 500 · 504.

> **어댑터는 이미 옳다**: 공용 `createStoreAdapter.fetchOne` 이 없는 id 에 **`HttpError(404, '항목을 찾을 수 없습니다.')`** 를 던진다(`crud.ts:217-219`). 그래서 화면이 404 와 5xx 를 문구·복구 수단으로 가른다(`ProductInquiryDetailPage.tsx:235-258` — 404 면 '다시 시도'를 숨기고 '목록으로'만 준다). 백엔드 연결 시 응답 404 를 같은 타입으로 옮기기만 하면 `EXC-12` 계약이 그대로 유지된다.

---

### BE-073-EP-03 · 답변·상태 전이 저장
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-073-EL-025, EL-028, EL-029, EL-030, EL-031, EL-032, EL-033, EL-035 |
| 심 | `data-source.ts:23-25` `PUT /api/products/inquiries/:id` + **트랜잭션·409 요구** |
| 메서드·경로 | `PUT /api/products/inquiries/:id` |
| 권한 | `admin`, `operator`(§7.10). **`status='quote_issued'` 요청은 견적 `create` 권한을 함께 요구한다**(§7.4). 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다**(§7.7). 자리는 어댑터·훅에 이미 있고(`crud.ts:243,354-355`) **호출부가 비어 있다** |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `ProductInquiryInput` 12필드): `productId` · `productName` · `customerName` · `customerContact` · `channel` · `subject` · `message` · `status` · `createdAt` · `answeredAt` · `answer` · `quoteId`.

**서버 검증 (요청을 그대로 믿지 않는다 — 순서가 곧 규칙이다)**
1. **불변 필드 무시**: `productId` · `productName` · `customerName` · `customerContact` · `channel` · `subject` · `message` · `createdAt` 는 관리자가 바꿀 수 없다. 프론트가 `toProductInquiryInput(next)`(`_shared/store.ts:190-205`)로 되돌려 보내지만 **서버는 저장된 값을 정본으로 유지하고 요청 값을 무시**한다(§7.9).
2. **서버 소유 필드 무시**: `answeredAt` · `quoteId` 는 **절대 요청에서 받지 않는다** — 서버가 찍는다(§7.9 【보안 판정】).
3. **전이 재판정**: `status` 가 바뀌면 §3 의 전이 표를 **저장된 상태를 기준으로** 다시 판정한다. 위반 시 **422**. 프론트 판정은 UX 이며 정본이 아니다.
4. **답변 본문 검증**: `answer` 를 trim 하고, 상태가 `answered` 로 이동하는 요청이면 **비어 있을 수 없다**(`EMPTY_ANSWER`). 길이는 1000자 이하.
5. **최초 답변 시각 고정**: 저장된 `answeredAt !== ''` 이면 **그대로 유지한다.** 재수정이 응대 속도를 사후에 바꾸는 것을 막는다(`_shared/store.ts:122-125,134`).
6. **`quote_issued` 는 이 엔드포인트가 만들지 않는다**: 상태를 `quote_issued` 로 옮기는 유일한 정당한 경로는 EP-04 의 결과 기록이다. 그것 없이 온 `status='quote_issued'` 요청은 **422 `QUOTE_REQUIRED`** 로 거절한다 — 견적 없는 '견적 발행' 상태를 만들지 않는다(§7.4).
7. **답변 본문 정제**: 고객에게 그대로 나가는 글이므로 서버가 저장 시 XSS 정제를 수행한다(BE-026 §7.1 과 같은 결).

**응답 200/204**. 프론트 `update(id, input, context?): Promise<void>` — 응답 본문을 읽지 않고 상세를 재조회한다(`ProductInquiryDetailPage.tsx:177`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `status`·`answer`) · 401 · 403 `FORBIDDEN` · 403 `QUOTE_ISSUE_FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `INQUIRY_NOT_FOUND`** · **409 `CONFLICT`**(§7.7) · **422 `INVALID_STATUS_TRANSITION`**(§3 전이 표 위반) · **422 `EMPTY_ANSWER`** · **422 `ANSWER_ON_CLOSED`** · **422 `QUOTE_REQUIRED`** · 429 · 500 · 504.

> **`error.fields` 를 소비할 자리가 프론트에 없다**: 이 화면은 `useCrudForm` 을 쓰지 않아 `setError`+`setFocus` 경로를 상속하지 못했고, 모든 저장 실패가 카드 배너 한 문장('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' — `ProductInquiryDetailPage.tsx:181`)으로 수렴한다. **계약은 그럼에도 `error.fields` 를 내려보낸다** — 프론트가 매핑을 얻는 날 서버를 바꾸지 않기 위해서다(§7.13 #4).

---

### BE-073-EP-04 · 문의 → 견적 발행
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-073-EL-008, EL-015, EL-030, EL-011.10, EL-024.1 |
| 심 | `pages/sales/quotes/data-source.ts:142-143` `POST /api/sales/quotes/issue` |
| 메서드·경로 | `POST /api/sales/quotes/issue` |
| 권한 | `admin` + **견적 `create` 권한을 가진 `operator`**(§7.4) |
| 멱등성 | **문의 id 가 도메인 멱등키다**(`quote-issue.ts:44-45`). 같은 문의로 두 번 발행해도 견적은 하나이며 기존 견적을 돌려준다 |
| 레이트리밋 | **분당 20회** — 견적 채번 폭주를 막는다 |

**바디**: `{ sources: QuoteIssueSource[] }` — 각 원소는 `id` · `no` · `channel:'product'` · `accountLabel` · `customerName` · `itemName` · `body`.

**서버 검증 (순서가 곧 규칙이다 — §3 의 발행 가드 표를 그대로 구현한다)**
1. `sources` 가 비었으면 **400**.
2. 각 `id` 가 실재하는 문의인지 확인한다. 없으면 **404 `INQUIRY_NOT_FOUND`**.
3. **하나라도 이미 견적을 가졌으면 409 `QUOTE_ALREADY_ISSUED`** — 심이 이것을 명시한다(`quotes/data-source.ts:142-143`). 픽스처는 기존 견적을 조용히 돌려주지만(`:148-151`) **서버는 거절한다**: 끌려 들어온 나머지 문의가 견적을 얻지 못한 채 성공으로 보이기 때문이다(그 사실을 회귀가 이미 고정한다 — `quote-issue.test.ts:116-125`).
4. 하나라도 종결이면 **422 `INQUIRY_NOT_ISSUABLE`**.
5. **한 트랜잭션**으로 ① 문의 다건 잠금 ② 견적 1건 생성·채번 ③ **각 문의에 `quoteId` 기입 + `status = 'quote_issued'`** 를 수행한다. 어느 하나가 실패하면 전부 롤백한다(§7.4).
6. `itemName`·`accountLabel`·`body` 는 **문의의 저장값에서 서버가 다시 만든다** — 요청 값을 신뢰하지 않는다(§7.9). 요청은 어느 문의를 합칠지만 말한다.

**응답 201** — `IssuedQuoteRef`(`{ id, quoteNo }`). **견적 전체를 돌려주지 않는다** — 문의 화면이 견적 필드를 읽기 시작하는 순간이 페이지 결합의 시작이다(`quotes/data-source.ts:159-162`).

**에러**: 400 · 401 · **403 `QUOTE_ISSUE_FORBIDDEN`** · 403 `CSRF_TOKEN_INVALID` · **404 `INQUIRY_NOT_FOUND`** · **409 `QUOTE_ALREADY_ISSUED`** · **422 `INQUIRY_NOT_ISSUABLE`** · 429 · 500 · 504.

> **이 계약의 정본은 견적 계약이다** 【범위 판정】: 이 문서는 엔드포인트를 **만들지 않고 소비 사실과 문의 쪽 계약(무엇이 넘어가고 무엇이 기록되는가)만** 기록한다. 견적의 품목·단가·과세유형·유효기간·발송·수주 전환은 FS-050 계열이 소유한다. 문의가 아는 것은 `IssuedQuoteRef` 둘(`id`·`quoteNo`)과 링크 경로(`issuedQuoteHref` — `quote-issue.ts:81-83`)뿐이며, **그 경계는 코드가 강제한다**(문의 화면이 견적 모듈을 import 하지 않는다 — `quote-issue.ts:13-17`).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:60-66`)가 재인증으로. 화면은 FS-073-EL-014 배너 | **403** 컬렉션 — 상품 도메인 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1). **화면은 이 403 을 일반 배너로 뭉갠다**(FS-073 §7 #7) | N/A — 0건이면 200 빈 배열 → FS-073-EL-013 빈 상태 3분기 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-073-EL-014 | 5초 → 504 → FS-073-EL-014 |
| EP-02 상세 | 400 — id 형식 위반 → 화면은 FS-073-EL-020 의 **일반 오류 분기**(400 을 404 와 구분하지 않는다) | 401 → 전역 인터셉터. 화면은 FS-073-EL-020 | **읽기 권한 없음 → 404 은닉**(§7.8) — 문의 1건은 문의자 실명·연락처·문의 원문을 담는다. 읽기 권한이 있는 `operator` 에게는 403 | **404 `INQUIRY_NOT_FOUND`** — 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:217-219`). 화면이 '다시 시도'를 숨기고 '목록으로'만 준다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-073-EL-020 일반 분기(재시도 제공) | 5초 → 504 → FS-073-EL-020 |
| EP-03 저장 | 400 `VALIDATION_FAILED` — `status`·`channel` 이 유니온 밖 · `answer` 1000자 초과. `error.fields` 로 내려보내나 **프론트에 필드 매핑이 없어**(EXC-07) FS-073-EL-022 배너 한 문장으로 뭉개진다 | 401 → 전역 인터셉터가 재인증으로. **미저장 답변은 유실된다**(프로그램 이동이라 이탈 가드가 발화하지 않는다 — FS-073 §7 #27) | `operator` 도 쓰기가 허용되므로(§7.10) 역할 부족 403 은 상품 쓰기 권한 없는 그 밖의 역할에만. **`status='quote_issued'` 요청은 견적 create 권한이 없으면 403 `QUOTE_ISSUE_FORBIDDEN`**. **읽기 권한 없음 → 404 은닉**. 화면은 403 을 일반 배너로 뭉갠다 | **404 `INQUIRY_NOT_FOUND`** — 존재한 적 없는 id. **프론트 픽스처는 같은 경우 409 를 던진다**(`crud.ts:256-258`) — 픽스처에는 '존재한 적 없음'과 '먼저 삭제됨'을 가를 정보가 없다. 서버는 둘을 가른다(§7.7) | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.7). **화면에 해소 UI 가 없어**(`isConflict` grep 0건) 일반 배너로 뭉개진다 | **422 `INVALID_STATUS_TRANSITION`**(§3 전이 표 위반 — 종결 후 답변·미답변 종결·접수 아닌 착수·종결의 발행) · **422 `EMPTY_ANSWER`** · **422 `ANSWER_ON_CLOSED`** · **422 `QUOTE_REQUIRED`**. 프론트가 1차 차단하지만 **서버가 정본**이다 | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-073-EL-022 배너, 입력 보존. **참조 코드는 표시되지 않는다**(`useCrudForm` 미사용 — EXC-20) | 5초 → 504 → EL-022. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다 |
| EP-04 견적 발행 | 400 — `sources` 가 비었거나 형식 위반. **화면에서는 `quoteIssueBlock` ①이 먼저 막아 도달하지 않는다** | 401 → 전역 인터셉터. 화면은 FS-073-EL-008 의 **토스트** | **403 `QUOTE_ISSUE_FORBIDDEN`** — 견적 create 권한 부재(§7.4). **404 은닉 대상이 아니다** — 주체는 이미 문의의 존재를 안다 | **404 `INQUIRY_NOT_FOUND`** — `sources` 의 id 가 없다. 그 경우 트랜잭션 전체를 거절한다(부분 발행 금지) | **409 `QUOTE_ALREADY_ISSUED`** — 이미 발행된 문의가 섞였다. 심이 이 코드를 명시한다(`quotes/data-source.ts:142-143`). 화면 가드 ②가 1차로 막는다 | **422 `INQUIRY_NOT_ISSUABLE`** — 종결된 문의가 섞였다(가드 ③) | **429 분당 20** — 견적 채번 폭주 방지 | 500 + `traceId` → FS-073-EL-008 토스트('견적을 발행하지 못했습니다…'). **토스트는 자동 소멸하므로 이 화면에서 가장 무거운 쓰기가 가장 약한 통지를 쓴다**(FS-073 §7 #28) | **10초 → 504**(견적 생성 + 문의 다건 잠금 트랜잭션). 재시도는 문의 id 멱등키가 이중 발행을 막는다 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `productInquiryAdapter.fetchAll(signal)` | `GET /api/products/inquiries` | EP-01 | `readonly ProductInquiry[]` | O — 정렬을 어댑터가 건다(`data-source.ts:28`) |
| `productInquiryAdapter.fetchOne(id, signal)` | `GET /api/products/inquiries/:id` | EP-02 | `ProductInquiry` | O — **404 를 이미 `HttpError` 로 던진다**(`crud.ts:217-219`) |
| `productInquiryAdapter.update(id, input, context?)` | `PUT /api/products/inquiries/:id` + 트랜잭션·409 주석 | EP-03 | `void` | **△ — 전체 치환 계약 변경 필요**(§7.9) · **멱등키 미전달**(§7.7) · **409 해소 UI 없음** · **422/400 필드 매핑 없음** |
| `issueQuote(sources)`(`quote-issue.ts:153-156`) | `POST /api/sales/quotes/issue`(`quotes/data-source.ts:142-143`) | EP-04 | `IssuedQuoteRef \| null` | **△ — 동기 seam이다.** 미배선이면 `null` 이고 `quoteIssueBlock` ④가 먼저 막는다(§7.5) |
| 발행 후 문의별 `update` 루프(`ProductInquiryListPage.tsx:214-219`) | — | **EP-04 가 흡수한다** | — | **X — 다건 발행이 원자적이지 않다.** 서버 계약이 이 루프를 없앤다(§7.4) |
| `readInquiryBacklog('product')`(`inquiry-backlog.ts:51-53`) | — (동기 seam) | **없음 — 심이 없어 발명하지 않는다** | `InquiryBacklog \| null` | **△ — 이 화면의 소비자가 아니다**(사이드바·대시보드·통계). 서버 집계 계약은 미결(§7.13 #7) |
| `quoteIssueBlock(candidates)` | — (순수 규칙) | EP-04 의 서버 검증 1~4 | `string \| null` | O — 서버가 같은 순서로 재판정한다(§7.5) |
| `productInquiryAdapter.create(...)` | — | **없음(범위 밖)** | `createStoreAdapter` 가 제공하나 **호출부 0건** | O — 계약 없음이 정답(§7.2) |
| `productInquiryAdapter.remove(...)` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답(§7.2) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`update` · 견적 발행)에 `X-CSRF-Token` 헤더를 싣는다. 시그니처는 바뀌지 않는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` **이미 충족** — 응답 404 를 `HttpError(404, …)` 로 옮기기만 한다(`crud.ts:217-219`). |
| 409 변환 | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다 — `isConflict` 가 412 도 같은 UX 로 수렴시킨다. **화면 쪽 해소 UI 는 별도 작업이다**(§7.13 #3). |
| 422 변환 | `update` 는 응답 422 의 `error.fields` 를 `HttpError.violations`(`{ field, message }[]`)로 옮긴다. **`field` 이름은 `status`·`answer` 둘이다.** 소비하는 자리는 아직 없다 — 지금은 배너로 수렴한다(§7.13 #4). |
| 멱등키 | `update` 는 `context?.idempotencyKey` 를 `Idempotency-Key: <key>` 헤더로 내보낸다 — **자리는 이미 있다**(`crud.ts:243,354-355`). **비어 있는 것은 호출부다**(§7.13 #2). |
| 서버 소유 필드 제거 | `toProductInquiryInput`(`_shared/store.ts:190-205`)이 실어 보내는 `answeredAt`·`quoteId` 와 불변 8필드는 **요청에서 사라져야 한다**(§7.9 안 A). 어댑터 시그니처는 그대로이고 `Input` 타입만 좁아진다. |
| 전이 가드 유지 | 전이 술어 4개와 `applyAnswer`/`applyClose`/`applyBeginAnswering`/`applyQuoteIssued` 는 **지우지 않는다** — 서버가 정본이 되어도 화면 버튼과 같은 술어를 읽는 자리가 필요하다(§7.1). 다만 저장의 최종 판정은 서버다. |
| 발행 루프 제거 | 목록의 `for (const target of targets) await update(...)`(`ProductInquiryListPage.tsx:214-219`)와 상세의 `commit(applyQuoteIssued(...))`(`:228-231`)는 **EP-04 한 번의 호출로 대체된다.** 이 루프를 남긴 채 서버도 상태를 옮기면 **같은 저장이 두 번 나간다**(§7.4). |
| 발행기 seam 유지 | `issueQuote`/`registerQuoteIssuer` 구조(`quote-issue.ts:104-156` · 배선 `wiring.ts:188`)는 유지한다 — 그것이 없으면 `pages/products → pages/sales` 결합이 되살아난다(`quote-issue.ts:13-17`). 백엔드 연결 시 배선되는 구현만 HTTP 호출로 바뀐다. |

## 7. 핵심 판정

### 7.1 전이 규칙은 이미 코드에 있다 — 서버는 같은 표를 같은 순서로 재판정한다 【정합 판정】

이 도메인은 상태를 자유롭게 고르는 select 를 **의도적으로 두지 않았다**(`ProductInquiryDetailPage.tsx:6-9` — `화면이 상태를 자유롭게 고르게 두면 '답변 없이 답변 완료' 가 만들어지고, 그 순간 목록의 미답변 집계와 경과 문구가 전부 거짓말이 된다`). 대신 **네 술어가 정본**이고, 화면은 그것을 **버튼의 존재 조건**으로 읽으며 저장소는 같은 술어로 **던진다**.

**코드로 확인한 정합**(【정합 판정】의 근거):

| 동작 | 화면의 존재 조건 | 저장의 거절 | 같은 술어인가 |
|---|---|---|---|
| 답변 저장 | `canUpdate && canAnswer(status)`(`:381`) | `applyAnswer` 의 `!canAnswer` → throw(`_shared/store.ts:128`) | **예** |
| 답변 착수 | `canUpdate && canBeginAnswering(status)`(`:365`) | `applyBeginAnswering` 의 `!canBeginAnswering` → throw(`:147`) | **예** |
| 문의 종결 | `canUpdate && canClose(status)`(`:370`) | `applyClose` 의 `!canClose` → throw(`:141`) | **예** |
| 견적 발행 | `canUpdate && issueBlock === null`(`:376`, `issueBlock = quoteIssueBlock([...])` `:159-160`) | 목록의 `basketBlock`(`ProductInquiryListPage.tsx:206,341`) · 저장소 `applyQuoteIssued` 의 `!canIssueQuote`(`:161`) | **예** — 세 자리가 같은 공통 층 함수를 읽는다 |

**판정**: **눌리는데 실패하는 버튼이 이 화면에 없다.** 서버는 §3 의 두 표(전이 · 발행 가드)를 **그 순서 그대로** 구현하고 위반을 **422** 로 거절한다. 이것은 제안이 아니라 **코드가 이미 세운 규칙의 승격**이며, 회귀가 사유 문자열까지 고정한다(`inquiries.test.ts:127-137,140-165,187-191,444-457`).

**단 하나 어긋나는 자리**: 견적 발행의 **③ 미배선 사유**(`QUOTE_ISSUE_UNWIRED`)는 서버에서는 존재하지 않는 판정이다 — 그것은 프론트 배선의 사실이지 도메인 규칙이 아니다. 서버는 ①②④만 판정한다(§7.5).

### 7.2 문의 생성·삭제 — 계약에 존재하지 않는다 【범위 판정】

**코드로 재확인한 사실 — 네 겹이다**:

- `_shared/store.ts:3-6`: `항목을 만드는 것은 **고객**이고 관리자는 답변하고 종결할 뿐이다 — 그래서 화면에는 등록 폼이 없다(어댑터 계약이 요구하는 add 만 열어 둔다)`.
- `_shared/store.ts:315`: `고객 채널이 만든다 — 관리자 화면에는 이 문을 여는 버튼이 없다(머리말)`.
- `data-source.ts:4-5`: `문의를 만드는 것은 고객 채널이라 관리자 화면에는 생성 경로가 없다(add 는 어댑터 계약을 채우는 문일 뿐이다)`.
- **호출부 0건**: `productInquiryAdapter.create` · `.remove` 를 부르는 코드가 두 화면에 **없다**(grep 실측 2026-07-22). 목록이 `CrudListShell` 이 아니라 **`CrudReadListShell`** 인 것이 그 결과다 — 선택 체크박스·일괄 삭제·행 액션 열이 **어떤 역할에게도** 없다(`ProductInquiryListPage.tsx:8-10`).

**판정**: `POST /api/products/inquiries` · `DELETE /api/products/inquiries/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**다. BE-044 §7.6(클레임)·BE-026 §7.7(1:1 문의)이 같은 결로 판정한 것과 같다.

**삭제에 대한 추가 근거**: 문의는 **고객이 남긴 응대 기록**이고 `quoteId` 를 통해 견적(=돈이 걸린 산출물)과 이어져 있다. 지우면 그 견적이 어느 문의에서 나왔는지 설명할 수 없게 된다. **종결(`closed`)이 삭제를 대신한다** — 그리고 그것마저 답변이 나간 뒤에만 열린다(§7.3).

**부재의 표현이 약하다**: `create`/`remove` 는 공용 팩토리(`createStoreAdapter`) 때문에 **실제로 동작한다.** 실수로 호출하면 문의가 만들어지고 지워진다 — 부재가 코드로 강제되지 않는다(§7.13 #8).

### 7.3 무엇이 비가역인가 — 답변은 가역이고 종결은 비가역이다 【정합 판정】

**코드가 세 층위를 만든다**:

| 사실 | 가역성 | 근거 |
|---|---|---|
| **답변 본문** | **가역** — 종결 전이면 몇 번이든 고칠 수 있다 | `canAnswer(status) = status !== 'closed'`(`_shared/store.ts:106-108`) · 화면이 라벨을 '답변 작성'/'답변 수정'으로 바꾼다(`ProductInquiryDetailPage.tsx:335`) · 회귀 `inquiries.test.ts:97-107` |
| **최초 답변 시각** | **비가역** — 한 번 찍히면 재수정으로 바뀌지 않는다 | `_shared/store.ts:134` · 근거 `:122-125`(`오탈자를 고칠 때마다 갱신되면 응대 속도가 사후에 조작된다`) |
| **상태** | **비가역** — 되돌아가는 전이가 **하나도 없다** | `_shared/store.ts:26-28`(`되돌아가는 전이는 없다 — 답변한 문의를 '접수' 로 되돌리면 그 사이의 응대 시간이 사라진다`) · 네 전이 함수 어디에도 역방향 경로가 없다 |
| **종결** | **비가역이자 종착** | `closed` 는 `canAnswer`·`canIssueQuote` 를 동시에 닫는다(`:102,107`). 화면은 편집기 대신 '발송한 답변' + '종결된 문의라 답변을 수정할 수 없습니다.'를 그린다(`ProductInquiryDetailPage.tsx:349-353`) |
| **견적 발행** | **비가역** — `quoteId` 가 박히면 `quoteIssueBlock` ②가 재발행을 영원히 막는다 | `quote-issue.ts:138` · `_shared/store.ts:160` |

**판정**: 서버는 **역방향 전이를 열지 않는다.** `closed → *` · `answered → received` · `quote_issued → answering` 류는 전부 **422 `INVALID_STATUS_TRANSITION`** 이다. 종결을 되돌리는 실무 요구가 생기면 그것은 **새 계약**(재개 전이 + 그 사실의 이력)이지 기존 전이의 완화가 아니다.

**그런데 프론트에 확인 게이트가 없다**: 비가역 액션 셋(종결 · 견적 발행 · 최초 답변 저장) 중 어느 것도 `ConfirmDialog` 를 거치지 않는다(`ConfirmDialog` grep 히트 0건 — 유일한 다이얼로그는 이탈 가드의 `intent="discard"` 다). **한 번의 클릭이 되돌릴 수 없는 사실을 만든다**(NFR-073 §2 FEEDBACK-02 gap · §7.13 #1).

### 7.4 견적 발행은 한 트랜잭션이다 — 이 계약은 **발행 사실만 기록**한다 【범위 판정】

**소유 경계**:

| 사실 | 정본 | 이 계약의 역할 |
|---|---|---|
| 견적의 품목·단가·과세유형·유효기간·발송·수주 전환 | 견적 계약(FS-050 계열 · `pages/sales/quotes`) | **모른다.** `IssuedQuoteRef` 둘만 받는다 |
| 견적 채번 | 견적 계약 | 받은 `quoteNo` 를 토스트에 쓸 뿐이다(`:230`) |
| **어느 문의가 어느 견적을 낳았는가** | **이 계약** | `quoteId` 기입 + `status = 'quote_issued'` |
| 견적 → 문의 역참조 | 견적 계약(`quotes/types.ts` 의 `sources`) | 읽지 않는다 |

**멱등 판정 — 같은 문의로 견적을 두 번 발행할 수 있는가**: **없다. 멱등키는 `quoteId`(= 문의 id 로 교차 확인)이며 세 겹으로 막힌다.**

| 겹 | 위치 | 동작 |
|---|---|---|
| ① 호출부 가드 | `quoteIssueBlock` ②(`quote-issue.ts:138`) | 이미 발행된 후보가 섞이면 발행 자체를 막고 사유를 화면에 적는다 |
| ② 문의 쪽 전이 | `applyQuoteIssued`(`_shared/store.ts:160`) | `quoteId !== ''` 면 **원본을 그대로 반환**한다(던지지 않는다). 회귀 `inquiries.test.ts:439-442` |
| ③ 견적 저장소 | `issueQuoteFromSources`(`quotes/data-source.ts:148-151`) | `findQuoteBySource` 로 교차 확인해 기존 견적을 돌려준다. 회귀 `quote-issue.test.ts:96-104` |

**판정**: 서버는 이 세 겹을 **한 트랜잭션 안의 한 판정**으로 합치고, ②의 '조용한 통과' 대신 **409 `QUOTE_ALREADY_ISSUED`** 로 거절한다(심이 그것을 명시한다 — `quotes/data-source.ts:142-143`). 이유: 픽스처 ③은 이미 발행된 문의가 섞이면 **기존 견적을 돌려주고 나머지 문의는 견적을 얻지 못한다**(`quote-issue.test.ts:116-125` 가 그 사실을 고정한다) — 성공처럼 보이는 부분 실패다.

**다건 발행이 원자적이지 않다**: 목록의 `issue.mutationFn`(`ProductInquiryListPage.tsx:214-219`)이 견적을 먼저 만들고 **담긴 문의를 `for` 로 돌며 하나씩 `await update`** 한다. 세 번째에서 실패하면 앞의 둘은 `quoteId` 를 갖고 세 번째만 견적 없이 남으며, 견적은 이미 만들어져 있고 **롤백 경로가 없다.** 실패 토스트는 어느 것이 남았는지 말하지 않는다(`:230`).

**판정**: EP-04 가 이 루프를 **없앤다.** 문의 잠금 + 견적 생성 + 역링크 기입이 서버의 한 트랜잭션이고, 프론트는 요청 1건을 보내고 목록을 무효화한다(§6.1 '발행 루프 제거').

**권한 판정**: `status='quote_issued'` 로 옮기는 것은 문의 처리가 아니라 **거래처에 나갈 산출물을 만들고 견적번호를 채번하는 행위**다. 문의 update 권한만으로 그것이 가능하면 **견적 리소스의 create 권한이 우회된다.** 그래서 EP-04 와 EP-03 의 `quote_issued` 요청은 **문의 update 권한 AND 견적 create 권한**을 함께 요구하고, 후자가 없으면 **403 `QUOTE_ISSUE_FORBIDDEN`**(404 은닉 대상 아님 — 주체는 이미 문의의 존재를 안다). **프론트에는 이 분기가 없다** — `canUpdate` 하나가 네 버튼을 함께 지배한다(§7.13 #5). BE-051 §7.6 이 영업 문의에서 내린 것과 같은 판정이다.

### 7.5 미배선 seam 이 성공을 흉내 내지 않는다 【정합 판정】

이 화면이 지나는 이음매는 셋이고, **셋 다 '모른다'를 값으로 표현한다**.

| 조회·부수효과 | 미배선 시 | 판정 |
|---|---|---|
| **견적 발행기** `issueQuote`(`quote-issue.ts:153-156`) | `issuer === null` 이면 **`null` 을 돌려준다**(빈 참조를 지어내지 않는다 — `:145`). 그리고 그보다 먼저 `quoteIssueBlock` ④가 **`견적 발행을 사용할 수 없습니다. 관리자에게 문의하세요.` 라는 문장으로** 버튼을 비활성시키고 그 사유를 막대에 그대로 적는다(`ProductInquiryListPage.tsx:326-329`) | **충족.** 근거가 코드 주석에 있다(`quote-issue.ts:23-26` — `배선이 없을 때 조용히 아무 일도 하지 않으면 운영자는 '견적 발행' 을 누르고 아무 반응도 못 본 채 다시 누른다`). 회귀 `quote-issue.test.ts:86-92,127-130` |
| **잔여 문의 집계** `readInquiryBacklog('product')`(`inquiry-backlog.ts:51-53`) | `lookup === null` 이면 **`null`(모른다)** 이고, 메뉴 규칙이 그것을 **`archive`(남긴다)** 로 읽는다(`:121`) — **fail-open** | **충족.** 0 으로 떨어뜨리면 메뉴가 사라져 과거 문의가 통째로 접근 불가가 된다(`:10-13`). **지우는 쪽으로 실패하면 복구가 없다** |
| **결제 설정** `readPaymentSettings()`(`payment-settings.ts:196-198`) | 모듈 지역 상태라 언제나 값이 있다. 다만 `pgSellable` 이 `usePg && merchantId.trim() !== ''` 로 **fail-closed** 다(§7.6) | **충족(방향이 반대다)** — 판매 축은 닫는 쪽, 문의 축은 여는 쪽으로 실패한다 |

**판정**: 서버도 같은 규약을 따른다. **의존 서비스가 응답하지 않을 때 성공 응답을 만들지 않는다.**

- EP-04 의 견적 생성이 실패하면 **문의의 `quoteId`·`status` 를 찍지 않는다** — 견적 없는 '견적 발행' 상태를 만들지 않는다(EP-03 검증 6 이 그 상태를 애초에 거절하는 것과 같은 이유).
- 집계 엔드포인트가 생기더라도 **장애 시 0 을 내려보내지 않는다** — 메뉴가 사라지는 방향의 거짓이기 때문이다. 응답 없음/오류는 프론트에서 `null` 로 수렴해야 한다.

**조용한 거짓 성공이 이 도메인의 최악 실패 모드다**: 문의 화면에서 그것은 **'답변했다고 표시됐는데 고객은 아무것도 받지 못한 상태'** 와 **'견적을 발행했다고 표시됐는데 견적이 없는 상태'** 두 가지 모습으로 나타난다. 전자는 검증(EP-03 4)이, 후자는 트랜잭션(EP-04 5)이 막는다.

### 7.6 이 화면의 유입량은 결제 설정에 종속된다 — PG 축은 fail-closed 다 【경계 판정】

**사실**: `pgSellable(settings) = settings.usePg && settings.merchantId.trim() !== ''`(`payment-settings.ts:128-130`). 이것이 false 면 상품 CTA 가 '구매하기'에서 **'문의하기'** 로 바뀌고, 그 문의가 **`INQUIRY_PATH.product = '/products/inquiries'`**(`:100-103`) 로 들어온다 — 즉 **이 화면이다**(`checkoutCta` `:143-153`).

**방향**: **결제 축은 fail-closed 다.** `usePg` 를 켜 두고도 상점 ID(MID)가 공란이면 **판매 불가**로 수렴한다(`:120-122` — `규칙 자체도 애매하면 닫는 쪽으로 수렴한다(fail-closed) — 판단이 두 곳에 있어도 결론이 갈리지 않는다`). 그 반대편에서 **엔타이틀먼트 축은 fail-open**(매핑 없는 리소스는 `granted` — `route-entitlement.ts:10-12,23-29`)이고, **권한 축은 fail-closed** 다. 세 축의 실패 방향이 다르다는 사실이 EXC-21·EXC-22 의 근거다.

**판정 — 계약에 못박을 것 세 가지**:

1. **이 화면의 트래픽은 다른 화면의 설정이 만든다.** 결제 설정 저장(`PUT /api/settings/payment` — `payment-settings.ts:190-193`)이 이 컬렉션의 증가율을 지배한다. 서버는 그 결합을 **인지하되 강제하지 않는다** — 문의 접수 API 가 `pgSellable` 을 다시 판정하면 판매 방식의 정본이 둘이 된다.
2. **메뉴가 감춰져도 라우트와 API 는 살아 있어야 한다.** `resolveNavLeaf`(`nav-config.ts:314-324`)가 `hidden` 을 돌려주어도 `collectNavRoutes()` 는 그 필터를 지나지 않으며(`:327-336`, 근거 `:311-312` — `감추는 것과 없애는 것은 다른 결정이다`), 라우트는 `App.tsx:335-336` 에 그대로 있다. **서버가 '메뉴에 없으니 403' 을 내면 그 설계가 깨진다.**
3. **`total` 은 종결 포함 전체 건수다**(`inquiry-backlog.ts:20-25`). 미종결만 세면 전부 종결된 날 메뉴가 사라져 과거 문의가 접근 불가가 된다. 집계 계약이 생기면 이 정의를 그대로 쓴다.

### 7.7 동시성 — 두 운영자가 같은 문의에 답하면 **나중 저장이 이긴다** 【정합 판정】

**코드로 확인한 사실**:

- **낙관적 동시성 토큰이 없다.** `ProductInquiry` 에 `version`·`updatedAt` 필드가 없고, `update` 가 `If-Match` 를 보내지 않는다(grep **0건** 실측).
- **존재 기반 409 는 있다.** 공용 어댑터가 없는 id 의 `update` 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던진다(`crud.ts:256-258`). 유령 저장은 구조적으로 막힌다.
- **저장은 전체 치환이다.** `toProductInquiryInput(next)` 가 12필드를 통째로 보낸다.
- **화면에 409 해소 UI 가 없다.** `onError`(`ProductInquiryDetailPage.tsx:179-182`)에 `isConflict` 분기가 없어 409 는 `'저장하지 못했습니다…'` 배너로 떨어진다 — **재시도하면 또 409 인 실패에 재시도를 권한다.**

**판정: 동시 편집은 last-write-wins 다.** 두 운영자가 같은 문의에 각각 답변을 쓰면 **나중에 도착한 요청의 답변이 이긴다.** 앞선 답변은 흔적 없이 사라진다 — 처리 이력이 저장된 값의 파생값이라(§7.9) 덮인 답변의 기록도 함께 사라지기 때문이다.

**부분 완화 3가지**(이것을 '해결'로 읽지 말 것):
- **불법 전이는 막힌다.** 두 운영자가 각각 '종결'과 '답변 저장'을 누르면 나중 것이 저장된 상태로 재판정되어 422 로 거절된다(§7.1).
- **최초 답변 시각은 덮이지 않는다.** `answeredAt` 이 비어 있을 때만 채워진다(`:134`).
- **견적 발행은 세 겹의 멱등키가 막는다**(§7.4).

**남는 것은 답변 본문과 그것뿐이다 — 그리고 그것이 이 화면에서 가장 중요한 값이다.**

**판정(계약)**: EP-03 은 **`If-Match: <version>` 또는 `ETag`** 를 요구한다. 불일치는 **409 `CONFLICT`** 이며, `ProductInquiry` 에 `version`(또는 `updatedAt`)을 더한다. **서버 소유 필드 축소(§7.9 안 A)를 채택하면 다투는 필드가 `status`·`answer` 둘로 줄지만 토큰이 선택이 되지는 않는다** — 답변 본문 자체가 lost update 의 대상이기 때문이다.

**409 의 의미를 서버가 가른다**: 픽스처는 '존재한 적 없음'과 '먼저 삭제됨'을 구분할 정보가 없어 둘 다 409 로 던진다. **서버는 404(존재한 적 없음)와 409(동시성 위반)를 가른다** — 화면의 복구 수단이 다르기 때문이다('목록으로' vs '최신 다시 읽기').

### 7.8 개인정보 — 개별 문의는 404 로 은닉하고 마스킹은 서버가 한다 【보안 판정】

**문의 1건이 담는 것**(`_shared/store.ts:40-66`):

| 값 | 성격 |
|---|---|
| `customerName` | 문의자 **실명**(픽스처 '김서연'·'박지훈' — 마스킹되지 않은 원본이다) |
| `customerContact` | **연락처 원본** — 채널에 따라 휴대폰 번호(`010-2481-7735`) 또는 이메일(`jihoon.p@example.com`) |
| `message` | 고객이 쓴 **문의 원문** — 사이즈·결제 실패·재입고 요청 등 구매 의사와 사적 사정을 담는다 |
| `subject` · `productName` · `channel` · `createdAt` | 무엇을 언제 어디서 물었는가 |
| `id` | `PIQ-YYYYMMDD-NNN` — **날짜 + 일련번호**라 열거하면 그날의 문의 볼륨을 추정할 수 있다 |

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/products/inquiries` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 문의 리소스의 존재 자체가 개인정보다** → 상품 도메인 **읽기 권한이 없는** 주체에게는 **404 `INQUIRY_NOT_FOUND`** 로 은닉한다. BE-026 §7.6·BE-044 §7.5·BE-051 §7.1 과 같은 판정이며 근거도 같다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다. 다만 이 도메인은 `operator` 에게 쓰기를 열므로(§7.10) 그 403 은 상품 쓰기 권한 없는 그 밖의 역할과 **견적 create 권한이 없는 발행 요청**(§7.4)에만 발생한다.

**마스킹은 누가 하는가 — 서버다.** 이 화면에는 마스킹이 **한 줄도 없다**: 목록의 문의자 셀이 `item.customerName` 원본이고(`ProductInquiryListPage.tsx:248`) 상세의 연락처가 `inquiry.customerContact` 원본이다(`ProductInquiryDetailPage.tsx:402`). BE-044 §7.5 가 클레임에서 내린 판정이 여기서도 그대로다 — **원본을 내려보내고 프론트가 가리면 응답 본문에 평문이 남는다.** 회신이 실제로 필요한 자리(상세의 '문의자 정보' 카드)는 **별도 권한의 별도 필드**로 분리하고, 목록 응답에서는 **연락처를 아예 빼거나 마스킹된 값만** 내려보낸다(§7.11 과 한 배치다).

**비밀글(secret) 축은 이 코드에 없다.** `secret`·`isPrivate`·`visibility` 류 필드가 **0건**(grep 실측)이고, 화면에도 그런 표기가 없다. **판정: 계약에 넣지 않는다.** 스토어프론트에 '비밀글' 체크박스가 생기면 그것은 **접수 채널의 계약 변경**이고, 그때 이 계약은 ① `secret` 필드 ② 목록 응답에서의 본문·제목 가림 ③ 그 가림을 푸는 별도 권한 세 가지를 함께 받아야 한다. **지금 없는 것을 있는 것처럼 쓰지 않는다.**

### 7.9 서버 소유 필드를 요청에서 받지 않는다 — 파생값은 저장하지 않는다 【보안 판정】

**현재 클라이언트가 서버 소유 값을 바디에 실어 보낸다**: `toProductInquiryInput(inquiry)`(`_shared/store.ts:190-205`)가 `answeredAt`·`quoteId`·`status` 를 **그대로 복사**해 넣고, 화면이 그것을 `update.mutate` 의 `input` 으로 보낸다(`ProductInquiryDetailPage.tsx:171-172`).

**이것이 만드는 사고**:

1. **`answeredAt` 을 되돌려 보내면 응대 속도가 조작된다.** 이 값은 '얼마나 빨리 응대했는가'라는 사실이고 SLA 판정(`inquiry-backlog.ts:28-31` 의 `slaBreached`·`averageResponseHours`)의 유일한 근거다. 픽스처는 `applyAnswer` 가 저장값을 보므로 안전하지만, **서버가 요청 값을 신뢰하면 지연된 응대가 '당일 답변'이 된다.**
2. **`quoteId` 를 비워 보내면 재발행이 가능해진다.** 그것이 중복 발행을 막는 유일한 멱등키다(§7.4) — 한 문의가 견적 두 장을 갖게 된다.
3. **`quoteId` 를 임의 값으로 보내면 남의 견적을 가리키는 문의가 만들어진다.** 링크는 존재 확인 없이 경로만 만든다(`quote-issue.ts:81-83`).
4. **`createdAt` 을 조작하면 경과가 조작된다** — '3일째 미답변'이 '오늘 접수'가 된다.

**판정**: `answeredAt` · `quoteId` · `createdAt` · `productId` · `productName` · `customerName` · `customerContact` · `channel` · `subject` · `message` 는 **전부 서버가 소유한다.** 요청 바디의 이 값들은 **무시한다** — 파싱조차 하지 않는다.

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `PUT /api/products/inquiries/:id` 는 **관리자가 실제로 바꾸는 둘만** 받는다: `{ status, answer }`. 답변 시각·견적 id 는 서버가 부수효과로 찍는다 | 위조가 구조적으로 불가능하다. `toProductInquiryInput` 이 통째로 사라진다. **어댑터 시그니처는 그대로다**(`Input` 타입만 좁아진다) — 화면은 `commit` 호출부 넷만 바뀐다 |
| **B (차선)** | PUT 을 유지하되 서버가 불변·서버 소유 필드를 **무시** | 어댑터를 덜 흔든다. 그러나 `ProductInquiryInput` 이 쓰이지 않는 10필드를 계속 실어 보내는 기형이 남고, '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨진다 |

**답변 시각은 서버가 찍는다**: 현재 `new Date().toISOString()`(`ProductInquiryDetailPage.tsx:198`) — **브라우저 시계**다. `applyAnswer` 가 `at` 을 인자로 받는 것은 테스트·스토리가 시계를 고정하기 위한 것이고(`_shared/store.ts:125`), 운영에서는 그 값이 그대로 감사 기록이 된다. 두 운영자의 시계가 다르면 응대 속도가 갈린다.

**파생값을 계약에 넣지 않는다**: `unansweredCount` · `countInquiriesByStatus` · `elapsedLabel`/`elapsedTone` · `inquiryHistory` 는 **전부 저장된 값에서 매번 만들어진다**(`types.ts`). 저장하면 어긋난다 — 답변을 고치는 순간 이력의 답변 칸이 본문과 갈라지고(`types.ts:203-210` 이 정확히 그 이유를 적는다), 경과를 저장하면 날짜가 바뀔 때마다 전량 갱신이 필요해지며 그 갱신이 절반만 성공하면 목록의 절반이 거짓말을 한다. **서버도 같은 판단을 따른다 — 응답에 `elapsed`·`history` 를 넣지 않는다.**

**단 하나 서버가 넘겨야 할 것**: 경과의 **기준일**이다. 지금은 `TODAY = '2026-07-21'` 하드코딩(목록 `:81` · 상세 `:68`)이라 **날짜가 지나도 '3일째 미답변'이 늘지 않는다.** 주석이 그 사실을 인정한다(`:78-80` — `백엔드가 붙으면 서버가 내려주는 기준 시각으로 바뀐다`). 판정: 목록·상세 응답 헤더 또는 본문에 **서버 기준 시각**을 실어 보낸다(§7.13 #6).

### 7.10 `operator` 에게 쓰기를 연다 — 단 견적 발행은 예외

BE-010(FAQ)은 `operator` 를 조회 전용으로 두고 모든 쓰기를 403 으로 막는다. **이 도메인은 반대이며, BE-026 §7.8 · BE-051 §7.6 과 같은 결이다.**

**근거**: 상품 문의 응대는 **운영자의 본업**이다. `operator` 가 답변 착수·답변 작성·종결을 할 수 없다면 이 화면을 쓸 사람이 `admin` 뿐이고, 그러면 역할 구분이 무의미해진다. 화면도 그 전제 위에 서 있다 — 처리 이력의 관리자 작성자가 단일 인물이 아니라 `'관리자'` 라는 역할명이다(`types.ts:201`).

**단 하나 예외 — 견적 발행**: §7.4 의 권한 판정대로 `status='quote_issued'` 저장(EP-03)과 EP-04 는 **견적 `create` 권한을 함께 요구한다.** 견적번호를 채번하고 거래처에 나갈 산출물을 만드는 행위이기 때문이다.

**결론**: EP-01 · EP-02 · EP-03(발행 제외) 은 `admin` + `operator`. EP-04 와 발행 전이는 `admin` + **견적 create 권한을 가진** `operator`. 상품 도메인 권한이 아예 없는 역할만 전면 차단한다.

### 7.11 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:

1. **페이징이 없다.** `fetchAll(signal)` 이 파라미터를 받지 않고 전량을 반환하며, 프론트가 상태 필터·검색을 전부 클라이언트에서 한다(`ProductInquiryListPage.tsx:177-180`). 문의는 **매일 쌓이는 무한 증가 컬렉션**이고, 특히 **PG 를 끈 운영에서는 그것이 유일한 유입 경로다**(§7.6).
2. **목록이 상세 전문을 담는다.** `ProductInquiry` 타입 하나를 목록·상세가 공유해 목록 응답에 **`customerContact`(연락처 원본)** 와 **`message`(고객 원문)** 가 실린다 — **목록 화면이 그리는 것은 문의번호·상품명·문의자·제목·채널·상태·접수일·경과뿐**이다(`:238-276`). §7.8 의 취지와 정면으로 충돌한다.

**판정**: **`ProductInquirySummary` / `ProductInquiry` 를 분리**하고, EP-01 에 `status`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ProductInquirySummary` 는 `customerContact`·`message` 를 빼고 `answer` 를 **`answered: boolean`** 으로 축약한다(목록은 답변 본문을 쓰지 않는다).

**단 건수 배지는 페이지가 아니라 전체에서 나와야 한다**: `countInquiriesByStatus` 와 `unansweredCount` 는 **필터 이전 전체 집합**을 센다(`types.ts:97,113`) — 필터가 자기 배지를 흔들면 비교가 불가능하기 때문이다. 페이징을 도입하면 이 값은 **응답의 별도 필드(`counts`·`unanswered`)로 서버가 내려보내야** 한다. 페이지 안의 행만 세면 배지가 전부 거짓이 된다.

**이관**: 이 변경은 프론트 대공사다 — `filterInquiriesByStatus`/`searchProductInquiries` 가 서버로 올라가고, 페이지네이션 UI(quality-bar IA-04 P0)와 순번 오프셋이 함께 붙어야 한다. **URL list state 는 이미 있다**(`useListState` 가 `page`·`clampPage` 를 이미 갖는다 — `useListState.ts:74,217`). 그전까지 현 계약(전량)을 유지한다 — 픽스처 5건에서는 드러나지 않는다.

### 7.12 공통 어휘 층을 이 모듈이 쓰지 않는다 — 세 문의 도메인이 합산되지 않는다 【경계 판정】

**코드로 확인한 사실**: 공통 층에 문의 상태 어휘 모듈이 **실재한다** — `shared/domain/inquiry-status.ts` 의 `CommonInquiryStatus`(`received` · `assigned` · `in_progress` · `answered` · `closed`)와 `COMMON_INQUIRY_STATUS_ORDER` · `withExtraInquiryStatuses`. 그 파일은 자기가 존재하는 이유를 적는다(`:4-10` — `같은 단계가 두 곳에서 다른 집합이 되고 … 표현할 낱말 자체가 없었다`).

**그런데 이 모듈은 그것을 import 하지 않는다.** 소비자는 `pages/sales/inquiries` 와 `pages/support` 둘뿐이다(grep 실측 — `inquiry-status` 히트 파일 5개 중 소비자는 `sales/inquiries/types.ts` · `sales/inquiries/InquiryDetailPage.tsx` · `support/_shared/domain.ts`). 상품 문의는 `_shared/store.ts:35` 에 **자기 유니온을 따로 선언**한다: `received | answering | quote_issued | answered | closed` — 공통 다섯 중 `assigned`·`in_progress` 가 없고 `answering`·`quote_issued` 가 더 있다.

**판정**: 이것은 결함이 아니라 **의도된 분기**다. 코드가 그 판단을 적는다(`_shared/store.ts:30-33` — `어휘는 빌리고 **문구는 각자 갖는다**`). 다만 **어휘를 빌린 목적(합산 가능성)이 아직 실현되지 않았다**:

- `quote_issued` 는 세 도메인이 같은 낱말로 부르지만 **세 `STATUS_META` 는 별개 상수**다.
- 세 목록의 '견적 발행' 건수를 한 지표로 합산하는 층이 **없다**. `readQuoteFunnel`(`inquiry-backlog.ts:89-91`)은 **견적 쪽에서** 세지 문의 상태를 보지 않는다.

**계약에 못박을 것**: 서버가 문의 상태를 **도메인별 별개 유니온**으로 취급한다. 세 도메인을 합산하는 지표가 필요해지면 그것은 **집계 계약**의 일이며(§7.13 #7), 그때 `quote_issued` 라는 공통 낱말이 유일한 접합점이 된다. **상태 유니온을 서버에서 하나로 합치면 안 된다** — `answering` 없는 영업 문의와 `assigned` 없는 상품 문의가 서로의 빈칸을 갖게 된다.

### 7.13 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **비가역 액션에 확인 게이트가 없다**(§7.3) — 종결·견적 발행·최초 답변이 한 번의 클릭으로 끝난다. `ConfirmDialog` 가 이 화면에 0건이다(quality-bar FEEDBACK-02 P0) | UI 기획 · 프론트 구현 (최우선) |
| 2 | **EP-03·EP-04 에 멱등키가 전달되지 않는다** — 자리(`crud.ts:243,354-355`)와 원장(`:193`)이 있는데 **호출부가 비어 있다.** `submitLockRef` 도 없다(quality-bar EXC-08 P0). 견적 발행은 세 겹이 막지만 답변·상태 저장은 두 번 나갈 수 있다 | UI 기획 · 백엔드 명세 |
| 3 | **409 해소 UI 부재 + 낙관적 동시성 토큰 부재**(§7.7) — 어댑터가 409 를 던지는데 화면 `onError` 에 `isConflict` 분기가 없고 `If-Match`/`version` 도 없어 **답변 본문이 last-write-wins** 다(quality-bar EXC-04 P0) | UI 기획 · 백엔드 명세 |
| 4 | **서버 소유 필드를 요청 바디에서 제거**(§7.9 안 A) — 특히 `answeredAt`·`quoteId`. **응대 속도와 견적 멱등의 무결성이 여기 걸린다** | **백엔드 명세 (최우선)** · UI 기획 |
| 5 | **견적 발행에 별도 권한 분기가 프론트에 없다**(§7.4) — `canUpdate` 하나가 답변과 발행을 함께 지배한다. 서버가 403 을 내면 화면은 일반 배너로 뭉갠다 | UI 기획 · 백엔드 명세 |
| 6 | **경과 기준일이 하드코딩이다**(§7.9) — `TODAY = '2026-07-21'`(목록 `:81` · 상세 `:68`). 서버 기준 시각을 응답에 실어야 한다 | 백엔드 명세 · 프론트 구현 |
| 7 | **잔여 문의 집계에 심이 없다**(§6) — `readInquiryBacklog` 는 동기 seam 이고 구현은 `wiring.ts:199-217` 이 `listProductInquiries()` 를 접어 만든다. 서버에서는 집계 엔드포인트여야 하나 **TODO(backend) 가 없어 이 문서가 엔드포인트를 만들지 않았다.** 정의(§7.6 3 — `total` 은 종결 포함)는 이미 고정돼 있다 | **백엔드 명세 (신설 판단 필요)** · 아키텍처 |
| 8 | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다**(§7.2) — 부재가 코드로 강제되지 않는다 | UI 기획 쪽 변경 요청 |
| 9 | **다건 발행이 원자적이지 않다**(§7.4) — 프론트의 `for await` 루프가 EP-04 한 번으로 대체돼야 한다 | 백엔드 명세 · UI 기획 |
| 10 | **개인정보 마스킹·목록 응답 축소**(§7.8 · §7.11) — 연락처 원본이 목록 응답에까지 실린다. `ProductInquirySummary` 분리와 한 배치다 | 백엔드 명세 |
| 11 | 목록 페이징 + 건수 배지의 서버 산출(§7.11) — quality-bar IA-04 P0 와 한 배치로 | 백엔드 명세 · UI 기획 |
| 12 | **견적 역링크가 끊어질 수 있다** — 견적이 삭제돼도 문의의 `quoteId` 가 남아 링크가 404 로 가고, 동시에 `quoteIssueBlock` ②가 **재발행도 막는다.** 견적을 잃은 문의는 영원히 견적을 가질 수 없다. 견적 삭제가 참조 문의를 검사해야 한다 — **견적 계약과 함께 봐야 한다** | **백엔드 명세 (연동)** |
| 13 | **답변 시각이 클라이언트 시계다**(§7.9) — 서버가 찍어야 한다 | 백엔드 명세 |
| 14 | `productName` 이 비정규화 스냅숏이라(`_shared/store.ts:44`) 상품명이 바뀌어도 과거 문의는 옛 이름을 보인다. **의도(접수 시점 기록)인지 미구현인지 확정이 필요하다** | 아키텍처 (도메인) · 백엔드 명세 |
| 15 | 400/422 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다(quality-bar EXC-07 P1) — `useCrudForm` 미사용이라 `setError` 경로가 없다 | UI 기획 |
| 16 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 401 리다이렉트가 미저장 답변을 버린다(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | UI 기획 · 프론트 구현 |
| 17 | **상품 문의와 프로그램 문의가 사실상 같은 계약을 두 벌 갖는다**(BE-076). 실제 차이는 유형 축 · SLA 임계 · 낱말 · 엔타이틀먼트 매핑 넷뿐이다. **서버에서 한 리소스로 합칠지 두 리소스로 둘지 판단이 선행돼야 한다** | **아키텍처 (선행 판단)** |

## 8. 자기 점검

- [x] FS-073 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 4건(EP-01·02·03·04) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**(등록·삭제는 §7.2 에서 '계약 없음'으로 판정, **잔여 문의 집계는 심이 없어 §6 에 동기 seam 으로만 적고 §7.13 #7 로 이관**했다)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 에 사유 (4행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한 고유 차이 2건**(`operator` 쓰기 허용 · **발행은 견적 create 권한 추가**)·**타임아웃(발행 10초)**·**엔타이틀먼트 모듈 소속(`commerce.products`)** 만 근거와 함께 기술
- [x] **전이 가드 표를 판정 순서 그대로 들어 올리고 거절 사유 문자열을 그대로 적었다**(§3). 화면의 존재 조건과 저장의 거절이 **같은 술어**를 읽는지 코드로 확인해 §7.1 에 표로 남겼다 — 네 동작 전부 일치
- [x] **생성·삭제를 '범위 밖'으로 판정**하고 코드 네 겹(주석 3곳 · 호출부 0건 · 읽기 전용 껍데기)으로 근거를 댔다(§7.2)
- [x] 멱등성 판정 — 조회 GET 멱등 / **견적 발행의 멱등키를 `quoteId`(문의 id 교차 확인)로 이름 지어 지목**하고 세 겹의 위치를 표로 적었다(§7.4). **답변·상태 저장에는 멱등키가 없다**는 사실을 §7.7 · §7.13 #2 에 정직하게 남겼다
- [x] **미배선 seam 3건을 `조회·부수효과 | 미배선 시 | 판정` 표로 정리**하고 조용한 거짓 성공 금지 규약을 이 도메인의 두 실패 모드로 번역했다(§7.5)
- [x] **PG 축과의 연결을 【경계 판정】으로 남겼다**(§7.6) — `INQUIRY_PATH` 로 유입되는 사실, 결제 축이 **fail-closed** 인 방향, 엔타이틀먼트 fail-open·권한 fail-closed 와의 대비
- [x] **동시성을 last-write-wins 로 단정**하고(토큰 grep 0건) `crud.ts:256-258` 의 존재 기반 409 를 함께 적었다(§7.7)
- [x] 보안 판정 3건 이상 — **403 vs 404 은닉 + 마스킹 주체 + 비밀글 축 부재(§7.8)** · **서버 소유 필드 위조(§7.9)** · 정합 판정(§7.1 전이 · §7.3 비가역 · §7.4 발행 트랜잭션 · §7.5 미배선 · §7.7 동시성) · 경계 판정(§7.6 PG 축 · §7.12 공통 어휘)
- [x] **확인하지 못한 것을 쓰지 않았다** — 비밀글 축·집계 엔드포인트·문의 재분류는 코드에 없어 '없다'고 쓰고 미결로 남겼다. 견적의 내부 계약은 이 문서가 정하지 않는다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
