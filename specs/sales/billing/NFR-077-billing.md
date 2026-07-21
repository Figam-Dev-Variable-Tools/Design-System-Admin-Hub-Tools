---
id: NFR-077
title: "청구·입금 비기능 명세"
functionalSpec: FS-077
backendSpec: BE-077
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-077. 청구·입금 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-077 청구·입금 (`/sales/billing` · `/sales/billing/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-077(요소·예외) · BE-077(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-077 §7 · BE-077 §7.13 과 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6). 이 라우트의 e2e 커버리지는 **0**이고 `billing.test.ts` 312행은 **전부 순수 함수 회귀**라 화면 조립을 고정하는 테스트가 한 건도 없다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ErrorBoundary)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**돈이 들어왔다는 사실을 사람이 손으로 확정하는 화면이다.** 결제대행이 없어 '결제완료'를 만드는 것은 시스템이 아니라 운영자의 입금확인이고(`types.ts:8-13`), 그 기록은 **되돌릴 수 없다** — `applyPayment`·`applyNotice` 가 덧붙이기만 하고(`types.ts:215-226`) 감액 엔트리는 `amount <= 0` 거절로 봉쇄돼 있으며(`:186`) 두 표에 행 액션이 0건이다. 화면 스스로 그 사실을 입금 **전에** 말한다(`BillingDetailPage.tsx:436`).

그래서 이 화면의 P0 는 **비가역 액션의 게이트(FEEDBACK-02)** · **중복 제출(EXC-08)** · **동시성(EXC-04)** 에서 무겁게 읽어야 한다. **그리고 세 축이 전부 gap 이다.** 특히 동시성은 다른 화면과 위험의 방향이 반대다 — 전체 치환 저장(`data-source.ts:126`)이라 두 운영자의 입금이 겹치면 **하나가 사라진다**(BE-077 §7.6). 사라진 쪽은 **통장에 실재하는 돈**이고 흔적도 남지 않는다.

반대로 이 화면이 잘하는 것도 분명하다. **입금 상태를 저장하지 않고 누적 합에서 파생**하므로(`types.ts:114-120`) 배지·잔액·완납일이 갈라질 수 없고, **버튼의 disabled 와 사유 문장이 같은 변수를 그린다**(`:485-487,495`). URL 이 조회 상태의 단일 원천이며(IA-13), 쓰기 권한 게이팅을 **목록·상세 양쪽이** 소비한다(EXC-03) — 앱에서 소수에 속한다.

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **두 data view 가 각각 하나만 그린다.** ① **목록**: `firstLoading = isFetching && data === undefined`(`BillingListPage.tsx:111`)를 껍데기에 넘기고, 껍데기가 그 값만 스켈레톤(`CrudReadListShell.tsx:126`)·요약(`:119`)에 쓴다. 재조회는 `refreshing` 으로 분리돼(`BillingListPage.tsx:241`) 이전 행이 유지된다 — `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:298`)가 뒷받침한다. **error 분기가 표·요약을 통째로 대체한다**(`CrudReadListShell.tsx:116,153-162`). ② **상세**: error 분기가 **먼저**(`BillingDetailPage.tsx:213`) 오고 그 다음이 `billing === undefined`(`:238`) — 무한 스피너가 없다 | `/sales/billing` 진입 → 렌더 확인 → 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 두 read 실패가 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`CrudReadListShell.tsx:154-161`) '청구 목록을 불러오지 못했습니다.' + '다시 시도'(`BillingListPage.tsx:242`). **상세**(`BillingDetailPage.tsx:213-236`) 404 → '청구를 찾을 수 없습니다…' + '목록으로'만 / 그 밖 → '청구를 불러오지 못했습니다.' + '다시 시도' + '목록으로'. **toast 를 쓰지 않는다** — 이 화면에 `useToast` 소비 0건(grep). empty 로 폴백하지 않는다 | `?fail=list` · `?fail=detail` 로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** **잔여(요구 위반은 아니다)**: 좌측 미수금 안내문이 조회 실패에도 '미수금을 세는 중입니다.' 로 남는다(`BillingListPage.tsx:116,210-213`) — 같은 실패를 두 번째 표면이 로딩으로 위장한다. 필터 배지는 같은 상황에서 '—' 로 정직하다(`FilterPanel` `counts={null}`) → §5 #7 | **pass** |
| STATE-04 | STATE | 직접 | **표면이 없다.** ① **페이지네이션이 없다** — `useListState` 를 쓰지만 `page` 를 소비하지 않는다(`BillingListPage.tsx:101-107` 이 `filterDefaults` 만 넘기고 `visible` 전량을 껍데기에 준다 — `:120-123,245`). ② **행 선택이 없다** — `CrudReadListShell` 이 `NO_SELECTION`(빈 Set)과 no-op 을 넘기고 `canRemove={false}` 로 선택 열 자체를 없앤다(`CrudReadListShell.tsx:87-90,130-133,146`). 'page clamp' 도 '숨겨진 행의 선택 해제'도 걸릴 표면이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션이 도입되면 다시 매긴다. `useListState` 는 `clampPage`(`useListState.ts:217`)를 이미 갖고 있어 배선만 하면 된다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/sales/billing/**` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22). 파생 치수는 `calc(${cssVar('space.6')} * 13)`(`BillingDetailPage.tsx:118`) · `* 5`(`:125`) · `* 9`·`* 14`(`BillingListPage.tsx:65,81`) 처럼 space 토큰 배수로만 표현한다. `box-shadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/sales/billing` → **0건이어야 한다.** ESLint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(상단 '목록으로' `:301` · 원 견적 링크 `:346` · raw input 4개 `:404,444,461,473,579`) · `tds-ui-link` · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>` · `FilterPanel` 의 토글 버튼 · `DetailCellLink`. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 스타일이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS Table 스켈레톤 펄스 · DS `<Button>` transition · `FilterPanel` 항목 hover. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건 실측). **Toast·Modal 표면이 없다** | tokens codegen 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` — 상세 최대 5장(요약·방식·입금확인·안내·로딩) + `FilterRail`. **Modal·Toast·dropdown 이 없다.** 이 화면이 `box-shadow` 를 직접 선언하지 않는다(grep 0건) | Card 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`BillingDetailPage.tsx:316`) — 그 스타일이 `>18px` tier composite 를 참조하며 값을 손으로 재현하지 않는다(`shared/ui/styles.ts:52`). 카드 제목은 `CardTitle`(`<h2>`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/sales/billing/:id` 의 '청구 BL-…' `<h1>` 이 body-md 보다 가시적으로 크고 computed `font-size` 가 토큰으로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `BillingListPage.tsx:193-198` 이 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드한다. 그 props 가 ① 조합 중 커밋 금지(`useDebouncedSearch.ts:106,121`이 `compositionstart` 관측값과 `nativeEvent.isComposing` **둘을 함께** 본다) ② 조합 종료 후 **250ms 디바운스**(`:23,95`) ③ 조합 중 Enter 차단을 건다. 순서 뒤바뀐 응답은 이 화면에 없다 — 검색이 클라이언트 필터라 요청이 나가지 않는다(`BillingListPage.tsx:120-123`) | 검색창에 IME 로 '대성물산' 입력. **조합 중 '대ㅅ'·'대성' 같은 부분 문자열이 필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **미충족 — 비가역 액션이 넷인데 확인 게이트가 0건이다.** `ConfirmDialog`·`Modal` grep **0건**(실측). ① **입금확인 기록**(`BillingDetailPage.tsx:490-500`) — append-only 라 되돌릴 수 없고 화면 스스로 그렇게 말하는데(`:436`) 한 번의 클릭으로 기록된다. ② **안내 발송 기록**(`:593-601`) — 같다. ③ **청구 방식을 계좌이체로 되돌리면 보관하던 개인결제창 링크가 확인 없이 지워진다**(`:291`) — select 조작 한 번으로 일어나는 파괴적 부수효과다. ④ 견적 상세의 '청구 만들기'(`QuoteDetailPage.tsx:278-282`)도 한 번의 클릭으로 청구를 만든다(다만 `quoteId` 멱등이라 두 번 눌러도 하나 — BE-077 §7.1). 요구의 'busy 중 confirm disable + aria-busy' · '강제 실패 시 dialog 유지 + retry' 절은 게이트 자체가 없어 성립하지 않는다 | 상세에서 '입금확인 기록' 클릭. **확인 다이얼로그 없이 곧바로 기록되면 gap**(현재 그렇다). 청구 방식을 개인결제창→계좌이체로 바꿔 링크가 경고 없이 사라지는지도 확인 | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | **미충족.** `useUnsavedChangesDialog` 소비 **0건**(grep). 미저장 입력이 실재한다 — 입금일·입금액·입금자명·안내 창구·안내 메모가 전부 로컬 state 이고(`:173-177`) 기록 버튼을 눌러야 서버로 간다. 그런데 3경로(beforeunload · 앱 내 링크 capture · popstate) 어느 것도 가드하지 않으며, **'목록으로' 버튼이 둘 다 `navigate()` 프로그램 이동**이라(`:303,646`) 훅을 붙여도 그 둘은 잡히지 않는다. 세션 만료 리다이렉트도 같은 입력을 버린다. **완화 요인**: 청구 방식·링크·비고는 즉시 커밋 모델이라 dirty 개념이 없다 — 그러나 입금 3필드가 표면을 실재하게 만든다 | 상세에서 입금액·입금자명을 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로. **세 경로 모두 아무 확인 없이 입력이 사라지면 gap**(현재 그렇다). `grep -rn "useUnsavedChangesDialog" apps/admin/src/pages/sales/billing` = 0건으로도 판정된다 | **gap** |
| FEEDBACK-06 | FEEDBACK | 직접 | **표면이 없다.** 이 화면에 **modal 이 한 건도 없다** — `Modal`·`ConfirmDialog` grep 0건(실측). 편집 폼은 전부 상세 라우트의 `Card` 안에 있다(`:371-641`). 따라서 'modal 이탈 경로의 dirty close 가드'가 걸릴 표면이 존재하지 않는다. **비가역 액션에 게이트가 없다는 사실은 FEEDBACK-02 가 gap 으로 잡는다** — 이 칸의 N/A 가 그것을 면제하지 않는다 | 폼 modal 이 도입되면 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 직접 | **표면이 없다.** 이 화면에 **toast 소비가 0건**이다(`useToast`·`toast.` grep 0건 실측) — 저장 성공은 toast 가 아니라 **자체 상주 live region**(`:310-312`)으로 알린다. 요구가 지목하는 'toast viewport 의 role/aria-live' 는 걸릴 표면이 없다. **다만 그 대체 수단이 시각 사용자에게 아무것도 보이지 않는다는 사실은 별개 문제로 남는다** — A11Y-16(§3) · §5 #6 | toast 가 도입되면 다시 매긴다. 현재는 `grep -rn "useToast" apps/admin/src/pages/sales/billing` = 0건 | **n-a** |
| A11Y-02 | A11Y | 직접 | **표면이 없다.** dialog 가 0건이다(위와 같은 grep) — `aria-describedby` 를 걸 Modal/ConfirmDialog 자체가 없다 | 다이얼로그가 도입되면(FEEDBACK-02 해소 시) 반드시 다시 매긴다 | **n-a** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 8개를 전수 확인했다.** 청구 방식 `SelectField`(`:379`) · 개인결제창 링크 raw `input`(`:401`) · 비고 `TextareaField`(`:419`) · 입금일 raw `input[type=date]`(`:441`) · 입금액 raw `input`(`:457`) · 입금자명 raw `input`(`:470`) · 안내 창구 `SelectField`(`:559`) · 안내 메모 raw `input`(`:576`). ① **`aria-invalid` 가 0건이다**(grep 실측) — 이 화면에 필드 단위 오류 상태가 존재하지 않으므로 **짝 없는 `aria-invalid` 도 0건**이고 요구의 짝 조항은 위반될 자리가 없다. ② **`required` 는 AT 에 닿는다** — 입금일·입금액이 `FormField … required`(`:440,451-455`)이고 `withAriaRequired`(`FormField.tsx:50-56`)가 **raw `<input>` 자식에도** `aria-required` 를 주입한다(`REQUIRABLE_TAGS` 에 `'input'` 포함 — `:36`). `TextareaField` 는 native `required` + `aria-required` 를 자체 배선한다(`TextareaField.tsx:64-65`). ③ 라벨은 전부 `FormField htmlFor` ↔ 컨트롤 `id` 로 이어진다 | `grep -rn "aria-invalid" apps/admin/src/pages/sales/billing` → 0건. RTL 로 `#payment-amount` 의 `aria-required === 'true'` 를 assert. **잔여 둘**: (a) `hint` 가 유효 상태에서 `hintIdOf` 로 연결되지 않는다 — 입금액의 '잔액 …'(`:455`)과 링크 힌트(`:399`)가 `<p id="…-hint">`(`FormField.tsx:129`)로 렌더되는데 raw input 이 `aria-describedby` 를 걸지 않는다(grep 0건) (b) 입금 위반이 **필드가 아니라 카드 배너**로만 나가 `aria-invalid` 가 서지 않는다(`:485-487`) — 배너 자체는 `role="status"`(`Alert.tsx:91`)라 announce 는 된다. 둘 다 §5 #6 | **pass** |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터가 공유 `FilterPanel`(`BillingListPage.tsx:226-233`)이고 그 항목이 `<nav>` 안 `<button aria-pressed={active}>` 다(`FilterPanel.tsx:145`). 컴포넌트가 그 선택을 명시적으로 못박고 있다(`:17-19` — *'선택 상태는 aria-pressed 하나로 말한다. 이 버튼은 토글 필터이지 현재 위치가 아니다'*). **이 화면 전체에 `aria-current` grep 0건**(실측) — 두 표기가 섞이지 않는다 | `/sales/billing` 에서 '미입금'을 고른 뒤 DOM 확인: 선택된 버튼만 `aria-pressed="true"`, `aria-current` 는 어디에도 없어야 pass | **pass** |
| MOTION-01 | MOTION | 직접 | **표면이 없다.** Modal 이 0건이다(A11Y-02 와 같은 grep) — enter/exit transition 을 걸 dialog 자체가 없다 | 다이얼로그가 도입되면 다시 매긴다 | **n-a** |
| MOTION-02 | MOTION | 직접 | **표면이 없다.** toast 가 0건이다(A11Y-01 과 같은 grep) — exit 를 애니메이트할 대상이 없다 | toast 가 도입되면 다시 매긴다 | **n-a** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: DS Table 스켈레톤 펄스 · DS Button transition · `FilterPanel` hover. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건 실측). 요구가 지목한 `ToggleSwitch` 는 이 화면에 없다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:365-366`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위는 `layoutStyle` 2열 그리드(`BillingListPage.tsx:63-68,205`), 상세는 평범한 `<div style={pageStyle}>`(`BillingDetailPage.tsx:298`)다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** `findCoveringLeaf` 덕에 브랜치 폴백은 없다 — `/sales/billing/:id` 가 자기를 감싸는 잎 `/sales/billing`(`nav-config.ts:211`)을 찾아 AppHeader 가 `<h1>청구·입금</h1>` 을 그린다. **그러나 상세가 자체 `<h1>청구 BL-…</h1>` 를 또 그린다**(`BillingDetailPage.tsx:316`) → **`<h1>` 이 2개**다. 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 모순**이고, 두 h1 이 서로 다른 것을 말한다(하나는 메뉴 이름, 하나는 레코드). 형제 상세 화면들과 같은 구조적 결함이다 | `/sales/billing/:id` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록은 1개(정상) — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색(`:189-202`) → 결과 count 요약(`CrudReadListShell.tsx:118-121`) → table(`:124`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 청구 생성이 이 화면 밖(견적 상세)이고 좌측 안내문이 그 사실을 말한다(`BillingListPage.tsx:214-217`). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** 껍데기가 `visible` 전량을 DS Table 에 넘기며(`:245`) 페이지네이션 컴포넌트가 없다. **청구는 시간이 갈수록 단조 증가하는 회계 기록**이라 '한 page 초과'가 확실하다(BE-077 §7.12). 정렬 UI 도 없어 **고액 미수 순으로 훑을 수 없다**(정렬은 청구일 내림차순 고정 — `types.ts:341-346`) | 시드를 20건 이상으로 늘리고 `/sales/billing` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | 직접 | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — `App.tsx:365-366` 이 라우트 2개(목록·상세)뿐임을 보인다. 생성은 폼 없이 견적 상세의 버튼 하나로 일어나고(그 이유를 코드가 밝힌다 — `QuoteDetailPage.tsx:174-179` '물어볼 것이 없는 화면을 한 장 세우지 않는다'), 편집은 상세 라우트 안의 카드에서 즉시 커밋으로 일어난다. `:id` 로 갈리는 한 쌍이 성립할 대상 자체가 없다 | 폼 라우트가 생기면 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 입금 상태 필터·검색어의 **단일 원천이 URL 쿼리스트링**이다. `:101` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { state: 'all' }` — `:54`), 그 훅이 `useSearchParams` 로 `?state=`·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고(`useListState.ts:115`) 갱신은 `replace: true`(`:125`)라 검색어 한 줄에 history 가 쌓이지 않는다. 손으로 고친 값은 `parseFilter`(`BillingListPage.tsx:103-107`)가 되돌린다. 결과: 필터를 걸고 상세에 들어갔다 Back 하면 조건이 복원되고, 링크 공유·F5 도 같다. **`sort`·`page` 는 정렬 UI·페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | 상태='미입금' + 검색='대성' 적용 → URL 이 `?state=unpaid&q=대성` 인지 확인 → 행 클릭으로 상세 진입 → Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`(`AppShell.tsx:395,412`). **이 화면은 그 경계에 특히 의존한다** — `applyPayment`/`applyNotice` 가 막힌 기록에 던지는 `Error`(`types.ts:217,224`)가 렌더 트리로 올라간다. 술어가 먼저 거르므로 정상 경로에서는 도달하지 않지만(회귀 `billing.test.ts:151-155`), 도달했을 때의 표현이 '화면 전체 대체'다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `notifySessionExpired()`(`queryClient.ts:60-66`). **이 화면의 조회 2종·저장이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **단 EP-06(견적→청구 생성)은 react-query 밖이라 이 경로를 타지 않는다**(BE-077 §7.8) | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsales%2Fbilling&reason=session_expired` 로 이동하는지 확인. (미저장 입금액·메모 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:408`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/sales/billing/:id` 까지 덮는다(`findCoveringLeaf` — 제목과 **같은 규칙**). ② **write 게이팅(직접)**: `useRouteWritePermissions().canUpdate` 를 **목록과 상세가 모두** 소비한다 — 드문 경우다. **목록**(`BillingListPage.tsx:99,222`)은 '입금확인 권한이 없어 조회만 가능합니다.' 를 **미리** 밝힌다. **상세**(`BillingDetailPage.tsx:161`)는 안내 배너(`:326-328`) + **두 기록 버튼을 렌더하지 않고**(`:490,593`) 8개 입력을 전부 비활성화한다(`:382,408,424,447,465,478,562,584`). ③ **강등 reconcile**: 권한 스토어가 바뀌면 훅 구독자가 재렌더돼 별도 코드 없이 버튼이 사라진다. ④ **행 클릭은 `detail` 목적지라 `canUpdate` 와 무관하게 read 로 게이팅된다**(`CrudTable.tsx:306`) — 조회 전용 역할이 상세로 가는 길을 잃지 않는다 | 권한 스토어에서 `page:/sales/billing` 의 `update` 를 끈 뒤 `/sales/billing/:id` 진입. **두 기록 버튼이 사라지고 '입금확인 권한이 없습니다…' 배너가 뜨면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인. **잔여(이 요구의 gap 은 아니다)**: 서버 403 이 오면 일반 배너로 뭉개진다 — EXC-06 P1 사안(§3) | **pass** |
| EXC-04 | EXC | 직접 | **미충족 — 이 화면에서 가장 무거운 gap 이다.** ① **낙관적 동시성 토큰이 없다** — `grep -rn "version\|updatedAt\|If-Match" apps/admin/src/pages/sales/billing` = **0건**(실측). ② **409 는 '존재 여부' 기반**이다(`data-source.ts:122-124` · `crud.ts:256-258`) — 유령 저장은 막지만 동시 편집은 막지 않는다. ③ **화면에 409 해소 UI 가 없다** — `onError`(`:204-207`)가 status 를 보지 않고 한 문구로 뭉갠다. **저장소가 '다른 사용자가 먼저 삭제한 청구입니다.' 라는 정확한 문장을 이미 들고 오는데 화면이 그것을 버린다**(`:206`). `isConflict`(`http-error.ts:141`)는 존재하는데 소비 0건. ④ **그리고 이 화면의 last-write-wins 는 다른 화면보다 나쁘다** — 저장이 문서 전체 치환이라(`data-source.ts:126`) 두 운영자가 각자 입금을 기록하면 **나중 저장이 앞선 사람의 `payments` 배열을 통째로 되돌린다.** 과입금이 아니라 **입금이 사라진다** — append-only 규칙이 저장 층에서 정확히 반대로 뒤집힌다(BE-077 §7.6). 각자의 `recordPaymentBlock` 은 자기 스냅숏 기준이라 **둘 다 통과**하므로 가드도 잡지 못한다 | `?status=save:409` 로 상세에서 저장. **conflict 다이얼로그 없이 일반 배너만 뜨면 gap**(현재 그렇다). lost update 는 두 탭으로 재현한다 — 같은 청구를 두 탭에서 열고 각각 다른 금액을 기록한 뒤 새로고침. **입금 내역에 한 건만 남으면 gap.** 토큰 부재는 위 grep 0건으로도 판정된다 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** ① **멱등키 미전달** — `update.mutate({ id, input, signal })`(`:195-196`)가 키를 넣지 않는다. **자리도 원장도 이미 있는데**(`crud.ts:340-346` `UpdateVars.idempotencyKey` · 원장 `crud.ts:193,245`) 호출부가 비어 있어 **원장이 영원히 발현되지 않는다.** 형제 화면은 그 자리를 쓴다(`pages/members/components/PointsCard.tsx`). ② **동기 제출 락이 없다** — `submitLock` grep 0건. 방어는 `disabled={saving}`(`:495,596`) 하나뿐이라 클릭과 리렌더 사이 틈으로 두 번째 클릭이 통과한다. 선례가 앱에 둘 있다(`pages/settings/_shared/queries.ts` 의 `useSubmitLock`). ③ **`?fail=` 없이도 창이 넓다** — 안내 버튼은 `loading` prop 조차 주지 않아(`:594-597`) 진행 표시가 형제 버튼과 갈린다. **완화 요인 하나(그리고 그것이 사라질 예정이다)**: 지금은 저장이 **전체 치환**이라 연타가 입금을 두 건 만들지 않는다 — 두 요청이 같은 스냅숏에서 파생되고 `commit` 이 앞선 요청을 abort 한다(`:192`). **그러나 심이 예고하는 `POST /:id/payments`(append)로 가면 연타가 곧 이중 입금이고**(`data-source.ts:165` · BE-077 §7.7) 그때 이 완화는 완전히 사라진다 | '입금확인 기록'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/sales/billing` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **네 지점이 배선돼 있다.** ① **onError** — `if (isAbort(cause)) return;`(`:205`)로 abort 를 실패로 처리하지 않는다. ② **onSuccess** — `if (controller.signal.aborted) return;`(`:199`)로 취소된 요청의 성공 콜백이 재조회·상태 문구를 일으키지 않는다. ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:183`). ④ **연속 커밋** — 새 커밋이 이전 컨트롤러를 abort 한다(`:192`). 공유 predicate `isAbort`(`shared/async`)를 쓴다 — 로컬 판정을 재발명하지 않는다. bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error 배너가 뜨지 않아야 pass.** **잔여**: abort 는 클라이언트가 결과를 버릴 뿐 **서버 도달을 막지 않는다** — 돈이 걸린 화면이라 그 불확실성이 실질 위험이다(§4.2 · BE-077 §7.13 #17). 또 ④의 abort 는 즉시 커밋 모델(링크·비고의 한 글자마다 저장)과 결합해 **앞선 저장을 조용히 버린다**(FS-077 §7 #3) | **pass** |
| EXC-21 | EXC | 직접 | **거절 계열이 섞이지 않는다 — 그러나 그 이유의 절반이 매핑 누락이다.** ① **인증** → `RequireAuth`/전역 401 인터셉터(EXC-02). ② **플랜(엔타이틀먼트)** → **이 라우트는 어떤 모듈에도 속하지 않는다**: `MODULE_RESOURCES` 의 `sales.pipeline` 이 accounts·contracts·quotes·inquiries·projects·consultations 를 지배하는데 **`/sales/billing` 이 없다**(`module-resources.ts:52-60`) → `entitlementKeyForResource` null → **`GRANTED`**(`route-entitlement.ts:20,27-28`). 즉 플랜 축의 거절 표면이 **발생할 수 없다.** ③ **권한** → read 는 `ForbiddenScreen`(`<Outlet>` 바깥), write 는 버튼 미렌더 + info 배너(`:326-328`) — **한 화면에 둘이 겹치지 않는다**(read 가 없으면 화면 자체에 못 들어온다). ④ **설정** → 이 화면에 `pgSellable` 류 설정 게이트가 없다(grep 0건). 이 화면 안에 403 문구도 업그레이드 안내도 0건이다 | 플랜에서 `sales.pipeline` 을 내리고 `/sales/billing` 진입. **견적은 잠기는데 청구는 그대로 열린다**(현재 그렇다) — 요구가 금지하는 '두 계열 혼재'는 아니지만 **패키징 결함**이다(BE-077 §7.11 · §5 #8). 권한 축은 스토어로 재현한다(EXC-03) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · STATE-02 · TOKEN-01 · TOKEN-05 · COMP-10 · A11Y-11 · A11Y-12 · IA-01 · IA-13 · EXC-03 · EXC-09 · EXC-21 |
| `종속` | **6** | TOKEN-02 · TOKEN-03 · TOKEN-04 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **7** | STATE-04 · FEEDBACK-06 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · IA-05 |
| `gap` | **6** | FEEDBACK-02 · FEEDBACK-04 · IA-02 · IA-04 · EXC-04 · EXC-08 |
| **합계** | **31** | 12 + 6 + 7 + 6 = **31** ✓ |

> **P0 gap 6건 — quality-bar '배치 실패' 사유.**
> - **EXC-04 · EXC-08 · FEEDBACK-02 셋은 같은 뿌리에서 나온다**: 되돌릴 수 없는 원장을 움직이면서 확인 게이트도, 중복 방어도, 동시성 토큰도 없다. **이 화면에서 가장 무거운 셋이며 BE-077 §7.6·§7.7 의 계약 변경과 한 배치로 풀어야 한다.**
> - **IA-02 · IA-04** 는 앱 전역의 같은 뿌리(sub-route h1 이중 · 목록 페이징 부재)를 공유하므로 **횡단 배치**로 푸는 것이 옳다.
> - **FEEDBACK-04** 는 즉시 커밋 모델(FS-077 §7 #3)을 폼 모델로 고치면 함께 풀린다 — 지금 훅만 붙이면 `navigate()` 두 버튼이 여전히 새어 나간다.
> - **n-a 7건이 유난히 많은 이유**: 이 화면에 **Modal·Toast 가 한 건도 없다**(grep 0건). 그 부재는 A11Y-01/02 · MOTION-01/02 · FEEDBACK-06 다섯을 동시에 무효화하지만, **그 자체가 결함인 축(FEEDBACK-02 게이트 부재 · 성공의 시각 통지 부재)** 은 별도로 gap 과 §5 에 남겼다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·기간 필터·페이지네이션 range·optimistic write·bulk)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime` 30초(`queryClient.ts:24,70`)가 재조회 시점을 지배한다. 가벼운 인디케이터도 있다 — 껍데기가 요약에 `· 새로고침 중…`을 덧붙이고 `aria-busy={refreshing}` 을 건다(`CrudReadListShell.tsx:118-121`) | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`CrudTable.tsx:379-390`) — 검색 0건/필터 0건/진짜 0건 3분기 + 복구 액션('검색 지우기'/'필터 초기화')이 맥락(`hasQuery`·`hasActiveFilters`)에서 파생된다(`BillingListPage.tsx:250-256`). `createVerb: '생성'`. **생성 CTA 를 넘기지 않는 것이 정당하다** — 이 화면에서 만들 수 없고 좌측 안내문이 그 대신 말한다(`:214-217`) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기, 필터로 0건 → 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세 키를 **둘 다** invalidate 하고(`crud.ts:356-358`) 화면이 `detailQuery.refetch()`(`:201`)를 **한 번 더** 부른다 — **중복이다.** 400ms 지연 픽스처에서 요청이 두 번 나간다. 정확성은 충족(편집한 화면이 즉시 최신이 된다)이나 요구의 '정확히 그것만' 절을 넘긴다 | 저장 후 네트워크 탭에서 상세 요청이 2건인지 확인 | **pass(과잉)** |
| COMP-01 | P1 | 모든 액션이 DS `<Button>` 이다 — `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/sales/billing` = **0건**. **잔여 둘**: (a) 입금 버튼은 `loading={saving}`(`:494`)인데 **안내 버튼은 주지 않는다**(`:594-597`) — 같은 카드 구조의 두 버튼이 다른 계약을 갖는다 (b) 상단 '목록으로'만 raw `<button>` + 로컬 스타일(`:299-307`)인데 **아이콘+텍스트 back affordance 라 의도된 예외**다(형제 상세 화면과 같은 형태) | 위 grep = 0. 안내 기록 중 버튼에 스피너가 도는지 확인 | **pass(잔여)** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 다(`:192-199`). raw `<input type="search">` 재구현 0건 | 목록 툴바에 `SearchField` 가 쓰였는지 | **pass** |
| COMP-04 | P1 | required 입력 둘(입금일·입금액)이 `FormField required` 로 노출돼 라벨 옆 `*` 마커가 렌더된다(`:440,451-455` · `FormField.tsx:110-114`). bare `<label style={fieldLabelStyle}>` 로 필수 필드를 그리는 곳이 없다 | 입금일·입금액 라벨에 `*` 가 보이는지 | **pass** |
| COMP-06 | P2 | **갈린다.** 목록 스켈레톤은 DS Table 소유로 올라가 화면이 행·열 수를 세지 않는다(`CrudTable.tsx:373` 이 `loading` 만 넘긴다) → 충족. **상세는 스켈레톤이 아니라 문구 한 줄이다** — `Card` 안 muted '불러오는 중…'(`:238-246`). 실제 화면은 카드 4장 + 표 2개인데 로딩의 shape 가 전혀 다르고 `aria-busy` 도 없다 | 상세 진입 400ms 동안의 화면이 실제 shape 를 흉내 내는지 | **gap(상세)** |
| COMP-09 | P2 | 목록 셀에 truncate 가 없다 — 거래처명(`:134`)과 입금자명·메모(상세 표 `:535-541`)가 길면 열을 넓힌다. **완화 둘**: 껍데기와 상세 표가 가로 스크롤 컨테이너를 갖는다(`CrudReadListShell.tsx:36-39` · `BillingDetailPage.tsx:141`)라 페이지 본문이 가로로 밀리지는 않는다. 숫자·번호 열은 `nowrap` 이 걸려 있다(`:129,152` 등) | 200자 거래처명 시드로 표 폭이 유지되는지 | **gap(완화됨)** |
| COMP-12 | P2 | **갈린다.** 비고는 `TextareaField` 라 **`N/300` 실시간 카운터가 있다**(`TextareaField.tsx:52` → `FormField.tsx:118`). **그러나 raw `<input>` 두 개(입금자명·안내 메모)는 `maxLength={60}` 만 있고 카운터가 없다**(`:476,582`) — 붙여넣기를 브라우저가 조용히 자른다. 상한 근접 경고는 셋 다 없고, counting 기준(UTF-16 code unit)도 명시되지 않았다. `CountedInput` 선례가 `pages/settings/site` 에 있다 | 60자를 넘겨 붙여넣었을 때 무슨 일이 일어나는지 화면이 말하는가 | **gap(입력 2개)** |
| FEEDBACK-01 | P1 | 배치가 규칙과 **한 축에서 어긋난다**: read 실패=인라인 Alert(✅) · 규칙 위반=버튼 옆 warning Alert(✅ `:485-487,590`) · write 실패=카드 밖 danger 배너(폼 맥락이라 허용 결) · **write 성공= toast 가 아니라 시각 숨김 live region 한 줄**(`:310-312`). 즉 **성공을 시각으로 알리는 자리가 없다** — 시각 사용자는 표에 행이 늘어난 것으로만 성공을 안다. 이 화면에 `useToast` 소비 0건 | 입금을 기록하고 화면에 성공 통지가 보이는지 — **현재 보이지 않는다** | **gap** |
| FEEDBACK-03 | P1 | 성공(live region 문구 5종 — `:202`)·실패(배너 `:206`) 양 경로가 배선돼 있고 no-op 클릭이 없다(위반이면 버튼이 잠기고 `:257,272` 가 `return` 한다). **그러나 성공 경로의 피드백이 시각적으로 0** 이라 '클릭했는데 아무 변화도 없다'가 **시각 사용자에게는 실제로 발생한다** — 입금 표에 행이 늘긴 하지만 그것은 결과이지 통지가 아니다 | `?fail=save` 로 저장 → 가시 실패는 나온다(배너). 성공은 나오지 않는다 | **gap(성공 경로)** |
| FEEDBACK-05 | P2 | **비가역 액션 넷 중 confirm 도 undo 도 0건이다**(FEEDBACK-02). undo window·snapshot 도 없다 — 입금 기록은 append-only 라 원리상 되돌릴 수 없고(`types.ts:51-55`) 감액 엔트리마저 봉쇄돼 있다(`:186`). **삭제는 이 화면에 없으므로 요구의 delete 절은 걸리지 않는다** — 그러나 '단일 클릭 비가역' 은 정확히 이 화면의 모양이다 | 입금확인 기록이 confirm 또는 undo window 를 갖는지 → 둘 다 없다 | **gap** |
| A11Y-08 | P1 | **충족.** 행 클릭이 DS Table 소유(마우스 전용 — `<tr>` 에 tabIndex 없음)이고, **행 안에 같은 목적지의 focusable name link 가 있다** — 청구번호 `DetailCellLink`(`BillingListPage.tsx:130-132`). `:127` 주석이 그 의도를 명시한다(*'행 클릭은 마우스 전용이다'*). 거래처·원 견적 링크는 다른 목적지라 별개 | 행을 Tab 해서 청구번호 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 폼 진입 시 첫 편집 필드 자동 포커스가 없고, 저장 실패 시 어떤 필드로도 포커스가 이동하지 않는다 — `useCrudForm` 을 쓰지 않아 `setFocus` 경로를 상속하지 못한다. 서버 오류는 화면 상단 배너에 문구만 꽂힌다(`:324`) | 저장 실패 후 `document.activeElement` 가 배너나 위반 입력으로 옮겨지는지 | **gap** |
| A11Y-16 | P1 | **상주 live region 이 둘 있다** — 목록(`CrudReadListShell.tsx:110-112`, 문장 3분기 `:79-83`)과 **상세(`:310-312`)**. 그 밖의 계약도 만족한다: 표 caption(`rowTarget.ts:61-62` 파생) · 입금·안내 표 caption(`:505-507,606`) · 필터 `<nav aria-label>`(`FilterPanel`) · 링크 접근 이름(`BillingListPage.tsx:146`) · 발송/상태를 **색이 아니라 `StatusBadge` 라벨**로 이중 인코딩(`:160-178`) · 차단 사유 Alert 가 `role="status"`(`Alert.tsx:91`). **잔여 둘**: (a) `setStatusMessage(message)` 는 **같은 문구를 두 번 넣으면 state 가 바뀌지 않아 다시 읽히지 않는다** — 입금을 연속 두 번 기록하면 두 번째는 스크린리더도 침묵한다(`:202`) (b) 잔액·입금액·상태가 저장 후 다시 계산되는데 그 변화 자체에는 live region 이 없다(문구가 대신 말한다) | 필터를 걸어 0행으로 만들 때 사유가 읽히는지(pass). 같은 입금을 연속 두 번 기록해 두 번째가 announce 되는지(현재 안 된다 — §5 #6) | **pass(잔여)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `STATE_META`/`billingStateMeta`(`types.ts:278-286`). per-page meta helper 를 만들지 않았고 목록 배지·상세 배지·필터가 같은 함수를 소비한다. **`Record<BillingPaymentState, …>` 라 상태가 늘면 컴파일이 막는다.** 다만 그 레지스트리가 `pages/sales/billing` 지역이라 앱 전역 레지스트리는 아니다 | 모든 상태가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 금액이 `formatWon`(`_shared/business.ts:45`), 시각이 `formatDateTime`(`:630`)을 경유한다. 좌측 안내 3문단이 **왜 등록 버튼이 없는지 · 왜 되돌릴 수 없는지**를 미리 말한다(`BillingListPage.tsx:209-221`) — 이 화면의 강점이다 | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-07 | P2 | 금액이 전부 `formatWon` 한 문자열이라 **'원'이 숫자에 붙어 있다**(`business.ts:45-47`). 청구액·입금액·잔액 **세 열이 우측 정렬 다행 컬럼**이라(`:153-159` `numeric: true` → `CrudTable.tsx:269`) 단위가 마지막 자릿수를 따라다녀 `tabular-nums` grid 정렬이 깨진다. 클레임 화면(정의 목록)보다 표면이 넓다 | 목록에서 자릿수가 다른 금액 세 행의 소수점 정렬을 시각 확인 | **gap** |
| ERP-08 | P2 | 수량·금액이 `formatWon`, 안내 시각이 `formatDateTime` 을 경유한다. **날짜 3종만 raw 문자열이다** — 청구일(`BillingDetailPage.tsx:353`) · 입금일(목록 `BillingListPage.tsx:184` · 상세 표 `:531`). `tabular-nums`·`nowrap` 은 걸려 있으나 포맷 함수를 거치지 않아 `'YYYY-MM-DD'` 가 아니면 그대로 새어 나온다 | 셀의 raw 문자열 렌더가 0건인지 | **gap(경미)** |
| ERP-09 | P2 | 이 화면의 시각 표면은 **안내 발송 시각 하나**이고 `formatDateTime` 을 경유한다(`:630`). `shared/format.ts` 가 정본이며 KST 고정으로 수렴돼 있다. 입금일·청구일은 날짜(`YYYY-MM-DD`)라 TZ 계약이 걸리지 않는다. **다만 발송 시각의 생성이 클라이언트 시계다**(`:276`) — 백엔드가 붙으면 서버 시각이어야 한다(BE-077 §7.3 #4) | UTC ISO 입력이 러너 OS 타임존과 무관하게 같은 wall-clock 을 렌더하는지 | **pass(상속)** |
| ERP-13 | P1 | 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(`이(가)`·`을(를)`·`은(는)`·`(으)로` grep = 0 실측). 빈 상태의 조사는 `Empty` 가 받침으로 고르고, 이름을 interpolate 하는 문자열은 링크 접근 이름(`'<청구번호> 원 견적 <견적번호>'` — `:146`)뿐인데 조사를 붙이지 않는 구문이다 | 조사 폴백 grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다(`:245`). **청구는 상한 없이 단조 증가하는 회계 기록**이라(BE-077 §7.12) 1,000건이면 1,000행이 올라가고, 행마다 `paidAmount`·`outstandingAmount`·`billingPaymentState`·`paidOnDate` 넷이 각각 `payments` 를 순회한다 — **행당 4회 선형 스캔**이다. **완화 둘**: 검색이 디바운스되고(COMP-10) 가로 scroll 컨테이너가 10열 표를 가둔다 | 1,000건 시드로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·연속 커밋에서만 발생한다(`:183,192`). **이 화면에서 특히 문제다** — 무응답 저장에서 운영자는 **입금이 기록됐는지 모른 채** 다시 누르고, 멱등키가 없어(EXC-08) 그 재시도가 안전하지 않다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. 이 화면은 **상세 조회에서만 404 를 분기하고**(`:213-236`) **저장 실패는 400/403/409/422/500 을 한 문구로 뭉갠다**(`:206`). `isConflict`·`isForbidden`·`isUnprocessable` 이 전부 존재하는데 소비 0건(grep). **특히 409 를 뭉개는 것이 아프다** — 저장소가 '다른 사용자가 먼저 삭제한 청구입니다.' 라는 정확한 문장을 이미 들고 온다(`data-source.ts:123`). 목록 조회 실패(`CrudReadListShell.tsx:156`)도 문구 1종 | `?status=save:403` · `save:409` · `save:422` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **경로 자체가 없다.** 이 화면은 폼이 아니라(zod 스키마도 RHF 도 없다 — `validation.ts` 부재) 서버 422 의 `error.fields` 를 특정 입력으로 되돌릴 자리가 **구조적으로 없다.** `HttpError.violations`(`http-error.ts:55`)를 읽는 코드 0건. 클라이언트 검증은 `types.ts` 의 순수 술어 3종이 담당하고 그 결과는 **필드가 아니라 카드 안 Alert** 로만 나간다(`:485-487,590`) | 서버 422 를 만들고 위반 필드에 인라인 오류가 뜨는지 → 아무 데도 뜨지 않는다 | **gap** |
| EXC-10 | P1 | **표면이 없다** — bulk 작업이 이 화면에 없다(행 선택 부재) | — | **n-a** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다. **원장을 움직이는 화면이라 offline write 가 특히 위험하다** — 요청이 hang 하면 운영자는 입금이 기록됐는지 모른 채 다시 누른다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 상세에서 404 와 generic error 를 문구·복구 수단으로 가른다(`:213-236`): 404 → '청구를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + **'목록으로'만** / 그 밖 → '청구를 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 근거 주석이 그 이유를 밝힌다(`:212` — *'삭제된 청구에 「다시 시도」는 영원히 실패한다'*). 근본이 갖춰져 있다 — 저장소가 `HttpError(404)` 를 던지고(`data-source.ts:112`) 화면이 `isNotFound` 로 읽는다. 무한 spinner 없음(`billing === undefined` 는 error 분기 뒤) | `/sales/billing/nope` 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음). `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 없다** — 저장이 전부 비관적(응답 후 `refetch` — `:201`)이다. `onMutate`/`setQueryData` grep 0건. 롤백 경로가 필요 없다. **잔여**: 청구 방식 `<select>` 는 브라우저가 새 값을 즉시 그리므로 저장이 실패하면 **화면과 서버가 다른 말을 하는 순간**이 생긴다(`value={billing.method}` 지만 리렌더 전까지 DOM 값이 앞선다) | `onMutate`/`setQueryData` 가 0건인지. `?fail=save` 로 방식을 바꿔 select 가 되돌아오는지 | **pass(잔여)** |
| EXC-20 | P1 | **미충족.** 5xx 등 예상외 실패에 **참조 코드가 없다** — `HttpError.reference`(`http-error.ts:66`)와 `referenceOf`(`:151`)가 존재하는데 이 경로가 쓰지 않는다(grep 0건). 배너 문구는 고정 한 줄이라(`:206`) 운영자가 신고할 수단이 없다. raw 서버 body/stack 노출은 없다(그 절은 충족) | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지. **보이지 않으면 gap** | **gap** |
| EXC-22 | P1 | **권한=fail-closed · 엔타이틀먼트=fail-open** 규약을 이 화면이 소비한다: 라우트 권한은 `RequirePermission` 이 막고, 엔타이틀먼트는 **매핑이 없는 화면을 granted 로 수렴시킨다**(`route-entitlement.ts:10-12` — *'판정 실패가 기능 정지가 되면 안 된다'*). **이 라우트는 매핑이 없으므로 그 fail-open 이 실제로 적용된다** — 형제 화면(견적)과 갈리는 지점이다. 양방향 단위 테스트는 소유 모듈에 있다(`route-entitlement.test.ts`) | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 0건임만 확인. **매핑 누락 자체는 §5 #8** | **종속** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-077 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 설정 저장 p95 (EP-03) | ≤ 600ms | **측정 불가.** 문서 한 벌 치환이라 부수효과가 없다 |
| **입금 기록 p95 (EP-04)** | **≤ 800ms** (행 락 안에서 잔액 재판정 — BE-077 §7.5) | **측정 불가.** 현재는 PUT 전체 치환이라 락이 없다 |
| **견적 → 청구 생성 p95 (EP-06)** | **≤ 1.5s** (견적 조회 + 채번 + 역링크가 한 트랜잭션 — BE-077 §2 상한 7초) | **측정 불가 — 그리고 지금은 요청조차 없다.** `createBillingFromQuote` 가 동기 함수라 왕복이 0이다(BE-077 §7.8). 백엔드가 붙는 순간 **이 축이 새로 생긴다** |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| **행당 파생 계산** | 행당 `payments` 순회 ≤ 1회 | **미충족 — 행당 4회다.** `paidAmount`·`outstandingAmount`·`billingPaymentState`·`paidOnDate` 가 각각 배열을 훑는다(`BillingListPage.tsx:154-186`). 입금 건수가 작아 지금은 드러나지 않지만 **1,000행 × 4 스캔**이 된다. 파생을 저장하지 말라는 규칙(BE-077 §7.2)과 충돌하지 않는다 — 행마다 **한 번** 계산해 재사용하면 된다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000`(`:24,70`) · `retry: false`(`:82`) · `refetchOnWindowFocus: false`(`:90`) 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | 1회 | **미충족 — 2회다.** `useCrudUpdate` 가 상세 키를 invalidate 하고(`crud.ts:358`) 화면이 `refetch()` 를 또 부른다(`:201`) — STATE-06 참조 |
| **한 글자당 저장 요청** | **0** | **미충족 — 링크·비고가 `onChange` 에서 곧바로 `commit` 한다**(`:409-414,422`). 한 글자마다 요청이 나가고 다음 커밋이 앞선 것을 abort 하며(`:192`) 입력의 `value` 는 **서버 데이터**라 refetch 전에는 갱신되지 않는다 — 400ms 지연 픽스처에서 **입력이 사실상 불가능하다**(FS-077 §7 #3, 이 화면 최대 결함) |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 2회 | **충족(요청)** / **부분 충족(연산)** — 250ms 디바운스가 자모당 스캔을 막으나 커밋마다 `filterBillings` + `searchBillings` 로 전량을 2회 훑는다(`:120-123`). `filterBillings` 는 행마다 `billingPaymentState` 를 다시 부른다 |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `BillingInput` 이 `payments`·`notices` 배열 전체를 실어 보낸다(`types.ts:348-363`). 지금은 건당 최대 2~3건이라 작지만 **계약상 무한**이다 — 입금이 20회 나눠 들어온 청구는 요청이 그만큼 커진다. BE-077 §7.3 안 A 가 이를 상수로 만든다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 청구는 상한 없이 증가 |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 4파일 — `BillingListPage.tsx` 260행 · `BillingDetailPage.tsx` 652행 · `types.ts` 397행 · `data-source.ts` 174행 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudReadListShell.tsx:154-161`). **필터 레일은 살아남는다** — 껍데기 밖이라 안내문·필터가 그대로 보이고 건수 배지만 '—' 가 된다 |
| 목록 조회 실패 시 미수금 안내 | '모른다'고 말한다 | **미충족** — '미수금을 세는 중입니다.' 가 남는다(`BillingListPage.tsx:116,210-213`). **같은 화면의 필터 배지는 `null` → '—' 로 정직한데 이 문장만 로딩으로 위장한다** |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 미충족** — 배너는 뜨나 **참조 코드가 없고**(EXC-20) **입력이 보존되지 않는다**: `setAmountInput('')`·`setMemo('')`(`:267-268`)와 `setNoticeMemo('')`(`:282`)가 `commit` **밖**이라 요청 결과를 기다리지 않고 실행된다. 실패하면 운영자가 통장을 다시 보며 금액·입금자명을 재입력한다 |
| 저장 실패(403/409/422) | 계열별로 다른 surface | **미충족** — 한 문구로 뭉개진다(EXC-06). 저장소가 들고 온 정확한 409 문장이 버려진다 |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** — 입금이 이미 기록됐는데 화면에 안 보일 수 있고, 그때 재시도가 안전하지 않다(EXC-08 gap) |
| 연속 커밋(링크·비고 타이핑) | 마지막 값이 저장된다 | **위태롭다** — 앞선 요청을 abort 하지만(`:192`) abort 가 서버 도달을 막지 못하므로 **도착 순서가 뒤바뀌면 옛 값이 이긴다.** 한 글자마다 커밋하는 모델과 결합해 실제로 발생한다(§4.1) |
| **동시 처리(두 운영자 입금)** | 나중 저장이 앞선 입금을 덮지 않는다 | **미충족 — 정확히 반대다.** 전체 치환이라 **나중 저장이 앞선 사람의 `payments` 배열을 통째로 되돌린다.** 둘의 `recordPaymentBlock` 이 각자 자기 스냅숏을 봐 **둘 다 통과**한다. 과입금이 아니라 **입금이 사라진다**(EXC-04 · BE-077 §7.6) |
| **연타(더블클릭)** | 정확히 1개 요청 | **미충족**(EXC-08 gap). **다만 지금은 전체 치환이라 결과가 입금 1건이다** — 심이 예고하는 POST append 로 가면 곧바로 2건이 된다(BE-077 §7.7) |
| 잘못 기록한 입금 | 정정 경로가 있다 | **없다.** 수정·삭제 액션이 0건이고 감액 엔트리도 `amount <= 0` 거절로 봉쇄돼(`types.ts:186`) 유일한 복구가 DB 직접 수정이다. **의도된 설계이나 그 대가가 여기 있다**(BE-077 §7.4) |
| 세션 만료 중 입력 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 로컬 state 를 버린다(EXC-19 P1). 이탈 가드도 없다(FEEDBACK-04 gap) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **BE-077 §2 의 '서버 5초 < 프론트 상한' 관계가 성립하지 않는다** |
| **견적 → 청구 생성 실패** | 실패를 알린다 | **표현할 자리가 0건이다.** `createBillingFromQuote` 가 동기 함수라 `fixtureRequest` 를 타지 않고 try/catch 도 없다(`QuoteDetailPage.tsx:181-187`) — **이 쓰기는 언제나 성공한다.** 서버가 붙는 순간 401·403·404·422·429·500 이 전부 생기는데 받을 코드가 없다(BE-077 §7.8) |
| 순수 함수의 예외 | 화면이 살아남는다 | **미충족(설계상 마지막 방어선)** — `applyPayment`/`applyNotice` 가 던지면(`types.ts:217,224`) `ErrorBoundary`(`AppShell.tsx:395`)가 **화면 전체를 대체한다.** 술어가 먼저 거르므로 도달하면 버그지만, 그 표현이 '화면이 사라진다'인 것은 의도가 아니다 |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 금액 · 입금 원장 무결성 · 감사

이 화면은 **고객이 실제로 보낸 돈**을 시스템 안의 사실로 확정한다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **입금 상태가 잔액과 갈리지 않는다** | **충족(구조적)** — 상태가 저장되지 않고 `payments` 의 누적 합에서 파생한다(`types.ts:114-120`). 목록 배지·상세 배지·잔액·완납일·입력 잠금·기록 가드가 **전부 한 함수**를 읽는다. 회귀 `billing.test.ts:66-105`. **파생이면 갈라질 수 없다** |
| 완료 판정이 마지막 한 건이 아니라 합이다 | **충족** — `billing.test.ts:82-90`(400,000 + 600,000 = 1,000,000 → `paid`). 어느 한 건도 청구액에 닿지 않아도 합이 닿으면 완료다 |
| 초과 입금이 잔액을 음수로 만들지 않는다 | **충족(가드)** — `amount > outstanding` 거절(`types.ts:187`). 회귀 `billing.test.ts:123-125`. **단 그 가드가 화면에만 있다** — 저장 층은 재판정하지 않는다(BE-077 §7.5) |
| 음수·소수 입금이 들어올 수 없다 | **충족(가드)** — `!Number.isInteger(amount) \|\| amount <= 0` 거절(`:186`). 회귀 `billing.test.ts:116-119`. 두 성질이 함께여야 `paid >= amount` 비교가 오차를 타지 않는다 |
| **입금 기록은 append-only — 고치지도 지우지도 않는다** | **화면 층 충족 · 저장 층 미보장.** `applyPayment` 가 spread-append 뿐이고(`:218`) 표에 행 액션이 0건인데, **`BillingInput` 이 `payments` 전문을 담고 저장이 통째로 치환한다**(`types.ts:348-363` · `data-source.ts:126`) — 조작된 클라이언트는 과거 입금을 지울 수 있다(BE-077 §7.4) |
| **동시 기록이 서로를 지우지 않는다** | **미충족** — 전체 치환 + 토큰 부재로 **나중 저장이 앞선 입금을 되돌린다**(EXC-04). **원장 도메인에서 가장 나쁜 실패다 — 사라진 입금은 흔적조차 없다** |
| 응답 유실 후 재시도가 이중 입금을 만들지 않는다 | **지금은 우연히 충족 · 계약이 바뀌면 미충족** — 전체 치환이라 재시도가 같은 결과를 낸다. **심이 예고하는 POST append(`data-source.ts:165`)로 가면 멱등키 없이는 곧 이중 입금**이고 그 키가 전달되지 않는다(EXC-08 · BE-077 §7.7) |
| 청구액이 견적 정정에 흔들리지 않는다 | **충족** — `amount` 는 `computeTotals` 의 **스냅숏**이다(`types.ts:391`, 근거 `:371-377`). 회귀 `billing.test.ts:230-232`. **단 요청 바디에 있어 위조 가능하다** — 낮추면 받지 않은 돈이 받은 것이 된다(BE-077 §7.3 #1) |
| 완납일이 결정적이다 | **충족하되 순서에 의존한다** — `paidOnDate` 가 배열을 **저장 순서대로** 누적한다(`:123-130`). 서버가 목록을 날짜순으로 정렬해 내려주면 같은 데이터가 다른 완납일을 낸다(BE-077 EP-02) |
| 미수금 합계가 정확하다 | **충족(현 가드 아래)** — `Math.max(outstanding, 0)` 의 합(`:325-327`). **서버가 과오납을 허용하는 순간 그 클램프가 초과분을 삼켜 미수금을 조용히 부풀린다** |
| 기록 id 가 충돌하지 않는다 | **미충족** — `bp-${Date.now()}`·`bn-${Date.now()}`(`:260,275`). 같은 밀리초의 두 기록이 같은 id 를 만든다(React `key` 중복) |
| 안내 발송 시각이 서버 시각이다 | **미충족** — `new Date().toISOString()`(`:276`). 감사 성격의 기록인데 사용자의 시계를 신뢰한다. 입금일(`paidOn`)은 사람이 통장을 보고 적는 값이라 다르다 |
| 청구번호가 유일하다 | **미보장** — 채번은 한 곳(`data-source.ts:97-101`)이나 `seq` 가 **프로세스 지역 카운터**(`:94`)이고 `billNo` 가 요청 바디에 있어 임의 값으로 덮을 수 있다. 중복 검사 0건 |
| **한 견적에 청구는 하나다** | **충족(삼중 방어)** — `quoteId` 가 멱등키다(`types.ts:70`). 표시(`QuoteDetailPage.tsx:171,278`) · 실행(`:182`) · 저장소(`data-source.ts:153-159`, 있으면 **기존 청구를 돌려준다**)가 각각 막는다. 회귀 `billing.test.ts:210-225`. **단 `quoteId` 가 요청 바디에 있어 멱등키를 옮길 수 있다**(BE-077 §7.3 #6) |
| 청구는 수주 전환된 견적에서만 생긴다 | **충족** — `isOrderedQuote` 하나만 문을 연다(`types.ts:166`). 회귀가 `draft`·`sent`·`accepted`·`rejected`·`expired` **다섯을 전수**로 막는다(`billing.test.ts:216-220`) |
| 기록의 근거가 사후에 바뀌지 않는다 | **미보장** — 완료된 청구도 `note`·`method` 는 열려 있고(의도 — 세금계산서 등 후속 기록), **`payments`·`amount` 까지 같은 PUT 으로 열려 있다**(위 두 항) |
| 연체·수금 SLA 를 판정할 수 있다 | **불가.** `Billing` 에 **지급기한 필드가 없다**(`types.ts:66-89` 전수) — 경과를 계산할 근거가 데이터에 없다(BE-077 §7.13 #6) |
| **실제 입금과 기록이 함께 확정된다** | **미정** — 계좌 연동도 PG webhook 도 없다. 운영자가 통장을 보고 손으로 기록하며 두 사건 사이에 원자성이 없다. 잘못 보면 받지 않은 돈이 기록되고, 잊으면 받은 돈이 미수로 남는다 — **이 계약은 어느 쪽도 감지하지 못한다**(BE-077 §7.9) |
| 감사 로그 | **없다.** 누가 언제 입금을 기록했는지(`recordedBy`)가 필드에 없다 — `payments` 는 '언제 들어왔는가'만 담고 '누가 확정했는가'를 담지 않는다. 돈을 확정하는 조작인데 행위자가 남지 않는다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | EXC-04 · (§4.3) | P0 | **두 운영자의 입금이 서로를 지운다.** 전체 치환 저장 + 낙관적 동시성 토큰 부재 → 나중 저장이 앞선 `payments` 를 되돌린다. **append-only 규칙이 저장 층에서 반대로 뒤집힌다.** 409 해소 UI 도 없고 저장소가 들고 온 정확한 문장마저 버려진다 | 이 화면 + BE 계약 | **백엔드 명세 (최우선 · BE-077 §7.6·§7.7 안 A)** · UI 기획 |
| 2 | EXC-08 · (§4.3) | P0 | **멱등키·동기 제출 락 부재.** 자리(`crud.ts:340-346`)와 원장(`crud.ts:193,245`)이 이미 있는데 호출부가 비어 있다(`:195-196`). 지금은 전체 치환이 우연히 완화하지만 **POST append 로 가는 순간 연타가 곧 이중 입금**이고 그것을 지울 수단이 앱에 없다 | 이 화면 + BE 계약 | **백엔드 명세 · 프론트 구현 (최우선 · BE-077 §7.13 #2)** |
| 3 | FEEDBACK-02 · FEEDBACK-05 | P0 · P2 | **비가역 액션 넷에 확인 게이트가 0건이다** — 입금 기록 · 안내 기록 · 청구 방식 되돌림(링크가 확인 없이 지워진다) · 청구 만들기. undo window 도 snapshot 도 없다. 화면은 '되돌릴 수 없습니다' 라고 말하면서 한 번의 클릭으로 기록한다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-077 §7 #24) |
| 4 | (§4.3) · BE-077 §7.4 | — | **잘못 기록한 입금을 앱 안에서 고칠 방법이 전혀 없다.** 의도된 설계이나 회계의 정석인 감액 엔트리마저 봉쇄돼(`amount <= 0`) 유일한 복구가 DB 직접 수정이다 — **원장을 지키자고 만든 규칙이 원장 밖에서의 수정을 강제한다** | **아키텍처 (도메인)** | 아키텍처 · UI 기획 (FS-077 §7 #10) |
| 5 | FEEDBACK-04 | P0 | **미저장 이탈 가드가 없다** — 입금액·입금자명·안내 메모가 확인 없이 사라진다. `navigate()` 두 버튼(`:303,646`)이라 훅만 붙여서는 안 되고, **즉시 커밋 모델(FS-077 §7 #3)을 폼 모델로 고치면 함께 풀린다** | 이 화면 | UI 기획 쪽 변경 요청 (FS-077 §7 #21·#3) |
| 6 | A11Y-01(n-a 사유) · A11Y-16 · A11Y-11 · A11Y-13 · FEEDBACK-01 · FEEDBACK-03 | P0 · P1 | **저장 성공을 시각으로 알리는 자리가 없다** — `useToast` 소비 0건이고 통지는 시각 숨김 live region 한 줄뿐인데, **같은 문구를 두 번 넣으면 다시 읽히지 않아**(`:202`) 연속 입금은 스크린리더에도 침묵한다. 그 밖: `hint` 가 `hintIdOf` 로 연결되지 않고, 입금 위반이 필드가 아닌 배너로만 나가며, 폼 포커스 이동이 없다 | 이 화면 | UI 기획 쪽 변경 요청 (A11Y · FS-077 §7 #22) |
| 7 | STATE-02(잔여) | — | **미수금 안내문이 조회 실패를 '세는 중'으로 위장한다**(`:116,210-213`). 같은 화면의 필터 배지는 `null` → '—' 로 정직하다 — **한 화면 안에서 '모름'의 표현이 갈린다** | 이 화면 | 프론트 구현 (FS-077 §7 #28) |
| 8 | EXC-21(잔여) · EXC-22 | P0 · P1 | **`/sales/billing` 이 어떤 플랜 모듈에도 속하지 않는다**(`module-resources.ts:52-60`) → fail-open 으로 항상 granted. **견적이 잠긴 플랜에서 청구가 열리고**, 청구 상세가 `quoteNo`·`accountName`·`amount` 를 보인다. 요구 위반은 아니나 패키징 결함이다 | 엔타이틀먼트 소유 모듈 | 명세 리뷰 · 백엔드 명세 (BE-077 §7.11) |
| 9 | IA-02 | P0 | sub-route 에서 AppHeader `<h1>청구·입금</h1>` + 상세 자체 `<h1>청구 BL-…</h1>` → **`<h1>` 2개.** 목록은 in-content h1 이 없어 모델이 화면 타입마다 모순 | **앱 전역**(AppHeader 모델) | 프론트 구현 · UI 기획 (FS-077 §7 #23) |
| 10 | IA-04 · ERP-15 · (§4.1) | P0 · P1 | 페이지네이션·정렬 UI 없음 — 전량 렌더이고 **고액 미수 순으로 훑을 수 없다.** 청구는 단조 증가하는 회계 기록이라 이 화면이 가장 먼저 커진다. **행당 파생 계산이 4회**라 건수에 4배로 비례한다. **URL list state 는 이미 있어**(`useListState`) `page` 를 쓰기만 하면 된다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-077 §7.12 · FS-077 §7 #15) |
| 11 | (§4.1) · BE-077 §7.8 | — | **링크·비고가 한 글자마다 저장 요청을 낸다**(`:409-414,422`) — 다음 커밋이 앞선 요청을 abort 하고 `value` 가 서버 데이터라 **입력이 사실상 불가능하다.** 형제 화면은 RHF 폼 state 로 들고 저장 버튼에서 한 번 보낸다. **그리고 견적→청구 생성은 react-query 밖의 동기 호출이라 실패를 표현할 자리가 0건이다** | 이 화면 | **UI 기획 쪽 변경 요청 (최우선)** · 아키텍처 (FS-077 §7 #3·#29) |
| 12 | EXC-06 · EXC-20 · EXC-07 | P1 | 저장 실패가 400/403/409/422/500 을 **한 문구로** 뭉갠다. 참조 코드가 없다(`referenceOf` 미소비). 서버 검증을 필드로 되돌릴 경로가 구조적으로 없다(폼이 아니다) | 이 화면 + BE 계약 | UI 기획 (FS-077 §7 #13·#2) |
| 13 | (§4.3) | — | **금액·원장 무결성** — `amount`·`payments`·`notices`·`billNo`·`quoteId`·발송 시각·기록 id 가 전부 요청 바디에 있어 위조 가능하다. 기록 id 는 같은 ms 에 충돌하고, **누가 입금을 확정했는지 남지 않는다**(감사 로그 부재) | 이 화면 + BE 계약 | **백엔드 명세 (BE-077 §7.3 — 최우선)** |
| 14 | (§4.2) | — | **저장 실패해도 입력이 비워진다**(`:267-268,282` 가 `commit` 밖) — 실패하면 통장을 다시 보며 재입력한다. 참조 코드도 없어 신고 수단이 없다 | 이 화면 | 프론트 구현 (FS-077 §7 #25) |
| 15 | (§4.3) | — | **지급기한 필드가 없어 연체·수금 SLA 를 판정할 수 없다.** 미입금 독촉의 우선순위를 데이터가 지지하지 못한다. `lastNoticeAt`(`types.ts:138-140`)이 있는데 **화면 소비 0건**이라 '언제 마지막으로 안내했는가'도 보이지 않는다 | BE 계약 + 이 화면 | 백엔드 명세 · UI 기획 (BE-077 §7.13 #6 · FS-077 §7 #17) |
| 16 | (§4.3) · BE-077 §7.9 | — | **실제 입금과 기록이 함께 확정되지 않는다(미정)** — 계좌 연동이 붙었을 때 이 기록이 '사람의 판정'인지 '자동 매칭의 확인'인지 정해야 한다 | **아키텍처 (선행)** | 아키텍처 · 백엔드 명세 |
| 17 | COMP-06 · COMP-09 · COMP-12 · ERP-07 · ERP-08 | P2 | 상세 로딩이 shape 를 흉내 내지 않고 `aria-busy` 도 없다 · 긴 값 truncate 없음 · raw input 두 개에 카운터·근접 경고 없음 · 금액의 '원'이 숫자에 붙어 다행 컬럼 정렬을 깬다 · 날짜 3종이 포맷 함수를 거치지 않는다 | 이 화면 | UI 기획 (#10 과 함께) (FS-077 §7 #27·#19·#14) |
| 18 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 입력을 버린다. **BE-077 §2 의 '서버 5초 < 프론트 상한'이 성립하지 않는다** | **앱 전역** | 프론트 구현 (FS-077 §7 #20) |
| 19 | (§1) | — | **이 라우트의 e2e 커버리지가 0이고 어댑터 경계 회귀도 0건이다** — `billing.test.ts` 312행은 전부 순수 함수다. #1 의 lost update 도, 409 경로도, 멱등 재생도 고정하는 테스트가 없다 | 이 화면 | 프론트 구현 · 명세 리뷰 (FS-077 §7 #18 · BE-077 §7.13 #18) |
| 20 | (BE-077 §7.13 #11) | — | **소비자 0건인 삭제 경로**(`removeBilling` · 어댑터 `remove`) — 계약에 없는 표면이 코드에 살아 있다 | 이 화면 | 프론트 구현 (정리) (FS-077 §7 #11) |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`billingAdapter` 는 `SCOPE = 'sales-billing'`(`data-source.ts:17`)으로 `createStoreAdapter({ scope: SCOPE, … })`(`:167-174`)를 조립하고, 그 팩토리가 `fixtureRequest({ scope, op, … })` 에 op 를 넘긴다(`crud.ts:199-283`). `BILLING_RESOURCE` 도 같은 문자열이다(`:162`). 4개 op 중 **화면이 실제로 부르는 것은 3개**다.

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll` (`crud.ts:199-200`) | `?fail=list` · `?fail=sales-billing:list` · `?fail=all` | FS-077-EL-013 (목록 배너) |
| `detail` | `fetchOne` (`crud.ts:202-206`) | `?fail=detail` · `?fail=sales-billing:detail` · `?fail=all` | FS-077-EL-041 (상세 대체 화면) |
| `save` | `update` (`crud.ts:238-244`) | `?fail=save` · `?fail=sales-billing:save` · `?fail=all` | FS-077-EL-021 (저장 실패 배너) — **설정·입금·안내 셋이 이 한 op 을 공유한다**(`commit` 이 단일 경로 — `BillingDetailPage.tsx:189-210`) |
| `delete` | `remove` (`crud.ts:265-271`) — **호출부 0건** | — | **`?fail=delete` 는 이 화면에서 아무 효과가 없다**(삭제 진입점 부재 — BE-077 §6) |

> **⚠ 견적 → 청구 생성은 어떤 스위치에도 걸리지 않는다.** `createBillingFromQuote`(`data-source.ts:153-159`)는 **동기 함수라 `fixtureRequest` 를 지나지 않는다** — `?fail=`·`?status=`·`LATENCY_MS`·abort·멱등 원장이 전부 무관하다. 이 경로의 실패는 **브라우저에서 재현할 수단 자체가 없다**(BE-077 §7.8). 방어선도 없다 — 이 함수를 부르는 회귀가 `billing.test.ts` 에 0건이다(순수 `buildBillingFromQuote` 만 검증한다 — `:227-255`).

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리(`dev.ts:100-107` 이 그 이유를 밝힌다: status 를 붙이면 참조 코드가 새로 나타나 기존 e2e 계약이 바뀐다) **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 gap). **저장소가 들고 온 문장(`data-source.ts:123`)이 화면에 나타나는지도 함께 본다 — 나타나지 않는다** |
| **EXC-04 (lost update)** | **스위치가 아니라 두 탭으로 재현한다** — 같은 청구를 두 탭에서 열고 각각 다른 금액으로 '입금확인 기록' → 새로고침. **입금 내역에 한 건만 남으면 gap**(현재 gap). 이 경로는 `?status=` 로 재현되지 않는다 |
| EXC-06 (403·422·429 강등) | `?status=save:403` · `save:422` · `save:429` — 배너가 계열별로 갈리지 않으면 gap(현재 gap) |
| EXC-20 (reference code) | `?status=save:500` — 배너에 `오류 코드 TDS-…` 가 보이면 pass(**현재 보이지 않는다** — `referenceOf` 미소비). **`?fail=save` 로는 애초에 재현되지 않는다** — generic `Error` 에는 `reference` 가 없다 |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fsales%2Fbilling&reason=session_expired` 로 가면 pass |
| EXC-08 (연타) | **스위치가 아니라 네트워크 스로틀·연타로 재현한다.** 400ms 창 안에 '입금확인 기록'을 2회 클릭 → 요청이 2건이면 gap. `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/sales/billing` = 0건으로도 판정된다 |
| FEEDBACK-02 (게이트 부재) | 상세에서 '입금확인 기록' 클릭 → **확인 다이얼로그 없이 곧바로 기록되면 gap**(현재 gap). `grep -rn "ConfirmDialog\|Modal" apps/admin/src/pages/sales/billing` = 0건 |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/sales/billing` 의 `update` 를 끄면 기록 버튼 2개가 사라지고 입력 8개가 비활성돼야 한다(현재 pass) |
| EXC-21 (엔타이틀먼트) | **`?status=` 가 아니라 플랜**으로 재현한다 — `sales.pipeline` 을 내리면 견적은 잠기는데 **`/sales/billing` 은 그대로 열린다**(매핑 부재 — §5 #8) |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다. **다만 이 값이 §4.1 의 '한 글자마다 저장' 결함을 육안으로 드러내는 도구이기는 하다** — 링크 입력에 세 글자를 치면 요청 3건이 400ms 간격으로 겹치고 앞의 둘이 abort 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · TOKEN-03 · COMP-01 · A11Y-01 · A11Y-02 · A11Y-11 · A11Y-12 · MOTION-01/02/03 · ERP-13 · EXC-04 · EXC-06 · EXC-08 · FEEDBACK-02 · FEEDBACK-04 판정 — 전부 2026-07-22 실측) · RTL(A11Y-11 의 `aria-required` 주입 확인) · **`billing.test.ts` 312행**(순수 규칙 — 입금 누적·완료 판정·완납일·입금 가드 4종·안내 가드·생성 가드 전수·견적 승계·목록 필터/집계/검색/정렬). **화면 조립을 검증하는 테스트는 0건이다** — 즉시 커밋·권한 게이팅·404 분기·live region·409 경로가 전부 회귀 밖에 있다(§5 #19).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다 — DS 컴포넌트 내부까지 확인한 항목(A11Y-11 의 `FormField.tsx:36,50-56` `aria-required` 주입 · A11Y-12 의 `FilterPanel.tsx:145`)은 그 근거도 함께 적었다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **EXC-04 의 lost update 는 `?status=` 로 재현되지 않으므로 두 탭 절차를 따로** 적었다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 페이징·선택 부재 · FEEDBACK-06/A11Y-02/MOTION-01 modal 부재 · A11Y-01/MOTION-02 toast 부재 · IA-05 폼 라우트 쌍 부재). **그리고 그 부재가 면제하지 않는 축(FEEDBACK-02 · IA-04 · 성공 통지 부재)을 각각 gap·§5 로 따로 남겼다**
- [x] §2.1 산수 검산 — **12 pass + 6 종속 + 7 n-a + 6 gap = 31** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`·`shared/ui`·`shared/permissions`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1). `FilterPanel`·`FormField` 처럼 **화면이 골라 쓴 공유 컴포넌트가 요구를 충족시키는 경우도 `직접`** 으로 두고 그 컴포넌트의 라인을 근거로 댔다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·기간 필터·bulk·optimistic)은 적지 않았다. **엔타이틀먼트 축(EXC-22)은 이 화면에서 fail-open 이 실제로 발현되므로 넣었다**
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. 이 도메인 고유 축(행당 파생 계산 4회 · 한 글자당 저장 요청 · 저장 요청 크기 무한)을 별도 줄로 세웠다
- [x] §4.3 을 **금액 · 입금 원장 무결성 · 감사** 축으로 세웠다 — 파생 상태의 구조적 충족과, 저장 계약이 append-only 를 깨는 사실과, **누가 입금을 확정했는지 남지 않는다**는 감사 공백을 함께 적었다
- [x] §6 의 `?fail=` scope(`sales-billing`)를 **어댑터 코드(`data-source.ts:17,167-174`)에서 확인**했고 op 4개 중 호출부가 있는 3개를 갈랐으며(`delete` 무효 포함), **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음). **견적→청구 생성이 어떤 스위치에도 걸리지 않는다**는 사실을 명시했다
- [x] §5 의 gap 이 FS-077 §7 · BE-077 §7.13 과 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가(백엔드 없음)'로 남겼고, E2E 를 돌리지 않았음을 §1·§6 에 명시했으며, 실제 입금과 기록의 확정 관계는 **미정**으로 남겼다
