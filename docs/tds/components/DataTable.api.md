<!-- AUTO-GENERATED from contracts/DataTable.contract.json — DO NOT EDIT (pnpm codegen) -->

# DataTable API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/DataTable.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

범용 데이터 표 — 컬럼 정의 + 행 데이터 + 합계(요약) 행. 도메인 중립: '기간별 분석' 같은 도메인 의미는 컬럼/행 데이터를 주입하는 organism 이 소유한다 (ADR-0003). 행의 첫 컬럼(rowKey)은 th[scope=row] 로 렌더하고 나머지는 td 다. 출처 구현: apps/admin/src/pages/dashboard/components/PeriodTable.tsx 를 도메인 제거해 일반화

[rowKey 는 tbody 와 tfoot 에 함께 적용된다] 요약 행도 rowKey 컬럼의 값을 th[scope=row] 로 렌더한다. 본문 행의 키 필드(예: date)와 요약 행의 표시 필드(예: label)가 다르면 **호출부가 어댑터에서 같은 키로 맞춘다** (예: summaries.map(s => ({ date: s.label, ...s }))). 별도의 summaryRowKey prop 을 두지 않는다 — 데이터 정형화는 데이터를 소유한 쪽의 일이고, 표에 키 필드를 두 개 두면 스코프/헤더 연결 규칙이 두 갈래로 갈라진다

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 카테고리 | `Tables` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `columns` | `array` | — | ✅ | — | 컬럼 정의. align 기본값은 'right'(수치). unit 은 요약(tfoot) 행에 붙는다. unitInBody=true 면 **본문(tbody) 행에도** 같은 unit 접미사를 붙인다 (기본 false — 현행 동작 유지). 실사용: 대시보드 기간별 분석의 매출액 컬럼만 본문에 '원' 을 붙인다 (PeriodTable.tsx:114 — column.key === 'revenue' 일 때만 withUnit). 현행 구현은 본문 셀에 withUnit=false 를 하드코딩해(DataTable.tsx:84) 이 컬럼의 단위가 사라진다. 데이터 prop — Figma 대응 없음 (ADR-0003) |
| `rows` | `array` | — | ✅ | — | 본문 행. 각 행은 columns[].key 를 키로 갖는다. 빈 배열이면 empty 문구를 렌더한다. 데이터 prop — Figma 대응 없음 |
| `rowKey` | `string` | — | ✅ | — | 행 식별 컬럼 키. React key 이자 th[scope=row] 로 렌더되는 컬럼이다 |
| `summaryRows` | `array` | `[]` | — | — | tfoot 에 렌더되는 합계/요약 행. 강조 배경 + 단위 표기. 데이터 prop — Figma 대응 없음 |
| `caption` | `string` | — | ✅ | — | 표의 목적을 설명하는 caption. 시각적으로 숨기되 스크린리더에는 노출한다 |
| `dimZero` | `boolean` | `true` | — | `DimZero` | 0 이하의 수치 셀을 흐리게 처리 — 눈이 0을 건너뛰고 유의미한 수치에 먼저 가게 한다 |
| `empty` | `string` | `"표시할 항목이 없습니다."` | — | — | rows 가 빈 배열일 때 표시할 문구 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `table` |
| 키보드 | `Tab` |
| focus-visible | 필수 |
| `caption` | caption prop — 시각적으로 숨긴 caption 요소로 렌더 |
| `scope` | 헤더 셀은 scope=col, rowKey 컬럼의 본문/요약 셀은 scope=row |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `headText` | `color.text.muted` | `--tds-color-text-muted` |
| `headBorder` | `color.border.default` | `--tds-color-border-default` |
| `headPaddingTop` | `space.2` | `--tds-space-2` |
| `headPaddingBottom` | `space.3` | `--tds-space-3` |
| `cellText` | `color.text.default` | `--tds-color-text-default` |
| `cellTextDimmed` | `color.text.disabled` | `--tds-color-text-disabled` |
| `cellBorder` | `color.border.default` | `--tds-color-border-default` |
| `cellPaddingX` | `space.2` | `--tds-space-2` |
| `cellPaddingY` | `space.3` | `--tds-space-3` |
| `summaryBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `summaryText` | `color.text.default` | `--tds-color-text-default` |
| `emptyText` | `color.text.muted` | `--tds-color-text-muted` |
| `emptyMarginTop` | `space.5` | `--tds-space-5` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
