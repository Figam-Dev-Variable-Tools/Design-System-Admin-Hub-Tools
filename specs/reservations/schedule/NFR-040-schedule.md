---
id: NFR-040
title: "예약 일정(달력) 비기능 명세"
functionalSpec: FS-040
backendSpec: BE-040
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-040. 예약 일정(달력) 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-040 예약 일정 (`/reservations/schedule`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-040(요소·예외) · BE-040(재사용 선언·서버 판정) · **NFR-037**(예약 관리) — **두 화면이 같은 어댑터·같은 쿼리 키를 공유하므로 데이터 계층 판정이 겹친다**. 이 문서는 겹치는 판정을 반복하지 않고 NFR-037 을 참조한다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | 2026-07-17 · `HEAD = 3cd3078` |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서/DS 에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격 — N/A 가 많은 이유

**이 화면은 읽기 전용 단일 뷰다.** 쓰기 요청이 0건이고(FS-040 §4.1), 폼·모달·토스트·목록 템플릿·검색 입력이 전부 없다. 그래서 quality-bar 의 P0 30 중 **16건이 표면 부재로 N/A** 다 — 이는 결함이 아니라 화면의 범위다. 대신 **남은 14건이 전부 이 화면의 실질**이며, 그중 2건이 gap 이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **미충족.** 이 화면은 `useCrudList` 를 우회하고 `useCrudListQuery` 를 직접 쓴다 — `ScheduleCalendarPage.tsx:116-121` 이 `isFetching: loading` 으로 **데이터 유무를 보지 않고** 이름만 바꾼다(F2 가 `useCrudList` 에서 고친 바로 그 파생 — `useCrudList.tsx:71-72` 의 `firstLoading = isFetching && data === undefined` 가 여기엔 없다). 더 근본적으로 **격자에 로딩 상태 자체가 없다**: `:122` 의 `all = data ?? []` 가 도착 전에도 빈 배열을 주고, `CalendarGrid` 는 그것으로 **셀 77개를 '0/4' 로 완성해 렌더한다.** `loading` 이 실제로 하는 일은 격자 위 힌트 한 줄을 '불러오는 중…'으로 바꾸는 것뿐이다(`:203-207`). 즉 `{first-load, refetching-with-data, empty, error}` 중 **first-load 와 empty 가 화면상 같은 것을 그린다** — quality-bar 가 '로드 중 empty 가 번쩍이면 운영자가 오판한다'고 지목한 상태 혼동 그 자체다 | `/reservations/schedule` 진입 → 400ms(`LATENCY_MS`) 동안 **격자가 이미 완성돼 있고 모든 셀이 '0/4'** 다. 그 사이 아무 슬롯이나 클릭 → 패널이 **'이 시간대에 예약이 없습니다.'** 라는 **거짓 사실을 단정한다**(FS-040-EL-009.2). 데이터가 도착하면 숫자·칩이 조용히 나타난다. 스켈레톤·빈 상태 구분이 존재하지 않는다 | **gap** |
| STATE-02 | STATE | 직접 | 조회 실패 시 `ScheduleCalendarPage.tsx:135-148` 이 이른 반환으로 `<Alert tone="danger">` '예약 일정을 불러오지 못했습니다.' + '다시 시도'(`void refetch()`)를 렌더한다 — 인라인 danger Alert + 명시적 재시도 컨트롤이고, 토스트가 아니며 빈 상태로 폴백하지 않는다. **요구의 문자는 충족한다** | `/reservations/schedule?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. '다시 시도' 클릭 → 쿼리 재발행. ⚠ **다만 이 배너가 화면 전체를 대체해 뷰·기간 컨트롤까지 지운다**(FS-040 §7 #10) — 그것은 STATE-02 가 요구하는 범위 밖이며 §3 IA 축으로 이관한다 | pass |
| STATE-04 | STATE | N/A | **이 화면에 페이지네이션도 행 선택도 없다.** 달력 격자는 `DAY_SLOTS` 11행 × 날짜 열로 **구성이 고정**돼 있고(`schedule-data.ts:30-36`), total 이 줄어 범위를 벗어날 page 라는 개념이 없다. '선택'은 슬롯 하나(`selected`)이고 뷰·기간이 바뀌면 `setSelected(null)` 로 해제된다(`ScheduleCalendarPage.tsx:155,166,177,191`) — 요구가 지시하는 '숨겨진 행의 선택 해제'와 같은 결이지만 대상이 행이 아니다 | 재현할 표면 없음 | N/A |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 두 파일의 스타일 객체가 전부 `var(--tds-*)` 를 참조한다 — `ScheduleCalendarPage.tsx:41-107`(page·controls·navGroup·range·errorBody·panelList·panelRow·panelInfo), `CalendarGrid.tsx:15-98`(scroll·grid·headCell·todayHead·timeCell·baseCell·selectedCell·chipRow·capacity·full). 하드코딩 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` 0건. 격자 선을 `gap: var(--tds-border-width-thin)` + 배경색으로 그리는 기법(`CalendarGrid.tsx:19-21`)도 토큰만 쓴다 | 두 파일에 `#`hex · px 리터럴 · bare border 키워드 grep = 0. lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 슬롯 셀 버튼 77개(`CalendarGrid.tsx:144` `className="tds-ui-focusable"`) · DS `Button` 6종(일·주·이전·오늘·다음·예약 상세) — 이 전부가 DS 의 `tds-ui-focusable` 계약을 상속한다. **이 화면은 자체 `:focus-visible` 규칙을 선언하지 않는다** — 손으로 만든 격자인데도 포커스 링만은 DS 것을 쓴다 | 판정은 DS(`packages/ui`) 소유 문서를 따른다. 이 화면에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰을 소비하는 표면이 이 화면에 없다 — 토스트도 모달도 띄우지 않는다 | 판정은 tokens codegen 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면은 슬롯 상세 패널의 `Card`(`ScheduleCalendarPage.tsx:218`) 하나다 — DS 소유. 격자 셀의 `surface-raised`/`surface-default` 배경(`CalendarGrid.tsx:34,52,72`)은 색 토큰이지 그림자가 아니다. 이 화면은 `box-shadow` 를 선언하지 않는다 | 판정은 DS(`Card`) 소유 문서를 따른다. 이 화면에서 `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — 페이지 제목은 AppHeader 가 `pageTitleStyle`(title.xl tier)로 그린다(`AppHeader.tsx:52-55,101`). 이 화면의 텍스트 계층은 기간 라벨(`rangeStyle` — label-md + bold, `:62-67`) · `CardTitle` · 격자 헤더(label-sm) · 캡션(caption-md)이며 **자체 titleStyle 을 선언하지 않는다** | 판정은 tokens typography · `pageTitleStyle` 소유 문서를 따른다. **이 화면의 title 소스는 하나다** — IA-02 참조 | 종속 |
| COMP-10 | COMP | N/A | **이 화면에 text-search/filter 입력이 없다.** 툴바에 있는 것은 버튼 5개(일·주·이전·오늘·다음)와 텍스트 라벨뿐이다(`ScheduleCalendarPage.tsx:160-201`) — IME 조합이 일어날 입력 필드가 존재하지 않는다. (⚠ **이 화면에 고객·상태로 좁힐 수단이 아예 없다는 사실**은 별개 문제이며 §3 COMP-11 · §4.3 에 기록한다) | 재현할 표면 없음 | N/A |
| FEEDBACK-02 | FEEDBACK | N/A | **이 화면에 파괴적/비가역 액션이 없다.** 쓰기 요청이 0건이고(FS-040 §4.1), 유일한 상태 변경은 화면 로컬(뷰·기간·슬롯 선택)이며 '예약 상세' 버튼은 라우팅이다(`ScheduleCalendarPage.tsx:238-243`). ConfirmDialog 로 게이트할 대상이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **이 화면에 편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다. 잃을 미저장 입력이 없으므로 이탈 3경로를 가드할 대상이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 modal 이 없다.** 슬롯 상세 패널은 modal 이 아니라 격자 아래에 인라인으로 붙는 `Card` 다(`ScheduleCalendarPage.tsx:217-249`) — 포커스 트랩·dim·Esc 가 없고 입력도 없다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | N/A | **이 화면은 토스트를 띄우지 않는다** — `useToast` 를 import 하지 않는다(쓰기가 없어 알릴 결과가 없다). toast viewport 표면이 이 화면에 실재하지 않는다. (⚠ **슬롯 선택·데이터 갱신을 알리는 live region 이 없다**는 것은 별개 사안이며 A11Y-16 P1 — §3) | 재현할 표면 없음 | N/A |
| A11Y-02 | A11Y | N/A | **이 화면에 Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | N/A | **이 화면에 폼 컨트롤이 없다** — `<input>`·`<select>`·`<textarea>` 가 0개다. 인터랙티브 요소는 전부 `<button>` 이라 `aria-invalid`/`aria-describedby`/`required` 계약의 대상이 아니다. 이 화면에서 `aria-invalid` grep = 0(짝 없는 것도 0) | 재현할 표면 없음 | N/A |
| A11Y-12 | A11Y | N/A | **이 화면에 좌측 필터 list item 표면이 없다** — 요구의 appliesTo(TierFilter·NoticeFilters·LoginHistoryFilters·GroupFilter·EsgCategoryFilter)에 해당하는 필터 패널이 존재하지 않는다. 이 화면에서 `aria-current` grep = 0(요구의 금지 축은 충족). **다만 요구의 취지(toggle 의 선택 상태를 단일 ARIA 속성으로)에 해당하는 표면이 둘 있고 서로 다르게 처리돼 있다** — 슬롯 셀은 `aria-pressed={selected}` 로 옳게(`CalendarGrid.tsx:148`), **일/주 뷰 토글은 `variant` 색상만으로**(`ScheduleCalendarPage.tsx:163,172` — `aria-pressed` 없음). 후자는 이 요구의 appliesTo 밖이므로 **A11Y-16(P1)으로 이관한다**(§3) — 요구 ID 를 늘려 잡지 않되 사실을 잃지도 않는다 | 재현할 표면 없음(이관된 사실의 재현은 §3 A11Y-16) | N/A |
| MOTION-01 | MOTION | N/A | **이 화면에 Modal 이 없다**(위 FEEDBACK-06 과 같은 사유). enter/exit transition 을 적용할 다이얼로그가 없다 | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | N/A | **이 화면은 토스트를 띄우지 않는다**(위 A11Y-01 과 같은 사유). exit 를 애니메이트할 toast 가 없다 | 재현할 표면 없음 | N/A |
| MOTION-03 | MOTION | N/A | **이 화면에 `transition`·`animation`·`transform` 선언이 0건**이다 — reduced-motion 게이트로 라우팅할 모션이 존재하지 않는다. 슬롯 선택도 배경색이 즉시 바뀔 뿐이다(`CalendarGrid.tsx:77-80` — transition 없음). 이 화면이 소비하는 DS 모션도 없다(모달·토스트 없음, 스켈레톤 없음) | 재현할 표면 없음 | N/A |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:282` — `{ path: '/reservations/schedule', element: <ScheduleCalendarPage />, implemented: true }`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:324-341`). **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(flex column)이다 | `/reservations/schedule` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지. 화면이 자체 header/sidebar 를 렌더하지 않는다 | pass |
| IA-02 | IA | 직접 | **충족.** `/reservations/schedule` 은 `nav-config.ts:188` 의 **잎**(`['예약 일정', '/reservations/schedule']`)이므로 `findNavLabel` 이 정확히 일치하는 잎을 찾아(`nav-config.ts:254-255`) AppHeader `<h1>` 에 **'예약 일정'** 을 그린다 — 가지 라벨('예약/신청 관리')로 폴백하지 않는다. 그리고 **이 화면에 in-content `<h1>` 이 없다** — 제목 소스가 AppHeader 하나뿐이라 모순이 없다(NFR-037 의 IA-02 gap 과 정확히 대조된다: 그쪽은 하위 라우트라 폴백이 일어나고 `FormPageShell` 이 두 번째 `<h1>` 을 만든다) | `/reservations/schedule` 진입 → AppHeader 제목이 '예약 일정'. `document.querySelectorAll('h1').length === 1`. 이 화면은 sub-route 가 없어 폴백 경로가 발생하지 않는다 | pass |
| IA-04 | IA | N/A | **이 화면은 list 화면이 아니다.** 요구의 템플릿(toolbar → count 요약 → SelectionBar → table → Pagination)은 행 목록을 전제하는데 이 화면의 본문은 **시간 격자**다 — 행이 시간 슬롯(고정 11개)이고 열이 날짜(고정 1 또는 7)라 결과 건수도 페이지도 성립하지 않는다. 슬롯 상세 패널의 예약 나열(FS-040-EL-009.3)은 선택한 슬롯의 전량이며 그 슬롯의 물리적 수용량이 상한이다 | 재현할 표면 없음 | N/A |
| IA-05 | IA | N/A | **이 화면에 create/edit 폼이 없다** — `/reservations/schedule` 은 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/reservations/schedule/*` 가 0건). 이 화면이 여는 폼은 **예약 도메인의 것**(`/reservations/:id/edit`)이고 그 계약은 NFR-037 이 판정한다(pass) | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **미충족.** 달력 조회 상태가 전부 컴포넌트 state 다 — `ScheduleCalendarPage.tsx:112-114` 의 `useState<CalendarView>('week')`(뷰) · `useState(today)`(기간 앵커) · `useState<SelectedSlot \| null>(null)`(선택 슬롯). 이 화면에서 `useSearchParams`·`useListState` grep = 0. **요구가 열거하는 list query state(page·filters·sort)의 달력 대응물이 바로 뷰·기간·선택 슬롯이며, 그중 어느 것도 URL 에 없다** | `/reservations/schedule` 에서 '주' → '다음' 3번 → 특정 슬롯 선택 → URL 이 `/reservations/schedule` **그대로**다. F5 → **이번 주 · 선택 없음**으로 되돌아간다. '예약 상세'로 넘어갔다가(`/reservations/rsv-1/edit`) 브라우저 Back → **보던 3주 뒤가 사라지고 오늘 주에 착지한다**(`anchor` 초기값이 `today`). '다음 주 화요일 10시 슬롯 좀 봐주세요' 링크를 만들 수 없다 — 달력은 기간을 지목해 공유하는 것이 용도인데 그 URL 이 존재하지 않는다 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell.tsx:484-493` 의 `<Outlet>` 바깥 ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 `App.tsx:311-315` 의 루트 경계가 잡는다. 이 화면은 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다. 이 화면에서는 '자체 경계를 두지 않고 셸 경계에 의존한다'만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx:326` 의 `<RequireAuth>` 가 AppShell 바깥에서, mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` → `isUnauthorized` → `notifySessionExpired()` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useCrudListQuery`)이 그 캐시를 통과하므로 자동으로 덮인다. **이 화면은 보존할 입력이 없어 재인증 손실이 없다** — EXC-19 의 dirty draft 문제가 여기엔 존재하지 않는다 | `/reservations/schedule?status=list:401` → 401 이 쿼리 캐시 onError 를 통과해 재인증 경로가 발화한다. 판정은 `RequireAuth`·`queryClient`·`session-expiry` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 상속 | **read 게이팅만 해당한다.** `AppShell.tsx:490-492` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 모든 라우트를 덮고, `route-resource.ts:36-46` 이 이 경로를 **자기 자신 잎** `page:/reservations/schedule` 로 해석해(`/reservations` 보다 길어서 이긴다) read 권한 없는 deep-link 를 `<ForbiddenScreen/>` 으로 막는다. **쓰기 게이팅은 이 화면에 대상이 없다** — create/update/delete 컨트롤이 0개다(NFR-037 의 EXC-03 gap 이 여기엔 성립하지 않는다). '예약 상세' 버튼은 write action 이 아니라 링크다 | read 권한을 끈 역할로 `/reservations/schedule` deep-link → 403 화면. 판정은 `RequirePermission`·`route-resource` 소유 문서를 따른다. ⚠ **다만 이 화면의 프론트 권한 리소스(`page:/reservations/schedule`)와 서버가 보는 데이터 권한(예약 도메인)이 서로 다른 축이다** — BE-040 §7.1 의 보안 판정. 그 불일치는 EXC-03 의 요구 범위(라우트 가드 + 쓰기 게이팅)를 벗어나며 §5 로 별도 이관한다 | 종속 |
| EXC-04 | EXC | N/A | **이 화면은 write 를 하지 않는다** — 요구의 appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. 낙관적 동시성 토큰을 실을 요청이 없다. (예약의 동시성 결함은 **NFR-037 §2 EXC-04 가 gap 으로 판정**했고, 이 화면은 그 데이터를 읽기만 한다 — 다른 관리자의 변경은 `staleTime` 30초 뒤 재조회로 반영된다) | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **이 화면에 user-initiated write 가 없다** — 중복 제출을 막을 submit/confirm 이 0개다. 버튼 5종은 전부 화면 로컬 state 변경이거나 라우팅이라 연타해도 요청이 나가지 않는다 | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 상속 | 이 화면의 요청은 `useCrudListQuery` 하나뿐이고, 화면 이탈(언마운트) 시 react-query 가 `queryFn({ signal })` 의 signal 로 `adapter.fetchAll(signal)` → `wait(LATENCY_MS, signal)` 를 abort 한다(`crud.ts:44,150`). **abort 가 error 로 노출되지 않는다** — 취소된 쿼리는 `error` 를 세팅하지 않으므로 FS-040-EL-010 배너가 뜨지 않는다. mutation 이 없어 `isAbort` 를 직접 부를 자리도 없다 | 조회 중(400ms 안에) 다른 메뉴로 이동 → 실패 배너·토스트가 뜨지 않고 요청이 취소된다. 판정은 `shared/async`·`queryClient`·`crud.ts` 소유 문서를 따른다 | 종속 |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **4** | STATE-02 · TOKEN-01 · IA-01 · IA-02 |
| `종속` | **8** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · EXC-01 · EXC-02 · EXC-03 · EXC-09 |
| `N/A` | **16** | STATE-04 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-01 · A11Y-02 · A11Y-11 · A11Y-12 · MOTION-01 · MOTION-02 · MOTION-03 · IA-04 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **2** | STATE-01 · IA-13 |
| **합계** | **30** | 4 + 8 + 16 + 2 = **30** ✔ |

