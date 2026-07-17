# 페이지-모듈 파이프라인 (Page → Module Pipeline)

> **담당**: TDS 문서 · **검수**: 문서 리뷰 (G8)
> **상태**: Active · **적용 범위**: apps/admin 페이지 → packages/ui 모듈 → Figma 동기화 전 구간
> **상위 규정**: [docs/architecture/org-design-v2.md §7](../../architecture/org-design-v2.md)

Admin 페이지에서 출발해 공통 모듈을 추출하고, Storybook에 계층 등록한 뒤, Pages 조합과 Figma 동기화·검증으로 마무리하는 **정식 파이프라인 규정**이다. 이 문서는 G0~G8 게이트 체계를 대체하지 않으며, 게이트 위에서 "페이지 → 모듈" 방향의 작업 순서를 규정한다.

---

## 1. 전체 흐름

```
① Admin 페이지 구축 (프론트 구현, apps/admin)
      ▼
② 페이지 조사 · 공통 모듈 후보 추출 (재사용 가드 scan → reports/reuse/module-candidates-*.md)
      ▼
③ 모듈 후보별  G0 접수 → G3 계약 → G5 Storybook 빌드
      (atoms / molecules / organisms 카테고리 등록)
      ▼
④ Pages 조합 (스토리북 페이지, packages/ui/pages — 조립 전용)
      ▼
⑤ Figma 동기화 (pnpm codegen → Figma 플러그인)
      (Variables 생성 + TDS 문서 스타일: Cover / Foundations / Components / Pages)
      ▼
⑥ 검증 (비주얼 회귀 VRT ≤ 0.1% · 계약 테스트 4자 일치)
```

**방향 규칙**: 페이지가 먼저, 모듈이 나중이다. 페이지에서 실제로 반복 사용이 확인된 UI만 모듈로 승격한다(YAGNI). 반대로 모듈이 승격된 이후에는 페이지가 모듈을 소비하는 방향만 허용되며, 페이지 내 사본(copy-paste) 유지가 금지된다.

---

## 2. 단계별 규정

### ① Admin 페이지 구축

| 항목 | 내용 |
|---|---|
| 입력 | Screen Spec (`SCR-NNN`, docs/plan/ui/) · G1/G2 승인 산출물 · contracts/ 기존 계약 |
| 출력 | `apps/admin/src/**` 페이지 구현 (라우트·화면·상태) |
| 담당 | **프론트 구현** — 프론트 리팩터와 순차 배타 |
| 게이트 | **G6** (승인 코드 리뷰 · 차단 접근성 감사/성능 감사/계약 테스트) |
| 실행 명령 | `pnpm dev:admin` · `pnpm gate:precheck` |

- 페이지는 `packages/ui` public entry로만 컴포넌트를 import한다. 아직 모듈이 없는 UI는 페이지 로컬로 구현하되, ② 단계 스캔 대상임을 전제로 한다.
- 하드코딩 색상/치수 리터럴 금지 — 토큰 CSS 변수(`var(--tds-*)`) 또는 `packages/ui/generated/tokens/tokens.ts`의 타입드 맵만 사용.

### ② 페이지 조사 · 공통 모듈 후보 추출

| 항목 | 내용 |
|---|---|
| 입력 | `apps/admin/src/**` 구현 완료 페이지 · contracts/ 기존 계약 · packages/ui/src/ 기존 컴포넌트 |
| 출력 | `reports/reuse/module-candidates-*.md` (모듈 후보 목록 + REUSE/EXTEND/CREATE 판정 근거) |
| 담당 | **재사용 가드** |
| 게이트 | 게이트 아님 — ③의 G0 진입 입력값 생성 |
| 실행 명령 | `pnpm reuse:scan` |

- 스캔은 페이지 간 반복 패턴(마크업 구조·prop 형태·토큰 사용)을 비교해 공통 모듈 후보를 추출한다.
- 후보 리포트 없이 신규 모듈 계약(G3)을 생성하는 것은 금지된다 (재사용 가드 판정 없는 신규 계약 생성 금지 원칙과 동일).
- 기존 컴포넌트 유사도 ≥ 85%면 CREATE가 차단되고 EXTEND가 강제된다.

