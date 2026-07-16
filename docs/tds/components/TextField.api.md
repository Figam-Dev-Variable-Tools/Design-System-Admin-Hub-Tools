<!-- AUTO-GENERATED from contracts/TextField.contract.json — DO NOT EDIT (pnpm codegen) -->

# TextField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/TextField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

라벨 + 단일행 입력 + 인라인 에러 메시지. 출처: apps/admin/src/pages/login/components/TextField.tsx. 값과 콜백만 받는 제어 컴포넌트다 — 유효성 규칙·상태 머신·API 는 소유하지 않는다. 에러가 있으면 aria-invalid=true 와 aria-describedby="{id}-error" 로 메시지를 연결한다.

[ref] input 요소 참조는 계약 prop 이 아니라 forwardRef 로 노출한다 (제출 실패 시 첫 오류 필드로 포커스를 옮기는 데 필요 — LoginPage). ref 는 Figma/Storybook 대응이 없고, 스키마의 slot 타입은 ReactNode 를 생성하므로 RefObject 를 담을 수 없다. 구현: forwardRef<HTMLInputElement, TextFieldProps & NativeInputProps>.

[네이티브 속성 패스스루] 계약 props 외의 표준 input 속성은 구현이 <input> 으로 전달한다 (Card 선례). 단 폼 동작에 직접 관여하는 name · autoComplete · inputMode 는 호출부가 반드시 쓰는 표면이라 계약에 명시한다 (id · placeholder 선례와 동일).

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
| `id` | `string` | — | ✅ | — | input 의 id. label htmlFor 및 에러 메시지 id(`{id}-error`)의 기준 |
| `label` | `string` | — | ✅ | — | 가시 라벨. <label htmlFor={id}> 로 렌더 — placeholder 로 대체 금지 |
| `value` | `string` | — | ✅ | — | 제어 값. onChange 와 항상 짝을 이룬다 |
| `type` | `'text'` \| `'email'` \| `'password'` \| `'number'` | `"text"` | — | `Type` | input type |
| `error` | `string` | `""` | — | — | 위반 메시지. 빈 문자열이면 정상 상태 — 비어있지 않으면 error 상태(테두리 danger + 메시지 렌더 + aria-invalid) |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성. native disabled 속성 — onBlur/onChange 발화 없음 |
| `required` | `boolean` | `false` | — | `Required` | 필수 입력. native required + aria-required 로 노출한다 (a11y.aria.aria-required). **라벨에 시각 마커(*)를 주입하지 않는다** — <label> 의 textContent 가 곧 접근 가능한 이름이므로 마커를 넣으면 이름이 "이메일*" 이 되어 getByLabel/getByLabelText 정확일치 셀렉터가 깨지고(E2E FS-001), 오너 확정 로그인 화면에 없던 표식이 새로 나타난다. 표식이 필요한 화면이 실제로 생기면 그때 실호출부와 함께 prop 을 추가한다 (마커가 필요한 폼은 FormField 껍데기가 그린다 — 그쪽은 마커를 <label> 밖 <span aria-hidden> 으로 두어 이름을 오염시키지 않는다) |
| `placeholder` | `string` | `""` | — | — | 보조 예시 텍스트. 라벨을 대체하지 않는다 |
| `name` | `string` | `""` | — | — | 폼 제출 키이자 브라우저 자동완성·비밀번호 관리자의 필드 판정 근거. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="email") |
| `autoComplete` | `string` | `""` | — | — | 브라우저 자동완성 힌트 (username · email · current-password …). 빈 문자열이면 속성을 부여하지 않는다. **없으면 자격증명 자동완성이 퇴행한다** — 기능 손실이지 장식이 아니다. 실사용: LoginForm(autoComplete="username") |
| `inputMode` | `string` | `""` | — | — | 모바일 소프트 키보드 힌트 (email · numeric · tel …). 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(inputMode="email") |
| `trailing` | ReactNode (허용: Button, Icon) | `null` | — | — | 입력 오른쪽에 겹쳐 놓는 요소(비밀번호 표시 토글 등). 있으면 입력의 오른쪽 여백을 넓혀 텍스트와 겹치지 않게 한다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `ChangeEvent<HTMLInputElement>` | — | 입력 변경. 제어 컴포넌트이므로 필수 — 부모가 value 를 갱신한다 |
| `onBlur` | `FocusEvent<HTMLInputElement>` | `disabled` | 포커스 이탈(주로 blur-시점 유효성 검사 트리거). disabled 에서는 발화 금지 — Storybook Play Function 이 전수 검증 |

## States

`default` · `hover` · `focus-visible` · `disabled` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `textbox` |
| 키보드 | `Tab`, `Shift+Tab`, `텍스트 편집 키(문자·Backspace·Delete·화살표)` |
| focus-visible | 필수 |
| `aria-invalid` | error 가 비어있지 않으면 true — 항상 aria-describedby 와 짝을 이룬다 (aria-invalid without describedby 금지, A11Y-11) |
| `aria-describedby` | error 가 비어있지 않으면 `{id}-error` (에러 메시지 요소의 id) 를 가리킨다 |
| `error-alert` | 에러 메시지 `<p>` 는 role="alert" 를 가진다 — 이미 포커스된 필드에 on-blur/변경으로 나타나는 에러도 announce 된다 (FormField/ImageUploadField 와 일치, A11Y-10) |
| `aria-required` | required=true 이면 native required 속성 **과 aria-required="true" 를 함께** 낸다. native required 만으로는 <form noValidate> 아래에서, 그리고 네이티브→AT 매핑에 기대는 만큼, 필수 여부가 확실히 노출된다고 보장할 수 없다 — 명시 속성으로 못 박는다 (A11Y-11 acceptanceCheck: 'required input 이 aria-required 노출'). required=false 면 두 속성 모두 부여하지 않는다 (aria-required="false" 를 남기지 않는다 — aria-invalid 선례) |
| `label` | 가시 라벨을 htmlFor={id} 로 연결한다 — placeholder 만으로 라벨을 대신하지 않는다 |
| `accessible-name` | <label> 의 textContent = input 의 접근 가능한 이름이다. 라벨 안에 마커·배지·카운터 등 부가 텍스트를 넣지 않는다 (aria-hidden 을 붙여도 Testing Library/Playwright 의 라벨 텍스트 수집은 textContent 기반이라 이름이 오염된다) |
| `error-color` | 에러는 색상만으로 전달하지 않는다 (WCAG 1.4.1) — 텍스트 메시지를 함께 렌더한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `background` | `color.surface.default` | `--tds-color-surface-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `textDisabled` | `color.text.disabled` | `--tds-color-text-disabled` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `borderError` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `errorText` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `focusRingOffset` | `space.1` | `--tds-space-1` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.3` | `--tds-space-3` |
| `gap` | `space.1` | `--tds-space-1` |
| `labelTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `inputTypography` | `typography.body.md` | `--tds-typography-body-md` |
| `errorTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `trailingInset` | `space.9` | `--tds-space-9` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
