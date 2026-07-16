<!-- AUTO-GENERATED from contracts/Pagination.contract.json — DO NOT EDIT (pnpm codegen) -->

# Pagination API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Pagination.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

페이지네이션 — 범위 요약('전체 N건 중 x–y') · 이전 / 번호 창 / 다음 · 페이지 크기 선택. 현재 페이지 주변 최대 5개 번호만 보여준다(전부 그리면 줄이 넘친다). 도메인을 모른다 — 회원·운영자·적립금 내역 어느 목록이든 page·totalPages·onChange 와 nav 접근성 label 만 받는다. 출처: apps/admin/src/shared/ui/Pagination.tsx (소비 11곳).

[범위·크기 표면은 opt-in — 하위호환] 한국 ERP grid 는 가시 record 범위와 조정 가능한 page size 를 기대한다(ERP-05). 그러나 기존 소비자 11곳은 page·totalPages·label·onChange 만 넘긴다 — 그래서 범위/크기 표면은 **pageSize 를 받았을 때만** 그린다(pageSize 기본 0 = 미지정). pageSize 미지정이면 렌더 결과가 1.0.0 과 완전히 동일하다(번호 줄만, totalPages ≤ 1 이면 null).

[totalPages ≤ 1 이어도 범위는 남는다] pageSize 를 받은 경우엔 단일/0 페이지에서도 범위 요약('전체 0건' · '전체 3건 중 1–3')을 그린다 — 번호 줄만 감춘다. 0건에서 '전체 0건'을 보여주는 것이 ERP 운영자에게 필요한 정보다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `A30` · design `A14` · figma `A51` |
| 의존 컴포넌트 | `SelectField` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `page` | `number` | — | ✅ | — | 현재 페이지 (1-based). 번호 창이 이 값을 가운데 두려 민다 |
| `totalPages` | `number` | — | ✅ | — | 전체 페이지 수. 1 이하이면 컴포넌트가 렌더되지 않는다 |
| `label` | `string` | `"회원 목록 페이지"` | — | — | nav 의 접근성 이름(aria-label). 회원 목록이 기본값 — 다른 목록이 재사용할 때만 바꾼다 |
| `total` | `number` | `0` | — | — | 전체 레코드 수 — 범위 요약('전체 N건 중 x–y')의 N. pageSize 와 함께 줘야 의미가 있다. 데이터 prop — Figma 대응 없음 (ADR-0003) |
| `pageSize` | `number` | `0` | — | — | 페이지당 행 수 — 범위 요약의 x–y 를 계산하는 근거다. **0(기본)이면 범위 요약과 크기 선택을 그리지 않는다** — 이 값이 곧 ERP-05 표면의 opt-in 스위치이자 하위호환 장치다(기존 소비자 11곳은 이 prop 을 넘기지 않아 1.0.0 과 동일하게 렌더된다). 데이터 prop — Figma 대응 없음 |
| `pageSizeOptions` | `array` | `[]` | — | — | 페이지 크기 선택지(예: [10, 25, 50, 100]). 비어 있으면(기본) 크기 선택 <select> 를 그리지 않는다 — 범위 요약만 쓰는 소비자를 위해 두 표면을 따로 켠다. 데이터 prop — Figma 대응 없음 |
| `sizeLabel` | `string` | `"페이지당"` | — | — | 크기 선택 <select> 의 가시 라벨. 목록마다 세는 단위가 달라도('건'/'줄') 라벨만 바꿔 쓴다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `number` | — | 선택된 페이지 번호를 인자로 발화한다. 이전/다음/번호 버튼 모두 이 콜백으로 귀결된다 |
| `onPageSizeChange` | `number` | — | 크기 선택에서 고른 새 page size 를 인자로 발화한다. 페이지 되감기(보통 1로)는 호출부가 소유한다 — 이 컴포넌트는 값만 알린다(도메인을 모른다) |

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
| `range-summary` | 범위 요약은 role=status(aria-live=polite)로 그린다 — 페이지/크기를 바꾼 뒤 '지금 몇 번째 행을 보고 있는지'가 스크린리더에도 전달돼야 한다. 시각 사용자는 텍스트로, AT 사용자는 announce 로 같은 정보를 받는다 |
| `size-select` | 크기 선택은 <label htmlFor> 로 가시 라벨(sizeLabel)과 연결한 네이티브 <select>(SelectField) 다 — 라벨 없는 select 를 만들지 않는다. useId 로 id 를 파생해 한 화면에 여러 Pagination 이 있어도 충돌하지 않는다 |
| `nav-scope` | 범위 요약과 크기 선택은 nav 밖(감싸는 <div>)에 둔다 — nav 의 접근성 이름은 '페이지 이동' 랜드마크의 것이고, 요약/크기 선택은 페이지 이동 링크가 아니다 |
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
| `summaryText` | `color.text.muted` | `--tds-color-text-muted` |
| `summaryTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `barGap` | `space.3` | `--tds-space-3` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
