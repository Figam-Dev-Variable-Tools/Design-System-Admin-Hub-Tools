---
id: NFR-026
title: "1:1 문의 비기능 명세"
functionalSpec: FS-026
backendSpec: BE-026
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-026. 1:1 문의 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-026 1:1 문의 (`/support/tickets` · `/support/tickets/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-026(요소·예외) · BE-026(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-026 §7 · BE-026 §7.11 과 번호가 일치해야 한다 |
| 판정 근거 | **E2E 미실행 — 판정 근거는 F2(`3cd3078`) 코드 대조다**(§6) |

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
| STATE-01 | STATE | 직접 | **미충족.** `TicketListPage.tsx:111` 이 `isFetching: loading` 으로 직결한다 — 공용 `useCrudList` 의 `firstLoading = isFetching && data === undefined`(`shared/crud/useCrudList.tsx:71`)를 쓰지 않는다. 그 `loading` 이 `TicketListPage.tsx:263` 의 스켈레톤 분기와 `:221` 의 요약 문구를 함께 지배한다. `useCrudListQuery` 는 `placeholderData: (previous) => previous`(`crud.ts:151`)로 이전 데이터를 유지하는데도 화면이 그 이득을 스스로 버린다. 상세는 반대로 정상 — `TicketDetailPage.tsx:196` 이 `ticket === undefined` 로 판정한다 | `/support/tickets` 진입 → 데이터 렌더 확인 → 필터 변경 등으로 재조회 유발(또는 `staleTime` 30초 경과 후 재진입). **표가 5행 스켈레톤으로 바뀌고 '전체 N건'이 '불러오는 중…'으로 덮이면 gap** | **gap** |
| STATE-02 | STATE | 직접 | **부분 미충족.** 목록은 충족 — `TicketListPage.tsx:124-137` 이 `<Alert tone="danger">` + '다시 시도'(`refetch`)를 렌더하고 error toast 를 쓰지 않는다. **상세가 미충족** — `TicketDetailPage.tsx:167-178` 의 실패 Alert 에 **'다시 시도' 컨트롤이 없고 '목록으로'만 있다**(FS-026-EL-016) | `/support/tickets/:id?status=detail:500` 진입. **danger Alert 는 뜨지만 '다시 시도' 버튼이 없으면 gap** | **gap** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① 페이지네이션이 없고(FS-026-EL-008 — 전량 렌더) ② **행 선택이 없다**(삭제·일괄 작업이 범위 밖 — BE-026 §7.7). 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션·`selectedIds` 도입 시 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/support/tickets/**` · `pages/support/_shared/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 3.5)`(`TicketListPage.tsx:72`) 같은 space 토큰 배수로만 표현한다 | `grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/support/tickets apps/admin/src/pages/support/_shared` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`TicketListPage.tsx:313` 상세 버튼 · `TicketDetailPage.tsx:184` 목록으로 · `TicketWorkspace.tsx:163` 담당 입력) · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>`. **이 화면이 focus ring 을 직접 선언하지 않는다** — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `TicketListPage.tsx:268`) · Toast(`TicketDetailPage.tsx:152`) · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다** | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`TicketDetailPage.tsx:197` · `TicketWorkspace.tsx:121,260`) · Toast · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`TicketDetailPage.tsx:193`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-59`) — 값을 손으로 재현하지 않는다. **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/support/tickets/:id` 의 '문의 처리' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **미충족.** `TicketListPage.tsx:142-147` 이 `<SearchField value={keyword} onChange={setKeyword} />` 로 **원시 setter 를 직결**한다 — 공용 `useDebouncedSearch`(`shared/crud/useDebouncedSearch.ts`, `isComposing`·`compositionstart/end`·250ms 디바운스·최소 길이를 전부 구현)를 **쓰지 않는다**. `SearchField` 자체에도 조합 처리가 없다(`packages/ui/.../SearchField.tsx:66` — `onChange` 를 그대로 흘린다). **완화 요인**: 검색이 클라이언트 필터라(`searchTickets`) 자모마다 네트워크 요청이 나가지는 않는다 — 그러나 요구는 '조합 중 커밋 금지 + 디바운스'이며 조합 중 키 입력이 그대로 필터에 커밋된다 | `/support/tickets` 검색창에 IME 로 '홍길동' 입력. **조합 중 '홍ㄱ'·'홍기' 같은 부분 문자열이 즉시 필터에 반영돼 표가 깜빡이면 gap.** 조합 중 Enter 가 가로채이지 않는 것도 확인 | **gap** |
| FEEDBACK-02 | FEEDBACK | 상속 | **이 화면에 파괴적 서버 액션이 없다** — 삭제가 범위 밖이다(BE-026 §7.7). 걸리는 표면은 **discard intent 하나**: 이탈 가드가 렌더하는 `ConfirmDialog`(`TicketDetailPage.tsx:110,224` → `useUnsavedChangesDialog`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 가 소유한다. busy/abort 절은 이 다이얼로그에 서버 요청이 없어 무관하다 | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 discard 다이얼로그가 실제로 뜨는지만 확인(FEEDBACK-04 절차와 동일) | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | `TicketDetailPage.tsx:110` 이 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 RHF `isDirty` 가 아니라 도메인 판정 `isProcessDirty(ticket, draft)`(`process.ts:18-24` — 담당·상태·작성 본문 중 하나라도 원본과 다르면 true)이며 **계약상 등가**다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 저장 성공 시 작성창이 비고 상세가 재조회돼 dirty 가 풀린다(`:150-153`) | 상세에서 답변 본문 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로' 버튼(FS-026-EL-013·EL-027)은 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 이는 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-026 §7 #18 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 처리 폼은 modal 이 아니라 상세 라우트의 카드로 렌더된다(`TicketWorkspace.tsx`). 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력 필드가 없는 확인 다이얼로그다(그 자신이 FEEDBACK-04 의 산물이다) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success('문의 처리 내용을 저장했습니다.')`(`TicketDetailPage.tsx:152`). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(FEEDBACK-02 와 같은 노드). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 discard 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 3개를 전수 확인했다.** ① **담당 배정 입력** — `TicketWorkspace.tsx:168-171` 이 `aria-invalid={assigneeRequiredError !== null}` 와 `aria-describedby={assigneeRequiredError !== null ? errorIdOf('ticket-assignee') : undefined}` 를 **짝으로** 세우고, 감싸는 `FormField htmlFor="ticket-assignee"`(`:155-158`)가 `<p id={errorIdOf('ticket-assignee')} role="alert">` 를 렌더한다(`packages/ui/.../FormField.tsx:72`) — id 가 일치한다. ② **처리 상태 select** — 오류 상태가 없다(선택지가 이미 허용 전이로 좁혀져 있어 위반 값이 존재할 수 없다) → `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않는다. ③ **답변 textarea** — `TextareaField` 가 `aria-invalid`/`aria-describedby` 를 내부에서 짝으로 배선한다(`packages/ui/.../TextareaField.tsx:62-63`). **짝 없는 `aria-invalid` 0건.** required 필드는 이 화면에 없다(담당·본문 모두 선택적 — 담당·상태만 저장하는 것이 정상 경로) | `grep -n "aria-invalid" apps/admin/src/pages/support/tickets -r` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL 로 담당을 비운 채 상태를 '처리중'으로 바꿔 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 4개**다(`TicketListPage.tsx:148-218`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current` 0건 | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면: 이탈 가드 `ConfirmDialog`. enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. (참고: `packages/ui/src` 에 Motion/AnimatePresence 소비가 0건이므로 소유 문서에서 gap 일 가능성이 높다 — **그 판정은 이 문서의 몫이 아니다**) | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스(`tds-ui-skeleton`) · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) — ToggleSwitch 는 이 화면에 없다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:239-240` — `APP_ROUTES` 의 `/support/tickets` · `/support/tickets/:id`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={columnStyle}>`(`TicketListPage.tsx:140`) · `<div style={pageStyle}>`(`TicketDetailPage.tsx:181`)다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** `/support/tickets/:id` 는 nav 잎이 아니므로 `findNavLabel` 의 정확 일치가 실패하고(`nav-config.ts:254-255`) **브랜치 폴백이 걸려 '고객센터'를 반환한다**(`:257-262` — `pathname.startsWith('/support')`). AppHeader 가 그것을 `<h1>` 으로 렌더한다(`AppHeader.tsx:92,101`). 동시에 상세가 **자체 `<h1>문의 처리</h1>`** 를 그린다(`TicketDetailPage.tsx:193`). 결과: **화면에 `<h1>` 이 2개이고, AppHeader 의 primary title 이 요구가 금지한 브랜치 라벨**이다. 게다가 목록은 in-content `<h1>` 이 없어(제목이 AppHeader 에서 온다) **title 소스 모델이 화면 타입마다 모순**이다 — 요구의 본문이 지적하는 바로 그 상태 | `/support/tickets/:id` 진입. **AppHeader 의 가시 `<h1>` 이 '고객센터'이면 gap.** `document.querySelectorAll('h1').length === 2` 확인. (목록 `/support/tickets` 는 잎이라 '1:1 문의'로 정상 해석 — 이 gap 은 sub-route 에서만 발생) | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·필터(`TicketListPage.tsx:141-219`) → 결과 count 요약(`:221`) → table(`:223`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 문의 생성이 범위 밖이다(BE-026 §7.7). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** `visible.map(...)`(`:280`)이 전량을 렌더하며 페이지네이션 컴포넌트가 없다. 문의는 상한 없이 매일 쌓이는 컬렉션이라 'page size 초과 가능'이 확실하다(BE-026 §7.9) | 픽스처를 20건 이상으로 늘리고 `/support/tickets` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 문의 생성이 범위 밖이고(BE-026 §7.7) 편집은 `/new`·`/:id/edit` 폼이 아니라 상세 라우트 안의 처리 카드에서 일어난다. `/support/tickets/:id` 단일 라우트라 '`:id` 로 구분되는 하나의 컴포넌트/route 쌍' 이라는 요구 자체가 걸리지 않는다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | **미충족.** 필터 4종과 검색어가 **전부 컴포넌트 `useState`** 다(`TicketListPage.tsx:101-105` — `status`·`priority`·`channel`·`categoryId`·`keyword`). 공용 `useListState`(`shared/crud/useListState.ts` — `useSearchParams` 기반 URL 직렬화)를 **쓰지 않는다**. 앱 전체에서 `useListState` 소비자는 `pages/members/**` 뿐이다(grep 확인). 결과: 필터를 걸고 상세에 들어갔다 브라우저 Back 하면 **조건 없는 초기 상태로 착지**하고, 필터 걸린 view 를 링크로 공유할 수 없으며 F5 도 동일 | `/support/tickets` 에서 상태='처리중' + 검색='결제' 적용 → 행 클릭으로 상세 진입 → 브라우저 Back. **URL 이 `/support/tickets`(쿼리 없음)이고 필터가 초기화돼 있으면 gap.** URL 을 새 탭에 복사해도 같은 view 가 재현되지 않음을 확인 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`shared/layout/AppShell.tsx:18,472-478` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다. 특히 FS-026-EL-005·EL-025 의 동기 store 호출(`listActiveCategories()`·`listTemplates()`)이 던지면 이 경계가 받는다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth`(`shared/auth/RequireAuth.tsx:66-79`)가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동(`shared/query/queryClient.ts` · `RequireAuth.tsx:36-57`). **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsupport%2Ftickets&reason=session_expired` 로 이동하는지 확인. (미저장 처리 내용 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): read 게이팅 — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/support/tickets/:id` 같은 하위 라우트까지 덮는다(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎'). **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`/`useRouteCan`(`shared/permissions/RequirePermission.tsx:29-56`)이 존재하는데도 **앱 전체에서 소비자가 0건**이다(grep: 정의 파일 자신뿐). 이 화면의 '처리 저장'(`TicketWorkspace.tsx:249-256`)은 `can(resource,'update')` 를 묻지 않고 무조건 렌더된다 → 쓰기 권한 없는 역할이 버튼을 보고 누르며, 서버 403 이 '저장하지 못했습니다' 배너로 뭉개진다(강등 reconcile 없음) | 권한 스토어에서 `support/tickets` 의 `update` 를 끈 뒤 `/support/tickets/:id` 진입. **'처리 저장' 버튼이 그대로 보이면 gap.** read 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass) | **gap** |
| EXC-04 | EXC | 직접 | **미충족.** ① **낙관적 동시성 토큰이 없다** — `ticketAdapter.update`(`data-source.ts:30-34`)가 `If-Match`/`version` 을 보내지 않는다. ② **유령 저장** — `updateTicket`(`_shared/store.ts:285-291`)이 `tickets.map(...)` 이라 **없는 id 를 조용히 지나치고 성공을 반환**한다. 공용 `createCrudAdapter` 는 바로 이 함정을 막아 뒀는데(`shared/crud/crud.ts:71-73` — `if (!items.some(...)) throw new HttpError(409, …)`) **`ticketAdapter` 는 그 팩토리를 쓰지 않고 손조립돼 가드를 상속하지 못했다.** ③ **409 를 해소할 UI 가 없다** — 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 conflict 다이얼로그(`useCrudForm.ts:158-172`, 입력 보존 + reload/dismiss)를 상속하지 못한다. 서버가 409 를 줘도 FS-026-EL-018 의 generic 배너로 뭉개진다. **실질 위험**: 타임라인 전체 치환 PUT 이라 동시 답변이 유실된다(BE-026 §7.3) | `?status=save:409` 로 상세에서 '처리 저장'. **conflict 다이얼로그 없이 '저장하지 못했습니다' 배너만 뜨면 gap.** 별도로 존재하지 않는 id(`/support/tickets/nope`)는 상세 조회가 먼저 막아 유령 저장을 재현할 수 없으므로, 픽스처에서 `updateTicket` 의 `map` 이 no-op 하는 경로를 코드로 확인한다 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `onSave`(`TicketDetailPage.tsx:127-161`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다** — 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅이 제공하는 두 장치(`useCrudForm.ts:102` `submitLockRef` · `:112-117` `idempotencyKeyRef`/`takeIdempotencyKey`)를 상속하지 못한다. 방어는 `disabled={saving \|\| !dirty \|\| assigneeRequiredError !== null}`(`TicketWorkspace.tsx:252`) 하나뿐이다. **완화 요인**: 이 버튼은 `type="submit"` 이 아니라 `onClick` 이라 RHF 비동기 검증 지연이 없어 창이 좁다. 그러나 `update.mutate` 는 비동기이고 `saving` 은 리렌더 후에야 true 가 되므로 **그 사이의 빠른 두 번째 클릭은 두 번째 요청을 만든다** — 결과는 타임라인에 **같은 답변 이벤트 2건**이며, 답변은 고객에게 전송되는 값이다 | 상세에서 답변 입력 후 '처리 저장'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** 코드상 `submitLockRef` grep 이 이 화면에서 0건임으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | 세 지점이 전부 배선돼 있다. ① **onError** — `if (isAbort(cause)) return;`(`TicketDetailPage.tsx:156`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). ② **onSuccess** — `if (controller.signal.aborted) return;`(`:149`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:89`)가 이탈 시 진행 중 저장을 취소한다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다. bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다(취소된 요청) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **6** | TOKEN-01 · TOKEN-05 · FEEDBACK-04 · A11Y-11 · IA-01 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **4** | STATE-04 · FEEDBACK-06 · A11Y-12 · IA-05 |
| `gap` | **9** | STATE-01 · STATE-02 · COMP-10 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 6 + 11 + 4 + 9 = **30** ✓ |

> **P0 gap 9건 — quality-bar '배치 실패' 사유.** 이 중 **STATE-01 · IA-13 · COMP-10 · IA-02 · IA-04** 는 앱 전역의 같은 뿌리(공용 훅 미소비 · sub-route title 모델)를 공유하므로 화면 단위가 아니라 **횡단 배치**로 푸는 것이 옳다(§5).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·금액·CSV·페이지네이션 range 등)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:151`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **그러나 화면이 `isFetching` 을 loading 으로 직결해 그 이득을 버린다**(STATE-01 과 같은 뿌리) — 이전 행이 캐시에는 남지만 스켈레톤에 덮인다 | 데이터가 있는 상태의 재조회에서 이전 행이 화면에 유지되는지 | **gap** |
| STATE-05 | P1 | 빈 상태가 `'문의가 없습니다.'` 한 문구뿐이다(`TicketListPage.tsx:276`) — 공유 `Empty`(3분기 copy + 복구 액션)를 쓰지 않는다. 검색 0건·필터 0건·진짜 0건이 구분되지 않아 '검색 지우기'/'필터 초기화'가 없다 | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기가 나오는지 | **gap** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:198-201`) 화면이 상세를 재조회한다(`TicketDetailPage.tsx:153`) — 자기 변경이 즉시 보인다 | 상세에서 상태 변경 후 목록 복귀 시 배지가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | **quality-bar 가 `TicketListPage` 를 appliesTo 에 명시 지목.** `TicketListPage.tsx:311-319` 가 `buttonStyle('secondary')` + `className="tds-ui-btn-secondary tds-ui-focusable"` 로 `<button>` 을 손조립한다. 또 `TicketWorkspace.tsx:255` 가 `loading` prop 대신 손으로 쓴 `'저장 중…'` 라벨을 쓴다 | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/support/tickets -r` → 0건이어야 한다. 현재 1파일 히트 | **gap** |
| COMP-02 | P1 | 순번 컬럼이 DS `SeqCell`/`SeqHeaderCell` 을 쓴다(`TicketListPage.tsx:229,288`). raw checkbox 선택 마크업은 이 화면에 없다(선택 자체가 없다) | 순번 노출 표가 `SeqCell` 을 쓰는지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`TicketListPage.tsx:142`). raw `<input type="search">` 재구현 0건 | `grep 'type="search"' pages/support/tickets` → 0건 | **pass** |
| COMP-09 | P2 | 제목·유형·고객·담당 셀에 truncate 가 없다(`tdStyle` 그대로 — `TicketListPage.tsx:301-305`). 긴 제목이 열을 넓혀 표 레이아웃을 민다. **`RepliesPage` 는 같은 문제를 `bodyPreviewStyle` 로 풀었다** — 이 화면에 그 처리가 없다 | 200자 제목 픽스처로 표 폭이 유지되는지 | **gap** |
| COMP-06 | P2 | 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`TicketListPage.tsx:264`). 공유 `SkeletonRows` helper 가 없고 셀 수만 `CONTENT_COLUMNS + 1` 로 파생된다. 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다(IA-04 gap 과 연동) | `grep "length: 5" pages/support/tickets` → 0건이어야 한다. 현재 1건 | **gap** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`TicketListPage.tsx:288`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소해 페이지네이션을 도입하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 실재한다** — 행 전체 클릭(`rowNavProps`, `:286`)과 '상세' 버튼(`:311-319`)이 같은 `/support/tickets/<id>` 로 간다. 요구는 읽기전용 테이블에 'whole-row 클릭 + row 내 접근 가능한 링크 하나, 중복 상세 버튼 없음'. **단순 제거는 불가** — 제목 셀이 링크가 아니라(`:303` 텍스트 노드) '상세' 버튼이 **유일한 키보드 도달 경로**다(A11Y-08). 제목의 링크 승격이 선행돼야 한다 | 읽기전용 리스트에 중복 '상세' secondary 버튼이 없는지 | **gap** |
| COMP-12 | P2 | 답변 textarea 가 `TextareaField` 의 `N/1000` 실시간 카운터를 갖는다(`TicketWorkspace.tsx:234` `maxLength={TICKET_REPLY_MAX}` → `FormField counter`). **그러나 상한 근접 경고가 없고, `maxLength` 가 네이티브로 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다 | 1000자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert(`TicketListPage.tsx:127` · `TicketDetailPage.tsx:170`) · write 성공=toast(`:152`) · write 실패=카드 배너(`TicketWorkspace.tsx:130`). **단 write 실패가 toast 가 아니라 배너다** — 요구는 'write 성공/실패 → toast'인데 이 화면은 실패를 폼 카드 배너로 둔다. 그러나 이는 폼 맥락(입력을 보존한 채 그 자리에서 재시도)이라 `FormServerError` 와 같은 결이며 **이탈로 보지 않는다** | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast) · 실패(배너) 양 경로가 배선돼 있다(`TicketDetailPage.tsx:148-158`). no-op 클릭이 없다 — `canSetStatus` 위반도 배너 문구를 낸다(`:130`) | `?fail=support-tickets:save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(마우스 전용, `<tr>` 에 tabIndex 없음)이고 **제목 셀이 링크가 아니다**(`:303`). 키보드 등가물은 '상세' 버튼(`:311-319`, 접근 이름 `'<제목> 상세'`) — **도달은 가능하므로 요구의 최소선은 충족**한다. 다만 요구가 기대하는 형태는 'row 내 focusable **name link**' 이고, 현 구조는 COMP-08(중복 버튼)과 정면 충돌한다 — 둘을 함께 풀어야 한다 | 행을 Tab 해서 상세를 여는 컨트롤에 도달하는지 | **pass(단 COMP-08 과 연동)** |
| A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스가 없고, 저장 실패 시 첫 오류 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `onInvalid`/`setFocus` 경로(`useCrudForm.ts:176-185,239-241`)를 상속하지 못한다. 담당 요건 위반 시 배너만 뜨고 포커스는 버튼에 남는다 | 담당을 비운 채 '처리 저장' → activeElement 가 담당 입력인지 | **gap** |
| A11Y-16 | P1 | 답변/메모 유형 토글(`TicketWorkspace.tsx:194-209`)이 선택 상태를 **버튼 variant(색)로만 인코딩**한다 — `aria-pressed` 가 없어 '이중(비색상) state 인코딩' 과 'semantic role' 을 위반한다. 나머지 표면(표 `aria-busy`·caption·필터 `aria-label`·`role="alert"`)은 계약을 만족한다 | 토글 두 버튼에 `aria-pressed` 가 있는지 | **gap** |
| ERP-01 | P1 | status→tone 매핑이 **공유 도메인 모듈의 단일 레지스트리**다 — `_shared/domain.ts` 의 `STATUS_TONE`(`:136-142`) · `ticketStatusTone` · `ticketPriorityTone` · `SLA_TONE`. per-page meta helper 를 만들지 않았고 목록·상세가 같은 함수를 소비한다. **다만 그 레지스트리가 `pages/support/_shared` 지역이라** 견적/계약/배송 등 다른 도메인과 통합된 앱 전역 레지스트리는 아니다 | 모든 domain status 가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 날짜·숫자가 `shared/format`(`formatDateTime`·`formatNumber`)을 경유한다 — 인라인 포맷 0건. SLA 잔여 문구만 도메인 순수 함수가 자체 포맷한다(`durationLabel`) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-08 | P2 | 접수일시가 `formatDateTime`, 건수가 `formatNumber` 를 경유한다. **단 SLA 잔여 문구(`durationLabel` — `_shared/domain.ts:225-231`)가 `String(hours)`/`String(minutes)` 로 직접 조립**한다(천 단위·상대시간 가드 없음). 미래 timestamp 가드도 없다 | 셀의 raw numeric toString 이 0건인지 | **gap(경미)** |
| ERP-13 | P1 | 이 화면의 templated copy 에 **리터럴 조사 폴백이 없다** — `'<상태라벨>' 상태는 담당 배정이 필요합니다.`(`process.ts:29`)·`상태를 '<라벨>'(으)로 변경`(`:49`). 후자의 `(으)로` 가 **리터럴 폴백형**이다 — 요구는 '어떤 사용자 대상 문자열도 `이(가)/을(를)/은(는)` 폴백형을 출하하지 않는다'이며 `(으)로` 도 같은 부류다. 이 문구는 **타임라인에 저장돼 고객 분쟁 시 증거로 남는다** | 사용자 대상 문자열의 `(으)로`/`이(가)`/`을(를)` grep = 0 | **gap** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`visible.map`, `:280`) — cap·virtualization 이 없다. 문의는 상한 없이 증가하는 컬렉션이라(BE-026 §7.9) 1,000건이면 1,000행이 DOM 에 올라가고 키 입력마다 전량을 다시 거른다. 11컬럼 표에 가로 scroll 컨테이너도 없다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트에서만 발생한다(`TicketDetailPage.tsx:89`) | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. **그러나 이 화면이 status 로 분기하지 않는다** — 상세 실패가 404/500 을 같은 문구로(FS-026-EL-016), 저장 실패가 403/409/422/500 을 같은 배너로 뭉갠다. 게다가 `getTicket`(`_shared/store.ts:281`)이 `HttpError(404)` 가 아니라 **일반 `Error`** 를 던져 분기 근거 자체가 없다 | `?status=detail:404` 와 `?status=detail:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 없다 — `useCrudForm` 미사용이라 그 훅의 422 처리(`useCrudForm.ts:176-186`)를 상속하지 못한다. 모든 저장 실패가 form-level 배너로 간다 | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | 404 와 generic error 를 구분하지 않는다(FS-026-EL-016 — '문의를 불러오지 못했습니다.' + '목록으로'만). 공용 `FormPageShell` 은 이를 정확히 구분하는데(`FormPageShell.tsx:115-143` — `loadFailure === 'not-found'` 면 retry 를 숨긴다) **이 화면이 그 셸을 쓰지 않아 상속하지 못했다.** 근본 원인은 `getTicket` 이 status 없는 `Error` 를 던지는 것(EXC-06 과 같은 뿌리) | 없는 `:id` 로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. 500 → retry + list 둘 다 | **gap** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적이다(pending 잠금 → 성공 후 재조회). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다.** un-rolled-back optimistic write 0건 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference` 가 존재하고(`shared/errors/http-error.ts`) `useCrudForm` 은 `errorReference` 로 노출하는데(`useCrudForm.ts:189`), 이 화면은 `setServerError('저장하지 못했습니다…')`(`TicketDetailPage.tsx:157`) 고정 문구만 쓴다. raw stack 노출은 없다(그 절은 충족) | 강제 500 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-026 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 처리 저장 p95 | ≤ 700ms (타임라인 배열 전체 전송 — BE-026 §7.3 안 A 채택 시 ≤ 400ms) | 위와 동일 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) | **충족(요청)** / **미충족(연산)** — 키 입력마다 전량을 `filter` 4회 + `search` 1회 훑는다(`TicketListPage.tsx:116-119`). 디바운스가 없어(COMP-10) 자모마다 발생 |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `TicketInput` 이 타임라인 배열 전체를 실어 보내므로(FS-026-EL-029.1) **이력에 비례해 무한 증가**한다. BE-026 §7.3 안 A 가 이를 상수로 만든다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 문의는 상한 없이 증가(BE-026 §7.9) |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`TicketListPage.tsx:124-137`). 단 배너가 툴바·필터까지 대체해 조건이 화면에서 사라진다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **미충족** — 문구·액션이 하나(STATE-02 · EXC-12 gap) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존은 되나 reference 없음(EXC-20 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| 동시 답변(두 상담원) | 나중 저장이 앞선 답변을 덮지 않는다 | **미충족 — 답변이 유실된다**(BE-026 §7.3). 이 화면 최대 위험 |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 내용을 버린다(EXC-19 P1 · FS-026 §7 #28) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary`. FS-026-EL-005·EL-025 의 동기 store throw 도 여기서 멈춘다 |

