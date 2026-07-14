---
id: ADR-0009
title: CI 게이트 정비 및 클린코드 게이트 신설 — 공허 통과 제거 · lockfile 부채 상환 · 배포 파이프라인
status: accepted
date: 2026-07-15
owner: A01 (Architecture AI)
proposedBy: [A82 (CI/CD Engineer), A83 (Clean Code Inspector)]
supersedes: null
relatedTo: [ADR-0001, ADR-0006]
---

# ADR-0009. CI 게이트 정비 및 클린코드 게이트 신설

## 맥락

ADR-0006 이 인프라 에이전트 4종(A80~A83)을 신설했다. 그 ADR 이 후속 작업으로 남긴 것을 여기서 정리한다.

CI 는 **있다.** `pr-gates.yml`·`nightly.yml`·`release.yml` 이 돌고, 8개 job 이 초록불을 켠다.
문제는 그 초록불이 **무엇을 막고 있는가**이다.

### (a) 공허 통과(vacuous pass) job 이 있다

`bundle-size` job 은 `pnpm build` → `pnpm perf` 를 돈다. 그런데

- `@tds/ui` 의 `build` 스크립트는 `echo "build via consuming app (vite lib mode 추후)"` — **placeholder** 다.
- 따라서 `packages/ui/dist` 는 **생기지 않는다.**
- `tools/perf` 는 dist 가 없으면 graceful skip 하고 **exit 0** 한다.

즉 이 job 은 **아무것도 재지 않고 초록불을 켠다.** G6 의 `blockedBy: A73 (Budget 초과)` 는
문서상으로는 살아 있지만 물리적으로는 **존재하지 않는 게이트**다. 번들이 10배로 늘어도 이 job 은 통과한다.

### (b) 클린코드를 기계로 재는 주체가 없어 페이지 간 결합 58건이 리뷰 없이 자랐다

ADR-0006 이 기록한 대로, **페이지가 다른 페이지의 컴포넌트를 가로질러 import 하는 구조**가
`admins`·`permissions`·`customer-settings` → `members` 방향으로 **58건** 자랐다.
`members` 를 지우면 나머지가 함께 죽는다. 이것은 재사용이 아니라 **결합**이다.

각 PR 은 "기존 `Card` 를 재사용했다"로 보였을 것이다. 사람 리뷰(A42)는 **파일 단위 diff** 를 보므로
**import 그래프 수준의 결함을 구조적으로 놓친다.** 놓친 것이 아니라 **볼 수 없었다.**
그리고 규칙을 재는 주체가 없으니 규칙도 없었고, 규칙이 없으니 위반도 없었다.

### (c) 부트스트랩 부채가 방치돼 있다

`pnpm install --no-frozen-lockfile` + `cache: pnpm` 제거는 lockfile 이 없던 시절의 임시 조치였다.
`pnpm-lock.yaml` 이 커밋된 지금, `--no-frozen-lockfile` 은 **CI 가 lockfile 표류를 못 잡는다**는 뜻이다.
CI 가 lockfile 과 다른 의존성 트리로 초록불을 켤 수 있다면, 그 초록불은 로컬의 초록불과 다른 것을 증명한다.

## 결정

### 1. 클린코드 게이트 신설 — `code-quality` (A83, 6축)

`tools/code-quality/` (`@tds/code-quality`) 를 신설하고 `pr-gates.yml` 에 `code-quality` job 으로 물린다.

| # | 축 | 임계값 | 심각도 |
|---|---|---|---|
| 1 | 페이지 간 결합 (`pages/A` → `pages/B`, side-effect CSS import 포함) | **0건** | **blocker** |
| 2 | 도메인 누수 (공통 모듈이 도메인 타입/상수를 import) | **0건** | **blocker** |
| 3 | 중복 코드 (정규화 블록 30줄 이상 · 2회 이상 반복) | 0건 | major |
| 4 | 순환 복잡도 (함수당 분기 수) | ≤ 15 | major |
| 5 | 죽은 코드 (미사용 export — 배럴 재export 는 사용이 아니다) | 0건 | major |
| 6 | 레이어 역방향 (`atoms` → `molecules`/`organisms`) | **0건** | **blocker** |

