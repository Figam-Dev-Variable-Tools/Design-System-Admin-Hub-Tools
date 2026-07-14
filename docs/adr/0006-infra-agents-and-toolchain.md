---
id: ADR-0006
title: 인프라 에이전트 4종 신설 — 의존성·린트/포맷·CI/CD·클린코드 소유자 지정 (42 → 46)
status: accepted
date: 2026-07-15
owner: A01 (Architecture AI)
supersedes: null
relatedTo: [ADR-0001, ADR-0002, ADR-0004, ADR-0005]
---

# ADR-0006. 인프라 에이전트 4종 신설 및 툴체인 소유권 분할

## 맥락

화면 6종(로그인·대시보드·회원·운영자·권한·고객설정·상품등록), 컴포넌트 15종, 기능/백엔드 명세 8건이 나오면서
리포는 더 이상 스캐폴드가 아니라 **실제 제품 규모**가 됐다. 그런데 제품을 지탱하는 **인프라 영역에 소유자가 없다.**

| 영역 | 현재 상태 | 소유자 |
|---|---|---|
| 의존성 (`package.json`, lockfile) | react-router, storybook, vitest… 가 들어와 있으나 **누가 무엇을 왜 추가했는지 기록이 없다** | 없음 |
| 린트 / 포맷 | ESLint 9 flat config 2벌 존재. **포매터는 없다** — 스타일이 사람(에이전트)마다 갈린다 | A01의 `*.config.*`에 뭉뚱그려짐 |
| CI/CD | `pr-gates.yml`·`nightly.yml`·`release.yml` 존재. **소유자가 없어** required check 등록·부트스트랩 TODO(`--no-frozen-lockfile`)가 방치 | 없음 |
| 클린코드 점검 | 중복·복잡도·죽은 코드·결합을 **기계적으로 재는 주체가 없다** | 없음 |

그리고 소유자 없는 영역에서 예측대로 구조 결함이 자랐다.
**페이지가 다른 페이지의 컴포넌트를 가로질러 import 하는 구조**가 리뷰 없이 성장했다:

| import 하는 쪽 | import 되는 쪽 | 심볼 |
|---|---|---|
| `pages/admins/components/AdminsSearchCard.tsx` | `pages/members/components/Card`, `pages/members/icons`, `pages/members/styles` | `Card`, `SearchIcon`, `controlStyle` |
| `pages/admins/components/AdminGroupPanel.tsx` | `pages/members/format`, `pages/members/styles` | `formatNumber`, `badgeStyle` |
| `pages/permissions/components/RolePanel.tsx` · `RoleFormModal.tsx` · `RoleHeaderCard.tsx` | `pages/members/components/Button`, `Modal`, `Card`, `pages/members/styles` | `Button`, `Modal`, `Card` |
| `pages/customer-settings/components/TierPolicyCard.tsx` · `TierDistributionCard.tsx` | `pages/members/components/Card`, `Alert`, `HelpTip`, `pages/members/types` | `Card`, `Alert`, `MemberTier`, `TIER_LABEL` |

`members`를 지우면 `admins`·`permissions`·`customer-settings`가 함께 죽는다. 이것은 재사용이 아니라 **결합**이다.
사람 리뷰(A42)는 파일 단위 diff를 보므로 이런 **그래프 수준의 결함을 구조적으로 놓친다** — 각 PR은 "기존 Card를 재사용했다"로 보였을 것이다.

## 결정

**에이전트 4종을 신설한다 (42 → 46).**

| ID | 이름 | 계층 | 타입 | 정체성 |
|---|---|---|---|---|
| **A80** | Dependency Manager | L0 governance | governor | 라이브러리를 '유행'이 아니라 '문제'로 고른다 |
| **A81** | Lint & Format Engineer | L0 governance | governor | 규칙은 '스타일 취향'이 아니라 '버그 예방'을 위해 켠다 |
| **A82** | CI/CD Engineer | L0 governance | governor | CI는 '통과하는 것'이 아니라 '못 통과하게 막는 것'이 목적이다 |
| **A83** | Clean Code Inspector | L3 verification | verifier | 기계가 셀 수 있는 것은 도구로 재고, 셀 수 없는 것은 규칙으로 잡는다 |

