---
id: BE-050
title: "견적 백엔드 기능 명세"
functionalSpec: FS-050
owner: 백엔드 명세
reviewer: 명세 리뷰
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# BE-050. 견적 백엔드 기능 명세

## 1. 개요

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-050 견적 (`/sales/quotes` · `/new` · `/:id/edit`) |
| 범위 | 견적 목록 조회, 견적 상세 조회, 견적 등록, 견적 수정, 견적 삭제, **수주 전환**, **문의 → 견적 발행**(BE-051 공동) |
| **범위 밖** | **수주(주문) 도메인** — 심(`data-source.ts:143`)이 '견적을 수주(주문)로 복사'를 예고하나 **그 대상 도메인이 존재하지 않는다**(§7.5). **견적서 발송(이메일·팩스)** — 상태 `sent` 는 사람이 고르는 select 일 뿐 발송 코드가 0건이다(§7.5). **견적서 PDF 생성** — `QuotePreview` 는 화면 안 문서 레이아웃일 뿐 print/PDF 진입점이 없다(§7.6). **일괄 삭제 전용 계약** — 심이 없다(§4 EP-08 · §7.5). **거래처 참조 무결성** — 견적이 거래처를 **이름 문자열**로만 들고 FK 가 없다(§7.6) |
| 전제 | BE-003 §2·§3 을 상속한다. 인증은 세션 쿠키 기반. 모든 경로는 `/api` 프리픽스. 응답 본문은 `application/json; charset=utf-8`. 시각은 ISO 8601(오프셋 포함), 달력일은 `'YYYY-MM-DD'` 문자열 |
| 프론트 어댑터 | `apps/admin/src/pages/sales/quotes/data-source.ts` (`quoteAdapter` — **`createStoreAdapter`** 로 조립. 형제 화면과 다르다 — §1.1) |
| 도메인 타입 | `apps/admin/src/pages/sales/quotes/types.ts` · 원화·사업자번호 `apps/admin/src/pages/sales/_shared/business.ts` |
| 검증 정본 | `apps/admin/src/pages/sales/quotes/validation.ts` (`quoteSchema` — zod/mini). **금액 계산의 정본은 `types.ts:131-158`**(`lineSupply`·`computeTotals`) |

> **에러 봉투·권한 모델 상속**: BE-003 §2·§3 을 그대로 상속한다(BE-026 §2 · BE-049 §2 와 동일 선언). 아래는 견적 고유 차이만 기술한다.

### 1.1 코드 대조 근거표

| 판정 대상 | 코드 근거 | 확인 결과 |
|---|---|---|
| 어댑터 팩토리 | `data-source.ts:144` `createStoreAdapter<Quote, QuoteInput>({ scope: 'sales-quotes', list, getOne, add, update, remove })` | **형제(FS-048·049)의 `createCrudAdapter` 가 아니다.** 모듈 지역 배열(`:78`)을 **저장소로 노출**하고 그 위에 어댑터를 얹는다. 이유를 `:6-9` 가 밝힌다: **문의 어댑터가 견적을 꽂아야 해서** — 클로저에 가둘 수 없다 |
| 연동 심 (CRUD) | `data-source.ts:142` `// TODO(backend): GET/POST /api/sales/quotes · GET/PUT/DELETE /api/sales/quotes/:id` | EP-01~05 의 근거 |
| 연동 심 (수주 전환) | `data-source.ts:143` `· POST /api/sales/quotes/:id/convert (수주 전환 — 견적을 수주(주문)로 복사)` | **심 있음.** 그러나 **화면이 그것을 부르지 않는다** — `useCrudRowUpdate` 로 PUT 을 보낸다(§4 EP-06 · §6) |
| 연동 심 (문의 발행) | `data-source.ts:132-133` `// TODO(backend): POST /api/sales/inquiries/:id/issue-quote — 서버가 문의 잠금 + 견적 생성 + 역링크 설정을 한 트랜잭션으로 처리하고, 이미 발행된 문의면 409 로 거절한다.` | **심 있음.** 심은 이 파일에 있으나 **경로가 문의 쪽**이라 **BE-051 과 공동 소유**(§4 EP-07) |
| 일괄 삭제 심 | `data-source.ts` 전수 | **없다** — §4 EP-08 · §7.5 |
| 404 발생 | `data-source.ts:98` `throw new HttpError(HTTP_STATUS.notFound, '견적을 찾을 수 없습니다.')` + `crud.ts:192-194`(어댑터) | **이중 가드.** 저장소가 먼저 던져 문구가 이긴다. `useCrudForm` 의 `isNotFound` 분기가 발현된다(EXC-12 성립) |
| 409 발생 | `data-source.ts:108-110`(update) · `:117-119`(remove) + `crud.ts:219-221,232-234`(어댑터) | **이중 가드이나 둘 다 '존재 여부' 기반**이다. `version`/`ETag` 비교가 아니다 — §7.1 |
| 멱등키 | `crud.ts:168,201,208` · `useCrudForm.ts:118-123,228,235` | **폼 저장에만 도달**한다. 삭제(`useCrudList.tsx:102`)와 **수주 전환**(`useCrudRowUpdate.ts:45`)은 키 없이 온다 |
| 낙관적 동시성 토큰 | `types.ts:25-49` `Quote` 필드 전수 | `version`·`updatedAt`·`etag` **없음** — §7.1 |
| **금액 저장 여부** | `types.ts:25-49` 전수 · `:7` 주석 | **`supply`·`vat`·`total` 필드가 없다.** 저장되는 것은 `items[{quantity, unitPrice}]` 와 `taxMode` 뿐 — **합계는 클라이언트 파생값**이다(§3). 클라이언트가 금액을 계산해 **보내지 않는다** — 신뢰 경계상 **옳은 설계**다(§7.2) |
| **세액 규칙** | `types.ts:148-158` `vat += Math.round(amount * rate)` (루프 안) | **라인별 반올림 후 합산.** 총액 반올림이 아니다. 테스트가 고정한다(`quotes.test.ts:52-58`) — **서버가 같은 규칙을 써야 한다**(§7.2) |
| 상태 전이 규칙 | `types.ts` 전수 · `validation.ts` 전수 | **없다.** `canConvertToOrder`(`types.ts:127-129`)는 **목록 버튼의 표시 조건일 뿐** 폼 select 를 좁히지 않는다 — §7.5 |
| 만료 판정 | `types.ts` 전수 | **없다.** 계약(FS-049)의 `isRenewalDue`/`daysRemaining` 같은 파생이 이 도메인에 **존재하지 않는다** — `validUntil` 은 표시용 문자열이다(§7.5) |
| 사업자번호 검증 | `validation.ts:26` `accountBizNo: z.string()` ↔ `business.ts:29-42` `isValidBizNo` | **체크섬 검증기가 실재하는데 소비되지 않는다** — 아무 문자열이나 통과한다(§7.7) |
| 견적번호 채번 | `data-source.ts:82-86` `nextQuote` · `types.ts:206-209` `makeQuoteNo` | `seq` 가 **프로세스 지역 카운터**(`:79`) — 서버가 정본이어야 한다(§3 · §7.7) |
| **`quoteNo` 필수 ↔ readOnly 모순** | `validation.ts:24` `requiredText('견적번호', 40)` ↔ `QuoteFormPage.tsx:122`(`''`)·`:295`(`readOnly`) | **신규 등록이 클라이언트 검증에서 막힌다 — 요청이 서버에 도달하지 않는다.** 프론트 결함이나 **서버 계약에 영향**한다(§7.7 — 채번 주체 판정) |
| 거래처 참조 | `types.ts:29` `readonly accountName: string` | **FK 가 아니다.** 사업자번호·대표자도 견적이 자기 사본을 갖는다(`:31-32`) — §7.6 |
| 쓰기 권한 게이팅 | `useRouteWritePermissions` grep — 소비처 9곳 | `pages/sales/**` **없음** — §7.3 |
| 인라인 쓰기 | `QuoteListPage.tsx:94,143-168` | **`useCrudRowUpdate` 를 쓴다** — 계약(FS-049)과 달리 목록에 인라인 쓰기가 **있다**('수주 전환'). 그 409 는 일반 토스트로 뭉개진다(§7.1) |
| 공급자(자사) 정보 | `types.ts:66-72` `SUPPLIER` (`as const`) | **하드코딩 상수.** 주석이 '연동 시 회사 설정에서 주입한다'고 자백한다 — §7.6 |

## 2. 공통 (상속)

