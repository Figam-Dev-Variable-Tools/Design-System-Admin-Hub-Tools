---
id: NFR-031
title: "이벤트 비기능 명세"
functionalSpec: FS-031
backendSpec: BE-031
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-031. 이벤트 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-031 이벤트 (`/marketing/events` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** — ID 로만 참조하고, '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가' 만 적는다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 요구의 정의가 궁금하면 quality-bar 를, 화면 동작이 궁금하면 FS-031 을, 서버 계약이 궁금하면 BE-031 을 본다 |
| 함께 읽는 문서 | FS-031 (화면·예외) · BE-031 (엔드포인트·보안 판정) · NFR-032 (프로모션 — 같은 골격이라 판정이 거의 동일하며 **차이는 A11Y-11 1건**) |
| 갱신 규칙 | 코드가 바뀌면 이 문서의 '코드 근거' 파일:라인이 먼저 깨진다. 근거가 깨진 판정은 재검증 전까지 유효하지 않다 |
| 판정 기준일 | 2026-07-17 · 베이스 `3cd3078`(F2). **E2E 미실행 — 판정 근거는 전부 코드 대조다**(§6) |

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
| STATE-01 | STATE | 직접 | `useCrudList.tsx:71-72` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 로 가른다. `CrudListShell.tsx:138` 이 `loading={firstLoading}` 만 표에 넘기고, `crud.ts:151` 이 `placeholderData: (previous) => previous` 로 이전 행을 들고 있다. 4상태가 `CrudListShell.tsx:113`(error) → `CrudTable.tsx:143`(loading) → `:153`(empty) → 행 렌더로 배타 분기 | `/marketing/events` 진입 → 스켈레톤 5행만(빈 상태 문구 없음). 이벤트 1건 삭제 후 목록 무효화 재조회 → **표가 스켈레톤으로 돌아가지 않고** 이전 행이 남은 채 요약만 '· 새로고침 중…'. `?fail=marketing-events:list` → 실패 배너만(빈 상태·스켈레톤 없음) | pass |
| STATE-02 | STATE | 직접 | `CrudListShell.tsx:156-165` — 조회 실패 시 표 대신 `<Alert tone="danger">` + '다시 시도'(`controller.refetch`). 토스트 없음. 폼의 로드 실패는 `FormPageShell.tsx:122-142` 가 같은 규약(Alert + '다시 시도') | `?fail=marketing-events:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건. '다시 시도' 클릭 시 쿼리 재발행. `?fail=marketing-events:detail` 로 `/:id/edit` 진입 → 폼 자리에 Alert | pass |
| STATE-04 | STATE | 직접 | 선택 해제 축: `EventListPage.tsx:82-84` 의 `useEffect(() => { clear(); }, [filter, keyword, clear])` 가 상태 필터·키워드 변경 시 선택을 비운다. `CrudListShell.tsx:143-147` 이 `toggleAll` 에 **현재 보이는 행 id 만** 넘겨 숨겨진 행이 선택되지 않는다 | 3건 선택 → 상태 필터를 '종료'로 변경 → 선택 0건, SelectionBar 사라짐. 키워드 입력 시에도 동일 | pass · **단 clamp 축은 성립하지 않는다** — 이 목록에 페이지네이션이 없어 '범위를 벗어난 page' 가 존재할 수 없다(IA-04 gap 에 종속). IA-04 해소 시 이 판정을 **재검증해야 한다** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조한다 — `EventListPage.tsx:29-59`(toolbar·filters·selectWrap·period·statusCell) · `EventFormPage.tsx:36-40`(row). 하드코딩 hex 0건, px 리터럴 0건. 폭은 `calc(var(--tds-space-6) * 5)` 로 토큰 배수(`EventListPage.tsx:46`) | `EventListPage.tsx`·`EventFormPage.tsx` 에 `#[0-9a-f]{3,6}` grep = 0, `[1-9]px` grep = 0, `(outline\|border): (thin\|medium\|thick)` grep = 0 | pass · 토큰 **정의**(`tokens.json`)와 DS 컴포넌트 내부는 상속 — `space.6` 배수 해킹은 TOKEN-08(P1)의 대상이다 |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 링 표면: 폼 입력 5종(`className="tds-ui-input tds-ui-focusable"` — `EventFormPage.tsx:146,182,213,250`) · 폼 '목록으로'(`FormPageShell.tsx:149`) · DS `Button`·`SearchField`·`SelectField`·`RowActions`·`ToggleSwitch`. 전부 DS 의 `tds-ui-focusable` / 컴포넌트 CSS 가 링을 결정한다 | DS 소유 문서/스토리로 판정. 이 화면에서는 '자체 outline 선언 0건' 만 확인 가능 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 삭제·저장 **성공/실패 토스트**(`useCrudList.tsx:107,145` · `useCrudForm.ts:215` → `ToastProvider`) · `ToggleSwitch`(배너 연동) transition | DS `Toast.css` · `tokens.json` motion.easing 소유 판정 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating/overlay 표면: `ConfirmDialog`(단건·일괄 삭제 — `useCrudList.tsx:151-178`) · 충돌 다이얼로그(`FormPageShell.tsx:195`) · Toast · 폼 `Card`(`FormPageShell.tsx:164`) | DS `Modal.css`·`Card.css`·`Toast` 소유 판정 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 display/heading 표면: 폼 `<h1>`(`FormPageShell.tsx:159` — 공유 `pageTitleStyle`) · AppHeader `<h1>`(`AppHeader.tsx:52-55,101` — F2 가 primitive 직접 참조를 `pageTitleStyle` 로 교체) · `CardTitle` | DS `pageTitleStyle`·`tokens.json` typography 소유 판정 | 종속 |
| COMP-10 | COMP | 직접 | **없다.** 검색 입력이 지역 `useState` 에 직결된다(`EventListPage.tsx:70,123-128`) — 공용 `useDebouncedSearch`(IME 조합 판정 + 디바운스 + Enter 차단 보유)를 **소비하지 않는다**. `useDebouncedSearch` 소비자는 `members/MembersPage.tsx` 뿐이다. DS `SearchField.tsx` 자체에도 `isComposing`·composition 핸들러가 **0건**이다 | 한글 '여름' 입력 → `ㅇ`·`여`·`여ㄹ`·`여르`·`여름` 각 조합 단계마다 `searchEvents` 재계산 + **`useEffect` 가 `clear()` 를 호출해 행 선택이 해제된다**(`EventListPage.tsx:82-84`). 완성 시 1회가 아니라 자모당 1회. **완화 사실**: 필터가 클라이언트 메모리 연산이라 네트워크 요청·stale 응답 경합은 **오늘은 발생하지 않는다**(BE-031 §7.4 로 서버 검색이 도입되면 즉시 발생한다) | **gap** |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제·일괄 삭제가 `ConfirmDialog intent="delete"` 로 게이트된다(`useCrudList.tsx:151-178`). `busy={deleting}` 로 확인 버튼 잠금. 실패 시 **다이얼로그를 닫지 않고** `error={deleteError}` 배너(`:111`) — 재클릭이 재시도. `closeDelete`(`:86-92`)·`closeBulk`(`:117-123`) 가 cancel/Esc/dim 에서 `controller.abort()` + `mutation.reset()` + pending 초기화 | `?fail=marketing-events:delete` → 삭제 확인 → 다이얼로그 유지 + danger 배너, 재클릭이 재시도. 삭제 in-flight 중 Esc → 토스트 없이 닫히고 버튼 상태 복원 | pass · 다이얼로그 자체의 tone/icon/포커스는 DS 상속 |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell.tsx:113` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `isDirty` 는 RHF 소유(`useCrudForm.ts:254`). 문구는 화면이 소유(`EventFormPage.tsx:33-34`). 저장 성공 후 `navigate(listPath, { replace: true })`(`useCrudForm.ts:216`) 시점엔 이미 `saving` 이 참이라 가드가 꺼져 있다 | 이벤트명 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 Back — 3경로 모두 discard 확인. 저장 성공 후 같은 이동은 프롬프트 없이 통과 | pass · 3경로 구현은 `useUnsavedChangesDialog` 상속 |
| FEEDBACK-06 | FEEDBACK | **N/A** | **이 화면에 폼을 담은 modal 이 없다.** 유일한 modal 은 삭제 `ConfirmDialog`(입력 필드 0개 — 확인/취소 버튼뿐)와 충돌 다이얼로그(같음)다. 편집은 전부 전용 라우트(`/new`·`/:id/edit`)에서 일어나며 그 가드는 FEEDBACK-04 가 담당한다. IA-06(무게 규칙)에 정합한 선택이다 | — (표면 부재) | N/A |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 삭제 성공(`useCrudList.tsx:107`) · 일괄 삭제 성공(`:145`) · 저장 성공(`useCrudForm.ts:215`). `ToastProvider.tsx:165,168` 이 **항상 마운트된** polite(`role="status"`) · assertive 두 region 을 두고 텍스트만 주입한다 | DS `ToastProvider` 소유 판정 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 삭제·일괄 삭제 `ConfirmDialog` · 충돌 다이얼로그. `Modal.tsx:6,60` 이 `describedBy` 로 본문 id 를 `aria-describedby` 에 연결한다 | DS `Modal`·`ConfirmDialog` 소유 판정 | 종속 |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 필드 6종을 전수 확인했다.** ① 이벤트명 `EventFormPage.tsx:151-153` — `aria-invalid` + `aria-describedby={errorIdOf('event-title')}` 짝 ✓ ② 대상 `:185-187` ✓ ③ 혜택 상세 `:216-220` ✓ ④ 연동 배너명 `:254-258` ✓ ⑤ 기간 `DateRangeField.tsx:47` — `invalidProps` 가 두 속성을 **함께** 부여(짝 없는 부여 불가) ✓ ⑥ 설명 `TextareaField.tsx:62-63` — 자체 배선 ✓. `FormField` 는 자동 배선하지 않으므로(`FormField.tsx` — `errorIdOf`/`hintIdOf` 노출만) **호출부 책임인데 전 필드가 이행했다**. 상태·혜택 유형 select 는 error 를 받지 않아 위반이 성립하지 않는다 | 이벤트명을 비우고 제출 → `<input aria-invalid="true" aria-describedby="event-title-error">` 이고 `<p id="event-title-error" role="alert">` 가 존재. 6필드 전부 동일. `aria-describedby` 없는 `aria-invalid` grep = 0 | pass · **NFR-032 는 이 항목이 gap 이다**(프로모션 최소 주문금액 필드) |
| A11Y-12 | A11Y | **N/A** | **이 화면에 좌측 필터 list item 토글이 없다.** 상태 필터가 `<select>`(`SelectField` — `EventListPage.tsx:130-143`)라 선택 상태를 네이티브 `<option selected>` 로 표현한다. `aria-pressed`·`aria-current` 를 쓸 표면 자체가 없다 | `EventListPage.tsx` 에 `aria-current` grep = 0, `aria-pressed` grep = 0 (둘 다 필요 없다) | N/A |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 삭제·일괄 삭제 `ConfirmDialog` · 충돌 다이얼로그 | DS `Modal` 소유 판정. (참고: `packages/ui/src` 에 `AnimatePresence`·`motion` import 0건 — 소유 문서가 gap 을 질 것으로 보이나 **판정은 이 문서의 몫이 아니다**) | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: A11Y-01 과 동일한 3개 토스트 | DS `ToastProvider`·`Toast` 소유 판정 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면의 motion 표면: `ToggleSwitch`(배너 연동 — `EventFormPage.tsx:229-238`) · Toast · Modal. `ToggleSwitch.css:56` 이 `transition: transform var(--tds-motion-duration-fast)` 를 선언한다 | DS `ToggleSwitch.css`·전역 motion 게이트 소유 판정. (참고: `ToggleSwitch.css` 에 `prefers-reduced-motion` 블록 0건 — quality-bar 가 명시적으로 지목한 위반이나 **판정은 소유 문서의 몫**) | 종속 |
| IA-01 | IA | 직접 | `App.tsx:251-253` 의 3라우트(`/marketing/events`·`/new`·`/:id/edit`)가 전부 `APP_ROUTES` 배열에 있고, `:334-336` 이 이를 `RequireAuth > AppShell` 레이아웃 라우트(`:324-330`) **아래에** 렌더한다. 이 화면의 컴포넌트는 자체 sidebar/header/outer frame 을 렌더하지 않는다 — 최상위가 `CrudListShell` 의 `columnStyle` div(`CrudListShell.tsx:98`) · `FormPageShell` 의 `pageStyle` div(`FormPageShell.tsx:146`) 다 | `/marketing/events` 진입 → 사이드바·AppHeader·단일 padded `<main>` 안에서 렌더. `EventListPage.tsx`·`EventFormPage.tsx` 에 `<aside>`·`<header>`·`<nav>` grep = 0 | pass |
| IA-02 | IA | 직접 | **하위 라우트가 브랜치 라벨로 폴백한다.** `AppHeader.tsx:92` 가 `findNavLabel(pathname)` 만 쓴다. `nav-config.ts:253-264` 는 ① 정확히 일치하는 잎을 찾고 ② 없으면 `pathname.startsWith(item.basePath)` 인 **브랜치 라벨**을 반환한다. `/marketing/events/new` 는 잎이 아니므로(잎은 `/marketing/events` 뿐 — `nav-config.ts:174-181`) **'마케팅 관리'** 가 나온다. 동시에 `FormPageShell.tsx:159` 가 두 번째 `<h1>` '이벤트 등록' 을 그린다 → **한 화면에 h1 2개, 최상단 primary title 은 브랜치 라벨**. **F2 가 `AppHeader.tsx` 를 +10/-5 수정했으나 그것은 TOKEN-05(`pageTitleStyle` 도입)일 뿐 라벨 해석 로직은 그대로다**(diff 확인 완료) | `/marketing/events/new` 진입 → AppHeader `<h1>` = '마케팅 관리'(≠ '이벤트 등록'). `document.querySelectorAll('h1').length === 2`. 목록(`/marketing/events`)은 잎이라 '이벤트' 로 정확하지만 **in-content title 이 없어** list/form 의 title 소스가 서로 다르다 | **gap** |
| IA-04 | IA | 직접 | 템플릿 4요소는 충족: ① toolbar — 검색·필터 좌측(`EventListPage.tsx:122-145`), primary '이벤트 등록' 우상단(`:146-149`, `justifyContent:'space-between'`) ② count 요약(`CrudListShell.tsx:118-122`) ③ SelectionBar(`:125-133`) ④ table(`:135-154`). **⑤ Pagination 이 없다** — `CrudListShell` 에 페이지네이션 컴포넌트가 존재하지 않고 `visibleItems` **전량**이 `CrudTable` 로 간다. 이벤트 수 상한도 없다(등록으로 무한히 증가) | 이벤트를 30건 등록 → 30행이 **한 화면에 전부** 렌더되고 페이지 컨트롤이 없다. quality-bar 의 'page size 초과 가능 시 Pagination 렌더' 를 만족하지 못한다 | **gap** |
| IA-05 | IA | 직접 | `App.tsx:252-253` — `/marketing/events/new` 와 `/marketing/events/:id/edit` 가 **동일한 `<EventFormPage />`** 로 해석된다. `useCrudForm.ts:73-74` 가 `const { id } = useParams(); const isEdit = id !== undefined` 로 갈린다. 레이아웃 동일, 다른 것은 title(`FormPageShell.tsx:159` — '등록'/'수정')·제출 라벨(`:189`)·prefill(`useCrudForm.ts:125-128`) 뿐. create 전용/edit 전용 페이지가 없다 | `/marketing/events/new` 와 `/marketing/events/ev-1/edit` 의 DOM 구조 동일, h1 과 값만 다름 | pass |
| IA-13 | IA | 직접 | **없다.** 상태 필터·키워드가 컴포넌트 지역 `useState` 에만 있다(`EventListPage.tsx:70-71`). 공용 `useListState`(URL 직렬화 + `useSearchParams` 보유 — `useListState.ts:3-19,22`)를 **소비하지 않는다**. `useListState` 소비자는 `members/MembersPage.tsx`·`members/components/MembersToolbar.tsx` 뿐이다 | 상태 필터 '진행' + 키워드 '여름' 적용 → URL 이 `/marketing/events` 그대로(쿼리스트링 없음). F5 → 필터·검색어 전부 초기화. 행 클릭으로 수정 폼 진입 후 브라우저 Back → 필터 없는 초기 목록. URL 복사 → 다른 탭에서 필터 없는 목록 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면을 덮는 경계 2겹: ① `AppShell.tsx:484-493` 이 `<Outlet>` **바로 바깥**에서 잡아 사이드바를 살린 채 복구 UI 를 그린다 — 이 화면이 던지면 여기서 멈춘다 ② `App.tsx:311-315` 루트 경계가 셸 자체의 예외를 받는다 | DS/셸 소유 판정 | 종속 |
| EXC-02 | EXC | 상속 | ① 라우트 가드 — `App.tsx:324-330` 이 `RequireAuth` 를 `AppShell` **바깥**에 둬, 세션 없이 `/marketing/events` 로 deep-link 하면 셸도 그리지 않고 리다이렉트한다 ② 401 인터셉터 — `queryClient.ts:38-40,46-47` 의 `QueryCache`/`MutationCache` `onError` 가 `isUnauthorized` 를 `notifySessionExpired()` 로 보낸다. **이 화면의 모든 조회·쓰기가 이 두 캐시를 통과하므로 전용 처리 없이 덮인다** | 셸/auth 소유 판정. (이 화면 고유 사실: 세션 만료 시 편집 중 입력이 보존되지 않는다 — EXC-19 P1, §3) | 종속 |
| EXC-03 | EXC | 직접 | **읽기 게이팅은 충족, 쓰기 컨트롤 게이팅이 없다.** ① read — `AppShell.tsx:490-492` 의 `RequirePermission` 이 `<Outlet>` 을 감싸 **모든 라우트를 한 번에** 덮고, `route-resource.ts:36-46` 이 `/marketing/events/ev-1/edit` → 잎 `/marketing/events` 로 해석해 하위 라우트까지 게이팅한다 → read-forbidden deep-link 는 `ForbiddenScreen` ✓ ② **write — `useRouteCan`/`useRouteWritePermissions`(`RequirePermission.tsx:27,45`)가 존재하지만 `apps/admin/src` 전체에서 소비자가 0건이다.** 따라서 `remove` 권한 없는 역할도 '이벤트 등록'(`EventListPage.tsx:146`) · `RowActions` 수정/삭제(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:126-132`)를 **전부 보고 누를 수 있다** | `create`/`update`/`remove` 권한 없는 역할로 `/marketing/events` 진입 → 세 쓰기 컨트롤이 **그대로 보인다**(quality-bar: 'delete 없는 role 이 row/bulk delete 버튼을 못 봄' 위반). 누르면 서버 403 → 일반 실패 문구. read 권한 없는 역할의 deep-link 는 403 화면 ✓ | **gap** (읽기 축 pass · 쓰기 축 미충족) |
| EXC-04 | EXC | 직접 | **유령 저장은 막지만 동시성 토큰이 없다.** ① 충족 — `crud.ts:71-73` 이 없는 id 의 update 에 `HttpError(409)` 를 던지고(조용한 no-op + success 금지), `useCrudForm.ts:158-172` 가 **입력을 보존한 채** 충돌 다이얼로그를 연다(성공 토스트·목록 이동 없음). `http-error.ts:102` 가 409·412 를 같은 UX 로 수렴시킨다 ② **미충족 — `MarketingEvent` 에 `updatedAt`/`version` 필드가 없어**(`types.ts:7-23`) `If-Match`/ETag 를 실을 수단 자체가 없다. 이 도메인에서 `If-Match` grep = 0 | ① 두 탭에서 같은 이벤트 수정 폼을 연다 → 탭 A 저장 → 탭 B 저장 → **탭 B 가 탭 A 의 변경을 조용히 덮는다**(경고·다이얼로그 없음). PUT 이 전 필드 치환이라 손실은 레코드 전체다 ② `?status=save:409` → 입력 보존 + 충돌 다이얼로그 + 성공 토스트 0건 ✓ | **gap** — '먼저 삭제'(409)만 감지하고 '먼저 수정'(last-write-wins)은 감지 못 한다. quality-bar appliesTo 가 '엔티티에 updatedAt 존재' 를 단서로 달지만, **그 필드의 부재 자체가 데이터 손실의 원인**이므로 N/A 로 면제하지 않는다 → BE-031 §7.3 |
| EXC-08 | EXC | 직접 | ① **동기 제출 락** — `useCrudForm.ts:102` 의 `submitLockRef`, `:195-197` 이 `onValid` 진입 즉시 검사·설정, `:207-209` `onSettled` 에서 해제, `:239-241` `onInvalid` 에서도 해제. RHF 비동기 검증이 도는 사이의 두 번째 Enter 를 ref 가 **렌더를 기다리지 않고** 막는다 ② **disable** — `FormPageShell.tsx:188` `disabled={saving \|\| loadingDetail}` ③ **멱등키** — `useCrudForm.ts:112-117` 의 `idempotencyKeyRef` + `takeIdempotencyKey()` 가 **mutationFn 밖**(제출 시도 단위)에서 생성돼 재시도가 같은 키를 재사용하고, 성공 시 `:214` 에서 버린다. `queryClient.ts` 가 mutation `retry: false` 로 자동 재시도를 끈다 ④ 삭제 — `ConfirmDialog busy`(`useCrudList.tsx:160,171`) | 등록 폼에서 Enter 연타 → 요청 정확히 1건. `?fail=marketing-events:save` 후 '확인' 재클릭 → 같은 멱등키 재사용(키가 `mutationFn` 밖 ref 에 있음) | pass · **키가 서버로 전송되지는 않는다** — 어댑터 시그니처에 자리가 없다(`crud.ts:19-20`). quality-bar 의 요구는 '키를 mutationFn 밖에서 생성' 이며 그것은 충족된다. 전송 배선은 BE-031 §7.11 |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort` 를 전 경로가 쓴다: ① 저장 — `useCrudForm.ts:155` `if (isAbort(cause)) return` (토스트·배너 없음) ② 삭제 — `useCrudList.tsx:110` 동일 ③ 언마운트 — `useCrudForm.ts:92` `useEffect(() => () => controllerRef.current?.abort(), [])` ④ 다이얼로그 닫기 — `useCrudList.tsx:87-89`(`abort()` + `deleteItem.reset()`) · `:118-121`(bulk 동일) ⑤ 캐시 무변경 — `crud.ts:237-239` 가 `if (signal.aborted) return` 로 invalidate 를 건너뛴다 ⑥ **일괄 실패 count 에서 abort 제외** — `settleAll` + `useCrudList.tsx:135-136` 의 `if (controller.signal.aborted) return` | 삭제 확인 → 응답 전 Esc → 토스트 0건, 버튼 상태 복원, 목록 무변경. 저장 중 '목록으로' → 토스트 0건 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 해당 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-05 · EXC-08 · EXC-09 |
| `종속`(상속) | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **2** | FEEDBACK-06(폼 담은 modal 부재) · A11Y-12(필터 토글 부재 — select 사용) |
| `gap` | **6** | COMP-10 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 |
| **합계** | **30** | 11 + 11 + 2 + 6 = **30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30 ✓) |

> **P0 gap 6건은 quality-bar 기준 '배치 실패' 사유다.** 6건 중 **5건이 앱 전역 범위**(COMP-10 · IA-02 · IA-04 · IA-13 · EXC-03 — 공용 프레임워크·셸이 소유하며 이 화면만 고쳐서는 해소되지 않는다), **1건이 도메인 범위**(EXC-04 — `types.ts` + 서버 계약). §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `crud.ts:151` `placeholderData: (previous) => previous` + `CrudListShell.tsx:118-121` 이 재조회 중 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. `queryClient.ts:24` `staleTime: 30_000` | 삭제 후 재조회 → 이전 행 유지, full skeleton 없음 | pass |
| STATE-05 | P1 | `EventListPage.tsx:160-165` 가 `empty={{ hasQuery, hasActiveFilters, onClearSearch, onResetFilters }}` 를 넘기고 `Empty` 가 3분기 + 복구 액션 + 조사(이/가)를 그린다 | 키워드 0매치 → '조건에 맞는 이벤트가 없습니다' + '검색 지우기'. 필터 0매치 → '필터 초기화'. 픽스처 비움 → '등록된 이벤트가 없습니다' | pass · 생성 CTA 슬롯(`createAction`)은 넘기지 않아 진짜 빈 상태에 등록 버튼이 없다(경미) |
| STATE-06 | P1 | `crud.ts:179-181`(create) · `:198-201`(update — list + detail) · `:217-220`(delete) · `:237-239`(bulk — 전원 성공 시만) 가 stale 캐시만 정확히 무효화한다 | 이벤트 수정 → 목록 복귀 시 수동 새로고침 없이 새 값 | pass |
| COMP-01 | P1 | 이 화면은 DS `<Button>` 만 쓴다(`EventListPage.tsx:146`). 그러나 공용 셸이 이탈: `FormPageShell.tsx:147-155` 의 '목록으로' 가 스타일 입힌 `<button>`, `:189` 가 `loading` prop 대신 `{saving ? '저장 중…' : …}` 손수 문자열 | `FormPageShell.tsx` 에 `backLinkStyle` + 수기 '저장 중…' 존재 | gap (앱 전역 · 공용 셸) |
| COMP-02 | P1 | `CrudTable.tsx:124-130,173-179` 가 `SelectAllHeaderCell`·`RowSelectCell`·`SeqHeaderCell`·`SeqCell` 을 쓴다. raw checkbox 0건 | `CrudTable.tsx` 에 `type="checkbox"` grep = 0 | pass |
| COMP-03 | P1 | `EventListPage.tsx:123-128` 이 DS `<SearchField>` 를 쓴다 | `EventListPage.tsx` 에 `type="search"` grep = 0 | pass |
| COMP-04 | P1 | required 필드 전부 `FormField required` 로 `*` 마커: 이벤트명(`:142`) · 대상(`:178`) · 혜택 상세(`:204-208`) · 연동 배너명(`:241-246`) · 상태(`:169`). `DateRangeField required`(`:159`)도 `*` 를 그린다 | 라벨 옆 `*` 렌더 확인 | pass |
| COMP-07 | P2 | `CrudTable.tsx:179` `<SeqCell seq={index + 1} />` — `startIndex` 없음 | **현재 재현 불가** — 페이지네이션이 없어 2페이지가 존재하지 않는다. IA-04 해소 시 **즉시 위반**(2페이지 첫 행 seq = 1) | gap (조건부 · IA-04 에 종속) |
| **COMP-11** | **P1** | **폼의 기간 입력**: DS `DateRangeField`(`EventFormPage.tsx:157-166`) 단일 컴포넌트, 키보드 조작 가능(`<input type="date">`), 에러를 `role="alert"` 로 주입. **`start ≤ end` 가 실제로 강제된다** — `validation.ts:40-47` 의 `if (end < start)` → '종료일은 시작일보다 빠를 수 없습니다.', `events.test.ts:74-78` 이 고정. **quality-bar 가 우려한 '종료일<시작일 → silent empty' 는 이 화면에 없다**(재검증 완료). **목록의 기간 필터**: 표면 자체가 없다 — 툴바에 상태 select + 키워드뿐 | 폼에서 시작 2026-07-31 · 종료 2026-07-01 입력 후 제출 → **빈 테이블이 아니라** 인라인 검증 에러 '종료일은 시작일보다 빠를 수 없습니다.' + 두 칸 `aria-invalid` | **pass** (기간 입력 축) · **미충족 축**: ① preset('오늘/최근 7일/이번 달/지난 달') 없음 ② 선택 범위 URL 반영 없음(IA-13) ③ **목록에 기간 필터 자체가 없다** — appliesTo('기간 필터 리스트')가 성립하지 않아 그 축은 N/A |
| COMP-12 | P2 | 설명만 실시간 카운터(`TextareaField.tsx:52` — `${value.length}/${maxLength}`). 이벤트명(80자) · 대상(60자) · 혜택 상세 · 배너명에는 없다. 대상은 `maxLength` 속성조차 없어 초과 입력이 제출에서 처음 막힌다 | 이벤트명 80자 근접 → 경고·카운트 없이 조용히 입력이 멈춘다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: write 성공=toast · read 실패=인라인 Alert · 다이얼로그 내부 실패=그 다이얼로그 배너(`useCrudList.tsx:111`) · 저장 실패=폼 카드 배너 | FS-031 §4.1 '실패 통지의 자리' 6분기 확인 | pass |
| FEEDBACK-03 | P1 | 삭제 성공 toast(`useCrudList.tsx:107`)·실패 배너(`:111`) / 일괄 성공 toast(`:145`)·부분 실패 배너(`:138-140`) / 저장 성공 toast(`useCrudForm.ts:215`)·실패 배너(`:188`). no-op 없음 | `?fail=marketing-events:<op>` 각 op 이 사용자 가시 실패를 낸다 | pass |
| FEEDBACK-05 | P2 | 모든 delete 가 `ConfirmDialog` 로 게이트(비가역성 고지 '이 작업은 되돌릴 수 없습니다.'). undo window 는 없다 | 단일 미확인 클릭 delete 0건 | pass |
| A11Y-03 / A11Y-04 | P1 | 표면: 삭제·일괄 삭제 `ConfirmDialog`. 초기 포커스·busy 시 포커스 유지는 DS 소유 | DS 판정 | 종속 |
| A11Y-05 | P1 | **N/A** — 이 화면의 `SelectField` 2종(상태·혜택 유형)은 error 를 받지 않는다(고정 enum + 기본값이라 위반이 성립하지 않는다). `isInvalid` 표면이 없다 | — | N/A |
| A11Y-08 | P1 | 행 클릭(`CrudTable.tsx:172` `rowActivateProps`)은 **마우스 전용**이지만, 같은 행 안의 `RowActions` 연필 버튼(`:192-197`)이 **동일 목적지**(`onEdit(item)`)로 가는 keyboard-focusable 등가물이다 | 행을 Tab → 연필 버튼에 포커스 → Enter → 수정 폼(행 클릭과 동일) | pass |
| A11Y-13 | P1 | submit 실패 시 첫 error 포커스 ✓ — `useCrudForm.ts:253` 이 `handleSubmit(onValid, onInvalid)` 로 `onInvalid` 를 **계약으로 고정**하고 RHF `shouldFocusError` 기본값이 포커스를 옮긴다. 422 서버 거절도 `:184` `setFocus`. **폼 진입 시 첫 필드 자동 포커스는 없다** — `FormPageShell` 에 `autoFocus`·`setFocus` 배선 0건 | 빈 required 제출 → `activeElement` = 이벤트명 input ✓. `/new` 진입 직후 → `activeElement` = `<body>` ✗ | 부분 gap (진입 포커스) |
| A11Y-16 | P1 | `CrudListShell.tsx:107-109` 가 **항상 마운트된** polite live region 을 소유하고 목록 상태 한 줄을 주입한다(`announcementOf` — 최초 로드 중 침묵) | 필터로 0행 전환 → '조건에 맞는 이벤트 결과가 없습니다.' announce | pass |
| IA-03 | P1 | breadcrumb 없음 — `AppHeader.tsx` 가 단일 라벨만 그린다 | `/marketing/events/new` 에 '마케팅 관리 > 이벤트 > 등록' trail 부재 | gap (앱 전역) |
| IA-07 | P1 | `FormPageShell.tsx:147-155` — '목록으로' + `ChevronLeftIcon`, 좌상단, 단일 element 타입 | 문구·아이콘·위치 일치 | pass |
| IA-08 | P1 | `FormPageShell.tsx:179-191` — `justifyContent: 'flex-end'`, 취소(secondary) 좌 · 저장(primary) 우, **in-card** 고정 | 배치 일치 | pass |
| IA-14 | P1 | 반응형 계약 미선언 — 지원 viewport·sidebar collapse·wide table 가로 scroll·touch-target 규정 없음 | 768px/375px 에서 미검증 | gap (앱 전역) |
| ERP-01 | P1 | `_shared/campaign.ts:39-47` 의 `PHASE_TONE` = `{upcoming:'info', ongoing:'success', ended:'neutral'}` 가 **마케팅 섹션 공용** 레지스트리다(이벤트·프로모션 공유). per-page helper 보다 낫지만 **앱 전역 단일 소스가 아니다** — 다른 섹션의 '진행중'(견적·문의·배송)이 다른 tone 일 수 있다 | 같은 semantic state 가 섹션마다 다른 색으로 렌더되는지 교차 확인 | gap (부분 — 섹션 스코프 존재, 전역 미통합) |
| ERP-04 | P1 | sortable header 없음 — 정렬이 `sortEvents`(`types.ts:54-59`) 고정(시작일 내림차순) | 헤더 클릭·`aria-sort` 0건 | gap |
| ERP-06 | P1 | microcopy 표준 문서 부재. 이 화면의 문구는 대체로 '…습니다' 존댓말로 일관되나 포맷 일부가 인라인(아래 ERP-08) | 표준 문서 부재 | gap (앱 전역) |
| **ERP-08** | **P2** | 기간 셀이 저장 문자열을 그대로 잇는다(`EventListPage.tsx:96` — `` `${item.startAt} ~ ${item.endAt}` ``) — `shared/format` 경유가 아니다. 다만 저장값이 이미 `YYYY-MM-DD` 라 변환이 불필요해 **실질 위반은 아니다**. 건수는 `formatNumber` 경유 ✓ | 셀에 raw `toString()` 0건 | pass (경미 — 포맷 함수 미경유이나 값이 이미 표시 형식) |
| **ERP-09** | **P2** | **`EventListPage.tsx:72` 의 `const today = formatDate(new Date())` 가 브라우저 로컬 TZ 기준이다** — `format.ts:21` 의 `formatDate` 는 `getFullYear`/`getMonth`/`getDate` 로컬 getter 를 쓴다. 이 `today` 가 `derivePhase(startAt, endAt, today)`(`campaign.ts:50-54`)의 비교 기준이 되어 **'기간상 XX' 배지를 결정**한다. 표시 TZ 정책 없음 | 같은 이벤트(종료일 2026-07-16)를 서울(UTC+9) 관리자와 UTC 관리자가 07-17 00:30 KST 에 본다 → 서울은 `today='2026-07-17'` → '기간상 종료' 배지, UTC 는 `today='2026-07-16'` → 배지 없음. **같은 데이터에 다른 판정** | **gap** (F1 지적 재확인 완료 — F2 에서도 그대로) |
| **ERP-13** | **P1** | 사용자 대상 문구가 리터럴 조사 폴백형을 출하한다: `useCrudForm.ts:215` `` `${entityLabel}을(를) ${verb}했습니다.` `` → **'이벤트을(를) 등록했습니다'**('이벤트'는 받침 없음 → '이벤트를' 이어야 한다). `useCrudList.tsx:107,157` · `FormPageShell.tsx:128-129` · `crud/validation.ts:14`(→ '이벤트명을(를) 입력하세요') 도 동일. **`Empty.tsx:16-24` 에는 `subjectParticle`(이/가) 헬퍼가 있으나 목적격(을/를) 헬퍼가 `shared/format` 에 없다** | 등록 성공 토스트 = '이벤트을(를) 등록했습니다.'. 사용자 대상 문자열의 `'을(를)'` grep > 0 | gap (앱 전역) |
| ERP-14 | P1 | **N/A** — 이 화면에 사업자번호·전화번호·금액·마스킹 대상 필드가 없다. 기간은 네이티브 `<input type="date">` 라 마스킹이 불필요하다. 혜택 상세('3,000 적립금')는 **자유 텍스트이지 금액 필드가 아니다**(BE-031 §7.2 — 어떤 혜택도 발급되지 않는다) | — | N/A · **NFR-032 는 이 항목이 gap 이다**(할인값·최소주문금액) |
| ERP-15 | P1 | 대형 list 계약 없음 — cap·virtualization 없이 전량 렌더(IA-04 와 동근) | 1,000행 시 scroll/selection 미검증 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 앱 전체 0건. `shared/async.wait()` 에 천장이 없다 | never-resolving fixture → 무한 스피너 | gap (앱 전역) |
| EXC-06 | P1 | `HttpError` 가 status 를 싣고(`http-error.ts:20-30,56`) `?status=<op>:<code>` 로 재현 가능하며, **404**(`useCrudForm.ts:141`) · **409/412**(`:160`) · **422**(`:176`) · **401**(`queryClient.ts:39`)은 각기 다른 surface 로 간다. 그러나 **403 · 429 · 400 은 전용 분기가 없어** 일반 실패 배너로 수렴한다 | `?status=list:403` → '이벤트 목록을 불러오지 못했습니다.'(권한 메시지 아님). `?status=save:429` → '저장하지 못했습니다.'(backoff 안내 없음) | 부분 gap |
| EXC-07 | P1 | `useCrudForm.ts:176-186` 이 422 `violations` 를 `setError(field)` + `setFocus(first)` 로 매핑하고 client zod 와 같은 인라인 슬롯을 재사용한다. **배선은 완전하나 픽스처가 `violations` 를 만들지 않아** 현재 재현 경로가 없다(`dev.ts` 의 422 는 빈 `violations`) | 서버 연동 후 `error.fields` 있는 422 → 해당 필드 인라인 + 포커스 | pass (배선) · 재현 불가 |
| EXC-10 | P1 | `settleAll` 이 **실패 건수만** 반환한다(`crud.ts:235-236` · `useCrudList.tsx:135-141`). 실패 id 미반환 → '실패분만 재시도' 불가, 재시도는 전량 재발사 | 3건 중 1건 실패 → 'N건 중 M건' 배너 + 선택 유지 ✓, 그러나 어느 행인지 모름 ✗ | gap |
| EXC-11 | P1 | `navigator.onLine` 앱 전체 0건 | offline 토글 → 배너 없음 | gap (앱 전역) |
| EXC-12 | P1 | `useCrudForm.ts:138-143` 이 `isNotFound` 로 `'not-found'` / `'error'` 를 가르고, `FormPageShell.tsx:115-143` 이 **404 → '찾을 수 없습니다' + '목록으로'만**(재시도 없음) / **error → '다시 시도' + '목록으로'** 로 렌더한다. 무한 스피너 없음 | `/marketing/events/nope/edit` → not-found surface(재시도 버튼 부재). `?status=detail:500` → retry + list | pass |
| EXC-14 | P1 | **N/A** — 이 화면에 optimistic write 가 없다. 인라인 토글·재정렬이 없고 저장·삭제는 confirm + busy 의 비관적 경로다(quality-bar 가 create/delete 에 요구하는 그대로) | — | N/A |
| EXC-15 | P1 | **N/A** — **이 화면에 파일 업로드·이미지 필드가 없다.** `ImageUploadField` import 0건, 목록에 이미지 열 없음(`EventListPage.tsx:4` 주석). '배너 연동' 은 배너 **이름 문자열**이지 이미지가 아니다. 따라서 `data-source.ts` 에 업로드 심이 없는 것은 누락이 아니라 **정합한 상태**다 (BE-031 §7.8 — 후속 도입 시 `blob:`/`data:` 스킴 거절을 계약할 것) | — | N/A |
| EXC-18 | P1 | `toggleAll` 이 **보이는 행 id 만** 받아(`CrudListShell.tsx:143-147`) selection scope 가 'current view' 로 암묵 정의된다. cross-page 'all' 이 없어 대량 오클릭 위험은 낮다. 그러나 **Shift-click range 없음 · 임계값 강화 confirm 없음 · progress/cancel 없음** | 50행 선택 → 체크박스 50회 클릭. 대량 삭제 시 진행률·취소 부재 | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 스냅샷 없음. 401 인터셉터가 **프로그램적으로** 이동하므로 FEEDBACK-04 가드가 발화할 수 없다. 만료 전 연장 프롬프트도 없음 | 이벤트 작성 중 401 → 입력 전량 소실 | gap (앱 전역) |
| EXC-20 | P1 | 저장 실패는 참조 코드 표시 ✓(`useCrudForm.ts:189` `referenceOf(cause)` → `FormPageShell.tsx:167` `FormServerError`). raw body/stack 미노출 ✓. 그러나 **목록 조회 실패 배너**(`CrudListShell.tsx:159`)와 **삭제 실패 배너**(`useCrudList.tsx:111`)는 참조 코드를 버린다 | `?status=save:500` → 참조 코드 표시 ✓. `?status=list:500` → 코드 없음 ✗ | 부분 gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 |
|---|---|---|
| 목록 첫 렌더(스켈레톤 등장) | ≤ 100ms | 라우트 청크 로드 후 즉시 — `EventListPage` 는 `App.tsx:98` 에서 **정적 import**(lazy 아님) |
| 목록 데이터 표시(p95) | ≤ 600ms (서버 연동 후) | **측정 불가** — 픽스처가 `LATENCY_MS = 400` 을 무조건 기다린다 |
| 저장 왕복(p95) | ≤ 800ms | 픽스처 400ms + 목록 무효화 재조회 400ms = **약 800ms**(응답 본문을 버리고 재조회하므로 왕복 2회 — BE-031 §7.10) |
| 재조회 횟수 | 진입 1회 + 쓰기당 1~2회 | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts:24,64,74`)로 상한이 잡힌다. **검색·필터는 재조회를 유발하지 않는다**(클라이언트 필터) |
| 검색 입력당 연산 | — | **자모당 1회 전량 재필터**(`searchEvents` + `filterEvents`) + `clear()` 리렌더 — 디바운스 없음(COMP-10 gap). 현재 픽스처 3건이라 무해하나 수천 건에서 입력 지연이 된다 |
| DOM 행 수 | 페이지당 ≤ 50 | **상한 없음** — 전량 렌더(IA-04 gap · ERP-15 gap) |
| 메모리 | — | 이벤트 전량이 react-query 캐시 + `useMemo` 파생 배열 2개(`filterEvents` → `searchEvents`)로 상주 |
| 번들 | — | 이 화면 고유 의존성 없음 — 전부 공용(`shared/crud` · `@tds/ui`) |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 하려고 픽스처에 넣은 인위적 대기다. 위 '현재' 열의 400ms·800ms 는 **실제 성능이 아니라 픽스처 상수**이며, 백엔드 연결 시 이 상수는 사라진다. 실 예산은 서버 연동 후 재측정한다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 배너 + 재시도 | 충족(STATE-02 pass) — **단 참조 코드 없음**(EXC-20 부분 gap) |
| 상세 404(삭제된 id 로 진입) | not-found surface + '목록으로', 재시도 권유 금지 | 충족(EXC-12 pass) |
| 저장 중 서버 5xx | 배너 + 참조 코드, 입력 보존 | 충족(EXC-20 pass) |
| 저장 중 409(대상 삭제됨) | 충돌 다이얼로그, 입력 보존, 유령 저장 금지 | 충족(EXC-04 부분) |
| **동시 수정(A·B 동시 저장)** | 나중 저장이 409/412 로 거절 | **미충족 — 마지막 저장이 조용히 이긴다**(EXC-04 gap · BE-031 §7.3) |
| 네트워크 단절 | 오프라인 배너 + 쓰기 게이팅 | 미충족(EXC-11 gap) |
| 서버 무응답(행업) | 클라이언트 타임아웃 후 재시도 안내 | **미충족 — 상한 없음**(EXC-05 gap). 픽스처 400ms 에 가려져 있다 |
| 세션 만료(편집 중) | 재인증 후 입력 복원 | 부분 — 재인증 경로는 충족(EXC-02), **입력은 소실**(EXC-19 gap) |
| 화면 렌더 예외 | 셸 유지 + 복구 UI | 충족(EXC-01 — AppShell Outlet 경계) |
| 일괄 삭제 중 일부 429 | 실패분 식별 + 그것만 재시도 | 미충족 — 건수만 보고(EXC-10 gap · BE-031 §7.5) |
| 브라우저 새로고침 | 목록 조회 상태 복원 | **미충족 — 필터·검색어 소실**(IA-13 gap) |

