<!-- AUTO-GENERATED from contracts/PasswordField.contract.json — DO NOT EDIT (pnpm codegen) -->

# PasswordField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/PasswordField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

비밀번호 입력 필드 — TextField + 표시/숨김 토글 버튼. 표시/숨김은 순수 표현 관심사이므로 이 컴포넌트가 소유하되(폼 상태로 끌어올리지 않는다), 계약상 revealed 는 제어 가능한 prop 으로 노출한다. 토글 전환 시 입력값·커서 위치를 유지한다. 출처 구현: apps/admin/src/pages/login/components/PasswordField.tsx

[ref] input 참조는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField 와 동일 판정 — 현행 구현이 커서 복원을 위해 내부 ref 를 이미 갖고 있으므로 그것을 그대로 전달한다). 호출부가 document.getElementById(id) 로 DOM 을 더듬는 우회를 없앤다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |
| 의존 컴포넌트 | `TextField` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `id` | `string` | — | ✅ | — | input 의 id. label 의 htmlFor 및 토글 버튼의 aria-controls 가 참조한다 |
| `label` | `string` | — | ✅ | — | 필드 레이블. 시각적으로 노출되며 input 의 접근 가능한 이름이 된다 |
| `value` | `string` | — | ✅ | — | 제어 컴포넌트 입력값 |
| `error` | `string` | `""` | — | — | 인라인 에러 메시지. 빈 문자열이면 에러 없음 — 값이 있으면 aria-invalid + aria-describedby 연결 |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성. 입력·토글 모두 차단 + aria-disabled |
| `required` | `boolean` | `false` | — | `Required` | 필수 입력. native required 속성 → aria-required. **레이블에 시각 마커(*)를 주입하지 않는다** — 이 문장의 이전 판("레이블에 필수 표식")은 오기(erratum)였다. TextField.required 와 동일 판정: 라벨 textContent = 접근 가능한 이름이며, 마커는 getByLabel 정확일치를 깨고 오너 확정 로그인 화면에 없던 표식을 만든다 |
| `name` | `string` | `""` | — | — | 폼 제출 키이자 비밀번호 관리자의 필드 판정 근거. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="password") |
| `autoComplete` | `string` | `""` | — | — | 브라우저 자동완성 힌트 (current-password · new-password). **없으면 비밀번호 관리자 채우기가 퇴행한다.** 실사용: LoginForm(autoComplete="current-password") |
| `placeholder` | `string` | `""` | — | — | 보조 예시 텍스트. TextField 에는 있으나 PasswordField 가 전달하지 않아 끊겨 있던 표면이다 — 자식 TextField 로 그대로 내려보낸다 |
| `revealed` | `boolean` | `false` | — | `Revealed` | 표시/숨김 상태. true 면 input type=text(평문) + 눈 감김 아이콘, false 면 type=password + 눈 아이콘 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `ChangeEvent<HTMLInputElement>` | `disabled` | 입력값 변경 |
| `onBlur` | `FocusEvent<HTMLInputElement>` | `disabled` | 포커스 이탈 — 폼 검증 트리거 지점. disabled 에서는 발화 금지 (자식 TextField 의 가드로 실제 차단된다 — CR-2026-0715-003 실측). 계약이 현실보다 약했던 부분의 정정이며, 이 보장을 고정하는 테스트는 A30 이 채운다 |
| `onToggleReveal` | `MouseEvent` | `disabled` | 표시/숨김 토글 버튼 클릭. disabled 에서는 발화 금지 — Storybook Play Function이 전수 검증 |

## States

`default` · `hover` · `focus-visible` · `disabled` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `textbox` |
| 키보드 | `Tab`, `Enter`, `Space` |
| focus-visible | 필수 |
| aria-disabled | when disabled |
| `aria-invalid` | error 가 빈 문자열이 아닐 때 true |
| `aria-describedby` | error 가 있을 때 에러 메시지 요소 id |
| `aria-required` | required 일 때 true |
| `aria-pressed` | 토글 버튼 — revealed 값 |
| `aria-controls` | 토글 버튼 — input 의 id |
| `aria-label` | 토글 버튼 — revealed 에 따라 '비밀번호 숨기기' / '비밀번호 표시' |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `background` | `color.surface.default` | `--tds-color-surface-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `borderFocus` | `color.border.focus` | `--tds-color-border-focus` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `textDisabled` | `color.text.disabled` | `--tds-color-text-disabled` |
| `labelTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `inputTypography` | `typography.body.md` | `--tds-typography-body-md` |
| `errorText` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `errorBorder` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `gap` | `space.2` | `--tds-space-2` |
| `toggleIcon` | `color.text.muted` | `--tds-color-text-muted` |
| `toggleRadius` | `radius.sm` | `--tds-radius-sm` |
| `togglePadding` | `space.1` | `--tds-space-1` |
| `toggleOffset` | `space.2` | `--tds-space-2` |
| `transitionDuration` | `motion.duration.fast` | `--tds-motion-duration-fast` |
| `transitionEasing` | `motion.easing.standard` | `--tds-motion-easing-standard` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
