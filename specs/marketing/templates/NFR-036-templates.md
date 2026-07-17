---
id: NFR-036
title: "발송 템플릿 비기능 명세"
functionalSpec: FS-036
backendSpec: BE-036
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-036. 발송 템플릿 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-036 발송 템플릿 (`/marketing/templates` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다.** 요구 문구는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가' 만 적는다 |
| 함께 읽는 문서 | FS-036(요소·예외) · BE-036(엔드포인트·**승인 상태 보안 판정**) · BE-003 §2·§3(에러 봉투·권한) |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 표를 다시 채점한다. 화면 코드가 바뀌면 gap 행의 근거(파일:라인)를 다시 확인한다 |
| 판정 시점 | **2026-07-17 · `HEAD = a5c2639`** (PR #22·#24·#26·#28·#30·#32·#34 머지 후) 코드 대조. 직전 판정은 `4b805ad` 기준이었고 그때 **COMP-10 · IA-13 · EXC-04 가 pass 로 뒤집혔다**(§2 · §2.1 · §5) — 특히 **EXC-04 는 F3b 가 `createStoreAdapter` 에 존재 검사 + 409 를 넣어 유령 저장이 해소된 것**이다. **이번 기준 갱신으로 뒤집힌 판정은 없다** — P0 30건의 건수·판정이 전부 그대로다. **이 화면에는 `SegmentPicker`·`ImageUploadField`·`ToggleSwitch` 표면이 하나도 없어** PR #30(A11Y-11 DS 층)·PR #26(ToggleSwitch reduced-motion)이 이 화면의 판정에 닿지 않는다. 다만 **MOTION-01/02 의 근거를 갱신했다** — 판정은 `종속` 그대로지만 Modal/Toast enter·exit 모션이 **실재하게 됐다**(CSS-only). **E2E 미실행 — 판정 근거는 전부 코드 대조다** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈) 또는 **이 화면이 소비하는 공용 CRUD 프레임워크**(`shared/crud`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·앱 전역 배관(App root·queryClient)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

> **`직접` 에 `shared/crud` 를 포함하는 이유**: 이 화면은 `useCrudList`·`useCrudForm`·`CrudListShell`·`FormPageShell` 에 데이터·셸 배선 전부를 위임한다. 그 훅을 **소비하는 선택**(그리고 `createCrudAdapter` 가 아니라 **`createStoreAdapter` 를 고른 선택**)이 이 화면의 것이므로 충족·미충족의 책임을 이 문서가 진다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | `useCrudList` 가 `firstLoading = isFetching && data === undefined` 로 스켈레톤을 최초 로드에만 묶고 `refreshing` 을 따로 준다(`useCrudList.tsx:71-72`). `CrudListShell` 이 `loading={firstLoading}` 만 표에 넘긴다(`CrudListShell.tsx:138`). 4상태 배타: 실패면 배너가 대체(`:113`), 0행이면 `Empty`(`CrudTable.tsx:153-169`), 그 외 행 | `/marketing/templates` 최초 진입 → 스켈레톤만(빈 상태 문구 없음). 채널 필터로 0행 → `Empty` 만. `?fail=marketing-templates:list` → danger Alert 만. **데이터가 있는 상태의 재조회 → 표가 스켈레톤으로 바뀌지 않고 '새로고침 중…' 만 붙는다** | pass |
| STATE-02 | STATE | 직접 | 목록 조회 실패는 인라인 danger `Alert` + '다시 시도'가 표·요약·선택바를 대체한다(`CrudListShell.tsx:156-165`). 토스트 아님. 폼 로드 실패도 인라인 Alert(`FormPageShell.tsx:122-142`) | `?fail=marketing-templates:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건. `?fail=marketing-templates:detail` + `/:id/edit` → 폼 자리에 인라인 Alert | pass |
| STATE-04 | STATE | 직접 | **선택 리셋 축**: 검색어·채널 필터가 바뀌면 `clear()` 로 행 선택을 전부 해제한다(`TemplateListPage.tsx:120-122`). 일괄 삭제 전원 성공 시에도 해제(`useCrudList.tsx:144`). **page clamp 축**: 이 화면에 **페이지네이션이 없어**(FS-036-EL-034) page 상태가 존재하지 않는다 — clamp 대상이 없다(공전). 페이지네이션 부재는 IA-04 로 판정 | 3행 선택 → 채널 필터를 '이메일' 로 변경 → 선택 바가 사라지고 `selectedIds` 가 빈다. 검색어 입력 → 동일. **clamp 는 재현 대상이 없다** — IA-04 gap 해소 시 재채점 | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 3개 소스(`TemplateListPage.tsx` · `TemplateFormPage.tsx` + `_shared/VariableInsertBar.tsx`)의 모든 `CSSProperties` 값이 `var(--tds-*)` 또는 `calc(var(--tds-space-6) * n)` 이다. hex 0건 · px 0건 · border/outline 키워드 0건 | 세 파일에 `#[0-9a-f]{3,6}` grep = 0, `[1-9]px` grep = 0, `(outline\|border): (thin\|medium\|thick)` grep = 0. ESLint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면(변수 삽입 칩 · `FormPageShell` 백링크)이 `className="tds-ui-focusable"` 로 DS 포커스 링을 상속한다(`VariableInsertBar.tsx:61` · `FormPageShell.tsx:149`). DS 입력·버튼도 각자 링을 갖는다 | DS 소유 문서 판정. 이 화면에서는 칩·백링크·입력의 focus-visible 링이 DS 버튼과 픽셀 동일한지만 확인 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 성공·실패 통지가 전부 `ToastProvider` 를 지나므로 Toast entrance easing 계약을 상속한다 | DS 소유 문서 판정. 이 화면에서는 저장 성공 토스트가 entrance 애니메이션을 재생하는지만 확인 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 부상 표면 — `Card`(`FormPageShell` 이 폼 전체를 감싸는 1장) · `ConfirmDialog`/`Modal`(삭제·충돌·미저장 가드) · Toast — 이 DS shadow 토큰을 상속한다 | DS 소유 문서 판정. 이 화면에서는 삭제 다이얼로그·토스트가 light/dark 양쪽에서 부상하는지만 확인 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 폼 `<h1>` 이 공유 `pageTitleStyle`(title.xl tier)을 소비한다(`FormPageShell.tsx:159`). AppHeader `<h1>` 도 같은 상수(`AppHeader.tsx:53`) | DS/토큰 소유 문서 판정. 이 화면에서는 '발송 템플릿 등록' h1 이 body-md 보다 가시적으로 큰지만 확인. **h1 이 2개라는 사실은 IA-02 로 판정** | 종속 |
| COMP-10 | COMP | 직접 | **F3b 에서 뒤집혔다 — 이제 소비한다.** `TemplateListPage.tsx:124` 가 `useListState({ filterDefaults })` 를 쓰고, 그것이 내부에서 `useDebouncedSearch({ initial: keyword, onCommit: commitKeyword })` 를 배선한다(`useListState.ts:24,227-230`). 화면은 `list.searchInput`/`list.setSearchInput` 을 값에, **`{...list.searchInputProps}` 를 `SearchField` 에 스프레드**한다. 세 축이 전부 붙었다: ① 조합 중 커밋 금지(`useDebouncedSearch.ts:87`) ② 250ms 디바운스(`:23,93-95`) ③ 조합 중 Enter 차단(`:121-124` — `nativeEvent.isComposing` **과** 자체 관측 ref 를 함께 본다). ④ stale 응답 경합은 react-query 가 키워드를 쿼리 키에 넣어 이미 닫혀 있다(`:14-18`). **이 화면에서 특히 값지다** — `searchTemplates`(`_shared/messaging.ts:166-176`)가 이름 **과 본문(최대 2000자)** 을 훑으므로 F2 에선 자모마다 전 배열 × 본문 스캔이 돌았다. 이제 조합 확정 후 1회다 | 검색창에 '주문' 을 IME 로 입력 → 'ㅈ'·'주'·'주ㅁ' 단계에서 커밋 **0건**, 조합 확정 후 250ms 잠잠하면 **1회** 커밋 → `?q=주문`. 조합 중 Enter → 부분 문자열 커밋 0건. **앱 grep 주의**: `TemplateListPage.tsx` 에 `useDebouncedSearch` 직접 import 는 0건 — 소비는 `useListState` 경유이므로 grep 수치로 판정하지 말 것 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제(단건·일괄)가 `useCrudList` 의 `ConfirmDialog`(`intent="delete"`)로 게이트된다(`useCrudList.tsx:151-178`). busy 중 확인 버튼 잠금, 실패 시 **다이얼로그를 열어둔 채** error 배너(`:111` · `:138-141`), 재클릭이 retry. 취소·Esc·딤 클릭이 in-flight 요청을 abort 하고 pending 을 리셋(`:86-92` · `:117-123`) | `?fail=marketing-templates:delete` → 행 삭제 → 다이얼로그 유지 + danger 배너, 재클릭이 재요청. 요청 중 Esc → 토스트 없이 닫히고 버튼 state 복원 | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | `FormPageShell` 이 `useUnsavedChangesDialog(isDirty && !saving, { message })` 를 배선하고(`FormPageShell.tsx:113`) 폼이 `isDirty`·`unsavedMessage` 를 넘긴다(`TemplateFormPage.tsx:129-130`). 훅이 3경로를 덮는다 — beforeunload · capture-phase 링크 가로채기 · popstate sentinel. 저장 성공 시 not-dirty 가 되어 가드가 풀린다 | 본문을 한 글자 고친 뒤 ① 탭 닫기 ② 사이드바 '뉴스레터' 링크 ③ 브라우저 Back → 각각 discard 다이얼로그. 저장 성공 후 같은 이동 → 프롬프트 없이 통과 | pass |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 편집 폼을 담은 modal 이 없다.** 등록·수정은 전용 라우트(`/new` · `/:id/edit`)이고(IA-06 무게 규칙), 이 화면의 modal 은 `ConfirmDialog` 3종(삭제 확인·충돌·미저장 가드)뿐 — 셋 다 입력 필드가 없어 dirty 개념이 성립하지 않는다 | 재현 대상 없음 — 폼 modal 이 존재하지 않는다 | n-a |
| A11Y-01 | A11Y | 상속 | 이 화면의 결과 통지(삭제 성공·저장 성공 토스트)가 `ToastProvider` 의 **항상 마운트된** live region 을 지난다(`ToastProvider.tsx:165` · `:168`) | DS/Provider 소유 문서 판정. 이 화면에서는 템플릿 삭제 성공 토스트가 announce 되는지만 확인 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 3개 `ConfirmDialog`(삭제·충돌·미저장 가드)가 DS `Modal`/`ConfirmDialog` 의 `aria-describedby` 계약을 상속한다 | DS 소유 문서 판정. 이 화면에서는 삭제 다이얼로그 open 시 `'<템플릿명>' 을(를) 삭제합니다…` 본문이 읽히는지만 확인 | 종속 |
| A11Y-11 | A11Y | 직접 | **짝 없는 `aria-invalid` 가 0건이다.** 템플릿명 입력이 `aria-invalid` + `aria-describedby={errorIdOf('template-name')}` 를 함께 준다(`TemplateFormPage.tsx:142-143`). 제목 입력도 동일(`:175-176`). 본문·반려사유는 `TextareaField` 가 내부에서 짝지어 배선한다(`TextareaField.tsx:62-63`). **채널·승인상태 `SelectField` 는 `isInvalid` 를 넘기지 않아** `aria-invalid` 자체가 붙지 않는다(`SelectField` 는 `isInvalid ? true : undefined`) — 짝 없는 속성이 생기지 않는다. 필수 표식은 `FormField required` 가 렌더한다 | `/marketing/templates/new` → 빈 폼 제출 → `<input id="template-name" aria-invalid="true" aria-describedby="template-name-error">` 이고 그 id 의 `<p role="alert">` 가 존재한다(DevTools). 세 파일에서 `aria-invalid` 를 주는 모든 지점(2곳)에 `aria-describedby` 가 짝지어 있다 | pass |
| A11Y-12 | A11Y | N/A | **이 화면에 좌측 필터 list item 이 없다.** 채널 필터는 `SelectField` 드롭다운이고(`TemplateListPage.tsx:139-152`) 필터 패널·토글 버튼이 없다 — `aria-pressed`/`aria-current` 를 쓸 표면 자체가 없다 | 세 파일에 `aria-current` grep = 0 · `aria-pressed` grep = 0(둘 다 표면 없음) | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면의 `Modal` 표면 — 삭제 확인·충돌·미저장 가드 다이얼로그 — 이 DS Modal 의 enter/exit 계약을 상속한다. **PR #26 이후 그 모션은 실재한다**: backdrop fade(`Modal.css:20-21,30-33`→keyframes `:126-144`) + dialog scale 0.96→1(`:58-59,35-38`→keyframes `:146-168`, `forwards`), reduced-motion 게이트 `:173-180`. **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 미도입이고, 요구문의 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd`(`Modal.tsx:216-218`)로 동등 달성한다. 라이브러리 부재를 gap 으로 볼지는 **DS 소유 문서의 몫** | DS 소유 문서 판정. 이 화면에서는 삭제 다이얼로그 open/close 에 backdrop fade + dialog scale 이 보이고 reduced-motion 에서 즉시 처리되는지만 확인 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 성공 토스트(삭제·저장)가 ToastProvider 의 exit 애니메이션 계약을 상속한다. **PR #26 이후 완전 구현이다** — `.tds-toast--exiting`(`Toast.css:32-37`, `tds-toast-out … forwards` + `pointer-events:none`), keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), reduced-motion 게이트 `:136-141`. exit duration = `{motion.duration.fast}`(150ms) · easing = `{motion.easing.accelerate}` 로 요구가 명시한 'exit fast~normal + accelerate' 를 정확히 충족 | DS 소유 문서 판정. 이 화면에서는 저장 성공 토스트의 auto-dismiss 가 exit 애니메이션을 보이는지만 확인 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면은 자체 Motion 을 도입하지 않는다 — 모든 움직임(Modal·Toast·스켈레톤 pulse)이 DS 소유다. **이 화면에는 `ToggleSwitch` 표면이 없다**(폼에 boolean 토글 0건) — quality-bar MOTION-03 이 지목한 `ToggleSwitch` 위반은 이 화면에 표면이 없어 걸리지 않으며, **그 위반 자체도 PR #26 에서 해소됐다**(`ToggleSwitch.css:79-84`). Modal·Toast 도 각자 게이트를 갖는다(`Modal.css:173-180` · `Toast.css:136-141`) | DS 소유 문서 판정. `prefers-reduced-motion: reduce` 에뮬레이션 시 다이얼로그·토스트에 move/scale 이 남지 않는지만 확인 | 종속 |
| IA-01 | IA | 직접 | 세 라우트(`/marketing/templates` · `/new` · `/:id/edit`)가 전부 `APP_ROUTES` 에 등재돼(`App.tsx:266-268`) `RequireAuth > AppShell` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:121-133`). 두 페이지 컴포넌트 중 자체 sidebar/header/outer frame 을 그리는 것은 없다 | 세 라우트 모두 사이드바+헤더가 유지된 채 `<main>` 안에 그려진다. 두 소스에 `<header>`/`<aside>`/sidebar grep = 0 | pass |
| IA-02 | IA | 직접 | **통합에서 절반이 해소됐다 — 사유가 바뀌었고 판정은 유지된다.** ① **해소** — 브랜치 폴백이 사라졌다. `nav-config.ts:260-278` `findCoveringLeaf` 가 '자기를 감싸는 **가장 긴 잎**'을 세그먼트 경계(`covers()` — `:255-257`)로 찾고 `:297-299` `findNavLabel` 이 그것을 쓴다. `/marketing/templates/new` 의 AppHeader `<h1>`(`AppHeader.tsx:101`)은 이제 **'발송 템플릿 관리'** 다(≠ 예전의 '마케팅 관리'). **목록 라우트는 잎이고 in-content h1 이 없어 h1 이 정확히 1개 — 그 축은 pass** ② **잔여 gap (폼 라우트)** — **`<h1>` 이 여전히 2개다**: `AppHeader.tsx:101`('발송 템플릿 관리' — nav 라벨) + `FormPageShell.tsx:160`('발송 템플릿 등록'/'수정' — entityLabel). **두 이름이 서로 다르다**('관리' 접미사) — 잎 라벨과 폼 entityLabel 이 갈린 채다. 게다가 `nav-config.ts:294-296` 이 '등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아 `/new` 와 `/:id/edit` 의 상단 h1 이 동일하다. quality-bar IA-02 의 '단일 title 메커니즘' 미충족 | `/marketing/templates` → `h1` 1개, '발송 템플릿 관리' ✓. `/marketing/templates/new` → **`length === 2`**, `[0]` = '발송 템플릿 관리'(브랜치 아님 ✓ · 행위 미반영 ✗ · entityLabel 과 불일치 ✗), `[1]` = '발송 템플릿 등록'. `nav-config.test.ts:16-40` 이 잎 해석을 고정한다 | **gap** (잎 목록 축 pass · 폼 라우트 h1 이중 축 미충족) |
| IA-04 | IA | 직접 | **미충족(Pagination 축).** 템플릿의 나머지는 성립한다: 툴바 좌측 검색·필터 + 우상단 primary '템플릿 등록'(`TemplateListPage.tsx:129-160`) → 결과 count 요약(`CrudListShell.tsx:118-122`) → `SelectionBar`(`:125-133`) → 표(`:135`). **그러나 Pagination 이 없다** — `visibleItems` 전량을 렌더한다(`CrudTable.tsx:171`). 채널 3종 × 문구 종류만큼 템플릿이 누적되는 목록이라 'page size 초과 가능' 이다. BE-036 EP-01 도 페이징 파라미터가 없다 | `/marketing/templates` → 툴바·요약·SelectionBar·표는 확인되나 표 하단에 Pagination 컴포넌트가 없다. 시드를 30건으로 늘리면 30행이 모두 한 화면에 렌더된다. 두 소스에 `Pagination` import = 0 | **gap** |
| IA-05 | IA | 직접 | `/marketing/templates/new` 와 `/marketing/templates/:id/edit` 가 **같은 `TemplateFormPage` 컴포넌트**로 해석된다(`App.tsx:267-268`). `useCrudForm` 이 `useParams().id` 유무로 `isEdit` 를 갈라 `FormPageShell` 이 제목만 바꾼다(`FormPageShell.tsx:159`). 등록 전용/수정 전용 페이지가 따로 없다 | `App.tsx:267-268` 의 두 라우트가 동일 element 를 가리킨다. `/new` → h1 '발송 템플릿 등록' + 빈 폼, `/:id/edit` → h1 '발송 템플릿 수정' + prefill. 레이아웃 동일 | pass |
| IA-13 | IA | 직접 | **F3b 에서 뒤집혔다 — 이제 소비한다.** `TemplateListPage.tsx:124` 가 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 쓴다(`FILTER_DEFAULTS = { channel: 'all' }`). 채널 필터·검색어의 **단일 원천이 URL 쿼리스트링**이다: `useListState.ts:87` `useSearchParams` → `:89-91` page/`?q=`/sort → `:93-99` 필터. 갱신은 `patchParams` 한 통로(`:108-129`)로만 나가고 **`replace: true`**(`:125`)라 히스토리가 쌓이지 않는다. 기본값과 같은 값은 URL 에서 지운다(`:116`). 손으로 고친 `?channel=거짓말` 은 공용 `parseFilter`(`TemplateListPage.tsx:126-130`)가 허용 목록으로 걸러 '전체'로 되돌린다(그 롤아웃으로 `_shared/messaging.ts:37-41` 의 `parseMessageChannel` 사본이 소비자 0 이 되어 삭제됐다 — 주석이 그 경위를 남긴다). `useListState` 소비 화면은 **34곳**(`a5c2639` 재확인 — `= useListState(` 호출부 실측)이며 **마케팅 6화면 전부**가 여기 든다. page/sort 표면은 여전히 없다(IA-04 gap · FS-036 §7 #4) | '알림톡' 필터 + '주문' 검색 → URL 이 **`/marketing/templates?channel=alimtalk&q=주문`**. 행을 열어 수정 폼 진입 후 Back → **그 조건 그대로** ✓. URL 을 새 탭에 복사 → 같은 view ✓. '전체 채널'로 되돌리면 `?channel=` 이 사라진다 ✓ | **pass** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell` 의 `<Outlet>` 바로 바깥 `ErrorBoundary` 가 잡는다(`AppShell.tsx:486-494`, `resetKey={pathname}`). App root 에도 최후 경계가 있다(`App.tsx:108-112`) | AppShell/App 소유 문서 판정. 이 화면에서는 `TemplateListPage` 에 강제 throw 를 넣으면 사이드바가 유지된 채 복구 UI 가 뜨는지만 확인 | 종속 |
| EXC-02 | EXC | 상속 | **route guard**: `RequireAuth` 가 `AppShell` **바깥**을 감싼다(`App.tsx:121-127`) — 세션 없이 `/marketing/templates` 딥링크 시 `/login?returnUrl=…` 로 보낸다. **401 인터셉터**: 이 화면의 모든 조회·쓰기가 전역 `QueryCache`/`MutationCache` 의 `onError` → `isUnauthorized` → `notifySessionExpired()` 로 수렴한다(`queryClient.ts:38-40` · `:46-47`) | AppShell/queryClient 소유 문서 판정. 이 화면에서는 세션 제거 후 딥링크가 `/login?returnUrl=%2Fmarketing%2Ftemplates` 로 가는지, `?status=list:401` 이 재인증을 트리거하는지만 확인. **작성 중 폼 소실은 §4.2·§5** | 종속 |
| EXC-03 | EXC | 직접 | **부분 미충족(쓰기 게이팅 축).** **읽기**는 상속으로 충족 — `RequirePermission` 이 `<Outlet>` 을 감싸(`AppShell.tsx:490`) read 권한 없는 딥링크에 403 화면을 렌더하고 리소스는 라우트에서 파생된다(`route-resource.ts`). **쓰기 게이팅이 없다**: '템플릿 등록' 버튼(`TemplateListPage.tsx:155-158`) · 행 `RowActions` 수정/삭제(`CrudTable.tsx:192-197`) · `SelectionBar` 일괄 삭제(`CrudListShell.tsx:126-132`) **그리고 승인상태 select**(`TemplateFormPage.tsx:208`)가 권한을 조회하지 않는다. **`useRouteWritePermissions`(`RequirePermission.tsx:45`)는 더 이상 소비자 0 이 아니다 — F3b 이후 7곳이 쓴다**(`products/{categories,items,returns}` · `settings/{api-keys,languages,oauth,site}`). **그러나 `apps/admin/src/pages/marketing/**` 의 소비는 0건이다**(grep 확인) — 롤아웃이 이 섹션에 닿지 않았다. **이 화면에서는 이것이 단순 UX 문제가 아니다** — 승인상태 select 가 권한 축으로도 막히지 않아 어떤 역할이든 알림톡을 '승인' 으로 세팅할 수 있다(BE-036 §7.1) | remove=false·update=false 인 역할로 로그인 → 행 삭제·일괄 삭제·'템플릿 등록'·**승인상태 select** 가 **여전히 보이고 조작된다**. read=false 로 바꾸면 403 화면은 정상 렌더(읽기 축은 pass). `grep -rln "useRouteWritePermissions" apps/admin/src/pages/marketing` → **0건**(앱 전체로는 7곳 + 정의 1곳) | **gap** (**선례 7곳이 생겼으므로 이제 이 섹션만의 배선 작업이다**) |
| EXC-04 | EXC | 직접 | **F3b 에서 뒤집혔다 — 유령 저장이 해소됐다. 이 문서의 F2 판정이 지목한 그 결함이 정확히 고쳐졌다.** 이 화면의 어댑터는 여전히 **`createStoreAdapter`**(`templates/data-source.ts:20`)지만, 그 팩토리가 **존재 검사를 갖게 됐다**: `crud.ts:171` `const exists = (id) => spec.list().some((item) => item.id === id)` 를 두고 → **`:219-221` `update` 에서 `if (!exists(id)) throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 항목입니다.')`** · `:232-234` `remove` 에 같은 가드 · `:192-194` `fetchOne` 에 `HttpError(404)`. 주석(`:210-218`)이 '형제 팩토리(`createCrudAdapter`)는 같은 자리에서 409 로 막는데 여기만 뚫려 있었다 … 소비 화면들은 `useCrudForm` 의 409 충돌 다이얼로그를 이미 갖고 있어 어댑터가 409 를 주기만 하면 **화면 코드 0줄로** 복구 경로가 열린다' 고 그 경위를 남긴다. **두 어댑터의 계약이 다시 합쳐졌고 이 화면은 그 수혜자다** — `TemplateFormPage.tsx` 는 한 줄도 바뀌지 않았다. `useCrudForm` 의 `isConflict` 분기(`useCrudForm.ts:166-179`)와 충돌 다이얼로그(FS-036-EL-030)가 **이제 도달 가능하다**. **⚠ 다만 정확히 쓴다: 이 409 는 '존재 여부' 기반이지 version/ETag 토큰이 아니다.** `MessageTemplate` 에 `version`/`If-Match` 는 없고 `updatedAt`(`messaging.ts:146`)은 서버가 찍는 표시값일 뿐 동시성 토큰으로 쓰이지 않는다 — **둘 다 존재하는 동시 편집은 여전히 last-write-wins** 다(→ BE-036 §7.5 · §5) | `/marketing/templates/tpl-sms-1/edit` 진입 → 다른 탭(또는 DevTools 로 `removeTemplate('tpl-sms-1')`)에서 그 템플릿 삭제 → 폼에서 저장 → **충돌 다이얼로그 '다른 사용자가 먼저 삭제한 항목입니다.' + 입력 보존**, 성공 토스트·목록 이동 **0건** ✓(F2 에서는 '저장했습니다' 토스트 + 이동이었다). `?status=save:409` 강제 경로와 동일한 UI 로 수렴한다 | **pass** (유령 저장 축) · **동시 수정 축은 여전히 미충족** — §3 · §5 |
| EXC-08 | EXC | 직접 | `useCrudForm` 이 **동기 제출 락**(`submitLockRef`)으로 disabled 렌더 이전의 두 번째 제출을 막고(`useCrudForm.ts:103` · `:202-203`), `FormPageShell` 이 `disabled={saving \|\| loadingDetail}` 로 이중 차단한다(`FormPageShell.tsx:189`). **멱등키는 mutationFn 밖 ref** 에서 제출 **시도** 단위로 만들어(`useCrudForm.ts:118-123` · `:211`) 재시도가 같은 키를 재사용하고 성공 시 버린다(`:220`). **F3b 에서 그 키가 어댑터까지 연결됐다** — `:228,235`(variables) → `crud.ts:288-289,310-311` → `WriteContext`(`crud.ts:30-42,47-48`) → **`createStoreAdapter` 의 ledger**(`crud.ts:168,201,208`)가 `isReplay` 로 재생 판정한다. **기록은 적용에 성공한 뒤에만** 한다(`:202-203,224`). 삭제·일괄 삭제는 `ConfirmDialog` 의 `busy` 잠금. quality-bar 가 지목한 3대 작업 중 이 화면은 **'생성'** 에 해당한다(발송·심사 제출 트리거는 이 화면에 없다 — FS-036 §7 #3) | 제출 버튼 더블클릭 / 응답 전 Enter 연타 → 정확히 1개 요청(어댑터 `create` 호출 카운터). `?status=save:500` 으로 실패시킨 뒤 재제출 → `idempotencyKeyRef` 가 같은 키를 유지 | pass |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort` 로 수렴한다. 폼: `handleWriteError` 첫 줄이 abort 를 조용히 흘린다(`useCrudForm.ts:155-156`), 언마운트 시 진행 요청 abort(`:92`). 목록: 삭제 `onError` 가 `isAbort` 로 배너를 띄우지 않고(`useCrudList.tsx:110`), 다이얼로그 닫기가 abort + `mutation.reset()`(`:86-92` · `:117-123`). 일괄 삭제는 `signal.aborted` 면 결과를 무시한다(`:136`) — abort 가 부분 실패 건수에 섞이지 않는다 | 삭제 다이얼로그에서 '삭제' 클릭 직후(응답 전) Esc → **토스트·배너 0건**, 버튼 state 복원. 저장 중 사이드바로 이탈 → 실패 토스트 없음. 일괄 삭제 중 취소 → 'N건 중 M건 실패' 배너가 뜨지 않는다 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **14** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · **COMP-10** · FEEDBACK-02 · FEEDBACK-04 · A11Y-11 · IA-01 · IA-05 · **IA-13** · **EXC-04** · EXC-08 · EXC-09 |
| 종속 | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **2** | FEEDBACK-06(폼 modal 없음) · A11Y-12(좌측 필터 패널 없음) |
| gap | **3** | IA-02 · IA-04 · EXC-03 |
| **합계** | **30** | 14 + 11 + 2 + 3 = **30** ✅ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓) |

> **2026-07-17 · `4b805ad` 기준 변경**: F2 판정의 gap 6건 중 **3건이 pass 로 뒤집혔다** — **COMP-10**(F3b 가 `useListState` → `useDebouncedSearch` 를 이 화면에 배선) · **IA-13**(같은 훅이 조회 상태를 URL 로 옮겼다) · **EXC-04**(F3b 가 `createStoreAdapter` 에 존재 검사 + 409 를 넣었다 — `crud.ts:171,219-221`). **이 문서가 'EXC-04 는 이 화면 고유'라고 적었던 근거 — `createStoreAdapter` 와 `createCrudAdapter` 의 계약이 갈렸다는 사실 — 이 사라졌다.** 두 팩토리가 같은 자리에서 같은 409 를 던진다. **IA-02 · EXC-03 은 gap 을 유지하되 사유가 바뀌었다**(브랜치 폴백 ✕ → h1 이중·행위 미반영 / 소비자 0 ✕ → 7곳 있으나 marketing 미배선).
>
> **P0 gap 3건 = quality-bar '배치 실패' 사유.** **IA-02 · IA-04 는 앱 전역 문제**이고 **EXC-03 은 이 섹션 배선**만 남았다(선례 7곳 존재). §5 참조.
>
> **quality-bar 밖의 최우선 사안은 여전히 승인 상태다** — 관리자가 알림톡 템플릿을 '승인' 으로 세팅해 카카오 심사를 우회할 수 있다(FS-036-EL-025 · BE-036 §7.1). quality-bar 에 이를 정확히 겨냥한 요구가 없어 §2 표에 행이 없지만, **실무 위험도는 위 3건보다 높다.** §5 #12 로 이관한다. **F3a·F3b·통합은 이 축을 건드리지 않았다**(코드 재확인 — `TemplateFormPage.tsx:202-216` 의 승인상태 select 가 권한을 조회하지 않는다).
>
> **quality-bar 밖의 최우선 사안은 승인 상태다** — 관리자가 알림톡 템플릿을 '승인' 으로 세팅해 카카오 심사를 우회할 수 있다(FS-036-EL-025 · BE-036 §7.1). quality-bar 에 이를 정확히 겨냥한 요구가 없어 §2 표에 행이 없지만, **실무 위험도는 위 6건보다 높다.** §5 #12 로 이관한다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous` 로 이전 행을 유지하고(`crud.ts:151`) `refreshing` 이 요약에 '새로고침 중…' 만 덧붙인다(`CrudListShell.tsx:120`). `staleTime` 30초 · `refetchOnWindowFocus: false` | 데이터가 있는 상태에서 캐시 무효화 → 이전 행 유지 + '새로고침 중…'. 30초 내 재진입은 네트워크 재조회 없음 | pass |
| STATE-05 | P1 | **미충족.** `Empty` 는 3분기를 그릴 수 있으나 **호출부가 검색 맥락만 넘긴다** — `hasQuery`·`onClearSearch` 만 주고 `hasActiveFilters`·`onResetFilters` 를 주지 않는다(`TemplateListPage.tsx:169-172`). 그래서 채널 필터로 0행이 되면 `resolveMode` 가 `'empty'` 로 떨어져(`Empty.tsx:53-57`) '**등록된** 발송 템플릿이 없습니다' + 등록 CTA 를 보인다 — 지우면 될 필터를 그대로 둔 채 등록 버튼을 찾게 된다. **뉴스레터 목록은 4개를 모두 넘긴다**(`NewsletterListPage.tsx:173-178`) — 같은 셸의 두 소비자가 갈렸다 | 채널을 '카카오 알림톡' 으로 + 검색어 없이, 알림톡 템플릿이 0건인 상태를 만든다(시드에서 알림톡 3건 삭제) → '**등록된** 발송 템플릿이 없습니다' 가 뜨고 **'필터 초기화' 버튼이 없다**. 검색 0행일 때는 정상('조건에 맞는…' + '검색 지우기') | gap |
| STATE-06 | P1 | 등록·수정·삭제 성공 시 `list` 키를 무효화하고 수정은 `detail` 키도 함께 무효화한다(`crud.ts:179-181` · `:198-201` · `:217-220`). 일괄 삭제는 전원 성공에만 무효화(`:237-240`) | 템플릿 수정 후 목록 복귀 → 수동 새로고침 없이 새 이름·수정일시가 보인다 | pass |
| COMP-04 | P1 | 필수 필드가 `FormField required`(라벨 옆 `*`)로 렌더된다 — 템플릿명(`TemplateFormPage.tsx:133`) · 채널(`:148`) · 제목(`:158-163`), 본문은 `TextareaField required`(`:184`). **승인상태·반려사유는 required 가 아니다**(스키마에서도 필수가 아니다) | zod 필수 필드 모두 라벨 옆 `*` 렌더 | pass |
| COMP-09 | P2 | **본문 셀만 충족.** `bodyPreview` 가 60자에서 자르고 `text-overflow: ellipsis` + `max-width` + `nowrap` 으로 이중 방어한다(`TemplateListPage.tsx:54-61` · `:69-72`) — 긴 본문이 컬럼을 밀지 않는다. **템플릿명 셀은 truncation 이 없다**(`:77`) — 60자 상한이 완화할 뿐. hover/expand 로 전체를 보는 경로도 없다(본문 미리보기의 `title` 속성 없음) | 60자 템플릿명 + 2000자 본문 시드 → 본문 셀은 '…' 로 잘리고 폭 불변, 이름 셀은 늘어난다. 잘린 본문의 전체 값을 볼 방법이 없다 | gap |
| COMP-12 | P2 | 본문은 `TextareaField` 가 실시간 카운터 'N/2000' 을 그린다(`TextareaField.tsx:52`). 반려 사유도 'N/200'. **템플릿명(60)·제목(100)에는 카운터가 없다** — `<input>` 직접 렌더. 상한 근접 경고 없음. **가장 큰 문제는 기준 불일치**: 카운터는 문자 수인데 SMS 힌트는 바이트 수라(`TemplateFormPage.tsx:194-197`) 한 화면에 두 기준이 공존하고, **SMS 본문 2000자 = 최대 4000byte 로 LMS 한도(2000byte)를 넘기는데 저장이 막지 않는다**(바이트 힌트는 표시 전용). 서버 강제 기준은 미정(BE-036 §7.8) | 템플릿명에 60자 입력 → 61번째 문자가 **경고 없이** 사라진다(카운터 없음). 채널 SMS + 한글 본문 1,500자 → 카운터는 '1500/2000'(여유 있음)인데 힌트는 '3000 byte · LMS (한도 2000 byte)' — **한도를 넘겼는데 저장이 통과한다** | gap |
| FEEDBACK-01 | P1 | 배치 규칙이 성립한다: read 실패 → 인라인 Alert(`CrudListShell.tsx:157`) / write 성공 → 토스트 / 다이얼로그 내부 실패 → 그 다이얼로그 error 배너(`useCrudList.tsx:160`) / 폼 저장 실패 → 카드 배너(`FormFeedback.tsx:42`). page 가 임의 배너 state 를 갖지 않는다 | `?fail=marketing-templates:delete` → 다이얼로그 배너(토스트 아님). `?fail=marketing-templates:list` → 인라인 Alert(토스트 아님) | pass |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 피드백을 갖는다 — 저장·삭제·일괄 삭제. no-op 클릭 없음. **단 유령 저장은 '성공' 피드백을 내는 no-op 이다**(EXC-04 gap) — 피드백은 있으나 거짓이다 | `?fail=all` 로 각 액션 → 전부 사용자 가시 실패 | pass |
| FEEDBACK-05 | P2 | 모든 삭제가 `ConfirmDialog`(비가역 고지 '이 작업은 되돌릴 수 없습니다.')로 게이트된다. undo window 없음 — 확인 방식으로 충족 | 단일 미확인 클릭으로 실행되는 삭제 0건 | pass |
| A11Y-05 | P1 | `SelectField isInvalid` 가 `aria-invalid` 를 설정한다(DS 소유). **이 화면의 두 select(채널·승인상태)는 `isInvalid` 를 넘기지 않는다** — 스키마상 이 둘은 열거형이라 검증 실패가 나지 않는다(select 가 잘못된 값을 만들 수 없다). 따라서 이 화면에 미충족 표면이 없다 | 채널·승인상태 select 에 검증 에러가 발생하는 경로가 없다 | pass |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(마우스 전용)로 수정 폼을 연다(`CrudTable.tsx:172`). **템플릿명 셀이 링크가 아니다**(`TemplateListPage.tsx:77`). 다만 행 안에 `RowActions` 연필(수정) 버튼이 있어 **같은 목적지로 가는 키보드 도달 가능 컨트롤은 존재한다**(`CrudTable.tsx:192-197`) — 계약 문면은 충족되나 등가물이 아이콘 버튼이라 발견성이 낮다 | 행을 Tab 하면 체크박스 → 연필 → 휴지통에 도달하고 연필 Enter 가 행 클릭과 같은 `/:id/edit` 를 연다 | pass |
| A11Y-13 | P1 | `useCrudForm.submit` 이 `handleSubmit(onValid, onInvalid)` 를 부르고 RHF 의 `shouldFocusError` 가 첫 invalid 필드로 포커스를 옮긴다(`useCrudForm.ts:239-241` · `:253`). 서버 422 도 첫 위반 필드로 `setFocus`(`:184`). **폼 진입 시 첫 필드 자동 포커스는 없다** | 빈 폼 제출 → `document.activeElement` 가 템플릿명 입력. 폼 진입 직후 → `activeElement` 가 `<body>` | gap |
| A11Y-16 | P1 | 목록 상태 라이브 리전이 **항상 마운트**돼 있다(`CrudListShell.tsx:107-109`). 변수 칩이 `aria-label`(`VariableInsertBar.tsx:65`), 표가 `aria-busy`, 폼 로딩 스켈레톤이 `aria-busy`(`FormPageShell.tsx:170`). **SMS 바이트 힌트는 live region 이 아니다** — 채널·본문에 따라 실시간으로 바뀌는 정보인데 announce 되지 않는다 | 채널 필터로 0행 전환 → '조건에 맞는 발송 템플릿 결과가 없습니다.' announce. 본문 입력으로 SMS→LMS 승격 → **무음** | gap |
| IA-03 | P1 | breadcrumb 이 없다 — `/marketing/templates/new` 에 '마케팅 관리 > 발송 템플릿 > 등록' trail 이 없다 | 폼 라우트에 breadcrumb 요소 0건 | gap |
| IA-06 | P1 | 무게 규칙에 맞는다 — 발송 템플릿은 rich 엔티티(채널별 필드·본문·승인 흐름)라 전용 form route 이고 modal edit 이 없다 | `/new`·`/:id/edit` 가 전용 라우트. 폼 modal 0건 | pass |
| IA-07 | P1 | 백링크가 '목록으로' + `ChevronLeftIcon` + 좌상단(`FormPageShell.tsx:147-155`) — 공유 셸이 제공하므로 drift 가 없다 | 백링크 라벨 '목록으로' · 아이콘 ChevronLeft | pass |
| IA-08 | P1 | footer 가 취소(좌) + primary 제출(우), 카드 **안** 하단(`FormPageShell.tsx:179-191`). **자매 화면인 뉴스레터 폼은 카드 밖에 둔다**(`NewsletterFormPage.tsx:395-408`) — 같은 앱·같은 섹션에서 두 배치가 공존한다. 이 화면 자체는 공유 셸을 따르므로 이탈자가 아니다 | 이 화면: 액션이 카드 안. 뉴스레터: 카드 밖 | pass(이 화면 기준. 앱 전역 불일치는 NFR-033 이 지적) |
| IA-10 | P2 | **N/A — 이 화면에 우측 preview panel 이 없다.** `FormPageShell` 의 단일 컬럼이다. 다만 치환변수 바가 '**미리보기에서** 표본값으로 치환됩니다' 라고 안내해 **존재하지 않는 표면을 가리킨다**(FS-036 §7 #8) | 이 화면에 `EmailPreview`/2-col grid 0건 | n-a(문구 오류는 §5 #11) |
| IA-12 | P2 | `FormPageShell` 을 그대로 소비한다 — back-link·title·description·footer·로드 실패 배너를 복제하지 않는다(`TemplateFormPage.tsx:116-132`). **이 화면은 IA-12 가 요구하는 모범 쪽이다**(뉴스레터가 복제 쪽) | `TemplateFormPage` 가 `FormPageShell` 을 import 하고 `backLinkStyle`/`actionsStyle`/`titleStyle` 을 재선언하지 않는다 | pass |
| IA-14 | P1 | 표에 가로 스크롤 컨테이너가 없다(`tableStyle` 직접). 8컬럼(선택·순번·이름·채널·승인·본문·수정일시·액션)이다. 최소 지원 폭 선언 없음 | 375px 에서 8컬럼 표가 page grid 를 넘치는지 확인 필요 | gap |
| ERP-01 | P1 | 승인상태→tone 이 **단일 레지스트리**에서 온다 — `APPROVAL_TONE`/`approvalStatusTone`(`messaging.ts:80-89`)을 목록이 소비한다(`TemplateListPage.tsx:89`). per-page meta helper 없음. **단 채널 배지는 3채널 모두 `tone="info"` 하드코딩**(`:81`) — 채널은 status 가 아니므로 레지스트리 대상은 아니나, 색이 정보를 주지 않는다 | 승인 4상태 전부 정의된 tone 으로 해석. 채널 배지는 색으로 구분되지 않는다 | pass |
| ERP-06 | P1 | 날짜가 `shared/format`(`formatDateTime`)을 경유한다(`TemplateListPage.tsx:10` · `:103`). 톤은 '…습니다' 로 일관. **단 조사 처리가 ERP-13 gap** | 셀에 raw `toString()` 없음 | pass |
| ERP-08 | P2 | `updatedAt` 이 `formatDateTime` 을 지난다. **`store.ts` 가 `new Date().toISOString()`(UTC)로 저장하고**(`store.ts:161`) `formatDateTime` 이 브라우저 로컬 getter 로 렌더한다(`format.ts:25-29`) — 시드는 로컬 표기 문자열(`'2026-07-10T10:00:00'`)이라 **저장 값과 시드 값의 시간대 기준이 다르다**. 다른 TZ 관리자는 같은 템플릿의 수정일시를 다르게 본다(ERP-09 와 같은 뿌리) | 시드 템플릿과 방금 저장한 템플릿의 수정일시가 같은 규칙으로 해석되지 않는다(UTC vs 로컬 문자열) | gap |
| ERP-12 | P1 | 목록 export(CSV/xlsx) affordance 가 없다 | 툴바에 export 버튼 0건 | gap |
| ERP-13 | P1 | **통합에서 뒤집혔다.** 조사 헬퍼가 `shared/format.ts:267-325` 로 승격됐다(이전엔 `logs/josa.ts`·`notifications/_shared/notification.ts` 등 사본 3곳). 한글 음절 U+AC00–U+D7A3 의 종성(`(code-0xAC00) % 28`)으로 받침을 판정하고(`:282-303`), 한글이 아니면 관용에 따라 받침 없음으로 본다('SMS를'). 이 화면 경로의 폴백형이 **전부 사라졌다**: 삭제 토스트·확인 문구가 **템플릿명의 받침**으로 고르고(`useCrudList.tsx:108,158` → `objectParticle`) — '주문 완료 안내(SMS)를 삭제했습니다' —, 저장 토스트는 '**발송 템플릿을** 등록했습니다'(`useCrudForm.ts:222`), 로드 실패는 '**발송 템플릿을** 찾을 수 없습니다'(`FormPageShell.tsx:129-130`), 검증은 '**템플릿명을** 입력하세요' · '**본문은** 2000자를 넘을 수 없습니다'(`shared/crud/validation.ts:22,25`). 빈 상태의 주격(이/가)은 `Empty.tsx:25-26,68` 이 자족 헬퍼로 그린다 — `@tds/ui` 는 앱 `shared/format` 을 import 할 수 없어(레이어 경계) **의도된 자족**이다(`format.ts:275-277` 이 그 예외를 명시). **이 화면 고유 스키마 문구는 원래부터 폴백형이 아니었다**(`validation.ts:34` '제목을 입력하세요.'). **예측대로 `templates.test.ts` 는 손대지 않았다** — `toContain('입력')` 류 느슨한 단언이라 헬퍼 도입에 깨지지 않았다 | 사용자 대상 문자열의 `'을(를)'`·`'이(가)'`·`'은(는)'` grep = **0**(남은 히트는 주석·테스트 단언·헬퍼 설명문뿐). `/marketing/templates/nope/edit` → '**발송 템플릿을 찾을 수 없습니다**' | **pass** |
| ERP-15 | P1 | 대형 목록 계약이 없다 — 전량 렌더, virtualization·page size cap 없음(IA-04 gap 과 같은 뿌리). 8컬럼 표에 가로 scroll·pin 없음 | 시드 1,000건 → 1,000행 DOM | gap |
| EXC-05 | P1 | 프론트 타임아웃 상한 없음 — 앱 전체 `AbortSignal.timeout` 0건 | 응답하지 않는 어댑터를 넣으면 spinner 가 무한 지속 | gap |
| EXC-06 | P1 | 에러 타입이 status 를 지닌다(`HttpError`) — `?status=<op>:<code>` 로 재현 가능. **그러나 이 화면의 어댑터는 스스로 status 를 만들지 않는다**: `getTemplate` 이 generic `Error` 를 던져(`store.ts:170`) **404 갈래가 죽어 있고**(EXC-12), `update`/`remove` 가 409 를 던지지 않아 충돌 갈래가 죽어 있다(EXC-04). `?status=` 스위치로 강제할 때만 각 표면이 살아난다 — **실제 데이터 조건으로는 재현되지 않는다** | `?status=save:409` → 충돌 다이얼로그(살아난다). 그러나 **실제로 삭제된 템플릿을 저장** → 409 없이 성공. `?status=detail:404` → not-found 갈래. 그러나 **실제로 없는 id 로 진입** → generic '불러오지 못했습니다' | gap |
| EXC-07 | P1 | 422 + `violations` 를 `setError` 로 그 입력에 꽂고 첫 필드로 `setFocus`(`useCrudForm.ts:176-186`). 폼 레벨 배너는 generic 전용 | `?status=save:422` + violations 픽스처 → 해당 필드 인라인 + 포커스 | pass |
| EXC-10 | P1 | `settleAll` 로 allSettled semantics, 'N건 중 M건 실패' 보고(`useCrudList.tsx:138-141`), 전원 성공에만 invalidate + 선택 해제. **실패 id 를 돌려주지 않아** 재시도가 성공분까지 재실행한다. **추가로 이 화면은 없는 id 도 '성공' 으로 집계한다**(유령 삭제 — EXC-04) | 부분 실패 시 어느 행이 실패했는지 UI 에 표시되지 않는다 | gap |
| EXC-11 | P1 | 오프라인 감지 없음 — 앱 전체 `navigator.onLine` 0건 | offline 토글 → 배너 없음 | gap |
| EXC-12 | P1 | **F3b 에서 뒤집혔다 — 404 갈래가 살아났다.** `useCrudForm` 이 `isNotFound` 로 `'not-found'`/`'error'` 를 가르고(`useCrudForm.ts:143-149`) `FormPageShell` 이 404 에는 '다시 시도' 를 주지 않는다(`FormPageShell.tsx:116-144`) — UI 는 F2 에도 완전히 배선돼 있었다. **문제는 어댑터였고 그것이 고쳐졌다**: `createStoreAdapter.fetchOne` 이 `crud.ts:192-194` 에서 `if (!exists(id)) throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')` 를 **store 위임보다 먼저** 던진다. 그래서 `_shared/store.ts:168-172` 의 `getTemplate` 이 여전히 status 없는 generic `Error` 를 던지더라도 **그 경로에 도달하지 않는다**(`store.ts` 는 한 줄도 안 바뀌었다). `crud.ts:183-191` 주석이 그 경위를 남긴다 — '그 generic Error 는 언제나 error 로 떨어졌다 — **404 분기가 영원히 발현되지 않았다**'. **뉴스레터의 `createCrudAdapter` 와 계약이 합쳐졌다**(`crud.ts:105-107` 이 같은 자리에서 같은 404) | `/marketing/templates/nope/edit` → '**발송 템플릿을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.**' + **'목록으로' 만**(재시도 버튼 **없음** ✓). F2 에서는 '불러오지 못했습니다' + 영원히 실패하는 '다시 시도' 였다. `?status=detail:500` → '다시 시도' + '목록으로'(error 갈래는 그대로) | **pass** |
| EXC-14 | P1 | 이 화면에 optimistic write 가 없다 — 모든 쓰기가 비관적(confirm + busy). 롤백할 낙관 반영이 없다 | 인라인 토글·재정렬 표면 0건 | pass(해당 없음에 준함) |
| EXC-18 | P1 | selection scope 가 '현재 보이는 행'이다(`CrudListShell.tsx:143-148`). Shift-click range 없음 · 대량 임계값 강화 confirm 없음 · progress/cancel 없음 | 50행 선택은 클릭 50회. 일괄 삭제에 progress·cancel 없음 | gap |
| EXC-19 | P1 | 세션 만료 전 연장 프롬프트 없음. dirty 폼 draft 스냅샷 없음 — 401 리다이렉트가 프로그램적이라 FEEDBACK-04 가드가 발화하지 못하고 작성 중 본문이 사라진다 | `?status=save:401` → `/login` 이동, 입력 소실 | gap |
| EXC-20 | P1 | 5xx 실패가 `referenceOf(cause)` 로 참조 코드를 뽑아(`useCrudForm.ts:189`) 배너에 '오류 코드 <ref>' 로 노출하고 `userSelect: all` 로 복사 가능하다(`FormFeedback.tsx:44` · `:22`). raw body/stack/status 를 산문으로 렌더하지 않는다 | `?status=save:500` → '저장하지 못했습니다' + 복사 가능한 오류 코드 | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 |
|---|---|---|
| 목록 첫 렌더(p95) | 사용자 조작 → 첫 행 가시 **1.5초 이내**(백엔드 연결 후) | **측정 불가** — 픽스처. `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **로딩 상태를 화면에서 볼 수 있게 하는 개발용 지연이며 예산이 아니다** |
| 목록 응답(p95) | `GET /api/marketing/message-templates` **400ms 이내** | 미정 — BE-036 EP-01 이 **전량 반환 + 본문 포함**(본문은 목록이 실제로 쓴다 — BE-036 §7.11) |
| 재조회 횟수 | 목록 진입당 1회. `staleTime` 30초 내 재진입 0회. 창 포커스 재조회 0회 | 충족(`queryClient.ts`) |
| 검색 입력당 연산 | 서버 검색 도입 시 **키워드 확정당 요청 1회**(디바운스 250ms) | **미충족** — 디바운스 없음(COMP-10 gap). **`searchTemplates` 가 이름 + 본문(최대 2000자)을 훑으므로** 뉴스레터(제목만)보다 자모당 비용이 크다 |
| 표 DOM | 한 화면 **최대 10행**(페이지네이션 전제) | **미충족** — 전량 렌더(IA-04 gap) |
| 바이트 힌트 갱신 | 입력 → 힌트 반영 **동기(1 프레임)** | 충족 — `byteLengthOf` 가 본문 길이 선형 순회(2,000자 = 2,000회 `codePointAt`). 프레임 예산 안이나 **매 키 입력마다 재계산**된다(메모이제이션 없음 — `TemplateFormPage.tsx:110`) |
| 번들 | 이 화면 전용 청크 예산 미정 | 라우트 분할 없음(`App.tsx` 가 전 페이지를 정적 import) — 앱 전역 사안 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도 | 충족(STATE-02) |
| 저장 중 서버 5xx | 입력 보존 + 배너 + 참조 코드 | 충족(EXC-20) |
| **저장 중 동시 삭제** | **유령 저장 금지 + 충돌 다이얼로그 + 입력 보존** | **미충족** — '저장했습니다' 토스트 + 목록 이동, 저장된 것 없음(EXC-04 gap). **UI 는 준비돼 있고 어댑터가 409 를 안 만든다** |
| **삭제된 템플릿 링크 열기** | **'찾을 수 없음' + 목록으로(재시도 없음)** | **미충족** — '불러오지 못했습니다' + 영원히 실패하는 '다시 시도'(EXC-12 gap). 같은 뿌리 |
| 저장 중 세션 만료(401) | 재인증 후 원래 경로 + 입력 복원 | **미충족** — 입력이 사라진다(EXC-19 gap) |
| 응답 없는 서버 | 상한에서 abort + '시간이 초과되었습니다' | **미충족** — 타임아웃 상한 없음(EXC-05 gap) |
| 오프라인 | 배너 + write 경고 + 복귀 시 refetch | **미충족**(EXC-11 gap) |
| 화면 이탈 중 요청 | abort, 실패로 세지 않음 | 충족(EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | 충족(EXC-01 상속) |
| **미승인 알림톡 발송** | **차단** | **미충족** — 관리자가 승인상태를 '승인' 으로 세팅하면 삽입 후보가 된다(FS-036-EL-025). **서버가 승인을 정본으로 쥐는 것이 유일한 방어선**(BE-036 §7.1) |
| **승인 후 본문 변경** | **재심사(승인 무효화)** | **미충족** — 승인이 유지된다(FS-036-EL-024). 심사받은 문구 ≠ 발송 문구 |

### 4.3 데이터 보존 · 감사

| 축 | 요구 | 현재 |
|---|---|---|
| **승인 이력** | 누가 언제 제출했고 카카오가 언제 승인/반려했는가 | **없음** — 승인상태는 현재값 1개뿐이고 이력이 없다. **관리자가 직접 세팅할 수 있으므로**(FS-036-EL-025) 이력이 없으면 우회를 사후에 탐지할 수도 없다. BE-036 §7.1 이 서버 정본화를 요구하는 두 번째 이유 |
| 반려 사유의 출처 | 카카오가 준 문자열만 기록 | **미충족** — 관리자 자유 입력(FS-036-EL-023). 외부 심사 결과를 내부에서 위조할 수 있다 |
| `updatedAt` 신뢰성 | 서버 시각 기준 | 부분 충족 — 저장소가 `new Date().toISOString()`(클라이언트 UTC)로 찍는다(`store.ts:161`). **클라이언트 시계에 의존한다** — 서버가 정본이어야 한다 |
| 템플릿 변경 이력 | 발송에 쓰인 문구가 나중에 바뀌면 추적 가능한가 | **없음** — 다만 삽입이 값 복사라 이미 만들어진 회차는 자기 본문을 보존한다(BE-036 §7.6). 템플릿 자체의 버전 이력은 없다 |
| 삭제 복구 | soft-delete 계약 없음 | **미정**. 심사 중 템플릿 삭제는 서버가 막아야 한다(BE-036 EP-07 422) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | ~~**EXC-04**~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `createStoreAdapter` 에 존재 검사가 생겼다: `crud.ts:171` `exists()` → **`:219-221` `update` 가 `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`** · `:232-234` `remove` 동일. **`createCrudAdapter` 와 계약이 다시 합쳐졌다.** 소비 화면(이 화면 포함 — 상품·포트폴리오·카테고리·답변템플릿·고객센터 유형)이 **코드 0줄 변경으로** 충돌 다이얼로그 복구 경로를 얻었다(`crud.ts:210-218` 주석이 그 설계를 명시). **⚠ 남은 것**: 이 409 는 '존재 여부' 기반이지 version/ETag 토큰이 아니다 — **동시 수정(둘 다 존재)은 여전히 last-write-wins** 다 → **#1' 로 승계** | — | **닫힘**(동시성 토큰 축은 #1' 로) |
| 1' | EXC-04(동시 수정 축) | P1 | **낙관적 동시성 토큰이 없다** — `MessageTemplate` 에 `version`/`If-Match` 가 없고 `updatedAt`(`_shared/messaging.ts:146`)은 서버가 찍는 표시값일 뿐 토큰으로 쓰이지 않는다. 두 관리자가 같은 템플릿을 동시에 편집하면 나중 저장이 조용히 이긴다. **어댑터의 409(`crud.ts:219-221`)는 대상이 삭제됐을 때만 발현된다** | 이 화면 + 서버 계약 | 백엔드 명세(**BE-036 §7.5**) · 프론트 리팩터(`_shared/messaging.ts`·어댑터) |
| 2 | ~~IA-13~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `TemplateListPage.tsx:124` 가 공용 `useListState` 를 소비해 `?channel=`·`?q=` 를 URL 이 소유한다(`useListState.ts:87-99,125`). F5·Back·링크 공유로 복원된다. `useListState` 소비 화면은 이제 **34곳**(`a5c2639` 재확인 — `= useListState(` 호출부 실측)(마케팅 6화면 전부 포함) | — | **닫힘** |
| 3 | IA-04 | **P0** | Pagination 이 없다 — 필터 결과 전량 렌더. BE-036 EP-01 도 페이징 파라미터가 없다 | 앱 전역 | UI 기획 · 백엔드 명세 |
| 4 | IA-02 | **P0** | **gap 유지 · 사유 전환.** ~~하위 라우트의 branch 라벨('마케팅 관리') 폴백~~은 통합의 `findCoveringLeaf`(`nav-config.ts:260-278,297-299`)로 **해소**됐다 — 상단 h1 이 이제 '발송 템플릿 관리' 다. 남은 것: ① **h1 이 2개**(`AppHeader.tsx:101` + `FormPageShell.tsx:160`) ② 목록 제목('발송 템플릿 관리' — nav 잎 라벨)과 폼 entityLabel('발송 템플릿')이 **여전히 갈린다** ③ `nav-config.ts:294-296` 이 '등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아 `/new` 와 `/:id/edit` 의 상단 h1 이 동일하다. **목록 라우트는 h1 1개 — 그 축은 pass** | 앱 전역(`AppHeader`·`FormPageShell`) + 이 화면(잎 라벨 ↔ entityLabel 정합) | UI 기획 · 프론트 구현 |
| 5 | EXC-03 | **P0** | **gap 유지 · 범위 축소.** 쓰기 권한 게이팅 미배선 — **승인상태 select(`TemplateFormPage.tsx:202-216`)도 권한 축으로 막히지 않는다**(#12 와 같은 뿌리). **`useRouteWritePermissions`(`RequirePermission.tsx:45`) 소비처는 0 → 7곳**(products 3 · settings 4)이 됐다 — 훅·선례는 완비돼 있고 **`pages/marketing/**` 이 아직 배선되지 않았을 뿐**이다(grep = 0) | **이 섹션**(앱 전역 아님 — 선례 7곳 존재) | UI 기획 · 프론트 구현 |
| 6 | ~~COMP-10~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `TemplateListPage.tsx:124` 가 `useListState` 를 통해 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다. 조합 중 커밋 금지(`useDebouncedSearch.ts:87`)·250ms 디바운스(`:23,93-95`)·Enter 차단(`:121-124`) 전부 붙었다. **본문(최대 2000자)까지 훑는 `searchTemplates` 가 자모마다 돌던 비용이 조합당 1회로 줄었다** | — | **닫힘** |
| 7 | ~~EXC-12~~ · EXC-06 | P1 | **EXC-12 해소 (F3b · 2026-07-17)** — `createStoreAdapter.fetchOne` 이 `:192-194` 에서 `if (!exists(id)) throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')` 를 던진다. 예전에는 store 의 `getTemplate`(`_shared/store.ts:168-172`)이 **status 없는 generic Error** 를 던져 `useCrudForm` 의 `isNotFound` 분기(`useCrudForm.ts:143-149`)가 **영원히 발현되지 않았고**, 삭제된 템플릿에 '다시 시도'(영원히 실패)를 권했다. 이제 404 분기가 살아나 `/marketing/templates/nope/edit` 이 '찾을 수 없습니다 + 목록으로'(재시도 버튼 없음)로 간다(`FormPageShell.tsx:116-144`). **`store.ts` 는 그대로지만 어댑터가 먼저 `exists` 로 거른다** — 화면 코드 0줄 변경. **EXC-06 은 유지** — 403·429·400 전용 surface 는 여전히 없다 | 이 화면 + 공용 셸 | **백엔드 명세(BE-036 §7.5)** |
| 8 | STATE-05 | P1 | **빈 상태가 채널 필터 맥락을 못 받는다** — 호출부가 `hasActiveFilters`·`onResetFilters` 를 안 넘겨 필터 0행에 '등록하세요' 를 권한다. 뉴스레터 목록은 넘긴다 | **이 화면**(호출부 1곳 · 4줄) | UI 기획 |
| 9 | COMP-12 | P2 | **길이 기준이 문자/바이트로 갈렸고 SMS 본문이 LMS 한도를 넘겨도 저장된다**. 템플릿명·제목에 카운터 없음 | 이 화면 | UI 기획 · 백엔드 명세(BE-036 §7.8) |
| 10 | ~~ERP-13~~ | ~~P1~~ | **해소 (통합 · 2026-07-17)** — 조사 헬퍼가 `shared/format.ts:306(objectParticle)·311(topicParticle)` 로 승격되고 공용 소비처가 전부 소비한다(`useCrudForm.ts:222` → '발송 템플릿을 등록했습니다' · `useCrudList.tsx:108,158` → 템플릿명의 받침으로 고른다 · `FormPageShell.tsx:129-130` · `crud/validation.ts:22,25` → '템플릿명을 입력하세요'). 사용자 대상 리터럴 `'을(를)'`·`'은(는)'` grep = **0**. 이 화면 테스트가 느슨했던 덕에 수정이 필요 없었다는 예측이 맞았다 | — | **닫힘** |
| 11 | (quality-bar 밖) | — | 치환변수 바가 '**미리보기에서** 치환됩니다' 라고 안내하나 **이 화면에 미리보기가 없다** | 이 화면(문구 1줄) | UI 기획 |
| 12 | **(quality-bar 밖)** | — | **승인 흐름이 통째로 클라이언트 손에 있다** — 폼이 `approvalStatus` 를 입력으로 보내 **카카오 심사를 우회**할 수 있다. 승인 후 본문 변경·채널 전환 잔여값·반려 사유 자작·승인 이력 부재 포함. **quality-bar 에 이를 겨냥한 요구가 없어 §2 에 행이 없으나 실무 위험도는 P0 gap 보다 높다** | **이 화면** | **UI 기획 쪽 변경 요청 · 백엔드 명세(BE-036 §7.1) — 최우선** |
| 13 | EXC-19 · EXC-05 · EXC-11 | P1 | 세션 만료 시 작성 중 본문 소실 · 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 | 앱 전역 | 프론트 구현 · 백엔드 명세 |
| 14 | EXC-10 · EXC-18 | P1 | 일괄 삭제가 실패 id 를 안 준다 · Shift-range/대량 confirm/progress/cancel 없음. **없는 id 를 성공으로 집계**(#1) | 앱 전역 | UI 기획 |
| 15 | A11Y-13 · A11Y-16 · IA-03 · IA-14 | P1 | 폼 진입 첫 필드 포커스 없음 · **SMS→LMS 승격이 announce 되지 않음** · breadcrumb 없음 · 반응형 미선언 | 앱 전역 + 이 화면 | UI 기획 |
| 16 | ERP-12 · ERP-15 · ERP-08 · COMP-09 | P1/P2 | export 없음 · 대형 목록 계약 없음 · **`updatedAt` 이 UTC 저장 + 로컬 렌더라 시드와 기준이 다름** · 템플릿명 truncation 없음 | 앱 전역 + 이 화면 | UI 기획 · 백엔드 명세 |
| 17 | (quality-bar 밖) | — | 심사 제출 트리거 부재(심만 있고 호출부 0건) · 템플릿명 중복 검사 없음 · 목록 정렬 규칙 없음 · 채널 배지 3종 동일 tone | 이 화면 | 아키텍처 · 백엔드 명세 · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래는 판정을 재현할 때 쓸 스위치이며, 실제 구동 결과가 아니다.

**실패 재현** — `shared/crud/dev.ts` 의 `failIfRequested(scope, op)` 규약. 이 화면의 **scope 는 `marketing-templates`**(`data-source.ts:15-16` — `TEMPLATE_RESOURCE` 를 그대로 쓴다), **op 는 `list` · `detail` · `save` · `delete`** 4종(`crud.ts:113` · `:118` · `:123`/`:128` · `:133` — `createStoreAdapter` 에서도 `create`/`update` 가 **같은 `save` op 를 공유**한다).

| 스위치 | 효과 | 이 화면에서 보는 것 |
|---|---|---|
| `?fail=list` · `?fail=marketing-templates:list` | 목록 조회를 generic Error 로 실패 | FS-036-EL-010 배너 (STATE-02) |
| `?fail=detail` · `?fail=marketing-templates:detail` | 상세 조회 실패 | FS-036-EL-029 '불러오지 못했습니다' 갈래 |
| `?fail=save` · `?fail=marketing-templates:save` | 등록·수정 실패(둘 다) | FS-036-EL-014 배너 |
| `?fail=delete` · `?fail=marketing-templates:delete` | 삭제 실패 | 다이얼로그 안 배너 (FEEDBACK-02) |
| `?fail=all` | 전 op 실패 | 위 전부 |

**status 재현** — `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능한 코드는 `400·401·403·404·409·412·422·429·500`(`dev.ts` `REPRODUCIBLE`).

| 스위치 | 이 화면에서 보는 것 |
|---|---|
| `?status=save:409` | FS-036-EL-030 충돌 다이얼로그 — **스위치로만 재현된다. 실제 동시 삭제로는 뜨지 않는다**(EXC-04 gap 근거) |
| `?status=save:422` | FS-036-EL-026 필드 인라인 + 포커스 (EXC-07) |
| `?status=save:500` | 배너 + 복사 가능한 오류 코드 (EXC-20) |
| `?status=detail:404` | FS-036-EL-029 '찾을 수 없습니다' 갈래 — **스위치로만 재현된다. 실제 없는 id 로는 generic 갈래로 떨어진다**(EXC-12 gap 근거) |
| `?status=list:401` | 전역 인터셉터 → `/login?...&reason=session_expired` (EXC-02) |
| `?status=save:403` | 일반 실패 배너로 수렴 — 권한 전용 문구 없음(EXC-06) |

> **이 화면의 `?status=` 는 진단 도구로서 특별한 값을 갖는다**: 스위치로 강제한 409/404 는 **UI 를 살려내지만** 같은 조건을 실제 데이터로 만들면(다른 탭에서 삭제 후 저장 / 없는 id 로 진입) 아무 일도 일어나지 않는다. **이 대비가 EXC-04·EXC-12 의 원인이 UI 가 아니라 어댑터임을 증명하는 가장 짧은 재현이다.**

**`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 는 이 스위치를 구현하지 않으며(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재), 이 화면의 지연은 `LATENCY_MS = 400` **상수 고정**이다. STATE-01 의 skeleton 축은 `?delay=` 없이 **최초 진입(캐시 비어 있음) vs 재조회(캐시 있음)** 를 비교해 판정한다.

**그 밖의 도구**: 저장소 직접 조작(DevTools 에서 `removeTemplate(id)` 호출 → 유령 저장 재현) · 조사 폴백형 grep(`을(를)`·`은(는)`·`이(가)`) · `isComposing`/`useDebouncedSearch`/`useListState`/`useRouteWritePermissions` import grep · `document.querySelectorAll('h1').length`(IA-02) · 채널 SMS + 한글 1,500자 본문(COMP-12 바이트 초과 재현) · ESLint/stylelint 0 warning(TOKEN-01).

## 7. 자기 점검

- [x] quality-bar 요구 문구를 **재서술하지 않았다** — ID 로만 참조하고 '이 화면에서 어떻게/무엇으로 판정하는가' 만 적었다
- [x] §2 가 **P0 30건 전수**를 지정된 순서로 담았다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인). 모든 `gap` 에 재현 가능한 측정 기준. 모든 `N/A` 에 사유. 모든 `종속` 에 '이 화면의 어느 표면이 상속하는가'
- [x] §2.1 산수 검산 — 14(pass) + 11(종속) + 2(n-a) + 3(gap) = **30** ✅ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓)
- [x] §3 은 **표면이 실재하는 P1·P2 만** 담았다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`marketing-templates`)·op 목록(`list`/`detail`/`save`/`delete`)을 **어댑터 코드(`createStoreAdapter`)에서 직접 확인**했다. **`?delay=` 를 쓰지 않았고** 이 화면에 없음을 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §6 머리에 명시했다
- [x] §5 의 gap 이 FS-036 §7 · BE-036 §7.12 와 상호 참조된다
- [x] ~~**자매 화면(NFR-033 뉴스레터)과의 차이를 정확히 짚었다**~~ → **2026-07-17: 그 차이가 사라졌다.** F3b 가 `createStoreAdapter` 에 존재 검사 + 409 를 넣어(`crud.ts:171,219-221,232-234`) 두 팩토리의 계약이 합쳐졌다. **EXC-04 의 유령 저장 축은 이제 두 화면 모두 pass** 다. 남은 차이는 없다
- [x] **quality-bar 에 행이 없는 최대 위험(승인 상태 클라이언트 지정)을 §2 표에 억지로 끼워 넣지 않고 §2.1 주석 · §4.2 · §4.3 · §5 #12 로 명시했다**
- [x] **브리핑의 사실 주장을 그대로 쓰지 않고 재확인했다** — F2 시점에는 `useListState`/`useDebouncedSearch` 소비자가 `MembersPage`/`MembersToolbar` 2파일뿐이었다. **2026-07-17 재확인 결과 F3b 롤아웃으로 `useListState` 소비 화면이 34곳이 됐고(`a5c2639` 재확인 — 직전 문서의 '37곳' 은 `= useListState(` 호출부 실측 34곳과 어긋나 바로잡았다) 이 화면(`TemplateListPage.tsx:124`)도 그중 하나다** — 그래서 COMP-10·IA-13 을 pass 로 뒤집었다
- [x] **2026-07-17 · `HEAD = 4b805ad`(F3a·F3b·통합) 기준으로 30행 전수 재검증했다. F2(`3cd3078`) 판정을 재사용하지 않았다.** 뒤집힌 판정 3건: **COMP-10**(`TemplateListPage.tsx:124` → `useListState.ts:227-230` → `useDebouncedSearch.ts:87,93-95,121-129`) · **IA-13**(`useListState.ts:87-99,108-129`) · **EXC-04**(`crud.ts:171,219-221,232-234`). §3 의 **EXC-12 · ERP-13 도 pass 로 뒤집혔다**(`crud.ts:192-194` · `format.ts:306,311`). **사유가 바뀐 gap 2건**: IA-02 · EXC-03. **유지된 gap 2건**: IA-04(`pages/marketing/**` 에 `<Pagination`·`pageSize` grep = 0) · 승인 상태 클라이언트 지정(§5 #12 — F3a·F3b·통합이 이 축을 건드리지 않았음을 코드로 확인). **grep 함정 2개를 피했다**: ① `aria-required` 는 `FormField.tsx:50-56` 의 런타임 `cloneElement` 주입이라 앱 소스 grep 으로 판정하지 않았다(이 폼의 required 자식은 `input`/`SelectField`/`TextareaField` 라 전부 주입된다 → A11Y-11 pass) ② `useDebouncedSearch` 는 `useListState` 경유 소비라 화면 파일 grep 이 0건이어도 pass 다
