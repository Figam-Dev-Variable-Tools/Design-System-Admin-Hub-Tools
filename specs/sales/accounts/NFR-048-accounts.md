---
id: NFR-048
title: "거래처 비기능 명세"
functionalSpec: FS-048
backendSpec: BE-048
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-048. 거래처 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-048 거래처 (`/sales/accounts` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-048(요소·예외) · BE-048(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-048 §7 · BE-048 §7.11 과 번호가 일치해야 한다 |
| 판정 근거 | **E2E 미실행 — 판정 근거는 `HEAD = a5c2639` 코드 대조다**(§6). 기준일 2026-07-17 |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음 — 이 화면의 P0 30건 판정은 하나도 뒤집히지 않았다.** 다만 **`종속` 3건의 근거 텍스트가 낡아 교체했다**: MOTION-01·02 는 이전 배치가 '라이브러리 미도입이라 소유 문서에서 gap 일 것' 이라 추정했으나 **PR #26 이 CSS-only 로 구현했다**(§2) · MOTION-03 은 '`ToggleSwitch.css` 의 reduced-motion off 누락' 을 근거로 들었으나 **PR #26 이 게이트를 신설했다**(`ToggleSwitch.css:79-84`). **판정(`종속`)은 그대로이고 종속 대상의 상태가 바뀌었다** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크(`shared/crud`)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 화면 성격

**목록 + 2열 미리보기 폼(등록/수정)** 이다. 세 라우트가 두 컴포넌트로 해석된다(`App.tsx:241-243`). **읽기 전용 상세가 없다** — 행 클릭이 곧 편집이다. 이 성격이 아래 판정을 지배한다:

- 목록은 **공용 CRUD 프레임워크 전량 소비자**다 — `useCrudList` + `CrudListShell` + `CrudTable` + `useListState` + `useDebouncedSearch` + `useCrudRowUpdate`. 그래서 STATE-01·STATE-02·STATE-05·COMP-10·IA-13 이 **화면 코드 0줄로** 충족된다.
- 폼은 **`FormPageShell` 을 쓰지 않는다** — 우측 미리보기 때문에 골격을 손으로 만든 10개 폼 중 하나다(quality-bar IA-12 P2). 그러나 `useCrudForm` + `FormServerError` + `FormConflictDialog` 라는 **계약 조각은 공유**하므로 EXC-04·EXC-08·EXC-12·EXC-20 이 '어떤 폼이냐'에 따라 갈리지 않는다(`FormFeedback.tsx:1-6` 이 그 판정을 적어 두었다).
- **동적 배열 필드(`AccountContactsField`)가 이 화면 고유의 위험면**이다 — `FormField` 밖 손조립이라 A11Y-11·COMP-04 가 여기서 깨진다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 목록이 `useCrudList` 를 소비하고(`AccountListPage.tsx:98-103`) 그 훅이 `firstLoading = isFetching && data === undefined`(`useCrudList.tsx:71`)와 `refreshing = isFetching && data !== undefined`(`:72`)를 **분리해** 파생한다. `CrudListShell` 이 `firstLoading` 만 `CrudTable.loading` 으로 넘겨(`CrudListShell.tsx:138`) 스켈레톤을 최초 로드에 가두고, 요약은 재조회 때 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다(`:118-122`). `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:254`)가 이전 행을 캐시에 유지한다. 네 상태가 배타적이다: 스켈레톤(`loading`) → `Empty`(`items.length === 0`) → 행 → error 배너(`error !== null` — `CrudListShell.tsx:113,156`). **폼도 같다** — `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:136`) | `/sales/accounts` 진입 → 3행 렌더 확인 → 거래유형 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 3건'이 사라지면 gap.** `?fail=list` 로 error 배너만 뜨는지, 검색 0건에서 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** ① 목록 read 실패 → `<Alert tone="danger">거래처 목록을 불러오지 못했습니다.</Alert>` + '다시 시도'(`refetch`) 인라인(`CrudListShell.tsx:157-164`). empty 로 폴백하지 않는다 — `error !== null` 이 표 자체를 대체한다(`:113`). ② 폼 상세 read 실패 → 인라인 danger Alert + **`loadFailure` 로 갈린 복구**(`AccountFormPage.tsx:223-245`): `'error'` 면 '다시 시도'(`retryLoad`) + '목록으로', `'not-found'` 면 '목록으로'만. **read 실패에 error toast 를 쓰는 경로가 0건이다** — `toast.error` 는 인라인 토글(write)에만 있다(`useCrudRowUpdate.ts:53`) | `?fail=list` → 목록에 danger Alert + '다시 시도'. `?status=detail:500` 으로 `/sales/accounts/acc-1/edit` → Alert + '다시 시도' + '목록으로'. **error toast 가 뜨면 gap** | **pass** |
| STATE-04 | STATE | 직접 | **충족(단, (a)절은 표면 부재).** **(b) 선택 해제** — `AccountListPage.tsx:110-112` 이 `useEffect(() => clear(), [filter, keyword, clear])` 로 거래유형·검색어가 바뀔 때마다 선택을 전부 해제한다. 선택은 `useCrudList`(=`useRowSelection`)가 쥐고 있으므로 화면이 조건 변화를 그 선택에 이어 준다. 그래서 '화면에 없는 행이 선택된 채 선택 3건 삭제'가 성립하지 않는다. **(a) page clamp** — **걸릴 표면이 없다**: 이 화면에 페이지네이션이 없어(`CrudTable.tsx:171` 이 전량 렌더 · `<Pagination` grep = 0) `useListState.clampPage`(`useListState.ts:217-223`)가 소비되지 않는다. 페이지네이션 부재 자체는 **IA-04 가 gap 으로 잡는다** — 이 절의 표면 부재가 그것을 면제하지 않는다. **형제 화면 대조**: `QuoteListPage` 에는 이 `useEffect` 가 없어 같은 요구가 gap 이다(NFR-050 §2) — 이 화면이 옳은 쪽이다 | `/sales/accounts` 에서 행 2건 체크 → '전체 3건 선택됨' 확인 → 거래유형을 '매출처'로 변경. **SelectionBar 가 사라지고 요약의 '선택됨'이 지워지면 pass.** 검색어 입력으로도 동일. 페이지네이션이 도입되면 (a)절을 다시 매긴다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. 파생 치수는 `calc(var(--tds-space-6) * 5)`(`AccountListPage.tsx:75`) · `minmax(calc(var(--tds-space-6) * 13), 1fr)`(`AccountFormPage.tsx:85`) 처럼 space 토큰 배수로만 표현한다. border 는 `var(--tds-border-width-thin)`(`AccountBusinessPreview.tsx:27`) — 키워드가 아니다 | `grep -rnE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/sales/accounts apps/admin/src/pages/sales/_shared` → **0건이어야 한다. 실측 0건.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`AccountFormPage.tsx:251,283,307,331,350,361,383,394,448` · `AccountContactsField.tsx:111,227`) · DS `<Button>`·`<SelectField>`·`<SearchField>`·`<TextareaField>`·`<ToggleSwitch>`. **이 화면이 `:focus-visible` outline 을 직접 선언하지 않는다** — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148`) · Toast · DS `<Button>`·`<ToggleSwitch>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`AccountFormPage.tsx:271,404,499,509,524`) · Toast · 삭제/충돌/이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | **충족.** 폼 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`AccountFormPage.tsx:260`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. 미리보기의 상호도 `--tds-typography-title-md-*` 를 참조한다(`AccountBusinessPreview.tsx:41-47`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/sales/accounts/new` 의 '거래처 등록' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족.** `AccountListPage.tsx:182-189` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 공용 `useDebouncedSearch` 를 소비한다(`useListState.ts:227-230` 경유). 그 훅이 세 절을 전부 구현한다: ① **조합 중 커밋 금지** — `if (composing) return;`(`useDebouncedSearch.ts:87`)이 커밋 effect 를 막고 `compositionend` 가 내려간 뒤에야 디바운스를 건다 ② **조합 중 Enter 차단** — `event.nativeEvent.isComposing \|\| composingRef.current` 두 신호를 함께 보고 `stopPropagation`(`:121-124`) ③ **디바운스 250ms**(`:23,93-95`) + 최소 길이 정책(`:91`). **stale 응답 경합은 구조적으로 없다** — 검색이 클라이언트 필터이고(`searchAccounts`) 커밋 값은 URL·`useMemo` 를 통해서만 반영된다 | `/sales/accounts` 검색창에 IME 로 '한빛' 입력. **조합 중 '하'·'한ㅂ' 로 표가 깜빡이면 gap.** 조합 중 Enter 가 폼을 제출하지 않는지, 완성 250ms 뒤 URL 이 `?q=한빛` 한 번만 바뀌는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | 이 화면의 파괴적/비가역 표면 **3종이 전부 `ConfirmDialog` 로 게이트된다**: ① 단건 삭제(`useCrudList.tsx:154-165` — `intent="delete"`) ② 일괄 삭제(`:166-177`) ③ discard intent — 미저장 이탈 가드(`AccountFormPage.tsx:215` → `useUnsavedChangesDialog`). busy 잠금(`disabled={busy}` + `aria-busy` + '처리 중…' — `packages/ui/.../ConfirmDialog.tsx:151-155`) · 실패 시 다이얼로그 유지 + error 배너(`useCrudList.tsx:112`) · 취소/Esc/dim 이 in-flight 를 abort(`:87`)는 전부 **DS + `useCrudList` 가 소유**한다. 이 화면은 소비자다 | DS `ConfirmDialog` · `useCrudList` 판정에 종속. 이 화면에서는 `?fail=delete` 로 삭제 실패 시 다이얼로그가 배너와 함께 유지되고 재클릭이 재시도되는지만 확인 | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `AccountFormPage.tsx:215` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `isDirty` 는 **RHF `formState.isDirty`** 그 자체다(`useCrudForm.ts:261`) — 도메인 판정으로 대체하지 않았다. 3경로(beforeunload · 앱 내 링크 capture 가로채기 · popstate sentinel)는 훅이 소유하며 `_self`·수식키·가운데 클릭 edge case 도 훅이 처리한다(`useUnsavedChangesDialog.tsx` 헤더 · `isPlainLeftClick` · `SAME_TAB_TARGETS`). 저장 성공 시 `navigate(listPath, { replace: true })`(`useCrudForm.ts:223`)로 떠나므로 가드가 걸릴 자리가 없다 | `/sales/accounts/acc-1/edit` 에서 상호를 고친 뒤 ① 탭 닫기 ② 사이드바 '계약' 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로'(FS-048-EL-018)·'취소'(EL-039)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 이는 훅의 3경로 계약 밖이라 **이 요구의 gap 이 아니다**(FS-048 §7 #4 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 거래처 폼은 modal 이 아니라 전용 라우트(`/new`·`/:id/edit`)의 2열 카드로 렌더된다. 이 화면의 modal 3종(삭제 확인 · 충돌 다이얼로그 · 이탈 가드)은 **전부 입력 필드가 없는 확인 다이얼로그**다. 그중 이탈 가드는 그 자신이 FEEDBACK-04 의 산물이고, 충돌 다이얼로그는 폼을 언마운트하지 않으므로(`FormFeedback.tsx:51-53`) '입력을 파괴하는 close' 자체가 성립하지 않는다. quality-bar IA-06 의 무게 규칙상 거래처는 rich 엔티티라 route 가 옳다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 4종: 폼 저장 성공(`useCrudForm.ts:222`) · 단건 삭제 성공(`useCrudList.tsx:108`) · 일괄 삭제 성공(`:146`) · 인라인 토글 성공/실패(`useCrudRowUpdate.ts:49,53`). **지속 live region 은 `ToastProvider` 가 소유한다** — 이 화면은 텍스트만 주입한다. (별개로 목록에는 `CrudListShell` 이 소유한 **항상 마운트된** `aria-live="polite"` 리전이 있다 — `CrudListShell.tsx:107-109`. 그것은 A11Y-16 의 산물이며 toast 와 무관하다) | ToastProvider 판정에 종속. 이 화면에서는 저장·삭제 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 3종(FEEDBACK-02 와 같은 노드). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 — 앱 어댑터(`shared/ui/ConfirmDialog.tsx:43`)는 `onCancel` 만 감싸고 나머지를 그대로 위임한다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 `'<상호>'을(를) 삭제합니다…` message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **미충족 — 2건.** **충족된 절**: ① `aria-invalid` 4건(`AccountFormPage.tsx:288,312,336,452`)이 **전부 `aria-describedby={errorIdOf(...)}` 와 짝**이다(`:289-291,313-315,337-339,453-457`) — 짝 없는 `aria-invalid` 0건, id 는 `FormField` 가 렌더하는 `<p id={errorIdOf(htmlFor)} role="alert">`(`FormField.tsx:110`)와 일치 ② **required 8건 전수 확인** — `account-name`·`account-biz-no`·`account-ceo`·`account-credit-limit` 의 자식이 `<input>`, `account-tax`·`account-trade-type`·`account-credit-grade`·`account-payment-term` 의 자식이 `SelectField` 라 **8/8 이 `aria-required` 주입 대상**이다(`FormField.tsx:36-41,50-56` `withAriaRequired`). 래퍼 `div`/`span` 자식이 **0건** — FS-037/070 을 gap 으로 만든 그 패턴이 이 화면에는 없다. **미충족 2건**: ① **hint 가 valid 일 때 연결되지 않는다** — `account-credit-limit` 의 `hint="0 이면 미설정"`(`:442`)을 `FormField` 가 `<p id={hintIdOf('account-credit-limit')}>`(`FormField.tsx:115`)로 렌더하는데, 입력의 `aria-describedby` 는 **오류가 있을 때만** 세워진다(`:453-457`) → **힌트가 AT 에 영원히 닿지 않는다.** 요구는 'hint 는 valid 일 때만 `hintIdOf` 로 연결' — 즉 valid 일 때는 연결하라는 뜻이다 ② **`AccountContactsField` 가 `FormField` 밖 손조립**이다 — `<span style={fieldLabelStyle}>담당자 *</span>`(`AccountContactsField.tsx:161`)라 `*` 가 **aria-hidden 이 아닌 리터럴 텍스트**이고, zod 가 필수로 보는 `contacts[].name`(`validation.ts:81-88`)을 그리는 입력에 **`required`·`aria-required` 가 없다**(`:108-117` — `aria-label` 만). 오류 `<p role="alert">`(`:251`)도 어떤 입력과도 `aria-describedby` 로 연결되지 않는다 | `grep -n "aria-invalid" apps/admin/src/pages/sales/accounts -r` → 4건, 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인(**현재 4/4 pass**). RTL 로 `/sales/accounts/new` 렌더 → `getByLabelText('상호(거래처명)')` 의 `aria-required === 'true'` assert(pass), `getByLabelText('담당자 1 이름')` 의 `aria-required` assert → **null 이면 gap**. '여신한도' 입력의 `aria-describedby` 가 힌트 `<p>` id 를 가리키는지 → **undefined 면 gap** | **gap** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<SelectField>` 1개**다(`AccountListPage.tsx:191-202`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, `pages/sales/accounts` 전체에 **`aria-current` grep = 0**. 좌측 필터 패널(`filterPanelStyle`/`filterNavStyle`)도 소비하지 않는다 — 툴바 인라인 select 다 | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 3종: 삭제 확인 · 충돌 다이얼로그 · 이탈 가드 `ConfirmDialog`. enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21,30-33` → keyframes `:126-144`) + dialog scale(`:58-59,35-38` → `:146-168`, exit 는 `forwards`) · reduced-motion 게이트 `:173-180` · `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **Motion/framer-motion 은 여전히 미도입**(`packages/ui/src` 소비 0건)이나 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성했다 — **'라이브러리가 없으니 소유 문서에서 gap 일 것' 이라는 이전 배치의 추정은 더 이상 성립하지 않는다.** 잔여: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`:27-31`) — 이 화면의 다이얼로그는 footer 가 주 닫기 수단이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 여전히 이 문서의 몫이 아니다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 4종(A11Y-01 과 같은 노드). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **PR #26 에서 구현됐다** — `.tds-toast--exiting`(`Toast.css:32-37`, `tds-toast-out … forwards` + `pointer-events:none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족**(`component.overlay.exit-duration` = `{motion.duration.fast}` 150ms · `exit-easing` = `{motion.easing.accelerate}` — `tokens/tokens.json:1298-1307`). exit 완료 후 unmount 는 `onAnimationEnd` 대조로 달성. reduced-motion 게이트 `Toast.css:136-141` | DS Toast 판정에 종속(이 화면은 텍스트만 주입한다) | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스(`tds-ui-skeleton`) · Toast · Modal · DS `<Button>`·**`<ToggleSwitch>` handle transform**(목록 인라인 토글 + 폼 거래 상태 토글 — quality-bar MOTION-03 이 명시 지목한 그 컴포넌트다). **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **`ToggleSwitch.css` 의 reduced-motion 게이트가 이번 기준(PR #26)에서 신설됐다** — `:79-84` `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }` 가 남은 transition 2건(`:32` `background-color` · `:56` `transform`)을 **둘 다 끈다** → 손잡이가 즉시 최종 위치로 스냅한다. 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향이고, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다. **이전 배치가 적은 'reduced-motion off 누락' 은 해소됐다.** 나머지 표면도 각자 게이트를 갖는다 — Modal `Modal.css:173-180` · Toast `Toast.css:136-141` · 스켈레톤 `shared/ui/ui.css:110-114` | 전역 motion config·`ToggleSwitch.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인하고, 재현은 `prefers-reduced-motion: reduce` 로 거래 상태 토글을 눌러 **손잡이가 즉시 점프하는지** 본다 | **종속** |
| IA-01 | IA | 직접 | **충족.** 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:241-243` — `APP_ROUTES` 의 `/sales/accounts` · `/new` · `/:id/edit`). **어느 화면도 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위가 `CrudListShell` 의 평범한 `<div style={columnStyle}>`(`CrudListShell.tsx:98`), 폼의 최상위가 `<div style={pageStyle}>`(`AccountFormPage.tsx:248`)다 | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족 — 사유가 바뀌었다.** **해소된 것**: `findCoveringLeaf`(`nav-config.ts:270-278`) 수렴으로 `/sales/accounts/new` 가 **'자기를 감싸는 가장 긴 잎'** = `/sales/accounts` → **'거래처'** 로 풀린다(`nav-config.ts:297-299`). 예전처럼 가지 라벨 '영업 관리'로 떨어지지 않는다. **여전히 gap 인 것**: ① **`<h1>` 이 2개다** — AppHeader 가 `<h1 style={titleStyle}>{findNavLabel(pathname)}</h1>`(`AppHeader.tsx:101`)로 '거래처'를 그리고, **폼이 자기 `<h1>`(`AccountFormPage.tsx:260`)** 으로 '거래처 등록'/'거래처 수정'을 또 그린다 ② **'등록/수정' 행위가 AppHeader 제목에 반영되지 않는다** — `nav-config.ts:294-296` 이 그것을 **의도로** 못박는다('행위는 제목에 넣지 않는다 — 그 문구는 nav 에 없고 여기서 지어내면 레이아웃이 카피를 발명하게 된다'). 그래서 요구가 예시로 든 '공지 등록' 형태의 가시 primary title 이 성립하지 않는다 ③ **목록에는 in-content `<h1>` 이 없다** — title 소스가 화면 타입마다 다르다. 요구의 본문('title 이 AppHeader 에서 오는지 in-content h1 에서 오는지 정의·균일 적용')이 지적하는 바로 그 상태다 | `/sales/accounts/new` 진입 → `document.querySelectorAll('h1').length === 2` 이면 gap. AppHeader 의 가시 `<h1>` 이 '거래처'(‘거래처 등록’ 아님)이면 gap. `/sales/accounts` 는 in-content h1 이 0개임을 대조 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** **충족**: 툴바 좌측에 검색·필터, **우상단에 primary '거래처 등록'**(`AccountListPage.tsx:205-208`) → 결과 count 요약(`CrudListShell.tsx:118-122`) → SelectionBar(`:125-133`) → table(`:135`) 순서가 요구한 템플릿 그대로다. **미충족: Pagination 이 없다.** `CrudTable.tsx:171` 의 `items.map(...)` 이 `visibleItems` **전량**을 렌더하며 `<Pagination` 이 이 화면에 0건이다(앱 전체 소비자 11파일에 `pages/sales/**` 없음 — grep 확인). 거래처는 **상한 없이 늘어나는 원장**이라 'page size 초과 가능'이 확실하다(BE-048 §7.9). 연쇄: `useListState` 의 `page`·`clampPage` 가 소비되지 않고(STATE-04 (a)절의 표면 부재가 여기서 온다), `SeqCell seq={index + 1}`(`CrudTable.tsx:179`)이 페이징 도입 시 2페이지에서 1로 리셋된다(COMP-07) | 시드를 30건 이상으로 늘리고 `/sales/accounts` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | 직접 | **충족.** `/sales/accounts/new` 와 `/sales/accounts/:id/edit` 가 **같은 `AccountFormPage` 컴포넌트로 해석된다**(`App.tsx:242-243`). 구분은 `useCrudForm` 의 `isEdit = id !== undefined`(`useCrudForm.ts:75`) 하나이며, 그 값이 지배하는 것은 **title(`'거래처 수정'`/`'거래처 등록'` — `AccountFormPage.tsx:260`) · 제출 라벨(`:553`) · prefill(`detailQuery` → `reset(toValues(loaded))` — `useCrudForm.ts:131-134`) · 토스트 동사('저장'/'등록' — `:229,236`)** 뿐이다. **레이아웃은 동일**하다 — 조건부 분기가 폼 본문에 0건이다. create 전용/edit 전용 page 가 존재하지 않는다 | `/sales/accounts/new` 와 `/sales/accounts/acc-1/edit` 의 DOM 구조를 대조 → 카드 구성·필드 순서·푸터가 동일하고 title·prefill 만 다르면 pass | **pass** |
| IA-13 | IA | 직접 | **충족.** 거래유형 필터와 검색어의 **단일 원천이 URL 쿼리스트링**이다 — `AccountListPage.tsx:89` 이 `useListState({ filterDefaults: { trade: 'all' } })` 를 소비하고, 그 훅이 `useSearchParams` 로 `?trade=`·`?q=` 를 읽고 쓴다(`useListState.ts:87-99,108-129`). 갱신은 `replace: true`(`:125`)라 검색어 한 줄에 history 가 쌓이지 않으면서도 **상세→Back 이 그 URL 을 그대로 복원**한다. 기본값과 같은 값은 URL 에서 지운다(`:115-117`) — 같은 화면이 두 URL 을 갖지 않는다. 손으로 고친 `?trade=거짓말` 은 `parseFilter`(`AccountListPage.tsx:91-95`)가 '전체'로 되돌린다. `commitKeyword` 의 '값이 그대로면 아무것도 하지 않는다' 가드(`useListState.ts:146-152`)가 마운트 직후 커밋이 `page` 를 지우는 사고를 막는다. **`page`·`sort` 는 이 화면에서 소비되지 않는다** — 페이지네이션·정렬 UI 가 없다(IA-04 gap · FS-048-EL-016) | `/sales/accounts` 에서 거래유형='매입처' + 검색='대성' 적용 → URL 이 `?trade=purchase&q=대성` 인지 확인 → 행 클릭으로 수정 폼 진입 → 브라우저 Back. **URL 과 필터가 그대로 복원되면 pass.** 그 URL 을 새 탭에 붙여넣어 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:484-493` + `shared/errors/ErrorBoundary.tsx`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `isUnauthorized(cause)` → `notifySessionExpired()`(`shared/query/queryClient.ts:38,42-43`) → 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·삭제·토글 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 0줄이다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsales%2Faccounts&reason=session_expired` 로 이동하는지 확인. (미저장 입력 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** **충족(상속): read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490-492`) 권한 없는 deep-link 에 403 화면을 렌더하고, 라우트→리소스 파생이 `findCoveringLeaf`(`route-resource.ts:33-36`)라 `/sales/accounts/new`·`/:id/edit` 까지 `/sales/accounts` 잎으로 **정확히 덮인다**. **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan`(`shared/permissions/RequirePermission.tsx`)의 소비처는 **9곳**(정의 파일 + `settings/{site,oauth,languages,api-keys}` + `products/{items,categories,returns}` + `logs/components/LogListShell`)이며 **`pages/sales/**` 가 없다**(grep 확인). 그래서 이 화면의 쓰기 컨트롤 5종이 `can(resource, action)` 을 묻지 않고 무조건 렌더된다: '거래처 등록'(`AccountListPage.tsx:205`) · 행 수정/삭제(`CrudTable.tsx:192-197`) · 일괄 삭제(`CrudListShell.tsx:126`) · 거래 상태 토글(`AccountListPage.tsx:157`) · 폼 제출(`AccountFormPage.tsx:552`). **BE-048 §7.8 이 `operator` 를 조회 전용으로 판정하므로 이 공백은 실제 사용자를 때린다** — `operator` 는 5개 버튼을 전부 보고 누르며, 서버 403 이 '저장하지 못했습니다'(폼) · '변경하지 못했습니다'(토글) · '삭제하지 못했습니다'(다이얼로그)로 뭉개져 **자기가 권한이 없다는 사실을 영영 모른다**. mid-session 강등 reconcile 도 없다 | 권한 스토어에서 `sales/accounts` 의 `update`·`delete`·`create` 를 끈 뒤 `/sales/accounts` 진입. **'거래처 등록'·행 액션·상태 토글이 그대로 보이면 gap.** `read` 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass). `?status=save:403` 으로 저장 → 배너가 권한 문구로 갈리지 않으면 gap | **gap** |
| EXC-04 | EXC | 직접 | **충족(acceptanceCheck 기준) — 단, 잔여 위험을 §4.2 에 남긴다.** ① **유령 저장이 해소됐다** — `accountAdapter` 가 `createCrudAdapter`(`data-source.ts:111`)로 조립돼 `update` 가 없는 id 에 `throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`(`crud.ts:126-128`), `remove` 가 `HttpError(409, '이미 삭제된 항목입니다.')`(`:139-141`)를 던진다. **성공 토스트도 목록 이동도 없다.** ② **conflict 다이얼로그가 배선돼 있다** — `useCrudForm.handleWriteError` 가 `isConflict(cause)` 를 분기해(`useCrudForm.ts:166-178`) `ConflictState` 를 세우고, `AccountFormPage.tsx:558` 이 `<FormConflictDialog conflict={conflict} />` 를 렌더한다. **입력은 그대로 살아 있다** — 다이얼로그가 폼 위에 뜰 뿐 언마운트하지 않으며(`FormFeedback.tsx:51-53`) '이어서 편집'을 고르면 방금 쓰던 내용이 그 자리에 있다. **acceptanceCheck 두 절이 모두 성립한다.** **⚠ 잔여**: 409 는 **'존재 여부' 기반**이지 `version`/`ETag` 토큰이 아니다 — `Account` 에 `version`·`updatedAt` 필드가 **없고**(`types.ts:29-55` 전수) 어댑터가 `If-Match` 를 보내지 않는다. `crud.ts:126` 의 가드는 `items.some(item => item.id === id)` 로 **대상이 있기만 하면 통과**한다 → **둘 다 존재하는 동시 편집은 여전히 last-write-wins 로 조용히 덮인다**(BE-048 §7.1). 이것은 요구 본문의 'token 을 보낸다' 절 미충족이나, **백엔드가 없어 보낼 헤더 자체가 없다** — 계약 요구로 BE-048 §7.11 #1 에 이관했다 | `?status=save:409` 로 `/sales/accounts/acc-1/edit` 에서 저장. **conflict 다이얼로그가 뜨고 입력이 보존되며 성공 토스트·이동이 없으면 pass.** '이어서 편집'을 눌러 입력이 살아 있는지 확인. 유령 저장은 `crud.ts:126-128` 의 존재로 코드 대조 판정 | **pass** |
| EXC-08 | EXC | 직접 | **충족.** 폼 저장에 세 장치가 **전부** 있다: ① **pending disable** — `disabled={saving \|\| loadingDetail}`(`AccountFormPage.tsx:552`) ② **동기 제출 락** — `submitLockRef`(`useCrudForm.ts:103`)를 `onValid` 첫 줄에서 확인·설정하고(`:201-202`) `onSettled`/`onInvalid` 에서 푼다(`:213-215,246-248`). RHF 비동기 검증이 만드는 'disabled 렌더 전' 틈을 ref 가 닫는다 ③ **제출 시도 단위 멱등키** — `idempotencyKeyRef`(`:118-123`)를 **mutationFn 밖**에서 만들어 variables 로 싣고(`:228,235`) `useCrudCreate`/`useCrudUpdate` 가 `WriteContext.idempotencyKey` 로 어댑터에 넘긴다(`crud.ts:288-289,310-311`). 어댑터의 원장이 **적용에 성공한 뒤에만** 키를 기록해(`crud.ts:56-60,114-116`) 실패한 첫 시도가 키를 태워 재시도를 no-op 로 만들지 않는다. 성공하면 키를 버린다(`useCrudForm.ts:220`) — 다음 제출은 새 거래다. **거래처는 여신한도·신용등급을 다루는 금액 인접 폼**이라 이 셋이 전부 필요하다 | `/sales/accounts/new` 를 채우고 '등록'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 1건만 발사되면 pass.** `submitLockRef` 가 `useCrudForm.ts:103` 에 존재하고 이 화면이 그 훅을 소비함(`AccountFormPage.tsx:196`)으로도 코드 대조 판정. **삭제·인라인 토글의 잔여는 §4.2 참조** | **pass** |
| EXC-09 | EXC | 직접 | **충족 — 네 지점 전부.** ① **폼 onError** — `if (isAbort(cause)) return;`(`useCrudForm.ts:162`)이 abort 를 실패로 처리하지 않는다(배너·토스트 없음) ② **폼 onSuccess** — `if (controller.signal.aborted) return;`(`:218`)로 취소된 요청의 성공 콜백이 토스트·이동을 일으키지 않는다 ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:93` · `useCrudRowUpdate.ts:36`)가 이탈 시 진행 중 쓰기를 취소한다 ④ **다이얼로그 close** — `closeDelete` 가 `abort()` + `deleteItem.reset()`(`useCrudList.tsx:87-89`)으로 pending 을 되돌리고, `onSuccess`/`onError` 가 `signal.aborted`/`isAbort` 를 확인한다(`:105,111`). **bulk 도 abort 를 실패 count 에서 제외한다** — `useCrudBulkDelete.onSuccess` 가 `if (signal.aborted) return;`(`crud.ts:352`). 전부 **공유 predicate `isAbort`**(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않았다 | 삭제 다이얼로그에서 '삭제'를 누른 뒤 400ms 안에 Esc. **error toast·배너가 뜨지 않고 버튼 state 가 복원되면 pass.** 폼 저장 중(400ms 창) '목록으로' 클릭 → 성공 토스트도 실패 배너도 뜨지 않아야 한다 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · IA-01 · IA-05 · IA-13 · EXC-04 · EXC-08 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **4** | A11Y-11 · IA-02 · IA-04 · EXC-03 |
| **합계** | **30** | 13 + 11 + 2 + 4 = **30** ✓ |

> **P0 gap 4건 — quality-bar '배치 실패' 사유.** 이 중 **IA-02 · IA-04 · EXC-03** 은 앱 전역의 같은 뿌리(h1 이중 title 모델 · 페이지네이션 미도입 · 쓰기 게이팅 미배선)를 공유하므로 화면 단위가 아니라 **횡단 배치**로 푸는 것이 옳다(§5). 화면 고유의 gap 은 **A11Y-11 하나**이며 그중 절반(`AccountContactsField`)은 이 화면만의 문제다.
>
> **F3b 이후 무엇이 바뀌었는가**: STATE-01 · COMP-10 · IA-13 · EXC-04 · EXC-08 은 **공용 훅 롤아웃으로 화면 코드 0줄로 pass 가 됐다**. 이전 세대 문서(FS-026 등)가 gap 으로 잡던 항목들이다 — 이 화면은 그 롤아웃의 수혜자다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV 내보내기·Pagination range·타임라인·달력)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고, `refreshing`(`useCrudList.tsx:72`)이 가벼운 인디케이터('· 새로고침 중…')만 켠다 — full skeleton·empty flash 없음. `staleTime: 30_000`(`queryClient.ts:47`)이 재조회 시점을 지배한다. **STATE-01 과 같은 뿌리이며 함께 pass 다** | 데이터가 있는 상태의 필터 변경에서 이전 행이 유지되는지 | **pass** |
| STATE-05 | P1 | `CrudTable` 이 공유 `Empty` 에 맥락을 넘겨 3분기한다(`CrudTable.tsx:157-167`), 화면이 `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters` 를 전부 채운다(`AccountListPage.tsx:220-225`). 조사도 `Empty` 가 런타임에 고른다. **다만 `createAction` 을 넘기지 않아** 진짜 빈 상태에서 primary create CTA 가 없다 — 요구의 (a)절 미충족 | 검색 0건 → '조건에 맞는 …' + 검색 지우기. 시드 0건 → **등록 CTA 가 있는지** | **gap(부분 — (a)절만)** |
| STATE-06 | P1 | `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:312-315`), `useCrudCreate`/`useCrudDelete`/`useCrudBulkDelete` 는 목록만 무효화한다(`:290-292,331-333,353`) — 편집한 row 의 상세와 그것에 의존하는 list 만 stale 로 본다. 인라인 토글도 같은 경로다 | 폼에서 신용등급 변경 후 목록 복귀 시 배지가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | 대부분 DS `<Button>` 이다. `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/sales/accounts -r` → **0건**(형제 `sales/consultations` 만 히트). **잔여 2건**: ① 저장 버튼이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨(`AccountFormPage.tsx:553`) ② '목록으로'(`:249-257`)와 '담당자 삭제'(`AccountContactsField.tsx:225-234`)가 `<button className="tds-ui-focusable" style={…}>` 손조립 — 로컬 style object 이지 `buttonStyle()` 은 아니다 | grep 0건은 pass. `loading` prop 미사용과 손조립 2건이 요구의 본문('진행 상태는 loading prop 으로', 'ghost icon 버튼 포함')에 걸린다 | **gap(부분)** |
| COMP-02 | P1 | `CrudTable` 이 `SelectAllHeaderCell`·`RowSelectCell`·`SeqHeaderCell`·`SeqCell` 을 쓴다(`CrudTable.tsx:124-130,173-179`). **raw `<input type=checkbox style={checkboxStyle}>` 선택 셀 손조립 0건.** (`AccountContactsField.tsx:214-221` 의 raw radio 는 **선택 셀이 아니라 대표담당 지정**이라 이 요구의 표면이 아니다) | selectable `*Table.tsx` 에 raw checkbox 선택 마크업이 0인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`AccountListPage.tsx:182`). `grep 'type="search"' apps/admin/src/pages/sales/accounts` → **0건**. 절대 위치 아이콘 재구현도 없다 | grep 0건 | **pass** |
| COMP-04 | P1 | FormField required 8건은 전부 `*` 마커를 렌더한다(`FormField.tsx:96-100`). **미충족 1건**: `AccountContactsField.tsx:161` 이 `<span style={fieldLabelStyle}>담당자 *</span>` 로 **bare label + 리터럴 `*`** 를 그린다 — zod 가 필수로 보는 필드(`validation.ts:71-88`)인데 FormField 를 거치지 않는다. 요구가 지목한 `CreateGroupModal`/`LoginHistoryFilters` 와 같은 패턴이다. 표준 error slot 도 없어 오류를 로컬 `<p role="alert">`(`:251`)로 그린다 | 모든 zod-required 필드가 FormField required 마커를 렌더하는지 | **gap** |
| COMP-05 | P2 | **표면 없음** — 좌측 필터 컨테이너가 아니라 툴바 인라인 select 다. `filterPanelStyle`/`filterNavStyle` 을 소비하지도, 그 값을 로컬 재선언하지도 않는다 | — | **n-a** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3`(`:113`)로 파생된다 — 절반은 충족. 공유 `SkeletonRows(rows, cols)` helper 가 없고, **페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다**(IA-04 gap 과 연동) | `grep "length: 5" shared/crud/CrudTable.tsx` → 0건이어야 한다. 현재 1건 | **gap** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 **RowActions(연필/휴지통)** 다(`CrudTable.tsx:192-197`) — 요구의 (b)절 '인라인 편집 테이블은 RowActions' 에 정확히 부합한다. 중복 '상세' 버튼 없음, ActionMenu 승격 없음(액션 2개). **다만 상태 토글 컬럼이 별도로 있어** 행이 실제로 갖는 액션은 3개다 — 요구의 임계값('3개 이상일 때만 ActionMenu')에 걸릴 수 있으나, 토글은 row-action 컬럼이 아니라 **값 컬럼**이므로 이탈로 보지 않는다 | 읽기전용 리스트에 중복 '상세' 버튼이 없고 편집 테이블이 RowActions 를 쓰는지 | **pass** |
| COMP-09 | P2 | 사업자명(`AccountListPage.tsx:122`)·대표담당 셀에 truncate 가 없다 — `tdStyle` 그대로다. 긴 상호가 열을 넓혀 표 레이아웃을 민다. 미리보기는 `overflowWrap: 'anywhere'`(`AccountBusinessPreview.tsx:64`)로 방어하나 표는 아니다 | 200자 상호 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-11 | P2 → 표면 | **표면 없음** — 이 화면에 기간 필터가 없다. `lastTradeAt` 은 폼의 단일 date 입력이지 목록 필터가 아니다 | — | **n-a** |
| COMP-12 | P2 | 비고 textarea 가 `TextareaField` 의 `N/500` 실시간 카운터를 갖는다(`AccountFormPage.tsx:515` → `TextareaField.tsx:52`). **그러나 상한 근접 경고가 없고, `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다. 상호(60자)·대표자명(40자)은 **카운터조차 없다** — `maxLength` 만 있다 | 500자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert(`CrudListShell.tsx:157` · `AccountFormPage.tsx:226`) · write 성공=toast(`useCrudForm.ts:222` · `useCrudList.tsx:108,146` · `useCrudRowUpdate.ts:49`) · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:112` — toast 가 modal 뒤에 숨지 않는다) · 폼 저장 실패=폼 카드 배너(`FormServerError`). 인라인 토글 실패만 toast.error 인데 **자동 소멸하며 '다시 시도'가 없다** — 요구의 'error toast 는 자동 소멸 없이 다시 시도 포함'에 걸린다. page 가 임의 배너 state 를 갖지 않는다 | 강제 실패 delete 가 다이얼로그 배너로, 토글 실패가 retry 있는 toast 로 뜨는지 | **gap(부분 — 토글 toast 만)** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 양 경로가 배선돼 있다: create/update(`useCrudForm.ts:229,236`) · delete(`useCrudList.tsx:104-113`) · bulk delete(`:136-148`) · 인라인 토글(`useCrudRowUpdate.ts:47-58`). no-op 클릭이 없다 | `?fail=all` 로 각 조작 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 delete 가 delete-intent `ConfirmDialog` 를 연다(`useCrudList.tsx:154-177`) — 단일 미확인 클릭 delete 0건. **undo window·soft-delete 는 없다** — 요구는 confirm **또는** undo 이므로 confirm 쪽으로 충족. **단 `AccountContactsField` 의 '담당자 삭제'(`:230`)는 확인 없이 즉시 지운다** — 폼 로컬 배열 조작이라 저장 전에는 비가역이 아니고(취소로 되돌아간다) 요구의 'delete 경로'로 보지 않는다 | 모든 delete 가 ConfirmDialog 를 여는지 | **pass** |
| A11Y-05 | P1 | `SelectField` 를 4개 쓰나(`account-tax`·`account-trade-type`·`account-credit-grade`·`account-payment-term`) **전부 `z.enum` 이라 `isInvalid` 를 세우는 경로가 없다** — 위반 값이 존재할 수 없다. 요구의 표면(isInvalid 인 SelectField)이 이 화면에 없다 | — | **n-a** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(마우스 전용)이고(`CrudTable.tsx:172`) 사업자명 셀이 링크가 아니다. **키보드 등가물은 RowActions 의 '수정' 버튼**(`:192-197`, 접근 이름이 `nameOf(item)` = 상호 기반)이며 행 클릭과 **같은 목적지**(`onEdit`)다 — 도달 가능하므로 요구의 최소선은 충족한다. FS-026 이 같은 구조를 pass 로 판정한 선례와 일치 | 행을 Tab 해서 같은 목적지를 여는 컨트롤에 도달하는지 | **pass** |
| A11Y-10 | P2 | **표면 없음** — 이 화면에 DS `TextField` 소비가 0건이다. 텍스트 입력을 전부 `FormField` + 네이티브 `<input>` 으로 조립한다. 오류 `<p>` 의 `role="alert"` 는 `FormField.tsx:110` 이 이미 준다 | — | **n-a** |
| A11Y-13 | P1 | **충족.** ① **검증 실패 시 첫 오류 필드 포커스** — `useCrudForm.submit` 이 `form.handleSubmit(onValid, onInvalid)`(`useCrudForm.ts:260`)를 부르고 RHF `shouldFocusError` 기본값이 동작하며, `onInvalid`(`:246-248`)를 명시해 계약으로 고정했다(주석 `:240-245`). ② **폼 진입 시 첫 편집 필드 포커스** — **없다.** 요구는 두 절 모두를 요구한다 | 빈 상호로 '등록' → `activeElement` 가 상호 입력인지(pass). `/sales/accounts/new` 진입 직후 activeElement 가 상호 입력인지 → **body 면 gap** | **gap(부분 — 진입 포커스만)** |
| A11Y-16 | P1 | 대부분 충족: 목록 표가 `aria-busy`·caption(`CrudTable.tsx:116-120`) · **항상 마운트된 polite live region**(`CrudListShell.tsx:107-109`) · 필터 `aria-label` · 오류 `role="alert"` · 토글 `label` · 전 컨트롤 `tds-ui-focusable`. **미충족**: `AccountContactsField` 의 '담당자 삭제' 버튼이 **행을 구분하지 못하는 accessible name**('담당자 삭제' × N — `:234`)을 갖는다. `ContactCell` 은 `<label htmlFor>` 로 옳게 이름을 준다(`:106-107`) | 담당자 3행에서 삭제 버튼 3개의 accessible name 이 서로 다른지 | **gap(부분)** |
| ERP-01 | P1 | status→tone 매핑이 `tradeTypeTone`·`creditGradeTone`(`types.ts:105-117`)이며 목록·미리보기가 **같은 함수**를 소비한다 — per-page meta helper 복제 0건. **다만 그 레지스트리가 `pages/sales/accounts/types.ts` 지역**이라 계약(`contracts/types.ts:84-90` `STATUS_META`)·견적(`quotes/types.ts:113-120` `STATUS_META`)과 통합된 앱 전역 레지스트리가 아니다 — 요구가 지목한 바로 그 상태('tone 선택이 per-page 라 같은 semantic state 가 견적/계약/문의에서 다른 색으로 렌더') | 하나의 export 된 map 이 status→tone 유일 소스인지 | **gap(도메인 내 pass · 전역 gap)** |
| ERP-06 | P1 | 대부분 존댓말 일관이고 숫자가 `formatNumber`/`formatWon` 을 경유한다(`business.ts:45-47`). **미충족**: FS-048-EL-041 의 `'거래처 찾을 수 없습니다.'` · `'거래처 불러오지 못했습니다.'`(`AccountFormPage.tsx:230-231`)에 **목적격 조사가 빠졌다** — 형제 화면은 `'계약을 찾을 수 없습니다.'`(`ContractFormPage.tsx:222`) · `'견적을 찾을 수 없습니다.'`(`QuoteFormPage.tsx:236`)로 조사가 있다. **이 화면만 누락**이다 | 사용자 대상 문자열의 문법을 육안 검토 | **gap** |
| ERP-07 | P2 | **표면 없음(목록)** — 이 화면의 목록에 금액 컬럼이 없다. 여신한도는 폼·미리보기의 배지(`AccountBusinessPreview.tsx:128` `여신 ${formatWon(creditLimit)}`)로만 나오며 우측 정렬 tabular grid 가 아니다 | — | **n-a** |
| ERP-08 | P2 | 건수가 `formatNumber`(`CrudListShell.tsx:119`), 금액이 `formatWon`(`business.ts:45-47` → `formatNumber`)을 경유한다. `lastTradeAt` 은 **이미 'YYYY-MM-DD' 문자열**이라 포맷 함수를 거칠 필요가 없다(`AccountListPage.tsx:150`). 셀의 raw `String()`/`toString()` **0건**. `String(account.creditLimit)`(`AccountFormPage.tsx:171`)은 **폼 값 변환**이지 셀 렌더가 아니다 | 테이블 셀에 raw numeric toString 이 0건인지 | **pass** |
| ERP-09 | P2 | **표면 거의 없음** — 이 화면은 timestamp 를 렌더하지 않는다. `lastTradeAt` 은 달력일 문자열이고 `formatDateTime` 소비가 0건이다. 달력일을 문자열로 다루는 것이 `format.ts` 헤더의 판정 ③('달력일은 문자열로 다룬다 — 중간에 로컬 Date 로 왕복하면 타임존 때문에 하루가 밀린다')과 정확히 일치한다 | UTC ISO 입력이 러너 타임존과 무관하게 같은 wall-clock 을 렌더하는지 | **pass** |
| ERP-12 | P1 | **엑셀 내보내기가 없다.** 거래처 원장은 세무·오프라인 검토의 대표 대상인데 툴바에 export affordance 가 0건이다 | 필터된 결과 전체가 한글 header + UTF-8 BOM 으로 나오는지 | **gap** |
| ERP-13 | P1 | **충족.** 이 화면의 templated copy 가 전부 `shared/format` 의 조사 헬퍼를 경유한다: 인라인 토글 토스트 `'${item.name}'${objectParticle(item.name)} 거래중으로…`(`AccountListPage.tsx:166`) · 삭제 토스트·확인 문구(`useCrudList.tsx:108,158`) · 저장 토스트(`useCrudForm.ts:222`) · 검증 문구(`shared/crud/validation.ts:22,25` — `objectParticle`/`topicParticle`) · `Empty` 의 3분기 copy. **리터럴 `이(가)`/`을(를)`/`은(는)` 0건**(grep 확인). ERP-06 의 조사 **누락**(문구에 조사가 아예 없다)은 폴백형 출하가 아니므로 이 요구가 아니라 ERP-06 사안이다 | `grep -E "이\(가\)\|을\(를\)\|은\(는\)" apps/admin/src/pages/sales/accounts` → 0건 | **pass** |
| ERP-14 | P1 | **반쪽이다.** 충족: 사업자등록번호가 **실시간 하이픈 마스킹**(`AccountFormPage.tsx:316-318` — 키 입력마다 `formatBizNo`) + **국세청 체크섬 인라인 검증**(`business.ts:29-42`) + `inputMode="numeric"`. 요구가 예시로 든 '사업자등록번호 형식이 올바르지 않습니다' 를 정확히 구현한다. **미충족**: ① **금액(여신한도)** — 천단위 구분이 없고 `'1,234,000원'` 붙여넣기를 `/^\d+$/` 가 **거절**한다(요구는 그것을 1234000 으로 parse 하라고 한다) ② **전화번호**(대표전화 · 담당자 연락처) — 마스킹·검증·normalize 가 전무하다 ③ 사업자번호 붙여넣기가 10자리를 넘으면 **초과분이 조용히 잘린다**(`business.ts:13` `.slice(0, 10)`) — normalize 가 아니라 유실이다 | 금액 필드에 '1,234,000원' 붙여넣기 → 1234000 으로 parse 되는지. biz-no 가 하이픈 자동 삽입 + malformed 인라인 flag 하는지(pass) | **gap(부분)** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`CrudTable.tsx:171`) — cap·virtualization 이 없다. 거래처는 상한 없이 늘어나는 원장이다(BE-048 §7.9). 10컬럼 표에 **가로 scroll 컨테이너도 없다** — `CrudListShell` 의 `columnStyle` 은 `minWidth: 0` 만 준다(`:20-25`). 검색은 디바운스가 있어 키 입력당 전량 스캔이 250ms 로 묶인다 | 1,000건 픽스처로 scroll/selection 이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 취소·토글 재발사에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. **부분 충족**: 폼 상세 조회가 **404 vs 5xx 를 정확히 가른다**(`useCrudForm.ts:144-149` → `AccountFormPage.tsx:229-237`) — 요구의 404 절을 유일하게 충족하는 경로다. **미충족**: 목록 실패(`CrudListShell.tsx:159`)·저장 실패(`FormServerError`)·삭제 실패(`useCrudList.tsx:112`)·토글 실패(`useCrudRowUpdate.ts:53`)가 **403·429·500·504 를 같은 문구로 뭉갠다**. 409 만 별도 표면(`FormConflictDialog`)을 갖는다 | `?status=save:403` vs `save:429` vs `save:500` — 전부 같은 배너면 gap | **gap(부분)** |
| EXC-07 | P1 | **경로는 완비, 발현이 막혀 있다.** `useCrudForm.handleWriteError` 가 `isUnprocessable(cause) && cause.violations.length > 0` 이면 `setError(violation.field, …)` 로 필드에 꽂고 `setFocus(first.field)` 로 포커스를 옮긴다(`useCrudForm.ts:182-192`) — 요구의 모든 절을 구현한다. **그러나 `dev.ts:84` 의 `?status=save:422` 는 `violations` 없는 `HttpError` 를 던져** 이 분기를 타지 못하고 배너로 떨어진다. 백엔드가 붙어 `error.fields` → `violations` 변환이 배선돼야 발현된다(BE-048 §6.1 #5) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지. **현재 재현 수단이 없다** | **gap(발현 불가)** |
| EXC-10 | P1 | `useCrudBulkDelete` 가 `settleAll`(`crud.ts:349-350`)로 allSettled semantics 를 쓰고 **실패 건수**를 반환한다. 전건 성공에만 invalidate·selection clear(`useCrudList.tsx:144-147` · `crud.ts:353`). **미충족**: 실패 **id 를 반환하지 않아** '실패 item 만 retry' 가 불가능하고, 실패 시 선택이 유지되지만 어느 행이 실패했는지 화면이 모른다. 재클릭이 **전체를 재실행**한다(성공분 재요청 → 그것들은 '이미 삭제됨' 409 로 다시 실패 count 에 든다 — BE-048 §7.5) | 부분 실패 bulk delete 가 실패 item 만 재요청하는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** `useCrudForm` 이 `isNotFound(loadError)` 로 `'not-found'`/`'error'` 를 가르고(`useCrudForm.ts:144-149`), 화면이 **404 → '목록으로'만 · 5xx → '다시 시도' + '목록으로'** 로 갈라 그린다(`AccountFormPage.tsx:229-240`). 근본 전제인 '어댑터가 `HttpError(404)` 를 던진다'가 **이미 충족**돼 있다(`crud.ts:105-107`) — BE-026 이 이관했던 그 요구가 이 화면에서는 성립한다. 무한 spinner 도 없다(`loadingDetail` 이 `data === undefined` 기준) | 없는 `:id`(`/sales/accounts/nope/edit`)로 진입 → '거래처 찾을 수 없습니다' + '목록으로'(retry 없음). `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 폼 저장·삭제·**인라인 토글**이 전부 비관적이다(`useCrudRowUpdate` 는 plain mutate + pendingId — `useCrudRowUpdate.ts:44-59`). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다**. un-rolled-back optimistic write 0건. (요구의 근거문이 지적하는 'banner/logo-list 는 full optimistic 인데 useCrudRowUpdate 는 pessimistic 이라 비일관' 은 **`useCrudRowUpdate` 소유 문서의 사안**이다) | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-15 | P1 | **표면 없음** — 이 화면에 파일 업로드가 0건이다. 거래처는 사업자등록증 사본을 첨부하지 않는다 | — | **n-a** |
| EXC-18 | P1 | selection scope 가 **'현재 보이는 결과'** 로 암묵 정의된다 — `toggleAll` 이 `visibleItems.map(id)` 만 받는다(`CrudListShell.tsx:143-148`). **미충족**: ① scope 라벨·'전체 N건 선택됨' 배너가 없다 ② Shift-click 범위 선택·keyboard 등가물이 없다 ③ 임계값 초과 강화 confirm·type-to-confirm 이 없다 — 확인 문구가 count 를 말하지만(`useCrudList.tsx:170`) 알아차리게 강제하지 않는다 ④ 장기 bulk 의 progress·cancel 이 없다 | Shift-click 가 범위를 선택하는지, 대량 bulk 가 progress 를 보고하는지 | **gap** |
| EXC-20 | P1 | **충족.** `FormServerError` 가 `errorReference` 를 받아 `오류 코드 <ref>` 를 **복사 가능하게**(`userSelect: 'all'` + tabular-nums) 그린다(`FormFeedback.tsx:13-23,44`). `useCrudForm` 이 `referenceOf(cause)`(`useCrudForm.ts:195`)로 그것을 채우고 화면이 넘긴다(`AccountFormPage.tsx:267`). **raw 서버 body/stack/status 를 산문으로 쓰지 않는다** — 고정 문구 + 코드뿐(`FormFeedback.tsx:31-36` 이 그 판정을 적었다). **단 목록·삭제·토글 실패에는 reference 가 없다** — 폼 경로만 완비다 | `?status=save:500` → 배너에 복사 가능한 reference code 가 보이는지 | **pass(폼) · gap(목록·삭제·토글)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-048 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 저장 p95 | ≤ 700ms | 위와 동일 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient.ts:47,59,67` 이 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 검색 입력당 연산 | 0 요청 · 커밋당 전량 1스캔 | **충족** — 클라이언트 필터이고 디바운스 250ms 가 커밋 횟수를 묶는다(COMP-10 pass). 자모마다 스캔하지 않는다 |
| 폼 리렌더 | 입력당 1회 | **미충족 — 미리보기가 `watch()` 를 11개 부른다**(`AccountFormPage.tsx:527-537`). 어느 필드를 쳐도 폼 전체가 리렌더된다. 필드가 20개인 폼에서 체감 가능한 비용이다 |
| 저장 요청 크기 | ≤ 8KB | **상한이 없다.** `AccountInput` 이 담당자 배열 전체(최대 8명 × 6필드)를 싣고, `bizType`·`address`·`note` 등 자유 텍스트에 길이 제약이 없다(BE-048 §7.6). 다만 담당자 8명 상한이 있어 **무한 증가는 아니다** — FS-026 의 타임라인과 다르다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 거래처는 상한 없이 증가(BE-048 §7.9) |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). `_shared/business.ts` 는 견적(FS-050)과 공유 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). 툴바는 남아 조건이 화면에서 사라지지 않는다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) — 어댑터가 `HttpError(404)` 를 던지기 때문이다 |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| 대상이 먼저 삭제됨 | 유령 저장 없이 conflict 다이얼로그 | **충족**(EXC-04 pass — `crud.ts:126-128`) |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — 조용히 덮는다.** `version`/`If-Match` 가 없어 409 가 발생하지 않는다(BE-048 §7.1). **이 화면 최대 위험** — 여신한도·신용등급이 조용히 되돌려질 수 있다 |
| **담당자 동시 편집** | B 가 추가한 담당자가 A 의 저장에 유실되지 않는다 | **미충족** — 배열 전체 치환 PUT 이다(BE-048 §7.2). `version` 이 이것도 함께 해소한다 |
| **중복 제출 — 폼** | 연타가 1요청 | **충족**(EXC-08 pass — `submitLockRef` + 멱등키) |
| **중복 제출 — 삭제 확인·인라인 토글** | 연타가 1요청 | **부분 충족(잔여).** 삭제 확인은 `disabled={busy}` + `aria-busy`(`ConfirmDialog.tsx:151-152`)뿐이고 **동기 락·멱등키가 없다**(`useCrudList.tsx:102` 가 키를 싣지 않는다). 인라인 토글도 `disabled={pendingId === item.id}` 뿐이다. **두 조작 모두 값이 멱등**이라(같은 id 삭제 / 같은 `active` 값) 두 번 나가도 최종 상태가 같고, 토글은 `run` 이 이전 요청을 abort 한다(`useCrudRowUpdate.ts:39`). **그러나 서버 감사 로그는 두 줄이 된다.** 프레임워크의 명시적 판정이다(`crud.ts:32-41`) — EXC-08 의 pass 를 뒤집지는 않으나 기록해 둔다 |
| 세션 만료 중 입력 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19 P1 · FS-048 §7 #24) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484-493`) |
| 일괄 삭제 부분 실패 | 실패 행만 재시도 | **미충족**(EXC-10 gap). 게다가 레이트리밋(BE-048 §5 EP-05 분당 60)에 자기가 걸린다 — 100건 선택 = 100요청 |

### 4.3 원장 무결성

거래처 원장은 **계약·견적의 금액 결정 근거**다(여신한도·신용등급·결제조건). quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 사업자등록번호는 유일하다 | **미충족.** 어떤 유일성 제약도 없다 — 같은 사업자번호의 거래처를 몇 개든 만들 수 있고, 그러면 **여신한도가 쪼개져 실효 한도가 배가 된다**(BE-048 §7.3) |
| 사업자등록번호는 서버가 재검증한다 | **미충족.** 체크섬이 **클라이언트에만** 있다(`business.ts:29-42`). API 를 직접 때리면 아무 문자열이나 저장된다(BE-048 §7.3) |
| 담당자 id 는 충돌하지 않는다 | **미충족.** `ct-new-${Date.now()}-${난수 0~1000}`(`AccountContactsField.tsx:86`) — 난수 공간 **1,001**. 같은 ms 의 두 추가가 충돌하면 `patch` 가 **두 행을 동시에 고친다**(BE-048 §7.2) |
| 대표담당은 정확히 1명이다 | **미충족.** UI 규칙일 뿐 스키마가 강제하지 않는다(`validation.ts:14-22` 에 `primary` 판정 없음). 0명이 되면 `primaryContact` 가 `contacts[0]` 으로 말없이 떨어져 **목록·견적서가 엉뚱한 담당자를 보인다**(BE-048 §7.2) |
| 최근거래일·신용등급은 사실이다 | **미충족 — 구조적으로.** 둘 다 **사람이 손으로 넣는 값**이고 거래 이력에서 파생되지 않는다. `lastTradeAt` 은 검증이 `z.string()` 뿐이라 미래 날짜도 통과한다(BE-048 §7.6). 원장의 신뢰가 입력자의 성실성에 걸린다 |
| 여신한도에 상한이 있다 | **미충족.** `/^\d+$/` 만 보므로 20자리도 통과하고 `Number()` 가 안전 정수 범위를 넘으면 값이 뭉개진다(BE-048 §7.6) |
| 삭제가 계약·견적을 고아로 만들지 않는다 | **미충족 — 판정 불가.** 계약·견적이 거래처를 **이름 문자열**로만 참조한다(`contracts/types.ts:16-17` 의 주석이 자백한다). 서버가 `ACCOUNT_IN_USE` 를 알 수 없다(BE-048 §7.7) |
| 사업자정보가 XSS 를 실어 나르지 않는다 | **미정** — 관리자 화면은 텍스트 노드라 안전하나, 견적서(`QuotePreview.tsx:215-222`)가 이 값을 문서로 렌더하고 quality-bar ERP-10(`specs/quality-bar.md:468`, P2)이 **PDF(react-pdf)** 를 로드맵에 올려 두었다. 서버 저장 시 정제가 필요하다(BE-048 §7.10). ⚠ **로드맵 인용이지 예정된 도입이 아니다** — 기준일 `a5c2639` 확인: **react-pdf 는 저장소에 없고**(package.json·import·lockfile 전부 0건) **print 토큰도 없다**(`grep -i print tokens/` = 0건). **도입 시점·선후 관계를 기술한 파일을 찾지 못했다 — 미정.** 그 일정과 무관하게 이 축의 판정은 '미정' 이다 — **서버가 정제하지 않는 한 어느 렌더러로 나가든 안전이 보장되지 않기 때문**이며, 그것이 저장 시점 정제를 요구하는 이유다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | A11Y-11 · COMP-04 · A11Y-16 | P0 · P1 | **`AccountContactsField` 가 `FormField` 밖 손조립** — `<span>담당자 *</span>` 의 `*` 가 리터럴이고 담당자 입력에 `aria-required` 가 없다. 오류 `<p role="alert">` 가 어떤 입력과도 `aria-describedby` 로 연결되지 않는다. 삭제 버튼의 accessible name 이 행을 구분하지 못한다 | **이 화면 고유** | UI 기획 쪽 변경 요청 |
| 2 | A11Y-11 | P0 | **`FormField` 의 hint 가 valid 일 때 `hintIdOf` 로 연결되지 않는다**(여신한도 '0 이면 미설정') — 힌트가 AT 에 영원히 닿지 않는다. **호출부 배선 문제**이며 세 영업 화면(048·049·050)에 공통이다 | 이 화면 + 형제 2곳 | UI 기획 쪽 변경 요청 |
| 3 | IA-02 | P0 | 폼이 자체 `<h1>` 을 그리고 AppHeader 도 `<h1>` 을 그린다 → **`<h1>` 2개**. 목록에는 in-content h1 이 없어 title 소스 모델이 모순. **`findCoveringLeaf` 수렴으로 가지 라벨 폴백은 해소됐다** — 사유가 바뀌었다 | **앱 전역**(`AppHeader`·`FormPageShell`·개별 폼 12곳) | 프론트 구현 · UI 기획 |
| 4 | IA-04 · ERP-15 · COMP-06 · COMP-07 | P0 · P1 · P2 | **페이지네이션 없음 — 전량 렌더.** 거래처는 상한 없이 늘어난다. 연쇄: `clampPage` 미소비(STATE-04 (a)절 표면 부재) · 스켈레톤 `length: 5` 의 기준값 부재 · `SeqCell` 오프셋 잠재 결함 · 가로 scroll 컨테이너 부재 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-048 §7.9 · §7.11 #12) |
| 5 | EXC-03 | P0 | **write 액션 게이팅 미배선** — `useRouteWritePermissions` 소비처 9곳에 `pages/sales/**` 없음. BE-048 §7.8 이 `operator` 를 조회 전용으로 판정하므로 **실제 사용자를 때린다**. read 게이팅은 pass | **앱 전역** | UI 기획 쪽 변경 요청 |
| 6 | (§4.2 · BE-048 §7.1) | — | **동시 편집이 last-write-wins 로 조용히 덮는다** — `Account.version` 부재. 409 는 '존재 여부' 기반이라 **유령 저장만** 막는다. 프론트는 `FormConflictDialog` 가 이미 배선돼 있어 **서버가 409 를 주기만 하면 복구 경로가 열린다** | 계약 + 어댑터 | **백엔드 명세 (BE-048 §7.11 #1 — 최우선)** |
| 7 | (§4.3 · BE-048 §7.2) | — | **담당자 무결성** — 클라이언트 id 채번(난수 공간 1,001) · 배열 전체 치환 lost update · 대표담당 1명 미강제 | 계약 + 이 화면 | 백엔드 명세 · UI 기획 |
| 8 | (§4.3 · BE-048 §7.3) | — | **사업자등록번호 서버 미검증 + 중복 허용** — 체크섬이 클라이언트에만 있고 유일성 제약이 없어 여신한도가 쪼개진다. 중복은 409 가 아니라 **422 + `error.fields[bizNo]`** 로 내려야 한다(409 는 등록 폼에서 불러올 최신본이 없는 '최신 내용 불러오기'를 권한다) | 계약 + 어댑터 | 백엔드 명세 · UI 기획 |
| 9 | ERP-06 | P1 | **`'거래처 찾을 수 없습니다.'` 에 목적격 조사 누락** — 형제 화면(049·050)은 조사가 있다. **이 화면만 누락**이다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 10 | ERP-14 | P1 | **입력 마스킹 반쪽** — 사업자번호는 완비(하이픈 + 체크섬), **여신한도**는 천단위 구분 없고 `'1,234,000원'` 붙여넣기를 거절, **전화번호**는 마스킹·검증 전무. 사업자번호 10자리 초과 붙여넣기가 조용히 잘린다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 11 | ERP-01 | P1 | status→tone 레지스트리가 `pages/sales/accounts` **지역** — 계약·견적과 통합된 앱 전역 레지스트리가 아니다 | 영업 3화면 공통 | UI 기획 · 아키텍처 |
| 12 | EXC-06 · EXC-07 | P1 | 목록·저장·삭제·토글 실패가 status 로 분기하지 않는다(404 분기만 pass). 422 필드 매핑은 **경로가 완비돼 있으나 `dev.ts:84` 가 `violations` 없는 `HttpError` 를 던져 발현되지 않는다** | 이 화면 + `dev.ts` + BE | UI 기획 · 백엔드 명세 |
| 13 | EXC-10 · EXC-18 | P1 | 일괄 삭제가 실패 id 를 모른다 · Shift-click 범위 선택 없음 · 진행률·취소 없음 · 강화 confirm 없음. **레이트리밋에 자기가 걸린다**(100건 = 100요청) | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-048 §7.5) |
| 14 | A11Y-13 | P1 | 폼 진입 시 첫 편집 필드 자동 포커스 없음(검증 실패 시 첫 오류 포커스는 pass) | 이 화면 | UI 기획 쪽 변경 요청 |
| 15 | COMP-01 · FEEDBACK-01 | P1 | 저장 버튼이 `loading` prop 대신 손으로 쓴 '저장 중…' · '목록으로'/'담당자 삭제'가 손조립 `<button>` · 인라인 토글 실패 toast 에 '다시 시도'가 없고 자동 소멸한다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 16 | STATE-05 | P1 | 빈 상태의 **(a) 진짜 비어있음 분기에 create CTA 가 없다** — `empty.createAction` 미전달. 3분기 copy·복구 액션은 pass | 이 화면 | UI 기획 쪽 변경 요청 |
| 17 | ERP-12 | P1 | 엑셀 내보내기 부재 — 거래처 원장은 세무·오프라인 검토의 대표 대상 | 이 화면 + 공유 export 유틸 | UI 기획 · 백엔드 명세 |
| 18 | COMP-09 · COMP-12 | P2 | 사업자명 셀 truncate 없음 · 상한 근접 경고 없음 · 상호/대표자명에 카운터 없음 · counting 기준 미정의 | 이 화면 | UI 기획 (#4 와 함께) |
| 19 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | 프론트 구현 · UI 기획 |
| 20 | (§4.1) | — | **미리보기가 `watch()` 11개를 부른다** — 어느 필드를 쳐도 폼 전체가 리렌더된다 | 이 화면 | UI 기획 |
| 21 | (§4.3 · BE-048 §7.6) | — | **`lastTradeAt`·`creditGrade` 가 사람이 손으로 넣는 값**이고 `lastTradeAt` 은 달력일 실재 검증조차 없다. `creditLimit` 에 상한이 없다. 자유 텍스트 5종에 길이 제약이 없다 | 계약 + 도메인 경계 | 아키텍처 · 백엔드 명세 |
| 22 | (§4.3 · BE-048 §7.7) | — | **계약·견적이 거래처를 이름 문자열로 참조**해 삭제가 고아를 만들고 `ACCOUNT_IN_USE` 를 판정할 수 없다. **BE-049 §7.5 · BE-050 §7.6 과 공동 판정** | 영업 3화면 공통 계약 | **백엔드 명세** |
| 23 | (§4.2) | — | 삭제 확인·인라인 토글에 **동기 락·멱등키가 없다** — 값이 멱등이라 최종 상태는 같으나 **감사 로그가 두 줄**이 된다. 프레임워크의 명시적 판정(`crud.ts:32-41`) | 프레임워크 | 백엔드 명세 (기록만) |
| 24 | (BE-048 §7.10) | — | 사업자정보·담당자 저장 시 XSS 정제 — 견적서 PDF(ERP-10)가 React 이스케이프를 상속하지 않는다 | 계약 | 백엔드 명세 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`accountAdapter` 는 `scope: 'sales-accounts'`(`data-source.ts:112`)로 `failIfRequested(spec.scope, op)` 를 부른다. `createCrudAdapter` 가 부르는 **op 는 4개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=sales-accounts:list` · `?fail=all` |
| `detail` | `fetchOne` (`crud.ts:101`) | `?fail=detail` · `?fail=sales-accounts:detail` · `?fail=all` |
| `save` | `create`(`crud.ts:112`) · `update`(`:120`) | `?fail=save` · `?fail=sales-accounts:save` · `?fail=all` |
| `delete` | `remove` (`crud.ts:135`) | `?fail=delete` · `?fail=sales-accounts:delete` · `?fail=all` |

- **`save` 는 등록·수정·인라인 토글을 한꺼번에 실패시킨다** — 셋이 같은 `update`/`create` 를 탄다. 토글만 실패시킬 방법이 없다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 `?delay=` 가 아니라 **필터 변경 · `staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 + 입력 보존이면 pass**(현재 pass) |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-06 (status별 surface) | `?status=save:403` · `save:429` · `save:500` — 전부 같은 배너면 gap(현재 gap) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fsales%2Faccounts&reason=session_expired` 로 가면 pass |
| EXC-07 (422 필드 매핑) | `?status=save:422` — **`dev.ts:84` 가 `violations` 없는 `HttpError` 를 던져 재현 불가**. 배너로 떨어지는 것이 현재의 정상 |
| EXC-20 (reference code) | `?status=save:500` — 배너에 '오류 코드 …' 가 보이면 pass(현재 pass) |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · A11Y-11 · A11Y-12 · ERP-13 판정) · RTL(A11Y-11 의 `aria-required` 주입·describedby↔alert id 일치) · `accounts.test.ts`(사업자번호 체크섬·필터·검색·정렬·대표담당·폼 검증 순수 규칙 회귀 — **이 화면에 컴포넌트 테스트는 없다**) · `shared/crud/crud.test.ts`(어댑터 409/404 계약) · `useListState.test.tsx`·`useDebouncedSearch.test.tsx`(IA-13 · COMP-10 의 회귀 방어선).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서(STATE-01,02,04 · TOKEN-01..05 · COMP-10 · FEEDBACK-02,04,06 · A11Y-01,02,11,12 · MOTION-01,02,03 · IA-01,02,04,05,13 · EXC-01,02,03,04,08,09)로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재)
- [x] §2.1 산수 검산 — 13 pass + 11 종속 + 2 n-a + 4 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·타임라인·달력·기간필터)은 `n-a` 로 사유만 남기거나 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`sales-accounts`)와 op 4종을 **어댑터 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] 'E2E 미실행 — 판정 근거는 코드 대조 · 기준일 2026-07-17 · `HEAD = a5c2639`' 를 §1 과 §6 에 명시했다
- [x] **EXC-04 를 pass 로 판정하되 409 가 '존재 여부' 기반임을 흐리지 않았다** — 동시 편집 last-write-wins 를 §2·§4.2·§5 #6 에 세 번 못 박았다
- [x] §5 의 gap 이 FS-048 §7 · BE-048 §7.11 과 일치한다
</content>
