<!-- AUTO-GENERATED from contracts/RowActions.contract.json — DO NOT EDIT (pnpm codegen) -->

# RowActions API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/RowActions.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

목록 행의 인라인 액션 — 수정(연필) · 삭제(휴지통). 콘텐츠 목록(공지·FAQ·팝업·배너)의 행 끝 액션이 동일해 한 벌로 올렸다. 도메인을 모른다 — 무엇을 수정/삭제하는지 알지 못하며 콜백과 접근성 라벨(label)·진행중 잠금(disabled)만 받는다. 출처: apps/admin/src/shared/ui/RowActions.tsx (소비 6곳). 삭제는 여기서 곧바로 지우지 않는다 — 호출부가 onDelete 안에서 확인 다이얼로그를 연다(확인 없는 삭제 금지). onEdit/onDelete 는 각각 있을 때만 해당 버튼을 그린다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `react-refactor` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 스크린 리더용 대상 이름 — 행마다 달라야 한다('공지 제목'). 버튼 aria-label 은 '{label} 수정'/'{label} 삭제' |
| `disabled` | `boolean` | `false` | — | `Disabled` | 진행 중(삭제 요청 등) — 두 버튼을 잠근다(native disabled) |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onEdit` | `void` | `disabled` | 수정 — 지정되면 연필 버튼을 그린다. 미지정(읽기 전용 행)이면 생략. disabled 에서는 발화 금지 |
| `onDelete` | `void` | `disabled` | 삭제 — 지정되면 휴지통 버튼을 그린다. 호출부가 확인 다이얼로그를 연다. disabled 에서는 발화 금지 |

## States

`default` · `hover` · `focus-visible` · `disabled`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `button` |
| 키보드 | `Tab`, `Enter`, `Space` |
| focus-visible | 필수 |
| `aria-label` | 각 버튼에 '{label} 수정' / '{label} 삭제' |
| `disabled` | disabled 이면 두 버튼 모두 native disabled 로 onEdit/onDelete 를 막는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `icon` | `color.text.muted` | `--tds-color-text-muted` |
| `iconDisabled` | `color.text.disabled` | `--tds-color-text-disabled` |
| `hoverBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `hoverText` | `color.text.default` | `--tds-color-text-default` |
| `dangerIcon` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `padding` | `space.1` | `--tds-space-1` |
| `gap` | `space.1` | `--tds-space-1` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
