---
id: NFR-018
title: "오시는 길 비기능 명세"
functionalSpec: FS-018
backendSpec: BE-018
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-018. 오시는 길 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-018 오시는 길 (`/company/directions`) — 단일 문서 편집 폼 1개 |
| 상위 기준 정본 | `specs/quality-bar.md` (9차원 100요구 · P0 30건). **이 문서는 그 요구 문구를 재서술하지 않는다** — ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 각 요구가 이 화면에서 ① 어떻게 충족되는가(코드 근거) ② 무엇을 재현하면 판정되는가(측정 기준) ③ 판정은 무엇인가 만 기록한다 |
| 함께 읽는 문서 | FS-018(요소·예외) · BE-018(엔드포인트·보안 판정) · `specs/quality-bar.md`(요구 원문) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 돌린다. 화면 코드가 바뀌면 §2 의 코드 근거(파일:라인)를 갱신한다. **gap 이 해소되면 §5 에서 지우고 §2 를 pass 로 바꾼다** |
| 판정 시점 | **2026-07-17 · HEAD `a5c2639`** 기준 코드 대조. 직전 판정은 `4b805ad` 기준이었고, 이후 PR #22·#24·#26·#28·#30·#32·#34 가 머지됐다. **이번 기준 갱신으로 뒤집힌 판정은 없다.** **A11Y-11 은 gap 유지** — PR #30 이 DS 의 A11Y-11 층을 손봤으나 그것이 닫은 것은 `ImageUploadField`/`SegmentPicker`/`OAuthProviderCard` 의 **required 노출**이고, **이 화면에는 그 세 표면이 하나도 없다**(`ImageUploadField`·`SegmentPicker` import 0건). 이 화면의 잔여 사유는 **hint 미연결 4필드**라는 별개 축이라 무관하다 — §2 각 행의 근거 라인 참조 |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **어느 공용 훅을 소비할지 고르는 것도 이 화면의 결정이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 스켈레톤 조건이 `data === undefined` 로 좁혀져 있다 — `DirectionsPage.tsx:94` `const loading = isFetching && data === undefined`. 이 값이 `DocumentFormShell.tsx:127` 의 `loading ? 스켈레톤 : children` 한 자리에만 흐른다. 조회 실패는 별도 분기(`:102-115`)라 스켈레톤·실패가 겹치지 않는다. 빈 상태는 성립하지 않는다(싱글턴 — BE-018 §7.1) | `/company/directions` 진입 → 400ms 동안 막대 4개만(입력 없음). 저장 성공 후 무효화 재조회(`document.ts:60-62`) 중 **입력값이 스켈레톤으로 바뀌지 않는다**. `?fail=directions:load` → 배너만(스켈레톤 없음) | pass |
| STATE-02 | STATE | 직접 | 조회 실패가 폼 전체를 대체하는 **인라인 danger Alert + '다시 시도'** 다 — `DocumentFormShell.tsx:102-115`(`<Alert tone="danger">` + `onRetry`). 토스트로 떨어지는 경로가 없다(`DirectionsPage` 의 `toast` 호출은 `:110` 저장 **성공** 1건뿐) | `?fail=directions:load` → 위험 톤 배너 '내용을 불러오지 못했습니다.' + '다시 시도'. 에러 토스트 0건. '다시 시도' 클릭 → `refetch()`(`DirectionsPage.tsx:128`) 재발행 | pass |
| STATE-04 | STATE | N/A | 표면 없음 — **이 화면에 목록·페이지네이션·행 선택이 없다.** 단일 문서 폼이며(FS-018 §1) `page`/`total`/`selectedIds` 개념이 코드에 존재하지 않는다 | — | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전부가 `var(--tds-*)` 만 참조한다 — `DirectionsPage.tsx:20-58`(`rowStyle`·`textareaStyle`·`mapPlaceholderStyle`·`coordTextStyle`). hex 0건 · px 리터럴 0건 · border 키워드(thin/medium/thick) 0건. 테두리 두께는 `var(--tds-border-width-thin)`(`:46`), 파생 치수는 `calc(var(--tds-space-6) * n)`(`:22,40`) | `apps/admin/src/pages/company/directions/**` grep: `#[0-9a-f]{3,6}` = 0 · `[1-9]px` = 0 · `(outline\|border):\s*(thin\|medium\|thick)` = 0. ESLint `no-restricted-syntax` 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 표면: 입력 5종(`className="tds-ui-input tds-ui-focusable"` — `DirectionsPage.tsx:137,157,182,203,233`) · 저장 버튼(DS `Button`) · '다시 시도' 버튼. focus ring 은 전부 `tds-ui-focusable` / DS 컴포넌트가 소유하며 이 화면은 두께·색을 선언하지 않는다 | DS/`ui.css` 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 표면: 저장 성공 토스트(`DirectionsPage.tsx:110`) · 이탈 가드 ConfirmDialog(`DocumentFormShell.tsx:100,157`)의 entrance easing. **이 화면 자체에는 animation/transition 선언이 0건**이다 | ToastProvider/Modal 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 표면: 폼 `Card`(`DocumentFormShell.tsx:122`) · 이탈 가드 Modal · 저장 토스트. elevation/shadow 를 이 화면이 선언하지 않는다(`box-shadow` grep 0건) | DS Card/Modal/Toast 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 표면: 이 화면의 `<h1>` 은 **AppHeader 의 것**이다 — `AppHeader.tsx:101` `<h1 style={titleStyle}>` → `:52-55` `{...pageTitleStyle}` → `styles.ts:51-61` 이 `--tds-typography-title-xl-*` 를 소비한다. 화면 자신은 `CardTitle`(`DocumentFormShell.tsx:123`)만 그린다 | AppHeader/styles.ts 소유 문서의 판정을 따른다 | 종속 |
| COMP-10 | COMP | N/A | 표면 없음 — **이 화면에 text-search/filter 입력이 없다.** 입력 5종은 전부 폼 필드(문서를 저장하는 값)이지 조회 조건이 아니다. 키 입력이 query 를 발행하는 경로가 없고(`watch` 는 `DirectionsPage.tsx:96-98` 의 화면 로컬 파생값뿐), 따라서 IME 조합 중 발행·stale 응답 경합이 성립하지 않는다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | 상속 | 표면: 이탈 가드의 **discard-intent ConfirmDialog**(`useUnsavedChangesDialog.tsx:212-221` `intent="discard"`) 1건. intent→tone/icon/label 매핑·busy 잠금·Esc/dim 처리는 DS `ConfirmDialog`(organism)의 것이다. 이 화면에 delete 등 다른 파괴적 액션은 없다(FS-018 §2 — 삭제 요소 없음) | DS ConfirmDialog 소유 문서의 판정을 따른다 | 종속 |
| FEEDBACK-04 | FEEDBACK | 직접 | 이 화면이 가드를 **실제로 배선한다** — `DirectionsPage.tsx:129` `dirty={isDirty}`(RHF `formState.isDirty`, `:80`) → `DocumentFormShell.tsx:100` `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })`. 훅이 3경로를 모두 덮는다: beforeunload(`useUnsavedChangesDialog.tsx:120-131`) · 앱 내 링크 capture 가로채기(`:134-155`, `_self`/수식키 edge case 포함) · popstate sentinel(`:157-182`). 저장 성공 시 `reset(values)`(`DirectionsPage.tsx:109`)로 `isDirty` 가 false 가 되어 가드가 즉시 풀린다 | 주소를 고친 뒤 ① 탭 닫기 → 브라우저 confirm ② 사이드바 '연혁' 클릭 → discard 다이얼로그 ③ 브라우저 Back → discard 다이얼로그. 저장 성공 후 같은 3동작 → 프롬프트 없이 통과. 저장 중(`saving`)에는 가드가 비활성 | pass |
| FEEDBACK-06 | FEEDBACK | N/A | 표면 없음 — **이 화면에 편집 가능한 폼을 담은 modal 이 없다.** 유일한 modal 은 이탈 가드의 discard 확인(입력 필드 0개)이며, FEEDBACK-06 의 appliesTo(`폼을 담은 모든 modal`)에 해당하지 않는다. 폼은 라우트 페이지 자체이고 그것은 FEEDBACK-04 가 덮는다 | — | n-a |
| A11Y-01 | A11Y | 상속 | 표면: 저장 성공 토스트 `toast.success('오시는 길을 저장했습니다.')`(`DirectionsPage.tsx:110`) 1건. 지속 live region viewport 는 `ToastProvider` 의 것이다 | ToastProvider 소유 문서의 판정을 따른다 | 종속 |
| A11Y-02 | A11Y | 상속 | 표면: 이탈 가드 ConfirmDialog. `aria-describedby`(본문 message) 배선은 DS 의 것이다 — `packages/ui/src/organisms/ConfirmDialog/ConfirmDialog.tsx:129` → `Modal.tsx:158` `aria-describedby={describedBy}` | DS ConfirmDialog/Modal 소유 문서의 판정을 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **세 계약 중 둘이 성립한다 — ③이 F3a 에서 닫혔고 ②만 남았다.** ① `aria-invalid` ↔ `aria-describedby` 쌍: 5필드 전부 배선됨(`DirectionsPage.tsx:142-143` · `161-165` · `185-187` · `206-208` · `238-240`) — 짝 없는 `aria-invalid` 0건 ✅. ③ **required 노출 ✅ — 이제 충족한다(F3a).** 직전 판정은 '스크린리더에 필수 여부가 전달되는 경로가 0개' 였다. 지금은 `FormField` 가 `withAriaRequired()` 로 `required` 를 **런타임 `cloneElement` 로 자식 컨트롤의 `aria-required` 에 주입**한다(`FormField.tsx:50-56`, 주입 지점 `:107`). 주입 대상은 네이티브 `input`/`select`/`textarea` 와 DS `SelectField` 뿐인데(`isRequirableChild` — `:38-41`), **이 화면의 required FormField 3종(주소 `:133-146` · 위도 `:171-190` · 경도 `:192-211`)은 자식이 전부 네이티브 `<input>`** 이므로 주입된다. `*` 마커는 여전히 `aria-hidden` 장식이지만(`FormField.tsx:96-100`) **이제 그것이 유일한 경로가 아니다**. (교통편의 `<textarea>`(`:231-242`)는 `required` 가 아니므로 대상이 아니다.) ② **hint 연결 없음 ❌ — 이것이 유일한 잔여 gap 이다**: `addressDetail`·`latitude`·`longitude`·`transit` 4필드가 hint 를 갖고 `FormField.tsx:114-118` 이 `<p id={hintIdOf(htmlFor)}>` 를 렌더하지만, 호출부의 `aria-describedby` 는 **error 일 때만** 붙는다(`errors.X !== undefined ? errorIdOf(...) : undefined`) — valid 상태에서 hint id 를 물리지 않아 '예: 37.5000' 이 AT 에 전달되지 않는다. **`required` 와 달리 이 절에는 자동 주입이 없다** — `FormField` 는 id 만 노출하고 배선은 호출부 책임이다(`FormField.tsx:10-11` 주석). 같은 계약을 `TextareaField.tsx:67`·`ImageUploadField.tsx:211` 은 지킨다 — 손수 배선한 이 화면만 이탈했다 | ③ RTL: `getByLabelText('주소')`·`getByLabelText('위도')`·`getByLabelText('경도')` 의 `aria-required` 조회 → **전부 `"true"`** → 충족. **⚠ grep 으로 판정하지 말 것** — `grep -rn "aria-required" apps/admin/src` 는 여전히 1건(수동 override)뿐이며 주입은 **런타임**이다. ② RTL: `getByLabelText('위도')` 의 `aria-describedby` 가 valid 상태에서 `undefined` → hint `<p id="dir-lat-hint">` 미연결 → **미충족(잔여 gap)**. (①은 통과: 빈 주소 제출 → `aria-describedby="dir-address-error"` === `role="alert"` `<p>` 의 id) | **gap** |
| A11Y-12 | A11Y | N/A | 표면 없음 — **이 화면에 좌측 필터 list item 이 없다**(단일 문서 폼). `filterItemStyle`/`aria-pressed`/`aria-current` 를 쓰지 않는다 | — | n-a |
| MOTION-01 | MOTION | 상속 | 표면: 이탈 가드 Modal 의 enter/exit. 이 화면은 Modal 을 소비만 한다. **PR #26 이후의 사실 갱신**(판정 주체는 그대로 DS): 오버레이 모션이 **구현됐고 CSS-only 다** — backdrop fade + dialog scale(`Modal.css:20-21,35-38,58-59`, keyframes `:126-168`), reduced-motion 게이트 `:173-180`. AnimatePresence 는 없으나 'exit 완료 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)가 동등 달성한다. **다만 ConfirmDialog 의 footer 버튼 경로(취소 `ConfirmDialog.tsx:145`)는 여전히 즉시 언마운트된다**(`Modal.tsx:27-31`) | DS Modal 소유 문서의 판정을 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | 표면: 저장 성공 토스트의 exit. 이 화면은 `toast.success` 를 호출만 한다. **PR #26 이후의 사실 갱신**(판정 주체는 그대로 DS): **exit 가 완전 구현됐다** — `Toast.css:32-37`(`tds-toast-out … forwards`) · keyframes `:121-131` · reduced-motion 게이트 `:136-141`. `Toast.tsx:186-187` 이 `onAnimationEnd` 로 큐 제거(`ToastProvider.tsx:99-100`)를 퇴장 애니메이션 뒤로 미룬다. `component.overlay` recipe 로 exit = fast(150ms)/accelerate | ToastProvider 소유 문서의 판정을 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 표면: 위 Modal·Toast 의 reduced-motion 게이트 — **둘 다 실재한다**(`Modal.css:173-180` · `Toast.css:136-141`). **이 화면 자체에 transition/transform 선언이 0건**이므로 이 화면이 더할 대상은 없다(ToggleSwitch 도 없다 — DS 전역으로는 그 게이트도 이제 실재한다: `ToggleSwitch.css:79-84`) | 전역 Motion config/DS 소유 문서의 판정을 따른다 | 종속 |
| IA-01 | IA | 직접 | 라우트가 AppShell 레이아웃 라우트 **안에** 있다 — `App.tsx:181` `{ path: '/company/directions', element: <DirectionsPage />, implemented: true }` 가 `APP_ROUTES` 에 있고, `:334-336` 이 그것을 `RequireAuth > AppShell`(`:324-330`) 하위에 렌더한다. `DirectionsPage` 는 자체 sidebar/top bar/outer frame 을 도입하지 않는다 — 최상위가 `DocumentFormShell` 의 `<div style={pageStyle}>`(flex column) 뿐이다 | `/company/directions` 진입 → 사이드바 1개 · AppHeader 1개 · padded `<main>` 1개. `DirectionsPage.tsx` grep: `<aside`/`<nav`/`<header>` = 0 | pass |
| IA-02 | IA | 직접 | title 소스가 **하나**다. `/company/directions` 는 **nav leaf** 이므로(`nav-config.ts:124` `['오시는 길', '/company/directions']`) `findNavLabel`(`:253-255`)이 exact 매치로 '오시는 길' 을 돌려주고 `AppHeader.tsx:101` 이 그것을 `<h1>` 로 그린다 — branch 라벨('기업 관리') 폴백(`:257-262`)에 **걸리지 않는다**. 화면 안에는 경쟁하는 `<h1>` 이 없다: `DocumentFormShell` 은 `CardTitle`(`:123`)만 그린다(`FormPageShell.tsx:160` 가 자체 `<h1>` 을 그리는 것과 대비). **하위 라우트가 없어**(FS-018 §1) sub-route 폴백 문제 자체가 성립하지 않는다 | `/company/directions` 진입 → 가시 primary title = '오시는 길'. `document.querySelectorAll('h1').length === 1` | pass |
| IA-04 | IA | N/A | 표면 없음 — **목록 화면이 아니다.** toolbar/count 요약/SelectionBar/table/Pagination 이 하나도 없다(FS-018 §2 — 영역 5개 전부 폼·배너·다이얼로그) | — | n-a |
| IA-05 | IA | N/A | 표면 없음 — **create·edit 쌍이 없다.** 싱글턴이라 `/new` 도 `/:id/edit` 도 존재하지 않고(`App.tsx:181` 이 이 도메인의 유일한 라우트), 화면은 항상 '기존 문서를 편집' 하나의 모드로만 존재한다(`isEdit` 개념 자체가 없다) | — | n-a |
| IA-13 | IA | N/A | 표면 없음 — **list query state(page/page-size/filter/keyword/sort)가 없다.** 이 화면의 상태는 폼 입력값(RHF)뿐이고 그것은 URL 에 넣을 대상이 아니다(입력 중인 초안을 URL 에 직렬화하지 않는다). back/forward·F5·링크 복사로 복원해야 할 view 축이 0개다 | — | n-a |
| EXC-01 | EXC | 상속 | 표면: 이 라우트의 render 예외. `AppShell.tsx:484-493` 의 `<ErrorBoundary resetKey={pathname}>` 가 `<Outlet>` 을 감싸므로 이 화면이 던져도 사이드바·헤더가 살아남는다. `App.tsx:311-315` 의 루트 경계가 셸 자체의 예외를 받는다. 이 화면은 자체 경계를 두지 않는다(소비자) | AppShell/App 소유 문서의 판정을 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 표면: (a) 세션 없이 `/company/directions` deep-link → `App.tsx:324-330` 의 `RequireAuth` 가 **AppShell 바깥**에서 `/login?returnUrl=/company/directions` 로 보낸다(`RequireAuth.tsx:66-68`). (b) 조회·저장의 401 → `queryClient.ts:41-43` 의 QueryCache/MutationCache `onError` 가 `notifySessionExpired()`(`:37-39`) → `RequireAuth.tsx:43-51` 이 세션 폐기 + `reason=session_expired` 로 이동. **이 화면은 두 경로 모두에 자기 코드를 갖지 않는다** | RequireAuth/queryClient 소유 문서의 판정을 따른다. ⚠ 재로그인 후 **편집 중이던 입력은 복원되지 않는다** — EXC-19(P1) 소관, §3 참조 | 종속 |
| EXC-03 | EXC | 직접 | **읽기 게이팅은 성립하나 쓰기 게이팅이 없다.** ① read: `AppShell.tsx:490` `<RequirePermission>` 이 `<Outlet>` 을 감싸 이 라우트의 read 권한이 없으면 `ForbiddenScreen` 을 그린다(`RequirePermission.tsx:61-64`), 리소스는 `route-resource.ts:36-46` 이 경로에서 파생한다 ✅. ② **write: 이 화면이 `can(resource,'update')` 를 보지 않는다** ❌ — `DocumentFormShell.tsx:145-152` 의 저장 버튼은 `disabled={!dirty \|\| saving \|\| loading}` 뿐이고 권한 조건이 없다. `useRouteWritePermissions`(`RequirePermission.tsx:45-52`)가 존재하고 **소비자는 F3b 이후 7곳이지만(products 3 · settings 4) `pages/company/**` 는 그 목록에 없다** (`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**) — '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`). 저장 권한 없는 역할이 버튼을 보고 눌러 서버 403 을 받고, 그것이 '저장하지 못했습니다…'(FS-018-EL-003)로 표시된다 — '왜' 를 알 수 없다. ③ 강등 reconcile: 버튼이 애초에 권한을 구독하지 않으므로 강등해도 사라지지 않는다 ❌ | 권한 스토어에서 `company-directions` 의 `update` 를 끈 역할로 진입 → **저장 버튼이 그대로 보이고 눌린다**(기대: 미렌더 또는 disable). `read` 를 끄면 403 화면(이쪽은 통과). grep: `pages/company/**` 에서 `useRouteWritePermissions` = **0건**(단 `pages/**` 전체로는 7곳 — products 3 · settings 4) | **gap** |
| EXC-04 | EXC | 직접 | **낙관적 동시성 제어가 전무하다.** ① 토큰: `Directions`(`types.ts:4-13`)에 `updatedAt`/`version` 이 없고 `pages/company/**` 전체에 `If-Match` 0건(grep 확인). ② 저장: `document.ts:30-34` 의 `save` 가 조건 없이 `doc = input` 으로 덮는다 — 두 관리자가 동시에 편집하면 마지막 쓰기가 이기고 앞선 변경이 통지 없이 사라진다. ③ 충돌 UI: `DocumentFormShell` 에 `conflict` prop 자체가 없다 — 목록형 폼(`FormPageShell.tsx:85-86,195` + `useCrudForm.ts:159-172` + `FormFeedback.tsx:58-74`)이 갖춘 409/412 → 입력 보존 + 충돌 다이얼로그 경로가 **이 화면에는 없다**. 서버가 409 를 올려도 `DirectionsPage.tsx:112-115` 의 `onError` 가 '저장하지 못했습니다…' 로 뭉갠다 | `?status=save:409` → **충돌 다이얼로그가 뜨지 않고** generic 저장 실패 배너만. 입력은 남지만(성공 토스트·이동 없음은 우연히 성립) '무엇이 충돌했는지·무엇을 눌러야 하는지' 가 화면에 없다. grep: `pages/company/directions/**` 에서 `If-Match\|updatedAt\|version\|conflict` = 0건 | **gap** |
| EXC-08 | EXC | 직접 | **동기 제출 잠금과 멱등키가 둘 다 없다.** 이 화면은 `useCrudForm` 을 쓰지 않고(단일 문서 폼) 제출을 손으로 배선한다 — `DirectionsPage.tsx:100-118` 의 `onValid` 에는 `useCrudForm.ts:103` 의 `submitLockRef`(`:195-196` 에서 두 번째 제출을 멈추는 것)에 해당하는 것이 없고, `:112-117` 의 제출 시도 단위 `idempotencyKeyRef` 도 없다. 방어는 `DocumentFormShell.tsx:149` 의 `disabled={!dirty \|\| saving \|\| loading}` 하나뿐인데, `saving`(`save.isPending`)은 **RHF 의 비동기 검증이 끝나 `onValid` 가 불린 뒤에야** true 가 되므로 그 틈의 두 번째 Enter 가 두 번째 `save.mutate` 를 만든다 — quality-bar EXC-08 근거가 지목하는 바로 그 gap 이다. (BE-018 §7.7: PUT 멱등성이 서버측 피해를 막지만 프론트 요청 중복 자체는 남는다) | 주소를 고치고 저장 버튼에 포커스 → Enter 를 빠르게 2회 → `directionsStore.save` 가 **2회** 호출된다(기대: 1회). grep: `pages/company/directions/**` 에서 `submitLockRef\|Idempotency\|idempotencyKey` = 0건 | **gap** |
| EXC-09 | EXC | 직접 | 취소가 실패로 표시되지 않는다 — `DirectionsPage.tsx:112-115` 의 `onError` 첫 줄이 `if (isAbort(cause)) return;` 이라 abort 시 `serverError` 를 세우지 않는다(배너 없음). 토스트는 성공 경로에만 있다(`:110`). abort 를 일으키는 유일한 경로는 화면 이탈(`:87` `useEffect(() => () => controllerRef.current?.abort(), [])`)이고, `save` 는 `signal` 을 `wait` 에 그대로 넘긴다(`document.ts:31` → `async.ts:23-30` 이 `AbortError` DOMException 으로 reject) → `async.ts:40-42` 의 `isAbort` 가 그것을 잡는다. `isPending` 은 mutation 이 reject 로 settle 되며 자연 복원된다. 이 화면에 일괄 작업이 없어 '실패 건수에서 abort 제외' 는 성립하지 않는다 | 저장 중(400ms 안)에 사이드바로 이탈 → 에러 토스트·배너 0건. 재진입 시 저장 버튼이 정상 상태 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **7** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-04 · IA-01 · IA-02 · EXC-09 |
| 종속 | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| gap | **4** | A11Y-11 · EXC-03 · EXC-04 · EXC-08 |