### 4.3 데이터 보존 · 감사

1:1 문의 타임라인은 **고객 분쟁 시 증거로 쓰이는 감사 기록**이다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 이벤트는 append-only — 수정·삭제되지 않는다 | **구조적으로 미보장.** 클라이언트가 배열 전체를 치환 PUT 한다(FS-026-EL-029.1) — 조작된 클라이언트는 과거 이벤트를 지우거나 고칠 수 있다. BE-026 §7.3 |
| 작성자는 세션 주체에서 나온다 | **미충족.** `author` 가 하드코딩 `'관리자'`(`process.ts:8`) — **누가 답변했는지 기록되지 않는다.** BE-026 §7.2 |
| 시각은 서버 시각이다 | **미충족.** 클라이언트 `new Date().toISOString()`(`TicketDetailPage.tsx:143`) |
| 이벤트 id 는 충돌하지 않는다 | **미충족.** `ev-${Date.now()}-a\|s\|c`(`process.ts:42`) — 동일 밀리초 동시 저장 시 충돌 |
| 문의 원문·개인정보는 파기 정책을 따른다 | **미정** — 관리자 삭제 API 가 없는 것은 옳으나(BE-026 §7.7) 보존기간 배치 계약이 없다 |
| 내부메모는 고객에게 노출되지 않는다 | **미정** — 서버가 고객 채널로 내보낼 때 `kind='note'` 제외를 보장해야 한다(BE-026 §7.11 #12) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | STATE-01 · STATE-03 | P0 · P1 | `TicketListPage.tsx:111` 이 `isFetching: loading` 직결 — 재조회가 표를 스켈레톤으로 덮고 건수를 지운다. `useCrudList` 의 `firstLoading`/`refreshing` 파생을 소비하지 않는다 | 이 화면(**앱 전역 패턴** — `CustomerFaqPage`·`CategoriesPage`·`PortfolioCategoriesPage`·`LogoListPage`·`ApplicationListPage` 가 같은 결함) | A11 change_request (횡단 배치 권장) |
| 2 | STATE-02 · EXC-12 · EXC-06 | P0 · P1 | 상세 조회 실패에 '다시 시도' 가 없고 404/5xx 를 구분하지 않는다. 근본 원인은 `getTicket` 이 `HttpError(404)` 가 아닌 일반 `Error` 를 던지는 것 | 이 화면 + 어댑터 | A11 · A63 (BE-026 §7.11 #5) |
| 3 | COMP-10 | P0 | 검색에 IME 조합·디바운스 처리 없음 — `useDebouncedSearch` 미소비 | 이 화면(앱 전역 패턴 — 소비자가 members 뿐) | A11 change_request |
| 4 | IA-02 | P0 | sub-route 에서 AppHeader 가 브랜치 라벨 '고객센터'를 `<h1>` 으로 렌더 + 상세 자체 `<h1>` → `<h1>` 2개, title 소스 모순 | **앱 전역**(`AppHeader`·`findNavLabel` 모델) | A40 · A11 |
| 5 | IA-04 · ERP-15 | P0 · P1 | 페이지네이션 없음 — 전량 렌더. 문의는 상한 없이 증가 | 이 화면 + BE 계약 | A11 · A63 (BE-026 §7.9 — IA-13 과 한 배치) |
| 6 | IA-13 | P0 | 필터·검색이 URL 에 없음 — Back/공유/새로고침이 조건을 잃는다. `useListState` 미소비 | 이 화면(앱 전역 패턴) | A11 change_request |
| 7 | EXC-03 | P0 | write 액션 게이팅 미배선 — `useRouteWritePermissions` 소비자가 **앱 전체 0건**. read 게이팅은 pass | **앱 전역** | A11 change_request |
| 8 | EXC-04 | P0 | 유령 저장(`updateTicket` 의 `map` no-op) · If-Match 없음 · 409 해소 UI 없음 | 이 화면 + 어댑터 + BE 계약 | A63 (BE-026 §7.5) · A11 |
| 9 | EXC-08 | P0 | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. 연타가 답변 이벤트를 2건 만든다 | 이 화면 | A11 · A63 (BE-026 §7.11 #9) |
| 10 | COMP-01 | P1 | `buttonStyle()`/`tds-ui-btn-*` 손조립 + 손으로 쓴 '저장 중…' — **quality-bar 가 `TicketListPage` 를 명시 지목** | 이 화면 | A11 change_request |
| 11 | COMP-08 · A11Y-08 | P2 · P1 | 중복 '상세' 버튼. 단 제목이 링크가 아니라 그것이 유일한 키보드 경로 — **제목 링크 승격이 선행돼야 제거 가능** | 이 화면 | A11 change_request (한 묶음) |
| 12 | A11Y-13 | P1 | 폼 진입 첫 필드 포커스·검증 실패 시 첫 오류 포커스 없음 | 이 화면 | A11 change_request |
| 13 | A11Y-16 | P1 | 답변/메모 유형 토글에 `aria-pressed` 없음 — 선택 상태가 색으로만 인코딩 | 이 화면 | A11 change_request |
| 14 | EXC-07 · EXC-20 | P1 | 422 필드 매핑 없음 · 5xx reference code 미표시 | 이 화면 | A11 |
| 15 | ERP-13 | P1 | `상태를 '<라벨>'(으)로 변경` 의 리터럴 조사 폴백 — **타임라인에 저장돼 증거로 남는다** | 이 화면 + `shared/format` josa 헬퍼 | A11 change_request |
| 16 | STATE-05 | P1 | 빈 상태 3분기 미구분 — 공유 `Empty` 미사용 | 이 화면 | A11 change_request |
| 17 | COMP-06 · COMP-07 · COMP-09 · ERP-08 | P2 | 스켈레톤 `length: 5` · `SeqCell` 에 `startIndex` 없음(페이지네이션 도입 시 발현) · 셀 truncate 없음 · `durationLabel` 의 raw `String()` | 이 화면 | A11 (#5 와 함께) |
| 18 | COMP-12 | P2 | 답변 상한 근접 경고 없음 · counting 기준 미정의 | 이 화면 | A11 |
| 19 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 |
| 20 | (§4.3) | — | **감사 무결성** — 타임라인 author 하드코딩 · 클라이언트 시각/id · 전체 치환으로 동시 답변 유실 | 이 화면 + BE 계약 | **A63 (BE-026 §7.2·§7.3 — 최우선)** |
| 21 | (§4.1) | — | 저장 요청 크기가 이력에 비례해 무한 증가 | BE 계약 | A63 (BE-026 §7.3 안 A 가 해소) |
| 22 | (BE-026 §7.4) | — | 유형·템플릿 조회가 어댑터 없는 동기 store 직접 호출 — 연동 시 **화면 코드가 함께 바뀐다** | 이 화면 | A11 (연동 산정에 포함) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 F2(`3cd3078`) 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`ticketAdapter` 는 `SCOPE = TICKET_RESOURCE = 'support-tickets'`(`data-source.ts:12-13`)로 `failIfRequested(SCOPE, op)` 를 부른다. **실재하는 op 는 3개뿐**이다:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`data-source.ts:19`) | `?fail=list` · `?fail=support-tickets:list` · `?fail=all` |
| `detail` | `fetchOne` (`:24`) | `?fail=detail` · `?fail=support-tickets:detail` · `?fail=all` |
| `save` | `update` (`:32`) | `?fail=save` · `?fail=support-tickets:save` · `?fail=all` |

- `create`/`remove` 는 `failIfRequested` 를 부르지 않는다 — **거절 구현**이라 스위치가 걸릴 지점이 없다(BE-026 §7.7). 따라서 **`?fail=delete` 는 이 화면에서 아무 효과가 없다.**
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 있다). STATE-01 재현은 `?delay=` 가 아니라 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:24-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500.

| 판정 | 재현 |
|---|---|
| STATE-02 / EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 같으면 gap** |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap** |
| EXC-03 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap |
| EXC-06 (status별 surface) | `?status=save:422` · `save:429` · `save:500` — 전부 같은 배너면 gap |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — reference 가 안 보이면 gap |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-06 · A11Y-11 · A11Y-12 · ERP-13 판정) · RTL(A11Y-11 의 describedby↔alert id 일치) · `_shared/domain.test.ts`(SLA·상태 전이 순수 규칙 회귀 — **이 화면에 컴포넌트 테스트는 없다**).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 선택·페이징 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재)
- [x] §2.1 산수 검산 — 6 pass + 11 종속 + 4 n-a + 9 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·금액·CSV)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`support-tickets`)와 op 3종을 **어댑터 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-026 §7 · BE-026 §7.11 과 일치한다
