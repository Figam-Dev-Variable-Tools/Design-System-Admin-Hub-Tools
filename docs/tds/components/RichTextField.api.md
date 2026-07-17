<!-- AUTO-GENERATED from contracts/RichTextField.contract.json — DO NOT EDIT (pnpm codegen) -->

# RichTextField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/RichTextField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

서식 있는 본문 입력 필드 — Tiptap(headless) WYSIWYG 을 FormField 껍데기 안에 담는다. TextareaField 계약(v1.1.0)이 예고한 '서식 본문' 경로다: 그 계약은 '[리치 텍스트 아님] … WYSIWYG 미도입 — ADR 사안. 서식 본문이 요구되면 내부만 에디터로 바꾸고 value/onChange 계약은 유지한다' 고 적었다. TextareaField 는 소비 30곳이라 그 자리에서 바꾸면 30곳이 함께 흔들린다 — 그래서 형제 컴포넌트로 낸다. value/onChange(string) 계약은 그대로 미러하므로 호출부는 필드만 갈아끼우면 된다.

[value 는 sanitize 된 HTML 이다] TextareaField 의 value 는 평문이고 이 필드의 value 는 HTML 이다 — 그것이 유일한 계약 차이다. onChange 로 나가는 값은 **이미 sanitize 된 HTML** 이다(저장 지점). 렌더 지점(dangerouslySetInnerHTML)에서도 다시 sanitize 한다 — 저장된 값이 신뢰 경로를 거쳤다고 가정하지 않는다(과거 값·수기 편집·다른 클라이언트). sanitizeRichText 순수 함수를 함께 내보내 호출부가 같은 허용목록을 쓰게 한다.

[허용목록 방식] 태그·속성 allowlist(차단목록 아님) + URI 스킴 제한. script/style/iframe/on* 은 물론 허용목록에 없는 모든 것이 사라진다.

[maxLength 는 평문 길이다] HTML 마크업이 아니라 사람이 보는 텍스트 길이를 센다 — '<p>가</p>' 는 7자가 아니라 1자다. 마크업을 세면 굵게 한 번에 카운터가 튄다. richTextLength 순수 함수를 함께 내보낸다.

[에디터는 지연 로드된다] Tiptap(ProseMirror)은 무겁다. 이 컴포넌트는 가벼운 껍데기이고 에디터 본체는 React.lazy 로 분할된다 — 이 필드를 쓰지 않는 화면은 Tiptap 을 내려받지 않는다. 로드 전에는 스켈레톤을 그린다.

[이미지: 업로드하지 않는다] 툴바 이미지 버튼은 ImageUploadField 와 **같은 심**을 쓴다 — URL.createObjectURL 로 만든 blob: 미리보기 핸들을 삽입할 뿐 아무것도 업로드하지 않는다(TODO(backend): POST /api/uploads). 가짜 업로드 성공을 지어내지 않는다. 그래서 sanitize 는 blob: 을 img 경로에서 허용한다 — 허용하지 않으면 방금 넣은 이미지가 sanitize 에 지워져 더 나쁜 거짓말이 된다.

[도메인을 모른다] 무슨 본문인지 알지 못한다 — label/value/onChange/maxLength 만 받는다.

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint·placeholder)은 호출부가 string|undefined 를 그대로 넘긴다 — 구현이 경계에서 undefined 를 허용해 받고 정규화한다 (TextareaField 와 동일 처리).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `FormField` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 필드 레이블 — FormField 로 내려보낸다 |
| `value` | `string` | — | ✅ | — | 제어 컴포넌트 입력값 — **sanitize 된 HTML 문자열**. 에디터에 넣기 전에 다시 sanitize 한다(저장된 값을 신뢰하지 않는다) |
| `maxLength` | `number` | — | ✅ | — | 최대 **평문** 길이 — 카운터('N/max')의 분모. HTML 마크업 길이가 아니라 richTextLength(value) 를 센다 |
| `required` | `boolean` | `false` | — | `Required` | 필수 필드 — FormField 로 내려보내 레이블에 마커(*)를 그리고, 편집 영역에 aria-required 를 함께 잇는다 (마커는 aria-hidden 장식이라 그것만으로는 AT 에 닿지 않는다 — A11Y-11 · TextareaField 미러) |
| `disabled` | `boolean` | `false` | — | `Disabled` | 비활성 — 에디터를 non-editable 로 두고 툴바 버튼을 native disabled 로 막는다. onChange 발화도 차단한다(blockedWhen) |
| `error` | `string` | `""` | — | — | 인라인 오류 메시지 — FormField 로 내려보낸다. 값이 있으면 aria-invalid=true + aria-describedby=errorIdOf(id). 빈 문자열/미지정이면 오류 없음 |
| `hint` | `string` | `""` | — | — | 보조 안내 — FormField 로 내려보낸다. 오류가 없을 때만 그리고, 그때 aria-describedby=hintIdOf(id) |
| `placeholder` | `string` | `""` | — | — | 본문이 비었을 때 편집 영역에 그리는 보조 예시 텍스트 |
| `rows` | `number` | `6` | — | — | 편집 영역 최소 표시 행 수 — 최소 높이를 space 토큰 배수로 환산한다(TextareaField 의 rows 미러) |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `string` | `disabled` | 본문 변경 — 이벤트가 아니라 **sanitize 된 새 HTML 문자열**을 넘긴다. disabled 에서는 발화 금지 |

## States

`default` · `focus-visible` · `disabled` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `textbox` |
| 키보드 | `Tab`, `Shift+Tab`, `Mod+B`, `Mod+I`, `Arrow keys` |
| focus-visible | 필수 |
| `multiline` | 편집 영역은 contenteditable 이라 브라우저가 role=textbox(multiline) 로 노출한다 — ProseMirror 가 aria-multiline 을 붙인다 |
| `toolbar` | 툴바는 role=toolbar + aria-label. 각 버튼은 aria-pressed 로 현재 서식 상태(굵게 켜짐 등)를 알린다 — 시각 강조만으로는 AT 에 닿지 않는다 |
| `aria-invalid` | error 가 빈 문자열이 아닐 때 편집 영역에 true |
| `aria-describedby` | 오류가 있으면 errorIdOf(id), 없고 힌트가 있으면 hintIdOf(id) — FormField 가 그 id 로 <p> 를 그린다 |
| `aria-required` | required=true 이면 편집 영역에 aria-required="true" (contenteditable 은 native required 가 없다 — TextareaField 는 native required 를 함께 쓰지만 여기서는 ARIA 경로만 존재한다) |
| `aria-busy` | 에디터 청크 지연 로드 중 스켈레톤에 aria-busy="true" |
| `disabled` | contenteditable=false + 툴바 버튼 native disabled — 브라우저 기본으로 입력·포커스가 막힌다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `toolbarSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `textMuted` | `color.text.muted` | `--tds-color-text-muted` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `borderInvalid` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `activeSurface` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `activeText` | `color.text.on-primary` | `--tds-color-text-on-primary` |
| `disabledSurface` | `color.surface.disabled` | `--tds-color-surface-disabled` |
| `disabledText` | `color.text.disabled` | `--tds-color-text-disabled` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.2` | `--tds-space-2` |
| `gap` | `space.1` | `--tds-space-1` |
| `typography` | `typography.body.md` | `--tds-typography-body-md` |
| `labelTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `minHeight` | `space.6` | `--tds-space-6` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
