---
id: NFR-023
title: "포트폴리오 비기능 명세"
functionalSpec: FS-023
backendSpec: BE-023
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-023. 포트폴리오 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-023 포트폴리오 (`/portfolio/items` · `/new` · `/:id/edit`) |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구(P0 30건). **이 문서는 그 요구 문구를 복제하지 않는다.** ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **'이 화면 적용본'**. 각 요구가 이 화면에서 ① 어떻게 충족되는가(코드 근거) ② 무엇을 재현하면 판정되는가(측정 기준) 만 기술한다 |
| 함께 읽는 문서 | FS-023(요소·예외) · BE-023(엔드포인트·계약) · `specs/quality-bar.md`(요구 정본) |
| 갱신 규칙 | quality-bar 가 바뀌면 이 문서의 **판정만** 갱신한다. 요구 문구를 이쪽에 옮겨 적지 않는다 — 두 벌이 되면 어느 쪽이 정본인지 알 수 없다 |
| 판정 기준일 | **2026-07-17 · HEAD = `4b805ad`** (F3a·F3b·통합 머지 후). 이전 판정은 F2(`3cd3078`) 기준이었다 |
| 검증 방법 | **E2E 미실행. 모든 판정 근거는 `4b805ad` 코드 대조다.** §6 의 재현 스위치는 판정을 *확인할 수 있는 절차*이며 이 문서가 그것을 실행했다는 뜻이 아니다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

