---
id: NFR-054
title: "방문자 통계 비기능 명세"
functionalSpec: FS-054
backendSpec: BE-054
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-054. 방문자 통계 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-054 방문자 통계 (`/stats/visitors`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-054(요소·예외) · BE-054(심 대조·서버 판정) · **NFR-055/NFR-056** — 세 화면이 `stats/_shared/**` 를 공유해 판정이 크게 겹친다. 겹치는 판정은 반복하되 **이 화면 고유의 근거(file:line)** 를 단다 · **NFR-002(대시보드)** — §2 STATE-01 의 모순 상대편이다 |
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

### 1.2 이 화면의 성격 — 읽기 전용 분석 뷰

**서버로 가는 쓰기 요청이 0건이다**(FS-054 §4.1). 폼·모달·확인 다이얼로그·낙관적 업데이트·행 선택이 전부 없다. 그래서 P0 30 중 **9건이 표면 부재로 N/A** 다 — 결함이 아니라 화면의 범위다.

그러나 **FS-040(예약 달력)과 달리 이 화면은 '읽기 전용이라 아무것도 없는' 화면이 아니다**: 조회 조건 바(프리셋·날짜 범위·세그먼트)가 있어 A11Y-11·A11Y-12 표면이 실재하고, CSV 내보내기가 토스트를 띄워 A11Y-01·MOTION-02 표면이 실재하며, 표·페이지네이션이 있어 IA-04·STATE-04 가 성립한다. **N/A 를 '문제 없음'으로 읽어서는 안 된다** — 이 화면에 **없는 것이 문제인 축**은 gap 또는 §3 에 남겼다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **충족(문자) — 그러나 §5 #2 를 함께 읽어야 한다.** 네 상태가 정확히 갈린다: ① **first-load 에서만 스켈레톤** — `queries.ts:45` `isFirstLoad = query.data === undefined && query.isFetching` (FS-040 이 gap 인 `isFetching` 직결과 정반대다). 화면은 그것만 넘긴다(`VisitorStatsPage.tsx:255,264,295`) ② **refetch 중 이전 행 유지** — `queries.ts:40` `placeholderData: keepPreviousData` ③ **empty 는 성공·0행일 때만** — `StatsTable.tsx:187` `!loading && rows.length === 0` ④ **error 는 read 실패일 때만** — `StatsPageShell.tsx:130` 이 `error !== ''` 를 children 보다 먼저 가른다. 스켈레톤 자체도 규격이다 — 행 수 = `pageSize`, 칸 수 = 실제 컬럼 수(`StatsTable.tsx:162-172`) | `/stats/visitors?delay=3000` → 스켈레톤만(빈 상태 문구 없음). `?empty=all` → Empty 만. `?fail=list` → Alert 만. 데이터가 있는 상태의 재조회가 표를 blank/스켈레톤으로 만들지 않는다. **회귀 방어선**: `stats-screens.test.tsx:82-83,115-123`(빈 것과 실패한 것은 다르다) | pass ⚠ |
| STATE-02 | STATE | 직접 | 조회 실패 시 `StatsPageShell.tsx:133-148` 이 인라인 `<Alert tone="danger">` '통계를 불러오지 못했습니다.' + '다시 시도'(`onRetry` → `queries.ts:48-50` `query.refetch()`)를 렌더한다. **토스트가 아니고 빈 상태로 폴백하지 않는다.** 주석(`:131-132`)이 그 이유를 명시한다 — '토스트는 사라지고 나면 빈 화면만 남아 할 일을 잃는다'. **FS-040 과 달리 조회 조건 바가 살아남는다**(`:112-121` 이 error 분기 **위**에 있다) — 실패 상태에서도 다른 기간으로 탈출할 수 있다 | `/stats/visitors?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. **테스트가 이미 단언한다**: `stats-screens.test.tsx:86-97` | pass |
| STATE-04 | STATE | 직접 | **충족(성립하는 절반).** ① **clamp**: `table.ts:50-52` `clampPage` 를 `pageSlice`(`:55`)·`rangeTextOf`(`:65`)가 쓰고 `StatsTable.tsx:196` 가 `page={Math.min(page, totalPages)}` 로 DS 에 넘긴다 → total 이 줄어 범위를 벗어나도 마지막 유효 페이지를 그린다(false-empty 없음). ② **조건 변경 시 page 되돌림**: `useStatsParams.ts:216` `if (options?.keepPage !== true) next.delete('page')` — 3페이지에서 조건을 좁혀도 1페이지로 간다. ③ **선택 해제**: **표면 부재** — 이 화면에 행 선택이 없다(읽기 전용이라 bulk 대상이 없다). 요구의 두 절 중 성립하는 절은 충족하고 나머지는 대상이 없다 | `?page=9` 로 진입 → 결과가 2페이지뿐이면 2페이지가 그려진다(빈 표가 아니다). `?page=3` 에서 세그먼트 변경 → URL 에서 `page` 가 사라진다. **테스트**: `stats.test.ts:311-334`(clamp 경계) · `useStatsParams.test.tsx:136-144` | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면과 `stats/_shared/**` 의 모든 스타일 객체가 `var(--tds-*)` 만 참조한다 — `StatsFilterBar.tsx:33-90` · `StatsKpiRow.tsx:20-48` · `StatsTable.tsx:28-64` · `StatsTrendCard.tsx:27-35` · `StatsPageShell.tsx:24-54`. **primitive tier 밖 hex · `[1-9]px` 리터럴 · `(outline\|border): (thin\|medium\|thick)` 이 0건**이다 <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `apps/admin/src/pages/stats/**` 에 hex · px 리터럴 · bare border 키워드 grep = **0**(테스트 제외). lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 프리셋 버튼 7개(`StatsFilterBar.tsx:133` `className="tds-ui-focusable"`) · 정렬 헤더 버튼 8개(`StatsTable.tsx:137`) · DS `Button`(다시 시도·내보내기·취소) · DS `SelectField` 3개 · DS `SegmentedControl` 2개 · DS `Pagination` 버튼 — 이 전부가 DS 의 focus-ring 계약을 상속한다. **이 화면은 자체 `:focus-visible` 규칙을 선언하지 않는다** | 판정은 DS(`packages/ui`) 소유 문서를 따른다. 이 화면에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰을 소비하는 표면은 DS 것뿐이다 — 스켈레톤 펄스(`shared/ui/ui.css:83-93` — `animation-timing-function: ease-in-out` 은 CSS 키워드이지 easing 토큰 소비가 아니다)와 토스트(`ToastProvider` 소유) | 판정은 tokens codegen · `ToastProvider` 소유 문서를 따른다. 이 화면에서 `animation`/`transition` grep = 0 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면 — `StatsCard` 6장(KPI 5 + 추이 1 → `Card` — `StatsCard.tsx:35`) · 드릴다운 `Card`(`VisitorStatsPage.tsx:268`) · 토스트(내보내기 결과) — 이 전부가 DS 소유다. 조회 조건 바(`StatsFilterBar.tsx:38-43`)는 border + radius 만 쓰고 그림자를 선언하지 않는다. **이 화면은 `box-shadow` 를 선언하지 않는다** | 판정은 DS(`Card`·`Toast`) 소유 문서를 따른다. 이 화면에서 `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **표면이 실재한다 — 이 화면은 요구가 지목한 바로 그 소비처다.** 요구의 appliesTo 에 'StatsCard value' 가 있고, 이 화면은 KPI 5장에 `value` 를 **실제로 넘긴다**(`StatsKpiRow.tsx:81` `value={loading \|\| error !== '' ? '' : formatMetric(kpi.value, kpi.unit)}`), `StatsCard.tsx:55` 가 그것을 `tds-statscard__value` 로 그리며 계약 1.1.0(`:12-14`)이 그 클래스를 `typography.display.sm` 로 못 박는다. **page `<h1>` 쪽 절반은 이 화면에 없다** — 제목은 AppHeader 소유이고 이 화면은 in-content h1 을 그리지 않는다(`StatsPageShell.tsx:6-8`) | 판정은 tokens typography · `StatsCard` 소유 문서를 따른다. 이 화면에서는 'KPI 값이 display tier 를 소비한다'는 사실만 확인 | 종속 |
| COMP-10 | COMP | N/A | **이 화면에 text-search 입력이 없다.** `searchLabel` 을 넘기지 않으므로 `SearchField` 가 렌더되지 않는다(`StatsFilterBar.tsx:209` — 6개 통계 화면 중 `/stats/keywords` 만 넘긴다: `KeywordStatsPage.tsx:254`). 나머지 필터 입력은 IME 조합이 일어나지 않는 타입이다 — `SelectField` 2개(네이티브 select) · `DateRangeField` 의 `<input type="date">` 2개(`DateRangeField.tsx:64,82`). ⚠ **그런데 `useDebouncedSearch` 는 이 화면에서도 인스턴스화된다**(`StatsFilterBar.tsx:118`) — 소비되지 않는 훅이 도는 것이 §5 #1(P0 gap)의 원인이다. 요구의 세 번째 절(응답 경합)은 표면과 무관하게 **구조적으로 성립한다** — 조회 조건 전체가 쿼리 키에 들어가(`VisitorStatsPage.tsx:145`) 늦게 온 이전 조건의 응답은 **다른 키의 캐시**로 갈 뿐 현재 화면을 덮지 못한다(`queries.ts:14-16`) | 재현할 표면 없음(IME 조합을 일으킬 입력이 0개) | N/A |
| FEEDBACK-02 | FEEDBACK | N/A | **이 화면에 파괴적/비가역 액션이 없다.** 서버 쓰기가 0건이고(FS-054 §4.1), 유일한 '행위'인 CSV 내보내기는 **되돌릴 것이 없는 다운로드**다(파일을 지우면 그만이고 서버 상태가 바뀌지 않는다). ConfirmDialog 로 게이트할 대상이 존재하지 않는다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **이 화면에 편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다(조회 조건은 즉시 URL 에 커밋되므로 '미저장'이라는 상태가 존재하지 않는다). 잃을 입력이 없으므로 이탈 3경로를 가드할 대상이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 modal 이 없다** — `Modal`/`ConfirmDialog` 를 import 하지 않는다. 포커스 트랩·dim·Esc 가 걸린 표면이 0개다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | **표면이 실재한다 — FS-040 과 다른 점이다.** 이 화면은 토스트를 띄운다: `useCsvExport.ts:75` `toast.success('N건을 내보냈습니다.')` · `:82` `toast.error('내보내기에 실패했어요…')`. 그 viewport 는 `ToastProvider` 소유이고 **비어 있을 때도 상시 마운트된 live region 두 벌**(`ToastProvider.tsx:165` `role="status" aria-live="polite"` · `:168` `aria-live="assertive"`)이 이미 요구를 인코딩한다 — 동적 삽입된 Toast 의 aria-live 에 의존하지 않는다(`:155-156`) | 판정은 `ToastProvider` 소유 문서를 따른다. 이 화면에서는 '내보내기 결과가 그 region 으로 announce 된다'는 사실만 확인 | 종속 |
| A11Y-02 | A11Y | N/A | **이 화면에 Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다(FEEDBACK-06 과 같은 사유) | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | 직접 | **표면이 실재하고 충족한다.** 이 화면의 폼 컨트롤은 넷이다 — ① `SelectField#stats-compare`(`StatsFilterBar.tsx:171`) · ② `SelectField#stats-segment`(`:193`): 둘 다 `<label htmlFor>` 로 연결된다(`:168,190`) ③ `SelectField`(페이지당 — `StatsTable.tsx:195-197`): `<span id>` + `aria-labelledby` 로 연결(주석 `:208-209` 이 `htmlFor` 를 쓰지 않은 이유를 밝힌다) ④ `DateRangeField`(custom 일 때 — `:151`): **`aria-invalid` 가 항상 `aria-describedby` 와 짝으로만 나간다**(`DateRangeField.tsx:44-45` `invalidProps`), 유효할 때는 둘 다 부여하지 않는다(`aria-invalid="false"` 를 남기지 않는다), 에러 `<p>` 는 `role="alert"` + 그 id(`:94-97`). **required 표면은 이 화면에 없다** — 조회 조건에 필수 입력이 없어 `required` 를 넘기지 않는다(`StatsFilterBar.tsx:151-162`) → 요구의 required 절은 공허참이다. ⚠ **GROUND-TRUTH 의 `FormField.withAriaRequired` 주입 메커니즘은 이 화면과 무관하다** — 이 화면은 `FormField` 를 쓰지 않는다 | 이 화면에서 **`aria-invalid` without `aria-describedby` grep = 0**(`aria-invalid` 자체가 앱 코드에 0건이고 DS 가 짝지어 주입한다). `?preset=custom&start=2026-07-16&end=2026-07-01` → 두 date 입력에 `aria-invalid` + `aria-describedby`, 에러 `<p role="alert">`. **테스트**: `stats-screens.test.tsx:125-136`(메시지가 **정확히 한 번** — 배너 중복 없음) | pass |
| A11Y-12 | A11Y | 직접 | **표면이 실재하고 충족한다.** 요구의 appliesTo 는 '좌측 필터 list item'이고 그 실체는 `filterItemStyle` 버튼이다 — 이 화면의 **기간 프리셋 7개가 정확히 그것을 쓴다**(`StatsFilterBar.tsx:85-90` `presetButtonStyle` = `filterItemStyle(active)` + 폭만 되돌림). 그리고 **`aria-pressed={active}` 하나로만 선택을 말한다**(`:135`). `aria-current` 를 섞지 않는다 — 파일 머리말(`:7-8`)이 그 결정을 명시한다. **선택을 색상 단독으로 인코딩하지 않는다**(FS-040-EL-001 의 뷰 토글이 gap 인 지점과 정반대다) | `apps/admin/src/pages/stats/**` 에서 `aria-current` grep = **0**(주석 1건뿐 — `StatsFilterBar.tsx:7`). 모든 `filterItemStyle` 버튼이 `aria-pressed`. ⚠ DS `Pagination` 은 `aria-current="page"` 를 쓰지만(`Pagination.tsx:144`) 그것은 **페이지 번호(내비게이션)이지 toggle 필터가 아니다** — 요구가 금지한 축이 아니다 | pass |
| MOTION-01 | MOTION | N/A | **이 화면에 Modal 이 없다**(FEEDBACK-06·A11Y-02 와 같은 사유). enter/exit transition 을 적용할 다이얼로그가 존재하지 않는다 | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | 상속 | **표면이 실재한다 — 내보내기 결과로 토스트를 띄운다**(`useCsvExport.ts:75,82`). **요구는 이제 충족돼 있다**(PR #26): `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`) + keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), enter `:26-27`/`:109-119`. **요구가 명시한 수치를 그대로 만족한다** — `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`component.overlay` recipe `tokens/tokens.json:1298-1307` · `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조로 동등 달성했다. reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 성공 토스트를 dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`·`Toast` 소유 문서를 따른다. **이 화면 코드로 결정되지 않는다** | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면에 `transition`·`animation`·`transform` 선언이 0건**이다. 소비하는 모션은 둘 — ① **스켈레톤 펄스**(`tds-ui-skeleton` — `StatsTable.tsx:168` · `StatsCard.tsx:50` · `ShareBarList` 계열): `ui.css:83-93` 이 무한 펄스를 걸고 **`:110-113` 이 `@media (prefers-reduced-motion: reduce)` 에서 `animation-name: none` 으로 끈다** — 이 화면이 소비하는 모션에 대해 게이트가 실재한다 ② 토스트(`ToastProvider` 소유) | 판정은 `ui.css`·`ToastProvider` 소유 문서를 따른다. reduced-motion 을 켜고 `?delay=3000` → 스켈레톤이 펄스하지 않는다(코드 대조상 성립). 이 화면에서 `transition`/`animation`/`transform` grep = 0 | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:320` — `{ path: '/stats/visitors', element: <VisitorStatsPage />, implemented: true }`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다(`App.tsx:383-392`). **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `<div style={pageStyle}>`(flex column — `StatsPageShell.tsx:24-28,109`)이다 | `/stats/visitors` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지. 화면이 자체 header/sidebar 를 렌더하지 않는다 | pass |
| IA-02 | IA | 직접 | **충족.** `/stats/visitors` 는 `nav-config.ts:198` 의 **잎**(`['방문자 통계','/stats/visitors']`)이므로 `findCoveringLeaf`(`:260-278`)가 정확히 일치하는 잎을 찾아 `findNavLabel`(`:297-299`)이 AppHeader `<h1>`(`AppHeader.tsx:101`)에 **'방문자 통계'** 를 그린다 — 가지 라벨('통계')로 폴백하지 않는다. 그리고 **이 화면에 in-content `<h1>` 이 없다** — `StatsPageShell.tsx:6-8` 이 그 결정을 명시적으로 기록했다('여기서 h1 을 또 그리면 같은 제목이 두 번 뜨고 제목의 원천이 둘로 갈린다'). **`<h1>` 이 정확히 하나다** — GROUND-TRUTH 가 지적한 'h1 이중'(폼/상세 화면의 `FormPageShell.tsx:160`)이 여기엔 성립하지 않는다. 하위 라우트가 없어 '행위 미반영' 절도 대상이 아니다 | `/stats/visitors` 진입 → AppHeader 제목이 '방문자 통계'. `document.querySelectorAll('h1').length === 1`. 이 화면은 sub-route 가 없어 폴백 경로가 발생하지 않는다. ⚠ 셸의 403 분기(`StatsPageShell.tsx:98`)와 `ForbiddenScreen`(`ErrorScreens.tsx:109`)은 둘 다 `<h2>` 라 이 규칙을 깨지 않는다 | pass |
| IA-04 | IA | 직접 | **충족.** 요구의 템플릿이 순서대로 성립한다 — ① **toolbar row**: 조회 조건 바가 좌측에 필터(프리셋·날짜·비교·세그먼트), **우상단에 내보내기**(`StatsFilterBar.tsx:221` `spacerStyle` = `marginInlineStart:'auto'` 가 우측으로 민다) ② **결과 count 요약**: `StatsTable.tsx:191-201` `rangeTextOf(rows.length, page, pageSize)` = '전체 1,234건 중 26–50' ③ **SelectionBar**: 표면 부재(bulk action 이 없다 — 읽기 전용) ④ **table**: `:131` ⑤ **Pagination**: `:228-233` — 한 페이지 초과 가능하므로 실재한다. **primary 등록/추가 버튼은 이 화면에 없고 없는 것이 옳다** — 통계는 운영자가 만드는 것이 아니다(`StatsEmpty.tsx:5-6` 이 같은 이유로 생성 CTA 를 뺐다). 6개 통계 화면이 **똑같은 순서**로 읽히도록 셸이 순서를 소유한다(`StatsPageShell.tsx:3-4`) | `/stats/visitors` → 내보내기가 조건 바 우측, count 요약이 표 아래, 25건 초과 시 Pagination 이 뜬다. ⚠ **count 요약과 Pagination 이 표 위가 아니라 아래에 있다** — 요구의 순서('count 요약 → table')와 배치가 다르나 요구가 강제하는 것은 '보인다'이지 위치가 아니다 | pass |
| IA-05 | IA | N/A | **이 화면에 create/edit 폼이 없다** — `/stats/visitors` 는 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/stats/visitors/*` 가 0건). `:id` 로 갈릴 엔티티 폼이 존재하지 않는다(통계에는 편집할 record 가 없다) | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — ★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다. 이 문서가 이전 기준에서 잡은 `page` 결함이 고쳐졌다**(커밋 `6acb235` `fix(admin): 디바운스 검색의 마운트 커밋이 ?page=N 을 지우지 않게 한다 (IA-13)`). 이 화면은 요구를 **정면으로 겨냥해 설계됐다**: `useStatsParams.ts:157` 이 `useSearchParams` 를 쓰고 기간(`preset`/`start`/`end`)·비교(`compare`)·세그먼트(`segment`)·축(`view`)·지표(`metric`)·정렬(`sort`/`dir`)·크기(`size`)·검색어(`q`)·페이지(`page`)가 **전부 URL** 이며, 기본값이면 파라미터를 지워 정규화하고(`:213-214`), 조건 변경은 `replace` 라 히스토리를 더럽히지 않는다(`:219`). 머리말(`:1-33`)이 `useListState` 를 쓰지 않은 이유까지 네 항목으로 판정해 두었다.<br>**이전 기준의 결함**: `page` 가 마운트 250ms 뒤 지워졌다 — `StatsFilterBar.tsx:118` 이 **검색 입력이 없는 이 화면에서도** `useDebouncedSearch` 를 인스턴스화하고, 그 훅은 `input=''` 로도 디바운스 타이머를 걸어 250ms 뒤 `params.setKeyword('')` 를 불렀다. `setKeyword` 는 `update({q:null})` 이고 `update` 는 `keepPage` 가 아니면 `page` 를 지운다(`:216`). **요구가 acceptanceCheck 로 못 박은 'URL을 새 탭에 복사 → 동일 필터 list 재현'이 `page` 에 대해 깨졌다.**<br>**지금은 값이 그대로면 아무것도 하지 않는다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`(가드). 근거 주석 `:275-285` 가 이 문서의 판정을 그대로 옮겨 적었다: '그 커밋이 그대로 통과하면 update 가 page 를 지워 `?page=3` 링크로 들어온 사용자가 250ms 뒤 1페이지로 튕긴다 — **검색창이 없는 화면까지 통계 6화면 전부가 그랬다**'. **검색어가 실제로 바뀔 때만 page 를 되돌린다**(`useListState.commitKeyword` · 로그 `list-state.ts:224` 와 같은 규칙 — 세 벌이 한 규칙으로 정렬됐다).<br>**이전 기준의 '어떤 테스트도 잡지 못한다' 도 해소됐다** — `useStatsParams.test.tsx:222-259` 가 **`StatsFilterBar` 의 배선을 그대로 재현하는 하네스**(`:231` — '그 한 줄')를 세우고 `:261-290` 이 단언한다: `:266`('검색어 없이 `?page=3` 으로 들어와도 250ms 뒤 page 가 그대로다') · `:277`('검색어가 있는 채로 `?page=3` 으로 들어와도 page 가 그대로다') · `:287`('검색어가 **실제로 바뀌면** 1페이지로 되돌린다 — **가드가 과하지 않다**') | `/stats/visitors?page=3` 진입(또는 그 링크를 새 탭에 붙여넣기) → **250ms 를 기다려도 URL 과 표가 3페이지 그대로다**(이전 기준에서는 `/stats/visitors` 로 튕겼다). `?q=x&page=3` 도 동일하게 보존된다. F5 → 동일. 조건을 바꾸면 여전히 1페이지로 돌아간다(STATE-04 — 가드가 그것을 막지 않는다) | pass |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell.tsx:484-493` 의 `<Outlet>` **바깥** ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 `App.tsx` 루트 경계가 잡는다(`:363` 주석이 두 경계의 역할을 명시). 이 화면은 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다. 이 화면에서는 '자체 경계를 두지 않고 셸 경계에 의존한다'만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx:383-385` 의 `<RequireAuth>` 가 AppShell **바깥**에서(주석 `:378-379`: 세션이 없으면 셸도 그리지 않는다), mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useStatsQuery` → `useQuery`)이 그 캐시를 통과하므로 자동으로 덮인다. **이 화면은 보존할 입력이 없어 재인증 손실이 없다** — EXC-19 의 dirty draft 문제가 여기엔 존재하지 않는다 | 판정은 `RequireAuth`·`queryClient` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **충족 — 그러나 §5 #4 를 함께 읽어야 한다.** ① **route-level read**: `AppShell.tsx:490-492` 의 `<RequirePermission><Outlet/></RequirePermission>` 이 모든 라우트를 덮고 `route-resource.ts` 가 이 경로를 자기 자신 잎 `page:/stats/visitors` 로 해석해 read 없는 deep-link 를 `<ForbiddenScreen/>` 으로 막는다 ② **write-action 게이팅**: **이 화면에 실재한다** — `export` 는 진짜 액션이고(`permissions/resources.ts:31,46` — `['read','create','update','remove','export']`), `StatsPageShell.tsx:119` 가 `can(resourceId,'export')` 를 `canExport` 로 내려보내면 `StatsFilterBar.tsx:223` 이 **버튼을 렌더하지 않는다**(비활성이 아니라 **부재** — 셸 주석 `:11-12` 가 '없는 권한을 손잡이로 보여주지 않는다'고 명시). create/update/remove 컨트롤은 이 화면에 0개다 ③ **강등 reconcile**: 권한 스토어(Zustand)가 바뀌면 `usePermissions` 구독자가 재렌더되므로 별도 코드 없이 성립한다(`RequirePermission.tsx:24-25`) | export 권한을 끈 역할 → 내보내기 버튼이 **사라진다**(비활성이 아니다). read 권한을 끈 역할로 deep-link → 403 화면. ⚠ **다만 이 화면은 공유 `useRouteWritePermissions()`(`RequirePermission.tsx:45-52`, `canExport` 를 이미 제공한다)를 쓰지 않고 `usePermissions().can(navPageResourceId(route), 'export')` 로 **같은 판정을 다시 만든다** — 소비처 7곳(products·settings)과 경로가 갈린다. ⚠⚠ 그리고 read 게이트가 **둘**이고 하나는 죽어 있다 — §5 #4 | pass ⚠ |
| EXC-04 | EXC | N/A | **이 화면은 write 를 하지 않는다** — 요구의 appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. 낙관적 동시성 토큰(If-Match/ETag/version)을 실을 요청이 없고, 애초에 **편집할 record 가 없다**(통계는 집계다). GROUND-TRUTH 의 `createStoreAdapter` 409 경로도 이 화면과 무관하다 — `shared/crud` 에서 가져오는 것은 `parseFilter`·`useDebouncedSearch`·`failIfRequested`/`LATENCY_MS` 뿐이다 | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **이 화면에 서버로 가는 user-initiated write 가 0건**이다 — 중복 제출을 막을 submit/confirm 이 없고, 요구의 appliesTo(`useCrudForm`·`ConfirmDialog`·금액/생성/발송 mutation)에 해당하는 표면이 없다. 멱등키를 실을 요청도 없다. ⚠ **표면이 없는데도 중복 방지가 구현돼 있다는 사실은 기록한다** — `useCsvExport.ts:52` `if (controllerRef.current !== null) return;` 이 진행 중 재클릭을 무시하고(주석이 EXC-08 을 인용한다), UI 도 버튼을 진행률+취소로 **교체**해 버린다(`StatsFilterBar.tsx:225-237`). 다만 그것은 서버 write 가 아니라 **파일 생성**의 중복 방지다 | 재현할 표면 없음(서버로 나가는 write 0건) | N/A |
| EXC-09 | EXC | 직접 | **충족 — 이 화면에 abort 경로가 둘 있고 둘 다 옳다.** ① **조회**: `useStatsQuery` 가 `queryFn: ({signal}) => fetcher(signal)`(`queries.ts:38`)로 signal 을 흘리고 `fetchVisitorStats` → `loadStats(scope, signal, ...)` → `wait(readDelayMs(), signal)`(`mock.ts:51`)가 그것을 받는다. 화면 이탈 시 react-query 가 abort 하고 **취소된 쿼리는 `error` 를 세팅하지 않으므로** FS-054-EL-006 배너가 뜨지 않는다 ② **내보내기**: `useCsvExport.ts:81` `if (isAbort(cause)) return;` — **공유 predicate 를 쓴다**(`shared/async.isAbort`). 취소 시 error 토스트가 없고, `finally`(`:84-87`)가 `controllerRef`·`isExporting` 을 리셋해 버튼 state 가 복원된다. 주석(`:80`)이 요구의 근거 문장을 그대로 인용한다 — '취소는 실패가 아니다 — 사용자가 고른 것이다' | 조회 중(400ms 안에) 다른 메뉴로 이동 → 실패 배너·토스트가 뜨지 않는다. 1,000행 내보내기 중 '취소' → **토스트 없이** 버튼이 '엑셀 내보내기 (N건)' 으로 복원된다. `?delay=5000` 으로 창을 넓혀 재현 | pass |

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
> **P0 gap 0건 — quality-bar §How to use 기준 '배치 실패' 사유가 없다.** 이전 기준의 1건(IA-13)이 해소됐다.
> **`pass ⚠` 2건은 '충족했으나 함께 읽어야 할 것이 있다'는 뜻이다** — STATE-01 은 §5 #2(컨트롤 종속 재조회의 거짓말), EXC-03 은 §5 #4(죽은 이중 게이트). **둘 다 요구의 문자는 충족하므로 gap 으로 세지 않는다** — quality-bar 가 정본이고 이 문서가 요구를 다시 쓰지 않는다는 §1 의 규칙 그대로다.
> **N/A 9건은 이 화면이 읽기 전용 분석 뷰이기 때문이며 결함이 아니다**(§1.2).

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족.** `queries.ts:40` `placeholderData: keepPreviousData` 로 조건을 바꾸는 동안 이전 결과가 유지된다. ⚠ **`staleTime` 을 지정하지 않는다** — `useStatsQuery` 에 없고 `queryClient` 기본값에 의존한다. 요구는 'refetch 트리거 시점은 `staleTime`(30s)이 지배한다'고 하므로 그 값이 전역 기본이면 충족이다(판정은 `queryClient` 소유) | 조건 변경 시 이전 행이 새 데이터 도착까지 유지된다 | pass |
| STATE-05 | P1 | **충족.** `StatsEmpty`(`StatsEmpty.tsx:20-43`)가 DS `Empty` 를 감싸 3분기를 그대로 상속한다(`Empty.tsx:52-57` `resolveMode` — 검색 > 필터 > 진짜 비어있음). 이 화면은 `hasActiveFilters` + `onResetFilters` 를 넘기므로(`VisitorStatsPage.tsx:299-300`) **'필터에 맞는 방문 기록이 없습니다' + '필터 초기화'** 가 뜬다. 진짜 비어있음이면 '집계된 방문 기록이 없습니다'. **생성 CTA 가 없는 것이 옳다** — 통계는 등록하는 것이 아니라 집계되는 것이고(`StatsEmpty.tsx:4-6`), `createVerb='집계'` 가 그 어휘를 고친다. `hasActiveFilters` 산정도 정확하다 — view/metric 은 '보는 각도'라 세지 않는다(`useStatsParams.ts:178-184`) | `?empty=all` → '집계된 방문 기록이 없습니다'(CTA 없음). `?empty=all&segment=new` → '필터에 맞는 …' + '필터 초기화'. **테스트**: `useStatsParams.test.tsx:77,93` | pass |
| STATE-06 | P1 | **N/A(표면 부재)** — 이 화면에 write 가 없어 invalidate 할 것이 없다. 다른 화면의 write 가 이 화면을 stale 하게 만드는 경로도 없다(쿼리 키 `['stats','visitors',…]` 를 아무도 무효화하지 않는다) | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **N/A(표면 부재)** — 이 화면에 검색 입력이 없다(§2 COMP-10). `type="search"` grep = 0 | 재현할 표면 없음 | N/A |
| COMP-06 | P1 | **충족(P2이나 기록).** 스켈레톤 행 수 = `pageSize`(하드코딩 5 가 아니다), 칸 수 = **실제 컬럼 수**(`StatsTable.tsx:164-171` 이 `columns.map` 으로 파생한다). 주석(`:175`)이 요구를 인용한다 | `?delay=3000` → 스켈레톤 행 25개 × 칸 8개. `length: 5` grep = 0 | pass |
| COMP-11 | P1 | **충족 — 이 화면이 요구의 모범 사례다.** ① **preset**: 오늘/어제/최근 7일/최근 30일/이번 달/지난 달(`period.ts:134-166`) — 요구가 예시로 든 넷을 포함하고 국내 관례 둘을 더 갖는다(`:118-122`) ② **`start ≤ end` 강제 + 인라인 검증**: `periodErrorOf`(`:200-206`)가 '종료일은 시작일보다 빠를 수 없습니다.' 를 내고 **조용한 empty 대신** 입력 옆에 뜬다. 그리고 **본문을 그리지 않는다**(`StatsPageShell.tsx:130`) — 말이 안 되는 범위로 조회하지 않는다 ③ **ko-KR 포맷**: `formatPeriodLabel`(`period.ts:216-220`) → '2026.07.10 ~ 2026.07.16 (7일)' ④ **keyboard 조작**: 네이티브 `<input type="date">` (`DateRangeField.tsx:64,82`) ⑤ **URL 반영**: `preset`/`start`/`end`(`useStatsParams.ts:225-243`). **말일 보정까지 있다** — 1/31 의 한 달 전은 12/31 이다(`period.ts:103-105`, 테스트 `stats.test.ts:72`) | `?preset=custom&start=2026-07-16&end=2026-07-01` → **검증 에러가 정확히 1회**, 표가 뜨지 않는다(`stats-screens.test.tsx:125-136`). 프리셋 클릭 → 범위가 채워지고 URL 이 바뀐다. F5 → 같은 범위 | pass |
| A11Y-06 | P1 | skip link 는 `AppShell` 소유. 이 화면은 Tab 정지점이 많다(프리셋 7 + select 3 + 세그먼트 2 + 정렬 헤더 8 + 페이지 번호 최대 7 + 버튼) — 우회로의 값이 크다 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-07 | P1 | route 변경 시 main 포커스 이동 + announce 는 `AppShell` 소유 | 판정은 `AppShell` 소유 문서를 따른다 | 종속 |
| A11Y-08 | P1 | **N/A(표면 부재)** — 이 화면의 표에 row-nav 가 없다. 행을 클릭해도 아무 일도 일어나지 않는다(`StatsTable.tsx:173-180` 에 `onClick`/`rowNavProps` 가 없다). 통계 행은 열 상세가 **없는** 집계라 목적지가 존재하지 않는다 — 의도된 부재다(`MemberStatsPage.tsx:5-6` 이 형제 화면에서 같은 결정을 밝힌다: '개별 회원은 여기서 열 수 없다(열 이유가 없다)') | 재현할 표면 없음 | N/A |
| A11Y-09 | P1 | 이 화면이 쓰는 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(sticky `<th>` `StatsTable.tsx:35` · 조회 조건 라벨 `StatsFilterBar.tsx:68-74`) · `surface-default` 위 `text-muted`(범위 요약 `StatsTable.tsx:191` · 힌트 `StatsKpiRow.tsx:42-48`) · `feedback-success-text`/`feedback-danger-text`(증감 `DeltaText.tsx:19-23`) · `chart-label`/`chart-axis`(`LineAreaChart.tsx:166,173`) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다 | 종속 |
| A11Y-16 | P1 | **부분 미충족 — 차트가 걸린다.** **옳게 된 축**: 정렬 헤더가 `aria-sort` 를 **`<th>` 에** 두고(`StatsTable.tsx:132`) 방향 표식 ▲▼↕ 는 `aria-hidden`, 대신 숨김 문구('정렬 기준 · 다시 누르면 방향 전환')를 준다(`:157-162`) · 표에 시각적으로 숨긴 `<caption>`(`:132`) · `aria-busy={loading}`(`:131`) · `SegmentedControl` 이 `role=radiogroup` + 로빙 tabindex + 좌우 화살표를 소유한다(`SegmentedControl.tsx:65-95`, 그룹이 탭 순서를 **한 칸**만 먹는다) · 프리셋 `aria-pressed`(§2 A11Y-12) · 증감이 **색·글리프·문장 3중 인코딩**(`DeltaText.tsx:47-55` — `describeDelta` 가 '비교 기간 대비 12.3% (1,234건) 증가'를 SR 에만 낸다) · Empty 가 `role="status"`(`Empty.tsx:104`) · 내보내기 진행률이 `role="status"`(`StatsFilterBar.tsx:230`). **미충족**: **차트에 데이터 표 대체가 없다** — `LineAreaChart` 는 `role="img"` + `aria-label` 로 **합계·최고만** 요약하고(`StatsTrendCard.tsx:49-57`) 일자별 값을 읽을 방법이 없다. 비교 계열의 값은 aria-label 에 **아예 없다**('비교 기간 …이 함께 표시됩니다' 로 존재만 알린다 — `:52`). 포커스 가능한 데이터 포인트도 툴팁도 없다. **마침 같은 화면 아래에 그 값들의 표가 있는데 차트와 연결돼 있지 않다** | 스크린리더로 추이 카드 → '방문 추이 … 합계 2,240건, 최고 480건' 까지만 읽히고 7일 각각의 값은 닿지 않는다. 색각 이상 시뮬레이션 → 두 계열은 **면적 vs 선** 형태로 갈리므로 구별된다(색 단독 인코딩 아님 ✓) | **gap** |
| IA-03 | P1 | **N/A** — 이 화면은 top-level leaf 다(`nav-config.ts:198`). non-top-level route 가 아니므로 breadcrumb 요구의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족.** ① **wide table 가로 스크롤**: 충족 — `StatsTable.tsx:28-32,118` 의 `overflowX:'auto'` 래퍼가 컬럼 8개를 **페이지가 아니라 자기 안에서** 스크롤한다(주석이 요구를 인용한다). NFR-040 이 `CrudTable` 에 없다고 지적한 바로 그 래퍼가 여기엔 있다 ② **반응형 접힘**: 충족 — KPI 가 `auto-fit minmax` 그리드로 1열까지 접히고(`StatsKpiRow.tsx:20-24`), 조건 바 행이 `flexWrap:'wrap'`(`StatsFilterBar.tsx:45-50`), 푸터도 wrap(`StatsTable.tsx:55-62`) ③ **sticky identity 열**: **미충족** — `<th>` 는 세로 sticky 지만(`:38-43`) 첫 컬럼('구간')의 가로 sticky 가 없다. 8컬럼을 가로로 밀면 어느 날짜의 행인지 잃는다 ④ **최소 지원 폭 선언 없음** ⑤ **touch-target 미검증** — 정렬 헤더 버튼(`:45-56` `padding: 0`)이 coarse pointer 최소치를 넘는지 확인되지 않았다 | 768px·375px 에서 `/stats/visitors` → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다(코드 대조상 성립). 가로 스크롤 시 '구간' 열이 함께 밀려 나간다. `position:sticky` 는 `<th>` 에만 | 부분 pass — §5 |
| ERP-02 | P1 | **N/A(대상 아님)** — `CrudTable` 을 쓰지 않는다. `shared/ui` 의 `tableStyle`/`thStyle`/`tdStyle` 을 재사용하므로(`StatsTable.tsx:14-21`) density 토큰이 도입되면 **자동으로 따라온다** — 이 화면이 셀 패딩을 자체 선언하지 않는다 | 재현할 표면 없음(density 판정은 `shared/ui` 소유) | N/A |
| ERP-03 | P1 | **부분 충족.** sticky `<thead>` 가 **있다** — `StatsTable.tsx:35-40` `stickyHeadStyle` = `thStyle` + `position:'sticky'` + `insetBlockStart:0` + `zIndex:1`, 주석이 요구를 인용한다('긴 표에서 헤더가 사라지면 어느 열이 뭔지 잃는다'). **NFR-040 이 gap 으로 판정한 축이 여기선 충족이다.** **미충족**: `zIndex: 1` 이 **토큰이 아니라 리터럴**이다(요구는 'z-index scale'을 요구한다) · on-scroll elevation 토큰 없음 · SelectionBar 는 표면 부재(bulk 없음) | 100건/페이지로 긴 표를 세로 스크롤 → 헤더가 붙어 있다. `zIndex: 1` 리터럴 1건 | 부분 pass — §5 |
| ERP-04 | P1 | **충족 — 이 화면이 요구의 모범 사례다.** clickable header(`StatsTable.tsx:135-151`) · **`aria-sort` 를 `<th>` 가 갖는다**(`:144` — 주석 `:143` 이 '정렬은 열의 속성이지 버튼의 속성이 아니다'라고 판정) · 가시 방향 인디케이터(▲▼↕, `aria-hidden` + 숨김 문구) · keyboard 조작(네이티브 `<button>`) · **numeric 컬럼이 우측 정렬 + tabular-nums**(`:125-126` `numericCellStyle`, 8컬럼 중 7개가 `align:'right'`). 정렬 자체도 정확하다 — **안정 정렬**(tie 를 index 로 깬다)과 **`localeCompare('ko-KR')`**(`table.ts:26-39`, 주석이 '가나다 순이 코드포인트 순과 다르다'를 밝힌다). `StatsTable.tsx:1-8` 이 DS `DataTable` 대신 자기 표를 만든 이유를 기록하고 **DataTable 에 sortable 헤더를 얹어 여기를 지우는 것이 옳다**고 스스로 보고한다 | 정렬 헤더 클릭 → `aria-sort` 가 `descending`, 재클릭 → `ascending`, 다른 컬럼 → `descending` 부터. **테스트**: `stats.test.ts:269-309` · `useStatsParams.test.tsx:168-185` | pass |
| ERP-05 | P1 | **충족 — 이전 기준의 '부분 pass' 가 해소됐다.** **★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다 — 커밋 `527fc1b` `refactor(admin): ERP-05 범위 요약을 DS 로 수렴하고 자작 2벌을 지운다`.** 이전 기준에서 이 화면은 범위 요약과 크기 선택을 **자기가 그렸고**, `Pagination` 에 `page`·`totalPages`·`label`·`onChange` 만 넘겨 **DS 의 opt-in 스위치를 끈 채**(`Pagination.tsx:112` `showRange = pageSize > 0` → false) 사본을 세웠다. **지금은 DS 가 그린다** — `StatsTable.tsx:195-204` 이 `page`·`totalPages`·**`total={rows.length}`**·**`pageSize`**·**`pageSizeOptions={PAGE_SIZE_OPTIONS}`**·`label`·`onChange`·**`onPageSizeChange`** 를 전부 넘긴다. 따라서 `showRange`(`Pagination.tsx:112`)와 `showSizeSelect`(`:113`)가 **둘 다 true** 가 되고 `:171-172` 의 **`<p className="tds-pagination-bar__summary" role="status">{rangeTextOf(total, page, pageSize)}</p>`** 와 `:177-194` 의 크기 선택기가 렌더된다. **요구의 세 절이 전부 DS 표면에서 충족된다**: ① total-range ② page-size selector ③ range math 의 경계 단언(`rangeTextOf` `Pagination.tsx:41-47` — 마지막 페이지 잘림 `:46` · 범위 밖 page clamp `:43-45`, 근거 주석 `:36-39`).<br>**그리고 사본이 지워졌다** — `table.ts:58-60` 이 그 이력을 남긴다: '[ERP-05] 범위 요약문(전체 1,234건 중 26–50)은 여기 있었다. DS Pagination 이 pageSize 를 받으면 **같은 것을 그리고(수식이 동치다) 경계 단언까지 갖고 있으므로**, 사본을 지우고 그쪽을 쓴다'. `StatsTable.tsx:191-194` 도 같다 — '**같은 것을 두 벌 그리면 수식이 갈라진다**(실제로 로그 쪽 사본은 clamp 가 없어 범위 밖 page 에서 *전체 3건 중 81–80* 같은 헛것을 그렸다). **page 의 clamp 도 DS 가 한다** — 여기서 `Math.min` 을 다시 걸 필요가 없다'. **이전 기준이 지적한 `rangeTextOf` 두 벌이 한 벌로 수렴했다.**<br>⚠ **형제 섹션은 아직이다** — 로그 4화면은 여전히 자기 `SummaryText` 를 그리고 `Pagination` 에 `pageSize` 를 넘기지 않는다(NFR-060 §3 ERP-05). **즉 이 수렴은 통계 섹션에서만 일어났다.** | `/stats/visitors` → 표 아래에 **`.tds-pagination-bar`** 가 렌더된다: 범위 요약 `<p role="status">전체 N건 중 x–y</p>` + '페이지당' 크기 선택 + 번호 줄. **페이지를 넘기면 `role="status"` 가 새 범위를 announce 한다.** `StatsTable.tsx` 에 `rangeTextOf` grep = 0 · `SelectField` grep = 0(사본이 없다). 판정의 나머지는 DS `Pagination` 소유 문서를 따른다 | pass |
| ERP-06 | P1 | **충족.** 존댓말 일관 · 날짜/숫자가 헬퍼 경유(`formatNumber`(shared) · `formatDayLabel`·`formatPeriodLabel`(period.ts) · `formatMetric`(format.ts)) · empty/error 문구가 템플릿(`Empty` · `queries.ts:47`). **FS-040 이 gap 이던 '두 뷰의 날짜 표기가 다르다'가 여기엔 없다** — 표·차트축·범위 요약이 전부 `formatDayLabel`(`period.ts:211-213`) 한 벌이다 | 축을 바꿔도 날짜 표기가 `2026.07.16` 로 같다 | pass |
| ERP-07 | P2 | **N/A(표면 부재) — 이 화면에 금액 컬럼이 없다.** 방문 지표는 건/명/%/초다. ⚠ **다만 그 규약을 이 섹션이 갖고 있다** — `format.ts:20-33` `withUnitSuffix` 가 '단위는 헤더가 이름표로 갖는다'를 구현하고 **매출 통계(NFR-056)가 그것을 쓴다**. 이 화면은 '재방문율 (%)' 헤더로 같은 규약을 따른다(`VisitorStatsPage.tsx:107`) | 재현할 표면 없음(금액 0컬럼) | N/A |
| ERP-08 | P1 | **부분 충족.** 숫자가 전부 `formatNumber`(shared) 경유(`VisitorStatsPage.tsx:69,77,85,93,101`) · 비율은 `formatPercentValue`(`:109`) · 체류시간은 `formatDuration`(`:117`) · **셀에 raw `toString()`/`String()` 이 0건**이다(FS-040 이 gap 이던 축). 상대시간 없음(미래/과거 skew 문제 없음 — 통계는 절대 날짜다). **미충족(경계 사안)**: `format.ts:8-10` 이 스스로 보고하듯 **금액(원)·비율(%)·체류시간(초)·증감이 `shared/format` 이 아니라 이 섹션에 산다** — 앱 공통에 `formatWon` 이 없고 존재하는 유일한 구현이 `pages/sales/_shared/business.ts` 라 페이지 간 import 가 막혀 있다(클린코드 점검 축1 blocker). 요구의 '공유 formatter(format.ts)로 렌더한다'를 **섹션 단위로만** 만족한다 | 표 셀에 `String(`/`toString()` grep = 0. 단 `formatWonValue`·`formatPercentValue`·`formatDuration`·`deltaOf` 가 `pages/stats/_shared/format.ts` 에 있다 | 부분 pass — §5 |
| ERP-09 | P2 | **충족 — 이 화면은 수렴의 수혜자다.** '오늘'이 `useStatsParams.ts:162` `formatDate(new Date())` 이고 그 `formatDate` 는 `shared/format.ts:62-63` 의 **`DISPLAY_TIME_ZONE = 'Asia/Seoul'` 고정 `Intl.DateTimeFormat`**(`:76-86`, `formatToParts` 로 조각을 받아 **우리가 조립한다**)이다. 달력 산술의 앵커는 **UTC 정오**(`period.ts:77` `NOON_HOUR_UTC` · `:97,104` `Date.UTC`)이고, `period.ts:9-13` 이 그 수렴을 기록한다 — 이 파일의 사본은 **UTC 자정** 앵커였고 정본은 정오이며 '둘은 UTC 앵커라 동치이며 출력은 한 글자도 바뀌지 않는다'. `shared/format.ts:41-49` 가 그 판정의 근거를 남긴다(1970–2100 × 29,224 조합 대조 · 정오가 **더 안전한 불변식**). **`pages/reservations/_shared/calendar.ts` 가 browser-local 로 남아 NFR-040 이 gap 인 것과 정반대다.** ⚠ **남는 것은 TZ 가 아니라 갱신이다** — `today` 가 마운트 시 고정이라(`useStatsParams.ts:159-162`) 자정을 넘겨 화면을 열어 두면 '오늘'·'최근 7일'이 어제 기준이다. **그것은 의도된 트레이드오프다**(주석: 매 렌더 `new Date()` 면 useMemo 의존성이 매번 달라져 무한 재조회) | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 진입 → **한국 기준 '오늘'과 같은 날짜**가 잡힌다(러너 TZ 를 타지 않는다). **테스트**: `shared/format.test.ts:90,117`('산술의 앵커가 UTC 정오라 러너 타임존을 타지 않는다') · `stats.test.ts:36-47` | pass |
| ERP-12 | P1 | **충족 — 이 화면이 요구의 모범 사례다.** ① **현재 필터된 결과 집합 전체**(가시 page 만이 아님): `VisitorStatsPage.tsx:252` 가 `rows`(= **페이지 자르기 전** 배열)를 넘긴다. `useCsvExport.ts:36` 의 타입 주석이 그것을 강제한다 ② **한국어 헤더**: `StatsColumn.header` 그대로(`useCsvExport.ts:72`) ③ **값은 표시대로**: `StatsColumn.csv` 가 `render` 와 **같은 원천**을 쓰도록 타입이 묶는다(`types.ts:44-53` — '셋을 따로 두면 내보낸 엑셀과 화면의 숫자가 갈라진다') ④ **UTF-8 BOM**: `download.ts:16,38` ⑤ **비동기 progress + cancel**: `useCsvExport.ts:21,66-69` — 200행마다 `wait(0, signal)` 로 이벤트 루프에 양보해 진행률이 **실제로** 갱신되고 취소가 눌린다(주석 `:10-12` 가 그 이유를 밝힌다) ⑥ **명확한 scope label**: '엑셀 내보내기 (N건)'(`StatsFilterBar.tsx:246`) + '조회 범위 … · 내보내기는 현재 조건 전체를 담습니다.'(`:253-255`). RFC 4180 이스케이프도 있다(`download.ts:19-22`) | 조건을 좁히고 내보내기 → 엑셀에서 한글이 깨지지 않고 **현재 조건 전체**가 들어 있다. 큰 기간으로 늘려 진행률·취소 확인 | pass |
| ERP-13 | P1 | **충족.** 사용자 대상 문구에서 조사를 주입하는 자리는 **빈 상태 하나**이고, `Empty.tsx:16-27`(`hasBatchim`/`subjectParticle`)이 받침을 보고 고른다 — '집계된 방문 기록**이** 없습니다'. `StatsEmpty.tsx:8` 이 `createVerb='집계'` 로 동사까지 고친다('등록된 방문 기록'은 틀린 문장이다). 나머지는 전부 고정 문구다. **리터럴 '이(가)/을(를)/은(는)' grep = 0** | `?empty=all` → '집계된 방문 기록이 없습니다'. `pages/stats/**` 에 리터럴 조사 grep = 0 | pass |
| ERP-15 | P1 | **부분 미충족.** ① **가로 스크롤**: 충족(§3 IA-14) ② **행 임계값 cap / virtualization**: **없다** — `pageSize` 상한이 100 이고(`useStatsParams.ts:50`) 그 100행은 DOM 에 전부 그려진다. 실사용에서 일자별 행은 기간 일수(프리셋 최대 31)라 문제가 없다 ③ ⚠ **그러나 URL 로 기간 상한을 뚫을 수 있다** — `?preset=custom&start=1900-01-01&end=2100-01-01` → `eachDay`(`period.ts:59-65`)가 **73,000 날짜**를 만들고 `dailyRowsOf` 가 그만큼 행을(비교 기간까지 두 벌), 차트는 x축 라벨 73,000개를 그리려 하며, **정렬이 매 렌더 전량을 돈다**(`StatsTable.tsx:104` `sortRows(rows, columns, sort)` — `useMemo` 가 **없다**). 화면이 멈춘다. 기간 상한 검증이 `periodErrorOf`(`period.ts:200-206`)에 없다 — 순서와 형식만 본다 | `?preset=custom&start=1900-01-01&end=2100-01-01` 로 진입 → 프레임 드랍/무응답. 25행 페이지에서도 **정렬 대상은 전량**이다 | **gap** |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 이 화면의 조회도 상한이 없다. `wait(delay, signal)`(`mock.ts:51`)은 abort 를 받지만 **스스로 상한을 걸지 않는다** | 응답하지 않는 백엔드를 붙이면 **영원히 스켈레톤**이다. 지금은 `LATENCY_MS=400` 픽스처에 가려 보이지 않는다 | gap |
| EXC-06 | P1 | **미충족.** `queries.ts:46-47` 이 `query.isError` 하나로 '통계를 불러오지 못했습니다.' 를 만든다 — 400/401/403/429/500/504 가 전부 같은 문구다. 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 이 훅이 읽지 않는다. **400 의 `error.fields` 도 버려진다**(BE-054 §2 봉투는 싣게 하는데 화면이 매핑하지 않는다) · **429 의 `Retry-After` 도 소비하지 않는다**. BE-054 §7.1 이 지적한 '프론트 가드 통과 후 서버 403' 상황에서 운영자는 원인을 알 수 없다 | `?fail=list` 만으로는 status 를 못 가른다 — 실패는 한 종류다. 코드 대조: `queries.ts:47` 에 status 분기 0건 | gap |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 | 오프라인 전환 시 배너가 없다 — 일반 조회 실패로 떨어진다 | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf 단일 뷰). 404 를 구분할 대상 id 가 이 화면에 없다. 기간에 데이터가 0건이면 **200 + 빈 배열**이고 화면은 그것을 Empty 로 그린다(BE-054 §5) — 404 가 아니다 | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk 작업·다중 선택이 없다(읽기 전용). ⚠ 요구의 취지 중 '장기 작업의 determinate progress + cancel' 에 해당하는 표면은 **내보내기에 실재하고 충족한다**(§3 ERP-12) | 재현할 표면 없음(선택·bulk 0건) | N/A |
| EXC-19 | P1 | **N/A** — dirty 폼 state 가 없어 session-expiry 시 잃을 draft 가 없다(§2 EXC-02) | 재현할 표면 없음 | N/A |
| EXC-20 | P1 | **부분 충족.** **후반('never-leak')은 충족** — `queries.ts:46-47` 이 원문 에러를 그대로 노출하지 않는다(주석이 EXC-20 을 인용한다). raw 서버 body·stack 이 UI 에 없다. **전반('복사 가능한 error reference')은 미충족** — `traceId` 를 표시하지 않는다. BE-054 §2 봉투는 `traceId` 를 **필수로** 싣는데 화면이 버린다 | `?fail=list` → 배너에 복사 가능한 코드 **없음**. 운영자가 신고할 때 붙일 것이 없다 | gap |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 조회 응답 p95 | **미정** — 백엔드 부재 | 픽스처 고정 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts:12`)은 개발용 지연이며 성능 예산이 아니다.** `?delay=` 로 덮어쓸 수 있다(`mock.ts:24-27`). 실제 예산은 BE-054-EP-01 의 응답 크기가 정해지면 백엔드 명세 이 확정한다 |
| **재조회 횟수** | **조회 조건이 바뀔 때만 1회** | 쿼리 키 = `['stats','visitors', period, comparePeriod, compare]`(`VisitorStatsPage.tsx:145`) | **이 화면의 강점이다** — **세그먼트·드릴다운 축·추이 지표·정렬·페이지·페이지 크기 전환이 요청을 0건** 만든다. 응답 한 벌에 4축이 다 들어 있기 때문이다(`types.ts:54-61`). 심대로 축을 3개 엔드포인트로 쪼개면 이 성질을 잃는다(BE-054 §7.2) |
| DOM 규모 | 표 행 ≤ `pageSize`(최대 100) + KPI 5 + 차트 1 | 페이지가 자른다(`table.ts:54-57`) | 실사용 상한: 일자별 = 기간 일수(프리셋 최대 31) · 시간대별 24 · 요일별 7 |
| **CPU — 정렬** | **O(N log N) × 매 렌더 — 위험** | `StatsTable.tsx:104` `sortRows(rows, …)` 가 **`useMemo` 없이** 매 렌더 전량을 정렬한다 | 실사용(≤31행)에서는 무해하다. **URL 로 기간을 뚫으면 73,000행을 매 렌더 정렬한다**(§3 ERP-15) |
| **CPU — 픽스처 생성** | 조회마다 O(기간일수 × 2) | `dailyRowsOf`(`data-source.ts:55-59`) × 현재/비교 | 시드 난수라 결정론적(`mock.ts:56-60`) — 새로고침해도 같은 값이다. **VRT·스크린샷 회귀가 성립하는 이유** |
| 차트 x축 | 라벨 = 기간 일수 | `StatsTrendCard.tsx:89` `labels={active.labels}` | 30일이면 라벨 30개가 겹친다 — 솎아내기(thinning)가 없다(`LineAreaChart.tsx:216-231` 이 전부 그린다) |
| 메모리 | 응답 4벌 상주(daily·compareDaily·hourly·weekday) | `types.ts:54-61` | 기간이 길수록 두 벌(현재+비교)이 함께 자란다 |
| 번들 | **이 화면 전용 의존 0** | 차트 라이브러리 미도입 — `LineAreaChart` 가 SVG 를 직접 계산한다(`LineAreaChart.tsx:3-5`) | 대가는 §3 A11Y-16 의 gap 이다(데이터 표 대체·툴팁이 라이브러리에는 있다) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02) — **조회 조건 바가 살아남는다**(FS-040 과 대조). 단 status 분기 없음(§3 EXC-06) · 참조 코드 없음(§3 EXC-20) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤(§2 STATE-01). **FS-040 의 '거짓 0/4' 가 여기엔 없다** |
| 집계 0건 | 빈 상태 | ✔ 3분기 Empty + 필터 초기화(§3 STATE-05). **최초 로드와 구별된다** |
| **컨트롤 종속 재조회(기간 토글)** | **이전 값 무효화** | ✖ **이전 기간의 숫자가 새 기간 라벨 아래 남는다**(§5 #2 — STATE-01↔FS-002 모순) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 스켈레톤(§3 EXC-05) |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **보존할 입력이 없어 손실 없음**(§2 EXC-02) |
| 화면 이탈 중 진행 조회 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | abort, 실패 아님 | ✔ `isAbort` + 버튼 복원(§2 EXC-09) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| **URL 로 기간 상한 뚫기** | 거절 또는 cap | ✖ **화면이 멈춘다**(§3 ERP-15 · §5 #6) |
| **`?page=3` 링크 공유** | 3페이지 재현 | ✖ **250ms 뒤 1페이지로 튄다**(§5 #1 — P0) |

### 4.3 이 화면이 답하지 못하는 운영 질문

quality-bar 의 축이 아니지만 화면의 목적(FS-054 §1)에 비추어 기록한다 — **§5 의 gap 이 아니라 범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '이 방문자가 누구인가' | 불가 — 개별 방문자로 내려갈 경로가 없다. **의도된 부재다**(집계 화면이고 원본 이벤트 표면이 없다 — BE-054 §7.3c) |
| '**다시 온 방문자만** 표로 보고 싶다' | 불가 — 세그먼트가 표를 좁히지 않는다(FS-054 §7 #2). 형제 화면(회원·매출)에서는 같은 컨트롤이 표까지 좁힌다 |
| '한 달·한 분기를 보고 싶다' | 프리셋으로는 '이번 달/지난 달'까지. 직접 입력으로는 가능하나 **상한이 없어 위험하다**(§3 ERP-15) |
| '7일 각각의 값을 스크린리더로 읽고 싶다' | 차트로는 불가(§3 A11Y-16). 아래 표에는 있으나 연결돼 있지 않다 |
| '시간대별이 정말 그런가' | **답이 없다** — 시간대별은 서버 집계가 아니라 **고정 가중치로 지어낸 곡선**이다(BE-054-EP-02 · `data-source.ts:31-34,61-68`). 픽스처의 성질이며 서버가 붙으면 해소된다 |
| '기간 순 방문자 수가 맞나' | **아니다** — 일자별 UV 를 더한 값이라 **기간 UV 가 아니다**(BE-054 §7.6 #2). 카드 힌트는 '중복을 제거한 실제 방문자 수'라 **단정한다** |

### 4.4 데이터 보존 · 감사

| 항목 | 상태 |
|---|---|
| 이 화면의 쓰기 | **없다** — 보존·복구할 상태가 없다 |
| 개인정보 열람 | **없다.** 화면·CSV 의 모든 값이 집계 수치다 — 개별 방문자를 식별할 값이 하나도 없다(BE-054 §7.3c). **FS-040(달력이 고객 이름을 렌더)과 정반대다** |
| 내보내기 감사 | ⚠ **불가능하다** — CSV 가 **클라이언트에서** 생성되므로 서버에 '누가 무엇을 내보냈는가' 가 남지 않는다(BE-054 §7.3). 이 화면은 집계뿐이라 실피해가 없으나 **매출 통계(NFR-056)에서는 같은 구조가 재무 데이터에 걸린다** |
| 권한 통제 | ⚠ `export` 권한은 **실질 통제가 아니다** — 클라이언트 생성이라 서버가 막을 지점이 없고 데이터는 read 만으로 이미 브라우저에 있다(BE-054 §7.3d) |

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| ~~1~~ | ~~IA-13~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `6acb235` `fix(admin): 디바운스 검색의 마운트 커밋이 ?page=N 을 지우지 않게 한다 (IA-13)`).** 이전 기준에서 이것은 **이 화면의 유일한 P0 gap** 이자 실재 결함이었다 — `StatsFilterBar.tsx:118` 이 검색 입력 없는 화면에서도 `useDebouncedSearch` 를 걸고, 그 훅의 **마운트 직후 커밋**(`input=''`)이 `setKeyword('')` → `update({q:null})` → `page` 삭제(`useStatsParams.ts:216`)로 이어져 **`?page=3` 링크가 250ms 뒤 1페이지로 튕겼다**(통계 6화면 전부). **가드가 들어갔다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`, 근거 주석 `:275-285` 가 이 문서의 판정을 그대로 옮겨 적었다('**검색창이 없는 화면까지 통계 6화면 전부가 그랬다**'). **이 문서가 지적한 테스트 공백도 메워졌다** — `useStatsParams.test.tsx:222-259` 가 `StatsFilterBar` 배선을 재현하는 하네스를 세우고 `:261-290` 이 세 경우를 단언한다(page 보존 2건 + '가드가 과하지 않다' 1건). **같은 결함이 로그 섹션에도 있었고 함께 고쳐졌다**(`list-state.ts:224` — NFR-060 §2 IA-13). 세 벌(`useListState`·통계·로그)이 한 규칙으로 정렬됐다 | 이 화면 + **통계 6화면 공통**(`_shared`) | **종결** |
| 2 | **STATE-01** | **P0(모순)** | **⚠ STATE-01 ↔ FS-002 모순이 이 화면에서 정면으로 발현한다.** `queries.ts:40`(`keepPreviousData`) + `:45`(`isFirstLoad`)는 STATE-01 의 '재조회 중 이전 행 유지'를 **문자 그대로** 지킨다 — 그래서 §2 판정은 pass 다. **그러나 이 화면의 재조회는 대부분 컨트롤 종속이다**: 기간 프리셋을 누르면 `params.period` 가 URL 에서 즉시 바뀌어 **조회 범위 문구(`StatsFilterBar.tsx:254`)는 새 기간을 말하는데**, 새 요청이 도는 동안 KPI·차트·표는 `keepPreviousData` 가 붙든 **이전 기간의 숫자**를 계속 보인다. `isFirstLoad` 가 false 라 스켈레톤도 없고 **`aria-busy` 도 false** 다(`StatsCard.tsx:35` `busy={loading}`) — **화면 어디에도 그 숫자가 옛 기간의 것이라는 신호가 없다.** '이번 달'을 눌렀는데 최근 7일 숫자가 '이번 달' 라벨 아래 선다. **FS-002(대시보드)는 컨트롤 종속 조회에 스켈레톤을 요구하고 e2e 가 `aria-busy` 를 단언하는데 STATE-01 은 유지를 요구한다 — 두 요구가 같은 `loading` 축에서 반대 방향을 가리킨다.** **판정: 명세가 옳다** — 월을 눌렀는데 일 차트가 남으면 그 차트는 거짓말이다. 따라서 **STATE-01 의 유지 규칙은 '컨트롤 비종속 재조회'(staleTime 만료·백그라운드 갱신)에 한한다**는 해석을 남긴다. **해소 경로**: `useStatsQuery` 가 `isPlaceholderData` 를 함께 내면 호출부가 '컨트롤 종속 = 무효화'를 표현할 수 있다 — **다만 `StatsCard` 로는 표현할 수 없다**(#3) | 이 화면 + 통계 6화면 + 대시보드 | **UI 기획 · 아키텍처 (해석 확정) · 프론트 리팩터** |
| 3 | — | — | **`StatsCard` 가 `loading` 하나로 두 가지를 한다 — 앱층에서 해소 불가(#2 의 선행 조건).** `StatsCard.tsx:35` 의 `<Card busy={loading}>`(=`aria-busy`)와 `:48` 의 `{loading ? <스켈레톤> : 본문}` 이 **같은 prop** 에 묶여 있다. `busy`(본문 유지 + 재조회 중)와 스켈레톤(본문 대체)을 가를 방법이 없어 앱이 '컨트롤 종속 재조회 중'을 표현할 수 없다. `TodoCard.tsx:37,43` · `ListCard.tsx:40,46` 도 같다. **이관 대상은 `packages/ui` 의 계약 분리이지 이 화면이 아니다** | `packages/ui` | **프론트 리팩터 / DS (선행 · 차단 사안)** |
| 4 | — | — | **403 게이트가 둘이고 하나는 죽어 있다**(§2 EXC-03 ⚠). `StatsPageShell.tsx:95-104` 가 `can(page:/stats/visitors,'read')` 로 자기 403 을 그리는데 `AppShell.tsx:490-492` 의 `RequirePermission` 이 **같은 리소스·같은 액션**을 먼저 막는다 → 이 분기는 실앱에서 **도달 불가**. 게다가 UI 가 갈린다 — 공유 `ForbiddenScreen`(`ErrorScreens.tsx:103-119`)은 `role="alert"` + '대시보드로' 버튼을 갖는데 통계 것은 **둘 다 없다**. **설정 섹션은 이미 수렴했다**(`App.tsx:335-336` 이 명시) — 통계만 남았다. 아울러 export 판정이 공유 `useRouteWritePermissions()`(`canExport` 를 이미 제공)를 쓰지 않고 사본 경로를 만든다 | 이 화면 + 통계 6화면 | **프론트 리팩터 · UI 기획** |
| 5 | A11Y-16 | P1 | 차트에 **데이터 표 대체가 없다** — `role="img"` + 합계·최고 요약만 있고(`StatsTrendCard.tsx:49-57`) 일자별 값·비교 계열 값이 AT 에 닿지 않는다. 마침 같은 화면 아래에 그 값들의 표가 있는데 연결돼 있지 않다 | 이 화면 + 통계 6화면 | UI 기획 (FS-054 §7 #12) |
| 6 | ERP-15 | P1 | **URL 로 기간 상한을 뚫으면 화면이 멈춘다** — `?preset=custom&start=1900-01-01&end=2100-01-01` → 73,000행 × 2벌 + x축 라벨 73,000 + **`useMemo` 없는 매 렌더 전량 정렬**(`StatsTable.tsx:104`). `periodErrorOf`(`period.ts:200-206`)에 범위 상한 검증이 없다. **서버가 붙으면 서버 부하로 바뀐다**(BE-054 §7.6 #8) | 이 화면 + 통계 6화면 | **UI 기획 · 백엔드 명세** |
| ~~7~~ | ~~ERP-05~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `527fc1b`).** 이전 기준에서 DS `Pagination` 의 범위·크기 표면이 꺼진 채 섹션이 같은 것을 손으로 그렸다(`pageSize` 미전달 → `Pagination.tsx:112` `showRange` false → `role="status"` 범위 요약 부재 · `rangeTextOf` 두 벌). **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘겨 DS 가 그린다** — `Pagination.tsx:171-172` 의 `role="status"` 범위 요약 + `:177-194` 크기 선택기. **자작 사본은 지워졌다**(`table.ts:58-60` · `StatsTable.tsx:191-194` 가 그 이력과 이유를 남긴다 — '같은 것을 두 벌 그리면 수식이 갈라진다'). `rangeTextOf` 가 한 벌로 수렴했다. ⚠ **로그 4화면은 아직 사본이다**(NFR-060 §3 ERP-05) — 이 수렴은 통계 섹션에서만 일어났다 | 이 화면 + `_shared` | **종결** |
| 8 | ERP-03 / IA-14 | P1 | sticky `<thead>` 는 있으나(`StatsTable.tsx:35-40`) **`zIndex: 1` 이 토큰이 아니라 리터럴**이고 on-scroll elevation 이 없다. **identity 열('구간')의 가로 sticky 가 없어** 8컬럼을 가로로 밀면 어느 행인지 잃는다. 최소 지원 폭 선언 없음 · 정렬 헤더 버튼의 touch-target 미검증 | 이 화면 + 앱 전역 | UI 기획 |
| 9 | ERP-08 | P1 | 금액(원)·비율(%)·체류시간(초)·증감 포매터가 `shared/format` 이 아니라 `pages/stats/_shared/format.ts` 에 있다 — **`format.ts:8-10` 이 스스로 보고한 blocker**(앱 공통에 `formatWon` 이 없고 유일한 구현이 `pages/sales/_shared/business.ts` 라 페이지 간 import 가 막힌다). 셀의 raw `toString()` 은 0건이므로 요구의 핵심은 충족 | 이 화면 + `shared/format` | 프론트 리팩터 · UI 기획 |
| 10 | EXC-06 / EXC-20 | P1 | 조회 실패가 status 를 보지 않고(`queries.ts:47` — 401/403/429/500/504 한 문구) **참조 코드(`traceId`)도 없다**. BE-054 §2 봉투는 `code`·`fields`·`traceId` 를 필수로 싣는데 훅이 전부 버린다. 400 의 `fields` 미매핑 · 429 의 `Retry-After` 미소비. **BE-054 §7.1 의 '프론트 통과 후 서버 403' 상황에서 원인 파악이 불가능하다** | 이 화면 + 앱 전역 | UI 기획 · 프론트 리팩터 |
| 11 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — 서버가 침묵하면 **영원히 스켈레톤**이다. `AbortSignal.timeout` 앱 전체 0건 | 앱 전역 | 프론트 구현 · 프론트 리팩터 |
| 12 | EXC-11 | P1 | 오프라인 감지 없음(`navigator.onLine` 0건) | 앱 전역 | 프론트 구현 |
| 13 | — | — | **`StatsKpiRow`·`StatsTrendCard` 의 `error` 경로가 죽어 있다** — `StatsPageShell.tsx:130-151` 이 error 면 children 을 렌더하지 않으므로 `VisitorStatsPage.tsx:255,265` 의 `error={query.error}` 는 언제나 `''` 다. `StatsKpiRow.tsx:81` 의 error 분기와 `StatsCard.tsx:44-47` 의 `role="alert"` 오류 문단이 **도달 불가**. 상태 분기가 두 곳에 있고 한 곳만 산다 | 이 화면 + 통계 6화면 | UI 기획 |
| ~~14~~ | — | — | **✔ 해소됨(기준 `a5c2639`).** 이전 기준에서 `ShareBarList.tsx:7-11` 는 '구분 가능한 계열 색이 2개뿐이다(chart.series-1/2)' 라 적고 `StatsTrendCard.tsx:8-15` 은 '`chart.series-3..6` 이 tokens.json 에 필요하다(TOKEN-13)' 라 적었으나 **`tokens/tokens.json:778-897` 에 `chart.series-1..6`(+fill+dark) 이 전부 있었고**(`packages/ui/generated/tokens/tokens.css:138-145`) `LineAreaChart.tsx:29-44` 는 이미 6계열을 순환 참조했다 — **없는 제약을 근거로 설계를 정당화한 것**이었다. **두 주석이 전부 고쳐졌다**: `StatsTrendCard.tsx:8-15`('[계열 색 — **해결됨**, 이 카드가 2계열인 건 이제 색 때문이 아니다] … 즉 **색 제약은 없다**' + 참인 근거 — '이 카드가 답하는 질문이 *한 지표를 두 기간에 걸쳐 견주면 어떤가* 이기 때문' `:11-14`, '다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — **막던 것은 사라졌다**' `:15`) · `ShareBarList.tsx:7-11`('**⚠ 예전 이 자리엔 … 그 전제는 지금 거짓이다** … **색이 모자라서 단색을 고른 게 아니라, 이 데이터에는 단색 길이 비교가 맞아서** 고른 것이다'). **결정(2계열 차트 · 단색 구성비 막대)은 유지되고 근거만 참인 것으로 교체됐다** — 이 문서가 요구한 '주석 정정 또는 결정 재검토' 가 둘 다 일어났다 | `_shared` | **종결** |
| 15 | — | — | **BE-054 §7.6 #2 (도메인)** — 기간 '순 방문자 수'가 `sumOf(daily, uniqueVisitors)`(`VisitorStatsPage.tsx:173`)라 **UV 의 합이지 기간 UV 가 아니다**. 7일 연속 방문한 한 사람이 7명으로 세어진다. 카드 힌트는 '중복을 제거한 실제 방문자 수'라 **단정한다**(`:176`). **일자별 합으로는 원리적으로 구할 수 없다 — 서버가 별도 필드로 줘야 한다** | 도메인 + 이 화면 | **백엔드 명세 · 아키텍처 · UI 기획** |
| 16 | — | — | **세그먼트의 범위가 형제 화면과 다르다**(FS-054 §7 #2) — 이 화면의 '방문자 유형'은 KPI 첫 칸과 추이 첫 계열만 바꾸고 **표는 전체 값 그대로**다(`VisitorStatsPage.tsx:231-236`). 회원(`MemberStatsPage.tsx:124-125`)·매출(`RevenueStatsPage.tsx:190`)은 표까지 좁힌다. 같은 조회 조건 바의 같은 칸이 화면마다 다른 범위를 갖는다 | 이 화면 | **UI 기획 쪽 변경 요청** |
| 17 | — | — | **'오늘'이 마운트 시점 고정**이라 자정을 넘겨 열어 두면 '오늘'·'최근 7일'이 어제 기준이다(`useStatsParams.ts:159-162`). **TZ 문제가 아니라 갱신 문제다**(ERP-09 는 pass — §3). 의도된 트레이드오프이나 기록한다 | 이 화면 + 통계 6화면 | UI 기획 |
| 18 | — | — | **BE-054 §6.1 (정합)** — 심 3건과 프론트 호출 1건이 어긋난다. 시간대별·요일별이 클라이언트 파생이고(`data-source.ts:98-99`) `segment` 가 전송되지 않으며 비교 기간 파라미터가 심에 없다. '`build` 안쪽만 fetch 로 바꾸면 된다'(`data-source.ts:3-4`)는 약속이 **이 세 축에 대해 성립하지 않는다** | 도메인 + 이 화면 | **백엔드 명세 · UI 기획** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.

### 6.1 이 화면의 scope 와 op

**이 화면의 scope 는 `stats-visitors` 다**(`data-source.ts:15` · `mock.ts:16-22` 의 `StatsScope`). **거는 op 은 `list` 하나뿐이다** — `mock.ts:52` 가 `failIfRequested(scope, 'list')` 로 고정한다(`detail`·`save`·`delete` 는 이 화면에서 발화하지 않는다 — 쓰기가 0건이다).

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-054-EL-006 조회 실패 배너 (KPI·추이·표가 통째로 대체된다. **조회 조건 바는 남는다**) |
| `detail` · `save` · `delete` | ✕ — 이 화면은 부르지 않는다 | 해당 없음 |

### 6.2 재현 스위치 — **통계는 세 개를 전부 갖는다**

`mock.ts:6-11` 이 문법을 기록한다 — **통계만의 새 문법을 만들지 않고 기존 관례를 그대로 쓴다.**

```
/stats/visitors?delay=3000                    스켈레톤 재현 → STATE-01 확증 (mock.ts:24-27)
/stats/visitors?fail=list                     조회 실패 → STATE-02 확증 (shared/crud/dev.ts 문법)
/stats/visitors?fail=stats-visitors:list      이 화면만 실패 — 스코프가 갈려 있음을 확인
/stats/visitors?empty=all                     0행/0값 → STATE-05 3분기 확증 (mock.ts:29-34)
/stats/visitors?empty=stats-visitors          위와 동일(스코프 명시)
```

> ⚠ **`?delay=` 가 이 화면에는 있다 — FS-040 과 다른 점이다.** `mock.ts:24-27` `readDelayMs()` 가 `?delay` 를 읽어 `LATENCY_MS`(400)를 덮어쓴다. **그래서 STATE-01 의 pass 를 눈으로 확증할 수 있다**(FS-040 은 스위치가 없어 `LATENCY_MS` 를 임시로 올려야 했다).

**조합 재현** (판정을 뒤집는 절차):

```
/stats/visitors?empty=all&segment=new         STATE-05 필터 분기 → '필터에 맞는 …' + '필터 초기화'
/stats/visitors?preset=custom&start=2026-07-16&end=2026-07-01
                                              COMP-11 · A11Y-11 확증 — 검증 에러 1회 + 본문 미렌더
/stats/visitors?page=3                        ⚠ §5 #1 (P0) 재현 — 250ms 뒤 URL 에서 page 가 사라진다
/stats/visitors?delay=3000 → '이번 달' 클릭   ⚠ §5 #2 재현 — 3초간 '최근 7일' 숫자가 '이번 달' 라벨 아래 선다
/stats/visitors?preset=custom&start=1900-01-01&end=2100-01-01
                                              ⚠ §5 #6 재현 — 73,000행. 화면이 멈춘다
```

⚠ **`?status=` 는 이 화면에 의미가 없다.** `mock.ts:52` 가 `failIfRequested` 만 부르고 `shared/crud/dev.ts` 의 status 재현 경로를 타지 않는다 — 그래서 **§3 EXC-06 의 gap(status 별 분기 부재)을 스위치로 재현할 수 없고 코드 대조로만 판정했다**(`queries.ts:47` 에 status 분기 0건).

### 6.3 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| STATE-01 (pass ⚠) | `queries.ts:40,45` · `StatsTable.tsx:162-172,187` · `StatsPageShell.tsx:130` · **모순은 `StatsFilterBar.tsx:254` + `StatsCard.tsx:35,48`** |
| STATE-02 (pass) | `StatsPageShell.tsx:130-151` · `stats-screens.test.tsx:86-97` |
| STATE-04 (pass) | `table.ts:50-57,63-69` · `StatsTable.tsx:196` · `useStatsParams.ts:216` |
| **IA-13 (gap)** | **`StatsFilterBar.tsx:118` → `useDebouncedSearch.ts`(커밋 effect) → `useStatsParams.ts:286-292` → `:216`** · 반증 부재: `useStatsParams.test.tsx:35-45`(필터 바 없음) · `stats-screens.test.tsx`(URL 미단언) |
| A11Y-11 (pass) | `DateRangeField.tsx:44-45,94-97` · `StatsFilterBar.tsx:168,190` · `StatsTable.tsx:191-197` |
| A11Y-12 (pass) | `StatsFilterBar.tsx:85-90,133-135` · `pages/stats/**` 에 `aria-current` grep = 0 |
| IA-02 (pass) | `nav-config.ts:198,260-278,297-299` · `AppHeader.tsx:101` · `StatsPageShell.tsx:6-8` · 이 화면에 `<h1>` 0건 |
| EXC-03 (pass ⚠) | `AppShell.tsx:490-492` · `permissions/resources.ts:31,46` · `StatsPageShell.tsx:95-104,119` · `StatsFilterBar.tsx:223` · **죽은 게이트 대조: `App.tsx:335-336`(설정은 수렴)** |
| EXC-09 (pass) | `queries.ts:38` · `mock.ts:51` · `useCsvExport.ts:81,84-87` |
| ~~ERP-05~~ — **해소 확증** | `StatsTable.tsx:195-204`(**`total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 전달**) → `Pagination.tsx:112-113`(`showRange`·`showSizeSelect` true) → `:171-172`(`role="status"` 범위) · `:177-194`(크기 선택). 사본 제거 이력 `table.ts:58-60` · `StatsTable.tsx:191-194` |
| ERP-09 (pass) | `useStatsParams.ts:162` · `shared/format.ts:41-49,62-63,76-86` · `period.ts:9-13,77,97,104` |
| ERP-12 (pass) | `useCsvExport.ts:36,66-69,72` · `download.ts:16,19-22,38` · `types.ts:44-53` · `VisitorStatsPage.tsx:250-253` |
| ERP-15 (gap) | `period.ts:59-65,200-206` · `StatsTable.tsx:104` |
| BE-054 §7.6 #2 (UV) | `VisitorStatsPage.tsx:173,176` · `types.ts:46` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **9건 전부**, 그리고 §1.2 에 '이 화면이 FS-040 과 달리 N/A 가 적은 이유'를 밝혔다
- [x] 모든 `pass` 에 코드 근거(파일:라인) · 모든 `gap` 에 재현 가능한 측정 기준
- [x] **§2.1 산수 검산 — 11 + 9 + 9 + 1 = 30 ✔**
- [x] **판정 기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] **'E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했다
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(STATE-06·COMP-03·A11Y-08·IA-03·ERP-02/07·EXC-12/14/18/19)은 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 scope(`stats-visitors`)와 op(`list` 하나)** 을 코드에서 확인해 적었고, **`?delay=`·`?empty=` 가 이 화면에 실재함**(FS-040 과 다른 점)과 **`?status=` 가 통하지 않음**을 함께 밝혔다
- [x] **STATE-01 ↔ FS-002 모순을 §2(STATE-01 행) · §4.2 · §5 #2 에 명시**하고 '유지 규칙은 컨트롤 비종속 재조회에 한한다'는 해석을 남겼다
- [x] **ERP-05 를 코드로 직접 확인**했다 — **기준 `a5c2639` 에서 뒤집혔다.** 이전 기준에서는 `StatsTable` 이 `Pagination` 에 `pageSize` 를 넘기지 않아 DS 표면이 잠들어 있고 섹션이 사본을 그렸다. **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘기고**(`527fc1b`) 사본은 지워졌다(`table.ts:58-60` 이 이력을 남긴다). `Pagination.tsx:112-113,171-172,177-194` 를 직접 읽어 `showRange`/`showSizeSelect` 가 켜짐을 확인했다
- [x] NFR-055/056 과 겹치는 판정(`_shared` 계층)을 반복하되 **이 화면 고유의 근거**(방문 지표·3축 드릴다운·세그먼트 범위·UV 합산)를 달았다
