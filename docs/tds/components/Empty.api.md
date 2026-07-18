<!-- AUTO-GENERATED from contracts/Empty.contract.json — DO NOT EDIT (pnpm codegen) -->

# Empty API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Empty.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

빈 결과 상태 — data view 가 0행일 때 '왜 비었는지'와 '어떻게 벗어나는지'를 구분해 보여주는 전용 컴포넌트. 단일 '표시할 항목이 없습니다' 문구는 '아직 없으니 추가하라'와 '검색이 안 맞으니 지워라'를 구분할 수 없다 (STATE-05).

[3가지 상태 — context 로 자동 분기] hasQuery / hasActiveFilters 로 상태를 고른다.
  (a) 진짜 비어있음(no query · no filters) → 아이콘 + '{createVerb}된 {label}이(가) 없습니다' + (있으면) 생성 CTA 슬롯(action).
  (b) 검색 결과 없음(hasQuery) → '조건에 맞는 {label}이(가) 없습니다' + '검색 지우기'(onClearSearch).
  (c) 필터 결과 없음(hasActiveFilters) → '필터에 맞는 {label}이(가) 없습니다' + '필터 초기화'(onResetFilters).
분기 우선순위: hasQuery > hasActiveFilters > 진짜 비어있음.

[조사(助詞) 처리 — ERP-13] label 의 마지막 한글 음절 받침 유무로 '이/가' 를 고른다 — '회원이' vs '카페가'. 리터럴 '이(가)' 를 출하하지 않는다.

[도메인 무지] 무엇이 비었는지(label)·동사(createVerb)·context(hasQuery/hasActiveFilters)·복구 콜백만 받는다. 생성 CTA 는 대상 route 를 아는 앱이 슬롯(action)으로 넣는다.

[imperative props — 계약 밖 경계] onClearSearch·onResetFilters 는 명령형 배선이라 Figma 대응이 없다. 지정되지 않으면 해당 복구 버튼을 그리지 않는다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `molecule` |
| 카테고리 | `Feedback` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `Button` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `label` | `string` | — | ✅ | — | 대상 명사 — '회원', '공지', '문의' 등. 조사('이/가')는 마지막 음절 받침으로 자동 선택된다 |
| `createVerb` | `string` | `"등록"` | — | — | 진짜 비어있음 상태 문구의 동사 — '등록'/'접수' 등. '{createVerb}된 {label}…' 로 조립된다 |
| `hasQuery` | `boolean` | `false` | — | `HasQuery` | 검색어가 적용된 상태. true 면 '검색 결과 없음'(b) 으로 분기한다 (filter/empty 보다 우선) |
| `hasActiveFilters` | `boolean` | `false` | — | `HasActiveFilters` | 필터가 적용된 상태. hasQuery 가 false 이고 이것이 true 면 '필터 결과 없음'(c) 으로 분기한다 |
| `action` | ReactNode (허용: Button) | `null` | — | — | 진짜 비어있음(a) 상태의 primary 생성 CTA 슬롯 — 대상 route 를 아는 앱이 <Button> 을 넣는다. 검색/필터 상태에서는 렌더하지 않는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onClearSearch` | `void` | — | 검색 결과 없음(b) 상태에서 '검색 지우기' 클릭. 지정되면 버튼을 그린다 — 미지정이면 그리지 않는다 |
| `onResetFilters` | `void` | — | 필터 결과 없음(c) 상태에서 '필터 초기화' 클릭. 지정되면 버튼을 그린다 — 미지정이면 그리지 않는다 |

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `status` |
| 키보드 | `Tab`, `Enter`, `Space` |
| focus-visible | 필수 |
| `role` | status(=aria-live polite) — 빈 상태가 렌더되면 스크린리더가 '왜 비었는지'를 읽는다. 삽화 아이콘은 aria-hidden |
| `recovery` | 복구 버튼(검색 지우기/필터 초기화)은 DS Button 이라 focus-visible 링·키보드 활성화를 상속한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `iconColor` | `color.text.muted` | `--tds-color-text-muted` |
| `titleText` | `color.text.default` | `--tds-color-text-default` |
| `descriptionText` | `color.text.muted` | `--tds-color-text-muted` |
| `gap` | `space.4` | `--tds-space-4` |
| `actionGap` | `space.3` | `--tds-space-3` |
| `titleTypography` | `typography.title.md` | `--tds-typography-title-md` |
| `descriptionTypography` | `typography.body.md` | `--tds-typography-body-md` |
| `paddingBlock` | `space.10` | `--tds-space-10` |
| `paddingInline` | `space.7` | `--tds-space-7` |
| `glyphSize` | `space.9` | `--tds-space-9` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
