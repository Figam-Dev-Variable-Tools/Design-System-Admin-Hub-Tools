---
id: NFR-043
title: "배송 정책 비기능 명세"
functionalSpec: FS-043
backendSpec: BE-043
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-043. 배송 정책 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-043 배송 정책 (`/products/shipping`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그것을 재서술하지 않는다** |
| 이 문서의 역할 | quality-bar 의 각 요구가 **이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가** 만 기록한다. 요구 문구는 ID 로만 참조한다 |
| 함께 읽는 문서 | FS-043(요소·예외) · BE-043(계약·보안 판정) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 매긴다. 이 문서가 quality-bar 를 바꾸지 않는다. gap 은 §5 를 거쳐 이관되며 FS-043 §7 · BE-043 §7.13 과 번호가 일치해야 한다 |
| 판정 근거 | **판정 기준일 2026-07-17 · `HEAD = a5c2639`. E2E 미실행 — 판정 근거는 코드 대조다**(§6) |
| 이번 기준 갱신으로 뒤집힌 판정 | **없음.** MOTION-01/02/03 의 **근거**가 바뀌었으나(오버레이 모션 구현 · ToggleSwitch reduced-motion 게이트 신설 — §2) 소유가 DS 라 판정은 `종속` 그대로다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **공용 프레임워크를 소비해 충족하는 경우도 '직접'이다** — 그것을 쓸지 말지가 이 화면의 결정이기 때문이다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**목록형이 아니라 단일 문서 설정형**이다 — 문서 1건을 불러와 고치고 저장한다. 그래서 **P0 30건 중 7건이 표면 부재(N/A)** 다: STATE-04(page clamp·선택) · COMP-10(검색 입력) · FEEDBACK-06(폼 modal) · A11Y-12(좌측 토글 필터) · IA-04(list 템플릿) · IA-05(create/edit route 쌍) · IA-13(list query state). **그 7건은 '이탈' 이 아니라 '이 화면은 목록이 아니다' 라는 사실의 반영**이며, 각 칸에 사유를 적었다.

**구조적으로 얻은 것 둘**:
- **IA-02 pass** — `/products/shipping` 은 nav 잎이고 화면에 in-content `<h1>` 이 없어 **h1 이 정확히 1개**다. 폼 화면인데도 상품 폼(FS-041 §7 #6)의 'h1 2개' 를 겪지 않는다 — `DocumentFormShell` 이 h1 을 그리지 않기 때문이다.
- **FEEDBACK-04 의 구멍이 없다** — 이 화면에 '목록으로'·'취소' 버튼이 없어 `navigate()` 프로그램 이탈 경로가 **0건**이다. 상품 폼이 겪는 '가드가 프로그램 이동을 못 잡는다'(FS-041 §7 #8)가 구조적으로 성립하지 않는다.

**잃은 것 — 이 화면은 F3b 의 수혜자가 아니다.** 상품·카테고리는 `createStoreAdapter` 를 써서 404·409·멱등 원장을 얻었지만(GROUND-TRUTH §4), **이 화면은 `createDocumentStore` 를 쓰고 그 팩토리에는 그것이 없다**(`document.ts:22-36` — `save` 가 `doc = input` 한 줄). `SaveVars`(`:48-51`)에 멱등키·`If-Match` 자리조차 없다. 그래서 **EXC-04 가 세 화면 중 가장 넓게 열려 있다**(BE-043 §7.1 이 표로 대조한다).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족.** `ShippingPolicyPage.tsx:66` `const loading = isFetching && data === undefined` — **최초 로드에만** true 인 파생을 화면이 직접 만든다(`useCrudList` 를 쓰지 않는 화면이지만 그 규칙을 복제했다 — `ProductCategoriesPage.tsx:205` 와 같은 형태). `DocumentFormShell.tsx:127-135` 가 **그 값으로만** 스켈레톤/본문을 가른다(`loading ? <스켈레톤 aria-busy="true"> : <div>{children}</div>`). `useDocumentQuery` 에 `placeholderData` 가 없으나(`document.ts:38-46`) **같은 키의 재조회는 `data` 를 유지**하므로 재조회 중 `loading` 이 false → **본문이 사라지지 않는다.** read 실패는 `loadFailed` 로 분기해(`:102-115`) 스켈레톤·본문과 섞이지 않는다. **empty 상태는 존재하지 않는다** — 단일 문서라 '0행' 개념이 없고 `createDocumentStore` 가 언제나 seed 를 준다(BE-043 §7.2) | `/products/shipping` 진입 → 폼 렌더 확인 → `staleTime` 30초 경과 후 재진입(또는 필드 수정 없이 재조회 유발). **본문이 스켈레톤으로 바뀌면 gap.** `?fail=shipping-policy:load` 로 `Alert` 만 뜨는지 확인 | **pass** |
| STATE-02 | STATE | 직접 | **충족.** read 실패가 인라인 danger Alert + 명시적 '다시 시도' 다 — `ShippingPolicyPage.tsx:94-96` 이 `loadFailed={error !== null}` · `onRetry={() => void refetch()}` 를 넘기고 `DocumentFormShell.tsx:102-115` 가 `<Alert tone="danger">` + '내용을 불러오지 못했습니다.' + `<Button variant="secondary" onClick={onRetry}>다시 시도</Button>` 를 렌더한다. **read 실패로 error toast 를 쓰는 경로가 0건**이고 empty 로 폴백하지 않는다(애초에 empty 가 없다). **잔여(요구 위반은 아니다)**: 문구가 **'내용을'** 로 도메인을 지칭하지 않고(껍데기가 도메인을 모른다 — `DocumentFormShell.tsx:9`), 화면 **전체**를 대체해 안내문(FS-043-EL-001)까지 사라진다 | `?fail=load` 또는 `?fail=shipping-policy:load` → danger Alert + '다시 시도'. **토스트가 뜨면 gap** | **pass** |
| STATE-04 | STATE | N/A | **표면이 없다.** 이 화면은 **목록이 아니라 단일 문서 폼**이다 — ① 페이지네이션이 없다(page 개념 자체가 없다) ② 행 선택이 없다(행이 없다). 따라서 'total 이 줄어 page clamp' 도 '숨겨진 행의 선택 해제' 도 걸릴 표면이 없다. **상품·카테고리와 달리 이 N/A 는 IA-04 gap 을 동반하지 않는다** — IA-04 자신도 N/A 다(list 템플릿이 걸릴 화면이 아니다) | 목록·페이지네이션·선택이 도입되면 이 판정을 다시 매긴다(단일 문서형이라 그럴 이유가 없다) | **n-a** |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다. `pages/products/shipping/**` 에 primitive tier 밖 `#hex` · `[1-9]px` 리터럴 · `border/outline: thin\|medium\|thick` **0건**(grep 확인). 파생 치수는 `calc(var(--tds-space-6) * 6)`(`:32`) 같은 space 토큰 배수로만. `opacity` 리터럴도 **0건**. **이 화면은 스타일 객체가 `rowStyle` 하나뿐이다**(`:30-34`) — 나머지는 전부 공유/DS 소유 | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|[0-9]+px\|: *(thin\|medium\|thick)" apps/admin/src/pages/products/shipping` → **0건이어야 한다.** ESLint/stylelint 0 warning | **pass** |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면은 전부 DS/공유 클래스를 소비한다: `tds-ui-focusable`(`:108,141,166,191,213,235` — 6개 입력) · DS `<SelectField>`·`<ToggleSwitch>`·`<Button>`(`DocumentFormShell` 의 저장 버튼·재시도). **이 화면이 `:focus-visible` outline 을 직접 선언하지 않는다** | DS 토큰 문서 판정을 따른다. 이 화면에서는 로컬 `:focus-visible` 선언이 0건임만 확인 | **종속** |
| TOKEN-03 | TOKEN | 상속 | easing 토큰 소비 표면: **스켈레톤 펄스**(`tds-ui-skeleton` — `DocumentFormShell.tsx:130`) · Toast(저장 성공) · **`ToggleSwitch.css:32,56`** 의 `transition: … var(--tds-motion-duration-fast)`(묶음배송 토글) · Modal(이탈 가드 ConfirmDialog) · DS `<Button>` transition. **이 화면이 animation/transition 을 직접 선언하지 않는다**(grep 0건) | tokens codegen · `Toast.css` 판정에 종속 | **종속** |
| TOKEN-04 | TOKEN | 상속 | shadow 토큰 소비 표면: `<Card>`(`DocumentFormShell.tsx:122`) · Modal(이탈 가드 ConfirmDialog) · Toast. **이 화면이 `box-shadow` 를 직접 선언하지 않는다**(grep 0건) | Card/Modal/Toast 토큰 판정에 종속 | **종속** |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — page title 이 AppHeader 에서 온다(`AppHeader.tsx:101` `<h1 style={titleStyle}>`, `titleStyle = { ...pageTitleStyle, marginTop }` — `:52-55`). 그 `pageTitleStyle` 이 `--tds-typography-title-xl-*`(>18px tier + weight 600)를 참조한다(`shared/ui/styles.ts:51-61`). 이 화면의 heading 표면은 **하나**이며 공유 소유다: `CardTitle`('배송 정책') → `<h2 style={cardTitleStyle}>`(`Card.tsx:41`) → title.md(`styles.ts:106-118`). **KPI/StatsCard 값 표면이 없다** | AppHeader/DS 토큰 판정에 종속. 이 화면에서는 title 값을 손으로 재현하는 로컬 스타일이 0건임만 확인 | **종속** |
| COMP-10 | COMP | N/A | **표면이 없다.** 요구의 appliesTo 는 '**모든 SearchField/필터 입력**, MembersToolbar 등 검색 toolbar, shared search hook' 이다. **이 화면에 text-search/filter 입력이 없다** — `<SearchField>` 도 `<input type="search">` 도 없고(grep 0건) 필터 자체가 없다. **택배사 입력(FS-043-EL-004)은 폼 필드이지 검색/필터가 아니다** — 그 값은 쿼리를 발행하지 않고 문서에 저장된다. 요구의 세 절(조합 중 커밋 금지 · debounce · stale 응답 취소)이 전부 '쿼리 발행' 을 전제하는데 **이 화면의 텍스트 입력은 아무 쿼리도 발행하지 않는다.** IME 조합은 여전히 일어나지만 그것은 **폼 입력의 정상 동작**이다 | 검색/필터 입력이 도입되면 이 판정을 다시 매긴다(단일 문서형이라 그럴 이유가 없다) | **n-a** |
| FEEDBACK-02 | FEEDBACK | 상속 | **이 화면에 파괴적 서버 액션이 없다** — 삭제가 범위 밖이다(단일 문서 · `createDocumentStore` 에 `remove` 가 없다 — BE-043 §1). 걸리는 표면은 **discard intent 하나**: 이탈 가드가 렌더하는 `ConfirmDialog`(`DocumentFormShell.tsx:100,157` → `useUnsavedChangesDialog`). intent→tone/icon/label 매핑과 초기 포커스는 DS `ConfirmDialog` 가 소유한다(`ConfirmDialog.tsx:6,126`). **busy/abort 절은 이 다이얼로그에 서버 요청이 없어 무관하다**(확인하면 그냥 이동한다) | DS `ConfirmDialog` 판정에 종속. 이 화면에서는 discard 다이얼로그가 실제로 뜨는지만 확인(FEEDBACK-04 절차와 동일) | **종속** |
| FEEDBACK-04 | FEEDBACK | 직접 | **충족 — 그리고 이 화면에는 구멍이 없다.** `DocumentFormShell.tsx:100` 이 `useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage })` 를 배선하고 `ShippingPolicyPage.tsx:99-100` 이 `dirty={isDirty}`(RHF `formState.isDirty` — `:51`)와 도메인 문구('배송 정책에 저장하지 않은 변경 사항이 있습니다…' — `:27-28`)를 넘긴다. 3경로는 훅이 소유한다: beforeunload(`:127`) · **앱 내 링크 capture 가로채기**(`:151` — `target` 이 `''`/`_self` 이고 좌클릭·수식키 없음일 때만 — `:51,57-60`) · popstate sentinel(`:178`). **저장 성공 시 `reset(values)`(`:79`)로 새 기준선을 세워 `isDirty` 가 false → 가드가 해제된다** — 저장 후 같은 이동이 프롬프트 없이 통과한다. **⚠ 상품 폼과 결정적으로 다른 점**: 이 화면에 **'목록으로'·'취소' 버튼이 없다** — `navigate()` 를 부르는 곳이 **0건**(전수 확인)이라 FS-041 §7 #8 의 '가드가 프로그램 이동을 못 잡는다' 구멍이 **구조적으로 존재하지 않는다** | 택배사를 고친 뒤 ① 탭 닫기 ② 사이드바 링크 클릭 ③ 브라우저 뒤로 — **세 경로 모두 discard 다이얼로그가 떠야 pass.** 저장 성공 후 같은 이동은 프롬프트 없이 통과. `grep -n "navigate(" apps/admin/src/pages/products/shipping` → **0건**(구멍 부재 확인) | **pass** |
| FEEDBACK-06 | FEEDBACK | N/A | **표면이 없다.** 이 화면에 **편집 가능한 폼을 담은 modal 이 없다** — 편집은 modal 이 아니라 라우트의 카드에서 일어난다(`DocumentFormShell` 의 `<Card>`). 유일한 modal 인 이탈 가드 `ConfirmDialog` 는 **입력 필드가 없는 확인 다이얼로그**이며 그 자신이 FEEDBACK-04 의 산물이다. (자매 화면 FS-042 는 taxonomy 엔티티라 modal 폼을 쓰고 거기서는 이 요구가 실재하며 pass 다 — NFR-042) | 폼 modal 이 도입되면 이 판정을 다시 매긴다 | **n-a** |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 저장 성공 `toast.success('배송 정책을 저장했습니다.')`(`ShippingPolicyPage.tsx:80`) **1종뿐**이다. 지속 live region 은 `ToastProvider` 가 소유한다 — 이 화면은 주입만 한다. **실패는 토스트가 아니라 배너다**(FEEDBACK-01 규칙 준수) | ToastProvider 판정에 종속. 이 화면에서는 저장 성공이 announce 되는지만 확인 | **종속** |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 이탈 가드 `ConfirmDialog`(FEEDBACK-02 와 같은 노드) **1개뿐**이다. `aria-describedby`→message 배선은 DS `Modal`(`Modal.tsx:158`)/`ConfirmDialog`(`:129`)가 소유한다 | DS 판정에 종속. 이 화면에서는 discard 다이얼로그 open 시 message 가 읽히는지만 확인 | **종속** |
| A11Y-11 | A11Y | 직접 | **충족 — 이 화면의 폼 컨트롤 8개를 전수 확인했다.** ① **`aria-invalid` ↔ `aria-describedby` 짝** — 히트 6곳(`:112-113` carrier · `:145-148` baseFee · `:170-173` freeThreshold · `:195-198` jeju · `:217-220` island · `:239-242` returnFee)이 **전부 같은 조건으로 짝**을 이루고(`errors.X !== undefined ? errorIdOf('ship-X') : undefined`), 감싸는 `FormField htmlFor="ship-X"` 가 `<p id={errorIdOf('ship-X')} role="alert">` 를 렌더한다(`FormField.tsx:110`) — **id 가 일치한다.** **짝 없는 `aria-invalid` 0건.** ② **required 주입** — `FormField required` 호출부 **7곳**의 자식이 네이티브 `<input>` 6개(carrier·baseFee·freeThreshold·jeju·island·returnFee)와 DS `SelectField` 1개(`ship-fee-type` — `:119`)라 **전부 `withAriaRequired` 의 주입 대상**이다(`FormField.tsx:36-41` `isRequirableChild` — 네이티브 `input`/`select`/`textarea` + `SelectField`). 호출부가 `aria-required` 를 직접 주지 않으므로 override 도 걸리지 않는다. ③ **묶음배송 `ToggleSwitch`**(`:248-258`)는 `FormField` 밖의 bare 라벨이지만 **required 가 아니라** 주입 요구가 발생하지 않는다. **④ 상품 화면의 `ImageUploadField` 같은 미주입 경로가 이 화면에 없다** — 폼 컨트롤이 전부 네이티브이거나 `SelectField` 다 | `grep -n "aria-invalid" apps/admin/src/pages/products/shipping` → 히트 6건, 각각 같은 요소에 `aria-describedby` 가 있는지(✔). RTL 로 진입해 `getByLabelText('택배사')`·`getByLabelText('배송비 정책')` 의 **`aria-required === 'true'`** 를 assert(**grep 으로는 판정할 수 없다 — 런타임 `cloneElement` 주입이다**). 택배사를 비우고 제출해 `input.getAttribute('aria-describedby') === screen.getByRole('alert').id` 를 assert | **pass** |
| A11Y-12 | A11Y | N/A | **표면이 없다.** 요구의 appliesTo 는 '**좌측 필터 list item**'(TierFilter·NoticeFilters·LoginHistoryFilters·GroupFilter·EsgCategoryFilter)이다. **이 화면에 좌측 필터도 toggle 필터 list 도 없다** — 단일 문서 폼이라 필터할 대상이 없다. `filterItemStyle`·`filterPanelStyle` 소비 0건, **`aria-current` 0건**(grep 확인). 묶음배송 `ToggleSwitch` 는 **폼 입력**이지 필터 toggle 이 아니며 `aria-checked` 를 쓴다(`ToggleSwitch.tsx:29` — 그것이 옳은 속성이다) | 좌측 토글 필터가 도입되면 이 판정을 다시 매긴다 | **n-a** |
| MOTION-01 | MOTION | 상속 | Modal 표면: 이탈 가드 `ConfirmDialog` **1개뿐**. enter/exit transition 은 DS `Modal` organism 이 소유한다 — 이 화면은 애니메이션을 선언하지 않는다 | DS Modal 판정에 종속. **오버레이 모션은 구현됐다 — 단 라이브러리가 아니라 CSS-only 다**: Motion/framer-motion 은 **여전히 미도입**(package.json 19개·import·lockfile 전부 0건)이나 backdrop fade enter(`Modal.css:20-21` → `@keyframes tds-modal-backdrop-in :126-134`) · exit(`:30-33` → `tds-modal-backdrop-out :136-144`) · dialog enter(`:58-59` → `tds-modal-dialog-in :146-156` — opacity 0→1, `scale(0.96)→scale(1)`) · exit(`:35-38` → `tds-modal-dialog-out :158-168`, `forwards`)가 `component.overlay` recipe(`tokens/tokens.json:1286-1308` — enter 250ms/decelerate · exit 150ms/accelerate)를 소비한다. 'AnimatePresence 로 exit 완료 후에만 unmount' 는 **네이티브 `onAnimationEnd` 로 동등 달성**(`Modal.tsx:216-218`, keyframe 이름 상수 `:43`). reduced-motion 게이트 `Modal.css:173-180`. **잔여 — 애니메이션되는 닫힘은 Modal 소유 3경로뿐**(Esc `Modal.tsx:167-171` · 딤 `:204` · × `:227-232`, 전부 `requestClose` `:122-126` 경유): **footer 버튼은 여전히 즉시 언마운트**(`Modal.tsx:27-31` 이 명시 — 조립하는 쪽 버튼이라 `onClose` 가 아니라 호출부 콜백 직행). **이 화면의 유일한 modal 이 그 잔여에 정면으로 해당한다** — 이탈 가드의 '취소'(`ConfirmDialog.tsx:145-147`)와 '나가기'(`:148-156` · discard intent 라벨 `:97`)가 곧 이 다이얼로그를 닫는 **주된** 수단이라, 실제로 퇴장을 타는 경로는 Esc·딤뿐이다. **라이브러리 부재를 gap 으로 볼지는 소유 문서(DS)의 몫이다** | **종속** |
| MOTION-02 | MOTION | 상속 | Toast 표면: 저장 성공 토스트 1종. exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | DS Toast 판정에 종속. **toast exit 은 완전 구현이다** — `.tds-toast--exiting`(`Toast.css:32-37`)이 `tds-toast-out … forwards` + `pointer-events:none` 을 걸고 keyframes(`:121-131`)가 opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))` 로 등장(`:26-27`/`:109-119`)의 역순을 그린다. `exit-duration`={motion.duration.fast}(150ms) · `exit-easing`={motion.easing.accelerate} 라 **요구가 명시한 'exit duration fast~normal, easing accelerate' 를 정확히 충족**한다. reduced-motion 게이트 `:136-141`. 이 화면은 표면이 1종이라 노출이 가장 얕다 | **종속** |
| MOTION-03 | MOTION | 상속 | reduced-motion 게이트가 걸릴 이 화면의 표면: **스켈레톤 펄스**(`DocumentFormShell.tsx:130`) · Toast(`Toast.css:136-141`) · Modal(`Modal.css:173-180`) · DS Button transition · **`ToggleSwitch`(묶음배송 — `ShippingPolicyPage.tsx:250-257`)**. **이전 판정이 지목했던 위반은 해소됐다 — 게이트가 실재한다**: `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce)` 로 `.tds-toggle__track` · `.tds-toggle__knob` 의 `transition: none` 을 걸어 **남은 transition 선언 둘을 전부 끈다**(`:32` 트랙 `background-color` · `:56` 손잡이 `transform`). 주석 `:76-78` 이 사유를 못박는다: 손잡이 transform 은 **움직임**이라 vestibular 장애에 직접 영향을 주는데, 상태(on/off)는 색·위치·`aria-checked` 로 이미 전달되므로 전환을 없애도 **정보 손실이 0** 이다 — 즉시 최종 위치로 스냅한다. **이 화면이 transform/transition 을 직접 선언하지 않으므로**(grep 0건) 판정은 여전히 DS 가 소유한다 | 전역 motion config·`ToggleSwitch.css` 판정에 종속. 이 화면에서는 로컬 transition 선언이 0건임만 확인. (재현: `emulateMedia({ reducedMotion: 'reduce' })` 로 묶음배송 토글을 눌러 **handle 이 미끄러지지 않고 즉시 최종 위치로 스냅하면 pass** — 미끄러지면 게이트 회귀) | **종속** |
| IA-01 | IA | 직접 | **충족.** 라우트가 AppShell layout route 아래에 등록된다(`App.tsx:237` — `{ path: '/products/shipping', element: <ShippingPolicyPage />, implemented: true }`). **자체 outer frame/sidebar/top bar 를 도입하지 않는다** — 최상위가 `DocumentFormShell` 의 평범한 `<div style={pageStyle}>`(`DocumentFormShell.tsx:118`)다 | 라우트 진입 시 사이드바·AppHeader 가 유지되고, 화면이 자체 nav/header 를 그리지 않는지 확인 | **pass** |
| IA-02 | IA | 직접 | **충족 — 폼 화면인데도 h1 이 하나다.** `/products/shipping` 은 nav 잎이고(`nav-config.ts:148` `['배송', '/products/shipping']`), `findCoveringLeaf` 가 **'자기를 감싸는 가장 긴 잎'** 을 고르므로(`:269-279`) 자기 자신(`/products` 가 아니라)을 찾는다 — `covers()` 가 세그먼트 경계에서만 매칭하고(`:255-257`) 더 긴 잎이 이긴다(`:274-275`). `findNavLabel` → **AppHeader h1 = '배송'**(`AppHeader.tsx:92,101`). **화면에 in-content `<h1>` 이 없다** — `DocumentFormShell` 이 h1 을 그리지 않고(`:117-155` — `<p>` 안내문 + `CardTitle` `<h2>` 뿐) 이 화면도 그리지 않는다(`ShippingPolicyPage.tsx` 에 `<h1>`·`pageTitleStyle` 0건). → **`<h1>` 정확히 1개이고 그것이 잎 라벨이다.** **⚠ 상품 폼과 대조**: `ProductFormPage.tsx:362` 는 자체 `<h1>` 을 그려 h1 이 2개다(FS-041 §7 #6). **같은 '폼 화면' 인데 이쪽이 pass 인 이유는 `DocumentFormShell` 이 `FormPageShell`(`:160` 에서 자체 h1 을 그린다)과 달리 h1 을 그리지 않기 때문이다** — 그리고 이 화면이 잎이라 AppHeader 의 라벨이 정확하다. **'등록/수정' 행위 문제(`nav-config.ts:293-295`)도 걸리지 않는다** — 이 화면은 등록도 수정도 아닌 '설정' 이라 잎 라벨 '배송' 이 곧 정확한 제목이다 | `/products/shipping` 진입 → `document.querySelectorAll('h1').length === 1` 이고 그 텍스트가 '배송' 인지. **대조**: `/products/new` 는 2 | **pass** |
| IA-04 | IA | N/A | **표면이 없다.** 요구의 대상은 '**모든 list 화면**'(toolbar row → count 요약 → SelectionBar → table → Pagination)이고 appliesTo 는 `CrudListShell`·모든 `*ListPage`·members/categories 다. **이 화면은 list 가 아니라 단일 문서 설정 폼**이다 — 조회할 컬렉션이 없고, 검색·필터·선택·행이 없으며, `CrudListShell`/`CrudTable` 을 쓰지 않는다(`DocumentFormShell` 을 쓴다). **'page size 초과 가능' 이라는 요구의 전제가 성립하지 않는다** — 문서가 언제나 1건이다(BE-043 §7.2). **상품(FS-041)·카테고리(FS-042)의 IA-04 gap 과 달리 이것은 부재가 아니라 부적용이다** | 이 화면에 목록이 도입되면 이 판정을 다시 매긴다(정책 설정형이라 그럴 이유가 없다) | **n-a** |
| IA-05 | IA | N/A | **표면이 없다.** 요구는 '같은 엔티티의 create·edit 를 `:id` 로 구분되는 하나의 컴포넌트/route 쌍에서' 를 요구하는데 **이 화면에 create 개념도 `:id` 도 없다** — 배송 정책은 회사당 1건이고 `createDocumentStore` 가 `add`/`remove` 를 노출하지 않으며(`document.ts:14-19`) App.tsx 에 `/products/shipping/new` 류 라우트가 0건이다(확인). **`PUT` 이 upsert 라 '등록' 과 '수정' 이 같은 조작**이다(BE-043 §7.2) — 그래서 폼이 `isEdit` 분기조차 갖지 않는다. 요구의 정신(레이아웃 동일, title·prefill 만 다름)이 **적용될 두 상태가 존재하지 않는다** | create/edit 개념이 생기면 이 판정을 다시 매긴다 | **n-a** |
| IA-13 | IA | N/A | **표면이 없다.** 요구의 대상은 '**list query state**(page, page-size, active filters, keyword, sort)' 이고 appliesTo 는 `shared/crud(useCrudList)`·모든 `*ListPage`·좌측 필터·DateRangeFilter 다. **이 화면에 그 다섯 축이 전부 없다** — 목록이 아니므로 page·filter·keyword·sort 가 존재하지 않고, `useListState`/`useSearchParams` 소비 0건이며 URL 에 실을 조회 상태 자체가 없다. **요구의 근거('필터 후 3페이지 45번째 행을 열고 Back → 필터 없는 1페이지에 착지')가 성립할 시나리오가 없다.** URL `/products/shipping` 하나가 이 화면의 유일한 상태다 — **그것이 곧 완전한 복원 가능 상태**다(새 탭에 복사하면 같은 화면이 뜬다) | list query state 가 생기면 이 판정을 다시 매긴다 | **n-a** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외를 받는 경계: AppShell 이 `<Outlet>` **바로 바깥**에 두는 `ErrorBoundary`(`AppShell.tsx:478-493`) + `RouteErrorScreen`. 이 화면은 자체 경계를 두지 않고 그 경계의 **소비자**다 | ErrorBoundary 소유 문서 판정에 종속. 이 화면에서는 컴포넌트 강제 throw 시 사이드바가 유지되고 복구 화면이 뜨는지만 확인 | **종속** |
| EXC-02 | EXC | 상속 | 이 화면이 상속하는 두 경로: ① 진입 가드 — `RequireAuth` 가 세션 부재 시 `/login?returnUrl=<현재경로+쿼리>` 로 렌더 중 `Navigate` ② 세션 중 401 — `queryClient` 의 `QueryCache`/`MutationCache` `onError` → 세션 만료 통지 → 세션 폐기 후 `reason=session_expired` 로 이동. **이 화면의 조회·저장 실패가 전부 이 인터셉터를 통과한다** — 화면별 배선이 없다 | auth/session 소유 문서 판정에 종속. 이 화면에서는 `?status=load:401` 로 401 시켜 `/login?returnUrl=%2Fproducts%2Fshipping&reason=session_expired` 로 가는지 확인. (미저장 입력 유실은 EXC-19 P1 사안 — §4.2) | **종속** |
| EXC-03 | EXC | 직접 | **부분 미충족 — 세 화면 중 가장 무방비다.** 충족(상속): **read 게이팅** — `RequirePermission` 이 AppShell `<Outlet>` 을 감싸(`AppShell.tsx:490`) 권한 없는 deep-link 에 `ForbiddenScreen` 을 렌더한다. `/products/shipping` 은 nav 잎이라 `findCoveringLeaf` 가 자기 자신을 찾고 `/products` 와 별개 리소스로 갈린다(`nav-config.ts:269-279` → `route-resource.ts:32-35`). **미충족(직접): 쓰기 게이팅이 0건이다.** **이 화면은 `useRouteWritePermissions` 를 import 조차 하지 않는다** — `ShippingPolicyPage.tsx:1-25` 의 import 에 `shared/permissions` 가 **없다**(전수 확인). 상품(`ProductListPage.tsx:119` `canCreate`)·카테고리(`ProductCategoriesPage.tsx:181` `canCreate`)가 최소한 '등록/추가' 버튼은 게이팅하는 것과 달리 **여기는 아무것도 없다.** `DocumentFormShell.tsx:145-152` 의 '저장' 버튼이 `!dirty \|\| saving \|\| loading` 으로만 비활성되고 권한을 묻지 않는다 → read 전용 역할이 배송 정책을 전부 고치고 '저장' 을 눌러 **403 을 받은 뒤에야** 알게 된다 — 그것도 '저장하지 못했습니다. **잠시 후 다시 시도해 주세요**' 라는, **시간이 해결하지 않을 문구**로(EXC-06 gap 과 같은 뿌리). **mid-session 강등 reconcile 도 없다**(구독 자체가 없다) | 권한 스토어에서 `shipping` 의 `update` 를 끈 뒤 `/products/shipping` 진입. **'저장' 버튼이 그대로 보이면 gap**(현재 그렇다). `grep -rn "useRouteWritePermissions\|useRouteCan\|permissions" apps/admin/src/pages/products/shipping` → **0건이면 gap**(현재 0건). `read` 를 끄면 403 화면이 뜨는지(pass) | **gap** |
| EXC-04 | EXC | 직접 | **미충족 — 세 화면 중 가장 넓게 열려 있다. 구분해서 적는다.** **이 화면은 F3b 의 수혜자가 아니다**: 상품·카테고리는 `createStoreAdapter` 를 써서 `update`/`remove` 가 없는 id 에 **`HttpError(409)`** 를 던지는 가드를 얻었지만(`crud.ts:219-221` — 유령 저장 해소), **이 화면은 `createDocumentStore` 를 쓰고 그 팩토리에는 그 가드가 없다**(`document.ts:22-36` 전수 확인 — `save` 가 `doc = input` 한 줄이고 `HttpError` 를 **아예 던지지 않는다**). 단일 문서에 '존재 여부' 개념이 없기 때문이다 — 형태의 차이이지 누락이 아니다. **그러나 결과는 더 나쁘다**: ① **`version`/`updatedAt`/`ETag` 가 없다**(`validation.ts:19-49` 전수 확인) ② **`SaveVars` 에 `If-Match` 자리조차 없다**(`document.ts:48-51` — `{ input, signal }` 뿐. `crud.ts:296-302` 의 `UpdateVars` 는 `idempotencyKey` 자리가 있다) ③ **409 를 받는 UI 가 없다** — `onError`(`:82-85`)가 `isAbort` 만 보고 나머지를 generic 배너로 뭉갠다. → **동시 편집이 아무것도 막지 않는다.** A 가 제주 배송비를, B 가 반품 배송비를 고친 뒤 A→B 순으로 저장하면 **PUT 이 전체 치환이라 B 가 A 를 조용히 되돌린다.** 아무도 알아채지 못한다. **배송 정책은 '스토어 전체 배송비 계산에 반영' 되는 값이다**(화면 안내문 — `:93`) — 조용한 되돌림이 곧 잘못된 배송비 청구다(BE-043 §7.1) | `?status=save:409` 로 저장 → **conflict 다이얼로그 없이 generic 배너만 뜨면 gap**(현재 그렇다). **대조**: 같은 스위치로 `/products/prd-1/edit` 를 저장하면 상품 화면은 다이얼로그를 띄운다. **토큰 절**: `grep -n "version\|updatedAt\|If-Match" pages/products/shipping/validation.ts pages/products/shipping/data-source.ts` → **0건이면 gap**(현재 0건). 두 탭으로 열어 A→B 저장 시 B 가 A 를 덮는지 | **gap** |
| EXC-08 | EXC | 직접 | **미충족.** 이 화면이 `useCrudForm` 을 쓰지 않아 그 훅의 두 장치를 상속하지 못했다: ① **동기 제출 락 없음** — `submitLockRef`(`useCrudForm.ts:103,201-202`)가 이 화면에 0건이다. 방어는 `disabled={!dirty \|\| saving \|\| loading}`(`DocumentFormShell.tsx:149`) 하나뿐인데, 제출이 `type="submit"` → `onSubmit={(event) => void handleSubmit(onValid)(event)}`(`:101`)이고 **RHF `handleSubmit` 은 비동기**라(zod resolver 를 await 한다) 첫 클릭 후 `saving` 이 true 가 되어 버튼이 실제로 disabled 되기까지 **틈이 있다** — 요구가 이름 붙인 바로 그 'double-Enter gap'. ② **멱등키 없음 — 자리 자체가 없다** — `useSaveDocument` 의 `SaveVars`(`document.ts:48-51`)가 `{ input, signal }` 뿐이고 `createDocumentStore.save`(`:30-35`)에 멱등 원장이 없다. `crud.ts` 가 `WriteContext.idempotencyKey`(`:30-42`) + `createIdempotencyLedger`(`:62-72`)로 얻은 것을 **`document.ts` 는 받지 못했다**. **완화 요인(정직하게 적는다)**: 저장이 **전체 문서 치환**(`document.ts:34` `doc = input`)이라 같은 body 를 두 번 보내도 최종 상태가 같다 — **데이터 손상은 없고 요청 수만 는다.** 카테고리는 유일 제약 부재와 만나 '같은 이름 2개' 라는 실사고가 되지만(NFR-042 EXC-08) 여기는 그렇지 않다. **그러나 acceptanceCheck 의 첫 절('submit 더블클릭 또는 응답 전 Enter 연타가 정확히 1개 요청 발사')이 실패하고, 둘째 절('재시도가 동일 Idempotency-Key 재사용 — key 가 mutationFn 밖에 존재')은 키가 없어 성립조차 하지 않는다** | '저장' 을 최대한 빠르게 2회 클릭(또는 네트워크 스로틀 + Enter 연타). **요청이 2건 발사되면 gap.** `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/pages/products/shipping apps/admin/src/shared/crud/document.ts` → **0건이면 gap**(현재 0건). 대조군: `grep -n "idempotencyKey" apps/admin/src/shared/crud/crud.ts` → 실재 | **gap** |
| EXC-09 | EXC | 직접 | **충족.** ① **onError** — `if (isAbort(cause)) return;`(`ShippingPolicyPage.tsx:83`)로 abort 를 실패로 처리하지 않는다(배너·토스트 없음). ② **unmount** — `useEffect(() => () => controllerRef.current?.abort(), [])`(`:58-59`)가 이탈 시 진행 중 저장을 취소한다. ③ **isPending 리셋** — 컴포넌트가 언마운트되므로 자동. **cache 무변경** — abort 된 저장은 `onSuccess` 에 도달하지 않아 `invalidateQueries`(`document.ts:60-62`)가 돌지 않는다. 공유 predicate `isAbort`(`shared/async.ts`)를 쓴다 — 로컬 판정을 재발명하지 않는다. **bulk 표면이 없어** '실패 count 제외' 절은 무관하다. **잔여(요구 위반은 아니다)**: **`onSuccess` 에 `aborted` 가드가 없다**(`:78-81` — `onSuccess: () => { reset(values); toast.success(...); }`). `useCrudForm`(`:218`)·`useCrudList`(`:105`)·`useCrudRowUpdate`(`:48`)·`ProductCategoriesPage` 의 삭제(`:233`)는 전부 `if (controller.signal.aborted) return;` 를 두는데 **이 화면만 없다** → 지연 창(400ms)이 끝난 직후 이탈하면 **언마운트된 컴포넌트에서 `reset`·`toast.success` 가 돈다.** 요구의 세 절(error toast 없음 · isPending 리셋 · cache 무변경)은 충족하므로 pass 이나 **§5 #7 로 이관** | 저장 중(400ms 창) 사이드바로 이탈 → **error toast 가 뜨지 않아야 pass.** 성공 토스트도 뜨지 않아야 하나 **타이밍에 따라 뜰 수 있다**(잔여). `grep -n "isAbort" apps/admin/src/pages/products/shipping` → 실재(`:83`) | **pass** |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **8** | STATE-01 · STATE-02 · TOKEN-01 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-02 · EXC-09 |
| `종속` | **12** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · FEEDBACK-02 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `n-a` | **7** | STATE-04 · COMP-10 · FEEDBACK-06 · A11Y-12 · IA-04 · IA-05 · IA-13 |
| `gap` | **3** | EXC-03 · EXC-04 · EXC-08 |
| **합계** | **30** | 8 + 12 + 7 + 3 = **30** ✔ |

> **P0 gap 3건 — quality-bar '배치 실패' 사유.** 세 화면 중 gap 이 **가장 적다**(상품 5 · 카테고리 4 · 배송 3). **그러나 그것은 이 화면이 더 좋아서가 아니라 표면이 적어서다** — n-a 가 7건으로 가장 많다(단일 문서형이라 목록 요구 7건이 부적용).
>
> **남은 3건은 전부 '쓰기 경로' 다** — 그리고 **셋 다 세 화면 중 최악이다**: **EXC-03** 은 `useRouteWritePermissions` 를 **import 조차 하지 않는다**(상품·카테고리는 `canCreate` 만이라도 쓴다). **EXC-04** 는 `createDocumentStore` 가 409 가드조차 없어 **F3b 의 수혜를 전혀 받지 못했다**. **EXC-08** 은 `SaveVars` 에 멱등키 **자리 자체가 없다**(상품은 키가 도달하고, 카테고리는 자리는 있으나 안 쓴다).
>
> **F2 대비 해소된 것(기록)**: STATE-01(`loading` 파생 — `:66`) · IA-02(`findCoveringLeaf` — 이 화면은 잎이라 **처음부터 문제가 없었고** 통합이 규칙을 한 곳으로 모았다).
>
> **구조적으로 얻은 것 둘**: **IA-02 pass** — `DocumentFormShell` 이 h1 을 그리지 않아(`FormPageShell.tsx:160` 과 대조) 폼 화면인데도 h1 이 하나다. **FEEDBACK-04 의 구멍 부재** — '목록으로'·'취소' 가 없어 `navigate()` 프로그램 이탈 경로가 0건이다(FS-041 §7 #8 과 대조).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

> 표면이 실재하는 것만. 이 화면에 없는 표면(목록·검색·필터·선택·일괄작업·재정렬·이미지 업로드·날짜 범위·CSV·Pagination·sticky·PDF·행 클릭)은 적지 않는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useDocumentQuery` 에 `placeholderData` 가 **없으나**(`document.ts:38-46`) 같은 키의 재조회는 `data` 를 유지하므로 `loading` 이 false → **본문이 유지된다**(STATE-01 pass 와 같은 근거). `staleTime` 30초가 재조회 시점을 지배한다. **그러나 '가벼운 refetch 인디케이터' 가 없다** — `DocumentFormShell` 이 `refreshing` 개념을 갖지 않는다(`:67-84` props 에 없다) | 데이터가 있는 상태의 재조회에서 본문이 유지되는지(✔) + 가벼운 인디케이터가 보이는지(✕) | **gap(부분)** |
| STATE-05 | P1 | **표면 없음** — empty 결과가 존재하지 않는다. 단일 문서이고 `createDocumentStore` 가 언제나 seed 를 준다(BE-043 §7.2 가 '서버도 미설정을 404 로 표현하지 않는다' 로 판정한다) | empty 컴포넌트가 3분기하는지 | **n-a** |
| STATE-06 | P1 | write 성공 시 `useSaveDocument` 가 `['shipping-policy']` 를 invalidate 하고(`document.ts:60-62`) 화면이 `reset(values)` 로 폼을 정합시킨다(`:79`). **그러나 이 정책을 읽는 다른 화면이 없어**(BE-043 §7.7 — 반품·상품·주문 어디도 읽지 않는다) 무효화할 의존 쿼리가 **존재하지 않는다.** 요구의 본절('그것이 stale 로 만든 read cache 만 정확히 invalidate')은 **무효화할 대상이 없어 자명하게 충족**된다 — 다만 그것은 **§4.3 이 지적하는 더 큰 문제의 증상**이다(정책이 아무것도 지배하지 않는다) | 저장 후 다른 화면의 값이 갱신되는지 → **그런 화면이 없다** | **pass(자명)** |
| COMP-01 | P1 | 이 화면의 버튼이 **전부 DS `<Button>`** 이다 — 저장(`DocumentFormShell.tsx:145`) · 재시도(`:108`). **`pages/products/shipping` 에 `buttonStyle(`·`tds-ui-btn-` grep 0건**(상품 2곳·카테고리 2곳과 대조 — **세 화면 중 유일하게 깨끗하다**). **잔여**: 저장 버튼이 `loading` prop 대신 **손으로 쓴 `'저장 중…'` 라벨**을 쓴다(`:151`) — 요구가 '진행 상태는 `loading` prop 으로(손수 쓴 저장 중… 금지)' 를 명시한다. **공용 `DocumentFormShell` 소관** | `grep -rn "buttonStyle(\|tds-ui-btn-" apps/admin/src/pages/products/shipping` → **0건**(✔). `'저장 중…'` 손 라벨은 1건 | **gap(경미 · 공용 껍데기)** |
| COMP-04 | P1 | zod-required 필드 **7개가 전부** `FormField required` 로 `*` 마커를 렌더한다(`:104,118,131,155,181,203,225`). bare `<label style={fieldLabelStyle}>` 로 required 를 그리는 곳이 0건. **묶음배송 토글(`:248-258`)만 bare 라벨인데 required 가 아니라** 요구의 본절 위반이 아니다 | 모든 zod-required 필드에 인접 `*` 가 있는지 | **pass** |
| COMP-11 | P1 | **표면 없음** — 기간 필터가 없다(목록이 아니다) | — | **n-a** |
| COMP-12 | P2 | **미충족.** ① **택배사 입력에 `maxLength` 가 없다**(`:105-115`) — 41자를 칠 수 있고 **제출 시에야** '40자를 넘을 수 없습니다' 로 막힌다. **이 화면의 다른 필드도, 상품 화면의 텍스트 입력도 전부 `maxLength` 를 두는데**(`ProductFormPage.tsx:388,411,428`) **여기만 없다.** ② **카운터가 0건이다** — `FormField counter` prop 미사용(`TextareaField` 가 자동으로 주는 것과 대조). ③ 상한 근접 경고 없음. ④ counting 기준 미정의 | 40자 근접 시 경고가 뜨는지, 초과 입력이 특정 메시지로 차단되는지. `grep -n "maxLength" apps/admin/src/pages/products/shipping` → **0건** | **gap** |
| FEEDBACK-01 | P1 | 배치가 규칙과 정확히 일치한다: read 실패=인라인 Alert(`DocumentFormShell.tsx:105`) · write **성공**=toast(`:80`) · **write 실패=카드 안 배너**(`:125` — 입력을 보존한 채 그 자리에서 재시도). page 가 임의 배너 state 를 갖지 않는다. **write 실패가 toast 가 아니라 배너인 것**은 요구('write 성공/실패 → toast')와 어긋나 보이나, **폼 맥락(입력 보존 + 그 자리 재시도)이라 `FormServerError` 와 같은 결**이며 이탈로 보지 않는다(NFR-026 이 같은 판정을 내렸다) | 강제 실패 저장이 배너로, 성공이 toast 로 뜨는지 | **pass** |
| FEEDBACK-03 | P1 | 저장 성공(toast) · 실패(배너) 양 경로가 배선돼 있다(`:75-87`). **그러나 no-op 이 실재한다** — **`baseFee` 검증이 무조건인데 필드는 조건부 렌더**라(`validation.ts:28` vs `:130`), '유료배송' 에서 기본 배송비를 지우고 '무료배송' 으로 바꾼 뒤 저장하면 **검증 실패 → 오류가 렌더되지 않는 필드에 붙음 → 화면에 아무 일도 일어나지 않는다.** 요구가 '클릭이 아무 변화도 안 내는 no-op state 를 남기지 않는다' 를 명시한다 — **정확히 그 상태다**(FS-043 §7 #2 · BE-043 §7.4 ①) | 유료배송 → 기본 배송비 삭제 → 무료배송으로 전환 → 저장. **아무 일도 안 일어나면 gap**(현재 그렇다). `?fail=shipping-policy:save` 로 저장 → 가시 실패가 나오는지(✔) | **gap** |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 가 소유(`Modal.initialFocusRef`). 이 화면은 intent 만 준다(이탈 가드 경유) | DS 판정에 종속 | **종속** |
| A11Y-05 | P1 | `SelectField isInvalid` 소비가 **0건**이다 — 배송비 정책 select(`:119`)에 `isInvalid` 도 `aria-invalid` 도 주지 않는다. **선택지 3개 고정이라 위반 값이 존재할 수 없어 정당하다**(오류 상태가 없다) | `<SelectField isInvalid />` 가 `<select aria-invalid='true'>` 를 렌더하는지 | **n-a** |
| A11Y-13 | P1 | **부분 충족.** ① **submit 검증 실패 시 첫 invalid 필드 포커스** — RHF `shouldFocusError` 기본값이 동작한다(`handleSubmit(onValid)` — `:101`). **다만 `useCrudForm` 처럼 `onInvalid` 를 명시해 계약으로 고정하지 않았다**(`useCrudForm.ts:240-248` 이 그 이유를 적는다: '그 기본값이 바뀌어도 동작이 유지된다'). **더 나쁜 것**: `baseFee` 결함(FEEDBACK-03 gap) 상황에서는 **포커스가 렌더되지 않는 필드로 간다** — 아무 일도 일어나지 않는다. ② **폼 진입 시 첫 필드 자동 포커스 없음** — `setFocus`/`autoFocus` 0건. (카테고리 모달은 `initialFocusRef` 로 그것을 한다 — NFR-042 A11Y-13 pass) | 빈 택배사로 submit → `document.activeElement` 가 `ship-carrier` 인지(✔). 폼 진입 시 첫 필드 포커스인지(✕). **숨겨진 `baseFee` 오류 시 포커스가 어디로 가는지**(✕ — 보이지 않는다) | **gap(부분)** |
| A11Y-16 | P1 | 대부분 충족: `FormField` 의 `role="alert"` 오류(`FormField.tsx:110`) · 스켈레톤 `aria-busy="true"`(`DocumentFormShell.tsx:128`) · `ToggleSwitch` 의 `aria-checked`/`aria-busy`/`disabled`(`ToggleSwitch.tsx:29-30`) · Modal 의 role/trap/Esc/focus-restore · 모든 입력의 `tds-ui-focusable` ring. **잔여 둘**: ① **footer 상태 문구에 `aria-live` 가 없다**(`DocumentFormShell.tsx:138-144`) — '저장하지 않은 변경 사항이 있습니다' ↔ '변경 사항이 없습니다' ↔ '저장하는 중입니다…' 전환이 **AT 에 전혀 들리지 않는다.** 그 문구가 이 화면의 유일한 상태 표시다. ② **비동기 status announce 가 저장 성공 토스트뿐**이다 — 로딩 완료가 announce 되지 않는다 | 신규 인터랙티브 표면이 role·keyboard·focus ring·label·live region·이중 인코딩을 충족하는지 | **gap(부분)** |
| ERP-01 | P1 | **표면 없음** — status→tone 매핑이 없다. `StatusBadge` 소비 0건(이 화면에 상태 배지가 없다). ERP lifecycle status 가 이 도메인에 없다(정책에 상태 개념이 없다 — BE-043 §5 의 422 축이 'N/A — 정책에 상태 개념이 없다') | 하나의 export 된 map/함수가 status→tone 유일 소스인지 | **n-a** |
| ERP-02 · ERP-03 · ERP-04 | P1 | **표면 없음** — 테이블이 없다(density·sticky·sortable header 가 걸릴 자리가 없다) | — | **n-a** |
| ERP-06 | P1 | 사용자 대상 문자열이 존댓말로 일관된다. **인라인 포맷 0건**(`toLocaleString` grep 0 — 상품 화면의 2건과 대조). **`formatNumber` 소비도 0건** — 이 화면은 금액을 **입력만 받고 표시하지 않는다**(포맷할 출력이 없다). 검증 문구가 조사 헬퍼를 경유한다(`validation.ts:9-17` — `objectParticle`/`topicParticle`) | 날짜/숫자/금액이 shared/format 헬퍼를 경유하는지 | **pass** |
| ERP-07 · ERP-08 | P2 | **표면 없음** — 금액 **표시** 셀이 없다(입력만 있다). raw numeric toString 0건. 상대시간·미래 timestamp 가드도 표면 없음(시각 필드가 없다 — §4.4) | 금액 셀이 자릿수로 정렬되는지 | **n-a** |
| ERP-13 | P1 | **리터럴 조사 폴백 0건**(grep 확인 — `이(가)`·`을(를)`·`은(는)`·`(으)로` 0건). **그리고 이 화면은 조사 헬퍼를 실제로 소비한다** — `validation.ts:4,9-17` 의 `intString(label)` 이 `${label}${objectParticle(label)} 입력하세요.` · `${label}${topicParticle(label)} 0 이상의 정수만…` 로 **라벨의 받침을 보고 조사를 고른다**('기본 배송비**를**' vs '제주 추가배송비**를**' — 라벨이 주입되므로 리터럴로는 불가능하다). **카테고리 화면의 조사 오류(NFR-042 ERP-13 gap)와 대조되는 정답 형태다** | 사용자 대상 문자열의 `이(가)`/`을(를)`/`은(는)`/`(으)로` grep = 0(✔). 라벨 주입 문구가 받침을 보고 조사를 고르는지(✔) | **pass** |
| ERP-14 | P1 | **미충족.** 금액 필드 **5종**(기본 배송비·무료배송 기준·제주·도서산간·반품)이 `<input type="text" inputMode="numeric">` + `^\d+$` 검증뿐이다 — **실시간 천단위 마스킹·붙여넣기 정규화가 없다.** 붙여넣은 '3,000' 이 '기본 배송비는 0 이상의 정수만 입력할 수 있습니다' 로 거절된다 — 요구가 지적하는 바로 그 증상. **이 화면은 금액 필드 비중이 가장 높다**(8필드 중 5개). 사업자번호·전화번호·날짜 필드는 표면 없음 | 금액 필드가 실시간 천단위 구분을 하는지, 붙여넣은 '3,000원' 이 3000 으로 parse 되는지 | **gap** |
| ERP-15 | P1 | **표면 없음** — 대형 list 가 없다(단일 문서 폼). row 임계값·virtualization·가로 scroll 이 걸릴 자리가 없다 | 1,000-row page-size 가 매끄럽게 scroll 되는지 | **n-a** |
| EXC-05 | P1 | `AbortSignal.timeout` 이 앱 전역 0건 — 이 화면도 상한이 없다. abort 는 언마운트에서만 발생한다(`:58-59`) | never-resolving fixture 가 ceiling 에서 abort 되는지 | **gap(앱 전역)** |
| EXC-06 | P1 | **미충족 — 이 화면 전체가 그렇다.** `onError`(`:82-85`)가 `isAbort` 만 보고 **400/403/409/422/429/500 을 전부 하나의 문구**('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')로 뭉갠다. `useCrudForm` 의 네 갈래(404·409·422+fields·그 밖)를 상속하지 못했다. **게다가 `createDocumentStore` 는 `HttpError` 를 아예 던지지 않아**(`document.ts:22-36`) **분기할 근거 자체가 없다** — 상품·카테고리는 최소한 어댑터가 status 를 실어준다. **'403 에 잠시 후 다시 시도' 는 거짓 안내**다(권한은 시간이 해결하지 않는다). 로드 실패도 `loadFailed: boolean`(`DocumentFormShell.tsx:74`)으로 뭉갠다 — **다만 BE-043 §7.2 가 '이 계약에 404 가 없다' 로 판정해 실질 영향이 없다** | `?status=save:409` vs `save:422` vs `save:500` vs `save:403` 이 다른 surface 를 그리는지 — **전부 같으면 gap**(현재 그렇다) | **gap** |
| EXC-07 | P1 | 서버 422 의 `error.fields` → RHF `setError` 경로가 **없다** — `useCrudForm` 미사용이라 그 훅의 422 처리(`useCrudForm.ts:182-191`)를 상속하지 못했다. **모든 저장 실패가 form-level 배너로 간다.** BE-043 §7.4 가 `INVALID_FEE_POLICY`(`freeThreshold ≤ baseFee`)를 422 로 내리기로 판정했는데 **그것을 받을 경로가 없다** | field path 있는 422 fixture 가 인라인 error + 포커스를 내는지 | **gap** |
| EXC-11 | P1 | `navigator.onLine` 이 앱 전역 0건 — offline 배너·write 게이팅·복귀 refetch 가 없다 | offline 토글이 배너를 내는지 | **gap(앱 전역)** |
| EXC-12 | P1 | **표면 없음(엄밀히)** — 요구의 appliesTo 는 'detail/**edit route**'(`useCrudForm`·`FormPageShell`·`DocumentFormShell`·`QuoteForm`)이고 **`DocumentFormShell` 이 명시적으로 포함된다.** 그러나 **이 화면에 `:id` 가 없고**(단일 문서) **BE-043 §7.2 가 '서버도 미설정을 404 로 표현하지 않는다 — 항상 기본값 문서를 200 으로 준다' 로 판정**했다. 즉 **404 가 발생할 수 없는 계약**이다 — '존재하지 않는/동시 삭제된 id' 라는 요구의 전제가 성립하지 않는다. **`loadFailed: boolean` 이 404/500 을 뭉개는 것은 사실이나, 뭉갤 404 가 없다.** ⚠ **단 그 판정이 뒤집히면**(서버가 404 를 주기로 하면) **이 화면은 즉시 gap 이 된다** — 정상 상태를 '불러오지 못했습니다' 로 그린다 | 없는 `:id` 로 진입할 라우트가 있는지 → 없다. **BE-043 §7.2 의 판정이 유지되는지 확인** | **n-a(BE-043 §7.2 에 종속)** |
| EXC-14 | P1 | **낙관적 업데이트가 이 화면에 없다** — 저장이 비관적이다(pending 잠금 → 성공 후 무효화 + `reset`). `onMutate`/`setQueryData` grep 0건. 요구는 'optimism 을 쓸 때 rollback 을 페어링하라' 이므로 **위반 표면이 없다**. un-rolled-back optimistic write 0건 | 이 화면에 `onMutate`/`setQueryData` 가 0건인지 | **pass** |
| EXC-16 | P2 | **표면 없음** — 이 화면이 localStorage/sessionStorage 를 직접 쓰지 않는다 | storage throw 가 앱을 crash 시키지 않는지 | **n-a** |
| EXC-17 | P2 | 사용자 대상 copy 가 whole string + named interpolation 이다 — **조사 헬퍼가 그것을 강제한다**(`validation.ts:9-17` — 문법 fragment 연결이면 받침 판정을 할 수 없다). 하드코딩 한국어이나 그것은 문서화된 수용 제약. **카테고리 화면의 fragment 연결 위반(NFR-042 EXC-17 gap)이 여기는 없다** | 신규 copy 가 fragment 연결이 아닌지 | **pass** |
| EXC-19 | P1 | 401 리다이렉트가 **미저장 입력을 버린다** — 프로그램적 navigate 라 FEEDBACK-04 가드가 발화할 수 없다. idle/expiry 경고·draft snapshot·autosave 가 없다. **손실 규모는 중간** — 필드 8개(상품 폼의 리치 폼보다 작고 카테고리 모달의 한 줄보다 크다) | 세션 만료 후 재로그인 시 입력이 복원되는지 | **gap(앱 전역)** |
| EXC-20 | P1 | 5xx 실패 시 **복사 가능한 error reference 를 보여주지 않는다** — `HttpError.reference` 가 존재하고(`http-error.ts:59`) `FormServerError` 가 그것을 렌더하는데(`FormFeedback.tsx:44`), 이 화면은 `setServerError('저장하지 못했습니다…')`(`:84`) 고정 문구만 쓴다. **`DocumentFormShell` 의 `serverError: string \| null`(`:77`)에 reference 를 실을 자리가 없다** — 껍데기 변경이 선행된다. raw stack 노출은 없다(그 절은 충족) | `?status=save:500` 이 복사 가능한 reference code 를 보이는지 | **gap** |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 상태 (근거) |
|---|---|---|
| 조회 응답 p95 | ≤ 300ms (BE-043 §2 서버 상한 5초 → 504) | **측정 불가 — 백엔드 없음.** `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **개발용 지연 상수이며 성능 예산이 아니다** — 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 인위적 `wait()` 다. 실제 네트워크 0건 |
| 저장 p95 | ≤ 400ms | 위와 동일 |
| 첫 렌더 | ≤ 1s (LCP) | 미측정. **문서 도착 전에도 `DEFAULT_SHIPPING_POLICY` 가 폼에 들어 있어**(`:54`) 렌더가 즉시다 — 다만 스켈레톤이 그것을 가린다 |
| 재조회 횟수 | 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | `queryClient` 가 `staleTime: 30_000` · `retry: false` · `refetchOnWindowFocus: false` 를 명시 — **충족** |
| **동시 쿼리 수(진입당)** | **1** | **충족**(`:38-41` — 문서 하나뿐). **세 화면 중 가장 가볍다**(상품 2 · 카테고리 1 · 배송 1) |
| 저장 요청 크기 | ≤ 1KB | **충족** — 문서 전체가 필드 8개, 약 200바이트다. **전체 치환이지만 그것이 문제가 되지 않는 유일한 화면**이다(상품의 `ProductInput` 은 8,000 variants 를 실을 수 있다 — NFR-041 §4.1) |
| 메모리 | 문서 1건 | 무시할 만하다 |
| 번들 | 이 화면 고유 코드 ≤ 10KB(gzip) | 미측정. 외부 의존 0(전부 공용 모듈·DS). **components 디렉터리가 없어** 이 화면은 5파일뿐이다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 실패 | 인라인 danger Alert + 다시 시도 | **충족**(`DocumentFormShell.tsx:102-115`). 단 **화면 전체를 대체**해 안내문까지 사라지고, 문구가 '내용을' 로 도메인을 지칭하지 않는다(FS-043 §7 #15) |
| 저장 실패(5xx) | 배너 + 입력 보존 + 재시도 + reference code | **부분 충족** — 배너·입력 보존은 되나 **reference 없음**(EXC-20 gap · 껍데기에 자리가 없다) |
| **저장 실패(409)** | conflict 다이얼로그 + 입력 보존 | **미충족 — 409 가 발생조차 하지 않는다.** `createDocumentStore` 에 그 가드가 없다(EXC-04 gap) |
| **저장 실패(검증 — 숨겨진 필드)** | 사용자가 원인을 안다 | **미충족 — 아무 일도 일어나지 않는다.** `baseFee` 검증이 무조건인데 필드는 조건부 렌더다(FEEDBACK-03 gap · **이 화면 고유 결함**) |
| 저장 중 이탈 | abort · 실패 통지 없음 | **충족**(EXC-09 pass). **잔여**: `onSuccess` 에 `aborted` 가드가 없어 언마운트된 컴포넌트에서 `reset`·토스트가 돈다 |
| **동시 편집** | 나중 저장이 앞선 것을 덮지 않는다 | **미충족 — 아무것도 막지 않는다.** `version` 없음 + `If-Match` 자리 없음 + 409 가드 없음(BE-043 §7.1). **전체 치환이라 한 필드를 고친 사람이 상대의 모든 변경을 되돌린다.** **이 화면 최대 위험** |
| 세션 만료 중 작성 | 재인증 후 작성 내용 복원 | **미충족**(EXC-19 gap) |
| **재조회 중 편집** | 입력이 보존된다 | **미충족** — `useEffect(() => reset(data), [data, reset])`(`:61-64`)가 dirty 여부를 보지 않아 **`staleTime` 경과 후 재조회가 오면 작성 중이던 값이 되돌아간다**(FS-043 §7 #13) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미충족**(EXC-11 gap, 앱 전역) |
| 무응답 백엔드 | client timeout → 재시도 가능 실패 | **미충족**(EXC-05 gap, 앱 전역) |
| 렌더 예외 | 사이드바 유지 + 복구 화면 | **충족(상속)** — AppShell `<Outlet>` 바깥 `ErrorBoundary` |

### 4.3 이 화면이 답하지 못하는 운영 질문

> **이 절이 이 화면의 가장 큰 문제를 담는다.**

| 질문 | 현재 답 |
|---|---|
| **'이 정책이 실제로 무엇을 바꾸는가'** | **답 없음 — 그런데 화면이 약속한다.** 안내문(`:93`)이 '저장하면 **스토어 전체 배송비 계산에 반영됩니다**' 라고 말하는데 **그 계산이 앱 어디에도 없다.** 전수 확인: `pages/products/returns/**` 에 `shippingPolicyStore` 소비 **0건**(반품 배송비를 반품 화면이 읽지 않는다) · 상품 폼이 `DEFAULT_SHIPPING` **상수**를 쓴다(정책을 읽지 않는다 — `ProductFormPage.tsx:139-144`) · 주문 도메인이 없다. **이 화면은 값을 저장할 뿐 아무도 그것을 읽지 않는다**(BE-043 §7.7) |
| **'묶음배송을 켜면 무엇이 달라지는가'** | **답 없음** — `bundleShipping: boolean` 만 저장되고 '묶음' 의 단위(같은 판매자? 같은 주문?)·산정(최대값? 합계?)이 **어디에도 정의되지 않았다.** 토글이 아무것도 지배하지 않는다. **운영자는 켜면 뭔가 된다고 믿는다**(BE-043 §7.10) |
| **'이 주소가 제주인지 도서산간인지 무엇으로 판정하는가'** | **답 없음** — 우편번호? 주소 문자열? 그 규칙이 프론트에도 계약에도 없다. BE-043 §7.9 가 '판정 주체는 서버(주문 시점)' 라고만 정한다 |
| **'누가 언제 배송비를 3,000원에서 5,000원으로 바꿨나'** | **답 없음** — `ShippingPolicyValues` 에 `updatedAt`/`updatedBy` 가 없다(`validation.ts:19-49` 전수 확인). **배송 정책은 모든 주문의 배송비를 지배하는데** 그 변경에 흔적이 없다(BE-043 §7.11) |
| '기본 배송비를 바꿨는데 왜 새 상품은 옛 값으로 시작하나' | **답 없음 — 그리고 그것이 실재한다.** `DEFAULT_SHIPPING`(상품 — `_shared/store.ts:158-163`)과 `DEFAULT_SHIPPING_POLICY`(이 화면 — `types.ts:16-25`)가 **별개 상수**다. 지금은 우연히 값이 같다. **정책이 '기본값' 이라는 이름값을 못 하고 있다**(BE-043 §7.6 #1 · BE-041 §7.8 #1 이 같은 사안) |
| '울릉도에만 다른 요금을 매기고 싶다' | **답 없음** — 권역이 제주·도서산간 2축 고정이며 추가 경로가 없다(BE-043 §7.9) |
| '택배사를 CJ 로 바꾸고 송장을 추적하고 싶다' | **답 없음** — `carrier` 가 자유 텍스트라 연동 키가 될 수 없다. quality-bar ERP-11 의 '택배사는 neutral badge' 도 유한 집합을 전제한다(BE-043 §7.8) |

### 4.4 보존 · 감사

배송 정책은 **모든 주문의 배송비를 지배하는 값**이다. quality-bar 는 이 축을 다루지 않으므로 여기서 정한다.

| 요구 | 현재 상태 |
|---|---|
| 변경이 이력으로 남는다 | **미충족** — 변경 이력이 없다. 어제 주문의 배송비가 3,000원이고 오늘이 5,000원이면 **그 차이가 정책 변경 때문인지 오류인지** 알 수 없다 |
| 마지막 수정자·시각을 안다 | **미충족** — `updatedAt`/`updatedBy` 필드가 없다. **최소선**: `GET` 응답에 두 필드를 실어 '마지막 수정: 2026-07-17 홍길동' 을 보이면 '내가 아까 바꾼 게 맞나' 는 답한다(BE-043 §7.11) |
| 저장된 값이 서버가 인정한 값이다 | **미충족** — `save` 가 `Promise<void>` 라(`document.ts:18`) 화면이 응답을 읽지 않고 **자기가 보낸 값**을 새 기준선으로 삼는다(`:79` `reset(values)`). 서버가 trim·반올림·`baseFee=0` 눕히기를 하면 **화면의 기준선이 서버 상태와 어긋나고** dirty 판정이 거짓이 된다(BE-043 §7.4 ⑤) |
| 과거 주문의 배송비가 정책 변경에 영향받지 않는다 | **미정** — 주문 도메인이 없어 확인 불가. **상품별 `shipping` 오버라이드가 값의 복사라는 설계**(BE-043 §7.6)가 그 보호의 절반을 이미 하고 있으나, 주문 시점 스냅샷이 어디에 박히는지는 미정 |
| 정책이 없는 상태가 존재하지 않는다 | **충족(설계)** — `createDocumentStore` 가 seed 를 들고 BE-043 §7.2 가 '서버도 항상 기본값 문서를 200 으로 준다' 로 판정했다. **단 서버 기본값과 프론트 상수(`DEFAULT_SHIPPING_POLICY`)가 갈리면 첫 렌더가 깜빡인다** — '서버 기본값이 정본이고 프론트는 사본' 이라는 선언이 아직 없다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | FEEDBACK-03 · A11Y-13 | P1 | **⚠ 이 화면 고유 결함 — `baseFee` 검증이 무조건인데 필드는 조건부 렌더다.** `validation.ts:28` vs `ShippingPolicyPage.tsx:130`. RHF 가 언마운트 필드 값을 유지하므로 '유료배송 → 배송비 삭제 → 무료배송 → 저장' 이 **검증 실패 → 오류가 렌더되지 않는 필드에 붙음 → 아무 일도 안 일어남**. **FS-041 의 같은 필드는 조건부다**(`items/validation.ts:186-196`) — **같은 섹션의 두 스키마가 갈려 있어 설계가 아니라 오류임이 드러난다.** `shipping.test.ts:39-43` 이 `baseFee: ''` + `feeType: 'free'` 를 검증하지 않아 회귀 테스트가 놓쳤다. **백엔드와 무관하게 지금 고칠 수 있다** | 이 화면 | **A11 change_request (최우선)** |
| 2 | EXC-03 | P0 | **쓰기 게이팅이 0건 — 세 화면 중 가장 무방비하다.** 이 화면은 `useRouteWritePermissions` 를 **import 조차 하지 않는다**(`ShippingPolicyPage.tsx:1-25` 전수 확인). 상품·카테고리는 `canCreate` 만이라도 쓴다. read 전용 역할이 정책을 전부 고치고 저장을 눌러 403 을 받는다 | 이 화면 | A11 change_request |
| 3 | EXC-04 | P0 | **동시 편집이 아무것도 막지 않는다 — 세 화면 중 가장 넓게 열려 있다.** ① `version`/`updatedAt` 없음 ② **`SaveVars` 에 `If-Match` 자리조차 없음**(`document.ts:48-51`) ③ **`createDocumentStore` 가 `HttpError` 를 아예 던지지 않음**(`:22-36`) — 상품·카테고리가 F3b 에서 얻은 409 가드를 **이 팩토리는 받지 못했다** ④ 409 를 읽는 코드 없음. **전체 치환이라 한 필드를 고친 사람이 상대의 모든 변경을 되돌린다** | 이 화면 + **공용 `document.ts`** + BE 계약 | **A63 (BE-043 §7.1) · A11** |
| 4 | EXC-08 | P0 | **동기 락·멱등키 없음 — 자리 자체가 없다**(`SaveVars` = `{ input, signal }`). `crud.ts` 가 `WriteContext.idempotencyKey` + 멱등 원장으로 얻은 것을 `document.ts` 는 받지 못했다. **완화 요인**: 전체 치환이라 같은 body 두 번은 결과가 같다 — **데이터 손상 없고 요청 수만 는다**(카테고리와 대조 — 거기는 '같은 이름 2개' 라는 실사고) | 이 화면 + **공용 `document.ts`** | A11 · A63 |
| 5 | EXC-06 · EXC-07 · EXC-20 | P1 | **status 분기 0건** — 400/403/409/422/429/500 이 전부 하나의 문구('잠시 후 다시 시도해 주세요' — **403·429 에는 거짓 안내**). **`createDocumentStore` 가 `HttpError` 를 던지지 않아 분기할 근거 자체가 없다.** 422 필드 매핑 경로 없음 · reference code 없음(**`DocumentFormShell` 의 `serverError: string \| null` 에 실을 자리가 없다**) | 이 화면 + 공용 `document.ts`/`DocumentFormShell` | A11 change_request |
| 6 | (BE-043 §7.3) | — | **금액 문자열 → 숫자 매핑** — `types.ts:5` 의 `// TODO(backend)` 가 가리키는 작업. **`DocumentStore<T>` 가 fetch/save 같은 타입이라 시그니처가 바뀐다** — **'어댑터 본문만 바꾸면 된다' 가 이 화면에서 성립하지 않는다.** 권장: 화면이 `toValues`/`toInput` 을 갖는다(상품 폼 선례 — `ProductFormPage.tsx:161-247`). **연동 산정에 반드시 포함** | 이 화면 + 공용 `document.ts` + BE 계약 | **A63 · A11 (연동 산정 필수)** |
| 7 | EXC-09 (잔여) | P0 | **`onSuccess` 에 `aborted` 가드가 없다**(`:78-81`) — `useCrudForm`·`useCrudList`·`useCrudRowUpdate`·`ProductCategoriesPage` 의 삭제는 전부 그 가드를 두는데 이 화면만 없다. 이탈 후 완료된 저장이 **언마운트된 컴포넌트에서 `reset`·토스트를 부른다**. 요구의 세 절은 충족하므로 P0 는 pass — 잔여만 이관 | 이 화면 | A11 |
| 8 | STATE-03 · A11Y-16 | P1 | 재조회 인디케이터 없음(`DocumentFormShell` 에 `refreshing` 개념이 없다) · **footer 상태 문구에 `aria-live` 없음**(그 문구가 이 화면의 유일한 상태 표시다) | 공용 `DocumentFormShell` | A11 |
| 9 | (FS-043 §7 #13) | — | **재조회가 편집 중 입력을 덮는다** — `useEffect(() => reset(data), [data, reset])`(`:61-64`)가 dirty 여부를 보지 않는다. `staleTime` 30초 경과 후 재조회가 오면 작성 중이던 값이 되돌아간다 | 이 화면 | A11 change_request |
| 10 | COMP-12 · ERP-14 | P2 · P1 | **택배사에 `maxLength` 없음**(이 화면·상품 화면의 다른 모든 텍스트 입력은 두는데 **여기만 없다**) · 카운터 0건 · 금액 필드 **5종**에 실시간 마스킹·붙여넣기 정규화 없음(**이 화면은 금액 비중이 가장 높다 — 8필드 중 5개**) | 이 화면 + DS field adapter | A11 |
| 11 | COMP-01 (경미) | P1 | 저장 버튼이 `loading` prop 대신 손으로 쓴 '저장 중…'. **`buttonStyle(`/`tds-ui-btn-` grep 은 0건 — 세 화면 중 유일하게 깨끗하다** | 공용 `DocumentFormShell` | A11 |
| 12 | (FS-043 §7 #15 · #24) | — | 조회 실패 문구가 도메인 미지칭('내용을 불러오지 못했습니다') + 화면 전체 대체(안내문까지 사라진다) · 스켈레톤 4줄 고정(실제 필드 8~10개 — layout shift) | 공용 `DocumentFormShell` | A11 |
| 13 | (BE-043 §7.4) | — | **서버에만 있는 검증 셋**: `freeThreshold > baseFee`(422 `INVALID_FEE_POLICY` — 무료 기준이 배송비보다 낮으면 정책이 모순) · 추가배송비 상한 없음(10,000,000원 통과) · `carrier` trim 미적용(`' 가상택배 '` 가 그대로 저장) | BE 계약 + 이 화면 | A63 · A01(상한값) |
| 14 | (BE-043 §7.4 ⑤ · §4.4) | — | **`PUT` 이 정규화된 문서를 200 으로 돌려주고 프론트가 `reset(응답)` 해야 한다** — 현재 `save: Promise<void>` 라 **자기가 보낸 값**이 기준선이다. 서버 정규화 시 dirty 판정이 거짓이 된다 | BE 계약 + 이 화면 | A63 · A11 |
| 15 | (§4.3) | — | **이 정책을 아무도 읽지 않는다** — 반품 화면이 `returnFee` 를, 상품 폼이 기본값을 읽지 않고 주문 계산이 없다. **화면은 '스토어 전체 배송비 계산에 반영됩니다' 라고 약속하는데 그 계산이 어디에도 없다.** 주문 배송비 산식 · 반품 배송비 주체 · 권역 판정 주체 확정 필요 | **도메인 경계** | **A01 (최우선) · A63** |
| 16 | (§4.3 · BE-043 §7.6 #1) | — | **`DEFAULT_SHIPPING`(상품)과 `DEFAULT_SHIPPING_POLICY`(정책)가 별개 상수다** — 정책에서 기본 배송비를 바꿔도 **새 상품은 옛 값으로 시작한다.** **정책이 '기본값' 이라는 이름값을 못 하고 있다.** BE-041 §7.15 #14 와 같은 사안. **지금 실재하는 불일치** | 이 화면 + 상품 화면 | A11 · A01 |
| 17 | (§4.3) | — | **묶음배송이 아무것도 지배하지 않는다**(단위·산식 미정의) · **택배사가 자유 텍스트라 연동 키가 없다** · **권역 2축 고정 + 판정 규칙 없음** — 셋 다 도메인 확정 필요 | **도메인 경계** | **A01 · A63** |
| 18 | (§4.4) | — | **감사 축 부재** — `updatedAt`/`updatedBy` 없음 · 변경 이력 없음. **배송 정책은 모든 주문의 배송비를 지배한다.** 최소선: `GET` 응답에 두 필드를 실어 '마지막 수정' 을 보인다 | BE 계약 | A63 (BE-043 §7.11) |
| 19 | EXC-05 · EXC-11 · EXC-19 | P1 | `AbortSignal.timeout` 0건 · `navigator.onLine` 0건 · 세션 만료가 8필드 입력을 버린다 | **앱 전역** | A40 · A11 |
| 20 | (§1.2 · 횡단) | — | **단일 문서형 5화면(회사 정보·CEO 인사말·비전/미션·오시는 길·배송)이 전부 같은 문제일 가능성이 높다** — `createDocumentStore`/`useSaveDocument`/`DocumentFormShell` 이 `crud.ts` 계열이 F3b 에서 얻은 것(409 가드·멱등키 자리·status 분기·reference)을 받지 못했다. **한 화면의 문제가 아니다 — 나머지 넷을 확인해야 한다** | **공용 `document.ts`/`DocumentFormShell`**(횡단) | **A11 (확인 필요)** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 `HEAD = a5c2639` 코드 대조다.** 아래 스위치는 판정을 재현·검증할 때 쓰는 수단이며, 이 문서가 그것을 실행해 얻은 결과를 적은 것이 아니다.

**이 화면의 `?fail=` scope 와 op (코드 확인)**

`shippingPolicyStore` 는 `createDocumentStore('shipping-policy', DEFAULT_SHIPPING_POLICY)`(`data-source.ts:12-15`)라 `failIfRequested('shipping-policy', op)` 를 부른다. **⚠ op 이 `createStoreAdapter` 와 다르다 — 실재하는 op 는 2개**다:

| op | 호출 지점 | 재현 |
|---|---|---|
| **`load`** | `createDocumentStore.fetch` (`document.ts:27`) | `?fail=load` · `?fail=shipping-policy:load` · `?fail=all` |
| `save` | `createDocumentStore.save` (`document.ts:33`) | `?fail=save` · `?fail=shipping-policy:save` · `?fail=all` |

- **⚠ 조회 op 이 `list` 가 아니라 `load` 다.** 상품(`products`/`list`)·카테고리(`product-categories`/`list`)와 다르다 — `createStoreAdapter.fetchAll` 이 `'list'` 를(`crud.ts:176`), `createDocumentStore.fetch` 가 `'load'` 를(`document.ts:27`) 쓴다. **`?fail=list` 는 이 화면에서 아무 효과가 없다.** 세 화면을 한 번에 실패시키려면 `?fail=all` 이 필요하다.
- **`detail`·`delete` op 이 없다** — 단일 문서라 `fetchOne`·`remove` 가 존재하지 않는다(`DocumentStore` 가 `fetch`/`save` 두 함수뿐 — `document.ts:14-19`). **`?fail=detail`·`?fail=delete` 는 이 화면에서 아무 효과가 없다.**
- **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다. STATE-01 재현은 **`staleTime` 30초 경과 후 재진입**으로 한다.

**`?status=<op>:<code>` 스위치**(`shared/crud/dev.ts:14-71`) — `?fail=` 이 언제나 같은 generic Error 를 던지는 것과 달리 **특정 op 을 특정 HTTP status 로** 실패시킨다. 재현 가능한 status: 400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500(`dev.ts:27-37`). **op 이름은 위와 같다**(`load`/`save`).

| 판정 | 재현 |
|---|---|
| EXC-04 (409 conflict) | `?status=save:409` — **conflict 다이얼로그 없이 generic 배너면 gap**(현재 그렇다). **대조**: 같은 스위치로 `/products/prd-1/edit` 를 저장하면 상품 화면은 다이얼로그를 띄운다 — **같은 `?status` 스위치·다른 팩토리** |
| EXC-04 (토큰) | `grep -n "version\|updatedAt\|If-Match" pages/products/shipping/validation.ts pages/products/shipping/data-source.ts shared/crud/document.ts` → **0건이면 gap**(현재 0건) |
| EXC-08 (동기 락·멱등키) | `grep -n "submitLockRef\|idempotencyKey" apps/admin/src/pages/products/shipping apps/admin/src/shared/crud/document.ts` → **0건이면 gap**(현재 0건). 대조군: `apps/admin/src/shared/crud/crud.ts` → 실재 |
| EXC-03 (게이팅 0건) | `grep -rn "useRouteWritePermissions\|useRouteCan\|shared/permissions" apps/admin/src/pages/products/shipping` → **0건이면 gap**(현재 0건). 대조군: `ProductListPage.tsx:28` · `ProductCategoriesPage.tsx:30` → 실재 |
| EXC-06 (status별 surface) | `?status=save:403` · `save:409` · `save:422` · `save:500` — **전부 같은 배너면 gap**(현재 그렇다) |
| EXC-02 (401 재인증) | `?status=load:401` — `/login?returnUrl=%2Fproducts%2Fshipping&reason=session_expired` 로 가면 pass |
| EXC-20 (reference code) | `?status=save:500` — reference 가 안 보이면 gap(현재 안 보인다) |
| **FEEDBACK-03 (`baseFee` no-op)** | **`?status=` 로 재현하지 않는다 — 클라이언트 검증 결함이다.** 재현: 배송비 정책='유료배송' → 기본 배송비 지우기 → 정책='무료배송' 으로 전환 → '저장'. **아무 일도 일어나지 않으면 gap**(현재 그렇다). 대조: 같은 조작을 `/products/new` 의 배송 카드에서 하면 정상 저장된다(`items/validation.ts:186-196` 이 조건부다) |
| EXC-12 | **N/A — 404 가 발생할 수 없는 계약이다**(BE-043 §7.2). `?status=load:404` 를 걸면 '내용을 불러오지 못했습니다' 배너가 뜨지만 **그것은 계약 밖 상황의 재현**이다 |

**LATENCY_MS 주의**: `LATENCY_MS = 400`(`dev.ts:12`)은 **개발용 지연이며 성능 예산이 아니다**(§4.1). 실제 네트워크는 0건이므로 이 값으로 응답 시간을 판정하면 안 된다.

**그 밖의 도구**:
- `grep` — TOKEN-01(hex/px/키워드 0건 · `opacity` 0건) · A11Y-12(`aria-current` 0건 · `filterItemStyle` 0건) · ERP-13(조사 리터럴 0건) · ERP-06(`toLocaleString` 0건) · **COMP-01(`buttonStyle(`/`tds-ui-btn-` 0건 — 세 화면 중 유일)** · COMP-10(`SearchField`/`type="search"` 0건) · EXC-14(`onMutate`/`setQueryData` 0건) · IA-13(`useListState`/`useSearchParams` 0건) · **FEEDBACK-04(`navigate(` 0건 — 프로그램 이탈 구멍 부재)** · COMP-12(`maxLength` 0건 — gap) 판정.
- **RTL** — **A11Y-11 은 grep 으로 판정할 수 없다.** `aria-required` 가 `FormField` 의 `cloneElement` 로 **런타임 주입**되므로(`FormField.tsx:50-56`) 소스에 그 문자열이 없다. 화면을 렌더해 `getByLabelText('택배사')`·`getByLabelText('배송비 정책')`(SelectField 주입 대조군)의 `aria-required === 'true'` 를 assert 해야 한다.
- `shipping.test.ts` — `shippingPolicySchema` 검증 **5케이스**. **⚠ 그중 어느 것도 `baseFee: ''` + `feeType: 'free'` 를 검증하지 않아 §5 #1 결함을 놓쳤다**(`:39-43` 이 `freeThreshold: ''` 만 본다). **이 화면에 컴포넌트 테스트는 없다.**
- 공용 모듈 테스트 — **`shared/crud` 에 `document.ts` 의 테스트가 없다**(`crud.test.ts` 는 `createStoreAdapter`/`createCrudAdapter` 를 다룬다) — 즉 **이 화면이 상속하는 계약에 회귀 방어선이 없다.** `shared/ui/useUnsavedChangesDialog` 계열은 FEEDBACK-04 의 방어선이다.

**알려진 flaky (참고)**: `shared/errors/http-error.test.ts:92` (`expect(codes.size).toBe(50)`)가 **birthday 충돌로 flaky** 하다 — `createErrorReference()` = `TDS-<Date.now() base36>-<3자리 base36 난수>`(`http-error.ts:68-75`), 난수 공간 46,656, 같은 ms 안 50개 충돌 확률 ≈ **2.6%**. **이 화면은 `reference` 를 쓰지 않으므로**(EXC-20 gap) 직접 영향은 없다 — **관련 사실로 기록한다**(수정은 이 배치의 경계 밖이다).

## 7. 자기 점검

- [x] quality-bar 를 재서술하지 않았다 — 요구 문구를 복제하지 않고 ID 로만 참조했다
- [x] **P0 30건 전수** 를 지정된 순서(STATE-01,02,04 · TOKEN-01..05 · COMP-10 · FEEDBACK-02,04,06 · A11Y-01,02,11,12 · MOTION-01,02,03 · IA-01,02,04,05,13 · EXC-01,02,03,04,08,09)로 판정했다. 빈칸 0건
- [x] **STATE-01 을 코드로 재확인**했다 — `ShippingPolicyPage.tsx:66` `loading = isFetching && data === undefined` + `DocumentFormShell.tsx:127-135` 가 그 값으로만 스켈레톤을 그린다 → **pass**
- [x] **`useRouteWritePermissions` 미소비를 import 로 직접 확인**했다(`ShippingPolicyPage.tsx:1-25` 에 `shared/permissions` 부재) — EXC-03 판정 근거
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 댔다
- [x] 모든 `gap` 에 재현 가능한 측정 기준을 댔다
- [x] **모든 `N/A` 7건에 사유를 댔다** — STATE-04(page·선택 부재) · COMP-10(검색/필터 입력 부재 — 택배사는 폼 필드지 검색이 아니다) · FEEDBACK-06(폼 modal 부재) · A11Y-12(좌측 토글 필터 부재 — 묶음배송 토글은 폼 입력이라 `aria-checked` 가 옳다) · IA-04(list 가 아니라 단일 문서 — '부재'가 아니라 '부적용') · IA-05(create 개념·`:id` 부재 — PUT 이 upsert) · IA-13(list query state 다섯 축 전부 부재)
- [x] §2.1 산수 검산 — 8 pass + 12 종속 + 7 n-a + 3 gap = **30** ✔
- [x] `상속` 항목은 **이 화면에 그 표면이 실재하는 것만** 적었다 — MOTION-03 에서 **`ToggleSwitch`(묶음배송)가 실재해 DS 위반이 이 표면에서 발현됨**을 명시했다
- [x] §3 은 표면이 실재하는 P1·P2 만 선별했다 — 없는 표면(목록·검색·필터·선택·일괄작업·재정렬·업로드·날짜범위·CSV·테이블 관련 ERP-02/03/04)은 `n-a` 로 명시하거나 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`shipping-policy`)와 op 를 **어댑터 코드에서 확인**했고, **op 이 `list` 가 아니라 `load` 이며 `detail`/`delete` 가 존재하지 않음**을 발견해 기록했다(상품·카테고리와 다르다). **`?delay=` 를 쓰지 않았다**(이 화면에 존재하지 않음)
- [x] **'판정 기준일 2026-07-17 · `HEAD = a5c2639` · E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다. **이번 기준 갱신으로 뒤집힌 판정은 없다** — MOTION-01/02/03 의 근거가 바뀌었을 뿐(오버레이 모션 구현 · `ToggleSwitch.css:79-84` 게이트 신설로 묶음배송 토글의 낡은 위반 주장이 해소) 소유가 DS 라 셋 다 `종속` 그대로다(§1)
- [x] **`createDocumentStore` 가 `createStoreAdapter` 와 다름을 코드로 확인**하고(`document.ts:22-36,48-51` 전수 — 404·409 가드 부재, 멱등키 자리 부재) **'이 화면은 F3b 의 수혜자가 아니다' 를 §1.2·EXC-04·EXC-08 에 명시**했다 — GROUND-TRUTH §4 의 `createStoreAdapter` 사실을 이 화면에 잘못 복사하지 않았다
- [x] **A11Y-11 을 grep 이 아니라 런타임 주입 메커니즘으로 판정**했고(required FormField 7곳의 자식이 전부 `input`/`SelectField`), 그것이 grep 으로 판정 불가함을 §6 에 명시했다
- [x] **`baseFee` 결함을 코드 대조로 발견**하고(FS-041 의 대칭 구현 · 회귀 테스트가 놓친 지점) FEEDBACK-03 · A11Y-13 · §5 #1 에 기록했다
- [x] §5 의 gap 이 FS-043 §7 · BE-043 §7.13 과 일치한다
</content>
