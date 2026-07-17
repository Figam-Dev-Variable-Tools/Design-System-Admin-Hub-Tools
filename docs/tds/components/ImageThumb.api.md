<!-- AUTO-GENERATED from contracts/ImageThumb.contract.json — DO NOT EDIT (pnpm codegen) -->

# ImageThumb API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ImageThumb.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

목록 썸네일 — 작은 이미지. 출처: apps/admin/src/shared/ui/ImageThumb.tsx (소비 3곳: 로고 목록·인증서 목록·리뷰 미리보기). src 가 비었거나(trim 후 빈 문자열) 로드에 실패하면 빈칸/깨진 이미지 대신 이미지 아이콘 placeholder 를 한 곳에서 보장한다. 도메인을 모른다 — 무슨 이미지인지 알지 못하고 src(URL 문자열)와 접근성 이름(alt)만 받는다.

[로드 실패 복구] src 가 바뀌면 실패 플래그를 초기화한다 — 이전 URL 의 실패가 새 URL 로 새지 않는다.

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
| `src` | `string` | — | ✅ | — | 이미지 URL. 앞뒤 공백을 제거한 뒤 빈 문자열이면 placeholder 를 렌더한다. 로드에 실패해도(onError) placeholder 로 폴백한다 |
| `alt` | `string` | — | ✅ | — | 접근성 이름 — 실제 이미지의 alt 이자 placeholder(role=img)의 aria-label 이다. 두 경로 모두 같은 이름으로 읽힌다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`default` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `img` |
| 키보드 | `none — 비대화형 이미지. 포커스 순서에 들어가지 않는다` |
| focus-visible | 해당 없음 |
| `alt-both-paths` | 실제 이미지는 alt 로, placeholder(빈 src·로드 실패)는 role="img" + aria-label={alt} 로 같은 접근 가능한 이름을 준다 |
| `decorative-icon` | placeholder 안의 이미지 아이콘은 aria-hidden 장식이다 — 접근 가능한 이름은 컨테이너(role=img)가 제공한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `placeholderSurface` | `color.surface.raised` | `--tds-color-surface-raised` |
| `placeholderText` | `color.text.muted` | `--tds-color-text-muted` |
| `placeholderBorder` | `color.border.default` | `--tds-color-border-default` |
| `placeholderRadius` | `radius.sm` | `--tds-radius-sm` |
| `borderWidth` | `border-width.thin` | `--tds-border-width-thin` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `size-fixed` |
