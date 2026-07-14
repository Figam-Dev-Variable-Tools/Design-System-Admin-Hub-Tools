# @tds/code-quality — 클린코드 6축 측정 도구

> 담당 에이전트: **A83 Clean Code Inspector** (Layer 3 · Verification)
> 근거: `orchestration/registry/agents.json` (A83 `blockCondition`) · `docs/adr/0009-ci-and-code-quality-gates.md`
> 차단 규칙: **blocker ≥ 1건 → PR 차단** (`.github/workflows/pr-gates.yml` 의 `code-quality` job)

**기계가 셀 수 있는 것은 도구로 잰다.** 이 도구는 판단하지 않는다 — 측정하고, 기준 미달이면 차단한다.
`"읽기 좋다 / 나쁘다"` 는 이 도구의 판정 사유가 **아니다.** 아래 6축의 수치 위반만이 판정 사유다.

## 실행

```bash
pnpm quality:check                          # 전체 스캔 (PR 게이트가 부르는 명령)
pnpm --filter @tds/code-quality run check   # 동일 (직접 호출)
```

## 측정 6축

| # | 축 | 측정 방법 | 임계값 | 심각도 |
|---|---|---|---|---|
| 1 | **페이지 간 결합** | `apps/<app>/src/pages/A/**` 가 `pages/B/**` 를 import (**side-effect CSS import 포함**) | **0건** | **blocker** |
| 2 | **도메인 누수** | 공통 모듈(`apps/admin/src/shared/ui/**`, `packages/ui/src/**`)이 도메인 소스(`pages/**`·`shared/domain/**`·`shared/permissions/**`)를 import 하거나 도메인 어휘 심볼(`Member*`·`Role*`·`Tier*`·`TIER_*` …)을 import | **0건** | **blocker** |
| 3 | **중복 코드** | 정규화 블록(주석 제거 · 공백 제거 · 식별자/리터럴 익명화) 해시가 30줄 이상 · 2회 이상 반복 | 0건 | major |
| 4 | **순환 복잡도** | 함수당 `1 + 분기수` (`if`/`for`/`while`/`case`/`catch`/`&&`/`\|\|`/`??`/`?:`) | 함수당 ≤ 15 | major |
| 5 | **죽은 코드** | export 됐으나 어디서도 import 되지 않는 심볼 (**배럴 재export 는 사용으로 세지 않는다**) | 0건 | major |
| 6 | **레이어 역방향** | `packages/ui/src` 의 `atoms ← molecules ← organisms ← templates` 방향 위배 | **0건** | **blocker** |

임계값의 원천은 레지스트리(`agents.json` A83 `blockCondition`)와 ADR-0009 다.
**위반이 많다고 임계값을 올리지 않는다** — 임계값 변경은 A01의 ADR 사안이다 (`src/thresholds.ts` 가 구현상 원천).

### 축 1 · 2 — 왜 blocker 인가

`members` 를 지우면 `admins`·`permissions`·`customer-settings` 가 함께 죽는 구조가 리뷰 없이 자랐다 (ADR-0006).
각 PR 은 "기존 Card 를 재사용했다"로 보였다 — 사람 리뷰는 **그래프 수준의 결함을 구조적으로 놓친다.**
해소 방향은 하나다: **공통으로 쓰이는 것은 `shared/ui`(또는 `packages/ui`)로 승격한다.**
공통 모듈이 도메인을 알면 그것은 이미 공통이 아니다 — 도메인 값은 **prop 으로 주입**한다.

### 축 5 — 두 종류의 죽은 코드

| 측정값 | 뜻 | 조치 |
|---|---|---|
| `import 하는 곳 0건 · 파일 내부 참조 N회` (**local-only export**) | 파일 안에서만 쓰이는데 `export` 되어 있다 | `export` 키워드 제거 (공개 표면을 넓히지 않는다) |
| `import 하는 곳 0건 · 파일 내부 참조 0회` (**unreferenced**) | 아무도 참조하지 않는다 | 삭제 |

