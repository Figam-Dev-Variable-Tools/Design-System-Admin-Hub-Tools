---
id: NFR-071
title: "주문 비기능 명세"
functionalSpec: FS-071
backendSpec: BE-071
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-22
---

# NFR-071. 주문 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-071 주문 (`/orders` · `/orders/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-071(요소·예외) · BE-071(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-071 §7 · BE-071 §7.15 와 대응해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider·RequireEntitlement)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**창고의 실물을 움직이는 화면이다.** 입금 확인 한 번이 상품 SKU 재고를 실제로 빼고(`data-source.ts:53-55`), 취소 한 번이 그것을 되돌린다(`:48-50`). 두 사건 다 멱등키(`stockAppliedAt` · `stockRestoredAt`)가 못 박아 되돌릴 수 없고, **상태 전이는 애초에 되돌리는 경로가 없다**(`ORDER_TRANSITION_BACKWARD`). 그래서 이 화면의 P0 는 **비가역 액션의 게이트(FEEDBACK-02)** · **중복 제출(EXC-08)** · **동시성(EXC-04)** 에서 다른 목록 화면보다 무겁게 읽어야 한다.

**무게를 더하는 축이 둘 더 있다.** ① **일괄 처리** — 이 화면은 목록에서 N건의 상태를 한 번에 옮기고, 그 N건이 **개별 PUT 으로 병렬 발사**된다(`OrderListPage.tsx:186-192`). 중복 제출과 레이트리밋의 창이 단건 화면의 N배다. ② **두 번째 필자** — 배송 처리 화면이 **같은 어댑터·같은 scope 로** 주문을 쓴다(`shipments/ShipmentListPage.tsx:59,288-292,337-341`). 동시성은 두 운영자만의 문제가 아니라 **두 화면의 문제**이기도 하다.

