---
id: NFR-074
title: "프로그램(후원형 펀딩) 비기능 명세"
functionalSpec: FS-074
backendSpec: BE-074
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-074. 프로그램(후원형 펀딩) 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-074 프로그램 (`/programs` · `/programs/:id` · `/programs/new` · `/programs/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-074(요소·예외) · BE-074(계약·보안 판정) · FS-075/BE-075(카테고리 — 이 화면이 선택지로 읽는다) · `specs/quality-bar.md` |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-074 §7 · BE-074 §7.12 와 대응해야 한다 |
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

**네 개의 라우트가 한 권한 리소스를 공유하고, 그중 하나가 1407줄짜리 폼이다.** 목록·상세는 읽는 화면이고 실제 위험은 폼에 있다 — 저장 1회가 본문·이미지 2종·옵션 그룹·**개수 상한 없는 리워드**를 **전체 치환**으로 보낸다(BE-074 §7.3). 그래서 이 화면의 P0 는 **중복 제출(EXC-08)** · **동시성(EXC-04)** · **미저장 이탈(FEEDBACK-04)** 에서 무겁게 읽어야 한다.

**그리고 이 화면은 공용 CRUD 프레임워크를 가장 깊이 상속한 축에 든다.** `useCrudList`(목록·삭제·일괄 삭제) · `CrudListShell`(요약·live region·빈 상태·실패 배너) · `useCrudForm`(권한 게이팅·404 분기·409 충돌 다이얼로그·422 필드 매핑·동기 락·**멱등키**·참조 코드)를 전부 쓴다. 그 결과 클레임(NFR-044)이 gap 으로 잡던 **EXC-08 이 여기서는 pass** 이고, **EXC-04 도 절반이 이미 서 있다**(충돌 다이얼로그가 실재한다 — 토큰만 없다).

**남은 무거운 축은 셋이다**: 페이지네이션 부재(IA-04) · sub-route 이중 `<h1>`(IA-02) · 낙관적 동시성 토큰 부재(EXC-04). 그리고 **이 화면은 어떤 엔타이틀먼트 모듈에도 속하지 않아**(`module-resources.ts:29-91` 전수) 플랜 축이 없고, 대신 **결제 설정 축이라는 다른 계열의 거절 표면**을 갖는다(상세의 후원 CTA 안내 — EXC-21).

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 개의 data view 가 전부 하나만 그린다.** ① **목록**: `firstLoading = isFetching && data === undefined`(`useCrudList.tsx:133`)를 껍데기가 `loading` 으로만 쓴다(`CrudListShell.tsx:193`). busy 는 `refreshing` 으로 분리돼 재조회 중 이전 행이 유지된다 — `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:298`)가 뒷받침한다 ② **상세**: `program === undefined`(`ProgramDetailPage.tsx:303`)이고 **error 분기가 항상 앞선다**(`:279`). 주석이 그 판단을 적는다(`:302`) ③ **폼**: `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:163`) ④ **카테고리 선택지**: 실패가 필터 패널 안에서만 말해지고 프로그램 목록은 살아 있다(`ProgramListPage.tsx:351-352`) | `/programs` 진입 → 렌더 확인 → 필터 변경(또는 `staleTime` 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 네 read 실패가 전부 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`CrudListShell.tsx:225-232`) '프로그램 목록을 불러오지 못했습니다.' + '다시 시도'. **상세**(`ProgramDetailPage.tsx:279-300`) 404 → '…찾을 수 없습니다' + back link 만 / 그 밖 → '…불러오지 못했습니다.' + '다시 시도'. **폼 로드**(`ProgramFormPage.tsx:909-931`) 같은 404/일반 분기 + '목록으로'. **카테고리 필터**(`FilterPanel failed + onRetry`). read 실패에 toast 를 쓰지 않고(이 도메인에서 실패 통지에 toast 를 쓰는 경로가 0건이다) empty 로 폴백하지 않는다 | `?fail=list` · `?fail=detail` 로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap | **pass** |
| STATE-04 | STATE | 직접 | **요구의 두 절 중 실재하는 절을 충족한다.** ① **page clamp** — **표면이 없다.** 페이지네이션이 없어 out-of-range page 가 생기지 않는다(그 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸이 그것을 면제하지 않는다). `useListState` 는 `clampPage` 를 이미 갖고 있어 배선만 하면 된다 ② **숨겨진 행의 선택 해제** — **배선돼 있다.** `useEffect(() => { clear(); }, [status, category, keyword, clear])`(`ProgramListPage.tsx:183-185`)가 상태·카테고리·검색어가 바뀔 때마다 선택을 비운다. 주석이 그 이유를 적는다(`:181-182` — '화면에 없는 행이 선택된 채 선택 3건 삭제가 되지 않게') | 3건을 선택한 뒤 상태 필터를 바꾼다. **SelectionBar 의 '선택 N건' 이 0 으로 돌아가면 pass.** 페이지네이션이 도입되면 ①을 다시 매긴다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/programs/*.tsx` · `types.ts` · `_shared/store.ts` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22). 파생 치수는 `calc(${cssVar('space.6')} * 16)`(`ProgramDetailPage.tsx:101`) · `* 9`(`ProgramListPage.tsx:88`) · `* 12`·`* 14` 같은 space 토큰 배수로만 표현한다. `box-shadow`·`transition` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px" apps/admin/src/pages/programs --include=*.tsx --include=*.ts` → **0건이어야 한다.** **유일 잔여**: `program-form.css:28` 의 `@media (max-width: 1024px)` — **미디어 쿼리 조건에는 CSS 변수를 쓸 수 없다**(브라우저 제약). 스타일 값이 아니라 브레이크포인트라 요구의 'px 리터럴' 대상이 아니다 | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(상세 back link `:271` · '수정' 링크 `:341` · 결제 설정 링크 `:405` · 폼 '목록으로' `:937` · 옵션·리워드 손조립 입력 `:400,410,427` · `DetailCellLink`) · DS `<Button>`·`<SelectField>`·`<RichTextField>`·`<ImageUploadField>`·`<SearchField>`. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인(`program-form.css` 는 레이아웃 미디어 쿼리뿐) | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS Table 스켈레톤 펄스 · Toast(저장·삭제 성공 3종) · DS `<Button>` transition · Modal 4종(단건 삭제 · 일괄 삭제 · 충돌 다이얼로그 · 이탈 가드). **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건 실측) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` **다수**(상세 3 + 폼 구획 7 + 미리보기 1 + `@tds/ui Card` 스켈레톤 2) · Toast · Modal 4종. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세와 폼이 공유 `pageTitleStyle` 을 소비한다(`ProgramDetailPage.tsx:330` · `ProgramFormPage.tsx:946`). 그 스타일이 title tier 토큰을 참조한다 — 값을 손으로 재현하지 않는다. 상세의 달성률 큰 글씨도 `typography.title.md.*` 를 참조한다(`ProgramDetailPage.tsx:155-160`) — KPI 성격의 값에 tier 를 실제로 쓴 드문 자리다. 카드 제목은 `CardTitle`(`<h2>`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/programs/:id` 의 프로그램명 `<h1>` 과 달성률 숫자가 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-*` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `ProgramListPage.tsx:306-313` 이 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드한다. 그 props 가 `onCompositionStart/End` + `onKeyDown` 을 실어 ① 조합 중에는 커밋하지 않고 ② 조합 종료 후 **250ms 디바운스**로 커밋하며 ③ **조합 중 Enter 를 가로챈다**. 주석이 그 계약을 적는다(`:311`). 순서 뒤바뀐 응답은 없다 — 검색이 클라이언트 필터라 요청 자체가 나가지 않는다(`:230-241`) | `/programs` 검색창에 IME 로 '헤드폰' 입력. **조합 중 '헤ㄷ'·'헤드' 같은 부분 문자열이 필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **비가역 액션 둘 다 게이팅된다.** 단건 삭제(`useCrudList.tsx:213-222`)와 일괄 삭제(`:224-235`)가 `ConfirmDialog intent="delete"` 를 거치고 intent 가 tone/icon/label 에 매핑된다. 확인 라벨은 '삭제' / `'N건 삭제'`. **busy 중 confirm 이 disable 된다**(`busy={deleting}`·`busy={bulkDeleting}`). **실패하면 다이얼로그가 남고 그 안에 사유가 뜬다**(`error={deleteError}` ← `deleteErrorMessage` — `:65-68`) — 409 는 어댑터 문장을 그대로 보이고 재시도를 권하지 않는다. **취소는 진행 중 요청을 abort 한다**(`:148-154`). **되돌릴 수 있는 저장(등록·수정)은 묻지 않아 확인이 무뎌지지 않는다** | 행 휴지통 → 다이얼로그 확인. `?fail=delete` 로 강제 실패 후 확인. **다이얼로그가 남고 사유가 뜨며 확인 버튼이 되살아나면 pass.** `?status=delete:409` 면 어댑터 문장('이미 삭제된 항목입니다.')이 그대로 보여야 한다 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | `ProgramFormPage.tsx:827` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `isDirty` 는 **RHF `formState.isDirty`**(`useCrudForm.ts:302`) — 도메인 판정을 손으로 재발명하지 않았다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 문구가 이 폼의 것이다(`:91-92`) | 폼에서 프로그램명 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** **주의**: '목록으로'(`:939`)·'취소'(`:1391`)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-074 §7 #10 으로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 등록·수정은 IA-06 의 무게 규칙대로 **전용 폼 라우트**(`/programs/new` · `/programs/:id/edit`)다. Modal 4종(단건 삭제 · 일괄 삭제 · 충돌 다이얼로그 · 이탈 가드)은 전부 **입력 필드가 없는** 확인 다이얼로그다. 모달 폼 dirty 가드는 카테고리 화면(NFR-075 FEEDBACK-06)의 축이다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 **3종**: 저장 성공(`useCrudForm.ts:249` — '프로그램을 등록/저장했습니다.') · 단건 삭제 성공(`useCrudList.tsx:171`) · 일괄 삭제 성공(`:207`). 지속 live region 은 `ToastProvider` 가 소유한다. **목록의 상주 polite live region 은 껍데기가 따로 갖는다**(`CrudListShell.tsx:158-160` — 3분기 문장 `:107-117`) | ToastProvider 판정에 종속. 이 화면에서는 저장·삭제 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **4개**: 단건 삭제 · 일괄 삭제 · 충돌 다이얼로그(`FormConflictDialog` — `ProgramFormPage.tsx:1402`) · 이탈 가드. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 네 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **`FormField` 를 쓰는 폼 컨트롤 7개를 전수 확인했다.** 프로그램명(`ProgramFormPage.tsx:1002-1004`) · 창작자(`:1025-1027`) · 카테고리 대분류(`:1043-1046`) · 한 줄 소개(`:1110-1112`) · 목표 금액(`:1140-1142`) · 시작일(`:1161-1163`) · 종료일(`:1181-1183`) — **일곱 자리 전부 `aria-invalid={errors.X !== undefined}` 바로 다음 줄에 `aria-describedby={errors.X !== undefined ? errorIdOf(...) : undefined}` 가 짝으로 선다.** 감싸는 `FormField`(required)가 같은 id 의 오류 `<p>` 와 `*` 마커를 렌더한다. **짝 없는 `aria-invalid` 0건**(grep 실측: 이 디렉터리 히트 8건 = 위 7 + 카테고리 모달 1, 전부 다음 줄이 describedby). 리치 텍스트 2개·이미지 2개는 DS 필드가 내부 배선한다 | `grep -rn "aria-invalid" apps/admin/src/pages/programs` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL 로 프로그램명을 비운 채 제출해 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert. **경미 잔여**: 옵션·리워드 편집기는 `FormField` 를 쓰지 않는 손조립 입력이라 `aria-label` 만 있고(`:405,415,430`) `aria-invalid`/`aria-describedby` 가 없다 — **aria-invalid 를 설정하지 않으므로 짝 요구 위반은 아니나**, 오류가 구획 하단 `role="alert"` 한 줄(`:449-453,689-693`)로만 나와 어느 그룹·어느 행인지 말하지 못한다(§5 #6) | **pass** |
| A11Y-12 | A11Y | 직접 | 좌측 필터 **2개**(진행 상태 · 카테고리)가 전부 공유 `FilterPanel` 을 쓴다(`ProgramListPage.tsx:333-353`). 그 컴포넌트가 선택 상태를 **`aria-pressed` 하나로** 표기하고(`FilterPanel.tsx:145`) 머리말이 그 판단을 명시한다(`:17-19` — '이 버튼은 토글 필터이지 현재 위치가 아니다 — `aria-current` 는 내비게이션의 것이다'). **이 화면(`ProgramListPage`·`ProgramDetailPage`·`ProgramFormPage`)에 `aria-current`·`aria-pressed` 속성 선언 0건**(grep 실측 2026-07-22 — 히트는 `ProgramListPage.tsx:9` 의 주석 한 줄뿐이고 실제 속성은 전부 공유 컴포넌트가 붙인다). 리워드의 옵션 체크박스 묶음은 `<ul role="group" aria-label>` 이며 필터 토글이 아니다 | `grep -rn "aria-current=\|aria-pressed=" apps/admin/src/pages/programs/Program*.tsx` = 0건. DOM 에서 좌측 필터 항목이 `aria-pressed` 만 갖고 `aria-current` 가 없는지 확인 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **4개**(단건 삭제 · 일괄 삭제 · 충돌 다이얼로그 · 이탈 가드). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건) | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 3종(저장 · 삭제 · 일괄 삭제 성공). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: DS Table 스켈레톤 펄스 · `@tds/ui Skeleton`(상세 로딩 `ProgramDetailPage.tsx:250`) · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건 실측). **진행바는 transition 이 없는 정적 폭이다**(`ProgramDetailPage.tsx:133-145` — 애니메이션 없이 `width` 만 준다) | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 네 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:341-347`). **네 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위는 2단 그리드(`ProgramListPage.tsx:86-91`), 상세는 평범한 `<div style={pageStyle}>`(`ProgramDetailPage.tsx:326`), 폼은 `<div style={pageStyle}>`(`ProgramFormPage.tsx:934`)이다. 폼의 좌측 레일은 화면 내부 그리드(`tds-programform-layout`)이지 셸이 아니다 | 네 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** `findCoveringLeaf` 덕에 브랜치 폴백은 없다 — `/programs/:id` · `/programs/new` · `/programs/:id/edit` 가 전부 자기를 감싸는 잎 `/programs`(`nav-config.ts:199`)를 찾아 AppHeader 가 `<h1>프로그램</h1>` 을 그린다. **그러나 상세가 자체 `<h1>{program.title}</h1>` 를(`ProgramDetailPage.tsx:330`), 폼이 자체 `<h1>프로그램 등록/수정</h1>` 를(`ProgramFormPage.tsx:946`) 또 그린다** → 두 sub-route 모두 **`<h1>` 이 2개**다. 게다가 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 모순**이고, 두 h1 이 서로 다른 것을 말한다(하나는 메뉴 이름, 하나는 레코드명/행위) | `/programs/:id` 와 `/programs/:id/edit` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록은 1개(정상) — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색(`:306-313`) · 좌측 레일에 필터 2종 · 우상단 primary '프로그램 등록' CTA(`:296-301`) → 결과 count 요약(`CrudListShell.tsx:169-173`) → **SelectionBar**(일괄 삭제 — `:178-188`) → table(`:193`). 하나의 list 템플릿(`CrudListShell` → `CrudTable` → DS `Table`)을 따른다. **미충족: Pagination 이 없다.** 껍데기가 `visible` 전량을 DS Table 에 넘긴다. 프로그램은 상한 없이 쌓이는 컬렉션이다(BE-074 §7.10). 순번도 `SeqCell seq={index + 1}`(`CrudTable.tsx:331`)이라 페이징 도입 시 오프셋이 필요하다 | 픽스처를 20건 이상으로 늘리고 `/programs` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | 직접 | **충족.** `App.tsx:342`(`/programs/new`)와 `:347`(`/programs/:id/edit`)가 **같은 `<ProgramFormPage />` 컴포넌트**를 가리킨다. 구분은 `useParams` 의 `:id` 유무 하나이며(`useCrudForm.ts:91-92` — `isEdit = id !== undefined`), 그 값이 **title(`ProgramFormPage.tsx:946` — '프로그램 등록' vs '프로그램 수정')** · **제출 라벨(`:1397` — `submitButtonLabel(saving, isEdit)`)** · **prefill(`useCrudForm.ts:158-161` 이 `loaded` 를 `reset` 한다)** 만 가른다. **레이아웃은 완전히 동일하다** — 구획 7개·좌측 레일·우측 미리보기가 같은 코드다. 등록/수정을 나눈 컴포넌트가 0건이다. 그 판단의 근거가 `nav-config.ts:193-197` 에 적혀 있다(메뉴에 '등록'을 따로 걸면 수정 경로와 갈라진다) | `/programs/new` 와 `/programs/:id/edit` 를 나란히 열어 DOM 구조가 같고 제목·버튼 라벨·초기값만 다른지 확인. `App.tsx` 에서 두 라우트의 `element` 가 같은 컴포넌트인지 확인 | **pass** |
| IA-13 | IA | 직접 | 상태·카테고리·검색어의 **단일 원천이 URL 쿼리스트링**이다. `:155` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { status: 'all', category: 'all' }` — `:80-83`), 그 훅이 `useSearchParams` 로 `?status=`·`?category=`·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고 갱신은 `replace` 라 검색어 한 줄에 history 가 쌓이지 않는다. 손으로 고친 `?status=` 는 `parseFilter` 가 되돌리고(`:157-161`), **`?category=` 는 일부러 `parseFilter` 를 쓰지 않는다**(`:162-164` — 운영자가 만드는 값이라 닫힌 유니온이 없고 목록이 늦게 오므로 대조하면 도착 전의 정상 id 까지 '전체'로 되돌린다). 결과: 필터를 걸고 상세에 들어갔다 Back 하면 조건이 복원되고, **카테고리 화면의 사용량 배지가 만드는 `/programs?category=<id>` 링크가 그대로 산다**(FS-075-EL-005.2). **`sort`·`page` 는 정렬 UI·페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | `/programs` 에서 상태='진행 중' + 카테고리='테크·가전' + 검색='헤드폰' 적용 → URL 이 `?status=live&category=tech&q=헤드폰` 인지 확인 → 행 클릭으로 상세 진입 → Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`. 네 라우트 전부 그 경계의 **소비자**이며 자체 경계를 두지 않는다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로를 상속한다: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()`. **이 화면의 조회 4종·쓰기 3종이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **다만 폼의 미저장 입력은 그때 사라진다**(프로그램 이동이라 이탈 가드가 발화하지 않는다 — EXC-19 P1 사안 · §4.2) | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fprograms&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 세 층이 전부 배선된 소수 화면이다.** ① **read 게이팅(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸고, 라우트→리소스 파생이 `/programs/:id`·`/programs/new`·`/programs/:id/edit` 를 전부 `/programs` 잎으로 덮는다 ② **목록(직접)**: 등록 CTA 가 `canCreate` 일 때만 렌더되고(`ProgramListPage.tsx:296-301`, 빈 상태 CTA 도 같은 노드 `:368`), 껍데기가 `canUpdate`/`canRemove` 로 **행 액션·선택 열·SelectionBar 를 통째로 없앤다**(`CrudListShell.tsx:146,178,216-217` → `CrudTable.tsx:190-191`) ③ **상세(직접)**: '수정' 링크가 `canUpdate` 일 때만(`ProgramDetailPage.tsx:338`) ④ **폼(직접·이중 방어)**: `!canSubmit` 이면 화면 전체가 `<ForbiddenScreen />`(`ProgramFormPage.tsx:905`)이고, 그래도 제출이 오면 `useCrudForm.submit` 이 **요청 없이 배너로** 막는다(`:290-298`). 판정은 등록이면 create·수정이면 update 로 갈린다(`:104`) ⑤ **강등 reconcile**: 권한 스토어가 바뀌면 훅 구독자가 재렌더돼 별도 코드 없이 컨트롤이 사라진다. **누를 수 없는 컨트롤이 어디에도 남지 않는다** | 권한 스토어에서 `page:/programs` 의 `update` 를 끈 뒤 상세·`/programs/:id/edit` 진입. **'수정' 링크가 사라지고 폼이 403 화면이면 pass.** `create` 를 끄면 등록 CTA 가, `remove` 를 끄면 체크박스 열과 휴지통이 사라져야 한다. `read` 를 끄면 403 화면 | **pass** |
| EXC-04 | EXC | 직접 | **부분 미충족 — 해소 UI 는 있고 토큰이 없다.** ① **유령 저장은 해소됐다** — `createStoreAdapter.update`/`remove` 가 없는 id 에 `HttpError(409, …)` 를 던진다(`crud.ts:256-258,275-277`) ② **409 해소 UI 가 실재한다** — `useCrudForm.handleWriteError` 가 `isConflict` 를 읽어 **입력을 보존한 채** `FormConflictDialog`(reload / dismiss)를 세운다(`:193-206` → `ProgramFormPage.tsx:1402`). 삭제 쪽도 409 문장을 그대로 보인다(`useCrudList.tsx:65-68`). **NFR-044 가 gap 으로 잡던 절반이 여기서는 충족이다** ③ **그러나 낙관적 동시성 토큰이 없다** — `Program` 에 `version`/`updatedAt` 이 없고(`_shared/store.ts:72-110` 전수) `apps/admin/src/pages/programs` 에 `If-Match` grep **0건**(실측). 현 409 는 **'존재 여부' 기반**이므로 **둘 다 존재하는 동시 편집은 last-write-wins** 다 ④ **이 화면에서 그 위험이 특히 크다** — 저장이 **전체 치환**이라 덮이는 것이 필드 하나가 아니라 **리워드 목록 전체**다(BE-074 §7.6) | `?status=save:409` 로 폼 저장 → **충돌 다이얼로그가 뜨면 그 절은 pass.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/programs` → **0건**으로 확인(실측 0건) — 요구가 '토큰을 보낸다'를 먼저 요구하므로 **gap** | **gap** |
| EXC-08 | EXC | 직접 | **충족 — 이 화면은 프레임워크의 두 장치를 전부 상속한다.** ① **동기 제출 락**: `submitLockRef`(`useCrudForm.ts:130`)가 `onValid` 첫 줄에서 두 번째 제출을 막고(`:229-230`) `onSettled` 에서만 풀린다(`:241`). 검증 실패에도 풀린다(`:274`) ② **제출 시도 단위 멱등키**: `idempotencyKeyRef`(`:145-150`)가 키를 만들어 **variables 에 실어**(`:255,262`) 어댑터까지 보내고(`crud.ts:229,243`), 어댑터의 원장이 재시도를 최초 응답 재생으로 처리한다(`:232,245` ← `createIdempotencyLedger` `:67-77`). **성공하면 키를 버려 다음 제출을 새 거래로 만든다**(`:247`) ③ 버튼도 `disabled={saving \|\| loadingDetail}`(`ProgramFormPage.tsx:825,1398`) | 폼에서 '등록'을 최대한 빠르게 2회 클릭(또는 Enter 연타). **요청이 1건만 나가면 pass.** `grep -rn "submitLockRef\|idempotencyKey" apps/admin/src/shared/crud/useCrudForm.ts` 로 배선 확인. **잔여**: 삭제·일괄 삭제는 `busy` 로만 막고 **멱등키를 싣지 않는다**(`DeleteVars` 에 자리가 없다 — `crud.ts:363-366`; 호출부 `useCrudList.tsx:164,196`). 삭제는 멱등이라 두 번째 요청이 409 로 막히고 사용자에게 보이므로 중복 생성 위험은 없다 — §5 #7 로 이관 | **pass** |
| EXC-09 | EXC | 직접 | **폼·삭제·일괄 삭제 세 경로가 전부 배선돼 있고 공유 predicate `isAbort` 를 쓴다.** **폼**: unmount abort(`useCrudForm.ts:120`) · `onError` 첫 줄 `if (isAbort(cause)) return;`(`:189`) · `onSuccess` 의 `if (controller.signal.aborted) return;`(`:245`)로 취소된 요청의 성공 콜백이 토스트·이동을 일으키지 않는다. **단건 삭제**: 다이얼로그 취소가 `abort()` + `mutation.reset()`(`useCrudList.tsx:148-154`) · `onSuccess` aborted 가드(`:169`) · `onError` isAbort(`:177`). **일괄 삭제**: 같은 3점(`:184-189,199`) + `useCrudBulkDelete` 의 `onSuccess` 가 `signal.aborted` 면 무효화도 하지 않는다(`crud.ts:402-405`). **bulk 실패 count 에서 abort 제외** 절도 그 자리에서 성립한다 | 폼 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다. 삭제 다이얼로그를 진행 중 취소했을 때도 같다 | **pass** |
| EXC-21 | EXC | 직접 | **거절 표면이 두 계열이고 서로 다른 라우트에 있다 — 섞이지 않는다.** ① **플랜(엔타이틀먼트) 계열 — 이 화면에 없다.** `/programs` 계열은 `MODULE_RESOURCES` 어디에도 없다(`module-resources.ts:29-91` 전수 확인 — 매핑은 `commerce.*`·`sales.*`·`cms.*`·`marketing.*`·`ai.*`·`stats.*` 뿐이다). 매핑 없는 리소스는 **`granted`** 로 수렴하므로(fail-open) 잠금·업그레이드 안내 표면이 발생하지 않는다 ② **권한 계열** — 라우트 read 는 `RequirePermission` 의 403 화면(상속), 폼 쓰기는 `<ForbiddenScreen />`(`ProgramFormPage.tsx:905`) + `submit` 의 권한 배너(`useCrudForm.ts:292-296`). **① 형태다** ③ **설정 계열** — 상세의 후원 CTA 가 `checkoutCta(readPaymentSettings(), 'program')` 로 라벨과 **사유 문구**를 정하고(`ProgramDetailPage.tsx:323,398-410`) `PAYMENT_SETTINGS_PATH` 링크로 **설정 화면으로 데려간다**. **④ 형태(설정 미완료 → 안내 + 설정 링크)이며 403 계열 표현이 섞이지 않는다** — 문구가 '권한이 없습니다' 가 아니라 'PG 결제를 쓰지 않도록 설정되어 있어…' 다 ④ **판정 순서(인증 → 플랜 → 권한 → 설정)** 도 성립한다: 인증은 셸, 플랜은 이 화면에 없음, 권한은 셸+폼, 설정은 상세 카드 안. **한 화면이 동시에 두 계열을 보이지 않는다** — 권한 거절은 화면 전체를 대체하므로 그 아래의 설정 안내에 도달하지 못한다 | `/programs/:id` 에서 결제 설정을 끈 채 진입 → **'문의하기' + 사유 + 설정 링크가 뜨고 그 문구에 권한 표현이 섞이지 않으면 pass**(현재 그렇다). 권한을 끄면 403 화면이 CTA 를 통째로 대체하는지 확인. 플랜 축은 `grep -n "programs" apps/admin/src/shared/entitlements/module-resources.ts` = **0건**으로 부재 확인 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **17** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · A11Y-12 · IA-01 · **IA-05** · IA-13 · EXC-03 · **EXC-08** · EXC-09 · **EXC-21** |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **1** | FEEDBACK-06 |
| `gap` | **3** | IA-02 · IA-04 · EXC-04 |
| **합계** | **31** | 17 + 10 + 1 + 3 = **31** ✓ |

> **P0 gap 3건 — quality-bar '배치 실패' 사유.**
>
> - **IA-02 · IA-04 는 앱 전역의 같은 뿌리**(sub-route h1 이중 · 목록 페이징 부재)를 공유하므로 **횡단 배치**로 푸는 것이 옳다.
> - **EXC-04 는 이 화면 고유이며 절반이 이미 서 있다** — 충돌 다이얼로그가 실재하므로 `Program.version` + `If-Match` 만 붙으면 pass 가 된다(BE-074 §7.12 #4). **토큰을 붙이는 비용이 이 앱에서 가장 낮은 화면 중 하나다.**
> - **이 화면이 클레임(NFR-044)보다 나은 점 셋**: EXC-08 이 pass(멱등키·동기 락이 실제로 도달한다) · EXC-04 의 해소 UI 존재 · IA-05 가 실재하고 pass.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·CSV·optimistic write·토글 셀렉트 필터·기간 범위 필터)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고, 껍데기가 요약에 `' · 새로고침 중…'` 을 덧붙이며 `aria-busy={refreshing}` 을 건다(`CrudListShell.tsx:169-173`). `staleTime` 30초가 재조회 시점을 지배한다. **상세·카테고리 쿼리는 `placeholderData` 를 쓰지 않는다**(`useQuery` 직접) — 상세는 단건이라 문제가 없고, 카테고리는 필터 항목이 잠시 비는 창이 있다(§5 #9) | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`CrudTable.tsx:378-390` ← `ProgramListPage.tsx:363-369`) — 검색 0건/필터 0건/진짜 0건 **3분기** + 복구 액션이 맥락(`hasQuery`·`hasActiveFilters`)에서 파생된다. 진짜 0건에는 **등록 CTA 와 같은 노드**를 넘기되 권한이 없으면 넘기지 않는다(`:368`). 조사(이/가)는 `Empty` 가 받침으로 고른다 | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기, 필터로 0건 → '필터에 맞는 …' + 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudCreate`/`useCrudUpdate` 가 목록·상세를 정확히 무효화한다(`crud.ts:335,357-358`). 삭제도 목록만(`:376`), 일괄은 **전부 성공했을 때만**(`:404`). **잔여**: 카테고리 화면의 변경이 이 화면의 선택지 키(`[programs,'category-options']`)를 무효화하지 못한다 — 키가 두 벌이다(§5 #10) | 폼 저장 후 목록 복귀 시 행이 갱신돼 있는지. 상세 재진입 시 최신인지 | **pass** |
| COMP-01 | P1 | 목록·상세·폼의 액션 버튼이 DS `<Button>` 이고 진행은 `disabled` + `submitButtonLabel` 로 표현한다. `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/programs/Program*.tsx` 히트는 **둘뿐**: 상세의 후원 CTA `<span style={buttonStyle(...)}>`(`ProgramDetailPage.tsx:400`) — **누를 것이 없는 자리에 진짜 버튼을 두지 않는다**는 의도된 선택이고 주석이 그것을 적는다(`:169-172`); 폼의 옵션·리워드 삭제 아이콘 버튼(`iconButtonStyle` — 로컬 스타일). 후자는 손조립이다 | `grep -n "buttonStyle(\|tds-ui-btn-" -r apps/admin/src/pages/programs/Program*.tsx` → 의도된 2종 외 0건 | **pass(의도된 예외 1 · 손조립 1)** |
| COMP-04 | P1 | required 필드 5개(프로그램명·창작자·대분류·한 줄 소개·목표 금액·시작일·종료일)가 전부 `FormField required` 로 노출돼 `*` 마커가 렌더된다. **옵션·리워드는 required 가 아니라 해당 없음** | 폼에서 라벨 옆 `*` 가 필수 필드에만 붙는지 | **pass** |
| COMP-06 | P2 | 목록 스켈레톤이 DS Table 소유로 올라갔다 — 화면·껍데기가 행 수·셀 수를 손으로 세지 않는다(`CrudListShell.tsx:193` 이 `loading` 만 넘긴다). **상세는 다르다** — `[0,1]` × `[0,1,2,3,4]` 로 **2열 × 5줄을 하드코딩**한다(`ProgramDetailPage.tsx:245-256`)이고 실제 정의 목록은 6행이다. 요구의 대상은 list skeleton 이라 위반은 아니나 같은 계열의 잔여다 | 페이지네이션 도입 후 목록 스켈레톤 행 수 === PAGE_SIZE 인지 | **pass(기준값 부재)** |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`CrudTable.tsx:331`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다. **소유가 공용 `CrudTable` 이라 이 화면 단독으로는 고칠 수 없다** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재 · 공용)** |
| COMP-09 | P2 | 프로그램명 셀에서 **제목은 truncate 가 없고 한 줄 소개만 ellipsis** 다(`ProgramListPage.tsx:114-122,250-251`) — **한 셀 안에서 두 규칙이 반대다.** 창작자·카테고리 셀도 truncate 가 없어 긴 값이 표를 넓힌다. **완화**: 껍데기가 가로 스크롤 컨테이너를 갖는다(`CrudListShell.tsx:190`)라 페이지 본문이 가로로 밀리지는 않는다 | 200자 제목 픽스처로 표 폭이 유지되는지 | **gap(완화됨)** |
| COMP-12 | P2 | 리치 텍스트 2개는 `RichTextField` 가 `N/최대` 카운터를 갖는다(스토리 5000 · 상세 설명 2000). **그러나 텍스트 입력 3개(프로그램명 60 · 창작자 40 · 한 줄 소개 120)는 카운터가 없고 `maxLength` 로 조용히 잘린다** — 한 화면 안에서 규칙이 갈렸다. counting 기준도 갈린다: 리치 텍스트는 `richTextLength`(평문), 텍스트 입력은 `value.length`(UTF-16 code unit) | 60자 근접 시 프로그램명에 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert(4자리) · write 성공=toast(3종) · **폼 저장 실패=폼 상단 배너 + 참조 코드**(`FormServerError` — `ProgramFormPage.tsx:955`) · 409=**전용 다이얼로그** · 422=**필드 인라인 + 포커스** · 삭제 실패=다이얼로그 안 배너. **이 도메인에서 실패 통지에 toast 를 쓰는 경로가 0건이다** | `?fail=save` 로 저장 → 배너로, 성공 → toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast + 목록 이동) · 실패(배너 + 참조 코드) · 삭제 성공(toast) · 삭제 실패(다이얼로그 배너) 경로가 전부 배선돼 있다. no-op 클릭이 없다 — 권한이 없으면 컨트롤 자체가 없고(EXC-03), 검증 실패는 첫 invalid 필드로 포커스가 간다 | `?fail=save` · `?fail=delete` 로 강제 실패 → 가시 실패가 나오는지 | **pass** |
| FEEDBACK-05 | P2 | 삭제 2종이 확인 게이트를 얻었다(FEEDBACK-02). **undo window 도 soft-delete 도 없다** — `removeProgram`(`_shared/store.ts:415-417`)이 배열에서 즉시 제거한다. 요구는 'confirm **또는** undo' 이므로 confirm 으로 충족하나, **삭제가 참조를 검사하지 않아**(BE-074 §7.12 #9) 되돌릴 수 없는 사고의 범위가 넓다 | 비가역 액션이 confirm 또는 undo window 를 갖는지 → confirm 은 있다, undo 는 없다 | **pass(confirm) · gap(undo)** |
| A11Y-03 | P1 | ConfirmDialog 표면 4개. 초기 포커스(delete intent → Cancel)는 DS `ConfirmDialog` 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **충족.** 행 클릭이 DS Table 소유(마우스 전용)이고, **행 안에 같은 목적지의 focusable link 가 있다** — 프로그램명 `DetailCellLink to={`/programs/${id}`}`(`ProgramListPage.tsx:250`). `rowTarget.href`(`:375`)와 **같은 경로 상수**를 쓴다. 주석이 그 의도를 명시한다(`:248-249` — '이 링크가 없으면 Tab 으로 상세에 닿을 길이 사라진다') | 행을 Tab 해서 프로그램명 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | **충족.** ① 검증 실패 시 첫 invalid 필드로 포커스가 간다 — `useCrudForm` 이 `handleSubmit(onValid, onInvalid)` 를 부르고 RHF `shouldFocusError` 기본값이 동작하며, 주석이 그것을 **계약으로 고정**한다(`:267-275`). 동시에 좌측 레일의 그 구획에 붉은 점이 뜬다(`ProgramFormPage.tsx:871-881`) ② 422 도 `setError` 후 `setFocus(first.field)` 로 옮긴다(`useCrudForm.ts:217`). **잔여**: 폼 open 시 첫 편집 필드 자동 포커스는 없다 | 필수 필드를 비운 채 제출 → `document.activeElement` 가 프로그램명 입력인지. 그 구획에 붉은 점이 뜨는지 | **pass(잔여)** |
| A11Y-16 | P1 | 목록에 **항상 마운트된 polite live region** 이 있다(`CrudListShell.tsx:158-160`, 3분기 문장 `:107-117`). 그 밖의 계약도 만족한다: 필터 `aria-label`(`FilterPanel navLabel`) · 링크 접근 이름 · 진행바 `role="progressbar"` + `aria-valuetext`(`ProgramDetailPage.tsx:369-375`) · 리워드 표의 시각적 숨김 caption(`:197-199`) · 리워드별 옵션 묶음 `<ul role="group" aria-label={'<리워드명> 옵션 선택'}>`(`ProgramFormPage.tsx:627-654`) · 후원된 리워드 삭제 버튼이 **접근 이름으로 이유를 말한다**(`:663-668`) · 옵션 편집기 입력에 `aria-label`(`:405,415,430`). **잔여**: 우측 미리보기가 입력마다 다시 계산되는데 **live region 이 없다** — 시각 사용자만 요약이 바뀌는 것을 본다 | 필터로 0행이 될 때 스크린리더가 사유를 읽는지(pass). 미리보기 갱신이 announce 되는지(현재 안 된다 — §5 #6) | **pass(경미 잔여)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:24-38`(`STATUS_META`·`programStatusLabel`·`programStatusTone`)를 목록·상세·폼 미리보기가 전부 소비한다. `Record<ProgramStatus, StatusMeta>` 라 상태가 늘면 컴파일이 막는다. **다만 '진행 중' 과 '성공' 이 같은 `success` 톤**이라 색이 정보를 보태지 못한다(라벨이 갈라 주므로 A11Y 위반은 아니다 — FS-074 §7 #4) | 모든 domain status 가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-05 | P1 | Pagination 자체가 없다(IA-04 gap) — total-range 표시·page-size selector 를 걸 표면이 없다. 요약은 '전체 N건' 만 준다 | IA-04 해소 후 다시 매긴다 | **gap(IA-04 종속)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을 경유한다. 삭제 토스트의 조사는 `objectParticle` 이 받침에서 고른다(`useCrudList.tsx:171`), 저장 토스트도 같다(`useCrudForm.ts:249`). **잔여**: 기간 셀이 `${startDate} ~ ${endDate}` 로 ISO 문자열을 그대로 쓴다(`ProgramListPage.tsx:276` · `ProgramDetailPage.tsx:393`) — `formatDate` 를 거치지 않는다 | 셀에 raw `toString()` 이 없는지 | **pass(잔여)** |
| ERP-08 | P2 | 금액·건수·달성률·남은 일수가 전부 `formatNumber` 를 경유하고 numeric 열이 `tabular-nums` 를 쓴다(`ProgramListPage.tsx:124-133` · `ProgramDetailPage.tsx:155-167`). **기간(시작일 ~ 종료일)만 포맷 함수를 거치지 않는다** — 값이 'YYYY-MM-DD' 가 아니면 그대로 새어 나온다 | 셀의 raw 문자열 렌더가 0건인지 | **gap(경미)** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다. 프로그램은 상한 없이 증가하는 컬렉션이다(BE-074 §7.10). **완화 둘**: 검색이 디바운스돼(COMP-10) 자모마다 전량 스캔이 일어나지 않고, **가로 scroll 컨테이너가 있어**(`CrudListShell.tsx:190`) 9열 표가 페이지를 밀지 않는다. **폼 쪽에도 같은 축이 있다** — 리워드 개수 상한이 없어 표가 무한히 길어질 수 있다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 취소에서만 발생한다. **이 화면에서 특히 문제다** — BE-074 §2 가 저장 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** 폼은 **404 · 409 · 422 · 그 밖**을 실제로 분기한다(`useCrudForm.ts:171-176,193-206,209-219,221-222`) — 이 앱에서 가장 넓게 분기하는 자리다. **그러나 목록·상세는 status 로 분기하지 않는다** — 403·429·500 이 한 문구다(`CrudListShell.tsx:225-232` · `ProgramDetailPage.tsx:284-297` 이 404 만 가른다). **400 도 폼에서 인라인이 아니라 배너로 간다**(`useCrudForm.ts:209` 가 422 만 본다) | `?status=list:403` · `list:429` · `list:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **충족.** 422 의 `violations` 를 RHF `setError` 로 그 입력에 꽂고 첫 위반으로 포커스를 옮긴다(`useCrudForm.ts:209-219`). client zod error 와 **같은 인라인 슬롯**(`FormField error` + `errorIdOf`)을 재사용하고, 폼 레벨 배너(`FormServerError`)는 generic error 전용이다. **잔여 둘**: (a) `optionGroups`·`rewards` 는 인라인 슬롯이 구획 하단 한 줄이라 어느 그룹·어느 행인지 말하지 못한다 (b) **400 `error.fields` 경로가 없다** — §5 #6·#8 | `?status=save:422` 는 `violations` 가 비어 있어(`dev.ts:93`) 배너 폴백을 탄다. 실제 필드 매핑은 어댑터가 `violations` 를 실어야 재현된다 | **pass(잔여)** |
| EXC-10 | P1 | **일괄 삭제가 `Promise.allSettled` semantics 를 쓴다** — `settleAllDetailed`(`crud.ts:401`)가 건별 결과를 모아 `{ failed, failures }` 를 돌려주고, 화면이 **사유별로** 보고한다(`bulkDeleteErrorMessage` — `useCrudList.tsx:94-107`): 같은 409 사유는 한 번만, 재시도 가능한 실패가 섞였을 때만 재시도를 권한다. **실패 시 다이얼로그를 열어 둔다**(`:199-202`). **잔여**: retry 가 실패 item 만 타깃하지 않는다 — 선택이 그대로라 성공분까지 다시 시도한다(성공분은 409 로 막힌다) | 3건 선택 후 그중 1건을 다른 탭에서 먼저 삭제 → 일괄 삭제. **'3건 중 1건을 삭제하지 못했습니다. 이미 삭제된 항목입니다.' 가 뜨고 다이얼로그가 남으면 pass** | **pass(잔여)** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다. **이 화면에서 특히 위험하다** — 저장이 전체 치환이라 요청이 hang 하면 운영자는 리워드가 저장됐는지 모른 채 다시 누른다(멱등키가 그 재시도는 막아 준다 — EXC-08) | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다 — 상세(`ProgramDetailPage.tsx:279-300`): 404 → '프로그램을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + back link 만 / 그 밖 → '…불러오지 못했습니다.' + '다시 시도'. 폼 로드도 같은 분기(`ProgramFormPage.tsx:909-931`, 판정은 `useCrudForm.ts:171-176`). 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던지고(`crud.ts:217-219`) 화면이 `isNotFound` 로 읽는다. 무한 spinner 없음(`program === undefined` 는 error 분기 뒤에 온다) | 없는 `:id`(`/programs/nope`)로 진입 → '찾을 수 없습니다' + 재시도 없음. `?status=detail:500` → retry 제공 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장·삭제가 전부 비관적(요청 완료 후 무효화). `onMutate`/`setQueryData` grep = 0건. **전체 치환 write 라 optimistic 이 위험하다는 요구의 판단과 정확히 일치한다** | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | selection scope 가 **current-page 가 아니라 '현재 보이는 전량'** 이다 — 페이지네이션이 없어 두 개념이 일치한다. 전체 선택은 `visibleItems` 대상(`CrudListShell.tsx:199-204`)이고, **조회 조건이 바뀌면 선택을 비운다**(`ProgramListPage.tsx:183-185`). 일괄 삭제 확인이 `'선택한 프로그램 N건을 삭제하시겠습니까?'` 로 건수를 명시한다. **잔여**: Shift-click range selection 과 그 키보드 등가물이 없다 | 3건 선택 → 필터 변경 → 선택이 0 인지. 전체 선택이 보이는 행만 대상인지 | **pass(잔여)** |
| EXC-20 | P1 | **폼만 충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 를 보여준다** — `setErrorReference(referenceOf(cause))`(`useCrudForm.ts:222`) → `FormServerError`(`ProgramFormPage.tsx:955`). `HttpError.reference` 는 `TDS-<base36 시각>-<3자리 난수>`(`http-error.ts:52-67`). raw stack/서버 body 노출 없음. **목록·상세·삭제는 참조 코드를 갖지 못했다** — 같은 도메인 안에서 깊이가 갈린다 | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이면 pass. `?status=list:500` 에는 없다(gap) | **pass(폼) · gap(목록·상세)** |
| EXC-22 | P1 | **세 축의 실패 방향이 이 화면에서 전부 관측된다**: 권한 축은 fail-closed(`RequirePermission`·`canSubmit` 이 닫는다) · 엔타이틀먼트 축은 fail-open(매핑 없는 이 라우트가 `granted` 로 수렴한다 — `module-resources.ts` 에 `/programs` 0건) · **결제 설정 축은 fail-closed**(`pgSellable` 이 `usePg && merchantId.trim() !== ''` 를 요구하고 기본값이 `usePg: false` 다 — `payment-settings.ts:128-130,179-186`). **세 방향이 코드에서 서로 다르고, 그 차이가 의도임이 주석에 적혀 있다**(`payment-settings.ts:120-122`) | 소유 문서 판정에 종속. 이 화면에서는 결제 설정 축이 실제로 닫는 쪽으로 수렴하는지만 확인(설정 미저장 상태에서 CTA 가 '문의하기') | **pass(설정 축) · 종속(권한·플랜 축)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-074 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 지연이다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 카테고리 선택지 응답 p95 | ≤ 200ms | **측정 불가 — 그리고 이 조회는 `fixtureRequest` 를 지나지도 않는다**(`data-source.ts:53-54` 가 `Promise.resolve` 를 바로 돌려준다). 지연·실패 재현 계약 밖이다(BE-074 §7.9) |
| 등록·수정 p95 | **≤ 1.5s** (BE-074 §2 서버 상한 10초 → 504) | **측정 불가.** 요청이 14 필드 + 옵션 + **개수 상한 없는 리워드**다 |
| 삭제 p95 / 일괄 삭제 | ≤ 500ms / **선택 건수 × 요청** | **측정 불가.** 일괄이 단건 반복이라(BE-074 EP-05) 100건 선택이면 요청 100건이다 — **상한이 없다** |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 내 재진입 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | 목록 1 + 상세 1(수정) | `crud.ts:335,357-358`. **카테고리 선택지는 무효화되지 않는다** — 키가 두 벌이다(§5 #10) |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 3회 | **충족(요청)** / **부분 충족(연산)** — 디바운스 250ms 가 자모당 스캔을 막으나, 커밋마다 상태 필터 → 카테고리 롤업 → 검색을 **연달아 훑는다**(`ProgramListPage.tsx:230-241`). 카테고리 롤업은 매번 `categoryFamily` Set 을 다시 만든다 |
| 저장 요청 크기 | ≤ 64KB | **미충족 — 상한이 없다.** 스토리에 길이 제한이 없고(`validation.ts:46`) 리워드 개수도 무제한이다. **계약상 무한**이다(BE-074 §7.12 #11) |
| 미리보기 재계산 | 입력 1타 = 재렌더 1 | `watch` 13개(`ProgramFormPage.tsx:855-867`)가 폼 전체를 구독해 **어느 입력이든 전체 재렌더**를 낸다. 리워드가 많으면 그 표가 함께 다시 그려진다 |
| 메모리 | 목록 전량 + 상세 1 + 카테고리 전량 | 전량 보유. 프로그램은 상한 없이 증가 |
| 번들 | 이 화면 고유 코드 ≤ 60KB(gzip) | 미측정. 외부 의존은 `RichTextField`(Tiptap)가 유일하게 무겁다. 화면 코드는 `ProgramFormPage.tsx` 1407행 · `ProgramListPage.tsx` 379행 · `ProgramDetailPage.tsx` 433행 + 도메인 3파일(`_shared/store.ts` 521행 · `types.ts` 230행 · `validation.ts` 111행) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:225-232`). **툴바·좌측 레일은 살아남는다** — 배너 바깥에 있다 |
| 카테고리 선택지 실패 — 목록 | 패널 안에서 사실을 밝히고 프로그램 목록은 살린다 | **충족**(`ProgramListPage.tsx:351-352` → `FilterPanel.tsx:124-134`). 두 쿼리가 분리돼 있다 |
| 카테고리 선택지 실패 — 폼 | 같은 사실을 밝힌다 | **미충족 — 아무 말도 하지 않는다.** `categoriesQuery.error` 를 읽지 않아(`ProgramFormPage.tsx:829-833`) 셀렉트가 비고, **운영자는 카테고리가 하나도 없다고 읽는다**(BE-074 §7.9) |
| 카테고리 선택지 지연 | 도착 전 상태를 사실대로 그린다 | **미충족** — 목록에서는 대분류 필터가 잠시 0건이 되고(`categoryFamily` 가 자기 자신뿐), 폼에서는 저장된 카테고리가 잠시 선택 안 된 것처럼 보인다(`:840`) |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도' | **충족**(EXC-12 pass) |
| 폼 로드 실패 | 같은 분기 + '목록으로' | **충족**(`:909-931`) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass — 폼 한정) |
| 저장 실패(422) | 그 입력의 인라인 오류 + 포커스 | **충족**(EXC-07 pass). **단 옵션·리워드는 구획 하단 한 줄이라 어느 자리인지 말하지 못한다** |
| 저장 실패(409 동시 삭제) | conflict 다이얼로그 + 입력 보존 | **충족** — `FormConflictDialog`(reload/dismiss). **NFR-044 가 gap 으로 잡던 자리가 여기서는 충족이다** |
| 동시 편집(둘 다 존재) | 나중 저장이 앞선 처리를 덮지 않는다 | **미충족 — last-write-wins.** 토큰이 없다(EXC-04 gap). **전체 치환이라 리워드 목록 전체가 덮인다** |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). 단 서버 도달 여부는 보장하지 않는다 |
| 연타(더블클릭) | 정확히 1개 요청 | **충족**(EXC-08 pass) — 동기 락 + 멱등키. **삭제만 키가 없다**(멱등이라 두 번째가 409 로 막힌다) |
| 삭제 실패(409) | 재시도를 권하지 않고 사유를 그대로 | **충족**(`useCrudList.tsx:65-68`) |
| 일괄 삭제 부분 실패 | 사유별 보고 + 다이얼로그 유지 | **충족**(`:94-107,199-202`) |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 폼을 버린다. **이 폼은 입력량이 가장 많은 화면 중 하나라 손실이 크다**(EXC-19 P1) |
| 권한 강등 중 작성 | 경고 후 복구 가능 | **미충족** — 다른 탭에서 권한이 강등되면 폼이 **작성 중 입력을 들고 있는 채 403 화면으로 바뀐다**(`:905` 는 렌더 중 early return 이다). 경고도 복구도 없다(FS-074 §7 #23) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **BE-074 §2 의 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다** |
| 결제 설정 미저장 | 판매 가능으로 오해하지 않는다 | **충족 — fail-closed.** 기본값이 `usePg: false` 라 CTA 가 '문의하기' 로 수렴한다(`payment-settings.ts:179-186`) |
| 결제 설정이 다른 탭에서 바뀜 | 최신 규칙을 쓴다 | **부분 미충족** — `readPaymentSettings()` 를 **렌더 시점에 동기로 읽어**(`ProgramDetailPage.tsx:323`) 재렌더 전까지 옛 값을 말한다. 구독이 아니다 |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 모금 · 공개 무결성 · 감사

이 화면은 **고객이 보게 될 금액과 그 대가(리워드)** 를 정한다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **달성률·성공 여부·남은 일수를 저장하지 않는다** | **충족** — 세 값이 전부 순수 함수다(`_shared/store.ts:144-164`)이고 목록·상세·폼 미리보기가 **같은 함수**를 부른다. 회귀 `programs.test.ts:47-89`. 근거가 코드 주석에 있다(`:6-8`) |
| **모금액·후원자 수를 이 계약이 바꾸지 않는다** | **충족(구조적)** — 두 필드가 `ProgramInput` 에 **없고**(`:112-128`) 등록은 0 으로 시작하며(`:401-402`) 수정은 `{ ...program, ...input }` 이라 보존된다(`:410`). **폼에도 그 입력이 없다** |
| **후원된 리워드를 지우지 않는다** | **미충족(구조적) — 판정 근거가 요청 바디 안에 있다.** 프론트는 `claimedCount > 0` 이면 버튼을 잠그고 이유를 접근 이름으로 말한다(`ProgramFormPage.tsx:661-668`). **그러나 `claimedCount` 가 `ProgramInput.rewards` 에 실려 클라이언트를 왕복한다**(`:770-773` → `:745-749`) — 조작하면 그 방어가 통째로 사라진다(BE-074 §7.4 【보안 판정】) |
| 리워드·옵션 id 가 충돌하지 않는다 | **충족(픽스처) · 미보장(계약)** — `crypto.randomUUID()`(`:370,485`)라 같은 밀리초에도 겹치지 않는다. **그러나 클라이언트가 만든 id 를 서버가 그대로 저장하면** 다른 프로그램의 id 를 붙일 수 있다(BE-074 §7.4) |
| **리워드가 정의되지 않은 옵션을 가리키지 않는다** | **충족(두 겹)** — 폼 레벨 refine 이 막고(`validation.ts:89-100`), 저장 경로가 **옵션 정리 → 리워드 참조 정리 순서로** 떼어낸다(`ProgramFormPage.tsx:719-722`). 회귀 `programs.test.ts:496-506,547-578`. **순서가 뒤집히면 가리킬 곳 없는 id 가 저장된다** |
| **저장이 부분 적용되지 않는다** | **충족(픽스처) — 계약은 서버의 것이다.** `updateProgram` 이 한 번의 map 이라 원자적이다(`_shared/store.ts:407-413`). **서버에서는 트랜잭션이 필요하다**(BE-074 §7.3) — 옵션과 리워드가 갈리면 그 프로그램은 **다시 저장할 수도 없다**(폼이 열자마자 refine 에 걸린다) |
| 옵션 정리 규칙이 값을 조용히 버린다 | **의도된 동작** — 값이 빈 그룹·이름 없는 그룹·중복 이름 그룹을 저장 시 버린다(`_shared/store.ts:178-198`). **화면이 그것을 미리 알린다** — 리워드의 선택지에 값이 채워진 그룹만 넘긴다(`ProgramFormPage.tsx:892`, 사유 `:886-891`). 그래도 **버려졌다는 사실을 저장 후에 말하지는 않는다** |
| **상태 전이가 규칙을 지킨다** | **미충족 — 규칙이 어느 층에도 없다.** `z.enum` 이 형태만 보고(`validation.ts:58`) 저장소에 전이 술어가 0건이다. '진행 중 → 성공'을 기간이 남았는데도, '성공 → 작성 중'으로 되돌리기도 저장된다. 화면은 그 규칙을 **두 번 문장으로 말하지만** 강제하는 코드가 없다(BE-074 §7.2) |
| 기간이 끝나면 상태가 바뀐다 | **미충족** — 자동 전이가 없다. 종료일이 지난 `live` 는 영원히 '진행 중' 이다 |
| **남은 일수가 실제 날짜를 따른다** | **미충족** — 기준일이 하드코딩 `TODAY = '2026-07-21'` 이고 **세 파일에 각각 복제**돼 있다(`ProgramListPage.tsx:77` · `ProgramDetailPage.tsx:57` · `ProgramFormPage.tsx:101`). 날짜가 지나도 줄지 않고, 하나만 고치면 세 화면이 갈린다 |
| 날짜를 못 읽어도 0('오늘 마감')으로 위장하지 않는다 | **미충족** — `daysLeft` 가 파싱 실패에 **0** 을 낸다(`_shared/store.ts:161`) → '오늘 마감' 으로 보인다. 같은 리포의 문의 도메인은 같은 상황에서 `'—'` 를 낸다(`products/inquiries/types.ts:146-147`) — **같은 저장소 규약이 두 도메인에서 반대다** |
| **PG 를 끄면 CTA 가 문의로 수렴한다** | **충족 — fail-closed.** `pgSellable = usePg && merchantId.trim() !== ''`(`payment-settings.ts:128-130`)이고 상세가 그 결과만 그린다(`ProgramDetailPage.tsx:323,398-410`). **CTA 를 어디에도 저장하지 않는다**(`payment-settings.ts:133-138`) — 스위치를 내려도 낡은 값이 남지 않는다 |
| 결론이 난 펀딩에 후원 버튼을 그리지 않는다 | **충족** — `!ended` 일 때만 CTA 블록을 렌더한다(`ProgramDetailPage.tsx:398`). 주석이 이유를 적는다(`:396-397`) |
| **저장된 값이 화면에 정확히 보인다** | **미충족(둘)** — ① **스토리가 리치 텍스트(HTML)로 저장되는데 상세는 `pre-wrap` 평문으로 그린다**(`:423`) → `<p>`·`<ul>` 태그가 글자로 보인다 ② **상세 설명(`description`)과 대표 이미지(`coverImageUrl`)를 그리는 화면이 없다** — 폼이 받고 저장소가 들고 있지만 아무도 읽지 않는다(FS-074 §7 #9·#11) |
| 삭제가 참조를 검사한다 | **미충족** — 프로그램을 지울 때 그것을 가리키는 **프로그램 문의**(FS-076)도, **후원 이력**(`pledgedAmount > 0`)도 검사하지 않는다. 어느 층에도 코드가 없다(BE-074 §7.12 #9) |
| 감사 이력 | **없다.** 누가 언제 목표 금액·리워드 금액을 바꿨는지 기록하는 필드·엔드포인트가 없다. **금액이 고객 결제액이 되는 도메인이라 이 부재가 무겁다** |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | IA-02 | P0 | sub-route 에서 AppHeader `<h1>프로그램</h1>` + 상세·폼의 자체 `<h1>` → **`<h1>` 2개.** 목록은 in-content h1 이 없어 모델이 화면 타입마다 모순 | **앱 전역**(`AppHeader` 모델 — 상세·폼 화면 다수가 같은 결함) | 프론트 구현 · UI 기획 (FS-074 §7 #6) |
| 2 | IA-04 · ERP-05 · ERP-15 · COMP-07 | P0 · P1 · P2 | 페이지네이션 없음 — 전량 렌더. 프로그램은 상한 없이 증가. total-range·page-size selector 를 걸 표면도 없고, 순번 오프셋이 함께 붙어야 하는데 **그 소유가 공용 `CrudTable`** 이다. **URL list state 는 이미 있어**(`useListState`) `page` 를 쓰기만 하면 된다 | 이 화면 + 공용 + BE 계약 | UI 기획 · 백엔드 명세 (BE-074 §7.10 · §7.12 #13 · FS-074 §7 #2) |
| 3 | EXC-04 | P0 | **`If-Match`/`version` 없음 → 동시 편집은 last-write-wins.** 저장이 전체 치환이라 **리워드 목록 전체가 덮인다**. **충돌 다이얼로그는 이미 있으므로 토큰만 붙이면 pass 가 된다** | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 (BE-074 §7.6 · §7.12 #4) |
| 4 | (§4.3) | — | **후원된 리워드 삭제 차단의 근거가 요청 바디 안에 있다** — `rewards[].claimedCount` 가 클라이언트를 왕복한다. 클라이언트 생성 id 2종도 같다 | 이 화면 + BE 계약 | **백엔드 명세 (BE-074 §7.4 — 최우선)** · UI 기획 |
| 5 | (§4.3) | — | **상태 전이 규칙이 어느 층에도 없다** — 5개 상태 아무 곳으로나 갈 수 있고 기간이 끝나도 자동 전이가 없다. **기준일도 하드코딩이고 세 파일에 복제돼 있다** | **아키텍처 (선행)** · BE 계약 | 백엔드 명세 (BE-074 §7.2 · §7.12 #1·#2 · FS-074 §7 #3·#17) |
| 6 | EXC-06 · EXC-20 · A11Y-16(잔여) · A11Y-11(잔여) | P1 | 목록·상세가 403·429·500 을 한 문구로 뭉개고 참조 코드도 없다(폼은 둘 다 갖는다). 옵션·리워드의 오류가 어느 그룹·어느 행인지 말하지 못한다. 우측 미리보기 갱신에 live region 이 없다 | 이 화면 | UI 기획 쪽 변경 요청 (FS-074 §7 #5·#12) |
| 7 | EXC-08(잔여) | P0 | **삭제·일괄 삭제에 멱등키가 없다** — `DeleteVars` 에 자리 자체가 없다(`crud.ts:363-366`). 폼은 완전히 방어돼 있다. **일괄이 단건 반복이라 요청 폭풍의 상한도 없다** | 이 화면 + 공용 + BE 계약 | 프론트 구현 · 백엔드 명세 (FS-074 §7 #25 · BE-074 §7.12 #10) |
| 8 | EXC-07(잔여) | P1 | **400 `error.fields` 를 필드 인라인으로 매핑하지 않는다** — `useCrudForm.handleWriteError` 가 422 만 본다(`:209`) | 공용 | UI 기획 (BE-074 §7.12 #8) |
| 9 | (§4.2) | — | **폼이 카테고리 조회 실패를 아무에게도 말하지 않는다** — 선택지가 비어 '카테고리가 없다'로 읽힌다. 목록 화면은 같은 실패를 정확히 말한다. **그리고 그 조회는 `fixtureRequest` 를 지나지 않아 실패를 재현할 수단조차 없다** | 이 화면 | 프론트 구현 (FS-074 §7 #19 · BE-074 §7.12 #5) |
| 10 | STATE-06(잔여) · (§4.1) | P1 | **카테고리를 두 개의 react-query 키로 캐시한다** — 카테고리 화면의 변경이 이 화면의 선택지를 무효화하지 않는다. **백엔드와 무관하게 지금 고칠 수 있다** | 이 화면 + 카테고리 화면 | UI 기획 쪽 변경 요청 (FS-074 §7 #13 · BE-075 §7.12 #7) |
| 11 | (§4.3) | — | **저장된 값이 화면에 정확히 보이지 않는다** — 스토리 HTML 이 태그째 보이고(버그), 상세 설명·대표 이미지는 어느 화면도 그리지 않는다 | 이 화면 | 프론트 구현(버그) · UI 기획 (FS-074 §7 #9·#11) |
| 12 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건. **BE-074 §2 의 '서버 10초 < 프론트 상한' 이 성립하지 않는다** | **앱 전역** | 프론트 구현 · UI 기획 (FS-074 §7 #24) |
| 13 | (§4.2) | — | 세션 만료·권한 강등이 **작성 중 폼을 통째로 버린다**(EXC-19 P1) — 입력량이 가장 많은 화면이라 손실이 크다. 이탈 가드도 `navigate()` 를 못 잡는다 | 이 화면 + 앱 전역 | UI 기획 쪽 변경 요청 (FS-074 §7 #10·#23) |
| 14 | COMP-09 · COMP-12 · ERP-08 | P2 | 프로그램명 셀에서 제목만 truncate 없음(한 셀 두 규칙) · 텍스트 입력 3개에 카운터 없음(리치 텍스트는 있다) · 기간 셀이 포맷 함수를 거치지 않음 | 이 화면 | UI 기획 쪽 변경 요청 (FS-074 §7 #15·#18) |
| 15 | (§4.3) | — | **프로그램 삭제가 참조·후원 이력을 검사하지 않는다** · **감사 이력이 없다**(금액이 고객 결제액이 되는 도메인이다) | BE 계약 · 아키텍처 | 백엔드 명세 (BE-074 §7.12 #9) |
| 16 | (§4.1) | — | `watch` 13개가 폼 전체를 구독해 어느 입력이든 전체 재렌더를 낸다. 리워드가 많으면 그 표가 함께 다시 그려진다 | 이 화면 | UI 기획 (경미) |
| 17 | FEEDBACK-05(undo) · (§4.3) | P2 | 삭제에 undo window·soft-delete 가 없다 — confirm 으로 요구는 충족하나 삭제가 참조를 검사하지 않아 되돌릴 수 없는 사고의 범위가 넓다 | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`programAdapter` 는 `scope: PROGRAM_RESOURCE`(`data-source.ts:23,28` — 값은 **`'programs'`**)로 `fixtureRequest` 를 부른다. `createStoreAdapter` 가 제공하는 4개 op 을 **화면이 전부 부른다** — 클레임(NFR-044 §6)이 `delete` 를 못 쓰던 것과 다르다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll` (`crud.ts:200`) | `?fail=list` · `?fail=programs:list` · `?fail=all` | FS-074-EL-021 |
| `detail` | `fetchOne` (`crud.ts:205`) | `?fail=detail` · `?fail=programs:detail` · `?fail=all` | FS-074-EL-028(상세) **와** EL-054(폼 로드) — **두 화면이 같은 op 을 공유한다** |
| `save` | `create` (`crud.ts:227`) · `update` (`crud.ts:241`) | `?fail=save` · `?fail=programs:save` · `?fail=all` | FS-074-EL-051 · EL-052 |
| `delete` | `remove` (`crud.ts:268`) | `?fail=delete` · `?fail=programs:delete` · `?fail=all` | FS-074-EL-022(단건) · EL-023(일괄) — **일괄이 단건 반복이라 전부 실패한다** |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 경과 후 재진입**으로 한다.
- **`fetchProgramCategoryOptions` 는 어떤 스위치로도 실패시킬 수 없다** — `fixtureRequest` 를 지나지 않고 `Promise.resolve` 를 바로 돌려준다(`data-source.ts:53-54`). **FS-074-EL-004.3(카테고리 조회 실패 표시)은 브라우저에서 도달 불가능한 경로다**(§5 #9). 그 코드의 방어선은 현재 없다.
- **scope 를 생략한 `?fail=list` 는 카테고리 화면의 어댑터도 함께 실패시킨다**(scope 가 `'program-categories'` 로 다르지만 op 이 같다 — `dev.ts:122`). 두 화면을 가르려면 `?fail=programs:list` 처럼 scope 를 붙인다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass). 폼(`/programs/:id/edit`)에서도 같은 분기가 나오는지 확인 |
| **EXC-04 (409 conflict)** | `?status=save:409` 로 폼 저장 → **`FormConflictDialog` 가 뜨고 입력이 보존되며 reload/dismiss 를 고를 수 있으면 그 절은 pass**(현재 그렇다). **토큰 부재는 스위치로 재현되지 않는다** — `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/programs` = 0건으로 판정한다 |
| EXC-06 (403 강등) | `?status=save:403` → 폼은 배너, `?status=list:403` → 목록 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-07 (422 필드 매핑) | `?status=save:422` 는 `violations` 가 **비어 있는** `HttpError` 를 던지므로(`dev.ts:93`) 화면이 **배너 폴백**을 탄다. **실제 필드 매핑은 어댑터가 `violations` 를 실어야 재현된다** — 이 도메인에는 그것을 던지는 코드가 아직 없다(서버 연동 시 §6.1 이 그 형태를 요구한다) |
| EXC-08 (중복 제출) | `?fail=save` 없이 정상 저장을 연타한다. **요청이 1건만 나가면 pass**(동기 락). 재시도가 같은 키를 재사용하는지는 `useCrudForm.ts:146-150` 의 `takeIdempotencyKey` 로 확인한다 |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fprograms&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼 배너에 `오류 코드 TDS-…` 가 보이면 pass. **`?fail=save` 로는 재현되지 않는다** — generic `Error` 에는 `reference` 가 없어 `referenceOf` 가 null 을 준다(정확한 동작). **`?status=list:500` 에는 참조 코드가 없다**(gap) |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/programs` 의 `create`/`update`/`remove` 를 각각 꺼 CTA·수정 링크·행 액션·선택 열이 사라지는지, 폼이 403 화면이 되는지 확인(현재 pass) |
| **EXC-21 (거절 계열 분리)** | **세 계열을 각각 다른 수단으로 재현한다.** 플랜 축은 **재현 대상이 없다** — `grep -n "programs" apps/admin/src/shared/entitlements/module-resources.ts` = **0건**(이 라우트가 어떤 모듈에도 속하지 않는다). 권한 축은 권한 스토어. **설정 축은 `/settings/payment` 에서 PG 를 끄거나 상점 ID 를 비운 뒤 `/programs/:id` 진입** — CTA 가 '문의하기' 가 되고 사유 문구 + 설정 링크가 뜨면 pass |
| FEEDBACK-02 (다이얼로그 유지) | `?fail=delete` 로 행 삭제 → **다이얼로그가 남고 그 안에 사유가 뜨며 확인 버튼이 되살아나면 pass**. `?status=delete:409` 면 어댑터 문장이 그대로 보여야 한다 |

**픽스처 조작이 필요한 판정**: 실제 `violations` 를 실은 422(EXC-07 의 인라인 경로) · 1,000건 목록(ERP-15) · 200자 제목(COMP-09) · 후원된 리워드가 없는 프로그램(§4.3 의 삭제 차단). 이 경로의 방어선은 e2e 가 아니라 **`programs.test.ts` 의 순수 규칙 테스트**다.

**회귀 방어선**: `programs.test.ts` — 파생값 3종(달성률·목표 달성·남은 일수) · 상태 문구·색 · 목록 필터와 **카테고리 롤업의 '거르는 규칙 = 세는 규칙' 등식**(`:164-172`) · 검색 · 카테고리 2Depth 규칙 8건 · 폼 검증 전수(기간 순서·금액·상세 설명 평문 길이·옵션 3규칙·리워드 참조 무결성) · 저장 직전 정리 규칙 2종. **렌더 테스트는 없다** — 이 화면에 `*.test.tsx` 가 0건이라 EXC-04 의 충돌 다이얼로그·EXC-08 의 동기 락·A11Y-11 의 describedby 짝이 **DOM 수준에서 고정돼 있지 않다**.

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **EXC-04 는 '충돌 다이얼로그는 재현되고 토큰 부재는 grep 으로 판정한다'** 는 두 갈래 절차를 명시했다
- [x] 모든 `N/A` 에 사유를 댔다 — **FEEDBACK-06 하나뿐**이며(폼이 modal 이 아니라 라우트다) 그 축이 카테고리 화면의 것임을 밝혔다
- [x] §2.1 산수 검산 — **17 pass + 10 종속 + 1 n-a + 3 gap = 31** ✓
- [x] **IA-05 를 실재 표면으로 판정**했다 — `/programs/new` 와 `/programs/:id/edit` 가 `App.tsx:342,347` 에서 **같은 컴포넌트**를 가리키고 `isEdit` 하나로 title·라벨·prefill 만 갈린다는 것을 코드로 확인했다(클레임 화면이 n-a 였던 것과 대비)
- [x] **EXC-21 을 실재 표면으로 판정**했다 — 이 라우트가 `MODULE_RESOURCES` 에 **0건**임을 전수 확인해 플랜 계열이 없음을 밝히고, **결제 설정 계열이라는 다른 축의 거절 표면**(상세 CTA 안내 + 설정 링크)이 권한 계열과 다른 라우트에 있어 섞이지 않음을 근거로 pass 를 줬다
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`·`shared/permissions`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·CSV·optimistic·토글 셀렉트 필터·기간 범위 필터)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. 성능 수치는 전부 '측정 불가(백엔드 없음)' 다
- [x] §4.3 을 **모금·공개 무결성 · 감사** 축으로 세웠다 — 파생값 불저장 · 모금액 불변 · 후원된 리워드 보호 · 참조 무결성 · 전이 규칙 부재 · PG fail-closed · 감사 이력 부재
- [x] §6 의 `?fail=` scope(`programs`)와 op 4개를 **어댑터 코드에서 확인**했고, **`fetchProgramCategoryOptions` 가 그 계약 밖이라 실패를 재현할 수 없다**는 사실을 명시했으며, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] §5 의 gap 이 FS-074 §7 · BE-074 §7.12 와 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가', E2E 미실행을 §1·§6 에 명시했고, **이 화면에 렌더 테스트가 0건이라 세 판정이 DOM 수준에서 고정돼 있지 않다**는 사실도 §6 에 남겼다