- **blocker ≥ 1건 → exit 1 → PR 차단.** major 는 exit 0 + 리포트 경고 (리뷰 evidence).
- 리포트 `reports/code-quality/<date>.{json,md}` 에 **측정값 + 임계값 + 위반 위치(file:line)** 를 반드시 남긴다.
  **재현 불가능한 차단은 하지 않는다.**
- **"읽기 좋다/나쁘다"는 판정 사유가 아니다.** 규칙에 없는 의심 사례는 차단하지 않고 `UNDEFINED` 로 기록해
  A01 에 규칙 제정을 요청한다 (A76 이 확립한 "규칙 없는 차단 금지" 패턴).
- 임계값의 원천은 레지스트리(`agents.json` A83 `blockCondition`)와 이 ADR 이다.
  **위반이 많다고 임계값을 올리지 않는다** — 올리려면 ADR 이 필요하다.

도입 시점 실측 (스캔: `apps/admin/src` + `packages/ui/src`, 161파일 · 22,430줄):

| 축 | 측정값 | 판정 |
|---|---|---|
| 1 페이지 간 결합 | **0건** | PASS — ADR-0006 이 기록한 58건이 `shared/ui` 승격으로 **상환 완료** (본 측정은 상환 *후* 상태다) |
| 2 도메인 누수 | **0건** | PASS |
| 6 레이어 역방향 | **0건** | PASS |
| 3 중복 코드 | 11건 | major (경고) |
| 4 순환 복잡도 | 5건 (최대 24) | major (경고) |
| 5 죽은 코드 | 166건 (local-only export 144 · unreferenced 22) | major (경고) |

**blocker 3축이 전부 0건이므로 이 게이트는 도입 즉시 required 로 등록할 수 있다.**
(A40/A41 의 공통 모듈 분리가 A83 게이트 편입 전에 부채를 상환했다 — ADR-0006 이 요구한 순서 그대로다.)

### 2. `bundle-size` 공허 통과 — job 을 **제거**하고 required 목록에서 뺀다

측정할 수 없는 것을 통과시키지 않는다. 두 선택지 중,

- (A) 측정 불가를 **명시적 실패**로 만든다 → `@tds/ui` 에 lib 빌드가 없는 한 **모든 PR 이 영구히 red** 가 된다.
  이것은 게이트가 아니라 벽이다. 아무 PR 도 머지할 수 없다.
- (B) job 을 **제거**하고 required 목록에서 빼며, **공허 통과 상태임과 승격 조건을 명시한다.**

**(B)를 택한다.** 초록불도 빨간불도 켜지 않는 것이, 아무것도 막지 못하면서 초록불을 켜는 것보다 정직하다.
`pr-gates.yml` 헤더에 "비활성 게이트" 절로 기록했고, 승격 조건은 다음 둘의 **동시 충족**이다:

1. `@tds/ui` 에 vite lib mode 빌드 도입 → `packages/ui/dist` 생성 (**A30 · A80**)
2. `tools/perf` 가 dist 부재 시 graceful skip(exit 0) 이 아니라 **실패**하도록 수정 (**A73**)
   — 그렇지 않으면 job 을 되살려도 **같은 공허 통과가 재발한다.** 측정 불가는 통과가 아니다.

### 3. lockfile 부트스트랩 부채 상환

모든 워크플로우에서 `pnpm install --no-frozen-lockfile` → **`pnpm install --frozen-lockfile`**,
`actions/setup-node` 에 **`cache: pnpm`** 복원. (`pnpm-lock.yaml` 은 이미 리포에 있다.)

### 4. `lint` · `format-check` job 신설 (A81)

레지스트리의 A81 `blockCondition` 은 *"lint 위반 1건 이상 또는 포맷 불일치"* 이고 `blocks: [commit, PR]` 이다.
**레지스트리에 `blocks` 가 있는데 대응 job 이 없으면 그것은 구멍이다.** 두 job 을 신설해 구멍을 메운다.
(규칙을 정하는 것은 A81, CI 에서 돌리는 것은 A82.)

### 5. 배포 파이프라인 — `deploy.yml` 신설

main 머지 시 **Storybook 정적 배포(GitHub Pages)** + **Admin 앱 빌드 아티팩트**.

