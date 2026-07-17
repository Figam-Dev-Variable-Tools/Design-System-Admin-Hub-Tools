---
id: ADR-0011
title: 차트·표 라이브러리 도입 — @tanstack/react-table 채택 · Recharts 조건부 · ECharts 보류(명세 충돌)
status: accepted
date: 2026-07-17
owner: A01 (Architecture AI)
author: A80 (Dependency Manager)
supersedes: null
relatedTo: [ADR-0003, ADR-0008]
---

# ADR-0011. 차트·표 라이브러리 도입

> 절차는 **ADR-0008 §3** 을 따른다 — 문제 진술 / 대안 비교 / **번들 실측** / 부재 시 결과.
> 이 ADR 의 모든 수치는 추정이 아니라 이 리포의 **출하 파이프라인(vite build = Rollup)** 실측이다.

## 1. 맥락

오너가 스택을 확정했다: **Recharts(통계) · ECharts(대시보드) · TanStack Table(목록)**.

판단의 근거는 **현재의 부족이 아니라 미래의 필요**다 — "지금 문제가 없어도 앞으로 필요해진다
(차트 다양화 · 데이터 증가)". 이것은 정당한 결정이며, 이 ADR 은 그 결정을 **실측 위에** 세운다.

이전 배치가 같은 제안을 번들 근거로 거부한 이력이 있다. 그 거부는 뒤집혔다. 다만 그때 짚은
위험(진입 번들 · 접근성)은 실재하므로, 아래는 **위험을 피하면서 넣는 방법**과 **피할 수 없는
지점**을 구분해 기록한다.

## 2. 번들 실측 (vite build · Rollup · gzip · react/react-dom external)

독립 probe 4벌을 `vite build --lib` 로 빌드해 잰 값이다.

| probe | 구성 | raw | **gzip** |
|---|---|---|---|
| `@tanstack/react-table` | `useReactTable` + core/sorted row model + `flexRender` | 73.3 kB | **16.5 kB** |
| `recharts` | Area/Line/XAxis/YAxis/Grid/Tooltip/Legend/ResponsiveContainer | 583.4 kB | **140.8 kB** |
| `echarts` (전체) | `import * as echarts from 'echarts'` | 1709.2 kB | **469.2 kB** |
| `echarts` (tree-shaking) | `echarts/core` + LineChart + Grid/Tooltip/Legend + CanvasRenderer | 788.9 kB | **218.4 kB** |

**기준점**: 현재 앱의 진입 청크는 `dist/assets/index-*.js` = 406.16 kB raw / **130.59 kB gzip** 이다.

> ⚠ 브리핑의 전제 정정: 진입 청크는 117.68 kB 가 아니라 **130.59 kB** 다 (L2 이후 커졌다).
> ECharts 는 tree-shaking 을 최대로 해도 **218.4 kB — 진입 청크 전체의 1.67배**다.

## 3. `@tanstack/react-table` — **채택**

**문제 진술**: `CrudTable` 은 25개 화면(→ `CrudListShell`)의 표 골격이다. 지금 이 표에는 정렬이
**없다**. 반면 정렬이 필요했던 두 화면(`logs/LogTable`, `stats/StatsTable`)은 **각자 독립적으로**
comparator · `aria-sort` 렌더 · URL 정렬 상태를 다시 구현했다 — 이미 2벌이다. 25개 목록에 정렬이
필요해지는 날, 그것은 3벌째가 아니라 27벌째가 된다.

| 축 | (a) 직접 구현 유지 | (b) `@tanstack/react-table` |
|---|---|---|
| 문제 해결 범위 | 화면마다 comparator 재작성 | 행 모델 · 정렬 · (미사용) 필터/페이지네이션/그룹 |
| 번들 증분 (gzip) | +0 | **+16.1 kB (실측)** |
| 진입 청크 영향 | — | **+0.05 kB** — 진입에 들어가지 않는다 |
| 렌더링 | — | **headless** — 마크업·토큰·a11y 는 계속 우리 것 |
| 유지보수 | 우리가 소유 | TanStack, 활발 (v8 안정) |
| 라이선스 | — | MIT |

**부재 시**: 정렬이 필요해질 때마다 comparator + `aria-sort` + URL 배선이 화면 수만큼 복제된다.
**판정: (b) 채택.**

### 채택 형태 (경계)

- **정렬은 opt-in 이다** — `CrudColumn.sortValue` 를 준 열만 정렬 가능해진다. 25개 화면 중
  아무도 주지 않으므로 **렌더 결과는 도입 전과 동일**하다 (테스트로 고정).
- **체크박스 · 순번 · 행 액션은 컬럼 모델에 넣지 않는다** — 데이터 열이 아니라 표의 골격이다.
  넣으면 얻는 것 없이 25개 화면의 DOM 이 바뀐다.
- **정렬 상태의 단일 원천은 URL** 이다 (`useListState.sort` — IA-13 이 이미 나르고 있었고 아무도
  쓰지 않았다). TanStack 의 내부 정렬 상태는 쓰지 않는다.
