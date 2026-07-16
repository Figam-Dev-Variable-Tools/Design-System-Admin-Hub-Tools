<!-- AUTO-GENERATED from contracts/SelectField.contract.json — DO NOT EDIT (pnpm codegen) -->

# SelectField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/SelectField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

드롭다운 컨트롤 — raw <select> 의 무손실 드롭인. 출처: apps/admin/src/shared/ui/SelectField.tsx (소비 63곳: 콘텐츠·회원·권한·마케팅·상품·영업 폼). 네이티브 화살표를 지우고(appearance:none) 토큰 여백을 둔 커스텀 chevron 을 얹어 모든 화면에서 같은 드롭다운을 낸다. 입력(TextField)과 높이·테두리·radius·포커스링을 공유한다.

[네이티브 속성 패스스루 — 계약 prop 이 아니다] 계약 props(isInvalid·children) 외의 표준 <select> 속성(value · defaultValue · onChange · name · id · disabled · ref · aria-* …)은 구현이 <select> 로 그대로 전달한다 (Button/Card 선례). 그래서 raw <select> 의 무손실 드롭인이다 (RHF register spread · 제어형 value 모두 그대로). E2E 가 getByLabel(...).selectOption(...) 로 조작하므로 네이티브 combobox 시맨틱 유지가 계약이다. className/style 은 토큰 규칙 보호를 위해 차단한다. ref 는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField/Alert 선례).

[isInvalid 이름] 오류 상태 boolean 은 naming-guard(boolean-prop) 규칙상 is 접두가 필요하다 — 앱 원안의 invalid 는 Button 의 fullWidth→isFullWidth 와 같은 판정으로 isInvalid 로 좁혔다 (호출부 10곳 동시 이관). aria-invalid 는 이와 별개로 호출부가 네이티브 패스스루로 함께 준다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `atom` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `isInvalid` | `boolean` | `false` | — | `Invalid` | 오류 상태 — 입력의 controlStyle(invalid) 와 같은 붉은(feedback.danger) 테두리를 낸다. 메시지는 감싸는 FormField 가 렌더한다(이 컨트롤은 테두리만 바꾼다) |
| `children` | ReactNode | — | ✅ | — | <option> 들 — 호출부가 넣는다 (raw <select> 와 동일). 커스텀 컴포넌트로 감싸지 않고 그대로 <select> 자식으로 렌더한다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default` · `focus-visible` · `disabled` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `combobox` |
| 키보드 | `Tab`, `ArrowUp`, `ArrowDown`, `Enter`, `Space` |
| focus-visible | 필수 |
| `native-select` | 네이티브 <select> 라 role=combobox·키보드·옵션 목록이 브라우저 기본으로 동작한다 — 커스텀 리스트박스가 아니다 (무손실 드롭인) |
| `native-passthrough` | value/onChange/name/id/disabled/ref/aria-* 는 <select> 로 그대로 전달한다 — 새 prop 을 만들지 않는다 (Button/Card 선례) |
| `aria-invalid` | isInvalid=true 면 <select aria-invalid="true"> 를 렌더해 AT 에 무효를 알린다 (색상만의 red border 금지 — WCAG 1.4.1/3.3.1). 에러 메시지 연결(aria-describedby)은 호출부가 네이티브 패스스루로 준다 (TextField 미러). native 를 마지막에 spread 하므로 호출부가 aria-invalid 를 직접 주면 그 값이 우선한다 |
| `chevron` | 커스텀 chevron 은 pointer-events:none 장식 — aria-hidden. 클릭은 아래 <select> 로 통과한다 |
| `aria-required` | required 는 네이티브 패스스루로 들어오지만 구현이 그것을 받아 <select required aria-required="true"> 로 함께 낸다 — 네이티브→AT 매핑에 기대지 않고 필수 여부를 명시한다 (A11Y-11, TextField 미러). required=false 면 두 속성 모두 부여하지 않는다. native 를 마지막에 spread 하므로 호출부가 aria-required 를 직접 주면 그 값이 우선한다. 감싸는 FormField 가 required 를 받은 경우엔 FormField 가 이 컨트롤에 aria-required 를 주입한다(FormField a11y.aria.required-wiring) — 두 경로 모두 같은 결과로 수렴한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `borderInvalid` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `chevron` | `color.text.muted` | `--tds-color-text-muted` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.2` | `--tds-space-2` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
