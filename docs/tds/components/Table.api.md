<!-- AUTO-GENERATED from contracts/Table.contract.json — DO NOT EDIT (pnpm codegen) -->

# Table API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Table.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

목록 표 — `<table>` 골격과 그 안의 캡션·정렬 헤더·본문 행을 소유한다. 셀 내용은 전부 호출부가 만든 ReactNode 로 들어오고, 이 컴포넌트는 **표의 골격과 상호작용만** 그린다.

[DataTable 과 무엇이 다른가 — 두 행이 따로 있는 이유] 분류표에는 `Tables/basic-table`(DataTable) 과 `Data Display/table`(이 계약) 두 행이 있다. DataTable 은 **정적 수치 표**다: 셀 값이 `string | number` 이고, 천 단위 구분·단위 접미사·0 이하 흐리기·합계 tfoot 을 스스로 계산하며, 선택·정렬·행 액션·로딩이 없다. 대시보드 통계처럼 '읽는' 표의 것이다. 이 계약은 **상호작용 목록 표**다: 셀이 ReactNode 라 배지·링크·버튼이 들어가고, 정렬 헤더·행 활성화·스켈레톤·빈 상태를 갖는다. 둘을 한 컴포넌트로 합치면 수치 포맷팅과 상호작용이 한 파일에서 서로를 방해한다 — 실제로 겹치는 prop 이 `caption` 하나뿐이라 합칠 근거가 없다.

[승격 근거] 실물이 apps/admin/src/shared/crud/CrudTable.tsx 에 384줄로 있었고 어떤 계약·스토리·Figma 에도 없었다. 선언적 CRUD 껍데기 뒤의 5개 화면이 전부 이 표를 쓴다. 분류표 `Data Display/table` 행은 그동안 component: null 이었다.

[무엇이 DS 이고 무엇이 앱인가 — 이 계약의 가장 중요한 판단] CrudTable 은 다섯 가지를 한 파일에서 하고 있었다: (1) 표 골격·정렬 헤더·스켈레톤·빈 행의 시각과 상호작용, (2) 행 모델과 정렬 비교(@tanstack/react-table), (3) 권한(canUpdate·canRemove)에 따른 열 가감, (4) 선택 상태와 체크박스, (5) 빈 상태의 한국어 카피와 조사(이/가) 처리. **DS 는 (1)만 가진다.** (2)~(5)는 전부 앱의 사실이다 — 어떤 역할이 무엇을 고칠 수 있는지, 무엇이 선택됐는지, 비었을 때 한국어로 뭐라고 말할지는 이 제품에만 있는 지식이고, DS 가 그것을 배우면 다른 앱에서 쓸 수 없는 표가 된다. Sidebar 승격이 세운 규율(`sections` 는 이미 걸러진 데이터, `activeHref` 는 판정의 **결과**)을 그대로 따른다.

[권한이 만든 열은 어떻게 들어오나 — leadingHead/trailingHead] 체크박스 열·순번 열·행 액션 열은 **데이터 열이 아니라 표의 골격**이고, 그중 무엇을 그릴지는 권한이 정한다. DS 가 `canRemove` 를 배우는 대신, 호출부가 **완성된 `<th>`/`<td>` 요소의 배열**을 leadingHead·trailingHead·행의 leading·trailing 으로 넘긴다. 배열이라 길이가 곧 열 수이고, 스켈레톤과 빈 행의 colSpan 이 그 길이에서 자동으로 나온다 — 예전에는 호출부가 `columns.length + 1 + (showSelect?1:0) + (showActions?1:0)` 를 손으로 세고 있었고, 그 식이 틀리면 조용히 어긋난 표가 나온다.

[정렬 상태는 주입된다 — 제어 컴포넌트] sortKey·sortDirection 은 **판정의 결과**로 들어온다. 어드민에서 정렬의 단일 원천은 URL(useListState.sort) 이고, DS 가 자기 상태를 들면 뒤로 가기로 되돌릴 수 없다. 헤더 버튼은 onSortToggle 로 **의사만** 올린다. sortable 을 선언한 열만 헤더가 버튼이 되며, 아무 열도 선언하지 않으면 헤더는 도입 전과 완전히 동일한 평범한 `<th>` 다.

[행 활성화는 마우스 보조 수단이다 — tabIndex 를 주지 않는다] 행 어디를 눌러도 상세로 가는 규칙은 있으나, `<tr>` 에 role·tabIndex 를 씌우면 표 시맨틱이 깨진다(A11Y). 키보드 사용자는 행 안의 링크·버튼으로 이동하며, 행 클릭은 **접근 가능한 경로가 이미 존재한다는 전제 위의 보조 수단**이다. 그래서 onActivate 는 클릭만 받고, 행 안의 인터랙티브 요소(a·button·input·select·textarea·label·menu)에서 시작한 클릭과 텍스트를 드래그 선택하던 중의 클릭은 활성화로 치지 않는다 — 이 가드가 없으면 체크박스를 누를 때마다 화면이 튀고 셀 값 복사가 막힌다.

