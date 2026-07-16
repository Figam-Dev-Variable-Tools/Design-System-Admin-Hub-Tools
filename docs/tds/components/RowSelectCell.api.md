<!-- AUTO-GENERATED from contracts/RowSelectCell.contract.json — DO NOT EDIT (pnpm codegen) -->

# RowSelectCell API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/RowSelectCell.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

표 행의 선택 칸 — 보이지 않는 라벨 + 단일 체크박스를 담은 <td>. 목록 표(회원·운영자·공지·FAQ·팝업·배너·버전 이력)의 행 선택 마크업을 한 벌로 올렸다. 도메인을 모른다 — 행 식별자(id)·보이지 않는 라벨 문구(label)·checked·토글 콜백만 받는다. 출처: apps/admin/src/shared/ui/TableSelection.tsx 의 RowSelectCell (TableSelection 묶음의 행-셀 대표). 보이는 라벨이 없으므로 시각적으로 숨긴 문구를 두고 aria-labelledby(id 파생) 로 잇는다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `A41` · design `A14` · figma `A51` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `id` | `string` | — | ✅ | — | 행 식별자 — 보이지 않는 라벨의 id('select-{id}')를 파생한다(한 문서에 여러 표가 있어도 안 겹친다) |
| `label` | `string` | — | ✅ | — | 보이지 않는 라벨 문구 — 예: '{공지 제목} 선택'. aria-labelledby 로 체크박스에 이어진다 |
| `checked` | `boolean` | — | ✅ | `Checked` | 선택 여부. 제어 값 — onToggle 로만 바뀐다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onToggle` | `boolean` | — | 다음 선택 상태(boolean)를 인자로 발화한다 |

## States

`default` · `focus-visible` · `checked`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `checkbox` |
| 키보드 | `Space`, `Tab` |
| focus-visible | 필수 |
| `aria-labelledby` | 시각적으로 숨긴 라벨(span#select-{id})을 가리킨다 — 스크린리더가 '무엇을 고르는지' 읽는다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `control` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `cellText` | `color.text.default` | `--tds-color-text-default` |
| `cellBorder` | `color.border.default` | `--tds-color-border-default` |
| `cellPaddingX` | `space.2` | `--tds-space-2` |
| `cellPaddingY` | `space.3` | `--tds-space-3` |
| `controlSize` | `space.4` | `--tds-space-4` |
| `cellWidth` | `space.6` | `--tds-space-6` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
