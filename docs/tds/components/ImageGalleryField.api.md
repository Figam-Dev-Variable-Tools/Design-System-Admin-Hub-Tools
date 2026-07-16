<!-- AUTO-GENERATED from contracts/ImageGalleryField.contract.json — DO NOT EDIT (pnpm codegen) -->

# ImageGalleryField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ImageGalleryField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

다중 이미지 업로드(갤러리) 필드 — ImageUploadField 와 같은 메커니즘(드래그드롭·클릭 선택·object URL 프리뷰·클라이언트 검증)을 여러 장으로 확장한다. 값(values)은 이미지 URL 배열이다. 도메인을 모른다 — label/values/onChange 와 힌트만 받는다 (ADR-0003).

[손코딩 유지] react-dropzone 기각(오너 검토) — 드롭존 버튼을 직접 만든다.
[프리뷰] 그리드 타일, 각 타일에 개별 제거 버튼. 순서는 추가 순서 유지. 타일 URL 이 비거나 로드 실패면 이미지 아이콘 placeholder.
[검증] image/* · 파일당 용량 상한(maxSizeMB) · 개수 상한(maxFiles). 위반은 인라인 오류(토스트 아님). imageFileError 순수 함수를 ImageUploadField 와 공유.
[누수 방지] 우리가 만든 object URL 만 추적해 제거/언마운트 시 revoke 한다.

[imperative/경계] onChange 는 새 URL 배열을 넘기는 값 콜백. error/hint 는 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 필드 라벨 — 드롭존의 접근 가능한 이름과 각 타일 alt 의 기준 |
| `values` | `array` | — | ✅ | — | 현재 이미지 URL 배열. 빈 배열이면 드롭존만, 있으면 그리드 프리뷰 + 개별 제거. 데이터 prop — Figma 대응 없음 (ADR-0003) |
| `required` | `boolean` | `false` | — | `Required` | 필수 표식(*)을 라벨에 붙인다 (장식 — aria-hidden) |
| `disabled` | `boolean` | `false` | — | `Disabled` | 드롭존/추가/제거를 비활성한다 |
| `error` | `string` | `""` | — | — | 스키마가 내려주는 오류 — 로컬 검증 오류(타입·용량·개수)보다 우선. 비어 있지 않으면 danger 테두리 + role=alert 인라인 오류 |
| `hint` | `string` | `""` | — | — | 도움말 문구 — 오류가 없을 때만 표시된다 |
| `maxFiles` | `number` | `10` | — | — | 등록 가능한 최대 장수. 초과분은 인라인 오류로 막고 상한까지만 담는다 |
| `maxSizeMB` | `number` | `5` | — | — | 파일당 용량 상한(MB). 초과하면 인라인 오류로 막는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `readonly string[]` | — | 이미지 목록이 바뀌면 새 URL 배열을 넘긴다 — 네이티브 이벤트가 아니라 값 콜백이다 |

## States

`default` · `error` · `disabled`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `button` |
| 키보드 | `Enter`, `Space`, `Tab` |
| focus-visible | 필수 |
| `dropzone` | 드롭존/추가 칸은 <button> — 접근 가능한 이름을 aria-label 로 준다. Enter/Space 로 파일 선택을 연다 |
| `file-input` | 실제 <input type=file multiple> 은 시각적으로 숨긴 트리거 — tabIndex=-1, aria-hidden |
| `remove` | 각 타일 제거 버튼은 focusable + aria-label('N번째 이미지 제거') |
| `error` | error 가 비어 있지 않으면 role=alert 로 즉시 통지하고 드롭존에 aria-describedby 로 연결한다 |
| `tile` | 타일 이미지는 label+순번 기준 alt. placeholder 아이콘은 role=img + aria-label |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `dropzoneBorder` | `color.border.default` | `--tds-color-border-default` |
| `dropzoneBorderActive` | `color.border.focus` | `--tds-color-border-focus` |
| `dropzoneBorderInvalid` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `dropzoneSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `dropzoneSurfaceActive` | `color.surface.default` | `--tds-color-surface-default` |
| `tileBorder` | `color.border.default` | `--tds-color-border-default` |
| `tileSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `removeSurface` | `color.surface.default` | `--tds-color-surface-default` |
| `removeColor` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `iconColor` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `textMuted` | `color.text.muted` | `--tds-color-text-muted` |
| `errorText` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `successText` | `color.feedback.success.text` | `--tds-color-feedback-success-text` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `gap` | `space.3` | `--tds-space-3` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `iconButtonSize` | `space.8` | `--tds-space-8` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
