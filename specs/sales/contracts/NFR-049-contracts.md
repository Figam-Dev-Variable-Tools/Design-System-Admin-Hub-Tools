---
id: NFR-049
title: "계약 비기능 명세"
functionalSpec: FS-049
backendSpec: BE-049
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-049. 계약 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-049 계약 (`/sales/contracts` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-049(요소·예외) · BE-049(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-049 §7 · BE-049 §7.10 과 번호가 일치해야 한다 |
| 판정 근거 | **E2E 미실행 — 판정 근거는 `HEAD = a5c2639` 코드 대조다**(§6). 기준일 2026-07-17 |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음 — 이 화면의 P0 30건 판정은 하나도 뒤집히지 않았다.** 다만 두 갈래로 근거가 갱신됐다: ① **`종속` 3건(MOTION-01·02·03)의 낡은 근거를 교체**했다 — PR #26 이 오버레이 모션을 CSS-only 로 구현했고 `ToggleSwitch.css:79-84` 에 reduced-motion 게이트를 신설했다(§2) ② **⚠ 유효성 축의 *동작* 이 바뀌었다**(PR #28 · `5e86a3c`) — 계약기간이 이전에는 `2026-02-31` 을 통과시켰으나 정본 `isCalendarDate` 로 수렴해 **이제 거절한다**(`validation.ts:59` ×2 · 회귀 `contracts.test.ts:133`). **P0 판정에 걸리는 축이 아니라 FS-049 §4 유효성 칸의 내용이 바뀐 것**이다 |

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

**목록 + 2열 미리보기 폼(등록/수정)** 이다. 세 라우트가 두 컴포넌트로 해석된다(`App.tsx:244-246`). **읽기 전용 상세가 없다** — 행 클릭이 곧 편집이다. 형제 화면(FS-048 거래처 · FS-050 견적)과 **골격이 같고** 세 지점에서 갈린다:

- **목록에 인라인 쓰기가 없다.** `ContractListPage.tsx` 에 `useCrudRowUpdate` 소비가 0건이다 — 거래처(상태 토글)·견적(수주 전환)과 달리 목록의 유일한 쓰기가 삭제다. 그래서 BE-048 §7.11 #6 이 남긴 '인라인 토글의 409 가 일반 토스트로 뭉개진다' 문제가 **여기에는 없다**.
- **DS 몰리큘 둘을 더 쓴다** — `DateRangeField`(계약 기간)와 `ImageGalleryField`(계약서 첨부). 전자는 A11Y-11 의 **위험을 스스로 막고**(자기 입력에 `required`+`aria-required` 를 준다 — `DateRangeField.tsx:48`), 후자는 **알려진 빚의 소재**다(§4.3).
- **금액과 기간이 동시에 있다** — 계약금액(원)·부가세 기준·계약 기간이 한 폼에 있어 ERP-07·ERP-14 의 표면이 넓다.

폼은 **`FormPageShell` 을 쓰지 않는다**(우측 미리보기 때문에 골격을 손으로 만든 10개 폼 중 하나 — quality-bar IA-12 P2). 그러나 `useCrudForm` + `FormServerError` + `FormConflictDialog` 라는 **계약 조각은 공유**하므로 EXC-04·EXC-08·EXC-12·EXC-20 이 '어떤 폼이냐'에 따라 갈리지 않는다(`FormFeedback.tsx:1-6`).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 목록이 `useCrudList` 를 소비하고(`ContractListPage.tsx:90-95`) 그 훅이 `firstLoading = isFetching && data === undefined`(`useCrudList.tsx:71`)와 `refreshing = isFetching && data !== undefined`(`:72`)를 **분리해** 파생한다. `CrudListShell` 이 `firstLoading` 만 `CrudTable.loading` 으로 넘겨(`CrudListShell.tsx:138`) 스켈레톤을 최초 로드에 가두고, 요약은 재조회 때 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다(`:118-122`). `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:254`)가 이전 행을 캐시에 유지한다. 네 상태가 배타적이다: 스켈레톤 → `Empty`(0행) → 행 → error 배너(`CrudListShell.tsx:113,156`). **폼도 같다** — `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:136`) | `/sales/contracts` 진입 → 3행 렌더 확인 → 상태 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 3건'이 사라지면 gap.** `?fail=list` 로 error 배너만, 검색 0건에서 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** ① 목록 read 실패 → `<Alert tone="danger">계약 목록을 불러오지 못했습니다.</Alert>` + '다시 시도'(`refetch`) 인라인(`CrudListShell.tsx:157-164`). empty 로 폴백하지 않는다(`:113` 이 표 자체를 대체). ② 폼 상세 read 실패 → 인라인 danger Alert + **`loadFailure` 로 갈린 복구**(`ContractFormPage.tsx:215-237`): `'error'` 면 '다시 시도'(`retryLoad`) + '목록으로', `'not-found'` 면 '목록으로'만. **read 실패에 error toast 를 쓰는 경로가 0건이다** — 이 화면은 인라인 쓰기가 없어 `toast.error` 소비가 **아예 없다** | `?fail=list` → 목록에 danger Alert + '다시 시도'. `?status=detail:500` 으로 `/sales/contracts/ct-1/edit` → Alert + '다시 시도' + '목록으로'. **error toast 가 뜨면 gap** | **pass** |
| STATE-04 | STATE | 직접 | **충족(단, (a)절은 표면 부재).** **(b) 선택 해제** — `ContractListPage.tsx:101-103` 이 `useEffect(() => clear(), [filter, keyword, clear])` 로 상태 필터·검색어가 바뀔 때마다 선택을 전부 해제한다. 선택은 `useCrudList`(=`useRowSelection`)가 쥐고 있으므로 화면이 조건 변화를 그 선택에 이어 준다. **(a) page clamp** — **걸릴 표면이 없다**: 페이지네이션이 없어(`CrudTable.tsx:171` 전량 렌더 · `<Pagination` grep = 0) `useListState.clampPage`(`useListState.ts:217-223`)가 소비되지 않는다. 페이지네이션 부재 자체는 **IA-04 가 gap 으로 잡는다** — 이 절의 표면 부재가 그것을 면제하지 않는다. **형제 대조**: `QuoteListPage` 에는 이 `useEffect` 가 없어 같은 요구가 gap 이다(NFR-050 §2) — 이 화면은 거래처(FS-048)와 함께 옳은 쪽이다 | `/sales/contracts` 에서 행 2건 체크 → '전체 3건 선택됨' 확인 → 상태를 '진행중'으로 변경. **SelectionBar 가 사라지고 요약의 '선택됨'이 지워지면 pass.** 검색어 입력으로도 동일 | **pass** |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. 파생 치수는 `calc(var(--tds-space-6) * 5)`(`ContractListPage.tsx:59`) · `minmax(calc(var(--tds-space-6) * 13), 1fr)`(`ContractFormPage.tsx:85`) 처럼 space 토큰 배수로만 표현한다. border 는 `var(--tds-border-width-thin)`(`ContractSummaryPreview.tsx:20`) — 키워드가 아니다 | `grep -rnE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/sales/contracts apps/admin/src/pages/sales/_shared` → **0건이어야 한다. 실측 0건.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`ContractFormPage.tsx:243,273,296,320,344,406`) · DS `<Button>`·`<SelectField>`·`<SearchField>`·`<TextareaField>`·`<ToggleSwitch>`·`<DateRangeField>`·`<ImageGalleryField>`. **이 화면이 `:focus-visible` outline 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148`) · Toast · DS `<Button>`·`<ToggleSwitch>` transition · `ImageGalleryField` 드롭존 hover(`ImageGalleryField.css`). **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`ContractFormPage.tsx:261,330,380,438,460,474`) · Toast · 삭제/충돌/이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | **충족.** 폼 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ContractFormPage.tsx:252`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. 미리보기의 계약명도 `--tds-typography-title-md-*` 를 참조한다(`ContractSummaryPreview.tsx:26-32`). **목록에는 in-content `<h1>` 이 없다** — 그 모순은 IA-02 가 다룬다 | `/sales/contracts/new` 의 '계약 등록' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족.** `ContractListPage.tsx:138-145` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 공용 `useDebouncedSearch` 를 소비한다(`useListState.ts:227-230` 경유). 그 훅이 세 절을 전부 구현한다: ① **조합 중 커밋 금지** — `if (composing) return;`(`useDebouncedSearch.ts:87`) ② **조합 중 Enter 차단** — `event.nativeEvent.isComposing \|\| composingRef.current` 두 신호를 함께 보고 `stopPropagation`(`:121-124`) ③ **디바운스 250ms**(`:23,93-95`) + 최소 길이 정책(`:91`). **stale 응답 경합은 구조적으로 없다** — 검색이 클라이언트 필터(`searchContracts`)이고 커밋 값은 URL·`useMemo` 를 통해서만 반영된다 | `/sales/contracts` 검색창에 IME 로 '유지보수' 입력. **조합 중 '유지보ㅅ' 로 표가 깜빡이면 gap.** 조합 중 Enter 가 폼을 제출하지 않는지, 완성 250ms 뒤 URL 이 `?q=유지보수` 한 번만 바뀌는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | 이 화면의 파괴적/비가역 표면 **3종이 전부 `ConfirmDialog` 로 게이트된다**: ① 단건 삭제(`useCrudList.tsx:154-165` — `intent="delete"`) ② 일괄 삭제(`:166-177`) ③ discard intent — 미저장 이탈 가드(`ContractFormPage.tsx:204` → `useUnsavedChangesDialog`). busy 잠금(`disabled={busy}` + `aria-busy` + '처리 중…' — `packages/ui/.../ConfirmDialog.tsx:151-155`) · 실패 시 다이얼로그 유지 + error 배너(`useCrudList.tsx:112`) · 취소/Esc/dim 이 in-flight 를 abort(`:87`)는 전부 **DS + `useCrudList` 가 소유**한다 | DS `ConfirmDialog` · `useCrudList` 판정에 종속. 이 화면에서는 `?fail=delete` 로 삭제 실패 시 다이얼로그가 배너와 함께 유지되고 재클릭이 재시도되는지만 확인 | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `ContractFormPage.tsx:204` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `isDirty` 는 **RHF `formState.isDirty`** 그 자체다(`useCrudForm.ts:261`). 3경로(beforeunload · 앱 내 링크 capture 가로채기 · popstate sentinel)는 훅이 소유하며 `_self`·수식키·가운데 클릭 edge case 도 훅이 처리한다. **`setValue(…, { shouldDirty: true })` 를 전 비-register 필드에 준다**(`:359,373-374,388,443,453,465`) — 토글·DateRangeField·갤러리·textarea 변경이 전부 dirty 를 세운다. 저장 성공 시 `navigate(listPath, { replace: true })`(`useCrudForm.ts:223`)로 떠나므로 가드가 걸릴 자리가 없다 | `/sales/contracts/ct-1/edit` 에서 계약금액을 고친 뒤 ① 탭 닫기 ② 사이드바 '견적' 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 부가세 토글만 눌러도(register 아님) 뜨는지 확인. **주의**: '목록으로'(EL-018)·'취소'(EL-037)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 **이 요구의 gap 이 아니다**(FS-049 §7 #4 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 계약 폼은 modal 이 아니라 전용 라우트(`/new`·`/:id/edit`)의 2열 카드로 렌더된다. modal 3종(삭제 확인 · 충돌 다이얼로그 · 이탈 가드)은 **전부 입력 필드가 없는 확인 다이얼로그**다. 이탈 가드는 그 자신이 FEEDBACK-04 의 산물이고, 충돌 다이얼로그는 폼을 언마운트하지 않으므로(`FormFeedback.tsx:51-53`) '입력을 파괴하는 close' 자체가 성립하지 않는다. quality-bar IA-06 의 무게 규칙상 계약은 rich 엔티티라 route 가 옳다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 3종: 폼 저장 성공(`useCrudForm.ts:222`) · 단건 삭제 성공(`useCrudList.tsx:108`) · 일괄 삭제 성공(`:146`). **인라인 쓰기가 없어 거래처(4종)보다 하나 적다.** 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 텍스트만 주입한다. (별개로 목록에는 `CrudListShell` 이 소유한 **항상 마운트된** `aria-live="polite"` 리전이 있다 — `CrudListShell.tsx:107-109`. A11Y-16 의 산물이며 toast 와 무관하다) | ToastProvider 판정에 종속. 이 화면에서는 저장·삭제 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 3종(FEEDBACK-02 와 같은 노드). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 — 앱 어댑터(`shared/ui/ConfirmDialog.tsx:43`)는 `onCancel` 만 감싸고 나머지를 위임한다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 `'<계약명>'을(를) 삭제합니다…` message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **미충족 — 2건.** **충족된 절**: ① `aria-invalid` 3건(`ContractFormPage.tsx:278,300,348`)이 **전부 `aria-describedby={errorIdOf(...)}` 와 짝**이다(`:279-281,301-303,349-351`) — 짝 없는 `aria-invalid` 0건, id 는 `FormField` 가 렌더하는 `<p id={errorIdOf(htmlFor)} role="alert">`(`FormField.tsx:110`)와 일치 ② **required 6건 전수 확인** — `contract-title`·`contract-account`·`contract-amount` 의 자식이 `<input>`, `contract-type`·`contract-status`·`contract-sign` 의 자식이 `SelectField` 라 **6/6 이 `aria-required` 주입 대상**이다(`FormField.tsx:36-41,50-56`). 래퍼 `div`/`span` 자식이 **0건** ③ **`DateRangeField required` 는 컴포넌트가 스스로 처리한다** — `requiredProps = { required: true, 'aria-required': true }` 를 **두 입력 각각에** 스프레드하고(`DateRangeField.tsx:48,70,88`) `invalidProps` 도 `aria-invalid`+`aria-describedby` 를 **짝으로만** 세운다(`:45`). **FS-037(예약)의 '이용 시간' 이 래퍼 `<div>` 자식이라 주입되지 않은 그 패턴이 이 화면에는 없다** — DS 몰리큘이 그 함정을 스스로 막았다. **미충족 2건**: ① **`renewNoticeDays`(EL-030)의 오류가 `aria-invalid` 없이 테두리 색으로만 인코딩된다** — `controlStyle(errors.renewNoticeDays !== undefined)`(`:407`)로 붉어지지만 그 입력에 `aria-invalid`·`aria-describedby` 가 **없다**(`:402-411` 전수). `FormField` 가 `<p id="contract-renew-notice-error" role="alert">` 를 렌더하므로 **오류 자체는 announce 되나 어느 필드의 것인지 연결되지 않는다** ② **hint 가 valid 일 때 연결되지 않는다** — 같은 필드의 `hint="만료 N일 전 통지"`(`:400`)를 `FormField` 가 `<p id={hintIdOf('contract-renew-notice')}>`(`FormField.tsx:115`)로 렌더하는데 입력이 그것을 `aria-describedby` 로 가리키지 않는다 → **힌트가 AT 에 영원히 닿지 않는다** | `grep -n "aria-invalid" apps/admin/src/pages/sales/contracts -r` → 3건, 각 히트마다 `aria-describedby` 가 있는지(**현재 3/3 pass**). RTL 로 `/sales/contracts/new` 렌더 → `getByLabelText('계약 기간 시작일')` 의 `aria-required === 'true'` assert(pass). 자동갱신 ON + 통지기한에 '한달' 입력 후 제출 → 그 입력의 `aria-invalid` assert → **null 이면 gap**. 같은 입력의 `aria-describedby` 가 힌트 `<p>` id 를 가리키는지 → **undefined 면 gap** | **gap** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<SelectField>` 1개**다(`ContractListPage.tsx:147-158`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, `pages/sales/contracts` 전체에 **`aria-current` grep = 0**. 좌측 필터 패널(`filterPanelStyle`/`filterNavStyle`)도 소비하지 않는다 — 툴바 인라인 select 다 | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 3종: 삭제 확인 · 충돌 다이얼로그 · 이탈 가드 `ConfirmDialog`. enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21,30-33` → keyframes `:126-144`) + dialog scale(`:58-59,35-38` → `:146-168`, exit 는 `forwards`) · reduced-motion 게이트 `:173-180` · `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **Motion/framer-motion 은 여전히 미도입**(`packages/ui/src` 소비 0건)이나 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성했다 — **'라이브러리가 없으니 소유 문서에서 gap 일 것' 이라는 이전 배치의 추정은 더 이상 성립하지 않는다.** 잔여: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`:27-31`) — 이 화면의 다이얼로그는 footer 가 주 닫기 수단이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 여전히 이 문서의 몫이 아니다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 3종(A11Y-01 과 같은 노드). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **PR #26 에서 구현됐다** — `.tds-toast--exiting`(`Toast.css:32-37`, `tds-toast-out … forwards` + `pointer-events:none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족**(`component.overlay.exit-duration` = `{motion.duration.fast}` 150ms · `exit-easing` = `{motion.easing.accelerate}` — `tokens/tokens.json:1298-1307`). exit 완료 후 unmount 는 `onAnimationEnd` 대조로 달성. reduced-motion 게이트 `Toast.css:136-141` | DS Toast 판정에 종속(이 화면은 텍스트만 주입한다) | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스 · Toast · Modal · DS `<Button>` · **`<ToggleSwitch>` handle transform ×2**(부가세·자동갱신 — quality-bar MOTION-03 이 명시 지목한 그 컴포넌트다) · `ImageGalleryField` 드롭존 상태 전환. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **`ToggleSwitch.css` 의 reduced-motion 게이트가 이번 기준(PR #26)에서 신설됐다** — `:79-84` `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }` 가 남은 transition 2건(`:32` `background-color` · `:56` `transform`)을 **둘 다 끈다** → 손잡이가 즉시 최종 위치로 스냅한다. 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향이고, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다. **이전 배치가 적은 'reduced-motion off 누락' 은 해소됐다.** 나머지 표면도 각자 게이트를 갖는다 — Modal `Modal.css:173-180` · Toast `Toast.css:136-141` · 스켈레톤 `shared/ui/ui.css:110-114` | 전역 motion config·`ToggleSwitch.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인하고, 재현은 `prefers-reduced-motion: reduce` 로 부가세·자동갱신 토글을 눌러 **손잡이가 즉시 점프하는지** 본다 | **종속** |
| IA-01 | IA | 직접 | **충족.** 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:244-246`). **어느 화면도 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위가 `CrudListShell` 의 평범한 `<div style={columnStyle}>`(`CrudListShell.tsx:98`), 폼의 최상위가 `<div style={pageStyle}>`(`ContractFormPage.tsx:240`)다 | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족 — 사유가 바뀌었다.** **해소된 것**: `findCoveringLeaf`(`nav-config.ts:270-278`) 수렴으로 `/sales/contracts/new` 가 **'자기를 감싸는 가장 긴 잎'** = `/sales/contracts` → **'계약'** 으로 풀린다(`:297-299`). 예전처럼 가지 라벨 '영업 관리'로 떨어지지 않는다. **여전히 gap 인 것**: ① **`<h1>` 이 2개다** — AppHeader 가 `<h1 style={titleStyle}>{findNavLabel(pathname)}</h1>`(`AppHeader.tsx:101`)로 '계약'을 그리고, **폼이 자기 `<h1>`(`ContractFormPage.tsx:252`)** 으로 '계약 등록'/'계약 수정'을 또 그린다 ② **'등록/수정' 행위가 AppHeader 제목에 반영되지 않는다** — `nav-config.ts:294-296` 이 그것을 **의도로** 못박는다. 그래서 요구가 예시로 든 '공지 등록' 형태의 가시 primary title 이 성립하지 않는다 ③ **목록에는 in-content `<h1>` 이 없다** — title 소스가 화면 타입마다 다르다. 요구의 본문이 지적하는 바로 그 상태다 | `/sales/contracts/new` 진입 → `document.querySelectorAll('h1').length === 2` 이면 gap. AppHeader 의 가시 `<h1>` 이 '계약'(‘계약 등록’ 아님)이면 gap. `/sales/contracts` 는 in-content h1 이 0개임을 대조 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** **충족**: 툴바 좌측에 검색·필터, **우상단에 primary '계약 등록'**(`ContractListPage.tsx:161-164`) → 결과 count 요약(`CrudListShell.tsx:118-122`) → SelectionBar(`:125-133`) → table(`:135`) 순서가 요구한 템플릿 그대로다. **미충족: Pagination 이 없다.** `CrudTable.tsx:171` 의 `items.map(...)` 이 `visibleItems` **전량**을 렌더하며 `<Pagination` 이 이 화면에 0건이다(앱 전체 소비자 11파일에 `pages/sales/**` 없음 — grep 확인). 계약은 **해마다 쌓이는 컬렉션**이라 'page size 초과 가능'이 확실하다(BE-049 §7.6). 연쇄: `useListState` 의 `page`·`clampPage` 미소비(STATE-04 (a)절의 표면 부재가 여기서 온다) · `SeqCell seq={index + 1}`(`CrudTable.tsx:179`)이 페이징 도입 시 2페이지에서 1로 리셋 | 시드를 30건 이상으로 늘리고 `/sales/contracts` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | 직접 | **충족.** `/sales/contracts/new` 와 `/sales/contracts/:id/edit` 가 **같은 `ContractFormPage` 컴포넌트로 해석된다**(`App.tsx:245-246`). 구분은 `useCrudForm` 의 `isEdit = id !== undefined`(`useCrudForm.ts:75`) 하나이며, 그 값이 지배하는 것은 **title(`ContractFormPage.tsx:252`) · 제출 라벨(`:502`) · prefill(`detailQuery` → `reset(toValues(loaded))` — `useCrudForm.ts:131-134`) · 토스트 동사(`:229,236`)** 뿐이다. **레이아웃은 동일**하다 — 폼 본문의 유일한 조건부는 `autoRenew && <통지기한>`(`:395`)인데 그것은 **`isEdit` 이 아니라 폼 값**에 달렸다. create 전용/edit 전용 page 가 없다 | `/sales/contracts/new` 와 `/sales/contracts/ct-1/edit` 의 DOM 구조를 대조 → 카드 구성·필드 순서·푸터가 동일하고 title·prefill 만 다르면 pass | **pass** |
| IA-13 | IA | 직접 | **충족.** 상태 필터와 검색어의 **단일 원천이 URL 쿼리스트링**이다 — `ContractListPage.tsx:80` 이 `useListState({ filterDefaults: { status: 'all' } })` 를 소비하고, 그 훅이 `useSearchParams` 로 `?status=`·`?q=` 를 읽고 쓴다(`useListState.ts:87-99,108-129`). `replace: true`(`:125`)라 검색어 한 줄에 history 가 쌓이지 않으면서도 **상세→Back 이 그 URL 을 그대로 복원**한다. 기본값과 같은 값은 URL 에서 지운다(`:115-117`). 손으로 고친 `?status=거짓말` 은 `parseFilter`(`ContractListPage.tsx:82-86`)가 '전체'로 되돌린다. **`page`·`sort` 는 소비되지 않는다** — 페이지네이션·정렬 UI 가 없다(IA-04 gap · FS-049-EL-016). **⚠ 주의**: 이 화면의 필터 파라미터 이름이 `?status=` 라 **개발용 실패 스위치 `?status=<op>:<code>`(`dev.ts:24`)와 이름이 겹친다** — `?status=active` 는 스위치가 `code === undefined` 로 무시하므로(`dev.ts:63`) 무해하나, `?status=save:409` 는 `parseFilter` 가 '전체'로 되돌려 **필터가 조용히 초기화된다**. IA-13 의 gap 은 아니나(요구는 필터의 URL 직렬화이지 이름 충돌이 아니다) FS-049 §7 #11 로 이관했다 | `/sales/contracts` 에서 상태='진행중' + 검색='SaaS' 적용 → URL 이 `?status=active&q=SaaS` 인지 확인 → 행 클릭으로 수정 폼 진입 → 브라우저 Back. **URL 과 필터가 그대로 복원되면 pass.** 그 URL 을 새 탭에 붙여넣어 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:484-493` + `shared/errors/ErrorBoundary.tsx`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `isUnauthorized(cause)` → `notifySessionExpired()`(`shared/query/queryClient.ts:38,42-43`) → 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·삭제 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 0줄이다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsales%2Fcontracts&reason=session_expired` 로 이동하는지 확인. (미저장 입력 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** **충족(상속): read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490-492`) 권한 없는 deep-link 에 403 화면을 렌더하고, 라우트→리소스 파생이 `findCoveringLeaf`(`route-resource.ts:33-36`)라 `/sales/contracts/new`·`/:id/edit` 까지 `/sales/contracts` 잎으로 **정확히 덮인다**. **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan`(`shared/permissions/RequirePermission.tsx`)의 소비처는 **9곳**(정의 파일 + `settings/{site,oauth,languages,api-keys}` + `products/{items,categories,returns}` + `logs/components/LogListShell`)이며 **`pages/sales/**` 가 없다**(grep 확인). 그래서 이 화면의 쓰기 컨트롤 4종이 `can(resource, action)` 을 묻지 않고 무조건 렌더된다: '계약 등록'(`ContractListPage.tsx:161`) · 행 수정/삭제(`CrudTable.tsx:192-197`) · 일괄 삭제(`CrudListShell.tsx:126`) · 폼 제출(`ContractFormPage.tsx:501`). **BE-049 §7.8 이 `operator` 를 조회 전용으로 판정하므로 이 공백은 실제 사용자를 때린다** — `operator` 는 4개 버튼을 전부 보고 누르며, 서버 403 이 '저장하지 못했습니다'(폼) · '삭제하지 못했습니다'(다이얼로그)로 뭉개져 **자기가 권한이 없다는 사실을 영영 모른다**. mid-session 강등 reconcile 도 없다 | 권한 스토어에서 `sales/contracts` 의 `update`·`delete`·`create` 를 끈 뒤 `/sales/contracts` 진입. **'계약 등록'·행 액션이 그대로 보이면 gap.** `read` 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass). `?status=save:403` 으로 저장 → 배너가 권한 문구로 갈리지 않으면 gap | **gap** |
| EXC-04 | EXC | 직접 | **충족(acceptanceCheck 기준) — 단, 잔여 위험을 §4.2 에 남긴다.** ① **유령 저장이 해소됐다** — `contractAdapter` 가 `createCrudAdapter`(`data-source.ts:69`)로 조립돼 `update` 가 없는 id 에 `throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`(`crud.ts:126-128`), `remove` 가 `HttpError(409, '이미 삭제된 항목입니다.')`(`:139-141`)를 던진다. **성공 토스트도 목록 이동도 없다.** ② **conflict 다이얼로그가 배선돼 있다** — `useCrudForm.handleWriteError` 가 `isConflict(cause)` 를 분기해(`useCrudForm.ts:166-178`) `ConflictState` 를 세우고, `ContractFormPage.tsx:507` 이 `<FormConflictDialog conflict={conflict} />` 를 렌더한다. **입력은 그대로 살아 있다** — 다이얼로그가 폼 위에 뜰 뿐 언마운트하지 않으며(`FormFeedback.tsx:51-53`) '이어서 편집'을 고르면 방금 쓰던 내용이 그 자리에 있다. **acceptanceCheck 두 절이 모두 성립한다.** **⚠ 잔여**: 409 는 **'존재 여부' 기반**이지 `version`/`ETag` 토큰이 아니다 — `Contract` 에 `version`·`updatedAt` 필드가 **없고**(`types.ts:13-36` 전수) 어댑터가 `If-Match` 를 보내지 않는다. `crud.ts:126` 의 가드는 `items.some(item => item.id === id)` 로 **대상이 있기만 하면 통과**한다 → **둘 다 존재하는 동시 편집은 여전히 last-write-wins 로 조용히 덮인다**(BE-049 §7.1). **이 도메인에서는 계약금액과 첨부가 함께 덮인다** — 거래처(FS-048)보다 직접적인 금전 효과다. 요구 본문의 'token 을 보낸다' 절 미충족이나 **백엔드가 없어 보낼 헤더 자체가 없다** — 계약 요구로 BE-049 §7.10 #1 에 이관했다 | `?status=save:409` 로 `/sales/contracts/ct-1/edit` 에서 저장. **conflict 다이얼로그가 뜨고 입력이 보존되며 성공 토스트·이동이 없으면 pass.** '이어서 편집'을 눌러 입력이 살아 있는지 확인. 유령 저장은 `crud.ts:126-128` 의 존재로 코드 대조 판정 | **pass** |
| EXC-08 | EXC | 직접 | **충족.** 폼 저장에 세 장치가 **전부** 있다: ① **pending disable** — `disabled={saving \|\| loadingDetail}`(`ContractFormPage.tsx:501`) ② **동기 제출 락** — `submitLockRef`(`useCrudForm.ts:103`)를 `onValid` 첫 줄에서 확인·설정하고(`:201-202`) `onSettled`/`onInvalid` 에서 푼다(`:213-215,246-248`). RHF 비동기 검증이 만드는 'disabled 렌더 전' 틈을 ref 가 닫는다 ③ **제출 시도 단위 멱등키** — `idempotencyKeyRef`(`:118-123`)를 **mutationFn 밖**에서 만들어 variables 로 싣고(`:228,235`) `useCrudCreate`/`useCrudUpdate` 가 `WriteContext.idempotencyKey` 로 어댑터에 넘긴다(`crud.ts:288-289,310-311`). 어댑터의 원장이 **적용에 성공한 뒤에만** 키를 기록해(`crud.ts:56-60,114-116`) 실패한 첫 시도가 키를 태워 재시도를 no-op 로 만들지 않는다. 성공하면 키를 버린다(`useCrudForm.ts:220`). **계약은 금액 폼**이라 요구가 '금액/생성/발송 작업 필수'로 지목한 바로 그 대상이며 셋이 전부 필요하다 | `/sales/contracts/new` 를 채우고 '등록'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 1건만 발사되면 pass.** `submitLockRef` 가 `useCrudForm.ts:103` 에 존재하고 이 화면이 그 훅을 소비함(`ContractFormPage.tsx:186`)으로도 코드 대조 판정. **삭제의 잔여는 §4.2 참조** | **pass** |
| EXC-09 | EXC | 직접 | **충족 — 네 지점 전부.** ① **폼 onError** — `if (isAbort(cause)) return;`(`useCrudForm.ts:162`)이 abort 를 실패로 처리하지 않는다(배너·토스트 없음) ② **폼 onSuccess** — `if (controller.signal.aborted) return;`(`:218`)로 취소된 요청의 성공 콜백이 토스트·이동을 일으키지 않는다 ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:93`)가 이탈 시 진행 중 저장을 취소한다 ④ **다이얼로그 close** — `closeDelete` 가 `abort()` + `deleteItem.reset()`(`useCrudList.tsx:87-89`)으로 pending 을 되돌리고, `onSuccess`/`onError` 가 `signal.aborted`/`isAbort` 를 확인한다(`:105,111`). **bulk 도 abort 를 실패 count 에서 제외한다** — `useCrudBulkDelete.onSuccess` 가 `if (signal.aborted) return;`(`crud.ts:352`). 전부 **공유 predicate `isAbort`**(`shared/async.ts`)를 쓴다 | 삭제 다이얼로그에서 '삭제'를 누른 뒤 400ms 안에 Esc. **error toast·배너가 뜨지 않고 버튼 state 가 복원되면 pass.** 폼 저장 중(400ms 창) '목록으로' 클릭 → 성공 토스트도 실패 배너도 뜨지 않아야 한다 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · IA-01 · IA-05 · IA-13 · EXC-04 · EXC-08 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **4** | A11Y-11 · IA-02 · IA-04 · EXC-03 |
| **합계** | **30** | 13 + 11 + 2 + 4 = **30** ✓ |

> **P0 gap 4건 — quality-bar '배치 실패' 사유.** **IA-02 · IA-04 · EXC-03** 은 앱 전역의 같은 뿌리(h1 이중 title 모델 · 페이지네이션 미도입 · 쓰기 게이팅 미배선)를 공유하므로 **횡단 배치**로 푸는 것이 옳다(§5). 화면 고유의 gap 은 **A11Y-11 하나**이며 그 소재는 **조건부 필드 `renewNoticeDays` 한 곳**이다 — 거래처(FS-048)의 A11Y-11 gap 이 동적 배열 필드였던 것과 다르다.
>
> **P0 판정이 거래처(NFR-048)와 완전히 같다** — 두 화면이 같은 프레임워크 조각을 같은 방식으로 소비하기 때문이다. 그것이 `shared/crud` 승격의 목적이고, 이 일치가 그 목적이 달성됐다는 증거다.
>
> **F3b 이후 무엇이 바뀌었는가**: STATE-01 · COMP-10 · IA-13 · EXC-04 · EXC-08 은 **공용 훅 롤아웃으로 화면 코드 0줄로 pass 가 됐다**. 이전 세대 문서(FS-026 등)가 gap 으로 잡던 항목들이다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·CSV 내보내기·Pagination range·타임라인·좌측 필터 패널)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고, `refreshing`(`useCrudList.tsx:72`)이 가벼운 인디케이터만 켠다 — full skeleton·empty flash 없음. `staleTime: 30_000`(`queryClient.ts:47`)이 재조회 시점을 지배한다. **STATE-01 과 같은 뿌리이며 함께 pass** | 데이터가 있는 상태의 필터 변경에서 이전 행이 유지되는지 | **pass** |
| STATE-05 | P1 | `CrudTable` 이 공유 `Empty` 에 맥락을 넘겨 3분기한다(`CrudTable.tsx:157-167`), 화면이 `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters` 를 전부 채운다(`ContractListPage.tsx:176-181`). 조사도 `Empty` 가 런타임에 고른다. **다만 `createAction` 을 넘기지 않아** 진짜 빈 상태에서 primary create CTA 가 없다 — 요구의 (a)절 미충족 | 검색 0건 → '조건에 맞는 …' + 검색 지우기. 시드 0건 → **등록 CTA 가 있는지** | **gap(부분 — (a)절만)** |
| STATE-06 | P1 | `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:312-315`), `useCrudCreate`/`useCrudDelete`/`useCrudBulkDelete` 는 목록만 무효화한다(`:290-292,331-333,353`) | 폼에서 계약 상태 변경 후 목록 복귀 시 배지가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | 대부분 DS `<Button>` 이다. `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/sales/contracts -r` → **0건**. **잔여 2건**: ① 저장 버튼이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨(`ContractFormPage.tsx:502`) ② '목록으로'(`:241-249`)가 `<button className="tds-ui-focusable" style={backLinkStyle}>` 손조립 — 로컬 style object 이지 `buttonStyle()` 은 아니다 | grep 0건은 pass. `loading` prop 미사용이 요구의 본문('진행 상태는 loading prop 으로')에 걸린다 | **gap(부분)** |
| COMP-02 | P1 | `CrudTable` 이 `SelectAllHeaderCell`·`RowSelectCell`·`SeqHeaderCell`·`SeqCell` 을 쓴다(`CrudTable.tsx:124-130,173-179`). **raw checkbox 선택 셀 손조립 0건.** 이 화면에는 raw radio 도 없다(거래처의 `AccountContactsField` 와 다르다) | selectable `*Table.tsx` 에 raw checkbox 선택 마크업이 0인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`ContractListPage.tsx:138`). `grep 'type="search"' apps/admin/src/pages/sales/contracts` → **0건** | grep 0건 | **pass** |
| COMP-04 | P1 | **충족.** 모든 zod-required 필드가 `FormField required`(마커 `*` — `FormField.tsx:96-100`) 또는 `DateRangeField required`(자체 마커 — `DateRangeField.tsx:57`)를 거친다. **bare `<label style={fieldLabelStyle}>` 로 그린 required 필드가 0건**이다 — 부가세(`ContractFormPage.tsx:356`)·자동갱신(`:385`)이 bare label 이나 **둘 다 필수가 아니고 boolean 이라 위반 값이 없다**. 거래처(FS-048)의 `AccountContactsField` 같은 손조립 required 그룹이 이 화면에는 **없다** | 모든 zod-required 필드가 FormField/DateRangeField 마커를 렌더하는지 | **pass** |
| COMP-05 | P2 | **표면 없음** — 좌측 필터 컨테이너가 아니라 툴바 인라인 select 다 | — | **n-a** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3`(`:113`)로 파생된다. 공유 `SkeletonRows(rows, cols)` helper 가 없고, **페이지네이션이 없어 'row 수 === PAGE_SIZE' 기준값 자체가 없다**(IA-04 gap 과 연동) | `grep "length: 5" shared/crud/CrudTable.tsx` → 0건이어야 한다. 현재 1건 | **gap** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 **RowActions(연필/휴지통)** 다(`CrudTable.tsx:192-197`) — 요구의 (b)절 '인라인 편집 테이블은 RowActions' 에 정확히 부합한다. 중복 '상세' 버튼 없음, ActionMenu 승격 없음(액션 2개). **이 화면은 값 컬럼에도 액션이 없어**(거래처의 상태 토글과 다르다) 요구에 정확히 맞는다 | 읽기전용 리스트에 중복 '상세' 버튼이 없고 편집 테이블이 RowActions 를 쓰는지 | **pass** |
| COMP-09 | P2 | 계약명(`ContractListPage.tsx:111`)·거래처(`:112`) 셀에 truncate 가 없다 — `tdStyle` 그대로다. 긴 계약명이 열을 넓혀 표 레이아웃을 민다. 미리보기는 `overflowWrap: 'anywhere'`(`ContractSummaryPreview.tsx:50`)로 방어하나 표는 아니다 | 200자 계약명 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-11 | P1 | **표면 부분 실재.** 이 화면에 **목록 기간 필터가 없다**(요구의 주 대상) — 상태 필터 하나뿐이다. 그러나 **폼의 `DateRangeField`(계약 기간)** 가 요구의 절반을 만족한다: 단일 DS 날짜 범위 컴포넌트 · `start ≤ end` 를 **인라인 검증 메시지**로 강제(`validation.ts:72-79` → `ContractFormPage.tsx:376`) — 요구가 금지한 'silent empty' 가 아니다. **미충족**: preset('오늘/최근 7일/이번 달/지난 달')이 없고, 이 값은 폼 필드라 URL list-state 대상이 아니다(그 절은 목록 필터용) | 종료일<시작일 시 특정 검증 에러가 뜨는지(pass). preset 이 범위를 채우는지(gap) | **gap(부분 — preset 만)** |
| COMP-12 | P2 | 조항 요약 textarea 가 `TextareaField` 의 `N/1000` 실시간 카운터를 갖고(`ContractFormPage.tsx:444` → `TextareaField.tsx:52`) 비고도 `N/500`(`:466`). **그러나 상한 근접 경고가 없고, `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다. 계약명(80자)은 **카운터 없이 `maxLength` 만**, **거래처는 `maxLength` 조차 없어** 61자를 치면 제출 시점에야 안다(스키마 60자 — `validation.ts:19`) | 1000자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | **충족.** 배치가 규칙과 정확히 일치한다: read 실패=인라인 Alert(`CrudListShell.tsx:157` · `ContractFormPage.tsx:218`) · write 성공=toast(`useCrudForm.ts:222` · `useCrudList.tsx:108,146`) · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:112` — toast 가 modal 뒤에 숨지 않는다) · 폼 저장 실패=폼 카드 배너(`FormServerError`) · 첨부 파일 거절=그 필드의 로컬 `<p role="alert">`(`ImageGalleryField.tsx:300`). **이 화면은 인라인 쓰기가 없어 `toast.error` 소비가 0건**이다 — 거래처(FS-048)가 '자동 소멸 + retry 없는 error toast' 로 부분 gap 인 것과 달리 **이 화면에는 그 표면 자체가 없다.** page 가 임의 배너 state 를 갖지 않는다 | 강제 실패 delete 가 다이얼로그 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 양 경로가 배선돼 있다: create/update(`useCrudForm.ts:229,236`) · delete(`useCrudList.tsx:104-113`) · bulk delete(`:136-148`). no-op 클릭이 없다 | `?fail=all` 로 각 조작 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 delete 가 delete-intent `ConfirmDialog` 를 연다(`useCrudList.tsx:154-177`) — 단일 미확인 클릭 delete 0건. undo window·soft-delete 는 없으나 요구는 confirm **또는** undo 이므로 confirm 쪽으로 충족. **⚠ 그러나 이 화면의 실제 위험은 다른 데 있다** — 확인 문구가 계약 **상태를 언급하지 않아** 서명완료·진행중 계약도 초안과 같은 무게로 지워진다(FS-049 §7 #19 · BE-049 §7.5). 요구의 '비가역성 고지'는 형식상 있으나 **고가치 record 에 대한 grace window 가 없다** | 모든 delete 가 ConfirmDialog 를 여는지 | **pass(단 §4.3 참조)** |
| A11Y-05 | P1 | `SelectField` 를 3개 쓰나(`contract-type`·`contract-status`·`contract-sign`) **전부 `z.enum` 이라 `isInvalid` 를 세우는 경로가 없다** — 위반 값이 존재할 수 없다. 요구의 표면(isInvalid 인 SelectField)이 이 화면에 없다. **BE-049 §7.3 의 `INVALID_STATUS_TRANSITION` 422 가 배선되면 `status` select 에 서버 오류가 꽂히므로 이 판정을 다시 매겨야 한다** | — | **n-a(현재)** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(마우스 전용)이고(`CrudTable.tsx:172`) 계약명 셀이 링크가 아니다. **키보드 등가물은 RowActions 의 '수정' 버튼**(`:192-197`, 접근 이름이 `nameOf(item)` = 계약명 기반)이며 행 클릭과 **같은 목적지**(`onEdit`)다 — 도달 가능하므로 요구의 최소선은 충족한다. FS-026 이 같은 구조를 pass 로 판정한 선례와 일치 | 행을 Tab 해서 같은 목적지를 여는 컨트롤에 도달하는지 | **pass** |
| A11Y-10 | P2 | **표면 없음** — 이 화면에 DS `TextField` 소비가 0건이다. 텍스트 입력을 전부 `FormField` + 네이티브 `<input>` 으로 조립한다. 오류 `<p>` 의 `role="alert"` 는 `FormField.tsx:110`·`DateRangeField.tsx:95`·`ImageGalleryField.tsx:300` 이 이미 준다 | — | **n-a** |
| A11Y-13 | P1 | **부분 충족.** ① **검증 실패 시 첫 오류 필드 포커스** — `useCrudForm.submit` 이 `form.handleSubmit(onValid, onInvalid)`(`useCrudForm.ts:260`)를 부르고 RHF `shouldFocusError` 기본값이 동작하며, `onInvalid`(`:246-248`)를 명시해 계약으로 고정했다(주석 `:240-245`). ② **폼 진입 시 첫 편집 필드 포커스** — **없다**. **⚠ 이 화면 고유 위험**: `setValue` 로 관리되는 필드(`startAt`·`endAt`·`attachments`·`terms`·토글)는 **RHF 가 ref 를 갖지 않아 `setFocus` 가 닿지 않는다** — 기간 오류(`startAt` 경로)로 제출이 막히면 포커스가 어디로도 가지 않을 수 있다 | 빈 계약명으로 '등록' → `activeElement` 가 계약명 입력인지(pass). **빈 기간으로 '등록' → `activeElement` 가 시작일 입력인지 → body 면 gap.** `/sales/contracts/new` 진입 직후 activeElement 가 계약명 입력인지 → body 면 gap | **gap(부분)** |
| A11Y-16 | P1 | **충족.** 목록 표가 `aria-busy`·caption(`CrudTable.tsx:116-120`) · **항상 마운트된 polite live region**(`CrudListShell.tsx:107-109`) · 필터 `aria-label` · 오류 `role="alert"`(3 컴포넌트 전부) · 토글 `label` · 전 컨트롤 `tds-ui-focusable`. **`ImageGalleryField` 의 제거 버튼이 `'N번째 이미지 제거'` 로 행을 구분한다**(`ImageGalleryField.tsx:259`) — 거래처의 '담당자 삭제' × N 문제가 여기에는 없다. `DateRangeField` 가 각 칸에 시각 숨김 `<label>`('계약 기간 시작일'/'… 종료일')을 준다(`:61-63,79-81`). **미충족 없음** — 단 A11Y-11 의 `renewNoticeDays` 색상 전용 오류 인코딩이 요구의 '이중(비색상) state 인코딩' 절에도 걸린다(A11Y-11 에서 이미 gap 으로 셌으므로 여기서 중복 계상하지 않는다) | 첨부 3장에서 제거 버튼 3개의 accessible name 이 서로 다른지 | **pass** |
| ERP-01 | P1 | status→tone 매핑이 **단일 레지스트리**다 — `STATUS_META`(`types.ts:84-90`) + `contractStatusMeta`(`:92-94`) + `signStatusTone`(`:96-101`). 목록·미리보기가 **같은 함수**를 소비한다(`ContractListPage.tsx:124` · `ContractSummaryPreview.tsx:85,95`) — per-page meta helper 복제 0건. **다만 그 레지스트리가 `pages/sales/contracts/types.ts` 지역**이라 거래처(`accounts/types.ts:105-117`)·견적(`quotes/types.ts:113-120` — **같은 이름 `STATUS_META` 의 다른 객체**)과 통합된 앱 전역 레지스트리가 아니다. **요구가 지목한 `quoteStatusMeta` 가 형제 화면이다.** 게다가 **'만료'와 '초안'이 같은 neutral** 이라 같은 톤이 서로 다른 semantic 을 덮는다(FS-049 §7 #15) | 하나의 export 된 map 이 status→tone 유일 소스인지 | **gap(도메인 내 pass · 전역 gap)** |
| ERP-04 | P1 | **sortable column header 가 없다.** 정렬이 `sortContracts`(`types.ts:140-145`)의 **시작일 내림차순 고정**이며 header 가 평범한 `<th>`(`CrudTable.tsx:131-135`)다 — clickable·`aria-sort`·방향 인디케이터·keyboard 조작 전부 없다. **이 화면에서 그것이 특히 아프다** — 종료일·금액으로 정렬할 수 없어 **만료 임박 순으로 훑을 수 없다**(FS-049 §7 #20). 갱신임박 배지가 있어도 그것으로 거르거나 정렬할 수단이 없다. 금액 컬럼은 `numeric: true` 라 우측 정렬 + tabular-nums 는 유지된다(`CrudTable.tsx:184`) | sortable header 가 방향 인디케이터·`aria-sort` 를 갖는지 | **gap** |
| ERP-06 | P1 | **충족.** 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `formatNumber`/`formatWon` 을 경유한다(`business.ts:45-47`). 상세 조회 실패 문구가 **`'계약을 찾을 수 없습니다.'`·`'계약을 불러오지 못했습니다.'`(`ContractFormPage.tsx:222-223`)로 목적격 조사를 갖췄다** — **거래처(FS-048)가 이 문구에서 조사를 빠뜨린 것과 대비된다.** 인라인 포맷 0건 | 사용자 대상 문자열의 문법을 육안 검토 | **pass** |
| ERP-07 | P2 | **미충족 — 표면이 실재한다.** 금액 컬럼이 `formatWon(item.amount)`(`ContractListPage.tsx:119`)로 **'원'을 숫자에 붙인다**('36,000,000원'). `numeric: true` 라 우측 정렬 + `tabular-nums` 인데 **단위가 마지막 자릿수를 따라다녀 자릿수 grid 가 어긋난다** — 요구가 지적하는 바로 그 증상이고, 요구의 appliesTo('테이블 금액 컬럼의 formatWon caller')가 이 줄을 정확히 가리킨다. **다행 금액 컬럼이라 시각적으로 확인 가능**하다 | 금액 셀이 자릿수로 정렬되는지(단위 분리 또는 header) | **gap** |
| ERP-08 | P2 | 건수가 `formatNumber`(`CrudListShell.tsx:119`), 금액이 `formatWon`(`business.ts:45-47` → `formatNumber`)을 경유한다. 계약기간은 **이미 'YYYY-MM-DD' 문자열**이라 포맷 함수를 거칠 필요가 없다(`ContractListPage.tsx:117`). 셀의 raw `String()`/`toString()` **0건**. `String(contract.amount)`(`ContractFormPage.tsx:159`)은 **폼 값 변환**이지 셀 렌더가 아니다 | 테이블 셀에 raw numeric toString 이 0건인지 | **pass** |
| ERP-09 | P2 | **부분 충족.** 이 화면은 timestamp 를 렌더하지 않는다 — `startAt`·`endAt` 이 달력일 문자열이고 `formatDateTime` 소비가 0건이다. `today` 는 **서울 고정** `formatDate(new Date())`(`ContractListPage.tsx:88` → `format.ts:161-165`)로 정본 정책을 따른다. **그러나 `daysRemaining`(`types.ts:104-109`)이 두 끝을 `new Date('YYYY-MM-DDT00:00:00')` 으로 브라우저 로컬 파싱한다** — `format.ts` 헤더가 정한 판정 ③('달력일은 문자열로 다룬다 — 중간에 로컬 Date 로 왕복하면 타임존 때문에 하루가 밀린다')에서 이탈했다. **관측되는 어긋남은 없다** — 두 끝이 같은 로컬 존이고 `Math.round` 가 DST 의 ±1시간(0.04일)을 흡수한다. 앵커 혼용이지 버그는 아니다 | UTC ISO 입력이 러너 타임존과 무관하게 같은 일수를 내는지. `contracts.test.ts:38-41` 이 이를 고정한다 | **gap(경미 — 앵커 혼용)** |
| ERP-10 | P2 | **표면 있음(로드맵).** 요구가 '견적서/거래명세서 print-template' 을 겨냥하나 **계약서 PDF 도 같은 뿌리**다 — 이 화면의 `ContractSummaryPreview` 는 문서 레이아웃이 아니라 요약 카드다(견적의 `QuotePreview` 와 다르다). print/document 토큰 소비 0건. **현재 인쇄·PDF 진입점이 없다** — 로드맵 대상이며 현 시점 위반 표면은 없다 | 문서/print 토큰이 존재하고 계약서 view 가 이를 소비하는지 | **n-a(현재 표면 없음)** |
| ERP-12 | P1 | **엑셀 내보내기가 없다.** 계약 목록은 법무·회계 검토의 대표 대상인데 툴바에 export affordance 가 0건이다 | 필터된 결과 전체가 한글 header + UTF-8 BOM 으로 나오는지 | **gap** |
| ERP-13 | P1 | **충족.** 이 화면의 templated copy 가 전부 `shared/format` 의 조사 헬퍼를 경유한다: 삭제 토스트·확인 문구(`useCrudList.tsx:108,158` — `objectParticle`) · 저장 토스트(`useCrudForm.ts:222`) · 검증 문구(`shared/crud/validation.ts:22,25` — `objectParticle`/`topicParticle` — '계약명을 입력하세요.'/'계약명은 80자를…') · `Empty` 의 3분기 copy. **리터럴 `이(가)`/`을(를)`/`은(는)` 0건**(grep 확인). 이 화면 고유 문구('종료일은 시작일보다 빠를 수 없습니다.'·'계약금액은 0보다 커야 합니다.')는 **고정 명사라 조사가 리터럴이어도 옳다** — 값을 interpolate 하지 않는다 | `grep -E "이\(가\)\|을\(를\)\|은\(는\)" apps/admin/src/pages/sales/contracts` → 0건 | **pass** |
| ERP-14 | P1 | **미충족.** 이 화면에 마스킹 대상이 **금액 하나**인데 그것이 gap 이다: **계약금액**(`ContractFormPage.tsx:340-353`)에 천단위 구분이 없고 `'36,000,000원'` 붙여넣기를 `/^\d+$/` 가 **거절**한다(요구는 그것을 36000000 으로 parse 하라고 한다). `inputMode="numeric"` 만 있다. **상한도 없다**(BE-049 §7.7). 사업자등록번호·전화번호는 이 화면에 없다(거래처 소관). 날짜는 `DateRangeField` 의 네이티브 `<input type="date">` 라 로케일·키보드는 브라우저가 맡는다 | 금액 필드에 '36,000,000원' 붙여넣기 → 36000000 으로 parse 되는지 | **gap** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`CrudTable.tsx:171`) — cap·virtualization 이 없다. 계약은 해마다 쌓인다(BE-049 §7.6). 9컬럼 표에 **가로 scroll 컨테이너도 없다** — `CrudListShell` 의 `columnStyle` 은 `minWidth: 0` 만 준다(`:20-25`). 검색은 디바운스가 있어 키 입력당 전량 스캔이 250ms 로 묶인다 | 1,000건 픽스처로 scroll/selection 이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 취소에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. **부분 충족**: 폼 상세 조회가 **404 vs 5xx 를 정확히 가른다**(`useCrudForm.ts:144-149` → `ContractFormPage.tsx:221-229`). **미충족**: 목록 실패(`CrudListShell.tsx:159`)·저장 실패(`FormServerError`)·삭제 실패(`useCrudList.tsx:112`)가 **403·429·500·504 를 같은 문구로 뭉갠다**. 409 만 별도 표면(`FormConflictDialog`)을 갖는다. **BE-049 는 422 축이 둘**(`INVALID_STATUS_TRANSITION`·`ATTACHMENT_REQUIRED`)이라 이 gap 이 더 아프다 — 배너로 뭉개지면 '어느 상태로 갈 수 없는지'를 알 수 없다 | `?status=save:403` vs `save:429` vs `save:500` — 전부 같은 배너면 gap | **gap(부분)** |
| EXC-07 | P1 | **경로는 완비, 발현이 막혀 있다.** `useCrudForm.handleWriteError` 가 `isUnprocessable(cause) && cause.violations.length > 0` 이면 `setError(violation.field, …)` 로 필드에 꽂고 `setFocus(first.field)` 로 포커스를 옮긴다(`useCrudForm.ts:182-192`) — 요구의 모든 절을 구현한다. **그러나 `dev.ts:84` 의 `?status=save:422` 는 `violations` 없는 `HttpError` 를 던져** 이 분기를 타지 못하고 배너로 떨어진다. **이 화면은 BE-049 §7.3·§7.9 가 422 를 두 축이나 요구하므로** 변환 배선이 특히 중요하다(BE-049 §6.1 #5) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지. **현재 재현 수단이 없다** | **gap(발현 불가)** |
| EXC-10 | P1 | `useCrudBulkDelete` 가 `settleAll`(`crud.ts:349-350`)로 allSettled semantics 를 쓰고 **실패 건수**를 반환한다. 전건 성공에만 invalidate·selection clear(`useCrudList.tsx:144-147` · `crud.ts:353`). **미충족**: 실패 **id 를 반환하지 않아** '실패 item 만 retry' 가 불가능하다. 재클릭이 **전체를 재실행**한다(성공분 재요청 → '이미 삭제됨' 409 로 다시 실패 count 에 든다). **BE-049 §7.5 의 `CONTRACT_IN_FORCE` 가 얹히면 더 나빠진다** — 진행중 계약 40건이 섞인 100건 일괄 삭제는 '어느 40건이 실패했는지'를 말하지 않는다 | 부분 실패 bulk delete 가 실패 item 만 재요청하는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** `useCrudForm` 이 `isNotFound(loadError)` 로 `'not-found'`/`'error'` 를 가르고(`useCrudForm.ts:144-149`), 화면이 **404 → '목록으로'만 · 5xx → '다시 시도' + '목록으로'** 로 갈라 그린다(`ContractFormPage.tsx:221-232`). 근본 전제인 '어댑터가 `HttpError(404)` 를 던진다'가 **이미 충족**돼 있다(`crud.ts:105-107`). 무한 spinner 도 없다(`loadingDetail` 이 `data === undefined` 기준). **요구의 근거문이 지목한 'QuoteForm 은 retry 없이 목록으로만 제공' 은 F3b 이후 해소됐다** — 세 영업 폼이 모두 같은 계약을 쓴다 | 없는 `:id`(`/sales/contracts/nope/edit`)로 진입 → '계약을 찾을 수 없습니다' + '목록으로'(retry 없음). `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 폼 저장·삭제가 전부 비관적이다. **인라인 쓰기 자체가 없어** `useCrudRowUpdate` 소비도 0건이다. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다**. un-rolled-back optimistic write 0건 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-15 | P1 | **부분 미충족 — 이 화면 고유 표면(첨부).** **충족**: ① **업로드 전 클라이언트 검증** — `imageFileError(file, maxSizeMB)`(`ImageGalleryField.tsx:148`)가 타입(`image/*`)·크기(5MB)를 보고 위반 파일을 거절하며 **요청이 나가지 않는다**(애초에 요청이 없다) ② **인라인 메시지** — `setLocalError` → `<p role="alert">`(`:300`) ③ **누락/실패 media 의 role=img placeholder** — `GalleryTile` 이 로드 실패 시 `<span role="img" aria-label={alt}>`(`:81-87`)로 폴백하고 **`src` 변경 시 failed flag 를 리셋한다**(`:78-80`) — 요구가 명시한 그 절이다. **미충족**: **upload progress·cancel 경로가 없다** — **업로드 자체가 없기 때문이다**(§4.3 알려진 빚). 값이 `blob:` 이고 언마운트 시 revoke 된다 | 비-image/oversized 선택이 upload 없이 인라인 거절되는지(pass). progress/cancel 이 있는지(gap — 업로드 부재) | **gap(부분)** |
| EXC-18 | P1 | selection scope 가 **'현재 보이는 결과'** 로 암묵 정의된다 — `toggleAll` 이 `visibleItems.map(id)` 만 받는다(`CrudListShell.tsx:143-148`). **미충족**: ① scope 라벨·'전체 N건 선택됨' 배너가 없다 ② Shift-click 범위 선택·keyboard 등가물이 없다 ③ 임계값 초과 강화 confirm·type-to-confirm 이 없다 — 확인 문구가 count 를 말하지만(`useCrudList.tsx:170`) 알아차리게 강제하지 않는다 ④ 장기 bulk 의 progress·cancel 이 없다. **계약은 고가치 record 라 ③이 특히 필요하다** | Shift-click 가 범위를 선택하는지, 대량 bulk 가 progress 를 보고하는지 | **gap** |
| EXC-20 | P1 | **충족.** `FormServerError` 가 `errorReference` 를 받아 `오류 코드 <ref>` 를 **복사 가능하게**(`userSelect: 'all'` + tabular-nums) 그린다(`FormFeedback.tsx:13-23,44`). `useCrudForm` 이 `referenceOf(cause)`(`useCrudForm.ts:195`)로 그것을 채우고 화면이 넘긴다(`ContractFormPage.tsx:257`). **raw 서버 body/stack/status 를 산문으로 쓰지 않는다**(`FormFeedback.tsx:31-36` 이 그 판정을 적었다). **단 목록·삭제 실패에는 reference 가 없다** — 폼 경로만 완비다 | `?status=save:500` → 배너에 복사 가능한 reference code 가 보이는지 | **pass(폼) · gap(목록·삭제)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-049 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 저장 p95 | ≤ 700ms (첨부 업로드 제외) | 위와 동일. **첨부가 붙으면 이 예산이 무의미해진다** — 5장 × 5MB = 25MB 가 별도 업로드 왕복을 탄다(§4.3) |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient.ts:47,59,67` — **충족** |
| 검색 입력당 연산 | 0 요청 · 커밋당 전량 1스캔 | **충족** — 클라이언트 필터이고 디바운스 250ms 가 커밋 횟수를 묶는다(COMP-10 pass) |
| 갱신임박 계산 | 렌더당 행 수만큼 | `isRenewalDue` 가 행마다 순수 계산 1회(`ContractListPage.tsx:128`). `today` 는 **렌더마다 재계산**(`:88` — `useMemo` 없음)이나 `formatDate` 1회라 무시 가능 |
| 폼 리렌더 | 입력당 1회 | **미충족 — 미리보기가 `watch()` 를 10개 부른다**(`ContractFormPage.tsx:477-486`) + 폼 상단에서 5개(`:206-210`). 어느 필드를 쳐도 폼 전체가 리렌더된다 |
| 저장 요청 크기 | ≤ 8KB | **상한이 없다.** `ContractInput` 이 `terms`(1000자) + `attachments` 배열 + `note`(500자) + 무제약 `ownerName` 을 싣는다. 첨부 5장 상한이 있어 **무한 증가는 아니다** — 다만 첨부가 URL 이 되면 5개 문자열이라 작고, **지금은 `blob:` URL 이라 짧다**(그래서 현재 크기는 문제가 아니다 — 문제는 값이 죽는다는 것이다) |
| 메모리 | 목록 전량 + 상세 1건 + object URL | 전량 보유. **object URL 이 언마운트까지 메모리를 잡는다**(`ImageGalleryField.tsx:118,128` — `createdRef` 가 추적하고 언마운트 시 revoke) |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). `_shared/business.ts` 는 거래처(FS-048)·견적(FS-050)과 공유 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). 툴바는 남아 조건이 화면에서 사라지지 않는다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) — 어댑터가 `HttpError(404)` 를 던지기 때문이다 |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| 대상이 먼저 삭제됨 | 유령 저장 없이 conflict 다이얼로그 | **충족**(EXC-04 pass — `crud.ts:126-128`) |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — 조용히 덮는다.** `version`/`If-Match` 가 없어 409 가 발생하지 않는다(BE-049 §7.1). **이 화면 최대 위험** — **계약금액과 첨부가 함께 덮인다**(B 가 부속합의서를 올린 뒤 A 가 저장하면 그 첨부가 사라진다) |
| **중복 제출 — 폼** | 연타가 1요청 | **충족**(EXC-08 pass — `submitLockRef` + 멱등키). 금액 폼이라 이것이 필수다 |
| **중복 제출 — 삭제 확인** | 연타가 1요청 | **부분 충족(잔여).** `disabled={busy}` + `aria-busy`(`ConfirmDialog.tsx:151-152`)뿐이고 **동기 락·멱등키가 없다**(`useCrudList.tsx:102` 가 키를 싣지 않는다). **값이 멱등**이라(같은 id 삭제) 두 번 나가도 최종 상태가 같다. 프레임워크의 명시적 판정이다(`crud.ts:32-41`) — EXC-08 의 pass 를 뒤집지 않으나 기록해 둔다. **거래처(FS-048)와 달리 인라인 토글 경로가 없어** 잔여가 하나뿐이다 |
| 세션 만료 중 입력 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19 P1 · FS-049 §7 #30). **첨부는 더 나쁘다** — object URL 이 revoke 돼 다시 올려야 한다 |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484-493`) |
| 일괄 삭제 부분 실패 | 실패 행만 재시도 | **미충족**(EXC-10 gap). 레이트리밋(BE-049 §5 EP-05 분당 60)에 자기가 걸린다 — 100건 선택 = 100요청 |

### 4.3 계약 문서 무결성

계약은 **법적 증거**다. 분쟁 시 이 화면이 보관한 것이 근거가 된다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **계약서 스캔본이 보관된다** | **미충족 — 알려진 빚.** `ImageGalleryField` 가 업로드하지 않아 값이 `URL.createObjectURL(file)` = **`blob:…`** 뿐이고(`ImageGalleryField.tsx:153`) 언마운트 시 revoke 된다(`:126-132`). **저장하면 계약서가 깨진다 — 그것을 아는 채로 통과시킨다.** 스키마가 http(s) 를 강제하지 **않는 것이 의도**다(강제하면 제출 불가 — `shared/crud/validation.ts:39-63` 이 그 판정을 길게 적었다). `TODO(backend): POST /api/uploads`(`ImageGalleryField.tsx:8`)가 붙으면 뒤집힌다. **이 빚은 다른 5개 폼(로고·인증서·ESG)보다 무겁다** — 그것들의 이미지는 표시용이지만 계약서는 법적 실체다 |
| 첨부가 필수다 | **미충족.** `attachments: z.array(z.string())`(`validation.ts:30`) — 검증 전무. **'서명완료' 계약을 첨부 0장으로 저장할 수 있다**(BE-049 §7.9 가 422 `ATTACHMENT_REQUIRED` 를 요구한다) |
| 첨부가 PDF 를 받는다 | **미충족.** `accept="image/*"`(`ImageGalleryField.tsx:290`) + `imageFileError` 가 타입을 본다 — **계약서 스캔본은 보통 PDF 인데 받지 않는다.** `ImageGalleryField` 는 이름 그대로 이미지 갤러리다(BE-049 §7.10 #4) |
| 전자서명 상태가 사실이다 | **미충족 — 구조적으로.** `signStatus` 가 사람이 고르는 select 다(`ContractFormPage.tsx:426-434`). **서명 발송·수집·검증 코드가 0건**이다 — '서명완료'와 실제 서명 사이에 아무 연결이 없다(BE-049 §7.9) |
| 상태 전이가 가능한 것만 허용된다 | **미충족.** **`STATUS_FLOW`/`canSetStatus` 류가 존재하지 않는다**(`types.ts`·`validation.ts` 전수 확인). '해지'된 계약을 '초안'으로 되돌릴 수 있고, 신규 계약을 '만료'로 등록할 수 있다. 고객센터(`support/_shared/domain.ts`)가 순수 규칙으로 이를 갖는 것과 정면 대비다(BE-049 §7.3) |
| 자동갱신이 실행된다 | **미충족 — 배지가 거짓말이다.** `autoRenew`·`renewNoticeDays` 는 데이터이고 **이를 실행하는 배치·통지가 없다.** 화면은 '자동갱신' 배지(`ContractSummaryPreview.tsx:98`)와 '갱신임박' 배지(`ContractListPage.tsx:128`)로 **'알아서 갱신된다'고 말하지만 아무 일도 일어나지 않는다**(BE-049 §7.9) |
| 만료가 자동 전이된다 | **미충족.** 종료일이 지나도 `status` 가 `active` 로 남는다 — 사람이 손으로 바꿔야 한다. 목록 필터 '진행중'에 끝난 계약이 계속 잡힌다 |
| 효력 있는 계약이 삭제되지 않는다 | **미충족.** 서명완료·진행중 계약도 **아무 경고 없이** 지운다. 확인 문구가 상태를 언급하지 않는다. BE-049 §7.5 가 409 `CONTRACT_IN_FORCE` 를 요구한다 |
| 금액에 상한이 있다 | **미충족.** `/^\d+$/` + `> 0` 만 보므로 20자리도 통과하고 `Number()` 가 안전 정수 범위를 넘으면 값이 뭉개진다(BE-049 §7.7) |
| 거래처가 확정 참조다 | **미충족.** `accountName: string` — `types.ts:16-17` 의 주석이 자백한다(`/** 거래처명 — FE 전용이라 이름 문자열로 보관(연동 시 거래처 FK) */`). 거래처 상호를 바꾸면 계약은 옛 이름이고, 거래처를 지워도 계약이 고아로 남는다(BE-048 §7.7 · BE-049 §7.5) |
| 조항이 XSS 를 실어 나르지 않는다 | **미정** — 관리자 화면은 텍스트 노드라 안전하나 quality-bar ERP-10 이 계약서 PDF 를 로드맵에 올려 두었고 PDF 렌더러는 React 이스케이프를 상속하지 않는다(BE-049 §7.10 #12) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | A11Y-11 · A11Y-16 | P0 · P1 | **`renewNoticeDays`(조건부 필드)의 오류가 `aria-invalid` 없이 테두리 색으로만 인코딩된다** — `controlStyle(true)` 로 붉어지지만 입력에 `aria-invalid`·`aria-describedby` 가 없어 `FormField` 의 오류 `<p>` 와 연결되지 않는다 | **이 화면 고유** | A11 change_request |
| 2 | A11Y-11 | P0 | **`FormField` 의 hint 가 valid 일 때 `hintIdOf` 로 연결되지 않는다**(통지기한 '만료 N일 전 통지') — 힌트가 AT 에 영원히 닿지 않는다. **호출부 배선 문제**이며 세 영업 화면(048·049·050)에 공통이다 | 이 화면 + 형제 2곳 | A11 change_request |
| 3 | IA-02 | P0 | 폼이 자체 `<h1>` 을 그리고 AppHeader 도 `<h1>` 을 그린다 → **`<h1>` 2개**. 목록에는 in-content h1 이 없어 title 소스 모델이 모순. **`findCoveringLeaf` 수렴으로 가지 라벨 폴백은 해소됐다** — 사유가 바뀌었다 | **앱 전역** | A40 · A11 |
| 4 | IA-04 · ERP-15 · ERP-04 · COMP-06 · COMP-07 | P0 · P1 · P2 | **페이지네이션 없음 — 전량 렌더.** 계약은 해마다 쌓인다. 연쇄: `clampPage` 미소비 · 스켈레톤 `length: 5` 기준값 부재 · `SeqCell` 오프셋 잠재 결함 · 가로 scroll 컨테이너 부재 · **정렬 header 부재로 만료 임박 순 훑기 불가**(이 도메인의 핵심 운영 루프) | 이 화면 + BE 계약 | A11 · A63 (BE-049 §7.6 · §7.10 #13) |
| 5 | EXC-03 | P0 | **write 액션 게이팅 미배선** — `useRouteWritePermissions` 소비처 9곳에 `pages/sales/**` 없음. BE-049 §7.8 이 `operator` 를 조회 전용으로 판정하므로 **실제 사용자를 때린다**. read 게이팅은 pass | **앱 전역** | A11 change_request |
| 6 | (§4.2 · BE-049 §7.1) | — | **동시 편집이 last-write-wins 로 조용히 덮는다** — `Contract.version` 부재. **계약금액과 첨부가 함께 덮인다.** 프론트는 `FormConflictDialog` 가 이미 배선돼 있어 **서버가 409 를 주기만 하면 복구 경로가 열린다** | 계약 + 어댑터 | **A63 (BE-049 §7.10 #1 — 최우선)** |
| 7 | EXC-15 · (§4.3) | P1 · — | **알려진 빚 — 계약서 첨부가 저장되지 않는다.** 값이 `blob:` 이고 언마운트 시 revoke 된다. upload progress·cancel 도 없다(업로드 자체가 없다). **연동 선후 주의**: DS `ImageGalleryField` 가 먼저 바뀌어야 한다 — 어댑터만 fetch 로 바꾸면 `blob:` 이 서버로 가고 400 으로 거절돼 **첨부 있는 폼이 저장되지 않는다** | **DS(A41) 선행** + 계약 + 이 화면 | **A41 · A63 · A11 (BE-049 §7.10 #3)** |
| 8 | (§4.3 · BE-049 §7.3) | — | **계약 상태 전이 규칙이 아예 없다** — `STATUS_FLOW`/`canSetStatus` 류가 코드에 존재하지 않는다(전수 확인). '해지'→'초안' 이 가능하다. 서버가 정본을 세우고 422 로 막고, 프론트가 순수 규칙으로 select 를 좁혀 1차 차단해야 한다 | 계약 + 이 화면 | **A63 · A11** |
| 9 | (§4.3 · BE-049 §7.9) | — | **전자서명·자동갱신·만료 전이가 실행되지 않는다** — 필드는 있는데 그것을 움직이는 것이 없다. **'자동갱신'·'갱신임박' 배지가 거짓말을 한다.** 도메인 경계 결정이 선행 | 도메인 경계 | **A01 · A63** |
| 10 | (§4.3 · BE-049 §7.5) | — | **서명완료·진행중 계약도 아무 경고 없이 삭제된다** — 409 `CONTRACT_IN_FORCE` + 해지 선행 요구가 필요하다. 확인 문구가 상태를 언급하지 않는다 | 계약 + 이 화면 | A63 · A11 |
| 11 | ERP-07 | P2 | 금액 셀이 `formatWon` 으로 '원'을 숫자에 붙여 **우측 정렬 tabular grid 에서 단위가 마지막 자릿수를 따라다닌다** — 요구의 appliesTo 가 이 줄을 정확히 지목한다 | 이 화면 | A11 change_request |
| 12 | ERP-14 | P1 | **계약금액에 천단위 구분이 없고** `'36,000,000원'` 붙여넣기를 거절한다. 상한도 없다 | 이 화면 + BE | A11 · A63 |
| 13 | ERP-01 | P1 | status→tone 레지스트리가 `pages/sales/contracts` **지역** — 거래처·견적과 통합된 앱 전역 레지스트리가 아니다. **요구가 지목한 `quoteStatusMeta` 가 형제 화면**이다. 게다가 **'만료'와 '초안'이 같은 neutral** 이라 같은 톤이 다른 semantic 을 덮는다 | 영업 3화면 공통 | A11 · A01 |
| 14 | EXC-06 · EXC-07 | P1 | 목록·저장·삭제 실패가 status 로 분기하지 않는다(404 분기만 pass). **422 필드 매핑은 경로가 완비돼 있으나 `dev.ts:84` 가 `violations` 없는 `HttpError` 를 던져 발현되지 않는다** — 이 화면은 BE 가 422 를 두 축(`INVALID_STATUS_TRANSITION`·`ATTACHMENT_REQUIRED`)이나 요구해 특히 아프다 | 이 화면 + `dev.ts` + BE | A11 · A63 |
| 15 | EXC-10 · EXC-18 | P1 | 일괄 삭제가 실패 id 를 모른다 · Shift-click 범위 선택 없음 · 진행률·취소 없음 · 고가치 record 강화 confirm 없음. **`CONTRACT_IN_FORCE` 가 얹히면 '어느 40건이 실패했는지'를 모른다** | 이 화면 + BE 계약 | A11 · A63 (BE-049 §7.5) |
| 16 | A11Y-13 | P1 | 폼 진입 시 첫 편집 필드 자동 포커스 없음. **`setValue` 관리 필드(기간·첨부·조항·토글)는 RHF ref 가 없어 `setFocus` 가 닿지 않는다** — 기간 오류로 막히면 포커스가 어디로도 가지 않을 수 있다 | 이 화면 | A11 change_request |
| 17 | COMP-01 | P1 | 저장 버튼이 `loading` prop 대신 손으로 쓴 '저장 중…' · '목록으로'가 손조립 `<button>` | 이 화면 | A11 change_request |
| 18 | STATE-05 | P1 | 빈 상태의 **(a) 진짜 비어있음 분기에 create CTA 가 없다** — `empty.createAction` 미전달 | 이 화면 | A11 change_request |
| 19 | ERP-12 | P1 | 엑셀 내보내기 부재 — 계약 목록은 법무·회계 검토의 대표 대상 | 이 화면 + 공유 export 유틸 | A11 · A63 |
| 20 | COMP-09 · COMP-11 · COMP-12 | P1 · P2 | 계약명·거래처 셀 truncate 없음 · 날짜 범위 preset 없음 · 상한 근접 경고 없음 · **거래처에 `maxLength` 조차 없어**(스키마 60자) 61자를 치면 제출 시점에야 안다 | 이 화면 | A11 (#4 와 함께) |
| 21 | ERP-09 | P2 | `daysRemaining` 이 **앵커를 혼용한다** — `today` 는 서울 고정인데 두 끝을 로컬 파싱한다. `Math.round` 가 흡수해 **관측되는 어긋남은 없으나** `format.ts` 헤더의 판정 ③에서 이탈해 있다 | 이 화면 | A11 change_request |
| 22 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 |
| 23 | (§4.1) | — | **미리보기가 `watch()` 10개 + 폼 상단 5개를 부른다** — 어느 필드를 쳐도 폼 전체가 리렌더된다 | 이 화면 | A11 |
| 24 | (§4.3 · BE-049 §7.7) | — | **금액·통지기한·기간·자유 텍스트에 상한이 없다** — `renewNoticeDays` `'0'`·`'9999'` 통과, `endAt === startAt`(0일 계약) 통과, `ownerName`·`note` 무제약 | 계약 | A63 |
| 25 | (§4.3 · BE-048 §7.7) | — | **계약이 거래처를 이름 문자열로 참조**해 상호 변경 시 어긋나고 삭제가 고아를 만든다. **BE-048 §7.7 · BE-050 §7.6 과 공동 판정** | 영업 3화면 공통 계약 | **A63** |
| 26 | (§4.2) | — | 삭제 확인에 **동기 락·멱등키가 없다** — 값이 멱등이라 최종 상태는 같으나 감사 로그가 두 줄이 된다. 프레임워크의 명시적 판정(`crud.ts:32-41`) | 프레임워크 | A63 (기록만) |
| 27 | (BE-049 §7.10 #12) | — | 조항·비고 저장 시 XSS 정제 — 계약서 PDF(ERP-10)가 React 이스케이프를 상속하지 않는다 | 계약 | A63 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`contractAdapter` 는 `scope: 'sales-contracts'`(`data-source.ts:70`)로 `failIfRequested(spec.scope, op)` 를 부른다. `createCrudAdapter` 가 부르는 **op 는 4개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=sales-contracts:list` · `?fail=all` |
| `detail` | `fetchOne` (`crud.ts:101`) | `?fail=detail` · `?fail=sales-contracts:detail` · `?fail=all` |
| `save` | `create`(`crud.ts:112`) · `update`(`:120`) | `?fail=save` · `?fail=sales-contracts:save` · `?fail=all` |
| `delete` | `remove` (`crud.ts:135`) | `?fail=delete` · `?fail=sales-contracts:delete` · `?fail=all` |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 **필터 변경 · `staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`) — 특정 op 을 특정 HTTP status 로 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

> **⚠ 이 화면에서만 주의 — 파라미터 이름 충돌.** 목록 필터가 `?status=` 를 쓴다(`ContractListPage.tsx:149` — `list.setFilter('status', …)`). 그래서 **`?status=save:409` 로 스위치를 켜면 필터가 그 값을 읽고 `parseFilter` 가 '전체'로 되돌린다**(`:82-86`). 조회는 정상이나 **필터 UI 가 '전체 상태'로 보인다** — 스위치를 켠 채 필터 동작을 검증하면 오판한다. 반대로 `?status=active`(필터 값)는 스위치가 `code === undefined` 로 무시하므로(`dev.ts:63`) 무해하다. FS-049 §7 #11.

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 + 입력 보존이면 pass**(현재 pass). 위 충돌 주의 |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-06 (status별 surface) | `?status=save:403` · `save:429` · `save:500` — 전부 같은 배너면 gap(현재 gap) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fsales%2Fcontracts&reason=session_expired` 로 가면 pass |
| EXC-07 (422 필드 매핑) | `?status=save:422` — **`dev.ts:84` 가 `violations` 없는 `HttpError` 를 던져 재현 불가**. 배너로 떨어지는 것이 현재의 정상 |
| EXC-20 (reference code) | `?status=save:500` — 배너에 '오류 코드 …' 가 보이면 pass(현재 pass) |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · A11Y-11 · A11Y-12 · ERP-13 판정) · RTL(A11Y-11 의 `aria-required` 주입 · `DateRangeField` 의 두 입력 짝 · describedby↔alert id 일치) · `contracts.test.ts`(잔여일수·갱신임박·필터·검색·정렬·폼 검증 순수 규칙 회귀 — **이 화면에 컴포넌트 테스트는 없다**) · `shared/crud/crud.test.ts`(어댑터 409/404 계약) · `useListState.test.tsx`·`useDebouncedSearch.test.tsx`(IA-13 · COMP-10 의 회귀 방어선).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서(STATE-01,02,04 · TOKEN-01..05 · COMP-10 · FEEDBACK-02,04,06 · A11Y-01,02,11,12 · MOTION-01,02,03 · IA-01,02,04,05,13 · EXC-01,02,03,04,08,09)로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재)
- [x] §2.1 산수 검산 — 13 pass + 11 종속 + 2 n-a + 4 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — **`DateRangeField`(COMP-11)·`ImageGalleryField`(EXC-15) 같은 이 화면 고유 표면을 빠뜨리지 않았고**, 없는 표면(재정렬·CSV·타임라인·사업자번호 마스킹)은 `n-a` 로 사유만 남기거나 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`sales-contracts`)와 op 4종을 **어댑터 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**. **`?status=` 파라미터 이름 충돌**을 코드로 확인해(`dev.ts:63` · `ContractListPage.tsx:82-86`) 재현 주의로 남겼다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조 · 기준일 2026-07-17 · `HEAD = a5c2639`' 를 §1 과 §6 에 명시했다
- [x] **EXC-04 를 pass 로 판정하되 409 가 '존재 여부' 기반임을 흐리지 않았다** — 동시 편집 last-write-wins 를 §2·§4.2·§5 #6 에 세 번 못 박았다
- [x] **`blob:` 첨부를 '결함'이 아니라 '알려진 빚 + 그 근거'** 로 §4.3 · §5 #7 에 적고 **연동 선후(DS 선행)** 를 명시했다
- [x] §5 의 gap 이 FS-049 §7 · BE-049 §7.10 과 일치한다
</content>