**소유 경로 분할** (P1 단일 소유권 유지):

| 경로 | 소유자 |
|---|---|
| `package.json`, `*/package.json`, `**/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | **A80** (단, `package.json#version` 은 A03 유지) |
| `eslint.config.*`, `**/eslint.config.*`, `.prettierrc*`, `prettier.config.*`, `.editorconfig`, `.prettierignore`, `.eslintignore` | **A81** |
| `.github/workflows/**`, `.husky/**` | **A82** (단, `.github/CODEOWNERS` 는 A02 유지) |
| `tools/code-quality/**`, `reports/code-quality/**` | **A83** |

**기존 A01의 `*.config.*` 소유와 겹치는 lint 설정은 A81로 이관한다.**
A01은 `*.config.*`(vite·vitest·storybook 등)를 계속 소유하되, ESLint/Prettier 계열은 A81이 소유한다.
CODEOWNERS는 `agents.json` 순서대로 생성되고 **last-match-wins** 규칙이므로, A81 항목이 A01 항목보다 뒤에 배치되어 lint 설정에 대해 **A81이 우선**한다. 규칙 자체의 **설계 승인권은 A01에 남는다** — A81은 집행자이고, 규칙 신설·완화는 여전히 ADR을 요구한다.

**A83의 차단 기준**(`blockCondition`, PR 차단): 중복 코드 / 순환 복잡도 상한 / 죽은 코드 / **페이지 간 결합** / **도메인이 새는 공통 모듈** / 레이어 역방향 의존. 전부 측정 가능한 축이며, "읽기 좋다/나쁘다"는 차단 사유가 아니다.

## 근거

- **소유자 없는 영역은 아무도 책임지지 않는다.** 이것은 추상적 우려가 아니라 이미 일어난 일이다 — 위 맥락의 페이지 간 결합 표가 그 증거다. `apps/*/src/**`에는 소유자(A40/A41)가 있었지만 **"페이지가 페이지를 import 하면 안 된다"는 규칙을 재는 주체**가 없었고, 규칙이 없으니 위반도 없었다.
- **기계가 셀 수 있는 위반을 사람 리뷰에 맡기면 놓친다.** 중복·복잡도·결합은 전부 계산 가능하다. 계산 가능한 것을 사람이 눈으로 세는 것은 리뷰 시간을 낭비할 뿐 아니라 **일관되지 않게** 센다. A02(경계)·A74(4자 일치)·A76(네이밍)이 이미 증명한 패턴을 코드 품질로 확장한다.
- **의존성은 부채다.** 추가는 30초, 제거는 6개월이다. 번들 비용·유지보수 비용·부재 시 결과를 남기지 않은 추가는 미래의 누군가에게 "이거 왜 있죠?"라는 답 없는 질문을 남긴다.
- **포매터의 부재는 diff 노이즈를 만든다.** 서식 차이가 diff에 섞이면 리뷰어가 실질 변경을 보지 못한다. 그리고 서식은 **자동 수정 가능하므로 규칙이 아니라 도구의 영역**이다 — 이를 린트 규칙으로 처리하면 규칙 목록이 오염되어 "이 규칙이 막는 버그는 무엇인가"라는 질문이 무의미해진다.
- **CI는 게이트의 물리적 집행기다.** 게이트가 CI에 물려 있지 않으면 그 게이트는 문서상의 약속일 뿐이다. `bundle-size` job이 공허 통과(도구 graceful skip) 상태로 방치된 것, 부트스트랩 TODO(`--no-frozen-lockfile`)가 남아 있는 것 — 소유자가 없기 때문이다.

## 대안

