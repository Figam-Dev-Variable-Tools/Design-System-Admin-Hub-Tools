<!-- AUTO-GENERATED from contracts/ListRow.contract.json — DO NOT EDIT (pnpm codegen) -->

# ListRow API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ListRow.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

리스트 한 줄 — 좌측 아이콘 + 제목 + 메타(보조 텍스트). href 가 있으면 링크로, 없으면 onClick 만 갖는 행으로 렌더한다. 목록 컨테이너(ul)와 도메인 의미는 조립하는 organism(ListCard 등)이 소유한다. 출처 구현: apps/admin/src/pages/dashboard/components/ListCard.tsx 의 행(row) 부분

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `title` | `string` | — | ✅ | — | 행 제목. 길면 줄바꿈(overflow-wrap: anywhere) |
| `meta` | `string` | `""` | — | — | 제목 아래 보조 텍스트 (예: '작성자 · 날짜'). 빈 문자열이면 렌더하지 않는다 |
| `icon` | ReactNode (허용: Icon) | `null` | — | — | 좌측 아이콘 슬롯. 장식용이므로 aria-hidden |
| `href` | `string` | `""` | — | — | 링크 대상. 빈 문자열이면 링크가 아닌 행으로 렌더한다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onClick` | `MouseEvent` | — | 행 클릭. href 가 있어도 라우팅 가로채기/분석 계측을 위해 함께 발화한다 |

## States

`default` · `hover` · `focus-visible`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `link` |
| 키보드 | `Tab`, `Enter` |
| focus-visible | 필수 |
| `aria-hidden` | 아이콘 슬롯 — 장식용이므로 true |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `title` | `color.text.default` | `--tds-color-text-default` |
| `meta` | `color.text.muted` | `--tds-color-text-muted` |
| `icon` | `color.text.muted` | `--tds-color-text-muted` |
| `borderBottom` | `color.border.default` | `--tds-color-border-default` |
| `backgroundHover` | `color.surface.raised` | `--tds-color-surface-raised` |
| `radius` | `radius.sm` | `--tds-radius-sm` |
| `paddingX` | `space.2` | `--tds-space-2` |
| `paddingY` | `space.3` | `--tds-space-3` |
| `gap` | `space.2` | `--tds-space-2` |
| `titleTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `transitionDuration` | `motion.duration.fast` | `--tds-motion-duration-fast` |
| `transitionEasing` | `motion.easing.standard` | `--tds-motion-easing-standard` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
