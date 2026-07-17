---
id: NFR-066
title: "SMS 템플릿 비기능 명세"
functionalSpec: FS-066
backendSpec: BE-066
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-066. SMS 템플릿 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-066 SMS 템플릿 (`/notifications/sms-templates` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-066(요소·예외) · BE-066(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. gap 은 §5 를 거쳐 이관되며 FS-066 §7 · BE-066 §7.11 과 번호가 일치해야 한다 |
| 판정 기준일·근거 | **기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6). 이전 기준 `4b805ad` 대비 **이 화면에서 뒤집힌 판정**: ① **§4.2 '템플릿 삭제로 규칙 무력화' 가 미충족 → 충족(거절 절)으로 뒤집혔다** — `_shared/store.ts:95-101` 이 409 로 막고, **이 화면의 headline 사례인 인증번호 SMS 템플릿(`ntf-sms-4`)이 바로 그 회귀 테스트의 주인공이다**(`store.test.ts:70-78`). 남은 것은 삭제 *전* 경고 부재와 `trigger` 변경(§5 #5) ② **MOTION-03 — 근거가 바뀌었다.** `ToggleSwitch.css:79-84` 에 reduced-motion 게이트가 **실재하게 됐다**(이 화면엔 ToggleSwitch 가 없어 판정 자체는 무영향). **P0 판정 건수는 바뀌지 않았다**(§2.1) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 공용 훅/셸을 쓰더라도 **이 화면의 배선이 결과를 가른다**면 직접이다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 **결정에 참여하지 않는 소비자** — **표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 코드 근거로 충족 / 미충족(§5 이관) / 소유 문서 판정을 따름 |

### 1.2 화면 성격

**목록 + 등록/수정 폼 CRUD** 이며 공용 CRUD 프레임워크를 정면으로 소비한다 — 목록은 `useCrudList` + `CrudListShell` + `useListState`, 폼은 `useCrudForm` + `FormPageShell`, 어댑터는 `createStoreAdapter`.

**형제 두 화면과의 차이**:
- **FS-064(발송 규칙)와 달리**: ① 목록에 인라인 쓰기(ToggleSwitch)가 **없다** → EXC-08 pass (**⚠ MOTION-03 의 `ToggleSwitch.css` gap 은 `a5c2639` 기준으로 해소됐다** — `:79-84`. 이 차이는 더 이상 MOTION-03 을 가르지 않는다) ② 쿼리 밖 동기 store 호출이 **0건** → 연동 시 어댑터 본문만 바꾸면 된다(BE-066 §6.1) ③ **컬렉션 상한이 없다**(저 화면은 20건) → IA-04·ERP-15 의 심각도가 높다.
- **FS-065(이메일)와 달리**: **제목이 없고 바이트가 진짜 제약이다.** 열이 6개(+선택·순번·액션 = 9)로 형제 중 가장 많고, **유형(SMS/LMS)·바이트 열이 이 화면에만 있다.**

**⚠ 이 화면의 고유 축 — 바이트**: `notification.ts:33` 이 규약을 못박는다(**SMS 90byte · LMS 2,000byte · 한글 2byte·ASCII 1byte, EUC-KR 기준**), `:361-367` 이 글자수 cap 을 2,000 으로 둔 이유를 설명한다(**'진짜 제약은 바이트이지 글자수가 아니다'**). **quality-bar COMP-12 의 'counting 기준(code point vs byte)을 정의하고 서버 강제와 일치시킨다'에 정면으로 답하는 앱 내 유일한 화면**이다.

**⚠ 이 화면은 아무것도 발송하지 않는다**(FS-066 §1) — 문구만 관리한다(`data-source.ts:4-5`). '비가역 발송'을 전제로 하는 판정은 다른 표면에 걸린다 — 삭제와 discard 다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 네 상태가 정확히 갈린다. ① first-load — `useCrudList.tsx:71` `firstLoading = isFetching && data === undefined` → `CrudTable loading`(`CrudListShell.tsx:135-137`) ② refetching-with-data — `refreshing`(`:72`)은 표를 **덮지 않고** 요약에 ' · 새로고침 중…' 만(`CrudListShell.tsx:118-122`) ③ empty — 성공·0행일 때만 `Empty`(`CrudTable.tsx:153-169`) ④ error — read 실패일 때만 요약+표를 배너로 대체(`CrudListShell.tsx:113,156-165`). **폼도 같다** — `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:136`) | `/notifications/sms-templates` 진입 → 행 렌더 확인 → 분류 필터 변경(또는 `staleTime` 30초 경과 후 재진입). **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` → error Alert만 · 0행 필터 → Empty만 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** ① 목록 read 실패 → 인라인 `<Alert tone="danger">` 'SMS 템플릿 목록을 불러오지 못했습니다.' + '다시 시도'(`CrudListShell.tsx:157-164`) ② 폼 상세 실패 → 인라인 danger `Alert` + '다시 시도' + '목록으로'(`FormPageShell.tsx:125-141`). **read 실패에 error toast 를 쓰지 않는다.** **empty 로 폴백하지 않는다**(`CrudListShell.tsx:113`) | `?fail=list` · `?fail=detail`. **각각 danger Alert + '다시 시도'가 떠야 pass.** 404 가 '다시 시도'를 숨기는 것은 EXC-12 의 요구이지 위반이 아니다 | **pass** |
| STATE-04 | STATE | 직접 | **충족(걸리는 절만).** (b) **선택 해제** — `useEffect(() => { clear(); }, [category, keyword, clear])`(`SmsTemplateListPage.tsx:93-95`) + `useListState` 의 view 서명 감시(`useListState.ts:205-213`, StrictMode 안전). '선택 N건 삭제'가 화면에 없는 행을 지울 수 없다. (a) **page clamp** — `clampPage` 가 훅에 있으나(`useListState.ts:217-223`) **이 화면이 부르지 않는다. 페이지네이션 표면이 없어 clamp 할 page 가 없다** — 그 부재는 IA-04 가 gap 으로 잡는다 | 템플릿 3건 선택 → 좌측 '보안' 필터 클릭. **선택이 해제되고 SelectionBar 가 사라져야 pass** | **pass** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `pages/notifications/**` 전체에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep). 이 화면 고유 스타일(`SmsTemplateFormPage.tsx:43-56` 카운터 행 · 미리보기)도 전부 `var(--tds-*)` 다. `_shared/styles.ts:6-8` 이 규칙을 못박는다(토큰만 + shorthand/longhand 혼용 금지) | `grep -nE "#[0-9a-fA-F]{3,6}\b\|[1-9][0-9]*px\|'(thin\|medium\|thick)'" apps/admin/src/pages/notifications` → **0건이어야 한다**(현재 0건). ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable` — `TransactionalNotice.tsx:30` · `FilterPanel.tsx:63` · `FormPageShell.tsx:150` · `TemplateIdentityFields.tsx:63` · **`VariableInsertBar.tsx:67`(변수 칩)**. DS `<Button>`·`<SelectField>`·`<SearchField>`·`<TextareaField>`. **이 화면이 `:focus-visible` 을 직접 선언하지 않는다** | DS 토큰 판정 종속. 로컬 `:focus-visible` CSS 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 소비 표면: 스켈레톤 펄스(`CrudTable.tsx:148` · `FormPageShell.tsx:173`) · Toast · DS Button transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건). **ToggleSwitch 가 없다** — FS-064 와 다른 점 | tokens codegen · `Toast.css` 판정 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 소비 표면: `<Card>`(`FormPageShell.tsx:165`) · Toast · 삭제/충돌/이탈 Modal · `<Alert>` · **`StatusBadge`**(유형 배지 — `SmsTemplateListPage.tsx:59` · `SmsTemplateFormPage.tsx:174`). **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast/StatusBadge 판정 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면이 `<h1>` 을 직접 그리지 않는다.** ① 목록 제목 = `AppHeader.tsx:101` ② 폼 제목 = `FormPageShell.tsx:160` `<h1 style={pageTitleStyle}>` — `:159` 가 'TOKEN-05 — 페이지 제목은 공유 `pageTitleStyle`(title.xl) 하나에서 온다'로 못박는다. **FS-065 와 달리 이 화면이 직접 소비하는 title tier 가 0건이다** — 미리보기가 제목 없이 본문만 그린다(`SmsTemplateFormPage.tsx:197-201`) | `pageTitleStyle`/`AppHeader.titleStyle` 판정 종속. 로컬 title 스타일 객체 0건임만 확인 | **종속** |
| COMP-10 | COMP | 직접 | **충족 — 이 화면은 `useDebouncedSearch` 를 직접 import 하지 않지만 `useListState` 를 통해 전부 상속한다**(`useListState.ts:24,227-230`). `SmsTemplateListPage.tsx:80` 이 `useListState` 를 쓰고 `:108-114` 가 `{...list.searchInputProps}` 를 `SearchField` 에 스프레드한다. 그 props 가 나르는 것: ① 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) ② 250ms 디바운스(`:23,93-95`) ③ 조합 중 Enter 차단 — `nativeEvent.isComposing` **과** 자체 관측 `composingRef` 를 **둘 다** 본다(`:121-124`; 합성 이벤트에서 `isComposing` 이 누락되는 구멍을 닫는다 — `:117-120`) ④ 최소 길이(`:90-91`) ⑤ stale 응답은 쿼리 키가 방지(`:14-18`). **`SmsTemplateListPage.tsx:106-107` 주석이 전달 경로까지 밝힌다** — '`SearchField` 는 계약 밖 native prop 을 `<input>` 으로 흘려보내므로 composition 핸들러가 그대로 붙는다' | 검색창에 IME 로 '주문' 입력. **조합 중 '주ㅁ'·'주무' 가 URL(`?q=`)이나 표에 반영되면 gap.** 조합 중 Enter 가 제출을 일으키지 않아야 한다. 완성 후 250ms 에 `?q=주문` 이 **1회** 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | **파괴적/비가역 액션 두 종이 실재하며 둘 다 ConfirmDialog 로 게이트된다.** ① **delete intent** — 단건(`useCrudList.tsx:154-165`) · 일괄(`:166-177`), `intent="delete"` · `busy` → 확인 버튼 `disabled` + `aria-busy` + '처리 중…'(`ConfirmDialog.tsx:151-155`) · **실패 시 다이얼로그를 열어 둔 채 error 배너**(`:161`) · **취소/닫기가 in-flight 를 abort 하고 pending 을 리셋**(`:87-89`) ② **discard intent** — 이탈 가드(`FormPageShell.tsx:114`). intent→tone/icon/label 매핑과 초기 포커스는 DS 소유. **⚠ '발송'은 이 화면에 없다** — 비가역 발송 표면이 존재하지 않는다. **⚠ 그러나 이 화면의 삭제는 요구가 상정한 것보다 무겁다** — **인증번호 SMS 템플릿을 지우면 그 규칙이 깨져 로그인이 막힌다**(BE-066 §7.3 · `store.ts:250` '인증번호가 안 가면 로그인을 못 한다'). 다이얼로그는 '되돌릴 수 없습니다'만 말하고 **그 파급은 말하지 않는다.** 요구의 문구 계약(intent 매핑)은 충족하나 §5 #5 로 별도 이관 | DS `ConfirmDialog` 판정 종속. `?fail=delete` 로 삭제 → **다이얼로그가 열린 채 error 배너가 뜨고 재클릭이 retry 되는지**, in-flight 중 취소가 false toast 없이 abort 되는지 확인 | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `SmsTemplateFormPage.tsx:138-140` 이 `isDirty={isDirty}` 와 `unsavedMessage={UNSAVED_MESSAGE}`(`:34-35`)를 `FormPageShell` 에 넘기고, 셸이 `useUnsavedChangesDialog(isDirty && !saving, { message })` 를 배선한다(`FormPageShell.tsx:114`) — **화면이 값을 공급하지 않으면 가드가 성립하지 않으므로 직접이다.** `isDirty` 는 **RHF `formState.isDirty`**(`useCrudForm.ts:261`). 3경로는 훅 소유. 저장 성공 시 `navigate(listPath, { replace: true })`(`:223`)로 self-initiated 이탈이라 프롬프트가 뜨지 않는다. **⚠ 이 화면 고유 확인**: `TextareaField` 는 register 가 아니라 `setValue('body', …, { shouldDirty: true })`(`:163`)로 값을 넣고, **변수 칩 삽입도 `shouldDirty: true`**(`:123`)다 — 둘 다 dirty 에 잡힌다 | `/new` 에서 변수 칩 하나만 클릭한 뒤 ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 통과. **주의**: '목록으로'(FS-066-EL-017)·'취소'(EL-031)는 `navigate()` 라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-066 §7 #9 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 편집 가능한 폼을 담은 modal 이 없다 — 등록·수정이 **전용 라우트**(`App.tsx:299-300`)의 `FormPageShell` 이다. quality-bar IA-06 의 무게 규칙과도 일치한다(본문 2,000byte + 바이트 카운터 + 변수 삽입 + 미리보기를 갖는 rich 엔티티다). modal 4종(단건 삭제 · 일괄 삭제 · 이탈 가드 · 409 충돌)은 **전부 입력 필드가 없는 확인 다이얼로그**다 | 폼 modal 이 도입되면 재판정 | **n-a** |
| A11Y-01 | A11Y | 상속 | toast 표면 2종: ① 저장 성공(`useCrudForm.ts:222`) ② 삭제 성공(`useCrudList.tsx:108,146`). **FS-064 와 달리 토글 토스트가 없다.** 지속 live region 은 `ToastProvider` 소유. 목록 상태용 지속 live region 은 `CrudListShell.tsx:107-109` 이 별도로 갖는다(A11Y-16 의 산물) | ToastProvider 판정 종속. 저장·삭제 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | dialog 표면 4종: 단건 삭제 · 일괄 삭제(`useCrudList.tsx:152-178`) · 이탈 가드(`FormPageShell.tsx:198`) · **409 충돌 `FormConflictDialog`**(`:196`). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 소유 | DS 판정 종속. 삭제 다이얼로그 open 시 '…삭제합니다. 이 작업은 되돌릴 수 없습니다.' 가 읽히는지 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 이 화면의 폼 컨트롤 3개를 전수 확인했다.** ① **템플릿명 input**(`TemplateIdentityFields.tsx:53-74`) — `FormField required` 의 자식이 **`<input>`** 이라 `aria-required` 가 런타임 주입된다(`FormField.tsx:36-41,50-56`). **호출부가 `required` 를 직접 주기도 한다**(`:68`). `aria-invalid={nameError !== undefined}` 와 `aria-describedby` 를 **짝으로** 전환한다(`:69-70`: 오류면 `errorIdOf`, **아니면 `hintIdOf`**) — 요구의 '**유효할 때만 hint**' 절까지 정확. `:51-52` 주석이 그 계약을 선언 ② **이벤트 select**(`:76-98`) — `required` + `SelectField` 자식 → 주입(`FormField.tsx:41`). 오류 상태가 없어 `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않고 `aria-describedby={hintIdOf(triggerId)}` 로 힌트만 잇는다(`:89`) ③ **본문 TextareaField**(`SmsTemplateFormPage.tsx:159-169`) — DS 가 내부 배선(`TextareaField.tsx:62-67`): `required` + `aria-required={required ? true : undefined}` + `aria-invalid={invalid}` + `aria-describedby={invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined}`. **이 화면은 `hint` 를 주지 않으므로 유효할 때 `undefined` 가 된다** — 옳다. **짝 없는 `aria-invalid` 0건** — 이 화면 디렉터리에 `aria-invalid` grep 히트가 **0건**이다(전부 `TemplateIdentityFields`·`TextareaField` 가 소유). **required FormField 자식이 전부 `input`/`SelectField`/`textarea` 라 GROUND-TRUTH 의 미주입 2건(래퍼 div/span)에 해당하지 않는다** | `grep -n "aria-invalid" apps/admin/src/pages/notifications/sms-templates` → **0건**(위임). `_shared/TemplateIdentityFields.tsx:69` 히트는 같은 요소에 `aria-describedby`(`:70`)가 있는지 확인 — 있다. RTL 로 템플릿명을 비운 채 '등록' → `input.getAttribute('aria-describedby') === screen.getByRole('alert').id`. required 컨트롤 3개가 `aria-required="true"` 를 노출하는지 확인 — **주입은 런타임이므로 grep 으로 판정하지 말 것**(GROUND-TRUTH §1) | **pass** |
| A11Y-12 | A11Y | 상속 | **표면이 실재한다** — 좌측 이벤트 분류 필터(`SmsTemplateListPage.tsx:128-135`). 공유 `FilterPanel` 이 `<button aria-pressed={active}>` 를 그리고(`FilterPanel.tsx:65`) **`aria-current` 를 쓰지 않는다**(`:14-16`). `FilterPanel.tsx:1-11` 이 존재 이유를 밝힌다 — **알림 관리의 필터가 ESG 것의 복제였고 한쪽은 `aria-current`, 다른 쪽은 `aria-pressed` 를 써서 A11Y-12 를 위반하고 있었다. 통합이 한 벌로 수렴했다.** 이 화면은 소비자다 | `FilterPanel` 판정 종속. **형제 화면의 테스트가 그 계약을 고정한다** — `send/RuleListPage.test.tsx:61-69` 가 `aria-pressed` true/false 와 `aria-current === null` 을 단언(같은 컴포넌트라 이 화면에도 유효). `grep "aria-current" apps/admin/src/pages/notifications` → 0건 | **종속** |
| MOTION-01 | MOTION | 상속 | Modal 표면 4종(삭제 ×2 · 이탈 가드 · 409 충돌). enter/exit 모션은 DS `Modal` organism 소유. **⚠ 근거 갱신 — 이전 기준의 추정을 지운다.** PR #26 이 오버레이 모션을 **구현했다. 단 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `Modal.css:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **Motion/AnimatePresence 소비는 `packages/ui/src` 에 여전히 0건이나**(모션 라이브러리 자체가 미도입), 요구가 명시한 'exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성됐다 — **'0건이라 gap 일 가능성이 높다'는 이전 추정은 틀렸다.** 라이브러리 부재를 gap 으로 볼지는 DS 문서의 몫이다 | DS Modal 판정 종속. 이 화면이 소비하는 4개 Modal 표면이 실재함만 확인 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 2종(저장 · 삭제). exit 애니메이션은 `ToastProvider`/`Toast` 소유. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`) → keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. **요구 본문이 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`) | DS Toast 판정 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 표면: 스켈레톤 펄스(`ui.css:110` reduced-motion **있음**) · Toast(`Toast.css:136-141` **있음**) · Modal(`Modal.css:173-180` **있음**) · DS Button(`Button.css:158` **있음**). **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **⚠ `ToggleSwitch` 가 이 화면에 없다** — 이 화면의 판정에는 영향이 없으나 **이전 기준이 적어 둔 DS 현황 서술이 낡았다**: `ToggleSwitch.css` 의 reduced-motion 누락은 **해소됐다**(`:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `none` 으로 끈다 — `:32` background-color · `:56` transform 둘 다 덮는다). 즉 그 gap 은 **FS-064 에서도 더 이상 유효하지 않다** | 전역 motion config·`ui.css` 판정 종속. 로컬 transition 선언 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | **충족.** 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:298-300`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록 최상위가 `<div style={pageStyle}>`(`SmsTemplateListPage.tsx:124` → `_shared/styles.ts:12`), 폼 최상위가 `FormPageShell` 의 `<div style={pageStyle}>`(`:147`). 좌측 `FilterPanel` 은 **화면 안의 2열 그리드**(`_shared/styles.ts:20-25`)이지 앱 sidebar 가 아니다 — `<nav aria-label="이벤트 분류 필터">` 로 자기 이름을 갖는다(`FilterPanel.tsx:56`) | 세 라우트에서 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **부분 미충족 — 목록은 pass, 폼 sub-route 는 gap.** ① **목록 pass**: `/notifications/sms-templates` 는 nav 잎이므로(`nav-config.ts:218`) `findCoveringLeaf` 가 자기를 찾아 `findNavLabel` 이 **'SMS 템플릿'** 을 돌려준다(`nav-config.ts:270-278,297-299`). AppHeader 가 `<h1>` 으로 렌더하고(`AppHeader.tsx:92,101`) **화면에 in-content `<h1>` 이 없다** → h1 1개 · 정확한 이름 ② **폼 gap**: `/new` 는 잎이 아니지만 `findCoveringLeaf` 가 '자기를 감싸는 가장 긴 잎' = `/notifications/sms-templates` 를 찾아 **'SMS 템플릿'** 을 돌려준다 — **가지 폴백('알림 관리')은 통합이 해소했다.** **그런데 `FormPageShell.tsx:160` 이 `<h1>SMS 템플릿 등록</h1>` 을 또 그린다 → `<h1>` 이 2개다.** 게다가 `nav-config.ts:294-296` 이 밝히듯 **'등록/수정' 행위를 제목에 넣지 않는 것이 의도**다 — quality-bar IA-02 가 예시로 든 '가시 primary title 이 **공지 등록**' 은 미충족. **gap 의 사유가 바뀌었다: 가지 폴백(해소됨) → h1 이중 + 행위 미반영** | `/notifications/sms-templates` → `document.querySelectorAll('h1').length === 1` 이고 'SMS 템플릿'이면 pass. `/new` → **`length === 2`('SMS 템플릿' + 'SMS 템플릿 등록')이면 gap** | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: toolbar row(검색 좌측 `SmsTemplateListPage.tsx:108-114` · **primary 'SMS 템플릿 등록' 우상단** `:116-119`) → 결과 count 요약(`CrudListShell.tsx:115-123`) → SelectionBar(`:125-133`) → table(`:135`). **미충족: Pagination 이 없다.** `grep "Pagination" apps/admin/src/pages/notifications apps/admin/src/shared/crud` → **0건**. `CrudTable` 이 `items.map(...)`(`:171`)으로 전량을 렌더한다. **'page size 초과 가능'인가 — 확실하다.** **FS-064 와 달리 상한이 없다**: 이름 중복을 막지 않고(BE-066 §EP-03 주) 한 트리거에 템플릿을 몇 개든 둘 수 있다. 앱 관례 `PAGE_SIZE = 10`(`pages/members/types.ts:71` 등 6곳) 기준으로 금방 넘는다. 현재 픽스처 5건(`store.ts:184-220`)이라 드러나지 않을 뿐이다. **이 화면이 형제 중 비용이 가장 크다** — 행마다 `byteLengthOf` 를 **2회** 돈다(FS-066-EL-008.7·008.8). BE-066 §7.8 이 페이징 + 서버측 필터·검색·건수 + **유형/바이트 정렬**을 판정했다 | 픽스처를 20건 이상으로 늘리고 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** ERP-15 와 한 배치 | **gap** |
| IA-05 | IA | 직접 | **충족.** `/new` 와 `/:id/edit` 가 **같은 컴포넌트**(`SmsTemplateFormPage`)로 해석된다(`App.tsx:299-300`). `useCrudForm` 이 `:id` 유무로 갈린다(`useCrudForm.ts:74-75`). **레이아웃이 동일**하고 다른 것은 title(`FormPageShell.tsx:160`)과 prefill(`useCrudForm.ts:131-134` `reset(toValues(loaded))`)뿐이다. create 전용/edit 전용 page 가 없다. `SmsTemplateFormPage.tsx:3-4` 가 이 계약을 선언('IA-05 — 등록·수정이 한 컴포넌트다… 데이터·저장·미저장 이탈 가드는 공용 CRUD 프레임워크를 그대로 쓴다') | 두 라우트가 같은 컴포넌트로 렌더되고 레이아웃이 동일한지, 제목·프리필만 다른지 확인 | **pass** |
| IA-13 | IA | 직접 | **충족.** 조회 상태의 **단일 원천이 URL** 이다 — `SmsTemplateListPage.tsx:80` `useListState({ filterDefaults: { [CATEGORY_PARAM]: FILTER_ALL } })`. 분류는 `?cat`(`notification.ts:421` — **세 목록이 같은 키를 쓴다**: '같은 키를 써야 링크가 한 가지 뜻을 갖는다'), 검색어는 `?q`(`useListState.ts:27`). 기본값과 같은 값은 URL 에서 지운다(`:115-117`). 갱신은 `{ replace: true }`(`:125`). **상세에서 Back 하면 그 URL 이 그대로 복원된다**(`:17-19`). 모르는 값은 `parseCategoryFilter` 가 `as` 없이 좁혀 '전체'로(`notification.ts:436-439`). `:79` 주석이 '조회 상태의 원천은 URL, IME 조합 판정은 공유 훅 소유 (사본 수렴됨)'을 선언. **`page`·`sort` 는 쓰이지 않는다** — 페이지네이션·정렬 UI 표면이 없다(IA-04·ERP-04 소관) | 좌측 '배송' 필터 + 검색 '출발' → URL 이 `?cat=delivery&q=출발` 인지 → 행 클릭으로 `/:id/edit` → 브라우저 Back. **URL 과 필터·검색이 복원되면 pass.** URL 을 새 탭에 붙여넣어 같은 view 재현. `?cat=bogus` 는 '전체'로 | **pass** |
| EXC-01 | EXC | 상속 | 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` **바로 바깥**에 두는 `ErrorBoundary`(`AppShell.tsx:18,484-493` + `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 소비자다. **⚠ FS-064 와 달리 이 화면엔 던질 수 있는 동기 store 호출이 없다** — 쿼리 밖 store 접근 0건 | ErrorBoundary 판정 종속. 컴포넌트 강제 throw 시 사이드바 유지 + 복구 화면 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher`. **이 화면의 조회·저장·삭제 실패가 전부 이 인터셉터를 통과한다.** **이 화면의 이득**: `returnUrl` 에 쿼리가 포함되므로 **재로그인 후 필터·검색까지 복원된다**(IA-13 과 맞물린다) | auth/session 판정 종속. `?status=list:401` → `/login?returnUrl=%2Fnotifications%2Fsms-templates…&reason=session_expired`. (폼 미저장 입력 유실은 EXC-19 P1 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): **read 게이팅** — `RequirePermission` 이 `<Outlet>` 을 감싸(`AppShell.tsx:490-491`) 권한 없는 deep-link 에 403 화면을 렌더하고, 라우트→리소스 파생이 `/:id/edit` 까지 덮는다(`route-resource.ts` — `nav-config.ts:260-278` 과 같은 규칙). 세 잎이 `menu.notifications` 권한을 공유한다(`nav-config.ts:214`). **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan` 소비처는 **8곳**(`logs/components/LogListShell` · `products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`)이며 **알림 관리가 없다**(grep). `can(resource,'update')` 를 묻지 않고 렌더되는 쓰기 컨트롤 4종: 'SMS 템플릿 등록'(`SmsTemplateListPage.tsx:116`) · RowActions 수정·삭제(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126`) · '등록/저장'(`FormPageShell.tsx:189`). **이 화면에서 가장 무거운 이유**: BE-066 §7.7 이 쓰기를 `admin` 전용으로 판정한 근거가 **'SMS 인증번호 문구를 바꿀 수 있다는 것은 스미싱 문구를 정본으로 만들 수 있다는 뜻'**(시드 `ntf-sms-4` — `store.ts:206-212`)이고 **'문구를 90byte 위로 늘리면 모든 후속 발송의 단가가 오른다'**(건당 과금)이다. `operator` 가 그 버튼을 보고 누르며 서버 403 이 '저장하지 못했습니다' 배너로 뭉개진다(강등 reconcile 없음) | 권한 스토어에서 `notification-sms-templates` 의 `update` 를 끈 뒤 진입. **'SMS 템플릿 등록'·행 수정/삭제가 그대로 보이면 gap.** read 를 끄면 403 화면(이쪽은 pass). `?status=save:403` → 배너가 권한 문구로 갈리지 않으면 EXC-06 gap 도 | **gap** |
| EXC-04 | EXC | 직접 | **부분 미충족 — ⚠ 두 절을 분리해 판정한다.** **충족된 절(F3b 가 해소)**: ① **유령 저장이 사라졌다** — `createStoreAdapter.update` 가 `if (!exists(id)) throw new HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`(`crud.ts:219-221`, 주석 `:210-218` 이 '유령 저장(ghost saved)' 이라는 이름과 경위를 기록), `remove` 도 같다(`:232-234`) ② **409 를 해소할 UI 가 있다** — `useCrudForm` 이 `isConflict(cause)` 를 잡아 **입력을 보존한 채** 충돌 다이얼로그를 띄우고(`useCrudForm.ts:166-178` — `reload`/`dismiss`) **성공 토스트도 목록 이동도 하지 않는다**(`:164-165`). `FormPageShell.tsx:196` 이 렌더한다. **미충족된 절**: ③ **낙관적 동시성 토큰을 보내지 않는다.** 요구 본문은 '`If-Match`/`ETag` **또는** `updatedAt`/`version` 을 **보낸다**'인데 어댑터가 아무것도 싣지 않는다(`crud.ts:205-225` 에 헤더 개념이 없다). **`SmsTemplate.updatedAt` 이 존재하고 목록에 '수정일시' 열로 표시까지 되는데**(`notification.ts:387` · `SmsTemplateListPage.tsx:70-74`) `SmsTemplateInput` 이 그것을 `Omit` 한다(`:390`). **그래서 409 는 '대상이 존재하는가'만 본다 — 둘 다 존재하는 동시 편집은 여전히 last-write-wins 다**(BE-066 §7.1 의 표). **이 화면이 특히 나쁜 이유 — 비용이 걸린다**: A 가 `ntf-sms-3`(이미 LMS 인 표본 — `store.ts:199-205`)를 90byte 이하로 줄여 단가를 낮추는 동안 B 가 문구를 덧붙이면, **나중 저장이 앞선 것을 조용히 덮어 비용 절감이 되돌아간다.** 목록이 `updatedAt` 과 바이트를 보여주므로 **덮인 사람은 자기 저장이 살아 있다고 믿는다** | `?status=save:409` 로 `/:id/edit` 에서 저장 → **충돌 다이얼로그가 입력을 보존한 채 뜨고 토스트·이동이 없으면 ①② pass.** ③ 판정: `grep -rn "If-Match\|ETag\|version" apps/admin/src/shared/crud apps/admin/src/pages/notifications` → **0건이면 gap**(현재 0건). 동시 편집 재현: 두 탭에서 같은 템플릿을 열고 각각 본문을 바꿔 저장 → **나중 저장이 앞선 변경을 경고 없이 덮으면 gap** | **gap** |
| EXC-08 | EXC | 직접 | **충족 — 이 화면의 두 쓰기 표면 모두.** ① **폼 저장 3중**: pending 중 비활성(`FormPageShell.tsx:189` `disabled={saving \|\| loadingDetail}`) **AND** **동기 제출 락** `submitLockRef`(`useCrudForm.ts:103,201-202` — RHF 비동기 검증 탓에 `saving` 이 true 가 되기 전의 두 번째 Enter 를 **렌더를 기다리지 않고** 막는다, `:95-101` 주석이 이유를 기록) **AND** **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:118-123`)를 **mutationFn 밖**에서 만들어 `variables` 로 싣고(`:228,235`) 재시도가 같은 키를 재사용하며 성공 시 버린다(`:220`). **키가 실제로 어댑터에 도달한다** — `WriteContext.idempotencyKey`(`crud.ts:30-41`, 주석 `:20-23` 이 '예전에는 키를 만들고 반환값을 버렸다'는 과거를 기록) → `ledger.isReplay`(`:201,208`). ledger 는 **성공한 뒤에만 기록**해 실패한 첫 시도가 키를 태워 재시도를 no-op 으로 만들지 않는다(`:55-60`) ② **삭제**: 멱등키가 없으나(`useCrudList.tsx:101-103`) **`crud.ts:36-39` 가 그 생략을 의도로 선언한다** — '생략 가능하다 — **목록의 단건 삭제처럼 사용자가 매번 확인 다이얼로그를 거치는 조작**은 키 없이 온다.' 이 화면의 삭제는 그 예외가 **정확히 성립한다**: 확인 다이얼로그가 매 시도를 게이트하고(`useCrudList.tsx:154-165`) `busy` 가 확인 버튼을 `disabled` + `aria-busy` 로 잠그며(`ConfirmDialog.tsx:151-152`) DELETE 가 자연 멱등이다. **⚠ FS-064 와의 결정적 차이**: 저 화면은 **확인 없는 쓰기(자동 발송 토글)** 가 있어 예외가 성립하지 않아 gap 이다. **이 화면엔 확인 없는 쓰기가 0건이다** | '등록'을 최대한 빠르게 2회 클릭(또는 Enter 연타). **정확히 1요청이면 pass.** `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/shared/crud/useCrudForm.ts` → 있음. 삭제 확인 버튼 연타 → `busy` 가 두 번째를 막는지 | **pass** |
| EXC-09 | EXC | 직접 | **충족 — 두 쓰기 경로 전부.** ① **폼 저장** — `onError` 가 `if (isAbort(cause)) return;`(`useCrudForm.ts:161`, 주석 '취소는 실패가 아니다 — 토스트도 배너도 없다')로 abort 를 실패로 처리하지 않고, `onSuccess` 가 `if (controller.signal.aborted) return;`(`:218`)로 취소된 요청의 토스트·이동을 막으며, unmount 가 abort 한다(`:93`) ② **삭제** — 다이얼로그 닫기가 abort + **`mutation.reset()`**(`useCrudList.tsx:87-89` — 요구의 'isPending 리셋' 절) · `:104` success 가드 · `:110-111` `isAbort`. **전부 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다** — 로컬 판정을 재발명하지 않는다. **미충족 절 하나**: 'bulk 실패 count 에서 abort 제외' — 일괄 삭제가 `settleAll`(`shared/bulk.ts`)로 **거절 수만 세므로** 이탈 시 abort 가 실패 수에 섞일 수 있다(`useCrudList.tsx:136-142`). **그러나 그 경로는 실질적으로 도달 불가**: `closeBulk` 가 abort 한 뒤 `onSuccess` 의 `if (controller.signal.aborted) return`(`:137`)이 **집계 자체를 버려** 배너가 그려지지 않는다. 표면상 결함이나 관측되지 않으므로 pass 로 두고 §5 #12 에 기록 | `/new` 에서 저장 중(400ms 창) '목록으로' 클릭 → **error toast·배너가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다. 삭제 확인 직후 다이얼로그 닫기 → 실패 배너 없음 | **pass** |

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
> **형제 문서와의 차이**: NFR-065(이메일 템플릿)와 **완전히 같은 4건**이다 — 두 화면이 같은 공용 배관(`useCrudList`+`useCrudForm`+`createStoreAdapter`)을 같은 방식으로 소비하기 때문이다. NFR-064(발송 규칙)는 **EXC-08 이 gap** 이라 5건이다 — 목록의 자동 발송 ToggleSwitch(`useCrudRowUpdate`)에 동기 락·멱등키가 없고 확인 다이얼로그도 없어 `crud.ts:36-39` 의 생략 예외가 성립하지 않기 때문이다. **이 화면엔 확인 없는 쓰기가 0건이라 pass 다.**
> **IA-04 의 심각도는 이 화면과 FS-065 가 높다**(상한 없음). 그중에서도 **이 화면이 가장 무겁다** — 행마다 `byteLengthOf` 를 2회 돈다(§4.1).
>
> **참고 — NFR-036(마케팅 발송 템플릿)의 판정은 낡았다**: F2(`3cd3078`) 기준이라 COMP-10 · IA-13 을 gap 으로 적었으나, 통합 이후 `marketing/templates/TemplateListPage.tsx:124,159` 가 `useListState` 를 소비해 **두 항목이 pass 로 뒤집혔다.** 또 NFR-036 이 EXC-04 gap 의 사유로 든 '`createStoreAdapter` 의 존재 검사 부재'는 **F3b 가 `crud.ts:219-221` 로 해소했다** — 지금의 EXC-04 gap 사유는 **'동시성 토큰 부재'** 다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·금액·CSV·2열 preview·읽기전용 detail·인라인 토글·제목 필드)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **화면이 그 이득을 버리지 않는다**(`CrudListShell.tsx:116-122`) | 재조회에서 이전 행이 유지되는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 **3분기**한다 — 화면이 `hasQuery`·`hasActiveFilters`·`onClearSearch`·`onResetFilters`·`createAction` 을 전부 공급하고(`SmsTemplateListPage.tsx:145-156`) `Empty` 가 조사와 copy 를 고른다(`CrudTable.tsx:156-167`) | 검색 0건 → '조건에 맞는 …' + 검색 지우기. 필터 0건 → 필터 초기화. 진짜 0건 → 등록 CTA | **pass** |
| STATE-06 | P1 | write 성공 시 `useCrudCreate`/`useCrudUpdate`/`useCrudDelete` 가 목록·상세를 정확히 무효화한다 | 폼에서 본문 변경 후 목록 복귀 시 **바이트·유형 열이 갱신돼 있는지**(파생값이라 본문만 맞으면 따라온다) | **pass** |
| COMP-01 | P1 | **모든 action/navigation 버튼이 DS `<Button>`** 이다 — 등록(`SmsTemplateListPage.tsx:116,151`) · 취소/저장(`FormPageShell.tsx:181-191`) · '다시 시도'/'목록으로'(`:133,137,160`) · '선택 N건 삭제'(`CrudListShell.tsx:126`). `grep "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/notifications` → **0건**. **⚠ 진행 상태를 `loading` prop 이 아니라 손라벨로** — `FormPageShell.tsx:190`. 요구가 금지한 형태이나 **공용 셸의 결정이며 화면 코드가 아니다**. 손조립 `<button>` 은 `FilterPanel.tsx:61`(리스트 항목) · `FormPageShell.tsx:148`(back-link) · **`VariableInsertBar.tsx:64`(변수 칩)** — 앞 둘은 공유 소유. **칩은 이 섹션 소유이나 Button variant 에 chip 이 없어 DS 로 표현할 수 없다**(정당한 이탈) | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/notifications` → 0건(현재 0건) | **gap(공용 셸 소유)** |
| COMP-02 | P1 | 선택 셀이 `RowSelectCell`/`SelectAllHeaderCell`, 순번이 `SeqCell`/`SeqHeaderCell`(`CrudTable.tsx:124-130,173-179`). raw checkbox 0건 | selectable 표에 raw checkbox 가 0건인지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>`(`SmsTemplateListPage.tsx:108`). `grep 'type="search"' apps/admin/src/pages/notifications` → 0건 | raw `<input type="search">` 재구현 0건인지 | **pass** |
| COMP-04 | P1 | **required 필드 3개가 전부 `FormField required`** 로 노출돼 `*` 마커가 렌더된다 — 템플릿명·이벤트(`TemplateIdentityFields.tsx:56,79`) · 본문(`SmsTemplateFormPage.tsx:161` → `TextareaField` 가 `FormField required` 로 전달, `TextareaField.tsx:47`). bare `<label>` 로 그린 required 필드 0건 | 모든 zod-required 필드가 `*` 마커를 렌더하는지 | **pass** |
| COMP-06 | P2 | 스켈레톤 행 수 하드코딩 `Array.from({ length: 5 })`(`CrudTable.tsx:144`). 셀 수만 `columns.length + 3`(= 9) 으로 파생(`:113,146`). 페이지네이션이 없어 'row 수 === PAGE_SIZE' 기준값 자체가 없다 | `grep "length: 5" shared/crud/CrudTable.tsx` → 0건이어야 한다. 현재 1건 | **gap(공용 셸 소유)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 없음. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 해소 시 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지 | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 `RowActions`(pencil/trash — `CrudTable.tsx:192-197`) — 요구의 (b) '인라인 편집 테이블은 RowActions' 에 정확히 해당. **중복 '상세' 버튼이 없다** | 편집 테이블이 RowActions 를 쓰고 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | **부분 충족.** 본문 열은 **2중으로 자른다** — `oneLinePreview(item.body, 50)`(`_shared/styles.ts:73-76`, 모든 공백을 한 칸으로 접고 50자에서 `…`)에 `ellipsisCellStyle`(`:53-61`, 주석이 'COMP-09: 긴 값이 컬럼을 밀어 표를 깨뜨리지 않는다'를 명시)을 얹는다(`SmsTemplateListPage.tsx:50`) — **형제 중 가장 견고하다.** **그러나 템플릿명 열은 truncate 가 없다**(`:47` — `render: (item) => item.name`). 60자 상한이라 열을 넓히기 충분하다. **한 줄로 해소된다.** hover/expand 로 전체 값 노출은 두 열 모두 없다 | 60자 템플릿명 + 2,000byte 본문 픽스처로 표 폭이 유지되는지 | **gap(부분)** |
| COMP-12 | P2 | **이 화면이 앱 내에서 이 요구에 가장 정확히 답한다 — 그러나 부분 충족이다.** ✔ **counting 기준이 정의돼 있다** — `notification.ts:33`('한글=2byte·ASCII=1byte, EUC-KR 기준') · `:361-367`('**진짜 제약은 바이트이지 글자수가 아니다** … 글자수 cap 은 이론상 최대치(전부 ASCII)인 2,000 으로 두고 **실제 판정은 `byteLengthOf` 로 한다** — 여기를 1,000 으로 잡으면 2,000자짜리 영문 본문(2,000byte 로 적법)이 이유 없이 막힌다'). **요구가 요구한 'code point vs byte' 결정을 명문화한 앱 내 유일한 곳이다** ✔ **실시간 카운터 2종** — 글자수 `N/2000`(`TextareaField` 내부) + **바이트 `N / M byte`**(`SmsTemplateFormPage.tsx:179`) ✔ **상한 근접 경고가 실재한다** — LMS 승격 안내(`:180-182` '90 byte 를 넘어 LMS 로 발송됩니다(**건당 단가가 오릅니다**)') · 초과 안내(`:183` '한도를 넘었습니다. 저장하려면 문구를 줄여 주세요.') + 배지 톤 전환(neutral→warning→danger, `:175`) ✔ **submit 전 인라인 검증** — 스키마가 바이트를 막는다(`validation.ts:26-37`) ✘ **템플릿명(60자)에 카운터가 없다** — `maxLength` 가 예고 없이 멈춘다 ✘ **'서버 강제와 일치시킨다' 절이 미충족** — 서버가 없고 규약 동기화 방식이 미정이다(BE-066 §7.2) ✘ **§5 #6 의 치환 후 바이트 문제** | 본문에 한글 45자 → '90 / 90 byte' + SMS neutral. 46자 → LMS warning + 승격 안내. 1,001자 → danger + 저장 차단. **템플릿명 61자 → 조용히 멈추면 부분 gap** | **gap(부분)** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert · write 성공=toast · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`useCrudList.tsx:161`) · 폼 저장 실패=폼 카드 배너(`FormPageShell.tsx:168`, 폼 맥락이라 `FormServerError` 가 옳다). **⚠ 이 화면엔 error toast 가 없다** — 'error toast 는 자동 소멸 없이 다시 시도 포함' 절이 걸릴 표면이 없다 | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 피드백 — create/update(`useCrudForm.ts:229,236`) · delete(`useCrudList.tsx:104-114`) · bulk delete(`:136-149`). no-op 클릭이 없다 | `?fail=save` · `?fail=delete` → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 delete 가 delete-intent ConfirmDialog 를 연다(`useCrudList.tsx:154-177`). undo window 는 없으나 요구가 'confirm **또는** undo' 이므로 충족. **⚠ 그러나 이 화면의 삭제는 undo 가치가 가장 높다** — 인증번호 SMS 템플릿 삭제가 로그인을 막는다(BE-066 §7.3) | 단일 미확인 클릭 delete 가 0건인지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 소유(`Modal.initialFocusRef`) | DS 판정 종속 | **종속** |
| A11Y-05 | P1 | `SelectField isInvalid` 의 AT 반영은 DS 소관. **이 화면은 이벤트 select 에 오류 상태를 두지 않아**(`TemplateIdentityFields.tsx:86-91`) 그 표면이 걸리지 않는다 | DS SelectField 판정 종속 | **종속** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(`CrudTable.tsx:172`)이고 **행 안에 keyboard-focusable 등가물이 있다** — RowActions 의 '수정' 버튼(접근 이름이 템플릿명 기반). 체크박스도 focusable | 행을 Tab 해서 수정 컨트롤에 도달하는지 | **pass** |
| A11Y-13 | P1 | **폼 진입 시 첫 편집 필드 포커스가 있다** — `useInitialFocus<HTMLInputElement>(!loadingDetail)`(`SmsTemplateFormPage.tsx:107`)의 ref 를 register ref 와 함께 템플릿명 input 에 문다(`:149-152` → `TemplateIdentityFields.tsx:72`). 훅이 `ready` 가 처음 true 가 될 때 **한 번만** 포커스해 사용자가 옮긴 포커스를 뺏지 않는다(`useInitialFocus.ts:16-25`). `autoFocus` 를 피한 이유까지 주석이 밝힌다(`:5-7`). **검증 실패 시 첫 오류 필드 포커스**는 RHF `shouldFocusError` + `useCrudForm` 이 `onInvalid` 를 명시해 계약으로 고정(`useCrudForm.ts:240-248,260`). 서버 422 도 `setFocus(first.field)`(`:190`). **⚠ FS-065 와 달리 필드 혼동이 없다** — 제목이 없어 body 축 오류가 전부 body 에 꽂히는 것이 자연스럽다(`validation.ts:34,47,59`). `SmsTemplateFormPage.tsx:143-144` 주석이 계약을 선언 | 빈 본문으로 '등록' → activeElement 가 본문 textarea 인지. 폼 진입 시 템플릿명에 포커스가 가는지 | **pass** |
| A11Y-16 | P1 | 신규 인터랙티브 표면이 계약을 만족한다: `FilterPanel` = `aria-pressed` + `tds-ui-focusable`(`FilterPanel.tsx:63-65`) · **`VariableInsertBar` 칩** = `<button type="button">` + `tds-ui-focusable` + **`aria-label={'<변수명> 변수 삽입'}`**(`VariableInsertBar.tsx:64-72` — 토큰 글자만으로는 이름이 되지 않아 별도 이름을 준다) · 표 `aria-busy` + caption(`CrudTable.tsx:116-120`) · **지속 live region**(`CrudListShell.tsx:107-109`) · `role="alert"` 오류(`FormField`) · **유형 배지**가 색과 글자로 이중 인코딩(`StatusBadge label={smsKindLabel(kind)}` — `SmsTemplateListPage.tsx:59` · `SmsTemplateFormPage.tsx:176`, WCAG 1.4.1). **⚠ 두 표면이 live region 이 아니다** — ① **바이트 카운터 행**(FS-066-EL-026)이 입력 중 실시간으로 바뀌는데 announce 되지 않는다(`SmsTemplateFormPage.tsx:173-185` 에 `aria-live` 0건) — **SMS→LMS 승격(비용 상승)을 스크린리더 사용자가 알 수 없다** ② 광고성 경고(EL-028)도 마찬가지(`:191`) | 칩의 aria-label, 필터의 aria-pressed, 배지의 글자 인코딩 확인. **본문을 91byte 로 만들 때 승격이 announce 되는지 — 안 되면 부분 gap** | **gap(부분)** |
| ERP-01 | P1 | status→tone 매핑이 **공유 도메인 모듈의 단일 레지스트리** — `TRIGGER_CATEGORY_TONE`(`notification.ts:65-70`). 세 화면이 `triggerColumn`(`triggerColumn.tsx:16-29`)을 통해 같은 함수를 소비. **⚠ 유형 배지의 tone 은 레지스트리가 아니라 인라인 삼항이다** — `tone={kind === 'lms' ? 'warning' : 'neutral'}`(`SmsTemplateListPage.tsx:59`) · `tone={overLimit ? 'danger' : kind === 'lms' ? 'warning' : 'neutral'}`(`SmsTemplateFormPage.tsx:175`). **같은 개념(SMS/LMS)이 두 곳에서 다르게 조립된다** — 목록엔 danger 분기가 없다(목록은 저장된 것만 보여 초과가 있을 수 없으므로 **의도된 차이**이나, 레지스트리로 수렴하면 그 판정이 코드로 드러난다) | 모든 분류가 정의된 tone 으로 해석되는지(`notification.test.ts:52-58` 회귀 방어). 유형 tone 이 한 곳에서 오는지 | **gap(경미)** |
| ERP-04 | P1 | sortable header 없음 — 정렬이 `sortByTrigger`(`notification.ts:471-477`)의 고정 default-sort 뿐. **이 화면에서 요구가 가장 실재한다** — **바이트·유형이 비용 축인데 정렬도 필터도 없다**(FS-066 §7 #8). 목록이 그 정보를 열로 강조하면서 그것으로 좁힐 수단을 주지 않는다. 'LMS 인 것만 보기'가 불가능하다 | sortable header 도입 시 재판정. **BE-066 §7.8 이 페이징과 함께 서버로 올릴 것을 판정** | **gap** |
| ERP-05 | P1 | **Pagination 소비 0건**이라 range/page-size 표면이 없다(IA-04 gap 과 같은 뿌리) | Pagination 도입 시 `pageSize` opt-in 여부로 재판정 | **n-a(표면 부재)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 날짜·숫자가 `shared/format`(`formatDateTime` — `SmsTemplateListPage.tsx:73` · `formatNumber` — `:67` · `SmsTemplateFormPage.tsx:179,181`)을 경유한다. **인라인 포맷 0건.** **바이트 카운터가 `formatNumber` 를 쓴다**(`:179`) — 2,000byte 가 '2,000' 으로 천 단위 구분된다 | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 수정일시가 `formatDateTime`, **바이트·건수가 `formatNumber`** 를 경유(`SmsTemplateListPage.tsx:67` · `SmsTemplateFormPage.tsx:179,181`). **raw numeric toString 0건.** 바이트 열이 `numeric: true` 라 우측 정렬 + tabular-nums(`CrudTable.tsx:184`) | 표 셀의 raw numeric toString 이 0건인지 | **pass** |
| ERP-09 | P2 | **timestamp 표시 표면이 실재한다** — 수정일시 열(`SmsTemplateListPage.tsx:70-74`). `formatDateTime` 을 경유하나 **표시 TZ 정책이 없다** — 통합이 달력 산술의 앵커를 UTC 정오로 수렴했으나(`shared/format.ts:33-45`) 그것은 산술이지 표시 TZ 가 아니다. 다른 TZ 관리자가 수정 시각을 다르게 본다. **FS-064 엔 이 표면이 없다** | UTC ISO 입력이 runner OS timezone 과 무관하게 동일 wall-clock 을 렌더하는지 | **gap** |
| ERP-13 | P1 | **충족.** 이 화면의 templated copy 에 **리터럴 조사 폴백이 0건**이다. 조사 헬퍼는 `shared/format.ts:269+` 가 소유하고 — **통합이 사본 3벌(`logs/josa.ts` · `notifications/_shared/notification.ts` · `@tds/ui` 의 `Empty`) 중 앞의 둘을 그리로 수렴했다**(**`notification.ts:37-38` 이 그 이관을 기록**: '조사(助詞)는 shared/format 이 소유한다 (ERP-13). 이 섹션이 갖고 있던 사본은 그리로 수렴됐다 — 세 곳(logs·notifications·@tds/ui Empty)이 같은 받침 판정을 각자 구현하고 있었다'). 소비 지점: ① 저장 토스트(`useCrudForm.ts:222` `objectParticle('SMS 템플릿')`) ② **삭제 확인·토스트**(`useCrudList.tsx:108,158` — **이름의 받침**으로 고른다) ③ 폼 로드 실패 배너(`FormPageShell.tsx:129-130`) ④ 빈 상태(`Empty` 자체 판정 — `@tds/ui` 는 앱을 import 할 수 없어 **자족이 의도**) ⑤ **검증 문구**(`requiredText` — `shared/crud/validation.ts:17`). **'(으)로' 폴백형도 0건.** **⚠ 이 화면 고유 경계**: 시드 이름이 '주문 접수 안내(SMS)'처럼 **ASCII 로 끝난다**(`store.ts:189`) — 헬퍼가 '영문·숫자로 끝나는 말은 관용을 따라 **받침 없음**으로 본다'(`format.ts` 주석)라 '…(SMS)**를** 삭제했습니다'가 된다. **그것이 자연스러운 한국어이며 의도된 폴백**이다 | `grep -nE "이\(가\)\|을\(를\)\|은\(는\)\|\(으\)로" apps/admin/src/pages/notifications` → 사용자 대상 문자열 히트 **0건**. 남는 히트는 ① 주석 ② **리터럴 부재를 단언하는 테스트** 뿐이다 — **`sms-templates.test.ts:27-31` '템플릿명이 비면 막는다 — 조사는 받침에 맞춘다(ERP-13)' 가 `expect(message).toBe('템플릿명을 입력하세요.')` + `expect(message).not.toContain('을(를)')` 를 단언**하고, **`:33-35` 가 `expect(messageFor(valuesOf({ body: '' }), 'body')).toBe('본문을 입력하세요.')` 를 단언**한다 | **pass** |
| ERP-15 | P1 | 전량을 한 DOM 에 렌더한다(`CrudTable.tsx:171`) — cap·virtualization 없음. **FS-064 와 달리 상한이 없다**(BE-066 §7.8). **이 화면이 형제 중 비용이 가장 크다** — 행마다 `byteLengthOf` 를 **2회** 돈다(유형 열 `:56` + 바이트 열 `:67`, 같은 값을 각각 센다 — §5 #13). 2,000자 × 1,000행이면 **400만 자 순회**다. **열이 9개**라 좁은 화면에서 셀이 접힌다 — `listLayoutStyle` 이 `minmax(0, 1fr)` 로 목록을 줄이고(`_shared/styles.ts:22`) **가로 scroll 컨테이너가 없다**(요구의 'wide table 은 bounded container 내 가로 scroll' 절 미충족) | 1,000건 픽스처로 scroll/검색이 매끄러운지. 9컬럼 표가 좁은 화면에서 가로 scroll 하는지. **IA-04 와 한 배치** | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` **앱 전역 0건**(grep) — 이 화면도 상한 없음 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | `HttpError` 가 status 를 갖고 `?status=<op>:<code>` 로 9종 재현 가능(`dev.ts:26-37`). **그러나 화면이 분기하는 것은 404 하나뿐**(`FormPageShell.tsx:121`). 400 을 `useCrudForm` 이 분기하지 않아 배너로 뭉개지고(`:194`), 403·429 가 일반 배너로. 409(폼)·422(`violations` 있을 때)는 정확 | `?status=save:403` vs `save:429` vs `save:500` 이 다른 surface 를 그리는지. 전부 같으면 gap | **gap** |
| EXC-07 | P1 | 서버 422 의 `violations` 를 RHF `setError` 로 필드에 꽂고 첫 필드로 포커스한다(`useCrudForm.ts:181-192`). **경로가 실재한다.** **⚠ 이 화면은 body 축이 4개**(필수·길이 / 바이트 / 광고성 / 변수)라 **전부 같은 필드에 꽂히므로 서버가 문구로 갈라야 한다** — 클라이언트가 그렇게 한다(`validation.ts:34,47,59`). **단 서버가 `error.fields` 를 채워야 발현되고**, 400 은 이 경로를 타지 않는다(BE-066 §7.9) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **pass** |
| EXC-11 | P1 | `navigator.onLine` **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 없음 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 구분한다 — `createStoreAdapter.fetchOne` 이 없는 id 에 `HttpError(404)` 를 던지고(`crud.ts:192-194`, 주석 `:183-190` 이 '404 분기가 영원히 발현되지 않았다'는 과거를 기록), `useCrudForm` 이 `isNotFound` 로 `loadFailure` 를 가르며(`:144-149`), `FormPageShell` 이 **404 면 '다시 시도'를 숨기고 문구를 바꾼다**(`:116-144`, `:117-121` '404 는 재시도를 권하지 않는다 — 재시도해도 영원히 없다'). **⚠ 저장소의 `getOne` 은 여전히 status 없는 일반 `Error('SMS 템플릿을 찾을 수 없습니다')` 를 던지나**(`store.ts:71` · spec `:225`) **팩토리가 그 앞에서 `exists(id)` 로 가로채 404 를 낸다**(`crud.ts:192-194`) — store 의 throw 는 도달 불가 경로다 | `?status=detail:404` → 'SMS 템플릿을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만. `?status=detail:500` → '불러오지 못했습니다.' + '다시 시도' + '목록으로'. **두 화면이 같으면 gap** | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — `onMutate`/`setQueryData` 0건. 저장·삭제가 전부 비관적. **위반 표면이 없다** | `onMutate`/`setQueryData` grep 이 0건인지 | **pass** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여준다** — `referenceOf(cause)`(`useCrudForm.ts:195`) → `errorReference` → `FormServerError`(`FormPageShell.tsx:168`). raw stack 노출 없음. **⚠ 폼 저장에만 있다** — 삭제 실패 배너(`useCrudList.tsx:112`)에는 reference 가 없다 | `?status=save:500` → 폼에서 reference code 가 보이는지 | **pass(부분)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-066 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다**(`dev.ts:11`). 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 저장 p95 | ≤ 500ms | 위와 동일 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. **전량 렌더라 건수에 선형 비례**(ERP-15 gap) — **상한이 없다**(BE-066 §7.8) |
| **목록 렌더당 바이트 계산** | 행당 1회 | **미충족 — 행당 2회다.** 유형 열이 `classifySms(byteLengthOf(item.body))`(`SmsTemplateListPage.tsx:56`), 바이트 열이 `byteLengthOf(item.body)`(`:67`)를 **각각** 호출한다. `COLUMNS` 가 모듈 상수라 메모이즈할 자리가 없다. `byteLengthOf` 는 코드포인트 순회(`notification.ts:311-316`) — **2,000자 × 1,000행 = 400만 자**. **형제 중 이 화면만의 비용**(§5 #13) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 명시 — **충족** |
| 검색 입력당 요청 | **0 요청**(클라이언트 필터) + URL replace 1회 | **충족(요청)** / **조건부(연산)** — 커밋마다 전량을 `filterByCategory` + `searchTemplates`(**템플릿명·이벤트명 2축, 본문 제외** — FS-066 §7 #4) 로 훑는다. 250ms 디바운스가 횟수를 지배하나 **건수 상한이 없다** |
| 폼 입력당 연산 | ≤ 1ms | **⚠ 입력마다 4회 파생, `useMemo` 는 1개뿐**: `byteLengthOf`(`SmsTemplateFormPage.tsx:115` — **`useMemo` 없음**) · `classifySms`·`smsByteLimit`(`:116-117` — 파생) · `detectAdWords`(`:120` — **`useMemo` 있음**) · `applyVariableSamples`(**미리보기 — `useMemo` 없이 렌더마다**, `:199`) · zod 검증(`shouldValidate: true` — `:163`). 2,000자 본문에서 타이핑마다 수 회 전체 순회 — **체감 위험은 낮으나 `useMemo` 적용이 비대칭이다**(광고성만 있고 바이트·미리보기엔 없다) |
| 저장 요청 크기 | ≤ 4KB | **충족 — 상한이 구조적이다.** `name` 60자 + `body` **2,000byte** + trigger. **바이트 상한이 곧 요청 크기 상한이다** — 이 화면 고유의 이득 |
| 일괄 삭제 동시 요청 | **상한 없음** | **미충족** — 선택 수만큼 병렬 발사(`useCrudList.tsx:133-134`). **레이트리밋(분당 60)에 걸릴 수 있다**(BE-066 §7.8) |
| 메모리 | 템플릿 전량 + 상세 1건 | **전량 보유. 상한 없음** |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0. `_shared/notification.ts` 는 세 화면이 공유 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:157-164`). 툴바·필터가 남는다 |
| 폼 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass). 단 배너가 화면 전체를 대체해 맥락이 사라진다(FS-066 §7 #22) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 충돌(409, 대상 삭제됨) | 입력 보존 + 충돌 다이얼로그 + 유령 저장 없음 | **충족**(EXC-04 의 ①② 절) |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — last-write-wins**(EXC-04 의 ③ 절 · BE-066 §7.1). **이 화면 최대 정합 위험 — 비용이 걸린다**: 90byte 이하로 줄인 절감이 조용히 되돌아갈 수 있고, 목록이 `updatedAt`·바이트를 보여주므로 덮인 사람은 자기 저장이 살아 있다고 믿는다 |
| 저장/삭제 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| 중복 제출 | 정확히 1요청 | **충족**(EXC-08 pass — 저장 3중 · 삭제는 확인 게이트) |
| **템플릿 삭제로 규칙 무력화** | 삭제 전 경고 또는 서버 거절 | **충족(거절 절) — 뒤집혔다. 이 화면의 사례가 그 수정의 동기였다.** `_shared/store.ts:82-103` 의 `remove` 가 `rulesUsingTemplate(id)` 를 호출해 참조 규칙이 있으면 **`HttpError(409)` 로 거절한다**(`:95-101`). 주석 `:86-90` 이 이 화면의 사례를 그대로 근거로 든다 — '인증번호 템플릿(`ntf-sms-4` · `security.verification-code`)을 지우면 … **로그인이 막힌다**'. 회귀 테스트의 첫 항목이 바로 이것이다: `store.test.ts:70-78` **'인증번호 SMS 템플릿은 지워지지 않는다 — 지우면 로그인이 막힌다'** — 던진 뒤 실제로 남아 있는지까지 단언한다(`:77`). **미충족으로 남은 절**: ① 삭제 *전* 경고 없음(거절은 확인 버튼을 누른 뒤에 온다) ② **화면이 409 문구를 버린다**(§5 #5). BE-066 §7.3 |
| **trigger 변경으로 규칙 오작동** | 참조 규칙이 있으면 거절 | **미충족 — 삭제보다 나쁘다.** 잘못된 SMS 가 **실제로 발송되고 건당 과금된다**. BE-066 §7.3 |
| **바이트 규약이 발송사와 어긋남** | 저장된 것은 언제나 발송 가능 | **미검증.** `byteLengthOf`(`notification.ts:310-317`)는 **실제 EUC-KR 인코딩이 아니라 ASCII 여부만 보는 근사**다. 발송사 카운팅과 어긋나면 **화면은 '89byte SMS' 라 하고 발송사가 LMS 로 과금하거나 거절**한다. **화면은 그 사실을 영영 모른다** — 발송 이력 표면이 없다. BE-066 §7.2 |
| 세션 만료 중 편집 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 폼 입력을 버린다(EXC-19 P1). **단 목록의 필터·검색은 `returnUrl` 쿼리로 복원된다** |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`. **이 화면엔 던질 수 있는 동기 store 호출이 없다** |

### 4.3 비용 · 법적 · 발송 안전 (이 도메인 고유 — quality-bar 밖)

이 화면의 문구는 **고객 휴대폰으로 나가고 건당 과금된다.** quality-bar 는 이 축을 다루지 않으므로 여기서 정한다. 근거는 전부 코드다.

| 요구 | 현재 상태 |
|---|---|
| **운영자가 발송 단가를 알고 문구를 쓴다** | **부분 충족 — 그리고 이 화면 최대 결함이 여기 있다.** ✔ 실시간 바이트 카운터 + 유형 배지 + LMS 승격 안내('**건당 단가가 오릅니다**' — `SmsTemplateFormPage.tsx:181`) ✔ 목록에 유형·바이트 열('LMS 는 건당 단가가 오르는 경계라 목록에서 바로 눈에 띄어야 한다' — `SmsTemplateListPage.tsx:57`) ✘ **카운터가 실제 발송 바이트가 아니다** — 카운터는 **원문 기준**(`#{이름}` = 8byte)이고 미리보기는 **치환 결과**('홍길동' = 6byte)인데 **둘이 만나지 않는다.** 미리보기(FS-066-EL-029)가 바이트를 보여주지 않는다. **바이트가 이 화면의 존재 이유인데 그 숫자가 실제 발송을 대변하지 않는다**(§5 #6) ✘ **변수 삽입이 경고 없이 승격을 일으킨다** — `#{송장번호}` = 14byte. 88byte 본문에서 칩 한 번이 LMS 가 된다(FS-066 §7 #12) ✘ **'초과'와 '승격'의 표현이 겹친다** — 90byte 를 넘으면 `limit` 이 2,000 으로 바뀌어 카운터가 '95 / 2,000 byte' 가 된다 — **한도가 갑자기 22배로 늘어난 것처럼 보인다**(FS-066 §7 #11) ✘ **비용 축으로 정렬·필터할 수 없다**(ERP-04 gap) |
| **정보성 알림에 광고가 섞이지 않는다** | **부분 충족 — 구현이 거칠다.** 2중 방어: 입력 중 warning `Alert`(`SmsTemplateFormPage.tsx:190-194`) + 저장 차단(`validation.ts:38-50`). **그러나** ① **클라이언트에만 있다** — 우회 시 위법 발송(정보통신망법 제50조 · 방통위 가이드라인 — `notification.ts:30-32`). **SMS 는 야간 광고 전송 제한 위반이 명확히 관측되는 채널이라 특히 무겁다.** 서버 재판정 필요(BE-066 §7.4) ② **오탐이 실재한다** — `AD_WORDS` 에 **'이벤트'**(`notification.ts:292`) → 정상 트랜잭션 문구가 차단된다. 단순 `includes`(`:300-301`). **우회 수단이 없다** ③ **미탐이 자명하다** |
| **(광고) 표기·야간 제한·무료수신거부가 없는 것이 옳다** | **충족(의도).** `notification.ts:23-29` 가 조항별 근거를 적고 **'인증번호·보안 알림은 새벽에도 보내야 한다'**(`:27`)를 명시. `validation.ts:3-6` 이 마케팅과의 차이를 축별로 적는다 — 검증에 그 세 검사가 **없는 것이 판정**이다 |
| **미치환 변수가 발송되지 않는다** | **부분 충족.** `unknownVariablesFor`(`notification.ts:269-272`)가 저장 전에 막는다 — '**발송 때 빈칸으로 나가는 사고를 저장 전에 막는다. 마케팅엔 없는 검사다**'(`:265-268`). **그러나** ① 클라이언트에만 있다(BE-066 §7.4) ② `trigger` 를 나중에 바꾸면 저장 시점 정합이 깨진다(BE-066 §7.3) ③ 발송 시점 방어가 없다(범위 밖 — BE-066 §7.11 #5). **빈칸 SMS 도 건당 과금된다** |
| **인증번호 문구가 위조되지 않는다** | **미충족.** `ntf-sms-4`(security.verification-code — `store.ts:206-212`)의 본문을 **누구나 고칠 수 있다**(쓰기 게이팅 부재 — EXC-03 gap). BE-066 §7.7 이 그 위험을 판정한다 — 공식 발신번호로 나가는 문구라 **수신자가 의심하지 않는다.** **⚠ 본문 내용 정책(링크 허용 여부 등)이 코드에 없다 — 미정**(BE-066 §7.11 #9) |
| 문구 변경이 감사 로그에 남는다 | **미충족.** 앱에 `/logs/admin` 화면이 있으나(`nav-config.ts:208`) 이 화면의 쓰기가 거기로 가는 배선이 없다 |
| 쓰기 권한이 조회 권한과 분리된다 | **미충족.** 프론트 게이팅 부재(EXC-03 gap) + 서버 판정(BE-066 §7.7 `admin` 전용)이 화면에 표현되지 않는다 |
| 테스트 발송으로 실물을 확인할 수 있다 | **표면 없음(의도).** 폼에 '테스트 발송' 버튼도 발신번호 필드도 없다 — `SmsTemplateFormPage.tsx:6-7` 이 발신번호를 **마케팅의 축**으로 명시. 미리보기가 표본값 치환으로 대신하나 **실제 발송 바이트·분할 여부는 확인할 수 없다.** BE-066 §7.8 이 범위 밖으로 판정 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | IA-02 | P0 | 폼 sub-route 에 `<h1>` 이 2개('SMS 템플릿' + 'SMS 템플릿 등록') + AppHeader 가 행위를 반영하지 않는다. **가지 폴백은 통합이 해소했다 — 사유가 바뀌었다.** 목록은 pass | **앱 전역**(`AppHeader`·`FormPageShell` title 모델) | 프론트 구현 · UI 기획 (횡단 배치) |
| 2 | IA-04 · ERP-15 · COMP-07 | P0 · P1 · P2 | Pagination 없음 — 전량 렌더. **FS-064 와 달리 상한이 없다.** BE-066 §7.8 이 페이징 + 서버측 필터·검색·건수 + **유형/바이트 정렬**을 판정했다. **이 화면이 형제 중 비용이 가장 크다**(행당 `byteLengthOf` 2회). 9컬럼에 가로 scroll 컨테이너 없음 | 공용 셸 + BE 계약 | 프론트 리팩터 · UI 기획 · 백엔드 명세 (한 배치) |
| 3 | EXC-03 | P0 | write 액션 게이팅 미배선 — `useRouteWritePermissions` 소비처 8곳에 알림 관리 없음. **`operator` 가 인증번호 SMS 문구를 고치고 발송 단가를 올리는 버튼을 본다** | **앱 전역** | UI 기획 쪽 변경 요청 |
| 4 | EXC-04 | P0 | **낙관적 동시성 토큰 부재 — 동시 편집이 last-write-wins.** `updatedAt` 이 목록에 **표시까지 되는데** `If-Match` 로 실리지 않는다. ⚠ **유령 저장·409 UI 는 이미 pass** — gap 은 토큰 절 하나다. **비용 절감이 조용히 되돌아간다** | 공용 어댑터 계약 | 백엔드 명세 (BE-066 §7.1) · 프론트 리팩터 |
| 5 | (§4.2·§4.3) | — | **⚠ 절반이 해소됐다 — 범위가 줄었다.** ① **삭제 — 해소.** `_shared/store.ts:95-101` 이 409 로 거절한다. **인증번호 SMS 템플릿(`ntf-sms-4`) 삭제로 로그인이 막히는 이 화면의 headline 사고는 이제 막힌다** — 주석 `:86-90` 과 회귀 `store.test.ts:70-78` 이 그 사례를 명시적으로 고정한다 ② **삭제 전 경고 — 미해소(경미).** 다이얼로그가 참조 수를 미리 말하지 않아 확인 후에야 안다 ③ **★ 신규 발현 — 화면이 409 문구를 버린다.** `store.ts:95-101` 이 '발송 규칙 N건이 … 규칙에서 먼저 템플릿을 바꾸세요' 를 실어 던지는데 `useCrudList.tsx:112` 가 status 를 분기하지 않고 **'삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 고정**을 보인다 — **영원히 실패할 일에 재시도를 권한다.** 삭제가 막히기 시작하면서 비로소 관측 가능해진 결함 ④ **`trigger` 변경 — 미해소.** `patch`(`store.ts:253-259`)가 무검사 덮어쓰기 — **잘못된 SMS 가 실제 발송된다** | ①② 이 화면 · ③ 공용 셸 + 이 화면 · ④ 이 화면 + FS-064 + BE 계약 | ②③ UI 기획 · **④ 백엔드 명세 (BE-066 §7.3) · UI 기획 (최우선)** |
| 6 | (§4.3) | — | **미리보기가 치환 후 바이트를 보여주지 않는다 — 이 화면의 핵심 결함.** 카운터는 **원문 기준**, 미리보기는 **치환 결과**인데 **둘이 만나지 않는다.** 실제 발송 문구가 90byte 를 넘는지(= 단가가 오르는지) 화면 어디에서도 알 수 없다. **바이트가 이 화면의 존재 이유인데 그 숫자가 실제 발송을 대변하지 않는다.** 변수 삽입이 경고 없이 승격을 일으키는 것(FS-066 §7 #12)과 '초과 vs 승격' 표현 혼동(#11)도 같은 뿌리 | 이 화면 | UI 기획 쪽 변경 요청 (우선) |
| 7 | (§4.3) | — | **광고성 검증이 클라이언트에만 있고 오탐이 실재한다** — `AD_WORDS` 의 **'이벤트'** 가 정상 트랜잭션 문구를 차단한다. 서버 재판정 + 낱말 목록 소유자·판정 방식 결정 필요. **SMS 는 야간 광고 제한 위반이 명확히 관측되는 채널** | 이 화면 + BE 계약 + 도메인 경계 | 백엔드 명세 (BE-066 §7.4) · 아키텍처 |
| 8 | ERP-04 | P1 | **바이트·유형으로 정렬·필터할 수 없다** — 목록이 그 정보를 열로 강조하면서(비용 축) 좁힐 수단을 주지 않는다. 'LMS 인 것만 보기'가 불가능. **이 화면에서 요구가 가장 실재한다** | 공용 셸 + BE 계약 | 프론트 리팩터 · 백엔드 명세 (BE-066 §7.8 — #2 와 한 배치) |
| 9 | COMP-09 (부분) | P2 | **템플릿명 열에 truncate 없음** — `ellipsisCellStyle` 이 그 용도로 있고 **본문 열은 2중으로 쓰는데**(`oneLinePreview` + CSS) 이름 열만 안 쓴다. **한 줄로 해소** | 이 화면 | UI 기획 쪽 변경 요청 |
| 10 | COMP-12 (부분) | P2 | **템플릿명(60자)에 카운터가 없다** — 본문은 카운터가 **두 개**(글자수 + 바이트)인데 이름만 없다. **⚠ 이 요구의 나머지 절은 이 화면이 앱 내에서 가장 정확히 답한다**(counting 기준 명문화 — `notification.ts:361-367`) | 이 화면 + `_shared/TemplateIdentityFields` | UI 기획 쪽 변경 요청 |
| 11 | A11Y-16 (부분) | P1 | **바이트 카운터 행이 live region 이 아니다** — 입력 중 실시간으로 바뀌고 **SMS→LMS 승격(비용 상승)이 announce 되지 않는다**(`SmsTemplateFormPage.tsx:173-185` 에 `aria-live` 0건). 광고성 경고(`:191`)도 마찬가지 | 이 화면 | UI 기획 쪽 변경 요청 |
| 12 | EXC-09 (표면상) | P0 | 일괄 삭제의 `settleAll` 이 abort 를 실패 수에서 제외하지 않는다. **그러나 `onSuccess` 의 aborted 가드(`useCrudList.tsx:137`)가 집계를 통째로 버려 관측되지 않는다** — pass 로 두되 기록 | 공용 `shared/bulk` | 프론트 리팩터 (관측 불가 — 후순위) |
| 13 | (§4.1) | — | **바이트를 행마다 2번 센다** — 유형 열(`:56`)과 바이트 열(`:67`)이 같은 값을 각각 계산한다. `COLUMNS` 가 모듈 상수라 메모이즈할 자리가 없다. 폼도 `useMemo` 적용이 비대칭이다(광고성만 있고 바이트·미리보기엔 없다) | 이 화면 | UI 기획 (경미 — #2 와 함께) |
| 14 | ERP-01 (경미) | P1 | **유형 배지 tone 이 레지스트리가 아니라 인라인 삼항이다** — 목록(`:59`)과 폼(`SmsTemplateFormPage.tsx:175`)이 같은 개념을 다르게 조립한다(폼에만 danger 분기). 차이는 의도이나 레지스트리로 수렴하면 그 판정이 코드로 드러난다 | 이 화면 + `_shared/notification` | UI 기획 (경미) |
| 15 | ERP-09 | P2 | **수정일시의 표시 TZ 정책이 없다** — 다른 TZ 관리자가 다르게 본다. **FS-064 엔 이 표면이 없다** | `shared/format` | 프론트 구현 |
| 16 | COMP-01 · COMP-06 | P1 · P2 | `FormPageShell.tsx:190` 의 손라벨 '저장 중…' · `CrudTable.tsx:144` 의 `length: 5` — **둘 다 공용 셸 소유이며 화면 코드가 아니다** | 공용 셸 | 프론트 리팩터 |
| 17 | EXC-06 | P1 | status 별 surface 미분기 — 400·403·429 가 일반 배너로 뭉개진다. **404 만 갈린다.** 서버가 필드 거절을 422 로 내면 프론트가 이미 옳게 그린다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-066 §7.9) |
| 18 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | 프론트 구현 · UI 기획 |
| 19 | (§4.2) | — | **바이트 규약이 발송사와 어긋날 수 있다** — `byteLengthOf` 는 **실제 EUC-KR 이 아니라 ASCII 여부만 보는 근사**다. 서버 재판정 + 규약 동기화 방식 결정 필요. **어긋나면 저장은 되고 발송이 거절되며 화면은 영영 모른다**(발송 이력 표면 부재) | 이 화면 + BE 계약 + 도메인 경계 | 백엔드 명세 (BE-066 §7.2) · 아키텍처 |
| 20 | (§4.3) | — | 문구 변경의 감사 로그 부재 — **인증번호 SMS 문구 변경이 기록되지 않는다** | BE 계약 | 백엔드 명세 (BE-066 §7.7 과 연동) |
| 21 | (BE-066 §7.6) | — | **트리거·변수 카탈로그 소유자 미정** — 이 화면은 카탈로그를 **세 곳**(삽입 칩·미리보기 표본값·검증)에서 쓴다. **SMS 고유 무게**: 표본값의 정확도가 곧 비용 예측의 정확도다(90byte 경계). 서버 소유가 되면 `TemplateIdentityFields`·`VariableInsertBar` 가 `useQuery` 를 배선해야 한다(**이 화면의 유일한 화면코드 변경 요인**) | 도메인 경계 | 아키텍처 · 백엔드 명세 |
| 22 | (§4.1) | — | 일괄 삭제의 **선택 수 상한이 없어** 레이트리밋(분당 60)에 걸릴 수 있다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 |
| 23 | (BE-066 §7.11 #9) | — | **본문 내용 정책(링크 허용 여부)·발신번호 검증이 코드에 없다 — 미정.** 인증번호 SMS 에 링크를 넣는 것을 막을 근거가 없다 | 도메인 경계 | 아키텍처 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 시점의 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`smsTemplateAdapter` 는 `createStoreAdapter({ scope: SMS_TEMPLATE_RESOURCE, … })`(`data-source.ts:21-22`)이고 `SMS_TEMPLATE_RESOURCE = 'notification-sms-templates'`(`:16`)다. 팩토리가 부르는 op 는 **4개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:176`) | `?fail=list` · `?fail=notification-sms-templates:list` · `?fail=all` |
| `detail` | `fetchOne` (`:181`) | `?fail=detail` · `?fail=notification-sms-templates:detail` · `?fail=all` |
| `save` | `create` (`:199`) **와** `update` (`:207`) — **둘이 같은 op 를 쓴다** | `?fail=save` · `?fail=notification-sms-templates:save` · `?fail=all` |
| `delete` | `remove` (`:228`) | `?fail=delete` · `?fail=notification-sms-templates:delete` · `?fail=all` |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 **분류 필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:14-71`) — 재현 가능한 status **9종**(`dev.ts:27-37`): 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

| 판정 | 재현 |
|---|---|
| EXC-12 (404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 ①② (409 conflict) | `?status=save:409` — **충돌 다이얼로그가 입력을 보존한 채 뜨면 pass**(현재 pass) |
| EXC-04 ③ (토큰) | **스위치로 재현 불가** — `grep -rn "If-Match\|ETag" apps/admin/src` = 0건으로 판정. 동시 편집은 두 탭 수동 재현 |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 EXC-06 gap. 버튼이 애초에 보이면 EXC-03 gap |
| EXC-06 (status별 surface) | `?status=save:400` · `save:403` · `save:429` · `save:500` — 전부 같은 배너면 gap |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼 배너에 reference 가 보이면 pass. 삭제 배너엔 없다 |
| EXC-07 (422 필드) | `?status=save:422` — **`HttpError` 의 `violations` 가 비어 있으면 배너로 떨어진다**(`useCrudForm.ts:182`). `dev.ts` 는 `violations` 를 채우지 않으므로 **이 스위치만으로는 필드 인라인을 재현할 수 없다** |
| **`TEMPLATE_IN_USE`(BE-066 §7.3)** | **⚠ 이제 스위치 없이 재현된다 — 저장소가 실제로 던진다.** 발송 규칙이 쓰는 템플릿(예 `ntf-sms-4` — `ntf-rule-7` 이 참조)의 행 삭제를 시도하면 `store.ts:95-101` 이 `HttpError(409, '발송 규칙 1건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다. 규칙에서 먼저 템플릿을 바꾸세요.')` 를 던진다. **다만 화면이 그 문구를 보여주지 않는다** — `useCrudList.tsx:112` 가 status 를 분기하지 않고 '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' 고정을 보인다. **즉 저장소 판정은 정확한데 안내가 틀렸다** — EXC-06 gap 의 이 화면 실례다(§5 #5 ③). 아무도 안 쓰는 템플릿(`ntf-sms-5`)은 그대로 삭제된다 — `store.test.ts:93-97` 이 그 대비를 고정 |
| **바이트 경계(COMP-12)** | **스위치가 필요 없다** — 폼에 한글 45자('가'.repeat(45)) 입력 → '90 / 90 byte' + SMS. 46자 → LMS + 승격 안내. 1,001자 → danger + 저장 차단. **픽스처 `ntf-sms-3` 이 이미 LMS 표본이다**(`store.ts:181-182,199-205` — '일부러 90byte 를 넘겨 LMS 로 승격되는 표본… 폼의 바이트 카운터·승격 안내가 실제로 걸리는지 눈으로 확인할 수 있게 둔다') |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-03 · COMP-09 · EXC-04③ · EXC-05 · EXC-11 · ERP-13 · A11Y-12 판정) · RTL(A11Y-11 의 describedby↔alert id 일치 · **required 컨트롤의 `aria-required` 는 런타임 주입이라 grep 으로 판정 불가** — GROUND-TRUTH §1) · 기존 테스트:
- **`sms-templates/sms-templates.test.ts`(78줄)** — 스키마 회귀. **이 화면의 핵심 계약 3개를 고정한다**: ① **ERP-13** — `:27-31` '템플릿명이 비면 막는다 — 조사는 받침에 맞춘다(ERP-13)' 가 `expect(message).toBe('템플릿명을 입력하세요.')` + **`expect(message).not.toContain('을(를)')`** 를 단언하고 `:33-35` 가 `'본문을 입력하세요.'` 를 단언 ② **바이트 vs 글자수** — `:43-48` '**제약은 글자수가 아니라 바이트다** — 2,000자 영문(2,000byte)은 통과한다' 가 `'a'.repeat(2000)` 통과 + `'가'.repeat(2000)` 차단을 단언(주석: '글자수 cap 을 1,000 으로 잡으면 적법한 영문 본문이 이유 없이 막힌다(회귀 방지)') ③ **90byte 는 차단이 아니다** — `:50-52` '**90byte 를 넘어도 LMS 로 승격될 뿐 저장은 막지 않는다**' 가 `'가'.repeat(100)` 통과를 단언. 그 밖에 LMS 한도 초과 차단(`:37-41`) · 광고성 차단 + '마케팅 관리' 안내(`:54-61`) · 변수 종속(`:63-77`)
- **`_shared/notification.test.ts`(213줄)** — **바이트 판정의 회귀 방어선**: `:104-129` '바이트 · SMS/LMS 자동 판정 — COMP-12' 가 한글 2byte/ASCII 1byte(`:105-110`) · 90byte 경계 승격(`:112-117`) · 유형별 한도(`:119-122`) · **'한글 45자면 이미 SMS 한도다 — 글자수와 바이트는 다른 축이다'**(`:124-129`)를 단언. 그 밖에 트리거·변수·광고성·필터/검색/정렬·중복 규칙
- **`_shared/store.test.ts`(98줄)** — 템플릿 후보·템플릿명·`rulesUsingTemplate`·정렬. **⚠ 이 파일이 커졌고 이 화면의 판정을 뒤집었다**: describe **'템플릿 삭제 — 쓰는 규칙이 있으면 막는다'**(`:69-98`)의 첫 항목이 **`:70-78` '인증번호 SMS 템플릿은 지워지지 않는다 — 지우면 로그인이 막힌다'**(`ntf-sms-4`) 로, **이 화면의 headline 사고를 직접 고정한다**(던진 뒤 잔존까지 단언 — `:77`). 이어 `:80-91` 409 status·문구 · `:93-97` 미참조 템플릿(`ntf-sms-5`)은 그대로 삭제. **이전 기준의 '프로덕션 소비처가 없는 함수를 테스트만 지킨다'는 서술은 낡았다** — `store.ts:95` 가 부른다
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
- [x] **A11Y-11 을 자식 타입으로 판정**했다 — required FormField 자식이 전부 `input`/`SelectField`/`textarea` 라 `aria-required` 가 주입된다. **grep 수치로 판정하지 않았다**(GROUND-TRUTH §1)
- [x] **COMP-12 를 이 화면의 고유 축(바이트)으로 정확히 판정**했다 — counting 기준 명문화(`notification.ts:361-367`)가 **요구가 요구한 'code point vs byte' 결정에 답하는 앱 내 유일한 곳**임을 적고, 미충족 절(템플릿명 카운터 · 서버 일치 · **치환 후 바이트**)을 분리했다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·금액·CSV·인라인 토글·제목 필드)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`notification-sms-templates`)와 op 4종을 **팩토리 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] **'E2E 미실행 — 근거는 코드 대조' 와 기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 과 §6 에 명시했다. **뒤집힌 판정 2건(§4.2 삭제 무결성 · MOTION-03 근거)을 §1 에 열거**했고 **P0 건수는 불변**임을 확인했다
- [x] §5 의 gap 이 FS-066 §7 · BE-066 §7.11 과 일치한다
- [x] **실재 결함을 기록했다** — ① **`a5c2639` 기준으로 '인증번호 SMS 삭제가 로그인을 막는다'는 해소됐다**(`store.ts:95-101` 409 · 회귀 `store.test.ts:70-78`). 남은 것으로 좁혔다: 삭제 전 경고 부재 · **화면이 409 문구를 버림**(신규 발현) · `trigger` 변경 무방비(§5 #5) ② **미리보기가 치환 후 바이트를 안 보여준다 — 이 화면의 핵심 결함**(§5 #6) ③ `AD_WORDS` 의 '이벤트' 오탐(§5 #7) ④ **바이트를 행마다 2번 센다**(§5 #13) ⑤ 유형 tone 이 인라인 삼항(§5 #14). 전부 코드/grep 으로 확인
- [x] **NFR-036(마케팅) 판정이 F2 기준이라 낡았음**을 §2.1 각주에 기록했다
</content>
