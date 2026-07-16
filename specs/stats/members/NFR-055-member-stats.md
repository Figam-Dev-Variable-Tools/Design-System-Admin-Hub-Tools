---
id: NFR-055
title: "회원 통계 비기능 명세"
functionalSpec: FS-055
backendSpec: BE-055
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-055. 회원 통계 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-055 회원 통계 (`/stats/members`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-055(요소·예외) · BE-055(심 대조·서버 판정) · **NFR-054/NFR-056** — 세 화면이 `stats/_shared/**` 를 공유해 판정이 크게 겹친다. 겹치는 판정은 반복하되 **이 화면 고유의 근거(file:line)** 를 단다 · **NFR-002(대시보드)** — §2 STATE-01 의 모순 상대편이다 · **NFR-003(회원 목록)** — 같은 '회원' 도메인이나 **다루는 단위가 다르다**(FS-055 §1.1) |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = 4b805ad`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6) |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(전용 모듈 또는 `stats/_shared`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격 — 개인정보 표면이 0인 회원 화면

**서버로 가는 쓰기 요청이 0건이다**(FS-055 §4.1). 폼·모달·확인 다이얼로그·낙관적 업데이트·행 선택이 전부 없다. 그래서 P0 30 중 **9건이 표면 부재로 N/A** 다 — 결함이 아니라 화면의 범위다.

**이 화면의 특징은 '회원 도메인인데 개인정보가 없다'는 것이다.** `MemberStatsPage.tsx:5-8` 이 그 경계를 코드로 긋는다 — 개별 회원을 열 수 없고(열 이유가 없다) `pages/members` 를 import 하지 않는다. 그래서 **회원 목록(NFR-003)의 A11Y-08(row-nav)·EXC-04(동시성)·FEEDBACK-02(삭제 확인)·ERP-12(개인정보 export) 판정이 여기엔 하나도 성립하지 않는다.** 대신 조회 조건 바(A11Y-11·A11Y-12)·CSV 내보내기 토스트(A11Y-01·MOTION-02)·표와 페이지네이션(IA-04·STATE-04) 표면이 실재한다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족(문자) — 그러나 §5 #2 를 함께 읽어야 한다.** 네 상태가 정확히 갈린다: ① **first-load 에서만 스켈레톤** — `queries.ts:45` `isFirstLoad = query.data === undefined && query.isFetching`. 화면은 그것만 넘긴다(`MemberStatsPage.tsx:263,272,284,302,324`) ② **refetch 중 이전 행 유지** — `queries.ts:40` `placeholderData: keepPreviousData` ③ **empty 는 성공·0행일 때만** — 표는 `StatsTable.tsx:199` `!loading && rows.length === 0`, **막대는 `ShareBarList.tsx:109,124-126`**(로딩이면 스켈레톤, 아니고 합계 0 이면 Empty — **두 컴포넌트가 같은 계약을 갖는다**: `ShareBarList.tsx:10-15` 가 그 수렴 이력을 기록한다 — 세 화면이 똑같은 3분기를 각자 손으로 쓰던 것을 형제 컴포넌트인 `StatsTable` 의 계약에 맞췄다) ④ **error 는 read 실패일 때만** — `StatsPageShell.tsx:130`. 스켈레톤 규격도 정확하다 — 표는 행=`pageSize`·칸=실제 컬럼 수(`StatsTable.tsx:174-184`), **막대는 줄=`MEMBER_TIERS.length`=4**(`MemberStatsPage.tsx:303` · `ShareBarList.tsx:96-100`) | `/stats/members?delay=3000` → 스켈레톤만(빈 상태 문구 없음). `?empty=all` → Empty 만. `?fail=list` → Alert 만. `?delay=3000&view=tier` → **막대 스켈레톤 4줄**(5줄이 아니다 — 실제 모양과 같아 로딩→완료에서 레이아웃이 튀지 않는다). **회귀 방어선**: `stats-screens.test.tsx:82-83,115-123` | pass ⚠ |
| STATE-02 | STATE | 직접 | 조회 실패 시 `StatsPageShell.tsx:133-148` 이 인라인 `<Alert tone="danger">` '통계를 불러오지 못했습니다.' + '다시 시도'(`onRetry` → `queries.ts:48-50`)를 렌더한다. **토스트가 아니고 빈 상태로 폴백하지 않는다**(주석 `:131-132`). **조회 조건 바가 살아남는다**(`:112-121` 이 error 분기 **위**) — 실패 상태에서도 다른 기간·경로로 탈출할 수 있다 | `/stats/members?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. **테스트가 이미 단언한다**: `stats-screens.test.tsx:86-97`(`kpi: '신규 가입'` 이 실패 시 **없어야** 한다 — `:96`) | pass |
| STATE-04 | STATE | 직접 | **충족(성립하는 절반).** ① **clamp**: `table.ts:50-52` `clampPage` 를 `pageSlice`(`:55`)·`rangeTextOf`(`:65`)가 쓰고 `StatsTable.tsx:229` 가 `page={Math.min(page, totalPages)}` 로 넘긴다 → total 이 줄어도 false-empty 가 없다 ② **조건 변경 시 page 되돌림**: `useStatsParams.ts:216`. **가입 경로를 바꾸면 페이지가 1로 간다** — 경로별 행 수가 같아 실질 차이는 없으나 규칙은 성립한다 ③ **선택 해제**: **표면 부재** — 행 선택이 없다(읽기 전용이라 bulk 대상이 없다). ④ **등급별 축은 4행 고정**이라 page 개념 자체가 없다(`ShareBarList` 에 페이지가 없다) | `?page=9` → 결과가 2페이지뿐이면 2페이지가 그려진다. `?page=3` 에서 경로 변경 → URL 에서 `page` 가 사라진다. **테스트**: `stats.test.ts:311-334` · `useStatsParams.test.tsx:136-144` | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면과 `stats/_shared/**` 의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다 — **`ShareBarList.tsx:22-88`**(list·headRow·label·value·**track·fill**·share·skeletonRow — 막대의 색이 `var(--tds-color-chart-series-1)`, 트랙이 `var(--tds-color-surface-raised)`) · `StatsFilterBar.tsx:33-90` · `StatsKpiRow.tsx:19-65` · `StatsTable.tsx:31-74`. **primitive tier 밖 hex · `[1-9]px` 리터럴 · bare border 키워드가 0건**이다 | `apps/admin/src/pages/stats/**` 에 hex · px 리터럴 · bare border 키워드 grep = **0**(테스트 제외). lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면 — 프리셋 버튼 7개(`StatsFilterBar.tsx:133` `tds-ui-focusable`) · 정렬 헤더 버튼 5개(`StatsTable.tsx:149`) · DS `Button`·`SelectField` 3개·`SegmentedControl` 2개·`Pagination` — 전부 DS focus-ring 계약을 상속한다. **막대(`ShareBarList`)에는 포커스 표면이 없다** — 읽기 전용 목록이다. 이 화면은 자체 `:focus-visible` 을 선언하지 않는다 | 판정은 DS 소유 문서를 따른다. 이 화면에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰 소비 표면은 DS 것뿐 — 스켈레톤 펄스(`ui.css:83-93`)와 토스트(`ToastProvider` 소유). **막대의 채움에도 transition 이 없다**(`ShareBarList.tsx:67-71` — 폭이 즉시 바뀐다) | 판정은 tokens codegen · `ToastProvider` 소유 문서를 따른다. 이 화면에서 `animation`/`transition` grep = 0 | 종속 |
| TOKEN-04 | TOKEN | 상속 | elevation 표면 — `StatsCard` 5장(KPI 4 + 추이 1 → `Card` — `StatsCard.tsx:35`) · 드릴다운 `Card`(`MemberStatsPage.tsx:276`) · 토스트 — 전부 DS 소유다. 조회 조건 바는 border + radius 만 쓴다. **이 화면은 `box-shadow` 를 선언하지 않는다** | 판정은 DS(`Card`·`Toast`) 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **표면이 실재한다 — 요구가 지목한 소비처다.** KPI 4장에 `value` 를 **실제로 넘기고**(`StatsKpiRow.tsx:100` `formatMetric(kpi.value, kpi.unit)`) `StatsCard.tsx:55` 가 `tds-statscard__value` 로 그리며 계약 1.1.0(`:12-14`)이 그 클래스를 `typography.display.sm` 로 못 박는다. **이 화면에서 특히 값이 크다** — '누적 회원 수 48,200명' 은 화면에서 가장 큰 수이고 display tier 가 없으면 body 와 한 크기대에 몰린다. **page `<h1>` 쪽 절반은 이 화면에 없다** — 제목은 AppHeader 소유(`StatsPageShell.tsx:6-8`) | 판정은 tokens typography · `StatsCard` 소유 문서를 따른다 | 종속 |
| COMP-10 | COMP | N/A | **이 화면에 text-search 입력이 없다.** `searchLabel` 을 넘기지 않으므로 `SearchField` 가 렌더되지 않는다(`StatsFilterBar.tsx:209` — `/stats/keywords` 만 넘긴다: `KeywordStatsPage.tsx:254`). **회원을 이름으로 찾는 일은 회원 목록의 몫이다**(FS-055 §1.1) — 이 화면은 사람이 아니라 수를 다룬다. 나머지 필터 입력은 IME 조합이 없는 타입이다 — `SelectField` 2개(네이티브 select) · `DateRangeField` 의 `<input type="date">` 2개. ⚠ **그런데 `useDebouncedSearch` 는 인스턴스화된다**(`StatsFilterBar.tsx:118`) — 소비되지 않는 훅이 도는 것이 §5 #1(P0 gap)의 원인이다. 요구의 세 번째 절(응답 경합)은 표면과 무관하게 **구조적으로 성립한다** — 조회 조건 전체가 쿼리 키에 들어가(`MemberStatsPage.tsx:116`) 늦게 온 응답이 **다른 키의 캐시**로 갈 뿐이다(`queries.ts:14-16`) | 재현할 표면 없음(IME 조합을 일으킬 입력이 0개) | N/A |
| FEEDBACK-02 | FEEDBACK | N/A | **이 화면에 파괴적/비가역 액션이 없다.** 서버 쓰기가 0건이고, CSV 내보내기는 **되돌릴 것이 없는 다운로드**다. **회원 목록(NFR-003)의 '회원 삭제' 확인 플로우가 여기엔 존재하지 않는다** — 이 화면은 회원을 갖고 있지 않다(FS-055 §1.1) | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **이 화면에 편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다(조회 조건은 즉시 URL 에 커밋되므로 '미저장'이 존재하지 않는다) | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 modal 이 없다** — `Modal`/`ConfirmDialog` 를 import 하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | **표면이 실재한다.** 이 화면은 토스트를 띄운다 — `useCsvExport.ts:75` `toast.success('N건을 내보냈습니다.')` · `:82` `toast.error(…)`. viewport 는 `ToastProvider` 소유이고 **비어 있을 때도 상시 마운트된 live region 두 벌**(`ToastProvider.tsx:165` `role="status" aria-live="polite"` · `:168` `aria-live="assertive"`)이 이미 요구를 인코딩한다(`:155-156` 이 동적 삽입 aria-live 에 의존하지 않는 이유를 밝힌다) | 판정은 `ToastProvider` 소유 문서를 따른다 | 종속 |
| A11Y-02 | A11Y | N/A | **이 화면에 Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | 직접 | **표면이 실재하고 충족한다.** 폼 컨트롤 넷 — ① `SelectField#stats-compare`(`StatsFilterBar.tsx:171`, `<label htmlFor>` — `:168`) ② `SelectField#stats-segment`(가입 경로 — `:193`, `<label htmlFor>` — `:190`) ③ `SelectField`(페이지당 — `StatsTable.tsx:213-215`, `<span id>` + `aria-labelledby`; 주석 `:208-209` 가 `htmlFor` 를 쓰지 않은 이유를 밝힌다) ④ `DateRangeField`(custom 일 때 — `:151`): **`aria-invalid` 가 항상 `aria-describedby` 와 짝으로만 나가고**(`DateRangeField.tsx:44-45`) 유효할 때는 둘 다 없으며(`aria-invalid="false"` 를 남기지 않는다) 에러 `<p>` 가 `role="alert"` + 그 id 다(`:94-97`). **required 표면은 이 화면에 없다** — 조회 조건에 필수 입력이 없어 `required` 를 넘기지 않는다 → 요구의 required 절은 공허참. ⚠ **`FormField.withAriaRequired` 주입 메커니즘은 이 화면과 무관하다** — `FormField` 를 쓰지 않는다 | 이 화면에서 **`aria-invalid` without `aria-describedby` grep = 0**. `?preset=custom&start=2026-07-16&end=2026-07-01` → 두 date 입력에 `aria-invalid` + `aria-describedby`, 에러 `<p role="alert">`. **테스트**: `stats-screens.test.tsx:125-136`(메시지가 **정확히 한 번**) | pass |
| A11Y-12 | A11Y | 직접 | **표면이 실재하고 충족한다.** 요구의 appliesTo('좌측 필터 list item')의 실체는 `filterItemStyle` 버튼이고 **이 화면의 기간 프리셋 7개가 정확히 그것을 쓴다**(`StatsFilterBar.tsx:85-90` `presetButtonStyle` = `filterItemStyle(active)` + 폭만 되돌림). **`aria-pressed={active}` 하나로만 선택을 말한다**(`:135`) — `aria-current` 를 섞지 않는다(머리말 `:7-8` 이 그 결정을 명시). 선택을 색상 단독으로 인코딩하지 않는다 | `apps/admin/src/pages/stats/**` 에서 `aria-current` grep = **0**(주석 1건뿐). 모든 `filterItemStyle` 버튼이 `aria-pressed`. ⚠ DS `Pagination` 의 `aria-current="page"`(`Pagination.tsx:144`)는 **페이지 번호(내비게이션)이지 toggle 필터가 아니다** — 요구가 금지한 축이 아니다 | pass |
| MOTION-01 | MOTION | N/A | **이 화면에 Modal 이 없다**(FEEDBACK-06·A11Y-02 와 같은 사유) | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | 상속 | **표면이 실재한다** — 내보내기 결과로 토스트를 띄운다(`useCsvExport.ts:75,82`). exit 애니메이션은 `ToastProvider`/`Toast` 소유이고 **Motion 라이브러리는 아직 미도입**이다 | 판정은 `ToastProvider`·`Toast` 소유 문서를 따른다. 이 화면 코드로 해소할 수 없다 | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면에 `transition`·`animation`·`transform` 선언이 0건**이다. 소비하는 모션은 둘 — ① **스켈레톤 펄스**(`tds-ui-skeleton` — `StatsTable.tsx:180` · `StatsCard.tsx:50` · **`ShareBarList.tsx:116`**): `ui.css:83-93` 이 무한 펄스를 걸고 **`:110-113` 이 `@media (prefers-reduced-motion: reduce)` 에서 `animation-name: none` 으로 끈다** — 소비하는 모션에 게이트가 실재한다 ② 토스트(`ToastProvider` 소유). **막대 채움에 transition 이 없어**(`ShareBarList.tsx:67-71`) 새 모션을 들이지 않는다 | 판정은 `ui.css`·`ToastProvider` 소유 문서를 따른다. reduced-motion 을 켜고 `?delay=3000&view=tier` → 막대 스켈레톤이 펄스하지 않는다(코드 대조상 성립) | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:321` — `{ path: '/stats/members', element: <MemberStatsPage />, implemented: true }`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:383-392`). **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(`StatsPageShell.tsx:24-28,109`) | `/stats/members` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/stats/members` 는 `nav-config.ts:199` 의 **잎**(`['회원 통계','/stats/members']`)이므로 `findCoveringLeaf`(`:260-278`)가 정확히 일치하는 잎을 찾아 `findNavLabel`(`:297-299`)이 AppHeader `<h1>`(`AppHeader.tsx:101`)에 **'회원 통계'** 를 그린다 — 가지 라벨('통계')로 폴백하지 않는다. **이 화면에 in-content `<h1>` 이 없다**(`StatsPageShell.tsx:6-8` 이 그 결정을 기록). **`<h1>` 이 정확히 하나다** — GROUND-TRUTH 가 지적한 'h1 이중'(`FormPageShell.tsx:160`)이 여기엔 성립하지 않는다. 하위 라우트가 없어 '행위 미반영' 절도 대상이 아니다. ⚠ **`/users/members`(회원 목록)와 라벨이 갈린다**('회원 관리' vs '회원 통계') — 두 잎이 다른 것을 보여주므로 옳다 | `/stats/members` 진입 → AppHeader 제목이 '회원 통계'. `document.querySelectorAll('h1').length === 1`. 셸의 403 분기(`StatsPageShell.tsx:98`)와 `ForbiddenScreen`(`ErrorScreens.tsx:109`)은 둘 다 `<h2>` 라 이 규칙을 깨지 않는다 | pass |
| IA-04 | IA | 직접 | **충족.** 템플릿이 순서대로 성립한다 — ① **toolbar row**: 좌측 필터(프리셋·날짜·비교·가입 경로), **우상단 내보내기**(`StatsFilterBar.tsx:221` `spacerStyle`) ② **결과 count 요약**: `StatsTable.tsx:203-204` `rangeTextOf` ③ **SelectionBar**: 표면 부재(bulk 없음 — 읽기 전용) ④ **table**: `:131` ⑤ **Pagination**: `:228-233` — 한 페이지 초과 가능하므로 실재한다. **primary 등록 버튼이 없고 없는 것이 옳다** — 통계는 운영자가 만드는 것이 아니다(`StatsEmpty.tsx:4-6`). ⚠ **'등급별' 축은 이 템플릿을 따르지 않는다** — 표가 아니라 `ShareBarList`(4행 막대)라 count 요약·Pagination 이 없다. **요구가 전제하는 '행 목록'이 아니므로 이탈이 아니다**: 4행 스냅샷에 페이지는 뜻이 없고, 질문이 '몇 명인가'가 아니라 '어디에 쏠려 있나'다(`MemberStatsPage.tsx:292-295` 가 그 결정을 기록). 6개 통계 화면이 **똑같은 순서**로 읽히도록 셸이 순서를 소유한다(`StatsPageShell.tsx:3-4`) | `/stats/members` → 내보내기가 조건 바 우측, count 요약이 표 아래, 25건 초과 시 Pagination. `?view=tier` → 막대 4줄(페이지 없음) | pass |
| IA-05 | IA | N/A | **이 화면에 create/edit 폼이 없다** — `/stats/members` 는 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/stats/members/*` 가 0건). `:id` 로 갈릴 엔티티 폼이 존재하지 않는다(**통계에는 편집할 record 가 없다**). 회원 폼은 회원 목록 도메인의 것이고 NFR-003/004 가 판정한다 | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **미충족 — 거의 다 됐는데 `page` 하나가 깨진다.** 이 화면은 요구를 **정면으로 겨냥해 설계됐다**: `useStatsParams.ts:157` 이 `useSearchParams` 를 쓰고 기간(`preset`/`start`/`end`)·비교(`compare`)·**가입 경로(`segment`)**·축(`view`)·지표(`metric`)·정렬(`sort`/`dir`)·크기(`size`)·검색어(`q`)·페이지(`page`)가 **전부 URL** 이며, 기본값이면 파라미터를 지워 정규화하고(`:213-214`), 조건 변경은 `replace` 라 히스토리를 더럽히지 않는다(`:219`). 머리말(`:1-33`)이 `useListState` 를 쓰지 않은 이유까지 네 항목으로 판정해 두었다. **그런데 `page` 가 마운트 250ms 뒤 지워진다** — `StatsFilterBar.tsx:118` 이 **검색 입력이 없는 이 화면에서도** `useDebouncedSearch` 를 인스턴스화하고, 그 훅은 `input=''` 로도 디바운스 타이머를 걸어(빈 문자열은 '검색 해제'라 최소 길이 정책을 통과한다) 250ms 뒤 `params.setKeyword('')` 를 부른다. `setKeyword` 는 `update({q:null})` 이고(`useStatsParams.ts:275-280`) `update` 는 `keepPage` 가 아니면 **`page` 를 지운다**(`:216`). **요구가 acceptanceCheck 로 못 박은 'URL을 새 탭에 복사 → 동일 필터 list 재현'이 `page` 에 대해 깨진다** | `/stats/members?page=3` 진입(또는 그 링크를 새 탭에 붙여넣기) → **250ms 뒤 URL 이 `/stats/members` 가 되고 표가 1페이지로 튄다.** `?segment=kakao&page=3` 도 같다(`segment` 는 남고 `page` 만 사라진다). **어떤 테스트도 잡지 못한다** — `useStatsParams.test.tsx:35-45` 하네스는 `StatsFilterBar` 를 렌더하지 않고, `stats-screens.test.tsx` 는 URL 을 단언하지 않는다 | **gap** |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell.tsx:484-493` 의 `<Outlet>` **바깥** ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 `App.tsx` 루트 경계가 잡는다(`:363` 이 두 경계의 역할을 명시). 이 화면은 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx:383-385` 의 `<RequireAuth>` 가 AppShell **바깥**에서(`:378-379`), mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useStatsQuery` → `useQuery`)이 그 캐시를 통과한다. **보존할 입력이 없어 재인증 손실이 없다** — EXC-19 의 dirty draft 문제가 여기엔 없다 | 판정은 `RequireAuth`·`queryClient` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 그러나 §5 #4 를 함께 읽어야 한다.** ① **route-level read**: `AppShell.tsx:490-492` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 모든 라우트를 덮고 `route-resource.ts` 가 이 경로를 자기 잎 `page:/stats/members` 로 해석해 read 없는 deep-link 를 `<ForbiddenScreen/>` 으로 막는다. **⚠ 이 화면에서 그 잎 분리는 실질 통제다** — `page:/users/members`(회원 목록)와 **다른 행**이라 '개별 회원은 못 보고 지표만 보는 역할'이 만들어질 수 있고, **이 화면이 실제로 그 분리를 지탱한다**(개인정보 표면이 0 — FS-055 §1.1). BE-040 §7.1 의 '달력만 끄는 것은 아무것도 숨기지 않는다'와 **정반대다** ② **write-action 게이팅**: **실재한다** — `export` 는 진짜 액션이고(`permissions/resources.ts:31,46`) `StatsPageShell.tsx:119` 가 `can(resourceId,'export')` 를 내려보내면 `StatsFilterBar.tsx:223` 이 **버튼을 렌더하지 않는다**(비활성이 아니라 **부재** — 셸 주석 `:11-12`). create/update/remove 컨트롤은 0개다 ③ **강등 reconcile**: 권한 스토어(Zustand)가 바뀌면 `usePermissions` 구독자가 재렌더되므로 별도 코드 없이 성립한다(`RequirePermission.tsx:24-25`) | export 권한을 끈 역할 → 내보내기 버튼이 **사라진다**. read 권한을 끈 역할로 deep-link → 403 화면. ⚠ 공유 `useRouteWritePermissions()`(`RequirePermission.tsx:45-52`, `canExport` 를 이미 제공)를 쓰지 않고 사본 경로를 만든다. ⚠⚠ read 게이트가 **둘**이고 하나는 죽어 있다 — §5 #4 | pass ⚠ |
| EXC-04 | EXC | N/A | **이 화면은 write 를 하지 않는다** — appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. **편집할 record 자체가 없다**(통계는 집계다). 회원 record 의 동시성은 회원 목록 도메인(NFR-003/004)의 관심사이고 **이 화면은 회원을 갖고 있지 않다**(FS-055 §1.1). GROUND-TRUTH 의 `createStoreAdapter` 409 경로도 무관하다 — `shared/crud` 에서 가져오는 것은 `parseFilter`·`useDebouncedSearch`·`failIfRequested`/`LATENCY_MS` 뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **이 화면에 서버로 가는 user-initiated write 가 0건**이다 — 중복 제출을 막을 submit/confirm 이 없고 멱등키를 실을 요청도 없다. ⚠ **표면이 없는데도 중복 방지가 구현돼 있다는 사실은 기록한다** — `useCsvExport.ts:52` `if (controllerRef.current !== null) return;` 이 진행 중 재클릭을 무시하고(주석이 EXC-08 을 인용), UI 도 버튼을 진행률+취소로 **교체**한다(`StatsFilterBar.tsx:225-237`). 다만 그것은 서버 write 가 아니라 **파일 생성**의 중복 방지다 | 재현할 표면 없음(서버로 나가는 write 0건) | N/A |
| EXC-09 | EXC | 직접 | **충족 — abort 경로가 둘이고 둘 다 옳다.** ① **조회**: `useStatsQuery` 가 `queryFn: ({signal}) => fetcher(signal)`(`queries.ts:38`)로 signal 을 흘리고 `fetchMemberStats` → `loadStats(scope, signal, …)` → `wait(readDelayMs(), signal)`(`mock.ts:51`)가 받는다. 화면 이탈 시 react-query 가 abort 하고 **취소된 쿼리는 `error` 를 세팅하지 않아** FS-055-EL-006 배너가 뜨지 않는다 ② **내보내기**: `useCsvExport.ts:81` `if (isAbort(cause)) return;` — **공유 predicate**(`shared/async.isAbort`)를 쓴다. 취소 시 error 토스트가 없고 `finally`(`:84-87`)가 `controllerRef`·`isExporting` 을 리셋해 버튼 state 가 복원된다. 주석(`:80`)이 요구의 근거 문장을 인용한다 — '취소는 실패가 아니다 — 사용자가 고른 것이다' | 조회 중(400ms 안에) 다른 메뉴로 이동 → 실패 배너·토스트가 뜨지 않는다. 긴 기간 내보내기 중 '취소' → **토스트 없이** 버튼이 복원된다. `?delay=5000` 으로 창을 넓혀 재현 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **11** | STATE-01 ⚠ · STATE-02 · STATE-04 · TOKEN-01 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-04 · EXC-03 ⚠ · EXC-09 |
| `종속` | **9** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **9** | COMP-10 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-02 · MOTION-01 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **1** | IA-13 |
| **합계** | **30** | 11 + 9 + 9 + 1 = **30** ✔ |

> **P0 gap 1건(IA-13) — quality-bar §How to use 기준 '배치 실패' 사유다.** §5 #1 로 이관한다.
> **`pass ⚠` 2건은 '충족했으나 함께 읽어야 할 것이 있다'는 뜻이다** — STATE-01 은 §5 #2(컨트롤 종속 재조회의 거짓말), EXC-03 은 §5 #4(죽은 이중 게이트). **둘 다 요구의 문자는 충족하므로 gap 으로 세지 않는다** — quality-bar 가 정본이고 이 문서가 요구를 다시 쓰지 않는다는 §1 의 규칙 그대로다.
> **N/A 9건은 이 화면이 읽기 전용 분석 뷰이고 개별 회원을 갖고 있지 않기 때문이며 결함이 아니다**(§1.2).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `queries.ts:40` `placeholderData: keepPreviousData`. ⚠ `staleTime` 을 지정하지 않고 `queryClient` 기본값에 의존한다 — 요구가 '`staleTime`(30s)이 지배한다'고 하므로 그 값이 전역 기본이면 충족이다(판정은 `queryClient` 소유) | 조건 변경 시 이전 행이 새 데이터 도착까지 유지된다 | pass |
| STATE-05 | P1 | **충족 — 그리고 두 컴포넌트가 같은 계약을 갖는다.** `StatsEmpty`(`StatsEmpty.tsx:20-43`)가 DS `Empty` 의 3분기를 상속한다(`Empty.tsx:52-57` `resolveMode`). 표는 `label="가입 기록"` → '집계된 가입 기록이 없습니다', **막대는 `label="회원 등급"` → '집계된 회원 등급이 없습니다'**(`MemberStatsPage.tsx:304-310`). 둘 다 `hasActiveFilters` + `onResetFilters` 를 넘겨 '필터에 맞는 …' + '필터 초기화' 분기를 낸다. **`ShareBarList` 가 `StatsTable` 과 계약을 맞춘 이력이 코드에 남아 있다**(`ShareBarList.tsx:10-15` — '주문·유입·회원 세 화면이 똑같은 3분기를 각자 손으로 다시 썼다 … 형제 컴포넌트가 상태 계약을 달리 가지면 화면마다 빈 상태가 갈라진다'). 생성 CTA 가 없는 것이 옳다(`createVerb='집계'` — `StatsEmpty.tsx:4-8`). `hasActiveFilters` 산정도 정확하다 — view/metric 은 '보는 각도'라 세지 않는다(`useStatsParams.ts:178-184`) | `?empty=all` → '집계된 가입 기록이 없습니다'(CTA 없음). `?empty=all&segment=kakao` → '필터에 맞는 …' + '필터 초기화'. `?empty=all&view=tier` → **막대 자리에 '집계된 회원 등급이 없습니다'** | pass |
| STATE-06 | P1 | **N/A(표면 부재)** — write 가 없어 invalidate 할 것이 없다. ⚠ **다른 화면의 write 가 이 화면을 stale 하게 만드는 경로도 없다** — 회원 목록에서 회원을 삭제해도 쿼리 키 `['stats','members',…]` 를 아무도 무효화하지 않는다. **그것이 옳은지는 미정이다**: 통계는 '어제까지의 집계'라 즉시성이 요구되지 않을 수 있으나, 그 판단이 코드에 적혀 있지 않다 | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **N/A(표면 부재)** — 검색 입력이 없다(§2 COMP-10). `type="search"` grep = 0 | 재현할 표면 없음 | N/A |
| COMP-06 | P1 | **충족(P2이나 기록).** 스켈레톤 행 수 = `pageSize`, 칸 수 = **실제 컬럼 수**(`StatsTable.tsx:176-183` 이 `columns.map` 으로 파생). **막대도 같다** — 줄 수 = `MEMBER_TIERS.length`=4(`MemberStatsPage.tsx:303`), `ShareBarList.tsx:96-100` 의 주석이 '하드코딩된 5줄이 아니라 실제 모양과 같은 수여야 로딩→완료에서 레이아웃이 튀지 않는다'고 요구를 인용한다 | `?delay=3000` → 스켈레톤 행 25 × 칸 5. `?delay=3000&view=tier` → **4줄**. `length: 5` grep = 0 | pass |
| COMP-11 | P1 | **충족 — 이 화면이 요구의 모범 사례다.** ① **preset** 6종(`period.ts:134-166`) ② **`start ≤ end` 강제 + 인라인 검증**: `periodErrorOf`(`:200-206`)가 '종료일은 시작일보다 빠를 수 없습니다.' 를 **조용한 empty 대신** 입력 옆에 낸다. 그리고 **본문을 그리지 않는다**(`StatsPageShell.tsx:130`) ③ **ko-KR 포맷**: `formatPeriodLabel`(`period.ts:216-220`) ④ **keyboard**: 네이티브 `<input type="date">` ⑤ **URL 반영**: `preset`/`start`/`end`(`useStatsParams.ts:225-243`). **말일 보정까지 있다**(`period.ts:103-105`, 테스트 `stats.test.ts:72`) | `?preset=custom&start=2026-07-16&end=2026-07-01` → **검증 에러 정확히 1회**, 본문 미렌더(`stats-screens.test.tsx:125-136`). F5 → 같은 범위 | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. 이 화면의 Tab 정지점은 프리셋 7 + select 3 + 세그먼트 2 + 정렬 헤더 5 + 페이지 번호 + 버튼 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 이동 + announce 는 `AppShell` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **N/A(표면 부재) — 그리고 의도된 부재다.** 표에 row-nav 가 없다(`StatsTable.tsx:186-192` 에 `onClick`/`rowNavProps` 가 없다). **행을 클릭해도 아무 일도 일어나지 않으며 그것이 설계다** — `MemberStatsPage.tsx:5-6` 이 '개별 회원은 여기서 열 수 없다(**열 이유가 없다**)'고 명시하고 `:7-8` 이 `pages/members` 를 import 하지 않는 이유를 밝힌다. 목적지가 존재하지 않으므로 'row 내 keyboard 등가물'을 둘 대상이 없다 | 재현할 표면 없음 | N/A |
| A11Y-09 | P1 | 이 화면이 쓰는 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(sticky `<th>` `StatsTable.tsx:38` · 조건 라벨 `StatsFilterBar.tsx:68-74`) · `surface-default` 위 `text-muted`(범위 요약 `StatsTable.tsx:203` · 힌트 `StatsKpiRow.tsx:41-47` · **막대 구성비 `ShareBarList.tsx:73-76`**) · `feedback-success-text`/`feedback-danger-text`(증감 — `StatsKpiRow.tsx:61-65` · `ShareBarList.tsx:78-82`) · **`surface-raised` 위 `chart-series-1`**(막대 트랙 위 채움 — `ShareBarList.tsx:59-71`) · `chart-label`/`chart-axis`(`LineAreaChart.tsx:166,173`) | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다 | 종속 |
| A11Y-16 | P1 | **부분 미충족 — 차트가 걸린다.** **옳게 된 축**: 정렬 헤더가 `aria-sort` 를 `<th>` 에 두고 방향 표식은 `aria-hidden` + 숨김 문구(`StatsTable.tsx:144,157-162`) · 숨긴 `<caption>`(`:132`) · `aria-busy`(`:131`, **막대도 — `ShareBarList.tsx:111`**) · `SegmentedControl` 이 `role=radiogroup` + 로빙 tabindex + 좌우 화살표(`SegmentedControl.tsx:65-95`) · 프리셋 `aria-pressed` · 증감이 **색·글리프·문장 3중 인코딩**(`StatsKpiRow.tsx:70-73`) · **'탈퇴'의 색 반전**(`isLowerBetter` — `MemberStatsPage.tsx:152`; 없으면 탈퇴 급증이 초록으로 뜬다) · **막대가 `aria-hidden`**(`ShareBarList.tsx:7-8,147` — 점유율을 글자로 이미 찍으므로 SR 이 같은 값을 두 번 읽지 않는다: **올바른 판단이다**) · Empty 가 `role="status"`(`Empty.tsx:104`) · 진행률이 `role="status"`(`StatsFilterBar.tsx:230`). **미충족**: **차트에 데이터 표 대체가 없다** — `role="img"` + `aria-label` 이 **합계·최고만** 요약하고(`StatsTrendCard.tsx:46-53`) 일자별 값이 닿지 않으며 비교 계열 값은 aria-label 에 **아예 없다**(`:52` 가 존재만 알린다). ⚠⚠ **'누적' 지표에서는 그 요약이 아예 틀렸다** — §5 #6 | 스크린리더로 추이 카드 → '회원 추이 … 합계 X명, 최고 Y명' 까지만. 색각 이상 → 두 계열이 **면적 vs 선** 으로 갈린다(색 단독 아님 ✓), 막대는 단색이라 애초에 색 구분에 의존하지 않는다 ✓ | **gap** |
| IA-03 | P1 | **N/A** — top-level leaf 다(`nav-config.ts:199`). non-top-level route 가 아니므로 breadcrumb 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족.** ① **wide table 가로 스크롤**: 충족 — `StatsTable.tsx:31-35,130` 의 `overflowX:'auto'` 래퍼. **컬럼이 5개뿐이라 방문자 통계(8개)보다 여유가 있다** ② **반응형 접힘**: 충족 — KPI 가 `auto-fit minmax` 로 1열까지(`StatsKpiRow.tsx:19-23`), 조건 바 wrap(`StatsFilterBar.tsx:45-50`), 푸터 wrap(`StatsTable.tsx:58-65`), **막대는 세로 스택이라 원래 좁은 폭에 강하다**(`ShareBarList.tsx:22-29`) ③ **sticky identity 열**: **미충족** — 첫 컬럼('일자')의 가로 sticky 가 없다 ④ **최소 지원 폭 선언 없음** ⑤ **touch-target 미검증** — 정렬 헤더 버튼(`:45-56` `padding: 0`) ⑥ ⚠ **막대 라벨이 ellipsis 로 잘린다**(`ShareBarList.tsx:43-46`) — 등급 이름은 짧아('일반'·'VIP') 실질 문제가 없다 | 768px·375px → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다(코드 대조상 성립). `?view=tier` 는 좁은 폭에서도 온전하다 | 부분 pass — §5 |
| ERP-02 | P1 | **N/A(대상 아님)** — `CrudTable` 을 쓰지 않는다. `shared/ui` 의 `tableStyle`/`thStyle`/`tdStyle` 을 재사용하므로(`StatsTable.tsx:15-24`) density 토큰이 도입되면 자동으로 따라온다 | 재현할 표면 없음(판정은 `shared/ui` 소유) | N/A |
| ERP-03 | P1 | **부분 충족.** sticky `<thead>` 가 **있다** — `StatsTable.tsx:37-43`(주석이 요구를 인용). **NFR-040 이 gap 으로 판정한 축이 여기선 충족이다.** **미충족**: `zIndex: 1` 이 **토큰이 아니라 리터럴** · on-scroll elevation 토큰 없음 · SelectionBar 는 표면 부재 | 100건/페이지로 세로 스크롤 → 헤더가 붙어 있다. `zIndex: 1` 리터럴 1건 | 부분 pass — §5 |
| ERP-04 | P1 | **충족.** clickable header(`StatsTable.tsx:147-163`) · **`aria-sort` 를 `<th>` 가 갖는다**(`:144`, 주석 `:143` 이 '정렬은 열의 속성'이라 판정) · ▲▼↕ 는 `aria-hidden` + 숨김 문구 · keyboard(네이티브 `<button>`) · **numeric 우측 정렬 + tabular-nums**(`:125-126` `numericCellStyle` — 5컬럼 중 **4개**가 `align:'right'`). 정렬 자체도 정확하다 — **안정 정렬** + `localeCompare('ko-KR')`(`table.ts:26-39`). **'순증' 컬럼의 `sortValue` 가 `netChangeOf` 라 음수까지 옳게 정렬된다**(`MemberStatsPage.tsx:82`). ⚠ **등급별 축에는 정렬이 없다** — 4행 스냅샷이라 정렬할 것이 없고(`MemberStatsPage.tsx:292-295`) `tierColumns` 에 `sortValue` 를 주지 않았다(`:200-222`) — **의도된 부재다** | 정렬 헤더 클릭 → `aria-sort` 가 `descending`, 재클릭 → `ascending`. '순증' 정렬 시 음수 날이 맨 아래(desc). **테스트**: `stats.test.ts:269-309` | pass |
| ERP-05 | P1 | **부분 충족 — 표면은 실재하나 DS 의 것이 아니다.** ① **total-range**: 실재 — '전체 N건 중 x–y'(`StatsTable.tsx:203-204`), 0건이면 '전체 0건', ko-KR 자릿수, EN DASH, clamp 까지 정확하고 **경계 unit test 가 있다**(`stats.test.ts:336-342`) ② **page-size selector**: 실재 — 10/25/50/100(`StatsTable.tsx:213-225`) ③ **a11y 보존**: `aria-current`/label 은 DS `Pagination` 이 유지 ④ ⚠ **그런데 이 둘은 DS `Pagination` 이 그린 것이 아니다.** `StatsTable.tsx:228-233` 은 `page`·`totalPages`·`label`·`onChange` 만 넘긴다 — **`pageSize` 를 넘기지 않으므로 DS opt-in 스위치가 꺼진다**(`Pagination.tsx:112` `showRange = pageSize > 0` → false → `:166` 이 번호 줄만 돌려준다). DS 의 범위 요약(`:171-172`, **`role="status"` 로 AT 에도 알린다**)과 크기 선택기(`:177-194`)가 **잠들어 있고** 표가 사본을 그린다. **`rangeTextOf` 가 두 벌**(`Pagination.tsx:41` · `table.ts:63`) — 출력이 같고 각자 경계 테스트를 갖는다(`Pagination.test.tsx:105-149` · `stats.test.ts:336-342`). 요구의 appliesTo 는 **'Pagination molecule'** 이므로 이 화면은 요구가 지목한 소비처가 아니다. ⚠⚠ **앱 전체에서 DS `Pagination` 에 `pageSize` 를 넘기는 호출부는 0건이다** | 사용자 눈에는 범위·크기가 **보인다**(요구의 결과는 달성). 그러나 `Pagination` 에 `pageSize` grep = 0 → DS 범위 요약의 `role="status"` announce 가 **일어나지 않는다**(사본에는 `role` 이 없다 — `StatsTable.tsx:203`) | 부분 pass — §5 |
| ERP-06 | P1 | **충족.** 존댓말 일관 · 날짜/숫자가 헬퍼 경유(`formatNumber`·**`formatSignedNumber`**(shared) · `formatDayLabel`·`formatPeriodLabel`(period.ts) · `formatMetric`(format.ts)) · empty/error 문구가 템플릿. **FS-040 이 gap 이던 '두 뷰의 날짜 표기가 다르다'가 여기엔 없다** — 표·차트축·범위 요약이 전부 `formatDayLabel`(`period.ts:211-213`) 한 벌이다. **힌트 문구가 지표 정의를 말해 준다**('기간 마지막 날 **마감 기준**으로 남아 있는 전체 회원 수입니다.' — `MemberStatsPage.tsx:169`) — 관리자가 '누적이 뭔데?'를 묻지 않게 한다 | 축을 바꿔도 날짜 표기가 `2026.07.16` 로 같다 | pass |
| ERP-07 | P2 | **N/A(표면 부재)** — 이 화면에 금액 컬럼이 없다. 회원 지표는 전부 '명'이다. ⚠ 그 규약(`format.ts:20-33` `withUnitSuffix` — '단위는 헤더가 이름표로 갖는다')은 이 섹션이 갖고 있고 **매출 통계(NFR-056)가 쓴다** | 재현할 표면 없음(금액 0컬럼) | N/A |
| ERP-08 | P1 | **충족 — 이 화면에는 부호 요구까지 실재한다.** 숫자가 전부 `formatNumber`(shared) 경유(`MemberStatsPage.tsx:65,73,88,212`) · **부호 delta 가 `formatSignedNumber`(shared) 경유**(`:80-81` — '순증' 칸). 요구의 acceptanceCheck 가 '금액이 `formatSignedNumber` 로 천단위·부호 표시'라 못 박은 바로 그것이다. **셀에 raw `toString()`/`String()` 이 0건**(FS-040 이 gap 이던 축). 상대시간 없음(통계는 절대 날짜). **부호를 다는 이유가 코드에 적혀 있다** — `MemberStatsPage.tsx:45-50`: '회원이 줄어든 날을 `124` 처럼 중립적으로 적으면 표를 훑는 눈이 감소를 그냥 지나친다'. ⚠ **경계 사안**: `format.ts:8-10` 이 스스로 보고하듯 비율(%)·증감 계산이 `shared/format` 이 아니라 이 섹션에 산다(A83 축1 blocker) — 요구의 '공유 formatter 로 렌더한다'를 **섹션 단위로만** 만족한다 | 표 셀에 `String(`/`toString()` grep = 0. 순증 칸이 `'+124'`/`'-3'`. 단 `formatPercentValue`·`deltaOf` 가 `pages/stats/_shared/format.ts` 에 있다 | 부분 pass — §5 |
| ERP-09 | P2 | **충족 — 이 화면은 수렴의 수혜자다.** '오늘'이 `useStatsParams.ts:162` `formatDate(new Date())` 이고 그 `formatDate` 는 `shared/format.ts:62-63` 의 **`DISPLAY_TIME_ZONE = 'Asia/Seoul'` 고정 `Intl.DateTimeFormat`**(`:76-86`, `formatToParts` 로 조각을 받아 우리가 조립한다)이다. 달력 산술 앵커는 **UTC 정오**(`period.ts:77` `NOON_HOUR_UTC` · `:97,104`)이고 `period.ts:9-13` 이 수렴을 기록한다 — 이 파일의 사본은 **UTC 자정** 앵커였고 정본은 정오이며 '둘은 UTC 앵커라 동치이며 출력은 한 글자도 바뀌지 않는다'. `shared/format.ts:41-49` 가 판정 근거를 남긴다(1970–2100 × 29,224 조합 대조 · 정오가 **더 안전한 불변식**). **`pages/reservations/_shared/calendar.ts` 가 browser-local 로 남아 NFR-040 이 gap 인 것과 정반대다.** ⚠ **남는 것은 TZ 가 아니라 갱신이다** — `today` 가 마운트 시 고정이라(`:159-162`) 자정을 넘기면 '오늘'이 어제 기준이다. **의도된 트레이드오프다**(매 렌더 `new Date()` 면 useMemo 의존성이 매번 달라져 무한 재조회). ⚠⚠ **이 화면에는 TZ 가 걸린 축이 하나 더 있다** — 픽스처의 누적 기준일(`ANCHOR_DATE = '2026-01-01'`)과 `daysBetween`(`data-source.ts:58`)이 **달력 날짜 문자열 산술**이라 TZ 를 타지 않는다 ✓ | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 진입 → **한국 기준 '오늘'과 같은 날짜**가 잡힌다. **테스트**: `shared/format.test.ts:90,117` · `stats.test.ts:36-47` | pass |
| ERP-12 | P1 | **충족 — 이 화면이 요구의 모범 사례다.** ① **현재 필터된 결과 집합 전체**(가시 page 만이 아님): `MemberStatsPage.tsx:250-261` 이 축에 따라 `tierRows`(4행) 또는 `rows`(**페이지 자르기 전**)를 넘긴다. `useCsvExport.ts:36` 의 타입 주석이 그것을 강제한다 ② **한국어 헤더**: `StatsColumn.header` 그대로(`useCsvExport.ts:72`) ③ **값은 표시대로**: `StatsColumn.csv` 가 `render` 와 **같은 원천**을 쓰도록 타입이 묶는다(`_shared/types.ts:44-53`). **등급별 CSV 는 구성비까지 담는다**(`MemberStatsPage.tsx:194,216-221`) — 화면(막대)이 보여주는 값과 엑셀의 값이 같아야 하기 때문이다 ④ **UTF-8 BOM**: `download.ts:16,38` ⑤ **progress + cancel**: `useCsvExport.ts:21,66-69` — 200행마다 `wait(0, signal)` 로 양보(`:10-12`) ⑥ **scope label**: '엑셀 내보내기 (N건)'(`StatsFilterBar.tsx:246`) + '내보내기는 현재 조건 전체를 담습니다.'(`:253-255`). **파일명이 축을 반영한다** — `stats-members-daily` vs `stats-members-tier`(`MemberStatsPage.tsx:254,260`). RFC 4180 이스케이프(`download.ts:19-22`) | 경로를 좁히고 내보내기 → 엑셀에서 한글이 깨지지 않고 **현재 조건 전체**가 들어 있다. `?view=tier` → 4행 + 구성비 | pass |
| ERP-13 | P1 | **충족.** 조사를 주입하는 자리는 **빈 상태 둘**이고(표·막대) `Empty.tsx:16-27`(`hasBatchim`/`subjectParticle`)이 받침을 보고 고른다 — '집계된 가입 기록**이** 없습니다' · '집계된 회원 등급**이** 없습니다'. `StatsEmpty.tsx:8` 이 `createVerb='집계'` 로 동사까지 고친다. 나머지는 고정 문구다. **리터럴 '이(가)/을(를)/은(는)' grep = 0** | `?empty=all` → '집계된 가입 기록이 없습니다'. `?empty=all&view=tier` → '집계된 회원 등급이 없습니다'. `pages/stats/**` 에 리터럴 조사 grep = 0 | pass |
| ERP-15 | P1 | **부분 미충족 — 이 화면은 곱이 가장 크다.** ① **가로 스크롤**: 충족(§3 IA-14) ② **행 임계값 cap / virtualization**: **없다** — `pageSize` 상한 100 이 DOM 에 전부 그려진다. 실사용에서 일자별 행은 기간 일수(프리셋 최대 31)라 문제가 없다 ③ ⚠ **URL 로 기간 상한을 뚫으면 화면이 멈춘다** — `?preset=custom&start=1900-01-01&end=2100-01-01` → `eachDay`(`period.ts:59-65`)가 **73,000 날짜**를 만들고 **`dailyOf`(`data-source.ts:112-118`)가 그것을 경로 4벌로 만든 뒤 `totalRowsOf` 가 5벌째를 더한다 — 비교 기간까지 두 벌이면 73만 행**이다(방문자 통계의 **5배**). 게다가 **정렬이 매 렌더 전량을 돈다**(`StatsTable.tsx:116` — `useMemo` 가 **없다**). 기간 상한 검증이 `periodErrorOf`(`period.ts:200-206`)에 없다 — 순서와 형식만 본다 ④ **등급별 축은 4행 고정**이라 이 축에 걸리지 않는다 | `?preset=custom&start=1900-01-01&end=2100-01-01` → 프레임 드랍/무응답. 25행 페이지에서도 **정렬 대상은 전량**이다 | **gap** |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 이 화면의 조회도 상한이 없다. `wait(delay, signal)`(`mock.ts:51`)은 abort 를 받지만 **스스로 상한을 걸지 않는다** | 응답하지 않는 백엔드를 붙이면 **영원히 스켈레톤**이다. 지금은 `LATENCY_MS=400` 픽스처에 가려 보이지 않는다 | gap |
| EXC-06 | P1 | **미충족.** `queries.ts:46-47` 이 `query.isError` 하나로 한 문구를 만든다 — 400/401/403/429/500/504 가 전부 같다. 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 훅이 읽지 않는다. **400 의 `error.fields` 도 버려진다** · **429 의 `Retry-After` 도 소비하지 않는다**. **BE-055 §7.4 가 애써 구분한 '권한 없음(403) vs 데이터 없음(200+빈배열)'이 화면에서 다시 뭉개진다** | `?fail=list` 만으로는 status 를 못 가른다. 코드 대조: `queries.ts:47` 에 status 분기 0건 | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 | 오프라인 전환 시 배너가 없다 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf 단일 뷰). 404 를 구분할 대상 id 가 없다. 기간에 데이터가 0건이면 **200 + 빈 배열**이고 화면은 Empty 로 그린다 — 404 가 아니다(BE-055 §5 · §7.4) | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk 작업·다중 선택이 없다(읽기 전용). ⚠ 요구의 취지 중 '장기 작업의 determinate progress + cancel' 에 해당하는 표면은 **내보내기에 실재하고 충족한다**(§3 ERP-12) | 재현할 표면 없음 | N/A |
| EXC-19 | P1 | **N/A** — dirty 폼 state 가 없어 session-expiry 시 잃을 draft 가 없다(§2 EXC-02) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **부분 충족.** **후반('never-leak')은 충족** — `queries.ts:46-47` 이 원문 에러를 노출하지 않는다(주석이 EXC-20 을 인용). raw 서버 body·stack 이 UI 에 없다. **전반('복사 가능한 error reference')은 미충족** — `traceId` 를 표시하지 않는다. BE-055 §2 봉투는 `traceId` 를 **필수로** 싣는데 화면이 버린다 | `?fail=list` → 배너에 복사 가능한 코드 **없음** | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 조회 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** `?delay=` 로 덮어쓸 수 있다(`mock.ts:24-27`). 실제 예산은 BE-055-EP-01 의 응답 크기가 정해지면 A63 이 확정한다 |
| **재조회 횟수** | **조회 조건이 바뀔 때만 1회** | 쿼리 키 = `['stats','members', period, comparePeriod, compare]`(`MemberStatsPage.tsx:116`) | **이 화면의 강점이다** — **가입 경로·드릴다운 축·추이 지표·정렬·페이지·크기 전환이 요청을 0건** 만든다. 응답 한 벌에 **4벌 × 5경로**가 다 있기 때문이다(`types.ts:81-88` — '경로별 자리를 모두 채워 두므로 세그먼트 전환에 재조회가 필요 없다'). 심대로 쪼개면 이 성질을 잃는다(BE-055 §7.2) |
| **응답 크기** | **경로 5벌 × 비교 2벌 = 10배** | `MemberByChannel<T>`(`types.ts:79`) | ⚠ **무재조회의 대가다.** 7일 조회면 7 × 5 × 2 = 70행이라 무해하나 **기간에 비례해 10배로 자란다** |
| DOM 규모 | 표 행 ≤ `pageSize`(최대 100) + KPI 4 + 차트 1 · **등급별은 4행 고정** | 페이지가 자른다(`table.ts:54-57`) | 실사용 상한: 일자별 = 기간 일수(프리셋 최대 31) |
| **CPU — 정렬** | **O(N log N) × 매 렌더 — 위험** | `StatsTable.tsx:116` `sortRows(rows, …)` 가 **`useMemo` 없이** 매 렌더 전량을 정렬 | 실사용(≤31행)에서는 무해. **URL 로 기간을 뚫으면 73,000행을 매 렌더 정렬한다**(§3 ERP-15) |
| **CPU — 픽스처 생성** | 조회마다 O(기간일수 × **4경로** × 비교 2벌) | `dailyOf`(`data-source.ts:112-118`) → `channelRowsOf` × 4 + `totalRowsOf` | 시드 난수라 결정론적(`mock.ts:56-60`) — 새로고침해도 같은 값. **VRT·스크린샷 회귀가 성립하는 이유** |
| 차트 x축 | 라벨 = 기간 일수 | `StatsTrendCard.tsx:87` | 30일이면 라벨 30개가 겹친다 — 솎아내기가 없다(`LineAreaChart.tsx:216-231` 이 전부 그린다) |
| 메모리 | 응답 4벌 × 5경로 상주 | `types.ts:81-88` | 기간이 길수록 10배로 자란다 |
| 번들 | **이 화면 전용 의존 0** | 차트 라이브러리 미도입 — `LineAreaChart` 가 SVG 를 직접 계산(`LineAreaChart.tsx:3-5`). **막대는 CSS 만으로 그린다**(`ShareBarList.tsx:59-71`) | 대가는 §3 A11Y-16 의 gap 이다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02) — **조회 조건 바가 살아남는다**(FS-040 과 대조). 단 status 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤 — **표는 행=pageSize·칸=5, 막대는 4줄**(§2 STATE-01) |
| 집계 0건 | 빈 상태 | ✔ 3분기 Empty + 필터 초기화 — **표와 막대가 같은 계약**(§3 STATE-05) |
| **컨트롤 종속 재조회(기간 토글)** | **이전 값 무효화** | ✖ **이전 기간의 숫자가 새 기간 라벨 아래 남는다.** 이 화면에서 특히 아프다 — **'누적 회원 수'는 값이 커서 틀렸다는 것을 알아챌 방법이 없다**(48,200 → 48,900). §5 #2 |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 스켈레톤(§3 EXC-05) |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **보존할 입력이 없어 손실 없음**(§2 EXC-02) |
| 화면 이탈 중 진행 조회 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ `isAbort` + 버튼 복원(§2 EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| 회원 목록에서 회원 삭제 | ? | △ **이 화면이 갱신되지 않는다** — 쿼리 키를 아무도 무효화하지 않는다(§3 STATE-06). 통계가 '어제까지의 집계'면 옳으나 **그 판단이 코드에 없다** |
| **URL 로 기간 상한 뚫기** | 거절 또는 cap | ✖ **화면이 멈춘다 — 73만 행**(§3 ERP-15 · §5 #7) |
| **`?page=3` 링크 공유** | 3페이지 재현 | ✖ **250ms 뒤 1페이지로 튄다**(§5 #1 — P0) |

### 4.3 이 화면이 답하지 못하는 운영 질문

quality-bar 의 축이 아니지만 화면의 목적(FS-055 §1)에 비추어 기록한다 — **§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '이 회원이 누구인가' | 불가 — **의도된 부재다**(`MemberStatsPage.tsx:5-6`: '개별 회원은 여기서 열 수 없다(열 이유가 없다)'). 회원 목록의 몫이고, **그 분리가 §2 EXC-03 의 두 잎 권한 분리를 성립시킨다** |
| '**카카오 가입자는 등급이 다른가**' | **불가 — 그리고 화면이 그렇게 보이지 않는다.** 등급 구성이 `TIER_WEIGHTS`(62/24/11/3) 고정이라(`data-source.ts:48-53,121-128`) **어느 경로를 골라도 비율이 같다.** 막대는 그것을 '구성비'라 부르며 그럴듯하게 그린다 — 픽스처의 성질이나 **지금 화면이 보여주는 구성비는 조회 조건과 무관한 상수다**(BE-055 §7.2) |
| '가입 후 며칠 남는가(잔존율)' | 불가 — 코호트 축이 없다 |
| '휴면 회원이 몇인가' | 불가 — 휴면/복구 축이 없다 |
| '성별·연령별로 보고 싶다' | 불가 — 축이 가입 경로와 등급뿐이다 |
| '한 달·한 분기를 보고 싶다' | 프리셋으로는 '이번 달/지난 달'까지. 직접 입력은 가능하나 **상한이 없어 위험하다**(§3 ERP-15) |
| '일자별 순증을 스크린리더로 읽고 싶다' | 차트로는 불가(§3 A11Y-16). 아래 표에는 있으나 연결돼 있지 않다 |

### 4.4 데이터 보존 · 감사

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 보존·복구할 상태가 없다 |
| 개인정보 열람 | **없다 — 그리고 그것이 설계다.** 화면·CSV 의 모든 값이 집계 수치이고 **애초에 이 화면이 개별 회원을 갖고 있지 않다**(`MemberStatsPage.tsx:7-8` 이 `pages/members` 를 import 하지 않는다). **회원 도메인의 화면인데 개인정보 표면이 0인 것이 이 화면의 핵심 성질**이고, 그래서 `page:/stats/members` 를 켜는 것이 **개인정보를 열지 않는다**(BE-055 §7.1·§7.3c). **FS-040(달력이 고객 이름을 렌더)과 정반대다** |
| 내보내기 감사 | ⚠ **불가능하다** — CSV 가 **클라이언트에서** 생성되므로 서버에 '누가 무엇을 내보냈는가' 가 남지 않는다(BE-055 §7.3). 이 화면은 집계뿐이라 실피해가 없으나 **매출 통계(NFR-056)에서는 같은 구조가 재무 데이터에 걸린다** |
| 권한 통제 | ⚠ `export` 권한은 **실질 통제가 아니다** — 클라이언트 생성이라 서버가 막을 지점이 없고 데이터는 read 만으로 이미 브라우저에 있다(BE-055 §7.3d). ✔ **반면 `page:/stats/members` 의 read 는 실질 통제다**(§2 EXC-03) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **IA-13** | **P0** | **⚠ 실재 결함 — 마운트 250ms 뒤 URL 의 `page` 가 지워진다.** `StatsFilterBar.tsx:118` 이 **검색 입력이 없는 화면에서도** `useDebouncedSearch` 를 인스턴스화 → 빈 문자열로 디바운스 커밋 → `params.setKeyword('')` → `update({q:null})`(`useStatsParams.ts:275-280`) → **`page` 삭제**(`:216`). `?page=3` 링크가 1페이지로 튄다. **어떤 테스트도 잡지 못한다**(훅 테스트에는 필터 바가 없고 화면 테스트는 URL 을 단언하지 않는다). **6개 통계 화면 전부에 걸린다.** 해소 후보: ① `StatsFilterBar` 가 `searchLabel` 이 있을 때만 훅을 쓰도록 검색 UI 를 자식 컴포넌트로 분리 ② `setKeyword` 를 값이 실제로 바뀔 때만 커밋 ③ `useDebouncedSearch` 가 초기값과 같은 값을 커밋하지 않게 | 이 화면 + 통계 6화면 | **A11 (P0)** |
| 2 | **STATE-01** | **P0(모순)** | **⚠ STATE-01 ↔ FS-002 모순이 이 화면에서 정면으로 발현한다.** `queries.ts:40`(`keepPreviousData`) + `:45`(`isFirstLoad`)는 STATE-01 의 '재조회 중 이전 행 유지'를 **문자 그대로** 지킨다 — 그래서 §2 판정은 pass 다. **그러나 이 화면의 재조회는 대부분 컨트롤 종속이다**: 기간 프리셋을 누르면 `params.period` 가 URL 에서 즉시 바뀌어 **조회 범위 문구(`StatsFilterBar.tsx:254`)는 새 기간을 말하는데**, 새 요청이 도는 동안 KPI·차트·표는 `keepPreviousData` 가 붙든 **이전 기간의 숫자**를 계속 보인다. `isFirstLoad` 가 false 라 스켈레톤도 **`aria-busy` 도 없다**(`StatsCard.tsx:35` `busy={loading}`). **이 화면에서 특히 아프다** — '누적 회원 수'는 값이 커서 눈에 잘 띄지 않게 바뀌므로(48,200 → 48,900) **'이번 달'을 눌렀는데 최근 7일의 누적이 '이번 달' 라벨 아래 서 있어도 틀렸다는 것을 알아챌 방법이 없다.** **FS-002(대시보드)는 컨트롤 종속 조회에 스켈레톤을 요구하고 e2e 가 `aria-busy` 를 단언하는데 STATE-01 은 유지를 요구한다 — 두 요구가 같은 `loading` 축에서 반대 방향을 가리킨다.** **판정: 명세가 옳다** — 월을 눌렀는데 일 차트가 남으면 그 차트는 거짓말이다. 따라서 **STATE-01 의 유지 규칙은 '컨트롤 비종속 재조회'(staleTime 만료·백그라운드 갱신)에 한한다**는 해석을 남긴다. **해소 경로**: `useStatsQuery` 가 `isPlaceholderData` 를 함께 내면 호출부가 '컨트롤 종속 = 무효화'를 표현할 수 있다 — **다만 `StatsCard` 로는 표현할 수 없다**(#3) | 이 화면 + 통계 6화면 + 대시보드 | **A11 · A01 (해석 확정) · A41** |
| 3 | — | — | **`StatsCard` 가 `loading` 하나로 두 가지를 한다 — 앱층에서 해소 불가(#2 의 선행 조건).** `StatsCard.tsx:35` 의 `<Card busy={loading}>`(=`aria-busy`)와 `:48` 의 `{loading ? <스켈레톤> : 본문}` 이 **같은 prop** 에 묶여 있다. `TodoCard.tsx:37,43` · `ListCard.tsx:40,46` 도 같다. **이관 대상은 `packages/ui` 의 계약 분리이지 이 화면이 아니다.** (참고: 앱이 소유한 `ShareBarList.tsx:109-122` 는 같은 패턴이나 **앱층이라 고칠 수 있다**) | `packages/ui` | **A41 / DS (선행 · 차단 사안)** |
| 4 | — | — | **403 게이트가 둘이고 하나는 죽어 있다**(§2 EXC-03 ⚠). `StatsPageShell.tsx:95-104` 가 `can(page:/stats/members,'read')` 로 자기 403 을 그리는데 `AppShell.tsx:490-492` 가 **같은 리소스·같은 액션**을 먼저 막는다 → 실앱에서 **도달 불가**. 게다가 UI 가 갈린다 — 공유 `ForbiddenScreen`(`ErrorScreens.tsx:103-119`)은 `role="alert"` + '대시보드로' 버튼을 갖는데 통계 것은 **둘 다 없다**. **설정 섹션은 이미 수렴했다**(`App.tsx:335-336` 이 명시) — 통계만 남았다. 아울러 export 판정이 공유 `useRouteWritePermissions()`(`canExport` 를 이미 제공)를 쓰지 않고 사본 경로를 만든다 | 이 화면 + 통계 6화면 | **A41 · A11** |
| 5 | — | — | **⚠ 실재 결함 — 파일 끝에 고아 주석이 있다.** `MemberStatsPage.tsx:339` 가 파일 **마지막 줄**에서 `/** 등급 구성 — 로딩/빈/정상의 세 갈래를 표와 같은 규칙으로 가른다 (STATE-01) */` 로 끝난다 — **뒤에 아무 선언도 없다.** 그 세 갈래는 `ShareBarList` 로 승격됐고(`ShareBarList.tsx:10-15` 가 이력을 기록) 주석만 남았다. **JSDoc 이 아무것도 문서화하지 않는다** | 이 화면 | A11 (죽은 코드 제거) |
| 6 | A11Y-16 | P1 | **⚠ 실재 결함 — 차트 `aria-label` 의 '합계'가 '누적' 지표에서 뜻이 없다.** `StatsTrendCard.tsx:49` 가 지표를 가리지 않고 `trend.current.reduce((sum,v)=>sum+v,0)` 를 '합계'라 부른다. 그런데 이 화면의 추이 지표 넷 중 **'누적'은 더하면 안 되는 값**이다 — `types.ts:64` 가 규약으로 못 박고('날짜별 값을 더하면 안 된다(이미 누계다)') `cumulativeOf`(`:114-120`)가 그것을 지키는데, **차트 `aria-label` 만 그 규약을 어긴다**(48,200 + 48,320 + … = 34만명). **눈으로 보는 사용자에게는 안 보이고 스크린리더 사용자에게만 틀린 수가 간다.** 더해서: 데이터 표 대체 없음 · 비교 계열 값이 aria-label 에 없음 | 이 화면 + 통계 6화면 | **A11 (실재 결함)** |
| 7 | ERP-15 | P1 | **URL 로 기간 상한을 뚫으면 화면이 멈춘다 — 이 화면이 곱이 가장 크다.** `?preset=custom&start=1900-01-01&end=2100-01-01` → 73,000일 × **경로 4벌 + 합성 1벌** × **비교 2벌 = 73만 행**(방문자 통계의 5배) + x축 라벨 73,000 + **`useMemo` 없는 매 렌더 전량 정렬**(`StatsTable.tsx:116`). `periodErrorOf`(`period.ts:200-206`)에 범위 상한 검증이 없다. **서버가 붙으면 서버 부하로 바뀐다**(BE-055 §7.6 #9) | 이 화면 + 통계 6화면 | **A11 · A63** |
| 8 | ERP-05 | P1 | 범위 요약·페이지 크기가 **DS `Pagination` 의 것이 아니라 사본**이다 — `StatsTable.tsx:228-233` 이 `pageSize` 를 넘기지 않아 DS opt-in 스위치가 꺼진 채고(`Pagination.tsx:112`), `rangeTextOf` 가 **두 벌**(`Pagination.tsx:41` · `table.ts:63`)이며 각자 경계 테스트를 갖는다. 사본에는 DS 의 `role="status"` announce 가 없다. **앱 전체에서 DS `Pagination` 에 `pageSize` 를 넘기는 호출부는 0건이다** | 이 화면 + 통계 6화면 + `packages/ui` | **A41 · A11** |
| 9 | — | — | **⚠ '순증' 계열의 음수가 차트 밖으로 나간다.** `netChangeOf` 는 음수가 될 수 있고(`types.ts:105-108`) 추이 지표에 '순증'이 있다(`MemberStatsPage.tsx:98,189`). 그런데 `LineAreaChart.tsx:62-67` `buildScale` 은 **`maxValue` 만** 보고 눈금을 `[0 … top]` 로 만들고 `:69-75` `toPoints` 의 `y = PADDING_TOP + (1 - value/top) * PLOT_HEIGHT` 는 `value < 0` 에서 **플롯 영역 아래로 삐져나간다**. baseline 이 0 임을 알리는 선도 없다. **픽스처의 탈퇴는 신규의 18~34% 대역이라(`data-source.ts:77-78`) 순증이 항상 양수여서 드러나지 않는다** — 실데이터에서 탈퇴가 신규를 넘는 날이 오면 발현한다. **이 화면이 유일한 음수 계열 소비처다** | 이 화면 + `packages/ui` | **A11 · A41** |
| 10 | ERP-03 / IA-14 | P1 | sticky `<thead>` 는 있으나(`StatsTable.tsx:37-43`) **`zIndex: 1` 이 토큰이 아니라 리터럴**이고 on-scroll elevation 이 없다. **identity 열('일자')의 가로 sticky 가 없다**. 최소 지원 폭 선언 없음 · 정렬 헤더 버튼의 touch-target 미검증 | 이 화면 + 앱 전역 | A11 |
| 11 | ERP-08 | P1 | 비율(%)·증감 포매터가 `shared/format` 이 아니라 `pages/stats/_shared/format.ts` 에 있다 — **`format.ts:8-10` 이 스스로 보고한 blocker**(A83 축1). ✔ **숫자·부호는 shared 경유다**(`formatNumber`·`formatSignedNumber`) — 요구의 핵심은 충족 | 이 화면 + `shared/format` | A41 · A11 |
| 12 | EXC-06 / EXC-20 | P1 | 조회 실패가 status 를 보지 않고(`queries.ts:47` — 400/401/403/429/500/504 한 문구) **참조 코드(`traceId`)도 없다**. **BE-055 §7.4 가 애써 구분한 '권한 없음(403) vs 데이터 없음(200+빈배열)'이 화면에서 다시 뭉개진다.** 400 의 `fields` 미매핑 · 429 의 `Retry-After` 미소비 | 이 화면 + 앱 전역 | A11 · A41 |
| 13 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — 서버가 침묵하면 **영원히 스켈레톤**이다. `AbortSignal.timeout` 앱 전체 0건 | 앱 전역 | A40 · A41 |
| 14 | EXC-11 | P1 | 오프라인 감지 없음(`navigator.onLine` 0건) | 앱 전역 | A40 |
| 15 | — | — | **`StatsKpiRow`·`StatsTrendCard` 의 `error` 경로가 죽어 있다** — `StatsPageShell.tsx:130-151` 이 error 면 children 을 렌더하지 않으므로 `MemberStatsPage.tsx:263,273` 의 `error={query.error}` 는 언제나 `''` 다. `StatsKpiRow.tsx:100` 의 error 분기와 `StatsCard.tsx:44-47` 의 `role="alert"` 오류 문단이 **도달 불가** | 이 화면 + 통계 6화면 | A11 |
| 16 | — | — | **등급별 CSV 컬럼의 `render` 가 죽어 있다** — `MemberStatsPage.tsx:195-223` 의 `tierColumns` 는 `render`·`csv` 를 둘 다 정의하는데 등급별 축은 **표를 그리지 않으므로**(`:296-311` 이 `ShareBarList`) `render` 가 **한 번도 호출되지 않는다**. `StatsColumn` 타입이 `render` 를 필수로 요구해서(`_shared/types.ts:48`) 생긴 죽은 코드다 — **CSV 전용 컬럼을 표현할 타입이 없다** | 이 화면 + `_shared/types.ts` | A11 · A41 |
| 17 | — | — | **주석이 낡아 없는 제약을 근거로 설계를 정당화한다** — `ShareBarList.tsx:3-5` 가 '구분 가능한 계열 색이 2개뿐이다(chart.series-1/2)' 라 적고 `StatsTrendCard.tsx:8-11` 이 '`chart.series-3..6` 이 필요하다(TOKEN-13)' 라 적었으나 **HEAD 4b805ad 에는 1..6 이 전부 있다**(`tokens/tokens.json:778-897` · `packages/ui/generated/tokens/tokens.css:138-145`)이고 `LineAreaChart.tsx:29-44` 는 이미 6계열을 순환 참조한다. 결정 자체는 옳을 수 있으나 **적힌 근거가 틀렸다** — 특히 **등급 4종은 이제 색으로 나눌 수 있다** | 이 화면 + 통계 6화면 | A11 (주석 정정) |
| 18 | — | — | **BE-055 §7.6 #7 (도메인)** — **한 회원이 여러 가입 경로를 가질 수 있는가.** '아니오'면 `totalRowsOf` 의 누적 합산(`data-source.ts:107`)이 옳고, '예'면 `'all'` 누적이 **중복 계상**된다(FS-054 의 UV 합산과 같은 종류의 오류). **전제가 계약으로 적혀 있지 않다** — 소셜 계정 연동이 붙는 순간 조용히 틀린다 | 도메인 | **A01 · A63** |
| 19 | — | — | **등급 구성이 집계가 아니라 상수 분할이다** — `tierRowsOf`(`data-source.ts:121-128`)가 기간 말 누적에 `TIER_WEIGHTS`(62/24/11/3)를 곱해 **어느 경로·어느 기간이든 비율이 같다**. 막대는 그것을 '구성비'라 부르며 그럴듯하게 그린다. **픽스처의 성질이며 BE-055-EP-02 가 실호출이 되면 해소되나, 지금 화면이 보여주는 구성비는 조회 조건과 무관한 상수다** | 이 화면(픽스처) | A63 · A11 |
| 20 | — | — | **'오늘'이 마운트 시점 고정**이라 자정을 넘겨 열어 두면 '오늘'·'최근 7일'이 어제 기준이다(`useStatsParams.ts:159-162`). **TZ 문제가 아니라 갱신 문제다**(ERP-09 는 pass — §3). 의도된 트레이드오프이나 기록한다 | 이 화면 + 통계 6화면 | A11 |
| 21 | — | — | **BE-055 §6.1 (정합)** — 심 2건과 프론트 호출 1건이 어긋난다. 등급이 클라이언트 파생이고(`data-source.ts:155-156`) `channel` 이 전송되지 않으며 비교 기간 파라미터가 심에 없다. **`cumulative` 는 기간 밖의 상태를 요구하는데**(픽스처가 `ANCHOR_DATE`/`DAILY_NET_DRIFT` 로 지어낸다 — `:36-60`) 서버 계약이 미정이다. '`build` 안쪽만 fetch 로 바꾸면 된다'(`:3-4`)는 약속이 **이 축들에 대해 성립하지 않는다** | 도메인 + 이 화면 | **A63 · A11** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.

### 6.1 이 화면의 scope 와 op

**이 화면의 scope 는 `stats-members` 다**(`data-source.ts:22` · `mock.ts:16-22` 의 `StatsScope`). **거는 op 은 `list` 하나뿐이다** — `mock.ts:52` 가 `failIfRequested(scope, 'list')` 로 고정한다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-055-EL-006 조회 실패 배너 (KPI·추이·표/막대가 통째로 대체된다. **조회 조건 바는 남는다**) |
| `detail` · `save` · `delete` | ✕ — 이 화면은 부르지 않는다 | 해당 없음 |

> ⚠ **`stats-members` 는 `members`(회원 목록)와 다른 scope 다.** `?fail=members:list` 는 이 화면에 걸리지 않고 `?fail=stats-members:list` 가 걸린다 — **두 화면이 다른 데이터를 읽는다는 사실이 재현 스위치에도 나타난다**(FS-055 §1.1).

### 6.2 재현 스위치 — **통계는 세 개를 전부 갖는다**

`mock.ts:6-11` 이 문법을 기록한다 — **통계만의 새 문법을 만들지 않고 기존 관례를 그대로 쓴다.**

```
/stats/members?delay=3000                    스켈레톤 재현 → STATE-01 확증 (mock.ts:24-27)
/stats/members?fail=list                     조회 실패 → STATE-02 확증 (shared/crud/dev.ts 문법)
/stats/members?fail=stats-members:list       이 화면만 실패 — 스코프가 갈려 있음을 확인
/stats/members?empty=all                     0행/0값 → STATE-05 3분기 확증 (mock.ts:29-34)
/stats/members?empty=stats-members           위와 동일(스코프 명시)
```

> ⚠ **`?delay=` 가 이 화면에는 있다 — FS-040 과 다른 점이다.** `mock.ts:24-27` `readDelayMs()` 가 `?delay` 로 `LATENCY_MS`(400)를 덮어쓴다. **그래서 STATE-01 의 pass 를 눈으로 확증할 수 있다.**

**조합 재현** (판정을 뒤집는 절차):

```
/stats/members?empty=all&view=tier            STATE-05 막대 분기 → '집계된 회원 등급이 없습니다'
/stats/members?empty=all&segment=kakao        STATE-05 필터 분기 → '필터에 맞는 …' + '필터 초기화'
/stats/members?delay=3000&view=tier           COMP-06 확증 — 막대 스켈레톤이 **4줄**(5줄이 아니다)
/stats/members?preset=custom&start=2026-07-16&end=2026-07-01
                                              COMP-11 · A11Y-11 확증 — 검증 에러 1회 + 본문 미렌더
/stats/members?page=3                         ⚠ §5 #1 (P0) 재현 — 250ms 뒤 URL 에서 page 가 사라진다
/stats/members?delay=3000 → '이번 달' 클릭    ⚠ §5 #2 재현 — 3초간 '최근 7일'의 누적이 '이번 달' 라벨 아래 선다
/stats/members?preset=custom&start=1900-01-01&end=2100-01-01
                                              ⚠ §5 #7 재현 — 73만 행. 화면이 멈춘다
/stats/members?segment=kakao&view=tier        ⚠ §5 #19 재현 — 경로를 바꿔도 등급 비율이 62/24/11/3 로 같다
```

⚠ **`?status=` 는 이 화면에 의미가 없다.** `mock.ts:52` 가 `failIfRequested` 만 부르고 `shared/crud/dev.ts` 의 status 재현 경로를 타지 않는다 — 그래서 **§3 EXC-06 의 gap 을 스위치로 재현할 수 없고 코드 대조로만 판정했다**(`queries.ts:47` 에 status 분기 0건).

### 6.3 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| STATE-01 (pass ⚠) | `queries.ts:40,45` · `StatsTable.tsx:174-184,199` · **`ShareBarList.tsx:109,124-126`** · `StatsPageShell.tsx:130` · **모순은 `StatsFilterBar.tsx:254` + `StatsCard.tsx:35,48`** |
| STATE-02 (pass) | `StatsPageShell.tsx:130-151` · `stats-screens.test.tsx:86-97` |
| STATE-04 (pass) | `table.ts:50-57,63-69` · `StatsTable.tsx:229` · `useStatsParams.ts:216` |
| **IA-13 (gap)** | **`StatsFilterBar.tsx:118` → `useDebouncedSearch.ts`(커밋 effect) → `useStatsParams.ts:275-280` → `:216`** · 반증 부재: `useStatsParams.test.tsx:35-45`(필터 바 없음) · `stats-screens.test.tsx`(URL 미단언) |
| A11Y-11 (pass) | `DateRangeField.tsx:44-45,94-97` · `StatsFilterBar.tsx:168,190` · `StatsTable.tsx:208-215` |
| A11Y-12 (pass) | `StatsFilterBar.tsx:85-90,133-135` · `pages/stats/**` 에 `aria-current` grep = 0 |
| IA-02 (pass) | `nav-config.ts:199,260-278,297-299` · `AppHeader.tsx:101` · `StatsPageShell.tsx:6-8` · 이 화면에 `<h1>` 0건 |
| EXC-03 (pass ⚠) | `AppShell.tsx:490-492` · `permissions/resources.ts:31,46,84,92` · `StatsPageShell.tsx:95-104,119` · `StatsFilterBar.tsx:223` · **두 잎 분리의 근거: `MemberStatsPage.tsx:5-8`** · **죽은 게이트 대조: `App.tsx:335-336`** |
| EXC-09 (pass) | `queries.ts:38` · `mock.ts:51` · `useCsvExport.ts:81,84-87` |
| ERP-04 (pass) | `StatsTable.tsx:144,157-163` · `table.ts:26-39` · `MemberStatsPage.tsx:82` |
| ERP-05 (부분) | **`StatsTable.tsx:228-233`(pageSize 미전달) · `Pagination.tsx:112,166,171-172` · `table.ts:63` vs `Pagination.tsx:41`** |
| ERP-08 (부분) | `MemberStatsPage.tsx:45-50,80-81` · `format.ts:8-10` |
| ERP-09 (pass) | `useStatsParams.ts:162` · `shared/format.ts:41-49,62-63,76-86` · `period.ts:9-13,77,97,104` |
| ERP-12 (pass) | `useCsvExport.ts:36,66-69,72` · `download.ts:16,19-22,38` · `_shared/types.ts:44-53` · `MemberStatsPage.tsx:194,238,250-261` |
| ERP-15 (gap) | `period.ts:59-65,200-206` · `data-source.ts:112-118` · `StatsTable.tsx:116` |
| §5 #6 (aria 합계) | `StatsTrendCard.tsx:49` vs `types.ts:64,114-120` |
| §5 #9 (음수 계열) | `LineAreaChart.tsx:62-75` · `MemberStatsPage.tsx:98,189` · `types.ts:105-108` |
| §5 #19 (등급 상수) | `data-source.ts:48-53,121-128` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **9건 전부**, 그리고 §1.2 에 '회원 도메인인데 개인정보 표면이 0이라 회원 목록의 판정이 성립하지 않는다'를 밝혔다
- [x] 모든 `pass` 에 코드 근거(파일:라인) · 모든 `gap` 에 재현 가능한 측정 기준
- [x] **§2.1 산수 검산 — 11 + 9 + 9 + 1 = 30 ✔**
- [x] **판정 기준일 2026-07-17 · `HEAD = 4b805ad`** 를 §1 에 명시했다
- [x] **'E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(STATE-06·COMP-03·A11Y-08·IA-03·ERP-02/07·EXC-12/14/18/19)은 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 scope(`stats-members`)와 op(`list` 하나)** 을 코드에서 확인해 적었고, **`members` scope 와 다르다는 사실** · **`?delay=`·`?empty=` 가 실재함** · **`?status=` 가 통하지 않음**을 함께 밝혔다
- [x] **STATE-01 ↔ FS-002 모순을 §2(STATE-01 행) · §4.2 · §5 #2 에 명시**하고 '유지 규칙은 컨트롤 비종속 재조회에 한한다'는 해석을 남겼다
- [x] **ERP-05 를 코드로 직접 확인**했다 — 통설과 달리 **`StatsTable` 이 `Pagination` 에 `pageSize` 를 넘기지 않아** DS 표면이 잠들어 있고 앱이 사본을 그린다(§3 · §5 #8)
- [x] NFR-054/056 과 겹치는 판정(`_shared` 계층)을 반복하되 **이 화면 고유의 근거**(누적 파생·부호 표기·등급 막대·두 잎 권한 분리·음수 계열·경로 5벌 곱)를 달았다
