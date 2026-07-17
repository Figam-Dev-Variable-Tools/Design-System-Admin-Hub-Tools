---
id: NFR-067
functionalSpec: FS-067
backendSpec: BE-067
qualityBar: specs/quality-bar.md
title: "사이트 설정 비기능 명세"
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-067. 사이트 설정 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-067 사이트 설정 (`/settings/site`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-067(요소·예외) · BE-067(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-067 §7 · BE-067 §7.6 과 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **MOTION-02 `gap` → `pass`** · **MOTION-03 `gap` → `pass`** · **MOTION-01 `gap` → `종속`** — 전부 **PR #26**(오버레이 모션 CSS-only 구현 · `Toast.css:32-37,121-131` exit · **`ToggleSwitch.css:79-84` reduced-motion 게이트 신설**). 이전 배치가 든 gap 사유가 코드로 해소됐다. **P0 gap 4 → 1**(EXC-08 만 남는다) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 `pages/settings/site/**` · 섹션 공유 `pages/settings/_shared/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목이되 소유 문서의 판정이 아직 확정되지 않은 것 — 소유 문서를 따른다 |

> **`상속` + `gap` 조합에 대하여**: 소유가 DS 라도 **그 상태가 코드로 확정된 경우**(예: Motion 라이브러리 미도입)에는 `종속` 이 아니라 `gap` 으로 적는다. 이 화면에 표면이 실재하는 이상 사용자는 그 결함을 겪기 때문이다. 다만 **해소는 앱 코드로 불가능**하며 이관 대상이 DS 임을 §5 에 명시한다.

### 1.2 화면 성격

**단일 문서 폼(잎 라우트)이다.** 목록이 아니다 — 표·검색·필터·정렬·페이지네이션·행 선택이 **하나도 없다.** 그래서 목록 계열 요구(STATE-04 · COMP-10 · IA-13 · A11Y-12)는 표면 부재로 N/A 가 된다. 대신 **폼·다이얼로그·동시성 계열**(FEEDBACK-04 · EXC-04 · EXC-08 · EXC-09)이 이 화면의 중심이다. 이 화면은 **시크릿을 다루지 않는다**(그 축은 NFR-069·NFR-070 이 다룬다) — 그러나 **위험 설정**(유지보수 모드)을 다루므로 확인 다이얼로그·충돌 해소가 실질 안전장치다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** `SiteSettingsPage.tsx:153` 이 `const loading = isFetching && data === undefined` 로 **첫 로딩만** 판정한다 — `isFetching` 직결이 아니다(BE-026 계열 화면의 결함을 피했다). 그 `loading` 이 `SettingsFormShell.tsx:152` 의 스켈레톤 분기를 지배하므로 **재조회 중에는 이전 폼 값이 유지된다.** 셸이 세 상태를 배타적으로 그린다: 조회 실패 → 배너만(`:125-138`, early return) / 첫 로딩 → 스켈레톤만(`:152-157`) / 그 외 → 폼(`:159`). 0행 empty 는 이 화면에 해당 없음(단일 문서) | `/settings/site` 진입 → 폼 렌더 확인 → `staleTime` 30초 경과 후 재진입(또는 devtools 로 invalidate). **폼이 스켈레톤으로 바뀌지 않고 값이 유지되면 pass.** `?fail=load` → 배너만, 폼 없음 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** `SettingsFormShell.tsx:125-138` 이 조회 실패 시 `<Alert tone="danger">` + '다시 시도'(`onRetry` → `refetch` — `SiteSettingsPage.tsx:263`)를 **폼 대신** 렌더한다. error toast 를 쓰지 않는다 — 이 화면의 `toast` 호출은 성공 2건뿐(`:180` 저장 · `:233` 최신 불러오기). 저장 실패도 토스트가 아니라 카드 배너(`:194` → `:264`) | `/settings/site?fail=load` 진입. **danger Alert + '다시 시도' 버튼이 뜨고 토스트가 없으면 pass** | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **페이지네이션이 없다** ② **행 선택이 없다** ③ 목록 자체가 없다 — 단일 문서 폼이다(§1.2). 'total 축소 시 page clamp' · '필터/page 변경 시 selection 리셋' 이 걸릴 표면이 존재하지 않는다. 페이지네이션 부재는 이 화면에서 **결함이 아니라 화면 성격**이다(IA-04 도 같은 이유로 N/A) | 목록·선택이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `grep -rnE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/settings/` → **0건**(2026-07-17 확인). 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. 파생 치수도 토큰 배수로만 표현한다 — `gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 7), 1fr))'`(`SiteSettingsPage.tsx:92`). border-width 도 토큰(`--tds-border-width-thin`) | 위 grep → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-input tds-ui-focusable`(`_shared/fields.tsx:74`) · DS `<Button>`·`<SelectField>`·`<ToggleSwitch>`(자체 `:focus-visible` 이 `--tds-border-width-medium` 을 쓴다 — `ToggleSwitch.css:17-21`). **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건) | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `SettingsFormShell.tsx:155`) · **Toast enter/exit**(`Toast.css:26-27` — enter 가 `var(--tds-component-overlay-enter-easing)` · `:32-37` — exit) · **Modal enter/exit**(`Modal.css:20-21,30-38,58-59` — 같은 recipe). ⚠ **PR #26 으로 이 화면이 상속하는 easing 소비 표면이 늘었다** — `component.overlay.{enter,exit}-easing`(`tokens/tokens.json:1293-1307`)이 신설 소비자이고 `Toast`·`Modal` 이 **같은 recipe 를 함께 쓴다**(`tokens.json:1287` — '오버레이는 한 몸처럼 움직인다') · DS `<Button>`·`<ToggleSwitch>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(`grep -rniE "transition\|animation\|transform" pages/settings/` → 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`SettingsFormShell.tsx:145`) · Modal(확인·충돌 다이얼로그 — `Modal.css:20` `box-shadow: var(--tds-shadow-overlay)`) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다**(`grep -rn "h1" apps/admin/src/pages/settings/` → **0건**). 화면 제목은 **AppHeader 가 소유**하며(`AppHeader.tsx:101` `<h1 style={titleStyle}>`) nav 잎 라벨 '사이트 설정'을 렌더한다(FS-067-EL-001). 그 `titleStyle` 의 title tier 계약은 layout 이 소유한다. 카드 제목(`CardTitle` — `:146`)은 `<h1>` 이 아니라 카드 시맨틱이다. **이 화면이 title 타이포를 직접 선언하지 않는다** | AppHeader `titleStyle` 이 `--tds-typography-title-*`(>18px tier + weight 600)를 참조하는지 확인. 이 화면에서는 로컬 title 스타일 선언이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 이 화면에 **검색 입력이 없다** — `grep -rn "SearchField\|useDebouncedSearch" pages/settings/` → **0건**. 단일 문서 폼이라 조회할 query 자체가 없다(§1.2). 'IME 조합 중 커밋 금지 + 디바운스 + stale 응답 무효'가 걸릴 자리가 존재하지 않는다. **텍스트 입력은 있지만 서버 query 를 발화하지 않는다** — 폼 값일 뿐이다 | 검색 입력이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족.** 이 화면의 파괴적 서버 액션 표면은 **저장 확인 다이얼로그**(FS-067-EL-021)다 — intent 는 `delete` 가 아니라 `update` 이나, **유지보수 모드 저장은 사이트를 내리는 파괴적 행위**이며 요구가 정한 계약(강제실패 시 dialog 유지 + retry, 중간닫기 = abort)이 그대로 걸린다. ① **강제실패가 다이얼로그를 유지한다** — `onError` 가 `setSaveError(...)`(`:194`)만 하고 `setPending(null)` 을 하지 않아 다이얼로그가 살아 있고, `error={saveError}`(`:421`)로 그 안에 배너가 뜬다. **재클릭이 곧 재시도**다 ② **중간닫기 = abort** — `cancelSave`(`:215-222`)가 `controllerRef.current?.abort()` + `save.reset()` + `lock.release()` 를 하고, DS 가 busy 중에도 취소를 살려 둔다(`ConfirmDialog.tsx:144` 'busy 중에도 취소는 살아 있다 — 이것이 진행 중 요청의 abort 경로다'). intent→tone/label/icon 매핑과 초기 포커스는 DS 가 소유 | `/settings/site?fail=save` 에서 값을 바꿔 저장 → 확인. **다이얼로그가 열린 채 danger 배너가 뜨고 확인 버튼이 재활성되면 pass.** 저장 중(400ms) '취소' 클릭 → 실패 토스트·배너가 뜨지 않아야 한다 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `SettingsFormShell.tsx:122` 이 `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })` 를 배선한다. `dirty` 는 RHF `formState.isDirty`(`SiteSettingsPage.tsx:123` → `:268`)이고 기준선은 `reset(data.value)`(`:141`)다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:127,151,178`). **저장 후 통과**: 성공 시 `reset(values)`(`:178`)로 새 기준선이 서서 dirty 가 풀리고 가드가 내려간다. **저장 중에는 가드하지 않는다**(`dirty && !saving`) — 곧 not-dirty 가 되기 때문 | 사이트명을 고친 뒤 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 폼은 modal 이 아니라 라우트 본문의 `<Card>` 로 렌더된다(`SettingsFormShell.tsx:145`). 이 화면의 modal 은 둘 다 **입력 필드가 없는 확인 다이얼로그**다: 저장 확인 `ConfirmDialog`(FS-067-EL-021) · 충돌 `ConflictDialog`(FS-067-EL-024, 본문이 `<p>`·`<ul>`·`<Alert>` 뿐 — `ConflictDialog.tsx:106-132`). 이탈 가드 다이얼로그도 확인 전용이다. 'modal 4경로 dirty 가드'가 걸릴 dirty 상태가 modal 안에 존재하지 않는다 — **라우트 레벨 dirty 는 FEEDBACK-04 가 담당한다**. (참고: 같은 섹션의 `CreateApiKeyModal` 은 폼 modal 이라 NFR-069 에서 이 요구가 `직접` 으로 살아난다) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 2건: 저장 성공 `toast.success('사이트 설정을 저장했습니다.')`(`:180`) · 충돌 해소 `toast.success('최신 사이트 설정을 불러왔습니다.')`(`:233`). 지속 live region 은 `ToastProvider` 가 소유한다(비-error=polite · error=assertive 2벌 — `Toast.types.ts:15` 가 계약을 밝힌다) — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 3건 모두 `aria-describedby` 가 배선돼 있다: ① **저장 확인** — DS `ConfirmDialog` 가 `useId` 로 message id 를 만들어 `Modal describedBy` 로 넘긴다(`ConfirmDialog.tsx:129,135`) ② **충돌** — `ConflictDialog.tsx:88` `const messageId = useId()` → `:94` `describedBy={messageId}` → `:107` `<p id={messageId}>` (섹션 자체 컴포넌트이나 DS `Modal` 의 계약을 정확히 소비한다) ③ **이탈 가드** — 훅이 `ConfirmDialog` 를 렌더한다. `Modal.tsx:158` 이 `aria-describedby={describedBy}` 를 dialog 노드에 건다 | DS 판정에 종속. 이 화면에서는 충돌 다이얼로그 open 시 본문 문구가 title 과 함께 읽히는지 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족. 이 화면의 폼 컨트롤 9개를 전수 확인했다.** **① required 노출** — required FormField 6개의 자식 타입을 직접 확인: 사이트명·기본 URL·대표 이메일·대표 전화번호·유지보수 안내 문구는 `TextInputField` 를 거쳐 자식이 **네이티브 `<input>`**(`_shared/fields.tsx:71`)이고, 표시 시간대는 자식이 **DS `SelectField`**(`SiteSettingsPage.tsx:354`)다. 둘 다 `FormField.tsx:36-41` `isRequirableChild` 를 통과하므로 `withAriaRequired`(`:50-56`)가 **런타임 `cloneElement` 로 `aria-required` 를 주입**한다. **래퍼(`<span>`/`<div>`)로 감싼 required 자식이 이 화면에 0건**이다 — OAuth 화면(NFR-070)이 겪는 결함이 여기엔 없다. ⚠ **`aria-required` grep 이 0건인 것으로 판정하면 안 된다** — 주입은 런타임이다 **② aria-invalid without describedby = 0건** — 이 화면의 `aria-invalid` 는 `fields.tsx:77` 한 곳뿐이고 바로 다음 줄(`:78`)이 `aria-describedby={describedBy(id, error, hint)}` 를 짝으로 세운다. `describedBy`(`:16-24`)는 오류가 있으면 `errorIdOf(id)`, 없고 힌트가 있으면 `hintIdOf(id)`, 둘 다 없으면 `undefined` 를 준다 — `FormField` 가 같은 id 로 `<p id={errorIdOf(htmlFor)} role="alert">`(`FormField.tsx:110`)를 렌더하므로 id 가 일치한다. `fields.tsx:7-9` 가 이 배선을 **모듈 계약으로 못박아** 호출부가 잊을 자리를 없앴다. **ToggleSwitch 2개는 오류 상태가 없다**(불리언이라 위반 값이 존재하지 않는다) → 짝 요구가 발생하지 않는다 | `grep -rn "aria-invalid" apps/admin/src/pages/settings/site apps/admin/src/pages/settings/_shared` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL: 사이트명을 비우고 저장 → `input.getAttribute('aria-required') === 'true'` **와** `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면에 **필터가 없다**(단일 문서 폼 — §1.2). `aria-pressed` 를 쓸 toggle 필터 list item 이 존재하지 않으며, 이 화면 전체에 `aria-current` **0건**. **ToggleSwitch(FS-067-EL-009·EL-010)는 필터가 아니라 폼 값**이며 DS 가 `aria-checked` 로 상태를 노출한다(`ToggleSwitch.css:35` 셀렉터가 그것을 증명한다 — 색이 아니라 aria 속성이 상태를 소유한다) — 이 요구의 appliesTo 가 아니다 | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다.** Modal 표면이 실재한다(저장 확인 · 충돌 · 이탈 가드 — 3종). backdrop fade + dialog scale 이 실재한다: backdrop enter `Modal.css:20-21`→`@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33`→`tds-modal-backdrop-out :136-144` · dialog enter `:58-59`→`tds-modal-dialog-in :146-156`(opacity 0→1 · `scale(0.96)→scale(1)`) · exit `:35-38`→`tds-modal-dialog-out :158-168`(`forwards`). reduced-motion 게이트 `:173-180`. `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **`AnimatePresence` 는 없고**(`packages/ui/src` Motion/framer-motion 소비 **0건** — 라이브러리 미도입) 요구문의 'exit 완료 후에만 unmount' 를 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`)로 동등 달성한다. **잔여**: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 즉시 언마운트**(`Modal.tsx:27-31`) — **이 화면의 다이얼로그 3종은 footer 가 주 닫기 수단이다**. **라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 몫** — 이 화면이 애니메이션을 선언하지 않으므로 앱 코드로 결정할 수 없다 | `/settings/site` 에서 저장 확인 다이얼로그를 연다. **backdrop 이 fade in 하고 dialog 가 `scale(0.96)→1` 로 들어오면 enter 는 충족.** Esc 로 닫아 exit 를 관찰하고, **footer '취소' 로 닫으면 exit 없이 즉시 사라지는 것**을 대조한다 | **종속** |
| MOTION-02 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** Toast 표면이 실재한다(저장 성공 · 최신 불러오기 — `:180,233`). exit 애니메이션이 실재한다: `.tds-toast--exiting` `Toast.css:32-37`(`tds-toast-out … forwards` + `pointer-events: none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). enter `:26-27`/`:109-119`. **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`, primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). exit 완료 후 unmount 는 `TOAST_EXIT_ANIMATION` 대조 `onAnimationEnd` 로 달성. reduced-motion 게이트 `Toast.css:136-141`(주석 `:133-135`: `--exiting` 을 명시 나열한 이유는 특이도가 같아 소스순서 의존이 조용히 깨지기 때문). queue/ARIA 유지는 `ToastProvider` 가 소유 | 저장 성공 → 토스트 자동소멸 관찰. **opacity fade + 아래로 translate 후 사라지면 pass** | **pass** |
| MOTION-03 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** reduced-motion 게이트가 걸려야 할 이 화면의 표면: **`ToggleSwitch` 2개**(FS-067-EL-009 회원가입 허용 · EL-010 유지보수 모드) · 스켈레톤 펄스 · Toast · Modal · Button. **요구가 명시 지목한 `ToggleSwitch` 의 게이트가 실재한다** — `ToggleSwitch.css:79-84` `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }`. 남아 있는 transition 선언 2건(`:32` `background-color` · `:56` `transform`)을 **둘 다 이 게이트가 끈다** → 손잡이가 즉시 최종 위치로 스냅한다. 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향이고, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다. **나머지 표면도 각자 게이트를 갖는다** — Modal `Modal.css:173-180` · Toast `Toast.css:136-141` · 스켈레톤 `shared/ui/ui.css:110-114`. **이전 배치가 든 gap 사유('ToggleSwitch·Modal 만 빠졌다')는 둘 다 해소됐다** | OS 를 reduced-motion 으로 두고 `/settings/site` 에서 유지보수 스위치를 토글. **손잡이가 즉시 점프하면 pass.** `grep -n "prefers-reduced-motion" packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css` → **`:79` 히트** | **pass** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:337` `{ path: '/settings/site', element: <SiteSettingsPage />, implemented: true }` — `APP_ROUTES`). **이 화면은 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={pageStyle}>`(`SettingsFormShell.tsx:141`, `flexDirection: column` + gap 뿐)이다. `App.tsx:335-336` 주석이 이 구조를 스스로 밝힌다: '403 게이팅은 이 섹션이 따로 하지 않는다 — AppShell 이 `<Outlet>` 을 RequirePermission 으로 감싸 모든 라우트를 한 번에 덮는다' | `/settings/site` 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족.** `/settings/site` 는 **nav 잎**이다(`nav-config.ts:227` `['사이트 설정', '/settings/site']`) — 하위 라우트가 없다. `findCoveringLeaf('/settings/site')`(`nav-config.ts:270-278`)가 **자기 자신을 정확히 찾고**, `findNavLabel`(`:297-299`)이 `'사이트 설정'` 을 반환한다. AppHeader 가 그것을 `<h1>` 으로 렌더한다(`AppHeader.tsx:101`). **이 화면은 in-content `<h1>` 을 그리지 않는다** — `grep -rn "h1" apps/admin/src/pages/settings/` → **0건**(2026-07-17 확인). 따라서 **`<h1>` 이 정확히 1개이고 title 메커니즘이 단일하다.** GROUND-TRUTH §7 이 남긴 gap 두 갈래(가지 라벨 폴백 · h1 이중)가 **여기엔 둘 다 없다**: 잎이라 폴백이 걸리지 않고, 자체 h1 이 없어 중복이 없다. 요구의 'sub-route 가 구체 title' 절은 하위 라우트가 없어 발생하지 않는다 | `/settings/site` 진입. **AppHeader 의 가시 `<h1>` 이 '사이트 설정'이고 `document.querySelectorAll('h1').length === 1` 이면 pass** | **pass** |
| IA-04 | IA | N/A | **표면이 없다.** 이 화면은 **list 화면이 아니다** — 단일 문서 폼이다(§1.2). 표·결과 count·우상단 목록 action·SelectionBar·Pagination 이 **하나도 없고**, 있어야 할 이유도 없다(문서가 1건이다). 요구의 appliesTo('list 템플릿')가 성립하지 않는다. **이것은 페이지네이션 누락이 아니라 목록 부재다** — FS-026 계열이 IA-04 gap 인 것과 성격이 다르다 | 이 라우트에 목록이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다.** `/settings/site` 단일 라우트이며 `/new`·`/:id/edit` 가 없다 — **설정 문서는 생성·삭제되지 않고 편집만 된다**(BE-067 §5 의 404 축: '문서는 항상 존재한다'). '`new` 와 `:id/edit` 가 동일 폼 컴포넌트' 라는 요구 자체가 걸리지 않는다 | 폼 라우트 쌍이 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** 이 화면에 **URL 에 직렬화할 list state 가 없다** — 필터·검색·정렬·페이지가 하나도 없다(§1.2). `grep -rn "useListState\|useSearchParams" pages/settings/` → **0건**. 폼 입력값은 list state 가 아니다(URL 에 넣으면 미저장 시크릿·설정이 히스토리·리퍼러에 남는다 — 넣지 않는 것이 옳다). 'Back/복사링크가 필터 view 복원' 이 걸릴 상태가 존재하지 않는다. **단, `?fail=`·`?status=` 개발 스위치는 URL 을 읽지만 그것은 list state 가 아니다**(`store.ts:61`) | 필터·검색이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:18,484` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다. `AppShell.tsx:478` 이 경계의 자리를 밝힌다: '`<Outlet>` 바로 바깥이다. 화면이 던져도 여기서 멈추므로' 사이드바가 산다. 루트 경계도 별도로 있다(`App.tsx:368`) | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① **진입 가드** — `RequireAuth`(`shared/auth/RequireAuth.tsx`)가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 `Navigate` ② **세션 중 401** — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=load:401` 로 조회를 401 시켜 `/login?returnUrl=%2Fsettings%2Fsite&reason=session_expired` 로 이동하는지 확인. (미저장 입력 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 이 배치에서 해소됐다.** 기존 문서 배치(NFR-026 §2 등)가 'EXC-03 은 `useRouteWritePermissions` 소비자가 **앱 전체 0건**이라 gap' 으로 판정했으나 **이 화면은 그 소비자다.** ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. 리소스는 라우트에서 파생된다(`route-resource.ts:32-35` → `findCoveringLeaf` → `page:/settings/site`) ② **write 게이팅(직접)** — `SiteSettingsPage.tsx:109` `const { canUpdate } = useRouteWritePermissions()` → `:267` `canUpdate={canUpdate}` → `SettingsFormShell.tsx:166` `{canUpdate && (…저장 버튼…)}`. **버튼을 disabled 로 두지 않고 렌더 자체를 하지 않는다**(`:165` '눌러 보고 403 을 받는 자리를 만들지 않는다'). 대신 info 배너로 **이유를 말한다**(`:149` `{!canUpdate && <Alert tone="info">{readOnlyNotice}</Alert>}`). 필드도 전부 비활성(`:254` `disabled = saving \|\| loading \|\| !canUpdate`) ③ **강등 reconcile** — `useRouteCan` 이 `usePermissions()` 를 구독하므로 권한 스토어가 바뀌면(다른 탭의 강등 포함) 재렌더돼 **버튼이 그냥 사라진다**(`RequirePermission.tsx:23-25` 가 이를 설계로 선언). 별도 코드가 없다 | 권한 스토어에서 `page:/settings/site` 의 `update` 를 끄고 `/settings/site` 진입. **저장 버튼·상태 문구가 사라지고 '조회 권한만 있습니다…' info 배너가 뜨며 필드가 전부 비활성이면 pass.** `read` 를 끄면 403 화면(`ForbiddenScreen`)이 뜨는지도 확인. 화면을 연 채 스토어에서 update 를 끄면 버튼이 즉시 사라지는지(강등 reconcile) | **pass** |
| EXC-04 | EXC | 직접 | **충족 — 이 섹션은 진짜 동시성 토큰을 쓴다.** ① **409/412 conflict dialog** — `_shared/store.ts:124-126` 이 `input.expectedRevision !== current.revision` 이면 `SettingsConflictError(current)` 를 던지고, 화면이 `isSettingsConflict(cause)`(`:188`)로 일반 실패와 갈라 `ConflictDialog` 를 세운다(`:427-439`). **3-액션**(최신 불러오기 · 덮어쓰기 · 닫기)이며 `ConflictDialog.tsx:5-10` 이 왜 `ConfirmDialog`(이지선다)가 아닌지 밝힌다 ② **입력 보존** — 다이얼로그가 뜬 동안 폼은 그대로 살아 있다(`ConflictDialog.tsx:11-13`). `setConflict` 만 하고 `reset` 을 하지 않는다(`:189-190`). **diverge 한 field 를 표시한다** — `divergedLabels(getValues(), conflict.value, SITE_FIELD_LABELS)`(`:249-252`), 배열은 내용 비교(`diff.ts:13-20` — 참조 비교면 거짓 diverge 가 난다) ③ **ghost saved 없음** — `createRevisionedStore` 는 `map` no-op 이 아니라 클로저 1건을 통째로 교체하므로(`store.ts:128-132`) '없는 대상을 조용히 지나치고 성공' 경로가 **구조적으로 없다**. ⚠ **`createStoreAdapter` 와 다르다** — 그쪽 409 는 '존재 여부' 기반이라 동시 편집이 last-write-wins 지만(GROUND-TRUTH §4), 여기는 **revision 토큰 비교**라 둘 다 존재해도 거절된다. 회귀 테스트가 못박는다(`store.test.ts:54-69`: '거절됐으므로 상대의 값이 그대로 살아 있다') | `/settings/site?fail=conflict` 에서 값을 바꿔 저장 → 확인. **'사이트 설정이 이미 변경되었습니다' 다이얼로그가 뜨고, 내 입력이 폼에 그대로 있고, 값이 달라진 항목이 라벨로 나열되면 pass.** `store.test.ts` 6건 통과로도 판정된다 | **pass** |
| EXC-08 | EXC | 직접 | **부분 미충족.** ① **`submitLockRef` + disable — 충족.** `useSubmitLock()`(`_shared/queries.ts:58-75`)이 `useRef` 동기 잠금을 제공하고 `runSave` 첫머리에서 `if (!lock.acquire()) return`(`:163`)으로 건다. 성공·실패 양쪽에서 `release`(`:174,183`). 버튼도 `disabled={!dirty \|\| saving \|\| loading}`(`SettingsFormShell.tsx:179`). `queries.ts:54-55` 가 왜 disabled 만으로 부족한지 밝힌다: '클릭과 리렌더 사이에 틈이 있어 빠른 더블 클릭/Enter 연타의 두 번째가 통과한다' ② **'retry 가 동일 Idempotency-Key' — 미충족.** 이 화면에 멱등키가 **없다**(`grep -rn "Idempotency\|idempotency" pages/settings/` → **0건**). 앱에 선례가 있는데도(`members/components/PointsCard.tsx:103,162-173` · `members/data-source.ts:248` 심) 쓰지 않는다. **완화 요인(중요)**: PUT + `expectedRevision` 이라 응답 유실 후 재시도는 **중복 적용이 아니라 409** 가 된다 — 데이터는 안전하다(BE-067 §7.4). **남는 결함은 UX 다**: 사용자는 자기 저장이 이미 성공한 줄 모르고 재시도했다가 '다른 관리자가 저장했다'는 **거짓 충돌 다이얼로그**를 본다. 그 '다른 관리자'는 자기 자신이다 | 저장 확인 다이얼로그에서 확인 버튼을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 1건만 나가면 ①은 pass.** `grep -rn "Idempotency" pages/settings/` → **0건이면 ②는 gap** | **gap** |
| EXC-09 | EXC | 직접 | **충족.** 세 지점이 전부 배선돼 있다. ① **onError** — `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:185`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 ② **onSuccess** — `if (controller.signal.aborted) return;`(`:175`)로 취소된 요청의 성공 콜백이 토스트·reset 을 일으키지 않는다 ③ **mutation.reset** — `cancelSave`(`:218`) · `closeConflict`(`:244`)가 `save.reset()` 을 부른다 ④ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:136`). bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 저장 중(400ms 창) 확인 다이얼로그의 '취소' 클릭. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다(취소된 요청). 저장 중 사이드바 링크로 이탈 → 같은 확인 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · **MOTION-02** · **MOTION-03** · IA-01 · IA-02 · EXC-03 · EXC-04 · EXC-09 |
| `종속` | **9** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · **MOTION-01** · EXC-01 · EXC-02 |
| `n-a` | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| `gap` | **1** | EXC-08 |
| **합계** | **30** | 13 + 9 + 7 + 1 = **30** ✓ |

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
| 15 | A11Y-11 | pass | 30 | A11Y-12 | n-a |

> 30행 전수 · `pass` 13 + `종속` 9 + `n-a` 7 + `gap` 1 = **30** ✓

> **P0 gap 1건 — 이번 기준(`a5c2639`) 갱신으로 4건에서 줄었다.** 뒤집힌 3건은 전부 **PR #26** 이다: **MOTION-02**(Toast exit 신설 — `Toast.css:32-37,121-131`) · **MOTION-03**(**요구가 명시 지목한 `ToggleSwitch` 의 게이트 신설** — `ToggleSwitch.css:79-84`) 은 **`pass` 로**, **MOTION-01** 은 오버레이 모션이 구현됐으나 **CSS-only** 라(라이브러리 부재는 여전하다) **`종속` 으로** 바뀌었다. **이전 배치가 든 gap 사유가 코드로 해소된 것이지 판정 기준이 느슨해진 것이 아니다.**
>
> **잔여 P0 gap 은 EXC-08 의 멱등키 1건뿐**이며, 그마저 `If-Match` 가 데이터 안전을 이미 보장해 **잔여 위험은 UX 다**(BE-067 §7.4). ⚠ **같은 섹션의 API Key 화면은 이번 기준에서 EXC-08 이 pass 로 뒤집혔다**(발급에 멱등키가 붙었다 — `api-keys/data-source.ts:107-141`) — **선례가 둘로 늘었다**(`members/components/PointsCard.tsx` · `api-keys/ApiKeysPage.tsx:96,122-123`).
>
> **이 화면이 해소한 앱 전역 gap 2건 (기록)**: **EXC-03** — 기존 문서가 '`useRouteWritePermissions` 소비자 앱 전체 0건'으로 gap 판정했으나 이 화면이 소비자다(`SiteSettingsPage.tsx:109`). **EXC-04** — 기존 문서가 '유령 저장 · 토큰 없음'으로 gap 판정했으나 이 섹션은 revision 토큰을 쓴다(`store.ts:124-126`). 두 판정은 **화면별로 다시 매겨야 하며** 앱 전역 결론으로 일반화하면 틀린다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·검색·필터·페이지네이션·재정렬·이미지 업로드·CSV·시크릿 등)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 재조회 중 이전 폼 값이 유지된다 — `loading = isFetching && data === undefined`(`:153`)라 스켈레톤이 덮지 않는다. 단 `useEffect([data, reset])`(`:139-142`)가 **편집 중 재조회에서도 `reset` 을 돌려** 입력을 덮는다(FS-067 §7 #7) — 이전 '행'이 아니라 **사용자 입력**이 사라지는 결이라 STATE-03 의 취지와 반대 방향으로 위반한다 | 값을 고치는 중 devtools 로 invalidate → 입력이 유지되는지 | **gap** |
| STATE-05 | P1 | **표면 부재.** 단일 문서라 0건 상태가 없다 — 문서는 항상 존재한다(BE-067 §5) | — | **n-a** |
| STATE-06 | P1 | 저장 성공 시 `useSaveSettings.onSuccess` 가 `setQueryData(key, saved)` + `invalidateQueries`(`_shared/queries.ts:45-46`) — 자기 변경이 즉시 보이고 새 revision 이 곧바로 유효하다. `queries.ts:44` 가 왜 invalidate 만으로 부족한지 밝힌다 | 저장 후 감사 문구(`AuditNote`)가 갱신되는지 | **pass** |
| COMP-01 | P1 | DS `<Button>`·`<SelectField>`·`<ToggleSwitch>`·`<Alert>`·`<Card>`·`<Modal>` 을 쓴다. `buttonStyle()`/`tds-ui-btn-*` 손조립 **0건**(grep). 저장 버튼도 `loading` prop 대신 라벨을 바꾸나(`SettingsFormShell.tsx:181` `{saving ? '저장 중…' : '저장'}`) `disabled` 와 함께 쓰고 DS Button 의 `aria-busy` 패스스루 경로가 열려 있다 — `ConflictDialog.tsx:100` 은 `aria-busy={busy}` 를 명시한다. **다만 셸의 저장 버튼에는 `aria-busy` 가 없다** | `grep -n "buttonStyle(\|tds-ui-btn-" pages/settings/site pages/settings/_shared` → 0건 | **pass(경미한 예외)** |
| COMP-04 | P1 | 텍스트 입력이 `FormField` + `<input className="tds-ui-input tds-ui-focusable">` 관례를 따른다(`_shared/fields.tsx:71-83`). `fields.tsx:3-5` 가 이 관례의 선례(PointsPolicyPage·AccountFormPage)와 이유(@tds/ui TextField 가 자체 라벨을 그려 골격과 맞지 않아 앱 배럴이 내보내지 않는다)를 밝힌다 — **한 벌만 두고 4화면 20여 필드가 공유**한다 | 필드 블록이 복사되지 않았는지 | **pass** |
| COMP-12 | P1 | 길이 제한 필드 3개에 **실시간 카운터**가 있다: 사이트명 `N/60`(`:287`) · 설명 `N/160`(`:299`) · 안내 문구 `N/200`(`:407`). `fields.tsx:34` 가 '길이 제한이 있는 필드는 반드시 준다 (COMP-12)'를 계약으로 못박는다. **그러나 상한 근접 경고가 없고 `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 미정의 | 60자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패 = 인라인 Alert(`SettingsFormShell.tsx:128`) · write 성공 = toast(`:180`) · write 실패 = 카드/다이얼로그 배너(`:264,421`). write 실패가 toast 가 아닌 것은 **폼 맥락**(입력을 보존한 채 그 자리에서 재시도)이라 `FormServerError` 와 같은 결이며 이탈로 보지 않는다 | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast) · 실패(배너) 양 경로가 배선돼 있다(`:173-195`). **no-op 클릭이 없다** — 저장 버튼은 `!dirty` 면 비활성이고, 그 이유를 문구가 말한다('변경 사항이 없습니다.' — `SettingsFormShell.tsx:173`) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P1 | 파괴적 저장(유지보수 전환)의 확인 문구가 **결과를 말한다** — '저장하는 즉시 방문자는 사이트를 이용할 수 없고 안내 문구만 보게 됩니다'(`:99`). '저장할까요?'만 묻지 않는다. 전환 방향까지 3분기(`saveConfirmMessage` — `:97-105`) | 확인 문구가 결과를 명시하는지 | **pass** |
| A11Y-13 | P1 | **폼 진입 시 첫 필드 자동 포커스가 없고, 검증 실패 시 첫 오류 필드로 포커스가 이동하지 않는다** — `handleSubmit(onValid)`(`:279`)에 `onInvalid` 콜백이 없어 `setFocus` 경로가 없다. `useCrudForm` 의 `onInvalid`/`setFocus`(`useCrudForm.ts:176-185,239-241`)를 상속하지 못했다. (같은 섹션의 `CreateApiKeyModal` 은 `initialFocusRef` 로 첫 필드 포커스를 구현한다 — 이 화면만 빠졌다) | 사이트명을 비운 채 저장 → activeElement 가 사이트명 입력인지 | **gap** |
| A11Y-15 | P1 | 충돌 다이얼로그의 액션 이름이 서로 구분된다('최신 내용 불러오기' / '내 변경으로 덮어쓰기') — 헤더 ×(`aria-label='닫기'`)와 겹치지 않는다. `ConflictDialog.tsx:9-10` 이 '파괴적 선택일수록 라벨이 결과를 말해야 한다'를 근거로 남긴다 | 다이얼로그 내 같은 접근 이름의 버튼이 둘 이상인지 | **pass** |
| A11Y-16 | P1 | ToggleSwitch 의 선택 상태가 **색이 아니라 `aria-checked` 로 인코딩**된다 — `ToggleSwitch.css:35,59,72` 의 셀렉터가 전부 `[aria-checked='true']` 를 근거로 삼는다(색은 그 파생이다). 상태 문구도 함께 바뀐다(`:64-73`). 나머지 표면(`role="alert"` 오류 · `aria-busy` 스켈레톤 · FormField 라벨 연결)도 계약을 만족한다 | 스위치가 `aria-checked` 를 노출하는지 | **pass** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 시각이 `shared/format`(`formatDateTime`·`formatRelativeOrDate`)을 경유한다(`AuditNote.tsx:31-32` · `diff.ts:43-47`). **인라인 포맷 0건** — `diff.ts:42` 가 'ERP-08: 인라인 포맷 금지'를 근거로 남긴다 | 인라인 `toString()`/`toLocaleDateString` 이 0건인지 | **pass** |
| ERP-08 | P1 | 감사 시각이 `formatAuditAt`(`diff.ts:43-47`) → `formatDateTime`, 상대 시각이 `formatRelativeOrDate`(`AuditNote.tsx:32`)를 경유한다. **둘 다 `Number.isNaN(parsed.getTime())` 가드가 있다**(`diff.ts:45`) — 깨진 ISO 면 원본을 그대로 보인다. 카운터는 `String(n)` 이나 60/160/200 상한이라 천 단위가 발생하지 않는다 | 셀의 raw numeric toString 이 없는지 | **pass** |
| ERP-13 | P1 | **이 화면의 사용자 대상 문자열에 리터럴 조사 폴백이 0건이다** — `grep -rn "을(를)\|이(가)\|은(는)\|(으)로" pages/settings/` 히트 2건은 **둘 다 `_shared/validation.ts:4-5` 의 주석**이고 렌더되지 않는다. `_shared/validation.ts:3-12` 가 근거를 남긴다: `shared/crud` 의 `requiredText` 는 `${label}을(를) 입력하세요.` 를 **조립**해 '사이트명을(를) 입력하세요'가 그대로 렌더되므로 쓰지 않고, **이 섹션의 라벨은 전부 작성 시점 확정 리터럴**이라 문구를 통째로 받는다(`requiredText(max, { missing, tooLong })`). 그래서 `'사이트명을 입력하세요.'`(`validation.ts:30`)처럼 **옳은 조사가 손으로 박혀 있다.** ⚠ `_shared/validation.ts:11-12` 가 한계를 정직히 밝힌다: '보간이 필요한 화면은 이 방법으로 풀 수 없다 — 그때는 shared/format 의 조사 헬퍼가 있어야 한다'. **GROUND-TRUTH §2 기준 그 헬퍼는 이미 `shared/format.ts:269+` 에 승격돼 있다** — 주석의 '아직 없다'가 낡았다(§5 #7) | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 | **pass** |
| ERP-14 | P1 | 전화번호 붙여넣기를 사람이 고치게 하지 않는다 — blur 에서 `normalizePhone`(`_shared/validation.ts:58-74`)이 `'+82 2 1234 5678'` → `'02-1234-5678'` 로 정규화한다(`:339-349`). 서울 02 국번 2자리·대표번호 8자리까지 분기한다. 테스트 4건(`site.test.ts:106-122`) | `'+82 2 1234 5678'` 붙여넣고 blur → 국내 표기가 되는지 | **pass** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(grep) — 이 화면도 상한이 없다. abort 는 언마운트·확인 취소·충돌 닫기에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **이 화면이 status 로 분기하지 않는다.** 조회 실패가 401/403/404/500 을 같은 문구로(`SettingsFormShell.tsx:130`), 저장 실패가 403/422/500 을 같은 배너로(`:194`) 뭉갠다. 근본 원인은 `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않는 것** — `failIfRequested` 의 generic Error 와 `SettingsConflictError` 뿐이다. **409 만 유일하게 갈린다**(`isSettingsConflict`) | `?status=load:404` 와 `?status=load:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 없다 — `useCrudForm` 미사용이라 그 훅의 422 처리(`useCrudForm.ts:176-186`)를 상속하지 못했다. 모든 저장 실패가 form-level 배너로 간다(BE-067 §7.6 #2). (같은 섹션의 `CreateApiKeyModal` 은 중복 이름 오류를 `setError('name', …)` 로 필드에 꽂는다 — 패턴은 섹션 안에 이미 있다) | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면 부재에 가깝다.** 단일 문서라 '찾을 수 없음'이 정상 경로에 없다(BE-067 §5 404 축: 문서는 항상 존재한다). 다만 **서버가 시딩하지 않아 404 를 내면 화면에 그 분기가 없어** generic 배너로 뭉개진다(BE-067 §7.6 #5) | 없는 문서로 진입 → 전용 문구가 뜨는지 | **gap(잠재)** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(응답 후 `reset` + `setQueryData`)이다. `onMutate`/롤백 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | 이 화면에 `onMutate` 가 0건인지 | **pass** |
| EXC-19 | P1 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 입력이 유실된다** — 프로그램적 이동이라 이탈 가드(FS-067-EL-025)가 발화하지 않는다 | 세션 만료 중 입력 → 재로그인 후 복원되는지 | **gap(앱 전역)** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference`(`shared/errors/http-error.ts:68-75` `createErrorReference()`)가 존재하고 `useCrudForm` 은 `errorReference` 로 노출하는데, 이 화면은 고정 문구(`:194`)만 쓴다. raw stack 노출은 없다(그 절은 충족) | 강제 500 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 조회 응답 p95 | ≤ 300ms (BE-067 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다(`_shared/store.ts:109,115`). 실제 네트워크 0건 |
| 저장 응답 p95 | ≤ 500ms | 위와 동일 |
| 첫 렌더 | ≤ 1.0s (LCP) | 미측정. **문서 1건 · 필드 9개 고정**이라 데이터 규모에 비례하지 않는다 — 이 화면의 렌더 비용은 상수다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | 전역 `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시하고 **이 화면이 재정의하지 않는다**(`_shared/queries.ts:15-19`) — **충족** |
| 저장 요청 크기 | ≤ 4KB | **충족(사실상)** — 9필드 평면 객체이며 `maintenanceMessage` 200자가 최대다. 목록·이력을 싣지 않는다(BE-026 §7.3 이 겪은 '이력에 비례해 커지는 요청' 문제가 없다). ⚠ 단 `baseUrl`·`contactEmail`·`contactPhone` 에 길이 상한이 없어(FS-067 §7 #13) **이론상 상한이 없다** |
| 메모리 | 문서 1건 | 상수 |
| 번들 | 이 화면 고유 코드 ≤ 15KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS·zod/mini) |
| 검증 비용 | 제출당 1회 | zod `safeParse` 1회. **입력마다 돌지 않는다**(`mode` 미지정 = RHF 기본 `onSubmit`) — 단 `setValue(..., { shouldValidate: true })`(유지보수 스위치·전화 정규화)는 그 시점에 1회 돈다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`SettingsFormShell.tsx:125-138`). 폼 대신 배너 — STATE-02 pass |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존·재시도(다이얼로그 유지)는 되나 **reference 없음**(EXC-20 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **동시 편집(두 관리자)** | 나중 저장이 앞선 변경을 덮지 않는다 | **충족 — 이 화면의 핵심 강점.** revision 토큰 불일치 → 409 → 충돌 다이얼로그(3-액션) + 달라진 항목 표시 + 입력 보존(EXC-04 pass). `store.test.ts:54-69` 가 회귀를 막는다 |
| 저장 응답 유실 후 재시도 | 중복 적용 없음 + 사용자가 성공을 안다 | **부분 충족** — `If-Match` 가 중복 적용을 막으나(데이터 안전), 사용자는 **거짓 충돌 다이얼로그**를 본다(EXC-08 gap · BE-067 §7.4) |
| 세션 만료 중 편집 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19 · FS-067 §7 #11) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484`) |
| 편집 중 재조회 | 입력이 유지된다 | **미충족** — `useEffect([data, reset])`(`:139-142`)가 입력을 덮는다(STATE-03 gap · FS-067 §7 #7) |

### 4.3 안전성 — 위험 설정의 취급

사이트 설정은 **켜는 순간 사이트가 내려가는 값**(유지보수 모드)과 **앱 전체의 링크 기준**(기본 URL)을 담는다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 위험 값의 결과를 **저장 전에** 알린다 | **충족** — 스위치를 켜면 즉시 danger 경고(`:271-278`). 드래프트 기준이라 저장 전에 뜬다 |
| 확인 문구가 **결과를 말한다**(‘저장할까요?’만 묻지 않는다) | **충족** — `saveConfirmMessage`(`:97-105`)가 전환 방향별 3분기로 결과를 명시 |
| 위험 값이 **불완전한 상태로 저장되지 않는다** | **충족** — 유지보수 모드 + 빈 문구를 스키마가 거부(`validation.ts:60-67`). 방문자에게 빈 화면을 내보내지 않는다. 테스트 `site.test.ts:79-104` |
| 위험 값의 **집행이 보장된다** | **미정 — 이 계약 밖이다.** 저장은 되는데 게이트웨이가 읽지 않으면 이 화면은 거짓말이 된다(BE-067 §7.6 #6). '관리자는 계속 접속할 수 있다'(EL-010 힌트)는 약속도 집행 주체가 보장해야 한다 |
| 위험 값의 **변경 이력**이 남는다 | **부분 — 마지막 1건만.** `AuditNote` 가 '마지막 변경: 누가 · 언제'를 보인다. '지난주에 왜 켜졌나'는 답할 수 없다(BE-067 §7.6 #8) |
| 감사 주체가 **위조 불가**하다 | **미충족(픽스처)** — `updatedBy` 가 하드코딩 `'김운영'`(`_shared/store.ts:84`). 서버가 세션에서 찍어야 한다(BE-067 §7.3) — **심이 이미 그렇게 선언한다**(`store.ts:83`) |
| `baseUrl` 이 **평문 스킴을 받지 않는다** | **충족(프론트)** — https 강제(`validation.ts:25,37-42`) + 테스트(`site.test.ts:40-56`). ⚠ 정규식이라 authority 트릭(`https://evil@real.example.com`)을 거르지 못한다 — 서버가 파서로 재검증해야 한다(BE-067 §7.6 #4) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | MOTION-01 | P0 → **종속** | **~~Motion 라이브러리 미도입으로 Modal 에 fade/scale/exit 이 없다~~ — 이 사유는 PR #26 으로 해소됐다.** 오버레이 모션이 구현됐고(`Modal.css:20-21,30-38,58-59` + keyframes `:126-168` · reduced-motion 게이트 `:173-180`) **Toast exit**(`Toast.css:32-37,121-131`)과 **`ToggleSwitch` reduced-motion 게이트**(`ToggleSwitch.css:79-84`)도 신설돼 **MOTION-02·03 은 pass 로 뒤집혔다.** **라이브러리는 여전히 미도입**(`packages/ui/src` Motion/AnimatePresence 0건)이나 'exit 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성했다. **잔여**: footer 버튼 경로는 즉시 언마운트(`Modal.tsx:27-31`)이고 **이 화면의 다이얼로그 3종은 footer 가 주 닫기 수단**이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 DS 소유 문서가 정한다** | **`packages/ui`(DS)** | **A41 / DS (판정 대기)** |
| 2 | EXC-08 | P0 | 저장에 **멱등키 없음**(`grep Idempotency pages/settings/` = 0건). 동기 잠금(`useSubmitLock`)은 있어 연타는 막힌다. **`If-Match` 가 중복 적용을 막아 데이터는 안전** — 잔여 위험은 '자기 저장에 대해 거짓 충돌 다이얼로그를 보는' UX. 선례: `members/components/PointsCard.tsx:103,162-173` | 이 화면 + BE 계약 | A11 · A63 (BE-067 §7.4) |
| 3 | STATE-03 | P1 | `useEffect([data, reset])`(`:139-142`)가 **편집 중 재조회에서도 `reset`** 을 돌려 입력을 덮는다 | 이 화면(설정 4화면 공통 패턴) | A11 change_request |
| 4 | EXC-06 · EXC-12 | P1 | 조회·저장 실패가 status 를 구분하지 않는다. 근본 원인은 `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않는 것** — 409 만 `SettingsConflictError` 로 갈린다 | 이 화면 + `_shared/store.ts` + 어댑터 | A11 · A63 |
| 5 | EXC-07 · EXC-20 | P1 | 422 `error.fields` → RHF `setError` 매핑 없음 · 5xx reference code 미표시. 패턴은 섹션 안에 이미 있다(`CreateApiKeyModal` 의 `setError('name', …)`) | 이 화면 | A11 (BE-067 §7.6 #2) |
| 6 | A11Y-13 | P1 | `handleSubmit(onValid)` 에 **`onInvalid` 가 없어** 검증 실패 시 첫 오류 필드로 포커스가 가지 않는다. 폼 진입 첫 필드 포커스도 없다 | 이 화면(설정 4화면 공통) | A11 change_request |
| 7 | ERP-13 (주석) | — | `_shared/validation.ts:11-12` 가 '조사 헬퍼가 **아직 없다**'고 적으나 **GROUND-TRUTH §2 기준 `shared/format.ts:269+` 에 승격돼 있다** — 낡은 주석. 판정 자체는 pass(이 화면에 보간 문구가 없다) | 이 화면(주석) | A11 change_request(경미) |
| 8 | COMP-12 | P1 | 카운터는 있으나 **상한 근접 경고가 없고** `maxLength` 가 조용히 자른다. 조합형 한글 counting 기준 미정의 | 이 화면(설정 4화면 공통) | A11 |
| 9 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 미저장 입력을 버린다 | **앱 전역** | A40 · A11 |
| 10 | (FS-067 §7 #5) | — | **저장 실패 배너가 충돌 다이얼로그와 중복 표시된다** — `:264` 가 `conflict === null` 을 검사하지 않는다. **언어(`LanguagesPage.tsx:283`)·OAuth(`OAuthPage.tsx:247`)는 검사한다 — 이 화면만 빠졌다** | 이 화면 | A11 change_request |
| 11 | (FS-067 §7 #6) | — | **`timezone` 이 저장되지만 아무도 읽지 않는다** — 화면이 그 사실을 알리지 않는다(언어 화면은 같은 상황을 info 배너로 밝힌다 — FS-068-EL-010). 운영자가 UTC 를 골라 두고 기다리게 된다 | 이 화면 + 소비자 부재 | A11 · A01 (BE-067 §7.6 #7) |
| 12 | (FS-067 §7 #13 · BE-067 §7.6 #4) | — | `baseUrl`·`contactEmail`·`contactPhone` 에 **길이 상한이 없다.** `baseUrl` 이 정규식 검증이라 authority 트릭을 거르지 못한다 — **같은 섹션의 OAuth 는 URL 파서를 쓴다**(`oauth/validation.ts:60-65`). 섹션 안에서 두 방식이 갈렸다 | 이 화면 + BE 계약 | A11 · A63 |
| 13 | (BE-067 §7.3) | — | **감사 주체 위조 가능** — `updatedBy` 하드코딩 `'김운영'`(`_shared/store.ts:84`), `updatedAt` 클라이언트 시각(`:131`). 서버가 세션·서버 시각으로 찍어야 한다. **심이 이미 선언**(`store.ts:83`) | BE 계약 | **A63 (최우선)** |
| 14 | (BE-067 §7.1) | — | **`maintenanceMessage`·`siteName`·`siteDescription` 저장 시 XSS 정제 미정** — 방문자에게 렌더되는 문구다 | BE 계약 | A63 |
| 15 | (BE-067 §7.6 #5) | — | **미설정 상태의 계약이 미정** — 서버가 기본값 문서를 시딩하지 않으면 EP-01 이 404 를 낼 수 있고 화면에 그 분기가 없다 | BE 계약 | A63 |
| 16 | (BE-067 §7.6 #6) | — | **유지보수 모드의 집행 주체가 계약 밖** — 저장은 되는데 사이트가 안 내려가면 이 화면은 거짓말이 된다 | BE 계약 · 인프라 | A63 · A40 |
| 17 | (FS-067 §7 #8 · #12) | P2 | 스켈레톤 행 수 하드코딩 `[0,1,2,3]`(실제 필드 9) · `SiteSettingsPage.tsx:15` 주석이 **존재하지 않는 `_shared/access.tsx`** 를 권한 게이트로 지목(실제는 `shared/permissions/RequirePermission`) | 이 화면 | A11 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다**(기준일 2026-07-17 · `HEAD = a5c2639`). 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`siteSettingsStore` 는 `createRevisionedStore('site', …)`(`data-source.ts:33`)로 만들어지므로 scope = **`site`** 이고, `failIfRequested(scope, op)` 를 두 곳에서 부른다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `load` | `fetch` (`_shared/store.ts:110`) | `?fail=load` · `?fail=site:load` · `?fail=all` |
| `save` | `save` (`_shared/store.ts:116`) | `?fail=save` · `?fail=site:save` · `?fail=all` |

**충돌 재현 스위치(이 섹션 고유 — `dev.ts` 에 없다)**

`conflictRequested(scope)`(`_shared/store.ts:60-65`)가 `?fail=` 파라미터를 **직접** 읽어 `conflict` / `site:conflict` 를 찾는다. 걸리면 저장 직전에 revision 을 바꿔(`:120`) 토큰을 어긋나게 만든다 — 즉 **다른 관리자가 먼저 저장한 상황을 재현**한다.

| 재현 | 결과 |
|---|---|
| `/settings/site?fail=conflict` | 저장이 409 → **충돌 다이얼로그**(EXC-04 판정) |
| `/settings/site?fail=site:conflict` | 이 화면에서만 |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). **STATE-01 재현은 `?delay=` 가 아니라 `staleTime` 30초 경과 후 재진입 또는 devtools invalidate 로 한다.**
- **`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`)는 `failIfRequested` 를 거치는 op 에 걸리므로 `?status=load:404` · `?status=save:500` 등이 이 화면에도 적용된다. 다만 **이 화면이 status 로 분기하지 않아**(EXC-06 gap) 결과 화면이 같다 — 그것이 곧 gap 의 재현이다.

| 판정 | 재현 |
|---|---|
| STATE-01 (재조회가 폼을 덮지 않는다) | 값 확인 → 30초 후 재진입. **스켈레톤이 뜨면 gap** |
| STATE-02 (조회 실패) | `?fail=load` — danger Alert + '다시 시도' 없으면 gap |
| EXC-04 (409 충돌) | `?fail=conflict` — **충돌 다이얼로그 + 입력 보존 + 달라진 항목 목록이면 pass** |
| EXC-03 (write 게이팅) | 권한 스토어에서 `page:/settings/site` 의 `update` off — **저장 버튼이 사라지면 pass** |
| EXC-08 (연타) | 확인 버튼 2연타 — 요청 1건이면 ① pass. `grep Idempotency` = 0건이면 ② gap |
| EXC-09 (abort) | 저장 중 '취소' — 실패 배너·토스트가 없으면 pass |
| EXC-06 (status별 surface) | `?status=save:422` · `save:500` — 전부 같은 배너면 gap |
| MOTION-03 (reduced-motion) | OS reduced-motion + 유지보수 스위치 토글 — **손잡이가 즉시 점프하면 pass**(`ToggleSwitch.css:79-84`) |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · A11Y-11 · A11Y-12 · IA-02 · ERP-13 · EXC-08 판정) · RTL(A11Y-11 의 `aria-required` 주입 + describedby↔alert id 일치 — **grep 으로는 판정 불가, 주입이 런타임이다**) · `site.test.ts`(검증 규칙 회귀 15건) · `_shared/store.test.ts`(**낙관적 동시성 회귀 6건 — EXC-04 의 근거**) · `_shared/secret.test.ts`(이 화면과 무관 — 시크릿 축은 NFR-069·070).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다 (STATE-04·IA-04 목록 부재 · COMP-10 검색 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재 · IA-13 list state 부재)
- [x] **§2.1 산수 검산 — 13 pass + 9 종속 + 7 n-a + 1 gap = 30 ✓** (요약표 + 30행 전수 나열 2중 검산)
- [x] **A11Y-11 의 '전수' 가 진짜 전수임을 확인했다** — `grep -rn "required" apps/admin/src/pages/settings/` 히트를 전건 분류한 결과 **설정 4화면의 모든 `required` 는 `FormField` prop 이거나 zod 헬퍼 이름(`requiredText`/`requiredEmail`/`requiredPhone`)이며, `FormField` 를 거치지 않는 required 표면이 0건**이다. `ImageUploadField`·`ImageGalleryField`·`SegmentPicker`·`TextField`·`PasswordField`(전부 `required` 를 AT 에 잇지 않는 컴포넌트)의 소비가 **이 섹션에 0건**이다(유일한 grep 히트 `_shared/fields.tsx:4` 는 'TextField 를 쓰지 않는 이유'를 적은 주석이다). 이 섹션의 `@tds/ui` 직접 import 는 `Empty`·`Checkbox` 뿐이고 **둘 다 `required` 를 받지 않는다** — 따라서 `FormField` 주입 경로만 판정하면 충분하다
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] **`상속` + `gap` 조합의 근거를 §1.1 에 규약으로 명시**했다 — MOTION 3건은 DS 소유이나 상태가 코드로 확정돼 `종속` 이 아니라 `gap` 이다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(목록·검색·업로드·CSV·시크릿)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`site`)와 op 2종을 **`createRevisionedStore` 호출부에서 확인**했고, **이 섹션 고유의 `?fail=conflict` 스위치**(`store.ts:60-65`)를 별도로 기록했으며, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] §5 의 gap 이 FS-067 §7 · BE-067 §7.6 과 일치한다
- [x] **EXC-03 · EXC-04 가 이 화면에서 pass 이며 그것이 기존 배치의 앱 전역 gap 판정을 뒤집는다는 사실**을 §2.1 하단에 기록했다
</content>
