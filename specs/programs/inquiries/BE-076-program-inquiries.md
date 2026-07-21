---
id: BE-076
title: "프로그램 문의 백엔드 기능 명세"
functionalSpec: FS-076
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# BE-076. 프로그램 문의 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-076 프로그램 문의 (`/programs/inquiries` · `/programs/inquiries/:id`) |
| 범위 | 문의 목록 조회, 문의 상세 조회, **답변·상태 전이 저장**(답변 작성/수정 · 답변 착수 · 종결 · 견적 발행 결과 기록), **문의 → 견적 발행**(발행 사실의 기록까지) |
| **범위 밖** | **문의 등록** — 문의를 만드는 것은 **후원자**다. 관리자가 문의를 만드는 API 는 이 계약에 존재하지 않는다(§7.2). **문의 삭제** — 화면에 진입점이 없다(§7.2). **문의 유형(topic) 재분류** — 접수 시 값이 굳고 관리자가 바꿀 수단이 코드에 없다. 이 계약은 그 부재를 **미결로 남긴다**(§7.3). **견적의 정본**(품목·단가·과세유형·유효기간·발송·수주 전환) — 이 계약은 **발행 사실만 기록**한다(§7.5). **프로그램 CRUD·펀딩 진행·리워드·후원 결제** — FS-074 계열 소관. 이 계약은 `programName` 스냅숏만 들고 프로그램을 조회하지 않는다. **결제(PG) 설정** — 이 화면의 유입량을 지배하지만 정본은 설정 계약이다(§7.7). **잔여 문의 집계** — 사이드바·대시보드·통계가 읽는 값이며 심이 없어 엔드포인트를 만들지 않는다(§6 · §7.14 #7) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601 **UTC(Z)** 로 저장하고 날짜 계산은 **KST 달력일** 기준이다(`_shared/store.ts:16-18`) |
| 프론트 어댑터 | `apps/admin/src/pages/programs/inquiries/data-source.ts` (`programInquiryAdapter` = 공용 `createStoreAdapter`, `scope = 'program-inquiries'`) + 페이지 경계를 넘는 이음매 `shared/domain/quote-issue.ts` |
| 도메인 타입 | `apps/admin/src/pages/programs/inquiries/_shared/store.ts`(문의 · **유형(topic)** · 전이 술어 · 전이 함수 · 견적 발행 매핑). 견적 쪽 계약 타입은 **공통 층에서 온다**(`shared/domain/quote-issue.ts`) |
| 검증 정본 | **답변 본문은 zod 다** — `programInquiryAnswerSchema`(`validation.ts:11-18`), 화면은 `programAnswerError`(`:24-28`)만 부른다. **상태 전이는 순수 술어 4개**(`canAnswerProgramInquiry` · `canCloseProgramInquiry` · `canBeginAnsweringProgramInquiry` · `canIssueProgramQuote` — `_shared/store.ts:104-121`)이고 전이 함수가 같은 술어로 **던진다**(`:135,148,154-156,166`). **견적 발행 가드는 공통 층**(`quoteIssueBlock` — `quote-issue.ts:136-142`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다. 아래는 프로그램 문의 고유 차이만 기술한다.

> **상품 문의(BE-073)와의 관계**: 두 계약은 전이 표·발행 가드·저장 형태가 같다. **다른 것은 넷이며 이 문서는 그 넷을 계약으로 만든다**: ① **유형(topic) 축**이 있고 그것이 처리 담당을 가르는데 **바꿀 수단이 없다**(§7.3) ② **SLA 임계가 하루 짧다**(`OVERDUE_DAYS = 2`) — 펀딩은 마감이 있는 판매다(§7.4) ③ **엔타이틀먼트 매핑이 없다** — 이 라우트는 어떤 모듈에도 속하지 않아 **언제나 granted** 다(§7.8, 상품 문의는 `commerce.products` 소속) ④ 낱말과 채널(`PGQ-` · '프로그램 페이지' · '후원자' · `channel: 'program'`).

### 1.1 코드 대조 근거표

| 사실 | 근거 (file:line) |
|---|---|
| 심 1건 — 목록·상세·저장 | `data-source.ts:23` `// TODO(backend): GET /api/programs/inquiries · GET/PUT /api/programs/inquiries/:id` |
| 심이 **트랜잭션과 409 를 명시한다** | `data-source.ts:24-25` `답변 저장은 본문·답변시각·상태를 한 트랜잭션으로 옮긴다(applyProgramAnswer 와 같은 규칙). · 종결은 답변이 나간 문의에만 허용하고, 위반은 409 로 되돌린다.` |
| 심 1건 — 견적 발행(다른 페이지 소유) | `pages/sales/quotes/data-source.ts:142-143` `// TODO(backend): POST /api/sales/quotes/issue — 서버가 문의 잠금 + 견적 생성 + 역링크 설정을 한 트랜잭션으로 처리하고, 이미 발행된 문의가 섞여 있으면 409 로 거절한다.` |
| 등록·삭제 심 **없음** — 의도된 부재 | `_shared/store.ts:3-5`(`항목을 만드는 것은 **후원자**이고 관리자는 답변하고 종결할 뿐이다 — 그래서 화면에는 등록 폼이 없다`) · `:329`(`후원자 채널이 만든다 — 관리자 화면에는 이 문을 여는 버튼이 없다`) · `data-source.ts:4-5` · `create`/`remove` 호출부 **0건**(grep 실측 2026-07-22) |
| **유형(topic) 축이 이 도메인에만 있다** | `_shared/store.ts:40-45,57`(`ProgramInquiryTopic = 'reward' \| 'delivery' \| 'refund' \| 'payment' \| 'etc'`) · 근거 `types.ts:63-66`(`처리하는 사람이 다르기 때문이다 — 리워드·배송은 창작자 확인이 필요하고, 환불·결제는 운영이 바로 답할 수 있다`) · 상품 문의 모듈에 `topic` **0건** |
| **유형을 바꿀 수단이 없다** | `ProgramInquiryInput` 에 `topic` 이 있으나(`_shared/store.ts:205`) 두 화면 어디에도 편집 컨트롤이 없다 — 상세는 `dd` 로 **표시만** 한다(`ProgramInquiryDetailPage.tsx:412-413`) |
| **SLA 임계가 상품보다 하루 짧다** | `types.ts:214`(`OVERDUE_DAYS = 2`) ↔ `products/inquiries/types.ts:145`(`3`) · 근거 `types.ts:208-213` · 회귀 `inquiries.test.ts:397-406` |
| **이 라우트는 어떤 엔타이틀먼트 모듈에도 속하지 않는다** | `shared/entitlements/module-resources.ts:29-91` 전체에 `/programs` **0건** → `entitlementKeyForResource` 가 `null` → `entitlementStateForResource` 가 **`granted`**(`route-entitlement.ts:23-29`) |
| 전이 술어가 **화면과 저장소에서 같다** | 정본 `_shared/store.ts:80-83` · 화면 소비 `ProgramInquiryDetailPage.tsx:374,379,385,390` · 저장 소비 `_shared/store.ts:135,148,154-156,166` · 회귀 `inquiries.test.ts:145-165,187-192` |
| 답변·답변시각·상태가 **한 함수에서만** 움직인다 | `_shared/store.ts:12-14,130-144` · 회귀 `inquiries.test.ts:81-118` |
| **최초 답변 시각은 불변** | `_shared/store.ts:141` · 근거 `:126-127`(`후원자에게 한 약속이 언제 나갔는지는 나중에 고쳐 쓸 수 없는 사실이다`) · 회귀 `inquiries.test.ts:101-110` |
| 견적 발행 멱등키는 **`quoteId`** | `_shared/store.ts:67-73,165` · 공통 층 `quote-issue.ts:44-45,93` · 저장소 교차 확인 `quotes/data-source.ts:148-151` · 회귀 `inquiries.test.ts:487-491` · `quote-issue.test.ts:95-136` |
| 발행 가드가 **미배선을 문장으로 드러낸다** | `quote-issue.ts:23-26,136-142`(`QUOTE_ISSUE_UNWIRED`) · 회귀 `quote-issue.test.ts:86-92` |
| 처리 이력이 **저장된 사실의 파생값**이다 | `types.ts:272-277,278-336` — 별도 이력 테이블이 없다. **접수 문구가 채널과 유형을 함께 말한다**(`:286`, 회귀 `inquiries.test.ts:417-423`) |
| 유령 저장·409 는 공용 어댑터가 막는다 | `shared/crud/crud.ts:256-258` |
| 404 변환은 이미 되어 있다 | `crud.ts:217-219` · 소비 `ProgramInquiryDetailPage.tsx:240-263` |
| 멱등키 원장이 어댑터에 있으나 **호출부가 키를 넘기지 않는다** | `crud.ts:67-77,243,354-355`(자리) ↔ `ProgramInquiryDetailPage.tsx:176-177` · `ProgramInquiryListPage.tsx:220-223` (`idempotencyKey` grep **0건**) |
| 낙관적 동시성 토큰이 **없다** | `version`·`updatedAt`·`If-Match` grep **0건**(실측 2026-07-22) |
| 이 화면의 유입은 **결제 설정에 종속된다** | `shared/commerce/payment-settings.ts:100-103`(`INQUIRY_PATH.program = '/programs/inquiries'`) · `:109-112`(후원하기 ↔ 문의하기) · `:128-130`(`pgSellable`) |
| 잔여 집계의 대상 키가 **프로그램 id 다** | `wiring.ts:209-216`(`targetId: inquiry.programId`) ↔ 상품 문의는 `productId`(`:199-206`) |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = 조회 계열(목록·상세) + **답변·상태 전이 저장**(EP-03) — 후원자 응대는 운영자의 본업이므로 쓰기를 연다(§7.10). **단 견적 발행(EP-04)과 `status='quote_issued'` 저장은 견적 `create` 권한을 함께 요구한다**(§7.5). 프로그램 도메인 읽기 권한 없는 관리자 → 컬렉션 403 / **개별 문의 404 은닉**(§7.9).
- **CSRF**: 쓰기(PUT · POST)에 `X-CSRF-Token`.
- **타임아웃**: 조회 5초 → 504. 답변 저장 5초 → 504. **견적 발행은 견적 생성 + 문의 다건 잠금이 한 트랜잭션이라 10초 → 504**(§7.5).
- **엔타이틀먼트**: **이 리소스는 어떤 모듈에도 매핑되지 않는다**(`module-resources.ts` 에 `/programs` 0건). 따라서 `entitlementStateForResource` 가 **언제나 `granted`** 를 돌려주며(`route-entitlement.ts:23-29`) 플랜으로 잠기지 않는다. **이것이 상품 문의(BE-073 — `commerce.products` 소속)와 갈리는 지점이다**(§7.8). 어느 쪽이든 이 계약의 응답 코드는 아니다 — 서버는 권한(403/404)만 말한다.
- **프론트 권한 게이팅은 보안 경계가 아니다** — 이 화면은 `useRouteWritePermissions` 를 실제로 배선했지만(목록 `ProgramInquiryListPage.tsx:146` · 상세 `ProgramInquiryDetailPage.tsx:131`) 그 가드는 UX 이며 위조된 로컬 권한 스토어로 우회된다.

## 3. 데이터 계약 (`_shared/store.ts` · `shared/domain/quote-issue.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `ProgramInquiry` | `id` · `programId` · `programName`(스냅숏) · `customerName` · `customerContact` · `channel` · **`topic`** · `subject` · `message` · `status` · `createdAt`(ISO UTC) · `answeredAt`(ISO 또는 `''`) · `answer` · `quoteId` | **`id` 가 곧 문의번호다** — `PGQ-YYYYMMDD-NNN`(`_shared/store.ts:16-18,310-315`, 회귀 `inquiries.test.ts:464-470`). **상품 문의(`PIQ-`)와 접두사가 다르다** — 두 컬렉션의 번호가 섞이지 않는다. **목록과 상세가 같은 타입이다**(§7.11) |
| `ProgramInquiryInput` | `Omit<ProgramInquiry, 'id'>` — **13필드**(상품 문의보다 `topic` 하나 많다) | 저장 입력. **전체 치환**이며 불변 필드와 **서버 소유 필드(`answeredAt`·`quoteId`)까지 포함한다**(§7.6) |
| `ProgramInquiryStatus` | `received` \| `answering` \| `quote_issued` \| `answered` \| `closed` | **5종.** 되돌아가는 전이가 없다(`:25-27`). 영업 문의(7종)와 값 집합이 다르고 `quote_issued` 라는 낱말만 빌렸다(`:29-32` — `같은 사건이 **세 이름**을 갖고, 세 목록의 '견적 발행' 이 영원히 합쳐지지 않는다`) |
| **`ProgramInquiryTopic`** | `reward` \| `delivery` \| `refund` \| `payment` \| `etc` | **이 도메인에만 있는 축이다.** 존재 이유가 코드에 있다(`:40-44` · `types.ts:63-66`): 프로그램은 **아직 만들어지지 않은 것에 돈을 먼저 거는 일**이라 질문이 리워드 구성·배송 예정·환불 조건에 몰리고, **처리하는 사람이 다르다.** **접수 후 불변이며 바꿀 수단이 없다**(§7.3) |
| `ProgramInquiryChannel` | `storefront` \| `app` \| `phone` \| `email` \| `kakao` | `storefront` = **PG 를 끈 프로그램 페이지의 '문의하기' 버튼**(`:37`). 표시명이 '프로그램 페이지'다(`types.ts:99`, 상품은 '상품 페이지') |
| `QuoteIssueSource`(공통 층) | `id`(**멱등키**) · `no` · `channel`(**`'program'`**) · `accountLabel` · `customerName` · `itemName` · `body` | 프로그램 문의의 매핑은 `toProgramQuoteIssueSource`(`_shared/store.ts:176-186`): 거래처 라벨·문의자 = `customerName`(**개인 후원자라 회사가 없다** — `:173`), **품목명 = `programName`**. **유형(topic)은 넘기지 않는다** — 견적은 그 축을 모른다(§7.3) |
| `QuoteIssueCandidate`(공통 층) | `id` · `quoteId` · `issuable` | `issuable` 판정은 이 모듈이 한다(`toProgramQuoteIssueCandidate` — `:189-195`) |
| `IssuedQuoteRef`(공통 층) | `id` · `quoteNo` | 견적의 나머지를 문의가 알지 못하게 한 최소 참조 |
| 상수 | `PROGRAM_INQUIRY_ANSWER_MAX = 1000`(`_shared/store.ts:78`) | 답변 본문 상한 |

**처리 상태 (`STATUS_META` — 표시 · `types.ts:31-38`)** — 값·라벨·톤이 상품 문의와 같다. `received`=warning · `answering`=info · `quote_issued`=info · `answered`=success · `closed`=neutral. **미답변의 단일 정의는 `isProgramInquiryUnanswered`**(`_shared/store.ts:96-98`) = `received` 또는 `answering`이며, **견적을 발행한 문의는 미답변이 아니다**(`:94` — 견적서가 나갔다면 그것이 응답이다. 회귀 `inquiries.test.ts:504-506`).

**문의 유형 (`TOPIC_META` — 표시 · `types.ts:67-73`, 회귀 `inquiries.test.ts:219-229`)**

| 값 | 라벨 | 톤 | 누가 답하는가 |
|---|---|---|---|
| `reward` | 리워드 | info | **창작자 확인 필요** |
| `delivery` | 배송 | info | **창작자 확인 필요** |
| `refund` | 환불 | **warning** | 운영이 바로 답한다. **돈이 걸린 유형이라 눈에 띄는 색을 받는다** |
| `payment` | 결제 | **warning** | 운영이 바로 답한다. **PG 를 끈 지금 특히 자주 들어온다**(`_shared/store.ts:43-44`) |
| `etc` | 기타 | neutral | — |

**전이 규칙 — 판정 순서 그대로 (순수 · `_shared/store.ts:130-168`, 회귀 `inquiries.test.ts:81-165,187-192,479-502`)**

| 전이 | 판정 순서 | 조건 | 거절 사유 |
|---|---|---|---|
| **답변 저장** `applyProgramAnswer` | ① | `status === 'closed'`(= `!canAnswerProgramInquiry`) | `종결된 문의는 답변을 수정할 수 없습니다.` |
| | ② | `answer.trim() === ''` | `답변 내용을 입력하세요.` |
| | ③ | 통과 | `answer = trim(body)` · `answeredAt` 은 **비어 있을 때만** `at` · `status = 'answered'` |
| **답변 착수** `applyProgramBeginAnswering` | ① | `status !== 'received'` | `접수 상태의 문의만 답변 착수로 바꿀 수 있습니다.` |
| | ② | 통과 | `status = 'answering'` |
| **종결** `applyProgramClose` | ① | `status !== 'answered'` | `답변하지 않은 문의는 종결할 수 없습니다.` |
| | ② | 통과 | `status = 'closed'` |
| **견적 발행 기록** `applyProgramQuoteIssued` | ① | `quoteId !== ''` | **거절이 아니다 — 원본을 그대로 돌려준다**(멱등, `:165`) |
| | ② | `status === 'closed'` | `종결된 문의는 견적을 발행할 수 없습니다.` |
| | ③ | 통과 | `quoteId` 부여 · `status = 'quote_issued'` |

> **거절 사유 문자열은 상품 문의와 글자까지 같지만 상수는 별개다** — `PROGRAM_ANSWER_ON_CLOSED_ERROR` 외 4개(`_shared/store.ts:85-89`). 서버가 문구를 한 벌로 합치면 두 도메인의 문구가 함께 흔들린다(`:29-32` 의 '문구는 각자 갖는다'와 같은 판단).

**견적 발행 가드 — 판정 순서 그대로 (공통 층 순수 · `quote-issue.ts:136-142`, 회귀 `quote-issue.test.ts:58-93`)**

| 판정 순서 | 조건 | 거절 사유 |
|---|---|---|
| ① | `candidates.length === 0` | `견적을 발행할 문의를 한 건 이상 선택하세요.` |
| ② | 하나라도 `quoteId !== ''` | `이미 견적이 발행된 문의가 있습니다. 발행된 견적을 여세요.` |
| ③ | 하나라도 `issuable === false`(= 종결) | `종결된 문의는 견적을 발행할 수 없습니다.` |
| ④ | 발행기 **미배선** | `견적 발행을 사용할 수 없습니다. 관리자에게 문의하세요.` |
| ⑤ | 전부 통과 | `null` |

**답변 검증 (순수 — `validation.ts:11-18`, 회귀 `inquiries.test.ts:441-459`)**: 공백만이면 `답변 내용을 입력하세요.`, trim 길이 1000 초과면 `답변은 1000자를 넘을 수 없습니다.`. **저장소도 `applyProgramAnswer` 안에서 같은 규칙으로 한 번 더 막는다**(`_shared/store.ts:136-137`).

**순수 표시 규칙 (`types.ts` — 서버 계약에 넣지 않는다 · §7.6)**

| 함수 | 정의 |
|---|---|
| `filterProgramInquiries(list, status, topic)`(`:134-144`) | **두 축을 한 번에 건다**(AND) — 화면이 `filter().filter()` 로 순서를 만들지 않게(`:133`). 회귀 `inquiries.test.ts:278-284` |
| `countProgramInquiriesByStatus` / `ByTopic`(`:147-175`) | **각각 필터 이전 전체 집합**에서 센다 — **두 배지가 서로를 흔들지 않는다**(유형 필터를 걸어도 상태 배지가 그대로다) |
| `unansweredCount`(`:178-180`) | `isProgramInquiryUnanswered` 인 건수 |
| `searchProgramInquiries`(`:183-196`) | **문의번호·프로그램명·문의자·제목** 4필드 부분 일치 |
| `sortProgramInquiries`(`:199-204`) | 접수 최신순, 동시각은 `id` 내림차순 안정 정렬 |
| `elapsedLabel`/`elapsedTone`(`:240-265`) | 미답변은 접수일→오늘, 답변된 건은 접수일→최초 답변일. **`OVERDUE_DAYS = 2`**(`:214`) 이상이면 danger — **상품보다 하루 빠르다**(§7.4). 읽을 수 없으면 `'—'` |
| `programInquiryHistory`(`:278-336`) | 접수 → (답변 중) → (`quoteId` 있으면) 견적 발행 → (`answeredAt` 있으면) 답변 → (종결) **최대 5칸**. 접수 문구가 **채널과 유형을 함께** 말한다(`:286`). 작성자는 **'후원자'**(`:269`) |

## 4. 엔드포인트 명세

### BE-076-EP-01 · 문의 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-076-EL-001, EL-005.1, EL-006.1, EL-007, EL-010, EL-011, EL-012, EL-012.1~.10, EL-013, EL-014, EL-015 |
| 심 | `data-source.ts:23` `GET /api/programs/inquiries` |
| 메서드·경로 | `GET /api/programs/inquiries` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 계약은 전량 반환이다**(§7.11) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** **두 축 필터(상태·유형)와 검색을 프론트가 전부 클라이언트에서** 수행하므로(`ProgramInquiryListPage.tsx:184-187`) `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly ProgramInquiry[]`. **접수 최신순 정렬**(동시각은 `id` 내림차순 안정 정렬)로 내려준다. 정렬을 어댑터 `list` 에 둔 이유가 코드에 있다(`data-source.ts:7-8` — `'최근 접수가 위' 는 이 도메인의 성질이지 화면의 취향이 아니다`).

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-076-EP-02 · 문의 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-076-EL-020, EL-021, EL-022, EL-024, EL-025, EL-025.1, EL-026.1, EL-037, EL-038 |
| 심 | `data-source.ts:23` `GET /api/programs/inquiries/:id` |
| 메서드·경로 | `GET /api/programs/inquiries/:id` |
| 권한 | `admin`, `operator`. 프로그램 도메인 읽기 권한 없음 → **404 은닉**(§7.9) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `ProgramInquiry`(목록과 **같은 타입**). 처리 이력은 응답에 없다 — 프론트가 저장된 값에서 파생한다(§7.6). **`topic` 은 이 응답에서 상세의 배지 행과 '문의자 정보' 카드 두 곳에 동시에 쓰인다**(`ProgramInquiryDetailPage.tsx:299-302,412-413`) — 같은 값이 두 자리에 나오지만 **같은 톤 함수**를 쓰므로 색이 갈리지 않는다.

**에러**: 400(id 형식) · 401 · **404 `INQUIRY_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.9) · 429 · 500 · 504.

> **어댑터는 이미 옳다**: `createStoreAdapter.fetchOne` 이 없는 id 에 `HttpError(404, '항목을 찾을 수 없습니다.')` 를 던지고(`crud.ts:217-219`) 화면이 404 와 5xx 를 문구·복구 수단으로 가른다(`ProgramInquiryDetailPage.tsx:240-263`).

---

### BE-076-EP-03 · 답변·상태 전이 저장
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-076-EL-026, EL-029, EL-030, EL-031, EL-032, EL-033, EL-034, EL-036 |
| 심 | `data-source.ts:23-25` `PUT /api/programs/inquiries/:id` + **트랜잭션·409 요구** |
| 메서드·경로 | `PUT /api/programs/inquiries/:id` |
| 권한 | `admin`, `operator`(§7.10). **`status='quote_issued'` 요청은 견적 `create` 권한을 함께 요구한다**(§7.5). 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **`Idempotency-Key` 헤더로 강제한다**(§7.12). 자리는 어댑터·훅에 이미 있고 **호출부가 비어 있다** |
| 레이트리밋 | 분당 60회 |

**바디**(현재 `ProgramInquiryInput` **13필드**): `programId` · `programName` · `customerName` · `customerContact` · `channel` · **`topic`** · `subject` · `message` · `status` · `createdAt` · `answeredAt` · `answer` · `quoteId`.

**서버 검증 (요청을 그대로 믿지 않는다 — 순서가 곧 규칙이다)**
1. **불변 필드 무시**: `programId` · `programName` · `customerName` · `customerContact` · `channel` · `subject` · `message` · `createdAt` 는 관리자가 바꿀 수 없다. 프론트가 `toProgramInquiryInput(next)`(`_shared/store.ts:198-214`)로 되돌려 보내지만 **서버는 저장된 값을 정본으로 유지한다**(§7.6).
2. **`topic` 도 지금은 불변이다**: 화면에 편집 컨트롤이 없으므로 요청의 `topic` 은 **저장값과 같아야** 하고, 다르면 **무시한다**(재분류 계약이 생기기 전까지 — §7.3). 조용히 바뀌면 그 문의는 다른 담당에게 넘어간다.
3. **서버 소유 필드 무시**: `answeredAt` · `quoteId` 는 **절대 요청에서 받지 않는다** — 서버가 찍는다(§7.6 【보안 판정】).
4. **전이 재판정**: `status` 가 바뀌면 §3 의 전이 표를 **저장된 상태를 기준으로** 다시 판정한다. 위반 시 **422**.
5. **답변 본문 검증**: `answer` 를 trim 하고, `answered` 로 이동하는 요청이면 비어 있을 수 없다. 길이 1000자 이하.
6. **최초 답변 시각 고정**: 저장된 `answeredAt !== ''` 이면 그대로 유지한다 — **후원자에게 한 약속이 언제 나갔는지는 고쳐 쓸 수 없는 사실이다**(`_shared/store.ts:126-127,141`).
7. **`quote_issued` 는 이 엔드포인트가 만들지 않는다**: 그 상태로 옮기는 유일한 정당한 경로는 EP-04 의 결과 기록이다. 그것 없이 온 요청은 **422 `QUOTE_REQUIRED`**(§7.5).
8. **답변 본문 정제**: 후원자에게 그대로 나가는 글이므로 서버가 저장 시 XSS 정제를 수행한다.

**응답 200/204**. 프론트는 응답 본문을 읽지 않고 상세를 재조회한다(`ProgramInquiryDetailPage.tsx:182`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`: `status`·`answer`·`topic`) · 401 · 403 `FORBIDDEN` · 403 `QUOTE_ISSUE_FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `INQUIRY_NOT_FOUND`** · **409 `CONFLICT`**(§7.12) · **422 `INVALID_STATUS_TRANSITION`** · **422 `EMPTY_ANSWER`** · **422 `ANSWER_ON_CLOSED`** · **422 `QUOTE_REQUIRED`** · 429 · 500 · 504.

> **`error.fields` 를 소비할 자리가 프론트에 없다**: 이 화면은 `useCrudForm` 을 쓰지 않아 모든 저장 실패가 카드 배너 한 문장('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' — `:186`)으로 수렴한다. **계약은 그럼에도 `error.fields` 를 내려보낸다**(§7.14 #4).

---

### BE-076-EP-04 · 문의 → 견적 발행
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-076-EL-009, EL-016, EL-031, EL-012.11, EL-025.1 |
| 심 | `pages/sales/quotes/data-source.ts:142-143` `POST /api/sales/quotes/issue` |
| 메서드·경로 | `POST /api/sales/quotes/issue` |
| 권한 | `admin` + **견적 `create` 권한을 가진 `operator`**(§7.5) |
| 멱등성 | **문의 id 가 도메인 멱등키다**(`quote-issue.ts:44-45`). 같은 문의로 두 번 발행해도 견적은 하나다 |
| 레이트리밋 | **분당 20회** — 견적 채번 폭주를 막는다 |

**바디**: `{ sources: QuoteIssueSource[] }` — 각 원소의 `channel` 은 **`'program'`** 이고 `itemName` 은 **프로그램명**이다.

**서버 검증 (§3 의 발행 가드 표를 그대로 구현한다)**
1. `sources` 가 비었으면 **400**.
2. 각 `id` 가 실재하는 문의인지 확인한다. 없으면 **404 `INQUIRY_NOT_FOUND`**.
3. **하나라도 이미 견적을 가졌으면 409 `QUOTE_ALREADY_ISSUED`** — 심이 이것을 명시한다.
4. 하나라도 종결이면 **422 `INQUIRY_NOT_ISSUABLE`**.
5. **`channel` 이 섞이면 400** — 한 요청의 `sources` 는 전부 같은 채널이어야 한다. 프론트에서는 각 화면의 바구니가 자기 도메인 항목만 담아 구조적으로 섞이지 않지만(FS-076 §4.1), **서버는 그 전제를 요청에서 다시 확인한다**: 상품 문의와 프로그램 문의를 한 견적으로 합치면 그 견적이 어느 창구의 것인지 역링크가 답하지 못한다(§7.5).
6. **한 트랜잭션**으로 ① 문의 다건 잠금 ② 견적 1건 생성·채번 ③ 각 문의에 `quoteId` 기입 + `status = 'quote_issued'` 를 수행한다. 어느 하나가 실패하면 전부 롤백한다.
7. `itemName`·`accountLabel`·`body` 는 **문의의 저장값에서 서버가 다시 만든다** — 요청 값을 신뢰하지 않는다(§7.6).

**응답 201** — `IssuedQuoteRef`(`{ id, quoteNo }`).

**에러**: 400 · 401 · **403 `QUOTE_ISSUE_FORBIDDEN`** · 403 `CSRF_TOKEN_INVALID` · **404 `INQUIRY_NOT_FOUND`** · **409 `QUOTE_ALREADY_ISSUED`** · **422 `INQUIRY_NOT_ISSUABLE`** · 429 · 500 · 504.

> **이 계약의 정본은 견적 계약이다** 【범위 판정】: 이 문서는 엔드포인트를 **만들지 않고 소비 사실과 문의 쪽 계약만** 기록한다. 문의가 아는 것은 `IssuedQuoteRef` 둘과 링크 경로(`issuedQuoteHref` — `quote-issue.ts:81-83`)뿐이며, **그 경계는 코드가 강제한다**(`pages/programs → pages/sales` 는 페이지 간 결합이라 발행기를 공통 층 seam 으로 뒤집었다 — `quote-issue.ts:13-17` · `ProgramInquiryDetailPage.tsx:216-218`).

## 5. 예외 매트릭스

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(두 축 필터·검색·정렬이 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:60-66`). 화면은 FS-076-EL-015 배너 | **403** 컬렉션 — 프로그램 도메인 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1). 화면은 이 403 을 일반 배너로 뭉갠다(FS-076 §7 #6) | N/A — 0건이면 200 빈 배열 → FS-076-EL-014 빈 상태 3분기 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → FS-076-EL-015 | 5초 → 504 → FS-076-EL-015 |
| EP-02 상세 | 400 — id 형식 위반 → 화면은 FS-076-EL-021 의 **일반 오류 분기** | 401 → 전역 인터셉터. 화면은 FS-076-EL-021 | **읽기 권한 없음 → 404 은닉**(§7.9) — 문의 1건은 후원자 실명·연락처·문의 원문에 더해 **`topic` 이라는 관심사 분류**까지 담는다. 읽기 권한이 있는 `operator` 에게는 403 | **404 `INQUIRY_NOT_FOUND`** — 어댑터가 이미 `HttpError(404)` 를 던진다(`crud.ts:217-219`). 화면이 '다시 시도'를 숨긴다 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → FS-076-EL-021 일반 분기(재시도 제공) | 5초 → 504 → FS-076-EL-021 |
| EP-03 저장 | 400 `VALIDATION_FAILED` — `status`·`channel`·**`topic`** 이 유니온 밖 · `answer` 1000자 초과. `error.fields` 로 내려보내나 **프론트에 필드 매핑이 없어** FS-076-EL-023 배너 한 문장으로 뭉개진다 | 401 → 전역 인터셉터. **미저장 답변은 유실된다**(FS-076 §7 #27) | `operator` 도 쓰기가 허용되므로(§7.10) 역할 부족 403 은 프로그램 쓰기 권한 없는 그 밖의 역할에만. **`status='quote_issued'` 요청은 견적 create 권한이 없으면 403 `QUOTE_ISSUE_FORBIDDEN`**. **읽기 권한 없음 → 404 은닉** | **404 `INQUIRY_NOT_FOUND`** — 존재한 적 없는 id. **프론트 픽스처는 같은 경우 409 를 던진다**(`crud.ts:256-258`) — 픽스처에는 '존재한 적 없음'과 '먼저 삭제됨'을 가를 정보가 없다. 서버는 둘을 가른다(§7.12) | **409 `CONFLICT`** — 낙관적 동시성 위반(§7.12). **화면에 해소 UI 가 없어**(`isConflict` grep 0건) 일반 배너로 뭉개진다. **같은 도메인의 프로그램 폼(FS-074)은 `useCrudForm` 의 충돌 다이얼로그를 갖고 있다** — 한 도메인 안에서 갈렸다 | **422 `INVALID_STATUS_TRANSITION`**(§3 전이 표 위반) · **422 `EMPTY_ANSWER`** · **422 `ANSWER_ON_CLOSED`** · **422 `QUOTE_REQUIRED`**. 프론트가 1차 차단하지만 **서버가 정본**이다 | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-076-EL-023 배너, 입력 보존. **참조 코드는 표시되지 않는다**(`useCrudForm` 미사용) | 5초 → 504 → EL-023. **프론트 타임아웃 상한이 없다** |
| EP-04 견적 발행 | 400 — `sources` 가 비었거나 형식 위반, **또는 `channel` 이 섞였다**(검증 5). 화면에서는 `quoteIssueBlock` ①이 먼저 막는다 | 401 → 전역 인터셉터. 화면은 FS-076-EL-009 의 **토스트** | **403 `QUOTE_ISSUE_FORBIDDEN`** — 견적 create 권한 부재(§7.5). **404 은닉 대상이 아니다** — 주체는 이미 문의의 존재를 안다 | **404 `INQUIRY_NOT_FOUND`** — `sources` 의 id 가 없다. 트랜잭션 전체를 거절한다(부분 발행 금지) | **409 `QUOTE_ALREADY_ISSUED`** — 이미 발행된 문의가 섞였다. 심이 이 코드를 명시한다. 화면 가드 ②가 1차로 막는다 | **422 `INQUIRY_NOT_ISSUABLE`** — 종결된 문의가 섞였다(가드 ③) | **429 분당 20** — 견적 채번 폭주 방지 | 500 + `traceId` → FS-076-EL-009 토스트. **토스트는 자동 소멸하므로 가장 무거운 쓰기가 가장 약한 통지를 쓴다**(FS-076 §7 #28) | **10초 → 504**(견적 생성 + 문의 다건 잠금). 재시도는 문의 id 멱등키가 이중 발행을 막는다 |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `programInquiryAdapter.fetchAll(signal)` | `GET /api/programs/inquiries` | EP-01 | `readonly ProgramInquiry[]` | O — 정렬을 어댑터가 건다(`data-source.ts:28`) |
| `programInquiryAdapter.fetchOne(id, signal)` | `GET /api/programs/inquiries/:id` | EP-02 | `ProgramInquiry` | O — **404 를 이미 `HttpError` 로 던진다**(`crud.ts:217-219`) |
| `programInquiryAdapter.update(id, input, context?)` | `PUT /api/programs/inquiries/:id` + 트랜잭션·409 주석 | EP-03 | `void` | **△ — 13필드 전체 치환 계약 변경 필요**(§7.6) · **멱등키 미전달**(§7.12) · **409 해소 UI 없음** · **`topic` 이 바디에 있으나 바꿀 수단이 없다**(§7.3) |
| `issueQuote(sources)`(`quote-issue.ts:153-156`) | `POST /api/sales/quotes/issue`(`quotes/data-source.ts:142-143`) | EP-04 | `IssuedQuoteRef \| null` | **△ — 동기 seam이다.** 미배선이면 `null` 이고 `quoteIssueBlock` ④가 먼저 막는다(§7.13) |
| 발행 후 문의별 `update` 루프(`ProgramInquiryListPage.tsx:219-224`) | — | **EP-04 가 흡수한다** | — | **X — 다건 발행이 원자적이지 않다**(§7.5) |
| `readInquiryBacklog('program')`(`inquiry-backlog.ts:51-53`) | — (동기 seam) | **없음 — 심이 없어 발명하지 않는다** | `InquiryBacklog \| null` | **△ — 이 화면의 소비자가 아니다.** 구현은 `wiring.ts:209-216`(`targetId: programId`). 서버 집계 계약은 미결(§7.14 #7) |
| `quoteIssueBlock(candidates)` | — (순수 규칙) | EP-04 의 서버 검증 1~4 | `string \| null` | O — 서버가 같은 순서로 재판정한다(§7.13) |
| `programInquiryAdapter.create(...)` | — | **없음(범위 밖)** | `createStoreAdapter` 가 제공하나 **호출부 0건** | O — 계약 없음이 정답(§7.2) |
| `programInquiryAdapter.remove(...)` | — | **없음(범위 밖)** | 위와 동일 | O — 계약 없음이 정답(§7.2) |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

| 요구 | 내용 |
|---|---|
| CSRF | 쓰기(`update` · 견적 발행)에 `X-CSRF-Token` 헤더를 싣는다(BE-003 §3.3). |
| 404 변환 | `fetchOne` **이미 충족**(`crud.ts:217-219`). 응답 404 를 `HttpError(404, …)` 로 옮기기만 한다. |
| 409 변환 | `update` 는 응답 409/412 를 `HttpError(409, …)` 로 옮긴다. **화면 쪽 해소 UI 는 별도 작업이며, 같은 도메인의 프로그램 폼(FS-074)이 이미 그 UI 를 갖고 있어 옮겨 오기만 하면 된다**(§7.14 #3). |
| 422 변환 | `update` 는 응답 422 의 `error.fields` 를 `HttpError.violations` 로 옮긴다. **`field` 이름은 `status`·`answer`·`topic` 셋이다.** 소비하는 자리는 아직 없다(§7.14 #4). |
| 멱등키 | `update` 는 `context?.idempotencyKey` 를 `Idempotency-Key` 헤더로 내보낸다 — **자리는 이미 있다**(`crud.ts:243,354-355`). **비어 있는 것은 호출부다**(§7.14 #2). |
| 서버 소유 필드 제거 | `toProgramInquiryInput`(`_shared/store.ts:198-214`)이 실어 보내는 `answeredAt`·`quoteId` 와 불변 8필드는 **요청에서 사라져야 한다**(§7.6 안 A). `topic` 은 **재분류 계약이 생기면 남고, 그전까지는 사라진다**(§7.3). |
| 전이 가드 유지 | 전이 술어 4개와 `applyProgram*` 넷은 **지우지 않는다** — 서버가 정본이 되어도 화면 버튼과 같은 술어를 읽는 자리가 필요하다(§7.1). |
| 발행 루프 제거 | 목록의 `for (const target of targets) await update(...)`(`ProgramInquiryListPage.tsx:219-224`)와 상세의 `commit(applyProgramQuoteIssued(...))`(`:228-232`)는 **EP-04 한 번의 호출로 대체된다.** 남긴 채 서버도 상태를 옮기면 **같은 저장이 두 번 나간다**(§7.5). |
| 발행기 seam 유지 | `issueQuote`/`registerQuoteIssuer` 구조(배선 `wiring.ts:188`)는 유지한다 — 없으면 `pages/programs → pages/sales` 결합이 되살아난다. **상품 문의와 같은 발행기를 공유한다** — 서버가 채널을 검증해야 하는 이유가 그것이다(EP-04 검증 5). |

## 7. 핵심 판정

### 7.1 전이 규칙은 이미 코드에 있다 — 서버는 같은 표를 같은 순서로 재판정한다 【정합 판정】

이 도메인은 상태를 자유롭게 고르는 select 를 **의도적으로 두지 않았다**(`ProgramInquiryDetailPage.tsx:6-9`). 네 술어가 정본이고 화면은 그것을 **버튼의 존재 조건**으로 읽으며 저장소는 같은 술어로 **던진다**.

| 동작 | 화면의 존재 조건 | 저장의 거절 | 같은 술어인가 |
|---|---|---|---|
| 답변 저장 | `canUpdate && canAnswerProgramInquiry(status)`(`:390`) | `applyProgramAnswer` 의 `!canAnswerProgramInquiry` → throw(`_shared/store.ts:135`) | **예** |
| 답변 착수 | `canUpdate && canBeginAnsweringProgramInquiry(status)`(`:374`) | `applyProgramBeginAnswering` → throw(`:154-156`) | **예** |
| 문의 종결 | `canUpdate && canCloseProgramInquiry(status)`(`:379`) | `applyProgramClose` → throw(`:148`) | **예** |
| 견적 발행 | `canUpdate && issueBlock === null`(`:385`, `issueBlock` `:164-165`) | 목록의 `basketBlock`(`ProgramInquiryListPage.tsx:211,356`) · 저장소 `applyProgramQuoteIssued`(`:166`) | **예** — 세 자리가 같은 공통 층 함수를 읽는다 |

**판정**: **눌리는데 실패하는 버튼이 이 화면에 없다.** 서버는 §3 의 두 표를 **그 순서 그대로** 구현하고 위반을 **422** 로 거절한다. 회귀가 사유 문자열까지 고정한다(`inquiries.test.ts:130-143,145-165,187-192,492-502`).

**서버에 없는 판정 하나**: 견적 발행의 ④ 미배선 사유(`QUOTE_ISSUE_UNWIRED`)는 프론트 배선의 사실이지 도메인 규칙이 아니다. 서버는 ①②③만 판정한다(§7.13).

### 7.2 문의 생성·삭제 — 계약에 존재하지 않는다 【범위 판정】

**코드로 재확인한 사실 — 네 겹이다**:

- `_shared/store.ts:3-5`: `결제대행(PG)을 끄면 프로그램 페이지의 '후원하기' 버튼이 '문의하기' 로 바뀐다. … 항목을 만드는 것은 **후원자**이고 관리자는 답변하고 종결할 뿐이다 — 그래서 화면에는 등록 폼이 없다.`
- `_shared/store.ts:329`: `후원자 채널이 만든다 — 관리자 화면에는 이 문을 여는 버튼이 없다(머리말)`.
- `data-source.ts:4-5`: `문의를 만드는 것은 후원자 채널이라 관리자 화면에는 생성 경로가 없다`.
- **호출부 0건**: `create`·`remove` 를 부르는 코드가 두 화면에 **없다**(grep 실측). 목록이 `CrudReadListShell` 인 것이 그 결과다(`ProgramInquiryListPage.tsx:11-12`).

**판정**: `POST /api/programs/inquiries` · `DELETE /api/programs/inquiries/:id` 를 **만들지 않는다.** 심이 없는 것은 누락이 아니라 **의도된 부재**다.

**삭제에 대한 추가 근거**: 프로그램 문의는 **후원 의사가 실제로 있었다는 기록**이다. PG 를 끈 운영에서 이 문의가 후원 자체를 대신하고(§7.7), `quoteId` 로 견적과 이어져 있다. 지우면 **그 후원이 왜 성사되지 않았는지 설명할 수 없게 된다.** 종결(`closed`)이 삭제를 대신하며, 그것마저 답변이 나간 뒤에만 열린다.

**부재의 표현이 약하다**: `create`/`remove` 는 공용 팩토리 때문에 **실제로 동작한다**(§7.14 #8).

### 7.3 문의 유형(topic)은 담당을 가르는데 바꿀 수단이 없다 【범위 판정】

**이 축은 이 도메인에만 있다.** 상품 문의 모듈에 `topic` 은 **0건**이다.

**존재 이유가 코드에 있다**(`_shared/store.ts:40-44` · `types.ts:63-66`): 프로그램은 **아직 만들어지지 않은 것에 돈을 먼저 거는 일**이라 문의가 리워드 구성·배송 예정·환불 조건에 몰리고, **처리하는 사람이 다르다** — 리워드·배송은 **창작자 확인**이 필요하고 환불·결제는 **운영이 바로** 답할 수 있다. 톤도 그 판단을 따른다: **돈이 걸린 유형(환불·결제)이 warning**(`types.ts:70-71`, 회귀 `inquiries.test.ts:225-229`).

**계약이 이 축에 대해 말하는 것**:

| 사실 | 계약 |
|---|---|
| 값 집합 | `reward` \| `delivery` \| `refund` \| `payment` \| `etc` — 유니온 밖이면 **400** |
| 접수 시 결정 | **후원자 채널이 정한다.** 이 계약은 그것을 만들지 않는다(§7.2) |
| 필터·집계 | 상태 축과 **독립**이다 — 두 배지가 서로를 흔들지 않는다(`types.ts:147-175`, 회귀 `inquiries.test.ts:286-300`). 페이징을 도입하면 **두 집계 모두 서버가 전체에서 내려보내야 한다**(§7.11) |
| 견적으로 넘어가는가 | **아니다.** `toProgramQuoteIssueSource`(`_shared/store.ts:176-186`)에 `topic` 이 없다 — 견적은 무엇을 파는가를 알지 관심사 분류를 알 필요가 없다 |
| 재분류 | **수단이 없다** |

**판정 — 재분류는 이 계약에 없다. 그러나 '의도된 부재'라고 판정하지 않는다.**

생성·삭제(§7.2)와 다른 점이 있다: **코드가 재분류의 부재를 정당화하지 않는다.** 생성·삭제는 주석 세 곳이 "고객이 만든다", "지우지 않는다"라고 명시하지만, `topic` 에 대해서는 **그런 문장이 없다.** 오히려 `ProgramInquiryInput` 에는 필드가 있고(`:205`) 전체 치환 저장이므로 **기술적으로는 이미 바꿀 수 있다** — 화면이 그 값을 만들지 않을 뿐이다.

**그리고 그 부재가 이 축의 존재 이유를 무너뜨린다**: 축이 있는 이유가 '처리하는 사람이 다르다'인데, **후원자가 잘못 고른 유형은 영원히 잘못된 담당에게 남는다.** '배송'으로 접수된 환불 문의는 창작자 확인 대기열에 영원히 있고, 그 사이 후원자는 마감(§7.4) 안에 답을 못 받는다.

**미결로 남긴다**: 재분류 API 를 여는가(그러면 `topic` 이 EP-03 의 편집 가능 필드가 되고 감사 이벤트가 필요하다), 아니면 접수 시점 사실로 동결하는가(그러면 서버가 요청의 `topic` 을 **무시**해야 한다 — EP-03 검증 2). **이 문서는 후자를 잠정 계약으로 삼는다** — 지금 화면이 그렇게 동작하고, 조용히 바뀌는 것이 더 나쁘기 때문이다. **판단은 도메인 아키텍처의 몫이다**(§7.14 #6).

### 7.4 SLA 임계가 상품 문의보다 하루 짧다 — 마감이 있는 판매다 【경계 판정】

**코드로 확인한 차이**: `OVERDUE_DAYS = 2`(`types.ts:214`) ↔ 상품 문의 `3`(`products/inquiries/types.ts:145`). 근거가 주석에 있다(`types.ts:208-213`): **"펀딩은 마감이 있는 판매라, 답이 늦으면 후원 자체가 사라진다. 답을 못 받은 사람은 기다리지 않고 그냥 후원을 접는다."** 회귀가 그 차이를 고정한다(`inquiries.test.ts:397-406` — 이틀이면 danger, 하루면 warning).

**그런데 그 임계는 서버 계약이 아니다.** 두 사실을 갈라야 한다:

| 사실 | 어디에 있는가 | 판정 |
|---|---|---|
| **표시 임계** `OVERDUE_DAYS = 2` | 화면 전용 파생 규칙(`types.ts`) | **서버 계약에 넣지 않는다**(§7.6 파생값 규약). 응답에 `overdue` 를 실어 보내지 않는다 |
| **집계 SLA** 24시간 | 공통 층(`inquiry-backlog.ts` 소비 — `wiring.ts` 가 접는 `inquiryBacklogOf` 의 SLA 상수) | **집계 계약의 것이다.** 이 값이 대시보드의 `slaBreached` 를 만든다 |

**그리고 두 값이 다르다** — 화면은 2일, 집계는 24시간이다. 같은 문의가 목록에서는 아직 warning 인데 대시보드에서는 이미 SLA 위반일 수 있다.

**판정**: **두 임계는 서로 다른 질문에 답하므로 통합하지 않는다** — 하나는 '운영자가 지금 무엇부터 집을까', 다른 하나는 '조직이 약속을 지켰는가'다. 다만 **정의가 어디에 있는지는 계약이 밝혀야 한다**: 표시 임계는 화면이, 집계 임계는 집계 계약이 소유하고, **서버가 둘 다 내려보내지 않는다.**

**서버가 내려보내야 하는 것은 하나 — 기준 시각이다.** 지금은 `TODAY = '2026-07-21'` 하드코딩(목록 `:77` · 상세 `:70`)이라 **날짜가 지나도 '2일째 미답변'이 늘지 않는다**(§7.6 말미 · §7.14 #5).

### 7.5 견적 발행은 한 트랜잭션이다 — 이 계약은 **발행 사실만 기록**한다 【범위 판정】

**소유 경계**:

| 사실 | 정본 | 이 계약의 역할 |
|---|---|---|
| 견적의 품목·단가·과세유형·유효기간·발송·수주 전환 | 견적 계약(FS-050 계열) | **모른다.** `IssuedQuoteRef` 둘만 받는다 |
| 견적 채번 | 견적 계약 | 받은 `quoteNo` 를 토스트에 쓸 뿐이다(`:230`) |
| **어느 문의가 어느 견적을 낳았는가** | **이 계약** | `quoteId` 기입 + `status = 'quote_issued'` |
| 후원 결제·펀딩 달성 | 프로그램 계약(FS-074 계열) | **잇는 배선이 없다** — 견적이 후원으로 이어졌는지 이 앱은 모른다(§7.14 #10) |

**멱등 판정 — 같은 문의로 견적을 두 번 발행할 수 있는가**: **없다. 멱등키는 `quoteId`(= 문의 id 로 교차 확인)이며 세 겹으로 막힌다.**

| 겹 | 위치 | 동작 |
|---|---|---|
| ① 호출부 가드 | `quoteIssueBlock` ②(`quote-issue.ts:138`) | 이미 발행된 후보가 섞이면 발행 자체를 막고 사유를 막대에 적는다 |
| ② 문의 쪽 전이 | `applyProgramQuoteIssued`(`_shared/store.ts:165`) | `quoteId !== ''` 면 **원본을 그대로 반환**한다. 회귀 `inquiries.test.ts:487-491` |
| ③ 견적 저장소 | `issueQuoteFromSources`(`quotes/data-source.ts:148-151`) | `findQuoteBySource` 로 교차 확인해 기존 견적을 돌려준다 |

**판정**: 서버는 이 세 겹을 **한 트랜잭션 안의 한 판정**으로 합치고, ②의 '조용한 통과' 대신 **409 `QUOTE_ALREADY_ISSUED`** 로 거절한다(심이 그것을 명시한다). 이유: 픽스처 ③은 이미 발행된 문의가 섞이면 기존 견적을 돌려주고 **나머지 문의는 견적을 얻지 못한다**(`quote-issue.test.ts:116-125` 가 그 사실을 고정한다) — 성공처럼 보이는 부분 실패다.

**다건 발행이 원자적이지 않다**: `issue.mutationFn`(`ProgramInquiryListPage.tsx:219-224`)이 견적을 먼저 만들고 담긴 문의를 **`for` 로 돌며 하나씩 `await update`** 한다. 중간에 실패하면 앞의 것만 `quoteId` 를 갖고 나머지는 견적 없이 남으며 **롤백 경로가 없다.** 실패 토스트는 어느 것이 남았는지 말하지 않는다(`:235`).

**판정**: EP-04 가 이 루프를 **없앤다**(§6.1 '발행 루프 제거').

**채널이 섞이면 안 된다**: **상품 문의와 프로그램 문의가 같은 발행기를 공유한다**(`wiring.ts:188` 이 `issueQuoteRef` 하나를 꽂는다). 프론트에서는 각 화면의 바구니가 자기 도메인 항목만 담아 구조적으로 섞이지 않지만, **서버는 요청에서 그것을 다시 확인한다**(EP-04 검증 5) — 섞인 견적은 역링크가 어느 창구를 가리켜야 할지 답하지 못한다(`quote-issue.ts:30-34` 가 그 갈림을 `QuoteSourceChannel` 로 못박은 이유다).

**권한 판정**: `status='quote_issued'` 로 옮기는 것은 문의 처리가 아니라 **거래처에 나갈 산출물을 만들고 견적번호를 채번하는 행위**다. 문의 update 권한만으로 가능하면 **견적 리소스의 create 권한이 우회된다.** EP-04 와 EP-03 의 `quote_issued` 요청은 **문의 update 권한 AND 견적 create 권한**을 함께 요구하고, 후자가 없으면 **403 `QUOTE_ISSUE_FORBIDDEN`**. **프론트에는 이 분기가 없다** — `canUpdate` 하나가 네 버튼을 함께 지배한다(§7.14 #9). BE-051 §7.6 과 같은 판정이다.

### 7.6 서버 소유 필드를 요청에서 받지 않는다 — 파생값은 저장하지 않는다 【보안 판정】

**현재 클라이언트가 서버 소유 값을 바디에 실어 보낸다**: `toProgramInquiryInput(inquiry)`(`_shared/store.ts:198-214`)가 `answeredAt`·`quoteId`·`status`·**`topic`** 을 그대로 복사해 넣고 화면이 그것을 `update.mutate` 의 `input` 으로 보낸다(`ProgramInquiryDetailPage.tsx:176-177`).

**이것이 만드는 사고**:

1. **`answeredAt` 을 되돌려 보내면 응대 속도가 조작된다.** 이 값은 후원자에게 한 약속이 언제 나갔는지를 말하는 유일한 근거이고 집계 SLA(§7.4)의 입력이다.
2. **`quoteId` 를 비워 보내면 재발행이 가능해진다** — 한 문의가 견적 두 장을 갖는다(§7.5).
3. **`topic` 을 조작하면 담당이 바뀐다** — 이 도메인 고유의 위험이다. 화면에 편집 수단이 없으므로 **정상 경로에서 이 값이 바뀔 이유가 없는데** 바디에는 실려 있다(§7.3).
4. **`createdAt` 을 조작하면 경과가 조작된다** — '2일째 미답변'이 '오늘 접수'가 된다.

**판정**: `answeredAt` · `quoteId` · `topic` · `createdAt` · `programId` · `programName` · `customerName` · `customerContact` · `channel` · `subject` · `message` 는 **전부 서버가 소유한다.** 요청 바디의 이 값들은 **무시한다**.

| 안 | 형태 | 평가 |
|---|---|---|
| **A (권장)** | `PUT /api/programs/inquiries/:id` 는 **관리자가 실제로 바꾸는 둘만** 받는다: `{ status, answer }`. 재분류 계약이 생기면 `topic` 이 셋째로 들어온다(§7.3) | 위조가 구조적으로 불가능하다. `toProgramInquiryInput` 이 통째로 사라진다. **어댑터 시그니처는 그대로다**(`Input` 타입만 좁아진다) |
| **B (차선)** | PUT 을 유지하되 서버가 불변·서버 소유 필드를 **무시** | 어댑터를 덜 흔든다. 그러나 13필드 중 11개가 쓰이지 않는 기형이 남고, '무시한다'는 계약은 구현이 한 줄 빠지면 조용히 깨진다 — **특히 `topic` 이 그렇다** |

**답변 시각은 서버가 찍는다**: 현재 `new Date().toISOString()`(`ProgramInquiryDetailPage.tsx:203`) — **브라우저 시계**다. `applyProgramAnswer` 가 `at` 을 인자로 받는 것은 테스트가 시계를 고정하기 위한 것이고(`_shared/store.ts:127-128`), 운영에서는 그 값이 그대로 감사 기록이 된다.

**파생값을 계약에 넣지 않는다**: `countProgramInquiriesByStatus`/`ByTopic` · `unansweredCount` · `elapsedLabel`/`elapsedTone` · `programInquiryHistory` 는 **전부 저장된 값에서 매번 만들어진다**. 저장하면 어긋난다 — 답변을 고치는 순간 이력의 답변 칸이 본문과 갈라지고(`types.ts:272-277`), 경과를 저장하면 날짜가 바뀔 때마다 전량 갱신이 필요하며 그 갱신이 절반만 성공하면 목록의 절반이 거짓말을 한다. **서버도 응답에 `elapsed`·`history`·`overdue` 를 넣지 않는다.** 서버가 넘겨야 할 것은 **기준 시각 하나**다(§7.4).

### 7.7 이 화면의 유입량은 결제 설정에 종속된다 — PG 축은 fail-closed 다 【경계 판정】

**사실**: `pgSellable(settings) = settings.usePg && settings.merchantId.trim() !== ''`(`payment-settings.ts:128-130`). 이것이 false 면 프로그램 CTA 가 **'후원하기'에서 '문의하기'로** 바뀌고(`:109-114`), 그 문의가 **`INQUIRY_PATH.program = '/programs/inquiries'`**(`:100-103`) 로 들어온다 — 즉 **이 화면이다**.

**상품 문의보다 이 결합이 무겁다**: 상품은 결제가 막혀도 '나중에 사면 되는 물건'이지만, 프로그램은 **마감이 있는 후원**이다. 결제를 끈 기간 동안 들어온 문의 하나하나가 **성사되지 못한 후원**이고, 답이 늦으면 그 후원은 마감과 함께 사라진다(§7.4). 화면도 그 사실을 사용자에게 말한다(`ProgramInquiryListPage.tsx:378-381` — `마감이 있는 펀딩이라 답변이 늦으면 후원이 사라집니다.`).

**방향**: **결제 축은 fail-closed 다.** `usePg` 를 켜 두고도 상점 ID(MID)가 공란이면 **판매 불가**로 수렴한다(`payment-settings.ts:120-122`). 그 반대편에서 **엔타이틀먼트 축은 fail-open**(`route-entitlement.ts:10-12` — `판정 실패가 기능 정지가 되면 안 된다`)이고 **권한 축은 fail-closed** 다. 세 축의 실패 방향이 다르다는 사실이 EXC-21·EXC-22 의 근거다.

**판정 — 계약에 못박을 것 세 가지**:

1. **이 화면의 트래픽은 다른 화면의 설정이 만든다.** 서버는 그 결합을 **인지하되 강제하지 않는다** — 문의 접수 API 가 `pgSellable` 을 다시 판정하면 판매 방식의 정본이 둘이 된다.
2. **메뉴가 감춰져도 라우트와 API 는 살아 있어야 한다.** `resolveNavLeaf`(`nav-config.ts:314-324`)가 `hidden` 을 돌려주어도 `collectNavRoutes()` 는 그 필터를 지나지 않으며(`:327-336`, 근거 `:311-312`), 라우트는 `App.tsx:344-345` 에 그대로 있다. **서버가 '메뉴에 없으니 403' 을 내면 그 설계가 깨진다.**
3. **`total` 은 종결 포함 전체 건수다**(`inquiry-backlog.ts:20-25`). 미종결만 세면 전부 종결된 날 메뉴가 사라져 과거 문의가 접근 불가가 된다. 그리고 **모를 때는 `null` 이고 그것을 `archive`(남긴다)로 읽는다**(`:121`) — **지우는 쪽으로 실패하면 복구가 없다.**

### 7.8 이 라우트는 어떤 플랜 모듈에도 속하지 않는다 — 언제나 granted 다 【경계 판정】

**코드로 확인한 사실**: `MODULE_RESOURCES`(`module-resources.ts:29-91`)에 **`/programs` 로 시작하는 리소스가 하나도 없다.** 상품 트리는 전부 매핑돼 있고(`commerce.products` 가 `/products` · `/products/categories` · `/products/reviews` · **`/products/inquiries`** 를 지배한다 — `:40-46`), 주문·영업·CMS·마케팅·AI·통계도 각자 키를 갖는다. **프로그램 트리만 없다.**

**따라서**: `entitlementKeyForResource(page:/programs/inquiries)` 가 `null` 이고, `entitlementStateForResource` 가 그 자리에서 **`granted`** 를 돌려준다(`route-entitlement.ts:23-29`). 상세 라우트(`/programs/inquiries/:id`)도 `findCoveringLeaf` 로 같은 잎을 물려받아 같은 결론이다(`:38-42`).

**판정**:

- **이 화면은 플랜으로 잠기지 않는다.** 상품 문의(BE-073 §2)와 갈리는 지점이며, 이 화면에서 EXC-21 의 '플랜 계열' 거절이 **발생할 수 없다**.
- **그것이 fail-open 규약의 결과다** — `route-entitlement.ts:10-12` 가 `이 축은 **모든** 미지의 경우가 granted 로 수렴한다 — 판정 실패가 기능 정지가 되면 안 된다` 라고 적는다. 즉 **의도된 동작이지 누락의 증거가 아니다**(대시보드·설정·로그도 같다 — `module-resources.ts:15-17`).
- **다만 '프로그램 모듈을 팔지 않는다'는 상용 판단인지, 매핑을 잊은 것인지는 이 문서가 답할 수 없다.** 프로그램 트리 전체가 빠져 있다는 사실만 기록하고 **미결로 남긴다**(§7.14 #7).
- **서버는 이 축을 응답 코드로 말하지 않는다.** 플랜 판정은 라우트 계층의 것이고, 서버는 권한(403/404)만 말한다 — 상품 문의와 같다.

### 7.9 개인정보 — 개별 문의는 404 로 은닉하고 마스킹은 서버가 한다 【보안 판정】

**문의 1건이 담는 것**(`_shared/store.ts:47-74`):

| 값 | 성격 |
|---|---|
| `customerName` | 후원자 **실명**(픽스처 '한도윤'·'서예린' — 마스킹되지 않은 원본이다) |
| `customerContact` | **연락처 원본** — 휴대폰(`010-7745-2093`) 또는 이메일(`doyun.h@example.com`) |
| `message` | 후원자가 쓴 **문의 원문** — 이사 일정·결제 실패·환불 우려 같은 사적 사정을 담는다 |
| **`topic`** | **이 사람이 무엇을 걱정하는가의 분류** — '환불'로 접수된 문의는 그 자체가 그 후원자의 이탈 의사를 드러낸다. **상품 문의에 없는 민감도 축이다** |
| `programId` · `programName` | **무엇에 돈을 걸려 했는가** — 후원 이력의 대용물이다 |
| `id` | `PGQ-YYYYMMDD-NNN` — 날짜 + 일련번호라 열거하면 그날의 문의 볼륨(≈ 후원 관심 볼륨)을 추정할 수 있다 |

BE-003 §3.2 의 원칙 두 줄을 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/programs/inquiries` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 문의 리소스의 존재 자체가 개인정보다** → 프로그램 도메인 **읽기 권한이 없는** 주체에게는 **404 `INQUIRY_NOT_FOUND`** 로 은닉한다. BE-026 §7.6 · BE-044 §7.5 · BE-051 §7.1 과 같은 판정이다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다. 이 도메인은 `operator` 에게 쓰기를 열므로(§7.10) 그 403 은 프로그램 쓰기 권한 없는 그 밖의 역할과 **견적 create 권한이 없는 발행 요청**(§7.5)에만 발생한다.

**마스킹은 누가 하는가 — 서버다.** 이 화면에는 마스킹이 **한 줄도 없다**: 목록의 문의자 셀이 원본이고(`ProgramInquiryListPage.tsx:253`) 상세의 연락처가 원본이다(`ProgramInquiryDetailPage.tsx:410`). **원본을 내려보내고 프론트가 가리면 응답 본문에 평문이 남는다.** 회신이 실제로 필요한 자리(상세의 '문의자 정보' 카드 4행)는 **별도 권한의 별도 필드**로 분리하고, **목록 응답에서는 연락처를 아예 뺀다**(§7.11).

**비밀글(secret) 축은 이 코드에 없다.** `secret`·`isPrivate`·`visibility` 류 필드가 **0건**(grep 실측). **판정: 계약에 넣지 않는다.** 프로그램 페이지에 '비밀글' 체크박스가 생기면 그것은 접수 채널의 계약 변경이고, 그때 이 계약은 ① `secret` 필드 ② 목록 응답에서의 제목·본문 가림 ③ 그 가림을 푸는 별도 권한 셋을 함께 받아야 한다. **지금 없는 것을 있는 것처럼 쓰지 않는다.**

### 7.10 `operator` 에게 쓰기를 연다 — 단 견적 발행은 예외

BE-010(FAQ)은 `operator` 를 조회 전용으로 두고 모든 쓰기를 403 으로 막는다. **이 도메인은 반대이며, BE-026 §7.8 · BE-051 §7.6 · BE-073 §7.10 과 같은 결이다.**

**근거**: 후원자 응대는 **운영자의 본업**이다. 그리고 이 도메인은 **유형에 따라 답하는 사람이 갈리는 구조**(§7.3)라 오히려 다수의 처리자를 전제한다 — 리워드·배송은 창작자 확인을 거치고 환불·결제는 운영이 바로 답한다. `admin` 한 명만 저장할 수 있다면 그 분업 자체가 성립하지 않는다.

**단 하나 예외 — 견적 발행**: §7.5 의 권한 판정대로 견적 `create` 권한을 함께 요구한다.

**결론**: EP-01 · EP-02 · EP-03(발행 제외)은 `admin` + `operator`. EP-04 와 발행 전이는 `admin` + **견적 create 권한을 가진** `operator`.

### 7.11 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**:

1. **페이징이 없다.** `fetchAll(signal)` 이 전량을 반환하고 **두 축 필터와 검색이 전부 클라이언트**다(`ProgramInquiryListPage.tsx:184-187`). 문의는 매일 쌓이는 무한 증가 컬렉션이고, **PG 를 끈 운영에서는 그것이 유일한 유입 경로다**(§7.7).
2. **목록이 상세 전문을 담는다.** 목록 응답에 `customerContact`(연락처 원본)와 `message`(후원자 원문)가 실린다 — **목록이 그리는 것은 문의번호·프로그램명·문의자·제목·유형·채널·상태·접수일·경과 아홉 열뿐**이다(`:243-291`). §7.9 의 취지와 정면으로 충돌한다.

**판정**: **`ProgramInquirySummary` / `ProgramInquiry` 를 분리**하고, EP-01 에 `status`·**`topic`**·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다. `ProgramInquirySummary` 는 `customerContact`·`message` 를 빼고 `answer` 를 `answered: boolean` 으로 축약한다. **`topic` 은 남는다** — 목록의 열이자 필터 축이다.

**건수 배지는 페이지가 아니라 전체에서 나와야 한다 — 그리고 이 화면은 그것이 둘이다**: `countProgramInquiriesByStatus` 와 `countProgramInquiriesByTopic` 이 **각각 필터 이전 전체 집합**을 센다(`types.ts:146` 주석). 페이징을 도입하면 **두 집계 모두 응답의 별도 필드로 서버가 내려보내야** 한다 — 페이지 안의 행만 세면 **두 배지가 동시에 거짓이 되고, 게다가 서로를 흔들지 않는다는 성질까지 깨진다**(유형 필터를 걸면 상태 배지가 그 부분집합만 세게 된다).

**이관**: 프론트 대공사다 — `filterProgramInquiries`/`searchProgramInquiries` 가 서버로 올라가고 페이지네이션 UI(quality-bar IA-04 P0)와 순번 오프셋이 함께 붙어야 한다. **URL list state 는 이미 세 축을 소유한다**(`useListState` — `status`·`topic`·`q`). 그전까지 현 계약(전량)을 유지한다 — 픽스처 5건에서는 드러나지 않는다.

### 7.12 동시성 — 두 운영자가 같은 문의에 답하면 **나중 저장이 이긴다** 【정합 판정】

**코드로 확인한 사실**:

- **낙관적 동시성 토큰이 없다.** `ProgramInquiry` 에 `version`·`updatedAt` 이 없고 `update` 가 `If-Match` 를 보내지 않는다(grep **0건** 실측).
- **존재 기반 409 는 있다.** 공용 어댑터가 없는 id 의 `update` 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던진다(`crud.ts:256-258`). 유령 저장은 구조적으로 막힌다.
- **저장은 13필드 전체 치환이다.**
- **화면에 409 해소 UI 가 없다.** `onError`(`ProgramInquiryDetailPage.tsx:184-187`)에 `isConflict` 분기가 없어 409 는 `'저장하지 못했습니다…'` 배너로 떨어진다 — **재시도하면 또 409 인 실패에 재시도를 권한다.** **같은 도메인의 프로그램 폼(FS-074)은 `useCrudForm` 의 충돌 다이얼로그를 갖고 있다** — 한 도메인 안에서 갈렸다.

**판정: 동시 편집은 last-write-wins 다.** 두 운영자가 같은 문의에 각각 답변을 쓰면 **나중에 도착한 요청의 답변이 이긴다.** 앞선 답변은 흔적 없이 사라진다 — 처리 이력이 저장된 값의 파생값이라(§7.6) 덮인 답변의 기록도 함께 사라진다.

**부분 완화 3가지**(이것을 '해결'로 읽지 말 것): 불법 전이는 저장 시점 재판정이 422 로 막고(§7.1), 최초 답변 시각은 덮이지 않으며(`:141`), 견적 발행은 세 겹의 멱등키가 막는다(§7.5). **남는 것은 답변 본문 — 그리고 이 화면에서 가장 중요한 값이다.**

**판정(계약)**: EP-03 은 **`If-Match: <version>` 또는 `ETag`** 를 요구한다. 불일치는 **409 `CONFLICT`** 이며 `ProgramInquiry` 에 `version`(또는 `updatedAt`)을 더한다. **서버 소유 필드 축소(§7.6 안 A)를 채택해도 토큰이 선택이 되지는 않는다** — 답변 본문 자체가 lost update 의 대상이다.

**409 의 의미를 서버가 가른다**: 픽스처는 '존재한 적 없음'과 '먼저 삭제됨'을 구분할 정보가 없어 둘 다 409 로 던진다. **서버는 404 와 409 를 가른다** — 화면의 복구 수단이 다르기 때문이다.

### 7.13 미배선 seam 이 성공을 흉내 내지 않는다 【정합 판정】

이 화면이 지나는 이음매는 셋이고, **셋 다 '모른다'를 값으로 표현한다**.

| 조회·부수효과 | 미배선 시 | 판정 |
|---|---|---|
| **견적 발행기** `issueQuote`(`quote-issue.ts:153-156`) | `issuer === null` 이면 **`null` 을 돌려준다**(빈 참조를 지어내지 않는다 — `:145`). 그보다 먼저 `quoteIssueBlock` ④가 **`견적 발행을 사용할 수 없습니다. 관리자에게 문의하세요.` 라는 문장으로** 버튼을 비활성시키고 사유를 막대에 그대로 적는다(`ProgramInquiryListPage.tsx:341-344`) | **충족.** 근거가 주석에 있다(`quote-issue.ts:23-26`). 회귀 `quote-issue.test.ts:86-92,127-130` |
| **잔여 문의 집계** `readInquiryBacklog('program')`(`inquiry-backlog.ts:51-53`) | `lookup === null` 이면 **`null`(모른다)** 이고 메뉴 규칙이 그것을 **`archive`(남긴다)** 로 읽는다(`:121`) — **fail-open** | **충족.** 0 으로 떨어뜨리면 메뉴가 사라져 과거 문의가 접근 불가가 된다(`:10-13`) |
| **결제 설정** `readPaymentSettings()`(`payment-settings.ts:196-198`) | 모듈 지역 상태라 언제나 값이 있다. 다만 `pgSellable` 이 **fail-closed** 다(§7.7) | **충족(방향이 반대다)** — 판매 축은 닫는 쪽, 문의 축은 여는 쪽으로 실패한다 |

**판정**: 서버도 같은 규약을 따른다. EP-04 의 견적 생성이 실패하면 **문의의 `quoteId`·`status` 를 찍지 않는다** — 견적 없는 '견적 발행' 상태를 만들지 않는다(EP-03 검증 7 이 그 상태를 애초에 거절하는 것과 같은 이유). 집계 엔드포인트가 생기더라도 **장애 시 0 을 내려보내지 않는다** — 메뉴가 사라지는 방향의 거짓이기 때문이다.

**이 도메인의 최악 실패 모드는 둘이다**: **'답변했다고 표시됐는데 후원자는 아무것도 받지 못한 상태'**(EP-03 검증 5 가 막는다)와 **'견적을 발행했다고 표시됐는데 견적이 없는 상태'**(EP-04 검증 6 이 막는다). 마감이 있는 판매라(§7.4) 둘 다 **되돌릴 시간이 없다** — 후원자는 기다리지 않는다.

### 7.14 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **비가역 액션에 확인 게이트가 없다** — 종결·견적 발행·최초 답변이 한 번의 클릭으로 끝난다. `ConfirmDialog` 가 이 화면에 0건이다(유일한 다이얼로그는 이탈 가드의 `discard`)(quality-bar FEEDBACK-02 P0) | UI 기획 · 프론트 구현 (최우선) |
| 2 | **EP-03·EP-04 에 멱등키가 전달되지 않는다** — 자리(`crud.ts:243,354-355`)와 원장(`:193`)이 있는데 호출부가 비어 있다. `submitLockRef` 도 없다(quality-bar EXC-08 P0) | UI 기획 · 백엔드 명세 |
| 3 | **409 해소 UI 부재 + 낙관적 동시성 토큰 부재**(§7.12) — **같은 도메인의 프로그램 폼(FS-074)이 이미 그 UI 를 갖고 있어 옮겨 오기만 하면 된다**(quality-bar EXC-04 P0) | UI 기획 · 백엔드 명세 |
| 4 | **서버 소유 필드를 요청 바디에서 제거**(§7.6 안 A) — 특히 `answeredAt`·`quoteId`·**`topic`** | **백엔드 명세 (최우선)** · UI 기획 |
| 5 | **경과 기준일이 하드코딩이다**(§7.4 말미) — `TODAY = '2026-07-21'`(목록 `:77` · 상세 `:70`). **프로그램 도메인은 이 상수를 다섯 파일에 복제해 갖고 있다.** 서버 기준 시각을 응답에 실어야 한다 | 백엔드 명세 · 프론트 구현 |
| 6 | **문의 유형(topic) 재분류 계약이 없다**(§7.3) — 축의 존재 이유가 '처리하는 사람이 다르다'인데 잘못 분류된 문의를 옮길 수단이 없다. 재분류 API 를 열지, 접수 시점 사실로 동결할지 판단이 필요하다 | **아키텍처 (도메인 · 선행 판단)** · UI 기획 |
| 7 | **이 라우트가 어떤 엔타이틀먼트 모듈에도 매핑돼 있지 않다**(§7.8) — 프로그램 트리 전체가 `MODULE_RESOURCES` 에 없다. 상용 판단인지 누락인지 확정이 필요하다(상품 문의는 `commerce.products` 소속이다) | **아키텍처 (상용 패키징)** |
| 8 | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다**(§7.2) — 부재가 코드로 강제되지 않는다 | UI 기획 쪽 변경 요청 |
| 9 | **견적 발행에 별도 권한 분기가 프론트에 없다**(§7.5) — `canUpdate` 하나가 답변과 발행을 함께 지배한다 | UI 기획 · 백엔드 명세 |
| 10 | **견적이 후원으로 이어졌는지 잇는 계약이 없다**(§7.5) — 문의 → 견적까지는 배선돼 있으나 그 견적이 실제 후원·펀딩 달성으로 반영되는 경로가 없다. **PG 를 끈 운영에서 이것이 매출 인식의 끊긴 지점이다** | **아키텍처 (선행)** · 백엔드 명세 |
| 11 | **다건 발행이 원자적이지 않다**(§7.5) — 프론트의 `for await` 루프가 EP-04 한 번으로 대체돼야 한다. **채널 혼합 검증도 서버가 해야 한다**(EP-04 검증 5) | 백엔드 명세 · UI 기획 |
| 12 | **개인정보 마스킹·목록 응답 축소**(§7.9 · §7.11) — 연락처 원본이 목록 응답에까지 실린다 | 백엔드 명세 |
| 13 | 목록 페이징 + **두 건수 배지의 서버 산출**(§7.11) — quality-bar IA-04 P0 와 한 배치로. 배지가 둘이라 상품 문의보다 계약이 하나 더 필요하다 | 백엔드 명세 · UI 기획 |
| 14 | **견적 역링크가 끊어질 수 있다** — 견적이 삭제돼도 `quoteId` 가 남아 링크가 404 로 가고 `quoteIssueBlock` ②가 **재발행도 막는다**. 견적 삭제가 참조 문의를 검사해야 한다 | **백엔드 명세 (연동)** |
| 15 | **답변 시각이 클라이언트 시계다**(§7.6) — 서버가 찍어야 한다 | 백엔드 명세 |
| 16 | `programName` 이 비정규화 스냅숏이라(`_shared/store.ts:51-52`) 프로그램명이 바뀌어도 과거 문의는 옛 이름을 보인다. **프로그램 저장소는 카테고리 라벨을 전파하는데 문의의 프로그램명에는 대응물이 없다** | 아키텍처 (도메인) · 백엔드 명세 |
| 17 | 400/422 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다(quality-bar EXC-07 P1) | UI 기획 |
| 18 | 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 · 401 리다이렉트가 미저장 답변을 버린다(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | UI 기획 · 프론트 구현 |
| 19 | **상품 문의와 이 모듈이 사실상 같은 계약을 두 벌 갖는다**(BE-073 §7.13 #17). 실제 차이는 **유형 축 · SLA 임계 · 엔타이틀먼트 매핑 · 낱말** 넷뿐이다. **서버에서 한 리소스로 합칠지 두 리소스로 둘지 판단이 선행돼야 한다** — 합치면 `topic` 이 상품 쪽에서 영원히 비고, 나누면 세 문의 도메인의 지표가 계속 합쳐지지 않는다 | **아키텍처 (선행 판단)** |

## 8. 자기 점검

- [x] FS-076 §5 요소가 전부 엔드포인트로 커버됐다 — **심 있는 4건(EP-01·02·03·04) 매핑 완료.** 심 없는 엔드포인트를 **0건 발명했다**(등록·삭제는 §7.2 에서 '계약 없음'으로 판정, **잔여 문의 집계는 심이 없어 §6 에 동기 seam 으로만 적었다**)
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 에 사유 (4행 × 9열)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한 고유 차이 2건**(`operator` 쓰기 허용 · 발행은 견적 create 권한 추가)·**타임아웃(발행 10초)**·**엔타이틀먼트 매핑 부재** 만 근거와 함께 기술
- [x] **전이 가드 표를 판정 순서 그대로 들어 올리고 거절 사유 문자열을 그대로 적었다**(§3). 화면의 존재 조건과 저장의 거절이 **같은 술어**를 읽는지 코드로 확인해 §7.1 에 표로 남겼다 — 네 동작 전부 일치
- [x] **생성·삭제를 '범위 밖'으로 판정**하고 코드 네 겹으로 근거를 댔다(§7.2). **그러나 `topic` 재분류는 같은 결로 판정하지 않고 미결로 남겼다** — 코드가 그 부재를 정당화하지 않기 때문이다(§7.3)
- [x] 멱등성 판정 — 조회 GET 멱등 / **견적 발행의 멱등키를 `quoteId`(문의 id 교차 확인)로 이름 지어 지목**하고 세 겹의 위치를 표로 적었다(§7.5). **답변·상태 저장에는 멱등키가 없다**는 사실을 §7.12 · §7.14 #2 에 정직하게 남겼다
- [x] **미배선 seam 을 §7.13 의 표로 정리**하고 조용한 거짓 성공 금지 규약을 이 도메인의 실패 모드로 번역했다
- [x] **PG 축과의 연결을 【경계 판정】으로 남겼다**(§7.7) — `INQUIRY_PATH.program` 으로 유입되는 사실, 결제 축이 **fail-closed** 인 방향, **마감이 있는 판매라 이 결합이 상품보다 무겁다**는 차이
- [x] **엔타이틀먼트 매핑 부재를 코드로 확인**하고(§7.8) 상품 문의와 갈리는 지점임을 명시했다 — fail-open 규약의 결과이지 누락의 증거는 아니되, 상용 판단 여부는 미결로 남겼다
- [x] **동시성을 last-write-wins 로 단정**하고(토큰 grep 0건) `crud.ts:256-258` 의 존재 기반 409 를 함께 적었다(§7.12)
- [x] 보안 판정 3건 이상 — **403 vs 404 은닉 + 마스킹 주체 + `topic` 의 민감도 + 비밀글 축 부재(§7.9)** · **서버 소유 필드 위조(§7.6 — `topic` 조작이 담당을 바꾼다)** · 정합 판정(§7.1 · §7.5 · §7.12) · 경계 판정(§7.3 유형 축 · §7.4 SLA · §7.7 PG · §7.8 엔타이틀먼트)
- [x] **상품 문의(BE-073)와 다른 넷을 계약으로 만들었다** — 유형 축(§7.3) · SLA 임계(§7.4) · 엔타이틀먼트 매핑 부재(§7.8) · 낱말/채널(§3 · EP-04 검증 5). 같은 것은 되풀이하되 이 도메인의 근거로 다시 말했다
- [x] **확인하지 못한 것을 쓰지 않았다** — 유형 재분류·집계 엔드포인트·비밀글 축·견적→후원 반영은 코드에 없어 '없다'고 쓰고 미결로 남겼다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
