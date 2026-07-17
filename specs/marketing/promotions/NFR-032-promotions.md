---
id: NFR-032
title: "프로모션 비기능 명세"
functionalSpec: FS-032
backendSpec: BE-032
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-032. 프로모션 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-032 프로모션 (`/marketing/promotions` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다** — ID 로만 참조하고, '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가' 만 적는다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 요구의 정의는 quality-bar, 화면 동작은 FS-032, 서버 계약은 BE-032 |
| 함께 읽는 문서 | FS-032 (화면·예외) · BE-032 (엔드포인트·보안 판정) · **NFR-031 (이벤트)** — 같은 골격이라 판정이 거의 동일하다. **차이는 3건**: ① **A11Y-11 이 gap**(NFR-031 은 pass) ② **ERP-14 가 gap**(NFR-031 은 N/A — 금액 필드가 있다) ③ **ERP-07 이 gap**(NFR-031 은 표면 부재) |
| 갱신 규칙 | 코드가 바뀌면 이 문서의 '코드 근거' 파일:라인이 먼저 깨진다. 근거가 깨진 판정은 재검증 전까지 유효하지 않다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후). 직전 판정은 `4b805ad` 기준이었고 그때 COMP-10 · IA-13 · ERP-09 · ERP-13 이 뒤집혔다(§2 · §3 · §5). **이번 기준 갱신으로 뒤집힌 판정은 없다** — P0 30건의 건수·판정이 전부 그대로다. **A11Y-11 은 gap 그대로다** — 최소 주문금액 필드의 `aria-invalid` 짝 누락은 PR #30 의 DS 층 작업(`SegmentPicker`·`ImageUploadField`·`OAuthProviderCard`)과 무관한 축이고, 이 화면에는 그 세 표면이 **하나도 없다**. 다만 **근거가 두 곳에서 바뀌었다**: ① **MOTION-01/02/03** — 판정은 `종속` 그대로지만 참고 문구의 '모션 미구현 추정' 이 **반증됐다**(PR #26 이 Modal/Toast enter·exit 을 CSS-only 로 구현 · `ToggleSwitch.css:79-84` 에 reduced-motion 게이트 실재) ② **기간 날짜 검증(§3 COMP-11 · FS-032-EL-017.1)** — PR #28 이 `_shared/campaign.ts` 의 사본 `isRealDate` 를 지우고 정본 `isCalendarDate` 로 수렴시켜 **`2026-02-31` 이 이제 실제로 거부된다**(이전엔 통과했다). **E2E 미실행 — 판정 근거는 전부 코드 대조다**(§6) |

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
| STATE-01 | STATE | 직접 | `useCrudList.tsx:71-72` 가 `firstLoading = isFetching && data === undefined` · `refreshing = isFetching && data !== undefined` 로 가른다. `CrudListShell.tsx:137` 이 `loading={firstLoading}` 만 표에 넘기고, `crud.ts:254` 가 `placeholderData: (previous) => previous` 로 이전 행을 들고 있다. 4상태가 `CrudListShell.tsx:113`(error) → `CrudTable.tsx:143`(loading) → `:153`(empty) → 행 렌더로 배타 분기 | `/marketing/promotions` 진입 → 스켈레톤 5행만. 1건 삭제 후 재조회 → **표가 스켈레톤으로 돌아가지 않고** 이전 행 유지 + 요약만 '· 새로고침 중…'. `?fail=marketing-promotions:list` → 실패 배너만 | pass |
| STATE-02 | STATE | 직접 | `CrudListShell.tsx:156-165` — 조회 실패 시 표 대신 `<Alert tone="danger">` + '다시 시도'(`refetch`). 토스트 없음. 폼 로드 실패는 `FormPageShell.tsx:123-143` 이 같은 규약 | `?fail=marketing-promotions:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건. `?fail=marketing-promotions:detail` 로 `/:id/edit` 진입 → 폼 자리에 Alert | pass |
| STATE-04 | STATE | 직접 | 선택 해제 축: `PromotionListPage.tsx:98-100` 의 `useEffect(() => { clear(); }, [filter, keyword, clear])` (상태 필터·**커밋된** 키워드에 반응한다). `CrudListShell.tsx:143-147` 이 `toggleAll` 에 **현재 보이는 행 id 만** 넘겨 숨겨진 행이 선택되지 않는다 | 3건 선택 → 상태 필터를 '종료'로 변경 → 선택 0건, SelectionBar 사라짐 | pass · **단 clamp 축은 성립하지 않는다** — 페이지네이션이 없어 '범위를 벗어난 page' 가 존재할 수 없다(IA-04 gap 에 종속). IA-04 해소 시 **재검증 필요** |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전량이 `var(--tds-*)` 만 참조 — `PromotionListPage.tsx:41-73`(toolbar·filters·selectWrap·period·**num**·statusCell) · `PromotionFormPage.tsx:32-36`(row). 하드코딩 hex 0건, px 리터럴 0건. 폭은 `calc(var(--tds-space-6) * 5)`(`:58`) | `PromotionListPage.tsx`·`PromotionFormPage.tsx` 에 `#[0-9a-f]{3,6}` grep = 0, `[1-9]px` grep = 0, border 키워드 grep = 0 | pass · 토큰 **정의**와 DS 내부는 상속 |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 링 표면: 폼 입력 6종(`className="tds-ui-input tds-ui-focusable"` — `PromotionFormPage.tsx:149,186,216,237,270`) · 폼 '목록으로'(`FormPageShell.tsx:150`) · DS `Button`·`SearchField`·`SelectField`·`RowActions`·`ToggleSwitch` | DS 소유 판정. 이 화면에서는 '자체 outline 선언 0건' 만 확인 가능 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 easing 소비 표면: 삭제·저장 **성공/실패 토스트** · `ToggleSwitch`(쿠폰 연동) transition | DS `Toast.css`·`tokens.json` motion.easing 소유 판정 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating/overlay 표면: `ConfirmDialog`(단건·일괄 삭제) · 충돌 다이얼로그 · Toast · 폼 `Card` | DS `Modal.css`·`Card.css`·`Toast` 소유 판정 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 이 화면의 display/heading 표면: 폼 `<h1>`(`FormPageShell.tsx:160` — `pageTitleStyle`) · AppHeader `<h1>`(`AppHeader.tsx:101`) · `CardTitle` | DS `pageTitleStyle`·`tokens.json` typography 소유 판정 | 종속 |
| COMP-10 | COMP | 직접 | **F3b 에서 뒤집혔다 — 이제 소비한다.** `PromotionListPage.tsx:80` 이 `useListState({ filterDefaults })` 를 쓰고, 그것이 내부에서 `useDebouncedSearch({ initial: keyword, onCommit: commitKeyword })` 를 배선한다(`useListState.ts:24,227-230`). 화면은 `list.searchInput`/`list.setSearchInput` 을 값에, **`{...list.searchInputProps}` 를 `SearchField` 에 스프레드**한다(`PromotionListPage.tsx:145-151`). 세 축이 전부 붙었다: ① 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) ② 250ms 디바운스(`:23,93-95`) ③ 조합 중 Enter 차단 — `isComposing` **과** 자체 관측 ref 를 함께 본다(`:121-124`). ④ stale 응답 경합은 react-query 가 키워드를 쿼리 키에 넣어 이미 닫혀 있다(`:14-18`) | 한글 '봄맞이' 입력 → 자모 단계에서 커밋 0건, 조합 확정 후 250ms 잠잠하면 **1회** 커밋 → `?q=봄맞이`. 조합 중 Enter → `stopPropagation`, 부분 문자열 커밋 0건. `clear()` 는 **커밋된** keyword 가 바뀔 때만 돈다(`PromotionListPage.tsx:98-100`). **앱 grep 주의**: `PromotionListPage.tsx` 에 `useDebouncedSearch` 직접 import 는 0건 — 소비는 `useListState` 경유다 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제·일괄 삭제가 `ConfirmDialog intent="delete"` 로 게이트(`useCrudList.tsx:152-179`). `busy={deleting}` 잠금. 실패 시 **닫지 않고** `error={deleteError}` 배너(`:112`) — 재클릭이 재시도. `closeDelete`(`:86-92`)·`closeBulk`(`:118-124`) 가 cancel/Esc/dim 에서 `abort()` + `reset()` + pending 초기화 | `?fail=marketing-promotions:delete` → 다이얼로그 유지 + danger 배너, 재클릭이 재시도. in-flight 중 Esc → 토스트 없이 닫히고 버튼 복원 | pass · 다이얼로그 tone/icon/포커스는 DS 상속 |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell.tsx:114` 가 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 배선. `isDirty` 는 RHF(`useCrudForm.ts:261`). 문구는 화면 소유(`PromotionFormPage.tsx:29-30`). 저장 성공 후 `replace` 이동 시점엔 `saving` 이 참이라 가드가 꺼져 있다 | 할인율 수정 → ① 탭 닫기 ② 사이드바 링크 ③ 브라우저 Back — 3경로 모두 discard 확인. 저장 후 동일 이동은 통과 | pass · 3경로 구현은 `useUnsavedChangesDialog` 상속 |
| FEEDBACK-06 | FEEDBACK | **N/A** | **이 화면에 폼을 담은 modal 이 없다.** 유일한 modal 은 삭제 `ConfirmDialog`(입력 필드 0개)와 충돌 다이얼로그(같음). 편집은 전부 전용 라우트에서 일어나며 그 가드는 FEEDBACK-04 가 담당한다. IA-06(무게 규칙)에 정합 | — (표면 부재) | N/A |
| A11Y-01 | A11Y | 상속 | 이 화면의 toast 표면: 삭제 성공(`useCrudList.tsx:108`) · 일괄 삭제 성공(`:146`) · 저장 성공(`useCrudForm.ts:222`). `ToastProvider.tsx:165,168` 이 **항상 마운트된** polite·assertive region 을 둔다 | DS `ToastProvider` 소유 판정 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면: 삭제·일괄 삭제 `ConfirmDialog` · 충돌 다이얼로그. `Modal.tsx:6,60` 이 `describedBy` 로 본문 id 를 연결 | DS `Modal`·`ConfirmDialog` 소유 판정 | 종속 |
| **A11Y-11** | **A11Y** | **직접** | **이 폼의 6입력 중 5개는 계약을 지키고 1개가 어긴다.** ✓ 프로모션명 `PromotionFormPage.tsx:154-155` · 대상 `:189-190` · 할인값 `:220-223` · 쿠폰코드 `:274-277` — 전부 `aria-invalid` + `aria-describedby={errorIdOf(...)}` 짝. ✓ 기간 `DateRangeField.tsx:45` — `invalidProps` 가 두 속성을 **함께** 부여. ✓ 설명 `TextareaField.tsx:66-67` — 자체 배선. **✗ 최소 주문금액 `PromotionFormPage.tsx:227-243` — `aria-invalid` 도 `aria-describedby` 도 없다**(2026-07-17 재확인 — F3a·F3b 는 이 줄을 건드리지 않았다). `FormField` 는 `aria-invalid`/`describedby` 를 자동 배선하지 않으므로(`errorIdOf`/`hintIdOf` **노출만** — `FormField.tsx:59-66`) 호출부 책임인데 이 하나만 빠졌다. **⚠ `required` 축과 혼동하지 말 것**: F3a 가 `FormField.tsx:50-56` `withAriaRequired` 로 `required`→`aria-required` 를 런타임 주입하게 했고 이 폼의 required 필드는 자식이 전부 `input`/`SelectField` 라 **5/5 주입된다**(프로모션명 `:146` · 상태 `:173` · 대상 `:182` · 할인 유형 `:198` · 할인값 `:212` · 쿠폰코드 `:267`). **최소 주문금액은 애초에 required 가 아니다** — 결함은 오직 `aria-invalid` 짝 누락이다. 남는 무효 표시는 `controlStyle(errors.minOrderAmount !== undefined)`(`:238`)의 **붉은 테두리뿐 = 색상 단독 표기**(WCAG 1.4.1). hint('0 이면 조건 없음')도 미연결 | 최소 주문금액에 `30,000`(콤마 포함) 입력 후 제출 → `<p id="promo-min-order-error" role="alert">최소 주문금액은 숫자만 입력할 수 있습니다.</p>` 가 **렌더되지만**, `<input id="promo-min-order">` 에 `aria-invalid` 없음 · `aria-describedby` 없음 → **스크린리더가 그 필드를 유효하다고 읽고 사유도 못 읽는다.** 나머지 5필드는 정상. (주: quality-bar 의 grep 지표 'aria-describedby 없는 aria-invalid = 0' 은 **반대 방향**이라 이 결함을 잡지 못한다 — 여기는 aria-invalid **자체가 없다**) | **gap** — **NFR-031(이벤트)은 이 항목이 pass 다** |
| A11Y-12 | A11Y | **N/A** | **이 화면에 좌측 필터 list item 토글이 없다.** 상태 필터가 `<select>`(`SelectField` — `PromotionListPage.tsx:153-166`)라 선택 상태를 네이티브 `<option selected>` 로 표현한다. `aria-pressed`·`aria-current` 를 쓸 표면 자체가 없다 | `PromotionListPage.tsx` 에 `aria-current` grep = 0, `aria-pressed` grep = 0 (둘 다 필요 없다) | N/A |
| MOTION-01 | MOTION | 상속 | 이 화면의 Modal 표면: 삭제·일괄 삭제 `ConfirmDialog` · 충돌 다이얼로그 | DS `Modal` 소유 판정. (**`a5c2639` 사실 갱신**: `AnimatePresence` import 0건은 여전하나 **모션 미구현을 뜻하지 않는다**. PR #26 이 enter/exit 을 **구현했다** — backdrop fade `Modal.css:20-21,30-33`→keyframes `:126-144` · dialog scale 0.96→1 `:58-59,35-38`→keyframes `:146-168` · reduced-motion 게이트 `:173-180`. **CSS-only** 이며 'exit 완료 후 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)가 보장한다. Motion/framer-motion 미도입을 gap 으로 볼지는 **판정은 소유 문서의 몫**) | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 toast 표면: A11Y-01 과 동일한 3개 토스트 | DS `ToastProvider`·`Toast` 소유 판정. (**`a5c2639` 사실 갱신**: PR #26 이 toast exit 을 **완전 구현**했다 — `.tds-toast--exiting` `Toast.css:32-37` + keyframes `:121-131` + reduced-motion 게이트 `:136-141`. exit duration `{motion.duration.fast}`(150ms) · easing `{motion.easing.accelerate}` 로 요구를 정확히 충족한다) | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면의 motion 표면: `ToggleSwitch`(쿠폰 연동 — `PromotionFormPage.tsx:248-257`) · Toast · Modal | DS `ToggleSwitch.css`·전역 motion 게이트 소유 판정. (**`a5c2639` 사실 갱신 — 이전 참고 문구가 낡았다**: '`ToggleSwitch.css` 에 `prefers-reduced-motion` 블록 0건' 은 **더 이상 사실이 아니다**. `ToggleSwitch.css:79-84` 가 `@media (prefers-reduced-motion: reduce) { .tds-toggle__track, .tds-toggle__knob { transition: none; } }` 로 `:32` background-color·`:56` transform 두 선언을 **둘 다 끈다** — quality-bar 가 명시적으로 지목했던 위반이 **해소됐다**. 논거 `:76-78`: 손잡이 transform 은 움직임이라 vestibular 영향이 직접적이고, 상태는 색·위치·`aria-checked` 로 이미 전달되므로 전환 제거 시 정보 손실이 0 이다) | 종속 |
| IA-01 | IA | 직접 | `App.tsx:274-276` 의 3라우트가 전부 `APP_ROUTES` 에 있고 `:334-336` 이 이를 `RequireAuth > AppShell` 레이아웃 라우트(`:324-330`) **아래에** 렌더한다. 이 화면은 자체 frame 을 렌더하지 않는다 — 최상위가 `CrudListShell` 의 div(`CrudListShell.tsx:98`) · `FormPageShell` 의 div(`FormPageShell.tsx:147`) | `/marketing/promotions` 진입 → 사이드바·AppHeader·단일 `<main>` 안에서 렌더. 페이지 파일에 `<aside>`·`<header>`·`<nav>` grep = 0 | pass |
| IA-02 | IA | 직접 | **통합에서 절반이 해소됐다 — 사유가 바뀌었고 판정은 유지된다.** ① **해소** — 브랜치 폴백이 사라졌다. `nav-config.ts:260-278` 의 `findCoveringLeaf` 가 '자기를 감싸는 **가장 긴 잎**'을 세그먼트 경계(`covers()` — `:255-257`)로 찾고, `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` 이 그것을 쓴다. `/marketing/promotions/new` 의 AppHeader `<h1>`(`AppHeader.tsx:101`)은 이제 **'프로모션'** 이다(≠ 예전의 '마케팅 관리'). **목록 라우트는 잎이고 in-content h1 이 없어 h1 이 정확히 1개 — 그 축은 pass** ② **잔여 gap (하위 라우트)** — **`<h1>` 이 여전히 2개다**: `AppHeader.tsx:101` + `FormPageShell.tsx:160`. `nav-config.ts:294-296` 이 **'등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아** 상단 h1 은 어느 폼인지 말하지 않는다. quality-bar IA-02 의 '단일 title 메커니즘' 미충족 | `/marketing/promotions` → `h1` 1개, '프로모션' ✓. `/marketing/promotions/new` → **`length === 2`**, `[0]` = '프로모션'(브랜치 아님 ✓ · 행위 미반영 ✗), `[1]` = '프로모션 등록'. `nav-config.test.ts:16-40` 이 잎 해석을 고정 | **gap** (잎 목록 축 pass · 하위 라우트 h1 이중 축 미충족) |
| IA-04 | IA | 직접 | 템플릿 4요소 충족: ① toolbar — 검색·필터 좌측(`PromotionListPage.tsx:142-167`), primary '프로모션 등록' 우상단(`:168-171`) ② count 요약(`CrudListShell.tsx:118-122`) ③ SelectionBar(`:125-133`) ④ table(`:135-154`). **⑤ Pagination 이 없다** — `CrudListShell` 에 페이지네이션이 없고 `visibleItems` **전량**이 `CrudTable` 로 간다. 프로모션 수 상한도 없다 | 프로모션을 30건 등록 → 30행이 **한 화면에 전부** 렌더되고 페이지 컨트롤이 없다 | **gap** |
| IA-05 | IA | 직접 | `App.tsx:275-276` — `/marketing/promotions/new` 와 `/:id/edit` 가 **동일한 `<PromotionFormPage />`** 로 해석된다. `useCrudForm.ts:74-75` 가 `isEdit = id !== undefined` 로 갈린다. 레이아웃 동일, 다른 것은 title·제출 라벨·prefill 뿐 | `/marketing/promotions/new` 와 `/marketing/promotions/pr-1/edit` 의 DOM 구조 동일 | pass |
| IA-13 | IA | 직접 | **F3b 에서 뒤집혔다 — 이제 소비한다.** `PromotionListPage.tsx:80` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 쓴다(`FILTER_DEFAULTS = { phase: 'all' }` — `:39`). 상태 필터·키워드의 **단일 원천이 URL 쿼리스트링**이다: `useListState.ts:87` `useSearchParams` → `:89-91` page/`?q=`/sort → `:93-99` 필터. 갱신은 `patchParams` 한 통로(`:108-129`)로만 나가고 **`replace: true`**(`:125`)라 필터 한 번에 history 가 쌓이지 않는다. 기본값과 같은 값은 URL 에서 지운다(`:116`). 손으로 고친 `?phase=거짓말` 은 `parseFilter`(`PromotionListPage.tsx:82-86`)가 허용 목록으로 걸러 '전체'로 되돌린다. `useListState` 소비 화면은 **34곳**(`a5c2639` 재확인 — `= useListState(` 호출부 실측)이며 **마케팅 6화면 전부**가 여기 든다 | 상태 필터 '진행' + 키워드 '할인' → URL 이 **`/marketing/promotions?phase=ongoing&q=할인`**. F5 → 복원 ✓. 행 클릭 후 Back → **그 조건 그대로** ✓. URL 복사 → 다른 탭에서 같은 view ✓. '전체 상태'로 되돌리면 `?phase=` 가 사라진다 ✓ | **pass** |
| EXC-01 | EXC | 상속 | 이 화면을 덮는 경계 2겹: ① `AppShell.tsx:484-493` 이 `<Outlet>` **바로 바깥**에서 잡아 사이드바를 살린다 ② `App.tsx:311-315` 루트 경계 | DS/셸 소유 판정 | 종속 |
| EXC-02 | EXC | 상속 | ① `App.tsx:324-330` 이 `RequireAuth` 를 `AppShell` **바깥**에 둔다 ② `queryClient.ts:38-40,46-47` 의 `QueryCache`/`MutationCache` `onError` 가 `isUnauthorized` → `notifySessionExpired()`. **이 화면의 모든 조회·쓰기가 이 두 캐시를 통과한다** | 셸/auth 소유 판정. (이 화면 고유: 세션 만료 시 편집 중 입력 미보존 — EXC-19 P1, §3) | 종속 |
| EXC-03 | EXC | 직접 | **읽기 게이팅은 충족, 쓰기 컨트롤 게이팅이 없다.** ① read — `AppShell.tsx:490-492` 의 `RequirePermission` 이 `<Outlet>` 을 감싸고 `route-resource.ts:32-35` 가 `findCoveringLeaf` 로 `/marketing/promotions/pr-1/edit` → 잎 `/marketing/promotions` 로 해석 → deep-link 도 `ForbiddenScreen` ✓ ② **write — `useRouteWritePermissions`(`RequirePermission.tsx:45`)는 더 이상 소비자 0 이 아니다. F3b 이후 7곳이 쓴다**(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`). **그러나 `apps/admin/src/pages/marketing/**` 의 소비는 0건이다**(grep 확인) — 롤아웃이 이 섹션에 닿지 않았다. `remove` 권한 없는 역할도 '프로모션 등록'(`PromotionListPage.tsx:168-171`) · `RowActions`(`CrudTable.tsx:192-197`) · '선택 N건 삭제'(`CrudListShell.tsx:125-133`)를 **전부 보고 누를 수 있다**. **할인 정의는 금전 권한이라 이 gap 의 무게가 이벤트보다 크다**(BE-032 §2) | 쓰기 권한 없는 역할로 `/marketing/promotions` 진입 → 세 쓰기 컨트롤이 **그대로 보인다**. 누르면 서버 403 → 일반 실패 문구. read 권한 없는 deep-link 는 403 화면 ✓ | **gap** (읽기 축 pass · 쓰기 축 미충족 — **선례 7곳이 생겼으므로 이제 이 화면만의 배선 작업이다**) |
| EXC-04 | EXC | 직접 | **유령 저장은 막지만 동시성 토큰이 없다.** ① 충족 — `crud.ts:126-128` 이 없는 id 의 update 에 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')` 를 던지고(`:139-141` 이 remove 에 같은 가드), `useCrudForm.ts:166-179` 가 **입력을 보존한 채** 충돌 다이얼로그를 연다(성공 토스트·이동 없음). `isConflict` 가 409·412 를 같은 UX 로 수렴 ② **미충족 — `Promotion` 에 `updatedAt`/`version` 이 없어**(`types.ts:20-37`) `If-Match`/ETag 를 실을 수단 자체가 없다. 이 도메인에서 `If-Match` grep = 0. **⚠ 정확히 쓴다: 어댑터의 409 는 '존재 여부' 기반이지 version/ETag 토큰이 아니다** — 대상이 **삭제됐을 때만** 발현되며, 둘 다 존재하는 동시 편집은 여전히 last-write-wins 다 | ① 두 탭에서 같은 프로모션 수정 폼을 연다 → 탭 A 가 할인율 20%→10% 로 인하 저장 → 탭 B 가 대상만 바꿔 저장 → **탭 B 가 A 의 인하를 되돌려 20% 로 복구한다.** 경고 없음(두 탭 모두 id 가 존재하므로 `crud.ts:126` 의 `exists` 검사를 통과한다). PUT 이 전 필드 치환이라 손실은 레코드 전체. **그 프로모션이 진행 중이면 의도치 않은 할인이 고객에게 즉시 나간다** ② `?status=save:409` → 입력 보존 + 충돌 다이얼로그 ✓ | **gap** — '먼저 삭제'(409)만 감지, '먼저 수정'은 last-write-wins. **금전 손실이므로 NFR-031 보다 우선순위가 높다** → BE-032 §7.5 |
| EXC-08 | EXC | 직접 | ① **동기 제출 락** — `useCrudForm.ts:103` `submitLockRef`, `:202-203` 진입 즉시 검사·설정, `:213-215` `onSettled` 해제, `:246-248` `onInvalid` 해제. RHF 비동기 검증 사이의 두 번째 Enter 를 ref 가 **렌더를 기다리지 않고** 막는다 ② **disable** — `FormPageShell.tsx:189` ③ **멱등키 — F3b 에서 어댑터까지 연결됐다.** `useCrudForm.ts:118-123` `idempotencyKeyRef` + `takeIdempotencyKey()` 가 **mutationFn 밖**(제출 시도 단위)에서 생성돼 `:211` 에서 잡히고 `:228,235` 로 **variables 에 실려** 나간다. `crud.ts:288-289`(create) · `:310-311`(update) 이 `WriteContext`(`crud.ts:30-42`)로 어댑터에 넘기고, `createCrudAdapter` 의 ledger(`:62-72,91`)가 `:114`·`:121` 에서 `isReplay` 로 재생 판정한다. **기록은 적용에 성공한 뒤에만 한다**(`:116,131`) — 실패한 첫 시도가 키를 태워 재시도를 no-op 으로 만드는 함정을 피한다. 성공 시 `:220` 폐기. `queryClient.ts` 가 mutation `retry: false` ④ 삭제 — `ConfirmDialog busy` | 등록 폼 Enter 연타 → 요청 정확히 1건. `?fail=marketing-promotions:save` 후 재클릭 → **같은 멱등키가 어댑터 ledger 에 도달**해 할인 정의가 두 벌 만들어지지 않는다 | pass · **F2 판정이 달린 단서('키가 서버로 전송되지 않는다 — 어댑터 시그니처에 자리 없음')는 해소됐다** — `CrudAdapter.create/update` 가 `context?: WriteContext` 를 받는다(`crud.ts:47-48`). 남은 것은 **HTTP 헤더 배선**뿐이고 그 심은 `crud.ts:39` 다 → BE-032 §7.10 |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort` 를 전 경로가 쓴다: ① 저장 `useCrudForm.ts:161` ② 삭제 `useCrudList.tsx:111` ③ 언마운트 `useCrudForm.ts:93` ④ 다이얼로그 닫기 `useCrudList.tsx:87-89`(`abort()` + `reset()`) · `:119-121` ⑤ 캐시 무변경 `crud.ts:351-353` (`if (signal.aborted) return`) ⑥ **일괄 실패 count 에서 abort 제외** — `settleAll` + `useCrudList.tsx:137` | 삭제 확인 → 응답 전 Esc → 토스트 0건, 버튼 복원, 목록 무변경. 저장 중 '목록으로' → 토스트 0건 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 해당 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · **COMP-10** · FEEDBACK-02 · FEEDBACK-04 · IA-01 · IA-05 · **IA-13** · EXC-08 · EXC-09 |
| `종속`(상속) | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **2** | FEEDBACK-06(폼 담은 modal 부재) · A11Y-12(필터 토글 부재 — select 사용) |
| `gap` | **5** | **A11Y-11** · IA-02 · IA-04 · EXC-03 · EXC-04 |
| **합계** | **30** | 12 + 11 + 2 + 5 = **30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30 ✓) |

> **2026-07-17 · `4b805ad` 기준 변경**: F2 판정의 gap 7건 중 **2건이 pass 로 뒤집혔다** — **COMP-10**(F3b 가 `useListState` → `useDebouncedSearch` 를 이 화면에 배선) · **IA-13**(같은 훅이 조회 상태를 URL 로 옮겼다). **A11Y-11 은 gap 그대로다** — F3a 의 `FormField` `aria-required` 주입(`FormField.tsx:50-56`)은 이 화면의 required 필드를 전부 덮지만(자식이 `input`/`SelectField` — 아래 A11Y-11 행 참조), **최소 주문금액의 결함은 `aria-invalid`↔`aria-describedby` 축**이라 그 주입과 무관하다. **IA-02 · EXC-03 은 gap 을 유지하되 사유가 바뀌었다**.
>
> **P0 gap 5건은 quality-bar 기준 '배치 실패' 사유다.** 범위별: **2건이 앱 전역**(IA-02 · IA-04), **1건이 이 섹션**(EXC-03 — 선례 7곳이 있으므로 marketing 배선만 남았다), **1건이 도메인**(EXC-04 — `types.ts` + 서버 계약), **1건이 이 화면 단독**(**A11Y-11** — `PromotionFormPage.tsx` 3줄 수정으로 해소된다).
>
> **NFR-031(이벤트)과의 차이는 A11Y-11 1건**이다. 이벤트 폼은 전 필드가 field-association 계약을 지키고, 프로모션 폼만 최소 주문금액 입력에서 어긴다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다. **NFR-031 §3 과 대부분 동일하며, 프로모션 고유 항목은 굵게 표시했다.**

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `crud.ts:151` `placeholderData` + `CrudListShell.tsx:118-121` 이 재조회 중 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. `queryClient.ts:24` `staleTime: 30_000` | 삭제 후 재조회 → 이전 행 유지 | pass |
| STATE-05 | P1 | `PromotionListPage.tsx:162-167` 이 `empty={{ hasQuery, hasActiveFilters, onClearSearch, onResetFilters }}` 를 넘기고 `Empty` 가 3분기 + 복구 액션 + 조사(이/가) | 키워드 0매치 → '조건에 맞는 프로모션이 없습니다' + '검색 지우기'. 필터 0매치 → '필터 초기화' | pass · 생성 CTA 슬롯 미전달(경미) |
| STATE-06 | P1 | `crud.ts:179-181`(create) · `:198-201`(update — list + detail) · `:217-220`(delete) · `:237-239`(bulk — 전원 성공 시만) | 프로모션 수정 → 목록 복귀 시 새 할인값 즉시 반영 | pass |
| COMP-01 | P1 | 이 화면은 DS `<Button>` 만 쓴다(`PromotionListPage.tsx:148`). 공용 셸이 이탈: `FormPageShell.tsx:147-155` 의 '목록으로' 가 스타일 입힌 `<button>`, `:189` 가 `loading` prop 대신 수기 '저장 중…' | `FormPageShell.tsx` 에 `backLinkStyle` + 수기 문자열 존재 | gap (앱 전역 · 공용 셸) |
| COMP-02 | P1 | `CrudTable.tsx:124-130,173-179` 가 `SelectAllHeaderCell`·`RowSelectCell`·`SeqHeaderCell`·`SeqCell` 사용. raw checkbox 0건 | `CrudTable.tsx` 에 `type="checkbox"` grep = 0 | pass |
| COMP-03 | P1 | `PromotionListPage.tsx:125-130` 이 DS `<SearchField>` 사용 | `type="search"` grep = 0 | pass |
| COMP-04 | P1 | required 필드 전부 `FormField required` 로 `*`: 프로모션명(`:145`) · 대상(`:181`) · 상태(`:172`) · **할인 유형(`:197`)** · **할인값(`:206-210`)** · 쿠폰코드(`:260-265`). `DateRangeField required`(`:162`)도 `*`. **최소 주문금액은 의도적으로 required 가 아니다**(0 = 조건 없음) | 라벨 옆 `*` 렌더 확인 | pass |
| COMP-07 | P2 | `CrudTable.tsx:179` `<SeqCell seq={index + 1} />` — `startIndex` 없음 | **현재 재현 불가**(페이지네이션 부재). IA-04 해소 시 **즉시 위반** | gap (조건부 · IA-04 종속) |
| **COMP-11** | **P1** | **폼의 기간 입력**: DS `DateRangeField`(`PromotionFormPage.tsx:160-169`) 단일 컴포넌트, 키보드 조작 가능, 에러를 `role="alert"` 로 주입. **`start ≤ end` 가 실제로 강제된다** — `validation.ts:43-50` 의 `if (end < start)` → '종료일은 시작일보다 빠를 수 없습니다.', `promotions.test.ts:92` '종료일이 시작일보다 빠르면 막는다' 가 고정. **quality-bar 가 우려한 '종료일<시작일 → silent empty' 는 이 화면에 없다**(재검증 완료). **PR #28 에서 앞단 검사가 강화됐다** — 역전 검사에 앞서 도는 실재 날짜 검사(`validation.ts:34`)가 `_shared/campaign.ts` 의 사본 `isRealDate` 에서 정본 `isCalendarDate`(`shared/format.ts:244-249`)로 수렴했다. **동작이 실제로 바뀌었다**: 구 사본은 형식만 봐서 `2026-02-31` 을 통과시킨 뒤 `Date` 가 3월 3일로 굴린 값을 저장했고, 정본은 UTC 정오 앵커 왕복으로 **정확히 거부**한다. 회귀 `promotions.test.ts:104` '달력에 없는 날짜(2026-02-31)를 주면 막는다'. **목록의 기간 필터**: 표면 자체가 없다 | 폼에서 시작 2026-07-31 · 종료 2026-07-01 입력 후 제출 → **빈 테이블이 아니라** 인라인 검증 에러 + 두 칸 `aria-invalid`. 시작 `2026-02-31` 입력 후 제출 → '프로모션 기간을 YYYY-MM-DD 형식으로 입력하세요.'(**이전 기준에서는 통과했다**) | **pass** (기간 입력 축) · **미충족 축**: ① preset('오늘/최근 7일/이번 달/지난 달') 없음 ② **목록에 기간 필터 자체가 없다** — appliesTo('기간 필터 리스트')가 성립하지 않아 그 축은 N/A |
| COMP-12 | P2 | 설명만 실시간 카운터(`TextareaField.tsx:52`). 프로모션명(80자)·대상(60자)에는 없다. 대상은 `maxLength` 속성도 없다. **할인값·최소 주문금액은 길이 제한 필드가 아니라 이 요구의 대상이 아니다**(범위 검증은 §2 EXC-04 축이 아니라 ERP-14) | 프로모션명 80자 근접 → 경고·카운트 없이 조용히 멈춘다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: write 성공=toast · read 실패=인라인 Alert · 다이얼로그 내부 실패=그 다이얼로그 배너 · 저장 실패=폼 카드 배너 | FS-032 §4.1 '실패 통지의 자리' 6분기 확인 | pass |
| FEEDBACK-03 | P1 | 삭제 성공 toast/실패 배너 · 일괄 성공 toast/부분 실패 배너 · 저장 성공 toast/실패 배너. no-op 없음 | `?fail=marketing-promotions:<op>` 각 op 이 가시 실패를 낸다 | pass |
| FEEDBACK-05 | P2 | 모든 delete 가 `ConfirmDialog` 게이트 + 비가역성 고지. undo window 없음. **진행 중 프로모션도 확인만 거치면 지워진다**(BE-032 §7.6) | 단일 미확인 클릭 delete 0건 | pass · 진행 중 삭제 차단은 BE-032 §7.6 로 이관 |
| A11Y-03 / A11Y-04 | P1 | 표면: 삭제·일괄 삭제 `ConfirmDialog`. 초기 포커스·busy 시 포커스 유지는 DS 소유 | DS 판정 | 종속 |
| A11Y-05 | P1 | **N/A** — 이 화면의 `SelectField` 3종(상태·할인 유형)은 error 를 받지 않는다(고정 enum + 기본값). `isInvalid` 표면이 없다 | — | N/A |
| A11Y-08 | P1 | 행 클릭(`CrudTable.tsx:172`)은 마우스 전용이지만 같은 행의 `RowActions` 연필(`:192-197`)이 **동일 목적지**(`onEdit`)로 가는 keyboard-focusable 등가물 | 행을 Tab → 연필 → Enter → 수정 폼 | pass |
| A11Y-13 | P1 | submit 실패 시 첫 error 포커스 ✓ — `useCrudForm.ts:253` `handleSubmit(onValid, onInvalid)` + RHF `shouldFocusError`. 422 도 `:184` `setFocus`. **폼 진입 시 첫 필드 자동 포커스는 없다**. **주의: 최소 주문금액이 첫 위반이면 포커스는 가지만 `aria-invalid` 가 없어 스크린리더가 무효를 알리지 않는다**(A11Y-11 gap) | 빈 required 제출 → `activeElement` = 프로모션명 ✓. `/new` 진입 직후 → `<body>` ✗ | 부분 gap |
| A11Y-16 | P1 | `CrudListShell.tsx:107-109` 가 **항상 마운트된** polite live region 소유 + 목록 상태 주입 | 필터로 0행 → '조건에 맞는 프로모션 결과가 없습니다.' announce | pass |
| IA-03 | P1 | breadcrumb 없음 | `/marketing/promotions/new` 에 trail 부재 | gap (앱 전역) |
| IA-07 | P1 | `FormPageShell.tsx:147-155` — '목록으로' + `ChevronLeftIcon`, 좌상단 | 일치 | pass |
| IA-08 | P1 | `FormPageShell.tsx:179-191` — 취소(secondary) 좌 · 저장(primary) 우, in-card | 일치 | pass |
| IA-14 | P1 | 반응형 계약 미선언. **이 화면은 폼 필드가 많아**(할인 3필드가 `rowStyle` auto-fit 그리드 — `PromotionFormPage.tsx:196-244`) 좁은 폭에서 더 취약하다 | 768px/375px 미검증 | gap (앱 전역) |
| ERP-01 | P1 | `_shared/campaign.ts:39-47` 의 `PHASE_TONE` 이 **마케팅 섹션 공용** 레지스트리(이벤트·프로모션 공유). **앱 전역 단일 소스가 아니다** | 다른 섹션의 '진행중' 과 tone 교차 확인 | gap (부분 — 섹션 스코프 존재, 전역 미통합) |
| ERP-04 | P1 | sortable header 없음 — `sortPromotions`(`types.ts:75-80`) 고정(시작일 내림차순). **할인액·할인율로 정렬할 수 없다** — 금액 열이 있는 화면에서 특히 아쉽다 | 헤더 클릭·`aria-sort` 0건 | gap |
| ERP-06 | P1 | microcopy 표준 문서 부재 | 표준 부재 | gap (앱 전역) |
| **ERP-07** | **P2** | **할인 컬럼이 `numeric: true`(우측 정렬 + `tabular-nums` — `PromotionListPage.tsx:97`)인데 `discountLabel`(`types.ts:47-49`)이 '원' 을 숫자에 붙여 반환한다** — `'5,000원'`. 우측 정렬 열에서 **단위가 마지막 자릿수를 따라다녀** 여러 행의 자릿수가 세로로 정렬되지 않는다. quality-bar 가 지목한 `formatWon` 패턴과 동일한 결함 | 정액 프로모션 '5,000원' · '500,000원' 을 같은 열에 두면 숫자 끝이 어긋난다. 정률 행('20%')과 섞이면 더 심하다 | **gap** |
| **ERP-08** | **P2** | ① **정률 표기가 raw `String(value)`** — `types.ts:48` `` type === 'rate' ? `${String(value)}%` : `${formatNumber(value)}원` ``. 정액은 `formatNumber` 를 쓰는데 정률만 `String()` 이다. 현재 정률 상한이 100 이라 천단위 구분이 필요 없어 **실질 무해하나**, quality-bar 의 '셀에서 raw `String()`/`toString()` 임의 호출 금지' 를 문자 그대로 어긴다 ② 기간 셀은 저장 문자열을 그대로 잇는다(`PromotionListPage.tsx:92`) — 값이 이미 표시 형식이라 무해 | 셀 렌더 코드에 `String(` grep > 0 | **gap** (경미 — 규약 이탈이나 현재 오출력 없음) |
| **ERP-09** | **P2** | **F3b 에서 뒤집혔다.** `PromotionListPage.tsx:88` 의 `const today = formatDate(new Date())` 가 이제 **KST 고정**이다 — `format.ts:63` `DISPLAY_TIME_ZONE = 'Asia/Seoul'`, `:76-85` 가 `Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TIME_ZONE, … })` 를 만들고 `:102-124` `partsOfDate` 가 `formatToParts` 로 조각을 뽑아 `:161-165` `formatDate` 가 `YYYY-MM-DD` 로 조립한다. **로컬 getter 0건.** 이 `today` 가 `derivePhase(startAt, endAt, today)`(`campaign.ts:44-48`)의 비교 기준이 되어 '기간상 XX' 배지를 결정한다. 표시 TZ 정책이 화면에도 적힌다(`format.ts:68` `TIME_ZONE_NOTICE`). 달력 산술 앵커는 UTC 정오 한 벌로 수렴(`format.ts:39-47` · `format.test.ts:90,117`) | 종료일 2026-07-16 프로모션을 07-17 00:30 KST 에 본다 → **서울·UTC 관리자 둘 다** `today='2026-07-17'` → **둘 다** '기간상 종료' 배지. OS 타임존을 바꿔도 같다. 저장·비교 값이 전부 달력일 문자열이라 Date 왕복이 없다(`campaign.ts:45-46` 문자열 사전순 비교) | **pass** (F1·F2 의 gap 이 F3b 수렴으로 해소) |
| **ERP-13** | **P1** | **통합에서 뒤집혔다.** 조사 헬퍼가 `shared/format.ts:267-325` 로 승격됐다(이전엔 `logs/josa.ts`·`notifications/_shared/notification.ts` 등 사본 3곳). 한글 음절 U+AC00–U+D7A3 의 종성(`(code-0xAC00) % 28`)으로 받침을 판정한다(`:282-303`). 이 화면의 전 경로가 소비한다: `useCrudForm.ts:222` `` `${entityLabel}${objectParticle(entityLabel)} ${verb}했습니다.` `` → **'프로모션을 등록했습니다'** — F2 에서 '우연히 맞던' 것이 이제 **규칙**이다 · `useCrudList.tsx:108,158` 이 **행 이름의 받침**으로 고른다(임의 프로모션명도 정확: '봄 시즌 10% 특가**를** 삭제했습니다' — '가' 는 받침 없음) · `FormPageShell.tsx:129-130` · `shared/crud/validation.ts:22,25` → '프로모션명을 입력하세요' · '프로모션명은 60자를 넘을 수 없습니다' ✓. 빈 상태의 주격(이/가)은 `Empty.tsx:25-26,68` 이 자족 헬퍼로 그린다(`@tds/ui` 는 앱을 import 할 수 없다 — 의도된 자족, `format.ts:275-277` 이 명시) | 사용자 대상 문자열의 `'을(를)'`·`'이(가)'`·`'은(는)'` grep = **0**. 남은 히트는 주석·테스트 단언·헬퍼 설명문뿐 | **pass** |
| **ERP-14** | **P1** | **금액·마스킹 입력 primitive 가 없다.** 할인값(`PromotionFormPage.tsx:212-225`)·최소 주문금액(`:233-242`)이 `type="text" inputMode="numeric"` 생 입력이다. ① **실시간 천단위 구분 없음** ② **paste normalize 실패** — `digitsToNumber`(`:52-55`)가 콤마를 벗기지만 **검증이 먼저 돈다**: `validation.ts:55-62` 의 `INT_RE = /^\d+$/` 가 `'1,234,000'` 을 '할인값은 숫자만 입력할 수 있습니다.' 로 거절해 **`digitsToNumber` 에 도달하지 못한다** — 그 관용은 **죽은 코드**다. quality-bar 가 명시적으로 요구하는 "붙여넣은 '1,234,000원' 이 1234000 으로 parse" 가 **정확히 실패한다** ③ RHF/zod 에 canonical 숫자를 노출하는 것은 `toInput` 이 하지만 검증 통과 후뿐이다 | 최소 주문금액에 `30,000` 붙여넣기 → 저장 시도 → normalize 대신 '숫자만 입력할 수 있습니다.' 거절. **게다가 그 에러가 `aria-invalid` 없이 뜬다**(A11Y-11 gap) | **gap** — **NFR-031(이벤트)은 이 항목이 N/A 다**(금액 필드 부재) |
| ERP-15 | P1 | 대형 list 계약 없음 — cap·virtualization 없이 전량 렌더 | 1,000행 미검증 | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 앱 전체 0건 | never-resolving fixture → 무한 스피너 | gap (앱 전역) |
| EXC-06 | P1 | `HttpError` 가 status 를 싣고 `?status=<op>:<code>` 로 재현 가능하며 **404**(`useCrudForm.ts:141`) · **409/412**(`:160`) · **422**(`:176`) · **401**(`queryClient.ts:39`)은 각기 다른 surface. **403 · 429 · 400 은 전용 분기가 없어** 일반 실패 배너로 수렴 | `?status=list:403` → '불러오지 못했습니다'(권한 메시지 아님). `?status=save:429` → backoff 안내 없음 | 부분 gap |
| EXC-07 | P1 | `useCrudForm.ts:176-186` 이 422 `violations` 를 `setError(field)` + `setFocus(first)` 로 매핑. **배선은 완전하나 픽스처가 `violations` 를 만들지 않아**(`dev.ts:84` — 빈 배열) 현재 재현 경로가 없다. **BE-032 §7.3 의 할인 범위 422 가 이 경로로 온다** | 서버 연동 후 `error.fields:[{name:'discountValue'}]` 있는 422 → 그 필드 인라인 + 포커스 | pass (배선) · 재현 불가 |
| EXC-10 | P1 | `settleAll` 이 **실패 건수만** 반환(`crud.ts:235-236` · `useCrudList.tsx:135-141`). 실패 id 미반환 → 재시도가 전량 재발사 | 3건 중 1건 실패 → 'N건 중 M건' 배너 ✓, 어느 행인지 모름 ✗ | gap |
| EXC-11 | P1 | `navigator.onLine` 앱 전체 0건 | offline 토글 → 배너 없음 | gap (앱 전역) |
| EXC-12 | P1 | `useCrudForm.ts:138-143` 이 `isNotFound` 로 갈라 `FormPageShell.tsx:115-143` 이 **404 → '찾을 수 없습니다' + '목록으로'만** / **error → '다시 시도' + '목록으로'**. 무한 스피너 없음 | `/marketing/promotions/nope/edit` → not-found. `?status=detail:500` → retry + list | pass |
| EXC-14 | P1 | **N/A** — 이 화면에 optimistic write 가 없다. 인라인 토글·재정렬이 없고 저장·삭제는 confirm + busy 의 비관적 경로다 | — | N/A |
| EXC-15 | P1 | **N/A** — **이 화면에 파일 업로드·이미지 필드가 없다.** `ImageUploadField` import 0건, 목록에 이미지 열 없음(`PromotionListPage.tsx:4` 주석). '쿠폰 연동' 은 쿠폰**코드 문자열**이지 파일이 아니다. `data-source.ts` 에 업로드 심이 없는 것은 **정합한 상태**다 (BE-032 §7.8 — 후속 도입 시 `blob:`/`data:` 스킴 거절 계약) | — | N/A |
| EXC-18 | P1 | `toggleAll` 이 **보이는 행 id 만** 받아(`CrudListShell.tsx:143-147`) scope 가 'current view' 로 암묵 정의. cross-page 'all' 이 없어 대량 오클릭 위험은 낮다. **Shift-click range 없음 · 임계값 강화 confirm 없음 · progress/cancel 없음** | 50행 선택 → 체크박스 50회 클릭 | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 스냅샷 없음. 401 인터셉터가 프로그램적으로 이동하므로 FEEDBACK-04 가드가 발화 불가 | 프로모션 작성 중 401 → 입력 전량 소실 | gap (앱 전역) |
| EXC-20 | P1 | 저장 실패는 참조 코드 표시 ✓(`useCrudForm.ts:189` → `FormPageShell.tsx:167`). raw body/stack 미노출 ✓. **목록 조회 실패**(`CrudListShell.tsx:159`)·**삭제 실패**(`useCrudList.tsx:111`) 배너는 참조 코드를 버린다 | `?status=save:500` → 코드 ✓. `?status=list:500` → 코드 없음 ✗ | 부분 gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 |
|---|---|---|
| 목록 첫 렌더(스켈레톤 등장) | ≤ 100ms | `PromotionListPage` 는 `App.tsx:100` 에서 **정적 import**(lazy 아님) |
| 목록 데이터 표시(p95) | ≤ 600ms (서버 연동 후) | **측정 불가** — 픽스처가 `LATENCY_MS = 400` 을 무조건 기다린다 |
| 저장 왕복(p95) | ≤ 800ms | 픽스처 400ms + 목록 무효화 재조회 400ms ≈ **800ms**(응답 본문을 버리고 재조회 — BE-031 §7.10 상속) |
| 재조회 횟수 | 진입 1회 + 쓰기당 1~2회 | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts:24,64,74`). **검색·필터는 재조회를 유발하지 않는다** |
| 검색 입력당 연산 | — | **커밋당 1회 전량 재필터** — 조합 중·250ms 디바운스 대기 중에는 재필터가 없다(`useDebouncedSearch.ts:87,93-95`). '봄맞이' 입력 시 F2 의 자모 여러 회 → **1회**(COMP-10 pass). 커밋마다 URL 이 `replace` 로 갱신돼 리렌더 1회가 함께 든다 |
| DOM 행 수 | 페이지당 ≤ 50 | **상한 없음** — 전량 렌더(IA-04 · ERP-15 gap) |
| 메모리 | — | 프로모션 전량이 react-query 캐시 + `useMemo` 파생 배열 2개로 상주 |
| 번들 | — | 이 화면 고유 의존성 없음 — 전부 공용 |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 로딩 상태를 화면에서 볼 수 있게 하려고 픽스처에 넣은 인위적 대기다. 위 '현재' 열의 400ms·800ms 는 **실제 성능이 아니라 픽스처 상수**이며 백엔드 연결 시 사라진다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 배너 + 재시도 | 충족(STATE-02) — 참조 코드 없음(EXC-20 부분 gap) |
| 상세 404 | not-found surface + '목록으로' | 충족(EXC-12) |
| 저장 중 5xx | 배너 + 참조 코드, 입력 보존 | 충족(EXC-20) |
| 저장 중 409(대상 삭제됨) | 충돌 다이얼로그, 입력 보존, 유령 저장 금지 | 충족(EXC-04 부분) |
| **동시 수정(A·B 동시 저장)** | 나중 저장이 409/412 로 거절 | **미충족 — 마지막 저장이 조용히 이긴다. 할인율이 걸려 있어 금전 손실**(EXC-04 gap · BE-032 §7.5) |
| **서버 측 할인 범위 위반**(음수·100% 초과) | 422 + 필드 인라인 에러 | **프론트 배선 충족**(EXC-07) · **서버 계약 미구현** — 현재는 `promotionSchema` 만이 막고 있어 어댑터 우회 호출은 무방비(BE-032 §7.3) |
| 네트워크 단절 | 오프라인 배너 + 쓰기 게이팅 | 미충족(EXC-11 gap) |
| 서버 무응답 | 클라이언트 타임아웃 후 재시도 안내 | **미충족 — 상한 없음**(EXC-05 gap) |
| 세션 만료(편집 중) | 재인증 후 입력 복원 | 부분 — 재인증 경로 충족(EXC-02), **입력 소실**(EXC-19 gap) |
| 화면 렌더 예외 | 셸 유지 + 복구 UI | 충족(EXC-01) |
| 일괄 삭제 중 일부 429 | 실패분 식별 + 그것만 재시도 | 미충족(EXC-10 gap · BE-032 §7.5) |
| 브라우저 새로고침 | 목록 조회 상태 복원 | **충족 — `?phase=`·`?q=` 가 URL 에 있어 복원된다**(IA-13 pass · `useListState.ts:87-99`) |