**live root** (정적 import 그래프 밖에서 소비되므로 살아 있다고 본다):
`apps/<app>/src/main.tsx` (번들러 진입점) · `packages/<pkg>/src/index.ts` (패키지 공개 API) ·
`*.stories.tsx` · `*.test.ts(x)` · `*.play.ts` (Storybook/vitest 가 glob 으로 부른다)

## 측정 범위

- 스캔 루트: `apps/admin/src`, `packages/ui/src`
- 제외: `*.d.ts`, `generated/**` — **기계가 만든 코드의 중복·죽은 export 를 사람에게 청구하지 않는다**
- **측정 대상이 없으면 exit 2** (통과가 아니다). 대상 부재를 graceful skip 으로 통과시키는 것이
  ADR-0006 이 지적한 **공허 통과(vacuous pass)** 이며, 이 도구는 그것을 하지 않는다.

## 산출물

| 경로 | 내용 |
|---|---|
| `reports/code-quality/<date>.json` | 축별 위반 배열 — `{ axis, id, severity, file, line, symbol, measured, threshold, message, suggestion, related }` |
| `reports/code-quality/<date>.md` | 요약 표 (축 / 심각도 / 측정값 / 임계값 / 측정 범위 / 판정) + 위반 상세 |

리포트의 모든 항목은 **측정값 + 임계값 + 위반 위치(`file:line`)** 를 동반한다.
수치 없는 지적은 리포트에 실을 수 없다 — **리포트 없는 차단 금지**, 재현 불가능한 차단 금지.
**위반 0건이어도 pass 리포트를 남긴다** (A42 가 G6 검수에서 evidence 로 인용한다).

## 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | blocker 0건 — 통과 (major 는 경고로 리포트에 남는다) |
| 1 | blocker ≥ 1건 → **PR 차단** |
| 2 | 실행 오류 **또는 측정 대상 부재** (측정 불가는 통과가 아니다) |

## UNDEFINED — 규칙에 없는 문제

규칙에 정의되지 않은 의심 사례는 **차단하지 않고** 리포트의 `undefined[]` 에 기록하고
A01 에 규칙 제정(ADR)을 요청한다. **규칙 없는 차단은 하지 않는다** (A76 이 확립한 패턴).
현재 UNDEFINED 로 수집하는 사례: `packages/ui/src/<layer>/**` 가 공개 배럴(`packages/ui/src/index.ts`)을 import.

## 경계 (Hard Boundary)

- 이 도구는 **측정만** 한다. 위반을 발견해도 **코드를 고치지 않는다** (P1 단일 소유권).
  수정은 소유자의 일이다 — `apps/**` → A40/A41, `packages/**` → A30/A31/A32.
- 외부 의존성 0. `typescript`(AST)와 `tsx`(실행)는 리포 전 도구의 공통 devDependency 이며 신규 추가가 아니다.
  나머지는 node 내장 모듈만 쓴다.
- 소유 경로: `tools/code-quality/**`, `reports/code-quality/**` (A83).
  `package.json` 스크립트 등록은 **A80**, CI job 등록은 **A82** 의 소유다.

## 구현 구조

```
src/
  index.ts              진입점 — 스캔 → 6축 측정 → 리포트 → 종료 코드
  thresholds.ts         임계값 · 스캔 범위 · 도메인 어휘 · 레이어 순위 (기준의 구현상 원천)
  report.ts             리포트 생성 (JSON + MD)
  lib/
    ast.ts              TypeScript 컴파일러 API 기반 파싱 — import/export/함수/정규화 토큰
    fsutil.ts           리포 루트 탐색 · 재귀 순회 (외부 의존성 0)
  axes/
    page-coupling.ts    축 1 (blocker)
    domain-leak.ts      축 2 (blocker)
    duplication.ts      축 3 (major)
    complexity.ts       축 4 (major)
    dead-code.ts        축 5 (major)
    layer-direction.ts  축 6 (blocker)
```

축 1·2·5·6 은 **모듈 해석 기반 import 그래프**(정규식이 아니라 실제 파일 해석)로,
축 3·4 는 **AST** 로 측정한다. 정규식 스캔은 JSX·템플릿 리터럴·주석 안의 코드 조각을 코드로 오인하고,
**측정 도구의 오탐은 게이트의 거짓말이 된다.**
