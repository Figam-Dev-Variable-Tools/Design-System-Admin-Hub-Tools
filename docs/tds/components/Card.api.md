<!-- AUTO-GENERATED from contracts/Card.contract.json — DO NOT EDIT (pnpm codegen) -->

# Card API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Card.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

표면 컨테이너 — 서피스 배경 + 테두리 + 라운드 + 내부 패딩을 제공하는 최소 단위 surface. 출처: apps/admin/src/pages/dashboard/components/Card.tsx 의 Card(<section>). 헤더/본문 구조나 도메인 데이터는 이 계약에 없다 — 조립은 organism(StatsCard/TodoCard/ListCard)이 한다 (ADR-0003).

[1.1.0 — elevation] flat(기본, 그림자 없음) / raised(강조 카드 — shadow.raised 로 배경 위에 부드럽게 부상). Toss 급 depth 는 border 가 아니라 layered shadow 에서 온다 (TOKEN-04).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.2.0` |
| 레벨 | `atom` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `children` | ReactNode | — | ✅ | — | 카드 본문. 컨테이너는 flex column 이며 minWidth:0 으로 그리드 내 축소를 허용한다 |
| `padding` | `'md'` \| `'lg'` | `"md"` | — | `Padding` | 내부 여백. md = space.5(현행 구현값), lg = space.6 |
| `elevation` | `'flat'` \| `'raised'` | `"flat"` | — | `Elevation` | 표면 높이. flat = 그림자 없음(기본), raised = shadow.raised 로 강조 카드처럼 부상시킨다 |
| `busy` | `boolean` | `false` | — | `Busy` | 데이터 로딩 중. aria-busy="true" 를 부여한다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default` · `loading`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `region` |
| 키보드 | `none — 컨테이너 자체는 포커스 대상이 아니다. 내부 요소가 순서를 갖는다` |
| focus-visible | 해당 없음 |
| aria-busy | when busy |
| `accessible-name` | <section> 은 접근 가능한 이름이 있어야 region 랜드마크가 된다 — 조립하는 쪽이 aria-labelledby(제목 id) 또는 aria-label 을 준다. 이름이 없으면 generic 으로 노출되며 이는 정상 동작이다 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `background` | `color.surface.default` | `--tds-color-surface-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `radius` | `component.card.radius` | `--tds-component-card-radius` |
| `shadowRaised` | `shadow.raised` | `--tds-shadow-raised` |
| `paddingMd` | `space.5` | `--tds-space-5` |
| `paddingLg` | `space.6` | `--tds-space-6` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
