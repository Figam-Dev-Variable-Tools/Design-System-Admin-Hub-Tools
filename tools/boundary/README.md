# @tds/boundary — 소유권 강제 도구

A02 (Boundary Enforcer AI) 소유. org-design-v2의 **P1 단일 소유권** 원칙을 물리적으로
강제하는 도구 모음이다. 유일한 원천(SSOT)은 `orchestration/registry/agents.json`이며,
`.github/CODEOWNERS`·경계 검사·레지스트리 검증이 전부 이 파일에서 파생된다.

## 명령

| 루트 스크립트 | 패키지 스크립트 | 역할 |
|---|---|---|
| `pnpm boundary:codeowners` | `codeowners` | agents.json → `.github/CODEOWNERS` 생성 (`--check`로 최신성 검사) |
| `pnpm boundary:check` | `check` | 변경 파일 소유자 판정 · `--agent` 지정 시 경계 위반 검출 |
| `pnpm validate:registry` | `validate-registry` | agents.json 스키마 + gates.json 교차 검증 |

## generate-codeowners.ts

`orchestration/registry/agents.json`에서 `.github/CODEOWNERS`를 생성한다.
**CODEOWNERS는 절대 손으로 편집하지 않는다** — 레지스트리를 고치고(A01 ADR 승인 필요)
재생성한다.

생성 규칙:

1. **제외**: `figma://` 가상 경로(리포 외부)와 `package.json#version`(파일 내부 필드
   특수 표기)은 CODEOWNERS로 표현할 수 없어 제외하고 헤더 주석에 명시한다.
   제외 경로는 `check-boundary.ts`가 별도로 강제한다.
2. **정렬**: GitHub CODEOWNERS는 last-match-wins이므로 **layer 오름차순 → 경로
   깊이(특이도) 오름차순**으로 배치한다. `review/**` 같은 더 특이한 경로가 뒤에 와서
   상위의 넓은 소유를 덮는다. (동률은 레지스트리 배열 순서로 안정 정렬 — 예:
   `packages/ui/src/**`(A30) 뒤에 `packages/ui/**/*.mdx`(A31)가 와서 src 안의
   MDX는 A31 소유가 된다.)
3. **소유자 표기**: `@tds-agents/<slug>` 팀 컨벤션.
4. **공동 소유**: 동일 패턴을 여러 에이전트가 가지면 한 줄에 병기한다
   (예: `apps/*/src/**` — A40/A41 순차 배타 쌍).
5. `/`가 없는 패턴(`tsconfig*.json`, `*.config.*`, `CHANGELOG.md`)은 gitignore 관례대로
   모든 깊이에서 매칭되도록 비앵커로 두고, 나머지는 루트 앵커(`/` 접두)한다.

CI에서 `--check`를 쓰면 커밋된 CODEOWNERS가 stale일 때 exit 1로 실패한다.

## check-boundary.ts

```bash
pnpm boundary:check                                   # git diff --name-only HEAD 결과 판정
pnpm boundary:check --base origin/main                # base...HEAD 변경분 판정 (PR CI용)
pnpm boundary:check --agent A30 [파일...]             # A30 소유 외 경로 검출 → 위반 시 exit 1
pnpm boundary:check --agent storybook-component-engineer  # slug로도 지정 가능
```

- 판정은 CODEOWNERS와 동일한 **last-match-wins** 순서를 공유 모듈(`registry.ts`)로
  단일화했다 — 두 메커니즘의 판정이 어긋날 수 없다.
- 글롭 매칭은 자체 구현: `**`(다중 세그먼트) · `*`(세그먼트 내) · `?`(1문자) 지원.
- `package.json#version`은 필드 단위 소유로 취급한다 — 루트 `package.json` 변경 시
  A03만 통과하며, 필드 내용은 리포트에 "수동 확인 필요"로 표기된다.
- 리포트는 `reports/boundary/YYYY-MM-DD-boundary-check.{json,md}`에 기록된다
  (같은 날 재실행 시 덮어쓰기 = 당일 최신본).
- 종료 코드: 위반 ≥ 1 → `1` (PR/커밋 차단), 미소유 경로는 경고만(레지스트리 공백으로
  A01에 보고), 그 외 `0`.

## validate-registry.ts

`agents.json`을 `orchestration/schemas/agent-registry.v1.json`(draft 2020-12)으로
ajv 검증하고, 다음을 교차 검증한다:

- 에이전트 수 정확히 **39** · `id`/`slug` 유일
- `reviewer` 참조 실존 (자가 검수 금지 포함) · `sequentialExclusiveWith` 상호 대칭 ·
  `escalatesTo` 실존(`human` 허용)
- `gates.json`의 `approver`/`producers`/`verifiers`/`blockedBy.agent` 전부 레지스트리에 실존,
  에이전트 `approves` ↔ 게이트 정의 일치
- 동일 owns 경로 중복 소유 검출 — **상호 sequentialExclusiveWith 쌍만 허용 예외**
  (`apps/*/src/**`의 A40/A41)
- `skills/<slug>/SKILL.md` 존재 여부 — 없으면 **경고**(스킬 배치 전일 수 있음)

종료 코드: 오류 ≥ 1 → `1`, 경고만 → `0`.

## CI 연계

- `.github/workflows/pr-gates.yml`의 `registry-validate`·`boundary` job이 PR마다 실행되며
  실패 시 병합이 차단된다.
- GitHub CODEOWNERS 자체도 (팀 계정을 실제로 매핑한 경우) 소유자 리뷰를 강제한다 —
  이 도구는 그 위에 레지스트리 기반의 기계 검증을 얹는다.