### ③ 모듈 후보별 G0 접수 → G3 계약 → G5 Storybook 빌드

| 항목 | 내용 |
|---|---|
| 입력 | `reports/reuse/module-candidates-*.md` 후보 항목 (1건 = 1 Task) |
| 출력 | 후보 항목별 작업 항목 → `contracts/*.contract.json` (Frozen) → `packages/ui/src/**` Story 포함 컴포넌트 |
| 담당 | **오케스트레이터**(접수) → 계약 엔지니어/계약 리뷰(계약) → **컴포넌트 엔지니어**(컴포넌트)/**스토리북 문서**(MDX) |
| 게이트 | **G0 → (G1/G2 fastPath 가능) → G3 ★Frozen → G5** (승인 스토리북 리뷰 · 차단 접근성 감사/계약 테스트) |
| 실행 명령 | `pnpm validate:contracts` · `pnpm codegen` · `pnpm sb` |

- Storybook 등록 시 **atoms / molecules / organisms 카테고리**에 배치한다. 카테고리 판정 기준:
  - **atoms**: 더 이상 분해되지 않는 단일 요소 (Button, Input, Badge …)
  - **molecules**: atoms 2개 이상의 고정 결합 (SearchField = Input + Button …)
  - **organisms**: 도메인 의미를 갖는 완결 블록 (DataTable, GnbHeader, FilterBar …)
- 카테고리는 Story 타이틀 계층(`Atoms/…`, `Molecules/…`, `Organisms/…`)과 폴더 구조가 일치해야 하며, 위반은 네이밍 가드가 차단한다.
- G5 통과 후 페이지(①)의 로컬 구현은 모듈 소비로 교체한다 (사본 잔존 시 재사용 가드 중복률 SLO ≤ 3% 위반).

### ④ Pages 조합

| 항목 | 내용 |
|---|---|
| 입력 | G5 통과 모듈 (packages/ui/src/) · Screen Spec (`SCR-NNN`) |
| 출력 | `packages/ui/pages/**` — Storybook **Pages** 카테고리 Story (`Pages/로그인`, `Pages/대시보드`, `Pages/상품등록` …) |
| 담당 | **스토리북 페이지** |
| 게이트 | **G5** (승인 스토리북 리뷰) |
| 실행 명령 | `pnpm sb` · `pnpm sb:build` |

- Pages는 **조립 전용**이다. 신규 컴포넌트 생성 금지 — 필요한 모듈이 없으면 변경 요청을 발행해 ③으로 되돌린다.
- Pages Story는 Figma **Pages 섹션**(⑤) 및 실제 Admin 화면(①)과 1:1 대응을 유지한다.

### ⑤ Figma 동기화

| 항목 | 내용 |
|---|---|
| 입력 | `contracts/*.contract.json` · `tokens/tokens.json` · packages/ui Story (Foundations~Pages) |
| 출력 | codegen 산출 `figma.json` → Figma **Variables**(토큰) + **TDS 문서 스타일 4개 섹션: Cover / Foundations / Components / Pages** + `docs/figma/specs/**` 스펙 미러 |
| 담당 | **Figma 플러그인** + Figma 담당들 (Component/Variable/Layout/Prototype/Icon) |
| 게이트 | **G7** (승인 Figma 리뷰 · 차단 비주얼 회귀/계약 테스트) |
| 실행 명령 | `pnpm codegen` → Figma 플러그인 실행 (tools/figma-plugin/) |

- Figma Variables는 tokens.json에서 플러그인으로 생성한다 — 수동 생성 금지, Detach 0.
- Figma 문서 구조는 Storybook 카테고리 구조를 그대로 미러링한다: Cover(표지) / Foundations(토큰) / Components(atoms·molecules·organisms) / Pages(조합 화면).

### ⑥ 검증

| 항목 | 내용 |
|---|---|
| 입력 | Storybook 빌드 · Figma 스펙 미러 · contracts/ · generated/ |
| 출력 | `reports/vrt/**` (비주얼 회귀) · `reports/contract-test/**` (계약 테스트) |
| 담당 | **비주얼 회귀** · **계약 테스트** |
| 게이트 | G7 차단 조건 + **4자 일치 최종 검증(합류 배리어)** → G8 릴리스 |
| 실행 명령 | `pnpm vrt` · `pnpm contract-test` |

- **비주얼 회귀**: Storybook ↔ Figma pixel diff **≤ 0.1%** — 초과 시 G7 차단.
- **계약 테스트**: Contract ↔ React ↔ Storybook ↔ Figma **4자 일치 100%** — 불일치 1건이면 G5/G6/G7 동시 차단.
- 두 검증을 통과해야 G8(릴리스, 릴리스 담당)로 진입하며, 이후 디자인 드리프트 상시 감시 루프에 들어간다.

---

## 3. Foundations 동기화 원칙

**tokens/tokens.json (W3C DTCG)이 단일 원천이다.** Storybook의 **Foundations 카테고리**와 Figma의 **Variables**는 같은 파일에서 codegen으로 파생된 두 개의 뷰이며, 서로를 베끼지 않는다.

```
tokens/tokens.json ──▶ pnpm codegen ──┬──▶ CSS Variables (var(--tds-*))
                                      ├──▶ packages/ui/generated/tokens/tokens.ts (타입드 맵)
                                      │        └──▶ Storybook Foundations 카테고리가 이 맵을 렌더링
                                      └──▶ figma.json ──▶ Figma 플러그인 ──▶ Figma Variables
```

- **검증이 아닌 구조적 보장**: Foundations 문서와 Figma Variables의 일치는 사후 비교(검증)로 확보하는 것이 아니라, 손으로 쓴 사본이 존재할 수 없는 파생 구조 자체로 보장한다. 두 뷰가 다르다면 그것은 동기화 실패가 아니라 codegen 파이프라인의 버그다.
- Foundations Story는 토큰 **값을 데이터로** 렌더링한다 — `tokens.ts` 타입드 맵을 순회해 표시하는 것은 허용되며, 색상/치수 리터럴을 Story 코드에 직접 쓰는 것은 금지된다.
- tokens.json 변경은 G4(토큰 엔지니어 생산 · 토큰 리뷰 승인)를 통해서만 이루어지고, 병합 즉시 codegen이 두 뷰를 동시에 갱신한다.

---

## 4. 토큰 3계층 등록 규칙

디자인 토큰의 3계층(primitive → semantic → component) 중 아래 세 그룹은 **Storybook Foundations 카테고리 등록이 필수**다. 등록 누락 시 G5를 통과할 수 없다.

| # | 그룹 | 등록 필수 내용 | Foundations Story | Figma 대응 |
|---|---|---|---|---|
| 1 | **컬러 팔레트** | primitive 색 스케일 전체 (라이트/다크 페어 포함) | `Foundations/Colors` | Color Variables (primitive 컬렉션) |
| 2 | **폰트 컬러** | semantic 텍스트 색 (default/muted/on-primary 등 역할별) | `Foundations/Font Colors` | Color Variables (semantic 컬렉션) |
| 3 | **타이포그래피** | 타입 스케일 (font-family/size/weight/line-height/letter-spacing 세트) | `Foundations/Typography` | Typography Variables / Text Styles |

> 위 3종은 **등록 필수**다. 그 외 Foundations Story(`Foundations/Spacing`·`Radius`·`Shadow`·`Motion`)도 동일하게 tokens.ts 를 데이터 소스로 렌더링하며, 현재 7종 전부 존재한다.

- 세 그룹 모두 `packages/ui/generated/tokens/tokens.ts` 타입드 맵을 데이터 소스로 렌더링한다. Story 파일에 토큰 값을 직접 옮겨 적는 것은 금지 (§3 원칙).
- 컴포넌트는 primitive를 직접 참조하지 않는다 — semantic 또는 component 계층 토큰만 사용 (토큰 엔지니어 계층 규칙).
- 신규 토큰 추가 시 세 그룹 해당 여부를 판정해 Foundations Story 갱신을 같은 Task에 포함한다. 갱신은 codegen 파생 데이터 기준이므로 별도 수기 작업은 원칙적으로 0이어야 한다.

---

## 5. 참고

- 게이트 정의·SLA·차단 조건: 게이트 체계 규정 참조
- 담당 소유 경로: 담당 소유 규정 참조
- 전체 워크플로우 배경: [docs/architecture/org-design-v2.md §7](../../architecture/org-design-v2.md)
