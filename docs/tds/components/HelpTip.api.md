<!-- AUTO-GENERATED from contracts/HelpTip.contract.json — DO NOT EDIT (pnpm codegen) -->

# HelpTip API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/HelpTip.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

ⓘ 도움말 — 라벨 옆에 붙는 disclosure. 출처: apps/admin/src/shared/ui/HelpTip.tsx (소비 3곳: 폼 라벨의 부가 설명). hover 전용 툴팁은 키보드·터치에서 열리지 않으므로 버튼을 눌러 여닫는 disclosure 로 만든다 — aria-expanded 로 열림 상태를, aria-controls 로 설명 문단을 잇는다. 열림 상태는 컴포넌트 내부(useState)가 소유한다 — 외부 제어 이벤트를 두지 않는다.

[패널은 언마운트하지 않는다] 닫혔을 때 요소를 지우면 aria-controls 가 가리키는 대상이 사라진다 — hidden 속성으로 감추기만 한다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `atom` |
| 카테고리 | `Feedback` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 스크린 리더용 트리거 이름 — 아이콘만 있으므로 aria-label 로 무엇에 대한 도움말인지 밝힌다 ('그룹 유형 설명' 등) |
| `children` | ReactNode | — | ✅ | — | 패널 본문 — 열렸을 때 아이콘 아래로 뜨는 설명 문단(<p>)의 내용 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default` · `hover` · `focus-visible` · `open` · `closed`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `button` |
| 키보드 | `Enter`, `Space`, `Tab` |
| focus-visible | 필수 |
| `disclosure` | hover 툴팁이 아니라 버튼 토글 disclosure 다 — aria-expanded 로 열림 상태, aria-controls 로 설명 문단(<p id>)을 잇는다 (키보드·터치에서도 열린다) |
| `label` | 트리거는 아이콘(ⓘ)만 있으므로 접근 가능한 이름을 aria-label 로 준다 |
| `panel-hidden` | 닫혔을 때 hidden 속성으로 감춘다 — 언마운트하지 않아 aria-controls 대상이 사라지지 않는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `triggerColor` | `color.text.muted` | `--tds-color-text-muted` |
| `triggerRadius` | `radius.full` | `--tds-radius-full` |
| `triggerTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `panelSurface` | `color.feedback.info.surface` | `--tds-color-feedback-info-surface` |
| `panelBorder` | `color.feedback.info.border` | `--tds-color-feedback-info-border` |
| `panelText` | `color.feedback.info.text` | `--tds-color-feedback-info-text` |
| `panelRadius` | `radius.md` | `--tds-radius-md` |
| `panelPaddingX` | `space.3` | `--tds-space-3` |
| `panelPaddingY` | `space.2` | `--tds-space-2` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |
| `typography` | `typography.caption.md` | `--tds-typography-caption-md` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