### 4.3 데이터 보존 · 감사

| 항목 | 현재 상태 |
|---|---|
| 변경 이력 | **없다.** `MarketingEvent` 에 `createdAt`·`updatedAt`·`createdBy`·`updatedBy` 가 없다(`types.ts:7-23`). 누가 언제 이벤트를 바꿨는지 추적할 수 없다 |
| 삭제 | **하드 삭제.** soft-delete·undo window 없음(FEEDBACK-05 는 confirm 으로 충족하나 복구 수단은 없다) |
| 감사 로그 | 서버 계약에 없다 — BE-031 이 규정하지 않았다. **이벤트는 고객 대면 자산이므로**(혜택·기간 변경이 곧 비용) 후속에서 감사 로그를 검토할 것 |
| 픽스처 휘발성 | **새로고침하면 모든 변경이 사라진다** — 어댑터가 브라우저 메모리 배열이다. 이는 백엔드 부재의 결과이며 결함이 아니다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | COMP-10 | **P0** | 검색 입력에 IME 조합·디바운스 처리 없음 — 공용 `useDebouncedSearch` 미소비. 자모마다 재필터 + 행 선택 해제 | 앱 전역(공용 훅은 있으나 소비자가 members 뿐) | A11 change_request |
| 2 | IA-02 | **P0** | 하위 라우트가 브랜치 라벨('마케팅 관리')로 폴백 + h1 2개. F2 의 AppHeader 수정은 TOKEN-05 였고 라벨 로직은 그대로 | 앱 전역(`AppHeader`·`findNavLabel`) | A11 change_request |
| 3 | IA-04 | **P0** | Pagination 부재 — 전량 렌더. 이벤트 수 상한 없음 | 앱 전역(`CrudListShell`) | A11 change_request |
| 4 | IA-13 | **P0** | 목록 조회 상태가 URL 에 없음 — 공용 `useListState` 미소비. F5·Back·링크 공유로 복원 불가 | 앱 전역(공용 훅은 있으나 소비자가 members 뿐) | A11 change_request |
| 5 | EXC-03 | **P0** | 쓰기 컨트롤 권한 게이팅 없음 — `useRouteWritePermissions` 소비자 0건. 읽기 게이팅은 충족 | 앱 전역 | A11 change_request |
| 6 | EXC-04 | **P0** | 낙관적 동시성 토큰 부재 — `updatedAt`/`version` 필드가 없어 '먼저 수정' 미감지(last-write-wins). '먼저 삭제'(409)만 잡는다 | 이 화면 + 서버 계약 | A63 (**BE-031 §7.3**) · A41(`types.ts`·어댑터) |
| 7 | COMP-01 | P1 | 공용 폼 셸의 '목록으로' 가 DS Button 아님 + 수기 '저장 중…' | 앱 전역(`FormPageShell`) | A11 change_request |
| 8 | COMP-12 | P2 | 이벤트명·대상에 카운터 없음. 대상은 `maxLength` 속성도 없음 | 이 화면 | A11 change_request |
| 9 | IA-03 | P1 | breadcrumb 부재 | 앱 전역 | A11 change_request |
| 10 | IA-14 | P1 | 반응형 계약 미선언 | 앱 전역 | A11 change_request |
| 11 | ERP-01 | P1 | status→tone 이 마케팅 섹션 스코프 — 앱 전역 단일 레지스트리 아님 | 앱 전역 | A11 change_request |
| 12 | ERP-04 | P1 | sortable header 부재 — 정렬 고정 | 앱 전역(`CrudTable`) | A11 change_request |
| 13 | ERP-06 | P1 | microcopy 표준 문서 부재 | 앱 전역 | A11 change_request |
| 14 | **ERP-09** | P2 | **`derivePhase` 기준일이 브라우저 로컬 TZ** — 타임존이 다른 관리자가 같은 이벤트에 다른 '기간상 XX' 배지를 본다. 표시 TZ 정책 없음 | 이 화면 + `shared/format` | A40 · A63 (**BE-031 이관 #13**) |
| 15 | **ERP-13** | P1 | 리터럴 '을(를)' 출하 — '이벤트을(를) 등록했습니다'. 목적격 조사 헬퍼 부재 | 앱 전역(`shared/format`·`useCrudForm`·`useCrudList`·`FormPageShell`·`crud/validation`) | A11 change_request |
| 16 | ERP-15 | P1 | 대형 list 렌더 계약 부재(cap·virtualization) | 앱 전역 | A11 change_request |
| 17 | EXC-05 | P1 | 클라이언트 타임아웃 상한 부재 | 앱 전역 | A11 · A63 (**BE-031 §2** 서버 상한 5초) |
| 18 | EXC-06 | P1 | 403·429·400 전용 surface 부재 — 일반 실패로 수렴 | 이 화면 + 공용 셸 | A11 (**BE-031 §7.7**) |
| 19 | EXC-10 | P1 | 일괄 삭제가 실패 id 미반환 — 실패분만 재시도 불가 | 앱 전역 + 서버 계약 | A11 · A63 (**BE-031 §7.5**) |
| 20 | EXC-11 | P1 | 오프라인 감지 부재 | 앱 전역 | A11 change_request |
| 21 | EXC-18 | P1 | Shift-range·임계값 confirm·progress/cancel 부재 | 앱 전역 | A11 change_request |
| 22 | EXC-19 | P1 | 세션 만료 시 dirty 초안 소실 | 앱 전역 | A11 · A63 |
| 23 | EXC-20 | P1 | 조회·삭제 실패 배너에 참조 코드 미표시 | 앱 전역 | A11 (**BE-031 §7.12**) |
| 24 | A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스 없음(submit 실패 포커스는 충족) | 앱 전역(`FormPageShell`) | A11 change_request |
| 25 | COMP-07 | P2 | `SeqCell seq={index + 1}` — 페이지 오프셋 미반영. **IA-04(#3) 해소 시 즉시 위반** | 앱 전역(`CrudTable`) | A11 (#3 과 함께) |

> **BE-031 §7 로 가는 것**(서버 계약이 선행돼야 하는 것): #6(§7.3 version/If-Match) · #14(이관 #13 TZ) · #17(§2 타임아웃) · #18(§7.7 · §7.13) · #19(§7.5 일괄) · #23(§7.12 traceId). 나머지는 프론트 단독 해소 가능.
>
> **FS-031 §7 미결 사항과의 대응**: FS #2→gap1 · FS #3→gap2 · FS #4→gap5 · FS #5→gap3/12/16 · FS #6→gap25 · FS #7→gap14 · FS #8→gap18 · FS #9→gap15 · FS #10→gap19/21 · FS #11→gap7 · FS #12→gap8 · FS #13→BE-031 §7.6 · FS #14→BE-031 §7.2 · FS #15→gap6 · FS #16→gap22 · FS #17→COMP-09 · FS #18→gap20 · FS #19→gap17 · FS #20→gap4.

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래는 판정을 재현·검증할 때 쓸 실제 스위치이며, 코드(`shared/crud/dev.ts` · `events/data-source.ts:57`)에서 확인한 것만 적는다.

| 스위치 | 형식 | 이 화면의 실제 값 |
|---|---|---|
| 실패 재현 | `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all` | **scope = `marketing-events`** (`data-source.ts:57`). **op = `list`**(`fetchAll`) · **`detail`**(`fetchOne`) · **`save`**(`create` **와** `update` 공용 — `crud.ts:61,66`) · **`delete`**(`remove`). 예: `?fail=marketing-events:save` · `?fail=list` · `?fail=all` |
| status 재현 | `?status=<op>:<code>` · `?status=all:<code>` | 재현 가능 status: **400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500**(`dev.ts:27-37`). 예: `?status=save:409`(충돌 다이얼로그) · `?status=detail:404`(not-found surface) · `?status=list:403` · `?status=save:500`(참조 코드) |
| 지연 재현 | — | **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고, 이 어댑터는 `LATENCY_MS = 400` 상수만 무조건 기다린다. (`?delay=` 는 `pages/dashboard/api.ts`·`pages/members/data-source.ts` 전용이다) |

| 판정 대상 | 재현 절차 |
|---|---|
| STATE-01 | 진입(스켈레톤만) → 삭제 후 재조회(이전 행 유지 확인) → `?fail=marketing-events:list`(배너만) |
| STATE-02 | `?fail=marketing-events:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건 |
| EXC-04 | `?status=save:409` → 입력 보존 + 충돌 다이얼로그 + 성공 토스트 0건. **동시 수정 gap 은 스위치로 재현 불가** — 두 탭 수동 재현 필요 |
| EXC-08 | 등록 폼 Enter 연타 → 요청 1건. `?fail=marketing-events:save` 후 재클릭 → 같은 멱등키 |
| EXC-09 | `?fail=marketing-events:delete` 없이 삭제 확인 → 응답 전 Esc → 토스트 0건 |
| EXC-12 | `/marketing/events/nope/edit` → not-found(재시도 버튼 부재). `?status=detail:500` → retry + list |
| EXC-20 | `?status=save:500` → 참조 코드 ✓ / `?status=list:500` → 코드 없음 ✗ |
| COMP-11 | 폼에 시작 2026-07-31 · 종료 2026-07-01 → 제출 → 인라인 에러(빈 테이블 아님). `pnpm vitest events.test.ts` 가 이를 고정 |
| COMP-10 · IA-13 · IA-04 · IA-02 · EXC-03 | **스위치 없음 — 코드 부재가 곧 판정이다.** grep 으로 확인: `useDebouncedSearch`·`useListState`·`useRouteWritePermissions` 의 이 화면 소비 0건, `CrudListShell` 에 Pagination 0건, `AppHeader.tsx:92` 가 `findNavLabel` 단독 |

| 단위 테스트 | 범위 |
|---|---|
| `events.test.ts` | 순수 규칙(필터·검색·정렬·변환) + `eventSchema` 검증 5건 — 기간 역전(`:74-78`) · 혜택 상세 · 배너명 · 이벤트명 필수 |
| `CrudTable.test.tsx` · `useListState.test.tsx` · `useDebouncedSearch.test.tsx` | 공용 프레임워크(이 화면이 소비하는 것은 `CrudTable` 뿐) |

## 7. 자기 점검 (제출 전 확인)

- [x] quality-bar 요구 문구를 **복제하지 않았다** — ID 로만 참조하고 '이 화면에서 어떻게 / 무엇을 재현하면' 만 적었다
- [x] §2 P0 **30행 전수**. 순서는 quality-bar 지정 순서(`STATE-01`…`EXC-09`)를 따랐다. 빈칸 0건
- [x] 모든 `N/A` 에 사유를 적었다 — FEEDBACK-06(폼 담은 modal 부재) · A11Y-12(필터 토글 부재) · A11Y-05 · ERP-14 · EXC-14 · EXC-15(이미지 필드 부재)
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 달았다
- [x] 모든 `gap` 에 **재현 가능한 측정 기준**을 달았다. 재현 불가한 gap(EXC-04 동시 수정)은 그 사실을 명시했다
- [x] §2.1 산수 검산 — 11 + 11 + 2 + 6 = **30** ✓ / 차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓
- [x] §3 은 **표면이 실재하는 것만** 골랐다. 표면이 없는 P1/P2(ERP-07 금액 단위 · ERP-10 print · ERP-11 배송 · ERP-12 export · MOTION-04/05 · IA-09/10/11/12 · TOKEN-06~13 · COMP-05/06/08 · A11Y-09/10/14/15 · EXC-13/16/17)는 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`marketing-events`)·op 목록(`list`·`detail`·`save`·`delete`)을 **코드에서 확인**해 적었다. **`?delay=` 를 쓰지 않았고** 그것이 이 화면에 없다는 사실을 명시했다. 'E2E 미실행 — 판정 근거는 코드 대조' 를 명시했다
- [x] F2(`3cd3078`) 기준으로 재검증했다 — v1 이 gap 으로 적었던 STATE-01 · EXC-08 · EXC-02 · EXC-12 · A11Y-13(포커스) · STATE-05 · EXC-04(유령 저장)는 **F2 에서 뒤집혀 pass** 다. v1 판정을 재사용하지 않았다
- [x] §5 가 FS-031 §7 · BE-031 §7 과 상호 참조된다(§5 말미 대응표)