[빈 상태의 카피를 계약에 넣지 않았다] empty 는 node 슬롯이다. '등록된 인증서가 없습니다' 의 조사(이/가)와 '검색을 지우세요 / 필터를 초기화하세요' 의 3분기 판단은 한국어와 이 제품의 정보구조에 묶인 앱의 지식이라 DS 가 문자열로 들지 않는다. 어드민은 이 슬롯에 자기 Empty 를 넣는다.

[가로 스크롤을 표가 스스로 갖지 않는다] `overflow-x` 를 두르면 표가 자기 스크롤 컨테이너를 만들어 sticky 헤더·행 확장 같은 다음 축을 막는다. 폭 대응은 감싸는 쪽의 일이며 responsive.behavior 는 fluid 다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `organism` |
| 카테고리 | `Data Display` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `Skeleton` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `caption` | `string` | — | ✅ | — | 표의 접근 가능한 설명 — `<caption>` 에 들어가며 시각적으로는 숨는다. 표가 무엇의 목록이고 행에 어떤 조작이 있는지 한 문장으로 말한다. **없는 버튼을 있다고 읽어 주면 스크린리더 사용자는 존재하지 않는 조작을 찾아 표를 헤맨다** — 권한에 따라 문장을 바꾸는 것은 호출부의 일이다(DS 는 권한을 모른다) |
| `columns` | `array` | — | ✅ | — | **데이터 열**의 정의. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003). 체크박스·순번·행 액션 열은 여기 들어가지 않는다(leadingHead·trailingHead 참조). `id` 는 정렬 키이자 React key 다. `align: 'end'` 는 수치 열 — 우측 정렬 + tabular-nums 가 함께 붙는다. `sortable: true` 인 열만 헤더가 정렬 버튼이 되며 기본은 false 다(정렬은 opt-in) |
| `rows` | `array` | — | ✅ | — | 본문 행. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003). `cells` 는 columns 와 **같은 순서·같은 길이**이며 각 항목이 그 열의 `<td>` 안에 그대로 들어간다. `leading`/`trailing` 은 **완성된 `<td>`/`<th>` 요소**다 — 호출부가 체크박스 셀·순번 셀·액션 셀을 통째로 넘긴다. `onActivate` 를 주면 행 전체가 클릭 가능해진다(포인터 커서). 정렬은 이미 끝난 상태로 들어온다 — DS 는 rows 를 준 순서 그대로 그린다. `selected` 는 계약 states 의 `selected` 를 그리는 **판정의 결과**다(sortKey·Sidebar 의 activeHref 와 같은 어법) — 무엇이 선택됐는지 고르는 것도, 체크박스를 그리는 것도 여전히 앱의 일이고(체크박스는 leading 으로 통째로 들어온다) DS 는 '이 행은 선택됐다' 는 사실만 받아 `aria-selected` 와 시각으로 옮긴다. hover 와 같은 배경을 쓰되 inline-start 강조선으로 구분한다 — 배경만으로 갈리면 마우스가 얹힌 행과 선택된 행이 같아 보인다 |
| `leadingHead` | `array` | `[]` | — | — | 데이터 헤더 **앞**에 오는 완성된 `<th>` 요소들 — 전체 선택 체크박스 헤더·순번 헤더 등. 배열 길이가 곧 앞쪽 열 수이며, 스켈레톤과 빈 행의 colSpan 이 여기서 계산된다. 권한으로 열이 사라지면 호출부가 배열에서 빼면 되고 DS 는 셈을 다시 하지 않는다 |
| `trailingHead` | `array` | `[]` | — | — | 데이터 헤더 **뒤**에 오는 완성된 `<th>` 요소들 — 행 액션 열 헤더 등. leadingHead 와 같은 규칙이다 |
| `sortKey` | `string` | `""` | — | — | 지금 정렬 기준인 열의 id. 빈 문자열이면 어느 열도 정렬 표시를 갖지 않고 rows 가 온 순서 그대로다. **판정은 앱이 한다** — 어드민은 URL(useListState.sort)이 단일 원천이라 DS 가 자기 상태로 들면 뒤로 가기로 되돌릴 수 없다 |
| `sortDirection` | `'asc'` \| `'desc'` | `"asc"` | — | `Sort Direction` | 정렬 방향 — sortKey 가 빈 문자열이면 아무 데도 쓰이지 않는다. `<th aria-sort>` 가 ascending/descending 으로 나가고 시각 표식(▲/▼)이 같은 값을 따른다 |
| `loading` | `boolean` | `false` | — | `Loading` | **최초 로드만** true 여야 한다 — 재조회 중에 true 가 되면 이전 행이 스켈레톤으로 덮여 화면이 깜빡인다(STATE-01). true 이면 `<table aria-busy>` 가 켜지고 본문이 스켈레톤 격자로 대체된다 |
| `skeletonRows` | `number` | `5` | — | — | 로딩 중 그릴 스켈레톤 행 수. 실제 페이지 크기에 가까울수록 로드 후 레이아웃이 덜 튄다 |
| `empty` | ReactNode | `null` | — | — | rows 가 비었을 때 본문 한 칸(colSpan 전체)에 그릴 내용. **슬롯이다** — '등록된 X이(가) 없습니다' 의 조사 처리와 '검색을 지우세요/필터를 초기화하세요' 의 분기는 한국어와 이 제품의 정보구조에 묶인 앱의 지식이라 DS 가 문자열로 들지 않는다. null 이면 빈 칸만 그린다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onSortToggle` | `string` | — | 정렬 가능한 헤더 버튼이 눌리면 그 열의 id 를 전달한다. 다음 정렬 상태를 정하는 것은 DS 가 아니다 — 호출부가 sortKey·sortDirection 을 다음 값으로 정해서 되돌려준다. 이 콜백을 주지 않으면 sortable 열의 헤더도 버튼이 되지 않는다(눌러도 조용한 버튼을 그리지 않는다) |

## States

`default` · `hover` · `focus-visible` · `loading` · `selected`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `table` |
| 키보드 | `Tab — 행 안의 인터랙티브 요소(체크박스·링크·액션 버튼)와 정렬 헤더 버튼으로 문서 순서 그대로 흐른다`, `Enter/Space — 정렬 헤더 버튼에서 그 열의 정렬을 토글한다(native <button>)`, `**행 자체는 탭 순서에 없다.** <tr> 에 tabIndex 를 주면 표 시맨틱이 깨지고, 행마다 정지점이 생겨 키보드 사용자가 셀 수만큼 Tab 을 눌러야 한다. 행 클릭은 마우스 사용자를 위한 보조 수단이며 같은 목적지로 가는 접근 가능한 경로(행 안의 링크·수정 버튼)가 항상 함께 있어야 한다` |
| focus-visible | 필수 |
| `caption` | <caption> 은 시각적으로 숨기되 접근성 트리에는 남긴다 — 표의 접근 가능한 이름이 된다 |
| `aria-sort` | 정렬 기준 열의 <th> 에 ascending/descending. **버튼이 아니라 열의 속성이다**(ERP-04) — 버튼에 붙이면 보조기술이 '이 버튼이 정렬돼 있다' 로 읽어 열과 조작을 혼동한다 |
| `aria-busy` | loading 이면 <table aria-busy='true'> — 스켈레톤이 실제 데이터로 오인되지 않게 한다 |
| `sort-button-hint` | 정렬 버튼 안에 시각적으로 숨긴 안내('이 열로 정렬' / '정렬 기준 · 다시 누르면 방향 전환')를 둔다. ▲▼↕ 표식은 aria-hidden 이다 — aria-sort 가 이미 같은 사실을 말하므로 두 번 읽히면 안 된다 |
| `skeleton-hidden` | 스켈레톤 칸은 aria-hidden 이다. 내용 없는 셀이 낭독되면 사용자가 '빈 값' 으로 오해한다 |
| `no-row-role` | <tr> 에 role/tabIndex 를 씌우지 않는다 — 표 시맨틱을 덮으면 행·열 탐색이 사라진다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `headSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `headText` | `color.text.muted` | `--tds-color-text-muted` |
| `headTypography` | `typography.label.sm` | `--tds-typography-label-sm` |
| `headPadY` | `space.3` | `--tds-space-3` |
| `cellPadX` | `component.table.cell-padding-x` | `--tds-component-table-cell-padding-x` |
| `cellPadY` | `component.table.cell-padding-y` | `--tds-component-table-cell-padding-y` |
| `cellText` | `color.text.default` | `--tds-color-text-default` |
| `cellTypography` | `typography.label.md` | `--tds-typography-label-md` |
| `divider` | `component.table.divider` | `--tds-component-table-divider` |
| `headBorder` | `color.border.default` | `--tds-color-border-default` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |
| `rowHoverBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `rowSelectedBackground` | `color.surface.raised` | `--tds-color-surface-raised` |
| `rowSelectedAccent` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `rowSelectedAccentWidth` | `border-width.medium` | `--tds-border-width-medium` |
| `emptyText` | `color.text.muted` | `--tds-color-text-muted` |
| `emptyPadY` | `space.6` | `--tds-space-6` |
| `sortGap` | `space.1` | `--tds-space-1` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `focusRingWidth` | `border-width.medium` | `--tds-border-width-medium` |
| `actionColumnWidthUnit` | `space.6` | `--tds-space-6` |
| `transitionDuration` | `motion.duration.fast` | `--tds-motion-duration-fast` |
| `transitionEasing` | `motion.easing.standard` | `--tds-motion-easing-standard` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
