---
id: NFR-015
title: "회사 정보 비기능 명세"
functionalSpec: FS-015
backendSpec: BE-015
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-015. 회사 정보 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-015 회사 정보 (`/company/profile` — 단일 문서 편집 폼) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **요구 문구의 정본은 그 문서다** |
| 이 문서의 역할 | quality-bar 를 **이 화면에 적용한 판정표**다. 요구를 재서술하지 않고 **ID 로만 참조**하며, '이 화면에서 어떻게 충족되는가(코드 근거)' 와 '무엇을 재현하면 판정되는가(측정 기준)' 만 쓴다 |
| 함께 읽는 문서 | FS-015(요소·예외) · BE-015(엔드포인트·보안 판정). §5 의 gap 은 FS-015 §7 · BE-015 §7.7 과 **같은 항목을 가리킨다** |
| 갱신 규칙 | quality-bar 가 개정되면 §2 의 30행을 재판정한다. 이 화면의 코드가 바뀌면 근거의 `파일:라인` 을 갱신한다. **판정을 코드보다 먼저 고치지 않는다** |
| 판정 방식 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 판정 기준일 | **2026-07-17 · HEAD `a5c2639`** 기준 코드 대조. 직전 판정은 `4b805ad` 기준이었고, 이후 PR #22·#24·#26·#28·#30·#32·#34 가 머지됐다. **이번 기준 갱신으로 뒤집힌 판정은 없다.** 특히 **A11Y-11 은 gap 유지** — PR #30 이 DS 의 A11Y-11 층(`ImageUploadField`·`SegmentPicker`·`OAuthProviderCard`)을 손봤으나 **이 화면의 잔여 사유는 그 축이 아니다**: 로고 `ImageUploadField` 에 `required` 를 주지 않으므로(`CompanyProfilePage.tsx:195-204`) 그 수정의 수혜 대상이 아니고, 남은 것은 `profile-biznum` 의 **hint 미연결**(별개 축)이다. 형제 NFR-019·NFR-020·NFR-021 은 같은 PR 로 A11Y-11 이 gap → pass 로 뒤집혔다 — **이 화면이 갈리는 지점**(§2 A11Y-11 참조) — §2 각 행의 근거 라인 참조 |

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
| STATE-01 | STATE | 직접 | `loading = isFetching && data === undefined` (`CompanyProfilePage.tsx:71`) → 첫 조회에만 스켈레톤. `DocumentFormShell.tsx:127-135` 이 `loading` 일 때만 막대 4개를 그린다. 재조회(저장 후 `invalidateQueries`)에서는 `data` 가 있어 입력값이 유지된다. 단일 문서라 empty 상태가 없다(4상태 중 3상태만 실재) | `/company/profile` 진입 → 스켈레톤 1회. 저장 성공 후 배경 재조회 시 입력이 스켈레톤으로 바뀌지 **않음**. `?fail=profile:load` → 에러 배너만(스켈레톤·빈 화면 없음) | pass |
| STATE-02 | STATE | 직접 | 조회 실패 시 `loadFailed={error !== null}`(`CompanyProfilePage.tsx:102`) → `DocumentFormShell.tsx:102-115` 이 `Alert tone="danger"` + '다시 시도'(`refetch`)로 폼 전체를 대체한다. read 실패에 토스트를 쓰지 않는다 | `?fail=profile:load` → 인라인 danger Alert + '다시 시도' 버튼. 토스트 0건. '다시 시도' 클릭 시 쿼리 재발행 | pass |
| STATE-04 | STATE | N/A | **페이지네이션·행 선택 표면이 이 화면에 없다** — 단일 문서 편집 폼이다(FS-015 §1: 목록·`:id` 라우트 없음). clamp 할 page 도, 해제할 `selectedIds` 도 존재하지 않는다 | — | n-a |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 3개가 전부 토큰 참조다: `rowStyle` 의 `calc(var(--tds-space-6) * 6)` · `gap: var(--tds-space-4)`(`CompanyProfilePage.tsx:26-30`), `controlStyle()`(`shared/ui/styles.ts:297-311`)이 border-width/color/radius 를 토큰으로 계산. 하드코딩 hex·px 리터럴·border 키워드 0건 | `apps/admin/src/pages/company/profile/**` grep: `#[0-9a-f]{3,6}` = 0 · `[1-9]px` = 0 · `(outline\|border): (thin\|medium\|thick)` = 0. ESLint `no-restricted-syntax` 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 focus ring 표면: 입력 5종의 `className="tds-ui-input tds-ui-focusable"`(`CompanyProfilePage.tsx:113` 외 4곳)과 저장 버튼(`Button`), 드롭존(`ImageUploadField`). ring 두께·색은 `tds-ui-focusable` 과 DS 가 소유한다 — 이 화면은 클래스를 붙일 뿐이다 | ring 판정은 DS(`ui.css` · `app-shell.css`) 소유 문서에서. 이 화면에서는 입력 5종의 focus ring 이 저장 버튼과 픽셀 동일한지만 확인 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 저장 성공 토스트(`CompanyProfilePage.tsx:86`)의 entrance animation(`Toast.css`). 이 화면은 easing 값을 직접 참조하지 않는다 | 판정은 Toast/tokens codegen 소유 문서에서. 이 화면에서는 저장 성공 토스트의 entrance 가 실제 재생되는지만 확인 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면: 폼 `Card`(`DocumentFormShell.tsx:122`), 저장 성공 토스트, 이탈 가드 `ConfirmDialog` 의 Modal. 셋 다 DS 가 shadow 토큰을 소유한다 | 판정은 Card/Modal/Toast 소유 문서에서. 이 화면에서는 세 표면이 light/dark 양쪽에서 부상하는지만 확인 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 `<h1>` 은 AppHeader 가 그린다(`AppHeader.tsx:101`) — `titleStyle` = `pageTitleStyle`(`shared/ui/styles.ts:51-60`)이 `--tds-typography-title-xl-*` 를 참조한다. 화면 자체는 제목을 그리지 않는다. 카드 제목은 `CardTitle`(DS) | 판정은 tokens/AppHeader 소유 문서에서. 이 화면에서는 헤더 '회사 정보' `<h1>` 이 카드 본문(body-md)보다 가시적으로 큰지만 확인 | 종속 |
| COMP-10 | COMP | N/A | **text-search/filter 입력이 이 화면에 없다.** 입력 5종은 전부 폼 필드이고(검색이 아니다) query 를 발행하지 않는다 — `useDebouncedSearch` 를 import 하지 않는다. IME 조합 중 발행될 query 자체가 존재하지 않는다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | 상속 | 이 화면의 확인 게이트 표면은 **discard intent** 1건이다: 미저장 이탈 가드(`useUnsavedChangesDialog.tsx:212-221`, `intent="discard"`)가 `ConfirmDialog` 를 세운다. 파괴적(삭제) 액션은 이 화면에 없다 — 저장은 비가역이 아니다. busy 처리·실패 배너·abort 계약은 `ConfirmDialog` 가 소유한다 | 판정은 ConfirmDialog 소유 문서에서. 이 화면에서는 dirty 상태로 사이드바 링크 클릭 → discard 다이얼로그가 뜨고 tone/label 이 discard intent 로 해석되는지만 확인 | 종속 |
| FEEDBACK-04 | FEEDBACK | 직접 | `dirty={isDirty}`(`CompanyProfilePage.tsx:105`, RHF `formState.isDirty`) → `DocumentFormShell.tsx:100` 이 `useUnsavedChangesDialog(dirty && !saving, ...)` 로 배선한다. **3경로 전부**: `beforeunload`(`useUnsavedChangesDialog.tsx:120-131`) · capture-phase 링크 가로채기(`:134-155`, `_self`/수식키 edge case 포함) · popstate sentinel(`:157-182`). 저장 성공 시 `reset(values)`(`CompanyProfilePage.tsx:85`)로 `isDirty` 가 풀려 가드가 해제된다 | 회사명 수정(dirty) 후 ① 탭 닫기 → 브라우저 confirm ② 사이드바 'CEO 인사말' 클릭 → discard 다이얼로그 ③ 브라우저 Back → discard 다이얼로그. 저장 성공 후 같은 3경로 → 프롬프트 없이 통과 | pass |
| FEEDBACK-06 | FEEDBACK | N/A | **편집 가능한 폼을 담은 modal 이 이 화면에 없다.** 폼은 라우트 페이지 본문에 있고(rich 엔티티 → 전용 route, IA-06), 이 화면의 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력을 담지 않는다(제목·본문·버튼뿐) — dirty close 를 가드할 입력이 없다. `useModalDirtyGuard` 를 import 하지 않는다 | — | n-a |
| A11Y-01 | A11Y | 상속 | 이 화면의 live region 표면: 저장 성공 토스트(`CompanyProfilePage.tsx:86` `toast.success`). viewport 의 상시 마운트 aria-live 는 `ToastProvider`(앱 전역, `App.tsx:304`)가 소유한다 | 판정은 ToastProvider 소유 문서에서. 이 화면에서는 저장 성공 시 '회사 정보를 저장했습니다.' 가 announce 되는지만 확인 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(message = '회사 정보에 저장하지 않은 변경 사항이 있습니다…', `CompanyProfilePage.tsx:23-24` → `DocumentFormShell.tsx:100`). `aria-describedby` 배선은 Modal/ConfirmDialog 가 소유한다 | 판정은 Modal/ConfirmDialog 소유 문서에서. 이 화면에서는 가드 다이얼로그 open 시 제목과 본문이 **둘 다** 읽히는지만 확인 | 종속 |
| A11Y-11 | A11Y | 직접 | **부분 충족 — 세 절 중 ③이 F3a 에서 닫혔고 ②만 남았다.** ① `aria-invalid` ↔ `aria-describedby` 페어링은 입력 5종 **전부** 성립한다(`CompanyProfilePage.tsx:118-121`·`141-144`·`158-159`·`174-175`·`189-190` — 각기 `aria-invalid={errors.X !== undefined}` + `aria-describedby={errors.X !== undefined ? errorIdOf('...') : undefined}`), `FormField.tsx:110-112` 가 그 id 로 `role="alert"` `<p>` 를 그린다 → **짝 없는 `aria-invalid` 0건.** ③ **required 노출 — 이제 충족한다(F3a).** `FormField` 가 `withAriaRequired()` 로 `required` 를 **런타임 `cloneElement` 로 자식 컨트롤의 `aria-required` 에 주입**한다(`FormField.tsx:50-56`, 주입 지점 `:107`). 주입 대상은 네이티브 `input`/`select`/`textarea` 와 DS `SelectField` 뿐이고(`isRequirableChild` — `:38-41`, 래퍼 `div`/`span` 은 거짓 시맨틱 방지로 제외), **이 화면의 required FormField 5종은 자식이 전부 `<input>`** 이므로 주입된다. `ImageUploadField`(로고)는 `required` 를 주지 않으므로(`:195-204`) 이 절의 대상이 아니다 — **PR #30 이 그 몰리큘의 required 축을 닫았지만**(드롭존 접근성 이름에 `requiredNameSuffix` 로 '(필수)' 를 싣는다 — `ImageUploadField.tsx:55,250`; 형제 NFR-019·NFR-020·NFR-021 이 그 수정으로 A11Y-11 을 pass 로 뒤집었다) **이 화면은 애초에 로고를 필수로 요구하지 않아 수혜 대상이 아니었다.** ② **hint 미연결 — 이것이 유일한 잔여 gap 이고, PR #30 이 다룬 축과 다르다**: `profile-biznum` 은 `hint="예: 123-45-67890"`(`CompanyProfilePage.tsx:132`)를 가지고 `FormField.tsx:113-118` 이 `id="profile-biznum-hint"` 로 그리지만(`hintIdOf` `:59-61`), **valid 일 때 `aria-describedby` 가 `undefined` 라 그 hint 가 AT 에 연결되지 않는다**(`:142-144` — `errors.businessNumber !== undefined` 일 때만 오류 id 를 가리키고, 그 외에는 `undefined`). 같은 계약을 `TextareaField.tsx:67`·`ImageUploadField.tsx:225`(`describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined`)는 지킨다 — **이 화면의 손수 배선 입력만 이탈했다.** **required 축과 달리 이 절에는 자동 주입이 없다** — `FormField` 가 id 만 노출하고 배선을 호출부에 맡기는 계약이 그대로다(`FormField.tsx:10-11`). `FormField` 는 id 만 노출하고 배선은 호출부 책임이라(`FormField.tsx:10-11` 주석) `withAriaRequired` 같은 자동 주입이 이 절에는 없다 | ① `apps/admin/src/pages/company/profile` grep: `aria-describedby` 없는 `aria-invalid` = 0 → 충족. ③ RTL: `getByRole('textbox', { name: /회사명/ })` 의 `aria-required` 조회 → **`"true"`** → 충족(FormField 주입). **⚠ grep 으로 판정하지 말 것** — `grep -rn "aria-required" apps/admin/src` 는 여전히 1건(`members/components/CreateGroupModal.tsx:192`, 수동 override)뿐이다. 주입이 **런타임**이라 소스에 나타나지 않는다. ② `profile-biznum` 에 유효값 입력 → `aria-describedby` 가 `profile-biznum-hint` 를 가리키는지 → **현재 `undefined`** → **미충족(잔여 gap)** | **gap** |
| A11Y-12 | A11Y | N/A | **좌측 필터 list item 이 이 화면에 없다** — 필터·toggle 표면이 없는 단일 폼이다. `aria-pressed`/`aria-current` 를 쓸 요소가 존재하지 않는다(이 화면 grep 결과 둘 다 0건) | — | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 이탈 가드 `ConfirmDialog`(→ Modal organism). enter/exit transition 은 Modal 이 소유한다. **PR #26 이후의 사실 갱신**(판정 주체는 그대로 DS): 오버레이 모션이 **구현됐고 라이브러리가 아니라 CSS-only 다** — backdrop fade(`Modal.css:20-21`→keyframes `:126-134`) + dialog scale(`:58-59`→`tds-modal-dialog-in :146-156`, `scale(0.96)→scale(1)` · exit `:35-38`→`tds-modal-dialog-out :158-168`), reduced-motion 게이트 `:173-180`. **AnimatePresence 는 없으나** 'exit 완료 후 unmount' 는 `onAnimationEnd`(`Modal.tsx:216-218`)가 동등 달성한다. **이 화면이 상속하는 표면의 한계**: 가드 다이얼로그의 Esc/딤/× 닫힘은 애니메이션되고, **ConfirmDialog 의 footer 버튼(취소 `ConfirmDialog.tsx:145`·확인 `:153`) 경로는 즉시 언마운트된다**(`Modal.tsx:27-31`) | 판정은 Modal 소유 문서에서. 이 화면에서는 가드 다이얼로그를 Esc/딤/× 로 닫을 때 backdrop fade + dialog scale 이 보이는지, footer 버튼으로 닫을 때는 즉시 사라지는지만 확인 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: 저장 성공 토스트. exit 애니메이션은 ToastProvider/Toast 가 소유한다. **PR #26 이후의 사실 갱신**(판정 주체는 그대로 DS): **exit 가 완전 구현됐다** — `Toast.css:32-37` `.tds-toast--exiting`(`tds-toast-out … forwards` + `pointer-events:none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. `ToastProvider.tsx:99-100` 의 `filter` 는 최종 제거로 남았으나 `Toast.tsx:186-187` 이 `onAnimationEnd` 로 **그 호출을 퇴장 애니메이션 뒤로 미룬다**. `component.overlay` recipe 로 exit = fast(150ms)/accelerate | 판정은 Toast 소유 문서에서. 이 화면에서는 저장 성공 토스트의 auto-dismiss 가 **아래로 가라앉으며 fade out** 하는지만 확인 | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면 전용 motion 이 0건이다** — 이 화면의 style object 에 `transition`·`animation` 선언이 없다(`CompanyProfilePage.tsx` grep = 0). reduced-motion 게이트가 걸릴 표면은 전부 상속물(Modal·Toast·skeleton pulse)이고 **그 셋 다 게이트를 갖고 있다** — `Modal.css:173-180` · `Toast.css:136-141` · `ui.css:110-114`. ToggleSwitch 는 이 화면에 렌더되지 않으나, DS 전역으로도 그 게이트가 이제 실재한다(`ToggleSwitch.css:79-84`) | 판정은 글로벌 Motion config/DS 소유 문서에서. 이 화면에서는 `prefers-reduced-motion: reduce` 에뮬레이션 시 스켈레톤 pulse·가드 다이얼로그·토스트에 move/scale 이 남지 않는지만 확인 | 종속 |
| IA-01 | IA | 직접 | `{ path: '/company/profile', element: <CompanyProfilePage />, implemented: true }`(`App.tsx:179`)가 AppShell layout route 아래에 있다(`App.tsx:324-342`). 이 화면은 자체 sidebar/header/outer frame 을 렌더하지 않는다 — 최상위가 `DocumentFormShell` 의 `pageStyle`(flex column) 하나다 | `/company/profile` 진입 → 사이드바·AppHeader·단일 padded `<main>` 안에 렌더. `CompanyProfilePage.tsx` grep: `<aside`·`<header`·`<nav` = 0 | pass |
| IA-02 | IA | 직접 | 제목 소스가 **하나**다: AppHeader `<h1>`(`AppHeader.tsx:101`)의 `findNavLabel(pathname)`. `/company/profile` 은 nav 잎과 **정확히 일치**하므로(`nav-config.ts:121` `['회사 정보', '/company/profile']`) `findNavLabel` 의 exact 분기(`nav-config.ts:254-255`)가 '회사 정보' 를 준다 — 가지 라벨('기업 관리')로 폴백하지 않는다. **이 화면에는 sub-route(`/new`·`/:id`·`/:id/edit`)가 존재하지 않아**(`App.tsx` 에 `/company/profile` 1줄뿐) IA-02 가 지적하는 '모호한 branch label' 경로 자체가 생기지 않는다 | `/company/profile` 의 가시 primary title = '회사 정보'(‘기업 관리’ 아님). 카드 제목(`CardTitle`)도 '회사 정보' 로 일치 | pass |
| IA-04 | IA | N/A | **list 화면이 아니다** — toolbar·결과 count 요약·SelectionBar·table·Pagination 중 **어느 표면도 없다**(단일 문서 편집 폼). list 템플릿을 적용할 대상이 없다 | — | n-a |
| IA-05 | IA | N/A | **create·edit 라우트 쌍이 없다.** 회사당 문서 1건이라 식별자가 없고 `/company/profile` 단일 라우트다(`App.tsx:179`) — 구분할 `:id` 도, 나눌 등록/수정 title 도 존재하지 않는다. `useCrudForm`(`:id` 유무로 갈리는 폼 컨트롤러)을 쓰지 않는 이유이기도 하다 | — | n-a |
| IA-13 | IA | N/A | **list query state 가 없다** — page·page-size·filter·keyword·sort 중 **하나도 존재하지 않는다**(단일 문서 폼). URL 에 직렬화할 view state 가 없고 `useListState` 를 import 하지 않는다. 이 화면은 경로 그 자체가 완전한 view 다(`/company/profile` 를 복사하면 같은 화면이 재현된다) | — | n-a |
| EXC-01 | EXC | 상속 | 이 화면은 **이중 경계 안**에 있다: ① `AppShell.tsx:484-493` 의 `<Outlet>` 바깥 경계(`resetKey={pathname}` → 다른 메뉴로 이동하면 자동 복구, 사이드바·헤더 생존) ② `App.tsx:311-315` 의 루트 경계(셸 자체가 던질 때). 이 화면은 자체 경계를 두지 않고 상속만 한다 | 판정은 ErrorBoundary/AppShell 소유 문서에서. 이 화면에서는 `CompanyProfilePage` 강제 throw 시 사이드바가 남고 다른 메뉴로 이동 가능한지만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 두 층이 이 화면을 덮는다: ① route guard — `RequireAuth` 가 AppShell **바깥**이라(`App.tsx:324-330`) 세션 없이 `/company/profile` deep-link 시 셸도 그리지 않고 `/login?returnUrl=/company/profile` 로 보낸다(`RequireAuth.tsx:66-68`) ② 401 인터셉터 — `queryClient` 의 `QueryCache`/`MutationCache` `onError`(`queryClient.ts:42-43` → `handleQueryLayerError`)가 **이 화면의 조회·저장 둘 다**를 덮는다(둘 다 그 client 를 쓴다). `notifySessionExpired()` → `SessionExpiryWatcher`(`RequireAuth.tsx:36-54`)가 `clearSession()` 후 `returnUrl` + `reason=session_expired` 로 이동 | 판정은 RequireAuth/queryClient 소유 문서에서. 이 화면에서는 `?status=profile:load:401`(→ 조회 401)과 `?status=save:401`(→ 저장 401) 각각이 `/login?returnUrl=%2Fcompany%2Fprofile&reason=session_expired` 로 보내는지만 확인 | 종속 |
| EXC-03 | EXC | 직접 | **부분 충족.** ① read 게이팅은 **상속으로 성립한다**: `RequirePermission`(`AppShell.tsx:490`)이 `<Outlet>` 을 감싸 `useRouteCan('read')` 로 판정하고(`RequirePermission.tsx:61-64`), `resourceIdForPath('/company/profile')` 가 nav 잎과 정확히 일치해 `page:/company/profile` 리소스를 준다(`route-resource.ts:36-46`) → read 없으면 `ForbiddenScreen`. ② **write 게이팅이 없다**: 이 화면은 `useRouteWritePermissions()`/`useRouteCan()` 을 **호출하지 않는다**(`pages/company` 전체 grep = 0건). 저장 버튼(`DocumentFormShell.tsx:145-152`)의 `disabled` 는 `!dirty \|\| saving \|\| loading` 뿐이라 **`update` 권한이 없는 역할에게도 그대로 보이고 눌린다.** ③ 그 결과 **강등 reconcile 도 성립하지 않는다** — `useRouteCan` 을 구독하지 않으므로 권한이 꺼져도 버튼이 사라지지 않고, 서버 403 은 '저장하지 못했습니다' 한 문구로 뭉개진다(FS-015-EL-004) | ① `page:/company/profile` 의 read 를 끈 역할로 deep-link → 403 화면 → 충족. ② **`update` 를 끈 역할로 진입 → 저장 버튼이 여전히 렌더되고 클릭 시 요청이 발사됨** → 미충족(quality-bar acceptanceCheck 'delete 없는 role이 버튼을 못 봄'). ③ 진입 후 `update` 강등 → 버튼 불변 → 미충족 | **gap** |
| EXC-04 | EXC | 직접 | **미충족.** 저장은 `useSaveDocument`(`shared/crud/document.ts:53-64`)를 **직접** 호출한다(`CompanyProfilePage.tsx:47,80`) — `mutationFn: ({ input, signal }) => store.save(input, signal)` 에 **`If-Match`·ETag·`updatedAt`·`version` 이 없다.** 애초에 `CompanyProfile` 타입(`types.ts:4-15`)에 동시성 토큰 필드가 **없고** `save(input, signal?)` 시그니처에 실을 자리도 없다. F2 가 `useCrudForm` 에 넣은 409/412 충돌 다이얼로그(`useCrudForm.ts:166-179` `isConflict` → `setConflict`)는 **이 화면에 적용되지 않는다** — 이 화면은 `useCrudForm` 을 우회한다. 서버가 409 를 줘도 `onError`(`CompanyProfilePage.tsx:88-91`)가 `isAbort` 만 거르고 나머지를 전부 '저장하지 못했습니다…' 로 뭉갠다 → 재제출하면 그대로 덮어쓴다(마지막 쓰기 승리) | `?status=save:409` → **conflict dialog 없이 generic 배너**가 뜨고 입력은 남지만 '최신 reload / overwrite' 선택지가 없음 → 미충족. `CompanyProfilePage.tsx`·`document.ts` grep: `If-Match`·`isConflict`·`ConflictState` = 0건 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** ① **동기 제출 잠금 없음**: `onValid`(`CompanyProfilePage.tsx:75-94`)에 `submitLockRef` 가드가 없다. 방어는 `DocumentFormShell.tsx:149` 의 `disabled={!dirty \|\| saving \|\| loading}` 뿐인데, quality-bar 가 명시하듯 RHF 는 **비동기 검증을 먼저 돌리므로** 첫 Enter 후 `saving` 이 true 로 렌더되기까지 틈이 있다 — 그 사이 두 번째 Enter 가 두 번째 요청을 만든다. F2 가 `useCrudForm.ts:103`(`submitLockRef`)와 `LoginPage` 에 넣은 잠금이 **이 화면(문서 계층)에는 없다.** ② **멱등키 없음**: `useCrudForm.ts:118-123`(`idempotencyKeyRef` + `takeIdempotencyKey`)에 대응하는 것이 `document.ts` 에 전혀 없다 — `Idempotency-Key` 로 나갈 값이 생성되지 않는다. ③ `controllerRef`(`CompanyProfilePage.tsx:63,77-78`)는 **직전 요청을 abort 하지 않고 덮어쓰기만 한다** — 첫 요청이 그대로 살아 있다 | 저장 버튼 더블클릭 / 응답 전 Enter 연타 → **2개 요청 발사**(1개여야 함) → 미충족. `CompanyProfilePage.tsx`·`document.ts` grep: `submitLockRef`·`Idempotency` = 0건 | **gap** |
| EXC-09 | EXC | 직접 | 저장 `onError` 가 `isAbort(cause)` 로 **가장 먼저** 걸러 early return 한다(`CompanyProfilePage.tsx:88-91`) — abort 시 에러 배너도 토스트도 없다. 공유 predicate 사용(`shared/async.isAbort`, `CompanyProfilePage.tsx:9`). abort 원인은 언마운트 cleanup 1개뿐(`:64` `useEffect(() => () => controllerRef.current?.abort(), [])`). `isPending` 은 mutation settle 로 자동 해제된다. bulk 작업이 없어 실패 count 제외 조항은 이 화면에 해당하지 않는다 | 저장 진행 중(400ms 지연 창) 다른 메뉴로 이동 → 언마운트 abort → 토스트·배너 0건. `?fail=profile:save` 는 abort 가 아니므로 정상적으로 배너 표시(두 경로가 갈리는지 확인) | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **7** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-04 · IA-01 · IA-02 · EXC-09 |
| 종속(상속) | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| **gap** | **4** | **A11Y-11 · EXC-03 · EXC-04 · EXC-08** |
| 합계 검산 | **7 + 12 + 7 + 4 = 30** ✓ | (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30) |

