<!-- AUTO-GENERATED from contracts/StatusBadge.contract.json — DO NOT EDIT (pnpm codegen) -->

# StatusBadge API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/StatusBadge.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

상태 배지 — 게시/노출/시행 등 도메인 상태를 색(tone)과 문구(label)로 이중 전달하는 비대화형 pill. 출처: apps/admin/src/shared/ui/StatusBadge.tsx (소비 54곳: 마케팅·상품·예약·영업·고객지원·회사·콘텐츠 목록의 상태 열). 도메인을 모른다 — 무엇의 상태인지 알지 못하고 tone(색 의도)과 label(문구)만 받는다. 호출부가 '게시→success', '임시저장→neutral' 처럼 도메인 상태→tone 을 정한다.

[색만으로 의미를 전달하지 않는다 — WCAG 1.4.1] label 문구가 상태 의미를 담고 tone 색은 보조다. 그래서 색약 사용자도 문구로 상태를 읽는다.

[루트는 별도 role 없는 <span>] 현행 구현은 단순 <span> 이며 ARIA role 을 부여하지 않는다 — 인접 문맥(행·항목 제목)이 이 배지가 무엇의 상태인지 제공한다. role="status" 라이브 리전으로 만들면 목록의 수십 개 배지가 과도하게 통지되므로 두지 않는다 (Badge 와 대비되는 판정 — Badge 는 카운트 단독 표시라 role=status).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `atom` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `tone` | `'neutral'` \| `'success'` \| `'warning'` \| `'danger'` \| `'info'` | — | ✅ | `Tone` | 색 의도 — 무엇의 상태인지가 아니라 '중립/좋음/주의/위험/정보'만 표현한다. neutral 은 회색 표면(surface-raised)+테두리(border-default), 나머지 4종은 feedback 토큰 페어(surface/border/text). 호출부가 도메인 상태→tone 매핑을 소유한다 |
| `label` | `string` | — | ✅ | — | 상태 문구 — 색만으로 의미를 전달하지 않도록(WCAG 1.4.1) 상태 의미를 담는 텍스트. 예: '게시', '임시저장', '노출', '만료' |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `none — 비대화형 텍스트 배지. label 텍스트가 상태 의미를 전달하고(색은 보조 · WCAG 1.4.1 충족) 별도 ARIA role 을 두지 않는다 (현행 구현: 단순 <span>). 인접 문맥이 이 배지가 무엇의 상태인지 제공한다` |
| 키보드 | `none — 비대화형. 포커스 순서에 들어가지 않는다` |
| focus-visible | 해당 없음 |
| `color-not-alone` | 색만으로 의미를 전달하지 않는다 (WCAG 1.4.1) — label 문구가 상태 의미를 담는다 |
| `no-live-region` | role=status(aria-live) 를 두지 않는다 — 목록에 다수가 렌더되므로 라이브 통지가 과도해진다. 인접 제목/행이 접근 문맥을 제공한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `neutralSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `neutralText` | `color.text.muted` | `--tds-color-text-muted` |
| `neutralBorder` | `color.border.default` | `--tds-color-border-default` |
| `surfaceSuccess` | `color.feedback.success.surface` | `--tds-color-feedback-success-surface` |
| `borderSuccess` | `color.feedback.success.border` | `--tds-color-feedback-success-border` |
| `textSuccess` | `color.feedback.success.text` | `--tds-color-feedback-success-text` |
| `surfaceWarning` | `color.feedback.warning.surface` | `--tds-color-feedback-warning-surface` |
| `borderWarning` | `color.feedback.warning.border` | `--tds-color-feedback-warning-border` |
| `textWarning` | `color.feedback.warning.text` | `--tds-color-feedback-warning-text` |
| `surfaceDanger` | `color.feedback.danger.surface` | `--tds-color-feedback-danger-surface` |
| `borderDanger` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `textDanger` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `surfaceInfo` | `color.feedback.info.surface` | `--tds-color-feedback-info-surface` |
| `borderInfo` | `color.feedback.info.border` | `--tds-color-feedback-info-border` |
| `textInfo` | `color.feedback.info.text` | `--tds-color-feedback-info-text` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |
| `radius` | `radius.full` | `--tds-radius-full` |
| `paddingX` | `space.2` | `--tds-space-2` |
| `typography` | `typography.label.sm` | `--tds-typography-label-sm` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
