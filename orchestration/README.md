# orchestration/ — 오케스트레이션 운영 규정

TDS AI 조직의 실행 상태가 사는 곳이다. 에이전트 간 모든 전달은 산문이 아니라
이 디렉터리의 **기계 검증 가능한 파일**로 이뤄진다 (P2 계약 우선).

```
orchestration/
├── registry/     ★ SSOT — agents.json(39 에이전트), gates.json(G0~G8) · 소유: A01
├── schemas/      envelope·리포트·레지스트리 JSON Schema · 소유: A01
├── tasks/        핸드오프 envelope 파일 (TASK-*.json, CR-*.json) · 소유: A00
└── state/        컴포넌트별 게이트 상태 JSON · 소유: A00
```

---

## 1. registry/ — 단일 원천 (SSOT)

- `agents.json`: 39개 에이전트의 id · owns · reads · gate · reviewer · escalatesTo.
  **CODEOWNERS(`pnpm boundary:codeowners`) · skills/ frontmatter · 오케스트레이션이 전부
  이 파일에서 파생된다.** SKILL.md frontmatter가 레지스트리와 불일치하면 검증 단계에서
  blocker 처리된다.
- `gates.json`: 게이트 정의(승인자/생산자/차단자/진입·통과 조건/SLA), 상태머신, SLO,
  병목 튜닝 규칙(fastPath 등).
- **변경 절차**: 레지스트리·스키마 수정은 **A01(Architecture AI)만** 가능하며 ADR 승인이
  선행되어야 한다 (예: ADR-0001). 다른 에이전트는 change_request로 제안만 한다.
- 검증: `pnpm validate:registry`.

## 2. tasks/ — 핸드오프 envelope

모든 에이전트 간 통신(handoff / review_request / review_result / escalation /
change_request)은 envelope 파일로 기록한다.

- **파일 규칙**: `TASK-YYYY-MMDD-NNN.json` (NNN은 당일 001부터 연번).
  change_request는 `CR-YYYY-MMDD-NNN.json`.
- **스키마**: `orchestration/schemas/handoff.v1.json` /
  `orchestration/schemas/change-request.v1.json` — 스키마 위반 envelope은 수신자가
  작업을 시작하지 않고 반려한다.
- **필수 필드 요약** (handoff.v1.json): `id`, `type`, `from`, `to`, `gate`, `subject`,
  `artifacts`(산출물 리포 상대 경로), `preconditions_met`(contract_approved ·
  contract_version · tokens_available), `automated_checks`(자동 검증 스냅샷),
  `sla_hours`, `escalation_count`(0~3, 3 도달 시 자동 에스컬레이션).
- **쓰기 규칙**: 파일 생성·갱신은 A00(오케스트레이터)이 수행한다. 발신 에이전트는
  envelope 내용을 A00에 제출하고, A00이 검증 후 기록한다. envelope은 불변 —
  정정이 필요하면 새 envelope을 발행한다.

## 3. state/ — 컴포넌트별 게이트 상태

컴포넌트 하나당 파일 하나: `orchestration/state/<component-slug>.json` (예: `button.json`).
모든 게이트 판정·반려·에스컬레이션은 이 파일에 반영되어야 유효하다 (구두 승인 무효).

### 규격

```jsonc
{
  "component": "Button",            // 계약의 name과 일치 (PascalCase)
  "version": "2.1.0",               // 현재 진행 중인 계약 SemVer
  "gates": {
    "G1": {
      "status": "APPROVED",         // DRAFT | IN_REVIEW | APPROVED | REWORK | ESCALATED | SKIPPED
      "reviewer": "A12",            // 해당 게이트 승인자 (gates.json approver와 일치)
      "reportPath": "docs/plan/review/RR-G1-007.md",  // D5 리포트 경로. 판정 전이면 null
      "reworkCount": 0              // 0~3. 3 도달 시 status는 ESCALATED여야 함
    },
    "G2": { "status": "SKIPPED", "reviewer": "A17", "reportPath": null, "reworkCount": 0,
            "skipReason": "EXTEND fastPath — TASK-2026-0714-031 참조" },
    "G3": { "status": "IN_REVIEW", "reviewer": "A19", "reportPath": null, "reworkCount": 1 },
    "G4": { "status": "DRAFT", "reviewer": "A21", "reportPath": null, "reworkCount": 0 },
    "G5": { "status": "DRAFT", "reviewer": "A33", "reportPath": null, "reworkCount": 0 },
    "G6": { "status": "DRAFT", "reviewer": "A42", "reportPath": null, "reworkCount": 0 },
    "G7": { "status": "DRAFT", "reviewer": "A56", "reportPath": null, "reworkCount": 0 },
    "G8": { "status": "DRAFT", "reviewer": "A03", "reportPath": null, "reworkCount": 0 }
  }
}
```

- `status`의 기본 상태 집합은 gates.json stateMachine의 5개
  (DRAFT/IN_REVIEW/APPROVED/REWORK/ESCALATED)이며, fastPath 생략 게이트만
  `SKIPPED` + `skipReason`(근거 envelope id 필수)을 쓴다.
- `reportPath`는 review-report.v1.json을 준수하는 RR 파일을 가리켜야 한다.
  APPROVED/REWORK/ESCALATED 상태인데 reportPath가 null이면 상태 자체가 무효.
- 갱신 주체는 A00뿐이다. Reviewer는 RR 파일과 review_result envelope으로 판정을
  제출하고, A00이 state에 반영한다.

## 4. 상태머신 규칙 요약 (정본: registry/gates.json → stateMachine)

```
DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──▶ 다음 게이트
                     │
                     ├─changes_requested──▶ REWORK ──resubmit──▶ IN_REVIEW
                     │                        (guard: reworkCount <= 2)
                     │                        reworkCount == 3 ──▶ ESCALATED
                     └─blocked────────────▶ ESCALATED
```

- **재작업 한도**: REWORK → IN_REVIEW 재제출은 reworkCount ≤ 2까지. 3회째는 자동 ESCALATED.
- **에스컬레이션 체인**: A01(Architecture AI) → A00(CEO AI) → human.
- **루프 방지**: 동일 지적사항 3회 반복 시 자동 에스컬레이션. Reviewer는 지적만 하고
  직접 수정하지 않는다 (P1).
- **G3 Frozen**: G3 APPROVED 이후 계약 변경은 change_request → G3 재진입 + SemVer
  재판정. 계약 버전 불일치 상태의 Layer 2 작업물은 자동 무효.
- **Override**: A00만 게이트 강제 통과 가능 — 반드시 ADR 기록 + 기술부채 티켓 발행.

## 5. 운영 명령 (루트 package.json)

| 명령 | 용도 |
|---|---|
| `pnpm validate:registry` | 레지스트리 스키마·정합성 검증 |
| `pnpm boundary:codeowners` | agents.json → `.github/CODEOWNERS` 생성 (ADR-0001 결정 2) |
| `pnpm boundary:check` | 소유권 위반 검사 (PR 차단 조건) |
| `pnpm gate:precheck` | 계약 검증 + 소유권 + 네이밍 + 4자 일치 일괄 실행 |
