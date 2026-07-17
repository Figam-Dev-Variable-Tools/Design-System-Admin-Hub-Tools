---
id: NFR-052
title: "프로젝트 비기능 명세"
functionalSpec: FS-052
backendSpec: BE-052
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-052. 프로젝트 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-052 프로젝트 (`/sales/projects` · `/sales/projects/new` · `/sales/projects/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-052(요소·예외) · BE-052(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-052 §7 · BE-052 §7.8 과 번호가 일치해야 한다 |
| 판정 근거 | **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음 — 이 화면의 P0 30건 판정은 하나도 뒤집히지 않았다.** 다만 두 갈래로 근거가 갱신됐다: ① **`종속` 3건(MOTION-01·02·03)의 낡은 근거를 교체**했다 — 특히 **MOTION-03 의 gap 사유가 해소됐다**(`ToggleSwitch.css:79-84` 게이트 신설). 이 화면은 `ToggleSwitch` 를 최대 12개 렌더하는 노출면이었다(§5 #22) ② **⚠ 유효성 축의 *동작* 이 바뀌었다**(PR #28 · `5e86a3c`) — 프로젝트 기간(`validation.ts:54` ×2)과 **마일스톤 목표일**(`:95`)이 이전에는 `2026-02-31` 을 통과시켰으나 **이제 거절한다**(회귀 `projects.test.ts:129`). ⚠ **그 수렴이 신규 결함을 드러냈다** — 마일스톤 문구가 실재하지 않는 날짜를 '입력하세요' 로 뭉갠다(FS-052 §7 #31) |

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

**이 섹션에서 유일하게 전체 CRUD 를 갖고, 유일하게 공용 CRUD 프레임워크를 전량 소비하는 화면이다.** 목록 = `useCrudList` + `CrudListShell`(선택·일괄삭제·확인 다이얼로그·빈상태·라이브리전·실패배너를 셸이 소유) · 폼 = `useCrudForm`(404 분기 · 409 충돌 다이얼로그 · 422 필드 매핑 · 동기 제출 락 · 멱등키 · 참조 코드 · RHF `isDirty`).

**그 결과 P0 판정이 이 섹션에서 가장 좋다** — FS-051 이 gap 으로 잡는 `STATE-02`·`EXC-04`·`EXC-08` 이 여기서는 pass 다. **기준이 다른 것이 아니라 셸 소비 여부가 다르다.** 반대로 셸의 결함(`<Pagination>` 부재 · 스켈레톤 `length: 5` · 일괄 삭제의 실패 id 미반환)은 **이 화면이 고스란히 물려받는다** — 그 gap 들의 이관 대상은 화면이 아니라 셸이다.

**동적 배열 필드(`ProjectMilestonesField`)와 `ToggleSwitch` 를 갖는 유일한 담당 화면**이다 — MOTION-03 이 명시 지목한 `ToggleSwitch.css` 의 reduced-motion 누락이 실제 표면으로 존재한다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 상속 | **충족.** 목록이 `useCrudList`(`ProjectListPage.tsx:113-118`)를 소비하고, 그 훅이 **`firstLoading = isFetching && data === undefined`(`useCrudList.tsx:71`)와 `refreshing = isFetching && data !== undefined`(`:72`)를 갈라서** 돌려준다. `CrudListShell` 이 그 둘을 서로 다른 자리에 쓴다 — `loading={firstLoading}`(`CrudListShell.tsx:137`)만이 스켈레톤·`aria-busy` 를 지배하고(`CrudTable.tsx:116,143`), `refreshing` 은 요약에 '· 새로고침 중…' 을 덧붙일 뿐 **건수를 지우지 않는다**(`CrudListShell.tsx:118-122`). 4상태가 배타적이다: 스켈레톤 / Empty(`items.length===0` — `CrudTable.tsx:153`) / 행 / error 배너(`CrudListShell.tsx:113,156`). **폼도 정상** — `loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined`(`useCrudForm.ts:136`) | `/sales/projects` 진입 → 데이터 렌더 확인 → 단계 필터 변경으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** '· 새로고침 중…' 이 덧붙되 행이 유지되면 pass. `?fail=list` 로 error 배너만, 검색 0건으로 Empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 상속 | **충족 — 이 섹션에서 유일하다.** 목록: `CrudListShell.tsx:156-165` 가 `<Alert tone="danger">` + '다시 시도'(`controller.refetch`)를 렌더하고 error toast 를 쓰지 않는다. **폼: 404 와 5xx 를 갈라서 각각 옳은 복구를 준다** — `useCrudForm.ts:144-149` 가 `isNotFound(loadError)` 로 `loadFailure: 'not-found' | 'error'` 를 파생하고, `ProjectFormPage.tsx:242-264` 가 `'not-found'` 면 **'다시 시도'를 숨기고** '목록으로'만, `'error'` 면 **'다시 시도'(`retryLoad`) + '목록으로'** 를 준다(주석 `:240-241` 이 그 이유를 밝힌다). read 실패에 error toast 0건. **⚠ 다만 두 문구가 조사 빠진 비문**이다(§3 ERP-13) | `/sales/projects/prj-1/edit?status=detail:500` → **danger Alert + '다시 시도' + '목록으로'** 가 떠야 pass. `/sales/projects/nope/edit` → **'다시 시도'가 없어야** pass. `?fail=list` 로 목록 배너 + 재시도 확인 | **pass** |
| STATE-04 | STATE | 직접 | **충족(조건부).** 요구는 두 절이다. **(b) 선택 해제 — 충족**: `ProjectListPage.tsx:124-126` 이 `useEffect(() => { clear(); }, [filter, keyword, clear])` 로 단계 필터·검색어 변경 시 선택을 해제한다(주석 `:121-123` 이 그 이유를 선언 — '화면에 없는 행이 선택된 채 「선택 3건 삭제」 가 되지 않게 한다'). 선택이 `useCrudList`→`useRowSelection` 에 있고 조건이 `useListState` 에 있어 **화면이 그 둘을 잇는 다리를 명시적으로 놓았다.** 일괄 삭제 성공 시에도 해제된다(`useCrudList.tsx:145`). **(a) page clamp — 표면이 없다**: 페이지네이션이 없어(`<Pagination` grep 0건, `CrudListShell` 에 미구현) `clampPage` 가 걸릴 지점이 없다. `useListState.clampPage`(`useListState.ts:217-223`)는 **준비돼 있으나 호출부가 0건**이다. **표면이 실재하는 절이 충족이므로 pass 로 판정하되, (a) 는 IA-04 가 gap 으로 잡는다** — 이 pass 가 그것을 면제하지 않는다 | 3건을 선택 → 단계 필터를 '제안'으로 변경 → **선택이 해제되고 SelectionBar 가 사라지면 pass.** 검색어 커밋으로도 동일. **(a) 는 페이지네이션 도입 후 재판정** — `clampPage` 가 이미 있어 비용은 낮다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/sales/projects/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 13)`(`ProjectFormPage.tsx:86`) 같은 space 토큰 배수로만. 진척 막대의 유일한 계산값도 `width: '<0~100>%'` 상대 단위다(`ProjectListPage.tsx:88`) | `grep -nE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|(outline\|border): *(thin\|medium\|thick)" apps/admin/src/pages/sales/projects` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(폼 input 전부 — `ProjectFormPage.tsx:302,325,339,376,392,411,442` · back 버튼 `:270` · 마일스톤 input/삭제 `ProjectMilestonesField.tsx:103,113,130`) · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>`·`<ToggleSwitch>`·`<DateRangeField>`(자체 CSS) · `RowSelectCell`/`RowActions`(DS). **이 화면이 focus ring 을 직접 선언하지 않는다** — 계약은 `ui.css:14-17`(`outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus)`)이 소유. **클래스 없는 포커스 표면 0건**(FS-053 과 갈리는 지점) | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건이고, 포커스 가능한 모든 요소가 `tds-ui-focusable` 또는 DS 컴포넌트임을 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148`) · Toast(저장·삭제 성공) · ConfirmDialog Modal · **`ToggleSwitch` handle transform transition**(`ProjectMilestonesField.tsx:120`) · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` · `ToggleSwitch.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` 5개(`ProjectFormPage.tsx:290,421,451,461,490`) · Toast · ConfirmDialog(삭제·discard·conflict)의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 폼 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ProjectFormPage.tsx:279`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. 미리보기의 강조 숫자도 `--tds-primitive-typography-font-weight-bold` 토큰을 쓴다(`:120`). **목록에는 in-content `<h1>` 이 없다** | `/sales/projects/new` 의 '프로젝트 등록' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족.** `ProjectListPage.tsx:163-170` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 공용 `useListState`→`useDebouncedSearch` 를 소비한다(주석 `:168` — '조합 중 커밋 금지 + Enter 차단 — 「신사옥」 을 치는 도중 「신사ㅇ」 로 검색되지 않는다'). 그 훅이 세 절을 전부 구현한다: ① 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) ② 조합 중 Enter 차단 — `isComposing`·자체 관측 **두 신호**(`:121-124`) ③ 250ms 디바운스(`:23,93-95`). `SearchField` 가 `{...native}` 를 `<input>` 마지막에 스프레드해(`SearchField.tsx:66`) 세 핸들러가 도달한다. **stale 응답 절**: 검색이 클라이언트 필터라 검색어가 쿼리 키에 없다 — **out-of-order 응답 경쟁이 구조적으로 불가능**하다 | `/sales/projects` 검색창에 IME 로 '신사옥' 입력. **조합 중 '시'·'신사ㅇ' 이 URL `?q=` 나 표에 반영되면 gap.** 조합 중 Enter 가 제출하지 않는지, 완성 후 250ms 뒤 커밋이 **1회**인지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | **파괴적 액션이 실재하고 계약이 전 절 충족된다** — 이 섹션에서 유일하다. 표면 3종: ① **단건 삭제**(`RowActions` 휴지통 → `requestDelete` → `ConfirmDialog intent="delete"`) ② **일괄 삭제**(`requestBulkDelete`) ③ **discard**(이탈 가드). 앱 측 배선은 `useCrudList` 가 소유하고 전 절을 만족한다: intent 매핑(`:156,168` `intent="delete"`) · **busy 중 confirm 비활성**(`busy={deleting}` — `:160`) · **실패 시 다이얼로그를 열어둔 채 danger 배너**(`error={deleteError}` — `:161`, 문구 `:112`) · 재클릭이 retry · **cancel/Esc/dim 이 in-flight 를 abort + `mutate.reset()` + pending 리셋**(`closeDelete` `:86-92` / `closeBulk` `:118-124`). intent→tone/icon/label 매핑과 초기 포커스·`aria-busy` 는 DS `ConfirmDialog` 가 소유한다 | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 `?fail=sales-projects:delete` 로 삭제 강제 실패 → **다이얼로그가 배너와 함께 유지되고 재클릭이 retry** 되는지, in-flight 중 Esc 로 닫으면 **false toast 없이** 버튼 상태가 복원되는지 확인 | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | `ProjectFormPage.tsx:223` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. **`isDirty` 는 RHF `formState.isDirty` 그대로**(`useCrudForm.ts:261`) — 요구가 명시한 그 신호다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:127,133,178`). **저장 성공 후 가드가 해제된다** — `navigate(listPath, { replace: true })`(`useCrudForm.ts:223`) 시점에 `saving` 이 true 라 조건이 꺼져 있다 | 등록 폼에 프로젝트명 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로'(FS-052-EL-015)·'취소'(EL-035)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-052 §7 #16 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 폼은 modal 이 아니라 전용 라우트(`/new`·`/:id/edit`)의 `<Card>` 들로 렌더된다. 이것은 quality-bar IA-06 의 '무게 규칙'에 부합한다(rich 엔티티 = 전용 route). 이 화면의 modal 3종(삭제 확인 · discard 확인 · 409 충돌)은 **전부 입력 필드가 없는 확인/알림 다이얼로그**다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공(`useCrudForm.ts:222` — '프로젝트를 등록/저장했습니다.') · 단건 삭제 성공(`useCrudList.tsx:108`) · 일괄 삭제 성공(`:146`). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다. **추가로 목록에 항상 마운트된 polite 리전이 있다**(`CrudListShell.tsx:107-109`) — 그것은 A11Y-16 의 산물이며 요구가 지적한 '내용과 함께 생성되는 region' 문제를 셸이 같은 방식으로 푼 선례다(주석 `:99-105` 가 A11Y-01 을 명시 인용) | ToastProvider 판정에 종속. 이 화면에서는 저장·삭제 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 3종: 삭제 확인 · discard 확인 · **409 충돌**(`FormConflictDialog` — `ProjectFormPage.tsx:532`). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 message('…를 삭제합니다. 이 작업은 되돌릴 수 없습니다.')가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **부분 미충족 — 한 폼 안에서 규칙이 갈렸다.** **required 절 — 충족(5/5)**: `project-name`(input ✔) · `project-account`(input ✔) · `project-stage`(**`SelectField` — `FormField.tsx:40` 이 허용 대상으로 인정** ✔) · `project-lost-reason`(input ✔) 이 `FormField required` 의 **런타임 `aria-required` 주입**(`FormField.tsx:50-56` `withAriaRequired`)을 받고, `DateRangeField required` 는 **컴포넌트가 두 입력에 직접** `required`+`aria-required` 를 준다(`DateRangeField.tsx:48`). **래퍼 `div`/`span` 자식으로 주입이 막히는 경우가 이 화면에 0건**이다(FS-037·설정/OAuth 의 그 함정 없음). **describedby 절 — 충족**: `aria-invalid` 를 세운 곳(`:307,329`)은 **전부 `aria-describedby` 와 짝**이고(`:308-310,330-332`) 그 id 가 `FormField` 의 `<p role="alert" id={errorIdOf(htmlFor)}>`(`FormField.tsx:110`)와 일치한다. `DateRangeField` 도 invalid 시 두 입력에 짝으로 준다(`:45`). `TextareaField` 는 내부 배선(`:62-67`). **'describedby 없는 aria-invalid' grep = 0 ✔**. **미충족 절**: **오류가 있는데 `aria-invalid` 를 세우지 않는 필드가 4개**다 — 확률(`:367-382`) · 예상매출(`:383-398`) · 진척률(`:433-448`) · 실주 사유(`:401-418`). 이들은 `FormField error={errors.X?.message}` 로 `<p role="alert" id="…-error">` 를 **렌더하면서도** 입력에 `aria-invalid` 도 `aria-describedby` 도 주지 않는다 → **AT 가 그 입력을 유효한 것으로 읽고, 오류 문구와의 연결이 없다.** 시각 신호는 `controlStyle(errors.X !== undefined)` 의 **붉은 테두리뿐 — 색만의 오류 인코딩**이다. 마일스톤 오류(`ProjectMilestonesField.tsx:157-161`)는 **id 조차 없어** 이을 수도 없다. **요구의 acceptanceCheck 두 절 중 grep 절은 통과하고 RTL 절('input 의 aria-describedby === role=alert `<p>` id')은 4개 필드에서 실패한다** | `grep -n "aria-invalid" apps/admin/src/pages/sales/projects -r` → 2건(`:307,329`), **각각 같은 요소에 `aria-describedby` 가 있으므로 그 절은 pass.** RTL: 확률에 '150' 을 넣고 제출 → `screen.getByLabelText('확률 (%)').getAttribute('aria-invalid')` 가 **null 이면 gap**, `getAttribute('aria-describedby')` 가 **null 이면 gap**. required: `getByLabelText('프로젝트명').getAttribute('aria-required') === 'true'` 확인(pass 예상) | **gap** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 1개**다(`ProjectListPage.tsx:171-184`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current` **0건**(grep). (`PipelineStepper` 가 `aria-current="step"` 을 빠뜨린 것은 사실이나 그것은 **좌측 토글 필터가 아니다** — A11Y-16 P1 이 그 표면을 잡는다. 요구를 그 표면에 억지로 걸지 않는다) | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 3종: 삭제 확인 · discard 확인 · 409 충돌. enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21,30-33` → keyframes `:126-144`) + dialog scale(`:58-59,35-38` → `:146-168`, exit 는 `forwards`) · reduced-motion 게이트 `:173-180` · `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **Motion/framer-motion 은 여전히 미도입**(`packages/ui/src` 소비 0건)이나 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성했다 — **'라이브러리가 없으니 소유 문서에서 gap 일 것' 이라는 이전 배치의 추정은 더 이상 성립하지 않는다.** 잔여: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`:27-31`) — 이 화면의 다이얼로그는 footer 가 주 닫기 수단이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 여전히 이 문서의 몫이 아니다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장·단건삭제·일괄삭제 성공 토스트 3종. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **PR #26 에서 구현됐다** — `.tds-toast--exiting`(`Toast.css:32-37`, `tds-toast-out … forwards` + `pointer-events:none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족**(`component.overlay.exit-duration` = `{motion.duration.fast}` 150ms · `exit-easing` = `{motion.easing.accelerate}` — `tokens/tokens.json:1298-1307`). exit 완료 후 unmount 는 `onAnimationEnd` 대조로 달성. reduced-motion 게이트 `Toast.css:136-141` | DS Toast 판정에 종속(이 화면은 텍스트만 주입한다) | **종속** |
| MOTION-03 | MOTION | 상속 | **요구가 명시 지목한 `ToggleSwitch` 가 이 화면에 실재한다** — `ProjectMilestonesField.tsx:120-127` 이 마일스톤마다(최대 12개) 그것을 렌더한다. 요구 본문이 'ToggleSwitch 가 이미 위반(off 없는 transform transition)'이라 적은 그 컴포넌트다. **⚠ 그 위반은 이번 기준(PR #26)에서 해소됐다** — **`ToggleSwitch.css` 의 reduced-motion 게이트가 이번 기준(PR #26)에서 신설됐다** — `:79-84` `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }` 가 남은 transition 2건(`:32` `background-color` · `:56` `transform`)을 **둘 다 끈다** → 손잡이가 즉시 최종 위치로 스냅한다. 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향이고, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다. **이전 배치가 적은 'reduced-motion off 누락' 은 해소됐다.** 나머지 표면도 각자 게이트를 갖는다 — Modal `Modal.css:173-180` · Toast `Toast.css:136-141` · 스켈레톤 `shared/ui/ui.css:110-114`. `ToggleSwitch.css` 는 여전히 `packages/ui` 소유이고 이 화면은 소비자다. 그 밖의 reduced-motion 표면: 스켈레톤 펄스 · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) | 전역 motion config·`ToggleSwitch.css` 판정에 종속. **이관 대상은 `packages/ui`(A41/DS)** 이며 이 화면은 그 gap 의 노출면임을 §5 에 기록한다. 재현: `prefers-reduced-motion: reduce` 로 마일스톤 토글을 눌러 handle 이 순간 이동하는지 | **종속** |
| IA-01 | IA | 직접 | 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:252-254`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 `CrudListShell` 의 `<div style={columnStyle}>`(`CrudListShell.tsx:98`) · 폼의 `<div style={pageStyle}>`(`ProjectFormPage.tsx:267`)다 | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **부분 미충족 — 사유가 통합 이후 바뀌었다.** 해소된 절: `/sales/projects/new`·`/:id/edit` 는 nav 잎이 아니지만 `findCoveringLeaf`(`nav-config.ts:269-279`)가 '자기를 감싸는 가장 긴 잎'인 `/sales/projects` 를 찾아 **AppHeader 가 잎 라벨 '프로젝트'를 보인다**(`findNavLabel` `:297-299` → `AppHeader.tsx:92,101`) — **요구가 금지한 '브랜치 라벨(영업 관리)' 폴백은 더 이상 발생하지 않는다.** 남은 절 둘: ① **`<h1>` 이 2개다** — AppHeader 의 `<h1>{title}</h1>`(`AppHeader.tsx:101`)와 폼의 `<h1 style={pageTitleStyle}>{isEdit ? '프로젝트 수정' : '프로젝트 등록'}</h1>`(`ProjectFormPage.tsx:279`) ② **primary title 이 행위를 반영하지 않는다** — AppHeader 는 '프로젝트'라 말하지 요구가 예시로 든 '공지 등록' 류가 아니다. `nav-config.ts:293-295` 가 '등록/수정 행위는 제목에 넣지 않는다'를 **의도로 선언**하고 '화면이 등록인지 수정인지는 폼 자신이 말한다'고 적는다 — **즉 이 앱은 요구와 다른 모델을 의도적으로 채택했다.** 그러나 요구는 '단일 title 모델'을 명령하고 이 화면은 **두 모델을 동시에** 쓴다(목록=AppHeader만 / 폼=AppHeader+in-content) — 요구의 본문이 지적하는 바로 그 모순 | `/sales/projects/new` 진입. `document.querySelectorAll('h1').length === 2` 이면 gap. AppHeader 의 가시 `<h1>` 이 '프로젝트'(잎 라벨)인지 확인 — **'영업 관리'면 회귀다.** 목록 `/sales/projects` 는 잎이라 h1 1개 · '프로젝트' 로 정상 — 이 gap 은 sub-route 에서만 발생 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: **toolbar 좌측 검색·필터 + 우상단 primary '프로젝트 등록'**(`ProjectListPage.tsx:160-191` — 요구의 배치 그대로) → **결과 count 요약**(`CrudListShell.tsx:115-123`) → **SelectionBar**(`:125-133` — bulk action 이 있으므로 실재) → **table**(`:135`). **미충족: Pagination 이 없다.** `CrudListShell.tsx:97-169` 어디에도 `<Pagination>` 이 없고 `pages/sales` 전체에 0건이다(grep). `visibleItems` 전량이 `CrudTable` 로 간다. 프로젝트는 누적 증가 컬렉션이라 'page size 초과 가능'이 확실하다(BE-052 §7.4). **이 gap 의 이관 대상은 화면이 아니라 셸**이다 — 셸 소비 화면 전부가 같은 gap 을 공유한다 | 픽스처를 20건 이상으로 늘리고 `/sales/projects` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** 툴바 배치(검색 좌 / 등록 우)와 count 요약은 pass 임을 함께 확인 | **gap** |
| IA-05 | IA | 직접 | **충족 — 이 섹션에서 유일하다.** `App.tsx:253-254` 가 `/sales/projects/new` 와 `/sales/projects/:id/edit` 를 **같은 `<ProjectFormPage />`** 에 매핑한다. `isEdit` 는 `useParams` 의 `:id` 유무로 파생되고(`useCrudForm.ts:74-75`), 레이아웃은 동일하며 **다른 것은 title(`:279` '등록'/'수정')과 prefill(`:131-134` `reset(toValues(loaded))`) 뿐**이다. create 전용/edit 전용 page 가 별도로 존재하지 않는다. 요구가 명시한 형태(`FormPageShell + useCrudForm` 이 확립한 규칙)를 그대로 따른다 | `/sales/projects/new` 와 `/sales/projects/prj-1/edit` 가 **같은 컴포넌트**로 해석되는지(`App.tsx` 확인), 레이아웃이 동일하고 title·prefill 만 다른지 확인 | **pass** |
| IA-13 | IA | 직접 | **충족.** 단계 필터와 검색어의 **단일 원천이 URL** 이다 — `ProjectListPage.tsx:104` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 소비하고, 그 훅이 `useSearchParams` 로 `?stage=`·`?q=` 를 직렬화한다(`useListState.ts:87-99`). 기본값(`stage: 'all'`)은 URL 에서 지워지고(`:115-117`), 갱신은 `{ replace: true }`(`:125`)라 필터 조작이 history 를 쌓지 않는다 — **폼에서 Back 하면 그 조건이 걸린 목록 URL 로 착지한다.** 헤더 주석(`:6-8`)이 그 설계를 선언한다 — '「제안」 단계만 걸러 놓고 프로젝트 상세로 갔다 Back 하면 그 파이프라인 view 가 그대로 살아 있고, 주간 회의에 그 URL 을 그대로 붙여 넣을 수 있다'. 손으로 고친 `?stage=거짓말` 은 `parseFilter`(`:106-110`)가 '전체'로 되돌린다. **`page`·`sort` 는 URL 키가 준비돼 있으나 이 화면에 그 UI 가 없다**(IA-04 gap). scroll 위치 복원은 없다(요구가 '가능하면'으로 둔 절) | `/sales/projects` 에서 단계='협상' + 검색='한빛' 적용 → URL 이 `?stage=negotiation&q=한빛` 인지 확인 → 행 클릭으로 폼 진입 → 브라우저 Back. **URL 과 필터가 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지, 필터 3회 조작 후 Back **1회**로 이전 화면에 가는지 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(+ `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·삭제 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **IA-13 덕에 `returnUrl` 에 필터 조건까지 실려 복귀 시 그 view 가 복원된다** | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsales%2Fprojects…&reason=session_expired` 로 이동하는지 확인. (미저장 폼 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): read 게이팅 — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`RequirePermission.tsx:61-64`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/sales/projects/new`·`/:id/edit` 까지 덮는다. **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan`(`RequirePermission.tsx:27-52`)의 소비처는 **앱 전체 7곳**(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}` + `logs/LogListShell`)이며 **`pages/sales` 는 하나도 없다**(grep). 이 화면의 **네 표면이 전부 무조건 렌더**된다 — '프로젝트 등록'(`:186`) · `RowActions` 의 수정/삭제(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126-132`) · 제출(`:526`). 게다가 **읽기 전용 상세가 없어 행 클릭이 곧 편집 폼 진입**이다(FS-052-EL-044) — read 만 되는 역할이 편집 화면 전체를 보고 저장 버튼까지 누른다. **선례가 있다는 점이 이 gap 을 더 무겁게 한다**: `ProductListPage` 는 **같은 `CrudListShell` 을 쓰면서** `useRouteWritePermissions` 로 게이팅한다 — 이 화면이 못 한 것이 아니라 안 한 것이다. **BE-052 §7.6 이 삭제를 `admin` 전용으로 판정하므로** `operator` 에게 휴지통이 보이는 것은 계약 위반이 곧 UI 로 드러나는 자리다 | 권한 스토어에서 `sales/projects` 의 `create`/`update`/`remove` 를 끈 뒤 `/sales/projects` 진입. **'프로젝트 등록'·휴지통·'선택 N건 삭제' 가 그대로 보이면 gap.** read 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass). `?status=save:403` 으로 강등 응답이 권한 문구로 갈리는지 확인 | **gap** |
| EXC-04 | EXC | 직접 | **부분 미충족 — 절반은 충족이다. 정확히 가른다.** **충족 절 둘**: ① **유령 저장이 구조적으로 불가능하다** — 공용 `createCrudAdapter`(`data-source.ts:67`)라 `update`/`remove` 가 없는 id 에 **`HttpError(409)`** 를 던진다(`crud.ts:126-128, 139-141`). ② **409 conflict 다이얼로그가 실재하고 입력을 보존한다** — `ProjectFormPage.tsx:532` 가 `<FormConflictDialog conflict={conflict} />` 를 렌더하고, `useCrudForm.ts:166-179` 의 `isConflict` 분기가 **성공 토스트도 목록 이동도 없이** 다이얼로그를 띄워 '최신 불러오기'(`reload` → refetch → 폼 덮기) / '닫기'(`dismiss` → **입력 그대로 두고 이어서 편집**)를 준다. **요구의 acceptanceCheck 두 절('stale write 가 입력을 유지하고 conflict dialog 를 열며 success toast/navigation 없음' · 'list 에서 이미 제거된 record 편집이 ghost saved 대신 conflict 배너')이 둘 다 pass** 다. **미충족 절**: **낙관적 동시성 토큰이 없다** — `Project`(`types.ts:18-38`)에 `version`/`updatedAt`/`etag` 필드가 없고 어댑터가 `If-Match` 를 보내지 않는다. 어댑터의 409 는 **'대상이 존재하는가'만** 본다 → **둘 다 존재하는 프로젝트를 두 관리자가 동시에 편집하면 409 없이 last-write-wins** 다(A 가 확률을, B 가 예상매출을 바꾸면 나중 저장이 앞선 변경을 전체 치환으로 덮는다). 요구가 첫 문장에서 명시한 것이 바로 그 토큰이다. **이 gap 의 프론트 비용은 거의 0** — UI 가 이미 있으므로 `ProjectInput` 에 `version` 을 얹고 어댑터가 `If-Match` 로 보내면 **화면 코드 0줄**로 성립한다(BE-052 §7.3) | `?status=save:409` 로 폼에서 저장 → **`FormConflictDialog` 가 뜨고 입력이 남아 있으면 그 절은 pass.** 동시 편집(둘 다 존재)은 재현 스위치로 만들 수 없다 — `Project` 에 version 필드가 없음을 **코드로** 확인해 판정한다(`types.ts:18-38`) | **gap** |
| EXC-08 | EXC | 상속 | **충족 — 3중 방어가 전부 있다.** ① **pending 중 disable**: `disabled={saving \|\| loadingDetail}`(`ProjectFormPage.tsx:526`). ② **동기 제출 락**: `useCrudForm.ts:103` 의 `submitLockRef` 를 `onValid` 첫 줄이 건다 — `if (submitLockRef.current) return; submitLockRef.current = true;`(`:201-203`). 주석(`:95-102`)이 그 필요를 정확히 설명한다 — 'RHF 는 **비동기 검증**을 먼저 돌리므로 첫 클릭 후 `saving` 이 true 가 되어 버튼이 실제로 disabled 되기까지 한 틈이 있다. ref 는 **렌더를 기다리지 않으므로** 그 틈을 닫는다.' `onSettled`(`:213-215`)와 `onInvalid`(`:246-248`)가 락을 푼다. ③ **제출 시도 단위 멱등키를 mutation 함수 밖에서 만들어 variables 로 싣는다**: `idempotencyKeyRef` + `takeIdempotencyKey()`(`:118-123`)가 키를 잡고 `:211` 이 그것을 `:228,235` 의 `mutate({ …, idempotencyKey })` 에 넘긴다 → `crud.ts:288-289,310-311` → `adapter.create/update(input, { signal, idempotencyKey })` → **원장이 재생**(`:114,121`). **성공해야 키를 버린다**(`:220`) — 실패한 첫 시도가 키를 태워 재시도를 no-op 로 만드는 함정을 피했다(`crud.ts:53-60` 주석이 그 이유를 설명). **요구가 정확히 지목한 세 절이 모두 충족**이며, 요구 본문이 '`useCrudForm` 은 RHF 비동기 검증 후 disabled={saving} 에 의존해 double-Enter gap 이 남음'이라 적은 상태에서 **F3b 가 그것을 고쳤다.** **삭제에는 멱등키가 없다** — `DeleteVars`(`crud.ts:319-322`)에 자리가 없는 **의도된 설계**이며(`:36-38` 주석 '사용자가 매번 확인 다이얼로그를 거치는 조작은 키 없이 온다'), 확인 다이얼로그 + `busy` 가 그 자리를 대신한다 | 등록 폼을 채우고 '등록'을 최대한 빠르게 2회 클릭(또는 Enter 연타 — `type="submit"` 이라 이 경로가 실재한다). **요청이 정확히 1건이면 pass.** 코드상 `submitLockRef` 와 `idempotencyKey` 가 이 경로에 존재함으로도 판정된다. `?status=save:500` 후 재시도가 **같은 키**를 쓰는지(원장 재생) 확인 | **종속** |
| EXC-09 | EXC | 상속 | **모든 경로가 배선돼 있다.** **폼**(`useCrudForm`): ① onError `if (isAbort(cause)) return;`(`:162`) ② onSuccess `if (controller.signal.aborted) return;`(`:218`) ③ unmount `useEffect(() => () => controllerRef.current?.abort(), [])`(`:93`). **삭제**(`useCrudList`): ① onError `if (isAbort(cause)) return;`(`:111`) ② onSuccess `if (controller.signal.aborted) return;`(`:105`) ③ **다이얼로그 close 가 abort + `mutate.reset()`**(`:86-92, 118-124`) — 요구가 명시한 'isPending 리셋(mutation.reset)' 절이다. **일괄 삭제의 abort 제외 절도 충족** — `onSuccess: (failed, { signal }) => { if (signal.aborted) return; … }`(`crud.ts:351-355`)가 취소된 일괄의 결과를 무시하고, `settleAll` 의 실패 count 가 무효화를 막는다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 | 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 삭제 다이얼로그에서 확인 후 즉시 Esc → **toast 없이 버튼 상태 복원**되는지 확인 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **10** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · IA-01 · IA-05 · IA-13 |
| `종속` | **13** | TOKEN-02 · TOKEN-03 · TOKEN-04 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-08 · EXC-09 |
| `n-a` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **5** | A11Y-11 · IA-02 · IA-04 · EXC-03 · EXC-04 |
| **합계** | **30** | 10 + 13 + 2 + 5 = **30** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.** **이 섹션에서 gap 이 가장 적다.** 원인이 하나다 — **이 화면만 공용 CRUD 프레임워크를 전량 소비한다**(§1.2). FS-051 이 gap 으로 잡는 `STATE-02`(404 분기)·`EXC-04`의 UI 절(conflict 다이얼로그)·`EXC-08`(제출 락·멱등키)이 여기서는 **셸을 통해 상속**된다.
>
> 남은 5건의 성격:
> - **이 화면만의 결함**: `A11Y-11`(4개 필드가 `aria-invalid`/`describedby` 를 빠뜨림 — **같은 폼의 다른 2개 필드는 옳게 한다**). **저비용 수정**.
> - **계약 부재**: `EXC-04` 의 토큰 절 — **프론트 비용이 거의 0**(UI 가 이미 있다). 서버가 `version` 만 주면 된다(BE-052 §7.3).
> - **앱 전역 횡단**: `IA-02`(h1 이중 + title 모델 — `AppHeader` 소관) · `EXC-03`(쓰기 게이팅 — **`ProductListPage` 선례 있음**).
> - **셸 결함**: `IA-04`(`CrudListShell` 에 `<Pagination>` 이 없다) — **이관 대상이 화면이 아니라 셸**이며, 고치면 소비 화면 전부가 함께 받는다.
>
> **`종속` 13건이 이 화면의 특징이다** — 그만큼 자기 코드로 결정하는 것이 적다. `EXC-08`·`EXC-09` 가 `직접` 이 아니라 `상속` 인 것은 회피가 아니라 사실이다: 이 화면은 `submitLockRef` 를 쓰지 않고 `useCrudForm` 을 부를 뿐이다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·좌측 필터 패널·페이지네이션 range)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:254`)가 이전 행을 유지하고, `useCrudList` 가 `refreshing`(`:72`)을 별도로 파생하며, 셸이 그것을 **가벼운 인디케이터로만** 쓴다 — '· 새로고침 중…'(`CrudListShell.tsx:120`) + `aria-busy={refreshing}`(`:118`). 표는 비워지지 않는다. `staleTime` 30초가 재조회 시점을 지배한다 | 필터 변경 시 이전 행이 유지되고 '· 새로고침 중…' 만 덧붙는지 | **pass** |
| STATE-05 | P1 | 공유 `Empty` 를 3분기 맥락과 함께 소비한다(`ProjectListPage.tsx:201-206` → `CrudTable.tsx:157-167`). 검색 0건 → '조건에 맞는 프로젝트가 없습니다' + '검색 지우기', 필터 0건 → '필터에 맞는 프로젝트가 없습니다' + '필터 초기화', 진짜 0건 → '등록된 프로젝트가 없습니다'. 조사는 `Empty` 가 받침으로 고른다. **미충족 절**: **진짜 0건일 때 생성 CTA 가 없다** — 화면이 `empty.createAction` 을 넘기지 않는다(셸은 그 슬롯을 지원한다 — `CrudTable.tsx:70-71,164`). 요구의 (a) 절('생성 가능 시 primary create CTA')이 미충족 | 시드를 비우고 진입 → '등록된 프로젝트가 없습니다' 옆에 등록 CTA 가 있는지 | **gap(CTA 한정)** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:312-315`), 등록은 목록만(`:290-292`), 삭제도 목록만(`:331-333`) 무효화한다 — 정확히 stale 해진 것만 친다. 저장 후 목록으로 `replace` 이동하므로 자기 변경이 즉시 보인다. **일괄 삭제는 전량 성공에만 무효화한다**(`:353` — 부분 실패 시 다이얼로그가 열려 있어야 하므로 옳다) | 폼에서 단계 변경 후 목록 복귀 시 배지가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | **부분 미충족.** `buttonStyle(`·`tds-ui-btn-` grep **0건**(`pages/sales/projects`) — 목록의 행 액션이 DS `RowActions`, 툴바가 DS `<Button>` 이다. **미충족 둘**: ① 제출 버튼(`:526-528`)이 `loading` prop 대신 손으로 쓴 `{saving ? '저장 중…' : …}` 라벨을 쓴다 — 요구가 명시 금지한 그 패턴 ② 마일스톤 삭제 버튼(`ProjectMilestonesField.tsx:128-137`)이 DS `<Button variant="ghost">` 가 아니라 `iconButtonStyle` 손조립이다(요구의 appliesTo 가 'ghost icon 버튼 포함'을 명시). back 버튼(`:268-276`)도 손조립이나 그것은 IA-07 의 공유 back-link 관례라 위반으로 보지 않는다 | `grep -n "buttonStyle(\|tds-ui-btn-" pages/sales/projects` → **0건**(현재 충족). `loading` prop 사용 여부와 ghost icon 버튼은 리뷰로 | **gap(loading prop · ghost icon 한정)** |
| COMP-02 | P1 | **충족.** 선택 셀이 DS `RowSelectCell`/`SelectAllHeaderCell`(`CrudTable.tsx:124-129,173-178`), 순번이 `SeqCell`/`SeqHeaderCell`(`:130,179`). raw `<input type="checkbox" style={checkboxStyle}>` 선택 마크업 **0건**(`pages/sales/projects` grep). **FS-053 이 필터 체크박스를 손조립한 것과 갈리는 지점** | selectable 표에 raw checkbox 선택 마크업이 0건인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`:163`). raw `<input type="search">` 재구현 **0건**(`type="search"` 는 `SearchField.tsx:63` 내부에만) | `grep 'type="search"' pages/sales/projects` → 0건 | **pass** |
| COMP-04 | P1 | **충족.** zod-required 필드 5개가 전부 `FormField required`(또는 `DateRangeField required`)로 `*` 마커를 렌더한다 — `name`·`accountName`·`stage`·`lostReason`(조건부)·기간. bare `<label style={fieldLabelStyle}>` 로 그린 required 필드 0건. 폼 설명(`:281`)이 '별표(*) 항목은 필수입니다'로 그 규칙을 알린다 | 모든 zod-required 필드의 라벨 옆에 `*` 가 인접하는지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). **셀 수는 `columns.length + 3` 으로 파생된다**(`:113,146`) — 그 절은 충족. 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다(IA-04 gap 과 연동). **셸 결함이라 소비 화면 전부에 걸린다** | `grep "length: 5" shared/crud/CrudTable.tsx` → 0건이어야 한다. 현재 1건 | **gap(행 수 한정 · 셸)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다. **셸 결함** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재 · 셸)** |
| COMP-08 | P2 | **충족.** 마지막 컬럼이 요구의 (b) 형태다 — 인라인 편집 테이블이므로 `RowActions`(연필/휴지통)(`CrudTable.tsx:190-199`). 중복 '상세' secondary 버튼 **없음**. 액션이 2개라 ActionMenu 승격 임계(3개)에 미달 — 규칙대로 고정 버튼이다. **FS-053 이 '상세' 버튼을 손조립한 것과 갈리는 지점** | 읽기전용 리스트가 아니므로 RowActions 가 옳은지, 중복 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 프로젝트명·거래처 셀에 truncate 가 없다(`tdStyle` 그대로 — `:139-140` → `CrudTable.tsx:184`). 긴 이름이 열을 넓혀 표 레이아웃을 민다. 9컬럼 표에 가로 scroll 컨테이너도 없다 | 200자 프로젝트명 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-11 | P1 | **기간 필터가 아니라 기간 입력**이라 요구의 appliesTo('기간 필터 리스트')와 정확히 겹치지 않는다. 그러나 요구의 실질 절 중 둘이 이 표면에 걸린다: **① `start ≤ end` 강제 — 충족**(`validation.ts:68-75` — '종료일은 시작일보다 빠를 수 없습니다.' 인라인 메시지, silent empty 아님). **② preset('오늘/최근 7일/이번 달/지난 달') — 미충족**(`DateRangeField` 에 preset 이 없다). **③ URL 반영 — N/A**(필터가 아니라 폼 값이다). 추가로 **시작·종료 오류가 같은 슬롯을 공유해**(`ProjectFormPage.tsx:232` — `errors.startAt?.message ?? errors.endAt?.message`) 동시에 하나만 보인다 | 종료일<시작일 시 인라인 검증 에러가 뜨는지(pass). preset 이 있는지(gap) | **gap(preset 한정)** |
| COMP-12 | P2 | 산출물·메모 textarea 가 `TextareaField` 의 실시간 카운터를 갖는다(`N/1000`·`N/500` — `TextareaField.tsx:52`). 프로젝트명은 `maxLength=80`(`:304`)이나 **카운터가 없다**(`FormField counter` 미사용). **상한 근접 경고가 없고 `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 그 증상. counting 기준(UTF-16 code unit)도 명시되지 않았다. **거래처는 `maxLength` 가 없어** 61자 입력 후 제출에서야 거절된다 — 요구가 막으려는 '서버 전용 검증'의 결이다 | 1000자 근접 시 경고가 뜨는지, 프로젝트명 80자 근접 시 카운트가 보이는지 | **gap** |
| FEEDBACK-01 | P1 | **충족 — 배치 규칙을 전 경로에서 만족한다.** read 실패=인라인 Alert(`CrudListShell.tsx:157` · `ProjectFormPage.tsx:245`) · write 성공=toast(`useCrudForm.ts:222` · `useCrudList.tsx:108,146`) · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:161,174` — 요구가 명시한 'modal 뒤에 숨는 toast 금지'를 지킨다) · 폼 저장 실패=폼 배너(`FormServerError`). page 가 임의 배너 state 를 갖지 않는다 | 강제 실패 delete 가 다이얼로그 배너로, 독립 write 실패가 폼 배너로, read 실패가 인라인 Alert 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | **충족.** 모든 mutation 에 성공·실패 피드백이 있다 — create/update(toast / `FormServerError`+참조코드 / conflict 다이얼로그 / 422 필드) · delete(toast / 다이얼로그 배너) · bulk delete(toast / 'N건 중 M건' 배너). no-op 클릭 0건 | `?fail=sales-projects:save` · `:delete` 로 각각 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | **충족(confirm 경로).** 모든 delete 가 delete-intent `ConfirmDialog` 를 열고 문구가 비가역성을 고지한다 — '이 작업은 되돌릴 수 없습니다.'(`useCrudList.tsx:158,170`). 단일 미확인 클릭으로 실행되는 delete 0건. undo window 는 없으나 요구가 '**또는**'으로 둔 절이다. **예외**: 마일스톤 행 삭제(`ProjectMilestonesField.tsx:128-137`)는 확인 없이 즉시 제거되나, 그것은 **서버 delete 가 아니라 미저장 폼 상태의 편집**이며 이탈 가드(FEEDBACK-04)가 최종 방어선이다 | 모든 서버 delete 가 ConfirmDialog 를 여는지 | **pass** |
| A11Y-05 | P1 | `SelectField` 는 이 화면에서 **isInvalid 를 쓰지 않는다** — 단계 select(`:351-365`)에 오류 상태가 없고 필터 select(`:172-183`)도 마찬가지다. **표면이 없어 이 요구가 걸리지 않는다.** (다만 BE-052 §7.2 의 422 `INVALID_STAGE_TRANSITION` 이 도입되면 `stage` 에 오류가 생기고 그때 이 요구가 살아난다 — §5 #3) | 이 화면에 `<SelectField isInvalid>` 가 0건인지 | **n-a(표면 부재)** |
| A11Y-08 | P1 | **미충족.** 행 클릭이 `rowActivateProps`(마우스 전용 — `<tr>` 에 tabIndex 없음, `useRowNavigation.ts:9-11` 이 그 전제를 선언)이고 **프로젝트명 셀이 링크가 아니다**(`:139` — 텍스트 노드). 키보드 등가물은 `RowActions` 의 연필 버튼(`CrudTable.tsx:192-197`, 접근 이름이 프로젝트명 기반) — **도달은 가능하므로 요구의 최소선('row 내 keyboard-focusable 등가물')은 충족**한다. 다만 요구가 기대하는 형태는 'focusable **name link**' 다. **FS-051 은 제목을 링크로 만들어 pass 다** — 같은 섹션에서 갈렸다. **읽기 전용 상세가 없어** 이름 링크의 목적지가 편집 폼이 되므로 IA 결정이 선행돼야 한다(FS-052 §7 #8) | 행을 Tab 해서 같은 detail 을 여는 컨트롤에 도달하는지 | **pass(최소선 · 형태는 미달)** |
| A11Y-13 | P1 | **충족.** ① **검증 실패 시 첫 invalid 필드로 포커스** — `useCrudForm.ts:260` 이 `form.handleSubmit(onValid, onInvalid)` 를 부르고, RHF 의 `shouldFocusError` 기본값이 그 일을 하며, 주석(`:240-245`)이 '`onInvalid` 를 명시해 **계약으로** 고정한다(그 기본값이 바뀌어도 동작이 유지된다)'고 선언한다. ② **서버 422 도 첫 필드로 포커스** — `setFocus(first.field)`(`:190`). **미충족 절**: **폼 진입 시 첫 필드 자동 포커스가 없다**(`autoFocus` 0건, `setFocus` 초기 호출 없음) — 요구의 두 절 중 하나 | 빈 required 로 제출 → activeElement 가 '프로젝트명' 인지(pass 예상). 폼 진입 시 첫 필드에 포커스가 있는지(gap) | **gap(진입 포커스 한정)** |
| A11Y-16 | P1 | **부분 미충족.** 충족 표면: 표 `aria-busy`·caption(`CrudTable.tsx:116-120`) · 필터 `aria-label`(`:175`) · 라이브 리전(`CrudListShell.tsx:107`) · `Empty role="status"` · 마일스톤 행의 `aria-label` 3종(`ProjectMilestonesField.tsx:108,117,124`) · 진척 막대의 이중 인코딩(색 + 숫자 라벨 — `ProjectListPage.tsx:151-155`) · DS 컴포넌트의 focus ring. **미충족 둘**: ① **`PipelineStepper` 의 현재 단계가 색·테두리 굵기로만 인코딩**된다(`PipelineStepper.tsx:41,56-61`) — 번호 점이 `aria-hidden`(`:85`)이라 AT 는 라벨 5개만 읽고 **어디까지 진행됐는지 알 수 없다.** `aria-current="step"` 이 없다. `<ol aria-label="파이프라인 단계">` 라는 시맨틱은 옳으나 상태가 빠졌다 ② **4개 필드의 오류가 붉은 테두리로만 인코딩**된다(A11Y-11 과 같은 뿌리) | 스텝퍼에 `aria-current="step"` 이 있는지. 흑백/색맹 시뮬레이션에서 현재 단계가 읽히는지 | **gap** |
| ERP-01 | P1 | stage→tone 매핑이 **단일 레지스트리**다 — `STAGES`(`types.ts:63-70`)의 각 항목이 `tone` 을 데이터로 들고 `stageTone`(`:85-87`)이 그것을 읽는다. per-page meta helper 를 만들지 않았고 목록(`:137`)·폼 미리보기(`:494,500`)가 같은 함수를 소비한다 — **같은 값이 두 화면에서 같은 색이다**(FS-051 이 갈린 지점을 이 화면은 피했다). 다만 그 레지스트리가 `pages/sales/projects` 지역이라 견적/계약과 통합된 앱 전역 레지스트리는 아니다(요구가 `quoteStatusMeta` 를 명시 지목) | 모든 stage 가 정의된 tone 으로 해석되는지. 목록·폼에서 같은 색인지 | **pass(도메인 내)** |
| ERP-06 | P1 | **부분 미충족.** 사용자 대상 문자열이 존댓말로 일관되고 금액·건수가 `formatWon`/`formatNumber` 를 경유한다. **미충족 둘**: ① **폼 조회 실패 문구가 비문**이다 — '프로젝트 찾을 수 없습니다'/'프로젝트 불러오지 못했습니다'(`:249-250`)에 조사가 빠졌다(ERP-13 참조) ② **기간 셀이 인라인 포맷**이다 — `` `${item.startAt} ~ ${item.endAt}` ``(`ProjectListPage.tsx:145`)가 `shared/format` 을 경유하지 않는 이 화면의 유일한 날짜 표기다 | 셀에 raw `toString()`/인라인 날짜 조립이 없는지 | **gap** |
| ERP-07 | P2 | 예상매출 셀이 `numeric: true` 로 우측 정렬 + tabular-nums 인데(`CrudTable.tsx:184` → `numericCellStyle`) **`formatWon` 이 '원'을 숫자에 붙인다**(`_shared/business.ts:45-47`) → 단위가 마지막 자릿수를 따라다녀 **다행 금액 컬럼의 수직 정렬이 깨진다.** 요구가 정확히 지목한 그 패턴(`formatWon` caller) | 다행 금액 컬럼의 자릿수가 정렬되는지 | **gap** |
| ERP-08 | P2 | 금액이 `formatWon`(→`formatNumber`), 진척이 `formatNumber`(`:154`), 확률이 `formatNumber`(`ProjectFormPage.tsx:507`)를 경유한다. **미충족**: **기간 셀이 `startAt`/`endAt` 원본 문자열을 직접 조립**한다(`:145`) — 유효하지 않은 날짜의 폴백도 없다(`formatDate` 를 안 거치므로). 마일스톤 목표일도 `<input type="date">` 의 원본 값 그대로다(입력이라 정당하다) | 테이블 셀에 raw numeric toString 이 없는지. 날짜가 공유 formatter 를 경유하는지 | **gap(기간 셀 한정)** |
| ERP-13 | P1 | **부분 미충족 — 헬퍼가 있는데 쓰지 않은 자리가 있다.** 충족: ① 저장 토스트 `` `${entityLabel}${objectParticle(entityLabel)} ${verb}했습니다.` ``(`useCrudForm.ts:222`) → '프로젝트를 등록했습니다.' ② 삭제 확인·토스트 `` `'${nameOf(target)}'${objectParticle(nameOf(target))} 삭제했습니다.` ``(`useCrudList.tsx:108,158`) — 이름의 받침으로 고른다 ③ **검증 오류가 `topicParticle` 을 쓴다** — `` `${label}${topicParticle(label)} 숫자만 입력할 수 있습니다.` ``(`validation.ts:28,31`) → '확률은'·'진척률은' ④ `Empty` 의 '이/가'(`Empty.tsx:25-27`). **사용자 대상 리터럴 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 ✔**. **미충족**: **`ProjectFormPage.tsx:249-250` 이 조사를 통째로 빠뜨렸다** — '프로젝트 찾을 수 없습니다.'/'프로젝트 불러오지 못했습니다.' 는 **비문**이다. 리터럴 폴백형(`(를)`)을 출하하지 않은 것은 맞으나 **올바른 particle 을 렌더하라**는 요구의 첫 문장을 어긴다. **형제 화면은 옳다** — `QuoteFormPage.tsx:236-237`('견적을') · `ContractFormPage.tsx:222-223`('계약을'). `objectParticle('프로젝트')` 가 같은 파일이 쓰는 훅 안에 이미 있다(`useCrudForm.ts:13,222`) — **헬퍼가 있는데 쓰지 않아 생긴 비문** | `grep -nE "이\(가\)\|을\(를\)\|은\(는\)\|\(으\)로" pages/sales/projects` → **0건**(그 절 pass). `/sales/projects/nope/edit` 진입 → **'프로젝트 찾을 수 없습니다' 가 보이면 gap**('프로젝트를' 이어야 한다) | **gap** |
| ERP-14 | P1 | **미충족.** 요구가 명시한 4타입 중 이 화면에 **금액(예상매출)과 날짜**가 있다. **금액**: 실시간 천단위 마스킹이 없다 — `<input type="text" inputMode="numeric">`(`:388-397`)에 그대로 친다. **붙여넣은 '42,000,000' 이나 '42,000,000원' 은 `^\d+$` 검증에 걸려 거절**되고 운영자가 콤마를 손으로 지워야 한다 — 요구가 정확히 지목한 그 증상('콤마 붙은 「1,000,000」의 거절 이유를 못 안다'). `toInput` 의 `digitsToNumber`(`:145-148`)는 콤마를 지울 수 있지만 **검증이 먼저 막는다.** 오류 문구도 '예상매출은 숫자만 입력할 수 있습니다.' 라 **왜 콤마가 안 되는지** 말하지 않는다. **날짜**: `DateRangeField` 가 네이티브 `<input type="date">` 라 마스킹이 필요 없다(브라우저 소관) | 예상매출에 '42,000,000' 붙여넣기 → **거절되면 gap**(1234000 으로 parse 돼야 한다). 입력 중 천단위 구분이 실시간으로 들어가는지 | **gap** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — `CrudListShell` 이 `visibleItems` 전량을 `CrudTable` 로 넘기고(`:136`) `items.map`(`CrudTable.tsx:171`)이 그대로 그린다. cap·virtualization 이 없다. 프로젝트는 누적 증가 컬렉션이다(BE-052 §7.4). **완화 요인**: 검색이 250ms 디바운스를 거친다(COMP-10). 9컬럼 표에 가로 scroll 컨테이너가 없다. **셸 결함** | 1,000건 픽스처로 scroll/선택이 매끄러운지 | **gap(셸)** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트(`useCrudForm.ts:93`)·다이얼로그 취소(`useCrudList.tsx:87,119`)에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족 — 이 섹션에서 가장 낫다.** 에러 타입 `HttpError`(status 보유)가 존재하고 어댑터가 정확한 status 를 던지며, **화면이 세 갈래를 실제로 분기한다**: **404 → not-found surface**(`:248` — retry 숨김) · **409 → conflict flow**(`:532` 다이얼로그) · **422 → field-level 인라인 error**(`useCrudForm.ts:182-192`). 요구가 나열한 6갈래 중 **3갈래가 지정 surface 를 갖는다** — 다른 담당 화면은 0갈래다. **미충족 3갈래**: **403 → 권한 메시지**(현재 generic 배너로 뭉개짐) · **429 → backoff 메시지**(뭉개짐) · **5xx → generic retriable**(배너 + 참조코드는 있으나 429·403 과 구분 없음). 목록 배너(`CrudListShell.tsx:159`)도 status 로 분기하지 않는다 | `?status=save:403` · `save:429` · `save:500` 이 서로 다른 surface 를 그리는지. `?status=detail:404` vs `detail:500` 은 pass 예상 | **gap(403·429 한정)** |
| EXC-07 | P1 | **충족.** 서버 422 의 `violations` 를 RHF `setError(violation.field, { type:'server', message })` 로 **각 필드에 꽂고 첫 필드로 `setFocus`** 한다(`useCrudForm.ts:182-192`). 클라이언트 zod error 와 **같은 인라인 슬롯을 재사용**하고, form-level 배너는 generic error 용으로 예약된다(`:194`). **주의**: 그 슬롯이 실제로 보이려면 `FormField error` 가 배선돼 있어야 하는데 **`stage` 에는 그것이 없다**(`:350` 의 `FormField` 에 `error` prop 없음) — BE-052 §7.2 의 `INVALID_STAGE_TRANSITION` 422 가 도입되면 **꽂혀도 안 보인다**(§5 #3) | field path 있는 422 fixture(`quoteNo` 대응 = `name`)가 인라인 error + 포커스를 내는지 | **pass(단 `stage` 슬롯 부재)** |
| EXC-10 | P1 | 일괄 삭제가 `Promise.allSettled` 의미(`settleAll` — `crud.ts:349`)를 쓰고 **부분 결과를 'N중 M건 실패'로 보고**하며(`useCrudList.tsx:138-142`) **실패 시 다이얼로그를 열어둔다**(`:143` return). 전량 성공에만 invalidate + selection clear(`:144-147`). **미충족**: **실패 id 를 반환하지 않는다**(`settleAll` 반환이 `number`) → **retry 가 전체를 재실행해 이미 성공한 것을 재요청**한다. 요구가 정확히 지목한 그 상태. **셸 결함** | 부분 실패 bulk delete 후 실패 항목만 선택 유지되고 retry 가 그것만 재요청하는지 | **gap(셸)** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족 — 이 섹션에서 유일하다.** `useCrudForm.ts:143-149` 가 `isNotFound(loadError)` 로 `loadFailure: 'not-found' \| 'error'` 를 파생하고 주석(`:138-142`)이 이유를 밝힌다('예전에는 `loadFailed = error !== null` 하나로 뭉개, 삭제된 :id 로 들어와도 「다시 시도」 를 권했다 — 재시도해도 영원히 없다'). `ProjectFormPage.tsx:242-264` 가 그것을 소비해 **404 → '목록으로'만 / error → '다시 시도' + '목록으로'** 를 그린다. 무한 spinner·crash 없음. 어댑터가 404 를 `HttpError` 로 던진다(`crud.ts:105-107`). **⚠ 문구는 비문**(ERP-13 gap) | `/sales/projects/nope/edit` → **'다시 시도'가 없는** not-found surface 인지. `?status=detail:500` → retry + list 둘 다인지 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장·삭제 모두 비관적(pending 잠금 → 성공 후 무효화·이동). `onMutate`/`setQueryData` **0건**(grep). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다.** un-rolled-back optimistic write 0건 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | **미충족.** ① **selection scope 가 암묵적**이다 — `toggleAll(visibleItems.map(...))`(`CrudListShell.tsx:143-147`)이 **현재 보이는 행만** 담는데 라벨은 '이 페이지의 프로젝트 전체 선택'(`CrudTable.tsx:125`)이라 페이지 개념이 없는 화면에서 오해를 부른다(실제로는 '필터된 전량'이다 — 페이지네이션이 없으므로). ② **Shift-click 범위 선택이 없다.** ③ **임계값 초과 강화 confirm 이 없다** — 1,200건을 선택해도 '선택한 프로젝트 1,200건을 삭제하시겠습니까?' 한 줄이다(count 는 echo 하나 type-to-confirm 이 없다). ④ **진행률·취소가 없다** — `settleAll` 이 병렬로 다 쏘고 끝날 때까지 다이얼로그가 busy 다. **BE-052 §7.7 이 지적하듯 100건이면 EP-05 의 분당 30 레이트리밋에 즉시 걸린다.** **셸 결함** | Shift-click 로 범위 선택되는지. 1,200건 bulk delete 가 진행률을 보이고 취소 가능한지 | **gap(셸)** |
| EXC-20 | P1 | **충족.** 5xx 실패 시 `<FormServerError serverError={serverError} errorReference={errorReference} />`(`:286`)가 **복사 가능한 참조 코드**를 보인다 — `errorReference = referenceOf(cause)`(`useCrudForm.ts:195`), `HttpError.reference` = `TDS-<Date.now() base36>-<3자리 base36>`(`shared/errors/http-error.ts:68-75`). 친근한 메시지('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')와 함께 나온다. raw 서버 body/stack/status code 를 prose 로 렌더하지 않는다. **미충족 절**: **삭제 실패에는 참조 코드가 없다** — `useCrudList.tsx:112` 가 고정 문구만 쓴다 | `?status=save:500` 이 복사 가능한 reference code 를 보이는지(pass). `?status=delete:500` 은(gap) | **pass(폼) / gap(삭제)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-052 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 등록·수정 p95 | ≤ 600ms | 위와 동일 |
| 단건 삭제 p95 | ≤ 400ms | 위와 동일 |
| **일괄 삭제 p95** | **≤ 400ms × 1**(병렬이므로 건수와 무관) — **단 레이트리밋이 실질 상한이다** | **미충족(구조)** — `settleAll` 이 N개를 **동시에** 쏜다(`crud.ts:349-350`). 100건 선택 시 `DELETE` 100개가 동시 발사돼 **EP-05 의 분당 30 에 즉시 걸린다**(BE-052 §7.7). 서버 부하 예산이 클라이언트 선택 수에 직결된다 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · **커밋당 1회 필터** | **충족** — 250ms 디바운스 + 조합 중 커밋 금지(COMP-10). `useMemo` 로 메모(`:128-131`) |
| **폼 리렌더** | 입력당 최소 | **미충족(경미)** — 폼이 `watch('stage')`·`watch('startAt')`·`watch('endAt')`·`watch('milestones')`·`watch('deliverables')`·`watch('probability')`·`watch('expectedRevenue')`·`watch('note')` **8개를 구독**한다(`:225-231,465,480`). 미리보기(EL-034)가 실시간이어야 하므로 의도적이나, **모든 키 입력이 폼 전체를 리렌더**한다 — 마일스톤 12행이 붙어 있으면 비용이 는다 |
| 저장 요청 크기 | ≤ 8KB | **충족** — `ProjectInput` 이 마일스톤 12개(상한) + 산출물 1000자 + 메모 500자로 **상한이 있다**. FS-051 의 타임라인처럼 무한 증가하지 않는다 |
| 메모리 | 목록 전량 + 폼 1건 | 전량 보유. **목록 응답에 모든 프로젝트의 `note`(협상 카드)·`lostReason`(경쟁 패인)·마일스톤이 실린다** — BE-052 §7.4 |
| 번들 | 이 화면 고유 코드 ≤ 25KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). **다른 도메인 모듈을 import 하지 않는다**(FS-051 이 `quotes/data-source` 를 끌어오는 것과 대조) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:156-165`). **툴바는 남는다** — 조건을 잃지 않는다 |
| 폼 조회 실패 (404) | '찾을 수 없습니다' + '목록으로'(retry 없음) | **충족**(EXC-12 pass). **⚠ 문구가 비문** |
| 폼 조회 실패 (5xx) | '불러오지 못했습니다' + '다시 시도' + '목록으로' | **충족**. **⚠ 문구가 비문** |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 실패(409) | conflict 다이얼로그 + 입력 보존 + reload/dismiss | **충족**(EXC-04 의 UI 절 pass) |
| 저장 실패(422) | 필드 인라인 + 첫 필드 포커스 | **충족**(EXC-07 pass) — **단 `stage` 는 슬롯이 없어 안 보인다** |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09) |
| 삭제 중 다이얼로그 닫기 | abort + pending 리셋 + false toast 없음 | **충족**(`useCrudList.tsx:86-92` — `mutate.reset()` 포함) |
| 동시 편집(둘 다 존재) | 409 → conflict 다이얼로그 | **미충족** — 토큰이 없어 409 자체가 안 난다(last-write-wins). **UI 는 이미 준비돼 있다**(EXC-04) |
| 먼저 삭제된 항목 편집 | 409 → conflict 다이얼로그 | **충족** — 어댑터의 존재 여부 기반 409 가 이 경합은 잡는다 |
| 먼저 삭제된 항목 삭제 | 409 → '이미 삭제됨' 안내 | **부분 충족** — 409 는 나지만 화면이 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`useCrudList.tsx:112`)로 뭉갠다 → **영원히 없는 항목에 재시도를 권한다**(BE-052 §7.7) |
| 일괄 삭제 부분 실패 | 다이얼로그 유지 + 실패 건수 + 실패분만 retry | **부분 충족** — 다이얼로그·건수는 되나 **실패 id 를 모른다**(EXC-10 gap) |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 폼을 버린다(EXC-19 P1). **단 `returnUrl` 에 필터 조건이 실려 목록 view 는 복원**(IA-13 의 파생 이득) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 동적 배열 필드(마일스톤)의 축 — quality-bar 밖

