---
id: NFR-046
title: "적립금 정책 비기능 명세"
functionalSpec: FS-046
backendSpec: BE-046
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-046. 적립금 정책 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-046 적립금 정책 (`/products/points`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-046(요소·예외) · BE-046(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-046 §7 · BE-046 §7.8 과 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음.** MOTION-01/02 의 **근거**가 바뀌었으나(오버레이 모션이 CSS-only 로 구현 — §2) 소유가 DS 라 판정은 `종속` 그대로다. **MOTION-03 은 근거조차 바뀌지 않았다** — 새로 생긴 `ToggleSwitch` reduced-motion 게이트가 이 화면에 걸릴 표면이 없다(이 화면에 `ToggleSwitch` 가 없다) |

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

**담당 4화면 중 표면이 가장 좁고(`N/A` 7건), 판정이 가장 갈린다.**

- **목록이 없다.** 단일 문서 폼 하나뿐이라 STATE-04 · COMP-10 · IA-04 · IA-13 이 전부 표면 부재다.
- **화면의 6/7 영역을 `DocumentFormShell` 이 소유한다**(FS-046 §2) — 이 화면이 직접 그리는 것은 필드 7개뿐이다. 그래서 **결함의 다수가 셸 소유**이며 이 화면만 고쳐서는 해소되지 않는다.
- **IA-02 를 통과하는 담당 유일 화면이다** — `DocumentFormShell` 이 in-content `<h1>` 을 그리지 않고 `CardTitle`(`<h2>`)만 쓰기 때문이다. **형제 폼/상세 화면들이 따라야 할 선례다.**
- **그러면서 금액 규칙을 정의한다.** 적립률 1%→50% 는 클릭 몇 번이고 그 효과는 모든 신규 주문에 걸린다. 그런데 **낙관적 동시성이 전무하고**(BE-046 §7.4) **누가 바꿨는지 기록되지 않는다**(BE-046 §7.5). **quality-bar 가 그 축을 다루지 않으므로 §4.3 이 그것을 맡는다.**

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | `PointsPolicyPage.tsx:95` 가 `const loading = isFetching && data === undefined` 를 **로컬로 파생**한다 — `useDocumentQuery`(`document.ts:38-46`)의 `isFetching` 을 loading 으로 직결하지 않는다. 그 값만 `DocumentFormShell` 의 스켈레톤 분기(`:127-135`)를 지배하고 `aria-busy="true"` 는 스켈레톤 노드에만 붙는다(`:128`) — **재조회 중에는 폼이 그대로 유지되고 스켈레톤이 뜨지 않는다.** `{first-load(스켈레톤), refetching-with-data(폼 유지), error(배너)}` 가 정확히 갈린다. **empty 상태는 표면 자체가 없다** — 단일 문서라 0행이 성립하지 않는다(`document.ts:25-29` 의 `fetch` 는 언제나 `doc` 을 돌려준다) | `/products/points` 진입 → 폼 렌더 확인 → `staleTime` 30초 경과 후 재진입으로 재조회 유발. **폼이 스켈레톤으로 바뀌면 gap.** `?fail=load` 로 error 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | 조회 실패 시 `DocumentFormShell.tsx:102-115` 가 화면 전체를 위험 톤 `Alert` '내용을 불러오지 못했습니다.' + **'다시 시도'**(`onRetry` — `PointsPolicyPage.tsx:125` `() => void refetch()`)로 대체한다. **toast 로 처리하지 않고**(이 화면의 `toast` 소비는 저장 성공 1곳 — `:107`) **empty 로 폴백하지 않는다**(`loadFailed` 분기가 폼보다 앞선다 — `:102`) | `?fail=load` · `?fail=points-policy:load` 로 진입. **인라인 danger Alert 가 뜨고 '다시 시도'가 쿼리를 재발행하면 pass.** error toast 가 나오면 gap. **잔여(이 요구의 gap 은 아니다)**: 문구가 '적립금 정책' 이 아니라 도메인 없는 '내용'이다(FS-046 §7 #8) | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면에 ① **목록이 없고** ② 따라서 페이지네이션·`total`·행 선택이 전부 없다. 단일 문서 폼 하나뿐이다(`App.tsx:238` — `/products/points` 라우트 1개, 하위 라우트 없음). 'out-of-range page' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 존재하지 않는다 | 목록이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 모든 스타일 값이 `var(--tds-*)` 만 참조한다. `pages/products/points/**` 에 primitive tier 밖 hex · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 이 화면의 로컬 스타일은 `rowStyle` **하나뿐**이고(`PointsPolicyPage.tsx:30-34`) 파생 치수는 `calc(var(--tds-space-6) * 6)` 같은 space 토큰 배수다. `box-shadow`·opacity 리터럴 0건 — **형제 화면(쿠폰·리뷰)의 `opacity: 0.55` 같은 잔여가 없다** | `grep -rnE "#[0-9a-fA-F]{3,8}\|[0-9]+px\|(outline\|border): ?'?(thin\|medium\|thick)" apps/admin/src/pages/products/points` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면: `tds-ui-input tds-ui-focusable`(`:156` — 숫자 입력 6개가 배열에서 파생돼 전부 같은 클래스) · DS `<SelectField>`(`:131`) · DS `<Button>`(`DocumentFormShell.tsx:145`) · 이탈 가드 `ConfirmDialog` 의 버튼. **이 화면이 focus ring 을 직접 선언하지 않는다** — 두께 계약은 `ui.css`/DS 가 소유 | DS 토큰 문서 판정을 따른다. 이 화면에서 `:focus-visible` outline 을 선언하는 로컬 CSS 가 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: **스켈레톤 펄스**(`tds-ui-skeleton` — `DocumentFormShell.tsx:130`) · Toast(`:107`) · DS `<Button>` transition · 이탈 가드 Modal. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`DocumentFormShell.tsx:122`) · Toast · 이탈 가드 `ConfirmDialog` 의 Modal. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다**(`grep '<h1' pages/products/points` = 0건 — `DocumentFormShell` 도 그리지 않는다). 요구의 'page `<h1>`' 표면은 **AppHeader 가 소유한다**(`AppHeader.tsx:52-55,101` — `titleStyle = { ...pageTitleStyle, marginTop }` → `styles.ts:51-61` 의 `--tds-typography-title-xl-*`). 이 화면의 heading 표면은 `CardTitle`(`<h2>` — `shared/ui/Card.tsx:39`)이고 그것이 `cardTitleStyle`(`styles.ts:106-118` — `--tds-typography-title-md-*`)을 소비한다. **KPI/StatsCard 값 표면은 없다.** 이 화면이 typography 값을 손으로 재현하는 곳이 0건이다 | AppHeader·tokens 판정에 종속. 이 화면에서는 `pageTitleStyle`/`cardTitleStyle` 을 재선언하는 로컬 style object 가 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 이 화면에 **text-search·filter 입력이 하나도 없다** — 목록이 없기 때문이다. 입력 7개는 전부 **폼 필드**(설정 값)이고 query 를 발행하지 않는다. `SearchField` grep 0건 · `useDebouncedSearch` grep 0건 · `useListState` grep 0건. **IME 조합이 걸리는 표면이 있기는 하다**(자유 텍스트 입력) — 그러나 이 화면의 입력은 전부 `inputMode="numeric"` 숫자 필드라 IME 조합 자체가 발생하지 않고(`:155`), select 는 조합 대상이 아니다 | 검색·필터 입력이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| FEEDBACK-02 | FEEDBACK | 상속 | **이 화면에 파괴적 서버 액션이 없다** — 삭제·일괄 작업이 없고(단일 문서) 저장은 가역적이다(다시 고쳐 저장하면 된다). 걸리는 표면은 **discard intent 하나**: 이탈 가드가 렌더하는 `ConfirmDialog`(`DocumentFormShell.tsx:100,157` → `useUnsavedChangesDialog`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 가 소유한다. busy/abort 절은 이 다이얼로그에 서버 요청이 없어 무관하다 | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 discard 다이얼로그가 실제로 뜨는지만 확인(FEEDBACK-04 절차와 동일). **주의**: '저장'이 비가역이 아니라는 판정은 **정책 값**에 한한다 — 그 정책이 만든 적립금은 회수할 수 없지만 그것은 이 화면의 액션이 아니다(§4.3) | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | `PointsPolicyPage.tsx:126-127` 이 `dirty={isDirty}` + `unsavedMessage={UNSAVED_MESSAGE}` 를 `DocumentFormShell` 에 넘기고, 셸이 `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })`(`:100`)를 배선한다. `isDirty` 는 **RHF `formState.isDirty`**(`PointsPolicyPage.tsx:80`) — 요구가 명시한 기준 그대로다. 3경로(beforeunload · 앱 내 링크 capture · popstate sentinel)는 훅이 소유한다(`useUnsavedChangesDialog.tsx:8-14`). 저장 성공 시 `reset(values)`(`:106`)가 폼을 방금 저장한 값으로 재기준화해 **dirty 가 즉시 풀린다** — 요구의 '폼이 not-dirty 가 되는 즉시 가드를 해제한다' 그대로다. **이 화면은 형제들의 잔여 결함이 없다** — `navigate()` 프로그램 이동(back-link·취소 버튼)이 **아예 없어** '가드가 프로그램 이동을 못 잡는다'가 발현되지 않는다 | 폼에 입력 → ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과 | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 폼이 라우트 본문의 `Card` 다(`DocumentFormShell.tsx:121-154`). 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 입력 필드가 없는 확인 다이얼로그다(그 자신이 FEEDBACK-04 의 산물이다) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success('적립금 정책을 저장했습니다.')`(`:107`) **하나뿐**이다. 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다 | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(`DocumentFormShell.tsx:157`) **하나뿐**. `aria-describedby`→message 배선은 DS `Modal`/`ConfirmDialog` 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-11 | A11Y | 직접 | **이 화면의 폼 컨트롤 7개를 전수 확인했다 — 전부 충족한다.** ① **숫자 입력 6개** — `NUMBER_FIELDS` 배열(`:44-68`)에서 파생돼(`:141-166`) **하나의 렌더 경로를 공유한다**: `aria-invalid={fieldError !== undefined}` + `aria-describedby={fieldError !== undefined ? errorIdOf(spec.id) : undefined}` 를 **짝으로** 세우고(`:160-161`), 감싸는 `FormField htmlFor={spec.id} … required error={fieldError}`(`:144-151`)가 `<p id={errorIdOf(spec.id)} role="alert">` 를 렌더한다(`FormField.tsx:110-112`) — **id 가 파생 함수 하나에서 나와 어긋날 수 없다.** 자식이 네이티브 `input` 이라 `withAriaRequired` 가 런타임에 `aria-required` 를 주입한다(`FormField.tsx:36-56`). ② **적립 기준 select**(`:130-138`) — 오류 상태가 없어(`z.enum` 이라 위반 값이 불가능) `aria-invalid` 를 세우지 않으므로 짝 요구가 발생하지 않는다. 자식이 DS `SelectField` 라 `aria-required` 주입 대상이다. **짝 없는 `aria-invalid` 0건.** **배열 파생이 이 결과를 만들었다** — 형제 `CouponFormPage` 는 6개 필드를 손으로 써서 3개가 짝을 빠뜨렸다(NFR-045 §2 A11Y-11 gap). **같은 팀, 같은 primitive, 다른 결과** | `grep -rn "aria-invalid" apps/admin/src/pages/products/points` → 1건(`:160`, 다음 줄이 describedby). RTL 로 '사용 단위'에 '0' 을 넣고 제출 → `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 와 `input.getAttribute('aria-required') === 'true'` 를 assert. **경미 잔여**(이 요구의 acceptanceCheck 밖): `spec.hint` 가 있는 두 필드(`earnRate`·`maxUseRate` — `:50,65`)의 hint 가 유효 상태에서 `hintIdOf` 로 연결되지 않는다 — `settings/_shared/fields.tsx:22` 는 그 배선을 갖고 있다(§5 #7) | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 이 화면에 **좌측 필터 list item 이 없다** — 필터 자체가 없다(목록이 없다). 이 화면 전체에 `aria-current`·`aria-pressed` grep **0건** | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면: 이탈 가드 `ConfirmDialog`(`DocumentFormShell.tsx:157`). enter/exit transition 은 DS `Modal` organism 이 소유한다 | DS Modal 판정에 종속. **오버레이 모션은 구현됐다 — 단 라이브러리가 아니라 CSS-only 다**: Motion/framer-motion 은 **여전히 미도입**(package.json 19개·import·lockfile 전부 0건)이나 backdrop fade enter(`Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134`) · exit(`:30-33` → `tds-modal-backdrop-out :136-144`) · dialog enter(`:58-59` → `tds-modal-dialog-in :146-156` — opacity 0→1, `scale(0.96)→scale(1)`) · exit(`:35-38` → `tds-modal-dialog-out :158-168`, `forwards`)가 `component.overlay` recipe(`tokens/tokens.json:1286-1308` — enter 250ms/decelerate · exit 150ms/accelerate)를 소비한다. 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd` 로 동등 달성**(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`). reduced-motion 게이트 `Modal.css:173-180`. **잔여 — 애니메이션되는 닫힘은 Modal 소유 3경로뿐**(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`, 전부 `requestClose` `:122-126` 경유): **footer 버튼은 여전히 즉시 언마운트**(`Modal.tsx:27-31` 이 명시 — 조립하는 쪽 버튼이라 `onClose` 가 아니라 호출부 콜백 직행). **이 화면의 유일한 modal 이 그 잔여에 정면으로 해당한다** — 이탈 가드의 '취소'(`ConfirmDialog.tsx:145-147`)와 '나가기'(`:148-156` · discard intent 라벨 `:97`)가 곧 주된 닫기 수단이라 실제로 퇴장을 타는 경로는 Esc·딤뿐이다. **라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트(`:107`). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속. **toast exit 은 완전 구현이다** — `.tds-toast--exiting`(`Toast.css:32-37`)이 `tds-toast-out … forwards` + `pointer-events:none` 을 걸고 keyframes(`:121-131`)가 opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))` 로 등장(`:26-27`/`:109-119`)의 역순을 그린다. `exit-duration`={motion.duration.fast}(150ms) · `exit-easing`={motion.easing.accelerate} 라 **요구가 명시한 'exit duration fast~normal, easing accelerate' 를 정확히 충족**한다. reduced-motion 게이트 `:136-141`. 이 화면은 표면이 1종이라 노출이 가장 얕다 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: **스켈레톤 펄스**(`tds-ui-skeleton` — `DocumentFormShell.tsx:130`) · Toast · Modal · DS Button transition. **이 화면이 transform/transition 을 직접 선언하지 않는다**(grep 0건). **요구가 명시적으로 지목한 `ToggleSwitch` 는 이 화면에 없다** — 형제 화면(쿠폰·리뷰·배송)에만 있다(`pages/products/points` 전체에 `ToggleSwitch` grep 0건). 그래서 **DS 가 새로 세운 `ToggleSwitch` reduced-motion 게이트(`ToggleSwitch.css:79-84`)는 이 화면에 걸릴 표면이 없다** — 이 화면이 상속하는 게이트는 Toast(`Toast.css:136-141`) · Modal(`Modal.css:173-180`) 둘이다 | 전역 motion config·`ui.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인 | **종속** |
| IA-01 | IA | 직접 | 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:238` — `{ path: '/products/points', element: <PointsPolicyPage />, implemented: true }`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 `DocumentFormShell` 의 평범한 `<div style={pageStyle}>`(`DocumentFormShell.tsx:118`)다 | 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족 — 담당 4화면 중 유일하다.** ① `/products/points` 는 **nav 잎**이다(`nav-config.ts:150` — `['적립금', '/products/points']`). `findCoveringLeaf`(`:269-279`)가 자기 자신을 찾아 `findNavLabel`(`:297-298`)이 '적립금'을 돌려주고 AppHeader 가 그것을 `<h1>` 으로 렌더한다(`AppHeader.tsx:92,101`). **브랜치 폴백('상품 관리')이 걸리지 않는다.** ② **이 화면이 in-content `<h1>` 을 그리지 않는다** — `grep '<h1' pages/products/points` = 0건이고 `DocumentFormShell` 도 그리지 않는다(카드 제목이 `CardTitle` = `<h2>` — `shared/ui/Card.tsx:39`). 결과: **`<h1>` 이 정확히 1개**이고 title 소스가 하나(AppHeader)로 정의된다. ③ **sub-route 가 없어** '구체적 title vs 브랜치 라벨' 문제 자체가 발생하지 않는다(`App.tsx:238` — 라우트 1개). **요구가 정의하는 '단일 page-header/title 모델'이 성립한다.** ⚠ **다만 이것은 화면 타입의 행운이기도 하다** — 이 화면은 등록/수정 구분이 없어 AppHeader 의 잎 라벨만으로 충분하다. 형제 폼/상세는 그렇지 않다 | `/products/points` 진입 후 `document.querySelectorAll('h1').length` 확인. **1 이면 pass**(현재 1). AppHeader 의 가시 title 이 '적립금'인지 확인 | **pass** |
| IA-04 | IA | N/A | **표면이 없다.** 이 화면은 **list 화면이 아니다** — 단일 문서 설정 폼이다. toolbar·결과 count 요약·SelectionBar·table·Pagination 이 **하나도 없고 있어야 할 이유도 없다**(`PointsPolicyPage.tsx:117-169` 가 화면 전부다). 요구의 appliesTo(`CrudListShell`·모든 `*ListPage`)에 이 화면이 없다 | 목록이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** 이 화면에 **엔티티 create·edit 폼 라우트 쌍이 존재하지 않는다** — 단일 문서라 '만들기'가 없다(문서는 언제나 존재한다 — BE-046 §4 EP-01). `App.tsx:238` 이 라우트 1개뿐임을 보인다. '`:id` 로 구분되는 하나의 컴포넌트/route 쌍' 이라는 요구 자체가 걸리지 않는다 | 엔티티 폼이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** 이 화면에 **list query state(page · page-size · filters · keyword · sort)가 하나도 없다** — 목록이 없기 때문이다. `useListState` grep 0건 · `useSearchParams` grep 0건. URL 에 직렬화할 조회 상태가 존재하지 않으며, `/products/points` 는 **그 자체로 완전한 링크**다(Back/refresh/공유가 전부 같은 화면을 낸다). 요구의 appliesTo(`shared/crud(useCrudList)`·모든 `*ListPage`·좌측 필터·DateRangeFilter)에 이 화면이 없다 | 목록·필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` 바로 바깥에 두는 `ErrorBoundary`(`AppShell.tsx:484-493` + `shared/errors/ErrorBoundary.tsx` · `RouteErrorScreen`). 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속 | **종속** |
| EXC-02 | EXC | 상속 | ① 진입 가드 `RequireAuth` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → `handleQueryLayerError` → `isUnauthorized` → `notifySessionExpired()`(`queryClient.ts:31-44`). **이 화면의 조회·저장이 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. `?status=load:401` 로 `/login?returnUrl=%2Fproducts%2Fpoints&reason=session_expired` 로 이동하는지 확인 | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족.** ✅ 충족(상속): **read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490-492`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. 잎 라우트라 `resourceIdForPath('/products/points')` 가 `page:/products/points` 로 정확히 풀린다(`route-resource.ts` → `findCoveringLeaf`). ❌ **미충족(직접): write 액션 게이팅이 없다.** `useRouteWritePermissions`(`RequirePermission.tsx:45-52`)를 **소비하지 않는다**(grep: 이 디렉터리 0건). 그래서 쓰기 권한 없는 역할이 **7개 필드를 전부 편집하고 '저장' 버튼을 누른다**(`DocumentFormShell.tsx:145-152` — `disabled` 가 `!dirty \|\| saving \|\| loading` 뿐). 강등 reconcile 도 없다 — 서버 403 이 '저장하지 못했습니다. **잠시 후 다시 시도해 주세요.**' 로 뭉개진다(`PointsPolicyPage.tsx:111`) — **잠시 후에도 영원히 403 이다.** **같은 단일 문서형 형제 셋은 이미 배선했다**: `settings/site/SiteSettingsPage.tsx:109` · `settings/languages/LanguagesPage.tsx:126` · `settings/oauth/OAuthPage.tsx:78`(전부 `canUpdate`). **이 화면과 `products/shipping` 만 빠졌다**(grep 확인). **BE-046 §7.6 이 `operator` 를 조회 전용으로 판정하므로 이 gap 은 실사용에서 즉시 드러난다** | 권한 스토어에서 `page:/products/points` 의 `update` 를 끈 뒤 `/products/points` 진입. **필드가 편집 가능하고 '저장' 버튼이 그대로 보이면 gap.** `read` 를 끄면 403 화면이 뜨는지도 확인(이쪽은 pass) | **gap** |
| EXC-04 | EXC | 직접 | **미충족 — 담당 4화면 중 가장 무방비다.** ① **낙관적 동시성 토큰이 없다** — `pointsPolicyStore.save(input, signal)` 이 `If-Match`/`version`/`ETag` 를 보내지 않는다. **보낼 자리 자체가 없다**: `DocumentStore.save: (input: T, signal?) => Promise<void>`(`document.ts:18`)에 context 파라미터가 없다 — `CrudAdapter` 는 `WriteContext`(`crud.ts:30-42`)를 이미 갖고 있는데 그 대응물이 없다. ② **충돌을 감지할 수 없다** — `createDocumentStore.save` 가 **`doc = input` 한 줄**이라(`document.ts:33`) **항상 성공한다.** 형제 `createCrudAdapter.update` 는 같은 자리에서 없는 id 에 409 를 던지는데(`crud.ts:126-128`) **단일 문서에는 그 가드가 원리적으로 성립하지 않는다**(문서는 언제나 존재한다). **F3b 가 CRUD 쪽에서 닫은 구멍이 여기서는 열린 채 남았다.** ③ **409/412 를 해소할 UI 가 없다** — `DocumentFormShell` 이 `serverError: string \| null` 만 받고(`:76`) conflict 슬롯이 없다. `FormConflictDialog`(`FormFeedback.tsx:58-74`)가 이미 공유 컴포넌트인데 셸이 그것을 받지 않는다. **실질 위험**: 두 관리자가 정책을 동시에 고치면 **전체 치환 PUT 이라 나중 사람의 7필드 스냅샷이 앞선 변경을 통째로 덮는다** — 적립률 3% 가 1% 로 조용히 되돌아가고 성공 토스트가 뜬다(BE-046 §7.4). **`issuedCount` 같은 서버 소유 필드가 없어 위조 위험은 없다** — 순수한 lost update 다 | `?status=save:409` 또는 `save:412` 로 저장. **conflict 다이얼로그 없이 '저장하지 못했습니다' 배너만 뜨면 gap.** 토큰 부재는 `grep -rn "If-Match\|version\|ETag" apps/admin/src/pages/products/points apps/admin/src/shared/crud/document.ts` → 0건으로 확인. **유령 저장은 재현할 수 없다** — `save` 가 언제나 성공하므로 코드로 판정한다(`document.ts:33`) | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** `onValid`(`:98-115`)에 **동기 제출 락(`submitLockRef`)이 없고 멱등키도 없다** — 이 화면이 `useCrudForm` 이 아니라 `useForm`(RHF 직접) + `useSaveDocument` 를 쓰기 때문이다. 그 훅의 두 장치(`useCrudForm.ts:103` `submitLockRef` · `:118-123,211` `idempotencyKeyRef`)를 상속하지 못했다. **멱등키는 자리 자체가 없다** — `SaveVars = { input, signal }`(`document.ts:48-51`)에 `idempotencyKey` 가 없다(`CrudAdapter` 의 `WriteContext` 와 대조된다). 방어는 `disabled={!dirty \|\| saving \|\| loading}`(`DocumentFormShell.tsx:149`) 하나뿐이고, **버튼이 `type="submit"` 이라 RHF 비동기 검증(zodResolver)이 먼저 돈다** — `saving` 이 true 가 되기까지의 틈이 요구가 지적하는 바로 그 창이다. **완화 요인**: 저장이 **문서 전체 치환**이라 두 번 실행돼도 최종 상태가 같다 — **이중 지급이 아니다.** 개별 회원의 적립금 지급(`useAddPointHistory` — 요구가 '정확하다'고 인정한 정본)은 이 화면이 아니라 `PointsCard` 소관이며(FS-046 §1 범위 밖) **그쪽은 멱등키를 이미 갖고 있다**(`pages/members/data-source.ts:243-253`). **그러나 요구가 명시한 두 장치(sync lock + per-attempt idempotency key)는 부재이고**, BE-046 §7.4 가 판정하듯 **진짜 위험은 중복이 아니라 lost update** 다(EXC-04) | 폼에서 '저장'을 최대한 빠르게 2회 클릭(또는 Enter 연타). **요청이 2건 발사되면 gap.** 코드상 `grep -rn "submitLockRef\|idempotencyKey" apps/admin/src/pages/products/points apps/admin/src/shared/crud/document.ts` = **0건**으로도 판정된다 | **gap** |
| EXC-09 | EXC | 직접 | 세 지점 중 실재하는 것이 전부 배선돼 있다. ① **onError** — `if (isAbort(cause)) return;`(`:110`)로 abort 를 실패로 처리하지 않는다(배너 없음). ② **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:88`)가 이탈 시 진행 중 저장을 취소한다. ③ **onSuccess 의 aborted 가드는 없으나 불필요하다** — `createDocumentStore.save` 가 `await wait(LATENCY_MS, signal)`(`document.ts:31`)로 시작해 abort 시 **reject 하므로 성공 경로에 도달하지 않는다**(형제 `ReturnDetailPage.tsx:193` 은 방어적으로 가드를 두었다 — 그쪽이 더 안전하나 이쪽도 계약을 어기지 않는다). ④ **mutation.reset** — 요구의 그 절은 '다이얼로그 close handler' 대상인데 **이 화면에 in-flight 중 닫을 다이얼로그가 없다**(이탈 가드는 서버 요청과 무관하다). abort → `onError` → `isPending` 이 자연히 false 가 된다. ⑤ **bulk 표면이 없어** '실패 count 에서 abort 제외' 절은 무관하다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다 | 저장 중(400ms 창) 사이드바로 이동 → 이탈. **error toast 나 실패 배너가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 한다 | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **8** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-04 · A11Y-11 · IA-01 · **IA-02** · EXC-09 |
| `종속` | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| `gap` | **3** | EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 8 + 12 + 7 + 3 = **30** ✓ |

> **P0 gap 3건 — quality-bar '배치 실패' 사유.** **세 건이 전부 EXC 이며 전부 쓰기 경로다.** 이 화면은 표면이 좁아 gap 수가 적을 뿐, **밀도로 보면 쓰기 계약이 담당 4화면 중 가장 얇다**: 권한 게이팅 없음 · 동시성 없음 · 제출 락/멱등키 없음. 그 셋이 겹쳐 **두 관리자가 동시에 정책을 고치면 조용히 유실된다**(§4.3).
>
> **`n-a` 7건이 이 문서의 특징이다.** 목록이 없어 STATE-04 · COMP-10 · IA-04 · IA-13 이, 단일 문서라 IA-05 가, 폼 modal 이 없어 FEEDBACK-06 이, 필터가 없어 A11Y-12 가 전부 표면 부재다. **표면이 없는 것은 면제가 아니라 사실이며**, 그만큼 **실재하는 표면(쓰기 3축)의 gap 이 무겁다.**
>
> **IA-02 pass 는 담당 4화면 중 유일하다** — 그리고 그것이 **형제들이 따라야 할 선례**다(§5 #9).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·필터·검색·재정렬·업로드·CSV·Pagination·토글 필터·bulk·optimistic·타임라인·상태 배지)은 적지 않는다 — **§2 의 `n-a` 7건과 같은 이유다.**

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **`useDocumentQuery`(`document.ts:38-46`)가 `placeholderData` 를 넘기지 않는다** — `useCrudListQuery`(`crud.ts:251-255`)는 넘긴다. 그래서 쿼리 키가 바뀌면 이전 데이터가 유지되지 않는다. **다만 이 화면에서는 무해하다**: 쿼리 키가 `['points-policy']` 고정(`data-source.ts:9`)이라 바뀔 일이 없고, 같은 키의 재조회는 react-query 가 기본으로 이전 데이터를 유지한다. 화면도 `data === undefined` 로 판정해(`:95`) 재조회에 폼을 지우지 않는다 | 재조회 중 폼이 유지되는지 | **pass** |
| STATE-05 | P1 | **표면이 없다** — 단일 문서라 empty 결과가 성립하지 않는다(`document.ts:25-29` 의 `fetch` 는 언제나 `doc` 을 돌려준다) | — | **n-a** |
| STATE-06 | P1 | 저장 성공 시 `useSaveDocument` 가 문서 쿼리를 정확히 무효화하고(`document.ts:60-62`) 화면이 `reset(values)`(`:106`)로 폼을 즉시 재기준화한다 — 자기 변경이 왕복 없이 보인다. **의존 query 가 없다** — 이 정책을 읽는 코드가 앱에 0건이기 때문이다(BE-046 §7.1). **그래서 '무효화할 것이 없다'는 사실 자체가 §4.3 의 관찰이다** | 저장 후 값이 유지되고 '변경 사항이 없습니다.' 로 바뀌는지 | **pass** |
| COMP-01 | P1 | 버튼이 DS `<Button>` 하나뿐이다(`DocumentFormShell.tsx:145`) — `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/points` = **0건**. **그러나 진행 상태를 `loading` prop 이 아니라 손으로 쓴 라벨로 표현한다** — `{saving ? '저장 중…' : '저장'}`(`:151`). 요구가 명시적으로 금지하는 형태다. **셸 소유이므로 단일 문서형 6화면이 함께 영향받는다**. `ReturnDetailPage.tsx:355` 는 `loading={saving}` 을 쓴다 | `grep -n "저장 중…" apps/admin/src/shared/crud/DocumentFormShell.tsx` → 1건 | **gap(셸 소유)** |
| COMP-04 | P1 | **충족.** required input 이 전부 `FormField(required)` 로 노출돼 라벨 옆 `*` 마커가 렌더된다(`FormField.tsx:96-100`) — bare `<label style={fieldLabelStyle}>` 로 required 필드를 그리는 곳이 0건이다. 7개 필드 전부가 `required` 다(`:130,146`) | 모든 zod-required 필드가 FormField required 마커를 렌더하는지 | **pass** |
| COMP-06 | P2 | 로딩 스켈레톤이 **4줄 고정**이다(`DocumentFormShell.tsx:129` — `[0, 1, 2, 3].map`) — 실제 필드는 7개다. 요구는 list skeleton 을 말하지만 그 취지('loading shape 가 실제와 같아야 한다')가 이 폼 스켈레톤에도 걸린다. **셸 소유** | 스켈레톤 줄 수가 필드 수와 같은지 | **gap(경미 · 셸 소유)** |
| COMP-12 | P2 | **미충족.** 7개 입력 중 **`maxLength` 를 가진 것이 하나도 없다**(`:152-163` — 숫자 필드 렌더에 `maxLength` 없음). 상한은 zod 검증(0–100 · 1 이상)에만 있고 **자릿수 상한이 아예 없다** — `'99999999999999'` 를 칠 수 있고 `intString` 이 통과시킨다(BE-046 §7.3 이 그것을 서버 상한으로 막는다). 카운터도 경고도 없다. **요구가 지적하는 '조용히 멈춘다'의 반대 증상** — 아예 멈추지 않는다 | 자릿수 상한 근접 시 경고가 뜨는지 | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 일치한다: **read 실패=인라인 Alert**(`DocumentFormShell.tsx:105`) · **write 성공=toast**(`:107` ← `PointsPolicyPage.tsx:107`) · **write 실패=카드 안 배너**(`DocumentFormShell.tsx:125`) · page 가 임의 배너 state 를 갖지 않는다. **폼의 write 실패가 toast 가 아니라 배너인 것**은 폼 맥락(입력 보존 + 그 자리 재시도)이라 `FormServerError` 와 같은 결이며 이탈로 보지 않는다. **다이얼로그 내부 실패 경로가 없다**(서버 요청이 걸린 다이얼로그가 없다) | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast) · 실패(배너) 양 경로가 배선돼 있다(`:105-113`). no-op 클릭이 없다 — 미변경이면 버튼이 비활성이고(`DocumentFormShell.tsx:149`) footer 문구가 이유를 말한다(`:138-144`) | `?fail=save` 로 저장 → 가시 실패가 나오는지 | **pass** |
| A11Y-03 | P1 | ConfirmDialog 표면 = 이탈 가드 하나. 초기 포커스(discard intent → Cancel)는 DS `ConfirmDialog` 가 소유한다 | DS 판정에 종속 | **종속** |
| A11Y-05 | P1 | `SelectField` 표면 1개(적립 기준 — `:131`). **`isInvalid` 를 쓰지 않는다** — `z.enum` 이라 위반 값이 존재할 수 없다. 이 화면에 그 표면이 실재하지 않는다 | — | **n-a** |
| A11Y-13 | P1 | **부분 충족.** 검증 실패 시 첫 invalid 필드로 포커스가 이동한다 — `handleSubmit(onValid)`(`:128`)가 RHF `shouldFocusError` 기본값(true)을 그대로 쓴다. ⚠ **잔여 둘**: (a) **`onInvalid` 를 명시하지 않는다** — `useCrudForm.ts:240-245` 는 '그 기본값이 바뀌어도 동작이 유지되도록 **계약으로 고정**한다'는 이유로 명시했는데 이 화면은 기본값에 의존한다 (b) **폼 진입 시 첫 편집 필드 자동 포커스가 없다** | 빈 값으로 제출 → activeElement 가 첫 error 컨트롤인지(pass). 폼 진입 시 '적립 기준'에 포커스가 가는지(현재 없음) | **gap(부분)** |
| A11Y-16 | P1 | 신규 인터랙티브 표면의 계약을 만족한다: 스켈레톤 `aria-busy="true"`(`DocumentFormShell.tsx:128`) + `aria-hidden` 장식(`:130`) · `FormField` 의 `role="alert"` 오류(`FormField.tsx:110`) · `aria-required` 런타임 주입 · DS Button/SelectField 의 focus-visible·키보드. **이 화면은 신규 인터랙티브 표면을 만들지 않는다** — 전부 DS/셸이다 | 대표 page 에서 axe 통과 여부 | **pass** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관된다. **이 화면에 날짜·숫자 포맷 표면이 없다** — 값이 전부 입력 필드이고 표시 포맷이 없다(`formatNumber` 등 소비 0건). 그래서 '인라인 포맷' 위반 표면도 없다 | 셀에 raw `toString()` 이 없는지 — 표면 부재 | **pass(표면 최소)** |
| ERP-08 | P2 | **표면이 없다** — 표시용 숫자/통화/날짜/상대시간이 하나도 없다. 7개 값이 전부 편집 입력이다 | — | **n-a** |
| ERP-09 | P2 | **표면이 없다** — 이 화면에 timestamp 가 하나도 없다. `Date` 소비 0건(형제 `CouponListPage.tsx:95` 의 `formatDate(new Date())` 같은 것이 없다) | — | **n-a** |
| ERP-13 | P1 | 이 화면의 사용자 대상 문자열에 **리터럴 조사 폴백이 0건**이다(`grep '이(가)\|을(를)\|은(는)\|(으)로'` = 0). 근거: 검증 오류 6종이 전부 `objectParticle`/`topicParticle` 를 경유한다(`validation.ts:4,11,14,22,25,33,36`) — `'적립률을 입력하세요.'`(받침 없음 → '를'이 아니라 '을'… **정확히는 '적립률' 이 ㄹ 받침이라 '을'**) · `'사용 단위는 1 이상의 정수로 입력하세요.'`. 저장 토스트는 조사가 고정어다('정책을' — `:107`) | 사용자 대상 문자열의 조사 폴백 grep = 0 | **pass** |
| ERP-14 | P1 | **미충족.** 금액 필드(`signupBonus` — 원 단위)가 **masked/validated primitive 를 쓰지 않는다** — `<input type="text" inputMode="numeric">` + zod 문자열 검증이다(`:152-163`). 실시간 천단위 구분이 없고, **붙여넣은 `'3,000'` 은 `INT_RE = /^\d+$/`(`validation.ts:6`)에 걸려 '회원가입 적립금은 0 이상의 정수만 입력할 수 있습니다' 로 거절**된다 — 요구가 지적하는 바로 그 증상. **`signupBonus` 는 실제 원 단위 금액이라 이 축이 정확히 걸린다** | 회원가입 적립금에 '3,000' 붙여넣기 → 3000 으로 parse 되는지 | **gap** |
| ERP-15 | P1 | **표면이 없다** — 목록·대형 테이블이 없다 | — | **n-a** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트에서만 발생한다(`:88`) | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족.** 에러 타입 `HttpError`(status 보유)가 존재하고 `?status=<op>:<code>` 로 재현 가능하다. **그러나 이 화면이 status 로 전혀 분기하지 않는다** — 조회 실패가 `error !== null` 하나로 뭉개지고(`:124`), 저장 실패가 `setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')` 고정 문구 하나다(`:111`). 400/403/412/422/500 이 전부 같은 배너다. `isForbidden`·`isConflict`·`isUnprocessable`·`isNotFound`(`http-error.ts:93-112`)가 전부 존재하는데 **하나도 쓰지 않는다** — 담당 4화면 중 유일하다(교환/반품은 404·422 를, 쿠폰은 404·409·422 를 분기한다). **403 에 '잠시 후 다시 시도해 주세요' 를 권하는 것이 특히 나쁘다** — 영원히 403 이다 | `?status=save:403` · `save:412` · `save:422` · `save:500` 이 다른 surface 를 그리는지. **전부 같은 배너면 gap** | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` 를 RHF `setError` 로 필드에 꽂는 경로가 **없다** — `useCrudForm` 미사용이라 그 훅의 422 처리(`useCrudForm.ts:182-192`)를 상속하지 못한다. 모든 저장 실패가 form-level 배너로 간다. **BE-046 §7.3 이 서버에 교차 검증(422 `POLICY_INCONSISTENT`)을 요구하므로 이 경로가 실제로 필요해진다** — 클라이언트에 교차 검증이 0건이라 **서버 422 가 유일한 발현 지점**이다 | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면이 없다 — 그리고 그것이 정확하다.** 이 화면에 detail/edit route 가 없고 **404 가 원리적으로 성립하지 않는다**(단일 문서 — BE-046 §5). `DocumentFormShell` 이 `loadFailed: boolean` 하나로 받는 것(`:74`)은 `useCrudForm` 의 `loadFailure: 'not-found' \| 'error'`(`useCrudForm.ts:40`) 와 대조되나, **여기서는 갈릴 것이 없어 붕괴가 아니다.** 요구의 appliesTo(`useCrudForm`·`FormPageShell`·`DocumentFormShell`·`QuoteForm`)에 `DocumentFormShell` 이 있으나 — **다른 단일 문서형 화면들도 같은 이유로 404 가 없다** | 없는 문서로 진입 → 불가능(id 가 없다) | **n-a** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 비관적이다(요청 완료 후 `reset`). `onMutate`/`setQueryData` grep = 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라'이므로 **위반 표면이 없다** | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-16 | P2 | **표면이 없다** — 이 화면에 browser-storage 접근이 0건이다(`localStorage`/`sessionStorage` grep 0건) | — | **n-a** |
| EXC-20 | P1 | **미충족.** 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `DocumentFormShell` 이 `serverError: string \| null` 만 받고(`:76`) `errorReference` 슬롯이 **없다.** `HttpError.reference` 가 존재하고(`http-error.ts:59`) `referenceOf`(`:115-117`)와 `FormServerError`(`FormFeedback.tsx:38-47`, `userSelect: 'all'` + `tabular-nums`)가 **이미 공유 컴포넌트인데** 이 셸이 쓰지 않는다. 형제 `ReturnDetailPage.tsx:211,275-277` 과 `CouponFormPage.tsx:242` 는 보인다. raw stack 노출은 없다(그 절은 충족). **셸 소유이므로 단일 문서형 6화면이 함께 영향받는다** | `?status=save:500` → 배너에 `오류 코드 TDS-…` 가 보이는지. **현재 안 보인다** | **gap(셸 소유)** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 정책 조회 p95 | ≤ 300ms (BE-046 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건. **단일 문서 7필드라 실제로는 가장 빨라야 할 조회다** |
| 정책 저장 p95 | ≤ 400ms | 위와 동일. **BE-046 §7.5 가 감사 이벤트를 요구하므로 그것이 붙으면 조금 느려진다** — 그래도 트랜잭션 하나다 |
| 첫 렌더 | ≤ 1s (LCP) | 미측정. **폼 7필드 고정이라 데이터 크기에 비례하지 않는다** — 담당 4화면 중 유일하게 O(1) 이다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시한다 — **충족** |
| 저장 성공 후 재조회 | **1회**(문서 무효화 — `document.ts:60-62`) | **그런데 화면은 그 결과를 기다리지 않는다** — `reset(values)`(`:106`)로 즉시 재기준화한다. 무효화된 쿼리가 도착하면 `useEffect([data])`(`:90-93`)가 다시 `reset(data)` 한다 — **같은 값이면 무해하나, 서버가 정규화했으면(`'007'`→`7`) 폼이 두 번 바뀐다**(BE-046 §7.7) |
| 저장 요청 크기 | ≤ 1KB | **충족** — 7개 스칼라 필드. **배열이 없어 이력에 비례해 커지지 않는다**(BE-026·BE-044 와 다르다). 담당 4화면 중 가장 작다 |
| 메모리 | 문서 1건 | **O(1)** — 목록을 들지 않는다 |
| 번들 | 이 화면 고유 코드 ≤ 5KB(gzip) | 미측정. **4파일 172행** — 담당 4화면 중 가장 작다. 외부 의존 0(전부 공용 모듈·DS). 화면 전용 컴포넌트 0개 |
| 리렌더 | 입력 키 입력마다 해당 필드만 | **충족(의도)** — RHF `register` 가 uncontrolled 라 키 입력이 리렌더를 일으키지 않는다. 형제 `CouponFormPage` 는 미리보기 때문에 `watch()` 9개로 전체를 리렌더한다(NFR-045 §4.1) — 이 화면에는 미리보기가 없어 그 비용이 없다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 정책 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`DocumentFormShell.tsx:102-115`). 단 문구가 도메인 없는 '내용'이다(FS-046 §7 #8) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존·재시도는 되나 **reference 없음**(EXC-20 gap) |
| 저장 실패(403) | 권한 메시지 · 재시도 수단 없음 | **미충족** — '저장하지 못했습니다. **잠시 후 다시 시도해 주세요.**'(`:111`). **영원히 403 인데 재시도를 권한다**(EXC-06 gap) |
| 저장 실패(422 교차 검증) | 그 입력의 인라인 오류 | **미충족** — 배너로 뭉개진다(EXC-07 gap). **클라이언트에 교차 검증이 0건이라 서버 422 가 유일한 발현 지점인데** 그것이 필드에 닿지 않는다(BE-046 §7.3) |
| 저장 실패(412 동시 편집) | conflict 다이얼로그 + 입력 보존 | **미충족 — 그 경로 자체가 없다**(EXC-04 gap). `save` 가 언제나 성공한다 |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass) |
| **연타(더블클릭)** | 정확히 1개 요청 | **미충족**(EXC-08 gap). **완화**: 전체 치환이라 최종 상태가 같다 |
| **동시 편집(두 관리자)** | 나중 저장이 앞선 변경을 덮지 않는다 | **미충족 — 조용히 덮인다.** 전체 치환 PUT + 토큰 없음 + `save` 가 `doc = input` 한 줄(`document.ts:33`). **이 화면 최대 위험**(§4.3 · BE-046 §7.4) |
| 세션 만료 중 입력 | 재인증 후 입력 복원 | **미충족** — 401 리다이렉트가 미저장 입력을 버린다(EXC-19 P1) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 정책 무결성 · 감사

적립금 정책은 **전 고객에게 걸리는 금액 규칙**이며 클릭 몇 번으로 바뀐다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 동시 편집이 유실을 만들지 않는다 | **미충족 — 이 화면 최대 위험.** 전체 치환 PUT + `If-Match`/`version` 없음 + `save` 가 항상 성공(`document.ts:33`). 두 관리자가 정책을 동시에 고치면 **나중 사람의 7필드 스냅샷이 앞선 변경을 통째로 덮고 성공 토스트가 뜬다** — 적립률 3% 가 1% 로 조용히 되돌아간다. **`DocumentStore` 인터페이스에 토큰이 앉을 자리가 없다**(`document.ts:14-19`) — `CrudAdapter` 의 `WriteContext`(`crud.ts:30-42`)에 대응물이 없다. BE-046 §7.4 |
| 누가 바꿨는지 기록된다 | **미충족.** `save(input)` 이 값만 받는다(`document.ts:30-34`) — actor 가 없다. BE-046 §7.5 |
| 언제 바꿨는지 기록된다 | **미충족.** timestamp 가 없다 |
| 무엇에서 무엇으로 바꿨는지 기록된다 | **미충족.** 전체 치환이라 이전 값이 사라진다 |
| 되돌릴 수 있다 | **미충족.** 이력이 없으니 복원 대상이 없다 |
| 값이 상한을 넘지 않는다 | **미충족.** `intString` 에 상한이 없다(`validation.ts:8-16`) — `signupBonus: '1000000000000'`(1조원)이 통과한다. **오타 하나(0 하나 더)가 가입자마다 30만원을 주는 정책**이 된다. BE-046 §7.3 |
| 필드 간 모순이 없다 | **미충족.** 교차 검증 0건(`validation.ts:40-48` — `.check()` 없음). **현 픽스처가 이미 모순이다**: `signupBonus: '3000'` < `minUseAmount: '5000'`(`types.ts:19-27`) — **가입 적립금만 받은 회원은 영원히 그것을 쓸 수 없다.** BE-046 §7.3 |
| 정책이 실제로 적용된다 | **미정 — 소비처가 앱에 0건이다.** 7개 필드 전부가 이 화면과 정의 파일 밖에서 grep 0건. **이 화면은 아무도 읽지 않는 값을 저장한다.** BE-046 §7.1 |
| '기본 적립률'이 새 상품에 물려진다 | **미충족 — 화면이 사실이 아닌 것을 말한다.** hint 는 '새 상품의 초기 적립률입니다'(`:50`)라고 약속하는데, 상품의 실제 기본값은 `_shared/store.ts:169` 의 **하드코딩 `rate: 1`** 이고 정책을 읽지 않는다. **정책에서 5% 로 바꿔도 새 상품은 1% 로 시작한다.** BE-046 §7.2 |
| 정책 변경이 소급되는 범위가 정의돼 있다 | **미정** — 읽는 시점(적립/주문/결제)이 미정이라 '어제 주문에 오늘 정책이 걸리는가'를 답할 수 없다. BE-046 §7.1 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | EXC-04 · (§4.3) | P0 | **낙관적 동시성 전무** — `If-Match`/`ETag` 없음 · `save` 가 `doc = input` 한 줄이라 항상 성공 · 충돌 해소 UI 없음. 두 관리자가 동시에 고치면 **조용히 유실**된다. **`DocumentStore` 인터페이스가 바뀌어야 하고 단일 문서형 6화면이 함께 영향받는다** — 어댑터 본문만으로 끝나지 않는다 | **`shared/crud/document` 전역** | **백엔드 명세 · UI 기획 (최우선 · 횡단 — BE-046 §7.4 · FS-046 §7 #16)** |
| 2 | EXC-03 | P0 | **쓰기 게이팅 미배선** — `useRouteWritePermissions` 미소비. 7필드 편집 + '저장'이 무조건 렌더된다. **같은 단일 문서형 `settings/site`·`settings/languages`·`settings/oauth` 3화면은 배선했고 이 화면과 `products/shipping` 만 빠졌다**(grep 확인). BE-046 §7.6 이 `operator` 를 조회 전용으로 판정하므로 실사용에서 즉시 드러난다 | 이 화면 (+ `products/shipping` 동반) | UI 기획 쪽 변경 요청 (FS-046 §7 #2) |
| 3 | EXC-08 | P0 | `submitLockRef`·멱등키 없음 — `useCrudForm` 미사용. **멱등키는 `SaveVars`(`document.ts:48-51`)에 자리 자체가 없다.** 버튼이 `type="submit"` 이라 RHF 비동기 검증 틈이 실재한다. **완화**: 전체 치환이라 최종 상태가 같다 — 진짜 위험은 #1 이다 | 이 화면 + `shared/crud/document` | UI 기획 · 백엔드 명세 (FS-046 §7 #11) |
| 4 | (§4.3) | — | **정책 변경 감사 이벤트 없음** — 누가·언제·무엇에서 무엇으로 바꿨는지 기록되지 않고 되돌릴 수 없다. **금액 규칙이다.** 관리자 로그 계약(BE-060 계열)과 함께 봐야 한다 — 이 화면에 그 심이 없다 | BE 계약 | **백엔드 명세 (BE-046 §7.5 — 관리자 로그 연동)** |
| 5 | (§4.3) · EXC-07 | P1 | **상한·교차 검증 0건** — `signupBonus` 1조원 통과 · `minUseAmount % useUnit` 미검사 · `maxUseRate: 0` 통과 · **현 픽스처가 이미 `signupBonus < minUseAmount` 모순**이다. **서버가 유일한 방어선인데** 그 422 를 필드로 되돌릴 경로가 없다(`useCrudForm` 미사용) | 이 화면 + BE 계약 | **아키텍처(값 확정 · 선행)** · 백엔드 명세 (BE-046 §7.3) · UI 기획 (FS-046 §7 #5·#15) |
| 6 | (§4.3) | — | **이 정책을 읽는 코드가 앱에 0건** — 소비처·시점·소급 범위 전부 미정. **'기본 적립률'이 `DEFAULT_POINTS` 와 연결돼 있지 않아 hint 가 거짓**이다(`_shared/store.ts:169` 하드코딩). `DEFAULT_SHIPPING` 도 같은 문제라 **배송 정책과 한 배치로** | **아키텍처 (선행)** · 백엔드 명세 (BE-046 §7.1·§7.2) · UI 기획 (FS-046 §7 #1·#4) |
| 7 | EXC-06 · EXC-20 · COMP-01 · COMP-06 · A11Y-11(잔여) | P1 · P2 | **`DocumentFormShell` 소유 결함 묶음**: status 로 전혀 분기하지 않음(403 에 '잠시 후 다시 시도'를 권한다) · 참조 코드 슬롯 없음 · `loading` prop 대신 손으로 쓴 '저장 중…' · 스켈레톤 4줄 고정(필드는 7개) · 조회 실패 문구가 도메인 없는 '내용'. **`hint` 가 `hintIdOf` 로 연결되지 않는 잔여**(`:50,65`)는 화면 소유. **단일 문서형 6화면이 함께 영향받는다** | **`shared/crud/DocumentFormShell` 전역** | UI 기획 (셸 배치 — FS-046 §7 #7·#8·#9·#10·#14) |
| 8 | ERP-14 · COMP-12 | P1 · P2 | 금액 필드(`signupBonus`)에 masked input 없음 — **붙여넣은 '3,000' 이 거절된다**. 7개 입력에 `maxLength` 가 하나도 없어 자릿수 상한이 아예 없다 | 이 화면 + 공유 field adapter | UI 기획 쪽 변경 요청 |
| 9 | (IA-02 — **pass**) | — | **미결이 아니라 선례로 기록한다.** 이 화면은 담당 4화면 중 **유일하게 IA-02 를 통과한다** — `DocumentFormShell` 이 in-content `<h1>` 을 그리지 않고 `CardTitle`(`<h2>`)만 쓰기 때문이다. **형제 폼/상세 화면(FS-044·045·047 + 앱 전역 26개)이 이 형태를 따르면 IA-02 가 해소된다.** 프론트 구현 이 h1 모델을 정할 때 이 화면을 참조점으로 쓸 수 있다 | (기록) | **프론트 구현 참고** |
| 10 | A11Y-13(잔여) | P1 | 폼 진입 시 첫 필드 자동 포커스 없음. `onInvalid` 를 명시하지 않아 RHF 기본값에 의존한다(`useCrudForm.ts:240-245` 가 그것을 계약으로 고정한 이유와 대조) | 이 화면 | UI 기획 쪽 변경 요청 |
| 11 | EXC-05 · EXC-11 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 | **앱 전역** | 프론트 구현 · UI 기획 (FS-046 §7 #17) |
| 12 | (FS-046 §7 #6·#13) | — | 유효기간에 '무기한'을 표현할 값이 없다(0 이 막혀 있는데 쿠폰의 `totalQuantity: 0` = 무제한과 관용이 갈린다). 문서 도착 시 `reset(data)` 가 편집 중 재조회에서도 돈다 | 이 화면 | 아키텍처(관용 확정) · UI 기획 |
| 13 | (BE-046 §7.7) | — | 폼이 숫자를 문자열로 드는데 **계약은 `number` 다** — 변환이 어댑터 본문에 살아야 한다. 서버 기본값을 프론트 `DEFAULT_POINTS_POLICY` 와 맞춰야 한다 | 이 화면 + BE 계약 | 백엔드 명세 · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인 — 형제 CRUD 화면과 op 이름이 다르다)**

`pointsPolicyStore` 는 `createDocumentStore('points-policy', …)`(`data-source.ts:12-15`)로 만들어지고, 그 팩토리가 `failIfRequested(scope, op)` 를 부른다. **`createDocumentStore` 의 op 은 `load`/`save` 다**(`document.ts:27,32`) — `createCrudAdapter` 의 `list`/`detail`/`save`/`delete`(`crud.ts:96,101,112,120,135`)와 **다르다.** 이것을 틀리면 재현이 되지 않는다.

| op | 호출 지점 | 재현 | 화면 도달 |
|---|---|---|---|
| **`load`** | `fetch` (`document.ts:27`) | `?fail=load` · `?fail=points-policy:load` · `?fail=all` | FS-046-EL-012 (화면 전체 대체 배너) |
| `save` | `save` (`document.ts:32`) | `?fail=save` · `?fail=points-policy:save` · `?fail=all` | FS-046-EL-013 (카드 안 배너) |

- **`?fail=list` · `?fail=detail` · `?fail=delete` 는 이 화면에서 아무 효과가 없다** — 그 op 이 존재하지 않는다.
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-71`) — 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`:27-37`). **op 은 여기서도 `load`/`save` 다.**

