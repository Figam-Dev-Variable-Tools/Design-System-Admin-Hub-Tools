# @tds/naming-guard — 네이밍 규칙 강제 도구

> 담당: 네이밍 가드 (Layer 3 · Verification)
> 근거: `docs/architecture/org-design-v2.md` §3 · §8(G3 체크리스트)
> 차단 규칙: **규칙 위반 → 커밋 차단** (pre-commit 훅에서 `--staged` 모드로 실행)

## 실행

```bash
# 전체 스캔 (리포 루트에서)
pnpm naming:check

# 스테이징된 파일만 (pre-commit 훅용)
pnpm --filter @tds/naming-guard run check --staged
```

- 인자 없음 → `packages/ui/src/**`, `contracts/*.json`, `tokens/tokens.json`, `assets/icons/**` 전체 스캔
- `--staged` → `git diff --cached --name-only --diff-filter=ACMR` 대상 파일만 검사
  (tokens.json 규칙은 tokens.json 이 스테이징된 경우에만, 계약 내용 규칙은 스테이징된 계약만)

## 규칙

| 규칙 id | 대상 | 내용 |
|---|---|---|
| `component-dir` | `packages/ui/src/**` 폴더 | PascalCase. 단, atomic 레벨 폴더 `atoms/molecules/organisms/templates/pages` 는 lowercase 화이트리스트 |
| `component-file` | `packages/ui/src/**` 파일 | `<Name>.tsx` (PascalCase). 보조 파일 허용 패턴: `index.ts(x)`, `<Name>.types.ts`, `<Name>.play.ts`, `<Name>.test.ts(x)`, `<Name>.css`, `<Name>.module.css`, `README.md`, `.gitkeep` |
| `story-file` | Story 파일 | `<Name>.stories.tsx` |
| `mdx-file` | MDX 문서 | `<Name>.mdx` |
| `contract-file` | `contracts/` 직하 `.json` | `<Name>.contract.json` (PascalCase). `contracts/schemas/`, `contracts/review/` 는 대상 아님 |
| `token-path` | `tokens/tokens.json` | 모든 경로 세그먼트(키) lowercase+하이픈 `[a-z0-9-]`. `$value` 등 `$` 접두 DTCG 메타 키는 제외 |
| `boolean-prop` | 계약 `props` (type=boolean) | `is/has/can` 접두(`isOpen`, `hasIcon`, `canClose`) 또는 상태 형용사 화이트리스트 |
| `event-name` | 계약 `events` 키 | `on[A-Z]*` (예: `onClick`, `onChange`) |
| `icon-file` | `assets/icons/**/*.svg` | `<name>-<12\|16\|20\|24>-<filled\|outlined\|rounded\|sharp>.svg`, name 은 lowercase+하이픈 |

### boolean 상태 형용사 화이트리스트

`loading, disabled, readonly, required, open, checked, selected, multiple, active, expanded,
collapsed, visible, hidden, indeterminate, inline, dense, fluid, bordered, striped, hoverable,
closable, clearable, searchable, error`

화이트리스트 추가가 필요하면 아키텍처에 규칙 개정을 제안한다 —
`src/rules.ts` 의 `BOOLEAN_STATE_WHITELIST` 가 구현상 원천이다.

## 산출물

| 경로 | 내용 |
|---|---|
| `reports/naming/naming-report.json` | 위반 목록 (기계 판독용) |
| `reports/naming/naming-report.md` | 위반 요약 + 조치 안내 |

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | 위반 0건 |
| 1 | 위반 1건 이상 → 커밋 차단 |
| 2 | 실행 오류 (git 실행 실패, 리포 루트 탐색 실패 등) |

## pre-commit 연동 (설계서 §11)

`.husky/pre-commit` 에서 다음과 같이 호출한다 (훅 파일 자체는 리포 골격 배치 소유):

```bash
pnpm --filter @tds/naming-guard run check --staged
```

## 경계 (Hard Boundary)

- 본 도구는 **검사만** 한다 — 파일 개명/수정은 위반을 만든 생산자의 몫 (P1 단일 소유권).
- 리포트 경로 `reports/naming/**` 는 네이밍 가드 소유.
- 디렉터리가 아직 없는 부트스트랩 단계에서는 존재하는 대상만 스캔하며 실패하지 않는다.