quality-bar 는 동적 배열 편집기를 다루지 않는다. 이 화면에 그 표면이 실재하므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 각 행이 독립적으로 식별된다 | **부분 충족** — `key={milestone.id}`(`ProjectMilestonesField.tsx:100`)이나 id 가 `ms-new-<Date.now()>-<0~1000 난수>`(`:59-64`) 라 **1/1001 로 충돌 가능**하다. 충돌하면 `patch(id, …)`(`:79-83`)가 두 행을 함께 편집한다 |
| 행 추가·삭제가 다른 행의 값을 흔들지 않는다 | **충족** — `map`/`filter` 로 불변 갱신(`:80-84`) |
| 상한이 명시되고 도달 시 이유가 보인다 | **부분 충족** — 힌트에 '(최대 12개)'가 **상시** 있으나(`:94-95`), 12개 도달 시 **추가 버튼이 설명 없이 사라진다**(`:142`). 사라짐은 상태 변화인데 announce 되지 않는다 |
| 행별 오류를 행에서 보여준다 | **미충족** — 오류가 **필드 전체 1개 문구**다('모든 마일스톤의 이름을 입력하세요.' — `validation.ts:96`). `path: ['milestones']`(`:94,104`)가 배열 전체를 가리켜 **12행 중 어느 행인지 알 수 없다.** 행 input 에 `aria-invalid` 도 없다 |
| 행 삭제가 실수로부터 보호된다 | **미충족(수용)** — 확인 없이 즉시 제거(`:134`). 미저장 폼 상태라 이탈 가드가 최종 방어선이고, undo 는 없다. **12행을 잘못 지우면 되돌릴 방법이 없다**(저장 전이면 이탈→재진입, 저장 후면 복구 불가) |
| 배열 길이가 서버에서 강제된다 | **미충족** — zod 스키마에 개수 상한이 **없다**(`validation.ts:50` — `z.array(milestoneSchema)`). **UI 만 12개에서 버튼을 감춘다.** 조작된 클라이언트는 100개를 보낼 수 있다 → BE-052 §3 이 서버 강제를 신설 |
| 행 id 를 서버가 소유한다 | **미충족** — 클라이언트 id 가 그대로 저장된다. **'신규'라는 뜻의 `ms-new-` 접두사가 3년 된 마일스톤에 영구 보존**된다(BE-052 §7.3) |
| 진척 요약이 사실과 일치한다 | **미충족 — 힌트가 거짓말이다.** '완료 표시에 따라 아래 진척률이 계산됩니다'(`:94`)라 쓰여 있지만 `milestoneProgress`(`:153`)는 **표시 전용**이고 `progress` 입력 필드를 바꾸지 않는다. 운영자는 토글을 켜고 진척률이 안 바뀌는 것을 본다 |

