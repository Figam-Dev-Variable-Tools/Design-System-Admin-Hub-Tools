---
id: NFR-044
title: "취소/교환/반품 비기능 명세"
functionalSpec: FS-044
backendSpec: BE-044
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 2.0
date: 2026-07-22
---

# NFR-044. 취소/교환/반품 비기능 명세

> ## 개정 이력 — v2.0 (2026-07-22): 판정 대상이 **늘어난 화면**으로 바뀌었다
>
> v1.0 은 `/products/returns`(교환/반품)를 **P0 30건** 기준으로 판정했다. 화면이 `/orders/claims` 로 이사하면서
> 판정 대상 표면이 늘었고, quality-bar 도 **P0 31건**이 됐다(EXC-21 신설). 전수를 다시 매겼다.
>
> | 무엇이 | v1.0 | v2.0 |
> |---|---|---|
> | 기준 | P0 30건 | **P0 31건** — `EXC-21`(거절 4계열 분리)이 늘었다. 이 화면은 `commerce.orders` 모듈에 속하므로 **판정 대상이다**(적용 `상속`) |
> | 목록 표면 | 손으로 조립한 표 | **`CrudReadListShell`** — 상주 live region(A11Y-16 잔여 해소) · 껍데기 소유 스켈레톤 · 읽기 권한 기반 행 활성화가 함께 들어왔다 |
> | 비가역 액션 | 재고 이동 1종, **게이트 없음**(v1.0 FEEDBACK-02 gap) | **재고 이동 + 환불 완료 2종**, `ConfirmDialog` 게이트가 **생겼다**. 그러나 **확인 즉시 닫혀** 실패 유지·재시도 계약을 만족하지 못한다 → **여전히 gap, 사유가 바뀌었다** |
> | 상태 전이 | 규칙 없음(§4.3 '완료를 되돌리면 재고도 되돌아간다' 미충족) | **가드가 생겼다** — 역행 자체가 막히므로 그 항이 해소됐다. 대신 **철회 조건**이라는 새 항이 섰다 |
> | 무결성 축 | 재고 하나 | **재고 + 환불 금액 + 적립금 원장** 셋(§4.3). 원장은 append-only 라 되돌릴 수 없어 가장 무겁다 |
> | 422 표시 | 교환 옵션 필드로 인라인(EXC-07 pass) | **교환에서만 pass** — 취소·반품에는 그 필드가 없어 **422 가 어디에도 뜨지 않는다** → EXC-07 **pass → gap** |
>
> **뒤집힌 판정 3건**: FEEDBACK-02(gap → gap, **사유 교체**) · EXC-07(pass → **gap**) · A11Y-16(gap → **pass**).
> **판정 기준일 2026-07-22 · E2E 미실행 — 근거는 코드 대조다**(§6).

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-044 취소/교환/반품 (`/orders/claims` · `/orders/claims/:id`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 102요구(**P0 31건**). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-044(요소·예외) · BE-044(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-044 §7 · BE-044 §7.12 와 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-22. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 개정으로 뒤집힌 판정 | **3건.** FEEDBACK-02 는 gap 그대로이나 **사유가 바뀌었다**(게이트 부재 → 게이트는 섰으나 실패 유지 미충족). **EXC-07 은 pass → gap**(422 표시 경로가 교환에만 있다). **A11Y-16 은 gap → pass**(껍데기의 상주 live region) |

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

**세 개의 원장을 동시에 움직이는 화면이다.** 완료 처리는 상품 SKU 재고를 실제로 증감시키고(`data-source.ts:319-340`), 환불 완료는 **적립금 원장에 지급 1건을 덧붙이며**(`:351-377`), 그 둘 다 멱등키가 못 박아 되돌릴 수 없다. **적립금 원장이 특히 무겁다 — append-only 라 잘못 얹은 지급은 지울 수도 없다**(`point-ledger.ts:15-18`). 그래서 이 화면의 P0 판정은 **비가역 액션의 게이트(FEEDBACK-02)** · **중복 제출(EXC-08)** · **동시성(EXC-04)** 에서 다른 목록 화면보다 무겁게 읽어야 하고, **실패를 사용자에게 말하지 못하는 경로(EXC-07)** 는 그 자체로 무결성 위험이다.

동시에 이 화면은 **`useRouteWritePermissions` 를 배선한 소수 화면 중 하나**라 EXC-03 을 통과하고, **전이 가드가 화면과 저장소에서 같은 함수로 도는** 드문 화면이라 v1.0 이 gap 으로 잡던 상태 정합 문제 대부분이 해소됐다.

## 2. P0 31건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 개의 data view 가 전부 `{first-load, refetching-with-data, empty, error}` 중 하나만 그린다.** ① **목록**: `ClaimsListPage.tsx:128` 이 `firstLoading = isFetching && data === undefined` 를 파생해 껍데기에 넘기고(`:179-180`), 껍데기가 그 값만 스켈레톤(`CrudReadListShell.tsx:126`)·요약(`:119`)에 쓴다. **busy 는 `refreshing` 으로 분리**돼(`:118,120`) 재조회 중에도 이전 행이 유지된다 — `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:298`)가 뒷받침한다. ② **상세**: `claim === undefined`(`ClaimDetailPage.tsx:343`) ③ **옵션 조회**: `variants === undefined`(`:494`) ④ **error 분기가 항상 앞선다**(`:300`) | `/orders/claims` 진입 → 데이터 렌더 확인 → 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 세 read 실패가 전부 인라인 danger `Alert` + 명시적 복구 컨트롤이다. **목록**(`CrudReadListShell.tsx:154-161`) '클레임 목록을 불러오지 못했습니다.' + '다시 시도'. **상세**(`ClaimDetailPage.tsx:300-323`) 404 → '클레임을 찾을 수 없습니다…' + '목록으로' / 그 밖 → '클레임을 불러오지 못했습니다.' + **'다시 시도'** + '목록으로'. **옵션 조회**(`:479-493`) 같은 404/일반 분기. read 실패에 toast 를 쓰지 않고(`toast` 소비는 저장 성공 1곳 — `:257`), empty 로 폴백하지 않는다 | 각 조회를 `?fail=list` · `?fail=detail` 로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **페이지네이션이 없고**(껍데기가 `visibleItems` 전량을 DS Table 에 넘긴다) ② **행 선택이 없다** — `CrudReadListShell` 이 `canRemove={false}` 로 선택 열 자체를 없앤다(`CrudReadListShell.tsx:146` → `CrudTable.tsx:190,276-289`). 따라서 'page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다 — 이 칸의 N/A 가 그것을 면제하지 않는다 | 페이지네이션이 도입되면 이 판정을 다시 매긴다. `useListState` 는 `clampPage` 를 이미 갖고 있어 배선만 하면 된다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/orders/claims/**` 에 primitive tier 밖 hex · `[0-9]+px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 실측 2026-07-22). 파생 치수는 `calc(${cssVar('space.6')} * 5)`(`ClaimsListPage.tsx:110`) · `* 8`(`RefundSection.tsx:58`) 같은 space 토큰 배수로만 표현한다. `box-shadow` 선언 0건 | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/orders/claims` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면이 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`DetailCellLink` · 상세 '목록으로' `:331` · 주문 링크 `:391`) · DS `<Button>`·`<SelectField>`·`<TextareaField>`·`<SearchField>`·`<TextField>`·`<Checkbox>`. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: DS Table 스켈레톤 펄스 · Toast(`:257`) · DS `<Button>` transition · `ConfirmDialog` 3종(재고·환불·이탈 가드)의 Modal. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건 — 히트 3건은 전부 `transitionBlock` 식별자다) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>` **최대 5개**(요청 정보 · 교환 · 환불 · 재고 이력 · 로딩) · Toast · Modal 3종. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 상세 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`ClaimDetailPage.tsx:340`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다 — 값을 손으로 재현하지 않는다. 카드 제목은 `CardTitle`(`<h2>`). **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/orders/claims/:id` 의 '클레임 처리' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `ClaimsListPage.tsx:138-144` 가 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드한다. 그 props 가 `onCompositionStart/End` + `onKeyDown` 을 실어 ① 조합 중에는 커밋하지 않고 ② 조합 종료 후 **250ms 디바운스**로 커밋하며 ③ **조합 중 Enter 를 가로챈다**. 순서 뒤바뀐 응답은 이 화면에 없다 — 검색이 클라이언트 필터라 요청 자체가 나가지 않는다(`:130-134`) | `/orders/claims` 검색창에 IME 로 '루미엔' 입력. **조합 중 '루ㅁ'·'루미' 같은 부분 문자열이 필터에 커밋되지 않아야 pass.** 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **부분 충족 — 게이트는 섰으나 실패 계약이 성립하지 않는다.** **좋아진 것**: v1.0 의 '확인 다이얼로그가 아예 없다'는 해소됐다. 비가역 액션 **둘 다** `ConfirmDialog intent="update"` 로 게이팅된다 — 재고 반영(`ClaimDetailPage.tsx:555-569`, 조건 `willMoveStock` `:241`)과 환불 완료(`:572-586`). 되돌릴 수 있는 저장(진행·반려·메모)은 묻지 않아 확인이 무뎌지지 않는다. '취소'는 진행 중 요청을 abort 한다(`:565,582`) — 요구의 '중간닫기=abort' 절은 **충족**. **미충족**: 요구의 '**강제실패 시 dialog 유지 + retry**' 가 성립하지 않는다 — `submit()` 이 시작 즉시 `setConfirmStock(false)`·`setConfirmRefund(false)` 를 부르므로(`:245-246`) 다이얼로그는 **확인을 누른 순간 언마운트된다.** `busy={saving}` 과 `{...(serverError !== null && { error: serverError })}`(`:561-562,578-579`)가 배선돼 있으나 **도달하지 않는 죽은 prop 이다.** 실패는 카드 배너로만 가고, **422 는 취소·반품에서 아무 데도 가지 않는다**(EXC-07) | 상세에서 상태를 '완료'로 바꾸고 `?fail=save` 로 강제 실패 후 '처리 저장' → '재고 반영' 클릭. **다이얼로그가 즉시 닫히고 카드 배너만 뜨면 gap**(현재 그렇다). 환불 완료도 동일. `?status=save:422` 를 반품 클레임에서 걸면 **아무 표시도 뜨지 않는 것**까지 확인 | **gap** |
| FEEDBACK-04 | FEEDBACK | 직접 | `ClaimDetailPage.tsx:213` 이 `useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `dirty` 는 RHF `isDirty` 가 아니라 **도메인 판정 5축**(`:205-212` — 상태·메모·교환 옵션·반품배송비·쿠폰 복원)이며 계약상 등가다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다. 저장 성공 시 상세가 재조회돼 `useEffect([claim, policyFee])`(`:170-180`)가 값들을 원본으로 되돌려 dirty 가 풀린다 | 상세에서 메모 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** **주의 1**: '목록으로' 버튼은 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-044 §7 #7 로 별도 이관). **주의 2**: 배송 정책이 캐시에 있으면 **아무것도 만지지 않아도** dirty 가 참이 돼 가드가 뜬다(FS-044 §7 #9) — 그것은 요구 위반이 아니라 dirty 판정의 문제다 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 처리·환불 폼은 modal 이 아니라 상세 라우트의 `Card` 로 렌더된다(`:349-549`). modal 3개(재고 반영·환불 완료·이탈 가드)는 전부 **입력 필드가 없는 확인 다이얼로그**다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success(...)`(`:257`) — 문구 4종(재고 반영 여부 2 + 환불 접수·완료 2)이 호출부에서 갈린다(`:287,295`). 지속 live region 은 `ToastProvider` 가 소유한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 **3개**: 재고 반영 · 환불 완료 · 이탈 가드. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 세 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 5개를 전수 확인했다.** ① **교환 옵션 select** — `ExchangeOptionField.tsx:89-91` 이 `isInvalid`·`aria-invalid={invalid}`·`aria-describedby={invalid ? errorIdOf('claim-exchange-option') : undefined}` 를 **짝으로** 세우고, 감싸는 `FormField htmlFor="claim-exchange-option" … required error={error}`(`:78-84`)가 같은 id 의 `role="alert"` 를 렌더한다. `required` 는 자식이 DS `SelectField` 라 `aria-required` 가 런타임 주입된다. ② **처리 상태 select**(`ClaimDetailPage.tsx:417-432`) — 오류 상태가 없어 짝 요구가 발생하지 않는다. ③ **처리 메모 textarea** — `TextareaField` 가 내부 배선. ④ **반품배송비 `TextField`**(`RefundSection.tsx:138-147`) — DS 가 `aria-invalid`+`aria-describedby={id}-error`+`role="alert"` 를 내부에서 짝으로 세운다(`packages/ui/src/atoms/TextField/TextField.tsx:122-123,149`). ⑤ **쿠폰 복원 `Checkbox`** — 오류 상태가 없다. **짝 없는 `aria-invalid` 0건**(grep 실측: 이 디렉터리 히트 1건 = `ExchangeOptionField.tsx:90`, 바로 다음 줄이 describedby) | `grep -rn "aria-invalid" apps/admin/src/pages/orders/claims` → 각 히트마다 같은 요소에 `aria-describedby` 가 있는지 확인. RTL 로 교환 클레임에서 옵션을 비운 채 상태를 '완료'로 바꿔 `select.getAttribute('aria-describedby') === screen.getByRole('alert').id` 와 `aria-required === 'true'` 를 assert. **경미 잔여**: `ExchangeOptionField.tsx:83` 의 `hint` 가 유효 상태에서 `hintIdOf` 로 연결되지 않는다(§5 #10) | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 2개**다(`ClaimsListPage.tsx:145-171`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current`·`aria-pressed` grep **0건**(실측) | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 **3개**(재고 반영 · 환불 완료 · 이탈 가드). enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다(grep 0건). **잔여 — 애니메이션되는 닫힘은 Modal 소유 3경로(Esc·딤·×)뿐이고 footer 버튼은 즉시 언마운트**인데, **이 화면의 세 다이얼로그가 전부 그 잔여에 해당한다**: 확인 버튼은 호출부 콜백 직행이고(`onConfirm`), 취소 버튼도 `onCancel` 이 상태를 내린다. 실제로 퇴장을 타는 경로는 Esc·딤뿐이다 | DS Modal 판정에 종속 | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트(`:257`). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: DS Table 스켈레톤 펄스 · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **요구가 명시적으로 지목한 `ToggleSwitch` 는 이 화면에 없다**(grep 0건 실측) — 상속하는 게이트는 Toast·Modal 둘이다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 두 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:311-312`). **두 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록의 최상위는 껍데기의 `columnStyle`(`CrudReadListShell.tsx:28-33`), 상세는 평범한 `<div style={pageStyle}>`(`ClaimDetailPage.tsx:328`)다. **옛 경로 2건은 `<Navigate replace>`** 로 같은 셸 안에서 흡수된다(`App.tsx:315-316`) | 두 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인. `/products/returns` 가 `/orders/claims` 로 대체되는지도 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족.** `findCoveringLeaf` 덕에 브랜치 폴백은 없다 — `/orders/claims/:id` 는 자기를 감싸는 잎 `/orders/claims`(`nav-config.ts:170`)를 찾아 AppHeader 가 `<h1>취소/교환/반품</h1>` 을 그린다. '주문 관리'로 떨어지지 않는다. **그러나 상세가 자체 `<h1>클레임 처리</h1>` 를 또 그린다**(`ClaimDetailPage.tsx:340`) → **`<h1>` 이 2개**다. 게다가 목록은 in-content `<h1>` 이 없어 **title 소스 모델이 화면 타입마다 모순**이고, 두 h1 이 서로 다른 것을 말한다(하나는 메뉴 이름, 하나는 행위). 요구가 정의하는 '단일 page-header/title 모델'이 성립하지 않으며 **어느 쪽도 주문번호를 식별하지 못한다** | `/orders/claims/:id` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록은 1개(정상) — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·필터(`:136-173`) → 결과 count 요약(`CrudReadListShell.tsx:118-121`) → table(`:124`). 우상단 primary 등록 버튼이 없는 것은 **정당한 N/A** — 클레임 생성이 범위 밖이다(BE-044 §7.6). SelectionBar 도 정당한 N/A(일괄 액션 없음). **미충족: Pagination 이 없다.** 껍데기가 `visibleItems` 전량을 DS Table 에 넘기며 페이지네이션 컴포넌트가 없다. 클레임은 상한 없이 매일 쌓이는 컬렉션이라 'page size 초과 가능'이 확실하다(BE-044 §7.9) | 픽스처를 20건 이상으로 늘리고 `/orders/claims` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 클레임 생성이 범위 밖이고 처리는 `/new`·`/:id/edit` 폼이 아니라 상세 라우트 안의 카드에서 일어난다. `App.tsx:311-312` 가 라우트 2개(목록·상세)뿐임을 보인다 | 이 화면에 폼 라우트가 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | 직접 | 유형·상태·검색어의 **단일 원천이 URL 쿼리스트링**이다. `:114` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { kind: 'all', status: 'all' }` — `:56`), 그 훅이 `useSearchParams` 로 `?kind=`·`?status=`·`?q=` 를 읽고 쓴다. 기본값과 같은 값은 URL 에서 지워지고 갱신은 `replace: true` 라 검색어 한 줄에 history 가 쌓이지 않는다. 손으로 고친 값은 `parseFilter`(`:115-124`)가 되돌린다. 결과: 필터를 걸고 상세에 들어갔다 Back 하면 조건이 복원되고, 필터 걸린 view 를 링크로 공유할 수 있으며 F5 도 같다. **`sort`·`page` 는 정렬 UI·페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | `/orders/claims` 에서 유형='취소' + 상태='접수' + 검색='ORD-2026' 적용 → URL 이 `?kind=cancel&status=requested&q=ORD-2026` 인지 확인 → 행 클릭으로 상세 진입 → 브라우저 Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary` + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로>` 로 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `notifySessionExpired()` → `SessionExpiryWatcher`. **이 화면의 조회 3종·저장이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 목록을 401 시켜 `/login?returnUrl=%2Forders%2Fclaims&reason=session_expired` 로 이동하는지 확인. (미저장 처리 내용 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **충족.** ① **read 게이팅(상속)**: `RequirePermission` 이 AppShell `<Outlet>` 을 감싸 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/orders/claims/:id` 같은 하위 라우트까지 덮는다(`findCoveringLeaf` — 제목과 **같은 규칙**). ② **write 게이팅(직접)**: `ClaimDetailPage.tsx:134` 가 `const { canUpdate } = useRouteWritePermissions()` 를 구독하고 그 값이 쓰기 표면 **전부**를 지배한다 — 상태 select(`:421`) · 메모(`:439`) · 교환 옵션(`optionLocked` `:190,506`) · **환불 카드 전체**(`disabled={saving \|\| !canUpdate}` `:525` → 차감 입력·쿠폰 체크박스·접수·완료 버튼) · **'처리 저장' 미렌더**(`:453`) · 안내 배너(`:444-446`). ③ **강등 reconcile**: 권한 스토어가 바뀌면 훅 구독자가 재렌더되므로 별도 코드 없이 버튼이 사라진다. ④ **목록**: 쓰기 컨트롤이 아예 없고, **행 클릭은 `detail` 목적지라 `canUpdate` 와 무관하게 read 로 게이팅된다**(`CrudTable.tsx:306`) — 조회 전용 역할이 상세로 가는 길을 잃지 않는다 | 권한 스토어에서 `page:/orders/claims` 의 `update` 를 끈 뒤 `/orders/claims/:id` 진입. **'처리 저장'과 환불 버튼이 죽고 '이 클레임을 처리할 권한이 없습니다. 조회만 가능합니다.' 배너가 뜨면 pass.** `read` 를 끄면 403 화면이 뜨는지도 확인. **잔여(이 요구의 gap 은 아니다)**: 서버 403 이 오면 일반 배너로 뭉개진다 — EXC-06 P1 사안(§3) | **pass** |
| EXC-04 | EXC | 직접 | **미충족.** ① **유령 저장은 해소됐다** — 어댑터가 공용 `createCrudAdapter` 라 없는 id 에 **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** 를 던진다(`crud.ts:144-146`). ② **그러나 화면에 409 해소 UI 가 없다** — `onError`(`:262-273`)에 `isUnprocessable` 분기만 있고 `isConflict` 분기가 없다(grep 0건). 409 는 `setServerError(cause.message)` 로 떨어져 **재시도하면 또 409 인 실패에 '다시 시도'를 권한다.** ③ **낙관적 동시성 토큰이 없다** — `Claim` 에 `version`/`updatedAt` 이 없고(`types.ts:163-196`, grep 0건) `update` 가 `If-Match` 를 보내지 않는다. 현 409 는 **'존재 여부' 기반**이므로 **동시 편집은 last-write-wins** 다. ④ **다만 v1.0 보다 나아진 것**: 전이 가드가 저장 시점에 다시 돌므로 **불법 전이는 422 로 막힌다**(`data-source.ts:272-296`) — 두 운영자가 각각 '반려'와 '완료'를 저장하면 나중 것이 종료 상태 위에 오다가 `CLAIM_TRANSITION_TERMINAL` 로 거절된다. **부수효과 이중 실행은 멱등키 2개가 막는다** — 그 구분을 흐리지 말 것 | `?status=save:409` 로 상세에서 '처리 저장'. **conflict 다이얼로그 없이 일반 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/orders/claims` → 0건으로 확인(실측 0건) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `submit`(`:243-276`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다**(grep 0건 실측) — 이 화면이 `useCrudForm` 을 쓰지 않고 저수준 `useCrudUpdate` 를 직접 부르기 때문이다. **자리는 이미 비어 있다**: `UpdateVars.idempotencyKey`(`crud.ts:345`)와 어댑터 원장(`crud.ts:67-89,137,139`)이 존재하는데 `update.mutate({ id, input, signal })`(`:252-254`)가 키를 넣지 않아 **원장이 영원히 발현되지 않는다.** 방어는 버튼 `disabled` + DS `loading` 하나뿐이고, **환불 접수 버튼은 확인 다이얼로그조차 거치지 않아 창이 더 넓다**(`RefundSection.tsx:181-187`). **완화 요인 셋**: (a) 버튼이 `type="submit"` 이 아니라 `onClick` 이라 창이 좁다 (b) **재고 이중 이동은 `stockAppliedAt` 이 막는다** (c) **적립금 이중 복원은 `refund.completedAt` 이 막는다**(`claims.test.ts:817-826`). **그러나 상태·메모·환불 상태 저장은 두 번 적용되고**, 요구가 명시한 두 장치는 부재다 | 상세에서 '처리 저장'·'환불 접수'를 최대한 빠르게 2회 클릭(또는 네트워크 스로틀). **요청이 2건 발사되면 gap.** `grep -rn "submitLock\|idempotencyKey" apps/admin/src/pages/orders/claims` = 0건으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | **네 지점이 배선돼 있다.** ① **onError** — `if (isAbort(cause)) return;`(`:263`)로 abort 를 실패로 처리하지 않는다. ② **onSuccess** — `if (controller.signal.aborted) return;`(`:256`)로 취소된 요청의 성공 콜백이 토스트·재조회를 일으키지 않는다. ③ **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:162`). ④ **다이얼로그 취소** — `onCancel` 이 `controllerRef.current?.abort()` 를 부른다(`:565,582`). 공유 predicate `isAbort`(`shared/async`)를 쓴다 — 로컬 판정을 재발명하지 않는다. bulk 표면이 없어 '실패 count 제외' 절은 무관하다 | 상세에서 저장 중(400ms 창) '목록으로' 클릭 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 저장 성공 토스트도 뜨지 않아야 한다 | **pass** |
| EXC-21 | EXC | 상속 | **이 화면은 판정 대상이나 거절 UI 를 소유하지 않는다.** 이 라우트는 `commerce.orders` 모듈에 속한다(`shared/entitlements/module-resources.ts:31-36` — `group:/orders` · `page:/orders` · `page:/orders/shipments` · `page:/orders/claims` 가 한 묶음이다. 주문 없이 배송이나 환불만 파는 계약은 없다). 잠금(`locked` — 상위 플랜에 있음, 사이드바에 자물쇠 꼬리표) · 숨김(`absent`) · 허용(`granted`)의 판정은 `entitlementStateForResource`(`route-entitlement.ts:23`)가 하고, 화면 대체는 AppShell 의 `RequireEntitlement` 가 `<Outlet>` 바깥에서 한다(`AppShell.tsx:407-411`). **이 화면 안에 403 문구도 업그레이드 안내도 없다**(grep: 이 디렉터리에 `entitlement` 0건) — 한 화면에 두 계열이 섞일 표면 자체가 없다 | 플랜에서 `commerce.orders` 를 내리고 `/orders/claims` 진입. **잠금/숨김 화면이 뜨고 그 문구에 403 계열 표현이 섞이지 않으면 pass**(판정은 `RequireEntitlement` 소유 문서). 이 화면에서는 자체 거절 UI 가 0건임만 확인 | **종속** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 · STATE-02 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 · **EXC-21** |
| `n-a` | **4** | STATE-04 · FEEDBACK-06 · A11Y-12 · IA-05 |
| `gap` | **5** | FEEDBACK-02 · IA-02 · IA-04 · EXC-04 · EXC-08 |
| **합계** | **31** | 11 + 11 + 4 + 5 = **31** ✓ |

> **P0 gap 5건 — quality-bar '배치 실패' 사유.** 건수는 v1.0 과 같지만 **내용이 바뀌었다**:
>
> - **FEEDBACK-02 는 사유가 교체됐다.** '게이트가 없다' → '게이트는 섰으나 확인 즉시 닫혀 실패를 다이얼로그에서 되받지 못한다'. **후자가 더 고치기 쉽다**(닫는 시점을 성공 콜백으로 옮기면 된다) — 그러나 **취소·반품에서 실패가 아예 보이지 않는 EXC-07 gap 과 겹치면** 운영자는 '눌렀는데 아무 일도 없다'를 겪는다. 이 둘은 **한 배치로** 고쳐야 한다.
> - **IA-02 · IA-04** 는 앱 전역의 같은 뿌리(sub-route h1 이중 · 목록 페이징 부재)를 공유하므로 **횡단 배치**로 푸는 것이 옳다.
> - **EXC-04 · EXC-08 은 이 화면 고유이며 전부 동시성에 걸린다** — v1.0 보다 위험이 커졌다. 이제 저장이 **적립금 원장**까지 움직이기 때문이다(§1.2).
>
> **v1.0 대비 해소된 것(참고)**: 상태 전이 규칙 부재(§4.3) · 목록 live region 부재(A11Y-16) · 비가역 액션 게이트 전무(FEEDBACK-02 의 절반).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·페이지네이션 range·토글 필터·optimistic write)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:298`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. **가벼운 refetch 인디케이터도 생겼다** — 껍데기가 요약에 `· 새로고침 중…`을 덧붙이고 `aria-busy={refreshing}` 을 건다(`CrudReadListShell.tsx:118-121`). v1.0 의 '시각 표현 없음' 잔여가 해소됐다 | 데이터가 있는 상태의 재조회에서 이전 행이 유지되고 요약에 새로고침 표시가 뜨는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`CrudTable.tsx:377-390`) — 검색 0건/필터 0건/진짜 0건 3분기 + 복구 액션('검색 지우기'/'필터 초기화')이 맥락(`hasQuery`·`hasActiveFilters`)에서 파생된다. 조사(이/가)는 `Empty` 가 받침으로 고른다. `createVerb="접수"` 로 '접수된 클레임이 없습니다'가 된다. **생성 CTA 를 주지 않는 것은 정당하다**(BE-044 §7.6). **같은 결이 상세에도 있다** — 재고 이력 빈 상태가 취소/그 밖으로 갈려 '없는 일'과 '안 한 일'을 구분한다(FS-044-EL-048.1) | 검색어로 0건 → '조건에 맞는 …' + 검색 지우기, 필터로 0건 → '필터에 맞는 …' + 필터 초기화가 나오는지 | **pass** |
| STATE-06 | P1 | 저장 성공 시 `useCrudUpdate` 가 목록·상세를 정확히 무효화하고(`crud.ts:356-358`) 화면이 상세를, **교환이면 옵션까지** 재조회한다(`:257-260`) — 재고가 움직였으면 선택지의 재고 수치도 즉시 되맞는다. **v1.0 의 '재고가 안 움직인 저장에도 상품을 재조회한다' 과잉이 해소됐다** — 조건이 `needsVariants`(교환 여부)로 좁혀졌다 | 상세에서 상태 변경 후 목록 복귀 시 배지가 갱신돼 있는지. 완료 처리 후 교환 옵션의 재고 수치가 갱신되는지 | **pass** |
| COMP-01 | P1 | 모든 버튼이 DS `<Button>` 이고 진행 상태를 **`loading` prop** 으로 표현한다(`:456`) — 손으로 쓴 '저장 중…' 라벨이 없다. `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/orders/claims` = **0건**. 주문번호·주문 링크는 `<Link className="tds-ui-link tds-ui-focusable">` — 링크는 버튼이 아니므로 요구 밖이다. 상세 '목록으로'만 `<button>` + 로컬 스타일인데(`:329-337`) **이것은 아이콘+텍스트 back affordance 라 DS Button 이 아닌 것이 의도**다 | `grep -n "buttonStyle(\|tds-ui-btn-" -r apps/admin/src/pages/orders/claims` → 0건 | **pass** |
| COMP-06 | P2 | **스켈레톤이 DS Table 소유로 올라갔다** — 화면·껍데기가 행 수·셀 수를 손으로 세지 않는다(`CrudTable.tsx:373` 이 `loading` 만 넘긴다). v1.0 의 `SKELETON_ROWS = 5` 하드코딩이 사라졌다. **다만 DS 가 정한 행 수가 PAGE_SIZE 와 맞는지는 페이지네이션이 없어 판정할 기준값 자체가 없다**(IA-04 gap 과 연동) | 페이지네이션 도입 후 스켈레톤 행 수 === PAGE_SIZE 인지 | **pass(기준값 부재)** |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`CrudTable.tsx:332`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다**(전량 렌더라 index+1 이 곧 전역 순번). IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다. **소유가 공용 `CrudTable` 로 옮겨가 이 화면 단독으로는 고칠 수 없다** | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재 · 공용)** |
| COMP-08 | P2 | **중복 '상세' 버튼이 없다.** 현 구조는 요구가 정의한 (a) 형태 그대로다: whole-row 클릭(`ROW_TARGET` `kind:'detail'`) + **row 내 접근 가능한 링크 하나**(주문번호 `DetailCellLink`, 접근 이름 `'<주문번호> 클레임 상세'`). `DetailCellLink` 는 그 판단을 이름으로 못 박은 컴포넌트다(`DetailCellLink.tsx:13-17` — 2026-07-21 에 이 링크를 지웠다가 키보드 경로를 잃은 실측 사고 기록) | 읽기전용 리스트에 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 상품명(`ClaimsListPage.tsx:81`)·사유(`:84`) 셀에 truncate 가 없다. 긴 값이 열을 넓혀 표 레이아웃을 민다. **완화 — 껍데기가 가로 스크롤 컨테이너를 갖는다**(`CrudReadListShell.tsx:36-39,123`)라 페이지 본문이 가로로 밀리지는 않는다. 그래도 열 폭 자체는 늘어난다 | 200자 상품명 픽스처로 표 폭이 유지되는지 | **gap(완화됨)** |
| COMP-12 | P2 | 처리 메모가 `TextareaField` 의 `N/500` 실시간 카운터를 갖는다(`:438`). **그러나 상한 근접 경고가 없고, 네이티브 `maxLength` 가 입력을 잘라 '조용히 멈춘' 것처럼 보인다** — 요구가 지적하는 바로 그 증상. 조합형 한글의 counting 기준(`value.length` = UTF-16 code unit)도 명시되지 않았다 | 500자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 대체로 일치한다: read 실패=인라인 Alert · write 성공=toast(`:257`) · write 실패=카드 배너(`:355-364`) · 422=그 입력의 인라인 오류(`:265-268`). write 실패가 toast 가 아니라 배너인 것은 폼 맥락(입력을 보존한 채 그 자리에서 재시도)이라 `FormServerError` 와 같은 결이며 이탈로 보지 않는다. **그러나 취소·반품의 422 는 어느 자리에도 가지 않는다** — 배치가 아니라 부재다(EXC-07) | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지. **반품 클레임에서 422 를 걸었을 때 아무 자리도 없는지** | **gap(422 자리 부재)** |
| FEEDBACK-03 | P1 | 저장 성공(toast — 재고 반영·환불 접수·완료로 문구 분기) · 실패(배너 + 참조 코드) 경로가 배선돼 있다(`:255-274`). no-op 클릭이 없다 — 위반이면 버튼이 잠기고(`:458`) 클릭 자체가 `return` 한다(`:244`). **다만 취소·반품 422 는 가시 실패가 없다**(EXC-07) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass(422 경로 제외)** |
| FEEDBACK-05 | P2 | 비가역 액션 **둘 다 확인 게이트를 얻었다**(FEEDBACK-02) — v1.0 의 '단일 클릭 비가역'은 해소됐다. **그러나 undo window 도 snapshot 도 없다**: 재고 이동은 `stockAppliedAt` 이 잠가 복원 경로가 없고(BE-044 §7.12 #19 가 역이동 계약 부재를 이관), 적립금 복원은 append-only 라 원리상 되돌릴 수 없다. **삭제는 이 화면에 없으므로 요구의 delete 절은 걸리지 않는다** | 비가역 액션이 confirm 또는 undo window 를 갖는지 → confirm 은 있다, undo 는 없다 | **pass(confirm) · gap(undo)** |
| A11Y-03 | P1 | ConfirmDialog 표면 3개(재고·환불·이탈 가드). 초기 포커스(update intent → Confirm / discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-08 | P1 | **충족.** 행 클릭이 DS Table 소유(마우스 전용 — `<tr>` 에 tabIndex 없음)이고, **행 안에 같은 목적지의 focusable name link 가 있다** — 주문번호 `DetailCellLink`(`ClaimsListPage.tsx:71-75`). `:64-66` 주석이 그 의도를 명시한다. 요구가 기대하는 형태 그대로다 | 행을 Tab 해서 주문번호 링크에 도달하고 Enter 로 상세가 열리는지 | **pass** |
| A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스가 없고, 저장 실패(422) 시 그 필드로 포커스가 이동하지 않는다 — `useCrudForm` 의 `setFocus` 경로를 상속하지 못한다. 422 는 `setFieldError` 로 문구만 꽂는다(`:266`). **취소·반품에서는 그 문구조차 없다**(EXC-07) | 옵션을 비운 채 상태를 '완료'로 → activeElement 가 교환 옵션 select 인지 | **gap** |
| A11Y-16 | P1 | **v1.0 의 잔여가 해소됐다.** 목록에 **항상 마운트된 polite live region** 이 생겼다(`CrudReadListShell.tsx:109-112`) — 문장이 3분기라(`announcementOf` `:73-83`) 필터로 0행이 되는 전환도 announce 된다. 그 밖의 계약도 만족한다: 표 caption(권한을 따라 '조회 전용입니다.') · 필터 `aria-label`(`:149,163`) · 링크 접근 이름 · 스텝퍼 `<ol aria-label>` + `aria-current="step"` + 장식 `aria-hidden`(`Stepper.tsx:21-38`) · 재고 미리보기 `aria-live="polite"`(`ExchangeOptionField.tsx:110`) · 이동 이력 caption(`StockMovementTable.tsx:54-56`) · 입고/출고를 **색이 아니라 `StatusBadge` 라벨**로 이중 인코딩. **새 잔여**: 환불 계산 내역(EL-037·EL-038)이 차감 입력·쿠폰 체크박스에 따라 즉시 다시 계산되는데 **live region 이 없다** — 시각 사용자만 총액이 바뀌는 것을 본다 | 필터를 걸어 0행으로 만들 때 스크린리더가 사유를 읽는지(pass). 반품배송비를 바꿀 때 '실제 환불액' 변경이 announce 되는지(현재 안 된다 — §5 #10) | **pass(경미 잔여)** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:101-116`(`STATUS_META`·`statusLabel`·`statusMeta`) · `:60-68`(`KIND_TONE`) · `refund.ts:36-50`(`REFUND_META`). per-page meta helper 를 만들지 않았고 목록·상세·스텝퍼·배지가 같은 함수를 소비한다. **`Record` 로 키를 다 적어 유형·상태가 늘면 컴파일이 막는다**(`types.ts:59` 주석). 다만 그 레지스트리가 `pages/orders/claims` 지역이라 앱 전역 레지스트리는 아니다 | 모든 domain status 가 정의된 tone 으로 해석되는지 | **pass(도메인 내)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을 경유한다. 재고 이동 이력의 시각은 `formatDateTime`(`StockMovementTable.tsx:91`), 환불 완료 시각도 같다(`RefundSection.tsx:166`). **잔여**: 접수일이 포맷 함수를 거치지 않는다(ERP-08) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-07 | P2 | 금액이 전부 `` `${formatNumber(n)}원` `` 형태로 **숫자와 단위를 한 문자열로 잇는다**(`RefundSection.tsx:121,123,128,134`). 정의 목록(`dd`)과 우측 정렬 총액이라 다행 금액 컬럼의 자릿수 정렬이 깨질 표면은 없고, **총액에는 `tabular-nums` 가 붙어 있다**(`:48-52`). 이동 이력의 수량은 `+N개`/`−N개` 를 우측 정렬 + `tabular-nums` 로 그린다(`StockMovementTable.tsx:34-39`) | 다행 금액 컬럼의 시각 확인 — 이 화면에 그 표면이 없다 | **pass(표면 경미)** |
| ERP-08 | P2 | 수량·금액이 `formatNumber`, 시각이 `formatDateTime` 을 경유한다. **접수일(`ClaimsListPage.tsx:85` · `ClaimDetailPage.tsx:414`)만 `requestedAt` 문자열을 포맷 함수 없이 그대로 렌더하고 `tabular-nums` 도 없다** — 같은 화면의 이력 표는 둘 다 쓴다. 값이 'YYYY-MM-DD' 가 아니면 그대로 새어 나온다. **상세 사유에 `pre-wrap` 이 없어 고객이 쓴 줄바꿈이 한 문단으로 뭉치는 것**도 같은 계열이다 | 셀의 raw 문자열 렌더가 0건인지 | **gap(경미)** |
| ERP-09 | P2 | 이 화면의 시각 표면 둘 — 재고 이동 시각과 환불 완료 시각 — 이 전부 `formatDateTime` 을 경유한다. `shared/format.ts` 가 정본이며 **UTC 정오 앵커 + KST 고정**으로 수렴돼 있다. 접수일은 날짜(`YYYY-MM-DD`)라 TZ 계약이 걸리지 않는다. `stockAppliedAt`·`refund.completedAt` 생성은 어댑터의 `new Date().toISOString()`(`data-source.ts:331,355`) — 픽스처 전용이며 백엔드가 붙으면 서버 시각이 된다(BE-044 §7.3) | UTC ISO 입력이 러너 OS 타임존과 무관하게 같은 wall-clock 을 렌더하는지 | **pass(상속)** |
| ERP-13 | P1 | 이 화면의 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(grep `이(가)`·`을(를)`·`은(는)`·`(으)로` = 0 실측). 빈 상태의 조사는 `Empty` 가 받침으로 고르고, 이름을 interpolate 하는 문자열은 확인 다이얼로그 2개(`'<상품명>' N개의 재고가…`·`<쿠폰명> 복원`)뿐인데 **조사를 붙이지 않는 구문**이라 폴백이 필요 없다 | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — cap·virtualization 이 없다. 클레임은 상한 없이 증가하는 컬렉션이라(BE-044 §7.9) 1,000건이면 1,000행이 DOM 에 올라간다. **완화 둘**: 검색이 디바운스돼(COMP-10) 자모마다 전량 스캔이 일어나지 않고, **가로 scroll 컨테이너가 생겨**(`CrudReadListShell.tsx:36-39`) 10열 표가 페이지를 밀지 않는다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트·다이얼로그 취소에서만 발생한다. **이 화면에서 특히 문제다** — BE-044 §2 가 저장 상한을 10초로 잡으므로 '서버 상한 < 프론트 상한' 관계를 만들 프론트 쪽이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. 이 화면은 **404 와 422 를 실제로 분기한다** — 404 → 재시도 없는 not-found(`:307,483`), 422 → 필드 인라인(`:265-268`). **그러나 403/409/429/5xx 를 같은 배너로 뭉갠다**(`:269-272`) — `isForbidden`·`isConflict` 가 존재하는데 쓰지 않는다(grep 0건 실측). 403 은 재시도 수단을 주면 안 되고 409 는 재시도하면 또 409 다. **다만 v1.0 보다 나아진 점**: 배너 문구가 `isHttpError(cause) ? cause.message : 기본문구` 라 **서버가 준 사유가 그대로 보인다** — 원장 미배선 500 의 '적립금 원장에 연결되지 않아 환불을 완료하지 못했습니다.' 같은 문장이 화면에 도달한다 | `?status=save:403` · `save:409` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **미충족 — v1.0 의 pass 가 뒤집혔다.** 서버 422 의 `violations` 를 읽는 코드는 그대로 있다(`if (isUnprocessable(cause) && isHttpError(cause)) setFieldError(cause.violations[0]?.message ?? cause.message)` — `:265-268`). **그런데 그 값을 그리는 곳이 교환 옵션 필드 하나뿐이다**(`exchangeFieldError` → `ExchangeOptionField` `error` — `:235-237,507`), 그리고 그 필드는 **`isExchange` 에서만 렌더된다**(`:472`). 화면이 만드는 422 는 다섯 필드로 온다(`status`·`refundStatus`·`returnShippingFee`·`optionValues`·`exchangeOptionValues` — `data-source.ts:265-295,326-328`). 따라서 **취소·반품 클레임에서 422 가 오면 배너도 토스트도 인라인도 없이 버튼만 다시 활성화된다.** 실제로 도달 가능한 경로가 있다 — 상태 select 를 '완료'로 바꿔 두고 저장하지 않은 채 '환불 완료 처리'를 누르면 버튼은 열려 있는데(드래프트 상태로 판정) 저장은 저장된 상태를 보내 `REFUND_CLAIM_INCOMPLETE` 422 로 거절된다(FS-044 §7 #3). **잔여 셋**: (a) `violations[0]` 만 읽어 다중 위반을 버린다 (b) 포커스를 옮기지 않는다(A11Y-13) (c) 400 `error.fields` 경로가 없다 | 반품 클레임(`clm-2`)에서 `?status=save:422` 로 '처리 저장' → **아무 표시도 나타나지 않으면 gap**(현재 그렇다). 교환 클레임(`clm-1`)에서 같은 조작 → 옵션 필드에 인라인 오류가 뜬다 | **gap** |
| EXC-10 | P1 | **표면이 없다** — bulk 작업이 이 화면에 없다(행 선택 부재) | — | **n-a** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다. **세 원장을 움직이는 화면이라 offline write 가 특히 위험하다** — 요청이 hang 하면 운영자는 재고가 움직였는지, 적립금이 복원됐는지 모른 채 다시 누른다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다 — 상세(`:300-323`): 404 → '클레임을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만 / 그 밖 → '클레임을 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 옵션 조회도 같은 분기(`:479-493`). 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던지고(`crud.ts:109-113` · `data-source.ts:411-415`) 화면이 `isNotFound` 로 읽는다. 무한 spinner 없음(`claim === undefined` 는 error 분기 뒤에 온다) | 없는 `:id`(`/orders/claims/nope`)로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 전부 비관적(pending 잠금 → 성공 후 재조회)이다. `onMutate`/`setQueryData` grep = 0건. **세 원장을 움직이는 write 라 optimistic 이 위험하다는 요구의 판단과 정확히 일치한다** | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-20 | P1 | **충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 를 보여준다** — `setErrorReference(referenceOf(cause))`(`:272`) → `오류 코드 {errorReference}`(`:359-361`). `HttpError.reference` 는 `TDS-<base36 시각>-<3자리 난수>`. raw stack/서버 body 노출 없음. `referenceOf` 는 `HttpError` 가 아니면 null 을 반환해 없는 코드를 지어내지 않는다 | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지 | **pass** |
| EXC-22 | P1 | **권한=fail-closed · 엔타이틀먼트=fail-open** 규약을 이 화면이 소비한다: 라우트 권한은 `RequirePermission` 이 막고, 엔타이틀먼트는 **매핑이 없는 화면을 granted 로 수렴시킨다**(`route-entitlement.ts:10-12` — `판정 실패가 기능 정지가 되면 안 된다`). 이 라우트는 매핑이 **있으므로**(`commerce.orders`) 그 fail-open 은 이 화면에 적용되지 않는다. **양방향 단위 테스트는 소유 모듈에 있다**(`route-entitlement.test.ts`) — 이 화면에는 없다 | 소유 문서 판정에 종속. 이 화면에서는 자체 판정 코드가 0건임만 확인 | **종속** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-044 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 옵션(SKU·재고) 응답 p95 | ≤ 400ms | 위와 동일. **교환 클레임에서만 발생하고 상세와 직렬이다**(`enabled: needsVariants` — `:145`) → 체감 p95 = 상세 + 옵션 ≈ 800ms. **취소·반품은 이 왕복이 없다** — v1.0 은 전 유형이 상품을 조회했다 |
| 처리 저장 p95 (일반) | ≤ 700ms | 위와 동일 |
| **처리 저장 p95 (완료 = 재고 트랜잭션)** | **≤ 2s** (BE-044 §2 서버 상한 10초 → 504) | **측정 불가.** 재고 락 + 다중 SKU 갱신 + 이력 기록이 한 트랜잭션이다 |
| **환불 완료 p95 (원장 기입 + 쿠폰 재발급)** | **≤ 2s** | **측정 불가.** 적립금 원장 append + (미구현) 쿠폰 발급이 같은 트랜잭션에 든다(BE-044 §7.2). **이 축이 이 화면의 병목이 될 것이다** |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 **건수에 선형 비례**(ERP-15 gap) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | **교환 2회**(상세 + 옵션 — `:257-260`) / **취소·반품 1회**(상세) + 무효화된 목록 1회 | **v1.0 의 과잉이 해소됐다** — 조건이 `needsVariants` 로 좁혀져 옵션이 없는 유형은 재조회하지 않는다. **다만 재고가 안 움직인 교환 저장(메모만 수정)에도 옵션을 재조회한다** — `movesStock` 로 더 좁힐 수 있다(§5 #14) |
| 주문 참조 조회 | 0 요청 | **동기 조회기다**(`findClaimOrder` → `orderCatalog()`) — 네트워크가 아니라 등록된 목록의 `Record` 색인이다. 상세 렌더당 1회 `useMemo`(`:182-185`) |
| 배송 정책 조회 | 0 요청 | **캐시 조회다**(`queryClient.getQueryData` — `wiring.ts:164-169`). 배송 정책 화면을 열지 않았으면 `null` 이라 정책 힌트가 '불러오지 못했습니다'로 뜬다 — **이것이 기본 상태다** |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 1회 | **충족(요청)** / **부분 충족(연산)** — 디바운스 250ms 가 자모당 스캔을 막으나, 커밋마다 전량을 `filter` 2회 + `search` 1회 훑는다(`:130-134`) |
| 저장 요청 크기 | ≤ 8KB | **미충족 — 상한이 없다.** `ClaimInput` 이 `stockMovements` 배열 전체와 `refund` 한 벌을 실어 보낸다. 실제로는 이동이 클레임당 최대 2건이라 작지만 **계약상 무한**이다. BE-044 §7.3 안 A 가 이를 상수로 만든다 |
| 메모리 | 목록 전량 + 상세 1건 + (교환이면) 옵션 목록 1건 | 전량 보유. 클레임은 상한 없이 증가(BE-044 §7.9) |
| 번들 | 이 화면 고유 코드 ≤ 25KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 전용 컴포넌트 3개(`ExchangeOptionField` 140행 · `RefundSection` 201행 · `StockMovementTable` 97행) + 도메인 2파일(`types.ts` 448행 · `refund.ts` 245행) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudReadListShell.tsx:154-161`). **툴바는 살아남는다** — 껍데기가 배너 바깥에 그린다 |
| 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 옵션 조회 실패 | 404 = 재시도 없음 / 5xx = 다시 시도 | **충족**(`:479-493`). 404 면 **교환 완료가 영원히 불가능**해진다(BE-044 §7.4 — 고아 클레임) |
| 주문 참조 조회 실패 | '모른다'와 '없다'를 구분해 알린다 | **부분 미충족** — 둘 다 `null` 이라 같은 문장이 뜬다('주문 정보를 확인할 수 없습니다.'). **취소는 그때 fail-closed 로 막히므로 안전 쪽으로 틀린다**(`types.ts:255`). 조회기가 던지면 삼키지 않고 올려보낸다(`order-ref.ts:71-74`) |
| 배송 정책 조회 실패 | 0 이 아니라 '모른다'로 알리고 직접 입력하게 한다 | **충족**(`RefundSection.tsx:149-151`). **0 으로 뭉개면 차감 없이 환불한 것처럼 보인다**(`shipping-policy.ts:17-20`) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass). **서버 문구를 그대로 보인다** — 원장 미배선 500 이 그 사유를 말한다 |
| 저장 실패(422 재고) | 그 입력의 인라인 오류 + 재고를 건드리지 않음 | **교환만 충족.** 재고 불변은 회귀가 고정한다(`claims.test.ts:706-725`). **취소·반품은 표시 자리가 없다**(EXC-07 gap) |
| 저장 실패(422 전이·환불) | 그 사유를 보인다 | **미충족** — `status`·`refundStatus`·`returnShippingFee` 위반은 그리는 자리가 없다(EXC-07 gap) |
| 저장 실패(409 동시 삭제) | conflict 다이얼로그 + 입력 보존 | **미충족** — 일반 배너로 뭉개진다(EXC-04 gap) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **단 서버 도달 여부는 보장하지 않는다** — 이 화면은 재고·적립금이 걸려 그 불확실성이 실질 위험이다(FS-044 §7 #12) |
| 확인 다이얼로그 중 실패 | 다이얼로그 유지 + 재시도 | **미충족** — 확인 즉시 닫힌다(FEEDBACK-02 gap) |
| 동시 처리(두 운영자) | 나중 저장이 앞선 처리를 덮지 않는다 | **부분 충족.** **불법 전이는 어댑터가 422 로 막는다**(전이 가드 재판정 — v1.0 에 없던 방어). **부수효과 이중 실행은 멱등키 2개가 막는다.** 그러나 **합법 범위의 상태·메모·환불 상태는 여전히 last-write-wins** 다(BE-044 §7.3) |
| **연타(더블클릭)** | 정확히 1개 요청 | **미충족**(EXC-08 gap). 재고·적립금 이중 반영은 막히나 상태·메모는 두 번 적용된다. **'환불 접수'는 확인 다이얼로그조차 없어 창이 가장 넓다** |
| 세션 만료 중 처리 | 재인증 후 작성 내용 복원 | **미충족** — 401 리다이렉트가 미저장 내용을 버린다(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역). **BE-044 §2 의 '서버 10초 < 프론트 상한' 관계가 성립하지 않는다** |
| 재고 적용기 미배선 | 조용히 성공하지 않는다 | **충족** — `applyStockMovements` 가 `false` 면 **멱등키를 찍지 않고** 이동도 기록하지 않는다(`data-source.ts:333`) |
| 적립 원장 미배선 | 조용히 성공하지 않는다 | **충족 — 더 강하게 막는다.** `appendPointRestore` 가 `false` 면 **500 으로 저장 전체를 거절**하고 멱등키를 찍지 않는다(`:363-368`). 회귀 `claims.test.ts:843-859` |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 재고 · 금액 · 원장 무결성 · 감사

이 화면은 **창고 실물 · 고객에게 돌려줄 돈 · 회원의 적립금**을 동시에 건드린다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 재고는 클레임당 정확히 한 번만 움직인다 | **충족(도메인 가드)** — `stockAppliedAt` 이 멱등 키다(`types.ts:189-190` · `data-source.ts:320`). 회귀 `claims.test.ts:746-755`. **단 그 값이 요청 바디에 실려 있어 위조 가능하다**(BE-044 §7.3) |
| **취소는 재고를 움직이지 않는다** | **충족** — `movesStock` 이 `kind !== 'cancel'` 을 요구한다(`types.ts:342-344`). 회귀 `claims.test.ts:475-479,778-788`. 복원 소유권은 주문에 있다(`canceledAt`·`stockRestoredAt`). **화면도 그 사실과 소유자를 말한다**(FS-044-EL-048.1) |
| **취소 클레임 완료가 주문 취소를 보장하는가** | **미충족 — 잇는 계약이 없다.** 두 사건은 서로 다른 두 번의 조작이라 **'클레임은 완료됐는데 주문은 취소되지 않은' 상태**가 만들어질 수 있고, 그때 **재고는 영원히 돌아오지 않는다**. 이 앱은 그것을 막지도 경고하지도 않는다(BE-044 §7.12 #9) |
| 적립금은 환불완료에서만, 한 번만 복원된다 | **충족(도메인 가드)** — 방아쇠는 `refund.status → completed` 하나이고 `refund.completedAt` 이 멱등 키다(`refund.ts:15-18,234-239`). 회귀 `claims.test.ts:378-423,817-826` |
| 적립 원장은 append-only — 과거 행을 고치지 않는다 | **충족(계약 수준)** — `appendPointRestore` 는 **양수 1건만** 받고 음수는 **던진다**(`point-ledger.ts:64-70`). 통로 자체가 없다. 회귀 `claims.test.ts:444-446` |
| 비회원 주문의 환불이 원장을 요구하지 않는다 | **충족** — `pointUsed > 0` 인데 `memberId === ''` 이면 환불 완료를 막고 이유를 말한다(`refund.ts:209`). 적립금을 쓰지 않은 비회원은 그대로 통과한다(`amount === 0` → `true`) |
| 환불액이 한 곳에서만 계산된다 | **충족** — `refundBreakdown` 하나(`refund.ts:135-144`). 화면은 결과만 그린다. **총액을 저장하지 않아** 항목과 총액이 어긋난 환불서가 남지 않는다 |
| 확정된 환불의 근거가 사후에 바뀌지 않는다 | **충족** — 완료 후 차감 입력이 잠기고(`RefundSection.tsx:106`) 어댑터도 422 로 막는다(`data-source.ts:288-295`). 회귀 `claims.test.ts:828-836` |
| 환불 근거 금액이 주문서 정정에 흔들리지 않는다 | **충족** — `paidAmount`·`pointUsed`·`couponDiscount` 가 **접수 시점 스냅숏**이다(`refund.ts:77-82`). **단 요청 바디에 있어 위조 가능하다**(BE-044 §7.3) |
| **쿠폰을 복원하면 그 할인을 회수한다** | **계산은 충족 · 실행은 미충족.** 회수는 `refundBreakdown` 이 정확히 한다(회귀 `claims.test.ts:260-269`). **그러나 재발급이 구현되지 않았다**(`data-source.ts:370-372` TODO) — 화면은 '쿠폰도 복원했습니다'라고 말하는데 대응 사건이 없다. **지금은 고객이 할인을 회수당하고 쿠폰도 못 받는 쪽으로 틀려 있다**(BE-044 §7.12 #10) |
| 반품배송비를 모를 때 0 으로 뭉개지 않는다 | **충족** — `defaultReturnFee` 가 `null` 을 그대로 올리고 화면이 입력을 비운 채 사실을 밝힌다. 회귀 `claims.test.ts:282-284,300-312` |
| 이동 이력은 append-only — 수정·삭제되지 않는다 | **구조적으로 미보장.** 클라이언트가 `stockMovements` 배열을 치환 PUT 한다 — 조작된 클라이언트는 과거 이동을 지울 수 있다(BE-044 §7.3) |
| 이동 시각·복원 시각은 서버 시각이다 | **미충족(픽스처 한정).** 어댑터의 `new Date().toISOString()`(`:331,355`) — 클라이언트 시각이 아니라 어댑터 시각이라 현재는 안전하나, 계약상 두 값이 요청 바디에 있다 |
| 이동 id 는 충돌하지 않는다 | **미충족.** `mv-${at}-in`/`mv-${at}-out`(`types.ts:398,410`) — 같은 밀리초의 두 요청이 같은 id 를 만든다 |
| 저장과 부수효과는 원자적이다 | **충족(픽스처)** — 전이 검사 → 재고 → 환불 복원이 `patch` 안에서 한 덩이(`data-source.ts:380-384`). 백엔드 계약도 이를 요구한다(BE-044 §7.2). **단 심 주석이 그것을 요구할 뿐 서버가 없다** |
| 재고를 음수로 만들지 않는다 | **충족하나 그것이 옳은지 미정** — `applyMovements` 가 `Math.max(0, …)` 로 깎는다(`stock.ts:75`). BE-044 §7.10 이 **서버는 이를 복제하지 않는다**고 판정한다(음수는 실사 불일치의 신호다) |
| **완료를 되돌리면 재고도 되돌아간다** | **요구가 성립하지 않게 바뀌었다.** 완료는 종료 상태라(`isTerminal`) **되돌릴 수 없다** — v1.0 의 '상태와 재고가 갈린다'는 전이 가드로 해소됐다. 철회도 재고 적용 후에는 막힌다(`types.ts:277`). **대신 역이동 계약 부재가 남는다**(잘못 누른 완료를 복구할 길이 없다 — BE-044 §7.12 #19) |
| 상품·주문이 지워져도 클레임은 처리 가능하다 | **미충족.** 어느 삭제도 미처리 클레임 참조를 검사하지 않는다 — 상품이 지워지면 교환·반품 완료가 영원히 422, 주문이 지워지면 취소가 영구 차단이다(BE-044 §7.4) |
| 실제 송금과 환불 기록이 함께 확정된다 | **미정** — 이 계약은 환불을 **기록**할 뿐 PG 취소를 트리거하지 않는다(BE-044 §7.7). 운영자가 다른 시스템에서 손으로 하고 메모에 적는다 |
| 환불 SLA(법정 3영업일)를 판정할 수 있다 | **불가.** `refund` 에 **접수 시각 필드가 없다** — 경과를 계산할 근거가 데이터에 없다(FS-044 §7.2 #20 · BE-044 §7.12 #20) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | FEEDBACK-02 · EXC-07 · FEEDBACK-01 | P0 · P1 | **비가역 액션의 실패가 사용자에게 도달하지 않는다.** ① 확인 다이얼로그가 `submit()` 시작 즉시 닫혀(`ClaimDetailPage.tsx:245-246`) '실패 유지 + 재시도' 계약이 깨진다 — `busy`·`error` prop 이 죽은 배선이다 ② **422 를 그리는 자리가 교환 옵션 필드 하나뿐이라** 취소·반품에서는 아무 표시도 없다. **둘이 겹쳐 '눌렀는데 아무 일도 없다'를 만든다** | 이 화면 | **UI 기획 · 프론트 구현 (최우선)** (FS-044 §7 #4·#13 · BE-044 §7.12 #6) |
| 2 | (FS-044 §7 #3) | — | **환불 완료 버튼의 잠금과 저장의 거절이 다른 술어를 읽는다** — 버튼은 드래프트 상태로, `saveRefund` 는 저장된 상태로 판정한다(`:291-297,530`). 이 앱이 세운 '같은 술어' 규약의 유일한 위반이며 **#1 이 삼키는 422 를 실제로 만들어 낸다**. 같은 이유로 환불 저장이 **편집 중인 메모·상태·교환 옵션을 함께 저장하지 않는다** | 이 화면 | **프론트 구현 (선행)** (BE-044 §7.12 #5) |
| 3 | IA-02 | P0 | sub-route 에서 AppHeader `<h1>취소/교환/반품</h1>` + 상세 자체 `<h1>클레임 처리</h1>` → **`<h1>` 2개.** 어느 쪽도 주문번호를 식별하지 못한다 | **앱 전역**(`AppHeader` 모델 — 상세 화면 다수가 같은 결함) | 프론트 구현 · UI 기획 (FS-044 §7 #6) |
| 4 | IA-04 · ERP-15 · COMP-07 | P0 · P1 · P2 | 페이지네이션 없음 — 전량 렌더. 클레임은 상한 없이 증가. 순번 오프셋이 함께 붙어야 하는데 **그 소유가 공용 `CrudTable` 로 옮겨가** 이 화면 단독으로는 못 고친다. **URL list state 는 이미 있어**(`useListState`) `page` 를 쓰기만 하면 된다 | 이 화면 + 공용 + BE 계약 | UI 기획 · 백엔드 명세 (BE-044 §7.9 · FS-044 §7 #2) |
| 5 | EXC-04 · EXC-06 | P0 · P1 | 409 해소 UI 없음(`onError` 에 `isConflict` 분기 부재) · If-Match/version 없음 → 합법 범위 편집은 last-write-wins. 403/409/429/5xx 를 한 배너로 뭉갬 | 이 화면 + BE 계약 | UI 기획 · 백엔드 명세 (BE-044 §7.12 #4 · FS-044 §7 #5·#14) |
| 6 | EXC-08 | P0 | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. **`crud.ts` 의 `idempotencyKey` 자리와 원장이 있는데 호출부가 비어 있다.** 부수효과 이중 실행은 멱등키 2개가 막지만 상태·메모·환불 상태는 두 번 적용된다. **'환불 접수'는 확인 게이트조차 없어 창이 가장 넓다** | 이 화면 | UI 기획 · 백엔드 명세 (BE-044 §7.12 #3 · FS-044 §7 #5) |
| 7 | (§4.3) | — | **금액·원장 무결성** — `stockAppliedAt`·`stockMovements`·`refund.completedAt`·`restoredPoint`·스냅숏 금액 3종이 요청 바디에 있어 위조 가능. **적립금 쪽이 더 위험하다**(append-only 라 되돌릴 수 없다). 이동 id 가 같은 ms 에 충돌 | 이 화면 + BE 계약 | **백엔드 명세 (BE-044 §7.3 — 최우선)** · UI 기획 |
| 8 | (§4.3) | — | **쿠폰 재발급 미구현** — 화면이 '쿠폰도 복원했습니다'라고 말하는데 대응 사건이 없다. 회수는 이미 하고 있어 **지금은 고객에게 불리한 쪽으로 틀려 있다** | 이 화면 + BE 계약 | **백엔드 명세 (BE-044 §7.12 #10)** · UI 기획 |
| 9 | (§4.3) | — | **취소 클레임 완료와 주문 취소를 잇는 계약이 없다** — 클레임만 완료되면 재고가 영원히 돌아오지 않는다. 상품·주문 삭제도 미처리 클레임을 검사하지 않는다 | **아키텍처 (선행)** · BE-042·주문 계약 연동 | 백엔드 명세 (BE-044 §7.4 · §7.12 #9·#14 · FS-044 §7 #8) |
| 10 | A11Y-13 · A11Y-16(잔여) · A11Y-11(잔여) | P1 | 폼 진입 첫 필드 포커스·422 시 그 필드로 포커스 이동 없음. `violations[0]` 만 읽어 다중 위반을 버린다. **환불 총액이 입력에 따라 다시 계산되는데 live region 이 없다** — 시각 사용자만 본다. `ExchangeOptionField.tsx:83` 의 `hint` 가 유효 상태에서 `hintIdOf` 로 연결되지 않는다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 11 | COMP-09 · ERP-08 | P2 | 상품명·사유 셀 truncate 없음(가로 스크롤 컨테이너가 완화한다). 접수일이 포맷 함수·`tabular-nums` 없이 raw 문자열. 상세 사유에 `pre-wrap` 없음 | 이 화면 | UI 기획 (#4 와 함께) (FS-044 §7 #10·#11) |
| 12 | COMP-12 | P2 | 처리 메모 상한 근접 경고 없음 · counting 기준 미정의 | 이 화면 | UI 기획 |
| 13 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건. **BE-044 §2 의 '서버 10초 < 프론트 상한' 이 성립하지 않는다** | **앱 전역** | 프론트 구현 · UI 기획 (FS-044 §7 #16) |
| 14 | (§4.1) | — | 재고가 움직이지 않는 교환 저장(메모만 수정)에도 옵션을 재조회한다 — `movesStock` 로 더 좁힐 수 있다 | 이 화면 | UI 기획 (경미) |
| 15 | (FS-044 §7 #7·#9·#15) | — | 이탈 가드가 `navigate()` 프로그램 이동('목록으로')을 가로채지 못한다 · **배송 정책 선주입이 '만지지 않았는데 미저장 변경'을 만든다** · 상세 재조회가 편집 중 입력을 덮는다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 16 | (BE-044 §7.12 #11) | — | **`create`/`remove` 가 공용 팩토리 때문에 실제로 동작한다** — 부재가 코드로 강제되지 않는다 | 이 화면 | UI 기획 쪽 변경 요청 |
| 17 | (§4.3) | — | **환불 SLA(법정 3영업일)를 판정할 근거가 없다** — `refund` 에 접수 시각 필드가 없다 | BE 계약 | 백엔드 명세 (BE-044 §7.12 #20) · UI 기획 |
| 18 | (BE-044 §7.7) | — | **실제 송금 경계 미정** — `refund.status = 'completed'` 가 PG 취소를 트리거하는지 계약이 없다 | **아키텍처 (선행)** · 백엔드 명세 |
| 19 | (FS-044 §7 #17) | — | **재고 역이동 계약 부재** — 잘못 누른 완료를 복구할 길이 없다(상태는 종료, 재고는 그대로) | 백엔드 명세 · 아키텍처 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-22. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`claimAdapter` 는 `SCOPE = 'claims'`(`data-source.ts:35`)로 `failIfRequested(SCOPE, op)` 를 부른다. `createCrudAdapter` 가 5개 op 를 제공하나 **화면이 실제로 부르는 것은 3개**다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll` (`crud.ts:100`) | `?fail=list` · `?fail=claims:list` · `?fail=all` | FS-044-EL-010 |
| `detail` | `fetchOne` (`crud.ts:105`) **+ `fetchClaimVariants`**(`data-source.ts:410`) | `?fail=detail` · `?fail=claims:detail` · `?fail=all` | FS-044-EL-050 **와** EL-031 **이 함께 실패한다** — 두 조회가 같은 op 를 공유한다 |
| `save` | `update` (`crud.ts:135`) | `?fail=save` · `?fail=claims:save` · `?fail=all` | FS-044-EL-014 |
| `delete` | `remove` (`crud.ts:156`) — **호출부 0건** | — | **`?fail=delete` 는 이 화면에서 아무 효과가 없다**(삭제 진입점 부재 — BE-044 §7.6) |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-98`) — `?fail=` 이 언제나 같은 generic `Error` 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 gap) |
| EXC-06 (403 강등) | `?status=save:403` — 배너가 권한 문구로 갈리지 않으면 gap(현재 gap) |
| **EXC-07 (422 표시 자리)** | **유형을 갈라 두 번 재현한다.** 교환(`clm-1`)에서 `?status=save:422` → 옵션 필드 인라인 오류(pass). **반품(`clm-2`)·취소(`clm-6`)에서 같은 조작 → 아무 표시도 없다(gap).** 이 대비가 이 판정의 핵심 증거다 |
| FEEDBACK-02 (다이얼로그 유지) | 상태를 '완료'로 → `?fail=save` → '처리 저장' → '재고 반영' 클릭. **다이얼로그가 즉시 사라지고 카드 배너만 남으면 gap**(현재 gap) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Forders%2Fclaims&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — `오류 코드 TDS-…` 가 보이면 pass(현재 pass). **`?fail=save` 로는 재현되지 않는다** — generic `Error` 에는 `reference` 가 없어 `referenceOf` 가 null 을 준다(정확한 동작) |
| EXC-03 (쓰기 게이팅) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/orders/claims` 의 `update` 를 끄면 '처리 저장'이 사라지고 환불 카드가 통째로 비활성돼야 한다(현재 pass) |
| EXC-21 (엔타이틀먼트) | **`?status=` 가 아니라 플랜**으로 재현한다 — `commerce.orders` 를 내리면 `/orders` 가지 전체가 잠기거나 사라진다. 판정은 `RequireEntitlement` 소유 |

**실제 `violations` 를 실은 422 의 재현**: `?status=save:422` 는 `violations` 가 **비어 있는** `HttpError` 를 던지므로(`dev.ts:93`) 화면이 `cause.violations[0]?.message ?? cause.message` 의 **폴백 경로**를 탄다. **실제 `violations` 는 어댑터가 던진다**(`data-source.ts:265-269`) — 다섯 필드 이름 전부를 밟으려면 픽스처 조작이 필요하다. 이 경로의 회귀 방어선은 e2e 가 아니라 **`claims.test.ts` 의 어댑터 단위 테스트**다(`:699-859`).

**미배선 seam 의 재현**: 다섯 조회기·적용기는 `reset*()` 로 미배선 상태를 만들 수 있다(`resetOrderLookup` · `resetVariantLookup` · `resetStockApplier` · `resetPointLedgerAppender` · `resetReturnFeeLookup`). **앱에서는 `src/wiring.ts` 가 전부 꽂으므로 브라우저에서 재현되지 않는다** — 이 경로의 방어선은 단위 테스트다(`claims.test.ts:295-313,425-453,843-859`).

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · A11Y-11 · A11Y-12 · MOTION-03 · ERP-13 · EXC-04 · EXC-08 판정 — 전부 2026-07-22 실측) · RTL(A11Y-11 의 describedby↔alert id 일치 · `aria-required` 주입) · **`claims.test.ts` 93케이스**(순수 규칙 `:130-606` + **어댑터 경계의 부수효과 `:615-860`** — 전이 거절·중복 반영 방지·422 롤백·취소 무이동·환불 복원 멱등·원장 미배선 거절을 전부 고정한다. **이 화면에 컴포넌트 테스트는 없다**).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 31건 전수** 를 지정된 순서로 판정했다. 빈칸 0건. **v1.0 의 30건에서 늘어난 EXC-21 을 추가로 판정**했다(이 라우트가 `commerce.orders` 모듈에 속함을 코드로 확인)
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다 — **EXC-07 은 유형을 갈라 두 번 재현하는 절차**를 명시했다
- [x] 모든 `N/A` 에 사유를 댔다(STATE-04 페이징·선택 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재 · IA-05 폼 라우트 쌍 부재)
- [x] §2.1 산수 검산 — 11 pass + 11 종속 + 4 n-a + 5 gap = **31** ✓
- [x] **뒤집힌 판정 3건을 명시**했다 — FEEDBACK-02(사유 교체) · EXC-07(pass → gap) · A11Y-16(gap → pass). 근거를 코드로 댔다
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`·`shared/permissions`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(재정렬·업로드·CSV·토글 필터·optimistic)은 적지 않았다. **엔타이틀먼트 축(EXC-22)은 표면이 실재하므로 넣었다**
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다. **늘어난 축(환불 완료 = 원장 기입)에 별도 예산 줄을 세웠다**
- [x] §4.3 을 **재고 하나에서 재고·금액·원장 셋으로 넓혔다** — 적립 원장이 append-only 라 가장 무겁다는 판단을 §1.2 와 함께 밝혔다
- [x] §6 의 `?fail=` scope(`claims`)와 op 를 **어댑터 코드에서 확인**했고(`delete` 가 무효임 포함), **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음). **미배선 seam 은 브라우저에서 재현되지 않고 단위 테스트가 방어선임**을 명시했다
- [x] §5 의 gap 이 FS-044 §7 · BE-044 §7.12 와 번호로 대응한다
- [x] **확인하지 못한 것을 쓰지 않았다** — 성능 수치는 전부 '측정 불가(백엔드 없음)'로 남겼고, E2E 를 돌리지 않았음을 §1·§6 에 명시했다
