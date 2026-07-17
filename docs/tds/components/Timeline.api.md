<!-- AUTO-GENERATED from contracts/Timeline.contract.json — DO NOT EDIT (pnpm codegen) -->

# Timeline API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Timeline.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

이벤트 타임라인 — 시간순 이력 목록. StatusBadge 를 조립해 각 이벤트를 배지 톤·라벨·작성자·시각·본문으로 보여준다 (ADR-0003). 도메인을 모른다 — 무슨 이벤트인지 알지 못하고, 각 페이지가 자기 이벤트(문의·티켓·예약)를 표시용 TimelineEvent 로 매핑해 넘긴다.

[시각 포맷] at 은 ISO 문자열이고 컴포넌트가 'YYYY-MM-DD HH:mm' 로 표기한다(로컬 타임존). 포맷터는 외부 의존이 없는 순수 함수로 컴포넌트에 co-locate 한다(앱 shared/format 을 끌어오지 않는다 — @tds/ui 자립).

[events 는 데이터 prop] Figma Component Property 대응이 없다 (ADR-0003). 빈 배열이면 emptyLabel 문구를 렌더한다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `molecule` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `StatusBadge` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `events` | `array` | — | ✅ | — | 표시용으로 환산된 타임라인 이벤트 목록. at 은 ISO 시각, badgeTone/badgeLabel 은 StatusBadge 로 렌더, author/text 는 작성자/본문. 빈 배열이면 emptyLabel 을 렌더한다. 데이터 prop — Figma 대응 없음 (ADR-0003) |
| `label` | `string` | — | ✅ | — | 스크린 리더용 목록 이름 — '문의 처리 이력' 등. <ol> 의 aria-label 이 된다 |
| `emptyLabel` | `string` | `"기록된 이력이 없습니다."` | — | — | events 가 빈 배열일 때 표시할 문구 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `list` |
| 키보드 | `none — 정적 이력 목록이라 상호작용 키가 없다 (탭 순서에 들어가지 않는다)` |
| focus-visible | 해당 없음 |
| `aria-label` | label prop — <ol> 에 목록 이름을 부여한다 |
| `badge` | 각 이벤트의 상태는 StatusBadge(tone+label)로 색과 문구로 이중 전달한다 (dependencies: StatusBadge) |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `itemBorder` | `color.border.default` | `--tds-color-border-default` |
| `itemSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `author` | `color.text.default` | `--tds-color-text-default` |
| `time` | `color.text.muted` | `--tds-color-text-muted` |
| `text` | `color.text.default` | `--tds-color-text-default` |
| `empty` | `color.text.muted` | `--tds-color-text-muted` |
| `gap` | `space.3` | `--tds-space-3` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
