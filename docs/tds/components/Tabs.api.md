<!-- AUTO-GENERATED from contracts/Tabs.contract.json — DO NOT EDIT (pnpm codegen) -->

# Tabs API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Tabs.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

하단 밑줄형 탭 목록. 선택된 탭만 액션 컬러 밑줄을 갖고, 비선택 탭도 동일 두께의 투명 밑줄을 둬 전환 시 라벨이 밀리지 않는다. 탭 패널은 이 컴포넌트가 렌더하지 않는다 — aria-controls 로 바깥 패널을 가리킨다. 도메인 중립: 탭 항목은 items prop 으로 주입한다 (ADR-0003). 출처 구현: apps/admin/src/pages/dashboard/components/TabBar.tsx

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
| `value` | `string` | — | ✅ | — | 선택된 탭의 id. items[].id 중 하나여야 한다 |
| `items` | `array` | — | ✅ | — | 탭 목록. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003) |
| `ariaLabel` | `string` | — | ✅ | — | tablist 의 접근 가능한 이름 (예: '업무 영역') |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `string` | — | 선택된 탭의 id 를 전달 |

## States

`default` · `hover` · `focus-visible` · `selected`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `tablist` |
| 키보드 | `Tab`, `ArrowLeft`, `ArrowRight`, `Home`, `End` |
| focus-visible | 필수 |
| `aria-label` | ariaLabel prop — tablist 의 이름 |
| `aria-selected` | 각 탭(role=tab) — value 와 일치하면 true |
| `aria-controls` | 각 탭 — 대응하는 tabpanel 의 id |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `listBorder` | `color.border.default` | `--tds-color-border-default` |
| `indicatorSelected` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `text` | `color.text.muted` | `--tds-color-text-muted` |
| `textSelected` | `color.text.default` | `--tds-color-text-default` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `paddingTop` | `space.2` | `--tds-space-2` |
| `paddingBottom` | `space.3` | `--tds-space-3` |
| `gap` | `space.5` | `--tds-space-5` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `transitionDuration` | `motion.duration.fast` | `--tds-motion-duration-fast` |
| `transitionEasing` | `motion.easing.standard` | `--tds-motion-easing-standard` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
