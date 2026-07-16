---
id: NFR-033
title: "뉴스레터 비기능 명세"
functionalSpec: FS-033
backendSpec: BE-033
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-033. 뉴스레터 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-033 뉴스레터 (`/marketing/newsletters` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구를 재서술하지 않는다.** 요구 문구는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. '이 화면에서 어떻게 충족되는가 / 무엇을 재현하면 판정되는가' 만 적는다 |
| 함께 읽는 문서 | FS-033(요소·예외) · BE-033(엔드포인트·보안 판정) · BE-003 §2·§3(에러 봉투·권한) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 §2 표를 다시 채점한다. 화면 코드가 바뀌면 gap 행의 근거(파일:라인)를 다시 확인한다 |
| 판정 시점 | **2026-07-17 · `HEAD = 4b805ad`** (F3a·F3b·통합 머지 후 — PR #8·#11·#12·#14·#16) 코드 대조. 이전 판정은 F2(`3cd3078`) 기준이었고 **COMP-10 · IA-13 이 pass 로 뒤집혔다**(§2 · §2.1 · §5). **A11Y-11 은 gap 그대로다** — 발신자 select 의 결함은 `aria-invalid`↔`aria-describedby` 축이라 F3a 의 `aria-required` 주입과 무관하다. **ERP-13 도 gap 그대로다** — 공용 경로의 리터럴 '을(를)' 은 전부 사라졌으나 **이 화면 고유 비문**(`NewsletterFormPage.tsx:211,213`)이 남아 있다. **E2E 미실행 — 판정 근거는 전부 코드 대조다** |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈) 또는 **이 화면이 소비하는 공용 CRUD 프레임워크**(`shared/crud`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·앱 전역 배관(App root·queryClient)이 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

> **`직접` 에 `shared/crud` 를 포함하는 이유**: 이 화면은 `useCrudList`·`useCrudForm`·`CrudListShell` 에 데이터 배선 전부를 위임한다. 그 훅을 **소비하는 선택**이 이 화면의 것이므로(우회해 자체 `useQuery` 를 쓰는 화면이 실제로 여럿 있다), 충족·미충족의 책임을 이 문서가 진다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | `useCrudList` 가 `firstLoading = isFetching && data === undefined` 로 스켈레톤 조건을 최초 로드에만 묶고, `refreshing = isFetching && data !== undefined` 를 따로 준다(`shared/crud/useCrudList.tsx:71-72`). `CrudListShell` 이 `loading={firstLoading}` 만 표에 넘긴다(`CrudListShell.tsx:138`). 4상태가 배타적으로 갈린다: 실패면 표 자리를 배너가 대체(`:113`), 0행이면 `Empty`(`CrudTable.tsx:153-169`), 그 외 행 | `/marketing/newsletters` 최초 진입 → 스켈레톤만(빈 상태 문구 없음). 상태 필터를 바꿔 0행 → `Empty` 만. `?fail=marketing-newsletters:list` → danger Alert 만. **데이터가 있는 상태에서 재조회(캐시 무효화 후) → 표가 스켈레톤으로 바뀌지 않고 요약에 '새로고침 중…' 만 붙는다** | pass |
| STATE-02 | STATE | 직접 | 목록 조회 실패는 인라인 danger `Alert` + '다시 시도'(`refetch`)로 표·요약·선택바를 대체한다(`CrudListShell.tsx:156-165`). 토스트로 처리하지 않으며 빈 상태로 폴백하지 않는다. 폼 로드 실패도 인라인 Alert(`NewsletterFormPage.tsx:204-226`) | `?fail=marketing-newsletters:list` → 인라인 danger Alert + '다시 시도'. 토스트 0건. '다시 시도' 클릭이 조회를 재발행. `?fail=marketing-newsletters:detail` + `/:id/edit` → 폼 자리에 인라인 Alert | pass |
| STATE-04 | STATE | 직접 | **선택 리셋 축**: 검색어·상태 필터가 바뀌면 `clear()` 로 행 선택을 전부 해제한다(`NewsletterListPage.tsx:124-126`). 일괄 삭제 전원 성공 시에도 해제(`useCrudList.tsx:144`). **page clamp 축**: 이 화면에 **페이지네이션이 없어**(FS-033-EL-035) page 상태 자체가 존재하지 않는다 — clamp 대상이 없다(공전). 페이지네이션 부재 자체는 IA-04 로 판정한다 | 3행 선택 → 상태 필터를 '초안'으로 변경 → 선택 바가 사라지고 `selectedIds` 가 빈다. 검색어 입력 → 동일. **clamp 는 재현 대상이 없다(page 파라미터 없음)** — IA-04 gap 해소 시 이 행을 재채점한다 | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 4개 소스(`NewsletterListPage.tsx` · `NewsletterFormPage.tsx` + `_shared/{SegmentPicker,VariableInsertBar,EmailPreview}.tsx`)의 모든 `CSSProperties` 값이 `var(--tds-*)` 또는 `calc(var(--tds-space-6) * n)` 이다. hex 리터럴 0건 · px 리터럴 0건 · border/outline 키워드 0건 | 네 파일에 `#[0-9a-f]{3,6}` grep = 0, `[1-9]px` grep = 0, `(outline\|border): (thin\|medium\|thick)` grep = 0. ESLint(`no-restricted-syntax`) 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면(백링크·변수 삽입 칩)이 `className="tds-ui-focusable"` 로 DS 포커스 링을 상속한다(`NewsletterFormPage.tsx:232` · `VariableInsertBar.tsx:61`). DS 입력·버튼도 각자 링을 갖는다. **링 두께의 정본은 DS/토큰 파이프라인** | DS 소유 문서 판정을 따른다. 이 화면에서는 백링크·칩·입력의 focus-visible 링이 DS 버튼과 픽셀 동일한지만 확인 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 이 화면의 성공·실패 통지가 전부 `ToastProvider` 를 지나므로 Toast entrance easing 계약을 상속한다(삭제 성공·저장 성공 토스트) | DS 소유 문서 판정. 이 화면에서는 저장 성공 토스트가 실제로 entrance 애니메이션을 재생하는지만 확인 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 부상 표면 — `Card`(폼 4장 + 미리보기 1장) · `ConfirmDialog`/`Modal`(삭제·충돌·미저장 가드) · Toast — 이 DS shadow 토큰을 상속한다 | DS 소유 문서 판정. 이 화면에서는 삭제 다이얼로그·토스트가 light/dark 양쪽에서 배경 위로 부상하는지만 확인 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 폼 `<h1>` 이 공유 `pageTitleStyle`(title.xl tier)을 소비한다(`NewsletterFormPage.tsx:241`). AppHeader `<h1>` 도 같은 상수를 쓴다(`AppHeader.tsx:53`). 이 화면은 그 tier 의 **소비자**다 | DS/토큰 소유 문서 판정. 이 화면에서는 '뉴스레터 등록' h1 이 body-md 보다 가시적으로 큰지만 확인. **h1 이 2개라는 사실은 IA-02 로 판정** | 종속 |
| COMP-10 | COMP | 직접 | **F3b 에서 뒤집혔다 — 이제 소비한다.** `NewsletterListPage.tsx:127` 이 `useListState({ filterDefaults })` 를 쓰고, 그것이 내부에서 `useDebouncedSearch({ initial: keyword, onCommit: commitKeyword })` 를 배선한다(`useListState.ts:24,227-230`). 화면은 `list.searchInput`/`list.setSearchInput` 을 값에, **`{...list.searchInputProps}` 를 `SearchField` 에 스프레드**한다. 요구의 3개 절이 전부 닫혔다: ① **조합 중 커밋 금지** — `useDebouncedSearch.ts:87` 이 `composing` 이면 effect 를 즉시 반환하고 `:121-124` 가 조합 중 Enter 를 `stopPropagation` 한다(`nativeEvent.isComposing` **과** 자체 관측 ref 를 함께 본다 — 합성 이벤트에서 `isComposing` 이 누락되는 구멍을 메운다) ② **디바운스 + 최소 길이** — `:23` `DEBOUNCE_MS = 250`, `:91` `minLength` 게이트(빈 문자열은 '검색 해제'라 언제나 통과) ③ **out-of-order race** — react-query 가 키워드를 쿼리 키에 넣어 이미 닫혀 있다(`:14-18`). **BE-033 §7.5 의 서버 검색이 붙어도 이 seam 은 이미 막혀 있다** | 검색창에 '뉴스레터' 를 IME 로 입력 → 'ㄴ'·'뉴'·'뉴ㅅ' 단계에서 커밋 **0건**, 조합 확정 후 250ms 잠잠하면 **1회** 커밋 → `?q=뉴스레터`. 조합 중 Enter → 부분 문자열 커밋 0건. **앱 grep 주의**: `NewsletterListPage.tsx` 에 `useDebouncedSearch` 직접 import 는 0건 — 소비는 `useListState` 경유이므로 grep 수치로 판정하지 말 것 | **pass** |
| FEEDBACK-02 | FEEDBACK | 직접 | 삭제(단건·일괄)가 `useCrudList` 의 `ConfirmDialog`(`intent="delete"`)로 게이트된다(`useCrudList.tsx:151-178`). busy 중 확인 버튼 잠금(`busy={deleting}`), 실패 시 **다이얼로그를 열어둔 채** error 배너(`:111` · `:138-141`), 재클릭이 retry. 취소·Esc·딤 클릭은 `closeDelete`/`closeBulk` 가 in-flight 요청을 abort 하고 pending 을 리셋한다(`:86-92` · `:117-123`) | `?fail=marketing-newsletters:delete` → 행 삭제 → 다이얼로그가 유지되고 danger 배너, 재클릭이 재요청. 요청 중 Esc → 토스트 없이 닫히고 버튼 state 복원(`isAbort` 가 실패로 세지 않는다) | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | `useUnsavedChangesDialog(isDirty && !saving, { message })` 를 폼이 직접 배선한다(`NewsletterFormPage.tsx:173`). 훅이 3경로를 모두 덮는다 — beforeunload · capture-phase 링크 가로채기 · popstate sentinel. 저장 성공 시 `navigate(listPath, {replace:true})` 전에 RHF 가 not-dirty 가 되어 가드가 풀린다 | 본문을 한 글자 고친 뒤 ① 탭 닫기 ② 사이드바 '이벤트' 링크 ③ 브라우저 Back → 각각 discard 다이얼로그. 저장 성공 후 같은 이동 → 프롬프트 없이 통과 | pass |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 편집 폼을 담은 modal 이 없다.** 등록·수정은 전용 라우트(`/new` · `/:id/edit`)이고(IA-06 무게 규칙), 이 화면의 modal 은 `ConfirmDialog` 3종(삭제 확인·충돌·미저장 가드)뿐이다 — 셋 다 입력 필드가 없어 dirty 개념이 성립하지 않는다 | 재현 대상 없음 — 폼 modal 이 존재하지 않는다 | n-a |
| A11Y-01 | A11Y | 상속 | 이 화면의 결과 통지(삭제 성공·저장 성공 토스트)가 `ToastProvider` 의 **항상 마운트된** live region 을 지난다(polite `role="status"` + assertive 영역, `shared/ui/ToastProvider.tsx:165` · `:168`) | DS/Provider 소유 문서 판정. 이 화면에서는 회차 삭제 성공 토스트가 스크린리더로 announce 되는지만 확인 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 3개 `ConfirmDialog`(삭제·충돌·미저장 가드)가 DS `Modal`/`ConfirmDialog` 의 `aria-describedby` 계약을 상속한다 | DS 소유 문서 판정. 이 화면에서는 삭제 다이얼로그 open 시 `'<N회 제목>' 을(를) 삭제합니다…` 본문이 읽히는지만 확인 | 종속 |
| A11Y-11 | A11Y | 직접 | **미충족.** 발신자 select 가 `isInvalid={errors.senderId !== undefined}` 로 `aria-invalid="true"` 를 받지만(`SelectField.tsx` 가 `aria-invalid={isInvalid ? true : undefined}` 설정) **`aria-describedby` 를 넘기지 않는다**(`NewsletterFormPage.tsx:269-288`). `FormField` 는 에러 `<p id="nl-sender-error" role="alert">` 를 렌더하지만 **자동 배선하지 않는다** — id 를 자식 컨트롤에 무는 것은 호출부 책임이다(`FormField.tsx:9-10` 주석 · `:72`). 같은 폼의 제목·예약일시 입력은 올바르게 배선돼 있고(`:265` · `:368-370`), 본문 `TextareaField` 는 내부에서 배선한다 — **발신자 select 1건만 짝이 없다** | `/marketing/newsletters/new` → 발신자를 '발신자 선택'(빈값)으로 둔 채 제출 → `<select id="nl-sender" aria-invalid="true">` 에 `aria-describedby` 속성이 없다(DevTools). 에러 `<p>` 의 id 는 `nl-sender-error` 로 존재한다 — 연결만 빠졌다. 스크린리더가 '유효하지 않음' 만 읽고 **'발신자를 선택하세요.' 를 읽지 않는다** | **gap** |
| A11Y-12 | A11Y | N/A | **이 화면에 좌측 필터 list item 이 없다.** 상태 필터는 `SelectField` 드롭다운이고(`NewsletterListPage.tsx:143-156`) 필터 패널·토글 버튼이 없다 — `aria-pressed`/`aria-current` 를 쓸 표면 자체가 없다 | 이 화면의 4개 소스에 `aria-current` grep = 0 · `aria-pressed` grep = 0(둘 다 표면 없음) | n-a |
| MOTION-01 | MOTION | 상속 | 이 화면의 `Modal` 표면 — 삭제 확인·충돌·미저장 가드 다이얼로그 — 이 DS Modal 의 enter/exit transition 계약을 상속한다 | DS 소유 문서 판정. 이 화면에서는 삭제 다이얼로그 open/close 에 backdrop fade + dialog scale 이 보이고 reduced-motion 에서 즉시 등장/제거되는지만 확인 | 종속 |
| MOTION-02 | MOTION | 상속 | 이 화면의 성공 토스트(삭제·저장)가 ToastProvider 의 exit 애니메이션 계약을 상속한다 | DS 소유 문서 판정. 이 화면에서는 저장 성공 토스트의 auto-dismiss 가 exit 애니메이션을 보이는지만 확인 | 종속 |
| MOTION-03 | MOTION | 상속 | 이 화면은 자체 Motion 을 도입하지 않는다 — 모든 움직임(Modal·Toast·스켈레톤 pulse)이 DS 소유다. reduced-motion 게이트도 DS 가 소유한다 | DS 소유 문서 판정. 이 화면에서는 `prefers-reduced-motion: reduce` 에뮬레이션 시 다이얼로그·토스트에 move/scale 이 남지 않는지만 확인 | 종속 |
| IA-01 | IA | 직접 | 세 라우트(`/marketing/newsletters` · `/new` · `/:id/edit`)가 전부 `APP_ROUTES` 에 등재돼(`App.tsx:257-259`) `RequireAuth > AppShell` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:121-133`). 두 페이지 컴포넌트 중 자체 sidebar/header/outer frame 을 그리는 것은 없다 — 최상위가 각각 `columnStyle`(목록) · `pageStyle`(폼) div 다 | 세 라우트 모두 사이드바+헤더가 유지된 채 `<main>` 안에 그려진다. 두 소스에 `<header>`/`<aside>`/sidebar grep = 0 | pass |
| IA-02 | IA | 직접 | **통합에서 절반이 해소됐다 — 사유가 바뀌었고 판정은 유지된다.** ① **해소** — 브랜치 폴백이 사라졌다. `nav-config.ts:260-278` `findCoveringLeaf` 가 '자기를 감싸는 **가장 긴 잎**'을 세그먼트 경계(`covers()` — `:255-257`)로 찾고 `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` 이 그것을 쓴다. `/marketing/newsletters/new` 의 AppHeader `<h1>`(`AppHeader.tsx:101`)은 이제 **'뉴스레터'** 다(≠ 예전의 '마케팅 관리'). 권한(`route-resource.ts:32-35`)이 쓰던 규칙과 한 곳으로 통일됐다. **목록 라우트는 잎이고 in-content h1 이 없어 h1 이 정확히 1개 — 그 축은 pass** ② **잔여 gap (폼 라우트)** — **`<h1>` 이 여전히 둘이다**: `AppHeader.tsx:101` + `NewsletterFormPage.tsx:241`(이 화면은 `FormPageShell` 을 쓰지 않고 자기 셸을 그리므로 h1 도 자기가 그린다). 게다가 `nav-config.ts:294-296` 이 **'등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아** 상단 h1 이 `/new` 와 `/:id/edit` 에서 똑같이 '뉴스레터' 다 — 스크린리더 사용자는 상단 제목만으로 등록인지 수정인지 알 수 없다. quality-bar IA-02 의 '단일 title 메커니즘' 미충족 | `/marketing/newsletters` → `h1` 1개, '뉴스레터' ✓. `/marketing/newsletters/new` → **`length === 2`**, `[0]` = '뉴스레터'(브랜치 아님 ✓ · 행위 미반영 ✗), `[1]` = '뉴스레터 등록'. `nav-config.test.ts:16-40` 이 `/company/history/new` → '연혁' 으로 잎 해석을 고정한다 | **gap** (잎 목록 축 pass · 폼 라우트 h1 이중 축 미충족) |
| IA-04 | IA | 직접 | **미충족(Pagination 축).** 템플릿의 나머지는 성립한다: 툴바 좌측 검색·필터 + 우상단 primary '뉴스레터 등록'(`NewsletterListPage.tsx:133-163`) → 결과 count 요약(`CrudListShell.tsx:118-122`) → `SelectionBar`(`:125-133`) → 표(`:135`). **그러나 Pagination 이 없다** — `CrudListShell`·`CrudTable` 어디에도 페이지네이션이 없고 `visibleItems` 전량을 렌더한다(`CrudTable.tsx:171`). 회차는 발행할수록 누적되며 삭제되지 않으므로 'page size 초과 가능' 목록이다. BE-033 EP-01 도 페이징 파라미터가 없다(전량 반환) | `/marketing/newsletters` → 툴바·요약·SelectionBar·표는 확인되나 표 하단에 Pagination 컴포넌트가 없다. 픽스처 시드를 30건으로 늘리면 30행이 모두 한 화면에 렌더된다. 두 소스에 `Pagination` import = 0 | **gap** |
| IA-05 | IA | 직접 | `/marketing/newsletters/new` 와 `/marketing/newsletters/:id/edit` 가 **같은 `NewsletterFormPage` 컴포넌트**로 해석된다(`App.tsx:258-259`). `useCrudForm` 이 `useParams().id` 유무로 `isEdit` 를 갈라 제목·prefill 만 다르게 한다(`useCrudForm.ts:73-74`). 등록 전용/수정 전용 페이지가 따로 없다 | `App.tsx:258-259` 의 두 라우트가 동일 element 를 가리킨다. `/new` → h1 '뉴스레터 등록' + 빈 폼, `/:id/edit` → h1 '뉴스레터 수정' + prefill. 레이아웃 동일 | pass |
| IA-13 | IA | 직접 | **F3b 에서 뒤집혔다 — 이제 소비한다.** `NewsletterListPage.tsx:127` 이 `useListState({ filterDefaults: FILTER_DEFAULTS })` 를 쓴다. 상태 필터·검색어의 **단일 원천이 URL 쿼리스트링**이다: `useListState.ts:87` `useSearchParams` → `:89-91` page/`?q=`/sort → `:93-99` 필터. 갱신은 `patchParams` 한 통로(`:108-129`)로만 나가고 **`replace: true`**(`:125`)라 히스토리가 쌓이지 않는다. 기본값과 같은 값은 URL 에서 지운다(`:116`). 손으로 고친 모르는 값은 공용 `parseFilter` 가 허용 목록으로 걸러 '전체'로 되돌린다. `useListState` 소비 화면은 **37곳**이며 **마케팅 6화면 전부**가 여기 든다. ~~앱 전체 소비자는~~ `MembersPage`/`MembersToolbar` 2파일뿐이다(grep 확인). page/sort 는 애초에 존재하지 않는다(IA-04 gap) | '발송완료' 필터 + '7월' 검색 적용 → URL 이 `/marketing/newsletters` 그대로(쿼리스트링 없음). 행을 열어 수정 폼 진입 후 브라우저 Back → **필터·검색어가 초기화된 전체 목록**에 착지. URL 을 새 탭에 복사 → 필터 없는 기본 목록. `NewsletterListPage.tsx` 에 `useSearchParams`/`useListState` import = 0 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell` 의 `<Outlet>` 바로 바깥 `ErrorBoundary` 가 잡는다(`AppShell.tsx:486-494`, `resetKey={pathname}`) — 사이드바·헤더가 살아남고 다른 메뉴로 이동하면 경계가 스스로 풀린다. App root 에도 최후 경계가 있다(`App.tsx:108-112`) | AppShell/App 소유 문서 판정. 이 화면에서는 `NewsletterListPage` 에 강제 throw 를 넣으면 사이드바가 유지된 채 복구 UI 가 뜨고 다른 메뉴로 걸어 나갈 수 있는지만 확인 | 종속 |
| EXC-02 | EXC | 상속 | **route guard**: `RequireAuth` 가 `AppShell` **바깥**을 감싼다(`App.tsx:121-127`) — 세션 없이 `/marketing/newsletters` 딥링크 시 셸도 그리지 않고 `/login?returnUrl=…` 로 보낸다. **401 인터셉터**: 이 화면의 모든 조회·쓰기가 전역 `QueryCache`/`MutationCache` 의 `onError` 를 지나 `isUnauthorized` → `notifySessionExpired()` 로 수렴한다(`queryClient.ts:38-40` · `:46-47`) | AppShell/queryClient 소유 문서 판정. 이 화면에서는 세션 제거 후 `/marketing/newsletters` 딥링크가 `/login?returnUrl=%2Fmarketing%2Fnewsletters` 로 가는지, `?status=list:401` 이 재인증 경로를 트리거하는지만 확인. **단, 작성 중 폼이 사라지는 문제는 §4.2·§5 #7** | 종속 |
| EXC-03 | EXC | 직접 | **부분 미충족(쓰기 게이팅 축).** **읽기**는 상속으로 충족된다 — `RequirePermission` 이 `<Outlet>` 을 감싸(`AppShell.tsx:490`) read 권한 없는 딥링크에 403 화면을 렌더하고, 리소스는 라우트에서 파생된다(`route-resource.ts` — `/marketing/newsletters/:id/edit` → 잎 `/marketing/newsletters`). **쓰기 게이팅이 없다**: '뉴스레터 등록' 버튼(`NewsletterListPage.tsx:159-162`) · 행 `RowActions` 수정/삭제(`CrudTable.tsx:192-197`) · `SelectionBar` 일괄 삭제(`CrudListShell.tsx:126-132`) 가 **권한을 조회하지 않는다**. `useRouteCan`/`useRouteWritePermissions` 가 `RequirePermission.tsx` 에 정의돼 있으나 **앱 전체에서 소비자가 0건이다**(grep: 정의 파일 자신 외 없음) — create/update/remove 권한이 false 인 역할도 버튼을 그대로 보고 누를 수 있다. 강등 reconcile 도 같은 이유로 성립하지 않는다 | remove=false 인 역할로 로그인 → `/marketing/newsletters` 에서 행 삭제(휴지통)·일괄 삭제·'뉴스레터 등록' 버튼이 **여전히 보이고 눌린다**. read=false 로 바꾸면 403 화면은 정상 렌더(읽기 축은 pass). 앱 전체 `useRouteWritePermissions` grep = 1(정의부만) | **gap** |
| EXC-04 | EXC | 직접 | `newsletterAdapter` 가 `createCrudAdapter` 라 `update`/`remove` 가 **대상 id 가 없으면 409 를 던진다**(`shared/crud/crud.ts:126-128` · `:139-141`) — 조용한 no-op + 성공 반환(유령 저장)이 닫혀 있다. `useCrudForm` 이 `isConflict`(409/412)를 잡아 **입력을 보존한 채** 충돌 다이얼로그를 띄우고 성공 토스트·목록 이동을 하지 않는다(`useCrudForm.ts:158-173`). 다이얼로그가 '최신 내용 불러오기'/'이어서 편집' 을 준다(`FormFeedback.tsx:58-74`). 서버 연결 시 `If-Match` 토큰은 BE-033 §7.9 가 계약한다 | `/:id/edit` 진입 → 다른 탭에서 그 회차 삭제 → 저장 → **'다른 사용자가 먼저 변경했습니다' 다이얼로그**가 뜨고 입력이 그대로 살아 있으며 성공 토스트·이동이 없다. `?status=save:409` 로도 동일 재현 | pass |
| EXC-08 | EXC | 직접 | `useCrudForm` 이 **동기 제출 락**(`submitLockRef`)으로 disabled 렌더 이전의 두 번째 제출을 막고(`useCrudForm.ts:103` · `:202-203`), `disabled={saving \|\| loadingDetail}` 로 이중 차단한다(`NewsletterFormPage.tsx:405`). **멱등키는 mutationFn 밖 ref** 에서 제출 **시도** 단위로 만들어(`useCrudForm.ts:118-123` · `:211`) — **F3b 에서 그 키가 어댑터까지 연결됐다**(`:228,235` → `crud.ts:288-289,310-311` → `WriteContext` `crud.ts:41,47-48` → ledger `:91,114,121`; 기록은 적용 성공 후에만 — `:116,131`) — 재시도가 같은 키를 재사용하고 성공 시 버린다(`:214`). 삭제·일괄 삭제는 `ConfirmDialog` 의 `busy` 잠금. quality-bar 가 지목한 3대 작업 중 이 화면은 **'생성'** 에 해당한다(발송은 이 화면에 트리거가 없다 — FS-033 §7 #12) | 제출 버튼 더블클릭 / 응답 전 Enter 연타 → 정확히 1개 요청(Network 탭 또는 어댑터 `create` 호출 카운터). `?status=save:500` 으로 실패시킨 뒤 재제출 → `idempotencyKeyRef` 가 같은 키를 유지 | pass |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort` 로 수렴한다. 폼: `handleWriteError` 첫 줄이 abort 를 조용히 흘린다(`useCrudForm.ts:155-156`) — 토스트·배너 없음. 언마운트 시 진행 요청 abort(`:92`). 목록: 삭제 `onError` 가 `isAbort` 로 배너를 띄우지 않고(`useCrudList.tsx:110`), 다이얼로그 닫기가 abort + `mutation.reset()` 으로 pending 을 복원한다(`:86-92` · `:117-123`). 일괄 삭제는 `signal.aborted` 면 결과를 무시한다(`:136`) — abort 가 부분 실패 건수에 섞이지 않는다 | 삭제 다이얼로그에서 '삭제' 클릭 직후(응답 전) Esc → **토스트·배너 0건**, 버튼 state 복원. 저장 중 사이드바로 이탈 → 실패 토스트 없음. 일괄 삭제 중 취소 → 'N건 중 M건 실패' 배너가 뜨지 않는다 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **13** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · **COMP-10** · FEEDBACK-02 · FEEDBACK-04 · IA-01 · IA-05 · **IA-13** · EXC-04 · EXC-08 · EXC-09 |
| 종속 | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **2** | FEEDBACK-06(폼 modal 없음) · A11Y-12(좌측 필터 패널 없음) |
| gap | **4** | A11Y-11 · IA-02 · IA-04 · EXC-03 |
| **합계** | **30** | 13 + 11 + 2 + 4 = **30** ✅ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓) |

> **2026-07-17 · `4b805ad` 기준 변경**: F2 판정의 gap 6건 중 **2건이 pass 로 뒤집혔다** — **COMP-10**(F3b 가 `useListState` → `useDebouncedSearch` 를 이 화면에 배선) · **IA-13**(같은 훅이 조회 상태를 URL 로 옮겼다). **IA-02 · EXC-03 은 gap 을 유지하되 사유가 바뀌었다**(브랜치 폴백 ✕ → h1 이중·행위 미반영 / 소비자 0 ✕ → 7곳 있으나 marketing 미배선). **A11Y-11 은 gap 그대로다** — F3a 가 `FormField.tsx:50-56` 에 `aria-required` 런타임 주입을 넣었지만 **발신자 select 의 결함은 `aria-invalid`↔`aria-describedby` 축**이라 그 주입과 무관하다(§2 A11Y-11 행 참조).
>
> **P0 gap 4건 = quality-bar '배치 실패' 사유.** **IA-02 · IA-04 는 앱 전역 문제**이고, **EXC-03 은 이 섹션 배선**만 남았으며(선례 7곳 존재), **A11Y-11 은 이 화면 1줄**로 해소된다. §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery` 가 `placeholderData: (previous) => previous` 로 이전 행을 유지하고(`crud.ts:151`), `refreshing` 이 요약에 '새로고침 중…' 만 덧붙인다(`CrudListShell.tsx:120`). `staleTime` 30초 · `refetchOnWindowFocus: false`(`queryClient.ts`) | 데이터가 있는 상태에서 캐시 무효화 → 이전 행 유지 + 요약에 '새로고침 중…'. 30초 내 재진입은 네트워크 재조회 없음 | pass |
| STATE-05 | P1 | `Empty` 가 3분기를 그린다 — 검색어 있음/필터 있음/진짜 비었음. 호출부가 맥락을 정확히 넘긴다: `hasQuery: keyword !== ''` · `hasActiveFilters: filter !== 'all'` · `onClearSearch` · `onResetFilters`(`NewsletterListPage.tsx:173-178`). 조사(이/가)는 `Empty` 가 받침으로 고른다 | 매치 없는 검색 → '조건에 맞는 뉴스레터가 없습니다' + '검색 지우기'. 상태 필터만 0행 → '필터 초기화'. 시드 비우기 → '등록된 뉴스레터가 없습니다' | pass |
| STATE-06 | P1 | 등록·수정·삭제 성공 시 `list` 키를 무효화하고, 수정은 `detail` 키도 함께 무효화한다(`crud.ts:179-181` · `:198-201` · `:217-220`). 일괄 삭제는 **전원 성공일 때만** 무효화(`:237-240`) | 회차 수정 후 목록 복귀 → 수동 새로고침 없이 새 제목이 보인다 | pass |
| COMP-04 | P1 | 필수 필드가 전부 `FormField required`(라벨 옆 `*`)로 렌더된다 — 제목·발신자·예약일시(`NewsletterFormPage.tsx:255` · `:269-273` · `:355-359`), 본문은 `TextareaField required`(`:331`), 세그먼트는 `SegmentPicker required`(`:295`, 자체 `*` 마커 `SegmentPicker.tsx:111`) | zod 필수 5개 필드 모두 라벨 옆 `*` 렌더 | pass |
| COMP-09 | P2 | 제목 셀이 `item.title` 을 그대로 렌더한다(`NewsletterListPage.tsx:71`) — truncation·ellipsis 없음. 긴 제목이 컬럼을 넓힌다 | 120자 제목 회차를 시드에 넣으면 표 컬럼이 밀린다 | gap |
| COMP-12 | P2 | 본문은 `TextareaField` 가 실시간 카운터 'N/5000' 을 그린다(`TextareaField.tsx:52`). **제목(`maxLength=120`)에는 카운터가 없다** — `<input>` 직접 렌더(`NewsletterFormPage.tsx:257-267`). 상한 근접 경고 없음. 카운터 기준은 UTF-16 길이이고 서버 강제 기준은 미정(BE-033) | 제목에 120자 입력 → 121번째 문자가 **경고 없이** 사라진다(카운터 없음). 본문은 'N/5000' 이 실시간으로 는다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙이 성립한다: read 실패 → 인라인 Alert(`CrudListShell.tsx:157`) / write 성공 → 토스트 / 다이얼로그 내부 실패 → 그 다이얼로그 error 배너(`useCrudList.tsx:160`) / 폼 저장 실패 → 폼 카드 배너(`FormFeedback.tsx:42`). page 가 임의 배너 state 를 갖지 않는다 | `?fail=marketing-newsletters:delete` → 다이얼로그 배너(토스트 아님). `?fail=marketing-newsletters:list` → 인라인 Alert(토스트 아님) | pass |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 피드백을 갖는다 — 저장(토스트/배너·충돌·인라인) · 삭제(토스트/다이얼로그 배너) · 일괄 삭제(토스트/부분 실패 배너). no-op 클릭 없음 | `?fail=all` 로 각 액션 → 전부 사용자 가시 실패 | pass |
| FEEDBACK-05 | P2 | 모든 삭제가 `ConfirmDialog`(비가역 고지 '이 작업은 되돌릴 수 없습니다.')로 게이트된다. undo window 는 없다 — 확인 방식으로 충족 | 단일 미확인 클릭으로 실행되는 삭제 0건 | pass |
| A11Y-05 | P1 | `SelectField isInvalid` 가 `aria-invalid` 를 설정한다(DS 소유). **발신자 select 의 `aria-describedby` 연결은 호출부 책임이고 빠져 있다** — A11Y-11 gap 과 동일 근거 | A11Y-11 행 참조 | gap |
| A11Y-08 | P1 | 행 클릭이 `useRowNavigation`(마우스 전용)로 수정 폼을 연다(`CrudTable.tsx:172`). **제목 셀이 링크가 아니다**(`NewsletterListPage.tsx:71`). 다만 행 안에 `RowActions` 연필(수정) 버튼이 있어 **같은 목적지로 가는 키보드 도달 가능 컨트롤은 존재한다**(`CrudTable.tsx:192-197`) — 계약의 문면('row 내 keyboard-focusable 등가물')은 충족되나, 등가물이 '제목 링크' 가 아니라 아이콘 버튼이라 발견성이 낮다 | 행을 Tab 하면 체크박스 → 연필 → 휴지통에 도달하고 연필 Enter 가 행 클릭과 같은 `/:id/edit` 를 연다 | pass |
| A11Y-13 | P1 | `useCrudForm.submit` 이 `handleSubmit(onValid, onInvalid)` 를 부르고 RHF 의 `shouldFocusError` 기본값이 첫 invalid 필드로 포커스를 옮긴다(`useCrudForm.ts:239-241` · `:253`). 서버 422 도 첫 위반 필드로 `setFocus`(`:184`). **폼 진입 시 첫 필드 자동 포커스는 없다** | 빈 폼 제출 → `document.activeElement` 가 제목 입력. 폼 진입 직후 → `activeElement` 가 `<body>`(첫 필드 아님) | gap |
| A11Y-16 | P1 | 목록 상태 라이브 리전이 **항상 마운트**돼 있다(`CrudListShell.tsx:107-109`) — 필터·검색으로 0행이 되는 전환이 polite 로 들린다. `SegmentPicker` 에러가 `role="alert"`(`SegmentPicker.tsx:138`), 변수 칩이 `aria-label`(`VariableInsertBar.tsx:65`), 표가 `aria-busy`, 미리보기가 `aria-label` | 상태 필터로 0행 전환 → '조건에 맞는 뉴스레터 결과가 없습니다.' announce | pass |
| IA-03 | P1 | breadcrumb 이 없다 — `/marketing/newsletters/new` 에 '마케팅 관리 > 뉴스레터 > 등록' trail 이 없다(AppHeader 는 제목 1줄만) | 폼 라우트에 breadcrumb 요소 0건 | gap |
| IA-06 | P1 | 무게 규칙에 맞는다 — 뉴스레터는 rich 엔티티(본문·세그먼트·예약·미리보기)라 전용 form route 이고 modal edit 이 없다 | `/new`·`/:id/edit` 가 전용 라우트. 폼 modal 0건 | pass |
| IA-07 | P1 | 백링크가 '목록으로' + `ChevronLeftIcon` + 좌상단(`NewsletterFormPage.tsx:230-238`) — 공유 관례와 일치. 다만 `FormPageShell` 을 쓰지 않고 **같은 마크업을 손으로 복제**했다(IA-12) | 백링크 라벨 '목록으로' · 아이콘 ChevronLeft · `alignSelf: flex-start` | pass |
| IA-08 | P1 | footer 가 취소(좌) + primary 제출(우), `justifyContent: flex-end`(`NewsletterFormPage.tsx:395-408`). **단 카드 **밖**(below-card)이다** — `FormPageShell` 계열은 카드 **안**(in-card)에 둔다(`FormPageShell.tsx:179-191`). 같은 앱에서 두 배치가 공존한다 | 뉴스레터 폼: 액션이 카드 밖. 발송 템플릿 폼(FormPageShell): 카드 안 | gap |
| IA-10 | P2 | 2-col preview shell 을 **손으로 만든다** — `gridTemplateColumns: repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))`(`NewsletterFormPage.tsx:79-84`). 공유 layout primitive 가 없고 split 상수가 페이지 로컬(`* 13`)이다. narrow 에서 `auto-fit` 으로 자동 stack 되긴 한다 | `NewsletterFormPage.tsx:81` 의 `* 13` 이 다른 preview 폼의 `* 12`/`* 15` 와 다르다 | gap |
| IA-12 | P2 | 미리보기 2단 때문에 `FormPageShell` 을 쓰지 않고 back-link·title·description·footer·로드 실패 배너를 **전부 복제**했다(`NewsletterFormPage.tsx:61-105` · `:204-246` · `:395-408` vs `FormPageShell.tsx:37-65` · `:115-161` · `:179-191`). 복제 과정에서 **로드 실패 문구의 조사가 빠졌다**(§4.3) | `NewsletterFormPage` 가 `FormPageShell` 을 import 하지 않는다. `backLinkStyle`·`actionsStyle`·`descriptionStyle` 이 재선언돼 있다 | gap |
| IA-14 | P1 | 표에 가로 스크롤 컨테이너가 없다(`tableStyle` 직접). 폼 2단은 `auto-fit` 으로 narrow 에서 stack 된다. 최소 지원 폭 선언 없음 | 375px 에서 8컬럼 표가 page grid 를 넘치는지 확인 필요 | gap |
| ERP-01 | P1 | 상태→tone 이 **단일 레지스트리**에서 온다 — `SEND_STATUS_TONE`/`sendStatusTone`(`_shared/messaging.ts:349-359`)을 목록이 소비한다(`NewsletterListPage.tsx:82`). per-page meta helper 없음 | 5상태 전부 정의된 tone 으로 해석. `sendStatusTone` 이 유일 소스 | pass |
| ERP-06 | P1 | 날짜·숫자가 `shared/format`(`formatDateTime`·`formatNumber`)을 경유한다(`NewsletterListPage.tsx:9`). 톤은 '…습니다' 로 일관. **단 조사 처리가 ERP-13 gap** | 셀에 raw `toString()` 없음(`String(item.issueNo)` 은 회차 숫자를 문자열로 만드는 용도이며 포맷이 아님) | pass |
| ERP-12 | P1 | 목록 export(CSV/xlsx) affordance 가 없다 | 툴바에 export 버튼 0건 | gap |
| ERP-13 | P1 | **절반 해소 — 공용 경로는 pass, 이 화면 고유 비문 2건이 남았다.** ⓐ **해소(통합)**: 조사 헬퍼가 `shared/format.ts:267-325` 로 승격됐고(이전엔 사본 3곳) 공용 경로가 전부 소비한다 — 삭제 토스트·확인 문구가 **항목 이름의 받침**으로 고르고(`useCrudList.tsx:108,158` → `objectParticle`), 저장 토스트가 '**뉴스레터를** 등록했습니다'(`useCrudForm.ts:222` — '터'는 받침 없음 → '를' ✓), 검증이 '**제목을** 입력하세요' · '**본문은** 5000자를 넘을 수 없습니다'(`shared/crud/validation.ts:22,25`). 사용자 대상 리터럴 `'을(를)'` grep = **0**. ⓑ **잔여 gap — 이 화면 고유 비문 2건(2026-07-17 재확인)**: 이 폼은 `FormPageShell` 을 쓰지 않고 **로드 실패 Alert 를 자기가 그리는데**(`NewsletterFormPage.tsx:204-226`) 거기서 목적격 조사가 **아예 빠졌다** — `:211` `'뉴스레터 찾을 수 없습니다.'` · `:212` `'뉴스레터 불러오지 못했습니다.'`. **형제 화면은 맞다** — `EmailFormPage.tsx:222,223` 은 '이메일 발송**을** 찾을 수 없습니다', `SmsFormPage.tsx:233,234` 는 'SMS 발송**을**'. 공용 `FormPageShell.tsx:129-130` 은 `objectParticle(entityLabel)` 로 옳게 만든다. **즉 이 두 줄만 손으로 쓰다 빠뜨린 것이다** — 헬퍼를 쓰거나(`${ENTITY_LABEL}${objectParticle(ENTITY_LABEL)} 찾을 수 없습니다.`) 리터럴 '뉴스레터를' 로 고치면 닫힌다. `Empty` 의 주격(이/가)은 자족 헬퍼(`Empty.tsx:25-26,68`)로 옳다 | 사용자 대상 문자열의 `'을(를)'` grep = **0** ✓. **그러나** `/marketing/newsletters/nope/edit` → **'뉴스레터 찾을 수 없습니다.'** 비문이 그대로 뜬다 ✗. `EmailFormPage`·`SmsFormPage` 의 같은 자리와 비교하면 이 화면만 다르다 | **gap** (공용 축 pass · **이 화면 2줄** 미충족) |
| ERP-15 | P1 | 대형 목록 계약이 없다 — 전량 렌더, virtualization·page size cap 없음(IA-04 gap 과 같은 뿌리). 8컬럼 표에 가로 scroll·pin 없음 | 시드 1,000건 → 1,000행 DOM | gap |
| EXC-05 | P1 | 프론트 타임아웃 상한 없음 — 앱 전체 `AbortSignal.timeout` 0건 | 응답하지 않는 어댑터를 넣으면 spinner 가 무한 지속 | gap |
| EXC-06 | P1 | 에러 타입이 status 를 지닌다(`HttpError`) — `?status=<op>:<code>` 로 401/403/404/409/422/429/500 재현 가능(`dev.ts`). 이 화면은 **404(폼 not-found) · 409/412(충돌) · 422(필드 인라인) · 401(전역 인터셉터) · 5xx(참조 코드)** 를 각각 다른 표면으로 그린다. **403 은 일반 실패 배너로 수렴**(전용 문구 없음) | `?status=save:409` → 충돌 다이얼로그. `?status=save:422` → 인라인. `?status=detail:404` → not-found 갈래. `?status=save:403` → '저장하지 못했습니다' 일반 배너(권한 전용 문구 아님) | gap |
| EXC-07 | P1 | 422 + `violations` 를 `setError` 로 그 입력에 꽂고 첫 필드로 `setFocus`(`useCrudForm.ts:176-186`). 폼 레벨 배너는 generic 전용 | `?status=save:422` + violations 픽스처 → 해당 필드 인라인 + 포커스 | pass |
| EXC-10 | P1 | `settleAll` 로 allSettled semantics, 'N건 중 M건 실패' 보고(`useCrudList.tsx:138-141`), 전원 성공에만 invalidate + 선택 해제(`:143-145`). **그러나 실패 id 를 돌려주지 않아** 재시도가 성공분까지 재실행한다 | 부분 실패 시 어느 행이 실패했는지 UI 에 표시되지 않는다 | gap |
| EXC-11 | P1 | 오프라인 감지 없음 — 앱 전체 `navigator.onLine` 0건 | offline 토글 → 배너 없음, write 가 일반 실패로 떨어진다 | gap |
| EXC-12 | P1 | `createCrudAdapter.fetchOne` 이 `HttpError(404)` 를 던지고(`crud.ts:105-107`) `useCrudForm` 이 `isNotFound` 로 `'not-found'`/`'error'` 를 가른다(`useCrudForm.ts:143-149`). 폼이 404 에는 '다시 시도' 를 **주지 않고** '목록으로' 만(`NewsletterFormPage.tsx:204-226`). 무한 spinner 없음. **단 문구가 비문(ERP-13)** | `/marketing/newsletters/nope/edit` → '찾을 수 없습니다' + '목록으로'(재시도 버튼 없음). `?status=detail:500` → '불러오지 못했습니다' + '다시 시도' + '목록으로' | pass |
| EXC-14 | P1 | 이 화면에 optimistic write 가 없다 — 모든 쓰기가 비관적(confirm + busy). 롤백할 낙관 반영이 없다 | 인라인 토글·재정렬 표면 0건 | pass(해당 없음에 준함) |
| EXC-18 | P1 | selection scope 가 '현재 보이는 행'이다(`toggleAll(visibleItems.map(id))` — `CrudListShell.tsx:143-148`). **Shift-click range 없음 · 대량 임계값 강화 confirm 없음 · progress/cancel 없음**. 확인 문구는 건수를 말한다 | 50행 선택은 클릭 50회. 일괄 삭제에 progress·cancel 없음 | gap |
| EXC-19 | P1 | 세션 만료 전 연장 프롬프트 없음. dirty 폼 draft 스냅샷 없음 — 401 리다이렉트가 프로그램적이라 FEEDBACK-04 가드가 발화하지 못하고 작성 중 본문이 사라진다 | `?status=save:401` → `/login` 이동, 입력 소실 | gap |
| EXC-20 | P1 | 5xx 실패가 `referenceOf(cause)` 로 참조 코드를 뽑아(`useCrudForm.ts:189`) 배너에 '오류 코드 <ref>' 로 노출하고 `userSelect: all` 로 복사 가능하다(`FormFeedback.tsx:44` · `:22`). raw body/stack/status 를 산문으로 렌더하지 않는다 | `?status=save:500` → '저장하지 못했습니다' + 복사 가능한 오류 코드. raw stack 미노출 | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 |
|---|---|---|
| 목록 첫 렌더(p95) | 사용자 조작 → 첫 행 가시 **1.5초 이내**(백엔드 연결 후) | **측정 불가** — 픽스처. `LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 **로딩 상태를 화면에서 볼 수 있게 하는 개발용 지연이며 예산이 아니다** |
| 목록 응답(p95) | `GET /api/marketing/newsletters` **400ms 이내** | 미정 — BE-033 EP-01 이 **전량 반환 + 본문 포함**이라 회차 수에 비례해 자란다(BE-033 §7.5 · §7.8) |
| 재조회 횟수 | 목록 진입당 1회. `staleTime` 30초 내 재진입은 0회. 창 포커스 재조회 0회 | 충족(`queryClient.ts` — `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`) |
| 검색 입력당 연산 | 서버 검색 도입 시 **키워드 확정당 요청 1회**(디바운스 250ms) | **미충족** — 디바운스가 없어 매 자모마다 전 배열 재필터(COMP-10 gap). 오늘은 네트워크 0회(클라이언트 필터) |
| 표 DOM | 한 화면 **최대 10행**(페이지네이션 전제) | **미충족** — 전량 렌더(IA-04 gap). 회차 누적에 비례해 DOM·선택·스크롤이 무거워진다 |
| 폼 미리보기 갱신 | 입력 → 미리보기 반영 **동기(1 프레임)** | 충족 — `EmailPreview` 가 `watch` 값의 순수 파생이다. 본문 5,000자에서 `applyVariableSamples` 가 5회 `replaceAll` 을 돌지만 프레임 예산 안 |
| 번들 | 이 화면 전용 청크 예산 미정 | 라우트 분할 없음(`App.tsx` 가 전 페이지를 정적 import) — 앱 전역 사안 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도. 표는 비우지 않는다 | 충족(STATE-02) |
| 저장 중 서버 5xx | 입력 보존 + 배너 + 참조 코드 | 충족(EXC-20) |
| 저장 중 동시 삭제/수정 | 유령 저장 금지 + 충돌 다이얼로그 + 입력 보존 | 충족(EXC-04) |
| 저장 중 세션 만료(401) | 재인증 후 **원래 경로 + 입력 복원** | **미충족** — 리다이렉트는 되나 입력이 사라진다(EXC-19 gap) |
| 응답 없는 서버 | 상한에서 abort + '시간이 초과되었습니다' | **미충족** — 타임아웃 상한 없음(EXC-05 gap). 무한 spin |
| 오프라인 | 배너 + write 경고 + 복귀 시 refetch | **미충족**(EXC-11 gap) |
| 화면 이탈 중 요청 | abort, 실패로 세지 않음 | 충족(EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | 충족(EXC-01 상속) |
| **발송완료 회차 편집** | **차단(읽기 전용)** | **미충족** — 편집이 열리고 상태가 초안으로 강등된다(FS-033-EL-032 · BE-033 §7.1). **서버가 422 로 막는 것이 유일한 방어선** |

### 4.3 데이터 보존 · 감사

| 축 | 요구 | 현재 |
|---|---|---|
| 발송 결과 통계 보존 | 수정이 `stats` 를 초기화하지 않는다 | 계약상 충족 — `NewsletterIssueInput` 이 `stats` 를 `Omit`(`types.ts:24-27`). 서버가 보존해야 한다(BE-033 §7.1-4) |
| 회차번호 불변 | 등록 후 회차번호가 바뀌지 않는다 | 계약상 충족 — 입력에 없다. **단 채번이 클라이언트 최대값+1 이라 동시 등록 시 중복 가능**(BE-033 §7.3) |
| 상태 전이 이력 | 누가 언제 예약→발송으로 옮겼는가 | **없음** — 감사 로그 계약이 없다. 발송은 되돌릴 수 없는 대외 행위라 **행위자·시각 기록이 필요하다** → §5 #12 |
| 구독자 수 스냅샷 | 발송 시점의 대상 수를 보존한다 | 부분 충족 — `recipientCount` 가 저장 시점 값으로 남는다. 다만 저장할 때마다 다시 계산된다(발송 후 수정이 막히면 자연히 고정된다 — BE-033 §7.1) |
| 삭제 복구 | 발송완료 회차 삭제 시 통계까지 사라진다 | **미정** — soft-delete 계약 없음. 발송중 회차 삭제는 서버가 막는다(BE-033 EP-05 422) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | ~~IA-13~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `NewsletterListPage.tsx:127` 이 공용 `useListState` 를 소비해 `?status=`·`?q=` 를 URL 이 소유한다(`useListState.ts:87-99,125`). 뒤로가기·새로고침·링크 공유로 복원된다. `useListState` 소비 화면은 이제 **37곳**(마케팅 6화면 전부 포함) | — | **닫힘** |
| 2 | IA-04 | **P0** | Pagination 이 없다 — 필터 결과 전량 렌더. BE-033 EP-01 도 페이징 파라미터가 없다 | 앱 전역(`CrudListShell` 소비 화면 전부) | A11 · A63 |
| 3 | IA-02 | **P0** | **gap 유지 · 사유 전환.** ~~하위 라우트의 branch 라벨('마케팅 관리') 폴백~~은 통합의 `findCoveringLeaf`(`nav-config.ts:260-278,297-299`)로 **해소**됐다 — 상단 h1 이 이제 '뉴스레터' 다. 남은 것: **폼 라우트에 `<h1>` 이 2개**(`AppHeader.tsx:101` + `NewsletterFormPage.tsx:241`)이고, `nav-config.ts:294-296` 이 '등록/수정' 행위를 제목에 넣지 않는 것을 의도로 못 박아 `/new` 와 `/:id/edit` 의 상단 h1 이 동일하다. **목록 라우트는 h1 1개 — 그 축은 pass** | 앱 전역(`AppHeader`·폼 셸) | A11 · A40 |
| 4 | EXC-03 | **P0** | **gap 유지 · 범위 축소.** 쓰기 권한 게이팅 미배선 — 등록·수정·삭제 버튼이 권한 무관하게 렌더. **`useRouteWritePermissions`(`RequirePermission.tsx:45`) 소비처는 0 → 7곳**(products 3 · settings 4)이 됐다. 훅·선례는 완비돼 있고 **`pages/marketing/**` 이 아직 배선되지 않았을 뿐**이다(grep = 0) | **이 섹션**(앱 전역 아님 — 선례 7곳 존재) | A11 · A40 |
| 5 | ~~COMP-10~~ | ~~P0~~ | **해소 (F3b · 2026-07-17)** — `NewsletterListPage.tsx:127` 이 `useListState` 를 통해 `useDebouncedSearch`(`useListState.ts:227-230`)를 소비한다. 조합 중 커밋 금지(`useDebouncedSearch.ts:87`)·250ms 디바운스(`:23,93-95`)·Enter 차단(`:121-124`) 전부 붙었다. **BE-033 §7.5 의 서버 검색이 붙어도 race 표면이 되지 않는다** | — | **닫힘** |
| 6 | A11Y-11 | **P0** | **gap 유지 (2026-07-17 재확인).** 발신자 select 가 `aria-invalid` 만 있고 `aria-describedby` 가 없다(`NewsletterFormPage.tsx:269-288`) — 스크린리더가 '유효하지 않음'만 읽고 '발신자를 선택하세요.'를 못 읽는다. **⚠ F3a 의 `aria-required` 주입과 무관한 축이다** — `FormField.tsx:50-56` 은 `required`→`aria-required` 만 주입하고 `aria-describedby` 는 여전히 호출부 책임이다(`errorIdOf` 노출만 — `:59-66`). 같은 폼의 제목(`:265`)·예약일시(`:368-370`)는 올바르게 배선돼 있고 본문 `TextareaField` 는 내부 배선이다 — **이 select 1건만 빠졌다**. **추가로 `SegmentPicker`(`_shared/SegmentPicker.tsx:109-112`)의 required 마커가 `aria-hidden` `<span>` 이라 AT 에 닿지 않는다** — `FormField` 를 거치지 않아 주입 대상이 아니다(SMS·이메일과 공유하는 결함 — NFR-034 §5 #3) | **이 화면 1줄** + `_shared/SegmentPicker.tsx`(3화면 공유) | A11 |
| 7 | ERP-13 | P1 | **절반 해소.** ~~`을(를)`·`은(는)` 폴백형 출하~~는 **통합에서 닫혔다** — 헬퍼가 `shared/format.ts:306,311` 로 승격되고 `useCrudForm.ts:222`·`useCrudList.tsx:108,158`·`crud/validation.ts:22,25` 가 소비한다(리터럴 grep = 0). **남은 것은 이 화면 고유 비문 2줄** — `NewsletterFormPage.tsx:211` `'뉴스레터 찾을 수 없습니다.'` · `:212` `'뉴스레터 불러오지 못했습니다.'` 에서 목적격 조사가 **아예 빠졌다**. 이 폼이 `FormPageShell`(`:129-130` 이 `objectParticle` 로 옳게 만든다)을 쓰지 않고 Alert 를 자기가 그리면서 생긴 누락이다. **형제 화면은 맞다**(`EmailFormPage.tsx:222-223` · `SmsFormPage.tsx:233-234`) | **이 화면 2줄** | A11 |
| 8 | EXC-19 · EXC-05 · EXC-11 | P1 | 세션 만료 시 작성 중 본문 소실 · 프론트 타임아웃 상한 없음 · 오프라인 감지 없음 | 앱 전역 | A40 · A63 |
| 9 | EXC-10 · EXC-18 | P1 | 일괄 삭제가 실패 id 를 안 준다 · Shift-range/대량 confirm/progress/cancel 없음 | 앱 전역(`useCrudList`) | A11 |
| 10 | EXC-06 | P1 | 403 이 일반 실패 배너로 수렴 — 권한 전용 문구가 없다 | 앱 전역 | A11 |
| 11 | A11Y-13 · IA-03 · IA-08 · IA-10 · IA-12 · IA-14 | P1/P2 | 폼 진입 첫 필드 포커스 없음 · breadcrumb 없음 · footer 가 카드 밖(형제 폼은 카드 안) · 2-col shell 손조립(`* 13`) · `FormPageShell` 미공유 · 반응형 미선언 | 앱 전역(preview form family) | A11 |
| 12 | (quality-bar 밖) | — | **발송 상태 머신이 UI 에 강제되지 않는다** — 발송완료 회차를 열어 저장하면 상태가 초안으로 뒤집힌다. `isEditableSend` 미호출 | **이 화면**(+SMS·이메일 발송) | A11 · A63(BE-033 §7.1) |
| 13 | (quality-bar 밖) | — | 세그먼트·발신자 **엔드포인트 심 없음** + 동기 호출부라 로딩·실패 경로 부재 — 백엔드 연결 시 재구조화 필요 | marketing 전역 | A63(BE-033 §7.6) |
| 14 | ERP-12 · ERP-15 · COMP-09 · COMP-12 | P1/P2 | export 없음 · 대형 목록 계약 없음 · 긴 제목 truncation 없음 · 제목 카운터 없음 | 앱 전역 + 이 화면 | A11 |
| 15 | (quality-bar 밖) | — | 상태 전이 감사 로그 계약 없음(§4.3) — 발송은 되돌릴 수 없는 대외 행위다 | — | A63 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래는 판정을 재현할 때 쓸 스위치이며, 실제 구동 결과가 아니다.

**실패 재현** — `shared/crud/dev.ts` 의 `failIfRequested(scope, op)` 규약. 이 화면의 **scope 는 `marketing-newsletters`**(`data-source.ts:66`), **op 는 `list` · `detail` · `save` · `delete`** 4종(`crud.ts:45` · `:50` · `:61`/`:66` · `:79` — `create`/`update` 가 **같은 `save` op 를 공유**한다).

| 스위치 | 효과 | 이 화면에서 보는 것 |
|---|---|---|
| `?fail=list` · `?fail=marketing-newsletters:list` | 목록 조회를 generic Error 로 실패 | FS-033-EL-010 배너 (STATE-02) |
| `?fail=detail` · `?fail=marketing-newsletters:detail` | 상세 조회 실패 | FS-033-EL-029 '불러오지 못했습니다' 갈래 |
| `?fail=save` · `?fail=marketing-newsletters:save` | 등록·수정 실패(둘 다) | FS-033-EL-015 배너 |
| `?fail=delete` · `?fail=marketing-newsletters:delete` | 삭제 실패 | 다이얼로그 안 배너 (FEEDBACK-02) |
| `?fail=all` | 전 op 실패 | 위 전부 |

**status 재현** — `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능한 코드는 `400·401·403·404·409·412·422·429·500`(`dev.ts` `REPRODUCIBLE`).

| 스위치 | 이 화면에서 보는 것 |
|---|---|
| `?status=save:409` | FS-033-EL-030 충돌 다이얼로그 (EXC-04) |
| `?status=save:422` | FS-033-EL-033 필드 인라인 + 포커스 (EXC-07) |
| `?status=save:500` | 배너 + 복사 가능한 오류 코드 (EXC-20) |
| `?status=detail:404` | FS-033-EL-029 '찾을 수 없습니다'(재시도 버튼 없음) (EXC-12) |
| `?status=list:401` | 전역 인터셉터 → `/login?...&reason=session_expired` (EXC-02) |
| `?status=save:403` | **일반 실패 배너로 수렴** — 권한 전용 문구가 없다(EXC-06 gap 근거) |

**`?delay=` 는 이 화면에 없다.** `shared/crud/dev.ts` 는 이 스위치를 구현하지 않으며(`pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재), 이 화면의 지연은 `LATENCY_MS = 400` **상수 고정**이다. STATE-01 의 skeleton 축은 `?delay=` 없이 **최초 진입(캐시 비어 있음) vs 재조회(캐시 있음)** 를 비교해 판정한다.

**그 밖의 도구**: 조사 폴백형 grep(`을(를)`·`은(는)`·`이(가)`) · `isComposing`/`useDebouncedSearch`/`useListState`/`useRouteWritePermissions` import grep · `document.querySelectorAll('h1').length`(IA-02) · DevTools 로 `aria-describedby` 유무 확인(A11Y-11) · ESLint/stylelint 0 warning(TOKEN-01).

## 7. 자기 점검

- [x] quality-bar 요구 문구를 **재서술하지 않았다** — ID 로만 참조하고 '이 화면에서 어떻게/무엇으로 판정하는가' 만 적었다
- [x] §2 가 **P0 30건 전수**를 지정된 순서로 담았다. 빈칸 0건
- [x] 모든 `pass` 에 코드 근거(파일:라인). 모든 `gap` 에 재현 가능한 측정 기준. 모든 `N/A` 에 사유. 모든 `종속` 에 '이 화면의 어느 표면이 상속하는가'
- [x] §2.1 산수 검산 — 13(pass) + 11(종속) + 2(n-a) + 4(gap) = **30** ✅ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = **30** ✓)
- [x] §3 은 **표면이 실재하는 P1·P2 만** 담았다(존재하지 않는 표면의 요구는 넣지 않았다)
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 의 `?fail=` scope(`marketing-newsletters`)·op 목록(`list`/`detail`/`save`/`delete`)을 **어댑터 코드에서 직접 확인**했다. **`?delay=` 를 쓰지 않았고** 이 화면에 없음을 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §6 머리에 명시했다
- [x] §5 의 gap 이 FS-033 §7 · BE-033 §7.11 과 상호 참조된다
- [x] **브리핑의 사실 주장을 그대로 쓰지 않고 재확인했다** — F2 시점엔 `useListState`/`useDebouncedSearch` 소비자가 `MembersPage`/`MembersToolbar` 2파일뿐이었다. **2026-07-17 재확인 결과 F3b 롤아웃으로 `useListState` 소비 화면이 37곳이 됐고 이 화면(`NewsletterListPage.tsx:127`)도 그중 하나다** — 그래서 COMP-10·IA-13 을 pass 로 뒤집었다
- [x] **2026-07-17 · `HEAD = 4b805ad`(F3a·F3b·통합) 기준으로 30행 전수 재검증했다. F2(`3cd3078`) 판정을 재사용하지 않았다.** 뒤집힌 판정 2건: **COMP-10**(`NewsletterListPage.tsx:127` → `useListState.ts:227-230` → `useDebouncedSearch.ts:87,93-95,121-129`) · **IA-13**(`useListState.ts:87-99,108-129`). **사유가 바뀐 gap 2건**: IA-02(브랜치 폴백 → h1 이중·행위 미반영) · EXC-03(소비자 0 → 7곳 있으나 marketing 미배선). **유지된 gap 2건**: A11Y-11(발신자 select 의 `aria-describedby` 누락 — F3a 의 `aria-required` 주입과 무관한 축임을 코드로 확인) · IA-04. **§3 ERP-13 은 절반만 해소** — 공용 경로의 리터럴 '을(를)' 은 0건이 됐으나 **이 화면 고유 비문 2줄**(`NewsletterFormPage.tsx:211,212`)은 그대로다. **grep 함정 2개를 피했다**: ① `aria-required` 는 `FormField.tsx:50-56` 의 런타임 `cloneElement` 주입이라 앱 소스 grep 으로 판정하지 않았다 ② `useDebouncedSearch` 는 `useListState` 경유 소비라 화면 파일 grep 이 0건이어도 pass 다
