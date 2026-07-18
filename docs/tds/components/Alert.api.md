<!-- AUTO-GENERATED from contracts/Alert.contract.json — DO NOT EDIT (pnpm codegen) -->

# Alert API

> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.
> 변경이 필요하면 `contracts/Alert.contract.json` 을 수정한 뒤 `pnpm codegen` 을 실행하세요.

피드백 메시지 — 인라인 안내/에러 배너. 출처: apps/admin/src/pages/login/components/Alert.tsx · apps/admin/src/shared/ui/Alert.tsx. 색상만으로 의미를 전달하지 않도록(WCAG 1.4.1) tone 별 아이콘을 함께 렌더한다. tabIndex=-1 이라 바깥에서 프로그래매틱 포커스를 옮길 수 있다(제출 실패 시 에러로 포커스 이동).

[루트 요소는 블록 컨테이너(<div>) 다 — <p> 가 아니다] children 은 node 슬롯이고 실호출부가 블록 자식을 넘긴다 (MemberDetailPage: <div> + 재시도/목록 <Button> 2개). <p> 안의 <div> 는 브라우저가 <p> 를 자동으로 닫아 레이아웃이 붕괴한다. 현행 구현(Alert.tsx:52)이 <p> 를 쓰고 있다 — 정정 대상. role/aria-live/tabIndex 는 그대로 유지한다.

[ref] 배너 포커스 이동용 ref 는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField 와 동일 판정).

## 개요

| 항목 | 값 |
|---|---|
| 버전 | `1.1.0` |
| 레벨 | `atom` |
| 카테고리 | `Feedback` |
| 상태 | `beta` |
| 소유 | code `component-eng` · design `ui-design` · figma `figma-eng` |

## Props

| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |
|---|---|---|---|---|---|
| `tone` | `'danger'` \| `'info'` \| `'success'` \| `'warning'` | `"danger"` | — | `Tone` | 메시지 의미. 색상(feedback 토큰)과 아이콘, 그리고 라이브 리전 시맨틱(danger=assertive / 그 외=polite)을 함께 결정한다 |
| `children` | ReactNode | — | ✅ | — | 메시지 본문. 아이콘 옆 <span> 으로 렌더된다 |
| `id` | `string` | `""` | — | — | 요소 id. 폼 컨트롤의 aria-describedby 로 이 메시지를 가리킬 때 쓴다. 빈 문자열이면 id 를 부여하지 않는다 |

## Events

| 이름 | Payload | 발화 차단 상태 | 설명 |
|---|---|---|---|
| `onClose` | `MouseEvent` | — | 닫기(×) 버튼 클릭. **핸들러를 주면 닫기 버튼이 나타나고, 주지 않으면 나타나지 않는다** — 해제 가능 여부는 별도 boolean 이 아니라 이 핸들러의 유무로 결정한다 (shared/ui 선례). 배너를 언마운트하는 것은 호출부의 책임이다 (실사용: MembersPage 상단 안내 배너). 버튼의 접근 가능한 이름은 aria-label="안내 닫기" |

## States

`default`

> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).
> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.

## A11y

| 항목 | 값 |
|---|---|
| role | `alert` |
| 키보드 | `none — 배너 본문은 비대화형이다. 탭 순서에 들어가지 않는다(tabIndex=-1, 프로그래매틱 포커스만 허용)`, `Tab · Enter · Space — onClose 를 주면 닫기(×) 버튼이 탭 순서에 들어간다` |
| focus-visible | 필수 |
| `close-button` | onClose 가 있을 때만 렌더한다. <button type="button" aria-label="안내 닫기"> — 아이콘만 있으므로 접근 가능한 이름을 aria-label 로 준다 |
| `live-override` | 라이브 리전 시맨틱은 tone 이 결정한다 (danger=alert/assertive · 그 외=status/polite). 별도 live 오버라이드 prop 은 두지 않는다 — apps/admin 의 Alert 호출부 10곳을 전수 대조한 결과 (tone, live) 조합이 전부 이 커플링과 일치했다 (danger→alert 6곳 · info/warning→status 4곳). 커플링을 끊어야 하는 실호출부가 0곳이므로 opt-out prop 은 소망 표면이다. 어긋나는 화면이 실제로 생기면 그때 추가한다 |
| `role` | tone=danger 는 role="alert" (즉시 통지). tone=info\|success\|warning 은 role="status" (대기 통지). 이 계약의 role 필드값 alert 는 기본 tone(danger) 기준이다 |
| `aria-live` | role 과 짝: danger=assertive, info\|success\|warning=polite |
| `tabindex` | -1 — 제출 실패 시 바깥(폼)에서 이 요소로 포커스를 옮길 수 있게 프로그래매틱 포커스를 허용한다 |
| `icon` | 색상만으로 의미를 전달하지 않는다 (WCAG 1.4.1) — tone 별 아이콘(danger=경고 삼각형, 그 외=정보)을 텍스트와 함께 렌더한다 |
| 최소 대비 | 4.5:1 |

## Tokens

| 시각 속성 | 토큰 경로 | CSS 변수 |
|---|---|---|
| `surfaceDanger` | `color.feedback.danger.surface` | `--tds-color-feedback-danger-surface` |
| `borderDanger` | `color.feedback.danger.border` | `--tds-color-feedback-danger-border` |
| `textDanger` | `color.feedback.danger.text` | `--tds-color-feedback-danger-text` |
| `surfaceInfo` | `color.feedback.info.surface` | `--tds-color-feedback-info-surface` |
| `borderInfo` | `color.feedback.info.border` | `--tds-color-feedback-info-border` |
| `textInfo` | `color.feedback.info.text` | `--tds-color-feedback-info-text` |
| `surfaceSuccess` | `color.feedback.success.surface` | `--tds-color-feedback-success-surface` |
| `borderSuccess` | `color.feedback.success.border` | `--tds-color-feedback-success-border` |
| `textSuccess` | `color.feedback.success.text` | `--tds-color-feedback-success-text` |
| `surfaceWarning` | `color.feedback.warning.surface` | `--tds-color-feedback-warning-surface` |
| `borderWarning` | `color.feedback.warning.border` | `--tds-color-feedback-warning-border` |
| `textWarning` | `color.feedback.warning.text` | `--tds-color-feedback-warning-text` |
| `radius` | `radius.md` | `--tds-radius-md` |
| `paddingX` | `space.3` | `--tds-space-3` |
| `paddingY` | `space.3` | `--tds-space-3` |
| `gap` | `space.2` | `--tds-space-2` |
| `focusRing` | `color.border.focus` | `--tds-color-border-focus` |
| `focusRingOffset` | `space.1` | `--tds-space-1` |
| `typography` | `typography.label.md` | `--tds-typography-label-md` |

> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.

## Responsive

| 브레이크포인트 | 동작 |
|---|---|
| `sm`, `md`, `lg` | `fluid` |
