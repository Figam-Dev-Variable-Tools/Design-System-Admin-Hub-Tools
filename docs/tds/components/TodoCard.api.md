<!-- AUTO-GENERATED from contracts/TodoCard.contract.json — DO NOT EDIT (pnpm codegen) -->

# TodoCard API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/TodoCard.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

'오늘의 할일' 카드. Card + Badge 를 조립해 처리 대기 건수를 한 줄로 보여주는 업무 위젯 (ADR-0003 organism). items 는 데이터 prop 이라 Figma 대응이 없다 — 탭(상품·문의·영업)에 따라 항목 집합이 통째로 바뀌므로 항목을 계약에 고정하지 않고 호출부(Pages)가 주입한다.

[2.0.0 — SPA 내비게이션 탈출구] ListCard 와 동일 결함·동일 처방이다 (같은 판정으로 함께 올린다). onItemClick 이 MouseEvent 를 함께 넘겨 호출부가 preventDefault() 후 navigate() 할 수 있다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `2.0.0` |
| 레벨 | `organism` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `Card`, `Badge` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `title` | `string` | `"오늘의 할일"` | — | — | 카드 제목 |
| `items` | `array` | — | ✅ | — | 할일 항목 목록. count > 0 인 항목은 강조색(color.feedback.danger.text), 0 인 항목은 흐리게(color.text.disabled) 렌더한다. href 가 있으면 링크, 없으면 정적 텍스트. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003) |
| `loading` | `boolean` | `false` | — | `Loading` | 로딩 중 스켈레톤 표시 + aria-busy + onItemClick 차단 |
| `showTotal` | `boolean` | `true` | — | `ShowTotal` | 제목 옆에 items 의 count 합계를 Badge 로 표시 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onItemClick` | `{ key: string; event: MouseEvent }` | `loading` | 항목 클릭 시 해당 item.key 와 **원본 MouseEvent** 를 함께 전달한다. 호출부가 event.preventDefault() 로 기본 내비게이션을 가로채 SPA 라우팅으로 바꿀 수 있다. loading 상태에서는 발화 금지 (구현은 이미 event.preventDefault() 로 <a> 기본 동작도 막는다 — TodoCard.tsx:25-28) — Storybook Play Function이 전수 검증. **2.0.0 파괴적 변경**: 1.x 의 payload 는 string 이었다 |

## States

`default` · `loading`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `region` |
| 키보드 | `Tab`, `Shift+Tab`, `Enter` |
| focus-visible | 필수 |
| aria-busy | when loading |
| `aria-labelledby` | 카드 제목 요소를 가리켜 region 에 접근성 이름을 부여한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `padding` | `space.5` | `--tds-space-5` |
| `gap` | `space.4` | `--tds-space-4` |
| `itemGap` | `space.2` | `--tds-space-2` |
| `title` | `color.text.default` | `--tds-color-text-default` |
| `titleTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `typography` | `typography.body.md` | `--tds-typography-body-md` |
| `countPending` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `countEmpty` | `color.text.disabled` | `--tds-color-text-disabled` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