반대로 이 화면이 다른 화면보다 나은 축도 분명하다: **`useRouteWritePermissions` 를 배선한 소수 화면 중 하나**라 EXC-03 을 통과하고, **전이 규칙이 버튼·일괄 대상·저장에서 같은 술어 하나로 도는** 드문 화면이라(회귀 `orders.test.ts:173`) '눌리는데 거부당하는 버튼'이 구조적으로 없으며, **선택 해제 규칙이 실제로 닿는다**(§2 STATE-04).

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **두 data view 가 각각 하나만 그린다.** ① **목록**: `firstLoading = isFetching && data === undefined`(`OrderListPage.tsx:133`)가 DS Table 의 `loading` 으로만 간다(`:343` → `OrderTable.tsx:190`). 재조회는 `isFetching && !firstLoading` 로 **분리**돼 요약에 ' · 새로고침 중…' 만 덧붙고 이전 행이 유지된다(`:310-314`) — `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:298`)가 뒷받침한다. **error 분기가 요약·선택바·표 전체를 대체한다**(`:308,359-373`). ② **상세**: `detailQuery.error !== null` 이 **먼저** 오고(`OrderDetailPage.tsx:257`) 그 뒤 `order === undefined`(`:287`) — 무한 스피너가 없다 | `/orders` 진입 → 데이터 렌더 확인 → 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 두 read 실패가 전부 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`OrderListPage.tsx:359-373`) '주문 목록을 불러오지 못했습니다.' + '다시 시도'(`refetch`). **상세**(`OrderDetailPage.tsx:257-285`) 404 → '주문을 찾을 수 없습니다…' + '목록으로'만 / 그 밖 → '주문을 불러오지 못했습니다.' + **'다시 시도'** + '목록으로'. read 실패에 toast 를 쓰지 않고(`toast` 소비는 저장 성공 2곳 — `OrderListPage.tsx:197` · `OrderDetailPage.tsx:195`), **empty 로 폴백하지 않는다**(빈 상태는 `error === null` 가지 안에만 있다). 건수 배지도 실패를 0 으로 위장하지 않고 `'—'` 를 낸다(`:138-139` → `FilterPanel.tsx:153`) | `?fail=list` · `?fail=detail` 로 각 조회를 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap. 좌측 필터 배지가 `0` 이 아니라 `—` 인지도 확인 | **pass** |
| STATE-04 | STATE | 직접 | **두 절 중 하나는 표면이 없고, 하나는 충족한다.** ① `page` clamp — **페이지네이션이 없어 표면 자체가 없다**(`useListState` 에 `filterDefaults` 만 넘긴다 — `:123`). 그 부재는 IA-04 가 gap 으로 잡는다. ② **'숨겨진 행의 선택 해제'는 실재하고 충족한다** — `useListState` 의 `viewSignature`(`useListState.ts:207-213`)가 `page\|keyword\|sort\|filters` 를 서명으로 삼아 **실제로 바뀔 때만** 선택을 지우고, 이 화면은 **`useCrudList` 가 아니라 `useListState` 의 선택 집합을 직접 쓰므로**(`:123,159,347`) 그 해제가 실제로 닿는다. **이중 방어**: `selectedOrders` 를 `visible` 안에서만 고르므로(`:158-161`) 숨겨진 행이 선택된 채 남아도 일괄 처리 대상이 되지 않는다 | 3건을 선택 → 상태 필터를 바꾼다. **선택 배지('N건 선택됨')가 0 이 되고 SelectionBar 가 사라지면 pass.** 검색어 입력으로도 같은지 확인. 페이지네이션이 도입되면 clamp 절을 다시 매긴다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/orders/{OrderListPage,OrderDetailPage,types,validation,data-source}.ts(x)` 와 `components/OrderTable.tsx` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22 — 히트는 전부 `claims/`·`shipments/` 하위다). 파생 치수는 `calc(${cssVar('space.6')} * 9)`(`OrderListPage.tsx:79`) · `* 14`(`:102`) · `* 10`(`OrderTable.tsx:65`) 같은 space 토큰 배수로만 표현한다. `box-shadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/orders --exclude-dir=claims --exclude-dir=shipments` → **0건이어야 한다.** ESLint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(상세 '목록으로' `OrderDetailPage.tsx:310` · 결제설정/문의 링크 `OrderListPage.tsx:227,231,258,262` · `DetailCellLink`) · DS `<Button>`·`<SearchField>`·`<TextareaField>` · `FilterPanel` 의 토글 버튼 · `RowSelectCell`/`SelectAllHeaderCell`. **이 화면이 focus ring 을 직접 선언하지 않는다**(로컬 `:focus-visible` 0건) | DS 토큰 문서 판정을 따른다. 이 화면에서 `outline` 을 선언하는 로컬 스타일이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS Table 스켈레톤 펄스 · Toast(`OrderListPage.tsx:197` · `OrderDetailPage.tsx:195`) · DS `<Button>` transition · `ConfirmDialog` 3종(일괄 전이 · 진행 확인 · 이탈 가드)과 `Modal` 1종(주문 취소)의 backdrop. **이 화면이 `transition`/`animation` 을 직접 선언하지 않는다**(grep 0건 실측) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: 상세 `<Card>` **최대 6개**(주문 요약 · 주문자/수령인 · 품목 · 결제 · 이력 · 메모) + 로딩 카드 · Toast · Modal 4종. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`OrderDetailPage.tsx:319`). 그 스타일이 `typography('typography.title.xl')`(`shared/ui/styles.ts:52-58`) — **18px 위 tier + weight 600 semantic composite** — 를 참조하며 값을 손으로 재현하지 않는다. 카드 제목은 `CardTitle`(`<h2>`). 최종 결제금액 줄만 `primitive.typography.font-weight.bold` 를 직접 읽는데(`:121-124`) **그것은 typography tier 가 아니라 weight 단일 축**이라 이 요구의 대상이 아니다. **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/orders/:id` 의 '주문 상세' `<h1>` computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `OrderListPage.tsx:297-304` 가 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`**(`:303`)를 스프레드한다. 그 props 가 `onCompositionStart/End` + `onKeyDown` 을 실어 ① 조합 중에는 커밋하지 않고 ② 조합 종료 후 **250ms 디바운스**로 커밋하며 ③ **조합 중 Enter 를 가로챈다**(`useListState.ts:24,227-238`). 순서 뒤바뀐 응답은 이 화면에 없다 — 검색이 클라이언트 필터라 요청 자체가 나가지 않는다(`:141-144`) | `/orders` 검색창에 IME 로 '루미엔' 입력. **조합 중 '루ㅁ'·'루미' 같은 부분 문자열이 필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **되돌릴 수 없는 조작 넷이 전부 게이팅된다.** ① **일괄 전이** `ConfirmDialog intent="update"`(`OrderListPage.tsx:378-393`) — **제외되는 건수와 그 사유를 함께 말한다**(`:382-386`, 사유 문자열을 도메인 상수 `ORDER_TRANSITION_UNPAID` 에서 그대로 가져온다). ② **상태 전이** · ③ **입금 확인** `ConfirmDialog intent="update"`(`OrderDetailPage.tsx:536-554`) — 문구가 되돌릴 수 없음을 명시하고 입금 확인은 재고가 빠질 수 있음까지 밝힌다(`:541-543`). ④ **주문 취소**는 사유를 받아야 해서 `ConfirmDialog` 가 아니라 `Modal` 이지만(`:558-611`) **명시적 확인 + 비가역성 고지 + danger 확인 버튼**을 갖춰 요구의 게이트 계약을 만족한다. **busy 계약**: `busy={saving}`/`busy={bulkBusy}` 로 더블클릭을 막고 `loading` 이 '처리 중…'을 낸다. **실패 유지 계약**: 세 다이얼로그 모두 **성공했을 때만 닫힌다** — 확인은 `onDone` 콜백에서 닫고(`:214,223,241`) 실패는 `error` 배너로 그 안에 남으며(`:547` · `OrderListPage.tsx:389`) 재클릭이 곧 재시도다(`:534-535` 주석이 그 계약을 적는다). **abort 계약**: 취소(`onCancel`)가 진행 중 요청을 abort 한다(`:550,563,575` · `OrderListPage.tsx:171`). **되돌릴 수 있는 메모 저장은 묻지 않는다** — 그 판단이 코드에 있다(`OrderDetailPage.tsx:10-12`) | 상세에서 `?fail=save` 로 강제 실패 후 '배송준비중 처리' → 확인. **다이얼로그가 남고 그 안에 사유가 뜨며 확인 버튼이 되살아나면 pass**(현재 그렇다). 목록에서 3건 선택 후 일괄 처리도 동일. 메모 저장에는 확인이 **없어야** 한다 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | `OrderDetailPage.tsx:178` 이 `useUnsavedChangesDialog(noteDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `noteDirty` 는 RHF `isDirty` 가 아니라 **도메인 판정**(`note !== order.adminNote` — `:176`)이며 계약상 등가다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 저장 성공 시 `refetch` 가 돌고 `useEffect([order])`(`:171-174`)가 `note` 를 원본으로 되맞춰 dirty 가 풀린다 | 상세에서 메모 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** **주의**: '목록으로' 버튼(`:312`)과 조회 실패 화면의 '목록으로'(`:278`)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-071 §7 #8 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | 직접 | **미충족.** **편집 가능한 폼을 담은 modal 이 실재한다** — 주문 취소 모달이 `TextareaField`(취소 사유, `maxLength=200`)를 담는다(`OrderDetailPage.tsx:597-609`). 그런데 **네 이탈 경로 어디에도 dirty 가드가 없다**: `onClose`(딤·Esc·× — `:562-566`)와 footer '닫기'(`:573-577`)가 곧바로 `setCancelOpen(false)` 한다. `useUnsavedChangesDialog` 는 **`noteDirty` 만 본다**(`:176-178`) — 취소 사유는 dirty 로 세지 않는다는 것이 명시된 선택이다(FS-071-EL-051). **완화 1건**: `cancelReason` 이 모달이 아니라 **페이지 state** 라(`:163`) 닫아도 값이 남아 재오픈 시 복원된다 — 요구가 막으려는 '입력 파괴'는 이 경로에서 관측되지 않는다. **그러나 요구가 명시한 intercept 장치가 0건이고**, 모달을 닫은 뒤 페이지를 벗어나면 그 사유는 가드 없이 사라진다 | 취소 모달에 사유를 100자 입력 → Esc(또는 딤 클릭 · '닫기'). **discard 확인 없이 즉시 닫히면 gap**(현재 그렇다). 재오픈 시 값이 남는지도 확인(남는다 — 완화 근거). `grep -n "useUnsavedChangesDialog\|dirty" apps/admin/src/pages/orders/OrderDetailPage.tsx` → 히트가 `noteDirty` 계열뿐 | **gap** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면 **2개**: 일괄 처리 성공 `toast.success('N건을 <상태>(으)로 처리했습니다.')`(`OrderListPage.tsx:197-199`) · 상세 저장 성공(`OrderDetailPage.tsx:195`, 문구 4종 — 입금·전이·취소·메모가 호출부에서 갈린다 `:213,221,239,253`). 지속 live region 은 `ToastProvider` 가 소유한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **4개**: 일괄 전이 `ConfirmDialog` · 진행 확인 `ConfirmDialog` · 주문 취소 `Modal` · 이탈 가드. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다. **주문 취소만 `Modal` 을 직접 쓰므로**(`:558-611`) DS 가 `children` 에 대해 `bodyId` 를 세우는지에 판정이 달려 있다 | DS 판정에 종속. 네 다이얼로그 open 시 title 과 message 가 함께 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 4종을 전수 확인했다.** ① **처리 메모 `TextareaField`**(`OrderDetailPage.tsx:509-518`) — 오류를 `error` prop 으로만 넘기고(`:517`) `aria-invalid`+`aria-describedby`+`role="alert"` 짝은 DS 가 내부에서 세운다. ② **취소 사유 `TextareaField`**(`:597-609`) — 같은 경로이며 **`cancelTouched` 이후에만** 오류를 넘겨 치는 도중 붉게 물들이지 않는다(`:605-608`). ③ **`SearchField`**(`OrderListPage.tsx:297-304`) — `label` 로 접근 이름을 받는다. ④ **선택 체크박스** `RowSelectCell`/`SelectAllHeaderCell` — 라벨을 문자열로 받아 DS 가 연결한다(`OrderTable.tsx:116-119,157-160`). **짝 없는 `aria-invalid` 0건**(grep 실측: 이 화면 파일에 `aria-invalid` 히트 0건 — 전부 DS 내부 배선이다) | `grep -rn "aria-invalid" apps/admin/src/pages/orders/{OrderListPage,OrderDetailPage}.tsx apps/admin/src/pages/orders/components` → 0건(DS 위임). RTL 로 취소 모달에서 사유를 비운 채 '주문 취소'를 눌러 `textarea.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | 직접 | **표면이 실재하고 충족한다.** 좌측 상태 필터가 공유 `FilterPanel` 을 소비하고(`OrderListPage.tsx:271-280`), 그 골격이 `nav > h2 > ul > li > button[aria-pressed]` 다(`FilterPanel.tsx:6,121-145`). **선택 상태를 `aria-pressed` 하나로 말하고 `aria-current` 를 쓰지 않는다** — 컴포넌트가 그 판단을 주석으로 못 박았다(`FilterPanel.tsx:17-19` — `이 버튼은 '토글 필터'이지 '현재 위치'가 아니다`). 이 화면 파일에 `aria-current`·`aria-pressed` 직접 선언 **0건**(전부 위임 — 실측) | `/orders` 좌측 필터에서 `document.querySelectorAll('[aria-current]')` 가 필터 영역에 0건이고, 선택된 항목만 `aria-pressed="true"` 인지 확인 | **pass** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **4개**(일괄 전이 · 진행 확인 · 주문 취소 · 이탈 가드). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건). **잔여** — 애니메이션되는 닫힘은 Modal 소유 3경로(Esc·딤·×)뿐이고 footer 버튼은 즉시 언마운트인데, **이 화면의 확인 경로가 전부 그 잔여에 해당한다**(`onConfirm`/`onCancel` 이 호출부 상태를 곧바로 내린다) | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면 2개(§A11Y-01). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: DS Table 스켈레톤 펄스 · Toast · Modal 4종 · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건 실측). `ToggleSwitch` 는 이 화면에 없다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:307,317`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위는 2열 그리드(`OrderListPage.tsx:77-82`), 상세는 평범한 `<div style={pageStyle}>`(`OrderDetailPage.tsx:307`)다. 좌측 `FilterRail` 은 **AppShell 의 nav 가 아니라 콘텐츠 안의 필터 레일**이라 요구가 금지하는 '자체 sidebar' 가 아니다. **`/orders/:id` 가 정적 잎보다 뒤에 등록돼**(`App.tsx:308-317`) `/orders/shipments`·`/orders/claims` 를 삼키지 않는다 | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고 화면이 자체 nav/header 를 그리지 않는지 확인. `/orders/shipments` 가 상세로 잡히지 않는지도 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** AppHeader 가 `findNavLabel(pathname)`(`AppHeader.tsx:15,56`)으로 `<h1>` 을 그리고, `/orders/:id` 는 `findCoveringLeaf` 덕에 잎 `/orders`(`nav-config.ts:168`)를 찾아 **'주문'** 을 보인다(브랜치 '주문 관리'로 떨어지지 않는다). **그런데 상세가 자체 `<h1>주문 상세</h1>` 를 또 그린다**(`OrderDetailPage.tsx:319`) → **`<h1>` 이 2개**다. 게다가 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 모순**이고, 두 h1 이 서로 다른 것을 말하며(하나는 메뉴 이름, 하나는 화면 종류) **어느 쪽도 주문번호를 식별하지 못한다** — 주문번호는 `CardTitle`(`<h2>`) 안에 있다(`:324`) | `/orders/:id` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록은 1개(정상) — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색(`:295-306`) → 결과 count 요약(`:310-314`) → **SelectionBar + 일괄 액션**(`:316-338`) → table(`:340-357`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 주문 생성이 범위 밖이다(BE-071 §7.2). 좌측 필터 레일은 이 템플릿의 확장이며 다른 목록 화면과 같은 `FilterRail`/`FilterPanel` 이다. **미충족: Pagination 이 없다.** `visible` 전량을 DS Table 에 넘기고(`:342`) `useListState` 의 `page`·`sort` 가 소비되지 않는다(`:123` 이 `filterDefaults` 만 넘긴다). **주문은 커머스에서 가장 빨리 쌓이는 컬렉션**이며 행마다 `orderAmounts` 를 다시 계산하므로 비용이 건수 × 품목수에 비례한다(BE-071 §7.13). 정렬 변경 UI 도 없다 | 픽스처를 100건 이상으로 늘리고 `/orders` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — `/orders/new` 도 `/orders/:id/edit` 도 없다(`App.tsx:306-317` 전수). 주문은 고객의 결제가 만들고(BE-071 §7.2), 관리자의 처리는 폼 라우트가 아니라 상세 라우트 안의 카드·다이얼로그에서 일어난다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 상태 필터·검색어의 **단일 원천이 URL 쿼리스트링**이다. `:123` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { status: 'all' }` — `:71`), 그 훅이 `useSearchParams` 로 `?status=`·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고 갱신은 `replace: true`(`useListState.ts:125`)라 검색어 한 줄에 history 가 쌓이지 않는다. 손으로 고친 값은 `parseFilter(…, ORDER_STATUS_FILTER_VALUES, 'all')`(`:125-129`)가 되돌린다 — 허용 목록을 필터 정의에서 파생하므로 캐스팅이 없다(`types.ts:45-47`). 결과: 필터를 걸고 상세에 들어갔다 Back 하면 조건이 복원되고, 링크로 공유할 수 있으며 F5 도 같다. **`sort`·`page` 는 정렬 UI·페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | `/orders` 에서 상태='배송준비중' + 검색='ORD-2026' 적용 → URL 이 `?status=preparing&q=ORD-2026` 인지 확인 → 행 클릭으로 상세 진입 → 브라우저 Back. **같은 조건의 목록이 복원되면 pass.** `?status=거짓말` 을 손으로 넣어 '전체'로 되돌아가는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`(`AppShell.tsx:395-412`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `notifySessionExpired()`. **이 화면의 조회 2종·저장이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Forders&reason=session_expired` 로 이동하는지 확인. (미저장 메모 유실은 EXC-19 P1 사안 — §3) | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `resourceIdForPath` → `findCoveringLeaf`(`route-resource.ts:31-34`)라 **`/orders/:id` 도 `/orders` 잎으로 덮인다**(AppHeader 제목과 **같은 규칙**). ② **write 게이팅(직접)**: `useRouteWritePermissions()` 를 **두 화면 모두** 구독하고(`OrderListPage.tsx:121` · `OrderDetailPage.tsx:152`) 그 값이 쓰기 표면 전부를 지배한다 — 목록의 **체크박스 열 자체**(`selectable={canUpdate}` `:345` → `OrderTable.tsx:112-122,154-166`)와 **SelectionBar·일괄 버튼**(`:316`), 상세의 **전이/입금/취소 액션 블록 전체**(`:374`) · **메모 입력 `disabled`**(`:514`) · **'메모 저장' 미렌더**(`:519`). ③ **문구로도 알린다** — 사라진 버튼을 찾게 하지 않는다(`OrderListPage.tsx:267` '상태를 바꿀 권한이 없어 조회만 가능합니다.' · `OrderDetailPage.tsx:370-372` · 표 caption 이 권한에 따라 갈린다 `OrderTable.tsx:182-186`). ④ **강등 reconcile**: 권한 스토어가 바뀌면 훅 구독자가 재렌더돼 별도 코드 없이 컨트롤이 사라진다. ⑤ **선택이 `canRemove` 가 아니라 `canUpdate` 에 묶인 것**도 정확하다 — 이 화면에서 선택이 하는 일은 수정이다(`OrderTable.tsx:15-16`). ⑥ **행 클릭·주문번호 링크는 read 로만 게이팅된다** — 조회 전용 역할이 상세로 가는 길을 잃지 않는다 | 권한 스토어에서 `page:/orders` 의 `update` 를 끈 뒤 `/orders` 와 `/orders/:id` 진입. **체크박스 열·SelectionBar·전이/취소 버튼·'메모 저장'이 전부 사라지고 두 안내 문구가 뜨면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인. **잔여(이 요구의 gap 은 아니다)**: 서버 403 이 오면 일반 배너로 뭉개진다 — EXC-06 P1 사안(§3) | **pass** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소됐다** — 어댑터가 공용 `createCrudAdapter` 라 없는 id 에 **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** 를 던진다(`crud.ts:144-146`). ② **그러나 화면에 409 해소 UI 가 없다** — `onError`(`OrderDetailPage.tsx:199-203`)에 status 분기가 **하나도** 없고 `isConflict` grep 0건. 409 는 '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' 로 떨어져 **재시도하면 또 409 인 실패에 '다시 시도'를 권한다.** ③ **낙관적 동시성 토큰이 없다** — `Order` 에 `version`/`updatedAt` 이 없고(`order.ts:218-246` 전수) `update` 가 `If-Match` 를 보내지 않는다(`pages/orders` 파일 grep **0건** 실측). 현 409 는 **'존재 여부' 기반**이므로 **동시 편집은 last-write-wins** 다. ④ **이 화면에서 특히 나쁘다** — 저장이 `toOrderInput` 으로 **주문 전체를 치환**하므로(`:191`) 메모만 고친 저장이 상대의 상태 전이를 **이력까지 통째로** 되돌린다. **그리고 다투는 상대가 사람만이 아니다** — 배송 처리 화면이 같은 어댑터로 같은 주문을 쓴다(`shipments/ShipmentListPage.tsx:288-292,337-341`). ⑤ **완화 둘**: 전이 가드가 저장 시점에 다시 도므로 불법 전이는 `throw` 로 막히고(`order.ts:350-351`), 재고 이중 반영은 멱등키 2개가 막는다 — 그 구분을 흐리지 말 것 | `?status=save:409` 로 상세에서 '메모 저장'. **conflict 다이얼로그·재조회 없이 일반 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/orders/{OrderListPage,OrderDetailPage,types,data-source}.ts*` → 0건으로 확인(실측 0건) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** 이 화면의 어떤 쓰기에도 **동기 제출 락(`submitLockRef`)도 멱등키도 없다** — `grep idempotencyKey\|submitLock apps/admin/src/pages/orders` **0건**(실측). `useCrudForm` 을 쓰지 않고 저수준 `useCrudUpdate` 를 직접 부르기 때문이다. **자리는 이미 비어 있다**: `UpdateVars.idempotencyKey`(`crud.ts:340-346`)와 어댑터 원장(`crud.ts:67-77,137-139,149`)이 존재하는데 `update.mutate({ id, input, signal })`(`OrderDetailPage.tsx:191`)와 `update.mutateAsync({ id, input, signal })`(`OrderListPage.tsx:187-191`)가 키를 넣지 않아 **원장이 영원히 발현되지 않는다.** 방어는 버튼 `disabled`/다이얼로그 `busy` 뿐이라 렌더 전 연타의 창이 남는다. **일괄 처리에서 창이 N배다** — `settleAllDetailed` 가 N건의 PUT 을 **병렬로** 낸다. **완화 셋**: (a) 버튼이 `type="submit"` 이 아니라 `onClick` 이라 창이 좁고 (b) **모든 저장이 주문 전체 치환 + 목표 상태 고정**이라 두 번 실행돼도 최종 상태가 같으며 (c) **재고 이중 차감·복원은 `stockAppliedAt`·`stockRestoredAt` 이 막는다**(회귀 `orders.test.ts:308,324,581`). **그러나 이력은 두 번 늘어난다** — `withEvent` 는 멱등이 아니다(`order.ts:340-343`). 감사 원장에 같은 전이가 두 줄 남는다 | 상세에서 '진행' 확인 버튼을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되고 처리 이력에 같은 전이가 두 줄 남으면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/orders` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **다섯 지점이 배선돼 있다.** ① **상세 onSuccess** — `if (controller.signal.aborted) return;`(`OrderDetailPage.tsx:194`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ② **상세 onError** — `if (isAbort(cause)) return;`(`:200`). ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:169`). ④ **다이얼로그·모달 취소** — `onCancel`/`onClose`/'닫기'가 같은 컨트롤러를 abort 한다(`:550,563,575`). ⑤ **목록 일괄** — `closeBulk` 가 abort 하고(`OrderListPage.tsx:171`), `.then` 이 `controller.signal.aborted` 면 즉시 return 하며(`:194`), `.catch` 가 `isAbort` 를 무시한다(`:210`). 공유 predicate `isAbort`(`shared/async`)를 쓴다 — 로컬 판정을 재발명하지 않는다. **bulk 실패 count 에서 abort 제외**도 성립한다(abort 는 `.then` 진입 전에 걸린다) | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다. 목록에서 일괄 처리 중 '취소' → 실패 배너가 뜨지 않는지 확인 | **pass** |
| EXC-21 | EXC | 상속 | **이 화면은 판정 대상이나 거절 UI 를 소유하지 않는다.** 이 라우트는 `commerce.orders` 모듈에 속한다(`module-resources.ts:31-36` — `group:/orders` · `page:/orders` · `page:/orders/shipments` · `page:/orders/claims` 가 한 묶음이다. 주문 없이 배송이나 환불만 파는 계약은 없다). 잠금(`locked`) · 숨김(`absent`) · 허용(`granted`)의 판정은 `entitlementStateForResource`(`route-entitlement.ts:23`)가 하고, 화면 대체는 AppShell 의 `RequireEntitlement` 가 `<Outlet>` 바깥에서 한다. **이 화면 안에 403 문구도 업그레이드 안내도 없다**(grep: `entitlement` 0건) — 한 화면에 두 계열이 섞일 표면 자체가 없다. **판정 순서 네 계열이 실제로 갈려 있다**: 인증(`RequireAuth`) → 플랜(`RequireEntitlement`) → 권한(`RequirePermission` + `canUpdate`) → **설정**(결제 미사용 안내 — `OrderListPage.tsx:220-235,255-266`). **넷째 계열이 이 화면에서 특히 또렷하다** — '주문이 0건'과 '주문이 들어올 통로 자체가 없다'를 구조적으로 다른 사실로 가르고 갈 곳(결제 설정·상품 문의)도 다르다(`:12-14`) | 플랜에서 `commerce.orders` 를 내리고 `/orders` 진입. **잠금/숨김 화면이 뜨고 그 문구에 403 계열 표현이 섞이지 않으면 pass**(판정은 `RequireEntitlement` 소유). 결제 설정을 끄고 진입해 **설정 계열 안내가 권한 문구와 섞이지 않는지**도 확인 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **14** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · A11Y-12 · IA-01 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · EXC-21 |
| `n-a` | **1** | IA-05 |
| `gap` | **5** | FEEDBACK-06 · IA-02 · IA-04 · EXC-04 · EXC-08 |
| **합계** | **31** | 14 + 11 + 1 + 5 = **31** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.**
>
> - **IA-02 · IA-04** 는 앱 전역의 같은 뿌리(sub-route h1 이중 · 목록 페이징 부재)를 공유하므로 **횡단 배치**로 푸는 것이 옳다.
> - **EXC-04 · EXC-08 은 이 화면에서 다른 화면보다 무겁다** — 저장이 **주문 전체 치환**이고, **일괄 처리가 N건을 병렬로** 내며, **배송 화면이 같은 레코드의 두 번째 필자**이기 때문이다(§1.2).
> - **FEEDBACK-06 은 이 화면 고유**이며 취소 모달 하나에 걸린다. 다만 값이 페이지 state 라 실제 파괴는 관측되지 않아 셋 중 가장 가볍다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·기간 필터·Pagination range·optimistic write·인라인 편집)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **가벼운 refetch 인디케이터도 있다** — 요약에 ' · 새로고침 중…' 을 덧붙이고 `aria-busy={isFetching && !firstLoading}` 를 건다(`OrderListPage.tsx:310-314`) | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | **빈 상태가 4분기다** — 공유 `Empty`(검색 0건 / 필터 0건 / 진짜 0건, `createVerb="접수"` 라 '등록'을 권하지 않는다 — `:237-244`)에 **결제 미사용이라는 네 번째 축**이 앞선다(`:219-235`): info `Alert` + '결제 설정 열기' + **'상품 문의 열기'**. 그 판단이 코드에 있다(`:12-14`) — '오늘 주문이 0건'과 '주문이 들어올 통로가 없다'는 구조적으로 다른 사실이다 | PG 를 끈 채 `/orders` 진입 → 결제 안내가 뜨는지. 검색어로 0건 → '검색 지우기', 필터로 0건 → '필터 초기화' | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:356-358`) 상세가 `detailQuery.refetch()` 로 최신을 다시 읽는다(`OrderDetailPage.tsx:196`). 일괄 성공 시 선택을 지우고 다이얼로그를 닫는다(`OrderListPage.tsx:200-202`). **과잉 재조회가 없다** — 저장한 리소스와 그 목록만 건드린다 | 상세에서 상태 변경 후 목록 복귀 시 배지·건수 배지가 갱신돼 있는지 | **pass** |
| COMP-01 | P1 | 모든 액션이 DS `<Button>` 이고 진행 상태를 **`loading` prop** 으로 표현한다(`OrderDetailPage.tsx:524,584`) — 손으로 쓴 '저장 중…' 라벨이 없다. `grep "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/orders/*.tsx` = **0건**. 상세 '목록으로'만 `<button>` + 로컬 스타일인데(`:308-316`) **아이콘+텍스트 back affordance 라 DS Button 이 아닌 것이 의도**이며 `tds-ui-focusable` 을 소비한다 | `grep -n "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/orders/OrderListPage.tsx apps/admin/src/pages/orders/OrderDetailPage.tsx apps/admin/src/pages/orders/components/OrderTable.tsx` → 0건 | **pass** |
| COMP-02 | P1 | 선택 셀이 `RowSelectCell`/`SelectAllHeaderCell` 이고 순번이 `SeqCell`/`SeqHeaderCell` 이다(`OrderTable.tsx:111-124,153-169`). raw `<input type=checkbox>` 0건. 부분 선택 상태는 공유 `tableSelectionState`(`:109`)가 계산한다. **껍데기를 화면이 조립하되 프리미티브는 전부 공용**이라는 선택이 코드에 적혀 있다(`:4-13`) | `grep -n "type=\"checkbox\"" apps/admin/src/pages/orders` → 0건 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>` 다(`OrderListPage.tsx:297-304`). raw `<input type="search">` 0건 | 목록 툴바가 DS 컴포넌트인지 확인 | **pass** |
| COMP-06 | P2 | **스켈레톤이 DS Table 소유다** — 화면이 행 수·셀 수를 손으로 세지 않고 `loading={firstLoading}` 만 넘긴다(`OrderTable.tsx:190`). **다만 DS 가 정한 행 수가 PAGE_SIZE 와 맞는지는 페이지네이션이 없어 판정할 기준값 자체가 없다**(IA-04 gap 과 연동). **상세는 스켈레톤이 아니라 문구 한 줄**이다(`OrderDetailPage.tsx:287-295`) — 카드 6개짜리 화면이 한 줄로 접혔다 튀어나온다 | 페이지네이션 도입 후 스켈레톤 행 수 === PAGE_SIZE 인지. 상세 로딩 shape 가 실제 화면과 닮았는지 | **gap(상세)** |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`OrderTable.tsx:168`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다.** 현 구조는 요구의 (a) 형태 그대로다: whole-row 클릭(`onActivate` — `OrderTable.tsx:170-172`) + **row 내 접근 가능한 링크 하나**(주문번호 `DetailCellLink`, 접근 이름 `'<주문번호> 주문 상세'` — `:134-136`). **행 액션 열(연필·휴지통)이 없다** — 수정 폼도 삭제도 없기 때문이다 | 목록에 중복 '상세' 버튼·행 액션 열이 없는지 | **pass** |
| COMP-09 | P2 | **상품 요약 열만 충족한다** — `ellipsis` + `nowrap` + 최대 폭 고정(`OrderTable.tsx:63-69`). **주문자·주문번호 열에는 truncate 가 없다**(`:56-60,138`) — 긴 이름이 열을 넓힌다. 상세의 **취소 사유·처리 메모·요청사항**에도 `pre-wrap` 이 없어 줄바꿈이 한 문단으로 뭉친다. **완화**: 표가 `overflowX: 'auto'` 컨테이너 안에 있어(`OrderListPage.tsx:113-116,340`) 페이지 본문이 가로로 밀리지는 않는다 | 40자 주문자명 픽스처로 표 폭이 유지되는지 | **gap(완화됨)** |
| COMP-12 | P2 | 처리 메모(`maxLength=500`)와 취소 사유(`maxLength=200`)가 `TextareaField` 의 실시간 카운터를 갖는다. **그러나 상한 근접 경고가 없고, 네이티브 `maxLength` 가 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — zod 오류는 **사실상 도달 불가**다(`validation.ts:17-23` 의 500자 규칙이 네이티브에 가려진다). counting 기준(UTF-16 code unit)도 명시되지 않았다 | 500자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: read 실패=인라인 Alert(EL-018·EL-049) · write 성공=toast · write 실패=**카드 안 배너 + 오류 코드**(`OrderDetailPage.tsx:335-342`) · 다이얼로그 안 실패=**그 다이얼로그의 배너**(`:547` · `OrderListPage.tsx:389`) · abort=아무것도 띄우지 않는다. write 실패가 toast 가 아니라 배너인 것은 폼 맥락(입력을 보존한 채 그 자리에서 재시도)이라 이탈로 보지 않는다 | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 성공(toast — 입금·전이·취소·메모 4문구)·실패(배너 + 참조 코드) 경로가 모든 쓰기에 배선돼 있다. **no-op 클릭이 없다** — 갈 수 없는 단계는 버튼이 아예 없고(`:387-398`), 취소 불가는 버튼 대신 사유가 서며(`:412-415`), 적격 0건이면 일괄 버튼이 `disabled` 다(`OrderListPage.tsx:326`) | `?fail=save` 로 저장 → 가시 실패가 나오는지. 입금 전 주문의 상세에 전이 버튼이 0개이고 사유 문구가 뜨는지 | **pass** |
| FEEDBACK-05 | P2 | 비가역 액션 **넷 전부 확인 게이트**를 갖는다(FEEDBACK-02) — '단일 클릭 비가역'이 없다. **그러나 undo window 도 snapshot 도 없다**: 상태 전이는 `ORDER_TRANSITION_BACKWARD` 가 역행을 막고, 재고 차감은 `stockAppliedAt` 이 잠그며, 취소는 `ORDER_CANCEL_DONE` 이 재취소를 막는다. **잘못 누른 '배송완료'를 되돌릴 길이 데이터에도 UI 에도 없다.** 삭제가 이 화면에 없으므로 요구의 delete 절은 걸리지 않는다 | 비가역 액션이 confirm 또는 undo 를 갖는지 → confirm 은 있다, undo 는 없다 | **pass(confirm) · gap(undo)** |
| A11Y-03 | P1 | ConfirmDialog 표면 3개 + Modal 1개. 초기 포커스(update intent → Confirm / discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다. **주문 취소 `Modal` 은 `initialFocusRef` 를 넘기지 않는다**(grep 0건) — 그 경로의 판정은 DS Modal 기본 동작에 달려 있다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **충족.** 행 클릭이 마우스 보조 수단이고(`<tr>` 에 tabIndex 없음), **행 안에 같은 목적지의 focusable name link 가 있다** — 주문번호 `DetailCellLink`(`OrderTable.tsx:134-136`). `:105-107` 주석이 그 의도를 명시하고, DS Table 의 가드가 `<a>` 내부 클릭을 행 활성화에서 제외해 둘이 충돌하지 않는다 | 행을 Tab 해서 주문번호 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 폼 진입 시 첫 편집 필드 자동 포커스가 없고, 저장 실패 시 그 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `setFocus` 경로를 상속하지 못한다(이 화면은 RHF 를 쓰지 않는다 — `validation.ts:34-37`). **취소 모달을 열어도 사유 textarea 에 포커스가 가지 않는다**(`initialFocusRef` 미전달). 클라이언트 검증 실패는 문구만 꽂는다(`:605-608`) | 취소 모달을 열고 `document.activeElement` 가 사유 textarea 인지 → 아니면 gap | **gap** |
| A11Y-16 | P1 | **여러 계약을 충족한다**: **항상 마운트된 polite live region**(`OrderListPage.tsx:285-293`, 문장 4분기 — 최초 로드 중에는 **침묵**) · 표 caption 이 **권한에 따라 갈린다**(`OrderTable.tsx:182-186`) · 필터 `nav aria-label="주문 상태 필터"`(`:272`) · 링크 접근 이름(`'<주문번호> 주문 상세'`) · 선택 체크박스 라벨(`'<주문번호> 주문 선택'`) · `aria-busy` 로 재조회 표시(`:310`) · **취소 행이 색만으로 말하지 않는다**(tone=danger 옆에 '취소' 배지 — `OrderTable.tsx:149,173-174`). **잔여**: 상세 처리 이력이 저장 후 갱신되는데 live region 이 없고, 일괄 처리의 진행 상황(N건 중 M건)이 announce 되지 않는다 | 필터를 걸어 0행으로 만들 때 스크린리더가 사유를 읽는지(pass). 일괄 처리 진행이 announce 되는지(현재 안 된다) | **pass(경미 잔여)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:127-139`(`STATUS_TONE`·`orderStatusTone`) · `:141-152`(`EVENT_TONE`). `Record` 로 키를 다 적어 상태가 늘면 컴파일이 막는다(`:125` 주석). 목록·상세·배지가 같은 함수를 소비한다. **다만 `preparing`·`waiting`·`shipping` 이 전부 `info` 라 색만으로는 세 단계가 구분되지 않는다** — 라벨이 그것을 전한다 | 모든 domain status 가 정의된 tone 으로 해석되는지. info 톤 3개의 구분 가능성 | **pass(톤 중복)** |
| ERP-03 | P1 | **sticky thead 도 sticky selection bar 도 없다.** 전량 렌더라 표가 길어질수록 헤더와 SelectionBar 가 화면 밖으로 밀린다 — 100건을 선택해 아래로 스크롤하면 일괄 버튼을 찾으러 위로 올라가야 한다. `tableScrollStyle` 은 가로 스크롤만 담당한다(`OrderListPage.tsx:113-116`) | 100건 픽스처로 스크롤 → thead·SelectionBar 가 고정되는지 | **gap** |
| ERP-04 | P1 | **정렬 헤더가 없다.** 정렬은 주문 일시 내림차순 고정이고(`types.ts:112-117`, 어댑터가 응답 직전에 적용 — `data-source.ts:75`) `aria-sort`·방향 인디케이터·키보드 조작이 전부 부재다. **금액 순·상태 순으로 훑을 수 없다.** 숫자 열의 `tabular-nums` 는 있다(`OrderTable.tsx:57-60`) | 결제금액 헤더를 눌러 정렬이 바뀌는지 → 안 바뀐다 | **gap** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을, 시각이 `formatDateTime` 을 경유한다(`OrderTable.tsx:137,143` · `OrderDetailPage.tsx:352,354,360,365`). 빈 상태·실패 문구가 셀의 것과 같은 어조다 | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-07 | P2 | 금액이 전부 `` `${formatNumber(n)}원` `` 형태로 **숫자와 단위를 한 문자열로 잇는다**(`OrderTable.tsx:143` · `OrderDetailPage.tsx:478-494`). **목록의 결제금액은 우측 정렬 다행 컬럼이라** '원'이 마지막 자릿수를 따라다녀 자릿수 정렬이 미묘하게 어긋난다. `tabular-nums` 는 열 스타일에 있다 | 결제금액 열의 시각 확인 — 자릿수가 다른 행들의 숫자 끝이 정렬되는지 | **gap(경미)** |
| ERP-08 | P2 | 수량·금액이 `formatNumber`, 시각이 `formatDateTime` 을 경유한다. **raw `toString()` 0건.** 상세 사유·요청사항에 `pre-wrap` 이 없는 것은 COMP-09 로 잡는다 | 셀의 raw 문자열 렌더가 0건인지 | **pass** |
| ERP-13 | P1 | **미충족.** 사용자 대상 문자열에 **리터럴 조사 폴백이 다수 있다**: `` `${orderStatusLabel(to)}(으)로 처리했습니다.` ``(`OrderListPage.tsx:198`) · 일괄 다이얼로그 문구 2종(`:384-385`) · `` `${orderStatusLabel(to)}(으)로 처리했습니다.` ``(`OrderDetailPage.tsx:221`) · `` `주문 ${order.id}을(를) ${orderStatusLabel(pending.to)}(으)로 진행합니다.` ``(`:543`) · 취소 모달 본문 `주문 …을(를) 취소합니다.`(`:594`). **상태 라벨이 받침으로 갈리는 값**('배송준비중' vs '배송중')이라 조사 헬퍼가 실제로 필요한 자리다 | `grep -n "(으)로\|을(를)" apps/admin/src/pages/orders/*.tsx` → 히트가 0이 아니면 gap(현재 5곳 이상) | **gap** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없고, **행마다 `orderAmounts`·`partialShipmentLabel` 을 다시 계산한다**(`OrderTable.tsx:127-128,143`). 비용이 건수 × 품목수에 비례한다. **완화 둘**: 검색이 디바운스돼(COMP-10) 자모마다 전량 스캔이 일어나지 않고, 가로 scroll 컨테이너가 9열 표를 가둔다 | 1,000건 픽스처로 scroll/검색/전체선택이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 **앱 전역 0건**(실측) — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 취소에서만 발생한다. **이 화면에서 특히 문제다** — BE-071 §2 가 저장 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. **상세 조회만 404 를 가른다**(`isNotFound` — `OrderDetailPage.tsx:258`). **그 밖은 전부 한 문구로 뭉갠다** — 목록 조회는 400/403/500 을 '주문 목록을 불러오지 못했습니다.'로(`OrderListPage.tsx:362`), 저장은 400/403/409/422/500 을 '저장하지 못했습니다.'로(`OrderDetailPage.tsx:201`). `isForbidden`·`isConflict`·`isUnprocessable` 이 이미 있는데 이 화면이 쓰지 않는다(grep 0건 실측). **403 은 재시도 수단을 주면 안 되고 409 는 재시도하면 또 409 다** | `?status=save:403` · `save:409` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **미충족.** 서버 422 의 `error.fields`/`violations` 를 읽는 코드가 이 화면에 **0건**이다 — `onError` 가 status 를 보지 않고 고정 문구를 꽂는다(`OrderDetailPage.tsx:199-203`). **다만 도메인 술어가 던진 사유는 그 자리에 그대로 실린다**(`:228,247` — `cause instanceof Error ? cause.message : …`) — 즉 **클라이언트 위반은 사유를 말하고 서버 위반은 못 말한다**. 클라이언트 zod 오류(취소 사유)는 인라인 슬롯을 갖는다(`:605-608`) | `?status=save:422` → 필드 인라인 오류가 뜨는지 → 안 뜬다(일반 배너). 전이 위반을 인위로 만들면(다이얼로그를 열어 둔 채 다른 탭에서 상태를 옮김) 배너에 술어 사유가 뜨는지 | **gap** |
| EXC-10 | P1 | **부분 충족.** 일괄 처리가 `settleAllDetailed`(`shared/bulk.ts`)로 **Promise.allSettled 의미론**을 쓴다 — 하나가 실패해도 나머지는 반영되고, 실패가 남으면 **다이얼로그를 닫지 않고** 'M건을 처리하지 못했습니다.' 를 그 안 배너로 보인다(`OrderListPage.tsx:193-207`). **미충족 2건**: (a) **어느 주문이 왜 실패했는지 말하지 않는다** — `settleAllDetailed` 가 사유를 함께 돌려주는데 화면이 `failed` 만 꺼내 쓴다(`:193`) (b) **retry 가 실패 item 만 타깃하지 않는다** — 재클릭이 `eligible` 전체를 다시 보낸다. 완화: 값이 멱등이라 성공분 재실행이 최종 상태를 바꾸지 않는다(다만 이력은 늘지 않는다 — 전이가 이미 끝나 술어가 막는다) | 3건 중 1건만 실패하도록 픽스처를 조작 → 실패한 주문번호가 배너에 나오는지 → 안 나온다 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 **앱 전역 0건**(실측) — offline 배너·write 게이팅·복귀 refetch 가 없다. **재고를 움직이는 화면이라 offline write 가 특히 위험하다** — 요청이 hang 하면 운영자는 재고가 빠졌는지 모른 채 다시 누른다(EXC-08 과 겹친다) | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다(`OrderDetailPage.tsx:257-285`): 404 → '주문을 찾을 수 없습니다. 주문번호를 다시 확인해 주세요.' + **'다시 시도' 없음** + '목록으로' / 그 밖 → '주문을 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던지고(`crud.ts:109-113`) 화면이 `isNotFound` 로 읽는다. 무한 스피너 없음(`order === undefined` 는 error 분기 뒤에 온다) | 없는 `:id`(`/orders/ORD-없음`)로 진입 → '찾을 수 없습니다' + retry 없음. `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 모든 쓰기가 비관적이다(응답 후 무효화 + `refetch`). `onMutate`/`setQueryData` grep = 0건. **재고를 움직이는 write 라 optimistic 이 위험하다는 요구의 판단과 정확히 일치한다** — 롤백 경로가 필요 없다 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | **부분 충족.** selection scope 가 **명시적으로 current-view** 다 — `selectedOrders` 를 `visible` 안에서만 고르고(`:158-161`) '전체 선택'도 보이는 행만 담는다(`:348-353`). **'N건 선택됨' 배너**가 요약 줄에 있고(`:313`) **일괄 버튼 글자에 처리 가능 건수가 실린다**(`:332`) — 대량 작업 안전장치의 핵심을 충족한다. 필터·검색 변경 시 선택이 지워진다(STATE-04). **미충족**: Shift-click range selection 과 그 키보드 등가물이 없고, 'all-matching-filter' 선택 축이 아예 없다(전량 렌더라 지금은 동치이나 페이징 도입 시 갈린다) | 20건을 Shift-click 으로 범위 선택할 수 있는지 → 없다 | **gap** |
| EXC-19 | P1 | 세션 만료 경고(idle/expiry 프롬프트)와 dirty 폼 snapshot 이 없다. **401 리다이렉트가 미저장 처리 메모를 버린다** — 프로그램 이동이라 이탈 가드가 발화하지 않는다. 같은 계열로 '목록으로' 버튼도 가드 밖이다(FS-071 §7 #8) | 메모를 치던 중 `?status=save:401` → 재인증 후 메모가 남아 있는지 → 사라진다 | **gap** |
| EXC-20 | P1 | **충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 를 보여준다** — `setErrorReference(referenceOf(cause))`(`OrderDetailPage.tsx:202`) → `오류 코드 {errorReference}`(`:339`). `HttpError.reference` 는 `TDS-<base36 시각>-<3자리 난수>`. raw stack/서버 body 노출 없음. `referenceOf` 는 `HttpError` 가 아니면 null 을 반환해 없는 코드를 지어내지 않는다. **다만 목록 조회 실패와 일괄 처리 실패에는 참조 코드가 없다**(`OrderListPage.tsx:206,212`) | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지(pass). **`?fail=save` 로는 재현되지 않는다** — generic `Error` 에는 `reference` 가 없다(정확한 동작) | **pass(상세)** |
| EXC-22 | P1 | **세 축의 실패 방향이 갈려 있고 이 화면이 전부 소비한다**: 권한 축 fail-closed(`RequirePermission` + `canUpdate`) · 엔타이틀먼트 축 fail-open(`route-entitlement.ts:10-12` — `판정 실패가 기능 정지가 되면 안 된다`. 이 라우트는 매핑이 **있으므로** fail-open 이 적용되지 않는다) · **결제 설정 축 fail-closed**(`ordersCanArrive()` → `checkoutCta(readPaymentSettings(),'product')` — `_shared/store.ts:65-67`. 화면이 `usePg` 를 직접 읽지 않는 이유가 코드에 있다 `:62-63`: `화면이 usePg 를 직접 읽어 다시 판단하면 상점 ID 가 비어 있는 경우를 놓친다`). **양방향 단위 테스트는 소유 모듈에 있다** | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 0건이고 `ordersCanArrive` 가 `checkoutCta` 를 경유하는지만 확인 | **종속** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-071 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 주문 갱신 p95 (메모·전이만) | ≤ 700ms | 위와 동일 |
| **주문 갱신 p95 (재고 차감·복원 동반)** | **≤ 2s** (BE-071 §2 서버 상한 10초 → 504) | **측정 불가.** 재고 락 + 다중 SKU 갱신 + 이동·처리 이력 기록이 한 트랜잭션이다(BE-071 §7.5) |
| **일괄 전이(N건)** | **N × 단건 예산이 아니라 병렬 처리 후 p95 ≤ 5s(N ≤ 50)** | **측정 불가.** `settleAllDetailed` 가 **N건의 개별 PUT 을 병렬로** 낸다(`OrderListPage.tsx:186-192`) — **상한·진행률·취소 UI 가 없어** N 이 커지면 레이트리밋(BE-071 §2 분당 60)에 먼저 걸린다. **이 축이 이 화면의 병목이 될 것이다** |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형**이고, **행마다 `orderAmounts` 를 다시 계산하므로 건수 × 품목수**다(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | 상세 1회(`refetch`) + 무효화된 목록·상세 각 1회 | `useCrudUpdate.onSuccess` 가 둘을 무효화하고(`crud.ts:356-358`) 화면이 상세를 **한 번 더** 명시적으로 `refetch` 한다(`OrderDetailPage.tsx:196`) — **중복 1회**. 무효화만으로 충분한지 확인이 필요하다(§5 #12) |
| 건수 배지 계산 | 진입·재조회당 1회 전량 순회 | `countOrdersByStatus`(`types.ts:71-90`)를 `useMemo` 로 감싼다(`:139`). 키를 다 적은 `Record` 라 상태가 늘어도 순회가 1회다 |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 1회 | **충족(요청)** / **부분 충족(연산)** — 디바운스 250ms 가 자모당 스캔을 막으나, 커밋마다 전량을 필터 1회 + 검색 1회 훑고 **주문마다 품목 배열까지 순회한다**(`types.ts:107`) |
| 주문 참조 조회(다른 도메인) | 0 요청 | **동기 함수다**(`listOrderRefs()` → `ORDER_SEED.map`) — 네트워크가 아니다. **다만 호출마다 `orderAmounts` 를 전건 계산한다**(`data-source.ts:96`) |
| 저장 요청 크기 | ≤ 16KB | **미충족 — 상한이 없다.** `OrderInput` 이 **품목·수령인·결제·처리 이력 전체·재고 이동 전체**를 실어 보낸다(`order.ts:254-270`). 오래된 주문일수록 `history` 가 길어져 **요청 크기가 이력에 비례해 커진다** — 계약상 무한이다. BE-071 §7.7 안 A 가 이를 상수로 만든다 |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 주문은 상한 없이 증가(BE-071 §7.13) |
| 번들 | 이 화면 고유 코드 ≤ 25KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 파일 `OrderListPage.tsx`(396행) · `OrderDetailPage.tsx`(616행) · `OrderTable.tsx`(194행) · `types.ts`(209행) · `validation.ts`(49행) + 도메인 `order.ts`(562행) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`OrderListPage.tsx:359-373`). **좌측 필터 레일은 살아남는다** — 배너가 우측 컬럼만 대체한다. 건수 배지는 `'—'` 로 '모름'을 말한다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass). 재저장 시 이전 오류를 먼저 지운다(`:186-187`) |
| 저장 실패(422 전이) | 그 사유를 보인다 | **부분 충족** — **클라이언트 술어가 던진 사유는 배너에 그대로 뜬다**(`:228,247`). **서버 422 는 고정 문구로 뭉개진다**(EXC-07 gap) |
| 저장 실패(409 동시 삭제/충돌) | conflict 다이얼로그 + 입력 보존 | **미충족** — 일반 배너로 뭉개진다(EXC-04 gap) |
| 일괄 처리 부분 실패 | 실패 건과 사유를 밝히고 재시도 | **부분 충족** — 건수는 밝히고 다이얼로그를 유지하나 **어느 주문이 왜 실패했는지 말하지 않는다**(EXC-10 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** — 재고가 이미 움직였는데 화면에 안 보일 수 있다(BE-071 §7.15 #17) |
| 확인 다이얼로그 중 실패 | 다이얼로그 유지 + 재시도 | **충족** — 성공했을 때만 닫힌다(`onDone` 콜백). 실패는 다이얼로그의 `error` 배너로 오고 확인 버튼 재클릭이 재시도다 |
| 동시 처리(두 운영자) | 나중 저장이 앞선 처리를 덮지 않는다 | **부분 충족.** **불법 전이는 술어가 저장 시점에 다시 막는다**(`order.ts:350-351`). **재고 이중 반영은 멱등키 2개가 막는다.** 그러나 **합법 범위의 상태·메모는 last-write-wins 이고, 전체 치환이라 이력까지 덮인다**(BE-071 §7.7) |
| **동시 처리(주문 화면 ↔ 배송 화면)** | 두 화면이 같은 주문을 밀어도 어긋나지 않는다 | **부분 충족** — 배송 축이 `orderShipmentBlock` 으로 **주문 가드를 먼저 통과**하므로(`shipment.ts:419-420`) 불법 전이는 없다. 그러나 **같은 PUT 을 두 화면이 전체 치환으로** 내므로 `shippedQuantity` 와 `status` 가 서로를 덮을 수 있다(BE-071 §7.9) |
| **연타(더블클릭)** | 정확히 1개 요청 | **미충족**(EXC-08 gap). 재고 이중 반영은 막히나 **처리 이력이 두 줄 늘어난다** |
| 세션 만료 중 처리 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 메모를 버린다(EXC-19 gap) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **BE-071 §2 의 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다** |
| **재고 적용기 미배선** | 조용히 성공하지 않는다 | **충족** — `applyStockMovements` 가 `false` 면 **멱등키를 찍지 않고** 이동도 기록하지 않는다(`data-source.ts:50,55` · `stock.ts:102-107`). 회귀 `orders.test.ts:373` |
| **주문 조회기 미배선(다른 도메인)** | '없다'와 '모른다'를 가른다 | **충족** — `orderCatalog()` 가 `null` 을 준다(빈 배열이 아니다 — `order-ref.ts:71-74`). 회귀 `orders.test.ts:510` |
| 결제(PG) 미사용 | 빈 결과와 구분해 알린다 | **충족** — 전용 안내와 두 링크(결제 설정 · 상품 문의)를 낸다(`OrderListPage.tsx:219-235`). 판정을 `checkoutCta` 에 위임해 MID 공란도 잡는다 |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 재고 · 금액 무결성 · 감사

이 화면은 **창고의 실물 재고**와 **이미 돈이 오간 거래의 금액**을 동시에 건드린다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 재고는 주문당 정확히 한 번만 차감된다 | **충족(도메인 가드)** — `stockAppliedAt` 이 멱등 키이고 `shouldDeductStock` 이 그것을 요구한다(`order.ts:448`). `withStockApplied` 는 이미 찍혔으면 **같은 객체를 그대로 반환**한다(`:504`). 회귀 `orders.test.ts:308,581`. **단 그 값이 요청 바디에 실려 있어 위조 가능하다**(BE-071 §7.7) |
| 재고는 취소당 정확히 한 번만 복원된다 | **충족(도메인 가드)** — `stockRestoredAt` 이 멱등 키다(`:456,529`). 회귀 `orders.test.ts:324,596`. **같은 위조 위험** |
| **복원량이 차감량과 어긋나지 않는다** | **충족 — 구조적으로 보장한다.** `planOrderRestore` 가 품목이 아니라 **기록된 출고 이동만 뒤집는다**(`order.ts:486-487`). 주문서를 사후 정정해도 되돌린 양이 실제로 나간 양과 같다(BE-071 §7.4). 회귀 `orders.test.ts:324` |
| 차감 시점이 한 곳에서만 결정된다 | **충족** — `shouldDeductStock(order, readStockDeductAt())` 하나이며 화면도 어댑터도 조건을 다시 쓰지 않는다(`data-source.ts:11-12,53`). **단 설정을 바꾸는 화면이 없고**(FS-071 §7 #1) 값이 프로세스 지역 변수라 새로고침하면 기본값으로 되돌아간다 |
| **어떤 규칙에서 차감됐는지 알 수 있다** | **불가.** 차감 시점 설정은 주문에 저장되지 않고(`_shared/store.ts:36-37` — 그것이 옳다) 화면은 **렌더 시점의 현재 설정**을 보인다(`OrderDetailPage.tsx:355-361`). 설정을 바꾸면 이미 차감된 주문의 문구도 새 이름을 말한다(BE-071 §7.15 #2) |
| **재고보다 많이 팔린 주문의 차감이 거절된다** | **미충족.** 이 도메인에 **차감 전 재고 검사가 없다** — `shouldDeductStock` 은 재고 수량을 보지 않는다(`order.ts:443-450`). `applyMovements` 가 `Math.max(0, …)` 로 음수를 0 으로 깎아(`stock.ts:75`) 실사 불일치의 신호가 사라진다. **심이 요구하는 422(재고 부족 거절)를 내는 코드가 프론트에 없다**(BE-071 §7.12) |
| 취소는 배송 전에만 걸린다 | **충족** — `orderCancelBlock` 이 `hasLeftWarehouse` 로 막고(`order.ts:323`) **저장 시점에 다시 막는다**(`:382-383`). 회귀 `orders.test.ts:199,218`. **클레임의 취소 가드가 같은 함수를 읽어** 두 화면이 같은 답을 한다(`claims/types.ts:256`) |
| **취소된 주문의 재고 복원 소유권이 하나다** | **충족** — 주문이 소유하고 클레임은 취소 건에 재고를 움직이지 않는다(BE-044 §7.4 · `claims/types.ts:342-344`). **둘 다 복원하면 같은 수량이 두 번 돌아온다** |
| **클레임 완료가 주문 취소를 보장하는가** | **미충족 — 잇는 계약이 없다.** 두 사건은 서로 다른 두 번의 조작이라 **'취소 클레임은 완료됐는데 주문은 취소되지 않은' 상태**가 만들어질 수 있고, 그때 **재고는 영원히 돌아오지 않는다**(BE-071 §7.8 · BE-044 §7.12 #9) |
| 금액이 한 곳에서만 계산된다 | **충족(예외 1건)** — `orderAmounts`(`order.ts:169-175`) 하나이며 목록(`types.ts:175-177`)과 상세(`OrderDetailPage.tsx:297`)가 같은 함수를 읽는다. **총액을 저장하지 않아** 항목과 총액이 어긋난 주문서가 남지 않는다. **예외**: 적립 예정액을 상세가 직접 `reduce` 한다(`:468`) — 같은 값이 `amounts.point` 에 이미 있다 |
| 금액이 상품 수정에 흔들리지 않는다 | **충족** — `productName`·`optionLabel`·`unitPrice`·`pointRate`·`couponName` 이 **주문 시점 스냅숏**이다(`order.ts:100-116,138-139`). 화면이 그 사실을 사용자에게도 말한다(`OrderDetailPage.tsx:444-447`) |
| 총액이 음수가 되지 않는다 | **충족** — `Math.max(0, …)`(`order.ts:173`). 회귀 `orders.test.ts:246`. 할인·적립금이 상품금액을 넘겨도 돈을 돌려주지는 않는다 |
| 금액·수량에 상한이 있다 | **미충족** — `unitPrice`·`quantity` 에 검증이 없고 `orderAmounts` 도 안전 정수 검사를 하지 않는다. 고객 채널이 만든 값이라 지금은 표면이 없지만 백엔드가 붙으면 신뢰 경계가 생긴다(BE-071 §7.15 #16) |
| 처리 이력은 append-only — 수정·삭제되지 않는다 | **구조적으로 미보장.** 클라이언트가 `history` 배열을 **치환 PUT** 한다(`order.ts:267`) — 조작된 클라이언트는 과거 이력을 지울 수 있다. **이 도메인에서 이력이 곧 원장이라** 지워지면 '왜 취소됐나'에 답할 근거가 사라진다(BE-071 §7.7) |
| 상태와 이력이 갈라지지 않는다 | **충족** — 전이·입금·취소·재고가 전부 `withEvent` 로 **한 함수에서 함께** 움직인다(`order.ts:340-343`). 회귀 `orders.test.ts:182`. 이력 id 에 시각+종류를 넣어 같은 밀리초 충돌을 막는다(`:341`) |
| 이동 이력이 append-only 다 | **구조적으로 미보장** — `stockMovements` 도 치환 PUT 이다. **더 나쁜 것은 `planOrderRestore` 가 그 배열을 그대로 뒤집는다는 점**이다 — 가짜 출고를 심고 취소하면 임의 수량 입고가 만들어진다(BE-071 §7.7 #3) |
| 이동 시각·차감 시각은 서버 시각이다 | **미충족(픽스처 한정)** — 어댑터의 `new Date().toISOString()`(`data-source.ts:46`) · 화면의 `new Date()`(`OrderDetailPage.tsx:210,238` · `OrderListPage.tsx:179`). **화면이 만든 시각이 저장된다** — 클라이언트 시계가 틀리면 이력의 시간축이 틀어진다 |
| 이동 id 는 충돌하지 않는다 | **충족(현재)** — `mv-<at>-out-<line.id>`(`order.ts:467`)에 품목 id 가 들어가 같은 저장 안에서 겹치지 않는다. **다만 `at` 이 요청 바디로 오면** 같은 밀리초의 두 요청이 같은 id 를 만든다 |
| 저장과 부수효과는 원자적이다 | **충족(픽스처)** — 복원·차감이 `patch` 안에서 한 덩이다(`data-source.ts:44-59,74`). 백엔드 계약도 이를 요구한다(BE-071 §7.5). **단 심 주석이 그것을 요구할 뿐 서버가 없다** |
| 일괄 처리가 부분 적용을 만들지 않는다 | **의도된 부분 적용이다** — 트랜잭션 경계가 **주문 1건**이고 실패한 건만 실패한다(BE-071 §7.10). **그것이 옳다** — N건을 한 트랜잭션으로 묶으면 1건의 재고 부족이 29건의 정상 처리를 막는다 |
| 주문이 삭제되어도 참조가 살아 있다 | **표면 없음(현재)** — 삭제 API·UI 가 없다(BE-071 §7.2). 생기면 클레임·적립 원장·통계의 `orderNo` 가 고아가 된다 |
| **다른 도메인이 보는 주문 상태가 최신이다** | **미충족** — `listOrderRefs()` 가 어댑터가 아니라 `ORDER_SEED` 를 읽는다(`data-source.ts:91`). **방금 옮긴 상태·취소가 클레임의 취소 가드에 반영되지 않는다.** 코드가 그 한계를 스스로 적었다(`:85-88`) |
| **적립 예정액이 언제 지급이 되는가** | **미정** — 화면은 '적립 예정 N원'을 보이는데 그것을 원장에 얹는 사건이 이 앱 어디에도 없다. 구매확정이 방아쇠인지 별도 정산인지 계약이 없다(BE-071 §7.15 #9) |
| 개인정보 노출 기준이 하나다 | **미충족 — 앱 안에 두 벌이다.** 이 화면은 주문자 전화·이메일·수령인 전화·배송지 전체를 **평문 그대로** 보이는데(`OrderDetailPage.tsx:423-438`) 클레임은 신청자를 `'김**'` 으로 마스킹해 든다(`claims/data-source.ts:50`). **목록 응답에도 수령인 전문이 실린다**(BE-071 §7.13) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | EXC-04 · EXC-06 | P0 · P1 | 409 해소 UI 없음(`onError` 에 status 분기 0건) · `If-Match`/`version` 없음 → **전체 치환 + last-write-wins** 라 메모 저장이 상대의 상태 전이를 이력까지 되돌린다. **배송 화면이 같은 레코드의 두 번째 필자**라 위험이 배가된다. 403/409/422/429/5xx 를 한 배너로 뭉갬 | 이 화면 + BE 계약 | **UI 기획 · 백엔드 명세 (우선)** (BE-071 §7.15 #4·#6 · FS-071 §7 #11) |
| 2 | EXC-08 | P0 | `submitLockRef`·멱등키 없음 — `crud.ts` 의 `idempotencyKey` 자리와 원장이 있는데 호출부가 비어 있다. **일괄 전이는 N건을 병렬로** 내 창이 N배다. 재고 이중 반영은 멱등키가 막지만 **처리 이력이 두 줄 늘어난다** | 이 화면 + 프론트 | 프론트 구현 · 백엔드 명세 (BE-071 §7.15 #3 · FS-071 §7 #4) |
| 3 | IA-02 | P0 | sub-route 에서 AppHeader `<h1>주문</h1>` + 상세 자체 `<h1>주문 상세</h1>` → **`<h1>` 2개.** 어느 쪽도 주문번호를 식별하지 못한다 | **앱 전역**(`AppHeader` 모델 — 상세 화면 다수가 같은 결함) | 프론트 구현 · UI 기획 (FS-071 §7 #2) |
| 4 | IA-04 · ERP-15 · ERP-03 · ERP-04 · COMP-07 | P0 · P1 · P2 | 페이지네이션 없음 — 전량 렌더 + 행마다 금액 재계산. 정렬 변경·sticky thead·순번 오프셋이 함께 붙어야 한다. **URL list state 는 이미 있어**(`useListState`) `page`·`sort` 를 쓰기만 하면 된다 | 이 화면 + 공용 + BE 계약 | UI 기획 · 백엔드 명세 (BE-071 §7.13 · FS-071 §7 #6) |
| 5 | FEEDBACK-06 · A11Y-13 | P0 · P1 | 취소 모달이 편집 필드를 담는데 **네 이탈 경로 어디에도 dirty 가드가 없고**, 열릴 때 그 필드에 포커스도 가지 않는다. 완화: `cancelReason` 이 페이지 state 라 재오픈 시 값이 남는다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 6 | EXC-07 · EXC-10 | P1 | 서버 422 의 `error.fields` 를 필드 인라인으로 되돌리는 경로가 없다(`violations` 소비 0건). 일괄 부분 실패가 **어느 주문이 왜** 실패했는지 말하지 않고 retry 가 실패 건만 타깃하지 않는다 | 이 화면 + BE 계약 | UI 기획 · 프론트 구현 (BE-071 §7.15 #6·#14 · FS-071 §7 #7) |
| 7 | (§4.3) | — | **재고·이력 무결성** — `stockAppliedAt`·`stockRestoredAt`·`stockMovements`·`history`·`payment.paidAt`·`lines[]` 가 요청 바디에 있어 위조 가능. **`planOrderRestore` 가 요청으로 온 이동 배열을 그대로 뒤집으므로 가짜 출고를 심으면 임의 수량 입고가 만들어진다** — 이 화면에서 가장 직접적인 재고 조작 경로다 | 이 화면 + BE 계약 | **백엔드 명세 (BE-071 §7.7 — 최우선)** · UI 기획 |
| 8 | (§4.3) | — | **차감 전 재고 검사가 없다** — `shouldDeductStock` 이 수량을 보지 않고 `applyMovements` 가 음수를 0 으로 깎아 실사 불일치 신호가 사라진다. 심이 요구하는 422 를 내는 코드가 없다 | 이 화면 + BE 계약 | **백엔드 명세 (BE-071 §7.12)** · 프론트 구현 |
| 9 | (§4.3) | — | **취소 클레임 완료와 주문 취소를 잇는 계약이 없다** — 클레임만 완료되면 재고가 영원히 돌아오지 않는다. BE-044 §7.12 #9 와 같은 미결이다 | **아키텍처 (선행)** · 두 계약 연동 | 백엔드 명세 (BE-071 §7.8) |
| 10 | (§4.3 · FS-071 §7 #1) | — | **재고 차감 시점 설정을 바꾸는 화면이 없다** — 모델·선택지·저장 함수가 전부 있는데 소비처가 테스트뿐이고, 값이 프로세스 지역 변수라 새로고침하면 되돌아간다. **어떤 규칙에서 차감됐는지도 데이터에 없다** | 화면 신설 + BE 계약 | **UI 기획 (최우선)** · 백엔드 명세 (BE-071 §7.15 #1·#2) |
| 11 | ERP-13 | P1 | **조사 폴백 리터럴이 5곳 이상** — `(으)로` · `을(를)`. 상태 라벨이 받침으로 갈리는 값이라 헬퍼가 실제로 필요한 자리다 | 이 화면 + 공용 | UI 기획 · 프론트 구현 |
| 12 | (§4.1) | — | 저장 성공 후 **상세를 두 번 재조회**한다 — `useCrudUpdate` 의 무효화(`crud.ts:358`)와 화면의 명시적 `refetch`(`:196`)가 겹친다. **저장 요청 크기에 상한이 없다**(이력에 비례) | 이 화면 + BE 계약 | 프론트 구현 (경미) · 백엔드 명세 |
| 13 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료 경고·draft snapshot 없음. **BE-071 §2 의 '서버 10초 < 프론트 상한' 이 성립하지 않는다** | **앱 전역** | 프론트 구현 · UI 기획 (FS-071 §7 #18) |
| 14 | EXC-18 | P1 | Shift-click 범위 선택과 키보드 등가물이 없다. 'all-matching-filter' 축도 없다(페이징 도입 시 갈린다) | 이 화면 + 공용 | UI 기획 |
| 15 | COMP-09 · COMP-12 · COMP-06 · ERP-07 | P2 | 주문자·주문번호 열 truncate 없음 · 상세 사유/메모에 `pre-wrap` 없음 · 상한 근접 경고 없음 · 상세 로딩이 스켈레톤이 아니라 문구 한 줄 · 금액의 '원'이 숫자에 붙어 자릿수 정렬을 흔든다 | 이 화면 | UI 기획 (#4 와 함께) (FS-071 §7 #10) |
| 16 | (§4.2 · §4.3) | — | **`listOrderRefs()` 가 시드를 읽어** 방금 옮긴 상태가 클레임의 취소 가드에 반영되지 않는다. **개인정보 마스킹 기준이 앱 안에 두 벌이다** | BE 계약 + 아키텍처 | 백엔드 명세 (BE-071 §7.15 #8·#13 · FS-071 §7 #15·#17) |
| 17 | (FS-071 §7 #3·#5·#8·#13·#16) | — | 주문이 가리키는 것들(상품·회원·쿠폰·클레임·배송)로 건너뛸 링크가 없다 · **단계 건너뛰기 허용 여부가 배송 축과 어긋난다** · 프로그램 이동('목록으로')이 이탈 가드 밖이다 · 적립 예정액을 상세가 직접 `reduce` 한다 · 재조회가 편집 중인 메모를 덮는다 | 이 화면 + 아키텍처 | UI 기획 · **아키텍처(#5 선행)** (BE-071 §7.15 #5·#11) |
| 18 | FEEDBACK-05(undo) | P2 | 비가역 액션에 undo window 도 snapshot 도 없다 — **잘못 누른 '배송완료'를 되돌릴 길이 데이터에도 UI 에도 없다**(상태는 역행 불가, 재고는 차감 완료) | 이 화면 + BE 계약 | 백엔드 명세 · 아키텍처 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`orderAdapter` 는 `scope: ORDER_RESOURCE`(`data-source.ts:66`)이고 `ORDER_RESOURCE = 'orders'`(`:29`)다. `createCrudAdapter` 가 5개 op 를 제공하나 **화면이 실제로 부르는 것은 3개**다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll`(`crud.ts:100`) | `?fail=list` · `?fail=orders:list` · `?fail=all` | FS-071-EL-018 |
| `detail` | `fetchOne`(`crud.ts:105`) | `?fail=detail` · `?fail=orders:detail` · `?fail=all` | FS-071-EL-049 |
| `save` | `update`(`crud.ts:135`) | `?fail=save` · `?fail=orders:save` · `?fail=all` | FS-071-EL-029(단건) · **EL-019 다이얼로그 배너**(일괄) |
| `save` | `create`(`crud.ts:121`) — **호출부 0건** | — | 같은 op 이지만 등록 진입점이 없다(BE-071 §7.2) |
| `delete` | `remove`(`crud.ts:156`) — **호출부 0건** | — | **`?fail=delete` 는 이 화면에서 아무 효과가 없다**(삭제 진입점 부재) |

> **⚠ scope 가 배송 화면과 공유된다.** 배송 처리 화면이 **같은 `orderAdapter`** 로 주문을 쓰므로(`shipments/ShipmentListPage.tsx:59`) `?fail=orders:save` 는 **두 화면의 주문 저장을 동시에** 실패시킨다. 배송 화면 고유의 실패를 재현하려면 그쪽 어댑터 scope 를 써야 한다.

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그·재조회 없이 generic 배너면 gap**(현재 gap) |
| EXC-06 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| EXC-07 (422 표시 자리) | `?status=save:422` — **필드 인라인 오류 없이 고정 문구면 gap**(현재 gap). 대비: 다이얼로그를 열어 둔 채 상태가 바뀌면 **클라이언트 술어**가 던진 사유는 배너에 뜬다(`OrderDetailPage.tsx:228`) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Forders&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 배너에 `오류 코드 TDS-…` 가 보이면 pass. **`?fail=save` 로는 재현되지 않는다** — generic `Error` 에는 `reference` 가 없어 `referenceOf` 가 null 을 준다(정확한 동작) |
| FEEDBACK-02 (다이얼로그 유지) | `?fail=save` → 상세에서 '진행' 또는 목록에서 일괄 처리. **다이얼로그가 남고 그 안에 사유가 뜨며 확인 버튼이 되살아나면 pass**(현재 pass) |
| EXC-10 (일괄 부분 실패) | **`?status=` 로는 전건 실패만 재현된다** — op 단위 스위치라 건별로 갈 수 없다. 부분 실패는 **픽스처 조작**(적격이지만 저장 시점에 술어가 던지는 주문)으로 만든다 |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/orders` 의 `update` 를 끄면 체크박스 열·SelectionBar·전이/취소 버튼·'메모 저장'이 전부 사라져야 한다(현재 pass) |
| EXC-21 (엔타이틀먼트) | **`?status=` 가 아니라 플랜**으로 재현한다 — `commerce.orders` 를 내리면 `/orders` 가지 전체가 잠기거나 사라진다. 판정은 `RequireEntitlement` 소유 |
| EXC-22 (결제 설정 축) | **`?status=` 가 아니라 결제 설정**으로 재현한다 — PG 를 끄거나 상점 ID 를 비우면 빈 상태가 EL-017 ①분기로 갈린다 |

**미배선 seam 의 재현**: 재고 적용기·주문 조회기는 `resetStockApplier()`·`resetOrderLookup()` 으로 미배선 상태를 만들 수 있다. **앱에서는 `src/wiring.ts:142,222` 가 전부 꽂으므로 브라우저에서 재현되지 않는다** — 이 경로의 방어선은 단위 테스트다(`orders.test.ts:373,510`).

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-02 · A11Y-11 · A11Y-12 · MOTION-03 · ERP-13 · EXC-04 · EXC-08 · EXC-14 판정 — 전부 2026-07-22 실측) · RTL(A11Y-11 의 describedby↔alert id 일치) · **`orders.test.ts` 42케이스**(순수 규칙 + 어댑터 경계의 부수효과 — 전이 거절 7건 · **버튼과 저장의 술어 등가** · 상태·이력 동시 이동 · 입금 확인 멱등 · 취소 가드 · 금액 계산 5건 · 차감 시점 6건 · 재고 산술 3건 · 부분배송 · 필터/검색/집계 7건 · 검증 2건 · 조회기 4건 · **어댑터의 실제 재고 이동 5건**을 고정한다). **이 화면에 렌더 테스트(`*.test.tsx`)는 없다** — DOM 수준 판정(A11Y-11 · FEEDBACK-06 · EXC-03)은 코드 대조로만 확인했다.

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수**를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **FEEDBACK-06 은 완화 요인(값이 페이지 state 라 재오픈 시 복원)까지 측정 절차에 넣었다**
- [x] 모든 `N/A` 에 사유를 댔다(IA-05 — `/orders/new`·`/orders/:id/edit` 라우트 부재를 `App.tsx:306-317` 전수로 확인)
- [x] §2.1 산수 검산 — **14 pass + 11 종속 + 1 n-a + 5 gap = 31** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`·`shared/ui`·`shared/permissions`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1) — **`FilterPanel` 을 쓰는 A11Y-12 가 그 예다**
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·기간 필터·Pagination range·optimistic)은 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. **이 화면 고유 축(일괄 전이 N건 병렬 · 요청 크기가 이력에 비례)에 별도 예산 줄을 세웠다**
- [x] §4.3 을 **재고·금액 무결성 · 감사** 축으로 썼다 — 멱등키 2개 · 복원의 구조적 보장 · 차감 시점 · 이력 append-only · 소유 경계(클레임)까지 24행으로 전수했다
- [x] §6 의 `?fail=` scope(`orders`)와 op 를 **어댑터 코드에서 확인**했고(`create`·`delete` 가 호출부 0건이라 무효임 포함), **`?delay=` 를 쓰지 않았다**(이 리포에 존재하지 않음). **scope 가 배송 화면과 공유된다는 사실**도 코드로 확인해 적었다
- [x] §5 의 gap 이 FS-071 §7 · BE-071 §7.15 와 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가(백엔드 없음)'로 남겼고, **E2E 를 돌리지 않았음과 이 화면에 렌더 테스트가 없음**을 §1·§6 에 명시했다. DS 소유 표면(Modal 초기 포커스·퇴장 애니메이션)은 `종속` 으로 남기고 단정하지 않았다