- **`getPaginationRowModel` 을 쓰지 않는다** — 페이지네이션은 `Pagination`(F3a range/page-size)과
  `useListState` 가 소유한다. 이중화하지 않는다.
- STATE-01/04 는 `useCrudList`/`useListState` 소유라 이 도입이 건드리지 않는다.

## 4. `recharts` — **채택 (통계 한정 · 별도 컴포넌트)**

**문제 진술**: 통계 6화면의 추이 카드가 area + line + 비교 기간을 그린다. 지금은 `LineAreaChart`
(DS molecule)가 한다. 앞으로 막대·파이·산점도 등으로 다양해지면 그때마다 SVG 를 손으로 그리게 된다.

**그러나 `LineAreaChart` 를 Recharts 로 교체할 수 없다 — 두 가지 사실 때문이다.**

1. **`LineAreaChart` 는 대시보드도 쓴다** (`pages/dashboard/components/StatsSection.tsx`),
   그리고 **`DashboardPage` 는 lazy 가 아니다** — `App.tsx` 가 LCP 를 이유로 **즉시 로드**로
   명시해 둔 셋 중 하나다(LoginPage · DashboardPage · PlaceholderPage). 따라서 `LineAreaChart`
   안에 Recharts 를 넣으면 **140.8 kB gzip 이 진입 청크로 직행한다** (130.59 → ~271 kB, +108%).
   > ⚠ 브리핑의 전제 정정: "통계·대시보드 라우트는 이미 lazy" 는 **대시보드에 대해 거짓**이다.
2. **명세가 대시보드 차트에 외부 라이브러리를 금지한다** — §5 참조.

**따라서 Recharts 를 넣는 유일한 형태는 '통계 전용 별도 컴포넌트'다** (`pages/stats/_shared/`,
`ShareBarList` 선례와 같은 앱 레이어). 그러면 진입 청크는 그대로고, 통계 라우트만 비용을 낸다.

| 축 | (a) `LineAreaChart` 유지 | (b) Recharts 통계 전용 | (c) Recharts 로 `LineAreaChart` 교체 |
|---|---|---|---|
| 번들 (gzip) | +0 | **+140.8 kB — 통계 라우트만** | +140.8 kB — **진입 청크** |
| 진입 청크 | 130.59 kB | **130.59 kB (불변)** | **~271 kB (+108%)** |
| FS-002-EL-031 | 지킴 | 지킴 | **위반** |
| 오늘의 이득 | — | **없음** (area+line+비교를 이미 다 한다) | 없음 |
| 미래의 이득 | 없음 | 막대·파이·산점도·브러시 | 동일 |
| 대가 | — | **차트 시스템 2벌** (DS 1 + 앱 1) → 드리프트 | — |

**판정: (b) 채택. (c) 는 불가.**

### 채택 형태 (경계) · 실측

- `pages/stats/_shared/StatsTrendChart.tsx` (Recharts `ComposedChart`) 가 통계 추이 카드를 그린다.
  `LineAreaChart` 는 **대시보드 전용으로 남는다** — 계속 살아 있으므로 dead-code 가 아니다.
- **진입 청크 불변**: 130.59 → **130.65 kB gzip (+0.06 kB)**. Recharts 는 진입에 없다.
  - 진입 청크가 `mock-*.js`(Recharts 가 실린 청크)를 **문자열로 언급**하지만 그것은 Vite 의
    `__vitePreload` 의존성 맵일 뿐 import 가 아니다. 실제 importer 는 **lazy 통계 6라우트 + ShareBarList**
    뿐임을 빌드 산출물에서 확인했다.
- **통계 라우트 비용**: 공유 청크 `mock-*` 7.40 → **106.0 kB gzip (+98.6 kB)**. 통계 화면을
  처음 열 때 받는다. (probe 단독값 140.8 kB 보다 작은 이유는 앱과 react 등을 공유하고 미사용
  차트 종류가 tree-shaking 되기 때문이다.)
- **잃지 않은 것** (테스트 4건으로 고정 — `StatsTrendChart.test.tsx`):
  `role="img"` + 추세 문장 `aria-label` · 범례가 **텍스트**(색 점은 `aria-hidden`) ·
  비교 기간 없을 때 비교 범례 없음 · 전부 0 인 기간에도 죽지 않음(STATE-01).
  그리는 순서(현재 area → 비교 line)와 `chart.series-1/2(+fill)` 토큰도 그대로다.
- **y축 눈금은 자동 도메인에 맡기지 않는다** — `buildTicks` 가 LineAreaChart 와 같은 규칙으로
  상한을 5등분해 항상 6눈금을 만든다. 자동 눈금은 개수가 흔들려 통계 6화면의 카드 높이가 들썩인다.

> 남는 부채(정직하게 기록): 이제 차트 시스템이 **2벌**이다 — DS 의 `LineAreaChart`(대시보드) 와
> 앱의 `StatsTrendChart`(통계). 이것은 §4.1·§5 의 제약이 강제한 결과이지 선택이 아니다.
> 대시보드 명세(FS-002-EL-031)가 개정되어 외부 라이브러리를 허용하는 날, 두 벌을 하나로
> 합치는 것이 옳다. 그 전에는 합칠 수 없다.

