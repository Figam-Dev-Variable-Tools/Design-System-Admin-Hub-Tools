<!-- AUTO-GENERATED from contracts/Pagination.contract.json — DO NOT EDIT (pnpm codegen) -->

# Pagination API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Pagination.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

페이지네이션 — 이전 / 번호 창 / 다음. 현재 페이지 주변 최대 5개 번호만 보여준다(전부 그리면 줄이 넘친다). 도메인을 모른다 — 회원·운영자·적립금 내역 어느 목록이든 page·totalPages·onChange 와 nav 접근성 label 만 받는다. 출처: apps/admin/src/shared/ui/Pagination.tsx (소비 9곳). totalPages ≤ 1 이면 아무것도 렌더하지 않는다(단일 페이지엔 페이지네이션이 없다).

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
| `page` | `number` | — | ✅ | — | 현재 페이지 (1-based). 번호 창이 이 값을 가운데 두려 민다 |
| `totalPages` | `number` | — | ✅ | — | 전체 페이지 수. 1 이하이면 컴포넌트가 렌더되지 않는다 |
| `label` | `string` | `"회원 목록 페이지"` | — | — | nav 의 접근성 이름(aria-label). 회원 목록이 기본값 — 다른 목록이 재사용할 때만 바꾼다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `number` | — | 선택된 페이지 번호를 인자로 발화한다. 이전/다음/번호 버튼 모두 이 콜백으로 귀결된다 |

## States

`default` · `hover` · `focus-visible` · `disabled`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 A77(축2)이 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `navigation` |
| 키보드 | `Tab`, `Enter`, `Space` |
| focus-visible | 필수 |
| `aria-label` | nav 의 접근성 이름 — label prop |
| `aria-current` | 현재 페이지 번호 버튼에 aria-current="page" |
| `disabled` | 첫 페이지에서 '이전', 마지막 페이지에서 '다음' 버튼은 native disabled |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `activeBackground` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `activeBorder` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `activeText` | `color.text.on-primary` | `--tds-color-text-on-primary` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `textDisabled` | `color.text.disabled` | `--tds-color-text-disabled` |
| `hoverBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `size` | `space.6` | `--tds-space-6` |
| `paddingX` | `space.2` | `--tds-space-2` |
| `gap` | `space.1` | `--tds-space-1` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