> **규약의 예외 하나(명시)**: `상속` 항목이라도 **코드 대조로 위반을 직접 확인했고 그 표면이 이 화면에 실재하면 `gap` 으로 적고 범위를 '앱 전역'으로 표기한다.** `종속` 으로 덮으면 검증된 P0 미충족이 문서에서 사라진다 — 이 문서에서는 A11Y-11 · MOTION-03 두 건이 여기 해당한다.
>
> ⚠ **A11Y-11 은 grep 으로 판정하지 말 것.** `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 **런타임 `cloneElement`** 로 자식 컨트롤의 `aria-required` 에 주입한다 — 소스에 `aria-required` 리터럴이 없어도 DOM 에는 실린다. 앱 소스의 `aria-required` grep 은 1건뿐이지만(수동 override 1곳) 그것은 이 요구의 판정 지표가 아니다. 판정은 **호출부의 자식 타입**으로 한다(`:36-41` `isRequirableChild` — `input`/`select`/`textarea`/DS `SelectField` 만 주입 대상).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | 스켈레톤의 유일한 조건이 최초 로드다 — `useCrudList.tsx:71` `firstLoading = isFetching && data === undefined`, `:72` `refreshing = isFetching && data !== undefined`. `CrudListShell.tsx:136` 이 `loading={firstLoading}` 만 표에 넘기고, `:119` 는 재조회 중 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. `CrudTable.tsx:143` 이 그 값으로만 스켈레톤/빈상태/행을 가른다. 조회 실패는 `CrudListShell.tsx:113` 이 표 대신 Alert 로 가른다 — 네 상태가 서로 배타적이다 | 목록 진입 → 스켈레톤만(빈 상태 문구 없음). 필터를 결과 0건 분류로 → `Empty` 만. `?fail=portfolio:list` → danger Alert 만. 데이터가 있는 상태에서 '다시 시도'/재조회 → **표가 스켈레톤으로 바뀌지 않고 이전 행이 남는다** | pass |
| STATE-02 | STATE | 직접 | 항목 목록 실패는 `CrudListShell.tsx:156-165` 인라인 danger Alert + '다시 시도'(`refetch`)로 **표를 대체**한다(toast 아님, 빈 상태 폴백 아님). 상세 로드 실패는 `FormPageShell.tsx:115-143` 이 같은 규약으로 폼을 대체한다. **그러나 이 화면의 두 번째 read query 인 분류 선택지 조회에는 표면이 전혀 없다** — `PortfolioListPage.tsx:62` · `PortfolioFormPage.tsx:97` 이 `categoriesQuery.data ?? []` 로만 읽고 `error` 를 보지 않는다 | `?fail=portfolio:list` → 두 쿼리가 같은 scope·op 라 **함께** 실패한다. 항목 목록은 Alert 를 띄우지만 폼(`/portfolio/items/new`)에서는 **분류 select 가 조용히 '분류 선택'만 남고 배너가 없다** — 필수 필드를 채울 수 없어 저장이 영구히 불가능해진다. 인라인 Alert 없음 = 미충족 | **gap** |
| STATE-04 | STATE | 직접 | (b) **필터 변경 시 선택 해제**: `PortfolioListPage.tsx:64-66` `useEffect(() => clear(), [filter, clear])` — `clear` 는 `useRowSelection.ts:35` 의 `useCallback` 이라 안정적이며 필터가 실제로 바뀔 때만 돈다. 일괄 삭제 전원 성공도 `useCrudList.tsx:144` 에서 해제한다. (a) **page clamp**: 이 화면에 **페이지 개념이 없어**(페이지네이션 미구현 — IA-04 gap) 범위를 벗어난 page 가 성립하지 않는다 → 보정 대상 없음 | 항목을 선택한 뒤 분류 필터를 바꾼다 → 'N건 선택됨'·SelectionBar 가 사라진다. (a) 는 재현 대상이 없다 — 페이지네이션이 들어오면 이 행을 다시 판정해야 한다(§5 #3 과 연동) | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 전용 모듈의 모든 시각 값이 토큰 변수다 — `PortfolioListPage.tsx:23-41`(`var(--tds-space-3)` · `calc(var(--tds-space-6) * 6)` · `calc(var(--tds-space-6) * 10)`), `PortfolioFormPage.tsx:28-32`, `_shared/PortfolioMediaFields.tsx:33`(공유 `fieldStyle` 재사용). **hex 리터럴·px 리터럴·border 키워드 0건**. 회귀는 `shared/token-guard.test.ts` 가 소스 전수 스캔으로 고정한다 | `apps/admin/src/pages/portfolio/{items,_shared}/**` 에 `#hex`·`[1-9]px`·`(outline\|border): (thin\|medium\|thick)` grep = 0. `pnpm verify:all` 의 token-guard 통과 + ESLint/stylelint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | focus ring 표면이 이 화면에 실재한다: 분류 select·등록 버튼·행 체크박스·노출 토글·행 액션·폼 전 필드·다이얼로그 버튼. 전부 DS 가 소유한다 — `tds-ui-focusable` 클래스(`FormPageShell.tsx:149`, `AppShell` skip link)와 각 컴포넌트의 `:focus-visible`. 확인한 예: `ToggleSwitch.css` `.tds-toggle:focus-visible { outline: var(--tds-border-width-medium) solid var(--tds-color-border-focus) }` — 토큰 쌍을 옳게 쓴다 | 이 화면의 모든 포커스 가능 요소를 Tab 으로 순회하며 ring 두께가 동일한지 확인. 판정 정본은 DS(@tds/ui) 문서 | 종속 |
| TOKEN-03 | TOKEN | 상속 | easing 소비 표면: 노출 토글의 knob transform transition(`ToggleSwitch.css` `transition: transform var(--tds-motion-duration-fast)`) · 성공/실패 Toast entrance · nav row background transition. 전부 DS·AppShell 소유 | Toast 가 실제로 재생되는지(non-reduced-motion) 확인. 판정 정본은 DS 문서 | 종속 |
| TOKEN-04 | TOKEN | 상속 | shadow 소비 표면: 폼 `Card`(`FormPageShell.tsx:164`) · 삭제/충돌 `ConfirmDialog` 의 Modal · 성공/실패 Toast. 전부 DS 소유이며 이 화면은 소비자다 | Modal/Toast 가 light/dark 에서 표면 위로 부상하는지 확인. 판정 정본은 DS 문서 | 종속 |
| TOKEN-05 | TOKEN | 상속 | display/heading tier 소비 표면: 폼 `<h1>`(`FormPageShell.tsx:159` — 공유 `pageTitleStyle`) · AppHeader `<h1>`(`AppHeader.tsx:52` — 같은 `pageTitleStyle` 스프레드) · 카드 제목(`CardTitle`). 이 화면은 스타일을 재선언하지 않고 공유 상수만 소비한다 | `/portfolio/items/new` 의 `<h1>` 이 body-md 보다 시각적으로 큰지 확인. 판정 정본은 tokens.json · DS 문서 | 종속 |
| COMP-10 | COMP | **N/A** | **텍스트 검색·필터 입력 표면이 이 화면에 없다.** 유일한 필터는 `<select>` 다(`PortfolioListPage.tsx:100-111` `SelectField`) — 옵션을 고르는 컨트롤이라 IME 조합이 발생하지 않고 debounce·최소 길이·stale 응답 경합의 대상이 아니다(값 변경이 서버 재조회를 일으키지 않고 클라이언트 필터링만 한다). 목록에 `SearchField` · `<input type="search">` · `useDebouncedSearch` 소비 0건 | 재현 대상 없음. **검색이 도입되면 즉시 이 행을 재판정해야 한다** — 앱에는 이미 `shared/crud/useDebouncedSearch`(`isComposing` 처리)가 있으므로 그것을 소비하면 된다 | n-a |
| FEEDBACK-02 | FEEDBACK | 직접 | 파괴적 액션(단건·일괄 삭제)이 전부 `ConfirmDialog intent="delete"` 로 게이트된다 — `useCrudList.tsx:151-177`. busy 중 확인 버튼 잠금(`busy={deleting}`, DS 가 `aria-busy` + '처리 중…' 을 소유). 실패 시 **닫지 않고** danger 배너(`:111` `setDeleteError`, `:138` 부분 실패 문구)를 띄우고 재클릭이 재시도. cancel/Esc/dim → `:86-92` `closeDelete` 가 `abort()` + `mutation.reset()` 으로 in-flight 를 끊고 상태를 복원한다 | `?fail=portfolio:delete` 로 삭제 → 다이얼로그가 열린 채 danger 배너, 재클릭이 재시도. 삭제 in-flight 중(400ms) Esc → 거짓 토스트 없이 버튼 상태 복원 | pass |
| FEEDBACK-04 | FEEDBACK | 직접 | 폼이 `FormPageShell.tsx:113` 에서 `useUnsavedChangesDialog(isDirty && !saving, …)` 를 배선한다. 훅이 3경로를 전부 구현: `beforeunload`(`:120-131`) · 앱 내 `<a href>` capture 가로채기(`:134-155`, `_self`/modifier-click edge case 포함) · popstate sentinel(`:157-182`). `isDirty` 는 RHF(`useCrudForm.ts:254`). 저장 성공 시 `replace` 이동으로 언마운트되어 가드가 걸리지 않는다 | `/portfolio/items/new` 에서 제목 입력 → ① 탭 닫기 ② 사이드바 '카테고리' 링크 클릭 ③ 브라우저 Back — 각각 discard 다이얼로그. 저장 성공 후 같은 이동은 프롬프트 없이 통과. **주의: '취소'·'목록으로' 버튼은 `<button>`+`navigate()` 라 가드를 우회한다**(§3 FEEDBACK-04-b) | pass |
| FEEDBACK-06 | FEEDBACK | **N/A** | **편집 가능한 폼을 담은 modal 이 이 화면에 없다.** 이 화면의 modal 은 삭제 확인(FS-023-EL-010/011)·충돌(FS-023-EL-029)·미저장 가드(FS-023-EL-028) 뿐이며 전부 입력 필드가 없는 `ConfirmDialog` 다 — dirty 상태 자체가 존재하지 않는다. IA-06 의 무게 규칙대로 이 엔티티의 폼은 **전용 라우트**(`/new`·`/:id/edit`)이고, quality-bar 가 appliesTo 로 지목한 `PortfolioCategoryFormModal` 은 `/portfolio/categories` 화면(FS-024)이 소유한다 | 재현 대상 없음 | n-a |
| A11Y-01 | A11Y | 상속 | 이 화면은 toast 를 6갈래로 띄운다(노출 토글 성공/실패 · 삭제 성공 · 일괄 삭제 성공 · 등록/저장 성공 · 다이얼로그 취소) — 전부 `ToastProvider` 의 **항상 마운트된** live region 에 주입된다: `ToastProvider.tsx:165` `role="status" aria-live="polite" aria-atomic="false"`, `:168` `aria-live="assertive"`(error). Toast 자신의 aria-live 에 의존하지 않는다 | 노출 토글 후 스크린리더가 `'<제목>' 을(를) 게시했습니다.` 를 읽는지. 판정 정본은 ToastProvider 소유 문서 | 종속 |
| A11Y-02 | A11Y | 상속 | 이 화면의 dialog 표면(삭제·일괄 삭제·충돌·discard)이 전부 DS `ConfirmDialog` → `Modal` 이다. `Modal.tsx:157-158` `aria-labelledby={titleId}` + `aria-describedby={describedBy}` — 제목과 **목적(message)** 이 함께 announce 된다. 앱 어댑터(`shared/ui/ConfirmDialog.tsx:43`)는 취소 토스트만 얹고 나머지를 그대로 위임한다 | 삭제 다이얼로그 open 시 스크린리더가 `'<제목>' 을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.` 를 읽는지. 판정 정본은 DS 문서 | 종속 |
| A11Y-11 | A11Y | 직접(+앱 전역) | **6개 중 5개 충족 — 1개 미충족.** ① **describedby 절 — 충족**: `aria-invalid` 를 쓰는 이 화면의 모든 컨트롤이 `aria-describedby` 로 이유를 연결한다 — `PortfolioFormPage.tsx:134-137`(분류) · `:156-157`(일자) · `:172-173`(제목) · `:187-188`(고객사), `TextareaField.tsx:66-67`(소개, 자체 배선), `ImageUploadField.tsx:211`·`ImageGalleryField`(`aria-invalid` 를 쓰지 않고 describedBy 만 — 짝 없는 위반이 아니다). 회귀는 `shared/a11y-guard.test.ts` 가 소스 전수 스캔으로 고정한다. ② **required 절 — F3a 가 대부분 닫았다**: `FormField.tsx:50-56` `withAriaRequired` 가 `required` 를 **런타임 `cloneElement`** 로 자식 컨트롤의 `aria-required` 에 주입한다(대상 판별 `:36-41`). 이 폼의 필수 6개 중 **5개가 주입 대상**이다 — 분류(자식이 DS `SelectField`, `PortfolioFormPage.tsx:130`) · 일자(`:150` `input`) · 제목(`:164` `input`) · 고객사(`:179` `input`) · 소개(`TextareaField.tsx:64-65` 가 native `required`+`aria-required` 를 스스로 건다). ③ **남은 1개 — 대표 이미지**: `ImageUploadField` 는 `FormField` 를 **쓰지 않고**(`ImageUploadField.tsx:222-230` 자기 `<span>` 라벨 + `aria-hidden` `*` 마커) 주입 경로 밖이다. 드롭존 `<button>`(`:232-245`)에도 실제 `<input type="file">`(`:269-279`, `aria-hidden`·`tabIndex={-1}`)에도 `required`/`aria-required` 가 없다 — **'대표 이미지가 필수'가 AT 에 닿지 않는다** | ① `aria-describedby` 없는 `aria-invalid` grep = 0 → **통과**(가드 테스트가 강제). ② 빈 폼 제출 후 RTL/AT 로 입력의 `aria-describedby` === `role=alert <p>` id → **통과**. ③ **⚠ grep 으로 판정하지 말 것** — 주입은 런타임이라 소스에 리터럴이 없다. RTL 로 렌더해 `getByLabelText('분류')`·`('일자')`·`('제목')`·`('고객사')`·`('소개')` 의 `aria-required` === `'true'` → **5개 통과**. `getByRole('button', { name: /대표 이미지 이미지 업로드/ })` 의 `aria-required` → **null = 미충족**. 범위: 앱 전역(@tds/ui `ImageUploadField` 계약) | **gap** |
| A11Y-12 | A11Y | **N/A** | **좌측 필터 list item 표면이 이 화면에 없다.** 이 화면의 필터는 툴바의 `<select>` 하나이고(`PortfolioListPage.tsx:100-111`), `filterItemStyle` 토글 버튼·`*Filter.tsx`·`*Panel.tsx` 컴포넌트가 존재하지 않는다 — `aria-pressed` 로 표기할 selected state 자체가 없다(`<select>` 는 네이티브 selected 를 쓴다). 이 화면 소스에 `aria-current` 0건 | 재현 대상 없음. 앱 전역 가드는 `shared/a11y-guard.test.ts` 가 `*Filter.tsx`/`*Panel.tsx` 를 스캔해 유지한다 | n-a |
| MOTION-01 | MOTION | 상속 | Modal 표면이 이 화면에 실재한다(삭제·일괄 삭제·충돌·discard 다이얼로그). enter/exit transition 은 DS `Modal` organism 이 소유하며 이 화면은 소비자다 — 이 화면은 자체 애니메이션을 두지 않는다 | 삭제 다이얼로그 open/close 시 backdrop fade + dialog scale 이 재생되고 exit 후에만 DOM 에서 제거되는지. **참고(코드 대조)**: `packages/ui/src` 에 `AnimatePresence`/`motion.` 소비 0건, `Modal.css` 에 `transition: background-color` 외 enter/exit 선언 없음 — DS 가 아직 미도입 상태로 보인다. 판정 정본은 DS 문서 | 종속 |
| MOTION-02 | MOTION | 상속 | Toast 표면이 이 화면에 실재한다(§A11Y-01 의 6갈래). exit 애니메이션은 `ToastProvider`/`Toast` 가 소유한다 | toast auto/manual dismiss 시 exit 애니메이션 재생 여부. **참고(코드 대조)**: `AnimatePresence` 소비 0건. 판정 정본은 DS 문서 | 종속 |
| MOTION-03 | MOTION | 상속(+앱 전역) | **이 화면은 `ToggleSwitch` 를 두 곳에서 쓴다** — 목록 노출 토글(`_shared/publishColumn.tsx:20`)과 폼 노출 토글(`_shared/PortfolioMediaFields.tsx:73`). 즉 quality-bar 가 appliesTo 로 지목한 바로 그 표면이 이 화면에 실재한다. `ToggleSwitch.css` 의 `.tds-toggle__knob { transition: transform var(--tds-motion-duration-fast) }` 와 `.tds-toggle__track { transition: background-color … }` 에 **`@media (prefers-reduced-motion: reduce)` off 블록이 없다** — 파일 전체에 해당 미디어 쿼리 0건(Button/Toast/Tabs 등 8개 CSS 에는 있다). 요구가 명시적으로 지목한 위반이 F2 에서도 그대로다 | `prefers-reduced-motion: reduce` 를 켠 채(Storybook/Playwright `emulateMedia`) 목록의 노출 토글을 누른다 → **knob 이 여전히 transform transition 으로 미끄러진다**(즉시 이동해야 한다). `grep -c 'prefers-reduced-motion' packages/ui/src/atoms/ToggleSwitch/ToggleSwitch.css` = 0. 범위: 앱 전역(DS `ToggleSwitch.css`) | **gap** |
| IA-01 | IA | 직접 | 이 화면의 세 라우트가 전부 AppShell layout route 아래에 있다 — `App.tsx:197-199`(`/portfolio/items` · `/new` · `/:id/edit`)가 `:324-342` 의 `<Route element={<RequireAuth><AppShell/></RequireAuth>}>` 자식으로 렌더된다. **이 화면은 자체 outer frame 을 도입하지 않는다** — `PortfolioListPage` 는 `CrudListShell` 하나만, `PortfolioFormPage` 는 `FormPageShell` 하나만 반환하며 sidebar·top bar·`<main>` 을 그리지 않는다 | `/portfolio/items` · `/new` · `/:id/edit` 세 경로에서 사이드바·AppHeader 가 한 벌만 렌더되는지. 이 화면 소스에 `<aside>`·`<header>`·`<main>` grep = 0 | pass |
| IA-02 | IA | 직접 | **절반 해소 — 여전히 미충족(사유 전환).** ✔ **해소된 것 — 가지 라벨 폴백**: 통합이 `findCoveringLeaf`(`nav-config.ts:260-278`)를 도입해 '자기를 감싸는 **가장 긴 잎**'을 쓴다(`covers()` 는 세그먼트 경계 매칭 — `:255-257`). `:297-299` `findNavLabel = findCoveringLeaf(pathname)?.label ?? pathname` → `/portfolio/items/new` 는 잎 `/portfolio/items` 에 덮여 **'포트폴리오'** 를 돌려준다(예전의 브랜치 라벨 '포트폴리오 관리' 가 아니다). 권한(`route-resource.ts`)이 쓰던 규칙과 한 곳으로 통일됐고 `nav-config.test.ts:16-40` 이 고정한다. ✘ **남은 것 둘**: ① **`<h1>` 이 2개다** — `AppHeader.tsx:101` `<h1 style={titleStyle}>{title}</h1>` 과 `FormPageShell.tsx:160` `<h1 style={pageTitleStyle}>{isEdit ? '… 수정' : '… 등록'}</h1>` 이 **동시에** 렌더된다. 요구의 '**단일 title 메커니즘**'이 미충족이고, 목록(`/portfolio/items`)은 in-content h1 이 없어 목록/폼의 title 소스가 서로 다르다. ② **행위가 AppHeader 제목에 없다** — `nav-config.ts:294-296` 주석이 '등록/수정 같은 **행위**는 제목에 넣지 않는다(그 문구는 nav 에 없고, 여기서 지어내면 레이아웃이 카피를 발명한다)'고 의도를 밝힌다. 그래서 AppHeader `<h1>` 은 '포트폴리오'이지 요구가 예시로 든 구체 title('공지 등록' 류)이 아니다 | `/portfolio/items/new` 를 연다 → 헤더 `<h1>` = **'포트폴리오'**(브랜치 라벨 폴백은 사라졌다). 그러나 `document.querySelectorAll('h1').length` = **2**('포트폴리오' + '포트폴리오 등록'), 두 텍스트가 다르다 = 단일 title 메커니즘 미충족. 요구의 acceptanceCheck('`/content/notices/new` 의 가시 primary title 이 '공지 등록'')의 포트폴리오 대응 — in-content h1 은 그것을 만족하나 AppHeader h1 은 아니고, **어느 쪽이 primary 인지가 정의돼 있지 않다** | **gap** |
| IA-04 | IA | 직접 | **부분 충족.** 템플릿의 앞 네 요소는 성립한다: toolbar row 우상단 primary '포트폴리오 등록'(`PortfolioListPage.tsx:113-116`) + 좌측 필터(`:99-112`) → 결과 count 요약(`CrudListShell.tsx:118-122`) → SelectionBar(`:125-133`, bulk 있을 때만) → table(`:135`). **마지막 요소인 Pagination 이 없다** — `CrudListShell` 전체에 `Pagination` import·렌더 0건이고, `useCrudList` 는 `fetchAll` 전량을 그대로 `items` 로 준다. 포트폴리오 항목 수에는 상한이 없다(관리자가 계속 등록한다) → 'page size 초과 가능' 조건에 해당하므로 면제되지 않는다 | 픽스처에 항목을 11건 이상 넣고 `/portfolio/items` 를 연다 → **페이지네이션이 렌더되지 않고 전량이 한 화면에 쌓인다**. `grep -rn 'Pagination' apps/admin/src/shared/crud/` = 0. (요구의 근거 문장 'members 만 실제 pagination' 이 이 화면에도 그대로 적용된다) | **gap** |
| IA-05 | IA | 직접 | `App.tsx:198-199` 가 `/portfolio/items/new` 와 `/portfolio/items/:id/edit` 를 **같은 `<PortfolioFormPage />`** 로 해석한다. 분기는 `useCrudForm.ts:73-74` 의 `useParams().id` 유무 하나뿐이며(`isEdit`), 레이아웃은 동일하고 `FormPageShell.tsx:159`·`:189` 의 title('포트폴리오 등록'/'수정')과 버튼 라벨('등록'/'저장'), `:125-128` 의 prefill(`reset(toValues(item))`)만 다르다. create 전용/edit 전용 페이지가 존재하지 않는다 | `App.tsx` 의 두 라우트 element 가 동일 컴포넌트 참조인지 확인. `/new` 와 `/:id/edit` 의 DOM 구조가 동일하고 title·버튼 라벨·초기값만 다른지 | pass |
| IA-13 | IA | 직접 | **미충족.** 이 화면의 list query state(분류 필터)가 **컴포넌트 `useState` 에만 있다** — `PortfolioListPage.tsx:48` `const [filter, setFilter] = useState(PORTFOLIO_FILTER_ALL)`. 파일에 `useSearchParams`·`useListState` import 0건. **F3b 가 `shared/crud/useListState`(URL 단일 원천)를 37개 화면에 롤아웃했고 같은 섹션의 `support/{downloads,replies,tickets}` 도 소비처가 됐지만**(`DownloadListPage.tsx:87` · `RepliesPage.tsx:76` · `TicketListPage.tsx:129`) **`pages/portfolio/**` 3화면은 전부 그 밖에 남았다.** 정렬은 서버 고정이라 URL 대상이 아니고, page·keyword 는 표면 자체가 없다 | 분류를 '오피스'로 바꾼 뒤 ① F5 → **'전체 분류'로 되돌아간다** ② 행을 눌러 수정 폼에 갔다가 브라우저 Back → **필터가 풀린 목록에 착지한다** ③ 주소창 URL 을 복사해 새 탭에 붙여넣기 → **필터가 재현되지 않는다**(URL 에 `?` 가 아예 붙지 않는다). `grep -rn 'useSearchParams\|useListState' apps/admin/src/pages/portfolio/` = **0**(앱 전체로는 37개 화면). 대조: 같은 조작을 `/support/downloads` 에서 하면 URL 에 `?category=…` 가 붙고 Back·F5 를 견딘다 | **gap** |
| EXC-01 | EXC | 상속 | 이 화면의 라우트가 **두 겹의 ErrorBoundary** 안에 있다: `App.tsx:311-315`(루트 — 셸 자체가 던지는 경우의 최후 보루) + `AppShell.tsx:484-489`(`<Outlet>` 바로 바깥, `resetKey={pathname}`, fallback `RouteErrorScreen`). 후자가 이 화면의 렌더 예외를 잡으므로 사이드바·헤더가 살아남고 다른 메뉴로 걸어 나갈 수 있으며, **다른 화면으로 이동하는 것만으로 경계가 스스로 풀린다**. 경계가 `RequirePermission` 보다 바깥이라 403 화면이 던져도 앱이 죽지 않는다 | `PortfolioListPage` 렌더에 강제 throw 를 심는다 → 사이드바 유지 + 복구 UI(`RouteErrorScreen`, 오류 참조 코드 포함), 다른 메뉴 이동 가능, 앱이 unmount 되지 않는다 | pass |
| EXC-02 | EXC | 상속 | ① **auth guard**: `App.tsx:324-329` 가 `RequireAuth` 를 **AppShell 바깥**에 둔다 — 세션이 없으면 셸도 그리지 않고 `/login?returnUrl=<현재 경로>` 로 보낸다. 이 화면의 세 라우트가 그 안에 있다. ② **401 인터셉터**: `queryClient.ts:41-43` 이 `QueryCache`/`MutationCache` 의 `onError` 한 곳에서 `isUnauthorized(cause) → notifySessionExpired()` 를 판정한다 — **이 화면의 모든 조회·쓰기가 그 캐시 계층을 통과하므로 화면별 배선이 없다** | 세션 없이 `/portfolio/items` 딥링크 → `/login?returnUrl=%2Fportfolio%2Fitems` 로 리다이렉트, 로그인 후 복귀. `?status=list:401` 로 조회 → 세션 만료 경로가 발화한다(이 화면 어댑터가 실사용 401 을 던지지는 않는다 — 백엔드 없음) | pass |
| EXC-03 | EXC | 직접 | **부분 충족 → 미충족.** ① **route-level authorization 은 성립한다**: `AppShell.tsx:490-492` 가 `<Outlet>` 을 `RequirePermission` 으로 감싸 read 권한이 없으면 `ForbiddenScreen` 을 렌더한다. 리소스는 `route-resource.ts:36-46` 이 경로에서 파생하므로(`/portfolio/items/:id/edit` → leaf `/portfolio/items`) **폼·상세 라우트까지 자동으로 덮인다**. 강등 reconcile 도 권한 스토어 구독으로 성립한다. ② **write-action 게이팅은 이 화면에 없다**: `useRouteWritePermissions`(`RequirePermission.tsx:45`)는 **더 이상 소비처 0 이 아니다 — 7곳이 쓴다**(`products/categories/ProductCategoriesPage.tsx:181` · `products/items/ProductListPage.tsx:119` · `products/returns/ReturnDetailPage.tsx:110` · `settings/{api-keys/ApiKeysPage.tsx:59, languages/LanguagesPage.tsx:126, oauth/OAuthPage.tsx:78, site/SiteSettingsPage.tsx:109}`; 형제 `useRouteCan` 은 `logs/components/LogListShell.tsx:115`). **그러나 `pages/portfolio/**` 는 그 목록 밖이다** — 이 화면의 '포트폴리오 등록'(`PortfolioListPage.tsx:114`) · 행 액션 수정/삭제(`CrudTable.tsx:192-197`) · 일괄 삭제(`CrudListShell.tsx:126-132`) · 노출 토글(`publishColumn.tsx:22-30`)이 `can(resource, action)` 을 보지 않고 무조건 렌더된다. 요구의 두 번째 절('create/update/delete 컨트롤은 `can()` 이 false 면 렌더 안 함/disable')이 미충족 | ① read-forbidden 역할로 `/portfolio/items` 딥링크 → 403 화면 = **통과**. ② delete 권한이 없는 역할로 목록을 연다 → **행 삭제·일괄 삭제 버튼이 그대로 보이고 눌린다** = 미충족. `grep -rn 'useRouteWritePermissions\|useRouteCan' apps/admin/src/pages/portfolio/` = **0**(앱 전체로는 8건). 범위: **이 화면**(공용 훅과 7곳의 선례가 이미 있으므로 이 화면이 소비하기만 하면 된다) | **gap** |
| EXC-04 | EXC | 직접 | **절반 해소 — 여전히 미충족(사유 축소).** ✔ **해소된 것 — 유령 저장·유령 삭제·404 미도달**: F3b 가 `createStoreAdapter`(`crud.ts:165-240`)에 존재 검사를 넣었다 — `:219-221` `update` 없는 id → `HttpError(409, '다른 사용자가 먼저 삭제한 항목입니다.')`, `:232-234` `remove` 없는 id → `HttpError(409, '이미 삭제된 항목입니다.')`, `:192-194` `fetchOne` 없는 id → `HttpError(404)`. 소비자 측은 원래 준비돼 있었으므로(`useCrudForm.ts:166-179` `isConflict` → 입력 보존 + 충돌 다이얼로그 `FormFeedback.tsx`) **화면 코드 0줄로 복구 경로가 열렸다.** ✘ **남은 것 — 낙관적 동시성 토큰**: 그 409 는 **'대상이 아직 존재하는가'** 로만 판정한다(`crud.ts:171` `exists()`). `PortfolioItem`(`_shared/store.ts:23-40`)에 `updatedAt`·`version` 이 없어 If-Match/ETag 로 보낼 값 자체가 없고, **둘 다 존재하는 동시 편집은 여전히 last-write-wins** 다. 요구는 '**mutable record 의 write 에 optimistic-concurrency token(If-Match/ETag 또는 updatedAt/version)을 보낸다**' 이고 '가능하면 diverge 한 field 를 표시' 까지 말한다 — 둘 다 미충족 | ① 탭 A 에서 `/portfolio/items/pf-1/edit` 를 연다 → 탭 B 에서 `pf-1` 을 **삭제** → 탭 A 에서 저장 → **충돌 다이얼로그('다른 사용자가 먼저 삭제한 항목입니다.')가 뜨고 입력이 보존된다** = **이 경로는 통과**(유령 토스트 없음). ② 탭 A 에서 `pf-1` 을 연다 → 탭 B 에서 `pf-1` 의 제목을 **수정** → 탭 A 에서 저장 → **경고 없이 B 의 변경을 덮는다** = 미충족. ③ `grep -n 'updatedAt\|version\|If-Match' apps/admin/src/pages/portfolio/` = 0 | **gap** |
| EXC-08 | EXC | 직접 | ① **동기 제출 락**: `useCrudForm.ts:103` `submitLockRef` + `:201-203` `if (submitLockRef.current) return; submitLockRef.current = true` — RHF 비동기 검증과 `disabled={saving}` 렌더 사이의 틈을 ref 가 닫는다(렌더를 기다리지 않는다). `:213-215` `onSettled` 와 `:246-248` `onInvalid` 가 락을 해제한다. ② **disable**: `FormPageShell.tsx:189` `disabled={saving || loadingDetail}`. ③ **멱등키가 mutationFn 밖에 있고, 이제 어댑터까지 도달한다**(F3b): `:118-123` `idempotencyKeyRef` + `takeIdempotencyKey()` 가 **제출 시도 단위**로 키를 잡고 `:211` 에서 뽑아 `:228`·`:235` 의 **variables 에 싣는다**(`crud.ts:279`·`:301` `CreateVars/UpdateVars.idempotencyKey` → `:288`·`:310` `adapter.create/update(…, { signal, idempotencyKey })`). `createStoreAdapter` 는 그 키로 멱등 ledger 를 돌린다(`crud.ts:168` · `:201-203` · `:208`) — 같은 키의 재시도는 재적용 없이 최초 응답을 재생하고, **기록은 적용 성공 후에만** 한다(`:55-60` — 미리 기록하면 실패한 첫 시도가 키를 태워 재시도가 영원한 no-op 이 된다). `:220` 성공 시에만 키를 버린다. 삭제·일괄 삭제·토글도 요청 중 컨트롤을 잠근다 | 등록 폼을 채우고 **Enter 를 연타**한다(응답 400ms 전) → 요청 1건, 항목 1건만 생성. `?status=save:500` 후 재제출 → `idempotencyKeyRef` 가 같은 키를 유지하고 그 키가 어댑터에 도달한다(성공 전까지 리셋되지 않는다). `crud.test.ts` 가 ledger 재생을 고정한다. `TODO(backend): Idempotency-Key` 헤더 심은 `crud.ts:39` | pass |
| EXC-09 | EXC | 직접 | 단일 공유 predicate `isAbort`(`shared/async.ts:40-42`)를 이 화면의 모든 경로가 쓴다: 삭제 `useCrudList.tsx:110`(`if (isAbort(cause)) return`) · 노출 토글 `useCrudRowUpdate.ts:52` · 폼 저장 `useCrudForm.ts:156`(handleWriteError 의 첫 줄) — **error toast·배너 없음**. `mutation.reset()` 은 `useCrudList.tsx:89`(closeDelete)·`:120`(closeBulk)이 호출해 isPending 을 되돌린다. list/cache 무변경: `:105`·`:136`·`useCrudRowUpdate.ts:48` 이 `controller.signal.aborted` 를 먼저 확인하고 조기 반환한다. **일괄 실패 count 에서 abort 제외**: `shared/bulk.ts:20` `result.status === 'rejected' && !isAbort(result.reason)` | 삭제 확인 → in-flight(400ms) 중 Esc/딤 클릭 → **거짓 실패 토스트 없이** 버튼 상태 복원, 목록 무변경. 폼 저장 중 사이드바로 이탈 → 언마운트 abort(`useCrudForm.ts:92`), 토스트 없음. 일괄 삭제 중 취소 → 실패 건수가 0으로 보고된다(abort 는 세지 않는다) | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 · STATE-04 · TOKEN-01 · FEEDBACK-02 · FEEDBACK-04 · IA-01 · IA-05 · EXC-01 · EXC-02 · EXC-08 · EXC-09 |
| `종속` | **8** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-02 · MOTION-01 · MOTION-02 |
| `n-a` | **3** | COMP-10(텍스트 검색 표면 없음) · FEEDBACK-06(편집 폼 모달 없음) · A11Y-12(좌측 필터 표면 없음) |
| `gap` | **8** | STATE-02 · A11Y-11 · MOTION-03 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-04 |

**검산: 11 + 8 + 3 + 8 = 30** ✓ (STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30)

> **`4b805ad` 기준 재판정 결과: P0 의 판정이 뒤집힌 것은 0건이다.** F3a·F3b·통합은 이 화면의 P0 gap 8건 중 **어느 것도 완전히 닫지 못했고**, 두 건(A11Y-11 · EXC-04)의 **범위를 좁혔을 뿐**이다 — A11Y-11 은 6개 중 5개가 주입돼 남은 것이 `ImageUploadField` 하나, EXC-04 는 유령 저장·404 가 닫히고 남은 것이 동시성 토큰 하나다. **좁혀진 gap 도 gap 이다** — 낙관적으로 pass 로 올리지 않았다. 반면 **P1 3건은 실제로 pass 가 됐다**(ERP-13 · EXC-12 · EXC-08 의 멱등키 절 — §3 참조).
>
> **P0 gap 8건 = quality-bar '배치 실패' 사유.** 8건 중 **이 화면 고유는 4건**(STATE-02 · IA-13 · EXC-03 · EXC-04): EXC-03 은 이제 공용 훅(`useRouteWritePermissions`)과 **7곳의 선례**가 있어 이 화면이 소비하기만 하면 되고, IA-13 도 `useListState` 를 37개 화면이 이미 쓴다 — **둘 다 '앱 전역 미비'가 아니라 '이 화면의 미소비'로 사유가 바뀌었다.** 나머지 **4건은 앱 전역/DS 범위**(A11Y-11 · MOTION-03 · IA-02 · IA-04) — §5 의 '범위' 열이 이를 가른다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | `useCrudListQuery`(`crud.ts:151`)가 `placeholderData: (previous) => previous` 를 쓰고 `CrudListShell.tsx:118-122` 가 재조회 중 건수를 유지한 채 '· 새로고침 중…' 만 덧붙인다. `staleTime: 30_000`(`queryClient.ts:24`)이 refetch 시점을 지배한다 | 데이터가 있는 상태에서 '다시 시도' → 이전 행이 새 데이터 도착까지 남는다. 30초 내 재마운트는 네트워크를 타지 않는다 | pass |
| STATE-05 | P1 | F2 가 `empty` 맥락을 배선했다 — `PortfolioListPage.tsx:127-130` `{ hasActiveFilters: filter !== PORTFOLIO_FILTER_ALL, onResetFilters }`. `Empty.tsx:53-99` 가 3분기 copy + 조사(받침 계산)를 소유한다. **단 `createAction`(생성 CTA)을 넘기지 않아** '진짜 비어있음' 분기에 복구 수단이 없다. `hasQuery` 는 검색 표면이 없어 항상 false | 픽스처를 비운다 → '등록된 포트폴리오가 없습니다' + 설명, **CTA 없음**. 결과 0건 분류로 필터 → '필터에 맞는 포트폴리오가 없습니다' + **'필터 초기화'** 버튼 | gap(부분) |
| STATE-06 | P1 | 항목 쓰기는 정확하다 — `crud.ts:180`·`:199-200`·`:218` 이 `['portfolio','list']`·`['portfolio','detail',id]` 를 무효화한다. **그러나 분류 선택지 키 `['portfolio','category-options']` 는 어디서도 무효화되지 않는다** — 카테고리 화면(FS-024)은 `['portfolio-categories','list']` 를 쓴다 | `/portfolio/categories` 에서 카테고리를 만든 뒤 즉시 `/portfolio/items/new` 로 이동 → 30초(staleTime) 동안 새 분류가 select 에 없을 수 있다 | gap |
| COMP-01 | P1 | 모든 버튼이 DS `<Button>` 이다 — 등록(`PortfolioListPage.tsx:113`) · 취소/저장(`FormPageShell.tsx:180-190`) · 일괄 삭제(`CrudListShell.tsx:126`) · Alert 의 '다시 시도'. **단 저장 진행 표시가 `loading` prop 이 아니라 손수 쓴 '저장 중…' 문자열이다**(`FormPageShell.tsx:189`) | 이 화면 소스에 `buttonStyle(`·`tds-ui-btn-` grep = 0 → 통과. `FormPageShell` 의 '저장 중…' 은 요구가 금지한 형태 | gap(부분) |
| COMP-02 | P1 | `CrudTable.tsx:124-129`(`SelectAllHeaderCell`)·`:173-178`(`RowSelectCell`)·`:130`·`:179`(`SeqHeaderCell`/`SeqCell`). raw checkbox 조립 0건 | 이 화면 표에 `<input type="checkbox">` 직접 조립 grep = 0 | pass |
| COMP-04 | P1 | zod-required 6필드(분류·일자·제목·고객사·소개·대표이미지)가 전부 `required` 마커를 렌더한다 — `FormField required`(`PortfolioFormPage.tsx:127`·`:149`·`:163`·`:178`), `TextareaField required`(`:195`), `ImageUploadField required`(`PortfolioMediaFields.tsx:53`). 본문 이미지는 선택이라 마커 없음(스키마와 일치) | 각 라벨 텍스트 옆에 `*` 가 인접 렌더되는지 | pass |
| COMP-06 | P2 | `CrudTable.tsx:144` `Array.from({ length: 5 })` — 행 수 5 하드코딩. PAGE_SIZE 개념이 없다. 열 수는 `:112` `columns.length + 3` 으로 정의에서 파생한다(절반 충족) | skeleton `length: 5` grep → 1건 히트 | gap |
| COMP-09 | P2 | 고객사만 truncate 한다(`PortfolioListPage.tsx:35-41` `summaryCellStyle` — maxWidth + ellipsis + nowrap). **제목은 truncate 가 없어** 길면 컬럼을 민다. 어느 쪽도 hover/expand 전문 노출 경로가 없다 | 200자 제목을 가진 항목을 넣는다 → 표 폭이 밀린다 | gap |
| COMP-12 | P2 | 소개(`TextareaField`)만 'N/500' 실시간 카운터를 갖는다(`TextareaField.tsx:52`). 제목(120)·고객사(60)는 `maxLength` 만 있어 **상한에서 조용히 입력이 멈춘다** | 제목에 120자를 넘겨 입력 → 경고 없이 잘린다 | gap |
| FEEDBACK-01 | P1 | 배치 규칙이 성립한다 — 쓰기 성공/실패 = toast(`useCrudRowUpdate.ts:49`·`:53`), read 실패 = 인라인 Alert(`CrudListShell.tsx:157`), 다이얼로그 내부 실패 = 그 다이얼로그의 error 배너(`useCrudList.tsx:111`·`:138`). 페이지가 임의 배너 state 를 갖지 않는다. **단 실패 toast 에 '다시 시도' 가 없다**(`useCrudRowUpdate` 가 retry 액션을 노출하지 않는다) | `?fail=portfolio:save` 로 노출 토글 → 실패 toast 가 뜨지만 재시도 버튼이 없다 | gap(부분) |
| FEEDBACK-03 | P1 | 모든 mutation 이 성공·실패 양 경로에 피드백을 갖는다 — 토글(`useCrudRowUpdate.ts:47-54`) · 삭제(`useCrudList.tsx:104-113`) · 일괄 삭제(`:135-148`) · 저장(`useCrudForm.ts:211-217`·`handleWriteError`). no-op state 없음 | `?fail=all` 로 각 액션을 구동 → 전부 사용자 가시 실패를 낸다 | pass |
| FEEDBACK-05 | P2 | 모든 delete 가 confirm 게이트를 지난다(FS-023-EL-010/011). undo window 는 없다 | 단일 미확인 클릭으로 실행되는 delete 0건 | pass |
| A11Y-03 | P1 | ConfirmDialog 초기 포커스는 DS 소유. 이 화면의 delete/discard intent 가 그 계약을 상속한다 | 삭제 다이얼로그 open 시 `document.activeElement` = 취소 버튼 | 종속 |
| A11Y-05 | P1 | 분류 select 가 `SelectField isInvalid` 를 쓰고(`PortfolioFormPage.tsx:132`) DS 가 `aria-invalid` 를 실어 준다(`SelectField.tsx` `aria-invalid={isInvalid ? true : undefined}`). 호출부가 `aria-describedby` 도 직접 넘긴다(`:135-137`) | 빈 분류로 제출 → `<select aria-invalid="true" aria-describedby="portfolio-category-error">` | pass |
| A11Y-06 | P1 | AppShell 이 skip link 를 소유한다(`AppShell.tsx:289-306`·`:429`). 이 화면이 그 아래에서 렌더된다 | `/portfolio/items` 에서 첫 Tab → 'ë³¸ë¬¸ìœ¼ë¡œ 건너뛰기' 가시화 | 종속 |
| A11Y-07 | P1 | `AppShell.tsx:324-340` `RouteFocusAnnouncer` 가 라우트 변경 시 `<main>` 포커스 + polite announce 를 한다. 이 화면의 목록↔폼 이동이 이를 상속한다 | 목록 → `/new` 이동 시 activeElement 가 `#tds-main` | 종속 |
| A11Y-08 | P1 | **행 안에 keyboard-focusable 이름 링크가 없다.** 제목이 평문이고(`PortfolioListPage.tsx:81`) 행 이동은 `useRowNavigation.rowActivateProps`(`CrudTable.tsx:172`) — 헤더가 명시하듯 **마우스 전용**이다. 키보드 사용자는 행 액션의 '수정' 버튼으로만 같은 목적지에 갈 수 있다(요구가 말하는 '동일 타깃 등가물'은 존재하나 '이름 링크'는 아니다) | 행을 Tab 으로 순회 → 체크박스·토글·수정·삭제에만 멈춘다. 제목은 포커스를 받지 않는다 | gap |
| A11Y-13 | P1 | **검증 실패 시 첫 오류 필드 포커스는 성립한다** — `useCrudForm.ts:253` `form.handleSubmit(onValid, onInvalid)` + RHF `shouldFocusError` 기본값, `:234-238` 주석이 이를 계약으로 명시. 서버 422 도 `:184` `setFocus(first.field)`. **폼 진입 시 첫 필드 자동 포커스는 없다** | 빈 폼 제출 → activeElement = 분류 select(첫 오류). `/new` 진입 직후 activeElement = body | gap(부분) |
| A11Y-14 | P2 | `ImageUploadField.tsx:244-249` 의 '업로드 완료' 안내가 `role="status"`/`aria-live` 없는 `<span>` 이다. 이 화면은 대표 이미지 업로드에서 그 표면을 쓴다 | 이미지 업로드 → 스크린리더가 완료를 읽지 않는다 | gap |
| A11Y-16 | P1 | 이 화면은 신규 인터랙티브 표면을 도입하지 않는다 — 전부 DS/공용 프레임워크 컴포넌트의 소비다(`SelectField`·`Button`·`ToggleSwitch`·`RowActions`·`ConfirmDialog`·`ImageUploadField`·`ImageGalleryField`) | axe 검사 대상. 판정 정본은 각 컴포넌트 계약 | 종속 |
| MOTION-04 | P1 | `CrudTable` 행 add/remove 에 FLIP/layout motion 이 없다 — 삭제 시 나머지 행이 즉시 스냅한다. 이 화면은 삭제·일괄 삭제로 그 전환을 자주 일으킨다 | 항목 삭제 → 아래 행들이 애니메이션 없이 튀어 올라온다 | gap |
| IA-03 | P1 | 이 화면의 3라우트 중 2개가 non-top-level(`/new`·`/:id/edit`)인데 **breadcrumb 이 없다** — AppHeader 는 단일 라벨만 그린다(`AppHeader.tsx:101`) | `/portfolio/items/new` 에 '포트폴리오 관리 > 포트폴리오 > 등록' trail 없음 | gap |
| IA-06 | P1 | 무게 규칙과 일치한다 — 포트폴리오는 rich 엔티티(8필드 + 이미지 11장)라 **전용 form route**(`App.tsx:198-199`), 카테고리는 짧은 taxonomy 라 **modal**(FS-024). 혼용 없음 | 이 화면의 edit 가 modal 로 열리지 않고 `/:id/edit` 라우트로 가는지 | pass |
| IA-07 | P1 | `FormPageShell.tsx:147-155` 가 '목록으로' + `ChevronLeftIcon` 을 좌상단에 단일 형태로 그린다. 이 화면이 그것을 상속한다 | 폼 back-link 라벨 = '목록으로', 아이콘 = ChevronLeft | 종속 |
| IA-08 | P1 | `FormPageShell.tsx:179-191` 이 in-card footer 에 취소(좌)·저장(우)를 고정 배치한다. 이 화면이 그것을 상속한다 | 등록/수정 폼의 버튼 상대 위치·컨테이너 동일 | 종속 |
| IA-14 | P1 | 이 화면의 표는 8열이고 bounded 가로 scroll 컨테이너가 없다(`CrudTable.tsx:116` `<table style={tableStyle}>` 직접). 행 액션 아이콘 버튼의 touch-target 규격은 DS 소유 | 375px 에서 `/portfolio/items` → 표가 page grid 를 넘치는지 확인 | gap |
| ERP-01 | P1 | 분류 배지 tone 을 **이 화면 전용 helper 가 정한다** — `types.ts:11-17` `categoryTone(categoryId)` 가 id 문자코드 합 해시로 4색을 배정한다. 공유 status→tone 레지스트리를 쓰지 않는다. **다만 카테고리는 lifecycle status 가 아니라 사용자 정의 분류라** 요구의 대상(대기/승인/반려 등)과 성격이 다르다 | 같은 카테고리가 항상 같은 톤인지(해시라 안정). 서로 다른 카테고리가 같은 톤을 가질 수 있다 | n-a(사유: ERP lifecycle status 표면 아님) |
| ERP-08 | P2 | 일자 셀이 `item.date` 원문을 그대로 쓴다(`PortfolioListPage.tsx:83`) — `shared/format` 을 거치지 않는다. 건수는 `formatNumber` 를 쓴다(`CrudListShell.tsx:119`) | 표 셀의 날짜가 공유 formatter 를 경유하지 않는다 | gap |
| ERP-12 | P1 | 목록 export(CSV/xlsx) affordance 가 없다. 툴바에 등록 버튼만 있다 | `/portfolio/items` 툴바에 내보내기 버튼 없음 | gap |
| ERP-13 | P1 | **해소됨(통합).** 조사 헬퍼가 `shared/format.ts:269+`(`objectParticle`·`topicParticle`)로 승격됐고 — 이전엔 `logs/josa.ts` 등 3곳 사본 — 이 화면의 사용자 대상 문구가 전부 그것을 경유한다: `useCrudList.tsx:108`(삭제 토스트)·`:158`(삭제 확인 문구)·`useCrudForm.ts:222`(등록/저장 토스트)·`shared/crud/validation.ts:17,20`(`requiredText`)·`:67`(`requiredImage`)·`FormPageShell.tsx:129-130`(로드 실패)·`PortfolioListPage.tsx:91-92`(노출 토글 토스트). 빈 상태는 `CrudTable.tsx:59-72`+`:157-167` 이 `{createVerb}된 {label}이(가) 없습니다` 를 **조립**해 `@tds/ui` `Empty` 에 넘긴다(`Empty.tsx:16-28` 이 자족 헬퍼로 받침 계산 — 레이어 경계상 앱 shared 를 import 할 수 없어 의도된 사본) | 항목 '온담 플래그십 스토어'(받침 없음) 삭제 → `'온담 플래그십 스토어'를 삭제했습니다.`. '한빛 리버뷰 펜트하우스 리모델링'(받침 ㅇ) → `…'을 삭제했습니다.`. **앱 전체에서 사용자 대상 `'을(를)'`/`'이(가)'`/`'은(는)'` 리터럴 grep = 0**(잔여 히트 12건은 전부 주석·헬퍼 설명문·'이 리터럴을 내지 않는다'를 단언하는 테스트다) | pass |
| ERP-15 | P1 | 페이지네이션도 virtualization 도 cap 도 없다 — `fetchAll` 전량이 DOM 으로 간다(IA-04 gap 과 같은 뿌리). 8열이라 가로 overflow 전략도 없다 | 픽스처를 1,000건으로 늘린다 → 전량 렌더, scroll/selection jank | gap |
| EXC-05 | P1 | `AbortSignal.timeout` 앱 전역 0건. 이 화면의 모든 요청이 상한 없는 `shared/async.wait()` 에 의존한다 | never-resolving fixture → 무한 spin, 타임아웃 메시지 없음 | gap |
| EXC-06 | P1 | **타입은 준비됐다** — `shared/errors/http-error.ts` 의 `HttpError` 가 status 를 싣고 화면이 그것으로 분기한다(404 → `FormPageShell` not-found / 409 → conflict dialog / 422 → 필드 인라인 / 그 외 → generic 배너 + 참조 코드). **그러나 이 화면 어댑터의 실사용 경로는 status 를 싣지 않는다**: `store.getItem` 은 generic `Error`(`store.ts:170`), `?fail=` 는 `new Error(…)`(`dev.ts:91`). status 가 붙는 것은 `?status=<op>:<code>` 스위치뿐이다 | `?status=save:422` → 필드 인라인 오류 + 포커스(경로 동작 확인). 실사용 404(없는 :id) → generic '불러오지 못했습니다'(404 분기 미도달) | gap(부분) |
| EXC-07 | P1 | `useCrudForm.ts:176-186` 이 422 의 `violations` 를 RHF `setError` 로 그 입력에 꽂고 첫 필드로 포커스를 옮긴다 — form-level 배너는 generic 전용(`:188`). 이 화면의 폼이 그 배선을 상속한다 | `?status=save:422` → 배너가 아니라 필드 인라인. **단 `dev.ts` 의 422 는 `violations` 를 싣지 않아** 현재는 배너로 폴백한다(`:176` 의 `violations.length > 0` 조건) | gap(부분) |
| EXC-10 | P1 | `settleAll`(`bulk.ts:19-21`)이 allSettled 로 부분 실패를 **건수만** 돌려준다 — 실패 id 를 반환하지 않아 '실패분만 재시도'가 불가능하다. 다이얼로그 유지·선택 유지·전원 성공 시에만 invalidate 는 성립한다(`useCrudList.tsx:135-148`) | 3건 중 1건만 실패하게 만든다 → 'N건 중 M건' 은 뜨지만 재시도가 3건 전부를 재실행한다 | gap(부분) |
| EXC-11 | P1 | `navigator.onLine` 앱 전역 0건 | offline 토글 → 배너 없음, write 가 설명 없이 실패 | gap |
| EXC-12 | P1 | **해소됨(F3b).** 셸은 원래 갈랐다 — `useCrudForm.ts:144-149` 가 `isNotFound(loadError)` 로 `'not-found' \| 'error'` 를 만들고 `FormPageShell.tsx:116-144` 가 두 문구·복구 수단을 가른다(404 는 '다시 시도' 를 **권하지 않는다** — `:117-120` 주석). 못 실어 주던 쪽이 고쳐졌다: `createStoreAdapter.fetchOne`(`crud.ts:192-194`)이 `exists(id)` 로 먼저 보고 `HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.')` 를 던진다 — store 의 status 없는 generic `Error`(`_shared/store.ts:170`)는 그 경계에 도달하지 못한다(`:183-191` 주석이 이 전환을 명시한다) | 없는 `:id` 로 `/portfolio/items/zzz/edit` 진입 → **'포트폴리오를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.' + '목록으로'(재시도 버튼 없음)**. 무한 loading·crash 없음. 대조: `?fail=portfolio:detail` 은 status 없는 Error 라 여전히 'error' 분기('불러오지 못했습니다' + 다시 시도) — 의도된 구분이다 | pass |
| EXC-14 | P1 | 노출 토글이 **비관적**이다 — `useCrudRowUpdate.ts:44-59` 는 plain `mutate` + `pendingId` 이고 `onMutate`/snapshot/rollback 이 없다. 요구가 지목한 '공유 useCrudRowUpdate 는 pessimistic' 이 그대로다. create/delete 가 confirm+busy 로 pessimistic 인 것은 요구와 일치 | 노출 토글 클릭 → 400ms 동안 값이 그대로이고 스위치만 잠긴다(즉시 반영 아님). `?fail=portfolio:save` → 되돌릴 낙관 반영이 없으므로 rollback 도 없다 | gap |
| EXC-15 | P1 | 업로드 전 client 검증은 성립한다 — `ImageUploadField.tsx:37-43` `imageFileError(file, 5)` 가 type/size 를 막고 인라인 거절(`:170-176`), 요청 미발사. 로드 실패 fallback 은 갤러리만 `role="img"` 이고 단일 필드는 드롭존 문구 전환(`:101-105`). **progress/cancel 경로 없음 — 업로드 자체가 없기 때문이다.** 이것은 **알려진 빚**이고(§5 #15) 컴포넌트가 그 사실을 헤더에 명시한다(`ImageUploadField.tsx:9-24`: '가짜 업로드 성공을 여기서 지어내지 않는다 — 그건 문제를 숨길 뿐이고 계약이 약속한 값과도 다르다') | 비이미지/6MB 파일 선택 → 인라인 거절, 값 미변경. progress 표시 없음 | gap(부분) |
| EXC-18 | P1 | selection scope 가 '지금 보이는 행 전량'이다 — `CrudListShell.tsx:143-147` 이 `visibleItems.map(id)` 를 `toggleAll` 에 넘긴다. **Shift-click range·진행률·취소·대량 임계 강화 confirm 없음**. 페이지 개념이 없어 cross-page 'all' 문제는 발생하지 않는다 | 50행을 선택하려면 체크박스 50번. 일괄 삭제 confirm 은 count 를 말하지만 임계 경고가 없다 | gap |
| EXC-19 | P1 | 세션 만료 시 dirty 폼 draft 스냅샷·복원이 없다. 만료 전 연장 프롬프트도 없다. 이 화면의 폼(이미지 포함 8필드)이 그 위험에 노출된다 | dirty 폼에서 `?status=save:401` → 재인증 경로로 가고 입력이 사라진다 | gap |
| EXC-20 | P1 | `useCrudForm.ts:189` `setErrorReference(referenceOf(cause))` + `FormFeedback.tsx:38-47` 이 짧은 참조 코드(`TDS-<base36 시각>-<난수>`, `user-select: all`)를 친근한 문구와 함께 보인다. raw body/stack/status 를 산문으로 쓰지 않는다. `ErrorBoundary` 의 `RouteErrorScreen` 도 참조를 받는다 | `?status=save:500` → '저장하지 못했습니다…' + '오류 코드 TDS-…' 가 복사 가능하게 뜬다. `?fail=save`(generic Error)는 참조 코드가 없다(`referenceOf` 가 HttpError 만 본다 — 의도된 동작: 없는 것을 지어내지 않는다) | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 관측(코드 대조) |
|---|---|---|
| 목록 조회 응답 p95 | **≤ 400ms**(백엔드 연결 후, BE-023 EP-01) | 측정 불가 — 네트워크 0건. 픽스처는 `LATENCY_MS = 400` 고정 |
| 첫 렌더(목록 스켈레톤 표시까지) | ≤ 100ms(라우트 전환 후) | 코드 분할 없음 — `App.tsx:62-63` 이 `PortfolioListPage`·`PortfolioFormPage` 를 **정적 import** 한다(전 화면 동일). 초기 번들에 전량 포함 |
| 재조회 횟수(목록 1회 방문) | 1회 | `staleTime: 30_000` · `refetchOnWindowFocus: false` · `retry: false`(`queryClient.ts:46-67`) → 30초 내 재진입은 0회. **단 분류 선택지가 별도 쿼리라 목록 진입 시 총 2회 발사된다**(항목 + 카테고리) |
| 폼 진입(수정) 요청 수 | 2회 | 상세 1 + 분류 선택지 1 |
| DOM 행 수 | **상한 없음 — 예산 미정** | 페이지네이션·virtualization 부재(§5 #3). 1,000건이면 1,000행이 DOM 에 있다 |
| 메모리(object URL) | 누수 없음 | `ImageUploadField.tsx:138-143`·`ImageGalleryField.tsx:122-128` 이 언마운트·교체·제거 시 `revokeObjectURL` 한다. **단 저장된 `blob:` 문자열은 DB 로 간다**(§5 #15) |

> **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** 픽스처 응답을 인위적으로 늦춰 로딩 상태를 화면에서 볼 수 있게 하는 장치다. 백엔드 연결 시 이 상수는 사라진다 — **이 값을 SLO 로 읽지 마라.**

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 실패 | 인라인 배너 + 재시도, 표 유지 시도 | **성립**(`CrudListShell.tsx:156-165`). 단 status 별로 갈리지 않는다(EXC-06) |
| 분류 선택지 조회 실패 | 인라인 배너 + 재시도 | **미성립** — 표면 없음. 폼에서 저장이 영구 불가(§5 #1) |
| 저장 중 서버 500 | 배너 + 참조 코드 + 입력 보존 | **성립**(`FormFeedback.tsx:38-47`) |
| 저장 중 동시 삭제 | 충돌 다이얼로그 + 입력 보존 | **미성립** — 유령 저장(§5 #6). UI 는 있고 트리거만 없다 |
| 렌더 예외 | 셸 유지 + 복구 UI | **성립**(`AppShell.tsx:484-489`, `resetKey={pathname}`) |
| 세션 만료 | 재인증 + returnUrl 복원 | **성립**(전역 401 인터셉터). **단 dirty 폼 입력은 사라진다**(EXC-19) |
| 네트워크 단절 | offline 배너 + write 게이팅 | **미성립** — 감지 없음(EXC-11) |
| 요청 무한 대기 | 상한 abort + 재시도 메시지 | **미성립** — 프론트 상한 없음(EXC-05). 서버 5초(BE-023 §2)가 유일한 천장 |
| 새로고침 | 필터·상태 복원 | **미성립** — 필터가 URL 에 없다(IA-13). 더해 **픽스처가 시드로 되돌아간다**(백엔드 없음) |

### 4.3 데이터 보존 · 감사

| 항목 | 현재 상태 |
|---|---|
| 저장 영속성 | **없다** — `_shared/store.ts` 의 mutable 배열이라 새로고침하면 시드로 되돌아간다. 백엔드 연결 전까지 이 화면의 모든 쓰기는 탭 수명 안에서만 존재한다 |
| 이미지 영속성 | **없다** — `blob:` object URL 이 저장값이다(§5 #15). 저장한 탭에서조차 문서가 바뀌면 깨진다 |
| 삭제 복구 | 불가 — soft-delete·undo window 없음(FEEDBACK-05 는 confirm 으로 충족) |
| 감사 로그 | 이 화면 범위 밖. 누가 언제 노출을 껐는지 추적할 필드가 도메인 타입에 없다(`updatedAt`·`updatedBy` 부재 — §5 #6 과 같은 뿌리) |
| 미저장 입력 보존 | 3경로 가드로 **이탈은 막지만**(FEEDBACK-04) 버튼 이동(§5 #10)·세션 만료(EXC-19)에서는 사라진다. draft autosave 없음 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | STATE-02 | **P0** | 분류 선택지 조회 실패에 인라인 배너·재시도가 없다 — `categoriesQuery.data ?? []` 로만 읽는다. 폼에서는 필수 필드를 못 채워 저장이 영구 불가 | 이 화면 | A11 (FS-023 §7 #10 · BE-023 §7.6) |
| 2 | IA-13 | **P0** | 분류 필터가 URL 에 직렬화되지 않는다(`useState` 뿐). `shared/crud/useListState` 미소비 | 이 화면 | A11 (FS-023 §7 #1) |
| 3 | EXC-04 | **P0** | **동시성 토큰 부재** — `PortfolioItem` 에 `updatedAt`/`version` 이 없어 If-Match/ETag 로 보낼 값이 없다. 동시 편집(둘 다 존재)은 **last-write-wins**. *(유령 저장·유령 삭제는 F3b 의 `createStoreAdapter` 409 게이트(`crud.ts:219-221`·`:232-234`)로 해소 — 충돌 다이얼로그가 실사용 경로에서 열린다)* | 이 화면 + 도메인 모델 | A63 (BE-023 §7.3 · §7.10 #2 — 응답에 `version`/`ETag` 를 실어야 프론트가 보낼 수 있다) · A11 |
| 4 | EXC-03 | **P0** | 쓰기 액션 권한 게이팅 부재 — **`useRouteWritePermissions` 는 이제 7곳이 소비하지만**(products 3 · settings 4) `pages/portfolio/**` 는 그 밖이다. read 게이팅은 성립 | **이 화면**(공용 훅 + 7곳 선례 존재) | A11 change_request (FS-023 §7 #2) |
| 5 | IA-04 | **P0** | Pagination 부재 — `CrudListShell` 이 전량을 렌더한다. 항목 수 상한 없음 | **앱 전역**(shared/crud) | A11 change_request (FS-023 §7 #3) |
| 6 | IA-02 | **P0** | **`<h1>` 이 2개**(AppHeader `:101` ↔ `FormPageShell.tsx:160`) — '단일 title 메커니즘' 미충족. 그리고 '등록/수정' **행위가 AppHeader 제목에 없다**(`nav-config.ts:294-296` 이 의도로 명시). *(가지 라벨 폴백은 `findCoveringLeaf`(`:260-278`)로 해소 — 이제 '포트폴리오 관리' 가 아니라 '포트폴리오')* | **앱 전역**(AppHeader · FormPageShell · nav-config) | A11 change_request · A40 (FS-023 §7 #12) |
| 7 | A11Y-11 | **P0** | **`ImageUploadField` 의 required 만 AT 에 닿지 않는다** — `FormField` 를 쓰지 않아 `withAriaRequired`(`FormField.tsx:50-56`) 주입 경로 밖이고, 드롭존 button 에도 hidden file input 에도 `aria-required` 가 없다. *(필수 6개 중 5개는 F3a 의 런타임 주입으로 충족 — 자식이 `input`/`SelectField`/`textarea`)* | **앱 전역**(@tds/ui `ImageUploadField`·`ImageGalleryField` 계약) | A11 change_request (FS-023 §7 #14) |
| 8 | MOTION-03 | **P0** | `ToggleSwitch.css` 에 reduced-motion off 블록 부재 — 이 화면이 그 표면을 2곳에서 쓴다 | **앱 전역**(@tds/ui `ToggleSwitch.css`) | A11 change_request (DS) |
| 9 | ~~EXC-12~~ | ~~P1~~ | **해소됨(F3b)** — `createStoreAdapter.fetchOne`(`crud.ts:192-194`)이 `HttpError(404)` 를 던져 셸의 not-found 분기가 실사용 경로에서 발현된다 | — | — |
| 10 | FEEDBACK-04(부분) | P1 | '취소'·'목록으로' 버튼이 `<button>`+`navigate()` 라 미저장 가드를 우회한다(3경로 자체는 pass) | 공용(shared/crud `FormPageShell`) | A11 (FS-023 §7 #11) |
| 11 | EXC-14 | P1 | 노출 토글이 비관적 — 낙관 반영·롤백·재시도 toast 없음 | 공용(shared/crud `useCrudRowUpdate`) | A11 (FS-023 §7 #6) |
| 12 | EXC-06 / EXC-07(부분) | P1 | `?fail=` 가 status 없는 generic Error 를 던져 class 별 분기가 죽는다. `dev.ts` 의 422 가 `violations` 를 싣지 않아 필드 매핑 경로를 재현할 수 없다 | 공용(shared/crud `dev.ts`) · 이 화면 어댑터 | A63 (BE-023 §7.10 #7) · A11 |
| 13 | STATE-06 | P1 | 카테고리 화면의 변경이 `['portfolio','category-options']` 를 무효화하지 않는다(키가 다른 리소스) | 이 화면 + FS-024 | A11 (FS-023 §7 #18) |
| 14 | STATE-05(부분) | P1 | '진짜 비어있음' 분기에 생성 CTA 없음(`empty.createAction` 미전달). 3분기 copy 는 F2 에서 성립 | 이 화면 | A11 (FS-023 §7 #9) |
| 15 | EXC-15(부분) | P1 | 업로드 progress/cancel 경로 없음 — **업로드 자체가 없기 때문**. `blob:` 값이 저장된다. **이것은 결함이 아니라 근거와 함께 남긴 '알려진 빚'이다** — `shared/crud/validation.ts:41-63` 이 판정을 적는다(도달 가능한 값이 `blob:`/`''` 뿐이라 http(s) 강제 시 5개 폼이 제출 불가 → 막다른 길). 고칠 곳은 검증이 아니라 업로드 이음매(`TODO(backend): POST /api/uploads`). 빚을 고정하는 테스트 3곳: `company/{certificates.test.ts:106-107, logo-list.test.ts:98-99, profile.test.ts:71}`. client 검증은 성립 | 이 화면 + 계약 미정 | A63 (BE-023 §7.2 · §7.10 #1) · A11 |
| 16 | A11Y-08 | P1 | 행 안에 keyboard-focusable 이름 링크 없음(제목이 평문, 행 클릭은 마우스 전용) | 공용(shared/crud `CrudTable`) | A11 (FS-023 §7 #4) |
| 17 | ~~EXC-08(부분)~~ | ~~P1~~ | **해소됨(F3b)** — `WriteContext.idempotencyKey`(`crud.ts:30-42`)가 생겨 키가 어댑터까지 도달하고, `createStoreAdapter` 의 멱등 ledger(`:168,201-203,208`)가 재생을 처리한다. `Idempotency-Key` 헤더 심은 `crud.ts:39` | — | — |
| 18 | ~~ERP-13~~ | ~~P1~~ | **해소됨(통합)** — 조사 헬퍼가 `shared/format.ts:269+` 로 승격되고 이 화면의 모든 사용자 대상 문구가 경유한다. 사용자 대상 `'을(를)'` 리터럴 앱 전역 0건 | — | — |
| 19 | EXC-10(부분) | P1 | 일괄 삭제가 실패 id 를 반환하지 않아 '실패분만 재시도' 불가. 진행률·취소 없음 | 공용(shared/bulk) | A11 (FS-023 §7 #20) |
| 20 | A11Y-13(부분) | P1 | 폼 진입 시 첫 필드 자동 포커스 없음(검증 실패 포커스는 pass) | 공용(shared/crud) | A11 |
| 21 | EXC-05 · EXC-11 · EXC-19 | P1 | 프론트 타임아웃 상한·오프라인 감지·세션 만료 draft 보존 앱 전역 부재 | **앱 전역** | A40 · A11 (FS-023 §7 #22) |
| 22 | A11Y-14 | P2 | 업로드 완료 안내가 live region 아님 | **앱 전역**(@tds/ui) | A11 (FS-023 §7 #16) |
| 23 | COMP-01(부분) · COMP-06 · COMP-09 · COMP-12 | P2 | 손수 쓴 '저장 중…'(loading prop 미사용) · skeleton `length: 5` 하드코딩 · 제목 truncate 부재 · 제목/고객사 카운터 부재 | 공용 + 이 화면 | A11 (FS-023 §7 #8 · #5 · #21) |
| 24 | IA-03 · IA-14 · MOTION-04 · ERP-08 · ERP-12 · ERP-15 · EXC-18 | P1/P2 | breadcrumb 부재 · 반응형 미선언 · 행 FLIP 부재 · 일자 포맷터 미경유 · export 부재 · 대형 리스트 계약 부재 · Shift-range/진행률 부재 | 공용 + 앱 전역 | A11 |

## 6. 측정 도구 · 재현 스위치

**E2E 미실행 — 이 문서의 모든 판정 근거는 `4b805ad`(2026-07-17) 코드 대조다.** 아래는 판정을 *확인할 수 있는* 절차이며, 이 문서가 그것을 실행했다는 뜻이 아니다.

### 6.1 실패 재현 — `?fail=` (코드에서 확인한 실제 값)

정의: `shared/crud/dev.ts:81-93`. 문법 `?fail=<op>` · `?fail=<scope>:<op>` · `?fail=all`(쉼표로 복수). 던지는 것은 **status 없는 `new Error('요청을 처리하지 못했습니다.')`** 다.

| scope | op | 걸리는 어댑터 함수 | 화면 결과 |
|---|---|---|---|
| `portfolio` | `list` | `portfolioAdapter.fetchAll` **및 `fetchPortfolioCategoryOptions`** | 목록 = FS-023-EL-009 배너. **분류 선택지 = 표면 없음**(§5 #1) |
| `portfolio` | `detail` | `portfolioAdapter.fetchOne` | 수정 폼 = FS-023-EL-015 대체 화면 |
| `portfolio` | `save` | `portfolioAdapter.create` · `update` | 폼 = FS-023-EL-016 배너 / 노출 토글 = 실패 토스트 |
| `portfolio` | `delete` | `portfolioAdapter.remove` | 삭제 다이얼로그 안 배너 / 일괄은 부분 실패 건수 |

> ⚠ **`fetchPortfolioCategoryOptions` 가 항목 목록과 같은 scope·op 를 쓴다**(`data-source.ts:17` `SCOPE = 'portfolio'`, `:34` `failIfRequested(SCOPE, 'list')`). 그래서 **분류 선택지만 실패시키는 재현 경로가 없다** — §5 #1 을 격리 검증하려면 스코프 분리가 선행돼야 한다. 이것 자체가 측정 도구의 gap 이다.

### 6.2 status 재현 — `?status=<op>:<code>`

정의: `shared/crud/dev.ts:24`·`:57-71`. 문법 `?status=<op>:<code>` · `?status=<scope>:<op>:<code>` · `?status=all:<code>`. 재현 가능 status(`:27-37`): **400 · 401 · 403 · 404 · 409 · 412 · 422 · 429 · 500**. `HttpError(status, message)` 를 던지므로 **화면의 status 분기를 실제로 구동하는 유일한 수단**이다.

| 예시 | 확인 대상 |
|---|---|
| `?status=save:409` | FS-023-EL-029 충돌 다이얼로그(입력 보존·유령 저장 금지). **이제 스위치 없이도 재현된다** — 다른 탭에서 항목을 삭제한 뒤 저장하면 `createStoreAdapter`(`crud.ts:219-221`)가 같은 409 를 낸다 |
| `?status=save:422` | EXC-07 필드 인라인 경로. **단 `dev.ts` 가 `violations` 를 싣지 않아 배너로 폴백한다**(§5 #12) |
| `?status=save:500` | EXC-20 오류 참조 코드(`TDS-…`) |
| `?status=detail:404` | EXC-12 not-found 분기 — 셸이 '찾을 수 없습니다 + 목록으로'(재시도 없음)를 그린다. **이제 실사용 경로도 이 status 를 만든다** — 없는 `:id` 로 진입하면 `crud.ts:192-194` 가 404 를 던진다 |
| `?status=list:401` | EXC-02 전역 401 인터셉터 |
| `?status=save:403` | EXC-03 서버측 거절(프론트 게이팅 부재와 별개 — §5 #4) |

### 6.3 쓰지 않는 스위치

**`?delay=` 은 이 화면에 없다.** `shared/crud/dev.ts` 에 정의가 없으며 `pages/dashboard/api.ts` · `pages/members/data-source.ts` 에만 존재한다. STATE-01 을 재현할 때 `?delay=3000` 대신 **고정 `LATENCY_MS = 400`**(`dev.ts:12`) 창을 쓴다 — 400ms 는 짧으므로 필요하면 network throttling 으로 관측한다.

### 6.4 정적 가드 (E2E 없이 회귀를 막는 것)

| 도구 | 고정하는 것 |
|---|---|
| `apps/admin/src/shared/a11y-guard.test.ts` | A11Y-11 의 describedby 절(짝 없는 `aria-invalid` = 0) · A11Y-12(필터에 `aria-current` = 0). **`aria-required` 는 이 가드가 보지 않는다 — 그리고 볼 수도 없다**: F3a 의 주입은 `FormField.tsx:50-56` 의 런타임 `cloneElement` 라 소스 스캔으로는 관측되지 않는다. required 절의 회귀 방어는 **렌더 테스트**(`packages/ui` 의 `FormField.test.tsx`)가 맡아야 한다 — §5 #7 |
| `apps/admin/src/shared/token-guard.test.ts` | TOKEN-01(hex/px/border 키워드 부재) |
| `apps/admin/src/pages/portfolio/items/portfolio.test.ts` | 순수 규칙(`sortPortfolioItems`·`filterPortfolioItems`·`countPortfolioByCategory`·`countItemsUsingCategory`·`toPortfolioInput`) + `portfolioSchema` 검증 문구. **픽스처가 `coverImageUrl: 'blob:cover'` 를 정상 입력으로 쓴다** — 스키마가 스킴을 안 본다는 §5 #15 의 방증이다 |

## 7. 자기 점검

- [x] P0 30건을 **quality-bar 의 순서 그대로** 전수 판정했다 — 빈칸 0건
- [x] §2.1 산수 검산: pass 11 + 종속 8 + n-a 3 + gap 8 = **30** ✓ (차원별 STATE 3 · TOKEN 5 · COMP 1 · FEEDBACK 3 · A11Y 4 · MOTION 3 · IA 5 · EXC 6 = 30 ✓)
- [x] 모든 `pass` 에 **파일:라인** 코드 근거를 달았다
- [x] 모든 `gap` 에 **재현 가능한 측정 기준**을 달았고 §5 로 이관했다 — 범위(이 화면/공용/앱 전역)를 구분했다
- [x] 모든 `n-a` 에 사유를 달았다 (COMP-10 · FEEDBACK-06 · A11Y-12 · ERP-01)
- [x] **quality-bar 요구 문구를 복제하지 않았다** — ID 참조 + '이 화면에서 어떻게/무엇으로 판정하는가' 만 썼다
- [x] §6 의 `?fail=` scope·op 를 **어댑터 코드에서 확인**해 적었다(`SCOPE = 'portfolio'`, op 4종). **`?delay=` 을 쓰지 않았다**(이 화면에 없다). `LATENCY_MS = 400` 이 예산이 아님을 §4.1 에 명시했다
- [x] 'E2E 미실행 — 판정 근거는 코드 대조' 를 §1·§6 에 명시했다
- [x] **판정 기준일을 `2026-07-17 · HEAD = 4b805ad` 로 갱신하고 F3a·F3b·통합 이후 코드로 P0 30건을 전수 재확인했다.** P0 판정이 뒤집힌 것은 **0건**(§2.1 의 11/8/3/8 이 그대로다). **범위가 좁아진 P0 2건**(A11Y-11 6→1 · EXC-04 3사유→1사유)은 gap 을 유지했다 — 좁혀진 gap 을 pass 로 올리지 않았다. **P1 3건은 pass 로 전환**(ERP-13 · EXC-12 · EXC-08 멱등키 절)했고 §3·§5 를 함께 갱신했다
- [x] **A11Y-11 을 grep 이 아니라 호출부 자식 타입으로 판정했다** — `withAriaRequired` 는 런타임 `cloneElement` 라 소스 grep(앱 전역 1건)은 지표가 아님을 §1.1·§6.4 에 명시했다
- [x] §1.1 표기 규약의 예외(상속 항목의 검증된 위반을 gap 으로 적는 규칙)를 명시하고 해당 2건(A11Y-11 · MOTION-03)을 밝혔다
- [x] FS-023 §7 ↔ BE-023 §7.10 ↔ 이 문서 §5 의 이관 항목을 상호 참조로 일치시켰다
