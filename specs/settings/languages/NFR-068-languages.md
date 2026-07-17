---
id: NFR-068
functionalSpec: FS-068
backendSpec: BE-068
qualityBar: specs/quality-bar.md
title: "언어 관리 비기능 명세"
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-068. 언어 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-068 언어 관리 (`/settings/languages`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-068(요소·예외) · BE-068(계약·판정) · **NFR-067(형제 화면 — 공유 셸·저장소의 판정이 대부분 동일하다)** · `specs/quality-bar.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-068 §7 · BE-068 §7.6 과 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **MOTION-02 `gap` → `pass`** · **MOTION-03 `gap` → `pass`** · **MOTION-01 `gap` → `종속`** — 전부 **PR #26**(오버레이 모션 CSS-only 구현 · `Toast.css:32-37,121-131` exit 신설 · **`Modal.css:173-180` reduced-motion 게이트 신설**). 이전 배치가 든 gap 사유가 코드로 해소됐다. **P0 gap 5 → 2** — 남는 것은 **A11Y-11**(이 화면 고유 — 그룹 오류 미연결)과 **EXC-08**(멱등키 부재)이며 **둘 다 PR #26·#30 의 사정권 밖이라 그대로다** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 `pages/settings/languages/**` · 섹션 공유 `pages/settings/_shared/**`)의 코드가 충족을 결정 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 충족 / 미충족(§5 이관) / 소유 문서의 판정이 미확정이라 그것을 따름 |

> **`상속` + `gap` 조합**: 소유가 DS 라도 **그 상태가 코드로 확정된 경우**(예: Motion 라이브러리 미도입)에는 `종속` 이 아니라 `gap` 으로 적는다 — 이 화면에 표면이 실재하는 이상 사용자가 결함을 겪기 때문이다. **해소는 앱 코드로 불가능**하며 이관 대상이 DS 임을 §5 에 명시한다. (NFR-067 §1.1 과 같은 규약)

### 1.2 화면 성격

**단일 문서 폼(잎 라우트)이다** — NFR-067 과 같은 성격이며 **같은 셸(`SettingsFormShell`)·같은 저장소(`createRevisionedStore`)·같은 훅(`useSettingsQuery`/`useSaveSettings`/`useSubmitLock`)을 공유**한다. 그래서 STATE·EXC·FEEDBACK 계열 판정이 NFR-067 과 대부분 일치한다 — **그 사실 자체가 공유 레이어가 작동한다는 증거**이며, 이 문서는 일치하는 항목을 근거와 함께 재확인하고 **갈리는 항목만 강조**한다.

**이 화면만의 성격 셋**:
1. **체크박스 그룹**이 있다 — 다른 3화면에 없는 표면이라 A11Y 판정이 갈린다(§2 A11Y-11).
2. **시크릿·자유 텍스트가 없다** — 전 필드가 enum/enum 배열이라 XSS·마스킹 축이 통째로 N/A 다(BE-068 §7.1).
3. **소비자가 없다** — 저장은 되나 번역이 적용되지 않는다. 화면이 그 사실을 배너로 밝힌다(FS-068-EL-010). **이것은 결함이 아니라 명세된 동작**이며 quality-bar 밖 축으로 §4.3 에 기록한다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** `LanguagesPage.tsx:165` `const loading = isFetching && data === undefined` — **첫 로딩만** 판정한다(`isFetching` 직결이 아니다). `SettingsFormShell` 이 세 상태를 배타적으로 그린다: 조회 실패 → 배너만(`:125-138`, early return) / 첫 로딩 → 스켈레톤만(`:152-157`) / 그 외 → 폼(`:159`). **재조회 중에는 이전 체크 상태·select 값이 유지된다.** 0행 empty 는 해당 없음(단일 문서) | `/settings/languages` 진입 → 폼 렌더 확인 → `staleTime` 30초 경과 후 재진입(또는 devtools invalidate). **폼이 스켈레톤으로 바뀌지 않으면 pass.** `?fail=load` → 배너만 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** `SettingsFormShell.tsx:125-138` 이 조회 실패 시 `<Alert tone="danger">` + '다시 시도'(`onRetry` → `refetch` — `:282`)를 **폼 대신** 렌더한다. error toast 를 쓰지 않는다 — 이 화면의 `toast` 호출은 성공 2건뿐(`:209` 저장 · `:252` 최신 불러오기). 저장 실패도 토스트가 아니라 카드 배너(`:219` → `:283`) | `/settings/languages?fail=load` 진입. **danger Alert + '다시 시도' 가 뜨고 토스트가 없으면 pass** | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 페이지네이션·행 선택·목록이 하나도 없다 — 단일 문서 폼이다(§1.2). 'page clamp' · 'selection 리셋' 이 걸릴 표면이 존재하지 않는다. **체크박스 4개는 selection 이 아니라 폼 값**이다(URL·page 와 무관하며 필터가 아니다) | 목록·선택이 도입되면 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `grep -rnE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/settings/` → **0건**(2026-07-17). 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. 파생 치수도 토큰 배수 — `minmax(calc(var(--tds-space-6) * 7), 1fr)`(`:85`). `fieldset` 리셋도 `borderWidth: 0` 숫자 0(단위 없는 0 은 px 리터럴이 아니다 — `:94-95`) | 위 grep → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: DS `<Checkbox>`·`<SelectField>`·`<Button>`. **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건). ⚠ 이 화면은 `tds-ui-focusable` 을 직접 쓰지 않는다 — 텍스트 `<input>` 이 없기 때문(전 컨트롤이 DS 컴포넌트) | DS 토큰 문서 판정을 따른다. 로컬 `:focus-visible` 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `SettingsFormShell.tsx:155`) · **Toast enter/exit**(`Toast.css:26-27` · `:32-37`) · **Modal enter/exit**(`Modal.css:20-21,30-38,58-59` — 같은 recipe). ⚠ **PR #26 으로 이 화면이 상속하는 easing 소비 표면이 늘었다** — `component.overlay.{enter,exit}-easing`(`tokens/tokens.json:1293-1307`)이 신설 소비자이고 `Toast`·`Modal` 이 **같은 recipe 를 함께 쓴다**(`tokens.json:1287` — '오버레이는 한 몸처럼 움직인다') · DS `<Button>`·`<Checkbox>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css`·`Modal.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`SettingsFormShell.tsx:145`) · Modal(확인·충돌 다이얼로그 — `Modal.css:20` `box-shadow: var(--tds-shadow-overlay)`) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다**(`grep -rn "h1" apps/admin/src/pages/settings/` → **0건**). 제목은 **AppHeader 가 소유**하며(`AppHeader.tsx:101`) nav 잎 라벨 '언어 관리'를 렌더한다. `CardTitle`('언어 설정' — `:278`)은 `<h1>` 이 아니라 카드 시맨틱이다. **이 화면이 title 타이포를 직접 선언하지 않는다.** ⚠ nav 라벨과 카드 제목이 다른 것은 타이포 문제가 아니라 **카피 일관성** 문제다(FS-068 §7 #5 — §3 ERP 축) | AppHeader `titleStyle` 이 title tier 를 참조하는지 확인. 로컬 title 스타일 선언이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 검색 입력이 없다 — `grep -rn "SearchField\|useDebouncedSearch" pages/settings/` → **0건**. 단일 문서 폼이라 조회할 query 자체가 없다. 'IME 조합 중 커밋 금지 + 디바운스 + stale 응답 무효'가 걸릴 자리가 존재하지 않는다. **이 화면에는 텍스트 입력조차 없다** — 전 컨트롤이 체크박스·select 다 | 검색 입력이 도입되면 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족.** 파괴적 서버 액션 표면은 **저장 확인 다이얼로그**(FS-068-EL-019)다 — intent 는 `update` 이나 요구가 정한 계약(강제실패 시 dialog 유지 + retry, 중간닫기 = abort)이 그대로 걸린다. ① **강제실패가 다이얼로그를 유지한다** — `onError` 가 `setSaveError(...)`(`:219`)만 하고 `setPending(null)` 을 하지 않아 다이얼로그가 살아 있고, `error={saveError}`(`:401`)로 그 안에 배너가 뜬다. **재클릭이 곧 재시도** ② **중간닫기 = abort** — `cancelSave`(`:237-244`)가 `abort()` + `save.reset()` + `lock.release()`. DS 가 busy 중에도 취소를 살려 둔다(`ConfirmDialog.tsx:144`). intent→tone/label/icon 과 초기 포커스는 DS 소유 | `/settings/languages?fail=save` 에서 언어를 켜고 저장 → 확인. **다이얼로그가 열린 채 danger 배너가 뜨고 확인 버튼이 재활성되면 pass.** 저장 중(400ms) '취소' → 실패 토스트·배너가 없어야 한다 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `SettingsFormShell.tsx:122` `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })`. `dirty` 는 RHF `formState.isDirty`(`:143` → `:285`), 기준선은 `reset(data.value)`(`:158`). 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유(`useUnsavedChangesDialog.tsx:127,151,178`). 문구 '언어 설정에 저장하지 않은 변경 사항이 있습니다…'(`:41-42`). **저장 후 통과**: 성공 시 `reset(values)`(`:206`)로 dirty 가 풀려 가드가 내려간다. **저장 중에는 가드하지 않는다**(`dirty && !saving`) | 영어 체크박스를 켠 뒤 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** **편집 가능한 폼을 담은 modal 이 없다** — 폼은 라우트 본문의 `<Card>` 로 렌더된다(`SettingsFormShell.tsx:145`). 이 화면의 modal 은 둘 다 **입력 필드가 없는 확인 다이얼로그**다: 저장 확인 `ConfirmDialog`(FS-068-EL-019) · 충돌 `ConflictDialog`(FS-068-EL-022, 본문이 `<p>`·`<ul>`·`<Alert>` 뿐 — `ConflictDialog.tsx:106-132`). 이탈 가드도 확인 전용. 'modal 4경로 dirty 가드'가 걸릴 dirty 상태가 modal 안에 없다 — **라우트 레벨 dirty 는 FEEDBACK-04 가 담당**. (같은 섹션의 `CreateApiKeyModal` 은 폼 modal 이라 NFR-069 에서 이 요구가 `직접` 으로 살아난다) | 폼 modal 이 도입되면 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | toast 표면 2건: 저장 성공 `toast.success('언어 설정을 저장했습니다.')`(`:209`) · 충돌 해소 `toast.success('최신 언어 설정을 불러왔습니다.')`(`:252`). 지속 live region 은 `ToastProvider` 가 소유(비-error=polite · error=assertive 2벌 — `Toast.types.ts:15`) — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | dialog 표면 3건 모두 `aria-describedby` 가 배선돼 있다: ① **저장 확인** — DS `ConfirmDialog` 가 `useId` 로 message id 를 만들어 `Modal describedBy` 로 넘긴다(`ConfirmDialog.tsx:129,135`) ② **충돌** — `ConflictDialog.tsx:88` `useId()` → `:94` `describedBy={messageId}` → `:107` `<p id={messageId}>` ③ **이탈 가드** — 훅이 `ConfirmDialog` 를 렌더. `Modal.tsx:158` 이 `aria-describedby={describedBy}` 를 dialog 노드에 건다 | DS 판정에 종속. 충돌 다이얼로그 open 시 본문이 title 과 함께 읽히는지 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **부분 미충족 — 이 화면 고유의 결함이 있다.** **① required 노출 — 충족.** required FormField 2개(기본 언어 `:338-344` · 폴백 언어 `:364-370`)의 자식이 **DS `SelectField`**(`:345`,`:371`)라 `FormField.tsx:36-41` `isRequirableChild` 를 통과하고 `withAriaRequired`(`:50-56`)가 **런타임 `cloneElement` 로 `aria-required` 를 주입**한다. 래퍼로 감싼 required 자식이 **0건** — OAuth(NFR-070)가 겪는 결함이 여기엔 없다. **체크박스 4개는 `required` 가 아니다**(그룹 규칙이라 개별 필수가 아니다) → 주입 대상이 아니다. ⚠ **`aria-required` grep 이 0건인 것으로 판정하면 안 된다 — 주입은 런타임이다** **② aria-invalid without describedby = 0건 — 충족.** 이 화면의 `aria-invalid` 는 `SelectField` 의 `isInvalid` prop 경유 2건뿐이고(`:348`,`:374`) 호출부가 바로 다음 줄에서 `aria-describedby` 를 **조건 동일하게** 짝지운다(`:349-353`,`:375-377` — 둘 다 `errors.X?.message !== undefined` 를 조건으로 `errorIdOf('lang-default'\|'lang-fallback')`). `FormField` 가 같은 id 로 `<p id={errorIdOf(htmlFor)} role="alert">`(`FormField.tsx:110`)를 렌더하므로 **id 가 일치**한다 **③ ⚠ 그룹 오류가 어느 컨트롤의 것인지 연결되지 않는다 — 미충족.** `:331` 이 `<p id={errorIdOf('lang-supported')} role="alert">` 를 렌더하지만 **`lang-supported` 라는 id 의 요소가 존재하지 않고**(체크박스 id 는 `lang-supported-ko` 등 — `:311`), **어떤 컨트롤도 이 오류를 `aria-describedby` 로 참조하지 않는다.** 즉 '지원 언어를 하나 이상 선택하세요' 오류가 **떠 있는 id 를 가리키는 고아**다. `role="alert"` 라 announce 는 되므로 완전 침묵은 아니나, 요구의 'required 노출/오류 연결' 취지에 미달한다. **④ ⚠ 잠긴 체크박스가 이유를 말하지 않는다** — `disabled = disabled \|\| locked`(`:314`)인데 잠금 사유 문구(`:320-324` '기본 언어라 끌 수 없습니다')가 **형제 `<span>` 일 뿐 `aria-describedby` 로 연결돼 있지 않다.** 시각 사용자만 이유를 안다 | `grep -rn "aria-invalid\|errorIdOf" pages/settings/languages` → 각 히트마다 참조 대상 id 가 **실재하는지** 확인. RTL: 모든 언어를 끄려 시도(잠금 때문에 불가) → 대신 `defaultLanguage` 를 목록 밖으로 만들어 오류 유발 → `select.getAttribute('aria-describedby') === screen.getByRole('alert').id` assert. **`document.getElementById('lang-supported')` 가 `null` 이면 ③은 gap** | **gap** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** **필터가 없다**(단일 문서 폼 — §1.2). `aria-pressed` 를 쓸 toggle 필터 list item 이 존재하지 않으며, 이 화면 전체에 `aria-current` **0건**. **체크박스 4개는 필터가 아니라 폼 값**이며 네이티브 `checked` 로 상태를 노출한다(DS `Checkbox` 가 `<input type="checkbox">` 를 렌더) — 이 요구의 appliesTo(‘필터 selected=aria-pressed’)가 아니다 | 좌측 토글 필터가 도입되면 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다.** Modal 표면이 실재한다(저장 확인 · 충돌 · 이탈 가드 — 3종). backdrop fade + dialog scale 이 실재한다: backdrop enter `Modal.css:20-21`→`@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33`→`tds-modal-backdrop-out :136-144` · dialog enter `:58-59`→`tds-modal-dialog-in :146-156`(opacity 0→1 · `scale(0.96)→scale(1)`) · exit `:35-38`→`tds-modal-dialog-out :158-168`(`forwards`). reduced-motion 게이트 `:173-180`. `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **`AnimatePresence` 는 없고**(`packages/ui/src` Motion/framer-motion 소비 **0건** — 라이브러리 미도입) 요구문의 'exit 완료 후에만 unmount' 를 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성한다. **잔여**: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`Modal.tsx:27-31`) — **이 화면의 다이얼로그 3종은 footer 가 주 닫기 수단이다**. **라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 몫** | 저장 확인 다이얼로그를 연다. **backdrop 이 fade in 하고 dialog 가 `scale(0.96)→1` 로 들어오면 enter 는 충족.** Esc 로 닫아 exit 를 관찰하고, **footer '취소' 로 닫으면 exit 없이 즉시 사라지는 것**을 대조한다 | **종속** |
| MOTION-02 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** Toast 표면이 실재한다(`:209,252`). exit 애니메이션이 실재한다: `.tds-toast--exiting` `Toast.css:32-37`(`tds-toast-out … forwards` + `pointer-events: none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). enter `:26-27`/`:109-119`. **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`). exit 완료 후 unmount 는 `TOAST_EXIT_ANIMATION` 대조 `onAnimationEnd` 로 달성. reduced-motion 게이트 `Toast.css:136-141`. queue/ARIA 유지는 `ToastProvider` 소유 | 저장 성공 → 토스트 자동소멸 관찰. **opacity fade + 아래로 translate 후 사라지면 pass** | **pass** |
| MOTION-03 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** reduced-motion 게이트가 걸려야 할 이 화면의 표면: DS `Checkbox` · `SelectField` · `Button` · 스켈레톤 펄스 · Toast · Modal. **`ToggleSwitch` 는 이 화면에 없다**(사이트·OAuth 화면에만 있다) — 요구가 명시 지목한 그 컴포넌트의 게이트도 이번 기준에서 신설됐고(`ToggleSwitch.css:79-84`) NFR-067 §2 · NFR-070 §2 가 그 해소를 기록한다. **이전 배치가 든 이 화면의 위반 2건이 해소됐다**: ① **Modal 에 reduced-motion 게이트가 생겼다** — `Modal.css:173-180` 이 `.tds-modal__backdrop, .tds-modal__dialog, .tds-modal__overlay--closing .tds-modal__backdrop, .tds-modal__overlay--closing .tds-modal__dialog { animation: none; }` 로 **enter 뿐 아니라 exit 도 끈다**(`--closing` 조합자를 명시 나열) ② 나머지 표면도 각자 게이트를 갖는다 — Toast `Toast.css:136-141` · 스켈레톤 `shared/ui/ui.css:110-114`. 설계가 단일 게이트다 — **CSS 가 유일 판정자이고 JS 는 결과를 읽기만 한다**(`willAnimate()` — `Modal.tsx:45-55` 주석). **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) | OS reduced-motion 으로 두고 `/settings/languages` 에서 체크박스·select 조작 · 다이얼로그 열기. `grep -rn "prefers-reduced-motion" packages/ui/src/organisms/Modal/Modal.css` → **`:173` 히트** | **pass** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:338` `{ path: '/settings/languages', element: <LanguagesPage />, implemented: true }`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={pageStyle}>`(`SettingsFormShell.tsx:141`). `App.tsx:335-336` 주석이 구조를 밝힌다: 'AppShell 이 `<Outlet>` 을 RequirePermission 으로 감싸 모든 라우트를 한 번에 덮는다' | `/settings/languages` 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족.** `/settings/languages` 는 **nav 잎**이다(`nav-config.ts:228` `['언어 관리', '/settings/languages']`) — 하위 라우트가 없다. `findCoveringLeaf('/settings/languages')`(`nav-config.ts:270-278`)가 **자기 자신을 정확히 찾고** `findNavLabel`(`:297-299`)이 `'언어 관리'` 를 반환한다. AppHeader 가 `<h1>` 으로 렌더(`AppHeader.tsx:101`). **이 화면은 in-content `<h1>` 을 그리지 않는다** — grep **0건**. 따라서 **`<h1>` 이 정확히 1개이고 title 메커니즘이 단일하다.** GROUND-TRUTH §7 의 gap 두 갈래(가지 라벨 폴백 · h1 이중)가 **여기엔 둘 다 없다.** 'sub-route 가 구체 title' 절은 하위 라우트가 없어 발생하지 않는다. ⚠ **카드 제목('언어 설정')이 nav 라벨('언어 관리')과 다른 것은 IA-02 위반이 아니다** — 카드 제목은 title 메커니즘이 아니라 카드 시맨틱이며 `<h1>` 이 아니다. 다만 카피 일관성 문제로 §3(ERP) · §5 #6 에 기록 | `/settings/languages` 진입. **AppHeader 의 가시 `<h1>` 이 '언어 관리'이고 `document.querySelectorAll('h1').length === 1` 이면 pass** | **pass** |
| IA-04 | IA | N/A | **표면이 없다.** **list 화면이 아니다** — 단일 문서 폼이다(§1.2). 표·결과 count·우상단 목록 action·SelectionBar·Pagination 이 하나도 없고, 있어야 할 이유도 없다(문서가 1건이다). ⚠ **체크박스 4행이 `<ul>` 이지만 그것은 list 화면이 아니라 폼 컨트롤 그룹**이다(`<fieldset>` 안에 있다 — `:298-328`). 요구의 appliesTo('list 템플릿')가 성립하지 않는다 | 이 라우트에 목록이 도입되면 다시 매긴다 | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다.** `/settings/languages` 단일 라우트이며 `/new`·`/:id/edit` 가 없다 — **설정 문서는 생성·삭제되지 않고 편집만 된다**(BE-068 §5 404 축: '문서는 항상 존재한다'). '`new` 와 `:id/edit` 가 동일 폼 컴포넌트' 라는 요구가 걸리지 않는다 | 폼 라우트 쌍이 생기면 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** **URL 에 직렬화할 list state 가 없다** — 필터·검색·정렬·페이지가 하나도 없다. `grep -rn "useListState\|useSearchParams" pages/settings/` → **0건**. 폼 입력값은 list state 가 아니다(URL 에 넣으면 미저장 설정이 히스토리·리퍼러에 남는다 — 넣지 않는 것이 옳다). **`?fail=` 개발 스위치는 URL 을 읽지만**(`store.ts:61`) **list state 가 아니다** | 필터·검색이 도입되면 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:18,484` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 **소비자**다. `AppShell.tsx:478` 이 경계의 자리를 밝힌다. 루트 경계도 별도로 있다(`App.tsx:368`) | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로를 상속한다: ① **진입 가드** — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② **세션 중 401** — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=load:401` 로 `/login?returnUrl=%2Fsettings%2Flanguages&reason=session_expired` 로 가는지 확인. (미저장 입력 유실은 EXC-19 P1 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 이 배치에서 해소됐다.** 기존 문서 배치가 '`useRouteWritePermissions` 소비자 **앱 전체 0건**'으로 gap 판정했으나 **이 화면은 그 소비자다.** ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더. 리소스는 라우트 파생(`route-resource.ts:32-35` → `findCoveringLeaf` → `page:/settings/languages`) ② **write 게이팅(직접)** — `LanguagesPage.tsx:126` `const { canUpdate } = useRouteWritePermissions()` → `:286` `canUpdate={canUpdate}` → `SettingsFormShell.tsx:166` `{canUpdate && (…저장 버튼…)}`. **버튼을 disabled 로 두지 않고 렌더 자체를 하지 않는다**(`:165` '눌러 보고 403 을 받는 자리를 만들지 않는다'). 대신 info 배너로 **이유를 말한다**(`:149`). 필드도 전부 비활성(`:167` `disabled = saving \|\| loading \|\| !canUpdate` → 체크박스 `:314` · select `:347,373`) ③ **강등 reconcile** — `useRouteCan` 이 `usePermissions()` 를 구독하므로 권한 스토어가 바뀌면 재렌더돼 **버튼이 그냥 사라진다**(`RequirePermission.tsx:23-25` 가 설계로 선언). 별도 코드 없음 | 권한 스토어에서 `page:/settings/languages` 의 `update` 를 끄고 진입. **저장 버튼·상태 문구가 사라지고 '조회 권한만 있습니다…' info 배너가 뜨며 체크박스·select 가 전부 비활성이면 pass.** `read` 를 끄면 403 화면. 화면을 연 채 update 를 끄면 버튼이 즉시 사라지는지(강등) | **pass** |
| EXC-04 | EXC | 직접 | **충족 — 이 섹션은 진짜 동시성 토큰을 쓴다.** ① **409/412 conflict dialog** — `_shared/store.ts:124-126` 이 `input.expectedRevision !== current.revision` 이면 `SettingsConflictError(current)` 를 던지고, 화면이 `isSettingsConflict(cause)`(`:214`)로 일반 실패와 갈라 `ConflictDialog` 를 세운다(`:407-419`). **3-액션**(최신 불러오기 · 덮어쓰기 · 닫기)이며 `ConflictDialog.tsx:5-10` 이 왜 이지선다가 아닌지 밝힌다 ② **입력 보존** — 다이얼로그가 뜬 동안 폼이 그대로 살아 있다(`ConflictDialog.tsx:11-13`). `setConflict` 만 하고 `reset` 을 하지 않는다(`:215-216`). **diverge 한 field 를 표시한다** — `divergedLabels(getValues(), conflict.value, LANGUAGE_FIELD_LABELS)`(`:267-270`). **이 화면이 배열 비교의 근거 사례다** — `diff.ts:9-11` 이 `supported: ['ko']` 를 예로 들며 참조 비교면 '지원 언어가 달라졌다'고 거짓말한다고 적는다 ③ **ghost saved 없음** — `createRevisionedStore` 는 `map` no-op 이 아니라 클로저 1건을 통째로 교체하므로(`store.ts:128-132`) '없는 대상을 조용히 지나치고 성공' 경로가 **구조적으로 없다**. ⚠ **`createStoreAdapter` 와 다르다** — 그쪽 409 는 '존재 여부' 기반이라 동시 편집이 last-write-wins 지만(GROUND-TRUTH §4), 여기는 **revision 토큰 비교**라 둘 다 존재해도 거절된다. 회귀 테스트 `store.test.ts:54-69` 가 못박는다 | `/settings/languages?fail=conflict` 에서 언어를 켜고 저장 → 확인. **'언어 설정이 이미 변경되었습니다' 다이얼로그가 뜨고, 내 체크 상태가 폼에 그대로 있고, 달라진 항목이 라벨로 나열되면 pass.** `store.test.ts` 6건 통과로도 판정 | **pass** |
| EXC-08 | EXC | 직접 | **부분 미충족.** ① **`submitLockRef` + disable — 충족.** `useSubmitLock()`(`_shared/queries.ts:58-75`)이 `useRef` 동기 잠금을 제공하고 `runSave` 첫머리에서 `if (!lock.acquire()) return`(`:194`)으로 건다. 성공·실패 양쪽에서 `release`(`:204,212`). 버튼도 `disabled={!dirty \|\| saving \|\| loading}`(`SettingsFormShell.tsx:179`). `queries.ts:54-55` 가 왜 disabled 만으로 부족한지 밝힌다 ② **'retry 가 동일 Idempotency-Key' — 미충족.** 멱등키가 **없다**(`grep -rn "Idempotency\|idempotency" pages/settings/` → **0건**). 앱에 선례가 있는데도(`members/components/PointsCard.tsx:103,162-173` · `members/data-source.ts:248` 심) 쓰지 않는다. **완화 요인(중요)**: PUT + `expectedRevision` 이라 응답 유실 후 재시도는 **중복 적용이 아니라 409** 가 된다 — 데이터는 안전하다(BE-068 §7.4). **남는 결함은 UX**: 사용자가 자기 저장이 이미 성공한 줄 모르고 재시도했다가 **'다른 관리자가 저장했다'는 거짓 충돌 다이얼로그**를 본다. 그 '다른 관리자'는 자기 자신이다 | 저장 확인 다이얼로그의 확인 버튼을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 1건만 나가면 ①은 pass.** `grep -rn "Idempotency" pages/settings/` → **0건이면 ②는 gap** | **gap** |
| EXC-09 | EXC | 직접 | **충족.** 네 지점이 배선돼 있다. ① **onError** — `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:213`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 ② **onSuccess** — `if (controller.signal.aborted) return;`(`:205`)로 취소된 요청의 성공 콜백이 토스트·reset 을 일으키지 않는다 ③ **mutation.reset** — `cancelSave`(`:240`) · `closeConflict`(`:262`)가 `save.reset()` 을 부른다 ④ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:154`). bulk 표면이 없어 '실패 count 제외' 절은 무관 | 저장 중(400ms 창) 확인 다이얼로그의 '취소' 클릭. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다. 저장 중 사이드바 링크로 이탈 → 같은 확인 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · **MOTION-02** · **MOTION-03** · IA-01 · IA-02 · EXC-03 · EXC-04 · EXC-09 |
| `종속` | **9** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · **MOTION-01** · EXC-01 · EXC-02 |
| `n-a` | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| `gap` | **2** | **A11Y-11** · EXC-08 |
| **합계** | **30** | 12 + 9 + 7 + 2 = **30** ✓ |

**검산 (P0 30건 전수 · 지정 순서대로 나열해 셈)**

| # | 요구 ID | 판정 | # | 요구 ID | 판정 |
|---|---|---|---|---|---|
| 1 | STATE-01 | pass | 16 | MOTION-01 | 종속 |
| 2 | STATE-02 | pass | 17 | MOTION-02 | pass |
| 3 | STATE-04 | n-a | 18 | MOTION-03 | pass |
| 4 | TOKEN-01 | pass | 19 | IA-01 | pass |
| 5 | TOKEN-02 | 종속 | 20 | IA-02 | pass |
| 6 | TOKEN-03 | 종속 | 21 | IA-04 | n-a |
| 7 | TOKEN-04 | 종속 | 22 | IA-05 | n-a |
| 8 | TOKEN-05 | 종속 | 23 | IA-13 | n-a |
| 9 | COMP-10 | n-a | 24 | EXC-01 | 종속 |
| 10 | FEEDBACK-02 | pass | 25 | EXC-02 | 종속 |
| 11 | FEEDBACK-04 | pass | 26 | EXC-03 | pass |
| 12 | FEEDBACK-06 | n-a | 27 | EXC-04 | pass |
| 13 | A11Y-01 | 종속 | 28 | EXC-08 | gap |
| 14 | A11Y-02 | 종속 | 29 | EXC-09 | pass |
| 15 | **A11Y-11** | **gap** | 30 | A11Y-12 | n-a |

> 30행 전수 · `pass` 12 + `종속` 9 + `n-a` 7 + `gap` 2 = **30** ✓

> **P0 gap 2건 — 이번 기준(`a5c2639`) 갱신으로 5건에서 줄었다.** 뒤집힌 3건은 전부 **PR #26** 이다: **MOTION-02**(Toast exit 신설 — `Toast.css:32-37,121-131`) · **MOTION-03**(Modal reduced-motion 게이트 신설 — `Modal.css:173-180`) 은 **`pass` 로**, **MOTION-01** 은 오버레이 모션이 구현됐으나 **CSS-only** 라(라이브러리 부재는 여전하다) **`종속` 으로** 바뀌었다. **이전 배치가 든 gap 사유가 코드로 해소된 것이지 판정 기준이 느슨해진 것이 아니다.**
>
> **잔여 P0 gap 2건은 전부 화면 코드로 해소 가능하며 이번 기준에서 바뀐 것이 없다**: **A11Y-11**(고아 오류 id + 잠금 사유 미연결 — **이 화면 고유**. PR #30 의 DS 층 작업은 `ImageUploadField`·`SegmentPicker`·`OAuthProviderCard` 를 손댔고 **이 화면의 표면은 그 셋에 없다** — 이 화면의 required 는 `SelectField` 경유라 이미 pass 였다) · **EXC-08**(멱등키 — `If-Match` 가 데이터 안전을 이미 보장해 잔여는 UX). ⚠ **같은 섹션의 API Key 화면은 이번 기준에서 EXC-08 이 pass 로 뒤집혔다**(`api-keys/data-source.ts:107-141`) — **선례가 둘로 늘었다**.
>
> **형제 화면과의 차이 (기록)**: NFR-067(사이트 설정)은 A11Y-11 이 **pass** 다 — 그 화면의 required FormField 자식이 전부 `input`/`SelectField` 이고 오류 id 가 전부 실재하는 컨트롤을 가리킨다. **이 화면만 체크박스 그룹이 있어** 그룹 오류의 연결 대상이 모호해졌고, 그 자리에서 고아 id 가 생겼다. **A11Y-11 은 화면마다 다시 매겨야 하며 섹션 단위로 일반화하면 틀린다** — NFR-070(OAuth)은 또 다른 이유로 gap 이다(래퍼 `<span>`).
>
> **이 화면이 해소한 앱 전역 gap 2건 (기록)**: **EXC-03** — 기존 문서가 '소비자 앱 전체 0건'으로 gap 판정했으나 이 화면이 소비자다(`LanguagesPage.tsx:126`). **EXC-04** — 기존 문서가 '유령 저장 · 토큰 없음'으로 gap 판정했으나 이 섹션은 revision 토큰을 쓴다(`store.ts:124-126`).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·검색·필터·페이지네이션·업로드·CSV·시크릿·자유 텍스트)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 재조회 중 이전 폼 값이 유지된다 — `loading = isFetching && data === undefined`(`:165`)라 스켈레톤이 덮지 않는다. 단 `useEffect([data, reset])`(`:156-159`)가 **편집 중 재조회에서도 `reset` 을 돌려** 체크 상태를 덮는다(FS-068 §7 #8) — 이전 '행'이 아니라 **사용자 입력**이 사라지는 결이라 요구의 취지와 반대 방향으로 위반한다 | 체크박스를 고치는 중 devtools 로 invalidate → 상태가 유지되는지 | **gap** |
| STATE-05 | P1 | **표면 부재.** 단일 문서라 0건 상태가 없다 — 문서는 항상 존재한다(BE-068 §5). **체크박스 후보도 코드 상수 4건이라 0건이 될 수 없다** | — | **n-a** |
| STATE-06 | P1 | 저장 성공 시 `useSaveSettings.onSuccess` 가 `setQueryData(key, saved)` + `invalidateQueries`(`_shared/queries.ts:45-46`) — 자기 변경이 즉시 보이고 새 revision 이 곧바로 유효하다. `queries.ts:44` 가 왜 invalidate 만으로 부족한지 밝힌다 | 저장 후 `AuditNote` 가 갱신되는지 | **pass** |
| COMP-01 | P1 | DS `<Checkbox>`·`<SelectField>`·`<Button>`·`<Alert>`·`<Card>`·`<Modal>` 을 쓴다. `buttonStyle()`/`tds-ui-btn-*` 손조립 **0건**(grep). ⚠ `Checkbox` 를 앱 배럴이 아니라 `@tds/ui` public entry 에서 직접 가져온다(`:16-18`) — **의도된 우회**('배럴은 F2 소유라 이번 배치에서 넓히지 않는다')이며 DS 컴포넌트를 쓴다는 사실은 변하지 않는다 | `grep -n "buttonStyle(\|tds-ui-btn-" pages/settings/languages` → 0건 | **pass** |
| COMP-04 | P1 | **텍스트 입력이 없다** — 전 컨트롤이 DS `Checkbox`·`SelectField` 다. `_shared/fields.tsx` 의 `TextInputField` 를 이 화면은 쓰지 않는다(쓸 필드가 없다) | 필드 블록 복사가 없는지 | **pass** |
| COMP-05 | P1 | 체크박스 그룹이 `<fieldset>` + `<legend>` 로 묶여 있다(`:298-299`) — `role="group"` + `aria-label` 손조립이 아니라 네이티브 시맨틱을 쓴다. **보이는 라벨을 Checkbox 가 그리고 옆에 또 쓰지 않는다**(`:309` '옆에 또 쓰면 접근 가능한 이름이 두 번 읽힌다') | 그룹이 `<fieldset>`/`<legend>` 인지 | **pass** |
| COMP-12 | P1 | **표면 부재.** 길이 제한 필드가 없다 — 전 필드가 enum/enum 배열이라 카운터·상한 경고가 걸릴 자리가 없다 | — | **n-a** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패 = 인라인 Alert(`SettingsFormShell.tsx:128`) · write 성공 = toast(`:209`) · write 실패 = 카드/다이얼로그 배너(`:283,401`). write 실패가 toast 가 아닌 것은 **폼 맥락**(입력 보존 + 그 자리 재시도)이라 이탈로 보지 않는다. ✔ **표시 조건이 정확하다** — `saveError !== null && pending === null && conflict === null`(`:283`)이 세 조건을 전부 본다. **사이트 설정(`SiteSettingsPage.tsx:264`)은 `conflict === null` 을 빠뜨려 중복 표시된다 — 이 화면이 옳다** | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지. 충돌 다이얼로그가 떠 있을 때 배너가 뒤에 중복되지 않는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast) · 실패(배너) 양 경로가 배선돼 있다(`:203-221`). **no-op 클릭이 없다** — 저장 버튼은 `!dirty` 면 비활성이고 그 이유를 문구가 말한다('변경 사항이 없습니다.' — `SettingsFormShell.tsx:173`) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P1 | **부분.** 저장 확인 문구가 결과를 말하긴 한다('이후 사이트가 노출하는 언어 목록이 바뀝니다' — `:47-48`). **그러나 무엇이 바뀌는지 이름으로 말하지 않는다** — 고정 문구다. **OAuth 화면은 말한다**(`OAuthPage.tsx:48-74` — '카카오 로그인을 끕니다. 이 방식으로 가입한 사용자는 로그인할 수 없게 됩니다.'). 같은 섹션 안에서 확인 문구의 구체성이 갈렸다(FS-068 §7 #6). **완화**: 이 화면의 저장은 되돌리기 쉽고 사이트를 내리지 않는다 — 사이트 설정·OAuth 보다 위험이 낮아 고정 문구가 과실이라 보기는 어렵다 | 확인 문구가 어느 언어를 켜고 끄는지 말하는지 | **gap(경미)** |
| A11Y-13 | P1 | **폼 진입 시 첫 필드 자동 포커스가 없고, 검증 실패 시 첫 오류 필드로 포커스가 이동하지 않는다** — `handleSubmit(onValid)`(`:296`)에 `onInvalid` 콜백이 없어 `setFocus` 경로가 없다. `useCrudForm` 의 `onInvalid`/`setFocus`(`useCrudForm.ts:176-185,239-241`)를 상속하지 못했다. (같은 섹션의 `CreateApiKeyModal` 은 `initialFocusRef` 로 첫 필드 포커스를 구현한다 — 설정 폼 3화면만 빠졌다) | 기본 언어를 목록 밖으로 만들어 저장 → activeElement 가 그 select 인지 | **gap** |
| A11Y-15 | P1 | 충돌 다이얼로그의 액션 이름이 서로 구분된다('최신 내용 불러오기' / '내 변경으로 덮어쓰기') — 헤더 ×(`aria-label='닫기'`)와 겹치지 않는다. `ConflictDialog.tsx:9-10` 이 '파괴적 선택일수록 라벨이 결과를 말해야 한다'를 근거로 남긴다 | 다이얼로그 내 같은 접근 이름의 버튼이 둘 이상인지 | **pass** |
| A11Y-16 | P1 | **부분.** 체크박스의 선택 상태는 네이티브 `checked` 로 인코딩된다(색이 아니다) — DS `Checkbox` 가 `<input type="checkbox">` 를 렌더한다. 오류는 `role="alert"`(`:331`). ⚠ **잠금 상태(`locked`)가 `disabled` + 시각 문구로만 인코딩된다** — 사유가 `aria-describedby` 로 연결되지 않아(A11Y-11 ④) **비색상 인코딩은 되나 이유가 AT 에 닿지 않는다** | 잠긴 체크박스의 접근 이름·설명에 '끌 수 없습니다' 가 포함되는지 | **gap** |
| ERP-01 | P1 | 언어 코드→라벨 매핑이 **단일 레지스트리**다 — `LANGUAGE_META`(`validation.ts:34-39`) + `languageLabel`(`:41-43`). per-page helper 를 만들지 않았고 화면·요약 문구가 같은 함수를 소비한다(`:322,390`). `languageLabel` 은 못 찾으면 코드를 그대로 돌려준다(폴백 존재) | 모든 로케일이 정의된 라벨로 해석되는지 | **pass** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 시각이 `shared/format`(`formatDateTime`·`formatRelativeOrDate`)을 경유한다(`AuditNote.tsx:31-32` · `diff.ts:43-47`). **인라인 포맷 0건** — `diff.ts:42` 가 'ERP-08: 인라인 포맷 금지'를 근거로 남긴다. ⚠ **nav 라벨('언어 관리')과 카드 제목('언어 설정')이 다르다** — 같은 화면을 두 이름으로 부른다(FS-068 §7 #5) | 인라인 `toString()`/`toLocaleDateString` 이 0건인지. 화면 이름이 일관되는지 | **gap(카피 일관성)** |
| ERP-08 | P1 | 감사 시각이 `formatAuditAt`(`diff.ts:43-47`) → `formatDateTime`, 상대 시각이 `formatRelativeOrDate`(`AuditNote.tsx:32`)를 경유한다. 둘 다 `Number.isNaN(parsed.getTime())` 가드가 있다(`diff.ts:45`). ⚠ 요약 문구의 `{supported.length}개`(`:391`)가 raw 숫자이나 **최대 4라 천 단위 가드가 무의미**하다 | 셀의 raw numeric toString 이 없는지 | **pass** |
| ERP-13 | P1 | **이 화면의 사용자 대상 문자열에 리터럴 조사 폴백이 0건이다** — `grep -rn "을(를)\|이(가)\|은(는)\|(으)로" pages/settings/` 히트 2건은 **둘 다 `_shared/validation.ts:4-5` 의 주석**이고 렌더되지 않는다. `_shared/validation.ts:3-12` 가 근거를 남긴다: `shared/crud` 의 `requiredText` 는 `${label}을(를) 입력하세요.` 를 **조립**하므로 쓰지 않고, **이 섹션의 라벨은 전부 작성 시점 확정 리터럴**이라 문구를 통째로 받는다. **이 화면은 그 위험이 더 낮다** — zod 오류 문구가 전부 리터럴이고(`validation.ts:61,72,82`) 보간 지점이 아예 없다. ⚠ `_shared/validation.ts:11-12` 가 '조사 헬퍼가 **아직 없다**'고 적으나 **GROUND-TRUTH §2 기준 `shared/format.ts:269+` 에 승격돼 있다** — 낡은 주석(§5 #8) | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 | **pass** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(grep) — 이 화면도 상한이 없다. abort 는 언마운트·확인 취소·충돌 닫기에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **이 화면이 status 로 분기하지 않는다.** 조회 실패가 401/403/404/500 을 같은 문구로(`SettingsFormShell.tsx:130`), 저장 실패가 403/422/500 을 같은 배너로(`:219`) 뭉갠다. 근본 원인은 `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않는 것** — `failIfRequested` 의 generic Error 와 `SettingsConflictError` 뿐이다. **409 만 유일하게 갈린다**(`isSettingsConflict`) | `?status=load:404` 와 `?status=load:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 없다 — `useCrudForm` 미사용이라 그 훅의 422 처리(`useCrudForm.ts:176-186`)를 상속하지 못했다. 모든 저장 실패가 form-level 배너로 간다(BE-068 §7.6 #3). **이 화면에서 특히 아깝다** — 서버 422 가 `defaultLanguage`/`fallback`/`supported` 중 어느 규칙을 어겼는지 정확히 아는데(BE-068 §5) 화면이 그것을 버린다 | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면 부재에 가깝다.** 단일 문서라 '찾을 수 없음'이 정상 경로에 없다(BE-068 §5 404 축). 다만 **서버가 시딩하지 않아 404 를 내면** 화면에 그 분기가 없어 generic 배너로 뭉개진다(BE-068 §7.6 #4) | 없는 문서로 진입 → 전용 문구가 뜨는지 | **gap(잠재)** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(응답 후 `reset` + `setQueryData`)이다. `onMutate`/롤백 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | 이 화면에 `onMutate` 가 0건인지 | **pass** |
| EXC-19 | P1 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 입력이 유실된다** — 프로그램적 이동이라 이탈 가드(FS-068-EL-023)가 발화하지 않는다 | 세션 만료 중 입력 → 재로그인 후 복원되는지 | **gap(앱 전역)** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference`(`shared/errors/http-error.ts:68-75`)가 존재하고 `useCrudForm` 은 `errorReference` 로 노출하는데, 이 화면은 고정 문구(`:219`)만 쓴다. raw stack 노출은 없다(그 절은 충족) | 강제 500 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 조회 응답 p95 | ≤ 300ms (BE-068 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 보이게 하려고 넣은 인위적 `wait()`(`_shared/store.ts:109,115`). 실제 네트워크 0건 |
| 저장 응답 p95 | ≤ 400ms | 위와 동일 |
| 첫 렌더 | ≤ 1.0s (LCP) | 미측정. **문서 1건 · 후보 4건 고정**이라 데이터 규모에 비례하지 않는다 — 렌더 비용이 상수다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | 전역 `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시하고 **이 화면이 재정의하지 않는다**(`_shared/queries.ts:15-19`) — **충족** |
| 저장 요청 크기 | ≤ 1KB | **충족** — 3필드이고 `supported` 최대 4항목이다. **이 섹션에서 가장 작은 페이로드**이며 상한이 구조적으로 보장된다(전 필드 enum) |
| 토글당 연산 | 상수 | `toggleSupported`(`:175-188`)가 4건 배열을 filter + map 한다 — 후보가 상수라 비용이 고정. `shouldValidate: true` 라 토글마다 zod 가 1회 돈다(3필드 · 교차 규칙 3개 — 상수) |
| 메모리 | 문서 1건 + 상수 4건 | 상수 |
| 번들 | 이 화면 고유 코드 ≤ 10KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS·zod/mini). **i18n 라이브러리를 들이지 않은 것이 번들 판단의 근거**였다(`validation.ts:6-9`) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`SettingsFormShell.tsx:125-138`). 폼 대신 배너 — STATE-02 pass |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존·재시도(다이얼로그 유지)는 되나 **reference 없음**(EXC-20 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **동시 편집(두 관리자)** | 나중 저장이 앞선 변경을 덮지 않는다 | **충족** — revision 토큰 불일치 → 409 → 충돌 다이얼로그(3-액션) + 달라진 항목 + 입력 보존(EXC-04 pass). `store.test.ts:54-69` 가 회귀를 막는다 |
| 저장 응답 유실 후 재시도 | 중복 적용 없음 + 사용자가 성공을 안다 | **부분 충족** — `If-Match` 가 중복 적용을 막으나(데이터 안전) 사용자는 **거짓 충돌 다이얼로그**를 본다(EXC-08 gap · BE-068 §7.4) |
| **API 로 순서가 다른 배열이 저장됨** | 화면이 거짓 dirty·거짓 충돌을 내지 않는다 | **미정 — 서버 정규화에 의존한다.** `diff.ts:13-20` 의 배열 비교가 **순서를 포함**하므로 `['en','ko']` 가 저장돼 있으면 화면이 정규화한 `['ko','en']` 과 '달라졌다'고 읽는다. 프론트 정규화(`:182-183`)만으로는 부족하다(BE-068 §7.2) |
| 세션 만료 중 편집 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484`) |
| 편집 중 재조회 | 입력이 유지된다 | **미충족** — `useEffect([data, reset])`(`:156-159`)가 입력을 덮는다(STATE-03 gap) |
| **서버가 불변식 위반 문서를 내려줌** | 화면이 복구 가능하다 | **미정** — 예: `supported: []` 가 저장돼 있으면 화면이 **사용자가 만들지 않은 오류**를 띄우고, 잠금 규칙(`locked`)이 기본/폴백을 지키므로 체크를 켜 복구할 수는 있다. 그러나 그 경로가 명세돼 있지 않다(BE-068 §7.6 #4) |

### 4.3 정직성 — 소비자 없는 계약의 취급

이 화면은 **저장은 되지만 아무 일도 일어나지 않는다**(BE-068 §7.5). quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **미구현 사실을 감추지 않는다** | **충족 — 이 화면의 핵심 강점.** 조건 없이 항상 뜨는 info 배너(FS-068-EL-010): '이 화면은 언어 정책을 저장할 뿐, 저장한다고 화면이 번역되지는 않습니다.' `LanguagesPage.tsx:5-7` 이 근거를 밝힌다: '감추면 운영자는 영어를 켜 놓고 사이트가 영어로 나오길 기다리게 된다' |
| **픽스처가 거짓말하지 않는다** | **충족.** 한국어 하나만 켜져 있다(`data-source.ts:14-18`). `:11-13` 이 이유를 밝힌다: '영어를 켜 두면 화면은 "지원함" 이라 말하는데 번역이 없어 거짓말이 된다' |
| **가짜 성공을 만들지 않는다** | **충족.** 저장은 실제로 문서를 갱신하고 감사 기록을 남긴다 — 동작하는 척하는 no-op 이 아니다. **적용만 없다** |
| 모델이 **미래 라이브러리의 입력**이 된다 | **충족(설계).** `validation.ts:13-16` 이 매핑을 미리 적어 뒀다: `defaultLanguage → i18n.language` · `supported → i18n.supportedLngs` · `fallback → i18n.fallbackLng` |
| 도입 **선행 조건**이 기록돼 있다 | **충족.** `validation.ts:17-18`: '문자열 추출(EXC-17: named interpolation whole string)이 선행 조건이다 — 문장을 조각내 이어 붙인 copy 가 남아 있으면 추출이 기계적으로 되지 않는다' |
| 그동안 **죽은 데이터가 쌓인다** | **인정된 비용.** `updatedAt` 만 갱신되고 아무도 읽지 않는 문서가 된다(BE-068 §7.6 #2). 이 사실이 문서에 고정돼 있다 |

> **판정**: '번역이 적용되지 않는다'는 **결함이 아니라 명세된 동작**이다(FS-068 §1 범위 밖). 이 축에서 이 화면은 **모범 사례**로 기록한다 — 미구현을 감추는 대신 밝히고, 픽스처까지 그 사실에 맞췄다. **다른 화면이 같은 상황에서 침묵한 사례가 있다**: 사이트 설정의 `timezone` 은 저장되지만 읽히지 않는데 화면이 아무 말도 하지 않는다(NFR-067 §5 #11) — **이 화면의 배너가 그 화면에도 필요하다.**

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | MOTION-01 | P0 → **종속** | **~~Motion 라이브러리 미도입으로 Modal 에 fade/scale/exit·reduced-motion 게이트가 없다~~ — 이 사유는 PR #26 으로 해소됐다.** 오버레이 모션이 구현됐고(`Modal.css:20-21,30-38,58-59` + keyframes `:126-168`) **reduced-motion 게이트**(`:173-180`)와 **Toast exit**(`Toast.css:32-37,121-131`)도 신설돼 **MOTION-02·03 은 pass 로 뒤집혔다.** **라이브러리는 여전히 미도입**(`packages/ui/src` Motion/AnimatePresence 0건)이나 'exit 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성했다. **잔여**: footer 버튼 경로는 즉시 언마운트(`Modal.tsx:27-31`)이고 **이 화면의 다이얼로그 3종은 footer 가 주 닫기 수단**이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 DS 소유 문서가 정한다** | **`packages/ui`(DS)** | **프론트 리팩터 / DS (판정 대기)** |
| 2 | **A11Y-11** · A11Y-16 | **P0** · P1 | **이 화면 고유 결함 2건.** ① **고아 오류 id** — `:331` 이 `<p id={errorIdOf('lang-supported')}>` 를 렌더하나 **`lang-supported` 라는 id 의 요소가 없고**(체크박스는 `lang-supported-ko` 등) 어떤 컨트롤도 이 오류를 `aria-describedby` 로 참조하지 않는다. **`<fieldset>` 에 `aria-describedby` 를 물리는 것이 옳은 해법** ② **잠긴 체크박스가 이유를 말하지 않는다** — 잠금 사유(`:320-324`)가 형제 `<span>` 일 뿐 연결되지 않아 시각 사용자만 안다. **required 노출·aria-invalid 짝은 pass**(select 자식이 `SelectField` 라 주입됨) | 이 화면 | UI 기획 쪽 변경 요청 |
| 3 | EXC-08 | P0 | 저장에 **멱등키 없음**(`grep Idempotency pages/settings/` = 0건). 동기 잠금(`useSubmitLock`)은 있어 연타는 막힌다. **`If-Match` 가 중복 적용을 막아 데이터는 안전** — 잔여 위험은 '자기 저장에 대해 거짓 충돌 다이얼로그를 보는' UX. 선례: `members/components/PointsCard.tsx:103,162-173` | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-068 §7.4) |
| 4 | STATE-03 | P1 | `useEffect([data, reset])`(`:156-159`)가 **편집 중 재조회에서도 `reset`** 을 돌려 체크 상태를 덮는다. **설정 4화면 공통** | 이 화면(섹션 공통 패턴) | UI 기획 쪽 변경 요청 |
| 5 | EXC-06 · EXC-12 | P1 | 조회·저장 실패가 status 를 구분하지 않는다. 근본 원인은 `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않는 것** — 409 만 `SettingsConflictError` 로 갈린다. **설정 4화면 공통** | 이 화면 + `_shared/store.ts` + 어댑터 | UI 기획 · 백엔드 명세 (BE-068 §7.6 #7) |
| 6 | EXC-07 · EXC-20 · FEEDBACK-05 | P1 | 422 `error.fields` → RHF `setError` 매핑 없음(**서버가 어느 규칙을 어겼는지 정확히 아는데 화면이 버린다**) · 5xx reference code 미표시 · **저장 확인 문구가 고정이라 무엇이 바뀌는지 이름으로 말하지 않는다**(OAuth 화면은 말한다) | 이 화면 | UI 기획 (BE-068 §7.6 #3) |
| 7 | A11Y-13 | P1 | `handleSubmit(onValid)` 에 **`onInvalid` 가 없어** 검증 실패 시 첫 오류 필드로 포커스가 가지 않는다. 폼 진입 첫 필드 포커스도 없다. **설정 폼 3화면 공통** | 이 화면(섹션 공통) | UI 기획 쪽 변경 요청 |
| 8 | ERP-13 (주석) | — | `_shared/validation.ts:11-12` 가 '조사 헬퍼가 **아직 없다**'고 적으나 **GROUND-TRUTH §2 기준 `shared/format.ts:269+` 에 승격돼 있다** — 낡은 주석. 판정 자체는 pass | 이 화면(주석) | UI 기획 쪽 변경 요청(경미) |
| 9 | ERP-06 | P1 | **nav 라벨('언어 관리')과 카드 제목('언어 설정')이 다르다** — AppHeader `<h1>` 은 '언어 관리', 카드는 '언어 설정'. 같은 화면을 두 이름으로 부른다. **다른 3화면은 일치한다**(사이트 설정·API Key·OAuth 설정) | 이 화면 | UI 기획 쪽 변경 요청 · 아키텍처 |
| 10 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 미저장 입력을 버린다 | **앱 전역** | 프론트 구현 · UI 기획 |
| 11 | (FS-068 §7 #9) | — | **`selectable` 이 비면 기본/폴백 select 가 빈 옵션 목록이 된다** — 잠금 규칙(EL-004.4) 하나가 유일한 방어다. select 가 비면 아무것도 고를 수 없고 오류 문구도 없다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 12 | (BE-068 §7.2) | — | **`supported` 정규화를 서버가 하지 않으면 거짓 dirty·거짓 충돌이 난다** — `diff.ts:13-20` 의 배열 비교가 **순서를 포함**하기 때문. 서버 정규화(중복 제거 + 정의 순서 정렬)를 계약에 넣어야 한다 | BE 계약 | 백엔드 명세 |
| 13 | (BE-068 §7.3 = BE-067 §7.3) | — | **감사 주체 위조 가능** — `updatedBy` 하드코딩 `'김운영'`(`_shared/store.ts:84`), `updatedAt` 클라이언트 시각(`:131`). 서버가 세션·서버 시각으로 찍어야 한다. **심이 이미 선언**(`store.ts:83`). **4화면 공통** | BE 계약 | **백엔드 명세 (최우선)** |
| 14 | (BE-068 §7.6 #4) | — | **서버 불변식 위반 문서의 가능성** — 시딩·마이그레이션이 교차 규칙을 깬 문서를 만들면 화면이 사용자가 만들지 않은 오류를 보인다. **미설정 상태의 계약도 미정** | BE 계약 | 백엔드 명세 |
| 15 | (BE-068 §7.6 #1 · #2) | — | **로케일 카탈로그(EP-03) 심 없음(미정)** — 후보 4종이 코드 상수다. **현재로선 그것이 옳다**(번역 리소스가 없다). **i18n 도입 시 연동에 화면 코드가 함께 바뀐다**(`LANGUAGE_META` import → `useQuery`) — 어댑터만 바꾸면 되는 작업으로 산정하면 빠진다. 그리고 **이 계약에 소비자가 없다**(§4.3) | BE 계약 + 이 화면 | 백엔드 명세 · UI 기획 · 아키텍처 |
| 16 | (FS-068 §7 #12 · #13) | P2 | `Checkbox` 를 앱 배럴이 아니라 `@tds/ui` 에서 직접 import(`:16-18`) — **의도된 우회**(배럴은 F2 소유)이나 일관성이 깨져 있다(`CreateApiKeyModal.tsx:15` 도 같다 — 2곳) · 스켈레톤 행 수 하드코딩 `[0,1,2,3]` | 이 화면 | UI 기획 (배럴 확장은 F2) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다**(기준일 2026-07-17 · `HEAD = a5c2639`). 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`languageSettingsStore` 는 `createRevisionedStore('languages', …)`(`data-source.ts:23`)로 만들어지므로 scope = **`languages`** 이고, `failIfRequested(scope, op)` 를 두 곳에서 부른다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `load` | `fetch` (`_shared/store.ts:110`) | `?fail=load` · `?fail=languages:load` · `?fail=all` |
| `save` | `save` (`_shared/store.ts:116`) | `?fail=save` · `?fail=languages:save` · `?fail=all` |

**충돌 재현 스위치(이 섹션 고유 — `dev.ts` 에 없다)**

`conflictRequested(scope)`(`_shared/store.ts:60-65`)가 `?fail=` 파라미터를 **직접** 읽어 `conflict` / `languages:conflict` 를 찾는다. 걸리면 저장 직전에 revision 을 바꿔(`:120`) 토큰을 어긋나게 만든다 — **다른 관리자가 먼저 저장한 상황을 재현**한다. `data-source.ts:3-4` 가 이 화면의 세 스위치를 나열한다.

| 재현 | 결과 |
|---|---|
| `/settings/languages?fail=conflict` | 저장이 409 → **충돌 다이얼로그**(EXC-04 판정) |
| `/settings/languages?fail=languages:conflict` | 이 화면에서만 |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). **STATE-01 재현은 `?delay=` 가 아니라 `staleTime` 30초 경과 후 재진입 또는 devtools invalidate 로 한다.**
- **`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`)는 `failIfRequested` 를 거치는 op 에 걸리므로 `?status=load:404` · `?status=save:500` 등이 적용된다. 다만 **이 화면이 status 로 분기하지 않아**(EXC-06 gap) 결과 화면이 같다 — 그것이 곧 gap 의 재현이다.

| 판정 | 재현 |
|---|---|
| STATE-01 (재조회가 폼을 덮지 않는다) | 값 확인 → 30초 후 재진입. **스켈레톤이 뜨면 gap** |
| STATE-02 (조회 실패) | `?fail=load` — danger Alert + '다시 시도' 없으면 gap |
| EXC-04 (409 충돌) | `?fail=conflict` — **충돌 다이얼로그 + 입력 보존 + 달라진 항목 목록이면 pass** |
| EXC-03 (write 게이팅) | 권한 스토어에서 `page:/settings/languages` 의 `update` off — **저장 버튼이 사라지면 pass** |
| EXC-08 (연타) | 확인 버튼 2연타 — 요청 1건이면 ① pass. `grep Idempotency` = 0건이면 ② gap |
| EXC-09 (abort) | 저장 중 '취소' — 실패 배너·토스트가 없으면 pass |
| **A11Y-11 ③ (고아 오류 id)** | 브라우저 콘솔에서 `document.getElementById('lang-supported')` — **`null` 이면 gap**(그 id 를 `<p>` 가 참조 대상으로 삼는데 대상이 없다) |
| EXC-06 (status별 surface) | `?status=save:422` · `save:500` — 전부 같은 배너면 gap |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · A11Y-12 · IA-02 · ERP-13 · EXC-08 판정) · **RTL**(A11Y-11 의 `aria-required` 주입 + describedby↔alert id 일치 — **grep 으로는 판정 불가, 주입이 런타임이다**) · `languages.test.ts`(**교차 규칙 회귀 6건** — 지원 0건 · 기본 언어 목록 밖 · 폴백 목록 밖 · 알 수 없는 로케일) · `_shared/store.test.ts`(**낙관적 동시성 회귀 6건 — EXC-04 의 근거 · 4화면 공유**).

**이 화면에 컴포넌트 테스트가 없다** — `languages.test.ts` 는 순수 스키마 검증만 본다. 잠금 규칙(FS-068-EL-004.4) · 토글 정규화(EL-005) · 고아 오류 id(A11Y-11 ③)는 **테스트가 지키지 않는다.**

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **A11Y-11 ③ 은 `document.getElementById('lang-supported') === null` 이라는 결정적 재현을 댔다**
- [x] 모든 `N/A` 에 사유를 댔다 (STATE-04·IA-04 목록 부재 · COMP-10 검색 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재 · IA-13 list state 부재)
- [x] **§2.1 산수 검산 — 12 pass + 9 종속 + 7 n-a + 2 gap = 30 ✓** (요약표 + 30행 전수 나열 2중 검산)
- [x] **A11Y-11 의 '전수' 가 진짜 전수임을 확인했다** — `grep -rn "required" apps/admin/src/pages/settings/` 히트를 전건 분류한 결과 **설정 4화면의 모든 `required` 는 `FormField` prop 이거나 zod 헬퍼 이름이며, `FormField` 를 거치지 않는 required 표면이 0건**이다. `ImageUploadField`·`ImageGalleryField`·`SegmentPicker`·`TextField`(전부 `required` 를 AT 에 잇지 않는 컴포넌트)의 소비가 **이 섹션에 0건**이다. 이 화면의 `@tds/ui` 직접 import 는 `Checkbox` 뿐이고 **`required` 를 받지 않는다**(체크박스 4개는 그룹 규칙이라 개별 필수가 아니다 — §2 A11Y-11 ①)
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다 — **MOTION-03 에서 `ToggleSwitch` 가 이 화면에 없음을 명시**하고 그 결함은 NFR-067·070 의 몫으로 넘겼다
- [x] **`상속` + `gap` 조합의 근거를 §1.1 에 규약으로 명시**했다 — MOTION 3건은 DS 소유이나 상태가 코드로 확정돼 `종속` 이 아니라 `gap` 이다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(목록·검색·업로드·CSV·시크릿·자유 텍스트)은 적지 않고 **COMP-12·STATE-05 는 표면 부재로 n-a** 처리했다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`languages`)와 op 2종을 **`createRevisionedStore` 호출부에서 확인**했고, **이 섹션 고유의 `?fail=conflict` 스위치**(`store.ts:60-65`)를 별도로 기록했으며, **`?delay=` 를 쓰지 않았다**
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다. **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] §5 의 gap 이 FS-068 §7 · BE-068 §7.6 과 일치한다
- [x] **A11Y-11 이 형제 화면(NFR-067 pass)과 갈리는 이유**(이 화면만 체크박스 그룹이 있다)를 §2.1 하단에 기록하고, **화면마다 다시 매겨야 함**을 못박았다
- [x] **EXC-03 · EXC-04 가 이 화면에서 pass 이며 그것이 기존 배치의 앱 전역 gap 판정을 뒤집는다는 사실**을 §2.1 하단에 기록했다
- [x] **'번역이 적용되지 않는다'를 결함이 아니라 명세된 동작으로 다루고**, 정직성 축(§4.3)을 quality-bar 밖 축으로 신설해 **모범 사례로 기록**했다
</content>
