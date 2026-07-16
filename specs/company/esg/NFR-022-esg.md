---
id: NFR-022
title: "ESG 활동 관리 비기능 명세"
functionalSpec: FS-022
backendSpec: BE-022
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-022. ESG 활동 관리 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-022 ESG 활동 관리 (`/company/esg` · `/company/esg/new` · `/company/esg/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` (9차원 100요구 · P0 30건). **이 문서는 그 요구 문구를 재서술하지 않는다** — ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**. 각 요구가 이 화면에서 ① 어떻게 충족되는가(코드 근거) ② 무엇을 재현하면 판정되는가(측정 기준) ③ 판정은 무엇인가 만 기록한다 |
| 함께 읽는 문서 | FS-022(요소·예외) · BE-022(엔드포인트·보안 판정) · `specs/quality-bar.md`(요구 원문) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 판정을 다시 돌린다. 화면 코드가 바뀌면 §2 의 코드 근거(파일:라인)를 갱신한다. **gap 이 해소되면 §5 에서 지우고 §2 를 pass 로 바꾼다** |
| 판정 시점 | 2026-07-17 · HEAD `3cd3078` |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다. **어느 공용 훅을 소비할지 고르는 것도 이 화면의 결정이다**(공용 모듈이 존재한다고 이 화면이 소비하는 것은 아니다 — IA-13 이 그 예다) |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 이 화면이 **`useCrudList` 를 소비한다** — `EsgListPage.tsx:54-59`. 그 훅이 스켈레톤 조건을 `data === undefined` 로 좁힌다: `useCrudList.tsx:71` `const firstLoading = isFetching && data === undefined` · `:72` `const refreshing = isFetching && data !== undefined`. `CrudListShell.tsx:136` 이 `loading={firstLoading}` 만 `CrudTable` 로 흘리고, `CrudTable.tsx:143-169` 가 `loading → 스켈레톤 / items.length === 0 → Empty / else → 행` 3분기로 **정확히 하나만** 그린다. 조회 실패는 그보다 위(`CrudListShell.tsx:113,156`)에서 갈려 겹치지 않는다. `placeholderData: (previous) => previous`(`crud.ts:151`)가 재조회 중 이전 행을 유지한다. **이 화면은 `useCrudList` 를 우회해 자체 `useQuery` 를 쓰지 않는다** — `isFetching` 을 loading 으로 직결하는 화면들(`CustomerFaqPage.tsx:57` 등)과 갈리는 지점이다 | `/company/esg` 진입 → 400ms 동안 5행 스켈레톤만(empty 텍스트·배너 없음). 삭제 성공 → 무효화 재조회(`crud.ts:218-220`) 중 **표가 스켈레톤으로 바뀌지 않고** 요약에 '새로고침 중…' 만 붙는다. 분류를 '지배구조'로 → 1행. `?fail=esg:list` → 배너만 | pass |
| STATE-02 | STATE | 직접 | 조회 실패가 요약·일괄바·표를 대체하는 **인라인 danger Alert + '다시 시도'** 다 — `CrudListShell.tsx:156-165`(`<Alert tone="danger">` + `controller.refetch`). 빈 상태로 폴백하지 않는다(`:113` 이 error 를 먼저 가른다). 에러 토스트 경로가 없다 — 이 화면의 `toast` 호출은 전부 성공/취소다(`useCrudList.tsx:107,145`) | `?fail=esg:list` → 위험 톤 배너 'ESG 활동 목록을 불러오지 못했습니다.' + '다시 시도'. 에러 토스트 0건. '다시 시도' → `refetch()`(`useCrudList.tsx:185`) 재발행 | pass |
| STATE-04 | STATE | 직접 | 두 절반 중 **적용되는 절반이 성립한다**. ① page clamp: **페이지네이션이 없어 out-of-range page 가 성립하지 않는다**(`EsgListPage.tsx` 에 `page` 개념 없음 · `CrudListShell` 에 `Pagination` 없음) — 그 부재 자체는 IA-04 gap 으로 별도 이관한다. ② selection 리셋: `EsgListPage.tsx:62-64` `useEffect(() => { clear(); }, [filter, clear])` 가 분류 변경 시 선택을 전부 해제한다(FS-022-EL-017). 동시 삭제로 행이 사라져도 `toggleAll` 은 **현재 보이는 id 만** 다루므로(`useRowSelection.ts:31-33`) 유령 선택이 생기지 않는다 | '사회'로 좁히고 2건 선택 → '전체' 클릭 → 선택 0건, 일괄바 사라짐. (clamp 는 재현 대상이 존재하지 않는다 — page 파라미터가 없다) | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면의 style object 전부가 `var(--tds-*)` 만 참조한다 — `EsgListPage.tsx:25-46`(`layoutStyle`·`toolbarStyle`·`summaryCellStyle`) · `EsgFormPage.tsx:29-33`(`rowStyle`). `EsgCategoryFilter.tsx` 는 style object 를 **선언조차 하지 않는다**(전부 공유 스타일 import — `:5-12`). hex 0건 · px 리터럴 0건 · border 키워드 0건. 파생 치수는 `calc(var(--tds-space-6) * n)`(`EsgListPage.tsx:27,42` · `EsgFormPage.tsx:31`) | `apps/admin/src/pages/company/esg/**` grep: `#[0-9a-f]{3,6}` = 0 · `[1-9]px` = 0 · `(outline\|border):\s*(thin\|medium\|thick)` = 0. `shared/token-guard.test.ts` 통과. ESLint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 표면: 분류 필터 버튼(`EsgCategoryFilter.tsx:40` `className="tds-ui-listitem tds-ui-focusable"`) · 폼 입력(`EsgFormPage.tsx:122,136` `tds-ui-input tds-ui-focusable`) · DS `Button`/`SelectField`/`RowActions`/체크박스. focus ring 두께·색을 이 화면이 선언하지 않는다 | DS/`ui.css` 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-03 | TOKEN | 상속 | 표면: 삭제/충돌/이탈 ConfirmDialog 의 entrance easing · 성공 토스트. **이 화면 자체에 animation/transition 선언이 0건** | ToastProvider/Modal 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 표면: 폼 `Card`(`FormPageShell.tsx:164`) · 삭제/충돌 Modal · 토스트 · `StatusBadge`. `box-shadow` 를 이 화면이 선언하지 않는다(grep 0건) | DS Card/Modal/Toast 소유 문서의 판정을 따른다 | 종속 |
| TOKEN-05 | TOKEN | 상속 | 표면: 폼의 `<h1>` — `FormPageShell.tsx:159` `<h1 style={pageTitleStyle}>` → `styles.ts:51-61` 이 `--tds-typography-title-xl-*` 를 소비(`:158` 주석이 TOKEN-05 를 명시). AppHeader 의 `<h1>` 도 같은 토큰(`AppHeader.tsx:52-55`). ⚠ **그 둘이 동시에 뜨는 것**은 TOKEN 이 아니라 IA-02 의 문제다 | AppHeader/styles.ts 소유 문서의 판정을 따른다 | 종속 |
| COMP-10 | COMP | N/A | 표면 없음 — **이 화면에 text-search/filter 입력이 없다.** 툴바는 '등록' 버튼 하나뿐이고(`EsgListPage.tsx:85-92`) 좌측 필터는 **버튼 4개**다(`EsgCategoryFilter.tsx:38-52` — `<button type="button">`). 텍스트 입력이 없으므로 IME 조합(`isComposing`)·debounce·최소 query 길이·stale 응답 경합이 성립할 표면이 0개다. 폼의 제목/내용 입력은 **저장 대상이지 query 를 발행하는 검색 입력이 아니다**(`EsgFormPage.tsx:132-159` — 어떤 조회도 트리거하지 않는다). ⚠ 검색 입력이 **추가되면** 그때 `useDebouncedSearch`(`shared/crud/useDebouncedSearch.ts` — 8파일이 소비 중)를 소비해야 하며, 그 시점에 이 행은 `직접`으로 바뀐다 | — | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 이 화면이 파괴적 액션(삭제·일괄삭제)을 **`useCrudList` 의 ConfirmDialog 로 게이트한다** — `EsgListPage.tsx:54` → `useCrudList.tsx:151-178`. intent: `intent="delete"`(`:155,168`) · **busy 잠금**: `busy={deleting}`/`busy={bulkDeleting}`(`:159,172`) · **실패 시 다이얼로그 유지 + 안 배너**: `error={deleteError}`(`:160`)를 `onError`(`:109-112`)가 세우고 다이얼로그를 닫지 않는다, 재클릭이 retry · **cancel/Esc/dim → abort + 리셋**: `closeDelete`(`:86-92`)가 `abort()` + `deleteItem.reset()` + 에러/대상 초기화. 폼의 discard 가드도 같은 계약(`useUnsavedChangesDialog.tsx:212-221` `intent="discard"`). 부분 실패 경로도 다이얼로그를 유지한다(`useCrudList.tsx:136-141`) | `?fail=esg:delete` → 행 삭제 확인 → **다이얼로그가 열린 채** '삭제하지 못했습니다…' 배너, 확인 재클릭 = retry. 삭제 진행 중(400ms) Esc → 토스트·배너 없이 닫히고 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | 이 화면이 가드를 **실제로 배선한다** — `EsgFormPage.tsx:96` `isDirty={isDirty}`(← `useCrudForm.ts:254` `form.formState.isDirty`) → `FormPageShell.tsx:113` `useUnsavedChangesDialog(isDirty && !saving, { message: unsavedMessage })`. 훅이 3경로를 모두 덮는다(`useUnsavedChangesDialog.tsx:120-131` unload · `:134-155` 링크 capture · `:157-182` popstate sentinel). 저장 성공 시 `navigate(listPath, { replace: true })`(`useCrudForm.ts:216`) 전에 가드가 `dirtyRef` 를 내리지는 않지만, **성공 이동은 `<a>` 클릭이 아니라 프로그램적 navigate 라 가로채기 대상이 아니다** — 프롬프트 없이 통과한다. ⚠ 같은 이유로 '취소'·'목록으로' 버튼도 가로채지 못한다(FS-022 §7 #7) — quality-bar 가 열거한 3경로 밖이며 'self-initiated navigation 에서는 가드를 해제한다' 는 단서에 걸리므로 **이 요구의 판정은 pass**, 그 위험은 §3 IA-08 인접 항목·§5 #10 으로 이관 | 제목을 고친 뒤 ① 탭 닫기 → 브라우저 confirm ② 사이드바 '연혁' 클릭 → discard 다이얼로그 ③ 브라우저 Back → discard 다이얼로그. 저장 성공 후 동일 3동작 → 프롬프트 없음 | pass |
| FEEDBACK-06 | FEEDBACK | N/A | 표면 없음 — **이 화면에 편집 가능한 폼을 담은 modal 이 없다.** ESG 는 IA-06 의 무게 규칙상 **rich 엔티티 → 전용 form route** 를 쓴다(`App.tsx:193-194` — `/new`·`/:id/edit`). 이 화면의 modal 3종(삭제 확인 · 충돌 · discard 가드)은 전부 입력 필드가 0개이며 FEEDBACK-06 의 appliesTo(`폼을 담은 모든 modal` — CreateGroupModal·ProductCategoryFormModal 등 taxonomy 엔티티 편집 모달)에 해당하지 않는다. 폼 이탈 보호는 FEEDBACK-04 가 덮는다 | — | n-a |
| A11Y-01 | A11Y | 상속 | 표면: 삭제 성공 토스트(`useCrudList.tsx:107,145`) · 저장 성공 토스트(`useCrudForm.ts:215`) · 취소 토스트(`ConfirmDialog.tsx:39`). 지속 live region viewport 는 `ToastProvider` 의 것이다. (이 화면은 **목록 상태용 live region 을 별도로** 갖는다 — `CrudListShell.tsx:107-109`, 그것은 A11Y-16 소관) | ToastProvider 소유 문서의 판정을 따른다 | 종속 |
| A11Y-02 | A11Y | 상속 | 표면: 삭제·일괄삭제·충돌·discard 다이얼로그 4종. `aria-describedby`(본문 message) 배선은 DS 의 것이다 — `packages/ui/src/organisms/ConfirmDialog/ConfirmDialog.tsx:129` → `Modal.tsx:158` `aria-describedby={describedBy}` | DS ConfirmDialog/Modal 소유 문서의 판정을 따른다 | 종속 |
| A11Y-11 | A11Y | 직접 | **세 계약 중 둘만 성립한다.** ① `aria-invalid` ↔ `aria-describedby` 쌍 ✅: `category`·`date`·`title` 은 호출부가 명시 배선(`EsgFormPage.tsx:106-107` · `125-126` · `141-142`), `summary` 는 DS 가 자동 배선(`TextareaField.tsx:62-63`), `imageUrls` 는 DS 가 자동 배선(`ImageGalleryField.tsx:183,296`) — 짝 없는 `aria-invalid` 0건. ② hint 연결 ✅: hint 를 가진 필드는 `imageUrls` 하나이며 DS 가 `describedBy = invalid ? errorIdOf : hint ? hintIdOf : undefined`(`ImageGalleryField.tsx:183`)로 valid 일 때 hint 를 물린다. `category`·`date`·`title` 은 hint 가 없어 해당 없음. ③ **required 미노출** ❌: `category`·`date`·`title`·`summary` 4필드가 필수인데(`EsgFormPage.tsx:101,118,132,149` `required`) **`<select>`/`<input>`/`<textarea>` 어디에도 `required`/`aria-required` 가 없다** — `FormField.tsx:58-62` 의 `*` 마커는 `aria-hidden="true"` 이고 `TextareaField.tsx:47-51` 도 `required` 를 FormField 로만 넘긴다. **스크린리더에 필수 여부가 닿는 경로가 0개**다 | RTL: `getByLabelText('제목')` 에 `required`·`aria-required` 둘 다 없음. (①②는 통과: 빈 제목 제출 → `aria-describedby="esg-title-error"` === `role="alert"` `<p>` 의 id) | **gap** |
| A11Y-12 | A11Y | 직접 | **`aria-pressed` 단일 규약을 지킨다** — `EsgCategoryFilter.tsx:47` `aria-pressed={active}`. `aria-current` 를 쓰지 않으며, 앱 전체에서도 `apps/admin/src` 의 `aria-current` **사용 0건**(잔여 매치는 `a11y-guard.test.ts` 의 검사 코드·주석과 `ui.css:77` 의 `.tds-ui-page[aria-current='page']` — 후자는 **@tds/ui Pagination 의 진짜 navigation** 이라 정당하다). `filterItemStyle(active)`(`styles.ts:266`)을 쓰는 4버튼 전부가 `aria-pressed` 다. **`EsgCategoryFilter.tsx:42-46` 의 주석이 과거 `aria-current` 였던 사실과 두 가지 피해(① boolean 이 'true' 로 직렬화돼 toggle 이 아니라 '현재 항목'으로 announce ② 공유 hover 규칙 `.tds-ui-listitem[aria-pressed='false']` 를 비껴가 미선택 항목에 hover 표시가 없던 시각 버그)를 기록해 회귀를 막는다.** 회귀 가드가 테스트로도 고정돼 있다(`a11y-guard.test.ts:82`) | grep `apps/admin/src` (주석·테스트 제외): `aria-current` = 0건. RTL: '환경' 버튼 클릭 → `getByRole('button', { name: /환경/ })` 의 `aria-pressed === 'true'`, 나머지 3개는 `'false'`. `a11y-guard.test.ts` 통과 | **pass** |
| MOTION-01 | MOTION | 상속 | 표면: 삭제·일괄삭제·충돌·discard Modal 의 enter/exit. 이 화면은 소비만 한다 | DS Modal 소유 문서의 판정을 따른다 | 종속 |
| MOTION-02 | MOTION | 상속 | 표면: 삭제·저장·취소 토스트의 exit. 이 화면은 `toast.*` 를 호출만 한다 | ToastProvider 소유 문서의 판정을 따른다 | 종속 |
| MOTION-03 | MOTION | 상속 | 표면: 위 Modal·Toast 의 reduced-motion 게이트. **이 화면 자체에 transition/transform 선언이 0건**(ToggleSwitch 도 없다). 행 추가/삭제 FLIP 도 없다(MOTION-04 P1 — `CrudTable` 소관) | 전역 Motion config/DS 소유 문서의 판정을 따른다 | 종속 |
| IA-01 | IA | 직접 | 세 라우트 전부 AppShell 레이아웃 라우트 **안에** 있다 — `App.tsx:192-194`(`/company/esg` · `/company/esg/new` · `/company/esg/:id/edit`)가 `APP_ROUTES` 에 있고 `:334-336` 이 그것을 `RequireAuth > AppShell`(`:324-330`) 하위에 렌더한다. 세 화면 모두 자체 sidebar/top bar/outer frame 을 도입하지 않는다 — 최상위가 `EsgListPage` 의 2열 grid(`:95`)와 `FormPageShell` 의 flex column(`:146`)뿐이다. **좌측 분류 필터는 화면 안의 필터 패널이지 앱 nav 가 아니다**(`EsgCategoryFilter.tsx:31` `<nav aria-label="ESG 분류 필터">` — 자체 라벨을 가진 보조 nav 이며 AppShell 의 '주 내비게이션'을 대체하지 않는다) | 세 경로 진입 → 사이드바 1개 · AppHeader 1개 · padded `<main>` 1개. `pages/company/esg/**` grep: `<aside`/`<header>` = 0 | pass |
| IA-02 | IA | 직접 | **하위 라우트가 branch 라벨로 폴백하고, 폼에 `<h1>` 이 2개다.** `/company/esg` 는 nav leaf 라(`nav-config.ts:128`) AppHeader 가 'ESG' 를 옳게 보인다. **그러나 `/company/esg/new`·`/company/esg/:id/edit` 는 leaf 가 아니다** → `findNavLabel`(`nav-config.ts:253-264`)의 exact 매치(`:254`)가 실패하고 branch 폴백(`:257-262` `pathname.startsWith('/company')`)이 **'기업 관리'** 를 돌려준다 → `AppHeader.tsx:92,101` 이 `<h1>기업 관리</h1>` 를 그린다. 동시에 `FormPageShell.tsx:159` 가 `<h1>ESG 활동 등록</h1>` 를 그린다 — **한 화면에 `<h1>` 2개, 상위 것이 화면을 지목하지 못한다**(quality-bar 의 `/content/notices/new` 예시와 정확히 같은 결함). 게다가 **title 소스가 화면 타입마다 다르다**: 목록은 AppHeader 만('ESG', in-content 제목 없음), 폼은 AppHeader + in-content h1 둘 다. F2 가 `AppHeader.tsx` 를 수정했으나(+15줄) 그 변경은 `titleStyle` 을 `pageTitleStyle` 로 바꾼 TOKEN-05 건이고 **`findNavLabel` 폴백은 그대로다** | `/company/esg/new` 진입 → 화면 상단 title = **'기업 관리'**(기대: 'ESG 활동 등록'). `document.querySelectorAll('h1').length === 2`, `[0].textContent === '기업 관리'`. `/company/esg` → h1 1개('ESG'), 본문에 제목 없음 | **gap** |
| IA-04 | IA | 직접 | **템플릿 4/5 를 지키나 Pagination 이 없다.** ✅ toolbar 우상단 primary 등록 버튼(`EsgListPage.tsx:85-92` — `justifyContent: 'flex-end'` + `variant="primary"`) · ✅ 결과 count 요약(`CrudListShell.tsx:118-122` '전체 N건') · ✅ SelectionBar(`:125-133`, bulk action 존재) · ✅ table(`:135-154`). ❌ **Pagination 이 어디에도 없다** — `CrudListShell.tsx` 전체에 `Pagination` import 가 없고 `EsgListPage` 에 `page` 개념이 없다. 어댑터가 전량을 돌려주고(`crud.ts:43-47` `fetchAll` — 쿼리 파라미터 없음) `EsgListPage.tsx:67` 의 `visible` 전량이 DOM 에 그려진다. **page size 상한도 서버 페이징도 없어** ESG 활동이 쌓이는 만큼 한 화면에 전량이 누적된다 — quality-bar 가 요구하는 'page size 초과 가능 시 Pagination' 의 전제(page size)조차 없다. ⚠ 이는 `CrudListShell` 을 쓰는 목록 전체(연혁·인증서·ESG)의 공통 결손이다. 부수 피해: '전체 선택'이 전량을 고르고(EXC-18 P1) 일괄 DELETE 가 레이트리밋에 걸린다(BE-022 §7.1) | 시드 4건은 문제없이 보인다. `ESG_SEED`(`data-source.ts:8-44`)에 100건을 넣고 진입 → **100행이 전부 DOM 에**, 페이지네이션 0개. grep `pages/company/esg/**` + `shared/crud/CrudListShell.tsx`: `Pagination` = 0건 | **gap** |
| IA-05 | IA | 직접 | create·edit 가 **하나의 컴포넌트/route 쌍**이다 — `App.tsx:193-194` 가 `/company/esg/new` 와 `/company/esg/:id/edit` 를 **같은 `<EsgFormPage />`** 로 해석한다. 갈리는 지점은 `:id` 하나다: `useCrudForm.ts:73-74` `const { id } = useParams(); const isEdit = id !== undefined`. 레이아웃은 동일하고 **title 과 prefill 만 다르다** — `FormPageShell.tsx:159` `{isEdit ? 'ESG 활동 수정' : 'ESG 활동 등록'}` · `:189` `{saving ? '저장 중…' : isEdit ? '저장' : '등록'}` · prefill 은 `useCrudForm.ts:125-128` 의 `reset(toValues(loaded))`(등록 모드는 `enabled: id !== ''`(`crud.ts:163`)로 상세 조회 자체를 하지 않는다). create 전용/edit 전용 page 가 없다 | `/company/esg/new` → 'ESG 활동 등록' + 빈 폼(분류 기본값 '환경'). `/company/esg/esg-1/edit` → 'ESG 활동 수정' + 채워진 폼. 두 경로의 DOM 구조 동일. grep: `EsgFormPage` import 위치 = `App.tsx:61` 1곳, 사용 2곳 | pass |
| IA-13 | IA | 직접 | **list state 가 URL 에 없다.** 분류 필터가 컴포넌트 `useState` 에만 산다 — `EsgListPage.tsx:52` `const [filter, setFilter] = useState<EsgFilter>(ESG_FILTER_ALL)`. **`useListState`(`shared/crud/useListState.ts` — 실소비자는 `members/**` 뿐)도 `useSearchParams` 도 이 화면이 소비하지 않는다**(`pages/company/**` 전체 grep 0건). 그 결과: ① '사회'로 좁혀 행을 열고 → 수정 폼 → '목록으로' → **'전체'로 초기화**(컴포넌트가 언마운트됐으므로) ② F5 → 초기화 ③ 필터가 걸린 view 의 URL 을 복사해 동료에게 보낼 수 없다 — 세 URL 모두 `/company/esg` 로 같다. quality-bar IA-13 근거가 지목하는 '핵심 운영 루프'가 그대로 깨진다. (page·keyword·sort 축은 이 화면에 존재하지 않으므로 URL 대상은 `category` 하나뿐이다 — **그 하나가 없다**) | '지배구조' 클릭 → URL 이 `/company/esg` 그대로(기대: `?category=governance`). 행 클릭 → 수정 폼 → 브라우저 Back → **'전체'** 로 되돌아온다. F5 → '전체'. grep `pages/company/esg/**`: `useListState\|useSearchParams` = 0건 | **gap** |
| EXC-01 | EXC | 상속 | 표면: 이 세 라우트의 render 예외. `AppShell.tsx:484-493` 의 `<ErrorBoundary resetKey={pathname}>` 가 `<Outlet>` 을 감싸므로 화면이 던져도 사이드바·헤더가 살아남고 **다른 메뉴로 이동하는 것만으로 경계가 풀린다**(`resetKey`). `App.tsx:311-315` 의 루트 경계가 셸 자체의 예외를 받는다. 이 화면은 자체 경계를 두지 않는다(소비자) | AppShell/App 소유 문서의 판정을 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 표면: (a) 세션 없이 `/company/esg/esg-1/edit` deep-link → `App.tsx:324-330` 의 `RequireAuth` 가 **AppShell 바깥**에서 `/login?returnUrl=/company/esg/esg-1/edit` 로 보낸다(`RequireAuth.tsx:66-68`, **쿼리까지 보존** — `:20-22`). (b) 조회·쓰기의 401 → `queryClient.ts:41-43` 의 QueryCache/MutationCache `onError` → `notifySessionExpired()` → `RequireAuth.tsx:43-51` 이 세션 폐기 + `reason=session_expired`. **이 화면은 두 경로 모두에 자기 코드를 갖지 않는다** | RequireAuth/queryClient 소유 문서의 판정을 따른다. ⚠ 재로그인 후 **편집 중이던 폼 입력은 복원되지 않는다** — EXC-19(P1) 소관, §3 참조 | 종속 |
| EXC-03 | EXC | 직접 | **읽기 게이팅은 성립하나 쓰기 게이팅이 전무하다.** ① read ✅: `AppShell.tsx:490` `<RequirePermission>` 이 `<Outlet>` 을 감싸 read 권한이 없으면 `ForbiddenScreen` 을 그린다(`RequirePermission.tsx:61-64`). 리소스는 `route-resource.ts:36-46` 이 경로에서 파생하므로 **`/company/esg/new`·`/:id/edit` 같은 비-leaf 라우트도 덮인다**(`:26-28` 이 세그먼트 경계로 감싸는 가장 구체적인 잎을 찾는다). ② **write ❌**: 쓰기 컨트롤 **전부**가 `can(resource, action)` 을 보지 않는다 — 'ESG 활동 등록'(`EsgListPage.tsx:87`) · 일괄 삭제(`CrudListShell.tsx:126-132`) · 행 수정/삭제(`CrudTable.tsx:192-197`) · 폼 저장(`FormPageShell.tsx:188`). `useRouteWritePermissions`(`RequirePermission.tsx:45-52`)가 존재하지만 **`apps/admin/src/pages/**` 전체에서 소비자 0건**(grep: `useRouteWritePermissions\|canCreate\|canUpdate\|canRemove\|canExport` = 0). ③ **강등 reconcile ❌**: 버튼이 애초에 권한을 구독하지 않으므로 강등해도 사라지지 않는다 | 권한 스토어에서 `company-esg` 의 `remove` 를 끈 역할로 진입 → **행 삭제·일괄 삭제 버튼이 그대로 보이고 눌린다**(기대: 미렌더 또는 disable). `read` 를 끄면 403 화면(이쪽은 통과). grep: `pages/**` 에서 `useRouteWritePermissions` = 0건 | **gap** |
| EXC-04 | EXC | 직접 | **acceptanceCheck 두 항목이 모두 성립한다.** ① stale write → 충돌 다이얼로그 + 입력 보존 + 성공 토스트·이동 없음 ✅: `useCrudForm.ts:158-172` 가 `isConflict(cause)`(409·412 — `http-error.ts:105-107`)를 잡아 `ConflictState` 를 세우고 **`setServerError` 도 `toast.success` 도 `navigate` 도 하지 않는다**(early `return`). `FormPageShell.tsx:195` `<FormConflictDialog conflict={conflict} />` → `FormFeedback.tsx:58-74` 가 **폼을 언마운트하지 않고 위에 뜨므로 입력이 그 자리에 살아 있다**(`:52-53` 주석). '최신 내용 불러오기'(danger)가 파괴적 선택이고 '이어서 편집'이 취소 자리라 초기 포커스가 덜 파괴적인 쪽에 간다(`:56`), 취소 토스트도 억제한다(`:72`). ② 이미 제거된 record 편집 → ghost 'saved' 대신 conflict ✅: `crud.ts:71-74` 가 `update` 에서 없는 id 에 **409 를 던진다**(`:68-70` 주석이 과거 `map` 이 조용히 통과시켜 유령 저장이 났던 사실을 기록). `remove` 도 같다(`:82-85`). ⚠ **토큰(`If-Match`/`version`) 전송은 성립하지 않는다** — `EsgItem` 에 `updatedAt`/`version` 이 없고(`types.ts:6-15`) `pages/company/**` 에 `If-Match` 0건이라 **동시 '수정' 충돌은 여전히 마지막 쓰기 승리**다. 다만 요구의 appliesTo 가 '엔티티에 updatedAt 존재' 를 단서로 달고 있고 이 엔티티에는 없으므로, **관측 가능한 acceptanceCheck 기준으로 pass** 로 판정하고 토큰 도입을 BE-022 §7.8 · §5 로 이관한다 | `/company/esg/esg-1/edit?status=save:409` → 제목을 고치고 저장 → **충돌 다이얼로그**('다른 사용자가 먼저 변경했습니다'), 입력 유지, 성공 토스트 0건, URL 그대로. '이어서 편집' → 다이얼로그만 닫히고 입력 그대로. `?status=save:412` → 동일. (`?status=save:500` → 충돌 아닌 generic 배너 — 분기 확인) | pass |
| EXC-08 | EXC | 직접 | 이 화면이 **`useCrudForm` 을 소비한다** — `EsgFormPage.tsx:48-69`. 그 훅이 세 겹을 모두 갖춘다: ① **동기 잠금** `useCrudForm.ts:102` `const submitLockRef = useRef(false)` → `:195-196` `if (submitLockRef.current) return; submitLockRef.current = true;` 가 **RHF 비동기 검증 뒤 `disabled` 가 켜지기 전의 틈**을 닫는다(`:94-101` 주석이 그 틈을 명시). `onSettled`(`:207-209`)가 잠금을 풀고 `onInvalid`(`:239-241`)도 푼다 ② **`disabled`** `FormPageShell.tsx:188` `disabled={saving \|\| loadingDetail}` ③ **제출 시도 단위 멱등키** `:112-117` `idempotencyKeyRef` 를 **mutationFn 밖**(ref)에서 만들어 재시도가 같은 키를 재사용하고, 성공하면 폐기해 다음 제출이 새 거래가 된다(`:214`). ⚠ 키가 **어댑터로 전달되지는 않는다**(`CrudAdapter.create/update` 시그니처에 자리가 없다 — BE-022 §7.10) — 그러나 요구의 acceptanceCheck 는 '키가 mutationFn 밖에 존재' 이며 그것은 성립한다. 전달 배선은 BE-022 §7.10 · §5 로 이관 | 제목을 고치고 저장 버튼에 포커스 → Enter 를 빠르게 2회 → `esgAdapter.create/update` 가 **1회만** 호출된다. `?fail=esg:save` 로 실패 후 재클릭 → 같은 `Idempotency-Key`(현재는 생성만 되고 미전송) | pass |
| EXC-09 | EXC | 직접 | 세 경로 모두 단일 공유 predicate `isAbort`(`async.ts:40-42`)를 쓴다. ① **폼 저장**: `useCrudForm.ts:154-155` `if (isAbort(cause)) return;` — 배너·토스트 없음. 성공 콜백도 `:212` `if (controller.signal.aborted) return;` 로 **abort 후 도착한 성공을 무시**한다(유령 토스트·이동 방지). 언마운트 abort 는 `:92`. ② **단건 삭제**: `useCrudList.tsx:110` `if (isAbort(cause)) return;`, `closeDelete`(`:86-92`)가 `abort()` + **`deleteItem.reset()`**(isPending 리셋) + 에러 초기화. `closeBulk`(`:117-123`)도 동일. ③ **일괄 삭제 건수에서 abort 제외**: `bulk.ts:20` `results.filter(r => r.status === 'rejected' && !isAbort(r.reason)).length` — 취소된 항목이 실패로 세어지지 않는다. `useCrudBulkDelete` 도 `signal.aborted` 면 무효화를 건너뛴다(`crud.ts:237-240`) | 저장 중(400ms) 사이드바로 이탈 → 에러 토스트·배너 0건. 삭제 확인 후 400ms 안에 Esc → 토스트 없이 닫히고 버튼 상태 복원. 일괄 삭제 중 다이얼로그 닫기 → 'N건 중 M건 실패' 가 뜨지 않는다 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| pass | **12** | STATE-01 · STATE-02 · STATE-04 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · A11Y-12 · IA-01 · IA-05 · EXC-04 · EXC-08 · EXC-09 |
| 종속 | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| n-a | **2** | COMP-10 · FEEDBACK-06 |
| gap | **5** | A11Y-11 · IA-02 · IA-04 · IA-13 · EXC-03 |

**합계 검산: 12 + 11 + 2 + 5 = 30 ✓** (quality-bar P0 총계 30건과 일치)

> ⚠ **P0 gap 5건** — quality-bar §How to use 는 'P0 하나라도 미충족이면 배치 실패' 로 규정한다. 범위: **IA-13 은 이 화면 고유**(`useListState` 가 존재하는데 소비하지 않는다 — 가장 값싸게 닫히는 gap). **IA-02 · IA-04 · EXC-03 · A11Y-11 은 앱 전역/공용 프레임워크 결손**이다. 상세는 §5 참조.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | 완전 충족 — `placeholderData: (previous) => previous`(`crud.ts:151`) + `refreshing = isFetching && data !== undefined`(`useCrudList.tsx:72`) + **가벼운 인디케이터**(`CrudListShell.tsx:118-121` `aria-busy={refreshing}` + ' · 새로고침 중…'). `staleTime: 30_000`(`queryClient.ts:24,47`)이 재조회 시점을 지배하고 `refetchOnWindowFocus: false`(`:67`) | 삭제 성공 → 재조회 400ms 동안 이전 행 유지 + '새로고침 중…'. 30초 내 재진입 → network 요청 0건 | pass |
| STATE-05 | P1 | `Empty`(@tds/ui)에 맥락을 넘긴다 — `EsgListPage.tsx:104-107` `empty={{ hasActiveFilters: filter !== ESG_FILTER_ALL, onResetFilters: () => setFilter(ESG_FILTER_ALL) }}` → `CrudTable.tsx:156-167` → `Empty.tsx:53-56,94-98`. 필터 0건 → '필터에 맞는 ESG 활동이 없습니다' + '필터 초기화'. 진짜 0건 → '등록된 ESG 활동이 없습니다'. 조사(이/가)는 `subjectParticle`(`Empty.tsx:68`)이 자동 선택. ⚠ **`createAction`(생성 CTA)을 넘기지 않아** 진짜 0건일 때 등록 CTA 가 빈 상태에 없다(우상단 버튼만 있다). 검색 축이 없어 `hasQuery` 는 해당 없음 | '지배구조' + 시드 삭제 → '필터에 맞는…' + '필터 초기화'. 전량 삭제 → '등록된 ESG 활동이 없습니다'(CTA 없음) | 부분 pass |
| STATE-06 | P1 | 정확한 무효화 — 등록/삭제는 목록 키만(`crud.ts:179-181,218-220`), 수정은 목록+그 상세 키만(`:198-201`). 일괄 삭제는 **전원 성공일 때만**(`:237-240`). 다른 도메인 캐시를 건드리지 않는다 | 수정 저장 → 목록의 그 행이 새 값. 다른 화면 캐시 무효화 0건 | pass |
| COMP-02 | P1 | `RowSelectCell`/`SelectAllHeaderCell`/`SeqCell`/`SeqHeaderCell` 사용(`CrudTable.tsx:124-130,173-179`). raw checkbox 0건 | grep `pages/company/esg/**` + `CrudTable.tsx`: `type="checkbox"` = 0 | 종속 (pass) |
| COMP-04 | P1 | 필수 4필드가 `FormField required`/`TextareaField required`(`EsgFormPage.tsx:101,118,132,149`)로 `*` 마커를 렌더한다. bare `<label>` 0건 | 분류·일자·제목·내용 라벨 옆 `*` 존재 | pass |
| COMP-05 | P2 | **공유 스타일을 import 한다** — `EsgCategoryFilter.tsx:5-12` 가 `filterPanelStyle`·`filterNavStyle`·`filterListStyle`·`filterHeadingStyle`·`filterItemStyle`·`badgeStyle` 을 전부 `shared/ui` 에서 가져온다. **로컬 `CSSProperties` 선언이 0건**(파일 전체에 style object 정의가 없다). quality-bar 가 `(ESG는 이미 공유 사용)` 이라 적은 그대로다 | grep `EsgCategoryFilter.tsx`: `CSSProperties` = 0 · `gap: 'var(--tds-space-5)'` 로컬 선언 = 0. `filterPanelStyle`/`filterNavStyle` import 존재 | **pass** |
| COMP-06 | P2 | 스켈레톤이 `length: 5` 하드코딩 — `CrudTable.tsx:144`. 페이지 크기 개념이 없어 'row = PAGE_SIZE' 를 만족시킬 기준조차 없다(IA-04 gap 과 같은 뿌리). cell 수는 `totalCols`(`:113`)로 실제 컬럼에서 파생 ✅ | grep `CrudTable.tsx`: `length: 5` 존재 | gap (공유) |
| COMP-07 | P2 | `SeqCell seq={index + 1}`(`CrudTable.tsx:179`) — startIndex 보정 없음. **페이지네이션이 없어 현재는 무해하나**, IA-04 를 닫으면 즉시 결함이 된다 | (페이지 2가 존재하지 않아 재현 불가) | 유예 (IA-04 종속) |
| COMP-08 | P2 | 인라인 편집 테이블이라 `RowActions`(pencil/trash) — 규칙 (b) 준수. 중복 '상세' 버튼 없음(상세 화면 자체가 없다) | 행 액션 = 수정·삭제 2개, ActionMenu 아님 | 종속 (pass) |
| COMP-09 | P2 | 내용 열은 ellipsis(`EsgListPage.tsx:40-46` `summaryCellStyle` — `overflow: hidden` + `textOverflow: ellipsis` + `whiteSpace: nowrap` + `maxWidth`) ✅. **그러나 hover/expand 로 전문을 보는 수단이 없다** ❌. **제목 열은 truncate 자체가 없어**(`:80` `render: (item) => item.title`) 120자 제목이 열을 민다 | 120자 제목 등록 → 표 폭이 밀린다. 긴 내용 → ellipsis 되나 hover 시 전문 미표시 | gap |
| COMP-12 | P2 | 제목(120자)·내용(1000자)에 **실시간 카운터 없음** — `FormField`(`FormField.tsx:46,66`)와 `TextareaField` 가 `counter` 를 지원하나 `EsgFormPage` 가 넘기지 않는다. `maxLength` 가 상한에서 조용히 입력을 멈춘다 | 내용에 1000자 입력 → 예고·카운터 없이 멈춤 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 준수: write 성공 → 토스트(`useCrudList.tsx:107,145` · `useCrudForm.ts:215`) · read 실패 → 인라인 Alert(`CrudListShell.tsx:157`) · **다이얼로그 내부 실패 → 그 다이얼로그의 error 배너**(`useCrudList.tsx:160,173` — 모달 뒤에 숨는 토스트를 쓰지 않는다). page 가 임의 배너 state 를 갖지 않는다(전부 공용 셸 소유). ⚠ 폼 저장 실패가 toast 가 아니라 배너인 것은 FAQ FS-010-EL-025 와 같은 의도된 이탈(폼 실패는 그 폼 자리에 남아야 한다) | `?fail=esg:delete` → 다이얼로그 안 배너(토스트 아님). `?fail=esg:list` → 인라인 Alert | pass |
| FEEDBACK-03 | P1 | 등록·수정·삭제·일괄삭제 전부 성공·실패 경로 배선(`useCrudForm.ts:222,229` · `useCrudList.tsx:104-113,135-148`). no-op 없음. ⚠ **일괄 삭제에 `onError` 가 없다**(`useCrudList.tsx:132-148` — `onSuccess` 만) — `settleAll` 이 절대 reject 하지 않으므로(`bulk.ts:19` allSettled) 실무상 도달 불가하나 계약으로 고정돼 있지 않다 | `?fail=all` → 모든 mutation 이 가시 실패 | pass |
| FEEDBACK-05 | P2 | 모든 삭제가 delete-intent ConfirmDialog 를 거친다(`useCrudList.tsx:153-176`). undo window 는 없다 — 단일 미확인 클릭 delete 0건이므로 요구의 '또는' 조건 충족 | 행 삭제 → 항상 확인 다이얼로그 | pass |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스 = Cancel. DS 소유(`FormFeedback.tsx:56` 주석이 이 계약에 의존) | DS ConfirmDialog 소유 문서 | 종속 |
| A11Y-04 | P1 | confirm disable 후 포커스 유지. `busy={deleting}`(`useCrudList.tsx:159`)이 그 경로를 만든다 | DS ConfirmDialog 소유 문서 | 종속 |
| A11Y-05 | P1 | `SelectField isInvalid` → `aria-invalid`. 이 화면이 **명시적으로도** 넘긴다 — `EsgFormPage.tsx:104-107` `isInvalid={...}` + `aria-invalid={...}` + `aria-describedby={...}`(caller 가 error 를 연결) | RTL: 분류 select 의 `aria-invalid`/`aria-describedby` | 종속 (pass) |
| A11Y-06 | P1 | skip link 는 AppShell 의 것(`AppShell.tsx:289-306,429`) | AppShell 소유 문서 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 + polite announce(`AppShell.tsx:324-340`). ⚠ **announce 라벨이 `findNavLabel(pathname)`(`:475`)이라 `/company/esg/new` 에서 '기업 관리' 로 읽힌다** — IA-02 gap 의 파생 피해 | 목록 → 등록 이동 시 '기업 관리' announce(기대: 'ESG 활동 등록') | gap (IA-02 종속) |
| A11Y-08 | P1 | 행 클릭 목적지(`/company/esg/:id/edit`)와 **동일 타깃의 row 내 keyboard-focusable 등가물이 있다** — `RowActions` 의 '수정' 버튼이 같은 `onEdit(item)` 을 부른다(`CrudTable.tsx:195` vs `:172` `rowActivateProps(() => onEdit(item))`). `useRowNavigation.ts:9-11` 주석이 요구하는 '접근 가능한 경로가 이미 존재한다는 전제' 가 이 표에서는 충족된다 | 행을 Tab → '수정' 버튼 도달 → Enter → 행 클릭과 같은 수정 폼 | pass |
| A11Y-13 | P1 | ① submit 검증 실패 → 첫 invalid 필드 포커스 ✅ — `useCrudForm.ts:239-241,253` 이 `onInvalid` 를 **명시해 계약으로 고정**한다(`:233-238` 주석: RHF `shouldFocusError` 기본값이 바뀌어도 동작 유지). 서버 422 도 첫 위반 필드로 포커스(`:184`). ② **폼 진입 시 첫 필드 자동 포커스 ❌** — 그 코드가 없다 | 빈 제목 제출 → `document.activeElement` = 제목 입력 ✅. `/company/esg/new` 진입 → activeElement = `<main>`(라우트 포커스) ❌ | 부분 gap |
| A11Y-14 | P2 | `ImageGalleryField` 의 업로드 완료/실패 announce — DS 소유. **이 화면은 업로드가 실재하지 않아**(blob: 생성뿐 — FS-022 §7 #9) 비동기 결과 자체가 없다 | DS 소유 문서 | 종속 |
| A11Y-16 | P1 | 이 화면이 만든 인터랙티브 표면 = 분류 필터 버튼 4개. 계약 충족: semantic role(`<button type="button">`) · keyboard(네이티브) · focus ring(`tds-ui-focusable`) · **이중(비색상) state 인코딩**(`aria-pressed` + `filterItemStyle(active)` 의 배경/색) · 비동기 status announce(`CrudListShell.tsx:107-109` 의 지속 live region — `:99-105` 주석이 '내용과 함께 생성된 region 은 announce 되지 않는다' 는 이유로 껍데기가 소유하게 한 판정을 기록) | RTL: 필터 버튼 4개의 role/`aria-pressed`. 필터 변경 → live region 에 'ESG 활동 N건을 찾았습니다.' 주입 | pass |
| IA-03 | P1 | breadcrumb 없음 — `/company/esg/new`·`/:id/edit` 는 non-top-level route 이므로 **appliesTo 안**이다. '기업 관리 > ESG > 등록' trail 이 없다 | 폼 화면에 trail 0개 | gap (앱 전역) |
| IA-06 | P1 | 무게 규칙 준수 — ESG 는 rich 엔티티(제목·1000자 내용·일자·이미지 10장)라 **전용 form route**(`App.tsx:193-194`). taxonomy 엔티티가 아니므로 modal 편집을 쓰지 않는다. 혼용 0건 | 수정 진입 = route(모달 아님) | pass |
| IA-07 | P1 | back-link 통일 — `FormPageShell.tsx:147-155` `<ChevronLeftIcon />` + '목록으로'. `ArrowLeftIcon`/'리스트로 돌아가기' 0건 | grep `pages/company/esg/**`: `ArrowLeftIcon` = 0 | 종속 (pass) |
| IA-08 | P1 | footer: primary '저장/등록' 우측 + secondary '취소' 그 왼쪽, **in-card**(`FormPageShell.tsx:179-191` — `Card` 안, `justifyContent: 'flex-end'`). 목록형 폼 family 와 일관 | 취소·저장 버튼이 카드 안 우측 | pass |
| IA-09 | P2 | N/A — 읽기 전용 detail page 가 없다(행 클릭이 곧 수정 폼) | — | n-a |
| IA-11 | P2 | N/A — 읽기 전용 record detail 이 없다 | — | n-a |
| IA-14 | P1 | 폼의 분류·일자 행이 `auto-fit`(`EsgFormPage.tsx:30-32`)으로 narrow 에서 접힌다. **목록의 2열 grid 는 고정폭 좌측 열**(`EsgListPage.tsx:27` `calc(var(--tds-space-6) * 8) minmax(0, 1fr)`)이라 좁은 뷰포트에서 필터 패널이 본문을 압박한다. 표에 `overflow-x` 컨테이너가 없다. AppShell sidebar collapse 는 앱 전역 미정 | 768/375px: 사이드바가 콘텐츠를 덮고, 표가 가로 scroll 대신 page 를 넘친다 | gap (앱 전역) |
| ERP-01 | P1 | 분류 → tone 매핑이 **이 화면의 로컬 helper** 다 — `types.ts:45-49` `esgCategoryTone`. quality-bar 가 지적하는 per-page meta helper 패턴이다. ⚠ 다만 ESG 분류는 **lifecycle status 가 아니다**(대기/승인/반려 등이 아니라 도메인 taxonomy 다) — ERP-01 의 appliesTo(ERP lifecycle status)에 정확히 들어맞지 않는다 | `esgCategoryTone` 이 중앙 레지스트리를 import 하지 않음 | 부분 n-a |
| ERP-02 | P1 | 테이블 density 는 `tableStyle`/`tdStyle`(shared/ui) 소유 — 이 화면은 소비자 | 소유 문서 | 종속 |
| ERP-03 | P1 | sticky thead/SelectionBar 없음 — **페이지네이션이 없어 표가 무한히 길어질 수 있는 이 화면에서 특히 아프다**(IA-04 gap 과 결합) | 100행에서 scroll → header 소실 | gap (공유) |
| ERP-04 | P1 | sortable header 없음 — 정렬이 `sortEsg`(`types.ts:52-57`) 고정(일자 내림차순). `aria-sort` 0건 | 헤더 클릭 무반응 | gap (공유) |
| ERP-05 | P1 | N/A — Pagination 자체가 없다(IA-04 gap). range 표시·size selector 를 얹을 대상이 없다 | — | n-a (IA-04 종속) |
| ERP-06 | P1 | 사용자 대상 문구가 존댓말로 통일. **다만 검증 문구가 조사 fallback 을 출하한다** — ERP-13 참조 | 빈 제목 제출 → '제목을(를) 입력하세요.' | gap (ERP-13) |
| ERP-08 | P2 | **일자 셀이 `shared/format` 을 경유하지 않는다** — `EsgListPage.tsx:82` `render: (item) => item.date`(원문 'YYYY-MM-DD'). 건수는 `formatNumber` 경유 ✅(`EsgCategoryFilter.tsx:51` · `CrudListShell.tsx:119`) | 일자 셀이 raw 문자열 | 부분 gap |
| ERP-12 | P1 | 목록 export(CSV/xlsx) 없음 — 툴바에 등록 버튼뿐 | export 버튼 0개 | gap (앱 전역) |
| ERP-13 | P1 | **josa 헬퍼 미적용** — `requiredText`(`shared/crud/validation.ts`)가 '제목을(를)'·'제목은(는)' 리터럴을 생성하고 `useCrudForm.ts:215` 의 성공 토스트가 `'${entityLabel}을(를) ${verb}했습니다.'` 를, `useCrudList.tsx:107` 이 `'<제목>' 을(를) 삭제했습니다.` 를 만든다. `Empty.tsx:68` 의 `subjectParticle` 이 앱에 존재하지만 이 경로들이 쓰지 않는다. quality-bar acceptanceCheck('grep = 0')를 위반 | 등록 성공 → 'ESG 활동을(를) 등록했습니다.'(기대: 'ESG 활동을 등록했습니다.') | gap (앱 전역) |
| ERP-15 | P1 | **대형 list 렌더 계약 없음** — 전량 조회 + 전량 렌더(IA-04 gap). virtualization·row cap·가로 scroll 전략 0건 | 1,000행 시드 → 전량 DOM | gap |
| EXC-05 | P1 | client timeout 없음 — `AbortSignal.timeout` 이 `apps/admin/src` 전체 0건. `crud.ts` 의 `wait(LATENCY_MS, signal)` 에 상한이 없다 | 응답하지 않는 fixture → spinner 무한 지속 | gap (앱 전역) |
| EXC-06 | P1 | **부분 충족** — 오류 타입이 status 를 지니고(`http-error.ts:45-61`) 화면이 **404·409/412·422·5xx 를 갈라 다르게 그린다**(`useCrudForm.ts:138-143,159-186,188-189`). ❌ 버려지는 둘: ① **목록 조회 실패가 403/404/500 을 뭉갠다**(`CrudListShell.tsx:156` `error !== null` 하나) ② **400 을 인라인으로 꽂지 않는다**(`useCrudForm.ts:176` 은 422 만 — BE-022 §7.13 이 그래서 필드 거절을 422 로 계약) ③ 403 이 '권한 없음' 문구가 아니라 generic 저장 실패 | `?status=list:403` 과 `?status=list:500` → **같은 배너** ❌. `?status=save:409` → 충돌 다이얼로그 ✅. `?status=save:422` → 인라인 ✅ | 부분 gap |
| EXC-07 | P1 | 422 → RHF `setError` + 첫 필드 포커스 ✅ — `useCrudForm.ts:175-186`(`isUnprocessable` + `cause.violations` → `setError(violation.field)` → `setFocus(first.field)`). 클라이언트 zod error 와 **같은 인라인 slot 재사용**(`FormField` error `<p>`). form-level 배너는 generic 전용(`:188`) | `?status=save:422`(violations 포함 fixture) → 그 필드에 인라인 error + 포커스 | pass |
| EXC-10 | P1 | `settleAll` = `Promise.allSettled`(`bulk.ts:19`) ✅ · 'N중 M건 실패' 보고 ✅(`useCrudList.tsx:138-140`) · 실패 시 다이얼로그 유지 + 선택 유지 ✅(`:141` early return) · 전원 성공에만 invalidate/clear ✅(`:143-146` · `crud.ts:239`). ❌ **실패 id 를 돌려주지 않아**(`bulk.ts:15-21` 이 `number` 만 반환) '실패분만 retry' 가 불가능 — 재시도가 성공분을 재요청한다 | 3건 선택 + `?fail=esg:delete` → '3건 중 3건 실패' 유지. 부분 실패 fixture 로 재시도 → 성공분도 재요청 | 부분 gap |
| EXC-11 | P1 | offline 감지 없음 — `navigator.onLine` 앱 전체 0건 | 네트워크 끊고 삭제 → 일반 실패 | gap (앱 전역) |
| EXC-12 | P1 | **완전 충족** — `useCrudForm.ts:38-39,138-143` 이 `LoadFailure = 'not-found' \| 'error'` 로 가르고, `FormPageShell.tsx:115-143` 이 404 → '찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + **'목록으로'만**(`:131` `!notFound &&` — 재시도 미제공), 그 외 → '불러오지 못했습니다.' + '다시 시도' + '목록으로'. 어댑터가 404 를 `HttpError` 로 던진다(`crud.ts:54-57`, `:52-53` 주석이 이 판정을 기록). 무한 loading 없음(`loadingDetail`(`:130`)이 `data === undefined` 조건) | `/company/esg/none/edit` → not-found 화면(재시도 버튼 0개). `?status=esg:detail:500` → error 화면(재시도 있음) | pass |
| EXC-14 | P1 | N/A — 이 화면에 optimistic write 가 없다. 등록·수정·삭제 전부 비관적(confirm + busy)이며, 그것이 요구가 명시한 '비가역 create/delete 는 pessimistic 유지' 와 일치한다. inline toggle/reorder 표면이 없다 | — | n-a |
| EXC-15 | P1 | client 검증 ✅ — `ImageGalleryField.tsx:144-148` 이 `imageFileError(file, maxSizeMB)`(type `image/*` · 5MB)로 거절하고 인라인 표시(`:296-298`). load 실패 fallback ✅ — `GalleryTile`(`:70-92`)이 `role="img"` + `aria-label` placeholder, `src` 변경 시 failed 리셋(`:74-76`). ❌ **progress·cancel 경로 없음** — 그러나 **업로드 자체가 없어서**(요청을 보내지 않는다) 그 표면이 성립하지 않는다. 진짜 문제는 요구 밖이다: 값이 `blob:` 이라 저장되지 않는다(FS-022 §7 #9) | 비-image 선택 → 인라인 거절. 6MB → 거절. **정상 이미지 등록 후 목록 복귀 → 이미지가 깨진다**(요구 밖 결함) | 부분 pass |
| EXC-16 | P2 | N/A — 이 화면이 browser storage 를 쓰지 않는다 | — | n-a |
| EXC-18 | P1 | **selection scope 가 흐리고 안전장치가 없다** — `toggleAll` 이 '현재 보이는 행'(분류 필터 적용 후 전량)을 고르는데(`CrudListShell.tsx:143-148`) 라벨은 `이 페이지의 ESG 활동 전체 선택`(`CrudTable.tsx:125`)이라 **page 도 없는데 '이 페이지'** 라고 말한다. Shift-click 범위 선택 없음. 큰 건수 confirm 은 count 를 echo 하나(`useCrudList.tsx:169-170`) **임계 초과 강화 confirm·progress·cancel 없음**. IA-04(페이징 부재)와 결합해 위험이 커진다 — '전체 선택' 한 번이 조회된 전량을 파괴적 삭제 대상으로 만든다 | 100건 시드 → '전체 선택' → 100건 선택 → '선택 100건 삭제' → 진행률·취소 없이 100개 병렬 DELETE | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 draft 스냅샷 없음 — 401 → programmatic navigate 라 FEEDBACK-04 가드가 발화하지 못한다. 만료 임박 연장 프롬프트도 없다 | 폼 편집 중 `?status=esg:detail:401` → 입력 손실 | gap (앱 전역) |
| EXC-20 | P1 | **참조 코드 표시가 있다** — `useCrudForm.ts:189` `setErrorReference(referenceOf(cause))` → `FormPageShell.tsx:167` → `FormFeedback.tsx:38-47` 이 '오류 코드 TDS-…' 를 `userSelect: 'all'`(`:22`)로 렌더한다. raw body/stack/status 를 산문으로 쓰지 않는다(`:32-36` 주석이 그 계약을 기록). `HttpError.reference`(`http-error.ts:47,68-75`) = `TDS-<base36 시각>-<난수>`. ❌ **목록·삭제 실패에는 참조 코드가 없다**(`CrudListShell`/`useCrudList` 가 `referenceOf` 를 부르지 않는다) | `?status=save:500` → 배너 + 복사 가능한 'TDS-…' ✅. `?status=list:500` → 참조 코드 없음 ❌ | 부분 pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 축 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 조회 응답 p95 | **≤ 600ms**(서버) | 측정 불가 — 백엔드 없음 | BE-022 §2 서버 상한 5초는 **타임아웃**이지 예산이 아니다 |
| 상세 조회 응답 p95 | **≤ 400ms**(서버) | 측정 불가 | 단건 |
| 저장·삭제 응답 p95 | **≤ 800ms**(서버) | 측정 불가 | 정제(BE-022 §7.2) 포함 |
| 첫 렌더(진입 → 표 조작 가능) | **≤ 1s**(로컬) | 픽스처 400ms + 렌더 | — |
| 재조회 횟수 | 진입 1회 + **쓰기당 1회**(무효화). **분류 필터 변경은 0회**(클라이언트 필터 — FS-022 §4.1) | 일치. `staleTime` 30초 안의 재진입 0회, `refetchOnWindowFocus: false` 라 탭 복귀 0회 | `queryClient.ts:24,47,67` · `crud.ts:179-181,198-201,218-220` |
| 목록 응답 크기 | **미제한 — 예산이 없다** ⚠ | `EsgItem` 전 필드 × 전량(§BE-022 §7.5). 내용 1000자 + 이미지 URL 10개 × N건. **100건이면 ≈ 150KB+** | 페이징 부재(IA-04 gap)의 직접 비용 |
| DOM 행 수 | **미제한 — 예산이 없다** ⚠ | 조회된 전량. 1,000건이면 1,000행 × 7열 = 7,000 셀 | ERP-15 gap |
| 메모리 | 목록 캐시 + **`blob:` object URL 최대 10개**(폼 체류 중) | `ImageGalleryField.tsx:122-128` 이 언마운트 시 `revokeObjectURL` 로 회수한다 — **누수는 없다**(대신 저장값이 죽는다 — FS-022 §7 #9) | — |
| 번들 | 이 화면 고유 코드 ≈ 350줄(3파일) + 공용 셸 + DS `ImageGalleryField` | 일치 | — |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이지 성능 예산이 아니다.** 픽스처가 로딩 상태를 화면에서 볼 수 있게 하려고 넣은 상수이며, 백엔드가 붙으면 사라진다. 위 예산의 어떤 행도 이 값에서 유도되지 않았다.

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 배너 + 재시도. 셸 유지 | ✅ `CrudListShell.tsx:156-165`. 단 403/404/500 미구분 · 참조 코드 없음(§3 EXC-06/EXC-20) |
| 상세 조회 404 vs 5xx | 복구 수단을 달리 | ✅ **완전 충족** — `FormPageShell.tsx:115-143`(§3 EXC-12) |
| 저장 5xx | 배너 + 입력 보존 + 참조 코드 | ✅ `FormFeedback.tsx:38-47`(§3 EXC-20) |
| 저장 409(대상 삭제됨) | 입력 보존 + 충돌 다이얼로그 + 이동 없음 | ✅ **완전 충족** — §2 EXC-04 pass |
| 저장 409(동시 수정) | 위와 동일 | ❌ **감지 불가** — 토큰 없음(BE-022 §7.8). 마지막 쓰기 승리 |
| 삭제 실패 | 다이얼로그 유지 + 재시도 | ✅ §2 FEEDBACK-02 pass |
| 일괄 삭제 부분 실패 | 실패분만 재시도 | ⚠ 건수만 보고 — 재시도가 전량 재실행(§3 EXC-10) |
| **이미 삭제된 항목 삭제** | 멱등 성공(204) | ❌ **409 '이미 삭제된 항목입니다.'** → '삭제하지 못했습니다' 로 보인다. 일괄에서는 **영원히 성공하지 않는 재시도**가 된다 — BE-022 §7.11 |
| 화면 렌더 예외 | 셸 유지 + 복구 UI | ✅ `AppShell.tsx:484-493`(상속) |
| 세션 만료 | 재인증 후 원경로 복귀 | ⚠ 경로는 복귀(쿼리 포함), **폼 입력은 손실** — §3 EXC-19 |
| 응답 없음(무한 대기) | 상한에서 abort | ❌ 상한 없음 — §3 EXC-05 |
| 네트워크 단절 | 배너 + 쓰기 게이팅 | ❌ 감지 없음 — §3 EXC-11 |
| 화면 이탈 중 쓰기 진행 | abort · 거짓 실패·유령 토스트 없음 | ✅ §2 EXC-09 pass |
| 저장 후 새로고침 | 저장값 유지 | ❌ **픽스처가 메모리에만 산다**(`crud.ts:40` `let items`) — 백엔드 부재의 결과이지 결함이 아니다 |
| **이미지 등록 후 목록 복귀** | 이미지 표시 | ❌ **`blob:` URL 이 죽어 깨진다** — FS-022 §7 #9 · BE-022 §7.6 |

### 4.3 데이터 보존 · 감사

| 축 | 요구 | 현재 |
|---|---|---|
| 변경 이력 | ESG 활동은 **고객에게 공개되는 대외 발표**다 — 누가 언제 무엇을 바꿨는지 남아야 한다(잘못된 ESG 공시는 기업 리스크다) | ❌ `EsgItem`(`types.ts:6-15`)에 `createdAt`/`updatedAt`/`updatedBy` 가 없다. 이력 조회 심도 없다 — BE-022 §7.9 |
| 소프트 삭제 | 삭제된 활동의 복구 창 | ❌ 없다. `crud.ts:86` 이 배열에서 제거한다. undo window 도 없다(FEEDBACK-05 는 confirm 으로 충족) |
| 이미지 보존 | 등록한 이미지가 저장·조회된다 | ❌ **저장되지 않는다** — 업로드 심 부재(BE-022 §4 EP-06). 고아 파일 회수 정책도 미정 |
| 초안 보존 | 장수명 폼의 로컬 autosave | ❌ 없다 — §3 EXC-19 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **IA-13** | **P0** | 분류 필터가 `useState` 에만 산다 — `useListState`(실소비자는 `members/**` 뿐)를 이 화면이 쓰지 않는다. 폼 왕복·F5·링크 공유로 필터 view 가 복원되지 않는다 | **이 화면** — 가장 값싸게 닫히는 P0 | **A41 (즉시 가능)** |
| 2 | **IA-02** | **P0** | `/company/esg/new`·`/:id/edit` 가 `findNavLabel` branch 폴백으로 '기업 관리' 를 보이고, 폼에 `<h1>` 이 2개다. 목록/폼의 title 소스도 다르다. (A11Y-07 의 route announce 도 같은 이유로 '기업 관리' 를 읽는다) | **앱 전역** (`AppHeader`/`findNavLabel` + 전 form/detail route) | A40 · A11 |
| 3 | **IA-04** | **P0** | Pagination 이 없다 — 전량 조회 + 전량 렌더. page size 개념 자체가 없다. 부수 피해: EXC-18(전체 선택이 전량) · ERP-15 · ERP-03 · COMP-06/COMP-07 · BE-022 §7.1(일괄 DELETE 레이트리밋) | **`CrudListShell` 소비 목록 전체**(연혁·인증서·ESG) | A40 · A63 · A11 |
| 4 | **EXC-03** | **P0** | 쓰기 권한 게이팅 없음 — `useRouteWritePermissions` 소비자 0건. 등록·수정·삭제·일괄삭제 버튼이 권한과 무관하게 보이고 눌린다. 강등 reconcile 도 성립하지 않는다 | **앱 전역** (전 화면 공통) | A40 · A11 |
| 5 | **A11Y-11** | **P0** | 필수 4필드에 `required`/`aria-required` 가 없다 — `FormField` 의 `*` 마커가 `aria-hidden` 이라 스크린리더에 필수 여부가 닿는 경로 0개. (describedby·hint 절반은 통과) | **앱 전역** (`FormField`/`TextareaField` 계약 + 전 폼) | A40 (DS 자동 배선 승격 검토) · A41 |
| 6 | EXC-18 | P1 | selection scope 라벨이 '이 페이지의…' 인데 page 가 없다 · Shift-range 없음 · 임계 강화 confirm/progress/cancel 없음 | 공유(`useCrudList`/`CrudTable`) + IA-04 결합 | A40 · A11 |
| 7 | EXC-06 | P1 | 목록 조회 실패가 403/404/500 을 뭉갠다(`CrudListShell.tsx:156`). 403 이 generic 문구 | 공유(`CrudListShell`) | A40 · A11 |
| 8 | EXC-10 | P1 | `settleAll` 이 실패 id 를 돌려주지 않아 '실패분만 retry' 불가 | 공유(`shared/bulk.ts`) | A40 |
| 9 | A11Y-13 | P1 | 폼 진입 첫 필드 자동 포커스 없음(검증 실패 포커스는 통과) | 공유(`useCrudForm`) | A40 |
| 10 | — | P1 | **'취소'·'목록으로' 버튼이 미저장 가드를 통과한다** — 둘 다 `navigate(listPath)` push 라 링크 가로채기·popstate 어디에도 안 걸린다(FEEDBACK-04 의 3경로 밖이라 P0 판정에는 영향 없음) | 공유(`FormPageShell`) | A40 · A11 |
| 11 | ERP-13 / ERP-06 | P1 | 검증·토스트가 '제목을(를)'·'ESG 활동을(를)' 조사 fallback 을 출하 | **앱 전역** (`requiredText` · `useCrudForm` · `useCrudList`) | A41 · A40 |
| 12 | IA-03 | P1 | 폼 route 에 breadcrumb 없음 | **앱 전역** | A40 · A11 |
| 13 | ERP-03 / ERP-04 / ERP-15 | P1 | sticky thead·SelectionBar 없음 · sortable header 없음 · 대형 list 렌더 계약 없음 — **페이징 부재와 결합해 악화** | 공유(`CrudTable`) | A40 |
| 14 | ERP-12 | P1 | 목록 export(CSV/xlsx) 없음 | **앱 전역** | A40 · A11 |
| 15 | EXC-05 / EXC-11 / EXC-19 | P1 | client timeout · offline 감지 · 세션 만료 draft 보존이 전부 없다 | **앱 전역** | A40 · A63 |
| 16 | COMP-09 / COMP-12 | P2 | 제목 열 truncate 없음 · 내용 hover expand 없음 · 글자 수 카운터 없음 | 이 화면 | A41 |
| 17 | COMP-06 | P2 | 스켈레톤 `length: 5` 하드코딩 | 공유(`CrudTable`) | A40 |
| 18 | ERP-08 | P2 | 일자 셀이 `shared/format` 미경유(raw `item.date`) | 이 화면 | A41 |
| 19 | IA-14 | P1 | 768/375px 반응형 · 표 가로 scroll 컨테이너 없음 | **앱 전역** | A40 · A11 |
| 20 | — | — | **이미지가 저장되지 않는다**(FS-022 §7 #9 · BE-022 §7.6) — quality-bar 축이 아니라 기능 결손. `blob:` URL 이 폼 언마운트와 함께 죽는다 | 이 화면 + 백엔드 | A63 · A11 · A01 |
| 21 | — | — | **삭제가 멱등이 아니다**(BE-022 §7.11) — 이미 삭제된 항목에 409. 일괄에서 영원히 성공하지 않는 재시도가 된다 | 공유(`shared/crud/crud.ts`) | A40 · A63 |
| 22 | — | — | **멱등키가 만들어지고 버려진다**(BE-022 §7.10) — `CrudAdapter` 시그니처에 자리가 없다 | 공유(`shared/crud/crud.ts`) | A40 · A63 |
| 23 | — | — | 동시 **수정** 충돌 미감지(BE-022 §7.8) — **프론트 충돌 UI 는 이미 완비**돼 있어 `version` + `If-Match` + 어댑터 본문만 오면 성립한다 | 데이터 계약 + 어댑터 | A63 · A41 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 모든 판정 근거는 코드 대조다.** 아래 스위치는 판정을 **재현**하는 절차이며, 실행 결과가 아니다.

### 6.1 이 화면의 실패 재현 스위치

`data-source.ts:49-58` 이 `createCrudAdapter<EsgItem, EsgInput>({ scope: 'esg', ... })` 로 만들므로 **scope = `esg`**, op 은 `crud.ts` 가 정하는 **네 개**다:

| op | 어디서 던지나 | 화면 결과 |
|---|---|---|
| `list` | `crud.ts:45` `failIfRequested(spec.scope, 'list')` | FS-022-EL-009 목록 조회 실패 배너 |
| `detail` | `crud.ts:50` | FS-022-EL-014 폼 로드 실패 화면 |
| `save` | `crud.ts:61`(create) · `:66`(update) — **둘이 같은 op 을 공유한다** | FS-022-EL-014.2 저장 실패 배너 |
| `delete` | `crud.ts:79` | FS-022-EL-015/016 다이얼로그 안 배너 |

**`?fail=` (generic Error)** — `dev.ts:87-92`:

| URL | 효과 |
|---|---|
| `/company/esg?fail=list` | 목록 조회 실패(op 이름만 주면 **모든 어댑터**의 같은 op 이 실패한다) |
| `/company/esg?fail=esg:list` | 이 화면의 목록만 실패 (scope 지정 — 권장) |
| `/company/esg?fail=esg:delete` | 삭제만 실패 → FEEDBACK-02 재현(다이얼로그 유지 + 재클릭 retry) |
| `/company/esg/new?fail=esg:save` | 저장만 실패 → FS-022-EL-014.2 배너 |
| `/company/esg/esg-1/edit?fail=esg:detail` | 상세 로드 실패 → error 화면('다시 시도'+'목록으로') |
| `?fail=all` | 전 op 실패 |
| `?fail=esg:list,esg:save` | 쉼표로 여러 개(`dev.ts:89`) |

**`?status=` (status 지닌 `HttpError`)** — `dev.ts:57-71`. 재현 가능한 status 는 `dev.ts:27-37` 의 9개(400·401·403·404·409·412·422·429·500). **`?fail=` 과 달리 화면이 status 로 분기하는 경로를 연다**:

| URL | 효과 | 이 화면의 반응 |
|---|---|---|
| `/company/esg/esg-1/edit?status=save:409` | 저장 409 | **충돌 다이얼로그**(§2 EXC-04 pass 재현) — 입력 보존 |
| `…?status=save:412` | 저장 412 | 위와 동일(`isConflict` 가 수렴) |
| `…?status=save:422` | 저장 422 | 인라인 필드 에러 + 포커스(§3 EXC-07 pass 재현) — **fixture 가 `violations` 를 실어야 한다**(현재 `dev.ts:84` 는 message 만 — 이 경로의 완전한 재현은 어댑터 수정 필요) |
| `…?status=save:500` | 저장 500 | 배너 + **참조 코드**(§3 EXC-20 재현) |
| `/company/esg?status=list:403` · `?status=list:500` | 목록 403/500 | **같은 배너** — §3 EXC-06 gap 재현 |
| `/company/esg/none/edit` | (스위치 불필요) | 없는 id → **not-found 화면**, 재시도 버튼 0개(§3 EXC-12 pass 재현) |
| `?status=list:401` | 목록 401 | 전역 인터셉터 → `/login?returnUrl=…&reason=session_expired`(§2 EXC-02) |

> **`?delay=` 는 이 화면에 존재하지 않는다.** `shared/crud/dev.ts` 에 그런 스위치가 없다(`pages/dashboard/api.ts`·`pages/members/data-source.ts` 에만 있다). 로딩 상태는 `LATENCY_MS = 400`(`dev.ts:12`) 고정 지연으로만 관찰한다 — STATE-01 의 '재조회가 표를 스켈레톤으로 만들지 않는다' 는 그 400ms 창에서 확인한다.

### 6.2 그 밖의 측정

| 축 | 도구 | 비고 |
|---|---|---|
| A11Y-12 | **`shared/a11y-guard.test.ts:82`** — `aria-current` 를 쓰는 파일을 검사(주석 제거 후 — `:110-113`). Pagination 의 `aria-current="page"` 는 진짜 navigation 이라 정당하다고 기록(`:71`) | §2 A11Y-12 pass 를 CI 가 고정한다 |
| TOKEN-01 | `shared/token-guard.test.ts` + ESLint `no-restricted-syntax` | grep 기반 판정을 CI 가 고정한다 |
| STATE-01 / 로딩 파생 | `shared/crud/CrudTable.test.tsx` | 표 3분기(loading/empty/rows) 회귀 |
| 순수 규칙 | **`esg.test.ts`** — `sortEsg`(일자 내림차순) · `filterEsg`(전체/환경/지배구조) · `countEsgByCategory` · `esgCategoryLabel` · `esgSchema` 6케이스(정상·분류 union·제목/내용 빈값·일자 형식·이미지 다중·이미지 상한) | **화면 렌더 테스트는 없다** — `EsgListPage`/`EsgFormPage`/`EsgCategoryFilter` 의 RTL 테스트가 존재하지 않는다. §2 의 A11Y-11·A11Y-12·IA-02 판정은 코드 대조로만 이뤄졌다 |
| 폼 공용 배선 | `useListState.test.tsx` · `useDebouncedSearch.test.tsx` · `useModalDirtyGuard.test.tsx` | **이 화면은 세 훅을 모두 쓰지 않는다** — 앞의 둘은 IA-13/COMP-10 판정의 근거(미소비), 셋째는 FEEDBACK-06 n-a 의 근거 |

## 7. 자기 점검

- [x] **P0 30건을 quality-bar §요약 순서 그대로 전수 판정했다** — 빈칸 0건
- [x] §2.1 산수 검산: pass 12 + 종속 11 + n-a 2 + gap 5 = **30** ✓
- [x] 모든 `pass` 에 코드 근거(파일:라인)가 있다
- [x] 모든 `gap` 에 재현 가능한 측정 기준이 있다
- [x] 모든 `N/A` 에 '표면이 왜 이 화면에 없는가' 사유가 있다 (COMP-10 = 검색 입력 없음 · FEEDBACK-06 = 폼 담은 modal 없음)
- [x] **'공용 모듈이 있어도 이 화면이 쓰는지' 를 코드로 확인했다** — `useCrudList` ✅ 소비(STATE-01 pass) · `useCrudForm` ✅ 소비(EXC-08·EXC-04 pass) · `useListState` ❌ 미소비(IA-13 gap) · `useDebouncedSearch` ❌ 미소비(COMP-10 은 표면 부재로 n-a) · `useModalDirtyGuard` ❌ 미소비(FEEDBACK-06 n-a) · `useRouteWritePermissions` ❌ 미소비(EXC-03 gap)
- [x] **A11Y-12 를 직접 재확인했다** — `EsgCategoryFilter.tsx:47` `aria-pressed={active}` · `apps/admin/src` 의 `aria-current` 사용 0건 → **pass**
- [x] **COMP-05 를 직접 확인했다** — `EsgCategoryFilter.tsx:5-12` 가 `filterPanelStyle`/`filterNavStyle` 을 import 하고 로컬 style object 0건 → **pass**(§3)
- [x] **quality-bar 요구 문구를 복제하지 않았다** — ID 참조 + 이 화면의 충족 방식만 기술
- [x] §4.1 에 `LATENCY_MS = 400` 이 예산이 아님을 명시했다
- [x] §6 의 `?fail=` scope(`esg`)와 op(`list`·`detail`·`save`·`delete`)을 **코드에서 확인**했다(`data-source.ts:50` · `crud.ts:45,50,61,66,79`). **`?delay=` 를 쓰지 않았다**
- [x] FS-022 §7 ↔ BE-022 §7.14 ↔ 이 문서 §5 의 이관 항목이 서로 일치한다
- [x] E2E 를 실행하지 않았음을 §6 머리에 명시했다