**합계 검산: 7 + 12 + 7 + 4 = 30 ✓** (quality-bar P0 총계 30건과 일치)

> ⚠ **P0 gap 4건** — quality-bar §How to use 는 'P0 하나라도 미충족이면 배치 실패' 로 규정한다. 4건 중 **EXC-03 · EXC-08 · A11Y-11 은 앱 전역 결손**(공용 프레임워크·전 화면 공통)이고, **EXC-04 는 단일 문서 폼 4종 공통**(`DocumentFormShell`)이다 — 이 화면 고유의 gap 은 0건이다. 범위는 §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 재조회 중 이전 값 유지 — `DirectionsPage.tsx:94` 가 `data !== undefined` 면 스켈레톤을 그리지 않는다. `staleTime: 30_000`(`queryClient.ts:24,47`)이 재조회 시점을 지배하고 `refetchOnWindowFocus: false`(`:67`)라 탭 복귀로 값이 튀지 않는다. **단 refetch 인디케이터가 없다** — 목록형(`CrudListShell.tsx:118-122` 의 `refreshing` · '새로고침 중…')과 달리 `DocumentFormShell` 에는 그 표면이 없어 재조회가 화면에 드러나지 않는다 | 저장 성공 → 무효화 재조회 400ms 동안 입력값이 그대로. 인디케이터는 나타나지 않는다 | 부분 pass (인디케이터 없음) |
| STATE-05 | P1 | N/A 에 가깝다 — 빈 상태가 성립하지 않는다(싱글턴). 문서 필드가 전부 빈 문자열이어도 그것은 '아직 안 채운 폼' 이지 '결과 0건' 이 아니다 | — | n-a |
| STATE-06 | P1 | 저장 성공 시 이 문서의 조회 키만 무효화 — `document.ts:60-62` `invalidateQueries({ queryKey: key })`, key = `['company','directions']`(`data-source.ts:16`). 다른 도메인 캐시를 건드리지 않는다. 자기 변경은 `reset(values)`(`DirectionsPage.tsx:109`)로 즉시 반영 | 저장 → 재진입 시 새 값. 다른 화면 캐시 무효화 0건 | pass |
| COMP-04 | P1 | 필수 3필드가 `FormField required`(`DirectionsPage.tsx:133,174,194`)로 `*` 마커를 렌더한다. bare `<label>` 0건 | 주소·위도·경도 라벨 옆 `*` 존재 | pass |
| COMP-12 | P2 | 길이 제한 필드 4종(주소 200 · 상세주소 100 · 교통편 1000)에 **실시간 카운터가 없다** — `FormField` 는 `counter` prop 을 지원하나(`FormField.tsx:46,66`) 이 화면은 넘기지 않는다. 상한에 닿으면 `maxLength` 가 입력을 조용히 멈춘다. 위도·경도는 `maxLength` 조차 없다(FS-018 §7 #5) | 교통편에 1000자 입력 → 예고·카운터 없이 입력이 멈춘다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: 저장 **성공** → 토스트(`DirectionsPage.tsx:110`) · 저장 **실패** → 카드 안 배너(`DocumentFormShell.tsx:125`) · **조회 실패** → 폼을 대체하는 인라인 Alert(`:102-115`). page 가 임의 배너 state 를 갖지 않는다(`serverError` 1개만, 공용 셸이 그린다). ⚠ 다만 quality-bar 는 write **실패**를 toast(+'다시 시도')로 규정하는데 이 화면은 배너다 — 폼 실패는 그 폼 자리에 남아야 하므로 의도된 이탈로 본다(FAQ FS-010-EL-025 선례와 동일) | `?fail=directions:save` → 카드 상단 배너(토스트 아님). `?fail=directions:load` → 폼 대체 배너 | pass |
| FEEDBACK-03 | P1 | 저장 mutation 의 성공·실패 양 경로가 배선됨(`DirectionsPage.tsx:107-116`). no-op 경로 없음 | `?fail=directions:save` → 항상 가시 실패 | pass |
| A11Y-05 | P1 | N/A — 이 화면에 `SelectField` 가 없다(입력은 text 4 + textarea 1) | — | n-a |
| A11Y-06 | P1 | skip link 는 AppShell 의 것(`AppShell.tsx:289-306,429`) — 이 화면은 소비자 | AppShell 소유 문서 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 + polite announce — `AppShell.tsx:324-340` `RouteFocusAnnouncer`. announce 라벨은 `findNavLabel(pathname)` = '오시는 길'(nav leaf 라 정확) | 다른 메뉴 → 오시는 길 이동 시 '오시는 길' announce | 종속 |
| A11Y-10 | P2 | 인라인 error `<p>` 의 `role="alert"` 는 `FormField.tsx:110-112` 가 소유(TextField 가 아니라 FormField 경로를 쓴다) | DS FormField 소유 문서 | 종속 |
| A11Y-13 | P1 | **폼 진입 시 첫 필드 포커스가 없고, 검증 실패 시 첫 invalid 필드 포커스도 없다.** `DirectionsPage.tsx:131` 은 `handleSubmit(onValid)` 만 부른다 — `useCrudForm.ts:246-248-241,253` 이 `onInvalid` 를 명시해 계약으로 고정하는 것과 대비된다. (RHF `shouldFocusError` 기본값이 error 포커스를 하긴 하나 계약으로 고정돼 있지 않고, 첫 필드 자동 포커스는 아예 없다) | 빈 주소로 제출 → `document.activeElement` 가 주소 입력인지 RHF 기본값에 의존. 진입 시 포커스는 `<body>` | gap |
| A11Y-16 | P1 | 이 화면이 새로 만든 인터랙티브 표면은 **지도 placeholder**(`DirectionsPage.tsx:216-223`) 하나뿐이며 `aria-hidden="true"` 다 — 인터랙티브가 아니므로 계약 대상이 아니다. 나머지는 DS 프리미티브 | — | n-a |
| IA-03 | P1 | breadcrumb 없음 — 이 화면은 top-level nav leaf 라 non-top route 가 아니다(하위 라우트 0개). appliesTo 밖 | — | n-a |
| IA-07 | P1 | back-link 없음 — nav leaf 이며 detail/form 하위 라우트가 아니라 '목록으로' 가 성립하지 않는다 | — | n-a |
| IA-08 | P1 | footer action bar: primary '저장' 우측, **secondary '취소' 없음**(`DocumentFormShell.tsx:137-153` — 변경 상태 문구 + 저장 버튼만). in-card footer 위치는 `FormPageShell.tsx:179-191`(취소+저장)과 컨테이너는 같으나 **구성이 다르다** — 단일 문서 폼에는 '취소' 로 돌아갈 목록이 없다는 것이 그 근거지만, quality-bar 가 요구하는 '일관 위치·구성' 과는 갈린다 | 저장 버튼이 카드 안 우측. 취소 버튼 0개 | 부분 pass |
| IA-14 | P1 | 좌표 행이 `auto-fit`(`DirectionsPage.tsx:20-24`)으로 narrow 에서 세로 1열로 접힌다. 그러나 AppShell sidebar collapse·최소 지원 폭 선언은 앱 전역 미정 | 768/375px: 사이드바가 콘텐츠를 덮는다(앱 전역) | 종속 (앱 전역 gap) |
| ERP-06 | P1 | **뒤집혔다(gap → pass).** 사용자 대상 문구가 존댓말로 통일돼 있고, **검증 문구의 조사도 이제 파생이다** — `validation.ts:19` 가 `topicParticle` 로 조립해 '위도는 -90 ~ 90 범위여야 합니다.' 를 낸다('위도'는 받침이 없어 `는`). 직전 판정의 '위도은(는) … 이 그대로 렌더된다' 는 폐기(ERP-13 참조 — 통합에서 해소) | 위도에 '95' 입력 후 제출 → **'위도는 -90 ~ 90 범위여야 합니다.'** | pass |
| ERP-13 | P1 | **통합에서 뒤집혔다(gap → pass).** 조사 헬퍼가 **`shared/format.ts:269+` 로 승격**됐다 — 이전엔 사본이 셋이었고(`logs/josa.ts` · `notifications/_shared/notification.ts` · `@tds/ui` 의 `Empty`) 앱 shared 에는 없었다. 지금 `requiredText` 가 그 헬퍼로 조사를 조립한다 — `shared/crud/validation.ts:17`(`${label}${objectParticle(label)} 입력하세요.`) · `:21,24`(`${label}${topicParticle(label)} …자를 넘을 수 없습니다.`). 받침 판정은 한글 음절의 종성 코드로 한다(`format.ts:281-295`), 한글이 아니면 관용대로 받침 없음('API를'). 직전 판정이 지적한 `'주소를 입력하세요.'` 는 이제 **'주소를 입력하세요.'** 다('주소'는 받침이 없다). `directions.test.ts:33` 이 그 문구에 `'입력'` 포함을 단언한다. `@tds/ui` 의 `Empty` 는 여전히 자기 사본을 갖는데 그것은 누락이 아니라 **레이어 경계**다 — DS 는 앱을 import 할 수 없다(`format.ts:275-277` 주석이 그 자족을 명시) | **`grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → 0건**(사용자 대상 리터럴). 앱 전역 grep 히트 12건이 남지만 전부 ① 주석 ② '이 리터럴을 내지 않는다'를 단언하는 테스트 ③ 헬퍼 자신의 설명문이다 | pass |
| ERP-14 | P1 | 표준 ERP 타입 중 이 화면에 있는 것은 **주소**뿐이며 masked input 이 아니다(우편번호 검색 연동도 없다 — 관리자가 전문을 손으로 친다). 좌표는 ERP-14 의 열거(사업자번호/전화/금액/날짜)에 없다 | 주소 입력에 마스킹·정규화 0건 | 부분 n-a / gap(주소) |
| EXC-05 | P1 | **client timeout 없음** — `AbortSignal.timeout` 이 `apps/admin/src` 전체에 0건. `document.ts:24,31` 의 `wait(LATENCY_MS, signal)` 에 상한이 없어 실 백엔드가 응답하지 않으면 '저장 중…' 이 무한히 남는다 | 응답하지 않는 fixture → spinner 무한 지속 | gap (앱 전역) |
| EXC-06 | P1 | 오류 타입은 status 를 지닌다(`http-error.ts:45-61`, 어댑터가 `?status=` 로 재현 — `dev.ts:81-85`). 그러나 **이 화면이 그 status 를 쓰지 않는다** — `DirectionsPage.tsx:112-115` 는 `isAbort` 만 보고 나머지를 전부 한 문구로 붕괴시킨다. 400/403/404/409/422/429/500 이 전부 '저장하지 못했습니다…' 다 | `?status=save:403` 과 `?status=save:500` → **같은 배너** | gap |
| EXC-07 | P1 | 422 `error.fields` → RHF `setError` 매핑이 **없다**(`useCrudForm.ts:182-192` 이 하는 일을 이 화면은 하지 않는다). 서버가 필드를 지목해도 폼 레벨 배너로만 뜬다 | `?status=save:422` → 인라인 필드 에러 0건, 배너만 | gap |
| EXC-11 | P1 | offline 감지 없음 — `navigator.onLine` 이 `apps/admin/src` 전체에 0건 | 네트워크 끊고 저장 → 일반 실패 배너 | gap (앱 전역) |
| EXC-12 | P1 | 404 vs generic 구분 **없음** — `DocumentFormShell.tsx:74,102` 는 `loadFailed: boolean` 하나만 받는다. `FormPageShell.tsx:80,115-143` 이 `LoadFailure = 'not-found' \| 'error'` 로 가르는 것과 대비. (BE-018 §7.1 은 싱글턴이라 404 를 아예 쓰지 않기로 판정했으므로 실질 위험은 403/5xx 미구분이다 — EXC-06) | `?status=load:404` → '다시 시도' 를 권하는 배너 | gap |
| EXC-14 | P1 | N/A — 이 화면에 optimistic write 가 없다(저장은 비관적). rollback 대상 없음 | — | n-a |
| EXC-15 | P1 | N/A — 이 화면에 파일 업로드가 없다 | — | n-a |
| EXC-18 | P1 | N/A — 이 화면에 selection·bulk 작업이 없다 | — | n-a |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 draft 스냅샷 **없음** — 401 → `RequireAuth.tsx:43-51` 이 programmatic navigate 하므로 FEEDBACK-04 가드가 발화하지 못하고 입력이 사라진다(FS-018 §7 #11). 만료 임박 연장 프롬프트도 없다 | 주소 편집 중 `?status=load:401` 유발 → 입력 손실 | gap (앱 전역) |
| EXC-20 | P1 | 오류 참조 코드 표시 **없음** — `HttpError.reference`(`http-error.ts:47,68-75`)와 `FormServerError` 의 `errorReference` 표시(`FormFeedback.tsx:44`)가 존재하지만 `DocumentFormShell.tsx:125` 는 `<Alert>{serverError}</Alert>` 만 그린다. raw body/stack 노출은 없다(후자는 만족) | `?status=save:500` → 참조 코드 없음 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 문서 조회 응답 p95 | **≤ 500ms**(서버) | 측정 불가 — 백엔드 없음 | BE-018 §2 서버 상한 5초는 **타임아웃**이지 예산이 아니다 |
| 문서 저장 응답 p95 | **≤ 800ms**(서버) | 측정 불가 | 전 필드 치환 1건 + 정제(BE-018 §7.2) |
| 첫 렌더(진입 → 폼 조작 가능) | **≤ 1s**(로컬) | 픽스처 400ms + 렌더 | — |
| 재조회 횟수 | 진입 1회 + **저장당 1회**(무효화 재조회) | 일치 — `document.ts:60-62`. `staleTime` 30초 안의 재진입은 0회, `refetchOnWindowFocus: false` 라 탭 복귀 0회 | `queryClient.ts:24,47,67` |
| 메모리 | 문서 1건 — 상수 | 일치. 리스트·이미지·object URL 없음 | — |
| 번들 | 이 화면 고유 코드 ≈ 250줄(`DirectionsPage.tsx`) + 공용 셸. **지도 SDK 를 로드하지 않는다**(FS-018 §7 #1) — 지도가 붙으면 외부 스크립트 수백 KB 가 이 예산에 들어온다 | 일치 | `DirectionsPage.tsx:3` 주석 |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이지 성능 예산이 아니다.** 픽스처가 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 상수이며, 백엔드가 붙으면 이 상수는 사라진다. 위 예산의 어떤 행도 이 값에서 유도되지 않았다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 문서 조회 5xx | 인라인 배너 + 재시도. 셸 유지 | ✅ `DocumentFormShell.tsx:102-115`. 단 403/404/5xx 를 구분하지 않는다(§3 EXC-06/EXC-12) |
| 저장 5xx | 카드 안 배너 + 입력 보존 + 재제출 가능 | ✅. 단 참조 코드 없음(§3 EXC-20) |
| 저장 409(다른 관리자 선점) | 입력 보존 + 충돌 다이얼로그 | ❌ generic 배너 — §2 EXC-04 gap |
| 화면 렌더 예외 | 셸 유지 + 복구 UI | ✅ `AppShell.tsx:484-493`(상속) |
| 세션 만료 | 재인증 후 원경로 복귀 | ⚠ 경로는 복귀, **입력은 손실** — §3 EXC-19 |
| 응답 없음(무한 대기) | 상한에서 abort + 재시도 안내 | ❌ 상한 없음 — §3 EXC-05 |
| 네트워크 단절 | 배너 + 쓰기 게이팅 + 복귀 시 refetch | ❌ 감지 없음 — §3 EXC-11 |
| 화면 이탈 중 저장 진행 | abort · 거짓 실패 없음 | ✅ `DirectionsPage.tsx:87,113` — §2 EXC-09 pass |
| 저장 후 새로고침 | 저장값 유지 | ❌ **픽스처가 메모리에만 산다** — `document.ts:22-23` 의 `let doc = seed` 는 새로고침으로 시드로 돌아간다(백엔드 부재의 결과이지 결함이 아니다) |

### 4.3 데이터 보존 · 감사

| 축 | 요구 | 현재 |
|---|---|---|
| 변경 이력 | 오시는 길은 **고객 화면에 노출되는 공개 정보**다 — 누가 언제 주소를 바꿨는지 남아야 한다 | ❌ 없다. `Directions`(`types.ts:4-13`)에 `updatedAt`/`updatedBy` 가 없고 이력 조회 심도 없다. BE-018 이 감사 로그를 정의하지 않았다 — 서버측 감사(요청 로그)는 이 계약의 범위 밖 |
| 소프트 삭제 | N/A — 삭제 액션이 없다(싱글턴) | — |
| 초안 보존 | 장수명 폼의 로컬 autosave | ❌ 없다 — §3 EXC-19 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **A11Y-11** | **P0** | **잔여 범위가 절반으로 좁아졌다.** 직전 판정의 '필수 3필드에 `required`/`aria-required` 가 없다 — 스크린리더에 필수 여부가 닿는 경로 0개' 는 F3a 가 닫았다: `FormField.withAriaRequired`(`FormField.tsx:50-56`, 주입 지점 `:107`)가 주소·위도·경도 `<input>` 에 `aria-required` 를 런타임 주입한다. **남은 것은 hint 미연결(4필드)** — `addressDetail`·`latitude`·`longitude`·`transit` 이 hint 를 갖고도 valid 일 때 `aria-describedby` 가 `undefined` 라 '예: 37.5000' 같은 형식 안내가 AT 에 전달되지 않는다. **`required` 와 달리 이 절에는 자동 주입이 없다** — `FormField` 가 id 만 노출하고 배선을 호출부에 맡기는 계약이 그대로다(`FormField.tsx:10-11`). 직전 판정이 제안한 'FormField 자동 배선 승격' 은 **required 축에서만 실현됐다.** **NFR-015 `profile-biznum` · NFR-017 `history-year` 와 같은 결함** — 함께 고칠 것 | 손수 배선 폼 전반(NFR-015 · NFR-017 · 이 화면) + `FormField` 계약 | A40 (`FormField` 의 hint 자동 배선 승격 검토 — required 선례가 생겼다) · A41 |
| 2 | **EXC-03** | **P0** | 쓰기 권한 게이팅 없음 — 저장 권한 없는 역할도 저장 버튼을 보고 누른다. **⚠ 범위 정정(F3b 이후)**: `useRouteWritePermissions` 소비자는 이제 **7곳**이다(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`) — **`pages/company/**` 만 그 목록에 없다**(`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**). '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`) | **기업 관리 섹션 전체**(앱 전역 아님) | A11 change_request |
| 3 | **EXC-04** | **P0** | 낙관적 동시성 제어 전무 — 토큰(`If-Match`/`version`) 없음 + `DocumentFormShell` 에 `conflict` prop 없음. 마지막 쓰기 승리, 앞선 변경이 통지 없이 소실 | **단일 문서 폼 4종**(`DocumentFormShell` 소비자) + 데이터 계약 | A40 (`DocumentFormShell`) · A63 (BE-018 §7.4) |
| 4 | **EXC-08** | **P0** | 동기 제출 잠금·멱등키 없음 — 응답 전 Enter 연타 = 요청 2건. `useCrudForm` 이 갖춘 방어를 단일 문서 폼이 상속하지 못한다 | **단일 문서 폼 4종**(`document.ts`/`DocumentFormShell`) | A40 |
| 5 | A11Y-13 | P1 | 폼 진입 첫 필드 포커스 없음 · `onInvalid` 미명시 | 이 화면 | A41 |
| 6 | COMP-12 | P2 | 길이 제한 4필드에 실시간 카운터 없음. 좌표는 `maxLength` 조차 없음 | 이 화면 | A41 |
| ~~7~~ | ~~ERP-13 / ERP-06~~ | P1 | **해소됨(통합) — 이관 취소.** 조사 헬퍼가 `shared/format.ts:269+` 로 승격돼 `requiredText`(`shared/crud/validation.ts:17,21,24`) · `useCrudForm.ts:222` · `useCrudList.tsx:108,158` 이 전부 그것을 소비한다. `pages/company/` 의 사용자 대상 조사 리터럴 **0건** — '주소를 입력하세요.' · '위도는 -90 ~ 90 범위여야 합니다.' 로 옳게 갈린다 | — | **이관 취소** |
| 8 | EXC-06 / EXC-07 / EXC-12 | P1 | status 별 UX 분기 없음 — 403/404/409/422/429/500 이 한 문구로 붕괴. `error.fields` → 인라인 에러 매핑 없음 | **단일 문서 폼 4종**(`DocumentFormShell` 이 `loadFailed` boolean 하나만 받는 구조) | A40 · A11 |
| 9 | EXC-20 | P1 | 5xx 오류 참조 코드 미표시(`FormFeedback.tsx` 의 `errorReference` 를 `DocumentFormShell` 이 쓰지 않음) | 단일 문서 폼 4종 | A40 |
| 10 | EXC-05 | P1 | client timeout 없음(`AbortSignal.timeout` 앱 전체 0건) | **앱 전역** | A40 · A63 |
| 11 | EXC-11 | P1 | offline 감지 없음(`navigator.onLine` 앱 전체 0건) | **앱 전역** | A40 |
| 12 | EXC-19 | P1 | 세션 만료 시 dirty 폼 draft 손실 · 만료 임박 연장 프롬프트 없음 | **앱 전역** | A40 · A11 |
| 13 | STATE-03 | P1 | 재조회 인디케이터 없음(`DocumentFormShell` 에 `refreshing` 표면 부재) | 단일 문서 폼 4종 | A40 |
| 14 | IA-08 | P1 | footer 에 secondary '취소' 없음 — 목록형 폼(`FormPageShell`)과 구성이 갈린다 | 단일 문서 폼 4종 | A11 |
| 15 | IA-14 | P1 | 768/375px 반응형·최소 지원 폭 미선언(AppShell) | **앱 전역** | A40 · A11 |
| 16 | — | — | **지도 임베드 미구현**(FS-018 §7 #1 · BE-018 §7.5) — quality-bar 축이 아니라 기능 결손 | 이 화면 | A11 · A01 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 **재현**하는 절차이며, 실행 결과가 아니다.

### 6.1 이 화면의 실패 재현 스위치

`data-source.ts:19` 가 `createDocumentStore<Directions>('directions', DIRECTIONS_SEED)` 로 만들므로 **scope = `directions`**, op 은 `document.ts` 가 정하는 **두 개뿐**이다:

| op | 어디서 던지나 | 화면 결과 |
|---|---|---|
| `load` | `document.ts:26` `failIfRequested(scope, 'load')` | FS-018-EL-014 조회 실패 배너 |
| `save` | `document.ts:32` `failIfRequested(scope, 'save')` | FS-018-EL-003 저장 실패 배너 |

**`?fail=` (generic Error)** — `dev.ts:87-92`:

| URL | 효과 |
|---|---|
| `/company/directions?fail=load` | 조회 실패(op 이름만 주면 **모든 어댑터**의 같은 op 이 실패한다) |
| `/company/directions?fail=directions:load` | 이 화면의 조회만 실패 (scope 지정 — 권장) |
| `/company/directions?fail=directions:save` | 이 화면의 저장만 실패 |
| `/company/directions?fail=all` | 조회·저장 모두 실패 |

**`?status=` (status 지닌 `HttpError`)** — `dev.ts:57-71`. 재현 가능한 status 는 `dev.ts:27-37` 의 9개(400·401·403·404·409·412·422·429·500):

| URL | 효과 | 이 화면의 반응 |
|---|---|---|
| `?status=directions:load:401` | 조회 401 | 전역 인터셉터 → 재인증 경로(§2 EXC-02) |
| `?status=directions:save:409` | 저장 409 | **generic 배너** — 충돌 다이얼로그 없음(§2 EXC-04 gap 재현) |
| `?status=directions:save:403` | 저장 403 | generic 배너 — 500 과 구분 불가(§3 EXC-06 gap 재현) |
| `?status=directions:save:422` | 저장 422 | generic 배너 — 인라인 필드 에러 없음(§3 EXC-07 gap 재현) |
| `?status=all:500` | 전 op 500 | 참조 코드 없는 배너(§3 EXC-20 gap 재현) |

> **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts`·`pages/members/data-source.ts` 에만 있다). 로딩 상태는 `LATENCY_MS = 400`(`dev.ts:12`) 고정 지연으로만 관찰한다 — 그 400ms 안에 스크린샷을 잡거나, 조회 중 상태를 늘리려면 그 상수를 임시로 키운다.

### 6.2 그 밖의 측정

| 축 | 도구 | 비고 |
|---|---|---|
| TOKEN-01 | `shared/token-guard.test.ts` (회귀 테스트) + ESLint `no-restricted-syntax` | grep 기반 판정을 CI 가 고정한다 |
| A11Y-12 | `shared/a11y-guard.test.ts:82` (`aria-current` 사용 파일 검사) | 이 화면은 n-a 지만 앱 전역 회귀를 이 테스트가 막는다 |
| 검증 규칙 | `directions.test.ts` (7 케이스 — 정상·빈 주소·선택 필드·좌표 비숫자·위도 범위·경도 범위·음수 좌표) | `directionsSchema` 회귀. **화면 렌더 테스트는 없다** |
| 폼 동작 | 없음 — `DirectionsPage` 의 RTL 테스트가 존재하지 않는다 | §2 의 A11Y-11·EXC-08 판정은 코드 대조로만 이뤄졌다 |

## 7. 자기 점검

- [x] **P0 30건을 quality-bar §요약 순서 그대로 전수 판정했다** — 빈칸 0건
- [x] §2.1 산수 검산: pass 7 + 종속 12 + n-a 7 + gap 4 = **30** ✓
- [x] 모든 `pass` 에 코드 근거(파일:라인)가 있다
- [x] 모든 `gap` 에 재현 가능한 측정 기준이 있다
- [x] 모든 `N/A` 에 '표면이 왜 이 화면에 없는가' 사유가 있다
- [x] **quality-bar 요구 문구를 복제하지 않았다** — ID 참조 + 이 화면의 충족 방식만 기술
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다(지도·업로드·bulk·optimistic 등 없는 표면은 n-a 로 명시하거나 제외)
- [x] §4.1 에 `LATENCY_MS = 400` 이 예산이 아님을 명시했다
- [x] §6 의 `?fail=` scope(`directions`)와 op(`load`·`save`)을 **코드에서 확인**했다(`data-source.ts:19` · `document.ts:26,32`). **`?delay=` 를 쓰지 않았다**
- [x] FS-018 §7 ↔ BE-018 §7.9 ↔ 이 문서 §5 의 이관 항목이 서로 일치한다
- [x] E2E 를 실행하지 않았음을 §6 머리에 명시했다
