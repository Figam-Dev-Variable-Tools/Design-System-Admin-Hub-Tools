<!-- AUTO-GENERATED from contracts/ListCard.contract.json — DO NOT EDIT (pnpm codegen) -->

# ListCard API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ListCard.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

제목 + 카운트 뱃지 + 행 목록 카드. Card + Badge + ListRow 를 조립한 업무 위젯 (ADR-0003 organism). rows 는 데이터 prop 이라 Figma 대응이 없다 — 최근 주문·최근 문의·최근 상담 등 도메인별 목록을 같은 껍데기로 렌더한다.

[2.0.0 — SPA 내비게이션 탈출구] onRowClick 이 MouseEvent 를 함께 넘긴다. 1.x 는 row.id 문자열만 넘겨 preventDefault() 가 불가능했고, 그래서 href 를 주면 전체 페이지 새로고침, 안 주면 <button> 이 되어 새탭/가운데클릭/URL 미리보기를 잃었다 — react-router 로 SPA 내비를 하는 화면(대시보드)을 **어떤 prop 조합으로도 만들 수 없었다**. 호출부는 이제 href 로 진짜 <a> 를 유지한 채, 좌클릭만 preventDefault 하고 navigate() 로 가로챌 수 있다 (수식키/가운데클릭은 브라우저에 맡긴다).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `2.0.0` |
| 레벨 | `organism` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `Card`, `Badge`, `ListRow` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `title` | `string` | — | ✅ | — | 카드 제목 |
| `count` | `number` | `0` | — | — | 제목 옆 Badge 에 표시할 총 건수. rows.length 와 다를 수 있다(전체 건수 vs 미리보기 행) |
| `rows` | `array` | — | ✅ | — | 행 목록. 빈 배열이면 empty 문구를 렌더한다. meta 는 보조 정보(작성자·날짜 등), href 가 있으면 행 전체가 링크. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003) |
| `loading` | `boolean` | `false` | — | `Loading` | 로딩 중 스켈레톤 행 표시 + aria-busy + onRowClick 차단 |
| `empty` | `string` | `"표시할 항목이 없습니다."` | — | — | rows 가 빈 배열일 때 표시할 문구 |
| `icon` | ReactNode (허용: Icon) | `null` | — | — | 각 행 앞에 붙는 아이콘 슬롯. 목록 성격(주문·문의·상담)을 시각적으로 구분한다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onRowClick` | `{ id: string; event: MouseEvent }` | `loading` | 행 클릭 시 해당 row.id 와 **원본 MouseEvent** 를 함께 전달한다. 호출부가 event.preventDefault() 로 기본 내비게이션을 가로채 SPA 라우팅으로 바꿀 수 있다 — 이 인자가 없으면 href 있는 행은 전체 새로고침이 된다. loading 상태에서는 발화 금지 (구현은 발화 차단과 함께 event.preventDefault() 로 <a> 기본 동작도 막는다) — Storybook Play Function이 전수 검증. **2.0.0 파괴적 변경**: 1.x 의 payload 는 string 이었다 |

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
| `gap` | `space.3` | `--tds-space-3` |
| `rowGap` | `space.2` | `--tds-space-2` |
| `rowBorder` | `color.border.default` | `--tds-color-border-default` |
| `title` | `color.text.default` | `--tds-color-text-default` |
| `titleTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `typography` | `typography.body.md` | `--tds-typography-body-md` |
| `rowMeta` | `color.text.muted` | `--tds-color-text-muted` |
| `empty` | `color.text.muted` | `--tds-color-text-muted` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
