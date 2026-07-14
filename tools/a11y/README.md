# @tds/a11y — 접근성 감사

> 소유: **A72 Accessibility Audit AI** (`orchestration/registry/agents.json`)
> 차단 조건: **axe critical/serious 위반 1건 이상 → G5/G6 차단** (`orchestration/registry/gates.json`)

Storybook test-runner + axe-playwright 로 전 스토리를 자동 감사한다.
SLO: `a11yCriticalViolations = 0건`. 수동 시나리오(스크린리더/키보드)는 SKILL 절차에서 별도 수행한다.

## 실행

```bash
pnpm a11y        # 루트 스크립트 (= pnpm --filter @tds/a11y run audit)
```

사전 조건: `pnpm sb:build` 로 `packages/ui/storybook-static` 생성 + 아래 '연결 방법' 완료.

## 파이프라인

1. `packages/ui/storybook-static` 존재 확인 — 없으면 **graceful skip** (안내 메시지 + `status: "skipped"` 리포트 + exit 0)
2. 내장 정적 서버로 storybook-static 서빙
3. `test-storybook` 실행 — `tools/a11y/test-runner.ts` 훅이 스토리마다 axe 검사 수행,
   위반을 `TDS_A11Y_OUT`(JSONL, `reports/a11y/tmp/` — gitignore 대상)에 수집
4. 집계 → `reports/a11y/<date>.json` 기록

## 연결 방법 (test-runner 설정 위치)

test-runner 설정은 `.storybook` 이 아니라 **`tools/a11y/test-runner.ts`** 에 둔다.
설정의 소유권을 A72(`tools/a11y/**`)에 귀속시키기 위해서다 (P1 단일 소유권).

Storybook test-runner는 config-dir 안의 `test-runner.ts` 만 읽으므로,
`packages/ui/.storybook/test-runner.ts` 에 **한 줄짜리 re-export** 를 둔다:

```ts
// packages/ui/.storybook/test-runner.ts — 내용 전체가 이 한 줄 (수정 금지, 실체는 tools/a11y 소유)
export { default } from "../../../tools/a11y/test-runner";
```

이 re-export 파일 생성은 `packages/ui` 소유자(A30)에게 change_request 로 요청한다.
감사 규칙 변경은 이 패키지(`tools/a11y/test-runner.ts`)에서만 이루어진다.

## Graceful skip

| 상황 | 처리 |
|---|---|
| `storybook-static` 없음 | 안내(`pnpm sb:build`) + skipped 리포트 + exit 0 |
| test-storybook 미설치 / test-runner 미연결 (JSONL 미생성 + 비정상 종료) | 안내(`pnpm install` + 연결 방법) + skipped 리포트 + exit 0 |

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | critical/serious 0건 · 또는 graceful skip |
| 1 | **critical/serious 위반 1건 이상** → G5/G6 차단 (A33/A42 + A00에 escalation) |

## 출력 규격

`reports/a11y/<date>.json` — impact별 집계(`axe.critical/serious/moderate/minor`) + 스토리별 위반 상세
(rule id, help URL, 대상 노드 HTML 일부). A33(Storybook Reviewer)·A42(Code Reviewer)가 evidence로 인용한다.
