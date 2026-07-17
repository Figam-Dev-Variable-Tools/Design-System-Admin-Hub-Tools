<!-- AUTO-GENERATED from contracts/ToggleSwitch.contract.json — DO NOT EDIT (pnpm codegen) -->

# ToggleSwitch API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ToggleSwitch.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

ON/OFF 토글 스위치 — 이진 노출 상태를 목록/폼에서 바로 켜고 끈다. 출처: apps/admin/src/shared/ui/ToggleSwitch.tsx (소비 30곳: FAQ 노출·팝업/배너 ON/OFF·상품 전시·리뷰 노출·계정 거래 등). 도메인을 모른다 — 무엇을 켜는지 알지 못하고 checked 불리언과 콜백·접근성 라벨만 받는다. role="switch" + aria-checked 이며 <button> 이라 Space/Enter 로 토글된다(버튼 기본 동작). 보이는 ON/OFF 문구로 상태를 색과 글자로 이중 전달한다(WCAG 1.4.1).

[busy = 낙관적 업데이트 잠금] 요청 진행 중에는 잠그고(disabled) aria-busy 로 진행을 알리며 흐리게 표시한다 — disabled 와 같은 시각 잠금이라 별도 Figma Variant 축을 만들지 않아도 되지만, 스키마가 boolean 에 figmaProperty 를 요구하므로 Busy 로 매핑한다.

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
| `checked` | `boolean` | — | ✅ | `Checked` | ON 상태 — 트랙 색과 손잡이 위치를 결정한다. 제어 값이며 onChange 로만 바뀐다 |
| `label` | `string` | — | ✅ | — | 스크린 리더용 이름(aria-label) — 보이는 라벨이 없는 표 안에서 무엇을 켜는지 알린다('FAQ 노출 여부' 등) |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성 — 잠그고 흐리게 표시한다. onChange 발화 없음 |
| `busy` | `boolean` | `false` | — | `Busy` | 낙관적 업데이트 요청 진행 중 — disabled 와 동일하게 잠그고(onChange 없음) aria-busy=true 로 진행을 알린다 |
| `onLabel` | `string` | `"ON"` | — | — | ON 상태 문구 (기본 'ON'). 색+글자로 상태를 이중 전달한다 |
| `offLabel` | `string` | `"OFF"` | — | — | OFF 상태 문구 (기본 'OFF') |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `boolean` | `disabled`, `busy` | 다음 상태(!checked)를 인자로 발화한다. disabled/busy 잠금 상태에서는 발화 금지 — <button disabled> 가 네이티브로 막는다 (Storybook Play Function 이 전수 검증) |

## States

`default` · `focus-visible` · `disabled` · `checked`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `switch` |
| 키보드 | `Space`, `Enter`, `Tab` |
| focus-visible | 필수 |
| aria-busy | when busy |
| `aria-checked` | checked 상태를 aria-checked 로 노출한다 (role=switch) |
| `label` | 보이는 라벨이 없는 표 안에서는 aria-label 로 무엇을 켜는지 알린다. ON/OFF 문구 span 은 aria-hidden 장식이다(라벨과 중복 통지 방지) |
| `aria-busy` | busy=true 이면 aria-busy 로 진행 중임을 알린다 |
| `locking` | disabled 또는 busy 이면 <button disabled> 로 잠근다 — onChange 발화가 네이티브로 차단된다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `trackOn` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `trackOff` | `color.border.default` | `--tds-color-border-default` |
| `knobBorder` | `color.border.default` | `--tds-color-border-default` |
| `knobSurface` | `color.surface.default` | `--tds-color-surface-default` |
| `labelOn` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `labelOff` | `color.text.muted` | `--tds-color-text-muted` |
| `radius` | `radius.full` | `--tds-radius-full` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `gap` | `space.2` | `--tds-space-2` |
| `typography` | `typography.label.sm` | `--tds-typography-label-sm` |
| `transitionDuration` | `motion.duration.fast` | `--tds-motion-duration-fast` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
