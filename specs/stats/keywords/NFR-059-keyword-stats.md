---
id: NFR-059
title: "검색어 분석 비기능 명세"
functionalSpec: FS-059
backendSpec: BE-059
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-059. 검색어 분석 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-059 검색어 분석 (`/stats/keywords`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-059(요소·예외) · BE-059(엔드포인트·**보안 판정**) · **NFR-057(주문 통계) · NFR-058(유입 분석)** — 세 화면이 `stats/_shared/**` 를 공유해 판정이 겹친다. 이 문서는 겹치는 판정도 **이 화면 고유의 근거(file:line)** 로 다시 확인해 적는다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면 또는 `_shared/**` 의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6). 단 `stats-screens.test.tsx` 는 6화면을 실제 라우터·쿼리 클라이언트·픽스처로 렌더하는 **통합 테스트**이며, 그것이 고정한 사실은 그렇게 표기한다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(또는 `stats/_shared`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·`shared/**` 공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격 — 통계 3화면 중 표면이 가장 넓다

**읽기 전용 집계 뷰**이나 P0 30 중 N/A 가 **8건**뿐이다 — NFR-057·NFR-058 보다 하나 적고 FS-040(16건)의 절반이다. **이 화면만의 축이 넷 있다**:

1. **검색 입력이 실재한다** — 통계 6화면 중 유일. **COMP-10 의 당사자는 이 화면뿐이다**(주문·유입은 N/A).
2. **빈 상태 3분기가 전부 성립한다** — `hasQuery`·`onClearSearch` 를 넘기는 유일한 통계 화면(`KeywordStatsPage.tsx:293-304`).
3. **`Pagination` 이 실제로 렌더된다** — 41행 ÷ 25 = 2페이지. 유입 분석(7행)·주문 통계(기간의 날 수)와 달리 페이지 표면이 살아 있다.
4. **⚠ 사용자 입력을 데이터로 다룬다** — 검색어. 그 결과가 **BE-059 §7.2(개인정보 — 미결)와 §7.3(CSV 수식 주입 — 기준 `a5c2639` 에서 해소)** 이다.

**P0 gap 은 1건**(STATE-01)이며 형제 화면과 같다. **그리고 이 화면의 가장 중대했던 결함은 P0 축에 걸리지 않았다** — CSV 수식 주입은 quality-bar 의 어느 ID 에도 정확히 대응하지 않는다(§4.6). **그것은 기준 `a5c2639` 에서 해소됐고, §2.1 의 건수는 그 사건에 반응하지 않았다** — P0 표가 이 화면의 위험을 다 담지 못한다는 사실 자체는 변하지 않았다.

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 상태는 옳게 갈려 있다** — `queries.ts:45` `isFirstLoad = query.data === undefined && query.isFetching` 를 `KeywordStatsPage.tsx:263,274,292` 가 `loading` 으로 넘긴다. 스켈레톤은 최초 로드에만(`StatsTable.tsx:162`·`StatsCard.tsx:48`), empty 는 **성공 · 0행에만**(`StatsTable.tsx:187` `!loading && rows.length===0`), error 는 본문을 대체(`StatsPageShell.tsx:130`). **거짓 빈 상태가 없다.**<br>**그런데 그 문자 그대로의 준수가 컨트롤 종속 재조회에서 거짓말을 만든다.** `queries.ts:40` `placeholderData: keepPreviousData` 이므로 **기간 프리셋을 바꾸면** `isFirstLoad === false` → 스켈레톤도 `aria-busy` 도 없이 **이전 기간의 KPI·차트·표가 서 있다.** 조회 조건 바(`StatsFilterBar.tsx:254`)와 차트 `aria-label`(`StatsTrendCard.tsx:100` ← `KeywordStatsPage.tsx:273`)은 **새 기간**을 말한다. `isPlaceholderData` 소비 코드는 stats 전체에 **0건**(grep 확인).<br>**⚠ 이 화면에서 특히 헷갈리는 이유**: 검색어·세그먼트 변경은 **즉시 반영되는데**(클라이언트 필터 — `:162-172`) **기간만 400ms 늦게 반영된다.** 같은 조회 조건 바의 컨트롤들이 **서로 다른 속도로 반응한다** — 운영자는 어느 것이 반영됐는지 알 수 없다.<br>**판정 근거**: STATE-01 의 문자만 보면 **pass**. 그러나 **F3b 판정은 FS-002 가 옳다** — 따라서 유지 규칙은 **'컨트롤 비종속 재조회'에 한한다**는 해석 아래 **gap** 으로 계상한다. §4.5 · §5 #1 | `?delay=5000&preset=last30` 진입 → '오늘' 클릭 → **5초간 '조회 범위 2026.07.17' 아래 지난 30일의 총 검색수·순위 표가 남는다.** 그 5초 안에 검색어를 치면 **그것은 즉시 반영된다** — 두 컨트롤의 반응 속도가 다름이 관측된다 | **gap** |
| STATE-02 | STATE | 직접 | 조회 실패 시 `StatsPageShell.tsx:130-148` 이 인라인 `<Alert tone="danger">` '통계를 불러오지 못했습니다.'(`queries.ts:47`) + '다시 시도'(`KeywordStatsPage.tsx:256` `query.refetch`)를 렌더한다. **토스트가 아니고 빈 상태로 폴백하지 않는다.** 배너가 **본문만** 대체하고 **조회 조건 바(`:112`)는 남아** 다른 기간으로 복구할 수 있다. **이 화면에는 `notice` 가 없어** 유입 분석의 '실패해도 고지가 남는' 문제(NFR-058 §5 #15)가 성립하지 않는다 | `/stats/keywords?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. **`stats-screens.test.tsx:86-97` 이 고정한다** | pass |
| STATE-04 | STATE | 직접 | ① **page clamp**: `table.ts:50-52` `clampPage` 를 `pageSlice`(`:55`)·`rangeTextOf`(`:65`)가 쓰고 `StatsTable.tsx:196` 가 `Math.min(page, totalPages)` 로 DS 에 넘긴다 ② **조건 변경 시 page 되돌림**: `useStatsParams.ts:216` `next.delete('page')` — **이 화면에서 실제로 중요하다**: 2페이지를 보다 검색어를 치면 결과가 1페이지로 줄어드는 일이 흔하다 ③ **행 선택 없음** — 요구의 '숨겨진 행의 선택 해제'는 대상이 없다. ⚠ clamp 는 **렌더 시점**이라 URL 의 `page=99` 는 그대로 남는다 | `?page=2` 에서 검색어 '원피스' 입력 → **page 가 URL 에서 사라지고 1페이지 결과**. `?page=99` → 마지막 유효 페이지 + '전체 41건 중 26–41'(false-empty 없음) | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 + `_shared/**` 의 스타일 객체가 전부 `var(--tds-*)` 를 참조한다 — 이 화면의 **자체 스타일 객체는 `keywordCellStyle` 하나**(`KeywordStatsPage.tsx:54-58` — `gap: 'var(--tds-space-2)'`)이고 토큰만 쓴다. **grep 실측**: `pages/stats/**` 에서 `#hex` **0건** · `[0-9]+px` **0건** · `(outline\|border): (thin\|medium\|thick)` **0건** <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `pages/stats/**` 에 위 3종 grep = 0(실측). lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 포커스 가능 표면 — 프리셋 버튼 7개(`StatsFilterBar.tsx:133`) · 정렬 헤더 버튼 7개(`StatsTable.tsx:137`) · DS `Button`/`SelectField`/**`SearchField`**/`SegmentedControl`/`DateRangeField`/`Pagination` — 전부 DS 의 `tds-ui-focusable` 계약을 상속한다. **자체 `:focus-visible` 규칙을 선언하지 않는다** | 판정은 DS 소유 문서를 따른다. `pages/stats/**` 에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **자체 `animation`/`transition` 선언이 0건**이다. easing 토큰 소비 표면은 ① 스켈레톤 펄스 ② 내보내기 토스트 — 전부 DS 소유 | 판정은 tokens codegen · Toast 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | elevation 표면 — `StatsCard`(KPI 5장 `StatsKpiRow.tsx:77` · 추이 `StatsTrendCard.tsx:85`) · `Card`(순위 `KeywordStatsPage.tsx:278`) · 토스트. **`StatusBadge`**(`:65`)는 배지이지 floating surface 가 아니다. 이 화면은 `box-shadow` 를 선언하지 않는다 | 판정은 DS(`Card`·`Toast`) 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **in-content `<h1>` 이 없다** — `StatsPageShell.tsx:6-8` 이 결정을 명시. 제목은 AppHeader 가 낸다. **>18px tier 소비 표면은 실재한다** — KPI 값이 `StatsCard` 의 `display.sm`(`StatsCard.tsx:12-14,55`)로 세워진다. 카드 제목은 `<h2>`(`StatsCard.tsx:37`) | 판정은 tokens typography · `StatsCard` 소유 문서를 따른다. **title 소스는 하나다** | 종속 |
| **COMP-10** | COMP | 상속 | **이 화면에 text-search 입력이 실재한다 — 통계 6화면 중 유일하다.** `KeywordStatsPage.tsx:254` 가 `searchLabel="검색어"` 를 넘겨 `StatsFilterBar.tsx:209-219` 가 DS `SearchField` 를 그린다. **IME 판정·디바운스는 공유 훅이 소유한다** — `:19,118` `useDebouncedSearch({ initial: params.keyword, onCommit: params.setKeyword })`. `:117` 이 그 경계를 명시('IME 조합 판정·디바운스는 공유 훅이 소유한다 — 이 섹션의 사본은 수렴됐다'). **GROUND-TRUTH §3 의 `useDebouncedSearch` 소비 목록에 `stats/_shared/{StatsFilterBar,useStatsParams}` 가 있는 것은 맞다**(다만 `useStatsParams` 는 소비하지 않는다 — §2 IA-13).<br>**요구의 세 절을 이 화면이 전부 만족한다**: ① **조합 중 커밋 금지 + 조합 중 Enter 가 submit 하지 않음** — `useDebouncedSearch.ts:58-62` 가 state 와 ref 를 **함께** 두고 `onKeyDown` 에서 **ref 로 동기 판정**한다(`:61-62` 가 이유를 밝힌다: 'setState 는 다음 렌더에 반영되므로 조합 시작 직후의 Enter 를 state 로 막으려 하면 이미 늦는다') ② **debounce + 최소 길이** — `:53` `minLength = 1` ③ **stale in-flight 응답이 최신을 덮지 않음** — **이 화면에서는 원리적으로 불가능하다**: `queryKey` 가 `['stats','keywords', period, comparePeriod, compare]`(`KeywordStatsPage.tsx:151`)라 **`keyword` 가 없다.** 검색은 `filterKeywordRows`(`types.ts:119-131`)로 **이미 받은 41행을 거를 뿐 요청을 발행하지 않는다.** last-response-wins race 가 성립할 요청이 0건이다.<br>⚠ **`KeywordStatsPage.tsx:9-10` 주석이 `useImeSearch` 라는 존재하지 않는 훅 이름을 적는다** — 동작은 옳고 주석만 틀렸다(FS-059 §7 #3) | `/stats/keywords` → '원피스'를 한글로 입력 → **조합 중에는 URL 이 안 바뀌고**, 조합 완료 + 디바운스 후 `?q=원피스` 로 **정확히 한 번** 커밋된다(자모당 1개가 아니다). 조합 중 Enter → submit 되지 않는다. **네트워크 탭에 요청이 0건** — 응답 경합을 재현할 수단 자체가 없다. ⚠ **BE-059 §7.4 — `?q=` 서버 필터를 도입하면 이 성질이 사라지고 그때 처음으로 경합이 생긴다** | 종속 |
| FEEDBACK-02 | FEEDBACK | N/A | **파괴적/비가역 액션이 없다.** 서버 쓰기 0건이고 상태 변경은 전부 URL 조회 조건이며 내보내기는 파일 생성이라 되돌릴 것이 없다. ⚠ **이 화면이 지시하는 행동('동의어를 건다')은 화면에 경로가 없다**(FS-059 §7 #12) — 있었다면 이 요구의 대상이 됐을 수 있다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다. **검색 입력은 폼이 아니다**: 조합이 끝나면 디바운스 후 URL 에 커밋되므로 '미저장 상태'가 존재하지 않는다(`useDebouncedSearch` 의 미확정 문자열은 최대 ~300ms 산다). 잃을 입력이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **modal 이 없다.** `Modal`/`ConfirmDialog` 를 import 하지 않는다. 카드·배지·배너·토스트뿐이다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다** — 내보내기 성공/실패(`useCsvExport.ts:75,82`). `useToast`(`:17,40`)를 통해 앱 공용 `ToastProvider` 의 항상 마운트된 live region 을 소비한다. **자체 live region 을 만들지 않는다** | 판정은 `ToastProvider` 소유 문서를 따른다. 재현: '엑셀 내보내기' → 성공 토스트 announce | 종속 |
| A11Y-02 | A11Y | N/A | **Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | 상속 | **폼 컨트롤이 실재한다** — `SelectField`(비교 `StatsFilterBar.tsx:171` · 세그먼트 `:193` · 페이지당 `StatsTable.tsx:195`) · **`SearchField`**(`:211`) · `DateRangeField`(`:151`). **DS 가 field-association 을 자동 배선한다**: `DateRangeField.tsx:45` 가 `aria-invalid` 를 **항상** `aria-describedby` 와 짝지어 내보내고 유효할 때는 둘 다 부여하지 않는다(`:9-11` 이 A11Y-11 을 명시적 근거로 든다). 에러 `<p>` 는 `role="alert"` + 그 id(`:94-97`). **required 필드가 0개**이므로 그 절은 대상이 없다. 손으로 만든 폼 컨트롤 0개 — `pages/stats/**` 에서 `aria-invalid` grep = 0(짝 없는 것도 0) | 판정은 DS(`DateRangeField`·`SelectField`·`SearchField`) 소유 문서를 따른다. 재현: `?preset=custom&start=2026-07-16&end=2026-07-01` → 두 date input 이 `aria-invalid="true"` + `aria-describedby`→`role="alert"` `<p>` id. **`stats-screens.test.tsx:125-136` 이 메시지 1회를 고정** | 종속 |
| A11Y-12 | A11Y | 직접 | **요구의 appliesTo 표면(공유 `filterItemStyle` 을 쓰는 토글 필터)이 실재하고 옳다.** 기간 프리셋 7개가 `filterItemStyle(active)`(`StatsFilterBar.tsx:16,85-90`)를 재사용하며 **`aria-pressed={active}`**(`:135`)로만 선택을 말한다. **`aria-current` 를 쓰지 않는다** — `pages/stats/**` 에서 grep = **주석 1건뿐**(`:7`). 이 화면이 그 바를 소비하는 자리는 `KeywordStatsPage.tsx:248-254`(→ `StatsPageShell.tsx:112-121`) | `/stats/keywords` → 프리셋 7개 전부 `aria-pressed`(활성 1개 true). `aria-current` grep = 0(주석 제외) | pass |
| MOTION-01 | MOTION | N/A | **Modal 이 없다**(FEEDBACK-06 과 같은 사유) | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | 상속 | **표면이 실재한다 — 내보내기 결과로 토스트를 띄운다**(`useCsvExport.ts:75,82`). **요구는 이제 충족돼 있다**(PR #26): `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`) + keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), enter `:26-27`/`:109-119`. **요구가 명시한 수치를 그대로 만족한다** — `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`component.overlay` recipe `tokens/tokens.json:1298-1307` · `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조로 동등 달성했다. reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 성공 토스트를 dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`·`Toast` 소유 문서를 따른다. **이 화면 코드로 결정되지 않는다** | 종속 |
| MOTION-03 | MOTION | 상속 | **자체 `transition`·`animation`·`transform` 선언이 0건**이다. 소비하는 모션은 ① 스켈레톤 펄스 ② 토스트 — 전부 DS 소유. 프리셋·정렬·지표 전환과 **검색 결과 갱신**이 전부 즉시 반영된다(모션 없음) | 판정은 글로벌 Motion config · `ui.css` · `ToggleSwitch.css` 소유 문서를 따른다. `transition`/`animation` grep = 0 | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:325`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 아래에서 렌더된다. **자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `StatsPageShell.tsx:109` 의 `<div style={pageStyle}>` | `/stats/keywords` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/stats/keywords` 는 `nav-config.ts:203` 의 **잎**(`['검색어 분석', '/stats/keywords']`)이므로 `findCoveringLeaf`(`:260-278`) → `findNavLabel`(`:297-299`)이 AppHeader `<h1>` 에 **'검색어 분석'** 을 그린다 — 가지 라벨('통계')로 폴백하지 않는다. **in-content `<h1>` 이 없다**(`StatsPageShell.tsx:6-8`) — 제목 소스가 하나뿐이라 **h1 이중 문제가 없다.** GROUND-TRUTH §7 의 '폼/상세 화면 h1 2개'는 성립하지 않는다: **하위 라우트가 없는 잎**이라 '등록/수정' 행위 반영 문제도 없다. 내부 구획은 `<h2>` | `/stats/keywords` → AppHeader 제목이 '검색어 분석'. `document.querySelectorAll('h1').length === 1` | pass |
| IA-04 | IA | 직접 | **충족 — 이 화면이 통계 3화면 중 요구의 템플릿에 가장 가깝다.** ① **toolbar row** — 조회 조건 바(`StatsFilterBar.tsx:122`), **검색·필터가 좌측**(`:126-219`) · **내보내기가 우측**(`:76` `spacerStyle` → `:221-250`) ② **결과 count 요약** — `'전체 41건 중 1–25'`(`StatsTable.tsx:191-201`) + 내보내기의 `(N건)`(`:246`) ③ **SelectionBar** — 대상 없음(bulk 없음) ④ **table**(`:131`) ⑤ **Pagination**(`:228`) — **41행 ÷ 25 = 2페이지라 실제로 렌더된다.** '등록/추가'의 부재는 옳다. ⚠ count 요약이 표 **아래**이나 acceptanceCheck('count 요약을 보임')는 충족 | `/stats/keywords` → 검색·필터 좌측, 내보내기 우상단, '전체 41건 중 1–25', **Pagination 2페이지가 실제로 보인다** — 통계 3화면 중 유일 | pass |
| IA-05 | IA | N/A | **create/edit 폼이 없다** — `/stats/keywords` 는 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/stats/keywords/*` 가 0건). 만들거나 고칠 엔티티가 없다. `App.tsx:319` 주석이 섹션 설계를 명시 | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — 이 화면의 강점이며, 검색어까지 URL 에 있다.** `useStatsParams.ts:35,157` 이 `useSearchParams` 로 **조회 조건 전체를 URL 에 싣는다**: `preset` · `start`/`end` · `compare` · `segment` · **`q`(검색어)** · `metric` · `sort`/`dir` · `page` · `size`. 화면 로컬 `useState` 는 **'오늘'의 고정값**(`:162`)과 **검색 입력의 미확정 문자열**(`useDebouncedSearch.ts:55` — 최대 ~300ms) 둘뿐이다. 기본값이면 파라미터를 지워 정규화(`:203-204,214`) — 빈 검색어는 `q` 를 지운다(`:277`). 조건이 바뀌면 page 되돌림(`:216`). **외부(뒤로가기·필터 초기화)가 검색어를 바꾸면 입력창도 따라간다**(`useDebouncedSearch.ts:76-80`).<br>**⚠ GROUND-TRUTH §3 정정**: '통계가 `useListState` 를 경유해 소비한다'는 기술은 **코드와 다르다.** `useStatsParams` 는 `useListState` 를 import 하지 않는다 — `shared/crud` 에서 가져오는 것은 **`parseFilter` 하나뿐**(`:37`)이다. `:16-33` 이 **왜 공유본을 쓰지 않는지**를 네 이유로 명시한다(2축 정렬 · page-size 부재 · preset↔custom 관계 · 파라미터별 page 정책 차이). **`useDebouncedSearch` 는 `StatsFilterBar` 가 소비하지 `useStatsParams` 가 아니다**(`:31-32` 가 그 분리를 명시: '사본을 들 이유가 있는 것과 없는 것을 갈랐다') <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 pass 는 이전 기준에서 `page` 축이 조용히 깨진 채였다.** `StatsFilterBar.tsx:118` 이 `useDebouncedSearch` 를 **검색 입력 유무와 무관하게** 걸고 그 훅이 **마운트 직후에도 한 번 커밋**하므로, 그 커밋이 `setKeyword` 를 통과하면 `update` 가 `page` 를 지워(`:216`) **`?page=3` 링크로 들어온 운영자가 250ms 뒤 1페이지로 튕겼다 — 통계 6화면 전부.** 형제 문서 3벌(NFR-054·055·056)이 그것을 `gap` 으로 잡았고, 이 문서는 그 축을 놓쳤다. **커밋 `6acb235` 가 고쳤다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`(근거 주석 `:275-285`). 회귀 테스트 `useStatsParams.test.tsx:222-290` — `StatsFilterBar` 배선 재현 하네스(`:231`) + page 보존 2건 + '가드가 과하지 않다' 1건(`:287`). **로그 섹션의 같은 결함도 함께 고쳐졌다**(`list-state.ts:224` — NFR-060 §2 IA-13). **세 벌(`useListState`·통계·로그)이 한 규칙으로 정렬됐다.** | `/stats/keywords` → '지난 달' → '결과 없음' → 검색어 '코트' → 정렬 '클릭률' → 2페이지 → URL 이 `?preset=lastMonth&segment=zeroResult&q=코트&sort=clickRate&dir=desc&page=2`. **F5 → 같은 화면**(검색어까지). **URL 을 동료에게 보내면 같은 화면** — '이 결과 없음 검색어들 좀 봐주세요'가 성립한다. ⚠ `replace:true`(`:219`)라 조건 변경이 history 를 쌓지 않는다 — 의도이며(`:8-10`: '검색어를 한 글자씩 지우면 뒤로가기 20번이 필요해지기 때문') 이 화면엔 상세 라우트가 없어 'detail 후 Back' 시나리오가 성립하지 않는다 | pass |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가, 셸 예외는 `App.tsx` 루트 경계가 잡는다. 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `<RequireAuth>`, mid-session 401 은 `queryClient` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useStatsQuery`)이 그 캐시를 통과한다. **보존할 입력이 없어 재인증 손실이 0이다** — **검색어도 URL 에 있어 `returnUrl` 복원이 조건까지 되살린다** | 판정은 `RequireAuth`·`queryClient`·`session-expiry` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **read 게이팅과 쓰기(export) 게이팅이 둘 다 있다.** ① **read**: `StatsPageShell.tsx:91-104` 가 `can(navPageResourceId('/stats/keywords'), 'read')` 를 확인해 **화면을 그리기 전에** 403 을 낸다 ② **export**: `:119` `canExport={can(resourceId,'export')}` → `StatsFilterBar.tsx:223` 이 false 면 **버튼을 그리지 않는다**(비활성이 아니라 부재 — `StatsPageShell.tsx:11-12`). `export` 는 실재 액션(`resources.ts:31,46`). GROUND-TRUTH §3 의 `useRouteWritePermissions` 소비 7곳에 stats 가 없는 것은 맞다 — 이 화면은 `usePermissions().can` 을 직접 쓴다.<br>⚠ **세 가지 흠**: (a) 앱 공용 `RequirePermission` 과 **이중 게이트**이고 셸이 **공유 `ForbiddenScreen` 이 아닌 자체 문구**를 낸다(FS-059 §7 #8) (b) **`export` 권한이 반출 통제가 아니다** — CSV 를 브라우저가 만들어 요청이 없다. **이 화면의 CSV 는 검색어(사용자 입력·개인정보 가능)를 담으므로 가장 무겁다**(BE-059 §7.2) (c) **프론트 리소스와 서버 권한 축이 다르다.** ⚠ **다만 이 화면을 끄면 실제로 숨겨진다** — 검색어는 다른 화면 어디에도 없다(BE-059 §7.2 #4) | read 를 끈 역할로 deep-link → 403. `export` 를 끈 역할 → 버튼이 **DOM 에 없다**(그러나 검색어는 여전히 화면에 보인다) | pass |
| EXC-04 | EXC | N/A | **write 를 하지 않는다** — 요구의 appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. (GROUND-TRUTH §4 의 `createStoreAdapter` 도 무관하다 — stats 는 `shared/crud` 어댑터 계열을 쓰지 않고 자기 `data-source.ts` 를 갖는다) | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **서버로 나가는 user-initiated write 가 0건**이다 — 중복 제출을 막을 submit/confirm 이 없다. **검색어를 아무리 빨리 쳐도 요청이 0건이다**(클라이언트 필터).<br>(⚠ **관련 사실**: 내보내기에 **동기 중복 실행 락**이 있다 — `useCsvExport.ts:51-52` `if (controllerRef.current !== null) return;`. 요구의 `submitLockRef` 와 같은 결이나 **서버 요청이 아니라 파일 생성**이라 appliesTo 밖이다. 멱등키도 대상이 없다) | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **두 경로 모두 실재하고 옳다.** ① **조회 abort**: `queries.ts:38` `queryFn: ({signal}) => fetcher(signal)` → `fetchKeywordStats(query, signal)`(`data-source.ts:176`) → `loadStats(…, signal, …)` → `wait(readDelayMs(), signal)`(`mock.ts:51`). 화면 이탈 시 abort 되고 **취소된 쿼리는 `error` 를 세팅하지 않으므로** 배너가 뜨지 않는다 ② **내보내기 abort**: `useCsvExport.ts:81` `if (isAbort(cause)) return;` — **공유 predicate `isAbort`(`shared/async`)를 그대로 쓴다**(`:15`). 취소 시 **에러 토스트가 없고**(`:81` 주석: '취소는 실패가 아니다 — 사용자가 고른 것이다') `finally`(`:84-87`)가 `isExporting`/`controllerRef` 를 리셋해 **버튼 state 가 복원된다**. `wait(0, controller.signal)`(`:68`)이 청크 사이에서 중단을 받는다 | 조회 중(400ms 안에) 다른 메뉴로 이동 → 배너·토스트 없음. 내보내기 중 '취소' → 토스트 없이 멈추고 버튼 복원. ⚠ **41행 < 200행이라 청크 루프가 한 번도 양보하지 않아 취소를 누를 틈이 없다** — 코드 대조로만 확인 가능(§3 ERP-12) | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **10** | STATE-02 · STATE-04 · TOKEN-01 · A11Y-12 · IA-01 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **11** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · **COMP-10** · A11Y-01 · A11Y-11 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **8** | FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-02 · MOTION-01 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **1** | STATE-01 |
| **합계** | **30** | 10 + 11 + 8 + 1 = **30** ✔ |

> **★ 이번 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집힌 P0 판정은 없다 — 이 표의 30건은 그대로다.** 그러나 **P0 표 밖에서 세 건이 뒤집혔다**, 전부 이 문서가 이관한 것이 이행된 결과다:
> ① **ERP-05 `gap`/`부분 pass` → `pass`**(§3) — `527fc1b` 이 범위 요약·크기 선택을 DS `Pagination` 으로 수렴하고 자작 사본을 지웠다. **`role="status"` announce 가 생겼고**(`Pagination.tsx:171-172`) 그 결과 **A11Y-16 의 미충족이 하나 줄었다**.
> ② **TOKEN-13 주석 오류 → 종결**(§3 · §5) — `StatsTrendCard.tsx:8-15` 와 `ShareBarList.tsx:7-11` 이 'chart.series 가 2개뿐' 이라는 거짓 전제를 철회하고 참인 근거로 갈아 적었다.
> ③ **IA-13 의 `page` 결함**(형제 문서 3벌이 `gap` 으로 잡았고 이 화면도 같은 코드를 공유했다) — `6acb235` 의 가드(`useStatsParams.ts:288`)로 해소.
> ④ **CSV 수식 주입 → 해소**(§4.6) — `ebb0e4c`(`download.ts:40-44`). **이것이 이 화면의 가장 중대했던 결함이었고 P0 표 밖이었다.**
> **P0 표가 이 화면의 변화를 담지 못한다는 사실 자체는 그대로다.**
>
> **P0 gap 1건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 그 1건은 **화면의 실수가 아니라 요구 간 모순**이다(§4.5). **해소는 `packages/ui` 계약에 막혀 있다**(§5 #2).
> **N/A 가 8건으로 형제 화면(9건)보다 하나 적다** — **COMP-10 이 이 화면에서만 표면을 갖기 때문이다**(검색 입력). 그것이 `종속` 으로 11건이 됐다.
> **⚠ 이 화면의 가장 중대했던 결함은 이 표에 없었다 — 그리고 그것이 해소된 지금도 이 표는 움직이지 않는다.** **CSV 수식 주입**(BE-059 §7.3)은 quality-bar 의 어느 P0 에도 대응하지 않아, 결함일 때도 해소될 때도 §2.1 의 건수에 나타나지 않는다. **기준 `a5c2639` 에서 해소됐다**(`ebb0e4c` — `download.ts:40-44`). §4.6 이 그 사실을 기록한다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족 — 그러나 그 충족이 §2 STATE-01 gap 의 원인이다.** `queries.ts:40` `keepPreviousData` 가 조건 변경 중 이전 결과를 유지해 표가 빈칸으로 깜빡이지 않는다. **두 요구가 같은 코드 한 줄을 반대로 평가한다** — §4.5 | 기간을 바꾸는 동안 표·차트가 blank 되지 않는다 | pass |
| **STATE-05** | P1 | **충족 — 통계 6화면 중 3분기가 전부 성립하는 유일한 화면이다.** `KeywordStatsPage.tsx:293-304` 가 `StatsEmpty` 에 **`hasQuery`·`onClearSearch`·`hasActiveFilters`·`onResetFilters` 를 전부** 넘긴다(`:295` 주석: '3분기 — 「검색해서 안 나온 것」과 「필터로 걸러진 것」은 복구 방법이 다르다'). → `Empty.tsx:52-57` `resolveMode` 가 **검색 > 필터 > 진짜** 우선순위로 가른다: ① `?q=없는검색어` → '조건에 맞는 검색어**가** 없습니다' + **'검색 지우기'** ② `?segment=zeroResult` 로 0행 → '필터에 맞는 …' + **'필터 초기화'** ③ `?empty=` → '**집계**된 검색어가 없습니다'. `createVerb='집계'`(`StatsEmpty.tsx:37`) — '등록된 검색어가 없습니다'는 틀린 문장이고 생성 CTA 도 없다(만들 수 있는 것이 아니다 — `:5-6`) | `?q=존재하지않는검색어` → '조건에 맞는 검색어가 없습니다' + '검색 지우기' 버튼. 클릭 → `q` 가 URL 에서 사라지고 41행 복귀. `role="status"`(`Empty.tsx:104`) | pass |
| STATE-06 | P1 | **N/A(표면 부재).** write 가 0건이라 invalidate 할 대상이 없다. 쿼리 키를 다른 화면과 공유하지 않는다. **집계 신선도 계약**(BE-059 §7.7 #1)이 정해질 때 판정 가능하다 | 재현할 표면 없음 | N/A |
| COMP-03 | P1 | **충족.** 검색이 DS `<SearchField>` molecule 이다(`StatsFilterBar.tsx:211-218`) — raw `<input type="search">` + 절대 위치 아이콘 재구현이 아니다. `pages/stats/**` 에서 `type="search"` grep = 0 | `/stats/keywords` → 검색 입력이 `SearchField`. `type="search"` grep = 0 | pass |
| COMP-06 | P1 | **충족 — 그리고 이 화면에서 취지가 실제로 성립한다.** 스켈레톤 행 수 = **페이지 크기**(`StatsTable.tsx:164`), 칸 수 = **실제 컬럼 수**(`:178`). 하드코딩 `length:5` 없음. **41행 ≥ 기본 25행이라 스켈레톤 25행 → 완료 25행으로 레이아웃이 튀지 않는다** — 통계 3화면 중 유일하다(주문 통계는 기간의 날 수 · 유입 분석은 7행이라 25→7로 급감한다) | `?delay=3000` → 스켈레톤 25행 → 완료 25행. 레이아웃 불변 | pass |
| COMP-09 | P2 | **미충족 — 이 화면에서 실제 위험이다.** `KeywordCell`(`KeywordStatsPage.tsx:61-68`)이 `row.keyword` 를 그대로 렌더하고 `keywordCellStyle`(`:54-58`)에 `overflow`/`textOverflow`/`maxInlineSize` 가 **없다**. **검색어는 사용자 입력이라 길이 상한이 없다** — 손님이 문장을 통째로 검색하면(실제로 흔하다: '겨울에 입을 만한 따뜻한 오버핏 코트 추천') 그 셀이 표를 밀어낸다. 형제 컴포넌트인 `ShareBarList` 는 라벨에 ellipsis 를 갖는데(`ShareBarList.tsx:50-52` `overflow:'hidden'` · `textOverflow:'ellipsis'` · `whiteSpace:'nowrap'`) **이 셀에는 없다.** 가로 스크롤 컨테이너(`StatsTable.tsx:28-32`)가 페이지 파괴는 막으나 **컬럼 폭이 무한히 늘어나는 것은 막지 못한다** | 200자 검색어를 픽스처에 넣으면 그 행이 표 폭을 밀어낸다. `ShareBarList.tsx:50-52` 와 `KeywordStatsPage.tsx:54-58` 를 대조 | gap |
| COMP-11 | P1 | **대체로 충족.** ① **preset 7종**(`period.ts:134-166`) ② **`start ≤ end` 강제** — `periodErrorOf`(`:200-206`) + `StatsPageShell.tsx:130` 이 **본문을 그리지 않는다** ③ **인라인 검증 메시지** — 배너가 아니라 **틀린 입력 옆에** `role="alert"`(`DateRangeField.tsx:94-97`). `StatsPageShell.tsx:125-129` 가 배너 중복을 뺀 이유를 명시 ④ **URL 반영**(§2 IA-13) ⑤ **ko-KR 포맷** — `formatPeriodLabel`(`period.ts:216-220`). **미충족**: 공유 `DateRangeFilter` 가 아니라 이 섹션의 조합 · **기간 상한 없음**(BE-059 §7.7 #2) | `?preset=custom&start=2026-07-16&end=2026-07-01` → 검증 메시지 **1회**, 본문 미렌더. **`stats-screens.test.tsx:125-136` 이 고정** | pass |
| ERP-04 | P1 | **충족 — 이 화면에서 정렬이 본체다.** `KeywordStatsPage.tsx:5-6` 이 명시한다: '표의 모든 수치 열이 정렬 가능하고 기본 정렬이 검색수 내림차순이다'. `StatsTable.tsx:127-155`: clickable header · **`aria-sort`**(`:144`, `th` 가 갖는다) · 방향 인디케이터 ▲▼↕(`:157-159`, `aria-hidden`) · keyboard · sr-only 설명(`:160-162`). numeric 컬럼 6개가 우측 정렬 + tabular-nums(`:126`). 재클릭 시 방향 반전(`useStatsParams.ts:308-315`). **안정 정렬** + tie 를 index 로(`table.ts:28-32`), **문자열은 `localeCompare('ko-KR')`(`:36`) — 검색어가 한글이라 이것이 핵심이다**('가나다' 순이 코드포인트 순과 다르다).<br>⚠ **'검색결과 수' 열의 표시와 정렬이 어긋난다** — 참조검색어 없음 행의 `render`/`csv` 는 `'—'` 인데(`KeywordStatsPage.tsx:92-93`) **`sortValue` 는 `row.resultCount`(=0)를 그대로 낸다**(`:94`). 오름차순 정렬하면 '—' 행이 결과 0개 행들 사이에 낀다 — 화면은 '결과 수가 성립하지 않는다'고 해 놓고 정렬에서는 0으로 취급한다(FS-059 §7 #6) | `/stats/keywords` → '클릭률' 헤더 클릭 → `aria-sort="descending"` + ▼ + URL `?sort=clickRate&dir=desc`. '검색어' 열 정렬 → 한글 '가나다' 순. **'검색결과 수' 오름차순 → '참조검색어 없음' 이 0개 행들 사이에 낀다** | 부분 pass |
| **ERP-05** | P1 | **충족 — 이전 기준의 gap 이 해소됐고, 이 화면에서 이득이 가장 크다.** **★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다 — 커밋 `527fc1b` `refactor(admin): ERP-05 범위 요약을 DS 로 수렴하고 자작 2벌을 지운다`.** 이전 기준에서 이 화면은 범위 요약과 크기 선택을 **자기가 그렸고**, `Pagination` 에 `page`·`totalPages`·`label`·`onChange` 만 넘겨 **DS 의 opt-in 스위치를 끈 채**(`Pagination.tsx:112` `showRange = pageSize > 0` → false) 사본을 세웠다. **지금은 DS 가 그린다** — `StatsTable.tsx:195-204` 이 `page`·`totalPages`·**`total={rows.length}`**·**`pageSize`**·**`pageSizeOptions={PAGE_SIZE_OPTIONS}`**·`label`·`onChange`·**`onPageSizeChange`** 를 전부 넘긴다. 따라서 `showRange`(`Pagination.tsx:112`)와 `showSizeSelect`(`:113`)가 **둘 다 true** 가 되고 `:171-172` 의 **`<p className="tds-pagination-bar__summary" role="status">{rangeTextOf(total, page, pageSize)}</p>`** 와 `:177-194` 의 크기 선택기가 렌더된다. **요구의 세 절이 전부 DS 표면에서 충족된다**: ① total-range ② page-size selector ③ range math 의 경계 단언(`rangeTextOf` `Pagination.tsx:41-47` — 마지막 페이지 잘림 `:46` · 범위 밖 page clamp `:43-45`, 근거 주석 `:36-39`).<br>**그리고 사본이 지워졌다** — `table.ts:58-60` 이 그 이력을 남긴다: '[ERP-05] 범위 요약문(전체 1,234건 중 26–50)은 여기 있었다. DS Pagination 이 pageSize 를 받으면 **같은 것을 그리고(수식이 동치다) 경계 단언까지 갖고 있으므로**, 사본을 지우고 그쪽을 쓴다'. `StatsTable.tsx:191-194` 도 같다 — '**같은 것을 두 벌 그리면 수식이 갈라진다**(실제로 로그 쪽 사본은 clamp 가 없어 범위 밖 page 에서 *전체 3건 중 81–80* 같은 헛것을 그렸다). **page 의 clamp 도 DS 가 한다** — 여기서 `Math.min` 을 다시 걸 필요가 없다'. **이전 기준이 지적한 `rangeTextOf` 두 벌이 한 벌로 수렴했다.**<br>⚠ **형제 섹션은 아직이다** — 로그 4화면은 여전히 자기 `SummaryText` 를 그리고 `Pagination` 에 `pageSize` 를 넘기지 않는다(NFR-060 §3 ERP-05). **즉 이 수렴은 통계 섹션에서만 일어났다.**<br>**이 화면에서 이득이 가장 큰 이유**: **41행 ÷ 25 = 2페이지라 `Pagination` 이 실제로 렌더되는 유일한 통계 화면이다.** 이전 기준에서는 운영자가 실제로 페이지를 넘기는데도 AT 가 '지금 몇 번째 행을 보는지' 듣지 못했다 — 주문·유입에서 이론적이던 gap 이 여기서는 실재했다. **그 실재하던 손해가 사라졌다.** | `/stats/keywords` → 표 아래에 **`.tds-pagination-bar`** 가 렌더된다: 범위 요약 `<p role="status">전체 N건 중 x–y</p>` + '페이지당' 크기 선택 + 번호 줄. **페이지를 넘기면 `role="status"` 가 새 범위를 announce 한다.** `StatsTable.tsx` 에 `rangeTextOf` grep = 0 · `SelectField` grep = 0(사본이 없다). 판정의 나머지는 DS `Pagination` 소유 문서를 따른다. **2페이지가 실제로 보이고 '2' 클릭 → 26–41행 + 범위 announce** | pass |
| ERP-03 | P1 | **부분 충족.** **sticky thead 는 있다** — `StatsTable.tsx:35-40` `stickyHeadStyle`(`position:'sticky'` · `insetBlockStart:0` · `zIndex:1`)를 `:121-123` 이 먹인다. **이 화면에서 실제로 값이 있다** — 25행이 기본이라 세로 스크롤이 일어난다(유입 분석 7행과 대조). **미충족**: SelectionBar 없음(bulk 없음) · on-scroll elevation 토큰 미사용 · **`zIndex` 가 리터럴 1**(토큰이 아니다 — `:42`) | `?size=100` → 41행 스크롤 시 헤더가 남는다. `zIndex: 1` 이 토큰이 아니다 | 부분 pass |
| ERP-07 | P1 | **N/A(표면 부재).** 이 화면의 표에 **금액 컬럼이 없다** — 지표가 건수와 비율뿐이다(`KeywordStatsPage.tsx:70-128`). 다만 섹션 규약(`format.ts:12-14`)을 **비율에 적용한다**: 헤더 '클릭률 (%)'·'구매전환율 (%)'(`:105,122`)이고 값은 `formatPercentValue`(숫자만, `:108,124`). 유입 분석(NFR-058)이 이 축의 당사자다 | 재현할 표면 없음(금액 컬럼 부재) | N/A |
| ERP-08 | P1 | **충족.** 표의 모든 숫자가 공유·섹션 포매터를 경유한다 — `formatNumber`(`shared/format`, `KeywordStatsPage.tsx:13,83,92,100,117`) · `formatPercentValue`(`:108,124`) · `formatMetric`(KPI, `StatsKpiRow.tsx:81`) · `formatNumber`(범위 요약 — **기준 `a5c2639` 부터 DS 가 그린다**: `Pagination.tsx:41-47` `rangeTextOf`. 섹션 사본은 지워졌다 — `table.ts:58-60` 이 그 이력을 남긴다). **raw `String()`/`toString()` 이 셀에 없다**(FS-040 의 `String(cell.booked)` 결함이 없다). 상대시간 없음. **`'—'` 는 `NOT_APPLICABLE` 상수다**(`:48`) — 인라인 리터럴이 아니다 | 표 셀에 raw numeric toString 없음 | pass |
| ERP-09 | P2 | **충족 — F3b 수렴의 수혜자다.** '오늘'은 **서울 기준**(`useStatsParams.ts:162` `formatDate(new Date())` → `shared/format.ts:63` `Asia/Seoul` Intl). 달력 산술 앵커는 **UTC 정오** 한 벌(`period.ts:73,77,97,104`), `:9-13` 이 수렴을 기록. `shiftDays`/`dayCount`/`isCalendarDate` 는 `shared/format` 정본을 import(`period.ts:16`). **브라우저 TZ 를 타지 않는다** — FS-040 의 `_shared/calendar.ts` gap 이 성립하지 않는다.<br>**⚠ 이 화면 고유의 위험**: **검색은 밤에도 일어난다.** KST 00:00~09:00 의 검색은 UTC 로 전날이다 — **서버가 `start`/`end` 를 UTC 로 해석하면 매일 9시간치가 전날로 밀린다**(BE-059 §7.8). 프론트는 옳고 **서버 계약이 미정이다**.<br>**잔여**: `today` 가 마운트 시 고정이라 자정을 넘기면 '최근 7일'이 하루 밀린다. `:159-161` 이 근거를 밝힌다(매 렌더 `new Date()` → **무한 재조회**) | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 진입 → **서울 기준 '오늘'로 기간이 잡힌다**. `shared/format.test.ts:90,117` 이 고정 | pass |
| **ERP-12** | P1 | **대체로 충족 — 그리고 §4.6 의 결함이 이 요구 위에서 해소됐다.** ① **현재 필터 조건 전체** — `useCsvExport.ts:35-36` 이 '페이지 자르기 **전** 배열'을 받고 `KeywordStatsPage.tsx:260` 이 `rows`(= 세그먼트·검색어를 적용한 41행 이하, 슬라이스가 아니다)를 넘긴다. **`:160` 주석이 그 설계를 명시**('세그먼트·검색어를 한 곳에서 건다 — 표·KPI·내보내기가 **같은 집합**을 본다') — **ERP-12 의 '현재 필터 조건 전체'가 구조적으로 보장된다** ② **한국어 헤더** — `columns[].header`(`:72,81,89,…`) ③ **값은 표시대로** — `StatsColumn.csv` 가 `render` 와 같은 원천(`:92-93` 이 둘 다 `'—'` 분기를 갖는다). `types.ts:39-53` 이 설계를 명시 ④ **UTF-8 BOM** — `downloadCsv`(`useCsvExport.ts:7,16,73`) ⑤ **scope label** — `'엑셀 내보내기 (N건)'` + `'내보내기는 현재 조건 전체를 담습니다.'`(`StatsFilterBar.tsx:246,254`).<br>**미충족**: (a) **진행률·취소가 도달 불가능하다** — `CHUNK_ROWS=200`(`useCsvExport.ts:21`)인데 **최대 41행**이다. 0%→100%. **통계 3화면 중 가장 크지만 아직 부족하다** — **실제 서버에서 검색어가 수백~수천이면 이 표면이 살아난다**(BE-059 §7.7 #5). 즉 **픽스처의 한계이지 코드의 결함이 아니다** (b) 공유 export 유틸이 아니라 섹션 소유 (c) **`export` 권한이 반출 통제가 아니고, 이 CSV 는 사용자 입력(개인정보 가능)을 담는다**(BE-059 §7.2) **(d) ~~CSV 수식 주입~~ — ✔ 해소됨(기준 `a5c2639` · `download.ts:40-44`). §4.6. 이 요구의 미충족 사유에서 빠진다** | `?segment=zeroResult` → '엑셀 내보내기 (4건)' → 4행 CSV(헤더 '검색어','검색수','검색결과 수','클릭수','클릭률 (%)','구매건수','구매전환율 (%)'), 엑셀에서 한글 정상. **진행률이 보이지 않는다**(41 < 200) | 부분 pass |
| **ERP-13** | P1 | **충족(상속) — 그리고 이 화면에서 3분기가 전부 조사를 탄다.** `StatsEmpty` → `Empty.tsx:16-27` `hasBatchim`/`subjectParticle` 이 label 의 받침으로 '이/가'를 고른다. `label='검색어'`(`KeywordStatsPage.tsx:296`) → '어'는 **받침 없음** → '**가**'. 세 분기 전부: '조건에 맞는 검색어**가** 없습니다' / '필터에 맞는 검색어**가** 없습니다' / '집계된 검색어**가** 없습니다'(`Empty.tsx:71-76`). **리터럴 '이(가)' 를 출하하지 않는다** — `pages/stats/**` 에서 `이(가)`/`을(를)`/`은(는)` grep = 0. (GROUND-TRUTH §2 의 `shared/format.ts:269+` 헬퍼는 `shared/crud` 계열이 쓰고 DS `Empty` 는 **레이어 경계** 때문에 자족 헬퍼를 갖는다 — `Empty.tsx:7-8`. 두 구현이 있으나 경계가 다르다) | `?q=없는것` → '조건에 맞는 검색어**가** 없습니다'(받침 없는 '어' → '가'). 리터럴 조사 grep = 0 | pass |
| ERP-15 | P1 | **충족 — 다만 규모가 픽스처에 묶여 있다.** 표 행 수 = **41**(`data-source.ts:31-74` 의 seed 40 + 참조검색어 없음 1 — `:118-121`). 페이지 크기 상한 100이라 DOM 은 최대 41행. `daily` 는 기간의 날 수(≤365). 넓은 표는 `overflowX:'auto'` 안에서 가로 스크롤(`StatsTable.tsx:28-32,118`). 정렬·페이지·필터가 순수 함수라 n=41 — `useMemo` 가 `rows`/`compareRows` 에 걸려 있다(`KeywordStatsPage.tsx:162-172`). **FS-040 의 'O(셀 × N) 매 렌더 전량 스캔' 위험이 없다.**<br>**⚠ 두 단서**: (a) **기간 상한이 없다** — `?start=1900-01-01&end=2100-01-01` 이면 `eachDay` 가 73,000 을 만들고 `dailyRowsOf`(`data-source.ts:136-168`)가 그 각각에 `distribute` × 4 를 돈다 (b) **실제 검색어는 수백~수천 + 긴 꼬리다**(`:28-30` 이 그 모양을 흉내내려 했다고 밝힌다). 수천이면 `filterKeywordRows`(전량 `toLowerCase().includes()` — `types.ts:124-126`)가 **`useMemo` 로 감싸여 있으나 검색어가 바뀔 때마다 전량을 훑는다.** 그때 서버 필터가 필요해지고 **§2 COMP-10 의 '요청이 없어 경합이 불가능'이라는 성질이 사라진다**(BE-059 §7.4) | 41행 → 즉시. **`?preset=custom&start=1900-01-01&end=2100-01-01` → 73,000 일자 생성 시도**(§5 #5) | 부분 pass |
| A11Y-08 | P1 | **N/A(표면 부재).** row-nav 가 없다 — 표의 행이 클릭 가능하지 않고 detail 로 가는 경로가 없다(`StatsTable.tsx:173-180` 에 `onClick`/`rowNavProps` 0건). ⚠ **그것 자체가 FS-059 §7 #12 의 문제다** — 이 화면이 '동의어를 걸어라' 지시하는데 그 행을 눌러도 아무 일이 없다. 다만 **요구의 appliesTo(row-nav 리스트)에 해당하지 않으므로** 여기서는 N/A 다 | 재현할 표면 없음 | N/A |
| A11Y-09 | P1 | 이 화면의 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(`thStyle`) · `surface-default` 위 `text-muted`(설명 `StatsPageShell.tsx:32` · 힌트 `StatsKpiRow.tsx:44` · 범위 요약 · 라벨 `StatsFilterBar.tsx:69`) · `feedback-success-text`/`feedback-danger-text`(증감 `DeltaText.tsx:19-23`) · **`StatusBadge tone="warning"`('결과 없음' 배지 — `KeywordStatsPage.tsx:65`)** · `chart-label`/`chart-axis`(`LineAreaChart.tsx:166,173,225`) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다. **`StatusBadge tone="warning"` 을 쓰는 통계 화면은 이 화면뿐이다** | 종속 |
| A11Y-16 | P1 | **대체로 충족.** 신규 인터랙티브 표면은 ① 프리셋 토글 ② 정렬 헤더 ③ 검색 입력이며 손으로 그린 것은 ② 뿐이다(①은 공유 스타일 + 네이티브 button, ③은 DS SearchField). **① semantic role**: 네이티브 `<table>`/`<th scope="col">`(`StatsTable.tsx:119-129`) · `<caption>`(숨김, `:132`) · 프리셋 `<ul>/<li>/<button>` — ARIA 를 발명하지 않고 네이티브를 쓴다 **② keyboard**: 전부 `<button>`. 격자가 아니라 표라 화살표 이동이 요구되지 않는다 **③ focus ring**: `tds-ui-focusable` **④ label 연결**: `aria-labelledby`(페이지당 `:210-214`) · `aria-label`(차트 `StatsTrendCard.tsx:100` · 지표 토글 `:75`) · `SearchField label`(`StatsFilterBar.tsx:212`) **⑤ live region**: 빈 상태 `role="status"`(`Empty.tsx:104`) · 진행률 `role="status"`(`StatsFilterBar.tsx:231`) · 에러 `role="alert"`(`StatsCard.tsx:45`) **⑥ 이중 인코딩**: 증감 = 색 + ▲▼ + sr-only 문장 · 프리셋 = 색 + `aria-pressed` · 정렬 = 색 + ▲▼ + `aria-sort` · 범례 = 색 점 + 글자 라벨 · **'결과 없음' = 톤 + 문구 라벨**(`KeywordStatsPage.tsx:65` — `:60` 이 그 의도를 명시: '색이 아니라 문구가 말한다') **⑦ aria-busy**: 표(`StatsTable.tsx:119`) · 카드(`StatsCard.tsx:35`).<br>**미충족 2건**(이전 기준 3건에서 줄었다): ~~(a) 범위 요약에 `role="status"` 가 없다 — 이 화면에서 실재 손해다~~ → **✔ 해소됨(기준 `a5c2639` · `527fc1b`)** — `StatsTable.tsx:195-204` 이 `total`·`pageSize` 를 넘겨 DS 가 `Pagination.tsx:171-172` 의 `<p role="status">` 로 범위를 그린다. **이 화면은 페이지가 실제로 넘어가는 유일한 통계 화면이라 그 손해가 실재했고, 그것이 사라졌다**(§3 ERP-05) (b) **조건을 바꿔 재조회하는 동안 아무것도 announce 되지 않는다**(§2 STATE-01) (c) **검색 결과 건수가 announce 되지 않는다** — 검색어를 쳐서 41행이 3행으로 줄어도 live region 이 없다(범위 요약이 `role="status"` 였다면 자동으로 해결됐을 것이다) | 스크린리더로 탐색 → 표 구조·정렬 상태·증감·'결과 없음' 배지가 전부 읽힌다. 색각 이상 시뮬레이션 → **'결과 없음'이 문구로 구별된다**. **검색어를 쳐도, 페이지를 넘겨도 침묵한다** | 부분 pass |
| IA-03 | P1 | **N/A** — 이 화면은 nav 잎이다(`nav-config.ts:203`). non-top-level route 가 아니므로 breadcrumb 요구의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족.** ① **표가 bounded 가로 스크롤 컨테이너 안에** — `StatsTable.tsx:28-32,118`. **이 화면에서 특히 중요하다** — 컬럼 7개 + **길이 상한 없는 검색어**(§3 COMP-09) ② **KPI 반응형 그리드** — `StatsKpiRow.tsx:21-23` → 좁으면 1열 ③ **조회 조건 바 wrap** — `StatsFilterBar.tsx:48,54` ④ **표 푸터 wrap**(`StatsTable.tsx:59`). **미충족**: 최소 지원 폭 선언 없음 · identity 컬럼(검색어) sticky 없음 · 정렬 헤더 touch-target 미검증(`sortButtonStyle` 에 최소 크기 없음 — `:45-56`) · **검색어 셀 truncation 없음**(§3 COMP-09) | 768px·375px 에서 → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다. KPI 5장이 1열로 접힌다. **가로 스크롤 시 '검색어' 열이 함께 밀려 나간다** | 부분 pass |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 조회에 상한이 없다. **다만 FS-040 과 달리 거짓 사실을 보이지는 않는다**: `isFirstLoad` 가 참인 채로 스켈레톤이 영원히 돈다 | 응답하지 않는 백엔드를 붙이면 스켈레톤이 무한히 돈다. `?delay=999999` 로 근사 재현 | gap |
| EXC-06 | P1 | **미충족.** `queries.ts:47` `query.isError ? '통계를 불러오지 못했습니다.' : ''` 하나로 401/403/429/500/504 가 같은 문구다. 429 의 `Retry-After` 미소비. **원문 비노출(`:46`)은 옳다 — 이 화면에서는 그 규칙이 개인정보 보호이기도 하다**: 서버 원문이 새면 **거르지 못한 검색어**가 에러 문구에 묻어 나올 수 있다(BE-059 §7.6) | `?status=list:403` 과 `?status=list:500` 이 **같은 배너** | gap |
| EXC-10 | P1 | **N/A** — bulk 작업이 없다(선택 표면 0). 내보내기는 단일 작업이며 부분 실패 개념이 없다 | 재현할 표면 없음 | N/A |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 | 오프라인 전환 → '통계를 불러오지 못했습니다.' | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다. **집계에는 '대상 없음'이 성립하지 않는다** — 0건이면 200 + 빈 배열이다(BE-059 §5) | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-17 | P2 | **충족(부분).** 이 화면의 사용자 대상 copy 가 **whole string + named interpolation** 이다 — `Empty.tsx:71-76` 이 조사까지 포함해 문장을 통째로 조립하고, KPI 힌트·설명이 전부 완성 문장이다(`KeywordStatsPage.tsx:185,193,203,211,219,249`). **문법 fragment 연결이 없다.** ⚠ 단 `'—'`(`:48`)는 로케일 무관 기호이고 `NOT_APPLICABLE` 상수로 뽑혀 있다 | 신규 copy 가 fragment 연결이 아니다 | pass |
| EXC-18 | P1 | **N/A** — bulk·다중 선택이 없다. 내보내기는 비파괴적이며 `useCsvExport.ts:51-52` 의 락이 중복 실행만 막는다 | 재현할 표면 없음 | N/A |
| TOKEN-13 | P2 | **충족 — 그리고 이제 `_shared` 의 주석도 그것을 안다.** `tokens.json:778-888` 에 `chart.series-1..6` + 각 `-fill` 이 **전부 존재하고** `LineAreaChart.tsx:29-44` 가 6계열 전부를 참조한다(`:22-26` 이 TOKEN-13 을 근거로 든다). **★ 기준 갱신(`4b805ad` → `a5c2639`) — 이전 기준의 '주석이 사실과 다르다' 는 해소됐다.** 두 파일이 전부 고쳐졌다: `StatsTrendCard.tsx:8-15` 가 이제 '**[계열 색 — 해결됨, 이 카드가 2계열인 건 이제 색 때문이 아니다]** … TOKEN-13 이 chart.series-3..6(+fill)을 tokens.json 에 넣었고 LineAreaChart 가 6계열까지 서로 다른 hue 로 그린다. 즉 **색 제약은 없다**' 라 적고, **결정의 진짜 근거를 새로 댄다** — '이 카드가 답하는 질문이 *한 지표를 두 기간에 걸쳐 견주면 어떤가* 이기 때문이다'(`:11-14`), '다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — **막던 것은 사라졌다**'(`:15`). `ShareBarList.tsx:7-11` 도 같다 — '**⚠ 예전 이 자리엔 구분 가능한 계열 색이 2개뿐이라는 이유가 함께 적혀 있었다. 그 전제는 지금 거짓이다** — TOKEN-13 이 chart.series-3..6 을 추가해 6계열까지 서로 다른 hue 가 나온다 … **색이 모자라서 단색을 고른 게 아니라, 이 데이터에는 단색 길이 비교가 맞아서** 고른 것이다. 색이 늘었다고 파이로 되돌릴 이유가 되지 않는다'. **즉 두 결정은 유지되고 근거만 참인 것으로 교체됐다** — 이 문서가 요구한 '주석 정정 또는 결정 재검토' 중 **전자가 이행됐고, 그 과정에서 결정이 재검토돼 다른 근거 위에 다시 섰다**. 이 화면은 `ShareBarList` 를 쓰지 않으므로 그 주석의 손해가 원래 유입 분석보다 작았다 — 이 화면의 차트는 2계열(현재·비교)이면 충분하다. **그리고 `StatsTrendCard.tsx:15` 가 '다계열이 필요해지면 그냥 series 에 더 넣으면 된다'고 명시하므로, '검색어별 추이'(FS-059 §7 #15)를 도입할 때 걸림돌이 없다** — 이전 기준이 우려한 그 지점이 코드에서 먼저 해소됐다 | `tokens.json` 에 `series-3`~`series-6` 존재(실측). **`StatsTrendCard.tsx:8-15` 가 그것을 인정한다** | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 집계 응답 p95 | **미정** — 백엔드 부재 | 픽스처 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts`)은 개발용 지연이며 성능 예산이 아니다.** `mock.ts:24-27` 이 `?delay=` 로 덮어쓴다 |
| **재조회 횟수** | **조건 조합당 1회** | `queryKey` 에 기간·비교(`KeywordStatsPage.tsx:151`) | 프리셋 7개를 훑으면 7회. 되돌아오면 캐시가 받는다 |
| **검색 전환** | **0회** | `queryKey` 에 `keyword` 가 **없다** | **이 화면의 결정적 성질이다** — 타자를 쳐도 요청이 0건. `filterKeywordRows` 가 41행을 즉시 거른다. **§2 COMP-10 의 '응답 경합이 원리적으로 불가능'이 여기서 나온다.** BE-059 §7.4 가 서버 필터 도입의 손해를 판정한다 |
| 세그먼트 전환 | **0회** | `queryKey` 에 `segment` 가 **없다** | 클라이언트 필터 |
| 지표·정렬·페이지 전환 | **0회** | 전부 클라이언트 | 표·차트를 다시 그릴 뿐 |
| DOM 규모 | **상한 = 페이지 크기(≤100 · 실제 41행) + 카드 5장** | `useStatsParams.ts:50` · `data-source.ts:31-74` | **41행은 픽스처 상수다.** 실제 서버는 수백~수천(BE-059 §7.7 #5) |
| CPU | **O(n log n) · n = 41** | `sortRows`(`table.ts:15-40`) 매 렌더 · `filterKeywordRows` 는 `useMemo`(`KeywordStatsPage.tsx:162-172`) | **필터는 메모돼 있고 정렬은 안 돼 있으나 n 이 41이라 무의미.** 수천이 되면 재판정 |
| 메모리 | 검색어 전량(41 × 2 기간) + 일자별(기간의 날 수 × 2) | `fetchKeywordStats` 가 넷을 함께 낸다 | **기간 상한이 없어 이론상 73,000 일자**(§5 #5) |
| 번들 | **이 화면 전용 의존 0** | 차트 라이브러리 미도입 | ⚠ **FS-040 과 달리 대가가 크지 않다** — 차트가 `role="img"` + 서술형 `aria-label` 을 갖고 상호작용이 없다. 다만 **x축 라벨 상한이 없다**(§5 #6) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 집계 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). **조회 조건 바가 남아 복구 가능.** 단 status 분기 없음(§3 EXC-06) · 참조 코드 없음(§5 #4) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤. **거짓 빈 상태가 없다.** **스켈레톤 25행 = 실제 25행이라 레이아웃이 튀지 않는다**(§3 COMP-06) |
| **기간을 바꾸는 중** | **새 기간의 로딩임을 알 수 있어야** | ✖ **이전 기간의 KPI·표가 새 기간 라벨 아래 남는다.** ⚠ **같은 바의 검색어는 즉시 반영돼 두 컨트롤의 속도가 다르다**(§2 STATE-01 · §4.5) |
| 검색 결과 0건 | 검색 분기 빈 상태 + 검색 지우기 | ✔ **3분기 전부 성립하는 유일한 통계 화면**(§3 STATE-05) |
| 집계 0건 | 빈 상태 | ✔ 최초 로드와 구별된다. `stats-screens.test.tsx:115-123` 이 고정 |
| 종료일 < 시작일 | 검증 오류 | ✔ 입력칸 옆 `role="alert"`, **정확히 1회**, 본문 미렌더(§3 COMP-11) |
| 한글 IME 입력 | 완성 시 1회만 커밋 | ✔ (§2 COMP-10) — **조합 중 Enter 도 막힌다**(ref 동기 판정) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 스켈레톤(§3 EXC-05). **거짓말은 아니다** |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **검색어까지 URL 에 있어 `returnUrl` 복원이 조건을 되살린다** |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | 토스트 없이 중단 + state 복원 | ✔ 코드는 옳다(§2 EXC-09). **단 41행이라 누를 틈이 없다**(§3 ERP-12) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| **서버가 같은 검색어를 두 행으로 냄** | 방어 | ✖ **`rowKey={(row)=>row.id}`(`KeywordStatsPage.tsx:284`) React key 충돌로 행이 사라지거나 뒤섞인다**(BE-059 §3.2 #1). **정규화 정책이 없다**(BE-059 §7.9 #2) |
| **서버가 `isUnknownReferrer` 를 안 줌** | 방어 | ✖ **그 행이 '결과 없음' KPI 에 섞여 운영자가 손댈 수 없는 것을 손댈 것으로 센다**(BE-059 §3.2 #3) |
| **서버가 `clickCount > searchCount` 를 냄** | 방어 | ✖ **클릭률 137.4% 가 경고 없이 표에 뜬다**(BE-059 §3.2 #8) |
| **손님이 `=HYPERLINK(...)` 를 검색함** | 방어 | ✔ **화면에는 원문이 보이고**(그것이 이 화면의 목적이다) **CSV 에는 `'=HYPERLINK(…)` 로 무력화돼 나간다** — Excel 이 텍스트로 읽는다(`download.ts:40-44` · 기준 `a5c2639`). §4.6 |

### 4.3 픽스처의 성질 (판정에 영향)

| 항목 | 상태 |
|---|---|
| 결정성 | ✔ 검색어 + 기간 시작일 seed(`data-source.ts:77`) — **같은 조건은 언제나 같은 값** |
| 현실성 | ✔ **긴 꼬리 분포**(`:28-30`: '상위 몇 개가 대부분을 먹고 긴 꼬리가 붙는다. 평평한 픽스처는 「순위」라는 이 화면의 본질을 확인할 수 없게 만든다') · 결과 없음 4개의 검색수가 **꼬리 수준이 아니다**(`:68-69`: '메울 값어치가 있는 자리다') · **결과 0개면 클릭·구매가 0**(`:87-89`) |
| 불변식 유지 | ✔ `distribute`(`:125-128`)로 표의 합계를 일자에 흩뿌려 **일자 합 = 표 합**을 구조적으로 보장. **지표마다 다른 seed 의 가중치**(`:138-140`)를 쓰는 이유도 명시(`:130-134`: 하나로 나누면 전환율이 직선이 된다) |
| 재현 스위치 | ✔ `?delay=` · `?fail=` · `?empty=` — **기존 문법 그대로**(`mock.ts:6-11`) |
| **검색어 40개가 상수** | ⚠ `data-source.ts:31-74`. **실제는 수백~수천 + 긴 꼬리.** §3 ERP-12(진행률)·ERP-15(성능)·§2 COMP-10(경합 부재)·BE-059 §7.4(서버 필터) 판정이 **전부 이 규모에 달려 있다** |
| **⚠ 픽스처에 악성 검색어가 없다** | `KEYWORD_SEEDS` 가 전부 정상 한글 상품명이다. **그래서 §4.6 의 방어는 픽스처로 확증되지 않는다** — 그것을 지키는 것은 `shared/download.test.ts:15-86` 이다. 그 파일이 사라지면 결함이 조용히 되살아나고 이 화면이 첫 운반체가 된다 |

### 4.4 이 화면이 답하지 못하는 운영 질문

| 질문 | 현재 |
|---|---|
| '**동의어를 어디서 거나**' | **답이 없다 — 이 화면이 지시한 행동인데.** 설명(`:249`)과 KPI 힌트(`:203`)가 '상품을 추가하거나 동의어를 걸면 줄어듭니다'라 하는데 **손잡이가 없고 동의어 관리 화면이 존재하는지도 확인되지 않았다**(FS-059 §7 #12) |
| '**오늘 갑자기 뜨는 검색어**' | 불가 — 신규/급상승 표시가 없다. 비교 기간 증감은 KPI 에만 있고 **행 단위 증감이 없다** |
| ''원피스' 검색이 **언제 늘었나**' | 불가 — 검색어별 추이가 없다. 추이는 '전체'뿐이다(제목이 그것을 정직하게 말한다 — `:268`) |
| '이 검색어로 들어온 **주문이 뭔가**' | 불가 — 검색어 클릭 드릴다운이 없다 |
| '세그먼트를 바꿨더니 **검색수가 왜 줄었나**' | **답이 없다** — '참조검색어 없음'이 '전체'에서만 보이고 그 행의 검색수가 상위급이라 세그먼트를 바꾸면 KPI 가 눈에 띄게 준다. 화면이 이유를 말하지 않는다(FS-059 §7 #2) |
| ''검색결과 없음'이 **KPI 와 차트에서 왜 다른가**' | **답이 없다** — KPI ③은 **종류**를 세고 추이의 같은 이름 계열은 **횟수**를 센다(BE-059 §3.2 #5). 이름이 같은데 단위가 다르고 화면이 그 차이를 말하지 않는다 |
| '이 숫자는 **언제 집계됐나**' | 불가 — 신선도 계약 없음(BE-059 §7.7 #1) |

### 4.5 ⚠ STATE-01 ↔ FS-002 모순 — 이 화면도 정면 당사자다

**두 요구가 같은 `loading` 축에서 반대 방향을 가리킨다.**

| 문서 | 요구 | 근거 |
|---|---|---|
| **quality-bar STATE-01** (P0) | '**refetch 중에는 이전 행을 유지**, skeleton 은 최초 로드(`data===undefined`)에서만' | `quality-bar.md:20` |
| **FS-002 대시보드** | 컨트롤 종속 조회에 **스켈레톤을 요구**: '조회 중이거나 데이터가 아직 없으면 범례·차트 대신 … 스켈레톤 … 토글은 `disabled`'(FS-002-EL-034) · '**데이터가 이미 있는 재조회(탭 전환)에서는 기존 카드 2장이 스켈레톤 상태로 바뀐다**'(FS-002-EL-026) | `specs/dashboard/FS-002-dashboard.md:84,92` |

**이 화면은 STATE-01 을 문자 그대로 지킨다** — `queries.ts:45` + `:40`. 그 결과가 **기간 토글을 눌렀는데 이전 기간의 KPI·순위 표가 남는 것**이다.

**F3b 판정: 명세(FS-002)가 옳다.** 월을 눌렀는데 일 차트가 남아 있으면 그 차트는 **거짓말**이다.

**따라서 이 문서가 남기는 해석**(NFR-057 §4.5 · NFR-058 §4.5 와 동일하며, 여섯 통계 화면에 똑같이 걸린다):

> **STATE-01 의 '재조회 시 이전 행 유지' 규칙은 「컨트롤 비종속 재조회」에 한한다** — `staleTime` 만료·백그라운드 갱신·타 관리자의 변경으로 **같은 조건**을 다시 읽는 경우. 사용자가 **조건을 바꿔** 일으킨 「컨트롤 종속 재조회」는 이전 데이터를 **무효화**하고 로딩 상태를 보여야 한다. 두 경우는 `queryKey` 의 변화 여부로 기계적으로 구분된다.

**해소 방향(택1)**: ① 컨트롤 종속 조회에서 `isPlaceholderData`(stats 전체 **소비 0건**)를 스켈레톤 조건에 더한다 ② 기간 조회에 한해 `placeholderData` 를 끈다. **⚠ ①은 `packages/ui` 계약에 막힌다** — §5 #2. **quality-bar STATE-01 의 문구 자체가 개정 대상이다** — §5 #1.

**이 화면에서 특히 아픈 이유 — 한 화면 안에서 두 속도가 공존한다.**

같은 조회 조건 바의 컨트롤들이 서로 다르게 반응한다:

| 컨트롤 | `queryKey` 에? | 반응 |
|---|---|---|
| **기간 프리셋 · 비교 기준** | **O** | **400ms 뒤** — 그동안 **이전 값이 남는다**(신호 없음) |
| **검색어 · 세그먼트** | **✕** | **즉시** — 클라이언트 필터(`KeywordStatsPage.tsx:162-172`) |

운영자는 '오늘'을 누르고 검색어를 친다. **검색은 즉시 먹고 기간은 아직 안 먹었다.** 그 400ms 동안 화면은 **'오늘 · 원피스'라 적힌 채 '지난 30일 · 원피스'의 숫자**를 보인다 — 두 조건이 **다른 시점**에서 온 것이다. 어느 것이 반영됐는지 화면에 신호가 없다. **이것은 다른 통계 화면에 없는 조합**이다(주문·유입에는 즉시 반응하는 텍스트 입력이 없다).

## 4.6 ✔ quality-bar 축 밖의 보안 결함 — CSV 수식 주입 **(해소됨 · 기준 `a5c2639`)**

> **★ 이 절의 판정이 뒤집혔다.** 이전 기준(`4b805ad`)에서 이것은 **이 화면의 가장 중대한 결함**이자 **차단 · 최우선**이었다. **커밋 `ebb0e4c` 가 막았다** — 이 절이 이관한 조치가 **요구한 자리에 정확히** 들어갔다.

**이 절이 §2 의 P0 표에 없는 이유는 그대로다.** quality-bar 의 어느 ID 에도 정확히 대응하지 않기 때문이다 — ERP-12(내보내기)는 **포맷·인코딩·범위**를 규정하고 EXC-15(파일 업로드)는 **입력**을 다루나, **내보낸 파일이 실행되는 것**을 다루는 요구가 없다. **즉 이 결함은 발견될 때도 P0 표 밖이었고, 해소된 지금도 P0 표 밖이다** — §2.1 의 건수는 이 사건에 반응하지 않는다. **그것이 이 절이 존재하는 이유다.**

**현재 코드**(BE-059 §7.3 이 정본. 코드 경로를 직접 읽어 재확인했다):

```
KeywordStatsPage.tsx:76   csv: (row) => row.keyword          ← 사용자 입력, 가공 없음 (그대로)
  → useCsvExport.ts:64,73 → shared/download.ts:64 → :50
      function escapeCell(value) {
        const safe = neutralizeFormula(value);       ← ★ 신설. 무력화가 따옴표보다 먼저다 (:48)
        if (!/["\r\n,]/.test(safe)) return safe;
        return `"${safe.replace(/"/g, '""')}"`;
      }
  → shared/download.ts:40
      function neutralizeFormula(value) {
        if (!FORMULA_LEAD.test(value)) return value;   // :22  /^[=+\-@\t\r]/
        if (PLAIN_NUMBER.test(value)) return value;    // :29  진짜 수는 예외 (:24-28)
        return `'${value}`;
      }
```

`escapeCell` 이 이제 **RFC 4180 의 구분자·따옴표·줄바꿈**에 더해 **수식 선두를 무력화한다.** `=HYPERLINK(…)` 는 `'=HYPERLINK(…)` 가 되어 **Excel 이 텍스트로 읽는다.**

**이 화면이 그 결함의 유일한 운반체였던 이유는 그대로다** — 방어가 사라지면 이 화면이 다시 최전선이다:
- 주문 통계의 CSV 열: 날짜·숫자·상태 라벨 — **전부 클라이언트 상수**
- 유입 분석의 CSV 열: 채널·검색엔진·랜딩페이지 라벨 — **전부 클라이언트 상수**(`data-source.ts:63-79`)
- **검색어 분석의 CSV 첫 열: 손님이 친 문자열** — 상한도 규칙도 없다

**그리고 이 화면의 설계가 공격을 도왔다**: 기본 정렬이 검색수 내림차순(`:142`)이라 공격자가 반복 검색하면 **1페이지 첫 행**에 오고, 카탈로그에 안 걸리므로 **'결과 없음' 배지가 붙어**(`:65`) 운영자의 시선을 정확히 끈다 — **이 화면의 목적이 공격의 유인이 된다.** 그 성질은 지금도 그대로이며, **바뀐 것은 파일에 닿는 마지막 순간에 무력화가 일어난다는 것뿐이다.**

**⚠ 픽스처로는 여전히 드러나지 않는다** — `KEYWORD_SEEDS` 가 전부 정상 한글 상품명이다(§4.3). **그래서 이 방어를 지키는 것은 픽스처가 아니라 단위 테스트다**: `shared/download.test.ts` 신설 — `:15-49` 무력화 7건(`=`·`@`·`+`·`-`·탭·CR·**순서**) · `:51-68` 진짜 수 불변 4건 · `:70-86` RFC 4180 계약 유지 4건(**헤더도 같은 규칙을 탄다** `:84`). **이 파일이 지워지면 결함이 조용히 되살아난다.**

**남은 것 — 이 절이 닫히지 않는 이유**: **서버가 CSV 를 직접 내려주게 되면 서버가 같은 일을 해야 한다**(`download.ts:11-12` 가 그 전환을 예고한다). BE-059 §7.3 #3 · §7.9 #7. **프론트 차단 사유는 해제됐다.**

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **컨트롤 종속 재조회가 이전 기간의 값을 남긴다.** `queries.ts:40,45` — 기간을 바꾸면 `isFirstLoad=false` 라 스켈레톤도 `aria-busy` 도 없이 이전 기간의 KPI·표가 새 기간 라벨 아래 선다. ⚠ **이 화면에서는 검색어가 즉시 반영돼 한 화면에 두 속도가 공존한다**(§4.5). `isPlaceholderData` 소비 0건. **요구의 문자만 보면 pass 이므로 quality-bar 문구도 개정해야 한다** | 이 화면 + **통계 6화면 공통**(`_shared/queries.ts`) + quality-bar | **A11 · A40 (해석 확정) · A64 (문구 개정)** |
| 2 | — | — | **선행 차단**: `packages/ui` 의 `StatsCard` 가 `loading` **하나로** `<Card busy>`(`StatsCard.tsx:35`)와 스켈레톤(`:48-52`)을 묶는다 → 앱이 '재조회 중이니 본문은 두되 busy 는 알린다'를 **표현할 수 없다**. #1 의 해소(①안)가 막힌다 | `packages/ui` | **A41 / DS (계약 분리 — 차단 사안)** |
| ~~3~~ | — | — | **✔ CSV 수식 주입 — 해소됨(기준 `a5c2639` · 커밋 `ebb0e4c`).** 이전 기준에서 이 항목은 **차단 · 최우선**이었다: `escapeCell` 이 RFC 4180 만 다루고 `=`/`+`/`-`/`@`/탭/CR 선두를 막지 않았다. **이 문서가 이관한 조치가 요구한 자리에 정확히 들어갔다** — `shared/download.ts` **한 곳**(`:40-44` `neutralizeFormula` 신설 · `:50-54` `escapeCell` 이 그것을 **먼저** 부른다 · `:22` `FORMULA_LEAD` · `:29` `PLAIN_NUMBER` 로 진짜 수는 예외). **모든 CSV 소비자가 함께 보호됐다**(회원·로그인 이력·로그 4화면·통계 6화면). 회귀 테스트 `download.test.ts:15-86` 신설. **여전히 quality-bar 의 어느 ID 에도 대응하지 않는다** — 발견될 때도 P0 표 밖이었고 해소된 지금도 밖이다(§4.6). ⚠ **미결 1건**: 서버가 CSV 를 내려주게 되면 그 방어가 함께 넘어가야 한다(BE-059 §7.3 #3) | `shared/download.ts`(완료) → 서버(미결) | **A63 (서버 이관 시)** |
| 4 | EXC-06 / EXC-20 | P1 | 조회 실패가 status 를 구분하지 않고(`queries.ts:47`) **참조 코드(`traceId`)도 표시하지 않는다**. 429 의 `Retry-After` 미소비. **원문 비노출(`:46`)은 옳고 이 화면에서는 개인정보 보호이기도 하다**(BE-059 §7.6) | 이 화면 + `_shared` | A11 · A41 |
| 5 | ERP-15 / 신규 | P1 | **기간 상한이 없다** — `?start=1900-01-01&end=2100-01-01` 이 검증(순서만 본다)을 통과해 `eachDay` 가 **73,000 일자**를 만들고 `dailyRowsOf` 가 그 각각에 `distribute` × 4 를 돈다. 클라이언트 가드 + 서버 400 둘 다 필요 | 이 화면 + `_shared` + 서버 | A11 · A63 |
| 6 | A11Y-16 / 신규 | P1 | **x축 라벨 상한이 없다** — `LineAreaChart.tsx:216-231` 이 `labels` 전부를 그린다 | `packages/ui` + 이 화면 | A41 · A11 |
| ~~7~~ | ~~ERP-05~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `527fc1b`).** 이전 기준에서 DS `Pagination` 의 범위·크기 표면이 꺼진 채 섹션이 같은 것을 손으로 그렸다(`pageSize` 미전달 → `Pagination.tsx:112` `showRange` false → `role="status"` 범위 요약 부재 · `rangeTextOf` 두 벌). **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘겨 DS 가 그린다** — `Pagination.tsx:171-172` 의 `role="status"` 범위 요약 + `:177-194` 크기 선택기. **자작 사본은 지워졌다**(`table.ts:58-60` · `StatsTable.tsx:191-194` 가 그 이력과 이유를 남긴다 — '같은 것을 두 벌 그리면 수식이 갈라진다'). `rangeTextOf` 가 한 벌로 수렴했다. ⚠ **로그 4화면은 아직 사본이다**(NFR-060 §3 ERP-05) — 이 수렴은 통계 섹션에서만 일어났다 | 이 화면 + `_shared` | **종결** |
| ~~8~~ | ~~TOKEN-13~~ | — | **✔ 해소됨(기준 `a5c2639`).** 이전 기준에서 `StatsTrendCard.tsx:8-15` 이 'chart.series 가 2개뿐' 이라 적었으나 `tokens.json:778-888` 에 series-1..6 이 전부 있었다. **주석이 고쳐졌다** — `StatsTrendCard.tsx:8-15`('[계열 색 — **해결됨**] … TOKEN-13 이 chart.series-3..6 을 넣었고 LineAreaChart 가 6계열까지 그린다. 즉 **색 제약은 없다**')이고, 2계열 유지의 참인 근거를 새로 댄다(`:11-14`). **이 화면에 특히 중요한 후속**: `:15` 가 '다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — **막던 것은 사라졌다**' 라 명시하므로 **'검색어별 추이'(FS-059 §7 #15) 도입의 걸림돌이 사라졌다** — 이전 기준이 우려한 지점이다 | `_shared` | **종결** |
| 9 | **COMP-09** | P2 | **검색어 셀에 truncation 이 없다** — `keywordCellStyle`(`KeywordStatsPage.tsx:54-58`)에 `overflow`/`textOverflow` 가 없다. **검색어는 사용자 입력이라 길이 상한이 없고** 손님이 문장을 통째로 검색하면 셀이 표를 밀어낸다. 형제 `ShareBarList` 는 ellipsis 를 갖는다(`ShareBarList.tsx:50-52`) | 이 화면 | **A11 · A41** |
| 10 | **ERP-04** | P1 | **'검색결과 수' 열의 표시와 정렬이 어긋난다** — 참조검색어 없음 행의 `render`/`csv` 는 `'—'` 인데 `sortValue` 는 `resultCount`(=0)를 낸다(`KeywordStatsPage.tsx:92-94`). 오름차순 정렬하면 '—' 가 0개 행들 사이에 낀다 — 화면이 '성립하지 않는다'고 해 놓고 정렬은 0으로 취급 | 이 화면 | A11 change_request |
| 11 | — | — | **BE-059 §7.2 (보안) — 검색어의 개인정보성.** 손님은 이름·전화번호·주문번호·민감 질의를 검색창에 친다. **`searchCount:1` 꼬리 검색어 + `visitCount`/`purchaseCount` 는 개인 단위 레코드**라 재식별 가능하다 — '집계라서 안전하다'가 성립하지 않는다. **마스킹·임계값 정책 결정 필요**(단 최소 검색수 임계값은 **이 화면이 지목하려던 '결과 없음' 검색어를 함께 지운다** — 원래 검색수가 적다). **열람 감사 로그도 없다** | 도메인 + 서버 | **A01 · A63 (보안)** |
| 12 | — | — | **BE-059 §7.9 #2 (도메인) — 검색어 정규화 정책이 없다.** 대소문자·공백·유니코드. **중복 키가 오면 React key 충돌로 행이 사라진다**(`rowKey={(row)=>row.id}` — `:284`). `rows[].id` 를 검색어 문자열로 쓰는 것도 그 결과다 | 도메인 + 서버 | **A63 · A01** |
| 13 | — | — | **BE-059 §3.2 #5 / §7.9 #3** — **`zeroResultSearchCount`(추이)와 KPI ③ 의 단위가 다르다**: 하나는 **횟수**, 하나는 **종류**. 이름이 같다('검색결과 없음'). **화면이 그 차이를 말하지 않는다** | 이 화면 + 서버 | **A11 · A63** |
| 14 | — | — | **BE-059 §6.1 #4** — 서버 응답의 불변식 11개 중 **화면이 검증하는 것이 0개**다. 중복 키 → 행 소실 · `isUnknownReferrer` 누락 → 손댈 수 없는 것을 손댈 것으로 계상 · `clickCount>searchCount` → **클릭률 137.4%** | 이 화면 + 서버 | A63 · A11 |
| 15 | — | — | **BE-059 §7.4 / §7.9 #9 — 규모 결정이 여러 판정을 뒤집는다.** 검색어 40개가 픽스처 상수다. 수천이면 (a) `filterKeywordRows` 가 전량 훑기 (b) 서버 필터(`?q=`)가 필요해지고 → **§2 COMP-10 의 '요청이 없어 경합이 원리적으로 불가능'이라는 성질이 사라진다** (c) ERP-12 진행률이 살아난다 | 서버 + 이 화면 | **A63 · A11 (규모 결정)** |
| 16 | — | — | **FS-059 §7 #12 — 화면이 지시하는 행동의 경로가 없다.** '동의어를 걸면 줄어듭니다'라 하는데 손잡이가 없고 **동의어 관리 화면이 존재하는지도 확인되지 않았다.** **통계 6화면 중 유일하게 행동을 지시하는 화면인데 행동이 불가능하다** | 이 화면 + 제품 | **A01 · A11 (제품 결정)** |
| 17 | — | — | **FS-059 §7 #2 — '참조검색어 없음'이 세그먼트를 바꾸면 조용히 사라진다.** 판정 자체는 옳으나(`types.ts:116-118`) 그 행의 검색수가 상위급이라 **총 검색수 KPI 가 눈에 띄게 준다.** 화면이 이유를 말하지 않는다 | 이 화면 | **A11 change_request** |
| 18 | EXC-03 | P1 | **권한 게이트 이중 + 자체 403 화면** — `StatsPageShell.tsx:95-104`. 최근 통합이 설정 섹션을 공유본으로 수렴시킨 것과 반대 방향 | `_shared` | A11 · A41 |
| 19 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — 무한 스켈레톤 | 앱 전역 | A40 · A41 |
| 20 | EXC-11 | P1 | 오프라인 감지 없음 | 앱 전역 | A40 |
| 21 | ERP-03 / IA-14 | P1 | sticky thead 는 있으나 **identity 열(검색어) sticky 없음** · `zIndex:1` 이 토큰 아님 · 최소 지원 폭 선언 없음 · 정렬 헤더 touch-target 미검증 | 이 화면 + 앱 전역 | A11 |
| 22 | A11Y-16 | P1 | **검색 결과 건수가 announce 되지 않는다** — 41행이 3행으로 줄어도 live region 이 없다. **범위 요약이 `role="status"` 였다면 자동 해결됐다**(#7 과 같은 뿌리) | 이 화면 + `_shared` | A11 |
| 23 | — | — | **FS-059 §7 #3 — 주석이 존재하지 않는 훅 이름을 적는다.** `KeywordStatsPage.tsx:9-10` 의 `useImeSearch` 는 코드베이스에 없다(실제는 `useDebouncedSearch`). 동작은 옳고 주석만 틀렸다 | 이 화면 | A40 (주석 정정) |
| 24 | ERP-09 / — | P2 | **서버가 `start`/`end` 를 UTC 로 해석하면 매일 9시간치 검색이 전날로 밀린다**(BE-059 §7.8). 프론트는 KST 로 옳으나 **서버 계약이 미정** | 서버 | **A63** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.
> **예외**: `stats-screens.test.tsx` 는 실제 라우터·쿼리 클라이언트·픽스처로 6화면을 렌더하는 **통합 테스트**이며 `:8-10` 이 그 의도를 명시한다. 그것이 고정한 사실은 §2·§3 에서 그렇게 표기했다.

### 6.1 이 화면의 실제 scope 와 op

**scope = `'stats-keywords'`**(`data-source.ts:14`). **op = `'list'` 하나**(`mock.ts:52`) — 이 화면이 거는 요청이 조회 하나뿐이다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-059-EL-014 조회 실패 배너(= 본문 SEC-03~05 대체) |
| `detail` · `save` · `delete` | ✕ — 부르지 않는다 | 해당 없음(쓰기 0건) |

### 6.2 재현 스위치 (`mock.ts:6-11` 이 문법을 명시)

```
/stats/keywords?fail=list                    조회 실패 → STATE-02 확증
/stats/keywords?fail=stats-keywords:list     위와 동일(scope 명시)
/stats/keywords?fail=stats-visitors:list     아무 일도 없다 — 스코프가 갈려 있다
/stats/keywords?empty=all                    0행 → STATE-05 '진짜 없음' 분기 ('집계된 검색어가 없습니다')
/stats/keywords?q=존재하지않는검색어           → STATE-05 '검색' 분기 확증:
                                             '조건에 맞는 검색어가 없습니다' + '검색 지우기' (3분기 중 이 화면만)
/stats/keywords?segment=zeroResult&q=zzz     → STATE-05 우선순위 확증: 검색 > 필터 (Empty.tsx:52-57)
/stats/keywords?delay=5000                   스켈레톤 창을 5초로 — STATE-01 '최초 로드' 절 확증
                                             + 스켈레톤 25행 = 실제 25행 확증(COMP-06)
/stats/keywords?delay=5000&preset=last30     진입 후 '오늘' 클릭 → §2 STATE-01 gap 확증.
                                             그 5초 안에 검색어를 치면 §4.5 의 '두 속도' 가 관측된다:
                                             검색은 즉시 먹고 기간은 아직 안 먹었다
/stats/keywords?preset=custom&start=2026-07-16&end=2026-07-01
                                             기간 검증 → COMP-11 확증 (메시지 1회, 본문 미렌더)
/stats/keywords?size=10                      41행 ÷ 10 = 5페이지 → Pagination 이 실제로 렌더된다(ERP-05 손해 확증)
/stats/keywords?sort=resultCount&dir=asc     '검색결과 수' 오름차순 → '참조검색어 없음'('—')이
                                             0개 행들 사이에 낀다 (§3 ERP-04 · §5 #10)
/stats/keywords?segment=hasResult            '참조검색어 없음'이 사라지고 총 검색수가 급감한다 (§5 #17)
```

**COMP-10 재현**(§2 — 이 화면만 가능):
```
/stats/keywords → 검색창에 '원피스'를 한글 IME 로 입력
  · 조합 중: URL 이 안 바뀐다 · 네트워크 요청 0건
  · 조합 중 Enter: submit 되지 않는다 (useDebouncedSearch.ts:58-62 ref 동기 판정)
  · 조합 완료 + 디바운스: ?q=원피스 로 정확히 1회 커밋 (자모당 1개가 아니다)
  · 응답 경합: 재현 불가 — queryKey 에 keyword 가 없어 요청이 0건이다
```

⚠ **`?delay=` 는 이 섹션에 실재한다**(`mock.ts:24-27`) — FS-040 과 다르다. **§2 STATE-01 의 gap 과 §4.5 의 '두 속도'를 눈으로 확증하려면 필수다.**

### 6.3 status 재현

`?status=` 는 `shared/crud/dev.ts` 의 문법이나 **이 섹션의 `loadStats` 는 `failIfRequested` 만 부른다**(`mock.ts:52`). §3 EXC-06 의 gap 은 **화면이 어차피 status 를 읽지 않으므로** 재현 결과가 같다.

`409`·`412`·`422` 는 **이 화면에서 발생할 수 없다** — 쓰기가 없다.

### 6.4 §4.6(CSV 수식 주입) — 기준 `a5c2639` 에서 gap 이 아니다. 이제 '확증' 절차다

**픽스처로는 재현되지 않는다** — `KEYWORD_SEEDS`(`data-source.ts:31-74`)가 전부 정상 한글 상품명이다. **방어를 지키는 것은 픽스처가 아니라 `shared/download.test.ts` 다.** 확증하려면:

1. **단위 테스트가 가장 빠르다**: `npx vitest run src/shared/download.test.ts` — `:15-49` 가 무력화 7건을, `:51-68` 이 '진짜 수는 건드리지 않는다'를, `:70-86` 이 RFC 4180 계약 유지를 고정한다.
2. **코드 대조**: `download.ts:50-54` 의 `escapeCell` 이 **첫 줄에서** `neutralizeFormula` 를 부르는지 · `:22` `FORMULA_LEAD = /^[=+\-@\t\r]/` 가 여섯 선두를 전부 담는지 · `:29` `PLAIN_NUMBER` 가 `'+5,000'`·`'-5.2'` 를 통과시키는지 읽는다.
3. **화면 확증(선택)**: `KEYWORD_SEEDS` 에 `{ keyword: '=HYPERLINK("https://example.com","x")', base: 99, resultCount: 0 }` 를 임시로 추가하고(검색수를 높게 줘 1페이지 첫 행에 오게 한다) `/stats/keywords` → '엑셀 내보내기' → 받은 `.csv` 를 Excel 로 연다 → **첫 행 첫 열이 `'=HYPERLINK(…)` 텍스트로 보이고 수식으로 실행되지 않는다.**
4. **회귀 감시**: `download.test.ts` 가 지워지거나 `escapeCell` 에서 `neutralizeFormula` 호출이 빠지면 이 결함이 조용히 되살아난다 — 이 화면이 그 첫 운반체가 된다.

### 6.5 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| **STATE-01 (gap)** | `queries.ts:40`(`keepPreviousData`) · `:45`(`isFirstLoad`) · `KeywordStatsPage.tsx:263,274,292`(loading) · `:273`(`period={params.period}`) · `StatsTrendCard.tsx:100` · `StatsFilterBar.tsx:254` · **`isPlaceholderData` grep = 0** |
| **§4.5 '두 속도'** | `KeywordStatsPage.tsx:151`(queryKey 에 keyword/segment 없음) vs `:162-172`(클라이언트 필터 = 즉시) |
| STATE-01 ↔ FS-002 모순 | `quality-bar.md:20` vs `specs/dashboard/FS-002-dashboard.md:84,92` |
| **COMP-10 (종속·충족)** | `KeywordStatsPage.tsx:254`(searchLabel) · `StatsFilterBar.tsx:19,117-118,209-219` · `useDebouncedSearch.ts:50-80`(특히 `:58-62` ref 동기 판정 · `:53` minLength) · `KeywordStatsPage.tsx:151`(경합 부재의 근거) · **`:9-10`(존재하지 않는 `useImeSearch` 주석)** |
| STATE-05 (pass · 3분기) | `KeywordStatsPage.tsx:293-304` · `Empty.tsx:52-57,71-99,104` |
| ~~ERP-05~~ — **해소 확증** | `StatsTable.tsx:195-204`(**`total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 전달**) → `Pagination.tsx:112-113`(`showRange`·`showSizeSelect` true) → `:171-172`(`role="status"` 범위) · `:177-194`(크기 선택). 사본 제거 이력 `table.ts:58-60` · `StatsTable.tsx:191-194` |
| **§4.6 CSV 수식 주입 (해소 확증)** | `KeywordStatsPage.tsx:76`(`csv: row => row.keyword` — 가공 없음, 그대로) → `useCsvExport.ts:64,73` → `download.ts:64`(`cells.map(escapeCell)`) → **`:50-54`(`escapeCell` 이 `neutralizeFormula` 를 먼저 부른다)** → **`:40-44`(무력화) · `:22`(`FORMULA_LEAD`) · `:29`(`PLAIN_NUMBER` 예외)** · `:69`(Blob → Excel). 회귀 테스트 `download.test.ts:15-86`. 정렬 근거 `KeywordStatsPage.tsx:142` · 배지 `:65` |
| ERP-04 (부분) | `StatsTable.tsx:127-155` · `table.ts:28-36`(안정 정렬 · `localeCompare('ko-KR')`) · **`KeywordStatsPage.tsx:92-94`('—' vs sortValue 0)** |
| COMP-09 (gap) | `KeywordStatsPage.tsx:54-58`(truncation 없음) vs `ShareBarList.tsx:50-52`(ellipsis 있음) |
| TOKEN-01 (pass) | `pages/stats/**` 에 hex·px·bare keyword grep = 0 (실측) |
| A11Y-12 (pass) | `StatsFilterBar.tsx:16,85-90,133-135` · `aria-current` grep = 주석 1건 |
| IA-02 (pass) | `nav-config.ts:203,260-278,297-299` · `StatsPageShell.tsx:6-8`(h1 없음) |
| IA-13 (pass) | `useStatsParams.ts:35,157,168-200,289` · **`:16-33`(`useListState` 미사용) · `:31-32`(검색만 공유본 — GROUND-TRUTH §3 정정)** |
| ERP-13 (pass) | `KeywordStatsPage.tsx:296`(label='검색어') · `Empty.tsx:16-27,71-76`(받침 없는 '어' → '가') |
| EXC-09 (pass) | `queries.ts:38` · `mock.ts:51` · `useCsvExport.ts:15,68,81,84-87` |
| ERP-09 (pass) | `useStatsParams.ts:162` · `shared/format.ts:63` · `period.ts:9-13,73,77` |
| BE-059 §7.2 (개인정보) | `types.ts:41-47`(`visitCount`/`purchaseCount` 동반) · `KeywordStatsPage.tsx:63`(마스킹 없음) · `data-source.ts:31-74`(픽스처엔 정상 검색어뿐) |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **8건 전부**. **형제 화면보다 하나 적은 이유(COMP-10 이 이 화면에서만 표면을 갖는다)** 를 §1.2 · §2.1 에 밝혔다
- [x] 모든 `pass` 에 코드 근거(파일:라인)
- [x] 모든 `gap` 에 재현 가능한 측정 기준
- [x] §2.1 산수 검산 — 10 + 11 + 8 + 1 = **30** ✔
- [x] **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] **'E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했고, `stats-screens.test.tsx` 가 고정한 사실은 구분해 표기했다
- [x] **STATE-01 ↔ FS-002 모순을 §4.5 에 전면 기록**하고 '유지 규칙은 컨트롤 비종속 재조회에 한한다'는 해석을 남겼다. §2 STATE-01 · §5 #1 에서 상호 참조한다. **이 화면 고유의 위험(한 화면에 두 속도가 공존한다 — 검색은 즉시, 기간은 400ms)** 을 표로 밝혔다
- [x] **COMP-10 을 이 화면에서 직접 판정했다** — 통계 3화면 중 유일하게 표면이 실재한다. **응답 경합이 원리적으로 불가능한 이유**(`queryKey` 에 keyword 없음)를 코드로 확인했고, **서버 필터를 도입하면 그 성질이 사라진다**는 것을 BE-059 §7.4 와 함께 기록했다
- [x] **GROUND-TRUTH 를 코드로 재확인해 두 곳을 정정했다** — ① §6 ERP-05: `KeywordStatsPage.tsx:289` 의 `pageSize` 는 `StatsTable` 의 prop 이다(이 화면은 opt-in 소비자가 **아니다**. 그리고 **손해가 가장 큰 화면이다** — Pagination 이 실제로 렌더된다) ② §3 IA-13: `useStatsParams` 는 `useListState` 를 소비하지 **않는다**(`parseFilter` 만). **`useDebouncedSearch` 는 `StatsFilterBar` 가 소비하지 `useStatsParams` 가 아니다** **⚠ 기준 `a5c2639` 에서 ①이 낡았다** — `527fc1b` 이후 `StatsTable.tsx:195-204` 이 `Pagination` 에 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 **전부 넘긴다.** 이 화면은 이제 **ERP-05 의 opt-in 소비자다**(§3 ERP-05 — pass). ②는 그대로 유효하다.
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(STATE-06·ERP-07·A11Y-08·IA-03·EXC-10/12/14/18)은 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 `?fail=` scope(`stats-keywords`)와 op(`list` 하나)을 코드에서 확인**해 적었다. **`?delay=` 가 실재함**을 명시했다
- [x] **`packages/ui` 계약이 STATE-01 해소를 막는다**는 사실(§5 #2)을 앱층 gap 과 분리해 A41/DS 로 지목했다
- [x] **§4.6 에 quality-bar 축 밖의 보안 결함(CSV 수식 주입)을 별도 절로 세웠다** — P0 표에 없는 이유(대응 ID 부재)를 밝히고, **코드 경로 전체를 직접 읽어** 확인했으며, **이 화면이 유일한 운반체인 이유**(형제 화면의 CSV 열은 전부 클라이언트 상수)와 **픽스처로는 드러나지 않는다**는 사실을 §4.3 · §6.4 에 적었다. **기준 `a5c2639` 갱신**: 이 결함은 `ebb0e4c` 로 해소됐고(`download.ts:40-44` + `download.test.ts:15-86` — 둘 다 직접 읽어 확인), 절을 '결함 보고' 에서 '해소 확증 + 서버 이관 시 동반' 으로 고쳤다
- [x] NFR-057 · NFR-058 과 겹치는 판정(`_shared` 공유)을 **이 화면 고유의 근거로 다시 확인**해 적었다 — `KeywordStatsPage.tsx` 의 라인을 함께 인용했다
</content>
