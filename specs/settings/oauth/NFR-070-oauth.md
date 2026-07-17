---
id: NFR-070
functionalSpec: FS-070
backendSpec: BE-070
qualityBar: specs/quality-bar.md
title: "OAuth 설정 비기능 명세"
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-070. OAuth 설정 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-070 OAuth 설정 (`/settings/oauth`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-070(요소·예외) · **BE-070(§7.2 시크릿 계약 · §7.1 Redirect URI 보안)** · NFR-067·068(형제 단일 문서 폼) · NFR-069(형제 시크릿 화면) · `specs/quality-bar.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-070 §7 · BE-070 §7.9 와 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **A11Y-11 `gap` → `pass`**(PR #30 — `OAuthProviderCard.tsx:113,114,186` 이 진짜 `<input>` 에 `aria-required` 를 직접 준다) · **MOTION-01 `gap` → `종속`** · **MOTION-02 `gap` → `pass`(상속)** · **MOTION-03 `gap` → `pass`(상속)**(PR #26 — 오버레이 모션 구현 · `ToggleSwitch.css:79-84` reduced-motion 게이트 신설). **P0 gap 5 → 1** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 `pages/settings/oauth/**` · 섹션 공유 `pages/settings/_shared/**`)의 코드가 충족을 결정 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` / `gap` / `종속` | 충족 / 미충족(§5 이관) / 소유 문서의 판정이 미확정이라 그것을 따름 |

> **`상속` + `gap` 조합**: 소유가 DS 라도 **그 상태가 코드로 확정된 경우**(예: Motion 라이브러리 미도입)에는 `종속` 이 아니라 `gap` 으로 적는다 — 이 화면에 표면이 실재하는 이상 사용자가 결함을 겪기 때문이다. **해소는 앱 코드로 불가능**하며 이관 대상이 DS 임을 §5 에 명시한다. (NFR-067 §1.1 과 같은 규약)

### 1.2 화면 성격

**단일 문서 폼(잎 라우트)이며 사이트·언어 설정과 같은 셸·저장소를 공유한다**(`SettingsFormShell` + `createRevisionedStore`). 그래서 STATE·EXC-03·EXC-04·EXC-09 판정이 NFR-067·068 과 일치한다.

**이 화면만의 성격 셋**:
1. **시크릿을 다루되 API Key 와 방식이 다르다** — 평문이 **RHF 폼 상태에 산다**(사용자가 입력하는 값이라 불가피). API Key 는 모델에 평문 자리가 아예 없다(NFR-069 §4.3). **저장이 평문을 지운다**(`normalizeAfterSave` — 테스트 3건이 고정).
2. **문서가 배열이다**(`providers[]`) — 충돌 표시가 `divergedLabels` 가 아니라 제공자 이름 직접 조립(BE-070 §7.4).
3. **A11Y-11 이 이 화면에서만 다른 방식으로 충족된다 — 해소됨(PR #30).** Client Secret 필드의 자식이 래퍼 `<span>` 이라 `FormField` 의 `withAriaRequired` 주입 대상이 아니지만, **호출부인 카드가 진짜 `<input>` 에 `aria-required` 를 직접 준다**(`OAuthProviderCard.tsx:113,114,186`). **형제 3화면(FormField 자동 주입)과 결과는 같고 경로만 다르다**(§2 A11Y-11).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** `OAuthPage.tsx:118` `const loading = isFetching && data === undefined` — **첫 로딩만** 판정한다(`isFetching` 직결이 아니다). `SettingsFormShell` 이 세 상태를 배타적으로 그린다: 조회 실패 → 배너만(`:125-138`, early return) / 첫 로딩 → 스켈레톤만(`:152-157`) / 그 외 → 폼(`:159`). **재조회 중에는 이전 제공자 카드·입력이 유지된다.** 0행 empty 는 해당 없음(단일 문서). ⚠ **초기값이 `providers: []` 라**(`:42`) 도착 전에는 카드가 0개이나 **스켈레톤이 그 자리를 대체**해 빈 폼이 번쩍이지 않는다 | `/settings/oauth` 진입 → 제공자 카드 3개 확인 → `staleTime` 30초 경과 후 재진입(또는 devtools invalidate). **카드가 스켈레톤으로 바뀌지 않고 유지되면 pass.** `?fail=load` → 배너만 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** `SettingsFormShell.tsx:125-138` 이 조회 실패 시 `<Alert tone="danger">` + '다시 시도'(`onRetry` → `refetch` — `:246`)를 **폼 대신** 렌더한다. error toast 를 쓰지 않는다 — 이 화면의 `toast` 호출은 성공 2건뿐(`:144` 저장 · `:188` 최신 불러오기). 저장 실패도 토스트가 아니라 카드 배너(`:154` → `:247`) | `/settings/oauth?fail=load` 진입. **danger Alert + '다시 시도' 가 뜨고 토스트가 없으면 pass** | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 페이지네이션·행 선택·목록이 하나도 없다 — 단일 문서 폼이다(§1.2). 'page clamp' · 'selection 리셋' 이 걸릴 표면이 존재하지 않는다. **제공자 카드 3개는 목록이 아니라 폼 섹션**이다(각각이 필드 묶음이며 선택·정렬·페이징 대상이 아니다) | 목록·선택이 도입되면 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `grep -rnE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/settings/` → **0건**(2026-07-17). 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `OAuthProviderCard.tsx` 의 `maskedStyle`(`:44-59`)도 border-width 를 토큰으로 쓴다(`--tds-border-width-thin`). 파생 치수 0건 | 위 grep → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-input tds-ui-focusable`(`OAuthProviderCard.tsx:146,180,216`) · DS `<Button>`·`<ToggleSwitch>`(자체 `:focus-visible` 이 `--tds-border-width-medium` 을 쓴다 — `ToggleSwitch.css:17-21`). **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건) | DS 토큰 문서 판정을 따른다. 로컬 `:focus-visible` 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `SettingsFormShell.tsx:155`) · **Toast enter/exit**(`Toast.css:26-27` · `:32-37` — 둘 다 `component.overlay` recipe 의 easing 을 소비한다) · **Modal enter/exit**(`Modal.css:20-21,30-38,58-59` — 같은 recipe) · DS `<Button>`·`<ToggleSwitch>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건). ⚠ **PR #26 으로 이 화면이 상속하는 easing 소비 표면이 늘었다** — `component.overlay.{enter,exit}-easing`(`tokens/tokens.json:1293-1307`)이 신설 소비자다 | tokens codegen · `Toast.css`·`Modal.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` — **중첩**(셸의 카드 `SettingsFormShell.tsx:145` 안에 제공자 카드 `OAuthProviderCard.tsx:121` 3개) · Modal(확인·충돌 — `Modal.css:55` `box-shadow: var(--tds-shadow-modal)`) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건). ⚠ **카드 중첩 시 shadow 누적으로 위계가 흐려질 수 있다** — 다른 3화면은 단층이다(FS-070 §7 #10) | Card/Modal/Toast 토큰 판정에 종속. **중첩 Card 의 shadow 누적**을 DS 문서에 확인 요청 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다**(`grep -rn "h1" apps/admin/src/pages/settings/` → **0건**). 제목은 **AppHeader 가 소유**하며(`AppHeader.tsx:101`) nav 잎 라벨 'OAuth 설정'을 렌더한다. `CardTitle`(셸 'OAuth 설정' · 제공자 'Google'/'카카오'/'네이버')은 `<h1>` 이 아니라 카드 시맨틱이다. **이 화면이 title 타이포를 직접 선언하지 않는다** | AppHeader `titleStyle` 이 title tier 를 참조하는지 확인. 로컬 title 스타일 선언이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** **검색 입력이 없다** — `grep -rn "SearchField\|useDebouncedSearch" pages/settings/` → **0건**. 단일 문서 폼이라 조회할 query 자체가 없다. 'IME 조합 중 커밋 금지 + 디바운스 + stale 응답 무효'가 걸릴 자리가 없다. **텍스트 입력 3종(Client ID·Secret·Redirect URI)은 폼 값이지 query 가 아니다** — 서버 조회를 발화하지 않는다 | 검색 입력이 도입되면 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족.** 파괴적 서버 액션 표면은 **저장 확인 다이얼로그**(FS-070-EL-019)다 — intent 는 `update` 이나 **제공자를 끄면 그 방식으로 가입한 사용자가 로그인하지 못한다**(화면이 그렇게 경고한다 — `:67`). 요구의 계약이 그대로 걸린다. ① **강제실패가 다이얼로그를 유지한다** — `onError` 가 `setSaveError(...)`(`:154`)만 하고 `setPending(null)` 을 하지 않아 다이얼로그가 살아 있고, `error={saveError}`(`:310`)로 그 안에 배너가 뜬다. **재클릭이 곧 재시도** ② **중간닫기 = abort** — `cancelSave`(`:172-179`)가 `abort()` + `save.reset()` + `lock.release()`. DS 가 busy 중에도 취소를 살려 둔다(`ConfirmDialog.tsx:144`). intent→tone/label/icon 과 초기 포커스는 DS 소유 | `/settings/oauth?fail=save` 에서 제공자를 켜고 저장 → 확인. **다이얼로그가 열린 채 danger 배너가 뜨고 확인 버튼이 재활성되면 pass.** 저장 중(400ms) '취소' → 실패 토스트·배너가 없어야 한다 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족.** `SettingsFormShell.tsx:122` `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })`. `dirty` 는 RHF `formState.isDirty`(`:95` → `:249`), 기준선은 `reset(data.value)`(`:112`). 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유(`useUnsavedChangesDialog.tsx:127,151,178`). 문구 'OAuth 설정에 저장하지 않은 변경 사항이 있습니다…'(`:30-31`). **저장 후 통과**: 성공 시 `reset(normalizeAfterSave(values))`(`:139-140`)로 dirty 가 풀려 가드가 내려간다. **저장 중에는 가드하지 않는다**(`dirty && !saving`). **이 화면에서 이 가드는 입력한 평문 시크릿을 지키는 장치이기도 하다**(§4.3). ⚠ **'변경' 버튼(FS-070-EL-008.3)은 dirty 를 만들지 않는다** — `changingSecrets` 가 폼 밖 state 라(`:105`) 입력칸만 열고 이탈하면 가드가 안 뜬다. **그러나 그때 잃는 것이 없으므로**(입력 전이다) 이 요구의 gap 이 아니다 — 별도 결함으로 §5 #6 | Client ID 를 고친 뒤 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** **편집 가능한 폼을 담은 modal 이 없다** — 폼은 라우트 본문의 `<Card>` 로 렌더된다(`SettingsFormShell.tsx:145`). 이 화면의 modal 은 둘 다 **입력 필드가 없는 확인 다이얼로그**다: 저장 확인 `ConfirmDialog`(FS-070-EL-019) · 충돌 `ConflictDialog`(FS-070-EL-021, 본문이 `<p>`·`<ul>`·`<Alert>` 뿐 — `ConflictDialog.tsx:106-132`). 이탈 가드도 확인 전용. 'modal 4경로 dirty 가드'가 걸릴 dirty 상태가 modal 안에 없다 — **라우트 레벨 dirty 는 FEEDBACK-04 가 담당**. (같은 섹션의 `CreateApiKeyModal` 은 폼 modal 이라 NFR-069 에서 이 요구가 `직접`·pass 다) | 폼 modal 이 도입되면 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | toast 표면 2건: 저장 성공 `toast.success('OAuth 설정을 저장했습니다.')`(`:144`) · 충돌 해소 `toast.success('최신 OAuth 설정을 불러왔습니다.')`(`:188`). 지속 live region 은 `ToastProvider` 가 소유(비-error=polite · error=assertive 2벌 — `Toast.types.ts:15`) — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | dialog 표면 3건 모두 `aria-describedby` 가 배선돼 있다: ① **저장 확인** — DS `ConfirmDialog` 가 `useId` 로 message id 를 만들어 `Modal describedBy` 로 넘긴다(`ConfirmDialog.tsx:129,135`) ② **충돌** — `ConflictDialog.tsx:88` `useId()` → `:94` `describedBy={messageId}` → `:107` `<p id={messageId}>` ③ **이탈 가드** — 훅이 `ConfirmDialog` 를 렌더. `Modal.tsx:158` 이 `aria-describedby={describedBy}` 를 dialog 노드에 건다 | DS 판정에 종속. 충돌 다이얼로그 open 시 본문이 title 과 함께 읽히는지 확인 | **종속** |
| **A11Y-11** | A11Y | 직접 | **충족 — PR #30 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** **① required 노출 — 3필드 전수 충족.** `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 **런타임 `cloneElement` 로 자식의 `aria-required` 에 주입**하되, `isRequirableChild`(`:36-41`)가 **네이티브 `input`/`select`/`textarea` 와 DS `SelectField` 만** 허용하고 **래퍼 `div`/`span` 은 거부한다**(거짓 시맨틱 방지 — 의도된 설계). 이 화면의 required FormField 3종을 전수 확인: **Client ID**(`OAuthProviderCard.tsx:136-154` `required={value.enabled}`) → 자식이 네이티브 `<input type="text">`(`:143`) → **주입됨 ✔** · **Redirect URI**(`:205-225` `required={value.enabled}`) → 자식이 네이티브 `<input type="url">`(`:212`) → **주입됨 ✔** · **Client Secret**(`:156-203` `required={secretRequired}` — `:159`) → 자식이 삼항 양쪽 모두 `<span style={secretRowStyle}>`(`:168` 마스킹 분기 · `:176` 입력 분기)라 `isRequirableChild` 를 통과하지 못해 **주입은 여전히 안 된다** — 그러나 **호출부가 진짜 컨트롤에 직접 준다**: `const secretRequired = value.enabled && !value.hasSecret`(`:113`) · `const secretRequiredProps = secretRequired ? { 'aria-required': true } : {}`(`:114`) → 입력 분기의 `<input type="password">`(`:177`)에 **spread**(`:186`) → **AT 에 닿는다 ✔**. **`false` 일 때는 속성 자체를 남기지 않는다**(`:114` 의 빈 객체 — `aria-invalid` 를 짝지어 다루는 방식과 같다). 근거가 코드에 있다(`:103-112`): 래퍼에 얹으면 거짓 시맨틱이라 FormField 가 의도적으로 거부하므로 **호출부가 진짜 `<input>` 에 준다**, 그리고 `FormField` 는 호출부 값을 우선한다(`FormField.tsx:53-54`). **required 일 때 그 `<input>` 이 항상 렌더된다**는 것도 코드가 논증한다(`:110` — `required` 면 `hasSecret` 이 거짓이므로 `showMasked = hasSecret && !changingSecret` 가 반드시 거짓). **② aria-invalid without describedby = 0건 — 충족.** 이 화면의 `aria-invalid` 3건(`:150,187,219`) 전부 바로 다음 줄이 `aria-describedby` 를 **같은 조건으로** 짝지운다(`:151,188,220` — `errorIdOf(...)`). `FormField` 가 같은 id 로 `<p id={errorIdOf(htmlFor)} role="alert">`(`FormField.tsx:110`)를 렌더하므로 id 가 일치한다. **③ 잔여 부수 결함 — 마스킹 분기에 `htmlFor` 가 가리킬 컨트롤이 없다**: `showMasked`(`:97`) 면 자식이 `<span>` 뿐이라 `<label for="oauth-<p>-secret">` 이 **존재하지 않는 id 를 가리킨다**(라벨 클릭이 아무 데도 포커스하지 않는다). **required 축과는 무관하다**(그때는 required 가 false 다) — A11Y-11 판정 밖의 별개 결함으로 §5 #6 | ⚠ **`aria-required` grep 만으로 판정하면 안 된다 — FormField 주입은 런타임이다.** 이 화면은 **호출부 직접 부여라 소스에도 보인다**(`:114,186`). **RTL 로 고정돼 있다** — `OAuthProviderCard.test.tsx:61` describe `OAuthProviderCard — Client Secret 의 required 가 AT 에 닿는다 (A11Y-11)`: `:62` `켜져 있고 저장된 시크릿이 없으면 입력이 aria-required 를 갖는다` · `:69` `꺼져 있으면 필수가 아니다 — 속성을 남기지 않는다 (대조)` · `:74` `이미 저장돼 있으면 필수가 아니다 — 비워 두면 기존 값이 유지된다 (대조)` · `:82` `aria-required 는 컨트롤에만 붙는다 — 래퍼 <span> 에는 붙지 않는다 (거짓 시맨틱 방지)` | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** **필터가 없다**(단일 문서 폼 — §1.2). `aria-pressed` 를 쓸 toggle 필터 list item 이 존재하지 않으며 이 화면 전체에 `aria-current` **0건**. **ToggleSwitch 3개(제공자 사용 여부)는 필터가 아니라 폼 값**이며 DS 가 `aria-checked` 로 상태를 노출한다(`ToggleSwitch.css:35` 셀렉터가 그것을 증명한다 — 색이 아니라 aria 속성이 상태를 소유한다) — 이 요구의 appliesTo 가 아니다 | 좌측 토글 필터가 도입되면 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | **PR #26 에서 구현됐다 — 다만 라이브러리가 아니라 CSS-only 다.** 이 화면이 상속하는 Modal 표면 3종(저장 확인 `ConfirmDialog` · 충돌 `ConflictDialog` · 이탈 가드). backdrop fade + dialog scale 이 실재한다: backdrop enter `Modal.css:20-21`→`@keyframes tds-modal-backdrop-in :126-134` · exit `:30-33`→`tds-modal-backdrop-out :136-144` · dialog enter `:58-59`→`tds-modal-dialog-in :146-156`(opacity 0→1 · `scale(0.96)→scale(1)`) · exit `:35-38`→`tds-modal-dialog-out :158-168`(`forwards`). `component.overlay` recipe 소비(`tokens/tokens.json:1286-1308`). **`AnimatePresence` 는 없고**(`packages/ui/src` 에 Motion/framer-motion 소비 **0건** — 라이브러리 미도입) 'exit 완료 후에만 unmount' 를 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`)로 동등 달성한다. **잔여**: 애니메이션되는 닫힘은 Modal 소유 3경로(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`)뿐이고 **footer 버튼은 여전히 즉시 언마운트**(`Modal.tsx:27-31` — 호출부 콜백 직행) — **이 화면의 다이얼로그 3종은 모두 footer 버튼이 주 닫기 수단**이다. **라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫** — 이 화면이 애니메이션을 선언하지 않으므로 앱 코드로 결정할 수 없다 | 저장 확인 다이얼로그를 연다. **backdrop 이 fade in 하고 dialog 가 `scale(0.96)→1` 로 들어오면 enter 는 충족.** Esc 로 닫아 exit 를 관찰하고, **footer '취소' 로 닫으면 exit 없이 즉시 사라지는 것**을 대조한다 | **종속** |
| MOTION-02 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** Toast 표면이 실재한다(`:144,188`). exit 애니메이션이 실재한다: `.tds-toast--exiting` `Toast.css:32-37`(`tds-toast-out … forwards` + `pointer-events: none`) → `@keyframes tds-toast-out :121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`). enter `:26-27`/`:109-119`. **요구가 명시한 'exit duration fast~normal · easing accelerate' 를 정확히 충족** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`). exit 완료 후 unmount 는 `TOAST_EXIT_ANIMATION` 대조 `onAnimationEnd` 로 달성. reduced-motion 게이트 `Toast.css:136-141`. queue/ARIA 유지는 `ToastProvider` 소유 | 저장 성공 → 토스트 자동소멸 관찰. **opacity fade + 아래로 translate 후 사라지면 pass** | **pass** |
| MOTION-03 | MOTION | 상속 | **충족 — PR #26 에서 해소됐다(이전 배치 판정 `gap` 을 뒤집는다).** reduced-motion 게이트가 걸려야 할 이 화면의 표면: **`ToggleSwitch` 3개**(제공자마다 1개 — `OAuthProviderCard.tsx:125-130`) · 스켈레톤 펄스 · Toast · Modal · Button. **요구가 명시 지목한 `ToggleSwitch` 의 게이트가 실재한다** — `ToggleSwitch.css:79-84` `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }`. 남아 있는 transition 선언 2건(`:32` `background-color` · `:56` `transform`)을 **둘 다 이 게이트가 끈다** → 손잡이가 즉시 최종 위치로 스냅한다. 근거 주석 `:76-78`: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향이고, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실 0**. 나머지 표면도 각자 게이트를 갖는다 — Modal `Modal.css:173-180` · Toast `Toast.css:136-141` · 스켈레톤 `shared/ui/ui.css:110-114` | OS 를 reduced-motion 으로 두고 `/settings/oauth` 에서 제공자 스위치를 토글. **손잡이가 즉시 점프하면 pass.** `grep -n "prefers-reduced-motion" packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css` → **`:79` 히트** | **pass** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:340` `{ path: '/settings/oauth', element: <OAuthPage />, implemented: true }`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={pageStyle}>`(`SettingsFormShell.tsx:141`). `App.tsx:335-336` 주석이 구조를 밝힌다 | `/settings/oauth` 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족.** `/settings/oauth` 는 **nav 잎**이다(`nav-config.ts:230` `['OAuth 설정', '/settings/oauth']`) — 하위 라우트가 없다. `findCoveringLeaf('/settings/oauth')`(`nav-config.ts:270-278`)가 **자기 자신을 정확히 찾고** `findNavLabel`(`:297-299`)이 `'OAuth 설정'` 을 반환한다. AppHeader 가 `<h1>` 으로 렌더(`AppHeader.tsx:101`). **이 화면은 in-content `<h1>` 을 그리지 않는다** — grep **0건**. 따라서 **`<h1>` 이 정확히 1개이고 title 메커니즘이 단일하다.** GROUND-TRUTH §7 의 gap 두 갈래(가지 라벨 폴백 · h1 이중)가 **여기엔 둘 다 없다.** ✔ **카드 제목('OAuth 설정')이 nav 라벨과 일치한다** — 언어 화면은 갈린다(NFR-068 §5 #9) | `/settings/oauth` 진입. **AppHeader 의 가시 `<h1>` 이 'OAuth 설정'이고 `document.querySelectorAll('h1').length === 1` 이면 pass** | **pass** |
| IA-04 | IA | N/A | **표면이 없다.** **list 화면이 아니다** — 단일 문서 폼이다(§1.2). 표·결과 count·우상단 목록 action·SelectionBar·Pagination 이 하나도 없고, 있어야 할 이유도 없다(문서가 1건이다). ⚠ **제공자 카드 3개는 list 가 아니라 폼 섹션**이다 — 각각이 필드 묶음이며 정렬·필터·페이징 대상이 아니고 개수가 코드 상수다(BE-070 §7.7). 요구의 appliesTo('list 템플릿')가 성립하지 않는다 | 이 라우트에 목록이 도입되면 다시 매긴다 | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다.** `/settings/oauth` 단일 라우트이며 `/new`·`/:id/edit` 가 없다 — **설정 문서는 생성·삭제되지 않고 편집만 된다**(BE-070 §5 404 축: '문서는 항상 존재한다'). **제공자도 만들거나 지울 수 없다**(코드 상수 3종 — BE-070 §7.7). '`new` 와 `:id/edit` 가 동일 폼 컴포넌트' 라는 요구가 걸리지 않는다 | 폼 라우트 쌍이 생기면 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** **URL 에 직렬화할 list state 가 없다** — 필터·검색·정렬·페이지가 하나도 없다. `grep -rn "useListState\|useSearchParams" pages/settings/` → **0건**. 폼 입력값은 list state 가 아니며 **이 화면에서는 URL 에 넣으면 안 된다** — **평문 시크릿이 히스토리·리퍼러·서버 로그에 남는다**(§4.3). '`Back`/복사링크가 필터 view 복원' 이 걸릴 상태가 존재하지 않는다. **`?fail=` 개발 스위치는 URL 을 읽지만**(`store.ts:61`) **list state 가 아니다** | 필터·검색이 도입되면 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:18,484` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 **소비자**다. `AppShell.tsx:478` 이 경계의 자리를 밝힌다. 루트 경계도 별도로 있다(`App.tsx:368`). ⚠ **throw 시 입력한 평문 시크릿이 사라진다** — 안전 방향의 결과다(§4.3) | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로를 상속한다: ① **진입 가드** — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② **세션 중 401** — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=load:401` 로 `/login?returnUrl=%2Fsettings%2Foauth&reason=session_expired` 로 가는지 확인. (미저장 시크릿 유실은 EXC-19 P1 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 이 배치에서 해소됐다.** 기존 문서 배치가 '`useRouteWritePermissions` 소비자 **앱 전체 0건**'으로 gap 판정했으나 **이 화면은 그 소비자다.** ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더. 리소스는 라우트 파생(`route-resource.ts:32-35` → `findCoveringLeaf` → `page:/settings/oauth`) ② **write 게이팅(직접)** — `OAuthPage.tsx:78` `const { canUpdate } = useRouteWritePermissions()` → `:250` `canUpdate={canUpdate}` → `SettingsFormShell.tsx:166` `{canUpdate && (…저장 버튼…)}`. **버튼을 disabled 로 두지 않고 렌더 자체를 하지 않는다**(`:165`). 대신 info 배너로 **이유를 말한다**(`:149`). 필드도 전부 비활성(`:120` `disabled = saving \|\| loading \|\| !canUpdate` → `OAuthProviderCard` 의 스위치·입력 3종·'변경'·'취소') ③ **강등 reconcile** — `useRouteCan` 이 `usePermissions()` 를 구독하므로 권한 스토어가 바뀌면 재렌더돼 **버튼이 그냥 사라진다**(`RequirePermission.tsx:23-25` 가 설계로 선언). ⚠ **연결 테스트 버튼은 이 규칙 밖이다** — `disabled` 하드코딩이라 권한과 무관하게 항상 비활성(현재는 무해) | 권한 스토어에서 `page:/settings/oauth` 의 `update` 를 끄고 진입. **저장 버튼·상태 문구가 사라지고 '조회 권한만 있습니다…' info 배너가 뜨며 스위치·입력이 전부 비활성이면 pass.** `read` 를 끄면 403 화면. 화면을 연 채 update 를 끄면 버튼이 즉시 사라지는지(강등) | **pass** |
| EXC-04 | EXC | 직접 | **충족 — 이 섹션의 revision 토큰을 쓴다.** ① **409/412 conflict dialog** — `_shared/store.ts:124-126` 이 `input.expectedRevision !== current.revision` 이면 `SettingsConflictError(current)` 를 던지고, 화면이 `isSettingsConflict(cause)`(`:149`)로 일반 실패와 갈라 `ConflictDialog` 를 세운다(`:316-328`). **3-액션**(최신 불러오기 · 덮어쓰기 · 닫기) ② **입력 보존** — 다이얼로그가 뜬 동안 폼이 그대로 살아 있다(`ConflictDialog.tsx:11-13`). `setConflict` 만 하고 `reset` 을 하지 않는다(`:150-151`) — **입력한 평문 시크릿도 보존된다.** `closeConflict`(`:195-201`)가 `changingSecrets` 를 건드리지 않는 것도 일관된다 ③ **diverge 표시 — 이 화면은 방식이 다르다**: `divergedLabels` 를 쓰지 않고 **제공자 이름으로 직접 짚는다**(`:204-219`, 4필드 대조: `enabled`·`clientId`·`redirectUri`·`hasSecret`). 근거가 코드에 있다(`data-source.ts:75-77` '제공자 배열이라 필드 단위로 나열하면 `providers` 한 줄이 되어 아무것도 알려주지 못한다'). **`secret` 을 대조하지 않는 것이 옳다**(양쪽 모두 '새로 넣을 값') ④ **ghost saved 없음** — `createRevisionedStore` 는 `map` no-op 이 아니라 클로저 1건을 통째로 교체하므로(`store.ts:128-132`) 그 경로가 **구조적으로 없다**. ⚠ **`createStoreAdapter`(존재 여부 기반 · GROUND-TRUTH §4)와 다르다** — 여기는 **revision 토큰 비교**라 둘 다 존재해도 거절된다. 회귀 테스트 `store.test.ts:54-69` 가 못박는다. ⚠ **미세한 부정확**: `hasSecret: true → true` 인 시크릿 교체는 충돌 목록에 뜨지 않는다 — **데이터는 안전하다**(내 `secret: ''` 가 가면 서버가 기존을 유지 — BE-070 §7.3) **표시만 부정확하다**(§5 #10) | `/settings/oauth?fail=conflict` 에서 제공자를 켜고 저장 → 확인. **'OAuth 설정이 이미 변경되었습니다' 다이얼로그가 뜨고, 내 입력(평문 시크릿 포함)이 폼에 그대로 있고, 달라진 제공자가 이름으로 나열되면 pass.** `store.test.ts` 6건 통과로도 판정 | **pass** |
| EXC-08 | EXC | 직접 | **부분 미충족.** ① **`submitLockRef` + disable — 충족.** `useSubmitLock()`(`_shared/queries.ts:58-75`)이 `useRef` 동기 잠금을 제공하고 `runSave` 첫머리에서 `if (!lock.acquire()) return`(`:126`)으로 건다. 성공·실패 양쪽에서 `release`(`:136,147`). 버튼도 `disabled={!dirty \|\| saving \|\| loading}`(`SettingsFormShell.tsx:179`). `queries.ts:54-55` 가 왜 disabled 만으로 부족한지 밝힌다 ② **'retry 가 동일 Idempotency-Key' — 미충족.** 이 화면의 저장에 멱등키가 없다(`grep -rni "idempotency" pages/settings/oauth/` → **0건**). ⚠ **선례가 둘로 늘었는데도 쓰지 않는다** — `members/components/PointsCard.tsx` 와 **같은 섹션의 API Key 발급**(`api-keys/ApiKeysPage.tsx:96,122-123` → `queries.ts:30,37-38` → `data-source.ts:107-141`, 이번 기준에서 신설돼 NFR-069 EXC-08 을 pass 로 뒤집었다). **완화 요인(중요)**: PUT + `expectedRevision` 이라 응답 유실 후 재시도는 **중복 적용이 아니라 409** 가 된다 — 데이터는 안전하다(BE-070 §7.5). **남는 결함은 UX**: 사용자가 자기 저장이 이미 성공한 줄 모르고 재시도했다가 **거짓 충돌 다이얼로그**를 본다. ✔ **API Key 화면과 달리 평문을 잃지 않는다** — 저장 실패 시 `normalizeAfterSave` 가 돌지 않아 **입력한 시크릿이 폼에 남고 재시도가 실제로 가능하다**(BE-070 §7.5). 즉 **이 화면의 EXC-08 은 형제 단일 문서 폼과 같은 등급**이며 NFR-069(유령 키)보다 가볍다 | 저장 확인 다이얼로그의 확인 버튼을 최대한 빠르게 2회 클릭. **요청이 1건만 나가면 ①은 pass.** `grep -rn "Idempotency" pages/settings/` → **0건이면 ②는 gap** | **gap** |
| EXC-09 | EXC | 직접 | **충족.** 네 지점이 배선돼 있다. ① **onError** — `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:148`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 ② **onSuccess** — `if (controller.signal.aborted) return;`(`:137`)로 취소된 요청의 성공 콜백이 토스트·`normalizeAfterSave` 를 일으키지 않는다 — **중요하다**: aborted 인데 정규화가 돌면 **저장되지 않은 시크릿이 화면에서 지워진다**(사용자가 잃는다) ③ **mutation.reset** — `cancelSave`(`:175`) · `closeConflict`(`:198`)가 `save.reset()` 을 부른다 ④ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:108`). bulk 표면이 없어 '실패 count 제외' 절은 무관 | 저장 중(400ms 창) 확인 다이얼로그의 '취소' 클릭. **error toast 나 실패 배너가 뜨지 않고 입력한 시크릿이 폼에 남아 있어야 pass.** 저장 성공 토스트도 뜨지 않아야 한다 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · **A11Y-11** · **MOTION-02** · **MOTION-03** · IA-01 · IA-02 · EXC-03 · EXC-04 · EXC-09 |
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
| 15 | **A11Y-11** | **pass** | 30 | A11Y-12 | n-a |

> 30행 전수 · `pass` 13 + `종속` 9 + `n-a` 7 + `gap` 1 = **30** ✓

> **P0 gap 1건 — 이번 기준(`a5c2639`) 갱신으로 5건에서 줄었다.** 뒤집힌 4건:
> - **A11Y-11 `gap` → `pass`(PR #30)** — 이전 배치는 'Client Secret 의 `aria-required` 미주입'을 이 화면의 대표 결함으로 적었다. **해법이 그대로 채택됐다**: 호출부가 입력 분기의 `<input>` 에 직접 준다(`OAuthProviderCard.tsx:113,114,186`, 근거 `:103-112`). 컴포넌트 테스트 4건이 고정(`OAuthProviderCard.test.tsx:61-88`). **형제 3화면은 `FormField` 자동 주입으로 pass** 이고 이 화면만 호출부 부여다 — **결과는 같고 경로만 다르다.**
> - **MOTION-02 `gap` → `pass` · MOTION-03 `gap` → `pass`(PR #26)** — Toast exit 애니메이션(`Toast.css:32-37,121-131`)과 **`ToggleSwitch` reduced-motion 게이트**(`ToggleSwitch.css:79-84`)가 신설됐다. 이전 배치가 든 gap 사유('exit 없음' · '`ToggleSwitch.css` 에 `prefers-reduced-motion` 블록이 없다')가 **둘 다 코드로 해소됐다.**
> - **MOTION-01 `gap` → `종속`** — 오버레이 모션이 구현됐으나 **CSS-only** 다(라이브러리 미도입은 여전하다 — `packages/ui/src` Motion/AnimatePresence 0건). 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 를 `onAnimationEnd` 로 동등 달성했으므로 **라이브러리 부재를 gap 으로 볼지는 DS 소유 문서의 판정**이다. 이 화면은 그 판정을 따른다.
>
> **잔여 P0 gap 1건** — **EXC-08**: 멱등키 부재. **`If-Match` 가 데이터 안전을 이미 보장하고**, **API Key 화면과 달리 평문도 잃지 않아**(저장 실패 시 폼에 남는다) 잔여는 UX 다. ⚠ **형제 NFR-069 는 이번 기준에서 EXC-08 이 pass 로 뒤집혔다**(발급에 멱등키가 붙었다 — `api-keys/data-source.ts:107-141`). **같은 섹션에서 이 화면만 남았고, 선례가 둘로 늘었다**(`members/components/PointsCard.tsx` · `api-keys/ApiKeysPage.tsx:96,122-123,130,156`).
>
> **A11Y-11 은 여전히 화면마다 다시 매겨야 한다** — 같은 섹션, 같은 `FormField`, 같은 주입 메커니즘인데도 **자식 타입 하나로 경로가 갈린다.** 이 화면은 래퍼 `<span>` 때문에 자동 주입을 못 받아 **호출부가 손으로 채웠다** — 그 사실 자체가 '섹션 단위로 일반화하면 틀린다'는 근거로 남는다.
>
> **이 화면이 해소한 앱 전역 gap 2건 (기록)**: **EXC-03** — 기존 문서가 '소비자 앱 전체 0건'으로 gap 판정했으나 이 화면이 소비자다(`OAuthPage.tsx:78`). **EXC-04** — 기존 문서가 '유령 저장 · 토큰 없음'으로 gap 판정했으나 이 섹션은 revision 토큰을 쓴다(`store.ts:124-126`).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·검색·필터·페이지네이션·업로드·CSV)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 재조회 중 이전 폼 값이 유지된다 — `loading = isFetching && data === undefined`(`:118`)라 스켈레톤이 덮지 않는다. 단 `useEffect([data, reset])`(`:110-114`)가 **편집 중 재조회에서도 `reset` + `setChangingSecrets([])` 를 돌려** 입력을 덮는다. **이 화면은 잃는 것이 평문 시크릿이라 더 아프다**(다시 발급받아 와야 할 수도 있다 — FS-070 §7 #8) | 시크릿을 입력하는 중 devtools 로 invalidate → 입력이 유지되는지 | **gap** |
| STATE-05 | P1 | **표면 부재.** 단일 문서라 0건 상태가 없다. **제공자도 코드 상수 3종이라 0건이 될 수 없다**. ⚠ 초기값이 `providers: []` 라 도착 전에는 0개이나 **스켈레톤이 대체**해 빈 상태가 보이지 않는다 | — | **n-a** |
| STATE-06 | P1 | 저장 성공 시 `useSaveSettings.onSuccess` 가 `setQueryData(key, saved)` + `invalidateQueries`(`_shared/queries.ts:45-46`) — 자기 변경이 즉시 보이고 새 revision 이 곧바로 유효하다. ⚠ **화면은 응답의 `value` 가 아니라 `normalizeAfterSave(values)` 를 폼에 반영한다**(`:139-140`) — **서버가 값을 정규화(trim 등)하면 화면과 서버가 갈린다**(BE-070 §7.9 #3) | 저장 후 `AuditNote` 가 갱신되는지 | **pass(주의)** |
| COMP-01 | P1 | DS `<Button>`·`<ToggleSwitch>`·`<Card>`·`<CardTitle>`·`<Alert>`·`<Modal>`·`<FormField>` 를 쓴다. `buttonStyle()`/`tds-ui-btn-*` 손조립 **0건**(grep). 입력은 `FormField` + `<input className="tds-ui-input tds-ui-focusable">` 관례(`_shared/fields.tsx:3-5` 가 선례를 밝힌다) | `grep -n "buttonStyle(\|tds-ui-btn-" pages/settings/oauth` → 0건 | **pass** |
| COMP-04 | P1 | ⚠ **이 화면은 `_shared/fields.tsx` 의 `TextInputField` 를 쓰지 않고 직접 조립한다**(`OAuthProviderCard.tsx:143-153,177-190,212-224`). 이유가 있다 — 시크릿 필드가 3상태 분기와 '변경/취소' 버튼을 요구해 그 조각으로 표현되지 않는다. **그러나 그 대가가 남아 있다**: `fields.tsx:7-9` 가 계약으로 못박은 **A11Y-11 배선을 상속하지 못해 호출부가 손으로 채워야 했고**(`OAuthProviderCard.tsx:113,114,186` — §2 A11Y-11 은 그 덕에 pass 지만 '잊을 수 있는 자리'가 생긴 것 자체는 그대로다) **카운터 계약(`:34`)은 여전히 놓쳤다**(§3 COMP-12). Client ID·Redirect URI 는 `TextInputField` 로 표현 가능한데도 직접 조립했다 | 필드 블록이 공유 조각을 쓰는지 | **gap** |
| COMP-12 | P1 | **미충족.** `CLIENT_ID_MAX = 200` · `CLIENT_SECRET_MAX = 200` 인데 **`FormField counter` 를 주지 않는다.** `_shared/fields.tsx:34` 가 '길이 제한이 있는 필드는 반드시 준다 (COMP-12)'를 **계약으로 못박는데** 이 화면이 `TextInputField` 를 쓰지 않아 그 계약을 상속하지 못했다(§3 COMP-04 와 같은 뿌리). **형제 3화면은 카운터가 있다**(사이트 3개 · API Key 1개). `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다 | Client ID 에 200자 입력 → 카운터가 있는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패 = 인라인 Alert(`SettingsFormShell.tsx:128`) · write 성공 = toast(`:144`) · write 실패 = 카드/다이얼로그 배너(`:247,310`). write 실패가 toast 가 아닌 것은 **폼 맥락**(입력 보존 + 그 자리 재시도)이라 이탈로 보지 않는다. ✔ **표시 조건이 정확하다** — `saveError !== null && pending === null && conflict === null`(`:247`)이 세 조건을 전부 본다. **사이트 설정(`SiteSettingsPage.tsx:264`)은 `conflict === null` 을 빠뜨려 중복 표시된다 — 이 화면이 옳다** | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지. 충돌 다이얼로그가 떠 있을 때 배너가 뒤에 중복되지 않는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast) · 실패(배너) 양 경로가 배선돼 있다(`:135-155`). **no-op 클릭이 없다** — 저장 버튼은 `!dirty` 면 비활성이고 그 이유를 문구가 말한다. ✔ **연결 테스트가 이 요구의 모범 사례다** — 동작하지 않는 버튼을 **비활성 + 이유 문구**로 둔다(`OAuthProviderCard.tsx:8-9` '눌러서 아무 일도 없거나 **가짜 성공**을 보여주는 것보다, 왜 못 쓰는지 적어 두는 편이 정직하다 (FEEDBACK-03: no-op 금지)') | `?fail=save` 로 저장 → 가시 실패. 연결 테스트가 비활성 + 사유인지 | **pass** |
| FEEDBACK-05 | P1 | **이 섹션에서 가장 잘 지킨다(API Key 와 함께).** 저장 확인 문구가 **켜고 끄는 제공자를 이름으로 말한다** — `saveConfirmMessage`(`:48-74`): '카카오 로그인을 끕니다. **이 방식으로 가입한 사용자는 로그인할 수 없게 됩니다.**' `:45-46` 이 근거를 밝힌다: ''저장할까요?' 만 물으면 무엇이 바뀌는지 모르고 확인하게 된다'. **언어 화면은 고정 문구다**(NFR-068 §3 FEEDBACK-05 gap) — 같은 섹션에서 구체성이 갈렸고 **이 화면이 낫다** | 확인 문구가 어느 제공자를 켜고 끄는지 말하는지 | **pass** |
| A11Y-13 | P1 | **폼 진입 시 첫 필드 자동 포커스가 없고, 검증 실패 시 첫 오류 필드로 포커스가 이동하지 않는다** — `handleSubmit(onValid)`(`:261`)에 `onInvalid` 가 없어 `setFocus` 경로가 없다. **이 화면에서 특히 아프다**: 제공자 3 × 필드 3 = **최대 9개 오류가 한 번에 뜰 수 있는데** 어디를 고쳐야 하는지 포커스가 알려주지 않고, 화면이 세로로 길어 **오류가 스크롤 밖에 있을 수 있다.** (같은 섹션의 `CreateApiKeyModal` 은 `initialFocusRef` 로 첫 필드 포커스를 구현한다) | 제공자를 켜고 빈 채로 저장 → activeElement 가 첫 오류 필드인지 | **gap** |
| A11Y-15 | P1 | 충돌 다이얼로그의 액션 이름이 서로 구분된다('최신 내용 불러오기' / '내 변경으로 덮어쓰기'). 제공자 카드의 '변경'·'취소' 버튼은 **카드마다 반복되나** 각 카드가 `CardTitle`(제공자 이름)로 구분되는 영역이라 맥락이 있다. ⚠ **엄밀히는 접근 이름이 같다**('변경' ×3) — 스크린리더가 버튼 목록을 훑으면 구분되지 않는다. `aria-label={'<라벨> Client Secret 변경'}` 이 나을 수 있다 | 같은 접근 이름의 버튼이 여럿인지 | **gap(경미)** |
| A11Y-16 | P1 | ToggleSwitch 의 선택 상태가 **색이 아니라 `aria-checked`** 로 인코딩된다(`ToggleSwitch.css:35,59,72` 셀렉터가 근거). 시크릿 3상태도 **문구로 구분된다**(마스킹 `••••` + '변경' / 입력칸 + '취소'). ⚠ **연결 테스트 비활성 사유가 버튼과 연결되지 않는다** — `<p>연결 테스트는 백엔드 연동 후 제공됩니다.</p>`(`OAuthProviderCard.tsx:235`)가 형제 노드일 뿐 `aria-describedby` 가 없어 **시각 사용자만 이유를 안다.** 언어 화면의 잠금 사유(NFR-068 §5 #2)·API Key 의 스코프 오류(NFR-069 §5 #5)와 **같은 계열 — 섹션 전체에 반복되는 패턴** | 비활성 버튼의 사유가 AT 에 닿는지 | **gap** |
| ERP-01 | P1 | 제공자 id→라벨·콘솔힌트 매핑이 **단일 레지스트리**다 — `OAUTH_PROVIDER_META`(`validation.ts:25-37`) + `providerLabel`(`:39-41`). per-page helper 를 만들지 않았고 카드·확인 문구·충돌 목록이 같은 함수를 소비한다(`OAuthProviderCard.tsx:93` · `OAuthPage.tsx:60,61,70,218`). 못 찾으면 id 를 그대로 돌려준다(폴백 존재) | 모든 제공자가 정의된 라벨로 해석되는지 | **pass** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 시각이 `shared/format`(`formatDateTime`·`formatRelativeOrDate`)을 경유한다(`AuditNote.tsx:31-32` · `diff.ts:43-47`). **인라인 포맷 0건**. ✔ **nav 라벨('OAuth 설정')과 카드 제목이 일치한다** — 언어 화면은 갈린다(NFR-068 §5 #9) | 인라인 `toString()`/`toLocaleDateString` 이 0건인지 | **pass** |
| ERP-08 | P2 | 감사 시각이 `formatAuditAt`(`diff.ts:43-47`) → `formatDateTime`, 상대 시각이 `formatRelativeOrDate` 를 경유한다. 둘 다 `Number.isNaN` 가드가 있다. **이 화면에 숫자 표시가 없다**(카운터도 없다 — COMP-12 gap) | 셀의 raw numeric toString 이 없는지 | **pass** |
| ERP-13 | P1 | **이 화면의 사용자 대상 문자열에 리터럴 조사 폴백이 0건이다** — `grep -rn "을(를)\|이(가)\|은(는)\|(으)로" pages/settings/` 히트 2건은 **둘 다 `_shared/validation.ts:4-5` 의 주석**이고 렌더되지 않는다. **이 화면은 보간 문구가 많은데도 지킨다**: `'<라벨> Client ID를 입력하세요.'`(`validation.ts:99`)·`'<라벨> Client Secret을 입력하세요.'`(`:116`)·`'<이름들> 로그인을 끕니다.'`(`OAuthPage.tsx:67`) — **보간 값(Google·카카오·네이버) 뒤에 고정 명사('Client ID'·'Client Secret'·'로그인')를 두어** 보간 값이 조사와 접하지 않게 했다. ⚠ **`'Client ID를'`·`'Client Secret을'` 은 고정 리터럴이라 안전하다**(라벨이 작성 시점에 확정 — `_shared/validation.ts:8-9` 의 원칙과 같다). ⚠ `_shared/validation.ts:11-12` 가 '조사 헬퍼가 **아직 없다**'고 적으나 **GROUND-TRUTH §2 기준 `shared/format.ts:269+` 에 승격돼 있다** — 낡은 주석(§5 #8) | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 | **pass** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(grep) — 이 화면도 상한이 없다. abort 는 언마운트·확인 취소·충돌 닫기에서만 발생한다. ⚠ **연결 테스트(BE-070 EP-03)는 외부 왕복이라 10초 상한이 필요하다** — 연동 시 이 gap 이 더 커진다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **이 화면이 status 로 분기하지 않는다.** 조회 실패가 401/403/404/500 을 같은 문구로(`SettingsFormShell.tsx:130`), 저장 실패가 403/422/500 을 같은 배너로(`:154`) 뭉갠다. 근본 원인은 `createRevisionedStore` 가 **`HttpError`(status 보유)를 던지지 않는 것**. **409 만 유일하게 갈린다**(`isSettingsConflict`) | `?status=load:404` 와 `?status=load:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 없다 — `useCrudForm` 미사용. `EL-027`(`:265-284`)은 **로컬 zod 오류만** 전달한다. **이 화면에서 특히 아깝다**: 서버가 `providers.1.redirectUri` 처럼 **배열 인덱스를 포함한 정확한 경로**를 아는데(BE-070 §5) 화면이 배너 한 줄로 버린다 | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 **앱 전역 0건**(grep) — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면 부재에 가깝다.** 단일 문서라 '찾을 수 없음'이 정상 경로에 없다(BE-070 §5 404 축). 다만 **서버가 시딩하지 않아 404 를 내면** 화면에 그 분기가 없어 generic 배너로 뭉개진다(BE-070 §7.9 #5) | 없는 문서로 진입 → 전용 문구가 뜨는지 | **gap(잠재)** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(응답 후 `reset` + `setQueryData`)이다. `onMutate`/롤백 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | 이 화면에 `onMutate` 가 0건인지 | **pass** |
| EXC-19 | P1 | 401 감지·리다이렉트는 구현됐으나(`queryClient` + `RequireAuth`) **미저장 입력이 유실된다** — 프로그램적 이동이라 이탈 가드(FS-070-EL-022)가 발화하지 않는다. ⚠ **잃는 것이 평문 시크릿이라 재입력 부담이 크다**(제공자 콘솔에서 다시 복사해 와야 한다). **다만 시크릿이 사라지는 것 자체는 안전 방향**이다(§4.3) | 세션 만료 중 시크릿 입력 → 재로그인 후 복원되는지 | **gap(앱 전역)** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference`(`shared/errors/http-error.ts:68-75`)가 존재하는데 이 화면은 고정 문구(`:154`)만 쓴다. raw stack 노출은 없다(그 절은 충족) | 강제 500 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 조회 응답 p95 | ≤ 300ms (BE-070 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다**(`_shared/store.ts:109,115`). 실제 네트워크 0건 |
| 저장 응답 p95 | ≤ 500ms | 위와 동일. **서버가 시크릿을 암호화하므로**(BE-070 §7.2.3) 다른 설정 저장보다 느릴 수 있다 |
| **연결 테스트 p95** | **≤ 5s (상한 10s → 504)** | **미구현** — 버튼이 비활성이다(FS-070-EL-010). **외부 제공자 왕복이라 다른 엔드포인트(5초)보다 길다**(BE-070 §4 EP-03) |
| 첫 렌더 | ≤ 1.0s (LCP) | 미측정. **문서 1건 · 제공자 3종 고정**이라 데이터 규모에 비례하지 않는다 — 렌더 비용이 상수다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | 전역 `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시하고 **이 화면이 재정의하지 않는다**(`_shared/queries.ts:15-19`) — **충족** |
| 저장 요청 크기 | ≤ 4KB | **충족(사실상)** — 제공자 3 × (clientId ≤200 + secret ≤200 + redirectUri). ⚠ **`redirectUri` 에 길이 상한이 없어**(FS-070 §7 #11) **이론상 상한이 없다** |
| 메모리 | 문서 1건 + **입력 중 평문 시크릿(폼 수명)** | 상수. **평문은 저장 성공 시 폼에서 지워진다**(`normalizeAfterSave`) |
| 번들 | 이 화면 고유 코드 ≤ 15KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS·zod/mini) |
| 검증 비용 | 제출당 1회 + 토글/취소 시 1회 | zod `safeParse`. **꺼진 제공자는 검증하지 않아**(`validation.ts:89-90`) 비용이 켜진 개수에 비례한다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`SettingsFormShell.tsx:125-138`) — STATE-02 pass |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·**입력 보존(평문 시크릿 포함)**·재시도는 되나 **reference 없음**(EXC-20 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **aborted 면 `normalizeAfterSave` 가 안 돌아 시크릿이 지워지지 않는다** — 중요한 세부 |
| **동시 편집(두 관리자)** | 나중 저장이 앞선 변경을 덮지 않는다 | **충족** — revision 토큰 불일치 → 409 → 충돌 다이얼로그(3-액션) + **제공자 이름으로 짚기** + 입력 보존(EXC-04 pass). ⚠ **시크릿 교체(`hasSecret: true→true`)는 표시되지 않으나 데이터는 안전하다**(BE-070 §7.4) |
| 저장 응답 유실 후 재시도 | 중복 적용 없음 + 사용자가 성공을 안다 | **부분 충족** — `If-Match` 가 중복 적용을 막으나(데이터 안전) 사용자는 **거짓 충돌 다이얼로그**를 본다(EXC-08). ✔ **평문은 잃지 않는다**(폼에 남는다) |
| 세션 만료 중 편집 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 시크릿을 버린다(EXC-19). **안전 방향이나 재입력 부담** |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역). **연결 테스트 연동 시 더 커진다**(외부 왕복) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |
| 편집 중 재조회 | 입력이 유지된다 | **미충족** — `useEffect([data, reset])`(`:110-114`)가 **입력한 평문 시크릿과 `changingSecrets` 를 전부 덮는다**(STATE-03 gap) |
| **잘못된 Redirect URI 저장** | 서버가 막는다 | **미정 — 프론트만 막는다.** `redirectUriError` 는 브라우저에서만 돈다. **서버가 https·fragment·절대 URL 을 재검증해야 하고**, **우리 도메인 소속까지 확인해야 한다**(BE-070 §7.1 · §7.9 #1 — 가장 전형적인 redirect 탈취 경로) |

### 4.3 시크릿 안전성 — API Key 화면과 다른 계약

quality-bar 는 이 축을 다루지 않는다. **BE-070 §7.2 가 계약을 정하고, 여기서는 프론트 관측 가능한 상태를 판정한다.** **NFR-069 §4.3 과 대조해 읽어야 한다** — 같은 섹션이지만 계약이 다르다.

| 요구 | 현재 상태 |
|---|---|
| **저장된 시크릿이 폼에 채워지지 않는다** | **충족.** 폼의 `secret` 은 '저장된 시크릿이 아니라 **새로 넣을 값**'이다(`validation.ts:3-11`). 조회 응답에 시크릿이 실리지 않으므로(`data-source.ts:4,49`) **채울 값 자체가 없다.** `validation.ts:8-9` 가 근거를 밝힌다: '채우면 **DOM 에 평문이 살고, 그 순간 "마스킹" 은 눈속임이 된다**' |
| **모델이 `hasSecret` 불리언만 안다** | **충족.** 저장소가 평문을 갖지 않는다(`data-source.ts:3-5`) |
| **마스킹이 정보를 흘리지 않는다** | **충족 — API Key 보다 엄격하다.** `MASKED_SECRET_TEXT = '••••••••••••'` **고정 12자**, **last4 도 없다**(`_shared/secret.ts:36-37` '식별이 이름으로 충분하다'). API Key 는 `sk_test_••••0001`(§5 #9 — 표기가 갈린 것) |
| **저장이 평문을 화면에서 지운다** | **충족 — 이 화면의 핵심 계약.** `normalizeAfterSave`(`data-source.ts:65-73`)가 `secret: ''` + `hasSecret` 갱신 → `reset(normalized)`(`:140`)가 **새 기준선**으로 삼는다. `:60-63` 이 이유를 밝힌다: '이걸 하지 않으면 저장한 뒤에도 입력칸에 평문이 남아 있고, 그 상태가 곧 새 기준선이 되어 **DOM 에 평문이 계속 산다**'. **테스트 3건이 고정**(`oauth.test.ts:112-137`) |
| **저장 실패 시 평문이 남는다** | **충족(의도).** `normalizeAfterSave` 가 `onSuccess` 에만 있다 — **재시도가 가능하다.** ✔ **API Key 발급과 결정적으로 다른 점**: 그쪽은 응답 유실 시 평문을 영영 잃지만(NFR-069 EXC-08) **여기는 폼에 남아 있다** |
| **abort 시 평문이 지워지지 않는다** | **충족.** `onSuccess` 가 `if (controller.signal.aborted) return;`(`:137`)로 먼저 빠져나가 `normalizeAfterSave` 가 돌지 않는다 |
| 입력이 **`type="password"`** 다 | **충족**(`OAuthProviderCard.tsx:179`) — 어깨너머 노출을 막는다 |
| **`autoComplete="new-password"`** | **충족**(`:184`) — 브라우저가 기존 비밀번호를 채우지 않게 한다 |
| **평문이 URL 에 없다** | **충족.** 이 화면에 URL state 가 없다(§2 IA-13) — **넣으면 히스토리·리퍼러·서버 로그에 남는다.** 넣지 않는 것이 옳다 |
| **평문이 캐시에 없다** | **충족(사실상).** `setQueryData(key, saved)`(`_shared/queries.ts:45`)가 저장 **응답**을 캐시에 심는데, **응답에 `secret` 이 없다**(BE-070 §7.2.2 #1). ⚠ **현재 픽스처는 `save` 가 요청 `value` 를 그대로 돌려주므로**(`_shared/store.ts:128-132`) **평문이 캐시에 들어간다** — **픽스처 한정 결함**이며 서버가 붙으면 사라진다. 그래도 **연동 전까지 devtools 로 평문이 보인다**(§5 #12) |
| **평문이 폼 상태에 있다(입력 중)** | **인정된 트레이드오프.** 사용자가 치는 값이라 불가피하다. **저장이 지우고**(위) **이탈 가드가 경고한다**(FS-070-EL-022). **API Key 화면과 다른 점** — 그쪽은 폼에 평문이 아예 없다(NFR-069 §4.3) |
| **평문이 PUT 요청 바디에 있다** | **불가피.** 서버에 전달해야 하는 값이다. **BE-070 §7.2.2 #3 이 요청 로깅 금지·`no-store` 를 계약으로 정한다** |
| **서버가 평문을 보관한다** | **불가피 — API Key 와 결정적으로 다르다.** OAuth client secret 은 **제공자에게 원문 그대로 제시해야** 토큰 교환이 된다 — **해시로 대체할 수 없다.** BE-070 §7.2.3 이 이 사실을 정직히 기록하고 대가를 줄이는 요구 4건(봉투 암호화 · 복호화 지점 최소화 · 복호화 감사 · EP-01 미복호화)을 댄다. **NFR-069 의 '서버도 평문을 모른다' 를 이 화면에 적용하면 로그인이 깨진다** |
| **`hasSecret` 을 클라이언트가 보낸다** | **미충족(계약 위험).** 폼 타입이 `hasSecret` 을 왕복시킨다(`validation.ts:83`). **서버가 무시해야 한다** — 신뢰하면 **시크릿 없이 제공자를 켤 수 있다**(BE-070 §7.2.2 #2). 어댑터가 요청에서 빼는 것이 더 낫다(BE-070 §6.1 #7) |
| 편집 중 **재조회가 평문을 지운다** | **미충족(결함).** `useEffect([data, reset])`(`:110-114`)가 입력 중인 시크릿을 덮는다(STATE-03 gap) — **다시 발급받아 와야 할 수도 있다** |

### 4.4 정직성 — 동작하지 않는 기능의 취급

| 요구 | 현재 상태 |
|---|---|
| **가짜 성공을 만들지 않는다** | **충족 — 모범 사례.** 연결 테스트가 **비활성 + 이유 문구**다(FS-070-EL-010·010.1). `OAuthProviderCard.tsx:8-9` 가 근거를 밝힌다: '눌러서 아무 일도 없거나 **가짜 성공**을 보여주는 것보다, 왜 못 쓰는지 적어 두는 편이 정직하다 (FEEDBACK-03: no-op 금지)'. **왜 프론트가 못 하는지까지 심에 적었다**(`:230` '시크릿은 서버에만 있고 CORS 도 막힌다') |
| **픽스처가 거짓말하지 않는다** | **충족.** 세 제공자 모두 꺼져 있고 자격증명이 없다(`data-source.ts:19-46`). `:15-17` 이 이유를 밝힌다: '**켜져 있는 척하면 "왜 로그인이 안 되지" 로 돌아온다** — 백엔드가 없으니 실제로 동작하지 않는다' |
| **미구현 사유가 화면에 있다** | **부분 충족.** 연결 테스트는 사유가 있다(EL-010.1). ⚠ **그 사유가 버튼과 프로그램적으로 연결되지 않는다**(§3 A11Y-16 — 시각 사용자만 안다) |
| 연동 계획이 **코드에 있다** | **충족.** `:231` 이 적는다: '백엔드가 붙으면 이 버튼이 활성화되고 **결과는 인라인 배너로 표시한다**' — 연동 시 무엇을 만들어야 하는지가 명시돼 있다(§5 #3) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | MOTION-01 | P0 → **종속** | **~~Motion 라이브러리 미도입으로 Modal 에 fade/scale/exit 이 없다~~ — 이 사유는 PR #26 으로 해소됐다.** 오버레이 모션이 구현됐다(`Modal.css:20-21,30-38,58-59` + keyframes `:126-168` · reduced-motion 게이트 `:173-180`). **라이브러리는 여전히 미도입**(`packages/ui/src` Motion/AnimatePresence 0건)이나 'exit 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성했다. **잔여**: footer 버튼 경로는 여전히 즉시 언마운트(`Modal.tsx:27-31`)이고 **이 화면의 다이얼로그 3종은 footer 가 주 닫기 수단**이다. **라이브러리 부재/footer 경로를 gap 으로 볼지는 DS 소유 문서가 정한다** — 이 화면이 애니메이션을 선언하지 않으므로 앱 코드로 해소 불가 | **`packages/ui`(DS)** | **프론트 리팩터 / DS (판정 대기)** |
| 2 | ~~**A11Y-11**~~ | ~~P0~~ → **해소** | **PR #30 에서 해소됐다 — 이 항목은 기록으로만 남긴다.** 이전 배치가 적은 해법('입력 분기의 `<input>` 에 `aria-required` 를 직접 준다')이 **그대로 채택됐다**: `secretRequired`(`OAuthProviderCard.tsx:113`) · `secretRequiredProps`(`:114`) → 진짜 `<input type="password">` 에 spread(`:186`), false 면 속성 생략. 근거 주석 `:103-112` 가 '래퍼에 얹으면 거짓 시맨틱이라 FormField 가 의도적으로 거부하므로 **호출부가 진짜 컨트롤에 준다**'를 못박았다. 컴포넌트 테스트 4건 신설(`OAuthProviderCard.test.tsx:61-88`) — **이전 배치가 지적한 '`OAuthProviderCard` 를 렌더하는 테스트 0건' 도 함께 해소됐다.** **잔여는 §5 #6 의 부수 결함(마스킹 분기 `<label for>` 고아)뿐이며 required 축과 무관하다** | 이 화면 | **해소 — 재작업 없음** |
| 3 | EXC-08 | P0 | 저장에 **멱등키 없음**(`grep -rni "idempotency" pages/settings/oauth/` = 0건 — ⚠ **같은 섹션의 API Key 발급은 이번 기준에서 붙였다**: `api-keys/data-source.ts:107-141`). 동기 잠금은 있어 연타는 막힌다. **`If-Match` 가 중복 적용을 막아 데이터는 안전**하고, **API Key 와 달리 평문도 잃지 않는다**(저장 실패 시 폼에 남는다 — §4.3) — 잔여는 '거짓 충돌 다이얼로그' UX. **아울러 연결 테스트(BE-070 EP-03) 어댑터가 없다** — 연동 시 **어댑터 신설 + 화면 배선**(로딩·`{ ok, message }` 배너·재시도)이 **신규 요구사항으로 발생**한다(`OAuthProviderCard.tsx:217` 이 계획을 적어 뒀다). **어댑터만 바꾸면 되는 작업으로 산정하면 반드시 빠진다** | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-070 §7.5 · §7.8) |
| 4 | STATE-03 | P1 | `useEffect([data, reset])`(`:110-114`)가 **편집 중 재조회에서도 `reset` + `setChangingSecrets([])`** 를 돌려 입력을 덮는다. **이 화면은 잃는 것이 평문 시크릿이라 더 아프다**(제공자 콘솔에서 다시 복사해 와야 한다). 설정 4화면 공통 패턴 | 이 화면(섹션 공통) | UI 기획 쪽 변경 요청 |
| 5 | **COMP-04 · COMP-12** | P1 | **`_shared/fields.tsx` 의 `TextInputField` 를 쓰지 않고 직접 조립했다** — 시크릿 3상태 때문에 불가피하나 **그 대가로 두 계약을 상속하지 못했다**: ① **A11Y-11 배선**(`fields.tsx:7-9` 가 '호출부가 이 배선을 잊을 수 있는 자리를 없앤다'고 못박은 바로 그것) — **PR #30 이 호출부에서 손으로 채워 판정은 pass 로 뒤집혔으나**(`OAuthProviderCard.tsx:113,114,186`) **'잊을 수 있는 자리'는 남았다**: 필드가 하나 늘 때마다 같은 배선을 다시 손으로 해야 하고, 그것을 지키는 것은 컴포넌트 계약이 아니라 테스트 4건(`OAuthProviderCard.test.tsx:61-88`)뿐이다 ② **카운터**(`:34` '길이 제한이 있는 필드는 반드시 준다 (COMP-12)') — `maxLength=200` 인데 카운터가 없다. **Client ID·Redirect URI 는 `TextInputField` 로 표현 가능한데도 직접 조립했다** | 이 화면 | UI 기획 쪽 변경 요청 |
| 6 | A11Y-13 · A11Y-16 · A11Y-15 | P1 | ① **`onInvalid` 가 없어** 검증 실패 시 첫 오류로 포커스가 안 간다 — **최대 9개 오류가 한 번에 뜨고 화면이 세로로 길어** 오류가 스크롤 밖에 있을 수 있다 ② **연결 테스트 비활성 사유가 버튼과 연결되지 않는다**(`OAuthProviderCard.tsx:235` 이 형제 `<p>` 일 뿐) — **섹션 전체에 반복되는 패턴**(NFR-068 #2 잠금 사유 · NFR-069 #5 스코프 오류) ③ **'변경' 버튼 3개의 접근 이름이 같다** ④ **마스킹 분기의 `<label for>` 이 고아다** — `showMasked`(`:97`) 면 자식이 `<span>` 뿐이라(`:168`) `<label for="oauth-<p>-secret">` 이 존재하지 않는 id 를 가리킨다(라벨 클릭이 아무 데도 포커스하지 않는다). **A11Y-11(required) 과는 무관하다** — required 일 때는 이 분기가 렌더되지 않는다(`:110` 이 논증). PR #30 이 required 축만 고쳤고 이 축은 남았다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 7 | EXC-07 · EXC-20 · EXC-06 | P1 | 422 `error.fields` → RHF `setError` 매핑 없음(**서버가 `providers.1.redirectUri` 처럼 배열 인덱스까지 아는데 화면이 배너 한 줄로 버린다**) · 5xx reference code 미표시 · status 별 surface 미분기(`createRevisionedStore` 가 `HttpError` 를 던지지 않는다 — **설정 4화면 공통**) | 이 화면 + `_shared/store.ts` | UI 기획 · 백엔드 명세 |
| 8 | ERP-13 (주석) | — | `_shared/validation.ts:11-12` 가 '조사 헬퍼가 **아직 없다**'고 적으나 **GROUND-TRUTH §2 기준 `shared/format.ts:269+` 에 승격돼 있다** — 낡은 주석. 판정 자체는 pass | 이 화면(주석) | UI 기획 쪽 변경 요청(경미) |
| 9 | (FS-070 §7 #9) | — | **마스킹 표기가 API Key 화면과 다르다** — 이 화면 `••••••••••••`(last4 없음), API Key `sk_test_••••0001`. **둘 다 근거가 있어 결함은 아니나** 한 섹션에 두 표기가 있다 | 이 화면 | 아키텍처 (도메인 경계) |
| 10 | (BE-070 §7.4) | — | **충돌 표시가 시크릿 교체를 감지하지 못한다** — `hasSecret: true → true` 인 교체는 목록에 뜨지 않는다. **데이터는 안전하다**(내 `secret: ''` 가 가면 서버가 기존=상대의 새 값 유지 — BE-070 §7.3) **표시만 부정확하다.** 아울러 **내게 없는 제공자를 건너뛴다**(`:210`) — 제공자가 상수라 현재 미발현 | 이 화면 | UI 기획 쪽 변경 요청 |
| 11 | **(BE-070 §7.1 · §7.9 #1)** | — | **⚠ `redirectUri` 가 우리 도메인에 속하는지 아무도 확인하지 않는다** — 프론트는 https 만 보므로 `https://evil.example.com/cb` 가 통과한다. **가장 전형적인 OAuth redirect 탈취 경로**다. **프론트는 이 검사를 할 수 없다**(사이트 설정의 `baseUrl` 을 모른다) — **서버가 두 문서를 다 안다** | BE 계약 | **백엔드 명세 (최우선 · 보안)** |
| 12 | **(§4.3)** | — | **픽스처가 평문을 캐시에 넣는다** — `_shared/store.ts:128-132` 의 `save` 가 요청 `value` 를 그대로 돌려주고 `setQueryData`(`queries.ts:45`)가 그것을 캐시에 심는다. **서버 응답에는 `secret` 이 없으므로**(BE-070 §7.2.2 #1) **연동 시 사라지는 픽스처 한정 결함**이나, **연동 전까지 devtools 로 평문이 보인다.** 아울러 **`hasSecret` 을 클라이언트가 보낸다** — 서버가 무시해야 하고(BE-070 §7.2.2 #2) 어댑터가 요청에서 빼는 것이 낫다 | 이 화면(픽스처) + BE 계약 | UI 기획 · 백엔드 명세 |
| 13 | **(BE-070 §7.2.3)** | — | **client secret 저장 시 암호화** — **이 화면은 API Key 와 달리 해시로 대체할 수 없다**(제공자에게 원문 제시). 봉투 암호화 + 복호화 지점 최소화(토큰 교환·EP-03 뿐) + **복호화 감사** + **EP-01 미복호화**. **PUT 요청 바디·EP-01 응답 로깅 금지** · **`Cache-Control: no-store`**. ⚠ **NFR-069 의 '서버도 평문을 모른다' 를 이 화면에 적용하면 로그인이 깨진다 — 연동 담당자가 혼동하지 않게 문서가 구분한다** | BE 계약 | **백엔드 명세 (최우선 · 보안)** |
| 14 | (BE-070 §7.4 = BE-067 §7.3) | — | **감사 주체 위조 가능** — `updatedBy` 하드코딩 `'김운영'`(`_shared/store.ts:84`), `updatedAt` 클라이언트 시각(`:131`). **심이 이미 선언**(`store.ts:83`). **4화면 공통** | BE 계약 | **백엔드 명세 (최우선)** |
| 15 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 미저장 시크릿을 버린다. ⚠ **연결 테스트 연동 시 EXC-05 가 더 커진다**(외부 왕복 10초 상한 필요) | **앱 전역** | 프론트 구현 · UI 기획 |
| 16 | (BE-070 §7.9 #5 · #6 · #7) | — | **미설정 상태의 계약 미정**(시딩 안 하면 404 → 화면에 분기 없음) · **`redirectUri` 길이 상한 없음**(`clientId`·`secret` 은 200자) · **URL 검증 방식이 섹션 안에서 갈렸다**(이 화면 = **파서** · 사이트 설정 = 정규식 — **파서가 옳다**. `redirectUriError` 를 `_shared` 로 승격해 양쪽이 쓰는 것이 옳다) | BE 계약 + 이 화면 | 백엔드 명세 · UI 기획 |
| 17 | (FS-070 §7 #6 · #10 · #20) | P2 | **'변경' 버튼이 dirty 를 만들지 않는다**(`changingSecrets` 가 폼 밖 state — 입력칸이 열렸는데 저장 버튼이 비활성이고 '변경 사항이 없습니다.'라 말한다) · **카드 안에 카드**(shadow 누적 — 다른 3화면은 단층) · **제공자가 코드 상수 3종이라 화면에서 추가 불가**(의도된 부재이나 근거가 코드에 없다 — BE-070 §7.7 이 문서로 남긴다) | 이 화면 | UI 기획 · 아키텍처 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다**(기준일 2026-07-17 · `HEAD = a5c2639`). 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`oauthSettingsStore` 는 `createRevisionedStore('oauth', …)`(`data-source.ts:53`)로 만들어지므로 scope = **`oauth`** 이고, `failIfRequested(scope, op)` 를 두 곳에서 부른다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `load` | `fetch` (`_shared/store.ts:110`) | `?fail=load` · `?fail=oauth:load` · `?fail=all` |
| `save` | `save` (`_shared/store.ts:116`) | `?fail=save` · `?fail=oauth:save` · `?fail=all` |

**충돌 재현 스위치(이 섹션 고유 — `dev.ts` 에 없다)**

`conflictRequested(scope)`(`_shared/store.ts:60-65`)가 `?fail=` 파라미터를 **직접** 읽어 `conflict` / `oauth:conflict` 를 찾는다. 걸리면 저장 직전에 revision 을 바꿔(`:120`) 토큰을 어긋나게 만든다 — **다른 관리자가 먼저 저장한 상황을 재현**한다. `data-source.ts:9` 가 이 화면의 세 스위치를 나열한다.

| 재현 | 결과 |
|---|---|
| `/settings/oauth?fail=conflict` | 저장이 409 → **충돌 다이얼로그**(EXC-04 판정) |
| `/settings/oauth?fail=oauth:conflict` | 이 화면에서만 |

- **연결 테스트에는 스위치가 없다** — **어댑터가 없기 때문**이다(버튼이 `disabled` 하드코딩 — FS-070-EL-010). 재현할 코드 경로가 존재하지 않는다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. **STATE-01 재현은 `staleTime` 30초 경과 후 재진입 또는 devtools invalidate 로 한다.**
- **`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`)는 `failIfRequested` 를 거치는 op 에 걸리므로 `?status=load:404` · `?status=save:422` 등이 적용된다. 다만 **이 화면이 status 로 분기하지 않아**(EXC-06 gap) 결과 화면이 같다 — 그것이 곧 gap 의 재현이다.

| 판정 | 재현 |
|---|---|
| STATE-01 (재조회가 폼을 덮지 않는다) | 값 확인 → 30초 후 재진입. **스켈레톤이 뜨면 gap** |
| STATE-02 (조회 실패) | `?fail=load` — danger Alert + '다시 시도' 없으면 gap |
| EXC-04 (409 충돌) | `?fail=conflict` — **충돌 다이얼로그 + 입력(시크릿 포함) 보존 + 달라진 제공자 이름이면 pass** |
| EXC-03 (write 게이팅) | 권한 스토어에서 `page:/settings/oauth` 의 `update` off — **저장 버튼이 사라지면 pass** |
| EXC-08 (연타) | 확인 버튼 2연타 — 요청 1건이면 ① pass. `grep -rni "idempotency" pages/settings/oauth/` = 0건이면 ② gap |
| EXC-09 (abort) | 저장 중 '취소' — 실패 배너·토스트가 없고 **입력한 시크릿이 폼에 남아 있으면 pass** |
| **A11Y-11 (해소됨)** | 제공자를 켜고(`enabled: true`, `hasSecret: false`) 렌더 → **`document.getElementById('oauth-google-secret')?.getAttribute('aria-required') === 'true'` 이면 pass.** 대조군 셋이 전부 고정돼 있다(`OAuthProviderCard.test.tsx:69,74,82`): 꺼짐·이미 저장됨 → **속성 자체가 없어야 하고**, 래퍼 `<span>` 에는 **붙지 않아야 한다.** Client ID·Redirect URI 는 `FormField` 런타임 주입이라 **여전히 RTL 로만 판정된다** |
| MOTION-03 (reduced-motion) | OS reduced-motion + 제공자 스위치 토글 — **손잡이가 즉시 점프하면 pass**(`ToggleSwitch.css:79-84`) |
| EXC-06 (status별 surface) | `?status=save:422` · `save:500` — 전부 같은 배너면 gap |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · A11Y-12 · IA-02 · ERP-13 · EXC-08 판정) · **RTL** — **`OAuthProviderCard.test.tsx`(PR #30 신설, A11Y-11 4건 `:61-88`)** 가 이 화면 최초의 컴포넌트 렌더 테스트다 · **`oauth.test.ts`**(15건):
- **`redirectUriError` 6건**(`:27-52`) — https 통과 · **http 운영 차단**('인가 코드가 평문으로 흐른다') · localhost/127.0.0.1 http 허용 · 상대 경로 차단 · **fragment 차단** · 빈 값 차단.
- **`oauthSettingsSchema` 5건**(`:54-110`) — **꺼진 제공자는 검증 안 함** · 켜면 Client ID 요구 · **켜는데 시크릿이 아예 없으면 차단** · **저장된 시크릿이 있으면 비워도 통과** · 켜면 Redirect URI 규칙 강제.
- **`normalizeAfterSave` 3건**(`:112-137`) — **평문을 비우고 `hasSecret: true`**('평문이 폼 상태에 남지 않는다 — 남으면 그것이 새 기준선이 되어 DOM 에 계속 산다') · 미변경 시 유지 · 미저장 시 false.
- `_shared/store.test.ts`(**낙관적 동시성 회귀 6건 — EXC-04 의 근거 · 4화면 공유**) · `_shared/secret.test.ts`(**`MASKED_SECRET_TEXT` 가 자릿수를 암시하지 않는 고정 글리프임을 고정** — `:58-62`).

**테스트가 지키지 않는 것**: 시크릿 3상태 UI 전체(EL-008.1 — `OAuthProviderCard.test.tsx` 는 **required 축만** 본다) · '변경'/'취소' 동작 · 권한 게이팅(EXC-03) · 충돌 표시 조립(EL-021.1). **`oauth.test.ts` 는 순수 함수만 본다.** ✔ **A11Y-11 은 이번 기준에서 테스트가 생겼다**(위).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — 잔여 gap 은 **EXC-08 1건**이며 `grep -rni "idempotency" pages/settings/oauth/` = 0건이 결정적 재현이다
- [x] 모든 `N/A` 에 사유를 댔다 (STATE-04·IA-04 목록 부재 · COMP-10 검색 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재 · IA-13 list state 부재 — **평문이 URL 에 남으면 안 된다는 근거 추가**)
- [x] **§2.1 산수 검산 — 13 pass + 9 종속 + 7 n-a + 1 gap = 30 ✓** (요약표 + 30행 전수 나열 2중 검산)
- [x] **A11Y-11 의 '전수' 가 진짜 전수임을 확인했다** — `grep -rn "required" apps/admin/src/pages/settings/` 히트를 전건 분류한 결과 **설정 4화면의 모든 `required` 는 `FormField` prop 이거나 zod 헬퍼 이름이며, `FormField` 를 거치지 않는 required 표면이 0건**이다. `ImageUploadField`·`ImageGalleryField`·`SegmentPicker`·`TextField`(전부 `required` 를 AT 에 잇지 않는 컴포넌트)의 소비가 **이 섹션에 0건**이다(유일한 grep 히트 `_shared/fields.tsx:4` 는 'TextField 를 쓰지 않는 이유'를 적은 주석이다). **즉 이 화면의 A11Y-11 gap 은 `FormField` 주입 경로 하나에서만 발생하며**(Client Secret 의 `<span>` 래퍼), 그 밖의 경로로 새는 required 표면은 없다
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다 — MOTION-03 의 `ToggleSwitch` 3개를 명시했다
- [x] **판정 기준을 `a5c2639` 로 갱신하고 뒤집힌 4건(A11Y-11 · MOTION-01 · MOTION-02 · MOTION-03)을 §1 에 요약했다.** 뒤집힘의 근거를 전부 실제 파일:라인으로 재확인했고, **낡은 인용 라인도 함께 고쳤다** — `OAuthProviderCard.tsx` 가 PR #30 에서 +13줄 이동해 이전 배치의 `:113-117`·`:123-141`·`:143`·`:155`·`:163`·`:164`·`:166`·`:171`·`:191-211`·`:198`·`:137,173,205`·`:216`·`:217`·`:221` 인용이 전부 어긋나 있었다
- [x] **`상속` + `gap` 조합의 근거를 §1.1 에 규약으로 명시**했다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — STATE-05 는 표면 부재로 n-a 처리했다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`oauth`)와 op 2종을 **`createRevisionedStore` 호출부에서 확인**했고, **이 섹션 고유의 `?fail=conflict` 스위치**(`store.ts:60-65`)를 기록했으며, **연결 테스트에 스위치가 없는 이유(어댑터 부재)** 를 명시했고, **`?delay=` 를 쓰지 않았다**
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다. **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] §5 의 gap 이 FS-070 §7 · BE-070 §7.9 와 일치한다
- [x] **A11Y-11 해소를 코드로 재확인해 기록했다** — 이전 배치가 gap 으로 적고 해법까지 댔던 항목이 **그 해법 그대로 구현됐다**: `secretRequired`(`OAuthProviderCard.tsx:113`) · `secretRequiredProps`(`:114`) → 진짜 `<input type="password">`(`:177`)에 spread(`:186`), `false` 면 속성 생략. 근거 주석 `:103-112` 와 컴포넌트 테스트 4건(`OAuthProviderCard.test.tsx:61-88`)을 인용했다. **`FormField` 의 래퍼 거부는 그대로다**(자식이 여전히 `<span>` — `:168`·`:176`) — **주입 경로가 아니라 호출부 부여로 충족한 것**이며 형제 3화면과 경로가 다름을 §2 · §2.1 에 명시했다. **required 축과 무관한 부수 결함**(마스킹 분기의 `<label for>` 고아)은 §5 #6 에 분리해 남겼다
- [x] **§4.3 시크릿 안전성을 quality-bar 밖 축으로 신설**하고 **NFR-069 와 대조**했다 — **서버가 원문을 보관해야 하는 이유(제공자에게 원문 제시)를 정직히 기록**하고 'NFR-069 의 해시만 저장을 여기 적용하면 로그인이 깨진다'를 경고했다. **픽스처가 평문을 캐시에 넣는 결함**(§5 #12)도 숨기지 않았다
- [x] **EXC-08 이 NFR-069 보다 가벼운 이유**(PUT+`If-Match` + 저장 실패 시 평문이 폼에 남아 재시도 가능)를 §2 · §4.2 · §4.3 에 일관되게 기록했다
- [x] **EXC-03 · EXC-04 가 이 화면에서 pass 이며 그것이 기존 배치의 앱 전역 gap 판정을 뒤집는다는 사실**을 §2.1 하단에 기록했다
</content>
