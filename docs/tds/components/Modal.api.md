<!-- AUTO-GENERATED from contracts/Modal.contract.json — DO NOT EDIT (pnpm codegen) -->

# Modal API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Modal.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

모달 다이얼로그 껍데기 — 딤(backdrop) + 가운데 정렬 다이얼로그 + 헤더(아이콘·제목·닫기) + 본문 슬롯 + 푸터 슬롯. 도메인을 모른다 — 무엇을 확인/입력받는지는 조립하는 쪽(ConfirmDialog·폼 모달)이 정한다 (ADR-0003).

[라이프사이클·a11y] role="dialog" + aria-modal + aria-labelledby(제목). 열릴 때 지정 요소(또는 첫 포커스 가능 요소)로 포커스를 옮기고, 닫히면 열기 직전 요소로 포커스를 복귀한다. 열려 있는 동안 배경 스크롤을 잠근다. Tab/Shift+Tab 은 다이얼로그 안에서 순환(포커스 트랩)하고, Esc·딤 클릭·닫기 버튼이 닫는다 (Esc 는 stopPropagation 으로 최상단 모달만 닫아 중첩을 보존한다).

[imperative props — 계약 밖 컴포넌트 경계] onClose(필수)·onSubmit(폼 모달)·initialFocusRef 는 명령형 배선이라 Figma Component Property 대응이 없다. Card 의 네이티브 속성 패스스루와 같은 원리로 **컴포넌트 경계**에서 받는다 — 계약 props(제목·아이콘·본문·푸터)는 디자인이 보는 표면만 기술한다.

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `organism` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `title` | `string` | — | ✅ | — | 다이얼로그 제목 — aria-labelledby 로 role=dialog 에 접근성 이름을 준다 |
| `icon` | ReactNode (허용: Icon) | `null` | — | — | 제목 왼쪽 아이콘 슬롯 — 의도(생성/수정/삭제/이탈)를 색과 함께 이중으로 전달한다. 없으면 제목만 렌더 |
| `children` | ReactNode | — | ✅ | — | 본문 슬롯. 확인 문구·폼 필드 등 조립하는 쪽이 주입한다 |
| `footer` | ReactNode | — | ✅ | — | 푸터 슬롯 — 오른쪽 정렬된 액션 버튼들(취소/확인 등). 조립하는 쪽이 주입한다 |

## Events

_계약에 정의된 이벤트가 없습니다._

## States

`open`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `dialog` |
| 키보드 | `Tab`, `Shift+Tab`, `Escape` |
| focus-visible | 필수 |
| `aria-modal` | true — 배경 요소를 보조기술에서 격리한다 |
| `aria-labelledby` | 제목 요소를 가리켜 다이얼로그에 접근성 이름을 부여한다 |
| `aria-describedby` | 조립하는 쪽이 본문(목적) 요소 id 를 describedBy(명령형 prop)로 주면 open 시 title 과 함께 본문 메시지가 announce 된다 — aria-labelledby 만으로는 제목만 읽힌다 (A11Y-02) |
| `focus` | 열릴 때 initialFocusRef(없으면 첫 포커스 가능 요소)로 포커스, 닫히면 열기 직전 요소로 복귀 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `overlayPaddingY` | `space.6` | `--tds-space-6` |
| `overlayPaddingX` | `space.4` | `--tds-space-4` |
| `backdrop` | `color.overlay` | `--tds-color-overlay` |
| `surface` | `color.surface.default` | `--tds-color-surface-default` |
| `shadow` | `shadow.modal` | `--tds-shadow-modal` |
| `border` | `color.border.default` | `--tds-color-border-default` |
| `radius` | `component.modal.radius` | `--tds-component-modal-radius` |
| `padding` | `space.5` | `--tds-space-5` |
| `gap` | `space.4` | `--tds-space-4` |
| `headerGap` | `space.3` | `--tds-space-3` |
| `title` | `color.text.default` | `--tds-color-text-default` |
| `titleTypography` | `typography.title.xl` | `--tds-typography-title-xl` |
| `closeIcon` | `color.text.muted` | `--tds-color-text-muted` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
