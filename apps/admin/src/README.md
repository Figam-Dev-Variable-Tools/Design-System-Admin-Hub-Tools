# apps/admin/src — A40 · A41 순차 배타(sequential-exclusive) 규칙

이 디렉터리의 쓰기 소유자는 두 에이전트다 (orchestration/registry/agents.json):

- **A40 React Front-End Engineer** — 기능 구현 (Composition, Hook, Context)
- **A41 React Refactoring Agent** — SOLID · DRY · KISS · YAGNI 리팩터

**둘은 절대 동시에 작업할 수 없다** (`sequentialExclusiveWith` — 동시 작업 금지).

## 운영 규칙

1. 순서: A40 기능 구현 → G6 검수(A42) → 필요 시 A41 리팩터 → G6 재검수.
2. A41은 **동작 변경 금지 — 리팩터만**. 리팩터 중 신규 기능 필요를 발견하면 작업을 멈추고 A40에 반환한다.
3. 한쪽이 작업 중이면 다른 쪽은 handoff(orchestration/schemas/handoff.v1.json)로 완료 통보를 받은 뒤에만 착수한다.

## 공통 하드 바운더리 (G6 체크리스트)

- `@tds/ui`는 public entry로만 import — 내부 경로(`@tds/ui/src/...`) 직접 import 금지 (eslint가 차단).
- 하드코딩 색상 hex / px 금지 — 토큰 참조만 허용 (eslint가 차단).
- `packages/ui/**`, `contracts/**`, `tokens/**` 수정 금지 — 변경이 필요하면 해당 소유자에게 change_request 발행.
