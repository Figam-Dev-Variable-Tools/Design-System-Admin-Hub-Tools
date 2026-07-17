---
id: NFR-045
title: "쿠폰 비기능 명세"
functionalSpec: FS-045
backendSpec: BE-045
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-045. 쿠폰 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-045 쿠폰 (`/products/coupons` · `/products/coupons/new` · `/products/coupons/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-045(요소·예외) · BE-045(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-045 §7 · BE-045 §7.9 와 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음.** MOTION-01/02/03 의 **근거**가 바뀌었으나(오버레이 모션 구현 · ToggleSwitch reduced-motion 게이트 신설 — §2) 소유가 DS 라 판정은 `종속` 그대로다. **사용 기간 검증의 근거도 바뀌었다** — `validation.ts:74` 가 정본 `isCalendarDate` 로 수렴했으나 그 축은 애초에 pass 였다(§2 A11Y-11 인접 · FS-045-EL-029) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **앱 공용 프레임워크(`shared/crud` · `shared/ui` 훅 · `shared/permissions`)의 소비 여부도 화면의 선택이므로 직접이다** |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·전역 계층(queryClient·RequireAuth·ToastProvider)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**금액을 정의하는 화면이다.** 15% 할인 쿠폰 1,000장은 곧 금액이며, **발급된 쿠폰은 회수할 수 없다**(BE-045 §7.5). 그런데 이 화면의 가장 위험한 액션 — **목록의 발급 상태 토글**(FS-045-EL-009.10) — 은 **클릭 한 번**이고 확인 다이얼로그가 없다. 동시에 이 화면은 **`useCrudForm` 을 소비해 EXC-04·EXC-08 을 통과하는 드문 화면**이다: 충돌 다이얼로그·동기 제출 락·제출 시도 단위 멱등키를 전부 상속한다. **그 보장이 폼에만 걸리고 토글·삭제에는 걸리지 않는 비대칭**이 이 문서의 핵심 관찰이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **목록**: `CouponListPage.tsx:97-102` 가 공용 `useCrudList` 를 소비하고, 그 훅이 `firstLoading = isFetching && data === undefined` 를 파생한다(`useCrudList.tsx:71` — 'STATE-01 의 핵심 한 줄: 스켈레톤은 데이터가 아직 **없을** 때만이다'). `CrudListShell` 이 그 값만 스켈레톤(`CrudListShell.tsx:137` → `CrudTable.tsx:143`)과 요약(`:119`)에 넘기고, **재조회는 `refreshing = isFetching && data !== undefined`(`useCrudList.tsx:72`)라는 별도 축**으로 표현한다(`:118,120` — 건수를 유지한 채 '· 새로고침 중…'만 덧붙인다). `useCrudListQuery` 의 `placeholderData: (previous) => previous`(`crud.ts:254`)가 그 유지를 뒷받침한다. **폼**: `loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined`(`useCrudForm.ts:136`) — 등록 라우트에서는 아예 false. `{first-load, refetching-with-data, empty, error}` 가 정확히 갈린다 | `/products/coupons` 진입 → 데이터 렌더 확인 → 필터 변경(또는 `staleTime` 30초 경과 후 재진입)으로 재조회 유발. **표가 스켈레톤으로 바뀌거나 '전체 N건'이 '불러오는 중…'으로 덮이면 gap.** `?fail=list` 로 error 만, 검색 0건으로 empty 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **목록**(`CrudListShell.tsx:156-165`) `<Alert tone="danger">쿠폰 목록을 불러오지 못했습니다.</Alert>` + '다시 시도'(`controller.refetch` → `useCrudList.tsx:186`). **폼**(`CouponFormPage.tsx:198-220`) 404 → '쿠폰을 찾을 수 없습니다…' + '목록으로' / 그 밖 → '쿠폰을 불러오지 못했습니다.' + **'다시 시도'**(`retryLoad` — `useCrudForm.ts:151-153`) + '목록으로'. read 실패에 toast 를 쓰지 않고 empty 로 폴백하지 않는다(error 분기가 `CrudTable` 렌더보다 앞선다 — `CrudListShell.tsx:113`) | `?fail=list` · `?fail=detail` 로 실패시킨다. **인라인 danger Alert 가 뜨고 retry 가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap | **pass** |
| STATE-04 | STATE | 직접 | **(a) page clamp — 표면이 없다**: 페이지네이션이 없어(`<Pagination` grep 0건) 'out-of-range page' 가 발생할 수 없다. 페이지네이션 부재 자체는 IA-04 가 gap 으로 잡는다. **(b) 숨겨진 행의 선택 해제 — 실재하고 충족된다**: 선택은 `useCrudList` 의 `useRowSelection`(`useCrudList.tsx:59`)이 소유하고, 화면이 `useEffect(() => { clear(); }, [filter, keyword, clear])`(`CouponListPage.tsx:106-108`)로 **발급유형·검색어가 바뀔 때마다 선택을 지운다.** 삭제 전건 성공 시에도 지운다(`useCrudList.tsx:145`). **실재하는 절이 충족되므로 pass** — clamp 절은 표면 부재 | 쿠폰 3건을 선택 → 발급유형 필터를 '정률 할인'으로 변경. **'N건 선택됨'이 사라지면 pass.** 그 상태로 '선택 N건 삭제'가 화면에 없는 행을 지우면 gap. **주의**: 이 화면에는 **선택 상태가 두 벌 마운트돼 있다**(`useCrudList` 의 `useRowSelection` + `useListState` 의 `selectedIds` — FS-045 §7 #16). 화면은 전자만 쓴다 | **pass** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/products/coupons/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 5)`(`CouponListPage.tsx:74`) · `calc(var(--tds-space-6) * 13)`(`CouponFormPage.tsx:81`) 같은 space 토큰 배수. `box-shadow` 선언 0건. **잔여(TOKEN-01 밖)**: `CouponCardPreview.tsx:129` 의 `opacity: 0.55` 는 px 도 hex 도 아니라 이 요구에 걸리지 않는다 — TOKEN-07(P1)이 그것을 잡는다(§3) | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/products/coupons` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-input tds-ui-focusable`(`CouponFormPage.tsx:252,273,319,344,366,385`) · `tds-ui-focusable`(`:226` 목록으로) · DS `<Button>`·`<SelectField>`·`<SearchField>`·`<ToggleSwitch>`(`ToggleSwitch.css:17-21` 이 `--tds-border-width-medium` + `--tds-color-border-focus`)·`<DateRangeField>`·`RowActions`. **이 화면이 focus ring 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: 스켈레톤 펄스(`tds-ui-skeleton` — `CrudTable.tsx:148`) · Toast · **`ToggleSwitch` 의 `transition: background-color/transform var(--tds-motion-duration-fast)`**(`ToggleSwitch.css:32,56`) · DS `<Button>` transition · Modal. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`CouponFormPage.tsx:245,419`) · Toast · 삭제/충돌/이탈 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건). 미리보기 카드는 `border` 로만 depth 를 낸다(`CouponCardPreview.tsx:40-44`) — 요구가 지적하는 'border 가 아니라 shadow' 의 정확한 사례이나 **그 판정은 토큰 소유 문서의 몫이다** | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 직접 | 폼 `<h1>` 이 공유 `pageTitleStyle` 을 소비한다(`CouponFormPage.tsx:235`). 그 스타일이 `--tds-typography-title-xl-*`(>18px tier + weight 600)을 참조한다(`shared/ui/styles.ts:51-61`) — 값을 손으로 재현하지 않는다. 카드 제목은 `CardTitle`(`<h2>` + `cardTitleStyle` — `shared/ui/Card.tsx:39`). 미리보기의 할인 문구는 `--tds-typography-title-md-font-size`(`CouponCardPreview.tsx:56`) — 도메인 강조라 h 태그가 아니다. **목록에는 in-content `<h1>` 이 없다**(제목이 AppHeader 에서 온다 — 그 모순은 IA-02 가 다룬다) | `/products/coupons/new` 의 '쿠폰 등록' `<h1>` 이 body-md 보다 가시적으로 크고, computed `font-size` 가 `--tds-typography-title-xl-font-size` 로 해석되는지 확인 | **pass** |
| COMP-10 | COMP | 직접 | 검색이 공용 `useListState` 를 거쳐 `useDebouncedSearch` 를 소비한다: `CouponListPage.tsx:174-181` 이 `value={list.searchInput}` + `onChange={list.setSearchInput}` + **`{...list.searchInputProps}`** 를 스프레드하고 `:179` 주석이 그 의도를 명시한다. 그 props 가 `onCompositionStart/End` + `onKeyDown` 을 싣고(`useDebouncedSearch.ts:105-131`), ① 조합 중에는 커밋하지 않으며(`:87`) ② 조합 종료 후 **250ms 디바운스**로 커밋하고(`:23,93-95`) ③ **조합 중 Enter 를 가로챈다**(`:121-124` — `isComposing` + 자체 관측 두 신호). 순서 뒤바뀐 응답은 이 화면에 없다 — 검색이 클라이언트 필터다(`:110-118`) | `/products/coupons` 검색창에 IME 로 '신규가입' 입력. **조합 중 '신규가ㅇ' 같은 부분 문자열이 필터에 커밋되지 않아야 pass.** 조합 중 Enter 가 제출하지 않는지, 완성 후 정확히 1회만 URL `?q=` 가 갱신되는지 확인 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | **파괴적 액션(삭제)이 전부 `ConfirmDialog` 로 게이트된다** — `useCrudList` 를 소비함으로써 단건·일괄 다이얼로그를 상속한다(`useCrudList.tsx:152-179`). 요구의 절을 하나씩 대조하면: **intent 매핑** `intent="delete"`(`:156,168`) ✓ · **busy 중 confirm disable** `busy={deleting}`/`busy={bulkDeleting}`(`:160,172`) ✓ · **실패 시 다이얼로그를 열어 둔 채 danger Alert 배너 + 재클릭이 retry** `error={deleteError}`(`:161`) — `onError` 가 `setDeleteError(…)` 만 하고 닫지 않는다(`:110-113`), 일괄은 부분 실패도 열어 둔다(`:136-142`) ✓ · **cancel/Esc/dim-click 이 in-flight 를 abort 하고 pending 을 리셋** `closeDelete`/`closeBulk` 가 `controller.abort()` + `mutation.reset()`(`:86-92,118-124`) ✓. **discard intent** 는 이탈 가드가 소유(`CouponFormPage.tsx:181`). **충돌 다이얼로그**도 같은 primitive 를 쓴다(`FormFeedback.tsx:62-73`, `busy={false}` — 서버 요청이 없어 정확하다). **잔여(이 요구의 gap 은 아니다)**: 발급 상태 토글(`CouponListPage.tsx:146-168`)은 확인 없이 즉시 발급 상태를 바꾼다 — **파괴적이 아니라 가역적**이므로(다시 끄면 된다) 요구 밖이다. 다만 §1.2 가 지적하듯 그 클릭이 곧 '할인을 나눠준다'다 | 쿠폰 삭제 → 확인 다이얼로그가 뜨는지. `?fail=delete` 로 강제 실패 → **다이얼로그가 열린 채 error 배너가 뜨고 재클릭이 retry 하면 pass.** in-flight 중 Esc → toast 없이 버튼 state 복원 | **pass** |
| FEEDBACK-04 | FEEDBACK | 직접 | `CouponFormPage.tsx:181` 이 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다. `isDirty` 는 **RHF `formState.isDirty`**(`useCrudForm.ts:261`) — 요구가 명시한 기준 그대로다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:8-14`). 저장 성공 시 `navigate(listPath, { replace: true })`(`useCrudForm.ts:223`)로 이동하는데 **그것은 프로그램 이동이라 가드를 거치지 않는다** — 저장했으므로 정상이다(요구: '폼이 not-dirty 가 되는 즉시나 self-initiated navigation 에서는 가드를 해제한다') | 폼에 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의**: '목록으로'(FS-045-EL-016)·'취소'(EL-032)는 `navigate()` 프로그램 이동이라 가드가 발화하지 않는다 — 훅의 3경로 계약 밖이라 이 요구의 gap 이 아니다(FS-045 §7 #5 로 별도 이관) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 등록·수정 폼이 전용 라우트다(`App.tsx:231-232`). 이 화면의 modal 3종(단건 삭제 · 일괄 삭제 · 충돌 · 이탈 가드)은 전부 **입력 필드가 없는 확인 다이얼로그**다. 요구가 지목한 appliesTo(`CreateGroupModal`·`ProductCategoryFormModal`…)에 이 화면이 없다 — 쿠폰은 IA-06 의 'rich 엔티티 → 전용 form route' 쪽이다 | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공(`useCrudForm.ts:222`) · 삭제 성공(`useCrudList.tsx:108,146`) · 토글 성공/실패(`useCrudRowUpdate.ts:49,53`). 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다 | ToastProvider 판정에 종속 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면 4종: 단건 삭제 · 일괄 삭제 · 충돌(`FormConflictDialog`) · 이탈 가드. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속. 이 화면에서는 삭제 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **미충족 — 같은 파일 안에서 계약이 갈린다.** ✅ 충족: **짝 없는 `aria-invalid` 0건**(grep: 이 디렉터리 히트 3건 = `CouponFormPage.tsx:257,278,323`, 전부 다음 줄이 `aria-describedby`). **required 노출**도 충족 — 모든 `required` FormField 의 자식이 네이티브 `input`(`:249,270,316`) 또는 DS `SelectField`(`:287,299`)라 `withAriaRequired` 가 런타임에 `aria-required` 를 주입하고(`FormField.tsx:36-56`), `DateRangeField` 는 두 칸 각각에 `required`+`aria-required` 를 자체 배선한다(`DateRangeField.tsx:48`). ❌ **미충족: 세 입력이 `error` 를 렌더하면서 자신에게 `aria-invalid`·`aria-describedby` 를 세우지 않는다** — `coupon-min-order`(`:356-372`, `error={errors.minOrderAmount?.message}` ↔ input 에 aria-* 없음) · `coupon-quantity`(`:375-391`) · `coupon-max-discount`(`:334-352`). `FormField` 는 `<p id={errorIdOf(htmlFor)} role="alert">` 를 그리는데(`FormField.tsx:110-112`) **input 이 그것을 가리키지 않는다.** `minOrderAmount`/`totalQuantity` 는 `intString` 검증이 실제로 오류를 내므로(`validation.ts:38,40`) 이 경로는 실재한다. 형제 필드(`coupon-name`·`coupon-code`·`coupon-discount-value`)는 세운다 — **같은 파일, 같은 패턴, 다른 결과.** 게다가 오류 상태의 시각 표현이 `controlStyle(true)`(`:368,387`) 즉 **색상뿐**이라 WCAG 1.4.1 도 걸린다 | `grep -rn "aria-invalid" apps/admin/src/pages/products/coupons` → 3건(전부 짝 있음). **그러나 `grep -n "error={errors\." CouponFormPage.tsx` → 6건**이다. 그 6개 FormField 의 자식 input 중 **3개에 `aria-invalid` 가 없으면 gap.** RTL 로 최소 주문 금액에 '오천'을 넣고 제출 → `screen.getByRole('alert')` 는 잡히지만 `input.getAttribute('aria-describedby')` 가 null 임을 확인 | **gap** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면의 필터는 **좌측 필터 list item(토글 버튼)이 아니라 `<select>` 1개**다(`CouponListPage.tsx:182-195`). `aria-pressed`/`aria-current` 를 쓸 toggle 필터가 존재하지 않으며, 이 화면 전체에 `aria-current`·`aria-pressed` grep **0건**. (`ToggleSwitch` 는 `aria-checked` 를 쓰는 switch 역할이라 이 요구의 대상이 아니다 — 필터가 아니다) | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면 4종(삭제 ×2 · 충돌 · 이탈 가드). enter/exit transition 은 DS `Modal` organism 이 소유한다 | DS Modal 판정에 종속. **오버레이 모션은 구현됐다 — 단 라이브러리가 아니라 CSS-only 다**: Motion/framer-motion 은 **여전히 미도입**(package.json 19개·import·lockfile 전부 0건)이나 backdrop fade enter(`Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134`) · exit(`:30-33` → `tds-modal-backdrop-out :136-144`) · dialog enter(`:58-59` → `tds-modal-dialog-in :146-156` — opacity 0→1, `scale(0.96)→scale(1)`) · exit(`:35-38` → `tds-modal-dialog-out :158-168`, `forwards`)가 `component.overlay` recipe(`tokens/tokens.json:1286-1308` — enter 250ms/decelerate · exit 150ms/accelerate)를 소비한다. 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd` 로 동등 달성**(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`). reduced-motion 게이트 `Modal.css:173-180`. **잔여 — 애니메이션되는 닫힘은 Modal 소유 3경로뿐**(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`, 전부 `requestClose` `:122-126` 경유): **footer 버튼은 여전히 즉시 언마운트**(`Modal.tsx:27-31` 이 명시 — 조립하는 쪽 버튼이라 `onClose` 가 아니라 호출부 콜백 직행). **이 화면은 modal 이 4종이라 그 잔여의 노출이 가장 넓다** — 삭제 2종·충돌·이탈 가드의 '취소'(`ConfirmDialog.tsx:145-147`)·확인(`:148-156`) 버튼이 전부 그 경로다. **라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장·삭제·토글 결과 토스트. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속. **toast exit 은 완전 구현이다** — `.tds-toast--exiting`(`Toast.css:32-37`)이 `tds-toast-out … forwards` + `pointer-events:none` 을 걸고 keyframes(`:121-131`)가 opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))` 로 등장(`:26-27`/`:109-119`)의 역순을 그린다. `exit-duration`={motion.duration.fast}(150ms) · `exit-easing`={motion.easing.accelerate} 라 **요구가 명시한 'exit duration fast~normal, easing accelerate' 를 정확히 충족**한다. reduced-motion 게이트 `:136-141` | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: 스켈레톤 펄스 · Toast(`Toast.css:136-141`) · Modal(`Modal.css:173-180`) · DS Button transition · **`ToggleSwitch`**(FS-045-EL-009.10, EL-030 — 목록 발급 열 `CouponListPage.tsx:149` · 폼 발급 상태 `CouponFormPage.tsx:408`). **이전 판정이 지목했던 위반은 해소됐다 — 게이트가 실재한다**: `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce)` 로 `.tds-toggle__track` · `.tds-toggle__knob` 의 `transition: none` 을 걸어 **남은 transition 선언 둘을 전부 끈다**(`:32` 트랙 `background-color` · `:56` 손잡이 `transform`). 주석 `:76-78` 이 사유를 못박는다: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는데, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다 — 즉시 최종 위치로 스냅한다. **그 파일은 여전히 `packages/ui` 소유**이고 이 화면은 transform/transition 을 직접 선언하지 않는다(grep 0건) | 전역 motion config·`ToggleSwitch.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인. (재현: `emulateMedia({ reducedMotion: 'reduce' })` 로 목록 발급 토글을 눌러 **knob 이 미끄러지지 않고 즉시 스냅하면 pass**) | **종속** |
| IA-01 | IA | 직접 | 세 라우트 모두 AppShell layout route 아래에 등록된다(`App.tsx:230-232`). **세 화면 모두 자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 목록은 `CrudListShell` 의 `<div style={columnStyle}>`(`CrudListShell.tsx:98`), 폼은 `<div style={pageStyle}>`(`CouponFormPage.tsx:223`)다 | 세 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **미충족(사유가 F2 때와 바뀌었다).** `findCoveringLeaf`(`nav-config.ts:269-279`) 도입으로 **브랜치 폴백은 해소됐다** — `/products/coupons/new` 는 자기를 감싸는 가장 긴 잎 `/products/coupons`(`nav-config.ts:149`)를 찾아 AppHeader 가 `<h1>쿠폰</h1>` 을 그린다. '상품 관리'로 떨어지지 않는다. **그러나 폼이 자체 `<h1>{isEdit ? '쿠폰 수정' : '쿠폰 등록'}</h1>` 를 또 그린다**(`CouponFormPage.tsx:235`) → **`<h1>` 이 2개**다. 아이러니하게도 **요구가 예시로 든 '공지 등록' 형태의 구체적 title 은 in-content h1 이 이미 갖고 있다** — 문제는 그것이 AppHeader 의 h1 과 **중복**된다는 것이고, `nav-config.ts:293-295` 주석이 밝히듯 '등록/수정 행위를 AppHeader 제목에 넣지 않는 것'이 의도라 두 h1 이 서로 다른 것을 말한다. 요구가 정의하는 '단일 page-header/title 모델'이 성립하지 않는다 | `/products/coupons/new` 진입 후 `document.querySelectorAll('h1').length` 확인. **2 이면 gap.** 목록 `/products/coupons` 는 1개(정상 — 잎 라벨 '쿠폰') — 이 gap 은 sub-route 에서만 발생한다 | **gap** |
| IA-04 | IA | 직접 | **부분 미충족.** 충족: 툴바 좌측에 검색·필터, **우상단에 primary '쿠폰 등록'**(`CouponListPage.tsx:171-202` — `justifyContent: 'space-between'` 으로 좌/우 분리) → 결과 count 요약(`CrudListShell.tsx:115-123`) → **SelectionBar**(`:125-133`) → table(`:135-154`). **요구의 5요소 중 4개가 순서대로 있다.** **미충족: Pagination 이 없다.** `CrudListShell` 이 그것을 렌더하지 않는다(`<Pagination` grep: 앱 전체 11파일 중 `shared/crud/**` 0건). 쿠폰은 상한 없이 누적되므로 'page size 초과 가능'이다(BE-045 §7.6) | 픽스처를 20건 이상으로 늘리고 `/products/coupons` 진입. **모든 행이 한 화면에 렌더되고 Pagination 이 없으면 gap** | **gap** |
| IA-05 | IA | 직접 | **충족.** `/products/coupons/new` 와 `/products/coupons/:id/edit` 가 **같은 컴포넌트로 해석된다** — `App.tsx:231-232` 가 둘 다 `<CouponFormPage />` 를 건다. 레이아웃이 동일하고 **title(등록 vs 수정)과 prefill 값만 다르다**: `isEdit = id !== undefined`(`useCrudForm.ts:74-75`)가 h1(`:235`)·제출 라벨(`:446`)·상세 조회 여부(`:143`)·mutate 분기(`:226-237`)를 갈랐다. create 전용/edit 전용 page 가 별도로 존재하지 않는다. 요구가 명시한 정본(`FormPageShell + useCrudForm`) 중 후자를 그대로 쓴다 — 전자를 안 쓰는 것은 **우측 미리보기 2단 때문**이며(`FormFeedback.tsx:4-6` 이 그 갈래를 기록한다) 요구가 요구하는 것은 '동일 컴포넌트/route 쌍'이지 특정 셸이 아니다 | `/products/coupons/new` 와 `/products/coupons/cpn-1/edit` 의 레이아웃이 같고 title·prefill 만 다른지 확인 | **pass** |
| IA-13 | IA | 직접 | 발급유형·검색어의 **단일 원천이 URL 쿼리스트링**이다. `:87` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 배선하고(`FILTER_DEFAULTS = { issue: 'all' }` — `:54`), 그 훅이 `useSearchParams` 로 `?issue=`·`?q=` 를 읽고 쓴다(`useListState.ts:87-129`). 기본값과 같은 값은 URL 에서 지워지고(`:114-118`) 갱신은 `replace: true`(`:125`). 손으로 고친 값은 `parseFilter`(`:89-93`)가 되돌린다. `:6-10` 헤더 주석이 이 화면의 실제 운영 루프('정률 할인 쿠폰만 골라 한 건을 열어 소진율을 확인하고 Back')를 기록한다. **`sort` 는 정렬 UI 가 없어, `page` 는 페이지네이션이 없어 쓰이지 않는다**(IA-04 gap 이 그것을 잡는다) — 실재하는 축은 전부 URL 에 있다 | `/products/coupons` 에서 발급유형='정률 할인' + 검색='WELCOME' 적용 → URL 이 `?issue=percent&q=WELCOME` 인지 확인 → 행 클릭으로 수정 폼 진입 → 브라우저 Back. **같은 조건의 목록이 복원되면 pass.** URL 을 새 탭에 복사해 같은 view 가 재현되는지도 확인 | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:484-493` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속 | **종속** |
| EXC-02 | EXC | 상속 | ① 진입 가드 `RequireAuth` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `notifySessionExpired()`(`queryClient.ts:31-44`). **이 화면의 조회 2종·쓰기 3종이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=list:401` 로 `/login?returnUrl=%2Fproducts%2Fcoupons&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** ✅ 충족(상속): **read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490-492`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더하고, 라우트→리소스 파생이 `/products/coupons/new`·`/:id/edit` 까지 덮는다(`route-resource.ts` → `findCoveringLeaf`). ❌ **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`(`RequirePermission.tsx:45-52`)를 **소비하지 않는다**(grep: 이 디렉터리 0건). 그래서 쓰기 권한 없는 역할이 **'쿠폰 등록' 버튼**(`CouponListPage.tsx:197-200`) · **발급 상태 토글**(`:146-168`) · **수정/삭제 연필·휴지통**(`CrudTable.tsx:190-199`) · **'선택 N건 삭제'**(`CrudListShell.tsx:126-132`) · **폼 제출**(`CouponFormPage.tsx:445-447`)을 전부 보고 누른다. 강등 reconcile 도 없다 — 서버 403 이 '저장하지 못했습니다'/'변경하지 못했습니다' 로 뭉개진다(`useCrudForm.ts:194` · `useCrudRowUpdate.ts:53`). **같은 섹션의 형제 둘은 이미 배선했다**: `products/items/ProductListPage.tsx:119`(`canCreate`) · `products/returns/ReturnDetailPage.tsx:110`(`canUpdate`). **BE-045 §7.7 이 `operator` 를 조회 전용으로 판정하므로 이 gap 은 실사용에서 즉시 드러난다** | 권한 스토어에서 `page:/products/coupons` 의 `create`·`update`·`remove` 를 끈 뒤 `/products/coupons` 진입. **'쿠폰 등록' 버튼·토글·연필·휴지통이 그대로 보이면 gap.** `read` 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass) | **gap** |
| EXC-04 | EXC | 직접 | **충족(존재 기반) — 단 토큰이 아니라는 점을 정확히 쓴다.** ① **유령 저장 해소**: 공용 `createCrudAdapter` 의 `update` 가 없는 id 에 **`HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** 를 던진다(`crud.ts:126-128`, `:123-125` 주석이 그 이력을 기록한다). ② **conflict dialog + 입력 보존**: `useCrudForm.handleWriteError` 가 `isConflict`(409/412 — `http-error.ts:105-107`)를 잡아 `setConflict({ message, reload, dismiss })`(`useCrudForm.ts:166-179`)하고 `FormConflictDialog`(`CouponFormPage.tsx:451`)가 그것을 렌더한다. **폼을 언마운트하지 않아 입력이 그 자리에 살아 있고**(`FormFeedback.tsx:51-53`) **성공 토스트도 목록 이동도 없다**(`return` 으로 빠진다). '이어서 편집'(cancel)이 다이얼로그만 닫고 `suppressCancelToast` 로 취소 토스트도 막는다. ③ **overwrite 하지 않는다** — reload 는 사용자가 명시적으로 고를 때만 폼을 덮는다(`:173-176`). **요구의 acceptanceCheck 두 절이 전부 성립한다.** ⚠ **그러나 낙관적 동시성 '토큰'은 없다** — `Coupon` 에 `version`/`updatedAt` 이 없고(`types.ts:14-36`) `If-Match` 를 보내지 않는다. 현 409 는 **'존재 여부' 기반**이므로 **동시 편집(둘 다 존재)은 여전히 last-write-wins** 다. **이 화면에서 그것이 실제 사고를 낸다** — `issuedCount` 가 폼 값으로 왕복해 낡은 스냅샷이 새 발급 기록을 덮는다(BE-045 §7.2). 그 잔여는 §5 #6 으로 이관 | `?status=save:409` 로 수정 폼에서 저장. **'다른 사용자가 먼저 변경했습니다' 다이얼로그가 뜨고, '이어서 편집'을 누르면 입력이 그대로 남으면 pass.** success toast·목록 이동이 없어야 한다. 토큰 부재는 `grep -rn "If-Match\|version\|updatedAt" apps/admin/src/pages/products/coupons` → 0건으로 확인 | **pass** |
| EXC-08 | EXC | 직접 | **충족(폼 경로) — 비대칭을 정확히 쓴다.** 요구의 세 장치가 폼 저장에 전부 있다: ① **pending 중 submit disable** — `disabled={disabled}`(`CouponFormPage.tsx:445`, `disabled = saving \|\| loadingDetail` — `:179`). ② **동기 submit lock** — `submitLockRef`(`useCrudForm.ts:103,202-203`)가 **렌더를 기다리지 않고** 두 번째 제출을 막는다. `:98-101` 주석이 그 이유(RHF 비동기 검증 후 `saving` 이 true 가 되기까지의 틈)를 기록하고, `onSettled` 에서 풀며(`:213-215`) 검증 실패 시에도 푼다(`:246-248`). ③ **per-submit-attempt idempotency key, mutationFn 밖에서 생성** — `idempotencyKeyRef`/`takeIdempotencyKey`(`:118-123`)가 키를 만들어 **variables 로** 싣고(`:211,228,235`), `CreateVars.idempotencyKey`(`crud.ts:273-279` 주석이 '재시도가 같은 키를 재사용하려면 여기 있어야 한다'를 기록) → 어댑터 원장이 재생 처리한다(`crud.ts:62-72,114,121`). **성공해야 키를 버린다**(`:220`) — 실패한 재시도가 같은 키를 재사용한다. 원장은 **적용에 성공한 뒤에만 기록**해(`crud.ts:56-60`) 실패한 첫 시도가 키를 태우지 않는다. ⚠ **그러나 목록의 토글·삭제에는 이 보장이 없다** — `useCrudRowUpdate.run` 이 `{ id, input, signal }` 만 넘기고(`useCrudRowUpdate.ts:45`) `useCrudDelete` 도 `{ id, signal }` 만 넘긴다(`crud.ts:330`). 방어는 토글의 **이전 요청 abort**(`useCrudRowUpdate.ts:39`)와 삭제 다이얼로그의 `busy` 뿐이다. **요구의 appliesTo 는 'useCrudForm, ConfirmDialog, 금액/생성/발송 mutation' 이며 폼이 그 중심**이므로 pass 로 판정하되, 비대칭을 §5 #5 로 이관한다 | 폼에서 '등록'을 최대한 빠르게 2회 클릭(또는 Enter 연타). **요청이 1건만 발사되면 pass.** `?fail=save` 로 실패시킨 뒤 재클릭 → 같은 `Idempotency-Key` 가 재사용되는지(현재는 어댑터 원장으로만 관측 가능 — `crud.ts:114` 에 브레이크포인트). 코드상 `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/shared/crud/useCrudForm.ts` = 6건 | **pass** |
| EXC-09 | EXC | 직접 | **네 지점이 전부 배선돼 있다** — 전부 공용 프레임워크를 소비함으로써. ① **폼 onError** — `if (isAbort(cause)) return;`(`useCrudForm.ts:162`) ② **폼 onSuccess** — `if (controller.signal.aborted) return;`(`:218`) ③ **폼 unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:93`) ④ **삭제 다이얼로그 close** — `closeDelete`/`closeBulk` 가 `controller.abort()` **+ `mutation.reset()`**(`useCrudList.tsx:86-92,118-124`) — 요구가 명시한 'isPending 리셋(mutation.reset)' 그대로다. ⑤ **토글** — `isAbort` 로 error toast 를 막고(`useCrudRowUpdate.ts:52`) `onSettled` 가 `signal.aborted` 면 `pendingId` 를 건드리지 않는다(`:56`). ⑥ **bulk 실패 count 에서 abort 제외** — `useCrudBulkDelete.onSuccess` 가 `if (signal.aborted) return;`(`crud.ts:352`)로 집계 자체를 건너뛴다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 | 삭제 확인 후 in-flight(400ms 창) 중 Esc → **toast 없이 버튼 state 복원되면 pass.** 폼 저장 중 사이드바 이동 → error toast 가 없어야 한다 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **14** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · TOKEN-05 · COMP-10 · FEEDBACK-02 · FEEDBACK-04 · IA-01 · IA-05 · IA-13 · EXC-04 · EXC-08 · EXC-09 |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **2** | FEEDBACK-06 · A11Y-12 |
| `gap` | **4** | A11Y-11 · IA-02 · IA-04 · EXC-03 |
| **합계** | **30** | 14 + 10 + 2 + 4 = **30** ✓ |

> **P0 gap 4건 — quality-bar '배치 실패' 사유.** **IA-02 · IA-04 · EXC-03 은 앱 전역의 같은 뿌리**(sub-route h1 이중 · 목록 페이징 부재 · 쓰기 게이팅 미배선)를 공유하므로 **횡단 배치**로 푸는 것이 옳다. **A11Y-11 만 이 화면 고유이며 한 파일 안의 비일관**이다 — 형제 필드 3개가 옳게 하고 3개가 빠뜨렸다.
>
> **이 화면은 P0 통과율이 담당 4화면 중 가장 높다(14 pass).** `useCrudForm`·`useCrudList`·`useListState`·`createCrudAdapter` 를 **전부** 소비해 STATE-01/02/04 · COMP-10 · FEEDBACK-02/04 · IA-13 · EXC-04/08/09 를 프레임워크에서 상속하기 때문이다. **남은 gap 은 프레임워크가 제공하지 않는 것들이다** — 권한 게이팅(`useRouteWritePermissions` 를 안 붙였다) · 페이지네이션(`CrudListShell` 이 안 그린다) · h1 모델(앱 전역) · 필드 배선 3건(손으로 쓴 `<input>` 의 실수).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(재정렬·이미지 업로드·CSV·Pagination range·토글 필터·타임라인)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous`(`crud.ts:254`)로 이전 행을 유지하고 `staleTime` 30초가 재조회 시점을 지배한다. `CrudListShell` 이 `refreshing` 을 별도 축으로 받아 **'· 새로고침 중…' 이라는 가벼운 인디케이터**를 요약에 덧붙이고(`:118-120`) 표는 건드리지 않는다 — 요구가 기대하는 형태 그대로다 | 데이터가 있는 상태의 filter/page 변경에서 이전 행이 유지되는지 | **pass** |
| STATE-05 | P1 | 빈 상태가 공유 `Empty` 를 소비한다(`CrudTable.tsx:157-167`) — 3분기 + 복구 액션이 맥락(`hasQuery`·`hasActiveFilters` — `CouponListPage.tsx:211-216`)에서 파생된다. 조사(이/가)는 `Empty` 가 받침으로 고른다. **잔여: 진짜 0건의 생성 CTA 가 없다** — `CrudTable` 이 `empty.createAction` 슬롯을 받는데(`:162`) 이 화면이 넘기지 않아 '새로 추가하면 여기에 표시됩니다.' 만 나온다. 요구는 'data-0 화면은 create CTA' 를 명시한다 | 미시딩 resource 로 진입 → 빈 상태 안에 '쿠폰 등록' CTA 가 있는지 | **gap(부분)** |
| STATE-06 | P1 | 저장 성공 시 `useCrudCreate`/`useCrudUpdate` 가 목록(+상세)을 정확히 무효화하고(`crud.ts:290-292,312-315`), 토글도 같은 경로를 쓴다. 삭제는 전건 성공에서만 무효화한다(`crud.ts:351-354`) — 부분 실패 시 낡은 목록을 남기지 않기 위한 의도된 선택 | 목록에서 토글 → 소진율·상태가 갱신되는지. 폼 저장 후 목록 복귀 시 새 값이 보이는지 | **pass** |
| COMP-01 | P1 | 모든 버튼이 DS `<Button>` 이다 — `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/coupons` = **0건**. **그러나 제출 버튼이 진행 상태를 `loading` prop 이 아니라 손으로 쓴 라벨로 표현한다** — `{saving ? '저장 중…' : isEdit ? '저장' : '등록'}`(`CouponFormPage.tsx:446`). 요구가 명시적으로 금지하는 형태다('진행 상태는 `loading` prop 으로(손수 쓴 '저장 중…' 금지)'). **같은 섹션의 `ReturnDetailPage.tsx:355` 는 `loading={saving}` 을 쓴다** — 계약이 갈린다 | `grep -n "저장 중…" apps/admin/src/pages/products/coupons -r` → 1건(`CouponFormPage.tsx:446`) | **gap** |
| COMP-02 | P1 | 선택 셀이 DS `RowSelectCell`/`SelectAllHeaderCell`(`CrudTable.tsx:124-129,173-178`), 순번이 `SeqHeaderCell`/`SeqCell`(`:130,179`)이다. raw `<input type=checkbox>` 선택 마크업 0건 | `grep 'type="checkbox"' pages/products/coupons` → 0건 | **pass** |
| COMP-03 | P1 | 검색이 DS `<SearchField>`(`CouponListPage.tsx:174`). raw `<input type="search">` 재구현 0건 | `grep 'type="search"' pages/products/coupons` → 0건 | **pass** |
| COMP-06 | P2 | 스켈레톤 **셀 수는 표 정의에서 파생**한다(`CrudTable.tsx:113` `columns.length + 3` → `:146`). **그러나 행 수는 하드코딩 `Array.from({ length: 5 })`**(`:144`) — 요구가 명시적으로 금지한 형태다. 페이지네이션이 없어 'row 수 === PAGE_SIZE' 를 만족시킬 기준값 자체가 없다(IA-04 gap 과 연동). 공유 `SkeletonRows(rows, cols)` helper 도 없다 | `grep "length: 5" apps/admin/src/shared/crud/CrudTable.tsx` → 1건 | **gap** |
| COMP-07 | P2 | `<SeqCell seq={index + 1} />`(`CrudTable.tsx:179`) — `startIndex` 가 없다. **현재는 페이지네이션이 없어 실제 오류가 나지 않는다.** IA-04 를 해소하는 순간 2페이지 첫 행이 1로 리셋된다 | 페이지네이션 도입 후 page 2 첫 행 seq === pageSize+1 인지. **현 상태에서는 잠재 결함** | **gap(잠재)** |
| COMP-08 | P2 | 마지막 컬럼이 `RowActions`(연필·휴지통 — `CrudTable.tsx:190-199`)다. 요구의 (b) '인라인 편집 테이블은 RowActions' 형태 그대로이고 중복 '상세' 버튼도 없다. **다만 이 테이블은 인라인 편집(토글)과 route 편집(연필)을 함께 갖는 혼합형**이라 (a)/(b) 어느 쪽인지 모호하다 — 요구가 그 조합을 다루지 않는다 | 읽기전용 리스트에 중복 '상세' 버튼이 없는지 | **pass** |
| COMP-09 | P2 | 쿠폰명 셀(`CouponListPage.tsx:121`)에 truncate 가 없다(`tdStyle` 그대로). 60자 상한이 있어 파괴적이지는 않으나 열을 넓힌다. **형제 `ReviewListPage.tsx:78-84` 는 `contentStyle`(maxWidth + ellipsis)로 풀었다** | 60자 쿠폰명 픽스처로 표 폭이 유지되는지 | **gap(경미)** |
| COMP-11 | P1 | 사용 기간이 DS `DateRangeField`(`CouponFormPage.tsx:395-404`) — 단일 컴포넌트이고 keyboard 조작(네이티브 `<input type="date">`)·**`start ≤ end` 강제**(`validation.ts:83-90`)·**인라인 검증 메시지**('종료일은 시작일보다 빠를 수 없습니다.')를 갖는다. silent empty 가 아니다. **미충족 둘**: (a) **preset('오늘/최근 7일/이번 달/지난 달')이 없다** (b) **이것은 폼 입력이지 목록 기간 필터가 아니다** — URL list-state 반영 절은 걸리지 않는다(이 화면에 기간 필터가 없다) | 종료일<시작일 시 검증 에러가 뜨는지(pass), preset 이 범위를 채우는지(없음) | **gap(부분)** |
| COMP-12 | P2 | **미충족.** 쿠폰명(`maxLength={60}` — `:254`)·코드(`maxLength={30}` — `:275`)가 **네이티브 `maxLength` 로 조용히 자른다** — 카운터도 경고도 없다. `FormField` 는 `counter` 슬롯을 갖고(`FormField.tsx:104`) `TextareaField` 가 그것을 쓰는데(`TextareaField.tsx:52`), **`<input>` 경로에는 그 배선이 없다.** 할인값·최소주문·발급수량은 `maxLength` 조차 없어 100자를 쳐도 멈추지 않고 검증만 막는다. counting 기준(code point vs byte)도 미정의 | 60자 근접 시 카운터·경고가 뜨는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: **read 실패=인라인 Alert**(`CrudListShell.tsx:157` · `CouponFormPage.tsx:201`) · **write 성공=toast**(`useCrudForm.ts:222` · `useCrudList.tsx:108,146` · `useCrudRowUpdate.ts:49`) · **write 실패**: 폼은 배너(`FormServerError`), 토글은 error toast(`useCrudRowUpdate.ts:53`), **다이얼로그 내부 실패는 그 다이얼로그의 error 배너**(`useCrudList.tsx:161,173` — 'modal 뒤에 숨는 toast 금지' 그대로) · page 가 임의 배너 state 를 갖지 않는다. **폼의 write 실패가 toast 가 아니라 배너인 것**은 폼 맥락(입력 보존 + 그 자리 재시도)이라 `FormServerError` 의 설계 의도다(`FormFeedback.tsx:31-36`) | ConfirmDialog 내부 delete 실패가 다이얼로그 error 배너인지, 독립 write 실패가 retry toast/배너인지 | **pass** |
| FEEDBACK-03 | P1 | 모든 mutation call site 에 성공·실패 피드백이 있다: create/update(toast / 배너 + 참조 코드 — `useCrudForm.ts:222,194-195`) · delete 단건(toast / 다이얼로그 배너 — `useCrudList.tsx:108,112`) · **delete 일괄(toast / 부분 실패 배너 — `:140,146`)** · toggle(toast / error toast — `useCrudRowUpdate.ts:49,53`). no-op 클릭이 없다 | `?fail=save`·`?fail=delete` 로 각 경로가 가시 실패를 내는지 | **pass** |
| FEEDBACK-05 | P2 | 모든 delete 가 **delete-intent ConfirmDialog** 를 연다(`useCrudList.tsx:156,168`) — 단일 미확인 클릭 delete 0건. 문구에 '이 작업은 되돌릴 수 없습니다.' 비가역성 고지가 있다(`:158,170`). undo window 는 없으나 요구는 'confirm **또는** undo' 다 | 모든 delete 가 confirm 을 여는지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 표면 4종. 초기 포커스(delete/discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다. **`FormConflictDialog` 가 `intent="delete"` 를 쓰는 것은 의도적이다** — '최신 내용 불러오기'가 **내 입력을 버리는** 파괴적 선택이라 덜 파괴적인 '이어서 편집'이 기본 포커스를 받는다(`FormFeedback.tsx:55-56` 이 그 근거를 명시) | DS 판정에 종속 | **종속** |
| A11Y-04 | P1 | confirm 이 busy 로 disable 될 때 포커스를 다이얼로그 안에 유지하는 것은 DS `ConfirmDialog`/`Modal` 소관 | DS 판정에 종속 | **종속** |
| A11Y-05 | P1 | `SelectField` 표면 2개(발급 대상 `:287` · 발급 유형 `:299`). **둘 다 `isInvalid` 를 쓰지 않는다** — enum 이라 위반 값이 존재할 수 없다. 이 화면에 그 표면이 실재하지 않는다 | — | **n-a** |
| A11Y-08 | P1 | 행 클릭이 `rowActivateProps`(마우스 전용 — `CrudTable.tsx:172`, `<tr>` 에 tabIndex 없음)이고 **쿠폰명 셀이 링크가 아니다**(`CouponListPage.tsx:121` — 텍스트 노드). 키보드 등가물은 `RowActions` 의 **연필 버튼**(`CrudTable.tsx:192-197`, 접근 이름 `'<쿠폰명> 수정'`) — 같은 목적지(`onEdit`)로 간다. **도달은 가능하므로 요구의 최소선('row 내 keyboard-focusable 등가물')은 충족**한다. 다만 요구가 기대하는 형태는 'focusable **name link**' 이고, **형제 `ReturnsListPage.tsx:240-246` 은 식별자를 `<Link>` 로 승격했다** — 같은 섹션에서 형태가 갈린다 | 행을 Tab 해서 상세를 여는 컨트롤에 도달하는지 | **pass(단 형태 불일치)** |
| A11Y-13 | P1 | **충족.** `useCrudForm` 이 `handleSubmit(onValid, onInvalid)`(`:260`)를 쓰고 RHF `shouldFocusError` 기본값이 **첫 invalid 필드로 포커스를 옮긴다** — `:240-245` 주석이 '`onInvalid` 를 명시해 **계약으로** 고정한다(그 기본값이 바뀌어도 동작이 유지된다)'를 기록한다. **서버 422 도 같다** — `setError` 후 `setFocus(first.field)`(`:190`). ⚠ **잔여: 폼 진입 시 첫 편집 필드 자동 포커스가 없다** — `useCrudForm` 에 `setFocus` 초기 호출이 없다. 요구는 두 절을 다 요구한다 | 빈 필수 값으로 제출 → activeElement 가 첫 error 컨트롤인지(pass). 폼 진입 시 쿠폰명에 포커스가 가는지(현재 없음) | **gap(부분)** |
| A11Y-16 | P1 | 신규 인터랙티브 표면의 계약을 대체로 만족한다: 표 `aria-busy`(`CrudTable.tsx:116`) · caption(`:117-120`) · **지속 live region**(`CrudListShell.tsx:107-109` — 필터로 0행이 되는 전환이 announce 된다) · 필터 `aria-label`(`CouponListPage.tsx:186`) · `Empty` `role="status"` · `RowActions` `aria-label`(`RowActions.tsx`) · `ToggleSwitch` 가 `aria-checked` + **on/off 라벨('발급중'/'중지')로 이중 인코딩**(`:164-166`) · 미리보기의 꺼짐이 opacity **와** 캡션 문구로 이중 인코딩(`CouponCardPreview.tsx:129,140-144`) | 대표 page 에서 axe 통과 여부 | **pass** |
| ERP-01 | P1 | status→tone 매핑이 **화면 전용 모듈의 단일 레지스트리**다 — `types.ts:113-118` 의 `STATUS_META` + `couponStatusMeta`. per-page meta helper 를 만들지 않았다. **잔여 둘**: (a) 지역 레지스트리라 앱 전역 통합이 아니다 (b) **'중지'와 '만료'가 같은 톤(neutral)** 이라 두 semantic state 가 색으로 구분되지 않는다 — 복구 수단이 다른데(토글 vs 기간 수정) 같아 보인다 | 모든 domain status 가 정의된 tone 으로 해석되는지 | **pass(도메인 내, 톤 충돌 잔여)** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관되고 숫자가 `shared/format`(`formatNumber`)을 경유한다. **잔여**: 사용기간 셀이 날짜 문자열을 그대로 잇는다(ERP-08 참조) | 셀에 raw `toString()` 이 없는지 | **pass** |
| ERP-07 | P2 | 금액 컬럼이 **우측 정렬로 존재하지 않는다** — 소진율만 `numeric`(`:131`)이고 그 값은 `640/1,000 (64%)` 문자열이라 자릿수 정렬 대상이 아니다. 할인 셀은 좌측 정렬 `5,000원 할인`(`types.ts:86`)이라 '원'이 자릿수를 따라다니지 않는다. **요구가 지적하는 '우측 정렬 금액 컬럼'이 이 화면에 없다** | 다행 금액 컬럼의 시각 확인 — 표면 부재 | **n-a** |
| ERP-08 | P2 | 금액·건수가 `formatNumber` 를 경유한다(`types.ts:86,92` · `CouponListPage.tsx:135`). **잔여 둘**: (a) **사용기간 셀**(`:127`)이 `${item.startAt} ~ ${item.endAt}` 로 raw 문자열을 잇는다 — 값이 'YYYY-MM-DD' 가 아니면 그대로 새어 나온다 (b) 소진율이 `String(usageRate(item))`(`:135`)로 직접 조립한다 — 0–100 정수라 실害는 없다 | 셀의 raw 문자열 렌더가 0건인지 | **gap(경미)** |
| ERP-09 | P2 | **이 화면의 시각 표면은 `today = formatDate(new Date())`(`CouponListPage.tsx:95`) 하나**이며 상태 파생의 입력이다. `formatDate`(`format.ts:161-169`)는 **브라우저 로컬 getter** 기반이다 — F3b 가 `shared/format.ts` 에 KST 고정 헬퍼(`seoulDayOf` — `:142`)를 이미 세웠는데 이 화면이 쓰지 않는다. **다른 타임존의 관리자가 자정 부근에서 다른 상태를 본다**(BE-045 §7.8 이 `startAt`/`endAt` 을 KST 영업일로 판정한다). `startAt`/`endAt` 자체는 `YYYY-MM-DD` 문자열이라 변환이 없다 | UTC 러너에서 KST 자정 직후 '예정'이 '진행중'으로 넘어가는지 | **gap** |
| ERP-13 | P1 | 이 화면의 templated copy 에 **리터럴 조사 폴백이 0건**이다(`grep '이(가)\|을(를)\|은(는)\|(으)로'` = 0). 근거: 검증 오류가 `objectParticle`/`topicParticle` 를 쓰고(`validation.ts:6,22,25`), 삭제 확인·토스트가 `objectParticle(nameOf(target))`(`useCrudList.tsx:108,158`), 저장 토스트가 `objectParticle(entityLabel)`(`useCrudForm.ts:222`), 빈 상태가 `Empty` 의 자족 헬퍼(`Empty.tsx:24-27`)를 쓴다. **토글 토스트만 조사를 피해 문장을 짠다** — `'<쿠폰명>' 쿠폰을 발급중으로 바꿨습니다.`(`:158`) 는 '쿠폰을' 이 고정어라 헬퍼가 필요 없다(정확한 회피) | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass** |
| ERP-12 | P1 | **표면이 없다** — 이 화면에 export affordance 가 없다 | — | **n-a** |
| ERP-14 | P1 | **미충족.** 금액 필드 3개(할인 금액·최대 할인·최소 주문 금액)가 **masked/validated primitive 를 쓰지 않는다** — `<input type="text" inputMode="numeric">` + zod 문자열 검증이다(`:315-330,341-350,363-372`). 실시간 천단위 구분이 없고, **붙여넣은 `'1,000,000'` 은 `INT_RE = /^\d+$/`(`validation.ts:11`)에 걸려 '숫자만 입력할 수 있습니다' 로 거절**된다 — 요구가 지적하는 바로 그 증상('콤마 붙은 1,000,000 의 거절 이유를 못 안다'). 아이러니하게 **미리보기의 `toNum` 은 콤마를 지워 받아들인다**(`:194` `replace(/\D/g, '')`) — 미리보기와 검증이 다른 규칙을 쓴다 | 금액 필드에 '1,000,000' 붙여넣기 → 1000000 으로 parse 되는지 | **gap** |
| ERP-15 | P1 | **전량을 한 DOM 에 렌더한다** — `CrudTable` 이 `items.map`(`:171`)이고 cap·virtualization 이 없다. **완화**: 쿠폰은 관리자가 의도적으로 만드는 것이라 증가 속도가 느리다(BE-045 §7.6) — 교환/반품·문의와 달리 매일 쌓이지 않는다. 10컬럼 표에 가로 scroll 컨테이너도 없다 | 1,000건 픽스처로 scroll/검색이 매끄러운지 | **gap(위험 낮음)** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다 | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **부분 충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. 이 화면은 **404 · 409/412 · 422 를 실제로 분기한다** — 404 → 재시도 없는 not-found(`useCrudForm.ts:144-149`), 409/412 → 충돌 다이얼로그(`:166-179`), 422 → 필드 인라인 + 포커스(`:182-192`). **그러나 403/429/5xx 를 같은 배너로 뭉갠다**(`:194`) — `isForbidden`(`http-error.ts:93-95`)이 존재하는데 쓰지 않는다. **토글 경로는 더 심하다** — 전부 error toast 하나다(`useCrudRowUpdate.ts:53`). **BE-045 §7.3 이 코드 중복을 409 가 아니라 422 로 내려보내라고 판정하는 것도 이 축의 문제다** — 409 로 오면 '다른 사용자가 먼저 변경했습니다'라는 틀린 다이얼로그가 뜬다 | `?status=save:403` · `save:429` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | **충족(프레임워크 상속).** 서버 422 의 `violations` 를 RHF `setError` 로 그 필드에 꽂고 **첫 서버-flag 필드로 포커스를 옮긴다**(`useCrudForm.ts:182-192`). client zod error 와 **같은 인라인 슬롯**(`FormField` 의 `<p role="alert">`)을 재사용하고, form-level 배너는 generic error 전용이다(`:194` — `FormFeedback.tsx:36` 주석이 그 계약을 못박는다). ⚠ **잔여 둘**: (a) `field` 가 `aria-describedby` 로 연결되지 않는 필드가 3개 있다(A11Y-11 gap) — 422 가 `minOrderAmount` 를 지목해도 AT 에 연결되지 않는다 (b) **400 은 필드로 가지 않는다** — `isUnprocessable` 만 읽는다(`:182`). BE-045 §6.1·§7.9 #8 이 '필드 단위 거절은 422 로 낸다'를 계약으로 못박는다 | field path 있는 422 fixture(`quoteNo`/`code` 중복)가 해당 field 에 인라인 error + 포커스를 내는지. **`?status=save:422` 는 `violations` 가 비어 있어**(`dev.ts:84`) 이 경로를 재현하지 못한다 — 픽스처 어댑터에 `violations` 를 실은 422 를 넣어야 한다 | **pass(잔여 있음)** |
| EXC-10 | P1 | **미충족.** 일괄 삭제가 `settleAll(ids, …)`(`crud.ts:349-350`)로 `Promise.allSettled` semantics 를 쓰고 **부분 실패 시 다이얼로그를 열어 둔 채 `N건 중 M건을 삭제하지 못했습니다.` 를 보고**하며(`useCrudList.tsx:136-142`) **전건 성공에서만 invalidate/selection clear** 한다(`:144-146`) — **세 절이 충족된다.** ❌ **그러나 '실패 id 를 반환' 과 'retry 가 실패 item 만 타깃' 이 없다** — `settleAll` 이 **건수만** 돌려주므로 재클릭이 전건을 재실행한다(성공분 재요청). 실패 item 을 선택 유지하는 것도 불가능하다 | 부분 실패 bulk delete → 실패 count 가 보이는지(pass), 'retry failed only' 가 그 항목만 재요청하는지(불가) | **gap(부분)** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **충족.** 404 와 generic error 를 문구·복구 수단으로 가른다 — `loadFailure: 'not-found' \| 'error'`(`useCrudForm.ts:40,144-149`)를 화면이 읽어(`CouponFormPage.tsx:198-220`) 404 → '쿠폰을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'만 / 그 밖 → '쿠폰을 불러오지 못했습니다.' + '다시 시도' + '목록으로'. 근본이 갖춰져 있다 — 어댑터가 `HttpError(404)` 를 던진다(`crud.ts:105-107`). 무한 spinner 없음 | 없는 `:id`(`/products/coupons/nope/edit`)로 진입 → '찾을 수 없습니다' + '목록으로'(retry 없음)가 뜨는지. `?status=detail:500` → retry + list 둘 다 | **pass** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 폼 저장도 토글도 비관적이다(`useCrudRowUpdate` 가 `onMutate`/`setQueryData` 를 쓰지 않는다 — `onMutate` grep 0건). 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다.** ⚠ **다만 요구는 'reversible inline toggle 에 optimistic 을 쓰라'고도 읽힌다** — 발급 토글이 정확히 그 대상인데(`useCrudRowUpdate` 가 요구의 appliesTo 에 명시돼 있다) 이 화면은 pessimistic 이다. 요구의 acceptanceCheck('un-rolled-back optimistic write grep = 0')는 충족된다 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-18 | P1 | **미충족.** selection scope 가 **암묵적으로 current-page(= 보이는 전량)**다 — `onToggleAll` 이 `visibleItems.map(id)` 를 넘긴다(`CrudListShell.tsx:143-148`). 'all-matching-filter' 개념이 없다. **Shift-click range selection 없음** · **임계값 초과 강화 confirm 없음**(문구는 count 를 말하나 — `useCrudList.tsx:170-171` — type-to-confirm 이 없다) · **진행률·취소 없음**(`settleAll` 이 병렬 실행 후 건수만 준다) | Shift-click 가 범위 선택하는지, 1,200-item bulk 가 progress 를 보고 cancel 되는지 | **gap** |
| EXC-20 | P1 | **충족.** 5xx 등 예상외 실패에 **복사 가능한 error reference 를 보여준다** — `errorReference` 가 `referenceOf(cause)`(`useCrudForm.ts:195`)에서 오고 `FormServerError` 가 `오류 코드 TDS-…` 를 `userSelect: 'all'` + `tabular-nums` 로 렌더한다(`FormFeedback.tsx:13-23,44`). raw stack/서버 body/status 를 산문으로 노출하지 않는다(`:34-35` 주석이 그 계약을 명시). **`referenceOf` 는 `HttpError` 가 아니면 null 을 반환해**(`http-error.ts:115-117`) 없는 코드를 지어내지 않는다. ⚠ **잔여: 토글·삭제 실패에는 reference 가 없다** — 토스트/다이얼로그 배너가 고정 문구뿐이다 | `?status=save:500` → 폼 배너에 `오류 코드 TDS-…` 가 보이는지(pass). `?status=delete:500` → 다이얼로그 배너에는 없다(잔여) | **pass(폼 한정)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 목록 응답 p95 | ≤ 500ms (BE-045 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 상세 응답 p95 | ≤ 400ms | 위와 동일 |
| 저장(등록·수정) p95 | ≤ 700ms | 위와 동일 |
| 토글 p95 | ≤ 400ms | 위와 동일. **전체 치환 PUT 이라 페이로드가 12필드다** — 토글 하나에 필요한 것은 `enabled` 뿐이다(§4.3) |
| 삭제(일괄 N건) p95 | ≤ 700ms + N × 100ms | **측정 불가.** `settleAll` 이 **N 요청을 병렬 발사**한다(`crud.ts:349-350`) — 레이트리밋(분당 60 — BE-045 §2)에 걸린다. 100건 선택 삭제는 40건이 429 로 실패한다 |
| 첫 렌더(목록) | ≤ 1.5s (LCP) | 미측정. 전량 렌더라 건수에 선형 비례(ERP-15 gap — 위험은 낮다) |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 미리보기 재렌더 | 입력 키 입력마다 1회 | **충족(의도)** — `watch()` 9개(`:183-191`)가 폼 값 변경마다 리렌더를 일으킨다. 미리보기가 요구하는 동작이다. 다만 `toNum` 이 렌더마다 3회 돈다(`:424-426`) — 정규식 3회라 무시 가능 |
| 검색 입력당 연산 | 0 요청 (클라이언트 필터) · 커밋당 전량 스캔 1회 | **충족(요청)** / **충족(연산)** — 디바운스 250ms 가 자모당 스캔을 막는다(COMP-10 pass) |
| 저장 요청 크기 | ≤ 2KB | **충족** — `CouponInput` 이 12개 스칼라 필드다. **배열이 없어 이력에 비례해 커지지 않는다**(BE-026·BE-044 와 다르다) |
| 메모리 | 목록 전량 + 상세 1건 | 전량 보유. 증가 속도는 느리다(BE-045 §7.6) |
| 번들 | 이 화면 고유 코드 ≤ 20KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). 화면 전용 컴포넌트 1개(`CouponCardPreview` 147행) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`CrudListShell.tsx:156-165`). 툴바는 남아 조건이 화면에서 사라지지 않는다 |
| 폼 상세 조회 실패 | 404='목록으로' / 5xx='다시 시도'+'목록으로' | **충족**(EXC-12 pass) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **충족**(EXC-20 pass) |
| 저장 실패(422) | 그 입력의 인라인 오류 + 포커스 | **충족**(EXC-07 pass). **단 세 필드는 `aria-describedby` 가 없어 AT 에 연결되지 않는다**(A11Y-11 gap) |
| 저장 실패(409 동시 삭제) | conflict 다이얼로그 + 입력 보존 | **충족**(EXC-04 pass) |
| **코드 중복 실패** | `code` 필드 인라인 오류 | **미충족(계약 미정)** — 서버가 409 로 내면 '다른 사용자가 먼저 변경했습니다'라는 **틀린 다이얼로그**가 뜬다. BE-045 §7.3 이 422 로 내려보내라고 판정 |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **삭제 중 다이얼로그 닫기** | abort · reset · 통지 없음 | **충족** — `closeDelete` 가 abort + `mutation.reset()`(`useCrudList.tsx:86-92`) |
| **연타(더블클릭) — 폼** | 정확히 1개 요청 | **충족**(EXC-08 pass — `submitLockRef` + 멱등키) |
| **연타 — 토글·삭제** | 정확히 1개 요청 | **부분 충족** — 토글은 이전 요청을 abort 하고(`useCrudRowUpdate.ts:39`) 삭제는 `busy` 로 잠근다. **멱등키가 없다**(BE-045 §7.9 #4·#7) |
| 동시 편집(두 관리자) | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — last-write-wins**(토큰 없음). **`issuedCount` 가 왕복해 발급 기록까지 덮인다**(BE-045 §7.2) |
| 세션 만료 중 입력 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 쿠폰 금액 무결성

쿠폰은 **정의가 곧 금액**이며 **발급된 것은 회수할 수 없다**. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| `issuedCount` 는 서버만 늘린다 | **구조적으로 미보장.** 클라이언트가 폼 값으로 왕복시킨다(`validation.ts:44-45` · `CouponFormPage.tsx:110,124,144` · `types.ts:135`). **조작 없이도 lost update 가 난다** — 토글 클릭 한 번이 조회 시점 스냅샷 전체를 PUT 한다(`CouponListPage.tsx:155`). BE-045 §7.2 |
| 발급 수량은 발급된 수보다 작을 수 없다 | **미충족.** `intString` 이 정수만 보고 비교하지 않는다(`validation.ts:47`). 게다가 `usageRate` 가 `Math.min(100, …)`(`types.ts:92`)로 **초과 발급을 화면에서 숨긴다** |
| 쿠폰 코드는 유일하다 | **미충족.** 클라이언트·어댑터에 유일성 검사 0건(`validation.ts:32-40` 은 형식만). 같은 코드 두 쿠폰이면 **고객이 코드를 입력했을 때 어느 쿠폰이 적용되는지 정의되지 않는다**. BE-045 §7.3 |
| 발급 대상은 실제로 제한된다 | **미정.** `target` 이 유형만 있고 **대상 필드가 타입에 없다**(`types.ts:14-36`) — '특정 상품' 쿠폰과 '전체 회원' 쿠폰이 동작상 구분되지 않는다. BE-045 §7.1 |
| 발급 상태 변경은 확인을 거친다 | **미충족(의도적).** 목록 토글이 클릭 한 번이다 — 가역적이라 `FEEDBACK-02` 의 대상이 아니나, **그 클릭이 곧 '할인을 나눠준다'** 다(§1.2) |
| 발급 조건(기간·수량·활성)이 강제된다 | **미정** — 이 필드들을 읽어 발급을 막는 계약이 어디에도 없다. BE-045 §7.5 |
| 발급된 쿠폰의 삭제가 안전하다 | **미정** — EP-05 에 아무 제약이 없다. 상품 카테고리는 '사용 중이면 409'를 코드로 갖고 있다(`_shared/store.ts:690-696`). BE-045 §7.5 |
| `enabled` 를 끄면 이미 발급된 쿠폰이 못 쓰인다 | **미정** — 필드 주석이 발급만 말한다(`types.ts:34`) |
| 쿠폰 상태가 관리자마다 같다 | **미충족.** `today` 가 브라우저 로컬 시각이다(`CouponListPage.tsx:95` — ERP-09 gap). 다른 타임존의 관리자가 자정 부근에서 다른 상태를 본다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | A11Y-11 · COMP-12 | P0 · P2 | **`coupon-max-discount`·`coupon-min-order`·`coupon-quantity` 세 입력이 `error` 를 렌더하면서 `aria-invalid`·`aria-describedby` 를 세우지 않는다** — 형제 3개는 세운다. 같은 파일 안의 비일관. 오류가 색상뿐(`controlStyle`)이라 WCAG 1.4.1 도 걸린다. hint 도 `hintIdOf` 로 연결되지 않는다(`settings/_shared/fields.tsx:22` 가 선례). 카운터도 없다 | 이 화면 | A11 change_request (FS-045 §7 #17·#26) |
| 2 | IA-02 | P0 | 폼에서 AppHeader `<h1>쿠폰</h1>` + 자체 `<h1>쿠폰 등록/수정</h1>` → **`<h1>` 2개.** 브랜치 폴백은 `findCoveringLeaf` 로 해소됐고 남은 것은 h1 이중 | **앱 전역**(`AppHeader`·`findNavLabel` 모델) | A40 · A11 (FS-045 §7 #3) |
| 3 | IA-04 · COMP-06 · COMP-07 · ERP-15 | P0 · P2 · P1 | 페이지네이션 없음 — `CrudListShell` 이 `Pagination` 을 안 그린다. 스켈레톤 행 수 하드코딩 5 · `SeqCell` 오프셋 없음이 함께 붙어야 한다. **URL list state 는 이미 있어**(`useListState`) `page` 를 쓰기만 하면 된다 | **`shared/crud` 전역**(모든 CrudListShell 소비 화면) | A11 · A63 (BE-045 §7.6 · FS-045 §7 #2·#6) |
| 4 | EXC-03 | P0 | **쓰기 게이팅 미배선** — `useRouteWritePermissions` 미소비. 등록 버튼·토글·수정/삭제·일괄 삭제·제출이 전부 무조건 렌더된다. **BE-045 §7.7 이 `operator` 를 조회 전용으로 판정하므로 실사용에서 즉시 드러난다.** 형제 `products/items`·`products/returns` 는 이미 배선했다 | 이 화면 | A11 change_request (FS-045 §7 #4) |
| 5 | (§4.3) · EXC-08(잔여) | — | **`issuedCount` 가 폼 값으로 왕복한다** — 조작 위조 + **조작 없는 lost update**(토글 클릭 한 번이 전체 치환). `totalQuantity < issuedCount` 를 막는 것도 없고 `usageRate` 가 초과를 숨긴다. **토글·삭제에 멱등키가 없다** | 이 화면 + BE 계약 | **A63 (BE-045 §7.2 — 최우선)** · A11 |
| 6 | EXC-04(잔여) | — | 낙관적 동시성 **토큰**(`If-Match`/`version`) 없음 → 동시 편집 last-write-wins. 현 409 는 '존재 여부' 기반. §7.2 안 A 채택 시 용인 가능, 안 B 유지 시 필수 | BE 계약 | A63 (BE-045 §7.9 #14) |
| 7 | (§4.3) | — | **쿠폰 코드 유일성 검사가 없다** — 같은 코드 두 쿠폰이면 고객 입력 시 동작이 정의되지 않는다. **그 실패를 409 로 내면 틀린 다이얼로그가 뜬다** — 422 + `field: 'code'` 로 내야 화면 코드 0줄로 성립한다 | BE 계약 | **A63 (BE-045 §7.3)** |
| 8 | (§4.3) | — | **발급 대상이 유형만 있고 대상 필드가 없다** — '특정 상품' 쿠폰이 '전체 회원'과 동작상 구분되지 않는다. 세 해석 중 무엇도 코드에 근거가 없어 **'미정'** | **A01 (선행)** · A63 (BE-045 §7.1) · A11 (FS-045 §7 #1) |
| 9 | (§4.3) | — | **발급 실행 경계 미정** — 발급 조건의 강제 주체 · 발급된 쿠폰의 삭제 · `enabled` 가 사용도 막는지 | **A01 (선행)** · A63 (BE-045 §7.5) |
| 10 | COMP-01 | P1 | 제출 버튼이 `loading` prop 대신 손으로 쓴 '저장 중…' 라벨(`:446`). 형제 `ReturnDetailPage.tsx:355` 는 `loading={saving}` | 이 화면 | A11 change_request (FS-045 §7 #21) |
| 11 | EXC-06 | P1 | 403/429/5xx 를 한 배너로 뭉갬. **토글 경로는 전부 error toast 하나** — 409 도 토스트로 뭉개져 폼과 UX 가 갈린다 | 이 화면 | A11 change_request (FS-045 §7 #23·#25) |
| 12 | EXC-10 · EXC-18 | P1 | 일괄 삭제가 실패 id 를 모른다(건수만) — retry 가 전건 재실행. Shift-click 없음 · 임계값 강화 confirm 없음 · 진행률·취소 없음. **N 요청 병렬 발사가 레이트리밋에 걸린다**(§4.1) | **`shared/crud` 전역** | A11 change_request (FS-045 §7 #8) |
| 13 | ERP-14 | P1 | 금액 3필드에 masked input 없음 — **붙여넣은 '1,000,000' 이 거절된다**. 미리보기의 `toNum` 은 콤마를 받아들여 **미리보기와 검증이 다른 규칙**(FS-045 §7 #19) | 이 화면 + 공유 field adapter | A11 change_request |
| 14 | ERP-09 | P2 | `today` 가 브라우저 로컬 시각(`:95` `formatDate(new Date())`) — `format.ts:142` 의 `seoulDayOf` 를 쓰지 않는다. 다른 타임존 관리자가 자정 부근에서 다른 상태를 본다 | 이 화면 | A11 (FS-045 §7 #9 · BE-045 §7.9 #9) |
| 15 | COMP-11 · A11Y-13(잔여) | P1 | 사용 기간에 preset 없음. 폼 진입 시 첫 필드 자동 포커스 없음(검증 실패 포커스는 pass) | 이 화면 + DS | A11 change_request (FS-045 §7 #18) |
| 16 | STATE-05(잔여) | P1 | 빈 상태의 진짜 0건 분기에 생성 CTA 없음 — `CrudTable` 이 `empty.createAction` 슬롯을 받는데 넘기지 않는다 | 이 화면 | A11 change_request (FS-045 §7 #7) |
| 17 | ERP-01(잔여) · ERP-08 · COMP-09 | P1 · P2 | '중지'와 '만료'가 같은 톤(neutral) — 복구 수단이 다른데 색이 같다. 사용기간 셀이 raw 날짜 문자열. 쿠폰명 truncate 없음 | 이 화면 | A11 (FS-045 §7 #11·#22·#10) |
| 18 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | A40 · A11 (FS-045 §7 #27) |
| 19 | (FS-045 §7 #5) | — | 이탈 가드가 `navigate()` 프로그램 이동('목록으로'·'취소')을 가로채지 못한다 | 이 화면 | A11 change_request |
| 20 | (FS-045 §7 #16) | — | **선택 상태가 두 벌 마운트된다** — `useCrudList` 의 `useRowSelection` 과 `useListState` 의 `selectedIds`. 화면은 전자만 쓰고 후자는 방치된다. EL-015 가 후자의 기능(뷰 서명 변경 시 해제)을 손으로 다시 한다 | 이 화면 + `shared/crud` | A11 change_request |
| 21 | (FS-045 §7 #20) | — | 미리보기 꺼짐이 `opacity: 0.55` 리터럴 — **quality-bar TOKEN-07(P1)이 'coupon/review preview-disabled' 를 appliesTo 에 명시 지목**. `ReviewPreview.tsx:139` 도 같다 | 이 화면 + tokens | A11 change_request |
| 22 | (FS-045 §7 #24) | — | 토글을 여러 행에 잇달아 누르면 **이전 요청이 abort 되고 조용히 사라진다**(`useCrudRowUpdate.ts:39` — controllerRef 1개) | `shared/crud` | A11 change_request |
| 23 | (BE-045 §7.9 #6·#8) | — | `maxDiscount` 에 검증 없음(`z.string()`) — 서버가 유일한 방어선. **필드 단위 거절을 400 이 아니라 422 로 내는 계약**이 BE-003 §2.1 과 조정돼야 한다 | BE 계약 | A63 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`couponAdapter` 는 `scope: 'coupons'`(`data-source.ts:76`)로 `failIfRequested(scope, op)` 를 부른다. **`createCrudAdapter` 의 4개 op 가 전부 실재한다** — 이 화면은 CRUD 전부에 호출부가 있다:

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| `list` | `fetchAll` (`crud.ts:96`) | `?fail=list` · `?fail=coupons:list` · `?fail=all` | FS-045-EL-012 |
| `detail` | `fetchOne` (`crud.ts:101`) | `?fail=detail` · `?fail=coupons:detail` · `?fail=all` | FS-045-EL-019 (**수정 라우트에서만** — 등록은 상세를 조회하지 않는다) |
| `save` | `create`(`crud.ts:112`) **와** `update`(`crud.ts:120`) — **같은 op 를 공유한다** | `?fail=save` · `?fail=coupons:save` · `?fail=all` | FS-045-EL-020(폼) **와** EL-009.10(토글)이 **함께 실패한다** |
| `delete` | `remove` (`crud.ts:135`) | `?fail=delete` · `?fail=coupons:delete` · `?fail=all` | FS-045-EL-013(단건) **와** EL-014(일괄)가 함께 실패한다 — **일괄은 전건 실패가 되어 부분 실패를 재현하지 못한다** |

- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **필터 변경·`staleTime` 30초 경과 후 재진입**으로 한다.
- **부분 실패(EXC-10) 재현 불가**: `?fail=delete` 는 **모든** `remove` 를 실패시켜 `N건 중 N건 실패` 가 된다. '일부만 실패'를 재현하려면 픽스처 어댑터에 id 조건부 실패를 넣어야 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-71`) — 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`:27-37`).

| 판정 | 재현 |
|---|---|
| EXC-12 (상세 404 vs 5xx) | `?status=detail:404` vs `?status=detail:500` — **두 화면이 다르면 pass**(현재 pass) |
| EXC-04 (409 conflict) | `?status=save:409` — **충돌 다이얼로그가 뜨고 '이어서 편집'이 입력을 지키면 pass**(현재 pass). `save:412` 도 같은 UX 로 수렴하는지(`isConflict` — `http-error.ts:105-107`) |
| EXC-03 (403 강등) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/products/coupons` 의 `create`/`update`/`remove` 를 끄면 버튼이 사라져야 한다(현재 gap) |
| EXC-06 (status별 surface) | `?status=save:403` · `save:429` · `save:500` — 전부 같은 배너면 gap(현재 gap) |
| EXC-02 (401 재인증) | `?status=list:401` — `/login?returnUrl=%2Fproducts%2Fcoupons&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — 폼 배너에 `오류 코드 TDS-…` 가 보이면 pass(현재 pass). **`?fail=save` 로는 재현되지 않는다** — generic `Error` 에는 `reference` 가 없어 `referenceOf` 가 null 을 준다(정확한 동작) |
| EXC-07 (422 필드 매핑) | **`?status=save:422` 로는 재현되지 않는다** — `dev.ts:84` 가 `new HttpError(status, STATUS_MESSAGE[status])` 로 **`violations` 없는** 오류를 던진다. `useCrudForm.ts:182` 가 `cause.violations.length > 0` 을 요구하므로 **일반 배너로 떨어진다.** 재현하려면 어댑터에 `violations` 를 실은 422 를 넣어야 한다 |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · COMP-02 · COMP-03 · A11Y-11 · A11Y-12 · ERP-13 판정) · RTL(A11Y-11 의 describedby↔alert id 일치 — **이 화면에서 gap 을 잡는 결정적 도구다**: `error={errors.…}` 6건 중 `aria-invalid` 3건) · `coupons.test.ts`(할인 표기·소진율·상태 파생·필터·정렬 순수 규칙 `:34-84` + **`couponSchema` 폼 검증 `:110-139`** — 교차 검증 2건을 전부 고정한다. **이 화면에 컴포넌트 테스트는 없다**).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] 모든 `N/A` 에 사유를 댔다(FEEDBACK-06 폼 modal 부재 · A11Y-12 토글 필터 부재)
- [x] §2.1 산수 검산 — 14 pass + 10 종속 + 2 n-a + 4 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1) — 그래서 STATE-01/04 · FEEDBACK-02 · EXC-04/08/09 가 `pass` 다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다. 표면이 없는 것(A11Y-05 · ERP-07 · ERP-12)은 `n-a` 로 사유를 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`coupons`)와 op 4종을 **어댑터 코드에서 확인**했고, **`?delay=` 를 쓰지 않았다**. **`?status=save:422` 가 `violations` 없이 던져 EXC-07 을 재현하지 못한다**는 사실과 **`?fail=delete` 가 부분 실패를 재현하지 못한다**는 사실을 명시했다
- [x] **'판정 기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다. **이번 기준 갱신으로 뒤집힌 판정은 없다** — MOTION-01/02/03 의 근거가 바뀌었을 뿐(오버레이 모션 구현 · `ToggleSwitch.css:79-84` 게이트 신설로 발급 토글의 낡은 위반 주장이 해소) 소유가 DS 라 셋 다 `종속` 그대로다(§1)
- [x] §5 의 gap 이 FS-045 §7 · BE-045 §7.9 와 일치한다
- [x] **금액 정의 화면의 성격(§1.2)** 을 밝히고 §4.3 에 quality-bar 밖 축(쿠폰 금액 무결성)을 별도로 세웠다. **폼에는 EXC-04/08 이 걸리고 토글·삭제에는 안 걸리는 비대칭**을 P0 판정과 §4.2·§4.3 에 일관되게 기록했다
