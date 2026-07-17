<!-- AUTO-GENERATED from contracts/ConfirmDialog.contract.json — DO NOT EDIT (pnpm codegen) -->

# ConfirmDialog API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/ConfirmDialog.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

확인 다이얼로그 — CRUD 확인의 단일 창구. Modal 을 조립해 의도(intent)별 톤·라벨·아이콘을 강제한다 (ADR-0003). 도메인을 모른다 — 무엇을 확인하는지는 title/message 로 받는다.

[intent 가 톤·기본 라벨·아이콘을 정한다] create='만들기'/primary/원+, update='저장'/primary/연필, delete='삭제'/danger/휴지통, discard='나가기'/danger/삼각형. 호출부가 매번 색과 문구를 고르면 같은 '삭제'가 화면마다 다른 색으로 보인다 — 그래서 의도만 받는다.

[실패는 다이얼로그를 닫지 않는다] error 를 주면 다이얼로그 안에 danger 배너(Alert)로 뜨고 확인 버튼이 되살아난다 — 재클릭이 곧 재시도다. (모달이 떠 있는 동안 토스트는 시선 밖이고 닫히면 사라지므로 여기서는 인라인 배너를 쓴다.)

[busy 잠금] busy 면 확인 버튼이 비활성(aria-busy)되어 중복 클릭을 막는다 — 확인은 요청 1건만 만든다. busy 중에도 취소/Esc/딤 클릭은 살아 있다(진행 중 요청의 abort 경로는 호출부 onCancel 이 소유).

[취소 토스트는 앱의 것] 취소 시 '작업이 취소되었습니다' 토스트는 앱(shared/ui 어댑터 + useToast)이 얹는다 — DS 는 토스트 큐를 모른다. DS 는 onCancel 을 부르기만 한다.

[imperative props — 계약 밖 경계] onConfirm(필수)·onCancel(필수)은 명령형 배선이라 Figma 대응이 없다. error/confirmLabel/cancelLabel 은 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.0.0` |
| 레벨 | `organism` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |
| 의존 컴포넌트 | `Modal`, `Alert`, `Button` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `intent` | `'create'` \| `'update'` \| `'delete'` \| `'discard'` | — | ✅ | `Intent` | 확인의 의도 — 톤(primary/danger)·기본 확인 라벨·아이콘을 함께 결정한다. 앱 전체에서 '삭제'가 항상 같은 빨강으로 보이게 하는 장치다 |
| `title` | `string` | — | ✅ | — | 다이얼로그 제목 |
| `message` | `string` | — | ✅ | — | 확인 문구 — 무엇을 확인하는지 사람이 읽는 문장 |
| `confirmLabel` | `string` | `""` | — | — | 확인 버튼 라벨. 빈 문자열이면 intent 의 기본 라벨을 쓴다 ('회원 삭제' 처럼 대상을 밝힐 때만 덮어쓴다) |
| `cancelLabel` | `string` | `"취소"` | — | — | 취소 버튼 라벨 |
| `busy` | `boolean` | `false` | — | `Busy` | 확인 진행 중 — 확인 버튼을 비활성(aria-busy)하고 라벨을 '처리 중…' 으로 바꿔 중복 클릭을 막는다. 취소/Esc/딤은 살아 있다 |
| `error` | `string` | `""` | — | — | 빈 문자열이 아니면 본문 아래에 danger 배너(Alert)로 표시된다. 복구 경로는 확인 버튼 재클릭이다 (실패해도 다이얼로그를 닫지 않는다) |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onConfirm` | `void` | `busy` | 확인 버튼 클릭. busy 중에는 발화 금지 (구현은 확인 버튼을 disabled 로 잠근다) — Storybook Play Function이 전수 검증 |
| `onCancel` | `void` | — | 취소·Esc·딤 클릭. 진행 중 요청이 있으면 호출부가 여기서 abort 한다. busy 중에도 살아 있다 |

## States

`default` · `loading` · `error`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `dialog` |
| 키보드 | `Escape`, `Enter`, `Tab`, `Shift+Tab` |
| focus-visible | 필수 |
| aria-busy | confirm 버튼은 busy 일 때 aria-busy=true (스피너 없이 aria-busy 만 — 라벨이 '처리 중…' 으로 바뀐다) |
| `dialog` | Modal 이 role=dialog + aria-modal + aria-labelledby(제목) + aria-describedby(본문 메시지)를 제공한다. ConfirmDialog 는 message 요소에 id 를 부여하고 Modal.describedBy 로 넘겨 open 시 제목과 확인 문구가 함께 announce 되게 한다 (dependencies: Modal, A11Y-02) |
| `error` | error 가 비어 있지 않으면 Alert(role=alert, tone=danger)로 즉시 통지한다 (dependencies: Alert) |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `messageText` | `color.text.default` | `--tds-color-text-default` |
| `iconPrimary` | `color.action.primary.default` | `--tds-color-action-primary-default` |
| `iconDanger` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `bodyGap` | `space.3` | `--tds-space-3` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
