---
id: NFR-053
title: "상담 이력 비기능 명세"
functionalSpec: FS-053
backendSpec: BE-053
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-053. 상담 이력 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-053 상담 이력 (`/sales/consultations` · `/sales/consultations/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-053(요소·예외) · BE-053(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-053 §7 · BE-053 §7.6 과 번호가 일치해야 한다 |
| 판정 근거 | **기준일 2026-07-17 · `HEAD = 4b805ad`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크(`shared/crud`)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 화면 성격 — **N/A 가 많은 이유**

**이 화면은 완전한 읽기 전용이다.** 폼·저장·삭제·행 선택·토스트·다이얼로그가 **하나도 없고**, `useToast` 조차 import 하지 않으며, 사용자가 시작하는 쓰기가 **0건**이다(FS-053 §1 — 세 파일의 헤더 주석과 심의 '(읽기 전용)' 이 그것을 선언).

**그 결과 P0 30건 중 14건이 `n-a`** 다. 이것은 판정 회피가 아니라 **화면 성격의 직접적 귀결**이다 — quality-bar 의 P0 중 `FEEDBACK-*`(3건) · `A11Y-01/02/11`(toast·dialog·폼 필드) · `MOTION-01/02`(Modal·Toast) · `EXC-04/08/09`(쓰기 경합·중복 제출·abort) · `STATE-04`(선택·페이징) · `A11Y-12`(토글 필터) · `IA-05`(폼 라우트 쌍)이 **전부 쓰기·폼·모달 표면을 전제**하는데 이 화면에 그것이 없다. **N/A 마다 사유를 코드 근거와 함께 댔고, 표면이 생기면 재판정하도록 조건을 적었다.**

**이름 충돌 주의**: `/reservations/consultations`(FS-039 **상담 예약** — 미래·쓰기 있음)와 **다른 화면**이다. 이 문서의 N/A 판정을 그 화면에 옮기면 **전부 틀린다.**

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** 목록이 `useCrudListQuery` 를 **직접** 쓰지만(`ConsultationListPage.tsx:127`) `isFetching` 을 loading 으로 직결하지 **않는다** — `:131` 이 `const firstLoading = isFetching && data === undefined` 로 **로컬 파생**하고 주석(`:128-130`)이 그 전환을 기록한다('예전엔 `isFetching` 을 그대로 loading 이라 불러 그 행을 스켈레톤으로 덮었다'). 그 `firstLoading` 만이 스켈레톤(`:227`)과 요약 문구(`:192`)를 지배하고, **`aria-busy={isFetching}`(`:196`)이 재조회 표시를 따로 맡아 둘이 분리된다** — 주석(`:195`)이 그 설계를 선언한다('행은 남기되 보조기기에는 갱신 중임을 알린다'). `placeholderData: (previous) => previous`(`crud.ts:254`)가 그 이전 행을 공급한다. 4상태가 배타적이다: 스켈레톤(`data===undefined`) / empty(`visible.length===0`) / 행 / error 배너(`:138`, 화면 전체 대체). 상세도 정상 — `consultation === undefined`(`ConsultationDetailPage.tsx:122`) | `/sales/consultations` 진입 → 데이터 렌더 확인 → 유형 필터 변경으로 재조회 유발(또는 `staleTime` 30초 경과 후 재진입). **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 배너만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **부분 미충족.** 목록은 충족 — `:138-151` 이 `<Alert tone="danger">` + '다시 시도'(`refetch`)를 렌더하고 error toast 를 쓰지 않는다(**이 화면에 toast 가 아예 없다**). **상세가 미충족** — `ConsultationDetailPage.tsx:93-104` 의 실패 Alert 에 **'다시 시도' 컨트롤이 없고 '목록으로'만 있다**(FS-053-EL-014). 어댑터는 404 를 `HttpError` 로 정확히 던지는데도(`crud.ts:105-107`) 화면이 `detailQuery.error !== null` 하나로 뭉갠다. **같은 섹션의 FS-052 는 `useCrudForm` 의 `loadFailure` 로 그 둘을 정확히 가른다**(`ProjectFormPage.tsx:242-264`) — 이 화면이 그 셸을 쓰지 않아 상속하지 못했다 | `/sales/consultations/cs-1?status=detail:500` 진입. **danger Alert 는 뜨지만 '다시 시도' 버튼이 없으면 gap.** `?status=detail:404` 와 화면이 같은지도 확인 | **gap** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **페이지네이션이 없고**(FS-053-EL-007 — `visible.map`(`:244`)이 전량 렌더, `<Pagination` grep 0건) ② **행 선택이 없다**(표에 체크박스 컬럼이 없고 일괄 작업이 범위 밖 — BE-053 §7.4). `useListState` 가 `selectedIds`·`toggleAll`·`clampPage`(`useListState.ts:68-74`)를 **제공하지만 이 화면은 소비하지 않는다** — 훅을 쓴다는 사실이 이 요구의 표면을 만들지 않는다. 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 지점이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션·행 선택 도입 시 재판정. `clampPage` 가 이미 준비돼 있어(`useListState.ts:217-223`) 도입 비용은 낮다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/sales/consultations/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 5)`(`:77`) 같은 space 토큰 배수로만 표현한다 | `grep -nE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|(outline\|border): *(thin\|medium\|thick)" apps/admin/src/pages/sales/consultations` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 직접 | **미충족 — 이 화면의 유일한 포커스 표면 이탈.** 대부분의 포커스 가능 요소는 DS/공유 클래스를 소비한다: `tds-ui-focusable`('상세' 버튼 `:267` · 상세 back 버튼 `ConsultationDetailPage.tsx:110`) · DS `<Button>`·`<SearchField>`·`<SelectField>`. **그러나 '후속조치 대기만' 체크박스**(`:179-186`)는 `style={checkboxStyle}` 만 있고 **`tds-ui-focusable` 클래스가 없다** → `ui.css:14-17` 의 `outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus)` 가 **걸리지 않고 브라우저 기본 포커스 링이 그려진다.** 요구의 첫 문장('모든 `:focus-visible` ring 는 단일 토큰 쌍에서 렌더한다')과 실질 절('nav-row focus ring 이 button/input 과 픽셀 동일')을 어긴다. **앱의 다른 `checkboxStyle` 소비처 4곳은 그 클래스를 붙인다** — `AdminsTable.tsx:135` · `TierCriteriaCard.tsx:112` · `MembersTable.tsx:164` · `DashboardWidgetsCard.tsx:137` — 즉 **관례가 있는데 이 한 곳이 빠졌다.** **완화 요인**: acceptanceCheck 의 grep 절('모든 `:focus-visible` outline 선언이 `var(--tds-border-width-medium)` 를 사용')은 이 화면에 로컬 선언이 0건이라 **공허하게 통과**한다 — 선언이 없어서 통과하는 것이지 링이 옳아서가 아니다 | 키보드로 Tab 해 '후속조치 대기만' 체크박스에 도달 → **포커스 링이 옆의 '상세' 버튼·검색 입력과 두께·색이 다르면 gap.** `grep -n "checkboxStyle" -B2 apps/admin/src/pages/sales/consultations` → `tds-ui-focusable` 이 없음으로도 판정된다 | **gap** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: **스켈레톤 펄스(`tds-ui-skeleton` — `:232`) 하나뿐**이다. Toast·Modal 이 이 화면에 없다(§1.2). DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen 판정에 종속. 이 화면에서는 스켈레톤 펄스가 유효 timing-function 을 계산하는지만 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` 4개(`ConsultationDetailPage.tsx:123,128,158,163`). **Modal·Toast 가 없어** 요구가 나열한 floating surface 중 Card 만 실재한다. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ConsultationDetailPage.tsx:119`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/sales/consultations/cs-1` 의 '상담 이력' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | **충족.** `:156-163` 이 `<SearchField value={list.searchInput} onChange={list.setSearchInput} {...list.searchInputProps} />` 로 공용 `useListState`→`useDebouncedSearch` 를 소비한다(주석 `:161` — '조합 중 커밋 금지 + Enter 차단 — 「김영수」 를 치는 도중 「김영ㅅ」 로 검색되지 않는다'). 그 훅이 세 절을 전부 구현한다: ① 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) ② 조합 중 Enter 차단 — `isComposing`·자체 관측 **두 신호**를 함께 본다(`:121-124`) ③ 250ms 디바운스(`:23,93-95`). `SearchField` 가 `{...native}` 를 `<input>` 마지막에 스프레드해(`SearchField.tsx:66`) 세 핸들러가 도달한다. **stale 응답 절**: 검색이 클라이언트 필터라(`searchConsultations`) 검색어가 쿼리 키에 들어가지 않는다 — **out-of-order 응답 경쟁이 구조적으로 불가능**하다 | `/sales/consultations` 검색창에 IME 로 '김영수' 입력. **조합 중 '기'·'김영ㅅ' 이 URL `?q=` 나 표에 반영되면 gap.** 조합 중 Enter 가 제출하지 않는지, 완성 후 250ms 뒤 커밋이 **1회**인지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **파괴적/비가역 액션이 하나도 없다** — 삭제·수정·저장이 전부 범위 밖이고(BE-053 §7.4) discard 대상이 될 미저장 입력조차 없다(폼이 없다). **결과적으로 `ConfirmDialog` 가 어느 intent 로도 렌더되지 않는다** — `ConfirmDialog`·`useUnsavedChangesDialog` 를 import 하지 않는다(grep 0건). FS-051 은 discard intent 하나로 이 요구가 걸렸고 FS-052 는 delete intent 로 전 절이 걸렸는데, **이 화면은 게이트할 액션 자체가 없다** | 파괴적 액션이 도입되면 재판정 | **n-a** |
| FEEDBACK-04 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼이 없다** — RHF·입력 필드·`isDirty` 가 전부 부재하고 `useUnsavedChangesDialog` 를 import 하지 않는다(grep 0건). unsaved 변경이라는 개념이 성립하지 않는다. **파생 이득**: 세션 만료·프로그램 이동이 아무것도 파기하지 않아 FS-051 §7 #12·FS-052 §7 #16 의 '가드가 `navigate()` 를 못 잡는다' 문제가 **이 화면에는 없다**(§4.2) | 편집 폼이 도입되면 재판정 | **n-a** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** modal 자체가 이 화면에 0건이며(FEEDBACK-02 참조) 그중 폼을 담은 것도 당연히 0건이다 | 폼 modal 이 도입되면 재판정 | **n-a** |
| A11Y-01 | A11Y | N/A | **표면이 없다.** 이 화면은 **toast 를 하나도 띄우지 않는다** — `useToast` 를 import 하지 않는다(두 파일 모두 grep 0건). 쓰기가 없어 통지할 write 결과가 없고, read 실패는 인라인 Alert 가 담당한다(STATE-02). 요구의 appliesTo 는 `ToastProvider viewport` 이며 이 화면은 그 소비자가 아니다. **주의**: 목록의 빈 상태는 평범한 `<td>` 문구라(`:239-241`) `role="status"` 조차 없다 — 그러나 그것은 **STATE-05 의 gap**(공유 `Empty` 미사용)이지 A11Y-01 의 표면이 아니다 | toast 가 도입되면 재판정 | **n-a** |
| A11Y-02 | A11Y | N/A | **표면이 없다.** 이 화면에 `Modal`/`ConfirmDialog` 가 0건이다(FEEDBACK-02 참조). `aria-describedby`→message 를 배선할 다이얼로그가 존재하지 않는다 | dialog 가 도입되면 재판정 | **n-a** |
| A11Y-11 | A11Y | N/A | **표면이 없다.** 요구의 appliesTo 는 '`AccountFormPage`, `CreateGroupModal`, **손수 만든 모든 page/modal 폼**' 이며 **이 화면에 폼이 없다.** 존재하는 컨트롤 3개는 전부 **필터**다: 검색(`SearchField` — DS), 유형 select(`SelectField` + `aria-label` — `:165-176`), 대기 체크박스(`<label>` 로 감싼 raw checkbox — `:178-188`, **암묵적 라벨 연결로 접근 이름은 성립**). **셋 다 오류·힌트·필수 상태를 갖지 않으므로** 요구의 세 절(`aria-invalid`↔`describedby` 짝 · hint 연결 · required 노출)이 **걸릴 지점이 없다.** `aria-invalid`·`aria-required` grep = **0건**(따라서 'describedby 없는 aria-invalid' 도 0건이나, 그것은 조건이 발화하지 않아서다). **체크박스의 포커스 링 문제는 TOKEN-02 가 잡는다** — 이 요구로 겹쳐 잡지 않는다 | 폼이 도입되면 재판정. 현재는 `grep -n "aria-invalid\|aria-required" pages/sales/consultations` → 0건이고 오류 상태를 갖는 컨트롤이 없음을 확인 | **n-a** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 1개 + `<input type="checkbox">` 1개**다(`:164-188`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터 버튼이 존재하지 않으며, 이 화면 전체에 `aria-current` **0건**(grep). **체크박스는 네이티브라 `checked` 가 곧 상태**이며 `aria-pressed` 를 쓰면 오히려 잘못이다 | 좌측 토글 필터가 도입되면 재판정 | **n-a** |
| MOTION-01 | MOTION | N/A | **표면이 없다.** 이 화면에 `Modal`/`ConfirmDialog` 가 0건이다 — enter/exit transition 을 걸 다이얼로그가 존재하지 않는다 | Modal 이 도입되면 재판정 | **n-a** |
| MOTION-02 | MOTION | N/A | **표면이 없다.** 이 화면이 toast 를 하나도 띄우지 않는다(A11Y-01 참조) — exit 를 애니메이트할 toast 가 존재하지 않는다 | toast 가 도입되면 재판정 | **n-a** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: **스켈레톤 펄스(`tds-ui-skeleton` — `:232`)와 DS `<Button>` transition 뿐**이다. **`ToggleSwitch` 는 이 화면에 없다**(요구가 명시 지목한 그 컴포넌트는 FS-052 의 마일스톤 편집기에 있다). Modal·Toast 도 없다. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건) | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:255-256` — `APP_ROUTES` 의 `/sales/consultations` · `/sales/consultations/:id`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 평범한 `<div style={columnStyle}>`(`:154`) · `<div style={pageStyle}>`(`ConsultationDetailPage.tsx:107`)다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **부분 미충족 — 이 화면에서는 중복이 가장 노골적이다.** 해소된 절: `/sales/consultations/:id` 는 nav 잎이 아니지만 `findCoveringLeaf`(`nav-config.ts:269-279`)가 잎 `/sales/consultations` 를 찾아 **AppHeader 가 '상담 이력'을 보인다**(`findNavLabel` `:297-299` → `AppHeader.tsx:92,101`) — **브랜치 라벨('영업 관리') 폴백은 더 이상 발생하지 않는다.** 남은 절: **`<h1>` 이 2개인데 문구가 똑같다** — AppHeader 의 `<h1>상담 이력</h1>`(`AppHeader.tsx:101`)와 상세의 `<h1 style={pageTitleStyle}>상담 이력</h1>`(`ConsultationDetailPage.tsx:119`). **FS-051('문의' vs '문의 처리')·FS-052('프로젝트' vs '프로젝트 등록')는 적어도 두 h1 이 다른 말을 하는데, 이 화면은 완전히 같은 말을 두 번 한다.** 게다가 **어느 h1 도 어느 상담인지 말하지 않는다** — 주제(`topic`)는 `CardTitle`(`:129-135`)에만 있다. 목록은 in-content `<h1>` 이 없어 title 소스 모델이 화면 타입마다 모순이다 | `/sales/consultations/cs-1` 진입. **`document.querySelectorAll('h1')` 이 2개이고 둘 다 텍스트가 '상담 이력' 이면 gap.** AppHeader 의 가시 `<h1>` 이 '상담 이력'(잎 라벨)인지 확인 — **'영업 관리'면 회귀다.** 목록 `/sales/consultations` 는 잎이라 h1 1개로 정상 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·유형 select·대기 체크박스(`:155-189`) → 결과 count 요약(`:191-193`) → table(`:196`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 상담 생성이 범위 밖이다(BE-053 §7.4). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** `visible.map(...)`(`:244`)이 전량을 렌더하며 `<Pagination` 이 `pages/sales` 전체에 **0건**이다(grep). **상담 이력은 append-only 감사 컬렉션이라 상한 없이 매일 쌓인다** — 문의는 고객이 보내야 생기고 프로젝트는 기회 단위지만 **상담 이력은 전화 한 통마다 한 건**이다(BE-053 §7.3). 'page size 초과 가능'이 이 섹션에서 가장 확실하다 | 픽스처를 20건 이상으로 늘리고 `/sales/consultations` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 생성·수정이 범위 밖이고(BE-053 §7.4) `App.tsx:255-256` 이 `/sales/consultations` 와 `/sales/consultations/:id` **2개만** 등록한다. '`:id` 로 구분되는 하나의 컴포넌트/route 쌍' 이라는 요구 자체가 걸리지 않는다. (**같은 섹션의 FS-052 는 그 쌍을 갖고 있고 pass 다** — 이 N/A 는 섹션의 회피가 아니라 이 엔티티의 성격이다) | 폼 라우트가 생기면 재판정 | **n-a** |
| IA-13 | IA | 직접 | **충족.** 유형·후속조치 대기·검색어의 **단일 원천이 URL** 이다 — `:117` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 소비하고, 그 훅이 `useSearchParams` 로 `?type=`·`?pending=`·`?q=` 를 직렬화한다(`useListState.ts:87-99`). **체크박스는 URL 이 문자열만 담으므로 `'true'`/`'false'` 로 직렬화**하고(주석 `:54-58`) 기본값 `'false'` 는 URL 에서 지워진다(`:115-117`). 갱신은 `{ replace: true }`(`:125`)라 필터 조작이 history 를 쌓지 않는다 — **상세에서 Back 하면 그 조건이 걸린 목록 URL 로 착지한다.** 헤더 주석(`:6-9`)이 그 설계를 선언한다 — '「후속조치 대기만」 을 켜 놓고 상담 상세로 들어갔다 Back 하면 전체 목록이 아니라 그 대기 목록으로 돌아온다. 그 URL 을 담당자에게 그대로 넘길 수도 있다'. 손으로 고친 `?type=거짓말` 은 `parseFilter`(`:119-123`)가 '전체'로 되돌린다. **scroll 위치 복원은 없다**(요구가 '가능하면'으로 둔 절) | `/sales/consultations` 에서 유형='방문상담' + 대기 체크 + 검색='대성' 적용 → URL 이 `?type=visit&pending=true&q=대성` 인지 확인 → 행 클릭으로 상세 진입 → 브라우저 Back. **URL 과 필터가 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지, 대기 해제 시 `?pending=false` 가 URL 에서 **지워지는지** 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(+ `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache` `onError` → `notifySessionExpired()` → `SessionExpiryWatcher` 가 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회 실패가 전부 이 인터셉터를 통과한다.** `MutationCache` 경로는 **이 화면에 mutation 이 없어 걸리지 않는다.** **파생 이득 둘**: IA-13 덕에 `returnUrl` 에 필터 조건까지 실려 복귀 시 그 view 가 복원되고, **미저장 내용이 없어 EXC-19(폼 유실)가 이 화면에는 성립하지 않는다** — FS-051·FS-052 와 갈리는 지점(§4.2) | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Fsales%2Fconsultations…&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **충족 — 이 섹션에서 유일하다.** 요구는 세 절이다. **① read-forbidden deep-link → 403 화면 — 충족(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`RequirePermission.tsx:61-64`) `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생(`route-resource.ts` — '자기를 감싸는 가장 구체적인 잎')이 `/sales/consultations/:id` 까지 덮는다. **② create/update/delete 컨트롤을 `can()` 이 false 면 렌더하지 않는다 — 표면이 없어 vacuous 충족**: 이 화면에 **쓰기 컨트롤이 0건**이다(FS-053 §1 — 폼·저장·삭제·행 선택 전부 부재). 게이팅할 버튼이 존재하지 않으므로 `useRouteWritePermissions` 를 소비하지 않는 것이 **결함이 아니다.** ③ **강등 reconcile — 표면이 없어 vacuous 충족**: 숨기거나 disable 할 이전 액션이 없다. **이 판정이 FS-051·FS-052 와 갈리는 이유를 분명히 한다**: 저 둘은 **쓰기 컨트롤이 실재하는데 게이팅이 없어 gap** 이고, 이 화면은 **쓰기 컨트롤 자체가 없어 pass** 다 — 같은 훅을 안 쓴다는 사실이 세 화면에서 다른 판정을 낳는 것이 옳다 | 권한 스토어에서 `sales/consultations` 의 `read` 를 끄고 `/sales/consultations` deep-link → **403 화면이 뜨면 pass.** `update`/`remove` 를 꺼도 **바뀔 UI 가 없음**을 확인(쓰기 컨트롤 0건). `grep -rn "useRouteWritePermissions\|useRouteCan" pages/sales/consultations` → 0건이나 그것이 gap 이 아님을 코드로 확인 | **pass** |
| EXC-04 | EXC | N/A | **표면이 없다.** 요구의 appliesTo 는 '`createCrudAdapter.update/remove`, **모든 record 폼**' 이며 이 화면에 **mutable record 의 write 가 0건**이다 — `consultationAdapter.update`/`remove` 가 어댑터에 **존재하지만 호출부가 0건**이고(grep), 화면에 폼·저장 버튼이 없다. optimistic-concurrency token 을 실을 요청 자체가 없고, 409 를 받을 경로도 conflict dialog 를 띄울 자리도 없다. **어댑터가 409 를 낼 능력을 갖고 있다는 사실**(`crud.ts:126-128,139-141`)은 **이 화면의 판정에 아무것도 더하지 않는다** — 발현될 수 없기 때문이다 | 쓰기가 도입되면 재판정. 그때는 `Consultation` 에 `version` 이 없다는 사실(`types.ts:11-30`)이 즉시 gap 이 된다 | **n-a** |
| EXC-08 | EXC | N/A | **표면이 없다.** 요구의 대상은 '모든 **user-initiated write**' 이며 이 화면에 그것이 **0건**이다 — submit/confirm 버튼이 없고, `submitLockRef` 를 걸 제출 경로도, `Idempotency-Key` 를 실을 mutation 도 없다. 요구가 '금액/생성/발송 작업 필수'라 강조한 그 어느 것도 이 화면에 없다 | 쓰기가 도입되면 재판정. `useCrudForm` 을 쓰면 즉시 상속된다(FS-052 가 그 선례 — `useCrudForm.ts:103,118-123`) | **n-a** |
| EXC-09 | EXC | N/A | **표면이 없다.** 요구의 네 절이 **전부 write 경로**다 — 'error toast 없음'(toast 부재) · 'isPending 리셋(`mutation.reset`)'(mutation 부재) · 'list/cache 무변경'(무효화 부재) · 'bulk 실패 count 에서 abort 제외'(bulk 부재). 이 화면에 mutation·dialog close handler 가 0건이고 `isAbort`·`AbortController` 를 import 하지 않는다(grep). **읽기 경로의 취소는 react-query 가 소유한다** — `fetchAll({ signal })`(`crud.ts:94`) → `wait(LATENCY_MS, signal)` 이 언마운트·키 변경 시 자동 abort 되고 **화면은 아무 에러도 그리지 않는다**(react-query 가 취소된 쿼리를 error 로 올리지 않는다). 그 동작은 이 요구의 절이 아니라 라이브러리 계약이다 | mutation·dialog 가 도입되면 재판정 | **n-a** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **7** | STATE-01 · TOKEN-01 · TOKEN-05 · COMP-10 · IA-01 · IA-13 · EXC-03 |
| `종속` | **5** | TOKEN-03 · TOKEN-04 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **14** | STATE-04 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-01 · A11Y-02 · A11Y-11 · A11Y-12 · MOTION-01 · MOTION-02 · IA-05 · EXC-04 · EXC-08 · EXC-09 |
| `gap` | **4** | STATE-02 · TOKEN-02 · IA-02 · IA-04 |
| **합계** | **30** | 7 + 5 + 14 + 4 = **30** ✓ |

> **`n-a` 14건은 회피가 아니라 화면 성격이다**(§1.2). 이 화면은 **완전 읽기 전용**이라 quality-bar P0 의 절반이 전제하는 표면(쓰기·폼·modal·toast·선택)이 존재하지 않는다. **각 N/A 에 코드 근거(grep 0건)와 재판정 조건을 달았다** — 표면이 생기면 그 칸이 즉시 살아난다.
>
> **P0 gap 4건 — quality-bar '배치 실패' 사유.** 성격이 넷으로 갈린다:
> - **이 화면만의 배선 누락(저비용)**: `TOKEN-02`(체크박스에 `tds-ui-focusable` 한 단어 — **앱의 다른 4곳은 붙인다**). **즉시 고칠 수 있다.**
> - **`useCrudForm`/`FormPageShell` 미상속의 파생**: `STATE-02`(404 vs 5xx 분기 + retry). **어댑터는 이미 404 를 던진다** — 화면이 status 를 안 볼 뿐이다.
> - **앱 전역 횡단**: `IA-02`(h1 이중 — **이 화면에서는 두 h1 의 문구가 완전히 같다**).
> - **셸·계약**: `IA-04`(페이지네이션 — **이 섹션에서 증가 속도가 가장 빠른 컬렉션**).
>
> **`EXC-03` 이 pass 인 것이 이 화면의 특징이다** — FS-051·FS-052 는 쓰기 컨트롤이 실재하는데 게이팅이 없어 gap 이고, 이 화면은 **쓰기 컨트롤 자체가 없어** 요구의 두 절이 vacuous 충족된다. 같은 훅을 안 쓴다는 사실이 세 화면에서 다른 판정을 낳는 것이 옳다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(폼·재정렬·업로드·날짜범위·CSV·좌측 필터 패널·페이지네이션 range·optimistic write·bulk)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **화면이 그 이득을 실제로 쓴다** — `firstLoading`(`:131`)이 스켈레톤을 최초 로드로 묶고 `aria-busy={isFetching}`(`:196`)이 재조회를 따로 알린다(STATE-01 과 같은 뿌리). **다만 '가벼운 refetch 인디케이터'가 시각적으로 없다** — `CrudListShell` 은 '· 새로고침 중…' 을 덧붙이는데(`CrudListShell.tsx:120`) 이 화면은 그 셸을 쓰지 않아 `aria-busy` 만 있고 눈에 보이는 표시가 없다. **추가**: 쓰기가 없어 **무효화 트리거 자체가 없다** — 재조회는 `staleTime` 경과 후 재진입 시에만 일어나 이 요구가 걸리는 빈도가 낮다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되는지 | **pass(단 가시 인디케이터 없음)** |
| STATE-05 | P1 | **미충족 — 셋 중 이 화면만 빠졌다.** 빈 상태가 `'상담 이력이 없습니다.'` **한 문구**뿐이다(`:237-242`) — 공유 `Empty`(3분기 copy + 복구 액션 + 조사 + `role="status"`)를 쓰지 않는다. 검색 0건·필터 0건·진짜 0건이 구분되지 않아 '검색 지우기'/'필터 초기화' 가 없고, **`role="status"` 조차 없어** 필터로 0행이 되는 전환이 AT 에 들리지 않는다. **`useListState` 가 `hasQuery`·`hasActiveFilters`·`clearSearch`·`resetFilters` 를 이미 돌려주고 있는데**(`useListState.ts:62-66`) 화면이 소비하지 않는다 — **FS-051 은 같은 훅의 같은 값을 `Empty` 에 그대로 넘긴다**(`InquiryListPage.tsx:240-247`). **수정 비용이 낮다** | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기가 나오는지. 필터로 0건 → '필터 초기화' | **gap** |
| STATE-06 | P1 | **N/A — 표면이 없다.** 이 화면에 write 가 없어 invalidate 할 것이 없다. `useCrudListQuery` 만 쓰고 `useCrudUpdate`/`useCrudDelete` 를 import 하지 않는다 | 쓰기가 도입되면 재판정 | **n-a** |
| COMP-01 | P1 | **미충족 — quality-bar 가 `ConsultationListPage` 를 appliesTo 에 명시 지목한다.** `:265-273` 이 `buttonStyle('secondary')` + `className="tds-ui-btn-secondary tds-ui-focusable"` 로 `<button>` 을 손조립한다 — 요구가 정확히 금지한 그 패턴이다. **같은 섹션의 FS-051·FS-052 는 grep 0건**(전자는 DS `<Link>`, 후자는 DS `RowActions`) — **셋 중 이 화면만 남았다.** back 버튼(`ConsultationDetailPage.tsx:108-116`)도 손조립이나 그것은 IA-07 의 공유 back-link 관례라 위반으로 보지 않는다. `loading` prop 절은 **표면이 없다**(진행 상태를 가질 버튼이 없다) | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/sales/consultations -r` → 0건이어야 한다. **현재 1파일 2건**(`:267,268`) | **gap** |
| COMP-02 | P1 | 순번 컬럼이 DS `SeqCell`/`SeqHeaderCell` 을 쓴다(`:202,246`). **raw checkbox 가 1건 있으나**(`:179-186`) 그것은 **행 선택 셀이 아니라 툴바 필터**다 — 요구의 appliesTo('선택 가능한 테이블의 **선택 셀**')에 해당하지 않는다. 이 표에 행 선택이 없다 | 순번 노출 표가 `SeqCell` 을 쓰는지. 선택 셀에 raw checkbox 가 없는지(선택 자체가 없음) | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 를 쓴다(`:156`). raw `<input type="search">` 재구현 **0건**(`type="search"` 는 `SearchField.tsx:63` 내부에만) | `grep 'type="search"' pages/sales/consultations` → 0건 | **pass** |
| COMP-04 | P1 | **N/A — 표면이 없다.** required input 이 이 화면에 0건이다(폼이 없다). bare `<label style={fieldLabelStyle}>` 로 그린 required 필드도 당연히 0건. **툴바의 `<label>`(`:178`)은 required 필드가 아니라 체크박스 라벨**이다 | 폼이 도입되면 재판정 | **n-a** |
| COMP-06 | P2 | **미충족 — 이 섹션에서 가장 나쁘다.** 스켈레톤 행 수가 하드코딩 `Array.from({ length: 5 })`(`:228`)이고 **셀 수도 하드코딩 상수 `COLUMN_COUNT = 8`(`:48,230`)** 이다. **FS-051 은 셀 수를 `COLUMNS.length + 1` 로 파생하고**(`InquiryListPage.tsx:97-107,229`, 주석 `:97` — '열 수를 손으로 세지 않는다') **FS-052 의 셸은 `columns.length + 3` 으로 파생한다**(`CrudTable.tsx:113`). **이 화면만 두 수가 다 하드코딩**이라 **컬럼을 추가하면 스켈레톤만 조용히 어긋난다.** 페이지네이션이 없어 'row 수 === PAGE_SIZE' 기준값 자체가 없다(IA-04 gap 과 연동) | `grep "length: 5\|COLUMN_COUNT = 8" pages/sales/consultations` → 0건이어야 한다. 현재 2건 | **gap** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`:246`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | **미충족.** **중복 '상세' 버튼이 실재한다** — 행 전체 클릭(`rowNavProps` — `:245`)과 '상세' 버튼(`:265-273`)이 같은 `/sales/consultations/<id>` 로 간다. 요구는 읽기전용 테이블에 'whole-row 클릭 + row 내 접근 가능한 링크 하나, 중복 상세 버튼 없음'(형태 a)을 요구한다. **단순 제거는 불가** — 주제 셀이 링크가 아니라(`:255` 텍스트 노드) '상세' 버튼이 **유일한 키보드 도달 경로**다(A11Y-08). **주제의 링크 승격이 선행돼야 한다.** **FS-051 은 제목을 링크로 만들어 이 요구를 pass 한다** — 같은 섹션에서 갈렸고 **해법이 그 파일에 이미 있다**(`InquiryListPage.tsx:262-265`) | 읽기전용 리스트에 중복 '상세' secondary 버튼이 없는지 | **gap** |
| COMP-09 | P2 | 거래처·주제·담당자 셀에 truncate 가 없다(`tdStyle` 그대로 — `:248-256`). 긴 값이 열을 넓혀 표 레이아웃을 민다. 8컬럼 표에 가로 scroll 컨테이너도 없다. **상세의 상담 내용(`:160`)은 `overflow-wrap: anywhere`(`:73`)로 긴 단어를 처리하나 truncate/접기는 없어** 긴 상담록이 카드를 세로로 무한히 늘린다 | 200자 주제 픽스처로 표 폭이 유지되는지 | **gap** |
| FEEDBACK-01 | P1 | **부분 표면.** 규칙 중 이 화면에 걸리는 것은 **'read 실패 → 인라인 Alert'** 하나이며 **충족**한다(`:141` · `ConsultationDetailPage.tsx:96`). 'write 성공/실패 → toast'·'다이얼로그 내부 실패 → 그 다이얼로그의 error 배너'는 **표면이 없다**(쓰기·다이얼로그 부재). '스택 toast 최대 3개'도 무관. **'page 는 임의 배너 state 를 갖지 않는다' — 충족**(로컬 배너 state 0건) | read 실패가 인라인 Alert 로 뜨는지 | **pass(걸리는 절 한정)** |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(마우스 전용 — `<tr>` 에 tabIndex 없음, 훅 헤더 `:9-11` 이 그 전제를 선언 — '접근 가능한 경로가 이미 존재한다는 전제 위에서만 쓴다')이고 **주제 셀이 링크가 아니다**(`:255`). 키보드 등가물은 '상세' 버튼(`:265-273`, 접근 이름 `'<주제> 상세'`) — **도달은 가능하므로 요구의 최소선('row 내 keyboard-focusable 등가물')은 충족**한다. 다만 요구가 기대하는 형태는 'row 내 focusable **name link**' 이고, 현 구조는 **COMP-08(중복 버튼)과 정면 충돌**한다 — 둘을 함께 풀어야 한다(주제를 링크로 승격 → '상세' 버튼 제거) | 행을 Tab 해서 상세를 여는 컨트롤에 도달하는지 | **pass(단 COMP-08 과 연동)** |
| A11Y-16 | P1 | **부분 미충족.** 충족 표면: 표 `aria-busy`·caption(`:196-199`) · 유형 select `aria-label`(`:168`) · 체크박스의 암묵적 라벨(`:178-188`) · '상세' 버튼의 접근 이름(`:269`) · 후속조치 배지의 텍스트 라벨('대기'/결과명 — 색+텍스트 이중 인코딩). **미충족 셋**: ① **목록 유형 배지가 라벨=유형·톤=결과로 두 축을 겹쳐 인코딩**한다(`:250-253`) — **상담 결과가 색으로만** 표현돼 색맹·흑백에서 소실된다(FS-051 의 유형 배지와 같은 병) ② **체크박스의 포커스 링이 DS 토큰이 아니다**(TOKEN-02 와 같은 뿌리 — 요구의 '가시 focus-visible ring' 절) ③ **빈 상태에 `role="status"` 가 없다**(STATE-05 와 같은 뿌리 — 요구의 '비동기 status live-region announce' 절) | 흑백/색맹 시뮬레이션에서 상담 결과가 읽히는지. 체크박스 포커스 링이 이웃과 같은지 | **gap** |
| ERP-01 | P1 | outcome→tone 매핑이 **모듈의 단일 함수**다 — `consultOutcomeTone`(`types.ts:57-61`). per-page meta helper 를 만들지 않았고 목록(`:251`)·상세(`ConsultationDetailPage.tsx:132`)가 같은 함수를 소비한다. **그러나 같은 값이 두 화면에서 다른 색이다** — 상담**유형**이 목록에서는 outcome 톤(`:251`), 상세에서는 **info 고정**(`ConsultationDetailPage.tsx:138`)이다. 요구가 막으려는 것('같은 semantic state 가 화면마다 다른 색')이 **한 화면 쌍 안에서** 발생한다. 또 그 함수가 `pages/sales/consultations` 지역이라 견적/계약과 통합된 앱 전역 레지스트리는 아니다. **추가**: `STATUS_TONE` 같은 **레지스트리 객체가 아니라 if 체인**(`:58-60`)이라 FS-051 의 `STATUS_TONE` 레코드(`inquiries/types.ts:108-117`)보다 확장성이 낮다 | 모든 outcome 이 정의된 tone 으로 해석되는지. **같은 유형 값이 목록·상세에서 같은 색인지** | **gap** |
| ERP-06 | P1 | **부분 충족.** 사용자 대상 문자열이 존댓말로 일관되고 상담일시·건수가 `shared/format`(`formatDateTime`·`formatNumber`)을 경유한다. **미충족**: **후속 예정일(`followUpAt`)이 원본 문자열 그대로**다(`ConsultationDetailPage.tsx:175`) — 같은 화면의 상담일시(`:150`)는 `formatDateTime` 을 쓰는데 **한 화면 안에서 규칙이 갈렸다** | 셀에 raw `toString()`/인라인 날짜가 없는지 | **gap(예정일 한정)** |
| ERP-08 | P2 | 상담일시가 `formatDateTime`, 건수가 `formatNumber` 를 경유한다. **미충족**: **후속 예정일이 `formatDate` 를 거치지 않아** 유효하지 않은 값의 폴백이 없다(`:175` — `followUpAt === '' ? '—' : followUpAt`). 미래 timestamp 가드·상대시간은 이 화면에 표면이 없다 | 날짜가 공유 formatter 를 경유하는지 | **gap(예정일 한정)** |
| ERP-13 | P1 | **충족(vacuous).** 이 화면에 **templated copy 자체가 거의 없다** — 모든 사용자 대상 문자열이 고정 문구('상담 이력이 없습니다.' · '등록된 후속조치가 없습니다.' · '상담 이력을 불러오지 못했습니다.')이고 값을 interpolate 하는 곳은 '상세' 버튼의 `aria-label`(`` `${item.topic} 상세` ``)뿐인데 **조사가 붙지 않는 라벨형**이다. **사용자 대상 리터럴 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0** ✔. **단 '상담 이력을 불러오지 못했습니다.' 의 '을' 은 리터럴**이나 그것은 **고정 명사('상담 이력')에 붙은 것이라 런타임 계산이 필요 없다** — 요구가 막는 것은 '{label} 을(를)' 폴백형이지 하드코딩 문장의 올바른 조사가 아니다. **`Empty` 를 쓰지 않아** 그 컴포넌트의 조사 로직(`Empty.tsx:25-27`)을 상속하지도 않지만, 대신 조사를 틀릴 자리도 없다 — **STATE-05 를 고쳐 `Empty` 를 도입하면 조사는 자동으로 따라온다** | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다**(`visible.map` — `:244`) — cap·virtualization 이 없다. **상담 이력은 append-only 감사 컬렉션이라 상한 없이 증가**하며, 이 섹션에서 **증가 속도가 가장 빠를 수 있다**(전화 한 통마다 한 건 — BE-053 §7.3). **완화 요인**: 검색이 250ms 디바운스를 거친다(COMP-10). 8컬럼 표에 가로 scroll 컨테이너가 없다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. **abort 는 react-query 가 언마운트·키 변경 시 자동으로 건다**(`fetchAll({ signal })` → `wait(LATENCY_MS, signal)`) — 화면이 손으로 관리하는 `AbortController` 가 없다(쓰기 부재) | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | 에러 타입 `HttpError`(status 보유)가 존재하고 어댑터가 **정확한 status 를 던지며**(404 — `crud.ts:105-107`), `?status=<op>:<code>` 로 재현 가능하다(`dev.ts:57-71`). **그러나 이 화면이 status 로 분기하지 않는다** — 목록 실패(`:138`)와 상세 실패(`ConsultationDetailPage.tsx:93`)가 **둘 다 `error !== null` 하나로** 403·404·429·500 을 같은 문구로 뭉갠다. **근본 원인이 FS-026 과 다르다**: 거기선 저장소가 generic `Error` 를 던져 **분기 근거가 없었다**. 여기선 **근거가 있는데 화면이 보지 않는다** — 수정이 화면 두 곳에 국한된다. **이 계약에 400·409·422 가 없어**(BE-053 §5 — 읽기 전용) 갈라야 할 갈래가 403·404·429·5xx **4개뿐**이다 | `?status=detail:404` 와 `?status=detail:500` 이 다른 surface 를 그리는지 | **gap** |
| EXC-12 | P1 | 404 와 generic error 를 구분하지 않는다(FS-053-EL-014 — '상담 이력을 불러오지 못했습니다. ' + '목록으로'만). 공용 `useCrudForm` 은 이를 정확히 구분하고(`useCrudForm.ts:143-149` `loadFailure`) **같은 섹션의 FS-052 가 그것을 소비해 404 면 retry 를 숨긴다**(`ProjectFormPage.tsx:248-256`) — **이 화면이 그 셸을 쓰지 않아 상속하지 못했다.** 어댑터 전제는 이미 충족(404 → `HttpError`). EXC-06 과 같은 뿌리. **완화 요인**: 이 화면은 폼이 아니라 읽기 전용 상세라 `useCrudForm` 을 쓸 이유가 없다 — `isNotFound(detailQuery.error)` 한 줄이면 된다 | 없는 `:id`(`/sales/consultations/nope`)로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. 500 → retry + list 둘 다 | **gap** |
| EXC-13 | P2 | 전역 `retry: false`(`queryClient`)라 transient 5xx 가 즉시 hard error 배너가 된다 — **앱 전역 정책**이며 이 화면은 소비자다. **읽기 전용이라 이 요구의 대상(idempotent read)이 100% 다** — 비-idempotent write 제외 조항이 걸릴 것이 없다 | backend mode 에서 transient 5xx 가 소수 auto-retry 후 성공하는지 | **gap(앱 전역)** |
| EXC-14 | P1 | **N/A — 표면이 없다.** optimistic write 가 있을 수 없다(write 자체가 없다). `onMutate`/`setQueryData` **0건**(grep). un-rolled-back optimistic write 0건 | 쓰기가 도입되면 재판정 | **n-a** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference` 가 존재하고(`shared/errors/http-error.ts:68-75`) `FormServerError` 가 그것을 노출하는데(`ProjectFormPage.tsx:286` 이 그 선례) 이 화면은 고정 문구('상담 이력을 불러오지 못했습니다.')만 쓴다. **raw stack 노출은 없다**(그 절은 충족). **완화 요인**: 이 화면의 실패는 **read 뿐**이라 재시도로 복구 가능하고, 운영자가 신고할 유인이 write 실패보다 낮다 | 강제 500(`?status=list:500`)이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-053 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 쓰기 응답 | **N/A — 쓰기가 없다** | 이 화면의 성능 예산은 **전부 읽기**다 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족.** **쓰기가 없어 무효화 트리거 자체가 없다** — 이 화면의 재조회 횟수는 이 섹션에서 가장 낮다 |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · **커밋당 1회 필터** | **충족** — 250ms 디바운스 + 조합 중 커밋 금지(COMP-10). `useMemo` 로 메모(`:133-136`). **본문(`content`)을 훑지 않아** 필터 비용이 낮다(FS-053 §7 #9 — 그것이 기능 gap 이기도 하다) |
| 응답 크기 | ≤ 200KB | **미충족 — 상한이 없다.** 목록 응답에 **모든 상담의 `content`(전문)** 가 실린다(BE-053 §7.3). `content` 에 **길이 상한이 없어**(BE-053 §7.6 #8 이 10,000자를 제안) 대면미팅 기록 1건이 수천 자 × 전량 = **응답 크기 상한 없음**이다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. **목록이 모든 상담의 전문을 들고 있다** — §7.1 이 '경쟁사에 새면 안 된다'고 판정한 그 값이다 |
| 번들 | 이 화면 고유 코드 ≤ 15KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). **다른 도메인 모듈을 import 하지 않는다**(FS-051 이 `quotes/data-source` 를 끌어오는 것과 대조). **이 섹션에서 가장 가벼운 화면** — 컴포넌트 2개 + 타입 + 어댑터가 전부다(453줄) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:138-151`). 단 배너가 툴바·필터까지 대체한다 — 다만 조건이 URL 에 남아(IA-13) 재시도 후 복원된다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **미충족** — 문구·액션이 하나(STATE-02 · EXC-12 gap). **어댑터는 이미 404 를 구분해 던진다** |
| 쓰기 실패 | — | **N/A — 쓰기가 없다** |
| 동시 편집 | — | **N/A — 편집이 없다.** 다른 관리자도 이 화면에서 아무것도 바꿀 수 없어 **경합 자체가 발생하지 않는다** |
| 세션 만료 | 재인증 후 원래 경로 복귀 | **충족 — 이 섹션에서 유일하다.** 401 리다이렉트가 버릴 미저장 내용이 **없고**(폼 부재), `returnUrl` 에 필터 조건까지 실려(IA-13) **목록 view 가 그대로 복원**된다. FS-051 §7 #26 · FS-052 §7 #27 의 유실 문제가 여기엔 없다 |
| 네트워크 단절 | offline 배너 + write 게이팅 | **부분 미충족** — offline 배너가 없다(EXC-11, 앱 전역). **단 'write 게이팅' 절은 표면이 없다** — 게이팅할 write 가 없다 |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 읽기 전용 화면의 축 — quality-bar 밖

quality-bar 는 '쓰기가 없는 화면'을 별도로 다루지 않는다. 이 화면의 성격이 그러하므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 화면이 약속한 일을 할 수 있다 | **미충족 — 이 화면 최대의 결함.** 목록이 **'후속조치 대기만' 필터**를 1급 기능으로 제공하고(`:178-188`) '대기' 배지를 그린다(`:259`). 즉 **화면이 '해야 할 일 목록'을 만들어 준다.** 그런데 **그 일을 끝냈다고 말할 자리가 없다** — `followUpDone` 을 true 로 만들 UI 가 이 앱 어디에도 없다. 운영자는 대기 3건을 찾아내고 **아무것도 할 수 없다.** BE-053 §7.5 【최대 미결】 |
| 데이터를 만드는 주체가 정의돼 있다 | **미정 — 구조적 공백.** 시드는 상담 3건을 담고 화면은 그것을 훌륭히 보여주지만 **그 3건이 어떻게 생겼는지 이 앱은 답하지 않는다.** 상담 이력을 만드는 화면이 **없다.** BE-053 §7.4 【최우선 미결】 — 확정 전에 백엔드가 읽기 계약만 구현하면 **데이터를 넣을 방법이 없는 조회 API** 가 된다 |
| 읽기 전용이 의도인지 미완성인지 문서화돼 있다 | **충족.** 세 파일의 헤더 주석이 '감사 이력이라 읽기 전용'을 선언하고(`ConsultationListPage.tsx:3` · `ConsultationDetailPage.tsx:3` · `types.ts:3-4`), **심 자체가 '(읽기 전용)' 이라 못 박는다**(`data-source.ts:61`) — 이 섹션에서 **심이 범위를 명시적으로 좁힌 유일한 화면**이다. `build`/`patch` 의 존재 이유도 적혀 있다('프레임워크 계약상 둔다' — `:4`) |
| 읽기 전용인데 쓸 수 있는 경로가 없다 | **부분 미충족(잠재).** 어댑터의 `create`/`update`/`remove` 가 **동작하는 구현**이다(공용 팩토리가 5개를 다 만든다). 호출부가 0건이라 도달 불가능하지만 **코드는 열려 있다** — BE-026 의 티켓 어댑터처럼 거절 구현이 아니다. 연동 시 제거·거절로 바꿔야 한다(BE-053 §7.6 #5) |
| 찾은 것을 다른 곳으로 가져갈 수 있다 | **미충족.** `related` 가 '견적 Q-20260710-001'·'문의 INQ-20260711-002' 라 **사람은 무엇을 가리키는지 아는데 링크가 없어 갈 수 없다**(`types.ts:28-29` 가 스스로 '링크 요약'이라 부른다). **FS-051 은 `quoteId` 로 양방향 링크를 만든다**(`InquiryListPage.tsx:279-285`) — 같은 섹션에서 전략이 갈렸다. CSV 내보내기도 없다(ERP-12 P1 — 표면 자체가 없어 §3 에 적지 않음) |
| 감사 이력의 본문을 검색할 수 있다 | **미충족.** 검색이 거래처·주제·담당자만 훑고 **`content` 를 훑지 않는다**(`types.ts:89-94`). **감사 이력의 주 용도가 '그때 뭐라고 했더라'인데 그것이 안 된다** — '보상안'·'단가 인상' 같은 본문 키워드로 과거 상담을 찾을 수 없다. §7.3 의 서버 검색이 도입되면 함께 정해야 한다 |

### 4.4 데이터 모델의 모호함

| 요구 | 현재 상태 |
|---|---|
| '조치 없음'과 '조치 완료'가 구분된다 | **미충족.** `hasPendingFollowUp` = `followUpAction.trim() !== '' && !followUpDone`(`types.ts:64-66`)라 두 상태가 같은 축('대기 아님')에 떨어진다. **시드 `cs-3` 이 `followUpAction: ''` + `followUpDone: true` 다**(`data-source.ts:52-54`) — **조치가 없는데 완료됐다.** 모델이 두 필드를 갖고도 그 조합의 의미를 정의하지 않았다. BE-053 §7.6 #9 |
| 후속조치 컬럼이 한 가지를 말한다 | **미충족.** 후속조치 셀(`:257-263`)이 **조건에 따라 다른 축을 보인다** — 대기면 '후속조치 상태'('대기'), 아니면 **'상담 결과'**(긍정/보통/부정). 컬럼 헤더는 '후속조치' 하나인데 값이 두 종류라 **표를 스캔하는 운영자가 오독한다**('긍정' 이 후속조치 상태로 읽힌다) |
| 참조가 참조다 | **미충족.** `accountName`·`consultant`·`related` 가 전부 자유 텍스트다. 거래처 개명·병합이 반영되지 않고 **거래처별 상담 이력 집계가 문자열 매칭에 의존**한다. **BE-052 §7.5 의 거래처 참조(`accountId`) 결정에 종속** — 함께 정해야 한다(BE-053 §7.6 #4) |
| 상담 내용에 상한이 있다 | **미충족.** `content` 길이 상한이 코드에 없다(입력이 없으니 검증도 없다). **전량 반환 계약에서 응답 크기 상한 없음으로 직결**된다(§4.1). BE-053 §7.6 #8 이 10,000자 제안 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | TOKEN-02 · A11Y-16 | **P0** · P1 | **'후속조치 대기만' 체크박스에 `tds-ui-focusable` 이 없다**(`:179-186`) — 포커스 링이 DS 토큰(2px `border-width-medium`)이 아니라 브라우저 기본값. **앱의 다른 `checkboxStyle` 소비처 4곳은 그 클래스를 붙인다**(`AdminsTable.tsx:135` · `TierCriteriaCard.tsx:112` · `MembersTable.tsx:164` · `DashboardWidgetsCard.tsx:137`) — **관례가 있는데 한 곳이 빠졌다. 한 단어 수정** | 이 화면 | A11 change_request (**최우선 · 저비용**) |
| 2 | STATE-02 · EXC-12 · EXC-06 · EXC-20 | **P0** · P1 | 상세 조회 실패에 '다시 시도'가 없고 404/5xx 를 구분하지 않으며 참조 코드도 없다. **어댑터는 이미 `HttpError(404)` 를 던진다**(`crud.ts:105-107`) — `isNotFound(detailQuery.error)` 한 줄이면 된다. **같은 섹션의 FS-052 가 그 선례**(`ProjectFormPage.tsx:242-264`) | 이 화면 | A11 change_request |
| 3 | IA-02 | **P0** | **사유가 바뀌었다** — `findCoveringLeaf` 가 브랜치 폴백을 해소해 AppHeader 는 이제 '상담 이력'을 보인다. 남은 것은 **`<h1>` 이중 — 그런데 이 화면은 두 h1 의 문구가 완전히 같다**('상담 이력' × 2). 어느 쪽도 어느 상담인지 말하지 않는다 | **앱 전역**(`AppHeader`·title 모델) | A40 · A11 |
| 4 | IA-04 · ERP-15 · COMP-06 · COMP-07 | **P0** · P1 · P2 | 페이지네이션 없음 — 전량 렌더. **상담 이력은 전화 한 통마다 한 건 쌓이는 무한 감사 컬렉션**이라 이 섹션에서 증가 속도가 가장 빠르다. 스켈레톤의 **행 수·셀 수가 둘 다 하드코딩**(`length: 5` · `COLUMN_COUNT = 8`)이라 **컬럼 추가 시 조용히 어긋난다**(FS-051·FS-052 는 셀 수를 파생). `SeqCell` 에 `startIndex` 없음. **IA-13 이 이미 pass 라 `page` 키만 얹으면 되고 `clampPage` 도 준비됨** | 이 화면 + BE 계약 | A11 · A63 (BE-053 §7.3) |
| 5 | STATE-05 · A11Y-16 | P1 | **빈 상태가 한 문구뿐 — 셋 중 이 화면만 `Empty` 를 안 쓴다.** 3분기 미구분 · 복구 액션 없음 · `role="status"` 없음. **`useListState` 가 `hasQuery`·`hasActiveFilters`·`clearSearch`·`resetFilters` 를 이미 돌려주는데 소비하지 않는다** — FS-051 이 같은 훅의 같은 값을 `Empty` 에 그대로 넘긴다(`InquiryListPage.tsx:240-247`). **수정 비용이 낮고 ERP-13 의 조사도 자동으로 따라온다** | 이 화면 | A11 change_request (**저비용**) |
| 6 | COMP-01 | P1 | **quality-bar 가 `ConsultationListPage` 를 명시 지목.** `:265-273` 이 `buttonStyle('secondary')` + `tds-ui-btn-*` 손조립. **같은 섹션의 FS-051·FS-052 는 grep 0건** — 셋 중 이 화면만 남았다 | 이 화면 | A11 change_request |
| 7 | COMP-08 · A11Y-08 | P2 · P1 | **중복 '상세' 버튼.** 단 주제가 링크가 아니라 그것이 유일한 키보드 경로 — **주제 링크 승격이 선행돼야 제거 가능.** **FS-051 에 해법이 이미 있다**(`InquiryListPage.tsx:262-265`) | 이 화면 | A11 change_request (한 묶음) |
| 8 | ERP-01 · A11Y-16 | P1 | 목록 유형 배지가 **라벨=유형 · 톤=결과**로 두 축을 겹쳐 인코딩 — 상담 결과가 **색으로만** 표현되고, 같은 유형 값이 상세에서는 info 라 **한 값이 두 화면에서 다른 색**. **FS-051 의 유형 배지와 같은 병** — 두 화면을 함께 고칠 것. `consultOutcomeTone` 이 레코드가 아니라 if 체인이라 확장성도 낮다 | 이 화면 (+ FS-051) | A11 change_request |
| 9 | (§4.3) | — | **후속조치를 닫을 수단이 없다** — 화면이 '대기만 보기'를 1급 기능으로 주고 완료 처리 자리를 안 준다. **트리아지 화면인데 트리아지 결과를 남길 자리가 없다.** A(이 화면에 완료 처리) / B(다른 화면) / C(표시 전용이니 필터를 지운다) 중 확정 필요 — **A 를 고르면 읽기 전용 판정과 심이 함께 바뀐다** | 도메인 + BE + 이 화면 | **A01 (최우선 · 선행)** · A63 (BE-053 §7.5) · A11 |
| 10 | (§4.3) | — | **상담 이력을 누가 만드는가** — 이 앱에 생성 화면이 **없다.** 확정하지 않으면 **데이터를 넣을 방법이 없는 조회 API** 가 된다. 백엔드 착수 전 필수 | 도메인 + BE | **A01 (최우선 · 선행)** · A63 (BE-053 §7.4) |
| 11 | (§4.4) | — | **참조가 참조가 아니다** — 거래처·담당자·`related` 가 전부 자유 텍스트. `related` 가 스스로 '링크 요약'이라 불리는데 링크가 없다. **BE-052 §7.5 의 거래처 참조 결정에 종속** | 도메인 + BE | **A01 (BE-052 와 공동)** |
| 12 | (§4.3) | — | **검색이 `content` 를 훑지 않는다** — 감사 이력의 주 용도('그때 뭐라고 했더라')가 안 된다. §7.3 의 서버 검색 도입 시 함께 정할 것 | 이 화면 + BE 계약 | A11 · A63 |
| 13 | (§4.4) | — | 후속조치 컬럼이 **조건에 따라 다른 축**을 보인다(대기 / 상담 결과) — 헤더는 하나인데 값이 두 종류라 오독을 부른다 | 이 화면 | A11 change_request |
| 14 | (§4.4) · (BE-053 §7.5) | — | `followUpAction === ''` + `followUpDone === true` 조합의 의미가 미정 — **시드 `cs-3` 이 그것**이다. §7.3 의 `pending` 서버 필터가 이 정의에 직결 | 도메인 + BE | A01 · A63 |
| 15 | ERP-06 · ERP-08 | P1 · P2 | 후속 예정일이 `shared/format` 을 경유하지 않는다 — **같은 화면의 상담일시는 경유한다**(규칙 분기). 폴백도 없다 | 이 화면 | A11 change_request |
| 16 | COMP-09 | P2 | 거래처·주제·담당자 셀 truncate 없음 · 상담 내용에 길이 상한·접기 없음 | 이 화면 | A11 |
| 17 | (§4.1) · (BE-053 §7.3) | — | 목록이 **모든 상담의 전문**(§7.1 이 '경쟁사에 새면 안 된다'고 판정한 값)을 내려보낸다 · `content` 길이 상한 부재로 **응답 크기 상한 없음** | BE 계약 | A63 (BE-053 §7.3 · §7.6 #8) |
| 18 | (§4.3) | — | 어댑터의 `create`/`update`/`remove` 가 동작한다 — 호출부 0건이나 코드가 열려 있다. 연동 시 거절 구현으로 바꾸거나 제거 | 이 화면 | A11 · A63 (연동 시) |
| 19 | EXC-05 · EXC-11 · EXC-13 | P1 · P2 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 전역 `retry: false`. **단 EXC-19(폼 유실)는 이 화면에 표면이 없다** | **앱 전역** | A40 · A11 |

## 6. 측정 도구 · 재현 스위치

> **기준일 2026-07-17 · `HEAD = 4b805ad`. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`consultationAdapter` 는 `scope: 'sales-consultations'`(`data-source.ts:63`)로 공용 `createCrudAdapter` 가 `failIfRequested(scope, op)` 를 부른다(`crud.ts:96,101,112,120,135`). **화면이 도달하는 op 는 2개뿐이다 — 이 섹션에서 가장 적다**:

| op | 호출 지점 | 재현 |
|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=sales-consultations:list` · `?fail=all` |
| `detail` | `fetchOne` (`crud.ts:101`) | `?fail=detail` · `?fail=sales-consultations:detail` · `?fail=all` |

- `create`/`update`/`remove` 도 `failIfRequested('sales-consultations', 'save'/'delete')` 를 부르지만 **화면에 호출부가 0건**이라 도달하지 않는다 — 따라서 **`?fail=save` 와 `?fail=delete` 는 이 화면에서 아무 효과가 없다.**
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 `?delay=` 가 아니라 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`dev.ts:24-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`). **단 이 화면에서 의미 있는 것은 401·403·404·429·500 뿐**이다 — **400·409·412·422 는 읽기 전용 계약에 존재하지 않는 갈래**라(BE-053 §5) 재현해도 화면이 그것을 다르게 그릴 이유가 없다.

| 판정 | 재현 |
|---|---|
| STATE-02 / EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 같으면 gap.** 자연 404 는 `/sales/consultations/nope` |
| EXC-06 (status별 surface) | `?status=list:403` · `list:429` · `list:500` — 전부 같은 배너면 gap |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=…&reason=session_expired` 로 가면 pass. **미저장 내용이 없어 유실 검증이 필요 없다** |
| EXC-20 (reference code) | `?status=list:500` — reference 가 안 보이면 gap |
| **EXC-04 / EXC-08 / EXC-09 (n-a 확인)** | **재현할 스위치가 없는 것이 곧 판정이다** — `?fail=save`·`?fail=delete` 가 아무 효과가 없음으로 쓰기 표면 부재가 확인된다 |

**`LATENCY_MS` 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**IA-13 재현(이 화면의 pass 를 지키는 스위치)**: URL 자체가 스위치다 — `?type=visit&pending=true&q=대성` 을 새 탭에 붙여 넣어 같은 view 가 나오는지, 기본값(`type=all` · `pending=false`)이 URL 에서 **지워지는지**(체크 해제 시 `?pending=false` 가 남으면 gap), 필터 3회 조작 후 Back **1회**로 이전 화면에 가는지(`replace: true` — `useListState.ts:125`) 확인.

**TOKEN-02 재현(이 화면의 유일한 저비용 P0 gap)**: 키보드로 Tab 해 '후속조치 대기만' 체크박스에 도달 → 옆의 '상세' 버튼·검색 입력과 **포커스 링의 두께·색·offset 을 비교**한다. 다르면 gap. 코드로는 `grep -n "checkboxStyle" -B3 apps/admin/src/pages/sales/consultations/ConsultationListPage.tsx` → `className` 이 없음으로 판정.

**그 밖의 도구**: `grep`(TOKEN-01 · TOKEN-02 · COMP-01 · COMP-03 · COMP-06 · A11Y-11 · A11Y-12 · ERP-13 · EXC-14 판정 — **특히 이 화면의 `n-a` 14건 중 다수가 grep 0건으로 확인된다**: `useToast` · `ConfirmDialog` · `useUnsavedChangesDialog` · `aria-invalid` · `aria-required` · `aria-current` · `onMutate` · `AbortController` · `isAbort`) · `consultations.test.ts`(후속조치 대기 3갈래 · outcome 톤 · 필터·검색·정렬 **순수 함수** 회귀 — **이 화면에 컴포넌트 테스트는 없다**).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] **모든 `N/A` 14건에 사유를 댔다** — 각각 **grep 0건 근거**(`useToast`·`ConfirmDialog`·`useUnsavedChangesDialog`·`aria-invalid`·`aria-current`·`onMutate`·`AbortController`)와 **재판정 조건**을 함께 적었다. §1.2 가 그 14건이 **화면 성격의 귀결**임을 밝힌다 — 판정 회피가 아니다
- [x] §2.1 산수 검산 — 7 pass + 5 종속 + 14 n-a + 4 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다 — `TOKEN-03`/`TOKEN-04` 의 소비 표면이 각각 스켈레톤 하나·Card 넷뿐임을 정확히 적고, **Modal·Toast 표면이 없어 `MOTION-01`/`MOTION-02`/`A11Y-01`/`A11Y-02` 를 `상속` 이 아니라 `n-a`** 로 판정했다
- [x] **`EXC-03` 이 pass 인 이유를 정확히 갈랐다** — read 게이팅은 상속으로 충족이고 **write 게이팅은 쓰기 컨트롤이 0건이라 vacuous 충족**이다. **FS-051·FS-052 가 같은 항목에서 gap 인 것은 그 화면들에 쓰기 컨트롤이 실재하기 때문**이며, 같은 훅을 안 쓴다는 사실이 세 화면에서 다른 판정을 낳는 것이 옳다 — 그 대비를 §2·§2.1 에 명시했다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(폼·재정렬·업로드·날짜범위·CSV·bulk·optimistic)은 적지 않았고, **표면이 부분적으로만 걸리는 것**(`FEEDBACK-01`)은 걸리는 절만 판정했다
- [x] **실재 결함을 발견해 기록했다** — 체크박스의 `tds-ui-focusable` 누락(앱의 다른 4곳 대조) · 스켈레톤의 행 수·셀 수 이중 하드코딩(FS-051·FS-052 대조) · 후속조치 컬럼의 축 혼재 · 시드 `cs-3` 의 `followUpAction: ''` + `followUpDone: true` 모순
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`sales-consultations`)와 op **2종**을 프레임워크 코드에서 확인했고, **`?delay=` 를 쓰지 않았으며**, **`?fail=save`/`delete` 가 아무 효과가 없다는 사실이 곧 쓰기 표면 부재의 증거**임을 적었다
- [x] '기준일 2026-07-17 · `HEAD = 4b805ad` · E2E 미실행 — 판정 근거는 코드 대조' 를 §1 과 §6 에 명시했다
- [x] §5 의 gap 이 FS-053 §7 · BE-053 §7.6 과 일치한다
- [x] **`/reservations/consultations`(FS-039 상담 예약)와 다른 화면**임을 §1.2 에 명시하고, **이 문서의 N/A 판정을 그 화면에 옮기면 전부 틀린다**고 경고했다
- [x] **읽기 전용 화면 고유의 축을 §4.3 에 별도로** 세웠다(quality-bar 밖) — '화면이 약속한 일을 할 수 있는가'(후속조치를 닫을 수단 부재)와 '데이터를 만드는 주체가 정의돼 있는가'(생성 화면 부재)가 **이 화면 최대의 결함**이며, 둘 다 **A01 확정이 선행**돼야 함을 §5 #9·#10 에 걸었다
