---
id: NFR-056
title: "매출 통계 비기능 명세"
functionalSpec: FS-056
backendSpec: BE-056
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-056. 매출 통계 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-056 매출 통계 (`/stats/revenue`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-056(요소·예외) · BE-056(심 대조·서버 판정) · **NFR-054/NFR-055** — 세 화면이 `stats/_shared/**` 를 공유해 판정이 크게 겹친다. 겹치는 판정은 반복하되 **이 화면 고유의 근거(file:line)** 를 단다 · **NFR-002(대시보드)** — §2 STATE-01 의 모순 상대편이다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** |
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

### 1.2 이 화면의 성격 — 구조는 형제와 같고 대가가 다르다

**서버로 가는 쓰기 요청이 0건이다**(FS-056 §4.1). 폼·모달·확인 다이얼로그·낙관적 업데이트·행 선택이 전부 없다. 그래서 P0 30 중 **9건이 표면 부재로 N/A** 다 — 결함이 아니라 화면의 범위다.

**형제 화면(054·055)과 P0 판정이 한 건도 다르지 않다** — `stats/_shared/**` 를 공유하기 때문이다. **그러나 같은 판정의 대가가 다르다**: STATE-01 의 컨트롤 종속 staleness 는 여기서 **'이번 달' 라벨 아래 최근 7일 금액을 세우고 그 옆에 엑셀 버튼이 있다**(§5 #2). EXC-03 의 '프론트 권한은 보안 경계가 아니다'는 여기서 **재무 데이터 전량**에 걸린다(BE-056 §7.1). ERP-12 의 '완벽한 CSV' 는 여기서 **감사 불가능한 재무 데이터 유출 경로**다(§4.4). **P0 표는 같고 §4·§5 가 다른 것이 이 문서의 요점이다.**

**이 화면만의 표면 하나**: 부가세 고지 배너(`Alert tone="info"`) — 6개 통계 화면 중 `notice` 슬롯을 쓰는 유일한 화면이다(`StatsPageShell.tsx:71-72,123`).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족(문자) — 그러나 §5 #2 를 함께 읽어야 한다.** 네 상태가 정확히 갈린다: ① **first-load 에서만 스켈레톤** — `queries.ts:45` `isFirstLoad = query.data === undefined && query.isFetching`. 화면은 그것만 넘긴다(`RevenueStatsPage.tsx:305,314,326,345`) ② **refetch 중 이전 행 유지** — `queries.ts:40` `placeholderData: keepPreviousData` ③ **empty 는 성공·0행일 때만** — `StatsTable.tsx:187` `!loading && rows.length === 0` ④ **error 는 read 실패일 때만** — `StatsPageShell.tsx:130` 이 `error !== ''` 를 children 보다 먼저 가른다. 스켈레톤 규격도 정확하다 — 행 수 = `pageSize`, 칸 수 = **실제 컬럼 수**(축에 따라 9 또는 6 — `StatsTable.tsx:162-172` 가 `columns.map` 으로 파생). **부가세 고지는 네 상태 어디서도 사라지지 않는다** — `StatsPageShell.tsx:123` 이 `{notice}` 를 분기 **밖**에 둔다('사라지는 안내는 안내가 아니다' — `RevenueStatsPage.tsx:46-47`) | `/stats/revenue?delay=3000` → 스켈레톤만(빈 상태 문구 없음, **고지는 남는다**). `?empty=all` → Empty 만. `?fail=list` → Alert 만. 데이터가 있는 상태의 재조회가 표를 blank/스켈레톤으로 만들지 않는다. **회귀 방어선**: `stats-screens.test.tsx:82-83,115-123`(`kpi: '순매출'`) | pass ⚠ |
| STATE-02 | STATE | 직접 | 조회 실패 시 `StatsPageShell.tsx:133-148` 이 인라인 `<Alert tone="danger">` '통계를 불러오지 못했습니다.' + '다시 시도'(`onRetry` → `queries.ts:48-50`)를 렌더한다. **토스트가 아니고 빈 상태로 폴백하지 않는다**(주석 `:131-132`). **조회 조건 바와 부가세 고지가 살아남는다**(`:112-123` 이 error 분기 **위**) — 실패 상태에서도 다른 기간·수단으로 탈출할 수 있다. ⚠ **매출 화면에서 '실패 vs 0원'의 구분은 특히 중요하다**('오늘 매출이 0인가, 서버가 죽었나') — 이 화면은 그것을 정확히 가른다 | `/stats/revenue?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. **테스트가 이미 단언한다**: `stats-screens.test.tsx:86-97`(`'순매출'` 이 실패 시 **없어야** 한다 — `:96`) | pass |
| STATE-04 | STATE | 직접 | **충족(성립하는 절반).** ① **clamp**: `table.ts:50-52` `clampPage` 를 `pageSlice`(`:55`)·`rangeTextOf`(`:65`)가 쓰고 `StatsTable.tsx:196` 가 `page={Math.min(page, totalPages)}` 로 넘긴다 → total 이 줄어도 false-empty 가 없다 ② **조건 변경 시 page 되돌림**: `useStatsParams.ts:216`. **결제수단을 바꾸면 페이지가 1로 간다** — 이 화면에서는 실질 차이가 있다: 수단을 좁힌 채 '결제수단별' 축을 보면 **행이 4 → 1 로 준다**(`RevenueStatsPage.tsx:278-281`), 그때 3페이지에 남으면 false-empty 가 뜬다 ③ **선택 해제**: **표면 부재** — 행 선택이 없다(읽기 전용) | `?page=9` → 결과가 2페이지뿐이면 2페이지가 그려진다. `?view=method&page=2` 에서 `segment=card` → **행이 1개가 되는데 URL 에서 `page` 가 사라져** 1페이지가 그려진다. **테스트**: `stats.test.ts:311-334` · `useStatsParams.test.tsx:136-144` | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면과 `stats/_shared/**` 의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다 — `StatsFilterBar.tsx:33-90` · `StatsKpiRow.tsx:20-48` · `StatsTable.tsx:28-64` · `StatsTrendCard.tsx:27-35` · `StatsPageShell.tsx:24-54`. **이 화면 전용 파일에는 스타일 객체가 아예 없다** — `RevenueStatsPage.tsx` 는 `Alert`·`Card`·`CardTitle`·공용 셸만 조립한다. **primitive tier 밖 hex · `[1-9]px` 리터럴 · bare border 키워드가 0건**이다 <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `apps/admin/src/pages/stats/**` 에 hex · px 리터럴 · bare border 키워드 grep = **0**(테스트 제외). lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면 — 프리셋 버튼 7개(`StatsFilterBar.tsx:133` `tds-ui-focusable`) · **정렬 헤더 버튼 8개**(일자별 9컬럼 중 첫 칸 포함 전부 정렬 가능 — `StatsTable.tsx:137`) · DS `Button`·`SelectField` 3개·`SegmentedControl` 2개·`Pagination` — 전부 DS focus-ring 계약을 상속한다. **이 화면은 자체 `:focus-visible` 을 선언하지 않는다** | 판정은 DS 소유 문서를 따른다. 이 화면에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰 소비 표면은 DS 것뿐 — 스켈레톤 펄스(`ui.css:83-93`)와 토스트(`ToastProvider` 소유) | 판정은 tokens codegen · `ToastProvider` 소유 문서를 따른다. `animation`/`transition` grep = 0 | 종속 |
| TOKEN-04 | TOKEN | 상속 | elevation 표면 — `StatsCard` 6장(KPI 5 + 추이 1 → `Card` — `StatsCard.tsx:35`) · 드릴다운 `Card`(`RevenueStatsPage.tsx:318`) · **부가세 `Alert`**(`:49`) · 토스트 — 전부 DS 소유다. **이 화면은 `box-shadow` 를 선언하지 않는다** | 판정은 DS(`Card`·`Alert`·`Toast`) 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **표면이 실재한다 — 요구가 지목한 소비처이고, 이 화면에서 값이 가장 크다.** KPI 5장에 `value` 를 **실제로 넘기고**(`StatsKpiRow.tsx:81` `formatMetric(kpi.value, kpi.unit)`) `StatsCard.tsx:55` 가 `tds-statscard__value` 로 그리며 계약 1.1.0(`:12-14`)이 그 클래스를 `typography.display.sm` 로 못 박는다. **'순매출 1,234,000,000원' 은 이 앱에서 가장 지배적이어야 할 숫자다** — display tier 가 없으면 body 와 한 크기대에 몰려 요구의 근거 문장('대시보드는 지배적 title/숫자가 필요')이 그대로 발현한다. **page `<h1>` 쪽 절반은 이 화면에 없다** — 제목은 AppHeader 소유(`StatsPageShell.tsx:6-8`) | 판정은 tokens typography · `StatsCard` 소유 문서를 따른다 | 종속 |
| COMP-10 | COMP | N/A | **이 화면에 text-search 입력이 없다.** `searchLabel` 을 넘기지 않으므로 `SearchField` 가 렌더되지 않는다(`StatsFilterBar.tsx:209` — `/stats/keywords` 만 넘긴다: `KeywordStatsPage.tsx:254`). 나머지 필터 입력은 IME 조합이 없는 타입이다 — `SelectField` 2개(네이티브 select) · `DateRangeField` 의 `<input type="date">` 2개. ⚠ **그런데 `useDebouncedSearch` 는 인스턴스화된다**(`StatsFilterBar.tsx:118`) — 소비되지 않는 훅이 도는 것이 §5 #1(P0 gap)의 원인이다. 요구의 세 번째 절(응답 경합)은 표면과 무관하게 **구조적으로 성립한다** — 조회 조건 전체가 쿼리 키에 들어가(`RevenueStatsPage.tsx:182`) 늦게 온 응답이 **다른 키의 캐시**로 갈 뿐이다(`queries.ts:14-16`). **매출에서 last-response-wins 는 금액을 뒤바꾸므로 이 구조적 방어가 특히 값지다** | 재현할 표면 없음(IME 조합을 일으킬 입력이 0개) | N/A |
| FEEDBACK-02 | FEEDBACK | N/A | **이 화면에 파괴적/비가역 액션이 없다.** 서버 쓰기가 0건이고, CSV 내보내기는 **되돌릴 것이 없는 다운로드**다(파일을 지우면 그만이고 서버 상태가 바뀌지 않는다). ⚠ **그 파일이 재무 데이터라는 사실은 별개 문제이고 §4.4 · §5 #5 에 기록한다** — FEEDBACK-02 가 요구하는 것은 '파괴적 액션의 confirm' 이지 '민감 데이터 반출의 confirm' 이 아니다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **이 화면에 편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다(조회 조건은 즉시 URL 에 커밋되므로 '미저장'이 존재하지 않는다) | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 modal 이 없다** — `Modal`/`ConfirmDialog` 를 import 하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | **표면이 실재한다.** 이 화면은 토스트를 띄운다 — `useCsvExport.ts:75` `toast.success('N건을 내보냈습니다.')` · `:82` `toast.error(…)`. viewport 는 `ToastProvider` 소유이고 **비어 있을 때도 상시 마운트된 live region 두 벌**(`ToastProvider.tsx:165` `role="status" aria-live="polite"` · `:168` `aria-live="assertive"`)이 이미 요구를 인코딩한다(`:155-156`). ⚠ **부가세 고지는 live region 이 아니다** — `Alert tone="info"` 는 상시 렌더되는 정적 배너라 announce 대상이 아니다(옳다: 매 렌더 읽히면 소음이다) | 판정은 `ToastProvider` 소유 문서를 따른다 | 종속 |
| A11Y-02 | A11Y | N/A | **이 화면에 Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | 직접 | **표면이 실재하고 충족한다.** 폼 컨트롤 넷 — ① `SelectField#stats-compare`(`StatsFilterBar.tsx:171`, `<label htmlFor>` — `:168`) ② `SelectField#stats-segment`(결제수단 — `:193`, `<label htmlFor>` — `:190`) ③ `SelectField`(페이지당 — `StatsTable.tsx:195-197`, `<span id>` + `aria-labelledby`; 주석 `:208-209`) ④ `DateRangeField`(custom 일 때 — `:151`): **`aria-invalid` 가 항상 `aria-describedby` 와 짝으로만 나가고**(`DateRangeField.tsx:44-45`) 유효할 때는 둘 다 없으며 에러 `<p>` 가 `role="alert"` + 그 id 다(`:94-97`). **required 표면은 이 화면에 없다** — 조회 조건에 필수 입력이 없어 `required` 를 넘기지 않는다 → 요구의 required 절은 공허참. ⚠ **`FormField.withAriaRequired` 주입 메커니즘은 이 화면과 무관하다** — `FormField` 를 쓰지 않는다 | 이 화면에서 **`aria-invalid` without `aria-describedby` grep = 0**. `?preset=custom&start=2026-07-16&end=2026-07-01` → 두 date 입력에 `aria-invalid` + `aria-describedby`, 에러 `<p role="alert">`. **테스트**: `stats-screens.test.tsx:125-136`(메시지가 **정확히 한 번**) | pass |
| A11Y-12 | A11Y | 직접 | **표면이 실재하고 충족한다.** 요구의 appliesTo('좌측 필터 list item')의 실체는 `filterItemStyle` 버튼이고 **이 화면의 기간 프리셋 7개가 정확히 그것을 쓴다**(`StatsFilterBar.tsx:85-90` `presetButtonStyle` = `filterItemStyle(active)` + 폭만 되돌림). **`aria-pressed={active}` 하나로만 선택을 말한다**(`:135`) — `aria-current` 를 섞지 않는다(머리말 `:7-8`). 선택을 색상 단독으로 인코딩하지 않는다 | `apps/admin/src/pages/stats/**` 에서 `aria-current` grep = **0**(주석 1건뿐). 모든 `filterItemStyle` 버튼이 `aria-pressed`. ⚠ DS `Pagination` 의 `aria-current="page"`(`Pagination.tsx:144`)는 **페이지 번호(내비게이션)이지 toggle 필터가 아니다** — 요구가 금지한 축이 아니다 | pass |
| MOTION-01 | MOTION | N/A | **이 화면에 Modal 이 없다**(FEEDBACK-06·A11Y-02 와 같은 사유) | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | 상속 | **표면이 실재한다 — 내보내기 결과로 토스트를 띄운다**(`useCsvExport.ts:75,82`). **요구는 이제 충족돼 있다**(PR #26): `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`) + keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), enter `:26-27`/`:109-119`. **요구가 명시한 수치를 그대로 만족한다** — `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`component.overlay` recipe `tokens/tokens.json:1298-1307` · `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조로 동등 달성했다. reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 성공 토스트를 dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`·`Toast` 소유 문서를 따른다. **이 화면 코드로 결정되지 않는다** | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면에 `transition`·`animation`·`transform` 선언이 0건**이다. 소비하는 모션은 둘 — ① **스켈레톤 펄스**(`tds-ui-skeleton` — `StatsTable.tsx:168` · `StatsCard.tsx:50`): `ui.css:83-93` 이 무한 펄스를 걸고 **`:110-113` 이 `@media (prefers-reduced-motion: reduce)` 에서 `animation-name: none` 으로 끈다** — 소비하는 모션에 게이트가 실재한다 ② 토스트(`ToastProvider` 소유) | 판정은 `ui.css`·`ToastProvider` 소유 문서를 따른다. reduced-motion 을 켜고 `?delay=3000` → 스켈레톤이 펄스하지 않는다(코드 대조상 성립) | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:322` — `{ path: '/stats/revenue', element: <RevenueStatsPage />, implemented: true }`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:383-392`). **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(`StatsPageShell.tsx:24-28,109`) | `/stats/revenue` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/stats/revenue` 는 `nav-config.ts:200` 의 **잎**(`['매출 통계','/stats/revenue']`)이므로 `findCoveringLeaf`(`:260-278`)가 정확히 일치하는 잎을 찾아 `findNavLabel`(`:297-299`)이 AppHeader `<h1>`(`AppHeader.tsx:101`)에 **'매출 통계'** 를 그린다 — 가지 라벨('통계')로 폴백하지 않는다. **이 화면에 in-content `<h1>` 이 없다**(`StatsPageShell.tsx:6-8`). **`<h1>` 이 정확히 하나다** — GROUND-TRUTH 가 지적한 'h1 이중'(`FormPageShell.tsx:160`)이 여기엔 성립하지 않는다. 하위 라우트가 없어 '행위 미반영' 절도 대상이 아니다 | `/stats/revenue` 진입 → AppHeader 제목이 '매출 통계'. `document.querySelectorAll('h1').length === 1`. 셸의 403 분기(`StatsPageShell.tsx:98`)와 `ForbiddenScreen`(`ErrorScreens.tsx:109`)은 둘 다 `<h2>` 라 이 규칙을 깨지 않는다 | pass |
| IA-04 | IA | 직접 | **충족.** 템플릿이 순서대로 성립한다 — ① **toolbar row**: 좌측 필터(프리셋·날짜·비교·결제수단), **우상단 내보내기**(`StatsFilterBar.tsx:221` `spacerStyle`) ② **결과 count 요약**: `StatsTable.tsx:191-201` `rangeTextOf` ③ **SelectionBar**: 표면 부재(bulk 없음 — 읽기 전용) ④ **table**: `:131` ⑤ **Pagination**: `:228-233` — 한 페이지 초과 가능하므로 실재한다. **primary 등록 버튼이 없고 없는 것이 옳다** — 통계는 운영자가 만드는 것이 아니다(`StatsEmpty.tsx:4-6`). ⚠ **이 화면만 `notice` 슬롯이 하나 더 있다**(부가세 고지 — `StatsPageShell.tsx:123`) — 셸이 그 자리를 **조회 조건 바와 KPI 사이**로 고정하므로 화면마다 위치가 흔들리지 않는다. 6개 통계 화면이 **똑같은 순서**로 읽히도록 셸이 순서를 소유한다(`:3-4`) | `/stats/revenue` → 내보내기가 조건 바 우측, 고지가 그 아래, count 요약이 표 아래, 25건 초과 시 Pagination | pass |
| IA-05 | IA | N/A | **이 화면에 create/edit 폼이 없다** — `/stats/revenue` 는 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/stats/revenue/*` 가 0건). `:id` 로 갈릴 엔티티 폼이 존재하지 않는다(**통계에는 편집할 record 가 없다**) | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — ★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다. 이 문서가 이전 기준에서 잡은 `page` 결함이 고쳐졌다**(커밋 `6acb235` `fix(admin): 디바운스 검색의 마운트 커밋이 ?page=N 을 지우지 않게 한다 (IA-13)`). 이 화면은 요구를 **정면으로 겨냥해 설계됐다**: `useStatsParams.ts:157` 이 `useSearchParams` 를 쓰고 기간(`preset`/`start`/`end`)·비교(`compare`)·**결제수단(`segment`)**·축(`view`)·지표(`metric`)·정렬(`sort`/`dir`)·크기(`size`)·검색어(`q`)·페이지(`page`)가 **전부 URL** 이며, 기본값이면 파라미터를 지워 정규화하고(`:213-214`), 조건 변경은 `replace` 라 히스토리를 더럽히지 않는다(`:219`). 머리말(`:1-33`)이 `useListState` 를 쓰지 않은 이유까지 네 항목으로 판정해 두었다.<br>**이전 기준의 결함**: `page` 가 마운트 250ms 뒤 지워졌다 — `StatsFilterBar.tsx:118` 이 **검색 입력이 없는 이 화면에서도** `useDebouncedSearch` 를 인스턴스화하고, 그 훅은 `input=''` 로도 디바운스 타이머를 걸어 250ms 뒤 `params.setKeyword('')` 를 불렀다. `setKeyword` 는 `update({q:null})` 이고 `update` 는 `keepPage` 가 아니면 `page` 를 지운다(`:216`). **요구가 acceptanceCheck 로 못 박은 'URL을 새 탭에 복사 → 동일 필터 list 재현'이 `page` 에 대해 깨졌다.** ⚠ **매출에서 '이 조건 좀 봐주세요' 링크는 회계·정산 대화의 도구다** — 그 링크가 페이지를 잃으면 대화가 어긋난다. **그래서 이 화면에서 이 수정의 값이 특히 크다.**<br>**지금은 값이 그대로면 아무것도 하지 않는다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`(가드). 근거 주석 `:275-285` 가 이 문서의 판정을 그대로 옮겨 적었다: '그 커밋이 그대로 통과하면 update 가 page 를 지워 `?page=3` 링크로 들어온 사용자가 250ms 뒤 1페이지로 튕긴다 — **검색창이 없는 화면까지 통계 6화면 전부가 그랬다**'. **검색어가 실제로 바뀔 때만 page 를 되돌린다**(`useListState.commitKeyword` · 로그 `list-state.ts:224` 와 같은 규칙 — 세 벌이 한 규칙으로 정렬됐다).<br>**이전 기준의 '어떤 테스트도 잡지 못한다' 도 해소됐다** — `useStatsParams.test.tsx:222-259` 가 **`StatsFilterBar` 의 배선을 그대로 재현하는 하네스**(`:231` — '그 한 줄')를 세우고 `:261-290` 이 단언한다: `:266`('검색어 없이 `?page=3` 으로 들어와도 250ms 뒤 page 가 그대로다') · `:277`('검색어가 있는 채로 `?page=3` 으로 들어와도 page 가 그대로다') · `:287`('검색어가 **실제로 바뀌면** 1페이지로 되돌린다 — **가드가 과하지 않다**') | `/stats/revenue?page=3` 진입(또는 그 링크를 새 탭에 붙여넣기) → **250ms 를 기다려도 URL 과 표가 3페이지 그대로다**(이전 기준에서는 `/stats/revenue` 로 튕겼다). `?segment=card&page=3` 도 동일하게 보존된다. F5 → 동일. 조건을 바꾸면 여전히 1페이지로 돌아간다(STATE-04 — 가드가 그것을 막지 않는다) | pass |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell.tsx:484-493` 의 `<Outlet>` **바깥** ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 `App.tsx` 루트 경계가 잡는다(`:363`). 이 화면은 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx:383-385` 의 `<RequireAuth>` 가 AppShell **바깥**에서(`:378-379`), mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useStatsQuery` → `useQuery`)이 그 캐시를 통과한다. **보존할 입력이 없어 재인증 손실이 없다** — EXC-19 의 dirty draft 문제가 여기엔 없다 | 판정은 `RequireAuth`·`queryClient` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 그러나 §5 #4 를 함께 읽어야 한다.** ① **route-level read**: `AppShell.tsx:490-492` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 모든 라우트를 덮고 `route-resource.ts` 가 이 경로를 자기 잎 `page:/stats/revenue` 로 해석해 read 없는 deep-link 를 `<ForbiddenScreen/>` 으로 막는다 ② **write-action 게이팅**: **실재한다** — `export` 는 진짜 액션이고(`permissions/resources.ts:31,46`) `StatsPageShell.tsx:119` 가 `can(resourceId,'export')` 를 내려보내면 `StatsFilterBar.tsx:223` 이 **버튼을 렌더하지 않는다**(비활성이 아니라 **부재** — 셸 주석 `:11-12`). create/update/remove 컨트롤은 0개다 ③ **강등 reconcile**: 권한 스토어(Zustand)가 바뀌면 `usePermissions` 구독자가 재렌더되므로 별도 코드 없이 성립한다(`RequirePermission.tsx:24-25`). **요구의 문자를 전부 충족한다.** ⚠⚠ **그러나 이 화면에서 그 충족의 값은 다른 통계보다 작다** — `RequirePermission.tsx:8-11` 이 명문화했듯 프론트 가드는 **위조된 localStorage 로 우회되고**(권한이 `permission-store.ts` 의 localStorage 에 산다), 여기서 우회의 대가는 '방문자 수를 봤다'가 아니라 **'회사의 매출·환불·객단가 전량을 봤다'** 이다. **그리고 `export` 게이트는 실질 통제가 아니다** — 클라이언트 CSV 생성이라 서버가 막을 지점이 없다(BE-056 §7.3c②) | export 권한을 끈 역할 → 내보내기 버튼이 **사라진다**(그러나 데이터는 이미 브라우저에 있다). read 권한을 끈 역할로 deep-link → 403 화면. ⚠ 공유 `useRouteWritePermissions()`(`RequirePermission.tsx:45-52`, `canExport` 를 이미 제공)를 쓰지 않고 사본 경로를 만든다. ⚠⚠ read 게이트가 **둘**이고 하나는 죽어 있다 — §5 #4 | pass ⚠ |
| EXC-04 | EXC | N/A | **이 화면은 write 를 하지 않는다** — appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. **편집할 record 자체가 없다**(통계는 집계다). 낙관적 동시성 토큰을 실을 요청이 없다. GROUND-TRUTH 의 `createStoreAdapter` 409 경로도 무관하다 — `shared/crud` 에서 가져오는 것은 `parseFilter`·`useDebouncedSearch`·`failIfRequested`/`LATENCY_MS` 뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **이 화면에 서버로 가는 user-initiated write 가 0건**이다 — 중복 제출을 막을 submit/confirm 이 없고 멱등키를 실을 요청도 없다. ⚠ **표면이 없는데도 중복 방지가 구현돼 있다는 사실은 기록한다** — `useCsvExport.ts:52` `if (controllerRef.current !== null) return;` 이 진행 중 재클릭을 무시하고(주석이 EXC-08 을 인용 — '같은 파일이 두 번 떨어지는 것을 막는다'), UI 도 버튼을 진행률+취소로 **교체**한다(`StatsFilterBar.tsx:225-237`). 다만 그것은 서버 write 가 아니라 **파일 생성**의 중복 방지다. **요구가 지목한 '금액 mutation' 은 이 화면에 없다** — 이 화면은 금액을 **보기만** 한다 | 재현할 표면 없음(서버로 나가는 write 0건) | N/A |
| EXC-09 | EXC | 직접 | **충족 — abort 경로가 둘이고 둘 다 옳다.** ① **조회**: `useStatsQuery` 가 `queryFn: ({signal}) => fetcher(signal)`(`queries.ts:38`)로 signal 을 흘리고 `fetchRevenueStats` → `loadStats(scope, signal, …)` → `wait(readDelayMs(), signal)`(`mock.ts:51`)가 받는다. 화면 이탈 시 react-query 가 abort 하고 **취소된 쿼리는 `error` 를 세팅하지 않아** FS-056-EL-007 배너가 뜨지 않는다 ② **내보내기**: `useCsvExport.ts:81` `if (isAbort(cause)) return;` — **공유 predicate**(`shared/async.isAbort`)를 쓴다. 취소 시 error 토스트가 없고 `finally`(`:84-87`)가 `controllerRef`·`isExporting` 을 리셋해 버튼 state 가 복원된다. 주석(`:80`)이 요구의 근거 문장을 인용한다 — '취소는 실패가 아니다 — 사용자가 고른 것이다' | 조회 중(400ms 안에) 다른 메뉴로 이동 → 실패 배너·토스트가 뜨지 않는다. 긴 기간 내보내기 중 '취소' → **토스트 없이** 버튼이 복원된다. `?delay=5000` 으로 창을 넓혀 재현 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **12** | STATE-01 ⚠ · STATE-02 · STATE-04 · TOKEN-01 · A11Y-11 · A11Y-12 · IA-01 · IA-02 · IA-04 · **IA-13** · EXC-03 ⚠ · EXC-09 |
| `종속` | **9** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **9** | COMP-10 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-02 · MOTION-01 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **0** | — |
| **합계** | **30** | 12 + 9 + 9 + 0 = **30** ✔ |

> **★ 이번 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집힌 판정 1건 — IA-13 `gap` → `pass`.** 커밋 `6acb235` 가 **이 문서가 이전 기준에서 잡아낸 바로 그 결함**을 고쳤다: 디바운스 검색의 마운트 커밋이 `?page=N` 을 지우던 문제. 가드는 `useStatsParams.ts:288` `if (next === params.keyword) return;` 이고, 회귀 테스트(`useStatsParams.test.tsx:222-290`)가 **이 문서가 '어떤 테스트도 잡지 못한다' 고 지적한 공백**을 정확히 메웠다 — `StatsFilterBar` 배선을 재현하는 하네스까지 세웠다. **그 결과 이 화면의 P0 gap 은 0건이다.**
>
> **그리고 P0 표 밖에서 두 건이 더 뒤집혔다** — 둘 다 이 문서가 이관한 것이 이행된 결과다: ① **ERP-05 `부분 pass` → `pass`**(§3) — `527fc1b` 이 범위 요약·크기 선택을 DS `Pagination` 으로 수렴하고 자작 사본을 지웠다(`role="status"` announce 가 생겼다). ② **TOKEN-13 주석 오류 → 종결**(§5) — `StatsTrendCard.tsx:8-15` · `ShareBarList.tsx:7-11` 이 거짓 전제를 철회하고 참인 근거로 갈아 적었다.
>
> **P0 gap 0건 — quality-bar §How to use 기준 '배치 실패' 사유가 없다.** 이전 기준의 1건(IA-13)이 해소됐다. ⚠ **매출 화면에서 이 수정의 값이 특히 크다** — '이 조건 좀 봐주세요' 링크가 회계·정산 대화의 도구이고, 그 링크가 페이지를 잃으면 대화가 어긋났다.
> **`pass ⚠` 2건은 '충족했으나 함께 읽어야 할 것이 있다'는 뜻이다** — STATE-01 은 §5 #2(컨트롤 종속 재조회의 거짓말 — **이 화면에서 가장 위험하다**), EXC-03 은 §5 #4(죽은 이중 게이트) + §5 #5(export 게이트의 실효 부재). **둘 다 요구의 문자는 충족하므로 gap 으로 세지 않는다** — quality-bar 가 정본이고 이 문서가 요구를 다시 쓰지 않는다는 §1 의 규칙 그대로다.
> **판정표가 NFR-054·NFR-055 와 한 건도 다르지 않다** — `stats/_shared/**` 를 공유하기 때문이다. **그러나 같은 판정의 대가가 다르다**(§1.2) — 그 차이는 §4·§5 에 있다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `queries.ts:40` `placeholderData: keepPreviousData`. ⚠ `staleTime` 을 지정하지 않고 `queryClient` 기본값에 의존한다 — 요구가 '`staleTime`(30s)이 지배한다'고 하므로 그 값이 전역 기본이면 충족이다(판정은 `queryClient` 소유) | 조건 변경 시 이전 행이 새 데이터 도착까지 유지된다 | pass |
| STATE-05 | P1 | **충족.** `StatsEmpty`(`StatsEmpty.tsx:20-43`)가 DS `Empty` 의 3분기를 상속한다(`Empty.tsx:52-57`). `label="매출 기록"` → '집계된 매출 기록이 없습니다'. `hasActiveFilters` + `onResetFilters` 를 넘기므로(`RevenueStatsPage.tsx:349-350`) '필터에 맞는 …' + '필터 초기화' 분기가 뜬다. **생성 CTA 가 없는 것이 옳다**(`createVerb='집계'` — `StatsEmpty.tsx:4-8`). `hasActiveFilters` 산정도 정확하다 — view/metric 은 '보는 각도'라 세지 않는다(`useStatsParams.ts:178-184`) | `?empty=all` → '집계된 매출 기록이 없습니다'(CTA 없음). `?empty=all&segment=card` → '필터에 맞는 …' + '필터 초기화' | pass |
| STATE-06 | P1 | **N/A(표면 부재)** — write 가 없어 invalidate 할 것이 없다. ⚠ **다른 화면(주문·환불 처리)의 write 가 이 화면을 stale 하게 만드는 경로도 없다** — 쿼리 키 `['stats','revenue',…]` 를 아무도 무효화하지 않는다. **매출은 마감이 있는 지표라 즉시성이 요구되지 않을 수 있으나 그 판단이 코드에 없다**(BE-056 §7.6 #11) | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **N/A(표면 부재)** — 검색 입력이 없다(§2 COMP-10). `type="search"` grep = 0 | 재현할 표면 없음 | N/A |
| COMP-06 | P1 | **충족(P2이나 기록).** 스켈레톤 행 수 = `pageSize`, 칸 수 = **실제 컬럼 수**(`StatsTable.tsx:164-171` 이 `columns.map` 으로 파생) — **축에 따라 9 또는 6 으로 자동으로 바뀐다.** 주석(`:175`)이 요구를 인용한다 | `?delay=3000` → 스켈레톤 행 25 × 칸 **9**. `?delay=3000&view=method` → 칸 **6**. `length: 5` grep = 0 | pass |
| COMP-11 | P1 | **충족 — 이 화면이 요구의 모범 사례다.** ① **preset** 6종(`period.ts:134-166`) ② **`start ≤ end` 강제 + 인라인 검증**: `periodErrorOf`(`:200-206`)가 '종료일은 시작일보다 빠를 수 없습니다.' 를 **조용한 empty 대신** 입력 옆에 낸다. 그리고 **본문을 그리지 않는다**(`StatsPageShell.tsx:130`) — **매출 화면에서 조용한 empty 는 '매출 0원'으로 읽힌다** ③ **ko-KR 포맷**: `formatPeriodLabel`(`period.ts:216-220`) ④ **keyboard**: 네이티브 `<input type="date">` ⑤ **URL 반영**: `preset`/`start`/`end`(`useStatsParams.ts:225-243`). **말일 보정까지 있다**(`period.ts:103-105`, 테스트 `stats.test.ts:72`) — **매출은 월 단위 마감이라 이것이 특히 중요하다**('지난 달'이 1/31 에도 12월 전체를 낸다) | `?preset=custom&start=2026-07-16&end=2026-07-01` → **검증 에러 정확히 1회**, 본문 미렌더(`stats-screens.test.tsx:125-136`). '지난 달' 클릭 → 그 달 전체 | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. 이 화면의 Tab 정지점은 프리셋 7 + select 3 + 세그먼트 2 + **정렬 헤더 8** + 페이지 번호 + 버튼 — **정렬 헤더가 6화면 중 가장 많다** | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 이동 + announce 는 `AppShell` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **N/A(표면 부재)** — 표에 row-nav 가 없다(`StatsTable.tsx:173-180` 에 `onClick`/`rowNavProps` 가 없다). **주문 상세로 내려갈 경로가 이 화면에 없다**(FS-056 §7 #19) — 목적지가 존재하지 않으므로 'row 내 keyboard 등가물'을 둘 대상이 없다. ⚠ **그 부재가 옳은지는 미정이다** — '이 날 매출이 왜 튀었나'는 매출 화면의 자연스러운 다음 질문이고 답이 없다(§4.3) | 재현할 표면 없음 | N/A |
| A11Y-09 | P1 | 이 화면이 쓰는 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(sticky `<th>` `StatsTable.tsx:35` · 조건 라벨 `StatsFilterBar.tsx:68-74`) · `surface-default` 위 `text-muted`(범위 요약 `:203` · 힌트 `StatsKpiRow.tsx:42-48`) · `feedback-success-text`/`feedback-danger-text`(증감 `DeltaText.tsx:19-23`) · **`feedback-info-surface` 위 텍스트**(부가세 고지 — `RevenueStatsPage.tsx:49`) · `chart-label`/`chart-axis`(`LineAreaChart.tsx:166,173`) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다 — **특히 고지는 읽혀야 하는 문구다**(§4.4) | 종속 |
| A11Y-16 | P1 | **부분 미충족 — 차트가 걸린다.** **옳게 된 축**: 정렬 헤더가 `aria-sort` 를 `<th>` 에 두고 방향 표식은 `aria-hidden` + 숨김 문구(`StatsTable.tsx:132,145-150`) · 숨긴 `<caption>`(`:132`) · `aria-busy`(`:131`) · `SegmentedControl` 이 `role=radiogroup` + 로빙 tabindex + 좌우 화살표(`SegmentedControl.tsx:65-95`) · 프리셋 `aria-pressed` · 증감이 **색·글리프·문장 3중 인코딩**(`DeltaText.tsx:47-55`) · **'환불합계'의 색 반전**(`isLowerBetter` — `RevenueStatsPage.tsx:220`) · Empty 가 `role="status"`(`Empty.tsx:104`) · 진행률이 `role="status"`(`StatsFilterBar.tsx:230`) · **부가세 고지가 정적 `Alert` 라 매 렌더 announce 되지 않는다**(옳다 — 소음이 아니다). **미충족**: **차트에 데이터 표 대체가 없다** — `role="img"` + `aria-label` 이 **합계·최고만** 요약하고(`StatsTrendCard.tsx:49-57`) 일자별 금액이 닿지 않으며 비교 계열 값은 aria-label 에 **아예 없다**(`:52`). ⚠⚠ **'객단가' 지표에서는 그 요약이 아예 틀렸다** — §5 #6 | 스크린리더로 추이 카드 → '매출 추이 … 합계 X원, 최고 Y원' 까지만. 색각 이상 → 두 계열이 **면적 vs 선** 으로 갈린다(색 단독 아님 ✓) | **gap** |
| IA-03 | P1 | **N/A** — top-level leaf 다(`nav-config.ts:200`). non-top-level route 가 아니므로 breadcrumb 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족 — 이 화면이 가장 넓다.** ① **wide table 가로 스크롤**: 충족 — `StatsTable.tsx:28-32,118` 의 `overflowX:'auto'` 래퍼. **일자별 9컬럼이 6화면 중 가장 넓어 이 래퍼가 가장 자주 발동한다**. NFR-040 이 `CrudTable` 에 없다고 지적한 바로 그 래퍼가 여기엔 있다 ② **반응형 접힘**: 충족 — KPI 5장이 `auto-fit minmax` 로 1열까지(`StatsKpiRow.tsx:20-24`), 조건 바 wrap(`StatsFilterBar.tsx:45-50`), 푸터 wrap(`StatsTable.tsx:55-62`), 고지 `Alert` 는 블록이라 접힘 무관 ③ **sticky identity 열**: **미충족** — 첫 컬럼('일자')의 가로 sticky 가 없다. **9컬럼을 가로로 밀면 어느 날의 금액인지 잃는다 — 금액 표에서 그것은 치명적이다** ④ **최소 지원 폭 선언 없음** ⑤ **touch-target 미검증** — 정렬 헤더 버튼(`:45-56` `padding: 0`) | 768px·375px → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다(코드 대조상 성립). 가로 스크롤 시 '일자' 열이 함께 밀려 나간다 | 부분 pass — §5 |
| ERP-02 | P1 | **N/A(대상 아님)** — `CrudTable` 을 쓰지 않는다. `shared/ui` 의 `tableStyle`/`thStyle`/`tdStyle` 을 재사용하므로(`StatsTable.tsx:14-21`) density 토큰이 도입되면 자동으로 따라온다. ⚠ **9컬럼 금액 표는 compact density 의 1순위 후보다** | 재현할 표면 없음(판정은 `shared/ui` 소유) | N/A |
| ERP-03 | P1 | **부분 충족.** sticky `<thead>` 가 **있다** — `StatsTable.tsx:35-40`(주석이 요구를 인용). **NFR-040 이 gap 으로 판정한 축이 여기선 충족이다.** **미충족**: `zIndex: 1` 이 **토큰이 아니라 리터럴** · on-scroll elevation 토큰 없음 · SelectionBar 는 표면 부재 | 100건/페이지로 세로 스크롤 → 헤더가 붙어 있다. `zIndex: 1` 리터럴 1건 | 부분 pass — §5 |
| ERP-04 | P1 | **충족.** clickable header(`StatsTable.tsx:135-151`) · **`aria-sort` 를 `<th>` 가 갖는다**(`:144`) · ▲▼↕ 는 `aria-hidden` + 숨김 문구 · keyboard(네이티브 `<button>`) · **numeric 우측 정렬 + tabular-nums**(`:125-126` `numericCellStyle` — **일자별 9컬럼 중 8개**가 `align:'right'`). 정렬은 **안정 정렬** + `localeCompare('ko-KR')`(`table.ts:26-39`). ⚠ **결제수단별 축의 첫 칸은 의도적으로 정렬 불가다** — `sortValue` 를 주지 않았고 근거가 코드에 있다(`RevenueStatsPage.tsx:148-149`): '네 줄뿐이라 정렬할 것이 없고, **비중이 큰 순서(신용카드→간편결제→계좌이체→가상계좌)가 곧 관리자가 기대하는 순서다.** 금액으로 줄 세우려면 금액 칸을 누른다' — **의도된 부재이고 근거가 적혀 있다** | 정렬 헤더 클릭 → `aria-sort` 가 `descending`, 재클릭 → `ascending`. `?view=method` → '결제수단' 헤더는 버튼이 아니고 금액 5칸은 버튼이다. **테스트**: `stats.test.ts:269-309` | pass |
| ERP-05 | P1 | **충족 — 이전 기준의 '부분 pass' 가 해소됐다.** **★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다 — 커밋 `527fc1b` `refactor(admin): ERP-05 범위 요약을 DS 로 수렴하고 자작 2벌을 지운다`.** 이전 기준에서 이 화면은 범위 요약과 크기 선택을 **자기가 그렸고**, `Pagination` 에 `page`·`totalPages`·`label`·`onChange` 만 넘겨 **DS 의 opt-in 스위치를 끈 채**(`Pagination.tsx:112` `showRange = pageSize > 0` → false) 사본을 세웠다. **지금은 DS 가 그린다** — `StatsTable.tsx:195-204` 이 `page`·`totalPages`·**`total={rows.length}`**·**`pageSize`**·**`pageSizeOptions={PAGE_SIZE_OPTIONS}`**·`label`·`onChange`·**`onPageSizeChange`** 를 전부 넘긴다. 따라서 `showRange`(`Pagination.tsx:112`)와 `showSizeSelect`(`:113`)가 **둘 다 true** 가 되고 `:171-172` 의 **`<p className="tds-pagination-bar__summary" role="status">{rangeTextOf(total, page, pageSize)}</p>`** 와 `:177-194` 의 크기 선택기가 렌더된다. **요구의 세 절이 전부 DS 표면에서 충족된다**: ① total-range ② page-size selector ③ range math 의 경계 단언(`rangeTextOf` `Pagination.tsx:41-47` — 마지막 페이지 잘림 `:46` · 범위 밖 page clamp `:43-45`, 근거 주석 `:36-39`).<br>**그리고 사본이 지워졌다** — `table.ts:58-60` 이 그 이력을 남긴다: '[ERP-05] 범위 요약문(전체 1,234건 중 26–50)은 여기 있었다. DS Pagination 이 pageSize 를 받으면 **같은 것을 그리고(수식이 동치다) 경계 단언까지 갖고 있으므로**, 사본을 지우고 그쪽을 쓴다'. `StatsTable.tsx:191-194` 도 같다 — '**같은 것을 두 벌 그리면 수식이 갈라진다**(실제로 로그 쪽 사본은 clamp 가 없어 범위 밖 page 에서 *전체 3건 중 81–80* 같은 헛것을 그렸다). **page 의 clamp 도 DS 가 한다** — 여기서 `Math.min` 을 다시 걸 필요가 없다'. **이전 기준이 지적한 `rangeTextOf` 두 벌이 한 벌로 수렴했다.**<br>⚠ **형제 섹션은 아직이다** — 로그 4화면은 여전히 자기 `SummaryText` 를 그리고 `Pagination` 에 `pageSize` 를 넘기지 않는다(NFR-060 §3 ERP-05). **즉 이 수렴은 통계 섹션에서만 일어났다.** | `/stats/revenue` → 표 아래에 **`.tds-pagination-bar`** 가 렌더된다: 범위 요약 `<p role="status">전체 N건 중 x–y</p>` + '페이지당' 크기 선택 + 번호 줄. **페이지를 넘기면 `role="status"` 가 새 범위를 announce 한다.** `StatsTable.tsx` 에 `rangeTextOf` grep = 0 · `SelectField` grep = 0(사본이 없다). 판정의 나머지는 DS `Pagination` 소유 문서를 따른다 | pass |
| ERP-06 | P1 | **충족.** 존댓말 일관 · 날짜/숫자/금액이 헬퍼 경유(`formatNumber`(shared) · `formatWonValue`·`formatMetric`·`withUnitSuffix`(stats format.ts) · `formatDayLabel`·`formatPeriodLabel`(period.ts)) · empty/error 문구가 템플릿. **FS-040 이 gap 이던 '두 뷰의 날짜 표기가 다르다'가 여기엔 없다** — 표·차트축·범위 요약이 전부 `formatDayLabel`(`period.ts:211-213`) 한 벌이다. **힌트 문구가 지표 정의를 말해 준다**('결제합계에서 환불합계를 뺀 금액입니다.' — `RevenueStatsPage.tsx:229`) — `types.ts:10-12` 가 경고한 '매출이 두 값으로 보고된다'를 화면에서 막는 장치다. ⚠ **부가세 고지의 톤은 의도적으로 딱딱하다**('사용하실 수 없습니다') — 친근한 존댓말 표준과 어긋나 보이나 **법적 고지라 그것이 옳다** | 축을 바꿔도 날짜 표기가 `2026.07.16` 로 같다 | pass |
| ERP-07 | P1 | **충족 — 이 화면이 요구의 유일한 소비처이자 모범 사례다.** 요구의 appliesTo 는 '**우측 정렬 금액 컬럼의 `formatWon` caller**' 이고, **6개 통계 화면 중 금액 컬럼을 가진 것은 이 화면뿐이다**(주문 통계 제외 — 이 문서 범위 밖). ① **단위가 숫자에서 분리됐다**: `formatWonValue`(`format.ts:36-38`)가 **숫자만** 낸다(`'1,234,000'`) ② **단위는 컬럼 헤더가 이름표로 갖는다**: `withUnitSuffix('결제합계','won')` → `'결제합계 (원)'`(`format.ts:20-33` · `RevenueStatsPage.tsx:66,73,80,97`) ③ **자릿수가 정렬된다**: `numericCellStyle`(tabular-nums + 우측 정렬 — `StatsTable.tsx:114`). **근거가 코드 두 곳에 적혀 있다** — `RevenueStatsPage.tsx:9-11` 과 `format.ts:12-14`: '우측 정렬 금액에 단위를 붙이면 **단위가 마지막 자릿수를 따라다녀 tabular-nums 세로 정렬이 깨진다**'. ⚠ **KPI 카드는 반대로 단위를 붙인다**(`formatMetric` → `'1,234,000원'` — `format.ts:54-68`) — **모순이 아니라 자리가 다르다**: 카드에는 헤더가 없어 단위를 붙일 곳이 값뿐이다. **'결제건수' 헤더에는 단위를 안 붙인다**('결제건수 (건)'은 이름표가 두 번 — `RevenueStatsPage.tsx:87`) | 다행 금액 컬럼을 시각 확인 → 자릿수가 세로로 정렬된다. `formatWon` grep = 0(이 화면은 `formatWonValue` 를 쓴다 — 숫자만 내는 별개 함수) | pass |
| ERP-08 | P1 | **부분 충족.** 숫자가 전부 헬퍼 경유 — `formatNumber`(shared, 결제건수 — `RevenueStatsPage.tsx:91`) · `formatWonValue`(금액 5컬럼) · `formatMetric`(KPI). **셀에 raw `toString()`/`String()` 이 0건**(FS-040 이 gap 이던 축). 상대시간 없음(통계는 절대 날짜). **미충족(경계 사안)**: `format.ts:8-10` 이 스스로 보고하듯 **금액(원)·비율(%)·체류시간·증감이 `shared/format` 이 아니라 이 섹션에 산다** — '앱 공통에 `formatWon` 은 존재하지 않고, 존재하는 유일한 구현은 `pages/sales/_shared/business.ts` 라서 가져올 수 없다 — 페이지 간 import 는 A83 축1 blocker 다'. **즉 이 앱에는 금액 포매터가 두 벌이다**(sales · stats) — 요구의 '중앙화가 drift 를 막는다'가 **정확히 그 반대 상황**이다 | 표 셀에 `String(`/`toString()` grep = 0. 단 `formatWonValue` 가 `pages/stats/_shared/format.ts` 에, `formatWon` 이 `pages/sales/_shared/business.ts` 에 **따로** 있다 | 부분 pass — §5 |
| ERP-09 | P2 | **충족 — 이 화면은 수렴의 수혜자다.** '오늘'이 `useStatsParams.ts:162` `formatDate(new Date())` 이고 그 `formatDate` 는 `shared/format.ts:62-63` 의 **`DISPLAY_TIME_ZONE = 'Asia/Seoul'` 고정 `Intl.DateTimeFormat`**(`:76-86`)이다. 달력 산술 앵커는 **UTC 정오**(`period.ts:77` `NOON_HOUR_UTC` · `:97,104`)이고 `period.ts:9-13` 이 수렴을 기록한다 — 이 파일의 사본은 **UTC 자정** 앵커였고 정본은 정오이며 '둘은 UTC 앵커라 동치이며 출력은 한 글자도 바뀌지 않는다'. `shared/format.ts:41-49` 가 판정 근거를 남긴다(1970–2100 × 29,224 조합 대조 · 정오가 **더 안전한 불변식**). **`pages/reservations/_shared/calendar.ts` 가 browser-local 로 남아 NFR-040 이 gap 인 것과 정반대다.** ⚠ **남는 것은 TZ 가 아니라 갱신과 마감이다** — `today` 가 마운트 시 고정이라(`:159-162`) 자정을 넘기면 '오늘'이 어제 기준이고, **매출에는 마감이 있는데 화면이 그것을 모른다**(BE-056 §7.6 #11 — '오늘 매출'은 진행 중이면 계속 자라는데 화면은 확정된 수처럼 보인다) | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 진입 → **한국 기준 '오늘'과 같은 날짜**가 잡힌다(러너 TZ 를 타지 않는다). **테스트**: `shared/format.test.ts:90,117` · `stats.test.ts:36-47` | pass |
| ERP-10 | P2 | **N/A(표면 부재)** — 이 화면에 문서/PDF(A4) 출력이 없다. ⚠ **그러나 요구의 근거('견적서/거래명세서는 핵심 산출물')와 이 화면이 만나는 지점이 있다** — 요구는 '기존 biz-no·won formatter 를 재사용'하라 하는데, **금액 포매터가 이미 두 벌이다**(§3 ERP-08). print 템플릿이 어느 쪽을 쓸지가 미정이다 | 재현할 표면 없음(print/PDF 0건) | N/A |
| ERP-12 | P1 | **충족 — 요구의 문자를 전부 지킨다. 그리고 §4.4 를 함께 읽어야 한다.** ① **현재 필터된 결과 집합 전체**(가시 page 만이 아님): `RevenueStatsPage.tsx:300-303` 이 `rows`(= **페이지 자르기 전**)를 넘긴다. `useCsvExport.ts:36` 의 타입 주석이 강제한다 ② **한국어 헤더**: `StatsColumn.header` 그대로(`useCsvExport.ts:72`) — **`withUnitSuffix` 덕에 CSV 헤더에도 '(원)'이 붙는다**(엑셀에서 단위를 잃지 않는다) ③ **값은 표시대로**: `StatsColumn.csv` 가 `render` 와 **같은 원천**을 쓰도록 타입이 묶는다(`_shared/types.ts:44-53`) ④ **UTF-8 BOM**: `download.ts:16,38` ⑤ **progress + cancel**: `useCsvExport.ts:21,66-69` ⑥ **scope label**: '엑셀 내보내기 (N건)'(`StatsFilterBar.tsx:246`) + '내보내기는 현재 조건 전체를 담습니다.'(`:253-255`). **파일명이 축을 반영한다**(`stats-revenue-daily` / `stats-revenue-method` — `:302`). RFC 4180 이스케이프(`download.ts:19-22`). **⚠ 그러나 이 완벽한 CSV 가 §4.4 의 문제다** — 재무 데이터 전량이 **감사 없이·고지 없이** 나간다 | 조건을 좁히고 내보내기 → 엑셀에서 한글이 깨지지 않고 **현재 조건 전체**가 헤더 단위와 함께 들어 있다 | pass |
| ERP-13 | P1 | **충족.** 조사를 주입하는 자리는 **빈 상태 하나**이고 `Empty.tsx:16-27`(`hasBatchim`/`subjectParticle`)이 받침을 보고 고른다 — '집계된 매출 기록**이** 없습니다'. `StatsEmpty.tsx:8` 이 `createVerb='집계'` 로 동사까지 고친다. 나머지는 고정 문구다(부가세 고지 포함). **리터럴 '이(가)/을(를)/은(는)' grep = 0** | `?empty=all` → '집계된 매출 기록이 없습니다'. `pages/stats/**` 에 리터럴 조사 grep = 0 | pass |
| ERP-15 | P1 | **부분 미충족.** ① **가로 스크롤**: 충족(§3 IA-14) ② **행 임계값 cap / virtualization**: **없다** — `pageSize` 상한 100 × **9컬럼 = 900 셀**이 DOM 에 그려진다(6화면 중 가장 많다). 실사용에서 일자별 행은 기간 일수(프리셋 최대 31)라 문제가 없다 ③ ⚠ **URL 로 기간 상한을 뚫으면 화면이 멈춘다** — `?preset=custom&start=1900-01-01&end=2100-01-01` → `eachDay`(`period.ts:59-65`)가 **73,000 날짜**를 만들고 **`dailyOf`(`data-source.ts:117-123`)가 그것을 수단 4벌로 만든 뒤 `totalRowsOf` 가 5벌째를 더한다 — 비교 기간까지 두 벌이면 73만 행**이다. **정렬이 매 렌더 전량을 돈다**(`StatsTable.tsx:104` — `useMemo` 가 **없다**). 기간 상한 검증이 `periodErrorOf`(`period.ts:200-206`)에 없다 — 순서와 형식만 본다 | `?preset=custom&start=1900-01-01&end=2100-01-01` → 프레임 드랍/무응답. 25행 페이지에서도 **정렬 대상은 전량**이다 | **gap** |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 이 화면의 조회도 상한이 없다 | 응답하지 않는 백엔드를 붙이면 **영원히 스켈레톤**이다. 지금은 `LATENCY_MS=400` 픽스처에 가려 보이지 않는다 | gap |
| EXC-06 | P1 | **미충족.** `queries.ts:46-47` 이 `query.isError` 하나로 한 문구를 만든다 — 400/401/403/429/500/504 가 전부 같다. 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 훅이 읽지 않는다. **400 의 `error.fields` 도 버려진다** · **429 의 `Retry-After` 도 소비하지 않는다**. ⚠ **매출이 안 보이면 운영자는 즉시 에스컬레이션하는데** '권한이 빠졌나 서버가 죽었나'조차 화면이 말하지 않는다(BE-056 §7.5) | `?fail=list` 만으로는 status 를 못 가른다. 코드 대조: `queries.ts:47` 에 status 분기 0건 | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 | 오프라인 전환 시 배너가 없다 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf 단일 뷰). 404 를 구분할 대상 id 가 없다. 기간에 데이터가 0건이면 **200 + 빈 배열**이고 화면은 Empty 로 그린다 — 404 가 아니다(BE-056 §5) | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk 작업·다중 선택이 없다(읽기 전용). ⚠ 요구의 취지 중 '장기 작업의 determinate progress + cancel' 에 해당하는 표면은 **내보내기에 실재하고 충족한다**(§3 ERP-12) | 재현할 표면 없음 | N/A |
| EXC-19 | P1 | **N/A** — dirty 폼 state 가 없어 session-expiry 시 잃을 draft 가 없다(§2 EXC-02) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **부분 충족.** **후반('never-leak')은 충족** — `queries.ts:46-47` 이 원문 에러를 노출하지 않는다(주석이 EXC-20 을 인용). **매출 화면에서 서버 내부를 흘리는 것은 특히 나쁘므로 이것이 값지다.** **전반('복사 가능한 error reference')은 미충족** — `traceId` 를 표시하지 않는다. BE-056 §2 봉투는 `traceId` 를 **필수로** 싣는데 화면이 버린다 | `?fail=list` → 배너에 복사 가능한 코드 **없음**. **'매출이 안 나와요' 티켓에 붙일 것이 없다** | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 조회 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** `?delay=` 로 덮어쓸 수 있다(`mock.ts:24-27`). 실제 예산은 BE-056-EP-01 의 응답 크기가 정해지면 A63 이 확정한다 |
| **재조회 횟수** | **조회 조건이 바뀔 때만 1회** | 쿼리 키 = `['stats','revenue', period, comparePeriod, compare]`(`RevenueStatsPage.tsx:182`) | **이 화면의 강점이다** — **결제수단·드릴다운 축·추이 지표·정렬·페이지·크기 전환이 요청을 0건** 만든다. 응답 한 벌에 3벌 × 5수단이 다 있기 때문이다(`types.ts:70-72`). 심대로 쪼개면 이 성질을 잃고 **두 조회의 불일치 위험까지 생긴다**(BE-056 §5 EP-02) |
| **응답 크기** | **수단 5벌 × 비교 2벌 = 10배** | `RevenueByMethod`(`types.ts:73`) | ⚠ **무재조회의 대가다.** 7일 조회면 7 × 5 × 2 = 70행이라 무해하나 **기간에 비례해 10배로 자란다** |
| DOM 규모 | **표 셀 ≤ `pageSize` × 9 = 900** + KPI 5 + 차트 1 | 페이지가 자른다(`table.ts:54-57`) | **6화면 중 가장 많다**(컬럼 9개). 실사용 상한: 기간 일수(프리셋 최대 31) × 9 = 279 셀 |
| **CPU — 정렬** | **O(N log N) × 매 렌더 — 위험** | `StatsTable.tsx:104` `sortRows(rows, …)` 가 **`useMemo` 없이** 매 렌더 전량을 정렬 | 실사용(≤31행)에서는 무해. **URL 로 기간을 뚫으면 73,000행을 매 렌더 정렬한다**(§3 ERP-15) |
| **CPU — 픽스처 생성** | 조회마다 O(기간일수 × **4수단** × 비교 2벌) | `dailyOf`(`data-source.ts:117-123`) → `methodRowsOf` × 4 + `totalRowsOf` + `methodTotalsOf` | 시드 난수라 결정론적(`mock.ts:56-60`) — 새로고침해도 같은 값. **금액 화면에서 그것이 특히 중요하다**: `Math.random` 이면 새로고침마다 매출이 바뀌어 **스크린샷·VRT·눈으로 하는 회귀가 전부 무의미**해진다 |
| 차트 x축 | 라벨 = 기간 일수 | `StatsTrendCard.tsx:89` | 30일이면 라벨 30개가 겹친다 — 솎아내기가 없다(`LineAreaChart.tsx:216-231`) |
| **CSV 생성** | **200행마다 이벤트 루프 양보** | `useCsvExport.ts:21,66-69` | ✔ **1,000행 × 9열도 메인 스레드를 막지 않고 진행률이 실제로 갱신된다** |
| 메모리 | 응답 3벌 × 5수단 상주 | `types.ts:75-82` | 기간이 길수록 10배로 자란다 |
| 번들 | **이 화면 전용 의존 0** | 차트 라이브러리 미도입 — `LineAreaChart` 가 SVG 를 직접 계산(`LineAreaChart.tsx:3-5`) | 대가는 §3 A11Y-16 의 gap 이다 |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02) — **조회 조건 바와 부가세 고지가 살아남는다**. 단 status 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤 — 행=`pageSize`·칸=**실제 컬럼 수(9 또는 6)**(§2 STATE-01) |
| 집계 0원 | 빈 상태 | ✔ 3분기 Empty + 필터 초기화(§3 STATE-05). **최초 로드·실패와 구별된다** — **매출 화면에서 '0원 vs 실패' 의 혼동은 특히 나쁜데** 이 화면은 셋을 정확히 가른다 |
| **컨트롤 종속 재조회(기간 토글)** | **이전 값 무효화** | ✖ **이전 기간의 금액이 새 기간 라벨 아래 남고, 그 옆에 엑셀 버튼이 있다**(§5 #2) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 스켈레톤(§3 EXC-05) |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **보존할 입력이 없어 손실 없음**(§2 EXC-02) |
| 화면 이탈 중 진행 조회 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ `isAbort` + 버튼 복원(§2 EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| 주문/환불 처리 후 | ? | △ **이 화면이 갱신되지 않는다** — 쿼리 키를 아무도 무효화하지 않는다(§3 STATE-06). 마감이 있는 지표라 옳을 수 있으나 **판단이 코드에 없다** |
| **URL 로 기간 상한 뚫기** | 거절 또는 cap | ✖ **화면이 멈춘다 — 73만 행**(§3 ERP-15 · §5 #7) |
| **`?page=3` 링크 공유** | 3페이지 재현 | ✖ **250ms 뒤 1페이지로 튄다**(§5 #1 — P0) |

### 4.3 이 화면이 답하지 못하는 운영 질문

quality-bar 의 축이 아니지만 화면의 목적(FS-056 §1)에 비추어 기록한다 — **§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '**이 날 매출이 왜 튀었나**' | 불가 — 주문 상세로 내려갈 경로가 없다(§3 A11Y-08). **매출 화면의 가장 자연스러운 다음 질문에 답이 없다** |
| '**어느 상품이 팔렸나**' | 불가 — 상품별/카테고리별 축이 없다 |
| '**왜 환불했나**' | 불가 — 환불합계만 있고 사유별 분해가 없다. '환불이 늘었다'는 보이는데 **무엇을 할지는 알 수 없다** |
| '정산은 얼마인가' | 불가 — PG 수수료·정산 축이 없다. **결제합계 ≠ 입금액**인데 화면이 그 차이를 말하지 않는다 |
| '**과세 매출이 정말 이건가**' | **아니다** — 과세/면세/영세가 **클라이언트 상수 비율**(12%/3%)로 만들어진다(BE-056 §7.4 · `data-source.ts:39-41`). 어느 날이든 같은 비율이다. **부가세 고지가 이 화면을 방어하지만 고지는 CSV 에 따라가지 않는다**(§4.4) |
| '**결제수단별 과세 구분은**' | 불가 — `TAX_COLUMNS` 가 일자별에만 있다(FS-056 §7 #8). **데이터는 행에 있는데 화면과 CSV 가 감춘다** |
| '이 조건 좀 봐주세요(3페이지)' | **불가** — `page` 가 250ms 뒤 사라진다(§5 #1). **매출에서 링크 공유는 회계·정산 대화의 도구다** |
| '일자별 금액을 스크린리더로 읽고 싶다' | 차트로는 불가(§3 A11Y-16). 아래 표에는 있으나 연결돼 있지 않다 |
| '한 달·한 분기를 보고 싶다' | 프리셋으로는 '이번 달/지난 달'까지. 직접 입력은 가능하나 **상한이 없어 위험하다**(§3 ERP-15) |

### 4.4 데이터 보존 · 감사 — **이 문서에서 가장 중요한 절이다**

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 보존·복구할 상태가 없다 |
| 개인정보 열람 | **없다.** 개별 주문·고객이 없다(FS-056 §7 #19). **FS-040(달력이 고객 이름을 렌더)과 정반대다** |
| **영업비밀 열람** | ⚠ **전량이다.** 화면과 CSV 가 **결제합계·환불합계·순매출·결제건수·객단가·과세 구분**을 담는다 — **회사의 재무 데이터 전부**다. **개인정보만이 보호 대상은 아니다**: 매출·객단가는 영업비밀이고 유출 손해가 개인정보와 다른 방식으로 크다. 형제 화면(방문자·회원)에서 '집계뿐이라 실피해가 없다'로 끝난 판정이 **여기서는 끝나지 않는다**(BE-056 §7.3b) |
| **내보내기 감사** | ⚠ **원리적으로 불가능하다.** CSV 가 **클라이언트에서** 생성되므로(`useCsvExport.ts:59-76` → `download.ts:36-49`) **서버에 '누가 언제 무엇을 내보냈는가'가 남지 않는다.** 서버 로그에는 `GET /api/stats/revenue` 한 줄만 있고, **그 운영자가 화면만 봤는지 전 기간 매출을 엑셀로 떨어뜨려 나갔는지 구별할 수 없다**(BE-056 §7.3c①) |
| **`export` 권한의 실효** | ⚠ **통제가 아닌데 통제처럼 보인다.** 버튼은 권한으로 사라지지만(`StatsFilterBar.tsx:223`) **데이터는 read 만으로 이미 브라우저에 있고 클라이언트 생성이라 서버가 막을 지점이 없다.** 그런데 권한 화면은 read 와 export 를 **따로 켜게 해 놓았다**(`permissions/resources.ts:31,46`) — **관리자가 '이 역할은 매출을 볼 수는 있지만 내려받을 수는 없다'고 믿게 만든다. 그 믿음은 틀렸다**(BE-056 §7.3c②) |
| **고지가 파일에 따라가지 않는다** | ⚠ 화면의 상주 Alert 는 '**국세청 신고 등 제출용 자료로는 사용하실 수 없습니다**'(`RevenueStatsPage.tsx:52-53`) 라 말하는데, `toCsvText`(`download.ts:31-33`)는 **헤더 + 행만 쓴다.** 파일명도 그 사실을 말하지 않는다. **화면을 떠난 숫자는 경고 없이 돌아다니고, 그 숫자가 신고에 옮겨 적히는 것이 정확히 고지가 막으려던 사고다**(BE-056 §7.3c③) |
| **과세 구분이 지어낸 수다** | ⚠ `TAX_FREE_SHARE = 0.12` · `ZERO_RATED_SHARE = 0.03` 을 곱해 만든다(`data-source.ts:39-41,55-59`). **세무 판정이 심 없이 프론트 상수에 있고, 그 수가 '과세 (원)' 이라는 이름을 달고 CSV 로 나간다**(BE-056 §7.4) |
| 권한 통제(read) | ⚠ **프론트 가드는 보안 경계가 아니다** — 위조된 localStorage 로 우회되고(`RequirePermission.tsx:8-11`) **여기서 우회의 대가는 재무 데이터 전량이다**(BE-056 §7.1). 실제 차단은 전적으로 서버의 몫이다 |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| ~~1~~ | ~~IA-13~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `6acb235` `fix(admin): 디바운스 검색의 마운트 커밋이 ?page=N 을 지우지 않게 한다 (IA-13)`).** 이전 기준에서 이것은 **이 화면의 유일한 P0 gap** 이자 실재 결함이었다 — `StatsFilterBar.tsx:118` 이 검색 입력 없는 화면에서도 `useDebouncedSearch` 를 걸고, 그 훅의 **마운트 직후 커밋**(`input=''`)이 `setKeyword('')` → `update({q:null})` → `page` 삭제(`useStatsParams.ts:216`)로 이어져 **`?page=3` 링크가 250ms 뒤 1페이지로 튕겼다**(통계 6화면 전부). **가드가 들어갔다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`, 근거 주석 `:275-285` 가 이 문서의 판정을 그대로 옮겨 적었다('**검색창이 없는 화면까지 통계 6화면 전부가 그랬다**'). **이 문서가 지적한 테스트 공백도 메워졌다** — `useStatsParams.test.tsx:222-259` 가 `StatsFilterBar` 배선을 재현하는 하네스를 세우고 `:261-290` 이 세 경우를 단언한다(page 보존 2건 + '가드가 과하지 않다' 1건). **같은 결함이 로그 섹션에도 있었고 함께 고쳐졌다**(`list-state.ts:224` — NFR-060 §2 IA-13). 세 벌(`useListState`·통계·로그)이 한 규칙으로 정렬됐다 | 이 화면 + **통계 6화면 공통**(`_shared`) | **종결** |
| 2 | **STATE-01** | **P0(모순)** | **⚠ STATE-01 ↔ FS-002 모순이 이 화면에서 정면으로 발현하고, 여기서 가장 위험하다.** `queries.ts:40`(`keepPreviousData`) + `:45`(`isFirstLoad`)는 STATE-01 의 '재조회 중 이전 행 유지'를 **문자 그대로** 지킨다 — 그래서 §2 판정은 pass 다. **그러나 이 화면의 재조회는 대부분 컨트롤 종속이다**: 기간 프리셋을 누르면 `params.period` 가 URL 에서 즉시 바뀌어 **조회 범위 문구(`StatsFilterBar.tsx:254`)는 새 기간을 말하는데**, 새 요청이 도는 동안 KPI·차트·표는 `keepPreviousData` 가 붙든 **이전 기간의 금액**을 계속 보인다. `isFirstLoad` 가 false 라 스켈레톤도 **`aria-busy` 도 없다**(`StatsCard.tsx:35` `busy={loading}`). **이 화면에서 가장 위험한 이유**: 그 숫자는 **돈**이고 **바로 옆에 엑셀 내보내기 버튼이 있다.** '이번 달'을 누르고 곧바로 내보내면 **`stats-revenue-daily-…csv` 에 최근 7일 금액이 담긴다** — `exportCount` 도 `rows.length` 라 옛 데이터의 것이고(`RevenueStatsPage.tsx:300`) 버튼은 활성이며 **어떤 경고도 없다.** 그 파일에는 고지도 따라가지 않는다(§4.4). **FS-002(대시보드)는 컨트롤 종속 조회에 스켈레톤을 요구하고 e2e 가 `aria-busy` 를 단언하는데 STATE-01 은 유지를 요구한다 — 두 요구가 같은 `loading` 축에서 반대 방향을 가리킨다.** **판정: 명세가 옳다** — 월을 눌렀는데 일 차트가 남으면 그 차트는 거짓말이다. 따라서 **STATE-01 의 유지 규칙은 '컨트롤 비종속 재조회'(staleTime 만료·백그라운드 갱신)에 한한다**는 해석을 남긴다. **해소 경로**: `useStatsQuery` 가 `isPlaceholderData` 를 함께 내면 호출부가 '컨트롤 종속 = 무효화'를 표현할 수 있고, **내보내기 버튼도 그동안 비활성이어야 한다** — **다만 `StatsCard` 로는 표현할 수 없다**(#3) | 이 화면 + 통계 6화면 + 대시보드 | **A11 · A01 (해석 확정) · A41** |
| 3 | — | — | **`StatsCard` 가 `loading` 하나로 두 가지를 한다 — 앱층에서 해소 불가(#2 의 선행 조건).** `StatsCard.tsx:35` 의 `<Card busy={loading}>`(=`aria-busy`)와 `:48` 의 `{loading ? <스켈레톤> : 본문}` 이 **같은 prop** 에 묶여 있다. `busy`(본문 유지 + 재조회 중)와 스켈레톤(본문 대체)을 가를 방법이 없어 앱이 '컨트롤 종속 재조회 중'을 표현할 수 없다. `TodoCard.tsx:37,43` · `ListCard.tsx:40,46` 도 같다. **이관 대상은 `packages/ui` 의 계약 분리이지 이 화면이 아니다** | `packages/ui` | **A41 / DS (선행 · 차단 사안)** |
| 4 | — | — | **403 게이트가 둘이고 하나는 죽어 있다**(§2 EXC-03 ⚠). `StatsPageShell.tsx:95-104` 가 `can(page:/stats/revenue,'read')` 로 자기 403 을 그리는데 `AppShell.tsx:490-492` 가 **같은 리소스·같은 액션**을 먼저 막는다 → 실앱에서 **도달 불가**. 게다가 UI 가 갈린다 — 공유 `ForbiddenScreen`(`ErrorScreens.tsx:103-119`)은 `role="alert"` + '대시보드로' 버튼을 갖는데 통계 것은 **둘 다 없다**. **설정 섹션은 이미 수렴했다**(`App.tsx:335-336`) — 통계만 남았다. 아울러 export 판정이 공유 `useRouteWritePermissions()`(`canExport` 를 이미 제공)를 쓰지 않고 사본 경로를 만든다 | 이 화면 + 통계 6화면 | **A41 · A11** |
| 5 | — | — | **⚠ 재무 데이터 CSV 가 감사·권한 강제·고지 첨부를 전부 우회한다**(§4.4 · BE-056 §7.3). ① 서버에 '누가 매출 전량을 내려받았는가'가 **남지 않는다**(클라이언트 생성) ② **`export` 권한이 실질 통제가 아닌데 권한 화면은 통제인 것처럼 보인다** — 관리자가 '볼 수는 있지만 내려받을 수는 없다'고 믿게 만들고 그 믿음은 틀렸다 ③ **'제출용으로 쓸 수 없다'는 고지가 파일에 따라가지 않는다**(`download.ts:31-33` 이 헤더+행만 쓴다). **셋 다 서버가 파일을 만들 때에만 해소된다** — 심이 없으므로 BE-056 은 엔드포인트를 정의하지 않았다 | 이 화면 + 앱 전역 | **A63 · A41 · A01 (보안)** |
| 6 | A11Y-16 | P1 | **⚠ 실재 결함 — 차트 `aria-label` 의 '합계'가 '객단가' 지표에서 뜻이 없다.** `StatsTrendCard.tsx:53` 가 지표를 가리지 않고 `trend.current.reduce((sum,v)=>sum+v,0)` 를 '합계'라 부른다. 그런데 이 화면의 추이 지표 다섯 중 **'객단가'는 더하면 안 되는 값**이다 — `types.ts:107-116` 이 '날짜별 객단가를 단순 평균하면 결제가 1건뿐인 날이 100건인 날과 같은 무게를 가져 **값이 조용히 틀어진다**'고 규약하고 `averageOrderValue` 가 그것을 지키는데, **차트 `aria-label` 은 평균이 아니라 더하기까지 한다**('합계 294,000원' — 날짜별 객단가 7개의 합). 화면의 KPI 는 옳게 낸다(`RevenueStatsPage.tsx:243`). **눈으로 보는 사용자에게는 안 보이고 스크린리더 사용자에게만 틀린 금액이 간다.** 더해서: 데이터 표 대체 없음 · 비교 계열 값이 aria-label 에 없음 | 이 화면 + 통계 6화면 | **A11 (실재 결함)** |
| 7 | ERP-15 | P1 | **URL 로 기간 상한을 뚫으면 화면이 멈춘다.** `?preset=custom&start=1900-01-01&end=2100-01-01` → 73,000일 × **수단 4벌 + 합성 1벌** × **비교 2벌 = 73만 행** + x축 라벨 73,000 + **`useMemo` 없는 매 렌더 전량 정렬**(`StatsTable.tsx:104`). `periodErrorOf`(`period.ts:200-206`)에 범위 상한 검증이 없다. **서버가 붙으면 서버 부하로 바뀐다**(BE-056 §7.6 #13) | 이 화면 + 통계 6화면 | **A11 · A63** |
| ~~8~~ | ~~ERP-05~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `527fc1b`).** 이전 기준에서 DS `Pagination` 의 범위·크기 표면이 꺼진 채 섹션이 같은 것을 손으로 그렸다(`pageSize` 미전달 → `Pagination.tsx:112` `showRange` false → `role="status"` 범위 요약 부재 · `rangeTextOf` 두 벌). **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘겨 DS 가 그린다** — `Pagination.tsx:171-172` 의 `role="status"` 범위 요약 + `:177-194` 크기 선택기. **자작 사본은 지워졌다**(`table.ts:58-60` · `StatsTable.tsx:191-194` 가 그 이력과 이유를 남긴다 — '같은 것을 두 벌 그리면 수식이 갈라진다'). `rangeTextOf` 가 한 벌로 수렴했다. ⚠ **로그 4화면은 아직 사본이다**(NFR-060 §3 ERP-05) — 이 수렴은 통계 섹션에서만 일어났다 | 이 화면 + `_shared` | **종결** |
| 9 | — | — | **⚠ '순매출' 계열의 음수가 차트 밖으로 나간다.** `netRevenue = paymentTotal - refundTotal`(`data-source.ts:54`)은 **음수가 될 수 있다** — 환불이 결제를 넘는 날(대량 취소·전월 주문의 이달 환불)이 실무에 존재한다. 그런데 `LineAreaChart.tsx:62-67` `buildScale` 은 **`maxValue` 만** 보고 눈금을 `[0 … top]` 로 만들고 `:69-75` `toPoints` 는 `value < 0` 에서 **플롯 영역 아래로 삐져나간다**. baseline 이 0 임을 알리는 선도 없다. 과세 구분도 함께 음수가 된다(`:55-59`). **픽스처의 환불은 결제의 3~11% 대역이라(`:89-90`) 순매출이 항상 양수여서 드러나지 않는다** | 이 화면 + `packages/ui` | **A11 · A41** |
| 10 | ERP-03 / IA-14 | P1 | sticky `<thead>` 는 있으나(`StatsTable.tsx:35-40`) **`zIndex: 1` 이 토큰이 아니라 리터럴**이고 on-scroll elevation 이 없다. **identity 열('일자')의 가로 sticky 가 없어 9컬럼을 가로로 밀면 어느 날의 금액인지 잃는다 — 금액 표에서 그것은 치명적이다.** 최소 지원 폭 선언 없음 · 정렬 헤더 버튼의 touch-target 미검증 | 이 화면 + 앱 전역 | A11 |
| 11 | ERP-08 | P1 | **금액 포매터가 앱에 두 벌이다** — `formatWonValue`(`pages/stats/_shared/format.ts:36-38`)와 `formatWon`(`pages/sales/_shared/business.ts`). `format.ts:8-10` 이 그 blocker 를 스스로 보고한다(페이지 간 import 는 A83 축1). **요구의 '중앙화가 drift 를 막는다'가 정확히 반대 상황**이다 — 넷(금액·비율·체류시간·증감)이 `shared/format` 으로 올라가야 한다. ✔ 셀의 raw `toString()` 은 0건이므로 요구의 핵심은 충족 | 이 화면 + `shared/format` | **A41 · A11** |
| 12 | EXC-06 / EXC-20 | P1 | 조회 실패가 status 를 보지 않고(`queries.ts:47` — 400/401/403/429/500/504 한 문구) **참조 코드(`traceId`)도 없다**. **'매출이 안 나와요' 티켓에 붙일 것이 없고 '권한이 빠졌나 서버가 죽었나'조차 전화로 물어야 한다**(BE-056 §7.5). 400 의 `fields` 미매핑 · 429 의 `Retry-After` 미소비 | 이 화면 + 앱 전역 | A11 · A41 |
| 13 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — 서버가 침묵하면 **영원히 스켈레톤**이다. `AbortSignal.timeout` 앱 전체 0건 | 앱 전역 | A40 · A41 |
| 14 | EXC-11 | P1 | 오프라인 감지 없음(`navigator.onLine` 0건) | 앱 전역 | A40 |
| 15 | — | — | **`StatsKpiRow`·`StatsTrendCard` 의 `error` 경로가 죽어 있다** — `StatsPageShell.tsx:130-151` 이 error 면 children 을 렌더하지 않으므로 `RevenueStatsPage.tsx:305,315` 의 `error={query.error}` 는 언제나 `''` 다. `StatsKpiRow.tsx:81` 의 error 분기와 `StatsCard.tsx:44-47` 의 `role="alert"` 오류 문단이 **도달 불가** | 이 화면 + 통계 6화면 | A11 |
| 16 | — | — | **⚠ 금액 반올림이 검산을 깨뜨린다**(BE-056 §7.6 #9) — `formatWonValue`(`format.ts:36-38`)가 `Math.round` 한다. 객단가는 나눗셈에서 오므로(`aovOf` — `types.ts:98-101`) **표의 `객단가 × 결제건수` 가 `순매출` 과 1원 단위로 어긋난다.** 표시의 문제이나 **이 화면의 숫자는 관리자가 검산하는 돈이다** — 검산이 안 맞으면 신뢰가 깨진다. 정본이 명시하지 않았다 | 이 화면 | A01 · A11 |
| ~~17~~ | — | — | **✔ 해소됨(기준 `a5c2639`).** 이전 기준에서 `ShareBarList.tsx:7-11` 는 '구분 가능한 계열 색이 2개뿐이다(chart.series-1/2)' 라 적고 `StatsTrendCard.tsx:8-15` 은 '`chart.series-3..6` 이 tokens.json 에 필요하다(TOKEN-13)' 라 적었으나 **`tokens/tokens.json:778-897` 에 `chart.series-1..6`(+fill+dark) 이 전부 있었고**(`packages/ui/generated/tokens/tokens.css:138-145`) `LineAreaChart.tsx:29-44` 는 이미 6계열을 순환 참조했다 — **없는 제약을 근거로 설계를 정당화한 것**이었다. **두 주석이 전부 고쳐졌다**: `StatsTrendCard.tsx:8-15`('[계열 색 — **해결됨**, 이 카드가 2계열인 건 이제 색 때문이 아니다] … 즉 **색 제약은 없다**' + 참인 근거 — '이 카드가 답하는 질문이 *한 지표를 두 기간에 걸쳐 견주면 어떤가* 이기 때문' `:11-14`, '다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — **막던 것은 사라졌다**' `:15`) · `ShareBarList.tsx:7-11`('**⚠ 예전 이 자리엔 … 그 전제는 지금 거짓이다** … **색이 모자라서 단색을 고른 게 아니라, 이 데이터에는 단색 길이 비교가 맞아서** 고른 것이다'). **결정(2계열 차트 · 단색 구성비 막대)은 유지되고 근거만 참인 것으로 교체됐다** — 이 문서가 요구한 '주석 정정 또는 결정 재검토' 가 둘 다 일어났다 | `_shared` | **종결** |
| 18 | — | — | **BE-056 §7.4 / §7.6 #8 (도메인)** — **과세 구분이 클라이언트 상수 비율이다**(`TAX_FREE_SHARE = 0.12` · `ZERO_RATED_SHARE = 0.03` — `data-source.ts:39-41`). **세무 판정이 심 없이 프론트에 있고 그 수가 '과세 (원)' 이라는 이름을 달고 CSV 로 나간다.** 면세·영세는 상품 속성에서 나와야 하고 어느 날은 0일 수 있다 — 지금은 **어느 날이든 12%/3%** 다 | **A63 · A01 (도메인 결정)** |
| 19 | — | — | **BE-056 §7.6 #11 · #12 (도메인)** — ① **마감이 계약에 없다**: 그 날의 결제가 언제 확정되는가(자정? 정산일?). `useStatsParams.ts:162` 의 '오늘'은 브라우저 시계라 **'오늘 매출'은 진행 중이면 계속 자라는데 화면은 확정된 수처럼 보인다** ② **환불의 귀속 규칙이 없다**: 6월 주문의 7월 환불은 어느 달인가. **부가세 고지가 '세무 신고가 요구하는 귀속 기준과 다르다'고 말하는 것이 정확히 이 지점인데 그 규칙이 어디에도 없다** | **A01 · A63 (도메인 결정)** |
| 20 | — | — | **결제수단별 축에서 과세 구분이 사라진다**(FS-056 §7 #8) — `TAX_COLUMNS` 를 `dailyColumns` 에만 넣었다(`RevenueStatsPage.tsx:143,156`). **그런데 `methodTotalsOf`(`data-source.ts:126-137`)가 `rowOf` 를 부르므로 수단별 행에도 값이 존재한다** — 데이터는 있는데 화면과 CSV 가 감춘다. 근거('수단별로는 세 구분이 갈리지 않는다' — `:105`)는 **픽스처의 성질이지 도메인의 성질이 아닐 수 있다**(실제로 카드는 면세 상품 비중이 다를 수 있다) | 이 화면 · 도메인 | A11 · A01 |
| 21 | — | — | **'오늘'이 마운트 시점 고정**이라 자정을 넘겨 열어 두면 '오늘'·'최근 7일'이 어제 기준이다(`useStatsParams.ts:159-162`). **TZ 문제가 아니라 갱신 문제다**(ERP-09 는 pass — §3). ⚠ **매출은 마감이 있는 지표라 이 문제가 더 크다** — #19 와 함께 읽어야 한다 | 이 화면 + 통계 6화면 | A11 |
| 22 | — | — | **BE-056 §6.1 (정합)** — 심 2건과 프론트 호출 1건이 어긋난다. 수단별 합계가 클라이언트 재집계이고(`data-source.ts:153`) `method` 가 전송되지 않으며 비교 기간 파라미터가 심에 없고 **과세 구분은 심 자체가 없다**. **EP-02 를 만들면 두 조회가 어긋나 일자별 합계와 수단별 합계가 다른 값을 말할 수 있다** — 만들지 않는 선택지를 먼저 검토해야 한다(BE-056 §7.6 #3) | 도메인 + 이 화면 | **A63 · A11** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.

### 6.1 이 화면의 scope 와 op

**이 화면의 scope 는 `stats-revenue` 다**(`data-source.ts:18` · `mock.ts:16-22` 의 `StatsScope`). **거는 op 은 `list` 하나뿐이다** — `mock.ts:52` 가 `failIfRequested(scope, 'list')` 로 고정한다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-056-EL-007 조회 실패 배너 (KPI·추이·표가 통째로 대체된다. **조회 조건 바와 부가세 고지는 남는다**) |
| `detail` · `save` · `delete` | ✕ — 이 화면은 부르지 않는다 | 해당 없음 |

### 6.2 재현 스위치 — **통계는 세 개를 전부 갖는다**

`mock.ts:6-11` 이 문법을 기록한다 — **통계만의 새 문법을 만들지 않고 기존 관례를 그대로 쓴다.**

```
/stats/revenue?delay=3000                    스켈레톤 재현 → STATE-01 확증 (mock.ts:24-27)
/stats/revenue?fail=list                     조회 실패 → STATE-02 확증 (shared/crud/dev.ts 문법)
/stats/revenue?fail=stats-revenue:list       이 화면만 실패 — 스코프가 갈려 있음을 확인
/stats/revenue?empty=all                     0행/0원 → STATE-05 3분기 확증 (mock.ts:29-34)
/stats/revenue?empty=stats-revenue           위와 동일(스코프 명시)
```

> ⚠ **`?delay=` 가 이 화면에는 있다 — FS-040 과 다른 점이다.** `mock.ts:24-27` `readDelayMs()` 가 `?delay` 로 `LATENCY_MS`(400)를 덮어쓴다. **그래서 STATE-01 의 pass 를 눈으로 확증할 수 있다.**

**조합 재현** (판정을 뒤집는 절차):

```
/stats/revenue?empty=all                      STATE-05 — '집계된 매출 기록이 없습니다'(0원과 실패가 구별된다)
/stats/revenue?empty=all&segment=card         STATE-05 필터 분기 → '필터에 맞는 …' + '필터 초기화'
/stats/revenue?delay=3000&view=method         COMP-06 확증 — 스켈레톤 칸이 **6개**(일자별은 9개)
/stats/revenue?preset=custom&start=2026-07-16&end=2026-07-01
                                              COMP-11 · A11Y-11 확증 — 검증 에러 1회 + 본문 미렌더
                                              (부가세 고지는 남는다 — StatsPageShell.tsx:123)
/stats/revenue?view=method&segment=card       세그먼트가 표를 한 줄로 좁힌다 (RevenueStatsPage.tsx:278-281)
/stats/revenue?page=3                         ⚠ §5 #1 (P0) 재현 — 250ms 뒤 URL 에서 page 가 사라진다
/stats/revenue?delay=3000 → '이번 달' 클릭 → 곧바로 내보내기
                                              ⚠⚠ §5 #2 재현 — '이번 달' 라벨 아래 최근 7일 금액이 서고,
                                                 그 금액이 stats-revenue-daily-….csv 로 나간다
/stats/revenue?preset=custom&start=1900-01-01&end=2100-01-01
                                              ⚠ §5 #7 재현 — 73만 행. 화면이 멈춘다
```

⚠ **`?status=` 는 이 화면에 의미가 없다.** `mock.ts:52` 가 `failIfRequested` 만 부르고 `shared/crud/dev.ts` 의 status 재현 경로를 타지 않는다 — 그래서 **§3 EXC-06 의 gap 을 스위치로 재현할 수 없고 코드 대조로만 판정했다**(`queries.ts:47` 에 status 분기 0건).

### 6.3 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| STATE-01 (pass ⚠) | `queries.ts:40,45` · `StatsTable.tsx:162-172,187` · `StatsPageShell.tsx:123,130` · **모순은 `StatsFilterBar.tsx:254` + `StatsCard.tsx:35,48` + `RevenueStatsPage.tsx:300`(exportCount)** |
| STATE-02 (pass) | `StatsPageShell.tsx:130-151` · `stats-screens.test.tsx:86-97` |
| STATE-04 (pass) | `table.ts:50-57,63-69` · `StatsTable.tsx:196` · `useStatsParams.ts:216` · `RevenueStatsPage.tsx:278-281` |
| **IA-13 (gap)** | **`StatsFilterBar.tsx:118` → `useDebouncedSearch.ts`(커밋 effect) → `useStatsParams.ts:286-292` → `:216`** · 반증 부재: `useStatsParams.test.tsx:35-45`(필터 바 없음) · `stats-screens.test.tsx`(URL 미단언) |
| A11Y-11 (pass) | `DateRangeField.tsx:44-45,94-97` · `StatsFilterBar.tsx:168,190` · `StatsTable.tsx:191-197` |
| A11Y-12 (pass) | `StatsFilterBar.tsx:85-90,133-135` · `pages/stats/**` 에 `aria-current` grep = 0 |
| IA-02 (pass) | `nav-config.ts:200,260-278,297-299` · `AppHeader.tsx:101` · `StatsPageShell.tsx:6-8` · 이 화면에 `<h1>` 0건 |
| EXC-03 (pass ⚠) | `AppShell.tsx:490-492` · `permissions/resources.ts:31,46` · `StatsPageShell.tsx:95-104,119` · `StatsFilterBar.tsx:223` · **실효 부재: `useCsvExport.ts:59-76` + `download.ts:36-49`** · **죽은 게이트 대조: `App.tsx:335-336`** |
| EXC-09 (pass) | `queries.ts:38` · `mock.ts:51` · `useCsvExport.ts:81,84-87` |
| **ERP-07 (pass — 유일 소비처)** | **`format.ts:12-14,20-38` · `RevenueStatsPage.tsx:9-11,66,80,97` · `StatsTable.tsx:114`(`numericCellStyle`)** |
| ~~ERP-05~~ — **해소 확증** | `StatsTable.tsx:195-204`(**`total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 전달**) → `Pagination.tsx:112-113`(`showRange`·`showSizeSelect` true) → `:171-172`(`role="status"` 범위) · `:177-194`(크기 선택). 사본 제거 이력 `table.ts:58-60` · `StatsTable.tsx:191-194` |
| ERP-08 (부분) | `format.ts:8-10` · `pages/sales/_shared/business.ts`(`formatWon` — 두 번째 구현) |
| ERP-09 (pass) | `useStatsParams.ts:162` · `shared/format.ts:41-49,62-63,76-86` · `period.ts:9-13,77,97,104` |
| ERP-12 (pass) | `useCsvExport.ts:36,66-69,72` · `download.ts:16,19-22,38` · `_shared/types.ts:44-53` · `RevenueStatsPage.tsx:300-303` |
| ERP-15 (gap) | `period.ts:59-65,200-206` · `data-source.ts:117-123` · `StatsTable.tsx:104` |
| §4.4 (감사·고지) | **`useCsvExport.ts:59-76` · `download.ts:31-33`(고지 미첨부) · `RevenueStatsPage.tsx:48-54`(고지) · `permissions/resources.ts:31,46`** |
| §5 #6 (aria 합계) | `StatsTrendCard.tsx:53` vs `types.ts:107-116` · `RevenueStatsPage.tsx:243,272` |
| §5 #9 (음수 계열) | `LineAreaChart.tsx:62-75` · `data-source.ts:54,89-90` |
| §5 #18 (과세 구분) | `data-source.ts:39-41,55-59` · `RevenueStatsPage.tsx:106-131` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **9건 전부**, 그리고 §1.2 에 '형제 화면과 판정표가 같고 대가가 다르다'를 밝혔다
- [x] 모든 `pass` 에 코드 근거(파일:라인) · 모든 `gap` 에 재현 가능한 측정 기준
- [x] **§2.1 산수 검산 — 11 + 9 + 9 + 1 = 30 ✔**
- [x] **판정 기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] **'E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(STATE-06·COMP-03·A11Y-08·IA-03·ERP-02/10·EXC-12/14/18/19)은 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 scope(`stats-revenue`)와 op(`list` 하나)** 을 코드에서 확인해 적었고, **`?delay=`·`?empty=` 가 실재함**(FS-040 과 다른 점) · **`?status=` 가 통하지 않음**을 함께 밝혔다
- [x] **STATE-01 ↔ FS-002 모순을 §2(STATE-01 행) · §4.2 · §5 #2 에 명시**하고 '유지 규칙은 컨트롤 비종속 재조회에 한한다'는 해석을 남겼다. **이 화면에서 그 모순이 CSV 로 새어 나간다는 사실**을 §5 #2 · §6.2 에 기록했다
- [x] **ERP-05 를 코드로 직접 확인**했다 — **기준 `a5c2639` 에서 뒤집혔다.** 이전 기준에서는 `StatsTable` 이 `Pagination` 에 `pageSize` 를 넘기지 않아 DS 표면이 잠들어 있고 섹션이 사본을 그렸다. **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘기고**(`527fc1b`) 사본은 지워졌다(`table.ts:58-60` 이 이력을 남긴다). `Pagination.tsx:112-113,171-172,177-194` 를 직접 읽어 `showRange`/`showSizeSelect` 가 켜짐을 확인했다
- [x] **ERP-07 을 이 화면이 유일하게 소비한다는 사실**을 확인하고 pass 근거를 §3 에 달았다(`formatWonValue` 가 숫자만 · `withUnitSuffix` 가 헤더에 단위)
- [x] **CSV 의 개인정보 노출을 정직하게 판정했다** — 개인정보는 **없으나** 영업비밀 전량이고, **감사·권한 강제·고지 첨부가 전부 클라이언트 생성 때문에 불가능**하다(§4.4). 형제 문서(NFR-054/055)와 **구조는 같고 결론이 다르다**
- [x] NFR-054/055 와 겹치는 판정(`_shared` 계층)을 반복하되 **이 화면 고유의 근거**(부가세 고지·금액 단위 분리·9컬럼·과세 구분·음수 순매출·객단가 파생·재무 CSV)를 달았다
