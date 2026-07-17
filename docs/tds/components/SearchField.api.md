<!-- AUTO-GENERATED from contracts/SearchField.contract.json — DO NOT EDIT (pnpm codegen) -->

# SearchField API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/SearchField.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

검색 입력 — 돋보기 아이콘을 겹친 <input type=search> + 스크린리더용 숨김 라벨. 출처: apps/admin/src/shared/ui/SearchField.tsx (소비 29곳: 목록 상단 툴바의 '검색'). 예전엔 아이콘 겹침 + 왼쪽 패딩 보정이 여러 툴바에 복사돼 있었다 — 한 벌로 올린다.

[value 콜백 — 네이티브 이벤트가 아니다] onChange 는 SelectField 처럼 네이티브 이벤트를 흘려보내지 않고 새 문자열(event.target.value)을 넘긴다. 29곳 호출부가 onChange={setKeyword}(string setter)로 물려 있기 때문이다 — 네이티브 이벤트로 바꾸면 전부 깨진다. 그래서 value·onChange·label·placeholder 는 계약 prop/event 로 열거한다. 그 외 표준 <input> 속성(name·aria-*·autoFocus …)은 TextField 선례처럼 <input> 으로 그대로 패스스루한다 (계약 표면·id·type·onChange·className/style 은 제외).

[돋보기·숨김 라벨] 아이콘은 pointer-events:none 장식(aria-hidden) — 클릭은 아래 입력으로 통과한다. 라벨은 시각적으로 감추되(visually-hidden) DOM 에 남겨 접근 가능한 이름을 준다 — '무엇을 검색하는지' 를 밝힌다.

[도메인을 모른다] 무엇을 검색하는지 알지 못한다 — value/onChange/label/placeholder 만 받는다.

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
| `value` | `string` | — | ✅ | — | 제어 컴포넌트 검색어 |
| `label` | `string` | — | ✅ | — | 스크린 리더용 라벨 — 시각적으로 감추되 접근 가능한 이름을 준다('공지 제목 검색' 등) |
| `placeholder` | `string` | `"검색"` | — | — | 입력 placeholder. 미지정이면 '검색' |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onChange` | `string` | — | 검색어 변경 — 네이티브 이벤트가 아니라 새 문자열(event.target.value)을 넘긴다 (호출부의 string setter 와 직결) |

## States

`default` · `focus-visible`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `searchbox` |
| 키보드 | `Tab` |
| focus-visible | 필수 |
| `native-search` | 네이티브 <input type=search> 라 role=searchbox 가 브라우저 기본으로 동작한다 |
| `hidden-label` | 라벨은 visually-hidden 으로 감추되 DOM 에 남겨 htmlFor 로 입력의 접근 가능한 이름을 준다 |
| `icon-decorative` | 돋보기는 pointer-events:none · aria-hidden 장식 — 클릭은 입력으로 통과한다 |
| `native-passthrough` | name/aria-*/autoFocus 등 표준 input 속성은 <input> 으로 그대로 전달한다 (TextField 선례) |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `icon` | `color.text.muted` | `--tds-color-text-muted` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.2` | `--tds-space-2` |
| `iconGap` | `space.6` | `--tds-space-6` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