- **에러 봉투**: BE-003 §2. 공통 에러코드 동일(`VALIDATION_FAILED` · `UNAUTHENTICATED` · `FORBIDDEN` · `CSRF_TOKEN_INVALID` · `NOT_FOUND` · `CONFLICT` · `UNPROCESSABLE` · `RATE_LIMITED` · `INTERNAL_ERROR` · `REQUEST_TIMEOUT`).
- **권한**: `admin` = 전체. `operator` = **조회 계열(목록·상세) 전용** — 등록·수정·삭제·수주 전환은 **403**(§7.3). 영업 도메인 읽기 권한 없는 관리자 → 컬렉션 **403** / 개별 견적 **404 은닉**(§7.3).
- **CSRF**: 쓰기(POST · PUT · DELETE)에 `X-CSRF-Token`.
- **타임아웃**: 조회·쓰기 5초 → 504.
- **프론트 역할 분기 없음**(FS-050 §4.1) — 권한 강제는 서버 책임. 프론트에 쓰기 게이팅이 배선돼 있지 않다(FS-050 §7 #4)는 사실이 이 원칙을 **바꾸지 않는다** — 오히려 서버가 유일한 방어선임을 뜻한다(§7.3).

## 3. 데이터 계약 (`types.ts` 대조)

| 타입 | 필드 | 비고 |
|---|---|---|
| `Quote` | `id` · `quoteNo`('Q-YYYYMMDD-NNN') · `accountName`(**FK 아님 — §7.6**) · `accountBizNo` · `accountCeo` · `contactName` · `issueDate`·`validUntil`('YYYY-MM-DD') · `taxMode` · `items[]` · `status` · `note` · `inquiryId` · `inquiryNo` · `inquiryBody` | 목록·상세가 **같은 타입**이다 — 목록도 `items` 전문·`note`·`inquiryBody` 를 받는다(§7.8). **금액 합계 필드가 없다**(아래) |
| `QuoteLineItem` | `id` · `name` · `spec` · `quantity` · `unitPrice` | **`supply`(공급가액)를 저장하지 않는다** — `types.ts:7` 주석: '공급가액은 저장하지 않고 수량·단가에서 파생한다(단일 원천)' |
| `QuoteInput` | `Omit<Quote, 'id'>` | 등록·수정이 같은 입력을 쓴다. **전체 치환**이다. **승계 3필드(`inquiryId`·`inquiryNo`·`inquiryBody`)가 포함된다** — 클라이언트가 되돌려 보낸다(§7.4) |
| `QuoteTaxMode` | `standard`(10%) \| `zero_rated`(0%) \| `exempt`(0%) | **영세율과 면세는 rate 가 둘 다 0** 이라 계산 결과가 같다(`types.ts:82-83`) — 라벨만 다르다. 세무 신고에서는 구분이 필요하다 |
| `QuoteStatus` | `draft` \| `sent` \| `accepted` \| `rejected` \| `expired` \| `ordered` | 작성중→발송→승인/반려, 만료, 수주전환. **전이 규칙 없음**(§7.5) |
| `QuoteInheritance` | `inquiryId` · `inquiryNo` · `company` · `customerName` · `body` · `issueDate` | 문의 → 견적 승계 값의 **단일 정의**(`types.ts:226-237`). EP-07 의 입력 |
| 상수 | `QUOTE_ITEM_NAME_MAX = 60` · `QUOTE_MAX_ITEMS = 30` · `QUOTE_NOTE_MAX = 500` · `QUOTE_VALID_DAYS = 30` | `types.ts:61-63,212` |
| `SUPPLIER` | `name` · `bizNo` · `ceoName` · `address` · `phone` | **하드코딩 상수**(`types.ts:66-72`) — 서버가 회사 설정에서 내려줘야 한다(§7.6) |

**서버가 정본인 필드 (프론트 요청을 믿지 않는다)**

| 필드 | 정본 | 근거 |
|---|---|---|
| `id` | 서버 채번 | 픽스처는 `qt-<seq>`(`data-source.ts:85`) — 프로세스 지역 카운터라 계약이 아니다 |
| **`quoteNo`** | **서버 채번** | 픽스처가 `input.quoteNo.trim() === ''` 이면 `makeQuoteNo(issueDate, seq)`(`:84`). `types.ts:246` 주석이 '**사람이 정하지 않는다**'고 못박는다. **서버가 유일한 채번 주체여야 한다** — §7.7 |
| `createdAt` / `updatedAt` / `version` | 서버 | **현재 타입에 없다.** §7.1 이 `version` 을 계약에 넣을 것을 요구한다 |
| **`inquiryId` / `inquiryNo` / `inquiryBody`** | **서버(발행 시점 고정)** | 현재 **클라이언트가 폼에 싣고 되돌려 보낸다**(`QuoteFormPage.tsx:155-157`) — 서버가 이를 믿으면 견적을 아무 문의에 갖다 붙일 수 있다. **§7.4 이 이를 판정한다** |
| `status` 전이 | 서버 | 현재 규칙이 아예 없다 — §7.5 |
| `SUPPLIER`(공급자 정보) | 서버(회사 설정) | 현재 프론트 하드코딩 — §7.6 |

**클라이언트 파생값 — 서버 계약 아님(✕)**

| 값 | 산출 | 근거 |
|---|---|---|
| **공급가액 합계(`supply`)** | `Σ(quantity × unitPrice)` | `types.ts:148-158` `computeTotals`. **순수 함수 — 서버가 내려주지 않고 클라이언트가 보내지도 않는다** |
| **부가세(`vat`)** | `Σ round(라인공급가액 × rate)` — **라인별 반올림 후 합산** | `types.ts:155`. **문서 규칙이며 테스트가 고정한다**(`quotes.test.ts:52-58`). **✕ 서버 계약이 아니나 §7.2 가 이것을 계약으로 승격할 것을 요구한다** |
| **합계금액(`total`)** | `supply + vat` | `types.ts:157` |
| 라인 공급가액(`lineSupply`) | `quantity × unitPrice` | `types.ts:134-136`. 표시 전용 |
| 상태 라벨·톤(`quoteStatusMeta`) | `STATUS_META` 조회 | `types.ts:113-124`. 표시 전용 |
| 과세유형 라벨(`taxModeLabel`)·세율(`taxRateOf`) | `TAX_MODE_OPTIONS` 조회 | `types.ts:80-92`. **세율이 프론트 상수다** — §7.2 |
| 수주 전환 가능 여부(`canConvertToOrder`) | `status === 'accepted'` | `types.ts:127-129`. **표시 규칙이다** — 서버 계약에 없고 폼 select 도 좁히지 않는다(§7.5) |
| 승계 여부(`isInherited`) | `inquiryId !== ''` | `types.ts:57-59`. 표시·잠금 규칙 |
| 원화 표기(`formatWon`)·사업자번호 표기(`formatBizNo`) | `business.ts:17-23,45-47` | 표시 전용 |

> **이 표가 이 문서의 핵심이다.** 견적은 금액 문서인데 **금액이 서버 계약에 없다.** 클라이언트는 `items[{quantity, unitPrice}]` 와 `taxMode` 만 보내고 합계를 보내지 않는다 — **신뢰 경계상 옳다**(§7.2). 서버는 같은 입력에서 같은 규칙으로 재계산하면 되고, 그 규칙이 §7.2 의 계약이다.

**검증 규칙 (`quoteSchema` — 서버가 재판정한다)**

| 필드 | 규칙 | 위반 시 |
|---|---|---|
| **`quoteNo`** | **`requiredText('견적번호', 40)` — 공백 불가 · ≤40자** | **⚠ 이 규칙이 프론트를 막는다.** 입력이 `readOnly` + 초기값 `''` 이라 **신규 등록이 클라이언트 검증에서 멈춘다**(FS-050 §7 #2). **서버는 이 필드를 요청에서 받지 않아야 한다** — §7.7 |
| `accountName` | 공백 불가 · ≤60자 | 400 `VALIDATION_FAILED`. **화면에 `maxLength` 가 없어** 61자를 치면 제출 시점에야 안다 |
| `contactName` | `trim().length <= 40` | 400. 필수 아님 |
| `accountBizNo` | **`z.string()` — 검증 전무** | **`isValidBizNo`(`business.ts:29-42`)가 실재하는데 쓰이지 않는다.** 서버가 체크섬을 강제해야 한다 — §7.7 |
| `accountCeo` | **제약 없음**(`z.string()`), `maxLength` 없음 | 서버가 상한을 정해야 한다 — §7.7 |
| `issueDate`·`validUntil` | `/^\d{4}-\d{2}-\d{2}$/` + 실재 날짜 + `validUntil >= issueDate` | 400. **`validUntil === issueDate`(당일 만료)가 통과한다** — §7.7 |
| `items` | **배열 단위 4분기 순차**(`validation.ts:48-86`): ① 1개 이상 ② 모든 행 `name.trim() !== ''` ③ 모든 행 `Number.isInteger(quantity) && quantity >= 1` ④ 모든 행 `unitPrice >= 0` | 400. **각 분기가 `return` 하므로 한 번에 한 문구**이고 **어느 행인지 말하지 않는다.** 스키마 헤더(`:3-4`)가 '라인 인덱스를 포함해 알린다'고 약속하나 **구현이 그러지 않는다** — §7.7 |
| `items[].quantity`·`unitPrice` | **상한 없음** | `toDigits`(`QuoteLineItemsTable.tsx:84-87`)가 음수·소수를 UI 에서 차단하나 **스키마는 `z.number()` 라 어떤 값이든 통과**한다. 서버가 상한을 정해야 한다 — §7.7 |
| `items[].spec` | **제약 없음**(`z.string()`) | 서버가 상한을 정해야 한다 |
| `items[].id` | **`z.string()`** | 클라이언트가 `li-new-<Date.now()>-<난수>` 로 만든다(`:89-95`) — **서버가 채번해야 한다**(§7.7) |
| `taxMode`·`status` | `z.enum` | 400 |
| `note` | `trim().length <= 500` | 400 |
| **`inquiryId`·`inquiryNo`·`inquiryBody`** | **`z.string()` — 검증 전무**(`validation.ts:39-41`) | **클라이언트가 아무 값이나 넣을 수 있다.** 주석(`:38`)이 '승계 값 — 사람이 편집하지 않는다'고 하나 **스키마가 그것을 강제하지 않는다** — §7.4 |
| **상태 전이** | **스키마에 없다** — 어느 상태에서 어느 상태로도 갈 수 있다 | 서버가 정본을 세워야 한다 — §7.5 |
| **금액 합계** | **스키마에 없다** — 필드 자체가 없다 | **옳다.** 서버가 `items` 에서 재계산한다 — §7.2 |

## 4. 엔드포인트 명세

### BE-050-EP-01 · 견적 목록 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-006, EL-007, EL-009, EL-009.1~.12, EL-010, EL-011, EL-015, EL-016, EL-045 |
| 메서드·경로 | `GET /api/sales/quotes` |
| 근거 (심) | `data-source.ts:142` |
| 권한 | `admin`, `operator` |
| 멱등성 | 멱등(GET) |
| 페이징 | **없음 — 현재 견적은 전량 반환이다**(§7.8) |
| 레이트리밋 | 분당 120회 |

**쿼리**: **없다.** 프론트가 상태 필터·검색·정렬을 **전부 클라이언트에서** 수행하므로(`QuoteListPage.tsx:96-99`) 어댑터 시그니처 `fetchAll(signal)` 이 파라미터를 받지 않는다.

**응답 200** — `readonly Quote[]`. **견적일 내림차순**(같은 날짜는 `quoteNo` 내림차순 — `types.ts:179-184`)으로 내려준다. 서버 순서가 정본이어야 페이징 도입 시(§7.8) 계약이 유지된다.

> **합계금액을 내려줄 것인가**: **현재 계약은 내려주지 않는다** — 프론트가 `computeTotals(item.items, item.taxMode)` 로 **행마다 계산한다**(`QuoteListPage.tsx:128`). 페이징·정렬(§7.8)이 도입되면 '합계금액 순 정렬'이 서버 기능이 되고, 그때 `QuoteSummary.total` 이 **서버 계산 필드로 승격**된다 — §7.2 의 세액 규칙이 그 전제다.

**에러**: 401 · 403 · 429 · 500 · 504.

---

### BE-050-EP-02 · 견적 등록
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-004, EL-021~EL-034, EL-036, EL-040, EL-041, EL-044, EL-046 |
| 메서드·경로 | `POST /api/sales/quotes` |
| 근거 (심) | `data-source.ts:142` |
| 권한 | `admin` 만 (§7.3) |
| 멱등성 | **멱등키로 멱등**(`Idempotency-Key: <uuid>`) — 키는 `useCrudForm.ts:118-123` 이 제출 **시도** 단위로 만들어 variables 로 싣고(`:235`), 어댑터가 `WriteContext.idempotencyKey`(`crud.ts:41,201`)로 받는다 |
| 레이트리밋 | 분당 60회 |

**바디**: `QuoteInput` 전체. **`id` 와 `quoteNo` 는 서버가 채번한다**(§7.7) — 요청의 `quoteNo` 를 **무시하거나 400 으로 거절한다.**

> **⚠ 현재 이 엔드포인트는 프론트에서 호출되지 않는다.** `quoteSchema` 가 `quoteNo` 를 필수로 요구하는데 폼이 그것을 채울 수 없어 **클라이언트 검증에서 멈춘다**(FS-050 §7 #2). 즉 **`POST /api/sales/quotes` 는 연동 시점에 처음으로 실제 트래픽을 받는다** — 그 전에 프론트 결함이 고쳐져야 한다(§7.7 · §7.9 #2). **연동 산정에서 이 선후를 빠뜨리면 '등록이 안 된다'가 백엔드 탓으로 오인된다.**

**서버 검증**: §3 의 규칙 전건 재판정 + `quantity`·`unitPrice`·자유 텍스트의 상한(§7.7) + `accountBizNo` 체크섬(§7.7) + `status` 초기값 제약(§7.5) + **`inquiryId` 승계 필드 거절**(§7.4) + **`items[].id` 재채번**(§7.7).

**응답 201** — 프론트 `create(input, context): Promise<void>` 는 **응답 본문을 읽지 않는다**. 성공 시 목록을 무효화하고(`crud.ts:290-292`) `/sales/quotes` 로 이동한다. `Location` 헤더에 새 리소스 경로를 실어야 한다 — 프론트가 지금 쓰지 않을 뿐 계약의 일부다. **채번된 `quoteNo` 를 본문으로 돌려주는 것이 옳다** — 목록 재조회로 보이긴 하나 계약상 명시한다.

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **422 `INVALID_STATUS_TRANSITION`**(§7.5 — 초기 상태 제약) · **422 `INHERITANCE_NOT_ALLOWED`**(§7.4 — 승계 필드를 실은 수동 등록) · 429 · 500 · 504.

---

### BE-050-EP-03 · 견적 상세 조회
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-021~EL-034, EL-037 |
| 메서드·경로 | `GET /api/sales/quotes/:id` |
| 근거 (심) | `data-source.ts:142` |
| 권한 | `admin`, `operator`. 영업 도메인 읽기 권한 없음 → **404 은닉**(§7.3) |
| 멱등성 | 멱등(GET) |
| 레이트리밋 | 분당 120회 |

**응답 200** — `Quote`(품목 전문·승계 필드 포함). **`version` 을 함께 내려준다**(§7.1).

> **어댑터 요구사항 충족**: `fetchOne` 은 이미 `HttpError(404)` 를 던진다 — **저장소(`data-source.ts:98`)와 어댑터(`crud.ts:192-194`) 양쪽에서**. FS-050-EL-037 의 404/5xx 분기가 실제로 발현된다(EXC-12 성립). 백엔드 연결 시 이 동작을 **유지**해야 한다.

**에러**: 400(id 형식) · 401 · **404 `QUOTE_NOT_FOUND`**(없거나 읽기 권한 없음 — §7.3) · 429 · 500 · 504.

---

### BE-050-EP-04 · 견적 수정
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-021~EL-034, EL-036, EL-038, EL-040, EL-041, EL-043, EL-044 |
| 메서드·경로 | `PUT /api/sales/quotes/:id` |
| 근거 (심) | `data-source.ts:142` |
| 권한 | `admin` 만 (§7.3). 영업 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **멱등키로 멱등** |
| 레이트리밋 | 분당 60회 |

**바디**: `QuoteInput` 전체 + **`version`**(§7.1) + `If-Match` 헤더(택1). **부분 갱신(PATCH)이 아니라 전체 치환**이다 — `items` 배열도 통째로 실린다.

**서버 검증**
1. **불변 필드**: `id` · **`quoteNo`**(채번 후 불변 — §7.7) · **`inquiryId`·`inquiryNo`·`inquiryBody`**(발행 시점 고정 — §7.4). 요청이 이 값들을 바꾸려 하면 **무시하거나 422**.
2. **낙관적 동시성**: `version` 불일치 → **409**(§7.1).
3. **상태 전이**: 저장된 `status` → 요청 `status` 가 허용 전이인지 **서버가 재판정**한다(§7.5). 위반 시 422.
4. **금액 재계산**: `items` 로부터 `supply`·`vat`·`total` 을 **서버 규칙(§7.2)으로 재계산**한다. 클라이언트가 합계를 보내지 않으므로 믿을 것이 없다 — **그것이 이 계약의 강점이다**.
5. §3 의 규칙 전건 재판정.

**응답 200/204** — 프론트 `update(id, input, context): Promise<void>` — 응답 본문을 읽지 않고 목록·상세를 무효화한다(`crud.ts:312-315`).

**에러**: 400 `VALIDATION_FAILED`(`error.fields`) · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `QUOTE_NOT_FOUND`** · **409 `CONFLICT`**(version 불일치 — §7.1) · **422 `INVALID_STATUS_TRANSITION`**(§7.5) · **422 `QUOTE_LOCKED`**(수주 전환된 견적의 금액 변경 — §7.5) · 429 · 500 · 504.

---

### BE-050-EP-05 · 견적 삭제
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-009.11, EL-012 |
| 메서드·경로 | `DELETE /api/sales/quotes/:id` |
| 근거 (심) | `data-source.ts:142` |
| 권한 | `admin` 만 (§7.3). 영업 도메인 읽기 권한 없음 → **404 은닉** |
| 멱등성 | **멱등키 없이 온다**(`useCrudList.tsx:102`). 이미 없는 id 는 409 를 준다(`data-source.ts:117-119`)라 엄밀히는 멱등이 아니다 — §7.5 |
| 레이트리밋 | 분당 60회 |

**서버 검증**: **상태 기반 제약** — 수주 전환된(`ordered`) 견적은 **삭제할 수 없다**(§7.5). 위반 시 **409 `QUOTE_IN_USE`**. **문의에서 발행된 견적(`inquiryId !== ''`)을 지울 때는 문의의 `quoteId` 를 함께 끊어야 한다**(§7.4) — 같은 트랜잭션.

**응답 204**.

**에러**: 400 · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · **404 `QUOTE_NOT_FOUND`** · **409 `CONFLICT`**(이미 삭제 — 현재 어댑터 동작) · **409 `QUOTE_IN_USE`**(§7.5) · 429 · 500 · 504.

---

### BE-050-EP-06 · 수주 전환 — **심 있음, 그러나 화면이 부르지 않는다**
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-009.10 |
| 메서드·경로 | `POST /api/sales/quotes/:id/convert` |
| 근거 (심) | **`data-source.ts:143`** `· POST /api/sales/quotes/:id/convert (수주 전환 — 견적을 수주(주문)로 복사)` |
| 권한 | `admin` 만 (§7.3) |
| 멱등성 | **현재 키가 오지 않는다**(`useCrudRowUpdate.ts:45`) — §7.5 가 이를 판정한다 |
| 레이트리밋 | 분당 60회 |

**⚠ 심과 구현이 어긋난다 — 이 문서가 정하는 핵심 중 하나다.**

- **심이 약속하는 것**: '견적을 수주(주문)로 **복사**' — 즉 **주문 리소스를 생성**하는 전용 쓰기다.
- **화면이 실제로 하는 것**: `useCrudRowUpdate` 로 **`PUT /api/sales/quotes/:id` 에 `{...toQuoteInput(item), status: 'ordered'}`** 를 보낸다(`QuoteListPage.tsx:152-160`). 즉 **EP-04 를 부른다.** 상태 문자열만 바뀌고 **주문은 만들어지지 않는다.**
- **주문(수주) 도메인이 존재하지 않는다** — `apps/admin/src/pages/sales/**` 전수에 주문 화면·타입·어댑터가 없고 `nav-config.ts:155-161` 의 영업 관리 잎 6개에도 없다.

**판정**: **이 문서는 EP-06 의 요청/응답 본문을 확정하지 않는다** — 대상 도메인(주문)이 정의되지 않았기 때문이다. 심이 있으므로 **경로와 의도는 기록**하되, '무엇을 복사해 무엇을 만드는가'는 **아키텍처 의 도메인 경계 결정이 선행**한다(§7.5 · §7.9 #5). 이 문서가 정하는 것은 **경계 조건 둘**이다:

1. **전환은 상태 변경이 아니라 별도 쓰기다.** 그것이 주문을 만든다면 **멱등키가 필수**이고(이중 클릭 = 이중 주문), 현재처럼 PUT 로 상태만 바꾸는 것은 **심의 의도가 아니다.**
2. **전환의 전제는 서버가 재판정한다** — `canConvertToOrder`(`types.ts:127-129`)는 **프론트 표시 규칙일 뿐**이다. 서버는 `status === 'accepted'` 를 확인하고 아니면 **422 `INVALID_STATUS_TRANSITION`**.

**현재 계약(연동 전까지)**: 전환은 EP-04(PUT)로 나간다. 그 경로의 에러는 §5 EP-04 행을 따르되, **프론트가 409 를 일반 토스트로 뭉갠다**(`useCrudRowUpdate.ts:53`)는 사실이 §7.1 의 위험을 키운다.

---

### BE-050-EP-07 · 문의 → 견적 발행 — **심 있음 · BE-051 과 공동 소유**
| 항목 | 내용 |
|---|---|
| 근거 (FS) | FS-050-EL-047 · FS-050 §1 |
| 메서드·경로 | `POST /api/sales/inquiries/:id/issue-quote` |
| 근거 (심) | **`quotes/data-source.ts:132-133`** `// TODO(backend): POST /api/sales/inquiries/:id/issue-quote — 서버가 문의 잠금 + 견적 생성 + 역링크 설정을 한 트랜잭션으로 처리하고, 이미 발행된 문의면 409 로 거절한다.` (같은 취지의 심이 `inquiries/data-source.ts:153-155` 에도 있다) |
| 권한 | `admin` 만. **문의 쓰기 권한이 견적을 만든다** — §7.4 |
| 멱등성 | **멱등** — 이미 발행된 문의는 기존 견적을 돌려준다(현재 픽스처) 또는 409(심의 문구). §7.4 가 판정한다 |
| 레이트리밋 | 분당 60회 |

**소유 경계**: 심은 **이 화면의 `data-source.ts` 에 있으나** 경로가 문의 리소스이고 트리거가 **문의의 상태 전이**다(`inquiries/data-source.ts:124-151,163`). **BE-051 과 공동 소유**이며, 이 문서는 **견적 쪽 계약**(승계 필드·채번·초기 상태)만 정한다. 문의 잠금·타임라인 이벤트는 BE-051 이 정한다.

**바디**: 없음(문의 id 가 경로에 있다). 서버가 문의에서 승계 값을 읽는다 — **클라이언트가 `QuoteInheritance` 를 보내지 않는다**(§7.4).

**서버 처리 (한 트랜잭션)**
1. 문의 조회 · `status` 를 `quote_issued` 로 전이(BE-051 소유).
2. **이미 발행됐으면**(문의 `quoteId !== ''`) → **기존 견적을 돌려준다**(현재 픽스처 동작 — `quotes/data-source.ts:135-136`) **또는 409**(심 문구). §7.4 가 판정한다.
3. 견적 생성 — 승계 값은 **서버가 문의에서 읽는다**: 거래처←`company` · 담당자←`customerName` · `inquiryBody`←`body` · `inquiryNo` · `inquiryId`. **견적일 = 서버의 오늘**(`inquiries/data-source.ts:135` 가 `new Date().toISOString().slice(0,10)` — **UTC 달력일이다**, §7.7). **유효기간 = 견적일 + 30일**(`QUOTE_VALID_DAYS`). **품목 [] · 상태 `draft` · `quoteNo` 서버 채번**.
4. 문의의 `quoteId` 에 새 견적 id 를 설정(**역링크**) + 타임라인 이벤트(BE-051 소유).

**응답 200/201** — 생성(또는 기존) `Quote`.

**에러**: 400 · 401 · 403 `FORBIDDEN` · 403 `CSRF_TOKEN_INVALID` · 404 `INQUIRY_NOT_FOUND` · **409 `QUOTE_ALREADY_ISSUED`**(§7.4 가 이 코드의 존폐를 판정한다) · 429 · 500 · 504.

---

### BE-050-EP-08 · 견적 일괄 삭제 — **심 없음 (미정)**

FS-050-EL-013(일괄 삭제 다이얼로그)가 필요로 하는 쓰기다. **`data-source.ts` 에 이 조작의 어댑터도 `// TODO(backend)` 주석도 없다.** 프론트는 `settleAll(ids, (id) => adapter.remove(id, { signal }))`(`crud.ts:349-350`)로 **N 건의 개별 DELETE 를 병렬로** 낸다.

- 엔드포인트: **미정.** 이 문서는 `POST /api/sales/quotes/bulk-delete` 류를 **만들지 않는다** — 심이 없다.
- 판정: §7.5.

## 5. 예외 매트릭스

> EP-08 은 **심이 없어 계약이 존재하지 않으므로** 이 매트릭스에 행이 없다(§7.5). EP-06 은 **심이 있으나 본문이 미정**(주문 도메인 부재)이라 **현재 경로(EP-04 로 위임)의 관점**에서만 적는다 — §4 EP-06. 아래 7행이 이 문서가 다루는 엔드포인트 전부다.

| 엔드포인트 | 400 검증 | 401 인증 | 403 vs 404 | 404 대상없음 | 409 충돌 | 422 상태위반 | 429 과부하 | 500 오류 | 타임아웃 |
|---|---|---|---|---|---|---|---|---|---|
| EP-01 목록 | N/A — **쿼리 파라미터가 없다**(필터·검색·정렬·합계가 전부 클라이언트) | 401 → 전역 인터셉터(`queryClient.ts:38`)가 재인증으로. 화면은 목록 실패 배너(`CrudListShell.tsx:157-164`) | **403** 컬렉션 — 견적 컬렉션의 존재는 비밀이 아니다(BE-003 §3.2 원칙 1) | N/A — 0건이면 200 빈 배열 → FS-050-EL-011 빈 상태 | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 + `Retry-After` | 500 + `traceId` → 목록 실패 배너(**status 로 분기하지 않아 403·500 이 같은 문구**) | 5초 → 504 → 같은 배너 |
| EP-02 등록 | 400 `VALIDATION_FAILED` — `accountName`·`items`(1개 이상·품목명·수량·단가)·기간(형식·역전)·`note`·`contactName` 위반 + **`accountBizNo` 체크섬**(§7.7) + **`quoteNo` 를 실어 보내면 거절**(§7.7). `error.fields` 로 내려보낸다 — 프론트가 **422 만** 필드에 꽂으므로(§6.1) **400 은 배너로 뭉개진다** | 401 → 전역 인터셉터. **미저장 입력은 유실된다** — 품목 30행이면 그 전부(FS-050 §7 #42) | **403 `FORBIDDEN`** — 컬렉션 쓰기라 은닉할 개별 리소스가 없다. `operator` 도 403(§7.3) | N/A — 생성이라 대상이 없다 | N/A — 견적에 유일성 제약이 없다. **같은 거래처·같은 품목의 견적을 몇 개든 만들 수 있다**(정상 — 재견적은 흔하다). **`quoteNo` 유일성은 서버 채번이 보장한다**(§7.7) | **422 `INVALID_STATUS_TRANSITION`** — 신규 견적의 초기 `status` 는 `draft` 만 허용한다(§7.5). **현재 폼은 '수주전환'·'만료'로도 등록할 수 있다.** **422 `INHERITANCE_NOT_ALLOWED`** — 수동 등록이 `inquiryId` 를 실으면 거절(§7.4) | 429 분당 60 + `Retry-After` | 500 + `traceId` → FS-050-EL-020 배너 + 오류 코드(EXC-20 충족) | 5초 → 504 → FS-050-EL-020. **프론트 타임아웃 상한이 없어** 서버가 먼저 끊는 구간에만 의존한다. **⚠ 현재 이 엔드포인트는 프론트에서 호출조차 되지 않는다**(§7.7) |
| EP-03 상세 | 400 — id 형식 위반 | 401 → 전역 인터셉터. 화면은 FS-050-EL-037 배너 | **읽기 권한 없음 → 404 은닉**(§7.3) — 견적 1건은 거래처·품목별 단가·할인 조건을 담은 영업 기밀이다. 읽기 권한이 있는 `operator` 에게는 쓰기 거절 시 403 | **404 `QUOTE_NOT_FOUND`** — 저장소·어댑터가 **이미** `HttpError(404)` 를 던진다(`data-source.ts:98` · `crud.ts:192-194`) → FS-050-EL-037 의 '찾을 수 없습니다' + '목록으로'(재시도 없음) | N/A — 읽기 전용 | N/A — 읽기 전용 | 429 분당 120 | 500 + `traceId` → '불러오지 못했습니다' + '다시 시도' + '목록으로' | 5초 → 504 → 같은 'error' 분기 |
| EP-04 수정 | 400 `VALIDATION_FAILED` — EP-02 와 같은 규칙 + `version` 형식 + **불변 필드(`quoteNo`·승계 3필드) 변경 시도 거절**(§7.4 · §7.7) | 401 → 전역 인터셉터. 입력 유실 | **`operator` → 403**(§7.3). **읽기 권한 없음 → 404 은닉** | **404 `QUOTE_NOT_FOUND`** — 존재한 적 없는 id. 현재 저장소는 **없는 id 에 409**(`data-source.ts:108-110`) — 계약상 404 가 옳으나 **프론트 UX 는 409 쪽이 낫다**(충돌 다이얼로그가 입력을 보존한다). §7.1 이 판정한다 | **409 `CONFLICT`** — `version` 불일치(§7.1) 또는 대상 부재. 폼 경로는 `FormConflictDialog` 가 **입력을 보존한 채** '최신 내용 불러오기'/'이어서 편집'을 준다(`FormFeedback.tsx:58-74`) — **완비**. **⚠ 그러나 인라인 '수주 전환'(EP-06 이 위임된 경로)은 같은 409 를 `toast.error('변경하지 못했습니다…')` 로 뭉갠다**(`useCrudRowUpdate.ts:53`) — 복구 경로가 없다(§7.1) | **422 `INVALID_STATUS_TRANSITION`**(§7.5 — 예: `ordered` → `draft`) · **422 `QUOTE_LOCKED`**(수주 전환된 견적의 금액·품목 변경 — §7.5). 프론트가 `violations` 를 `setError` 로 필드에 꽂고 첫 위반으로 포커스한다(`useCrudForm.ts:182-192`) — **경로는 완비, 다만 `items` 경로는 꽂을 ref 가 없다**(§7.7) | 429 분당 60 + `Retry-After`. **일괄 삭제(§7.5)가 N 건을 병렬로 내므로 EP-05 쪽에 먼저 걸린다** | 500 + `traceId` → FS-050-EL-020 배너 + 입력 보존. **수주 전환 경로는 토스트** | 5초 → 504 → 위와 동일 |
| EP-05 삭제 | 400 — id 형식 위반 | 401 → 전역 인터셉터 | **`operator` → 403**(§7.3). **읽기 권한 없음 → 404 은닉** | **404 `QUOTE_NOT_FOUND`** — 현재 저장소는 **409('이미 삭제된 견적입니다.' — `data-source.ts:118`)** 를 준다. 삭제의 멱등성 관점에서는 204 가 옳고, 사용자 통지 관점에서는 409 가 낫다 — §7.5 가 판정한다 | **409 `QUOTE_IN_USE`** — 수주 전환된 견적은 지울 수 없다(§7.5). **현재 프론트에 이 제약이 없어 아무 견적이나 지운다.** 프론트는 이 409 를 다이얼로그 안 배너('삭제하지 못했습니다…')로 뭉갠다(`useCrudList.tsx:112`) | N/A — 삭제 자체에 상태 **전이**는 없다. 상태 **제약**은 409 축이 담당한다(§7.5) | 429 분당 60. **일괄 삭제가 N 건을 병렬로 낸다** — 100건 선택 = 100요청(§7.5). **⚠ 선택이 조건 변화에 해제되지 않아**(FS-050 §7 #5) 의도보다 많은 id 가 실릴 수 있다 | 500 + `traceId` → 다이얼로그 안 danger 배너, 다이얼로그 유지, 재클릭이 재시도 | 5초 → 504 → 위와 동일 |
| EP-06 수주 전환 | **본문 미정**(주문 도메인 부재 — §4 EP-06). **현재는 EP-04 로 위임**되므로 그 행의 400 을 따른다 | 401 → 전역 인터셉터. **화면은 토스트**(폼이 아니라 목록이라 배너가 없다) | **`operator` → 403**(§7.3). **현재 프론트에 게이팅이 없어** `operator` 가 버튼을 보고 누른다 → 403 이 '변경하지 못했습니다' 로 뭉개진다(§7.3) | **404 `QUOTE_NOT_FOUND`** — 현재는 EP-04 의 409 로 온다 | **409** — 다른 관리자가 먼저 지웠거나(현재 동작) `version` 불일치(§7.1). **⚠ 이 경로에는 충돌 다이얼로그가 없다** — 일반 토스트로 뭉개져 **운영자가 무엇이 충돌했는지 모른다**(§7.1) | **422 `INVALID_STATUS_TRANSITION`** — 서버가 `status === 'accepted'` 를 재판정한다. `canConvertToOrder` 는 **프론트 표시 규칙일 뿐**이다(§7.5) | 429 분당 60. **연타는 그 행의 `disabled` 로만 막힌다**(`QuoteListPage.tsx:150`) — **멱등키가 없다**(`useCrudRowUpdate.ts:45`). **주문을 만드는 계약이 되면 이중 주문의 창이 열린다**(§7.5) | 500 + `traceId` → **일반 토스트**('변경하지 못했습니다…') — **reference code 가 없다**(EXC-20 미충족 — 폼 경로만 완비) | 5초 → 504 → 같은 토스트 |
| EP-07 문의 발행 | 400 — 문의 id 형식 위반 | 401 → 전역 인터셉터. **문의 화면의 폼 배너로** | **문의 리소스의 판정을 따른다**(BE-051) — 문의 읽기 권한 없음 → 404 은닉 | **404 `INQUIRY_NOT_FOUND`** — 견적이 아니라 **문의**가 대상이다 | **409 `QUOTE_ALREADY_ISSUED`** — 심의 문구가 이를 요구한다(`data-source.ts:133`). **⚠ 그러나 현재 픽스처는 409 가 아니라 기존 견적을 조용히 돌려준다**(`:135-136`) — 심과 구현이 어긋난다. §7.4 가 판정한다 | **422 `INVALID_STATUS_TRANSITION`** — 문의의 상태 전이 규칙(BE-051 소유)이 `quote_issued` 로의 전이를 재판정한다 | 429 분당 60 | 500 + `traceId` → 문의 화면의 저장 실패 배너. **트랜잭션이라 견적만 생기고 문의가 안 바뀌는 일이 없어야 한다**(심이 이를 요구) | 5초 → 504. **⚠ 부분 실패가 가장 위험한 지점** — '상태는 견적 발행인데 견적이 없는 문의'가 남으면 `hasIssuedQuote` 가 false 라 재발행은 되나, 반대로 견적만 생기면 고아 견적이 된다(§7.4) |

## 6. 프론트 연동 대조

| data-source.ts 함수 | TODO(backend) | 엔드포인트 | 응답 | 일치 |
|---|---|---|---|---|
| `quoteAdapter.fetchAll(signal)` → `listQuotes()` | `GET /api/sales/quotes` (`:142`) | EP-01 | `readonly Quote[]` | O |
| `quoteAdapter.fetchOne(id, signal)` → `getQuote(id)` | `GET /api/sales/quotes/:id` (`:142`) | EP-03 | `Quote` | **△ — `version` 필드를 계약에 추가해야 한다**(§7.1). 404 → `HttpError` 변환은 **이미 충족**(`data-source.ts:98` · `crud.ts:192-194` 이중) |
| `quoteAdapter.create(input, context)` → `addQuote` | `POST /api/sales/quotes` (`:142`) | EP-02 | `void` | **✕ — 프론트에서 호출되지 않는다.** `quoteSchema.quoteNo` 필수 ↔ `readOnly` 모순으로 클라이언트 검증에서 멈춘다(§7.7). 헤더(`Idempotency-Key`·`X-CSRF-Token`)도 필요(§6.1) |
| `quoteAdapter.update(id, input, context)` → `updateQuote` | `PUT /api/sales/quotes/:id` (`:142`) | EP-04 | `void` | **△ — `If-Match`/`version` 미전송**(§7.1) · 헤더 필요 · **승계 3필드를 클라이언트가 되돌려 보낸다**(§7.4) |
| `quoteAdapter.remove(id, context)` → `removeQuote` | `DELETE /api/sales/quotes/:id` (`:142`) | EP-05 | `void` | **△ — `X-CSRF-Token` 필요.** 멱등키는 오지 않는다(`useCrudList.tsx:102`). **문의 역링크를 끊지 않는다**(§7.4) |
| **수주 전환** (`QuoteListPage.tsx:152-160` → `useCrudRowUpdate` → `quoteAdapter.update`) | **`POST /api/sales/quotes/:id/convert`** (`:143` — **심 있음**) | **EP-06** | `void` | **✕ — 심과 어긋난다.** 화면이 `convert` 를 부르지 않고 **PUT 로 `status` 만 바꾼다.** 주문은 만들어지지 않는다. **멱등키 없음**(`useCrudRowUpdate.ts:45`) · **409 가 일반 토스트로 뭉개진다**(`:53`) — §7.5 |
| **문의 → 견적 발행** (`issueQuoteFromInquiry` — `:134-140`, **문의 어댑터가 부른다**) | **`POST /api/sales/inquiries/:id/issue-quote`** (`:132-133` — **심 있음**) | **EP-07 (BE-051 공동)** | `Quote` | **△ — 중복 발행 동작이 심과 어긋난다.** 심은 '이미 발행된 문의면 **409 로 거절**', 구현은 '**기존 견적을 조용히 돌려준다**'(`:135-136`) — §7.4 |
| **일괄 삭제** (`useCrudList.tsx:133` → `crud.ts:349-350`) | **없음** | **EP-08 심 없음(미정)** | `settleAll` → 실패 건수 | **✕ — 전용 계약이 없다. N 건의 개별 DELETE 다**(§7.5) |
| **공급자(자사) 정보** (`SUPPLIER` — `types.ts:66-72`) | **없음** — 주석만('연동 시 회사 설정에서 주입한다') | **미정** | 하드코딩 상수 | **✕ — 심이 없다.** 회사정보(FS-015)와 연결되지 않는다 — §7.6 |

### 6.1 어댑터 본문 요구사항 (시그니처 불변)

`quoteAdapter` 는 **`createStoreAdapter`** 가 만든다(`data-source.ts:144`) — 형제 화면(BE-048·BE-049)의 `createCrudAdapter` 와 **다른 팩토리**다. **본문을 바꾼다는 것은 곧 `shared/crud/crud.ts:165-240` 의 팩토리를 fetch 구현으로 바꾼다는 뜻이고, 그 순간 이 팩토리를 쓰는 모든 화면**(`company/logo-list` · `marketing/templates` · `notifications/{email-templates,send,sms-templates}` · `portfolio/{categories,items}` · `products/{categories,items}`)**이 함께 연동된다.** 화면 코드는 0줄 바뀐다.

**⚠ 그러나 이 화면에는 형제에 없는 선행 문제가 있다** — `createStoreAdapter` 는 **저장소 함수에 위임**하므로(`spec.list/getOne/add/update/remove`) **저장소(`data-source.ts:91-121`)도 함께 fetch 로 바뀌어야 한다.** 그리고 그 저장소는 **문의 어댑터가 직접 부른다**(`issueQuoteFromInquiry` — `inquiries/data-source.ts:128`). 즉 **견적 연동은 문의 연동과 분리할 수 없다**(§7.9 #6).

1. **CSRF**: 쓰기에 `X-CSRF-Token` 헤더.
2. **멱등키**: `context.idempotencyKey` → `Idempotency-Key: <uuid>` 헤더. 값은 이미 어댑터까지 도달한다(`crud.ts:168,201,208`). 선례: `pages/members/data-source.ts:243-253`. **수주 전환에는 키가 오지 않는다** — EP-06 이 주문을 만드는 계약이 되면 `useCrudRowUpdate` 로는 부족하다(§7.5).
3. **404 → `HttpError(404)`**: **이미 충족**(`data-source.ts:98` + `crud.ts:192-194`). fetch 구현에서도 유지할 것.
4. **409 → `HttpError(409)`**: **이미 충족**(`data-source.ts:108-110,117-119` + `crud.ts:219-221,232-234`). 서버 연결 시 **`version` 불일치도 409 로 매핑**해야 한다(§7.1).
5. **422 → `HttpError` + `violations`**: `useCrudForm.ts:182-192` 가 `cause.violations` 를 읽는다. 서버의 `error.fields` 를 그 형태로 변환해야 필드 인라인 오류가 발현된다. **현재 `dev.ts:84` 는 `violations` 없는 `HttpError` 를 던져 이 경로가 죽어 있다.** **⚠ 이 화면 고유 한계**: `items` 경로의 422 는 **꽂을 ref 가 없다** — `setValue` 전량 치환이라 RHF 가 라인 입력의 ref 를 갖지 않는다(§7.7).
6. **`version` 왕복**: `fetchOne` 응답의 `version` 을 `Quote` 에 실어 폼이 되돌려 보내게 한다(BE-048 §6.1 #6 · BE-049 §6.1 #6 과 동일).
7. **`quoteNo`·`items[].id` 를 요청에서 빼거나 서버가 무시한다** — 채번 주체는 서버다(§7.7).

**이 화면 고유 요구사항 — 연동 선후(중요)**: **`quoteSchema.quoteNo` 의 필수 제약을 먼저 풀어야 한다.** 그러지 않으면 **`POST /api/sales/quotes` 는 연동 후에도 트래픽을 받지 못한다** — 클라이언트 검증이 요청보다 먼저 막기 때문이다(§7.7 · §7.9 #2). '어댑터만 fetch 로 바꾸면 된다'로 산정하면 **등록이 안 되는 원인을 백엔드에서 찾게 된다.**

## 7. 핵심 판정

### 7.1 409 는 '존재 여부' 기반이다 — 동시 편집은 last-write-wins, 그리고 인라인 경로엔 복구가 없다 【정합 판정】

**BE-048 §7.1 · BE-049 §7.1 과 같은 판정이나 근거 코드가 다르다** — 이 화면은 `createStoreAdapter`(`crud.ts:165-240`)를 쓰고 **저장소 자신도 409 를 던진다**(`data-source.ts:108-110`).

`updateQuote` 는 없는 id 에 `throw new HttpError(409, '다른 사용자가 먼저 삭제한 견적입니다.')`(`:108-110`), `removeQuote` 는 `HttpError(409, '이미 삭제된 견적입니다.')`(`:117-119`)를 던진다. 어댑터에도 같은 가드가 있다(`crud.ts:219-221,232-234`) — **이중이다.** **유령 저장은 해소됐다** — quality-bar EXC-04 의 acceptanceCheck 두 절이 성립한다.

**그러나 낙관적 동시성 제어가 아니다.**

| 시나리오 | 현재 동작 |
|---|---|
| A 가 편집 중 B 가 **삭제** → A 저장 | **409 → 충돌 다이얼로그** ✔ |
| A 가 편집 중 B 가 **수정** → A 저장 | **200 — A 가 B 를 조용히 덮는다** ✕ |
| A 가 편집 중 B 가 **수주 전환** → A 저장 | **200 — `status` 가 `ordered` 에서 A 의 값으로 되돌아간다** ✕ |

`Quote` 에 `version`·`updatedAt`·`etag` 가 **없다**(`types.ts:25-49` 전수 확인). `data-source.ts:108` 의 가드는 `quotes.some(quote => quote.id === id)` — 대상이 있기만 하면 통과한다.

**이 도메인에서 그것이 왜 더 위험한가**: 견적은 **품목 배열 전체가 통째로 치환**된다(`QuoteInput.items` — 전체 치환 PUT). 두 관리자가 같은 견적을 열어 A 는 단가를 고치고 B 는 품목 5행을 추가하면 **나중 저장이 앞선 것을 통째로 지운다** — 계약(BE-049)의 첨부 배열과 같은 구조이나 **여기서는 그것이 금액 그 자체**다. 게다가 **합계가 파생값이라 어긋남이 눈에 띄지 않는다** — 화면은 언제나 자기가 가진 `items` 로 계산한 합계를 보여 주므로 '숫자가 틀렸다'가 아니라 '내가 넣은 행이 없다'로만 드러난다.

**판정**: EP-04 는 **`version`(또는 `If-Match`/ETag)** 을 요구한다. 불일치 시 **409 `CONFLICT`**.

**프론트 비용은 폼 경로에서 거의 0 이다**: `FormConflictDialog` 가 이미 배선돼 있고(`QuoteFormPage.tsx:499`) `useCrudForm.handleWriteError` 가 `isConflict` 를 이미 분기한다(`useCrudForm.ts:166-178`). **서버가 409 를 주기만 하면 복구 경로가 열린다.**

**⚠ 그러나 인라인 경로에는 그 경로가 없다 — 이 화면 고유 위험**: '수주 전환'(FS-050-EL-009.10)은 `useCrudRowUpdate` 를 쓰는데 그 훅은 **모든 실패를 `toast.error('변경하지 못했습니다. 잠시 후 다시 시도해 주세요.')` 하나로 덮는다**(`useCrudRowUpdate.ts:53`). 409 도, 403 도, 500 도 같은 문구다. **충돌 다이얼로그도, 입력 보존도, reference code 도 없다.** 계약(FS-049)은 인라인 쓰기가 없어 이 문제가 아예 없고, 거래처(FS-048)는 상태 토글에서 같은 문제를 갖는다 — **BE-048 §7.11 #6 과 공동 사안**(§7.9 #4).

### 7.2 금액은 클라이언트가 계산하지만 **보내지 않는다** — 신뢰 경계는 지켜졌고, 계약해야 할 것은 규칙이다 【보안 판정】

**코드로 확인한 사실**:
- `Quote` 타입에 **`supply`·`vat`·`total` 필드가 없다**(`types.ts:25-49` 전수). `QuoteLineItem` 에도 `supply` 가 없다(`:8-17`) — `:7` 주석이 그 판정을 밝힌다: *'공급가액은 저장하지 않고 수량·단가에서 파생한다(단일 원천)'*.
- 클라이언트가 서버로 보내는 것은 **`items[{id, name, spec, quantity, unitPrice}]` 와 `taxMode`** 뿐이다(`QuoteFormPage.tsx:148-152` `toInput`).
- 합계는 `computeTotals(items, taxMode)`(`types.ts:148-158`)가 **렌더마다 계산**한다. 소비처 3곳(목록 `QuoteListPage.tsx:128` · 편집표 `QuoteLineItemsTable.tsx:112` · 미리보기 `QuotePreview.tsx:197`)이 **같은 함수**를 쓴다 — 사본이 없다.

**판정 ① — 신뢰 경계는 이미 옳다.** 견적서 도메인의 전형적 취약점은 '클라이언트가 계산한 합계를 서버가 그대로 믿는 것'이다(할인 금액을 조작해 총액을 낮추는 공격). **이 구현에는 그 표면이 없다** — 보낼 합계 필드 자체가 없기 때문이다. 서버는 `items` 와 `taxMode` 라는 **원재료만** 받아 스스로 계산하면 된다. **이것을 '고쳐야 할 결함'으로 적으면 틀린다.**

**판정 ② — 그러나 계약해야 할 것이 있다: 세액 규칙.**

`computeTotals` 는 **라인별 반올림 후 합산**한다(`types.ts:148-158`):

```
for each item: supply += quantity × unitPrice
               vat    += Math.round((quantity × unitPrice) × rate)   ← 라인마다 반올림
total = supply + vat
```

테스트가 이 경계를 못박는다(`quotes.test.ts:52-58`): 라인A 공급 3,000 → 세액 300, 라인B 공급 999 → `round(99.9)` = **100**, 합 세액 **400**. 만약 서버가 **총액 반올림**(`round(3999 × 0.1)` = `round(399.9)` = **400**)을 쓰면 이 예에서는 우연히 같으나, 라인이 늘면 **1원 단위로 갈린다**. 국내 세금계산서는 이 1원이 실제로 문제가 된다.

**판정 — 서버가 세우는 계약 세 줄**:
1. **세액 = Σ round(라인 공급가액 × 세율)** — 라인별 반올림 후 합산. `types.ts:145` 의 주석('문서 규칙 고정')과 `quotes.test.ts:52-58` 이 프론트 정본이며, **서버가 이 규칙을 그대로 구현해야** 화면과 서버가 같은 숫자를 말한다. 반올림 방식(`Math.round` = 0.5 올림)도 계약이다.
2. **세율은 서버가 정본이다** — 현재 `TAX_MODE_OPTIONS`(`types.ts:80-84`)가 **프론트 상수로 10%/0%/0%** 를 들고 있다. 부가세율이 바뀌면(정책 사안이다) **배포해야 반영된다.** 서버가 세율을 내려주거나, 최소한 서버가 요청의 `taxMode` 로 자기 세율표를 조회해 계산해야 한다.
3. **`items[].quantity`·`unitPrice` 에 상한이 필요하다**(§7.7) — 상한이 없으면 `Number` 안전 정수를 넘겨 **합계가 조용히 뭉개진다.** 이것은 신뢰 경계 문제가 아니라 정합 문제이나 같은 계산식에 걸린다.

**판정 ③ — 응답에 합계를 실을 것인가**: **현재는 실을 필요가 없다**(프론트가 계산한다). 그러나 **페이징·정렬이 도입되면(§7.8) '합계금액 순 정렬'이 서버 기능이 되고** 그 순간 `QuoteSummary.total` 이 서버 계산 필드가 된다. 그때 **두 계산기(프론트·서버)가 같은 답을 내야** 하고, 1번 계약이 그 전제다. **BE-049 §7.6 이 갱신임박에 대해 내린 판정과 같은 구조다.**

### 7.3 견적 상세는 404 로 은닉한다 【보안 판정】

BE-003 §3.2 의 원칙 두 줄을 이 도메인에 적용한다.

1. **컬렉션의 존재는 비밀이 아니다** → `GET /api/sales/quotes` 권한 부족 시 **403 `FORBIDDEN`**.
2. **개별 견적 리소스의 존재 자체가 보호 대상이다** → 영업 도메인 **읽기 권한이 없는** 주체에게는 **404 `QUOTE_NOT_FOUND`** 로 은닉한다.

**근거 — 견적은 '가격'을 담는다**: 견적 1건은 ① **거래처명·사업자번호·대표자·담당자** ② **품목별 단가**(시드가 'ERP 라이선스(연간) 100석 24,000,000' 을 담는다) ③ **합계·세액** ④ **할인 조건**(시드 `data-source.ts:33`: '유효기간 내 발주 시 구축비 10% 할인 가능.') ⑤ **원본 문의 전문**(`inquiryBody`)을 담는다. **경쟁사가 우리가 특정 거래처에 얼마를 불렀는지 알면 그것으로 언더컷한다.** 계약(BE-049 §7.4)이 '체결된 금액'을 담는다면 견적은 **'부르는 금액과 그 유연성(할인 여지)'** 을 담는다 — 협상 중인 정보라는 점에서 민감도가 다르다. 견적 id 열거로 '이 회사에 견적을 냈는가'를 알아내는 경로를 닫는다.

**반대로 읽기 권한이 있는 주체**(`operator`)가 쓰기에서 거절될 때는 **403** 을 준다 — 이미 견적의 존재를 아는 주체에게 존재를 숨기는 것은 의미가 없다.

**`operator` 는 조회 전용이다** — BE-048 §7.8 · BE-049 §7.8 과 **동일 판정**. 견적의 쓰기는 **가격을 정하는 일**이고 수주 전환은 **거래를 확정하는 일**이다. `operator` 가 단가를 고치거나 견적을 수주로 전환할 수 있다면 역할 구분이 무의미하다.

**결론**: EP-01·EP-03(조회)은 `admin` + `operator`. **EP-02·EP-04·EP-05·EP-06(쓰기)은 `admin` 만.** 영업 도메인 권한이 아예 없는 역할은 컬렉션 403 / 개별 404.

**프론트 영향 — 이 화면이 형제보다 나쁘다**: FS-050-EL-037 이 404 를 '견적을 찾을 수 없습니다.'로 그린다(은닉 성립). **그러나 쓰기 게이팅이 없어**(FS-050 §7 #4) `operator` 는 **쓰기 컨트롤 5종**(등록·행 수정/삭제·일괄 삭제·**수주 전환**·폼 제출)을 전부 보고 누른다 — 형제(4종)보다 하나 많다. 그리고 **'수주 전환'의 403 은 배너도 아닌 토스트로**, 그것도 '변경하지 못했습니다' 라는 **권한과 무관한 문구로** 뭉개진다(§7.1). **운영자는 자기가 권한이 없다는 사실을 영영 모르고 서버 장애로 오해한다**(§7.9 #4).

**추가 위험 — 목록이 전문을 내려준다**: EP-01 이 `Quote` 전량(`items` 전문·`note`·`inquiryBody` 포함)을 내려주므로 **영업 도메인 읽기 권한만 있으면 전 견적의 품목별 단가와 할인 메모를 한 번에 받는다.** §7.8 의 `QuoteSummary` 분리가 이 노출을 줄인다.

### 7.4 승계 필드는 클라이언트가 되돌려 보낸다 — 서버가 그것을 믿으면 안 된다 【보안 판정】

**코드로 확인한 사실**:
- `QuoteInput` 에 `inquiryId`·`inquiryNo`·`inquiryBody` 가 **포함된다**(`types.ts:51` `Omit<Quote, 'id'>`).
- 폼이 그 셋을 **`register` 하지 않고 값만 들고 있다가 그대로 되돌려 보낸다**(`QuoteFormPage.tsx:133-135` EMPTY · `:155-157` `toInput` · `:174-176` `toValues`).
- 스키마는 **`z.string()` 셋**(`validation.ts:39-41`)이다. 주석(`:38`)이 *'승계 값 — 사람이 편집하지 않는다. 폼이 값을 잃지 않도록 스키마에 남긴다(수정 시 보존)'* 고 **의도를 밝히나 스키마가 그것을 강제하지 않는다.**
- `isInherited`(`types.ts:57-59`)가 `inquiryId !== ''` 로 잠금을 결정하고, 그 잠금은 **거래처·담당자 입력의 `readOnly`**(`QuoteFormPage.tsx:337,361`)와 **원본 문의 카드의 렌더**(`:423`)를 지배한다.

**결과 — 서버가 요청을 믿으면**:
1. **수동 등록 견적에 `inquiryId: 'inq-1'` 을 실어 보내면** 그 견적이 남의 문의에 붙는다. 목록의 역링크(FS-050-EL-009.6)가 그 문의를 가리키고, 폼은 승계 필드를 잠근다 — **위조된 출처가 UI 에서 진짜처럼 보인다.**
2. **수정 시 `inquiryBody` 를 바꿔 보내면** '견적 작성의 근거'(`types.ts:47` 주석)가 조작된다. 그 필드는 **읽기 전용으로 표시되는데**(`:437` `<dd>{inquiryBody}</dd>`) 실제로는 클라이언트가 쓰기 가능하다 — **UI 의 읽기 전용이 서버의 읽기 전용이 아니다.**
3. **`inquiryId` 를 `''` 로 지워 보내면** 승계 잠금이 풀려 거래처·담당자를 자유 편집할 수 있게 된다 — **원본 문의와 어긋나면 어느 쪽이 진실인지 알 수 없다**(주석 `:220-221` 이 막으려던 바로 그 상황).

**판정 — 서버가 세우는 경계**:
1. **`inquiryId`·`inquiryNo`·`inquiryBody` 는 EP-02·EP-04 의 요청에서 받지 않는다.** 그 값들은 **EP-07(발행) 시점에 서버가 문의에서 읽어 고정**하고, 이후 **불변**이다. 요청이 그것을 실으면 **무시하거나** — 수동 등록이 `inquiryId` 를 실은 경우처럼 명백한 위조 시도는 — **422 `INHERITANCE_NOT_ALLOWED`**.
2. **EP-07 은 바디를 받지 않는다.** 현재 픽스처는 `QuoteInheritance`(회사·고객명·본문·발행일)를 **호출자가 조립해 넘기나**(`inquiries/data-source.ts:128-136`), 그것은 **같은 프로세스 안이라 안전한 것**이지 HTTP 계약이 아니다. 서버는 **경로의 문의 id 하나로** 승계 값을 스스로 읽어야 한다 — 클라이언트가 '이 문의의 회사명은 X 다'라고 말하게 두면 안 된다.
3. **발행일은 서버의 오늘이다.** 현재 `new Date().toISOString().slice(0, 10)`(`inquiries/data-source.ts:135`)은 **UTC 달력일**이라 KST 오전 9시 이전에는 **어제 날짜**가 된다(§7.7). 서버가 KST 기준으로 정해야 한다.

**중복 발행 — 심과 구현이 어긋난다 【정합 판정】**:

| | 동작 |
|---|---|
| **심**(`data-source.ts:133`) | '이미 발행된 문의면 **409 로 거절**한다' |
| **구현**(`data-source.ts:135-136`) | `findQuoteByInquiry` 로 찾아 **기존 견적을 조용히 돌려준다**(`if (existing !== undefined) return existing;`) |
| **호출자**(`inquiries/data-source.ts:126`) | `hasIssuedQuote(item)` 이면 **아예 부르지 않는다** — 이중 방어 |

**판정 — 구현 쪽이 옳고 심의 문구를 고쳐야 한다.** 이유: 이 조작의 트리거는 **문의 상태 select** 다. 운영자가 '견적 발행'을 골랐다 다른 상태로 갔다 다시 돌아오는 것은 **정상 흐름**이고, 그때 409 를 던지면 **문의 저장 자체가 실패한다**(부수효과가 트랜잭션 안이므로). 멱등하게 기존 견적을 돌려주는 것이 옳다 — 테스트가 이 판정을 고정한다(`inquiries.test.ts:109-118`). **다만 EP-07 이 독립 엔드포인트로 노출되면**(운영자가 직접 부르는 경로) 그때는 409 가 맞다 — **두 맥락을 구분해 심을 다시 써야 한다**(§7.9 #7).

**역링크 무결성 — 삭제가 한쪽만 끊는다 【정합 판정】**: `removeQuote`(`data-source.ts:116-121`)는 **문의를 건드리지 않는다.** 문의에서 발행된 견적을 지우면 문의의 `quoteId` 는 남고, `hasIssuedQuote` 가 true 라 **재발행도 막힌다**(`inquiries/data-source.ts:126`) — **견적도 없고 재발행도 안 되는 문의**가 굳는다. **판정**: EP-05 는 `inquiryId !== ''` 인 견적을 지울 때 **문의의 `quoteId` 를 같은 트랜잭션에서 `''` 로 되돌린다.** **BE-051 §7.5 와 공동 사안**(§7.9 #7).

### 7.5 수주 전환은 심이 약속한 것을 하지 않는다 【범위·정합 판정】

**F3b 코드로 확인한 사실**:
- 심(`data-source.ts:143`)이 `POST /api/sales/quotes/:id/convert (수주 전환 — 견적을 **수주(주문)로 복사**)` 를 예고한다.
- 화면은 그것을 부르지 않는다 — `useCrudRowUpdate` 로 **`quoteAdapter.update(id, {...toQuoteInput(item), status: 'ordered'})`** 를 보낸다(`QuoteListPage.tsx:152-160`). **`status` 문자열 하나만 바뀐다.**
- **주문(수주) 도메인이 존재하지 않는다** — `pages/sales/**` 전수에 주문 화면·타입·어댑터가 없고, `nav-config.ts:155-161` 의 영업 관리 잎 6개(거래처·계약·견적·문의·프로젝트·상담 이력)에도 없다.

**판정 ①**: **이 문서는 EP-06 의 요청/응답 본문을 확정하지 않는다** — 대상 도메인이 없으면 '무엇을 복사하는가'를 정할 수 없다. **심이 있으므로 경로와 의도는 §4 EP-06 에 기록**하되, 발명하지 않는다. **아키텍처 의 도메인 경계 결정이 선행**한다(§7.9 #5). BE-049 §7.9 가 전자서명·자동갱신에 대해 내린 판정과 같은 결이다.

**판정 ②**: **'전환'이라는 이름이 거짓말을 한다.** 계약(BE-049 §7.9)의 '자동갱신 배지가 아무 일도 하지 않는다'와 **정확히 같은 구조**다 — 버튼이 있고, 누르면 성공 토스트('수주로 전환했습니다.')가 뜨고, 배지가 '수주전환'으로 바뀐다. **그런데 수주는 어디에도 만들어지지 않는다.** 운영자는 전환이 일어났다고 믿는다.

**판정 ③ — 지금 정할 수 있는 계약 셋**:
1. **전환의 전제를 서버가 재판정한다** — `canConvertToOrder`(`types.ts:127-129`)는 **프론트 표시 규칙**이고 폼의 status select 를 좁히지도 않는다(§7.5 아래). 서버는 `status === 'accepted'` 를 확인하고 아니면 **422 `INVALID_STATUS_TRANSITION`**.
2. **전환이 주문을 만든다면 멱등키가 필수다** — 현재 `useCrudRowUpdate` 는 키를 싣지 않는다(`:45`). 값이 멱등인 지금(`status: 'ordered'` 고정)은 무해하나, **주문 생성은 멱등이 아니다** — 이중 클릭이 이중 주문이 된다. `useCrudRowUpdate` 로는 부족하고 **`useCrudForm` 수준의 키 배선이 필요**하다(§7.9 #5).
3. **전환 후 견적은 잠긴다** — 수주로 넘어간 견적의 금액·품목을 나중에 고치면 주문의 근거가 사라진다. EP-04 는 `status === 'ordered'` 인 견적의 `items`·`taxMode` 변경을 **422 `QUOTE_LOCKED`** 로 거절한다.

**상태 전이 규칙이 없다 【정합 판정】**: `types.ts` 와 `validation.ts` 전수에 **`STATUS_FLOW`/`canSetStatus` 류가 존재하지 않는다.** `status` 는 `z.enum([...6종])`(`validation.ts:37`)일 뿐이고 폼 select 는 6개 전부를 항상 보인다(`QuoteFormPage.tsx:300-308`). 고객센터(`support/_shared/domain.ts`)가 `STATUS_FLOW`·`canTransition`·`canSetStatus`·`allowedNextStatuses` 를 순수 규칙으로 갖고 select 선택지를 좁히는 것과 정면 대비다. **`canConvertToOrder` 가 있어 더 헷갈린다** — 이 도메인에도 전이 개념이 있는 것처럼 보이나 그것은 **버튼 하나의 표시 조건**일 뿐이다.

**판정 — 서버가 전이 규칙의 정본이다.**

| 현재 | 허용되는 다음 상태 | 근거 |
|---|---|---|
| `draft` | `sent` · `rejected` | 작성중은 발송하거나 폐기한다 |
| `sent` | `accepted` · `rejected` · `expired` | 발송된 견적은 승인/반려되거나 만료된다 |
| `accepted` | `ordered` · `expired` | 승인은 수주로 가거나 만료된다. **`canConvertToOrder` 가 이 한 줄만 프론트에 갖고 있다** |
| `rejected` | **없음** | 종착 — 재견적은 **새 견적**이지 상태 되돌리기가 아니다 |
| `expired` | **없음** | 종착 — 위와 같다 |
| `ordered` | **없음** | 종착 — 수주는 되돌릴 수 없다(취소는 주문 도메인의 일이다) |

- 현재 상태 → 자기 자신은 언제나 허용(변경 없음도 유효한 저장).
- **신규 등록(EP-02)의 초기 상태는 `draft` 만** 허용한다 — 존재한 적 없는 견적이 '수주전환'으로 태어날 수는 없다. **문의 발행(EP-07)도 `draft` 다**(`types.ts:242` 주석이 그 이유를 밝힌다: *'품목이 비어 있는 견적을 '발송'으로 두면 발송되지 않은 견적이 발송으로 보인다'*).
- **위반 시 422 `INVALID_STATUS_TRANSITION`** — `error.fields: [{ name: 'status', … }]` 로 내려보내면 프론트의 `setError` 경로(`useCrudForm.ts:182-192`)가 그 select 에 인라인 오류를 꽂는다.

**만료가 자동 전이되지 않는다**: `validUntil` 이 지나도 `status` 는 그대로다 — **만료를 판정하는 파생 함수가 이 도메인에 아예 없다**(계약의 `isRenewalDue`/`daysRemaining` 같은 것이 없다). 목록 필터 '발송'에 유효기간이 한참 지난 견적이 계속 잡힌다. **판정**: 서버가 **일 배치로 `sent`·`accepted` 중 `validUntil < 오늘` 인 것을 `expired` 로 전이**하거나, 최소한 EP-01 이 만료 여부를 파생 필드로 내려준다. **후자가 가볍고 §7.8 의 페이징과 함께 오는 것이 자연스럽다.**

**삭제 — 수주 전환된 견적은 지울 수 없다 【정합 판정】**: FS-050-EL-012 는 **승인·수주전환 견적도 아무 경고 없이** 지운다 — 확인 문구가 상태를 언급하지 않는다. **판정**: EP-05 는 `status === 'ordered'` 견적을 **409 `QUOTE_IN_USE`** 로 거절한다. 주문의 근거 문서이기 때문이다. **BE-049 §7.5 의 `CONTRACT_IN_FORCE` 보다 범위가 좁다** — 견적은 계약이 아니라 제안이므로 `draft`·`sent`·`accepted`·`rejected`·`expired` 는 삭제를 허용한다. **다만 `inquiryId !== ''` 인 견적의 삭제는 역링크를 함께 끊어야 한다**(§7.4).

**일괄 삭제에 전용 계약이 없다**: BE-048 §7.5 · BE-049 §7.5 와 **동일한 구조적 문제** — 프론트가 `settleAll` 로 N 건의 개별 DELETE 를 병렬로 낸다(`crud.ts:349-350`). 원자성이 없고, 레이트리밋(분당 60)에 자기가 걸리며, 실패 id 를 모른다. **⚠ 이 화면은 형제보다 나쁘다** — **선택이 조건 변화에 해제되지 않아**(FS-050 §7 #5) **운영자가 의도하지 않은 id 가 실릴 수 있다.** 견적 3건을 고르고 필터를 바꾼 뒤 '전체 선택'을 누르면 **이전 조건의 3건 + 지금 보이는 N 건**이 함께 나간다. **판정**: 이 문서는 `POST /api/sales/quotes/bulk-delete` 를 **만들지 않는다** — 심이 없다(§4 EP-08). 판정만 남긴다: 전용 계약이 필요하며 `{ ids: string[] }` 를 받아 **전건 성공 또는 전건 실패**를 반환하고 실패 시 `error.fields` 에 실패 id 와 사유(`QUOTE_IN_USE`)를 담아야 한다. **심을 심는 것이 선행 작업**이다(§7.9 #8). **삭제의 멱등성**은 BE-048 §7.5 ②·BE-049 §7.5 ③과 동일 판정 — **409 를 유지한다.**

### 7.6 견적이 자기 사본을 너무 많이 갖는다 — 거래처도, 자사도 【정합 판정】

**① 거래처가 FK 가 아니다** — `accountName: string`(`types.ts:29`). **BE-048 §7.7 · BE-049 §7 #8 · NFR-049 §5 #25 와 공동 판정**이며 결과도 같다: 상호를 바꾸면 견적은 옛 이름, 거래처를 지우면 견적이 고아, 오타가 곧 새 거래처, 목록 셀이 링크가 아니다.

**⚠ 그러나 이 화면은 형제보다 한 걸음 더 나갔다** — 견적은 거래처의 **`accountBizNo`·`accountCeo` 사본까지** 들고 있다(`types.ts:31-32`). 계약(FS-049)은 이름만 복제하는데 견적은 **원장의 세 필드를 복제**하고, 그것을 **사람이 손으로 다시 친다**(FS-050-EL-024~027). 거래처 원장(FS-048)에 이미 있는 값이다.

**판정 — 두 층으로 나눠야 한다**:
1. **`accountId` FK 를 도입한다**(BE-048 §7.7 과 공동). 견적은 거래처를 **참조**한다.
2. **그러나 표기용 사본은 남긴다 — 그것이 옳다.** 견적서는 **발행 시점의 문서**다. 거래처가 나중에 상호를 바꿔도 **이미 보낸 견적서의 상호는 그때 것이어야 한다**(계약의 `accountName` 이 '연동 시 거래처 FK' 라고만 적은 것과 **판정이 갈리는 지점**이다). 즉 `accountId`(참조) + `accountNameSnapshot`·`accountBizNoSnapshot`·`accountCeoSnapshot`(발행 시점 고정)의 **두 벌**이 정답이다. **지금은 스냅샷만 있고 참조가 없다.**
3. **입력은 선택기가 되어야 한다** — 거래처를 고르면 사업자번호·대표자가 **자동으로 채워지고 읽기 전용이 된다**(승계 견적이 이미 그 패턴을 갖고 있다 — `isInherited` 잠금). 손으로 치는 지금은 **원장과 견적서가 다른 사업자번호를 말할 수 있고, 그중 하나가 세금계산서로 간다.**

**② 공급자(자사) 정보가 하드코딩이다** — `SUPPLIER`(`types.ts:66-72`)가 상호·사업자번호·대표자·주소·전화를 **`as const` 상수로** 고정하고, `QuotePreview.tsx:224-231` 이 그것을 **견적서에 인쇄**한다. 주석(`types.ts:65`)이 자백한다: *'연동 시 회사 설정에서 주입한다'*. **심은 없다.**

**판정**: **회사정보(FS-015)가 정본이어야 한다.** 회사 주소를 바꿔도 견적서는 옛 주소를 인쇄하는 지금 상태는, 견적서가 **거래처에 나가는 문서**라는 점에서 실제 사고가 된다(반송·오배송). EP-01/EP-03 이 공급자 정보를 내려주거나, 회사 설정 조회를 프론트가 별도로 하거나 — **어느 쪽이든 심이 먼저 필요하다**(§7.9 #9). **BE-049 에는 없는 이 화면 고유 사안**이다(계약 미리보기는 자사 정보를 그리지 않는다).

**③ XSS — 견적서 PDF 가 로드맵에 있다**: `note`·`items[].name`·`items[].spec`·`inquiryBody` 저장 시 정제. 관리자 화면은 React 텍스트 노드라 안전하나, **quality-bar ERP-10 이 '견적서/거래명세서 print-template' 을 명시 지목**하고 **이 화면이 그 요구의 주 대상**이다(FS-050 §7 #13) — PDF 렌더러는 React 이스케이프를 상속하지 않는다. **BE-048 §7.10 · BE-049 §7.10 #12 와 같은 뿌리이나 이 화면에서 가장 임박했다.**

### 7.7 채번·상한·입력 정합 — 서버가 정한다 【정합 판정】

**① `quoteNo` — 채번 주체가 서버여야 하고, 프론트 스키마가 그것을 막고 있다 【최우선】**

| 사실 | 근거 |
|---|---|
| 견적번호는 사람이 정하는 값이 아니다 | `types.ts:246` 주석: '견적번호는 데이터소스가 채번한다(빈 값 = 자동 부여) — **사람이 정하지 않는다**' |
| 픽스처가 빈 값이면 채번한다 | `data-source.ts:84` `input.quoteNo.trim() === '' ? makeQuoteNo(input.issueDate, seq) : input.quoteNo` |
| **그런데 스키마가 빈 값을 막는다** | `validation.ts:24` `quoteNo: requiredText('견적번호', 40)` |
| **그런데 입력이 읽기 전용이다** | `QuoteFormPage.tsx:295` `readOnly` · `:122` 초기값 `''` |
| **결과: 신규 등록이 클라이언트 검증에서 멈춘다** | `useCrudForm.ts:260` `handleSubmit(onValid, onInvalid)` — zod 가 먼저 돈다 → `create.mutate` 미도달 |

**즉 `POST /api/sales/quotes` 는 현재 프론트에서 호출되지 않는다.** 채번 로직(`nextQuote`)의 실제 소비자는 **스키마를 거치지 않는 `issueQuoteFromInquiry`(`:137`) 뿐**이다.

**판정 — 서버가 유일한 채번 주체다**:
1. **EP-02 는 요청의 `quoteNo` 를 받지 않는다**(무시하거나 400). 서버가 채번하고 응답으로 돌려준다.
2. **EP-04 에서 `quoteNo` 는 불변**이다 — 요청이 그것을 바꾸려 하면 무시하거나 422.
3. **프론트가 선행 수정되어야 한다** — `quoteSchema.quoteNo` 를 `z.string()` 으로 풀어야 등록이 서버에 도달한다(FS-050 §7 #2 · §7.9 #2). **서버 계약이 옳아도 이 한 줄이 그것을 가로막는다.**
4. **`items[].id` 도 같다** — 클라이언트가 `li-new-<Date.now()>-<난수>`(`QuoteLineItemsTable.tsx:89-95`)로 만든다. **같은 ms 에 1/1000 확률로 충돌**하고, 그 id 가 서버에 그대로 저장되면 **클라이언트의 우연이 영구 식별자가 된다.** 서버가 재채번한다.
5. **채번 포맷**: `Q-YYYYMMDD-NNN`(`types.ts:206-209`). **⚠ `seq` 가 전역 카운터라 날짜별 연번이 아니다** — 같은 날 2건이 `-004`·`-005` 로 건너뛴다. 서버는 **날짜별로 1부터** 채번해야 포맷의 의미('그날의 N번째')가 산다. 그리고 **동시 채번의 유일성은 서버만 보장할 수 있다**(현재 `seq` 는 프로세스 지역 — `:79`).

**② 상한이 없다**

| 필드 | 현재 | 문제 |
|---|---|---|
| `items[].quantity` | 정수 · `>= 1` | **상한 없음.** `toDigits` 가 자릿수를 제한하지 않아 20자리도 통과하고 `Number()` 가 `MAX_SAFE_INTEGER` 를 넘으면 **합계가 조용히 뭉개진다** |
| `items[].unitPrice` | `>= 0` | **상한 없음.** 위와 같다. **`>= 0` 규칙 자체는 UI 경유로 도달 불가** — `toDigits` 가 음수를 차단한다 |
| `items` 개수 | `QUOTE_MAX_ITEMS = 30`(UI 만) | **스키마에 없다** — `z.array(lineItemSchema)` 무제한(`validation.ts:36`). UI 는 30에서 '추가' 버튼을 숨길 뿐(`QuoteLineItemsTable.tsx:271`)이라 **API 직접 호출은 무제한** |
| `items[].spec` · `accountCeo` | **제약 없음**(`z.string()`), `maxLength` 없음 | 서버가 상한을 정하지 않으면 1MB 짜리 규격을 받는다 |
| `accountName` | 스키마 ≤60자, **화면에 `maxLength` 없음** | 61자를 치면 제출 시점에야 안다 |
| `validUntil` | `>= issueDate` | **`===` 를 허용한다** — 당일 만료 견적이 통과한다. 상한도 없다(`'9999-12-31'` 통과) |

**판정 — 서버가 강제한다**: `quantity` **1~999,999** · `unitPrice` **0~1조**(정책값) · `items` **1~30개**(UI 와 일치) · `spec`·`accountCeo` **길이 상한** · `validUntil > issueDate`(당일 만료 금지 — 아키텍처 확인 필요) 및 **상한**(예: 견적일 + 1년). 위반 시 400 `OUT_OF_RANGE`.

**③ `accountBizNo` 체크섬을 강제한다** — `isValidBizNo`(`business.ts:29-42`)가 **국세청 가중치 규칙으로 이미 구현돼 있는데** 이 화면의 스키마가 소비하지 않는다(`validation.ts:26` `z.string()`). `formatBizNo` 는 자릿수를 자를 뿐이라 **'12-3' 같은 미완성 값이 저장되고 견적서에 인쇄된다.** 거래처(FS-048)가 같은 헬퍼를 검증에 쓰는 것과 대비된다. **판정**: 서버가 체크섬을 강제한다 — 빈 값은 허용(필수 아님), 채우면 유효해야 한다. 400 `VALIDATION_FAILED`.

**④ 발행일이 UTC 달력일이다** — EP-07 의 견적일이 `new Date().toISOString().slice(0, 10)`(`inquiries/data-source.ts:135`)이다. **KST 오전 9시 이전에 발행하면 어제 날짜의 견적이 만들어진다.** 그리고 그 날짜가 **견적번호에 박힌다**(`makeQuoteNo`) — `Q-20260716-001` 이 7월 17일 오전에 발행된다. 앱은 이미 서울 고정 달력일 정본(`shared/format.ts:161-165` `formatDate`)을 갖고 있는데 **이 경로가 그것을 쓰지 않는다.** **판정**: 서버가 **KST 기준 달력일**로 정한다(§7.9 #10).

**⑤ 400 `error.fields` 의 `items` 경로는 프론트가 꽂을 곳이 없다** — `useCrudForm` 은 422 만 `setError` 로 꽂고(`:182`), 그나마도 `items` 는 **RHF ref 가 없다**(`setValue` 전량 치환이라 — FS-050 §7 #27). 서버가 `items[3].name` 같은 경로를 내려줘도 **포커스가 가지 않는다.** 게다가 프론트 스키마 자신도 **어느 행인지 말하지 않는다**(배열 단위 4분기 — `validation.ts:48-86`). **스키마 헤더(`:3-4`)가 '라인 인덱스를 포함해 어떤 행이 문제인지 알린다'고 약속하나 구현이 그러지 않는다** — 서버가 인덱스를 내려줘도 화면이 쓰지 못한다(§7.9 #11).

**유일성**: `quoteNo` 는 **서버 채번이 보장**한다. **그 밖의 유일성은 강제하지 않는다** — 같은 거래처에 같은 품목으로 견적을 여러 번 내는 것은 **정상**이다(재견적·조건 변경). BE-048 이 사업자등록번호에 유일성을 요구한 것과 다른 판정이며, BE-049 §7.7 의 '거래 문서에는 유일성을 강제하지 않는다'와 **같은 결**이다.

### 7.8 목록이 전량·전문을 내려준다 — 페이징과 목록 전용 표현을 도입한다

**현재 계약의 두 문제**(BE-048 §7.9 · BE-049 §7.6 과 같은 구조):

1. **페이징이 없다.** `fetchAll(signal)` 이 전량을 반환하며 프론트가 필터·검색·정렬을 전부 클라이언트에서 한다. **견적은 거래마다 쌓이고, 문의에서 자동 생성되기까지 한다**(EP-07) — 계약보다 증가 속도가 빠르다.
2. **목록이 상세 전문을 담는다.** `Quote` 타입 하나를 목록·상세가 공유해 목록 응답에 `items`(품목 전문 — **최대 30행 × 5필드**) · `note` · `inquiryBody`(문의 전문)가 실린다 — **목록 화면이 쓰지 않는 필드**이며 §7.3 의 취지와 충돌한다.

**⚠ 이 화면 고유 — 목록이 `items` 를 쓴다**: 형제와 달리 **합계금액 셀이 `items` 전문을 필요로 한다**(`computeTotals(item.items, item.taxMode)` — `QuoteListPage.tsx:128`). 즉 `QuoteSummary` 에서 `items` 를 단순히 빼면 **합계를 계산할 수 없다.** **판정**: `QuoteSummary` 는 `items` 대신 **서버가 계산한 `supply`·`vat`·`total`** 을 담는다 — §7.2 의 세액 규칙이 그 전제이고, 그 순간 **합계가 클라이언트 파생값에서 서버 계약으로 승격**한다(§3 의 ✕ 표가 그때 바뀐다). `note`·`inquiryBody`·`accountCeo` 는 뺀다. `inquiryId`·`inquiryNo` 는 **남긴다**(역링크 셀이 쓴다 — FS-050-EL-009.6).

**판정**: EP-01 에 `status`·`keyword`·`page`·`size`(기본 20 · 상한 100) 쿼리를 도입한다.

**이 도메인 고유의 추가 요구 — 정렬과 만료 필터**: FS-050 §7 #23 이 지적하듯 **정렬이 견적일 내림차순 고정**이라 **합계금액 순·만료 임박 순으로 훑을 수 없다.** 페이징이 도입되는 순간 이 둘은 **서버 기능이 된다** — 클라이언트는 현재 페이지만 알기 때문이다. `sort=total:desc` · `sort=validUntil:asc` · `expiringSoon=true` 쿼리를 그때 함께 넣어야 한다. **`total` 정렬은 §7.2 의 서버 계산이 선행**되어야 성립한다 — 클라이언트 파생값으로는 정렬할 수 없다. 그리고 **만료 판정 자체가 이 도메인에 없으므로**(§7.5) 그것도 함께 온다.

**검색 범위도 그때 정해야 한다** — 현재 클라이언트 검색은 **견적번호·거래처만** 훑는다(`types.ts:168-176`). 서버 검색이 되면 **품목명까지 훑는 것이 자연스럽다**(FS-050 §7 #14) — '어느 견적에 ERP 라이선스가 들어갔나'는 영업의 실제 질문이다.

**이관**: 프론트 대공사다 — `filterQuotes`/`searchQuotes`/`sortQuotes`/`computeTotals` 가 서버로 올라가고 페이지네이션 UI(FS-050 §7 #3)·`SeqCell` 오프셋이 함께 붙어야 한다. quality-bar IA-04 P0 가 이미 이 화면을 gap 으로 잡고 있으므로 **한 배치로 묶는 것이 옳다.** IA-13(URL state)은 **이미 충족**돼 있다(`useListState` 소비). 그전까지 현 계약(전량)을 유지한다 — 픽스처 3건에서는 드러나지 않는다.

### 7.9 후속 이관

| # | 내용 | 이관 |
|---|---|---|
| 1 | **`Quote.version` 추가 + EP-04 의 `If-Match`/`version` 검증(§7.1)** — 현재 409 는 '존재 여부' 기반이라 **동시 편집이 last-write-wins 로 조용히 덮인다**. **품목 배열이 통째로 덮여** B 가 추가한 5행이 사라지고, **합계가 파생값이라 그 어긋남이 눈에 띄지도 않는다**. 프론트는 `FormConflictDialog` 가 이미 배선돼 있어 **서버가 409 를 주기만 하면 폼 경로의 복구가 열린다** | **백엔드 명세 · UI 기획 (최우선)** |
| 2 | **🔴 `quoteSchema.quoteNo` 의 필수 제약을 푼다(§7.7 ①)** — 이것이 **연동의 선행 조건**이다. 지금은 `readOnly` 입력 + 초기값 `''` + 스키마 필수가 겹쳐 **신규 등록이 클라이언트 검증에서 멈추고, `error` prop 이 없어 그 실패가 보이지도 않는다**(FS-050 §7 #2). **`POST /api/sales/quotes` 는 이 한 줄이 풀려야 트래픽을 받는다.** 채번 주체는 서버다 — `types.ts:246` 주석이 이미 그렇게 말한다. **회귀 테스트 추가 필수**(`quoteSchema.safeParse(valuesOf({ quoteNo: '' })).success === true`) — 현재 `valuesOf()`(`quotes.test.ts:165`)가 `quoteNo` 를 고정 주입해 이 경로를 검증하지 않는다 | **UI 기획 (최우선) · 백엔드 명세** |
| 3 | **세액 규칙을 서버 계약으로 고정(§7.2)** — **라인별 반올림 후 합산**(`types.ts:155` · `quotes.test.ts:52-58`). 서버가 총액 반올림을 쓰면 화면과 1원 단위로 갈린다. **세율(10%/0%/0%)도 프론트 상수(`types.ts:80-84`)라 정책 변경 시 배포가 필요하다** — 서버가 정본이어야 한다. **금액을 클라이언트가 보내지 않는 현 설계는 옳다 — 바꾸지 말 것** | **백엔드 명세** |
| 4 | **쓰기 게이팅 부재(§7.3)** — `useRouteWritePermissions` 소비처 9곳에 `pages/sales/**` 없음. **이 화면은 쓰기 컨트롤이 5종**(수주 전환 추가)으로 형제보다 많다. BE-050 §7.3 이 `operator` 를 조회 전용으로 판정하므로 **실제 사용자를 때린다**. **인라인 수주 전환의 403 은 배너도 아닌 토스트로, '변경하지 못했습니다' 라는 권한과 무관한 문구로 뭉개진다**(§7.1). **BE-048 §7.11 #6 과 공동** (quality-bar EXC-03 P0) | UI 기획 쪽 변경 요청 |
| 5 | **수주 전환이 심과 어긋난다(§7.5)** — 심(`data-source.ts:143`)은 `POST /convert` 로 '견적을 수주(주문)로 복사', 구현은 `PUT` 으로 `status` 만 변경. **주문 도메인이 존재하지 않는다.** '전환' 버튼이 성공 토스트를 띄우지만 **수주는 어디에도 만들어지지 않는다** — 계약(BE-049 §7.9)의 '자동갱신 배지가 거짓말을 한다'와 같은 구조. **도메인 경계 결정이 선행**하고, 그것이 주문을 만드는 계약이 되면 **멱등키가 필수**다(현재 `useCrudRowUpdate` 는 키를 싣지 않는다 — 이중 클릭 = 이중 주문) | **아키텍처 (선행) · 백엔드 명세 · UI 기획** |
| 6 | **견적 연동은 문의 연동과 분리할 수 없다(§6.1)** — `quoteAdapter` 가 `createStoreAdapter` 라 **저장소 함수도 함께 fetch 로 바뀌어야** 하고, 그 저장소를 **문의 어댑터가 직접 부른다**(`inquiries/data-source.ts:128`). 형제(`createCrudAdapter`)와 산정이 다르다 — **'어댑터 본문만 교체'로 잡으면 문의가 깨진다** | **백엔드 명세 (산정 주의)** |
| 7 | **문의 ↔ 견적 무결성(§7.4)** — ① **승계 3필드를 요청에서 받지 않는다**(현재 클라이언트가 되돌려 보내 위조 가능 — 남의 문의에 견적을 붙이거나 `inquiryBody` 를 조작할 수 있다) ② **EP-07 은 바디 없이 문의 id 만 받고 서버가 승계 값을 읽는다** ③ **중복 발행은 409 가 아니라 기존 견적 반환이 옳다** — 심 문구(`:133`)를 고쳐야 한다(구현이 옳다) ④ **EP-05 가 견적을 지울 때 문의의 `quoteId` 를 같은 트랜잭션에서 끊는다** — 지금은 '견적도 없고 재발행도 막힌 문의'가 굳는다. **BE-051 §7.5 와 공동 판정** | **백엔드 명세 (BE-051 공동)** |
| 8 | **일괄 삭제 전용 계약 부재(§7.5)** — 심을 먼저 심어야 한다(`// TODO(backend): POST /api/sales/quotes/bulk-delete` + 어댑터 `removeMany`). 현재 N 건 병렬 DELETE 라 원자성·레이트리밋·실패 식별이 깨진다. **⚠ 이 화면은 선택이 조건 변화에 해제되지 않아**(FS-050 §7 #5) **의도하지 않은 id 가 실릴 수 있다** — 형제보다 위험하다 | 백엔드 명세 · UI 기획 |
| 9 | **공급자(자사) 정보가 하드코딩(§7.6 ②)** — `SUPPLIER`(`types.ts:66-72`)가 견적서에 인쇄되는데 회사정보(FS-015)와 연결되지 않는다. **회사 주소를 바꿔도 견적서는 옛 주소를 인쇄한다** — 견적서는 거래처에 나가는 문서라 실제 사고가 된다. **심이 없다** — 심는 것이 선행. **이 화면 고유**(계약 미리보기는 자사 정보를 그리지 않는다) | 백엔드 명세 · UI 기획 |
| 10 | **발행일이 UTC 달력일(§7.7 ④)** — `new Date().toISOString().slice(0,10)`(`inquiries/data-source.ts:135`)이라 **KST 오전 9시 이전 발행은 어제 날짜**가 되고 **그 날짜가 견적번호에 박힌다**. 앱에 서울 고정 정본(`shared/format.ts:161-165`)이 이미 있는데 이 경로가 쓰지 않는다. 서버가 KST 로 정한다 | 백엔드 명세 · UI 기획 |
| 11 | **`items` 검증이 행을 식별하지 않고, 서버가 인덱스를 줘도 프론트가 꽂지 못한다(§7.7 ⑤)** — 스키마가 배열 단위 4분기(`validation.ts:48-86`)라 '모든 품목의 품목명을 입력하세요.' 만 낸다(**헤더 주석 `:3-4` 의 약속과 다르다**). 게다가 `setValue` 전량 치환이라 **RHF ref 가 없어 `setFocus` 가 닿지 않는다** — 서버가 `items[3].name` 을 내려줘도 소용없다. `useFieldArray` 전환이 선행 | UI 기획 · 백엔드 명세 |
| 12 | **견적 상태 전이 규칙(§7.5)** — `STATUS_FLOW`/`canSetStatus` 류가 **존재하지 않아** '수주전환'에서 '작성중'으로 되돌릴 수 있다. `canConvertToOrder` 는 **버튼 표시 조건일 뿐**이다. 서버가 정본을 세우고 422 `INVALID_STATUS_TRANSITION` 으로 막는다. 프론트는 순수 규칙으로 select 를 좁혀 1차 차단(FS-026 의 `allowedNextStatuses` 선례) | 백엔드 명세 · UI 기획 |
| 13 | **만료가 자동 전이되지 않고 만료 판정 자체가 없다(§7.5)** — `validUntil` 이 지나도 `status` 는 그대로고, 계약의 `isRenewalDue`/`daysRemaining` 같은 파생이 이 도메인에 **아예 없다**. 목록 필터 '발송'에 한참 지난 견적이 계속 잡힌다. **서버 배치 또는 EP-01 의 파생 필드** — 후자가 가볍고 §7.8 과 함께 오는 것이 자연스럽다 | 백엔드 명세 · UI 기획 |
| 14 | **수주 전환된 견적의 삭제·금액 변경 제약(§7.5)** — 409 `QUOTE_IN_USE`(삭제) · 422 `QUOTE_LOCKED`(금액·품목 변경). 주문의 근거 문서다. **`CONTRACT_IN_FORCE`(BE-049 §7.5)보다 범위가 좁다** — 견적은 제안이므로 나머지 상태는 삭제를 허용한다 | 백엔드 명세 · UI 기획 |
| 15 | **거래처가 이름 문자열이고 사업자번호·대표자까지 사본이다(§7.6 ①)** — **`accountId` FK + 발행 시점 스냅샷의 두 벌**이 정답이다(스냅샷을 없애면 안 된다 — 견적서는 발행 시점의 문서다). 입력은 **거래처 선택기**가 되어야 한다. **BE-048 §7.7 · BE-049 §7.10 #11 과 공동 판정** | **백엔드 명세 (세 문서 공동)** |
| 16 | **수량·단가·품목 개수·자유 텍스트 상한(§7.7 ②)** — 상한이 없어 20자리를 치면 `Number` 안전 정수를 넘어 **합계가 조용히 뭉개진다**. `items` 개수는 **스키마에 없어 API 직접 호출이 무제한**이다(UI 만 30에서 버튼을 숨긴다). `validUntil === issueDate`(당일 만료) 통과 | 백엔드 명세 · UI 기획 |
| 17 | **`accountBizNo` 체크섬 미검증(§7.7 ③)** — `isValidBizNo`(`business.ts:29-42`)가 **국세청 규칙으로 실재하는데 소비되지 않는다.** '12-3' 같은 미완성 값이 저장돼 **견적서에 인쇄된다**. 거래처(FS-048)는 같은 헬퍼를 검증에 쓴다 | UI 기획 · 백엔드 명세 |
| 18 | **`items[].id` 를 클라이언트가 만든다(§7.7 ①-4)** — `li-new-<Date.now()>-<0~1000 난수>`(`QuoteLineItemsTable.tsx:89-95`)라 **같은 ms 에 1/1000 확률로 충돌**하고 React `key` 가 겹친다. 서버가 재채번한다. 프론트는 `crypto.randomUUID()`(이미 `useCrudForm.ts:120` 이 쓴다)로 | UI 기획 · 백엔드 명세 |
| 19 | 목록 페이징 + `QuoteSummary` 분리(§7.8) — IA-04 P0 와 한 배치로. **⚠ 이 화면 고유**: 목록이 `items` 전문을 **합계 계산에 쓰므로** 단순히 뺄 수 없다 — **서버 계산 `total` 로 대체**해야 하고 그것이 §7.2 의 세액 계약을 전제한다. **정렬(`sort=total:desc`·`validUntil:asc`)·만료 필터가 그때 서버 기능이 되고**, 검색 범위(품목명 포함)도 그때 정한다 | 백엔드 명세 · UI 기획 |
| 20 | 견적서 저장 시 XSS 정제(§7.6 ③) — `note`·`items[].name`·`items[].spec`·`inquiryBody`. **quality-bar ERP-10 이 '견적서 print-template' 을 명시 지목하고 이 화면이 그 주 대상**이다 — PDF 렌더러는 React 이스케이프를 상속하지 않는다. BE-048 §7.10 · BE-049 §7.10 #12 와 같은 뿌리이나 **여기서 가장 임박했다** | 백엔드 명세 |
| 21 | **견적서 발송 워크플로가 없다** — 상태 `sent` 는 사람이 고르는 select 일 뿐 이메일·팩스 코드가 0건이다. BE-049 §7.9 의 `signStatus` 와 같은 결. 도메인 경계 결정이 선행 | 아키텍처 · 백엔드 명세 |
| 22 | 400 `error.fields` 를 프론트가 필드 인라인 에러로 매핑하지 않는다 — `useCrudForm` 은 **422 만** `setError` 로 꽂는다(`:182`). BE-048·BE-049 와 공동 | UI 기획 · 백엔드 명세 |
| 23 | 401 감지·리다이렉트는 구현됐으나 **미저장 입력이 유실**된다(quality-bar EXC-19 P1) — **이 화면은 품목 30행을 잃는다.** 프론트 타임아웃 상한 없음(EXC-05 P1) · 오프라인 감지 없음(EXC-11 P1) | UI 기획 · 프론트 구현 |
| 24 | 목록 엑셀 내보내기 부재(quality-bar ERP-12 P1) — 견적 목록은 영업 실적 집계의 대표 대상이다 | UI 기획 · 백엔드 명세 |

## 8. 자기 점검

- [x] FS-050 §5 요소가 전부 엔드포인트로 커버됐다 — 심 있는 **7건**(EP-01~07) 매핑 완료. **EP-06(수주 전환)은 '심 있음, 그러나 화면이 부르지 않고 대상 도메인이 없어 본문 미정'**, **EP-07(문의 발행)은 '심 있음, BE-051 과 공동 소유'**, **EP-08(일괄 삭제)은 '심 없음(미정)'** 으로 명시하고 §7.4·§7.5 판정을 남겼다. **엔드포인트를 발명하지 않았다** — `data-source.ts:142`(CRUD) · `:143`(convert) · `:132-133`(issue-quote) 의 심 **3줄**이 EP-01~07 전부의 근거다
- [x] 모든 엔드포인트가 FS 요소를 역참조한다
- [x] §5 예외 9축 빈칸 0건, 모든 `N/A` 사유 있음 (7행 × 9열 — EP-08 이 행이 없는 이유를 §5 서두에 명시)
- [x] 에러 봉투·권한 모델을 BE-003 §2·§3 상속으로 선언, 재정의 안 함. **권한만 고유 차이**(`operator` 조회 전용 — §7.3)를 근거와 함께 기술
- [x] **어댑터 팩토리를 직접 확인**했다(`data-source.ts:144` `createStoreAdapter`) — **형제(BE-048·049)의 `createCrudAdapter` 와 다르고 그 이유가 문의 연동임**(`:6-9` 주석)을 §1.1·§6.1 에 적었다. **409 가 '존재 여부' 기반이지 version/ETag 토큰이 아님을 §7.1 이 표로 갈랐다** — 유령 저장은 해소(저장소·어댑터 이중 가드), 동시 편집은 여전히 last-write-wins
- [x] **【보안 판정】 4건** — ① **§7.2 금액의 신뢰 경계**: `Quote` 에 합계 필드가 **없음을 전수 확인**하고, **클라이언트가 금액을 계산하지만 보내지 않는다**는 사실을 근거로 **'신뢰 경계는 이미 옳다'** 고 판정했다(결함으로 적지 않았다). 계약해야 할 것은 **세액 규칙(라인별 반올림)과 세율의 정본**임을 §7.2 가 가른다 ② **§7.3 403 vs 404 은닉** — 견적은 '부르는 금액과 할인 여지'라 계약보다 민감도의 성격이 다르다 ③ **§7.4 승계 필드 위조** — 클라이언트가 `inquiryId`·`inquiryBody` 를 되돌려 보내 **남의 문의에 견적을 붙이거나 근거를 조작할 수 있다**. UI 의 읽기 전용이 서버의 읽기 전용이 아니다 ④ **§7.6 XSS(견적서 PDF)**
- [x] **금액을 §3 에서 '클라이언트 파생 — 서버 계약 아님(✕)'으로 분리**하고, **페이징 도입 시 `total` 이 서버 계약으로 승격됨**을 §7.8 에 예고했다. **목록이 `items` 를 합계 계산에 쓰므로 `QuoteSummary` 에서 단순히 뺄 수 없다**는 이 화면 고유 제약을 명시했다
- [x] **`quoteNo` 의 `readOnly` ↔ `required` 모순을 코드로 검증**했다 — **사실이다**. `validation.ts:24` ↔ `QuoteFormPage.tsx:122,295` ↔ `useCrudForm.ts:260` 의 사슬. **BE 관점의 함의**(`POST /api/sales/quotes` 가 현재 호출조차 되지 않으며, 이것이 **연동의 선행 조건**임)를 §4 EP-02 · §6 · §6.1 · §7.7 ① · §7.9 #2 에 적었다
- [x] **심과 구현이 어긋나는 두 지점을 발견해 판정했다** — ① **수주 전환**: 심은 `POST /convert`(주문 복사), 구현은 `PUT`(상태만). 주문 도메인 부재 → **본문을 확정하지 않고 아키텍처 이관**(§7.5) ② **중복 발행**: 심은 409, 구현은 기존 견적 반환 → **구현이 옳고 심 문구를 고쳐야 한다**고 판정(§7.4)
- [x] 멱등성 판정 — GET 멱등 / POST·PUT 은 **멱등키로 멱등**(키가 실제로 어댑터까지 도달함을 `crud.ts:168,201,208` 로 확인) / **DELETE 는 키 없이 옴**(`useCrudList.tsx:102`) / **수주 전환도 키 없이 옴**(`useCrudRowUpdate.ts:45`) — 주문 생성 계약이 되면 필수가 됨을 §7.5 에 예고
- [x] **상태 전이 규칙이 코드에 존재하지 않음을 전수로 확인**하고(`types.ts`·`validation.ts` 에 `STATUS_FLOW`/`canSetStatus` 0건) §7.5 에 서버 정본 표를 세웠다. **`canConvertToOrder` 가 전이 규칙처럼 보이나 버튼 표시 조건일 뿐**임을 갈랐다. **만료 판정이 이 도메인에 아예 없음**(계약의 `isRenewalDue` 와 대비)도 확인해 적었다
- [x] **문의 연동을 상대 코드까지 열어 확인**했다 — `inquiries/data-source.ts:124-151,163` · `inquiries/types.ts:50-56` · `inquiries.test.ts:105-118`. 심의 소유 경계(경로는 문의, 심은 견적 파일)를 §4 EP-07 에 명시하고 **BE-051 공동**으로 표시했다
- [x] 서버 코드·저장소 설계를 쓰지 않았다