### 4.4 파이프라인 무결성 — quality-bar 밖

| 요구 | 현재 상태 |
|---|---|
| 단계는 정의된 흐름을 따른다 | **미충족.** 전이 규칙이 어느 층에도 없다 — 리드에서 곧장 수주로 갈 수 있고 **`PipelineStepper` 는 그 순간 5칸을 모두 채워 그린다**(`done = index <= currentIndex` — `PipelineStepper.tsx:80`). **화면이 '이 단계들을 거쳤다'고 말하는데 실제로는 아니다.** BE-052 §7.2 |
| 확률은 단계와 정합한다 | **미충족(설계)** — 단계 변경이 확률을 기본값으로 덮되(`:234-238`) 그 뒤 자유 조정이 가능하다. **조정한 값이 단계 변경 한 번에 비가역으로 사라진다**(협상 85% → 제안 → 협상 = 70%) |
| 실주 사유는 보존된다 | **미충족.** 단계를 실주에서 되돌리면 `toInput` 이 `lostReason` 을 `''` 로 비운다(`:168`) — **경쟁 패인 기록이 클릭 한 번에 사라지고 되돌릴 수 없다** |
| 예상매출이 신뢰 가능한 범위다 | **미충족.** `^\d+$` 만 본다 — 상한이 없다. 오타('420000000')가 그대로 저장돼 파이프라인 합계를 오염시키고, `weightedRevenue` 의 `Math.round(expectedRevenue * probability / 100)`(`types.ts:96`)가 `MAX_SAFE_INTEGER` 를 넘으면 **정밀도가 조용히 깨진다.** BE-052 §3 이 1조 상한을 신설 |
| 거래처별 집계가 가능하다 | **미충족.** `accountName` 이 자유 텍스트라 '(주)한빛소프트웨어'와 '한빛소프트웨어'가 두 거래처가 된다. **CRM 파이프라인의 첫 번째 질문에 답할 수 없다.** BE-052 §7.5 【최우선 미결】 |
| 수주가 계약으로 이어진다 | **미충족.** `Project` 에 `contractId`/`quoteId` 가 없다. FS-051 이 `quoteId` 로 양방향 링크를 만든 것과 **같은 섹션 안에서 전략이 갈렸다** |
| 삭제가 집계를 조용히 바꾸지 않는다 | **미충족.** 삭제 권한 분리가 없어(EXC-03) `operator` 도 프로젝트를 지울 수 있다 — **진 기회를 지우면 전환율이 좋아진다.** BE-052 §7.6 이 `admin` 전용으로 판정 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | A11Y-11 · A11Y-16 | **P0** · P1 | **확률·예상매출·진척률·실주 사유 4개 필드가 오류를 렌더하면서 `aria-invalid`·`aria-describedby` 를 주지 않는다** — 시각 신호가 붉은 테두리뿐(색만의 인코딩). **같은 폼의 프로젝트명·거래처는 옳게 한다** — 한 파일 안에서 규칙이 갈렸다. 마일스톤 오류는 id 조차 없다 | 이 화면 | A11 change_request (**최우선 · 저비용**) |
| 2 | EXC-04 | **P0** | **유령 저장·conflict UI 는 충족**(`createCrudAdapter` 409 + `FormConflictDialog`). 남은 것은 **낙관적 동시성 토큰**(`Project` 에 `version` 없음) → **동시 편집 = last-write-wins**. **프론트 비용 거의 0** — `ProjectInput` 에 `version` 을 얹고 어댑터가 `If-Match` 로 보내면 화면 코드 0줄 | BE 계약 + 어댑터 | **A63 (BE-052 §7.3 — 최우선 · 저비용)** · A11 |
| 3 | EXC-03 | **P0** | write 액션 게이팅 미배선 — 등록·행 액션·일괄 삭제·제출이 무조건 렌더. **읽기 전용 상세가 없어 read 만 되는 역할이 편집 폼 전체를 본다.** **`ProductListPage` 가 같은 셸에서 게이팅하는 선례 있음.** BE-052 §7.6 이 삭제를 `admin` 전용으로 판정하므로 계약 위반이 UI 로 드러난다 | **앱 전역** | A11 change_request (횡단 배치) |
| 4 | IA-02 | **P0** | **사유가 바뀌었다** — `findCoveringLeaf` 가 브랜치 폴백을 해소해 AppHeader 는 이제 '프로젝트'를 보인다. 남은 것은 **`<h1>` 이중**(AppHeader + `:279`)과 **행위 미반영**. `nav-config.ts:293-295` 가 그 모델을 **의도로 선언**하므로 요구와 앱 설계가 충돌한다 — 어느 쪽을 바꿀지 결정이 필요하다 | **앱 전역**(`AppHeader`·title 모델) | A40 · A11 |
| 5 | IA-04 · ERP-15 · COMP-06 · COMP-07 · EXC-10 · EXC-18 | **P0** · P1 · P2 | **`CrudListShell` 에 `<Pagination>` 이 없다.** 스켈레톤 `length: 5` · `SeqCell` 에 `startIndex` 없음 · `settleAll` 이 실패 id 미반환 · Shift 범위 선택/진행률/취소 없음이 **전부 셸 결함**이다. **이관 대상이 화면이 아니라 셸** — 고치면 소비 화면 전부가 함께 받는다. IA-13 은 이미 pass 라 `page` 키만 얹으면 되고 `clampPage` 도 준비됨 | **`shared/crud` 셸** | A11 (셸 배치) · A63 (BE-052 §7.4) |
| 6 | ERP-13 · ERP-06 | P1 | **폼 조회 실패 문구가 비문이다** — '프로젝트 찾을 수 없습니다'/'프로젝트 불러오지 못했습니다'(`:249-250`)에 조사 '를' 이 빠졌다. **형제 화면은 옳다**(`QuoteFormPage`·`ContractFormPage`). `objectParticle` 이 같은 훅 안에 있는데 쓰지 않았다. (`AccountFormPage.tsx:230-231` 이 같은 병 — 담당 밖이나 함께) | 이 화면 | A11 change_request (**저비용**) |
| 7 | (BE-052 §7.5) | — | **프로젝트가 고립된 레코드다** — 거래처가 참조가 아니라 자유 텍스트 사본이고 견적·계약·문의 연결이 없다. **거래처별 파이프라인 집계가 불가능**하다. **거래처 참조(`accountId`) 결정이 백엔드 착수보다 앞서야 한다** — 자유 텍스트로 저장하기 시작하면 소급 정규화가 불가능 | 도메인 + BE + 이 화면 | **A01 (최우선 · 선행)** · A63 |
| 8 | (BE-052 §7.2) | — | **단계 전이 규칙이 어느 층에도 없다** — `PipelineStepper` 는 읽기 전용 표시라 아무것도 막지 않고, 리드→수주가 통과하면 **스텝퍼가 5칸을 다 채워 거짓말을 한다.** 실주 복귀 시 `lostReason` 이 조용히 사라진다. **A01 확정 선행** | 도메인 + BE + 이 화면 | **A01 (선행)** · A63 · A11 |
| 9 | (BE-052 §7.2) | — | **`stage` select 에 인라인 에러 슬롯이 없다**(`FormField` 에 `error` prop 없음) — #8 의 422 가 도입돼도 `setError('stage')` 가 **화면에 안 뜬다.** EXC-07 의 pass 가 이 필드에서만 무효 | 이 화면 | A11 (#8 과 한 묶음) |
| 10 | A11Y-16 | P1 | `PipelineStepper` 의 현재 단계가 **색·테두리 굵기로만 인코딩** — 번호 점이 `aria-hidden` 이라 AT 는 어디까지 진행됐는지 모른다. `aria-current="step"` 없음 | 이 화면 | A11 change_request |
| 11 | ERP-14 | P1 | 예상매출에 **실시간 천단위 마스킹이 없다** — 붙여넣은 '42,000,000' 이 거절되고 오류 문구가 이유를 말하지 않는다. `digitsToNumber` 가 있는데 검증이 먼저 막는다 | 이 화면 | A11 change_request |
| 12 | (§4.3) | — | **마일스톤 힌트가 사실과 다르다** — '완료 표시에 따라 진척률이 계산됩니다'인데 계산되지 않는다. **문구를 고칠지 자동 계산을 넣을지는 도메인 결정**(진척률이 파생이면 입력 필드가 아니어야 한다) | 도메인 + 이 화면 | A01 (결정) · A11 |
| 13 | (§4.3) | — | 마일스톤 **행별 오류 미구분**(12행 중 어디인지 모름) · **id 충돌 가능**(1/1001) + `ms-new-` 접두 영구 보존 · **개수 상한이 zod 에 없다**(UI 만 막음) · 삭제에 undo 없음 | 이 화면 + BE 계약 | A11 · A63 (BE-052 §7.3 · §3) |
| 14 | (§4.4) | — | **단계 변경이 확률을 확인 없이 비가역으로 덮는다** — 기본 확률을 **등록 시 초기값**으로만 쓰는 것이 옳을 수 있다 | 도메인 + 이 화면 | A01 (결정) · A11 |
| 15 | (§4.4) · (BE-052 §3) | — | **예상매출에 상한이 없다** — 오타가 파이프라인 합계를 오염시키고 `weightedRevenue` 의 정밀도가 조용히 깨진다. **지금 당장 넣을 수 있다**(zod 한 줄 + 서버 400) | 이 화면 + BE 계약 | A63 · A11 (**저비용**) |
| 16 | EXC-06 | P1 | 403·429 가 generic 배너로 뭉개진다(404·409·422 는 pass). 목록 배너도 status 로 분기하지 않는다 | 이 화면 | A11 |
| 17 | (BE-052 §7.7) | — | **삭제 다이얼로그가 409 를 뭉갠다** — '이미 삭제된 항목입니다.'가 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'로 덮여 **영원히 없는 항목에 재시도를 권한다.** 폼(EXC-12)이 푼 문제를 삭제가 그대로 갖고 있다. 삭제 실패에 참조 코드도 없다(EXC-20 부분 gap) | **`shared/crud` 셸** | A11 (셸 배치) |
| 18 | (BE-052 §7.7) · (§4.1) | — | **일괄 삭제가 단건 N회 병렬**이라 100건 선택 시 EP-05 의 분당 30 에 즉시 걸린다. 서버 일괄 엔드포인트를 만들지 않았으므로 **UI 상한 또는 순차 실행 + 진행률**이 필요하다 | **`shared/crud` 셸** + BE | A11 · A63 |
| 19 | COMP-01 · COMP-12 · COMP-09 | P1 · P2 | 제출 버튼이 `loading` prop 미사용 · 마일스톤 삭제가 ghost icon 손조립 · 프로젝트명에 카운터 없음 + 거래처에 `maxLength` 없음 · 셀 truncate 없음 | 이 화면 | A11 |
| 20 | ERP-07 · ERP-08 | P2 | 금액 셀의 '원' 이 숫자에 붙어 자릿수 정렬이 깨진다 · **기간 셀이 인라인 날짜 조립**(`shared/format` 미경유, 폴백 없음) | 이 화면 + `_shared/business` | A11 |
| 21 | STATE-05 · A11Y-13 · COMP-11 | P1 | 진짜 0건에 생성 CTA 없음(`createAction` 미전달) · 폼 진입 첫 필드 포커스 없음 · 날짜 범위 preset 없음 + 시작/종료 오류가 슬롯 공유 | 이 화면 | A11 |
| 22 | ~~MOTION-03~~ | ~~P0(종속)~~ → **해소** | **PR #26 에서 해소됐다 — 기록으로만 남긴다.** `ToggleSwitch` 는 이 화면에 여전히 실재하나(`ProjectMilestonesField.tsx:120-127` — 마일스톤마다, 최대 12개) **요구가 지목한 reduced-motion 누락이 사라졌다**: `ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `prefers-reduced-motion: reduce` 에서 끈다. 근거 `:76-78`. **이 화면은 여전히 소비자이고 판정은 `종속` 이나, 종속하는 대상이 이제 충족 상태다** | **`packages/ui`(DS)** | **해소 — 재작업 없음** |
| 23 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 |
| 24 | (FS-052 §7 #16) | — | 이탈 가드가 `navigate()` 를 가로채지 못한다 — '목록으로'·'취소'가 미저장 폼을 버린다 | 이 화면 | A11 change_request |
| 25 | (§4.1) | — | 폼이 `watch` 8개를 구독해 **모든 키 입력이 폼 전체를 리렌더**한다 — 마일스톤 12행이 붙으면 비용이 는다(미리보기 실시간성의 대가) | 이 화면 | A11 (경미) |

## 6. 측정 도구 · 재현 스위치

> **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`projectAdapter` 는 `scope: 'sales-projects'`(`data-source.ts:68`)로 공용 `createCrudAdapter` 가 `failIfRequested(scope, op)` 를 부른다(`crud.ts:96,101,112,120,135`). **화면이 도달하는 op 는 4개 — 이 섹션에서 유일하게 `delete` 가 실재한다**:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=sales-projects:list` · `?fail=all` |
| `detail` | `fetchOne` (`crud.ts:101`) | `?fail=detail` · `?fail=sales-projects:detail` · `?fail=all` |
| `save` | `create`(`:112`) · `update`(`:120`) — **둘이 같은 op 를 공유한다** | `?fail=save` · `?fail=sales-projects:save` · `?fail=all` |
| `delete` | `remove` (`crud.ts:135`) | `?fail=delete` · `?fail=sales-projects:delete` · `?fail=all` |

- **`?fail=save` 는 등록과 수정을 구분하지 않는다** — 둘 다 `'save'` 다. 등록만 실패시킬 수 없다.
- **`?fail=delete` 는 단건·일괄을 구분하지 않는다** — 일괄은 `remove` 를 N번 부르므로 **전량이 실패**한다. **'N건 중 M건 실패'(부분 실패)를 `?fail=` 로는 재현할 수 없다** — `settleAll` 의 부분 실패 경로(`useCrudList.tsx:138-142`)를 재현하려면 픽스처를 손봐야 한다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 `?delay=` 가 아니라 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:24-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 / STATE-02 (404 vs 5xx) — **pass 확인** | `/sales/projects/nope/edit`(자연 404) 또는 `?status=detail:404` vs `?status=detail:500` — **404 에 '다시 시도'가 없고 500 에는 있으면 pass** |
| EXC-04 (409 conflict) — **UI 절 pass 확인** | `?status=save:409` — **`FormConflictDialog` 가 뜨고 입력이 남아 있으면 pass** |
| EXC-07 (422 필드 매핑) — **pass 확인** | `?status=save:422` — **단 `dev.ts` 의 `HttpError` 에 `violations` 가 실리지 않아**(`:84` 가 message 만 넘긴다) 이 스위치로는 필드 매핑을 재현할 수 없다. `useCrudForm.ts:182` 의 `cause.violations.length > 0` 가 false 라 **generic 배너로 떨어진다.** 재현하려면 `violations` 를 싣는 픽스처가 필요하다 — **재현 수단 부재를 그대로 기록한다** |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap |
| EXC-06 (status별 surface) | `?status=save:403` · `save:429` · `save:500` — **403·429 가 같은 배너면 gap**(404·409 는 갈린다) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) — **pass 확인** | `?status=save:500` — **`FormServerError` 에 `TDS-…` 참조가 보이면 pass.** `?status=delete:500` 은 참조가 없다(gap) |
| EXC-08 (중복 제출) — **pass 확인** | 등록 폼에서 Enter 연타 → 요청 1건이면 pass. `?status=save:500` 후 재시도가 **같은 키**를 쓰는지(원장 재생 — `crud.ts:114`) |
| EXC-04 (동시 편집 — **재현 불가**) | `Project` 에 `version` 필드가 없음을 **코드로** 확인해 판정한다(`types.ts:18-38`). 스위치로 만들 수 없다 |

**`LATENCY_MS` 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**IA-13 재현(이 화면의 pass 를 지키는 스위치)**: URL 자체가 스위치다 — `?stage=negotiation&q=한빛` 을 새 탭에 붙여 넣어 같은 view 가 나오는지, 기본값(`all`)이 URL 에서 지워지는지, 필터 3회 조작 후 Back **1회**로 이전 화면에 가는지(`replace: true` — `useListState.ts:125`) 확인.

**STATE-04 재현**: 3건 선택 → 단계 필터 변경 → **선택 해제 + SelectionBar 소멸**이면 pass(`ProjectListPage.tsx:124-126`).

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-02 · COMP-03 · A11Y-11 · A11Y-12 · ERP-13 · EXC-14 판정) · RTL(A11Y-11 의 4개 필드 `aria-invalid` 부재 assert · required 필드의 `aria-required` 주입 확인) · `projects.test.ts`(단계 기본확률·가중예상매출·마일스톤 진척·필터·정렬 **순수 함수** + `projectSchema` **폼 검증 6건** 회귀 — **이 화면에 컴포넌트 테스트는 없다**. 특히 **전이 규칙 테스트가 없는 것은 규칙이 없기 때문**이다).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔고, **재현 불가능한 것(EXC-04 동시 편집 · EXC-07 의 `violations` 부재)은 그 사실을 그대로 적었다**
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재)
- [x] §2.1 산수 검산 — 10 pass + 13 종속 + 2 n-a + 5 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. **`EXC-08`·`EXC-09`·`STATE-01`·`STATE-02` 를 `직접` 이 아니라 `상속`/`종속` 으로 적은 것은 회피가 아니라 사실**이다 — 이 화면은 `useCrudForm`/`useCrudList` 를 부를 뿐이다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·좌측 필터)은 적지 않았다. **A11Y-05 는 `SelectField isInvalid` 표면이 없어 n-a 로 적고 사유를 댔다**
- [x] **`PipelineStepper` 가 읽기 전용 표시임을 확인**하고(onClick 0건), **전이 규칙이 없어 스텝퍼가 거짓말을 할 수 있다는 사실**을 §4.4 에 기록했다
- [x] **동적 배열(`ProjectMilestonesField`)의 축을 §4.3 에 별도로** 세웠다(quality-bar 밖) — id 충돌 · 상한 강제 부재 · 행별 오류 미구분 · undo 부재 · 힌트 허위
- [x] **EXC-04 의 409 가 '존재 여부' 기반이지 version/ETag 토큰이 아니며, 동시 편집은 여전히 last-write-wins 임**을 §2 · §4.2 · §5 #2 에서 흐리지 않고 갈랐다. **UI 절은 pass, 토큰 절은 gap** 으로 정확히 나눴다
- [x] **IA-02 의 사유 전환**(가지 폴백 해소 → h1 이중 + 행위 미반영)을 명시하고, `nav-config.ts:293-295` 가 그 모델을 **의도로 선언**한다는 사실까지 적었다
- [x] **실재 결함을 발견해 기록했다** — `ProjectFormPage.tsx:249-250` 의 조사 누락 비문(형제 화면 대조 포함)
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`sales-projects`)와 op **4종**을 프레임워크 코드에서 확인했고, **`?delay=` 를 쓰지 않았으며**, **`?fail=save` 가 등록·수정을 구분하지 않고 부분 실패를 재현할 수 없다는 한계**까지 적었다
- [x] '기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-052 §7 · BE-052 §7.8 과 일치한다
- [x] **셸 결함(IA-04 · COMP-06 · COMP-07 · EXC-10 · EXC-18 · ERP-15)의 이관 대상이 화면이 아니라 `shared/crud` 임**을 §5 #5 에 묶어 명시했다 — 고치면 소비 화면 전부가 함께 받는다
