<!-- AUTO-GENERATED from contracts/ImageUploadField.contract.json — DO NOT EDIT (pnpm codegen) -->

# ImageUploadField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ImageUploadField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

이미지 업로드 필드 — 드래그드롭 + 클릭 선택으로 이미지 1장을 올린다. 값(value)은 이미지 URL 문자열이다(mock 은 URL.createObjectURL, 백엔드가 붙으면 업로드 응답 URL). 도메인을 모른다 — 무슨 이미지인지 알지 못하고 label/value/onChange 와 힌트만 받는다 (ADR-0003).

[손코딩 유지] react-dropzone 은 오너 검토로 기각됐다 — 드래그오버/드롭/키보드(Enter·Space)로 파일 선택을 여는 드롭존 버튼을 직접 만든다. 파일 input 은 시각적으로 숨긴 트리거일 뿐이다.
[검증] 이미지 타입(image/*)·용량 상한(maxSizeMB, 기본 5MB)을 클라이언트에서 막고 인라인 오류로 알린다(imageFileError 순수 함수 공유).
[placeholder] 미선택/로드 실패면 이미지 아이콘 placeholder(장식 — aria-hidden). 값이 있으면 미리보기 이미지 + 교체/제거.
[누수 방지] 만든 object URL 은 교체/제거/언마운트 시 revokeObjectURL 한다(외부 URL 은 건드리지 않는다).

[imperative/경계] onChange 는 새 URL 문자열을 넘기는 값 콜백이다. error/hint 는 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 카테고리 | `Inputs` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 필드 라벨 — 드롭존의 접근 가능한 이름과 미리보기 alt 의 기준 |
| `value` | `string` | — | ✅ | — | 현재 이미지 URL (object URL · data URL · 업로드 응답 URL). 빈 문자열이면 미등록 |
| `required` | `boolean` | `false` | — | `Required` | 필수 표식(*)을 라벨에 붙인다 (장식 — aria-hidden). 실제 필수 검증은 호출부 스키마의 몫 |
| `disabled` | `boolean` | `false` | — | `Disabled` | 드롭존/교체/제거를 비활성한다 |
| `error` | `string` | `""` | — | — | 스키마가 내려주는 오류 — 로컬 검증 오류(타입·용량)보다 우선. 비어 있지 않으면 드롭존이 danger 테두리 + role=alert 인라인 오류를 그린다 |
| `hint` | `string` | `""` | — | — | 도움말 문구 — 오류가 없을 때만 표시된다 |
| `maxSizeMB` | `number` | `5` | — | — | 파일 용량 상한(MB). 초과하면 인라인 오류로 막는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `string` | — | 이미지가 바뀌면 새 URL 문자열을 넘긴다. 제거하면 빈 문자열('')을 넘긴다 — 네이티브 이벤트가 아니라 값 콜백이다 |

## States

`default` · `error` · `disabled`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `button` |
| 키보드 | `Enter`, `Space`, `Tab` |
| focus-visible | 필수 |
| `dropzone` | 드롭존은 <button> — 접근 가능한 이름을 aria-label 로 준다. Enter/Space 로 파일 선택을 연다 |
| `file-input` | 실제 <input type=file> 은 시각적으로 숨긴(visually-hidden) 트리거일 뿐 — tabIndex=-1, aria-hidden |
| `error` | error 가 비어 있지 않으면 인라인 오류를 role=alert 로 즉시 통지하고 드롭존에 aria-describedby 로 연결한다 |
| `preview` | 미리보기 이미지는 label 기준 alt 를 준다. placeholder 아이콘은 장식(aria-hidden) |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `dropzoneBorder` | `color.border.default` | `--tds-color-border-default` |
| `dropzoneBorderActive` | `color.border.focus` | `--tds-color-border-focus` |
| `dropzoneBorderInvalid` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `dropzoneSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `dropzoneSurfaceActive` | `color.surface.default` | `--tds-color-surface-default` |
| `iconColor` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `textMuted` | `color.text.muted` | `--tds-color-text-muted` |
| `errorText` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `successText` | `color.feedback.success.text` | `--tds-color-feedback-success-text` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `gap` | `space.2` | `--tds-space-2` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `iconButtonSize` | `space.8` | `--tds-space-8` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
