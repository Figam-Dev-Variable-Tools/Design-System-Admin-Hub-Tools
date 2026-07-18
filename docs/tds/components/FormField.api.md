<!-- AUTO-GENERATED from contracts/FormField.contract.json — DO NOT EDIT (pnpm codegen) -->

# FormField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/FormField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

라벨 붙은 폼 필드 껍데기 — 라벨(+필수 표식·ⓘ 도움말) · 우측 글자수 카운터 · 컨트롤 슬롯 · 인라인 오류/힌트를 한 골격으로 묶는다. 출처: apps/admin/src/shared/ui/FormField.tsx (소비 45곳: 콘텐츠·회원·상품·마케팅·영업·예약·지원 폼 전반). 이 골격을 페이지마다 손으로 그리면 오류 문구 자리·필수 표식이 화면마다 어긋난다.

[도메인을 모른다] 무슨 필드인지 알지 못한다 — 라벨/오류/힌트 문자열과 자식 컨트롤만 받는다. 컨트롤 자체(input/select/textarea)는 호출부가 children 으로 넣고, 이 껍데기는 label 의 htmlFor 로만 컨트롤과 잇는다.

[오류·힌트 id 파생 — 헬퍼] 오류는 role=alert + 붉은(feedback.danger) 텍스트로 색·시맨틱 이중 전달한다(WCAG 1.4.1). 오류/힌트 <p> 의 id 는 htmlFor 에서 파생한다 — 동반 헬퍼 errorIdOf(htmlFor)·hintIdOf(htmlFor) 를 노출해 호출부가 컨트롤의 aria-describedby 에 물릴 수 있게 한다 (TextField 의 textFieldErrorId 선례). 이 두 헬퍼는 계약 prop 이 아니라 함수로 export 된다.

[의존] 라벨 옆 ⓘ 도움말은 HelpTip(atom) 을 조립해 그린다 (dependencies: HelpTip).

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint·counter)은 호출부가 error={errors.x?.message}(string|undefined)를 그대로 넘긴다. 구현은 계약 타입(?: string)을 그 경계에서 undefined 허용으로 넓혀 받고 빈 문자열/undefined 를 '오류 없음'으로 정규화한다 (TriStateCheckbox.describedBy 의 '' 정규화 선례) — 45곳 호출부 무변경.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 카테고리 | `Forms` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `HelpTip`, `SelectField` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `htmlFor` | `string` | — | ✅ | — | 컨트롤의 id — <label> 의 htmlFor 와 잇는다. 힌트/오류 <p> 의 id 는 여기서 파생한다(errorIdOf·hintIdOf) |
| `label` | `string` | — | ✅ | — | 필드 레이블 텍스트. 시각적으로 노출되며 htmlFor 로 컨트롤의 접근 가능한 이름이 된다 |
| `required` | `boolean` | `false` | — | `Required` | 필수 필드 — 레이블 옆에 붉은 시각 마커(*)를 붙인다. 마커는 aria-hidden 장식이다(라벨 텍스트 오염 방지). 마커만으로는 필수 여부가 AT 에 닿지 않으므로, 구현이 이 값을 **단일 폼 컨트롤 자식의 aria-required 로 주입**한다 (a11y.aria.required-wiring — A11Y-11). 실제 필수 검증은 자식 컨트롤/스키마가 소유한다 |
| `error` | `string` | `""` | — | — | 인라인 오류 메시지. 빈 문자열/미지정이면 오류 없음(힌트를 대신 그린다). 값이 있으면 role=alert 로 오류 <p>(id=errorIdOf(htmlFor))를 그린다. 호출부는 errors.x?.message(string\|undefined)를 그대로 넘긴다 — 구현이 정규화한다 |
| `hint` | `string` | `""` | — | — | 보조 안내 문구. 오류가 없을 때만 힌트 <p>(id=hintIdOf(htmlFor))로 그린다. 빈 문자열/미지정이면 그리지 않는다 |
| `counter` | `string` | `""` | — | — | 우측 상단 글자수 카운터 표시 문자열('12/500' 등). 빈 문자열/미지정이면 그리지 않는다. tabular-nums 로 자릿수 흔들림을 막는다 |
| `help` | ReactNode | `null` | — | — | 라벨 옆 ⓘ 도움말 패널 본문 — 있으면 HelpTip(atom) 을 그려 열면 설명이 펼쳐진다. 미지정이면 도움말을 그리지 않는다 |
| `children` | ReactNode | — | ✅ | — | 폼 컨트롤 슬롯 — input/select/textarea 를 호출부가 넣는다. 이 껍데기는 감싸지 않고 그대로 렌더한다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `group` |
| 키보드 | `none — 껍데기 자체는 포커스 대상이 아니다. 자식 컨트롤이 탭 순서를 갖는다` |
| focus-visible | 해당 없음 |
| `no-container-role` | 컨테이너(<div>) 자체엔 ARIA role 을 부여하지 않는다 — 접근성은 label(htmlFor)·오류(role=alert)·describedBy 파생 id 로 잇는다 |
| `role-alert` | 오류 <p> 는 role=alert 로 스크린리더에 즉시 알린다. 색만으로 전달하지 않고 메시지 텍스트를 함께 그린다 (WCAG 1.4.1) |
| `describedBy` | 오류 <p> id=errorIdOf(htmlFor), 힌트 <p> id=hintIdOf(htmlFor) — 호출부가 이 id 를 자식 컨트롤의 aria-describedby 에 물린다 (헬퍼 함수로 노출) |
| `required-mark` | 필수 마커(*)는 aria-hidden 장식 — 라벨 textContent(=접근 가능한 이름)를 오염시키지 않는다 |
| `required-wiring` | 마커가 aria-hidden 이라 required 는 그 자체로 AT 에 닿지 않는다. 그래서 required=true 이면 구현이 **자식 컨트롤에 aria-required=true 를 주입**한다 (A11Y-11 acceptanceCheck: 'required input 이 aria-required 노출'). 주입 대상은 단일 자식이면서 (a) 네이티브 폼 컨트롤(input/select/textarea) 이거나 (b) native 속성을 컨트롤로 패스스루하는 DS 컨트롤(SelectField) 일 때뿐이다 — 래퍼 <div>/표시 전용 <p>/비-컨트롤 컴포넌트에 얹으면 거짓 시맨틱이 되므로 건너뛴다. 호출부가 aria-required 를 명시하면 그 값이 우선한다(override). 이 배선 덕에 호출부(입력을 직접 넣는 폼 150여 곳)는 무변경으로 필수 시맨틱을 얻는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `labelText` | `color.text.default` | `--tds-color-text-default` |
| `labelTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `requiredMark` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `hintText` | `color.text.muted` | `--tds-color-text-muted` |
| `hintTypography` | `typography.caption.md` | `--tds-typography-caption-md` |
| `counterText` | `color.text.muted` | `--tds-color-text-muted` |
| `errorText` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `errorTypography` | `typography.caption.md` | `--tds-typography-caption-md` |
| `errorWeight` | `primitive.typography.font-weight.bold` | `--tds-primitive-typography-font-weight-bold` |
| `fieldGap` | `space.1` | `--tds-space-1` |
| `rowGap` | `space.2` | `--tds-space-2` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
