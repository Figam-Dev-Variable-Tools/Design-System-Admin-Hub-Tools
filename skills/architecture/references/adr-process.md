# ADR 프로세스 v1

> A01(architecture)의 결정 기록 규격. `docs/adr/**`는 A01 단독 소유이며, ADR 없는 설계·레지스트리·스키마 변경은 무효다.

## 1. 파일 규칙

- 경로: `docs/adr/NNNN-title.md` (설계서 §6 D1)
- `NNNN`: 4자리 zero-padded 연번. 재사용·건너뜀 금지. `0001`은 v2 조직 카탈로그 확정(레지스트리가 인용하는 ADR-0001)에 예약되어 있다.
- `title`: 영어 kebab-case (예: `0007-select-multiple-extension`). 문서 본문은 한국어.

## 2. Frontmatter

```yaml
---
adr: 0007
title: select-multiple-extension
status: proposed        # proposed | accepted | rejected | superseded | deprecated
date: 2026-07-14
deciders: [A01]         # 판정 참여 에이전트. override 기록이면 [A01, A00]
relates-to: TASK-2026-0714-001    # 발단이 된 envelope/CR id (선택)
supersedes: null        # 대체하는 ADR 번호 (선택)
superseded-by: null     # 이후 대체된 경우 역링크 (필수 유지보수)
---
```

## 3. 본문 필수 섹션

1. **배경 (Context)** — 무엇이 문제였나. 발단 envelope/리포트 경로 인용
2. **결정 (Decision)** — 무엇을 하기로 했나. 단정형으로 1~3문장
3. **근거 (Rationale)** — 왜. 설계서 원칙(P1/P2/P3), 게이트 정의, SLO 수치 인용
4. **검토한 대안 (Alternatives)** — 최소 1개, 각각 기각 사유
5. **결과 (Consequences)** — 긍정/부정 영향, 발생하는 기술부채, 후속 조치 목록
6. **후속 조치 (Follow-ups)** — 실행 주체와 산출물 (예: A02 CODEOWNERS 재생성, 해당 스킬 frontmatter 갱신)

## 4. ADR이 필수인 변경 (이것 없이 변경하면 A02가 차단)

| 변경 대상 | 비고 |
|---|---|
| `orchestration/registry/agents.json` / `gates.json` | 에이전트 추가·삭제, owns/reads/gate/blocks 변경, SLA·SLO 변경 |
| `orchestration/schemas/*.json` | envelope·리포트 규격 변경 |
| `contracts/schemas/component.v1.json` | 수정은 A18이 수행하되 **승인 ADR은 A01이 선행 발행** |
| 폴더 구조·의존 규칙·Lint 규칙 (`*.config.*`, dependency-cruiser 등) | 금지 규칙 추가/완화 포함 |
| A00의 게이트 override | override 1건 = ADR 1건 + 기술부채 티켓 1건 (레지스트리 A00 notes) |
| 설계서 §13 충돌 판정 중 A01 관할 건 | 디자인↔계약, 성능↔기능 |

## 5. 프로세스 흐름

```
요청 수신 (escalation / change_request envelope, orchestration/tasks/)
   │
   ▼
ADR 초안 작성 — status: proposed
   │
   ├─ 이해관계 에이전트 의견 수렴 (선택, blocking CR은 SLA 2h)
   ▼
판정 → status: accepted 또는 rejected
   │
   ├─ accepted → 변경 실행 (레지스트리/스키마/config)
   │               → pnpm validate:registry / pnpm lint 통과 확인
   │               → 후속 조치 handoff 발행 의뢰 (A02 codeowners, 스킬 동기화 등)
   │
   └─ rejected → 요청자에게 기각 사유 회신 (ADR 경로 첨부)
```

- **순서 강제**: `accepted` ADR 커밋이 실제 변경 커밋보다 선행하거나 같은 PR에 포함되어야 한다.
- **rejected ADR도 삭제하지 않는다** — 같은 제안의 재반복을 막는 근거 문서다.

## 6. Supersede 규칙

- 기존 결정을 뒤집을 때는 기존 ADR을 편집하지 않는다. 새 ADR을 발행하고 `supersedes`를 지정한 뒤, 기존 ADR의 `superseded-by`와 status(`superseded`)만 갱신한다.
- 체인이 3단 이상 되면 `docs/architecture/`에 현행 규칙 요약 문서를 갱신해 최신 상태를 한 곳에서 읽을 수 있게 한다.

## 7. Override ADR 특칙 (A00 의뢰 건)

- 제목 접두: `override-` (예: `0009-override-g5-dark-story`)
- 필수 기재: 통과시킨 게이트, 미충족 체크리스트 항목, 리스크, 기술부채 티켓 id(`TECH-DEBT:` TASK envelope), 해소 기한
- A00은 이 ADR 번호 + 티켓 id를 `orchestration/state/`에 기록해야만 override가 유효하다.