> **P0 gap 2건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 둘 다 §5 로 이관한다.
> **N/A 16건은 이 화면이 읽기 전용 단일 뷰이기 때문이며 결함이 아니다**(§1.2). 다만 N/A 를 '문제 없음'으로 읽어서는 안 된다 — **이 화면에 없는 것이 문제인 축**(로딩 표현·live region·URL 상태·기간 외 필터)은 gap 또는 §3 에 남겼다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`) + `staleTime: 30_000` 을 상속하므로 재조회 중 격자가 이전 데이터를 유지한다. **뷰 전환·기간 이동이 재조회를 유발하지 않는다** — `days` 가 `anchor` 에서만 파생되고(`ScheduleCalendarPage.tsx:124`) 쿼리 키가 기간과 무관하다. 6개월 전으로 이동해도 요청이 0건이다 | '다음'을 10번 눌러도 네트워크 요청이 0건. 30초 후 재조회 시 격자가 비지 않는다 | pass |
| STATE-05 | P1 | **미충족.** 격자에 Empty 컴포넌트가 없다 — 예약 0건이면 셀이 '0/4' 로 채워질 뿐이다(§2 STATE-01). 패널의 '이 시간대에 예약이 없습니다.'(`ScheduleCalendarPage.tsx:224`)는 맨 문자열이고 3분기(진짜 빈/검색/필터) 구분도 복구 액션(예: 이 슬롯에 예약 등록)도 없다 | 예약 0건 상태로 진입 → 격자에 Empty 표면이 0개. 슬롯 클릭 → 한 줄 문구만, CTA 없음 | gap |
| STATE-06 | P1 | **충족.** 예약 관리에서 저장·삭제하면 `useCrudCreate/Update/Delete` 가 `['reservations','list']` 를 무효화하고(`crud.ts:179-181,198-201,217-219`) **이 화면이 같은 키를 읽으므로 함께 갱신된다** — 달력이 stale 해지지 않는다. 이 화면 자신은 write 가 없어 무효화할 것도 없다 | 예약 등록 → 달력으로 이동 → 새 예약이 이미 셀에 있다(수동 새로고침 불필요) | pass |
| COMP-11 | P1 | **N/A(표면 부재) — 그러나 기록한다.** 기간 필터 컴포넌트가 없다. 달력의 기간 이동(이전/오늘/다음 + 일/주)이 **범위 선택을 대신하므로** `start ≤ end` 검증이 원리적으로 성립하지 않고(범위가 항상 유효하다) preset('오늘')도 이미 있다 — 요구의 취지는 이 화면에서 다른 방식으로 충족된다. **다만 선택 범위가 URL 에 없다**(§2 IA-13) — 요구의 마지막 절('선택 범위는 URL list-state 에 반영')만 미충족이며 IA-13 으로 계상했다 | 기간 이동이 항상 유효한 범위를 만든다(잘못된 범위를 입력할 수단이 없다) | N/A |
| A11Y-16 | P1 | **미충족 — 이 화면의 핵심 결함이다.** `CalendarGrid` 는 **라이브러리가 아니라 손으로 그린 신규 인터랙티브 표면**이다(파일 헤더: '라이브러리 없이 직접 그린 달력 격자'. FullCalendar 등 미도입 — 요구의 근거 문장이 지목한 바로 그 상황). 요구의 7개 축 중 4개가 깨진다. **① semantic role 불완전**: `role="grid"`(`CalendarGrid.tsx:121`) 아래에 **`role="row"` 가 하나도 없다** — 각 슬롯 행을 감싸는 것은 `<div style={{ display: 'contents' }}>`(`:134`, 역할 없음)이고 `columnheader`(`:124,128`)·`rowheader`(`:135`)가 행 안에 있지 않다. 셀도 `role="gridcell"` 이 아니라 맨 `<button>`(`:142`)이다 → **ARIA grid 구조가 성립하지 않아 보조기기의 행/열 탐색이 동작하지 않는다.** **② keyboard 조작성**: grid 패턴은 셀 하나만 Tab 정지점으로 두고 방향키로 이동하는데 **화살표 키 핸들러가 0개**다 → 주 뷰에서 **버튼 78개(헤더 제외 77 + )가 전부 Tab 정지점**이고, 격자를 지나치려면 Tab 을 77번 눌러야 한다. **③ 비동기 status live-region announce**: 슬롯을 선택해 패널이 열려도 포커스를 옮기지 않고 live region 도 없다(`ScheduleCalendarPage.tsx:214` 는 `setSelected` 만) → 스크린리더 사용자는 화면 어딘가에 카드가 생긴 것을 모른다. 재조회로 셀 숫자가 바뀌어도 침묵한다. **④ 이중(비색상) state 인코딩**: 일/주 토글이 `variant` 색상만(`:163,172` — `aria-pressed` 없음) · '오늘' 열 헤더가 primary 색상만(`CalendarGrid.tsx:128,42-45` — `todayHeadStyle` 은 색만 다르다) · 예약 칩이 상태를 톤 색상만으로(`:154-158` — 라벨은 '시각 + 고객명') 구분한다. **옳게 된 축**: 셀 `aria-pressed={selected}`(`:148`) · 셀 `aria-label`(`:147` — '<날짜> <슬롯> — 예약 N건 / 수용 M건') · focus-visible 링(`tds-ui-focusable`) · '마감'의 색+문구 이중 인코딩(`:162-164`) | 스크린리더로 `/reservations/schedule` 탐색 → 격자의 행/열 구조가 읽히지 않는다(`role="row"` 부재). 키보드로 격자 통과 → Tab 77회. 슬롯 선택 → 아무것도 announce 되지 않는다. 색각 이상 시뮬레이션 → 어느 뷰가 선택됐는지·어느 열이 오늘인지·칩이 요청인지 확정인지 구별할 수 없다. axe 로 grid 구조 위반 검출 가능 | **gap** |
| A11Y-06 | P1 | skip link 는 `AppShell.tsx` 소유. **이 화면에서 특히 값이 크다** — Tab 정지점이 77개 이상이라 우회로 없이는 격자를 지나칠 수 없다 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 이동 + announce 는 `AppShell.tsx:309-321` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **부분 미충족.** 격자 셀은 `<button>` 이라 키보드로 활성화된다 ✓. 그러나 **칩(FS-040-EL-008.5)은 focusable 이 아니다** — `CalendarGrid.tsx:151-160` 의 `StatusBadge` 에 클릭 핸들러도 tabIndex 도 없다. 파일 헤더 주석(`:4-5`)이 '칩 클릭 → 해당 예약 수정으로 이동'이라 서술하지만 **미구현이며 클릭은 셀 `<button>` 에 흡수된다** — 즉 마우스 경로조차 없다. 예약으로 가는 유일한 경로는 슬롯 선택 → 패널의 '예약 상세'(`ScheduleCalendarPage.tsx:238-243`, focusable ✓)다 | 칩을 Tab 해도 도달하지 않는다. 칩을 클릭하면 그 예약이 아니라 슬롯이 선택된다. 주석과 코드가 어긋난다(FS-040 §7 #7) | gap |
| A11Y-09 | P1 | 이 화면의 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(시간 행 헤더 `CalendarGrid.tsx:47-58`) · `surface-default` 위 `text-muted`(수용량 텍스트 `:88-92`) · `feedback-info-surface` 위 셀 내용(선택된 셀 `:77-80`) · `feedback-danger-text`('마감' `:94-98`) | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다 | 종속 |
| IA-03 | P1 | **N/A** — 이 화면은 top-level leaf 다(`/reservations/schedule` 이 `nav-config` 의 잎). non-top-level route 가 아니므로 breadcrumb 요구의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족.** 격자가 **bounded 가로 스크롤 컨테이너 안에 있다** — `CalendarGrid.tsx:15,118` 의 `overflowX: 'auto'` 래퍼 + `:26` 의 `minWidth: calc(var(--tds-space-6) * 12)` + `:69` 의 셀 `minWidth: calc(var(--tds-space-6) * 3)`. **좁은 폭에서 페이지가 아니라 이 컨테이너가 스크롤된다** — 요구가 wide table 에 바라는 바를 이 화면은 이미 한다(NFR-037 의 `CrudTable` 과 대조된다: 그쪽엔 래퍼가 없다). 컨트롤 행도 `flexWrap: 'wrap'`(`:52,60`)으로 접힌다. **미충족**: 최소 지원 폭 선언이 없고, 셀 버튼의 최소 높이가 `calc(var(--tds-space-6) * 2)`(`:68`)라 coarse pointer 의 touch-target 최소치 충족 여부가 토큰 값에 달려 있다(미검증). identity 열(시간) sticky 없음 | 768px·375px 에서 `/reservations/schedule` → 격자 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다(코드 대조상 성립). 주 뷰에서 좌측 시간 열이 스크롤과 함께 사라진다(sticky 아님) | 부분 pass — §5 |
| ERP-01 | P1 | **충족.** 상태→tone 매핑이 섹션 공유 레지스트리 하나다 — `_shared/booking.ts:27-41` 의 `STATUS_META` → `bookingStatusTone`. 이 화면의 칩(`CalendarGrid.tsx:156`)과 패널 배지(`ScheduleCalendarPage.tsx:231`)가 그것을 쓰고, 예약 목록·예약 폼·상담 예약도 같다. per-page helper 0건 | `bookingStatusTone` 이 단일 export. 달력의 '확정' 칩과 예약 목록의 '확정' 배지가 같은 tone | pass |
| ERP-02 | P1 | **N/A** — `CrudTable` 을 쓰지 않는다(손으로 그린 CSS grid). table density 토큰의 대상이 아니다. 셀 패딩은 이 화면이 자체 선언한다(`CalendarGrid.tsx:64-67` 등 — 전부 space 토큰) | 재현할 표면 없음 | N/A |
| ERP-03 | P1 | **미충족.** 주 뷰 격자가 세로 11행 + 가로 8열이라 스크롤이 실제로 일어나는데 **sticky 헤더가 없다** — 날짜 헤더(`CalendarGrid.tsx:124-131`)도 시간 열(`:135-137`)도 `position: sticky` 가 아니다. 가로로 스크롤하면 시간이, 세로로 스크롤하면 날짜가 사라진다 — **격자에서 축 라벨 상실은 표에서보다 치명적이다**(셀이 숫자뿐이라 맥락 없이는 읽을 수 없다) | 주 뷰를 좁은 폭에서 가로 스크롤 → 좌측 '시간' 열이 함께 밀려 나가 어느 시간대인지 알 수 없게 된다. `position: sticky` grep = 0 | gap |
| ERP-04 | P1 | **N/A** — 정렬 가능 컬럼 헤더의 대상(행 목록)이 아니다. 격자의 축(시간·날짜)은 자연 순서가 고정이며 정렬 개념이 성립하지 않는다 | 재현할 표면 없음 | N/A |
| ERP-05 | P1 | **N/A** — Pagination 이 없다(§2 IA-04) | 재현할 표면 없음 | N/A |
| ERP-06 | P1 | **부분 미충족.** microcopy 는 존댓말로 일관되나 **두 뷰의 날짜 표기 형식이 다르다** — 일 뷰 `formatDayLabel(anchor)` → '7월 16일 (목)', 주 뷰 `` `${days[0]} ~ ${days[days.length-1]}` `` → '2026-07-13 ~ 2026-07-19'(ISO 원본 문자열 연결, `ScheduleCalendarPage.tsx:150-151`). 요구의 '날짜 규칙이 shared/format 을 경유'에 어긋나며 같은 자리에서 뷰만 바꿔도 표기 체계가 바뀐다 | 일 뷰 ↔ 주 뷰 전환 → 기간 라벨의 날짜 형식이 바뀐다 | gap |
| ERP-08 | P1 | **부분 충족.** 인원이 `formatNumber(reservation.partySize)` 경유 ✓(`ScheduleCalendarPage.tsx:235`). 셀의 예약 수/수용량은 `String(cell.booked)`/`String(cell.capacity)` **raw toString** 이다(`CalendarGrid.tsx:147,163`) — 요구의 '셀은 String()/toString() 을 임의 호출하지 않는다'에 어긋난다(값이 작아 실질 영향은 없으나 규칙 위반이다). 날짜는 `_shared/calendar.ts` 의 `formatDayLabel` 경유 ✓ — **다만 그것은 `shared/format` 이 아니라 섹션 공용 포매터다**(의도된 분리로 보인다: 예약 날짜는 ISO 문자열이지 Date 가 아니다) | `CalendarGrid.tsx` 에 `String(` 직접 호출 3건. 상대시간 없음(미래 일정이라 적절) | gap |
| ERP-09 | P2 | **미충족.** 이 화면의 시간 판정이 전부 브라우저 로컬 TZ 다 — `ScheduleCalendarPage.tsx:111` `toDateString(new Date())`('오늘'), `_shared/calendar.ts:58-64` `startOfWeek`(로컬 `getDay()`), `:87-89` `isToday`, `:50-55` `addDays`. `calendar.ts` 헤더가 '로컬 타임존 기준'이라 **가정을 명시**하지만 표시 TZ 정책(Asia/Seoul 고정)은 없다. **추가로 `today` 가 렌더 시점 계산이라 자정을 넘겨 화면을 열어 두면 '오늘'이 어제를 가리킨다**(FS-040 §7 #3) | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 `/reservations/schedule` 진입 → **한국 기준 '오늘'과 다른 열이 강조되고, '오늘' 버튼이 다른 날짜로 이동한다.** 예약의 `date` 문자열 자체는 TZ 무관이라 셀 배치는 안 흔들리지만 **'오늘'·주 경계 판정이 흔들린다** | gap |
| ERP-12 | P1 | **N/A** — 이 화면에 내보낼 list 가 없다(격자는 행 목록이 아니다). 예약 내보내기는 예약 목록의 관심사다(NFR-037 §5 #13) | 재현할 표면 없음 | N/A |
| ERP-13 | P1 | **N/A** — 이 화면의 사용자 대상 문구에 `{label}`/record 이름을 주입하는 조사 템플릿이 없다. '이 시간대에 예약이 없습니다.' · '예약 일정을 불러오지 못했습니다.' 는 고정 문구이고, 리터럴 '이(가)/을(를)/은(는)' grep = 0 | 재현할 표면 없음 | N/A |
| ERP-15 | P1 | **부분 충족.** 렌더 규모가 **구조적으로 고정**돼 있다 — 셀은 언제나 11 × (1 또는 7) = 최대 77개다. 예약이 1,000건이어도 격자는 77셀이다 ✓. **그러나 셀마다 `slotCell(all, day, slot)` 이 전량을 훑는다**(`CalendarGrid.tsx:139` → `schedule-data.ts:52-56` → `_shared/reservation.ts:135-149` → `reservationsOnDate` 가 `list.filter`) → **77 × N 회 스캔이 매 렌더** 일어난다. 1,000건이면 77,000회, `useMemo` 없이 렌더마다 반복된다. 칩 수 상한도 없어 겹치는 예약이 많은 셀이 세로로 무한히 늘어난다(FS-040 §7 #12). 가로 스크롤은 충족(§3 IA-14) | 1,000건 시드로 주 뷰 진입 → 77,000회 필터가 매 렌더. 한 슬롯에 20건을 겹치면 그 행이 화면 밖까지 늘어난다 | gap |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 이 화면의 조회도 상한이 없다 | 응답하지 않는 백엔드를 붙이면 힌트가 '불러오는 중…'에서 멈추고 **격자는 '0/4' 로 완성된 채 영원히 거짓말한다**(§2 STATE-01 과 곱해지는 결함) | gap |
| EXC-06 | P1 | **미충족.** 조회 실패가 status 를 보지 않는다 — `ScheduleCalendarPage.tsx:135` 의 `error !== null` 하나로 401/403/429/500/504 가 전부 '예약 일정을 불러오지 못했습니다.' 한 문구가 된다. 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 이 화면이 읽지 않는다 | `?status=list:403` 과 `?status=list:500` 이 **같은 배너**를 낸다. BE-040 §7.1 이 지적한 권한 불일치 상황(프론트 가드 통과 후 서버 403)에서 운영자는 원인을 알 수 없다 | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 | 오프라인 전환 시 배너가 없다 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf 단일 뷰). 404 를 구분할 대상 id 가 이 화면에 없다. 이 화면이 여는 폼(`/reservations/:id/edit`)의 404 처리는 NFR-037 §3 EXC-12 가 판정한다(종속·충족) | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk 작업·다중 선택이 없다. 선택은 슬롯 하나(단일)이며 파괴적이지 않다 | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **미충족.** 조회 실패 배너에 참조 코드가 없다 — `ScheduleCalendarPage.tsx:138-146` 이 `referenceOf(cause)` 를 쓰지 않는다(폼의 `FormServerError` 는 쓴다). raw 서버 body·stack 을 노출하지는 않으므로 요구의 후반('never-leak')은 충족 | `?status=list:500` → 배너에 복사 가능한 오류 코드 **없음**. 운영자가 신고할 때 붙일 코드가 없다 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 상수다. 실제 예산은 BE-040-EP-01(= BE-037-EP-01)의 응답 크기가 정해지면 A63 이 확정한다 |
| 첫 렌더(격자) | 미정 | — | 측정 미실시 |
| **재조회 횟수** | **화면 진입당 최대 1회 / 30초. 뷰·기간 조작은 0회** | `staleTime: 30_000` · 쿼리 키가 기간과 무관(`['reservations','list']`) | **이 화면의 강점이다** — '다음'을 50번 눌러도 요청이 0건이다. 범위 조회(`?from=&to=`)를 도입하면 이 성질이 사라진다(BE-040 §7.2) |
| 예약 목록과의 공유 | 두 화면을 오가도 30초 안에는 요청 0회 | 같은 쿼리 키 | 레이트리밋(분당 120)을 두 화면이 공유하지만 소모 속도는 낮다 |
| DOM 규모 | **구조적 상한 있음** — 셀 최대 77개(11 슬롯 × 7일) + 헤더 8개 | `DAY_SLOTS` 11 고정 · 열 1 또는 7 | 예약이 1,000건이어도 셀 수는 불변. **단 셀 안의 칩 수는 상한이 없다**(§3 ERP-15) |
| CPU | **O(셀 × N) — 위험** | `slotCell` 이 셀마다 전량 스캔(`CalendarGrid.tsx:139`), `useMemo` 없이 렌더마다 | 1,000건 × 77셀 = 77,000회 필터/렌더. 데이터가 아니라 **셀 수 × 건수**로 늘어난다 |
| 메모리 | 예약 전량을 캐시에 상주 | `fetchAll` 전량 | 범위 조회 부재의 결과(BE-040 §7.2) |
| 번들 | **이 화면 전용 의존 0** | 달력 라이브러리 미도입 — `CalendarGrid` 를 CSS grid 로 직접 구현(파일 헤더가 근거를 밝힌다) | ⚠ **이 선택의 대가가 §3 A11Y-16 gap 이다** — FullCalendar 등은 grid ARIA·키보드 이동을 이미 갖고 있다. quality-bar A11Y-16 의 근거 문장('Radix/TanStack Table/FullCalendar 도입 시 회귀 방지')이 예상한 상황의 **거울상**이다: 라이브러리를 안 썼기 때문에 계약을 손으로 지켜야 하는데 지키지 않았다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). 단 status 별 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) · **컨트롤까지 사라진다**(§5 #5) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✖ **격자가 '0/4' 로 완성돼 보인다**(§2 STATE-01) |
| 예약 0건 | 빈 상태 | ✖ 최초 로드와 구별 불가(§2 STATE-01 · §3 STATE-05) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 대기 + **거짓 '0/4' 유지**(§3 EXC-05) |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **보존할 입력이 없어 손실 없음**(§2 EXC-02) |
| 다른 관리자의 예약 변경 | 30초 내 반영 | △ `staleTime` 30초 뒤 재조회 시 반영. **알림 없이 셀 숫자가 바뀐다**(§3 A11Y-16 announce 부재) |
| 같은 관리자의 예약 변경 | 즉시 반영 | ✔ 쿼리 키 공유로 자동 무효화(§3 STATE-06) |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| 자원 카탈로그 조회 실패(연결 후) | 수용량 미상 표시 | ✖ **`capacity = 0` → 격자 전체가 거짓 '마감'**(BE-040 §7.4 · §7.6 #3 — 차단 사안) |

### 4.3 이 화면이 답하지 못하는 운영 질문

quality-bar 의 축이 아니지만 화면의 목적(FS-040 §1)에 비추어 기록한다 — **§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '이번 주 **확정** 예약만 보고 싶다' | 불가 — 이 화면에 상태 필터가 없다. 예약 목록에는 있으나 거기엔 기간 필터가 없다(NFR-037 §3 COMP-11) — **두 화면 어디서도 '이번 주 확정 예약'을 볼 수 없다** |
| '이 고객의 예약이 언제인가' | 불가 — 검색이 없다(§2 COMP-10 N/A). 예약 목록에서 찾아야 한다 |
| '**자원별로** 언제가 비었나' | 불가 — 열이 날짜다. 셀의 '2/4'는 **어느** 자원 2개가 찼는지 말하지 않는다 |
| '이 슬롯에 예약을 넣자' | 불가 — 빈 슬롯을 클릭해도 등록 경로가 없다(FS-040 §7 #8) |
| '08:00 예약이 왜 안 보이나' | **답이 없다** — 영업시간(09~20시) 밖 예약은 격자에 나타나지 않는데 폼은 경고 없이 저장한다(BE-040 §7.5 · FS-040 §7 #11) |
| '한 달을 보고 싶다' | 불가 — 일·주 뷰뿐 |

### 4.4 데이터 보존 · 감사

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 보존·복구할 상태가 없다 |
| 개인정보 열람 | ⚠ **한 화면이 일주일치 모든 고객의 이름과 방문 시각을 동시에 렌더한다**(`CalendarGrid.tsx:157` 의 칩 라벨 = `'<시작시각> <고객명>'`). 감사 로그는 `GET /api/reservations` 한 줄만 남지만 운영자가 본 것은 전량이다 — **접근 범위와 로그 입도가 어긋난다**(BE-040 §7.3a) |
| 권한 통제 | ⚠ `page:/reservations/schedule` 만 끄는 것은 **아무것도 숨기지 않는다** — 같은 데이터가 예약 목록에 있다(BE-040 §7.1). 관리자가 '달력을 껐으니 안 보인다'고 믿으면 오해다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | 격자에 로딩 표현이 없다 — `all = data ?? []` 라 도착 전에도 셀 77개가 '0/4' 로 **완성된 사실처럼** 렌더되고, 슬롯을 열면 '이 시간대에 예약이 없습니다'라는 **거짓 빈 상태**까지 보인다. `isFetching` 을 loading 으로 직결(`ScheduleCalendarPage.tsx:118`)한 것은 부차적 — 근본은 first-load 상태 자체의 부재다 | 이 화면 | A11 (FS-040 §7 #5) |
| 2 | **IA-13** | **P0** | 뷰·기간·선택 슬롯이 전부 `useState` — URL 에 없다. F5·Back 이 보던 주를 잃고 기간 링크를 공유할 수 없다. **달력은 기간을 지목해 공유하는 것이 용도라 이 결함이 특히 아프다** | 이 화면 | A11 (FS-040 §7 #14) |
| 3 | **A11Y-16** | P1 | 손으로 그린 격자가 a11y 계약 4축을 어긴다 — `role="row"` 부재(grid 구조 미성립) · `role="gridcell"` 부재 · **화살표 키 이동 없음(주 뷰 Tab 77회)** · 슬롯 선택 미announce · 뷰 토글/'오늘' 열/칩 상태의 **색상 단독 인코딩** | 이 화면 | **A11 change_request (FS-040 §7 #2 · #6)** |
| 4 | STATE-05 | P1 | 격자에 Empty 표면이 없고 패널 빈 상태에 CTA 가 없다 | 이 화면 | A11 |
| 5 | — | P1 | **조회 실패가 화면 전체를 대체해 뷰·기간 컨트롤까지 지운다**(`ScheduleCalendarPage.tsx:135-148` 이른 반환) — quality-bar 의 어느 ID 에도 정확히 걸리지 않지만 STATE-02 의 취지(복구 경로 제공)를 형해화한다. 실패 상태에서 운영자는 보던 기간이 어디였는지도 알 수 없다 | 이 화면 | A11 (FS-040 §7 #10) |
| 6 | A11Y-08 | P1 | 칩이 focusable 도 clickable 도 아니다 — **`CalendarGrid.tsx:4-5` 주석이 미구현 동작('칩 클릭 → 예약 수정으로 이동')을 서술한다** | 이 화면 | A11 (FS-040 §7 #7) |
| 7 | ERP-03 | P1 | sticky 헤더 없음 — 격자를 스크롤하면 시간/날짜 축 라벨이 사라진다. **셀이 숫자뿐이라 표에서보다 치명적이다** | 이 화면 | A11 |
| 8 | ERP-06 | P1 | 일 뷰('7월 16일 (목)')와 주 뷰('2026-07-13 ~ 2026-07-19')의 날짜 표기 형식이 다르다 | 이 화면 | A11 (FS-040 §7 #4) |
| 9 | ERP-08 | P1 | 셀의 예약 수/수용량이 `String()` raw toString | 이 화면 | A11 |
| 10 | ERP-15 | P1 | `slotCell` 이 셀마다 전량 스캔 — 77 × N 회가 `useMemo` 없이 매 렌더. 셀당 칩 수 상한 없음 | 이 화면 | A11 · A41 |
| 11 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — **STATE-01 과 곱해져 '영원히 0/4'가 된다** | 앱 전역 | A40 · A41 |
| 12 | EXC-06 | P1 | 조회 실패가 status 를 보지 않고 한 문구로 붕괴 — BE-040 §7.1 의 권한 불일치 상황에서 원인 파악이 불가능하다 | 이 화면 + 앱 전역 | A11 · A41 |
| 13 | EXC-11 | P1 | 오프라인 감지 없음 | 앱 전역 | A40 |
| 14 | EXC-20 | P1 | 조회 실패에 참조 코드 없음 | 이 화면 + `CrudListShell` | A11 · A41 |
| 15 | IA-14 | P1 | 가로 스크롤은 충족(래퍼 있음). **미충족**: 최소 지원 폭 선언 없음 · 시간 열 sticky 없음(#7 과 동일 사안) · touch-target 미검증 | 앱 전역 + 이 화면 | A11 |
| 16 | ERP-09 | P2 | 시간 판정이 전부 browser-local — 표시 TZ 정책 없음. **추가로 `today` 가 렌더 시점 고정이라 자정을 넘기면 '오늘'이 어제가 된다** | 섹션 공용(`_shared/calendar.ts`) + 이 화면 | A63 · A11 |
| 17 | — | — | **BE-040 §7.1 (보안)** — 프론트 권한 리소스(`page:/reservations/schedule`)와 서버 데이터 권한(예약 도메인)이 다른 축이다. 달력만 끄는 것은 아무것도 숨기지 않고, 달력만 켜면 프론트를 통과한 뒤 서버 403 을 받는다 | 앱 전역(권한 모델) | **A63 · A11** |
| 18 | — | — | **BE-040 §7.4 (차단)** — 자원 카탈로그(BE-037-EP-06)를 연결하면 `capacity = 0` 이 되어 격자 전체가 거짓 '마감'이 된다. 로딩·실패 표면이 선행돼야 한다 | 이 화면 | **A11 · A41** |
| 19 | — | — | **BE-040 §7.5 / FS-040 §7 #11** — 영업시간(09~20시) 밖 예약이 격자에서 사라지는데 폼은 경고 없이 저장한다. 서버가 막든 달력이 보이든 결정 필요 | 도메인 | **A11 · A01** |
| 20 | — | — | **BE-040 §7.4 / FS-040 §7 #1** — 수용량 모델 분열(자원 개수 = 배타 점유 vs `capacity` = 인원 수용). 같은 사실을 달력('2/4')과 예약 목록('중복' 배지)이 반대로 말한다 | 도메인 | **A11 · A01** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.

### 6.1 실패 재현 (`?fail=`) — 이 화면의 실제 scope 와 op

**이 화면에는 전용 scope 가 없다.** 예약 어댑터를 그대로 읽으므로 scope 는 **`'reservations'`** 다(`_shared/reservation-store.ts:119`). **이 화면이 실제로 거는 op 은 `list` 하나뿐이다** — `fetchAll` 만 부르기 때문이다(`detail`·`save`·`delete` 는 이 화면에서 발화하지 않는다).

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-040-EL-010 조회 실패 대체 화면(= 화면 전체) |
| `detail` · `save` · `delete` | ✕ — 이 화면은 부르지 않는다 | 해당 없음(예약 폼으로 이동한 뒤에야 발화한다) |

**사용 형태**(`shared/crud/dev.ts:81-93`): `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all` · 쉼표 다중.

```
/reservations/schedule?fail=list                 조회 실패 → STATE-02 확증 + '컨트롤이 함께 사라진다' 확증(§5 #5)
/reservations/schedule?fail=reservations:list    위와 동일(scope 명시)
/reservations/schedule?fail=all                  위와 동일 — 이 화면의 op 이 list 뿐이라 결과가 같다
/reservations/schedule?fail=save                 아무 일도 일어나지 않는다 — 이 화면은 save 를 부르지 않는다
```

⚠ **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고 `LATENCY_MS = 400` 이 고정이다(`?delay=` 는 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다). **§2 STATE-01 의 gap 을 눈으로 확증하려면 400ms 창이 필요하다** — `LATENCY_MS` 를 임시로 올리거나 네트워크 스로틀을 걸고 진입해 **격자가 이미 '0/4'로 완성돼 있는지**를 본다.

### 6.2 status 재현 (`?status=`)

형태(`dev.ts:24,56-71`): `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능한 code 는 9개(`dev.ts:27-37`). **이 화면에서 의미 있는 것은 `list` op 뿐이다.**

```
/reservations/schedule?status=list:401   401 → 쿼리 계층 재인증 (EXC-02 확증)
/reservations/schedule?status=list:403   403 → BE-040 §7.1 의 권한 불일치 상황 재현.
                                              EXC-06 gap 확증: 500 과 같은 배너가 뜬다
/reservations/schedule?status=list:500   500 → EXC-20 gap 확증: 참조 코드가 없다
/reservations/schedule?status=list:429   429 → 예약 목록과 레이트리밋을 공유함을 확인
```

`409`·`412`·`422` 는 **이 화면에서 발생할 수 없다** — 쓰기가 없다(§2 EXC-04/EXC-08 N/A 와 같은 이유).

### 6.3 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| STATE-01 (gap) | `ScheduleCalendarPage.tsx:116-121`(`isFetching: loading`) · `:122`(`data ?? []`) · `:203-207`(loading 이 힌트만 바꾼다) · `CalendarGrid.tsx:139,162-164`(로딩 무관하게 '0/4') |
| STATE-02 (pass) | `ScheduleCalendarPage.tsx:135-148` |
| IA-02 (pass) | `nav-config.ts:188,253-263` · `AppHeader.tsx:92,101` · 이 화면에 `<h1>` 0건 |
| IA-13 (gap) | `ScheduleCalendarPage.tsx:112-114`(`useSearchParams` 미사용) |
| A11Y-16 (gap) | `CalendarGrid.tsx:121`(`role="grid"`) · `:134`(`display:contents` — `role="row"` 없음) · `:124,128,135`(헤더가 행 밖) · `:142-149`(`<button>`, 화살표 키 없음) · `:128,42-45`('오늘' 색상만) · `:154-158`(칩 톤만) · `ScheduleCalendarPage.tsx:162-179`(뷰 토글 `aria-pressed` 없음) · `:214`(선택 시 announce 없음) |
| BE-040 §7.1 (권한) | `route-resource.ts:36-46` · `nav-config.ts:184-189` · `AppShell.tsx:490-492` |
| BE-040 §7.4 (수용량) | `schedule-data.ts:39-41,52-56` · `resources.ts:17-18,29-34` · `schedule.test.ts:51-63` |
| ERP-09 | `ScheduleCalendarPage.tsx:111` · `_shared/calendar.ts:27-31,58-64,87-89` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **16건 전부**, 그리고 §1.2 에 '왜 이 화면은 N/A 가 많은가'를 밝혔다
- [x] 모든 `pass` 에 코드 근거(파일:라인)
- [x] 모든 `gap` 에 재현 가능한 측정 기준
- [x] §2.1 산수 검산 — 4 + 8 + 16 + 2 = **30** ✔
- [x] **`schedule-data.ts` 에 심이 없고 달력이 예약 엔드포인트를 재사용함을 F2 기준으로 재확인**했다 — §6.1 의 scope/op 표가 그 결과다(전용 scope 없음 · op 은 `list` 하나)
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(COMP-11·IA-03·ERP-02/04/05/12/13·EXC-12/14/18)은 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 `?fail=` scope(`reservations`)와 이 화면이 거는 op(`list` 하나)을 코드에서 확인**해 적었다. **`?delay=` 를 쓰지 않았다** — 이 화면에 없음을 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-040 §7 · BE-040 §7.6 과 같은 사안을 가리키는지 대조했다
- [x] **NFR-037 과 겹치는 판정(데이터 계층·공용 프레임워크)을 반복하지 않고 참조**했다 — 두 화면이 같은 어댑터·쿼리 키를 공유한다는 사실을 §1 에 밝혔다
