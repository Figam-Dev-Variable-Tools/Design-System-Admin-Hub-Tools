---
id: NFR-027
title: "문의 유형 관리 비기능 명세"
functionalSpec: FS-027
backendSpec: BE-027
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-027. 문의 유형 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-027 문의 유형 관리 (`/support/categories` · 모달 · 삭제 다이얼로그) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** — ID 로만 참조하고, '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가'만 적는다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. P0 30건을 전수 판정하고, gap 을 재현 가능한 측정 기준과 함께 §5 로 이관한다 |
| 함께 읽는 문서 | FS-027(요소·예외) · BE-027(엔드포인트·보안 판정) · `specs/portfolio/categories/NFR-024`(쌍둥이 구조 — 판정이 거의 겹친다) · `specs/content/faq/{FS,BE}-010`(카테고리 모달 선례) |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 표의 **행 집합**이 바뀐다. 화면 코드가 바뀌면 **판정과 근거**가 바뀐다. 둘 다 이 문서에서 갱신한다 |
| 판정 기준일 | **2026-07-17 · HEAD = `a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었다. **이번 기준 갱신으로 뒤집힌 판정**: ① **FEEDBACK-06 `pass` → `gap`** — 이 화면의 배선은 그대로인데 **DS Modal 이 PR #26 에서 exit 애니메이션과 함께 `closingRef` 일방향 latch 를 들여왔다**(`Modal.tsx:122-126`, 리셋 코드 없음). dirty 가드가 `onClose()` 를 veto 하면 **모달이 보이지 않는 채 영구히 잠긴다**(§2 · §5 #7). **P0 gap 3 → 4** ② **MOTION-03 — 근거가 뒤집혔다(판정은 `종속` 유지).** `ToggleSwitch.css:79-84` 에 reduced-motion 게이트가 **실재하게 됐다** — §5 #7(구 MOTION-03 항목)을 해소로 갱신했다 ③ MOTION-01/02 는 근거 텍스트만 갱신(오버레이 모션이 CSS-only 로 구현됐다) |
| 검증 방법 | **E2E 미실행. 모든 판정 근거는 `a5c2639` 코드 대조다.** 측정 기준은 판정을 *확인할 수 있는 절차*이며 이 문서가 그것을 실행했다는 뜻이 아니다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족(F3b 가 `isFetching` 직결을 끊었다).** 이 화면은 `useCrudList` 를 쓰지 않고 `useCrudListQuery` 를 직접 소비하지만(`CategoriesPage.tsx:162-165`), **그 자리에서 공유 훅과 글자까지 같은 파생을 둔다** — `:176` `const firstLoading = isFetching && data === undefined` · `:178` `const refreshing = isFetching && data !== undefined`(`:167-175` 주석이 '예전엔 isFetching 을 그대로 loading 이라 불러 표에 넘겼다'고 전환을 밝힌다. 정본은 `useCrudList.tsx:71-72`). 네 상태가 배타적이다: 조회 요약(`:223`)과 빈 상태 문구(`:245`)가 **`firstLoading` 만** 읽고, **데이터가 있는 재조회에서는 `전체 N개` 를 유지한 채 `:224` 가 '· 새로고침 중…' 만 덧붙인다**. 행은 `placeholderData: (previous) => previous`(`shared/crud/crud.ts:254`)가 유지한다. read 실패는 `:232` 가 Alert 로 가른다 | 목록이 뜬 뒤 '유형 추가'로 1건 생성 → `useCrudCreate` 의 `onSuccess` 가 목록을 무효화(`crud.ts:291`) → 재조회 400ms 동안 **행이 남고 요약도 `전체 N개` 를 유지하며 '· 새로고침 중…' 만 붙는다**. 최초 진입에서만 '불러오는 중…'. **⚠ 스켈레톤이 아니라 텍스트 인디케이터라도 판정은 같다** — 요구는 '재조회가 blank/skeleton 하지 않을 것'이다 | pass |
| STATE-02 | STATE | 직접 | 목록 조회 실패 시 카드를 **인라인 danger Alert + '다시 시도'** 로 대체한다(`CategoriesPage.tsx:220-228`, `onClick={() => void refetch()}`). 토스트를 쓰지 않고 빈 상태로 폴백하지도 않는다(빈 상태는 `:231` 의 별도 분기) | `/support/categories?fail=support-categories:list` → danger Alert '문의 유형을 불러오지 못했습니다.' + '다시 시도'만 렌더, 에러 토스트 0건, 빈 상태 문구 미노출 | pass |
| STATE-04 | STATE | N/A | **표면 없음** — 이 화면에 페이지네이션·필터·키워드·행 선택이 전부 없다. 목록은 전량 렌더(`:234-247`)이고 `useListState`·`useRowSelection` 미소비. clamp 할 page 도, 해제할 selection 도 존재하지 않는다 | — | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 style object 가 semantic 토큰만 참조한다 — `CategoriesPage.tsx:30-100`(`var(--tds-space-*)` · `var(--tds-radius-md)` · `var(--tds-color-surface-raised)` · `var(--tds-color-feedback-danger-text)`), `CategoryFormModal.tsx:30-34`. hex·px 리터럴·border 키워드 0건 | `apps/admin/src/pages/support/categories/**` 에 `#[0-9a-f]{3,6}` · `[1-9][0-9]*px` · `(outline\|border): (thin\|medium\|thick)` grep = 0. ESLint/stylelint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: 행 수정·삭제 아이콘 버튼의 `tds-ui-focusable`(`:130`, `:139`), DS `<Button>`(`:214`, `:224`), 모달 입력의 `tds-ui-focusable`(`CategoryFormModal.tsx:136`), `ToggleSwitch`(`:155`). ring 두께·색은 DS 토큰이 결정한다 | DS/`app-shell.css` 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면이 띄우는 토스트(`:193`, `:205`)의 entrance easing 은 `Toast.css` 가 결정한다 | DS Toast 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | overlay/floating 표면: `Modal`(`Modal.css:36` `box-shadow: var(--tds-shadow-modal)`) · `ConfirmDialog`(Modal 상속) · `Card`(`:230`) · Toast. 이 화면은 raw box-shadow 를 선언하지 않는다 | DS 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면은 **자체 `<h1>` 을 갖지 않는다** — 페이지 제목은 AppHeader 가 `pageTitleStyle` 로 그린다(`AppHeader.tsx` `titleStyle` = `...pageTitleStyle`) | DS·AppHeader 소유 문서의 판정을 따른다 | 종속 |
| COMP-10 | COMP | N/A | **표면 없음** — 이 화면에 text-search·filter 입력이 없다(목록 전량 렌더). 유일한 텍스트 입력은 모달의 유형 이름 필드(`CategoryFormModal.tsx:133-150`)이며 이는 **폼 입력이지 검색/필터 입력이 아니다** — 키 입력마다 query 를 발행하지 않고 제출 시에만 서버로 간다. IME 조합 중 Enter 도 폼 제출이라 COMP-10 이 겨냥한 부분 query 문제가 성립하지 않는다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제는 `ConfirmDialog` intent `delete` 로 게이트(`:264-275`). busy 중 확인 버튼 `disabled`+`aria-busy`+'처리 중…'(DS `ConfirmDialog.tsx:151-155`). 실패 시 다이얼로그를 **열어둔 채** `error={deleteError}` danger 배너(`:197`, `:272`)를 보이고 재클릭이 곧 재시도. 취소/Esc/딤은 `closeDelete`(`:172-178`)가 in-flight 요청을 `abort()` 하고 `deleteCategory.reset()` 으로 pending 을 되돌린다 | ① `?fail=support-categories:delete` 로 미참조 유형('기타') 삭제 → 다이얼로그가 열린 채 '삭제하지 못했습니다…' 배너, 재클릭이 재요청. ② 삭제 진행 중(400ms) 취소 클릭 → 실패 토스트 0건, 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | N/A | **표면 없음** — 이 화면에 페이지 폼이 없다. 편집은 모달에서만 일어나고(IA-06 taxonomy=modal), 모달 이탈 가드는 FEEDBACK-06 이 소유한다. `useUnsavedChangesDialog`(unload·링크·popstate 3경로)는 `FormPageShell` 계열 페이지 폼용이며 이 화면에 라우트 폼이 없어 배선 대상이 없다. **단 잔여 위험이 있다** — 모달이 dirty 인 채 브라우저 뒤로가기/새로고침하면 두 요구 중 어느 것도 덮지 않는다(§4.2) | — | n-a |
| FEEDBACK-06 | FEEDBACK | 직접 | **★ `a5c2639` 기준으로 pass → gap 으로 뒤집혔다. 배선은 그대로인데 DS Modal 이 바뀌어 깨졌다.** **여전히 맞는 것(배선)**: 모달 폼이 `useModalDirtyGuard(isDirty && !saving, onClose)`(`CategoryFormModal.tsx:66`)를 쓰고 **`requestClose` 를 `Modal.onClose`(`:106`)와 취소 버튼(`:115`) 둘 다에** 넘긴다. `discardDialog` 는 모달 **밖**에 렌더(`:168`)해 포커스 트랩을 피한다. pristine 모달은 즉시 닫힌다(`useModalDirtyGuard.tsx:53-57`). **사용여부 토글만 바꿔도 dirty 가 선다** — `setValue('active', next, { shouldDirty: true })`(`:157`). **깨진 것(DS Modal 의 일방향 latch — PR #26 이 들여온 exit 애니메이션의 부작용)**: `Modal.tsx:122-126` 의 내부 `requestClose` 가 `closingRef.current = true` 로 **latch 를 걸고 리셋하는 코드가 어디에도 없다**(`setClosing(false)`·`closingRef.current = false`·리셋 effect 전부 grep 0건). 추적(dirty 폼): ① Esc/딤/× → `closingRef=true, closing=true` ② `--closing` → `pointer-events:none`(`Modal.css:26-28`) + dialog exit `forwards`(`:35-38`) → **`opacity:0` 고정** ③ `onAnimationEnd`(`Modal.tsx:216-218`) → `onClose()` = 가드의 `requestClose` → **dirty 라 `setAsking(true)` 만 하고 `onClose()` 를 부르지 않는다**(`useModalDirtyGuard.tsx:53-59`) → **부모가 언마운트하지 않는다** ④ 사용자가 discard 다이얼로그에서 '취소'(머무르기) → `setAsking(false)`(`:73`) ⑤ **종착: Modal 은 마운트된 채 `closing` 이 여전히 true — dialog 는 `opacity:0` 으로 안 보이고 오버레이는 `pointer-events:none` 이며, 이후 모든 Esc/딤/× 는 `Modal.tsx:123` 에서 즉시 return 한다. 영구히 닫히지 않고 보이지도 않으며 입력한 내용이 갇힌다.** reduced-motion/jsdom 변종도 동일 latch(경로만 다름 — `Modal.tsx:129-132` 가 `willAnimate()` false 일 때 `onClose()` 를 동기 발사 → 가드 veto → 같은 latch. 이때 dialog 는 *보이지만* 완전 무반응이다). **근인**: `Modal.tsx:19-25` 가 'onClose() → 부모가 언마운트' 를 설계 전제로 문서화하는데, dirty 가드가 그 전제를 깨고 깨졌을 때 latch 를 되돌리는 코드가 없다. **⚠ 4경로 중 '취소' 만 무사하다** — 취소 버튼(`:115`)은 **가드의** `requestClose` 를 직접 부르므로 Modal 내부 `requestClose` 를 거치지 않아 latch 를 걸지 않는다. 즉 **Esc·딤·× 3경로가 깨졌다.** 해소는 `packages/ui` 소유이며 **화면 코드로는 불가능**하다 — 그러나 요구는 이 화면의 표면에서 미충족이므로 gap 으로 판정하고 §5 #7 로 이관한다 | 모달에서 사용여부 토글만 클릭(dirty) → **Esc** → discard 확인 등장 → **'취소'(머무르기) 클릭**. **모달이 사라졌는데 언마운트되지 않고 화면이 잠기면 gap**(현재 gap). 이어 Esc·딤·× 를 눌러도 아무 반응이 없음을 확인. **취소 버튼 경로만 별도로 시험** — 그쪽은 정상 동작해야 한다 | **gap** |
| A11Y-01 | A11Y | 상속 | 이 화면은 삭제 성공(`:193`)·저장 성공(`:205`)·취소(DS `ConfirmDialog` 어댑터 `shared/ui/ConfirmDialog.tsx:39`) 토스트를 띄운다. live region 은 `ToastProvider.tsx:165`(`role="status" aria-live="polite"`)·`:168`(`aria-live="assertive"`)이 **항상 마운트**된 채 제공한다 | ToastProvider 소유 문서의 판정을 따른다 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 삭제 `ConfirmDialog`(`:264-275`) — DS 가 message id 를 `Modal.describedBy` 로 연결한다(`ConfirmDialog.tsx:129-135`). 폼 `Modal`(`CategoryFormModal.tsx:104`)은 본문이 폼 필드라 서술 문단이 없어 `describedBy` 를 넘기지 않는다 | DS Modal/ConfirmDialog 소유 문서의 판정을 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **충족(F3a 가 required 절을 닫았다).** ① **aria-invalid ↔ aria-describedby 페어링** — `CategoryFormModal.tsx:141-142` 가 `aria-invalid={invalid}` 와 `aria-describedby={invalid ? errorIdOf('support-category-label') : undefined}` 를 함께 걸고, `FormField` 가 그 id 로 `role="alert"` 에러 `<p>` 를 렌더한다(`FormField.tsx:109-112`). 짝 없는 `aria-invalid` 0건 — `shared/a11y-guard.test.ts` 가 소스 전수 스캔으로 고정한다. ② **required 노출** — `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 **런타임 `cloneElement`** 로 자식 컨트롤의 `aria-required` 에 주입한다(`:107` `{withAriaRequired(children, required)}`). 이 모달의 `FormField required`(`:127-132`)의 자식은 **네이티브 `<input>`**(`:133-150`)이라 `isRequirableChild`(`:36-41`)의 주입 대상이고, 호출부가 `aria-required` 를 직접 주지 않으므로(`:54` override 없음) `aria-required="true"` 가 실린다. 시각 `*` 마커(`:96-100`, `aria-hidden`)는 그대로 두고 **AT 경로만 더한 것**이다. (사용여부 토글은 boolean 이라 required 대상이 아니다 — 이 화면의 required 컨트롤은 이름 입력 1개뿐이고 그것이 주입된다) | ① 빈 이름으로 '추가' 제출 → RTL 로 `input.getAttribute('aria-describedby')` === `screen.getByRole('alert').id` → **통과**. ② **⚠ grep 으로 판정하지 말 것** — 주입이 런타임이라 이 파일에 `aria-required` 리터럴이 없다(앱 전역 grep 도 1건뿐이며 그것은 `members/components/CreateGroupModal.tsx:192` 의 수동 override 다). RTL 로 모달을 렌더해 `getByLabelText('유형 이름').getAttribute('aria-required')` === `'true'` → **통과** | pass |
| A11Y-12 | A11Y | N/A | **표면 없음** — 이 화면에 좌측 필터 목록·toggle 필터가 없다(`*Filter.tsx`/`*Panel.tsx` 부재). `aria-pressed`/`aria-current` 를 쓸 대상이 존재하지 않는다. (모달의 `ToggleSwitch` 는 `role="switch"` + `aria-checked` 이며 필터가 아니다) | — | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 폼 `Modal`(`CategoryFormModal.tsx:104`) · 삭제 `ConfirmDialog`(`:264`) · discard `ConfirmDialog`(`useModalDirtyGuard.tsx:66`). **⚠ 근거가 낡았다 — 갱신한다.** 이전 기준의 '`Modal.css` 에 enter/exit 애니메이션이 없다'는 **더 이상 사실이 아니다.** PR #26 이 오버레이 모션을 **구현했다. 단 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **`AnimatePresence` 는 여전히 없으나**(모션 라이브러리 자체가 미도입), 요구가 명시한 'exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성됐다. 라이브러리 부재를 gap 으로 볼지는 DS 문서의 몫이다. **⚠ 그러나 그 exit 구현이 이 화면의 FEEDBACK-06 을 깨뜨렸다**(§2 FEEDBACK-06 · §5 #7) — MOTION-01 자체의 판정은 DS 종속으로 유지한다 | DS Modal 소유 문서의 판정을 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면이 띄우는 토스트(`:193`, `:205`)의 exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37`) → keyframes `:121-131`(opacity 1→0 + `translateY`), reduced-motion 게이트 `:136-141`. **요구가 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`) | DS Toast 소유 문서의 판정을 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면은 MOTION-03 이 지목한 바로 그 표면을 갖는다** — 모달의 `ToggleSwitch`(`CategoryFormModal.tsx:155-162`). **★ `a5c2639` 기준으로 그 gap 이 해소됐다.** 이전 기준에선 `ToggleSwitch.css:56`(`transition: transform`)·`:32`(background-color)에 reduced-motion off 가 **없었다**. **지금은 게이트가 실재한다** — `packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 `transition` 을 `none` 으로 끈다(**두 선언을 모두 덮는다**). 주석 `:76-78` 이 근거를 적는다 — 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는 반면, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 **전환을 없애도 정보 손실이 0** 이고 즉시 최종 위치로 스냅한다. 요구가 '`ToggleSwitch.css` 에 누락된 reduced-motion off 를 추가한다'고 **명시적으로 지목**한 항목이며 **이제 충족됐다**. 판정은 DS 종속을 유지한다 — **§5 #7 을 해소로 갱신한다** | DS ToggleSwitch 소유 문서의 판정을 따른다. 재현: `prefers-reduced-motion: reduce` 에뮬레이트 후 사용여부 토글 → **handle 이 스냅하면 충족**(현재 코드 기준 충족) | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 에 등록돼(`App.tsx:241`) `RequireAuth > AppShell` 레이아웃 라우트 아래 `<Outlet>` 으로 렌더된다(`AppShell.tsx:474-494`). **이 화면은 자체 frame 을 도입하지 않는다** — `CategoriesPage.tsx:208-277` 이 sidebar·top bar 없이 콘텐츠만 렌더한다 | `/support/categories` 렌더 시 sidebar+AppHeader+단일 `<main>` 이 정확히 1벌. 페이지가 그리는 `<header>`/`<nav>`/`<aside>` grep = 0 | pass |
| IA-02 | IA | 직접 | 제목은 **단일 메커니즘(AppHeader `findNavLabel(pathname)`)** 으로 해석된다. `/support/categories` 는 nav 리프와 **정확히 일치**하므로(`nav-config.ts:167` `['문의 유형', '/support/categories']`) `findNavLabel` 의 exact 분기(`nav-config.ts:254-255`)가 '문의 유형'을 반환한다 — 브랜치 라벨('고객센터') 폴백(`:257-262`)에 **도달하지 않는다.** IA-02 가 겨냥한 '하위 라우트가 모호한 브랜치 라벨을 보이는' 문제는 **이 화면에 하위 라우트가 없어**(`App.tsx` 에 `/support/categories` 1줄뿐) 성립하지 않는다. **제목이 앱 전역에서 유일하다**('카테고리'로 겹치는 포트폴리오/상품 화면과 달리) | `/support/categories` 의 가시 primary title === '문의 유형'. `App.tsx` 에서 `/support/categories/` 로 시작하는 추가 라우트 grep = 0 | pass |
| IA-04 | IA | 직접 | list 템플릿을 따른다: **툴바 row**(`:210-218` — 좌측 조회 요약, 우상단 primary '유형 추가') → **결과 count 요약**(`:211-213` `전체 N개`) → 목록(`:234-247`). 검색·필터는 이 엔티티에 없어 툴바 좌측이 비고, SelectionBar 는 일괄 작업이 없어 없다. **Pagination**: page size 개념이 없어 전량 렌더하며 '한 page 초과 가능'이 성립하지 않는다 — 대신 BE-027 §7.5 가 유형 수 상한 100개를 계약으로 세워 무한 증가를 막는다 | 우상단 primary action 존재 + count 요약 존재를 렌더로 확인 | pass |
| IA-05 | IA | N/A | **표면 없음** — 이 엔티티는 taxonomy 라 전용 form route(`/new` · `/:id/edit`)가 **의도적으로 없다**(IA-06 무게 규칙). **다만 그 정신(하나의 컴포넌트가 등록/수정 겸용)은 지켜진다** — `CategoryFormModal` 하나가 `editing` 유무로 갈리고(`:44` `const isEdit = editing !== null`) 레이아웃 동일·제목과 prefill 만 다르다(`:105`, `:55`, `:119`) | — | n-a |
| IA-13 | IA | N/A | **표면 없음** — 직렬화할 list query state 가 없다. page·page-size·filter·keyword·sort 가 **전부 존재하지 않고**(목록 전량 렌더), `useListState`·`useSearchParams` 미소비. URL 이 복원할 view 상태가 `/support/categories` 그 자체뿐이라 Back/새로고침/링크 공유가 이미 정확한 view 를 복원한다 | — | n-a |
| EXC-01 | EXC | 상속 | 이 라우트는 AppShell `<Outlet>` 바로 바깥의 `ErrorBoundary`(`AppShell.tsx:484-493`, `resetKey={pathname}`)와 앱 루트 boundary(`App.tsx`) 안에서 렌더된다 | AppShell/ErrorBoundary 소유 문서의 판정을 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 두 층이 이 화면을 덮는다: ① 세션 없는 deep-link → `RequireAuth` 가 AppShell **바깥**에서 `/login?returnUrl=` 로 보낸다. ② mid-session 401 → 전역 쿼리 계층 인터셉터(`queryClient.ts` `QueryCache`/`MutationCache` 의 `onError` → `notifySessionExpired()`)가 조회·쓰기 **양쪽 모두** 잡는다 | RequireAuth/queryClient 소유 문서의 판정을 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **부분 미충족.** ① route-level read 게이팅은 **상속으로 충족** — `RequirePermission` 이 `<Outlet>` 을 감싸(`AppShell.tsx:490`) read 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 리소스는 `resourceIdForPath` 가 nav 리프(`/support/categories`)에서 파생한다. ② **write-action 게이팅이 없다** — `useRouteWritePermissions()`(`RequirePermission.tsx:44-52`)가 존재하지만 **앱 전체에서 소비자가 0** 이다(`apps/admin/src/pages` 전수 grep). 이 화면의 '유형 추가'(`:214`)·행 '수정'(`:128`)·행 '삭제'(`:137`)는 쓰기 권한과 무관하게 렌더·클릭된다 | `remove` 권한이 꺼진 역할로 `/support/categories` 진입 → 삭제 버튼이 **여전히 보이고 눌린다**(현재 fail). 기대: 버튼 미렌더/비활성. read 권한을 끄면 `ForbiddenScreen` → **통과**(①) | **gap** |
| EXC-04 | EXC | 직접 | **절반 해소 — 여전히 미충족(사유 축소).** ✔ **유령 저장/유령 삭제는 닫혔다**: 이 화면의 write 는 `createStoreAdapter`(`shared/crud/crud.ts:165-240`, `data-source.ts:22-31`)를 타는데 F3b 가 `:171` 에 `exists()` 를 넣었다 — `update` 없는 id → **409** `'다른 사용자가 먼저 삭제한 항목입니다.'`(`:219-221`), `remove` 없는 id → **409** `'이미 삭제된 항목입니다.'`(`:232-234`), `fetchOne` 없는 id → **404**(`:192-194`). store 의 `updateCategory`(`support/_shared/store.ts`, `map`)·`removeCategory`(없는 id 면 `countCategoryUsage` 가 0 을 반환해 차단을 통과하고 `filter` 가 아무것도 지우지 않는다)가 여전히 조용히 지나가더라도 **어댑터 경계가 그 앞을 막는다**. 형제 팩토리 `createCrudAdapter` 와 **이제 같은 계약**이다(F2 의 비대칭 해소). ✘ **남은 것 — 낙관적 동시성 토큰**: 그 409 는 **'대상이 아직 존재하는가'** 로만 판정한다. `SupportCategory`(`_shared/domain.ts:17-22`)에 `updatedAt`/`version` 이 없어 If-Match/ETag 로 실을 값이 없고, **둘 다 존재하는 동시 편집은 last-write-wins** 다. 더해 **이 화면의 모달에는 409 복구 UI 가 없다** — `useCrudForm` 의 충돌 다이얼로그를 쓰지 않고(`CategoryFormModal.tsx:58-59` 가 저수준 훅 직접 사용) `onError`(`:80-83`)가 409 를 generic '저장하지 못했습니다…' 배너로 뭉갠다 | ① 탭 A 에서 미참조 유형('기타')을 삭제 → 탭 B 에서 **같은 유형을 수정 후 저장** → **성공 토스트가 뜨지 않고 모달에 '저장하지 못했습니다…' 배너 + 입력 보존** = **유령 저장 해소**(어댑터 409). 그러나 배너가 '다른 사용자가 먼저 삭제했다'고 말하지 않고 재조회 경로도 없다 = 요구의 conflict dialog 미충족. ② 탭 A·B 가 같은 유형 이름을 각각 수정 → **경고 없이 나중 쓰기가 이긴다**. ③ `grep -n 'updatedAt\|version\|If-Match' apps/admin/src/pages/support/categories/` = 0. BE-027 §7.3 이 서버 계약(404 `CATEGORY_NOT_FOUND`)을 세웠다 — **⚠ 계약(404) ↔ 어댑터(409) status 불일치**(BE-027 §7 이관) | **gap** |
| EXC-08 | EXC | 직접 | **미충족 — F3b 이후 격차가 오히려 뚜렷해졌다.** 모달이 `useCrudCreate`/`useCrudUpdate` 저수준 훅을 직접 쓰는데(`CategoryFormModal.tsx:58-59`) 이 훅들 자체에는 **동기 제출 락이 없고**(`shared/crud/crud.ts:282-317` — `useMutation` 한 겹뿐), **호출부가 멱등키를 싣지 않는다**(`:86-95` 가 `CreateVars`/`UpdateVars` 의 `idempotencyKey`(`crud.ts:279`·`:301`)를 비운 채 mutate). 모달의 유일한 방어는 `disabled={saving}`(`:118`, `saving = create.isPending \|\| update.isPending` `:60`)인 **렌더 시점 가드**다. RHF `handleSubmit` 이 zod resolver 를 await 하므로(`:110`) `isPending` 이 true 로 렌더되기 전 틈이 있고, 그 사이 두 번째 Enter 가 두 번째 요청을 만든다. **⚠ F3b 가 그 자리를 이미 만들어 뒀다** — `WriteContext.idempotencyKey`(`crud.ts:30-42`)와 어댑터 측 ledger(`:168`·`:201-203`)가 실재하고 `useCrudForm.ts:103,201-203`(락) + `:118-123,211`(키)이 정본 패턴이다. **이 모달만 그 둘을 물려받지 못했다** — 즉 이제는 '앱에 없는 기능'이 아니라 '이 화면의 미소비'다. 등록(`POST`)은 **비멱등**이라(BE-027 EP-02) 실제로 유형이 2건 생긴다 | 모달에 이름 입력 후 **Enter 를 400ms 안에 2회 연타**(또는 '추가' 더블클릭) → 현재: `addCategory` 가 2회 실행돼 동명 유형 2건. 기대: 요청 정확히 1건. (BE-027 §7.9: 서버의 이름 유니크 제약이 우연히 2건째를 409 로 막지만, 그때 사용자는 성공 대신 실패 배너를 본다) | **gap** |
| EXC-09 | EXC | 직접 | abort 를 단일 공유 predicate 로 non-failure 처리한다: 삭제 `onError` 가 `if (isAbort(cause)) return;`(`:196`)로 배너를 띄우지 않고, 모달 저장 `onError` 도 같다(`CategoryFormModal.tsx:81`). 다이얼로그를 닫으면 `closeDelete`(`:172-178`)가 `abort()` → `deleteCategory.reset()` 으로 `isPending` 을 되돌린다. 성공 콜백도 `controller.signal.aborted` 를 확인해(`:191`) 늦게 온 성공이 토스트를 띄우지 못하게 막는다. 모달은 언마운트 시 `controllerRef.current?.abort()`(`:71`). 캐시는 성공 시에만 무효화된다(`crud.ts:180`, `:218`). 일괄 작업이 없어 '실패 count 에서 abort 제외'는 적용 대상이 없다 | 삭제 진행 중(400ms 창) '취소' 클릭 → 에러 토스트 0건 + 확인 버튼 상태 복원. 모달 저장 중 Esc → 에러 배너 0건, 목록 무변경 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **9** | STATE-01 · STATE-02 · TOKEN-01 · A11Y-11 · FEEDBACK-02 · IA-01 · IA-02 · IA-04 · EXC-09 |
| 종속(상속) | 11 | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | 6 | STATE-04 · COMP-10 · FEEDBACK-04 · A11Y-12 · IA-05 · IA-13 |
| **gap** | **4** | **FEEDBACK-06 · EXC-03 · EXC-04 · EXC-08** |
| **합계** | **30** | 9 + 11 + 6 + 4 = **30** ✓ |

> **`a5c2639` 재판정: P0 gap 이 3 → 4 로 늘었다 — 이 배치에서 유일하게 *후퇴한* 판정이다.** **FEEDBACK-06 이 pass → gap 으로 뒤집혔다.** 이 화면의 배선은 한 줄도 바뀌지 않았다 — **DS Modal 이 PR #26 에서 exit 애니메이션을 들이면서 `closingRef` 일방향 latch 를 함께 들여왔고**(`Modal.tsx:122-126`, 리셋 코드 grep 0건), `useModalDirtyGuard` 가 dirty 일 때 `onClose()` 를 veto 하는 순간 **모달이 보이지 않는 채 영구히 잠긴다**(§2 FEEDBACK-06 의 추적 · §5 #7). **Esc·딤·× 3경로가 깨졌고 '취소' 만 무사하다**(취소는 가드의 `requestClose` 를 직접 불러 Modal 내부 latch 를 거치지 않는다).
>
> **직전 기준(`4b805ad`)에서 뒤집혔던 2건은 그대로 pass 다**: **STATE-01**(F3b 가 `isFetching` 직결을 끊고 `firstLoading`/`refreshing` 파생을 넣었다 — `CategoriesPage.tsx:176-178`) · **A11Y-11**(F3a 의 `withAriaRequired` 런타임 주입 — `FormField.tsx:50-56`). **EXC-04 는 범위가 좁아졌을 뿐**(유령 저장 해소, 동시성 토큰·conflict UI 미해소) **이라 gap 을 유지했다.**
>
> **P0 gap 4건 — quality-bar §How to use 기준 '배치 실패' 사유다.** **판정 집합이 NFR-024(포트폴리오 카테고리)와 여전히 완전히 동일하다** — 두 화면이 같은 골격(`useCrudListQuery` + 저수준 훅 모달 + `createStoreAdapter`)을 공유하기 때문이며, **`PortfolioCategoryFormModal.tsx:104` 도 latch 폭발 반경 9곳에 함께 들어 있어 FEEDBACK-06 도 같이 뒤집힌다.** 4건의 성격: **FEEDBACK-06 은 DS(`packages/ui`) 소유의 신규 회귀**이고, 나머지 3건은 **앱에 기능·선례가 실재하는데 이 화면이 소비하지 않는 것**이다 — EXC-03 은 `useRouteWritePermissions`(최근접 선례 `products/categories/ProductCategoriesPage.tsx:181`), EXC-08 은 `submitLockRef`+`WriteContext.idempotencyKey`(정본 `useCrudForm`), EXC-04 는 `useCrudForm` 의 충돌 다이얼로그. **동시성 토큰만이 도메인 타입 변경(BE-027)을 요구하는 진짜 앱 밖 항목이다.** 한 곳을 고치면 두 화면이 함께 낫는다 — §5 의 '범위' 열 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `placeholderData: (previous) => previous`(`crud.ts:254`)가 **행을 유지**하고, F3b 이후 **가벼운 인디케이터도 성립한다** — `CategoriesPage.tsx:178` `refreshing` + `:224` `{refreshing && ' · 새로고침 중…'}` 가 요약 건수를 지운 자리에 들어가지 않고 **덧붙는다**. `staleTime` 30초가 refetch 시점을 지배. **잔여 흠**: 그 요약 `<p>`(`:222`)에 `aria-busy` 가 없다 — 같은 섹션의 `support/tickets/TicketListPage.tsx:259` · `support/faq/CustomerFaqPage.tsx:209` · 공용 `CrudListShell.tsx:118` 은 `aria-busy={refreshing}` 을 건다 | 재조회 중 행이 blank/재정렬되지 않고 요약이 `전체 N개 · 새로고침 중…` → 통과. `<p aria-busy>` 부재는 §5 로 | 부분 pass |
| STATE-05 | P1 | 빈 상태가 **단일 문구**('등록된 문의 유형이 없습니다.' `:232`)다. 검색·필터가 없어 3분기 중 **truly-empty 만 성립**하나, 전용 Empty 컴포넌트·일러스트가 없다(CTA 는 툴바에 상시 존재) | 전용 Empty 도입 시 truly-empty variant 하나만 소비 | 부분 pass |
| STATE-06 | P1 | **부분 미충족.** write 성공 시 `['support-categories','list']` 는 정확히 무효화되나(`crud.ts:180`·`:199`·`:218`), **라벨을 바꿔도 티켓·답변 템플릿 목록 캐시는 무효화되지 않는다.** 서버(픽스처)는 `updateCategory` 가 `tickets`·`templates` 의 `categoryLabel` 을 이미 갱신했는데(`store.ts:256-261`) 프론트 캐시가 그것을 모른다 → 1:1 문의·문의 답변 화면이 `staleTime` 30초까지 **옛 라벨**을 보인다 | 유형 이름을 바꾼 뒤 즉시 `/support/tickets` 로 이동 → 유형 컬럼이 30초간 옛 라벨. 기대: 즉시 새 라벨 | gap |
| COMP-01 | P1 | **이탈.** 행 수정·삭제가 raw `<button>` + `buttonStyle('ghost')` + `tds-ui-btn-ghost` 로 조립됐다(`:128-149`). 툴바 '유형 추가'(`:214`), 실패 배너 '다시 시도'(`:224`), 모달 footer(`:115`, `:118`)는 DS `<Button>` 사용 | `apps/admin/src/pages/support/categories/` 에서 `buttonStyle(` grep → `:91`, `:131`, `:140`, `:141` 검출 | gap |
| COMP-04 | P1 | 모달의 required 필드가 `FormField required`(`CategoryFormModal.tsx:127-132`)로 `*` 마커를 렌더한다. 사용여부는 required 가 아니며 `fieldLabelStyle` span + `ToggleSwitch` 자체 라벨로 표기(`:153-163`) — bare label 로 **required** 필드를 그린 경우가 아니라 COMP-04 위반이 아니다 | 라벨 '유형 이름' 옆 `*` 존재 | pass |
| COMP-12 | P2 | 이름 입력에 실시간 글자 수 카운터가 없다. `maxLength={CATEGORY_LABEL_MAX}`(`:138`)가 30자에서 **조용히 입력을 멈춘다**. `FormField` 는 `counter` prop 을 제공하나 넘기지 않는다 | 30자 도달 시 카운터·경고 없음 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: write 성공 → 토스트(`:193`, `:205`) / read 실패 → 인라인 Alert(`:220`) / 다이얼로그 내부 실패 → 그 다이얼로그 배너(`:272`) / 모달 내부 실패 → 모달 배너(`CategoryFormModal.tsx:125`). 페이지가 임의 배너 state 를 갖지 않는다 | 각 실패 경로를 `?fail=` 로 구동해 표면 위치 확인 | pass |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 양 경로 피드백을 갖는다 — 삭제(`:193`/`:197`), 저장(`:205`/`CategoryFormModal.tsx:82`). no-op 없음 | `?fail=support-categories:save` · `:delete` 각각 가시 실패 | pass |
| FEEDBACK-05 | P2 | 삭제가 `ConfirmDialog` + 비가역 고지('이 작업은 되돌릴 수 없습니다.' `:268`)로 게이트된다. undo window 는 없다 | 단일 미확인 클릭 삭제 0건 | pass |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 가 결정(delete/discard intent → Cancel) | DS 소유 | 종속 |
| A11Y-13 | P1 | 모달 진입 시 첫 편집 필드 포커스(`initialFocusRef={labelRef}` `:112`), 제출 검증 실패 시 그 필드로 포커스 복귀(`handleSubmit(onValid, () => labelRef.current?.focus())` `:110`) | 모달 open → `activeElement` === 이름 입력. 빈 값 제출 → 같은 입력으로 포커스 | pass |
| A11Y-16 | P1 | 사용여부 `ToggleSwitch` 는 DS atom 으로 `role="switch"`·keyboard·focus ring·이중 인코딩(문구 '사용'/'미사용' + 색)을 상속한다. 이 화면이 접근 이름을 준다(`label="유형 사용여부"` `:159`) | DS ToggleSwitch 계약 + 이 화면의 label prop | pass |
| IA-03 | P1 | breadcrumb 없음 — AppHeader 가 '문의 유형' 한 단어만 보인다. **이 화면은 제목이 앱 전역에서 유일**해 포트폴리오/상품 '카테고리'만큼 심각하지 않으나, 섹션 trail('고객센터 > 문의 유형')은 여전히 없다 | detail/form route 부재라 IA-03 의 주 표적(하위 라우트)은 성립 안 함 | gap(경미) |
| IA-06 | P1 | **무게 규칙 부합.** 유형은 필드 2개(`label`·`active`)짜리 짧은 taxonomy 라 inline-list + Modal 로 편집한다(`:256-262`) — 전용 form route 없음(`App.tsx:241` 이 유일). 반대로 rich 엔티티인 답변 템플릿은 route 폼(`App.tsx:243-244` `/support/replies/new` · `/:id/edit`), 티켓은 detail route(`:240`)를 쓴다. 혼용 없음 — quality-bar 가 예시로 든 'support categories(modal)' 그대로 | `App.tsx` 에 `/support/categories/**` 하위 라우트 grep = 0 + 모달 컴포넌트 존재 | pass |
| IA-14 | P1 | 반응형 선언 없음(앱 전역). 행 좌측이 `flexWrap: wrap`(`:72`)이라 배지가 접히지만, 행 자체(`:54-65`)는 wrap 없이 `space-between` 이라 좁은 폭에서 액션이 압축된다. ghost 아이콘 버튼의 touch-target 미검증 | 375px 에서 행 레이아웃·아이콘 타깃 크기 확인 | gap(앱 전역) |
| ERP-01 | P1 | 이 화면의 `StatusBadge` tone 선택이 **인라인 삼항**이다 — 사용여부(`:122` `category.active ? 'success' : 'neutral'`)·사용량(`:125` `inUse ? 'info' : 'neutral'`). 중앙 status→tone 레지스트리를 쓰지 않는다. 다만 `active`/`inUse` 는 ERP lifecycle status(승인/반려/배송중…)가 아니라 boolean 이라 ERP-01 의 주 표적과는 결이 다르다 | 레지스트리 도입 시 boolean 축 포함 여부 판단 필요 | 경미 |
| ERP-06 | P1 | **문구 충돌.** 사용여부가 꺼지고 참조도 0인 유형(시드 '기타' — `store.ts:28`)은 `'미사용'`(사용여부 `:123`)과 `'사용 안 함'`(참조 0 — `domain.ts:43`) **두 neutral 배지가 나란히** 붙는다. 뜻이 전혀 다른데(선택지에서 숨김 / 참조가 없음) 문구·톤이 거의 같다. 또 0-참조 문구가 포트폴리오 카테고리('미사용' — `portfolio/categories/types.ts:15`)와 달라 같은 의미에 두 표현이 쓰인다 | '기타' 행의 배지 2개를 나란히 읽기 | gap |
| ERP-13 | P1 | **조사(助詞) 파손 — 잔존(사유 전환).** 통합이 조사 헬퍼를 `shared/format.ts:269+` 로 승격했고 이 화면의 나머지 문구는 조사가 고정이라 옳다(`:204`·`:216`·`:282` 의 '유형을' 은 '유형' 이 받침 있는 고정어라 문제없다). **그러나 삭제 차단 버튼의 접근 이름은 여전히 파손이다** — `CategoriesPage.tsx:142` `` `${category.label} — ${usage}라 삭제할 수 없습니다` `` 는 '티켓 3 · 템플릿 1**라** 삭제할 수 없습니다' 를 낸다(→ '…**이라**'). **승격된 헬퍼로도 고칠 수 없다**: `format.ts` 가 내보내는 것은 `objectParticle`(을/를 `:306`) · `topicParticle`(은/는 `:311`) · `directionParticle`((으)로 `:321`) 뿐이고 **계사 '이라/라' 헬퍼가 없다**. 더해 `usage`(`_shared/domain.ts` `categoryUsageLabel`)는 **숫자로 끝나** 한글 받침 판정 자체가 불가능하다 — 헬퍼가 생겨도 숫자 발음 규칙(1=일 → 받침 ㄹ)을 따로 다뤄야 한다. `:144` 의 `title` 은 조사를 피해 가 파손이 없다. `portfolio/categories/PortfolioCategoriesPage.tsx:141` 이 같은 문구를 복제한다 | 참조 중 유형의 삭제 버튼 `aria-label` 읽기 → '… 티켓 3 · 템플릿 1라 삭제할 수 없습니다'. 앱 전역 사용자 대상 `'을(를)'`/`'이(가)'` 리터럴은 **0건**이라 ERP-13 의 나머지 절은 충족 — 이 한 줄이 유일한 잔여 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 0건(앱 전역). `wait(LATENCY_MS, signal)` 에 상한 없음 | never-resolving fixture 로 ceiling 부재 확인 | gap(앱 전역) |
| EXC-06 | P1 | 어댑터가 `HttpError`(status 보유)를 던질 수 있고 `dev.ts` `?status=` 가 재현하나, **이 화면은 status 로 분기하지 않는다** — 조회/저장/삭제 실패가 각각 문구 1개(`:223`, `CategoryFormModal.tsx:82`, `:197`). 403/404/409/422/429/500 이 모두 같아 보인다. **BE-027 §7.6 이 새로 세운 422 `LAST_ACTIVE_CATEGORY` 도 여기로 떨어진다** | `?status=save:409` vs `?status=save:422` vs `?status=save:500` → 동일 문구 | gap |
| EXC-07 | P1 | 서버 422 field error 를 RHF `setError` 로 매핑하는 경로 없음 — 서버 실패는 전부 모달 상단 generic 배너로 간다 | `?status=save:422` → 필드 인라인 에러 없음 | gap |
| EXC-10 | P1 | N/A — 일괄 작업이 없다(선택·bulk 미존재) | — | n-a |
| EXC-11 | P1 | `navigator.onLine` 0건(앱 전역) | offline 토글 시 배너 없음 | gap(앱 전역) |
| EXC-12 | P1 | N/A — detail/edit **route** 가 없다(모달 편집). 404 vs generic 구분이 걸릴 라우트 표면이 없다 | — | n-a |
| EXC-14 | P1 | N/A — 낙관적 업데이트를 쓰지 않는다(전부 pessimistic + 무효화). 사용여부조차 목록 인라인 토글이 아니라 모달 저장이라 낙관 반영 대상이 없다 | — | n-a |
| EXC-15 | P1 | N/A — 파일 업로드 표면 없음 | — | n-a |
| EXC-18 | P1 | N/A — selection·bulk 표면 없음 | — | n-a |
| EXC-20 | P1 | 5xx 에 복사 가능한 reference code 를 보이지 않는다 — 모든 실패가 '…잠시 후 다시 시도해 주세요.' 로 수렴. raw stack/서버 body 노출은 없음(후자는 준수) | `?status=list:500` → 참조 코드 미표시 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 |
|---|---|---|
| 목록 조회 응답 p95 | 400ms (백엔드 연결 후 계약값 — BE-027 EP-01 레이트리밋 분당 120회 전제) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 픽스처에 심은 값이다 |
| 사용량 계산 비용 | 목록 응답 안에서 상수 시간(집계 쿼리/카운터 컬럼) | **픽스처는 O(유형 수 × (티켓 수 + 템플릿 수))** — `withUsage`(`store.ts:222-225`)가 유형마다 `countCategoryUsage` 를 부르고, 그 함수는 티켓·템플릿을 각각 `filter` 한다(`usage.ts:18-19`). 유형 6 × 티켓 4 인 지금은 무의미하지만, **티켓은 고객이 무한히 쌓는 컬렉션**이라 실서버에서 그대로 옮기면 목록 조회가 티켓 수에 비례해 느려진다 — BE-027 §7.10 #9 로 이관 |
| 첫 렌더(진입 → 목록 가시) | 지연 상수 + 렌더 < 600ms | 픽스처 400ms + 목록 렌더. 유형 수가 작아 렌더 비용은 무시 가능 |
| 재조회 횟수 | 진입 1회 + 쓰기 성공마다 1회. `staleTime` 30초 내 재진입은 0회 | 준수 — `queryClient.ts` `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false` |
| 메모리 | 유형 전량 상주(상한 100개 — BE-027 §7.5). 행당 5필드라 무시 가능 | 상한 미구현(계약만 존재) |
| 번들 | 이 화면 전용 코드는 페이지 1 + 모달 1 + 어댑터/검증. `_shared`(도메인·저장소·사용량)는 고객센터 3화면이 공유 | 전용 코드가 작다. 라우트 분할 대상 아님 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 수동 재시도 | **충족** — `:220-228`. 자동 재시도 없음(`retry: false`)이 의도 |
| 저장·삭제 중 화면 이탈 | in-flight abort · false 실패 없음 | **충족** — 모달 언마운트 abort(`:71`), 다이얼로그 취소 abort(`:173`), `isAbort` 필터(`:81`, `:196`) |
| 세션 만료(mid-session 401) | 재인증 경로 + 원래 위치 복원 | **상속 충족** — 전역 인터셉터. 단 **모달에 입력 중이면 입력이 사라진다**(EXC-19 P1 — draft 스냅샷 없음) |
| **모달 dirty 상태에서 브라우저 뒤로가기·새로고침** | 입력 손실 경고 | **미충족 — 어느 요구도 덮지 않는다.** FEEDBACK-06 은 모달 4경로만, FEEDBACK-04 는 페이지 폼만 정의한다. quality-bar 의 사각지대 — §5 #6 |
| **모달 dirty 상태에서 Esc·딤·× → discard 확인에서 '취소'(머무르기)** | 모달이 그대로 열려 있고 계속 편집할 수 있다 | **미충족 — ★ 신규 회귀(`a5c2639`).** DS Modal 의 `closingRef` latch 가 리셋되지 않아 **모달이 보이지 않는 채 영구히 잠기고 입력이 갇힌다**(§2 FEEDBACK-06 · §5 #7). **이 화면에서 가장 무거운 신규 결함** — 사용자가 '머무르기'를 골랐는데 오히려 데이터를 잃는다. '취소' 버튼 경로만 무사하다 |
| 이미 삭제된 유형 조작 | 대상 부재 알림 | **미충족** — 유령 저장/삭제(EXC-04 gap · BE-027 §7.3) |
| **고객이 삭제 직전에 문의를 접수** | 서버가 삭제를 거절 | **프론트는 원리적으로 못 막는다** — 참조를 관리자가 아니라 고객이 만들기 때문이다(BE-027 §7.1). 서버 재확인이 유일한 방어선이며 그 계약을 BE-027 EP-04(422 `CATEGORY_IN_USE`)가 세웠다. 현재 픽스처의 `removeCategory` 도 삭제 시점에 다시 세므로(`store.ts:266`) 같은 결 |
| **모든 유형의 사용여부를 끔** | 신규 문의 접수 경로 보호 | **미충족** — 이 화면에 최소 1개 보장이 없다. 모달의 토글은 다른 유형의 상태를 모른다. 활성이 0개가 되면 `listActiveCategories()` 가 빈 배열을 반환해 고객 문의 폼의 선택지가 사라진다 — **화면에는 아무 경고도 없다.** BE-027 §7.6 이 서버 계약(422 `LAST_ACTIVE_CATEGORY`)을 세웠으나 프론트 대응 UI 는 미구현 — §5 #8 |
| 다른 관리자의 동시 편집 | 마지막 쓰기 승리 + 대상 부재는 알림 | 마지막 쓰기 승리는 의도(BE-027 §7.3 — 필드가 둘뿐이라 병합할 것이 없다). 대상 부재 알림이 빠진 것이 결함 |
| 오프라인 | 배너 + write 게이팅 | **미충족**(EXC-11 P1 · 앱 전역) |

### 4.3 데이터 보존 · 감사

| 축 | 상태 |
|---|---|
| 삭제 복구 | 없다 — 하드 삭제이고 undo window 도 없다. **참조 중 차단(BE-027 §7.1)이 실질적 보호 장치**다: 지울 수 있는 것은 항상 참조 0인 유형뿐이라 손실 규모가 '이름 1개 + 사용여부'로 제한된다. **사용여부(소프트 비활성)가 삭제의 안전한 대안으로 설계돼 있고**(FS-027-EL-005 힌트가 이를 안내한다) 이것이 이 화면의 데이터 보존 전략이다 — 국내 CS 관례('참조되는 데이터는 하드 삭제하지 않는다')와 일치 |
| 감사 로그 | 없다 — 누가 언제 유형을 추가·수정·삭제했는지, **사용여부를 언제 껐는지** 남지 않는다. 엔티티에 `updatedAt`/`createdBy` 필드조차 없다(`domain.ts:17-22`). 사용여부 전환은 고객 문의 접수 경로에 영향을 주므로(§4.2) 감사 가치가 특히 크다 — 백엔드 설계 시 판단 필요 |
| 라벨 변경 이력 | 없다 — 라벨을 바꾸면 참조 티켓·템플릿의 비정규화 라벨이 덮이고 이전 값은 사라진다. **과거 티켓이 접수 당시의 유형명을 잃는다** — '배송'을 '배송/물류'로 바꾸면 3년 전 티켓도 소급해 새 이름으로 보인다. 의도된 동작인지 확인 필요(BE-027 §7.4 가 전파를 계약으로 세웠다) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| ~~1~~ | ~~STATE-01~~ | ~~P0~~ | **해소됨(F3b)** — `CategoriesPage.tsx:176-178` 이 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 를 파생하고 요약(`:223`)·빈 상태(`:245`)가 `firstLoading` 만 읽는다. **'같은 패턴' 이라 적었던 화면들도 함께 고쳐졌다** — `PortfolioCategoriesPage.tsx:175-177` · `CustomerFaqPage.tsx:72-74` · `TicketListPage.tsx:163-165` 를 직접 확인했다 | — | — |
| ~~2~~ | ~~A11Y-11~~ | ~~P0~~ | **해소됨(F3a)** — `FormField.tsx:50-56` `withAriaRequired` 가 런타임 `cloneElement` 로 `aria-required` 를 주입하고, 이 모달의 required `FormField`(`:127-132`)의 자식이 네이티브 `<input>` 이라 주입 대상이다. ⚠ 소스 grep 으로는 관측되지 않는다 — 렌더 테스트로 확인할 것 | — | — |
| 3 | EXC-03 | **P0** | 쓰기 액션 게이팅 부재 — **`useRouteWritePermissions`(`RequirePermission.tsx:45`)는 이제 7곳이 소비하지만**(products 3 · settings 4) 이 화면은 그 밖이다. 읽기 전용 역할이 추가·수정·삭제 버튼을 그대로 보고 누른다. **최근접 선례가 같은 taxonomy+모달 패턴인 `products/categories/ProductCategoriesPage.tsx:181`** 이다. route read 게이팅(①)은 충족 | **이 화면**(공용 훅 + 7곳 선례 존재) | A11 change_request |
| 4 | EXC-04 | **P0** | **동시성 토큰 부재** — `SupportCategory`(`_shared/domain.ts:17-22`)에 `updatedAt`/`version` 이 없어 낙관적 토큰을 실을 수 없다(동시 편집 = last-write-wins). 더해 **모달에 409 복구 UI 가 없다** — 저수준 훅을 직접 써 `useCrudForm` 의 충돌 다이얼로그를 물려받지 못했고 `onError`(`CategoryFormModal.tsx:80-83`)가 409 를 generic 배너로 뭉갠다. *(유령 저장/삭제는 F3b 의 `createStoreAdapter` 존재 검사(`crud.ts:219-221`·`:232-234`)로 해소 — `createCrudAdapter` 와의 비대칭도 사라졌다)* | 이 화면 + 도메인 모델 | A11 change_request · A63(BE-027 §7.3 — **계약 404 ↔ 어댑터 409 status 불일치 확정 필요** + `version` 필드) |
| 5 | EXC-08 | **P0** | 모달이 `useCrudCreate`/`useCrudUpdate` 를 직접 써 **동기 제출 락이 없고 멱등키를 싣지 않는다**(`CategoryFormModal.tsx:86-95` 가 `idempotencyKey` 를 비운 채 mutate). `disabled={saving}` 렌더 가드만 존재 → 빠른 double-Enter 가 비멱등 POST 2건. **F3b 가 자리를 이미 만들어 뒀다** — `WriteContext.idempotencyKey`(`crud.ts:30-42`) + 어댑터 ledger(`:168`·`:201-203`), 정본 패턴은 `useCrudForm.ts:103,201-203`(락)·`:118-123,211`(키) | 이 화면(+ 저수준 훅으로 조립한 다른 모달형 화면) | A11 change_request |
| 6 | (사각지대) | — | 모달 dirty 상태에서 **브라우저 뒤로가기·새로고침** 시 입력이 조용히 사라진다 — FEEDBACK-06(모달 4경로)과 FEEDBACK-04(페이지 폼 3경로) 어느 쪽도 이 경로를 정의하지 않는다. quality-bar 자체의 공백 | 앱 전역(폼 모달 전부) | A64(quality-bar 개정 검토) · A11 |
| ~~7a~~ | ~~MOTION-03~~ | ~~P0~~ | **해소됨(`a5c2639` · PR #26)** — `ToggleSwitch.css:79-84` 가 `.tds-toggle__track`·`.tds-toggle__knob` 의 transition 을 `none` 으로 끈다(`:32` background-color · `:56` transform 두 선언 모두 덮음). 근거 주석 `:76-78`(손잡이 transform 은 움직임이라 vestibular 영향 · 상태는 색·위치·`aria-checked` 로 이미 전달되므로 정보 손실 0). **이 화면이 지목된 표면(모달 `ToggleSwitch`)을 갖지만 더 이상 gap 이 아니다** | — | — |
| **7** | **FEEDBACK-06** | **P0** | **★ 신규 — pass 였다가 뒤집혔다. DS Modal 의 일방향 latch.** `Modal.tsx:122-126` 의 `requestClose` 가 `closingRef.current = true` 로 latch 를 걸고 **리셋이 전무하다**(`setClosing(false)`·`closingRef.current = false`·리셋 effect grep 0건). `useModalDirtyGuard` 가 dirty 일 때 `onClose()` 대신 `setAsking(true)` 만 하므로(`useModalDirtyGuard.tsx:53-59`) **부모가 언마운트하지 않고**, 사용자가 '취소'(머무르기)를 누르면(`:73`) **Modal 은 마운트된 채 `closing=true` 로 남아 dialog 는 `opacity:0`(`Modal.css:35-38` exit `forwards`) · 오버레이는 `pointer-events:none`(`:26-28`) · 이후 모든 Esc/딤/× 는 `Modal.tsx:123` 에서 즉시 return → 영구히 닫히지 않고 보이지도 않으며 입력이 갇힌다.** reduced-motion/jsdom 변종은 `Modal.tsx:129-132` 경유로 같은 종착(이때 dialog 는 *보이지만* 무반응). **근인**: `Modal.tsx:19-25` 가 'onClose() → 부모가 언마운트'를 설계 전제로 문서화하는데 dirty 가드가 그 전제를 깨고, 깨졌을 때 latch 를 되돌릴 신호가 없다(`onClose` 가 `void` 반환). **최소 수정은 DS 소유**다. **⚠ '취소' 경로만 무사하다**(가드의 `requestClose` 직행 — Modal 내부 latch 미경유). **폭발 반경 9곳**(`onClose={requestClose}` grep): `CreateGroupModal.tsx:154` · `LogoFormModal.tsx:126` · `PasswordChangeModal.tsx:103` · `RoleFormModal.tsx:68` · `PortfolioCategoryFormModal.tsx:104` · `ProductCategoryFormModal.tsx:104` · `CreateApiKeyModal.tsx:182` · `RevealKeyModal.tsx:126` · **`CategoryFormModal.tsx:106`(이 화면)**. **Toast 는 같은 패턴이나 버그가 아니다** — `exitingRef` 도 리셋되지 않지만 `onDismiss(id)` 를 ToastProvider 큐 `filter` 가 소유하고 veto 경로가 없어 항상 언마운트된다 | **`packages/ui`(DS) — 폼 모달 9곳 전부** | **A40(DS) · A11 (최우선)** |
| 8 | (BE-027 §7.6) | — | **모든 유형의 사용여부를 끄면 고객 문의 접수 경로가 막힌다** — 화면에 최소 1개 보장·경고가 없다. BE-027 §7.6 이 서버 계약(422 `LAST_ACTIVE_CATEGORY`)을 세웠으나 프론트 대응 UI 가 없어 generic 배너로 떨어진다 | 이 화면 | A11 change_request |
| 9 | STATE-06 | P1 | 라벨 수정 후 티켓·답변 템플릿 목록 캐시를 무효화하지 않아 30초간 옛 라벨이 보인다(`useCrudUpdate` 가 `['support-categories', …]` 키만 무효화 — `crud.ts:198-201`) | 이 화면 → 고객센터 3화면 | A11 |
| 10 | COMP-01 | P1 | 행 수정·삭제가 raw `<button>` + `buttonStyle('ghost')` 로 조립(`:91`, `:128-149`) — DS `<Button>` 미사용 | 이 화면(+ COMP-01 appliesTo 목록) | A11 |
| 11 | ERP-06 | P1 | **배지 문구 충돌** — 시드 '기타'(active=false, 참조 0) 행에 `'미사용'`(사용여부)과 `'사용 안 함'`(참조 0) 두 neutral 배지가 나란히 붙어 뜻이 구분되지 않는다. 또 0-참조 문구가 포트폴리오 카테고리('미사용')와 불일치 | 이 화면 + `portfolio/categories` | A11 |
| 12 | ERP-13 | P1 | 삭제 차단 aria-label 의 조사 파손 — '티켓 3 · 템플릿 1**라** 삭제할 수 없습니다'(`:142`). **조사 헬퍼는 이제 `shared/format.ts:269+` 에 있지만 계사 '이라/라' 가 없고**(`objectParticle`·`topicParticle`·`directionParticle` 3종뿐), 더해 `usage` 가 **숫자로 끝나** 한글 받침 판정이 불가능하다 — 헬퍼 확장 + 숫자 발음 규칙이 선행돼야 한다. 앱 전역 사용자 대상 `'을(를)'` 리터럴은 0건이므로 ERP-13 의 나머지 절은 충족 | `shared/format`(헬퍼 확장) + 이 화면 · `portfolio/categories/PortfolioCategoriesPage.tsx:141`(같은 문구 복제) | A40 · A11 |
| 13 | EXC-06 · EXC-07 · EXC-20 | P1 | 실패가 status 로 갈리지 않는다 — 403/404/409/422/429/500 이 전부 같은 문구. BE-027 §7.6 의 422 `LAST_ACTIVE_CATEGORY` 도 여기로 수렴. 422 field error 매핑 없음. 5xx 참조 코드 없음 | 앱 전역(+ 이 화면 3개 실패 표면) | A11 · A63 |
| 14 | EXC-05 · EXC-11 · IA-14 | P1 | 클라이언트 타임아웃 상한(`AbortSignal.timeout` 0건)·오프라인 감지(`navigator.onLine` 0건)·반응형 선언 부재 | **앱 전역** | A40 · A11 |
| 15 | (성능) | — | 사용량 계산이 매 조회마다 티켓·템플릿 전량 순회(`usage.ts:12-21` · `store.ts:222-225`) — 티켓은 고객이 무한히 쌓는 컬렉션이라 실서버에서 목록 조회가 티켓 수에 비례해 느려진다. 서버는 집계 쿼리/카운터로 상수화(§4.1) | 백엔드 설계 | A63 (BE-027 §7.10 #9) |
| 16 | COMP-12 | P2 | 이름 입력에 글자 수 카운터 없음 — `maxLength=30`(`:138`)이 예고 없이 입력을 멈춘다 | 이 화면 | A11 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래는 판정을 재현하려는 사람을 위한 스위치 목록이며, 실제 구동 결과가 아니다.

**이 화면의 실패 재현 스코프**: `support-categories` (`data-source.ts:15-16` — `CATEGORY_RESOURCE` 가 react-query 키 루트와 실패 스코프를 겸한다)

**`?fail=` — generic Error 재현** (`shared/crud/dev.ts` `failIfRequested(scope, op)`)

| 스위치 | 걸리는 어댑터 함수 | 화면 표면 |
|---|---|---|
| `?fail=list` · `?fail=support-categories:list` | `fetchAll` (`crud.ts:174-178`) | 조회 실패 배너 FS-027-EL-006 |
| `?fail=save` · `?fail=support-categories:save` | `create`·`update` (`:121-130`) — **두 함수가 같은 op 을 공유한다** | 모달 저장 실패 배너 FS-027-EL-007.4 |
| `?fail=delete` · `?fail=support-categories:delete` | `remove` (`:131-135`) | 다이얼로그 실패 배너 FS-027-EL-008.1 |
| `?fail=detail` · `?fail=support-categories:detail` | `fetchOne` (`:116-120`) | **관측 불가 — 이 화면에 `fetchOne` 소비자가 없다**(BE-027 §7.7) |
| `?fail=all` | 전부 | 위 전부 |

**`?status=<op>:<code>` — status 지정 재현** (`dev.ts` `STATUS_PARAM`) — `HttpError(status, message)` 를 던진다. 재현 가능 코드: 400·401·403·404·409·412·422·429·500.
예: `?status=save:409`(중복 이름 — BE-027 §7.2) · `?status=save:422`(마지막 활성 유형 — BE-027 §7.6) · `?status=delete:422`(참조 중 — BE-027 §7.1) · `?status=list:401`(세션 만료 → 전역 인터셉터) · `?status=all:500`.
**단 이 화면은 status 로 분기하지 않는다** — 전부 같은 문구로 수렴한다(§3 EXC-06 gap). 이 스위치는 **현재 gap 을 입증하는 도구**다.

**`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고(`LATENCY_MS = 400` 고정 상수), `?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다. STATE-01 재현에 `?delay=3000` 을 쓸 수 없으므로 **§2 STATE-01 의 측정 기준은 '쓰기 → 무효화 → 재조회 400ms 창'** 으로 잡았다.

**픽스처 시드로 재현 가능한 경계** (`_shared/store.ts:22-29`)
- `cat-etc`('기타') — `active: false` + 참조 0 → **삭제 가능한 유일한 시드 유형**이자 §3 ERP-06 배지 충돌('미사용' + '사용 안 함')이 관측되는 행
- `cat-order`·`cat-delivery`·`cat-return` — 티켓·템플릿 참조 있음 → 삭제 버튼 잠금 + `aria-label` 조사 파손(§3 ERP-13) 관측
- `cat-account` — 티켓 1(`tkt-4`)·템플릿 0 → `티켓 1 · 템플릿 0` 배지
- `cat-tech` — 참조 0, `active: true` → 삭제 가능

**정적 검사**
- `pnpm verify:all` — Airbnb ESLint / stylelint 0 warning(TOKEN-01)
- `apps/admin/src/pages/support/_shared/domain.test.ts` — 도메인 순수 규칙. **단 `categoryInUse`/`categoryUsageLabel`/`removeCategory` 차단에 대한 전용 테스트가 이 화면에는 없다** — 포트폴리오 카테고리는 `categories.test.ts` 로 그것을 덮는다(비대칭). 참조 무결성의 프론트 절반에 회귀 테스트가 없다는 뜻 → §5 후속 검토
- grep 근거: `buttonStyle(` (COMP-01) · `useRouteWritePermissions` (EXC-03 — 이 화면 0 / 앱 전역 7) · `submitLockRef` (EXC-08 — 이 화면 0) · **`prefers-reduced-motion` in `ToggleSwitch.css` (MOTION-03 — ⚠ 이제 1건: `:79-84`. 이전 기준의 '0건' 은 낡았다)** · **`setClosing(false)`·`closingRef.current = false` in `Modal.tsx` (FEEDBACK-06 — 0건 = latch 리셋 부재의 근거, §5 #7)**
- **⚠ A11Y-11 은 grep 으로 판정하지 않는다**: `withAriaRequired`(`FormField.tsx:50-56`)의 주입은 **런타임 `cloneElement`** 라 소스 스캔에 잡히지 않는다(앱 전역 `aria-required` grep = 1건이며 그것은 무관한 수동 override 다). 판정·회귀 방어는 **렌더 테스트**와 **호출부 자식 타입 검사**로 한다

## 7. 자기 점검

- [x] P0 30건을 quality-bar 가 정한 순서 그대로 전수 판정했다 — 30행, 빈칸 0건
- [x] §2.1 산수 검산 — pass 10 + 종속 11 + n-a 6 + gap 3 = **30** ✓
- [x] **판정 기준일을 `2026-07-17 · HEAD = a5c2639` 로 갱신하고 PR #22·#24·#26·#28·#30·#32·#34 이후 코드로 전수 재확인했다.** **뒤집힌 P0 1건**: **FEEDBACK-06 `pass` → `gap`**(DS Modal 의 `closingRef` 일방향 latch — 이 화면 코드는 그대로인데 `packages/ui` 변경이 깨뜨렸다). **§2.1 을 pass 10→9 · gap 3→4 로 고치고 산수를 다시 검산했다**(9+11+6+4 = 30 ✓). **MOTION-03 은 근거가 반대로 뒤집혔으나**(`ToggleSwitch.css:79-84` 게이트 실재 → gap 해소) **판정은 `종속` 유지**라 건수에 영향이 없다 — §5 #7a 를 해소로 표시했다. MOTION-01/02 는 근거 텍스트만 갱신했다(오버레이 모션 CSS-only 구현 · '`Modal.css` 에 애니메이션이 없다'는 낡은 관측을 삭제). 직전 기준에서 뒤집혔던 STATE-01·A11Y-11 은 그대로 pass 다. **EXC-04 는 범위만 좁아졌으므로 gap 을 유지했다**(유령 저장 해소 ≠ 동시성 토큰 충족). **NFR-024 와의 판정 집합 일치는 유지된다** — `PortfolioCategoryFormModal.tsx:104` 도 latch 폭발 반경에 함께 들어 있다
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 달았다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 달았다
- [x] 모든 `N/A` 에 '왜 이 화면에 그 표면이 없는가' 사유를 달았다
- [x] `상속` 은 이 화면에 표면이 실재하는 것만 적고, 어느 표면이 그 계약을 상속하는지 못 박았다 — MOTION-03 은 `ToggleSwitch` 라는 **구체적 위반 표면**이 이 화면에 있음을 밝히고 §5 #7 로 기록했다
- [x] quality-bar 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 성능 예산이 아님을 §4.1 에 명시했다
- [x] §6 의 `?fail=` scope 를 어댑터 코드에서 확인했다(`support-categories` · op 4종). **`?delay=` 를 쓰지 않았다** — 이 화면에 없음을 명시했다
- [x] FS-027 §7 ↔ BE-027 §7.10 ↔ 이 문서 §5 의 gap 집합을 일치시켰다
- [x] NFR-024(쌍둥이 화면)와 판정 집합이 일치함을 확인했다 — 두 화면이 같은 공용 계층을 공유하므로 P0 gap 5건이 동일하다
- [x] E2E 를 실행하지 않았고, 그 사실을 §6 머리에 명시했다