> **P0 gap 4건 = quality-bar '배치 실패' 사유**(§How to use: 'P0 하나라도 미충족이면 배치는 acceptance 실패'). 4건 중 3건(EXC-03·EXC-04·EXC-08)은 **같은 뿌리**다 — 이 화면이 `useCrudForm` 을 우회하고 `useSaveDocument` 를 직접 쓰기 때문에, F2 가 폼 계층에 넣은 방어가 문서 계층에 상속되지 않았다. §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 저장 성공 후 `invalidateQueries(['company','profile'])`(`document.ts:61`)가 배경 재조회를 일으키지만, `loading` 이 `data === undefined` 를 요구하므로 입력값이 유지된다. `staleTime: 30_000`(`queryClient.ts:24`)이 재조회 시점을 지배 | 저장 후 폼이 스켈레톤으로 바뀌지 않음. 30초 내 재진입 시 네트워크 재조회 없음 | pass |
| STATE-06 | P1 | 저장 성공 시 이 문서 키만 무효화한다(`document.ts:60-62`). 이 화면은 다른 화면의 캐시를 stale 하게 만들지 않는다(회사 정보를 읽는 다른 admin 화면이 없다) | 저장 후 `['company','profile']` 만 재조회 | pass |
| COMP-01 | P1 | 저장 버튼은 DS `Button`(`DocumentFormShell.tsx:145`)이지만 **진행 상태를 `loading` prop 이 아니라 손수 쓴 문구('저장 중…', `:151`)로** 표현한다 — quality-bar 가 명시적으로 금지한 패턴 | `DocumentFormShell.tsx` grep: `'저장 중…'` 문자열 존재 → `loading` prop 미사용 | gap |
| COMP-04 | P1 | required 입력 5종이 전부 `FormField(required)` 로 `*` 마커를 렌더한다(`FormField.tsx:96-100`). zod 스키마의 required 와 일치한다(`validation.ts:16-25`) | 라벨 5개 옆에 인접 `*` 존재 | pass |
| COMP-12 | P2 | 길이 제한 입력 4종(회사명 100 · 대표자명 50 · 연락처 40 · 주소 200)에 **실시간 카운터가 없다.** `maxLength` 가 조용히 입력을 멈춘다 — quality-bar 가 지적한 '고장처럼 보임'. `FormField` 는 `counter` prop 을 지원하나(`FormField.tsx:104`) 이 화면은 넘기지 않는다 | 회사명에 100자 입력 → 카운터·경고 없이 입력이 멈춤 | gap |
| A11Y-10 | P2 | 이 화면의 인라인 error 는 `FormField` 가 그리므로 `role="alert"` 를 이미 갖는다(`FormField.tsx:110-112`) — TextField primitive 를 쓰지 않아 그 불일치에 해당하지 않는다 | 오류 `<p>` 5개가 `role="alert"` | pass |
| A11Y-13 | P1 | ① **폼 진입 시 첫 필드 자동 포커스 없음** — `setFocus` 호출이 없다. ② submit 검증 실패 시 첫 invalid 필드 포커스는 RHF 의 `shouldFocusError` 기본값으로 **동작하지만**, `useCrudForm.ts:246-248` 처럼 `onInvalid` 를 명시해 계약으로 고정하지 않았다(`handleSubmit(onValid)` 만 — `CompanyProfilePage.tsx:107`) | 빈 폼 제출 → activeElement = 회사명 입력(기본값 동작). 진입 시 → activeElement = `<main>`(첫 필드 아님) | gap |
| A11Y-14 | P2 | `ImageUploadField` 의 '업로드 완료' 안내가 `<span>`(`ImageUploadField.tsx:262-267`) — live region 아님. 로드 실패 문구도 announce 되지 않는다 | 로고 업로드 성공 → 스크린리더 무음 | gap |
| EXC-05 | P1 | 조회·저장 어디에도 client timeout 이 없다(`AbortSignal.timeout` grep = 0). `wait(LATENCY_MS, signal)`(`document.ts:26,31`)는 상한이 아니라 픽스처 지연이다 — 실 백엔드가 응답하지 않으면 '저장 중…' 이 무한 지속된다 | never-resolving 응답 → spinner 무한 | gap |
| EXC-06 | P1 | 에러 타입은 status 를 지닌다(`HttpError` — `http-error.ts:45-61`, `dev.ts:84` 가 `?status=` 로 이를 던진다). **그러나 이 화면이 status 로 분기하지 않는다** — `onError`(`CompanyProfilePage.tsx:88-91`)가 `isAbort` 외 전부를 한 문구로 뭉갠다. 400/403/409/422/429/500 이 구분되지 않는다 | `?status=save:403` / `save:409` / `save:422` / `save:500` → **네 경우 모두 동일 배너** | gap |
| EXC-07 | P1 | 422 `error.fields` → RHF `setError` 매핑이 없다(`isUnprocessable`/`setError` grep = 0). `useCrudForm.ts:182-192` 에는 있다 | `?status=save:422` → 필드 인라인 에러 없이 form-level 배너만 | gap |
| EXC-11 | P1 | offline 감지가 없다(`navigator.onLine` grep = 앱 전역 0건) | offline 토글 → 배너 없음, 저장 버튼 경고 없음 | gap |
| EXC-12 | P1 | `loadFailed={error !== null}`(`CompanyProfilePage.tsx:102`)가 **404 와 5xx 를 뭉갠다** — quality-bar 가 `DocumentFormShell` 을 이 요구의 appliesTo 로 **명시**한다. 단일 문서라 404 는 '문서 미생성' 을 뜻할 수 있는데(BE-015 §7.3) 그 표면이 없다. `useCrudForm.ts:144-149`(`LoadFailure = 'not-found' \| 'error'`)에는 있다 | `?status=profile:load:404` → '내용을 불러오지 못했습니다.' + '다시 시도'(재시도해도 영원히 404) | gap |
| EXC-15 | P1 | ① 업로드 전 client 검증은 **있다**(`imageFileError` — `ImageUploadField.tsx:37-43`: `image/*` + 5MB). ② **progress/cancel 경로가 없다** — 업로드 요청 자체가 없다(FS-015-EL-011.7). ③ 로드 실패 fallback 이 `role="img"` placeholder 가 아니라 `aria-hidden` 글리프(`ImageUploadField.tsx:108-109`). ④ src 변경 시 failed flag 리셋은 **있다**(`:134-136`) | 비이미지/6MB 파일 선택 → 인라인 거절 O. 로드 실패 → `role=img` 없음 X | gap |
| EXC-19 | P1 | dirty 폼 상태에서 401 → `SessionExpiryWatcher` 가 **programmatic navigate** 하므로 FEEDBACK-04 가드가 발화하지 않고(quality-bar 가 지적한 바로 그 경로) 입력이 사라진다. draft snapshot 없음 | dirty 상태에서 `?status=save:401` → 재로그인 후 입력 소실 | gap |
| EXC-20 | P1 | 5xx 에서 **참조 코드를 표시하지 않는다.** `HttpError.reference`(`http-error.ts:47,59`)와 `referenceOf()`(`:115-117`)가 존재하고 `useCrudForm.ts:195` 는 쓰지만, 이 화면은 쓰지 않는다 — 운영자가 신고할 코드가 없다. raw stack 노출은 없다(고정 문구뿐) | `?status=save:500` → 배너에 `TDS-…` 참조 코드 없음 | gap |
| ERP-14 | P1 | 사업자등록번호·연락처에 masking/실시간 포맷/paste normalize 가 없다. `123-45-67890` 를 **손으로 하이픈까지** 입력해야 하고, `1234567890` 붙여넣기는 정규화 없이 형식 오류로 거절된다(BE-015 §7.3) | `1234567890` 붙여넣기 → 자동 하이픈 없음 → 제출 시 형식 오류 | gap |
| ERP-06 | P1 | 사용자 대상 문구가 존댓말 톤으로 일관된다('저장했습니다' · '불러오지 못했습니다' · '입력하세요'). 날짜·숫자 포맷 표면이 이 화면에 없다 | 문구 6종이 템플릿과 일치 | pass |
| ERP-13 | P1 | **통합에서 뒤집혔다(gap → pass).** 조사 헬퍼가 **`shared/format.ts:269+` 로 승격**됐다 — 이전엔 사본이 셋이었고(`logs/josa.ts` · `notifications/_shared/notification.ts` · `@tds/ui` 의 `Empty`) 앱 shared 에는 없었다. 지금 `requiredText` 가 그 헬퍼로 조사를 조립한다 — `shared/crud/validation.ts:17`(`${label}${objectParticle(label)} 입력하세요.`) · `:21,24`(`${label}${topicParticle(label)} …자를 넘을 수 없습니다.`). 받침 판정은 한글 음절의 종성 코드로 한다(`format.ts:281-295`), 한글이 아니면 관용대로 받침 없음('API를'). 이 화면의 문구가 전부 옳게 갈린다 — '회사명'(받침 없음) → **'회사명을 입력하세요.'** · '사업자등록번호'(받침 없음) → **'사업자등록번호를 입력하세요.'** · '대표자명'(받침 없음) → **'대표자명을 입력하세요.'**. **회귀 방어선도 함께 뒤집혔다** — `profile.test.ts:34` 가 이제 `'회사명을 입력하세요.'` 를, `:47-49` 가 `'사업자등록번호를 입력하세요.'` 를 단언한다(직전 문서가 '결함을 테스트로 고정한다' 고 적은 그 자리다) | **`grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → 0건**(사용자 대상 리터럴). 앱 전역 grep 히트 12건이 남지만 전부 ① 주석 ② '이 리터럴을 내지 않는다'를 단언하는 테스트 ③ 헬퍼 자신의 설명문이다 | pass |
| IA-08 | P1 | 카드 **안** footer 에 저장 버튼이 우측(`DocumentFormShell.tsx:137-153`, `justifyContent: 'flex-end'`). **취소 버튼이 없다**(단일 문서라 되돌아갈 목록이 없다) — 'primary save 우측' 은 지키나 secondary 취소 슬롯이 비어 형제 폼(FormPageShell)과 구성이 다르다 | 저장 버튼이 카드 내 우하단. 취소 없음 | 부분(문서화) |
| IA-14 | P1 | 2열 행이 `repeat(auto-fit, minmax(calc(var(--tds-space-6)*6), 1fr))`(`CompanyProfilePage.tsx:27-28`)로 좁은 폭에서 1열로 collapse 한다. 그러나 AppShell 사이드바 collapse·touch-target 은 앱 전역 미해결 | 375px → 사업자등록번호/대표자명이 세로로 쌓임 O. 사이드바는 여전히 고정 X | 부분(전역 gap) |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 조회 응답 p95 | ≤ 300ms | **측정 불가**(백엔드 없음) | 단일 문서 6필드 — 조인·집계가 없다. BE-015 §2 의 서버 상한 5초(504)는 **실패 임계이지 예산이 아니다** |
| 저장 응답 p95 | ≤ 500ms | **측정 불가** | 전체 치환 1건 + 서버 정제(BE-015 §7.1) |
| 첫 렌더(스켈레톤 등장) | ≤ 100ms | 라우트 진입 즉시 | `loading` 이 첫 렌더에서 true(`data === undefined`) |
| 진입 시 재조회 횟수 | **1회** | 1회 | `staleTime: 30_000` · `refetchOnWindowFocus: false`(`queryClient.ts:24,67`) — 탭 복귀로 재조회하지 않는다 |
| 저장 후 재조회 횟수 | **1회** | 1회 | `invalidateQueries(key)`(`document.ts:61`) — 이 키만 |
| 저장 요청 수(1회 제출당) | **1** | **1 또는 2** | **P0 EXC-08 gap** — 동기 잠금이 없어 빠른 재입력이 2개를 만든다(§2) |
| 메모리 | object URL 누수 0 | 누수 없음 | `ImageUploadField` 가 교체·제거·언마운트에서 `revokeObjectURL`(`:140,147`). **단 저장된 `blob:` 문자열은 서버에 남는다** — 메모리가 아니라 데이터 오염(FS-015 §7 #1) |
| 번들 | 화면 전용 코드 최소 | 화면 파일 1개(7.5KB) + 공유 모듈 | 이 화면은 chart·editor 등 무거운 의존을 갖지 않는다 |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이다 — 성능 예산이 아니다.** 픽스처가 로딩 상태를 화면에서 볼 수 있게 넣은 인위적 대기이며, 실제 응답 시간과 무관하다. 백엔드 연결 시 이 상수는 사라진다. 위 예산을 이 값으로 검증해서는 안 된다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패(5xx) | 인라인 배너 + 재시도 | **충족**(FS-015-EL-015). `retry: false`(`queryClient.ts:59`)라 자동 재시도 없이 즉시 배너 — 복구는 사용자가 쥔다 |
| 조회 실패(404 · 문서 미생성) | '아직 만들어지지 않음' 을 구분 | **미충족** — 5xx 와 같은 문구(P1 EXC-12). BE-015 §7.3 은 서버가 빈 문서를 200 으로 주어 이 상태를 없앨 것을 권한다 |
| 저장 실패(5xx) | 배너 + 입력 보존 + 참조 코드 | **부분** — 배너·입력 보존은 O, 참조 코드 X(P1 EXC-20) |
| 저장 중 화면 이탈 | abort · 유령 실패 없음 | **충족**(FS-015-EL-017 · P0 EXC-09) |
| 저장 중 사용자 취소 | 취소 수단 제공 | **미충족** — 취소 버튼이 없다. abort 는 언마운트로만 발생 |
| 동시 편집(다른 관리자) | 충돌 감지 후 선택지 제시 | **미충족** — 마지막 쓰기 승리(P0 EXC-04 · BE-015 §7.4). 타입에 토큰 필드가 없어 화면 수정만으로는 해결 불가 |
| 세션 만료 | 재인증 후 원래 경로 복귀 | **충족**(P0 EXC-02). 단 **입력 내용은 소실**(P1 EXC-19) |
| 렌더 예외 | 셸 생존 + 복구 UI | **충족**(P0 EXC-01, `resetKey={pathname}` 자동 복구) |
| 네트워크 단절 | offline 배너 + write 게이트 | **미충족**(P1 EXC-11 — 앱 전역) |
| 응답 없음(무한 대기) | client timeout 후 재시도 안내 | **미충족**(P1 EXC-05 — 앱 전역) |
| **저장 성공 후 로고 손실** | 저장한 로고가 다시 보인다 | **미충족 — 이 화면 고유의 최대 결함.** `blob:` URL 이 저장되어 새로고침 시 깨진다(FS-015-EL-011.7 · BE-015 §7.2·§7.6). **실패가 저장 시점이 아니라 다음 세션에 나타나 원인 추적이 어렵다** |

### 4.3 데이터 보존 · 감사

| 항목 | 요구 | 현재 상태 |
|---|---|---|
| 변경 이력 | 누가·언제·무엇을 바꿨는가 | **없다.** `CompanyProfile` 에 `updatedAt`·`updatedBy` 가 없고(BE-015 §3) 버전 이력 화면도 없다(약관/개인정보의 `VersionHistoryTable` 과 대조적). **회사 정보는 사업자등록번호·대표자명 등 법적 표시 사항을 담으므로 변경 추적이 필요하다** — BE-015 §7.4 가 서버 감사 로그를 요구한다 |
| 덮어쓰기 추적 | 마지막 쓰기 승리의 사후 추적 | 감사 로그가 유일한 수단(BE-015 §7.4 이관) |
| 초안 보존 | 세션 만료·사고 시 입력 보존 | **없다**(P1 EXC-19) |
| 픽스처 휘발성 | — | 현재 `save` 는 모듈 변수를 덮으므로(`document.ts:33`) **새로고침하면 seed 로 돌아간다.** 백엔드 연결 전까지의 성질이며 예산·요구가 아니다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **A11Y-11** | **P0** | **잔여 범위가 좁아졌다 — 세 절 중 둘이 닫혔다.** required 노출은 F3a 가 닫았고(`FormField.withAriaRequired` 가 `required` 를 자식 `<input>` 의 `aria-required` 로 런타임 주입 — `FormField.tsx:50-56,107`), `aria-invalid`↔`aria-describedby` 페어링은 원래 충족이었다. **남은 것은 hint 미연결 하나** — `profile-biznum` 이 hint 를 갖고도 valid 일 때 `aria-describedby` 가 `undefined` 라 그 hint 가 AT 에 닿지 않는다(`CompanyProfilePage.tsx:142-144`). `required` 와 달리 이 절에는 자동 주입이 없고 배선이 호출부 책임이다(`FormField.tsx:10-11`). **형제 NFR-018(오시는 길)이 같은 결함을 4필드에서 갖는다** — 함께 고칠 것 | 이 화면(+ 손수 배선 폼 전반 — NFR-017·NFR-018) | A11 change_request |
| 2 | **EXC-03** | **P0** | 쓰기 권한 게이팅 없음 — 저장 버튼이 `can('update')` 를 보지 않는다. **⚠ 범위 정정(F3b 이후)**: `useRouteWritePermissions` 소비자는 이제 **7곳**이다(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`) — **`pages/company/**` 만 그 목록에 없다**(`grep -rn "useRouteWritePermissions\|useRouteCan" pages/company/` → **0건**). '앱 전역 미구현'이 아니라 **이 섹션의 미적용**이며 배선 선례가 이미 앱 안에 있다(`settings/site/SiteSettingsPage`) | **기업 관리 섹션 전체**(앱 전역 아님) | A11 change_request |
| 3 | **EXC-04** | **P0** | 낙관적 동시성 없음 — 타입에 `updatedAt`/`version` 이 없어 `If-Match` 를 실을 수 없다. 409 충돌 다이얼로그도 없다. **타입·어댑터 시그니처·`useSaveDocument` 를 함께 바꿔야 한다** | 앱 전역(단일 문서형 4종 공통) | A63(BE-015 §7.4) · A11 |
| 4 | **EXC-08** | **P0** | 중복 제출 방어 없음 — `submitLockRef`·멱등키가 `useSaveDocument` 계층에 없다. F2 가 `useCrudForm` 에 넣은 방어가 **문서 계층에 상속되지 않았다** | 앱 전역(단일 문서형 4종 공통) | A11 change_request · A63 |
| 5 | EXC-06 · EXC-07 · EXC-20 | P1 | 저장 실패의 갈래 없음 — status 분기·422 필드 매핑·참조 코드 표시 셋 다 없다. `useCrudForm` 에는 셋 다 있다 | 앱 전역(단일 문서형 4종) | A11 change_request |
| 6 | EXC-12 | P1 | 404/5xx 미구분(`loadFailed = error !== null`) — quality-bar 가 `DocumentFormShell` 을 appliesTo 로 명시 | 앱 전역(DocumentFormShell) | A11 change_request |
| 7 | EXC-15 | P1 | **로고가 저장되지 않는다** — `blob:` URL 이 서버로 나간다. progress/cancel 없음, `role=img` fallback 없음 | 이 화면(+ CEO 인사말 등 업로드 화면) | A63(BE-015 §7.6) · A11 |
| 8 | EXC-05 · EXC-11 · EXC-19 | P1 | client timeout · offline 감지 · dirty draft 보존 없음 | 앱 전역 | A40 · A11 |
| 9 | ~~ERP-13~~ | P1 | **해소됨(통합) — 이관 취소.** 조사 헬퍼가 `shared/format.ts:269+` 로 승격돼 `requiredText`(`shared/crud/validation.ts:17,21,24`) · `useCrudForm.ts:222` · `useCrudList.tsx:108,158` 이 전부 그것을 소비한다. `grep -rn "을(를)\|이(가)\|은(는)" pages/company/` → **0건**. 회귀 방어선인 테스트 단언도 함께 뒤집혔다 — `profile.test.ts:34` 이 이제 `'회사명을 입력하세요.'` 를 단언한다 | — | **이관 취소** |
| 10 | ERP-14 | P1 | 사업자등록번호·연락처 masking/paste normalize 없음 | 이 화면(+ AccountFormPage) | A11 change_request |
| 11 | A11Y-13 | P1 | 폼 진입 시 첫 필드 포커스 없음. `onInvalid` 포커스 계약 미고정 | 이 화면 | A11 change_request |
| 12 | COMP-01 | P1 | 저장 버튼이 `loading` prop 대신 손수 쓴 '저장 중…' | 앱 전역(DocumentFormShell) | A11 change_request |
| 13 | COMP-12 · A11Y-14 | P2 | 글자수 카운터 없음(`FormField.counter` 미사용) · 업로드 완료 announce 없음 | 이 화면 · DS | A11 (후속) |

