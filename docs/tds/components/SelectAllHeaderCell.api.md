<!-- AUTO-GENERATED from contracts/SelectAllHeaderCell.contract.json — DO NOT EDIT (pnpm codegen) -->

# SelectAllHeaderCell API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/SelectAllHeaderCell.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

표 헤더의 전체선택 칸 — 보이지 않는 라벨 + 3상태 체크박스(TriStateCheckbox)를 담은 <th>. 이 페이지의 행이 전부 선택됐으면 on, 일부면 mixed, 아니면 off. 회원·운영자·콘텐츠 목록이 같은 규칙으로 쓴다. 도메인을 모른다 — 라벨 문구(label)·라벨 id(labelId)·선택 상태(selection)·전체토글 콜백만 받는다. 출처: apps/admin/src/shared/ui/TableSelection.tsx 의 SelectAllHeaderCell. selection 은 동반 유틸 tableSelectionState(rows, selectedIds) 가 계산한 {allSelected, someSelected} 다 — 보이지 않는 행은 세지 않는다(다른 페이지의 선택이 남아 있어도 이 페이지 상태만 본다). 보이는 라벨이 없으므로 숨긴 문구를 labelId 로 두고 TriStateCheckbox 의 labelledBy 로 잇는다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `react-refactor` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `TriStateCheckbox` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 보이지 않는 라벨 문구 — 예: '이 페이지의 회원 전체 선택' |
| `labelId` | `string` | — | ✅ | — | 라벨 요소의 id — 표마다 달라야 한다(한 문서에 두 표가 있을 수 있다). TriStateCheckbox 의 labelledBy 로 이어진다 |
| `selection` | `object` | — | ✅ | — | 이 페이지의 선택 상태 — 동반 유틸 tableSelectionState 가 계산한다. allSelected → 체크박스 on, someSelected → mixed(부분 선택). 데이터 prop — Figma 대응 없음 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onToggleAll` | `boolean` | — | 전체선택/해제 — 다음 상태(boolean)를 인자로 발화한다 |

## States

`default` · `focus-visible` · `checked` · `indeterminate`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `checkbox` |
| 키보드 | `Space`, `Tab` |
| focus-visible | 필수 |
| `aria-labelledby` | 숨긴 라벨(span#labelId)을 가리킨다 |
| `aria-checked` | TriStateCheckbox 가 someSelected → "mixed", allSelected → true, 그 외 false 로 노출한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `headBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `headText` | `color.text.muted` | `--tds-color-text-muted` |
| `headBorder` | `color.border.default` | `--tds-color-border-default` |
| `headPaddingX` | `space.2` | `--tds-space-2` |
| `headPaddingY` | `space.3` | `--tds-space-3` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
