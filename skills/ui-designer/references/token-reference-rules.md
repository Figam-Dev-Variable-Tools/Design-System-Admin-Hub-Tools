# Visual Spec 토큰 참조 규칙

> Visual Spec(DS-NNN, ui)의 모든 시각 값은 `tokens/tokens.json`(W3C DTCG, A20 소유)의 토큰 경로 참조여야 한다.
> A17(Design Reviewer)이 G2 체크리스트 1번 항목("스펙의 모든 값이 토큰 참조인가 — 하드코딩 hex/px 0건")으로 검증한다.

## 1. 참조 표기법

- 형식: 소문자 dot-path — `color.action.primary.default`, `space.4`, `radius.md`, `shadow.raised`
- 계약 스키마(`contracts/schemas/component.v1.json`)의 tokens 패턴과 동일: `^[a-z][a-z0-9]*(\.[a-z0-9-]+)+$`
- 표 안에서는 백틱으로 감싼다: `` `color.text.primary` ``

## 2. 계층 규칙 (G4 정합)

토큰은 3계층이다: `primitive` → `semantic` → `component` (org-design-v2.md §8 G4).

| 계층 | 예 | Visual Spec에서 참조 |
|---|---|---|
| primitive | `color.blue.500`, `size.16` | **금지** — 의미 없는 원시 팔레트. 컴포넌트/스펙이 직접 참조하면 G4 계층 위반과 동형 |
| semantic | `color.action.primary.default`, `color.text.secondary` | 허용 (기본) |
| component | `button.background.primary`, `table.row.height` | 허용 (해당 컴포넌트 스펙에서) |

## 3. 스펙 표 형식

섹션(Layout/Grid/Typography/Color/Shadow/Radius/Spacing)마다:

| 속성 | 토큰 참조 | 상태/조건 | 비고 |
|---|---|---|---|
| 배경 | `color.surface.default` | 라이트/다크 자동 (semantic 페어) | |
| 텍스트 | `color.text.primary` | default | 대비비 12.6:1 (AA 통과) |
| 텍스트 | `color.text.on-action` | hover | 대비비 4.8:1 |
| 행 간격 | `space.3` | 전 브레이크포인트 | |
| 모서리 | `radius.md` | | |

규칙:
- **대비비 열 필수**: 전경/배경 토큰 조합마다 계산값 표기 — 본문 4.5:1, 대형 텍스트·UI 요소 3:1 이상
- 라이트/다크는 semantic 토큰의 페어링에 위임 — 다크 전용 값을 스펙에서 따로 만들지 않는다 (페어 누락 발견 시 A20에 CR)
- 상태(default/hover/active/focus-visible/disabled)별로 행을 분리 — "hover는 조금 어둡게" 같은 상대 서술 금지

## 4. 신규 토큰 요청 절차 (유일한 예외 경로)

기존 토큰으로 표현 불가할 때만. **직접 tokens.json을 만지는 것은 소유권 위반(A20 영역)이다.**

1. 정당화 문서 작성: `docs/design/ui/token-requests/TR-NNN.md`

```yaml
---
id: TR-004
target-token: color.status.dormant     # 제안 토큰 경로 (semantic 계층)
requested-by: A14
related-spec: DS-012
status: open                            # open | accepted | rejected
date: 2026-07-14
---
```

   필수 본문 항목:
   - **기존 토큰 불가 사유**: 시도한 기존 토큰 조합과 탈락 이유 (최소 2개 비교)
   - **유사 토큰 비교표**: 가장 가까운 기존 토큰과의 시각/의미 차이
   - **제안 값**: 라이트/다크 페어 **둘 다** (여기만 원시값 허용 — A20의 입력값)
   - **대비비 검증**: 제안 값이 쓰일 전경/배경 조합의 계산값
   - **사용처 전망**: 재사용 예상 지점 2곳 이상, 또는 "컴포넌트 전용(component 계층)" 명시
2. change_request 발행: `orchestration/schemas/change-request.v1.json` 준수, `orchestration/tasks/CR-YYYY-MMDD-NNN.json`
   - from: A14, to: A20, target: `tokens/tokens.json`, impact: `MINOR`(추가), blocking: `true`
   - reason에 TR 문서 경로 포함, proposed에 제안 토큰 경로와 값 요약
3. A20 수락 → tokens.json 반영(G4 사이클) → 스펙의 `[TR-NNN 대기]` 표기를 실제 토큰 참조로 치환
4. A20 거절 → 기존 토큰으로 재설계. 재설계 불가 시 A01(Architecture AI) 판정

## 5. 하드코딩 자가 검사

DS 문서 제출 전 Grep — **0건**이어야 한다 (`docs/design/ui/token-requests/` 내 '제안 값' 항목만 예외):

```
#[0-9a-fA-F]{3,8}|\b\d+(\.\d+)?(px|rem|em|pt)\b|rgba?\(|hsla?\(
```

## 6. 흔한 반려 사유 (A17 실측 기준)

- "살짝 어두운 회색" 등 서술형 색 지정 → 토큰 경로로 치환
- primitive(`color.gray.200`) 직접 참조 → semantic으로 치환
- 다크 모드 열을 별도 hex로 채움 → semantic 페어에 위임, 페어 없으면 CR
- TR 문서 없이 CR만 발행 → 정당화 문서 필수, CR reason에 TR 경로
- 대비비 열 공란 → 계산값 필수 (미달이면 그 조합 자체가 반려 — 접근성 우선)
