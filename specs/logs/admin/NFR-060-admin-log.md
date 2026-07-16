---
id: NFR-060
title: "관리자 로그 비기능 명세"
functionalSpec: FS-060
backendSpec: BE-060
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-060. 관리자 로그 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-060 관리자 로그 (`/logs/admin`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-060(요소·예외) · BE-060(계약·보안 판정) · **NFR-061 · NFR-062 · NFR-063** — **4화면이 `LogListShell` 한 벌을 공유하므로 P0 판정이 대부분 겹친다.** 이 문서는 겹치는 판정도 **이 화면 고유의 근거**(자기 컬럼·자기 축·자기 픽스처)로 다시 확인해 적는다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면 또는 `logs/**` 공용 모듈의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = 4b805ad`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 또는 `logs/**` 섹션 공용 모듈)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·`shared/**` 가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다. 판정은 소유 문서/DS 에 종속되며, 여기서는 **이 화면의 어느 표면이 그 계약을 상속하는지**를 못 박는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격 — N/A 가 6건인 이유

**이 화면은 읽기 전용 감사 목록이다.** 서버 상태를 바꾸는 요청이 0건이고(FS-060 §4.1), 폼·확인 다이얼로그·낙관적 업데이트·등록/수정 라우트가 전부 없다 — **그리고 그 부재는 결함이 아니라 설계다**(BE-060 §7.5: 지울 수 있는 감사 로그는 감사 로그가 아니다). 그래서 quality-bar 의 P0 30 중 **6건이 표면 부재로 N/A** 이며 전부 쓰기 축이다.

**그러나 N/A 를 '문제 없음'으로 읽어서는 안 된다.** 이 화면은 목록 화면의 표면(검색·필터·정렬·페이지네이션·빈 상태·실패 배너·URL 상태·권한 게이팅·모달·토스트)을 **거의 다 갖고 있고**, 남은 24건이 전부 이 화면의 실질이다. 그중 **3건이 gap** 이다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **부분 미충족 — 네 번째 분기에서 깨진다.** 정상 경로는 정확하다: 스켈레톤은 **최초 로드에서만**(`LogListShell.tsx:258` — `loading && data === undefined && range !== null`), 재조회 중에는 `placeholderData: (previous) => previous`(`queries.ts:52`)가 이전 행을 유지하고, 0행일 때만 `<Empty>`(`LogTable.tsx:177-189`), 실패일 때만 Alert 가 표·요약·페이지네이션을 **대체**한다(`:233,278-293` — 셋이 배타적 분기다). **그런데 기간 '직접 지정'이 유효하지 않으면 다섯 번째 상태가 생기고 그것이 `empty` 로 떨어진다**: `range === null` → `enabled: false`(`:152`)로 **조회를 걸지 않는데**, `:251-269` 는 `error === null` 이기만 하면 표를 그리고 그때 `entries = data?.entries ?? []` 는 `[]`, `loading` 은 `false`(쿼리가 꺼져 있다) 이라 **`<Empty>` 가 렌더된다.** 즉 **조회가 성공하지 않았는데 empty 를 그린다** — 요구의 '성공했는데 0행일 때만 empty'를 어긴다. 요약 줄은 '조회 기간을 확인해 주세요.'라 말하고 필터 옆엔 인라인 오류가 떠 있는데 **그 아래 표는 동시에 '조건에 맞는 기록이 없다'고 단정한다** — `validation.ts:11-12` 가 없애려던 바로 그 거짓 빈 상태다 | `/logs/admin?period=custom&from=2026-07-01&to=2027-01-01`(미래) → 필터에 '미래 날짜는 조회할 수 없습니다', 요약에 '조회 기간을 확인해 주세요.', **그런데 표에는 `<Empty>` 가 '필터 초기화' CTA 와 함께 뜬다.** 정상 경로 확증: `?fail=logs-admin:list` → Alert 만(빈 상태 없음) · 걸리지 않는 키워드 → Empty 만(스켈레톤 없음) · 재조회 중 → 이전 행 유지 | **gap** |
| STATE-02 | STATE | 직접 | **충족.** 조회 실패 시 `LogListShell.tsx:278-293` 이 요약·표·페이지네이션을 감추고 `<Alert tone="danger">` + '다시 시도'(`refetch`)를 렌더한다. **read 실패로 토스트를 띄우지 않는다** — 이 화면이 `toast` 를 부르는 곳은 내보내기 성공/실패 둘뿐이다(`:184,194`). 빈 상태로 폴백하지 않는다(`error !== null` 이면 표 자체가 없다). 근거 주석이 이유까지 밝힌다(`:13-16`: '감사 로그가 비어 있는 것과 못 불러온 것이 구분되지 않는다 — 감사에서 그 둘을 헷갈리는 것은 치명적이다'). **`LogListShell.test.tsx:173-183` 이 이 셋을 전부 단언한다**(배너 존재 · '다시 시도' 존재 · `queryByRole('table')` 이 null) | `/logs/admin?fail=logs-admin:list` → 인라인 danger Alert '관리자 로그를 불러오지 못했습니다.' + '다시 시도'. 토스트 0건. '다시 시도' 클릭 → 쿼리 재발행 | pass |
| STATE-04 | STATE | 직접 | **충족.** ① **clamp**: `LogListShell.tsx:164-168` 이 `data.total` 로 총 페이지를 다시 계산해 `state.page > pages` 면 `setPage(pages)` 한다 — 필터를 좁혀 3페이지가 1페이지가 되면 1페이지로 보정된다. ② **조건 변경 시 page 리셋**: `list-state.ts:180-182` `resetPage` 를 축(`:277`)·기간(`:195`)·직접지정(`:207`)·검색어(`:219`)·페이지 크기(`:245`) 변경이 전부 부른다. ③ **선택 리셋**: **이 화면에 선택이 없다** — 체크박스 열이 0개다(`LogTable.tsx:6-7`: '일괄 액션이 없기 때문이다. 선택은 무언가를 하기 위한 것이지 선택 그 자체가 목적이 아니다'). 요구의 두 절 중 clamp 는 직접 충족하고 selection 절은 **대상이 없다** | 100건을 20줄씩 → 5페이지 → 5페이지로 이동 → 액션 필터로 10건까지 좁힘 → **page 가 1로 리셋**(조건 변경이므로 clamp 이전에 resetPage 가 먼저 건다). URL 을 `?page=9` 로 직접 쳐서 진입 → 마지막 페이지로 보정 | pass |
| TOKEN-01 | TOKEN | 직접 | **충족.** 이 화면의 스타일 표면 — `logs.css`(섹션 전용) · `AdminLogPage.tsx:28-72`(`StatusCell` 계열 없음, 순수 render) · 공용 컴포넌트의 style 객체 — 이 전부가 `var(--tds-*)` 만 참조한다. **`apps/admin/src/pages/logs/**` 전체에 primitive 밖 hex · `[1-9]px` 리터럴 · bare border/outline 키워드 grep = 0**(내가 직접 실행). `logs.css:15` 가 그 규율을 파일 머리말에 명시한다. 격자·배경·톤을 전부 토큰으로 그린다(`logs.css:23-37`) | `grep -rE "#[0-9a-fA-F]{3,8}|[^-a-z0-9][1-9][0-9]*px|(outline\|border):\s*(thin\|medium\|thick)" apps/admin/src/pages/logs/` → **0건**. ESLint/stylelint 0 warning. ⚠ 예외 1건은 **의도된 것**: `logs.css:86` `font-family: monospace` — 토큰에 mono 계열이 없어 플랫폼 키워드를 쓴다(하드코딩 폰트 이름이 아니라 사용자 설정을 따르는 키워드다. 근거는 `logs.css:68-72`, 승격은 §4.4) | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 정렬 헤더 버튼(`LogTable.tsx:150` `tds-ui-focusable`) · 상세 열기 버튼(`:210`) · 필터 항목 버튼(`LogFilterPanel.tsx:75`) · DS `Button`/`SearchField`/`SelectField`/`DateRangeField`/`Pagination`/`Modal` — 이 전부가 DS 의 `tds-ui-focusable` 계약을 상속한다. **이 화면은 자체 `:focus-visible` 규칙을 선언하지 않는다**(`logs.css:41-42` 가 그것을 명시: '포커스 링은 공용 `.tds-ui-focusable` 이 준다(단일 토큰) — 여기서 다시 그리지 않는다') | 판정은 DS(`packages/ui`) 소유 문서를 따른다. 이 화면에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면(`logs.css` · 화면 style 객체)에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰을 소비하는 표면은 **상속된 둘**이다 — 내보내기 토스트의 entrance(`Toast.css:26` — `var(--tds-motion-easing-decelerate)`)와 로딩 스켈레톤의 animation(`shared/ui/ui.css:83-95`). 둘 다 이 화면이 실제로 띄운다(FS-060-EL-017 · EL-012) | 판정은 tokens codegen(`motion.easing.*`)·`Toast.css` 소유 문서를 따른다. 이 화면에서 `transition`/`animation` grep = 0 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 floating/overlay 표면은 **둘**이다 — 상세 다이얼로그(`Modal.css:36` `box-shadow: var(--tds-shadow-modal)`)와 내보내기 토스트(`Toast.css:21` `box-shadow: var(--tds-shadow-overlay)`). 둘 다 semantic shadow 토큰을 참조한다. **이 화면은 `box-shadow` 를 선언하지 않는다** — 페이로드 코드 블록도 배경 토큰만 쓴다(`logs.css:84`) | 판정은 DS(`Modal`·`Toast`)·tokens 소유 문서를 따른다. 이 화면에서 `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — 페이지 제목은 AppHeader 가 그린다(IA-02 참조). 이 화면의 텍스트 계층은 필터 제목 `<h2>`(`LogFilterPanel.tsx:64` — `filterHeadingStyle`) · 상세의 `<h3>`(`LogPayloadDialog.tsx:88` — label-md + bold) · 표 헤더/셀 · 캡션(`logs.css:87`)이며 **자체 titleStyle 을 선언하지 않는다** | 판정은 tokens typography · `AppHeader` 소유 문서를 따른다. **이 화면의 title 소스는 하나다** — IA-02 참조 | 종속 |
| COMP-10 | COMP | 직접 | **충족.** 검색 입력이 `useDebouncedSearch` 를 소비한다 — `LogListShell.tsx:122` 가 훅을 부르고(`{ initial: state.keyword, onCommit: setKeyword }`) `:222` 가 그것을 `LogToolbar` 로, `LogToolbar.tsx:81-87` 이 DS `SearchField` 의 native 패스스루로 `<input>` 에 흘린다. 요구의 세 절이 전부 걸린다: ① **조합 중 커밋 안 함** — `useDebouncedSearch.ts:87` (`if (composing) return`), 판정은 state+ref 이중(`:64-70`)이라 `onKeyDown` 이 동기적으로 본다. ② **조합 중 Enter 미submit** — `:121-124` 가 `nativeEvent.isComposing || composingRef.current` 면 `stopPropagation` 하고 반환한다(두 신호를 함께 보는 이유가 `:117-120` 에 있다). ③ **debounce 250ms** — `:23,93-95`. ④ **stale 응답 무효** — 키워드가 **쿼리 키의 일부**라(`queries.ts:21` `logKeys.list(scope, query)`, `query` 에 `keyword` 포함) 늦게 온 이전 응답은 자기 캐시로 가고 화면이 구독하는 최신 키를 덮지 못한다 — **last-response-wins 경쟁이 구조적으로 성립하지 않는다**(`queries.ts:37-40`). 이 섹션이 갖고 있던 사본은 공유 훅으로 수렴됐다(`list-state.ts:319-325`) | 검색창에 '한**' 을 IME 로 입력 → 자모마다가 아니라 **조합 완료 + 250ms 후 1회** 커밋(URL `?q=` 갱신, `replace` 라 history 안 쌓임 — `list-state.ts:213-226`). 조합 중 Enter → 제출 안 됨. 조합 아닌 Enter → 즉시 커밋 | pass |
| FEEDBACK-02 | FEEDBACK | N/A | **이 화면에 파괴적/비가역 액션이 없다.** 서버 상태를 바꾸는 요청이 0건이고(BE-060 §7.5) `ConfirmDialog` 를 import 하지 않는다. 표에 ⋯ 액션 열도 체크박스도 없다(`LogTable.tsx:6-9`). 유일한 사용자 개시 작업인 내보내기는 **비파괴적**이다 — 조회 결과를 파일로 받을 뿐이라 게이트할 대상이 아니다(취소는 `AbortController` 로 이미 가능하다 — FS-060-EL-009.1) | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **이 화면에 미저장 상태를 가질 폼이 없다** — RHF 를 import 하지 않고 `isDirty` 를 만들 대상이 0개다. ⚠ **입력은 셋 있다**(검색·기간 직접 지정 2칸) **— 그러나 셋 다 저장 대상이 아니라 조회 조건이고, 값이 즉시 URL 에 반영된다**(`list-state.ts:201-226`). 즉 **'미저장'이라는 상태가 원리적으로 존재하지 않는다**: 이탈해도 잃을 것이 없고, 오히려 URL 이 그것을 보존한다(IA-13). 가드할 대상이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면의 modal 은 편집 가능한 폼을 담지 않는다.** 요구의 appliesTo 는 '폼을 담은 모든 modal'인데, `LogPayloadDialog` 는 **읽기 전용**이다 — 입력이 0개이고 푸터에 '닫기' 하나뿐이며(`LogPayloadDialog.tsx:66-70`) 본문은 `dl/dt/dd` + `<pre>` 다. `dirty` 해질 수 있는 입력이 없으므로 dim/Esc/×/Cancel 을 가드할 대상 자체가 없다 — 파일 머리말이 그 판정을 이미 적어 두었다(`:4-8`: '폼이 아니므로 미저장 이탈 가드(FEEDBACK-04/06)가 걸릴 대상 자체가 없다. 감사 기록을 열어 본 것은 아무것도 바꾸지 않는다') | 재현할 표면 없음 (modal 자체의 존재는 MOTION-01 · A11Y-02 에서 판정한다) | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다** — 내보내기 성공/실패(`LogListShell.tsx:184,194`). 그 표면은 `ToastProvider` 소유이고, **항상 마운트된 두 live region** 이 이미 있다: `role="status" aria-live="polite" aria-atomic="false"`(`ToastProvider.tsx:165`)와 `aria-live="assertive" aria-atomic="false"`(`:168`) — 토스트가 하나도 없을 때도 존재한다. kind 로 큐를 갈라 주입만 한다(`:136-137`). 이 화면은 그 계약의 **소비자**다 | 판정은 `ToastProvider` 소유 문서를 따른다. 이 화면에서는 '자체 live region 을 만들지 않고 provider 에 주입한다'만 확인 | 종속 |
| A11Y-02 | A11Y | 직접 | **충족.** `LogPayloadDialog.tsx:58` 이 `useId()` 로 본문 id 를 만들고 `:63` 이 `describedBy={bodyId}` 로 `Modal` 에 넘기며 `:72` 가 그 id 를 본문 `<div>` 에 단다. `Modal.tsx:158` 이 그것을 `aria-describedby` 로 배선한다(`:155-157` 이 `role="dialog"` + `aria-modal="true"` + `aria-labelledby`). 즉 **제목만이 아니라 '무엇에 대한 다이얼로그인가'도 함께 읽힌다** — 주석이 그 의도를 밝힌다(`LogPayloadDialog.tsx:57`). 요구의 appliesTo 가 'Modal, ConfirmDialog' 이고 이 화면은 `Modal` 을 직접 조립하므로 배선 책임이 이 문서에 있다 | 스크린리더로 행을 열면 제목(`'<액션 라벨> · <대상>'`)과 본문(필드 목록 + 마스킹 안내 + 페이로드)이 함께 읽힌다. `dialog[aria-describedby]` 가 본문 `div` 의 id 로 해석된다 | pass |
| A11Y-11 | A11Y | 직접 | **충족.** 이 화면의 폼 컨트롤은 셋이다 — 검색(`SearchField`) · 페이지 크기(`SelectField`) · 기간 직접 지정(`DateRangeField` 2칸). ① **aria-invalid without describedby = 0**: 이 화면에서 유일하게 invalid 해질 수 있는 것은 `DateRangeField` 이고, 그것이 **`aria-invalid` 를 항상 `aria-describedby` 와 짝지어 낸다**(`DateRangeField.tsx:44-45` — `const invalidProps = invalid ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}`. 유효할 때는 두 속성 모두 부여하지 않아 `aria-invalid="false"` 를 남기지 않는다 — `:9-11`). `LogFilterPanel.tsx:152-159` 가 `error={rangeError}` 를 넘겨 그것을 켠다. **`apps/admin/src/pages/logs/**` 의 `aria-invalid` grep = 1 이고 그 1건은 주석이다**(`LogFilterPanel.tsx:151`) — 실제 속성은 DS 가 배선한다. ② **required 노출**: **이 화면에 required 필드가 없다**(필터는 전부 선택적이다) — `DateRangeField.tsx:35,48` 이 `required` 를 지원하나 이 화면은 넘기지 않는다. 요구의 두 절 중 첫 절은 충족하고 둘째 절은 대상이 없다 | 기간을 '직접 지정'으로 두고 종료일에 미래를 입력 → 두 입력이 `aria-invalid="true"` + `aria-describedby` 가 `role="alert"` `<p>` 의 id 로 해석. 유효하게 되돌리면 **두 속성이 모두 사라진다**. `aria-invalid` grep(주석 제외) = 0 | pass |
| A11Y-12 | A11Y | 직접 | **충족.** 좌측 필터의 모든 항목이 `aria-pressed={active}` 다 — `LogFilterPanel.tsx:76`(`FilterGroup` 이 결과·액션·기간 **세 축을 전부 그린다**: `:126-135` 축 루프 + `:139-146` 기간). **`aria-current` grep = 0**(`apps/admin/src/pages/logs/**` 전체). 파일 머리말이 그 규칙과 이유를 못 박는다(`:10-12`: '선택 상태는 aria-pressed 로만 표기한다. 같은 토글이 화면마다 다른 속성으로 읽히면 보조기기 사용자가 매번 다시 배워야 한다. aria-current 는 쓰지 않는다 — 그것은 "현재 위치"이지 "눌린 상태"가 아니다'). 그리고 스타일이 `filterItemStyle(active)` 라 **색과 ARIA 가 같은 `active` 에서 나온다** — 갈라질 수 없다 | `/logs/admin` 에서 '실패' 클릭 → 그 버튼만 `aria-pressed="true"`. `aria-current` grep = 0. 모든 `filterItemStyle` 버튼이 `aria-pressed={active}` | pass |
| MOTION-01 | MOTION | 상속 | **미충족.** 이 화면은 **Modal 표면을 실재로 갖는다**(`LogPayloadDialog` — FS-060-EL-016). 그런데 `Modal` 에 enter/exit transition 이 **없다**: `Modal.css` 에 backdrop fade 도 dialog scale/translate 도 없고(`:3-36` — `overlay`/`backdrop`/`dialog` 가 전부 정적, 유일한 `transition` 은 `:86` 의 닫기 버튼 `background-color` 다), `AnimatePresence` 도 없다 — **Motion 라이브러리가 앱에 도입돼 있지 않다**(`framer-motion`/`motion` 이 어느 `package.json` 에도 없다. 내가 직접 확인). 조건부 렌더(`LogListShell.tsx:297`)라 **exit 없이 즉시 unmount 된다.** 요구의 appliesTo 가 `packages/ui/src/organisms/Modal` 이므로 **소유는 DS 이고 이 화면은 그 부재를 상속한다** — 화면 코드로는 해소 불가 | 행을 눌러 상세를 열고 닫는다 → **backdrop 과 dialog 가 즉시 pop in/out** 한다. `Modal.css` 에 `@keyframes`/`transition`(dialog·backdrop) grep = 0. 앱 전체에 Motion 라이브러리 grep = 0 | **gap** |
| MOTION-02 | MOTION | 상속 | **미충족.** 이 화면은 **토스트 표면을 실재로 갖는다**(내보내기 성공/실패 — FS-060-EL-017). entrance 는 있으나(`Toast.css:26` — `animation: tds-toast-in …`) **exit 가 없다**: `ToastProvider.tsx:100` 이 `setToasts((prev) => prev.filter((item) => item.id !== id))` 로 **즉시 filter-out** 한다 — 요구의 근거 문장이 지목한 바로 그 구현이다('즉시 filter-out 대신 AnimatePresence exit'). auto/manual dismiss 둘 다 급격히 끊긴다. 요구의 appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기를 실행해 성공 토스트를 띄우고 dismiss → **fade/translate 없이 사라진다.** `ToastProvider.tsx` 에 `AnimatePresence`/exit 애니메이션 grep = 0 | **gap** |
| MOTION-03 | MOTION | 상속 | 이 화면의 모션 표면은 **둘뿐이고 둘 다 이미 게이트돼 있다** — ① 로딩 스켈레톤(FS-060-EL-012): `shared/ui/ui.css:83` 의 `.tds-ui-skeleton` animation 이 `:110-114` 의 `@media (prefers-reduced-motion: reduce)` 에서 `animation-name: none` 으로 꺼진다. ② 내보내기 토스트 entrance: `Toast.css:110-114` 가 `animation: none` 으로 끈다. **이 화면 자신은 `transition`/`animation`/`transform` 을 하나도 선언하지 않는다**(`logs.css` grep = 0) — 게이트로 라우팅할 신규 모션이 이 화면에 없다. 요구의 나머지 절(글로벌 Motion config · `ToggleSwitch.css`)은 **이 화면의 표면이 아니다** — ToggleSwitch 를 쓰지 않는다 | reduced-motion 을 켜고 `/logs/admin` 진입 → 스켈레톤이 정지하고 토스트가 즉시 등장한다. 판정은 `ui.css`·`Toast.css` 소유 문서를 따른다. **⚠ MOTION-01/02 가 해소되면(Motion 도입) 이 판정은 다시 돌려야 한다** — 새 모션이 게이트를 타야 하고, 그 게이트는 아직 없다 | 종속 |
| IA-01 | IA | 직접 | **충족.** `/logs/admin` 이 `APP_ROUTES` 항목이고(`App.tsx:329` — `{ path: '/logs/admin', element: <AdminLogPage />, implemented: true }`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다. **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(`LogListShell.tsx:205` — flex column)이고 그 아래가 2열 그리드(`:206` — 좌 필터 / 우 본문)다. 그 2열은 **AppShell 안쪽의 내용 레이아웃**이지 outer frame 이 아니다 | `/logs/admin` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지. 화면이 자체 header/sidebar 를 렌더하지 않는다 | pass |
| IA-02 | IA | 직접 | **충족.** `/logs/admin` 은 `nav-config.ts:208` 의 **잎**(`['관리자 로그', '/logs/admin']`)이므로 `findCoveringLeaf`(`:269-279`)가 자기 자신을 찾아 `findNavLabel`(`:297-299`)이 AppHeader `<h1>` 에 **'관리자 로그'** 를 그린다 — 가지 라벨('로그 관리')로 폴백하지 않는다. 그리고 **이 화면에 in-content `<h1>` 이 없다**: `LogListShell`·`LogFilterPanel`(`<h2>`)·`LogPayloadDialog`(`<h3>` + Modal 자체 제목)·`AdminLogPage` 어디에도 `<h1>` 이 없다 — **제목 소스가 AppHeader 하나뿐이라 모순이 없다.** 요구의 두 절 중 'sub-route 가 구체적 title' 절은 **이 화면에 하위 라우트가 없어**(`App.tsx:328`) 발생하지 않는다. **NFR-040 과 같은 구조이고, 폼/상세 화면의 h1 이중 문제(`FormPageShell.tsx:160`)가 여기엔 성립하지 않는다** — 이 섹션에 폼이 없기 때문이다 | `/logs/admin` 진입 → AppHeader 제목이 '관리자 로그'. `document.querySelectorAll('h1').length === 1`. 상세를 열어도 다이얼로그 제목은 `<h2>`(Modal 소유)라 h1 이 늘지 않는다 | pass |
| IA-04 | IA | 직접 | **충족.** 요구의 템플릿을 순서대로 만족한다: ① **toolbar row** — 검색 좌측(`LogToolbar.tsx:80-88`), 액션 우상단(`:90-127` — 페이지 크기 + 취소 + 내보내기). **감사 로그에는 '등록'이 없으므로 우상단 primary 자리는 내보내기가 갖는다** — 이 화면에서 운영자가 시작할 수 있는 유일한 작업이다(`:4-5`). ② **결과 count 요약** — `SummaryText`(`LogListShell.tsx:235-249,314-336`): '전체 N건 중 x–y'. ③ **SelectionBar** — **bulk action 이 없으므로 대상 없음**(`LogTable.tsx:6-7`). ④ **table** — `LogTable`. ⑤ **Pagination** — `LogListShell.tsx:271-276`, 페이지 크기 초과 가능하므로 렌더된다(총 페이지 ≤ 1 이면 DS 가 스스로 null 을 낸다 — `Pagination.tsx:117`). 4화면이 이 한 벌을 공유한다(`logs/types.ts:229-232`: '그 "같은 것"을 4벌 쓰면 4개 화면이 조금씩 다르게 동작하고, 그 차이는 아무도 의도하지 않는다') | `/logs/admin` 진입 → 좌측 필터 / 우측 [검색 … 크기·내보내기] → 요약 → 표 → 페이지네이션. 형제 3화면과 배치가 동일하다 | pass |
| IA-05 | IA | N/A | **이 화면에 create/edit 폼이 없다** — `/logs/admin` 은 하위 라우트가 없는 leaf 이고(`App.tsx:329`, `/logs/admin/*` 0건) **쓰기 라우트가 존재하지 않는다**(`App.tsx:328` 주석: '쓰기 라우트(등록/수정)는 존재하지 않는다: 감사 기록은 불변이다'). `:id/edit` 로 해석될 대상 엔티티가 없다 — **감사 로그는 만들 수도 고칠 수도 없다**(BE-060 §7.5). 요구의 appliesTo(FormPageShell·useCrudForm·모든 엔티티 폼)에 이 화면이 걸리지 않는다 | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — 이 화면의 강점이다.** 요구가 열거하는 list query state 가 **전부 URL 에 있다**: page(`?page`) · page-size(`?size`) · active filters(`?outcome`·`?action`·`?period`·`?from`·`?to`) · keyword(`?q`) · sort(`?sort`·`?dir`) — `list-state.ts:42-51` 의 `PARAM` 맵이 정본이고 `useSearchParams` 가 유일한 저장소다(`:141`). **`useState` 로 든 조회 상태가 0건**이다(그 파일에 `useState` import 조차 없다). 세 가지 세부가 요구를 넘어선다: ① **기본값은 URL 에 쓰지 않는다**(`:187,217,231,241,258-260,274`) — '최근 30일·전체·1페이지'는 링크를 더럽히기만 하므로, 링크에 남은 파라미터는 전부 '누군가 의도적으로 바꾼 것'이 된다. ② **push/replace 를 가른다**(`:18-21`) — 필터·기간·정렬·페이지는 push(뒤로가기로 되돌린다), **검색어만 replace**(한 글자마다 history 가 쌓이면 뒤로가기가 '지웠다 썼다'를 되감는 기계가 된다). ③ **URL 을 사용자가 손으로 고칠 수 있음을 전제로 전부 검증한다**(`:58-92` — 축은 실제 옵션만, sort 는 정렬 가능 컬럼만, size 는 화이트리스트, page 는 정수≥1). 설계 근거가 감사 도메인에서 나온다(`:4-10`: '조건을 좁히고 → 몇 페이지를 넘기고 → 한 건을 열어보고 → "이거 좀 봐주세요" 하며 링크를 붙여넣는다. **공유되지 않는 조회 조건은 조회 조건이 아니다**') | '실패' + '권한 변경' 필터 + 3페이지 + '응답' 검색 + 시각 오름차순 → URL 이 `?outcome=failure&action=permission&page=3&q=…&dir=asc` → **새 탭에 복사 → 동일 view 재현**. F5 → 동일. 상세를 열었다 닫고 Back → 동일(다이얼로그는 라우트가 아니라 history 를 건드리지 않는다 — §4.3) | pass |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 App 루트 경계가 잡는다. **이 화면은 자체 경계를 두지 않는다.** ⚠ 이 화면에서 throw 가 날 만한 자리가 실재한다 — `spec.detailOf(entry)`(`LogListShell.tsx:299`)와 `column.render(entry)`(`LogTable.tsx:214,222`)가 서버 데이터를 직접 만진다(예: `ADMIN_ACTION_LABEL[entry.action]` 이 **모르는 action 값**에 `undefined` 를 내면 렌더는 통과하나 빈 셀이 된다). 페이로드 직렬화 실패만은 이 화면이 스스로 잡는다(`masking.ts:177-181` try/catch) | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다. 이 화면에서는 '자체 경계를 두지 않고 셸 경계에 의존한다'만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx` 의 `<RequireAuth>` 가 AppShell 바깥에서, mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 조회(`useLogQuery` — `queries.ts:47-53`)가 그 캐시를 통과하므로 자동으로 덮인다. **이 화면은 재인증 손실이 0이다** — 보존할 입력이 없고(FEEDBACK-04 참조) **조회 조건이 전부 URL 에 있어 returnUrl 로 그대로 복원된다**(IA-13). ⚠ 내보내기는 `useMutation`(`queries.ts:71-73`)이라 `QueryCache.onError` 를 타지 않는다 — 401 이면 실패 토스트로 떨어진다(§3 EXC-06) | 판정은 `RequireAuth`·`queryClient`·`session-expiry` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 두 층이 다 있고 테스트가 고정한다.** ① **read 게이팅**: `AppShell` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 모든 라우트를 덮고, `route-resource.ts` 가 이 경로를 잎 `page:/logs/admin` 으로 해석해 read 없는 deep-link 를 `<ForbiddenScreen/>` 으로 막는다. **그리고 조회 요청 자체가 나가지 않는다** — `LogListShell.test.tsx:136-142` 가 `expect(fetchPage).not.toHaveBeenCalled()` 로 단언한다(`:11-12`: '데이터를 받아 놓고 안 보여주는 것은 게이팅이 아니다 — 백엔드가 붙으면 그 요청은 실제로 서버에 도달하고, 응답은 브라우저 메모리에 남는다'). ② **쓰기 게이팅**: 이 화면의 유일한 액션인 내보내기가 `useRouteCan('export')`(`LogListShell.tsx:115`)에 걸려 **권한이 없으면 버튼을 렌더하지 않는다**(`LogToolbar.tsx:117` — disable 이 아니라 부재). `LogListShell.test.tsx:144-150` 이 '내보내기 권한이 없으면 그 버튼을 렌더하지 않는다(조회는 된다)'를 단언한다. ③ **강등 reconcile**: `useRouteCan` 이 권한 스토어를 구독하므로 다른 탭의 강등에도 버튼이 그냥 사라진다(`RequirePermission.tsx:24-25`) — 화면 코드 0줄. **이 화면은 `useRouteWritePermissions` 소비처가 아니지만 그 하위 훅인 `useRouteCan` 을 직접 쓴다** — 필요한 액션이 `export` 하나뿐이라 네 갈래를 구독할 이유가 없다 | read 를 끈 역할로 `/logs/admin` deep-link → 403 화면 + **표 없음 + 요청 0건**. export 만 끈 역할 → 표는 보이고 내보내기 버튼이 **없다**. ⚠ 서버 측 강제는 별개다 — 프론트 가드는 UX 층이고 위조된 localStorage 로 우회된다(`RequirePermission.tsx:8-11`). `GET /api/logs/admin/export` 직접 호출을 막는 것은 서버뿐이다(BE-060 §3.1) | pass |
| EXC-04 | EXC | N/A | **이 화면은 write 를 하지 않는다** — 요구의 appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. 낙관적 동시성 토큰(If-Match/ETag/version)을 실을 요청이 없다. **더 근본적으로 감사 로그는 append-only 라 기존 행이 변경되는 사건 자체가 존재하지 않는다**(BE-060 §3.3) — 두 관리자가 같은 로그를 다툴 시나리오가 원리적으로 성립하지 않는다. 이 화면은 `createStoreAdapter`/`createCrudAdapter` 를 쓰지 않고 자기 어댑터(`adapter.ts:30-54`)가 조회 둘뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **이 화면에 user-initiated write 가 없다** — 요구의 appliesTo('useCrudForm, ConfirmDialog, 금액/생성/발송 mutation')에 해당하는 것이 0개다. `useCrudForm` 을 쓰지 않고 submit 폼이 없다. **내보내기는 사용자가 개시하지만 write 가 아니다** — 서버 상태를 바꾸지 않는 GET 이라(BE-060 §4 EP-02) 두 번 나가도 **파일이 두 번 받아질 뿐 서버가 갈라지지 않는다.** 멱등키가 필요한 사건('금액/생성/발송')이 아니다. **참고로 중복 실행은 실질적으로도 막혀 있다**: `Button.tsx:66,69-72` 가 `loading` 이면 `onClick` 자체를 발화하지 않고 `LogToolbar.tsx:120` 이 `loading={exporting}` 을 넘긴다 — 다만 `exporting` 이 비동기 state 라 **렌더 전 초고속 더블클릭은 2회 나갈 수 있다**(요구가 `submitLockRef` 로 막으려는 그 gap). 결과가 CSV 2벌이라 무해하므로 gap 으로 계상하지 않고 §4.3 에 기록한다 | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **충족.** ① **내보내기 취소**: 사용자가 '취소'를 누르면(`LogToolbar.tsx:111-115` → `LogListShell.tsx:200-202`) `controllerRef.current?.abort()` 가 발화하고, `onError` 가 `isAbort(cause)` 로 판정해 **토스트를 띄우지 않고 `exportLog.reset()` 으로 isPending 을 되돌린다**(`:189-192`). 단일 공유 predicate(`shared/async.isAbort`)를 쓴다. 주석이 규칙을 명시한다(`:19`: '**취소는 실패가 아니다** → 아무 토스트도 띄우지 않는다'). ② **조회 abort**: 조건이 바뀌거나 화면을 벗어나면 react-query 가 `queryFn({ signal })`(`queries.ts:49`)의 signal 로 `wait(LATENCY_MS, signal)`(`adapter.ts:36`)을 끊는다 — **취소된 쿼리는 `error` 를 세팅하지 않으므로 FS-060-EL-015 배너가 뜨지 않는다.** ③ **list/cache 무변경**: 취소해도 캐시를 건드리지 않는다(내보내기는 `invalidateQueries` 를 부르지 않는다 — `queries.ts:6-9`). ④ bulk 실패 count 절은 **대상 없음**(bulk 가 없다) | 내보내기를 시작하고 400ms 안에 '취소' → **토스트 0건**, 버튼 상태 복원, 파일 미다운로드. 조회 중(400ms 안에) 다른 메뉴로 이동 → 실패 배너·토스트가 뜨지 않는다. 판정은 `shared/async`·`queryClient` 소유 문서를 따르되 **`isAbort` 배선은 이 화면의 것**이다 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **13** | STATE-02 · STATE-04 · TOKEN-01 · COMP-10 · A11Y-02 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **8** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **6** | FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **3** | STATE-01 · MOTION-01 · MOTION-02 |
| **합계** | **30** | 13 + 8 + 6 + 3 = **30** ✔ |

> **검산**: STATE 3(01 gap · 02 pass · 04 pass) + TOKEN 5(01 pass · 02·03·04·05 종속) + COMP 1(10 pass) + FEEDBACK 3(02·04·06 N/A) + A11Y 4(01 종속 · 02·11·12 pass) + MOTION 3(01·02 gap · 03 종속) + IA 5(01·02·04·13 pass · 05 N/A) + EXC 6(01·02 종속 · 03 pass · 04·08 N/A · 09 pass) = **3+5+1+3+4+3+5+6 = 30** ✔
>
> **P0 gap 3건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 셋 다 §5 로 이관한다. **그중 2건(MOTION-01·02)은 화면 코드로 해소 불가**다 — Motion 라이브러리 미도입은 별도 단계이며 소유가 `packages/ui` 다. **화면이 스스로 고칠 수 있는 P0 gap 은 STATE-01 하나**이고, 그것이 이 화면의 실질적 결함이다.
> **N/A 6건은 이 화면이 읽기 전용 감사 목록이기 때문이며 결함이 아니다**(§1.2). 여섯 건이 전부 쓰기 축이라는 것이 그 증거다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `useLogQuery` 가 `placeholderData: (previous) => previous`(`queries.ts:52`)를 쓰므로 필터·페이지가 바뀌는 동안 이전 목록이 유지된다 — 표가 깜빡이며 비지 않는다. ⚠ **`staleTime` 을 지정하지 않는다**(기본 0) — 즉 같은 조건으로 돌아오면 즉시 재조회한다. 감사 로그에서는 오히려 그것이 맞다(방금 일어난 일을 봐야 한다). 요구의 후반('staleTime 후에만 network refetch')은 이 도메인에서 의도적으로 다르게 해석된다 | 필터를 바꾸는 동안 이전 행 유지. 같은 URL 로 재진입 → 즉시 재조회 | pass |
| STATE-05 | P1 | **충족.** 0행이면 DS `<Empty>` 가 **3분기**로 갈린다 — `LogTable.tsx:180-187` 이 `hasQuery`·`hasActiveFilters` 를 넘기고 `Empty.tsx:52-55` 가 '검색 > 필터 > 진짜 비어있음' 우선순위로 모드를 정한다. **복구 수단이 분기마다 다르다** — `onClearSearch`(검색어만 지운다) · `onResetFilters`(축·기간을 기본값으로) 를 `list-state.ts:282-297` 이 제공한다. **'등록' CTA 는 의도적으로 없다**(`LogTable.tsx:22-24`: '감사 로그에는 등록 CTA 가 없으므로(만들 수 없는 기록이다) action 슬롯은 비운다 — 그것이 이 화면의 정직한 빈 상태다') | 걸리지 않는 키워드 → 검색 분기 + '검색어 지우기'. 액션을 '로그아웃'으로 좁혀 0건 → 필터 분기 + '필터 초기화'. ⚠ **기간 입력이 유효하지 않을 때도 이 컴포넌트가 뜬다** — §2 STATE-01 gap | pass |
| STATE-06 | P1 | **N/A(표면 부재) — 그리고 그것이 설계다.** write 가 0건이라 invalidate 할 것이 없다. `queries.ts:6-9` 가 그 부재를 명시적으로 선언한다('회원/운영자 훅에는 쓰기 뮤테이션의 onSuccess 마다 invalidateQueries 가 붙어 있다. **여기에는 없다. 무효화할 쓰기가 없기 때문이다** — 캐시를 더럽힐 주체가 존재하지 않는다') | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **충족.** 검색이 DS `<SearchField>` 다(`LogToolbar.tsx:81-87`) — raw `<input type="search">` 에 아이콘을 절대 위치로 얹어 재구현하지 않았다. `apps/admin/src/pages/logs/**` 에 `type="search"` grep = 0. 주석이 그 이탈을 의식한다(`:7-8`: '로그인 이력이 그렇게 만들었고, 그것이 COMP-03 이 지적한 바로 그 이탈이다') | `type="search"` grep = 0. 툴바가 `SearchField` 를 소비 | pass |
| COMP-05 | P2 | **충족.** 좌측 필터가 `shared/ui` 의 `filterPanelStyle`·`filterNavStyle`·`filterHeadingStyle`·`filterListStyle`·`filterItemStyle`·`filterNoticeStyle` 를 import 한다(`LogFilterPanel.tsx:18-28`) — 로컬 clone 0건. 머리말이 그 규칙을 못 박는다(`:4-5`) | `LogFilterPanel.tsx` 에 로컬 filter 스타일 선언 0건 | pass |
| COMP-06 | P2 | **충족.** 스켈레톤 행 수 = **페이지 크기**(`LogListShell.tsx:259` `skeletonRows={state.pageSize}`), 셀 수 = **실제 컬럼 수**(`LogTable.tsx:176` `cols={columns.length}` = 6). `length: 5` 하드코딩이 없다 — 로딩 모양이 실제 결과와 같은 크기다 | 페이지 크기를 100 으로 → 스켈레톤이 100행. 컬럼 6개 → 셀 6개 | pass |
| COMP-11 | P1 | **부분 충족.** preset(오늘·7일·30일·직접 지정)이 있고(`types.ts:71-76`) **`start ≤ end` 검증**이 zod 로 있으며(`validation.ts:73-81`) **범위가 URL 에 유지된다**(`?period=custom&from=&to=` — `list-state.ts:201-211`). 요구의 세 절을 다 만족한다. ⚠ 다만 전용 `DateRangeFilter` 컴포넌트가 아니라 `DateRangeField`(DS) + 섹션의 `validateCustomRange` 조합이다 — 요구가 이름으로 지목한 컴포넌트와 다르나 **계약은 충족한다.** 이 화면은 그 위에 **미래 금지**(`:64-71` — '감사 기록에 미래는 없습니다')와 **90일 상한**(`:83-91`)을 더 얹는다 | '직접 지정' → 시작>종료 → 인라인 오류 + 조회 미발행. 미래 종료일 → 전용 문구. 91일 → '최대 90일입니다. (선택한 기간 91일)'. URL 에 `from`·`to` 유지 | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. 이 화면에서 값이 크다 — 좌측 필터의 Tab 정지점이 **12개**(결과 3 + 액션 8 + 기간 4 = 15, 직접 지정이면 +2)라 본문 표에 닿기까지 멀다 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 이동 + announce 는 `AppShell` 소유. 이 화면은 4형제 사이를 오갈 때 그 경로를 탄다 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **충족 — 이 섹션이 특히 잘 한 축이다.** 행 클릭(`LogTable.tsx:196` `rowActivateProps`)은 **마우스 사용자를 위한 보조 수단**이고, **첫 칸(시각)이 상세를 여는 진짜 버튼**이다(`:205-217` — `<button className="tds-ui-focusable">`). Tab 으로 닿고 Enter/Space 로 열린다. 주석이 그 필연성을 밝힌다(`:14-17`: '이 버튼이 없으면 키보드 사용자는 상세에 영원히 도달하지 못한다(WCAG 2.1.1)'). `useRowNavigation` 의 인터랙티브 가드가 그 버튼의 클릭을 행 활성화에서 제외해 이중 발화가 없다 | Tab 으로 첫 칸에 도달 → Enter → 상세가 열린다. 행 빈 곳 클릭 → 같은 상세 | pass |
| A11Y-09 | P1 | 이 화면의 위험 토큰 쌍 — `feedback-danger-surface` 위 본문(실패 행 `logs.css:23-25`) · `feedback-danger-border` 위 본문(실패 행 hover `:27-29`) · `feedback-danger-text`(결과 셀 `cells.tsx:23`) · `surface-raised` 위 `text-default`(페이로드 블록 `logs.css:84-85`) · `text-muted`(보조 줄 `cells.tsx:72` · 캡션 `logs.css:96`) | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다. ⚠ **실패 행은 danger surface 배경 위에 danger text 를 얹는다**(`logs.css:24` + `cells.tsx:23`) — 같은 계열 위 같은 계열이라 대비 측정이 특히 필요하다 | 종속 |
| A11Y-16 | P1 | **N/A(표면 부재).** 이 섹션은 **신규 인터랙티브 컴포넌트를 만들지 않았다** — 표는 네이티브 `<table>`(`LogTable.tsx:136`), 정렬은 `<th>` 안의 `<button>` + `aria-sort`(`:146-168`), 필터는 `<button aria-pressed>`, 다이얼로그는 DS `Modal`, 검색/선택은 DS 컴포넌트다. **NFR-040 의 손수 만든 `role="grid"` 달력과 정확히 대조된다** — 그쪽은 라이브러리 없이 격자를 그려 a11y 계약 4축이 깨졌고, 이쪽은 네이티브 시맨틱과 DS 로만 조립해 그 위험을 애초에 만들지 않았다 | 재현할 표면 없음 | N/A |
| IA-03 | P1 | **N/A** — 이 화면은 nav 의 잎이다(`nav-config.ts:208`). non-top-level route 가 아니므로 breadcrumb 요구의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-06 | P1 | **충족.** 상세를 라우트가 아니라 **다이얼로그**로 둔 판단이 요구의 무게 규칙에 맞는다 — 편집할 것이 없는 짧은 읽기이고, 목록의 맥락(어느 필터로 좁힌 결과의 몇 번째 행인가)이 읽는 동안에도 필요하다. `LogPayloadDialog.tsx:15-18` 이 그 근거를 명시한다('라우트를 만들면 목록으로 돌아올 때마다 조회가 다시 돈다') | 상세를 열어도 목록·필터·페이지가 그대로 뒤에 있다. Back 이 목록을 잃지 않는다 | pass |
| IA-11 | P2 | **충족.** 읽기 전용 레코드를 공유 `dl/dt/dd` 로 그린다(`LogPayloadDialog.tsx:75-82` — `dlStyle`·`dtStyle`·`ddStyle`) — 손수 만든 key/value 격자가 아니다. 주석이 규칙을 밝힌다(`:74`) | 상세의 필드 목록이 `<dl>` 시맨틱 | pass |
| IA-14 | P1 | **부분 충족.** 표 카드가 **bounded 가로 스크롤 컨테이너 안에 있다** — `LogListShell.tsx:82-85,251` 의 `overflowX: 'auto'` + `minWidth: 0` 래퍼. 그리고 2열 그리드가 `minmax(0, 1fr)` 이라(`:51`) **표가 페이지 그리드를 밀지 않는다**(`:50` 주석이 그 이유를 밝힌다). 툴바·요약도 `flexWrap: 'wrap'`(`:68,92` · `LogToolbar.tsx:31`). **미충족**: ① 좌측 필터 폭이 `calc(var(--tds-space-6) * 9)` **고정**이라 375px 에서 2열이 유지되면 본문이 짓눌린다 — 이 화면에 반응형 분기(`@media`)가 0건이다. ② sticky 헤더 없음(ERP-03). ③ touch-target 미검증 | 768px·375px 에서 `/logs/admin` → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다(코드 대조상 성립). **그러나 좌측 필터가 접히지 않아 375px 에서 본문 열이 매우 좁아진다** — sidebar collapse 는 AppShell 소유이나 이 화면의 2열은 이 화면 것이다 | 부분 pass — §5 |
| ERP-03 | P1 | **미충족.** 표에 sticky thead 가 없다 — `LogTable.tsx:139-172` 의 `<thead>` 에 `position: sticky` 가 없고 `apps/admin/src/pages/logs/**` 에 `sticky` grep = 0. 페이지 크기를 100 으로 두면 세로 스크롤이 길어지는데 **컬럼 이름이 사라진다.** SelectionBar 는 대상 없음(선택이 없다) | 페이지 크기 100 → 스크롤 → 헤더가 화면 밖으로 밀려난다. `position: sticky` grep = 0 | gap |
| ERP-04 | P1 | **충족 — 이 섹션의 강점이다.** ① **sortable header + aria-sort + keyboard**: `<th aria-sort={ariaSortOf(...)}>` 안의 `<button>`(`LogTable.tsx:146-168`), 글리프 ↕/↑/↓ 가 눈에도 보인다(`:71-75`). 정렬 중이 아닌 컬럼은 `aria-sort="none"`. ② **정렬 가능 판정의 단일 원천**: `sortValues[column.id] !== undefined`(`:142`)라 **컬럼 id = 정렬 키**이고, `AdminLogPage.tsx:132-134` 가 `sortValues: adminLogSpec.sortValues` 로 **어댑터의 것을 그대로** 쓴다('두 벌을 두면 헤더는 정렬 가능하다고 하는데 어댑터는 그 키를 모르는 상태가 조용히 생긴다'). 이 화면은 **6개 컬럼 전부** 정렬 가능하다(`data-source.ts:45-52`). ③ **numeric tabular-nums**: 이 화면에 numeric 컬럼이 **없다**(관리자 로그에는 수량이 없다) — `LogColumn.numeric` 을 쓰는 형제는 FS-062(응답시간)·FS-063(발생 횟수)다. ④ **정렬이 자르기보다 먼저**(`query-engine.ts:139-141`)이고 **동점은 id 로 끊어 결정적**이다(`:113-118,132`) | '액션' 헤더 클릭 → `aria-sort="ascending"` + ↑. 다시 클릭 → descending. 다른 컬럼 클릭 → 그 컬럼의 기본 방향(시각은 desc, 나머지 asc — `list-state.ts:128-130`). URL 에 `?sort=action&dir=asc`. `logs.test.ts:443-507` 이 정렬·자르기 순서와 결정성을 고정 | pass |
| ERP-05 | P1 | **부분 충족 — 기능은 되나 DS 표면을 쓰지 않는다.** 요구의 두 절이 **둘 다 실재한다**: ① **range** — '전체 N건 중 x–y'(`LogListShell.tsx:314-336` `SummaryText`). ② **page-size selector** — 20/50/100(`LogToolbar.tsx:92-107`). ③ **경계 unit test** — `logs.test.ts:468-500` 이 페이지 경계(2페이지 첫 행 = 1페이지 마지막 다음)를 단언한다. **그러나 DS `Pagination` 의 opt-in 표면을 켜지 않았다**: `Pagination.tsx:41,112,170-173` 은 `pageSize`(+`total`)를 넘기면 `rangeTextOf` 로 범위를 그리고 **`role="status"` 로 AT 에도 알리는데**(`:171`), `LogListShell.tsx:271-276` 은 `page`·`totalPages`·`onChange`·`label` 만 넘긴다 → `showRange = pageSize > 0` 이 false 라 번호 줄만 그려진다. 그래서 **같은 개념이 두 곳에 있고**(DS 의 `rangeTextOf` vs 화면의 `SummaryText`) **DS 의 `role="status"` announce 가 이 화면엔 없다** — 페이지를 바꿨을 때 '지금 몇 번째를 보는지'가 AT 에 알려지지 않는다. `LogListShell.tsx:311-312` 의 주석('DS Pagination 은 아직 범위를 그리지 않는다')은 **Pagination 1.1.0 기준으로 낡았다** | `/logs/admin` → 범위 요약과 크기 선택이 **보인다**(기능 충족). 그러나 `Pagination` 에 `pageSize` prop grep = 0 → `.tds-pagination-bar__summary`(`role="status"`)가 DOM 에 없다. 페이지 이동 시 AT 가 범위를 announce 하지 않는다 | 부분 pass — §5 |
| ERP-06 | P1 | **충족.** microcopy 가 존댓말로 일관되고 **포맷이 전부 `shared/format` 을 경유한다** — 숫자 `formatNumber`(`LogListShell.tsx:185,335` · `AdminLogPage.tsx:116-117`), 날짜 `formatDate`(`:182` — 파일명), 시각 `seoulTimeParts`(`time.ts:29`), 조사 `objectParticle`(`LogListShell.tsx:282`). **NFR-040 이 gap 으로 잡은 '두 뷰의 날짜 형식이 다르다' 같은 분열이 이 화면엔 없다** — 시각 표기가 `formatLogTime` 한 곳이다 | 표·CSV·상세의 시각 표기가 전부 'YYYY-MM-DD HH:mm:ss'. 숫자가 전부 천 단위 구분 | pass |
| ERP-08 | P2 | **충족.** 셀에 raw `toString()`/`String()` 호출이 **없다** — `AdminLogPage.tsx` 의 6개 컬럼이 전부 문자열 필드를 그대로 그리거나 라벨 맵을 거친다. 숫자는 `formatNumber` 경유(`:116-117`). 미래 timestamp 는 이 도메인에 없다(**감사 기록에 미래는 없다** — `validation.ts:64-71` 이 그것을 강제한다). **NFR-040 이 gap 으로 잡은 `String(cell.booked)` 같은 것이 이 화면엔 없다.** ⚠ 형제 화면에는 있다 — `api/data-source.ts:66-67`(CSV 의 `String(entry.status)`)·`errors/data-source.ts:64` — 그러나 **CSV 셀이라 화면 셀이 아니다**(요구는 '셀 raw toString') | `AdminLogPage.tsx` 에 `String(`/`.toString()` grep = 0 | pass |
| ERP-09 | P2 | **충족 — 이 섹션이 정본을 낳은 축이다.** 시각 판정이 **전부 KST 고정**이다: 표시(`time.ts:29` → `seoulTimeParts`) · 프리셋(`period.ts:23` → `formatDate`) · 구간 판정(`period.ts:32-36` → `seoulDayOf`) · '오늘'(`validation.ts:104`) · CSV 파일명(`LogListShell.tsx:182`) · 픽스처 생성(`fixture-lib.ts:43-44`). 정본은 `shared/format.ts:63`(`DISPLAY_TIME_ZONE = 'Asia/Seoul'`)이고 **달력 산술의 앵커가 UTC 정오**다(`:39-47` — UTC 에는 서머타임이 없고, 정오는 UTC-11..UTC+12 전 존에서 같은 달력일로 읽힌다). **삼중 사본(logs/time.ts · stats/period.ts · login-history/period.ts)이 이 한 벌로 수렴했고 그 정본의 뿌리가 이 파일이었다**(`shared/format.ts:31-36` · `time.ts:4-12`). 이 파일에 남은 것은 **초 정밀도 하나**이고 그 요구는 이 섹션의 것이라 공유 모듈로 올리지 않았다(`time.ts:14-18`). 표시 기준이 **화면에도 적힌다**(`TIME_ZONE_NOTICE` — FS-060-EL-006 · EL-016.2): '모르는 기준은 없는 기준과 같다'(`shared/format.ts:25-28`) | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 `/logs/admin` 진입 → **표의 시각·'오늘' 프리셋·구간 경계가 전부 서울 기준으로 동일하다.** `logs.test.ts:82-107` 이 그것을 고정한다(UTC→KST +9시간 · 자정 넘김 · 오프셋 표기 동치 · **초를 버리지 않음** · 파싱 실패 시 원본 반환). `:133-139` 가 구간 경계를 KST 달력일로 단언한다 | pass |
| ERP-12 | P1 | **충족.** ① **필터 전체 CSV** — 현재 페이지가 아니라 조건 전체(`adapter.ts:45-54` `fetchLogExport` → `runLogExport`)이고 **성공 문구가 그것을 명시한다**('(현재 필터 조건 전체)' — `LogListShell.tsx:185`). ② **한글 header** — `logs.test.ts:547-549` 가 `'시각(KST),행위자,이름,역할,액션,대상 유형,대상,결과,실패 사유,IP'` 를 고정. ③ **UTF-8 BOM** — `downloadCsv` 가 붙인다(`data-source.ts:76` 주석: 'BOM 이 없으면 엑셀이 한글을 깨뜨린다'). ④ **progress** — 스피너 + **취소 경로**(FS-060-EL-009.1). ⑤ **화면과 같은 순서**(`runLogExport` 가 같은 정렬 적용). ⑥ **실패를 성공 톤으로 옮겨 적지 않는다** — 결과 열에 '실패'와 사유가 그대로 들어간다(`logs.test.ts:561-569`: '색은 파일로 옮겨지지 않으므로 문자열이 스스로 말해야 한다'). ⑦ **페이로드 열이 없다**(`logs.test.ts:555-559`) — 마스킹을 거치지 않은 비밀이 파일로 나가지 않는다 | 필터를 걸고 내보내기 → 조건 전체가 받아진다. 엑셀에서 한글이 깨지지 않는다. `?fail=logs-admin:export` → 실패 토스트 + 다시 시도 | pass |
| ERP-13 | P1 | **충족.** 실패 배너 문구가 조사 헬퍼를 경유한다 — `LogListShell.tsx:282` `${spec.entityLabel}${objectParticle(spec.entityLabel)} 불러오지 못했습니다.` → '관리자 로그**를** 불러오지 못했습니다.'(받침 없음). 통합이 헬퍼를 `shared/format.ts:269+` 로 승격했고 이 화면이 그것을 쓴다. **`apps/admin/src/pages/logs/**` 에 사용자 대상 리터럴 '이(가)'/'을(를)'/'은(는)' = 0건.** 빈 상태의 조사는 DS `Empty` 가 조립한다(`Empty.tsx:76`) | 4형제의 배너 문구가 각자 올바른 조사를 낸다: '관리자 로그**를**' · '회원 활동 로그**를**' · 'API 로그**를**' · '오류 로그**를**' (넷 다 받침 없음이라 이 화면만으로는 헬퍼의 분기가 드러나지 않는다 — 분기 자체는 `shared/format.test.ts` 가 고정) | pass |
| ERP-15 | P1 | **충족 — 캡 방식으로.** 요구의 '1,000행 virtualize/cap' 중 **cap** 을 택했고 그 근거가 명시돼 있다(`types.ts:178-183`: '가상화 없이 1,000행을 DOM 에 그리면 저사양 사무 PC 에서 스크롤과 선택이 끊긴다. 그래서 effective page size 를 캡한다 — 1,000행을 보고 싶으면 내보내기(CSV)로 받는다. 그것이 엑셀에서 훨씬 잘 하는 일이다'). **캡이 우회 불가능하다** — `isPageSize`(`:196-198`)가 허용 목록 자체를 판정으로 쓰므로 `?size=5000` 을 쳐도 20 으로 떨어진다(`:190-195`: '캡을 별도 상수로 두면 목록과 상수가 따로 놀 수 있지만, 허용 목록 자체가 판정이면 어긋날 수 없다'). **12-컬럼 가로 스크롤** — 컬럼이 6개이나 래퍼가 있다(§3 IA-14). ⚠ **pin(sticky) 은 없다**(§3 ERP-03) | `/logs/admin?size=5000` → 20줄. 최대 100행 × 6열. 1,000건은 CSV 로 | pass |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 이 화면의 조회·내보내기도 상한이 없다. **다만 내보내기에는 사용자 취소 경로가 있다**(FS-060-EL-009.1) — 무한 대기에 갇히지는 않는다. 조회에는 그것도 없다 | 응답하지 않는 백엔드를 붙이면 요약이 '불러오는 중…'에서 멈추고 스켈레톤이 영원히 남는다. **STATE-01 과 달리 거짓 사실을 단정하지는 않는다**(스켈레톤은 '모른다'를 말한다) — NFR-040 의 '영원히 0/4' 와 대조된다 | gap |
| EXC-06 | P1 | **미충족.** 조회 실패가 status 를 보지 않는다 — `LogListShell.tsx:233` 의 `error === null` 하나로 401/403/429/500/504 가 전부 '관리자 로그를 불러오지 못했습니다.' 한 문구가 된다. 내보내기도 같다(`:194` — 한 문구). 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 이 화면이 읽지 않는다. **BE-060 §7.4 의 `422 EXPORT_TOO_LARGE` 를 도입해도 운영자는 '기간을 좁히라'는 안내를 받지 못하고 그냥 재시도한다** | `?fail=logs-admin:list` 와 서버 403 이 **같은 배너**를 낸다. 429(레이트리밋)도 같은 배너라 '잠시 후'라는 단서가 없다 | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 — 오프라인 전환 시 일반 실패 문구만 뜬다 | 오프라인 전환 → 배너에 오프라인 고지 없음 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf 단일 뷰). 404 를 구분할 대상 id 가 이 화면에 없다 — **상세는 라우트가 아니라 다이얼로그**이고 이미 손에 있는 행 객체로 그린다(BE-060 §7.2). '없는 로그를 열었다'는 사건이 원리적으로 발생하지 않는다 | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk 작업·다중 선택이 없다(체크박스 0개 — `LogTable.tsx:6-7`) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **미충족 — 그리고 이 섹션 안에서 규칙이 갈린다.** 조회 실패 배너에 **참조 코드가 없다** — `LogListShell.tsx:280-292` 가 `referenceOf(cause)` 를 쓰지 않는다. raw 서버 body·stack 을 노출하지는 않으므로 요구의 후반('never-leak')은 충족. ⚠ **정작 형제 화면인 오류 로그는 추적 ID 를 상세에 보여주고**(FS-063-EL-016.1 — `errors/types.ts:52-55`: '운영자가 이것을 복사해 개발자에게 준다 — 없으면 "오류 났어요"로 끝나 아무도 못 찾는다') **API 로그도 요청 ID 를 보여준다**(FS-062-EL-016.1). 즉 **이 섹션은 참조 코드의 가치를 알고 있으면서 자기 실패 배너에는 그것을 붙이지 않았다** | `?fail=logs-admin:list` → 배너에 복사 가능한 오류 코드 **없음**. ⚠ `http-error.test.ts:92` 의 `createErrorReference()` 충돌 flaky(같은 ms 에 50개 → 약 2.6%)는 이 화면과 무관하다 — 이 화면은 reference 를 만들지 않는다 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 목록 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ `LATENCY_MS = 400`(`shared/crud/dev.ts`)은 **개발용 지연이며 성능 예산이 아니다.** 실제 예산은 BE-060-EP-01 의 응답 크기가 정해지면 A63 이 확정한다 |
| DOM 규모 | **구조적 상한 있음** — 최대 100행 × 6열 = 600셀 | `isPageSize` 화이트리스트가 캡(`types.ts:196-198`) | 로그가 100만 건이어도 표는 100행이다. **가상화가 없는 대신 캡이 있다**(§3 ERP-15) |
| CPU (현재 · 픽스처) | **O(N) per 조회** | `runLogQuery`(`query-engine.ts:142-156`)가 필터 1회 + 기간 필터 1회 + 정렬 1회 | ⚠ `withinPeriod` 와 `applyLogQuery` 가 **기간 필터를 두 번 돈다**(`:147-148`) — 배지 모수와 결과가 다른 모수라 불가피하다. 백엔드가 붙으면 사라진다 |
| CPU (연동 후) | **서버 이관** | `query-engine.ts:10-11` — '이 파일은 통째로 서버의 WHERE·ORDER BY·LIMIT 로 대체된다' | 그때 성능 판정은 BE-060 의 것이 된다 |
| 재조회 횟수 | **조건 변경당 1회** | `staleTime` 미지정(기본 0) — 같은 조건 재진입 시 즉시 재조회 | **감사 로그에서는 그것이 맞다** — 방금 일어난 일을 봐야 한다(§3 STATE-03). 검색은 250ms 디바운스 뒤 1회(COMP-10) |
| 페이로드 전송량 | ⚠ **측정 불가 · 상한 없음** | 목록 응답이 **모든 행의 요청 본문 전체**를 싣는다(BE-060 §7.2) | **행 수는 캡되지만 행의 크기는 캡되지 않는다.** 100행 × 큰 페이로드 = 예측 불가. 그리고 상세를 한 건도 안 열어도 전부 온다 |
| 마스킹 비용 | **열 때만 O(페이로드 크기)** | `formatMaskedPayload` 는 다이얼로그 렌더 시에만 호출된다(`LogPayloadDialog.tsx:96`) | 목록 렌더에는 마스킹 비용이 0이다 — 깊이 6 캡(`masking.ts:128`)이 상한을 준다 |
| 번들 | **이 화면 전용 의존 0** | 4화면이 셸 한 벌을 공유. zod/mini(+4.6kB)를 기간 검증에 씀(`validation.ts:4`) | classic zod(+17.5kB) 대신 mini 를 고른 근거가 파일에 있다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 목록 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). 단 status 별 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤 + '불러오는 중…'(§2 STATE-01 의 정상 경로) |
| 0건 | 빈 상태 3분기 + 복구 | ✔ (§3 STATE-05) |
| **기간 입력 오류** | 원인이 자기 입력임을 알려야 | ✖ **요약·필터는 알리는데 표는 '기록이 없다'고 단정한다**(§2 STATE-01 gap) |
| 백엔드 무응답 | 상한에서 abort + 고지 | ✖ 조회는 무한 대기(§3 EXC-05). **단 스켈레톤이 유지돼 거짓 사실을 단정하지는 않는다.** 내보내기는 사용자가 취소 가능 |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **손실 0 — 조회 조건이 URL 에 있다**(§2 EXC-02 · IA-13) |
| 권한 강등(mid-session) | UI reconcile | ✔ `useRouteCan` 이 스토어를 구독해 내보내기 버튼이 사라진다(§2 EXC-03) |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ 토스트 0건 + 상태 복원(§2 EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01 — 종속) |
| 페이로드 직렬화 실패 | 화면이 죽지 않아야 | ✔ `masking.ts:177-181` try/catch → '[페이로드를 표시할 수 없습니다]' |
| 서버가 모르는 `action` 값을 보냄 | 알 수 없음을 표시 | ✖ `ADMIN_ACTION_LABEL[entry.action]` 이 `undefined` → **빈 셀**. 축 필터에도 그 옵션이 없어 걸러낼 수 없다(§5 #9) |

### 4.3 이 화면이 답하지 못하는 운영 질문

quality-bar 의 축이 아니지만 화면의 목적(FS-060 §1)에 비추어 기록한다 — **§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '이 운영자가 한 **다른** 일은?' | 불가 — 행위자에 링크가 없다. 계정을 복사해 검색창에 쳐야 한다(§5 #10) |
| '이 회원에게 일어난 일 전부' | 불가 — 대상에 링크가 없고, 회원 활동 로그(FS-061)는 **다른 화면**이다. 두 화면을 오가며 같은 계정을 두 번 검색해야 한다 |
| '이 **연쇄**를 묶어 보고 싶다' | 불가 — 픽스처는 '삭제 막힘(403) → 권한 부여 → 삭제 성공'이라는 이야기를 **의도적으로** 담는데(`fixtures.ts:117-121`) 화면은 그것을 한 줄씩 흩어 보여준다. 감사가 읽어내야 하는 것은 개별 행이 아니라 그 연쇄인데 화면에 그 개념이 없다 |
| '페이로드 안의 값으로 찾고 싶다' | 불가 — 검색은 6개 필드만(`data-source.ts:38-44`). '`role-viewer` 를 건드린 요청'을 찾을 수 없다 |
| '지금 일어나는 일을 보고 싶다' | 불가 — 실시간 tail·자동 갱신이 없다. F5 하거나 필터를 건드려야 한다 |
| '내보내기를 두 번 눌렀는데 파일이 두 개 받아졌다' | **가능한 일이다** — `exporting` 이 비동기 state 라 렌더 전 초고속 더블클릭은 2회 나간다(§2 EXC-08). 서버 상태가 갈라지지 않아 무해하나, 분당 3회 레이트리밋(BE-060-EP-02)을 2회 소모한다 |

### 4.4 데이터 보존 · 감사

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 보존·복구할 상태가 없다(BE-060 §7.5). 그 부재가 7개 층에 구조적으로 강제돼 있다 |
| **보존기간** | ⚠ **화면이 '3년 · 자동 폐기'를 단언하는데 이행 주체가 없다**(BE-060 §7.3 — 심 없음). 짧게 지워지면 운영자가 없는 기록을 찾아 헤매고, 길게 남으면 최소보관 원칙에 어긋난다 |
| **마스킹** | ⚠ **표시 통제일 뿐 보안 통제가 아니다**(BE-060 §7.1). 원본이 브라우저에 도달한 뒤 렌더 직전에만 가려진다 — devtools 로 우회된다. **그리고 키 기반이라 규칙에 없는 키의 민감값은 그대로 나온다** — 형제 화면에서 오늘 발현 중이다(FS-061 `address` · FS-063 `recipient`) |
| **페이로드 노출 면적** | ⚠ **목록 응답이 전 행의 요청 본문을 싣는다**(BE-060 §7.2). 상세를 한 건도 열지 않아도 그 페이지 전부가 브라우저에 있다. 상세에 별도 권한이 없다 |
| 개인정보 열람 | 행위자 계정·이름·IP 가 목록에 있고, **대상이 회원 이메일인 행이 있다**(`fixtures.ts:126`). 이름은 서버가 마스킹해 내려주는 것이 계약이다(`types.ts:44,47`) |
| **열람 감사** | ⚠ **없다**(BE-060 §7.6 #1 — 심 없음). 이 로그를 누가 언제 어떤 조건으로 봤는지 남지 않는다 — 감사 로그의 열람이 추적되지 않으면 내부자 오남용을 잡을 수 없다. **재귀 문제가 있다**: 관리자 로그 열람도 관리자 행위라 이 화면 자신에 남는다 |
| 반출 통제 | ✔ `export` 를 `read` 와 분리해 프론트가 게이팅한다(§2 EXC-03). **단 서버가 같은 판정을 하지 않으면 장식이다**(BE-060 §3.1) — 버튼을 숨겨도 URL 직접 호출은 막지 못한다 |
| CSV 의 민감 열 | ✔ **페이로드 열이 없다**(`logs.test.ts:555-559`). 마스킹을 거치지 않은 비밀이 파일로 나가지 않는다 |
| 토큰 승격 후보 | `typography.font-family.mono` — `logs.css:86` 이 토큰에 mono 계열이 없어 `monospace` 키워드를 쓴다(`:68-72` 가 근거와 승격 의사를 밝힌다). TOKEN-01 의 문자에는 걸리지 않는다(하드코딩 폰트 이름이 아니다) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **기간 입력이 유효하지 않으면 조회가 걸리지 않았는데도 표가 `<Empty>` 를 그린다.** `LogListShell.tsx:152` 가 `enabled: false` 로 조회를 막는 것은 의도인데(`validation.ts:11-12`), `:251-269` 가 `error === null` 이기만 하면 표를 그려 `entries=[]` · `loading=false` 가 빈 상태로 떨어진다. **요약은 '기간을 확인해 주세요'라 하고 표는 '기록이 없다'고 단정한다** — 모듈이 없애려던 거짓 빈 상태다. **화면 코드로 해소 가능**: 표 자리에 `range === null` 분기를 추가하면 된다 | 이 화면 + 4형제 공용(`LogListShell`) | **A11 change_request (FS-060 §7 #3)** |
| 2 | **MOTION-01** | **P0** | Modal 에 enter/exit transition 이 없다 — backdrop fade·dialog scale 부재, `AnimatePresence` 부재, **Motion 라이브러리 미도입**. 이 화면은 Modal 표면을 실재로 가지므로(FS-060-EL-016) N/A 가 아니다. **화면 코드로 해소 불가 — 소유는 `packages/ui`** | 앱 전역(DS) | **A41 / DS (Motion 도입 단계)** |
| 3 | **MOTION-02** | **P0** | toast exit 애니메이션이 없다 — `ToastProvider.tsx:100` 이 즉시 filter-out 한다(요구의 근거 문장이 지목한 그 구현). 이 화면은 내보내기 토스트를 띄우므로 N/A 가 아니다. **화면 코드로 해소 불가** | 앱 전역(DS) | **A41 / DS (Motion 도입 단계)** |
| 4 | ERP-03 | P1 | sticky thead 없음 — 페이지 크기 100 에서 스크롤하면 컬럼 이름이 사라진다. `sticky` grep = 0 | 이 화면 + 4형제 공용(`LogTable`) | A11 |
| 5 | ERP-05 | P1 | **범위 요약·크기 선택이 DS `Pagination` 의 opt-in 표면을 쓰지 않고 화면 사본으로 있다.** 기능은 충족하나 같은 개념이 두 곳이고 **DS 의 `role="status"` announce 가 없다**(페이지 이동 시 AT 가 범위를 못 듣는다). `LogListShell.tsx:311-312` 의 주석이 Pagination 1.1.0 기준으로 낡았다 | 이 화면 + 4형제 공용 | A11 · A41 (DS 수렴 — FS-060 §7 #6) |
| 6 | IA-14 | P1 | 가로 스크롤은 충족(래퍼 + `minmax(0,1fr)`). **미충족**: 좌측 필터 폭이 고정이라 375px 에서 본문이 짓눌린다(이 화면에 `@media` 0건) · sticky 없음(#4) · touch-target 미검증 | 이 화면 + 앱 전역 | A11 |
| 7 | EXC-05 | P1 | 클라이언트 타임아웃 없음(`AbortSignal.timeout` 앱 전체 0건). **단 스켈레톤이 유지돼 거짓 사실을 단정하지는 않는다** — NFR-040 의 '영원히 0/4' 와 대조된다 | 앱 전역 | A40 · A41 |
| 8 | EXC-06 · EXC-20 | P1 | 조회·내보내기 실패가 status 를 보지 않고 한 문구로 붕괴하며 **참조 코드가 없다.** ⚠ **같은 섹션의 오류 로그·API 로그는 추적 ID/요청 ID 를 보여준다** — 규칙이 갈린다. BE-060 §7.4 의 `422 EXPORT_TOO_LARGE` 를 도입해도 안내가 닿지 않는다 | 이 화면 + 앱 전역 | A11 · A41 (FS-060 §7 #10) |
| 9 | — | P1 | **서버가 모르는 `action` 값을 보내면 빈 셀이 된다.** `ADMIN_ACTION_LABEL[entry.action]`(`AdminLogPage.tsx:51`)이 `undefined` 를 내고, 축 필터 옵션도 `Object.keys(ADMIN_ACTION_LABEL)` 에서 파생돼(`types.ts:85`) 그 값을 **고를 수도 없다** — 새 액션이 서버에 추가되면 화면에서 조용히 사라진다. quality-bar 의 어느 ID 에도 정확히 걸리지 않으나 감사 화면에서 **기록이 조용히 사라지는 것**은 치명적이다 | 이 화면 + 4형제 공통 패턴 | A11 · A63 |
| 10 | — | P2 | 행위자·대상에서 그 레코드로 가는 링크가 없다 — 형제 화면(FS-061)은 계정을 회원 상세로 링크한다. **같은 섹션에서 규칙이 갈린다** | 이 화면 | A11 (FS-060 §7 #12) |
| 11 | EXC-11 | P1 | 오프라인 감지 없음(`navigator.onLine` 앱 전체 0건) | 앱 전역 | A40 |
| 12 | — | — | **BE-060 §7.1 (보안)** — 마스킹이 표시 통제일 뿐이고(원본이 브라우저에 도달) **키 기반이라 규칙에 없는 키의 민감값은 그대로 나온다.** 형제 화면에서 실재 발현 2건(FS-061 `address` · FS-063 `recipient`). 화면 문구('민감한 값은 **자동으로** 가려집니다')가 지키지 못할 약속을 한다 | 앱 전역(`masking.ts`) + 서버 | **A63 · A11 · A01 (보안)** |
| 13 | — | — | **BE-060 §7.2 (보안)** — 목록 응답이 전 행의 페이로드를 싣고 상세에 별도 권한이 없다. 최소 조치는 EP-02(내보내기) 응답에서 `payload` 제거(CSV 가 쓰지 않는다) | 앱 전역 + 서버 | **A63 · A11 (보안)** |
| 14 | — | — | **BE-060 §7.3** — 보존기간(3년)을 화면이 단언하는데 이행 주체가 없다. 서버가 소유·강제하고 화면은 서버 값을 표시해야 한다 | 도메인 | **A63 · A01** |
| 15 | — | — | **BE-060 §7.6 #1** — 열람 감사가 없다. 재귀 문제(관리자 로그 열람도 관리자 행위)가 있어 정책 결정이 선행된다 | 도메인 | **A63 · A01** |
| 16 | — | — | **BE-060 §7.6 #9** — `failureReason` 이 자유 문자열이다(`types.ts:57`). BE-008 은 4종 enum 으로 고정했다 — **같은 섹션에서 규칙이 갈리고**, 자유 문자열이면 서버 내부 문구가 화면·CSV 로 샐 수 있다 | 도메인 | A63 · A11 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.

### 6.1 실패 재현 (`?fail=`) — 이 화면의 실제 scope 와 op

**이 화면의 scope 는 `'logs-admin'` 이다**(`data-source.ts:23`). 4형제가 각자 다른 scope 를 갖는다(`logs-admin` · `logs-member` · `logs-api` · `logs-errors`) — 한 화면만 실패시킬 수 있다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ `adapter.ts:37` `failIfRequested(scope, 'list')` | FS-060-EL-015 조회 실패 배너(요약·표·페이지네이션 대체) |
| `export` | ✔ `adapter.ts:52` `failIfRequested(scope, 'export')` | FS-060-EL-017 실패 토스트 + 다시 시도 |
| `detail` · `save` · `delete` | ✕ — **이 화면은 부르지 않는다** | 해당 없음. **상세는 조회가 아니고**(목록 행 객체로 그린다 — BE-060 §7.2) **쓰기는 존재하지 않는다**(BE-060 §7.5) |

**사용 형태**(`adapter.ts:18`): `?fail=list` · `?fail=export` · `?fail=logs-admin:list`(스코프 지정) · `?fail=all` · 쉼표 다중.

```
/logs/admin?fail=list                    조회 실패 → STATE-02 확증
/logs/admin?fail=logs-admin:list         위와 동일(스코프 명시 — 형제 화면은 멀쩡하다)
/logs/admin?fail=export                  내보내기 실패 → 토스트 + 다시 시도 확증
/logs/admin?fail=all                     둘 다
```

### 6.2 P0 gap 재현

```
# STATE-01 gap — 조회가 걸리지 않았는데 빈 상태가 뜬다
/logs/admin?period=custom&from=2026-07-01&to=2027-01-01
  → 필터: '미래 날짜는 조회할 수 없습니다. 감사 기록에 미래는 없습니다.'
  → 요약: '조회 기간을 확인해 주세요.'
  → 표:   <Empty> '필터 초기화' 분기          ← 이것이 gap 이다

/logs/admin?period=custom&from=2026-07-10&to=2026-07-01   (역전)
/logs/admin?period=custom&from=2026-01-01&to=2026-06-30   (91일 초과)
  → 셋 다 같은 결과

# MOTION-01 gap — 상세를 열고 닫는다
/logs/admin  → 아무 행이나 클릭 → 즉시 pop in, 닫으면 즉시 사라진다(exit 없음)

# MOTION-02 gap — 내보내기 토스트를 dismiss 한다
/logs/admin  → 내보내기 → 성공 토스트 → dismiss → 즉시 사라진다(fade 없음)
```

### 6.3 pass 확증 스위치

```
# IA-13 — URL 이 곧 view
/logs/admin?outcome=failure&action=permission&page=2&size=50&sort=actor&dir=asc&q=ops
  → 새 탭에 붙여넣으면 동일 view. 기본값(period=last-30d·page=1·size=20)은 URL 에 없다

# EXC-03 — 권한 게이팅 (LogListShell.test.tsx 가 이미 고정)
read 끈 역할   → 403 화면 + fetchPage 호출 0건
export 끈 역할 → 표는 보이고 내보내기 버튼 부재

# ERP-09 — TZ 고정
브라우저 TZ 를 America/Los_Angeles 로 → 표의 시각·'오늘'·구간 경계가 서울 기준으로 불변
(logs.test.ts:82-107 이 단언. 러너 TZ 와 무관)

# ERP-15 — 렌더 캡
/logs/admin?size=5000  → 20줄로 떨어진다 (isPageSize 화이트리스트)

# COMP-10 — IME
검색창에 '한**' 조합 입력 → 조합 완료 + 250ms 후 URL ?q= 1회 갱신 (자모마다 아님)
```

### 6.4 단위 테스트 (이 화면의 판정을 고정하는 것)

| 파일 | 고정하는 판정 |
|---|---|
| `logs.test.ts:45-73` | **감사 불변성** — 4개 어댑터의 export 목록 전수 + 쓰기 이름 0건 (BE-060 §7.5) |
| `logs.test.ts:82-107` | **ERP-09** — KST 고정 · 초 정밀도 · 파싱 실패 시 원본 반환 |
| `logs.test.ts:111-140` | 기간 프리셋 · KST 달력일 구간 경계 |
| `logs.test.ts:144-176` | **COMP-11** — 미래·역전·90일·형식 |
| `logs.test.ts:180-274` | **마스킹** — 비밀번호·토큰·카드(객체 래핑)·커넥션 문자열·이메일·전화·중첩·비문자열·원본 불변·순환 |
| `logs.test.ts:278-320` | **픽스처 페이로드가 실제로 가려지는가** (⚠ `recipient`·`address` 는 이 단언에 포함돼 있지 않다 — BE-060 §7.1) |
| `logs.test.ts:407-507` | **ERP-04** — AND 결합 · 정렬 → 자르기 순서 · 결정성 · 배지 모수 |
| `logs.test.ts:543-578` | **ERP-12** — 한글 헤더 · KST 표기 · **페이로드 열 부재** · 실패 문자열 · 이스케이프 |
| `LogListShell.test.tsx:125-170` | **EXC-03** — read 403 + 요청 0건 · export 버튼 부재 · 조회 조건 전달 |
| `LogListShell.test.tsx:172-184` | **STATE-02** — 인라인 배너 + 다시 시도 · 토스트 아님 · 표 부재 |
