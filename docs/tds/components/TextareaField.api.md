<!-- AUTO-GENERATED from contracts/TextareaField.contract.json — DO NOT EDIT (pnpm codegen) -->

# TextareaField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/TextareaField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

제어 textarea + 글자수 카운터 — 긴 글 입력('공지 본문·FAQ 답변·약관 조문·상품 설명' 등)을 FormField 껍데기 안에 담는다. 출처: apps/admin/src/shared/ui/TextareaField.tsx (소비 30곳). 네 화면이 각자 textarea + 카운터 + 검증 배선을 복사하면 최대 길이·오류 자리·카운터 형식이 어긋난다 — 한 벌만 둔다.

[FormField 조립] 라벨/오류/힌트/필수 표식과 우측 카운터('N/max')는 FormField(molecule) 에 위임한다 (dependencies: FormField). 이 컴포넌트는 그 슬롯 안에 제어 <textarea> 를 넣고, htmlFor 로 라벨과 잇고, aria-invalid·aria-describedby(errorIdOf/hintIdOf)로 접근성을 배선한다. id 는 useId 로 생성한다.

[리치 텍스트 아님] 지금은 제어된 <textarea> 로만 본문을 받는다(WYSIWYG 미도입 — ADR 사안). 서식 본문이 요구되면 내부만 에디터로 바꾸고 value/onChange 계약은 유지한다.

[도메인을 모른다] 무슨 본문인지 알지 못한다 — value/onChange/maxLength 와 라벨 문자열만 받는다.

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint·placeholder)은 호출부가 string|undefined 를 그대로 넘긴다 — 구현이 경계에서 undefined 를 허용해 받고 정규화한다 (FormField 와 동일 처리, 30곳 호출부 무변경).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `FormField` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 필드 레이블 — FormField 로 내려보낸다 |
| `value` | `string` | — | ✅ | — | 제어 컴포넌트 입력값. 카운터('value.length/maxLength')의 분자도 이 길이에서 나온다 |
| `maxLength` | `number` | — | ✅ | — | 최대 길이 — native maxLength 와 카운터 분모('N/max')를 함께 정한다 |
| `required` | `boolean` | `false` | — | `Required` | 필수 필드 — FormField 로 내려보내 레이블에 마커(*)를 그리고, **동시에 <textarea> 자신에게 native required + aria-required 로 잇는다** (마커는 aria-hidden 장식이라 그것만으로는 AT 에 닿지 않는다 — A11Y-11) |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성 — native disabled 로 입력을 막는다. onChange 발화도 차단한다(blockedWhen) |
| `error` | `string` | `""` | — | — | 인라인 오류 메시지 — FormField 로 내려보낸다. 값이 있으면 aria-invalid=true + aria-describedby=errorIdOf(id). 빈 문자열/미지정이면 오류 없음 |
| `hint` | `string` | `""` | — | — | 보조 안내 — FormField 로 내려보낸다. 오류가 없을 때만 그리고, 그때 aria-describedby=hintIdOf(id) |
| `placeholder` | `string` | `""` | — | — | 보조 예시 텍스트. 빈 문자열/미지정이면 속성을 부여하지 않는다 |
| `rows` | `number` | `8` | — | — | textarea 표시 행 수(native rows). 최소 높이는 별도로 토큰 배수로도 보장한다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `string` | `disabled` | 입력값 변경 — 이벤트가 아니라 새 문자열(event.target.value)을 그대로 넘긴다. disabled 에서는 발화 금지(내부 가드 + native disabled 이중 차단) |

## States

`default` · `focus-visible` · `disabled` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `textbox` |
| 키보드 | `Tab`, `Shift+Tab` |
| focus-visible | 필수 |
| `multiline` | 네이티브 <textarea> 라 role=textbox(multiline) 가 브라우저 기본으로 동작한다 |
| `aria-invalid` | error 가 빈 문자열이 아닐 때 true |
| `aria-describedby` | 오류가 있으면 errorIdOf(id), 없고 힌트가 있으면 hintIdOf(id) — FormField 가 그 id 로 <p> 를 그린다 |
| `native-disabled` | disabled 는 native 속성으로 반영 — 입력·포커스가 브라우저 기본으로 막힌다 |
| `aria-required` | required=true 이면 <textarea> 에 native required + aria-required="true" 를 함께 낸다 (TextField 미러). FormField 의 마커(*)는 aria-hidden 장식이라 시각 경로일 뿐 — 필수 여부의 AT 경로는 이 속성이다 (A11Y-11). required=false 면 두 속성 모두 부여하지 않는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `borderInvalid` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.2` | `--tds-space-2` |
| `fontSize` | `typography.label.md` | `--tds-typography-label-md` |
| `typography` | `typography.body.md` | `--tds-typography-body-md` |
| `minHeight` | `space.6` | `--tds-space-6` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