> **§5 ↔ FS-015 §7 ↔ BE-015 §7.7 대조**: #1→(신규, FS 미기재) · #2→FS §7 #3 · #3→FS §7 #2·BE §7.7 #4 · #4→FS §7 #2·BE §7.7 #3 · #5→FS §7 #4·BE §7.7 #2 · #6→FS §7 #5 · #7→FS §7 #1·BE §7.7 #5 · #8→FS §7 #7 · #10→FS §7 #6·BE §7.7 #7.

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 **재현**하기 위한 것이며, 이 문서가 그 실행 결과를 주장하지 않는다.

이 화면의 어댑터는 `createDocumentStore('profile', PROFILE_SEED)`(`data-source.ts:22`) — **scope = `profile`**, **op = `load` · `save` 2개뿐**(`document.ts:27,32`).

| 스위치 | 효과 | 근거 |
|---|---|---|
| `?fail=load` | 조회를 generic Error 로 실패 → FS-015-EL-015 | `dev.ts:87-92` |
| `?fail=save` | 저장을 generic Error 로 실패 → FS-015-EL-004 | 동일 |
| `?fail=profile:load` · `?fail=profile:save` | scope 를 지정해 이 화면만 실패시킨다(`<scope>:<op>`) | `dev.ts:90` |
| `?fail=all` | 두 op 모두 실패 | `dev.ts:90` |
| `?status=load:<code>` · `?status=save:<code>` | 지정 HTTP status 의 `HttpError` 를 던진다. **재현 가능 code: 400·401·403·404·409·412·422·429·500**(`dev.ts:27-37`) | `dev.ts:57-71,81-85` |
| `?status=all:<code>` | 두 op 모두 그 status 로 | `dev.ts:64` |

