---
id: NFR-079
title: "플랜·이용 현황 비기능 명세"
functionalSpec: FS-079
backendSpec: BE-079
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-079. 플랜·이용 현황 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-079 플랜·이용 현황 (`/settings/plan`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-079(요소·예외) · BE-079(계약·판정) · `specs/quality-bar.md`(요구 정본) · **NFR-078**(반대 방향 축) · `docs/adr/0013-entitlement-layer.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-079 §7 · BE-079 §7.9 와 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(`pages/settings/plan/**`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **판정 규칙의 정본(`shared/entitlements/**`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(RequireAuth·RequirePermission·RequireEntitlement·ErrorBoundary)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격 — **P0 대부분이 n-a 인 이유**

**이 화면은 읽기 전용이고, 네트워크를 쓰지 않으며, 폼이 없다.** 그 셋이 P0 31건 중 **19건을 n-a** 로 만든다. 그것은 판정을 회피한 것이 아니라 **표면이 실제로 없다**는 사실이며, 근거가 FS-079-EL-025 에 부재 규칙으로 번호까지 붙어 있다:

- **비동기가 없다** — `usePlan()`(`RequireEntitlement.tsx:36-38`)이 zustand 조각 구독이고 값의 출처가 localStorage 다(`entitlement-store.ts:40-49`). **react-query 소비 0건.** 그래서 `{first-load, refetching, error}` 상태가 **존재하지 않는다**(STATE-01·02).
- **쓰기가 없다** — 폼·저장·dirty·이탈 가드·토스트·modal 이 전부 0건. 그래서 FEEDBACK-02/04/06 · A11Y-01/02/11 · MOTION-01/02 · EXC-04/08/09 가 걸릴 자리가 없다.
- **목록이 아니다** — 기능 표는 `MODULE_SPECS` 배열 순서 그대로의 **최대 11행 고정 카탈로그**이며 검색·필터·정렬·페이지네이션이 없다(STATE-04 · COMP-10 · IA-04 · IA-13).

**그 대신 이 화면이 짊어지는 것은 EXC-21 이다.** quality-bar 에 이번에 들어온 '거절 4계열 분리'의 판정을 **가장 먼저 받아야 할 화면**이며(FS-079 §7 #16), 이 화면은 그 4계열 중 **②(플랜)의 착지점**이다 — 잠금 화면(`UpgradeScreen`)의 '현재 플랜 확인' 버튼이 여기로 보낸다.

**이 화면의 축은 fail-open 이다.** `entitlementStateForResource` 는 매핑이 없으면 곧바로 `granted`(`route-entitlement.ts:27-28`), `entitlementStateForPath` 는 잎을 못 찾으면 `granted`(`:38-42`), 저장값이 깨지면 `DEFAULT_PLAN_STATE`(전 기능 가용 — `entitlement-store.ts:45-48`). 주석 원문이 그 이유를 한 줄로 적는다(`route-entitlement.ts:12`): **'판정 실패가 기능 정지가 되면 안 된다.'** **형제 축인 결제 설정은 방향이 정반대(fail-closed)** 이며(NFR-078 §1.2 · `payment-settings.ts:128-130`), 권한 축도 fail-closed 다. **세 축의 방향 차이가 EXC-22 의 근거이고, 한 화면이 두 계열을 동시에 말하지 않게 하는 것이 EXC-21 이다.**

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | N/A | **네 상태 중 셋이 존재하지 않는다.** `usePlan()`(`RequireEntitlement.tsx:36-38`)이 **동기 스토어 조각 구독**이라 `data === undefined` 시점이 없다 — `first-load` 도 `refetching-with-data` 도 발생하지 않는다. `error` 경로도 없다(localStorage 실패는 `DEFAULT_PLAN_STATE` 로 삼킨다 — `entitlement-store.ts:45-48`). `empty` 는 표 행 0개일 때지만 **오늘 그 상태가 발현되지 않는다**(FS-079 §7 #7). 즉 **'정확히 하나만 렌더'를 위반할 조합 자체가 없다.** `grep -rn "useQuery\|useCrudListQuery" pages/settings/plan/` = **0건** | **백엔드가 붙으면(BE-079 EP-01) 이 판정을 다시 매긴다** — 그때 스켈레톤·재조회 유지가 새로 필요하고, **그 실패는 fail-open 이어야 한다**(§5 #1) | **n-a** |
| STATE-02 | STATE | N/A | **read 실패 표면이 없다.** 이 화면은 요청을 내지 않는다. 유일한 실패 경로(localStorage 읽기 불가·JSON 파손)는 **조용히 삼켜져 `DEFAULT_PLAN_STATE` 로 수렴한다**(`entitlement-store.ts:45-48`) — **의도된 fail-open 이며 인라인 Alert 를 그릴 대상이 아니다.** `Alert` 소비 2건(`PlanPage.tsx:148,151`)은 실패가 아니라 **계약 상태 안내**(청구 상태·변경 예고)다 | 조회가 생기면 이 판정을 다시 매긴다(§5 #1) | **n-a** |
| STATE-04 | STATE | N/A | **표면이 없다.** 페이지네이션·행 선택·필터가 하나도 없다 — 기능 표는 `MODULE_SPECS` 순서 그대로의 **최대 11행 고정 카탈로그**다(`PlanPage.tsx:200-229` · `plan.ts:126-138`). 'total 축소 시 page clamp' · '숨겨진 행의 선택 해제'가 걸릴 표면이 존재하지 않는다 | 목록·선택이 도입되면 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/settings/plan/` → **0건**(실측 2026-07-22, `PlanDevPanel.tsx` 포함). 모든 스타일 객체가 `cssVar(...)` 만 참조하고, 파생 치수도 토큰 배수다 — DEV 패널 그리드 `minmax(calc(${cssVar('space.6')} * 5), 1fr)`(`PlanDevPanel.tsx:27`). **표·정의목록·힌트 스타일을 화면이 만들지 않고 공유 스타일(`tableStyle`·`thStyle`·`tdStyle`·`dlStyle`·`dtStyle`·`ddStyle`·`hintStyle`)을 소비한다**(`PlanPage.tsx:26-35`) | 위 grep → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 **셋**이고 전부 DS/공유 클래스를 소비한다: 사내 홈페이지 링크 `tds-ui-link tds-ui-focusable`(`PlanPage.tsx:185`) · DEV 패널 `SelectField` 2개(`PlanDevPanel.tsx:66,86`). **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건). ⚠ **운영 빌드에서는 포커스 표면이 링크 1개뿐이다**(DEV 패널이 접힌다) | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS `<SelectField>`(DEV 전용) · `<StatusBadge>` · `<Card>`. **Modal·Toast·스켈레톤이 이 화면에 없어 오버레이 recipe 는 걸리지 않는다.** **이 화면이 animation/transition 을 직접 선언하지 않는다** — `grep -rniE "transition\|animation\|transform" pages/settings/plan/` = **0건**(실측) | tokens codegen 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` **2개**(현재 플랜 · 포함 기능) + DEV 1개(`PlanPage.tsx:155,193` · `PlanDevPanel.tsx:54`). Modal·Toast·dropdown 은 없다. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — `grep -rn "<h1" apps/admin/src/pages/settings/` = **0건**(실측). 화면 제목은 AppHeader 가 nav 잎 라벨('플랜·이용 현황' — `nav-config.ts:293`)로 그린다(FS-079-EL-005). 카드 제목은 `CardTitle`(`:156,194` · DEV `:55`)이며 heading tier 를 화면이 직접 선언하지 않는다. **KPI 성격의 큰 수치가 이 화면에 없다** — 플랜 등급·청구 상태는 `<dd>` 와 `StatusBadge` 로 표현된다 | AppHeader `titleStyle` 이 title tier 토큰을 참조하는지 확인. 이 화면에서는 로컬 타이포 값 선언이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 검색·필터 입력이 하나도 없다 — `grep -rn "SearchField\|useDebouncedSearch\|useListState" pages/settings/plan/` = **0건**. 이 화면의 입력은 **DEV 패널의 `<select>` 2개뿐**이고 그것은 텍스트 검색이 아니라 열거값 선택이라 IME 조합 문제가 발생하지 않는다 | 검색 입력이 도입되면 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | N/A | **표면이 없다 — 파괴적·비가역 액션이 이 화면에 존재하지 않는다.** 운영 빌드에 **쓰기 컨트롤이 0건**이고(FS-079-EL-025 ①④), DEV 패널의 두 액션(`devSetTier`·`devSetBillingState` — `entitlement-store.ts:115-127`)은 ① **운영 빌드에 코드가 없으며**(`PlanPage.tsx:232-234`) ② **되돌릴 수 있다**(같은 select 로 원래 값을 다시 고르면 된다) ③ 개발 재현 수단이다. 확인 게이트를 요구할 대상이 아니다 | 이 화면에 쓰기가 생기면 다시 매긴다 | **n-a** |
| FEEDBACK-04 | FEEDBACK | N/A | **표면이 없다.** **unsaved 변경이라는 개념이 없다** — `useForm`·`useUnsavedChangesDialog` 소비 **0건**(FS-079-EL-025 ①). DEV 패널의 select 는 **즉시 반영·즉시 영속**이라(`entitlement-store.ts:100-106`) '저장하지 않은 상태'가 만들어지지 않는다 | 폼이 생기면 다시 매긴다 | **n-a** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **modal 이 하나도 없다** — `grep -rn "Modal\|ConfirmDialog" pages/settings/plan/` = **0건**. 폼 modal 은 물론 확인 다이얼로그도 없다 | 폼 modal 이 도입되면 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | N/A | **표면이 없다.** 이 화면은 **toast 를 쓰지 않는다** — `grep -rn "useToast\|toast\." pages/settings/plan/` = **0건**(FS-079-EL-025 ⑤). 알릴 결과가 없다(쓰기가 없으므로). DEV 패널의 전환도 화면이 즉시 다시 그려지는 것으로 결과가 보인다 | toast 가 도입되면 다시 매긴다 | **n-a** |
| A11Y-02 | A11Y | N/A | **표면이 없다.** dialog 가 0건이다(위 grep). `aria-describedby` 를 배선할 modal 이 존재하지 않는다. **대신 두 카드가 `aria-labelledby` 로 자기 제목을 가리킨다**(`PlanPage.tsx:155-156,193-194` · DEV `:54-55`) — 그것은 랜드마크 이름 계약이지 이 요구의 대상이 아니다 | modal 이 도입되면 다시 매긴다 | **n-a** |
| A11Y-11 | A11Y | N/A | **표면이 없다 — 운영 빌드에 폼 컨트롤이 0건이다.** DEV 패널의 `<select>` 2개는 **`<label htmlFor>` 로 명시 연결**돼 있고(`PlanDevPanel.tsx:63-65,83-85` ↔ `id="plan-dev-tier"`·`"plan-dev-billing"`), **오류·필수 상태가 없어** `aria-invalid ↔ aria-describedby` 짝 요구도 `required` 노출 요구도 발생하지 않는다. `grep -rn "aria-invalid\|aria-required" pages/settings/plan/` = **0건**(실측) — 짝 없는 `aria-invalid` 도 0건이라는 뜻이다 | 폼 컨트롤이 생기면 다시 매긴다. DEV 패널에 오류 상태가 생기면 그때 짝을 요구한다 | **n-a** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 좌측 필터 list item 이 없다 — 필터 자체가 없다. `grep -rn "aria-current\|aria-pressed" pages/settings/plan/` = **0건**(실측). ⚠ **사이드바의 '· 잠금' 꼬리표**(`plan.ts:520` · `AppShell.tsx:290-295`)는 이 화면 밖이며 **선택 상태가 아니라 가용성 표기**라 이 요구의 대상이 아니다 | 토글 필터가 도입되면 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | N/A | **표면이 없다.** Modal 이 0건이다(A11Y-02 와 같은 grep). backdrop fade·dialog scale·`AnimatePresence` 를 걸 대상이 존재하지 않는다 | Modal 이 도입되면 다시 매긴다 | **n-a** |
| MOTION-02 | MOTION | N/A | **표면이 없다.** Toast 가 0건이다(A11Y-01 과 같은 grep) | Toast 가 도입되면 다시 매긴다 | **n-a** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: DS `<SelectField>`(DEV 전용) · `<StatusBadge>` · `<Card>` 의 transition. **이 화면 자신은 transition/transform 을 0건 선언한다**(grep 실측). **요구가 명시 지목한 `ToggleSwitch` 는 이 화면에 없다** — 상속하는 게이트는 DS atom 쪽뿐이며 **운영 빌드에서는 그마저 select 가 사라져 표면이 더 줄어든다** | 전역 motion config·DS CSS 판정에 종속. 이 화면에서 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:475` `{ path: '/settings/plan', element: <PlanPage />, implemented: true }`). **이 화면은 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={pageStyle}>`(`PlanPage.tsx:144`, column + gap 뿐)이고 그 안에 알림 스택 · 카드 2개(+DEV 1)만 있다 | `/settings/plan` 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족.** `/settings/plan` 은 **nav 잎**이다(`nav-config.ts:293` `['플랜·이용 현황', '/settings/plan']`) — 하위 라우트가 없다(`App.tsx:475`). `findCoveringLeaf` 가 자기 자신을 정확히 찾아 AppHeader 가 `<h1>플랜·이용 현황</h1>` 을 그리고, **화면은 in-content `<h1>` 을 그리지 않는다**(grep 0건). 따라서 **`<h1>` 이 정확히 1개이고 title 메커니즘이 단일하다.** ⚠ **화면 안내문이 카드 안에 있어**(`:159`) 형제 설정 화면(카드 위 — `SettingsFormShell.tsx:144`)과 리듬이 다르다 — **title 모델의 위반이 아니라 레이아웃 불일치**이며 §5 로 이관한다 | `/settings/plan` 진입 → `document.querySelectorAll('h1').length === 1` 이고 문구가 '플랜·이용 현황'이면 pass | **pass** |
| IA-04 | IA | N/A | **표면이 없다 — 이 화면은 list 화면이 아니다.** `<table>` 이 있으나 그것은 **데이터 목록이 아니라 카탈로그 파생 뷰**다: 행이 `MODULE_SPECS`(코드 상수 11건)에서 나오고(`PlanPage.tsx:114-133`) **툴바·검색·필터·결과 count·우상단 등록 버튼·SelectionBar 가 하나도 없으며 있어야 할 이유도 없다.** 행 수의 상한이 **11로 고정**돼 있어 'page size 초과 가능'이 성립하지 않는다 — **페이지네이션 부재가 결함이 아니다** | 서버가 모듈 목록을 데이터로 내려주기 시작하면 다시 매긴다 | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** `/settings/plan` 단일 라우트이며 `/new`·`/:id/edit` 가 없다 — **이 앱은 플랜을 만들지도 편집하지도 않는다**(BE-079 §7.1). create·edit 폼 쌍이라는 요구 자체가 걸리지 않는다 | 폼 라우트 쌍이 생기면 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** URL 에 직렬화할 **list state 가 없다** — 필터·검색·정렬·페이지가 하나도 없고 `grep -rn "useSearchParams\|useListState" pages/settings/plan/` = **0건**. **DEV 패널의 선택값도 URL 이 아니라 localStorage 에 산다**(`entitlement-store.ts:31-37`) — 그것이 옳다. 플랜은 URL 로 공유할 view state 가 아니라 **계정의 사실**이며, 쿼리스트링에 실으면 '링크로 플랜을 바꾸는' 것처럼 보인다 | 필터가 도입되면 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:395-400` + `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다. ⚠ **이 화면에는 그 경계로 실제로 떨어질 경로가 하나 있다** — 쿼터 조회기(`entitlementUsageOf` — `entitlement-store.ts:75-77`)에 방어가 없어 **주입된 함수가 던지면 렌더 중 예외가 되고**, 그것이 `planQuotaStatus`(`:138-140`) → `moduleDetail`(`PlanPage.tsx:105`) 경로로 이 화면에서 발화한다. **fail-open 원칙에 어긋나는 유일한 자리다**(§4.3 · §5 #4) | ErrorBoundary 소유 문서 판정에 종속. **던지는 조회기를 등록한 뒤 이 화면에 진입해 사이드바가 유지되는지** 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① **진입 가드** — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=/settings/plan` 으로 `Navigate` ② **세션 중 401** — `queryClient` 인터셉터(`shared/query/queryClient.ts:60-66`). ⚠ **이 화면 자체는 요청을 내지 않으므로 401 을 만들지 않는다**(FS-079 §4.1) — 인터셉터는 다른 화면의 요청에서만 발화한다. **미저장 입력이 없어 잃을 것도 없다** | auth/session 소유 문서 판정에 종속. 세션을 지우고 `/settings/plan` 딥링크 → `/login?returnUrl=%2Fsettings%2Fplan` 으로 가는지 확인 | **종속** |
| EXC-03 | EXC | 상속 | ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:407-411`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. 리소스는 라우트에서 파생된다(`page:/settings/plan`) ② **write 게이팅 — 요구가 자명하게 충족된다.** `create/update/delete` 컨트롤이 **하나도 렌더되지 않는다**(운영 빌드 기준). 그래서 `useRouteWritePermissions` 소비가 **0건인 것이 정답**이다(FS-079-EL-025 ④) ③ ⚠ **DEV 빌드에서는 조회 전용 역할도 플랜을 바꿀 수 있다**(FS-079 §7 #13) — 운영 빌드에는 그 코드가 없으므로(`PlanPage.tsx:232-234`) 요구 위반이 아니지만, **그 배제를 배포 검증이 확인하지 않는다**(BE-079 §7.9 #3 · §5 #3) | `RequirePermission` 소유 문서 판정에 종속. 권한 스토어에서 `page:/settings/plan` 의 `read` 를 끄고 진입 → 403 화면이 뜨는지. `grep -rn "useRouteWritePermissions" pages/settings/plan/` = **0건**(쓰기 컨트롤 부재의 확인) | **종속** |
| EXC-04 | EXC | N/A | **표면이 없다 — 이 화면에 mutable record 의 write 가 없다.** 낙관적 동시성 토큰(`If-Match`/`ETag`/`version`)을 실을 요청이 존재하지 않는다. ⚠ **크로스탭 갱신은 충돌이 아니다** — `storage` 이벤트가 다른 탭의 변경을 **따라가는** 것이고(`entitlement-store.ts:154-163`) 두 탭이 같은 레코드를 편집해 다투는 상황이 아니다. **`PlanState.version` 은 동시성 토큰이 아니라 저장 형태 버전**이다(`plan.ts:269-270`) — 이름이 비슷해 혼동하기 쉬운 자리라 여기 적어 둔다 | 쓰기가 생기면 다시 매긴다(BE-079 §7.1 은 그럴 계획이 없다고 판정했다) | **n-a** |
| EXC-08 | EXC | N/A | **표면이 없다 — user-initiated write 가 0건이다.** 제출·확인 버튼이 없어 중복 제출 개념이 성립하지 않는다. DEV 패널의 select 변경은 **zustand 동기 갱신**이라(`entitlement-store.ts:100-106`) 요청도, 지연도, 이중 적용도 없다 | 쓰기가 생기면 다시 매긴다 | **n-a** |
| EXC-09 | EXC | N/A | **표면이 없다 — 요청이 0건이라 abort 개념이 성립하지 않는다.** `AbortController`·`isAbort` 소비가 이 화면에 없다. 언마운트 시 정리할 진행 중 작업도 없다(구독 해제는 AppShell 이 소유한다 — `AppShell.tsx:226`) | 조회가 생기면 다시 매긴다 — **그때 이 판정이 가장 크게 바뀐다**(§5 #1) | **n-a** |
| EXC-21 | EXC | 상속 | **이 화면은 4계열 중 ②(플랜)의 착지점이며, 자기 화면 안에서는 어떤 계열도 섞지 않는다.** ① **판정 순서가 코드에 고정돼 있다** — 인증 → **플랜** → 권한 → 설정(`plan.ts:10-17`), 중첩이 그 순서다(`AppShell.tsx:407-411` `<RequireEntitlement><RequirePermission>`). 뒤집으면 **사지 않은 기능에 '권한이 없습니다'** 라고 말하게 되고 운영자는 켜 줄 수 없는 관리자에게 권한을 요청한다 ② **거절 표면이 계열별로 분리돼 있다** — `ForbiddenScreen`(권한 · 403) vs `UpgradeScreen`(플랜 · `ErrorScreens.tsx:106-140`)이 다른 컴포넌트이고, 후자에는 **참조 코드가 없다**(`:100` — '신고할 고장이 아니라 계약 상태다'). 근거 주석이 그 분리를 적는다(`:91-98`): '**「권한 요청」과 「결제 필요」는 다른 사람이 다른 행동을 해야 한다**' ③ **이 화면 자신은 게이팅 대상이 아니다** — `MODULE_RESOURCES` 에 `/settings/**` 가 없어 언제나 `granted`(`route-entitlement.ts:27-28`, 회귀 `route-entitlement.test.ts:56-57,89-93`). **잠금을 설명하는 화면이 잠기면 설명을 볼 수 없다** ④ **화면 안 배너는 거절이 아니다** — 청구 상태(`PlanPage.tsx:148`)·변경 예고(`:151`)는 **계약 상태 안내**이며 403 계열 표현이 섞이지 않는다. ⑤ **그 계열 분리가 렌더 회귀로 고정돼 있다**(2026-07-22 신설) — `RequireEntitlement.test.tsx` 가 **잠금 화면에 403 문구가 없다는 사실**을 본문 전체 문자열로 단언하고(`:226-231`), **판정 순서**(플랜도 권한도 없으면 잠금 화면 · `:315-323`)와 **absent 의 `replace` 되돌림**(`:272-280`)까지 못 박는다. `AppShell.entitlement-nav.test.tsx` 가 사이드바 쪽(absent = 항목 삭제 · locked = 꼬리표)을 고정한다. ⚠ **판정 자체는 `RequireEntitlement`/`ErrorScreens` 소유 문서에 종속**한다 — 이 화면은 그 계약의 **소비자이자 설명자**다 | 플랜에서 `ai.agent` 를 내리고 `/ai/chat` 진입 → **`UpgradeScreen` 이 뜨고 '접근 권한이 없습니다'·참조 코드가 섞이지 않으면 pass.** 그 화면의 '현재 플랜 확인' → 이 화면으로 오는지. **반대로 이 화면은 어떤 플랜에서도 열려야 한다.** `grep -rn "403\|Forbidden" pages/settings/plan/` = 0건. 회귀 `RequireEntitlement.test.tsx`(locked 3건 · absent 3건 · granted 2건 · 판정 순서 3건 · fail-open 4건) | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **3** | TOKEN-01 · IA-01 · IA-02 |
| `종속` | **9** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · MOTION-03 · EXC-01 · EXC-02 · EXC-03 · **EXC-21** |
| `n-a` | **19** | STATE-01 · STATE-02 · STATE-04 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-01 · A11Y-02 · A11Y-11 · A11Y-12 · MOTION-01 · MOTION-02 · IA-04 · IA-05 · IA-13 · EXC-04 · EXC-08 · EXC-09 |
| `gap` | **0** | — |
| **합계** | **31** | 3 + 9 + 19 + 0 = **31** ✓ |

**검산 (P0 31건 전수 · 지정 순서대로 나열해 셈)**

| # | 요구 ID | 판정 | # | 요구 ID | 판정 |
|---|---|---|---|---|---|
| 1 | STATE-01 | n-a | 17 | MOTION-01 | n-a |
| 2 | STATE-02 | n-a | 18 | MOTION-02 | n-a |
| 3 | STATE-04 | n-a | 19 | MOTION-03 | 종속 |
| 4 | TOKEN-01 | pass | 20 | IA-01 | pass |
| 5 | TOKEN-02 | 종속 | 21 | IA-02 | pass |
| 6 | TOKEN-03 | 종속 | 22 | IA-04 | n-a |
| 7 | TOKEN-04 | 종속 | 23 | IA-05 | n-a |
| 8 | TOKEN-05 | 종속 | 24 | IA-13 | n-a |
| 9 | COMP-10 | n-a | 25 | EXC-01 | 종속 |
| 10 | FEEDBACK-02 | n-a | 26 | EXC-02 | 종속 |
| 11 | FEEDBACK-04 | n-a | 27 | EXC-03 | 종속 |
| 12 | FEEDBACK-06 | n-a | 28 | EXC-04 | n-a |
| 13 | A11Y-01 | n-a | 29 | EXC-08 | n-a |
| 14 | A11Y-02 | n-a | 30 | EXC-09 | n-a |
| 15 | A11Y-11 | n-a | 31 | EXC-21 | 종속 |
| 16 | A11Y-12 | n-a | | | |

> 31행 전수 · `pass` 3 + `종속` 9 + `n-a` 19 + `gap` 0 = **31** ✓
>
> **P0 gap 0건.** **이것을 '이 화면이 안전하다'로 읽으면 틀린다.** n-a 19건은 **표면이 없어서**이고, 그 부재의 상당수는 **백엔드가 붙는 순간 한꺼번에 표면이 되는 것들**이다(STATE-01·02 · EXC-09 — §5 #1). 그리고 이 화면의 실제 결함들(사실이 아닌 배너 · Invalid Date · 조회기 무방어 · 테스트 0건)은 **P0 요구가 아니라 P1·P2 와 §4.3 에 떨어진다** — 그것이 §3·§4.3 을 이 문서에서 무겁게 읽어야 하는 이유다.
>
> **n-a 19건의 뿌리는 셋뿐이다**: **비동기 없음**(STATE-01·02 · EXC-09) · **쓰기 없음**(FEEDBACK-02/04/06 · A11Y-01/02/11 · MOTION-01/02 · EXC-04/08 · IA-05) · **목록 아님**(STATE-04 · COMP-10 · A11Y-12 · IA-04 · IA-13). 각 칸에 그 뿌리를 개별 근거와 함께 적었다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·검색·폼·저장·업로드·토스트·modal·낙관적 업데이트·bulk)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **표면이 없다** — 백그라운드 refetch 가 존재하지 않는다(동기 조회). ⚠ **크로스탭 갱신은 refetch 가 아니다** — `storage` 이벤트가 스토어를 다시 읽으면 화면이 그대로 다시 그려지고, 조각 구독이라 **플랜이 안 바뀌면 재렌더도 없다**(`entitlement-store.ts:129-131` · `RequireEntitlement.tsx:35`) | 조회가 생기면 다시 매긴다 | **n-a** |
| STATE-05 | P1 | **기능 표에 빈 상태가 없다** — 행이 0개여도 `<thead>` 만 남는다(`PlanPage.tsx:215-228`). **오늘은 발현 불가**(모든 모듈이 absent 가 되는 경로가 없다 — FS-079 §7 #7)이나, 사내 어드민이 모듈을 끄기 시작하면 **머리만 있는 표**가 그려진다 | `overrides` 로 모든 키를 끈 상태를 주입해 표가 어떻게 보이는지 확인 | **gap(잠재)** |
| STATE-06 | P1 | **표면이 없다** — write 가 없어 invalidate 대상이 없다. DEV 패널의 갱신은 스토어 단일 소스라 캐시 정합 문제가 발생하지 않는다 | — | **n-a** |
| COMP-01 | P1 | **버튼이 하나도 없다.** 유일한 이동 수단이 외부 링크 `<a href={PLAN_PORTAL_URL} target="_blank" rel="noopener noreferrer">`(`PlanPage.tsx:181-188`)이고, **그것을 DS `Button` 으로 만들지 않은 것이 옳다** — DS `Button` 은 `<button>` 만 렌더하는 Frozen 계약이고 새 탭·복사·미리보기 같은 링크 기본 동작을 흉내 낼 수 없다(같은 판단이 `ErrorScreens.tsx:120-122`). `rel` 이 `noopener`·`noreferrer` 둘 다 붙어 있다 | `grep -rn "buttonStyle(\|tds-ui-btn-" pages/settings/plan` = 0건 | **pass** |
| COMP-04 | P1 | **표면이 없다** — required 입력이 없다(DEV select 2개는 언제나 값이 선택돼 있다) | — | **n-a** |
| COMP-09 | P2 | **`planLabel` 에 길이 상한이 없다**(`plan.ts:588-591` 은 빈 값만 되돌린다) — 긴 계약명('2026 전사 계약 · 부속합의 포함')이 `StatusBadge` 를 넘칠 수 있다(`PlanPage.tsx:156`). truncate·ellipsis 가 없다. 기능 표의 설명도 같은 성질이나 그쪽은 상수라 통제된다 | 60자짜리 `planLabel` 을 주입해 배지가 레이아웃을 미는지 확인 | **gap(경미)** |
| ERP-01 | P1 | status→tone 매핑이 **두 벌로 나뉘어 있다**: 청구 상태는 **화면 소유**(`BILLING_TONE` — `PlanPage.tsx:76-80`), 모듈 상태는 **행 조립 시 파생**(`tone: state.kind === 'granted' ? 'success' : 'neutral'` — `:126`). 화면 안에서는 각각 한 곳이라 갈릴 자리가 없고, 주석이 그 판단을 적는다(`:75` '문구가 의미를 싣고 색은 보조다 — WCAG 1.4.1'). **앱 전역 레지스트리는 아니다** | 모든 상태가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-03 | P1 | 표에 sticky thead 가 없다. **행이 최대 11개라 필요하지 않다**(`plan.ts:126-138`) — 의도적 미적용이며 요구가 말하는 '긴 테이블'이 아니다 | 행 수 상한이 11인지 확인 | **pass(정당한 미적용)** |
| ERP-04 | P1 | 정렬 가능 헤더가 없다. **`MODULE_SPECS` 배열 순서가 곧 카탈로그 순서**이고 그것이 의미를 갖는다(커머스 → 영업 → 콘텐츠 → 마케팅 → AI → 통계). 정렬을 열면 그 의미가 사라진다 — 의도적 미적용 | — | **pass(정당한 미적용)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고, **잠금·청구 문구의 정본이 카탈로그와 순수 함수에 한 벌씩만 있다**(`plan.ts:369-371` 잠금 사유 · `:407-415` 청구 안내 · `:484-489` 변경 예고). 화면이 문구를 지어내지 않는다 | 화면 안 하드코딩 문구가 안내문 2건뿐인지 | **pass** |
| **ERP-08** | P2 | **미충족 — 이 화면 유일의 실재 표시 결함.** `formatPlanDate(new Date(plan.effectiveAt))`(`PlanPage.tsx:175`)에 **`Number.isNaN` 가드가 없어** 파싱 불가 문자열이면 **`'NaN-NaN-NaN'`** 이 렌더된다. `normalizePlanState` 는 '문자열이고 비어 있지 않으면' 통과시키고(`plan.ts:601`), **형제 소비자 `planChangeNotice` 는 같은 값에 가드를 둔다**(`:487`). **그 가드를 지키는 테스트가 `'깨진 날짜는 예고하지 않는다 — Invalid Date 를 화면에 찍지 않는다'`(`plan.test.ts:266`)라는 이름으로 존재하는데 이 자리가 그것을 어긴다.** ⚠ **이미 지난 `effectiveAt` 도 그대로 '적용 예정'으로 표시된다** — 배너는 침묵하는데(`plan.ts:487`) 이 줄만 과거 날짜를 계속 예고한다 | localStorage 의 `effectiveAt` 을 `'내일'` 같은 비-ISO 문자열로 바꾸고 진입 → **'NaN-NaN-NaN' 이 보이면 재현.** 과거 ISO 를 넣으면 배너는 없는데 `<dd>` 만 남는지 확인 | **gap** |
| ERP-09 | P2 | `formatPlanDate`(`plan.ts:492-497`)가 `getFullYear/getMonth/getDate` 를 쓴다 — **브라우저 로컬 타임존 기준**이며 `shared/format.ts` 의 KST 고정 정책을 경유하지 않는다. `effectiveAt` 이 UTC 자정 근처면 **러너·운영자의 TZ 에 따라 하루가 달라진다** | UTC `2026-08-01T15:30:00Z` 를 넣고 KST/UTC 두 TZ 에서 표시가 같은지 확인 | **gap(경미)** |
| ERP-13 | P1 | 이 화면의 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(`이(가)`·`을(를)`·`(으)로` grep 0). 이름을 interpolate 하는 문자열은 잠금 배지(`'<티어> 플랜부터'` — `:127`)와 수준(`'<수준> 수준'` — `:109`)인데 **둘 다 조사를 붙이지 않는 구문**이라 폴백이 필요 없다 | 조사 폴백 grep = 0 | **pass** |
| ERP-15 | P1 | 전량을 한 DOM 에 렌더하지만 **행이 최대 11개**라 요구가 정한 임계값과 무관하다 | — | **pass** |
| EXC-05 · EXC-11 | P1 | **표면이 없다 — 이 화면은 네트워크를 쓰지 않는다.** 타임아웃도 offline 배너도 걸릴 요청이 없다. **오프라인에서도 그대로 그려진다**(값이 localStorage 에서 온다). ⚠ **백엔드가 붙으면 둘 다 새로 걸리고, 그때도 판정은 fail-open 이어야 한다**(§5 #1) | 조회가 생기면 다시 매긴다 | **n-a** |
| EXC-06 · EXC-12 · EXC-20 | P1 | **표면이 없다** — 서버 error 응답이 0건이라 class 별 UX 매핑·404 분기·참조 코드가 걸릴 자리가 없다. ⚠ **`UpgradeScreen` 이 참조 코드를 주지 않는 것은 결함이 아니라 판정이다**(`ErrorScreens.tsx:100`) | 조회가 생기면 다시 매긴다 | **n-a** |
| **FEEDBACK-03** | P1 | **미충족(성질이 다른 위반).** 이 화면에 클릭 액션이 없어 'no-op 클릭' 은 발생하지 않는다. **그러나 화면이 사실이 아닌 것을 말한다** — 청구 상태 배너(FS-079-EL-001)가 '**지금은 조회만 가능합니다**'라고 말하는데 **앱은 그렇게 동작하지 않는다.** `usePlanWriteBlock`·`useCreateBlock`(`RequireEntitlement.tsx:79-92`)의 **소비처가 리포 전체에 0건**이라 미납·정지가 쓰기를 실제로 잠그지 않는다(FS-079 §7 #6). 쿼터 소진도 같다 — `quotaCreateBlock` 은 완성돼 있고 회귀도 있는데(`plan.test.ts:124-166`) **읽는 화면이 없다** | DEV 패널에서 청구 상태를 '이용 정지'로 바꾸고 상품 등록으로 이동 → **등록이 그대로 되면 재현.** `grep -rn "usePlanWriteBlock\|useCreateBlock\|useQuota\|useEntitlement(" apps/admin/src --include=*.tsx` = **0건**(정의 파일 제외) | **gap** |
| A11Y-16 | P1 | 새 인터랙티브·표시 표면이 표준 계약을 대체로 충족한다 — 카드 2개가 `aria-labelledby` 로 자기 제목을 가리키고(`:155-156,193-194`) 표에 `<caption>`(`:201`)과 행 머리 `<th scope="row">`(`:218`)가 있으며, 상태를 **색이 아니라 `StatusBadge` 라벨**로 이중 인코딩한다. DEV select 2개도 `<label htmlFor>` 로 연결된다. **잔여**: **표의 locked 행이 잠금 사유를 보이지 않는다** — 배지가 `'<티어> 플랜부터'` 만 말하고 `entitlementStateOf` 가 함께 낸 `reason`(`plan.ts:369-371`)은 버려진다(`PlanPage.tsx:127`). 같은 상태를 `UpgradeScreen` 은 문장으로 설명한다 | 스크린리더로 표를 읽어 각 행의 상태·수준이 라벨로 전달되는지. locked 행에서 '어느 플랜에서 왜 열리는지'가 들리는지(현재 티어만) | **pass(잔여 있음)** |
| **EXC-22** | P1 | **이 화면이 fail-**open** 축의 설명자다.** 요구가 '판정 축의 실패 방향을 축마다 명시하고 코드가 그 방향으로 수렴할 것'을 말하는데, **이 축은 그것을 코드 주석으로 선언하고 회귀로 고정한다**: ① 선언 — `plan.ts:19-28`('이 파일에서 가장 중요한 문장' · '**고객이 돈을 낸 기능이 우리 조회 실패로 멈추는 것은 어떤 과금 실수보다 나쁘다**') · `route-entitlement.ts:8-12`('**판정 실패가 기능 정지가 되면 안 된다**') · `entitlement-store.ts:8-11`(권한 스토어를 복사하며 **실패 방향만 반대로** 둔 이유) ② 수렴 경로 8종이 전부 `granted`(BE-079 §7.2 표) ③ 회귀 — `route-entitlement.test.ts:89-98`(매핑 없는 경로·모르는 경로) · `plan.test.ts:65-71,168-225`(응답에 없는 키·저장값 파손) · **`RequireEntitlement.test.tsx:353-417`(2026-07-22 신설 — 조회기가 던져도 · 저장값이 비어도 · 응답에 키가 없어도 **화면이 열린다**를 렌더로 고정하고, 마지막 한 건이 **fail-open 이 권한까지 열지는 않는다**는 반대 방향까지 잡는다)** ④ **반대 방향의 두 축이 실재한다** — 권한(RBAC)은 fail-closed 이고, **결제 설정의 `pgSellable` 도 fail-closed** 다(NFR-078 §3 EXC-22 · `payment-settings.ts:128-130`). **세 축의 방향 차이가 이 요구의 대상이며 이 화면은 그중 fail-open 축을 설명한다.** ⚠ **잔여 둘**: (a) **매핑 누락이 곧 무료 개방**이고 그것을 잡는 배포 검증이 없다(BE-079 §7.4 · §5 #5) (b) **쿼터 조회기가 던지면 화면이 죽어** 이 축의 원칙에 어긋난다(§5 #4) | `pnpm vitest run apps/admin/src/shared/entitlements/route-entitlement.test.ts` — **'어떤 잎에도 속하지 않는 경로도 granted 다' 가 통과하면 fail-open 방향이 확인된다.** localStorage 의 `tds-admin.plan` 을 깨진 JSON 으로 바꾸고 진입 → **전 기능 가용으로 떨어지면 pass**(잠기면 방향 위반) | **pass(잔여 있음)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 플랜 조회 | **0 요청 · 동기** | `usePlan()` 이 zustand 조각 구독이고 초기값이 `loadState()`(`entitlement-store.ts:109`) — **localStorage 읽기 1회 + `JSON.parse` 1회**가 앱 부팅 시 전부다. **실제 네트워크 0건.** ⚠ `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **이 화면과 무관하다** — 어댑터가 없어 그 상수를 거치지 않는다 |
| 조회 응답 p95 (연동 후) | ≤ 300ms (BE-079 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** **이 조회는 AppShell 부팅 경로에 든다**(모든 라우트의 게이팅이 이 값에 의존한다) — 느리면 앱 전체가 늦어지므로 형제 설정 화면보다 예산이 빡빡해야 한다 |
| 첫 렌더 | ≤ 0.8s (LCP) | 미측정. **행이 최대 11 · 카드 2(+DEV 1) 고정**이라 렌더 비용이 상수다. 라우트가 `lazy` 다(`App.tsx:207`) |
| 렌더당 계산 | `toRows` 1회 = 모듈 11회 판정 | `toRows`(`PlanPage.tsx:114-133`)가 `MODULE_SPECS` 를 순회하며 `entitlementStateOf` 를 부른다 — **순수 함수 11회 + `granted` 행에 한해 `moduleDetail` 1회.** `useMemo` 가 없으나 **비용이 상수라 필요하지 않다** |
| **쿼터 사용량 계산** | 렌더당 1회 | `planQuotaStatus` → `entitlementUsageOf` → 주입 조회기(`wiring.ts:178-180`)가 **상품 저장소를 렌더 시점에 읽는다**(`listProducts().length`). **상품이 많아지면 이 비용이 건수에 비례한다** — 지금은 픽스처라 무시할 수준이나 **연동 후에는 서버 `usage` 를 쓰는 편이 옳다**(BE-079 §7.9 #4) |
| 재렌더 횟수 | 플랜이 바뀔 때만 | **조각 구독이라 플랜이 안 바뀌면 재렌더도 없다**(`RequireEntitlement.tsx:35` · `entitlement-store.ts:129-131`) — **충족** |
| 크로스탭 전파 | 이벤트당 1회 | `storage` 이벤트는 **그 이벤트를 낸 탭 이외에서만** 발화하므로 저장→재로드 루프가 없다(`entitlement-store.ts:148-149`) — **충족** |
| 번들 | 이 화면 고유 코드 ≤ 8KB(gzip) | 미측정. 화면 2파일(`PlanPage.tsx` 237행 · `PlanDevPanel.tsx` 104행) + 정본 `shared/entitlements/**`(5파일). **운영 빌드에서는 `PlanDevPanel` 이 통째로 빠진다**(`PlanPage.tsx:232-234`). 외부 의존 0(zustand 는 앱 공용) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 저장값 없음(첫 방문) | 기능이 열려 있다 | **충족** — `DEFAULT_PLAN_STATE`(전 기능 가용 · `tier: 'enterprise'`)로 시작한다(`entitlement-store.ts:43` · `plan.ts:324-332`). 근거(`:319-322`): '**엔타이틀먼트 축이 존재하지도 않던 어제와 오늘의 앱이 달라지면 안 된다**' |
| localStorage 접근 불가(프라이빗 모드) | 앱이 죽지 않는다 | **충족** — `try/catch` 로 `DEFAULT_PLAN_STATE` 로 떨어진다(`entitlement-store.ts:45-48`) |
| 저장값 JSON 파손 | 기능이 늘어나는 쪽으로 수렴 | **충족** — 위와 같다. 부분 파손(개별 키)도 **그 키만 없는 것으로** 두어 `granted` 가 된다(`plan.ts:551-555`) |
| **저장 실패(localStorage 쓰기)** | 사용자가 안다 | **미충족 — 조용히 삼킨다**(`entitlement-store.ts:34-36`). 의도된 fail-open 이나 **DEV 패널에서 플랜을 바꿨는데 저장이 안 된 것을 알 방법이 없다**(FS-079 §7 #12) |
| **쿼터 조회기가 던진다** | 사용량만 모르고 화면은 산다 | **미충족 — 화면 전체가 죽는다.** `entitlementUsageOf`(`entitlement-store.ts:75-77`)에 방어가 없어 렌더 중 예외가 되고 `ErrorBoundary` 로 떨어진다. **fail-open 원칙에 정면으로 어긋나는 유일한 자리다**(§5 #4) |
| 다른 탭에서 플랜 변경 | 즉시 따라온다 | **충족** — `storage` 이벤트 구독(`entitlement-store.ts:154-163` · 배선 `AppShell.tsx:226`). 근거(`:151-152`): '사내 어드민이 플랜을 내리면 **이 앱의 모든 탭이 같은 순간에 같은 화면을 보여야 한다**' |
| 네트워크 단절 | 그대로 그려진다 | **충족(구조적)** — 이 화면은 네트워크를 쓰지 않는다. ⚠ **연동 후에는 이 성질이 사라진다** — 그때 마지막으로 알던 값을 쓰는 경로가 필요하다(BE-079 §6.1 #3) |
| 세션 만료 | 잃을 것이 없다 | **충족** — 미저장 입력이 없다. 이 화면 자체는 401 을 만들지 않는다 |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:395-400`) |
| **조회 실패(연동 후)** | 배너를 띄우면서도 기능은 열어 둔다 | **설계 미정 — 이 앱에 선례가 없는 조합이다.** 지금은 조회 자체가 없어 문제가 드러나지 않는다. `catch` 한 줄이 기본 상태 대신 빈 상태를 주면 **전 기능이 잠긴다**(BE-079 §7.9 #2 · §5 #1) |

### 4.3 엔타이틀먼트 판정 무결성 · 감사

이 화면은 **'이 계정이 무엇을 샀는가'** 를 보여 주고, 그 값이 **앱 전체의 라우트 가시성·접근 가능성**을 정한다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **판정이 한 규칙으로 수렴한다** | **충족** — 라우트 게이팅(`RequireEntitlement`)·사이드바 꼬리표(`AppShell.tsx:290-295`)·이 화면의 표(`PlanPage.tsx:118`)가 **전부 `entitlementStateOf` 하나를 부른다.** 화면별로 다시 해석하는 코드가 0건이다 |
| **화면 식별 규칙이 권한 축과 같다** | **충족** — 두 축이 `findCoveringLeaf`(nav-config) 하나로 화면을 식별한다(`route-entitlement.ts:3-6`). 서로 다른 규칙을 쓰면 상세·폼 라우트에서 답이 갈린다 — '권한은 상품으로 푸는데 플랜은 카테고리로 푸는 식' |
| **실패 방향이 여는 쪽이다** | **충족(fail-open)** — 수렴 경로 8종 전수(BE-079 §7.2). 회귀 `route-entitlement.test.ts:89-98` · `plan.test.ts:65-71,168-225` |
| **판정 순서가 진단을 정한다** | **충족** — 플랜이 권한보다 **바깥**(`AppShell.tsx:407-411`). 뒤집으면 사지 않은 기능에 403 을 말하게 된다(EXC-21) |
| **잠금이 데이터를 지우지 않는다** | **충족(규칙)** — 미납·정지는 기능을 `locked` 로 만들지 않고 **읽기 전용으로 내려앉힐 뿐**이고(`plan.ts:396-404`), 다운그레이드는 **초과분을 삭제하지 않고 생성만 막는다**(`:458-473`). ⚠ **다만 그 규칙을 집행하는 화면이 0건이다**(FEEDBACK-03 gap) |
| **매핑 누락을 잡는 장치가 있는가** | **부분 — 세 테스트가 '적힌 매핑'만 검사한다.** `route-entitlement.test.ts:21-59` 가 오타·중복·역인덱스를 잡지만 **'적혀야 하는데 안 적힌 화면'은 아무도 묻지 않는다.** fail-open 축에서는 그 누락이 **화면이 열려서** 발각되지 않는다 — **무료 개방이 조용히 지속된다**(BE-079 §7.4) |
| **판정을 서버가 재검증하는가** | **미정 — 계약으로만 존재한다.** 세 파일이 '프론트 게이팅은 보안이 아니다'라고 적고(`plan.ts:34` · `RequireEntitlement.tsx:15-17` · `entitlement-store.ts:16`) BE-079 §7.3 이 그것을 계약으로 만들었으나 **서버가 없다.** 지금 **위조된 localStorage 하나면 전 기능이 열린다** |
| **거절 응답의 계열이 분리돼 있는가** | **부분 — 화면은 분리돼 있고 응답 계약은 미정.** `UpgradeScreen` vs `ForbiddenScreen` 은 다른 컴포넌트이나, **서버가 무엇으로 거절할지(402 계열)는 BE-003 봉투에 아직 없다**(BE-079 §7.9 #10) |
| **플랜 변경 이력이 남는가** | **없다.** 이 앱은 `PlanState` **현재 값 1건**만 들고 있다 — 언제 어떤 플랜에서 어떤 플랜으로 바뀌었는지 알 수 없다. `effectiveAt` 은 **다음 변경의 예고**일 뿐 지난 이력이 아니다. **감사 필드(`updatedBy`/`updatedAt`)도 없다** — 형제 설정 문서(`Revisioned<T>`)와 다른 점이다. 이력의 정본이 사내 홈페이지라는 판정은 타당하나, **'왜 지난달에 이 기능이 잠겼나'에 이 어드민은 답할 수 없다** |
| **DEV 수단이 운영에 새지 않는가** | **충족(구조) · 미검증(절차)** — `import.meta.env.DEV` 분기가 패널 코드를 통째로 접는다(`PlanPage.tsx:232-234`). **그러나 운영 번들에 `PlanDevPanel`·`devSetTier` 가 0건임을 확인하는 검사가 없다**(BE-079 §7.9 #3). ⚠ **DEV·스테이징을 실제 운영자에게 보여 주는 순간 그것이 '플랜 변경 UI'로 보인다**(FS-079 §7 #13) |
| **`absent` 갈래가 실행된 적이 있는가** | **테스트에서는 있고, 앱에서는 없다**(2026-07-22 갱신). 회귀는 `receivePlan` 으로 `overrides: { 'marketing.sms': { enabled: false } }` 를 직접 주입해 **메뉴 삭제**(`AppShell.entitlement-nav.test.tsx:105-118`)와 **대시보드 `replace` 되돌림**(`RequireEntitlement.test.tsx:246-280`)을 고정한다. **그러나 앱의 정상 경로로는 여전히 도달 불가다** — `marketing.sms`(`minTier: null`)는 `entitlementsForTier` 가 키를 넣지 않아 fail-open `granted` 가 되고(`plan.ts:299,383`), 그 키를 끄는 통로(`receivePlan`)의 **화면 호출부가 0건**이며 DEV 패널에도 그 수단이 없다. **이 화면의 EL-013(행 제외)만은 여전히 어느 층에서도 실행된 적이 없다** — 렌더 회귀 둘은 라우트 가드와 사이드바를 보지 `PlanPage` 의 표를 보지 않는다(§5 #2 · FS-079 §7 #7 은 이 갱신 이전 기준이다) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | (STATE-01·02 · EXC-05·06·09·11·12 의 n-a 근거) | — | **백엔드가 붙으면 n-a 7건이 한꺼번에 표면이 된다** — 로딩·조회 실패·재시도·타임아웃·offline·abort. **그리고 그 조회의 실패는 fail-open 이어야 한다**(`plan.ts:19-28`) — '실패 배너를 띄우면서도 기능은 열어 두는' 조합이며 **이 앱에 선례가 없다.** 설계가 정해져 있지 않다 | 이 화면 + `shared/entitlements` | **아키텍처 · UI 기획 · 백엔드 명세** (FS-079 §7 #3 · BE-079 §7.9 #1·#2) |
| 2 | (EXC-21 종속의 잔여) | — | **⚠ FS-079 §7 #2 가 잡은 '컴포넌트 테스트 0건'은 2026-07-22 에 대부분 해소됐다** — `RequireEntitlement.test.tsx`(418행)와 `AppShell.entitlement-nav.test.tsx`(153행)가 신설돼 **잠금 화면·403 문구 부재·판정 순서·absent 의 `replace` 되돌림·사이드바 꼬리표·fail-open 4갈래**를 렌더로 고정한다. **남은 잔여는 이 화면 자신이다** — `PlanPage` 를 렌더하는 테스트가 여전히 **0건**이라 **기능 표가 absent 행을 빼는가(EL-013) · locked 배지가 옳은 티어를 말하는가 · 쿼터 문자열이 옳은가 · 청구 배너가 뜨는가**를 아무도 지키지 않는다. ⚠ 아울러 `module-resources.ts:97` 이 인용하는 `module-resources.test.ts` 는 **여전히 실재하지 않는다**(그 단언은 `route-entitlement.test.ts:36-51` 에 있다) — **파일명을 잘못 가리키는 주석은 다음 사람에게 없는 안전망을 있다고 말한다** | 이 화면 + `shared/entitlements` | **프론트 구현 (PlanPage 렌더 테스트 신설 · 주석 정정)** |
| 3 | (EXC-03 종속의 잔여) | — | **DEV 패널의 운영 빌드 배제를 배포 검증이 확인하지 않는다** — 보장이 `import.meta.env.DEV` 한 줄과 번들러 동작뿐이다. 그것이 깨지면 **결제 없이 상위 모듈을 여는 UI 가 제품에 실린다**(`devSetTier` 는 흉내가 아니라 실제 저장이다 — `entitlement-store.ts:115-123`). ⚠ **DEV 빌드에서는 조회 전용 역할도 플랜을 바꿀 수 있다** | 이 화면 + 빌드 파이프라인 | **프론트 구현 (검증 신설) · 아키텍처** (FS-079 §7 #13 · BE-079 §7.9 #3) |
| 4 | EXC-22 (잔여 b) | P1 | **쿼터 조회기에 방어가 없다** — `entitlementUsageOf`(`entitlement-store.ts:75-77`)가 주입 함수를 그대로 부른다. 던지면 렌더 중 예외 → `ErrorBoundary`. **사용량을 못 세는 것이 화면 전체를 죽이는 것은 이 축의 fail-open 원칙에 정면으로 어긋난다** | `shared/entitlements` | 프론트 구현 (FS-079 §7 #12) |
| 5 | EXC-22 (잔여 a) | P1 | **매핑 누락이 곧 무료 개방이다** — fail-open 이라 **화면이 열려서 아무도 눈치채지 못한다**(`route-entitlement.test.ts:1-5`). 기존 테스트 3건은 '적힌 매핑'만 검사하고 **'안 적힌 화면'은 묻지 않는다.** 새 nav 잎 중 `MODULE_RESOURCES` 에도 **명시적 제외 목록**에도 없는 것을 세는 배포 검증이 필요하며, **그 제외 목록 자체가 아직 없다**(지금은 '매핑에 없으면 뼈대'라는 암묵이다) | `shared/entitlements` + CI | **아키텍처 · 프론트 구현 (검증 신설)** (BE-079 §7.4 · §7.9 #6) |
| 6 | **FEEDBACK-03** | P1 | **화면이 사실이 아닌 것을 말한다** — 청구 상태 배너가 '지금은 조회만 가능합니다'라고 하는데 **미납·정지가 쓰기를 실제로 잠그지 않는다.** `usePlanWriteBlock`·`useCreateBlock`·`useQuota`·`useEntitlement` 네 훅의 **소비처가 0건**이다. **쿼터 소진(상품 200/200)도 등록을 막지 않는다** — 판정과 회귀는 완성돼 있고 읽는 화면만 없다 | 앱 전역(소비 화면들) | **UI 기획 쪽 변경 요청 (최우선) · 프론트 구현** (FS-079 §7 #6) |
| 7 | **ERP-08** | P2 | **'변경 적용 예정'이 `'NaN-NaN-NaN'` 을 찍는다** — `formatPlanDate(new Date(plan.effectiveAt))`(`PlanPage.tsx:175`)에 `Number.isNaN` 가드가 없다. **형제 소비자는 가드를 두고**(`plan.ts:487`) **그 가드를 지키는 테스트가 이름으로 그것을 금지한다**(`plan.test.ts:266`). ⚠ **이미 지난 `effectiveAt` 도 '적용 예정'으로 남는다** — 배너는 침묵하는데 이 줄만 계속 예고한다 | 이 화면 | **프론트 구현** (FS-079 §7 #4·#5) |
| 8 | ERP-09 | P2 | `formatPlanDate` 가 **브라우저 로컬 TZ** 기준이라(`plan.ts:492-497`) `shared/format.ts` 의 KST 고정 정책을 경유하지 않는다. UTC 자정 근처의 `effectiveAt` 이 TZ 에 따라 하루 달라진다 | `shared/entitlements` | 프론트 구현 |
| 9 | A11Y-16 (잔여) | P1 | **표의 locked 행이 잠금 사유를 보이지 않는다** — 배지가 `'<티어> 플랜부터'` 만 말하고 `reason`(`plan.ts:369-371`)은 버려진다. 같은 상태를 `UpgradeScreen` 은 문장으로 설명한다. **'무엇을 쓰고 있고 무엇이 잠겨 있는지 한 번에 확인하는 곳'**(`PlanPage.tsx:11-12`)이라는 목적에 비해 정보가 적다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-079 §7 #10) |
| 10 | STATE-05 · COMP-09 | P1·P2 | ① **기능 표에 빈 상태가 없다** — 행 0개면 `<thead>` 만 남는다(오늘은 발현 불가) ② **`planLabel` 에 길이 상한이 없어** 긴 계약명이 배지를 넘칠 수 있다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-079 §7 #8) |
| 11 | (FS-079 §7 #11) | — | **`LEVEL_LABEL` 에 없는 level 값이 원문 그대로 노출된다** — `LEVEL_LABEL[value.level] ?? value.level`(`PlanPage.tsx:109`). 지도는 3개인데 정규화(`plan.ts:540-543`)는 **어떤 문자열이든 통과시킨다.** 서버가 `'premium'` 을 보내면 화면에 '`premium` 수준'이 찍혀 그 지도의 목적('advanced 를 그대로 찍지 않게 한다' — `:166`)이 무너진다 | 이 화면 + BE 계약 | 프론트 구현 · 백엔드 명세 |
| 12 | (§4.3 감사 축) | — | **플랜 변경 이력·감사 필드가 없다** — 현재 값 1건뿐이고 `updatedBy`/`updatedAt` 이 없다(형제 설정 문서의 `Revisioned<T>` 와 다르다). 이력의 정본이 사내 홈페이지라는 판정은 타당하나 **'왜 지난달에 이 기능이 잠겼나'에 이 어드민은 답할 수 없다** | BE 계약 | 백엔드 명세 |
| 13 | (FS-079 §7 #7 · #9 · #14 · #15) | — | 판정에 직접 걸리지 않으나 함께 추적: **`absent` 를 앱의 정상 경로로는 만들 수 없다**(회귀는 `receivePlan` 으로 직접 주입한다 — DEV 패널에 overrides 주입 수단이 없다) · **`PLAN_PORTAL_URL` 하드코딩**(환경별 분기 없음) · **화면 안내문이 카드 안**이라 형제 설정 화면과 레이아웃 리듬이 다르다 · **이 라우트의 e2e 커버리지가 0** | 이 화면 + `shared/entitlements` | 프론트 구현 · 아키텍처 · 명세 리뷰 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다**(기준일 2026-07-22).

**`?fail=` · `?status=` 는 이 화면에 존재하지 않는다 — 어댑터가 없기 때문이다.**

`pages/settings/plan/` 에 `data-source.ts` 가 **없고**, `SCOPE` 상수도 `failIfRequested` 호출부도 **0건**이다(`grep -rn "failIfRequested\|SCOPE" pages/settings/plan/` = 0, 실측 2026-07-22). `shared/crud/dev.ts` 의 두 스위치는 **`failIfRequested` 를 거치는 어댑터에만** 걸리므로 이 화면에는 적용되지 않는다. 값의 출처가 네트워크가 아니라 localStorage 이기 때문이며(`entitlement-store.ts:40-49`), **백엔드가 붙는 날 이 절을 다시 쓴다**(§5 #1).

- **`?delay=` 는 이 리포에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다.
- **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)도 이 화면과 무관하다** — 어댑터를 거치지 않아 그 지연이 걸리지 않는다. 성능 예산으로 읽으면 안 된다(§4.1).

**이 화면의 재현 수단 — DEV 패널과 localStorage**

| 재현 대상 | 방법 |
|---|---|
| 티어별 잠금 배지 · 기능 표 | **DEV 패널 '플랜 등급'**(`PlanDevPanel.tsx:62-80` → `devSetTier`) — `free`/`basic`/`pro`/`enterprise` |
| 청구 상태 배너(EL-001) | **DEV 패널 '청구 상태'**(`:82-100` → `devSetBillingState`) — `active`/`past_due`/`suspended`. **이 배너를 재현하는 유일한 수단이다** |
| 변경 예고 배너(EL-002) · '변경 적용 예정' | **localStorage 직접 편집** — `tds-admin.plan` 의 `effectiveAt` 에 미래 ISO 를 넣는다. DEV 패널은 이 필드를 건드리지 않는다(`entitlement-store.ts:118-121` 이 `effectiveAt` 을 보존한다) |
| **ERP-08(Invalid Date)** | `effectiveAt` 에 **`'내일'` 같은 비-ISO 문자열**을 넣고 진입 → **`'NaN-NaN-NaN'` 이 보이면 재현** |
| **`absent` 갈래** | **화면에서는 재현 불가.** `overrides` 에 `{'marketing.sms': {kind:'switch', enabled:false}}` 를 **손으로 넣어야** 한다(DEV 패널에 그 수단이 없다 — §5 #13). **회귀는 `receivePlan` 으로 그것을 직접 주입한다**(`RequireEntitlement.test.tsx:112-117`) |
| 쿼터 소진(`200/200`) | `overrides` 에 `{'commerce.products': {kind:'quota', limit:1, usage:1}}` 를 넣거나 티어를 `free`(한도 20)로 내리고 상품을 늘린다 |
| **fail-open 방향** | `tds-admin.plan` 을 **깨진 JSON** 으로 바꾸고 진입 → **전 기능 가용으로 떨어지면 pass**(잠기면 방향 위반) |
| 크로스탭 동기화(EL-023) | 두 탭을 열고 한쪽 DEV 패널에서 티어를 바꾼다 → 다른 탭이 즉시 따라오는지 |
| 권한 게이팅(EXC-03) | 권한 스토어에서 `page:/settings/plan` 의 `read` off → `ForbiddenScreen` |
| **EXC-21 계열 분리** | 플랜을 `free` 로 내리고 `/ai/chat` 진입 → **`UpgradeScreen` 이 뜨고 403 문구·참조 코드가 섞이지 않으면 pass.** 그 화면의 '현재 플랜 확인'이 이 화면으로 오는지 |
| TOKEN-01 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px" pages/settings/plan` = **0건** |
| IA-02 | `document.querySelectorAll('h1').length === 1` 이고 문구가 '플랜·이용 현황' |
| A11Y-11 · A11Y-12 (n-a 확인) | `grep -rn "aria-invalid\|aria-required\|aria-current\|aria-pressed" pages/settings/plan` = **0건** |
| FEEDBACK-03 (§5 #6) | DEV 패널에서 '이용 정지'로 바꾼 뒤 상품 등록 → **그대로 등록되면 재현** |

**그 밖의 도구**: `grep`(TOKEN-01 · A11Y-11/12 · IA-02 · 훅 소비처 전수) · **`shared/entitlements/plan.test.ts`(270행 — 3상태 · overrides · 청구 · 쿼터 경계 · 저장값 방어)** · **`shared/entitlements/route-entitlement.test.ts`(99행 — 매핑 불변식 3건 · 경로 판정 5건)** · **`shared/entitlements/RequireEntitlement.test.tsx`(418행 — locked/absent/granted · 판정 순서 · fail-open 4갈래. **EXC-21·EXC-22 의 렌더 근거**)** · **`shared/layout/AppShell.entitlement-nav.test.tsx`(153행 — 사이드바 absent 삭제 · locked 꼬리표)**. ⚠ **`PlanPage` 자신을 렌더하는 테스트는 여전히 0건이다**(§5 #2) — 이 화면의 §2·§3 재현 절차는 아직 사람 손으로만 실행 가능하다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(`파일:줄`)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **P0 gap 은 0건이며, 그 사실이 '이 화면이 안전하다'로 읽히지 않도록 §2.1 에 경고를 남겼다**(실제 결함은 P1·P2 와 §4.3 에 있다)
- [x] 모든 `N/A` 에 사유를 댔다 — **19건의 뿌리가 셋(비동기 없음 · 쓰기 없음 · 목록 아님)임을 §1.2 와 §2.1 에 밝히고, 각 칸에 개별 근거(grep 실측 포함)를 적었다**
- [x] §2.1 산수 검산 — 3 + 9 + 19 + 0 = **31** ✓ (검산 표로도 31행 전수 나열)
- [x] §6 의 `?fail=`/`?status=` 를 **어댑터에서 확인했고, 어댑터가 없어 이 화면에 존재하지 않는다는 사실을 그대로 적었다**(`grep failIfRequested\|SCOPE` = 0건). `?delay=` 를 쓰지 않았고 `LATENCY_MS` 가 이 화면과 무관함도 밝혔다
- [x] §5 의 gap 이 FS-079 §7 · BE-079 §7.9 와 대응한다
- [x] **EXC-21 · EXC-22 를 판정하며 실패 방향을 명시**했다 — 이 화면의 축은 **fail-open**(수렴 경로·주석 원문·회귀 인용)이고, **결제 설정 축과 권한 축은 fail-closed** 이며 그 판정은 NFR-078 이 갖는다는 사실을 §1.2 · §2 · §3 에 못 박았다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 '측정 불가(백엔드 없음)', E2E 미실행 명시. 서버 재검증·거절 응답 계열은 '계약으로만 존재하며 서버가 없다'로 §4.3 에 적었다