**배포는 게이트 통과의 결과이지 별도 경로가 아니다.**
워크플로우 간에는 `needs:` 를 걸 수 없으므로 `deploy.yml` 이 PR 게이트와 **동일한 검사 집합**을
선행 job(`gates` 매트릭스 + `a11y`)으로 재실행하고, 배포 job 은 `needs: [gates, a11y]` 로 매달린다.
**게이트를 통과하지 않으면 배포 스텝에 도달할 수 없다.** "배포는 급하니 검사 생략"은 존재하지 않는 경로다.
프리뷰(`pr-gates.yml` 의 `preview` job)도 마찬가지로 전 게이트 통과 후에만 산출물을 만든다 —
깨진 코드의 프리뷰는 리뷰어를 오도한다.

### 6. `continue-on-error` 감사

| 위치 | 판정 | 조치 |
|---|---|---|
| `nightly.yml` `vrt` | **적법** — 리포트 업로드 후 `if: steps.vrt.outcome == 'failure'` → `exit 1` 로 **실패를 전파**한다 | 유지 (유일 허용 용례) |
| `nightly.yml` `drift` | **부적법** — exit 2(드리프트 발견 = 레지스트리가 규정한 "차단 없음")와 **도구 실행 실패를 구분하지 않고 전부 삼켰다** | **제거.** 종료 코드를 명시적으로 분기 — `0` 클린 / `2` 발견(제안 PR, 차단 없음) / **그 외 = 도구 실패 → job 실패** |
| `pr-gates.yml` | 없음 | — |

### 7. required status checks (브랜치 보호 규칙)

`registry-validate` · `boundary` · `contracts` · `codegen-stale` · `contract-test` · `naming` ·
`lint` · `format-check` · **`code-quality`** · `a11y`

`preview` 는 게이트가 아니라 게이트 통과의 *산출물*이므로 required 에 넣지 않는다.
`bundle-size` 는 위 2번에 따라 목록에서 **제외**한다.
**job 을 만드는 것만으로는 아무것도 차단되지 않는다** — 브랜치 보호 규칙에 등록해야 비로소 머지가 막힌다.

## 근거

- **아무것도 못 막으면서 초록불을 켜는 게이트는 게이트가 아니라 거짓말이다.**
  `bundle-size` 의 초록불은 "번들 예산을 지켰다"가 아니라 "아무것도 재지 않았다"를 뜻했다.
  그런데 리뷰어와 approver 는 그것을 전자로 읽는다. **거짓 evidence 는 evidence 의 부재보다 나쁘다** —
  후자는 사람을 조심하게 만들지만, 전자는 안심시킨다.
- **CI 는 게이트의 물리적 집행기다.** 게이트가 CI 에 물려 있지 않으면 그 게이트는 문서상의 약속일 뿐이다.
  지키는 사람만 지키는 규칙은 규칙이 아니다. 녹색 체크는 성과가 아니다 —
  **빨간 X 가 제때 떠서 나쁜 코드가 main 에 못 들어간 것**이 성과다.
- **기계가 셀 수 있는 위반을 사람 리뷰에 맡기면 놓친다.** 이것은 가설이 아니라 관측이다 —
  페이지 간 결합은 리뷰를 **통과해서** main 에 들어왔다. 사람이 못 잡는다는 게 아니라
  **일관되게 못 잡는다**는 것이 문제다. 검증을 확률적으로 만들지 않는다.
- **게이트는 가장 이른 지점에 둔다** (pre-commit ← PR ← nightly). CI 가 개발자 손보다 먼저 위반을 잡을수록
  리뷰 반려가 줄어든다 — `gateFirstPassRate ≥ 70%`, `avgRejectionCount ≤ 1.3` (A00 SLO)에 대한 기여다.
- **측정 도구의 오탐은 게이트의 거짓말이 된다.** 그래서 A83 은 정규식이 아니라
  **AST + 모듈 해석 기반 import 그래프**로 잰다. 정규식은 JSX·템플릿 리터럴·주석 안의 코드 조각을
  코드로 오인한다. 오탐 1건은 blocker 를 잘못 켜고, 그것은 게이트에 대한 신뢰를 파괴한다.

## 대안

1. **`bundle-size` 를 그대로 두고 나중에 고친다.**
   가장 나쁜 선택이다. 이 job 은 **초록불을 켜면서 아무것도 막지 않는다.** 방치하면 G6 approver(A42)가
   "Performance Budget 통과"를 체크리스트에서 초록으로 읽는다 — **CI 가 리뷰어를 속인다.** **기각.**