## 5. `echarts` — **보류 (명세 충돌 · 이 배치의 권한 밖)**

오너 지정 역할은 '대시보드'다. 그런데 대시보드 차트에는 **네 개의 독립적인 장벽**이 있다.

1. **명세가 금지한다.** `specs/dashboard/FS-002-dashboard.md` **FS-002-EL-031**:
   > "**외부 차트 라이브러리 없이 SVG로 2계열을 렌더한다** … `role="img"` 이며 `aria-label` 은
   > '기간별 방문자 및 페이지뷰 추이 — 최대 N' … 표시 크기는 컨테이너 폭을 따라 비례 축소·확대된다"

   `specs/**` 는 이 배치의 소유가 아니다. **명세를 고치지 않고 ECharts 를 넣는 것은 명세 위반이다.**
2. **e2e 가 SVG DOM 을 단언한다.** `e2e/dashboard/FS-002-dashboard.spec.ts:408,414`:
   `await expect(chart.locator('circle')).toHaveCount(7)` / `toHaveCount(5)` +
   `chart.getByText('7.14')`. **ECharts 는 canvas 라 `circle` 도 텍스트 노드도 없다.**
   콜드 e2e 73/73 유지가 하드 제약이므로 이것은 곧바로 회귀다.
   (ECharts 의 SVG 렌더러도 심볼을 `<path>` 로 내므로 `circle` 단언을 만족하지 못한다.)
3. **진입 청크.** DashboardPage 는 lazy 가 아니다(§4.1). tree-shaking 최대치 **218.4 kB gzip**
   이 진입에 들어간다 — 130.59 → **349 kB (+167%)**. L2 가 347 → 117.68 kB 로 만든 일을 되돌린다.
4. **접근성.** canvas 는 SR 이 읽을 DOM 이 없다. 지금 대시보드 차트는 `role="img"` + 추세를
   문장으로 기술한 `aria-label` 을 갖는다. 대안(표 대체 경로)을 만들 수는 있으나, 그것은
   **1·2 를 해결하지 못한다** — 명세와 e2e 는 SVG 그 자체를 요구한다.

**판정: 보류.** 1·2 는 코드로 우회할 수 있는 문제가 아니라 **명세 소유자의 결정**이다.
ECharts 를 넣으려면 먼저 FS-002-EL-031 을 개정하고 e2e 를 함께 고쳐야 하며, 그것은
`specs/**` 소유 배치의 일이다. **이 배치는 넣지 않고 보고한다.**

> 되짚어 볼 점: 대시보드는 2계열 선/면적 하나를 그린다. 그 한 장을 위해 진입 청크를 2.7배로
> 만드는 것이 ECharts 의 값이라면, ECharts 의 값어치(3D·지도·대용량 캔버스)는 이 화면에서
> 쓰이지 않는다. 오너의 '미래의 필요'가 그 값어치를 실제로 요구하는 화면(예: 지도·히트맵)에서
> 발생한다면, 그 화면과 함께 도입하는 편이 근거가 선명하다.

## 6. 결과

- `apps/admin/package.json`: **`@tanstack/react-table` · `recharts` 추가**.
  **`echarts` 는 추가하지 않는다** — §5 의 이유로 import 할 자리가 없고, import 하지 않는 의존성은
  ADR-0008 §3.0 의 "설치는 번들 비용이 아니다 — import 가 번들 비용이다" 에 따라 lockfile 만 키운다.
- `shared/crud/CrudTable.tsx`: 행 모델을 TanStack 으로. 정렬 opt-in + `aria-sort`.
- `shared/crud/CrudListShell.tsx`: `sort`/`onToggleSort` 통과 (URL 단일 원천).
- `pages/stats/_shared/StatsTrendChart.tsx`(신규): Recharts 추이 차트. `StatsTrendCard` 가 소비.
- `packages/ui` 의 `LineAreaChart` 는 **변경 없음** — 대시보드가 계속 쓴다.
- **`contracts/LineAreaChart.contract.json` 은 바뀌지 않는다** — `LineAreaChart` 가 계속 외부 의존
  0 이므로 `"dependencies": []` 와 설명이 **여전히 참**이다.
  > ⚠ 브리핑의 전제 정정: "ADR-0003 이 '외부 차트 라이브러리 의존 0' 을 명시한다" 는 거짓이다.
  > ADR-0003 은 **데이터 prop 과 모듈 분류**에 관한 것이며 차트 라이브러리를 언급하지 않는다.
  > 그 문구는 **계약의 description** 과 컴포넌트 주석, 그리고 **FS-002-EL-031(명세)** 에 있다.
  > 즉 갱신 대상은 ADR-0003 이 아니라 **명세**이며, 그것은 이 배치의 소유가 아니다.
- VRT 기준이미지 **갱신 없음** — VRT 는 Storybook 스토리만 캡처하고(`tools/vrt/src/capture.ts`),
  `packages/ui` 는 이 배치에서 바뀌지 않았다.
