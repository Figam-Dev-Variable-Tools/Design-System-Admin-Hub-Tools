---
id: NFR-025
title: "성공 사례 비기능 명세"
functionalSpec: FS-025
backendSpec: BE-025
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-025. 성공 사례 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-025 성공 사례 (`/portfolio/case-studies` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구 문구를 복제하지 않는다.** ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **'이 화면 적용본'**. 각 요구가 이 화면에서 ① 어떻게 충족되는가(코드 근거) ② 무엇을 재현하면 판정되는가(측정 기준) 만 기술한다 |
| 함께 읽는 문서 | FS-025(요소·예외) · BE-025(엔드포인트·계약) · **NFR-023**(같은 골격의 자매 화면 — 차이는 §1.2) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 **판정만** 갱신한다. 요구 문구를 이쪽에 옮겨 적지 않는다 |
| 판정 기준일 | **2026-07-17 · HEAD = `4b805ad`** (F3a·F3b·통합 머지 후). 이전 판정은 F2(`3cd3078`) 기준이었다 |
| 검증 방법 | **E2E 미실행. 모든 판정 근거는 `4b805ad` 코드 대조다.** §6 의 재현 스위치는 판정을 *확인할 수 있는* 절차이며 이 문서가 그것을 실행했다는 뜻이 아니다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

> **규약의 예외 하나(명시)**: `상속` 항목이라도 **코드 대조로 위반을 직접 확인했고 그 표면이 이 화면에 실재하면 `gap` 으로 적고 범위를 '앱 전역'으로 표기한다.** `종속` 으로 덮으면 검증된 P0 미충족이 문서에서 사라진다 — 이 문서에서는 A11Y-11 · MOTION-03 두 건이 여기 해당한다(NFR-023 §1.1 과 동일 규칙).

### 1.2 NFR-023(포트폴리오)과 갈리는 P0 — 한 건

두 화면은 같은 프레임워크 위에 있어 P0 판정이 거의 같다. **딱 하나가 갈린다:**

| 요구 ID | NFR-023 포트폴리오 | NFR-025 성공 사례 | 갈리는 이유 |
|---|---|---|---|
| **STATE-02** | **gap** — 분류 선택지(`category-options`)가 두 번째 read query 인데 실패 표면이 없다. 폼에서 필수 필드를 못 채워 저장이 영구 불가 | **pass** | **이 화면에는 그 쿼리가 없다.** 업종이 소스 상수(`CASE_INDUSTRY_OPTIONS`)라 조회 자체가 없고, read query 는 목록·상세 2개뿐이며 **둘 다 인라인 Alert 표면을 갖는다** |

**EXC-04 는 양쪽 다 gap 이고, F3b 이후 사유가 같아졌다** — 예전엔 포트폴리오만 유령 저장이 실재했으나(`createStoreAdapter` 에 존재 검사 부재) F3b 가 그 팩토리에도 409/404 를 넣어(`crud.ts:192-194`·`:219-221`·`:232-234`) **두 화면 모두 '동시 삭제는 409 로 잡고 동시 수정은 못 잡는다'(토큰 부재)** 로 수렴했다. **EXC-12 도 마찬가지로 수렴해 양쪽 pass 다**(P1 — §3) — 예전에 이 문서가 '여기만 pass' 라 적었던 근거(어댑터 차이)는 사라졌다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 스켈레톤의 유일한 조건이 최초 로드다 — `useCrudList.tsx:71` `firstLoading = isFetching && data === undefined`, `:72` `refreshing`. `CrudListShell.tsx:136` 이 `loading={firstLoading}` 만 표에 넘기고, `:119` 는 재조회 중 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. `CrudTable.tsx:143` 이 그 값으로만 스켈레톤/빈상태/행을 가른다. 조회 실패는 `CrudListShell.tsx:113` 이 표 대신 Alert 로 가른다 — 네 상태가 배타적이다 | 목록 진입 → 스켈레톤만(빈 상태 문구 없음). '금융'으로 필터해 0건을 만든다 → `Empty` 만. `?fail=case-studies:list` → danger Alert 만. 데이터가 있는 상태에서 '다시 시도' → **표가 스켈레톤으로 바뀌지 않고 이전 행이 남는다** | pass |
| STATE-02 | STATE | 직접 | **이 화면의 read query 2개가 모두 인라인 표면을 갖는다.** 목록 실패 = `CrudListShell.tsx:156-165` danger Alert + '다시 시도'(`refetch`)가 표를 대체(toast 아님, empty 폴백 아님). 상세 로드 실패 = `FormPageShell.tsx:115-143` 이 같은 규약으로 폼을 대체하며 **404/그 외를 갈라 복구 수단을 다르게 준다**. **NFR-023 의 gap 사유(분류 선택지 쿼리)가 여기엔 없다** — 업종이 소스 상수(`types.ts:51-58`)라 조회하지 않는다(`CaseStudyListPage.tsx` 에 `useQuery` 소비 0건, `useCrudList` 만 쓴다) | `?fail=case-studies:list` → 인라인 danger Alert + '다시 시도'가 query 를 재발행. `?fail=case-studies:detail` 로 `/:id/edit` → 폼 대체 배너. **read 실패로 error toast 가 발생하지 않는다**. 이 화면 소스에 `data ?? []` 로 error 를 삼키는 쿼리 0건 | pass |
| STATE-04 | STATE | 직접 | (b) **필터 변경 시 선택 해제**: `CaseStudyListPage.tsx:67-69` `useEffect(() => clear(), [filter, clear])` — `clear` 는 `useRowSelection.ts:35` 의 `useCallback` 이라 안정적이다. 일괄 삭제 전원 성공도 `useCrudList.tsx:144` 에서 해제한다. (a) **page clamp**: 이 화면에 **페이지 개념이 없어**(페이지네이션 미구현 — IA-04 gap) 범위를 벗어난 page 가 성립하지 않는다 → 보정 대상 없음 | 사례를 선택한 뒤 업종 필터를 바꾼다 → 'N건 선택됨'·SelectionBar 가 사라진다. (a) 는 재현 대상이 없다 — 페이지네이션이 들어오면 이 행을 재판정해야 한다(§5 #2 와 연동) | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 모듈의 모든 시각 값이 토큰 변수다 — `CaseStudyListPage.tsx:32-50`(`var(--tds-space-3)` · `calc(var(--tds-space-6) * 6)` · `calc(var(--tds-space-6) * 12)`), `CaseStudyFormPage.tsx:27-31`, `_shared/PortfolioMediaFields.tsx:33`. **hex 리터럴·px 리터럴·border 키워드 0건**. 회귀는 `shared/token-guard.test.ts` 가 소스 전수 스캔으로 고정한다 | `apps/admin/src/pages/portfolio/{case-studies,_shared}/**` 에 `#hex`·`[1-9]px`·`(outline\|border): (thin\|medium\|thick)` grep = 0. `pnpm verify:all` 의 token-guard 통과 + ESLint/stylelint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | focus ring 표면이 실재한다: 업종 select·등록 버튼·행 체크박스·노출 토글·행 액션·폼 전 필드(업종·일자·제목·고객사·과제·해결·성과·이미지)·다이얼로그 버튼. 전부 DS 소유(`tds-ui-focusable` · 각 컴포넌트 `:focus-visible`). 확인한 예: `ToggleSwitch.css` `.tds-toggle:focus-visible { outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus) }` | 이 화면의 모든 포커스 가능 요소를 Tab 으로 순회하며 ring 두께가 동일한지. 판정 정본은 DS 문서 | 종속 |
| TOKEN-03 | TOKEN | 상속 | easing 소비 표면: 노출 토글 knob transform transition · 성공/실패 Toast entrance · nav row transition. 전부 DS·AppShell 소유 | Toast 가 실제로 재생되는지(non-reduced-motion). 판정 정본은 DS 문서 | 종속 |
| TOKEN-04 | TOKEN | 상속 | shadow 소비 표면: 폼 `Card`(`FormPageShell.tsx:164`) · 삭제/충돌 `ConfirmDialog` 의 Modal · Toast. 전부 DS 소유 | Modal/Toast 가 light/dark 에서 부상하는지. 판정 정본은 DS 문서 | 종속 |
| TOKEN-05 | TOKEN | 상속 | display/heading tier 소비 표면: 폼 `<h1>`(`FormPageShell.tsx:159` — 공유 `pageTitleStyle`) · AppHeader `<h1>`(`AppHeader.tsx:52` — 같은 상수 스프레드) · `CardTitle`. 이 화면은 스타일을 재선언하지 않는다 | `/portfolio/case-studies/new` 의 `<h1>` 이 body-md 보다 시각적으로 큰지. 판정 정본은 tokens.json · DS 문서 | 종속 |
| COMP-10 | COMP | **N/A** | **텍스트 검색·필터 입력 표면이 이 화면에 없다.** 유일한 필터는 `<select>` 다(`CaseStudyListPage.tsx:103-117` `SelectField`) — 옵션 선택 컨트롤이라 IME 조합이 발생하지 않고 debounce·최소 길이·stale 응답 경합의 대상이 아니다(값 변경이 서버 재조회를 일으키지 않고 클라이언트 필터링만 한다. **선택지가 소스 상수라 서버 왕복 자체가 없다**). 목록에 `SearchField` · `<input type="search">` · `useDebouncedSearch` 소비 0건 | 재현 대상 없음. **검색이 도입되면 즉시 재판정** — `shared/crud/useDebouncedSearch`(`isComposing` 처리)를 소비하면 된다 | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 파괴적 액션(단건·일괄 삭제)이 전부 `ConfirmDialog intent="delete"` 로 게이트된다 — `useCrudList.tsx:151-177`. busy 중 확인 버튼 잠금(`busy={deleting}`). 실패 시 **닫지 않고** danger 배너(`:111`·`:138`)를 띄우고 재클릭이 재시도. cancel/Esc/dim → `:86-92` `closeDelete` 가 `abort()` + `mutation.reset()` | `?fail=case-studies:delete` 로 삭제 → 다이얼로그가 열린 채 danger 배너, 재클릭이 재시도. 삭제 in-flight(400ms) 중 Esc → 거짓 토스트 없이 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | 폼이 `FormPageShell.tsx:113` 에서 `useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE })` 를 배선한다(`CaseStudyFormPage.tsx:24-25`·`:121`). 훅이 3경로를 전부 구현: `beforeunload`(`:120-131`) · 앱 내 `<a href>` capture 가로채기(`:134-155`) · popstate sentinel(`:157-182`). `isDirty` 는 RHF. 저장 성공 시 `replace` 이동으로 언마운트되어 가드가 걸리지 않는다 | `/portfolio/case-studies/new` 에서 과제를 입력 → ① 탭 닫기 ② 사이드바 '포트폴리오' 링크 클릭 ③ 브라우저 Back — 각각 discard 다이얼로그. 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의: '취소'·'목록으로' 버튼은 가드를 우회한다**(§3 · §5 #9) | pass |
| FEEDBACK-06 | FEEDBACK | **N/A** | **편집 가능한 폼을 담은 modal 이 이 화면에 없다.** 이 화면의 modal 은 삭제 확인(FS-025-EL-010/011)·충돌(FS-025-EL-031)·미저장 가드(FS-025-EL-030)뿐이며 전부 입력 필드가 없는 `ConfirmDialog` 다 — dirty 상태 자체가 존재하지 않는다. IA-06 의 무게 규칙대로 이 엔티티(10필드 + 이미지 11장)의 폼은 **전용 라우트**다 | 재현 대상 없음 | n-a |
| A11Y-01 | A11Y | 상속 | 이 화면은 toast 를 6갈래로 띄운다(노출 토글 성공/실패 · 삭제 성공 · 일괄 삭제 성공 · 등록/저장 성공 · 다이얼로그 취소) — 전부 `ToastProvider` 의 **항상 마운트된** live region 에 주입된다: `ToastProvider.tsx:165` `role="status" aria-live="polite"`, `:168` `aria-live="assertive"`(error) | 노출 토글 후 스크린리더가 `'<제목>' 을(를) 게시했습니다.` 를 읽는지. 판정 정본은 ToastProvider 소유 문서 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면(삭제·일괄 삭제·충돌·discard)이 전부 DS `ConfirmDialog` → `Modal` 이다. `Modal.tsx:157-158` `aria-labelledby` + `aria-describedby` — 제목과 목적(message)이 함께 announce 된다 | 삭제 다이얼로그 open 시 스크린리더가 `'<제목>' 을(를) 삭제합니다…` 를 읽는지. 판정 정본은 DS 문서 | 종속 |
| A11Y-11 | A11Y | 직접(+앱 전역) | **8개 중 7개 충족 — 1개 미충족.** ① **describedby 절 — 충족**: `aria-invalid` 를 쓰는 이 화면의 모든 컨트롤이 `aria-describedby` 로 이유를 연결한다 — `CaseStudyFormPage.tsx:130-133`(업종) · `:151-152`(일자) · `:167-168`(제목) · `:182-183`(고객사), `TextareaField.tsx:66-67`(과제·해결·성과 3개, 자체 배선), `ImageUploadField`/`ImageGalleryField`(`aria-invalid` 를 쓰지 않고 describedBy 만 — 짝 없는 위반이 아니다). 회귀는 `shared/a11y-guard.test.ts` 가 고정한다. ② **required 절 — F3a 가 대부분 닫았다**: `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 **런타임 `cloneElement`** 로 자식 컨트롤의 `aria-required` 에 주입한다(대상 판별 `:36-41`). 이 폼의 필수 8개 중 **7개가 주입 대상**이다 — 업종(자식이 DS `SelectField`, `:126`) · 일자(`:145` `input`) · 제목(`:159` `input`) · 고객사(`:174` `input`) · 과제·해결·성과(`TextareaField.tsx:64-65` 가 native `required`+`aria-required` 를 스스로 건다). ③ **남은 1개 — 대표 이미지**: `PortfolioMediaFields.tsx:51-59` 의 `ImageUploadField required` 는 `FormField` 를 **쓰지 않고**(`ImageUploadField.tsx:222-230` 자기 `<span>` 라벨 + `aria-hidden` `*` 마커) 주입 경로 밖이다 — 드롭존 `<button>`(`:232-245`)에도 hidden `<input type="file">`(`:269-279`)에도 `required`/`aria-required` 가 없다 | ① `aria-describedby` 없는 `aria-invalid` grep = 0 → **통과**. ② 빈 폼 제출 후 입력의 `aria-describedby` === `role=alert <p>` id → **통과**. ③ **⚠ grep 으로 판정하지 말 것** — 주입이 런타임이라 소스에 리터럴이 없다(앱 전역 grep 1건은 무관한 수동 override). RTL 로 `getByLabelText` 7개의 `aria-required` === `'true'` → **7개 통과**. `getByRole('button', { name: /대표 이미지 이미지 업로드/ })` 의 `aria-required` → **null = 미충족**. 범위: 앱 전역(@tds/ui `ImageUploadField` 계약) | **gap** |
| A11Y-12 | A11Y | **N/A** | **좌측 필터 list item 표면이 이 화면에 없다.** 필터는 툴바의 `<select>` 하나이고(`CaseStudyListPage.tsx:103-117`), `filterItemStyle` 토글 버튼·`*Filter.tsx`·`*Panel.tsx` 가 존재하지 않는다 — `aria-pressed` 로 표기할 selected state 자체가 없다(`<select>` 는 네이티브 selected 를 쓴다). 이 화면 소스에 `aria-current` 0건 | 재현 대상 없음. 앱 전역 가드는 `shared/a11y-guard.test.ts` 가 유지한다 | n-a |
| MOTION-01 | MOTION | 상속 | Modal 표면이 실재한다(삭제·일괄 삭제·충돌·discard). enter/exit transition 은 DS `Modal` organism 소유이며 이 화면은 자체 애니메이션을 두지 않는다 | 삭제 다이얼로그 open/close 시 backdrop fade + dialog scale, exit 후에만 DOM 제거. **참고(코드 대조)**: `packages/ui/src` 에 `AnimatePresence`/`motion.` 소비 0건, `Modal.css` 에 enter/exit 선언 없음 — DS 미도입으로 보인다. 판정 정본은 DS 문서 | 종속 |
| MOTION-02 | MOTION | 상속 | Toast 표면이 실재한다(§A11Y-01 의 6갈래). exit 애니메이션은 `ToastProvider`/`Toast` 소유 | toast auto/manual dismiss 시 exit 애니메이션 재생 여부. **참고**: `AnimatePresence` 소비 0건. 판정 정본은 DS 문서 | 종속 |
| MOTION-03 | MOTION | 상속(+앱 전역) | **이 화면은 `ToggleSwitch` 를 두 곳에서 쓴다** — 목록 노출 토글(`_shared/publishColumn.tsx:20`)과 폼 노출 토글(`_shared/PortfolioMediaFields.tsx:73`). quality-bar 가 appliesTo 로 지목한 그 표면이 실재한다. `ToggleSwitch.css` 의 `.tds-toggle__knob { transition: transform var(--tds-motion-duration-fast) }` 와 `.tds-toggle__track { transition: background-color … }` 에 **`@media (prefers-reduced-motion: reduce)` off 블록이 없다** — 파일 전체에 해당 미디어 쿼리 0건(Button/Toast/Tabs 등 8개 CSS 에는 있다) | `prefers-reduced-motion: reduce` 를 켠 채 목록의 노출 토글을 누른다 → **knob 이 여전히 transform transition 으로 미끄러진다**(즉시 이동해야 한다). `grep -c 'prefers-reduced-motion' packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css` = 0. 범위: 앱 전역(DS) | **gap** |
| IA-01 | IA | 직접 | 이 화면의 세 라우트가 전부 AppShell layout route 아래에 있다 — `App.tsx:201-203`(`/portfolio/case-studies` · `/new` · `/:id/edit`)가 `:324-342` 의 `<Route element={<RequireAuth><AppShell/></RequireAuth>}>` 자식이다. **이 화면은 자체 outer frame 을 도입하지 않는다** — `CaseStudyListPage` 는 `CrudListShell` 하나만, `CaseStudyFormPage` 는 `FormPageShell` 하나만 반환한다 | 세 경로에서 사이드바·AppHeader 가 한 벌만 렌더되는지. 이 화면 소스에 `<aside>`·`<header>`·`<main>` grep = 0 | pass |
| IA-02 | IA | 직접 | **절반 해소 — 여전히 미충족(사유 전환).** ✔ **해소된 것 — 가지 라벨 폴백**: 통합이 `findCoveringLeaf`(`nav-config.ts:260-278`)를 도입해 '자기를 감싸는 **가장 긴 잎**'을 쓴다. `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` → `/portfolio/case-studies/new` 는 잎 `/portfolio/case-studies`(`nav-config.ts:140`)에 덮여 **'성공 사례'** 를 돌려준다(예전의 브랜치 라벨 '포트폴리오 관리' 가 아니다). `nav-config.test.ts:16-40` 이 고정한다. ✘ **남은 것 둘**: ① **`<h1>` 이 2개다** — `AppHeader.tsx:101` 과 `FormPageShell.tsx:160` `<h1>성공 사례 등록</h1>` 이 **동시에** 렌더된다 → 요구의 '**단일 title 메커니즘**' 미충족. 목록은 in-content h1 이 없어 목록/폼의 title 소스가 다르다. ② **행위가 AppHeader 제목에 없다** — `nav-config.ts:294-296` 주석이 '등록/수정 같은 **행위**는 제목에 넣지 않는다'를 의도로 명시한다 | `/portfolio/case-studies/new` 를 연다 → 헤더 `<h1>` = **'성공 사례'**(폴백 해소). 그러나 `document.querySelectorAll('h1').length` = **2**('성공 사례' + '성공 사례 등록'), 두 텍스트가 다르고 **어느 쪽이 primary 인지 정의돼 있지 않다** | **gap** |
| IA-04 | IA | 직접 | **부분 충족.** 템플릿의 앞 네 요소는 성립한다: toolbar row 우상단 primary '성공 사례 등록'(`CaseStudyListPage.tsx:118-121`) + 좌측 필터(`:102-117`) → count 요약(`CrudListShell.tsx:118-122`) → SelectionBar(`:125-133`) → table(`:135`). **마지막 요소인 Pagination 이 없다** — `CrudListShell` 전체에 `Pagination` import·렌더 0건이고 `useCrudList` 는 `fetchAll` 전량을 그대로 `items` 로 준다. 사례 수에는 상한이 없다 → 'page size 초과 가능' 조건에 해당하므로 면제되지 않는다 | 픽스처에 사례를 11건 이상 넣고 목록을 연다 → **페이지네이션이 렌더되지 않고 전량이 한 화면에 쌓인다**. `grep -rn 'Pagination' apps/admin/src/shared/crud/` = 0 | **gap** |
| IA-05 | IA | 직접 | `App.tsx:202-203` 이 `/portfolio/case-studies/new` 와 `/portfolio/case-studies/:id/edit` 를 **같은 `<CaseStudyFormPage />`** 로 해석한다. 분기는 `useCrudForm.ts:73-74` 의 `useParams().id` 유무 하나뿐이며, 레이아웃은 동일하고 title('성공 사례 등록'/'수정')·버튼 라벨·prefill(`:125-128` `reset(toValues(item))`)만 다르다. create 전용/edit 전용 페이지가 없다 | `App.tsx` 의 두 라우트 element 가 동일 컴포넌트 참조인지. `/new` 와 `/:id/edit` 의 DOM 구조가 동일하고 title·라벨·초기값만 다른지 | pass |
| IA-13 | IA | 직접 | **미충족.** list query state(업종 필터)가 **컴포넌트 `useState` 에만 있다** — `CaseStudyListPage.tsx:56` `const [filter, setFilter] = useState<CaseFilter>(CASE_FILTER_ALL)`. 파일에 `useSearchParams`·`useListState` import 0건. `parseFilter`(`:106`)로 값을 타입 안전하게 좁히기는 하지만 **그 값이 URL 로 나가지 않는다** — 안전한 값을 URL 없이 들고 있을 뿐이다. **F3b 가 `shared/crud/useListState`(URL 단일 원천)를 37개 화면에 롤아웃했고 같은 섹션의 `support/{downloads,replies,tickets}` 도 소비처가 됐지만**(`DownloadListPage.tsx:87` · `RepliesPage.tsx:76` · `TicketListPage.tsx:129`) **`pages/portfolio/**` 3화면은 전부 그 밖에 남았다.** 정렬은 서버 고정이라 URL 대상이 아니고, page·keyword 는 표면 자체가 없다 | 업종을 '금융'으로 바꾼 뒤 ① F5 → **'전체 업종'으로 되돌아간다** ② 행을 눌러 수정 폼에 갔다가 Back → **필터가 풀린 목록에 착지한다** ③ 주소창 URL 을 복사해 새 탭에 붙여넣기 → **필터가 재현되지 않는다**(URL 에 `?` 가 아예 붙지 않는다). `grep -rn 'useSearchParams\|useListState' apps/admin/src/pages/portfolio/` = **0**(앱 전체로는 37개 화면). 대조: `/support/downloads` 에서 같은 조작을 하면 URL 에 `?category=…` 가 붙고 Back·F5 를 견딘다 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면의 라우트가 **두 겹의 ErrorBoundary** 안에 있다: `App.tsx:311-315`(루트) + `AppShell.tsx:484-489`(`<Outlet>` 바로 바깥, `resetKey={pathname}`, fallback `RouteErrorScreen`). 후자가 이 화면의 렌더 예외를 잡아 사이드바·헤더가 살아남고 **다른 화면으로 이동하는 것만으로 경계가 스스로 풀린다**. 경계가 `RequirePermission` 보다 바깥이라 403 화면이 던져도 앱이 죽지 않는다 | `CaseStudyListPage` 렌더에 강제 throw → 사이드바 유지 + 복구 UI(오류 참조 코드 포함), 다른 메뉴 이동 가능, 앱이 unmount 되지 않는다 | pass |
| EXC-02 | EXC | 상속 | ① **auth guard**: `App.tsx:324-329` 가 `RequireAuth` 를 **AppShell 바깥**에 둔다 — 세션이 없으면 셸도 그리지 않고 `/login?returnUrl=<현재 경로>` 로 보낸다. ② **401 인터셉터**: `queryClient.ts:41-43` 이 `QueryCache`/`MutationCache` 의 `onError` **한 곳**에서 `isUnauthorized → notifySessionExpired()` 를 판정한다 — 이 화면의 모든 조회·쓰기가 그 계층을 통과하므로 화면별 배선이 없다 | 세션 없이 `/portfolio/case-studies` 딥링크 → `/login?returnUrl=%2Fportfolio%2Fcase-studies`, 로그인 후 복귀. `?status=list:401` → 세션 만료 경로 발화 | pass |
| EXC-03 | EXC | 직접 | **부분 충족 → 미충족.** ① **route-level authorization 은 성립한다**: `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸 read 권한이 없으면 `ForbiddenScreen` 을 렌더한다. `route-resource.ts:36-46` 이 경로에서 리소스를 파생하므로(`/portfolio/case-studies/:id/edit` → leaf `/portfolio/case-studies`) **폼 라우트까지 자동으로 덮인다**. 강등 reconcile 도 권한 스토어 구독으로 성립한다. ② **write-action 게이팅이 이 화면에 없다**: `useRouteWritePermissions`(`RequirePermission.tsx:45`)는 **더 이상 소비처 0 이 아니다 — 7곳이 쓴다**(`products/{categories/ProductCategoriesPage.tsx:181, items/ProductListPage.tsx:119, returns/ReturnDetailPage.tsx:110}` · `settings/{api-keys/ApiKeysPage.tsx:59, languages/LanguagesPage.tsx:126, oauth/OAuthPage.tsx:78, site/SiteSettingsPage.tsx:109}`; 형제 `useRouteCan` 은 `logs/components/LogListShell.tsx:115`). **가장 가까운 선례가 `products/items/ProductListPage.tsx:119` — 이 화면과 같은 `useCrudList`+`CrudListShell` 목록인데 그쪽은 `canCreate` 를 본다.** 그런데도 '성공 사례 등록'(`CaseStudyListPage.tsx:118`) · 행 액션(`CrudTable.tsx:192-197`) · 일괄 삭제(`CrudListShell.tsx:126-132`) · 노출 토글(`publishColumn.tsx:22-30`)이 `can()` 을 보지 않고 무조건 렌더된다 | ① read-forbidden 역할로 딥링크 → 403 화면 = **통과**. ② delete 권한이 없는 역할로 목록을 연다 → **행 삭제·일괄 삭제 버튼이 그대로 보이고 눌린다** = 미충족. `grep -rn 'useRouteWritePermissions\|useRouteCan' apps/admin/src/pages/portfolio/` = **0**(앱 전체로는 8건). 범위: **이 화면**(공용 훅 + 7곳 선례 존재) | **gap** |
| EXC-04 | EXC | 직접 | **부분 충족 → 미충족.** ① **동시 삭제는 잡는다(포트폴리오와 갈리는 지점)**: 이 화면은 `createCrudAdapter` 를 쓰므로 `update`(`crud.ts:71-73`)·`remove`(`:82-84`)가 대상 존재를 확인하고 없으면 **`HttpError(409)`** 를 던진다 → `useCrudForm.ts:160-172` 가 입력을 보존한 채 충돌 다이얼로그를 띄운다(`FormFeedback.tsx:58-75`). **유령 저장·유령 토스트가 발생하지 않는다** — NFR-023 의 EXC-04 gap 사유 중 하나가 여기엔 없다. ② **그러나 optimistic-concurrency token 이 없다**: `CaseStudy`(`types.ts:9-25`)에 `updatedAt`·`version` 이 없어 If-Match/ETag 로 보낼 값이 존재하지 않는다 → **동시 *수정* 은 감지되지 않고 마지막 쓰기가 이긴다**. 요구의 첫 문장('mutable record 의 write 에 optimistic-concurrency token 을 보낸다')이 미충족. ③ **대가가 크다**: 노출 토글이 전체 치환 PUT(`toCaseStudyInput(item)` + 새 `published`)이라, 목록을 연 뒤 남이 과제·해결·성과를 고쳤는데 내가 스위치만 눌러도 **낡은 전체 항목이 그 수정을 되돌린다**(자유 텍스트 3개 손실) | ① 탭 A 에서 `/portfolio/case-studies/cs-1/edit` → 다른 경로로 `cs-1` 삭제 → 탭 A 에서 저장 → **충돌 다이얼로그가 열리고 입력이 보존된다** = 통과. ② 목록을 연 채로 `cs-1` 의 성과를 수정 → 목록으로 돌아가지 않고 그 상태에서 `cs-1` 노출 토글 → **성과가 이전 값으로 되돌아간다**(경고 없음) = 미충족. ③ `grep -n 'updatedAt\|version\|If-Match' apps/admin/src/pages/portfolio/case-studies/` = 0 | **gap** |
| EXC-08 | EXC | 직접 | ① **동기 제출 락**: `useCrudForm.ts:103` `submitLockRef` + `:201-203` `if (submitLockRef.current) return; submitLockRef.current = true` — RHF 비동기 검증과 `disabled={saving}` 렌더 사이의 틈을 ref 가 닫는다. `:213-215` `onSettled` 와 `:246-248` `onInvalid` 가 해제한다. ② **disable**: `FormPageShell.tsx:189` `disabled={saving || loadingDetail}`. ③ **멱등키가 mutationFn 밖에 있고, 이제 어댑터까지 도달한다**(F3b): `:118-123` `idempotencyKeyRef` + `takeIdempotencyKey()` 가 **제출 시도 단위**로 키를 잡고 `:211` 에서 뽑아 `:228`·`:235` 의 **variables 에 싣는다**(`crud.ts:279`·`:301` → `:288`·`:310` `adapter.create/update(…, { signal, idempotencyKey })`). 이 화면의 `createCrudAdapter` 는 그 키로 ledger 를 돌린다(`crud.ts:91` `createIdempotencyLedger()` · `:113-116` create · `:121` update) — 같은 키의 재시도는 재적용 없이 최초 응답을 재생하고, **기록은 적용 성공 후에만** 한다(`:55-60`). `:220` 성공 시에만 키를 버린다. 삭제·일괄 삭제·토글도 요청 중 컨트롤을 잠근다 | 등록 폼을 채우고 **Enter 를 연타**한다(응답 400ms 전) → 요청 1건, 사례 1건만 생성. `?status=save:500` 후 재제출 → `idempotencyKeyRef` 가 같은 키를 유지하고 그 키가 어댑터에 도달한다. `crud.test.ts` 가 ledger 재생을 고정한다. `TODO(backend): Idempotency-Key` 헤더 심은 `crud.ts:39` | pass |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort`(`shared/async.ts:40-42`)를 모든 경로가 쓴다: 삭제 `useCrudList.tsx:110` · 노출 토글 `useCrudRowUpdate.ts:52` · 폼 저장 `useCrudForm.ts:156`(handleWriteError 첫 줄) — **error toast·배너 없음**. `mutation.reset()` 은 `useCrudList.tsx:89`·`:120` 이 호출한다. list/cache 무변경: `:105`·`:136`·`useCrudRowUpdate.ts:48` 이 `controller.signal.aborted` 를 먼저 확인하고 조기 반환. **일괄 실패 count 에서 abort 제외**: `shared/bulk.ts:20` `result.status === 'rejected' && !isAbort(result.reason)` | 삭제 확인 → in-flight(400ms) 중 Esc/딤 클릭 → **거짓 실패 토스트 없이** 버튼 상태 복원, 목록 무변경. 폼 저장 중 사이드바로 이탈 → 언마운트 abort(`useCrudForm.ts:92`), 토스트 없음. 일괄 삭제 중 취소 → 실패 건수 0 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 · **STATE-02** · STATE-04 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · IA-01 · IA-05 · EXC-01 · EXC-02 · EXC-08 · EXC-09 |
| `종속` | **8** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 |
| `n-a` | **3** | COMP-10(텍스트 검색 표면 없음) · FEEDBACK-06(편집 폼 모달 없음) · A11Y-12(좌측 필터 표면 없음) |
| `gap` | **7** | A11Y-11 · MOTION-03 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 |

**검산: 12 + 8 + 3 + 7 = 30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30)

> **`4b805ad` 기준 재판정 결과: P0 의 판정이 뒤집힌 것은 0건이다.** F3a·F3b·통합은 이 화면의 P0 gap 7건 중 어느 것도 완전히 닫지 못했고, **A11Y-11 의 범위를 8→1 로 좁혔을 뿐**이다(남은 것은 `ImageUploadField` 하나). **좁혀진 gap 도 gap 이다** — pass 로 올리지 않았다. 반면 **P1 2건은 실제로 pass 가 됐다**(ERP-13 · EXC-08 의 멱등키 절 — §3 참조). EXC-03·IA-13 은 사유가 '앱 전역 미비' → **'이 화면의 미소비'** 로 바뀌었다(공용 훅과 선례가 각각 7곳·37곳에 실재한다).
>
> **NFR-023 대비**: pass 11 → **12**, gap 8 → **7**. 차이는 **STATE-02 한 건**(§1.2) — 업종이 소스 상수라 표면 없는 read query 가 존재하지 않는다. **EXC-04 도 두 문서의 결이 다르다**: 이 화면은 `createCrudAdapter` 를 쓰므로 F2 때부터 409 를 냈고, 포트폴리오(`createStoreAdapter`)는 F3b 에 와서야 같아졌다 — **이제 두 팩토리가 같은 계약을 갖는다**(`crud.ts:126-128`·`:219-221`). 남은 EXC-04 gap 사유는 양쪽 모두 **동시성 토큰 하나**다.
>
> **P0 gap 7건 = quality-bar '배치 실패' 사유.** 7건 중 **이 화면 고유는 3건**(IA-13 · EXC-03 · EXC-04)이고 — IA-13·EXC-03 은 공용 훅을 소비만 하면 되고, EXC-04 는 도메인 타입에 `version` 이 필요하다 — **4건은 앱 전역/DS 범위**(A11Y-11 · MOTION-03 · IA-02 · IA-04)로 이 화면만 고쳐서는 해소되지 않는다. §5 의 '범위' 열이 이를 가른다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다. **NFR-023 §3 과 대부분 같다** — 아래는 이 화면의 근거로 다시 확인한 것이며, **갈리는 항목은 굵게** 표시했다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery`(`crud.ts:151`)가 `placeholderData: (previous) => previous`, `CrudListShell.tsx:118-122` 가 재조회 중 건수 유지 + '· 새로고침 중…'. `staleTime: 30_000` | 데이터가 있는 상태에서 '다시 시도' → 이전 행이 남는다. 30초 내 재마운트는 네트워크를 타지 않는다 | pass |
| STATE-05 | P1 | F2 가 `empty` 맥락을 배선했다 — `CaseStudyListPage.tsx:132-135` `{ hasActiveFilters: filter !== CASE_FILTER_ALL, onResetFilters }`. `Empty.tsx:53-99` 가 3분기 copy + 조사 계산을 소유한다('사례'는 받침이 없어 '가'). **단 `createAction` 미전달** → '진짜 비어있음' 분기에 복구 수단 없음. `hasQuery` 는 검색 표면이 없어 항상 false | 픽스처를 비운다 → '등록된 성공 사례가 없습니다', **CTA 없음**. '의료'로 필터(0건) → '필터에 맞는 성공 사례가 없습니다' + **'필터 초기화'** | gap(부분) |
| **STATE-06** | P1 | **NFR-023 과 갈린다 — 여기는 pass.** 쓰기가 `['case-studies','list']`·`['case-studies','detail',id]` 를 정확히 무효화한다(`crud.ts:180`·`:199-200`·`:218`). **NFR-023 의 gap 사유(`category-options` 키가 무효화되지 않음)가 여기엔 없다** — 업종이 상수라 무효화할 캐시가 없다. 이 화면은 다른 화면과 상태를 공유하지 않는다(자체 시드) | 노출 토글 후 목록 값이 즉시 갱신된다. 저장 후 목록 복귀 시 수동 새로고침 없이 새 값 | pass |
| COMP-01 | P1 | 모든 버튼이 DS `<Button>` — 등록(`CaseStudyListPage.tsx:118`) · 취소/저장(`FormPageShell.tsx:180-190`) · 일괄 삭제 · Alert 의 '다시 시도'. **단 저장 진행 표시가 `loading` prop 이 아니라 손수 쓴 '저장 중…'**(`FormPageShell.tsx:189`) | 이 화면 소스에 `buttonStyle(`·`tds-ui-btn-` grep = 0 → 통과. '저장 중…' 은 요구가 금지한 형태 | gap(부분) |
| COMP-02 | P1 | `CrudTable.tsx:124-129`·`:173-178`·`:130`·`:179`(SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell). raw checkbox 조립 0건 | 이 화면 표에 `<input type="checkbox">` 직접 조립 grep = 0 | pass |
| COMP-04 | P1 | zod-required 8필드(업종·일자·제목·고객사·과제·해결·성과·대표이미지)가 전부 `required` 마커를 렌더한다 — `FormField required`(`CaseStudyFormPage.tsx:125`·`:144`·`:158`·`:173`), `TextareaField required`(`:190`·`:204`·`:218`), `ImageUploadField required`(`PortfolioMediaFields.tsx:53`). 본문 이미지는 선택이라 마커 없음(스키마와 일치) | 각 라벨 텍스트 옆에 `*` 가 인접 렌더되는지 | pass |
| COMP-06 | P2 | `CrudTable.tsx:144` `Array.from({ length: 5 })` — 행 수 5 하드코딩. 열 수는 `:112` `columns.length + 3` 으로 파생(절반 충족) | skeleton `length: 5` grep → 1건 히트 | gap |
| **COMP-09** | P2 | **NFR-023 과 truncate 대상이 반대다.** 성과만 자른다(`CaseStudyListPage.tsx:44-50` `resultCellStyle` — maxWidth + ellipsis + nowrap). **고객사는 `nowrap` 만이라**(`:85`) 60자 고객사가 컬럼을 민다 — 포트폴리오는 고객사를 자른다. 제목은 양쪽 다 truncate 없음. hover/expand 전문 노출 경로 없음 — **500자 성과가 ellipsis 뒤로 사라진다** | 500자 성과 + 60자 고객사 + 120자 제목을 가진 사례를 넣는다 → 성과는 잘리고 고객사·제목이 표 폭을 민다 | gap |
| COMP-12 | P2 | 과제·해결·성과(`TextareaField`)가 각각 'N/500' 실시간 카운터를 갖는다(`TextareaField.tsx:52`). **제목(120)·고객사(60)는 `maxLength` 만** 있어 상한에서 조용히 멈춘다 | 제목에 120자를 넘겨 입력 → 경고 없이 잘린다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙 성립 — 쓰기 성공/실패 = toast(`useCrudRowUpdate.ts:49`·`:53`), read 실패 = 인라인 Alert(`CrudListShell.tsx:157`), 다이얼로그 내부 실패 = 그 다이얼로그 배너(`useCrudList.tsx:111`·`:138`). 페이지가 임의 배너 state 를 갖지 않는다. **단 실패 toast 에 '다시 시도' 가 없다** | `?fail=case-studies:save` 로 노출 토글 → 실패 toast 가 뜨지만 재시도 버튼이 없다 | gap(부분) |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 양 경로에 피드백을 갖는다 — 토글·삭제·일괄 삭제·저장. no-op state 없음 | `?fail=all` 로 각 액션 구동 → 전부 사용자 가시 실패 | pass |
| FEEDBACK-05 | P2 | 모든 delete 가 confirm 게이트를 지난다(FS-025-EL-010/011). undo window 없음 | 단일 미확인 클릭 delete 0건 | pass |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 소유. 이 화면의 delete/discard intent 가 상속 | 삭제 다이얼로그 open 시 activeElement = 취소 버튼 | 종속 |
| A11Y-05 | P1 | 업종 select 가 `SelectField isInvalid`(`CaseStudyFormPage.tsx:128`)를 쓰고 DS 가 `aria-invalid` 를 싣는다. 호출부가 `aria-describedby` 도 직접 넘긴다(`:131-133`) | 위반 시 `<select aria-invalid="true" aria-describedby="case-industry-error">`. **단 기본값이 유효해 이 상태를 UI 로 만들 수 없다**(FS-025 §7 #13) | pass |
| A11Y-06 | P1 | AppShell 이 skip link 를 소유(`AppShell.tsx:289-306`·`:429`). 이 화면이 그 아래에서 렌더 | 목록에서 첫 Tab → '본문으로 건너뛰기' 가시화 | 종속 |
| A11Y-07 | P1 | `AppShell.tsx:324-340` `RouteFocusAnnouncer` 가 라우트 변경 시 `<main>` 포커스 + polite announce. 이 화면의 목록↔폼 이동이 상속 | 목록 → `/new` 이동 시 activeElement = `#tds-main` | 종속 |
| A11Y-08 | P1 | **행 안에 keyboard-focusable 이름 링크가 없다.** 제목이 평문(`CaseStudyListPage.tsx:84`)이고 행 이동은 `useRowNavigation.rowActivateProps`(`CrudTable.tsx:172`) — **마우스 전용**이다. 키보드 사용자는 행 액션의 '수정' 버튼으로만 같은 목적지에 갈 수 있다 | 행을 Tab 으로 순회 → 체크박스·토글·수정·삭제에만 멈춘다. 제목은 포커스를 받지 않는다 | gap |
| A11Y-13 | P1 | **검증 실패 시 첫 오류 필드 포커스는 성립한다** — `useCrudForm.ts:253` `handleSubmit(onValid, onInvalid)` + RHF `shouldFocusError`, `:234-238` 주석이 계약으로 명시. 서버 422 도 `:184` `setFocus(first.field)`. **폼 진입 시 첫 필드 자동 포커스는 없다** | 빈 폼 제출 → activeElement = 일자(업종은 기본값이 유효해 통과하므로 첫 오류가 일자다). `/new` 진입 직후 activeElement = body | gap(부분) |
| A11Y-14 | P2 | `ImageUploadField.tsx:244-249` 의 '업로드 완료' 안내가 `role="status"`/`aria-live` 없는 `<span>` | 이미지 업로드 → 스크린리더가 완료를 읽지 않는다 | gap |
| A11Y-16 | P1 | 이 화면은 신규 인터랙티브 표면을 도입하지 않는다 — 전부 DS/공용 프레임워크 컴포넌트 소비 | axe 검사 대상. 판정 정본은 각 컴포넌트 계약 | 종속 |
| MOTION-04 | P1 | `CrudTable` 행 add/remove 에 FLIP/layout motion 없음 — 삭제 시 나머지 행이 즉시 스냅 | 사례 삭제 → 아래 행들이 애니메이션 없이 튀어 올라온다 | gap |
| IA-03 | P1 | 3라우트 중 2개가 non-top-level(`/new`·`/:id/edit`)인데 **breadcrumb 이 없다** — AppHeader 는 단일 라벨만(`AppHeader.tsx:101`) | `/portfolio/case-studies/new` 에 '포트폴리오 관리 > 성공 사례 > 등록' trail 없음 | gap |
| IA-06 | P1 | 무게 규칙과 일치 — 성공 사례는 rich 엔티티(10필드 + 이미지 11장)라 **전용 form route**(`App.tsx:202-203`). 이 도메인에는 taxonomy modal 이 없다(업종이 상수) | edit 가 modal 로 열리지 않고 `/:id/edit` 라우트로 가는지 | pass |
| IA-07 | P1 | `FormPageShell.tsx:147-155` 가 '목록으로' + `ChevronLeftIcon` 을 좌상단에 단일 형태로 그린다 | 폼 back-link 라벨 = '목록으로', 아이콘 = ChevronLeft | 종속 |
| IA-08 | P1 | `FormPageShell.tsx:179-191` 이 in-card footer 에 취소(좌)·저장(우) 고정 배치 | 등록/수정 폼의 버튼 상대 위치·컨테이너 동일 | 종속 |
| IA-14 | P1 | 이 화면의 표는 8열이고 bounded 가로 scroll 컨테이너가 없다(`CrudTable.tsx:116`). **성과 열(폭 상한 `space-6 * 12`)이 포트폴리오의 고객사 열(`* 10`)보다 넓어** 좁은 뷰포트에서 더 빨리 넘친다 | 375px 에서 목록 → 표가 page grid 를 넘치는지 | gap |
| **ERP-01** | P1 | **NFR-023 과 갈린다.** 업종 tone 을 `industryTone`(`types.ts:64-66`)이 **옵션 상수의 고정 매핑**으로 정한다(포트폴리오는 id 해시). 공유 status→tone 레지스트리를 쓰지 않지만, **업종은 ERP lifecycle status(대기/승인/반려)가 아니라 도메인 분류**라 요구의 대상이 아니다. 6종이 4톤을 나눠 써 유통/의료(info), 금융/IT·서비스(success)가 겹친다 — 색만으로 구분되지 않지만 **라벨이 함께 있어** 이중 인코딩은 성립한다 | 같은 업종이 항상 같은 톤인지(상수라 안정) | n-a(사유: ERP lifecycle status 표면 아님) |
| **ERP-08** | P2 | **일자가 목록에 아예 없다**(FS-025 §7 #4) — 정렬 기준인데 열이 없어 포맷터 경유 여부를 물을 대상조차 없다. 건수는 `formatNumber` 를 쓴다(`CrudListShell.tsx:119`). 표 셀에 raw `toString()` 0건 | 목록 열에 날짜가 없다. **포트폴리오는 일자 열이 있고 원문을 쓴다** — 두 화면이 갈린다 | gap(연동: FS-025 §7 #4) |
| ERP-12 | P1 | 목록 export(CSV/xlsx) affordance 없음. 툴바에 등록 버튼만 | 목록 툴바에 내보내기 버튼 없음 | gap |
| **ERP-13** | P1 | **해소됨(통합).** 조사 헬퍼가 `shared/format.ts:269+`(`objectParticle` `:306` · `topicParticle` `:311`)로 승격됐고 — 이전엔 `logs/josa.ts` 등 3곳 사본 — 이 화면의 사용자 대상 문구가 전부 그것을 경유한다: `useCrudForm.ts:222`(등록/저장 토스트) · `FormPageShell.tsx:129-130`(로드 실패) · `useCrudList.tsx:108`·`:158`(삭제 토스트·확인 문구) · `shared/crud/validation.ts:17,20`(`requiredText`)·`:67`(`requiredImage`) · `CaseStudyListPage.tsx:94-95`(노출 토글 토스트). **'성공 사례'는 받침이 없으므로 이제 '를'·'는' 이 나온다** — 예전의 '성공 사례을(를)' 은 사라졌다. 같은 화면의 `Empty`(`Empty.tsx:16-28`, 자족 헬퍼 — 레이어 경계상 앱 shared 를 import 할 수 없다)와 **문법이 일치한다** | 사례를 등록 → **'성공 사례를 등록했습니다.'** 토스트. 빈 상태는 '등록된 성공 사례가 없습니다'. 항목 '옴니채널 개편으로 재구매율 상승'(받침 ㅇ) 삭제 → `…'을 삭제했습니다.`. **앱 전체에서 사용자 대상 `'을(를)'`/`'이(가)'`/`'은(는)'` 리터럴 grep = 0**(잔여 히트 12건은 주석·헬퍼 설명문·'이 리터럴을 내지 않는다'를 단언하는 테스트) | pass |
| ERP-15 | P1 | 페이지네이션도 virtualization 도 cap 도 없다 — `fetchAll` 전량이 DOM 으로 간다(IA-04 gap 과 같은 뿌리). 8열이라 가로 overflow 전략도 없다 | 픽스처를 1,000건으로 늘린다 → 전량 렌더, scroll/selection jank | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 앱 전역 0건. 모든 요청이 상한 없는 `shared/async.wait()` 에 의존 | never-resolving fixture → 무한 spin, 타임아웃 메시지 없음 | gap |
| **EXC-06** | P1 | **NFR-023 보다 낫지만 여전히 부분이다.** 타입은 준비됐고(`HttpError` 가 status 를 싣고 화면이 분기), **이 화면 어댑터는 실사용 경로에서 status 를 두 갈래 실어 준다** — `fetchOne` 의 404(`crud.ts:55`), `update`/`remove` 의 409(`:71`·`:82`). 그래서 404 not-found 와 409 conflict 가 **실제로** 발화한다. **그러나 `?fail=` 는 여전히 status 없는 `new Error(…)`**(`dev.ts:91`)이고, 403/422/429/500 을 내는 실사용 경로가 없다(백엔드 없음) | `/portfolio/case-studies/zzz/edit` → **'찾을 수 없습니다 + 목록으로'**(404 분기 생존 — 포트폴리오는 여기서 실패한다). `?status=save:422` → 필드 인라인 경로. `?fail=save` → generic 배너(status 없음) | gap(부분) |
| EXC-07 | P1 | `useCrudForm.ts:176-186` 이 422 의 `violations` 를 RHF `setError` 로 그 입력에 꽂고 첫 필드로 포커스를 옮긴다 — form-level 배너는 generic 전용(`:188`). **단 `dev.ts` 의 422 가 `violations` 를 싣지 않아**(`:84` `new HttpError(status, STATUS_MESSAGE[status])`) `:176` 의 `violations.length > 0` 조건에서 탈락해 배너로 폴백한다 — **경로를 재현할 수 없다** | `?status=save:422` → 필드 인라인이 아니라 배너가 뜬다(픽스처 한계). 실서버 연결 시 BE-025 §6 의 '필드 오류는 422 + `error.fields`' 계약이 지켜져야 발화한다 | gap(부분) |
| **EXC-10** | P1 | `settleAll`(`bulk.ts:19-21`)이 allSettled 로 부분 실패를 **건수만** 돌려준다 — 실패 id 를 반환하지 않아 '실패분만 재시도'가 불가능하다. 다이얼로그 유지·선택 유지·전원 성공 시에만 invalidate 는 성립(`useCrudList.tsx:135-148`). **이 화면은 어댑터가 409 를 던져 부분 실패가 실제로 잘 발생한다** — 다른 관리자가 먼저 지운 항목이 섞이면 그 건만 실패한다 | 3건 중 1건을 먼저 삭제한 뒤 3건 일괄 삭제 → '3건 중 1건을 삭제하지 못했습니다' 가 뜨지만 **어느 것인지 알 수 없고** 재시도가 3건 전부를 재실행한다 | gap(부분) |
| EXC-11 | P1 | `navigator.onLine` 앱 전역 0건 | offline 토글 → 배너 없음, write 가 설명 없이 실패 | gap |
| **EXC-12** | P1 | **NFR-023 과 갈린다 — 여기는 pass.** `useCrudForm.ts:138-143` 이 `isNotFound(loadError)` 로 `'not-found' \| 'error'` 를 만들고 `FormPageShell.tsx:115-143` 이 두 문구·복구 수단을 가른다. **그리고 이 화면의 `createCrudAdapter.fetchOne`(`crud.ts:54-57`)이 `HttpError(404)` 를 실어 던져 그 분기가 실제로 산다** — 포트폴리오의 `store.getItem`(generic Error)과 결정적으로 다르다 | 없는 `:id` 로 `/portfolio/case-studies/zzz/edit` → **'성공 사례을(를) 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'**(재시도 버튼 없음 — 재시도해도 영원히 없으므로 옳다). `?status=detail:500` → '불러오지 못했습니다' + '다시 시도' + '목록으로'. 무한 loading 없음 | pass |
| EXC-14 | P1 | 노출 토글이 **비관적** — `useCrudRowUpdate.ts:44-59` 는 plain `mutate` + `pendingId` 이고 `onMutate`/snapshot/rollback 이 없다. create/delete 가 confirm+busy 로 pessimistic 인 것은 요구와 일치 | 노출 토글 클릭 → 400ms 동안 값이 그대로이고 스위치만 잠긴다(즉시 반영 아님). `?fail=case-studies:save` → 되돌릴 낙관 반영이 없으므로 rollback 도 없다 | gap |
| EXC-15 | P1 | 업로드 전 client 검증 성립 — `ImageUploadField.tsx:19-25` `imageFileError(file, 5)` 가 type/size 를 막고 인라인 거절(`:154-157`), 요청 미발사. 로드 실패 fallback 은 갤러리만 `role="img"`(`ImageGalleryField.tsx:79`). **progress/cancel 경로 없음**(업로드 자체가 없으므로 — §5 #12) | 비이미지/6MB 파일 선택 → 인라인 거절, 값 미변경. progress 표시 없음 | gap(부분) |
| EXC-18 | P1 | selection scope 가 '지금 보이는 행 전량' — `CrudListShell.tsx:143-147` 이 `visibleItems.map(id)` 를 `toggleAll` 에 넘긴다. **Shift-click range·진행률·취소·대량 임계 강화 confirm 없음**. 페이지 개념이 없어 cross-page 'all' 문제는 발생하지 않는다 | 50행 선택에 체크박스 50번. 일괄 삭제 confirm 은 count 를 말하지만 임계 경고 없음 | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 draft 스냅샷·복원 없음. 만료 전 연장 프롬프트 없음. **이 화면의 폼은 자유 텍스트 3개(각 500자) + 이미지 11장이라 손실량이 크다** | dirty 폼에서 `?status=save:401` → 재인증 경로로 가고 입력이 사라진다 | gap |
| EXC-20 | P1 | `useCrudForm.ts:189` `setErrorReference(referenceOf(cause))` + `FormFeedback.tsx:38-47` 이 짧은 참조 코드(`TDS-<base36 시각>-<난수>`, `user-select: all`)를 친근한 문구와 함께 보인다. raw body/stack/status 를 산문으로 쓰지 않는다. `ErrorBoundary` 의 `RouteErrorScreen` 도 참조를 받는다 | `?status=save:500` → '저장하지 못했습니다…' + '오류 코드 TDS-…' 가 복사 가능하게 뜬다. `?fail=save`(generic Error)는 참조 코드가 없다(`referenceOf` 가 HttpError 만 본다 — 의도된 동작) | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 관측(코드 대조) |
|---|---|---|
| 목록 조회 응답 p95 | **≤ 400ms**(백엔드 연결 후, BE-025 EP-01) | 측정 불가 — 네트워크 0건. 픽스처는 `LATENCY_MS = 400` 고정 |
| 첫 렌더(목록 스켈레톤 표시까지) | ≤ 100ms(라우트 전환 후) | 코드 분할 없음 — `App.tsx:65-66` 이 `CaseStudyListPage`·`CaseStudyFormPage` 를 **정적 import**. 초기 번들에 포함 |
| 재조회 횟수(목록 1회 방문) | 1회 | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`. **이 화면은 목록 진입 시 요청이 1회다** — 업종이 상수라 두 번째 쿼리가 없다(**포트폴리오는 2회**) |
| 폼 진입(수정) 요청 수 | 1회 | 상세 1. **포트폴리오는 2회**(상세 + 분류 선택지) |
| 응답 페이로드 | **예산 미정 — 주의 필요** | `CaseStudy` 가 목록 응답에 **전문**(과제·해결·성과 각 최대 500자 + 이미지 URL 11개)을 싣는다. 목록 표는 그중 성과만, 그것도 ellipsis 로 보여 준다 — **1,500자 × N 을 받아 화면에는 한 줄만 쓴다**. 페이지네이션 승격(BE-025 §7.7 #5) 시 목록 전용 축약 타입을 함께 검토해야 한다 |
| DOM 행 수 | **상한 없음 — 예산 미정** | 페이지네이션·virtualization 부재(§5 #2) |
| 메모리(object URL) | 누수 없음 | `ImageUploadField.tsx:138-143`·`ImageGalleryField.tsx:122-128` 이 언마운트·교체·제거 시 `revokeObjectURL`. **단 저장된 `blob:` 문자열은 DB 로 간다**(§5 #12) |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 픽스처 응답을 인위적으로 늦춰 로딩 상태를 화면에서 볼 수 있게 하는 장치다. 백엔드 연결 시 이 상수는 사라진다 — **이 값을 SLO 로 읽지 마라.**

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도, 표 유지 시도 | **성립**(`CrudListShell.tsx:156-165`). 단 status 별로 갈리지 않는다(EXC-06) |
| 상세 조회 실패(404) | not-found 안내 + 목록으로(재시도 없음) | **성립** — 어댑터가 404 를 실어 던진다(`crud.ts:55`). **포트폴리오는 여기서 실패한다** |
| 상세 조회 실패(5xx) | 배너 + 재시도 + 목록으로 | **성립**(`FormPageShell.tsx:127-138`) |
| 저장 중 서버 500 | 배너 + 참조 코드 + 입력 보존 | **성립**(`FormFeedback.tsx:38-47`) |
| 저장 중 동시 **삭제** | 충돌 다이얼로그 + 입력 보존 | **성립** — `createCrudAdapter.update` 가 409 를 던진다(`crud.ts:71`). **포트폴리오는 유령 저장된다** |
| 저장 중 동시 **수정** | 충돌 다이얼로그 또는 diverge 표시 | **미성립** — 토큰 부재, 마지막 쓰기 승리(§5 #3). 노출 토글이 전체 치환이라 손실 시나리오가 실재 |
| 렌더 예외 | 셸 유지 + 복구 UI | **성립**(`AppShell.tsx:484-489`, `resetKey={pathname}`) |
| 세션 만료 | 재인증 + returnUrl 복원 | **성립**(전역 401 인터셉터). **단 dirty 폼 입력은 사라진다**(EXC-19) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미성립** — 감지 없음(EXC-11) |
| 요청 무한 대기 | 상한 abort + 재시도 메시지 | **미성립** — 프론트 상한 없음(EXC-05). 서버 5초(BE-025 §2)가 유일한 천장 |
| 새로고침 | 필터·상태 복원 | **미성립** — 필터가 URL 에 없다(IA-13). 더해 **픽스처가 시드로 되돌아간다**(백엔드 없음) |

### 4.3 데이터 보존 · 감사

| 항목 | 현재 상태 |
|---|---|
| 저장 영속성 | **없다** — `createCrudAdapter` 가 클로저 안 배열(`CASE_SEED` 기반)을 들고 있어 새로고침하면 시드로 되돌아간다. 백엔드 연결 전까지 모든 쓰기는 탭 수명 안에서만 존재한다 |
| 이미지 영속성 | **없다** — `blob:` object URL 이 저장값이다(§5 #12) |
| 삭제 복구 | 불가 — soft-delete·undo window 없음(FEEDBACK-05 는 confirm 으로 충족) |
| 감사 로그 | 이 화면 범위 밖. **누가 언제 노출을 껐는지 추적할 필드가 도메인 타입에 없다**(`updatedAt`·`updatedBy` 부재 — §5 #3 과 같은 뿌리). 성공 사례는 고객 노출 마케팅 자산이라 '언제부터 게시됐나'가 실제로 물어질 수 있다 |
| 미저장 입력 보존 | 3경로 가드로 **이탈은 막지만**(FEEDBACK-04) 버튼 이동(§5 #9)·세션 만료(EXC-19)에서는 사라진다. draft autosave 없음. **자유 텍스트 3개 × 500자라 손실량이 크다** |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | IA-13 | **P0** | 업종 필터가 URL 에 직렬화되지 않는다(`useState` 뿐). `shared/crud/useListState` 미소비 | 이 화면 | A11 (FS-025 §7 #1) |
| 2 | IA-04 | **P0** | Pagination 부재 — `CrudListShell` 이 전량을 렌더한다. 사례 수 상한 없음 | **앱 전역**(shared/crud) | A11 change_request (FS-025 §7 #3) |
| 3 | EXC-04 | **P0** | 동시성 토큰 부재(`updatedAt`/`version` 없음) → **동시 수정 미감지**(마지막 쓰기 승리). 노출 토글이 전체 치환 PUT 이라 남의 수정을 되돌린다. **동시 삭제는 어댑터가 409 로 잡는다**(포트폴리오와 갈리는 지점) | 이 화면(도메인 타입) | A63 (BE-025 §7.3 · §7.7 #2·#3) · A11 (FS-025 §7 #17) |
| 4 | EXC-03 | **P0** | 쓰기 액션 권한 게이팅 부재 — **`useRouteWritePermissions` 는 이제 7곳이 소비하지만**(products 3 · settings 4) `pages/portfolio/**` 는 그 밖이다. 최근접 선례는 같은 `useCrudList`+`CrudListShell` 목록인 `products/items/ProductListPage.tsx:119`. read 게이팅은 성립 | **이 화면**(공용 훅 + 7곳 선례 존재) | A11 change_request (FS-025 §7 #2) |
| 5 | IA-02 | **P0** | 하위 라우트가 브랜치 라벨로 폴백 + `<h1>` 2개. 목록/폼의 title 소스 불일치 | **앱 전역**(AppHeader · nav-config) | A11 change_request · A40 (FS-025 §7 #11) |
| 6 | A11Y-11 | **P0** | **`ImageUploadField`(대표 이미지)의 required 만 AT 에 닿지 않는다** — `FormField` 를 쓰지 않아 `withAriaRequired`(`FormField.tsx:50-56`) 주입 경로 밖이고, 드롭존 button 에도 hidden file input 에도 `aria-required` 가 없다. *(필수 8개 중 7개는 F3a 의 런타임 주입으로 충족 — 자식이 `SelectField`/`input`/`textarea`)* | **앱 전역**(@tds/ui `ImageUploadField`·`ImageGalleryField` 계약) | A11 change_request (FS-025 §7 #14) |
| 7 | MOTION-03 | **P0** | `ToggleSwitch.css` 에 reduced-motion off 블록 부재 — 이 화면이 그 표면을 2곳에서 쓴다 | **앱 전역**(@tds/ui `ToggleSwitch.css`) | A11 change_request (DS) |
| 8 | **FS-025 §7 #4** | — | **정렬 기준인 일자가 목록 열에 없다** — `sortCaseStudies` 가 일자 내림차순으로 정렬하는데 운영자가 그 근거를 볼 수 없다. **포트폴리오에는 일자 열이 있다**(ERP-08 · 자매 화면 불일치) | 이 화면 | A11 change_request |
| 9 | FEEDBACK-04(부분) | P1 | '취소'·'목록으로' 버튼이 `<button>`+`navigate()` 라 미저장 가드를 우회한다(3경로 자체는 pass) | 공용(shared/crud `FormPageShell`) | A11 (FS-025 §7 #10) |
| 10 | EXC-14 | P1 | 노출 토글이 비관적 — 낙관 반영·롤백·재시도 toast 없음 | 공용(shared/crud `useCrudRowUpdate`) | A11 (FS-025 §7 #7) |
| 11 | EXC-06 / EXC-07(부분) | P1 | `?fail=` 가 status 없는 generic Error 를 던진다. `dev.ts` 의 422 가 `violations` 를 싣지 않아 필드 매핑 경로를 재현할 수 없다. **404/409 는 어댑터가 실사용 경로에서 옳게 던진다** | 공용(shared/crud `dev.ts`) | A63 (BE-025 §7.7 #7) · A11 |
| 12 | EXC-15(부분) | P1 | 업로드 progress/cancel 경로 없음 — **업로드 자체가 없기 때문**. `blob:` 값이 저장된다. client 검증은 성립 | 이 화면 + 계약 미정 | A63 (BE-025 §7.2 · §7.7 #1) · A11 |
| 13 | STATE-05(부분) | P1 | '진짜 비어있음' 분기에 생성 CTA 없음(`empty.createAction` 미전달). 3분기 copy 는 F2 에서 성립 | 이 화면 | A11 (FS-025 §7 #9) |
| ~~14~~ | ~~EXC-08(부분)~~ | ~~P1~~ | **해소됨(F3b)** — `WriteContext.idempotencyKey`(`crud.ts:30-42`)가 생겨 키가 어댑터까지 도달하고, `createCrudAdapter` 의 멱등 ledger(`:91`·`:113-116`·`:121`)가 재생을 처리한다. `Idempotency-Key` 헤더 심은 `crud.ts:39` | — | — |
| 15 | A11Y-08 | P1 | 행 안에 keyboard-focusable 이름 링크 없음(제목이 평문, 행 클릭은 마우스 전용) | 공용(shared/crud `CrudTable`) | A11 (FS-025 §7 #5) |
| ~~16~~ | ~~ERP-13~~ | ~~P1~~ | **해소됨(통합)** — 조사 헬퍼가 `shared/format.ts:269+` 로 승격되고 이 화면의 모든 사용자 대상 문구가 경유한다. 이제 '성공 사례**를** 등록했습니다' 가 나온다. 사용자 대상 `'을(를)'` 리터럴 앱 전역 0건 | — | — |
| 17 | EXC-10(부분) | P1 | 일괄 삭제가 실패 id 를 반환하지 않아 '실패분만 재시도' 불가. 진행률·취소 없음. **어댑터가 409 를 던져 부분 실패가 실제로 자주 난다** | 공용(shared/bulk) | A11 (FS-025 §7 #19) |
| 18 | A11Y-13(부분) | P1 | 폼 진입 시 첫 필드 자동 포커스 없음(검증 실패 포커스는 pass) | 공용(shared/crud) | A11 |
| 19 | **FS-025 §7 #13** | — | **업종 enum 의 정본이 프론트 상수다** — 서버가 6종 밖 값을 주면 수정 폼의 `<select>` 가 표시하지 못하고 저장 시 값이 조용히 바뀐다 | 이 화면 + 계약 | A63 (BE-025 §3.1 · §7.7 #4) · A11 |
| 20 | EXC-05 · EXC-11 · EXC-19 | P1 | 프론트 타임아웃 상한·오프라인 감지·세션 만료 draft 보존 앱 전역 부재. **이 화면은 폼 손실량이 크다**(자유 텍스트 3개 × 500자) | **앱 전역** | A40 · A11 (FS-025 §7 #21) |
| 21 | A11Y-14 | P2 | 업로드 완료 안내가 live region 아님 | **앱 전역**(@tds/ui) | A11 |
| 22 | COMP-01(부분) · COMP-06 · COMP-09 · COMP-12 | P2 | 손수 쓴 '저장 중…' · skeleton `length: 5` 하드코딩 · **고객사/제목 truncate 부재(포트폴리오와 반대)** · 제목/고객사 카운터 부재 | 공용 + 이 화면 | A11 (FS-025 §7 #8 · #6 · #20) |
| 23 | IA-03 · IA-14 · MOTION-04 · ERP-12 · ERP-15 · EXC-18 | P1/P2 | breadcrumb 부재 · 반응형 미선언(성과 열이 더 넓다) · 행 FLIP 부재 · export 부재 · 대형 리스트 계약 부재 · Shift-range/진행률 부재 | 공용 + 앱 전역 | A11 |

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 `4b805ad`(2026-07-17) 코드 대조다.** 아래는 판정을 *확인할 수 있는* 절차다.

### 6.1 실패 재현 — `?fail=` (코드에서 확인한 실제 값)

정의: `shared/crud/dev.ts:81-93`. 문법 `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all`(쉼표로 복수). 던지는 것은 **status 없는 `new Error('요청을 처리하지 못했습니다.')`** 다.

| scope | op | 걸리는 어댑터 함수 | 화면 결과 |
|---|---|---|---|
| `case-studies` | `list` | `caseStudyAdapter.fetchAll` | FS-025-EL-009 배너 + '다시 시도' |
| `case-studies` | `detail` | `caseStudyAdapter.fetchOne` | 수정 폼 = FS-025-EL-015 대체 화면(generic 갈래) |
| `case-studies` | `save` | `caseStudyAdapter.create` · `update` | 폼 = FS-025-EL-016 배너 / 노출 토글 = 실패 토스트 |
| `case-studies` | `delete` | `caseStudyAdapter.remove` | 삭제 다이얼로그 안 배너 / 일괄은 부분 실패 건수 |

> **scope 가 `'case-studies'` 다** — `data-source.ts:69` `scope: 'case-studies'`(`createCrudAdapter` 의 spec). **포트폴리오(`'portfolio'`)와 독립적이라 두 화면을 따로 실패시킬 수 있다.**
>
> ✅ **NFR-023 §6.1 의 함정이 여기엔 없다.** 포트폴리오는 `fetchPortfolioCategoryOptions` 가 항목 목록과 같은 scope·op(`portfolio:list`)를 공유해 분리 재현이 불가능했지만, **이 화면은 어댑터 함수 4개가 전부 한 어댑터에 속하고 업종 조회가 없어** op 단위 격리가 온전하다.

### 6.2 status 재현 — `?status=<op>:<code>`

정의: `shared/crud/dev.ts:24`·`:57-71`. 문법 `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능 status(`:27-37`): **400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500**. `HttpError(status, message)` 를 던지므로 **화면의 status 분기를 실제로 구동하는 유일한 수단**이다.

| 예시 | 확인 대상 |
|---|---|
| `?status=save:409` | FS-025-EL-031 충돌 다이얼로그. **이 화면은 어댑터도 실사용 409 를 던지므로**(없는 id 저장) 스위치 없이도 재현 가능하다 — 스위치는 '동시 수정' 시나리오를 흉내 낼 때 쓴다 |
| `?status=save:422` | EXC-07 필드 인라인 경로. **`dev.ts` 가 `violations` 를 싣지 않아 배너로 폴백한다**(§5 #11) |
| `?status=save:500` | EXC-20 오류 참조 코드(`TDS-…`) |
| `?status=detail:404` | EXC-12 not-found 분기. **이 화면은 없는 `:id` 로 진입하면 어댑터가 스스로 404 를 던지므로** 스위치 없이도 재현된다(`/portfolio/case-studies/zzz/edit`) |
| `?status=list:401` | EXC-02 전역 401 인터셉터 |
| `?status=save:403` | EXC-03 서버측 거절(프론트 게이팅 부재와 별개 — §5 #4) |

### 6.3 쓰지 않는 스위치

**`?delay=` 은 이 화면에 없다.** `shared/crud/dev.ts` 에 정의가 없으며 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다. STATE-01 을 재현할 때 `?delay=3000` 대신 **고정 `LATENCY_MS = 400`**(`dev.ts:12`) 창을 쓴다 — 필요하면 network throttling 으로 관측한다.

### 6.4 정적 가드 (E2E 없이 회귀를 막는 것)

| 도구 | 고정하는 것 |
|---|---|
| `apps/admin/src/shared/a11y-guard.test.ts` | A11Y-11 의 describedby 절(짝 없는 `aria-invalid` = 0) · A11Y-12(필터에 `aria-current` = 0). **`aria-required` 는 이 가드가 보지 않는다** — §5 #6 |
| `apps/admin/src/shared/token-guard.test.ts` | TOKEN-01(hex/px/border 키워드 부재) |
| `apps/admin/src/pages/portfolio/case-studies/case-studies.test.ts` | 순수 규칙(`sortCaseStudies`·`filterCaseStudies`·`industryLabel`·`industryTone`·`toCaseStudyInput`) + `caseStudySchema` 검증 문구(업종 enum 밖 거절 포함). **픽스처가 `coverImageUrl: 'blob:cover'` 를 정상 입력으로 쓴다**(`:24`·`:80`) — 스키마가 스킴을 안 본다는 §5 #12 의 방증이다 |

## 7. 자기 점검

- [x] P0 30건을 **quality-bar 의 순서 그대로** 전수 판정했다 — 빈칸 0건
- [x] §2.1 산수 검산: pass 12 + 종속 8 + n-a 3 + gap 7 = **30** ✓ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30 ✓)
- [x] 모든 `pass` 에 **파일:라인** 코드 근거를 달았다
- [x] 모든 `gap` 에 **재현 가능한 측정 기준**을 달았고 §5 로 이관했다 — 범위(이 화면/공용/앱 전역)를 구분했다
- [x] 모든 `n-a` 에 사유를 달았다 (COMP-10 · FEEDBACK-06 · A11Y-12 · ERP-01)
- [x] **quality-bar 요구 문구를 복제하지 않았다** — ID 참조 + '이 화면에서 어떻게/무엇으로 판정하는가' 만 썼다
- [x] **NFR-023(자매 화면)과 갈리는 판정을 §1.2 에 못 박고**, 본문에서 그 근거(업종 상수)를 짚었다 — **STATE-02(P0) 한 건만 남았다**. **⚠ F3b 로 어댑터 차이가 사라졌다**: `createStoreAdapter` 가 `createCrudAdapter` 와 같은 409/404 계약을 갖게 돼(`crud.ts:192-194`·`:219-221`·`:232-234`) **EXC-12 는 양쪽 pass**, **EXC-04 는 양쪽 같은 사유(동시성 토큰 부재)의 gap** 이 됐다 — 예전에 이 문서가 '어댑터 차이로 갈린다'고 적은 근거는 더 이상 유효하지 않아 정정했다
- [x] **판정 기준일을 `2026-07-17 · HEAD = 4b805ad` 로 갱신하고 F3a·F3b·통합 이후 코드로 P0 30건을 전수 재확인했다.** P0 판정이 뒤집힌 것은 **0건**(§2.1 의 12/8/3/7 그대로). **범위가 좁아진 P0 1건**(A11Y-11 8→1)은 gap 을 유지했다. **P1 2건은 pass 로 전환**(ERP-13 · EXC-08 멱등키 절)했고 §3·§5 를 함께 갱신했다
- [x] **A11Y-11 을 grep 이 아니라 호출부 자식 타입으로 판정했다** — `withAriaRequired` 는 런타임 `cloneElement` 라 소스 grep(앱 전역 1건)은 지표가 아니다
- [x] §6 의 `?fail=` scope·op 를 **어댑터 코드에서 확인**해 적었다(`scope: 'case-studies'`, op 4종). **NFR-023 에 있던 scope 공유 함정이 여기엔 없음을 명시**했다. **`?delay=` 을 쓰지 않았다**. `LATENCY_MS = 400` 이 예산이 아님을 §4.1 에 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1·§6 에 명시했다
- [x] §1.1 표기 규약의 예외(상속 항목의 검증된 위반을 gap 으로 적는 규칙)를 명시하고 해당 2건(A11Y-11 · MOTION-03)을 밝혔다
- [x] FS-025 §7 ↔ BE-025 §7.7 ↔ 이 문서 §5 의 이관 항목을 상호 참조로 일치시켰다
