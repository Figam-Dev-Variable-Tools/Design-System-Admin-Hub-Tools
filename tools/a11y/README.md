# @tds/a11y — 접근성 감사

> 소유: **A72 Accessibility Audit AI** (`orchestration/registry/agents.json`)
> 차단 조건: **axe critical/serious 위반 1건 이상 → G5/G6 차단** (`orchestration/registry/gates.json`)

Playwright(chromium) + axe-core 로 `storybook-static` 의 전 스토리를 자동 감사한다.
SLO: `a11yCriticalViolations = 0건`. 수동 시나리오(스크린리더/키보드)는 SKILL 절차에서 별도 수행한다.

## 실행

```bash
pnpm a11y:gate   # sb:build 선행 + 감사 (CI·verify:all 이 쓰는 경로)
pnpm a11y        # 감사만 — storybook-static 이 이미 있어야 한다
```

`pnpm a11y` 는 전제(`packages/ui/storybook-static`)가 없으면 **exit 2 로 실패**한다.
전제를 갖춘 상태로 돌리려면 `pnpm a11y:gate` 를 쓴다.

## 파이프라인

1. `packages/ui/storybook-static` 존재 확인 — 없으면 **NOT_VERIFIED (exit 2)**
2. `index.json` 에서 스토리 목록 수집 — 0건이면 NOT_VERIFIED
3. 내장 정적 서버로 서빙 + Playwright 로 `iframe.html?id=<storyId>` 순회, axe-core 주입 후 검사
4. 집계 → `reports/a11y/<date>.json`

구조는 자매 도구 `tools/vrt` 와 의도적으로 동일하다 (같은 index.json 순회 · 같은 정적 서버 ·
같은 렌더 완료 신호 `sb-show-main` · 같은 외부 네트워크 차단).

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | **실제로 검사했고** critical/serious 0건 |
| 1 | **critical/serious 위반 1건 이상** → G5/G6 차단 (A33/A42 + A00에 escalation) |
| 2 | **NOT_VERIFIED** — 검사 자체가 불가능했다 (storybook-static 부재 · playwright 미설치 · 스토리 검사 실패) |

**exit 2 는 통과가 아니다.** 측정 불가를 초록불로 바꾸지 않는다 (ADR-0011).

## 검사 범위 — `body` (포털 포함)

`iframe.html` 의 `body` 전체를 검사한다. `#storybook-root` 가 **아니다**:
Modal·ConfirmDialog 는 `createPortal` 로 `document.body` 에 직접 붙으므로, root 로 범위를 좁히면
**다이얼로그의 접근성이 영원히 검사되지 않는다** — 포커스 트랩·`aria-modal` 이 가장 중요한
바로 그 컴포넌트들이 사각지대에 놓인다. iframe 셸에는 Storybook 크롬이 없어 body 범위가 정확하다.

## 왜 `@storybook/test-runner` 를 쓰지 않는가 (2026-07 교체)

이전 구현은 `pnpm exec test-storybook` 을 spawn 했고, **이 저장소에서 한 번도 동작한 적이 없다.**
근본 원인이 셋 겹쳐 있었다:

1. `packages/ui/.storybook/test-runner.ts` re-export 가 **존재하지 않았다** — 이 README 가
   "A30 에게 change_request 로 요청한다" 고만 적어두고 아무도 만들지 않았다. 훅이 없으면
   axe 는 애초에 주입되지 않는다.
2. `test-storybook` 은 `@tds/a11y` 의 devDependency 인데 spawn cwd 가 REPO_ROOT 라
   루트 `node_modules/.bin` 에서 찾지 못한다 → `Command not found`.
3. test-runner 는 jest 위에서 돌고 testMatch 를 `path.join(projectRoot, glob)` 으로 만든다.
   Windows 에서 그 결과에 섞인 `\` 를 micromatch 가 이스케이프로 읽어 경로 구분자가 사라진다 → 0 matches.

그리고 이 세 실패는 전부 `skip()` 이 **exit 0 으로 삼켰다** — 리포트에 `status: "skipped"` 와
`axe: { critical: 0, serious: 0, ... }` 를 나란히 적어 **0건 검사하고 "위반 0건"** 을 기록했다.
jest/haste/rootDir 계층을 걷어내고 VRT 와 같은 방식으로 직접 순회하면 세 원인이 모두 사라진다.

## 출력 규격

`reports/a11y/<date>.json` — `status` · impact별 집계(`axe.critical/serious/moderate/minor`) ·
규칙별 집계(`byRule`) · 검사 실패 목록(`auditErrors`) · 스토리별 위반 상세
(rule id, help URL, 대상 노드 HTML 일부). A33(Storybook Reviewer)·A42(Code Reviewer)가 evidence로 인용한다.

`checkedStories` 가 **실제로 검사된 건수**다. 이 수가 0 이거나 `auditErrors` 가 비어있지 않으면
초록불은 켜지지 않는다 — "검사되지 않은 위반"과 "위반 없음"은 구별할 수 없기 때문이다.
