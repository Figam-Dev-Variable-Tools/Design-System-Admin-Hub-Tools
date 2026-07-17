<!-- AUTO-GENERATED from contracts/SelectionBar.contract.json — DO NOT EDIT (pnpm codegen) -->

# SelectionBar API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/SelectionBar.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

선택 일괄 액션 바 — '선택 개수 + 일괄 액션(삭제·ON/OFF)'. 콘텐츠 목록 6종(공지·FAQ·팝업·배너·약관·개인정보)이 행을 체크박스로 고르면 상단에 뜬다. 도메인을 모른다 — 무엇을 골랐는지 알지 못하며 선택 개수(count)·단위 문구(noun)·해제 콜백(onClear)·액션 버튼(children)만 받는다. 출처: apps/admin/src/shared/ui/SelectionBar.tsx (소비 7곳). count 가 0 이면 아무것도 렌더하지 않는다(선택이 없으면 바가 없다).

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
| `count` | `number` | — | ✅ | — | 선택된 행 수. 0 이면 아무것도 그리지 않는다. 천 단위 구분으로 표기한다 |
| `noun` | `string` | `"건"` | — | — | 개수 단위 문구('건'/'명' 등). 기본 '건' |
| `children` | ReactNode | — | ✅ | — | 일괄 액션 버튼들(일괄 삭제 · 일괄 ON/OFF 등). 어떤 액션인지는 호출부가 버튼으로 넣는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onClear` | `void` | — | 선택 해제. 지정되면 '선택 해제' 버튼을 그리고 누르면 발화한다. 미지정이면 버튼을 그리지 않는다 |

## States

`default` · `focus-visible`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `region` |
| 키보드 | `Tab` |
| focus-visible | 필수 |
| `aria-label` | region 의 접근성 이름 — '선택 항목 일괄 작업' |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `background` | `color.surface.raised` | `--tds-color-surface-raised` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `countText` | `color.text.default` | `--tds-color-text-default` |
| `clearText` | `color.text.muted` | `--tds-color-text-muted` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.2` | `--tds-space-2` |
| `gap` | `space.3` | `--tds-space-3` |
| `countTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `clearTypography` | `typography.label.sm` | `--tds-typography-label-sm` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