**주의 — 쓰면 안 되는 것 / 동작하지 않는 것**

| 항목 | 사실 |
|---|---|
| `?delay=` | **`shared/crud/dev.ts` 에 존재하지 않는다.** 이 화면에서 쓸 수 없다(`pages/dashboard/api.ts`·`pages/members/data-source.ts` 에만 있다). 따라서 STATE-01 의 quality-bar acceptanceCheck 중 `?delay=3000` 절은 **이 화면에서 재현 불가**이며, 대신 `LATENCY_MS=400` 창과 `?fail=profile:load` 로 판정했다 |
| `?status=profile:save:409` | **파싱되지 않는다.** `dev.ts:62` 이 `entry.split(':')` 결과를 `[target, code]` 2개로만 구조분해하므로 3세그먼트 입력은 `target='profile'`·`code='save'` 가 되어 `Number.parseInt('save')` → NaN 으로 무시된다. `dev.ts:64` 의 `target !== \`${scope}:${op}\`` 비교는 **`?status=` 경로에서 도달 불가능한 죽은 분기**다. scope 지정 status 가 필요하면 `?status=save:409` 처럼 op 만 쓴다(이 화면의 op 는 앱 내에서 유일하지 않으므로 다른 문서형 화면도 함께 실패한다) |

**단위 검증**: `profile.test.ts`(7건)는 zod 스키마만 검증한다 — 렌더·a11y·중복 제출·권한을 다루지 않는다. §2 의 gap 4건(A11Y-11·EXC-03·EXC-04·EXC-08) 중 **어느 것도 현재 테스트가 잡지 못한다.** **`:34`('을(를)' 문구가 결함이라던 단언)는 통합에서 해소됐다** — 지금 그 줄은 `'회사명을 입력하세요.'` 라는 **옳은 문구**를 고정한다. `:71-75`(`blob:` 통과)는 **결함이 아니라 알려진 빚을 명시적으로 고정한 것**이다 — 테스트 이름이 `'업로드 이음매가 없어 blob: 이 통과한다 — TODO(backend): POST /api/uploads 후 거절로 바뀐다'` 이고 `:62-70` 주석이 그 판정의 근거를 담는다(§4.2).