| 판정 | 재현 |
|---|---|
| EXC-06 (status별 surface) | `?status=save:403` · `save:412` · `save:422` · `save:500` — **전부 같은 배너다**(현재 gap). `?status=load:403` vs `load:500` 도 같다 |
| EXC-04 (412 conflict) | `?status=save:412` — **conflict 다이얼로그 없이 '저장하지 못했습니다' 배너만 뜨면 gap**(현재 gap). **유령 저장(성공했는데 아무것도 안 바뀜)은 재현할 수 없다** — `save` 가 `doc = input` 이라 언제나 실제로 바꾼다(`document.ts:33`). 그 판정은 **코드 대조**다 |
| EXC-03 (403 강등) | **`?status=` 가 아니라 권한 스토어**로 재현한다 — `page:/products/points` 의 `update` 를 끄면 필드·저장 버튼이 잠겨야 한다(현재 gap) |
| EXC-02 (401 재인증) | `?status=load:401` — `/login?returnUrl=%2Fproducts%2Fpoints&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — **`오류 코드 TDS-…` 가 안 보이면 gap**(현재 gap — 셸에 슬롯이 없다). **`?fail=save` 로는 애초에 재현되지 않는다** — generic `Error` 에는 `reference` 가 없다 |
| EXC-07 (422 필드 매핑) | **`?status=save:422` 로는 재현되지 않는다** — `dev.ts:84` 가 `violations` 없는 오류를 던지고, **이 화면에는 애초에 `violations` 를 읽는 코드가 없다**(`:109-112` 가 `isAbort` 만 본다) |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**: `grep`(TOKEN-01 · COMP-01 · A11Y-11 · A11Y-12 · ERP-13 · EXC-03 · EXC-08 판정 — **이 화면은 `n-a` 가 많아 grep 이 '표면 부재'를 입증하는 주 도구다**: `SearchField`·`useListState`·`<h1`·`aria-current`·`onMutate`·`localStorage` 전부 0건) · RTL(A11Y-11 의 describedby↔alert id 일치 · `aria-required` 주입) · **`points.test.ts`**(`pointsPolicySchema` 검증 5건 — 적립률 100% 초과 `:17-20` · 사용 단위 0 `:22-25` · 유효기간 공백 `:27-30` · 최소 사용 비숫자 `:32-35`. **36행으로 담당 4화면 중 가장 작다** — 순수 규칙이 검증 스키마뿐이기 때문이다. **컴포넌트 테스트는 없다**).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서로 판정했다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다. **재현 불가능한 것(유령 저장)은 '코드 대조로 판정한다'고 명시**했다
- [x] 모든 `N/A` 7건에 사유를 댔다(STATE-04·COMP-10·IA-04·IA-13 목록 부재 · FEEDBACK-06 폼 modal 부재 · A11Y-12 필터 부재 · IA-05 폼 라우트 쌍 부재) — **표면 부재를 grep 으로 입증**했다
- [x] §2.1 산수 검산 — 8 pass + 12 종속 + 7 n-a + 3 gap = **30** ✓
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적고, 어느 표면이 계약을 상속하는지 못 박았다. 앱 공용 프레임워크(`shared/crud`)의 소비는 **화면의 선택**이므로 `직접` 으로 판정했다(§1.1)
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다. 표면이 없는 것(STATE-05 · A11Y-05 · ERP-08 · ERP-09 · ERP-15 · EXC-12 · EXC-16)은 `n-a` 로 사유를 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` op 이 **`load`/`save` 이며 형제 CRUD 화면의 `list`/`detail`/`delete` 와 다름**을 `document.ts:27,32` 에서 확인해 명시했다. **`?delay=` 를 쓰지 않았다**
- [x] **'판정 기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다. **이번 기준 갱신으로 뒤집힌 판정은 없다** — MOTION-01/02 의 근거만 바뀌었고(오버레이 모션이 CSS-only 로 구현) 소유가 DS 라 `종속` 그대로다. **새 `ToggleSwitch` 게이트는 이 화면에 표면이 없어 적지 않았다** — 없는 표면을 쓰지 않았다(§1)
- [x] §5 의 gap 이 FS-046 §7 · BE-046 §7.8 과 일치한다
- [x] **표면이 가장 좁은 화면의 성격(§1.2)** 을 밝히고, **`n-a` 7건이 면제가 아니라 사실이며 실재하는 쓰기 3축의 gap 이 그만큼 무겁다**는 것을 §2.1 에 기록했다. **IA-02 pass 를 담당 유일 선례로 §5 #9 에 남겼다.** §4.3 에 quality-bar 밖 축(정책 무결성·감사)을 별도로 세웠다
