---
id: NFR-037
title: "예약 관리 비기능 명세"
functionalSpec: FS-037
backendSpec: BE-037
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-037. 예약 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-037 예약 관리 (`/reservations` · `/reservations/new` · `/reservations/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-037(요소·예외) · BE-037(엔드포인트·서버 판정). 이 문서의 §5 gap 은 FS-037 §7 · BE-037 §7.8 과 **같은 사안을 같은 번호 체계로** 가리킨다 |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 §2 판정을 다시 돌린다. 이 화면의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다. **판정을 근거 없이 유지하지 않는다** |
| 판정 기준일 | 2026-07-17 · `HEAD = 3cd3078` |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크(`shared/crud` 등)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서/DS 에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 목록이 `useCrudList` 를 쓰고 그것이 스켈레톤 조건을 `firstLoading = isFetching && data === undefined` 로 파생한다(`shared/crud/useCrudList.tsx:71-72`). `CrudListShell.tsx:139` 가 `loading={firstLoading}` 로만 표를 스켈레톤화하고, 재조회는 `refreshing` 으로 요약 줄에만 표시한다(`CrudListShell.tsx:118-122`). 폼도 `loadingDetail = isEdit && isFetching && data === undefined`(`useCrudForm.ts:130`). **이 화면은 `useCrudList` 를 우회하는 자체 `useQuery` 를 갖지 않는다**(`ReservationListPage.tsx:73-79`) | `/reservations` 진입 → 표 본문만 5행 스켈레톤(빈 상태 문구 없음). 데이터가 있는 상태에서 30초 경과 후 재조회 → **표가 스켈레톤으로 바뀌지 않고** 요약에 '· 새로고침 중…'만 붙는다. `?fail=reservations:list` → error Alert만(스켈레톤·빈 상태 없음). 0건 필터 → Empty만 | pass |
| STATE-02 | STATE | 직접 | 목록 조회 실패 시 `CrudListShell.tsx:156-165` 가 표·요약·선택 바 대신 `<Alert tone="danger">` + '다시 시도'(`controller.refetch`)를 렌더한다 — 토스트가 아니고 빈 상태 폴백도 아니다. 상세 조회 실패는 `FormPageShell.tsx:122-142` 가 같은 규칙으로(danger Alert + 복구 컨트롤) 그린다 | `/reservations?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. `/reservations/rsv-1/edit?fail=detail` → 폼 대신 danger Alert | pass |
| STATE-04 | STATE | 직접 | **(b) 선택 리셋**: `ReservationListPage.tsx:81-83` 이 `useEffect(() => { clear(); }, [filter, keyword, clear])` 로 검색어·상태 필터가 바뀌면 행 선택을 전부 해제한다. **(a) page clamp**: 이 화면에 페이지네이션이 없어(FS-037 §7 #2) 범위를 벗어날 page 자체가 존재하지 않는다 — clamp 대상이 없다. 페이지네이션 부재 자체는 **IA-04 로 이관**하며 여기서 중복 계상하지 않는다 | 행 3건 선택 → 상태 필터를 '확정'으로 변경 → 선택 바가 사라진다(0건 선택). 검색어 입력 → 동일. **clamp 축은 재현할 표면이 없다** — 페이지네이션이 도입되면 이 판정을 다시 돌린다 | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 파일의 스타일 객체가 전부 `var(--tds-*)` 를 참조한다 — `ReservationListPage.tsx:34-64`(toolbar·filters·selectWrap·when·statusCell), `ReservationFormPage.tsx:44-57`(row·conflictList). 하드코딩 hex · `[1-9]px` 리터럴 · `border/outline: thin|medium|thick` 0건. `calc(var(--tds-space-6) * 5)` 같은 배수 해킹은 있으나(TOKEN-08 의 사안) 토큰 참조다 | 두 파일에 `#`hex · px 리터럴 · bare border 키워드 grep = 0. lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 폼 입력 7종·textarea 2종(`ReservationFormPage.tsx` 의 `className="tds-ui-input tds-ui-focusable"`) · `FormPageShell.tsx:149` 의 '목록으로' 버튼 · DS `Button`/`SearchField`/`SelectField`/`RowActions`/체크박스 — 이 전부가 DS 의 `tds-ui-focusable` 계약을 상속한다. 이 화면은 자체 `:focus-visible` 규칙을 선언하지 않는다 | 판정은 DS(`packages/ui`)·`app-shell.css` 소유 문서를 따른다. 이 화면에서는 '포커스 링을 자체 선언하지 않는다'만 확인(grep `outline` = 0) | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면에 **자체 `animation`/`transition` 선언이 0건**이다. easing 토큰을 소비하는 표면은 이 화면이 띄우는 Toast(저장·삭제 성공)와 ConfirmDialog(삭제·충돌)뿐이며 둘 다 DS 소유다 | 판정은 tokens codegen · `Toast.css` 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating/overlay 표면 — ConfirmDialog(FS-037-EL-011·EL-012·EL-034) · Toast · 폼 `Card` — 이 전부가 DS 소유다. 이 화면은 `box-shadow` 를 선언하지 않는다 | 판정은 DS(Card/Modal/Toast) 소유 문서를 따른다. 이 화면에서 `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 폼의 `<h1>` 이 공유 `pageTitleStyle`(title.xl tier)에서 온다 — `FormPageShell.tsx:159`. AppHeader 의 `<h1>` 도 같은 토큰(`AppHeader.tsx:52-55`). **이 화면은 자체 titleStyle 을 선언하지 않는다.** 목록 화면에는 in-content `<h1>` 이 없다 | 판정은 tokens typography · `pageTitleStyle` 소유 문서를 따른다. ⚠ **이 화면에 `<h1>` 이 둘이라는 사실은 tier 문제가 아니라 IA-02 문제다** — 아래 IA-02 참조 | 종속 |
| COMP-10 | COMP | 직접 | **미충족.** 공용 `useDebouncedSearch`(`isComposing` + `compositionstart/end` + 250ms 디바운스 + 조합 중 Enter 차단)가 있는데 이 화면은 쓰지 않는다 — `ReservationListPage.tsx:71` 이 `const [keyword, setKeyword] = useState('')`, `:129-134` 가 `<SearchField value={keyword} onChange={setKeyword} />` 로 직결한다. `SearchField` 자체에도 composition 처리가 없다(`packages/ui`·`shared/ui` 에서 `isComposing` grep = 0). 소비 화면은 `pages/members` 둘뿐이다 | `/reservations` 검색창에 IME 로 '홍길동' 입력 → 자모 단계('ㅎ'→'호'→'홍'→'홍ㄱ'→…)마다 `searchReservations` 가 전량을 다시 훑고 표가 재렌더된다. **중간 단계에서 0건이 되면 Empty 가 번쩍이고**, `CrudListShell.tsx:107-109` 의 live region 이 '조건에 맞는 예약 결과가 없습니다' → '예약 1건을 찾았습니다' 를 자모마다 announce 한다. 조합 중 Enter 가 차단되지 않는다. **BE-037-EP-01 이 서버 검색으로 확장되면 그 즉시 자모마다 요청이 나간다** | **gap** |
| FEEDBACK-02 | FEEDBACK | 상속 | 이 화면의 파괴적 액션은 삭제 둘뿐이고(단건·일괄) **둘 다 `useCrudList` 가 소유한다** — `useCrudList.tsx:151-178` 이 `intent="delete"` ConfirmDialog 를 `busy`(진행 중 확인 버튼 잠금) · `error`(실패 시 다이얼로그 유지 + 배너) · `onCancel`(abort + `reset`) 과 함께 렌더한다. **이 화면에 `useCrudList` 를 우회하는 파괴적 액션이 없다**는 것이 이 종속의 전제이며, 코드로 확인했다(`ReservationListPage.tsx:73-79` 외에 mutation 호출 없음) | `?fail=reservations:delete` 로 삭제 → 다이얼로그가 열린 채 error 배너, 재클릭이 retry. 진행 중 취소 → 토스트 없이 버튼 상태 복원. 판정은 `useCrudList`·`ConfirmDialog` 소유 문서를 따른다 | 종속 |
| FEEDBACK-04 | FEEDBACK | 상속 | 폼이 `FormPageShell` 을 쓰고 그것이 `useUnsavedChangesDialog(isDirty && !saving, { message })` 를 배선한다(`FormPageShell.tsx:113`). `isDirty` 는 RHF 소유(`useCrudForm.ts:254`). 이 화면은 문구만 준다(`ReservationFormPage.tsx:37-38`) | dirty 폼에서 탭 닫기 · 사이드바 링크 · 브라우저 Back → discard 다이얼로그. 저장 성공 후 같은 이동은 프롬프트 없이 통과. 3경로 판정은 `useUnsavedChangesDialog` 소유 문서를 따른다 | 종속 |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 편집 가능한 폼을 담은 modal 이 없다.** 등록·수정은 전용 라우트(`/new`·`/:id/edit`)의 페이지 폼이고(IA-06 의 무게 규칙에 맞다 — 예약은 12필드 rich 엔티티), 이 화면의 modal 3종(단건 삭제·일괄 삭제·저장 충돌)은 전부 `ConfirmDialog` 로 **입력 필드를 갖지 않는다** — dirty 상태가 존재하지 않으므로 가드할 대상이 없다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | 이 화면이 토스트를 띄운다 — 삭제 성공(`useCrudList.tsx:107,145`) · 저장/등록 성공(`useCrudForm.ts:215`). 그 announce 는 `ToastProvider` 의 지속 live region 이 담당한다. 이 화면은 자체 토스트 뷰포트를 만들지 않는다 | 판정은 `ToastProvider` 소유 문서를 따른다. 이 화면에서는 '토스트를 `useToast` 로만 띄운다'만 확인 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 다이얼로그 3종(FS-037-EL-011·EL-012·EL-034)이 전부 `ConfirmDialog` 이며 `message` prop 으로 본문을 넘긴다 — `aria-describedby` 배선은 `ConfirmDialog`/`Modal` 소유 | 삭제 다이얼로그 open 시 스크린리더가 `'<고객명> (<예약번호>)' 을(를) 삭제합니다…` 를 읽는다. 판정은 `ConfirmDialog` 소유 문서를 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **부분 미충족.** ① **짝 없는 `aria-invalid` = 0건** — 고객명·연락처·날짜·시각(시작/종료)·인원·예약금 전부 `aria-invalid={errors.x !== undefined}` 와 `aria-describedby={… ? errorIdOf('rsv-…') : undefined}` 를 짝지어 붙인다(`ReservationFormPage.tsx:212-214, 234-236, 249-250, 263-265, 275-276, 307-308, 334-335`). 시작/종료 시각이 같은 오류 id 를 가리키는 것은 **의도**다 — 두 입력이 하나의 `FormField`(htmlFor="rsv-start")와 하나의 오류 `<p>` 를 공유한다. ② **required 가 AT 에 노출되지 않는다** — `FormField` 의 `required` 마커는 `<span aria-hidden="true"> *</span>` 이고(`packages/ui/.../FormField.tsx` 의 `tds-formfield__required`), **호출부가 `required`/`aria-required` 를 컨트롤에 붙이지 않는다.** 필수 7필드(고객명·연락처·방문 날짜·시작 시각·종료 시각·자원 배정·예약 인원·상태) 전부 해당 | ① `/reservations/new` 에서 빈 폼 제출 → 각 입력의 `aria-describedby` 가 `role="alert"` `<p>` 의 id 와 일치(RTL 로 검증 가능). ② **같은 화면에서 어떤 필수 입력도 `required` 속성이나 `aria-required="true"` 를 노출하지 않는다** — 스크린리더 사용자는 별표를 못 보고(aria-hidden) 필수 여부를 제출 전에 알 수 없다 | **gap** |
| A11Y-12 | A11Y | N/A | **이 화면에 좌측 필터 list item(toggle 필터 버튼) 표면이 없다.** 상태 필터는 네이티브 `<select>` 다(`ReservationListPage.tsx:136-152`) — 선택 상태를 `<option selected>` 로 표현하는 폼 컨트롤이지 `aria-pressed`/`aria-current` 로 표현하는 toggle 이 아니다. 이 화면 전용 파일에서 `aria-current` grep = 0 | 재현할 표면 없음 | N/A |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면 = ConfirmDialog 3종. enter/exit transition 은 DS `Modal` 소유이며 이 화면은 자체 애니메이션을 넣지 않는다 | 판정은 `packages/ui/.../Modal` 소유 문서를 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 Toast 표면 = 삭제·저장 성공 토스트. exit 애니메이션은 `ToastProvider` 소유 | 판정은 `ToastProvider`/`Toast` 소유 문서를 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면 전용 파일에 `transition`·`animation`·`transform` 선언이 **0건**이다 — reduced-motion 게이트가 필요한 자체 모션이 없다. 이 화면이 소비하는 모션(Modal·Toast·스켈레톤 pulse)은 전부 DS 소유 | 판정은 전역 Motion config · DS 소유 문서를 따른다. 이 화면에서는 '자체 모션 0건'만 확인 | 종속 |
| IA-01 | IA | 직접 | 네 라우트 전부 `APP_ROUTES` 배열 항목이고(`App.tsx:271,272,283`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:324-341`). **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — `ReservationListPage` 는 `CrudListShell` 을, `ReservationFormPage` 는 `FormPageShell` 을 최상위로 반환한다 | `/reservations` · `/reservations/new` · `/reservations/rsv-1/edit` 진입 → 사이드바·AppHeader·단일 padded `<main>` 이 동일하게 유지된다. 화면이 자체 header/sidebar 를 렌더하지 않는다 | pass |
| IA-02 | IA | 직접 | **미충족.** 제목 소스가 하위 라우트에서 갈라진다. `AppHeader.tsx:92` 가 `findNavLabel(pathname)` 으로 `<h1>` 을 그리는데(`:101`), `nav-config.ts:253-263` 의 `findNavLabel` 은 잎(`collectNavRoutes`)에서 정확히 일치하는 경로만 찾고 없으면 **가지 라벨로 폴백**한다. `/reservations` 는 잎이라 '예약' ✓. **`/reservations/new` · `/reservations/:id/edit` 는 잎이 아니라 가지 라벨 '예약/신청 관리'** 를 받는다(`nav-config.ts:184-189`). 동시에 `FormPageShell.tsx:159` 가 in-content `<h1>예약 등록</h1>` 을 그린다 → **한 문서에 `<h1>` 이 둘이고 그중 위쪽(AppHeader)이 틀린 제목이다** | `/reservations/new` 진입 → AppHeader 에 '예약/신청 관리', 본문에 '예약 등록'. `document.querySelectorAll('h1').length === 2`. quality-bar 의 acceptanceCheck('`/content/notices/new` 의 가시 primary title 이 `공지 등록`')를 이 화면으로 옮기면 **가시 primary title(= 페이지 최상단 h1)이 `예약/신청 관리`** 다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 템플릿의 앞 4단계는 충족한다 — 툴바(검색·필터 좌 / '예약 등록' primary 우상단, `ReservationListPage.tsx:126-160`) → 결과 count 요약(`CrudListShell.tsx:115-123`) → SelectionBar(`:125-133`) → table(`:135-154`). **마지막 단계 Pagination 이 없다.** 예약은 무한 증가하는 트랜잭션 데이터이므로 quality-bar 의 조건('page size 초과 가능')에 명백히 해당한다 — 목록은 어댑터가 준 전량을 렌더한다(`ReservationListPage.tsx:85-88` → `CrudListShell` `visibleItems`) | `/reservations` 에서 예약이 N건이면 `<tr>` 이 N개 렌더된다 — 어떤 N 에서도 페이지 나눔이 없다. `RESERVATION_SEED` 를 500건으로 늘리면 500행이 한 번에 DOM 에 들어가고, 더블부킹 배지(`hasConflict(items, item)`)가 행마다 전량을 훑어 250,000회 비교가 된다 | **gap** |
| IA-05 | IA | 직접 | `/reservations/new` 와 `/reservations/:id/edit` 가 **같은 컴포넌트**로 해석된다 — `App.tsx:272`·`:283` 둘 다 `element={<ReservationFormPage />}`. 레이아웃은 동일하고 `useCrudForm` 이 `useParams().id` 유무로 `isEdit` 를 파생해(`useCrudForm.ts:73-74`) 제목('예약 등록'/'예약 수정')과 prefill 만 가른다(`FormPageShell.tsx:159`). create 전용/edit 전용 페이지가 따로 없다. 라우트 순서도 정적 하위 경로(`/new`·`/applications`·`/consultations`·`/schedule`) 뒤에 `:id/edit` 가 최후로 놓여 `/reservations/new` 가 `:id` 에 먹히지 않는다(`App.tsx:270` 주석의 규칙 준수) | `/reservations/new` 와 `/reservations/rsv-1/edit` 가 같은 필드 배치를 렌더하고 제목·초기값만 다르다. `/reservations/new` 가 '예약 수정'으로 해석되지 않는다 | pass |
| IA-13 | IA | 직접 | **미충족.** 목록 조회 상태(상태 필터·검색어)가 URL 이 아니라 컴포넌트 state 에만 있다 — `ReservationListPage.tsx:70-71` 의 `useState<BookingStatusFilter>` · `useState('')`. 공용 `useListState`(URL 직렬화 + page clamp + 선택 리셋 + IME 검색)가 있는데 소비 화면은 `pages/members` 둘뿐이다. 이 화면에서 `useSearchParams` grep = 0 | `/reservations` 에서 상태 '확정' + 검색 '김' → URL 이 `/reservations` 그대로다(쿼리스트링 없음). F5 → 필터·검색어가 사라진다. 행을 열고(`/reservations/rsv-1/edit`) 브라우저 Back → **필터 없는 초기 목록**에 착지한다. 필터가 걸린 view 의 링크를 동료에게 공유할 수 없다 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell.tsx:484-493` 의 `<Outlet>` 바깥 ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 `App.tsx:311-315` 의 루트 경계가 잡는다. 이 화면은 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다. 이 화면에서는 '자체 경계를 두지 않고 셸 경계에 의존한다'만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx:326` 의 `<RequireAuth>` 가 AppShell **바깥**에서 담당하고, mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache`/`MutationCache` `onError` → `isUnauthorized(cause)` → `notifySessionExpired()` 가 **앱 전체에서 한 곳** 처리한다. 이 화면의 조회·쓰기가 전부 그 캐시를 통과하므로 자동으로 덮인다 | `?status=list:401` → 401 이 쿼리 캐시 onError 를 통과해 재인증 경로가 발화한다. 판정은 `RequireAuth`·`queryClient`·`session-expiry` 소유 문서를 따른다. ⚠ **폼 입력 중 401 이면 입력이 보존되지 않는다**(EXC-19 P1 — §3) | 종속 |
| EXC-03 | EXC | 직접 | **부분 미충족.** ① **read 게이팅은 충족** — `AppShell.tsx:490-492` 가 `<RequirePermission><Outlet/></RequirePermission>` 로 모든 라우트를 덮고, `route-resource.ts:36-46` 이 `/reservations/new`·`/reservations/:id/edit` 를 감싸는 가장 구체적인 잎 `/reservations` 로 해석해 read 권한 없는 deep-link 를 `<ForbiddenScreen/>` 으로 막는다. ② **쓰기 게이팅은 미충족** — `RequirePermission.tsx:45-52` 가 `useRouteWritePermissions()`(canCreate/canUpdate/canRemove/canExport)를 노출하는데 **`apps/admin/src/pages` 전체에서 소비 0건**이다. 이 화면의 '예약 등록'(`ReservationListPage.tsx:155`) · 행 수정/삭제(`CrudTable.tsx:192-197`) · 일괄 삭제(`CrudListShell.tsx:126-132`)가 권한과 무관하게 렌더된다 | ① read 권한을 끈 역할로 `/reservations` deep-link → 403 화면. ② **같은 역할에 create/update/remove 만 끄고 `/reservations` 진입 → '예약 등록' 버튼·행 수정/삭제·일괄 삭제가 그대로 보이고 눌린다.** 서버가 403 을 주면 '저장하지 못했습니다'(FS-037-EL-017)라는 일반 실패로만 보인다 — 강등 reconcile 도 없다 | **gap** |
| EXC-04 | EXC | 직접 | **미충족.** 낙관적 동시성 토큰이 예약 경로에 없다 — `apps/admin/src` 에서 `If-Match` 는 `shared/api/schema.d.ts`(회원 메모 전용, BE-004)와 `http-error.ts` 주석에만 있고 `Reservation` 타입(`_shared/reservation.ts:13-39`)에 `version`/`updatedAt` 이 없으며 `CrudAdapter.update(id, input, signal?)` 시그니처(`crud.ts:20`)에 토큰 자리가 없다. **부분 충족**: `createCrudAdapter.update`(`crud.ts:71-73`)가 대상이 **사라졌을 때** 409 를 던져 유령 저장은 막고, `useCrudForm.handleWriteError`(`:160-173`)가 409/412 를 `FormConflictDialog` 로 보내 입력을 보존한다 — 배관은 준비돼 있고 **토큰만 없다** | **동시 수정**: 두 탭에서 `/reservations/rsv-2/edit` 를 연다. 탭 A 가 시간을 14:00→15:00 으로 바꿔 저장. 탭 B 가 담당자만 바꿔 저장 → **경고 없이 성공하고, PUT 전체 치환이라 B 의 낡은 14:00 이 A 의 변경을 되돌린다.** 충돌 다이얼로그는 뜨지 않는다. **동시 생성**: 두 탭에서 같은 자원·같은 시간의 새 예약을 만들면 각자의 캐시(staleTime 30초)에 서로가 없어 더블부킹 경고(FS-037-EL-015)가 양쪽 다 뜨지 않고, 어댑터에도 충돌 검사가 없어(`crud.ts:59-63`) **둘 다 저장된다** | **gap** |
| EXC-08 | EXC | 상속 | 폼 저장이 `useCrudForm` 의 이중 방어를 상속한다 — **동기 제출 락** `submitLockRef`(`useCrudForm.ts:102,195-197`)가 RHF 비동기 검증과 `disabled={saving}` 렌더 사이의 틈을 닫고, **제출 시도 단위 멱등키** `idempotencyKeyRef`(`:112-117`)를 `mutationFn` **밖**에서 만들어 재시도가 같은 키를 재사용한다(성공 시 폐기 — `:214`). 버튼 disable 은 `FormPageShell.tsx:188`. 삭제는 `busy` → 확인 버튼 disable(`useCrudList.tsx:159,173`)이고 DELETE 가 멱등이라(BE-037-EP-05) 재시도가 안전하다 | 등록 폼에서 '등록'을 연타/Enter 연타 → 정확히 1개 요청. ⚠ **멱등키가 어댑터로 넘어가지 않는다** — `takeIdempotencyKey()`(`:206`)의 반환값이 버려지고 `CrudAdapter.create(input, signal)` 에 키 자리가 없다(BE-037 §6.1 #2 · §7.8 #2). 픽스처에는 무해하나 백엔드 연결 시 계약 변경이 필요하다. 판정은 `useCrudForm` 소유 문서를 따른다 | 종속 |
| EXC-09 | EXC | 상속 | 취소를 실패로 세지 않는 판정이 전부 공용 `isAbort` 한 곳에서 온다 — 삭제 `onError`(`useCrudList.tsx:110`), 저장 `handleWriteError`(`useCrudForm.ts:156`), 일괄 집계 `settleAll`(`shared/bulk.ts:19` — `rejected && !isAbort(reason)` 만 센다). 다이얼로그 닫기가 abort + `reset` 하고(`useCrudList.tsx:86-92,117-123`), 폼 언마운트가 진행 중 저장을 abort 한다(`useCrudForm.ts:92`). 목록 조회의 abort 는 react-query 가 signal 로 처리 | 삭제 다이얼로그를 요청 중 닫기 → 토스트 없이 버튼 상태 복원, 목록 무변경. 일괄 삭제 중 취소 → abort 가 실패 건수에 포함되지 않는다. 판정은 `shared/async`·`shared/bulk`·`useCrudList`·`useCrudForm` 소유 문서를 따른다 | 종속 |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **6** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · IA-01 · IA-05 |
| `종속` | **15** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · FEEDBACK-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-08 · EXC-09 |
| `N/A` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **7** | COMP-10 · A11Y-11 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 |
| **합계** | **30** | 6 + 15 + 2 + 7 = **30** ✔ |

> **P0 gap 7건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 전부 §5 로 이관한다. 7건 중 **IA-02 · EXC-03 은 앱 전역 사안**(이 화면만의 결함이 아니다)이고, **COMP-10 · IA-04 · IA-13 · A11Y-11 · EXC-04 는 이 화면이 공용 모듈을 소비하지 않아 생긴 사안**이다 — 즉 프레임워크는 이미 있고 배선만 없다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`) + `staleTime: 30_000` 으로 재조회 중 이전 행을 유지하고, 요약이 '· 새로고침 중…'만 덧붙인다 | 30초 후 재조회 시 표가 비지 않는다 | pass |
| STATE-05 | P1 | `CrudListShell` 에 `empty={{ hasQuery, hasActiveFilters, onClearSearch, onResetFilters }}` 를 넘긴다(`ReservationListPage.tsx:169-174`) → `Empty` 가 3분기 copy + 복구 액션을 그린다 | 검색 0건 → '검색 지우기'. 필터 0건 → '필터 초기화'. 진짜 0건 → '등록된 예약이 없습니다' | pass |
| STATE-06 | P1 | 쓰기 성공 시 `useCrudCreate`/`Update`/`Delete` 가 목록·상세 키를 정확히 무효화한다(`crud.ts:179-181, 198-201, 217-219`). **폼과 목록과 달력이 같은 `['reservations','list']` 키를 공유**하므로 저장 즉시 셋 다 갱신된다 | 예약 등록 → 목록·달력에 즉시 반영 | pass |
| COMP-11 | P1 | **미충족.** 기간 필터가 **없다** — 툴바에 검색 + 상태 select 뿐이다(`ReservationListPage.tsx:126-160`). 예약은 날짜가 1급 축인데 '이번 주 예약'을 목록에서 좁힐 수 없다. `start ≤ end` 검증·preset·URL 반영 모두 대상 표면이 없다. (날짜 범위 탐색은 예약 일정 화면 FS-040 이 달력으로 대신하나, 그 화면에는 상태·고객 필터가 없다 — 두 화면 어디서도 '이번 주 확정 예약'을 볼 수 없다) | `/reservations` 툴바에 날짜 입력이 0개 | **gap** |
| COMP-12 | P2 | **미충족.** 길이 제한 필드가 5개(고객명 40 · 연락처 20 · 요청사항 500 · 메모 500)인데 실시간 카운터가 없다. `FormField` 는 `counter` prop 을 지원하나(`packages/ui/.../FormField.tsx`) 이 화면이 넘기지 않는다. `maxLength` 가 입력을 **조용히 멈춘다** — 상한 근접 경고도 없다 | 요청사항에 500자 초과 입력 시도 → 예고 없이 입력이 멈춘다. '현재/최대' 표시 0건 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수 — read 실패=인라인 Alert(EL-010·EL-032) · write 성공=토스트 · 다이얼로그 내부 실패=그 다이얼로그 배너(EL-011·EL-012) · 폼 저장 실패=카드 배너(EL-017) | §2 STATE-02 · FEEDBACK-02 재현 절차와 동일 | pass |
| FEEDBACK-03 | P1 | 모든 mutation 에 성공·실패 피드백이 붙어 있다 — 저장(토스트/배너) · 삭제(토스트/다이얼로그 배너) · 일괄 삭제(토스트/건수 배너). no-op 경로 없음 | `?fail=reservations:save` · `?fail=reservations:delete` 가 항상 사용자 가시 실패를 낸다 | pass |
| A11Y-05 | P1 | **미충족.** 자원 배정 `<SelectField>` 가 오류를 `FormField error` 로 그리면서(`ReservationFormPage.tsx:283-297`) **`<select>` 에 `aria-invalid` 도 `aria-describedby` 도 붙이지 않는다** — 붉은 테두리만 남는다. 상태 select(`:341-358`)도 동일(required 표시 없음). 다른 필드 7종은 전부 짝이 맞다 | 자원 미선택으로 제출 → 오류 `<p>` 는 뜨지만 `<select aria-invalid>` 가 없다. 스크린리더가 그 select 를 invalid 로 읽지 않는다 | gap |
| A11Y-08 | P1 | 행 전체 클릭(`useRowNavigation`)의 키보드 등가물이 `RowActions` 의 '수정' 버튼이다(`CrudTable.tsx:172,192-197`) — 같은 목적지(`onEdit`)로 간다. 다만 **행 안에 이름 링크가 없다** — 등가물이 이름이 아니라 액션 버튼이다 | 행을 Tab 하면 체크박스 → 수정/삭제 버튼에 도달하고, 수정이 행 클릭과 같은 폼을 연다. 판정은 `CrudTable`/`useRowNavigation` 소유 문서를 따른다 | 종속 |
| A11Y-13 | P1 | `useCrudForm.submit` 이 `handleSubmit(onValid, onInvalid)` 를 부르고 RHF `shouldFocusError` 기본값이 첫 invalid 필드로 포커스를 옮긴다(`useCrudForm.ts:233-241,253`). **폼 진입 시 첫 필드 자동 포커스는 없다** | 빈 폼 제출 → `activeElement` 가 고객명 입력. 폼 진입 시 포커스는 body | 종속 |
| A11Y-16 | P1 | 이 화면에 신규 인터랙티브 표면이 없다 — 전부 DS primitive(Button·SearchField·SelectField·FormField·TextareaField·ConfirmDialog·RowActions·체크박스)와 네이티브 입력(`<input type="date|time|number">`)의 조립이다 | 신규 컴포넌트 0건 | 종속 |
| IA-03 | P1 | **미충족.** `/reservations/new`·`/:id/edit` 에 breadcrumb 가 없다 — 위치 trail 이 어디에도 없고, 대신 AppHeader 가 가지 라벨을 제목으로 잘못 보인다(§2 IA-02). '목록으로' 버튼(`FormPageShell.tsx:147-155`)이 유일한 상위 이동 수단이다 | `/reservations/new` 에 '예약/신청 관리 > 예약 > 등록' 같은 trail 이 0개 | gap |
| IA-06 | P1 | 예약은 12필드 rich 엔티티라 전용 form route 가 맞다(taxonomy modal 아님). 같은 섹션의 상담 예약도 route(`/reservations/consultations/new`), 카테고리류만 modal — 무게 규칙과 일치한다 | 혼용 없음 | pass |
| IA-07 | P1 | back-link 가 `FormPageShell.tsx:147-155` 의 공유 '목록으로' + `ChevronLeftIcon` 하나다. 이 화면이 자체 back-link 를 만들지 않는다 | `ArrowLeftIcon`·'리스트로 돌아가기' grep = 0 | 종속 |
| IA-08 | P1 | footer 가 `FormPageShell.tsx:179-191` 의 공유 in-card 배치(취소 좌 · 저장 우) 하나다 | 이 화면이 자체 footer 를 만들지 않는다 | 종속 |
| IA-14 | P1 | **미충족(측정 미실시).** 툴바·폼 필드는 `flexWrap`/`auto-fit` 그리드로 좁은 폭에 대응하나(`ReservationListPage.tsx:38,45` · `ReservationFormPage.tsx:46`), **표가 bounded 가로 스크롤 컨테이너 안에 있지 않다** — `CrudTable` 이 `<table style={tableStyle}>` 을 그대로 반환하고 이 화면의 열이 10개(선택·순번·예약번호·고객·일시·인원·자원·담당·예약금·상태·액션)라 좁은 폭에서 page grid 를 밀 수 있다. 최소 지원 폭 선언도 없다 | 768px·375px 에서 `/reservations` → 표가 가로로 넘치는지, `<main>` 이 가로 스크롤되는지 확인 필요. **판정 근거가 코드 대조뿐이라 '넘친다'를 단정하지 않는다** — 표면이 있고 계약이 없다는 사실만 기록한다 | gap |
| ERP-01 | P1 | **충족.** 예약 상태→tone 매핑이 per-page helper 가 아니라 **섹션 공유 레지스트리**다 — `_shared/booking.ts:27-41` 의 `STATUS_META` 하나에서 `bookingStatusTone`/`bookingStatusLabel` 이 나오고, 예약 목록·예약 폼·예약 일정·상담 예약이 전부 이것을 import 한다. `'완료'` 라벨만 도메인이 주입한다(`completedLabel`) | `bookingStatusTone` 이 단일 export. 예약/상담이 같은 상태에 같은 tone 을 그린다 | pass |
| ERP-04 | P1 | **미충족.** 정렬 가능한 컬럼 헤더가 없다 — `sortReservations`(방문일시 내림차순) 고정이다(`_shared/reservation.ts:118-124`). '예약금 큰 순'·'고객명 순'을 볼 수 없다 | 헤더 클릭이 아무 동작도 하지 않는다. `aria-sort` grep = 0 | gap |
| ERP-05 | P1 | **N/A** — Pagination 자체가 없다(§2 IA-04). range 표시·page-size selector 를 얹을 표면이 없다 | 재현할 표면 없음 | N/A |
| ERP-07 | P2 | **미충족.** 예약금이 `` `${formatNumber(item.deposit)}원` ``(`ReservationListPage.tsx:109`) — 우측 정렬 숫자 열인데 '원'이 마지막 자릿수를 따라다녀 다행 정렬이 어긋난다. 인원 열도 동일(`:100`) | 예약금이 다른 두 행(1,000원 / 50,000원)의 자릿수가 세로로 정렬되지 않는다 | gap |
| ERP-08 | P2 | **부분 미충족.** 숫자는 `formatNumber` 경유(`:100,109`)로 옳다. **날짜·시각은 포매터를 거치지 않는다** — `` `${item.date} ${item.startTime}~${item.endTime}` ``(`:97`)로 원본 문자열을 직접 잇는다. 상대시간 표기 없음(예약은 미래 일정이라 '4시간전'이 부적절하다 — 의도된 선택으로 보인다) | 일시 셀에 `shared/format` 호출이 없다 | gap |
| ERP-09 | P2 | **미충족.** `_shared/calendar.ts` 의 날짜 계산이 **전부 브라우저 로컬 TZ** 다 — `parseDate`(`:27-31`)가 `new Date(y, m-1, d)`(로컬 자정), `toDateString`(`:45-47`)이 `getFullYear/getMonth/getDate`, `isPastDateTime`(`:95-101`)이 로컬 Date 산술 + `now.getTime()`. 파일 헤더가 '로컬 타임존 기준'이라 **가정을 명시**하고는 있으나 표시 TZ 정책(Asia/Seoul 고정)은 없다. `shared/format.ts` 도 같은 구조(`:20-22` `getFullYear/getMonth/getDate`)지만 이 화면은 그중 `formatNumber` 만 쓴다 | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 `/reservations/new` 에서 오늘 09:00 을 입력 → **한국 관리자에게는 미래인 일시가 과거 일시 경고(FS-037-EL-016)를 띄우거나 띄우지 않는다.** 예약 `date` 문자열 자체는 TZ 와 무관하게 저장되므로(문자열 비교) 데이터는 안 흔들리지만 **판정(과거/오늘)이 흔들린다** | gap |
| ERP-12 | P1 | **미충족.** 엑셀/CSV 내보내기가 없다 — 툴바에 export 버튼이 0개다. `shared/download.ts` 가 존재하고 회원 목록이 쓰는데 이 화면은 소비하지 않는다. 권한 모델에는 `export` 액션이 이미 있다(`permissions/resources.ts` `ACTION_META`) | `/reservations` 툴바에 내보내기 affordance 0개 | gap |
| ERP-13 | P1 | **미충족.** 삭제 토스트·확인 문구가 `` `'${nameOf(item)}' 을(를) 삭제했습니다.` ``(`useCrudList.tsx:107,157`), 저장 토스트가 `` `${entityLabel}을(를) ${verb}했습니다.` ``(`useCrudForm.ts:215`), 로드 실패가 `` `${entityLabel}을(를) 찾을 수 없습니다…` ``(`FormPageShell.tsx:128-129`) — **리터럴 '을(를)' 이 이 화면에 그대로 출하된다.** `nameOf` 가 `'<고객명> (<예약번호>)'` 라 받침이 값마다 달라져 josa 헬퍼가 실제로 필요하다 | 예약을 삭제 → `'김도현 (RSV-20260716-001)' 을(를) 삭제했습니다.` 토스트. `shared/format` 에 josa 헬퍼 grep = 0 | gap |
| ERP-14 | P1 | **미충족.** 이 화면에 마스킹/정규화가 필요한 필드가 둘 있다 — **연락처**(`ReservationFormPage.tsx:224-238`: 자유 텍스트 20자, 하이픈 자동 삽입·형식 검증·붙여넣기 정규화 없음)와 **예약금**(`:325-338`: `<input type="number">`, 천 단위 구분 없음. '1,234,000원'을 붙여넣으면 브라우저가 거부한다) | 연락처에 'abc' 입력 → 통과한다. 예약금에 '50,000' 붙여넣기 → number 입력이 거부하거나 빈 값이 된다 | gap |
| ERP-15 | P1 | **미충족.** 대형 list 계약이 없다 — page size cap 도 virtualization 도 없이 전량 렌더한다(§2 IA-04). 게다가 더블부킹 배지가 행마다 `hasConflict(items, item)` 로 전량을 훑어 **O(n²)** 다(`ReservationListPage.tsx:120` → `_shared/reservation.ts:75-86`). 11열 테이블의 가로 스크롤 전략도 없다(P1 IA-14) | 1,000건 시드로 `/reservations` 진입 → 1,000행 DOM + 1,000,000회 겹침 비교가 **매 렌더** 일어난다(`columns` 가 `useMemo` 로 감싸이지 않아 렌더마다 재생성된다) | gap |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건이다. 이 화면의 조회·쓰기가 `shared/async.wait(LATENCY_MS, signal)` 를 거치는데 상한이 없다 | 응답하지 않는 백엔드를 붙이면 스피너가 무한히 돈다 | gap |
| EXC-06 | P1 | **부분 충족.** 에러 타입이 status 를 지닌다(`shared/errors/http-error.ts`)고 폼이 404/409/412/422 를 갈라 처리한다(`useCrudForm.ts:137-190`). **그러나 목록·삭제 실패는 status 를 보지 않는다** — 401/403/404/429/500 이 전부 '예약 목록을 불러오지 못했습니다'(`CrudListShell.tsx:159`) 또는 '삭제하지 못했습니다'(`useCrudList.tsx:111`) 한 문구로 붕괴한다 | `?status=list:403` 과 `?status=list:500` 이 **같은 배너**를 낸다. `?status=delete:403` 과 `:500` 도 같다 | gap |
| EXC-07 | P1 | **배관은 있으나 이 화면에서 확인 불가.** `useCrudForm.ts:176-186` 이 422 + `violations` 를 `setError`+`setFocus` 로 필드에 꽂는다. BE-037 이 422 `RESERVATION_SLOT_CONFLICT`(fields: startTime·resourceId) 등을 정의했으므로 서버 연결 시 성립한다 | ⚠ **현재 스위치로 재현할 수 없다** — `?status=save:422` 는 `HttpError(422, '입력값을 확인해 주세요.')` 를 `violations` 없이 던지므로(`dev.ts:81-85`) `violations.length > 0` 가드에 걸려 **generic 배너로 떨어진다**. 필드 경로를 재현하려면 `?status=` 에 fields 를 실을 수단이 필요하다(§6) | 종속 |
| EXC-10 | P1 | **부분 미충족.** `settleAll`(`shared/bulk.ts:14-20`)이 `Promise.allSettled` + abort 제외 집계로 'N중 M건 실패'를 보고하고 전원 성공에만 무효화·선택 해제한다(`useCrudList.tsx:135-148`) ✓. **그러나 실패 id 를 돌려주지 않아**(반환값이 `number`) 실패분만 재시도할 수 없다 — 재클릭이 전원을 재실행한다(성공분 재요청) | 5건 중 2건 실패 → 배너가 '5건 중 2건을 삭제하지 못했습니다'. 재클릭 시 **5건 전부** 다시 DELETE 된다 | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건이다 | 오프라인 전환 시 배너가 없고 write 가 일반 실패로 보인다 | gap |
| EXC-12 | P1 | **충족.** `useCrudForm.ts:137-143` 이 `isNotFound(loadError)` 로 `'not-found'`/`'error'` 를 가르고, `FormPageShell.tsx:115-143` 이 404 → '찾을 수 없습니다 + 목록으로'(**재시도 버튼 없음**), 그 외 → '불러오지 못했습니다 + 다시 시도 + 목록으로'로 분기한다. 어댑터가 404 에 `HttpError(404)` 를 실어 준다(`crud.ts:54-56`) | `/reservations/없는id/edit` → '예약을(를) 찾을 수 없습니다' + '목록으로'만. `/reservations/rsv-1/edit?status=detail:500` → '다시 시도' + '목록으로' | 종속 |
| EXC-14 | P1 | **N/A** — 이 화면에 낙관적 업데이트가 없다. 인라인 토글·재정렬 같은 가역 액션이 없고(FS-037 §4.1), 등록·삭제는 confirm + busy 로 비관적이다 — 요구가 지시하는 대로다 | 롤백할 낙관 반영 0건 | N/A |
| EXC-15 | P1 | **N/A** — 이 화면에 파일 업로드가 없다. 예약에 이미지 필드가 없다(`ReservationListPage.tsx:5` 주석: '목록엔 이미지 열이 없다') | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **미충족.** selection scope 가 정의되지 않았다 — 페이지네이션이 없어 `toggleAll` 이 **보이는 전량**을 한 번에 선택한다(`CrudListShell.tsx:143-148`). Shift-click range 없음. 대량 confirm 강화(count echo/type-to-confirm) 없음 — 확인 문구가 건수를 말하지만(`useCrudList.tsx:169`) 임계값 규칙이 없다. 진행률·취소 없음 | 500건이 보이는 상태에서 헤더 체크박스 1클릭 → 500건 선택 → '선택 500건 삭제' → 확인 1클릭에 500개 DELETE 가 동시 발사된다. 진행 중 취소 수단은 다이얼로그 닫기(abort)뿐 | gap |
| EXC-19 | P1 | **미충족.** 세션 만료 경고·연장 프롬프트가 없고, 401 리다이렉트 시 dirty 폼 스냅샷이 없다. 예약 폼은 12필드라 손실이 실질적이다 | 폼 입력 중 `?status=save:401` → 재인증 경로로 이동하고 입력이 사라진다 | gap |
| EXC-20 | P1 | **충족.** 저장 실패 시 `referenceOf(cause)` 로 참조 코드를 만들어(`useCrudForm.ts:189`) `FormServerError` 가 '오류 코드 <ref>' 를 `userSelect: 'all'` 로 보인다(`FormFeedback.tsx:44`). raw 서버 body·stack·status 를 산문으로 쓰지 않는다. **단 목록·삭제 실패에는 참조 코드가 없다** — `CrudListShell`/`useCrudList` 가 `referenceOf` 를 쓰지 않는다 | `?status=save:500` → 폼 배너에 복사 가능한 오류 코드. `?status=list:500` → 배너에 코드 **없음** | 종속 |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 상수다. 실제 예산은 BE-037-EP-01 의 응답 크기(전량 조회)가 정해지면 A63 이 확정한다 |
| 첫 렌더(목록) | 미정 | — | 측정 미실시 |
| 재조회 횟수 | 화면 진입당 **최대 1회 / 30초** | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`shared/query/queryClient.ts`) | 목록↔폼↔달력을 오가도 30초 안에는 재조회하지 않는다 — 세 화면이 `['reservations','list']` 키 하나를 공유한다 |
| 쓰기 후 재조회 | 등록·수정 = 목록 1회(+상세 1회) · 삭제 = 목록 1회 · 일괄 삭제 = **전원 성공 시에만** 목록 1회 | `crud.ts:179-181,198-201,217-219,237-240` | 부분 실패는 무효화하지 않는다 — 실패분이 남은 목록을 다시 그릴 이유가 없다 |
| 메모리 / DOM | **상한 없음 — 위험** | 전량 렌더(§2 IA-04) | 예약 N건 → `<tr>` N개. 상한 계약이 없다 |
| CPU | **O(n²) — 위험** | 더블부킹 배지가 행마다 전량 스캔(`ReservationListPage.tsx:120`), `columns` 배열이 `useMemo` 없이 렌더마다 재생성(`:90-124`) | 500건에서 250,000회 비교 × 매 렌더. 검색 자모마다 재렌더되므로(§2 COMP-10) 두 결함이 곱해진다 |
| 번들 | 이 화면 전용 의존 **0** | 날짜·달력 라이브러리 미도입 — `_shared/calendar.ts` 가 순수 함수로 직접 구현(파일 헤더가 근거를 밝힌다) | 라이브러리 우선 원칙의 의도적 예외 — 계산이 작고 테스트로 고정돼 있다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). 단 status 별 분기 없음(§3 EXC-06) |
| 상세 404(다른 관리자가 먼저 삭제) | '찾을 수 없습니다' + 목록으로(재시도 없음) | ✔ (§3 EXC-12) |
| 저장 중 세션 만료(401) | 재인증 후 원래 경로 + **입력 복원** | ✖ 재인증은 되나 입력이 사라진다(§3 EXC-19) |
| 저장 중 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구. 오프라인 감지 없음(§3 EXC-11) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 대기(§3 EXC-05) |
| 두 관리자의 동시 수정 | 충돌 다이얼로그 + 입력 보존 | ✖ 마지막 쓰기가 조용히 이긴다(§2 EXC-04) |
| 두 관리자의 겹치는 예약 동시 생성 | 서버가 트랜잭션 안에서 거절 | ✖ 둘 다 저장된다(§2 EXC-04 · BE-037 §7.1) |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |

### 4.3 데이터 보존 · 감사

| 항목 | 상태 |
|---|---|
| 예약 이력(누가 언제 무엇을 바꿨나) | **없다** — 프론트에 표면이 없고 서버 계약도 미정. 상태 전이가 '앞으로만 나아간다'는 설계(`_shared/booking.ts` 헤더의 '감사 성격')는 이력 보존을 전제하는데 이력이 없다 — BE-037 §7.4(d) 로 이관 |
| 삭제 | **하드 삭제 · undo 없음** — 확인 다이얼로그만이 유일한 보호막(FEEDBACK-05 P2). 예약은 고객과의 약속 기록이라 소프트 삭제가 타당할 수 있다 |
| 취소 vs 삭제 | 도메인은 `status: 'cancelled'` 를 종료 상태로 두어 취소를 **보존**하는데, 목록의 삭제 버튼은 그 기록을 **없앤다** — 두 경로의 의미 차이가 화면에 설명되지 않는다(BE-037 §2.1 이 `operator` 의 삭제를 403 으로 막는 근거) |
| 고객 개인정보(이름·연락처) | 조회·수정 감사 로그 필요 — BE-037 §7.4(d). ⚠ **연락처 마스킹 도입 시 수정 저장이 실번호를 파괴한다** — BE-037 §7.4(c) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **COMP-10** | **P0** | 검색에 IME 조합 처리·디바운스가 없다 — 공용 `useDebouncedSearch` 미소비. 자모마다 전량 재필터 + Empty 번쩍임 + live region 연속 announce | 이 화면 | A11 (FS-037 §7 #3) |
| 2 | **A11Y-11** | **P0** | 필수 7필드가 `required`/`aria-required` 를 노출하지 않는다(`FormField` 의 별표는 `aria-hidden`). 짝 없는 `aria-invalid` 는 0건 | 이 화면 + `FormField` 계약 | A11 · A41 |
| 3 | **IA-02** | **P0** | `/reservations/new`·`/:id/edit` 의 AppHeader 제목이 가지 라벨 '예약/신청 관리' 로 폴백하고, 동시에 `FormPageShell` 이 in-content `<h1>` 을 그려 **`<h1>` 이 둘**이다 | **앱 전역**(`findNavLabel` 이 모든 하위 라우트에서 같다) | A40 · A11 |
| 4 | **IA-04** | **P0** | Pagination 이 없다 — 무한 증가하는 트랜잭션 데이터를 전량 렌더한다. 순번·전체선택·성능·일괄 안전장치가 전부 여기서 파생된다 | 이 화면 | A11 (FS-037 §7 #2) |
| 5 | **IA-13** | **P0** | list state 가 URL 에 없다 — 공용 `useListState` 미소비. Back/F5/링크 공유가 필터를 잃는다 | 이 화면 | A11 (FS-037 §7 #3) |
| 6 | **EXC-03** | **P0** | 쓰기 권한 게이팅 미소비 — `useRouteWritePermissions` 를 `pages/**` 전체가 쓰지 않는다. 조회 전용 역할에게 등록·수정·삭제가 그대로 보인다 | **앱 전역** | A11 · A63 (FS-037 §7 #9) |
| 7 | **EXC-04** | **P0** | 낙관적 동시성 토큰 없음 — `Reservation` 에 `version` 이 없고 `CrudAdapter.update` 에 `If-Match` 자리가 없다. 동시 수정은 마지막 쓰기 승리(전체 치환이라 남의 변경을 되돌린다), 동시 생성은 더블부킹이 그대로 저장된다 | 이 화면 + `shared/crud` 계약 | A63 (BE-037 §7.3 · §7.8 #7) · A41 |
| 8 | COMP-11 | P1 | 기간 필터가 없다 — 예약의 1급 축인 날짜로 목록을 좁힐 수 없다 | 이 화면 | A11 |
| 9 | A11Y-05 | P1 | 자원 배정·상태 `<select>` 에 `aria-invalid`/`aria-describedby` 미배선 | 이 화면 | A11 (FS-037 §7 #12) |
| 10 | IA-03 | P1 | breadcrumb 없음 | 앱 전역 | A40 · A11 |
| 11 | IA-14 | P1 | 11열 표의 가로 스크롤 전략·최소 지원 폭 선언 없음 | 앱 전역 + 이 화면 | A11 · A41 |
| 12 | ERP-04 | P1 | 정렬 가능 헤더 없음(방문일시 내림차순 고정) | 이 화면 | A11 |
| 13 | ERP-12 | P1 | 엑셀/CSV 내보내기 없음(권한 모델엔 `export` 액션이 이미 있다) | 이 화면 | A11 |
| 14 | ERP-13 | P1 | 리터럴 '을(를)' 출하 — josa 헬퍼 없음 | 앱 전역(`useCrudList`·`useCrudForm`·`FormPageShell`) | A41 · A11 |
| 15 | ERP-14 | P1 | 연락처·예약금 마스킹/정규화 없음 | 이 화면 + 공용 field adapter | A11 |
| 16 | ERP-15 | P1 | 대형 list 계약 없음 + 더블부킹 배지 O(n²) + `columns` 매 렌더 재생성 | 이 화면 | A11 · A41 |
| 17 | EXC-05 | P1 | 클라이언트 타임아웃 없음 | 앱 전역 | A40 · A41 |
| 18 | EXC-06 | P1 | 목록·삭제 실패가 status 를 보지 않고 한 문구로 붕괴 | 앱 전역(`CrudListShell`·`useCrudList`) | A41 · A11 |
| 19 | EXC-10 | P1 | 일괄 실패 id 미반환 — 실패분만 재시도 불가 | 앱 전역(`shared/bulk.ts`) | A41 |
| 20 | EXC-11 | P1 | 오프라인 감지 없음 | 앱 전역 | A40 |
| 21 | EXC-18 | P1 | selection scope 미정의 · Shift-range 없음 · 대량 confirm 강화·진행률·취소 없음 | 이 화면 + `useCrudList` | A11 · A41 |
| 22 | EXC-19 | P1 | 세션 만료 전 경고·dirty draft 스냅샷 없음 | 앱 전역 | A40 · A11 |
| 23 | COMP-12 | P2 | 길이 제한 5필드에 실시간 카운터 없음(`FormField` 는 `counter` 를 지원한다) | 이 화면 | A11 |
| 24 | ERP-07 | P2 | 금액·인원 단위가 숫자에 붙어 자릿수 정렬이 깨진다 | 이 화면 | A11 |
| 25 | ERP-08 | P2 | 일시 셀이 포매터를 거치지 않고 원본 문자열을 잇는다 | 이 화면 | A11 |
| 26 | ERP-09 | P2 | `_shared/calendar.ts` 가 전부 browser-local getter — 표시 TZ 정책 없음. 관리자 TZ 에 따라 '과거 일시' 경고·'오늘' 판정이 달라진다 | 섹션 공용(`_shared/calendar.ts`) + 앱 전역(`shared/format.ts`) | A63 · A11 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.

### 6.1 실패 재현 (`?fail=`) — 이 화면의 실제 scope 와 op

`reservationAdapter` 의 scope 는 **`'reservations'`** 다(`_shared/reservation-store.ts:119` — `createCrudAdapter({ scope: 'reservations', … })`). `createCrudAdapter` 가 거는 op 은 네 개다(`shared/crud/crud.ts:45,50,61,67,79`):

| op | 어떤 요소가 깨지는가 |
|---|---|
| `list` | FS-037-EL-010 조회 실패 배너 (목록 · 폼의 더블부킹 판정 · 달력이 같은 키를 공유하므로 함께) |
| `detail` | FS-037-EL-032 상세 로드 실패 (수정 진입 시) |
| `save` | FS-037-EL-017 저장 실패 배너 (등록·수정 공용 — `create`/`update` 가 같은 op 을 쓴다) |
| `delete` | FS-037-EL-011 다이얼로그 배너 · FS-037-EL-012 부분 실패 건수 |

**사용 형태**(`shared/crud/dev.ts:81-93`): `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all` · 쉼표 다중.

```
/reservations?fail=list                 목록 조회 실패 → STATE-02 확증
/reservations?fail=reservations:delete  삭제 실패 → FEEDBACK-02 확증
/reservations/new?fail=save             저장 실패 → EXC-20 참조 코드 확인
/reservations/rsv-1/edit?fail=detail    상세 로드 실패 → EXC-12 'error' 분기
/reservations?fail=all                  전 경로 실패
```

⚠ **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고 `LATENCY_MS = 400` 이 고정이다(`?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다). STATE-01 의 skeleton 구간을 늘려 관찰하려면 `LATENCY_MS` 를 임시로 올리거나 네트워크 스로틀을 쓴다.

### 6.2 status 재현 (`?status=`) — EXC-02/03/04/06 경로

형태(`dev.ts:24,56-71`): `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능한 code 는 9개(`dev.ts:27-37`): 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

```
/reservations?status=list:401           401 → 쿼리 계층 재인증 (EXC-02)
/reservations?status=list:403           403 → EXC-06 gap 확증(500 과 같은 배너)
/reservations/rsv-1/edit?status=save:409  409 → FS-037-EL-034 충돌 다이얼로그 (EXC-04 배관 확인)
/reservations/rsv-1/edit?status=save:412  412 → 409 와 같은 UX 로 수렴하는지
/reservations/rsv-1/edit?status=detail:404 404 → EXC-12 'not-found' 분기(재시도 버튼 없음)
/reservations/new?status=save:500       500 → EXC-20 참조 코드
```

⚠ **422 의 필드 경로(EXC-07)는 현재 스위치로 재현할 수 없다.** `?status=save:422` 는 `new HttpError(422, '입력값을 확인해 주세요.')` 를 **`violations` 없이** 던지고(`dev.ts:84`), `useCrudForm.ts:176` 의 `cause.violations.length > 0` 가드에 걸려 필드 인라인이 아니라 generic 배너로 떨어진다. BE-037 이 정의한 422(`RESERVATION_SLOT_CONFLICT` · `INVALID_STATUS_TRANSITION` · `PARTY_SIZE_EXCEEDS_CAPACITY`)의 UX 를 검증하려면 **`?status=` 에 `error.fields` 를 실을 수단이 필요하다** — §5 #추가 이관: A41.

### 6.3 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| STATE-01 | `shared/crud/useCrudList.tsx:71-72` · `CrudListShell.tsx:118-122,139` |
| COMP-10 | `ReservationListPage.tsx:70-71,129-134` (`useDebouncedSearch` 미사용) |
| A11Y-11 | `ReservationFormPage.tsx:204-217,289-296,341-358` · `packages/ui/.../FormField.tsx`(`required` 가 `aria-hidden`) |
| IA-02 | `AppHeader.tsx:92,101` · `nav-config.ts:184-189,253-263` · `FormPageShell.tsx:159` |
| IA-04 | `ReservationListPage.tsx:85-88,162-179`(Pagination import 0건) |
| IA-13 | `ReservationListPage.tsx:70-71` (`useListState`·`useSearchParams` 미사용) |
| EXC-03 | `AppShell.tsx:490-492` · `permissions/RequirePermission.tsx:45-52` · `ReservationListPage.tsx:155` |
| EXC-04 | `_shared/reservation.ts:13-39`(`version` 부재) · `shared/crud/crud.ts:20,71-73` · `useCrudForm.ts:160-173` |
| ERP-09 | `_shared/calendar.ts:27-31,45-47,95-101` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 (FEEDBACK-06 · A11Y-12)
- [x] 모든 `pass` 에 코드 근거(파일:라인)
- [x] 모든 `gap` 에 재현 가능한 측정 기준
- [x] §2.1 산수 검산 — 6 + 15 + 2 + 7 = **30** ✔
- [x] §3 은 **표면이 실재하는 것만** 적었다 — ERP-05(Pagination 부재)·EXC-14(낙관 업데이트 없음)·EXC-15(업로드 없음)를 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 `?fail=` scope(`reservations`)와 op 4종을 코드에서 확인**해 적었다. **`?delay=` 를 쓰지 않았다** — 이 화면에 없음을 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-037 §7 · BE-037 §7.8 과 같은 사안을 가리키는지 대조했다
