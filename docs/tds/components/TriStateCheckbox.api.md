<!-- AUTO-GENERATED from contracts/TriStateCheckbox.contract.json — DO NOT EDIT (pnpm codegen) -->

# TriStateCheckbox API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/TriStateCheckbox.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

3상태 체크박스 — on/off/mixed. 출처: apps/admin/src/shared/ui/TriStateCheckbox.tsx (소비: 권한 매트릭스의 부모(그룹) 행·열·마스터 전체선택, 목록 표의 전체선택 헤더(TableSelection)). 도메인을 모른다 — checked/indeterminate 두 플래그와 콜백·접근성 라벨만 받는다. 동반 헬퍼 triStateProps(state: 'on'|'off'|'mixed') → {checked, indeterminate} 로 모델의 3상태를 props 로 옮긴다.

[indeterminate 는 DOM 프로퍼티다] HTML 속성이 아니라 DOM 프로퍼티라 ref 로만 설정할 수 있다 — 구현은 useEffect 로 ref.current.indeterminate 를 쓴다. aria-checked="mixed" 로 스크린리더에 부분 선택을 알린다 (손복사 체크박스가 빠뜨렸던 결함을 이 공통 컴포넌트가 회복한다).

[접근성 이름] 보이는 라벨이 없는 자리(매트릭스 칸·표 헤더)에서는 labelledBy 로 숨긴 라벨을, 없으면 label 로 이름을 준다. 비활성 사유는 describedBy 로 잇는다. 빈 문자열이면 해당 aria 속성을 부여하지 않는다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `atom` |
| 카테고리 | `Inputs` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `checked` | `boolean` | — | ✅ | `Checked` | 체크 상태 (모델의 'on'). 제어 값 — onChange 로만 바뀐다 |
| `indeterminate` | `boolean` | — | ✅ | `Indeterminate` | 부분 선택('mixed') — checked 보다 우선해 표시된다. HTML 속성이 아니라 DOM 프로퍼티라 ref 로만 설정되며 aria-checked="mixed" 로 노출된다 |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성 — native disabled. onChange 발화 없음. disabled 이면 indeterminate 표시도 끈다(잠긴 시스템 역할 등) |
| `id` | `string` | `""` | — | — | input 의 id — 감싸는 <label> 이 htmlFor 로 가리킬 때 쓴다. 빈 문자열이면 부여하지 않는다 |
| `labelledBy` | `string` | `""` | — | — | 라벨 요소의 id (aria-labelledby) — 보이는 텍스트가 있으면 이걸 쓴다. 빈 문자열이면 부여하지 않는다 |
| `label` | `string` | `""` | — | — | 접근 가능한 이름(aria-label) — 보이는 라벨이 없을 때만 쓴다('{리소스명} {액션명}'). 빈 문자열이면 부여하지 않는다 |
| `describedBy` | `string` | `""` | — | — | 비활성 사유 문구의 id (aria-describedby) — 잠긴 시스템 역할 안내 등. 빈 문자열이면 부여하지 않는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `boolean` | `disabled` | 다음 체크 상태를 인자로 발화한다. disabled 에서는 발화 금지 — native disabled 가 막는다 (Storybook Play Function 이 전수 검증) |

## States

`default` · `focus-visible` · `disabled` · `checked` · `indeterminate`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `checkbox` |
| 키보드 | `Space`, `Tab`, `Shift+Tab` |
| focus-visible | 필수 |
| `aria-checked` | indeterminate && !checked → aria-checked="mixed", 그 외에는 checked 값. 부분 선택을 스크린리더에 알린다 |
| `indeterminate-dom-property` | indeterminate 는 HTML 속성이 아니라 DOM 프로퍼티다 — ref 로만 설정한다 (useEffect). disabled 이면 표시를 끈다 |
| `naming` | labelledBy(aria-labelledby) 우선, 없으면 label(aria-label). 비활성 사유는 describedBy(aria-describedby). 빈 문자열이면 부여하지 않는다 |
| `blocked` | disabled 이면 native disabled 로 onChange 를 막는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `control` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `size` | `space.4` | `--tds-space-4` |
| `radius` | `radius.sm` | `--tds-radius-sm` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
