---
id: NFR-058
title: "유입 분석 비기능 명세"
functionalSpec: FS-058
backendSpec: BE-058
qualityBar: specs/quality-bar.md
owner: A64
reviewer: A62
gate: G9
status: draft
version: 1.0
date: 2026-07-17
---

# NFR-058. 유입 분석 비기능 명세

## 1. 이 문서의 위치

| 항목 | 내용 |
|---|---|
| 대상 화면 | FS-058 유입 분석 (`/stats/traffic`) — 하위 라우트 없는 단일 leaf |
| 상위 기준 정본 | `specs/quality-bar.md` — 9차원 100요구. **이 문서는 그 요구를 재서술하지 않는다.** 요구의 내용·근거·acceptanceCheck 는 언제나 quality-bar 가 정본이며 여기서는 ID 로만 참조한다 |
| 이 문서의 역할 | quality-bar 의 **이 화면 적용본**이다. 각 요구에 대해 ① 이 화면에 그 표면이 있는가 ② 있다면 이 화면의 어느 코드가 충족을 결정하는가 ③ 무엇을 재현하면 판정이 뒤집히는가 만 기록한다 |
| 함께 읽는 문서 | FS-058(요소·예외) · BE-058(엔드포인트·서버 판정) · **NFR-057(주문 통계) · NFR-059(검색어 분석)** — 세 화면이 `stats/_shared/**` 를 공유해 판정이 겹친다. 이 문서는 겹치는 판정도 **이 화면 고유의 근거(file:line)** 로 다시 확인해 적는다 |
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

### 1.2 이 화면의 성격

**읽기 전용 집계 뷰**이며 P0 30 중 N/A 는 **9건**이다(FS-040 은 16건). NFR-057(주문 통계)과 **거의 같은 판정 분포**를 갖는다 — `_shared/**` 를 공유하고 화면 구조(조회 조건 바 → KPI → 추이 → 드릴다운)가 같기 때문이다.

**이 화면만의 축이 셋 있다**:
1. **금액 컬럼이 실재한다** — 매출액(원). 통계 3화면 중 **ERP-07(금액 단위 분리)의 당사자는 이 화면뿐이다**(주문 통계는 건수·비율만, 검색어 분석도 금액 컬럼이 없다).
2. **지속 고지(`notice`) 표면이 실재한다** — 구글 참조검색어 `<Alert tone="info">`. 통계 6화면 중 이 화면과 매출 통계(부가세 고지)만 갖는다.
3. **표의 행 수가 클라이언트 상수다**(검색엔진 4 · 랜딩페이지 7) — 그래서 페이지네이션·페이지 크기·진행률이 **죽은 표면**이다(§3 ERP-05 · ERP-12 · §4.4).

## 2. P0 30건 — 이 화면 적용 판정 (전수)

