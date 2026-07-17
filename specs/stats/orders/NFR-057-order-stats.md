---
id: NFR-057
title: "주문 통계 비기능 명세"
functionalSpec: FS-057
backendSpec: BE-057
qualityBar: specs/quality-bar.md
owner: 명세 리뷰
reviewer: 기능 명세
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-057. 주문 통계 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-057 주문 통계 (`/stats/orders`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-057(요소·예외) · BE-057(엔드포인트·서버 판정) · **NFR-058(유입 분석) · NFR-059(검색어 분석)** — 세 화면이 `stats/_shared/**` 를 공유해 판정이 겹친다. 이 문서는 겹치는 판정도 **이 화면 고유의 근거(file:line)** 로 다시 확인해 적는다 |
| 갱신 규칙 | quality-bar 가 바뀌면 §2 판정을 다시 돌린다. 이 화면 또는 `_shared/**` 의 코드가 바뀌면 근거(파일:라인)를 다시 확인한다 |
| 판정 기준일 | **2026-07-17 · `HEAD = a5c2639`** |
| 판정 방법 | **E2E 미실행 — 판정 근거는 코드 대조다**(§6). 단 이 섹션에는 **6화면을 실제 라우터·쿼리 클라이언트·픽스처로 렌더하는 통합 테스트**가 있다(`stats-screens.test.tsx`) — 그것이 고정한 사실은 그렇게 표기한다 |

### 1.1 표기 규약

| 기호 | 뜻 |
|---|---|
| 적용 `직접` | 이 화면(또는 `stats/_shared`)의 코드가 충족을 결정 — 판정 책임이 이 문서에 있다 |
| 적용 `상속` | AppShell·DS(`@tds/ui`)·`shared/**` 공용 프레임워크가 결정하고 이 화면은 소비자 — **이 화면에 그 표면이 실재할 때만** 적는다 |
| 적용 `N/A` | 표면(appliesTo)이 이 화면에 없다 — **반드시 사유** |
| 판정 `pass` | 코드 근거로 충족 확인 |
| 판정 `gap` | 미충족 확인 — §5 로 이관. **P0 의 gap 은 quality-bar '배치 실패' 사유** |
| 판정 `종속` | `상속` 항목 — 소유 문서/DS 판정을 따른다 |

### 1.2 이 화면의 성격

**읽기 전용 집계 뷰이되, FS-040(예약 달력)과는 결이 다르다.** 서버 쓰기가 0건인 것은 같으나, 이 화면에는 **조회 조건 바·표·페이지네이션·정렬·내보내기·토스트**가 있다. 그래서 P0 30 중 N/A 는 **9건**뿐이고(FS-040 은 16건), 나머지 21건이 실질이다.

**그리고 이 화면은 대체로 잘 되어 있다.** URL 직렬화(IA-13)·상태 머신 분리(`useStatsQuery`)·IME 안전 검색(공유 훅)·토큰 위생·`aria-pressed` 일관·CSV 의 진행률/취소/abort 가 전부 코드에 있다. **P0 gap 은 1건**이며, 그 1건은 화면의 실수가 아니라 **quality-bar 의 두 요구가 반대 방향을 가리키는 지점**이다(§2 STATE-01 · §4.5).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 상태는 옳게 갈려 있다** — `queries.ts:45` `isFirstLoad = query.data === undefined && query.isFetching` 이 정본 파생(`useCrudList.tsx:71-72` 과 같은 식)이고, `OrderStatsPage.tsx:290,299,311,325,347` 이 그것을 `loading` 으로 넘긴다. 스켈레톤은 최초 로드에만(`StatsTable.tsx:162`·`ShareBarList.tsx:110`·`StatsCard.tsx:48`), empty 는 **성공 · 0행에만**(`StatsTable.tsx:187` `!loading && rows.length===0` · `ShareBarList.tsx:127` `total===0`), error 는 본문을 대체(`StatsPageShell.tsx:130`). **거짓 빈 상태가 없다** — FS-040 의 '0/4' 결함이 여기엔 없다.<br>**그런데 그 문자 그대로의 준수가 컨트롤 종속 재조회에서 거짓말을 만든다.** `queries.ts:40` `placeholderData: keepPreviousData` 이므로 **기간 프리셋을 바꾸면** `data` 가 이전 기간 값으로 남아 `isFirstLoad === false` → 스켈레톤도 `aria-busy` 도 없이 **이전 기간의 KPI·차트가 서 있다.** 그동안 조회 조건 바는 새 기간을 말하고(`StatsFilterBar.tsx:254`), 차트 `aria-label` 도 새 기간을 말한다(`StatsTrendCard.tsx:100` ← `OrderStatsPage.tsx:297` `period={params.period}`). `isPlaceholderData` 소비 코드는 stats 전체에 **0건**(grep 확인)이라 알릴 방법도 없다.<br>**판정 근거**: STATE-01 의 문자만 보면 **pass** 다. 그러나 **F3b 판정은 FS-002(컨트롤 종속 조회에 스켈레톤 요구)가 옳다** — 따라서 STATE-01 의 유지 규칙은 **'컨트롤 비종속 재조회'에 한한다**는 해석 아래 **gap** 으로 계상한다. §4.5 · §5 #1 | `/stats/orders` 진입 → 스켈레톤(400ms) → KPI·차트. **여기까진 옳다.** 이제 '오늘' 프리셋 클릭 → **400ms 동안 화면이 '조회 범위 2026.07.17'이라 적은 채 지난 7일의 KPI 합계와 7일치 차트를 보인다.** 스켈레톤 없음·`aria-busy` 없음. `?delay=5000&preset=last30` 으로 진입해 '오늘'을 누르면 5초간 관측된다 | **gap** |
| STATE-02 | STATE | 직접 | 조회 실패 시 `StatsPageShell.tsx:130-148` 이 인라인 `<Alert tone="danger">` '통계를 불러오지 못했습니다.'(`queries.ts:47`) + '다시 시도'(`onRetry` ← `OrderStatsPage.tsx:275` `query.refetch`)를 렌더한다. **토스트가 아니고 빈 상태로 폴백하지 않는다.** FS-040 보다 낫다: 배너가 **본문만** 대체하고 **조회 조건 바(`:112`)는 남아** 다른 기간으로 복구할 수 있다 | `/stats/orders?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. **`stats-screens.test.tsx:86-97` 이 이를 고정한다** — 배너·재시도 버튼 존재 + KPI 부재(실패와 0건을 섞지 않는다) | pass |
| STATE-04 | STATE | 직접 | ① **page clamp**: `table.ts:50-52` `clampPage` 를 `pageSlice`(`:55`)와 `rangeTextOf`(`:65`)가 쓰고 `StatsTable.tsx:196` 가 `page={Math.min(page, totalPages)}` 로 DS 에 넘긴다 — 범위 밖 page 는 마지막 유효 페이지를 그린다 ② **조건 변경 시 page 되돌림**: `useStatsParams.ts:216` `next.delete('page')` 가 기본 동작이다(예외는 metric·setPage 자신) ③ **행 선택 없음** — 요구의 '숨겨진 행의 선택 해제'는 대상이 없다(읽기 전용). ⚠ clamp 는 **렌더 시점**이라 URL 의 `page=99` 는 그대로 남는다 — 표시는 옳고 링크만 낡는다 | `?page=99` 로 진입 → 마지막 유효 페이지의 행 + '전체 N건 중 …'이 그 페이지 범위로 뜬다(false-empty 없음). 25건→100건으로 크기 변경 → page 파라미터가 URL 에서 사라진다 | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 + `_shared/**` 의 스타일 객체가 전부 `var(--tds-*)` 를 참조한다 — `OrderStatsPage.tsx:54-58`(`keywordCellStyle` 계열 없음, 이 화면은 스타일 객체가 없다시피 하다) · `StatsFilterBar.tsx:33-90` · `StatsTable.tsx:28-64` · `StatsKpiRow.tsx:20-48` · `ShareBarList.tsx:29-89` · `StatsPageShell.tsx:24-54`. **grep 실측**: `pages/stats/**` 에서 `#hex` **0건** · `[0-9]+px` **0건** · `(outline\|border): (thin\|medium\|thick)` **0건** <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `pages/stats/**` 에 위 3종 grep = 0(실측). lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 프리셋 버튼 7개(`StatsFilterBar.tsx:133` `className="tds-ui-focusable tds-ui-listitem"`) · 정렬 헤더 버튼 7개(`StatsTable.tsx:137`) · DS `Button`/`SelectField`/`SegmentedControl`/`DateRangeField`/`Pagination` — 이 전부가 DS 의 `tds-ui-focusable` 계약을 상속한다. **이 화면은 자체 `:focus-visible` 규칙을 선언하지 않는다** | 판정은 DS(`packages/ui`) 소유 문서를 따른다. `pages/stats/**` 에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰을 소비하는 표면은 ① 스켈레톤 펄스(`tds-ui-skeleton` — `StatsTable.tsx:168` · `ShareBarList.tsx:116` · `StatsCard.tsx:50`) ② 내보내기 토스트(`useCsvExport.ts:75,82`) 둘이며 **전부 DS 소유**다 | 판정은 tokens codegen · Toast 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | 이 화면의 elevation 표면 — `StatsCard`(KPI 5장 `StatsKpiRow.tsx:77` · 추이 `StatsTrendCard.tsx:85`) · `Card`(드릴다운 `OrderStatsPage.tsx:303`) · 토스트. 전부 DS 소유. `StatsFilterBar.tsx:38-43` 의 조회 조건 바는 **border + surface** 이지 그림자가 아니다. 이 화면은 `box-shadow` 를 선언하지 않는다 | 판정은 DS(`Card`·`Toast`) 소유 문서를 따른다. `pages/stats/**` 에서 `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — `StatsPageShell.tsx:6-8` 이 그 결정을 명시한다('여기서 h1 을 또 그리면 같은 제목이 두 번 뜨고 제목의 원천이 둘로 갈린다'). 제목은 AppHeader 가 낸다. **>18px tier 소비 표면은 실재한다** — KPI 값이 `StatsCard` 의 `display.sm`(`StatsCard.tsx:12-14,55` `.tds-statscard__value`)로 세워진다(`StatsKpiRow.tsx:81` 이 `value` 를 넘긴다). 카드 제목은 `<h2>`(`StatsCard.tsx:37`) | 판정은 tokens typography · `StatsCard` 소유 문서를 따른다. **이 화면의 title 소스는 하나다** — IA-02 참조 | 종속 |
| COMP-10 | COMP | N/A | **이 화면에 text-search/filter 입력이 없다.** `OrderStatsPage.tsx:268-288` 이 `StatsPageShell` 에 **`searchLabel` 을 넘기지 않으므로** `StatsFilterBar.tsx:209` 의 `searchLabel === undefined` 분기가 SearchField 를 그리지 않는다. IME 조합이 일어날 입력이 존재하지 않는다. 나머지 입력은 `SelectField` 2개(비교·세그먼트)와 `DateRangeField`(`type="date"`) — 전부 조합 대상이 아니다.<br>(⚠ **응답 경합 축은 별도로 이미 막혀 있다** — 기간·비교가 전부 `queryKey` 에 들어가(`:142`) 늦게 온 이전 조건의 응답이 **다른 키의 캐시**로 들어갈 뿐 현재를 덮지 못한다. `queries.ts:14-16` 이 그 설계를 명시한다) | 재현할 표면 없음 | N/A |
| FEEDBACK-02 | FEEDBACK | N/A | **이 화면에 파괴적/비가역 액션이 없다.** 서버 쓰기 0건(FS-057 §4.1)이고, 상태 변경은 전부 URL 조회 조건이며, 내보내기는 파일 생성이라 되돌릴 것이 없다. ConfirmDialog 로 게이트할 대상이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **이 화면에 편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다(조회 조건 입력은 즉시 URL 에 커밋되므로 '미저장 상태'가 존재하지 않는다). 잃을 입력이 없어 이탈 3경로를 가드할 대상이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **이 화면에 modal 이 없다.** `Modal`/`ConfirmDialog` 를 import 하지 않는다. 카드·배너·토스트뿐이다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다** — 내보내기 성공 `'N건을 내보냈습니다.'`(`useCsvExport.ts:75`) · 실패(`:82`). `useToast`(`:17,40`)를 통해 앱 공용 `ToastProvider` 의 항상 마운트된 live region 을 소비한다. **이 화면은 자체 live region 을 만들지 않는다.** (FS-040 과 다른 지점 — 저쪽은 토스트가 0건이라 N/A 였다) | 판정은 `ToastProvider`(`shared/ui/ToastProvider.tsx`) 소유 문서를 따른다. 이 화면에서는 '내보내기 결과가 그 viewport 로 나간다'만 확인. 재현: `/stats/orders` → '엑셀 내보내기' → 성공 토스트 announce | 종속 |
| A11Y-02 | A11Y | N/A | **이 화면에 Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다(FEEDBACK-06 과 같은 사유) | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | 상속 | **폼 컨트롤이 실재한다** — `SelectField`(비교 `StatsFilterBar.tsx:171` · 세그먼트 `:193` · 페이지당 `StatsTable.tsx:195`) · `DateRangeField`(`:151`, `preset=custom` 일 때). **전부 DS 가 field-association 을 자동 배선한다**: `DateRangeField.tsx:45` 가 `aria-invalid` 를 **항상** `aria-describedby` 와 짝지어 내보내고(`invalidProps` 가 두 속성을 함께 준다), 유효할 때는 **둘 다 부여하지 않는다**(`aria-invalid="false"` 를 남기지 않는다). 에러 `<p>` 는 `role="alert"` + 그 id(`:94-97`). **이 화면에 required 필드가 0개**이므로 요구의 required 절은 대상이 없다(조회 조건은 전부 기본값이 있다). 손으로 만든 폼 컨트롤 0개 — `pages/stats/**` 에서 `aria-invalid` grep = 0(짝 없는 것도 0) | 판정은 DS(`DateRangeField`·`SelectField`) 소유 문서를 따른다. 재현: `?preset=custom&start=2026-07-16&end=2026-07-01` → 두 `<input type="date">` 가 `aria-invalid="true"` + `aria-describedby`→`role="alert"` `<p>` id. **`stats-screens.test.tsx:125-136` 이 메시지가 정확히 1회 뜸을 고정한다** | 종속 |
| A11Y-12 | A11Y | 직접 | **요구의 appliesTo 표면(공유 `filterItemStyle` 을 쓰는 토글 필터)이 이 화면에 실재하고, 옳게 되어 있다.** 기간 프리셋 7개가 `filterItemStyle(active)`(`StatsFilterBar.tsx:16,85-90` `presetButtonStyle`)를 재사용하며 **`aria-pressed={active}`**(`:135`)로만 선택을 말한다. **`aria-current` 를 쓰지 않는다** — `pages/stats/**` 에서 `aria-current` grep = **주석 1건뿐**(`StatsFilterBar.tsx:7`, 금지를 서술하는 문장). 이 화면이 그 바를 소비하는 자리는 `OrderStatsPage.tsx:268-273`(→ `StatsPageShell.tsx:112-121`). 그 밖의 토글(축·지표 `SegmentedControl`)은 DS 소유다 | `/stats/orders` → 프리셋 버튼 7개가 전부 `aria-pressed`(활성 1개 true). `aria-current` grep = 0(주석 제외). 색을 꺼도 어느 프리셋이 선택됐는지 AT 가 안다 | pass |
| MOTION-01 | MOTION | N/A | **이 화면에 Modal 이 없다**(FEEDBACK-06 과 같은 사유). enter/exit transition 을 적용할 다이얼로그가 없다 | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | 상속 | **표면이 실재한다 — 내보내기 결과로 토스트를 띄운다**(`useCsvExport.ts:75,82`). **요구는 이제 충족돼 있다**(PR #26): `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`) + keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), enter `:26-27`/`:109-119`. **요구가 명시한 수치를 그대로 만족한다** — `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`component.overlay` recipe `tokens/tokens.json:1298-1307` · `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조로 동등 달성했다. reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 성공 토스트를 dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`·`Toast` 소유 문서를 따른다. **이 화면 코드로 결정되지 않는다** | 종속 |
| MOTION-03 | MOTION | 상속 | **이 화면에 `transition`·`animation`·`transform` 선언이 0건**이다 — reduced-motion 게이트로 라우팅할 자체 모션이 없다. 이 화면이 **소비하는** 모션은 ① 스켈레톤 펄스(`tds-ui-skeleton`) ② 토스트 enter/exit 둘이며 전부 DS 소유다. 프리셋·정렬·축 전환은 즉시 반영된다(transition 없음) | 판정은 글로벌 Motion config · `ui.css` 스켈레톤 · `ToggleSwitch.css` 소유 문서를 따른다. 이 화면에서 `transition`/`animation` grep = 0 | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:323` — `{ path: '/stats/orders', element: <OrderStatsPage />, implemented: true }`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 레이아웃 라우트 아래에서 렌더된다. **이 화면은 자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `StatsPageShell.tsx:109` 의 `<div style={pageStyle}>`(flex column)다 | `/stats/orders` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지. 화면이 자체 header/sidebar 를 렌더하지 않는다 | pass |
| IA-02 | IA | 직접 | **충족.** `/stats/orders` 는 `nav-config.ts:201` 의 **잎**(`['주문 통계', '/stats/orders']`)이므로 `findCoveringLeaf`(`:260-278`)가 정확히 일치하는 잎을 찾아 `findNavLabel`(`:297-299`)이 AppHeader `<h1>` 에 **'주문 통계'** 를 그린다 — 가지 라벨('통계')로 폴백하지 않는다. 그리고 **이 화면에 in-content `<h1>` 이 없다**(`StatsPageShell.tsx:6-8` 이 의도를 명시) — 제목 소스가 AppHeader 하나뿐이라 **h1 이중 문제가 없다.** GROUND-TRUTH §7 이 지적한 '폼/상세 화면의 h1 2개'는 여기에 성립하지 않는다: 이 화면은 **하위 라우트가 없는 잎**이라 '등록/수정' 행위 반영 문제도 발생하지 않는다. 내부 구획은 `<h2>`(`StatsCard.tsx:37` · `CardTitle` · 권한 화면 `StatsPageShell.tsx:98`) | `/stats/orders` 진입 → AppHeader 제목이 '주문 통계'. `document.querySelectorAll('h1').length === 1`. 이 화면은 sub-route 가 없어 폴백 경로가 발생하지 않는다 | pass |
| IA-04 | IA | 직접 | **충족.** 요구의 템플릿을 이 화면의 표 구획이 따른다: ① **toolbar row** — 조회 조건 바(`StatsFilterBar.tsx:122`), 필터가 좌측이고 **내보내기(이 화면의 유일한 primary action)가 우측**이다(`:76` `spacerStyle` `marginInlineStart:'auto'` → `:221-250`) ② **결과 count 요약** — `'전체 1,234건 중 26–50'`(`StatsTable.tsx:191-201`) + 내보내기 버튼의 `(N건)`(`:246`) ③ **SelectionBar** — 대상 없음(bulk action 이 없다. 읽기 전용) ④ **table**(`:131`) ⑤ **Pagination**(`:228`, 한 페이지 초과 시). '등록/추가' 버튼의 부재는 옳다 — 집계는 만들 수 있는 것이 아니다. ⚠ count 요약이 표 **아래**(푸터)에 있다 — 요구의 순서('count 요약 → table')와 다르나 acceptanceCheck('count 요약을 보임')는 충족한다 | `/stats/orders` → 내보내기가 우상단, '전체 N건 중 x–y' 가 보인다, 25건 초과 시 Pagination 이 렌더된다 | pass |
| IA-05 | IA | N/A | **이 화면에 create/edit 폼이 없다** — `/stats/orders` 는 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/stats/orders/*` 가 0건). 만들거나 고칠 엔티티가 없다(집계는 읽는 것이다). `App.tsx:319` 주석이 이 섹션의 설계를 명시한다: '라우트가 아니라 URL 파라미터가 화면 상태의 원천이다' | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — 이 화면의 강점이다.** `useStatsParams.ts:35,157` 이 `useSearchParams` 로 **조회 조건 전체를 URL 에 싣는다**: `preset` · `start`/`end` · `compare` · `segment` · `view` · `metric` · `sort`/`dir` · `page` · `size` · `q`. 화면 로컬 `useState` 는 **'오늘'의 고정값 하나뿐**(`:162`)이고 그것은 조회 조건이 아니라 계산 기준점이다. 기본값이면 파라미터를 지워 URL 을 정규화한다(`:203-204,214`). 조건이 바뀌면 page 를 되돌린다(`:216`).<br>**⚠ GROUND-TRUTH §3 정정**: '통계가 `useListState` 를 경유해 소비한다'는 기술은 **코드와 다르다.** `useStatsParams` 는 `useListState` 를 import 하지 않는다 — `shared/crud` 에서 가져오는 것은 **`parseFilter` 하나뿐**(`:37`)이다. `:16-33` 이 **왜 공유본을 쓰지 않는지**를 네 가지 이유로 명시한다(2축 정렬 · page-size 부재 · preset↔custom 관계 · 파라미터별 page 정책 차이). 즉 IA-13 은 **공유 훅 경유가 아니라 이 섹션 자체 구현으로** 충족된다 <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 pass 는 이전 기준에서 `page` 축이 조용히 깨진 채였다.** `StatsFilterBar.tsx:118` 이 `useDebouncedSearch` 를 **검색 입력 유무와 무관하게** 걸고 그 훅이 **마운트 직후에도 한 번 커밋**하므로, 그 커밋이 `setKeyword` 를 통과하면 `update` 가 `page` 를 지워(`:216`) **`?page=3` 링크로 들어온 운영자가 250ms 뒤 1페이지로 튕겼다 — 통계 6화면 전부.** 형제 문서 3벌(NFR-054·055·056)이 그것을 `gap` 으로 잡았고, 이 문서는 그 축을 놓쳤다. **커밋 `6acb235` 가 고쳤다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`(근거 주석 `:275-285`). 회귀 테스트 `useStatsParams.test.tsx:222-290` — `StatsFilterBar` 배선 재현 하네스(`:231`) + page 보존 2건 + '가드가 과하지 않다' 1건(`:287`). **로그 섹션의 같은 결함도 함께 고쳐졌다**(`list-state.ts:224` — NFR-060 §2 IA-13). **세 벌(`useListState`·통계·로그)이 한 규칙으로 정렬됐다.** | `/stats/orders` → '지난 달' → 비교 '전년 동기' → '배송보류' → 정렬 '취소' → 3페이지 → URL 이 `?preset=lastMonth&compare=lastYear&segment=holding&sort=canceled&dir=desc&page=3`. **F5 → 같은 화면**. URL 을 새 탭에 붙여넣기 → 같은 화면. `?preset=last7` 로 기본값을 주면 URL 에서 사라진다(정규화). ⚠ `replace:true`(`:219`)라 조건 변경이 history 를 쌓지 않는다 — 의도이며(`:8-10`) 이 화면엔 상세 라우트가 없어 IA-13 의 'detail 후 Back' 시나리오가 성립하지 않는다 | pass |
| EXC-01 | EXC | 상속 | 이 화면의 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가 잡고(사이드바 유지 + 복구 UI), 셸 자체의 예외는 `App.tsx` 의 루트 경계가 잡는다. 이 화면은 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다. 이 화면에서는 '자체 경계를 두지 않고 셸 경계에 의존한다'만 확인 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `App.tsx` 의 `<RequireAuth>` 가 AppShell 바깥에서, mid-session 401 은 `shared/query/queryClient.ts` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useStatsQuery` → `useQuery`)이 그 캐시를 통과하므로 자동으로 덮인다. **이 화면은 보존할 입력이 없어 재인증 손실이 0이다** — EXC-19 의 dirty draft 문제가 여기엔 존재하지 않는다. 재로그인 후 `returnUrl` 로 돌아오면 **조회 조건까지 URL 에 있어 그대로 복원된다**(IA-13 의 부수 효과) | 판정은 `RequireAuth`·`queryClient`·`session-expiry` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **read 게이팅과 쓰기(export) 게이팅이 둘 다 있다.** ① **read**: `StatsPageShell.tsx:91-104` 가 `usePermissions().can(navPageResourceId('/stats/orders'), 'read')` 를 확인해 **화면을 그리기 전에** 403 을 낸다 ② **export**: `:119` `canExport={can(resourceId,'export')}` → `StatsFilterBar.tsx:223` 이 false 면 **버튼을 그리지 않는다**(비활성이 아니라 부재 — `StatsPageShell.tsx:11-12` 가 그 원칙을 명시: '없는 권한을 손잡이로 보여주지 않는다'). `export` 는 실재하는 액션이다(`resources.ts:31,46`). **GROUND-TRUTH §3 의 `useRouteWritePermissions` 소비 7곳에 stats 가 없는 것은 맞다** — 이 화면은 그 훅 대신 `usePermissions().can` 을 직접 쓴다. 결과는 같다(쓰기 게이팅 실재).<br>⚠ **두 가지 흠**: (a) 앱 공용 `RequirePermission` 과 **이중 게이트**이고 셸이 **공유 `ForbiddenScreen` 이 아닌 자체 문구**를 낸다(FS-057 §7 #5) (b) **`export` 권한은 데이터 반출 통제가 아니다** — CSV 를 브라우저가 만들어(`useCsvExport.ts:59-76`) 요청이 나가지 않는다. 화면을 볼 수 있으면 데이터는 이미 브라우저에 있다(BE-057 §7.1) | read 권한을 끈 역할로 `/stats/orders` deep-link → 403. `export` 를 끈 역할 → 내보내기 버튼이 **DOM 에 없다**. ⚠ 프론트 리소스(`page:/stats/orders`)와 서버 데이터 권한(주문 도메인)이 다른 축이다 — BE-057 §7.1. §5 #8 | pass |
| EXC-04 | EXC | N/A | **이 화면은 write 를 하지 않는다** — 요구의 appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. 낙관적 동시성 토큰을 실을 요청이 없다. (GROUND-TRUTH §4 의 `createStoreAdapter` 도 이 화면과 무관하다 — stats 는 `shared/crud` 의 어댑터 계열을 쓰지 않고 자기 `data-source.ts` 를 갖는다) | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **이 화면에 서버로 나가는 user-initiated write 가 0건**이다 — 중복 제출을 막을 submit/confirm 이 없다. 프리셋·정렬·페이지 연타는 URL 갱신일 뿐이고, 같은 조건은 같은 `queryKey` 라 캐시가 받는다.<br>(⚠ **관련 사실**: 내보내기에는 **동기 중복 실행 락**이 있다 — `useCsvExport.ts:51-52` `if (controllerRef.current !== null) return;` 가 진행 중 두 번째 요청을 무시한다. 요구가 지시하는 `submitLockRef` 와 같은 결이나, **서버 요청이 아니라 파일 생성**이라 EXC-08 의 appliesTo 밖이다. 멱등키도 대상이 없다 — 나가는 요청이 없다) | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **두 경로 모두 실재하고 옳다.** ① **조회 abort**: `queries.ts:38` `queryFn: ({ signal }) => fetcher(signal)` → `fetchOrderStats(query, signal)`(`data-source.ts:82`) → `loadStats(…, signal, …)` → `wait(readDelayMs(), signal)`(`mock.ts:51`). 화면 이탈 시 react-query 가 abort 하고 **취소된 쿼리는 `error` 를 세팅하지 않으므로** FS-057-EL-014 배너가 뜨지 않는다 ② **내보내기 abort**: `useCsvExport.ts:81` `if (isAbort(cause)) return;` — **공유 predicate `isAbort`(`shared/async`)를 그대로 쓴다**(`:15`). 취소 시 **에러 토스트가 없고**(`:81`) `finally`(`:84-87`)가 `isExporting`/`controllerRef` 를 리셋해 **버튼 state 가 복원된다**. `wait(0, controller.signal)`(`:68`)이 청크 사이에서 중단을 받는다 | 조회 중(400ms 안에) 다른 메뉴로 이동 → 실패 배너·토스트가 뜨지 않는다. 내보내기 중 '취소' 클릭 → **토스트 없이** 멈추고 버튼이 '엑셀 내보내기 (N건)'으로 돌아온다. `?delay=5000` 으로 창을 넓혀 재현 | pass |

### 2.1 P0 판정 요약

| 판정 | 건수 | 요구 ID |
|---|---|---|
| `pass` | **10** | STATE-02 · STATE-04 · TOKEN-01 · A11Y-12 · IA-01 · IA-02 · IA-04 · IA-13 · EXC-03 · EXC-09 |
| `종속` | **10** | TOKEN-02 · TOKEN-03 · TOKEN-04 · TOKEN-05 · A11Y-01 · A11Y-11 · MOTION-02 · MOTION-03 · EXC-01 · EXC-02 |
| `N/A` | **9** | COMP-10 · FEEDBACK-02 · FEEDBACK-04 · FEEDBACK-06 · A11Y-02 · MOTION-01 · IA-05 · EXC-04 · EXC-08 |
| `gap` | **1** | STATE-01 |
| **합계** | **30** | 10 + 10 + 9 + 1 = **30** ✔ |

> **★ 이번 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집힌 P0 판정은 없다 — 이 표의 30건은 그대로다.** 그러나 **P0 표 밖에서 세 건이 뒤집혔다**, 전부 이 문서가 이관한 것이 이행된 결과다:
> ① **ERP-05 `gap`/`부분 pass` → `pass`**(§3) — `527fc1b` 이 범위 요약·크기 선택을 DS `Pagination` 으로 수렴하고 자작 사본을 지웠다. **`role="status"` announce 가 생겼고**(`Pagination.tsx:171-172`) 그 결과 **A11Y-16 의 미충족이 하나 줄었다**.
> ② **TOKEN-13 주석 오류 → 종결**(§3 · §5) — `StatsTrendCard.tsx:8-15` 와 `ShareBarList.tsx:7-11` 이 'chart.series 가 2개뿐' 이라는 거짓 전제를 철회하고 참인 근거로 갈아 적었다.
> ③ **IA-13 의 `page` 결함**(형제 문서 3벌이 `gap` 으로 잡았고 이 화면도 같은 코드를 공유했다) — `6acb235` 의 가드(`useStatsParams.ts:288`)로 해소.
> **P0 표가 이 화면의 변화를 담지 못한다는 사실 자체는 그대로다.**
>
> **P0 gap 1건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 다만 그 1건은 **화면의 실수가 아니라 요구 간 모순**이다(§4.5) — STATE-01 의 문자만 보면 이 화면은 **pass** 이고, F3b 가 확정한 해석(유지 규칙은 컨트롤 비종속 재조회에 한한다)을 적용해야 gap 이 된다. **그리고 그 해소는 `packages/ui` 계약에 막혀 있다**(§5 #2).
> **N/A 9건은 이 화면이 읽기 전용 집계 뷰이기 때문이며 결함이 아니다**(§1.2). 다만 N/A 를 '문제 없음'으로 읽어서는 안 된다 — **이 화면에 없는 것이 문제인 축**(개별 주문 드릴다운·상태별 추이·집계 신선도)은 §4.4 에 남겼다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족 — 그러나 그 충족이 §2 STATE-01 gap 의 원인이다.** `queries.ts:40` `placeholderData: keepPreviousData` 가 조건 변경 중 이전 결과를 유지해 표가 빈칸으로 깜빡이지 않는다. 요구가 바라는 바 그대로다. **두 요구가 같은 코드 한 줄을 반대로 평가한다** — §4.5 | 기간을 바꾸는 동안 표·차트가 blank 되지 않는다(코드 대조상 성립) | pass |
| STATE-05 | P1 | **충족.** `StatsEmpty`(`StatsEmpty.tsx:34-42`)가 DS `Empty` 를 감싸 3분기를 낸다. 이 화면은 **검색 입력이 없어 2분기만 성립**한다: `hasQuery` 를 넘기지 않고(`OrderStatsPage.tsx:328-332,349-354`) `hasActiveFilters={params.hasActiveFilters}` + `onResetFilters` 를 넘긴다 → 조건이 기본값에서 벗어났으면 '필터에 맞는 주문 기록이 없습니다' + **'필터 초기화'** 버튼, 아니면 '**집계**된 주문 기록이 없습니다'. `createVerb='집계'`(`StatsEmpty.tsx:37`)가 통계에 맞는 동사다 — '등록된 주문 기록이 없습니다'는 틀린 문장이고 생성 CTA 도 없다(만들 수 있는 것이 아니다). 조사(이/가)는 `Empty.tsx:16-27` 이 받침으로 고른다 | `?empty=stats-orders` → '집계된 주문 기록이 없습니다'(CTA 없음). `?empty=stats-orders&segment=holding&compare=none` → '필터에 맞는 …' + '필터 초기화'. `role="status"`(`Empty.tsx:104`) | pass |
| STATE-06 | P1 | **N/A(표면 부재).** 이 화면에 write 가 0건이라 invalidate 할 대상이 없다. 다른 화면(주문 관리)의 write 가 이 화면을 stale 하게 만들 수 있으나 **쿼리 키를 공유하지 않는다**(`['stats','orders',…]` vs 주문 관리의 키) — 즉 주문을 고쳐도 이 화면은 갱신되지 않는다. 그것이 결함인지는 **집계 신선도 계약**(BE-057 §7.6 #1)이 정해질 때 판정 가능하다 | 재현할 표면 없음 | N/A |
| COMP-06 | P1 | **충족.** 스켈레톤 행 수 = **페이지 크기**(`StatsTable.tsx:164` `Array.from({length: pageSize})`), 칸 수 = **실제 컬럼 수**(`:178` `columns.map`) — 하드코딩 `length: 5` 가 없다. 구성비 막대도 같다: 막대 수 = **상태 7종**을 호출부가 준다(`OrderStatsPage.tsx:326` `skeletonCount={ORDER_STATUSES.length}` · `ShareBarList.tsx:96-101` 이 그 이유를 명시 — '로딩 중에는 items 가 비어 있어 셀 수 없다') | `pages/stats/**` 에 skeleton `length: 5` grep = 0. `?size=100` → 스켈레톤 100행 | pass |
| COMP-11 | P1 | **대체로 충족.** ① **preset** 7종(`period.ts:134-166` — 오늘/어제/최근 7일/최근 30일/이번 달/지난 달/직접 입력)이 한국형 커머스 어드민 관례다(`:120-121`) ② **`start ≤ end` 강제** — `periodErrorOf`(`:200-206`)가 '종료일은 시작일보다 빠를 수 없습니다.' 를 내고 `StatsPageShell.tsx:130` 이 **본문을 그리지 않는다**. 조용한 empty 가 아니다 ③ **인라인 검증 메시지** — 배너가 아니라 **틀린 입력 옆에** `role="alert"`(`DateRangeField.tsx:94-97`). `StatsPageShell.tsx:125-129` 가 배너 중복을 의도적으로 뺀 이유를 명시한다('스크린리더는 두 번 읽으며, 고칠 곳에서는 오히려 멀어진다') ④ **URL 반영** — `preset`/`start`/`end` 가 전부 URL(§2 IA-13) ⑤ **ko-KR 포맷** — `formatPeriodLabel`(`period.ts:216-220`)이 '2026.07.10 ~ 2026.07.16 (7일)'. **미충족**: 공유 `DateRangeFilter` 가 아니라 이 섹션의 조합이다(다만 DS `DateRangeField` 는 쓴다). **기간 상한이 없다**(BE-057 §7.6 #3) | `?preset=custom&start=2026-07-16&end=2026-07-01` → 검증 메시지가 **정확히 1회**, 본문 미렌더. **`stats-screens.test.tsx:125-136` 이 고정한다** | pass |
| ERP-04 | P1 | **충족 — 이 섹션이 자기 표를 갖는 이유다.** `StatsTable.tsx:127-155`: clickable header(`:147` 버튼) · **`aria-sort`**(`:144`, `th` 가 갖는다 — '정렬 상태는 열의 속성이지 버튼의 속성이 아니다' `:143`) · 가시 방향 인디케이터(`:157-159` ▲▼↕, `aria-hidden` — `aria-sort` 가 이미 알린다) · keyboard 조작(`<button className="tds-ui-focusable">`) · sr-only 설명(`:160-162`). numeric 컬럼은 우측 정렬 + `numericCellStyle`(tabular-nums, `:126`). 같은 컬럼 재클릭 시 방향 반전(`useStatsParams.ts:308-315`). 정렬은 **안정 정렬**이고 tie 를 index 로 깬다(`table.ts:28-32`), 문자열은 `localeCompare('ko-KR')`(`:36`). **`StatsTable.tsx:2-8` 이 DataTable 을 쓰지 않는 이유를 밝힌다**: 'DataTable 은 정렬을 모른다 … 통계는 정렬이 부가 기능이 아니라 본체다'. → 보고: DataTable 에 sortable 헤더를 얹어 이 표를 지우는 것이 옳다(`packages/ui` 는 F1 소유) | `/stats/orders` → '취소' 헤더 클릭 → `aria-sort="descending"` + ▼ + URL `?sort=canceled&dir=desc`. 재클릭 → `ascending` + ▲. 한글 정렬이 '가나다' 순 | pass |
| **ERP-05** | P1 | **충족 — 이전 기준의 gap 이 해소됐다.** **★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다 — 커밋 `527fc1b` `refactor(admin): ERP-05 범위 요약을 DS 로 수렴하고 자작 2벌을 지운다`.** 이전 기준에서 이 화면은 범위 요약과 크기 선택을 **자기가 그렸고**, `Pagination` 에 `page`·`totalPages`·`label`·`onChange` 만 넘겨 **DS 의 opt-in 스위치를 끈 채**(`Pagination.tsx:112` `showRange = pageSize > 0` → false) 사본을 세웠다. **지금은 DS 가 그린다** — `StatsTable.tsx:195-204` 이 `page`·`totalPages`·**`total={rows.length}`**·**`pageSize`**·**`pageSizeOptions={PAGE_SIZE_OPTIONS}`**·`label`·`onChange`·**`onPageSizeChange`** 를 전부 넘긴다. 따라서 `showRange`(`Pagination.tsx:112`)와 `showSizeSelect`(`:113`)가 **둘 다 true** 가 되고 `:171-172` 의 **`<p className="tds-pagination-bar__summary" role="status">{rangeTextOf(total, page, pageSize)}</p>`** 와 `:177-194` 의 크기 선택기가 렌더된다. **요구의 세 절이 전부 DS 표면에서 충족된다**: ① total-range ② page-size selector ③ range math 의 경계 단언(`rangeTextOf` `Pagination.tsx:41-47` — 마지막 페이지 잘림 `:46` · 범위 밖 page clamp `:43-45`, 근거 주석 `:36-39`).<br>**그리고 사본이 지워졌다** — `table.ts:58-60` 이 그 이력을 남긴다: '[ERP-05] 범위 요약문(전체 1,234건 중 26–50)은 여기 있었다. DS Pagination 이 pageSize 를 받으면 **같은 것을 그리고(수식이 동치다) 경계 단언까지 갖고 있으므로**, 사본을 지우고 그쪽을 쓴다'. `StatsTable.tsx:191-194` 도 같다 — '**같은 것을 두 벌 그리면 수식이 갈라진다**(실제로 로그 쪽 사본은 clamp 가 없어 범위 밖 page 에서 *전체 3건 중 81–80* 같은 헛것을 그렸다). **page 의 clamp 도 DS 가 한다** — 여기서 `Math.min` 을 다시 걸 필요가 없다'. **이전 기준이 지적한 `rangeTextOf` 두 벌이 한 벌로 수렴했다.**<br>⚠ **형제 섹션은 아직이다** — 로그 4화면은 여전히 자기 `SummaryText` 를 그리고 `Pagination` 에 `pageSize` 를 넘기지 않는다(NFR-060 §3 ERP-05). **즉 이 수렴은 통계 섹션에서만 일어났다.** | `/stats/orders` → 표 아래에 **`.tds-pagination-bar`** 가 렌더된다: 범위 요약 `<p role="status">전체 N건 중 x–y</p>` + '페이지당' 크기 선택 + 번호 줄. **페이지를 넘기면 `role="status"` 가 새 범위를 announce 한다.** `StatsTable.tsx` 에 `rangeTextOf` grep = 0 · `SelectField` grep = 0(사본이 없다). 판정의 나머지는 DS `Pagination` 소유 문서를 따른다 | pass |
| ERP-03 | P1 | **부분 충족.** **sticky thead 는 있다** — `StatsTable.tsx:35-40` `stickyHeadStyle`(`position:'sticky'` · `insetBlockStart:0` · `zIndex:1`)를 `:121-123` 이 모든 헤더 셀에 먹인다. FS-040(sticky 0건)과 대조된다. **미충족**: SelectionBar 가 없어(bulk 없음) 그 축은 대상이 아니고, on-scroll elevation 토큰은 쓰지 않는다. z-index 가 **리터럴 1** 이다(토큰이 아니다 — `:42`) | 25행 이상에서 스크롤 → 헤더가 남는다. `zIndex: 1` 이 토큰이 아니다 | 부분 pass |
| ERP-07 | P1 | **N/A(표면 부재) — 그러나 규약은 지킨다.** 이 화면의 표에 **금액 컬럼이 없다**(주문 통계의 지표는 건수와 비율뿐 — `OrderStatsPage.tsx:61-118`). 다만 섹션 규약이 요구를 이미 인코딩한다: `format.ts:12-14,35-38` 이 '표의 금액 칸은 숫자만 담고 단위는 컬럼 헤더가 이름표로 갖는다'를 명시하고 `withUnitSuffix`(`:30-33`)를 둔다. 이 화면은 **비율**에 그 규약을 적용한다 — 헤더 '취소율 (%)'(`:104`)이고 값은 `formatPercentValue`(숫자만, `:106`) | 재현할 표면 없음(금액 컬럼 부재). 유입 분석(NFR-058)이 이 축의 당사자다 | N/A |
| ERP-08 | P1 | **충족.** 표의 모든 숫자가 공유·섹션 포매터를 경유한다 — `formatNumber`(`shared/format`, `OrderStatsPage.tsx:13,74,82,90,98`) · `formatPercentValue`(`format.ts:41-43`, `:106,114`) · `formatMetric`(KPI, `StatsKpiRow.tsx:81`) · `formatNumber`(범위 요약 — **기준 `a5c2639` 부터 DS 가 그린다**: `Pagination.tsx:41-47` `rangeTextOf`. 섹션 사본은 지워졌다 — `table.ts:58-60` 이 그 이력을 남긴다). **raw `String()`/`toString()` 이 셀에 없다**(FS-040 의 `String(cell.booked)` 결함이 여기엔 없다). 상대시간 없음(집계 화면이라 적절). `format.ts:6-10` 이 shared/format 과의 경계를 명시한다 — 천단위·부호는 공유본을 **그대로 쓰고**, 여기 있는 것은 공유본에 없는 것(금액·비율·체류시간·증감)뿐이다 | 표 셀에 raw numeric toString 없음. 1,000 이상이 '1,234' 로 자릿수 구분 | pass |
| ERP-09 | P2 | **충족 — F3b 수렴의 수혜자다.** 이 화면의 '오늘'은 **서울 기준**이다: `useStatsParams.ts:162` `useState(() => formatDate(new Date()))` → `shared/format.ts:63` `DISPLAY_TIME_ZONE = 'Asia/Seoul'`(Intl `formatToParts`). 달력 산술의 앵커는 **UTC 정오** 한 벌이다 — `period.ts:77` `NOON_HOUR_UTC = 12` · `:97,104,115` `Date.UTC(…, NOON_HOUR_UTC)`, 그리고 `:9-13` 이 수렴 사실을 기록한다(이 파일의 사본은 **UTC 자정**이었고 정본이 **정오**를 쓴다 — 둘 다 UTC 앵커라 출력이 한 글자도 바뀌지 않았다). `shiftDays`/`dayCount`/`isCalendarDate` 는 `shared/format` 정본을 import 한다(`period.ts:16`). **브라우저 TZ 를 타지 않는다** — FS-040 의 `_shared/calendar.ts`(browser-local getter) gap 이 여기엔 성립하지 않는다.<br>**잔여**: `today` 가 마운트 시 고정이라 **자정을 넘겨 화면을 열어 두면 '최근 7일'이 하루 밀린다**. 다만 `:159-161` 이 그 선택의 근거를 밝힌다(매 렌더 `new Date()` → 의존성이 매번 달라져 **무한 재조회**). 고정이 옳고 날짜 변경 감지가 별도로 필요하다 | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 `/stats/orders` 진입 → **서울 기준 '오늘'로 기간이 잡힌다**(도쿄·베를린에서 봐도 같다). `shared/format.test.ts:90,117` 이 '산술의 앵커가 UTC 정오라 러너 타임존을 타지 않는다'를 고정 | pass |
| **ERP-12** | P1 | **대체로 충족 — 이 섹션의 강점이다.** ① **현재 필터 조건 전체** — `useCsvExport.ts:35-36` 이 '페이지 자르기 **전** 배열'을 받고 `OrderStatsPage.tsx:287` 이 `rows: stats.daily`(페이지 슬라이스가 아니다)를 넘긴다 ② **한국어 헤더** — `columns[].header`(`:63,71,80,…`) ③ **값은 표시대로** — `StatsColumn.csv` 가 `render` 와 **같은 원천**을 쓴다(`types.ts:39-53` 이 그 설계를 명시: '셋을 따로 두면 내보낸 엑셀과 화면의 숫자가 갈라진다'). 실제로 `:74-75` 가 `render`/`csv` 둘 다 `formatNumber(row.orders)` ④ **UTF-8 BOM** — `shared/download.ts` `downloadCsv` 가 붙인다(`useCsvExport.ts:7,16,73`) ⑤ **진행률 + 취소** — 200행마다 이벤트 루프 양보(`:66-69`), `role="status"` 진행률(`StatsFilterBar.tsx:228-233`), 취소 버튼(`:234-236`) ⑥ **scope label** — `'엑셀 내보내기 (N건)'`(`:246`) + `'내보내기는 현재 조건 전체를 담습니다.'`(`:254`).<br>**미충족**: (a) 공유 export 유틸이 아니라 **이 섹션의 것**이다(`shared/download.ts` 는 공유이나 `useCsvExport` 는 stats 소유) (b) **진행률이 이 화면에서 도달 불가능에 가깝다** — 행 수 = 기간의 날 수라 최근 7일이면 7행, `CHUNK_ROWS=200` 에 한 번도 닿지 않아 **0%→100% 로 건너뛴다**(FS-057 §7 #6) (c) **`export` 권한이 반출 통제가 아니다** — 클라이언트 생성이라 요청이 없다(BE-057 §7.1) | `/stats/orders?preset=last30&view=status` → '엑셀 내보내기 (7건)' → 상태별 7행 CSV(헤더 '상태','건수','구성비 (%)'), 엑셀에서 한글 정상. **진행률은 보이지 않는다**(7행 < 200) | 부분 pass |
| ERP-13 | P1 | **충족(상속).** 이 화면의 조사 주입 표면은 빈 상태 하나다 — `StatsEmpty` → `Empty.tsx:16-27` `hasBatchim`/`subjectParticle` 이 label 의 받침으로 '이/가'를 고른다. `label='주문 기록'`(`OrderStatsPage.tsx:350`) → 받침 없음('록'은 받침 있음 → '이') → '집계된 주문 기록**이** 없습니다'. `label='주문'`(`:329`) → '집계된 주문**이** 없습니다'. **리터럴 '이(가)' 를 출하하지 않는다** — `pages/stats/**` 에서 `이(가)`/`을(를)`/`은(는)` grep = 0. (GROUND-TRUTH §2 의 `shared/format.ts:269+` 조사 헬퍼는 `shared/crud` 계열이 쓰고, DS `Empty` 는 레이어 경계 때문에 **자족 헬퍼**를 갖는다 — `Empty.tsx:7-8` 이 그 이유를 명시. 두 구현이 있으나 경계가 다르다) | `?empty=stats-orders` → '집계된 주문 기록이 없습니다'. 리터럴 조사 grep = 0 | pass |
| ERP-15 | P1 | **충족.** 렌더 규모가 **기간의 날 수로 묶인다** — `daily` 행 수 = `eachDay(period).length`(`data-source.ts:71-73`). 최근 7일이면 7행, 최근 30일이면 30행이다. 페이지 크기 상한 100(`useStatsParams.ts:50`)이라 DOM 은 최대 100행. 구성비 막대는 **7항목 고정**(상태 수). 넓은 표는 `overflowX:'auto'` 컨테이너 안에서 가로 스크롤한다(`StatsTable.tsx:28-32,118`) — 페이지를 넘치지 않는다. 정렬·페이지가 순수 함수라 `useMemo` 없이도 O(n log n) · n ≤ 365. **FS-040 의 'O(셀 × N) 매 렌더 전량 스캔' 위험이 여기엔 없다.**<br>**⚠ 단 상한이 기간에 걸려 있고 기간에 상한이 없다** — `?preset=custom&start=1900-01-01&end=2100-01-01` 이면 `eachDay` 가 **73,000 행**을 만든다(BE-057 §7.6 #3) | 최근 30일 → 30행. `?size=100` → DOM 100행. 12컬럼이 아니라 7컬럼이라 가로 스크롤이 드물다. **`?preset=custom&start=1900-01-01&end=2100-01-01` → 73,000 행 생성 시도**(§5 #5) | 부분 pass |
| A11Y-08 | P1 | **N/A(표면 부재).** row-nav 가 없다 — 표의 행이 클릭 가능하지 않고 detail 로 가는 경로가 이 화면에 없다(`StatsTable.tsx:173-180` 에 `onClick`/`rowNavProps` 0건). 요구의 appliesTo(`useRowNavigation`, row-nav 리스트)에 해당하지 않는다. (개별 주문으로 못 내려가는 것 자체는 §4.4 · FS-057 §7 #10) | 재현할 표면 없음 | N/A |
| A11Y-09 | P1 | 이 화면의 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(`thStyle` · `ShareBarList.tsx:69` 트랙 배경) · `surface-default` 위 `text-muted`(설명 `StatsPageShell.tsx:32` · 힌트 `StatsKpiRow.tsx:44` · 범위 요약 `mutedTextStyle` · 라벨 `StatsFilterBar.tsx:69`) · `feedback-success-text`/`feedback-danger-text` 위 surface(증감 `DeltaText.tsx:19-23`) · `chart-label`/`chart-axis`(`LineAreaChart.tsx:166,173,225`) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다. **muted 사용이 광범위하다**(설명·힌트·라벨·범위·구성비) | 종속 |
| A11Y-16 | P1 | **대체로 충족 — FS-040 과 정반대다.** 이 화면의 신규 인터랙티브 표면은 ① 프리셋 토글 ② 정렬 헤더 ③ 구성비 막대이며, 손으로 그린 것은 ②③ 이다. **① semantic role**: 표가 네이티브 `<table>`/`<th scope="col">`(`StatsTable.tsx:119-129`) · `<caption>`(시각적으로 숨김, `:132`) · 프리셋이 `<ul>/<li>/<button>`(`:126-144`) — ARIA 를 발명하지 않고 네이티브를 쓴다 **② keyboard**: 전부 `<button>` 이라 Tab+Enter/Space. 격자가 아니라 표라 화살표 이동이 요구되지 않는다 **③ focus ring**: `tds-ui-focusable` **④ label/description 연결**: `aria-labelledby`(페이지당 `:210-214`, `htmlFor` 를 피한 이유를 `:208-209` 가 명시) · `aria-label`(차트 `StatsTrendCard.tsx:100`) **⑤ live region**: 빈 상태 `role="status"`(`Empty.tsx:104`) · 진행률 `role="status"`(`StatsFilterBar.tsx:231`) · 에러 `role="alert"`(`StatsCard.tsx:45`) **⑥ 이중 인코딩**: 증감 = 색 + ▲▼ + sr-only 문장 — **★ 기준 `a5c2639` 에서 그 3중이 한 컴포넌트로 수렴했고, 그 과정에서 이 화면의 결손 하나가 드러나 메워졌다.** 신설 `_shared/DeltaText.tsx`(`:47-55`)가 `<span aria-hidden="true">{formatDeltaPercent(delta)}</span>`(눈) + `<span style={srOnlyStyle}>{describeDelta(delta, unit)}</span>`(귀)를 한 벌로 낸다 — 소비처는 둘뿐이다: `DeltaText.tsx:52` · **`ShareBarList.tsx:141`**. **이전 기준에서 구성비 막대의 증감에는 SR 문장이 없었다** — 파일 머리말이 그 사실을 기록한다(`DeltaText.tsx:4-10`: 'KPI 카드와 구성비 막대가 각자 증감을 그렸고, 둘 다 TONE_COLOR 사본을 들고 있었으며, 그러다 한쪽이 어긋났다 … **ShareBarList — 색 + ▲/▼ (SR 문장 없음)**'). **이 화면은 상태별 구성비 막대를 실재로 갖는다**(`OrderStatsPage.tsx:322` — FS-057-EL-013) — 즉 **이 화면에서 실제로 발현하던 결손이다.** 근거도 명시적이다(`DeltaText.tsx:8-9`: '화살표 ▲ 는 눈에는 방향이지만 스크린리더에는 **문자**다 — 읽어 주는 이름이 리더·설정마다 다르고 아예 건너뛰기도 한다'). 회귀 테스트 `DeltaText.test.tsx:18-65`(5건 — 증가·감소·변동없음·색 제거 후 잔존·`isLowerBetter` 색 반전) · 프리셋 = 색 + `aria-pressed` · 정렬 = 색 + ▲▼ + `aria-sort` · 범례 = 색 점 + **글자 라벨**(`LineAreaChart.tsx:139-144`) **⑦ aria-busy**: 표(`StatsTable.tsx:119`) · 막대(`ShareBarList.tsx:112`) · 카드(`StatsCard.tsx:35`).<br>**미충족 1건**(이전 기준 2건에서 줄었다): ~~(a) 범위 요약에 `role="status"` 가 없다~~ → **✔ 해소됨(기준 `a5c2639` · `527fc1b`)** — `StatsTable.tsx:195-204` 이 `total`·`pageSize` 를 넘겨 DS 가 `Pagination.tsx:171-172` 의 `<p role="status">` 로 범위를 그린다(§3 ERP-05) · **(b) 조건을 바꿔 재조회하는 동안 아무것도 announce 되지 않는다** — `isFirstLoad=false` 라 `aria-busy` 조차 없다(§2 STATE-01). **이것이 남은 유일한 a11y 미충족이다** | 스크린리더로 `/stats/orders` 탐색 → 표 구조·정렬 상태·증감 방향이 전부 읽힌다. 색각 이상 시뮬레이션 → 증감·정렬·프리셋·범례가 **전부 구별된다**. **기간을 바꿔도 아무 announce 가 없고 이전 값이 남는다** | 부분 pass |
| IA-03 | P1 | **N/A** — 이 화면은 nav 잎이다(`nav-config.ts:201`). non-top-level route(detail/form)가 아니므로 breadcrumb 요구의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족.** ① **표가 bounded 가로 스크롤 컨테이너 안에 있다** — `StatsTable.tsx:28-32,118`(`overflowX:'auto'` + `minInlineSize:0`). 좁은 폭에서 페이지가 아니라 이 컨테이너가 스크롤된다 ② **KPI 가 반응형 그리드로 접힌다** — `StatsKpiRow.tsx:21-23` `repeat(auto-fit, minmax(…, 1fr))` → 좁으면 1열 ③ **조회 조건 바가 wrap** — `StatsFilterBar.tsx:48,54`(`flexWrap:'wrap'`) ④ **표 푸터도 wrap**(`StatsTable.tsx:59`). **미충족**: 최소 지원 폭 선언 없음 · identity 컬럼(일자) sticky 없음(가로 스크롤 시 어느 날인지 잃는다) · 정렬 헤더 버튼의 touch-target 미검증(`sortButtonStyle` 에 최소 크기가 없다 — `:45-56`) | 768px·375px 에서 `/stats/orders` → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다. KPI 5장이 1열로 접힌다. **가로 스크롤 시 '일자' 열이 함께 밀려 나간다** | 부분 pass |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 이 화면의 조회도 상한이 없다. **다만 STATE-01 과 곱해지지 않는다**: FS-040 은 타임아웃이 없으면 '영원히 0/4' 라는 **거짓 사실**을 보였으나, 이 화면은 `isFirstLoad` 가 참인 채로 **스켈레톤이 영원히 돈다** — 거짓말이 아니라 무응답이다. 그것이 낫지만 여전히 탈출구가 없다 | 응답하지 않는 백엔드를 붙이면 스켈레톤이 무한히 돈다. `?delay=999999` 로 근사 재현 | gap |
| EXC-06 | P1 | **미충족.** 조회 실패가 status 를 보지 않는다 — `queries.ts:47` `query.isError ? '통계를 불러오지 못했습니다.' : ''` 하나로 401/403/429/500/504 가 전부 같은 문구다. 에러 타입은 status 를 지니는데(`shared/errors/http-error.ts`) 이 화면이 읽지 않는다. **BE-057 §7.1 이 지적한 권한 불일치 상황**(프론트 가드 통과 후 서버 403)에서 운영자는 원인을 알 수 없다. 429 의 `Retry-After` 도 읽지 않아 '다시 시도'를 즉시 다시 누를 수 있다 | `?status=list:403` 과 `?status=list:500` 이 **같은 배너**를 낸다 | gap |
| EXC-10 | P1 | **N/A** — bulk 작업이 없다(선택 표면 0). 내보내기는 단일 작업이며 부분 실패 개념이 없다(전량을 한 번에 조립한다) | 재현할 표면 없음 | N/A |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 — 오프라인 전환 시 배너가 없다. 조회 실패가 일반 문구로 떨어진다 | 오프라인 전환 → '통계를 불러오지 못했습니다.'(오프라인임을 말하지 않는다) | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다(leaf 단일 뷰). 404 를 구분할 대상 id 가 없다. **집계에는 '대상 없음'이 성립하지 않는다** — 0건이면 200 + 빈 배열이다(BE-057 §5) | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk 작업·다중 선택이 없다. 파괴적 대량 작업이 존재하지 않는다. (내보내기는 **비파괴적**이며 `useCsvExport.ts:51-52` 의 락이 중복 실행만 막는다) | 재현할 표면 없음 | N/A |
| TOKEN-13 | P2 | **충족 — 그리고 이제 이 화면의 코드 주석도 그것을 안다.** `tokens.json:778-888` 에 `chart.series-1..6` + 각 `-fill` 이 **전부 존재하고** `LineAreaChart.tsx:29-44` 가 6계열 전부를 참조한다(`:22-26` 이 TOKEN-13 을 근거로 든다). **★ 기준 갱신(`4b805ad` → `a5c2639`) — 이전 기준의 '주석이 사실과 다르다' 는 해소됐다.** 두 파일이 전부 고쳐졌다: `StatsTrendCard.tsx:8-15` 가 이제 '**[계열 색 — 해결됨, 이 카드가 2계열인 건 이제 색 때문이 아니다]** … TOKEN-13 이 chart.series-3..6(+fill)을 tokens.json 에 넣었고 LineAreaChart 가 6계열까지 서로 다른 hue 로 그린다. 즉 **색 제약은 없다**' 라 적고, **결정의 진짜 근거를 새로 댄다** — '이 카드가 답하는 질문이 *한 지표를 두 기간에 걸쳐 견주면 어떤가* 이기 때문이다'(`:11-14`), '다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — **막던 것은 사라졌다**'(`:15`). `ShareBarList.tsx:7-11` 도 같다 — '**⚠ 예전 이 자리엔 구분 가능한 계열 색이 2개뿐이라는 이유가 함께 적혀 있었다. 그 전제는 지금 거짓이다** — TOKEN-13 이 chart.series-3..6 을 추가해 6계열까지 서로 다른 hue 가 나온다 … **색이 모자라서 단색을 고른 게 아니라, 이 데이터에는 단색 길이 비교가 맞아서** 고른 것이다. 색이 늘었다고 파이로 되돌릴 이유가 되지 않는다'. **즉 두 결정은 유지되고 근거만 참인 것으로 교체됐다** — 이 문서가 요구한 '주석 정정 또는 결정 재검토' 중 **전자가 이행됐고, 그 과정에서 결정이 재검토돼 다른 근거 위에 다시 섰다** | `tokens.json` 에 `series-1..6` 존재(실측). **`StatsTrendCard.tsx:8-15` · `ShareBarList.tsx:7-11` 이 그것을 인정하고 결정의 근거를 참인 것으로 바꿔 적었다** | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 집계 응답 p95 | **미정** — 백엔드 부재 | 픽스처 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts`)은 개발용 지연이며 성능 예산이 아니다.** `mock.ts:24-27` 이 `?delay=` 로 덮어쓸 수 있게 한다. 실제 예산은 BE-057-EP-01 의 집계 비용이 정해지면 백엔드 명세 이 확정한다 |
| **재조회 횟수** | **조건 조합당 1회** | `queryKey` 에 기간·비교가 들어간다(`OrderStatsPage.tsx:142`) | ⚠ **FS-040 과 정반대다.** 저쪽은 뷰·기간 조작이 요청 0건이었으나(키가 기간과 무관), **여기는 조건마다 새 키 = 새 요청**이다. 프리셋 7개를 훑으면 7회. 되돌아오면 캐시가 받는다(같은 키). 레이트리밋 계약이 없다(BE-057 §7.6 #5) |
| 세그먼트 전환 | **0회** | `queryKey` 에 `segment` 가 **없다** | 세그먼트는 클라이언트 필터(`ordersOfSegment`) — 상태를 바꿔도 요청이 나가지 않는다. **이것이 현 설계의 장점이다** |
| 축·지표·정렬·페이지 전환 | **0회** | 전부 클라이언트 | 표·차트를 다시 그릴 뿐이다 |
| DOM 규모 | **상한 = 페이지 크기(≤100행) + 상태 7줄 + 카드 5장** | `useStatsParams.ts:50` | 데이터가 늘어도 DOM 은 페이지가 자른다 |
| CPU | **O(n log n) · n = 기간의 날 수(≤365)** | `sortRows`(`table.ts:15-40`) 매 렌더 | `useMemo` 가 없으나 n 이 작아 실질 영향이 없다. **FS-040 의 77,000회 스캔과 대조된다** |
| 메모리 | 기간의 일자별 + 비교 기간 | `fetchOrderStats` 가 둘을 함께 낸다 | 7일이면 14행. **기간 상한이 없어 이론상 73,000행**(§5 #5) |
| 번들 | **이 화면 전용 의존 0** | 차트 라이브러리 미도입 — `LineAreaChart` 를 SVG 로 직접 구현(`LineAreaChart.tsx:3-5`) | ⚠ **FS-040 과 달리 이 선택의 대가가 크지 않다** — 차트가 `role="img"` + 서술형 `aria-label` 을 갖고(`StatsTrendCard.tsx:49-57`) 상호작용이 없어 키보드 계약이 요구되지 않는다. 다만 **x축 라벨 상한이 없다**(§5 #6) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 집계 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). **조회 조건 바가 남아 다른 기간으로 복구할 수 있다** — FS-040 보다 낫다. 단 status 분기 없음(§3 EXC-06) · 참조 코드 없음(§5 #4) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤(카드·표·막대 전부). **거짓 빈 상태가 없다** |
| **기간을 바꾸는 중** | **새 기간의 로딩임을 알 수 있어야** | ✖ **이전 기간의 값이 새 기간 라벨 아래 남는다**(§2 STATE-01 · §4.5) |
| 집계 0건 | 빈 상태 | ✔ 최초 로드와 구별된다(`StatsTable.tsx:187` · `ShareBarList.tsx:127`). `stats-screens.test.tsx:115-123` 이 '빈 것과 실패한 것은 다르다'를 고정 |
| 종료일 < 시작일 | 검증 오류 | ✔ 입력칸 옆 `role="alert"`, **정확히 1회**, 본문 미렌더(§3 COMP-11) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 스켈레톤(§3 EXC-05). **거짓말은 아니다** |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **보존할 입력이 없고, 조회 조건이 URL 에 있어 `returnUrl` 복원이 조건까지 되살린다** |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | 토스트 없이 중단 + state 복원 | ✔ (§2 EXC-09 — `isAbort` + `finally`) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| 서버가 상태 키를 빠뜨림 | 방어 | ✖ **KPI 가 `NaN건` 으로 렌더된다**(BE-057 §3.2 #4 · §6.1 #3) — 화면이 검증하지 않는다 |
| 서버의 `Σ statusCounts ≠ orders` | 방어 | ✖ **구성비 합계가 100% 가 아니게 된다**(BE-057 §3.2 #1) — 화면이 검증하지 않는다 |

### 4.3 픽스처의 성질 (판정에 영향)

| 항목 | 상태 |
|---|---|
| 결정성 | ✔ 날짜 문자열 seed(`mock.ts:56-81` mulberry32) — **같은 날은 언제나 같은 값**. 스크린샷·VRT·눈으로 하는 회귀가 성립한다 |
| 현실성 | ✔ 주말 60~70%(`mock.ts:87-100`) · 상태 가중치가 뒤쪽에 쏠림(`data-source.ts:16-29`) · 취소 3~6% / 반품 1~3%(`:57-58`). **평평한 픽스처면 '추이'가 있는지 화면에서 판단할 수 없다** |
| 불변식 유지 | ✔ `Σ statusCounts = orders` 를 마지막 상태가 흡수(`data-source.ts:31-53`) — **서버도 같은 보정을 해야 한다**(BE-057 §3.2 #1) |
| 재현 스위치 | ✔ `?delay=` · `?fail=` · `?empty=` — **기존 문법을 그대로 쓴다**(`mock.ts:6-11`). 통계만의 새 문법을 만들지 않았다 |

### 4.4 이 화면이 답하지 못하는 운영 질문

quality-bar 의 축이 아니지만 화면의 목적(FS-057 §1)에 비추어 기록한다 — **범위 결정 사항**이다.

| 질문 | 현재 |
|---|---|
| '배송보류 32건이 **어느 주문인가**' | 불가 — 개별 주문으로 내려가는 손잡이가 없다. 의도된 경계이나(`OrderStatsPage.tsx:7`) **주문 관리로 조건을 실어 보내는 링크조차 없다**(FS-057 §7 #10) |
| '**배송보류의 추이**가 어떤가' | 우회로만 있다 — 상태별 축을 골라도 추이 차트는 여전히 일자별 '주문/취소/반품'이다. 세그먼트를 '배송보류'로 바꿔 '주문' 계열을 봐야 하는데 **그 경로가 화면에 안내돼 있지 않다**(FS-057 §7 #12) |
| '세그먼트를 걸었는데 **표는 왜 안 바뀌나**' | **답이 없다** — 세그먼트가 KPI·추이만 좁힌다는 사실을 화면이 말하지 않는다(FS-057 §7 #2) |
| '이 숫자는 **언제 집계된 것인가**' | 불가 — 집계 신선도 계약이 없다(BE-057 §7.6 #1). 실시간인지 배치인지 화면이 모른다 |
| '**특정 주문번호**를 찾고 싶다' | 불가 — 검색 입력이 없다(§2 COMP-10 N/A). 집계 화면이라 의도된 부재일 수 있다(FS-057 §7 #11) |
| '취소율이 왜 올랐나' | 불가 — 이 화면은 **무엇이** 달라졌는지만 말하고 **왜**는 말하지 않는다. 상품별·채널별 분해가 없다 |

### 4.5 ⚠ STATE-01 ↔ FS-002 모순 — 이 화면이 정면 당사자다

**두 요구가 같은 `loading` 축에서 반대 방향을 가리킨다.**

| 문서 | 요구 | 근거 |
|---|---|---|
| **quality-bar STATE-01** (P0) | '**refetch 중에는 이전 행을 유지**, skeleton 은 최초 로드(`data===undefined`)에서만' | `quality-bar.md:20` |
| **FS-002 대시보드** | 컨트롤 종속 조회에 **스켈레톤을 요구**: '조회 중이거나 데이터가 아직 없으면 범례·차트 대신 … 스켈레톤 … 토글은 `disabled`'(FS-002-EL-034) · '**데이터가 이미 있는 재조회(탭 전환)에서는 기존 카드 2장이 스켈레톤 상태로 바뀐다**'(FS-002-EL-026) | `specs/dashboard/FS-002-dashboard.md:84,92` |

**이 화면은 STATE-01 을 문자 그대로 지킨다** — `queries.ts:45` `isFirstLoad = data===undefined && isFetching` + `:40` `keepPreviousData`. 그 결과가 **기간 토글을 눌렀는데 이전 기간의 KPI·차트가 남는 것**이다. 조회 조건 바(`StatsFilterBar.tsx:254`)와 차트 `aria-label`(`StatsTrendCard.tsx:100`)은 이미 **새 기간**을 말한다.

**F3b 판정: 명세(FS-002)가 옳다.** 월을 눌렀는데 일 차트가 남아 있으면 그 차트는 **거짓말**이다 — 컨트롤 종속 조회는 '이전 데이터 유지'가 아니라 '**이전 데이터 무효화**'가 맞다.

**따라서 이 문서가 남기는 해석**:

> **STATE-01 의 '재조회 시 이전 행 유지' 규칙은 「컨트롤 비종속 재조회」에 한한다** — `staleTime` 만료·백그라운드 갱신·타 관리자의 변경으로 **같은 조건**을 다시 읽는 경우. 사용자가 **조건을 바꿔** 일으킨 「컨트롤 종속 재조회」는 이전 데이터를 **무효화**하고 로딩 상태를 보여야 한다. 두 경우는 `queryKey` 의 변화 여부로 기계적으로 구분된다(키가 같으면 비종속, 다르면 종속).

**이 화면의 기간 토글이 그 정면 당사자다.** 그리고 같은 판정이 형제 화면(NFR-058 유입 분석 · NFR-059 검색어 분석)과 나머지 통계 3화면(054·055·056)에 **똑같이 걸린다** — `_shared/queries.ts` 한 벌을 여섯이 공유한다.

**해소 방향(택1)**:
1. 컨트롤 종속 조회에서 `isPlaceholderData`(현재 stats 전체에서 **소비 0건**)를 스켈레톤 조건에 더한다 — `loading = isFirstLoad || isPlaceholderData`.
2. 기간 조회에 한해 `placeholderData` 를 끈다(STATE-03 의 '깜빡임 방지'를 포기).

**⚠ 그러나 ①은 `packages/ui` 계약에 막힌다** — §5 #2. 그리고 **quality-bar STATE-01 의 문구 자체가 개정 대상이다**(§5 #1) — 지금 문구대로면 이 화면은 pass 이고, 고치면 문구 위반이 된다.

### 4.5.1 이 모순이 이 화면에서 특히 아픈 이유

대시보드는 '일/주/월' 토글이라 **축만** 바뀐다. 이 화면은 **기간 자체**가 바뀐다 — '오늘'과 '지난 달'은 자릿수가 다르다. 그래서 잔상이 **그럴듯하다**: '오늘 주문 1,247건'이 400ms 동안 떠 있어도 이상해 보이지 않는다(오늘 진짜 1,247건일 수도 있다). **틀렸다는 신호가 화면에 하나도 없다.** 대시보드에서 일 차트가 월 자리에 남으면 모양으로 알아채지만, 여기서는 **숫자가 조용히 거짓말한다.**

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **컨트롤 종속 재조회가 이전 기간의 값을 남긴다.** `queries.ts:40,45` — 기간을 바꾸면 `isFirstLoad=false` 라 스켈레톤도 `aria-busy` 도 없이 이전 기간의 KPI·차트가 새 기간 라벨 아래 선다. `isPlaceholderData` 소비 0건. **요구의 문자만 보면 pass 이므로 quality-bar STATE-01 의 문구도 함께 개정해야 한다**(§4.5 의 해석을 반영) | 이 화면 + **통계 6화면 공통**(`_shared/queries.ts`) + quality-bar | **UI 기획 · 프론트 구현 (해석 확정) · 명세 리뷰 (문구 개정)** |
| 2 | — | — | **선행 차단**: `packages/ui` 의 `StatsCard` 가 `loading` **하나로** `<Card busy>`(`StatsCard.tsx:35`)와 스켈레톤(`:48-52`)을 묶는다 → 앱이 '재조회 중이니 본문은 두되 busy 는 알린다'를 **표현할 수 없다**. #1 의 해소(①안)가 이 계약에 막힌다. **앱 코드로는 풀 수 없다** | `packages/ui` | **프론트 리팩터 / DS (계약 분리 — 차단 사안)** |
| ~~3~~ | ~~ERP-05~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `527fc1b`).** 이전 기준에서 DS `Pagination` 의 범위·크기 표면이 꺼진 채 섹션이 같은 것을 손으로 그렸다(`pageSize` 미전달 → `Pagination.tsx:112` `showRange` false → `role="status"` 범위 요약 부재 · `rangeTextOf` 두 벌). **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘겨 DS 가 그린다** — `Pagination.tsx:171-172` 의 `role="status"` 범위 요약 + `:177-194` 크기 선택기. **자작 사본은 지워졌다**(`table.ts:58-60` · `StatsTable.tsx:191-194` 가 그 이력과 이유를 남긴다 — '같은 것을 두 벌 그리면 수식이 갈라진다'). `rangeTextOf` 가 한 벌로 수렴했다. ⚠ **로그 4화면은 아직 사본이다**(NFR-060 §3 ERP-05) — 이 수렴은 통계 섹션에서만 일어났다 | 이 화면 + `_shared` | **종결** |
| 4 | EXC-06 / EXC-20 | P1 | 조회 실패가 status 를 구분하지 않고(`queries.ts:47`) **참조 코드(`traceId`)도 표시하지 않는다**. BE-057 §7.1 의 권한 불일치 상황에서 원인 파악 불가. 429 의 `Retry-After` 미소비. **원문 비노출(`:46`)은 옳으므로 유지한다** | 이 화면 + `_shared` | UI 기획 · 프론트 리팩터 |
| 5 | ERP-15 / 신규 | P1 | **기간 상한이 없다** — `?preset=custom&start=1900-01-01&end=2100-01-01` 이 검증(`period.ts:200-206` 은 순서만 본다)을 통과해 `eachDay` 가 **73,000 행**을 만든다. 클라이언트 가드 + 서버 400 둘 다 필요 | 이 화면 + `_shared` + 서버 | UI 기획 · 백엔드 명세 |
| 6 | A11Y-16 / 신규 | P1 | **x축 라벨 상한이 없다** — `LineAreaChart.tsx:216-231` 이 `labels` 전부를 그린다. 최근 30일이면 30개가 겹치고 1년이면 365개다. 솎아내기(nth label)가 필요하다 | `packages/ui` + 이 화면 | 프론트 리팩터 · UI 기획 |
| ~~7~~ | ~~TOKEN-13~~ | — | **✔ 해소됨(기준 `a5c2639`).** 이전 기준에서 `StatsTrendCard.tsx:8-15` 과 `ShareBarList.tsx:7-11` 가 'chart.series 가 2개뿐'이라는 낡은 전제 위에 설계 결정을 적었다 — `tokens.json:778-888` 에 series-1..6 이 전부 있는데도. **두 주석이 전부 고쳐졌다**: `StatsTrendCard.tsx:8-15`('계열 색 — **해결됨** … 색 제약은 없다') · `ShareBarList.tsx:7-11`('그 전제는 지금 거짓이다 … 색이 모자라서 단색을 고른 게 아니라 이 데이터에 맞아서 고른 것이다'). **결정은 유지되고 근거만 참인 것으로 교체됐다** — 이 문서가 요구한 '주석 정정 또는 결정 재검토' 가 **둘 다** 일어났다 | 이 화면 + `_shared` | **종결** |
| 8 | — | — | **BE-057 §7.1 (보안)** — 프론트 권한 리소스(`page:/stats/orders`)와 서버 데이터 권한(주문 도메인)이 다른 축이다. 그리고 **`export` 권한은 반출 통제가 아니다**(CSV 를 브라우저가 만든다 — 요청이 없다). 화면을 볼 수 있으면 데이터는 이미 브라우저에 있다 | 앱 전역(권한 모델) | **백엔드 명세 · UI 기획 (보안)** |
| 9 | — | — | **BE-057 §7.4 (도메인)** — 취소/반품의 '배송중' 경계가 클라이언트 주석과 KPI 힌트에만 있다. 서버가 다른 기준으로 세면 **화면의 힌트가 거짓말이 되고 아무도 알아채지 못한다** | 도메인 | **아키텍처 · 백엔드 명세** |
| 10 | — | — | **BE-057 §6.1 #3** — 서버 응답의 불변식 6개 중 **화면이 검증하는 것이 0개**다. 상태 키 누락 → KPI `NaN`, 합 불일치 → 구성비 ≠ 100%. 조용히 틀린다 | 이 화면 + 서버 | 백엔드 명세 · UI 기획 |
| 11 | EXC-03 | P1 | **권한 게이트 이중 + 자체 403 화면** — `StatsPageShell.tsx:95-104` 가 앱 공용 `RequirePermission` 과 같은 판정을 한 번 더 하고 공유 `ForbiddenScreen` 이 아닌 자체 마크업을 낸다. 최근 통합이 설정 섹션을 공유본으로 수렴시킨 것과 반대 방향이다 | `_shared` | UI 기획 · 프론트 리팩터 |
| 12 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — 무한 스켈레톤. **FS-040 과 달리 거짓 사실을 보이지는 않는다** | 앱 전역 | 프론트 구현 · 프론트 리팩터 |
| 13 | EXC-11 | P1 | 오프라인 감지 없음 | 앱 전역 | 프론트 구현 |
| 14 | ERP-03 / IA-14 | P1 | sticky thead 는 있으나 **identity 열(일자) sticky 없음** · `zIndex:1` 이 토큰이 아님(`StatsTable.tsx:42`) · 최소 지원 폭 선언 없음 · 정렬 헤더 touch-target 미검증 | 이 화면 + 앱 전역 | UI 기획 |
| 15 | ERP-12 | P1 | **진행률이 이 화면에서 도달 불가능에 가깝다** — 행 수 = 기간의 날 수(≤365)인데 `CHUNK_ROWS=200`(`useCsvExport.ts:21`). 최근 7일이면 7행이라 0%→100%. 표면과 규모의 불일치이며, 검색어 분석(NFR-059)에서만 실제로 동작한다 | `_shared` | UI 기획 (기록) |
| 16 | — | — | **FS-057 §7 #2** — 세그먼트가 KPI·추이만 좁히고 표·막대는 좁히지 않는데 화면이 그것을 말하지 않는다. 같은 화면의 두 숫자가 다른 모수를 쓴다 | 이 화면 | **UI 기획 쪽 변경 요청** |
| 17 | — | — | **STATE-06 / BE-057 §7.6 #1** — 주문 관리에서 주문을 고쳐도 이 화면은 갱신되지 않는다(쿼리 키 비공유). 집계 신선도 계약이 없어 **결함인지 의도인지 판정할 수 없다** | 서버 + 이 화면 | 백엔드 명세 · UI 기획 |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.
> **예외**: `stats-screens.test.tsx` 는 실제 라우터·쿼리 클라이언트·픽스처로 6화면을 렌더하는 **통합 테스트**이며 `:8-10` 이 그 의도를 명시한다('E2E 를 대신한다 … 워크트리마다 dev 서버 = 포트 충돌'). 그것이 고정한 사실은 §2·§3 에서 그렇게 표기했다.

### 6.1 이 화면의 실제 scope 와 op

**scope = `'stats-orders'`**(`data-source.ts:14`). **op = `'list'` 하나**(`mock.ts:52` `failIfRequested(scope, 'list')`) — 이 화면이 거는 요청이 조회 하나뿐이다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-057-EL-014 조회 실패 배너(= 본문 SEC-03~05 대체) |
| `detail` · `save` · `delete` | ✕ — 이 화면은 부르지 않는다 | 해당 없음(쓰기 0건) |

### 6.2 재현 스위치 (`mock.ts:6-11` 이 문법을 명시)

```
/stats/orders?fail=list                    조회 실패 → STATE-02 확증 (배너 + 다시 시도, 조회 조건 바는 남는다)
/stats/orders?fail=stats-orders:list       위와 동일(scope 명시)
/stats/orders?fail=stats-visitors:list     아무 일도 없다 — 스코프가 갈려 있다 (stats-screens.test.tsx:99-113)
/stats/orders?empty=all                    0행 → STATE-05 확증 ('집계된 주문 기록이 없습니다', CTA 없음)
/stats/orders?empty=stats-orders           위와 동일(scope 명시)
/stats/orders?empty=stats-orders&segment=holding&compare=none
                                           → '필터에 맞는 …' + '필터 초기화' (STATE-05 3분기 중 filter 분기)
/stats/orders?delay=5000                   스켈레톤 창을 5초로 — STATE-01 의 '최초 로드' 절 확증
/stats/orders?delay=5000&preset=last30     진입 후 '오늘' 클릭 → §2 STATE-01 gap 확증:
                                           5초간 '조회 범위 2026.07.17' 아래 지난 30일의 KPI·차트가 남는다
/stats/orders?preset=custom&start=2026-07-16&end=2026-07-01
                                           기간 검증 → COMP-11 확증 (메시지 1회, 본문 미렌더)
/stats/orders?size=100                     스켈레톤 100행 → COMP-06 확증
/stats/orders?page=99                      범위 밖 page → STATE-04 확증 (마지막 유효 페이지)
```

⚠ **`?delay=` 는 이 섹션에 실재한다**(`mock.ts:24-27`) — FS-040 과 다르다. `LATENCY_MS`(기본 400)를 덮어쓴다. **§2 STATE-01 의 gap 을 눈으로 확증하려면 이 스위치가 필수다** — 400ms 는 너무 짧다.

### 6.3 status 재현

`?status=` 는 `shared/crud/dev.ts` 의 문법이나 **이 섹션의 `loadStats` 는 `failIfRequested` 만 부른다**(`mock.ts:52`) — `?status=` 를 소비하는지는 `dev.ts` 소유다. §3 EXC-06 의 gap(status 미분기)은 **화면이 어차피 status 를 읽지 않으므로** 재현 결과가 같다: 어떤 status 든 '통계를 불러오지 못했습니다.' 한 문구다.

`409`·`412`·`422` 는 **이 화면에서 발생할 수 없다** — 쓰기가 없다(§2 EXC-04/EXC-08 N/A 와 같은 이유).

### 6.4 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| **STATE-01 (gap)** | `queries.ts:40`(`keepPreviousData`) · `:45`(`isFirstLoad`) · `OrderStatsPage.tsx:290,299,311,325,347`(loading 전달) · `:297`(`period={params.period}` — 새 기간) · `StatsTrendCard.tsx:100`(aria-label 이 새 기간) · `StatsFilterBar.tsx:254`(바가 새 기간) · **`isPlaceholderData` grep = 0** |
| STATE-01 ↔ FS-002 모순 | `quality-bar.md:20` vs `specs/dashboard/FS-002-dashboard.md:84,92`(EL-026 · EL-034) |
| STATE-02 (pass) | `StatsPageShell.tsx:130-148` · `queries.ts:47` · `stats-screens.test.tsx:86-97` |
| STATE-04 (pass) | `table.ts:50-57,63-69` · `StatsTable.tsx:196` · `useStatsParams.ts:216` |
| TOKEN-01 (pass) | `pages/stats/**` 에 hex·px·bare keyword grep = 0 (실측) |
| A11Y-12 (pass) | `StatsFilterBar.tsx:16,85-90,133-135` · `aria-current` grep = 주석 1건 |
| IA-02 (pass) | `nav-config.ts:201,260-278,297-299` · `StatsPageShell.tsx:6-8`(h1 없음) |
| IA-13 (pass) | `useStatsParams.ts:35,157,168-200,203-223` · **`:16-33`(`useListState` 를 쓰지 않는 이유 — GROUND-TRUTH §3 정정)** |
| ~~ERP-05~~ — **해소 확증** | `StatsTable.tsx:195-204`(**`total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 전달**) → `Pagination.tsx:112-113`(`showRange`·`showSizeSelect` true) → `:171-172`(`role="status"` 범위) · `:177-194`(크기 선택). 사본 제거 이력 `table.ts:58-60` · `StatsTable.tsx:191-194` |
| EXC-03 (pass) | `StatsPageShell.tsx:91-104,119` · `StatsFilterBar.tsx:223` · `resources.ts:31,46,66-68` |
| EXC-09 (pass) | `queries.ts:38` · `mock.ts:51` · `useCsvExport.ts:15,68,81,84-87` |
| ERP-09 (pass) | `useStatsParams.ts:162` · `shared/format.ts:63` · `period.ts:9-13,73,77,97,104` |
| ~~TOKEN-13 (주석 오류)~~ — **해소 확증** | `tokens.json:778-888`(series-1..6 실재) vs **`StatsTrendCard.tsx:8-15`('계열 색 — 해결됨 … 색 제약은 없다')** · **`ShareBarList.tsx:7-11`('그 전제는 지금 거짓이다')** — 두 주석이 사실을 인정한다 |
| BE-057 §7.1 (권한) | `StatsPageShell.tsx:92,95` · `resources.ts:66-68,88-95` · `nav-config.ts:201` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **9건 전부**, 그리고 §1.2 에 '이 화면은 왜 FS-040 보다 N/A 가 적은가'를 밝혔다
- [x] 모든 `pass` 에 코드 근거(파일:라인)
- [x] 모든 `gap` 에 재현 가능한 측정 기준
- [x] §2.1 산수 검산 — 10 + 10 + 9 + 1 = **30** ✔
- [x] **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] **'E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했고, `stats-screens.test.tsx` 가 통합 테스트로 고정한 사실은 그렇게 구분해 표기했다
- [x] **STATE-01 ↔ FS-002 모순을 §4.5 에 전면 기록**하고 '유지 규칙은 컨트롤 비종속 재조회에 한한다'는 해석을 남겼다. §2 STATE-01 · §5 #1 에서 상호 참조한다
- [x] **GROUND-TRUTH 를 코드로 재확인해 두 곳을 정정했다** — ① §6 ERP-05: `pageSize={params.pageSize}` 는 `StatsTable` 의 prop 이지 `Pagination` 의 것이 아니다(이 화면은 opt-in 소비자가 **아니다**) ② §3 IA-13: `useStatsParams` 는 `useListState` 를 소비하지 **않는다**(`parseFilter` 만). 둘 다 §2·§3·§5·§6.4 에 근거와 함께 적었다 **⚠ 기준 `a5c2639` 에서 ①이 낡았다** — `527fc1b` 이후 `StatsTable.tsx:195-204` 이 `Pagination` 에 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 **전부 넘긴다.** 이 화면은 이제 **ERP-05 의 opt-in 소비자다**(§3 ERP-05 — pass). ②는 그대로 유효하다.
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(STATE-06·ERP-07·A11Y-08·IA-03·EXC-10/12/14/18)은 N/A 사유와 함께 남겼다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 `?fail=` scope(`stats-orders`)와 이 화면이 거는 op(`list` 하나)을 코드에서 확인**해 적었다. **`?delay=` 가 이 섹션에 실재함**(`mock.ts:24-27`)을 FS-040 과 대조해 명시했다
- [x] **`packages/ui` 계약이 STATE-01 해소를 막는다**는 사실(§5 #2)을 앱층 gap 과 분리해 이관 대상을 프론트 리팩터/DS 로 지목했다
- [x] NFR-058 · NFR-059 와 겹치는 판정(`_shared` 공유)을 **이 화면 고유의 근거로 다시 확인**해 적었다 — `OrderStatsPage.tsx` 의 라인을 함께 인용했다
</content>
