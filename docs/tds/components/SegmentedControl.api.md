<!-- AUTO-GENERATED from contracts/SegmentedControl.contract.json — DO NOT EDIT (pnpm codegen) -->

# SegmentedControl API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/SegmentedControl.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

세그먼티드 컨트롤 — 트랙(회색 배경) 위에 선택된 세그먼트만 알약으로 떠 있는 단일 선택 컨트롤. 라디오 그룹 시맨틱을 소유한다. 도메인 중립: 옵션은 options prop 으로 주입하며 '일/주/월' 같은 도메인 의미는 조립하는 organism/page 가 정한다 (ADR-0003). 출처 구현: apps/admin/src/pages/dashboard/components/RangeToggle.tsx

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `value` | `string` | — | ✅ | — | 선택된 세그먼트의 id. options[].id 중 하나여야 한다 |
| `options` | `array` | — | ✅ | — | 세그먼트 목록. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003) |
| `size` | `'sm'` \| `'md'` | `"md"` | — | `Size` | 세그먼트 높이·좌우 패딩 스케일 |
| `disabled` | `boolean` | `false` | — | `Disabled` | 그룹 전체 비활성. onChange 차단 + aria-disabled |
| `ariaLabel` | `string` | — | ✅ | — | radiogroup 의 접근 가능한 이름 (예: '조회 기간'). 시각 레이블이 없으므로 필수 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `string` | `disabled` | 선택된 세그먼트의 id 를 전달. disabled 에서는 발화 금지 — Storybook Play Function이 전수 검증 |

## States

`default` · `hover` · `focus-visible` · `disabled` · `selected`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `radiogroup` |
| 키보드 | `Tab`, `ArrowLeft`, `ArrowRight`, `Space`, `Enter` |
| focus-visible | 필수 |
| aria-disabled | when disabled |
| `aria-label` | ariaLabel prop — radiogroup 의 이름 |
| `aria-checked` | 각 세그먼트(role=radio) — value 와 일치하면 true |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `trackBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `trackRadius` | `radius.full` | `--tds-radius-full` |
| `trackPadding` | `space.1` | `--tds-space-1` |
| `trackGap` | `space.1` | `--tds-space-1` |
| `segmentBackgroundSelected` | `color.surface.default` | `--tds-color-surface-default` |
| `segmentBorderSelected` | `color.border.default` | `--tds-color-border-default` |
| `segmentRadius` | `radius.full` | `--tds-radius-full` |
| `segmentPaddingX` | `space.3` | `--tds-space-3` |
| `segmentPaddingY` | `space.1` | `--tds-space-1` |
| `segmentText` | `color.text.muted` | `--tds-color-text-muted` |
| `segmentTextSelected` | `color.text.default` | `--tds-color-text-default` |
| `segmentTextDisabled` | `color.text.disabled` | `--tds-color-text-disabled` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `transitionDuration` | `motion.duration.fast` | `--tds-motion-duration-fast` |
| `transitionEasing` | `motion.easing.standard` | `--tds-motion-easing-standard` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
