---
id: NFR-042
title: "상품 카테고리 비기능 명세"
functionalSpec: FS-042
backendSpec: BE-042
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-042. 상품 카테고리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-042 상품 카테고리 (`/products/categories`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-042(요소·예외) · BE-042(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-042 §7 · BE-042 §7.11 과 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **1건 — FEEDBACK-06 `pass` → `gap`(악화).** 이 화면 코드는 **0줄 바뀌지 않았다** — PR #26 이 DS `Modal` 에 exit 애니메이션을 넣으며 만든 **일방향 latch** 가 이 화면의 폼 모달에서 발현된다(§2 · §5 #19). MOTION-01/02/03 은 **근거**가 바뀌었으나(오버레이 모션 구현 · ToggleSwitch 게이트 신설) 소유가 DS 라 판정은 `종속` 그대로다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **공용 프레임워크를 소비해 충족하는 경우도 '직접'이다** — 그것을 쓸지 말지가 이 화면의 결정이기 때문이다(이 화면은 프레임워크의 **절반만** 쓴다 — §1.2) |
| 적용 `상속` | AppShell·DS(`@tds/ui`)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**짧은 taxonomy 목록 + 모달 폼**이다. IA-06 의 무게 규칙('짧은 taxonomy 엔티티는 inline-list + Modal')을 정확히 따른다 — 필드가 이름 하나뿐이라 전용 폼 라우트를 만들지 않았다. 좌측 사용 여부 필터(URL 소유) + `<ul>` 행 목록 + 등록/수정 모달 + 삭제 다이얼로그로 구성된다. **검색·페이지네이션·행 선택·일괄 작업이 없다.**

**공용 프레임워크를 절반만 쓴다 — 그것이 이 화면 판정의 축이다.** 쓰는 것: `useListState`(URL) · `createStoreAdapter`(404·409·멱등 원장) · `useCrudListQuery`/`useCrudCreate`/`useCrudUpdate`/`useCrudDelete`(저수준 훅) · `Empty`(빈 상태) · `useModalDirtyGuard`(4경로 가드) · 공유 필터 스타일. **안 쓰는 것: `useCrudForm`·`useCrudList`·`CrudListShell`·`CrudTable`** — 그래서 그 훅들이 제공하는 여덟 장치(status 분기·conflict 다이얼로그·422 필드 매핑·동기 제출 락·멱등키·행 단위 `deletingId`·`onSuccess` aborted 가드·reference code)를 **상속하지 못했다**(BE-042 §7.4 가 그 목록을 표로 정리한다).

**그 결과 P0 gap 4건 중 2건(EXC-04·EXC-08)이 바로 그 미상속에서 나온다.** 반면 **STATE-01 은 pass** 다 — 이 화면이 저수준 `useCrudListQuery` 를 쓰면서도 `firstLoading` 파생을 **로컬로 복제**했기 때문이다(`ProductCategoriesPage.tsx:203-205`). **'저수준 훅 = STATE-01 gap' 은 오탐이다.**

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 이 화면은 `useCrudList` 를 쓰지 않고 저수준 `useCrudListQuery` 를 **직접** 쓰지만(`ProductCategoriesPage.tsx:195-198`), **`firstLoading = isFetching && data === undefined` 를 로컬 파생한다**(`:205`) — `:203-204` 의 주석이 그 결정을 명시한다('[STATE-01] 스켈레톤/불러오는 중은 **최초 로드에만** — 재조회 때도 loading 으로 쓰면 이미 보고 있던 목록이 불러오는 중…으로 덮인다'). 그 `firstLoading` 이 로딩 문구(`:272,288-289`)만 지배하고, 재조회 중에는 이전 행이 유지된다(`useCrudListQuery` 의 `placeholderData: (previous) => previous` — `crud.ts:254`). 성공·0행은 `Empty`(`:290-297`), read 실패는 `Alert`(`:277-285`) — **네 상태가 서로를 침범하지 않는다** | `/products/categories` 진입 → 데이터 렌더 확인 → 좌측 필터 클릭 또는 `staleTime` 30초 경과 후 재진입. **목록이 '불러오는 중…' 으로 덮이거나 '전체 N개'가 사라지면 gap.** 0건 필터로 `Empty` 만, `?fail=product-categories:list` 로 `Alert` 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** read 실패가 인라인 danger Alert + 명시적 '다시 시도' 다 — `ProductCategoriesPage.tsx:277-285` `<Alert tone="danger">` + '카테고리를 불러오지 못했습니다.' + `<Button variant="secondary" onClick={() => void refetch()}>다시 시도</Button>`. **read 실패로 error toast 를 쓰는 경로가 0건**이고 empty 로 폴백하지 않는다(`error !== null` 이면 카드 자체를 그리지 않는다 — `:277`). **잔여(요구 위반은 아니다)**: 배너가 카드만 대체하고 툴바는 밖에 있어 **'불러오지 못했습니다'와 '전체 0개' 가 동시에 보인다**(FS-042 §7 #13) | `?fail=list` 또는 `?fail=product-categories:list` → danger Alert + '다시 시도'. **토스트가 뜨거나 '등록된 카테고리가 없습니다' 가 뜨면 gap** | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** ① **페이지네이션이 없다**(`ProductCategoriesPage.tsx:299-312` 이 `visible.map` 으로 `<ul>` 에 전량을 렌더) → page clamp 가 걸릴 표면이 없다. ② **행 선택이 없다** — 체크박스도 일괄 작업도 없다(FS-042 §2). `useListState` 가 `selectedIds`·`toggleAll`·`clearSelection` 을 제공하지만 이 화면은 **소비하지 않는다**(구조분해에 없다 — `:188-193`). 따라서 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. **페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다** | 페이지네이션·행 선택이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/products/categories/**` 에 primitive tier 밖 `#hex` · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 9)`(`:47`) 같은 space 토큰 배수로만. `opacity` 리터럴도 **0건**(상품 화면과 대조 — 거기는 2건) | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|: *(thin\|medium\|thick)" apps/admin/src/pages/products/categories` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`ProductCategoriesPage.tsx:151,160` 행 액션 · `CategoryUsageFilter.tsx:39` 필터 항목 · `ProductCategoryFormModal.tsx:134` 이름 입력) · DS `<Button>`·`<Modal>`·`<ConfirmDialog>`. **이 화면이 `:focus-visible` outline 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서는 로컬 `:focus-visible` 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: Toast(삭제·저장·추가 성공) · Modal/ConfirmDialog · DS `<Button>` transition. **스켈레톤이 없다**(로딩이 문구 1줄이라 `tds-ui-skeleton` 을 쓰지 않는다 — 상품 화면과 대조). **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`:287`) · Modal ×3(등록/수정 모달 · 삭제 ConfirmDialog · 파기 ConfirmDialog) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — page title 이 AppHeader 에서 온다(`AppHeader.tsx:101` `<h1 style={titleStyle}>{title}</h1>`, `titleStyle = { ...pageTitleStyle, marginTop }` — `:52-55`). 그 `pageTitleStyle` 이 `--tds-typography-title-xl-*`(>18px tier + weight 600)를 참조한다(`shared/ui/styles.ts:51-61`). 이 화면의 heading 표면 둘은 **DS/공유 소유**다: 모달 제목 `<h2 className="tds-modal__title">`(`Modal.tsx:165`) · 필터 제목 `<h2 style={filterHeadingStyle}>`(`CategoryUsageFilter.tsx:29`). **KPI/StatsCard 값 표면이 없다** | AppHeader/DS 토큰 판정에 종속. 이 화면에서는 title 값을 손으로 재현하는 로컬 스타일이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** **이 화면에 text-search/filter 입력이 없다.** 필터는 좌측 `aria-pressed` 토글 3개(`CategoryUsageFilter.tsx:32-49`)이고, `<SearchField>` 도 `<input type="search">` 도 렌더되지 않는다(grep 0건). `useListState` 가 `searchInput`·`setSearchInput`·`searchInputProps` 를 제공하지만 이 화면은 **소비하지 않는다**(구조분해에 없다 — `:188-193`). **모달의 이름 입력은 폼 필드이지 검색/필터 입력이 아니다** — 요구의 appliesTo('모든 SearchField/필터 입력, 검색 toolbar, shared search hook')에 걸리지 않는다. **정당한 부재다**: 카테고리는 좌측 필터로 전량이 한눈에 들어오는 짧은 목록이다 | 검색 입력이 도입되면 이 판정을 다시 매긴다 — `useListState` 가 이미 `searchInputProps` 를 들고 있어 스프레드 한 줄이면 충족된다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **충족.** 파괴적/비가역 액션 둘이 `ConfirmDialog` 로 게이트된다: 삭제(`ProductCategoriesPage.tsx:329-340` — `intent="delete"`) · 모달 이탈 파기(`useModalDirtyGuard` → `intent="discard"`). intent→tone/icon/label 은 DS 가 소유(`ConfirmDialog.tsx:6,126`). **busy 중 확인 버튼이 `disabled + aria-busy`('처리 중…')로 잠기고 취소는 살아 있다**(`ConfirmDialog.tsx:144,151-152`). **실패 시 다이얼로그를 연 채 danger 배너**(`:239` `setDeleteError` → `ConfirmDialog error` prop)를 보이고 재클릭이 retry. **cancel/Esc/dim 은 in-flight 요청을 abort 하고 pending state 를 리셋**한다(`:214-220` `closeDelete` — `abort()` + `deleteCategory.reset()` + `setDeleteError(null)` + `setPendingDelete(null)`) | 미사용 카테고리의 삭제 → `?fail=product-categories:delete` 로 강제 실패. **다이얼로그가 배너와 함께 유지되고 재클릭이 retry 하면 pass.** in-flight(400ms 창) 중 Esc 로 닫아 false toast 없이 버튼 state 가 복원되는지 확인 | **pass** |
| FEEDBACK-04 | FEEDBACK | N/A | **표면이 없다.** 요구의 appliesTo 는 **page 폼**(`FormPageShell`·`DocumentFormShell`·`AccountFormPage`·'모든 폼')이고 3경로(browser unload · in-app link · back/forward)는 **화면을 벗어나는** 이탈이다. **이 화면에 page-level 폼이 없다** — 편집은 modal 이고 그 페이지 자체는 dirty state 를 갖지 않는다(`ProductCategoriesPage` 에 `useForm`·`isDirty`·`useUnsavedChangesDialog` 0건). **modal 의 dirty 가드는 FEEDBACK-06 이 담당한다** — 그 요구의 근거가 그 분업을 명시한다('FEEDBACK-04 가 page 에서 보호하는 바로 그 상호작용이 modal 에서는 무방비다 — FEEDBACK-04 P0 의 자연스러운 확장'). **즉 이 화면은 FEEDBACK-04 가 아니라 FEEDBACK-06 의 대상이며, 그것은 pass 다** | page 폼 라우트가 도입되면 이 판정을 다시 매긴다(IA-06 의 무게 규칙상 그럴 이유가 없다) | **n-a** |
| FEEDBACK-06 | FEEDBACK | 직접 | **미충족 — 배선은 옳으나 DS Modal 의 latch 가 요구를 깬다.** 이 화면은 요구의 appliesTo 에 명시적으로 지목된다('CreateGroupModal, **ProductCategoryFormModal**, PortfolioCategoryFormModal, RoleFormModal, LogoFormModal'). `ProductCategoryFormModal.tsx:65` `const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose)`. **`requestClose` 를 `Modal.onClose`(`:104`)와 취소 버튼(`:113`)에 둘 다 넘겨 4경로를 한 번에 덮는다** — DS Modal 이 Esc·딤·× 를 `onClose` 한 곳으로 모으기 때문이다(`useModalDirtyGuard.tsx:13-17` 이 그 설계를 적는다: '경로마다 가드를 붙이면 반드시 한 경로를 빠뜨린다'). `isDirty` 는 RHF(`:51`). dirty 면 `intent="discard"` ConfirmDialog, **pristine 이면 즉시 닫는다**(`useModalDirtyGuard.tsx:57-63`). `saving` 중에는 가드가 꺼진다. **파기 확인이 모달 *밖*에 렌더된다**(`:153-154` — 안에 두면 모달의 포커스 트랩이 그것을 가둔다). `suppressCancelToast` — 여기서 '취소'는 '이 모달에 머무른다' 는 뜻이라 토스트를 띄우지 않는다. **네 경로가 discard 확인을 띄우는 것 자체는 여전히 코드로 확인된다.** ★ **그러나 `a5c2639` 기준에서 판정이 뒤집힌다 — 요구의 '취소하면 모달에 머무른다' 절이 실제로는 깨진다.** PR #26 이 Modal 에 exit 애니메이션을 넣으면서 **일방향 latch** 가 생겼고, 이 화면이 그 폭발 반경 9곳 중 하나다(`onClose={requestClose}` — `ProductCategoryFormModal.tsx:104`). `Modal.tsx:124` 가 `closingRef.current = true` 로 걸어 잠그는데 **리셋이 코드 어디에도 없다**(`setClosing(false)`·`closingRef.current = false`·리셋 effect 전무 — `Modal.tsx` 전체에서 `closing` 대입은 `:117,119,123-125` 뿐). 추적(dirty 폼): ① Esc → `closingRef=true, closing=true` **latch** ② `--closing` → `pointer-events:none`(`Modal.css:26-28`) + dialog exit `forwards`(`:35-38`) → `opacity:0` 고정 ③ `onAnimationEnd` → `onClose()`(`Modal.tsx:216-218`) → 가드가 `dirty` 라 `setAsking(true)` 만 하고 **부모가 언마운트하지 않는다**(`useModalDirtyGuard.tsx:53-58`) ④ 사용자가 '취소'(머무르기) → `setAsking(false)`(`:73`) ⑤ **종착: 모달은 마운트된 채 `closing` 이 여전히 true — dialog 는 `opacity:0` 로 안 보이고, 오버레이는 `pointer-events:none` 이며, 이후 모든 Esc/딤/× 는 `Modal.tsx:123` 에서 즉시 return 한다. 영구히 닫히지도 보이지도 않고 입력한 카테고리명이 갇힌다.** reduced-motion/jsdom 변종도 같은 latch — `Modal.tsx:129-132` 에서 `willAnimate()` 가 false 라 `onClose()` 를 동기 발사 → 가드 veto → 동일 latch. 이때 dialog 는 *보이지만* latch + `pointer-events:none` 이라 **보이는데 완전 무반응**이다. 근인: `Modal.tsx:19-25` 가 'onClose() → 부모가 언마운트' 를 설계 전제로 문서화하는데 dirty 가드가 그 전제를 깨고, 깨졌을 때 latch 를 되돌리는 코드가 없다(`onClose` 가 `void` 반환이라 Modal 에 veto 신호가 닿지도 않는다). **소유는 `packages/ui` 의 Modal 이나 발현은 이 화면이다** — §5 #19 | 모달에 이름을 입력한 뒤 ① Esc ② scrim 클릭 ③ × 클릭 ④ 취소 버튼 — 네 경로 모두 discard 확인이 뜬다(현재 ✔). **★ 그 다음이 판정을 가른다: 확인창에서 '취소'(머무르기)를 누르고 모달이 다시 보이며 조작 가능한지.** 현재는 **사라진 채 무반응**이다 → gap. 손대지 않은 모달에서 같은 동작은 **즉시 닫혀야** 한다(pristine 이면 가드가 `onClose()` 직행이라 latch 가 문제되지 않는다). 저장 성공 후에는 프롬프트 없이 닫히는지도(`onSaved` 가 `setModal({kind:'closed'})` 로 직접 닫아 가드를 거치지 않는다 — 이 경로도 안전하다) | **gap** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 3종: 삭제 성공(`ProductCategoriesPage.tsx:235`) · 수정 성공 · 추가 성공(`:247-249`). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다. **`CrudListShell` 의 항상-마운트 목록 live region 은 이 화면에 없다**(그 껍데기를 쓰지 않는다) — 다만 `Empty` 자신이 `role="status"` 를 갖는다(`Empty.tsx:104`) | ToastProvider 판정에 종속. 이 화면에서는 세 토스트가 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 3종: 등록/수정 모달(`Modal`) · 삭제 `ConfirmDialog` · 파기 `ConfirmDialog`. `aria-describedby`→message 배선은 DS `Modal`(`Modal.tsx:158`)/`ConfirmDialog`(`:129` — 본문 메시지 id 를 Modal 에 연결)가 소유한다. **등록/수정 모달은 `describedBy` 를 넘기지 않는다** — 본문이 폼 필드라 '목적' 문장이 없다(요구의 대상은 ConfirmDialog 의 message 다) | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 `'<이름>' 카테고리를 삭제합니다…` 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 이 화면의 폼 컨트롤은 하나뿐이고 전수 확인했다.** **이름 입력**(`ProductCategoryFormModal.tsx:125-149`): ① **`aria-invalid` ↔ `aria-describedby` 짝** — `:139-140` `aria-invalid={invalid}` + `aria-describedby={invalid ? errorIdOf('product-category-name') : undefined}` 가 **같은 조건으로 짝**을 이루고, 감싸는 `FormField htmlFor="product-category-name"`(`:125-130`)가 `<p id={errorIdOf('product-category-name')} role="alert">` 를 렌더한다(`FormField.tsx:110`) — **id 가 일치한다.** ② **required 주입** — `FormField required` 의 자식이 네이티브 `<input>`(`:131`)이라 `withAriaRequired` 가 `aria-required={true}` 를 **런타임 cloneElement 로 주입**한다(`FormField.tsx:36-41,50-56` — `isRequirableChild` 의 허용 태그). 호출부가 `aria-required` 를 직접 주지 않으므로 override 도 걸리지 않는다. **짝 없는 `aria-invalid` 0건.** 이 화면에 다른 폼 컨트롤이 없다 — 필터는 버튼(`aria-pressed`), 행 액션은 버튼(`aria-label`) | `grep -rn "aria-invalid" apps/admin/src/pages/products/categories` → 히트 1건, 같은 요소에 `aria-describedby` 가 있는지(✔). RTL 로 모달을 열어 `screen.getByLabelText('카테고리 이름')` 의 **`aria-required === 'true'`** 를 assert(**grep 으로는 판정할 수 없다 — 런타임 주입이다**). 빈 이름으로 제출해 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터 list item 이 **`aria-pressed` 하나로만** 선택 상태를 말한다 — `CategoryUsageFilter.tsx:41` `aria-pressed={active}`. **`pages/products/categories/**` 에 `aria-current` 0건**(grep 확인). 공유 `filterItemStyle(active)` 을 소비한다(`:40`) — 요구가 나열한 5개 필터(TierFilter·NoticeFilters·LoginHistoryFilters·GroupFilter·EsgCategoryFilter)와 같은 관례. 파일 헤더가 그 결정을 적는다(`:5` '선택 상태는 aria-pressed 하나로만 말한다(A11Y-12)') | `grep -rn "aria-current" apps/admin/src/pages/products/categories` → **0건이어야 한다.** 세 필터 버튼에 `aria-pressed={active}` 가 있는지 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 3종(A11Y-02 와 같은 노드). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다. **이 화면은 modal 이 핵심 상호작용이라 그 표면이 특히 두껍다**(등록·수정이 전부 modal 이다). 구 기준의 'Motion/AnimatePresence 0건이라 소유 문서에서 gap 일 가능성' 추정은 낡았다 — **오버레이 모션은 구현됐고, 라이브러리가 아니라 CSS-only 다**(Motion/framer-motion 은 여전히 미도입 — package.json 19개·import·lockfile 전부 0건): backdrop fade `Modal.css:20-21,30-33` + dialog scale 0.96→1 `:58-59,35-38`, reduced-motion 게이트 `:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` 로 동등 달성한다(`Modal.tsx:216-218`). **다만 애니메이션되는 닫힘은 Modal 소유 3경로뿐**(Esc·딤·×)이라 **모달 footer 의 '취소'·'저장' 버튼 경로는 여전히 즉시 언마운트된다**(`Modal.tsx:27-31`). ★ **그리고 그 exit 경로가 이 화면의 FEEDBACK-06 을 깬다** — 같은 PR 이 만든 latch 다(§2 FEEDBACK-06 · §5 #19) | DS Modal 판정에 종속 — 라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 3종(A11Y-01 과 같은 노드). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: Toast · Modal · DS Button transition. **`ToggleSwitch` 가 이 화면에 없다** — 애초에 이 표면에서는 발현될 수 없었고, 그와 별개로 **구 기준이 지목하던 위반 자체가 해소됐다**: `ToggleSwitch.css:79-84` 에 `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }` 게이트가 실재해 남은 transition 선언 둘(`:32` 트랙 색 · `:56` 손잡이 transform)을 모두 끈다. **스켈레톤도 없다.** 이 화면이 transform/transition 을 직접 선언하지 않는다(grep 0건) | 전역 motion config 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:229` — `{ path: '/products/categories', element: <ProductCategoriesPage />, implemented: true }`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={layoutStyle}>`(`:261` — 좌필터/우목록 2열 그리드)다 | 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족 — 이 화면은 잎이라 통합의 `findCoveringLeaf` 가 정확히 답한다.** `/products/categories` 는 nav 잎이고(`nav-config.ts:147` `['카테고리', '/products/categories']`), `findCoveringLeaf` 가 **'자기를 감싸는 가장 긴 잎'** 을 고르므로(`:269-279`) 자기 자신(`/products` 가 아니라)을 찾는다 — `:274-275` 의 주석이 이 사례를 명시한다('더 긴 잎이 더 구체적이다 — `/products/categories` 가 `/products` 를 이긴다'). `findNavLabel` → **AppHeader h1 = '카테고리'**(`AppHeader.tsx:92,101`). **화면에 in-content `<h1>` 이 없다** — 모달 제목은 `<h2>`(`Modal.tsx:165`), 카드 제목은 `CardTitle` → `<h2>`(`Card.tsx:41`), 필터 제목은 `<h2>`(`CategoryUsageFilter.tsx:29`). → **`<h1>` 정확히 1개이고 그것이 잎 라벨이다.** GROUND-TRUTH 가 정리한 '잎 화면(하위 라우트 없음, in-content h1 없음) → IA-02 pass' 의 정확한 사례다. **sub-route 가 없어**(편집이 modal 이다) 폼 화면의 h1 이중 문제(FS-041 §7 #6)가 **구조적으로 발생하지 않는다** — modal 편집을 고른 IA-06 의 부수 이득이다 | `/products/categories` 진입 → `document.querySelectorAll('h1').length === 1` 이고 그 텍스트가 '카테고리' 인지. **모달을 연 상태에서도 `h1` 이 1개인지**(모달 제목이 `h2` 임을 확인) | **pass** |
| IA-04 | IA | 직접 | **부분 미충족 — quality-bar 가 이 화면을 명시적으로 지목한다.** 요구의 근거: '**CrudListShell 이 대부분 인코딩하나 members/categories 가 부분 이탈**하고 members 만 실제 pagination'. 충족: toolbar row(건수 요약 좌측 + primary '카테고리 추가' **우상단** — `ProductCategoriesPage.tsx:269-275`). SelectionBar 는 **정당한 N/A**(일괄 액션 없음). **미충족 셋**: ① **Pagination 이 없다** — `:299-312` 이 `visible.map` 으로 전량 렌더, 앱의 `<Pagination` 소비자 11파일에 이 화면이 없다(grep 확인). ② **`<table>` 이 아니라 `<ul>` 이다**(`:299`) — 공유 `CrudTable` 템플릿(선택·순번·행 액션·스켈레톤·`aria-busy`·caption)을 쓰지 않아 자매 목록들과 골격이 다르다. ③ **count 요약이 별도 row 가 아니라 toolbar 의 좌측 슬롯을 차지한다**(`:271-273`) — 요구의 순서는 'toolbar row(검색/필터 좌측, primary 우상단) → **결과 count 요약** → …' 인데 여기서는 toolbar 와 요약이 한 줄이다. **①이 P0 판정의 주된 근거다** — 카테고리는 운영자가 만드는 만큼 늘어난다(BE-042 §7.7 이 상한 도입을 제안한다) | 픽스처를 30건 이상으로 늘리고 `/products/categories` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** `grep -rln "<Pagination" apps/admin/src/pages/products/categories` → 0건. `grep -n "<table\|CrudTable" apps/admin/src/pages/products/categories` → 0건 | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 요구는 '`:id` 로 구분되는 하나의 **컴포넌트/route 쌍**'(`/…/new` 와 `/…/:id/edit`)을 요구하는데 **이 화면에 폼 라우트가 없다** — App.tsx 에 `/products/categories/new` 류 라우트가 0건이고(확인), 편집은 **modal** 이다. 그것은 이탈이 아니라 **IA-06 의 무게 규칙을 따른 결과**다('짧은 taxonomy 엔티티는 inline-list + Modal'). **요구의 정신(create·edit 를 하나의 컴포넌트가 겸하고 title 과 prefill 만 다르다)은 modal 판본으로 충족된다**: `ProductCategoryFormModal` 하나가 `editing` 유무로 갈리고(`:45` `const isEdit = editing !== null`) 제목(`:103` `'카테고리 수정' : '카테고리 추가'`)·기본값(`:54` `defaultValues: { name: editing?.label ?? '' }`)·제출 라벨(`:117`)만 다르다 — 그러나 **요구의 appliesTo 는 route 쌍이므로 N/A 가 정직한 판정이다** | 폼 route 쌍이 도입되면 이 판정을 다시 매긴다(IA-06 상 그럴 이유가 없다) | **n-a** |
| IA-13 | IA | 직접 | **충족.** 사용 여부 필터의 **단일 원천이 URL 쿼리스트링**이다 — `ProductCategoriesPage.tsx:188` `useListState({ filterDefaults: { usage: 'all' } })` → `useSearchParams` 기반(`useListState.ts:22,87`). `?usage=in-use` 로 직렬화되고 **기본값(`all`)과 같으면 URL 에서 지운다**(`:114-118`). `replace: true`(`:125`)라 필터 조작이 history 를 쌓지 않아 **다른 화면에서 Back 하면 그 URL(=필터)이 복원된다**. 손으로 고친 `?usage=거짓말` 은 `parseFilter` 가 '전체'로 되돌린다(`:189-193`). **`q`·`page`·`sort` 는 이 화면에 표면이 없다**(검색·페이지네이션·정렬 부재 — 각각 COMP-10 n-a · IA-04 gap) | `/products/categories` 에서 '미사용' 클릭 → URL 이 `?usage=unused` 인지 → 다른 화면으로 갔다가 Back → **필터가 복원되면 pass.** `?usage=unused` 를 새 탭에 복사해 같은 view 가 재현되는지도 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` **바로 바깥**에 두는 `ErrorBoundary`(`AppShell.tsx:478-493`) + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → 세션 만료 통지 → 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장·삭제 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fproducts%2Fcategories&reason=session_expired` 로 가는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): **read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. **이 화면은 `/products` 와 별개 리소스로 갈린다** — `findCoveringLeaf` 의 '가장 긴 잎' 규칙(`nav-config.ts:274-275`)이 `/products/categories` 를 자기 자신으로 해석하고, `route-resource.ts:10-12` 의 주석이 이 사례를 예로 든다. 충족(직접): **create 게이팅** — `ProductCategoriesPage.tsx:181,252-258` 이 `canCreate` 로 '카테고리 추가' 버튼을 **렌더하지 않는다**(disable 이 아니라 부재). **미충족(직접): update·remove 게이팅이 없다.** `:181` 이 `useRouteWritePermissions()` 에서 **`canCreate` 만 구조분해**한다 — `canUpdate`/`canRemove` 를 묻는 곳이 이 화면에 0건이다. 결과: ① 행 '수정' 연필이 무조건 렌더(`:149-156`) ② 행 '삭제' 휴지통이 무조건 렌더(`:158-169`, `inUse \|\| deleting` 으로만 비활성) ③ **모달의 '저장'/'추가' 버튼이 권한을 묻지 않는다**. 서버 403 은 '저장하지 못했습니다. **잠시 후 다시 시도해 주세요**.' 로 뭉개진다 — **다시 시도해도 영원히 실패할 문구**다(BE-042 §7.8) | 권한 스토어에서 `product-categories` 의 `update`·`remove` 를 끈 뒤 `/products/categories` 진입. **행의 연필·휴지통이 그대로 보이면 gap.** `create` 를 끄면 추가 버튼이 사라지는지(pass), `read` 를 끄면 403 화면이 뜨는지(pass). **`products` read 만 있고 `product-categories` read 가 없는 역할이 403 을 받는지도 확인** — 그것이 의도인지는 BE-042 §7.9 | **gap** |
| EXC-04 | EXC | 직접 | **미충족 — 상품(NFR-041)보다 나쁘다. 구분해서 적는다.** **해소된 절(어댑터)**: 어댑터가 공용 `createStoreAdapter`(`data-source.ts:21-31`)라 `update`/`remove` 가 **없는 id 에 `HttpError(409)` 를 던진다**(`crud.ts:219-221,232-234`). 그전에는 store 의 `map`/`filter` 가 없는 id 를 조용히 지나쳐(`_shared/store.ts:679-696`) **유령 저장**이었다 — 그 절은 해소됐다. **미충족 절 둘**: ① **낙관적 동시성 토큰이 없다** — `ProductCategory` 에 `version`/`updatedAt`/`ETag` 가 **없고**(`_shared/store.ts:17-25` 전수 확인) 어댑터가 `If-Match` 를 보내지 않는다. 409 는 '**대상이 존재하는가**' 기반이라 **둘 다 존재하는 동시 편집은 여전히 last-write-wins** 로 덮는다. ② **409 를 해소할 UI 가 없다 — 이것이 상품과 다른 점이다.** `ProductFormPage` 는 `useCrudForm` 을 써서 409 → conflict 다이얼로그(입력 보존 + 최신 불러오기/닫기)를 화면 코드 0줄로 얻었지만(`useCrudForm.ts:166-178`), **`ProductCategoryFormModal` 은 그 훅을 쓰지 않고 `useCrudCreate`/`useCrudUpdate` 를 직접 쓴다**(`:57-58,84-94`) — 그 `onError`(`:78-81`)가 `isAbort` 만 보고 나머지를 전부 `setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')` 로 뭉갠다. **즉 어댑터가 409 를 정확히 던지는데 화면이 그것을 버린다.** 삭제도 같다(`:237-240`) — 게다가 거기서는 '사용 중이라 삭제 불가'(`_shared/store.ts:693`)까지 같은 문구로 뭉개져 **거짓 안내**가 된다(BE-042 §7.2) | `?status=save:409` 로 모달 저장 → **conflict 다이얼로그 없이 generic 배너만 뜨면 gap**(현재 그렇다 — 상품 화면과 대조 확인). **토큰 절**: `grep -n "version\|updatedAt\|If-Match" pages/products/_shared/store.ts pages/products/categories/data-source.ts` → **0건이면 gap**(현재 0건). `?status=delete:409` 도 '삭제하지 못했습니다' 로만 뜨는지 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `ProductCategoryFormModal` 이 `useCrudForm` 을 쓰지 않아 그 훅의 **두 장치를 모두 상속하지 못했다**: ① **동기 제출 락 없음** — `submitLockRef`(`useCrudForm.ts:103,201-202`)가 이 화면에 0건이다. 방어는 `disabled={saving}`(`:113,116`) 하나뿐인데, 제출이 `type="submit"` → `Modal.onSubmit` → `void handleSubmit(onValid, …)()`(`:105-109`)이고 **RHF `handleSubmit` 은 비동기**라(zod resolver 를 await 한다) 첫 클릭 후 `saving` 이 true 가 되어 버튼이 실제로 disabled 되기까지 **틈이 있다** — 요구가 이름 붙인 바로 그 'double-Enter gap'. ② **멱등키 없음** — `create.mutate({ input: { name }, signal: controller.signal })`(`:92`)에 `idempotencyKey` 가 없다. `WriteContext.idempotencyKey` 자리는 이미 있고(`crud.ts:30-42`) `createStoreAdapter` 의 멱등 원장도 대기 중인데(`crud.ts:168,200-203`) **키를 만드는 코드가 없어 원장이 놀고 있다.** **결과가 실제 사고다**: 연타 → 요청 2건 → **이름 유일 제약이 없으므로**(BE-042 §7.3 — 스키마도 저장소도 중복을 막지 않는다) **둘 다 성공 → 같은 이름의 카테고리 2개.** 그러면 상품 폼의 select 에 '아우터' 가 두 개 뜬다. **삭제도 동기 락이 없다**(`ConfirmDialog` 의 `busy` 는 리렌더 후에야 잠긴다) | 모달에서 '추가' 를 최대한 빠르게 2회 클릭(또는 네트워크 스로틀 + Enter 연타). **요청이 2건 발사되고 같은 이름의 카테고리가 2개 생기면 gap.** `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/pages/products/categories` → **0건이면 gap**(현재 0건). 대조군: `grep -n "submitLockRef" apps/admin/src/shared/crud/useCrudForm.ts` → 실재 | **gap** |
| EXC-09 | EXC | 직접 | **충족.** 두 경로에서 abort 가 non-failure 다. **모달 저장**: `:70` `useEffect(() => () => controllerRef.current?.abort(), [])` 언마운트 abort + `:79` `if (isAbort(cause)) return;`(토스트·배너 없음). **삭제**: `:214-215` `closeDelete` 가 `abort()` + `deleteCategory.reset()`(**isPending 리셋**) + `:237-238` `if (isAbort(cause)) return;` + `:233` 성공 콜백의 `if (controller.signal.aborted) return;` 가드. 둘 다 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다. **bulk 표면이 없어** '실패 count 제외' 절은 무관하다. **잔여(요구 위반은 아니다)**: **모달 저장의 `onSuccess` 에는 `aborted` 가드가 없다**(`:86,93` — `onSuccess: () => onSaved(name, true)`) — `useCrudForm`(`:218`)·`useCrudList`(`:105`)·`useCrudRowUpdate`(`:48`)·이 화면의 **삭제**(`:233`)는 전부 그 가드를 두는데 **모달 저장만 없다**. 그래서 지연 창(400ms)이 끝난 직후 모달을 닫으면 **닫힌 모달의 성공 토스트가 뜬다**. 요구의 세 절(error toast 없음 · isPending 리셋 · cache 무변경)은 충족하므로 pass 이나 **§5 #9 로 이관** | 삭제 다이얼로그를 열고 확인 → **진행 중(400ms 창) Esc 로 닫기.** error toast 없이 버튼 state 가 복원되면 pass. 모달 저장 중 Esc → 토스트가 뜨지 않아야 하나 **타이밍에 따라 성공 토스트가 뜰 수 있다**(잔여) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **10** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-13 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **4** | STATE-04 · COMP-10 · FEEDBACK-04 · IA-05 |
| `gap` | **5** | FEEDBACK-06 · IA-04 · EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 10 + 11 + 4 + 5 = **30** ✔ |

> **★ `a5c2639` 기준 갱신으로 뒤집힌 판정 — FEEDBACK-06 `pass` → `gap`(악화).** 이 화면 코드는 **0줄 바뀌지 않았다.** PR #26 이 DS `Modal` 에 exit 애니메이션을 넣으면서 **일방향 latch** 를 만들었고(`closingRef` 를 `Modal.tsx:124` 에서 걸되 **리셋 코드가 전무**), `useModalDirtyGuard` 의 veto(`setAsking(true)` — 부모가 언마운트하지 않음)와 만나면 **dirty 폼 모달이 파기 확인에서 '취소' 를 누른 뒤 영구히 사라진 채 무반응이 되고 입력이 갇힌다**(§2 FEEDBACK-06 행에 전체 추적). 요구의 '취소하면 모달에 머무른다' 절이 정확히 깨지는 자리다. **모달 배선 자체는 여전히 모범적이다**(`requestClose` 로 4경로를 한 번에 덮는 설계) — 깨진 것은 DS Modal 의 생명주기 가정이다. **폭발 반경 9곳** 중 하나이며 소유는 `packages/ui` 다 → §5 #19.

> **P0 gap 5건 — quality-bar '배치 실패' 사유.** **EXC-04·EXC-08 은 같은 뿌리다**: 모달이 `useCrudForm` 을 쓰지 않아 conflict 다이얼로그·422 필드 매핑·동기 락·멱등키를 **한꺼번에** 상속하지 못했다(BE-042 §7.4 가 그 여덟 장치를 표로 정리한다). **그 한 뿌리를 뽑으면 두 gap 이 함께 닫힌다** — 그리고 같은 모양의 모달이 앱에 5개 더 있다(quality-bar FEEDBACK-06 의 appliesTo). **EXC-03**(쓰기 게이팅)은 훅이 이미 있어 즉시 해소 가능. **IA-04**(페이지네이션 + `<ul>`→`CrudTable`)는 quality-bar 근거가 이 화면을 명시적으로 지목한다.
>
> **F2 대비 해소된 것(기록)**: STATE-01(`firstLoading` 로컬 파생) · STATE-05(공유 `Empty` 2분기) · IA-13(`useListState`) · FEEDBACK-06(`useModalDirtyGuard` 4경로) · EXC-04 의 **유령 저장 절**(`createStoreAdapter` 409) · IA-02(`findCoveringLeaf` — 이 화면은 잎이라 **처음부터 문제가 없었고** 통합이 그 규칙을 한 곳으로 모았다).
>
> **IA-02 가 pass 인 구조적 이유**: 편집이 modal 이라 **sub-route 가 없다** — 상품 폼(FS-041 §7 #6)이 겪는 'h1 2개 + 행위 미반영' 이 여기서는 **발생할 수 없다.** IA-06 의 무게 규칙을 따른 부수 이득이다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(검색·재정렬·이미지 업로드·날짜 범위·금액·CSV·Pagination range·일괄 작업·sticky·PDF)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. 화면이 그 이득을 **버리지 않는다**(`firstLoading` 파생 — STATE-01 pass). **그러나 '가벼운 refetch 인디케이터' 가 없다** — `CrudListShell` 은 `aria-busy={refreshing}` + ' · 새로고침 중…' 을 주는데(`CrudListShell.tsx:118-122`) 이 화면은 그 껍데기를 쓰지 않아 상속하지 못했다. 이전 행은 유지되나 갱신 중임을 알 수 없다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되는지(✔) + 가벼운 인디케이터가 보이는지(✕) | **gap(부분)** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty`(`@tds/ui`)를 소비하고 context 로 분기한다 — `ProductCategoriesPage.tsx:292-297` 이 `hasActiveFilters`·`onResetFilters`·`action`(추가 CTA)을 넘긴다. 조사도 `Empty` 가 받침으로 고른다(`Empty.tsx:25,68`). **`hasQuery` 를 넘기지 않는 것은 정당하다** — 검색이 없어 그 분기가 존재할 수 없다(COMP-10 n-a 와 같은 근거). 요구의 3분기 중 (a) 진짜 비어있음 + (c) 필터 0건이 실재하고 (b) 검색 0건은 표면 부재 | 필터로 0건 → '필터 초기화'. 미시딩 → 추가 CTA | **pass** |
| STATE-06 | P1 | write 성공 시 정확히 무효화한다 — `useCrudCreate`(`crud.ts:291`) · `useCrudUpdate`(`:312-316`) · `useCrudDelete`(`:332`)가 전부 목록 키를 invalidate 한다. **그러나 이 화면의 write 가 다른 화면의 read 를 stale 로 만드는데 그것을 invalidate 하지 않는다** — 상품 화면의 카테고리 선택지가 **다른 키**(`[products,'category-options']`)라 여기서 카테고리를 추가·수정·삭제해도 무효화되지 않는다(FS-042 §7 #8 · BE-042 §7.11 #6). 요구의 본절이 '그것이 stale 로 만든 read cache 만 정확히 invalidate' 인데 **정확히 그 지점이 새고 있다** | 이 화면에서 카테고리를 추가하고 `/products/new` 로 이동 → select 에 새 카테고리가 보이는지(**새로고침 전에는 안 보인다**) | **gap** |
| COMP-01 | P1 | **미충족 — 요구가 'ghost icon 버튼 포함' 을 명시한다.** 행 액션 2개가 `buttonStyle('ghost')` + `className="tds-ui-btn-ghost tds-ui-focusable"` 로 `<button>` 을 손조립한다(`ProductCategoriesPage.tsx:149-156` 수정 · `:158-169` 삭제 — 후자는 `dangerGhostStyle = { ...buttonStyle('ghost'), color: 'var(--tds-color-feedback-danger-text)' }`(`:116-119`)로 **variant 를 손으로 파생**한다). 또 모달 제출이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨을 쓴다(`:117`). **충족**: 추가 버튼·모달 취소/제출·재시도는 전부 DS `<Button>` | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/categories -r` → **0건이어야 한다. 현재 2파일 히트**(`ProductCategoriesPage.tsx`) | **gap** |
| COMP-02 | P1 | **표면 없음** — 선택 셀도 순번 컬럼도 없다(`<ul>` 행 목록이고 선택이 없다). raw checkbox 0건 | selectable 테이블에 raw checkbox 가 0인지 | **n-a** |
| COMP-03 | P1 | **표면 없음** — 검색 입력이 없다. `type="search"` grep 0건(COMP-10 n-a 와 같은 근거) | `grep 'type="search"'` → 0건 | **n-a** |
| COMP-04 | P1 | zod-required 필드 1개(`name`)가 `FormField required` 로 `*` 마커를 렌더한다(`ProductCategoryFormModal.tsx:125-130`). bare `<label style={fieldLabelStyle}>` 로 required 를 그리는 곳이 0건 — 요구가 지목한 `CreateGroupModal`('그룹명')의 문제가 **이 모달에는 없다** | 모든 zod-required 필드에 인접 `*` 가 있는지 | **pass** |
| COMP-05 | P1 | 좌측 필터가 공유 `filterPanelStyle`/`filterNavStyle`/`filterListStyle`/`filterItemStyle`/`filterHeadingStyle`/`badgeStyle` 을 import 한다(`CategoryUsageFilter.tsx:6-13`). 동일 값의 로컬 wrapper/group 재선언 0건 — 파일 헤더가 그 결정을 적는다(`:3-5` '회원 화면의 좌측 필터가 정본이다 — 새 패턴을 만들지 않는다') | 필터 파일에 gap space-5/space-2 를 재선언하는 로컬 CSSProperties 가 0인지 | **pass** |
| COMP-06 | P2 | **표면 없음** — list skeleton 이 없다. 로딩이 `<p style={hintStyle}>불러오는 중…</p>` 문구 1줄이다(`:289`). `length: 5` 하드코딩도 없다(그럴 스켈레톤이 없으므로). **다만 그것이 요구의 정신을 충족하는 것은 아니다** — 문구 로딩은 layout shift 를 만든다(로딩 중 카드가 1줄, 도착 후 N줄) | skeleton row 수 === PAGE_SIZE 인지 | **n-a** |
| COMP-07 | P2 | **표면 없음** — 순번 컬럼이 없다(`SeqCell` 미사용). 페이지네이션도 없어 offset 개념 자체가 없다 | page 2 첫 행 seq === pageSize+1 인지 | **n-a** |
| COMP-08 | P2 | 마지막 컬럼이 요구의 (b) 분기('인라인 편집 테이블은 RowActions(pencil/trash)')를 **의미상** 따른다 — 연필/휴지통 2개(`:149-169`). **중복 '상세' 버튼 없음.** 다만 DS `RowActions` 컴포넌트가 아니라 손조립이다(COMP-01 gap 과 같은 뿌리) — 그래서 접근 이름 관례·disabled 처리가 `CrudTable` 의 그것과 미묘하게 다르다 | 읽기전용 리스트에 중복 '상세' 버튼이 없는지 | **pass(패턴) · gap(구현 — COMP-01)** |
| COMP-09 | P2 | **충족 — 상품 화면과 대조된다.** 카테고리 이름에 `overflowWrap: 'anywhere'`(`:108`)가 걸려 **긴 이름이 열을 넓히지 않고 줄바꿈된다.** `<ul>` flex 행이라 애초에 열 개념이 없어 grid 파괴 위험이 구조적으로 낮다. 40자 상한도 있다. 다만 요구가 기대하는 'ellipsis truncate + hover/expand' 형태는 아니다(줄바꿈이다) | 매우 긴 이름이 레이아웃을 깨지 않는지 | **pass** |
| COMP-12 | P2 | 이름 입력에 `maxLength={40}`(`:136`)만 있고 **카운터가 없다**(`FormField counter` prop 미사용 — `TextareaField` 가 자동으로 주는 것과 대조). 상한 근접 경고도 없다 — 40자에 닿으면 **경고 없이 입력이 멈춘다.** counting 기준(`maxLength` = UTF-16 code unit)도 문서화되지 않았다. **다만 40자는 짧아 실무 위험이 작다** | 40자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap(경미)** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: read 실패=인라인 Alert(`:277-285`) · write 성공=toast(`:235,247-249`) · **다이얼로그 내부 실패=그 다이얼로그의 error 배너**(`:239` → `ConfirmDialog error`) · **모달 내부 실패=그 모달의 error 배너**(`ProductCategoryFormModal.tsx:80,123` — modal 뒤에 숨는 toast 를 쓰지 않는다). page 가 임의 배너 state 를 갖지 않는다 | ConfirmDialog 내부 delete 실패가 다이얼로그 배너인지, read 실패가 인라인 Alert 인지 | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 양 경로가 배선돼 있다: 등록·수정(`ProductCategoryFormModal.tsx:83-94` — `onSuccess: () => onSaved(...)` · `onError`) · 삭제(`ProductCategoriesPage.tsx:229-242`). **no-op 클릭이 없다** — `?fail=` 강제 실패가 언제나 사용자 가시 실패를 낸다 | `?fail=product-categories:save` · `?fail=product-categories:delete` 로 각 경로에서 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 삭제가 confirm-before + 즉시 + 비가역이고 **undo 가 없다**(`:329-340`). 요구는 'confirm **또는** undo window' 이므로 **본절은 충족**(비가역성 고지 '이 작업은 되돌릴 수 없습니다.' 포함). 단일 미확인 클릭 delete 0건. **카테고리는 저가치 record 이고 재생성이 쉬워 undo 의 이득이 작다** | 모든 delete 가 confirm 을 열거나 undo 를 emit 하는지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 가 소유(`Modal.initialFocusRef`). 이 화면은 intent 만 준다. **등록/수정 모달은 `initialFocusRef={nameRef}`(`:110`)로 첫 편집 필드에 포커스한다** — 그것은 A11Y-13 의 축이다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **표면 없음** — 행 전체 클릭 네비게이션이 없다(`useRowNavigation` 미사용, `<li>` 에 `onClick` 0건). 행의 두 액션이 **명시적 버튼**이라 keyboard 로 도달 가능하다 — 'mouse-only row onClick' 문제가 구조적으로 없다 | 행을 Tab 해서 도달 가능한지 | **n-a** |
| A11Y-13 | P1 | **충족.** ① **폼 open 시 첫 편집 필드 포커스** — `Modal initialFocusRef={nameRef}`(`ProductCategoryFormModal.tsx:110`, ref 를 `:142-145` 에서 RHF ref 와 함께 배선). ② **submit 검증 실패 시 첫 invalid 필드로 포커스** — `void handleSubmit(onValid, () => nameRef.current?.focus())()`(`:108`) 가 `onInvalid` 콜백으로 명시적 포커스. **필드가 하나뿐이라 '첫 invalid' 가 자명하다.** 요구가 'modal 만 initialFocus + error-focus 를 하고 useCrudForm 기반 page 폼이 못한다' 고 지적하는데 — **이 화면은 그 modal 쪽이라 충족한다** | 모달을 열면 `document.activeElement` 가 이름 입력인지. 빈 이름으로 submit → activeElement 가 이름 입력인지 | **pass** |
| A11Y-16 | P1 | 대부분 충족: 필터 `aria-label`(`CategoryUsageFilter.tsx:28`) · `aria-pressed` 이중 인코딩 · 행 액션의 `aria-label`(`:153,162-164`) + `title` · `role="alert"` 오류(`FormField.tsx:110`) · `Empty` 의 `role="status"` · Modal 의 role/trap/Esc/focus-restore. **잔여 둘**: ① **삭제 버튼 접근 이름의 조사가 틀렸다** — `'<이름> — ${usage}라 삭제할 수 없습니다'`(`:163`)에서 `usage`='12개 상품' 이라 **'12개 상품라'** 가 된다(받침이 있으므로 '이라'). ② **목록에 항상-마운트 live region 이 없다** — 필터로 0행이 되는 전환이 AT 에 들리지 않는다(`CrudListShell.tsx:107-109` 를 쓰지 않는다). `Empty` 의 `role="status"` 는 **내용과 함께 생성**되는 노드라 NVDA/JAWS 에서 신뢰성이 낮다(그 요구의 근거가 정확히 그것을 말한다) | 신규 인터랙티브 표면이 role·keyboard·focus ring·label·live region·이중 인코딩을 충족하는지 | **gap(부분)** |
| ERP-01 | P1 | **표면 없음(엄밀히는 status 축이 아니다)** — 사용량 배지(`StatusBadge tone={inUse ? 'info' : 'neutral'}` — `:146`)가 **ERP lifecycle status 가 아니라 이진 파생값**이다(사용 중/미사용). 요구가 나열한 status(대기/임시/승인/반려/…)가 이 도메인에 없다. 톤 매핑이 인라인 삼항 하나라 레지스트리를 만들 대상도 아니다 | 하나의 export 된 map/함수가 status→tone 유일 소스인지 | **n-a** |
| ERP-05 | P1 | **표면 없음** — `<Pagination` 이 없다(IA-04 gap). `Pagination.tsx:112` 의 `showRange = pageSize > 0` opt-in 스위치를 **켤 소비자가 아니다.** IA-04 해소 시 이 판정을 다시 매긴다 | Pagination 이 range 텍스트와 size selector 를 렌더하는지 | **n-a(IA-04 선행)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber` — `types.ts:17` `usageLabel` · `ProductCategoriesPage.tsx:272`)을 경유한다. **인라인 포맷 0건**(`toLocaleString` grep 0 — 상품 화면과 대조: 거기는 2건). **잔여**: 조사 오류 1건(A11Y-16 의 `'N개 상품라'`) | 셀에 raw `toString()` 이 없는지, 숫자가 shared/format 을 경유하는지 | **pass(포맷) · gap(조사 1건)** |
| ERP-08 | P2 | 사용량·건수가 `formatNumber` 를 경유한다(`types.ts:17` · `:272` · `CategoryUsageFilter.tsx:45`). raw numeric toString 0건. 상대시간·미래 timestamp 가드는 **표면 없음**(카테고리에 시각 필드가 없다) | 셀의 raw numeric toString 이 0건인지 | **pass** |
| ERP-12 | P1 | **표면 없음** — CSV/xlsx 내보내기 affordance 가 없다. `canExport` 를 쓰지 않는다 | 필터된 결과 전체가 UTF-8 BOM Excel 로 나가는지 | **n-a** |
| ERP-13 | P1 | **리터럴 조사 폴백 0건**(grep 확인 — `이(가)`·`을(를)`·`은(는)`·`(으)로` 0건). 조사가 필요한 자리는 헬퍼가 처리한다: 검증 문구(`shared/crud/validation.ts:19-28` `requiredText('카테고리 이름', 40)` → `objectParticle`) · 빈 상태(`Empty.tsx:25,68` `subjectParticle`). **토스트·확인 문구는 조사 주입이 필요 없는 구조**다 — 이름 뒤에 항상 '카테고리를' 이 온다(`'<이름>' 카테고리를 삭제했습니다.`). **그러나 A11Y-16 의 `'N개 상품라'` 는 같은 뿌리의 조사 오류다** — 리터럴 폴백형(`이(가)`)은 아니지만 **받침을 보지 않고 조사를 박았다**. `shared/format` 에 이 조사(이라/라)를 고르는 헬퍼가 없다(`objectParticle`·`topicParticle` 뿐 — `format.ts:306,311`) | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0(✔). **접근 이름의 조사 정확성**(✕ — 1건) | **gap(경미)** |
| ERP-15 | P1 | 전량을 한 DOM 에 렌더한다(`:300` `visible.map`) — cap·virtualization 이 없다. **그러나 상품(NFR-041)보다 위험이 훨씬 작다**: 카테고리는 운영자가 손으로 만드는 목록이라 수십 규모이고(픽스처 5건), BE-042 §7.7 이 **상한 도입**(예: 200)을 제안한다. `<ul>` flex 행이라 wide table 의 가로 overflow 문제도 없다 | 200건 픽스처로 scroll 이 매끄러운지 | **gap(경미)** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 모달 언마운트·다이얼로그 닫기에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족 — 이 화면 전체가 그렇다.** 어댑터가 `HttpError`(status 보유)를 던지는데(`createStoreAdapter` — 404·409) **화면이 status 로 분기하지 않는다.** 모달 `onError`(`ProductCategoryFormModal.tsx:78-81`)와 삭제 `onError`(`ProductCategoriesPage.tsx:237-240`)가 `isAbort` 만 보고 **400/403/409/422/429/500 을 전부 하나의 문구**로 뭉갠다. `useCrudForm` 의 네 갈래(404·409·422+fields·그 밖)를 상속하지 못했다(BE-042 §7.4). **가장 나쁜 사례**: 저장소의 '사용 중인 카테고리는 삭제할 수 없습니다.'(`_shared/store.ts:693`)가 **'삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'** 로 바뀐다 — **저장소가 정확한 문구를 알고 있는데 화면이 그것을 버리고 거짓 안내로 대체한다** | `?status=save:409` vs `save:422` vs `save:500` 이 다른 surface 를 그리는지(**전부 같다 → gap**). `?status=delete:403` vs `delete:409` 도 | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` → RHF `setError` 경로가 **없다** — 모달이 `useCrudForm` 을 쓰지 않아 그 훅의 422 처리(`useCrudForm.ts:182-191`)를 상속하지 못했다. **모든 저장 실패가 form-level 배너로 간다.** BE-042 §7.3 이 이름 중복을 422 `error.fields: [{ name: 'name' }]` 로 내리기로 판정했는데 **그것을 받을 경로가 없다** | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면 없음(엄밀히)** — 요구의 appliesTo 는 'detail/edit **route**'(`FormPageShell`·`DocumentFormShell`·`useCrudForm`)이고 **이 화면에 detail/edit 라우트가 없다**(편집이 modal 이고 `:id` 를 URL 로 받지 않는다). **존재하지 않는 id 로 진입할 경로 자체가 없다** — 수정 모달은 목록의 행 데이터를 받으므로 항상 실재하는 대상이다. `fetchOne` 은 어댑터에 있으나 호출부가 0건이다(BE-042 §7.6). **다만 그 대가가 있다**: 모달이 30초 낡은 스냅샷을 편집하고(FS-042 §7 #14), 그 사이 삭제된 대상이면 저장이 409 를 받는데 그것을 generic 문구로 뭉갠다(EXC-06 gap 과 같은 뿌리) | 없는 `:id` 로 진입할 라우트가 있는지 → 없다 | **n-a** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장·삭제가 전부 비관적이다(pending 잠금 → 성공 후 무효화). `onMutate`/`setQueryData` grep 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라' 이므로 **위반 표면이 없다**. un-rolled-back optimistic write 0건. create/delete 는 confirm+busy 로 pessimistic 유지 — 요구가 명시적으로 권하는 형태 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-17 | P2 | 사용자 대상 copy 가 whole string + interpolation 이다. **잔여**: 삭제 버튼의 접근 이름이 `` `${category.label} — ${usage}라 삭제할 수 없습니다` ``(`:163`) — **문법 fragment 연결**이다(`usage` 뒤에 조사를 붙인다). 요구가 금지하는 형태이며 A11Y-16·ERP-13 의 조사 오류와 같은 뿌리다 | 신규 copy 가 fragment 연결이 아닌지 | **gap(경미)** |
| EXC-18 | P1 | **표면 없음** — 행 선택도 일괄 작업도 없다(FS-042 §2). `toggleAll`·SelectionBar·bulk confirm 이 걸릴 자리가 없다 | Shift-click 가 range 를 선택하는지 | **n-a** |
| EXC-19 | P1 | 401 리다이렉트가 **미저장 모달 입력을 버린다** — 프로그램적 navigate 라 dirty 가드가 발화할 수 없다. **그러나 손실이 작다** — 입력이 이름 한 줄이다(FS-041 의 리치 폼과 대조). idle/expiry 경고·draft snapshot 은 앱 전역 부재 | 세션 만료 후 재로그인 시 입력이 복원되는지 | **gap(앱 전역 · 경미)** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference` 가 존재하고(`http-error.ts:59`) `useCrudForm` 은 `errorReference` 로 노출하는데(`:189-195` → `FormFeedback.tsx:44`), 이 화면은 `setServerError('저장하지 못했습니다…')`(`ProductCategoryFormModal.tsx:80`) 고정 문구만 쓴다. raw stack 노출은 없다(그 절은 충족) | `?status=save:500` 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 400ms (BE-042 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 저장·삭제 p95 | ≤ 400ms | 위와 동일 |
| **`productCount` 집계** | 서버 GROUP BY 1회 | **미충족(픽스처) — O(카테고리 × 상품)** 이다. `listProductCategoryUsage()`(`_shared/store.ts:661-666`)가 카테고리마다 `countProductsUsingCategory` 를 부르고 그 함수가 **상품 전량을 filter** 한다(`:317-319`). 카테고리 50 × 상품 10,000 = **50만 회 비교**가 매 조회마다. **연동 시 사라진다**(BE-042 §7.7) |
| 첫 렌더 | ≤ 1s (LCP) | 미측정. 카테고리 수는 작아(수십) 렌더 비용이 낮다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시 — **충족** |
| **동시 쿼리 수(진입당)** | **1** | **충족**(`:195-198` — 목록 하나뿐). **상세 조회가 없다**(`fetchOne` 호출부 0건 — BE-042 §7.6). 상품 화면(목록 + 카테고리 = 2)과 대조 |
| 필터 연산 | 클릭당 전량 1-pass | **충족** — `filterCategoriesByUsage`(`types.ts:46-53`)가 O(n) 한 번. 검색이 없어 키 입력당 연산이 0이다 |
| 저장 요청 크기 | ≤ 1KB | **충족** — 입력이 `{ name }` 하나뿐이다(상품의 `ProductInput` 전체 치환과 극명한 대조 — NFR-041 §4.1) |
| 메모리 | 카테고리 전량 | 전량 보유. 수십 규모라 무시할 만하다 |
| 번들 | 이 화면 고유 코드 ≤ 12KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:277-285`). **좌측 필터가 남아** 조건이 화면에서 사라지지 않는다. 단 **툴바의 '전체 0개' 가 배너와 함께 남는다**(FS-042 §7 #13) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 모달 배너·입력 보존은 되나 **reference 없음**(EXC-20 gap) |
| **저장 실패(409)** | conflict 다이얼로그 + 입력 보존 | **미충족** — 어댑터가 409 를 정확히 던지는데 **화면이 generic 배너로 뭉갠다**(EXC-04 gap). 상품 화면은 같은 어댑터로 conflict 다이얼로그를 얻는다 |
| **삭제 실패(사용 중)** | '상품이 참조 중' 을 알리고 그 상품들로 데려간다 | **미충족 — 거짓 안내다.** '삭제하지 못했습니다. **잠시 후 다시 시도해 주세요**' 는 영원히 실패한다. 저장소는 정확한 문구('사용 중인 카테고리는 삭제할 수 없습니다.')를 알고 있는데 화면이 버린다(BE-042 §7.2) |
| 저장·삭제 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **잔여**: 모달 저장의 `onSuccess` 에 `aborted` 가드가 없어 닫힌 모달의 토스트가 뜰 수 있다 |
| **동시 편집(둘 다 존재)** | 나중 저장이 앞선 수정을 덮지 않는다 | **미충족 — last-write-wins**(BE-042 §7.1). **위험은 작다** — 덮이는 값이 이름 한 줄이다 |
| **연타로 중복 생성** | 요청 1건만 발사 | **미충족 — 같은 이름의 카테고리 2개가 생긴다**(EXC-08 gap + 유일 제약 부재 — BE-042 §7.3). **이 화면 최대 위험** |
| 수정 모달의 낡은 스냅샷 | 최신 값을 편집한다 | **미충족** — `fetchOne` 호출부가 없어 30초 낡은 행 데이터를 편집한다(BE-042 §7.6) |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족** — 손실은 작다(이름 한 줄) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 이 화면이 답하지 못하는 운영 질문

| 질문 | 현재 답 |
|---|---|
| **'이 카테고리를 쓰는 상품이 *무엇*인가'** | **답 없음 — 그런데 화면이 그것을 하라고 시킨다.** 상시 안내문(`:314-317`)이 '먼저 그 상품들의 카테고리를 바꾸거나 삭제하세요' 라고 말하면서 **어느 상품인지 알려주지도, 거기로 데려가지도 않는다.** 배지는 '12개 상품' 이라는 **건수만** 답한다. **`/products?category=<id>` URL 이 이미 실재하는데**(FS-041-EL-017) 링크가 없다 — FS-042 §7 #6 |
| '이 카테고리가 언제 만들어졌나 / 누가 만들었나' | **답 없음** — `ProductCategory` 에 시각·작성자 필드가 없다(`_shared/store.ts:17-20`) |
| '카테고리 이름을 누가 바꿨나' | **답 없음** — 변경 이력이 없다. **이름 변경은 그 카테고리를 쓰는 모든 상품의 표시를 바꾸는 행위인데**(BE-042 §7.10 라벨 전파) 흔적이 남지 않는다 |
| '카테고리 순서를 바꾸고 싶다 / 하위 분류를 만들고 싶다' | **답 없음** — 순서·계층 개념이 도메인에 없다(`id` + `label` 뿐). 목록이 등록 순으로만 나온다. **커머스 카테고리의 표준 기대와 어긋난다** — 의도된 단순화인지 미구현인지 미정(FS-042 §7 #20 · BE-042 §7.11 #11) |
| '같은 이름의 카테고리가 두 개인데 어느 게 진짜인가' | **답 없음 — 그리고 그 상황이 실제로 만들어질 수 있다**(EXC-08 gap + 유일 제약 부재) |

### 4.4 보존 · 감사

카테고리는 **상품의 분류 체계**다 — 하나를 고치면 그것을 쓰는 모든 상품의 표시가 바뀐다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 이름 변경이 이력으로 남는다 | **미충족** — 변경 이력이 없다. 라벨은 상품에 비정규화돼 전파되므로(BE-042 §7.10) **한 번의 수정이 N개 상품의 표시를 바꾼다**. 그 흔적이 없다 |
| 삭제된 카테고리를 참조하는 상품이 생기지 않는다 | **충족(설계)** — 사용 중이면 삭제를 막는다(3중: 버튼 잠금 · 저장소 throw · 서버 409). **다만 프론트 ①은 조회 시점 스냅샷이라 경합에서 뚫리고, 그때 ②의 실패 문구가 거짓말을 한다**(BE-042 §7.2) |
| 카테고리 id 가 재사용되지 않는다 | **미정** — 픽스처는 `prd-cat-<seq>` 로 단조 증가하나(`_shared/store.ts:676`) `categorySeq` 가 **모듈 전역**이라 새로고침 시 리셋된다(픽스처 한계). 서버 채번 규칙은 계약이 정하지 않았다(BE-042 §4 EP-02 — '그 형식은 계약이 아니다') |
| 카테고리 이름이 유일하다 | **미충족** — 스키마도 저장소도 중복을 막지 않는다(BE-042 §7.3). **연타 하나가 그것을 만든다**(EXC-08) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | EXC-04 · EXC-08 · EXC-06 · EXC-07 · EXC-20 | P0 · P0 · P1 | **모달이 `useCrudForm` 을 쓰지 않아 여덟 장치를 한꺼번에 상속하지 못했다** — status 분기 · conflict 다이얼로그 · 422 필드 매핑 · **동기 제출 락** · **멱등키** · reference code(+ 목록의 행 단위 `deletingId` · `onSuccess` aborted 가드). **한 뿌리를 뽑으면 P0 gap 2건이 함께 닫힌다.** 선행: `useCrudForm` 이 `useParams`/`useNavigate` 에 묶여 있어(`:74,76,223`) 모달에 그대로 쓸 수 없다 — **라우트 비의존 코어 + 라우트 어댑터로 분리**가 필요하다. **같은 모양의 모달이 앱에 5개 더 있다**(quality-bar FEEDBACK-06 의 appliesTo) | 이 화면 + **공용 `useCrudForm`**(횡단) | **UI 기획 (최우선 · 횡단)** |
| 2 | EXC-08 (결과) | P0 | **연타가 같은 이름의 카테고리 2개를 만든다** — 동기 락·멱등키 부재(#1) **×** 이름 유일 제약 부재. 그러면 상품 폼의 select 에 '아우터' 가 두 개 뜬다. **둘 중 하나만 고쳐도 사고는 남는다**(유일 제약만 있으면 두 번째 요청이 422 를 받아 성공한 등록이 실패로 보인다 — 멱등키가 그것을 막는다) | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-042 §7.3) |
| 3 | EXC-06 (최악 사례) | P1 | **'사용 중이라 삭제 불가'가 '잠시 후 다시 시도해 주세요' 로 보인다 — 거짓 안내다.** 영원히 실패한다. **저장소가 정확한 문구를 알고 있는데**(`_shared/store.ts:693`) **화면이 버린다.** 서버 409 + `error.code` 구분이 필요하고, **`HttpError` 에 `code` 를 실을 자리가 없다**(`http-error.ts:48-59` — `status`·`message`·`violations`·`reference` 뿐)인데 BE-003 §2 는 `error.code` 를 '프론트 분기의 유일한 근거' 라고 못박는다 | 이 화면 + BE 계약 + **`HttpError` 타입** | 백엔드 명세 (BE-042 §7.2) · **UI 기획/프론트 구현(`HttpError.code`)** |
| 4 | EXC-03 | P0 | **쓰기 게이팅이 '추가' 버튼 하나뿐** — `ProductCategoriesPage.tsx:181` 이 `canCreate` 만 꺼낸다. 행 수정·행 삭제·모달 저장이 게이팅되지 않는다. **훅은 이미 있다 — 즉시 해소 가능** | 이 화면 | UI 기획 쪽 변경 요청 |
| 5 | IA-04 · ERP-05 · ERP-15 · COMP-06 | P0 · P1 · P2 | **Pagination 없음** + **`<ul>` 이라 공유 `CrudTable` 템플릿 미사용** + count 요약이 toolbar 슬롯. **quality-bar IA-04 의 근거가 'members/categories 가 부분 이탈' 이라며 이 화면을 명시적으로 지목한다.** BE-042 §7.7 은 **서버 전량 응답이 옳다**(카테고리가 상품 화면의 필터 선택지이기도 하다)고 판정하며 **상한 도입**(예: 200)을 제안한다 — **표현(가상화·클라이언트 페이징)은 프론트 결정이며 계약과 무관하게 진행 가능** | 이 화면 + BE 계약(상한) | UI 기획 · 백엔드 명세 (BE-042 §7.7) |
| 6 | STATE-06 | P1 | **이 화면의 write 가 상품 화면의 read 를 stale 로 만드는데 invalidate 하지 않는다** — 키가 두 벌이다(`['product-categories','list']` vs `[products,'category-options']`). 카테고리를 추가하고 `/products/new` 로 가면 새 카테고리가 **새로고침 전에는 안 보인다**. **백엔드와 무관하게 지금 고칠 수 있다** | 이 화면 + FS-041 | UI 기획 쪽 변경 요청 |
| 7 | (§4.3) | — | **'그 상품들' 로 가는 경로가 없다** — 안내문이 시키면서 데려가지 않는다. 사용량 배지('12개 상품')를 **`/products?category=<id>` 링크로** 만들면 해결된다 — **그 URL 은 이미 실재한다**(FS-041-EL-017). #3 의 문구 개선과 한 묶음 | 이 화면 | UI 기획 쪽 변경 요청 |
| 8 | STATE-03 | P1 | 재조회 인디케이터 없음 — `CrudListShell` 의 `aria-busy={refreshing}` + ' · 새로고침 중…' 을 상속하지 못했다. 이전 행은 유지된다(STATE-01 pass) | 이 화면 | UI 기획 쪽 변경 요청 |
| 9 | EXC-09 (잔여) | P0 | **모달 저장의 `onSuccess` 에 `aborted` 가드가 없다**(`:86,93`) — `useCrudForm`·`useCrudList`·`useCrudRowUpdate`·이 화면의 **삭제**는 전부 그 가드를 두는데 모달 저장만 없다. 취소된 요청이 완료되면 **닫힌 모달의 성공 토스트가 뜬다**. 요구의 세 절은 충족하므로 P0 는 pass — 잔여만 이관 | 이 화면 | UI 기획 |
| 10 | COMP-01 · COMP-08 | P1 · P2 | 행 액션 2개가 `buttonStyle('ghost')` + `tds-ui-btn-ghost` 손조립(`dangerGhostStyle` 로 variant 를 손으로 파생) · 모달 제출이 `loading` prop 대신 손으로 쓴 '저장 중…'. **요구가 'ghost icon 버튼 포함' 을 명시한다** | 이 화면 | UI 기획 쪽 변경 요청 |
| 11 | A11Y-16 · ERP-13 · EXC-17 | P1 · P2 | **삭제 버튼 접근 이름의 조사 오류** — `'12개 상품라 삭제할 수 없습니다'`(받침이 있으므로 '이라'). fragment 연결이라 EXC-17 도 위반. **`shared/format` 에 이 조사(이라/라)를 고르는 헬퍼가 없다**(`objectParticle`·`topicParticle` 뿐) | 이 화면 + `shared/format` | UI 기획 쪽 변경 요청 |
| 12 | A11Y-16 (부분) | P1 | **목록에 항상-마운트 live region 이 없다** — 필터로 0행이 되는 전환이 AT 에 들리지 않는다. `Empty` 의 `role="status"` 는 **내용과 함께 생성**되는 노드라 NVDA/JAWS 에서 신뢰성이 낮다(`CrudListShell.tsx:99-106` 이 정확히 그 이유로 껍데기에 지속 region 을 둔다) | 이 화면 | UI 기획 |
| 13 | COMP-12 | P2 | 이름 입력에 카운터 없음(40자) · 상한 근접 경고 없음 · counting 기준 미정의. **40자라 실무 위험은 작다** | 이 화면 | UI 기획 |
| 14 | (BE-042 §7.6) | — | **수정 모달이 30초 낡은 스냅샷을 편집한다** — `fetchOne` 호출부가 0건. #1 의 conflict 경로와 토큰(BE-042 §7.1)이 그 위험을 막지만, 그전에는 낡은 값이 최신을 덮는다 | 이 화면 | UI 기획 |
| 15 | (BE-042 §7.9) | — | **`/products/categories` 가 `/products` 와 별개 권한 리소스라 상품만 관리하는 역할이 카테고리 선택지를 못 읽을 수 있다** — 권한 모델이 '이 리소스의 read 는 다른 리소스의 read 로도 만족된다' 를 표현할 자리가 없다(리소스가 곧 nav 잎이다) | **권한 모델**(앱 전역) | 아키텍처 · UI 기획 |
| 16 | (§4.1) | — | **`productCount` 집계가 O(카테고리 × 상품)** — 서버는 GROUP BY 한 번. 픽스처(5×5)에서는 드러나지 않는다 | BE 계약 | 백엔드 명세 (BE-042 §7.7) |
| 17 | (§4.3 · §4.4) | — | **감사 축 부재** — 이름 변경 이력 없음(그 한 번이 N개 상품의 표시를 바꾼다) · `createdAt`/작성자 없음 · **순서·계층 없음**(커머스 카테고리의 표준 기대와 어긋난다 — 의도된 단순화인지 미정) | BE 계약 + **도메인 확정** | 백엔드 명세 · **아키텍처** |
| 18 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 모달 입력을 버린다(손실 작음) | **앱 전역** | 프론트 구현 · UI 기획 |
| 19 | **FEEDBACK-06** | **P0** | ★ **신규 — DS `Modal` 의 일방향 latch 가 이 화면의 폼 모달을 죽인다.** `closingRef` 는 `Modal.tsx:124` 에서 걸리기만 하고 **리셋이 코드 어디에도 없다**. `useModalDirtyGuard` 가 dirty 일 때 `onClose()` 대신 `setAsking(true)` 로 veto 하면(`useModalDirtyGuard.tsx:53-58`) 부모가 언마운트하지 않는데, Modal 은 이미 `closing=true` 로 잠긴 뒤다 → 파기 확인에서 '취소'(머무르기 · `:73`)를 누르면 **모달이 `opacity:0`(`Modal.css:35-38` `forwards`) + `pointer-events:none`(`:26-28`) 인 채 영구히 남고 이후 모든 Esc/딤/× 가 `Modal.tsx:123` 에서 즉시 return** — 입력이 갇힌다. reduced-motion/jsdom 은 `willAnimate()` 가 false 라 `onClose()` 를 동기 발사(`Modal.tsx:129-132`)해 **보이는데 무반응**이 된다. 근인: `Modal.tsx:19-25` 의 'onClose() → 부모가 언마운트' 전제를 dirty 가드가 깨고, `onClose` 가 `void` 반환이라 **veto 신호가 Modal 에 닿지 않는다**. **폭발 반경 9곳**(`onClose={requestClose}`): `CreateGroupModal.tsx:154` · `LogoFormModal.tsx:126` · `PasswordChangeModal.tsx:103` · `RoleFormModal.tsx:68` · `PortfolioCategoryFormModal.tsx:104` · **`ProductCategoryFormModal.tsx:104`** · `CreateApiKeyModal.tsx:182` · `RevealKeyModal.tsx:126` · `CategoryFormModal.tsx:106`. **Toast 는 같은 패턴이나 버그가 아니다** — `exitingRef` 도 리셋 안 되지만 `onDismiss` 를 ToastProvider 큐 `filter` 가 소유해 veto 경로가 없다 | **`packages/ui` 의 Modal**(화면 코드로 해소 불가 — 이 화면의 배선은 옳다) | **프론트 리팩터 / DS** · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`productCategoryAdapter` 는 `createStoreAdapter({ scope: 'product-categories', … })`(`data-source.ts:17-18,21-31`)라 `failIfRequested('product-categories', op)` 를 부른다. **실재하는 op 는 4개**이나 **하나는 도달 불가**다:

| op | 호출 지점 | 재현 | 비고 |
|---|---|---|---|
| `list` | `createStoreAdapter.fetchAll` (`crud.ts:176`) | `?fail=list` · `?fail=product-categories:list` · `?fail=all` | — |
| `detail` | `createStoreAdapter.fetchOne` (`crud.ts:181`) | — | **도달 불가 — 화면에 `fetchOne` 호출부가 0건이다**(BE-042 §7.6). `?fail=detail` 은 이 화면에서 아무 효과가 없다 |
| `save` | `create`(`:199`) · `update`(`:207`) | `?fail=save` · `?fail=product-categories:save` | 등록·수정이 같은 op 를 공유한다 — 따로 실패시킬 수 없다 |
| `delete` | `remove`(`:228`) | `?fail=delete` · `?fail=product-categories:delete` | — |

- **⚠ 상품 화면과 scope 가 다르다**: 이 화면은 `product-categories`, 상품 화면은 `products`(그리고 상품 화면의 **카테고리 선택지 조회는 `products`/`list` 를 쓴다** — `items/data-source.ts:17,34`). 즉 **`?fail=product-categories:list` 는 이 화면만 실패시키고 상품 화면의 선택지는 멀쩡하다.** 두 화면이 같은 서버 리소스를 볼 예정인데(BE-042 §7.6) 실패 스위치가 갈려 있다 — **§5 #6(키 통합)과 같은 뿌리다.**
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **좌측 필터 클릭·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 그렇다). **대조**: 같은 스위치로 `/products/prd-1/edit` 를 저장하면 상품 화면은 다이얼로그를 띄운다 — **같은 어댑터·다른 화면 코드** |
| EXC-04 (토큰) | `grep -n "version\|updatedAt\|If-Match" pages/products/_shared/store.ts pages/products/categories/data-source.ts` → **0건이면 gap**(현재 0건) |
| EXC-08 (동기 락·멱등키) | `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/pages/products/categories` → **0건이면 gap**(현재 0건). 실동작: 모달에서 '추가' 를 연타해 **같은 이름의 카테고리가 2개 생기는지** |
| EXC-06 (status별 surface) | `?status=save:409` · `save:422` · `save:500` · `delete:403` · `delete:409` — **전부 같은 배너면 gap**(현재 그렇다) |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 '저장하지 못했습니다') |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fproducts%2Fcategories&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — reference 가 안 보이면 gap(현재 안 보인다) |
| **'사용 중' 삭제 차단** | **`?status=` 로 재현 불가** — 그 throw 는 `_shared/store.ts:693` 의 **generic `Error`** 이고 `failIfRequested` 보다 뒤에 있다. **재현 방법**: 픽스처에서 '아우터'(`prd-1` 이 사용 중)의 삭제 버튼을 강제로 활성화하거나, `removeProductCategory` 를 직접 호출한다. **코드 대조로 판정했다** |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**:
- `grep` — TOKEN-01(hex/px/키워드 0건 · `opacity` 리터럴 0건) · A11Y-12(`aria-current` 0건) · ERP-13(조사 리터럴 0건) · ERP-06(`toLocaleString` 0건) · COMP-01(`buttonStyle(`/`tds-ui-btn-` **2건 — gap**) · COMP-03/COMP-10(`type="search"`/`SearchField` 0건) · EXC-14(`onMutate`/`setQueryData` 0건) · IA-04(`<Pagination`/`<table`/`CrudTable` 0건) 판정.
- **RTL** — **A11Y-11 은 grep 으로 판정할 수 없다.** `aria-required` 가 `FormField` 의 `cloneElement` 로 **런타임 주입**되므로(`FormField.tsx:50-56`) 소스에 그 문자열이 없다. 모달을 렌더해 `getByLabelText('카테고리 이름')` 의 `aria-required === 'true'` 를 assert 해야 한다. `aria-describedby` ↔ `role="alert"` id 일치도 RTL 로.
- `categories.test.ts` — 순수 규칙 회귀(`usageLabel`·`filterCategoriesByUsage`·`countCategoriesByUsage`) + `productCategorySchema` 검증 2케이스. **이 화면에 컴포넌트 테스트는 없다** — 모달의 4경로 가드(FEEDBACK-06 pass)·`initialFocusRef`(A11Y-13 pass) 같은 렌더 계약은 e2e 와 코드 대조에만 의존한다. **다만 그 계약의 정본인 `shared/ui/useModalDirtyGuard.test.tsx` 는 실재한다** — 훅 수준 회귀는 거기서 잡힌다.
- 공용 모듈 테스트 — `shared/crud/{crud.test.ts,useListState.test.tsx}` 가 이 화면이 상속하는 계약(409·멱등 원장·URL 직렬화)의 회귀 방어선이다. **다만 멱등 원장은 이 화면에서 키가 도달하지 않아 놀고 있다**(EXC-08 gap).

**알려진 flaky (참고)**: `shared/errors/http-error.test.ts:92` (`expect(codes.size).toBe(50)`)가 **birthday 충돌로 flaky** 하다 — `createErrorReference()` = `TDS-<Date.now() base36>-<3자리 base36 난수>`(`http-error.ts:68-75`), 난수 공간 46,656, 같은 ms 안 50개 충돌 확률 ≈ **2.6%**. **이 화면은 `reference` 를 쓰지 않으므로**(EXC-20 gap) 직접 영향은 없으나, §5 #1 로 `useCrudForm` 을 도입하면 그 값을 쓰게 된다 — **관련 사실로 기록한다**(수정은 이 배치의 경계 밖이다).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서(STATE-01,02,04 · TOKEN-01..05 · COMP-10 · FEEDBACK-02,04,06 · A11Y-01,02,11,12 · MOTION-01,02,03 · IA-01,02,04,05,13 · EXC-01,02,03,04,08,09)로 판정했다. 빈칸 0건
- [x] **STATE-01 을 '저수준 훅 소비 = gap' 으로 단정하지 않고 코드로 재확인**했다 — `ProductCategoriesPage.tsx:203-205` 가 `firstLoading` 을 로컬 파생하고 주석이 그 결정을 적는다 → **pass**. 오탐을 피했다
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 — 페이지네이션·선택 부재 / COMP-10 — 텍스트 검색 입력 부재(필터가 aria-pressed 토글) / FEEDBACK-04 — page 폼 부재, modal 은 FEEDBACK-06 소관 / IA-05 — 폼 route 쌍 부재, IA-06 의 무게 규칙에 따른 modal 편집)
- [x] §2.1 산수 검산 — 11 pass + 11 종속 + 4 n-a + 4 gap = **30** ✔
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다 — MOTION-03 에서 **`ToggleSwitch` 가 이 화면에 없음**(상품 화면과 대조)을 명시해 없는 표면을 적지 않았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(검색·재정렬·업로드·날짜범위·금액·CSV·일괄작업)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`product-categories`)와 op 4종을 **어댑터 코드에서 확인**했고, **`detail` op 이 호출부 부재로 도달 불가**함과 **'사용 중' 삭제 차단이 `?status=` 로 재현 불가**함을 발견해 기록했다. **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] **'판정 기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다
- [x] **`createStoreAdapter` 가 준 것(404·409·멱등)과 이 화면이 활용하지 못하는 것을 EXC-04·EXC-08 판정에서 흐리지 않고 구분**했다 — 409 는 발생하나 화면이 버리고, 멱등 원장은 키가 도달하지 않아 논다. **'존재 여부' 기반이라 동시 편집은 여전히 last-write-wins**
- [x] **A11Y-11 을 grep 이 아니라 런타임 주입 메커니즘으로 판정**했고, 그것이 grep 으로 판정 불가함을 §6 에 명시했다
- [x] **FEEDBACK-06 이 이 화면을 명시적으로 지목함**을 확인하고 4경로 통합의 코드 근거(`:65,104,113,154`)를 댔다 — **pass**
- [x] §5 의 gap 이 FS-042 §7 · BE-042 §7.11 과 일치한다
</content>
