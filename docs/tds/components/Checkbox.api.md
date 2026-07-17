<!-- AUTO-GENERATED from contracts/Checkbox.contract.json — DO NOT EDIT (pnpm codegen) -->

# Checkbox API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Checkbox.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

체크박스 + 라벨. 출처: apps/admin/src/pages/login/components/Checkbox.tsx. 제어 컴포넌트로 checked/onChange 를 반드시 짝지어 받는다 (비제어 defaultChecked 는 지원하지 않는다). 라벨은 htmlFor={id} 로 연결되어 라벨 클릭으로도 토글된다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `atom` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `id` | `string` | — | ✅ | — | input 의 id. label htmlFor 의 기준 |
| `label` | `string` | — | ✅ | — | 가시 라벨. 클릭 시 토글되는 히트 영역이다 |
| `name` | `string` | `""` | — | — | 폼 제출 키. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="rememberEmail") — 오너 확정 화면의 DOM 이다 |
| `checked` | `boolean` | — | ✅ | `Checked` | 체크 상태. 제어 값 — onChange 로만 바뀐다 |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성. native disabled 속성 — onChange 발화 없음 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `ChangeEvent<HTMLInputElement>` | `disabled` | 체크 토글. disabled 에서는 발화 금지 — Storybook Play Function 이 전수 검증 |

## States

`default` · `hover` · `focus-visible` · `disabled` · `checked`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `checkbox` |
| 키보드 | `Space`, `Tab`, `Shift+Tab` |
| focus-visible | 필수 |
| `aria-checked` | native input[type=checkbox] 의 checked 상태로 노출된다 (별도 aria 속성 불필요) |
| `label` | 가시 라벨을 htmlFor={id} 로 연결한다 — 라벨 클릭이 히트 영역이 된다 |
| `indeterminate` | 이 버전은 부분 선택(indeterminate)을 지원하지 않는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `labelText` | `color.text.default` | `--tds-color-text-default` |
| `labelTextDisabled` | `color.text.disabled` | `--tds-color-text-disabled` |
| `labelTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `control` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `focusRingOffset` | `space.1` | `--tds-space-1` |
| `radius` | `radius.sm` | `--tds-radius-sm` |
| `gap` | `space.2` | `--tds-space-2` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