| 요구 ID | 차원 | 적용 | 이 화면에서의 충족 방식 (코드 근거) | 측정 기준 (재현 절차) | 판정 |
|---|---|---|---|---|---|
| STATE-01 | STATE | 직접 | **네 상태는 옳게 갈려 있다** — `queries.ts:45` `isFirstLoad = query.data === undefined && query.isFetching` 를 `TrafficStatsPage.tsx:304,313,325,339,361` 이 `loading` 으로 넘긴다. 스켈레톤은 최초 로드에만(`StatsTable.tsx:162`·`ShareBarList.tsx:110`·`StatsCard.tsx:48`), empty 는 **성공 · 0행에만**(`StatsTable.tsx:187` · `ShareBarList.tsx:127` `total===0`), error 는 본문을 대체(`StatsPageShell.tsx:130`). **거짓 빈 상태가 없다.**<br>**그런데 그 문자 그대로의 준수가 컨트롤 종속 재조회에서 거짓말을 만든다.** `queries.ts:40` `placeholderData: keepPreviousData` 이므로 **기간 프리셋을 바꾸면** `isFirstLoad === false` → 스켈레톤도 `aria-busy` 도 없이 **이전 기간의 KPI·차트가 서 있다.** 조회 조건 바(`StatsFilterBar.tsx:254`)와 차트 `aria-label`(`StatsTrendCard.tsx:100` ← `TrafficStatsPage.tsx:311`)은 **새 기간**을 말한다. `isPlaceholderData` 소비 코드는 stats 전체에 **0건**(grep 확인).<br>**⚠ 이 화면에서 특히 위험한 이유: KPI 에 매출액이 있다.** '오늘 매출 1,240만원'이 400ms 동안 떠 있어도 이상해 보이지 않는다 — **틀렸다는 신호가 화면에 하나도 없다.**<br>**판정 근거**: STATE-01 의 문자만 보면 **pass**. 그러나 **F3b 판정은 FS-002 가 옳다** — 따라서 STATE-01 의 유지 규칙은 **'컨트롤 비종속 재조회'에 한한다**는 해석 아래 **gap** 으로 계상한다. §4.5 · §5 #1 | `?delay=5000&preset=last30` 진입 → '오늘' 클릭 → **5초간 '조회 범위 2026.07.17' 아래 지난 30일의 유입수·매출액·차트가 남는다.** 스켈레톤 없음·`aria-busy` 없음 | **gap** |
| STATE-02 | STATE | 직접 | 조회 실패 시 `StatsPageShell.tsx:130-148` 이 인라인 `<Alert tone="danger">` '통계를 불러오지 못했습니다.'(`queries.ts:47`) + '다시 시도'(`TrafficStatsPage.tsx:273` `query.refetch`)를 렌더한다. **토스트가 아니고 빈 상태로 폴백하지 않는다.** 배너가 **본문만** 대체하고 **조회 조건 바(`:112`)는 남아** 다른 기간으로 복구할 수 있다. ⚠ **다만 구글 고지(`notice` `:123`)도 남아 '아래 유입수·매출액은 정상으로 잡히지만…' 이라 말한다 — 아래에 아무것도 없는데**(FS-058 §7 #9) — 그것은 STATE-02 의 요구 범위 밖이며 §5 #6 으로 이관한다 | `/stats/traffic?fail=list` → 인라인 danger Alert + '다시 시도'. read 실패로 토스트가 뜨지 않는다. **`stats-screens.test.tsx:86-97` 이 고정한다** | pass |
| STATE-04 | STATE | 직접 | ① **page clamp**: `table.ts:50-52` `clampPage` 를 `pageSlice`(`:55`)·`rangeTextOf`(`:65`)가 쓰고 `StatsTable.tsx:196` 가 `Math.min(page, totalPages)` 로 DS 에 넘긴다 ② **조건 변경 시 page 되돌림**: `useStatsParams.ts:216` `next.delete('page')` ③ **행 선택 없음** — 요구의 '숨겨진 행의 선택 해제'는 대상이 없다. ⚠ **이 화면에서는 이 요구가 사실상 무의미하다** — 행이 최대 7개라 `totalPages` 가 언제나 1이다(§3 ERP-05) | `?page=99` 로 진입 → 1페이지 행 + '전체 7건 중 1–7'(false-empty 없음) | pass |
| TOKEN-01 | TOKEN | 직접 | 이 화면 + `_shared/**` 의 스타일 객체가 전부 `var(--tds-*)` 를 참조한다. 이 화면은 **자체 스타일 객체가 0개다** — `TrafficStatsPage.tsx` 에 `CSSProperties` 선언이 없고 전부 공용 컴포넌트에 위임한다(검색어 분석과 대조 — 저쪽은 `keywordCellStyle` 하나를 갖는다). **grep 실측**: `pages/stats/**` 에서 `#hex` **0건** · `[0-9]+px` **0건** · `(outline\|border): (thin\|medium\|thick)` **0건** <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — TOSS 토큰(PR #32)이 이 화면의 가장 넓은 표면인 표에 닿는다.** 이 표는 DS `DataTable` 이 아니라 `shared/ui/styles.ts` 의 `tdStyle`/`thStyle` 을 쓰는데, **그 둘이 `component.table.*` 토큰의 소비자다**: `styles.ts:381-384` `tdStyle` 의 `padding{Top,Bottom}: var(--tds-component-table-cell-padding-y)` · `padding{Left,Right}: var(--tds-component-table-cell-padding-x)` · `styles.ts:363-366` `thStyle`(**x 만** — block 패딩은 `space.3` 유지). 값이 바뀌었다 — `cell-padding-y = {space.4}` = **16px**(구 `space.3` 12px) · `cell-padding-x = {space.3}` = **12px**(구 `space.2` 8px)(`tokens/tokens.json:1262-1271`). **축 순서 주의: y=16 · x=12 이지 그 반대가 아니다.** 근거가 토큰에 적혀 있다(`:1265`: 'Toss 표는 divider 를 옅게 하는 대신 **여백으로 행을 가른다**'). **그 divider 도 함께 옅어졌다** — `styles.ts:387` `borderBottomColor: var(--tds-component-table-divider)` → `component.table.divider`(`tokens.json:1272-1276`) → **`color.border.subtle`** 신설(`:629-638`, `{primitive.color.gray.200}`, light `gray.200`/dark `gray.800`. 구 `border.default` = gray.300). `border.subtle` 은 **`$description` 이 장식 divider 전용으로 못 박고**(WCAG 1.4.11 — '컨트롤 테두리에 쓰지 말 것') **직접 소비자가 `apps/`·`packages/ui/src` 어디에도 없다** — 오직 `component.table.divider` 를 경유한다. **thead 밑줄만 `border-default` 를 유지한다**(`styles.ts:370`) — 근거 `:362`: '머리/몸통을 가르는 **구조선**이라 행 divider(subtle)보다 진해야 한다'. **이 변화는 TOKEN-01 의 판정을 바꾸지 않는다**(여전히 리터럴 0건 · 전부 토큰 경유) — **오히려 이 화면이 px 를 한 줄도 고치지 않고 밀도가 바뀐 것이 TOKEN-01 이 지키려던 바로 그 성질이다.** 판정에 영향을 주는 것은 A11Y-09(대비 — divider 가 옅어졌다)이며 그것은 tokens 소유다 | `pages/stats/**` 에 위 3종 grep = 0(실측). lint 0 warning | pass |
| TOKEN-02 | TOKEN | 상속 | 이 화면의 포커스 가능 표면 — 프리셋 버튼 7개(`StatsFilterBar.tsx:133`) · 정렬 헤더 버튼 5개(`StatsTable.tsx:137`) · DS `Button`/`SelectField`/`SegmentedControl`(축 3 + 지표 4)/`DateRangeField`/`Pagination` — 전부 DS 의 `tds-ui-focusable` 계약을 상속한다. **이 화면은 자체 `:focus-visible` 규칙을 선언하지 않는다** | 판정은 DS(`packages/ui`) 소유 문서를 따른다. `pages/stats/**` 에서 `outline` grep = 0 | 종속 |
| TOKEN-03 | TOKEN | 상속 | **이 화면에 자체 `animation`/`transition` 선언이 0건**이다. easing 토큰 소비 표면은 ① 스켈레톤 펄스(`tds-ui-skeleton`) ② 내보내기 토스트 — 전부 DS 소유 | 판정은 tokens codegen · Toast 소유 문서를 따른다 | 종속 |
| TOKEN-04 | TOKEN | 상속 | elevation 표면 — `StatsCard`(KPI 4장 `StatsKpiRow.tsx:77` · 추이 `StatsTrendCard.tsx:85`) · `Card`(드릴다운 `TrafficStatsPage.tsx:317`) · **`Alert`**(구글 고지 `:296`) · 토스트. 전부 DS 소유. 이 화면은 `box-shadow` 를 선언하지 않는다 | 판정은 DS(`Card`·`Alert`·`Toast`) 소유 문서를 따른다. `box-shadow` grep = 0 | 종속 |
| TOKEN-05 | TOKEN | 상속 | **이 화면에 in-content `<h1>` 이 없다** — `StatsPageShell.tsx:6-8` 이 그 결정을 명시한다. 제목은 AppHeader 가 낸다. **>18px tier 소비 표면은 실재한다** — KPI 값(특히 **매출액**)이 `StatsCard` 의 `display.sm`(`StatsCard.tsx:12-14,55`)로 세워진다(`StatsKpiRow.tsx:81`). 카드 제목은 `<h2>`(`StatsCard.tsx:37`) | 판정은 tokens typography · `StatsCard` 소유 문서를 따른다. **이 화면의 title 소스는 하나다** | 종속 |
| COMP-10 | COMP | N/A | **이 화면에 text-search/filter 입력이 없다.** `TrafficStatsPage.tsx:266-302` 이 `StatsPageShell` 에 **`searchLabel` 을 넘기지 않으므로** `StatsFilterBar.tsx:209` 의 분기가 SearchField 를 그리지 않는다. 나머지 입력은 `SelectField` 2개(비교·채널)와 `DateRangeField`(`type="date"`) — 조합 대상이 아니다.<br>(⚠ **응답 경합 축은 이미 막혀 있다** — 기간·비교가 전부 `queryKey` 에(`:128`) 들어가 늦게 온 이전 조건의 응답이 **다른 키의 캐시**로 갈 뿐이다. `queries.ts:14-16`) | 재현할 표면 없음 | N/A |
| FEEDBACK-02 | FEEDBACK | N/A | **파괴적/비가역 액션이 없다.** 서버 쓰기 0건이고 상태 변경은 전부 URL 조회 조건이며 내보내기는 파일 생성이라 되돌릴 것이 없다 | 재현할 표면 없음 | N/A |
| FEEDBACK-04 | FEEDBACK | N/A | **편집 가능한 폼이 없다** — RHF `isDirty` 를 만들 입력이 0개다(조회 조건은 즉시 URL 에 커밋되어 '미저장 상태'가 존재하지 않는다) | 재현할 표면 없음 | N/A |
| FEEDBACK-06 | FEEDBACK | N/A | **modal 이 없다.** `Modal`/`ConfirmDialog` 를 import 하지 않는다. 카드·배너·토스트뿐이다 | 재현할 표면 없음 | N/A |
| A11Y-01 | A11Y | 상속 | **이 화면은 토스트를 띄운다** — 내보내기 성공/실패(`useCsvExport.ts:75,82`). `useToast`(`:17,40`)를 통해 앱 공용 `ToastProvider` 의 항상 마운트된 live region 을 소비한다. **자체 live region 을 만들지 않는다** | 판정은 `ToastProvider` 소유 문서를 따른다. 재현: '엑셀 내보내기' → 성공 토스트 announce | 종속 |
| A11Y-02 | A11Y | N/A | **Modal/ConfirmDialog 가 없다** — `aria-describedby` 를 연결할 다이얼로그가 존재하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-11 | A11Y | 상속 | **폼 컨트롤이 실재한다** — `SelectField`(비교 `StatsFilterBar.tsx:171` · 채널 `:193` · 페이지당 `StatsTable.tsx:195`) · `DateRangeField`(`:151`). **DS 가 field-association 을 자동 배선한다**: `DateRangeField.tsx:45` 가 `aria-invalid` 를 **항상** `aria-describedby` 와 짝지어 내보내고 유효할 때는 둘 다 부여하지 않는다. 에러 `<p>` 는 `role="alert"` + 그 id(`:94-97`). **required 필드가 0개**이므로 그 절은 대상이 없다. 손으로 만든 폼 컨트롤 0개 — `aria-invalid` grep = 0 | 판정은 DS 소유 문서를 따른다. 재현: `?preset=custom&start=2026-07-16&end=2026-07-01` → 두 date input 이 `aria-invalid="true"` + `aria-describedby`→`role="alert"` `<p>`. **`stats-screens.test.tsx:125-136` 이 메시지 1회를 고정** | 종속 |
| A11Y-12 | A11Y | 직접 | **요구의 appliesTo 표면(공유 `filterItemStyle` 을 쓰는 토글 필터)이 실재하고 옳다.** 기간 프리셋 7개가 `filterItemStyle(active)`(`StatsFilterBar.tsx:16,85-90`)를 재사용하며 **`aria-pressed={active}`**(`:135`)로만 선택을 말한다. **`aria-current` 를 쓰지 않는다** — `pages/stats/**` 에서 grep = **주석 1건뿐**(`:7`, 금지를 서술). 이 화면이 그 바를 소비하는 자리는 `TrafficStatsPage.tsx:266-271`(→ `StatsPageShell.tsx:112-121`) | `/stats/traffic` → 프리셋 7개 전부 `aria-pressed`. `aria-current` grep = 0(주석 제외) | pass |
| MOTION-01 | MOTION | N/A | **Modal 이 없다**(FEEDBACK-06 과 같은 사유) | 재현할 표면 없음 | N/A |
| MOTION-02 | MOTION | 상속 | **표면이 실재한다 — 내보내기 결과로 토스트를 띄운다**(`useCsvExport.ts:75,82`). **요구는 이제 충족돼 있다**(PR #26): `.tds-toast--exiting`(`Toast.css:32-37` — `tds-toast-out … forwards` + `pointer-events: none`) + keyframes `:121-131`(opacity 1→0 · `translateY(0)→translateY(var(--tds-space-3))`), enter `:26-27`/`:109-119`. **요구가 명시한 수치를 그대로 만족한다** — `exit-duration` = `{motion.duration.fast}`(150ms) · `exit-easing` = `{motion.easing.accelerate}`(`component.overlay` recipe `tokens/tokens.json:1298-1307` · `easing.accelerate` primitive `:486` = `cubic-bezier(0.4, 0, 1, 1)`). **단 라이브러리가 아니라 CSS-only 다** — Motion/framer-motion 은 여전히 미도입이고, 'AnimatePresence 로 exit 완료 후에만 unmount' 는 네이티브 `onAnimationEnd` × keyframe 이름 상수 대조로 동등 달성했다. reduced-motion 게이트 `Toast.css:136-141`. appliesTo 가 `ToastProvider, Toast` 이므로 **소유는 DS/shared 이고 이 화면은 소비자**다 | 내보내기 성공 토스트를 dismiss → opacity 1→0 + 아래로 밀리며 사라진다(150ms · accelerate). 판정은 `ToastProvider`·`Toast` 소유 문서를 따른다. **이 화면 코드로 결정되지 않는다** | 종속 |
| MOTION-03 | MOTION | 상속 | **자체 `transition`·`animation`·`transform` 선언이 0건**이다. 소비하는 모션은 ① 스켈레톤 펄스 ② 토스트 — 전부 DS 소유. 프리셋·정렬·축·지표 전환은 즉시 반영된다 | 판정은 글로벌 Motion config · `ui.css` · `ToggleSwitch.css` 소유 문서를 따른다. `transition`/`animation` grep = 0 | 종속 |
| IA-01 | IA | 직접 | 라우트가 `APP_ROUTES` 항목이고(`App.tsx:324`) 그 배열이 통째로 `<RequireAuth><AppShell/></RequireAuth>` 아래에서 렌더된다. **자체 sidebar/top bar/outer frame 을 만들지 않는다** — 최상위가 `StatsPageShell.tsx:109` 의 `<div style={pageStyle}>` | `/stats/traffic` 진입 → 사이드바·AppHeader·단일 padded `<main>` 유지 | pass |
| IA-02 | IA | 직접 | **충족.** `/stats/traffic` 은 `nav-config.ts:202` 의 **잎**(`['유입 분석', '/stats/traffic']`)이므로 `findCoveringLeaf`(`:260-278`) → `findNavLabel`(`:297-299`)이 AppHeader `<h1>` 에 **'유입 분석'** 을 그린다 — 가지 라벨('통계')로 폴백하지 않는다. **in-content `<h1>` 이 없다**(`StatsPageShell.tsx:6-8`) — 제목 소스가 하나뿐이라 **h1 이중 문제가 없다.** GROUND-TRUTH §7 의 '폼/상세 화면 h1 2개'는 여기에 성립하지 않는다: **하위 라우트가 없는 잎**이라 '등록/수정' 행위 반영 문제도 발생하지 않는다. 내부 구획은 `<h2>` | `/stats/traffic` → AppHeader 제목이 '유입 분석'. `document.querySelectorAll('h1').length === 1` | pass |
| IA-04 | IA | 직접 | **충족.** ① **toolbar row** — 조회 조건 바(`StatsFilterBar.tsx:122`), 필터 좌측 · **내보내기 우측**(`:76` `spacerStyle` → `:221-250`) ② **결과 count 요약** — `'전체 7건 중 1–7'`(`StatsTable.tsx:191-201`) + 내보내기의 `(N건)`(`:246`) ③ **SelectionBar** — 대상 없음(bulk 없음) ④ **table**(`:131`) ⑤ **Pagination**(`:228`, 한 페이지 초과 시). '등록/추가'의 부재는 옳다 — 집계는 만들 수 있는 것이 아니다. ⚠ count 요약이 표 **아래**이나 acceptanceCheck('count 요약을 보임')는 충족 | `/stats/traffic?view=landing` → 내보내기가 우상단, '전체 7건 중 1–7' 이 보인다. ⚠ 행이 7개라 Pagination 은 렌더되지 않는다(`totalPages=1`) — 요구의 '한 page 초과 가능 시'에 해당하지 않아 옳다 | pass |
| IA-05 | IA | N/A | **create/edit 폼이 없다** — `/stats/traffic` 은 하위 라우트가 없는 leaf 다(`App.tsx` 에 `/stats/traffic/*` 가 0건). 만들거나 고칠 엔티티가 없다. `App.tsx:319` 주석이 섹션 설계를 명시: '라우트가 아니라 URL 파라미터가 화면 상태의 원천이다' | 재현할 표면 없음 | N/A |
| IA-13 | IA | 직접 | **충족 — 이 화면의 강점이다.** `useStatsParams.ts:35,157` 이 `useSearchParams` 로 **조회 조건 전체를 URL 에 싣는다**: `preset` · `start`/`end` · `compare` · `segment` · `view` · `metric` · `sort`/`dir` · `page` · `size`. 화면 로컬 `useState` 는 **'오늘'의 고정값 하나뿐**(`:162`). 기본값이면 파라미터를 지워 정규화(`:203-204,214`). 조건이 바뀌면 page 되돌림(`:216`).<br>**⚠ GROUND-TRUTH §3 정정**: '통계가 `useListState` 를 경유해 소비한다'는 기술은 **코드와 다르다.** `useStatsParams` 는 `useListState` 를 import 하지 않는다 — `shared/crud` 에서 가져오는 것은 **`parseFilter` 하나뿐**(`:37`)이다. `:16-33` 이 **왜 공유본을 쓰지 않는지**를 네 이유로 명시한다. IA-13 은 **공유 훅 경유가 아니라 이 섹션 자체 구현으로** 충족된다 <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 pass 는 이전 기준에서 `page` 축이 조용히 깨진 채였다.** `StatsFilterBar.tsx:118` 이 `useDebouncedSearch` 를 **검색 입력 유무와 무관하게** 걸고 그 훅이 **마운트 직후에도 한 번 커밋**하므로, 그 커밋이 `setKeyword` 를 통과하면 `update` 가 `page` 를 지워(`:216`) **`?page=3` 링크로 들어온 운영자가 250ms 뒤 1페이지로 튕겼다 — 통계 6화면 전부.** 형제 문서 3벌(NFR-054·055·056)이 그것을 `gap` 으로 잡았고, 이 문서는 그 축을 놓쳤다. **커밋 `6acb235` 가 고쳤다** — `useStatsParams.ts:288` `if (next === params.keyword) return;`(근거 주석 `:275-285`). 회귀 테스트 `useStatsParams.test.tsx:222-290` — `StatsFilterBar` 배선 재현 하네스(`:231`) + page 보존 2건 + '가드가 과하지 않다' 1건(`:287`). **로그 섹션의 같은 결함도 함께 고쳐졌다**(`list-state.ts:224` — NFR-060 §2 IA-13). **세 벌(`useListState`·통계·로그)이 한 규칙으로 정렬됐다.** | `/stats/traffic` → '지난 달' → 비교 '전년 동기' → 'SNS' → 축 '랜딩페이지별' → 정렬 '매출액' → URL 이 `?preset=lastMonth&compare=lastYear&segment=sns&view=landing&sort=revenue&dir=desc`. **F5 → 같은 화면**. 새 탭에 붙여넣기 → 같은 화면. ⚠ `replace:true`(`:219`)라 조건 변경이 history 를 쌓지 않는다 — 의도이며(`:8-10`) 이 화면엔 상세 라우트가 없어 'detail 후 Back' 시나리오가 성립하지 않는다 | pass |
| EXC-01 | EXC | 상속 | 렌더 예외는 `AppShell` 의 `<Outlet>` 바깥 ErrorBoundary 가, 셸 예외는 `App.tsx` 루트 경계가 잡는다. 자체 경계를 두지 않는다 | 판정은 `ErrorBoundary`·`AppShell`·`App` 소유 문서를 따른다 | 종속 |
| EXC-02 | EXC | 상속 | 세션 가드는 `<RequireAuth>`, mid-session 401 은 `queryClient` 의 `QueryCache.onError` 가 앱 전체 한 곳에서 처리한다. 이 화면의 유일한 요청(`useStatsQuery`)이 그 캐시를 통과한다. **보존할 입력이 없어 재인증 손실이 0이다.** 재로그인 후 `returnUrl` 로 돌아오면 **조회 조건까지 URL 에 있어 그대로 복원된다** | 판정은 `RequireAuth`·`queryClient`·`session-expiry` 소유 문서를 따른다 | 종속 |
| EXC-03 | EXC | 직접 | **read 게이팅과 쓰기(export) 게이팅이 둘 다 있다.** ① **read**: `StatsPageShell.tsx:91-104` 가 `can(navPageResourceId('/stats/traffic'), 'read')` 를 확인해 **화면을 그리기 전에** 403 을 낸다 ② **export**: `:119` `canExport={can(resourceId,'export')}` → `StatsFilterBar.tsx:223` 이 false 면 **버튼을 그리지 않는다**(비활성이 아니라 부재 — `StatsPageShell.tsx:11-12`). `export` 는 실재 액션(`resources.ts:31,46`). GROUND-TRUTH §3 의 `useRouteWritePermissions` 소비 7곳에 stats 가 없는 것은 맞다 — **이 화면은 `usePermissions().can` 을 직접 쓴다.** 결과는 같다.<br>⚠ **세 가지 흠**: (a) 앱 공용 `RequirePermission` 과 **이중 게이트**이고 셸이 **공유 `ForbiddenScreen` 이 아닌 자체 문구**를 낸다(FS-058 §7 #10) (b) **`export` 권한이 반출 통제가 아니다** — CSV 를 브라우저가 만들어 요청이 없다. **이 화면의 CSV 는 매출액을 담으므로 주문 통계보다 무겁다**(BE-058 §7.1) (c) **한 응답에 애널리틱스 + 매출 두 도메인이 있어** '유입은 봐도 매출은 안 되는' 역할을 표현할 수 없다(BE-058 §7.1) | read 를 끈 역할로 deep-link → 403. `export` 를 끈 역할 → 버튼이 **DOM 에 없다**. ⚠ 프론트 리소스(`page:/stats/traffic`)와 서버 권한 축이 다르다 — §5 #8 | pass |
| EXC-04 | EXC | N/A | **write 를 하지 않는다** — 요구의 appliesTo('mutable record 의 write', `createCrudAdapter.update/remove`, '모든 record 폼')에 해당하는 표면이 0개다. (GROUND-TRUTH §4 의 `createStoreAdapter` 도 무관하다 — stats 는 `shared/crud` 어댑터 계열을 쓰지 않고 자기 `data-source.ts` 를 갖는다) | 재현할 표면 없음 | N/A |
| EXC-08 | EXC | N/A | **서버로 나가는 user-initiated write 가 0건**이다 — 중복 제출을 막을 submit/confirm 이 없다. 프리셋·정렬·축·지표 연타는 URL 갱신일 뿐이고 같은 조건은 같은 `queryKey` 라 캐시가 받는다.<br>(⚠ **관련 사실**: 내보내기에 **동기 중복 실행 락**이 있다 — `useCsvExport.ts:51-52`. 요구의 `submitLockRef` 와 같은 결이나 **서버 요청이 아니라 파일 생성**이라 appliesTo 밖이다) | 재현할 표면 없음 | N/A |
| EXC-09 | EXC | 직접 | **두 경로 모두 실재하고 옳다.** ① **조회 abort**: `queries.ts:38` `queryFn: ({signal}) => fetcher(signal)` → `fetchTrafficStats(query, signal)`(`data-source.ts:150`) → `loadStats(…, signal, …)` → `wait(readDelayMs(), signal)`(`mock.ts:51`). 화면 이탈 시 abort 되고 **취소된 쿼리는 `error` 를 세팅하지 않으므로** 배너가 뜨지 않는다 ② **내보내기 abort**: `useCsvExport.ts:81` `if (isAbort(cause)) return;` — **공유 predicate `isAbort`(`shared/async`)를 그대로 쓴다**(`:15`). 취소 시 **에러 토스트가 없고** `finally`(`:84-87`)가 state 를 복원한다. `wait(0, controller.signal)`(`:68`)이 청크 사이에서 중단을 받는다 | 조회 중 다른 메뉴로 이동 → 배너·토스트 없음. 내보내기 중 '취소' → 토스트 없이 멈추고 버튼 복원. ⚠ **이 화면은 행이 최대 7개라 취소를 누를 틈이 없다**(§3 ERP-12) — 코드 대조로만 확인 가능 | pass |

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
> **P0 gap 1건 — quality-bar §How to use 기준 '배치 실패' 사유다.** 그 1건은 **화면의 실수가 아니라 요구 간 모순**이다(§4.5) — STATE-01 의 문자만 보면 pass 이고, F3b 가 확정한 해석을 적용해야 gap 이 된다. **해소는 `packages/ui` 계약에 막혀 있다**(§5 #2).
> **판정 분포가 NFR-057 과 동일하다** — `_shared/**` 를 공유하고 화면 구조가 같기 때문이다. 다만 근거는 이 화면의 라인으로 다시 확인했다.
> **N/A 9건은 이 화면이 읽기 전용 집계 뷰이기 때문이며 결함이 아니다.** 다만 **이 화면에 없는 것이 문제인 축**(채널별 매출·전환율 · 매출 어트리뷰션 · 캠페인 축)은 §4.4 에 남겼다.

## 3. 이 화면에 걸리는 P1 · P2 (선별)

표면이 실재하는 것만 적는다.

| 요구 ID | P | 이 화면에서의 상태 | 측정 기준 | 판정 |
|---|---|---|---|---|
| STATE-03 | P1 | **충족 — 그러나 그 충족이 §2 STATE-01 gap 의 원인이다.** `queries.ts:40` `keepPreviousData` 가 조건 변경 중 이전 결과를 유지해 표가 빈칸으로 깜빡이지 않는다. **두 요구가 같은 코드 한 줄을 반대로 평가한다** — §4.5 | 기간을 바꾸는 동안 표·차트가 blank 되지 않는다 | pass |
| STATE-05 | P1 | **충족.** `StatsEmpty`(`StatsEmpty.tsx:34-42`)가 DS `Empty` 를 감싼다. 이 화면은 **검색 입력이 없어 2분기만 성립**: `hasQuery` 를 넘기지 않고 `hasActiveFilters` + `onResetFilters` 를 넘긴다(`TrafficStatsPage.tsx:342-346,363-367`) → 조건이 기본값에서 벗어났으면 '필터에 맞는 유입 기록이 없습니다' + **'필터 초기화'**, 아니면 '**집계**된 유입 기록이 없습니다'. `createVerb='집계'`(`StatsEmpty.tsx:37`) — '등록된 유입 기록이 없습니다'는 틀린 문장이다. 채널별 막대는 **합계 0** 일 때 Empty(`ShareBarList.tsx:125-127` — '합이 0이면 모든 막대가 0%라 데이터 없음과 전부 0을 구분할 수 없다') | `?empty=stats-traffic` → '집계된 유입 기록이 없습니다'(CTA 없음). `?empty=stats-traffic&segment=sns` → '필터에 맞는 …' + '필터 초기화'. `role="status"`(`Empty.tsx:104`) | pass |
| STATE-06 | P1 | **N/A(표면 부재).** write 가 0건이라 invalidate 할 대상이 없다. 다른 화면의 write 가 이 화면을 stale 하게 만들 수 있으나 **쿼리 키를 공유하지 않는다**. 결함인지는 **집계 신선도 계약**(BE-058 §7.7 #1)이 정해질 때 판정 가능하다 — **애널리틱스는 대개 배치라 오히려 정상일 수 있다** | 재현할 표면 없음 | N/A |
| COMP-06 | P1 | **부분 충족 — 이 화면에서 취지가 깨진다.** 규칙은 지킨다: 스켈레톤 행 수 = **페이지 크기**(`StatsTable.tsx:164`), 칸 수 = **실제 컬럼 수**(`:178`), 하드코딩 `length:5` 없음. 막대도 `skeletonCount={TRAFFIC_CHANNELS.length}`(`TrafficStatsPage.tsx:340` — 5). **그러나 표의 실제 행 수가 4~7 인데 스켈레톤은 기본 25행**이다 — 로딩→완료에서 **레이아웃이 25행에서 7행으로 급격히 줄어든다.** 요구의 근거('loading shape 가 불균일')가 정확히 이 상황을 지목한다. 규칙 위반은 아니나(페이지 크기를 따랐다) **결과가 요구의 취지를 배반한다** — 행 수가 클라이언트 상수라 페이지 크기와 무관하기 때문이다(FS-058 §7 #6) | `?view=landing&delay=3000` → 스켈레톤 25행 → 완료 시 7행. 레이아웃이 크게 튄다 | 부분 pass |
| COMP-11 | P1 | **대체로 충족.** ① **preset 7종**(`period.ts:134-166`) ② **`start ≤ end` 강제** — `periodErrorOf`(`:200-206`) + `StatsPageShell.tsx:130` 이 **본문을 그리지 않는다**(조용한 empty 가 아니다) ③ **인라인 검증 메시지** — 배너가 아니라 **틀린 입력 옆에** `role="alert"`(`DateRangeField.tsx:94-97`). `StatsPageShell.tsx:125-129` 가 배너 중복을 뺀 이유를 명시 ④ **URL 반영**(§2 IA-13) ⑤ **ko-KR 포맷** — `formatPeriodLabel`(`period.ts:216-220`). **미충족**: 공유 `DateRangeFilter` 가 아니라 이 섹션의 조합(다만 DS `DateRangeField` 는 쓴다) · **기간 상한 없음**(BE-058 §7.7 #2) | `?preset=custom&start=2026-07-16&end=2026-07-01` → 검증 메시지 **1회**, 본문 미렌더. **`stats-screens.test.tsx:125-136` 이 고정** | pass |
| ERP-04 | P1 | **충족.** `StatsTable.tsx:127-155`: clickable header · **`aria-sort`**(`:144`, `th` 가 갖는다) · 방향 인디케이터 ▲▼↕(`:157-159`, `aria-hidden`) · keyboard(`<button className="tds-ui-focusable">`) · sr-only 설명(`:160-162`). numeric 컬럼(유입수·구매건수·**매출액**·전환율)은 우측 정렬 + `numericCellStyle`(tabular-nums, `:126`). 재클릭 시 방향 반전(`useStatsParams.ts:308-315`). **안정 정렬** + tie 를 index 로(`table.ts:28-32`), 문자열은 `localeCompare('ko-KR')`(`:36`) — **랜딩페이지 라벨이 한글이라 이것이 실제로 쓰인다**('메인 페이지 (/)' vs '베스트 상품 (/product/best)'). 기본 정렬 = **유입수 내림차순**(`TrafficStatsPage.tsx:117`) | `?view=engine` → '매출액 (원)' 헤더 클릭 → `aria-sort="descending"` + ▼ + URL `?sort=revenue&dir=desc`. **유입수 1위와 매출 1위가 다르면 여기서 보인다** — 이 화면의 목적 그 자체 | pass |
| **ERP-05** | P1 | **충족 — 이전 기준의 gap 이 해소됐다.** **★ 기준 갱신(`4b805ad` → `a5c2639`)으로 뒤집혔다 — 커밋 `527fc1b` `refactor(admin): ERP-05 범위 요약을 DS 로 수렴하고 자작 2벌을 지운다`.** 이전 기준에서 이 화면은 범위 요약과 크기 선택을 **자기가 그렸고**, `Pagination` 에 `page`·`totalPages`·`label`·`onChange` 만 넘겨 **DS 의 opt-in 스위치를 끈 채**(`Pagination.tsx:112` `showRange = pageSize > 0` → false) 사본을 세웠다. **지금은 DS 가 그린다** — `StatsTable.tsx:195-204` 이 `page`·`totalPages`·**`total={rows.length}`**·**`pageSize`**·**`pageSizeOptions={PAGE_SIZE_OPTIONS}`**·`label`·`onChange`·**`onPageSizeChange`** 를 전부 넘긴다. 따라서 `showRange`(`Pagination.tsx:112`)와 `showSizeSelect`(`:113`)가 **둘 다 true** 가 되고 `:171-172` 의 **`<p className="tds-pagination-bar__summary" role="status">{rangeTextOf(total, page, pageSize)}</p>`** 와 `:177-194` 의 크기 선택기가 렌더된다. **요구의 세 절이 전부 DS 표면에서 충족된다**: ① total-range ② page-size selector ③ range math 의 경계 단언(`rangeTextOf` `Pagination.tsx:41-47` — 마지막 페이지 잘림 `:46` · 범위 밖 page clamp `:43-45`, 근거 주석 `:36-39`).<br>**그리고 사본이 지워졌다** — `table.ts:58-60` 이 그 이력을 남긴다: '[ERP-05] 범위 요약문(전체 1,234건 중 26–50)은 여기 있었다. DS Pagination 이 pageSize 를 받으면 **같은 것을 그리고(수식이 동치다) 경계 단언까지 갖고 있으므로**, 사본을 지우고 그쪽을 쓴다'. `StatsTable.tsx:191-194` 도 같다 — '**같은 것을 두 벌 그리면 수식이 갈라진다**(실제로 로그 쪽 사본은 clamp 가 없어 범위 밖 page 에서 *전체 3건 중 81–80* 같은 헛것을 그렸다). **page 의 clamp 도 DS 가 한다** — 여기서 `Math.min` 을 다시 걸 필요가 없다'. **이전 기준이 지적한 `rangeTextOf` 두 벌이 한 벌로 수렴했다.**<br>⚠ **형제 섹션은 아직이다** — 로그 4화면은 여전히 자기 `SummaryText` 를 그리고 `Pagination` 에 `pageSize` 를 넘기지 않는다(NFR-060 §3 ERP-05). **즉 이 수렴은 통계 섹션에서만 일어났다.** | `/stats/traffic` → 표 아래에 **`.tds-pagination-bar`** 가 렌더된다: 범위 요약 `<p role="status">전체 N건 중 x–y</p>` + '페이지당' 크기 선택 + 번호 줄. **페이지를 넘기면 `role="status"` 가 새 범위를 announce 한다.** `StatsTable.tsx` 에 `rangeTextOf` grep = 0 · `SelectField` grep = 0(사본이 없다). 판정의 나머지는 DS `Pagination` 소유 문서를 따른다 | pass |
| ERP-03 | P1 | **부분 충족.** **sticky thead 는 있다** — `StatsTable.tsx:35-40` `stickyHeadStyle`(`position:'sticky'` · `insetBlockStart:0` · `zIndex:1`)를 `:121-123` 이 먹인다. **미충족**: SelectionBar 없음(bulk 없음) · on-scroll elevation 토큰 미사용 · **`zIndex` 가 리터럴 1**(토큰이 아니다 — `:42`). ⚠ **이 화면에서는 sticky 가 거의 무의미하다** — 행이 4~7개라 세로 스크롤이 일어나지 않는다 | 7행이라 스크롤 없음. 코드 대조로만 확인 | 부분 pass |
| **ERP-07** | P1 | **충족 — 통계 3화면 중 이 화면이 유일한 당사자다.** 우측 정렬 금액 컬럼에서 **'원'이 숫자와 분리돼 있다**: 헤더가 `'매출액 (원)'`(`TrafficStatsPage.tsx:87`)이고 값은 `formatWonValue(row.revenue)`(`:89`) → `format.ts:36-38` `formatNumber(Math.round(amount))` — **숫자만**. `format.ts:12-14` 가 그 이유를 명시한다: '우측 정렬 금액 칸에 「원」을 붙이면 단위가 마지막 자릿수를 따라다녀 tabular-nums 세로 정렬이 깨진다'. 셀은 `numericCellStyle`(tabular-nums)라 **자릿수가 세로로 정렬된다.** `withUnitSuffix`(`:30-33`)가 헤더 조립의 공유 헬퍼다(이 화면은 헤더를 직접 적었다 — `:87`).<br>**대조**: KPI 카드는 헤더가 없는 자리라 `formatMetric`(`:55-68`)이 `'1,240,000원'` **완성형**을 낸다(`StatsKpiRow.tsx:81`) — 정렬할 열이 없으므로 옳다. **같은 값이 자리에 따라 다른 형태를 갖는 것이 이 규약의 핵심이다** | `?view=engine&sort=revenue` → 매출액 열의 자릿수가 세로로 맞는다. 헤더가 '매출액 (원)'. 셀에 '원' 문자 없음. KPI 카드에는 '1,240,000원' | pass |
| ERP-08 | P1 | **충족.** 표의 모든 숫자가 공유·섹션 포매터를 경유한다 — `formatNumber`(`shared/format`, `TrafficStatsPage.tsx:13,71,79`) · `formatWonValue`(`:89`) · `formatPercentValue`(`:97`) · `formatMetric`(KPI, `StatsKpiRow.tsx:81`) · `formatNumber`(범위 요약 — **기준 `a5c2639` 부터 DS 가 그린다**: `Pagination.tsx:41-47` `rangeTextOf`. 섹션 사본은 지워졌다 — `table.ts:58-60` 이 그 이력을 남긴다). **raw `String()`/`toString()` 이 셀에 없다**(FS-040 의 `String(cell.booked)` 결함이 없다). 상대시간 없음(집계 화면이라 적절). `format.ts:6-10` 이 shared/format 과의 경계를 명시 — 천단위·부호는 공유본을 그대로 쓰고 여기엔 공유본에 없는 것(금액·비율·체류시간·증감)만 있다. ⚠ `format.ts:8-10` 이 **`formatWon` 이 `shared/format` 에 없고 유일한 구현이 `pages/sales/_shared/business.ts` 라 가져올 수 없다**(페이지 간 import 금지)고 기록한다 — **금액 포매터가 두 곳에 있다** | 표 셀에 raw numeric toString 없음. 매출액이 '1,240,000' 으로 자릿수 구분 | pass |
| ERP-09 | P2 | **충족 — F3b 수렴의 수혜자다.** '오늘'은 **서울 기준**(`useStatsParams.ts:162` `formatDate(new Date())` → `shared/format.ts:63` `Asia/Seoul` Intl). 달력 산술 앵커는 **UTC 정오** 한 벌(`period.ts:73,77,97,104`), `:9-13` 이 수렴을 기록(이 파일의 사본은 **UTC 자정**이었고 정본이 **정오** — 둘 다 UTC 앵커라 출력이 바뀌지 않았다). `shiftDays`/`dayCount`/`isCalendarDate` 는 `shared/format` 정본을 import(`period.ts:16`). **브라우저 TZ 를 타지 않는다** — FS-040 의 `_shared/calendar.ts` gap 이 성립하지 않는다.<br>**⚠ 이 화면 고유의 위험**: **유입은 밤에도 들어온다.** KST 00:00~09:00 의 유입은 UTC 로 전날이다 — **서버가 `start`/`end` 를 UTC 로 해석하면 매일 9시간치 유입이 전날로 밀린다**(BE-058 §7.8). 주문(결제가 낮에 몰림)보다 경계 오차가 크다. 프론트는 옳고 **서버 계약이 미정이다**.<br>**잔여**: `today` 가 마운트 시 고정이라 자정을 넘기면 '최근 7일'이 하루 밀린다. `:159-161` 이 그 선택의 근거를 밝힌다(매 렌더 `new Date()` → **무한 재조회**) | 브라우저 TZ 를 `America/Los_Angeles` 로 두고 진입 → **서울 기준 '오늘'로 기간이 잡힌다**. `shared/format.test.ts:90,117` 이 '앵커가 UTC 정오라 러너 타임존을 타지 않는다'를 고정 | pass |
| **ERP-12** | P1 | **부분 충족 — 규칙은 지키나 이 화면에서 두 축이 죽는다.** ① **현재 필터 조건 전체** — `useCsvExport.ts:35-36` 이 '페이지 자르기 **전** 배열'을 받고 `TrafficStatsPage.tsx:285-289` 가 `rows: tableRows`(슬라이스가 아니다)를 넘긴다 ② **한국어 헤더** — `columnsOf(header)`(`:57-101`) ③ **값은 표시대로** — `StatsColumn.csv` 가 `render` 와 **같은 원천**(`:88-90` 이 둘 다 `formatWonValue(row.revenue)`). `types.ts:39-53` 이 설계를 명시 ④ **UTF-8 BOM** — `downloadCsv` 가 붙인다(`useCsvExport.ts:7,16,73`) ⑤ **scope label** — `'엑셀 내보내기 (N건)'` + `'내보내기는 현재 조건 전체를 담습니다.'`(`StatsFilterBar.tsx:246,254`) ⑥ **축마다 파일명이 다르다** — `stats-traffic-channel` / `stats-traffic-${params.view}`(`TrafficStatsPage.tsx:279,286`).<br>**미충족**: (a) **진행률·취소가 도달 불가능하다** — `CHUNK_ROWS=200`(`useCsvExport.ts:21`)인데 **이 화면의 최대 행 수가 7**이다. 루프가 한 번도 양보하지 않아 **0%→100%** 로 건너뛴다. 요구의 '대량 export 의 비동기 progress+cancel 경로'가 **죽은 코드**다(FS-058 §7 #4) (b) 공유 export 유틸이 아니라 섹션 소유 (c) **`export` 권한이 반출 통제가 아니고, 이 CSV 는 매출액을 담는다** — 서버 감사 로그가 없다(BE-058 §7.1 · §7.9 #5) | `?view=landing` → '엑셀 내보내기 (7건)' → 7행 CSV(헤더 '랜딩페이지','유입수','구매건수','매출액 (원)','구매전환율 (%)'), 엑셀에서 한글 정상. **진행률이 보이지 않는다**(7 < 200) | 부분 pass |
| ERP-13 | P1 | **충족(상속).** 조사 주입 표면은 빈 상태 하나 — `StatsEmpty` → `Empty.tsx:16-27` `hasBatchim`/`subjectParticle` 이 받침으로 '이/가'를 고른다. `label='유입 기록'`(`TrafficStatsPage.tsx:364`) → '록' 받침 있음 → '집계된 유입 기록**이** 없습니다'. `label='유입'`(`:343`) → '입' 받침 있음 → '집계된 유입**이** 없습니다'. **리터럴 '이(가)' 를 출하하지 않는다** — `pages/stats/**` 에서 `이(가)`/`을(를)`/`은(는)` grep = 0. (GROUND-TRUTH §2 의 `shared/format.ts:269+` 헬퍼는 `shared/crud` 계열이 쓰고 DS `Empty` 는 레이어 경계 때문에 **자족 헬퍼**를 갖는다 — `Empty.tsx:7-8`. 두 구현이 있으나 경계가 다르다) | `?empty=stats-traffic` → '집계된 유입 기록이 없습니다'. 리터럴 조사 grep = 0 | pass |
| ERP-15 | P1 | **충족 — 이 화면은 규모가 구조적으로 작다.** `daily` 행 수 = 기간의 날 수(≤365), **표 행 수 = 클라이언트 상수**(검색엔진 4 · 랜딩 7). 페이지 크기 상한 100이라 DOM 은 최대 100행이나 실제는 7행. 구성비 막대는 **5항목 고정**. 넓은 표는 `overflowX:'auto'` 안에서 가로 스크롤(`StatsTable.tsx:28-32,118`). 정렬·페이지가 순수 함수라 n ≤ 7. **FS-040 의 'O(셀 × N) 매 렌더 전량 스캔' 위험이 없다.**<br>**⚠ 두 가지 단서**: (a) **기간에 상한이 없다** — `?start=1900-01-01&end=2100-01-01` 이면 `eachDay` 가 **73,000 행**을 만들고 `channelsOf`(`data-source.ts:88-108`)가 그 각각에 채널 5종 × `metricsOf` 를 돈다 (b) **실제 서버의 랜딩페이지는 수백~수천일 수 있다** — 지금 7개는 픽스처 상수다(BE-058 §7.7 #5). 그때 이 판정이 뒤집힌다 | 최근 30일 → `daily` 30행 · 표 7행. **`?preset=custom&start=1900-01-01&end=2100-01-01` → 73,000 × 채널 5 계산 시도**(§5 #5) | 부분 pass |
| A11Y-08 | P1 | **N/A(표면 부재).** row-nav 가 없다 — 표의 행이 클릭 가능하지 않고 detail 로 가는 경로가 없다(`StatsTable.tsx:173-180` 에 `onClick`/`rowNavProps` 0건). 요구의 appliesTo(`useRowNavigation`, row-nav 리스트)에 해당하지 않는다 | 재현할 표면 없음 | N/A |
| A11Y-09 | P1 | 이 화면의 위험 토큰 쌍 — `surface-raised` 위 `text-muted`(`thStyle` · `ShareBarList.tsx:69` 트랙) · `surface-default` 위 `text-muted`(설명 `StatsPageShell.tsx:32` · 힌트 `StatsKpiRow.tsx:44` · 범위 요약 · 라벨 `StatsFilterBar.tsx:69` · 구성비 `ShareBarList.tsx:76`) · `feedback-success-text`/`feedback-danger-text`(증감 `DeltaText.tsx:19-23`) · **`feedback-info-*`(구글 고지 `Alert tone="info"`)** · `chart-label`/`chart-axis`(`LineAreaChart.tsx:166,173,225`) <br>**★ 기준 갱신(`4b805ad` → `a5c2639`) — 이 축에 새 쌍이 하나 늘었다.** TOSS 토큰(PR #32)이 **행 divider 를 `border.default`(gray.300) → `border.subtle`(gray.200) 로 낮췄다** — `component.table.divider`(`tokens/tokens.json:1272-1276`) → `color.border.subtle`(`:629-638`, light `gray.200`/dark `gray.800`). **이 화면의 표가 그것을 소비한다**(`shared/ui/styles.ts:387` `tdStyle.borderBottomColor`). **측정이 필요한 새 쌍**: `surface-default` 위 `border.subtle`(행 divider · light/dark 양쪽). ⚠ **다만 이것은 WCAG 1.4.11(비텍스트 대비 3:1)의 대상이 아닐 수 있다** — `border.subtle` 의 `$description` 이 **장식 divider 전용**으로 용도를 못 박고 '컨트롤 테두리에 쓰지 말 것' 을 명시한다. 장식적 구분선은 1.4.11 의 예외이고, **행을 가르는 일은 이제 divider 가 아니라 여백이 한다**(`cell-padding-y` 12→16px — `tokens.json:1265` 가 그 교환을 명시: 'Toss 표는 divider 를 옅게 하는 대신 여백으로 행을 가른다'). **thead 밑줄은 `border-default` 를 유지한다**(`styles.ts:370` — 구조선이라 진해야 한다, 근거 `:362`). **판정은 tokens color 소유 문서를 따른다** — 이 문서는 **이 화면이 그 쌍을 실제로 쓴다**는 사실과 **그 용도가 장식으로 한정돼 있다**는 사실만 기록한다 | 판정은 tokens color 소유 문서를 따른다. **이 화면이 그 쌍들을 실제로 쓴다**는 사실만 기록한다. **`Alert tone="info"` 를 쓰는 통계 화면은 이 화면과 매출 통계뿐이다** | 종속 |
| A11Y-16 | P1 | **대체로 충족 — FS-040 과 정반대다.** 신규 인터랙티브 표면은 ① 프리셋 토글 ② 정렬 헤더 ③ 구성비 막대이며 손으로 그린 것은 ②③ 이다. **① semantic role**: 네이티브 `<table>`/`<th scope="col">`(`StatsTable.tsx:119-129`) · `<caption>`(숨김, `:132`) · 프리셋 `<ul>/<li>/<button>` — ARIA 를 발명하지 않고 네이티브를 쓴다 **② keyboard**: 전부 `<button>`. 격자가 아니라 표라 화살표 이동이 요구되지 않는다 **③ focus ring**: `tds-ui-focusable` **④ label 연결**: `aria-labelledby`(페이지당 `:210-214`) · `aria-label`(차트 `StatsTrendCard.tsx:100` · 축 토글 `TrafficStatsPage.tsx:324` `ariaLabel="드릴다운 축"` · 지표 토글 `StatsTrendCard.tsx:79` `ariaLabel="추이 지표"`) **⑤ live region**: 빈 상태 `role="status"`(`Empty.tsx:104`) · 진행률 `role="status"`(`StatsFilterBar.tsx:231`) · 에러 `role="alert"`(`StatsCard.tsx:45`) **⑥ 이중 인코딩**: 증감 = 색 + ▲▼ + sr-only 문장 — **★ 기준 `a5c2639` 에서 그 3중이 한 컴포넌트로 수렴했고, 그 과정에서 이 화면의 결손 하나가 드러나 메워졌다.** 신설 `_shared/DeltaText.tsx`(`:47-55`)가 `<span aria-hidden="true">`(눈, `formatDeltaPercent`) + `<span style={srOnlyStyle}>`(귀, `describeDelta(delta, unit)`)를 한 벌로 낸다 — 소비처는 둘뿐이다: `DeltaText.tsx:52` · **`ShareBarList.tsx:141`**. **이전 기준에서 구성비 막대의 증감에는 SR 문장이 없었다**(`DeltaText.tsx:4-10` 이 그 사실을 기록한다: '**ShareBarList — 색 + ▲/▼ (SR 문장 없음)**'). **이 화면은 구성비 막대를 실재로 가지므로 그 결손이 실제로 발현했다.** 근거(`:8-9`): '화살표 ▲ 는 눈에는 방향이지만 스크린리더에는 **문자**다 — 읽어 주는 이름이 리더·설정마다 다르고 아예 건너뛰기도 한다'. 회귀 테스트 `DeltaText.test.tsx:18-65`(5건) · 프리셋 = 색 + `aria-pressed` · 정렬 = 색 + ▲▼ + `aria-sort` · 범례 = 색 점 + **글자 라벨**(`LineAreaChart.tsx:139-144`) · 막대 = **길이**(색 하나 — 색각 이상에 안전, `ShareBarList.tsx:2-5`) **⑦ aria-busy**: 표(`StatsTable.tsx:119`) · 막대(`ShareBarList.tsx:112`) · 카드(`StatsCard.tsx:35`).<br>**미충족 1건**(이전 기준 2건에서 줄었다): ~~(a) 범위 요약에 `role="status"` 가 없다~~ → **✔ 해소됨(기준 `a5c2639` · `527fc1b`)** — `StatsTable.tsx:195-204` 이 `total`·`pageSize` 를 넘겨 DS 가 `Pagination.tsx:171-172` 의 `<p role="status">` 로 범위를 그린다(§3 ERP-05) · **(b) 조건을 바꿔 재조회하는 동안 아무것도 announce 되지 않는다** — `isFirstLoad=false` 라 `aria-busy` 조차 없다(§2 STATE-01). **이것이 남은 유일한 a11y 미충족이다** | 스크린리더로 탐색 → 표 구조·정렬 상태·증감 방향·구성비가 전부 읽힌다. 색각 이상 시뮬레이션 → 증감·정렬·프리셋·범례·막대가 **전부 구별된다**. **기간을 바꿔도 announce 가 없고 이전 값이 남는다** | 부분 pass |
| IA-03 | P1 | **N/A** — 이 화면은 nav 잎이다(`nav-config.ts:202`). non-top-level route 가 아니므로 breadcrumb 요구의 대상이 아니다 | 재현할 표면 없음 | N/A |
| IA-14 | P1 | **부분 충족.** ① **표가 bounded 가로 스크롤 컨테이너 안에** — `StatsTable.tsx:28-32,118`. **이 화면에서 특히 중요하다** — 랜딩페이지 라벨이 URL 경로를 담아 길다('상품 검색 결과 (/product/search)') ② **KPI 반응형 그리드** — `StatsKpiRow.tsx:21-23` `repeat(auto-fit, minmax(…,1fr))` → 좁으면 1열 ③ **조회 조건 바 wrap** — `StatsFilterBar.tsx:48,54` ④ **표 푸터 wrap**(`StatsTable.tsx:59`) ⑤ **구성비 막대 라벨 ellipsis**(`ShareBarList.tsx:50-52`). **미충족**: 최소 지원 폭 선언 없음 · identity 컬럼(검색엔진/랜딩페이지) sticky 없음 · 정렬 헤더 버튼 touch-target 미검증(`sortButtonStyle` 에 최소 크기 없음 — `:45-56`) | 768px·375px 에서 → 표 컨테이너가 가로 스크롤되고 `<main>` 은 넘치지 않는다. KPI 4장이 1열로 접힌다. **가로 스크롤 시 랜딩페이지 열이 함께 밀려 나간다** | 부분 pass |
| EXC-05 | P1 | **미충족.** `AbortSignal.timeout` 이 앱 전체에서 0건 — 조회에 상한이 없다. **다만 FS-040 과 달리 거짓 사실을 보이지는 않는다**: `isFirstLoad` 가 참인 채로 스켈레톤이 영원히 돈다 — 무응답이지 거짓말이 아니다 | 응답하지 않는 백엔드를 붙이면 스켈레톤이 무한히 돈다. `?delay=999999` 로 근사 재현 | gap |
| EXC-06 | P1 | **미충족.** `queries.ts:47` `query.isError ? '통계를 불러오지 못했습니다.' : ''` 하나로 401/403/429/500/504 가 같은 문구다. **BE-058 §7.1 이 지적한 상황**('유입은 되는데 매출 권한이 없어 403' vs '서버 장애')에서 원인을 알 수 없다. 429 의 `Retry-After` 도 읽지 않는다. **원문 비노출(`:46`)은 옳다** — 이 응답에는 매출액이 있어 서버 원문이 새면 내부 스키마가 노출된다 | `?status=list:403` 과 `?status=list:500` 이 **같은 배너** | gap |
| EXC-10 | P1 | **N/A** — bulk 작업이 없다(선택 표면 0). 내보내기는 단일 작업이며 부분 실패 개념이 없다 | 재현할 표면 없음 | N/A |
| EXC-11 | P1 | **미충족.** `navigator.onLine` 이 앱 전체에서 0건 | 오프라인 전환 → '통계를 불러오지 못했습니다.'(오프라인임을 말하지 않는다) | gap |
| EXC-12 | P1 | **N/A** — detail/edit route 가 아니다. **집계에는 '대상 없음'이 성립하지 않는다** — 0건이면 200 + 빈 배열이다(BE-058 §5) | 재현할 표면 없음 | N/A |
| EXC-14 | P1 | **N/A** — 낙관적 업데이트가 없다(write 0건) | 재현할 표면 없음 | N/A |
| EXC-18 | P1 | **N/A** — bulk·다중 선택이 없다. 내보내기는 비파괴적이며 `useCsvExport.ts:51-52` 의 락이 중복 실행만 막는다 | 재현할 표면 없음 | N/A |
| TOKEN-13 | P2 | **충족 — 그리고 이제 이 섹션의 코드 주석도 그것을 안다.** `tokens.json:778-888` 에 `chart.series-1..6` + 각 `-fill` 이 **전부 존재하고** `LineAreaChart.tsx:29-44` 가 6계열 전부를 참조한다(`:22-26` 이 TOKEN-13 을 근거로 든다). **★ 기준 갱신(`4b805ad` → `a5c2639`) — 이전 기준의 '주석이 사실과 다르다' 는 해소됐다.** 두 파일이 전부 고쳐졌다: `StatsTrendCard.tsx:8-15` 가 이제 '**[계열 색 — 해결됨, 이 카드가 2계열인 건 이제 색 때문이 아니다]** … TOKEN-13 이 chart.series-3..6(+fill)을 tokens.json 에 넣었고 LineAreaChart 가 6계열까지 서로 다른 hue 로 그린다. 즉 **색 제약은 없다**' 라 적고, **결정의 진짜 근거를 새로 댄다** — '이 카드가 답하는 질문이 *한 지표를 두 기간에 걸쳐 견주면 어떤가* 이기 때문이다'(`:11-14`), '다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — **막던 것은 사라졌다**'(`:15`). `ShareBarList.tsx:7-11` 도 같다 — '**⚠ 예전 이 자리엔 구분 가능한 계열 색이 2개뿐이라는 이유가 함께 적혀 있었다. 그 전제는 지금 거짓이다** — TOKEN-13 이 chart.series-3..6 을 추가해 6계열까지 서로 다른 hue 가 나온다 … **색이 모자라서 단색을 고른 게 아니라, 이 데이터에는 단색 길이 비교가 맞아서** 고른 것이다. 색이 늘었다고 파이로 되돌릴 이유가 되지 않는다'. **즉 두 결정은 유지되고 근거만 참인 것으로 교체됐다** — 이 문서가 요구한 '주석 정정 또는 결정 재검토' 중 **전자가 이행됐고, 그 과정에서 결정이 재검토돼 다른 근거 위에 다시 섰다**.<br>**⚠ 그러나 이 화면의 실제 손해는 남았다.** 이전 기준에서 이 문서는 '`ShareBarList` 가 *색이 2개뿐이라 파이/다계열을 못 쓴다*는 **거짓 근거**로 단일 색 막대를 골랐고, 그 결과 **채널별 축이 유입수만 보인다**(FS-058 §7 #3)' 라 적었다. **지금 `ShareBarList.tsx:7-11` 은 그 근거가 거짓임을 인정하면서도 단색을 유지하고, 참인 근거를 새로 댄다** — '이 데이터에는 단색 길이 비교가 맞다'(순위 데이터는 길이 비교가 읽기 쉽고 색각 이상에 안전하다 — `:2-5`). **그 새 근거는 이 화면에서 검증이 필요하다**: 채널별 축의 문제는 '색이 몇 개냐' 가 아니라 **`unit` 이 하나뿐이라 전환율을 함께 못 보인다**는 것이고(`ShareBarList.tsx:93` — FS-058 §7 #3 · §5 #9), 그것은 색 제약이 풀려도 풀리지 않는다. **즉 주석 오류는 해소됐으나 §5 #9(화면 목적 미달)는 그대로다** — 이전 기준은 둘을 한 원인으로 묶었으나 **실제로는 별개였음이 드러났다** | `tokens.json` 에 `series-1..6` 존재(실측). **`StatsTrendCard.tsx:8-15` · `ShareBarList.tsx:7-11` 이 그것을 인정한다.** 채널별 축은 여전히 `visits` 만 보인다(§5 #9) | pass |

## 4. quality-bar 가 다루지 않는 축

### 4.1 성능 예산

| 항목 | 예산 | 현재 | 근거 |
|---|---|---|---|
| 집계 응답 p95 | **미정** — 백엔드 부재 | 픽스처 400ms | ⚠ **`LATENCY_MS = 400`(`shared/crud/dev.ts`)은 개발용 지연이며 성능 예산이 아니다.** `mock.ts:24-27` 이 `?delay=` 로 덮어쓴다 |
| **재조회 횟수** | **조건 조합당 1회** | `queryKey` 에 기간·비교(`TrafficStatsPage.tsx:128`) | ⚠ **FS-040 과 정반대다.** 조건마다 새 키 = 새 요청. 프리셋 7개를 훑으면 7회. 되돌아오면 캐시가 받는다 |
| **축 전환** | **0회** | `queryKey` 에 `view` 가 **없다** | `engines`·`landings` 가 **첫 응답에 함께 온다**(`data-source.ts:160-165`). 3축을 오가도 요청 0건. **심대로 3개 엔드포인트로 쪼개면 이 성질이 사라진다**(BE-058 §7.2) |
| 세그먼트 전환 | **0회** | `queryKey` 에 `segment` 가 **없다** | 클라이언트 필터(`metricsOfSegment`) — 채널을 바꿔도 요청 0건 |
| 지표·정렬·페이지 전환 | **0회** | 전부 클라이언트 | 표·차트를 다시 그릴 뿐 |
| DOM 규모 | **상한 = 표 7행 + 막대 5줄 + 카드 4장** | 표 행이 **클라이언트 상수**(`data-source.ts:63-79`) | 실제 서버에서 랜딩페이지가 수백이면 이 예산이 바뀐다(BE-058 §7.7 #5) |
| CPU | **O(n log n) · n ≤ 7** | `sortRows`(`table.ts:15-40`) 매 렌더 | `useMemo` 가 없으나 n 이 7이라 무의미. **단 `daily` 는 기간의 날 수만큼이고 `channelsOf` 가 날마다 채널 5종 × `metricsOf` 를 돈다**(`data-source.ts:88-108`) — 픽스처 생성 비용이며 서버가 붙으면 사라진다 |
| 메모리 | 기간의 일자별(채널 5종 분해 포함) + 비교 기간 + engines + landings | `fetchTrafficStats` 가 넷을 함께 낸다 | 7일이면 14행 × 채널 5 = 70 metrics + 11행. **기간 상한이 없어 이론상 73,000일**(§5 #5) |
| 번들 | **이 화면 전용 의존 0** | 차트 라이브러리 미도입 — `LineAreaChart` 를 SVG 로 직접 구현 | ⚠ **FS-040 과 달리 대가가 크지 않다** — 차트가 `role="img"` + 서술형 `aria-label`(`StatsTrendCard.tsx:49-57`)을 갖고 상호작용이 없어 키보드 계약이 요구되지 않는다. 다만 **x축 라벨 상한이 없다**(§5 #6) |

### 4.2 가용성 · 복원력

| 시나리오 | 요구 동작 | 현재 상태 |
|---|---|---|
| 집계 조회 5xx | 인라인 danger Alert + 다시 시도 | ✔ (§2 STATE-02). **조회 조건 바가 남아 복구 가능.** 단 status 분기 없음(§3 EXC-06) · 참조 코드 없음(§5 #4) · ⚠ **구글 고지도 남아 '아래 유입수·매출액은 정상'이라 말한다**(§5 #6) |
| 최초 로드 중 | 로딩임을 알 수 있어야 | ✔ 스켈레톤(카드·표·막대 전부). **거짓 빈 상태가 없다**. ⚠ 표 스켈레톤이 25행인데 실제는 7행(§3 COMP-06) |
| **기간을 바꾸는 중** | **새 기간의 로딩임을 알 수 있어야** | ✖ **이전 기간의 매출액·유입수가 새 기간 라벨 아래 남는다**(§2 STATE-01 · §4.5) |
| 집계 0건 | 빈 상태 | ✔ 최초 로드와 구별된다. `stats-screens.test.tsx:115-123` 이 고정 |
| 종료일 < 시작일 | 검증 오류 | ✔ 입력칸 옆 `role="alert"`, **정확히 1회**, 본문 미렌더(§3 COMP-11) |
| 백엔드 무응답 | 상한에서 abort + '시간이 초과되었습니다' | ✖ 무한 스켈레톤(§3 EXC-05). **거짓말은 아니다** |
| 네트워크 단절 | 재시도 가능한 실패 + 오프라인 고지 | ✖ 일반 실패 문구(§3 EXC-11) |
| 세션 만료(401) | 재인증 후 원래 경로 | ✔ 쿼리 계층이 처리. **조회 조건이 URL 에 있어 `returnUrl` 복원이 조건까지 되살린다** |
| 화면 이탈 중 진행 요청 | abort, 실패 아님 | ✔ (§2 EXC-09) |
| 내보내기 중 취소 | 토스트 없이 중단 + state 복원 | ✔ 코드는 옳다(§2 EXC-09). **단 7행이라 누를 틈이 없다**(§3 ERP-12) |
| 렌더 예외 | 셸 유지 + 복구 UI | ✔ (§2 EXC-01) |
| **서버가 채널 키를 빠뜨림** | 방어 | ✖ **KPI 가 `NaN` 으로 렌더된다**(BE-058 §3.2 #6 · §6.1 #4) — `types.ts:95` 가 인덱스 접근을 가드하지 않는다 |
| **서버의 채널 합 ≠ 전체** | 방어 | ✖ **KPI '총 유입수'와 채널별 구성비가 서로 다른 말을 한다**(BE-058 §3.2 #1). ⚠ **'북마크'가 리퍼러 없는 유입 전부를 담지 않으면 이것이 일어난다**(BE-058 §7.4) |
| **서버가 `orders > visits` 를 냄** | 방어 | ✖ **전환율 137.4% 가 아무 경고 없이 표에 뜬다**(BE-058 §3.2 #8) — `formatPercentValue` 에 상한이 없다 |

### 4.3 픽스처의 성질 (판정에 영향)

| 항목 | 상태 |
|---|---|
| 결정성 | ✔ 날짜 문자열 seed(`mock.ts:56-81` mulberry32) — **같은 날은 언제나 같은 값** |
| 현실성 | ✔ 주말 60~70%(`mock.ts:87-100`) · 채널 비중이 검색엔진에 쏠림(`data-source.ts:23-30`) · **채널마다 전환율이 다르다**(`:38-44` — 북마크 4.5% vs 광고 0.9%). `:36` 이 그 이유를 명시: '채널마다 같은 값을 주면 「어느 채널이 실제로 파는가」라는 이 화면의 물음이 사라진다' |
| **⚠ 픽스처는 목적을 담는데 화면이 안 보여준다** | 채널별 전환율 5배 차이가 데이터에 **있는데**, 채널별 구성비 막대는 `visits` 만 그린다(FS-058 §7 #3). **픽스처가 화면보다 앞서 있다** |
| 불변식 유지 | ✔ 하루 전체를 **채널 합으로** 계산(`data-source.ts:114-121`) — 구조적으로 §3.2 #1 을 보장한다. **서버도 같아야 한다** |
| 재현 스위치 | ✔ `?delay=` · `?fail=` · `?empty=` — **기존 문법 그대로**(`mock.ts:6-11`) |
| **표 행 수가 상수** | ⚠ 검색엔진 4(`data-source.ts:63-68`) · 랜딩 7(`:71-79`) — **데이터가 늘어도 행이 안 는다.** 페이지네이션·페이지 크기·진행률이 죽은 표면인 원인(FS-058 §7 #6) |

### 4.4 이 화면이 답하지 못하는 운영 질문

| 질문 | 현재 |
|---|---|
| '**어느 채널이 파는가**' | **부분 불가 — 이 화면의 존재 이유인데.** `TrafficStatsPage.tsx:5-8` 이 선언한 목적('유입수 1위 채널이 매출 1위가 아닐 수 있다')을 **채널별 축이 보여주지 못한다** — `channelVisits`(`:222`)가 유입수만 센다. 세그먼트를 5번 바꿔가며 KPI 를 비교해야 한다. 검색엔진별/랜딩페이지별 표에는 매출이 있는데 **채널별에만 없다**(FS-058 §7 #3) |
| '매출이 **어떻게 이 채널에 귀속됐나**' | **답이 없다 — 어트리뷰션 모델이 정해지지 않았다.** 라스트 클릭인지 세션 내인지 기간 내인지 코드에도 문서에도 없다(BE-058 §7.4 #4 · §7.9 #8). **이 화면에서 가장 큰 미정이다** |
| '세그먼트를 걸었는데 **표는 왜 안 바뀌나**' | 코드에는 답이 있고(`types.ts:44-48` — 독립 축) **화면에는 없다**(FS-058 §7 #2) |
| ''북마크'가 **뭔가**' | 세그먼트를 북마크로 바꿔야 힌트가 뜬다(`TrafficStatsPage.tsx:156`). **채널별 막대에서 '북마크 22%'를 볼 때는 설명이 없다**(FS-058 §7 #14) |
| '**캠페인별** 광고 성과' | 불가 — UTM/캠페인 축이 없다. 광고 채널이 통짜 하나다 |
| '**신규 vs 재방문**' | 불가 — 그 분해가 없다(방문자 통계의 축이다) |
| '구글 고지가 말하는 **검색어는 어디서 보나**' | 화면이 안내하지 않는다 — 검색어 분석(`/stats/keywords`)이나 링크가 없다(FS-058 §7 #8) |
| '이 숫자는 **언제 집계됐나**' | 불가 — 신선도 계약 없음(BE-058 §7.7 #1). **애널리틱스는 대개 배치인데 화면이 말하지 않는다** |

### 4.5 ⚠ STATE-01 ↔ FS-002 모순 — 이 화면도 정면 당사자다

**두 요구가 같은 `loading` 축에서 반대 방향을 가리킨다.**

| 문서 | 요구 | 근거 |
|---|---|---|
| **quality-bar STATE-01** (P0) | '**refetch 중에는 이전 행을 유지**, skeleton 은 최초 로드(`data===undefined`)에서만' | `quality-bar.md:20` |
| **FS-002 대시보드** | 컨트롤 종속 조회에 **스켈레톤을 요구**: '조회 중이거나 데이터가 아직 없으면 범례·차트 대신 … 스켈레톤 … 토글은 `disabled`'(FS-002-EL-034) · '**데이터가 이미 있는 재조회(탭 전환)에서는 기존 카드 2장이 스켈레톤 상태로 바뀐다**'(FS-002-EL-026) | `specs/dashboard/FS-002-dashboard.md:84,92` |

**이 화면은 STATE-01 을 문자 그대로 지킨다** — `queries.ts:45` + `:40`. 그 결과가 **기간 토글을 눌렀는데 이전 기간의 매출액·유입수·차트가 남는 것**이다. 조회 조건 바(`StatsFilterBar.tsx:254`)와 차트 `aria-label`(`StatsTrendCard.tsx:100`)은 이미 **새 기간**을 말한다.

**F3b 판정: 명세(FS-002)가 옳다.** 월을 눌렀는데 일 차트가 남아 있으면 그 차트는 **거짓말**이다.

**따라서 이 문서가 남기는 해석**(NFR-057 §4.5 와 동일하며, 여섯 통계 화면에 똑같이 걸린다):

> **STATE-01 의 '재조회 시 이전 행 유지' 규칙은 「컨트롤 비종속 재조회」에 한한다** — `staleTime` 만료·백그라운드 갱신·타 관리자의 변경으로 **같은 조건**을 다시 읽는 경우. 사용자가 **조건을 바꿔** 일으킨 「컨트롤 종속 재조회」는 이전 데이터를 **무효화**하고 로딩 상태를 보여야 한다. 두 경우는 `queryKey` 의 변화 여부로 기계적으로 구분된다.

**해소 방향(택1)**: ① 컨트롤 종속 조회에서 `isPlaceholderData`(stats 전체 **소비 0건**)를 스켈레톤 조건에 더한다 ② 기간 조회에 한해 `placeholderData` 를 끈다. **⚠ ①은 `packages/ui` 계약에 막힌다** — §5 #2. **그리고 quality-bar STATE-01 의 문구 자체가 개정 대상이다** — §5 #1.

**이 화면에서 특히 아픈 이유**: **KPI 에 매출액이 있다.** '오늘 매출 1,240만원'이 400ms 동안 떠 있어도 이상해 보이지 않는다 — 오늘 진짜 그럴 수도 있다. **틀렸다는 신호가 화면에 하나도 없다.** 그리고 이 화면의 운영자는 그 숫자로 **광고비 판단**을 한다.

## 5. 미충족(gap) 요약 → 이관

| # | 요구 ID | P | 내용 | 범위 | 이관 |
|---|---|---|---|---|---|
| 1 | **STATE-01** | **P0** | **컨트롤 종속 재조회가 이전 기간의 값을 남긴다.** `queries.ts:40,45` — 기간을 바꾸면 `isFirstLoad=false` 라 스켈레톤도 `aria-busy` 도 없이 이전 기간의 **매출액·유입수·차트**가 새 기간 라벨 아래 선다. `isPlaceholderData` 소비 0건. **요구의 문자만 보면 pass 이므로 quality-bar STATE-01 문구도 함께 개정해야 한다**(§4.5) | 이 화면 + **통계 6화면 공통**(`_shared/queries.ts`) + quality-bar | **A11 · A40 (해석 확정) · A64 (문구 개정)** |
| 2 | — | — | **선행 차단**: `packages/ui` 의 `StatsCard` 가 `loading` **하나로** `<Card busy>`(`StatsCard.tsx:35`)와 스켈레톤(`:48-52`)을 묶는다 → 앱이 '재조회 중이니 본문은 두되 busy 는 알린다'를 **표현할 수 없다**. #1 의 해소(①안)가 막힌다. **앱 코드로는 풀 수 없다** | `packages/ui` | **A41 / DS (계약 분리 — 차단 사안)** |
| ~~3~~ | ~~ERP-05~~ | — | **✔ 해소됨(기준 `a5c2639` · 커밋 `527fc1b`).** 이전 기준에서 DS `Pagination` 의 범위·크기 표면이 꺼진 채 섹션이 같은 것을 손으로 그렸다(`pageSize` 미전달 → `Pagination.tsx:112` `showRange` false → `role="status"` 범위 요약 부재 · `rangeTextOf` 두 벌). **지금은 `StatsTable.tsx:195-204` 이 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 전부 넘겨 DS 가 그린다** — `Pagination.tsx:171-172` 의 `role="status"` 범위 요약 + `:177-194` 크기 선택기. **자작 사본은 지워졌다**(`table.ts:58-60` · `StatsTable.tsx:191-194` 가 그 이력과 이유를 남긴다 — '같은 것을 두 벌 그리면 수식이 갈라진다'). `rangeTextOf` 가 한 벌로 수렴했다. ⚠ **로그 4화면은 아직 사본이다**(NFR-060 §3 ERP-05) — 이 수렴은 통계 섹션에서만 일어났다 | 이 화면 + `_shared` | **종결** |
| 4 | EXC-06 / EXC-20 | P1 | 조회 실패가 status 를 구분하지 않고(`queries.ts:47`) **참조 코드(`traceId`)도 표시하지 않는다**. BE-058 §7.1 의 상황('유입은 되는데 매출 권한 403')에서 원인 파악 불가. 429 의 `Retry-After` 미소비. **원문 비노출(`:46`)은 옳다 — 이 응답에 매출액이 있어 더욱 그렇다** | 이 화면 + `_shared` | A11 · A41 |
| 5 | ERP-15 / 신규 | P1 | **기간 상한이 없다** — `?start=1900-01-01&end=2100-01-01` 이 검증(순서만 본다)을 통과해 `eachDay` 가 **73,000 행**을 만들고 `channelsOf` 가 그 각각에 채널 5종을 돈다. 클라이언트 가드 + 서버 400 둘 다 필요 | 이 화면 + `_shared` + 서버 | A11 · A63 |
| 6 | A11Y-16 / 신규 | P1 | **x축 라벨 상한이 없다** — `LineAreaChart.tsx:216-231` 이 `labels` 전부를 그린다. 30일이면 30개가 겹치고 1년이면 365개. 솎아내기(nth label)가 필요하다 | `packages/ui` + 이 화면 | A41 · A11 |
| 7 | ~~TOKEN-13~~ | P2 | **주석 오류는 ✔ 해소됐다(기준 `a5c2639`) — 그러나 이 화면의 손해는 남았고, 둘이 별개였음이 드러났다.** `StatsTrendCard.tsx:8-15` 와 `ShareBarList.tsx:7-11` 이 전부 고쳐져 'chart.series 가 2개뿐' 이라는 거짓 전제를 스스로 철회했다. **그런데 `ShareBarList` 는 단색 막대를 유지한다** — 새 근거는 '이 데이터에는 단색 길이 비교가 맞다'(`:2-5`)이고 그것은 타당하다. **이전 기준은 '채널별 축이 유입수만 보인다'(#9)를 이 주석 오류의 결과로 귀속했으나 그것은 틀렸다** — #9 의 원인은 색 개수가 아니라 **`unit` 이 하나뿐이라 전환율을 함께 실을 수 없다**는 것이다(`ShareBarList.tsx:93`). **색 제약이 풀렸는데도 #9 가 그대로라는 사실이 그 증거다.** 이 행은 주석 축에서 종결하고 **#9 만 남는다** | 이 화면 + `_shared` | **주석: 종결 · 화면 목적 미달(#9): A11 · A40** |
| 8 | — | — | **BE-058 §7.1 (보안)** — ① **한 응답에 애널리틱스 + 매출 두 도메인**이 있어 '유입은 봐도 매출은 안 되는' 역할을 표현할 수 없다(`revenue` 가 `TrafficMetrics` 의 **필수 필드**라 타입부터 바뀌어야 한다) ② **`export` 권한이 반출 통제가 아니다** — CSV 를 브라우저가 만들어 **매출액을 담은 파일에 서버 감사 로그가 없다** ③ 프론트 리소스(`page:/stats/traffic`)와 서버 권한 축이 다르다 | 앱 전역(권한 모델) | **A63 · A11 (보안)** |
| 9 | — | — | **FS-058 §7 #3 — 화면 목적 미달.** 채널별 구성비 막대가 `visits` 만 보인다. **픽스처는 채널별 전환율 5배 차이를 담고 있는데**(`data-source.ts:38-44`) 화면이 안 보여준다. `ShareBarList` 가 `unit` 하나만 받는 구조(`:92`)라 컴포넌트 변경이 필요하다 | 이 화면 + `_shared` | **A11 change_request (우선순위 높음)** |
| 10 | — | — | **BE-058 §7.4 #4 / §7.9 #8 (도메인) — 매출 어트리뷰션 모델이 없다.** '해당 유입에서 발생한 결제 금액'이 무엇을 기준으로 채널에 귀속되는지 코드에도 문서에도 없다. **이 화면의 존재 이유가 '어느 유입이 매출로 이어졌나'인데 그 「이어짐」의 정의가 없다** | 도메인 | **A01 · A63 (최우선)** |
| 11 | — | — | **BE-058 §7.4 #2 / §3.2 #1 (도메인)** — **'북마크'의 정의를 서버 계약에 적어야 한다.** 이름은 즐겨찾기이나 의미는 '리퍼러 없는 유입 전부'다(`types.ts:6-10`). 서버가 이름대로 세면 채널 합 ≠ 전체가 되고 화면 힌트가 거짓말이 된다 | 도메인 + 서버 | **A63 · A01** |
| 12 | — | — | **BE-058 §6.1 #4** — 서버 응답의 불변식 9개 중 **화면이 검증하는 것이 0개**다. 채널 키 누락 → KPI `NaN` · 합 불일치 → KPI 와 구성비가 다른 말 · `orders>visits` → **전환율 137.4%** 가 경고 없이 뜬다 | 이 화면 + 서버 | A63 · A11 |
| 13 | — | — | **BE-058 §7.2** — `data-source.ts:7-8` 의 심 2건이 **별도 엔드포인트를 가리키나 호출부가 없다.** 심대로 3회 호출로 구현하면 축 전환마다 왕복 + `isFirstLoad` 삼분열 + 모수 불일치가 발생한다. **심을 삭제하거나 'EP-01 응답의 필드'로 재작성해야 한다** | 이 화면 | **A40** |
| 14 | EXC-03 | P1 | **권한 게이트 이중 + 자체 403 화면** — `StatsPageShell.tsx:95-104` 가 앱 공용 `RequirePermission` 과 같은 판정을 한 번 더 하고 공유 `ForbiddenScreen` 이 아닌 자체 마크업을 낸다. 최근 통합이 설정 섹션을 공유본으로 수렴시킨 것과 반대 방향 | `_shared` | A11 · A41 |
| 15 | — | P1 | **조회 실패 시 구글 고지가 남는다** — `notice` 슬롯(`StatsPageShell.tsx:123`)이 배너보다 위에 렌더되고 조건이 `params.view` 뿐이라(`TrafficStatsPage.tsx:292`), 실패해도 '아래 유입수·매출액은 정상으로 잡히지만…' 이라 말한다 — **아래에 아무것도 없는데**. 그리고 **이 표에는 검색어 컬럼이 아예 없어** 고지가 여기 없는 것을 설명한다(FS-058 §7 #8) | 이 화면 | A11 change_request |
| 16 | ERP-12 / COMP-06 | P1 | **표면과 규모의 불일치** — 행이 최대 7개(클라이언트 상수)라 (a) 내보내기 진행률·취소가 **도달 불가능**(`CHUNK_ROWS=200`) (b) 스켈레톤 25행 vs 실제 7행으로 레이아웃이 크게 튄다 (c) 페이지당 셀렉트가 무의미. **실제 랜딩페이지 규모가 정해지면 재판정**(BE-058 §7.7 #5) | `_shared` + 서버 | A11 · A63 |
| 17 | EXC-05 | P1 | 클라이언트 타임아웃 없음 — 무한 스켈레톤. **FS-040 과 달리 거짓 사실은 안 보인다** | 앱 전역 | A40 · A41 |
| 18 | EXC-11 | P1 | 오프라인 감지 없음 | 앱 전역 | A40 |
| 19 | ERP-03 / IA-14 | P1 | sticky thead 는 있으나 **identity 열(검색엔진/랜딩페이지) sticky 없음** · `zIndex:1` 이 토큰 아님(`StatsTable.tsx:42`) · 최소 지원 폭 선언 없음 · 정렬 헤더 touch-target 미검증. ⚠ **랜딩페이지 라벨이 URL 을 담아 길어 가로 스크롤이 실제로 일어난다** | 이 화면 + 앱 전역 | A11 |
| 20 | — | — | **FS-058 §7 #2** — 세그먼트와 축이 독립인데 **화면이 말하지 않는다.** 코드에는 의도가 적혀 있다(`types.ts:44-48` — **주문 통계보다 낫다**). 'SNS'를 고른 채 검색엔진별 표를 보면 KPI 는 SNS 인데 표는 검색엔진 전체다 | 이 화면 | **A11 change_request** |
| 21 | ERP-09 / — | P2 | **서버가 `start`/`end` 를 UTC 로 해석하면 매일 9시간치 유입이 전날로 밀린다**(BE-058 §7.8). 프론트는 KST 로 옳으나 **서버 계약이 미정**이다. 유입은 밤에도 들어와 주문보다 경계 오차가 크다 | 서버 | **A63** |

## 6. 측정 도구 · 재현 스위치

> **E2E 미실행 — 이 문서의 판정 근거는 전부 코드 대조다.** 아래 스위치는 판정을 **뒤집거나 확증하는 재현 절차**이며, 실행 결과가 아니다.
> **예외**: `stats-screens.test.tsx` 는 실제 라우터·쿼리 클라이언트·픽스처로 6화면을 렌더하는 **통합 테스트**이며 `:8-10` 이 그 의도를 명시한다('E2E 를 대신한다 … 워크트리마다 dev 서버 = 포트 충돌'). 그것이 고정한 사실은 §2·§3 에서 그렇게 표기했다.

### 6.1 이 화면의 실제 scope 와 op

**scope = `'stats-traffic'`**(`data-source.ts:21`). **op = `'list'` 하나**(`mock.ts:52` `failIfRequested(scope, 'list')`) — 이 화면이 거는 요청이 조회 하나뿐이다.

| op | 이 화면에서 | 어떤 요소가 깨지는가 |
|---|---|---|
| `list` | ✔ **유일한 op** | FS-058-EL-017 조회 실패 배너(= 본문 SEC-04~06 대체) |
| `detail` · `save` · `delete` | ✕ — 부르지 않는다 | 해당 없음(쓰기 0건) |

### 6.2 재현 스위치 (`mock.ts:6-11` 이 문법을 명시)

```
/stats/traffic?fail=list                     조회 실패 → STATE-02 확증
                                             + '구글 고지가 남는다' 확증(§5 #15)
/stats/traffic?fail=stats-traffic:list       위와 동일(scope 명시)
/stats/traffic?fail=stats-visitors:list      아무 일도 없다 — 스코프가 갈려 있다 (stats-screens.test.tsx:99-113)
/stats/traffic?empty=all                     0행 → STATE-05 확증 ('집계된 유입 기록이 없습니다')
/stats/traffic?empty=stats-traffic&segment=sns
                                             → '필터에 맞는 …' + '필터 초기화' (STATE-05 filter 분기)
/stats/traffic?delay=5000                    스켈레톤 창을 5초로 — STATE-01 '최초 로드' 절 확증
                                             + 표 스켈레톤 25행 vs 실제 7행 확증(§3 COMP-06)
/stats/traffic?delay=5000&preset=last30      진입 후 '오늘' 클릭 → §2 STATE-01 gap 확증:
                                             5초간 '조회 범위 2026.07.17' 아래 지난 30일의 매출액이 남는다
/stats/traffic?preset=custom&start=2026-07-16&end=2026-07-01
                                             기간 검증 → COMP-11 확증 (메시지 1회, 본문 미렌더)
/stats/traffic?view=engine                   구글 고지 확증(FS-058-EL-016) + engines 표(4행)
/stats/traffic?view=landing&sort=revenue&dir=desc
                                             ERP-07 확증: 매출액 자릿수가 세로로 정렬된다
/stats/traffic?segment=bookmark              '북마크' 조건부 힌트 확증(FS-058-EL-009.2)
```

⚠ **`?delay=` 는 이 섹션에 실재한다**(`mock.ts:24-27`) — FS-040 과 다르다. `LATENCY_MS`(기본 400)를 덮어쓴다. **§2 STATE-01 의 gap 을 눈으로 확증하려면 필수다.**

### 6.3 status 재현

`?status=` 는 `shared/crud/dev.ts` 의 문법이나 **이 섹션의 `loadStats` 는 `failIfRequested` 만 부른다**(`mock.ts:52`). §3 EXC-06 의 gap(status 미분기)은 **화면이 어차피 status 를 읽지 않으므로** 재현 결과가 같다: 어떤 status 든 '통계를 불러오지 못했습니다.' 한 문구다.

`409`·`412`·`422` 는 **이 화면에서 발생할 수 없다** — 쓰기가 없다(§2 EXC-04/EXC-08 N/A 와 같은 이유).

### 6.4 코드 대조 지점 (판정 재확인용)

| 판정 | 재확인할 파일:라인 |
|---|---|
| **STATE-01 (gap)** | `queries.ts:40`(`keepPreviousData`) · `:45`(`isFirstLoad`) · `TrafficStatsPage.tsx:304,313,325,339,361`(loading 전달) · `:311`(`period={params.period}`) · `StatsTrendCard.tsx:100`(aria-label 이 새 기간) · `StatsFilterBar.tsx:254` · **`isPlaceholderData` grep = 0** |
| STATE-01 ↔ FS-002 모순 | `quality-bar.md:20` vs `specs/dashboard/FS-002-dashboard.md:84,92` |
| STATE-02 (pass) | `StatsPageShell.tsx:130-148` · `queries.ts:47` · `stats-screens.test.tsx:86-97` |
| TOKEN-01 (pass) | `pages/stats/**` 에 hex·px·bare keyword grep = 0 (실측) |
| A11Y-12 (pass) | `StatsFilterBar.tsx:16,85-90,133-135` · `aria-current` grep = 주석 1건 |
| IA-02 (pass) | `nav-config.ts:202,260-278,297-299` · `StatsPageShell.tsx:6-8`(h1 없음) |
| IA-13 (pass) | `useStatsParams.ts:35,157,168-200` · **`:16-33`(`useListState` 미사용 — GROUND-TRUTH §3 정정)** |
| ~~ERP-05~~ — **해소 확증** | `StatsTable.tsx:195-204`(**`total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 전달**) → `Pagination.tsx:112-113`(`showRange`·`showSizeSelect` true) → `:171-172`(`role="status"` 범위) · `:177-194`(크기 선택). 사본 제거 이력 `table.ts:58-60` · `StatsTable.tsx:191-194` |
| **ERP-07 (pass)** | `TrafficStatsPage.tsx:84-92`(헤더 '매출액 (원)' · 값 숫자만) · `format.ts:12-14,30-38` · `StatsTable.tsx:114`(numericCellStyle) · `StatsKpiRow.tsx:81`(KPI 는 완성형) |
| EXC-03 (pass) | `StatsPageShell.tsx:91-104,119` · `StatsFilterBar.tsx:223` · `resources.ts:31,46,66-68` |
| EXC-09 (pass) | `queries.ts:38` · `mock.ts:51` · `useCsvExport.ts:15,68,81,84-87` |
| ERP-09 (pass) | `useStatsParams.ts:162` · `shared/format.ts:63` · `period.ts:9-13,73,77` |
| ~~TOKEN-13 (주석 오류)~~ — **해소 확증** | `tokens.json:778-888`(series-1..6 실재) vs **`StatsTrendCard.tsx:8-15`('계열 색 — 해결됨 … 색 제약은 없다')** · **`ShareBarList.tsx:7-11`('그 전제는 지금 거짓이다')** — 두 주석이 사실을 인정한다 |
| 채널별 축의 목적 미달(§5 #9) | `TrafficStatsPage.tsx:5-8`(목적) vs `:222`(`channelVisits` — visits 만) · `ShareBarList.tsx:93`(`unit` 하나) · `data-source.ts:38-44`(픽스처에 전환율 차이가 있다) |
| BE-058 §7.1 (권한·매출) | `types.ts:56-61`(`revenue` 필수) · `StatsPageShell.tsx:92,95,119` · `resources.ts:66-68` |
| BE-058 §7.2 (심 3건 = 요청 1회) | `data-source.ts:6-8`(심) vs `:150-169`(한 객체) · `TrafficStatsPage.tsx:128`(queryKey 에 view 없음) · `:257`(필드 선택) |
| 모수 규약(BE-058 §3.2 #4·#5) | `data-source.ts:156-158,163-164` |

## 7. 자기 점검

- [x] quality-bar 의 요구 문구를 복제하지 않았다 — ID 로만 참조하고 '이 화면에서 어떻게/무엇을 재현하면' 만 적었다
- [x] **P0 30건 전수** — 브리핑이 지정한 순서 그대로. 빈칸 0건
- [x] 모든 `N/A` 에 사유 — **9건 전부**
- [x] 모든 `pass` 에 코드 근거(파일:라인)
- [x] 모든 `gap` 에 재현 가능한 측정 기준
- [x] §2.1 산수 검산 — 10 + 10 + 9 + 1 = **30** ✔
- [x] **기준일 2026-07-17 · `HEAD = a5c2639`** 를 §1 에 명시했다
- [x] **'E2E 미실행 — 판정 근거는 코드 대조'** 를 §1 과 §6 에 명시했고, `stats-screens.test.tsx` 가 고정한 사실은 구분해 표기했다
- [x] **STATE-01 ↔ FS-002 모순을 §4.5 에 전면 기록**하고 '유지 규칙은 컨트롤 비종속 재조회에 한한다'는 해석을 남겼다. §2 STATE-01 · §5 #1 에서 상호 참조한다. **이 화면 고유의 위험(KPI 에 매출액이 있어 잔상이 그럴듯하다)** 을 함께 적었다
- [x] **GROUND-TRUTH 를 코드로 재확인해 두 곳을 정정했다** — ① §6 ERP-05: `TrafficStatsPage.tsx:358` 의 `pageSize` 는 `StatsTable` 의 prop 이다(이 화면은 opt-in 소비자가 **아니다**) ② §3 IA-13: `useStatsParams` 는 `useListState` 를 소비하지 **않는다**(`parseFilter` 만) **⚠ 기준 `a5c2639` 에서 ①이 낡았다** — `527fc1b` 이후 `StatsTable.tsx:195-204` 이 `Pagination` 에 `total`·`pageSize`·`pageSizeOptions`·`onPageSizeChange` 를 **전부 넘긴다.** 이 화면은 이제 **ERP-05 의 opt-in 소비자다**(§3 ERP-05 — pass). ②는 그대로 유효하다.
- [x] §3 은 **표면이 실재하는 것만** 적었다. 표면이 없는 것(STATE-06·A11Y-08·IA-03·EXC-10/12/14/18)은 N/A 사유와 함께 남겼다. **ERP-07 은 이 화면에 표면이 실재해 pass 로 판정했다** — 통계 3화면 중 유일하다
- [x] §4.1 에 **`LATENCY_MS = 400` 이 개발용 지연이며 예산이 아님**을 명시했다
- [x] §6 에 **실제 `?fail=` scope(`stats-traffic`)와 op(`list` 하나)을 코드에서 확인**해 적었다. **`?delay=` 가 실재함**을 FS-040 과 대조해 명시했다
- [x] **`packages/ui` 계약이 STATE-01 해소를 막는다**는 사실(§5 #2)을 앱층 gap 과 분리해 A41/DS 로 지목했다
- [x] NFR-057 · NFR-059 와 겹치는 판정(`_shared` 공유)을 **이 화면 고유의 근거로 다시 확인**해 적었다 — `TrafficStatsPage.tsx` 의 라인을 함께 인용했다. **판정 분포가 NFR-057 과 동일한 이유(§2.1 주석)** 도 밝혔다
- [x] **화면 목적 미달(§5 #9)을 정직히 기록했다** — 픽스처가 채널별 전환율 차이를 담는데 화면이 안 보여준다는 사실을 `data-source.ts:38-44` vs `TrafficStatsPage.tsx:222` 대조로 확인했다
</content>