2. **`bundle-size` 를 측정 불가 시 실패시킨다 (영구 red).**
   정직하지만 실용적이지 않다. lib 빌드가 도입될 때까지 **모든 PR 이 머지 불가**가 된다.
   게이트는 나쁜 코드를 막는 것이지 **모든 코드를 막는 것**이 아니다. 승격 조건을 명시한 비활성화가
   같은 정직함을 유지하면서 파이프라인을 살려 둔다. **기각** (단, 승격 조건 2번에 이 원칙을 못 박았다).
3. **A83 의 6축을 전부 blocker 로 한다.**
   도입 시점 실측에서 중복 11건 · 복잡도 5건 · 죽은 코드 166건이 나온다 — 전부 blocker 로 하면
   **A83 도입 PR 자체가 머지되지 않는다.** 그러면 게이트를 끄거나 임계값을 올리게 되고,
   그것이 **임계값 표류의 시작**이다. 구조적 결합(축 1·2·6 — 0건 달성됨)은 blocker 로,
   누적 부채(축 3·4·5)는 major 로 두어 **먼저 새 위반을 막고, 기존 부채는 리포트로 가시화**한다.
   축 3·4·5 의 blocker 승격은 부채 상환 후 별도 ADR 로 한다. **현 시점 기각.**
4. **도구만 붙이고 게이트로 만들지 않는다** (리포트만 생성).
   리포트는 읽지 않으면 존재하지 않는 것과 같다. ADR-0006 의 결론과 동일하다 —
   **강제되지 않는 규칙은 규칙이 아니다.** **기각.**

## 결과

- **`tools/code-quality/`** 신설 (`@tds/code-quality`) — 외부 의존성 0
  (`typescript`·`tsx` 는 리포 전 도구의 공통 devDependency 로 **신규 추가 아님**).
  `reports/code-quality/<date>.{json,md}` 산출.
- **`.github/workflows/pr-gates.yml`** — `code-quality`·`lint`·`format-check`·`preview` job 신설,
  `bundle-size` job 제거(승격 조건 명시), `--frozen-lockfile` + `cache: pnpm` 복원,
  `permissions: contents: read` 최소 권한, required check 목록을 헤더 주석에 명시.
- **`.github/workflows/deploy.yml`** 신설 — `gates`(매트릭스) + `a11y` → `build-storybook` →
  `deploy-storybook`(GitHub Pages) · `build-admin`(아티팩트). 우회 경로 0건.
- **`.github/workflows/nightly.yml`** — `drift` 의 `continue-on-error` 제거(종료 코드 분기로 대체),
  `--frozen-lockfile` + `cache: pnpm` 복원.
- **후속 작업 (별건 PR)**:
  - **A80**: `package.json` 에 `"quality:check": "pnpm --filter @tds/code-quality run check"` 추가 +
    `pnpm install` 로 `pnpm-lock.yaml` 에 `tools/code-quality` importer 등록.
    **이것 없이는 `--frozen-lockfile` 이 실패해 전 job 이 red 다** (신규 워크스페이스 패키지이므로 필수).
  - **A30 · A80**: `@tds/ui` vite lib mode 빌드 도입 → `bundle-size` 승격 조건 1.
  - **A73**: `tools/perf` 가 dist 부재 시 실패하도록 수정 → `bundle-size` 승격 조건 2 (공허 통과 재발 방지).
  - **A82(본인)**: 브랜치 보호 규칙에 required check 10건 등록
    (`gh api repos/:owner/:repo/branches/main/protection`) — **job 생성만으로는 차단되지 않는다.**
  - **A40/A41 · A30**: 축 3·4·5 의 major 182건 상환 (리포트가 위치·측정값을 전부 갖고 있다).
- **게이트 구멍 보고 (A01)**: A81 의 `blocks` 에 **`commit`** 이 있으나 `.husky/pre-commit` 은
  현재 `naming:check` + `validate:contracts` 만 돈다 — **lint/format 이 pre-commit 에서 강제되지 않는다.**
  `pnpm format:check`(A81/A80 이 이미 추가함)를 pre-commit 에 물릴지, PR 게이트로 충분하다고 볼지는
  A01 의 판단이 필요하다 (pre-commit 을 무겁게 만드는 것과 게이트를 늦추는 것의 트레이드오프).
