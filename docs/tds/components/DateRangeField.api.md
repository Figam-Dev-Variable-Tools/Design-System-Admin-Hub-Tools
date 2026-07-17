<!-- AUTO-GENERATED from contracts/DateRangeField.contract.json — DO NOT EDIT (pnpm codegen) -->

# DateRangeField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/DateRangeField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

노출 기간(시작~종료) 입력 — 날짜 입력 두 칸을 '~' 로 잇고 아래에 인라인 오류/힌트를 그린다. 출처: apps/admin/src/shared/ui/DateRangeField.tsx (소비 9곳: 팝업·배너·이벤트·프로모션·쿠폰·계약·프로젝트·견적). 두 화면이 각자 날짜 두 칸 + 종료≥시작 오류 자리를 복사하면 배치·오류 문구가 어긋난다 — 한 벌만 둔다.

[검증은 스키마가] 종료≥시작 같은 규칙은 이 컴포넌트가 판정하지 않는다 — 호출부의 zod 스키마가 판정해 error 로 내려준다(검증 정본은 스키마). 이 컴포넌트는 error 문자열을 role=alert 로 주입해 그릴 뿐이다.

[라벨 구조] 그룹 라벨(<span>)은 두 칸 위에 한 번 그리고, 각 날짜 입력에는 visually-hidden <label>('… 시작일'·'… 종료일')을 htmlFor 로 붙여 스크린리더가 두 칸을 구분하게 한다. id 는 useId 로 각각 생성한다.

[도메인을 모른다] 무엇의 기간인지 알지 못한다 — 시작/종료 값·콜백과 라벨/오류/힌트만 받는다.

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint)은 호출부가 string|undefined 를 그대로 넘긴다 — 구현이 경계에서 undefined 를 허용해 받고 정규화한다 (9곳 호출부 무변경).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 그룹 라벨 텍스트 — 두 날짜 칸 위에 한 번 그린다. 각 칸의 숨김 라벨('label 시작일'·'label 종료일')도 여기서 파생한다 |
| `startValue` | `string` | — | ✅ | — | 시작일 제어값 (YYYY-MM-DD) |
| `endValue` | `string` | — | ✅ | — | 종료일 제어값 (YYYY-MM-DD) |
| `required` | `boolean` | `false` | — | `Required` | 필수 필드 — 그룹 라벨 옆에 aria-hidden 마커(*)를 붙이고, **두 날짜 입력 각각에 native required + aria-required 를 낸다** (범위는 시작·종료가 함께 있어야 성립한다). 마커만으로는 AT 에 닿지 않는다 — A11Y-11 |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성 — 두 날짜 입력을 native disabled 로 함께 막는다 |
| `error` | `string` | `""` | — | — | 인라인 오류 메시지(종료≥시작 위반 등). 값이 있으면 role=alert 로 오류 <p> 를 그리고 두 입력에 aria-invalid=true 를 준다. 빈 문자열/미지정이면 오류 없음 |
| `hint` | `string` | `""` | — | — | 보조 안내 — 오류가 없을 때만 그린다. 빈 문자열/미지정이면 그리지 않는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onStartChange` | `string` | — | 시작일 변경 — 새 문자열(event.target.value)을 넘긴다 |
| `onEndChange` | `string` | — | 종료일 변경 — 새 문자열(event.target.value)을 넘긴다 |

## States

`default` · `focus-visible` · `disabled` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `group` |
| 키보드 | `Tab`, `Shift+Tab` |
| focus-visible | 필수 |
| `group-label` | 그룹 라벨(<span>)은 두 칸 위에 한 번. 각 날짜 입력엔 visually-hidden <label>(htmlFor)로 '시작일'·'종료일'을 구분해 준다 |
| `role-alert` | 오류 <p> 는 role=alert 로 즉시 알린다. 색만으로 전달하지 않고 메시지 텍스트를 함께 그린다 |
| `aria-invalid` | error 가 빈 문자열이 아닐 때 두 입력 모두 aria-invalid=true 이며, **항상** aria-describedby 로 오류 <p> id 를 함께 가리킨다 (describedby 없는 aria-invalid 금지 — A11Y-11). 유효할 때는 두 속성 모두 부여하지 않는다 |
| `native-disabled` | disabled 는 두 입력에 native 속성으로 반영된다 |
| `aria-required` | required=true 이면 두 입력 **모두** native required + aria-required="true" 를 받는다 — 범위는 시작·종료가 함께 있어야 성립하므로 각 칸에 참이다. 그룹 라벨의 마커(*)는 aria-hidden 장식이라 시각 경로일 뿐이다 (A11Y-11). required=false 면 두 속성 모두 부여하지 않는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `borderInvalid` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `labelText` | `color.text.default` | `--tds-color-text-default` |
| `labelTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `tilde` | `color.text.muted` | `--tds-color-text-muted` |
| `hintText` | `color.text.muted` | `--tds-color-text-muted` |
| `errorText` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.2` | `--tds-space-2` |
| `rowGap` | `space.2` | `--tds-space-2` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