1. **기존 A01이 전부 겸임한다.**
   A01은 이미 ADR·아키텍처·레지스트리·스키마·config 전부를 지고 있다. 여기에 의존성 심사·린트 규칙 유지·CI 파이프라인·코드 품질 측정을 얹으면 **과부하이자 추적 불가**다.
   더 나쁜 것은 **설정 변경이 설계 결정과 같은 소유 경로에 뒤섞인다는 점**이다 — "왜 이 규칙을 켰나"와 "왜 이 아키텍처인가"가 같은 에이전트의 같은 커밋에 섞이면, 나중에 규칙 하나를 되돌리려 할 때 그것이 설계 결정의 일부였는지 단순 튜닝이었는지 구분할 수 없다. **기각.**
2. **도구만 붙이고 에이전트는 만들지 않는다** (Prettier·jscpd·knip·dependency-cruiser를 CI에 추가).
   도구는 **규칙을 강제할 뿐 규칙을 정하지 못한다.** 임계값은 누가 정하는가? 프리셋이 커스텀 룰을 덮어쓸 때 누가 반려하는가? 의존성 추가 요청을 누가 거절하는가? **"누가, 왜 이 규칙인가"에 답할 주체가 없으면** 임계값은 위반이 생길 때마다 조용히 완화되고, 도구는 결국 꺼진다.
   이것이 이 조직이 A02·A74·A76을 "스크립트"가 아니라 **에이전트**로 세운 이유와 같다. **기각.**
3. **A83의 기준을 사람 리뷰(A42)에 통합한다.**
   A42는 이미 G6 검수를 지고 있고, 무엇보다 **리뷰어는 지적만 하고 직접 수정하지 않는다(P1)**. 문제는 A42가 못 잡는다는 것이 아니라 **일관되게 못 잡는다는 것**이다 — 실제로 못 잡았다. 기계 측정을 사람에게 위임하는 것은 검증 자체를 확률적으로 만든다. **기각.**

## 결과

- **레지스트리 46** — `orchestration/registry/agents.json`에 A80/A81/A82/A83 추가 (L0 governance 3 + L3 verification 1). L0:6 / L1:10 / L2:18 / L3:8 + A00.
- **스키마 상한 갱신** — `orchestration/schemas/agent-registry.v1.json`의 `properties.agents.minItems/maxItems` 를 46으로 갱신 (기대 에이전트 수의 정본은 스키마다 — `validate-registry.ts`가 여기서 읽는다).
- **SKILL 4종 신설** — `skills/dependency-manager/`, `skills/lint-format-engineer/`, `skills/cicd-engineer/`, `skills/clean-code-inspector/`. frontmatter는 레지스트리와 정확히 일치해야 하며 `pnpm validate:registry`가 대조한다.
- **CODEOWNERS 재생성** — A02가 `pnpm boundary:codeowners`로 재생성. lint 설정 경로에서 A81이 A01을 last-match-wins로 이긴다.
- **후속 작업 (별건 PR)**:
  - A81: Prettier + EditorConfig 도입. **flat config 순서 규칙 — 커스텀 룰(hex/px 금지, 레이어 의존) 블록을 항상 마지막에 배치**해 어떤 프리셋도 이를 덮어쓰지 못하게 한다. `eslint-config-airbnb`는 **ESLint 8 legacy 전용이라 flat config에서 그대로 쓸 수 없다** — 필요하면 flat-config 포팅 패키지 또는 규칙군 직접 구성(typescript-eslint strict + import + react + react-hooks + jsx-a11y) 두 갈래 중 택일한다.
  - A82: `bundle-size` 공허 통과 해소, 부트스트랩 TODO(`--no-frozen-lockfile` → `--frozen-lockfile`) 상환, required check 등록, 프리뷰 배포.
  - A83: `tools/code-quality/` 구현 + `pnpm quality:check` PR 게이트 편입.
  - A40/A41: 위 맥락 표의 **페이지 간 결합 해소** — `members`에 얹혀 있는 공통 요소(`Card`/`Button`/`Modal`/`Alert`/`HelpTip`/`styles`/`format`)를 `shared/ui`로 승격하고, `MemberTier`·`TIER_LABEL` 같은 도메인 값은 prop 주입으로 전환한다. 이 부채가 A83 도입 시 즉시 PR 차단 사유가 되므로, **A83 게이트 편입 전에 상환한다.**
