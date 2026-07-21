---
id: NFR-072
title: "배송 처리 비기능 명세"
functionalSpec: FS-072
backendSpec: BE-072
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-072. 배송 처리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-072 배송 처리 (`/orders/shipments` — 상세 라우트 없음) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-072(요소·예외) · BE-072(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-072 §7 · BE-072 §7.13 과 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조와 grep 실측이다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` 훅 · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider·RequireEntitlement)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**손을 움직이는 화면이다.** 주문 목록이 '무엇이 어디에 고여 있는가'를 보는 곳이라면 여기는 **오늘 무엇을 내보낼 것인가**를 처리한다(`ShipmentListPage.tsx:3-5`). 그래서 이 화면의 P0 판정은 **비가역 액션의 게이트(FEEDBACK-02)** · **중복 제출(EXC-08)** · **동시성(EXC-04)** 에서 무겁게 읽어야 한다 — **송장 등록은 `create` 라 값이 멱등이 아니고**, 발송처리는 되돌릴 수 없으며, 두 조작 모두 **주문 원장까지 함께 움직인다**(BE-072 §7.5).

세 가지가 이 화면을 다른 목록 화면과 구분한다.

1. **행이 배송 건이 아니라 주문이다**(`types.ts:8-11`) — 두 조회(`ORDER_RESOURCE` · `SHIPMENT_RESOURCE`)를 화면이 손으로 조인하고, `firstLoading`·`refreshing`·`loadError` 도 **손으로 합성한다**(`:149-153`). STATE 축의 판정이 전부 그 합성 위에 선다.
2. **읽기 전용 껍데기도 쓰기 껍데기도 쓰지 않는다**(`ShipmentTable.tsx:3-6`) — `CrudReadListShell` 에는 체크박스가 없고 `CrudListShell` 의 체크박스는 **일괄 삭제**에 묶여 있는데 배송 건은 지우지 않는다. 그래서 라이브 리전·요약·빈 상태·실패 배너를 이 화면이 **직접 조립한다** — 셸이 대신 통과시켜 주는 항목이 없다는 뜻이고, 그만큼 판정이 이 문서의 것이다.
3. **미배선을 구분해 말하는 화면이다**(`InvoiceBulkDialog.tsx:215-225`) — '택배사를 못 읽었다'와 '택배사가 없다'가 다른 배너다. quality-bar 에는 그 축이 없어 §4.3 에서 따로 판정한다.

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 상태가 손으로 합성되고 서로를 밀어낸다.** `firstLoading` 은 **두 조회의 OR**(`ShipmentListPage.tsx:149-151` — 어느 한쪽이라도 `isFetching && data === undefined`), `refreshing` 은 그 여집합(`:152`), `loadError = orders.error ?? shipments.error`(`:153`). 렌더는 `loadError === null ? (요약+선택바+표) : 배너`(`:427-489`)라 **error 가 언제나 앞선다**. 스켈레톤은 `loading={firstLoading}` 으로 DS `Table` 이 본문만 대체하고(`ShipmentTable.tsx:205`), 재조회 중에는 이전 행이 유지된다 — `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:298`)가 뒷받침한다. empty 는 `Empty` 3분기(`:349-358`) | `/orders/shipments` 진입 → 렌더 확인 → 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=shipments:list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | read 실패가 인라인 danger `Alert` + 명시적 '다시 시도'다(`:474-489`) — '배송 목록을 불러오지 못했습니다.' + 버튼이 **두 조회를 함께 refetch** 한다(`:481-482`). read 실패에 toast 를 쓰지 않는다(`toast` 소비는 일괄 성공 1곳 — `:224`). empty 로 폴백하지 않는다 — 배너가 요약·선택바·표를 **대체**한다 | `?fail=orders:list` · `?fail=shipments:list` 각각으로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 두 쿼리를 재발행하면 pass.** error toast 가 나오면 gap. **잔여**: 어느 조회가 실패했는지 문구가 가르지 않는다(§3 EXC-06) | **pass** |
| STATE-04 | STATE | 직접 | **두 절 중 실재하는 절이 충족된다.** ① *page clamp* — **표면이 없다**(페이지네이션 부재 · IA-04 가 gap 으로 잡는다). ② *숨겨진 행의 선택 해제* — **표면이 있고 충족된다**: 선택 집합의 주인은 `useListState` 이고 `viewSignature`(`page|keyword|sort|filters`)가 바뀌면 선택을 지운다(`useListState.ts:207-213`). 이 화면은 그 선택 집합을 **직접** 쓴다(`:135,172,461-468`). 게다가 `selectedRows` 를 **`visible` 에서 다시 걸러**(`:171-174`) 보이지 않는 행이 일괄 처리 대상에 들어가지 않는다 — 서명 갱신과 무관하게 한 겹 더 막혀 있다 | 필터='배송완료' + 3건 선택 → 필터='발송대기' 로 변경. **선택 배지가 0 이 되고 일괄 버튼이 잠기면 pass.** 검색어 변경도 동일. page clamp 는 페이지네이션 도입 시 다시 매긴다(`clampPage` 가 이미 있다 — `useListState.ts:217`) | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. 파생 치수도 space 토큰 배수다 — `calc(${cssVar('space.6')} * 9)`(레일 폭 `:89`) · `* 14`(검색 최대폭 `:112`) · `* 10`(품목 셀 최대폭 `ShipmentTable.tsx:51`). `box-shadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/orders/shipments` → **0건**(2026-07-22 실측). ESLint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-link tds-ui-focusable`(배송 설정 링크 `:381` · 추적 링크 `ShipmentTable.tsx:87`) · `tds-ui-input tds-ui-focusable`(송장번호 input `InvoiceBulkDialog.tsx:281`) · `DetailCellLink` · DS `<Button>`·`<SearchField>`·`<SelectField>` · `FilterPanel` 의 `.tds-ui-listitem`. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 스타일이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS `Table` 스켈레톤 펄스 · Toast(`:224`) · DS `<Button>` transition · `Modal`/`ConfirmDialog` 4종(송장 모달 · 배송준비중 · 발송처리 · 모달 파기 확인). **이 화면이 animation/transition/transform 을 직접 선언하지 않는다** | `grep -rn "transition\|animation\|transform" apps/admin/src/pages/orders/shipments` → **0건**(실측). tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `Modal` 1 + `ConfirmDialog` 3 · Toast · `FilterRail`/`FilterPanel` 의 `Panel` · 송장 줄의 `color.surface.raised`(`InvoiceBulkDialog.tsx:74` — surface 토큰이지 그림자가 아니다). **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Panel/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에는 in-content `<h1>` 이 없다**(grep 0건). 지배적 제목은 AppHeader → DS `Header` 가 소유하고(`AppHeader.tsx:6,56` — `title={findNavLabel(pathname)}`), 잎 라벨이 '배송 처리'다(`nav-config.ts:169`). 그 밖의 heading 표면은 공유 스타일과 DS 의 것이다 — `FilterPanel` 의 `filterHeadingStyle`(`styles.ts:230-237`, `typography.label.sm`) · `Modal` title. **KPI/StatsCard 가 없다** | DS `Header`/`pageTitleStyle`(`styles.ts:37-52`) 판정에 종속. 이 화면에서는 손으로 쓴 font-size 리터럴이 0건임만 확인(TOKEN-01 과 같은 grep) | **종속** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `:416-423` 이 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드한다(`useListState.ts:227,238`). 그 props 가 `compositionstart/end` + `onKeyDown` 을 실어 ① 조합 중 커밋 금지 ② 250ms 디바운스 ③ 조합 중 Enter 차단을 건다. **순서 뒤바뀐 응답이 없다** — 검색이 클라이언트 필터라 요청 자체가 나가지 않는다(`:166-169`) | 검색창에 IME 로 '서다인' 입력. **조합 중 '서ㄷ'·'서다'가 필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **비가역 액션 셋 전부가 게이트를 갖는다.** ① **배송준비중 처리** — `ConfirmDialog intent="update"`(`:492-507`), 문구가 **제외 건수와 사유를 함께 말한다**(`:497-500`). ② **발송처리** — `ConfirmDialog`(`:523-534`), **결과가 행마다 다를 수 있다는 사실을 미리 말한다**('전 품목이 나간 주문만 배송중이 되고…'). ③ **송장 등록** — 확인 다이얼로그 대신 **모달 자체가 게이트**이고 제출이 명시적이다. **실패 유지·재시도 계약이 성립한다**: `runBulk` 가 실패가 남으면 **다이얼로그를 닫지 않고**(`:229-232`) `error` prop 으로 배너를 그리며(`:503,530`) `busy` 가 풀려 **확인 버튼 재클릭이 곧 재시도**다. 전건 성공에만 닫는다(`:223-228`). '취소'는 진행 중 요청을 abort 한다(`closeAction` — `:194-200`). busy 중 확인 버튼 잠금·`aria-busy`는 DS `ConfirmDialog` 가 소유한다 | 2건 선택 → '발송처리' → `?fail=shipments:save` 로 강제 실패 → 확인. **다이얼로그가 남고 그 안에 '{N}건을 처리하지 못했습니다…' 배너가 뜨며 확인 버튼이 되살아나면 pass.** **잔여**: 사유가 건수뿐이고 어느 주문인지 말하지 않는다(§3 EXC-10) | **pass** |
| FEEDBACK-04 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **페이지 폼이 없다** — 라우트가 목록 하나뿐이고(`App.tsx:309`) 등록·수정 폼도 상세도 없다. 편집 상태를 갖는 유일한 표면은 **송장 일괄 입력 모달**이고 그것은 FEEDBACK-06 의 대상이다(`useModalDirtyGuard` — `InvoiceBulkDialog.tsx:138`). 검색어·필터는 URL 이 소유하는 조회 상태이지 미저장 변경이 아니다 | 페이지 폼이 도입되면 이 판정을 다시 매긴다. 현재 `useUnsavedChangesDialog` 소비 0건 | **n-a** |
| FEEDBACK-06 | FEEDBACK | 직접 | **폼을 담은 모달이 하나이고 4경로 전부가 덮인다.** `useModalDirtyGuard(dirty && !busy, onCancel)`(`InvoiceBulkDialog.tsx:138`)의 `requestClose` 를 **`Modal.onClose`(Esc·딤·× 를 DS 가 한 곳으로 모은다 — `useModalDirtyGuard.tsx:22-25`)와 취소 버튼(`:203`) 둘 다**에 넘긴다. `dirty` = **송장번호를 한 칸이라도 쳤는가**(`:137`) — 택배사 select 는 초기값이 있어 dirty 판정에서 뺀다(만지지 않아도 참이 되는 것을 막는다). 저장 중에는 가드가 꺼진다(`!busy`). **`discardDialog` 를 모달 밖에 렌더한다**(`:315-316`) — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 | 송장 모달을 열어 번호를 한 자 입력 → ① Esc ② 딤 클릭 ③ × ④ '취소'. **네 경로 모두 '저장하지 않은 변경 사항이 있습니다' 확인이 뜨면 pass.** 아무것도 치지 않았으면 즉시 닫혀야 한다 | **pass** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 일괄 성공 `toast.success(...)`(`:224`) — 문구 3종이 호출부에서 갈린다(배송준비중 `:252` · 송장 등록 `:294` · 발송처리 `:343`). 지속 live region 은 `ToastProvider` 가 소유한다. **실패는 toast 가 아니라 다이얼로그 배너다**(FEEDBACK-02) | ToastProvider 판정에 종속. 이 화면에서는 일괄 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **4개**: 송장 일괄 입력(`Modal`) · 배송준비중 확인 · 발송처리 확인 · 모달 파기 확인. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 네 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 4종을 전수 확인했다.** ① **송장번호 `<input>`** — `aria-invalid={invalid}` 와 `aria-describedby={invalid ? errorIdOf(inputId) : undefined}` 를 **짝으로** 세우고(`InvoiceBulkDialog.tsx:286-288`) 같은 id 의 `<p role="alert">` 를 렌더한다(`:298-302`). 시각 숨김 `<label htmlFor={inputId}>`(`:274-276`)가 `<주문번호> 송장번호` 를 준다. ② **택배사 `SelectField`** — 시각 숨김 `<label htmlFor={selectId}>`(`:250-252`), 오류 상태가 없어 짝 요구가 발생하지 않는다. ③ **`SearchField`** — DS 가 내부 배선(`label="주문번호·수령인·송장번호 검색"`). ④ **필터 버튼** — 폼 컨트롤이 아니다(A11Y-12). **짝 없는 `aria-invalid` 0건**(grep 실측: 이 디렉터리 히트 1건 = `:286`, 바로 다음 줄이 describedby) | `grep -rn "aria-invalid" apps/admin/src/pages/orders/shipments` → 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL 로 송장번호를 비운 채 제출해 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert. **잔여**: 송장번호는 사실상 필수인데(`INVOICE_NO_REQUIRED`) **`required`/`aria-required` 도 `*` 마커도 없다**(`FormField` 미사용 — grep 0건) → §5 #6 | **pass(잔여)** |
| A11Y-12 | A11Y | 직접 | **좌측 필터가 실재하고 `aria-pressed` 하나로 말한다.** 이 화면은 공유 `FilterPanel` 을 소비하고(`:390-399`) 그 컴포넌트가 `<nav aria-label> > h2 > ul > li > button[aria-pressed]` 골격을 소유한다(`FilterPanel.tsx:121,141-145`). 머리말이 그 판단을 명시한다(`:17-19` — '이 버튼은 토글 필터이지 현재 위치가 아니다'). **이 화면 안에 `aria-current`·`aria-pressed` 를 직접 쓰는 코드가 0건**(grep 실측)이라 규칙이 갈릴 표면이 없다 | `grep -rn "aria-current" apps/admin/src/pages/orders/shipments` → 0건. DOM 에서 필터 항목이 `aria-pressed="true|false"` 를 갖고 `aria-current` 를 갖지 않는지 확인 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **4개**(A11Y-02 와 같다). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건). **잔여 — 애니메이션되는 닫힘은 Modal 소유 3경로(Esc·딤·×)뿐이고 footer 버튼은 즉시 언마운트**인데, 이 화면의 확인 다이얼로그 셋이 전부 그 잔여에 해당한다(`onConfirm`/`onCancel` 이 상태를 직접 내린다) | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 일괄 성공 토스트(`:224`). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 표면: DS `Table` 스켈레톤 펄스 · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). `ToggleSwitch` 는 이 화면에 없다 | 전역 motion config·`ui.css` 판정에 종속. 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:309`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 `<div style={layoutStyle}>` 2열 그리드(`:371,87-92`)이고 그 안이 필터 레일 + 본문 컬럼이다. **정적 잎이라 `/orders/:id` 보다 먼저 등록된다**(`App.tsx:308` 주석) — 그렇지 않으면 이 경로가 주문 상세로 먹힌다 | 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인. `/orders/shipments` 가 주문 상세로 빠지지 않는지도 확인 | **pass** |
| IA-02 | IA | 직접 | **`<h1>` 이 정확히 하나다.** 이 화면에 in-content `<h1>` 이 없고(grep 0건) 제목은 AppHeader → DS `Header` 가 그린다. `/orders/shipments` 는 **사이드바 잎 자체**라(`nav-config.ts:169`) `findNavLabel` 이 브랜치 라벨('주문 관리')이 아니라 **구체적인 잎 라벨 '배송 처리'** 를 준다(`AppHeader.tsx:56`). **sub-route 가 없어**(상세·폼 라우트 부재) 클레임·주문 상세가 겪는 h1 이중 문제가 이 화면에서는 발생하지 않는다 | `/orders/shipments` 진입 후 `document.querySelectorAll('h1').length` 확인. **1 이면 pass**(현재 1). 제목이 '주문 관리'가 아니라 '배송 처리'인지도 확인. **앱 전역의 title 소스 모델 통일은 이 화면 밖의 문제다**(§5 참고) | **pass** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색(`:414-425`) → 결과 count 요약(`:429-433`) → **SelectionBar**(`:435-453`, 일괄 액션 3개) → table(`:456-471`) → 빈 상태 3분기. **우상단 primary 등록 버튼이 없는 것은 정당한 N/A** — 배송 건은 '등록'이 아니라 선택 후 '송장 입력'으로 만들어지고, 목록 우상단에 두면 무엇에 붙일지 모르는 버튼이 된다. **미충족: Pagination 이 없다**(`grep Pagination` = 0건). 표가 `visible` 전량을 렌더하고(`ShipmentTable.tsx:140`) `useListState` 의 `page`·`sort` 가 소비되지 않는다. **이 화면은 '오늘 할 일 목록'이라 건수가 곧 작업량인데**, 발송대기 300건이면 300행이 그려지고 행마다 `allocateCovered` 가 두 번 돈다(`types.ts:134-135`) | 픽스처 주문을 30건 이상으로 늘리고 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap.** 마감 임박·주문일 순으로 정렬을 바꿀 수단이 있는지도 확인(없다) | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 라우트가 목록 하나뿐이고(`App.tsx:306-317` 전수에 `/orders/shipments/:id` 없음) 송장 등록은 `/new` 폼이 아니라 목록 위의 모달에서 일어난다. 배송 건 수정 UI 도 없다(BE-072 §7.10) | 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 작업 상태 필터와 검색어의 **단일 원천이 URL 쿼리스트링**이다. `:135` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { work: 'all' }` — `:84`), 훅이 `useSearchParams` 로 `?work=`·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고 갱신은 `replace: true` 라 검색어 한 글자에 history 가 쌓이지 않는다. 손으로 고친 값은 `parseFilter(…, SHIPMENT_WORK_FILTER_VALUES, 'all')`(`:137-141`)가 되돌린다 — 허용 목록이 **필터 정의에서 파생**돼 캐스팅이 없다(`types.ts:60-62`). **`sort`·`page` 는 정렬 UI·페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | 필터='발송대기' + 검색='ORD-2026' → URL 이 `?work=pending&q=ORD-2026` 인지 확인 → 행 클릭으로 주문 상세 진입 → 브라우저 Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인. `?work=거짓말` 이 '전체'로 되돌아가는지도(회귀 `shipments.test.ts:166-169`) | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 두 경로를 상속한다: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `notifySessionExpired()`(`shared/query/queryClient.ts:60,65-66`). **이 화면의 두 조회와 세 쓰기가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다. **잔여**: 리다이렉트가 **송장 모달에 입력하던 값을 버린다**(프로그램적 이동이라 `useModalDirtyGuard` 가 발화하지 않는다) — EXC-19 P1 사안 | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 `/login?returnUrl=%2Forders%2Fshipments&reason=session_expired` 로 가는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸고, `/orders/shipments` 는 **사이드바 잎 자체**라 리소스가 정확히 자기다(`route-resource.ts:31-34` · `nav-config.ts:169`). ② **write 게이팅(직접)** — `:133` 이 `const { canUpdate } = useRouteWritePermissions()` 를 구독하고 그 값이 쓰기 표면 **전부**를 지배한다: **선택 열 자체가 사라지고**(`selectable={canUpdate}` `:460` → `ShipmentTable.tsx:126-136,172-184` 가 열을 만들지 않는다) **일괄 처리 바가 통째로 렌더되지 않으며**(`:435`) 안내문이 대신 선다('배송을 처리할 권한이 없어 조회만 가능합니다.' `:386`). **표 caption 도 갈린다**(`ShipmentTable.tsx:197-201`). ③ **행 클릭은 `detail` 목적지라 `canUpdate` 와 무관**하다 — 조회 전용 역할도 주문 상세로 가는 길을 잃지 않는다(`:187-189`) | 권한 스토어에서 `page:/orders/shipments` 의 `update` 를 끈 뒤 진입. **체크박스 열이 사라지고 일괄 바가 없고 안내문이 뜨면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인. **잔여(이 요구의 gap 은 아니다)**: 서버 403 이 오면 일괄 실패 건수로 뭉개진다 — EXC-06 P1 사안(§3) | **pass** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소돼 있다** — 어댑터가 공용 `createCrudAdapter` 라 없는 id 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던진다(`crud.ts:144-146`). ② **그러나 화면에 409 해소 UI 가 없다** — `runBulk` 의 실패 처리가 `{N}건을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.` 한 문장뿐이고(`:229-232`) `isConflict` 분기가 **0건**(grep 실측)이다. **409 는 재시도가 푸는 실패가 아닌데 화면은 '잠시 후 다시 시도'를 권한다.** ③ **낙관적 동시성 토큰이 없다** — `Shipment` 에 `version`/`updatedAt` 이 없고 `If-Match` 도 없다(grep 0건, BE-072 §7.9) → **동시 편집은 last-write-wins**. ④ **부분 방어 둘**: 불법 전이는 `applyShipmentStatus` 가 저장 직전에 **던지고**(`shipment.ts:480-481`), 송장 충돌은 서버 유일 제약이 막을 예정이다(**지금은 서버가 없어 픽스처에서 같은 송장 두 장이 실제로 만들어진다** — BE-072 §7.1). ⑤ **이 화면 고유의 경합**: 두 운영자가 같은 주문에 **다른 택배사로** 동시에 송장을 붙이면 중복 판정이 걸리지 않아 **같은 물건에 송장 두 장**이 붙는다(BE-072 §7.9) | `?status=save:409` 로 일괄 처리 실행. **conflict 다이얼로그 없이 건수 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/orders/shipments apps/admin/src/shared/domain/shipment.ts` → 0건으로 확인(실측 0건) | **gap** |
| EXC-08 | EXC | 직접 | **미충족 — 그리고 이 화면에서 가장 무겁다.** `grep -rn "idempotencyKey\|submitLock" apps/admin/src/pages/orders` = **0건**(실측). 세 쓰기(`updateOrder`·`createShipment`·`updateShipment` — `:185-187`)가 전부 키 없이 나간다. **자리는 이미 비어 있다**: `CreateVars.idempotencyKey`(`crud.ts:323`)·`UpdateVars.idempotencyKey`(`:345`)와 어댑터 원장(`crud.ts:67-77,128,149`)이 존재하는데 호출부가 넣지 않아 **원장이 영원히 발현되지 않는다.** 방어는 다이얼로그의 `busy` 잠금 하나뿐이고 **동기 제출 락이 없다.** **송장 등록이 특히 위험하다** — `create` 라 값이 멱등이 아니고, 재시도가 **같은 송장을 두 번 만든다**. 화면의 중복 검사(`InvoiceBulkDialog.tsx:167`)는 **모달을 연 시점의 목록**으로만 판정해 그 재시도를 잡지 못한다. **완화**: 발송처리는 전이 가드가 두 번째 시도를 `SHIPMENT_TRANSITION_BACKWARD` 로 막고, 주문 쓰기는 전체 치환이라 값이 멱등이다 | 일괄 처리 확인 버튼을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2배로 나가면 gap.** 픽스처에서 같은 주문에 송장 두 장이 생기는지 확인. `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/orders` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **세 지점이 배선돼 있고 공유 predicate 를 쓴다.** ① **다이얼로그 취소·닫기** — `closeAction` 이 `controllerRef.current?.abort()` 를 부른다(`:194-200`). ② **`.then` 가드** — `if (controller.signal.aborted) return;`(`:221`)로 취소된 배치의 성공 콜백이 토스트·선택 해제를 일으키지 않는다. ③ **`.catch` 가드** — `if (isAbort(cause)) return;`(`:235`) — `shared/async` 의 공유 predicate 이고 로컬 판정을 재발명하지 않는다. ④ **bulk 실패 count 에서 abort 제외** — `settleAllDetailed` 가 `isAbort(result.reason)` 인 항목을 실패로 세지 않는다(`bulk.ts:46`). **잔여**: 언마운트 시 abort 를 발행하지 않는다(`useEffect` 정리 0건) — 다만 그때는 통지 주체가 사라져 요구가 금지하는 증상(오류 토스트·잘못된 실패 집계)이 나타나지 않는다 | 일괄 처리 중(400ms 창) 다이얼로그의 '취소' 클릭. **error toast 도 실패 배너도 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다 | **pass** |
| EXC-21 | EXC | 상속 | **이 화면은 판정 대상이나 거절 UI 를 소유하지 않는다.** 이 라우트는 `commerce.orders` 모듈에 속한다(`shared/entitlements/module-resources.ts:31-36` — `group:/orders` · `page:/orders` · `page:/orders/shipments` · `page:/orders/claims` 가 한 묶음. 주문 없이 배송만 파는 계약은 없다). 잠금(`locked`)·숨김(`absent`)·허용(`granted`) 판정은 `entitlementStateForResource` 가 하고, 화면 대체는 AppShell 의 `RequireEntitlement` 가 `<Outlet>` 바깥에서 한다. **이 화면 안에 403 문구도 업그레이드 안내도 없다**(grep: 이 디렉터리에 `entitlement` 0건) — 한 화면에 두 계열이 섞일 표면 자체가 없다. **권한 부재 표현은 안내문 하나**(`:386`)로 분리돼 있다 | 플랜에서 `commerce.orders` 를 내리고 진입. **잠금/숨김 화면이 뜨고 그 문구에 403 계열 표현이 섞이지 않으면 pass**(판정은 `RequireEntitlement` 소유 문서). 이 화면에서는 자체 거절 UI 가 0건임만 확인 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **14** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · FEEDBACK-02 · FEEDBACK-06 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-21 |
| `n-a` | **2** | FEEDBACK-04 · IA-05 |
| `gap` | **3** | IA-04 · EXC-04 · EXC-08 |
| **합계** | **31** | 14 + 12 + 2 + 3 = **31** ✓ |

> **P0 gap 3건 — quality-bar '배치 실패' 사유.**
>
> - **EXC-04 · EXC-08 은 이 화면 고유이며 둘 다 동시성에 걸린다.** 그리고 **이 화면에서 특히 무겁다** — 송장 등록이 `create` 라 값이 멱등이 아니고, 지금은 서버의 `(carrierId, invoiceNo)` 유일 제약도 없어 **픽스처에서 같은 송장 두 장이 실제로 만들어진다**(BE-072 §7.1 · §7.9).
> - **IA-04 는 앱 전역의 같은 뿌리(목록 페이징 부재)를 공유하나, 이 화면에서는 성격이 다르다** — '오늘 할 일 목록'이라 **건수가 곧 작업량**이고, 행이 주문이라 **페이징을 주문 축에 걸어야 한다**(BE-072 §7.12).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·상세 라우트·기간 필터·optimistic write·페이지네이션 range)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 두 조회 모두 `useCrudListQuery` 라 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **가벼운 인디케이터가 있다** — 요약에 ` · 새로고침 중…` 을 덧붙이고 `aria-busy={refreshing}` 을 건다(`:429-433`). `refreshing` 이 **두 조회의 OR** 라 한쪽만 돌아도 표시된다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`:349-358`) — 검색 0건/필터 0건/진짜 0건 3분기 + 복구 액션('검색 지우기'/'필터 초기화')이 맥락(`hasQuery`·`hasActiveFilters`)에서 파생된다. **잔여**: 주문 목록이 갖는 **네 번째 갈래('결제를 쓰지 않아 주문이 들어오지 않는다' — `ordersCanArrive()`)가 여기에는 없다.** 결제가 꺼져 있으면 이 목록도 자라지 않는데 그 사실을 말하지 않는다(FS-072 §7 #8). 또 `label="배송 건"` 인데 행은 주문이라 '접수된 배송 건이 없습니다' 계열 문구가 세는 단위와 어긋난다 | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기, 필터로 0건 → '필터에 맞는 …' + 필터 초기화가 나오는지. 결제를 끈 상태의 문구도 확인 | **pass(잔여)** |
| STATE-06 | P1 | 쓰기 성공 시 정확히 그 리소스만 무효화된다 — `useCrudCreate`/`useCrudUpdate` 가 목록 키(+상세 키)를 invalidate 하고(`crud.ts:334-336,356-358`), 이 화면의 세 쓰기가 각각 `shipments` 목록과 `orders` 목록·상세를 친다. **한 조작이 두 리소스를 건드리므로 두 목록이 함께 갱신되는 것이 맞다** — 행이 주문 + 배송 건의 조인이기 때문이다 | 발송처리 후 배송 상태 배지와 부분발송 배지가 갱신되는지. 주문 목록으로 이동했을 때 '부분배송 N/M' 이 맞는지 | **pass** |
| COMP-01 | P1 | 모든 액션 버튼이 DS `<Button>` 이다 — 일괄 버튼 3개(`:438-450`) · '다시 시도'(`:478-486`) · 모달 footer 2개(`InvoiceBulkDialog.tsx:203-208`). `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/orders/shipments` = **0건**(실측). **잔여**: 모달 저장 버튼이 `loading` prop 대신 **손으로 쓴 '등록 중…' 라벨**이다(`:207`) — 진행 표현이 DS 계약을 타지 않는다 | grep 0건 + 저장 중 버튼이 DS spinner 를 쓰는지 | **pass(잔여)** |
| COMP-02 | P1 | 선택 셀과 순번 셀이 전부 공유 프리미티브다 — `SelectAllHeaderCell`(`ShipmentTable.tsx:128-134`) · `RowSelectCell`(`:174-182`) · `SeqHeaderCell`(`:137`) · `SeqCell`(`:185`). raw `<input type=checkbox>` **0건**. 선택 상태 계산도 공유 `tableSelectionState`(`:123`) | 표의 선택 셀이 DS 프리미티브인지 · 전체 선택이 indeterminate 를 표현하는지 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` molecule 이다(`:416-423`). raw `<input type="search">` 0건 | grep 0건 | **pass** |
| COMP-04 | P1 | **미충족.** 송장번호는 사실상 필수인데(`INVOICE_NO_REQUIRED` 로 거절된다) **`FormField(required)` 를 쓰지 않고 시각 숨김 `<label>` + raw `<input>` 으로 조립한다**(`InvoiceBulkDialog.tsx:274-294`, `grep FormField` = 0건). 라벨 옆 `*` 마커도 `required`/`aria-required` 도 없다. **모달의 조밀한 표 입력이라 시각 라벨을 숨긴 것은 의도**이지만(폭 비율 1:2 — `:93-99`) 필수 표기까지 함께 사라졌다 | 송장번호 입력에 `required` 또는 `aria-required="true"` 가 있는지. 없으면 gap | **gap(경미)** |
| COMP-06 | P2 | **스켈레톤이 DS `Table` 소유다** — 화면이 행 수·셀 수를 손으로 세지 않고 `loading` 만 넘긴다(`ShipmentTable.tsx:205`). 하드코딩 `length: 5` 0건. **다만 DS 가 정한 행 수가 PAGE_SIZE 와 맞는지는 페이지네이션이 없어 판정할 기준값 자체가 없다**(IA-04 gap 과 연동) | 페이지네이션 도입 후 스켈레톤 행 수 === PAGE_SIZE 인지 | **pass(기준값 부재)** |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`ShipmentTable.tsx:185`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 `index+1` 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다.** 현 구조는 요구가 정의한 (a) 형태다: whole-row 클릭(`onActivate` → 주문 상세 — `:187-189`) + **row 내 접근 가능한 링크 하나**(주문번호 `DetailCellLink`, 접근 이름 `'<주문번호> 주문 상세'` — `:147`). **행 액션 열 자체가 없다** — 이 화면의 조작은 전부 선택 + 일괄이다 | 읽기전용 성격의 표에 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 품목 요약 셀에 `ellipsis`+`nowrap`+최대 폭이 걸려 있고(`ShipmentTable.tsx:49-55`) 주문번호·주문일·수령인·택배사·송장번호 열이 `nowrap` 이다(`COLUMNS` `:33-41`). **송장이 여러 장이면 세로로 쌓아**(`:57-63`) 한 줄이 길어지지 않는다. **잔여**: 택배사 이름(최대 40자)과 수령인은 truncate 가 없어 열 폭을 넓힐 수 있다 — 다만 화면이 **가로 스크롤 컨테이너**를 갖는다(`:122-125,455`) | 긴 택배사명·긴 품목명 픽스처로 표 폭이 페이지를 밀지 않는지 | **pass(잔여)** |
| COMP-12 | P2 | 송장번호 입력에 `maxLength={INVOICE_NO_MAX}`(=30)가 걸려 있는데(`InvoiceBulkDialog.tsx:283`) **'현재/최대' 카운터도 상한 근접 경고도 없다** — 네이티브 `maxLength` 가 입력을 잘라 '조용히 멈춘' 것처럼 보인다(요구가 지적하는 바로 그 증상). counting 기준도 미정의(`value.length` = UTF-16 code unit). **완화**: 실제 송장번호는 30자에 한참 못 미치고, 초과 붙여넣기는 `INVOICE_NO_TOO_LONG` 이 제출 시 사유를 말한다 | 31자를 붙여넣어 잘리는지 · 그때 사유가 보이는지 | **gap(경미)** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 `Alert`(`:474-489`) · 쓰기 성공=toast(`:224`) · 일괄 실패=**그 다이얼로그 안 배너**(`:229-237` → `error` prop) · 송장 검증 실패=**그 줄의 `<p role="alert">`**(`InvoiceBulkDialog.tsx:298-302`) · abort=**아무것도 띄우지 않는다**(EXC-09). 쓰기 실패가 toast 가 아니라 다이얼로그 배너인 것은 **입력·선택을 보존한 채 그 자리에서 재시도**하기 위함이라 규칙의 예외가 아니다 | 강제 실패 저장이 다이얼로그 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 성공(toast — 조작마다 다른 문구)·실패(다이얼로그 배너) 양 경로가 배선돼 있다. **no-op 클릭이 없다** — 처리 가능한 건이 0이면 버튼이 잠기고(`:443`) `runBulk` 도 `items.length === 0` 이면 즉시 반환한다(`:213`). 버튼 라벨이 **처리 가능 건수를 미리 실어**(`배송준비중 처리 (2)`) 30건을 골라 눌렀는데 28건이 조용히 거절당하는 일을 만들지 않는다 | 적격 0건일 때 버튼이 비활성인지 · 실행이 언제나 가시 결과를 내는지 | **pass** |
| FEEDBACK-05 | P2 | 비가역 액션 셋이 전부 confirm 게이트를 얻었다(FEEDBACK-02). **그러나 undo window 도 snapshot 도 없다**: 발송처리는 전이가 역방향 금지라 되돌릴 수 없고(`shipment.ts:454-456`), 잘못 붙인 송장은 **삭제도 취소도 없다**(BE-072 §7.10). **삭제가 이 화면에 없으므로 요구의 delete 절은 걸리지 않는다** | 비가역 액션이 confirm 또는 undo 를 갖는지 → confirm 은 있다, undo 는 없다 | **pass(confirm) · gap(undo)** |
| A11Y-03 | P1 | ConfirmDialog 표면 3개의 초기 포커스(update intent → Confirm / discard intent → Cancel)는 DS 가 소유한다. **송장 모달은 화면이 직접 지정한다** — `initialFocusRef` 가 **첫 송장번호 입력**이다(`InvoiceBulkDialog.tsx:200,290`). 헤더 × 가 아니라 첫 편집 필드라 요구의 취지와 맞는다 | DS 판정에 종속. 송장 모달 open 시 activeElement 가 첫 input 인지 | **종속(모달은 pass)** |
| A11Y-08 | P1 | **충족.** 행 클릭이 DS `Table` 소유(마우스 전용 — `<tr>` 에 tabIndex 없음)이고 **행 안에 같은 목적지의 focusable name link 가 있다** — 주문번호 `DetailCellLink`(`ShipmentTable.tsx:147-149`, 접근 이름 `'<주문번호> 주문 상세'`). 추적 링크도 별도 접근 이름을 갖는다(`'<송장번호> 배송 조회 (새 창)'` — `:89`) | 행을 Tab 해서 주문번호 링크에 도달하고 Enter 로 주문 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | **부분 충족.** 폼 open 시 첫 편집 필드 포커스는 **충족**(`initialFocusRef` — A11Y-03). **그러나 검증 실패 시 첫 invalid 필드로 포커스가 이동하지 않는다** — `submit()` 이 `setErrors(found)` 만 하고 포커스를 옮기지 않는다(`InvoiceBulkDialog.tsx:183-190`). 20줄짜리 모달에서 **어느 줄이 틀렸는지 찾으려면 스크롤해야 한다** | 20건을 선택해 모달을 열고 마지막 줄만 비운 채 제출 → activeElement 가 그 줄 input 인지 | **gap** |
| A11Y-16 | P1 | 신규 인터랙티브 표면의 표준 계약을 대체로 충족한다: **항상 마운트된 polite live region**(`:404-412`, 4분기 — 침묵/실패/0행/건수) · 필터 `nav aria-label`(`:391`) · 표 caption 이 **권한을 따라 갈린다**(`ShipmentTable.tsx:197-201`) · 선택 셀·순번 셀의 접근 이름 · 시각 숨김 `<label>` 2종 · 외부 링크의 `(새 창)` 고지와 `rel="noreferrer noopener"`(`:85-89`) · 배송 상태를 **색이 아니라 `StatusBadge` 라벨**로 이중 인코딩하고 부분발송을 **글자로 함께** 세운다(`:165-169`). **잔여 둘**: ① **세는 단위가 실제 행과 다르다** — `ENTITY_LABEL = '배송 건'`(`:78`)인데 행은 주문이라 '배송 건 5건을 찾았습니다'가 실제 배송 건 수와 다르고 체크박스도 `'<주문번호> 배송 건 선택'` 으로 낭독된다(FS-072 §7 #4) ② 일괄 처리의 진행·결과가 live region 에 실리지 않는다(토스트에만 있다) | 필터를 걸어 0행으로 만들 때 스크린리더가 사유를 읽는지(pass). 낭독되는 단위가 화면의 행과 같은지(현재 다르다 — §5 #5) | **pass(잔여)** |
| ERP-01 | P1 | status→tone 매핑이 **키를 다 적은 `Record` 두 벌**이다 — 작업 상태는 `WORK_TONE`(`types.ts:64-73`), 배송 건 상태 어휘는 도메인의 `SHIPMENT_STATUS_LABEL`(`shipment.ts:182-186`)이고 **주문 상태와 같은 낱말을 쓴다**(`:167-173`). per-page meta helper 를 만들지 않았고 표·배지가 같은 함수를 소비한다. **잔여**: `waiting`(배송대기)과 `shipping`(배송중)이 **둘 다 `info`** 다(`types.ts:66-67`) — **이 화면이 존재하는 이유가 그 둘을 가르는 것인데** 색이 같다(FS-072 §7 #12) | 모든 domain status 가 정의된 tone 으로 해석되는지 · 배송대기와 배송중이 시각적으로 구분되는지 | **pass(도메인 내) · 잔여** |
| ERP-08 | P2 | 숫자가 `formatNumber`(건수·수량), 시각이 `formatDateTime`(주문일 — `ShipmentTable.tsx:150`)을 경유한다. 주문번호·송장번호는 `tabular-nums`+`nowrap`(`:44-47`) — **고객·택배사가 전화로 부르는 값이라 한 덩이로 읽히게 둔다**. raw `toString()` 0건 | 셀에 raw 문자열 렌더가 0건인지 | **pass** |
| ERP-11 | P1 | **부분 충족(이 요구가 이름으로 지목하는 화면이다).** 충족: 송장번호가 `tabular-nums`, 배송 state 가 tone 레지스트리(ERP-01). 미충족: ① **택배사가 neutral badge 가 아니라 평문**이다(`carrierSummary` 결과를 그냥 그린다 — `:155`) ② **송장 추적 history 를 Timeline 으로 그리지 않는다** — 그럴 데이터가 없다(**실시간 추적을 흉내 내지 않는 것이 도메인 규칙 5** — `shipment.ts:105-109`)라 이 절은 **정당한 미적용**이다 ③ 송장번호에 mono 서체가 아니라 `tabular-nums` 만 적용된다 | 택배사 열이 badge 인지 · 송장번호가 mono/tabular 인지 | **gap(경미)** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다. 게다가 **행마다 `allocateCovered` 가 두 번 돈다**(`types.ts:134-135` — 커버리지 1회 + 잔량 1회)라 비용이 `주문수 × 품목수 × 배송건수` 다. **완화 둘**: 검색이 디바운스되고(COMP-10) 가로 스크롤 컨테이너가 9열 표를 가둔다(`:122-125`) | 주문 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(실측) — 이 화면도 상한이 없다. abort 는 다이얼로그 취소에서만 발생한다. **이 화면에서 문제다** — BE-072 §2 가 쓰기 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능한데 **이 화면은 status 로 분기하지 않는다** — `isForbidden`·`isConflict`·`isNotFound`·`isHttpError` grep **0건**(실측). 조회 실패는 문구 1종(`:477`), 일괄 실패는 건수 1종(`:231`)이다. **403(재시도 무의미)·409(재시도하면 또 409)·429(백오프)·5xx(재시도 가능)가 전부 '잠시 후 다시 시도해 주세요'로 수렴한다.** 게다가 **서버가 준 사유가 화면에 도달하지 않는다** — `runBulk` 가 `reason` 을 버리고 고정 문자열을 쓴다 | `?status=save:403` · `save:409` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 문장이면 gap**(현재 그렇다) | **gap** |
| EXC-07 | P1 | **미충족.** 서버 422 의 `error.fields` 를 읽는 코드가 **0건**이다 — 송장 줄의 인라인 오류 자리(`InvoiceBulkDialog.tsx:298-302`)는 **클라이언트 검증(`validate()`)에서만** 채워진다. 서버가 '3번째 줄의 송장번호가 중복'이라고 말해도 **그것을 그릴 경로가 없고** 일괄 실패 건수로 뭉개진다. BE-072 §6.1 이 `field` 이름 계약을 정의하지만 **소비 쪽이 비어 있다** | `?status=save:422` → 모달에 필드 오류가 뜨는지. **뜨지 않으면 gap**(현재 그렇다) | **gap** |
| EXC-10 | P1 | **부분 충족.** `settleAllDetailed` 가 `Promise.allSettled` 의미론을 쓰고 **abort 를 실패에서 제외**하며(`bulk.ts:44-50`) 실패가 남으면 **confirmation dialog 를 열어 둔 채** 재시도를 받는다(`:229-232`). **미충족 둘**: ① `settleAllDetailed` 가 `failures`(item + reason)를 돌려주는데 화면이 **`failed` 만 꺼내 쓴다**(`:220`) — 어느 주문이 왜 실패했는지 말하지 않는다 ② **재시도가 실패 항목만 타깃하지 않는다** — 재클릭이 전건을 다시 시도한다. **성공했던 건은 도메인 제약이 막는다**(송장 409 · 전이 422) — 즉 안전이 화면이 아니라 도메인에 기대고 있다 | 3건 중 1건을 실패시키고 재클릭 → **3건이 다시 나가면 gap**(현재 그렇다) | **gap** |
| EXC-11 | P1 | `navigator.onLine` **앱 전역 0건**(실측) — offline 배너·write 게이팅·복귀 refetch 가 없다. **이 화면에서 특히 위험하다** — 요청이 hang 하면 운영자는 **송장이 등록됐는지 모른 채 다시 누르고**, 그 재시도는 지금 서버가 없어 아무것도 막지 못한다(EXC-08) | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면이 없다** — detail/edit 라우트가 없어(`App.tsx:306-317`) '404 와 generic error 를 가르는' 복구 경로가 걸릴 자리가 없다. 목록 조회 실패는 STATE-02 가 다룬다. **다만 어댑터 쪽 근본은 갖춰져 있다**(`crud.ts:109-113`) — 상세가 생기면 그대로 쓸 수 있다 | 상세 라우트가 생기면 다시 매긴다 | **n-a** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — `onMutate`/`setQueryData` grep **0건**(실측). 모든 쓰기가 비관적(응답 후 무효화)이다. **주문 원장과 배송 원장을 함께 움직이는 write 라 optimistic 이 위험하다는 요구의 판단과 정확히 일치한다** | grep 0건 | **pass** |
| EXC-18 | P1 | **부분 충족.** selection scope 가 **명시돼 있다** — 전체 선택 라벨이 `'이 페이지의 배송 건 전체 선택'`(`ShipmentTable.tsx:130`)이고 토글 범위가 **보이는 행뿐**(`:463-468`)이며 `selectedRows` 를 `visible` 에서 다시 거른다(`:171-174`). 선택 변경 규칙도 있다(STATE-04). **미충족**: Shift-click 범위 선택과 그 키보드 등가물이 없고, '전체 N건 선택됨' 배너 대신 요약 줄의 ` · N건 선택됨`(`:432`)뿐이다 | Shift-click 으로 범위 선택이 되는지 | **gap(경미)** |
| EXC-20 | P1 | **미충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 를 보여주지 않는다** — `referenceOf` grep **0건**(실측). 일괄 실패 문구가 `{N}건을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.` 고정이라 **운영자가 신고할 수 있는 식별자가 없다.** raw stack/서버 body 노출이 없는 것은 충족이지만, 그것은 **아무것도 보여주지 않기 때문**이다 | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지. **보이지 않으면 gap**(현재 그렇다) | **gap** |
| EXC-22 | P1 | **권한=fail-closed · 엔타이틀먼트=fail-open** 규약을 이 화면이 소비한다(EXC-21). **이 화면은 세 번째 축을 하나 더 갖는다** — **조회기 미배선의 fail-closed**(`carrierDeleteBlock` · 저장 버튼 잠금 — §4.3). 방향이 셋 다 명시적이다 | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 0건임만 확인 | **종속** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 배송 건 목록 응답 p95 | ≤ 500ms (BE-072 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 대기다. 실제 네트워크 0건 |
| 주문 목록 응답 p95 | ≤ 500ms | 위와 동일. **이 화면은 두 조회가 모두 도착해야 행이 완성된다** — 하나만 오면 커버리지가 어긋나므로 **체감 p95 = max(둘)** 이다 |
| 송장 등록 p95 (건당) | ≤ 700ms (BE-072 §2 서버 상한 10초) | **측정 불가.** 한 건이 **POST 1 + 조건부 PUT 1** 이고, 주문 PUT 은 `orderAdapter.patch` 안에서 **재고 트랜잭션을 동반할 수 있다**(BE-072 §7.5) |
| **발송처리 p95 (행당)** | **≤ 2s** | **측정 불가.** 행마다 **배송 건 수만큼 PUT(`Promise.all`) + 주문 PUT 1건**(`:314-341`). 배송 건이 여러 장인 주문이 병목이다 |
| 일괄 처리 총시간 | **상한 없음** | **미충족 — 상한·진행률·부분 취소가 없다.** N건을 **동시에** 발사하고(`bulk.ts:44`) 완료까지 다이얼로그가 잠긴다. 선택 50건이면 50~100 요청이 한 번에 나간다 — **레이트리밋(BE-072 §5, 분당 60)에 닿기 쉽다** |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **주문 건수에 선형 비례**(ERP-15 gap) |
| 행 조립 비용 | — | `buildShipmentRows` 가 주문마다 `shipmentCoverage` + `uninvoicedLines` 를 부르고 **그 안에서 `allocateCovered` 가 두 번 돈다**(`types.ts:134-135`). 검색은 행마다 자기 배송 건 배열까지 훑는다(`types.ts:176-181`) — 디바운스가 그것을 묶는다 |
| 재조회 횟수 | 진입당 **2회**(두 목록). `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 쓰기 성공 후 재조회 | 배송준비중 = 주문 목록 1 · 송장 등록 = 배송 목록 1 + (조건부) 주문 목록 1 · 발송처리 = 배송 목록 1 + 주문 목록 1 | **건별로 invalidate 가 발생한다** — 일괄 30건이면 무효화가 30번 큐잉된다(react-query 가 합치지만 계약상 상한이 없다) |
| 택배사 카탈로그 조회 | 0 요청 | **동기 조회기다**(`activeCarriers()` → `wiring.ts:172` → `listShippingCarriers()`) — 네트워크가 아니라 배열 필터다. **모달 렌더마다 1회**(`:514`, 메모이즈 없음) |
| 택배사 사용 건수 | 0 요청 | 동기. **`SHIPMENT_SEED` 를 센다**(BE-072 §7.13 #6) |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** 주문 PUT 이 `OrderInput` **전체**(품목·결제·이력·재고 이동 전부)를 싣는다(`order.ts:254-270`) — **이력이 길수록 커진다.** 배송 건 쪽은 작다(`lines` 가 SKU·수량뿐) |
| 번들 | 이 화면 고유 코드 ≤ 25KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 코드 537 + 220 + 122행 + 컴포넌트 2개(209 · 319행) + **도메인 494행**(`shared/domain/shipment.ts` — 배송 정책 화면과 공유) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 주문 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`:474-489`). **다만 배송 건 조회 실패와 한 문구로 뭉개진다**(`loadError = orders.error ?? shipments.error` — `:153`) |
| 배송 건 조회 실패 | 위와 같다 | **충족(같은 배너)**. 복구 방법이 다를 수 있는데 구분되지 않는다(FS-072 §7 #9) |
| 한쪽만 갱신된 중간 상태 | 커버리지가 어긋나지 않는다 | **미보장** — 두 쿼리가 독립 키라 **한쪽만 새로 온 순간이 존재한다.** 그때 행의 `work`·`coverage`·`remaining` 이 일시적으로 사실과 다르다(FS-072 §4 EL-006 행) |
| 필터 건수 조회 전 | 0 이 아니라 '모른다' | **충족** — `loaded` 가 거짓이면 `counts = null` → 배지가 `'—'`(`:163-164` → `FilterPanel` 의 `UNKNOWN_COUNT`) |
| 택배사 목록 미배선 | '없다'와 다르게 말한다 | **충족 — 이 화면의 모범 사례다.** `carriers === null` 과 `options.length === 0` 을 **다른 배너**로 가르고 둘 다 저장을 잠근다(`InvoiceBulkDialog.tsx:192,206,215-225`) |
| 택배사 사용 건수 미배선 | 삭제를 막는다(fail-closed) | **충족** — `carrierDeleteBlock` 이 `CARRIER_DELETE_UNKNOWN` 을 준다(`shipment.ts:158`). 회귀 `shipment.test.ts:188-193` |
| 추적 URL 을 만들 수 없음 | 죽은 링크를 그리지 않는다 | **충족** — `trackingUrl` 이 `null` 이면 번호 텍스트만 그린다(`ShipmentTable.tsx:77-79`). **진행률·상태를 지어내지 않는다** |
| 저장 실패(5xx) | 다이얼로그 유지 + 재시도 + reference code | **부분 충족** — 다이얼로그 유지·재시도는 충족(FEEDBACK-02), **reference code 는 없다**(EXC-20 gap). 서버 사유도 도달하지 않는다 |
| 저장 실패(409 중복 송장) | 그 줄에 사유를 보인다 | **미충족** — 서버 사유가 건수로 뭉개진다(EXC-06 · EXC-07 gap). **지금은 서버가 없어 409 자체가 발생하지 않는다** |
| 부분 실패(일괄) | 어느 건이 왜 실패했는지 | **미충족** — 건수만(EXC-10 gap) |
| **송장 등록 중 실패(create 성공 → 주문 PUT 실패)** | 둘 다 되돌린다 | **미충족 — 트랜잭션이 없다.** 송장만 남고 주문은 배송준비중에 머문다(`:284-292`). 화면은 그 행을 '실패 1건'으로만 보고한다(BE-072 §7.5) |
| **발송처리 중 실패(배송 건 일부만 성공)** | 둘 다 되돌린다 | **미충족** — `Promise.all` 이 reject 하면 **주문 갱신이 아예 실행되지 않는다**(`:314-341`). 나간 배송 건과 주문의 `shippedQuantity` 가 어긋난 채 남는다 |
| 저장 중 이탈(다이얼로그 취소) | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** — 송장이 이미 만들어졌는데 화면에 안 보일 수 있다 |
| 연타(더블클릭) | 정확히 1개 요청 | **미충족**(EXC-08 gap). **송장 등록은 값이 멱등이 아니라 두 장이 만들어진다** |
| 세션 만료 중 입력 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 **모달의 송장번호를 전부 버린다**(가드 미발화) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **BE-072 §2 의 '서버 10초 < 프론트 상한' 이 성립하지 않는다** |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 배송 커버리지 · 송장 무결성 · 감사

이 화면은 **창고에서 무엇이 나갔는가**를 기록한다. 틀리면 고객에게 잘못 말하거나(배송중이 아닌데 배송중), 물건이 화면에서 사라진다(안 나간 품목이 발송됨으로). quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| **커버리지의 셈이 한 곳이다** | **충족** — `allocateCovered`(`shipment.ts:312-328`)가 **module-private 이고 export 되지 않는다.** 공개 함수 셋(`shipmentCoverage`·`uninvoicedLines`·`applyShippedQuantities`)이 전부 그것을 부른다. 회귀 `shipment.test.ts:260-320` · 화면 쪽 정합 `shipments.test.ts:137-143`('작업 상태 판정은 커버리지 판정과 어긋나지 않는다') |
| **'송장이 다 붙었는가'와 '실제로 다 나갔는가'가 어긋나지 않는다** | **충족** — 같은 함수에 **넘기는 집합만 바꿔** 두 질문에 답한다(`shipment.ts:341-346,422-424`). 규칙이 하나라 두 답이 갈릴 수 없다 |
| 과다 입력이 다른 품목까지 덮지 않는다 | **충족** — `Math.min(line.quantity, available)`(`:324`). 회귀 `shipment.test.ts:286-292`. **넘겨 배정하면 창고에 남은 물건이 화면에서 사라진다** |
| 품목 0건인 주문을 '전량 발송'이라 하지 않는다 | **충족** — `complete: total > 0 && covered >= total`(`:358`). 회귀 `shipment.test.ts:294-296` |
| **`OrderLine.shippedQuantity` 가 한 셈에서만 나온다** | **충족(현재)** — `applyShippedQuantities` 의 결과이고 화면이 직접 더하지 않는다(`:327-330`). **그러나 값이 주문 원장에 저장되고 요청 바디에 실린다** — 정본이 배송 원장임을 서버가 못박아야 한다(BE-072 §7.4) |
| 부분발송을 주문 상태로 만들지 않는다 | **충족** — 전 품목이 나갔을 때만 `shipping` 으로 밀고, 아니면 **수량만** 저장한다(`:331-341`). 한 주문 = 한 상태라는 주문 도메인의 전제를 지킨다(`order.ts:109-114`) |
| 부분발송이 '완료 쪽'에 놓이지 않는다 | **충족** — 일부만 나간 주문은 `pending`(발송대기)에 남는다(`types.ts:86-95`). **이 목록의 건수는 곧 오늘 처리할 양**이어야 하고, 반쯤 끝난 일을 완료 쪽에 놓으면 그 숫자가 거짓말이 된다. 회귀 `shipments.test.ts:129-135` |
| 처리 대상이 아닌 주문이 목록에 쌓이지 않는다 | **충족** — 취소·입금 전 주문은 행이 되지 않는다(`types.ts:118-120`). 회귀 `shipments.test.ts:105-110` |
| 건수 배지의 합이 전체와 같다 | **충족** — 어느 행도 두 갈래에 동시에 속하지 않는다. 회귀 `shipments.test.ts:161-164` |
| **같은 택배사에 같은 송장번호가 두 번 붙지 않는다** | **부분 충족 — 지금은 화면만 막는다.** `duplicateInvoiceBlock`(`shipment.ts:282-297`)이 저장 전 원장과 다이얼로그 안 두 줄을 모두 본다(`InvoiceBulkDialog.tsx:167-178`). **그러나 동시 경합은 서버만 막을 수 있고 그 서버가 없다** — 심이 그 사실을 적어 두었다(`data-source.ts:96-97`). 픽스처 불변식으로만 고정돼 있다(`shipments.test.ts:89-92`) |
| 다른 택배사의 같은 번호는 허용한다 | **충족(의도)** — 번호 체계가 택배사마다 따로다. 회귀 `shipment.test.ts:243-245` |
| **송장번호를 조용히 고치지 않는다** | **충족** — `normalizeInvoiceNo` 는 **앞뒤 공백만** 뗀다(`:257-260`). 가운데 공백은 오류다. 회귀 `shipment.test.ts:214-228` |
| 잘못된 송장이 접수 파일로 나가지 않는다 | **충족(형식)** — `INVOICE_NO_RE` 가 양 끝 숫자·숫자/하이픈만 통과시키고 **왜 막았는지를 말한다**(`INVOICE_NO_FORMAT`) |
| **한 줄이라도 틀리면 아무것도 저장하지 않는다** | **충족** — `submit()` 이 위반 하나라도 있으면 `setErrors` 만 한다(`InvoiceBulkDialog.tsx:183-190`). **절반만 들어가면 어느 주문에 송장이 붙었는지 다시 세어야 한다** |
| 송장 없이 발송처리되지 않는다 | **충족** — `SHIPMENT_DISPATCH_NO_INVOICE` 가 막고, 버튼 건수와 저장 판정이 **같은 술어**를 읽는다(`types.ts:218-220` ↔ `shipment.ts:471-473`). 회귀 `shipment.test.ts:392-396` · `shipments.test.ts:216-219` |
| 배송 상태가 되돌려지지 않는다 | **충족** — 역방향·제자리 전이가 막히고(`shipment.ts:454-456`), 술어를 지나치면 `applyShipmentStatus` 가 **던진다**(`:481`). 회귀 `shipment.test.ts:417-421` |
| **이미 찍힌 시각을 덮지 않는다** | **충족** — `shippedAt`/`deliveredAt` 은 비어 있을 때만 채운다(`:485-492`). 회귀 `shipment.test.ts:410-415`. **재시도가 발송 시각을 미래로 밀지 않는다는 뜻이라 멱등 규약이다**(BE-072 §7.3) |
| 시각은 서버 시각이어야 한다 | **미충족(픽스처 한정)** — `at` 이 화면의 `new Date().toISOString()`(`:243,264,306`)이고 **`ShipmentInput` 에 실려 나간다.** 계약상 위조 가능하다(BE-072 §7.8) |
| 새 배송 건은 반드시 `waiting` 으로 태어난다 | **미충족(계약)** — 화면은 그렇게 만들지만(`:279`) `status` 가 **요청 바디에 있다.** 서버가 믿으면 송장 등록 하나가 발송처리를 건너뛴다(BE-072 §7.8) |
| **한 조작이 두 원장에 원자적으로 반영된다** | **미충족 — 트랜잭션이 없다.** 송장 등록·발송처리 모두 두 번의 저장이고 사이에 실패하면 어긋난 채 남는다(§4.2 · BE-072 §7.5). **심이 트랜잭션을 예고하지도 않는다** |
| 배송 건 이력이 지워지지 않는다 | **충족(구조적)** — 삭제 진입점이 없고 어댑터 `remove` 호출부가 0건이다(BE-072 §7.10). **다만 `PUT` 이 전체 치환이라 나간 배송 건의 송장·품목을 고칠 수 있다** — 서버가 `waiting` 에서만 열어야 한다 |
| 잘못 누른 발송처리를 되돌릴 수 있다 | **불가** — 역이동 계약이 없다(전이 역방향 금지 · 삭제 없음 · 취소 배송 건 개념 없음). BE-072 §7.13 #8 |
| 택배사를 지워도 지난 배송 건이 설명된다 | **부분 충족** — 삭제 가드가 사용 건이 있으면 막고 미배선이면 더 막는다(fail-closed). **그러나 가드가 `SHIPMENT_SEED` 를 세므로 방금 등록한 송장이 반영되지 않는다** — 그 상태에서 지우면 그 송장은 **이름도 추적 링크도 잃는다**(BE-072 §7.13 #6) |
| 발송이 고객에게 통지된다 | **미충족** — 발화 지점만 있고 알림이 없다(`shipment.ts:22` · `data-source.ts:98`). **송장만 등록되고 고객은 배송 여부를 스스로 확인해야 한다**(BE-072 §7.13 #9) |
| 부분 발송을 화면에서 만들 수 있다 | **불가** — 다이얼로그가 **잔량 전부를 한 송장에 싣는다**(`:277-278`). 도메인은 완전히 지원하는데 **UI 가 막고 있다.** 픽스처의 부분발송 상태를 화면에서 재현할 수 없다(FS-072 §7 #1) |
| 성공 건수가 사실이다 | **미충족** — `runInvoice` 가 못 찾은 행을 **조용히 건너뛰고**(`:268-269`) `settleAllDetailed` 가 그것을 **성공으로 센다.** '3건에 송장을 등록했습니다' 토스트가 뜨는데 실제로는 2건일 수 있다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | EXC-08 · (§4.3) | P0 | **멱등키·제출 락이 없고, 송장 등록은 값이 멱등이 아니다.** `grep idempotencyKey pages/orders` = 0건인데 `crud.ts` 의 자리와 원장은 열려 있다. **지금은 서버의 `(carrierId, invoiceNo)` 유일 제약도 없어 픽스처에서 같은 송장 두 장이 실제로 만들어진다** | 이 화면 + BE 계약 | **UI 기획 · 백엔드 명세 (최우선)** (BE-072 §7.1 · §7.13 #2 · FS-072 §7 #7) |
| 2 | EXC-04 · EXC-06 · EXC-10 · EXC-20 | P0 · P1 | **실패가 한 문장으로 뭉개진다.** 409/403/429/5xx 를 가르지 않고(`isConflict` 등 grep 0건), 어느 건이 왜 실패했는지 말하지 않으며(`settleAllDetailed` 의 `failures` 미사용), reference code 도 없다. **동시성 토큰(`If-Match`/`version`)도 없어 합법 범위 편집은 last-write-wins** | 이 화면 + BE 계약 | UI 기획 · 프론트 구현 · 백엔드 명세 (BE-072 §7.9 · §7.13 #3 · FS-072 §7 #6·#9) |
| 3 | IA-04 · ERP-15 · COMP-07 | P0 · P1 · P2 | 페이지네이션·정렬 변경 없음 — 전량 렌더. **'오늘 할 일 목록'이라 건수가 곧 작업량**인데 300건이면 300행이고 행마다 `allocateCovered` 가 두 번 돈다. 순번 오프셋도 함께 붙어야 한다. **행이 주문이라 페이징을 주문 축에 걸어야 한다** | 이 화면 + 공용 + BE 계약 | UI 기획 · 백엔드 명세 (BE-072 §7.12 · FS-072 §7 #5) |
| 4 | (§4.3) | — | **한 조작이 두 어댑터를 지나는데 트랜잭션이 없다.** 송장 등록은 '송장만 남고 주문은 그대로', 발송처리는 '배송 건은 나갔는데 주문 갱신이 아예 실행되지 않음'을 만든다. 심이 트랜잭션을 예고하지도 않는다 | 이 화면 + BE 계약 | **백엔드 명세 (트랜잭션 경계 — 최우선)** · 아키텍처 (BE-072 §7.5 · FS-072 §7 #2) |
| 5 | A11Y-16(잔여) · STATE-05(잔여) | P1 | **세는 단위가 실제 행과 다르다** — `ENTITY_LABEL = '배송 건'` 인데 행은 주문이라 라이브 리전·체크박스 접근 이름·빈 상태 문구가 전부 어긋난다. 일괄 처리의 결과가 live region 에 실리지 않는다. 빈 상태에 **'결제 미사용' 갈래**가 없다 | 이 화면 | UI 기획 (문구) (FS-072 §7 #4·#8) |
| 6 | A11Y-11(잔여) · COMP-04 · A11Y-13 · COMP-12 | P0(잔여) · P1 · P2 | 송장번호 입력이 **필수 표기(`required`/`aria-required`/`*`)를 갖지 않고**(`FormField` 미사용), **검증 실패 시 첫 invalid 줄로 포커스가 이동하지 않으며**, 길이 카운터·근접 경고가 없다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 7 | EXC-07 | P1 | **서버 422 를 그릴 자리가 없다** — 줄 단위 오류 슬롯이 클라이언트 검증에서만 채워진다. BE-072 §6.1 이 `field` 이름 계약을 정의했는데 소비 쪽이 비어 있다 | 이 화면 + BE 계약 | UI 기획 (BE-072 §7.13 #7) |
| 8 | (§4.3) | — | **부분 발송을 화면에서 만들 수 없다** — 다이얼로그가 잔량 전부를 한 송장에 싣는다. 도메인·계약은 이미 지원한다. 또 **줄 수 상한·스크롤·가상화가 없어** 선택 50건이면 50줄이 한 모달에 쌓인다 | 이 화면 | **UI 기획 (최우선)** (FS-072 §7 #1 · BE-072 §7.13 #10) |
| 9 | (§4.3) | — | **성공 건수가 사실이 아닐 수 있다** — `runInvoice` 가 못 찾은 행을 조용히 건너뛰고 그것이 성공으로 세어진다. **조용한 성공은 이 리포가 가장 경계하는 실패 모드다** | 이 화면 | 프론트 구현 (FS-072 §7 #14 · BE-072 §7.13 #13) |
| 10 | ERP-01(잔여) · ERP-11 | P1 | **배송대기와 배송중이 같은 `info` 톤**이다 — 이 화면이 존재하는 이유가 그 둘을 가르는 것인데 색이 같다. 택배사가 neutral badge 가 아니라 평문이다 | 이 화면 + DS | UI 기획 (FS-072 §7 #12) |
| 11 | (§4.3) | — | **'택배사를 모른다'와 '택배사가 삭제됐다'가 표에서 뭉개진다** — 송장 다이얼로그는 정확히 가르는데 표는 `'알 수 없는 택배사'` 하나다. **택배사 사용 건수가 `SHIPMENT_SEED` 를 세어** 방금 등록한 송장이 삭제 가드에 반영되지 않는다 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-072 §7.13 #4·#6 · FS-072 §7 #3·#15) |
| 12 | (§4.3) | — | **고객 알림이 없다** — 발송처리가 발화 지점이라고 도메인과 심이 모두 적어 두었으나 지금은 이력만 남는다. **역이동 계약도 없다** — 잘못 누른 발송처리를 복구할 길이 없다 | BE 계약 | **백엔드 명세** (BE-072 §7.13 #8·#9 · FS-072 §7 #17) |
| 13 | EXC-05 · EXC-11 · (EXC-19) | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 **송장 모달의 입력을 버린다**(가드 미발화). **BE-072 §2 의 '서버 10초 < 프론트 상한' 이 성립하지 않는다** | **앱 전역** | 프론트 구현 · UI 기획 (FS-072 §7 #16) |
| 14 | EXC-18 | P1 | Shift-click 범위 선택과 키보드 등가물이 없다. selection scope 자체는 명시돼 있다 | 이 화면 + 공용 | UI 기획 (경미) |
| 15 | COMP-01(잔여) · (FS-072 §7 #11·#13) | P2 | 모달 저장 버튼이 DS `loading` 대신 손 라벨('등록 중…'). 제외 사유 문구가 **도메인 상수를 인용하지 않는다**(`ORDER_TRANSITION_UNPAID` 대신 화면이 쓴 문장). **`rows` 가 비어도 모달이 열려 `0건 송장 등록` 라벨이 되는 경로가 구조적으로 열려 있다** | 이 화면 | 프론트 구현 (경미) |
| 16 | (§4.3) | — | **파생값이 요청 바디에 실린다** — `status`·`shippedAt`·`deliveredAt`·`shippedQuantity`. 발송 시각·상태 위조가 이 계약의 가장 직접적인 무결성 손실 경로다 | 이 화면 + BE 계약 | **백엔드 명세 (BE-072 §7.4 · §7.8 — 최우선)** · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조와 grep 실측이다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (어댑터 코드 확인)**

**이 화면은 어댑터를 둘 쓴다.** `shipmentAdapter` 는 `scope: SHIPMENT_RESOURCE = 'shipments'`(`data-source.ts:14,100`), `orderAdapter` 는 `scope: ORDER_RESOURCE = 'orders'`(`pages/orders/data-source.ts:29,66`). 둘 다 `createCrudAdapter` 가 `failIfRequested(scope, op)` 를 부른다(`crud.ts:99-170` → `shared/api/client.ts` → `dev.ts:90-98`).

| op | 이 화면의 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` (shipments) | `fetchAll` (`crud.ts:100`) ← `:146` | `?fail=shipments:list` · `?fail=list` · `?fail=all` | FS-072-EL-023 배너 |
| `list` (orders) | `fetchAll` ← `:145` | `?fail=orders:list` · `?fail=list` · `?fail=all` | 같은 배너 — **두 실패가 구분되지 않는다**(§3 EXC-06) |
| `save` (shipments) | `create`(`crud.ts:118`) ← `:186,284` · `update`(`:132`) ← `:187,316` | `?fail=shipments:save` · `?fail=save` · `?fail=all` | 송장 모달 상단 `Alert` / 발송처리 다이얼로그 배너 |
| `save` (orders) | `update` ← `:185,247,288,337` | `?fail=orders:save` · `?fail=save` · `?fail=all` | 배송준비중 다이얼로그 배너 |
| `detail` | `fetchOne` — **이 화면에서 호출부 0건** | — | **`?fail=detail` 은 이 화면에서 아무 효과가 없다**(상세 라우트 부재) |
| `delete` | `remove` — **호출부 0건** | — | **`?fail=delete` 도 무효**(삭제 진입점 부재 — BE-072 §7.10) |

> **`?fail=list` 와 `?fail=save` 는 두 어댑터를 동시에 때린다** — op 만 적으면 scope 를 가리지 않기 때문이다(`dev.ts:117-123`). **한쪽만 실패시키려면 반드시 `scope:op` 형태를 쓴다.**

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

> **⚠ `?status=` 에는 scope 한정이 없다.** `requestedStatus` 가 `entry.split(':')` 로 `[target, code]` 를 뽑으므로(`dev.ts:71`) `?status=shipments:save:409` 는 `code = 'save'` 가 되어 `parseInt` 가 `NaN` 을 내고 **조용히 무시된다.** 코드가 `target !== \`${scope}:${op}\`` 를 비교하지만(`:73`) 그 형태는 이 파싱으로 만들어질 수 없다. 즉 **`?status=save:409` 는 주문 저장과 배송 건 저장을 함께 409 로 만든다** — 이 화면의 판정을 재현할 때 그 사실을 감안해야 한다.

| 판정 | 재현 |
|---|---|
| STATE-01 (스켈레톤 vs 이전 행) | 진입 후 필터 변경(또는 `staleTime` 30초 경과 재진입). **`?delay=` 는 이 리포에 없다** |
| STATE-02 (조회 실패) | `?fail=shipments:list` / `?fail=orders:list` — **둘 다 같은 배너면 §3 EXC-06 의 근거**(현재 그렇다) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 '{N}건을 처리하지 못했습니다' 면 gap**(현재 gap) |
| EXC-06 (상태코드 분기) | `?status=save:403` · `save:409` · `save:429` · `save:500` — **전부 같은 문장이면 gap**(현재 gap) |
| EXC-07 (422 표시 자리) | `?status=save:422` — 송장 모달에 줄 단위 오류가 뜨는지. **뜨지 않으면 gap**(현재 gap). `dev.ts:93` 이 던지는 `HttpError` 는 `violations` 가 **비어 있다** — 실제 필드 위반은 서버가 붙어야 재현된다 |
| EXC-08 (중복 제출) | 확인 버튼 연타 또는 네트워크 스로틀. `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/orders` = **0건**으로도 판정된다 |
| EXC-20 (reference code) | `?status=save:500` — `오류 코드 TDS-…` 가 보이는지. **보이지 않으면 gap**(현재 gap). `?fail=save` 로는 애초에 재현되지 않는다 — generic `Error` 에는 `reference` 가 없다 |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Forders%2Fshipments&reason=session_expired` 로 가면 pass |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/orders/shipments` 의 `update` 를 끄면 체크박스 열과 일괄 바가 사라지고 안내문이 서야 한다(현재 pass) |
| EXC-21 (엔타이틀먼트) | **`?status=` 가 아니라 플랜**으로 재현한다 — `commerce.orders` 를 내리면 `/orders` 가지 전체가 잠기거나 사라진다. 판정은 `RequireEntitlement` 소유 |

**미배선 seam 의 재현**: 택배사 조회기 둘은 `resetCarrierCatalogLookup()` · `resetCarrierUsageLookup()` 으로 미배선 상태를 만들 수 있다(`shipment.ts:73,135`). **앱에서는 `wiring.ts:171-173` 이 둘 다 꽂으므로 브라우저에서 재현되지 않는다** — 이 경로의 방어선은 단위 테스트다(`shipment.test.ts:137-155,177-200` · `shipments.test.ts:224-237`).

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · TOKEN-03 · A11Y-11 · A11Y-12 · MOTION-03 · COMP-01 · COMP-04 · EXC-04 · EXC-06 · EXC-08 · EXC-14 · EXC-20 판정 — 전부 2026-07-22 실측) · RTL(`aria-describedby` ↔ `role="alert"` id 일치) · **`shipment.test.ts` 도메인 회귀**(택배사 카탈로그 미배선 · 추적 링크 · 삭제 fail-closed · 송장 형식·중복 · 커버리지·잔량·출고 수량 · 주문 축 다리 · 전이·시각 도장) · **`shipments.test.ts` 화면 회귀**(픽스처 정합 — **배송 픽스처의 SKU 가 주문 픽스처와 한 글자만 달라도 그 주문은 영원히 발송대기에 남고 화면은 멀쩡해 보이는데 아무 버튼도 듣지 않는다** — 행 모델·작업 상태·필터/검색/집계·일괄 대상·택배사 열). **렌더 테스트는 없다** — `ShipmentListPage.test.tsx` · `InvoiceBulkDialog.test.tsx` 가 존재하지 않아 **모달의 검증·파기 가드·다이얼로그 유지 계약이 DOM 수준에서 고정돼 있지 않다**(§5 의 여러 항목이 그 사각지대에 있다).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다 — grep 으로만 판정한 항목은 **명령과 결과(0건)를 함께** 적었다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — IA-04(픽스처 30건 이상 · Pagination 부재) · EXC-04(`?status=save:409`) · EXC-08(연타 · grep 0건)
- [x] 모든 `N/A` 에 사유를 댔다 — **FEEDBACK-04**(페이지 폼 부재 · 모달은 FEEDBACK-06 이 덮는다) · **IA-05**(create·edit 라우트 쌍 부재 — 라우트가 목록 하나뿐)
- [x] §2.1 산수 검산 — **14 pass + 12 종속 + 2 n-a + 3 gap = 31** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다(Modal 4개 · Toast 1곳 · Header h1 · ErrorBoundary · RequireEntitlement). 앱 공용 프레임워크(`shared/crud`·`shared/ui`·`shared/permissions`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1) — 그래서 **A11Y-12(FilterPanel)** 와 **COMP-10(useListState)** 이 종속이 아니라 pass 다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·상세 라우트·기간 필터·optimistic)은 적지 않았다. **ERP-11(배송/송장 UI 관례)은 이 화면을 이름으로 지목하므로 넣었다**
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. **이 화면 고유의 축(행 조립 비용 · 일괄 총시간 · 두 조회의 max)** 에 별도 줄을 세웠다
- [x] §4.3 을 **배송 커버리지 · 송장 무결성 · 감사** 셋으로 세웠다 — 셈의 단일 소유(`allocateCovered`)·부분발송의 자리·송장 유일성·시각 도장·트랜잭션 부재·역이동 부재를 전부 판정했다
- [x] §6 의 `?fail=` scope 와 op 를 **두 어댑터의 `scope` 상수에서 확인**했고(`'shipments'` · `'orders'`), **op 만 적으면 둘을 동시에 때린다**는 사실과 **`?status=` 에 scope 한정이 코드상 도달 불가**(`dev.ts:71-76`)라는 사실을 실측해 적었다. **`?delay=` 를 쓰지 않았다**(이 리포에 없다)
- [x] §5 의 gap 이 FS-072 §7 · BE-072 §7.13 과 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가(백엔드 없음)'로 남겼고, E2E 를 돌리지 않았음을 §1·§6 에 명시했으며, **이 화면에 렌더 테스트가 없다는 사실**을 §6 에 밝혔다
