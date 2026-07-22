---
id: NFR-075
title: "프로그램 카테고리 비기능 명세"
functionalSpec: FS-075
backendSpec: BE-075
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-075. 프로그램 카테고리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-075 프로그램 카테고리 (`/programs/categories` — **단일 라우트**, 등록·수정은 모달) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-075(요소·예외) · BE-075(계약·판정) · FS-074/NFR-074(프로그램 — 이 화면의 변경이 그쪽 선택지를 흔든다) · NFR-042(상품 카테고리 — **같은 골격의 선행 판정**) · `specs/quality-bar.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-075 §7 · BE-075 §7.12 와 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

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

**한 화면에 두 개의 제약이 산다: 2단계 계층과 두 갈래 삭제 차단.** 이름 하나를 고치면 그 카테고리를 쓰는 **모든 프로그램의 표시가 바뀌고**(BE-075 §7.7 라벨 전파), 지우면 **프로그램이나 중분류가 고아가 된다**(그래서 막는다 — §7.3). 즉 이 화면의 쓰기는 **다른 도메인 다수를 한 번에 건드리는 행위**다.

**그런데 이 화면은 공용 CRUD 프레임워크의 절반만 상속했다.** `useCrudForm`/`useCrudList` 대신 저수준 훅(`useCrudListQuery`·`useCrudDelete`·`useCrudCreate`·`useCrudUpdate`)을 직접 조립했고, 그 결과 **status 분기 · 충돌 다이얼로그 · 422 필드 매핑 · 동기 제출 락 · 멱등키 · 행 단위 `deletingId` · 참조 코드**를 전부 갖지 못했다(BE-075 §7.6). 프로그램 화면(NFR-074)이 그 장치들을 상속해 EXC-04 의 절반과 EXC-08 을 통과한 것과 **정확히 대조된다** — **같은 도메인의 두 화면이 다른 품질 수준에 있다.**

그래서 이 화면의 P0 는 **쓰기 게이팅(EXC-03)** · **동시성(EXC-04)** · **중복 제출(EXC-08)** · **abort 처리(EXC-09)** 에서 무겁게 읽어야 하고, **네 축이 전부 같은 뿌리(프레임워크 미상속)에서 나온다.**

반대로 **모달이 소유해야 할 것은 정확히 갖고 있다**: 4경로 dirty 가드(FEEDBACK-06)와 검증 실패 시 이름 입력 포커스. 그리고 이 화면은 상품 카테고리(FS-042)가 요청만 하고 구현하지 못한 것 하나를 **실제로 갖고 있다** — 사용량 배지가 `/programs?category=<id>` 로 데려간다.

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **하나의 data view 가 네 상태 중 정확히 하나만 그린다.** `firstLoading = isFetching && data === undefined`(`ProgramCategoriesPage.tsx:337`)와 `loaded = data !== undefined && error === null`(`:338`)을 파생하고, 렌더가 **error → firstLoading → empty → 트리** 순의 배타 분기다(`:445-513`). 주석이 그 판단을 적는다(`:335-336` — '재조회 때도 loading 으로 쓰면 이미 보고 있던 목록이 덮인다'). `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:298`)가 재조회 중 이전 행을 유지한다. 좌측 필터 배지도 `loaded` 일 때만 세고 아니면 `null`('—')이다(`:340-343`) | `/programs/categories` 진입 → 렌더 확인 → 필터 변경으로 재조회 유발. **트리가 '불러오는 중…' 으로 덮이거나 '전체 N개'가 사라지면 gap.** `?fail=programs-categories:list` 로 error 만, `?usage=unused` 로 0건 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | read 실패가 인라인 danger `Alert` + 명시적 `다시 시도` 다(`:445-453` — '카테고리를 불러오지 못했습니다.' + `onClick={() => void refetch()}`). **카드를 대체하되 툴바·좌측 필터는 남는다.** toast 로 처리하지 않고(이 화면의 toast 는 쓰기 성공 3종뿐 — `:394,406-408`) empty 상태로 폴백하지 않는다(빈 상태는 `error === null` 분기 안에만 있다). 쓰기 실패도 각자 자리를 갖는다 — 저장은 모달 안 배너(`ProgramCategoryFormModal.tsx:142`), 삭제는 다이얼로그 안 배너(`:538`) | `?fail=programs-categories:list` 로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap. **잔여**: 툴바의 '전체 0개'가 배너와 동시에 보인다(§5 #8) | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **페이지네이션이 없다** — 중첩 `<ul>` 이 `tree` 전량을 렌더한다(`:467-512`) ② **행 선택이 없다** — 일괄 작업이 없어 `useListState` 가 제공하는 `selectedIds`·`toggleAll` 을 **소비하지 않는다**(grep 0건). 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션이나 행 선택이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/programs/categories/**` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22). 파생 치수는 `calc(${cssVar('space.6')} * 9)`(`:73`) 처럼 space 토큰 배수로만 표현하고, 들여쓰기·자리표시 폭도 토큰이다(`:160,177`). **이 화면에는 CSS 파일이 아예 없다** — 프로그램 폼과 달리 미디어 쿼리도 없어 예외가 0건이다. `box-shadow`·`transition` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px" apps/admin/src/pages/programs/categories` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: 손조립 아이콘 버튼 4종이 `className="tds-ui-btn-ghost tds-ui-focusable"`(`:230,268,279,288`) · 이름 입력이 `"tds-ui-input tds-ui-focusable"`(`ProgramCategoryFormModal.tsx:153`) · 그 밖 DS `<Button>`·`<SelectField>`·`<Modal>`·`DetailCellLink`. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 스타일이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: Modal **3종**(등록/수정 · 삭제 확인 · 파기 확인) · Toast 3종 · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건 실측). **펼침/접기 토글에도 전환 애니메이션이 없다** — 자식 `<ul>` 을 조건부 렌더로 즉시 붙였다 뗀다(`:491-508`) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` 1개(`:455`) · Modal 3종 · Toast. 행 배경은 `color.surface.raised`(`:118`)를 쓰되 그림자를 얹지 않는다. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면은 in-content `<h1>` 을 그리지 않는다**(grep 0건 — `pages/programs` 의 h1 3건은 전부 다른 화면이다). page title 은 AppHeader 가, 모달 제목은 DS `Modal` 이, 필터 heading(`<h2>`)은 `FilterPanel` 이 소유한다. 이 화면이 직접 쓰는 typography 는 label/hint tier 뿐이다(`:128-134` — `typography.label.md.*`). **display/heading tier 를 소비하는 표면이 전부 상속 계층에 있다** | AppHeader·Modal·FilterPanel 의 토큰 판정에 종속. 이 화면이 heading tier 를 손으로 재현하지 않는지만 확인(`font-size` 하드코딩 0건 — TOKEN-01 과 같은 grep) | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 이 화면에 **text-search/filter 입력이 존재하지 않는다** — 툴바에 검색이 없고(FS-075 §2 SEC-02 가 그 부재를 명시한다) 좌측 필터는 3개 고정 버튼(`USAGE_FILTERS` — `:54-58`)이다. `useListState` 의 `searchInput`·`searchInputProps` 를 **소비하지 않는다**(grep 0건). 모달의 이름 입력은 **폼 필드**이지 검색·필터 입력이 아니라 요구의 appliesTo 밖이다 | 검색이 도입되면 이 판정을 다시 매긴다 — 그때는 `list.searchInputProps` 스프레드 하나로 충족된다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 직접 | **비가역 액션이 하나이고 그것이 게이팅된다.** 삭제가 `ConfirmDialog intent="delete"`(`:531-542`)를 거치고 intent 가 tone/icon/label 에 매핑된다(제목 '카테고리 삭제', 본문 `'<이름>' 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`, 확인 '카테고리 삭제'). **busy 중 confirm 이 disable 된다**(`busy={deleting}` — `:537`). **실패하면 다이얼로그가 남고 그 안에 배너가 뜬다**(`error={deleteError}` — `:538`, 세팅은 `:398`) — 확인 재클릭이 곧 재시도다. **취소·Esc·딤은 진행 중 요청을 abort + `mutation.reset()` + 오류 지우기**(`closeDelete` — `:373-379`) 로 '중간닫기=abort' 절도 충족한다. 되돌릴 수 있는 저장(등록·수정)은 묻지 않아 확인이 무뎌지지 않는다 | 미사용 카테고리의 휴지통 → 다이얼로그 확인. `?fail=programs-categories:delete` 로 강제 실패 후 확인. **다이얼로그가 남고 배너가 뜨며 확인 버튼이 되살아나면 pass.** **잔여**: 그 배너 문구가 사유와 무관하게 하나다 — '사용 중'·'하위 있음' 이면 거짓 안내다(EXC-06 gap · BE-075 §7.3) | **pass** |
| FEEDBACK-04 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **페이지 폼이 존재하지 않는다** — 편집은 IA-06 의 무게 규칙대로 모달이고(`App.tsx:343` 이 이 라우트의 유일한 등록이다) `/programs/categories/new` 류 라우트가 없다. 요구가 지목한 3경로(browser unload · in-app link capture · popstate sentinel)는 **페이지 폼의 이탈 경로**이며, 모달의 4경로 dirty 가드는 **FEEDBACK-06 이 따로 다룬다** — 이 화면은 그쪽에서 판정된다. `useUnsavedChangesDialog` 소비 0건(grep 실측) | 폼 라우트가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| FEEDBACK-06 | FEEDBACK | 직접 | **충족 — 이 화면이 요구의 정확한 대상이고 그것을 정확히 구현한다.** `useModalDirtyGuard(isDirty && !saving, onClose)`(`ProgramCategoryFormModal.tsx:82`)가 돌려주는 `requestClose` 를 **`Modal.onClose`(`:123`)와 취소 버튼(`:132`)에 둘 다** 넘겨 **4경로(Esc · 딤 클릭 · × · 취소)를 한 번에 덮는다.** DS Modal 이 앞 세 경로를 `onClose` 한 곳으로 모으기 때문이다(`useModalDirtyGuard` 머리말). `isDirty` 는 RHF `formState.isDirty`(`:65`)이고 `saving` 은 두 뮤테이션의 OR(`:76`)이라 **저장 중에는 가드가 꺼진다**(곧 성공해서 닫힌다). **파기 확인은 모달 *밖*에 렌더된다**(`:196-197`) — 안에 두면 모달의 포커스 트랩이 그것을 가둔다. pristine 모달은 프롬프트 없이 닫힌다 | 모달을 열어 이름을 한 글자 입력 → ① Esc ② 딤 클릭 ③ × ④ '취소' — **네 경로 모두 discard 확인이 떠야 pass.** 아무것도 입력하지 않고 같은 네 경로를 밟으면 **즉시 닫혀야** 한다(pristine 프롬프트 금지). 저장 중에는 가드가 뜨지 않아야 한다 | **pass** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 **3종**: 삭제 성공(`:394`) · 수정 성공 · 등록 성공(`:404-409`). 지속 live region 은 `ToastProvider` 가 소유한다. **이 화면은 목록 상주 live region 을 갖지 않는다** — `CrudListShell` 을 쓰지 않아 그 껍데기의 `aria-live` 영역(`CrudListShell.tsx:158-160`)을 상속하지 못했다(A11Y-16 P1 사안 · §3) | ToastProvider 판정에 종속. 이 화면에서는 세 성공 토스트가 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **3개**: 등록/수정 모달 · 삭제 확인 · 파기 확인. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다. 등록/수정 모달의 초기 포커스는 **이 화면이 지정한다**(`initialFocusRef={nameRef}` — `ProgramCategoryFormModal.tsx:129`) | DS 판정에 종속. 세 다이얼로그 open 시 title 과 purpose 가 함께 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 2개를 전수 확인했다.** ① **이름 입력** — `aria-invalid={invalid}` 와 `aria-describedby={invalid ? errorIdOf('program-category-name') : undefined}` 가 **연속한 두 줄로 짝을 이룬다**(`ProgramCategoryFormModal.tsx:158-159`). 감싸는 `FormField htmlFor="program-category-name" label="카테고리 이름" required error={errors.name?.message}`(`:144-149`)가 같은 id 의 오류 요소와 `*` 마커를 렌더하고, `maxLength={40}`(`:155`)이 네이티브 상한을 준다 ② **상위 카테고리 셀렉트** — 오류 상태가 없어(스키마가 `z.string()` 뿐이다) 짝 요구가 발생하지 않는다. hint 2분기는 `FormField hint`(`:174-178`)가 소유한다. **짝 없는 `aria-invalid` 0건**(grep 실측: 이 디렉터리 히트 1건 = `:158`, 바로 다음 줄이 describedby) | `grep -rn "aria-invalid" apps/admin/src/pages/programs/categories` → 히트 1건, 다음 줄에 `aria-describedby` 가 있는지 확인. RTL 로 이름을 공백만 넣고 제출해 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 와 `*` 마커 렌더를 assert | **pass** |
| A11Y-12 | A11Y | 직접 | 좌측 사용 여부 필터가 공유 `FilterPanel` 을 쓴다(`:425-434`). 그 컴포넌트가 선택 상태를 **`aria-pressed` 하나로** 표기하고(`FilterPanel.tsx:145`) 머리말이 그 판단을 명시한다(`:17-19` — '`aria-current` 는 내비게이션의 것이다'). **이 화면에 `aria-pressed`·`aria-current` 속성 선언 0건**(grep 실측 2026-07-22 — 공유 컴포넌트가 붙인다). **펼침/접기 토글은 `aria-expanded` + `aria-controls`**(`:233-234`)이며 disclosure 패턴이지 필터 토글이 아니다 — 요구가 지목한 축이 아니고, 두 표기가 **서로 다른 요소에 있어 섞이지 않는다** | `grep -rn "aria-current=\|aria-pressed=" apps/admin/src/pages/programs/categories` = 0건. DOM 에서 좌측 필터 항목이 `aria-pressed` 만, 펼침 토글이 `aria-expanded` 만 갖는지 확인 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **3개**(등록/수정 · 삭제 확인 · 파기 확인). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건) | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 3종. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건 실측). **트리 펼침/접기에도 motion 이 없어** 게이트가 걸릴 자체 표면이 0건이다 | 전역 motion config·`ui.css` 판정에 종속. 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 이 라우트는 AppShell layout route 아래에 등록된다(`App.tsx:343`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위는 화면 내부 2단 그리드(`layoutStyle` — `:71-76`)이며 좌측은 `FilterRail`(공유 껍데기), 우측은 평범한 컬럼이다. 그 그리드는 프로그램 목록·상품 카테고리와 **같은 값**을 쓴다(`:70` 주석) | 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족 — 이 화면에서는 모델이 하나다.** 단일 라우트이고 **sub-route 가 없다**(`App.tsx` 에 `/programs/categories/*` 가 0건). 화면이 **자체 `<h1>` 을 그리지 않아**(grep 0건) title 이 AppHeader 한 곳에서만 온다 → **`<h1>` 이 정확히 1개**다. 모달 제목은 DS `Modal` 이 `dialog` 안에서 소유하며 page heading 이 아니다. 프로그램 화면(NFR-074 IA-02)이 sub-route 에서 이중 `<h1>` 으로 gap 인 것과 **이 화면은 무관하다** — 여기에는 그 표면 자체가 없다. **다만 '앱 전역 단일 모델' 의 정의는 이 화면 밖의 일이다**(§5 #1 이 그것을 프로그램 쪽으로 넘긴다) | `/programs/categories` 진입 후 `document.querySelectorAll('h1').length` 확인. **1 이면 pass**(현재 1). 모달을 열어도 늘어나지 않아야 한다 | **pass** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 결과 count 요약(`:439-441`), 우상단 primary '카테고리 추가' CTA(`:412-421,442`), 좌측 레일에 필터. SelectionBar 부재는 **정당한 N/A**(일괄 작업이 없다). **미충족 둘**: ① **Pagination 이 없다** — 중첩 `<ul>` 이 `tree` 전량을 렌더한다(`:467-512`). 카테고리는 운영자가 만드는 만큼 늘어난다 ② **하나의 list 템플릿을 따르지 않는다** — `<table>` 이 아니라 `<ul>` 이라 공유 `CrudTable`(선택·순번·행 액션·스켈레톤·빈 상태 caption)을 쓰지 않는다. 그 결과 로딩이 스켈레톤이 아니라 문구 한 줄이고(`:456-457`) 요약에 `aria-busy` 도 없다. **상품 카테고리(FS-042 §7 #4)와 같은 결함이 복제됐다** | 픽스처를 30건 이상으로 늘리고 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** `grep -n "CrudTable\|CrudListShell" apps/admin/src/pages/programs/categories` = 0건으로도 판정된다 | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **create·edit 폼 라우트 쌍이 존재하지 않는다** — `App.tsx:343` 이 이 도메인의 유일한 라우트이고 `/programs/categories/new` 류가 없다. **그것이 결함이 아니라 IA-06 의 무게 규칙을 따른 결과다**: 카테고리는 필드가 이름 + 상위 둘뿐인 **짧은 taxonomy 엔티티**라 inline-list + Modal 이 정답이고, 하나의 모달이 등록과 수정을 겸한다(`editing` 유무로 갈린다 — `ProgramCategoryFormModal.tsx:49,122,136`). **IA-06 의 '혼용 금지' 절도 지킨다** — 이 엔티티에 폼 라우트가 0건이다 | 폼 라우트가 생기면 IA-06 위반이므로 그때 **두 요구를 함께** 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 사용 여부 필터의 **단일 원천이 URL 쿼리스트링**이다. `:320` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { usage: 'all' }` — `:307`), 그 훅이 `useSearchParams` 로 `?usage=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고, 손으로 고친 `?usage=거짓말` 은 `parseFilter` 가 '전체'로 되돌린다(`:321-325`). 결과: 필터를 건 화면을 그대로 링크로 공유할 수 있고 새로고침·뒤로가기가 조건을 보존한다. **`page`·`sort`·`q` 는 페이지네이션·정렬·검색이 없어 소비자가 없다** — 실재하는 축은 전부 URL 에 있다. **잔여**: 펼침/접힘 상태가 화면 로컬 `useState`(`:315`)라 새로고침에서 전부 펼침으로 돌아간다 — **요구가 지목한 다섯 축(page · page-size · filters · keyword · sort)에 없어 위반은 아니다**(§3 · §5 #7) | `?usage=unused` 를 걸고 새 탭에 URL 복사 → 같은 view 가 재현되면 pass. `?usage=zzz` 를 넣으면 '전체'로 되돌아가는지 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로를 상속한다: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=%2Fprograms%2Fcategories` 로 ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()`. **이 화면의 조회 1종·쓰기 3종이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **미저장 모달 입력은 그때 사라지나 이름 한 줄 + 셀렉트 하나라 손실이 작다** | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 `/login?returnUrl=%2Fprograms%2Fcategories&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **미충족 — 쓰기 게이팅이 넷 중 하나뿐이다.** ① **read 게이팅(상속)**: `RequirePermission` 이 `<Outlet>` 바깥에서 막고, `/programs/categories` 는 `/programs` 보다 긴 잎이라 **별개 리소스**다(`nav-config.ts:382-391` 의 '더 긴 잎이 더 구체적이다') ② **write 게이팅(직접) — `canCreate` 만 있다**: `:311` 이 `useRouteWritePermissions()` 에서 **`canCreate` 하나만 구조분해**한다. 그 값이 툴바 CTA(`:412-421`)와 행 '하위 카테고리 추가' 버튼(`:265`)을 지배한다 ③ **그러나 셋이 열려 있다**: 행 '수정'(`:277-285`) · 행 '삭제'(`:286-300`) · **모달 저장**(`ProgramCategoryFormModal.tsx:103-113`)이 `canUpdate`/`canRemove` 를 **묻지 않는다.** 조회 전용 역할이 연필과 휴지통을 그대로 보고 누른다 ④ **서버 403 이 오면 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 뭉개진다**(`:97-100` · `:396-399`) — 권한 부족에 재시도를 권하는 문구다. **상품 카테고리(BE-042 §7.8)와 글자까지 같은 결함이 복제됐다** | 권한 스토어에서 `page:/programs/categories` 의 `update` 를 끈 뒤 진입. **연필 버튼이 그대로 보이면 gap**(현재 그렇다). `remove` 를 꺼도 휴지통이 남는지 확인. `grep -n "canUpdate\|canRemove" apps/admin/src/pages/programs/categories` = **0건**으로도 판정된다 | **gap** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소됐다** — `createStoreAdapter.update`/`remove` 가 없는 id 에 `HttpError(409, …)` 를 던진다(`crud.ts:256-258,275-277`) ② **그러나 화면에 409 해소 UI 가 없다** — 모달의 `onError`(`ProgramCategoryFormModal.tsx:97-100`)와 삭제의 `onError`(`ProgramCategoriesPage.tsx:396-399`)가 **`isAbort` 만 보고** 나머지를 전부 generic 배너로 보낸다. `isConflict` grep **0건**. **재시도하면 또 409 인 실패에 '다시 시도'를 권한다** ③ **낙관적 동시성 토큰이 없다** — `ProgramCategory` 에 `version`/`updatedAt` 이 없고(`_shared/store.ts:15-20` 전수) 어댑터가 `If-Match` 를 보내지 않는다(grep 0건). 현 409 는 **'존재 여부' 기반**이므로 **동시 편집은 last-write-wins** 다 ④ **이 화면에서 그 위험이 증폭된다** — 수정 모달이 **행 데이터를 그대로 쓰고 상세를 재조회하지 않아**(`:483,524`) 애초에 낡은 값을 편집하고, **덮인 이름이 라벨 전파로 프로그램 전체에 퍼진다**(BE-075 §7.7). 프로그램 화면(NFR-074 EXC-04)은 최소한 충돌 다이얼로그를 갖는데 **여기는 그것조차 없다** | `?status=save:409` 로 모달 저장, `?status=delete:409` 로 삭제. **conflict 다이얼로그 없이 generic 배너만 뜨면 gap**(현재 그렇다). 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt\|isConflict" apps/admin/src/pages/programs/categories` → **0건**으로 확인(실측 0건) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** ① **동기 제출 락이 없다** — `submitLockRef` grep **0건**. 모달이 `useCrudForm` 을 쓰지 않고 `useForm` + `useCrudCreate`/`useCrudUpdate` 를 직접 조립했기 때문이다(`ProgramCategoryFormModal.tsx:61-75`). **RHF `handleSubmit` 은 비동기라**(`:127`) 첫 클릭 후 `saving` 이 true 가 되어 버튼이 실제로 disabled 되기까지 한 틈이 있고, 그 사이의 빠른 두 번째 Enter/클릭이 두 번째 요청을 만든다 ② **멱등키가 없다** — `create.mutate({ input, signal })`(`:111`)·`update.mutate({ id, input, signal })`(`:104`)에 `idempotencyKey` 가 없다. **자리는 이미 있고**(`CreateVars.idempotencyKey` — `crud.ts:323`) **어댑터 원장도 있는데**(`:193,232,245` ← `createIdempotencyLedger` `:67-77`) **호출부가 비어 있어 영원히 발현되지 않는다** ③ **그리고 중복 이름 검증이 없다**(`validation.ts:105-109` · `_shared/store.ts:484-491`) — 두 요청이 **둘 다 성공해 같은 이름의 카테고리가 2개** 생긴다. 그러면 프로그램 폼의 중분류 셀렉트에 같은 이름이 두 개 뜬다 ④ 방어는 `disabled={saving}`(`:132,135`) 하나뿐이다. **프로그램 폼(NFR-074 EXC-08)이 두 장치를 전부 갖는 것과 정확히 대조된다** | 모달에서 이름을 입력하고 '추가'를 최대한 빠르게 2회 클릭(또는 Enter 연타 · 네트워크 스로틀). **같은 이름의 카테고리가 2개 생기면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/programs/categories` = **0건**으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **부분 미충족 — 한 화면 안에서 규약이 갈렸다.** **삭제는 네 지점이 전부 배선돼 있다**: 다이얼로그 취소가 `abort()` + `mutation.reset()` + 오류 지우기(`closeDelete` — `:373-379`) · `onSuccess` 의 `if (controller.signal.aborted) return;`(`:392`) · `onError` 첫 줄 `if (isAbort(cause)) return;`(`:397`). 공유 predicate `isAbort` 를 쓴다 — 로컬 판정을 재발명하지 않았다. **그러나 모달 저장은 절반이 빠졌다**: 언마운트 abort 는 있고(`ProgramCategoryFormModal.tsx:87`) `onError` 의 `isAbort` 도 있으나(`:98`), **`onSuccess` 에 `aborted` 가드가 없다**(`:105,112`). 그래서 **취소된(모달을 닫은) 요청이 완료되면 `onSaved` 가 실행돼 닫힌 모달의 성공 토스트가 뜬다.** 요구의 'isPending 리셋(mutation.reset)' 절도 저장 쪽에는 없다(삭제만 갖는다). bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 모달에서 저장을 누른 뒤 400ms 창 안에 Esc 로 닫는다. **'…카테고리를 추가했습니다' 토스트가 뜨면 gap**(현재 그렇다). 삭제 쪽에서 같은 조작을 하면 아무것도 뜨지 않아야 한다(현재 그렇다) | **gap** |
| EXC-21 | EXC | 상속 | **이 화면은 판정 대상이나 거절 UI 를 소유하지 않는다.** ① **플랜(엔타이틀먼트) 계열 — 이 라우트에 없다.** `/programs/categories` 는 `MODULE_RESOURCES` 어디에도 없다(`module-resources.ts:29-91` 전수). 매핑 없는 리소스는 **`granted`** 로 수렴하므로(fail-open) 잠금·업그레이드 안내 표면이 발생하지 않는다 ② **권한 계열** — 라우트 read 거절은 AppShell 의 `RequirePermission` 이 `<Outlet>` 바깥에서 403 화면으로 그린다. **이 화면 안에 403 문구도 업그레이드 안내도 없다**(grep: 이 디렉터리에 `entitlement`·`Forbidden` 0건) ③ **설정 계열** — 이 화면은 결제 설정을 읽지 않는다(`payment-settings` import 0건). **따라서 한 화면에 두 계열이 섞일 표면 자체가 없다.** 판정은 소유 문서(`RequirePermission`·`RequireEntitlement`)의 것이다. **다만 '서버 403 을 generic 문구로 뭉개는 것'은 이 요구가 아니라 EXC-03·EXC-06 의 축이다** — 계열을 섞는 것이 아니라 계열을 말하지 않는 것이다 | 권한 스토어에서 이 리소스의 `read` 를 끄고 진입 → **403 화면이 뜨고 그 문구에 플랜/설정 계열 표현이 섞이지 않으면 pass**(판정은 `RequirePermission` 소유 문서). 플랜 축 부재는 `grep -n "programs" apps/admin/src/shared/entitlements/module-resources.ts` = **0건**으로 확인. 이 화면에서는 자체 거절 UI 가 0건임만 확인 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **10** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-02 · **FEEDBACK-06** · A11Y-11 · A11Y-12 · IA-01 · **IA-02** · IA-13 |
| `종속` | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · **TOKEN-05** · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-21 |
| `n-a` | **4** | STATE-04 · **COMP-10** · **FEEDBACK-04** · IA-05 |
| `gap` | **5** | IA-04 · **EXC-03** · **EXC-04** · **EXC-08** · **EXC-09** |
| **합계** | **31** | 10 + 12 + 4 + 5 = **31** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.**
>
> - **EXC-03 · EXC-04 · EXC-08 · EXC-09 는 뿌리가 하나다** — 이 화면이 `useCrudForm`/`useCrudList` 를 쓰지 않아 **status 분기 · 충돌 다이얼로그 · 동기 락 · 멱등키 · 행 단위 `deletingId` · `aborted` 가드 · 참조 코드**를 상속하지 못했다(BE-075 §7.6). **네 개를 따로 고치는 것이 아니라 한 배치로 프레임워크를 상속하는 것이 옳다.**
> - **IA-04 는 상품 카테고리(FS-042 §7 #4)와 공유하는 결함**이며 `<ul>` → `CrudTable` 이관이 그 해법이다. **위 네 개와 같은 배치로 묶인다** — `CrudListShell` 을 쓰면 요약의 `aria-busy`·상주 live region·빈 상태 caption 도 함께 온다.
> - **이 화면이 프로그램 화면(NFR-074)보다 나은 점 하나**: FEEDBACK-06 이 실재 표면이고 **정확히 충족한다**(4경로 · 파기 확인을 모달 밖에 · pristine 즉시 닫기). 프로그램 화면에는 그 표면이 없다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(검색·페이지네이션 range·행 선택·bulk·optimistic write·이미지 업로드·기간 필터·정렬 헤더)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime` 이 재조회 시점을 지배한다. 화면도 그 파생을 정확히 복제했다(`:337-338`). **그러나 가벼운 refetch 인디케이터가 없다** — `CrudListShell` 은 요약에 `' · 새로고침 중…'` + `aria-busy={refreshing}` 을 주는데(`CrudListShell.tsx:169-173`) 이 화면은 그 껍데기를 쓰지 않아 상속하지 못했다. 재조회 중임을 알 방법이 없다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되는지(pass) + 갱신 중 표시가 있는지(없다) | **gap(인디케이터)** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`:458-465`) — **2분기**: 필터가 걸렸으면 '필터 초기화'(`list.resetFilters`), 진짜 0건이면 등록 안내 + **CTA 와 같은 노드**(권한이 없으면 CTA 없음). **`hasQuery` 를 넘기지 않는 것이 정당하다** — 검색이 없다. 조사(이/가)는 `Empty` 가 받침으로 고른다 | `?usage=unused` 로 0건 → '필터에 맞는 …' + 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 쓰기 성공 시 `useCrudCreate`/`useCrudUpdate`/`useCrudDelete` 가 `['program-categories','list']` 를 정확히 무효화한다(`crud.ts:335,357,376`). **그러나 프로그램 화면의 선택지 키(`[programs,'category-options']`)는 무효화하지 않는다** — 키가 두 벌이라 카테고리를 추가·수정·삭제해도 프로그램 목록의 좌측 필터와 폼 셀렉트가 새로고침 전까지 낡은 목록을 본다. **이름 수정은 더 나쁘다** — 저장소가 `Program.categoryLabel` 을 전파하는데(`_shared/store.ts:507-509`) 프로그램 목록 캐시도 무효화되지 않아 **옛 이름이 남는다** | 카테고리 이름을 고친 뒤 `/programs` 로 이동. **목록의 카테고리 열이 옛 이름이면 gap** | **gap** |
| COMP-01 | P1 | **행 액션 3개가 DS `<Button>` 이 아니라 `buttonStyle('ghost')` + `tds-ui-btn-ghost` 손조립이다**(`:265-300`, 펼침 토글도 같다 `:227-238`). 그리고 **모달 제출이 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨을 쓴다**(`ProgramCategoryFormModal.tsx:136`). 툴바 CTA·다시 시도·모달 취소는 DS `<Button>` 이다. **상품 카테고리(FS-042 §7 #10)와 같은 결함이 복제됐다** | `grep -n "buttonStyle(\|tds-ui-btn-" -r apps/admin/src/pages/programs/categories` → 히트가 있으면 gap(현재 5건) | **gap** |
| COMP-04 | P1 | 이름 입력이 `FormField required`(`:144-149`)로 노출돼 라벨 옆 `*` 마커가 렌더된다. 상위 셀렉트는 선택이라 required 가 아니다 — 정확하다 | 모달에서 '카테고리 이름' 라벨 옆에만 `*` 가 붙는지 | **pass** |
| COMP-08 | P2 | **행이 인라인 편집 패턴(연필/휴지통)이라 요구의 (b) 형태다.** 액션이 최대 3개(하위 추가 · 수정 · 삭제)로 임계값 이하이며 ActionMenu 승격이 필요 없다. 중복 '상세' 버튼도 없다(상세 라우트 자체가 없다) | 행 액션이 아이콘 버튼 3개 이하인지 | **pass** |
| COMP-09 | P2 | 카테고리 이름이 `overflowWrap: 'anywhere'`(`:133`)라 **긴 이름이 열을 넓히지 않고 줄바꿈된다.** truncate + hover expand 는 아니지만 **`<ul>` 레이아웃이라 표 폭을 깨뜨릴 축 자체가 없고**, 40자 상한(`PROGRAM_CATEGORY_NAME_MAX`)이 길이를 제한한다 | 40자 이름으로 행 레이아웃이 유지되는지 | **pass(표면 경미)** |
| COMP-12 | P2 | 이름 입력이 `maxLength={40}`(`ProgramCategoryFormModal.tsx:155`)으로 네이티브 차단되는데 **카운터가 없다** — 요구가 지적하는 '조용히 멈춘' 증상 그대로다. 40자 초과 메시지는 스키마에 있으나(`validation.ts:106`) `maxLength` 가 먼저 잘라 도달하지 않는다. counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다 | 40자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: read 실패=인라인 Alert(카드 대체 — `:445-453`) · **저장 실패=모달 안 배너**(`ProgramCategoryFormModal.tsx:142` — 모달 뒤에 숨는 toast 를 쓰지 않는다) · **삭제 실패=다이얼로그 안 배너**(`:538`) · 쓰기 성공=toast 3종 · abort=아무것도 띄우지 않음. FS-075 §4.1 이 이 다섯 자리를 명시적으로 규약화했다 | 강제 실패 저장이 모달 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 삭제·저장 모두 성공(toast)·실패(배너) 양 경로가 배선돼 있다. **그러나 실패 배너가 사유와 무관하게 한 문구**라(EXC-06) '사용 중'·'하위 있음' 으로 막힌 클릭은 **아무 변화도 안 낸 것처럼 읽힌다** — 정확히는 잘못된 복구 수단을 권한다 | `?fail=programs-categories:save` 로 저장 → 가시 실패가 나오는지(pass). 사유가 구분되는지(gap — EXC-06) | **pass** |
| FEEDBACK-05 | P2 | 삭제가 확인 게이트를 얻었고(FEEDBACK-02) 본문이 비가역성을 명시한다('이 작업은 되돌릴 수 없습니다.'). **undo window 도 soft-delete 도 없다** — `removeProgramCategory` 가 배열에서 즉시 제거한다(`_shared/store.ts:520`). 요구는 'confirm **또는** undo' 이므로 confirm 으로 충족한다. **그리고 이 도메인은 삭제가 가장 잘 막힌 축이다** — 두 겹의 차단(§4.3)이 실수 삭제의 범위를 좁힌다 | 비가역 액션이 confirm 또는 undo 를 갖는지 → confirm 은 있다 | **pass(confirm) · gap(undo)** |
| A11Y-03 | P1 | ConfirmDialog 표면 2개(삭제 확인 · 파기 확인). 초기 포커스(delete/discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다. **등록/수정 모달은 이 화면이 직접 지정한다** — `initialFocusRef={nameRef}`(`ProgramCategoryFormModal.tsx:129`)로 header close(×)가 아니라 첫 편집 필드다 | DS 판정에 종속(ConfirmDialog). 모달은 열자마자 이름 입력에 포커스가 있는지 확인(pass) | **종속 · pass(모달)** |
| A11Y-08 | P1 | 이 화면에 **행 클릭 목적지가 없다**(상세 라우트 부재). 유일한 링크 목적지는 사용량 배지이며, 그것이 **`DetailCellLink` 로 감싼 키보드 도달 가능한 링크**다(`:250-255`) — 마우스 전용 행 onClick 이 아니다. 접근 이름이 목적지를 말한다(`'<이름>' 카테고리를 쓰는 프로그램 보기 (N개 프로그램)`). **미사용(0건)은 링크로 만들지 않는다** — 열어 봐야 빈 목록이라는 판단이 주석에 있다(`:248`) | Tab 으로 사용량 배지에 도달하고 Enter 로 `/programs?category=<id>` 가 열리는지 | **pass** |
| A11Y-13 | P1 | **모달 open 시 첫 편집 필드에 포커스한다**(`initialFocusRef={nameRef}` — `:129`). **submit 검증 실패 시에도 이름 입력으로 포커스를 옮긴다** — `handleSubmit(onValid, () => nameRef.current?.focus())`(`:127`). 필드가 둘뿐이고 오류가 나는 것이 이름 하나라 '첫 invalid 필드'와 일치한다 | 이름을 비운 채 '추가' → `document.activeElement` 가 이름 입력인지 | **pass** |
| A11Y-16 | P1 | 대부분 충족한다: 펼침 토글이 `aria-expanded` + `aria-controls` + **개수를 실은 접근 이름**(`'<이름> 하위 카테고리 펼치기/접기 (N개)'` — `:234`) · 토글이 없는 행에 **같은 폭의 `aria-hidden` 자리표시**(`:239-242`) · 행 액션 3종이 전부 접근 이름을 갖고 **삭제는 이유까지 말한다**(`:290-294`) · 필터 `navLabel`(`:427`) · 링크 접근 이름(`:252`) · 배지가 색이 아니라 **라벨로 이중 인코딩**(`categoryUsageLabel` — '미사용'/'N개 프로그램'). **잔여 둘**: ① **상주 live region 이 없다** — `CrudListShell` 을 쓰지 않아 필터로 행 수가 바뀌는 전환이 announce 되지 않는다 ② `<ul>` 목록에 caption 격의 접근 이름(`aria-label`)이 없다 | 필터를 걸어 행 수를 바꿀 때 스크린리더가 사유를 읽는지(현재 안 읽는다 — §5 #6) | **gap(잔여)** |
| ERP-01 | P1 | 이 화면의 배지 tone 은 둘뿐이다 — 사용량(`info`/`neutral` — `:254,257`)과 하위 개수(`neutral` — `:260`). **lifecycle status 축이 이 도메인에 없어** 레지스트리를 요구할 표면이 작다. 문구는 `categoryUsageLabel`(`types.ts:213-215`) 한 함수가 소유한다 | 모든 배지가 정의된 tone 으로 해석되는지 | **pass(표면 경미)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 건수가 `formatNumber` 를 경유한다(`:440` · `types.ts:214`). **조사가 정확하다** — 삭제 버튼 접근 이름이 `'<이름> — <사유>이라 삭제할 수 없습니다'`(`:292`)이고 두 사유('N개 프로그램'·'하위 카테고리 있음')가 **둘 다 받침으로 끝나** '이라'가 맞는다. **상품 카테고리의 `'N개 상품라'` 오류(FS-042 §7 #11)가 여기서는 고쳐져 있다** | 사용자 대상 문자열의 조사가 맞는지 | **pass** |
| ERP-13 | P1 | 리터럴 조사 폴백이 0건이다(grep `이(가)`·`을(를)`·`은(는)` = 0 실측). 토스트 3종은 이름 뒤에 항상 '카테고리를'이 와서 조사 주입이 필요 없고(`:394,406-408`), 빈 상태의 조사는 `Empty` 가 받침으로 고른다. **다만 §ERP-06 의 '이라'는 두 사유가 우연히 둘 다 받침이라 맞는 것**이며, 사유가 늘면 헬퍼가 필요해진다 | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass(조건부)** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다(IA-04 gap 과 같은 뿌리). 카테고리는 운영자가 만드는 만큼 늘어난다. **완화**: 검색이 없어 입력당 전량 스캔이 발생하지 않고, `<ul>` 이라 표 레이아웃이 깨질 여지가 없다. **그러나 집계가 O(카테고리 × (프로그램 + 카테고리))** 이고(`_shared/store.ts:453-459`) 그 계산이 **조회마다** 돈다 | 카테고리 200건 · 프로그램 1,000건 픽스처로 렌더·필터가 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 모달 언마운트(`ProgramCategoryFormModal.tsx:87`)·삭제 다이얼로그 닫기(`:374`)에서만 발생한다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족 — 그리고 그중 셋은 거짓 안내다.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능한데, **이 화면이 status 로 전혀 분기하지 않는다** — `onError` 둘 다 `isAbort` 만 보고 400·403·404·409·422·429·5xx 를 **한 문구로** 뭉갠다(`ProgramCategoryFormModal.tsx:97-100` · `ProgramCategoriesPage.tsx:396-399`). **게다가 저장소가 던지는 계층 위반·삭제 차단 오류는 status 조차 없는 generic `Error`** 다(`_shared/store.ts:475-481,499-501,513-521`) — status 분기를 넣어도 잡히지 않는다. **'사용 중이라 삭제 불가'·'하위가 있어 삭제 불가'·'2단계까지만 만들 수 있습니다'가 '잠시 후 다시 시도해 주세요' 로 보이면 운영자는 영원히 재시도한다** | `?status=save:403` · `save:409` · `save:422` · `save:500` · `delete:409` 가 다른 surface 를 그리는지. **전부 같은 배너면 gap**(현재 그렇다). 저장소 오류는 사용 중인 카테고리('tech-audio')의 휴지통을 프론트 잠금 없이 눌러야 재현되는데, **프론트가 먼저 막아 브라우저에서는 도달하지 않는다** — 방어선은 `programs.test.ts:281-291` 이다 | **gap** |
| EXC-07 | P1 | **미충족.** 422 의 `violations` 를 RHF `setError` 로 꽂는 경로가 이 화면에 **없다** — `useCrudForm.ts:209-219` 가 그 일을 하는데 모달이 그 훅을 쓰지 않는다. 클라이언트 zod 오류는 정확히 인라인으로 가지만(`FormField error` + `aria-describedby`) **서버 422 는 전부 모달 상단 배너로 간다.** BE-075 §7.5 의 `DUPLICATE_CATEGORY_NAME` 이 도입되면 **바로 이 경로가 필요해진다** | `?status=save:422` → 이름 입력에 인라인 오류가 뜨는지. **배너로만 뜨면 gap**(현재 그렇다) | **gap** |
| EXC-10 | P1 | **표면이 없다** — bulk 작업이 이 화면에 없다(행 선택 부재) | — | **n-a** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면이 부분적으로만 있다.** 이 화면에 **detail 라우트가 없어** '404 vs generic load error' 의 주 표면이 없다. 어댑터의 `fetchOne` 404 는 **호출부가 0건이라 발현하지 않는다**(BE-075 §7.9). 목록 조회 실패는 404 를 구분하지 않는 단일 배너다 — 컬렉션 조회에서 404 는 의미가 없으므로 정당하다. **다만 삭제·저장의 404/409 구분이 없는 것은 EXC-06 이 잡는다** | detail 라우트가 도입되면 다시 매긴다 | **pass(표면 부재)** |
| EXC-13 | P2 | `queryClient` 가 `retry: false` 를 명시하고 이 화면이 그것을 덮지 않는다 — 결정적 픽스처에 맞는 정책이다. 재시도는 사용자 명시 액션('다시 시도' 버튼)으로만 일어난다 | `retry` 를 화면이 덮지 않는지 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장·삭제가 전부 비관적(요청 완료 후 무효화). `onMutate`/`setQueryData` grep = 0건. FS-075 §4.1 이 그 사실을 규약으로 적는다('롤백 경로가 필요 없다') | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | **표면이 없다** — 행 선택이 없어 selection scope 를 정의할 대상이 없다. `useListState` 의 선택 API 를 소비하지 않는다 | — | **n-a** |
| EXC-20 | P1 | **미충족.** 5xx 실패에 참조 코드가 없다 — `referenceOf` 소비 0건. `useCrudForm` 의 `errorReference`(`:222`) → `FormServerError` 경로를 상속하지 못했다. 모달·다이얼로그 배너가 고정 문구뿐이라 **운영자가 신고에 붙일 것이 없다.** 프로그램 폼(NFR-074 EXC-20)은 그것을 갖는다 | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지. **없으면 gap**(현재 그렇다) | **gap** |
| EXC-22 | P1 | **권한=fail-closed · 엔타이틀먼트=fail-open** 규약을 이 화면이 소비한다: 라우트 권한은 `RequirePermission` 이 막고, 엔타이틀먼트는 **매핑이 없는 이 라우트를 `granted` 로 수렴시킨다**(`module-resources.ts` 에 `/programs` 계열 0건). **다만 쓰기 축은 fail-closed 가 절반만 성립한다** — `canCreate` 만 닫고 `canUpdate`/`canRemove` 는 애초에 판정하지 않는다(EXC-03 gap). **판정을 하지 않는 것은 fail-open 도 fail-closed 도 아니다** | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 `canCreate` 하나임을 확인 | **종속(축) · gap(쓰기 미판정 — EXC-03)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 300ms (BE-075 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 지연이다. 실제 네트워크 0건 |
| 등록 p95 | ≤ 500ms | **측정 불가.** 요청이 `{ name, parentId }` 둘뿐이라 크기가 상수다 |
| **이름 수정 p95** | **≤ 1.5s** (BE-075 §2 서버 상한 10초 → 504) | **측정 불가.** **라벨 전파를 동반하면 프로그램 수에 비례한다**(BE-075 §7.7 안 B). 안 A(조회 시 조인)를 택하면 이 축이 사라지고 상한도 5초로 돌아온다 |
| 삭제 p95 | ≤ 500ms | **측정 불가.** 서버는 차단 판정 2건(사용 중 · 하위 있음)을 먼저 돈다 |
| 사용량 집계 | **서버 GROUP BY 1회** | **미충족(픽스처)** — `listProgramCategoryUsage()`(`_shared/store.ts:453-459`)가 카테고리마다 `countProgramsUsingCategory`(프로그램 전량 filter)와 자식 탐색(카테고리 전량 some)을 돈다 → **O(카테고리 × (프로그램 + 카테고리))**. 픽스처(8×5)에서는 드러나지 않는다. **연동 시 사라진다**(BE-075 §7.10) |
| 트리 조립 | O(루트 × 전량) | `:350-362` 가 루트마다 `visible`·`categories` 를 훑는다. 렌더마다 `useMemo` 로 1회 |
| 첫 렌더 | ≤ 1s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 내 재진입 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 쓰기 성공 후 재조회 | 목록 1회 | `crud.ts:335,357,376`. **프로그램 화면의 선택지 키는 무효화하지 않는다**(§3 STATE-06 gap) |
| 상위 셀렉트 조회 | **0 요청** | **모듈 배열 동기 읽기다**(`listProgramCategoryRoots()` — `ProgramCategoryFormModal.tsx:55`). 캐시 밖이라 무효화와 무관하고, **백엔드가 붙으면 이 축이 요청 1건으로 바뀐다**(BE-075 §7.9) |
| 저장 요청 크기 | ≤ 1KB | **충족(구조적)** — `{ name, parentId }` 둘뿐이고 `name` 이 40자 상한이다 |
| 메모리 | 카테고리 전량 1벌 | 전량 보유. 프로그램은 이 화면이 들지 않는다(집계값만 받는다) |
| 번들 | 이 화면 고유 코드 ≤ 15KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 전용 코드는 `ProgramCategoriesPage.tsx` 546행 + `ProgramCategoryFormModal.tsx` 200행 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:445-453`). **툴바·좌측 필터는 살아남는다** — 배너가 카드만 대체한다. **부작용**: '전체 0개'와 '불러오지 못했습니다'가 **동시에 보인다**(§5 #8) |
| 목록 재조회 중 | 이전 행 유지 + 갱신 표시 | **부분 충족** — 이전 행은 유지되나(`placeholderData`) **갱신 중임을 알 표시가 없다**(§3 STATE-03 gap) |
| 저장 실패(5xx) | 모달 안 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존·재시도는 있고(`:142`, 재제출 시 먼저 지운다 `:125`) **참조 코드가 없다**(EXC-20 gap) |
| 저장 실패(422 중복 이름) | 그 입력의 인라인 오류 | **미충족** — 배너로 뭉개진다(EXC-07 gap). **그리고 서버 제약 자체가 아직 없다**(BE-075 §7.5) |
| 저장 실패(409 대상 부재) | conflict 안내 + 입력 보존 | **미충족** — generic 배너(EXC-04 gap). 입력은 보존된다 |
| 저장 실패(계층 위반) | 그 사유를 말한다 | **미충족** — 저장소가 정확한 문구를 던지는데(`'카테고리는 2단계까지만 만들 수 있습니다.'` 등) 화면이 그것을 버린다. **재시도해도 영원히 실패한다** |
| 삭제 실패(409 사용 중 / 하위 있음) | 사유 + 복구 경로 | **미충족(문구)** — generic 배너. **다만 복구 경로는 화면에 이미 있다** — 사용량 배지가 `/programs?category=<id>` 로 데려간다(`:249-255`). **안내와 경로가 아직 만나지 못했다** |
| 삭제 진행 중 다른 행 | 그 행만 잠긴다 | **미충족** — `deleting` 이 화면 단위 플래그라(`:332`) **모든 행의 삭제 버튼이 함께 비활성된다.** `useCrudList` 의 `deletingId`(`useCrudList.tsx:252`)를 상속하지 못했다 |
| 저장 중 이탈(모달 닫기) | abort · 실패 통지 없음 · **성공 통지도 없음** | **부분 충족** — abort 와 실패 무통지는 있으나 **`onSuccess` 에 `aborted` 가드가 없어 닫힌 모달의 성공 토스트가 뜬다**(EXC-09 gap). 삭제 쪽은 정확히 갖고 있다(`:392`) |
| 삭제 중 이탈(다이얼로그 닫기) | abort + reset + 통지 없음 | **충족**(`closeDelete` — `:373-379`) |
| 연타(더블클릭) | 정확히 1개 요청 | **미충족**(EXC-08 gap). **중복 이름 검증도 없어 결과가 '같은 이름의 카테고리 2개' 다** |
| 동시 편집(둘 다 존재) | 나중 저장이 앞선 처리를 덮지 않는다 | **미충족 — last-write-wins**(EXC-04 gap). **덮인 이름이 라벨 전파로 프로그램 전체에 퍼진다** |
| 모달이 열린 사이 부모가 삭제됨 | 그 사유를 말한다 | **미충족** — 저장소가 `'상위 카테고리를 찾을 수 없습니다.'` 를 던지는데 generic 문구가 된다 |
| 모달이 열린 사이 자식이 생김 | `parentLocked` 가 반영된다 | **미충족** — `parentLocked` 판정이 **모달을 연 시점의 `hasChildren`** 이다(`ProgramCategoryFormModal.tsx:59`). 셀렉트가 잠기지 않은 채 이동을 시도하고 저장소가 던진다 |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 모달 입력을 버린다. **이름 한 줄 + 셀렉트 하나라 손실이 작다**(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 집계 실패 | '모른다'를 '0'으로 뭉개지 않는다 | **구조적으로 미보장** — `programCount: number` · `hasChildren: boolean` 이라 **'모른다' 를 표현할 자리가 타입에 없다**(BE-075 §7.4). 이 리포에는 옳은 형태가 있다(`carrierDeleteBlock(carrier, usage: number \| null)` — `shared/domain/shipment.ts:154-163`). **집계 실패를 0 으로 내려보내면 삭제 버튼이 열린다** |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 분류 무결성 · 참조 정합

이 화면은 **다른 도메인이 참조하는 이름과 계층**을 정한다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **3단계 계층을 만들 수 없다** | **충족(두 겹)** — 화면이 상위 선택지를 1Depth 로 좁히고(`ProgramCategoryFormModal.tsx:55`), 저장소가 `assertAssignableParent` 로 다시 막는다(`_shared/store.ts:479-481`). 회귀 `programs.test.ts:269-274`. **재귀가 없는 것이 상한의 증거다** — 롤업 필터도 한 겹뿐이다(`types.ts:76-77`) |
| **하위를 가진 카테고리를 옮길 수 없다** | **충족(두 겹)** — `parentLocked`(`:59,182`)와 저장소 판정(`_shared/store.ts:499-501`). **이 술어가 없으면 ④만으로는 손자가 생긴다.** 회귀 `programs.test.ts:275-279`. **잔여**: `parentLocked` 는 모달을 연 시점 스냅샷이라 경합에서 뚫린다(§4.2) |
| **자기 자신을 상위로 지정할 수 없다** | **충족(두 겹)** — 화면이 후보에서 자기를 빼고(`:56`), 저장소가 판정한다(`_shared/store.ts:474-476`) |
| **사용 중인 카테고리를 지울 수 없다** | **충족(두 겹) · 문구는 거짓** — 버튼 잠금(`:218-220,296`)과 저장소 throw(`_shared/store.ts:514-516`). 회귀 `programs.test.ts:281-284`. **①은 조회 시점 스냅샷이라 경합에서 반드시 뚫리고, 그때 ②가 받는다 — 그것이 이 이중 방어의 존재 이유다.** 그러나 ②의 실패가 '잠시 후 다시 시도' 로 보인다(§4.2) |
| **하위가 있는 카테고리를 지울 수 없다** | **충족(두 겹) · 안내는 절반** — 같은 두 층. 회귀 `programs.test.ts:287-290`. **그러나 상시 안내문이 이 사유를 말하지 않는다**(`:514-518` 은 '사용 중' 만 적는다) — 키보드·터치 사용자는 버튼 `title` 에 닿을 수 없어 **이유를 알 길이 없다** |
| 차단 사유가 접근 이름으로 전달된다 | **충족** — `'<이름> — <사유>이라 삭제할 수 없습니다'`(`:290-294`). 색·`disabled` 만으로 말하지 않는다 |
| **삭제 차단 판정의 정본이 서버다** | **미보장(현재) · 계약으로 명시** — 프론트 판정은 스냅샷 기반이고, 서버가 실시간 값으로 다시 판정해야 한다(BE-075 EP-04 검증 11). **집계 실패를 0 으로 뭉개면 그 방어가 무너진다**(§4.2) |
| **이름 중복을 막는다** | **미충족** — 스키마에 유일성 검증이 없고(`validation.ts:105-109`) 저장소도 그냥 append 한다(`_shared/store.ts:484-491`). **같은 대분류 아래 '음향기기'를 두 번 만들 수 있고**, 그러면 프로그램 폼의 중분류 셀렉트에 같은 이름이 두 개 뜬다. **연타(EXC-08)가 정확히 이 사고를 만든다.** 유일성은 원자적 제약이라 클라이언트가 강제할 수 없다(BE-075 §7.5) |
| **이름 변경이 프로그램의 라벨에 전파된다** | **충족(픽스처) · 계약은 서버의 것** — `updateProgramCategory` 가 같은 함수 안에서 `programs` 를 map 한다(`_shared/store.ts:507-509`)라 원자적이다. **서버에서는 두 테이블 갱신이라 트랜잭션이 필요하거나, 조인으로 전파 자체를 없애야 한다**(BE-075 §7.7) |
| **그 전파가 프로그램 화면에 반영된다** | **미충족** — 쿼리 키가 두 벌이라(`['program-categories','list']` vs `[programs,'list']`·`[programs,'category-options']`) **저장소는 바꿨는데 화면은 옛 이름을 본다.** 백엔드와 무관하게 지금 고칠 수 있다 |
| 없는 카테고리를 가리키는 프로그램이 생기지 않는다 | **충족** — 사용 중 삭제 차단이 그것을 막는다. **다만 `labelOf` 는 없는 id 에 id 를 그대로 뱉는 폴백을 갖는다**(`_shared/store.ts:234-235`) — 그 상태가 오면 내부 식별자가 화면에 노출된다 |
| 하위 개수 배지가 사실을 말한다 | **미충족** — 배지의 존재 조건은 `category.hasChildren`(**전량 기준** — `_shared/store.ts:457`)인데 숫자는 `group.children.length`(**필터 통과분** — `:481`)다. **'미사용'만 볼 때 하위가 전부 사용 중이면 '하위 0개'가 나온다.** 같은 값이 펼침 토글의 접근 이름에도 들어간다(`:234`) |
| 툴바 건수가 화면과 일치한다 | **미충족** — 요약은 `visible.length`(필터 통과분 — `:440`)인데 트리는 **필터에 걸리지 않은 부모까지 남긴다**(`:350-362`). '미사용'만 골랐을 때 '전체 3개'라고 쓰여 있는데 행은 5줄 보일 수 있다. **부모를 남기는 것 자체는 의도다**(계층이 곧 정보다 — `:346-349`) — 어긋나는 것은 세는 기준이다 |
| 노출 순서를 정할 수 있다 | **불가** — `ProgramCategory` 에 `order` 필드가 없다(전수 확인). 목록·프로그램 필터·프로그램 폼 셀렉트가 전부 **등록 순**이고 정렬 UI 도 없다. **의도된 단순화인지 미구현인지 미정**(BE-075 §7.2 · §7.12 #8) |
| 감사 이력 | **없다.** 누가 언제 카테고리를 지웠는지·이름을 바꿨는지 기록하는 필드·엔드포인트가 없다. **이름 변경이 프로그램 다수의 표시를 바꾸는 도메인이라 이 부재가 가볍지 않다** |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | EXC-03 · EXC-04 · EXC-08 · EXC-09 · EXC-06 · EXC-07 · EXC-20 · STATE-03 · IA-04 | **P0 ×4** · P1 | **이 화면이 `useCrudForm`/`useCrudList` 를 쓰지 않아 여덟 장치를 상속하지 못했다** — status 분기 · 충돌 다이얼로그 · 422 필드 매핑 · 동기 제출 락 · 멱등키 · 행 단위 `deletingId` · `onSuccess` 의 `aborted` 가드 · 참조 코드. **P0 네 개가 이 한 뿌리에서 나오므로 한 배치로 푼다.** `CrudListShell`/`CrudTable` 이관이 IA-04·STATE-03·A11Y-16 잔여까지 함께 닫는다 | 이 화면 + 공용(훅의 라우트 의존 분리 선행) | **UI 기획 (최우선 · 횡단)** · 프론트 구현 (BE-075 §7.6 · FS-075 §7 #4·#9·#10·#15·#16·#18) |
| 2 | (§4.3) | — | **삭제 차단·계층 위반의 문구가 거짓 안내다** — '잠시 후 다시 시도' 해도 영원히 실패한다. 서버 409 + `error.code` 구분 + N 을 포함한 구체 문구가 필요하고, **`HttpError` 에 `code` 를 실을 자리가 없다** | 이 화면 + BE 계약 + 공용 타입 | 백엔드 명세 · **UI 기획/프론트 구현(`HttpError.code`)** (BE-075 §7.3 · §7.12 #3) |
| 3 | (§4.3) | — | **집계 실패를 '0'으로 뭉개면 삭제가 열린다** — `programCount`/`hasChildren` 에 '모른다' 를 표현할 자리가 없다. 이 리포의 `carrierDeleteBlock`(3상태 + fail-closed)이 옳은 형태다 | BE 계약 (+ 선택적 프론트 타입) | **백엔드 명세 (BE-075 §7.4 · §7.12 #2)** |
| 4 | (§4.3) | — | **이름 중복을 막지 않는다** — 같은 이름 2개가 만들어지고 프로그램 폼 셀렉트에 나란히 뜬다. **#1 의 멱등키 부재와 만나면 연타 하나가 그것을 만든다.** 유일성 범위(전역 vs 부모 아래)와 정규화 기준 확정 필요 | BE 계약 · 아키텍처 | 백엔드 명세 (BE-075 §7.5 · FS-075 §7 #13) |
| 5 | STATE-06 · (§4.3) | P1 | **이 화면의 변경이 프로그램 화면의 카테고리 캐시를 무효화하지 않는다** — 키가 두 벌이다. **이름을 고치면 저장소는 전파하는데 화면은 옛 이름을 본다. 백엔드와 무관하게 지금 고칠 수 있다** | 이 화면 + 프로그램 화면 | UI 기획 쪽 변경 요청 (FS-075 §7 #19 · BE-074 §7.12 #14) |
| 6 | A11Y-16(잔여) | P1 | **상주 live region 이 없다** — 필터로 행 수가 바뀌는 전환이 announce 되지 않는다. `<ul>` 목록에 접근 이름도 없다. **#1 의 `CrudListShell` 이관이 이것을 함께 닫는다** | 이 화면 | UI 기획 쪽 변경 요청 |
| 7 | (§4.3) | — | **하위 개수 배지와 툴바 건수가 사실과 어긋난다** — 배지는 `hasChildren`(전량) + `childCount`(필터 후)를 섞고, 요약은 `visible.length` 인데 트리는 부모를 더 그린다. **펼침/접힘 상태가 화면 로컬이라 새로고침에서 사라지는 것**도 같은 계열 | 이 화면 | 프론트 구현 · UI 기획 (FS-075 §7 #5·#7·#8) |
| 8 | (§4.2) | — | 조회 실패 시 **툴바의 '전체 0개'가 배너와 동시에 보인다** — 배너가 카드만 대체한다. **상시 안내문은 빈 상태·로딩 중에도 표시되고, 두 번째 차단 사유를 말하지 않는다** | 이 화면 | UI 기획 쪽 변경 요청 (FS-075 §7 #11·#12·#17) |
| 9 | COMP-01 · COMP-12 | P1 · P2 | 행 액션 3개 + 펼침 토글이 **DS `<Button>` 이 아니라 `buttonStyle('ghost')` 손조립**이고, 모달 제출이 `loading` prop 대신 손으로 쓴 라벨을 쓴다. 이름 입력에 글자 수 카운터가 없다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-075 §7 #9) |
| 10 | ERP-15 · (§4.1) | P1 | 전량 렌더 + **집계가 O(카테고리 × (프로그램 + 카테고리))** 이고 조회마다 돈다. 서버는 GROUP BY 한 번이어야 한다. **카테고리 수 상한**이 필요한지 확정 | 이 화면 + BE 계약 | 백엔드 명세 · 아키텍처 (BE-075 §7.10 · §7.12 #14) |
| 11 | (§4.2) | — | **상위 셀렉트가 어댑터도 캐시도 지나지 않는다** — 백엔드가 붙으면 이 한 줄이 비동기가 되어 **모달의 구조가 바뀐다**(로딩·실패 상태 신설). '아직 못 읽었다' 와 '대분류가 없다' 를 구분해야 한다 | 이 화면 + BE 계약 | 프론트 구현 · 백엔드 명세 (BE-075 §7.9 · §7.12 #11) |
| 12 | EXC-04(잔여) | P0 | **수정 모달이 행 데이터를 그대로 쓰고 상세를 재조회하지 않는다** — 낡은 값을 편집하고, 토큰이 없어 그것이 최신을 덮으며, **덮인 이름이 라벨 전파로 프로그램 전체에 퍼진다** | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 (BE-075 §7.8 · §7.12 #9 · FS-075 §7 #20) |
| 13 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | 프론트 구현 · UI 기획 (FS-075 §7 #21) |
| 14 | (§4.3) | — | **노출 순서가 없다** — 목록·프로그램 필터·프로그램 폼 셀렉트가 전부 등록 순이고 정렬 UI 도 없다. 의도된 단순화인지 미구현인지 확정 필요. **감사 이력도 없다** | 아키텍처 · BE 계약 | 아키텍처 (도메인 경계) (BE-075 §7.2 · §7.12 #8 · FS-075 §7 #23) |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`programCategoryAdapter` 는 `scope: PROGRAM_CATEGORY_RESOURCE`(`data-source.ts:24,41` — 값은 **`'program-categories'`**)로 `fixtureRequest` 를 부른다. `createStoreAdapter` 가 4개 op 을 제공하나 **화면이 실제로 부르는 것은 3개**다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll` (`crud.ts:200`) | `?fail=list` · `?fail=program-categories:list` · `?fail=all` | FS-075-EL-011 |
| `save` | `create` (`crud.ts:227`) · `update` (`crud.ts:241`) | `?fail=save` · `?fail=program-categories:save` · `?fail=all` | FS-075-EL-008.3 |
| `delete` | `remove` (`crud.ts:268`) | `?fail=delete` · `?fail=program-categories:delete` · `?fail=all` | FS-075-EL-009 |
| `detail` | `fetchOne` (`crud.ts:205`) — **호출부 0건** | — | **`?fail=detail` 은 이 화면에서 아무 효과가 없다**(수정 모달이 행 데이터를 쓴다 — BE-075 §7.9) |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 경과 후 재진입**으로 한다.
- **scope 를 생략한 `?fail=list` 는 프로그램 화면의 어댑터도 함께 실패시킨다**(scope 가 `'programs'` 로 다르지만 op 이 같다 — `dev.ts:122`). 두 화면을 가르려면 `?fail=program-categories:list` 처럼 **scope 를 반드시 붙인다.**
- **상위 셀렉트 조회(`listProgramCategoryRoots()`)는 어떤 스위치로도 실패시킬 수 없다** — `fixtureRequest` 를 지나지 않는 모듈 배열 직접 읽기다(`ProgramCategoryFormModal.tsx:55`). 지연·취소·실패 재현 계약 밖이다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| **EXC-06 (status 분기 부재)** | `?status=save:403` · `save:409` · `save:422` · `save:500` · `delete:409` 를 차례로 건다. **다섯이 전부 같은 문구('…하지 못했습니다. 잠시 후 다시 시도해 주세요.')면 gap**(현재 그렇다) |
| **EXC-04 (409 conflict)** | `?status=save:409` 로 모달 저장, `?status=delete:409` 로 삭제. **conflict 다이얼로그 없이 generic 배너면 gap**(현재 gap). 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt\|isConflict" apps/admin/src/pages/programs/categories` → **0건**으로 확인 |
| **EXC-08 (중복 제출)** | `?status=` 없이 정상 저장을 연타(또는 네트워크 스로틀 후 Enter 2회). **요청이 2건 발사되고 같은 이름의 카테고리가 2개 생기면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/programs/categories` = **0건**으로도 판정된다 |
| **EXC-09 (aborted 가드)** | 모달에서 저장을 누른 뒤 `LATENCY_MS`(400ms) 창 안에 Esc 로 닫는다. **닫힌 모달의 성공 토스트가 뜨면 gap**(현재 그렇다). 삭제 다이얼로그에서 같은 조작을 하면 아무것도 뜨지 않는다(pass) |
| **EXC-03 (쓰기 게이팅)** | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/programs/categories` 의 `update`/`remove` 를 끄면 **연필·휴지통이 그대로 남는다**(gap). `create` 를 끄면 '카테고리 추가'와 행 `+` 버튼이 사라진다(pass) |
| EXC-07 (422 필드 매핑) | `?status=save:422` — **이름 입력에 인라인 오류가 아니라 배너가 뜨면 gap**(현재 그렇다). 스위치가 던지는 `HttpError` 는 `violations` 가 **비어 있으므로**(`dev.ts:93`) 서버 연동 후 실제 `violations` 경로는 별도 확인이 필요하다 |
| EXC-20 (reference code) | `?status=save:500` — 배너에 `오류 코드 TDS-…` 가 **없으면 gap**(현재 그렇다). `?fail=save` 로는 애초에 재현되지 않는다(generic `Error` 에는 `reference` 가 없다) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fprograms%2Fcategories&reason=session_expired` 로 가면 pass |
| FEEDBACK-02 (다이얼로그 유지) | `?fail=program-categories:delete` → 미사용 카테고리 삭제. **다이얼로그가 남고 배너가 뜨며 확인 버튼이 되살아나면 pass**(현재 pass) |
| **FEEDBACK-06 (4경로 dirty 가드)** | 모달을 열어 이름을 한 글자 입력 → ① Esc ② 딤 클릭 ③ × ④ '취소'. **네 경로 모두 파기 확인이 뜨면 pass**(현재 pass). 입력하지 않고 같은 넷을 밟으면 **즉시 닫혀야** 한다 |
| EXC-21 (거절 계열) | 플랜 축은 **재현 대상이 없다** — `grep -n "programs" apps/admin/src/shared/entitlements/module-resources.ts` = **0건**. 권한 축은 권한 스토어로 `read` 를 꺼 403 화면을 본다(판정은 `RequirePermission` 소유) |

**브라우저에서 도달하지 않는 경로 — 방어선은 단위 테스트다**: 저장소가 던지는 다섯 오류(자기 자신 상위 · 없는 상위 · 2단계 초과 · 하위 보유 이동 · 삭제 차단 2종)는 **화면이 선택지·버튼 잠금으로 먼저 막아** 정상 조작으로는 도달하지 않는다. 그 규칙의 회귀 방어선은 **`programs.test.ts:269-291`**(2Depth 규칙 8건 — 사유 문자열까지 고정)과 **`:623-630`**(카테고리 폼 검증)이다. **경합에서는 실제로 도달하며**(§4.2) 그때 문구가 거짓이 된다(EXC-06 gap).

**렌더 테스트가 없다**: 이 화면에 `*.test.tsx` 가 0건이라 **FEEDBACK-06 의 4경로 · A11Y-11 의 describedby 짝 · A11Y-13 의 포커스 이동**이 DOM 수준에서 고정돼 있지 않다. 이 문서의 그 세 pass 는 **코드 대조 근거**다.

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **EXC-03 · EXC-04 · EXC-08 은 grep 0건으로도 판정 가능함**을 함께 적었다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 페이징·선택 부재 · **COMP-10 검색 입력 자체가 없음** · **FEEDBACK-04 페이지 폼이 없음(모달은 FEEDBACK-06 이 다룬다)** · IA-05 폼 라우트 쌍 부재 — **그 부재가 IA-06 을 따른 결과임을 밝혔다**)
- [x] §2.1 산수 검산 — **10 pass + 12 종속 + 4 n-a + 5 gap = 31** ✓
- [x] **FEEDBACK-06 을 실재 표면으로 판정**했다 — 이 화면이 요구의 정확한 대상(폼 모달)이고, 4경로가 **한 함수(`requestClose`)로 덮이며** 파기 확인이 모달 밖에 렌더되고 pristine 이면 즉시 닫힌다는 것을 코드로 확인했다(프로그램 화면에는 이 표면이 없다)
- [x] **IA-02 를 pass 로 판정**하고 그 근거를 밝혔다 — sub-route 가 없고 자체 `<h1>` 이 0건이라 `<h1>` 이 정확히 1개다. **앱 전역 모델 정의는 이 화면 밖의 일**임을 명시해 프로그램 화면의 gap 과 혼동되지 않게 했다
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. **TOKEN-05 를 `종속` 으로 판정한 근거**(이 화면이 heading tier 를 소비하는 표면을 소유하지 않는다)도 코드로 댔다. 앱 공용 프레임워크의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(검색·bulk·행 선택·optimistic·이미지 업로드·정렬 헤더)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. 성능 수치는 전부 '측정 불가(백엔드 없음)' 이고, **라벨 전파가 만드는 별도 예산 줄**을 세웠다
- [x] §4.3 을 **분류 무결성 · 참조 정합** 축으로 세웠다 — 2단계 상한 · 이동 금지 · 삭제 차단 2종 · 중복 이름 · 라벨 전파와 그 캐시 반영 · 배지의 사실성 · 순서 부재 · 감사 부재
- [x] §6 의 `?fail=` scope(`program-categories`)와 op 를 **어댑터 코드에서 확인**했고(`detail` 이 무효임 포함), **scope 를 생략하면 프로그램 화면까지 함께 실패한다**는 사실과 **상위 셀렉트 조회가 스위치 밖**이라는 사실을 명시했으며, **`?delay=` 를 쓰지 않았다**
- [x] §5 의 gap 이 FS-075 §7 · BE-075 §7.12 와 대응한다. **P0 네 개가 한 뿌리(프레임워크 미상속)임을 §2.1 과 §5 #1 에서 같은 말로 묶었다**
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가', E2E 미실행을 §1·§6 에 명시했고, **이 화면에 렌더 테스트가 0건이라 세 pass 가 DOM 수준에서 고정돼 있지 않다**는 사실도 §6 에 남겼다
