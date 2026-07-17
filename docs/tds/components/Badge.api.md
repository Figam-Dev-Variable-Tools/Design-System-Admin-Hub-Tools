<!-- AUTO-GENERATED from contracts/Badge.contract.json — DO NOT EDIT (pnpm codegen) -->

# Badge API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Badge.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

카운트 뱃지 — 제목/라벨 옆에 개수를 표시하는 원형 pill. 출처: apps/admin/src/pages/dashboard/components/Card.tsx 의 CountBadge (count<=0 이면 렌더하지 않음). 비대화형 표시 전용이며 클릭 이벤트를 갖지 않는다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `atom` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `count` | `number` | — | ✅ | — | 표시할 개수. hideWhenZero=true 이고 count<=0 이면 아무것도 렌더하지 않는다 (구현: `if (count <= 0) return null`) |
| `tone` | `'neutral'` \| `'danger'` \| `'success'` | `"neutral"` | — | `Tone` | 시각 의미. neutral = 텍스트색 배경 위 서피스색 숫자(현행 구현), danger/success = feedback 토큰 페어 |
| `hideWhenZero` | `boolean` | `true` | — | `HideWhenZero` | count<=0 일 때 렌더 생략 여부. false 면 0 도 표시한다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `status` |
| 키보드 | `none — 비대화형. 포커스 순서에 들어가지 않는다` |
| focus-visible | 해당 없음 |
| `aria-live` | 카운트가 런타임에 갱신되는 문맥에서는 polite. 정적 렌더 시 불필요 |
| `labelling` | 숫자만으로는 의미가 없다 — 인접 제목(CardTitle 등)이 접근 가능한 문맥을 제공해야 한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `background` | `color.text.default` | `--tds-color-text-default` |
| `text` | `color.surface.default` | `--tds-color-surface-default` |
| `backgroundDanger` | `color.feedback.danger.surface` | `--tds-color-feedback-danger-surface` |
| `textDanger` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `backgroundSuccess` | `color.feedback.success.surface` | `--tds-color-feedback-success-surface` |
| `textSuccess` | `color.feedback.success.text` | `--tds-color-feedback-success-text` |
| `radius` | `radius.full` | `--tds-radius-full` |
| `size` | `space.5` | `--tds-space-5` |
| `paddingX` | `space.1` | `--tds-space-1` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
