---
# ── D5 · Review Report 템플릿 (모든 Reviewer 공통) ──────────────────────
# 경로 규칙: 각 Reviewer의 review 소유 경로 하위 RR-<gate>-<id>.md
#   예: docs/plan/review/RR-G1-001.md, packages/ui/review/RR-G5-014.md, docs/review/code/RR-G6-003.md
# ★ 이 frontmatter는 orchestration/schemas/review-report.v1.json을 준수해야 한다 —
#   오케스트레이터가 기계 파싱하므로 스키마 위반은 그 자체로 blocker다.
#   필수 필드: gate, target, reviewer, producer, result, date, checklist
gate: G5                        # G0~G8
target: Button@2.1.0            # <Name>@<semver> 형식 강제
reviewer: A33                   # agent id만 (^A\d{2}$). "A33 (Storybook Reviewer)" 형식은 스키마 위반
producer: A30
result: BLOCKED                 # APPROVED | CHANGES_REQUESTED | BLOCKED
severity: blocker               # blocker | major | minor | nit | none — 발견된 최고 심각도
date: 2026-07-14
reworkCount: 0                  # 0~3. 3 도달 시 자동 ESCALATED (gates.json stateMachine)
slaHours: 4
checklist:                      # 게이트 체크리스트(docs/_templates/checklists/G<n>.md) 전 항목을 옮겨 적는다
  - item: "Contract의 모든 prop이 argTypes에 존재"
    pass: true
    evidence: reports/contract-test/2026-07-14.json
  - item: "variant × size × state 조합 Story 커버리지 100%"
    pass: true
    evidence: reports/contract-test/2026-07-14.json
  - item: "Dark mode Story 존재"
    pass: false
    evidence: "Storybook 탐색 결과 Dark Story 부재 (pnpm sb)"
  - item: "RTL 레이아웃 정상"
    pass: true
    evidence: "story id: atoms-button--rtl"
  - item: "Play Function: loading 중 onClick 차단 검증"
    pass: false
    evidence: "Button.play.ts에 해당 케이스 없음"
  - item: "a11y: axe violation 0"
    pass: true
    evidence: reports/a11y/2026-07-14.json
findings:
  - severity: major
    location: Button.stories.tsx
    description: "Dark 배경 Story 없음"
    requiredAction: "parameters.backgrounds 추가"
    reproduction: "pnpm sb → Button 스토리 목록에서 dark variant 부재 확인"
  - severity: blocker
    location: Button.play.ts
    description: "loading 시 클릭 차단 미검증"
    requiredAction: "Play Function 추가 (events.onClick.blockedWhen: [disabled, loading] 전수 검증)"
    reproduction: "pnpm test → play function 목록에 loading 차단 케이스 없음"
---

<!--
[작성 지침]
- Reviewer는 판정만 한다. 대상 산출물을 직접 수정하면 P1(단일 소유권) 위반.
- 체크리스트에 없는 개인 취향으로 반려 금지 — 규칙 추가가 필요하면 A01에 제안.
- 판정 규칙: blocker ≥ 1 → BLOCKED / major ≥ 1 → CHANGES_REQUESTED /
  minor·nit만 → APPROVED (후속 티켓 발행).
- 반려 사유는 반드시 재현 방법(reproduction) + 기대 결과(requiredAction)를 포함한다.
- 본문은 frontmatter의 사람용 요약이다 — 값이 다르면 frontmatter가 정본.
- 아래 본문 예시(설계서 §6.1)를 대상에 맞게 치환해 사용한다.
-->

## 검수 기준 (Checklist)

- [x] Contract의 모든 prop이 argTypes에 존재
- [x] variant(4) × size(3) × state(6) 조합 Story 커버리지 100%
- [ ] Dark mode Story 누락  ← ❌
- [x] RTL 레이아웃 정상
- [ ] Play Function: loading 중 onClick 차단 검증 없음  ← ❌
- [x] a11y: axe violation 0

## 지적사항

| # | 심각도 | 위치 | 내용 | 요구 조치 |
|---|---|---|---|---|
| 1 | major | Button.stories.tsx | Dark 배경 Story 없음 | `parameters.backgrounds` 추가 |
| 2 | blocker | Button.play.ts | loading 시 클릭 차단 미검증 | Play Function 추가 |

## 판정

BLOCKER 1건 → **BLOCKED** (판정 규칙: blocker ≥ 1 → BLOCKED). G5 미통과. A30에게 반려. 재검수 SLA: 4h
