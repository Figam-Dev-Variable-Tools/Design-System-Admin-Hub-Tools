---
id: NFR-044
title: "교환/반품 비기능 명세"
functionalSpec: FS-044
backendSpec: BE-044
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-044. 교환/반품 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-044 교환/반품 (`/products/returns` · `/products/returns/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-044(요소·예외) · BE-044(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-044 §7 · BE-044 §7.11 과 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = 4b805ad`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` 훅 · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**금액·재고를 움직이는 화면이다.** 완료 처리는 상품 SKU 재고를 실제로 증감시키고(`data-source.ts:167-170`) `stockAppliedAt` 이 그것을 못박아 되돌릴 수 없다 — `returns.test.ts:212-221` 이 그 불가역성을 회귀로 고정한다. 그래서 이 화면의 P0 판정은 **비가역 액션의 게이트(FEEDBACK-02)** · **중복 제출(EXC-08)** · **동시성(EXC-04)** 에서 다른 목록 화면보다 무겁게 읽어야 한다. 동시에 이 화면은 **`useRouteWritePermissions` 를 배선한 앱 전체 8곳 중 하나**라 EXC-03 을 통과하는 드문 화면이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **목록**: `ReturnsListPage.tsx:120` 이 `useCrudListQuery` 를 직접 쓰지만 `:122` 에서 `const firstLoading = isFetching && data === undefined` 를 **로컬로 파생**하고, 그 값만 스켈레톤(`:203`)·요약 문구(`:185`)를 지배한다. `aria-busy` 는 별도로 `isFetching` 을 받으므로(`:188`) **busy(재조회 표시)와 스켈레톤(본문 대체)이 분리**돼 있다 — 재조회 중 이전 행이 유지된다. `useCrudListQuery` 는 `placeholderData: (previous) => previous`(`crud.ts:254`)로 그 유지를 뒷받침한다. **상세**: `:259` 가 `request === undefined` 로 판정해 재조회 중 카드를 유지한다. **상품 조회**도 `product === undefined`(`:387`). 네 개의 data view 가 전부 `{first-load, refetching-with-data, empty, error}` 중 하나만 그린다 | `/products/returns` 진입 → 데이터 렌더 확인 → 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 세 read 실패가 전부 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`:130-143`) `<Alert tone="danger">` + '다시 시도'(`refetch`). **상세**(`:218-241`) 404 → '요청을 찾을 수 없습니다…' + '목록으로' / 그 밖 → '요청을 불러오지 못했습니다.' + **'다시 시도'** + '목록으로'. **상품 옵션**(`:372-386`) 같은 404/일반 분기. read 실패에 toast 를 쓰지 않고(`toast` 소비는 저장 성공 1곳 — `:194`), empty 로 폴백하지 않는다(error 분기가 empty 보다 앞선다) | 각 조회를 `?fail=list` · `?fail=detail` 로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **페이지네이션이 없고**(FS-044-EL-007 — `visible.map` 이 전량을 렌더한다, `:229`) ② **행 선택이 없다**(삭제·일괄 작업이 범위 밖 — BE-044 §7.6). `ReturnsListPage` 는 `CrudListShell`/`useCrudList` 를 쓰지 않아 `selectedIds` 자체가 없다. 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션·행 선택이 도입되면 이 판정을 다시 매긴다. `useListState` 는 `clampPage`(`useListState.ts:217-223`)와 선택 리셋(`:205-213`)을 이미 갖고 있어 배선만 하면 된다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/products/returns/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 5)`(`:90-92`) 같은 space 토큰 배수로만 표현한다. `box-shadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/products/returns` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`ReturnsListPage.tsx:242` 접수번호 링크 · `ReturnDetailPage.tsx:247` 목록으로) · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>`. **이 화면이 focus ring 을 직접 선언하지 않는다** — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `:208`) · Toast(`:194`) · DS `<Button>` transition · 이탈 가드 Modal. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` 4개(`:260,265,366,411`) · Toast · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ReturnDetailPage.tsx:256`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. 카드 제목은 `CardTitle`(`<h2>` + `cardTitleStyle` — `shared/ui/Card.tsx:39`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/products/returns/:id` 의 '교환/반품 처리' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `ReturnsListPage.tsx:149-153` 이 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드한다. 그 props 가 `onCompositionStart/End` + `onKeyDown` 을 싣고(`useListState.ts:50-54` → `useDebouncedSearch.ts:105-131`), ① 조합 중에는 커밋하지 않으며(`:87`) ② 조합 종료 후 **250ms 디바운스**로 커밋하고(`:23,93-95`) ③ **조합 중 Enter 를 가로챈다**(`:121-124` — `event.nativeEvent.isComposing \|\| composingRef.current` 두 신호를 함께 본다). 순서 뒤바뀐 응답은 이 화면에 없다 — 검색이 클라이언트 필터라 요청 자체가 나가지 않는다(`:124-128`) | `/products/returns` 검색창에 IME 로 '루미엔' 입력. **조합 중 '루ㅁ'·'루미' 같은 부분 문자열이 필터에 커밋되지 않아야 pass.** 조합 중 Enter 가 제출하지 않는지, 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **미충족.** 이 화면의 **비가역 액션은 완료 처리**다 — '처리 저장'(`:351-361`)을 상태='완료'로 누르면 어댑터가 상품 SKU 재고를 실제로 증감시키고(`data-source.ts:165-176` → `updateProduct`) `stockAppliedAt` 을 찍어 **재실행을 영구히 차단한다**(`:145`). `returns.test.ts:212-221` 이 '이미 반영된 요청을 다시 저장해도 재고가 또 움직이지 않는다'로 그 불가역성을 고정한다. **그런데 이 액션에 `ConfirmDialog` 게이트가 없다** — 클릭 한 번이 곧 실행이다. 완화 요인: `ExchangeOptionField` 가 `aria-live="polite"` 로 '완료 처리 시 재고가 이렇게 움직입니다'를 예고하고(`ExchangeOptionField.tsx:107-135`) 저장 버튼이 재고 위반 시 잠긴다(`:356`). **그러나 예고는 게이트가 아니다** — 요구는 '파괴적/비가역 액션은 ConfirmDialog 로 게이트'이며, `ConfirmDialog` 를 실제로 세우는 유일한 표면은 discard intent(이탈 가드 — `:156`)뿐이다. 형제 화면 `ReviewDetailPage.tsx:305-316` 은 삭제에 이 게이트를 갖고 있다 | 상세에서 상태를 '완료'로 바꾸고 교환 옵션을 고른 뒤 '처리 저장' 클릭. **확인 다이얼로그 없이 즉시 재고가 움직이면 gap.** `?fail=save` 로 실패시켰을 때 다이얼로그가 아니라 카드 배너가 뜨는 것(`:271-280`)은 게이트 자체가 없다는 방증이다 | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | `ReturnDetailPage.tsx:156` 이 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 RHF `isDirty` 가 아니라 도메인 판정(`:151-155` — 상태·메모·교환 옵션 중 하나라도 원본과 다르면 true. 옵션 배열은 `optionLabel` 문자열로 환산해 **값 비교**한다)이며 **계약상 등가**다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:8-14`). 저장 성공 시 상세가 재조회돼 `useEffect([request])`(`:139-144`)가 세 값을 원본으로 되돌려 dirty 가 풀린다 | 상세에서 메모 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로' 버튼(FS-044-EL-011·EL-022)은 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 이는 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-044 §7 #9 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 처리 폼은 modal 이 아니라 상세 라우트의 `Card` 로 렌더된다(`:265-363`). 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력 필드가 없는 확인 다이얼로그다(그 자신이 FEEDBACK-04 의 산물이다) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success(…)`(`:194-198`, 재고 반영 여부로 문구가 갈린다). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(`:418`). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 discard 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 3개를 전수 확인했다.** ① **교환 옵션 select** — `ExchangeOptionField.tsx:87-89` 가 `isInvalid`·`aria-invalid={invalid}`·`aria-describedby={invalid ? errorIdOf('return-exchange-option') : undefined}` 를 **짝으로** 세우고, 감싸는 `FormField htmlFor="return-exchange-option" … required`(`:76-82`)가 `<p id={errorIdOf(…)} role="alert">` 를 렌더한다(`FormField.tsx:110-112`) — id 가 일치한다. `required` 는 자식이 **DS `SelectField`** 라 `withAriaRequired` 가 런타임에 `aria-required` 를 주입한다(`FormField.tsx:36-56` — 허용 대상은 네이티브 `input/select/textarea` 와 `SelectField` 뿐). ② **처리 상태 select**(`ReturnDetailPage.tsx:316-331`) — 오류 상태가 없어 `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않는다. ③ **처리 메모 textarea** — `TextareaField` 가 `aria-invalid`/`aria-describedby`/`required`/`aria-required` 를 내부에서 배선한다(`TextareaField.tsx:62-67`). **짝 없는 `aria-invalid` 0건**(grep: 이 디렉터리의 히트 1건 = `ExchangeOptionField.tsx:88`, 바로 다음 줄이 describedby) | `grep -rn "aria-invalid" apps/admin/src/pages/products/returns` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL 로 교환 요청에서 옵션을 비운 채 상태를 '완료'로 바꿔 `select.getAttribute('aria-describedby') === screen.getByRole('alert').id` 와 `select.getAttribute('aria-required') === 'true'` 를 assert. **경미 잔여**(이 요구의 acceptanceCheck 밖): `ExchangeOptionField.tsx:81` 의 `hint` 가 유효 상태에서 `hintIdOf` 로 연결되지 않는다 — `settings/_shared/fields.tsx:22` 는 그 배선을 갖고 있다(§5 #10) | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 2개**다(`ReturnsListPage.tsx:155-181`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current`·`aria-pressed` grep **0건**. (형제 화면 `products/items` 는 `FilterPanel` 토글을 쓰므로 그 문서에서 판정된다) | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면: 이탈 가드 `ConfirmDialog`(`:418`). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. (참고: `packages/ui/src` 에 Motion/AnimatePresence 소비가 0건이므로 소유 문서에서 gap 일 가능성이 높다 — **그 판정은 이 문서의 몫이 아니다**) | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트(`:194`). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `:208`) · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **요구가 명시적으로 지목한 `ToggleSwitch` 는 이 화면에 없다** — 형제 화면(쿠폰·리뷰)에만 있다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:235-236` — `/products/returns` · `/products/returns/:id`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={columnStyle}>`(`ReturnsListPage.tsx:146`) · `<div style={pageStyle}>`(`ReturnDetailPage.tsx:244`)다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족(사유가 F2 때와 바뀌었다).** `findCoveringLeaf`(`nav-config.ts:269-279`) 도입으로 **브랜치 폴백은 해소됐다** — `/products/returns/:id` 는 자기를 감싸는 가장 긴 잎 `/products/returns`(`nav-config.ts:148`)를 찾아 AppHeader 가 `<h1>교환/반품</h1>` 을 그린다(`:297-298` → `AppHeader.tsx:92,101`). '상품 관리'로 떨어지지 않는다. **그러나 상세가 자체 `<h1>교환/반품 처리</h1>` 를 또 그린다**(`ReturnDetailPage.tsx:256`) → **`<h1>` 이 2개**다. 게다가 목록은 in-content `<h1>` 이 없어(제목이 AppHeader 에서 온다) **title 소스 모델이 화면 타입마다 모순**이고, `nav-config.ts:293-295` 주석이 밝히듯 **'처리' 같은 행위는 AppHeader 제목에 넣지 않는 것이 의도**라 두 h1 이 서로 다른 것을 말한다. 요구가 정의하는 '단일 page-header/title 모델'이 성립하지 않는다 | `/products/returns/:id` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록 `/products/returns` 는 1개(정상 — 잎 라벨 '교환/반품') — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·필터(`:147-182`) → 결과 count 요약(`:184-186`) → table(`:188`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 요청 생성이 범위 밖이다(BE-044 §7.6). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** `visible.map(...)`(`:229`)이 전량을 렌더하며 페이지네이션 컴포넌트가 없다(`<Pagination` grep: 앱 전체 11파일 중 이 화면 0건). 교환/반품은 상한 없이 매일 쌓이는 컬렉션이라 'page size 초과 가능'이 확실하다(BE-044 §7.9) | 픽스처를 20건 이상으로 늘리고 `/products/returns` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 요청 생성이 범위 밖이고(BE-044 §7.6) 처리는 `/new`·`/:id/edit` 폼이 아니라 상세 라우트(`/products/returns/:id`) 안의 카드에서 일어난다. `App.tsx:235-236` 이 라우트 2개(목록·상세)뿐임을 보인다 — '`:id` 로 구분되는 하나의 컴포넌트/route 쌍' 이라는 요구 자체가 걸리지 않는다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 유형·상태·검색어의 **단일 원천이 URL 쿼리스트링**이다. `:108` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { kind: 'all', status: 'all' }` — `:61`), 그 훅이 `useSearchParams` 로 `?kind=`·`?status=`·`?q=` 를 읽고 쓴다(`useListState.ts:87-129`). 기본값과 같은 값은 URL 에서 지워지고(`:114-118`) 갱신은 `replace: true`(`:125`)라 검색어 한 줄에 history 가 쌓이지 않는다. 손으로 고친 값은 `parseFilter`(`:109-118`)가 되돌린다. 결과: 필터를 걸고 상세에 들어갔다 Back 하면 조건이 복원되고, 필터 걸린 view 를 링크로 공유할 수 있으며 F5 도 같다. **`sort` 는 이 화면에 정렬 UI 가 없어 쓰이지 않고, `page` 는 페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | `/products/returns` 에서 유형='교환' + 상태='검수중' + 검색='루미엔' 적용 → URL 이 `?kind=exchange&status=inspecting&q=루미엔` 인지 확인 → 행 클릭으로 상세 진입 → 브라우저 Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:484-493` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `isUnauthorized` → `notifySessionExpired()`(`queryClient.ts:31-44`) → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회 3종·저장이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fproducts%2Freturns&reason=session_expired` 로 이동하는지 확인. (미저장 처리 내용 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 이 화면은 `useRouteWritePermissions` 를 배선한 앱 전체 8곳 중 하나다.** ① **read 게이팅(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490-492`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/products/returns/:id` 같은 하위 라우트까지 덮는다(`route-resource.ts` → `findCoveringLeaf` — 제목과 **같은 규칙**을 쓴다). ② **write 게이팅(직접)**: `ReturnDetailPage.tsx:110` 이 `const { canUpdate } = useRouteWritePermissions()` 를 구독하고, 그 값이 쓰기 표면 **전부**를 지배한다 — 상태 select 비활성(`:320`) · 메모 비활성(`:338`) · 교환 옵션 비활성(`optionLocked` — `:149,399`) · **'처리 저장' 미렌더**(`:351`) · 안내 배너 노출(`:343-345`). ③ **강등 reconcile**: 권한 스토어가 바뀌면 훅 구독자가 재렌더되므로 별도 코드 없이 버튼이 사라진다(`RequirePermission.tsx:22-26`). 목록에는 쓰기 컨트롤이 아예 없어 게이팅할 표면이 없다 | 권한 스토어에서 `page:/products/returns` 의 `update` 를 끈 뒤 `/products/returns/:id` 진입. **'처리 저장' 버튼이 사라지고 '이 요청을 처리할 권한이 없습니다. 조회만 가능합니다.' 배너가 뜨면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인. **잔여(이 요구의 gap 은 아니다)**: 서버 403 이 오면 '저장하지 못했습니다' 일반 배너로 뭉개진다(`:210`) — `isForbidden` 미사용. 그것은 EXC-06 P1 사안이다(§3) | **pass** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소됐다** — 어댑터가 공용 `createCrudAdapter` 라 없는 id 에 **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** 를 던진다(`crud.ts:126-128`). ② **그러나 화면에 409 해소 UI 가 없다** — `onError`(`:203-212`)에 `isUnprocessable` 분기만 있고 `isConflict`(`http-error.ts:105-107`) 분기가 없다. 409 는 `setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')` 로 떨어진다 — **재시도하면 또 409 인 실패에 '다시 시도'를 권한다.** 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 conflict 다이얼로그(`useCrudForm.ts:166-179` — 입력 보존 + reload/dismiss)를 상속하지 못했다. ③ **낙관적 동시성 토큰이 없다** — `ReturnRequest` 에 `version`/`updatedAt` 필드가 없고(`types.ts:43-73`) `update` 가 `If-Match` 를 보내지 않는다. 현 409 는 **'존재 여부' 기반**이므로 **동시 편집(둘 다 존재)은 여전히 last-write-wins** 다: 두 운영자가 하나는 '반려', 하나는 '완료'를 저장하면 나중 것이 이긴다. **재고 이중 이동만은 `stockAppliedAt` 이 막는다**(`data-source.ts:145`) — 그 구분을 흐리지 말 것 | `?status=save:409` 로 상세에서 '처리 저장'. **conflict 다이얼로그 없이 '저장하지 못했습니다' 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/products/returns` → 0건으로 확인 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `onSave`(`:173-215`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다** — 이 화면이 `useCrudForm` 을 쓰지 않고 저수준 `useCrudUpdate` 를 직접 부르기 때문이다. 그 훅이 제공하는 두 장치(`useCrudForm.ts:103` `submitLockRef` · `:118-123,211` `idempotencyKeyRef`/`takeIdempotencyKey`)를 상속하지 못했다. **자리는 이미 비어 있다**: `UpdateVars.idempotencyKey`(`crud.ts:301`)와 어댑터 원장(`crud.ts:62-72,121`)이 존재하는데 `update.mutate({ id, input, signal })`(`:181-190`)가 키를 넣지 않아 **원장이 영원히 발현되지 않는다.** 방어는 `disabled={saving \|\| !dirty \|\| pendingIssue !== null}`(`:356`) + DS `loading` 하나뿐이다. **완화 요인 둘**: (a) 버튼이 `type="submit"` 이 아니라 `onClick` 이라 RHF 비동기 검증 지연이 없어 창이 좁다 (b) **재고 이중 이동은 도메인 가드가 막는다** — 어댑터가 `isStockApplied(current)` 면 이동을 건너뛰므로(`data-source.ts:145`) 두 번째 요청이 통과해도 재고는 한 번만 움직인다(`returns.test.ts:212-221`). **그러나 상태·메모 저장은 두 번 적용되고**, 요구가 명시한 두 장치(sync lock + per-attempt idempotency key)는 부재다 | 상세에서 '처리 저장'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** 코드상 `grep -rn "submitLockRef\|idempotencyKey" apps/admin/src/pages/products/returns` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | 세 지점이 전부 배선돼 있다. ① **onError** — `if (isAbort(cause)) return;`(`:204`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). ② **onSuccess** — `if (controller.signal.aborted) return;`(`:193`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:137`)가 이탈 시 진행 중 저장을 취소한다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다. bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다(취소된 요청) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 · STATE-02 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **4** | STATE-04 · FEEDBACK-06 · A11Y-12 · IA-05 |
| `gap` | **5** | FEEDBACK-02 · IA-02 · IA-04 · EXC-04 · EXC-08 |
| **합계** | **30** | 11 + 10 + 4 + 5 = **30** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.** 이 중 **IA-02 · IA-04** 는 앱 전역의 같은 뿌리(sub-route h1 이중 · 목록 페이징 부재)를 공유하므로 화면 단위가 아니라 **횡단 배치**로 푸는 것이 옳다. **FEEDBACK-02 · EXC-04 · EXC-08 은 이 화면 고유이며 전부 재고·동시성에 걸린다** — 금액을 다루는 화면이라 우선순위가 높다(§1.2).
>
> **F3a/F3b/통합 이후 달라진 것(참고)**: STATE-01(로컬 `firstLoading` 파생) · COMP-10(`useDebouncedSearch` 소비) · IA-13(`useListState` 소비) · EXC-03(`useRouteWritePermissions` 소비) · A11Y-11(`FormField` 의 `aria-required` 런타임 주입)이 이 화면에서 **pass** 다. IA-02 는 여전히 gap 이나 **사유가 바뀌었다** — 브랜치 폴백('상품 관리')은 `findCoveringLeaf` 로 해소됐고, 남은 것은 **h1 이중**이다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·페이지네이션 range·토글 필터·optimistic write)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. 화면이 `firstLoading` 을 파생해(`:122`) 그 이득을 실제로 쓴다 — STATE-01 과 같은 뿌리에서 함께 충족된다. **다만 '가벼운 refetch 인디케이터'는 `aria-busy={isFetching}`(`:188`) 뿐이라 시각 표현이 없다** — `CrudListShell` 은 요약에 '· 새로고침 중…'을 덧붙이는데(`CrudListShell.tsx:120`) 이 화면은 그 셸을 쓰지 않는다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되는지 | **pass(단 가시 인디케이터 없음)** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`:217-226`) — 검색 0건/필터 0건/진짜 0건 3분기 + 복구 액션('검색 지우기'/'필터 초기화')이 맥락(`hasQuery`·`hasActiveFilters`)에서 파생된다. 조사(이/가)는 `Empty` 가 받침으로 고른다(`Empty.tsx:16-27`). `createVerb="접수"` 로 '접수된 교환/반품 요청이 없습니다'가 된다. **생성 CTA 를 주지 않는 것은 정당하다** — 관리자가 요청을 만들지 않는다(BE-044 §7.6) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기, 필터로 0건 → '필터에 맞는 …' + 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:312-315`) 화면이 상세와 **상품까지** 재조회한다(`:199-201`) — 재고가 움직였으면 선택지의 재고 수치도 즉시 되맞는다. 자기 변경이 바로 보인다 | 상세에서 상태 변경 후 목록 복귀 시 배지가 갱신돼 있는지. 완료 처리 후 교환 옵션의 재고 수치가 갱신되는지 | **pass** |
| COMP-01 | P1 | 모든 버튼이 DS `<Button>` 이고(`:136,230,234,348,352,381`) 진행 상태를 **`loading` prop** 으로 표현한다(`:355`) — 손으로 쓴 '저장 중…' 라벨이 없다. `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/returns` = **0건**. 접수번호는 `<Link className="tds-ui-link tds-ui-focusable">`(`:240-243`) — 링크는 버튼이 아니므로 요구 밖이다. **quality-bar 가 appliesTo 에 `ReturnsListPage` 를 명시 지목했으나 그 위반(`buttonStyle`+손조립 '상세' 버튼)은 이미 해소됐다** — 형제 `CouponFormPage.tsx:446` 은 아직 손으로 쓴 라벨을 쓴다 | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/returns -r` → 0건 | **pass** |
| COMP-06 | P2 | 스켈레톤 **셀 수는 표 정의에서 파생**한다(`:206` `COLUMNS.length + 1` — `:63` 주석이 그 의도를 명시). **그러나 행 수는 하드코딩 `SKELETON_ROWS = 5`**(`:74,204`)다. 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다(IA-04 gap 과 연동). 공유 `SkeletonRows(rows, cols)` helper 도 없다 | `grep "length: 5" pages/products/returns` → 상수로 뽑혀 있어 리터럴은 없으나, 값은 여전히 5 고정 | **gap(부분)** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`:237`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소해 페이지네이션을 도입하는 순간 2페이지 첫 행이 1로 리셋된다. **quality-bar 가 appliesTo 에 `ReturnsListPage` 를 명시 지목** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다** — quality-bar 가 appliesTo 에 `ReturnsListPage`('상세' 제거)를 지목했으나 이미 해소됐다. 현 구조는 요구가 정의한 (a) 형태 그대로다: whole-row 클릭(`rowNavProps` — `:235`) + **row 내 접근 가능한 링크 하나**(접수번호 `<Link>` — `:240-246`, 접근 이름 `'<주문번호> 상세'`). 중복 '상세' secondary 버튼 0건 | 읽기전용 리스트에 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 상품명(`:248`)·사유(`:254`) 셀에 truncate 가 없다(`tdStyle` 그대로). 긴 값이 열을 넓혀 표 레이아웃을 민다. **형제 화면 `ReviewListPage.tsx:78-84` 는 같은 문제를 `contentStyle`(maxWidth + ellipsis)로 풀었다** — 이 화면에 그 처리가 없다 | 200자 상품명 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-12 | P2 | 처리 메모가 `TextareaField` 의 `N/500` 실시간 카운터를 갖는다(`:337` `maxLength={RETURN_NOTE_MAX}` → `TextareaField.tsx:52` → `FormField counter`). **그러나 상한 근접 경고가 없고, 네이티브 `maxLength` 가 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다 | 500자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert(`:133,222,374`) · write 성공=toast(`:194`) · write 실패=카드 배너(`:272`) · **422 는 그 입력의 인라인 오류**(`:207` → `ExchangeOptionField` `error`). **단 write 실패가 toast 가 아니라 배너다** — 요구는 'write 성공/실패 → toast'인데 이 화면은 실패를 폼 카드 배너로 둔다. 그러나 이는 폼 맥락(입력을 보존한 채 그 자리에서 재시도)이라 `FormServerError` 와 같은 결이며 **이탈로 보지 않는다** | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast — 재고 반영 여부로 문구 분기) · 실패(배너 + 참조 코드) · 422(필드 인라인) 세 경로가 배선돼 있다(`:191-213`). no-op 클릭이 없다 — 재고 위반이면 버튼이 잠기고(`:356`) 클릭 자체가 `return` 한다(`:174`) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 완료 처리가 **단일 클릭 비가역**이다 — 확인도 undo window 도 없다(FEEDBACK-02 와 같은 뿌리). 재고 이동은 `stockAppliedAt` 이 잠가 복원 경로가 없고(BE-044 §7.11 #7 이 역이동 계약 부재를 이관한다), snapshot 도 없다. **삭제는 이 화면에 없으므로 요구의 delete 절은 걸리지 않는다** | 비가역 액션이 confirm 또는 undo window 를 갖는지 | **gap** |
| A11Y-03 | P1 | ConfirmDialog 표면 = 이탈 가드 하나. 초기 포커스(discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **충족.** 행 클릭이 `useRowNavigation`(마우스 전용 — `<tr>` 에 tabIndex 없음, `useRowNavigation.ts:9-11` 이 그 전제를 명시)이고, **행 안에 같은 목적지의 focusable name link 가 있다** — 접수번호 `<Link to={`${LIST_PATH}/${item.id}`} aria-label={`${item.orderNo} 상세`}>`(`:240-246`). `:239` 주석이 그 의도를 명시한다. 요구가 기대하는 형태('row 내 focusable name link') 그대로다 | 행을 Tab 해서 접수번호 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스가 없고, 저장 실패(422) 시 그 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `setFocus` 경로(`useCrudForm.ts:190`)를 상속하지 못한다. 422 는 `setStockError` 로 문구만 꽂는다(`:207`) | 옵션을 비운 채 상태를 '완료'로 → activeElement 가 교환 옵션 select 인지 | **gap** |
| A11Y-16 | P1 | 신규 인터랙티브 표면의 계약을 대체로 만족한다: 표 `aria-busy`(`:188`) · caption(`:189-191`) · 필터 `aria-label`(`:159,173`) · 링크 `aria-label`(`:243`) · 스텝퍼 `<ol aria-label="처리 진행 단계">` + 장식 `aria-hidden`(`ReturnStatusStepper.tsx:78,84-85`) · 재고 미리보기 `aria-live="polite"`(`ExchangeOptionField.tsx:108`) · 이동 이력 표 caption(`StockMovementTable.tsx:50-52`) · 입고/출고를 **색이 아니라 `StatusBadge` 라벨**로 이중 인코딩(`:76-80`). **잔여**: 목록에 `CrudListShell` 같은 지속 live region 이 없어(`CrudListShell.tsx:107-109` 참조) 필터로 0행이 되는 전환이 announce 되지 않는다 — `Empty` 의 `role="status"` 는 **내용과 함께 생성**되므로 신뢰할 수 없다 | 필터를 걸어 0행으로 만들 때 스크린리더가 사유를 읽는지 | **gap(경미)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:105-119` 의 `STATUS_META` · `statusLabel` · `statusMeta` · `kindTone`(`:88-90`). per-page meta helper 를 만들지 않았고 목록·상세·스텝퍼가 같은 함수를 소비한다. **다만 그 레지스트리가 `pages/products/returns` 지역이라** 견적/계약/문의 등 다른 도메인과 통합된 앱 전역 레지스트리는 아니다 — '완료'가 여기서 success 인데 다른 화면에서 다른 톤일 수 있다 | 모든 domain status 가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을 경유한다. 재고 이동 이력의 시각은 `formatDateTime`(`StockMovementTable.tsx:87`). **잔여**: 접수일(`:255`)이 포맷 함수를 거치지 않는다(ERP-08 참조) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-07 | P2 | 환불 예정액이 `{formatNumber(request.refundAmount)}원`(`:309`)로 **숫자와 단위를 한 문자열로 잇는다** — 정의 목록(`dd`)이라 우측 정렬 금액 컬럼이 아니므로 자릿수 정렬이 깨질 표면이 없다. 이동 이력의 수량은 `+N개`/`−N개` 를 `numericCellStyle` 등가(`qtyCellStyle` — `StockMovementTable.tsx:32-37`, `textAlign: 'right'` + `tabular-nums`)로 우측 정렬한다 — **단위('개')가 숫자 뒤에 붙어 자릿수를 따라다닌다.** 다만 수량은 1–2자리라 실害가 작다 | 다행 금액 컬럼의 시각 확인 — 이 화면에 그 표면이 없다 | **pass(표면 경미)** |
| ERP-08 | P2 | 수량·환불액이 `formatNumber`, 이동 시각이 `formatDateTime` 을 경유한다. **접수일(`:255`)만 `item.requestedAt` 문자열을 포맷 함수 없이 그대로 렌더하고 `tabular-nums` 도 없다** — 같은 화면의 이동 이력 표는 둘 다 쓴다(`StockMovementTable.tsx:26-30,87`). 값이 'YYYY-MM-DD' 가 아니면 그대로 새어 나온다 | 셀의 raw 문자열 렌더가 0건인지 | **gap(경미)** |
| ERP-09 | P2 | 이 화면의 시각 표면은 **재고 이동 시각 하나**(`formatDateTime(movement.at)` — `StockMovementTable.tsx:87`)다. `shared/format.ts` 가 정본이며 F3b 가 **UTC 정오 앵커 + KST 고정**으로 수렴시켰다(`format.ts:33-45,131-181`). 접수일은 날짜(`YYYY-MM-DD`)라 TZ 계약이 걸리지 않는다. `stockAppliedAt` 생성은 어댑터의 `new Date().toISOString()`(`data-source.ts:165`) — 픽스처 전용이며 백엔드가 붙으면 서버 시각이 된다(BE-044 §7.3) | UTC ISO 입력이 러너 OS 타임존과 무관하게 같은 wall-clock 을 렌더하는지 | **pass(상속)** |
| ERP-13 | P1 | 이 화면의 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(`grep '이(가)\|을(를)\|은(는)\|(으)로'` = 0). 빈 상태의 조사는 `Empty` 가 받침으로 고르고(`Empty.tsx:24-27`), 이 화면은 이름을 interpolate 하는 toast/confirm 이 없다(성공 토스트가 고정 문구 2종 — `:194-198`) | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`visible.map` — `:229`) — cap·virtualization 이 없다. 교환/반품은 상한 없이 증가하는 컬렉션이라(BE-044 §7.9) 1,000건이면 1,000행이 DOM 에 올라간다. 9컬럼 표에 가로 scroll 컨테이너도 없다. **완화**: 검색이 디바운스돼(COMP-10) 자모마다 전량 스캔이 일어나지는 않는다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트에서만 발생한다(`:137`). **이 화면에서 특히 문제다** — BE-044 §7.2 가 저장 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다(`dev.ts:14-71`). 이 화면은 **404 와 422 를 실제로 분기한다** — 404 → 재시도 없는 not-found(`:219,376`), 422 → 필드 인라인(`:206-209`). **그러나 403/409/429/5xx 를 같은 배너로 뭉갠다**(`:210`) — `isForbidden`(`http-error.ts:93-95`)·`isConflict`(`:105-107`)가 존재하는데 쓰지 않는다. 403 은 재시도 수단을 주면 안 되고 409 는 재시도하면 또 409 다 | `?status=save:403` · `save:409` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **충족(수동 배선).** 서버 422 의 `violations` 를 그 필드로 되돌린다 — `if (isUnprocessable(cause) && isHttpError(cause)) setStockError(cause.violations[0]?.message ?? cause.message)`(`:206-209`) → `ExchangeOptionField` 의 `error` → `aria-invalid`+`aria-describedby`+`role="alert"`(`ExchangeOptionField.tsx:87-89`). 어댑터가 그 형태로 던진다(`data-source.ts:158-163` — `violations: [{ field: 'exchangeOptionValues' \| 'optionValues', message }]`). **잔여 둘**: (a) `violations[0]` 만 읽어 **다중 위반의 나머지를 버린다** (b) **포커스를 옮기지 않는다**(A11Y-13). (c) 400 `error.fields` 경로는 없다 — `useCrudForm` 미사용이라 `setError` 가 없다 | `?status=save:422` 로 저장 → 교환 옵션 필드에 인라인 오류가 뜨는지. **어댑터의 실제 422 는 재고 부족 옵션을 골라 재현한다**(select 가 `disabled` 로 막으므로 URL 조작 필요) | **pass(단 포커스·다중 위반 잔여)** |
| EXC-10 | P1 | **표면이 없다** — bulk 작업이 이 화면에 없다(행 선택 부재) | — | **n-a** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다. **재고를 움직이는 화면이라 offline write 가 특히 위험하다** — 요청이 hang 하면 운영자는 완료가 됐는지 모른 채 다시 누른다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다 — 상세(`:218-241`): 404 → '요청을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만 / 그 밖 → '요청을 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 상품 조회도 같은 분기(`:372-386`). 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던지고(`crud.ts:105-107` · `data-source.ts:202-205`) 화면이 `isNotFound` 로 읽는다. 무한 spinner 없음(`request === undefined` 는 error 분기 뒤에 온다) | 없는 `:id`(`/products/returns/nope`)로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(pending 잠금 → 성공 후 재조회)이다. `onMutate`/`setQueryData` grep = 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다.** **재고를 움직이는 write 라 optimistic 이 위험하다는 요구의 판단과도 일치한다** | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-20 | P1 | **충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 를 보여준다** — `setErrorReference(referenceOf(cause))`(`:211`) → `{errorReference !== null && <span style={hintStyle}>오류 코드 {errorReference}</span>}`(`:275-277`). `HttpError.reference` 는 `TDS-<base36 시각>-<3자리 난수>`(`http-error.ts:68-75`). raw stack/서버 body 노출 없음. **`referenceOf` 는 `HttpError` 가 아니면 null 을 반환해**(`:115-117`) 없는 코드를 지어내지 않는다 — `?fail=save` 의 generic `Error` 에는 코드가 안 뜬다(정확한 동작) | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지 | **pass** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-044 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 상품(옵션·재고) 응답 p95 | ≤ 400ms | 위와 동일. **상세와 직렬**이다(`enabled: request !== undefined` — `:123`) → 체감 p95 = 상세 + 상품 ≈ 800ms |
| 처리 저장 p95 (일반) | ≤ 700ms | 위와 동일 |
| **처리 저장 p95 (완료 = 재고 트랜잭션)** | **≤ 2s** (BE-044 §2 서버 상한 10초 → 504) | **측정 불가.** 재고 락 + 다중 SKU 갱신 + 이력 기록이 한 트랜잭션이라(BE-044 §7.2) 일반 저장보다 느리다. 이 축이 이 화면의 병목이 될 것이다 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | **2회**(상세 + 상품 — `:199-201`) + 무효화된 목록 1회 = 최대 3회 | 재고가 움직였으면 상품 재조회가 **필수**다(선택지의 재고 수치가 낡는다). 재고가 안 움직인 저장에도 상품을 재조회하는 것은 **과잉** — `movesStock(status) && !applied` 로 가를 수 있다 |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 1회 | **충족(요청)** / **부분 충족(연산)** — 디바운스 250ms 가 자모당 스캔을 막으나(COMP-10 pass), 커밋마다 전량을 `filter` 2회 + `search` 1회 훑는다(`:124-128`) |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `ReturnRequestInput` 이 `stockMovements` 배열 전체를 실어 보낸다(`types.ts:184-185`). 실제로는 요청당 최대 2건이라 작지만, **계약상 무한**이다. BE-044 §7.3 안 A 가 이를 상수로 만든다 |
| 메모리 | 목록 전량 + 상세 1건 + 상품 1건(옵션 매트릭스 포함) | 전량 보유. 교환/반품은 상한 없이 증가(BE-044 §7.9) |
| 번들 | 이 화면 고유 코드 ≤ 25KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 전용 컴포넌트 3개(`ExchangeOptionField` 138행 · `ReturnStatusStepper` 94행 · `StockMovementTable` 93행) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:130-143`). 단 배너가 툴바·필터까지 대체한다 — 조건은 URL 에 남아 재시도 후 복원된다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(`:218-241` — EXC-12 pass) |
| 상품(옵션) 조회 실패 | 404 = 재시도 없음 / 5xx = 다시 시도 | **충족**(`:372-386`). 404 면 **완료 처리가 영원히 불가능**해진다(BE-044 §7.4 — 고아 요청) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(`:271-280` — EXC-20 pass) |
| 저장 실패(422 재고) | 그 입력의 인라인 오류 + 재고를 건드리지 않음 | **충족**(`:206-209` · `returns.test.ts:223-238` 이 '재고를 건드리지 않는다'를 회귀로 고정) |
| 저장 실패(409 동시 삭제) | conflict 다이얼로그 + 입력 보존 | **미충족** — 일반 배너로 뭉개진다(EXC-04 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** — 이 화면은 재고가 걸려 그 불확실성이 실질 위험이다(FS-044 §7 #15) |
| 동시 처리(두 운영자) | 나중 저장이 앞선 처리를 덮지 않는다 | **미충족 — 상태가 덮인다**(last-write-wins, BE-044 §7.3). **재고 이중 이동만은 `stockAppliedAt` 이 막는다**(`data-source.ts:145`) |
| **연타(더블클릭)** | 정확히 1개 요청 | **미충족**(EXC-08 gap). **재고 이중 이동은 막히나** 상태·메모는 두 번 적용된다 |
| 세션 만료 중 처리 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 내용을 버린다(EXC-19 P1 · FS-044 §7 #17) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **BE-044 §2 의 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다** |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`(`AppShell.tsx:484-493`) |

### 4.3 재고 무결성 · 감사

교환/반품의 재고 이동은 **창고 실물과 시스템 수치를 잇는 유일한 기록**이다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 재고는 요청당 정확히 한 번만 움직인다 | **충족(도메인 가드)** — `stockAppliedAt` 이 멱등 키다(`types.ts:67` · `data-source.ts:145`). 회귀 `returns.test.ts:212-221`. **단 그 값이 요청 바디에 실려 있어 위조 가능하다**(BE-044 §7.3) |
| 이동 이력은 append-only — 수정·삭제되지 않는다 | **구조적으로 미보장.** 클라이언트가 `stockMovements` 배열을 치환 PUT 한다(`types.ts:184-185`) — 조작된 클라이언트는 과거 이동을 지울 수 있다. BE-044 §7.3 |
| 이동 시각은 서버 시각이다 | **미충족(픽스처 한정).** 어댑터의 `new Date().toISOString()`(`data-source.ts:165`) — 클라이언트 시각이 아니라 어댑터 시각이라 현재는 안전하나, 계약상 `stockAppliedAt` 이 요청 바디에 있다 |
| 이동 id 는 충돌하지 않는다 | **미충족.** `mv-${at}-in`/`mv-${at}-out`(`types.ts:266,279`) — 같은 밀리초의 두 요청이 같은 id 를 만든다 |
| 요청 갱신과 재고 증감은 원자적이다 | **충족(픽스처)** — 어댑터 `patch` 안에서 한 덩이(`data-source.ts:6-8,143-177`). 백엔드 계약도 이를 요구한다(BE-044 §7.2). **단 심 주석이 그것을 요구할 뿐 서버가 없다** |
| 재고를 음수로 만들지 않는다 | **충족하나 그것이 옳은지 미정** — `applyMovements` 가 `Math.max(0, …)` 로 깎는다(`types.ts:303`). BE-044 §7.10 이 **서버는 이를 복제하지 않는다**고 판정한다(음수는 실사 불일치의 신호이며 지워선 안 된다) |
| 완료를 되돌리면 재고도 되돌아간다 | **미충족.** 상태 전이 규칙이 없어(BE-044 §7.1) 완료→접수 역행이 가능한데 재고는 그대로다 — **상태와 재고가 갈린다.** 역이동 계약 없음(BE-044 §7.11 #7) |
| 상품이 지워져도 요청은 처리 가능하다 | **미충족.** `removeProduct` 가 참조를 검사하지 않아(`_shared/store.ts:650-652`) 요청이 고아가 되고 완료 처리가 영원히 422 다(BE-044 §7.4) |
| 환불과 재고가 함께 확정된다 | **미정** — `refundAmount` 는 표시 전용이고 결제 취소를 트리거하지 않는다(BE-044 §7.7). 운영자가 다른 시스템에서 손으로 하고 메모에 적는다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | FEEDBACK-02 · FEEDBACK-05 | P0 · P2 | **완료 처리(재고 이동)가 비가역인데 ConfirmDialog 게이트가 없다.** 미리보기(`ExchangeOptionField.tsx:107-135`)는 예고일 뿐 게이트가 아니다. 형제 `ReviewDetailPage.tsx:305-316` 은 삭제에 그 게이트를 갖고 있다 | 이 화면 | A11 change_request (FS-044 §7 #5) |
| 2 | IA-02 | P0 | sub-route 에서 AppHeader `<h1>교환/반품</h1>` + 상세 자체 `<h1>교환/반품 처리</h1>` → **`<h1>` 2개.** 브랜치 폴백은 `findCoveringLeaf` 로 해소됐고 남은 것은 h1 이중 + 행위 미반영 | **앱 전역**(`AppHeader`·`findNavLabel` 모델 — 폼/상세 화면 다수가 같은 결함) | A40 · A11 (FS-044 §7 #4) |
| 3 | IA-04 · ERP-15 · COMP-06 · COMP-07 | P0 · P1 · P2 | 페이지네이션 없음 — 전량 렌더. 교환/반품은 상한 없이 증가. `SeqCell` 오프셋·스켈레톤 행 수가 함께 붙어야 한다. **URL list state 는 이미 있어**(`useListState`) `page` 를 쓰기만 하면 된다 | 이 화면 + BE 계약 | A11 · A63 (BE-044 §7.9 · FS-044 §7 #2) |
| 4 | EXC-04 · EXC-06 | P0 · P1 | 409 해소 UI 없음(`onError` 에 `isConflict` 분기 부재) · If-Match/version 없음 → 동시 편집 last-write-wins. 403/409/429/5xx 를 한 배너로 뭉갬 | 이 화면 + BE 계약 | A11 · A63 (BE-044 §7.11 #4·#5 · FS-044 §7 #8·#10) |
| 5 | EXC-08 | P0 | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. **`crud.ts` 의 `idempotencyKey` 자리와 원장이 있는데 호출부가 비어 있다.** 재고 이중 이동은 `stockAppliedAt` 이 막지만 상태·메모는 두 번 적용된다 | 이 화면 | A11 · A63 (BE-044 §7.11 #3 · FS-044 §7 #7) |
| 6 | (§4.3) | — | **재고 무결성** — `stockAppliedAt`·`stockMovements` 가 요청 바디에 있어 위조 가능. 이동 id 가 같은 ms 에 충돌 | 이 화면 + BE 계약 | **A63 (BE-044 §7.3 — 최우선)** · A11 |
| 7 | (§4.3) | — | **상태 전이 규칙 부재** — 완료→접수 역행 시 재고가 남아 상태와 갈린다. `RETURN_FLOW` 는 표시 전용 | **A01 (선행)** · A63 (BE-044 §7.1) · A11 (FS-044 §7 #3) |
| 8 | (§4.3) | — | 상품 삭제가 미처리 요청을 검사하지 않아 고아 요청이 생긴다 — 완료가 영원히 422 | BE-042 연동 | A63 (BE-044 §7.4 · FS-044 §7 #16) |
| 9 | A11Y-13 · EXC-07(잔여) | P1 | 폼 진입 첫 필드 포커스·422 시 그 필드로 포커스 이동 없음. `violations[0]` 만 읽어 다중 위반을 버린다 | 이 화면 | A11 change_request |
| 10 | A11Y-11(잔여) · A11Y-16 | P1 | `ExchangeOptionField.tsx:81` 의 `hint` 가 유효 상태에서 `hintIdOf` 로 연결되지 않는다(`settings/_shared/fields.tsx:22` 는 그 배선을 갖고 있다). 목록에 지속 live region 이 없어 0행 전환이 announce 되지 않는다 | 이 화면 | A11 change_request |
| 11 | COMP-09 · ERP-08 | P2 | 상품명·사유 셀 truncate 없음(`ReviewListPage.tsx:78-84` 가 선례). 접수일이 포맷 함수·`tabular-nums` 없이 raw 문자열 | 이 화면 | A11 (#3 과 함께) |
| 12 | COMP-12 | P2 | 처리 메모 상한 근접 경고 없음 · counting 기준 미정의 | 이 화면 | A11 |
| 13 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건. **BE-044 §2 의 '서버 10초 < 프론트 상한' 이 성립하지 않는다** | **앱 전역** | A40 · A11 (FS-044 §7 #17) |
| 14 | (FS-044 §7 #9) | — | 이탈 가드가 `navigate()` 프로그램 이동('목록으로')을 가로채지 못한다 | 이 화면 | A11 change_request |
| 15 | (FS-044 §7 #11·#13) | — | 상세 재조회가 편집 중 입력을 덮는다 · 상세 사유에 `pre-wrap` 없음 | 이 화면 | A11 change_request |
| 16 | (BE-044 §7.11 #8) | — | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다** — 부재가 코드로 강제되지 않는다(BE-026 의 `ticketAdapter` 는 명시적 거절 구현을 뒀다) | 이 화면 | A11 change_request |
| 17 | (§4.1) | — | 저장 성공 후 재고가 안 움직인 경우에도 상품을 재조회한다 — `movesStock(status) && !applied` 로 가를 수 있다 | 이 화면 | A11 (경미) |
| 18 | (BE-044 §7.7) | — | **환불 실행 경계 미정** — 완료 전이가 결제 취소를 트리거하는지 계약이 없다 | **A01 (선행)** · A63 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-17 · `HEAD = 4b805ad`. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`returnAdapter` 는 `SCOPE = 'returns'`(`data-source.ts:26`)로 `failIfRequested(SCOPE, op)` 를 부른다. `createCrudAdapter` 가 5개 op 를 제공하나 **화면이 실제로 부르는 것은 3개**다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=returns:list` · `?fail=all` | FS-044-EL-010 |
| `detail` | `fetchOne` (`crud.ts:101`) **+ `fetchReturnProduct`**(`data-source.ts:200`) | `?fail=detail` · `?fail=returns:detail` · `?fail=all` | FS-044-EL-014 **와** EL-029 **가 함께 실패한다** — 두 조회가 같은 op 를 공유한다 |
| `save` | `update` (`crud.ts:120`) | `?fail=save` · `?fail=returns:save` · `?fail=all` | FS-044-EL-016 |
| `delete` | `remove` (`crud.ts:135`) — **호출부 0건** | — | **`?fail=delete` 는 이 화면에서 아무 효과가 없다**(삭제 진입점 부재 — BE-044 §7.6) |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 `?delay=` 가 아니라 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-71`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 gap) |
| EXC-06 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-06 (status별 surface) | `?status=save:422` · `save:429` · `save:500` — 422 만 필드로 가고 나머지는 같은 배너다 |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fproducts%2Freturns&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — `오류 코드 TDS-…` 가 보이면 pass(현재 pass). **`?fail=save` 로는 재현되지 않는다** — generic `Error` 에는 `reference` 가 없어 `referenceOf` 가 null 을 준다(정확한 동작) |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/products/returns` 의 `update` 를 끄면 '처리 저장'이 사라져야 한다(현재 pass) |

**422 재고 위반의 재현**: `?status=save:422` 는 `violations` 가 **비어 있는** `HttpError` 를 던지므로(`dev.ts:84` — `new HttpError(status, STATUS_MESSAGE[status])`) 화면이 `cause.violations[0]?.message ?? cause.message` 의 **폴백 경로**를 탄다(`:207`). **실제 `violations` 를 실은 422 는 어댑터가 던진다**(`data-source.ts:158-163`) — 재고 부족 옵션을 선택해야 하는데 select 가 `disabled` 로 막으므로(`ExchangeOptionField.tsx:99`) **재현하려면 픽스처 재고를 낮추거나 DOM 을 조작해야 한다.** 이 경로의 회귀 방어선은 e2e 가 아니라 `returns.test.ts:223-238`(어댑터 단위 테스트)이다.

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · A11Y-11 · A11Y-12 · ERP-13 · EXC-08 판정) · RTL(A11Y-11 의 describedby↔alert id 일치 · `aria-required` 주입) · **`returns.test.ts`**(재고 순수 규칙 `:62-179` + **어댑터 경계의 재고 반영 `:185-262`** — 중복 반영 방지·422 롤백·비완료 전이 무이동을 전부 고정한다. **이 화면에 컴포넌트 테스트는 없다**).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 페이징·선택 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재)
- [x] §2.1 산수 검산 — 11 pass + 10 종속 + 4 n-a + 5 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`·`shared/permissions`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·토글 필터·optimistic)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`returns`)와 op 를 **어댑터 코드에서 확인**했고(`delete` 가 무효임 포함), **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음). `?status=save:422` 가 **`violations` 없는 폴백 경로**를 탄다는 사실을 명시했다
- [x] **'판정 기준일 2026-07-17 · `HEAD = 4b805ad` · E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-044 §7 · BE-044 §7.11 과 일치한다
- [x] **금액·재고 화면의 성격(§1.2)** 을 밝히고 FEEDBACK-02 · EXC-04 · EXC-08 판정에 반영했다. §4.3 에 quality-bar 밖 축(재고 무결성·감사)을 별도로 세웠다
