# Task Graph JSON 규격 v1

> A00(ceo-orchestrator)이 G0에서 생성하는 실행 계획의 유일한 규격.
> 본 문서가 규격의 원천이다. JSON Schema 파일로 승격하려면 `orchestration/schemas/**` 소유자인 A01의 ADR 승인이 필요하다.

## 1. 파일 위치와 네이밍

| 파일 | 경로 | 규격 |
|---|---|---|
| Task Graph | `orchestration/tasks/TASK-YYYY-MMDD-NNN.graph.json` | 본 문서 |
| 핸드오프/리뷰/에스컬레이션 envelope | `orchestration/tasks/TASK-YYYY-MMDD-NNN.json` | `orchestration/schemas/handoff.v1.json` |
| 게이트 상태 기록 | `orchestration/state/TASK-YYYY-MMDD-NNN.state.json` | §6 |

- `id`는 handoff.v1.json의 id 패턴(`^TASK-\d{4}-\d{4}-\d{3}$`)을 재사용한다. NNN은 당일 연번.
- 두 종류 모두 gates.json G0 exit 조건인 `orchestration/tasks/TASK-*.json` 글롭에 매칭된다.
- Task Graph 파일과 envelope 파일은 전부 A00 소유 경로(`orchestration/tasks/**`)에만 생성한다.

## 2. 최상위 필드

```jsonc
{
  "id": "TASK-2026-0714-001",                       // handoff.v1.json id 패턴
  "target": "Select@2.3.0",                          // Name@version (handoff.v1.json target 패턴)
  "request": "회원관리 화면에 상태 필터(다중 선택) 필요",
  "reuse": {                                         // G0 exit: A75 판정 첨부 필수
    "verdict": "EXTEND",                             // REUSE | EXTEND | CREATE
    "similarity": 0.78,
    "report": "reports/reuse/2026-07-14-select.json" // 리포트 경로 — 없으면 그래프 무효
  },
  "createdBy": "A00",
  "createdAt": "2026-07-14T09:00:00+09:00",
  "newTokensRequired": false,                        // gates.json G4 orderingNote 판단 근거
  "nodes": [ /* §3 */ ],
  "edges": [ /* §4 */ ],
  "parallelGroups": [ /* §5 */ ],
  "skips": [                                         // fastPath skip — 사유 없는 skip은 무효
    { "gate": "G2", "reason": "EXTEND + 기존 variant 조합 재사용, 신규 시각 변경 없음 (gates.json G2 fastPath)" }
  ],
  "stateRef": "orchestration/state/TASK-2026-0714-001.state.json"
}
```

## 3. 노드 — 게이트 × 에이전트

노드 1개 = 특정 게이트에서 특정 에이전트가 수행하는 작업 단위.

```jsonc
{
  "id": "G5:A30",                    // 규칙: "<gate>:<agentId>". gate는 G0~G8 또는 "contract-test-final"
  "gate": "G5",
  "agent": "A30",                    // agents.json에 존재하는 id만 허용
  "role": "producer",                // producer | reviewer | verifier — gates.json의 producers/approver/verifiers와 일치해야 함
  "status": "PENDING",               // PENDING | READY | IN_PROGRESS | DONE | BLOCKED | SKIPPED
  "artifactsExpected": ["packages/ui/src/Select/**"],
  "envelopes": ["TASK-2026-0714-006"] // 이 노드로 발행된 envelope id 목록
}
```

- **노드 status**는 그래프 진행용이고, **게이트 status**(DRAFT/IN_REVIEW/APPROVED/REWORK/ESCALATED)는 gates.json stateMachine을 따라 state 파일(§6)에서 별도로 추적한다. 혼용 금지.
- `SKIPPED`는 `skips[]`에 대응 사유가 있을 때만 유효하며, 합류 배리어 계산에서는 충족으로 간주한다.
- 각 게이트에는 approver 노드(role: reviewer)가 반드시 존재해야 한다 (P3 — skip된 게이트 제외).

## 4. 엣지 — 의존

```jsonc
{ "from": "G3:A19", "to": "G5:A30", "kind": "sequence" }
```

| kind | 의미 |
|---|---|
| `sequence` | from이 DONE(게이트면 APPROVED)이어야 to가 READY |
| `review` | producer → reviewer. from 산출물 제출 시 to에 review_request envelope 발행 |
| `guard` | verifier → 게이트 노드. verifier의 blockCondition 충족 시 to를 BLOCKED로 전환 |

