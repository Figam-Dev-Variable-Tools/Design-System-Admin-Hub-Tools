---
id: NFR-034
title: "SMS 발송 비기능 명세"
functionalSpec: FS-034
backendSpec: BE-034
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-034. SMS 발송 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-034 SMS 발송 (`/marketing/sms` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30). **이 문서는 그 요구 문구를 복제하지 않고 ID 로만 참조한다** |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용 판정**이다. '요구가 무엇인가'가 아니라 '**이 화면에서 어떻게 충족되는가 · 무엇을 재현하면 판정되는가**'만 쓴다 |
| 함께 읽는 문서 | FS-034(요소·예외) · BE-034(엔드포인트·보안 판정). 세 문서의 gap 은 FS-034 §7 ↔ BE-034 §7.12 ↔ 이 문서 §5 에서 일치한다 |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 **판정만** 다시 매긴다. 요구 문구를 이 문서에 옮겨 적지 않는다 — 두 벌이 되면 어느 쪽이 정본인지 알 수 없다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었다. **이번 기준 갱신으로 P0 4건이 뒤집혔다 — gap 7 → 3**: **A11Y-11**(gap → **pass** — PR #30 이 `SegmentPicker` 의 required 를 묶음 접근성 이름으로 잇는다, `SegmentPicker.tsx:129-131`) · **MOTION-01·02**(gap → **종속** — PR #26 이 Modal/Toast enter·exit 을 CSS-only 로 구현, `Modal.css:126-168` · `Toast.css:32-37,121-131`) · **MOTION-03**(gap → **종속** — `ToggleSwitch.css:79-84` 에 reduced-motion 게이트가 실재하게 됐다). **ERP-09 는 gap 그대로다** — 예약 시각 해석이 여전히 브라우저 로컬이다(§3 · §5). **IA-02 · IA-04 · EXC-03 도 gap 그대로다**(§2 · §5). **E2E 미실행 — 판정 근거는 전부 코드 대조다** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

> **`상속` 인데 `gap` 인 경우**: 표기 규약상 `상속`은 보통 `종속`으로 끝난다. 그러나 **이 화면이 렌더하는 바로 그 표면에서 DS 계약이 깨져 있음을 코드로 확인한 경우**에는 `gap` 으로 적고 §5 에 **범위=앱 전역(DS)** 으로 이관한다 — 소유가 DS 라는 사실이 미충족을 pass 로 만들지는 않기 때문이다.
>
> **`a5c2639` 기준 — 이 예외에 해당하는 행이 0건이 됐다.** MOTION-01/02/03 이 그랬으나 PR #26 이 셋의 근거를 전부 해소해(`Modal.css:126-168` · `Toast.css:32-37,121-131` · `ToggleSwitch.css:79-84`) **`종속` 으로 되돌렸다**. ⚠ **MOTION-01 에는 판단 여지가 하나 남는다** — 모션은 실재하나 **CSS-only** 이고 요구문은 `AnimatePresence` 를 명시한다. 기능은 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성되므로 **라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 몫**이며, 이 화면은 소비자라 그 판정을 대신 내리지 않는다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 목록이 `useCrudList` 를 소비하고(`SmsListPage.tsx:126-131`) 스켈레톤 조건이 `firstLoading = isFetching && data === undefined` 로 파생된다(`useCrudList.tsx:71-72`). `CrudListShell` 이 그 값만 `CrudTable.loading` 으로 넘긴다(`CrudListShell.tsx:137`). 재조회는 `refreshing`(`useCrudList.tsx:72`)으로 갈려 표를 비우지 않고 요약에 '새로고침 중…'만 붙는다(`CrudListShell.tsx:118-122`). 0행 empty·조회 실패 배너도 서로 배타적이다(`CrudListShell.tsx:113,153-165`) | `/marketing/sms` 진입 → 최초 400ms 동안 5행 스켈레톤만(빈 상태 문구 없음). 상태 필터를 바꿔 0행 → Empty 만. `?fail=marketing-sms:list` → danger Alert 만. 목록이 있는 상태에서 `refetch` → 표가 스켈레톤/공백으로 바뀌지 않는다 | pass |
| STATE-02 | STATE | 직접 | 목록 조회 실패는 `CrudListShell.tsx:156-165` 의 인라인 `Alert tone="danger"` + '다시 시도'(`refetch`)로만 표현된다 — 토스트도, 빈 상태 폴백도 없다. 폼의 상세 조회 실패도 같은 규칙(`SmsFormPage.tsx:226-248`) | `?fail=marketing-sms:list` → 인라인 danger Alert + '다시 시도'가 쿼리를 재발행. `?fail=marketing-sms:detail` + `/marketing/sms/sms-1/edit` → 폼 대신 Alert. 두 경우 모두 error 토스트가 뜨지 않는다 | pass |
| STATE-04 | STATE | 직접 | (b) 선택 해제: 검색어·상태 필터가 바뀌면 `useEffect` 가 `clear()` 한다(`SmsListPage.tsx:135-137`) — **커밋된** 키워드에 반응한다. (a) page clamp: **이 화면에 페이지네이션이 없어**(FS-034-EL-007 · IA-04 gap) 범위를 벗어날 page 자체가 존재하지 않는다 — 요구의 그 절은 표면 부재로 성립하지 않는다 | 행 3건 선택 → 상태 필터를 '초안'으로 변경 → SelectionBar 가 사라진다(선택 0). 검색어 입력에도 동일 | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 모듈의 모든 시각 값이 `var(--tds-*)` 다 — `SmsListPage.tsx` · `SmsFormPage.tsx` · `PhoneMessagePreview.tsx` · `SmsMessageCard.tsx` · `_shared/{SegmentPicker,VariableInsertBar}.tsx` 전수 grep 에서 primitive 밖 hex 0건 · px 리터럴 0건 · border/outline 키워드 0건. **⚠ PR #32 가 이 화면에서 고친 것은 다른 축이다 — 참조한 토큰이 실재하지 않았다.** `PhoneMessagePreview.tsx` 가 정의되지 않은 CSS 변수 3개를 참조하고 있었고(`:30` `border-strong` → **`border-default`** · `:32`·`:68` `surface-sunken` → **`surface-raised`**) 지금은 전부 실재 토큰이다. 미정의였던 토큰 경로는 **`color.border.strong` · `color.surface.sunken` 2종**(앱 전체로는 `typography.title.sm.*` 를 포함해 3종 / CSS var 이름 6개 — 이 화면 몫은 앞의 2종). `title` 티어는 `md` 부터 시작하며 `title.sm` 은 존재하지 않는다(`tokens.css:186-189`). **이 축을 지키는 가드가 신설됐다** — `apps/admin/src/shared/token-guard.test.ts:208-268` 이 `packages/ui/generated/tokens/tokens.css`(`:33`, 파싱 `:211-213`)를 정본 삼아 `apps/admin/src`(`:29`) 의 `.css` **와 `.ts`/`.tsx`** 를 재귀 스캔해 미정의 토큰 참조를 잡는다(11 tests pass · 위반 0건). ⚠ 범위 주의(`token-guard.test.ts:12-15`): **값 가드(hex/px)는 여전히 `.css` 만** 스캔하고 이번에 `.tsx` 로 넓힌 것은 **참조 가드뿐**이다 — 다만 `.tsx` 의 hex/px 리터럴은 ESLint 가 독립적으로 덮는다(`apps/admin/eslint.config.js:26-46`, 적용 `:136-139`). `PhoneMessagePreview.tsx:31` 의 `radius.lg`→`radius.xl` 은 **미정의 토큰 수정이 아니라 취향 변경**이다(`radius.lg` 는 실재한다) | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|(outline\|border):\s*(thin\|medium\|thick)" apps/admin/src/pages/marketing/{sms,_shared}` → 0건(`#{변수}` 토큰 제외). `npx vitest run src/shared/token-guard.test.ts` → **11 passed · 위반 0**. `npx eslint src` → 0 error. `grep -rn "surface-sunken\|border-strong" apps/admin/src/pages/marketing/sms` → **0건** | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 요소가 DS 의 `tds-ui-focusable` 클래스를 소비한다 — 본문 textarea·발신번호 select·치환변수 칩(`VariableInsertBar.tsx:61`)·'목록으로' 버튼(`SmsFormPage.tsx:254`)·예약 일시 입력(`SmsFormPage.tsx:379`). ring 두께의 정본은 DS 이며 이 화면은 값을 재선언하지 않는다 | DS/`app-shell.css` 소유 문서의 판정을 따른다. 이 화면에서는 '자체 focus ring 선언 0건'만 확인한다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면이 렌더하는 애니메이션 표면은 DS 소유뿐이다 — Toast(삭제 성공·저장 성공)와 ToggleSwitch transition(`ToggleSwitch.css:32,56` — 둘 다 `:79-84` 의 reduced-motion 게이트가 끈다). easing 토큰을 이 화면 코드가 직접 참조하는 곳은 0건이다. Toast 의 enter/exit easing 은 `component.overlay` recipe 가 준다(`tokens/tokens.json:1286-1308`) | tokens codegen · `Toast.css` 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면이 floating/overlay surface 를 렌더한다 — `Card`(발송 정보·수신자·메시지·예약·미리보기 5개) · `ConfirmDialog`→`Modal`(삭제·충돌·미저장 가드) · Toast. 그림자 값을 이 화면이 선언하지 않는다 | `tokens.json` · `Card.css` · `Modal.css` 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 폼 제목이 DS 의 `pageTitleStyle` 을 소비한다(`SmsFormPage.tsx:263`) — 값을 손으로 재현하지 않는다. AppHeader 의 `<h1>` 도 같은 토큰(`AppHeader.tsx:101`) | `styles.ts`/tokens 소유 문서의 판정을 따른다. 이 화면에서는 'titleStyle 재선언 0건'만 확인한다 | 종속 |
| COMP-10 | COMP | **직접** | **F3b 에서 뒤집혔다 — 이제 소비한다.** `SmsListPage.tsx:117` 이 `useListState({ filterDefaults })` 를 쓰고, 그것이 내부에서 `useDebouncedSearch({ initial: keyword, onCommit: commitKeyword })` 를 배선한다(`useListState.ts:24,227-230`). 화면은 `list.searchInput`/`list.setSearchInput` 을 값에, **`{...list.searchInputProps}` 를 `SearchField` 에 스프레드**한다(`SmsListPage.tsx:144-152`). 요구의 3개 절이 전부 닫혔다: ① **조합 중 커밋 금지** — `useDebouncedSearch.ts:87` 이 `composing` 이면 effect 를 즉시 반환하고, `:121-124` 가 조합 중 Enter 를 `stopPropagation` 한다(`nativeEvent.isComposing` **과** 자체 관측 ref 를 함께 본다 — 합성 이벤트에서 `isComposing` 이 누락되는 구멍을 자기 관측으로 메운다) ② **디바운스 + 최소 길이** — `:23` `DEBOUNCE_MS = 250`, `:91` `minLength` 게이트(빈 문자열은 '검색 해제'라 언제나 통과) ③ **stale 응답** — react-query 가 키워드를 쿼리 키에 넣어 이미 닫혀 있다(`:14-18` 이 그 이유를 명시하고 손수 취소 로직을 만들지 않는 근거를 댄다) | 검색창에 '홍길동'을 IME 로 입력 → 'ㅎ'·'호'·'홍' 단계에서 커밋 **0건**, 조합 확정 후 250ms 잠잠하면 **1회** 커밋 → `?q=홍길동`. 조합 중 Enter → 부분 문자열 '홍길ㄷ' 커밋 0건. `clear()` 는 **커밋된** keyword 가 바뀔 때만 돈다(`SmsListPage.tsx:135-137`). **앱 grep 주의**: `SmsListPage.tsx` 에 `useDebouncedSearch` 직접 import 는 0건 — 소비는 `useListState` 경유이므로 grep 수치로 판정하지 말 것 | **pass** |
| FEEDBACK-02 | FEEDBACK | 상속 | 파괴적 액션(단건·일괄 삭제)이 `useCrudList` 의 `ConfirmDialog intent="delete"` 로 게이트된다(`useCrudList.tsx:152-179`). busy 중 확인 버튼 `disabled + aria-busy`(`ConfirmDialog.tsx:151`), 실패 시 다이얼로그 유지 + danger 배너(`useCrudList.tsx:110-114`), 취소·Esc·dim 은 in-flight 를 abort 하고 pending 을 리셋한다(`useCrudList.tsx:86-92,118-124`) | `?fail=marketing-sms:delete` → 행 삭제 확인 → 다이얼로그가 열린 채 배너, 재클릭이 재시도. 요청 중 취소 → 토스트 없이 버튼 상태 복원. 판정 정본은 `ConfirmDialog`/`useCrudList` 소유 문서 | 종속 |
| FEEDBACK-04 | FEEDBACK | 직접 | 폼이 `useUnsavedChangesDialog(isDirty && !saving, …)` 를 배선한다(`SmsFormPage.tsx:193`, 문구 `:50-51`). 훅이 3경로를 모두 덮는다 — `beforeunload`(`useUnsavedChangesDialog.tsx:127`) · capture 단계 링크 클릭 가로채기(`:151`) · `popstate`(`:178`). 저장 성공 시 `isDirty` 가 내려가고 replace 이동이라 가드가 발화하지 않는다 | `/marketing/sms/new` 에서 발송명 입력 → ① 탭 닫기 ② 사이드바 '이메일 발송' 클릭 ③ 브라우저 Back → 각각 discard 확인. 저장 성공 후 같은 이동은 프롬프트 없이 통과 | pass |
| FEEDBACK-06 | FEEDBACK | **N/A** | **편집 가능한 폼을 담은 modal 이 이 화면에 없다.** 등록·수정은 전용 라우트(`/new`·`/:id/edit`)의 **페이지 폼**이고(IA-06 의 rich 엔티티 규칙), 이 화면의 modal 3종은 전부 폼이 아니다 — 삭제 확인(`ConfirmDialog`) · 충돌 다이얼로그(`FormConflictDialog`) · 미저장 가드. 입력 필드를 담은 modal 이 없으므로 'modal dirty close 가드' 의 대상이 성립하지 않는다. 페이지 폼의 이탈 가드는 FEEDBACK-04 가 덮는다 | — (표면 부재) | N/A |
| A11Y-01 | A11Y | 상속 | 이 화면이 토스트를 띄운다 — 삭제 성공(`useCrudList.tsx:108,146`) · 저장 성공(`useCrudForm.ts:222`). `ToastProvider` 가 **항상 마운트된** polite/assertive 리전을 소유하고 텍스트만 주입한다(`ToastProvider.tsx:165,168`) — Toast 자신은 `role`/`aria-live` 를 갖지 않는다 | `ToastProvider` 소유 문서의 판정을 따른다. 이 화면에서는 '토스트 표면이 실재한다'는 사실만 못 박는다 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 다이얼로그가 전부 `ConfirmDialog` 를 거치고, 그것이 `describedBy={messageId}` 로 본문을 연결한다(`ConfirmDialog.tsx:135`) → `Modal` 이 `aria-describedby` 로 배선한다(`Modal.tsx:158`) | `Modal`/`ConfirmDialog` 소유 문서의 판정을 따른다. 이 화면 표면: 삭제 확인 · 충돌 다이얼로그 · 미저장 가드 | 종속 |
| A11Y-11 | A11Y | **직접** | **부분 충족.** 짝 없는 `aria-invalid` 는 0건이다 — 발송명(`SmsFormPage.tsx:286-287`)·예약 일시(`:382-385`)가 `aria-invalid` + `aria-describedby={errorIdOf(...)}` 를 함께 싣고, 본문은 `TextareaField` 가 자동 배선하며(`TextareaField.tsx`), 발신번호는 `SelectField isInvalid`(`:301`)가 담당한다. **PR #30 에서 마지막 구멍이 닫혔다 — 이제 pass 다.** `FormField` 를 거치는 required 필드는 F3a 의 `withAriaRequired` 런타임 주입(`FormField.tsx:50-56`, 주입 `:107`, 대상 판별 `isRequirableChild` `:38-41`)으로 전부 덮인다(발송명 `<input>` `:278` · 발신번호 `<SelectField>` `:298` · 발송 방식 `<SelectField>` `:364` · 예약 일시 `<input>` `:376`; 본문은 `TextareaField.tsx:64-65` 가 자기 것을 낸다). **남아 있던 유일한 결함은 `SegmentPicker` 였고 PR #30 이 그것을 고쳤다** — 묶음이 `role="group"`(`SegmentPicker.tsx:129`) · `aria-label={`${label}${required ? ' (필수)' : ''}`}`(`:130`) · `aria-describedby={noteId}`(`:131`, `useId` `:106` → 대상 수 안내 `<p id={noteId}>` `:160` / 오류 `<p id={noteId} role="alert">` `:156`)를 싣는다. **체크박스별 `aria-required` 를 붙이지 않은 것은 의도이며 그것이 옳다**(근거 `:7-15`): 이 필드의 required 는 '최소 한 개를 고르라'는 **묶음 수준** 요구라 개별 체크박스에 붙이면 AT 가 '이 세그먼트를 반드시 체크해야 한다'로 읽는 **거짓말**이 되고, `aria-required` 는 `role=group` 미지원 속성(ARIA 1.2)이라 **접근가능 이름이 유일하게 정직한 경로**다. 짝 없는 `aria-invalid` 0건 · 짝 없는 오류 `<p>` 0건 — 이 화면 자체의 `role="alert"` 는 0건이고(grep) 세그먼트 오류는 `_shared` 가 `aria-describedby` 로 잇는다. `ToggleSwitch` 2개(광고성·이미지 첨부)는 **검증 대상이 아니라** 오류 `<p>` 가 없다 — 짝 없는 설명이 생기지 않는다(이메일의 수신거부 토글과 갈리는 지점 — NFR-035 §2 A11Y-11 은 그 때문에 gap 이다) | ① `grep -rn "aria-invalid" apps/admin/src/pages/marketing/sms` → 3건 전부 `aria-describedby` 동반. ② `grep -rn 'role="alert"' apps/admin/src/pages/marketing/sms` → **0건**(짝 지을 오류 노드가 이 화면에 없다). ③ `/marketing/sms/new` 에서 세그먼트 미선택으로 제출 → 묶음의 접근성 이름이 '수신자 세그먼트 (필수)' 로 읽히고 `aria-describedby` 가 오류 `<p>` 를 가리킨다. `SegmentPicker.test.tsx` 가 고정한다: `:37` 'required 면 묶음의 접근성 이름이 필수임을 밝힌다' · `:48` '개별 체크박스에는 aria-required 를 붙이지 않는다 — 어느 한 개도 필수가 아니다' · `:55` '묶음이 대상 수 안내를 aria-describedby 로 잇는다 — 짝 없는 설명을 남기지 않는다' · `:64` '오류가 있으면 묶음의 설명이 그 오류를 가리킨다'. ④ **`aria-required` 를 앱 소스에서 grep 하지 말 것** — 주입이 런타임 `cloneElement` 라 소스에 나타나지 않는다. 렌더 후 `document.querySelectorAll('[aria-required="true"]')` 로 확인해야 한다 | **pass** |
| A11Y-12 | A11Y | **N/A** | **좌측 필터 list item 이 이 화면에 없다.** 상태 필터가 `SelectField` 드롭다운이고(`SmsListPage.tsx:153-166`) 필터 사이드바·토글 버튼 목록이 없다. `aria-pressed`/`aria-current` 를 쓸 toggle 필터 표면이 존재하지 않는다 | `grep -rn "aria-current\|aria-pressed" apps/admin/src/pages/marketing/sms` → 0건(표면 부재) | N/A |
| MOTION-01 | MOTION | 상속 | **PR #26 에서 뒤집혔다 — 모션이 실재한다.** 이 화면이 Modal 표면을 렌더한다(삭제 확인 · 일괄 삭제 · 충돌 다이얼로그 · 미저장 가드). 이전 판정의 근거였던 '전환 없이 즉시 pop in/out' 은 **더 이상 사실이 아니다**: backdrop fade(`Modal.css:20-21`→`@keyframes tds-modal-backdrop-in :126-134`, exit `:30-33`→`tds-modal-backdrop-out :136-144`) + dialog scale 0.96→1(`:58-59`→`tds-modal-dialog-in :146-156`, exit `:35-38`→`tds-modal-dialog-out :158-168`, `forwards`), reduced-motion 게이트 `:173-180`. **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고(`package.json` 19개·import·lockfile 전부 0건), 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`, keyframe 상수 `:43` `'tds-modal-dialog-out'`)로 **동등 달성**한다. **라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 몫이다** — 이 화면은 소비자다. ⚠ 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 여전히 즉시 언마운트**된다(`Modal.tsx:27-31` — 조립하는 쪽 버튼이라 호출부 콜백 직행) | DS 소유 문서 판정. 이 화면에서는 삭제 확인을 열고 닫을 때 backdrop fade + dialog scale 이 보이는지, reduced-motion 에서 즉시 등장/제거되는지만 확인 | 종속 |
| MOTION-02 | MOTION | 상속 | **PR #26 에서 뒤집혔다 — exit 애니메이션이 완전 구현됐다.** 이 화면이 토스트를 띄운다(삭제·저장 성공). 이전 판정의 근거였던 'dismiss 가 즉시 filter-out 으로 끊긴다' 는 **더 이상 사실이 아니다**: `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`), keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), enter `:26-27`/`:109-119`, reduced-motion 게이트 `:136-141`. **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족한다** — `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`component.overlay` recipe, `tokens/tokens.json:1298-1307`). Modal 과 동일 아키텍처(CSS 클래스 토글 + 네이티브 `onAnimationEnd`), 라이브러리 없음 | DS 소유 문서 판정. 이 화면에서는 SMS 발송 저장 성공 토스트의 auto-dismiss 가 fade + translateY 를 보이는지만 확인 | 종속 |
| MOTION-03 | MOTION | 상속 | **PR #26 에서 뒤집혔다 — 게이트가 실재한다.** 이 화면이 `ToggleSwitch` 를 **2개** 렌더한다 — 광고성 여부(`SmsFormPage.tsx:329-338`) · 이미지 첨부(`SmsMessageCard.tsx:110-119`). quality-bar MOTION-03 이 직접 지목했던 위반('`ToggleSwitch.css:56` `transition: transform` 에 reduced-motion off 없음')은 **해소됐다** — `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }` 로 남은 transition 2건(`:32` background-color · `:56` transform)을 **둘 다 끈다**. 주석 `:76-78` 의 논거: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향하고, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환 제거 시 정보 손실이 0 이다 — 즉시 최종 위치로 스냅한다. Modal·Toast 도 각자 게이트를 갖는다(`Modal.css:173-180` · `Toast.css:136-141`) | DS 소유 문서 판정. 이 화면에서는 `prefers-reduced-motion: reduce` 를 켜고 광고성 토글을 조작해 handle 이 **미끄러지지 않고 스냅**하는지만 확인 | 종속 |
| IA-01 | IA | 상속 | 이 화면의 3개 라우트가 전부 `APP_ROUTES` 에 등재돼(`App.tsx:280-282`) `RequireAuth` → `AppShell` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:324-330`). 자체 sidebar/top bar/outer frame 를 도입하지 않는다 — 화면은 `<div>` 스택으로만 시작한다(`SmsListPage.tsx:154` · `SmsFormPage.tsx:251`) | `App.tsx` 소유 문서의 판정을 따른다. 이 화면에서는 '자체 frame 0건'만 확인한다 | 종속 |
| IA-02 | IA | **직접** | **통합에서 절반이 해소됐다 — 사유가 바뀌었고 판정은 유지된다.** ① **해소** — 브랜치 폴백이 사라졌다. `nav-config.ts:260-278` `findCoveringLeaf` 가 '자기를 감싸는 **가장 긴 잎**'을 세그먼트 경계(`covers()` — `:255-257`)로 찾고 `:297-299` `findNavLabel` 이 그것을 쓴다. `findNavLabel('/marketing/sms/new')` 는 이제 **'SMS 발송'** 을 반환한다(≠ 예전의 '마케팅 관리'). 요구가 금지한 'sub-route 의 branch label 노출'은 **더 이상 성립하지 않는다**. **목록(`/marketing/sms`)은 잎이고 in-content h1 이 없어 h1 이 정확히 1개 — 그 축은 pass** ② **잔여 gap (폼 라우트)** — **`<h1>` 이 여전히 둘이다**: `AppHeader.tsx:101` + `SmsFormPage.tsx:263`(`{isEdit ? 'SMS 발송 수정' : 'SMS 발송 등록'}` — 이 화면은 `FormPageShell` 을 쓰지 않고 자기 셸을 그리므로 h1 도 자기가 그린다). 게다가 `nav-config.ts:294-296` 이 **'등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아** 상단 h1 은 `/new` 와 `/:id/edit` 에서 똑같이 'SMS 발송' 이다 — 스크린리더 사용자는 상단 제목만으로 등록인지 수정인지 알 수 없다. quality-bar IA-02 의 '단일 title 메커니즘' 미충족 | `/marketing/sms` → `document.querySelectorAll('h1').length === 1`, 'SMS 발송' ✓. `/marketing/sms/new` → **`length === 2`**, `[0]` = 'SMS 발송'(브랜치 아님 ✓ · 행위 미반영 ✗), `[1]` = 'SMS 발송 등록'. `nav-config.test.ts:16-40` 이 `/company/history/new` → '연혁' 으로 잎 해석을 고정한다 | **gap** (잎 목록 축 pass · 폼 라우트 h1 이중 축 미충족) |
| IA-04 | IA | **직접** | **부분 충족.** 템플릿의 앞 4단은 지킨다 — toolbar(좌측 검색+필터 / **우상단 'SMS 발송 등록'** `SmsListPage.tsx:142-172`) → 결과 count 요약(`CrudListShell.tsx:115-123`) → SelectionBar(`:125-133`) → table(`:135-154`). **마지막 단인 Pagination 이 없다**: `CrudListShell` 이 페이지네이션을 렌더하지 않고 `marketing/**` 전역에 `Pagination` 참조가 0건이다(`useListState` 가 `page`·`clampPage` 를 이미 주지만 — `useListState.ts:89,217-223` — 이 화면이 쓰지 않는다). 캠페인 수에 상한이 없어 'page size 초과 가능'은 참이다 — 요구는 그 경우 Pagination 을 요구한다 | `grep -rn "Pagination\|pageSize" apps/admin/src/pages/marketing` → **0건**(DS `Pagination` 은 F3a 에서 범위/page-size 를 **opt-in** — `Pagination.tsx:112` `pageSize > 0` — 으로 열었으나 실제 opt-in 소비자는 `stats/*`·`logs/components/LogListShell.tsx:225,242` 뿐이다). 픽스처를 100건으로 늘리면 100행이 한 표에 그려진다(page 컨트롤 없음). 우상단 primary action 과 count 요약은 존재 | **gap** |
| IA-05 | IA | 직접 | `/marketing/sms/new` 와 `/marketing/sms/:id/edit` 가 **같은 `SmsFormPage` 컴포넌트**로 해석된다(`App.tsx:281-282`). `useCrudForm` 이 `useParams().id` 유무로 `isEdit` 를 파생하고(`useCrudForm.ts:74-75`) 레이아웃은 동일한 채 title(`SmsFormPage.tsx:263`)·prefill(`useCrudForm.ts:131-134` reset)·제출 라벨(`SmsFormPage.tsx:426`)만 갈린다. create 전용/edit 전용 페이지가 없다 | `App.tsx:281-282` 의 두 라우트 `element` 가 동일 컴포넌트 참조. `/new` 와 `/sms-1/edit` 를 나란히 열어 레이아웃 동일 · 제목만 '등록'/'수정' 확인 | pass |
| IA-13 | IA | **직접** | **F3b 에서 뒤집혔다 — 이제 소비한다.** `SmsListPage.tsx:117` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 쓴다(`FILTER_DEFAULTS = { status: 'all' }`). 상태 필터·키워드의 **단일 원천이 URL 쿼리스트링**이다: `useListState.ts:87` `useSearchParams` → `:89-91` page/`?q=`/sort → `:93-99` 필터. 갱신은 `patchParams` 한 통로(`:108-129`)로만 나가고 **`replace: true`**(`:125`)라 필터 한 번에 history 가 쌓이지 않는다(검색어 한 줄 타이핑에 Back 이 열 번 필요해지지 않는다 — `:17-19`). 기본값과 같은 값은 URL 에서 지운다(`:116`). 손으로 고친 `?status=거짓말` 은 `parseFilter`(`SmsListPage.tsx:119-123`)가 허용 목록으로 걸러 '전체'로 되돌린다. `useListState` 소비 화면은 **34곳**(`a5c2639` 재확인 — `= useListState(` 호출부 실측)이며 **마케팅 6화면 전부**가 여기 든다 | 상태 필터 '예약' + 키워드 '여름' → URL 이 **`/marketing/sms?status=scheduled&q=여름`**. F5 → 복원 ✓. 행을 열어 수정 화면 진입 후 Back → **그 조건 그대로** ✓. 필터 걸린 view 의 링크를 복사해 공유 → 같은 view ✓. '전체 상태'로 되돌리면 `?status=` 가 URL 에서 사라진다 ✓. 형제 화면의 같은 배선을 `EmailListPage.test.tsx` 가 고정한다(‘훅이 아니라 **배선**을 증명한다’ — `:4`) | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 라우트가 `App.tsx:311-347` 의 `ErrorBoundary` 안에서 렌더된다 — AppShell `<Outlet>` **안쪽** 경계라 화면이 throw 해도 사이드바·헤더가 살고 다른 메뉴로 걸어 나갈 수 있다 | `App.tsx`/`ErrorBoundary` 소유 문서의 판정을 따른다. 이 화면에서는 '경계 안에 있다'는 사실만 못 박는다 | 종속 |
| EXC-02 | EXC | 상속 | (a) 라우트 가드: `RequireAuth` 가 `AppShell` **바깥**이라 세션 없이 `/marketing/sms` 를 deep-link 하면 셸도 그리지 않고 로그인으로 보낸다(`App.tsx:326-328`). (b) 401 인터셉터: `queryClient` 의 `QueryCache`/`MutationCache` `onError` 가 **앱 전체에서 한 곳**으로 401 을 잡아 `notifySessionExpired()` 를 부른다(`queryClient.ts:36-38,46-47`) — 이 화면의 조회·쓰기가 그 경로를 그대로 탄다 | `RequireAuth`/`queryClient` 소유 문서의 판정을 따른다. 이 화면 재현: `?status=marketing-sms:list:401` → 재인증 경로로 이동. **단 폼 작성 중 401 이면 입력이 보존되지 않는다**(EXC-19 P1 · §3) | 종속 |
| EXC-03 | EXC | **직접** | **부분 충족.** (a) read 게이팅은 상속으로 충족된다 — `AppShell` 이 `<Outlet>` 을 `RequirePermission` 으로 감싸(`AppShell.tsx:490-492`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 그리고, 리소스는 라우트에서 파생된다(`route-resource.ts:32-35` `findCoveringLeaf` — `/marketing/sms/1/edit` → 잎 `/marketing/sms`). (b) **write-action 게이팅이 이 화면에 없다 — 판정 유지, 사유는 정밀해졌다**: 'SMS 발송 등록' 버튼(`SmsListPage.tsx:167-170`)·행 액션 수정/삭제(`CrudTable.tsx:192-197`)·일괄 삭제(`CrudListShell.tsx:125-133`)가 권한과 무관하게 렌더된다. **공용 `useRouteWritePermissions`(`RequirePermission.tsx:45`)는 더 이상 소비처 0 이 아니다 — F3b 이후 7곳이 쓴다**(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`). **그러나 `apps/admin/src/pages/marketing/**` 의 소비는 0건이다** — 롤아웃이 이 섹션에 닿지 않았다 | ① 권한 없는 역할로 `/marketing/sms` deep-link → 403 화면(pass). ② `grep -rln "useRouteWritePermissions" apps/admin/src/pages/marketing` → **0건**(앱 전체로는 7곳 + 정의 1곳). remove 권한 없는 역할로 목록 진입 → 행 삭제 버튼과 '선택 N건 삭제'가 **그대로 보이고 눌린다** → **요구의 'create/update/delete 컨트롤은 can()이 false면 렌더 안 함(또는 disable)' 절 미충족** | **gap** (**선례 7곳이 생겼으므로 이제 이 섹션만의 배선 작업이다**) |
| EXC-04 | EXC | 직접 | 폼이 `useCrudForm` 을 소비하고(`SmsFormPage.tsx:175-184`) 그것이 409/412 를 `isConflict` 로 잡아 **입력을 보존한 채** 충돌 다이얼로그를 연다 — 성공 토스트도 목록 이동도 없다(`useCrudForm.ts:166-179`). 화면이 `FormConflictDialog` 를 렌더한다(`SmsFormPage.tsx:431`). 어댑터도 없는 id 의 update/remove 를 조용히 통과시키지 않고 409 를 던져 '유령 저장'을 막는다(`crud.ts:126-128,139-141`) | `?status=marketing-sms:save:409` → `/marketing/sms/sms-1/edit` 에서 저장 → 충돌 다이얼로그가 뜨고 입력이 그대로 살아 있으며 성공 토스트·이동이 없다. '이어서 편집' → 다이얼로그만 닫히고 입력 유지. **⚠ 정확히 쓴다**: `SmsCampaign` 에 `updatedAt`/`version` 이 없어 `If-Match` 를 보내지 못하고, **어댑터의 409 는 '존재 여부' 기반이지 version/ETag 토큰이 아니다**(`crud.ts:126` 의 `exists` 검사). 즉 **삭제 충돌은 잡히나 둘 다 존재하는 동시 수정은 여전히 last-write-wins** 다(BE-034 §7.2 · §3 EXC-04 보강) | pass (유령 저장 축) |
| EXC-08 | EXC | 직접 | 폼 제출이 `useCrudForm` 의 **동기 제출 락**을 탄다 — `submitLockRef` 가 렌더를 기다리지 않고 두 번째 제출을 즉시 반환시킨다(`useCrudForm.ts:103,202-203`). `disabled={saving \|\| loadingDetail}`(`SmsFormPage.tsx:425`)와 이중이다. **멱등키가 `mutationFn` 밖(ref)에서 생성**돼(`useCrudForm.ts:118-123`) 재시도가 같은 키를 재사용하고 성공 시 폐기된다(`:220`). **F3b 에서 그 키가 어댑터까지 연결됐다** — `:211` 이 잡아 `:228,235` 로 mutation variables 에 싣고, `crud.ts:288-289,310-311` 이 `WriteContext`(`crud.ts:30-42,47-48`)로 어댑터에 넘기며, `createCrudAdapter` 의 ledger(`:62-72,91`)가 `:114,121` 에서 `isReplay` 로 재생 판정한다. **기록은 적용에 성공한 뒤에만 한다**(`:116,131`) — 실패한 첫 시도가 키를 태워 재시도를 영영 no-op 으로 만드는 함정을 피한다(`:54-60`). 뮤테이션 자동 재시도는 꺼져 있다(`queryClient.ts:'mutations.retry: false'`) | 제출 버튼 더블클릭 / 응답 전 Enter 연타 → 정확히 1개 요청. `?fail=marketing-sms:save` 후 '확인' 재클릭 → **같은 키가 어댑터 ledger 에 도달**해 캠페인이 두 벌 만들어지지 않는다. **주의**: 이 화면에서 EXC-08 이 진짜로 중요해지는 지점(**실제 발송** — 비가역)은 **UI 가 없어 아직 성립하지 않는다**. 지금 이 폼이 하는 것은 캠페인(초안/예약) **저장**뿐이다(`SmsFormPage.tsx:4-5` 주석 · `data-source.ts:6-7`) — FS-034-EL-036 · §3 | pass |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort` 가 취소를 non-failure 로 처리한다 — 폼 저장(`useCrudForm.ts:161`)·단건 삭제(`useCrudList.tsx:111`)가 abort 면 토스트도 배너도 만들지 않는다. 다이얼로그 close 가 `abort()` + `mutation.reset()` 을 함께 한다(`useCrudList.tsx:86-92,118-124`). 일괄 삭제는 `settleAll` 결과를 쓰고 abort 시 목록을 무효화하지 않는다(`crud.ts:351-354`). 폼 언마운트 시 진행 중 저장을 abort 한다(`useCrudForm.ts:93`) | 삭제 확인 → 요청 중 '취소' → 토스트 없이 버튼 상태 복원, 목록 불변. 저장 중 브라우저 Back → false 실패 토스트 없음 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · **COMP-10** · FEEDBACK-04 · **A11Y-11** · IA-05 · **IA-13** · EXC-04 · EXC-08 · EXC-09 |
| `종속` | **13** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · **MOTION-01** · **MOTION-02** · **MOTION-03** · IA-01 · EXC-01 · EXC-02 |
| `n-a` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **3** | IA-02 · IA-04 · EXC-03 |

**검산**: pass 12 + 종속 13 + n-a 2 + gap 3 = **30** ✓

> **2026-07-17 · `a5c2639` 기준 변경 — gap 7 → 3.** 뒤집힌 P0 **4건**:
> - **A11Y-11 gap → pass** — PR #30 이 `SegmentPicker` 를 고쳤다(`SegmentPicker.tsx:129-131` — `role="group"` + 필수를 실은 `aria-label` + 안내/오류를 잇는 `aria-describedby`). 이 화면의 A11Y-11 gap 사유는 **`SegmentPicker` 하나뿐이었으므로**(직전 판정이 '결함은 이 컴포넌트 하나로 국소화됐다' 고 명시) 그것이 닫히며 축 전체가 pass 가 됐다. 이 화면의 두 `ToggleSwitch` 는 검증 대상이 아니라 오류 `<p>` 가 없어 짝 없는 설명이 생기지 않는다(`role="alert"` grep = 0).
> - **MOTION-01 gap → 종속** — PR #26 이 Modal enter/exit 을 구현했다(`Modal.css:20-21,30-38,58-59,126-168`). **라이브러리가 아니라 CSS-only** 이며 `AnimatePresence` 대신 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성한다. 라이브러리 부재를 gap 으로 볼지는 **DS 소유 문서의 몫**이라 이 화면은 `종속` 으로 되돌린다(§1.1 표기 규약 — `상속` 은 `종속` 이 정칙이다. 직전 판정이 `상속` 에 gap 을 매긴 것은 규약 이탈이었다).
> - **MOTION-02 gap → 종속** — PR #26 이 toast exit 을 **완전 구현**했다(`Toast.css:32-37,121-131,136-141`). 요구의 'exit fast~normal + accelerate' 를 정확히 충족한다.
> - **MOTION-03 gap → 종속** — quality-bar 가 직접 지목한 `ToggleSwitch` reduced-motion 부재가 **해소됐다**(`ToggleSwitch.css:79-84`). ⚠ quality-bar 의 MOTION-03 요구문은 **요구 정본이라 그대로 둔다** — 이제 충족됐을 뿐이다.
>
> **IA-02 · EXC-03 · IA-04 는 gap 유지.** 직전(`4b805ad`) 기준에서 COMP-10 · IA-13 이 pass 로 뒤집혔고, IA-02 · EXC-03 은 사유만 바뀌었다(브랜치 폴백 ✕ → h1 이중·행위 미반영 / 소비자 0 ✕ → 7곳 있으나 marketing 미배선).
>
> **⚠ P0 gap 3건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 셋 다 **이 화면/섹션 소유**다(IA-02 · IA-04 · EXC-03). **DS/앱 전역 소유였던 3건(MOTION-01/02/03)은 DS 가 실제로 고쳐서 사라졌다.** §5 가 범위를 갈라 이관한다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `refreshing` 이 가벼운 인디케이터('· 새로고침 중…')만 띄운다(`CrudListShell.tsx:118-122`). `staleTime: 30_000`(`queryClient.ts`) | 목록이 있는 상태에서 재조회 → 이전 행 유지 + 요약에 '새로고침 중…' | pass |
| STATE-05 | P1 | `empty` 컨텍스트를 3분기로 넘긴다 — `hasQuery: keyword !== ''` · `hasActiveFilters: filter !== SMS_FILTER_ALL` · `onClearSearch` · `onResetFilters`(`SmsListPage.tsx:161-166`). `Empty` 가 copy·조사·복구 액션을 소유. **단 `createAction`(생성 CTA)을 넘기지 않아** 진짜 비어있음 분기에 primary CTA 가 없다 | 검색 '없는키워드' → '조건에 맞는…' + '검색 지우기'. 필터만 → '필터 초기화'. 픽스처 0건 → 문구만 뜨고 **등록 CTA 없음** | 부분 pass(CTA 누락 → §5 #7) |
| STATE-06 | P1 | write 성공 후 관련 캐시만 정확히 무효화 — create/update 가 list 를(update 는 detail 도) invalidate 한다(`crud.ts:179-181,198-201`). 일괄 삭제는 **전원 성공일 때만**(`crud.ts:237-240`) | 캠페인 수정 → 목록 복귀 시 새 값이 수동 새로고침 없이 보인다 | pass |
| COMP-01 | P1 | 모든 버튼이 DS `<Button variant/size>` 다. `buttonStyle(`·`tds-ui-btn-` 사용 0건. **단 '목록으로'만 raw `<button>` + 로컬 `backLinkStyle`**(`SmsFormPage.tsx:252-260`), 제출 라벨이 `loading` prop 이 아니라 손으로 쓴 '저장 중…'(`messaging.ts:370-373`) | `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/marketing/sms` → 0건. 그러나 back-link 는 로컬 스타일 | 부분 pass |
| COMP-04 | P1 | required 필드가 `FormField required` 로 `*` 마커를 렌더한다 — 발송명·발신번호·본문·발송 방식·예약 일시. **`SegmentPicker` 만 bare `<span style={fieldLabelStyle}>` + 수동 `*`**(`SegmentPicker.tsx:109-113`) — quality-bar 가 지목한 안티패턴 그대로 | 각 라벨 옆 `*` 확인. 세그먼트는 FormField 를 거치지 않는다 | 부분 pass(→ §5 #3 와 동일 뿌리) |
| **COMP-12** | **P2** | **핵심 ERP 관심사이자 이 화면의 실질 gap.** 본문에 두 개의 상한이 서로 다른 기준으로 공존한다: **① 카운터는 글자수** — `TextareaField` 가 `counter={value.length/maxLength}` = 'N/2000'(코드포인트). **② 검증은 바이트** — `byteLengthOf(body) > LMS_MAX_BYTES(2000)`(`validation.ts:63-73`), EUC-KR 규칙(코드포인트 > 0x7F = 2byte, `messaging.ts:199-207`). 한글 본문은 **1,000자에서 바이트 상한**에 걸리는데 그때 카운터는 '1000/2000'이라 절반 남은 것처럼 보인다. `maxLength={2000}`(글자)도 바이트 상한을 보호하지 못한다. **완화**: 별도 바이트 힌트가 상시 표시된다 — `'<바이트> byte · SMS|LMS|MMS (한도 <90|2000> byte)'`(`SmsMessageCard.tsx:98-101`) + 미리보기 배지가 초과 시 danger 로 바뀐다(`PhoneMessagePreview.tsx:103,121`). **그래도 두 숫자가 동시에 서로 다른 한도를 말한다** — 요구가 명시한 'counting 기준(code point vs byte)을 정의하고 서버 강제와 일치시킨다'가 미충족 | '가'를 1,000자 입력 → 카운터 '1000/2000'(여유 있어 보임) · 바이트 힌트 '2000 byte · LMS (한도 2000 byte)'(정확히 상한) · 1자 더 → 제출 시 '메시지는 2000 byte(LMS)를 넘을 수 없습니다.' 인라인 에러. 카운터는 여전히 '1001/2000' | **gap** |
| FEEDBACK-01 | P1 | 배치 규칙을 지킨다 — 목록 조회 실패=인라인 Alert(`CrudListShell.tsx:157`) · 저장 실패=폼 배너(`FormFeedback.tsx:43-52`) · 다이얼로그 내부 실패=그 다이얼로그 배너(`useCrudList.tsx:111`) · write 성공=토스트. page 가 임의 배너 state 를 갖지 않는다 | 각 실패를 `?fail=`/`?status=` 로 재현해 표면 위치 확인 | pass |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 피드백이 있다 — 등록/수정(토스트 / 배너·인라인·충돌) · 단건 삭제(토스트 / 배너) · 일괄 삭제(토스트 / 부분 실패 배너) | `?fail=marketing-sms:save`·`:delete` 로 각 경로가 가시 실패를 내는지 확인 | pass |
| A11Y-05 | P1 | 발신번호 select 가 `SelectField isInvalid={errors.senderId !== undefined}`(`SmsFormPage.tsx:301`)를 받고, `FormField error` 가 `<p role="alert">` 를 그린다. **단 select 에 `aria-describedby` 를 수동 연결하지 않는다** — `SelectField` 가 그것을 노출하는지가 DS 판정 | `<select aria-invalid>` 렌더 확인 + describedby 연결 여부는 `SelectField` 소유 문서 | 종속 |
| A11Y-08 | P1 | 행 클릭 이동(`useRowNavigation`)은 **마우스 전용**이지만 행마다 `RowActions` 의 '수정' 버튼이 같은 목적지로 가는 keyboard-focusable 등가물이다(`CrudTable.tsx:192-197`). **단 발송명이 링크가 아니다** — 등가 경로가 액션 버튼뿐이다 | 행을 Tab → '수정' 버튼에 도달 → Enter 로 같은 `/:id/edit` 진입 | pass |
| A11Y-13 | P1 | 검증 실패 시 첫 invalid 필드로 포커스가 간다 — `useCrudForm` 이 `handleSubmit(onValid, onInvalid)` 를 계약으로 고정하고(`useCrudForm.ts:239-241,253`) RHF `shouldFocusError` 가 동작. 422 서버 거절도 `setFocus`(`useCrudForm.ts:184`). **단 폼 진입 시 첫 필드 자동 포커스가 없다** | 빈 폼 제출 → `document.activeElement` 가 발송명 input. `/new` 진입 직후 → activeElement 가 body | 부분 pass |
| A11Y-16 | P1 | 이 화면의 신규 표면이 계약을 지킨다 — `PhoneMessagePreview` `aria-label`(`:106`) · `VariableInsertBar` 칩 `aria-label`(`:65`) + `tds-ui-focusable` · `ToggleSwitch` `role="switch"`. **`SegmentPicker` 의 그룹 semantics 결손도 PR #30 에서 해소됐다** — `<ul role="group">` + 필수를 실은 `aria-label` + 안내/오류를 잇는 `aria-describedby`(`SegmentPicker.tsx:129-131`) | axe 로 `/marketing/sms/new` 스캔 | pass |
| IA-06 | P1 | 무게 규칙을 지킨다 — SMS 발송은 rich 엔티티(본문·세그먼트·예약·미리보기)라 전용 form route + preview 2-col shell 을 쓴다(`SmsFormPage.tsx:88-93`). modal edit 를 섞지 않는다 | `/new`·`/:id/edit` 가 라우트임을 확인. 이 엔티티의 modal 편집 경로 0건 | pass |
| IA-07 | P1 | back-link 가 표준을 지킨다 — 라벨 '목록으로' + `ChevronLeftIcon` + 좌상단(`SmsFormPage.tsx:252-260`). `ArrowLeftIcon`/'리스트로 돌아가기' 0건 | `grep -rn "ArrowLeftIcon\|리스트로 돌아가기" apps/admin/src/pages/marketing/sms` → 0건 | pass |
| IA-08 | P1 | footer 가 표준을 지킨다 — primary(제출) 우측, secondary(취소) 그 왼쪽, below-card 위치(`SmsFormPage.tsx:108-112,415-428`). 라벨 변형('초안 저장'/'예약 저장')은 허용 범위 | 취소·저장 버튼의 상대 위치 확인 | pass |
| **IA-10** | **P2** | 우측 preview panel 이 **이 화면에서 손으로 조립된다** — `gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))'`(`SmsFormPage.tsx:88-93`). 공유 2-col shell 이 없어 `EmailFormPage.tsx:82-87` 이 **같은 상수를 복제**한다(둘 다 `* 13`). quality-bar 가 지목한 '*12/*13/*15 drift' 의 marketing 판 | `grep -rn "minmax(calc(var(--tds-space-6)" apps/admin/src/pages` → 화면마다 자기 상수를 선언. 공유 layout 상수/shell import 0건 | **gap** |
| IA-14 | P1 | 반응형 계약이 선언되지 않았다 — 2-col 이 `auto-fit` 으로 자연 붕괴하는 것은 이점이나, 표의 가로 스크롤 컨테이너·touch-target 최소치·sidebar collapse 가 정의되지 않았다(앱 전역) | 768px/375px 에서 `/marketing/sms` 확인 | gap(앱 전역) |
| ERP-01 | P1 | 단일 status→tone 레지스트리를 쓴다 — `sendStatusTone`(`messaging.ts:349-359`)이 SMS·이메일·뉴스레터 공용이고 화면이 per-page meta helper 를 만들지 않는다(`SmsListPage.tsx:82`) | `SEND_STATUS_TONE` 이 유일 소스임을 확인 | pass |
| ERP-06 | P1 | 포맷이 `shared/format` 을 경유한다 — `formatNumber`·`formatDateTime`(`SmsListPage.tsx:9,75,84`). 전화번호는 도메인 헬퍼 `formatPhone`(`messaging.ts:281-292`) | 셀에 raw `toString()` 없음 | pass |
| ERP-08 | P2 | 숫자·날짜가 공유 formatter 를 탄다. **단 성공률·바이트가 `String(...)` 직접 호출**(`SmsListPage.tsx:94` · `SmsMessageCard.tsx:99`) — 백분율·바이트는 로케일 포맷 대상이 아니라 경미 | 금액 컬럼이 없어 `formatWon` 관심사는 성립하지 않는다 | 부분 pass |
| ERP-09 | P2 | **이 화면에서 실질 위험이다 — F3b 수렴이 이 축을 덮지 못했고, 오히려 불일치가 선명해졌다.** F3b 가 `shared/format.ts:63,76-85` 로 **표시**를 KST 로 고정했으나(`formatDateTime` — `:171-175`), **예약 시각의 해석은 여전히 브라우저 로컬**이다: ① 야간 광고 판정이 `date.getHours()` = 브라우저 로컬 시(`messaging.ts:258-262` `isNightAt`) ② 과거 판정 `isPastLocal` 이 `new Date(value)` 로 오프셋 없는 `datetime-local` 문자열을 **로컬로 파싱**한다(`validation.ts:17-21`) ③ `scheduledAt` 이 오프셋 없는 문자열로 저장된다(`SmsFormPage.tsx:376-387` `<input type="datetime-local">`). 법정 기준(Asia/Seoul · 정보통신망법 제50조 제3항)이 계약에 없다. **`shared/format.ts` 의 UTC 정오 앵커 수렴(`:39-47`)은 달력 **일** 산술용이라 이 시각 축에 닿지 않는다** | 브라우저 TZ 를 UTC 로 바꾸고 `2026-07-20T14:00`(= KST 23:00) 으로 광고 예약 → `getHours()` 가 **14** 를 반환해 **야간 검사를 통과한다**(법정 기준으로는 야간이라 차단돼야 한다). 게다가 목록의 `formatDateTime`(`SmsListPage.tsx` 발송상태 열)은 그 값을 **KST 로 읽어 '23:00' 으로 표시**한다 — **검증과 표시가 서로 다른 기준을 쓴다** | **gap**(→ BE-034 §7.5) |
| **ERP-14** | **P1** | **전화번호 표시 포맷은 있으나 masked input 이 없다.** `formatPhone`(`messaging.ts:281-292`)이 02/일반 국번을 갈라 하이픈을 넣고 `isPhoneNumber`(`:276-279`)가 9–11자리를 검증한다. 그러나 이 화면의 발신번호는 **드롭다운 선택**이라 자유 입력 필드가 아니다 — 실시간 masking·paste normalize 의 대상 표면이 없다. 표시 경로에서는 `formatPhone` 이 옵션 라벨(`SmsFormPage.tsx:307`)과 미리보기(`PhoneMessagePreview.tsx:108`)에 일관 적용된다. **마스킹(개인정보 가리기)은 이 화면에 없고 필요도 없다** — 발신번호는 회사 대표번호이지 개인 번호가 아니고, 수신자 번호는 화면에 표시되지 않는다(세그먼트 단위 선택). `#{연락처}` 표본값 '010-1234-5678'(`messaging.ts:110`)은 실제 회원 데이터가 아닌 고정 문자열이다 | 발신번호 옵션·미리보기가 `formatPhone` 을 거치는지 확인. 수신자 개인 번호가 화면·DOM 어디에도 없음을 확인(`grep` 으로 수신자 목록 조회 0건) | pass(표시) / N/A(입력 masking·개인정보 마스킹 — 표면 부재) |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전체 0건 — 프론트 타임아웃 상한이 없다 | never-resolving 픽스처로 재현 시 무한 spin | gap(앱 전역) |
| EXC-06 | P1 | 에러 타입이 status 를 지닌다(`http-error.ts` `HttpError`)고 화면이 class 별로 갈린다 — 404 vs 5xx(`SmsFormPage.tsx:232-240`) · 409/412(충돌) · 422(인라인) · 그 외(배너+참조코드) | `?status=marketing-sms:save:{403,409,422,500}` 각각 다른 표면 | pass |
| EXC-07 | P1 | 422 를 RHF `setError` 로 해당 입력에 꽂고 첫 필드로 포커스한다(`useCrudForm.ts:176-186`). form-level 배너는 generic 전용 | `?status=marketing-sms:save:422` → violations 가 있으면 인라인. **단 dev 스위치가 `violations` 를 싣지 않아 현재는 배너로 떨어진다** | 부분 pass |
| EXC-10 | P1 | `settleAll` 로 allSettled semantics 를 쓰고 'N중 M건 실패'를 보고하며 전원 성공에만 invalidate·selection clear(`useCrudList.tsx:135-147`). **단 실패 id 를 돌려주지 않아 '실패분만 재시도'가 불가**하다 — 재클릭이 전체를 재실행 | 일부만 실패하도록 강제 → 건수만 뜨고 어느 행인지 모른다 | 부분 pass(→ §5 #10) |
| EXC-11 | P1 | `navigator.onLine` 앱 전체 0건 — 오프라인 배너·write 게이팅·복구 refetch 없음 | DevTools offline 토글 → 아무 안내 없이 hard error | gap(앱 전역) |
| EXC-12 | P1 | 404 와 generic error 를 갈라 복구 수단을 달리한다 — `loadFailure: 'not-found' \| 'error'`(`useCrudForm.ts:138-143`) → 화면이 404 에는 '목록으로'만, error 에는 '다시 시도'+'목록으로'(`SmsFormPage.tsx:226-248`). 어댑터가 404 에 status 를 실어 던진다(`crud.ts:54-57`) | `/marketing/sms/없는id/edit` → '찾을 수 없습니다' + '목록으로'(재시도 없음). `?status=marketing-sms:detail:500` → '다시 시도' 포함 | pass |
| EXC-14 | P1 | **이 화면에 낙관적 업데이트가 없다** — 등록·수정·삭제 전부 pessimistic(confirm + busy)이다. 요구가 'create/delete 는 pessimistic 유지'라 했으므로 정합하고, 인라인 toggle/reorder 표면이 없어 rollback 대상도 없다 | `onMutate`/`setQueryData` 가 이 화면 경로에 0건 | pass |
| EXC-15 | P1 | **파일 업로드 표면이 없다.** 이미지 첨부가 boolean 플래그뿐이라(`types.ts:23`) type/size 검증·progress/cancel·fallback 의 대상이 성립하지 않는다. **다만 그것 자체가 FS-034 §7 #6 의 기능 gap 이다** | `ImageUploadField`/`imageFile` import 0건 | N/A(표면 부재) |
| EXC-18 | P1 | selection scope 가 '보이는 전량'이고(`CrudListShell.tsx:143-148` → `visibleItems`) confirm 이 count 를 echo 한다(`useCrudList.tsx:169-170`). **그러나 Shift-click range · 임계값 초과 강화 confirm · determinate progress · 실행 중 cancel 이 전부 없다** | 100건을 선택해 일괄 삭제 → count 는 보이나 진행률·취소 없음 | gap(→ §5 #10) |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 draft 스냅샷이 없다 — 401 이 `notifySessionExpired()` 로 programmatic 이동하므로 FEEDBACK-04 가드가 발화하지 않는다. 발송 폼은 본문·세그먼트·예약을 모으는 긴 작업이라 손실이 크다 | dirty 폼에서 `?status=marketing-sms:save:401` → 입력 소실 | gap(앱 전역) |
| EXC-20 | P1 | 5xx 에 복사 가능한 참조 코드를 보인다 — `referenceOf(cause)`(`useCrudForm.ts:189`) → `FormServerError` 가 '오류 코드 <ref>' 를 `userSelect: 'all'` + tabular 로 렌더(`FormFeedback.tsx:14-24,45-51`). raw body/stack/status 를 산문으로 쓰지 않는다 | `?status=marketing-sms:save:500` → '저장하지 못했습니다…' + 오류 코드. raw 텍스트 미노출 | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 인위 지연이며 예산이 아니다.** 픽스처 응답을 400ms 늦춰 로딩 상태를 눈으로 보게 하는 장치다. 아래 예산은 **백엔드 연동 후** 기준이며 현재 값으로 검증할 수 없다.

| 항목 | 예산 | 현재 상태 |
|---|---|---|
| 목록 조회 p95 | 400ms(서버 상한 5초 → 504, BE-034 §2) | 측정 불가 — 픽스처 |
| 단건 조회 p95 | 300ms | 측정 불가 |
| 저장(등록·수정) p95 | 600ms | 측정 불가 |
| 발송 트리거(EP-06) p95 | **202 즉시 반환** — 전송 완료를 기다리지 않는다(BE-034 §2) | **UI 미구현** |
| 첫 렌더(목록) | 스켈레톤 즉시 · 데이터 도착 후 1프레임 | pass — `firstLoading` 이 즉시 참 |
| 재조회 횟수 | 진입당 1회. `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts`) — 탭 전환·창 포커스로 늘지 않는다 | pass |
| 폼의 파생 계산 | 본문 1글자마다 `byteLengthOf`(O(n) 순회) × **4곳**(폼 `bytes` · `campaignKind` · `PhoneMessagePreview` 내부 재계산 · `smsByteLimit`). 2,000byte 본문에서 타이핑마다 수천 회 순회 | 예산 내(상한 2,000자) — **단 `useMemo` 없이 매 렌더 재계산**이며 본문 상한이 커지면 재검토 |
| 목록 DOM 노드 | **상한 없음** — 페이지네이션·virtualization 이 없어 캠페인 수에 비례해 선형 증가(IA-04 · ERP-15) | gap |
| 번들 | 이 화면 전용 코드는 라우트 분할 대상. `marketing/_shared` 는 6개 마케팅 화면이 공유 | 측정 미실시 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + '다시 시도' | **pass**(`CrudListShell.tsx:156-165`) |
| 수정 진입 시 대상 없음(404) | '찾을 수 없습니다' + '목록으로'만 | **pass**(`SmsFormPage.tsx:232-240`) |
| 저장 중 다른 관리자가 삭제 | 유령 저장 금지 · 충돌 다이얼로그 · 입력 보존 | **pass**(`crud.ts:71-74` → `useCrudForm.ts:158-172`) |
| 동시 수정(둘이 같은 캠페인 편집) | 낙관적 잠금으로 후자 거절 | **gap** — `updatedAt`/`version` 없음 → 마지막 쓰기 승리(BE-034 §7.2) |
| 화면 렌더 예외 | 셸 유지 + 복구 UI | **pass**(상속 — `App.tsx:311-347`) |
| 세션 만료 | 재인증 경로 + returnUrl | **pass**(상속) / 폼 입력 보존은 **gap** |
| 네트워크 단절 | 배너 + write 게이팅 + 복구 refetch | **gap**(앱 전역 — `navigator.onLine` 0건) |
| 요청 무한 지연 | 클라이언트 타임아웃 → retriable 실패 | **gap**(앱 전역 — `AbortSignal.timeout` 0건) |
| 일괄 삭제 중 일부 실패 | 부분 실패 보고 + 실패분만 재시도 | **부분** — 건수만(`useCrudList.tsx:135-141`), 실패 id 미반환 |
| 일괄 삭제 실행 중 취소 | 남은 항목 중단 | **gap** — 다이얼로그를 닫으면 abort 되나 진행률이 없어 무엇이 남았는지 모른다 |
| **발송 실행 실패·중복** | 멱등키 + 서버 상태 재검사 | **N/A — 발송 UI 가 없다.** 트리거가 붙는 순간 이 표에서 가장 위험한 행이 된다(BE-034 §7.3) |

### 4.3 데이터 보존 · 감사

> **이 화면의 데이터는 법적 증빙이다.** 마케팅 발송은 분쟁 시 '누가 · 언제 · 몇 명에게 · 무엇을 · 어떤 동의 근거로 보냈는가'를 증명해야 한다(정보통신망법상 수신동의 증빙 의무). 그 요구가 현재 도메인 모델에 반영돼 있지 않다.

| 항목 | 요구 | 현재 상태 |
|---|---|---|
| 발송 실행 감사(누가·언제·몇 명에게) | 실행 주체·실행 시각·캠페인 스냅샷·최종 대상 수·동의 검증 결과·멱등키를 서버가 기록 | **gap** — `SmsCampaign`(`types.ts:8-29`)에 작성자·실행자·실행 시각 필드가 **하나도 없다**. `stats` 는 성공/실패 숫자뿐이다. **발송 UI 자체가 없어 기록할 실행도 아직 없다**(BE-034 §7.9) |
| 수신자별 전송 기록 + 동의 근거 | 동의 시각·경로와 전송 결과를 수신자 단위로 보존 — §7.6 의 발송 시점 동의 재확인을 **증명 가능**하게 만든다 | **gap** — 프론트에 수신자 단위 개념이 없다(세그먼트 단위 선택). 서버 계약(BE-034 §7.6·§7.9)에만 존재 |
| 캠페인 변경 감사 | 누가 언제 무엇을 바꿨는가 | **gap** — `updatedAt` 조차 없다(BE-034 §7.2) |
| 발송 이력 보존 | 캠페인 삭제와 **독립적으로** 보존. `sent` 캠페인은 soft-delete 권고 | **gap** — 현재 삭제는 배열에서 제거하는 hard-delete 다(`crud.ts:86`). 관리자가 발송완료 캠페인을 지우면 성공률·통계가 함께 사라진다. 서버가 이력을 별도 보존해야 한다(BE-034 §4 EP-05 · §7.9) |
| 전송 중 캠페인 삭제 차단 | `sending` 삭제는 422 — 결과를 기록할 곳이 사라진다 | **gap**(프론트) — 상태와 무관하게 삭제 다이얼로그가 열린다. 서버가 막아야 한다(BE-034 §4 EP-05) |
| 개인정보 최소 노출 | 수신자 개인정보를 관리자 브라우저에 내리지 않는다 | **pass** — 세그먼트 단위로만 다루고 수신자 목록·연락처를 조회하지 않는다. 치환변수는 **표본값**만 쓴다(`applyVariableSamples` — `messaging.ts:130-136`) — 실제 값 치환은 서버 몫(BE-034 §7.8). 이 설계가 옳다 |
| 발송 대상 스냅샷의 수명 | 저장 시점 `recipientCount` 가 발송 시점 실제 대상과 다를 수 있음을 계약이 인정 | **부분** — 화면 문구가 '발송 시 1회로 합산됩니다'로 예고(`SegmentPicker.tsx:142-145`)하나, 저장값은 스냅샷이고(`data-source.ts:81`) 중복 제거도 안 한다(BE-034 §7.6) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | ~~**IA-13**~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `SmsListPage.tsx:117` 이 공용 `useListState` 를 소비해 `?status=`·`?q=` 를 URL 이 소유한다(`useListState.ts:87-99,125`). F5·Back·링크 공유로 복원된다. `useListState` 소비 화면은 이제 **34곳**(마케팅 6화면 전부 포함 — `a5c2639` 재확인, `= useListState(` 호출부 실측) | — | **닫힘** |
| 2 | ~~**COMP-10**~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `SmsListPage.tsx:117,144-152` 가 `useListState` 를 통해 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다. 조합 중 커밋 금지(`useDebouncedSearch.ts:87`)·250ms 디바운스(`:23,93-95`)·조합 중 Enter 차단(`:121-124`) 전부 붙었다 | — | **닫힘** |
| 3 | ~~**A11Y-11**~~ | ~~P0~~ | **해소 (PR #30 · `a5c2639`)** — 직전 판정이 '결함은 `_shared/SegmentPicker.tsx` 하나로 국소화됐다' 고 적었고, 그 하나가 닫혔다. 묶음이 `role="group"`(`SegmentPicker.tsx:129`) · 필수를 실은 `aria-label`(`:130`) · 안내/오류를 잇는 `aria-describedby`(`:131`, `useId` `:106` → `<p id={noteId}>` `:156`/`:160`)를 갖는다. **체크박스별 `aria-required` 를 붙이지 않은 것이 옳은 해법이다**(근거 `:7-15`) — required 가 그룹 수준 '최소 하나' 라 개별 체크박스에 붙이면 거짓 시맨틱이고, `aria-required` 는 `role=group` 미지원 속성(ARIA 1.2)이다. 회귀 고정: `SegmentPicker.test.tsx:37,42,48,55,64`. 이 화면의 `ToggleSwitch` 2개는 검증 대상이 아니라 짝 없는 오류 `<p>` 가 없다(`role="alert"` grep = 0) | — | **닫힘** |
| 4 | **IA-02** | **P0** | **gap 유지 · 사유 전환.** ~~브랜치 라벨 폴백~~은 통합의 `findCoveringLeaf`(`nav-config.ts:260-278,297-299`)로 **해소**됐다 — AppHeader h1 은 이제 'SMS 발송' 이다. 남은 것: **폼 라우트에 `<h1>` 이 둘**(`AppHeader.tsx:101` + `SmsFormPage.tsx:263`)이고, `nav-config.ts:294-296` 이 '등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아 `/new` 와 `/:id/edit` 의 상단 h1 이 동일하다. **목록 라우트는 h1 1개 — 그 축은 pass** | 앱 전역(모든 하위 라우트) | A40 · A11 (FS-034 §7 #1) |
| 5 | **IA-04** | **P0** | Pagination 이 없다 — `marketing/**` 전역 `Pagination`·`pageSize` 참조 0건. 캠페인 전량이 한 표에 그려진다. DS `Pagination` 은 F3a 에서 범위/page-size 를 **opt-in**(`Pagination.tsx:112` `pageSize > 0`)으로 열었으나 실제 opt-in 소비자는 `stats/*`·`logs` 뿐이고, `useListState` 가 주는 `page`·`clampPage`(`useListState.ts:89,217-223`)도 이 화면이 쓰지 않는다 | 이 화면 + `CrudListShell` | A11 (FS-034 §7 #9) |
| 6 | **EXC-03** | **P0** | **gap 유지 · 범위 축소.** 쓰기 권한 게이팅이 없다 — 등록·수정·삭제 버튼이 권한과 무관하게 렌더. **`useRouteWritePermissions`(`RequirePermission.tsx:45`) 소비처는 0 → 7곳**(products 3 · settings 4)이 됐다. 훅·선례는 완비돼 있고 **`pages/marketing/**` 이 아직 배선되지 않았을 뿐**이다 | **이 섹션**(앱 전역 아님 — 선례 7곳 존재) | A11 · A63 (FS-034 §7 #10 · BE-034 §7.12 #7) |
| 7 | ~~**MOTION-01**~~ | ~~P0~~ | **해소 (PR #26 · `a5c2639`)** — Modal enter/exit 모션이 실재한다: backdrop fade(`Modal.css:20-21,30-33` → keyframes `:126-144`) + dialog scale 0.96→1(`:58-59,35-38` → keyframes `:146-168`, `forwards`), reduced-motion 게이트 `:173-180`. **라이브러리가 아니라 CSS-only** 이며 `AnimatePresence` 대신 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)가 exit 완료 후 unmount 를 보장한다. Motion/framer-motion 은 여전히 미도입이므로 **'라이브러리로 구현하라' 로 요구를 읽으면 DS 소유 문서에서 여전히 열려 있을 수 있다** — 이 화면은 소비자라 `종속` | **DS 소유** | A40 (DS) |
| 8 | ~~**MOTION-02**~~ | ~~P0~~ | **해소 (PR #26 · `a5c2639`)** — Toast exit 모션 완전 구현. `.tds-toast--exiting`(`Toast.css:32-37`) + keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`) + reduced-motion 게이트 `:136-141`. exit duration `{motion.duration.fast}`(150ms) · easing `{motion.easing.accelerate}` 로 요구를 정확히 충족 | — | **닫힘** |
| 9 | ~~**MOTION-03**~~ | ~~P0~~ | **해소 (PR #26 · `a5c2639`)** — `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce)` 에서 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 끈다. quality-bar 가 지목한 `:32`·`:56` 두 선언이 **둘 다** 덮인다. ⚠ quality-bar 의 MOTION-03 요구문은 요구 정본이라 그대로 둔다 — 이제 충족됐을 뿐이다 | — | **닫힘** |
| 10 | COMP-12 | P2 | **본문 카운터(글자수)와 검증 상한(바이트)의 기준이 다르다** — 카운터 'N/2000'(코드포인트) vs 검증 2,000 byte(`validation.ts:65`). 한글은 1,000자에서 걸리는데 카운터는 절반 남았다고 말한다. 바이트 힌트(`SmsMessageCard.tsx:98-101`)가 완화하나 두 숫자가 서로 다른 한도를 말한다. **counting 기준을 byte 로 정의하고 서버 강제와 일치시켜야 한다** | 이 화면 | A11 (FS-034 §7 #5 · BE-034 §4 EP-03) |
| 11 | IA-10 | P2 | 2-col preview shell 이 손조립이고 `EmailFormPage` 가 같은 상수를 복제한다(`SmsFormPage.tsx:88-93` ≡ `EmailFormPage.tsx:82-87` — 둘 다 `layoutStyle` 이며 `:90`·`:84` 가 `minmax(calc(var(--tds-space-6) * 13), 1fr)`). **`a5c2639` 재확인 — 라인·값 그대로다.** PR #32 는 이 축을 건드리지 않았다(AppShell main padding `space.6`→`space.7` 만 바뀌었고 `space-6` **파생 배수**는 불변). 실제 복제 폭은 더 넓다 — 같은 `* 13` 상수를 쓰는 화면이 **11곳**이고(`NewsletterFormPage.tsx:81` · `BannerFormPage.tsx:55` · `PopupFormPage.tsx:58` · `CouponFormPage.tsx:81` · `ProductFormPage.tsx:103` · `ReviewDetailPage.tsx:66` · `AccountFormPage.tsx:85` · `ContractFormPage.tsx:85` · `ProjectFormPage.tsx:86` · `DownloadFormPage.tsx:75` 외) 공유 layout primitive 는 없다 | marketing(+popup/banner/quote) | A11 |
| 12 | ERP-09 | P2 | 야간·과거 판정이 브라우저 로컬 TZ 기준(`messaging.ts:258-262` `isNightAt` → `getHours()` · `validation.ts:17-21` `isPastLocal`). 법정 기준 Asia/Seoul 이 계약에 없다. **F3b 의 KST 표시 고정(`format.ts:63,76-85`)이 이 축을 덮지 못했다 — 오히려 표시(KST)와 검증(로컬)이 갈려 불일치가 선명해졌다.** 같은 결함이 이메일·뉴스레터에도 그대로 있다(`_shared/messaging.ts` 공유 + 세 `validation.ts` 의 `isPastLocal` 사본 3벌) | 이 화면 + `_shared`(이메일·뉴스레터 공유) | A63 · A11 (FS-034 §7 #7 · BE-034 §7.5) |
| 13 | EXC-18 / EXC-10 | P1 | 일괄 삭제에 Shift-range · 강화 confirm · 진행률 · 실행 중 취소 · 실패 항목 식별이 없다(건수만) | 이 화면 + `useCrudList` | A11 (FS-034 §7 #9) |
| 14 | EXC-05 / EXC-11 / EXC-19 | P1 | 프론트 타임아웃 상한 · 오프라인 감지 · 세션 만료 시 폼 draft 보존이 없다(`AbortSignal.timeout` · `navigator.onLine` 앱 전체 0건) | 앱 전역 | A11 · A40 (FS-034 §7 #15) |
| 15 | IA-14 | P1 | 반응형 계약(최소 폭·sidebar collapse·표 가로 스크롤·touch-target)이 선언되지 않았다 | 앱 전역 | A40 |
| 16 | STATE-05 | P1 | 진짜 비어있음 분기에 생성 CTA 가 없다 — `empty.createAction` 미전달(`SmsListPage.tsx:161-166`) | 이 화면 | A11 |
| 17 | (기능) | — | **발송 트리거 UI 가 없다** — `/send` 심(`data-source.ts:71`)에 호출부 0건. 저장된 캠페인을 보낼 방법이 이 화면에 없다. 구현 시 **멱등키 필수**(BE-034 §7.3). 발송 UI 가 없으므로 **중복 발송 경합은 현재 성립하지 않는다** — 트리거가 붙는 순간 EXC-08 의 진짜 대상이 된다 | 이 화면 | A11 · A63 (FS-034 §7 #8 · BE-034 §7.12 #1) |
| 18 | (감사) | — | 발송 감사 필드(작성자·실행자·실행 시각·동의 근거)가 도메인 타입에 없고, 발송 이력이 캠페인 hard-delete 로 함께 사라진다 — **법적 증빙 요구 미충족**(§4.3) | 이 화면 + 서버 | A63 (BE-034 §7.9) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래는 판정을 **재현**하기 위한 스위치이며, 실행 결과가 아니다.

**이 화면의 `?fail=` scope 는 `marketing-sms` 다**(`data-source.ts:73` — `scope: 'marketing-sms'`). `createCrudAdapter` 가 op 4개를 만든다(`crud.ts:43-87`).

| 스위치 | 대상 op | 재현되는 표면 |
|---|---|---|
| `?fail=marketing-sms:list` | `fetchAll` | 목록 조회 실패 배너(FS-034-EL-010) — STATE-01/02 |
| `?fail=marketing-sms:detail` | `fetchOne` | 수정 진입 로드 실패(FS-034-EL-015) — EXC-12 |
| `?fail=marketing-sms:save` | `create`·`update` | 폼 저장 실패 배너(FS-034-EL-016) — FEEDBACK-03 |
| `?fail=marketing-sms:delete` | `remove` | 삭제 다이얼로그 안 배너(FS-034-EL-011) — FEEDBACK-02 |
| `?fail=list` (scope 생략) | 모든 어댑터의 `list` | 앱 전역 목록 실패 |
| `?fail=all` | 전 op | — |

**status 지정 스위치**(`?status=<op>:<code>` — `dev.ts:15-23,56-71`). 재현 가능 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

| 스위치 | 재현되는 표면 |
|---|---|
| `?status=marketing-sms:save:409` | 충돌 다이얼로그(FS-034-EL-034) — **EXC-04** |
| `?status=marketing-sms:save:412` | 동일(`isConflict` 가 409·412 를 함께 잡는다) |
| `?status=marketing-sms:save:422` | 필드 인라인 거절 — EXC-07. **단 dev 스위치가 `violations` 를 싣지 않아 실제로는 배너로 떨어진다** |
| `?status=marketing-sms:save:500` | 저장 실패 배너 + **오류 코드**(FS-034-EL-016) — EXC-20 |
| `?status=marketing-sms:detail:404` | '찾을 수 없습니다' + '목록으로'만(재시도 없음) — EXC-12 |
| `?status=marketing-sms:list:401` | 재인증 경로(`notifySessionExpired`) — EXC-02 |
| `?status=marketing-sms:list:403` | 조회 실패 배너 — EXC-03(read) |
| `?status=all:500` | 전 op 500 |

> **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 는 `?delay=` 를 구현하지 않는다 — 지연은 `LATENCY_MS = 400` 고정이다(`dev.ts:12`). `?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있고 이 화면 어댑터는 그것을 쓰지 않는다. **STATE-01 의 skeleton 재현은 400ms 창 안에서 관찰하거나 `LATENCY_MS` 를 일시 조정해 확인한다.**

| 도구 | 용도 |
|---|---|
| `sms.test.ts` | 유형 판정(90byte 경계·MMS)·필터·검색·정렬·`toSmsInput` + `smsSchema` 경계값(발신번호 미검증·빈 수신자·광고 요건·과거 예약·야간 광고) 회귀 — **COMP-12 의 카운터/바이트 불일치는 테스트가 없다** |
| `_shared/messaging.test.ts` | 바이트·야간·광고 규칙의 순수 함수 회귀 |
| `useListState.test.tsx` · `useDebouncedSearch.test.tsx` | **이 화면이 `SmsListPage.tsx:117` 로 소비하는 훅의 테스트** — IA-13·COMP-10 pass 의 회귀 방어선이다 |
| `_shared/SegmentPicker.test.tsx` | 세그먼트 묶음의 required·설명 배선 회귀(A11Y-11) — `:37` 접근성 이름에 필수 · `:42` 비필수 대조 · `:48` 개별 체크박스 `aria-required` 금지 · `:55` 안내 `aria-describedby` · `:64` 오류로 바뀌어도 짝 유지 |
| `shared/token-guard.test.ts` | `:208-268` 미정의 토큰 참조 가드 — `apps/admin/src` 의 `.css`+`.ts`/`.tsx` 를 `packages/ui/generated/tokens/tokens.css` 정본과 대조(11 tests · 위반 0). **값(hex/px) 가드 `:109-192` 는 `.css` 전용**이고 `.tsx` 는 ESLint 가 덮는다 |
| grep 판정 | `Pagination`(IA-04) · `useListState`/`useDebouncedSearch`(IA-13·COMP-10) · `useRouteWritePermissions`(EXC-03) · hex/px/border-keyword + `surface-sunken`/`border-strong`(TOKEN-01) · `role="alert"`(A11Y-11 짝 검사). **`AnimatePresence`/`framer-motion` grep 으로 MOTION-01/02 를 판정하지 말 것** — 모션은 실재하되 **CSS-only** 라 그 grep 은 0건이면서도 요구는 충족된다(`Modal.css:126-168` · `Toast.css:121-131`). `prefers-reduced-motion` grep 은 이제 `ToggleSwitch.css:79` · `Modal.css:173` · `Toast.css:136` 에 매치한다 |
| axe | `/marketing/sms/new` 스캔 — A11Y-11·A11Y-16 |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 **복제하지 않고** ID 로만 참조했다 — 이 문서는 '이 화면에서 어떻게'만 쓴다
- [x] §2 가 **P0 30건 전수**를 quality-bar 의 순서대로 담았다. 빈칸 0건
- [x] 모든 `pass` 에 **파일:라인** 코드 근거가 있다. 모든 `gap` 에 재현 가능한 측정 기준이 있다. 모든 `N/A` 에 '표면이 왜 없는가' 사유가 있다
- [x] §2.1 산수를 검산했다 — pass 12 + 종속 13 + n-a 2 + gap 3 = **30** ✓ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓)
- [x] **2026-07-17 · `HEAD = a5c2639`(PR #22·#24·#26·#28·#30·#32·#34) 기준으로 30행 전수 재검증했다.** 뒤집힌 판정 **4건 — gap 7 → 3**: **A11Y-11** gap→**pass**(`SegmentPicker.tsx:129-131` — 직전 판정이 국소화해 둔 단 하나의 결함이 닫혔다) · **MOTION-01·02** gap→**종속**(`Modal.css:126-168` · `Toast.css:32-37,121-131` — 모션 실재) · **MOTION-03** gap→**종속**(`ToggleSwitch.css:79-84` — 게이트 실재). **유지된 gap 3건**: IA-02 · IA-04 · EXC-03. **ERP-09 도 gap 유지** — 예약 시각 **해석**이 여전히 브라우저 로컬이다(`messaging.ts:258-262` `getHours()`)
- [x] **낡은 주장 2종을 코드로 반증해 지웠다**: ① 「Modal/Toast 에 모션이 없다 — 즉시 pop in/out」 → **틀렸다**. 모션은 실재하며 다만 **CSS-only** 다(Motion/framer-motion 은 여전히 미도입 — `package.json` 19개·import·lockfile 전부 0건). `AnimatePresence` 의 'exit 완료 후 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성된다 ② 「`ToggleSwitch.css` 에 `prefers-reduced-motion` 0건」 → **틀렸다**(`:79-84`). **grep 결과를 그대로 옮겨 적지 않고 파일을 열어 확인했다**
- [x] `상속`인데 `gap`이던 3건(MOTION-01/02/03)을 §1.1 표기 규약대로 **`종속` 으로 되돌렸다** — 근거가 해소됐고, 라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 판단이다. 이 화면은 소비자이므로 남의 판정을 대신 내리지 않았다
- [x] **`aria-required` 를 앱 소스 grep 으로 판정하지 않았다** — 주입이 런타임 `cloneElement` 다. `useDebouncedSearch` 도 `useListState` 경유 소비라 화면 파일 grep 이 0건이어도 pass 다
- [x] **`?delay=` 를 쓰지 않았다** — `shared/crud/dev.ts` 에 없음을 확인하고 §6 에 그 사실을 적었다. 실제 scope 문자열(`marketing-sms`)과 op 4종을 코드에서 확인했다
- [x] `LATENCY_MS = 400` 이 **개발용 지연이며 예산이 아님**을 §4.1 서두에 명시했다
- [x] §4.3 에서 발송 감사·데이터 보존을 다뤘다 — 발송 이력이 법적 증빙임을 전제로 판정했다
- [x] **E2E 를 실행하지 않았다.** 판정 근거는 전부 코드 대조이며 §6 서두에 명시했다
- [x] §5 의 gap 이 FS-034 §7 · BE-034 §7.12 와 상호 참조로 일치한다
- [x] **발송 UI 부재의 파급을 정직하게 판정했다** — EXC-08 은 현재 표면(폼 제출)에서 pass 이고, 중복 발송 경합은 발송 UI 가 없어 **성립하지 않음**을 §4.2 · §5 #17 에 기록했다
