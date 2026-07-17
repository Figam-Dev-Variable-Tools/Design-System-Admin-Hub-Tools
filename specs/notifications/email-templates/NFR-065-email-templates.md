---
id: NFR-065
title: "이메일 템플릿 비기능 명세"
functionalSpec: FS-065
backendSpec: BE-065
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-065. 이메일 템플릿 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-065 이메일 템플릿 (`/notifications/email-templates` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-065(요소·예외) · BE-065(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. gap 은 §5 를 거쳐 이관되며 FS-065 §7 · BE-065 §7.11 과 번호가 일치해야 한다 |
| 판정 기준일·근거 | **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6). 이전 기준 `4b805ad` 대비 **이 화면에서 뒤집힌 판정**: ① **TOKEN-01 — 근거가 바뀌었다.** 이 화면의 미리보기가 참조하던 `--tds-typography-title-sm-*` 는 **실재하지 않는 토큰이었다**(title 티어는 `md` 부터 — `packages/ui/generated/tokens/tokens.css:186-189`). PR #32 가 `title-md-*` 로 고쳤다(`EmailTemplateFormPage.tsx:46-49`) — **이전의 pass 판정은 근거가 틀렸고 지금은 진짜 pass 다** ② **MOTION-03 — 근거가 바뀌었다.** `ToggleSwitch.css:79-84` 에 reduced-motion 게이트가 **실재하게 됐다**(이 화면엔 ToggleSwitch 가 없어 판정 자체는 무영향) ③ **§4.2 '템플릿 삭제로 규칙 무력화' 가 미충족 → 충족으로 뒤집혔다** — `_shared/store.ts:95-101` 이 409 로 막는다(§5 #5) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 공용 훅/셸을 쓰더라도 **이 화면의 배선이 결과를 가른다**면 직접이다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 **결정에 참여하지 않는 소비자** — **표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 코드 근거로 충족 / 미충족(§5 이관) / 소유 문서 판정을 따름 |

### 1.2 화면 성격

**목록 + 등록/수정 폼 CRUD** 이며 공용 CRUD 프레임워크(`shared/crud/**`)를 정면으로 소비한다 — 목록은 `useCrudList` + `CrudListShell` + `useListState`, 폼은 `useCrudForm` + `FormPageShell`, 어댑터는 `createStoreAdapter`.

**형제 두 화면(FS-064 발송 규칙 · FS-066 SMS 템플릿)과의 차이**:
- **FS-064 와 달리**: ① 목록에 인라인 쓰기(ToggleSwitch)가 **없다** → EXC-08 이 pass 다 ② 쿼리 밖 동기 store 호출이 **0건**이다(저 화면은 템플릿 후보·중복 검증을 동기로 읽는다) → 연동 시 어댑터 본문만 바꾸면 된다(BE-065 §6.1) ③ **컬렉션 상한이 없다**(저 화면은 20건) → IA-04·ERP-15 의 심각도가 높다.
- **FS-066 과 달리**: **제목(subject) 필드가 있고 바이트 카운터가 없다.** 상한이 글자수(제목 100 · 본문 2,000)이지 바이트가 아니다.

**⚠ 이 화면은 아무것도 발송하지 않는다**(FS-065 §1) — 문구만 관리한다. 발송 경로가 코드에 0건이다(`data-source.ts:4-5`). 따라서 **'비가역 발송'을 전제로 하는 판정은 다른 표면에 걸린다** — 삭제와 discard 다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 네 상태가 정확히 갈린다. ① first-load — `useCrudList.tsx:71` `firstLoading = isFetching && data === undefined` → `CrudTable loading`(`CrudListShell.tsx:135-137`) ② refetching-with-data — `refreshing`(`:72`)은 표를 **덮지 않고** 요약에 ' · 새로고침 중…' 만(`CrudListShell.tsx:118-122`) ③ empty — 성공·0행일 때만 `Empty`(`CrudTable.tsx:153-169`) ④ error — read 실패일 때만 요약+표를 배너로 대체(`CrudListShell.tsx:113,156-165`). **폼도 같다** — `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:136`) | `/notifications/email-templates` 진입 → 행 렌더 확인 → 분류 필터 변경(또는 `staleTime` 30초 경과 후 재진입). **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` → error Alert만 · 0행 필터 → Empty만 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** ① 목록 read 실패 → 인라인 `<Alert tone="danger">` '이메일 템플릿 목록을 불러오지 못했습니다.' + '다시 시도'(`CrudListShell.tsx:157-164`) ② 폼 상세 실패 → 인라인 danger `Alert` + '다시 시도' + '목록으로'(`FormPageShell.tsx:125-141`). **read 실패에 error toast 를 쓰지 않는다.** **empty 로 폴백하지 않는다** — `error === null` 일 때만 표/Empty(`CrudListShell.tsx:113`) | `?fail=list` · `?fail=detail`. **각각 danger Alert + '다시 시도'가 떠야 pass.** 404 가 '다시 시도'를 숨기는 것은 EXC-12 의 요구이지 위반이 아니다 | **pass** |
| STATE-04 | STATE | 직접 | **충족(걸리는 절만).** (b) **선택 해제** — `useEffect(() => { clear(); }, [category, keyword, clear])`(`EmailTemplateListPage.tsx:68-70`) + `useListState` 의 view 서명 감시(`useListState.ts:205-213`, StrictMode 안전). '선택 N건 삭제'가 화면에 없는 행을 지울 수 없다. (a) **page clamp** — `clampPage` 가 훅에 있으나(`useListState.ts:217-223`) **이 화면이 부르지 않는다. 페이지네이션 표면이 없어 clamp 할 page 가 없다** — 그 부재는 IA-04 가 gap 으로 잡는다 | 템플릿 3건 선택 → 좌측 '보안' 필터 클릭. **선택이 해제되고 SelectionBar 가 사라져야 pass** | **pass** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `pages/notifications/**` 전체에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep). 이 화면 고유 스타일(`EmailTemplateFormPage.tsx:40-74` 미리보기 3종)도 전부 `var(--tds-*)` 다 — `--tds-typography-title-md-*` · `--tds-space-*` · `--tds-border-width-thin` · `--tds-radius-md` · `--tds-color-surface-raised`. `_shared/styles.ts:6-8` 이 규칙을 못박는다(토큰만 + shorthand/longhand 혼용 금지). **⚠ 근거가 뒤집혔다 — 이전 기준(`4b805ad`)의 pass 는 틀린 판정이었다.** 미리보기 제목이 참조하던 `--tds-typography-title-sm-*` 4개는 **정의된 적이 없는 토큰**이다: title 티어는 `md`·`lg`·`xl` 뿐이고(`packages/ui/generated/tokens/tokens.css:186-197`) **`title.sm` 은 `tokens/tokens.json` 에도 생성물에도 없다.** 즉 이 화면은 값을 하드코딩하지 않은 대신 **아무것도 가리키지 않는 var() 를 참조해 조용히 폴백 없이 무너지고 있었다** — 'hex/px 0건' grep 이 그것을 잡지 못했다. PR #32(`fbcc7c2`)가 `title-md-*` 로 고쳤다(`EmailTemplateFormPage.tsx:46,47,48,49`). **지금은 진짜 pass 다** | ① `grep -nE "#[0-9a-fA-F]{3,6}\b\|[1-9][0-9]*px\|'(thin\|medium\|thick)'" apps/admin/src/pages/notifications` → **0건이어야 한다**(현재 0건) ② **참조 토큰 실재 검사** — `npx vitest run src/shared/token-guard.test.ts`(`apps/admin`)의 describe '앱 토큰 가드 — 실재하지 않는 토큰을 참조하지 않는다'(`token-guard.test.ts:208-268`)가 `packages/ui/generated/tokens/tokens.css`(`:33`)를 정본으로 파싱해(`:211-213`) `apps/admin/src` 전체(`:29`)의 `.css`(`:51`)·`.ts`/`.tsx`(`:57`) 참조를 대조한다. **실행: 11 tests pass · 위반 0건.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable` — `TransactionalNotice.tsx:30` · `FilterPanel.tsx:63` · `FormPageShell.tsx:150` · **`TemplateIdentityFields.tsx:63`(템플릿명 input)** · **`VariableInsertBar.tsx:67`(변수 칩)**. DS `<Button>`·`<SelectField>`·`<SearchField>`·`<TextareaField>`. **이 화면이 `:focus-visible` 을 직접 선언하지 않는다** | DS 토큰 판정 종속. 로컬 `:focus-visible` CSS 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 소비 표면: 스켈레톤 펄스(`CrudTable.tsx:148` · `FormPageShell.tsx:173`) · Toast · DS Button transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건). **ToggleSwitch 가 없다** — FS-064 와 다른 점 | tokens codegen · `Toast.css` 판정 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 소비 표면: `<Card>`(`FormPageShell.tsx:165`) · Toast · 삭제/충돌/이탈 Modal · `<Alert>`. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건). 미리보기 박스는 shadow 가 아니라 border + `surface-raised` 로 층을 만든다(`EmailTemplateFormPage.tsx:64-74`) | Card/Modal/Toast 판정 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면이 `<h1>` 을 직접 그리지 않는다.** ① 목록 제목 = `AppHeader.tsx:101` ② 폼 제목 = `FormPageShell.tsx:160` `<h1 style={pageTitleStyle}>` — `:159` 가 'TOKEN-05 — 페이지 제목은 공유 `pageTitleStyle`(title.xl) 하나에서 온다'로 못박는다. **⚠ 이 화면이 직접 소비하는 title tier 가 하나 있다** — 미리보기 제목 `previewSubjectStyle`(`EmailTemplateFormPage.tsx:40-50`)이 **`--tds-typography-title-md-*` 를 참조한다**(`:46-49`). **그것은 `<h1>` 이 아니라 `<p>` 이며**(`:225`) 계층 요구의 대상이 아니다 — 값을 손으로 재현하지 않고 토큰을 참조하는 것은 TOKEN-01 이 이미 확인했다. **⚠ 기준 갱신으로 이 인용이 바뀌었다**: 이전 기준에선 `title-sm-*` 였고 **그 티어는 실재하지 않았다**(TOKEN-01 참조) | `pageTitleStyle`/`AppHeader.titleStyle` 판정 종속. 로컬 title **스타일 객체**는 미리보기용 1건이나 h1 이 아니다 | **종속** |
| COMP-10 | COMP | 직접 | **충족 — 이 화면은 `useDebouncedSearch` 의 유일한 직접 소비처가 아니라 `useListState` 를 통해 상속한다**(`useListState.ts:24,227-230`). `EmailTemplateListPage.tsx:55` 가 `useListState` 를 쓰고 `:83-89` 가 `{...list.searchInputProps}` 를 `SearchField` 에 스프레드한다. 그 props 가 나르는 것: ① 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) ② 250ms 디바운스(`:23,93-95`) ③ 조합 중 Enter 차단 — `nativeEvent.isComposing` **과** 자체 관측 `composingRef` 를 **둘 다** 본다(`:121-124`; 합성 이벤트에서 `isComposing` 이 누락되는 구멍을 닫는다 — `:117-120`) ④ 최소 길이(`:90-91`) ⑤ stale 응답은 쿼리 키가 방지(`:14-18`). `EmailTemplateListPage.tsx:81-82` 주석이 '판정은 공유 훅이 한다 — 이 화면은 핸들러를 스프레드하기만 한다'로 선언 | 검색창에 IME 로 '주문' 입력. **조합 중 '주ㅁ'·'주무' 가 URL(`?q=`)이나 표에 반영되면 gap.** 조합 중 Enter 가 제출을 일으키지 않아야 한다. 완성 후 250ms 에 `?q=주문` 이 **1회** 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | **파괴적/비가역 액션 두 종이 실재하며 둘 다 ConfirmDialog 로 게이트된다.** ① **delete intent** — 단건(`useCrudList.tsx:154-165`) · 일괄(`:166-177`), `intent="delete"` · `busy` → 확인 버튼 `disabled` + `aria-busy` + '처리 중…'(`ConfirmDialog.tsx:151-155`) · **실패 시 다이얼로그를 열어 둔 채 error 배너**(`:161`) · **취소/닫기가 in-flight 를 abort 하고 pending 을 리셋**(`:87-89`) ② **discard intent** — 이탈 가드(`FormPageShell.tsx:114`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 소유. **⚠ '발송'은 이 화면에 없다** — 비가역 발송 표면이 존재하지 않는다. **⚠ 이 화면의 삭제는 요구가 상정한 것보다 무겁다 — 다만 파급의 성격이 바뀌었다.** 이전 기준에선 삭제가 **발송 규칙을 조용히 깨뜨렸다.** 지금은 `_shared/store.ts:95-101` 이 `rulesUsingTemplate(id) > 0` 이면 **409 로 거절한다** — 조용한 파손은 사라졌다. 남은 것은 **안내의 시점**이다: 다이얼로그는 여전히 '되돌릴 수 없습니다'만 말하고 참조 규칙 수를 **미리** 말하지 않으므로, 운영자는 확인을 누른 **뒤에야** 실패 배너로 안다. 요구의 문구 계약(intent 매핑)은 충족하며 §5 #4 로 이관(사유가 '조용한 파손' → '사후 안내'로 축소됐다) | DS `ConfirmDialog` 판정 종속. `?fail=delete` 로 삭제 → **다이얼로그가 열린 채 error 배너가 뜨고 재클릭이 retry 되는지**, in-flight 중 취소가 false toast 없이 abort 되는지 확인 | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `EmailTemplateFormPage.tsx:153-155` 가 `isDirty={isDirty}` 와 `unsavedMessage={UNSAVED_MESSAGE}`(`:30-31`)를 `FormPageShell` 에 넘기고, 셸이 `useUnsavedChangesDialog(isDirty && !saving, { message })` 를 배선한다(`FormPageShell.tsx:114`) — **화면이 값을 공급하지 않으면 가드가 성립하지 않으므로 직접이다.** `isDirty` 는 **RHF `formState.isDirty`**(`useCrudForm.ts:261`) — 요구가 지정한 소스. 3경로는 훅 소유. 저장 성공 시 `navigate(listPath, { replace: true })`(`:223`)로 self-initiated 이탈이라 프롬프트가 뜨지 않는다. **⚠ 이 화면 고유 확인**: `TextareaField` 는 register 가 아니라 `setValue('body', …, { shouldDirty: true })`(`:204`)로 값을 넣고, **변수 칩 삽입도 `shouldDirty: true`**(`:138`)다 — 둘 다 dirty 에 잡힌다. 칩만 누르고 나가도 가드가 걸린다 | `/new` 에서 변수 칩 하나만 클릭한 뒤 ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 통과. **주의**: '목록으로'(FS-065-EL-017)·'취소'(EL-031)는 `navigate()` 라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-065 §7 #7 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 편집 가능한 폼을 담은 modal 이 없다 — 등록·수정이 **전용 라우트**(`App.tsx:296-297`)의 `FormPageShell` 이다. quality-bar IA-06 의 무게 규칙과도 일치한다(제목 100자 + 본문 2,000자 + 변수 삽입 + 미리보기를 갖는 rich 엔티티다). modal 4종(단건 삭제 · 일괄 삭제 · 이탈 가드 · 409 충돌)은 **전부 입력 필드가 없는 확인 다이얼로그**다 | 폼 modal 이 도입되면 재판정 | **n-a** |
| A11Y-01 | A11Y | 상속 | toast 표면 2종: ① 저장 성공(`useCrudForm.ts:222`) ② 삭제 성공(`useCrudList.tsx:108,146`). **FS-064 와 달리 토글 토스트가 없다.** 지속 live region 은 `ToastProvider` 소유 — 이 화면은 주입만 한다. 목록 상태용 지속 live region 은 `CrudListShell.tsx:107-109` 이 별도로 갖는다(A11Y-16 의 산물) | ToastProvider 판정 종속. 저장·삭제 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | dialog 표면 4종: 단건 삭제 · 일괄 삭제(`useCrudList.tsx:152-178`) · 이탈 가드(`FormPageShell.tsx:198`) · **409 충돌 `FormConflictDialog`**(`:196`). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 소유 | DS 판정 종속. 삭제 다이얼로그 open 시 '…삭제합니다. 이 작업은 되돌릴 수 없습니다.' 가 읽히는지 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 이 화면의 폼 컨트롤 4개를 전수 확인했다.** ① **템플릿명 input**(`TemplateIdentityFields.tsx:53-74`) — `FormField required` 의 자식이 **`<input>`** 이라 `aria-required` 가 런타임 주입된다(`FormField.tsx:36-41,50-56`). **게다가 호출부가 `required` 를 직접 준다**(`:68`) — 주입과 무관하게 native required 도 선다. `aria-invalid={nameError !== undefined}` 와 `aria-describedby` 를 **짝으로** 전환한다(`:69-70`: 오류면 `errorIdOf`, **아니면 `hintIdOf`**) — 요구의 '**유효할 때만 hint**' 절까지 정확. `:51-52` 주석이 그 계약을 선언 ② **이벤트 select**(`:76-98`) — `required` + `SelectField` 자식 → 주입(`FormField.tsx:41`). 오류 상태가 없어 `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않고 `aria-describedby={hintIdOf(triggerId)}` 로 힌트만 잇는다(`:89`) ③ **제목 input**(`EmailTemplateFormPage.tsx:183-197`) — `required` + `<input>` 자식 → 주입 + native `required`(`:191`). `aria-invalid` + `aria-describedby`(오류 시 `errorIdOf`, 아니면 **`undefined`** — 힌트가 없으므로 옳다, `:192-195`) ④ **본문 TextareaField**(`:200-211`) — DS 가 내부 배선한다(`TextareaField.tsx:62-67`): `required` + `aria-required={required ? true : undefined}` + `aria-invalid={invalid}` + `aria-describedby={invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined}`. 주석 `:58-59` 가 'required 는 FormField 의 마커(aria-hidden 장식)로만 그려져 AT 에 닿지 않았다 — 컨트롤 자신에게 잇는다'를 기록. **짝 없는 `aria-invalid` 0건.** **required FormField 자식이 전부 `input`/`SelectField`/`textarea` 라 GROUND-TRUTH 의 미주입 2건(래퍼 div/span)에 해당하지 않는다** | `grep -n "aria-invalid" apps/admin/src/pages/notifications/email-templates apps/admin/src/pages/notifications/_shared` → 히트 2건(`TemplateIdentityFields.tsx:69` · `EmailTemplateFormPage.tsx:192`), **각각 같은 요소에 `aria-describedby` 가 있는지 확인**(있다). RTL 로 템플릿명을 비운 채 '등록' → `input.getAttribute('aria-describedby') === screen.getByRole('alert').id`. required 컨트롤 4개가 `aria-required="true"` 를 노출하는지 확인 — **주입은 런타임이므로 grep 으로 판정하지 말 것**(GROUND-TRUTH §1) | **pass** |
| A11Y-12 | A11Y | 상속 | **표면이 실재한다** — 좌측 이벤트 분류 필터(`EmailTemplateListPage.tsx:103-110`). 공유 `FilterPanel` 이 `<button aria-pressed={active}>` 를 그리고(`FilterPanel.tsx:65`) **`aria-current` 를 쓰지 않는다**(`:14-16`). `FilterPanel.tsx:1-11` 이 이 파일의 존재 이유를 밝힌다 — **알림 관리의 필터가 ESG 것의 복제였고 한쪽은 `aria-current`, 다른 쪽은 `aria-pressed` 를 써서 A11Y-12 를 위반하고 있었다. 통합이 한 벌로 수렴했다.** 이 화면은 소비자다 | `FilterPanel` 판정 종속. **형제 화면의 테스트가 그 계약을 고정한다** — `send/RuleListPage.test.tsx:61-69` 가 `aria-pressed` true/false 와 `aria-current === null` 을 단언(같은 컴포넌트라 이 화면에도 유효). `grep "aria-current" apps/admin/src/pages/notifications` → 0건 | **종속** |
| MOTION-01 | MOTION | 상속 | Modal 표면 4종(삭제 ×2 · 이탈 가드 · 409 충돌). enter/exit 모션은 DS `Modal` organism 소유. **⚠ 근거 갱신 — 이전 기준의 추정을 지운다.** PR #26 이 오버레이 모션을 **구현했다. 단 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `Modal.css:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **Motion/AnimatePresence 소비는 `packages/ui/src` 에 여전히 0건이나**(모션 라이브러리 자체가 미도입 — `package.json`·import·lockfile 전부 0), 요구가 명시한 'exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`)로 동등 달성됐다 — **'0건이라 gap 일 가능성이 높다'는 이전 추정은 틀렸다.** 라이브러리 부재를 gap 으로 볼지는 DS 문서의 몫이다 | DS Modal 판정 종속. 이 화면이 소비하는 4개 Modal 표면이 실재함만 확인 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 2종(저장 · 삭제). exit 애니메이션은 `ToastProvider`/`Toast` 소유. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`) → keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. **요구 본문이 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`) | DS Toast 판정 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 표면: 스켈레톤 펄스(`ui.css:110` reduced-motion **있음**) · Toast(`Toast.css:136-141` **있음**) · Modal(`Modal.css:173-180` **있음**) · DS Button(`Button.css:158` **있음**). **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **⚠ `ToggleSwitch` 가 이 화면에 없다** — 이 화면의 판정에는 영향이 없으나 **이전 기준이 적어 둔 DS 현황 서술이 낡았다**: `ToggleSwitch.css` 의 reduced-motion 누락은 **해소됐다**(`:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `none` 으로 끈다 — `:32` background-color · `:56` transform 둘 다 덮는다). 즉 그 gap 은 **FS-064 에서도 더 이상 유효하지 않다** | 전역 motion config·`ui.css` 판정 종속. 로컬 transition 선언 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | **충족.** 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:295-297`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록 최상위가 `<div style={pageStyle}>`(`EmailTemplateListPage.tsx:99` → `_shared/styles.ts:12`), 폼 최상위가 `FormPageShell` 의 `<div style={pageStyle}>`(`:147`). 좌측 `FilterPanel` 은 **화면 안의 2열 그리드**(`_shared/styles.ts:20-25`)이지 앱 sidebar 가 아니다 — `<nav aria-label="이벤트 분류 필터">` 로 자기 이름을 갖는다(`FilterPanel.tsx:56`) | 세 라우트에서 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **부분 미충족 — 목록은 pass, 폼 sub-route 는 gap.** ① **목록 pass**: `/notifications/email-templates` 는 nav 잎이므로(`nav-config.ts:217`) `findCoveringLeaf` 가 자기를 찾아 `findNavLabel` 이 **'이메일 템플릿'** 을 돌려준다(`nav-config.ts:270-278,297-299`). AppHeader 가 `<h1>` 으로 렌더하고(`AppHeader.tsx:92,101`) **화면에 in-content `<h1>` 이 없다** → h1 1개 · 정확한 이름 ② **폼 gap**: `/new` 는 잎이 아니지만 `findCoveringLeaf` 가 '자기를 감싸는 가장 긴 잎' = `/notifications/email-templates` 를 찾아 **'이메일 템플릿'** 을 돌려준다 — **가지 폴백('알림 관리')은 통합이 해소했다.** **그런데 `FormPageShell.tsx:160` 이 `<h1>이메일 템플릿 등록</h1>` 을 또 그린다 → `<h1>` 이 2개다.** 게다가 `nav-config.ts:294-296` 이 밝히듯 **'등록/수정' 행위를 제목에 넣지 않는 것이 의도**다 — quality-bar IA-02 가 예시로 든 '가시 primary title 이 **공지 등록**' 은 미충족. **gap 의 사유가 바뀌었다: 가지 폴백(해소됨) → h1 이중 + 행위 미반영** | `/notifications/email-templates` → `document.querySelectorAll('h1').length === 1` 이고 '이메일 템플릿'이면 pass. `/new` → **`length === 2`('이메일 템플릿' + '이메일 템플릿 등록')이면 gap** | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: toolbar row(검색 좌측 `EmailTemplateListPage.tsx:83-89` · **primary '이메일 템플릿 등록' 우상단** `:91-94`) → 결과 count 요약(`CrudListShell.tsx:115-123`) → SelectionBar(`:125-133`) → table(`:135`). **미충족: Pagination 이 없다.** `grep "Pagination" apps/admin/src/pages/notifications apps/admin/src/shared/crud` → **0건**. `CrudTable` 이 `items.map(...)`(`:171`)으로 전량을 렌더한다. **'page size 초과 가능'인가 — 확실하다.** **FS-064 와 달리 상한이 없다**: 이름 중복을 막지 않고(BE-065 §EP-03 주) 한 트리거에 템플릿을 몇 개든 둘 수 있다 — A/B 문구·시즌 문구·폐기 예정 문구가 쌓인다. 앱 관례 `PAGE_SIZE = 10`(`pages/members/types.ts:71` 등 6곳) 기준으로 금방 넘는다. 현재 픽스처 7건(`store.ts:112-169`)이라 드러나지 않을 뿐이다. **BE-065 §7.9 가 페이징 도입을 판정했고 서버측 필터·검색·건수가 함께 와야 한다**(클라이언트는 현재 page 만 알기 때문) | 픽스처를 20건 이상으로 늘리고 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** ERP-15 와 한 배치 | **gap** |
| IA-05 | IA | 직접 | **충족.** `/new` 와 `/:id/edit` 가 **같은 컴포넌트**(`EmailTemplateFormPage`)로 해석된다(`App.tsx:296-297`). `useCrudForm` 이 `:id` 유무로 갈린다(`useCrudForm.ts:74-75`). **레이아웃이 동일**하고 다른 것은 title(`FormPageShell.tsx:160`)과 prefill(`useCrudForm.ts:131-134` `reset(toValues(loaded))`)뿐이다. create 전용/edit 전용 page 가 없다. `EmailTemplateFormPage.tsx:3` 이 이 계약을 선언 | 두 라우트가 같은 컴포넌트로 렌더되고 레이아웃이 동일한지, 제목·프리필만 다른지 확인 | **pass** |
| IA-13 | IA | 직접 | **충족.** 조회 상태의 **단일 원천이 URL** 이다 — `EmailTemplateListPage.tsx:55` `useListState({ filterDefaults: { [CATEGORY_PARAM]: FILTER_ALL } })`. 분류는 `?cat`(`notification.ts:421` — **세 목록이 같은 키를 쓴다**: '같은 키를 써야 링크가 한 가지 뜻을 갖는다'), 검색어는 `?q`(`useListState.ts:27`). 기본값과 같은 값은 URL 에서 지운다(`:115-117`). 갱신은 `{ replace: true }`(`:125`)라 검색어 한 줄에 history 를 쌓지 않고, **상세에서 Back 하면 그 URL 이 그대로 복원된다**(`:17-19`). 모르는 값은 `parseCategoryFilter` 가 `as` 없이 좁혀 '전체'로(`notification.ts:436-439`). `:53-54` 주석이 '이 섹션이 갖고 있던 사본(`useListQueryState`)은 여기로 수렴됐다'를 기록. **`page`·`sort` 는 쓰이지 않는다** — 페이지네이션·정렬 UI 표면이 없다(IA-04·ERP-04 소관) | 좌측 '계정' 필터 + 검색 '인증' → URL 이 `?cat=account&q=인증` 인지 → 행 클릭으로 `/:id/edit` → 브라우저 Back. **URL 과 필터·검색이 복원되면 pass.** URL 을 새 탭에 붙여넣어 같은 view 재현. `?cat=bogus` 는 '전체'로 | **pass** |
| EXC-01 | EXC | 상속 | 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` **바로 바깥**에 두는 `ErrorBoundary`(`AppShell.tsx:18,484-493` + `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 소비자다. **⚠ FS-064 와 달리 이 화면엔 던질 수 있는 동기 store 호출이 없다** — 쿼리 밖 store 접근 0건 | ErrorBoundary 판정 종속. 컴포넌트 강제 throw 시 사이드바 유지 + 복구 화면 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher`. **이 화면의 조회·저장·삭제 실패가 전부 이 인터셉터를 통과한다.** **이 화면의 이득**: `returnUrl` 에 쿼리가 포함되므로 **재로그인 후 필터·검색까지 복원된다**(IA-13 과 맞물린다) | auth/session 판정 종속. `?status=list:401` → `/login?returnUrl=%2Fnotifications%2Femail-templates…&reason=session_expired`. (폼 미저장 입력 유실은 EXC-19 P1 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): **read 게이팅** — `RequirePermission` 이 `<Outlet>` 을 감싸(`AppShell.tsx:490-491`) 권한 없는 deep-link 에 403 화면을 렌더하고, 라우트→리소스 파생이 `/:id/edit` 까지 덮는다(`route-resource.ts` — `nav-config.ts:260-278` 과 같은 규칙). 세 잎이 `menu.notifications` 권한을 공유한다(`nav-config.ts:214`). **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan` 소비처는 **8곳**(`logs/components/LogListShell` · `products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`)이며 **알림 관리가 없다**(grep). `can(resource,'update')` 를 묻지 않고 렌더되는 쓰기 컨트롤 4종: '이메일 템플릿 등록'(`EmailTemplateListPage.tsx:91`) · RowActions 수정·삭제(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126`) · '등록/저장'(`FormPageShell.tsx:189`). **이 화면에서 무거운 이유**: BE-065 §7.7 이 쓰기를 `admin` 전용으로 판정한 근거가 **'인증번호 메일 문구를 바꿀 수 있다는 것은 피싱 문구를 정본으로 만들 수 있다는 뜻'**(시드 `ntf-email-5` — `store.ts:145-152`)이다. `operator` 가 그 버튼을 보고 누르며 서버 403 이 '저장하지 못했습니다' 배너로 뭉개진다(강등 reconcile 없음) | 권한 스토어에서 `notification-email-templates` 의 `update` 를 끈 뒤 진입. **'이메일 템플릿 등록'·행 수정/삭제가 그대로 보이면 gap.** read 를 끄면 403 화면(이쪽은 pass). `?status=save:403` → 배너가 권한 문구로 갈리지 않으면 EXC-06 gap 도 | **gap** |
| EXC-04 | EXC | 직접 | **부분 미충족 — ⚠ 두 절을 분리해 판정한다.** **충족된 절(F3b 가 해소)**: ① **유령 저장이 사라졌다** — `createStoreAdapter.update` 가 `if (!exists(id)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`(`crud.ts:219-221`, 주석 `:210-218` 이 '유령 저장(ghost saved)' 이라는 이름과 경위를 기록), `remove` 도 같다(`:232-234`) ② **409 를 해소할 UI 가 있다** — `useCrudForm` 이 `isConflict(cause)` 를 잡아 **입력을 보존한 채** 충돌 다이얼로그를 띄우고(`useCrudForm.ts:166-178` — `reload`/`dismiss`) **성공 토스트도 목록 이동도 하지 않는다**(`:164-165`). `FormPageShell.tsx:196` 이 렌더한다. **미충족된 절**: ③ **낙관적 동시성 토큰을 보내지 않는다.** 요구 본문은 '`If-Match`/`ETag` **또는** `updatedAt`/`version` 을 **보낸다**'인데 어댑터가 아무것도 싣지 않는다(`crud.ts:205-225` 에 헤더 개념이 없다). **`EmailTemplate.updatedAt` 이 존재하고 목록에 '수정일시' 열로 표시까지 되는데**(`notification.ts:376` · `EmailTemplateListPage.tsx:45-48`) `EmailTemplateInput` 이 그것을 `Omit` 한다(`:379`). **그래서 409 는 '대상이 존재하는가'만 본다 — 둘 다 존재하는 동시 편집은 여전히 last-write-wins 다**(BE-065 §7.1 의 표). **이 화면이 특히 나쁜 이유**: 목록이 `updatedAt` 을 보여주므로 **B 는 자기 저장이 반영됐다고 믿고 떠나고**, A 의 저장이 그것을 덮어도 아무도 보지 않는다. 그리고 **이 문구는 고객 메일이 된다** | `?status=save:409` 로 `/:id/edit` 에서 저장 → **충돌 다이얼로그가 입력을 보존한 채 뜨고 토스트·이동이 없으면 ①② pass.** ③ 판정: `grep -rn "If-Match\|ETag\|version" apps/admin/src/shared/crud apps/admin/src/pages/notifications` → **0건이면 gap**(현재 0건). 동시 편집 재현: 두 탭에서 같은 템플릿을 열고 각각 제목/본문을 바꿔 저장 → **나중 저장이 앞선 변경을 경고 없이 덮으면 gap** | **gap** |
| EXC-08 | EXC | 직접 | **충족 — 이 화면의 두 쓰기 표면 모두.** ① **폼 저장 3중**: pending 중 비활성(`FormPageShell.tsx:189` `disabled={saving \|\| loadingDetail}`) **AND** **동기 제출 락** `submitLockRef`(`useCrudForm.ts:103,201-202` — RHF 비동기 검증 탓에 `saving` 이 true 가 되기 전의 두 번째 Enter 를 **렌더를 기다리지 않고** 막는다, `:95-101` 주석이 그 이유를 기록) **AND** **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:118-123`)를 **mutationFn 밖**에서 만들어 `variables` 로 싣고(`:228,235`) 재시도가 같은 키를 재사용하며 성공 시 버린다(`:220`). **키가 실제로 어댑터에 도달한다** — `WriteContext.idempotencyKey`(`crud.ts:30-41`, 주석 `:20-23` 이 '예전에는 키를 만들고 반환값을 버렸다'는 과거를 기록) → `ledger.isReplay`(`:201,208`). ledger 는 **성공한 뒤에만 기록**해 실패한 첫 시도가 키를 태워 재시도를 no-op 으로 만들지 않는다(`:55-60`) ② **삭제**: 멱등키가 없으나(`useCrudList.tsx:101-103`) **`crud.ts:36-39` 가 그 생략을 의도로 선언한다** — '생략 가능하다 — **목록의 단건 삭제처럼 사용자가 매번 확인 다이얼로그를 거치는 조작**은 키 없이 온다.' 이 화면의 삭제는 그 예외가 **정확히 성립한다**: 확인 다이얼로그가 매 시도를 게이트하고(`useCrudList.tsx:154-165`) `busy` 가 확인 버튼을 `disabled` + `aria-busy` 로 잠그며(`ConfirmDialog.tsx:151-152`) DELETE 가 자연 멱등이다(두 번째는 404/409). **⚠ FS-064 와의 결정적 차이**: 저 화면은 **확인 없는 쓰기(자동 발송 토글)** 가 있어 예외가 성립하지 않아 gap 이다. **이 화면엔 확인 없는 쓰기가 0건이다** | '등록'을 최대한 빠르게 2회 클릭(또는 Enter 연타). **정확히 1요청이면 pass.** `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/shared/crud/useCrudForm.ts` → 있음. 삭제 확인 버튼 연타 → `busy` 가 두 번째를 막는지 | **pass** |
| EXC-09 | EXC | 직접 | **충족 — 두 쓰기 경로 전부.** ① **폼 저장** — `onError` 가 `if (isAbort(cause)) return;`(`useCrudForm.ts:161`, 주석 `:161` '취소는 실패가 아니다 — 토스트도 배너도 없다')로 abort 를 실패로 처리하지 않고, `onSuccess` 가 `if (controller.signal.aborted) return;`(`:218`)로 취소된 요청의 토스트·이동을 막으며, unmount 가 abort 한다(`:93`) ② **삭제** — 다이얼로그 닫기가 abort + **`mutation.reset()`**(`useCrudList.tsx:87-89` — 요구의 'isPending 리셋' 절) · `:104` success 가드 · `:110-111` `isAbort`. **전부 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다** — 로컬 판정을 재발명하지 않는다. **미충족 절 하나**: 'bulk 실패 count 에서 abort 제외' — 일괄 삭제가 `settleAll`(`shared/bulk.ts`)로 **거절 수만 세므로** 이탈 시 abort 가 실패 수에 섞일 수 있다(`useCrudList.tsx:136-142`). **그러나 그 경로는 실질적으로 도달 불가**: `closeBulk` 가 abort 한 뒤 `onSuccess` 의 `if (controller.signal.aborted) return`(`:137`)이 **집계 자체를 버려** 배너가 그려지지 않는다. 표면상 결함이나 관측되지 않으므로 pass 로 두고 §5 #12 에 기록 | `/new` 에서 저장 중(400ms 창) '목록으로' 클릭 → **error toast·배너가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다. 삭제 확인 직후 다이얼로그 닫기 → 실패 배너 없음 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-05 · IA-13 · EXC-08 · EXC-09 |
| `종속` | **13** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · A11Y-12 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **1** | FEEDBACK-06 |
| `gap` | **4** | IA-02 · IA-04 · EXC-03 · EXC-04 |
| **합계** | **30** | 12 + 13 + 1 + 4 = **30** ✓ |

> **P0 gap 4건 — quality-bar '배치 실패' 사유.** 네 건 모두 **화면 고유가 아니다**:
> - **IA-02 · IA-04 · EXC-03 은 앱 전역의 같은 뿌리**(h1 이중 모델 · 공용 셸의 Pagination 부재 · `useRouteWritePermissions` 미소비) → **횡단 배치**로 푸는 것이 옳다.
> - **EXC-04 는 공용 어댑터 계약**(`createStoreAdapter` 에 토큰 개념 부재)이며 소비 화면 전부에 걸린다.
> - **이 화면 고유의 P0 gap 은 0건이다.**
>
> **형제 문서와의 차이**: NFR-064(발송 규칙)는 **EXC-08 이 gap** 이라 gap 5건이다 — 목록의 자동 발송 ToggleSwitch(`useCrudRowUpdate`)에 동기 락·멱등키가 없고 확인 다이얼로그도 없어 `crud.ts:36-39` 의 생략 예외가 성립하지 않기 때문이다. **이 화면엔 확인 없는 쓰기가 0건이라 pass 다.** NFR-066(SMS 템플릿)은 이 문서와 동일한 4건이다.
> **IA-04 의 심각도는 형제 중 이 화면과 FS-066 이 높다** — FS-064 는 도메인 상한 20건이지만 템플릿은 **상한이 없다**(BE-065 §7.9).
>
> **참고 — NFR-036(마케팅 발송 템플릿)의 판정은 낡았다**: F2(`3cd3078`) 기준이라 COMP-10 · IA-13 을 gap 으로 적었으나, 통합 이후 `marketing/templates/TemplateListPage.tsx:124,159` 가 `useListState` 를 소비해 **두 항목이 pass 로 뒤집혔다.** 또 NFR-036 이 EXC-04 gap 의 사유로 든 '`createStoreAdapter` 의 존재 검사 부재'는 **F3b 가 `crud.ts:219-221` 로 해소했다** — 지금의 EXC-04 gap 사유는 **'동시성 토큰 부재'** 다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·금액·CSV·2열 preview·읽기전용 detail·인라인 토글)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **화면이 그 이득을 버리지 않는다** — `refreshing` 을 별도 파생으로 받아 요약에만 인디케이터를 붙인다(`CrudListShell.tsx:116-122`) | 재조회에서 이전 행이 유지되는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 **3분기**한다 — 화면이 `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters`·`createAction` 을 전부 공급하고(`EmailTemplateListPage.tsx:120-131`) `Empty` 가 조사와 copy 를 고른다(`CrudTable.tsx:156-167`) | 검색 0건 → '조건에 맞는 …' + 검색 지우기. 필터 0건 → 필터 초기화. 진짜 0건 → 등록 CTA | **pass** |
| STATE-06 | P1 | write 성공 시 `useCrudCreate`/`useCrudUpdate`/`useCrudDelete` 가 목록·상세를 정확히 무효화한다 | 폼에서 제목 변경 후 목록 복귀 시 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | **모든 action/navigation 버튼이 DS `<Button>`** 이다 — 등록(`EmailTemplateListPage.tsx:91,126`) · 취소/저장(`FormPageShell.tsx:181-191`) · '다시 시도'/'목록으로'(`:133,137,160`) · '선택 N건 삭제'(`CrudListShell.tsx:126`). `grep "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/notifications` → **0건**. **⚠ 진행 상태를 `loading` prop 이 아니라 손라벨로** — `FormPageShell.tsx:190` `{saving ? '저장 중…' : …}`. 요구가 명시적으로 금지한 형태이나 **공용 셸의 결정이며 화면 코드가 아니다**. 손조립 `<button>` 은 `FilterPanel.tsx:61`(리스트 항목) · `FormPageShell.tsx:148`(back-link) · **`VariableInsertBar.tsx:64`(변수 칩)** — 앞 둘은 공유 소유. **칩은 이 섹션 소유다** — `<button type="button" className="tds-ui-focusable" style={chipStyle}>`(`:64-72`). Button variant 에 chip 이 없어 DS 로 표현할 수 없다(정당한 이탈) | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/notifications` → 0건(현재 0건). `FormPageShell` 의 손라벨은 프론트 리팩터 이관 | **gap(공용 셸 소유)** |
| COMP-02 | P1 | 선택 셀이 `RowSelectCell`/`SelectAllHeaderCell`, 순번이 `SeqCell`/`SeqHeaderCell`(`CrudTable.tsx:124-130,173-179`). raw checkbox 0건 | selectable 표에 raw checkbox 가 0건인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>`(`EmailTemplateListPage.tsx:83`). `grep 'type="search"' apps/admin/src/pages/notifications` → 0건 | raw `<input type="search">` 재구현 0건인지 | **pass** |
| COMP-04 | P1 | **required 필드 4개가 전부 `FormField required`** 로 노출돼 `*` 마커가 렌더된다 — 템플릿명·이벤트(`TemplateIdentityFields.tsx:56,79`) · 제목(`EmailTemplateFormPage.tsx:179`) · 본문(`:202` → `TextareaField` 가 `FormField required` 로 전달, `TextareaField.tsx:47`). bare `<label>` 로 그린 required 필드 0건 | 모든 zod-required 필드가 `*` 마커를 렌더하는지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3` 으로 파생(`:113,146`). 페이지네이션이 없어 'row 수 === PAGE_SIZE' 기준값 자체가 없다(IA-04 gap 과 연동) | `grep "length: 5" shared/crud/CrudTable.tsx` → 0건이어야 한다. 현재 1건 | **gap(공용 셸 소유)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 없음. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 해소 시 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지 | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 `RowActions`(pencil/trash — `CrudTable.tsx:192-197`) — 요구의 (b) '인라인 편집 테이블은 RowActions' 에 정확히 해당. **중복 '상세' 버튼이 없다** | 편집 테이블이 RowActions 를 쓰고 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | **부분 충족.** 제목 열은 `ellipsisCellStyle` 로 자른다(`EmailTemplateListPage.tsx:43` → `_shared/styles.ts:53-61`, 주석이 'COMP-09: 긴 값이 컬럼을 밀어 표를 깨뜨리지 않는다'를 명시). **그러나 템플릿명 열은 truncate 가 없다**(`:42` — `render: (item) => item.name`). 60자 상한(`TEMPLATE_NAME_MAX`)이라 열을 넓히기 충분하다. **한 줄로 해소된다** — 같은 스타일을 쓰면 된다. hover/expand 로 전체 값 노출은 두 열 모두 없다 | 60자 템플릿명 + 100자 제목 픽스처로 표 폭이 유지되는지 | **gap(부분)** |
| COMP-12 | P2 | **부분 충족 — 세 필드가 갈린다.** ① **제목** — 실시간 카운터 `N/100`(`EmailTemplateFormPage.tsx:181`), `:174-175` 가 이유를 명시('제목은 수신함에서 잘리는 자리라 실시간 글자수 카운터가 필수다') ② **본문** — `TextareaField` 가 카운터 `N/2000` 을 내부 렌더(`TextareaField.tsx:52`) ③ **템플릿명 — 카운터가 없다**(`TemplateIdentityFields.tsx:60-73`에 `counter` prop 미전달). `maxLength=60` 이 **예고 없이 입력을 멈춘다** — 요구가 지적하는 바로 그 증상. **상한 근접 경고는 세 필드 모두 없다.** **counting 기준**: `value.length`(UTF-16 code unit)이며 **명시되지 않았다** — 조합형 한글이 naive char count 와 다르게 세어지는 문제가 남는다. **⚠ FS-066 은 이 축이 다르다** — 거기선 바이트가 진짜 제약이고 그 사실이 코드 주석에 명시돼 있다(`notification.ts:361-367`) | 템플릿명에 61자 입력 → 조용히 멈추면 gap. 1,900자 본문에서 경고가 뜨는지 | **gap(부분)** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert · write 성공=toast · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:161`, toast 가 modal 뒤에 숨지 않는다) · 폼 저장 실패=폼 카드 배너(`FormPageShell.tsx:168`, 입력을 보존한 채 그 자리에서 재시도하는 폼 맥락이라 `FormServerError` 가 옳다). **⚠ 이 화면엔 error toast 가 없다** — 요구의 'error toast 는 자동 소멸 없이 다시 시도 포함' 절이 걸릴 표면이 없다(FS-064 와 다른 점) | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 피드백 — create/update(`useCrudForm.ts:229,236`) · delete(`useCrudList.tsx:104-114`) · bulk delete(`:136-149`). no-op 클릭이 없다 | `?fail=save` · `?fail=delete` → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 delete 가 delete-intent ConfirmDialog 를 연다(`useCrudList.tsx:154-177`). undo window 는 없으나 요구가 'confirm **또는** undo' 이므로 충족. **⚠ 그러나 이 화면의 삭제는 undo 가치가 특히 높다** — 삭제가 발송 규칙을 깨뜨린다(BE-065 §7.2) | 단일 미확인 클릭 delete 가 0건인지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 소유(`Modal.initialFocusRef`) | DS 판정 종속 | **종속** |
| A11Y-05 | P1 | `SelectField isInvalid` 의 AT 반영은 DS 소관. **이 화면은 이벤트 select 에 오류 상태를 두지 않아**(`TemplateIdentityFields.tsx:86-91`) 그 표면이 걸리지 않는다 | DS SelectField 판정 종속 | **종속** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(`CrudTable.tsx:172`)이고 **행 안에 keyboard-focusable 등가물이 있다** — RowActions 의 '수정' 버튼(접근 이름이 템플릿명 기반). 체크박스도 focusable | 행을 Tab 해서 수정 컨트롤에 도달하는지 | **pass** |
| A11Y-13 | P1 | **폼 진입 시 첫 편집 필드 포커스가 있다** — `useInitialFocus<HTMLInputElement>(!loadingDetail)`(`EmailTemplateFormPage.tsx:128`)의 ref 를 register ref 와 함께 템플릿명 input 에 문다(`:164-167` → `TemplateIdentityFields.tsx:72`). 훅이 `ready` 가 처음 true 가 될 때 **한 번만** 포커스해 사용자가 옮긴 포커스를 뺏지 않는다(`useInitialFocus.ts:16-25`). `autoFocus` 를 피한 이유까지 주석이 밝힌다(`:5-7` — `jsx-a11y/no-autofocus` 가 error 이고, 필요한 것은 '수정 진입 시 상세 로딩이 끝난 뒤'라는 **조건부** 포커스라 어차피 명령형이어야 한다). **검증 실패 시 첫 오류 필드 포커스**는 RHF `shouldFocusError` + `useCrudForm` 이 `onInvalid` 를 명시해 계약으로 고정(`useCrudForm.ts:240-248,260`). 서버 422 도 `setFocus(first.field)`(`:190`). **⚠ 단 제목의 변수 오류가 body 에 꽂혀**(`validation.ts:51-61` `path: ['body']`) 그 경우 포커스가 엉뚱한 필드로 간다(FS-065 §7 #12) | 빈 제목으로 '등록' → activeElement 가 제목 input 인지. 폼 진입 시 템플릿명에 포커스가 가는지. **제목에 `#{인증번호}`(주문 트리거)를 넣고 저장 → 포커스가 body 로 가면 gap** | **pass(단 §5 #7 과 연동)** |
| A11Y-16 | P1 | 신규 인터랙티브 표면이 계약을 만족한다: `FilterPanel` = `aria-pressed` + `tds-ui-focusable`(`FilterPanel.tsx:63-65`) · **`VariableInsertBar` 칩** = `<button type="button">` + `tds-ui-focusable` + **`aria-label={'<변수명> 변수 삽입'}`**(`VariableInsertBar.tsx:64-72` — 토큰 글자만으로는 이름이 되지 않아 별도 이름을 준다) · 표 `aria-busy` + caption(`CrudTable.tsx:116-120`) · **지속 live region**(`CrudListShell.tsx:107-109`, `:99-106` 이 '내용과 함께 생성되는 region 은 AT 가 신뢰성 있게 읽지 않아 껍데기가 소유한다'를 기록) · `role="alert"` 오류(`FormField`). **⚠ 광고성 경고(FS-065-EL-028)가 live region 이 아니다** — 입력 중 나타나는 `<Alert tone="warning">`(`EmailTemplateFormPage.tsx:217`)이 announce 되지 않는다 | 칩의 aria-label, 필터의 aria-pressed, 목록 상태 announce 확인. **광고성 경고가 나타날 때 announce 되는지 — 안 되면 부분 gap** | **gap(부분)** |
| ERP-01 | P1 | status→tone 매핑이 **공유 도메인 모듈의 단일 레지스트리** — `TRIGGER_CATEGORY_TONE`(`notification.ts:65-70`). 세 화면이 `triggerColumn`(`triggerColumn.tsx:16-29`)을 통해 같은 함수를 소비하고 per-page meta helper 가 없다. **다만 `pages/notifications/_shared` 지역이라** 앱 전역 통합 레지스트리는 아니다 | 모든 분류가 정의된 tone 으로 해석되는지(`notification.test.ts:52-58` 이 회귀 방어) | **pass(도메인 내)** |
| ERP-04 | P1 | sortable header 없음 — 정렬이 `sortByTrigger`(`notification.ts:471-477`)의 고정 default-sort 뿐. **이 화면은 FS-064 와 달리 상한이 없어 정렬 요구가 실재한다**(수정일시순으로 보고 싶은 요구가 자연스럽다) | sortable header 도입 시 재판정 | **gap** |
| ERP-05 | P1 | **Pagination 소비 0건**이라 range/page-size 표면이 없다(IA-04 gap 과 같은 뿌리) | Pagination 도입 시 `pageSize` opt-in 여부로 재판정 | **n-a(표면 부재)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 날짜·숫자가 `shared/format`(`formatDateTime` — `EmailTemplateListPage.tsx:47` · `formatNumber` — `FilterPanel.tsx:74` · `CrudListShell.tsx:119`)을 경유한다. **인라인 포맷 0건** | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 수정일시가 `formatDateTime`, 건수가 `formatNumber` 를 경유. **raw numeric toString 0건.** ⚠ 카운터가 `String(subject.length)`(`EmailTemplateFormPage.tsx:181`)로 직접 조립되나 **그것은 테이블 셀이 아니라 폼 카운터**이며 천 단위 구분이 무의미한 범위(≤2000)다 — 요구의 appliesTo(`DataTable/CrudTable cell`) 밖 | 표 셀의 raw numeric toString 이 0건인지 | **pass** |
| ERP-09 | P2 | **timestamp 표시 표면이 실재한다** — 수정일시 열(`EmailTemplateListPage.tsx:45-48`). `formatDateTime` 을 경유하나 **표시 TZ 정책이 없다** — 통합이 달력 산술의 앵커를 UTC 정오로 수렴했으나(`shared/format.ts:33-45`) 그것은 산술이지 표시 TZ 가 아니다. 다른 TZ 관리자가 수정 시각을 다르게 본다. **FS-064 엔 이 표면이 없다** | UTC ISO 입력이 runner OS timezone 과 무관하게 동일 wall-clock 을 렌더하는지 | **gap** |
| ERP-13 | P1 | **충족.** 이 화면의 templated copy 에 **리터럴 조사 폴백이 0건**이다. 조사 헬퍼는 `shared/format.ts:269+` 가 소유하고 — **통합이 사본 3벌(`logs/josa.ts` · `notifications/_shared/notification.ts` · `@tds/ui` 의 `Empty`) 중 앞의 둘을 그리로 수렴했다**(`format.ts` 주석 · **`notification.ts:37-38` 이 그 이관을 기록**: '조사(助詞)는 shared/format 이 소유한다 (ERP-13). 이 섹션이 갖고 있던 사본은 그리로 수렴됐다'). 이 화면이 소비하는 지점: ① 저장 토스트(`useCrudForm.ts:222` `objectParticle(entityLabel)` → '이메일 템플릿**을** 등록했습니다') ② **삭제 확인·토스트**(`useCrudList.tsx:108,158` `objectParticle(nameOf(target))` — **이름의 받침**으로 고른다) ③ 폼 로드 실패 배너(`FormPageShell.tsx:129-130`) ④ 빈 상태(`Empty` 가 자체 판정 — `@tds/ui` 는 앱을 import 할 수 없어 자족 사본을 갖는 것이 **의도된 자족**) ⑤ **검증 문구**(`requiredText` — `shared/crud/validation.ts:17` 이 헬퍼를 소비). **'(으)로' 폴백형도 0건**이다 | `grep -nE "이\(가\)\|을\(를\)\|은\(는\)\|\(으\)로" apps/admin/src/pages/notifications` → 사용자 대상 문자열 히트 **0건**. 남는 히트는 ① 주석 ② **리터럴 부재를 단언하는 테스트** 뿐이다 — **`email-templates.test.ts:31` `expect(message).not.toContain('을(를)')`**(제목 필수 문구가 '제목**을** 입력하세요.' 임을 `:30` 이 단언) · **`:37` `not.toContain('은(는)')`**(길이 문구가 '제목**은** 100자를 넘을 수 없습니다.' 임을 `:36` 이 단언) | **pass** |
| ERP-15 | P1 | 전량을 한 DOM 에 렌더한다(`CrudTable.tsx:171`) — cap·virtualization 없음. **FS-064 와 달리 상한이 없다**(BE-065 §7.9) — 이름 중복을 막지 않아 한 트리거에 템플릿이 무한히 쌓인다. 검색·필터도 키 입력마다 전량을 훑는다(250ms 디바운스가 횟수만 줄인다). 열 6개라 가로 scroll 은 불필요 | 1,000건 픽스처로 scroll/검색이 매끄러운지. **IA-04 와 한 배치** | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` **앱 전역 0건**(grep) — 이 화면도 상한 없음. abort 는 언마운트·다이얼로그 닫기에서만 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | `HttpError` 가 status 를 갖고 `?status=<op>:<code>` 로 9종 재현 가능(`dev.ts:26-37`). **그러나 화면이 분기하는 것은 404 하나뿐**(`FormPageShell.tsx:121`). 400 을 `useCrudForm` 이 분기하지 않아 배너로 뭉개지고(`:194`), 403·429 가 일반 배너로. 409(폼)·422(`violations` 있을 때)는 정확 | `?status=save:403` vs `save:429` vs `save:500` 이 다른 surface 를 그리는지. 전부 같으면 gap | **gap** |
| EXC-07 | P1 | 서버 422 의 `violations` 를 RHF `setError` 로 필드에 꽂고 첫 필드로 포커스한다(`useCrudForm.ts:181-192`). **경로가 실재한다.** **단 서버가 `error.fields` 를 채워야 발현되고**, 400 은 이 경로를 타지 않는다(BE-065 §7.10 이 '필드 거절을 422 로 통일'을 이관) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **pass** |
| EXC-11 | P1 | `navigator.onLine` **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 없음 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 구분한다 — `createStoreAdapter.fetchOne` 이 없는 id 에 `HttpError(404)` 를 던지고(`crud.ts:192-194`, 주석 `:183-190` 이 '404 분기가 영원히 발현되지 않았다'는 과거를 기록), `useCrudForm` 이 `isNotFound` 로 `loadFailure` 를 가르며(`:144-149`), `FormPageShell` 이 **404 면 '다시 시도'를 숨기고 문구를 바꾼다**(`:116-144`, `:117-121` 주석: '404 는 재시도를 권하지 않는다 — 재시도해도 영원히 없다'). **⚠ 저장소의 `getOne` 은 여전히 status 없는 일반 `Error('이메일 템플릿을 찾을 수 없습니다')` 를 던지나**(`store.ts:71` · spec `:154`) **팩토리가 그 앞에서 `exists(id)` 로 가로채 404 를 낸다**(`crud.ts:192-194`) — store 의 throw 는 도달 불가 경로다 | `?status=detail:404` → '이메일 템플릿을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만. `?status=detail:500` → '불러오지 못했습니다.' + '다시 시도' + '목록으로'. **두 화면이 같으면 gap** | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — `onMutate`/`setQueryData` 0건. 저장·삭제가 전부 비관적. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | `onMutate`/`setQueryData` grep 이 0건인지 | **pass** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여준다** — `referenceOf(cause)`(`useCrudForm.ts:195`) → `errorReference` → `FormServerError`(`FormPageShell.tsx:168`). raw stack 노출 없음. **⚠ 폼 저장에만 있다** — 삭제 실패 배너(`useCrudList.tsx:112`)에는 reference 가 없다 | `?status=save:500` → 폼에서 reference code 가 보이는지 | **pass(부분)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-065 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()`(`dev.ts:11`). 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 저장 p95 | ≤ 500ms | 위와 동일 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. **전량 렌더라 건수에 선형 비례**(ERP-15 gap) — **상한이 없다**(BE-065 §7.9) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 명시 — **충족** |
| 검색 입력당 요청 | **0 요청**(클라이언트 필터) + URL replace 1회 | **충족(요청)** / **조건부(연산)** — 커밋마다 전량을 `filterByCategory` + `searchTemplates`(2축: 템플릿명·이벤트명) 로 훑는다. 250ms 디바운스가 횟수를 지배하나 **건수 상한이 없어** 1,000건이면 커밋마다 2,000회 비교다 |
| 폼 입력당 연산 | ≤ 1ms | **⚠ 입력마다 3회 파생**: `detectAdWords`(`useMemo([subject, body])` — `EmailTemplateFormPage.tsx:135`, 9낱말 × 2필드) · `applyVariableSamples` ×2(**미리보기 — `useMemo` 없이 렌더마다**, `:225-226`, 8변수 `replaceAll`) · zod 검증(`shouldValidate: true` — `:204`). 2,000자 본문에서 타이핑마다 수십 회 문자열 순회 — **체감 위험은 낮으나 `useMemo` 부재는 실재한다**(§5 #13) |
| 저장 요청 크기 | ≤ 4KB | **충족 — 상한이 구조적이다.** `name` 60 + `subject` 100 + `body` 2,000자 + trigger. UTF-8 한글 3바이트 기준 최대 ~6.5KB 이나 실제 문구는 훨씬 작다 |
| 일괄 삭제 동시 요청 | **상한 없음** | **미충족** — 선택 수만큼 병렬 발사(`useCrudList.tsx:133-134`). **레이트리밋(분당 60)에 걸릴 수 있다**(BE-065 §7.9) |
| 메모리 | 템플릿 전량 + 상세 1건 | **전량 보유. 상한 없음**(BE-065 §7.9) |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). `_shared/notification.ts`(23KB 소스)는 세 화면이 공유 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). 툴바·필터가 남는다 |
| 폼 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass). 단 배너가 화면 전체를 대체해 맥락이 사라진다(FS-065 §7 #18) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 충돌(409, 대상 삭제됨) | 입력 보존 + 충돌 다이얼로그 + 유령 저장 없음 | **충족**(EXC-04 의 ①② 절) |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — last-write-wins**(EXC-04 의 ③ 절 · BE-065 §7.1). **이 화면 최대 정합 위험** — 목록이 `updatedAt` 을 보여주므로 덮인 사람은 자기 저장이 살아 있다고 믿는다 |
| 저장/삭제 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| 중복 제출 | 정확히 1요청 | **충족**(EXC-08 pass — 저장 3중 · 삭제는 확인 게이트) |
| **템플릿 삭제로 규칙 무력화** | 삭제 전 경고 또는 서버 거절 | **충족(거절 절) — 뒤집혔다.** 이전 기준에선 `rulesUsingTemplate` 의 프로덕션 소비처가 0건이라 조용히 깨졌다. 지금은 `_shared/store.ts:95-101` 의 `remove` 가 그 함수를 호출해 **`HttpError(409)` 로 거절한다** — 문구가 건수와 다음 행동을 함께 나른다('발송 규칙 N건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다. 규칙에서 먼저 템플릿을 바꾸세요.'). 주석 `:83-93` 이 근거를 적는다 — 인증번호 템플릿(`ntf-sms-4`)을 지우면 **로그인이 막힌다**. 회귀 테스트 `store.test.ts:69-98`(3건: 인증번호 템플릿 삭제 차단 + 던진 뒤 실제로 남아 있는지 + 409 문구 · 아무도 안 쓰는 템플릿은 그대로 삭제). **미충족으로 남은 절: 삭제 *전* 경고가 없다** — 거절은 확인 버튼을 누른 뒤에 온다(§5 #5) |
| **trigger 변경으로 규칙 오작동** | 참조 규칙이 있으면 거절 | **미충족 — 삭제보다 나쁘다.** 잘못된 메일이 **실제로 발송된다**(`#{송장번호}` 가 빈칸). BE-065 §7.2·§7.4 |
| 세션 만료 중 편집 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 폼 입력을 버린다(EXC-19 P1). **단 목록의 필터·검색은 `returnUrl` 쿼리로 복원된다**(IA-13 의 부수 이득) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484-493`). **이 화면엔 던질 수 있는 동기 store 호출이 없다**(FS-064 와 다른 점) |

### 4.3 법적 · 발송 안전 (이 도메인 고유 — quality-bar 밖)

이 화면의 문구는 **고객 메일이 된다.** quality-bar 는 이 축을 다루지 않으므로 여기서 정한다. 근거는 전부 코드다.

| 요구 | 현재 상태 |
|---|---|
| **정보성 알림에 광고가 섞이지 않는다** | **부분 충족 — 그리고 구현이 거칠다.** 2중 방어: 입력 중 warning `Alert`(`EmailTemplateFormPage.tsx:216-220`, 이유를 설명한다) + 저장 차단(`validation.ts:28-47`). **그러나** ① **클라이언트에만 있다** — 우회 시 위법 발송(정보통신망법 제50조, 방통위 가이드라인 — `notification.ts:30-32`). 서버 재판정 필요(BE-065 §7.5) ② **오탐이 실재한다** — `AD_WORDS` 에 **'이벤트'** 가 있어(`notification.ts:292`) '이벤트가 발생하면 안내드립니다' 같은 **정상 트랜잭션 문구가 차단된다.** 단순 `includes`(`:300-301`)라 형태소 경계를 안 본다. **우회 수단이 없다 — 경고가 아니라 차단이다** ③ **미탐이 자명하다** — '할 인'·'쿠-폰'을 놓친다 |
| **(광고) 표기·야간 제한·수신거부가 없는 것이 옳다** | **충족(의도).** 정보통신망법 제50조는 광고성 정보에만 적용되므로 정보성 알림엔 그 의무가 없다 — `notification.ts:23-29` 가 조항별로 근거를 적고 **'인증번호·보안 알림은 새벽에도 보내야 한다'**(`:27`)를 명시. 검증에 그 세 검사가 **없는 것이 판정**이다(`validation.ts:3-5`) |
| **미치환 변수가 발송되지 않는다** | **부분 충족.** `unknownVariablesFor`(`notification.ts:269-272`)가 트리거가 주지 않는 변수를 저장 전에 막는다 — 주석이 '발송 때 빈칸으로 나가는 사고를 저장 전에 막는다. 마케팅엔 없는 검사다'(`:265-268`). **그러나** ① 클라이언트에만 있다(BE-065 §7.4) ② **`trigger` 를 나중에 바꾸면 저장 시점 정합이 깨진다**(BE-065 §7.2) ③ **발송 시점 방어가 없다**(범위 밖 — BE-065 §7.11 #6) |
| **본문·제목에 XSS 가 없다** | **미정 — 지금은 평문이라 관리자 화면이 안전하나 계약이 없다.** `TODO(lib): Tiptap + DOMPurify`(`EmailTemplateFormPage.tsx:5-8,77`)가 HTML 전환을 예고한다. **이 본문은 고객 메일(HTML)로 나가므로 서버가 저장 시 정제해야 한다** — 프론트 DOMPurify 는 UX 이지 보안 경계가 아니다(BE-065 §7.3). **`subject` 는 메일 헤더에 들어가 헤더 인젝션(CRLF)까지 막아야 한다** — 개행 금지가 어디에도 없다 |
| 문구 변경이 감사 로그에 남는다 | **미충족.** 앱에 `/logs/admin` 화면이 있으나(`nav-config.ts:208`) 이 화면의 쓰기가 거기로 가는 배선이 없다. **인증번호 메일 문구를 바꾸는 것은 피싱 문구를 정본으로 만드는 일**이다(BE-065 §7.7) |
| 쓰기 권한이 조회 권한과 분리된다 | **미충족.** 프론트 게이팅 부재(EXC-03 gap) + 서버 판정(BE-065 §7.7 `admin` 전용)이 화면에 표현되지 않는다 |
| 테스트 발송으로 실물을 확인할 수 있다 | **표면 없음(의도).** 폼에 '테스트 발송' 버튼이 없고 어댑터에 그 경로가 없다. 미리보기(FS-065-EL-029)가 표본값 치환으로 대신한다 — **실제 메일 렌더링(HTML·클라이언트별 표시)은 확인할 수 없다.** BE-065 §7.9 가 범위 밖으로 판정 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | IA-02 | P0 | 폼 sub-route 에 `<h1>` 이 2개('이메일 템플릿' + '이메일 템플릿 등록') + AppHeader 가 행위를 반영하지 않는다. **가지 폴백은 통합이 해소했다 — 사유가 바뀌었다.** 목록은 pass | **앱 전역**(`AppHeader`·`FormPageShell` title 모델) | 프론트 구현 · UI 기획 (횡단 배치) |
| 2 | IA-04 · ERP-15 · COMP-07 | P0 · P1 · P2 | Pagination 없음 — 전량 렌더. **FS-064 와 달리 상한이 없다.** BE-065 §7.9 가 페이징 + **서버측 필터·검색·건수**(클라이언트는 현재 page 만 안다)를 판정했다. `SeqCell` 의 `startIndex` 부재가 함께 발현 | 공용 셸 + BE 계약 | 프론트 리팩터 · UI 기획 · 백엔드 명세 (한 배치) |
| 3 | EXC-03 | P0 | write 액션 게이팅 미배선 — `useRouteWritePermissions` 소비처 8곳에 알림 관리 없음. **`operator` 가 인증번호 메일 문구를 고치는 버튼을 본다** | **앱 전역** | UI 기획 쪽 변경 요청 |
| 4 | EXC-04 | P0 | **낙관적 동시성 토큰 부재 — 동시 편집이 last-write-wins.** `updatedAt` 이 목록에 **표시까지 되는데** `If-Match` 로 실리지 않는다. ⚠ **유령 저장·409 UI 는 이미 pass** — gap 은 토큰 절 하나다 | 공용 어댑터 계약 | 백엔드 명세 (BE-065 §7.1) · 프론트 리팩터 |
| 5 | (§4.2·§4.3) | — | **⚠ 절반이 해소됐다 — 범위가 줄었다.** ① **삭제 — 해소.** `_shared/store.ts:95-101` 이 `rulesUsingTemplate(id) > 0` 이면 409 로 거절한다(회귀 `store.test.ts:69-98`). **'조용한 파손'은 더 이상 없다.** 남은 것은 **삭제 *전* 경고 부재** — 확인 다이얼로그가 참조 규칙 수를 미리 말하지 않아 운영자가 확인을 누른 뒤에야 실패 배너로 안다(경미) ② **trigger 변경 — 미해소.** `patch`(`store.ts:183-190`)가 `trigger` 를 검사 없이 덮어쓴다. 그 템플릿을 쓰는 규칙은 남고 **잘못된 메일이 실제로 발송된다**(`#{송장번호}` 가 빈칸) — **이쪽이 삭제보다 나쁘고 여전히 열려 있다** | ① 이 화면(경미) ② 이 화면 + FS-064 + BE 계약 | ① UI 기획 · **② 백엔드 명세 (BE-065 §7.2·§7.4) · UI 기획 (최우선)** |
| 6 | (§4.3) | — | **광고성 검증이 클라이언트에만 있고 오탐이 실재한다** — `AD_WORDS` 의 **'이벤트'** 가 정상 트랜잭션 문구를 차단한다. 서버 재판정 + 낱말 목록 소유자·판정 방식 결정 필요 | 이 화면 + BE 계약 + 도메인 경계 | 백엔드 명세 (BE-065 §7.5) · 아키텍처 |
| 7 | A11Y-13 (부분) | P1 | **제목의 변수 오류가 `body` 에 꽂힌다**(`validation.ts:51-61` `path: ['body']`) — 첫 오류 필드 포커스가 엉뚱한 필드로 간다. 서버도 이 버그를 따라 하면 안 된다(BE-065 §7.4-1) | 이 화면 | UI 기획 쪽 변경 요청 |
| 8 | COMP-09 (부분) | P2 | **템플릿명 열에 truncate 없음** — `_shared/styles.ts:53-61` 의 `ellipsisCellStyle` 이 바로 그 용도로 있고 **제목 열은 쓰는데**(`EmailTemplateListPage.tsx:43`) 이름 열만 안 쓴다(`:42`). **한 줄로 해소** | 이 화면 | UI 기획 쪽 변경 요청 |
| 9 | COMP-12 (부분) | P2 | **템플릿명(60자)에 카운터가 없다** — 제목·본문은 있는데 이름만 조용히 멈춘다. 상한 근접 경고는 세 필드 모두 없다. counting 기준(UTF-16 code unit) 미명시 | 이 화면 + `_shared/TemplateIdentityFields` | UI 기획 쪽 변경 요청 |
| 10 | A11Y-16 (부분) | P1 | **광고성 경고(FS-065-EL-028)가 live region 이 아니다** — 입력 중 나타나는 warning `Alert` 가 announce 되지 않는다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 11 | ERP-09 | P2 | **수정일시의 표시 TZ 정책이 없다** — 다른 TZ 관리자가 다르게 본다. **FS-064 엔 이 표면이 없다** | `shared/format` | 프론트 구현 |
| 12 | EXC-09 (표면상) | P0 | 일괄 삭제의 `settleAll` 이 abort 를 실패 수에서 제외하지 않는다. **그러나 `onSuccess` 의 aborted 가드(`useCrudList.tsx:137`)가 집계를 통째로 버려 관측되지 않는다** — pass 로 두되 기록 | 공용 `shared/bulk` | 프론트 리팩터 (관측 불가 — 후순위) |
| 13 | (§4.1) | — | **미리보기가 `useMemo` 없이 렌더마다 `applyVariableSamples` 를 2회 돈다**(`EmailTemplateFormPage.tsx:225-226`). `detectAdWords` 는 `useMemo` 를 쓰는데(`:135`) 미리보기만 안 쓴다 — 대칭이 깨졌다 | 이 화면 | UI 기획 (경미) |
| 14 | COMP-01 · COMP-06 | P1 · P2 | `FormPageShell.tsx:190` 의 손라벨 '저장 중…' · `CrudTable.tsx:144` 의 `length: 5` — **둘 다 공용 셸 소유이며 화면 코드가 아니다** | 공용 셸 | 프론트 리팩터 |
| 15 | ERP-04 · EXC-06 | P1 | sortable header 없음(상한 없는 목록이라 요구가 실재) · status 별 surface 미분기(**404 만 갈린다**) | 공용 셸 + 이 화면 + BE 계약 | 프론트 리팩터 · UI 기획 · 백엔드 명세 (BE-065 §7.10) |
| 16 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | 프론트 구현 · UI 기획 |
| 17 | (§4.3) | — | **본문·제목 XSS + 헤더 인젝션 계약 부재(§4.3)** — 지금은 평문이나 고객 메일(HTML)로 나간다. `TODO(lib): Tiptap + DOMPurify` 가 HTML 전환을 예고 | BE 계약 | **백엔드 명세 (BE-065 §7.3 — 보안 최우선)** |
| 18 | (§4.3) | — | 문구 변경의 감사 로그 부재 — 인증번호 메일 문구 변경이 기록되지 않는다 | BE 계약 | 백엔드 명세 (BE-065 §7.7 과 연동) |
| 19 | (BE-065 §7.6) | — | **트리거·변수 카탈로그 소유자 미정** — 이 화면은 그 카탈로그를 **세 곳**(삽입 칩·미리보기 표본값·**검증**)에서 쓴다. 즉 '이 이벤트가 무슨 값을 주는가'가 곧 저장 가능 여부인데 **정본이 소비자 쪽에 있다.** 서버 소유가 되면 `TemplateIdentityFields`·`VariableInsertBar` 가 `useQuery` 를 배선해야 한다(**이 화면의 유일한 화면코드 변경 요인**) | 도메인 경계 | 아키텍처 · 백엔드 명세 |
| 20 | (§4.1) | — | 일괄 삭제의 **선택 수 상한이 없어** 레이트리밋(분당 60)에 걸릴 수 있다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 시점의 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`emailTemplateAdapter` 는 `createStoreAdapter({ scope: EMAIL_TEMPLATE_RESOURCE, … })`(`data-source.ts:21-22`)이고 `EMAIL_TEMPLATE_RESOURCE = 'notification-email-templates'`(`:16`)다. 팩토리가 부르는 op 는 **4개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:176`) | `?fail=list` · `?fail=notification-email-templates:list` · `?fail=all` |
| `detail` | `fetchOne` (`:181`) | `?fail=detail` · `?fail=notification-email-templates:detail` · `?fail=all` |
| `save` | `create` (`:199`) **와** `update` (`:207`) — **둘이 같은 op 를 쓴다** | `?fail=save` · `?fail=notification-email-templates:save` · `?fail=all` |
| `delete` | `remove` (`:228`) | `?fail=delete` · `?fail=notification-email-templates:delete` · `?fail=all` |

- **`?fail=save` 는 등록·수정을 동시에 실패시킨다** — 둘만 있으므로 FS-064 처럼 토글이 함께 걸리는 문제는 없다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 **분류 필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:14-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status **9종**(`dev.ts:27-37`): 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

| 판정 | 재현 |
|---|---|
| EXC-12 (404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 ①② (409 conflict) | `?status=save:409` — **충돌 다이얼로그가 입력을 보존한 채 뜨면 pass**(현재 pass) |
| EXC-04 ③ (토큰) | **스위치로 재현 불가** — `grep -rn "If-Match\|ETag" apps/admin/src` = 0건으로 판정. 동시 편집은 두 탭 수동 재현 |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 EXC-06 gap. 버튼이 애초에 보이면 EXC-03 gap |
| EXC-06 (status별 surface) | `?status=save:400` · `save:403` · `save:429` · `save:500` — 전부 같은 배너면 gap |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼 배너에 reference 가 보이면 pass. 삭제 배너엔 없다 |
| EXC-07 (422 필드) | `?status=save:422` — **`HttpError` 의 `violations` 가 비어 있으면 배너로 떨어진다**(`useCrudForm.ts:182`). `dev.ts` 는 `violations` 를 채우지 않으므로 **이 스위치만으로는 필드 인라인을 재현할 수 없다** — 어댑터를 직접 손봐야 한다 |
| **`TEMPLATE_IN_USE`(BE-065 §7.2)** | **⚠ 이제 스위치 없이 재현된다 — 저장소가 실제로 던진다.** 발송 규칙이 쓰는 템플릿(예 `ntf-email-1` — `ntf-rule-1` 이 참조)의 행 삭제를 시도하면 `store.ts:95-101` 이 `HttpError(409, '발송 규칙 1건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다. 규칙에서 먼저 템플릿을 바꾸세요.')` 를 던진다. **다만 화면이 그 문구를 보여주지 않는다** — `useCrudList.tsx:112` 가 status 를 분기하지 않고 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 고정을 보인다. **즉 서버 판정은 정확한데 안내가 틀렸다**('잠시 후 다시 시도'로는 영원히 풀리지 않는다) — EXC-06 gap 의 이 화면 실례이며 §5 #15 와 한 뿌리다. 아무도 안 쓰는 템플릿(예 `ntf-sms-5`)은 그대로 삭제된다 |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · COMP-09 · EXC-04③ · EXC-05 · EXC-11 · ERP-13 · A11Y-12 판정) · RTL(A11Y-11 의 describedby↔alert id 일치 · **required 컨트롤의 `aria-required` 는 런타임 주입이라 grep 으로 판정 불가** — GROUND-TRUTH §1) · 기존 테스트:
- **`email-templates/email-templates.test.ts`(67줄)** — 스키마 회귀. **ERP-13 의 회귀 방어선이 여기다**: `:28-32` '제목이 비면 막는다 — 조사는 받침에 맞춘다(ERP-13)' 가 `expect(message).toBe('제목을 입력하세요.')` + **`expect(message).not.toContain('을(를)')`** 를 단언하고, `:34-38` 이 `'제목은 100자를 넘을 수 없습니다.'` + **`not.toContain('은(는)')`** 를 단언한다. 그 밖에 제목/본문 광고성 차단(`:40-49`) · 제목·본문 합산 변수 종속(`:51-54`) · 정상 통과(`:56-66`)
- `_shared/notification.test.ts`(213줄) — 트리거·변수·광고성·바이트·필터/검색/정렬·중복 규칙 순수 규칙 회귀
- **`_shared/store.test.ts`(98줄)** — 템플릿 후보·템플릿명·`rulesUsingTemplate`·정렬. **⚠ 이 파일이 커졌고 판정을 뒤집었다**: describe **'템플릿 삭제 — 쓰는 규칙이 있으면 막는다'**(`:69-98`) 3건이 참조 무결성을 고정한다 — `:70-78` 인증번호 SMS 템플릿 삭제 차단(**던지고 나서 지웠다면 막은 것이 아니라며 `:77` 이 잔존까지 단언**) · `:80-91` `isConflict` + `status === HTTP_STATUS.conflict` + 문구에 '발송 규칙'·'규칙에서 먼저 템플릿을 바꾸세요' 포함 · `:93-97` 아무도 안 쓰는 템플릿은 그대로 삭제('전부 막아 버리면 그건 고침이 아니다'). **이전 기준의 '프로덕션 소비처가 없는 함수를 테스트만 지킨다'는 서술은 낡았다** — `store.ts:95` 가 부른다
- **이 화면에 컴포넌트 테스트는 없다** — 형제 화면의 `send/RuleListPage.test.tsx` 만 jsdom 스모크를 갖는다(같은 `FilterPanel`·`TransactionalNotice` 를 쓰므로 A11Y-12·마케팅 링크 계약은 간접 보증된다)

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 — 폼 modal 부재, 등록·수정이 전용 라우트다)
- [x] §2.1 산수 검산 — 12 pass + 13 종속 + 1 n-a + 4 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다. **A11Y-12 를 n-a 가 아니라 종속으로 판정**했다(좌측 `FilterPanel` 표면 실재). **MOTION-03 의 `ToggleSwitch` 는 이 화면에 없음**을 명시했고, **그 DS gap 자체가 `ToggleSwitch.css:79-84` 로 해소됐음**을 기준 갱신에 반영했다
- [x] **MOTION-01/02 의 '라이브러리 0건이라 소유 문서에서 gap 일 가능성' 추정을 지웠다** — 오버레이 모션은 **CSS-only 로 구현돼 있다**(Modal `Modal.css:126-168` · Toast `Toast.css:109-141`). Motion/AnimatePresence 미도입은 **사실로 유지**하되 그로부터 gap 을 추론하지 않았다
- [x] **EXC-04 의 두 절을 분리 판정**했다 — 유령 저장 해소(pass)와 동시성 토큰 부재(gap)를 섞지 않았고, **409 가 '존재 여부' 기반이지 version/ETag 가 아님**을 §2 와 §4.2 에 명시했다
- [x] **EXC-08 을 pass 로 판정한 근거를 명시**했다 — 저장 3중 충족 + **삭제는 `crud.ts:36-39` 가 선언한 '확인 다이얼로그를 거치는 조작' 예외가 정확히 성립**한다. **FS-064 가 gap 인 이유(확인 없는 토글)와 대비**해 적었다
- [x] **COMP-10 · IA-13 을 pass 로 판정한 근거를 명시**했다 — `useListState` 를 통해 `useDebouncedSearch` 를 상속한다(`useListState.ts:24,227-230`)
- [x] **A11Y-11 을 자식 타입으로 판정**했다 — required FormField 자식이 전부 `input`/`SelectField`/`textarea` 라 `aria-required` 가 주입된다(`FormField.tsx:36-41,50-56`). **grep 수치로 판정하지 않았다**(GROUND-TRUTH §1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·금액·CSV·인라인 토글)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`notification-email-templates`)와 op 4종을 **팩토리 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] **'E2E 미실행 — 근거는 코드 대조' 와 기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 과 §6 에 명시했다. **뒤집힌 판정 3건(TOKEN-01 근거 · MOTION-03 근거 · §4.2 삭제 무결성)을 §1 에 열거**했다
- [x] §5 의 gap 이 FS-065 §7 · BE-065 §7.11 과 일치한다
- [x] **실재 결함을 기록했다** — ① **`rulesUsingTemplate` 소비처 0건은 해소됐다**(`store.ts:95`) — 대신 남은 것은 **삭제 전 경고 부재**와 **`trigger` 변경 무방비**로 좁혔다(§5 #5) ② `AD_WORDS` 의 '이벤트' 오탐(§5 #6) ③ 제목 변수 오류가 body 에 꽂힘(§5 #7) ④ **신규**: 저장소가 던지는 409 `TEMPLATE_IN_USE` 문구를 화면이 버리고 '잠시 후 다시 시도' 고정을 보인다(`useCrudList.tsx:112`) — **풀리지 않는 안내**(§6)
- [x] **NFR-036(마케팅) 판정이 F2 기준이라 낡았음**을 §2.1 각주에 기록했다
</content>
