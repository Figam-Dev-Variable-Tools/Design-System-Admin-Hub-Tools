# reports/ — 검증 리포트 루트 규격

Layer 3 Verifier(및 A02 Boundary Enforcer)가 게이트 판정의 **입력값(evidence)** 으로 생성하는
기계 판독용 리포트의 저장소다. 폴더 구조와 소유권은 `orchestration/registry/agents.json` 이 원천이다.

## 폴더별 소유 에이전트

| 폴더 | 소유 에이전트 | 생성 도구 | 파일명 규칙 | 차단 연계 |
|---|---|---|---|---|
| `vrt/` | **A70** Visual Regression AI | `@tds/vrt` (`pnpm vrt`) | `<date>-summary.json` + `diff/<date>/<storyId>.png` + `baseline/<storyId>.png` | diff > 0.1% → G7 |
| `drift/` | **A71** Design Drift AI | `@tds/drift` (`pnpm drift:check`) | `<date>.json` + `<date>.md` | 차단 없음 — 알림 + Fix PR (exit 2) |
| `a11y/` | **A72** Accessibility Audit AI | `@tds/a11y` (`pnpm a11y`) | `<date>.json` | critical/serious ≥ 1 → G5/G6 |
| `perf/` | **A73** Performance Audit AI | `@tds/perf` (`pnpm perf`) | `<date>.json` | Budget 초과 → G6 |
| `contract-test/` | **A74** Contract Test AI | `@tds/contract-test` (`pnpm contract-test`) | `<component>.json` | 4자 불일치 ≥ 1 → G5/G6/G7 |
| `reuse/` | **A75** Component Reuse AI | `@tds/reuse-guard` (`pnpm reuse:check`) | `<component>.json` | 유사도 ≥ 85% → G0 신규 생성 차단 |
| `naming/` | **A76** Naming Convention AI | `@tds/naming-guard` (`pnpm naming:check`) | `<date>.json` | 규칙 위반 → 커밋 차단 |
| `boundary/` | **A02** Boundary Enforcer AI | `@tds/boundary` (`pnpm boundary:check`) | `<date>.json` | 소유권 위반 → PR 차단 |

## 파일명 규칙

- **날짜 접두**: 상시(nightly/PR) 실행 리포트 — `<date>` 는 `YYYY-MM-DD` (예: `2026-07-14-summary.json`, `2026-07-14.json`)
- **컴포넌트 단위**: 대상별 판정 리포트 — `<component>.json` (예: `Button.json`), 컴포넌트명은 PascalCase
- 실행 중간물은 각 폴더의 `tmp/` 하위에만 둔다 — `.gitignore`(`reports/**/tmp/`) 대상이며 커밋 금지

## 정책 — 기계 생성 전용

1. **수기 편집 금지.** 이 디렉터리의 모든 리포트는 도구가 생성한다. 손으로 고친 리포트는
   evidence 효력이 없으며, 발견 시 A02가 소유권 위반으로 처리한다. (각 폴더의 README만 예외 — 규격 문서)
2. **Reviewer는 evidence로 인용한다.** 각 게이트 Reviewer(A12~A61)는 Review Report(D5, `RR-G*-*`)에서
   이 리포트를 근거로 인용한다 — 예: A33은 `reports/a11y/`·`reports/contract-test/`, A56은 `reports/vrt/`.
   리포트 없는 차단·승인은 무효다 (Verifier 공통 규칙: "리포트 없는 차단 금지").
3. **기준치의 원천은 레지스트리다.** 차단 임계값(0.1%, +2KB, 85%, 5% 등)은
   `orchestration/registry/gates.json` 의 SLO·blockedBy 정의를 따르며, 도구가 임의로 바꿀 수 없다.
4. **쓰기 권한은 소유 에이전트에게만 있다** (P1 단일 소유권). 읽기는 전원 허용.