- 그래프는 DAG여야 한다 — 사이클 발견 시 그래프 무효.
- `guard` 엣지는 gates.json의 `blockedBy`/verifiers 정의에서 기계적으로 파생한다 (예: A74 → G5/G6/G7, A72 → G5/G6, A73 → G6, A70 → G7).

## 5. 병렬 그룹

gates.json의 `parallelAfter: true`(G3)와 `parallelGroup: "production"`(G4~G7)을 그래프에 그대로 반영한다.

```jsonc
{
  "id": "production",
  "nodes": ["G4:A20", "G4:A21", "G5:A30", "G5:A31", "G5:A33", "G6:A40", "G6:A42", "G7:A51", "G7:A52", "G7:A56"],
  "joinAt": "contract-test-final:A74"    // 합류 배리어 — G4~G7 전부 APPROVED(또는 SKIPPED) 후 실행
}
```

- **조건부 의존**: `newTokensRequired == true`이면 `G4:A21 → G5/G6/G7 producer 노드`로 sequence 엣지를 추가한다. false면 완전 병렬 (gates.json G4 orderingNote, ADR-0001).
- 합류 배리어 통과(4자 일치 100%) 후에만 `G8` 노드들이 READY가 된다.

## 6. 게이트 상태 기록 (orchestration/state/)

```jsonc
{
  "task": "TASK-2026-0714-001",
  "gates": {
    "G3": {
      "status": "APPROVED",            // gates.json stateMachine 상태값만 허용
      "reworkCount": 1,                 // 3 도달 시 ESCALATED (자동)
      "slaDeadline": "2026-07-14T13:00:00+09:00",
      "approvedBy": "A19",
      "reviewReport": "contracts/review/RR-G3-select-230.md",
      "override": null                  // override 시 { "adr": "docs/adr/NNNN-*.md", "debtTicket": "TASK-..." } 필수
    }
  }
}
```

## 7. 검증 규칙 (그래프 생성 시 A00이 자가 점검)

1. 모든 `agent`가 `orchestration/registry/agents.json`에 존재
2. 모든 `gate`가 `orchestration/registry/gates.json`에 존재하고, 노드 role이 해당 게이트의 producers/approver/verifiers와 일치
3. DAG (사이클 0), 고아 노드 0
4. `reuse.report` 경로 존재 — 없으면 G0 exit 불충족
5. skip된 게이트마다 `skips[]` 사유 존재
6. G3 노드보다 뒤의 모든 생산 노드는 G3 APPROVED에 sequence 의존 (계약 Frozen 이전 Layer 2 착수 금지)
7. `contract-test-final:A74` 배리어가 G8보다 선행

## 8. 전체 예시 — Select@2.3.0 EXTEND (설계서 §7.2 시나리오)