## 7. 자기 점검

- [x] P0 30건을 quality-bar 의 지정 순서대로 전수 판정했다 — 빈칸 0건
- [x] §2.1 합계 검산 = 7 + 12 + 7 + 4 = **30** ✓ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6)
- [x] 모든 `n-a`(7건)에 '이 화면에 그 표면이 없다' 는 사유를 적었다
- [x] 모든 `pass`(7건)에 `파일:라인` 코드 근거를 적었다
- [x] 모든 `gap`(4건)에 재현 가능한 측정 기준을 적었고 §5 로 이관했다
- [x] 모든 `종속`(12건)에 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박았다 — 표면이 없는 요구는 `상속` 이 아니라 `n-a` 로 분류했다
- [x] quality-bar 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] `?fail=` scope 를 `createDocumentStore('profile', …)` 호출에서 확인했다. **`?delay=` 를 쓰지 않았다**(존재하지 않음을 §6 에 명시)
- [x] `LATENCY_MS = 400` 이 개발용 지연이며 성능 예산이 아님을 §4.1 에 명시했다
- [x] E2E 를 실행하지 않았고, 판정 근거가 코드 대조임을 §6 에 명시했다
- [x] §5 의 gap 이 FS-015 §7 · BE-015 §7.7 과 일치함을 대조표로 확인했다
