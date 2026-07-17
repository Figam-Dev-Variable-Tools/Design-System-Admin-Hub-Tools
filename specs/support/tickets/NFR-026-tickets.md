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
| 판정 기준일 | **2026-07-17 · HEAD = `a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었다. **이번 기준 갱신으로 뒤집힌 판정 없음** — MOTION-01/02 의 근거 텍스트만 갱신했다 — 오버레이 모션이 **CSS-only 로 구현**됐고(`Modal.css:126-168` · `Toast.css:109-141`) 이전 기준의 '라이브러리 0건이라 gap 일 가능성' 추정은 틀렸다. **이 화면은 `useModalDirtyGuard` 소비가 0건이라 DS Modal 의 `closingRef` latch 결함에 노출되지 않는다**(FEEDBACK-06 판정 불변). **뒤집힌 P0 판정 없음 — §2.1 건수 불변.** |
| 판정 근거 | **E2E 미실행 — 판정 근거는 `a5c2639` 코드 대조다**(§6) |

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
| STATE-01 | STATE | 직접 | **충족(F3b 가 `isFetching` 직결을 끊었다).** 이 화면은 `useCrudList` 를 쓰지 않고 `useCrudListQuery` 를 직접 소비하지만(`TicketListPage.tsx:152`), **그 자리에서 공용 훅과 글자까지 같은 파생을 둔다** — `:163` `const firstLoading = isFetching && data === undefined` · `:165` `const refreshing = isFetching && data !== undefined`(`:154-162` 주석이 '예전엔 isFetching 을 그대로 loading 이라 불러 표에 넘겼다'고 전환을 밝힌다. 정본은 `shared/crud/useCrudList.tsx:71-72`). 네 상태가 배타적이다: 스켈레톤 분기(`:304`)와 표의 `aria-busy`(`:264`)가 **`firstLoading` 만** 읽고, 요약(`:260`)은 재조회 중 `전체 N건` 을 유지한 채 `:261` 이 '· 새로고침 중…' 만 덧붙이며 `:259` 가 `aria-busy={refreshing}` 로 그 사실을 AT 에도 알린다. 행은 `placeholderData: (previous) => previous`(`crud.ts:254`)가 유지한다. read 실패는 `:175-188` 이 표 대신 Alert 로 가른다. 상세도 정상 — `TicketDetailPage.tsx:196` 이 `ticket === undefined` 로 판정한다 | `/support/tickets` 진입 → 데이터 렌더 확인 → 필터 변경으로 재조회 유발(또는 `staleTime` 30초 경과 후 재진입) → **표가 스켈레톤으로 바뀌지 않고 이전 행이 남으며, 요약이 `전체 N건 · 새로고침 중…` 이 된다**. 최초 진입에서만 5행 스켈레톤. `?fail=support-tickets:list` → danger Alert 만 | pass |
| STATE-02 | STATE | 직접 | **부분 미충족.** 목록은 충족 — `TicketListPage.tsx:124-137` 이 `<Alert tone="danger">` + '다시 시도'(`refetch`)를 렌더하고 error toast 를 쓰지 않는다. **상세가 미충족** — `TicketDetailPage.tsx:167-178` 의 실패 Alert 에 **'다시 시도' 컨트롤이 없고 '목록으로'만 있다**(FS-026-EL-016) | `/support/tickets/:id?status=detail:500` 진입. **danger Alert 는 뜨지만 '다시 시도' 버튼이 없으면 gap** | **gap** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① 페이지네이션이 없고(FS-026-EL-008 — 전량 렌더) ② **행 선택이 없다**(삭제·일괄 작업이 범위 밖 — BE-026 §7.7). 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션·`selectedIds` 도입 시 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/support/tickets/**` · `pages/support/_shared/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 3.5)`(`TicketListPage.tsx:72`) 같은 space 토큰 배수로만 표현한다 | `grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|'(thin\|medium\|thick)'" apps/admin/src/pages/support/tickets apps/admin/src/pages/support/_shared` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`TicketListPage.tsx:313` 상세 버튼 · `TicketDetailPage.tsx:184` 목록으로 · `TicketWorkspace.tsx:163` 담당 입력) · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>`. **이 화면이 focus ring 을 직접 선언하지 않는다** — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서는 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `TicketListPage.tsx:268`) · Toast(`TicketDetailPage.tsx:152`) · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다** | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`TicketDetailPage.tsx:197` · `TicketWorkspace.tsx:121,260`) · Toast · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`TicketDetailPage.tsx:193`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-59`) — 값을 손으로 재현하지 않는다. **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/support/tickets/:id` 의 '문의 처리' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족(F3b).** `TicketListPage.tsx:193-200` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 **공용 IME 안전 배선을 스프레드한다**. `list` 는 `useListState`(`:129`)이고 그 훅이 내부에서 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다 — 즉 세 축이 전부 성립한다: ① **조합 중 커밋 금지** — `useDebouncedSearch.ts:87` `if (composing) return`(커밋 effect 가 조합 중엔 타이머를 걸지 않는다) + `:121-124` `onKeyDown` 이 `event.nativeEvent.isComposing || composingRef.current` 면 `stopPropagation` 으로 Enter 를 삼킨다(**두 신호를 함께 보는 이유는 `:117-120` 주석** — `isComposing` 은 합성 이벤트에서 누락될 수 있다). ② **디바운스 250ms** — `:23` `DEBOUNCE_MS = 250` · `:93-95`. ③ **stale 응답 무효** — `:14-18` 주석이 밝히듯 TanStack Query 가 keyword 를 쿼리 키에 넣어 이미 해결돼 있고, 이 화면은 클라이언트 필터(`searchTickets`)라 애초에 in-flight 경합이 없다. 커밋된 값은 URL(`?q=`)로 나간다(IA-13 과 같은 뿌리) | `/support/tickets` 검색창에 IME 로 '홍길동' 입력 → **조합 중 '홍ㄱ'·'홍기' 가 필터에 반영되지 않고, 조합이 끝난 뒤 250ms 잠잠하면 그때 한 번 커밋된다**. 조합 중 Enter → 아무 일도 없다. 조합이 아닌 Enter → 즉시 커밋(`:126-129`). `useDebouncedSearch.test.tsx` 가 이 계약을 고정한다 | pass |
| FEEDBACK-02 | FEEDBACK | 상속 | **이 화면에 파괴적 서버 액션이 없다** — 삭제가 범위 밖이다(BE-026 §7.7). 걸리는 표면은 **discard intent 하나**: 이탈 가드가 렌더하는 `ConfirmDialog`(`TicketDetailPage.tsx:110,224` → `useUnsavedChangesDialog`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 가 소유한다. busy/abort 절은 이 다이얼로그에 서버 요청이 없어 무관하다 | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 discard 다이얼로그가 실제로 뜨는지만 확인(FEEDBACK-04 절차와 동일) | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | `TicketDetailPage.tsx:110` 이 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 RHF `isDirty` 가 아니라 도메인 판정 `isProcessDirty(ticket, draft)`(`process.ts:18-24` — 담당·상태·작성 본문 중 하나라도 원본과 다르면 true)이며 **계약상 등가**다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 저장 성공 시 작성창이 비고 상세가 재조회돼 dirty 가 풀린다(`:150-153`) | 상세에서 답변 본문 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로' 버튼(FS-026-EL-013·EL-027)은 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 이는 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-026 §7 #18 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 처리 폼은 modal 이 아니라 상세 라우트의 카드로 렌더된다(`TicketWorkspace.tsx`). 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력 필드가 없는 확인 다이얼로그다(그 자신이 FEEDBACK-04 의 산물이다) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success('문의 처리 내용을 저장했습니다.')`(`TicketDetailPage.tsx:152`). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(FEEDBACK-02 와 같은 노드). `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 discard 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 3개를 전수 확인했다.** ① **담당 배정 입력** — `TicketWorkspace.tsx:168-171` 이 `aria-invalid={assigneeRequiredError !== null}` 와 `aria-describedby={assigneeRequiredError !== null ? errorIdOf('ticket-assignee') : undefined}` 를 **짝으로** 세우고, 감싸는 `FormField htmlFor="ticket-assignee"`(`:155-158`)가 `<p id={errorIdOf('ticket-assignee')} role="alert">` 를 렌더한다(`packages/ui/.../FormField.tsx:72`) — id 가 일치한다. ② **처리 상태 select** — 오류 상태가 없다(선택지가 이미 허용 전이로 좁혀져 있어 위반 값이 존재할 수 없다) → `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않는다. ③ **답변 textarea** — `TextareaField` 가 `aria-invalid`/`aria-describedby` 를 내부에서 짝으로 배선한다(`packages/ui/.../TextareaField.tsx:62-63`). **짝 없는 `aria-invalid` 0건.** required 필드는 이 화면에 없다(담당·본문 모두 선택적 — 담당·상태만 저장하는 것이 정상 경로) | `grep -n "aria-invalid" apps/admin/src/pages/support/tickets -r` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL 로 담당을 비운 채 상태를 '처리중'으로 바꿔 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 4개**다(`TicketListPage.tsx:148-218`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current` 0건 | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면: 이탈 가드 `ConfirmDialog`. enter/exit 모션은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다. **⚠ 근거 갱신 — 이전 기준의 추정을 지운다.** PR #26 이 오버레이 모션을 **구현했다. 단 라이브러리가 아니라 CSS-only 다**: backdrop fade(`Modal.css:20-21`→keyframes `:126-134`, exit `:30-33`→`:136-144`) + dialog scale 0.96→1(enter `:58-59`→`:146-156`, exit `:35-38`→`:158-168` `forwards`), reduced-motion 게이트 `:173-180`, `component.overlay` recipe `tokens/tokens.json:1286-1308`. **Motion/AnimatePresence 소비는 `packages/ui/src` 에 여전히 0건이나**(모션 라이브러리 자체가 미도입), 요구가 명시한 'exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd`**(`Modal.tsx:216-218`)로 동등 달성됐다 — **'0건이라 gap 일 가능성이 높다'는 이전 추정은 틀렸다.** 라이브러리 부재를 gap 으로 볼지는 DS 문서의 몫이다. **⚠ 이 화면의 이탈 가드는 `ConfirmDialog`(`onClose={onCancel}`)이고 폼 modal 이 아니라**(편집이 전용 라우트 폼) **DS Modal 의 `closingRef` latch 결함**(NFR-027 §2 FEEDBACK-06)**에 노출되지 않는다** — `useModalDirtyGuard` 소비가 0건이다 | DS Modal 판정에 종속. 이 화면이 소비하는 표면이 실재함만 확인 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다. **⚠ 근거 갱신 — 완전 구현됐다.** `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events:none`) → keyframes `:121-131`(opacity 1→0, `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. **요구가 명시한 'exit duration fast~normal + easing accelerate' 를 정확히 충족한다** — `component.overlay.exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`tokens/tokens.json:1298-1307`) | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스(`tds-ui-skeleton`) · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) — ToggleSwitch 는 이 화면에 없다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:239-240` — `APP_ROUTES` 의 `/support/tickets` · `/support/tickets/:id`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={columnStyle}>`(`TicketListPage.tsx:140`) · `<div style={pageStyle}>`(`TicketDetailPage.tsx:181`)다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **절반 해소 — 여전히 미충족(사유 전환).** ✔ **해소된 것 — 가지 라벨 폴백**: 통합이 `findCoveringLeaf`(`nav-config.ts:260-278`)를 도입했다 — '자기를 감싸는 **가장 긴 잎**'이 곧 자기다. `covers()` 는 **세그먼트 경계**에서만 매칭하고(`:255-257`), `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` 이다. 따라서 `/support/tickets/:id` 는 잎 `/support/tickets`(`nav-config.ts:166`)에 덮여 **'1:1 문의'** 를 반환한다 — **요구가 금지한 브랜치 라벨('고객센터')은 더 이상 나오지 않는다.** 권한(`route-resource.ts`)이 쓰던 규칙과 한 곳으로 통일됐고 `nav-config.test.ts:16-40` 이 고정한다. ✘ **남은 것 둘**: ① **`<h1>` 이 2개다** — `AppHeader.tsx:101` 의 `<h1>1:1 문의</h1>` 과 상세의 자체 `<h1>문의 처리</h1>`(`TicketDetailPage.tsx:193`)이 **동시에** 렌더된다 → 요구의 '**단일 title 메커니즘**' 미충족. 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 갈린다**. ② **행위가 AppHeader 제목에 없다** — `nav-config.ts:294-296` 주석이 '등록/수정 같은 **행위**는 제목에 넣지 않는다(그 문구는 nav 에 없고, 여기서 지어내면 레이아웃이 카피를 발명한다)'를 의도로 명시한다 | `/support/tickets/:id` 진입 → **AppHeader `<h1>` = '1:1 문의'**(브랜치 폴백 해소). 그러나 `document.querySelectorAll('h1').length === 2`('1:1 문의' + '문의 처리')이고 **어느 쪽이 primary 인지 정의돼 있지 않다** = 단일 title 메커니즘 미충족. (목록 `/support/tickets` 는 잎이라 예전에도 '1:1 문의'로 정상 해석됐다 — 이 gap 은 sub-route 에서만) | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·필터(`TicketListPage.tsx:141-219`) → 결과 count 요약(`:221`) → table(`:223`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 문의 생성이 범위 밖이다(BE-026 §7.7). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** `visible.map(...)`(`:280`)이 전량을 렌더하며 페이지네이션 컴포넌트가 없다. 문의는 상한 없이 매일 쌓이는 컬렉션이라 'page size 초과 가능'이 확실하다(BE-026 §7.9) | 픽스처를 20건 이상으로 늘리고 `/support/tickets` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 문의 생성이 범위 밖이고(BE-026 §7.7) 편집은 `/new`·`/:id/edit` 폼이 아니라 상세 라우트 안의 처리 카드에서 일어난다. `/support/tickets/:id` 단일 라우트라 '`:id` 로 구분되는 하나의 컴포넌트/route 쌍' 이라는 요구 자체가 걸리지 않는다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | **충족(F3b — 이 화면이 그 손실이 가장 컸던 곳이다).** 필터 4종과 검색어의 단일 원천이 **URL 쿼리스트링**이다 — `TicketListPage.tsx:129` `const list = useListState({ filterDefaults: FILTER_DEFAULTS })` 가 `useSearchParams`(`useListState.ts:87`) 위에 앉고, 각 select 가 `list.setFilter('status'|'priority'|'channel'|'category', …)`(`:204,218,232,246`)로, 검색은 `list.searchInput`/`searchInputProps`(`:194-199`)로 URL 에 쓴다. **기본값과 같은 값은 URL 에서 지운다**(`useListState.ts:113-118` + `FILTER_DEFAULTS` `:77-82`) — 공유 링크가 짧고 '기본 상태' 의 URL 이 하나로 정해진다. **갱신은 `replace`**(`:125`)라 검색어 한 줄에 history 가 쌓이지 않고, 상세에서 Back 하면 그 URL(= 필터+검색)이 그대로 복원된다(`:17-19` 주석). **손으로 고친 URL 도 안전하다** — `parseFilter`(`:130-144`)가 닫힌 유니온을 허용 목록으로 좁히고(`:62-74`), 유형은 운영자 정의라 유니온이 없어 모르는 id 를 '일치 없음'(빈 목록)으로 흘려보낸다(`:145-147` 주석). page·sort 는 표면이 없다(정렬 서버 고정 · 페이지네이션 부재 → IA-04) | `/support/tickets` 에서 상태='처리중' + 검색='결제' 적용 → **URL 이 `?status=in_progress&q=결제` 가 된다** → 행 클릭으로 상세 진입 → 브라우저 Back → **필터·검색이 그대로 복원된다**. F5 도 동일. URL 을 새 탭에 붙여넣으면 같은 트리아지 큐가 재현된다. `?status=거짓말` 로 손대면 '전체 상태'로 안전하게 되돌아간다(조회가 깨지지 않는다) | pass |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`shared/layout/AppShell.tsx:18,472-478` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다. 특히 FS-026-EL-005·EL-025 의 동기 store 호출(`listActiveCategories()`·`listTemplates()`)이 던지면 이 경계가 받는다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth`(`shared/auth/RequireAuth.tsx:66-79`)가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동(`shared/query/queryClient.ts` · `RequireAuth.tsx:36-57`). **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsupport%2Ftickets&reason=session_expired` 로 이동하는지 확인. (미저장 처리 내용 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** 충족(상속): read 게이팅 — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:20`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/support/tickets/:id` 같은 하위 라우트까지 덮는다(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎'). **미충족(직접): write 액션 게이팅이 이 화면에 없다.** `useRouteWritePermissions`/`useRouteCan`(`shared/permissions/RequirePermission.tsx:29-56`)은 **더 이상 소비자 0 이 아니다 — 8곳이 쓴다**(`products/{categories/ProductCategoriesPage.tsx:181, items/ProductListPage.tsx:119, returns/ReturnDetailPage.tsx:110}` · `settings/{api-keys/ApiKeysPage.tsx:59, languages/LanguagesPage.tsx:126, oauth/OAuthPage.tsx:78, site/SiteSettingsPage.tsx:109}` · `logs/components/LogListShell.tsx:115`(`useRouteCan('export')`)). **가장 가까운 선례가 `products/returns/ReturnDetailPage.tsx:110` — 이 화면과 같은 '상세에서 처리 저장' 패턴인데 그쪽은 `canUpdate` 를 본다.** 그런데도 이 화면의 '처리 저장'(`TicketWorkspace.tsx:249-256`)은 `can(resource,'update')` 를 묻지 않고 무조건 렌더된다 → 쓰기 권한 없는 역할이 버튼을 보고 누르며, 서버 403 이 '저장하지 못했습니다' 배너로 뭉개진다(강등 reconcile 없음) | 권한 스토어에서 `support/tickets` 의 `update` 를 끈 뒤 `/support/tickets/:id` 진입. **'처리 저장' 버튼이 그대로 보이면 gap** — `ReturnDetailPage.tsx:110` 을 그대로 따르면 된다. `grep -rn 'useRouteWritePermissions\|useRouteCan' apps/admin/src/pages/support/` = **0**(앱 전체로는 8건). read 를 끄면 403 화면(이쪽은 pass). 범위: **이 화면**(공용 훅 + 선례 존재) | **gap** |
| EXC-04 | EXC | 직접 | **부분 해소 — 여전히 미충족(사유 축소).** ✔ **유령 저장은 닫혔다**(F3b): `ticketAdapter` 는 손조립 어댑터지만 이제 **자기 자리에서 가드를 갖는다** — `data-source.ts:17` `const exists = (id) => listTickets().some(...)`, `:44-46` `if (!exists(id)) throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 변경한 문의입니다.')`(`:42-43` 주석이 '`updateTicket` 은 map 이라 없는 id 를 조용히 지나치고 성공을 반환했다'고 전환을 밝힌다). `fetchOne` 도 `:31-33` 에서 `HttpError(404, '문의를 찾을 수 없습니다.')` 를 던진다(`:29-30` 주석). store 의 `updateTicket`(`_shared/store.ts`, `map`)이 여전히 조용히 지나치더라도 **어댑터 경계가 그 앞을 막는다**. ✘ **남은 것 둘**: ① **낙관적 동시성 토큰이 없다** — `Ticket` 에 `updatedAt`/`version` 이 없어 `If-Match`/`ETag` 로 보낼 값이 없다. 어댑터의 409 는 **'대상이 아직 존재하는가'** 로만 판정하므로 **둘 다 존재하는 동시 편집은 last-write-wins** 다. **이 화면에서 그 대가가 특히 크다** — 타임라인 **전체 치환** PUT(`TicketDetailPage.tsx:143` `buildTimeline(ticket, draft, …)`)이라 A 가 상세를 연 뒤 B 가 답변을 달았다면 **A 의 저장이 B 의 답변을 통째로 지운다**(BE-026 §7.3). 답변은 고객에게 나가는 값이다. ② **409 를 해소할 UI 가 없다** — 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 conflict 다이얼로그(`useCrudForm.ts:166-179`, 입력 보존 + reload/dismiss)를 상속하지 못한다. 어댑터·서버가 409 를 줘도 `onError`(`TicketDetailPage.tsx:155-158`)가 FS-026-EL-018 의 generic '저장하지 못했습니다' 배너로 뭉갠다 | ① 탭 A 에서 `/support/tickets/:id` 를 연 채 다른 경로로 그 티켓을 저장소에서 제거 → A 에서 '처리 저장' → **어댑터가 409 를 던져 저장이 성공하지 않는다** = 유령 저장 해소. **그러나 배너가 '다른 사용자가 먼저 변경했다'고 말하지 않고 재조회 경로도 없다** = 요구의 conflict dialog 미충족. ② 탭 A 가 상세를 연 사이 탭 B 가 답변 저장 → A 가 저장 → **경고 없이 B 의 답변이 사라진다**. ③ `?status=save:409` → 여전히 generic 배너. ④ `grep -n 'updatedAt\|version\|If-Match' apps/admin/src/pages/support/tickets/` = 0 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `onSave`(`TicketDetailPage.tsx:127-161`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다** — 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅이 제공하는 두 장치(`useCrudForm.ts:102` `submitLockRef` · `:112-117` `idempotencyKeyRef`/`takeIdempotencyKey`)를 상속하지 못한다. 방어는 `disabled={saving \|\| !dirty \|\| assigneeRequiredError !== null}`(`TicketWorkspace.tsx:252`) 하나뿐이다. **완화 요인**: 이 버튼은 `type="submit"` 이 아니라 `onClick` 이라 RHF 비동기 검증 지연이 없어 창이 좁다. 그러나 `update.mutate` 는 비동기이고 `saving` 은 리렌더 후에야 true 가 되므로 **그 사이의 빠른 두 번째 클릭은 두 번째 요청을 만든다** — 결과는 타임라인에 **같은 답변 이벤트 2건**이며, 답변은 고객에게 전송되는 값이다 | 상세에서 답변 입력 후 '처리 저장'을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** 코드상 `submitLockRef` grep 이 이 화면에서 0건임으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | 세 지점이 전부 배선돼 있다. ① **onError** — `if (isAbort(cause)) return;`(`TicketDetailPage.tsx:156`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). ② **onSuccess** — `if (controller.signal.aborted) return;`(`:149`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:89`)가 이탈 시 진행 중 저장을 취소한다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다. bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다(취소된 요청) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **9** | **STATE-01** · **COMP-10** · TOKEN-01 · TOKEN-05 · FEEDBACK-04 · A11Y-11 · IA-01 · **IA-13** · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **4** | STATE-04 · FEEDBACK-06 · A11Y-12 · IA-05 |
| `gap` | **6** | STATE-02 · IA-02 · IA-04 · EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 9 + 11 + 4 + 6 = **30** ✓ |

> **직전 기준(`4b805ad`) 재판정: P0 gap 이 9 → 6 으로 줄었다.** 뒤집힌 3건은 전부 **F3b 의 공용 훅 롤아웃을 이 화면이 실제로 소비한 결과**다:
> · **STATE-01** — `TicketListPage.tsx:163,165` 가 `firstLoading`/`refreshing` 을 파생한다(예전엔 `isFetching` 직결).
> · **COMP-10** — `:193-199` 이 `list.searchInputProps` 를 스프레드하고, `useListState` 가 내부에서 `useDebouncedSearch`(조합 판정 + 250ms)를 소비한다(`useListState.ts:227-230`).
> · **IA-13** — `:129` `useListState({ filterDefaults })` 가 필터 4종 + 검색어를 URL 로 옮겼다. **이 화면이 그 손실이 가장 컸던 곳이다**(`TicketListPage.tsx:7-12` 주석: 트리아지는 축 네 개를 조합해 세팅한 뒤 문의를 하나씩 열고 닫는 반복 작업인데, 상태가 useState 에만 있으면 상세에서 Back 할 때마다 그 세팅이 통째로 날아갔다).
>
> **EXC-04 는 범위만 좁아졌으므로 gap 을 유지했다** — 유령 저장은 닫혔고(`data-source.ts:44-46`) 남은 것은 동시성 토큰과 conflict UI 다. **좁혀진 gap 을 pass 로 올리지 않았다.**
>
> **P0 gap 6건 — quality-bar '배치 실패' 사유.** 성격이 F2 때와 달라졌다: **IA-02 · IA-04 만 앱 전역/공용 프레임워크 범위**(sub-route title 모델 · Pagination 부재)이고, **나머지 4건(STATE-02 · EXC-03 · EXC-04 · EXC-08)은 이 화면이 공용 계층을 소비하지 않아 남은 것**이다 — EXC-03 은 `useRouteWritePermissions`(8곳 소비, 최근접 선례 `ReturnDetailPage`), EXC-04·EXC-08 은 `useCrudForm` 의 conflict 다이얼로그·`submitLockRef`·멱등키. §5 의 '범위' 열 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·날짜 범위·금액·CSV·페이지네이션 range 등)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **해소됨(F3b).** `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배하는데, **이제 화면이 그 이득을 쓴다** — `TicketListPage.tsx:165` `refreshing = isFetching && data !== undefined` 를 파생해 `:259` `<p aria-busy={refreshing}>` + `:261` `{refreshing && ' · 새로고침 중…'}` 으로 **건수를 지우지 않고 가벼운 인디케이터만 덧붙인다**. 스켈레톤은 `firstLoading` 에만 걸린다(`:304`) | 데이터가 있는 상태의 재조회에서 이전 행이 화면에 유지되고 요약이 `전체 N건 · 새로고침 중…` 이 되는지 | pass |
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
| ERP-13 | P1 | **해소됨(통합).** 조사 헬퍼가 `shared/format.ts:269+` 로 승격됐고(`objectParticle` `:306` · `topicParticle` `:311` · **`directionParticle` `:321`**) 이 화면이 그것을 소비한다 — `tickets/process.ts:5` `import { directionParticle } from '../../../shared/format'` · `:54` `` `상태를 '${ticketStatusLabel(draft.status)}'${directionParticle(ticketStatusLabel(draft.status))} 변경` ``. 이제 '처리중**으로** 변경' / '완료**로** 변경' 가 나온다(`directionParticle` 은 ㄹ 받침을 받침 없음처럼 다룬다 — `format.ts:286`). **이 문구는 타임라인에 저장돼 고객 분쟁 시 증거로 남으므로 이 수정의 값이 특히 크다.** 나머지 templated copy 도 폴백형이 없다(`process.ts:29`) | 사용자 대상 문자열의 `(으)로`/`이(가)`/`을(를)` grep = 0 → **통과**(앱 전역 잔여 히트 12건은 주석·헬퍼 설명문·'이 리터럴을 내지 않는다'를 단언하는 테스트) | pass |
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
| ~~1~~ | ~~STATE-01 · STATE-03~~ | ~~P0 · P1~~ | **해소됨(F3b)** — `TicketListPage.tsx:163,165` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 를 파생하고, 스켈레톤(`:304`)·`aria-busy`(`:264`)는 `firstLoading` 만, 요약(`:259-261`)은 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. **같은 결함이라 적었던 5개 화면도 함께 고쳐졌다** — `CustomerFaqPage.tsx:72-74` · `CategoriesPage.tsx:176-178` · `PortfolioCategoriesPage.tsx:175-177` 를 직접 확인했다 | — | — |
| 2 | STATE-02 · EXC-12 · EXC-06 | P0 · P1 | 상세 조회 실패에 '다시 시도' 가 없고 404/5xx 를 구분하지 않는다. 근본 원인은 `getTicket` 이 `HttpError(404)` 가 아닌 일반 `Error` 를 던지는 것 | 이 화면 + 어댑터 | A11 · A63 (BE-026 §7.11 #5) |
| ~~3~~ | ~~COMP-10~~ | ~~P0~~ | **해소됨(F3b)** — `TicketListPage.tsx:193-199` 이 `list.searchInputProps` 를 `SearchField` 에 스프레드하고, `useListState`(`:129`)가 내부에서 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다: 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) · 조합 중 Enter 차단(`:121-124`) · 250ms 디바운스(`:23,93-95`). stale 응답은 클라이언트 필터라 애초에 없다 | — | — |
| 4 | IA-02 | P0 | **`<h1>` 이 2개**(AppHeader `:101` '1:1 문의' ↔ `TicketDetailPage.tsx:193` '문의 처리') — '단일 title 메커니즘' 미충족. 목록/상세의 title 소스가 갈린다. 그리고 '행위'가 AppHeader 제목에 없다(`nav-config.ts:294-296` 이 의도로 명시). *(브랜치 라벨 '고객센터' 폴백은 `findCoveringLeaf`(`:260-278`)로 해소 — 이제 '1:1 문의')* | **앱 전역**(`AppHeader`·title 모델) | A40 · A11 |
| 5 | IA-04 · ERP-15 | P0 · P1 | 페이지네이션 없음 — 전량 렌더. 문의는 상한 없이 증가 | 이 화면 + BE 계약 | A11 · A63 (BE-026 §7.9 — IA-13 과 한 배치) |
| ~~6~~ | ~~IA-13~~ | ~~P0~~ | **해소됨(F3b)** — `TicketListPage.tsx:129` `useListState({ filterDefaults: FILTER_DEFAULTS })` 가 상태·우선순위·채널·유형·검색어를 URL 쿼리스트링으로 옮겼다. 기본값은 URL 에서 지우고(`useListState.ts:113-118`) `replace` 로 갱신해(`:125`) 상세에서 Back 하면 트리아지 큐가 그대로 복원된다. 손으로 고친 값은 `parseFilter`(`:130-144`)가 안전하게 좁힌다 | — | — |
| 7 | EXC-03 | P0 | write 액션 게이팅 미배선 — **`useRouteWritePermissions`/`useRouteCan` 은 이제 8곳이 소비하지만**(products 3 · settings 4 · logs 1) `pages/support/**` 는 그 밖이다. 최근접 선례는 같은 '상세에서 처리 저장' 패턴인 `products/returns/ReturnDetailPage.tsx:110`. read 게이팅은 pass | **이 화면**(공용 훅 + 선례 존재) | A11 change_request |
| 8 | EXC-04 | P0 | **If-Match/version 없음**(동시 편집 last-write-wins — 타임라인 전체 치환이라 **남의 답변이 사라진다**) · **409 해소 UI 없음**(`useCrudForm` 미사용 → conflict 다이얼로그 미상속, `TicketDetailPage.tsx:155-158` 이 generic 배너로 뭉갠다). *(유령 저장은 F3b 의 어댑터 가드 — `data-source.ts:17,44-46` — 로 해소)* | 이 화면 + 도메인 모델 + BE 계약 | A63 (BE-026 §7.5) · A11 |
| 9 | EXC-08 | P0 | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. 연타가 답변 이벤트를 2건 만든다 | 이 화면 | A11 · A63 (BE-026 §7.11 #9) |
| 10 | COMP-01 | P1 | `buttonStyle()`/`tds-ui-btn-*` 손조립 + 손으로 쓴 '저장 중…' — **quality-bar 가 `TicketListPage` 를 명시 지목** | 이 화면 | A11 change_request |
| 11 | COMP-08 · A11Y-08 | P2 · P1 | 중복 '상세' 버튼. 단 제목이 링크가 아니라 그것이 유일한 키보드 경로 — **제목 링크 승격이 선행돼야 제거 가능** | 이 화면 | A11 change_request (한 묶음) |
| 12 | A11Y-13 | P1 | 폼 진입 첫 필드 포커스·검증 실패 시 첫 오류 포커스 없음 | 이 화면 | A11 change_request |
| 13 | A11Y-16 | P1 | 답변/메모 유형 토글에 `aria-pressed` 없음 — 선택 상태가 색으로만 인코딩 | 이 화면 | A11 change_request |
| 14 | EXC-07 · EXC-20 | P1 | 422 필드 매핑 없음 · 5xx reference code 미표시 | 이 화면 | A11 |
| ~~15~~ | ~~ERP-13~~ | ~~P1~~ | **해소됨(통합)** — 조사 헬퍼가 `shared/format.ts:269+` 로 승격됐고 이 화면이 소비한다: `tickets/process.ts:5` `import { directionParticle }` · `:54` `` `상태를 '${ticketStatusLabel(draft.status)}'${directionParticle(...)} 변경` `` → '처리중**으로** 변경' / '완료**로** 변경'. **타임라인에 저장되는 값이라 이 수정이 특히 중요했다** | — | — |
| 16 | STATE-05 | P1 | 빈 상태 3분기 미구분 — 공유 `Empty` 미사용 | 이 화면 | A11 change_request |
| 17 | COMP-06 · COMP-07 · COMP-09 · ERP-08 | P2 | 스켈레톤 `length: 5` · `SeqCell` 에 `startIndex` 없음(페이지네이션 도입 시 발현) · 셀 truncate 없음 · `durationLabel` 의 raw `String()` | 이 화면 | A11 (#5 와 함께) |
| 18 | COMP-12 | P2 | 답변 상한 근접 경고 없음 · counting 기준 미정의 | 이 화면 | A11 |
| 19 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 |
| 20 | (§4.3) | — | **감사 무결성** — 타임라인 author 하드코딩 · 클라이언트 시각/id · 전체 치환으로 동시 답변 유실 | 이 화면 + BE 계약 | **A63 (BE-026 §7.2·§7.3 — 최우선)** |
| 21 | (§4.1) | — | 저장 요청 크기가 이력에 비례해 무한 증가 | BE 계약 | A63 (BE-026 §7.3 안 A 가 해소) |
| 22 | (BE-026 §7.4) | — | 유형·템플릿 조회가 어댑터 없는 동기 store 직접 호출 — 연동 시 **화면 코드가 함께 바뀐다** | 이 화면 | A11 (연동 산정에 포함) |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `a5c2639`(2026-07-17) 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

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
- [x] §2.1 산수 검산 — 9 pass + 11 종속 + 4 n-a + 6 gap = **30** ✓
- [x] **판정 기준일을 `2026-07-17 · HEAD = a5c2639` 로 갱신하고 PR #22·#24·#26·#28·#30·#32·#34 이후 코드로 P0 30건을 전수 재확인했다. 이번 기준 갱신으로 뒤집힌 판정은 없다 — §2.1 건수 불변.** MOTION-01/02 는 **근거 텍스트만** 갱신했다(오버레이 모션이 CSS-only 로 구현됐다 — `Modal.css:126-168` · `Toast.css:109-141`; **'라이브러리 0건이라 gap 일 가능성' 추정을 삭제**했다). **이 화면은 `useModalDirtyGuard` 소비가 0건이라 DS Modal 의 `closingRef` latch 결함**(NFR-027 §2 FEEDBACK-06)**에 노출되지 않음을 확인**했다. **MOTION-03 의 `ToggleSwitch` 는 이 화면에 없다**(그 DS gap 자체도 `ToggleSwitch.css:79-84` 로 해소됐다). 아래는 직전 기준(`4b805ad`)의 재확인 결과이며 그대로 유효하다: 뒤집힌 P0 **3건**(STATE-01 · COMP-10 · IA-13 — 전부 이 화면이 F3b 의 공용 훅을 실제로 소비한 결과)을 pass 로 올리고 §2.1·§5 를 함께 갱신했다. **P1 2건도 pass 로 전환**(STATE-03 · ERP-13). **EXC-04 는 유령 저장만 닫히고 동시성 토큰·conflict UI 가 남아 gap 을 유지했다** — 좁혀진 gap 을 pass 로 올리지 않았다
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·날짜범위·금액·CSV)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`support-tickets`)와 op 3종을 **어댑터 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-026 §7 · BE-026 §7.11 과 일치한다