```jsonc
{
  "id": "TASK-2026-0714-001",
  "target": "Select@2.3.0",
  "request": "회원관리 화면 상태 필터 — Select에 multiple(boolean) 추가",
  "reuse": { "verdict": "EXTEND", "similarity": 0.78, "report": "reports/reuse/2026-07-14-select.json" },
  "createdBy": "A00",
  "createdAt": "2026-07-14T09:00:00+09:00",
  "newTokensRequired": false,
  "nodes": [
    { "id": "G1:A11", "gate": "G1", "agent": "A11", "role": "producer", "status": "DONE", "artifactsExpected": ["docs/plan/ui/SCR-012.md"], "envelopes": ["TASK-2026-0714-002"] },
    { "id": "G1:A12", "gate": "G1", "agent": "A12", "role": "reviewer", "status": "DONE", "artifactsExpected": ["docs/plan/review/RR-G1-scr-012.md"], "envelopes": ["TASK-2026-0714-003"] },
    { "id": "G3:A18", "gate": "G3", "agent": "A18", "role": "producer", "status": "DONE", "artifactsExpected": ["contracts/Select.contract.json"], "envelopes": ["TASK-2026-0714-004"] },
    { "id": "G3:A19", "gate": "G3", "agent": "A19", "role": "reviewer", "status": "DONE", "artifactsExpected": ["contracts/review/RR-G3-select-230.md"], "envelopes": ["TASK-2026-0714-005"] },
    { "id": "G5:A30", "gate": "G5", "agent": "A30", "role": "producer", "status": "IN_PROGRESS", "artifactsExpected": ["packages/ui/src/Select/**"], "envelopes": ["TASK-2026-0714-006"] },
    { "id": "G5:A33", "gate": "G5", "agent": "A33", "role": "reviewer", "status": "PENDING", "artifactsExpected": ["packages/ui/review/RR-G5-select-230.md"], "envelopes": [] },
    { "id": "G6:A40", "gate": "G6", "agent": "A40", "role": "producer", "status": "IN_PROGRESS", "artifactsExpected": ["apps/admin/src/**"], "envelopes": ["TASK-2026-0714-007"] },
    { "id": "G6:A42", "gate": "G6", "agent": "A42", "role": "reviewer", "status": "PENDING", "artifactsExpected": ["docs/review/code/RR-G6-select-230.md"], "envelopes": [] },
    { "id": "G7:A51", "gate": "G7", "agent": "A51", "role": "producer", "status": "IN_PROGRESS", "artifactsExpected": ["docs/figma/specs/components/**"], "envelopes": ["TASK-2026-0714-008"] },
    { "id": "G7:A56", "gate": "G7", "agent": "A56", "role": "reviewer", "status": "PENDING", "artifactsExpected": ["docs/figma/review/RR-G7-select-230.md"], "envelopes": [] },
    { "id": "contract-test-final:A74", "gate": "contract-test-final", "agent": "A74", "role": "verifier", "status": "PENDING", "artifactsExpected": ["reports/contract-test/**"], "envelopes": [] },
    { "id": "G8:A60", "gate": "G8", "agent": "A60", "role": "producer", "status": "PENDING", "artifactsExpected": ["docs/tds/components/select.md", "docs/tds/components/select.api.md"], "envelopes": [] },
    { "id": "G8:A61", "gate": "G8", "agent": "A61", "role": "reviewer", "status": "PENDING", "artifactsExpected": ["docs/tds/review/RR-G8-select-230.md"], "envelopes": [] },
    { "id": "G8:A03", "gate": "G8", "agent": "A03", "role": "reviewer", "status": "PENDING", "artifactsExpected": ["CHANGELOG.md"], "envelopes": [] }
  ],
  "edges": [
    { "from": "G1:A11", "to": "G1:A12", "kind": "review" },
    { "from": "G1:A12", "to": "G3:A18", "kind": "sequence" },
    { "from": "G3:A18", "to": "G3:A19", "kind": "review" },
    { "from": "G3:A19", "to": "G5:A30", "kind": "sequence" },
    { "from": "G3:A19", "to": "G6:A40", "kind": "sequence" },
    { "from": "G3:A19", "to": "G7:A51", "kind": "sequence" },
    { "from": "G5:A30", "to": "G5:A33", "kind": "review" },
    { "from": "G6:A40", "to": "G6:A42", "kind": "review" },
    { "from": "G7:A51", "to": "G7:A56", "kind": "review" },
    { "from": "G5:A33", "to": "contract-test-final:A74", "kind": "sequence" },
    { "from": "G6:A42", "to": "contract-test-final:A74", "kind": "sequence" },
    { "from": "G7:A56", "to": "contract-test-final:A74", "kind": "sequence" },
    { "from": "contract-test-final:A74", "to": "G8:A60", "kind": "sequence" },
    { "from": "G8:A60", "to": "G8:A61", "kind": "review" },
    { "from": "G8:A61", "to": "G8:A03", "kind": "sequence" }
  ],
  "parallelGroups": [
    { "id": "production", "nodes": ["G5:A30", "G5:A33", "G6:A40", "G6:A42", "G7:A51", "G7:A56"], "joinAt": "contract-test-final:A74" }
  ],
  "skips": [
    { "gate": "G2", "reason": "EXTEND + 신규 시각 변경 없음 — 기존 variant 조합 재사용 (gates.json G2 fastPath)" },
    { "gate": "G4", "reason": "계약 tokens 블록 변경 없음 — 신규 토큰 0건 (gates.json G4 orderingNote)" }
  ],
  "stateRef": "orchestration/state/TASK-2026-0714-001.state.json"
}
```
