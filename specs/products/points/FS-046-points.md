---
id: FS-046
title: "적립금 정책 (단일 문서 설정)"
screen: SCR-046               # ⚠ 상품 관리 SCR 미작성 — §7 미결 사항 참조
route: /products/points
owner: A62
reviewer: A64
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-046. 적립금 정책 (단일 문서 설정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 적립금의 **전역 규칙**을 문서 1건으로 관리한다: 적립 기준(실결제/주문금액) · 새 상품의 기본 적립률 · 회원가입 적립금 · 사용 조건(최소 사용·사용 단위·1회 한도) · 유효기간 |
| 역할(주 사용자) | 관리자 (**이 화면에 쓰기 권한 분기가 없다** — §7 #2) |
| 진입 경로 | 좌측 GNB > 상품 관리 > 적립금 (`/products/points` — `nav-config.ts:150`). **잎 라우트이며 하위 라우트가 없다**(`App.tsx:238`) |
| 포함 화면 | `/products/points` **하나뿐** — 목록·상세·등록/수정 라우트가 없다 |
| **범위 밖** | **개별 회원의 적립금 잔액·지급·차감** — 회원 상세의 `PointsCard`(`pages/members/components/PointsCard.tsx`)가 소유한다. 이 화면은 **정책**이고 그쪽은 **거래**다(`PointsPolicyPage.tsx:3-4` 주석). **상품별 적립 설정** — 상품 폼이 소유한다(`_shared/store.ts` 의 `ProductPoints`). 이 화면의 '기본 적립률'은 **새 상품의 초기값**(`DEFAULT_POINTS` — `_shared/store.ts:169`)이고 상품이 그것을 덮어쓴다(`:93-96` 주석 — 배송 정책과 정확히 같은 관계). **적립금 지급·소멸 실행** — 이 화면은 규칙만 정하고 실행하지 않는다(§7 #1) |
| 구현 경로 | `apps/admin/src/pages/products/points/**` (4파일 · 총 172행 — **담당 4화면 중 가장 작다**) |
| 대응 SCR | SCR-046 (미작성 — §7 #12) |
| 공통 컴포넌트 | `shared/ui/{FormField,SelectField,controlStyle,errorIdOf,useToast}` · `shared/crud/{DocumentFormShell,createDocumentStore,useDocumentQuery,useSaveDocument,dev}` · `shared/form/zodResolver` · `shared/async(isAbort)` |

> **이 화면이 남아 있는 이유가 코드에 적혀 있다**(`PointsPolicyPage.tsx:6-13`): 적립률은 상품별로 갈라졌지만 나머지 다섯은 **상품에 속하지 않는다** — 회원가입 적립금(가입 시점의 지급이라 상품이 없다) · 최소 사용·사용 단위·1회 한도(주문 단위의 '사용' 규칙이지 적립이 아니다) · 유효기간(적립된 포인트의 소멸 규칙이라 어느 상품에서 왔는지와 무관하다).

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-046-SEC-01 | 화면 안내문 | 카드 위 설명 1줄 |
| FS-046-SEC-02 | 정책 폼 카드 | 적립 기준 select 1개 + 숫자 입력 6개 |
| FS-046-SEC-03 | 카드 footer | 상태 문구 + 저장 버튼 |
| FS-046-SEC-04 | 로딩 스켈레톤(비표시 기본) | 최초 조회 중 카드 본문 대체 |
| FS-046-SEC-05 | 조회 실패 배너(비표시 기본) | 화면 전체 대체 |
| FS-046-SEC-06 | 저장 실패 배너(비표시 기본) | 카드 안 상단 |
| FS-046-SEC-07 | 미저장 이탈 가드(비표시 기본) | 입력 파기 확인 |

> **영역 5개가 `DocumentFormShell` 소유다**(SEC-01·03·04·05·06·07 — `shared/crud/DocumentFormShell.tsx`). 이 화면이 직접 그리는 것은 **SEC-02 의 필드 7개뿐**이다(`PointsPolicyPage.tsx:130-167`). 회사 정보·CEO 인사말 등 단일 문서형 화면들과 골격을 공유한다(`DocumentFormShell.tsx:2-7`).

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-046-EL-001 | FS-046-SEC-01 | 화면 안내문 | 텍스트 | 카드 위 muted 1줄(`DocumentFormShell.tsx:119`): '별표(*) 항목은 필수입니다. 적립률은 상품별로 설정하며, 여기서는 새 상품의 기본 적립률과 적립금 사용·소멸 규칙을 정합니다.'(`PointsPolicyPage.tsx:120`) | — | **경계를 사용자에게 알리는 유일한 문구다** — 이 화면이 왜 적립률만 정하지 않는지를 설명한다 |
| FS-046-EL-002 | FS-046-SEC-02 | 카드 제목 | 텍스트 | `CardTitle`(`<h2>` — `shared/ui/Card.tsx:39`)에 '적립금 정책'(`:119`) | — | **화면에 `<h1>` 이 없다** — 제목이 AppHeader 에서 온다('적립금' — 잎 라벨). 담당 4화면 중 유일하다(§7 #3) |
| FS-046-EL-003 | FS-046-SEC-02 | 적립 기준 select | 입력 | `FormField htmlFor="pts-baseline" label="적립 기준" required`(`:130-138`). 선택지 2개: 실결제금액(`payment`) · 주문금액(할인 전)(`order`) — `EARN_BASELINE_OPTIONS`(`types.ts:13-16`). 자식이 DS `SelectField` 라 **`required` 가 런타임에 `aria-required` 로 주입**된다(`FormField.tsx:36-56`). 로딩·저장 중 비활성 | O | **오류 슬롯이 없다** — enum 이라 위반 값이 존재할 수 없다(`z.enum(['payment','order'])` — `validation.ts:42`). **이 값이 실제로 적립 계산에 쓰이는 곳이 앱에 없다**(§7 #1) |
| FS-046-EL-004 | FS-046-SEC-02 | 기본 적립률 입력 | 입력 | 라벨 '기본 적립률 (%)', placeholder '예: 1', **hint '새 상품의 초기 적립률입니다. 상품별 적립 설정이 이 값을 덮어씁니다.'**(`:45-51`) | O | 검증 `percentString('적립률')` — 0–100 정수(`validation.ts:41`). **이 값이 `DEFAULT_POINTS`(`_shared/store.ts:169` — 하드코딩 `rate: 1`)와 연결돼 있지 않다**(§7 #4) |
| FS-046-EL-005 | FS-046-SEC-02 | 회원가입 적립금 입력 | 입력 | 라벨 '회원가입 적립금 (원)', placeholder '예: 3000'(`:52`) | O | 검증 `intString('회원가입 적립금')` — 0 이상 정수(`validation.ts:43`). **상한이 없다** — 1조원도 통과한다(§7 #5) |
| FS-046-EL-006 | FS-046-SEC-02 | 최소 사용 포인트 입력 | 입력 | 라벨 '최소 사용 포인트 (P)', placeholder '예: 5000'(`:53-58`) | O | 검증 `intString('최소 사용 포인트')`(`validation.ts:44`) |
| FS-046-EL-007 | FS-046-SEC-02 | 사용 단위 입력 | 입력 | 라벨 '사용 단위 (P)', placeholder '예: 100'(`:59`) | O | 검증 `positiveIntString('사용 단위')` — **1 이상**(`validation.ts:45`). 0 을 막는 유일한 필드 중 하나다 — 0 단위는 나눗셈을 깨뜨린다 |
| FS-046-EL-008 | FS-046-SEC-02 | 1회 사용 한도 입력 | 입력 | 라벨 '1회 사용 한도 (%)', placeholder '예: 50', **hint '주문금액 대비 사용 상한'**(`:60-66`) | O | 검증 `percentString('1회 사용 한도')` — 0–100 정수(`validation.ts:46`) |
| FS-046-EL-009 | FS-046-SEC-02 | 유효기간 입력 | 입력 | 라벨 '유효기간 (개월)', placeholder '예: 12'(`:67`) | O | 검증 `positiveIntString('유효기간(개월)')` — **1 이상**(`validation.ts:47`). **'무기한' 을 표현할 값이 없다** — 0 이 막혀 있다(§7 #6) |
| FS-046-EL-010 | FS-046-SEC-02 | 숫자 필드 렌더 규칙 | 텍스트 | 6개 숫자 입력이 **`NUMBER_FIELDS` 배열(`:44-68`)에서 파생**된다(`:141-166`) — 각 항목이 `{ name, id, label, placeholder, hint? }`. 공통 렌더: `<input type="text" inputMode="numeric" className="tds-ui-input tds-ui-focusable">` + `style={controlStyle(fieldError !== undefined)}` + **`aria-invalid`·`aria-describedby={errorIdOf(spec.id)}` 짝**(`:160-161`) + `{...register(spec.name)}`. 자식이 네이티브 `input` 이라 `required` 가 `aria-required` 로 주입된다 | — | 비표시 규칙. **폼 필드를 손으로 6번 복붙하지 않는다** — 그래서 6개 전부가 같은 a11y 계약을 갖는다(형제 화면 `CouponFormPage` 는 손으로 써서 3개가 갈렸다 — FS-045 §7 #17). **숫자를 문자열로 든다** — 입력 원값 보존 |
| FS-046-EL-011 | FS-046-SEC-04 | 로딩 스켈레톤 | 스켈레톤 | **최초 조회에서만** 카드 본문을 **4줄 고정** 스켈레톤 막대로 대체한다(`DocumentFormShell.tsx:127-132`, `aria-busy="true"`). 안내문·카드 제목·footer 는 남는다 | — | 비표시. 조건이 `loading = isFetching && data === undefined`(`PointsPolicyPage.tsx:95`)라 **재조회에서는 폼이 유지된다.** 스켈레톤 줄 수(4)가 실제 필드 수(7)와 다르다(§7 #7) |
| FS-046-EL-012 | FS-046-SEC-05 | 조회 실패 배너 | 배너 | 조회 실패 시 **화면 전체**(안내문·카드·footer 전부)를 위험 톤 `Alert` '내용을 불러오지 못했습니다.' + '다시 시도'(`refetch`)로 대체한다(`DocumentFormShell.tsx:102-115`) | O | 비표시. **404/5xx 를 구분하지 않는다** — 단일 문서라 '없음'이 성립하지 않는다(`createDocumentStore` 의 `fetch` 는 언제나 `doc` 을 돌려준다 — `document.ts:25-29`). 문구가 '적립금 정책' 이 아니라 **도메인 없는 '내용'** 이다(§7 #8) |
| FS-046-EL-013 | FS-046-SEC-06 | 저장 실패 배너 | 배너 | 카드 안 상단 위험 톤 `Alert` '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`DocumentFormShell.tsx:125` ← `PointsPolicyPage.tsx:111`). 재저장 시 먼저 지운다(`:99`) | O | 비표시. **오류 참조 코드가 없다** — 형제 화면들은 `FormServerError` 로 `오류 코드 TDS-…` 를 보인다(`FormFeedback.tsx:44` · `ReturnDetailPage.tsx:276`). 이 셸은 `serverError: string \| null` 만 받는다(§7 #9) |
| FS-046-EL-014 | FS-046-SEC-03 | footer 상태 문구 | 텍스트 | 저장 버튼 왼쪽 caption(`DocumentFormShell.tsx:138-144`): 저장 중 '저장하는 중입니다…' / 미저장 변경 있음 '저장하지 않은 변경 사항이 있습니다.' / 그 밖 '변경 사항이 없습니다.' | — | 비표시 아님(항상 표시). **저장 버튼이 왜 비활성인지 말해 주는 유일한 문구다** |
| FS-046-EL-015 | FS-046-SEC-03 | 저장 버튼 | 버튼 | footer 우측. `type="submit" variant="primary" size="md"`. 라벨 `{saving ? '저장 중…' : '저장'}`(`DocumentFormShell.tsx:145-152`). **비활성 조건**: 미변경(`!dirty`) · 저장 중 · 로딩 중(`:149`) | O | **진행 상태를 `loading` prop 이 아니라 손으로 쓴 라벨로 표현한다**(§7 #10). **동기 제출 락·멱등키가 없다**(§7 #11) |
| FS-046-EL-016 | FS-046-SEC-03 | 저장 성공 토스트 | 토스트 | '적립금 정책을 저장했습니다.'(`PointsPolicyPage.tsx:107`). 이어서 `reset(values)` 로 폼을 방금 저장한 값으로 재기준화해 dirty 를 푼다(`:106`) | — | 비표시. **이동하지 않는다** — 단일 문서라 돌아갈 목록이 없다. 조사가 없는 고정 문구다(`'정책을'` — 받침 고정어) |
| FS-046-EL-017 | FS-046-SEC-07 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })`(`DocumentFormShell.tsx:100` ← `PointsPolicyPage.tsx:126-127`). `dirty` 는 **RHF `formState.isDirty`**(`:80`). 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel — `useUnsavedChangesDialog.tsx:8-14`). 문구 '적립금 정책에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'(`:27-28`) | — | 비표시. **이 화면에 `navigate()` 프로그램 이동이 없다**(back-link·취소 버튼이 없다) — 그래서 형제 화면들의 '가드가 프로그램 이동을 못 잡는다' 결함이 **여기서는 발현되지 않는다** |
| FS-046-EL-018 | FS-046-SEC-02 | 검증 규칙 | 텍스트 | 정본은 `pointsPolicySchema`(`validation.ts:40-48`). 세 검증기를 조합한다: `percentString`(0–100 정수 — `:19-27`) · `intString`(0 이상 정수 — `:8-16`) · `positiveIntString`(1 이상 정수 — `:30-38`). **교차 검증이 없다** — 필드 간 관계를 보지 않는다(§7 #5). 오류 문구의 조사는 `objectParticle`·`topicParticle` 로 받침에서 고른다(`:4,11,14,22,25,33,36`) — **리터럴 '을(를)' 을 출하하지 않는다** | — | 비표시 규칙. `zodResolver` 가 RHF 에 잇는다(`PointsPolicyPage.tsx:82`). 검증 실패 시 RHF `shouldFocusError` 기본값이 첫 invalid 필드로 포커스를 옮긴다 |
| FS-046-EL-019 | FS-046-SEC-02 | dirty 판정·reset 규칙 | 텍스트 | ① **기본값** `DEFAULT_POINTS_POLICY`(`types.ts:19-27`)로 폼을 연다 — 조회 전에도 값이 보인다. ② 문서가 도착하면 `reset(data)`(`:90-93`)가 폼을 덮고 dirty 기준을 그 값으로 재설정한다. ③ 저장 성공 시 `reset(values)`(`:106`)로 다시 재기준화한다 | — | 비표시 규칙. **②가 편집 중 재조회에서도 돈다** — 그 밖의 재조회가 오면 입력이 덮인다(§7 #13). 다만 이 화면은 `staleTime` 30초 안에 재조회가 잘 일어나지 않는다 |
| FS-046-EL-020 | FS-046-SEC-03 | 언마운트 abort | 텍스트 | 화면을 벗어나면 진행 중인 저장 요청을 abort 한다(`:88`). abort 는 실패로 통지하지 않는다(`isAbort(cause)` → 즉시 return — `:110`) | — | 비표시 규칙. **`onSuccess` 에 `signal.aborted` 가드가 없다**(`:105-108`) — 그러나 abort 시 `wait(LATENCY_MS, signal)` 이 먼저 reject 하므로(`document.ts:31`) 성공 경로에 도달하지 않는다 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-046-EL-001 | N/A — 정적 문구 | 로딩 중에도 표시(카드 밖) | 조회 실패 시 EL-012 가 화면 전체를 대체해 이 문구도 사라진다 | N/A — 입력 없음 | **§4.1 공통 규칙 — 이 화면에 쓰기 게이팅이 없다** | N/A — 상태 없음 | 고정 문구 |
| FS-046-EL-002 | N/A — 정적 문구 | 로딩 중에도 표시(카드는 남고 본문만 스켈레톤) | 조회 실패 시 카드째 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | N/A | 고정 문구 |
| FS-046-EL-003 | N/A — 항상 값이 있다(기본 '실결제금액' — `types.ts:20`) | 로딩 중 비활성(`disabled = saving \|\| loading` — `:96`) | 저장 실패는 EL-013 | `z.enum(['payment','order'])`. **오류 슬롯이 없다** — select 가 그 두 값만 그리므로 위반이 불가능하다 | §4.1 공통 규칙 적용 | 문서가 도착하면 `reset` 이 값을 덮는다(EL-019) | 선택지 2개 고정 |
| FS-046-EL-004 | 기본값 '1'(`types.ts:20`) | 로딩 중 비활성 | 저장 실패는 EL-013. 실패 시 **입력 보존** | `percentString('적립률')` — 빈 값 → '적립률을 입력하세요.' · 비정수·100 초과 → '적립률은 0% 이상 100% 이하로 입력하세요.'. **`maxLength` 가 없다.** `aria-invalid`+`aria-describedby` 짝 · `aria-required` 주입 | §4.1 공통 규칙 적용 | 위와 동일 | 상한 100. **카운터·경고 없음** |
| FS-046-EL-005 | 기본값 '3000' | 로딩 중 비활성 | 저장 실패는 EL-013 | `intString('회원가입 적립금')` — 0 이상 정수. **상한이 없다**(§7 #5). `aria-invalid` 짝 · `aria-required` 주입 | §4.1 공통 규칙 적용 | 위와 동일 | 상한 없음 |
| FS-046-EL-006 | 기본값 '5000' | 로딩 중 비활성 | 저장 실패는 EL-013 | `intString`. 상한 없음. **`useUnit` 과의 관계를 보지 않는다**(§7 #5) | §4.1 공통 규칙 적용 | 위와 동일 | 상한 없음 |
| FS-046-EL-007 | 기본값 '100' | 로딩 중 비활성 | 저장 실패는 EL-013 | `positiveIntString('사용 단위')` — **1 이상**. 0 → '사용 단위는 1 이상의 정수로 입력하세요.'. 회귀 `points.test.ts:22-25` | §4.1 공통 규칙 적용 | 위와 동일 | 상한 없음 |
| FS-046-EL-008 | 기본값 '50' | 로딩 중 비활성 | 저장 실패는 EL-013 | `percentString('1회 사용 한도')` — 0–100. **0% 가 통과한다** — '포인트를 아예 못 쓴다'는 뜻인데 그것이 의도인지 알 수 없다(§7 #5) | §4.1 공통 규칙 적용 | 위와 동일 | 상한 100 |
| FS-046-EL-009 | 기본값 '12' | 로딩 중 비활성 | 저장 실패는 EL-013 | `positiveIntString('유효기간(개월)')` — **1 이상**. 빈 값 → 막힌다(회귀 `points.test.ts:27-30`). **'무기한'을 표현할 값이 없다**(§7 #6) | §4.1 공통 규칙 적용 | 위와 동일 | 상한 없음 — 9999개월도 통과 |
| FS-046-EL-010 | N/A — 렌더 규칙 | 6개 전부 같은 조건으로 비활성 | N/A — 규칙 자체는 실패하지 않는다 | **6개 전부가 같은 a11y 계약을 갖는다** — 배열에서 파생돼 손 복붙 편차가 없다 | §4.1 공통 규칙 적용 | N/A — 순수 렌더 | 필드 6개 고정 |
| FS-046-EL-011 | N/A — 도착 전 상태 | 이것이 로딩 표현. 4줄 고정 + `aria-busy="true"` | 조회 실패 시 EL-012 로 바뀐다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **재조회에서는 뜨지 않는다** — 폼이 유지된다(`:95`) | 줄 수가 하드코딩 4 라 실제 필드 수(7)와 다르다(§7 #7) |
| FS-046-EL-012 | N/A — 실패 상태 | 재시도 시 배너가 사라지고 스켈레톤으로 | 이것이 실패 표현. 1문구 고정. 복구 '다시 시도' | N/A — 입력 없음 | §4.1 공통 규칙 적용 — **권한 부족(403)도 이 배너**로 뭉개진다(§7 #14) | 재시도는 같은 조회를 재발행 | N/A — 표시 전용 |
| FS-046-EL-013 | N/A — 오류 없으면 미렌더 | 재저장 시 기존 문구를 먼저 지운다(`:99`) | 이것이 저장 실패 표현. **문구 1종** — 400/403/409/422/500 을 전부 뭉갠다(§7 #14). abort 는 표시하지 않는다 | **서버 검증 오류를 필드로 되돌릴 경로가 없다** — `useCrudForm` 의 422 매핑(`useCrudForm.ts:182-192`)을 상속하지 못한다(§7 #15) | §4.1 공통 규칙 적용 — 권한 부족도 이 문구 | **충돌 다이얼로그가 없다** — 409 도 이 문구로 뭉개진다. 문서 저장에 낙관적 동시성이 아예 없다(§7 #16) | 1건만 표시 |
| FS-046-EL-014 | N/A — 항상 표시 | '저장하는 중입니다…' | N/A — 상태 문구 | 미변경이면 '변경 사항이 없습니다.' | §4.1 공통 규칙 적용 | 문서 재조회로 `reset` 이 돌면 '변경 사항이 없습니다.' 로 되돌아간다 | 3분기 고정 |
| FS-046-EL-015 | N/A — 항상 표시 | 요청 중 라벨이 '저장 중…' + 비활성 | 실패 시 EL-013 배너, 버튼 재활성, 입력 보존 | 미변경·로딩 중이면 비활성. 검증 실패 시 제출되지 않고 **첫 invalid 필드로 포커스가 간다**(RHF `shouldFocusError`) | §4.1 공통 규칙 적용 — **쓰기 권한을 묻지 않는다**(§7 #2) | **동기 제출 락·멱등키가 없다** — 비활성 렌더 전 연타가 두 번째 요청을 통과시킬 수 있다(§7 #11). **완화**: 문서 전체 치환이라 두 번 실행돼도 최종 상태가 같다(형식적 멱등) | 단건 저장. 문서 전체(7필드)를 보낸다 |
| FS-046-EL-016 | N/A — 성공이 있어야 성립 | N/A — 결과 통지 | N/A — 실패는 배너가 담당 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **저장이 실제로 아무것도 바꾸지 않아도 성공 토스트가 뜬다** — `createDocumentStore.save` 가 `doc = input` 한 줄이라(`document.ts:33`) 항상 성공한다. 유령 저장 가드가 **구조적으로 불가능**하다(§7 #16) | 1건 |
| FS-046-EL-017 | N/A — 변경이 있어야 성립 | 저장 중에는 가드가 비활성(`dirty && !saving`) | N/A — 서버 호출 없음 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 저장 성공 후 `reset(values)` 가 dirty 를 풀어 가드가 해제된다 | N/A — 표시 전용 |
| FS-046-EL-018 | N/A — 검증 규칙 | N/A — 동기 판정 | N/A — 서버 호출 없음 | **이것이 유효성 규칙 자체다.** 필드 7개, **교차 검증 0건**(§7 #5) | §4.1 공통 규칙 적용 | N/A — 순수 판정 | 필드 7개 |
| FS-046-EL-019 | 초기 렌더는 `DEFAULT_POINTS_POLICY` 기준 | 문서 도착 전에는 기본값이 보인다 | 조회 실패 시 화면이 EL-012 로 대체돼 폼 자체가 사라진다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | **②의 `reset(data)` 가 편집 중 재조회에서도 돈다** — 입력이 덮인다(§7 #13) | N/A — 순수 규칙 |
| FS-046-EL-020 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | **abort 는 실패가 아니다** — 배너·토스트를 띄우지 않는다 | N/A — 입력 없음 | §4.1 공통 규칙 적용 | 이탈 시 진행 중 저장이 취소된다 — **서버 도달 여부는 보장하지 않는다** | 단건 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 화면 전체 대체 배너(EL-012), 저장 실패는 카드 안 배너(EL-013). **오프라인 감지·복귀 재조회는 앱 전역에 없다**(`navigator.onLine` 0건) — §7 #17 |
| 세션 만료 | 조회·저장 어디서든 401 이 오면 **앱 전역 401 인터셉터**(`shared/query/queryClient.ts` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError`)가 `notifySessionExpired()` 를 쏘고 `RequireAuth` 가 `/login?returnUrl=%2Fproducts%2Fpoints&reason=session_expired` 로 보낸다. **다만 미저장 입력은 그때 사라진다** — 프로그램적 이동이라 EL-017 가드가 발화하지 않는다 — §7 #17 |
| 요청 타임아웃 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 화면 이탈(EL-020) 시에만 발생한다 — §7 #17 |
| 중복 제출 | 저장 버튼은 요청 중 비활성된다. **동기 제출 락(`submitLockRef`)·멱등키가 없다** — 이 화면이 `useCrudForm` 이 아니라 `useForm` + `useSaveDocument` 를 직접 쓰기 때문이다(§7 #11). **완화**: 문서 전체 치환이라 같은 요청을 두 번 보내도 최종 상태가 같다 — **이중 지급이 아니다**(개별 회원의 적립금 지급은 이 화면이 아니라 `PointsCard` 소관 — §1 범위 밖) |
| 실패 통지의 자리 | ① 조회 실패는 화면 대체 배너 ② 저장 실패는 카드 안 배너(**참조 코드 없음** — §7 #9) ③ 저장 **성공**은 토스트 ④ abort 는 아무것도 띄우지 않는다. **이 화면에 삭제·일괄 작업·다이얼로그 내부 실패 경로가 없다** |
| 낙관적 업데이트 | **이 화면에 없다.** 저장은 비관적(요청 완료 후 `reset`)이다 — 롤백 경로가 필요 없다 |
| 동시 조회 | 문서 조회는 동시에 1건만 유지된다(react-query, `queryKey: ['points-policy']` — `data-source.ts:9`). `staleTime` 30초 · 자동 재시도 없음 · 창 포커스 재조회 없음(`queryClient.ts`). **`placeholderData` 가 없다** — `useDocumentQuery`(`document.ts:38-46`)가 그것을 넘기지 않는다. 이 화면에서는 무해하다(재조회가 잘 일어나지 않는다) |
| 권한 없음 | 라우트 read 권한은 AppShell 의 `RequirePermission` 이 `<Outlet>` 바깥에서 가드해 403 화면을 렌더한다(`AppShell.tsx:490-492`). **그러나 쓰기 게이팅(`useRouteWritePermissions`)이 이 화면에 배선돼 있지 않아** 쓰기 권한 없는 역할도 폼을 편집하고 '저장'을 누를 수 있다(§7 #2). **형제 화면 `settings/site/SiteSettingsPage.tsx:109` 는 같은 단일 문서형인데 `canUpdate` 를 배선했다** — 계약이 갈린다. 서버 권한 응답(403)은 저장 배너로 떨어지며 권한 문구로 갈리지 않는다(§7 #14) |
| 렌더 예외 | AppShell 이 `<Outlet>` 바로 바깥에 `ErrorBoundary` 를 둔다(`AppShell.tsx:484-493`) — 화면이 던져도 사이드바·헤더가 남고 복구 화면이 뜬다 |
| 행 선택의 수명 | N/A — 이 화면에 목록·행 선택이 없다(단일 문서 폼) |
| 상태 전이 규칙 | N/A — 이 화면에 상태 개념이 없다(설정 문서 1건) |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 (data-source.ts) | 비고 |
|---|---|---|---|---|---|
| FS-046-EL-003 ~ EL-009 / EL-011 / EL-012 / EL-019 | 적립금 정책 조회 | R | 정책 문서 1건(7필드) | `pointsPolicyStore.fetch(signal)` (`createDocumentStore` — `document.ts:25-29`) → `useDocumentQuery(pointsPolicyKey, pointsPolicyStore)`(`:38-46`) | **단일 문서라 id 가 없다.** 404 가 성립하지 않는다 — `fetch` 는 언제나 `doc` 을 돌려준다 |
| FS-046-EL-013 / EL-015 / EL-016 | 적립금 정책 저장 | W | `PointsPolicyValues` 전체(7필드) | `pointsPolicyStore.save(input, signal)` (`document.ts:30-34`) → `useSaveDocument(pointsPolicyKey, pointsPolicyStore)`(`:53-64`) | **전체 치환**(`doc = input`). 성공 시 문서 쿼리를 무효화한다(`:60-62`). **멱등키 자리가 없다** — `SaveVars` 가 `{ input, signal }` 뿐(`:48-51`) |

> **현재 구현 상태 (A63 참고)**: 백엔드는 없다. `pointsPolicyStore` 는 공용 `createDocumentStore('points-policy', DEFAULT_POINTS_POLICY)`(`data-source.ts:12-15` → `shared/crud/document.ts:22-36`)로 **모듈 스코프 변수 `doc` 하나**를 들고 400ms 지연(`LATENCY_MS`)과 개발용 실패 스위치(`failIfRequested('points-policy', op)`)를 얹어 fetch/save 를 흉내 낸다 — 실제 네트워크 0건. `fetch` 는 `doc` 을 그대로 반환하고(404 경로 없음), `save` 는 `doc = input` **한 줄**이다(`document.ts:33`) — **검증도 충돌 검사도 없다.** 새로고침하면 시드로 되돌아간다. `data-source.ts:11` 의 `// TODO(backend): GET/PUT /api/points-policy` 가 **이 화면의 유일한 연동 지점**이며 두 조작을 전부 덮는다. `pointsPolicyKey = ['points-policy']`(`:9`)가 쿼리 키다. 위 표는 백엔드 연결 후 의도된 동작이다.
>
> **`createDocumentStore` 의 op 은 `list`/`detail`/`save` 가 아니라 `load`/`save` 다**(`document.ts:27,32`) — 형제 CRUD 화면들과 스위치 이름이 다르다. NFR-046 §6 이 그것을 못박는다.

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `PointsPolicyPage.tsx`(170행) · `data-source.ts`(15행) · `types.ts`(27행) · `validation.ts`(50행) · `points.test.ts`(36행) · 소비하는 공용 모듈(`shared/crud/{DocumentFormShell,document,dev}` · `shared/form/zodResolver` · `packages/ui/FormField`) · 경계에 있는 `_shared/store.ts`(`DEFAULT_POINTS`·`ProductPoints`·`earnedPoints`)
- [x] **이 화면이 `<h1>` 을 그리지 않음을 코드로 확인**했다(`grep '<h1' pages/products/points` = 0건. `DocumentFormShell` 도 그리지 않는다 — `CardTitle` 은 `<h2>`) — 담당 4화면 중 유일하며 IA-02 판정이 그것에 걸린다(NFR-046 §2)
- [x] **쓰기 권한 게이팅이 이 화면에 없음을 코드로 확인**했다(`useRouteWritePermissions` grep — 이 디렉터리 0건. **같은 단일 문서형인 `settings/site/SiteSettingsPage.tsx:109` 는 배선했다**) — §4.1·§7 #2
- [x] 보이지 않는 요소(스켈레톤·조회/저장 실패 배너·이탈 가드·숫자 필드 렌더 규칙·검증 규칙·dirty/reset 규칙·abort·성공 토스트)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다 — **조회·저장 2건뿐**이며 `createDocumentStore` 의 op 이름이 `load`/`save` 임을 명시했다
- [x] **영역 7개 중 6개가 `DocumentFormShell` 소유이고 이 화면이 직접 그리는 것은 필드 7개뿐**임을 §2 에 명시했다 — 그래서 §7 의 결함 다수가 **셸 소유**다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-046 영역)
- [x] §7 의 미결 항목이 BE-046 §7.8 후속 이관 · NFR-046 §5 와 일치한다

## 7. 미결 사항 (A11 / A01 / A63 / A40 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | **이 정책을 읽어 적립을 실행하는 코드가 앱에 없다.** `earnBaseline`(실결제/주문금액) · `signupBonus` · `minUseAmount` · `useUnit` · `maxUseRate` · `expireMonths` **여섯 필드 전부**를 소비하는 곳이 `grep` 0건이다. 상품의 `earnedPoints`(`_shared/store.ts:228-232`)는 **상품별 `ProductPoints` 만** 쓰고 이 정책을 보지 않는다(그 함수 주석 `:223-225` 이 '전역 정책의 적립 기준은 주문 단위 계산에 쓰이고'라고 적지만 **그 주문 단위 계산이 존재하지 않는다**). 이 화면은 **아무도 읽지 않는 값을 저장한다** | **A01 (도메인 경계 — 선행)** · A63 (BE-046 §7.1) |
| 2 | **쓰기 권한 게이팅이 배선돼 있지 않다** — `useRouteWritePermissions` 를 소비하지 않아 read 전용 역할도 폼을 편집하고 '저장'을 누른다. **같은 단일 문서형인 `settings/site/SiteSettingsPage.tsx:109` · `settings/languages/LanguagesPage.tsx:126` · `settings/oauth/OAuthPage.tsx:78` 은 전부 `canUpdate` 를 배선했다** — 이 화면과 형제 `products/shipping` 만 빠졌다(quality-bar EXC-03 P0) | A11 change_request |
| 3 | **이 화면에는 `<h1>` 이 하나뿐이다**(AppHeader 의 '적립금'). 담당 4화면 중 유일하게 IA-02 의 h1 이중 결함이 **없다** — 미결이 아니라 **선례로 기록한다**: `DocumentFormShell` 이 in-content h1 을 그리지 않고 `CardTitle`(`<h2>`)만 쓰기 때문이다. 형제 폼/상세 화면들이 이 형태를 따르면 IA-02 가 해소된다 | (기록 — A40 참고) |
| 4 | **'기본 적립률'이 `DEFAULT_POINTS` 와 연결돼 있지 않다.** hint 는 '새 상품의 초기 적립률입니다'(`:50`)라고 약속하지만, 상품 폼의 실제 기본값은 `_shared/store.ts:169` 의 **하드코딩 `{ mode: 'rate', rate: 1, amount: 0 }`** 다 — 이 정책을 읽지 않는다. **정책에서 적립률을 5% 로 바꿔도 새 상품은 여전히 1% 로 시작한다.** 화면이 사실이 아닌 것을 말한다 | A11 · A63 (BE-046 §7.2) |
| 5 | **교차 검증이 0건이다** — 필드 간 관계를 보지 않는다. 실재하는 모순 조합: ① `minUseAmount`(5000) 가 `useUnit`(100) 의 배수가 아니어도 통과 ② `maxUseRate: 0` 통과 — '포인트를 아예 못 쓴다'는 뜻인데 의도인지 알 수 없다 ③ `signupBonus`·`minUseAmount` 에 **상한이 없다**(1조원 통과) ④ `signupBonus`(3000) 가 `minUseAmount`(5000) 보다 작아 **가입 적립금만으로는 영원히 쓸 수 없다** — 지금 픽스처가 정확히 그 상태다(`types.ts:19-27`) | A01 (도메인) · A63 (BE-046 §7.3) · A11 |
| 6 | **유효기간에 '무기한'을 표현할 값이 없다** — `positiveIntString` 이 1 이상을 강제해(`validation.ts:47`) 0 을 막는다. 다른 필드는 0 이 '조건 없음'/'무제한'의 관용 표현인데(쿠폰의 `totalQuantity: 0` = 무제한 — `products/coupons/types.ts:28`) 여기만 다르다 | A01 (도메인) · A11 |
| 7 | 로딩 스켈레톤(EL-011)이 **4줄 고정**이다(`DocumentFormShell.tsx:129`) — 실제 필드는 7개다. 로딩 shape 가 실제 폼과 다르다(quality-bar COMP-06 P2 의 결) | A11 (셸 소유 — 단일 문서형 5화면 공통) |
| 8 | 조회 실패 배너(EL-012)의 문구가 **'내용을 불러오지 못했습니다.'** 라는 **도메인 없는 문구**다(`DocumentFormShell.tsx:107`) — 셸이 `cardTitle` 을 받는데 배너에 쓰지 않는다. 어느 화면에서 실패했는지 문구가 말하지 않는다 | A11 (셸 소유) |
| 9 | 저장 실패 배너(EL-013)에 **오류 참조 코드가 없다** — `DocumentFormShell` 이 `serverError: string \| null` 만 받고(`:76`) `errorReference` 슬롯이 없다. 형제 화면들은 `FormServerError`(`FormFeedback.tsx:38-47`)로 `오류 코드 TDS-…` 를 보인다. `referenceOf`(`http-error.ts:115-117`)가 이미 있는데 이 경로가 쓰지 않는다(quality-bar EXC-20 P1) | A11 (셸 소유) |
| 10 | 저장 버튼(EL-015)이 진행 상태를 **`loading` prop 이 아니라 손으로 쓴 '저장 중…' 라벨**로 표현한다(`DocumentFormShell.tsx:151`). `ReturnDetailPage.tsx:355` 는 `loading={saving}` 을 쓴다(quality-bar COMP-01 P1) | A11 (셸 소유) |
| 11 | 저장에 **동기 제출 락(`submitLockRef`)·멱등키가 없다** — 이 화면이 `useCrudForm` 이 아니라 `useForm` + `useSaveDocument` 를 직접 쓴다. `useSaveDocument` 의 `SaveVars` 에 **키가 앉을 자리 자체가 없다**(`document.ts:48-51` — `CrudAdapter` 의 `WriteContext`(`crud.ts:30-42`)에 대응하는 것이 없다). **완화**: 문서 전체 치환이라 두 번 실행돼도 최종 상태가 같다(quality-bar EXC-08 P0) | A11 · A63 |
| 12 | 대응 SCR 문서 부재 (상품 관리 SCR 미작성) | A11 / A01 |
| 13 | 문서 도착 시 `reset(data)`(`:90-93`)가 **편집 중 재조회에서도 돈다** — 그 밖의 재조회가 오면 입력이 덮인다. `staleTime` 30초라 실제로는 드물다 | A11 change_request |
| 14 | 저장 실패가 **400/403/409/422/500 을 같은 문구로 뭉갠다**(EL-013). 조회 실패도 마찬가지다(EL-012). `HttpError.status` 가 이미 존재하고 `isForbidden`·`isConflict`·`isUnprocessable`(`http-error.ts:93-112`)도 있는데 이 화면이 쓰지 않는다(quality-bar EXC-06 P1) | A11 (셸 소유) |
| 15 | **서버 검증 오류(422)를 필드로 되돌릴 경로가 없다** — `useCrudForm` 의 `setError`+`setFocus`(`useCrudForm.ts:182-192`)를 상속하지 못한다. 모든 저장 실패가 폼 레벨 배너로 간다(quality-bar EXC-07 P1) | A11 |
| 16 | **낙관적 동시성이 아예 없다** — `createDocumentStore.save` 가 `doc = input` 한 줄이라(`document.ts:33`) **항상 성공한다.** 두 관리자가 동시에 정책을 고치면 **나중 것이 앞선 것을 조용히 덮는다**(last-write-wins). 형제 CRUD 어댑터는 없는 id 에 409 를 던지는데(`crud.ts:126-128`) 단일 문서에는 그 개념이 없다 — **버전/ETag 가 필요하다**(quality-bar EXC-04 P0) | A63 (BE-046 §7.4) · A11 |
| 17 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료 리다이렉트가 미저장 입력을 버린다(가드 미발화) | A11 · A40 (quality-bar EXC-05 · EXC-11 · EXC-19 P1) |
