<!-- AUTO-GENERATED from contracts/LineAreaChart.contract.json — DO NOT EDIT (pnpm codegen) -->

# LineAreaChart API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/LineAreaChart.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

범용 선 + 면적 차트 — 계열마다 kind 로 선/면적을 고른다. 외부 차트 라이브러리 의존 0 (SVG 좌표 직접 계산, Catmull-Rom → 3차 베지어 스무딩). 도메인 중립: '방문자/페이지뷰' 같은 계열 의미는 데이터를 주입하는 organism 이 소유한다 (ADR-0003). 출처 구현: apps/admin/src/pages/dashboard/components/VisitorChart.tsx 를 일반화

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.1` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `series` | `array` | — | ✅ | — | 계열 목록. values 길이는 labels 길이와 같아야 한다. 데이터 prop — Figma 대응 없음 (ADR-0003) |
| `labels` | `array` | — | ✅ | — | x축 눈금 라벨. 데이터 prop — Figma 대응 없음 |
| `showLegend` | `boolean` | `true` | — | `ShowLegend` | 계열 범례 표시 여부. 범례는 장식이 아니라 계열 식별 수단이므로 기본 노출 |
| `ariaLabel` | `string` | — | ✅ | — | role=img 의 접근 가능한 이름. 차트가 전달하는 추세를 문장으로 기술한다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `img` |
| 키보드 | `Tab` |
| focus-visible | 필수 |
| `aria-label` | ariaLabel prop — 차트 전체의 이름 |
| `aria-hidden` | 범례 색 점 — 장식용이므로 true |
| 최소 대비 | 3:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `gridLine` | `color.chart.axis` | `--tds-color-chart-axis` |
| `axisLabel` | `color.chart.label` | `--tds-color-chart-label` |
| `legendText` | `color.chart.label` | `--tds-color-chart-label` |
| `legendDotRadius` | `radius.full` | `--tds-radius-full` |
| `legendGap` | `space.4` | `--tds-space-4` |
| `legendItemGap` | `space.1` | `--tds-space-1` |
| `lineColor` | `color.chart.series-1` | `--tds-color-chart-series-1` |
| `pointColor` | `color.chart.series-1` | `--tds-color-chart-series-1` |
| `areaColor` | `color.chart.series-1-fill` | `--tds-color-chart-series-1-fill` |
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
