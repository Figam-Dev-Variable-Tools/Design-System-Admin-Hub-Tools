---
id: NFR-064
title: "알림 발송 규칙 비기능 명세"
functionalSpec: FS-064
backendSpec: BE-064
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-064. 알림 발송 규칙 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-064 알림 발송 (`/notifications/send` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-064(요소·예외) · BE-064(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-064 §7 · BE-064 §7.14 와 번호가 일치해야 한다 |
| 판정 기준일·근거 | **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6). 이전 기준 `4b805ad` 대비 **이 화면에서 뒤집힌 판정**: **MOTION-03 의 gap 사유가 해소됐다** — `ToggleSwitch.css:79-84` 에 `@media (prefers-reduced-motion: reduce)` 게이트가 **실재하게 됐다**(`:32` background-color · `:56` transform 을 둘 다 끈다). **알림 관리 3화면 중 이 화면만 노출돼 있던 DS gap 이 사라졌다** — §5 #20 을 해소로 갱신했다. **판정 자체는 `종속` 유지**(DS 소유)이고 **P0 건수는 바뀌지 않았다**(§2.1). 그 밖에 MOTION-01/02 는 근거 텍스트만 갱신했다(오버레이 모션이 CSS-only 로 구현됐다) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 공용 훅/셸을 쓰더라도 **이 화면의 배선이 결과를 가른다**면 직접이다. 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 **결정에 참여하지 않는 소비자** — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 화면 성격

이 화면은 **목록 + 등록/수정 폼 CRUD** 이며, **읽기 전용 뷰도 modal 폼도 아니다.** 공용 CRUD 프레임워크(`shared/crud/**`)를 **정면으로** 소비한다 — 목록은 `useCrudList` + `CrudListShell` + `useListState`, 폼은 `useCrudForm` + `FormPageShell`, 어댑터는 `createStoreAdapter`. **그래서 이 문서의 pass 대부분은 '이 화면이 공용 계약을 온전히 소비한다'는 판정이지 화면 고유 구현의 판정이 아니다.** 화면 고유의 것은 세 가지뿐이다: ① 좌측 분류 필터(`FilterPanel`) ② **자동 발송 ON/OFF 토글**(`useCrudRowUpdate` + `ToggleSwitch` — 이 화면에만 있는 목록 인라인 쓰기) ③ 트랜잭션 안내 배너.

**⚠ 이 화면은 아무것도 발송하지 않는다**(FS-064 §1). 발송 버튼·예약·수신자 선택이 없고 어댑터에 발송 경로가 0건이다(`data-source.ts:5-7,17`). 따라서 **'비가역 발송'을 전제로 하는 판정(FEEDBACK-02 의 파괴적 액션)은 이 화면에서 다른 표면에 걸린다** — 삭제와 discard 다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 네 상태가 정확히 갈린다. ① **first-load** — `useCrudList.tsx:71` `firstLoading = isFetching && data === undefined` 를 `CrudListShell` 이 `CrudTable loading` 으로 그대로 넘긴다(`CrudListShell.tsx:135-137`) ② **refetching-with-data** — `refreshing = isFetching && data !== undefined`(`:72`)는 표를 **덮지 않고** 요약에 ' · 새로고침 중…' 만 덧붙인다(`CrudListShell.tsx:118-122`) ③ **empty** — 성공·0행일 때만 `Empty`(`CrudTable.tsx:153-169`) ④ **error** — read 실패일 때만 요약+표를 배너로 대체(`CrudListShell.tsx:113,156-165`). **폼도 같다** — `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:136`)라 409 후 '최신 다시 불러오기' 재조회에서 입력 자리가 스켈레톤으로 바뀌지 않는다 | `/notifications/send` 진입 → 행 렌더 확인 → 분류 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` → error Alert만(empty 문구 없음) · 0행 필터 → Empty만 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** ① 목록 read 실패 → 인라인 `<Alert tone="danger">` '발송 규칙 목록을 불러오지 못했습니다.' + **'다시 시도'**(`refetch`)(`CrudListShell.tsx:157-164`) ② 폼 상세 read 실패 → 인라인 danger `Alert` + **'다시 시도' + '목록으로'**(`FormPageShell.tsx:125-141`). **read 실패에 error toast 를 쓰지 않는다** — toast 는 write 결과에만 쓴다(`useCrudForm.ts:222` · `useCrudRowUpdate.ts:49,53`). **empty 로 폴백하지 않는다** — `error === null` 일 때만 표/Empty 가 그려진다(`CrudListShell.tsx:113`) | `?fail=list` 로 목록, `?fail=detail` 로 `/:id/edit` 진입. **각각 danger Alert + '다시 시도'가 떠야 pass.** read 실패로 toast 가 뜨면 gap. **주의**: 404 는 '다시 시도'를 의도적으로 숨긴다(`FormPageShell.tsx:132`) — 그것은 EXC-12 의 요구이지 이 요구의 위반이 아니다 | **pass** |
| STATE-04 | STATE | 직접 | **충족(걸리는 절만).** (b) **선택 해제** — `useEffect(() => { clear(); }, [category, keyword, clear])`(`RuleListPage.tsx:88-90`)가 분류·검색어 변경 시 선택을 지우고, `useListState` 도 view 서명(`page\|keyword\|sort\|filters`)이 바뀌면 지운다(`useListState.ts:205-213`, StrictMode 안전). 그래서 '선택 N건 삭제'가 화면에 없는 행을 지울 수 없다. (a) **page clamp** — `clampPage` 가 훅에 있으나(`useListState.ts:217-223`) **이 화면이 부르지 않는다. 페이지네이션 표면이 없어 clamp 할 page 가 없다** — 그 부재 자체는 IA-04 가 gap 으로 잡는다(이 칸의 충족이 그것을 면제하지 않는다) | 규칙 3건 선택 → 좌측 '보안' 필터 클릭. **선택이 해제되고 SelectionBar 가 사라져야 pass.** 검색어 입력으로도 같은지 확인 | **pass** |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/notifications/**` 전체에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 space 토큰 배수로만 표현한다 — `calc(var(--tds-space-6) * 8)`(`_shared/styles.ts:22` 좌측 필터 폭) · `calc(var(--tds-space-6) * 11)`(`:57` ellipsis 셀 폭). `_shared/styles.ts:6-8` 이 규칙을 못박는다('시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건' + shorthand/longhand 혼용 금지) | `grep -nE "#[0-9a-fA-F]{3,6}\b\|[1-9][0-9]*px\|'(thin\|medium\|thick)'" apps/admin/src/pages/notifications` → **0건이어야 한다**(현재 0건). ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 **전부 DS/공유 클래스를 소비한다**: `tds-ui-focusable` — `TransactionalNotice.tsx:30`(마케팅 링크) · `FilterPanel.tsx:63`(분류 필터 항목) · `FormPageShell.tsx:150`('목록으로') · `RuleFormPage.tsx:242`(템플릿 등록 링크). 그리고 DS `<Button>`·`<SelectField>`·`<SearchField>`·`<ToggleSwitch>`(`.tds-toggle`). **이 화면이 `:focus-visible` outline 을 직접 선언하지 않는다**(로컬 CSS 0건) — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148` · `FormPageShell.tsx:173`) · Toast(토글·저장 결과) · DS `<Button>` transition · **`ToggleSwitch` 의 track/knob transition**(`ToggleSwitch.css:32,56` — `var(--tds-motion-duration-fast)`; **두 선언 모두 `:79-84` 의 reduced-motion 게이트가 끈다** — MOTION-03) · **Modal/Toast 의 `component.overlay` recipe**(`tokens/tokens.json:1286-1308` — enter `{motion.duration.normal}`/`{motion.easing.decelerate}` · exit `{motion.duration.fast}`/`{motion.easing.accelerate}`). **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` · `ToggleSwitch.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`FormPageShell.tsx:165`) · Toast · 삭제/충돌/이탈 다이얼로그의 Modal · `<Alert>`. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast/Alert 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면이 `<h1>` 을 직접 그리지 않는다** — 결정에 참여하지 않는다. 두 표면 모두 공용이 소유한다: ① 목록의 제목 = `AppHeader.tsx:101` `<h1 style={titleStyle}>`(그 스타일이 title tier 를 참조하며 `:45-48` 이 '손으로 재현한 사본'을 없앤 경위를 기록) ② 폼의 제목 = `FormPageShell.tsx:160` `<h1 style={pageTitleStyle}>` — `:159` 주석이 'TOKEN-05 — 페이지 제목은 공유 `pageTitleStyle`(title.xl) 하나에서 온다'로 못박는다. **화면이 직접 소비하는 유일한 title tier 는 미리보기가 아니라 이 화면엔 없다**(FS-065 와 다른 점) | `pageTitleStyle`/`AppHeader.titleStyle` 소유 문서 판정에 종속. 이 화면에서는 로컬 title 스타일 객체가 0건임만 확인 | **종속** |
| COMP-10 | COMP | 직접 | **충족 — ⚠ 이 화면은 `useDebouncedSearch` 를 직접 import 하지 않지만 `useListState` 를 통해 전부 상속한다**(`useListState.ts:24,227-230`). `RuleListPage.tsx:70` 이 `useListState` 를 쓰고 `:162-168` 이 `value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps}` 를 `SearchField` 에 스프레드한다. 그 `searchInputProps` 가 나르는 것(`useListState.ts:50-54`): ① **조합 중 커밋 금지** — `if (composing) return`(`useDebouncedSearch.ts:87`) ② **250ms 디바운스**(`:23,93-95`) ③ **조합 중 Enter 차단** — `nativeEvent.isComposing` **과** 자체 관측 `composingRef` 를 **둘 다** 본다(`:121-124`, 합성 이벤트에서 `isComposing` 이 누락되는 구멍을 닫는다 — `:117-120`) ④ **최소 길이 정책**(`minLength`, 빈 문자열은 '검색 해제'라 면제 — `:90-91`) ⑤ **stale 응답 무시** — TanStack Query 의 쿼리 키가 보장한다(`:14-18`). `RuleListPage.tsx:161` 주석이 이를 선언 | `/notifications/send` 검색창에 IME 로 '주문' 입력. **조합 중 '주ㅁ'·'주무' 같은 부분 문자열이 URL(`?q=`)이나 표에 반영되면 gap.** 조합 중 Enter 가 제출을 일으키지 않아야 한다. 완성 후 250ms 에 URL `?q=주문` 이 **1회** 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | **파괴적/비가역 액션 두 종이 실재하며 둘 다 ConfirmDialog 로 게이트된다.** ① **delete intent** — 단건(`useCrudList.tsx:154-165`) · 일괄(`:166-177`), `intent="delete"` · `busy={deleting}` → 확인 버튼 `disabled` + `aria-busy` + 라벨 '처리 중…'(`ConfirmDialog.tsx:151-155`) · **실패 시 다이얼로그를 열어 둔 채 error 배너**(`useCrudList.tsx:161`) · **취소/닫기가 in-flight 를 abort 하고 pending 을 리셋**(`:87-89`) ② **discard intent** — 이탈 가드(`FormPageShell.tsx:114`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 가 소유한다. **⚠ '발송'은 이 화면에 없다**(FS-064 §1) — 비가역 발송 표면이 존재하지 않는다. **자동 발송 토글(FS-064-EL-009.8)은 이 요구의 대상이 아니다** — 되돌릴 수 있다(다시 켜면 된다). 그 무게에 비해 상호작용이 가벼운 것은 별개 문제로 §5 #10 에 이관한다 | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 `?fail=delete` 로 삭제 → **다이얼로그가 열린 채 error 배너가 뜨고 재클릭이 retry 되는지**, in-flight 중 취소가 false toast 없이 abort 되는지 확인 | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `RuleFormPage.tsx:153-155` 가 `isDirty={isDirty}` 와 `unsavedMessage={UNSAVED_MESSAGE}` 를 `FormPageShell` 에 넘기고, 셸이 `useUnsavedChangesDialog(isDirty && !saving, { message })` 를 배선한다(`FormPageShell.tsx:114`) — **화면이 값을 공급하지 않으면 가드가 성립하지 않으므로 직접이다.** `isDirty` 는 **RHF `formState.isDirty`** 다(`useCrudForm.ts:261`) — 요구가 지정한 바로 그 소스. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 저장 성공 시 `navigate(listPath, { replace: true })`(`:223`)로 self-initiated 이탈이라 프롬프트가 뜨지 않는다. **토글 전용 값(`enabled`)도 `setValue(..., { shouldDirty: true })`(`RuleFormPage.tsx:277`)라 dirty 에 잡힌다** — 스위치만 만지고 나가도 가드가 걸린다 | `/notifications/send/new` 에서 채널을 SMS 로 바꾼 뒤 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로'(FS-064-EL-019)·'취소'(EL-033)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-064 §7 #6 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 등록·수정이 modal 이 아니라 **전용 라우트**(`/new` · `/:id/edit` — `App.tsx:293-294`)의 `FormPageShell` 로 렌더된다. 이는 quality-bar IA-06 의 '무게 규칙'과도 일치한다(발송 규칙은 필드 5개짜리 taxonomy 가 아니라 참조·검증을 갖는 rich 엔티티다). 이 화면의 modal 3종(단건 삭제 · 일괄 삭제 · 이탈 가드 · 409 충돌)은 **전부 입력 필드가 없는 확인 다이얼로그**다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 **3종**: ① 저장 성공 `toast.success('발송 규칙을 등록/저장했습니다.')`(`useCrudForm.ts:222`) ② 삭제 성공(`useCrudList.tsx:108,146`) ③ **토글 성공·실패**(`useCrudRowUpdate.ts:49,53` ← `RuleListPage.tsx:108-112`) — **③은 이 화면 고유의 toast 표면이다**(형제 두 화면엔 없다). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다. **별도로 목록 상태용 지속 live region 을 `CrudListShell` 이 갖는다**(`:107-109`) — 그것은 A11Y-16 의 산물이며 이 요구의 대상(toast viewport)이 아니다 | ToastProvider 판정에 종속. 이 화면에서는 토글 ON/OFF 가 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 4종: 단건 삭제 · 일괄 삭제 `ConfirmDialog`(`useCrudList.tsx:152-178`) · 이탈 가드 `ConfirmDialog`(`FormPageShell.tsx:198`) · **409 충돌 `FormConflictDialog`**(`:196`). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 '…삭제합니다. 이 작업은 되돌릴 수 없습니다.' 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 이 화면의 폼 컨트롤 5개를 전수 확인했다.** ① **이벤트 select**(`RuleFormPage.tsx:158-184`) — `FormField required` 의 자식이 `SelectField` 라 **`aria-required` 가 런타임 주입된다**(`FormField.tsx:36-41` `isRequirableChild` 가 `SelectField` 를 허용 · `:50-56` `cloneElement`). 오류 상태가 없어 `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않고, `aria-describedby={hintIdOf('rule-trigger')}` 로 힌트만 잇는다(`:171`) ② **채널 select**(`:186-208`) — `required` + `SelectField` → 주입. `isInvalid={errors.channel !== undefined}` 와 `aria-describedby` 를 **짝으로** 전환한다(`:196-199`: 오류면 `errorIdOf`, 아니면 `hintIdOf`) — 요구의 '유효할 때만 hint' 절까지 정확 ③ **템플릿 select**(`:210-233`) — 위와 동일 구조(`:220-223`) ④ **재시도 select**(`:249-266`) — required 아님, `aria-describedby=hintIdOf` ⑤ **자동 발송 ToggleSwitch**(`:274-281`) — `<button role="switch" aria-checked aria-label>`(`ToggleSwitch.tsx:24-31`), required 아님, 오류 없음. **짝 없는 `aria-invalid` 0건**(grep: 이 화면 0건 — `aria-invalid` 는 `_shared/TemplateIdentityFields.tsx:69` 와 `email-templates/EmailTemplateFormPage.tsx:192` 뿐이고 둘 다 형제 화면 소유) | `grep -n "aria-invalid" apps/admin/src/pages/notifications/send` → 0건(이 화면은 `SelectField isInvalid` 로 위임). RTL 로 `/notifications/send/new` 에서 채널을 중복 조합으로 만들어 `select.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert. required select 3개가 `aria-required="true"` 를 노출하는지 확인 — **주입은 런타임이므로 grep 으로 판정하지 말 것** | **pass** |
| A11Y-12 | A11Y | 상속 | **표면이 실재한다** — 좌측 이벤트 분류 필터(`RuleListPage.tsx:185-192`). 공유 `FilterPanel` 이 `<button aria-pressed={active}>` 를 그리고(`FilterPanel.tsx:65`) **`aria-current` 를 쓰지 않는다**(`:14-16`: '이 버튼은 토글 필터이지 현재 위치가 아니다 — aria-current 는 내비게이션의 것이다'). `FilterPanel.tsx:1-11` 이 이 파일의 존재 이유를 밝힌다 — **알림 관리의 필터가 ESG 것의 복제였고 한쪽은 `aria-current`, 다른 쪽은 `aria-pressed` 를 써서 A11Y-12 를 위반하고 있었다. 통합이 그것을 한 벌로 수렴했다.** 이 화면은 소비자다 | `FilterPanel` 소유 문서 판정에 종속. **이 섹션이 그 계약을 자체 테스트로 고정한다** — `RuleListPage.test.tsx:61-69` 가 '전체' 버튼의 `aria-pressed === 'true'` · '보안' 의 `'false'` · `aria-current === null` 을 단언한다(회귀 방어선) | **종속** |
| MOTION-01 | MOTION | 상속 | Modal 표면 4종(삭제 ×2 · 이탈 가드 · 409 충돌). enter/exit 모션은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다. **⚠ 근거 갱신 — 이전 기준의 추정을 지운다.** PR #26 이 오버레이 모션을 **구현했다. 단 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `Modal.css:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **Motion/AnimatePresence 소비는 `packages/ui/src` 에 여전히 0건이나**(모션 라이브러리 자체가 미도입 — `package.json`·import·lockfile 전부 0), 요구가 명시한 'exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성됐다 — **'0건이라 gap 일 가능성이 높다'는 이전 추정은 틀렸다.** 라이브러리 부재를 gap 으로 볼지는 DS 문서의 몫이다 | DS Modal 판정에 종속. 이 화면이 소비하는 4개 Modal 표면이 실재함만 확인 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 3종(저장 · 삭제 · **토글**). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`) → keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. **요구 본문이 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`). **Motion 라이브러리 미도입은 사실이나 그로부터 gap 을 추론하지 않는다** | DS Toast 판정에 종속. **이 화면은 토글 토스트가 있어 형제 두 화면보다 이 표면을 하나 더 소비한다** | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `ui.css:110` 에 reduced-motion 블록 **있음**) · Toast(`Toast.css:136-141` **있음**) · Modal(`Modal.css:173-180` **있음**) · DS Button(`Button.css:158` **있음**) · **`ToggleSwitch`**. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **★ 이전 기준의 gap 사유가 해소됐다 — 이 문서에서 가장 크게 바뀐 판정 근거다.** `4b805ad` 기준에선 `ToggleSwitch.css:32`(background-color) · `:56`(transform)에 reduced-motion 블록이 **없었고**, ToggleSwitch 가 알림 관리 3화면 중 이 화면에만 있어 **이 화면이 그 DS gap 에 노출된 유일한 화면**이었다. **지금은 게이트가 실재한다** — `packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 `transition` 을 `none` 으로 끈다(`:32`·`:56` 두 선언을 모두 덮는다). 주석 `:76-78` 이 근거를 적는다 — 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는 반면, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 **전환을 없애도 정보 손실이 0** 이고 즉시 최종 위치로 스냅한다. **quality-bar MOTION-03 의 요구문(`ToggleSwitch.css` 에 누락된 off 를 추가한다)은 요구 정본이며 이제 충족됐을 뿐이다** | 전역 motion config·`ToggleSwitch.css` 판정에 종속. 재현: `prefers-reduced-motion: reduce` 를 켜고 자동 발송 토글 — **knob 이 스냅하면 충족**(현재 코드 기준 충족). 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | **충족.** 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:292-294` — `APP_ROUTES` 의 `/notifications/send` · `/new` · `/:id/edit`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록 최상위가 `<div style={pageStyle}>`(`RuleListPage.tsx:179` → `_shared/styles.ts:12` 평범한 flex column), 폼 최상위가 `FormPageShell` 의 `<div style={pageStyle}>`(`FormPageShell.tsx:147`). 좌측 `FilterPanel` 은 **화면 안의 2열 그리드**(`_shared/styles.ts:20-25`)이지 앱 sidebar 가 아니다 — `<nav aria-label="이벤트 분류 필터">` 로 자기 이름을 갖는다(`FilterPanel.tsx:56`) | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **부분 미충족 — 목록은 pass, 폼 sub-route 는 gap.** ① **목록 pass**: `/notifications/send` 는 nav 잎이므로(`nav-config.ts:216`) `findCoveringLeaf` 가 자기를 찾아 `findNavLabel` 이 **'알림 발송'** 을 돌려준다(`nav-config.ts:270-278,297-299`). AppHeader 가 그것을 `<h1>` 으로 렌더하고(`AppHeader.tsx:92,101`) **화면에 in-content `<h1>` 이 없다** → h1 1개 · 정확한 이름 ② **폼 gap**: `/notifications/send/new` 는 잎이 아니지만 `findCoveringLeaf` 가 **'자기를 감싸는 가장 긴 잎'** = `/notifications/send` 를 찾아 **'알림 발송'** 을 돌려준다 — **가지 폴백('알림 관리')은 통합이 해소했다**(`nav-config.test.ts` 의 회귀 방어). **그런데 `FormPageShell.tsx:160` 이 `<h1>발송 규칙 등록</h1>` 을 또 그린다 → `<h1>` 이 2개다.** 게다가 `nav-config.ts:294-296` 이 밝히듯 **'등록/수정' 행위를 제목에 넣지 않는 것이 의도**라('그 문구는 nav 에 없고, 여기서 지어내면 레이아웃이 카피를 발명하게 된다') AppHeader 의 primary title 은 목록 이름 그대로다 — quality-bar IA-02 가 예시로 든 '`/content/notices/new` 의 가시 primary title 이 **공지 등록**' 은 미충족이다. **즉 gap 의 사유가 바뀌었다: 가지 폴백(해소됨) → h1 이중 + 행위 미반영** | `/notifications/send` 진입 → `document.querySelectorAll('h1').length === 1` 이고 텍스트가 '알림 발송'이면 pass. `/notifications/send/new` 진입 → **`length === 2`('알림 발송' + '발송 규칙 등록')이면 gap.** AppHeader 의 가시 primary title 이 '발송 규칙 등록'이 아니면 gap | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: toolbar row(검색 좌측 `RuleListPage.tsx:162-169` · **primary '발송 규칙 등록' 우상단** `:171-174`) → 결과 count 요약(`CrudListShell.tsx:115-123`) → **SelectionBar**(`:125-133`) → table(`:135`). **미충족: Pagination 이 없다.** `grep "Pagination" apps/admin/src/pages/notifications apps/admin/src/shared/crud` → **0건**. `CrudTable` 이 `items.map(...)`(`:171`)으로 전량을 렌더한다. **'page size 초과 가능'인가**: 규칙은 `(trigger, channel)` 유일성이 **최대 20건**을 강제하므로(BE-064 §3 · `notification.ts:528-537`) 무한 증가가 아니다 — 그러나 **앱 관례 `PAGE_SIZE = 10`**(`pages/members/types.ts:71` · `content/notices/types.ts:116` 등 6곳)을 기준으로 하면 **20 > 10 이라 한 page 를 넘길 수 있다.** 현재 픽스처는 9건(`store.ts:273-355`)이라 드러나지 않는다. **형제 두 화면(FS-065/066)보다 심각도가 낮다** — 저쪽은 상한이 없다 | 픽스처를 트리거×채널 조합으로 20건까지 늘리고 `/notifications/send` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** 심각도 판정에는 도메인 상한 20을 함께 적는다 | **gap** |
| IA-05 | IA | 직접 | **충족.** `/notifications/send/new` 와 `/notifications/send/:id/edit` 가 **같은 컴포넌트**(`RuleFormPage`)로 해석된다(`App.tsx:293-294`). `useCrudForm` 이 `:id` 유무로 갈린다(`useCrudForm.ts:74-75` `isEdit = id !== undefined`). **레이아웃이 동일**하고 다른 것은 둘뿐이다: title(`FormPageShell.tsx:160` '발송 규칙 등록' vs '수정')과 prefill(`useCrudForm.ts:131-134` 이 `toValues(loaded)` 로 reset). create 전용/edit 전용 page 가 존재하지 않는다. `RuleFormPage.tsx:3` 이 이 계약을 선언('IA-05 — 등록·수정이 한 컴포넌트다') | 두 라우트가 같은 컴포넌트로 렌더되고 레이아웃이 동일한지, 제목·프리필만 다른지 확인. 별도 create/edit 컴포넌트 grep = 0 | **pass** |
| IA-13 | IA | 직접 | **충족.** 조회 상태의 **단일 원천이 URL** 이다 — `RuleListPage.tsx:70` `useListState({ filterDefaults: { [CATEGORY_PARAM]: FILTER_ALL } })`. 분류는 `?cat`(`notification.ts:421` — **세 목록이 같은 키를 쓴다**: '같은 키를 써야 링크가 한 가지 뜻을 갖는다'), 검색어는 `?q`(`useListState.ts:27`). 기본값과 같은 값은 URL 에서 지운다(`:115-117`) — '기본 상태의 URL 이 하나로 정해진다'. 갱신은 `{ replace: true }`(`:125`)라 검색어 한 줄에 history 를 쌓지 않고, **상세에서 Back 하면 그 URL(= 필터+검색)이 그대로 복원된다**(`:17-19`). 모르는 값은 `parseCategoryFilter` 가 `as` 없이 좁혀 '전체'로 되돌린다(`notification.ts:436-439`). **`page`·`sort` 는 쓰이지 않는다** — 페이지네이션·정렬 UI 표면이 없다(그 부재는 IA-04·ERP-04 소관) | `/notifications/send` 에서 좌측 '보안' 필터 + 검색 '인증' 적용 → URL 이 `?cat=security&q=인증` 인지 확인 → 행 클릭으로 `/:id/edit` 진입 → 브라우저 Back. **URL 과 필터·검색이 그대로 복원되면 pass.** URL 을 새 탭에 붙여넣어 같은 view 가 재현되는지 확인. `?cat=bogus` 는 '전체'로 떨어져야 한다 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` **바로 바깥**에 두는 `ErrorBoundary`(`AppShell.tsx:18,484-493` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다. 특히 **FS-064-EL-027(`templateOptionsFor`)·EL-035(`listRules` in schema)·EL-009.6(`templateNameOf`)의 동기 store 호출이 던지면 이 경계가 받는다** — 그 세 곳엔 자체 실패 경로가 없다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·토글·삭제 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **이 화면 고유의 이득**: `returnUrl` 에 쿼리가 포함되므로 **재로그인 후 필터·검색까지 복원된다**(IA-13 과 맞물린다) | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fnotifications%2Fsend…&reason=session_expired` 로 이동하는지 확인. (폼의 미저장 입력 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): **read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490-491`) 권한 없는 deep-link 에 403 화면을 렌더하고, 라우트→리소스 파생이 `/notifications/send/:id/edit` 같은 하위 라우트까지 덮는다(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎', `nav-config.ts:260-278` 과 같은 규칙). 세 잎이 `menu.notifications` 권한을 공유한다(`nav-config.ts:214`). **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan`(`shared/permissions/RequirePermission.tsx`)의 소비처는 **8곳**(`logs/components/LogListShell` · `products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`)이며 **알림 관리가 없다**(grep 확인). 그래서 `can(resource,'update')` 를 묻지 않고 무조건 렌더되는 쓰기 컨트롤이 **5종**이다: '발송 규칙 등록'(`RuleListPage.tsx:171`) · RowActions 수정·삭제(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126`) · **자동 발송 토글**(`RuleListPage.tsx:146`) · '등록/저장'(`FormPageShell.tsx:189`). **이 화면에서 특히 무거운 이유**: BE-064 §7.7 이 쓰기를 `admin` 전용으로 판정했고 §7.6 이 **토글을 보안 통제 스위치**로 판정했다 — 즉 `operator` 가 `security.verification-code` 규칙을 끄는 버튼을 보고 누를 수 있고, 서버 403 이 '알림 상태를 변경하지 못했습니다' 토스트로 뭉개진다(강등 reconcile 없음) | 권한 스토어에서 `notification-rules` 의 `update` 를 끈 뒤 `/notifications/send` 진입. **'발송 규칙 등록'·행 수정/삭제·토글이 그대로 보이면 gap.** read 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass). `?status=save:403` 으로 토글 → 배너/토스트가 권한 문구로 갈리지 않으면 EXC-06 gap 도 함께 | **gap** |
| EXC-04 | EXC | 직접 | **부분 미충족 — ⚠ 두 절을 분리해 판정한다.** **충족된 절(F3b 가 해소)**: ① **유령 저장이 사라졌다** — `createStoreAdapter.update` 가 `if (!exists(id)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`(`crud.ts:219-221`), `remove` 도 같다(`:232-234`). 형제 팩토리와 동작이 일치한다 ② **409 를 해소할 UI 가 있다** — `useCrudForm` 이 `isConflict(cause)` 를 잡아 **입력을 보존한 채** 충돌 다이얼로그를 띄우고(`useCrudForm.ts:166-178` — `reload`/`dismiss`) **성공 토스트도 목록 이동도 하지 않는다**(`:164-165`). `FormPageShell.tsx:196` 이 그것을 렌더한다. **미충족된 절**: ③ **낙관적 동시성 토큰을 보내지 않는다.** 요구 본문은 '`If-Match`/`ETag` **또는** `updatedAt`/`version` 을 **보낸다**'인데 어댑터가 아무것도 싣지 않는다(`crud.ts:205-225` 에 헤더 개념이 없다). **`NotificationRule.updatedAt` 이 존재하는데도**(`notification.ts:405`) `NotificationRuleInput` 이 그것을 `Omit` 한다(`:408`). **그래서 409 는 '대상이 존재하는가'만 본다 — 둘 다 존재하는 동시 편집은 여전히 last-write-wins 다**(BE-064 §7.1 의 표). A 가 템플릿을 바꾸는 동안 B 가 재시도를 3회로 올리면 **A 의 저장이 B 의 변경을 조용히 덮는다.** 규칙은 20건뿐이고 운영자 여럿이 같은 것을 만지므로 충돌 확률이 낮지 않다 | `?status=save:409` 로 `/:id/edit` 에서 저장 → **충돌 다이얼로그가 입력을 보존한 채 뜨고 토스트·이동이 없으면 ①② pass.** ③ 판정: `grep -rn "If-Match\|ETag\|version" apps/admin/src/shared/crud apps/admin/src/pages/notifications` → **0건이면 gap**(현재 0건). 동시 편집 재현: 두 탭에서 같은 규칙을 열고 각각 다른 필드를 바꿔 저장 → **나중 저장이 앞선 변경을 경고 없이 덮으면 gap** | **gap** |
| EXC-08 | EXC | 직접 | **부분 미충족 — 저장은 3중 충족, 토글이 뚫려 있다.** **충족(폼 저장)**: ① pending 중 비활성(`FormPageShell.tsx:189` `disabled={saving \|\| loadingDetail}`) ② **동기 제출 락** — `submitLockRef`(`useCrudForm.ts:103,201-202`)가 RHF 비동기 검증 탓에 `saving` 이 true 가 되기 전의 두 번째 Enter 를 **렌더를 기다리지 않고** 막는다 ③ **제출 시도 단위 멱등키** — `idempotencyKeyRef`(`:118-123`)를 **mutationFn 밖**에서 만들어 `variables` 로 싣고(`:228,235`), 재시도가 같은 키를 재사용하며 성공 시 버린다(`:220`). **키가 실제로 어댑터에 도달한다** — `WriteContext.idempotencyKey`(`crud.ts:30-41`) → `ledger.isReplay`(`:201,208`). ledger 는 **성공한 뒤에만 기록**해 실패한 첫 시도가 키를 태워 재시도를 no-op 으로 만들지 않는다(`:55-60`). **미충족(자동 발송 토글 — 이 화면 고유 표면)**: `useCrudRowUpdate.ts:44-45` 가 `update.mutate({ id, input, signal })` 로 **`idempotencyKey` 를 싣지 않고 `submitLockRef` 도 없다.** 방어는 `busy={rowUpdate.pendingId === rule.id}` → `disabled`(`ToggleSwitch.tsx:21-30`) 하나인데 `pendingId` 는 **state 라 리렌더 후에야 잠긴다.** `crud.ts:36-39` 는 '**확인 다이얼로그를 거치는 조작**은 키 없이 온다'를 의도로 선언하지만 **토글에는 확인 다이얼로그가 없다** — 그 예외가 성립하지 않는다. 완화 요인: 새 토글이 이전 요청을 abort 한다(`useCrudRowUpdate.ts:39`) — 그러나 **abort 는 클라이언트가 결과를 버리는 것이지 서버 도달을 막지 못한다**(BE-064 §7.10). **삭제**(`useCrudList.tsx:101-103`)도 키가 없으나 **확인 다이얼로그 + `busy` 가 매 시도를 게이트**하고 DELETE 가 자연 멱등이라 위 예외가 성립한다 — 이 판정은 형제 두 화면(NFR-065/066)이 EXC-08 을 pass 로 두는 근거이며, **이 화면만 토글 때문에 gap 이다** | `/notifications/send` 에서 한 규칙의 토글을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** 코드상 `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/shared/crud/useCrudRowUpdate.ts` → **0건**으로도 판정된다. 폼 저장은 '등록' 더블클릭 → 정확히 1요청이어야 pass | **gap** |
| EXC-09 | EXC | 직접 | **충족 — 세 쓰기 경로 전부.** ① **폼 저장** — `onError` 가 `if (isAbort(cause)) return;`(`useCrudForm.ts:161`)로 abort 를 실패로 처리하지 않고, `onSuccess` 가 `if (controller.signal.aborted) return;`(`:218`)로 취소된 요청의 토스트·이동을 막으며, unmount 가 abort 한다(`:93`) ② **토글** — 같은 세 지점(`useCrudRowUpdate.ts:36` unmount · `:48` success 가드 · `:52` `isAbort` · `:56` `onSettled` 가드) ③ **삭제** — 다이얼로그 닫기가 abort + `mutation.reset()`(`useCrudList.tsx:87-89`) · `:104` success 가드 · `:110-111` `isAbort`. **전부 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다** — 로컬 판정을 재발명하지 않는다. **미충족 절 하나**: 요구의 마지막 절 'bulk 실패 count 에서 abort 제외' — 일괄 삭제가 `settleAll`(`shared/bulk.ts`)로 **거절 수만 세므로** 이탈 시 abort 가 실패 수에 섞일 수 있다(`useCrudList.tsx:136-142`). **그러나 그 경로는 실질적으로 도달 불가**하다: `closeBulk` 가 abort 한 뒤 `onSuccess` 의 `if (controller.signal.aborted) return`(`:137`)이 **집계 자체를 버린다** — 배너가 그려지지 않는다. 표면상 결함이나 관측되지 않으므로 pass 로 두고 §5 #14 에 기록 | `/notifications/send/new` 에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast·배너가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다. 토글을 누른 직후 다른 메뉴로 이탈 → 토스트 없음. 삭제 확인 직후 다이얼로그 닫기 → 실패 배너 없음 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-05 · IA-13 · EXC-09 |
| `종속` | **13** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · A11Y-12 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **1** | FEEDBACK-06 |
| `gap` | **5** | IA-02 · IA-04 · EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 11 + 13 + 1 + 5 = **30** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.**
> - **IA-02 · IA-04 · EXC-03 은 앱 전역의 같은 뿌리**(h1 이중 모델 · 공용 셸의 Pagination 부재 · `useRouteWritePermissions` 미소비)를 공유하므로 화면 단위가 아니라 **횡단 배치**로 푸는 것이 옳다(§5).
> - **EXC-04 는 공용 어댑터 계약**(`createStoreAdapter` 에 토큰 개념 부재)이며 `createStoreAdapter` 소비 화면 전부에 걸린다.
> - **EXC-08 만 이 화면 고유다** — `useCrudRowUpdate`(토글)가 원인이며, ToggleSwitch 를 목록에 둔 화면이 이 섹션에서 여기뿐이다.
>
> **형제 문서와의 차이**: NFR-065 · NFR-066 은 **EXC-08 이 pass** 라 gap 4건이다(토글 표면이 없다). 그 차이가 `useCrudRowUpdate` 의 멱등키 부재 하나에서 나온다.
> **참고 — NFR-036(마케팅 발송 템플릿)의 판정은 낡았다**: 그 문서는 F2(`3cd3078`) 기준이라 COMP-10 · IA-13 을 gap 으로 적었으나, 통합 이후 `marketing/templates/TemplateListPage.tsx:124,159` 가 `useListState` 를 소비해 **두 항목이 pass 로 뒤집혔다.** 또 NFR-036 이 EXC-04 gap 의 사유로 든 '`createStoreAdapter` 의 존재 검사 부재'는 **F3b 가 `crud.ts:219-221` 로 해소했다** — 지금의 EXC-04 gap 사유는 '존재 검사 부재'가 아니라 **'동시성 토큰 부재'** 다. NFR-036 갱신 시 이 전환을 반영해야 한다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·금액·CSV·2열 preview·읽기전용 detail)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **화면이 그 이득을 버리지 않는다** — `refreshing` 을 별도 파생으로 받아 요약에만 ' · 새로고침 중…' 을 붙이고 표는 그대로 둔다(`CrudListShell.tsx:116-122`) | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 가벼운 인디케이터만 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 **3분기**한다 — `CrudTable` 이 공유 `Empty` 에 맥락을 넘기고(`CrudTable.tsx:157-167`) 화면이 `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters`·`createAction` 을 전부 공급한다(`RuleListPage.tsx:202-213`). **조사(이/가)는 `Empty` 가 고른다**(`CrudTable.tsx:156`) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기. 필터로 0건 → 필터 초기화. 진짜 0건 → '발송 규칙 등록' CTA | **pass** |
| STATE-06 | P1 | write 성공 시 `useCrudCreate`/`useCrudUpdate`/`useCrudDelete` 가 목록·상세를 정확히 무효화한다(`crud.ts` 의 mutation 훅). **토글도 같다** — `useCrudRowUpdate` 가 `useCrudUpdate` 를 쓰므로(`:33`) 스위치를 켜면 목록이 갱신된다 | 폼에서 채널 변경 후 목록 복귀 시 값이 갱신돼 있는지. 토글 후 '켜짐 N건'이 바뀌는지 | **pass** |
| COMP-01 | P1 | **모든 action/navigation 버튼이 DS `<Button>`** 이다 — '발송 규칙 등록'(`RuleListPage.tsx:171,208`) · 취소/저장(`FormPageShell.tsx:181-191`) · '다시 시도'/'목록으로'(`:133,137,160`) · '선택 N건 삭제'(`CrudListShell.tsx:126`). `grep "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/notifications` → **0건**. **⚠ 진행 상태를 `loading` prop 이 아니라 손으로 쓴 라벨로 표현한다** — `FormPageShell.tsx:190` `{saving ? '저장 중…' : …}`. 요구가 명시적으로 금지한 형태다. **다만 이것은 공용 셸의 결정이며 화면 코드가 아니다**(`RuleFormPage` 는 `saving` 을 넘길 뿐). 손조립 `<button>` 은 `FilterPanel.tsx:61`(필터 항목 — 리스트 항목이라 Button 이 아닌 것이 옳다) · `FormPageShell.tsx:148`('목록으로' back-link) · `ToggleSwitch.tsx:24`(switch role) 뿐이며 셋 다 DS/공유 소유 | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/notifications` → 0건(현재 0건). `FormPageShell` 의 손라벨은 A41 이관 | **gap(공용 셸 소유)** |
| COMP-02 | P1 | 선택 셀이 `RowSelectCell`/`SelectAllHeaderCell`, 순번이 `SeqCell`/`SeqHeaderCell` 이다(`CrudTable.tsx:124-130,173-179`). raw checkbox 손조립 0건 | selectable 표에 raw checkbox 마크업이 0건인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 다(`RuleListPage.tsx:162`). `grep 'type="search"' apps/admin/src/pages/notifications` → 0건 | raw `<input type="search">` 재구현이 0건인지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3` 으로 파생된다(`:113,146`). 페이지네이션이 없어 'row 수 === PAGE_SIZE' 기준값 자체가 없다(IA-04 gap 과 연동) | `grep "length: 5" shared/crud/CrudTable.tsx` → 0건이어야 한다. 현재 1건 | **gap(공용 셸 소유)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 `RowActions`(pencil/trash — `CrudTable.tsx:192-197`)다. 요구의 (b) '인라인 편집 테이블은 RowActions' 에 정확히 해당한다 — **중복 '상세' 버튼이 없다**. 행 클릭(`:172`)과 '수정' 버튼이 같은 목적지이나, 요구가 금지한 것은 **읽기전용 테이블의 중복 상세 버튼**이며 이 표는 편집 테이블이다 | 편집 테이블이 RowActions 를 쓰는지, 중복 '상세' secondary 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 이 표의 자유 텍스트 셀은 **템플릿명**(`RuleListPage.tsx:133`)뿐이고 **truncate 가 없다**. `_shared/styles.ts:53-61` 에 `ellipsisCellStyle`(COMP-09 를 위해 만든 것 — 주석이 명시)이 **있는데 이 화면이 쓰지 않는다** — 형제 두 화면은 쓴다(`EmailTemplateListPage.tsx:43` · `SmsTemplateListPage.tsx:50`). 템플릿명은 `TEMPLATE_NAME_MAX = 60`(`notification.ts:357`)으로 제한되나 60자면 열을 넓히기 충분하다 | 60자 템플릿명 픽스처로 표 폭이 유지되는지. `ellipsisCellStyle` 을 템플릿 열에 적용하면 해소 | **gap** |
| COMP-12 | P2 | **길이 제한 입력이 이 화면에 없다** — 다섯 필드가 전부 select/toggle 이다. 카운터를 요구할 표면이 없다 | 자유 텍스트 입력이 도입되면 재판정 | **n-a** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: read 실패=인라인 Alert(`CrudListShell.tsx:157` · `FormPageShell.tsx:125`) · write 성공=toast(`useCrudForm.ts:222` · `useCrudList.tsx:108` · `useCrudRowUpdate.ts:49`) · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:161`, toast 가 modal 뒤에 숨지 않는다) · 폼 저장 실패=폼 카드 배너(`FormPageShell.tsx:168`, 입력을 보존한 채 그 자리에서 재시도하는 폼 맥락이라 `FormServerError` 가 옳다). **⚠ error toast 가 자동 소멸한다** — 토글 실패 토스트(`useCrudRowUpdate.ts:53`)에 '다시 시도'가 없다. 요구는 'error toast 는 자동 소멸 없이 다시 시도 포함' | 강제 실패 토글 → 실패 토스트에 retry 가 있는지 | **gap(부분)** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 피드백이 배선돼 있다 — create/update(`useCrudForm.ts:229,236`) · delete(`useCrudList.tsx:104-114`) · **bulk delete(`:136-149`)** · **toggle(`useCrudRowUpdate.ts:47-58`)**. no-op 클릭이 없다 | `?fail=save` · `?fail=delete` 로 각 경로 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 delete 가 delete-intent ConfirmDialog 를 연다(`useCrudList.tsx:154-177`). undo window 는 없다 — 요구가 'confirm **또는** undo' 이므로 충족 | 단일 미확인 클릭으로 실행되는 delete 가 0건인지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 가 소유(`Modal.initialFocusRef`) | DS 판정 종속 | **종속** |
| A11Y-05 | P1 | `SelectField isInvalid` 가 AT 에 반영되는지는 DS 소관. **이 화면이 그 계약의 소비자다** — `RuleFormPage.tsx:196,220` 이 `isInvalid` 를 세우고 `aria-describedby` 를 짝으로 잇는다(호출부 몫은 충족) | DS SelectField 판정 종속 | **종속** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(`CrudTable.tsx:172`)이고 **행 안에 keyboard-focusable 등가물이 있다** — RowActions 의 '수정' 버튼(`:192-197`, 접근 이름이 `nameOf` 기반). 체크박스·토글도 focusable 이다. 요구의 최소선(‘row 내 focusable 등가물’)을 충족한다 | 행을 Tab 해서 수정 컨트롤에 도달하는지 | **pass** |
| A11Y-13 | P1 | **폼 진입 시 첫 편집 필드 포커스가 있다** — `useInitialFocus<HTMLSelectElement>(!loadingDetail)`(`RuleFormPage.tsx:116`)의 ref 를 register ref 와 함께 이벤트 select 에 문다(`:173-176`). 훅이 `ready` 가 처음 true 가 될 때 **한 번만** 포커스해 사용자가 옮긴 포커스를 다시 뺏지 않는다(`useInitialFocus.ts:16-25`). `autoFocus` 를 피한 이유까지 주석이 밝힌다(`:5-7` — `jsx-a11y/no-autofocus` 가 error). **검증 실패 시 첫 오류 필드 포커스**는 RHF `shouldFocusError` 기본값 + `useCrudForm` 이 `onInvalid` 를 명시해 계약으로 고정한다(`useCrudForm.ts:240-248,260`). 서버 422 도 `setFocus(first.field)`(`:190`) | 빈 templateId 로 '등록' → activeElement 가 템플릿 select 인지. 폼 진입 시 이벤트 select 에 포커스가 가는지 | **pass** |
| A11Y-16 | P1 | 신규 인터랙티브 표면이 계약을 만족한다: `ToggleSwitch` = `role="switch"` + `aria-checked` + `aria-label` + `aria-busy` + **ON/OFF 문구로 이중(비색상) state 인코딩**(`ToggleSwitch.tsx:5,24-38`) · `FilterPanel` = `aria-pressed` + `tds-ui-focusable`(`FilterPanel.tsx:63-65`) · 표 `aria-busy` + caption(`CrudTable.tsx:116-120`) · **지속 live region**(`CrudListShell.tsx:107-109` — 내용과 함께 생성되는 region 이 AT 에 안 읽히는 문제를 껍데기가 소유해 푼다) · `role="alert"` 오류(`FormField`) | 토글의 role/aria-checked/ON·OFF 문구, 필터의 aria-pressed, 목록 상태 announce 를 확인 | **pass** |
| ERP-01 | P1 | status→tone 매핑이 **공유 도메인 모듈의 단일 레지스트리**다 — `TRIGGER_CATEGORY_TONE`(`notification.ts:65-70`). 세 화면이 `triggerColumn`(`triggerColumn.tsx:16-29`)을 통해 같은 함수를 소비한다. per-page meta helper 가 없다. **다만 그 레지스트리가 `pages/notifications/_shared` 지역이라** 앱 전역(견적/계약/배송)과 통합된 레지스트리는 아니다 | 모든 분류가 정의된 tone 으로 해석되는지(`notification.test.ts:52-58` 이 회귀 방어) | **pass(도메인 내)** |
| ERP-04 | P1 | sortable header 가 없다 — 정렬이 `sortRules`(`notification.ts:496-502`)의 **고정 default-sort** 뿐이다. 요구는 'TanStack Table 도입 앞서 관례를 표준화하라'이며 표면 부재가 곧 위반은 아니나, 규칙 20건에서는 정렬 요구가 약하다 | sortable header 도입 시 재판정 | **gap(경미)** |
| ERP-05 | P1 | **Pagination 소비가 0건**이라 range/page-size 표면이 없다(IA-04 gap 과 같은 뿌리) | Pagination 도입 시 `pageSize` opt-in 여부로 재판정 | **n-a(표면 부재)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `formatNumber` 를 경유한다(`RuleListPage.tsx:169` · `FilterPanel.tsx:74`). 인라인 포맷 0건. **이 화면에 날짜 표시가 없다**(규칙 목록에 '수정일시' 열이 없다) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 건수가 `formatNumber` 를 경유한다. **raw numeric toString 0건.** 날짜·금액·상대시간 표면이 없다 | 표 셀의 raw numeric toString 이 0건인지 | **pass** |
| ERP-09 | P2 | **timestamp 표시 표면이 없다** — `updatedAt` 이 있으나 이 화면이 그리지 않는다 | 수정일시 열이 도입되면 재판정 | **n-a(표면 부재)** |
| ERP-13 | P1 | **충족.** 이 화면의 templated copy 에 **리터럴 조사 폴백이 0건**이다. 조사 헬퍼는 `shared/format.ts:269+` 가 소유하고(통합이 `logs/josa.ts` · `notifications/_shared/notification.ts` 의 사본 3벌을 그리로 수렴 — `format.ts` 주석 · `notification.ts:37-38` 이 그 이관을 기록) 이 화면이 소비한다: ① **토글 토스트** — `RuleListPage.tsx:109-110` `${label} 알림${objectParticle('알림')} 켰습니다` , 주석이 `:107` 에 계약을 못박는다 — **'ERP-13 — 조사를 앞 낱말의 받침에 맞춰 고른다. 리터럴 을(를) 을 내지 않는다'** ② 저장 토스트(`useCrudForm.ts:222` `objectParticle(entityLabel)`) ③ 삭제 확인·토스트(`useCrudList.tsx:108,158`) ④ 폼 로드 실패 배너(`FormPageShell.tsx:129-130`) ⑤ 빈 상태(`Empty` 가 자체 판정 — `@tds/ui` 는 앱을 import 할 수 없어 자족 사본을 갖는 것이 의도 — `format.ts` 주석). **⚠ '(으)로' 폴백형도 0건**이다 — BE-026 이 gap 으로 잡은 `상태를 '<라벨>'(으)로 변경` 같은 문구가 이 화면에 없다 | `grep -nE "이\(가\)\|을\(를\)\|은\(는\)\|\(으\)로" apps/admin/src/pages/notifications` → 사용자 대상 문자열 히트가 **0건이어야 한다**. 남는 히트는 ① 주석 ② **리터럴 부재를 단언하는 테스트** 뿐이다: `email-templates.test.ts:31` `expect(message).not.toContain('을(를)')` · `:37` `not.toContain('은(는)')` · `sms-templates.test.ts:30` `not.toContain('을(를)')` | **pass** |
| ERP-15 | P1 | 전량을 한 DOM 에 렌더한다(`CrudTable.tsx:171`) — cap·virtualization 이 없다. **그러나 규칙은 최대 20건**(BE-064 §7.9)이라 1,000행 시나리오가 성립하지 않는다. 열 7개로 가로 scroll 도 불필요하다. **형제 두 화면과 달리 이 화면에서는 실질 위험이 없다** | 20건 픽스처로 scroll/검색이 매끄러운지. 도메인 상한이 무너지면(BE-064 §7.11 트리거 카탈로그가 서버 소유가 되면) 재판정 | **pass(도메인 상한)** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(grep) — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 닫기·새 토글에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | 에러 타입 `HttpError` 가 status 를 갖고 `?status=<op>:<code>` 로 9종을 재현할 수 있다(`dev.ts:26-37`). **그러나 화면이 분기하는 것은 404 하나뿐**(`FormPageShell.tsx:121`)이다. 400 을 `useCrudForm` 이 분기하지 않아 배너로 뭉개지고(`:194`), 403·429 가 일반 배너/토스트로, **토글은 403·409·500 을 전부 한 토스트 문구로** 뭉갠다. 409(폼)·422(`violations` 있을 때)는 정확 | `?status=save:403` vs `save:429` vs `save:500` 이 다른 surface 를 그리는지. 전부 같으면 gap | **gap** |
| EXC-07 | P1 | 서버 422 의 `violations` 를 RHF `setError` 로 필드에 꽂고 첫 필드로 포커스한다(`useCrudForm.ts:181-192`). **경로가 실재한다** — BE-026 이 gap 이던 항목이 이 화면은 pass 다(`useCrudForm` 을 쓰기 때문). **단 서버가 `error.fields` 를 채워야 발현되고**, 400 은 이 경로를 타지 않는다(BE-064 §7.12 가 '필드 거절을 422 로 통일'을 이관) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **pass** |
| EXC-11 | P1 | `navigator.onLine` 이 **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 구분한다 — `createStoreAdapter.fetchOne` 이 없는 id 에 `HttpError(404)` 를 던지고(`crud.ts:192-194`, 주석 `:183-190` 이 '404 분기가 영원히 발현되지 않았다'는 과거를 기록), `useCrudForm` 이 `isNotFound` 로 `loadFailure` 를 가르며(`useCrudForm.ts:144-149`), `FormPageShell` 이 **404 면 '다시 시도'를 숨기고 문구를 바꾼다**(`FormPageShell.tsx:116-144`). BE-026 이 gap 이던 항목이 이 화면은 pass 다 | `?status=detail:404` → '발송 규칙을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만. `?status=detail:500` → '불러오지 못했습니다.' + '다시 시도' + '목록으로'. **두 화면이 같으면 gap** | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 토글조차 비관적이다(`useCrudRowUpdate` 에 `onMutate`/`setQueryData` 0건). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | `onMutate`/`setQueryData` grep 이 0건인지 | **pass** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여준다** — `referenceOf(cause)`(`useCrudForm.ts:195`) → `errorReference` → `FormServerError`(`FormPageShell.tsx:168`). raw stack 노출 없음. **⚠ 폼 저장에만 있다** — 토글 실패 토스트·삭제 실패 배너에는 reference 가 없다 | `?status=save:500` → 폼에서 reference code 가 보이는지. 토글 500 → 없으면 부분 gap | **pass(부분)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 400ms (BE-064 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다(`dev.ts:11`). 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 300ms (필드 7개) | 위와 동일 |
| 저장 p95 | ≤ 400ms | 위와 동일 |
| **토글 p95** | **≤ 250ms** — 스위치는 즉각적으로 느껴져야 한다. 400ms 는 '눌렀는데 안 되나?' 구간이다 | 위와 동일. **낙관적 업데이트가 없어 체감이 왕복에 그대로 묶인다**(EXC-14 는 pass 지만 UX 비용이 있다) — §5 #13 |
| 첫 렌더(목록) | ≤ 1.0s (LCP) | 미측정. **20건 상한이라 건수 비례 위험이 없다**(ERP-15 pass) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시 — **충족** |
| 검색 입력당 요청 | **0 요청** (클라이언트 필터) + URL replace 1회 | **충족.** 250ms 디바운스가 커밋 횟수를 지배하고(COMP-10) 필터 연산은 20건 대상이라 무시 가능 |
| 저장 요청 크기 | ≤ 1KB | **충족 — 상한이 구조적이다.** `NotificationRuleInput` 은 필드 5개(문자열 3 · 불리언 1 · 열거 1)다. BE-026 이 겪은 '이력에 비례해 무한 증가'가 여기엔 없다 |
| 일괄 삭제 동시 요청 | ≤ 20 | **구조적 상한.** 그러나 **레이트리밋(분당 60)이 20건 삭제를 세 번 반복하면 걸린다**(BE-064 §7.9) — 그때 부분 실패로 떨어진다 |
| 메모리 | 규칙 전량(≤20건) + 상세 1건 | 무시 가능 |
| 번들 | 이 화면 고유 코드 ≤ 15KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). `_shared/notification.ts` 는 세 화면이 공유 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). **툴바·필터가 남는다** — 단 '켜짐 0건'이 사실이 아닌 값으로 남는다(FS-064 §7 #11) |
| 폼 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass). 단 배너가 화면 전체를 대체해 맥락이 사라진다(FS-064 §7 #16) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 충돌(409, 대상 삭제됨) | 입력 보존 + 충돌 다이얼로그 + 유령 저장 없음 | **충족**(EXC-04 의 ①② 절) |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — last-write-wins**(EXC-04 의 ③ 절 · BE-064 §7.1). **이 화면 최대 정합 위험** |
| 저장/토글 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **토글 연타** | 정확히 1요청, 스위치가 화면과 일치 | **미충족**(EXC-08 gap). abort 가 완화하나 서버 도달 순서를 보장하지 않는다(BE-064 §7.10) |
| **템플릿 삭제로 규칙 무력화** | 삭제 전 경고 또는 서버 거절 | **미충족 — 조용히 깨진다.** `rulesUsingTemplate`(`store.ts:403-405`)이 그 용도로 존재하나 **프로덕션 소비처 0건**(grep). 발송 규칙 목록에 가야만 danger 배지가 보인다(BE-064 §7.5) |
| 세션 만료 중 편집 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 폼 입력을 버린다(EXC-19 P1). **단 목록의 필터·검색은 `returnUrl` 쿼리로 복원된다**(IA-13 의 부수 이득) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484-493`). FS-064-EL-027·EL-035·EL-009.6 의 동기 store throw 도 여기서 멈춘다 |

### 4.3 운영 안전 (이 도메인 고유 — quality-bar 밖)

발송 규칙은 **미래의 모든 발송을 지배하는 설정**이다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다. 근거는 전부 코드다.

| 요구 | 현재 상태 |
|---|---|
| **보안 알림을 끈 사실이 기록된다** | **미충족.** `security.login-new-device`·`security.verification-code` 규칙(`notification.ts:150-160`)을 토글 한 번으로 끌 수 있고 감사 기록이 없다. 픽스처가 이들에 재시도 3회를 준 이유를 store 가 밝힌다 — '인증번호가 안 가면 로그인을 못 한다'(`store.ts:250`). **누가 껐는지 아무도 모른다.** BE-064 §7.6 【보안 판정】 |
| 규칙 변경이 감사 로그에 남는다 | **미충족.** 앱에 `/logs/admin` 화면이 있으나(`nav-config.ts:208`) 이 화면의 쓰기가 거기로 가는 배선이 없다 |
| 한 이벤트에 알림이 두 번 나가지 않는다 | **부분 충족.** 클라이언트 스키마가 막는다(`validation.ts:43-54`). **그러나 그 판정 근거가 브라우저 안 배열(`listRules()`)이라 우회 가능하고, 다른 관리자의 동시 생성도 못 잡는다** — 서버 정본 필요(BE-064 §7.2) |
| 규칙이 가리키는 템플릿이 그 이벤트의 것이다 | **부분 충족.** select 후보를 채널+트리거로 좁힌다(`store.ts:386-394`). **서버 재검증이 없으면 미치환 변수가 빈칸으로 발송된다**(BE-064 §7.4 【보안·정합 판정】) |
| 규칙이 가리키는 템플릿이 존재한다 | **미충족 — 사후 표시뿐.** 목록의 danger 배지(`RuleListPage.tsx:131`)는 이미 깨진 뒤에 보인다. 예방은 §4.2 의 '템플릿 삭제' 행 |
| 발송 이력·실패를 이 화면에서 볼 수 있다 | **표면 없음(미정).** 열 5개에 '마지막 발송'·'실패 수'가 없고 어댑터에 그 조회가 없다. `retryPolicy` 를 정하는데 **재시도가 실제로 몇 번 일어났는지 알 방법이 없다** — 정책만 있고 관측이 없다. BE-064 §1 이 범위 밖으로 두었다(심 없음) |
| 쓰기 권한이 조회 권한과 분리된다 | **미충족.** 프론트 게이팅 부재(EXC-03 gap) + 서버 판정(BE-064 §7.7 `admin` 전용)이 화면에 표현되지 않는다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | IA-02 | P0 | 폼 sub-route 에 `<h1>` 이 2개('알림 발송' + '발송 규칙 등록') + AppHeader 가 행위를 반영하지 않는다. **가지 폴백은 통합이 해소했다 — 사유가 바뀌었다.** 목록은 pass | **앱 전역**(`AppHeader`·`FormPageShell` title 모델) | A40 · A11 (횡단 배치) |
| 2 | IA-04 · COMP-07 | P0 · P2 | Pagination 없음 — 전량 렌더. **도메인 상한 20건이라 심각도는 낮으나 `PAGE_SIZE=10` 관례로는 초과 가능.** `SeqCell` 의 `startIndex` 부재가 함께 발현된다 | 공용 `CrudListShell`/`CrudTable` | A41 · A11 (횡단 배치) |
| 3 | EXC-03 | P0 | write 액션 게이팅 미배선 — `useRouteWritePermissions` 소비처 8곳에 알림 관리 없음. **`operator` 가 보안 알림 토글을 본다**(BE-064 §7.6·§7.7 과 맞물림) | **앱 전역** | A11 change_request |
| 4 | EXC-04 | P0 | **낙관적 동시성 토큰 부재 — 동시 편집이 last-write-wins.** `updatedAt` 이 있는데 `If-Match` 로 실리지 않는다. ⚠ **유령 저장·409 UI 는 이미 pass** — gap 은 토큰 절 하나다 | 공용 어댑터 계약(`createStoreAdapter` 소비 화면 전부) | A63 (BE-064 §7.1) · A41 |
| 5 | EXC-08 | P0 | **자동 발송 토글에 동기 락·멱등키 없음** — `useCrudRowUpdate.ts:44-45`. 확인 다이얼로그도 없어 `crud.ts:36-39` 의 생략 예외가 성립하지 않는다. **이 화면 고유 gap**(형제 두 화면은 pass) | 공용 `useCrudRowUpdate` + 이 화면 | A41 · A11 (BE-064 §7.10) |
| 6 | COMP-01 | P1 | `FormPageShell.tsx:190` 이 `loading` prop 대신 손으로 쓴 '저장 중…' 라벨. **화면 코드가 아니라 공용 셸 소유** — `buttonStyle`/`tds-ui-btn-*` 손조립은 이 섹션 0건 | 공용 `FormPageShell` | A41 |
| 7 | COMP-06 | P2 | 스켈레톤 행 수 하드코딩 `length: 5`(`CrudTable.tsx:144`) | 공용 `CrudTable` | A41 (#2 와 함께) |
| 8 | COMP-09 | P2 | 템플릿명 셀에 truncate 없음. **`_shared/styles.ts:53-61` 의 `ellipsisCellStyle` 이 바로 그 용도로 있는데 이 화면만 쓰지 않는다**(형제 두 화면은 쓴다) — 한 줄로 해소 | 이 화면 | A11 change_request |
| 9 | FEEDBACK-01 · EXC-20 | P1 | 토글 실패 error toast 가 **자동 소멸하고 '다시 시도'·reference 가 없다**(`useCrudRowUpdate.ts:53`) | 공용 `useCrudRowUpdate` | A41 · A11 |
| 10 | (FEEDBACK-02 관련 · 요구 위반 아님) | — | **자동 발송 토글의 운영 무게와 상호작용 비용이 비대칭이다** — 보안 알림을 끄는 것이 클릭 한 번이고 확인도 권한 게이팅도 없다. 되돌릴 수 있어 FEEDBACK-02 의 대상은 아니나(§2 판정), **BE-064 §7.6 이 감사 로그를 요구하는 바로 그 액션**이다 | 이 화면 + BE 계약 | A11 · A63 (BE-064 §7.6 — 보안 최우선) |
| 11 | EXC-06 | P1 | status 별 surface 미분기 — 400·403·429 가 일반 배너/토스트로 뭉개진다. **404 만 갈린다.** 서버가 필드 거절을 422 로 내면 프론트가 이미 옳게 그린다 | 이 화면 + BE 계약 | A11 · A63 (BE-064 §7.12) |
| 12 | ERP-04 | P1 | sortable header 없음(고정 default-sort). 20건에서는 요구가 약하다 | 공용 `CrudTable` | A41 (후순위) |
| 13 | (§4.1) | — | **토글 체감이 400ms 왕복에 묶인다** — 낙관적 업데이트가 없다. EXC-14 는 pass 지만(위반 표면 부재) 스위치 UX 비용이 있다. 도입 시 rollback 페어링 필수 | 이 화면 | A11 (검토) |
| 14 | EXC-09 (표면상) | P0 | 일괄 삭제의 `settleAll` 이 abort 를 실패 수에서 제외하지 않는다. **그러나 `onSuccess` 의 aborted 가드(`useCrudList.tsx:137`)가 집계를 통째로 버려 관측되지 않는다** — pass 로 두되 기록 | 공용 `shared/bulk` | A41 (관측 불가 — 후순위) |
| 15 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 |
| 16 | (§4.3) | — | **운영 안전** — 보안 알림 비활성의 감사 로그 부재 · 규칙 변경 감사 부재 · 중복 규칙의 서버 검증 부재 · `templateId` 참조 서버 검증 부재 | BE 계약 | **A63 (BE-064 §7.2·§7.4·§7.6 — 최우선)** |
| 17 | (§4.2·§4.3) | — | **템플릿 삭제가 규칙을 조용히 무력화한다** — `rulesUsingTemplate` 프로덕션 소비처 0건(grep 확인). 삭제 전 경고 또는 서버 409 `TEMPLATE_IN_USE` 필요 | 이 화면 + FS-065/066 + BE 계약 | A63 (BE-064 §7.5) · A11 |
| 18 | (BE-064 §7.3) | — | 템플릿 후보 조회가 어댑터 없는 동기 store 직접 호출 — 연동 시 **`RuleFormPage` 가 `useQuery` 를 새로 배선해야 한다**(로딩·실패·재시도 UI 가 신규 요구사항으로 발생) | 이 화면 | A11 (연동 산정에 반드시 포함) |
| 19 | (BE-064 §7.11) | — | **트리거 카탈로그 소유자 미정** — 서버 소유가 되면 `z.enum`·변수 카탈로그·20건 상한(ERP-15 pass 의 근거)이 함께 무너진다 | 도메인 경계 | A01 · A63 |
| 20 | (MOTION-03 · DS) | P0 | **✅ 해소됐다 — 이관 종료.** `4b805ad` 기준의 '`ToggleSwitch.css:32,56` 에 reduced-motion off 없음' 은 낡았다. **`ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `none` 으로 끈다**(두 선언 모두 덮음, 근거 주석 `:76-78`). **알림 관리 3화면 중 이 화면만 노출돼 있던 DS gap 이 사라졌다** — 후속 작업 없음. 기록으로만 남긴다 | `packages/ui` | **— (완료)** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 시점의 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`ruleAdapter` 는 `createStoreAdapter({ scope: RULE_RESOURCE, … })`(`data-source.ts:18-19`)이고 `RULE_RESOURCE = 'notification-rules'`(`:12`)다. 팩토리가 부르는 op 는 **4개**다(`crud.ts:176,181,199,207,228`):

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:176`) | `?fail=list` · `?fail=notification-rules:list` · `?fail=all` |
| `detail` | `fetchOne` (`:181`) | `?fail=detail` · `?fail=notification-rules:detail` · `?fail=all` |
| `save` | `create` (`:199`) **와** `update` (`:207`) — **둘이 같은 op 를 쓴다** | `?fail=save` · `?fail=notification-rules:save` · `?fail=all` |
| `delete` | `remove` (`:228`) | `?fail=delete` · `?fail=notification-rules:delete` · `?fail=all` |

- **`?fail=save` 는 등록·수정·토글을 **동시에** 실패시킨다** — 토글이 `update` 를 쓰기 때문이다(`useCrudRowUpdate.ts:44`). 토글만 실패시킬 방법이 없다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 `?delay=` 가 아니라 **분류 필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:14-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status **9종**(`dev.ts:27-37`): 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

| 판정 | 재현 |
|---|---|
| EXC-12 (404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 ①② (409 conflict) | `?status=save:409` — **충돌 다이얼로그가 입력을 보존한 채 뜨면 pass**(현재 pass) |
| EXC-04 ③ (토큰) | **스위치로 재현 불가** — `grep -rn "If-Match\|ETag" apps/admin/src` = 0건으로 판정. 동시 편집은 두 탭 수동 재현 |
| EXC-03 (403 강등) | `?status=save:403` — 배너/토스트가 권한 문구로 갈리지 않으면 EXC-06 gap. 버튼이 애초에 보이면 EXC-03 gap |
| EXC-06 (status별 surface) | `?status=save:400` · `save:403` · `save:429` · `save:500` — 전부 같은 배너면 gap |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼 배너에 reference 가 보이면 pass. 토글 토스트엔 없다 |
| EXC-07 (422 필드) | `?status=save:422` — **`HttpError` 의 `violations` 가 비어 있으면 배너로 떨어진다**(`useCrudForm.ts:182`). `dev.ts` 는 `violations` 를 채우지 않으므로 **이 스위치만으로는 필드 인라인을 재현할 수 없다** — 어댑터를 직접 손봐야 한다 |
| EXC-08 (토글 연타) | 네트워크 스로틀 + 토글 2연타 → 요청 2건이면 gap. `grep "idempotencyKey" shared/crud/useCrudRowUpdate.ts` = 0건으로도 판정 |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · EXC-04③ · EXC-05 · EXC-08 · EXC-11 · ERP-13 · MOTION-03 판정) · RTL(A11Y-11 의 describedby↔alert id 일치, A11Y-12) · 기존 테스트 — `_shared/notification.test.ts`(트리거·변수·광고성·바이트·필터/검색/정렬·중복 규칙 순수 규칙 회귀 · 213줄) · **`_shared/store.test.ts`(98줄 — 커졌다)**: 템플릿 후보·템플릿명·`rulesUsingTemplate`·정렬에 더해 **describe '템플릿 삭제 — 쓰는 규칙이 있으면 막는다'(`:69-98`)** 3건이 신설됐다. **이 화면과 직접 맞물린다** — `store.remove`(`:82-103`)가 이제 `rulesUsingTemplate` 을 호출해 **이 화면의 규칙이 참조하는 템플릿의 삭제를 409 로 막는다.** 즉 형제 화면(FS-065·FS-066)에서 템플릿을 지워 **이 화면의 규칙이 '템플릿 없음' 으로 깨지는 경로가 막혔다**(`RuleListPage.tsx:131` 의 danger 배지가 뜰 일이 줄었다). `:57-61` '모든 규칙이 실재하는 템플릿을 가리킨다(픽스처 무결성)' 도 그 계약을 지킨다 · `send/send.test.ts`(스키마 회귀 — 템플릿 필수 · 중복 금지 · selfId 제외) · **`send/RuleListPage.test.tsx`(jsdom 스모크 — 픽스처 행 렌더 · 이벤트 열 · **마케팅 링크 href** · ON/OFF 스위치 · **A11Y-12 aria-pressed**). E2E 는 이번 배치에서 금지라 jsdom 에서 실제 provider 로 렌더한다(`RuleListPage.test.tsx:8`)**.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 — 폼 modal 부재, 등록·수정이 전용 라우트다)
- [x] §2.1 산수 검산 — 11 pass + 13 종속 + 1 n-a + 5 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. **A11Y-12 를 n-a 가 아니라 종속으로 판정**했다 — 좌측 `FilterPanel` 표면이 실재하고 이 섹션의 테스트가 그 계약을 고정한다
- [x] **EXC-04 의 두 절을 분리 판정**했다 — 유령 저장 해소(pass)와 동시성 토큰 부재(gap)를 섞지 않았고, **409 가 '존재 여부' 기반이지 version/ETag 가 아님**을 §2 와 §4.2 에 명시했다
- [x] **EXC-08 을 표면별로 판정**했다 — 폼 저장 3중 충족 / 토글 gap / 삭제는 `crud.ts:36-39` 의 의도된 예외. **이 화면만 토글 때문에 gap 이고 형제 두 화면은 pass** 임을 §2.1 에 적었다
- [x] **COMP-10 · IA-13 을 pass 로 판정한 근거를 명시**했다 — 이 화면은 `useDebouncedSearch` 를 **직접 import 하지 않지만** `useListState` 를 통해 전부 상속한다(`useListState.ts:24,227-230`)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·금액·CSV·2열 preview)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`notification-rules`)와 op 4종을 **팩토리 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음). **`?fail=save` 가 등록·수정·토글을 동시에 실패시킴**을 밝혔다
- [x] **'E2E 미실행 — 근거는 코드 대조' 와 기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 과 §6 에 명시했다. **뒤집힌 판정 1건(MOTION-03 의 gap 사유 해소 — `ToggleSwitch.css:79-84`)을 §1 · §2 · §5 #20 에 반영**했고, MOTION-01/02 는 **근거 텍스트만** 갱신했다(오버레이 모션 CSS-only 구현 · 라이브러리 부재로부터 gap 을 추론하던 문장 삭제). **P0 건수는 불변**이다(§2.1)
- [x] §5 의 gap 이 FS-064 §7 · BE-064 §7.14 와 일치한다
- [x] **NFR-036(마케팅) 판정이 F2 기준이라 낡았음**을 §2.1 각주에 기록했다(COMP-10·IA-13 이 뒤집혔고 EXC-04 의 사유가 바뀌었다)
</content>