### 4.3 데이터 보존 · 감사

| 항목 | 현재 상태 |
|---|---|
| **변경 이력** | **없다.** `Promotion` 에 `createdAt`·`updatedAt`·`createdBy`·`updatedBy` 가 없다(`types.ts:20-37`). **누가 언제 할인율을 20%에서 50%로 바꿨는지 추적할 수 없다** — 이벤트보다 강한 요구다(매출 직접 영향) |
| 삭제 | **하드 삭제.** soft-delete·undo 없음. **진행 중 프로모션도 지워진다**(BE-032 §7.6) |
| 감사 로그 | 서버 계약에 없다. **할인 관련 필드(`discountType`·`discountValue`·`minOrderAmount`·`phase`)의 변경은 이전/이후 값과 함께 남겨야 한다** — BE-032 §7.14 로 이관 |
| 주문 적용 이력 | 이 계약의 범위 밖. **주문에 적용된 할인의 스냅샷이 없으면** 프로모션 수정이 과거 주문의 할인을 소급 변경한다 — BE-032 §7.4 #6 |
| 픽스처 휘발성 | **새로고침하면 모든 변경이 사라진다** — 어댑터가 브라우저 메모리 배열이다. 백엔드 부재의 결과이며 결함이 아니다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | ~~COMP-10~~ | ~~P0~~ | **해소 (F3b)** — `PromotionListPage.tsx:80,145-151` 이 `useListState` 를 통해 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다. 조합 중 커밋 금지·250ms 디바운스·Enter 차단 전부 붙었다 | — | **닫힘** |
| 2 | IA-02 | **P0** | 하위 라우트가 브랜치 라벨('마케팅 관리')로 폴백 + h1 2개 | 앱 전역(`AppHeader`·`findNavLabel`) | A11 change_request |
| 3 | IA-04 | **P0** | Pagination 부재 — 전량 렌더 | 앱 전역(`CrudListShell`) | A11 change_request |
| 4 | ~~IA-13~~ | ~~P0~~ | **해소 (F3b)** — `PromotionListPage.tsx:80` 이 `useListState` 를 소비해 `?phase=`·`?q=` 를 URL 이 소유한다(`useListState.ts:87-99,125`). F5·Back·링크 공유로 복원된다 | — | **닫힘** |
| 5 | EXC-03 | **P0** | 쓰기 컨트롤 권한 게이팅 없음 — `useRouteWritePermissions` 소비자 0건. **할인 정의는 금전 권한이라 무게가 크다** | 앱 전역 | A11 change_request |
| 6 | EXC-04 | **P0** | 낙관적 동시성 토큰 부재 — '먼저 수정' 미감지(last-write-wins). **할인율이 조용히 덮인다 = 금전 손실. 이벤트보다 우선순위 높음** | 이 화면 + 서버 계약 | A63 (**BE-032 §7.5**) · A41(`types.ts`·어댑터) |
| 7 | **A11Y-11** | **P0** | **`promo-min-order` 입력이 `aria-invalid`·`aria-describedby` 를 배선하지 않는다**(`PromotionFormPage.tsx:233-242`) — 같은 폼의 다른 5필드는 전부 지킨다. 위반 시 붉은 테두리만 남는 **색상 단독 표기**(WCAG 1.4.1). hint 도 미연결 | **이 화면 단독** — 3줄 수정으로 해소 | A11 change_request (**BE-032 §7.13**) |
| 8 | COMP-01 | P1 | 공용 폼 셸의 '목록으로' 가 DS Button 아님 + 수기 '저장 중…' | 앱 전역(`FormPageShell`) | A11 change_request |
| 9 | COMP-12 | P2 | 프로모션명·대상에 카운터 없음. 대상은 `maxLength` 속성도 없음 | 이 화면 | A11 change_request |
| 10 | IA-03 | P1 | breadcrumb 부재 | 앱 전역 | A11 change_request |
| 11 | IA-14 | P1 | 반응형 계약 미선언 — 할인 3필드 그리드가 좁은 폭에서 취약 | 앱 전역 | A11 change_request |
| 12 | ERP-01 | P1 | status→tone 이 마케팅 섹션 스코프 — 앱 전역 단일 레지스트리 아님 | 앱 전역 | A11 change_request |
| 13 | ERP-04 | P1 | sortable header 부재 — 할인액·할인율 정렬 불가 | 앱 전역(`CrudTable`) | A11 change_request |
| 14 | ERP-06 | P1 | microcopy 표준 문서 부재 | 앱 전역 | A11 change_request |
| 15 | **ERP-07** | P2 | **할인 컬럼의 '원' 이 숫자에 붙어 우측 정렬 자릿수가 어긋난다**(`types.ts:47-49` `discountLabel`) | 이 화면 | A11 change_request |
| 16 | **ERP-08** | P2 | **정률 표기가 raw `String(value)`** — 정액만 `formatNumber` 경유(`types.ts:48`). 현재 오출력은 없으나 규약 이탈 | 이 화면 | A11 change_request |
| 17 | ~~**ERP-09**~~ | ~~P2~~ | **해소 (F3b)** — `formatDate`(`format.ts:161-165`)가 KST 고정 Intl 포매터(`:63,76-85,102-124`)를 쓴다. `derivePhase` 기준일이 보는 사람의 OS 타임존과 무관해졌다 | — | **닫힘** |
| 18 | ~~**ERP-13**~~ | ~~P1~~ | **해소 (통합)** — 조사 헬퍼가 `shared/format.ts:306(objectParticle)·311(topicParticle)` 로 승격되고 `useCrudForm.ts:222`·`useCrudList.tsx:108,158`·`FormPageShell.tsx:129-130`·`crud/validation.ts:22,25` 가 소비한다. 리터럴 '을(를)' **0건** | — | **닫힘** |
| 19 | **ERP-14** | P1 | **금액 입력에 마스킹·paste normalize 없음** — `digitsToNumber` 의 콤마 제거가 검증(`/^\d+$/`)에 막혀 **죽은 코드**다. 붙여넣은 '1,234,000' 이 normalize 되지 않고 거절된다. 실시간 천단위 구분도 없다 | 이 화면 + `shared/format`(마스킹 primitive) | A11 change_request |
| 20 | ERP-15 | P1 | 대형 list 렌더 계약 부재 | 앱 전역 | A11 change_request |
| 21 | EXC-05 | P1 | 클라이언트 타임아웃 상한 부재 | 앱 전역 | A11 · A63 (**BE-032 §2** 서버 상한 5초) |
| 22 | EXC-06 | P1 | 403·429·400 전용 surface 부재 | 이 화면 + 공용 셸 | A11 (**BE-032 §7.9 · §7.12**) |
| 23 | EXC-10 | P1 | 일괄 삭제가 실패 id 미반환 | 앱 전역 + 서버 계약 | A11 · A63 (**BE-032 §7.5**) |
| 24 | EXC-11 | P1 | 오프라인 감지 부재 | 앱 전역 | A11 change_request |
| 25 | EXC-18 | P1 | Shift-range·임계값 confirm·progress/cancel 부재 | 앱 전역 | A11 change_request |
| 26 | EXC-19 | P1 | 세션 만료 시 dirty 초안 소실 | 앱 전역 | A11 · A63 |
| 27 | EXC-20 | P1 | 조회·삭제 실패 배너에 참조 코드 미표시 | 앱 전역 | A11 (**BE-032 §7.11**) |
| 28 | A11Y-13 | P1 | 폼 진입 시 첫 필드 자동 포커스 없음 | 앱 전역(`FormPageShell`) | A11 change_request |
| 29 | COMP-07 | P2 | `SeqCell seq={index + 1}` — **IA-04(#3) 해소 시 즉시 위반** | 앱 전역(`CrudTable`) | A11 (#3 과 함께) |
| 30 | (BE) | — | **서버 측 할인 범위 검증 부재** — 현재 `promotionSchema` 만이 음수·0·100% 초과를 막는다. 어댑터 우회 호출은 무방비. quality-bar 축이 아니라 **BE-032 §7.3 의 보안 판정**이며, 프론트 gap 이 아니라 **서버 계약 미구현**이다 | 서버 | A63 (**BE-032 §7.3 · 최우선**) |

> **BE-032 §7 로 가는 것**: #6(§7.5 version/If-Match) · #7(§7.13 A11Y) · #17(이관 #17 TZ) · #21(§2 타임아웃) · #22(§7.9 · §7.12) · #23(§7.5 일괄) · #27(§7.11 traceId) · #30(§7.3 할인 범위).
>
> **FS-032 §7 미결 사항과의 대응**: FS #2→gap1 · FS #3→gap2 · FS #4→gap5 · FS #5→gap3/13/20 · FS #6→gap29 · FS #7→gap17 · FS #8→gap22 · FS #9→gap18 · FS #10→gap23/25 · FS #11→gap8 · FS #12→gap9 · FS #13→BE-032 §7.6 · FS #14→BE-032 §7.2 · FS #15→gap6 · FS #16→gap26 · FS #17→COMP-09 · FS #18→gap24 · FS #19→gap21 · FS #20→gap4 · FS #21→gap15 · FS #22→gap16 · FS #23→gap19 · FS #24→gap30 · **FS #25→gap7** · FS #26→BE-032 §7.7('적용하지 않음' 확정).

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래는 코드(`shared/crud/dev.ts` · `promotions/data-source.ts:57`)에서 확인한 실제 스위치만 적는다.

| 스위치 | 형식 | 이 화면의 실제 값 |
|---|---|---|
| 실패 재현 | `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all` | **scope = `marketing-promotions`** (`data-source.ts:57`). **op = `list`**(`fetchAll`) · **`detail`**(`fetchOne`) · **`save`**(`create` **와** `update` 공용 — `crud.ts:61,66`) · **`delete`**(`remove`). 예: `?fail=marketing-promotions:save` · `?fail=list` · `?fail=all` |
| status 재현 | `?status=<op>:<code>` · `?status=all:<code>` | 재현 가능 status: **400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500**(`dev.ts:27-37`). 예: `?status=save:409`(충돌 다이얼로그) · `?status=detail:404` · `?status=list:403` · `?status=save:500`(참조 코드) |
| 지연 재현 | — | **`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 에 지연 스위치가 없고 이 어댑터는 `LATENCY_MS = 400` 상수만 무조건 기다린다 |

| 판정 대상 | 재현 절차 |
|---|---|
| STATE-01 | 진입(스켈레톤만) → 삭제 후 재조회(이전 행 유지) → `?fail=marketing-promotions:list`(배너만) |
| STATE-02 | `?fail=marketing-promotions:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건 |
| EXC-04 | `?status=save:409` → 입력 보존 + 충돌 다이얼로그. **동시 수정 gap 은 스위치로 재현 불가** — 두 탭 수동 재현 필요 |
| EXC-08 | 등록 폼 Enter 연타 → 요청 1건. `?fail=marketing-promotions:save` 후 재클릭 → 같은 멱등키 |
| EXC-09 | 삭제 확인 → 응답 전 Esc → 토스트 0건 |
| EXC-12 | `/marketing/promotions/nope/edit` → not-found. `?status=detail:500` → retry + list |
| EXC-20 | `?status=save:500` → 참조 코드 ✓ / `?status=list:500` → 코드 없음 ✗ |
| COMP-11 | 폼에 시작 2026-07-31 · 종료 2026-07-01 → 제출 → 인라인 에러(빈 테이블 아님). 시작 `2026-02-31` → 제출 → 형식 에러(`a5c2639` 부터 — PR #28 이전에는 통과했다). `pnpm vitest promotions.test.ts` 가 둘 다 고정(`:92` 역전 · `:104` 달력에 없는 날짜) |
| **A11Y-11** | 최소 주문금액에 `30,000` 입력 → 제출 → 에러 `<p>` 는 뜨는데 `<input id="promo-min-order">` 에 `aria-invalid`·`aria-describedby` 없음. **다른 5필드와 DOM 을 비교하면 즉시 드러난다.** ⚠ **`?status=save:422` 로는 재현되지 않는다** — `dev.ts:84` 의 422 는 `violations` 가 **빈 배열**이라 `useCrudForm.ts:176` 의 `violations.length > 0` 조건에 걸려 인라인 매핑이 돌지 않는다. **클라이언트 검증(콤마 입력)으로 재현하라** |
| **ERP-14** | 최소 주문금액·할인값에 `1,234,000` 붙여넣기 → 저장 → normalize 대신 '숫자만 입력할 수 있습니다.' 거절. `digitsToNumber`(`PromotionFormPage.tsx:52-55`)가 실행되지 않음을 브레이크포인트로 확인 |
| **ERP-07** | 정액 프로모션 '5,000원'·'500,000원' 을 같은 열에 두고 우측 정렬 자릿수 확인 |
| COMP-10 · IA-13 | **스위치 없음 — 배선이 곧 판정이다.** `?phase=ongoing&q=할인` 으로 직접 진입 → 필터·검색어 복원 + 입력창에 '할인' 이 채워진다(`useListState.ts:90` → `useDebouncedSearch.ts:55,78-82`). **`useDebouncedSearch` 를 `PromotionListPage.tsx` 에서 grep 하면 0건이다 — 소비는 `useListState` 경유이므로 grep 수치로 판정하지 말 것** |
| A11Y-11 · IA-04 · IA-02 · EXC-03 | **스위치 없음 — 코드 부재가 곧 판정이다.** grep: `pages/marketing/**` 에 `<Pagination`·`pageSize` 0건 · `useRouteWritePermissions` 0건. `PromotionFormPage.tsx:227-243`(최소 주문금액)에 `aria-invalid` 0건. `document.querySelectorAll('h1').length` 가 `/new` 에서 2 |

| 단위 테스트 | 범위 |
|---|---|
| `promotions.test.ts` | 순수 규칙(할인 표기·필터·검색·정렬·변환) + `promotionSchema` 검증 6건 — **할인값 0 거절(`:78-80`) · 정률 100 초과 거절(`:81-85`) · 정액 100 초과 통과(`:86-91`)** · 기간 역전(`:92-96`) · 쿠폰코드 필수(`:97-101`) |
| `CrudTable.test.tsx` | 공용 프레임워크(이 화면이 소비하는 것) |

## 7. 자기 점검 (제출 전 확인)

- [x] quality-bar 요구 문구를 **복제하지 않았다** — ID 로만 참조하고 '이 화면에서 어떻게 / 무엇을 재현하면' 만 적었다
- [x] §2 P0 **30행 전수**. 순서는 quality-bar 지정 순서를 따랐다. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — FEEDBACK-06 · A11Y-12 · A11Y-05 · EXC-14 · EXC-15
- [x] 모든 `pass` 에 코드 근거(파일:라인)를 달았다
- [x] 모든 `gap` 에 **재현 가능한 측정 기준**을 달았다. 재현 불가한 것(EXC-04 동시 수정 · A11Y-11 의 `?status` 경로)은 그 사실과 대안 재현법을 명시했다
- [x] §2.1 산수 검산 — 12(pass) + 11(종속) + 2(N/A) + 5(gap) = **30** ✓ / 차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓
- [x] **NFR-031 과의 차이 3건을 명시했다** — A11Y-11(pass→**gap**) · ERP-14(N/A→**gap**) · ERP-07(표면 부재→**gap**). 나머지 판정은 골격 공유로 동일하다
- [x] §3 은 **표면이 실재하는 것만** 골랐다. 표면이 없는 P1/P2(ERP-10 print · ERP-11 배송 · ERP-12 export · MOTION-04/05 · IA-09/10/11/12 · TOKEN-06~13 · COMP-05/06/08 · A11Y-09/10/14/15 · EXC-13/16/17)는 적지 않았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`marketing-promotions`)·op(`list`·`detail`·`save`·`delete`)를 **코드에서 확인**해 적었다. **`?delay=` 를 쓰지 않았고** 부재 사실을 명시했다. 'E2E 미실행 — 판정 근거는 코드 대조' 를 명시했다
- [x] **2026-07-17 · `HEAD = 4b805ad`(F3a·F3b·통합) 기준으로 30행 전수 재검증했다. F2(`3cd3078`) 판정을 재사용하지 않았다.** 뒤집힌 판정 4건: **COMP-10** gap→pass(`PromotionListPage.tsx:80,145-151` → `useListState.ts:227-230` → `useDebouncedSearch.ts:87,93-95,121-129`) · **IA-13** gap→pass(`useListState.ts:87-99,108-129`) · **ERP-09** gap→pass(`format.ts:63,76-85,161-165`) · **ERP-13** gap→pass(`format.ts:306,311` + 소비처 4곳). **사유가 바뀐 gap 2건**: IA-02(브랜치 폴백 → h1 이중·행위 미반영 — `nav-config.ts:260-278,294-299`) · EXC-03(소비자 0 → 7곳 있으나 marketing 미배선). **유지된 gap 3건**: **A11Y-11**(최소 주문금액 `PromotionFormPage.tsx:227-243` — 재확인함) · IA-04 · EXC-04. **grep 함정 2개를 피했다**: ① `aria-required` 는 `FormField.tsx:50-56` 의 런타임 `cloneElement` 주입이라 앱 소스 grep 으로 판정하지 않았다 ② `useDebouncedSearch` 는 `useListState` 경유 소비라 화면 파일 grep 이 0건이어도 pass 다
- [x] §5 가 FS-032 §7(26건 전수 대응) · BE-032 §7 과 상호 참조된다
