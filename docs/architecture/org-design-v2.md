# Enterprise Front-End AI Organization v2

> React + Design System + Storybook + Figma 100% 동기화 플랫폼을 위한 AI 에이전트 조직 설계서
> v1(28 에이전트 나열) → v2(**소유권 · 계약 · 게이트 · 검수 · 스킬 · 워크플로우**로 실행 가능하게 재구성)

---

## 0. v1 대비 무엇이 달라졌나

| 문제 (v1) | 해결 (v2) |
|---|---|
| 에이전트가 "역할 목록"으로만 존재 | 각 에이전트에 **소유 경로(Ownership Path)** 부여 → 물리적으로 남의 영역을 못 건드림 |
| QA가 조직 끝단에 몰림 (Storybook QA, VRT) | **모든 Division에 전담 Reviewer 배치** + 전사 게이트키퍼 |
| "계약으로 전달한다"는 원칙만 있고 계약 스펙이 없음 | **Component Contract(JSON) SSOT** 정의 + 자동 전파 파이프라인 |
| 산출물 형식이 불명확 | **표준 문서 8종 템플릿** 정의 |
| 순서/흐름 없음 | **G0~G8 품질 게이트 + 상태 머신 + 핸드오프 프로토콜** |
| 충돌 시 판단 주체 없음 | **에스컬레이션 규칙 + Boundary Enforcer** |
| 성공 여부 측정 불가 | **DoD + 메트릭/SLO** |

---

## 1. 조직 운영 3대 원칙

**P1. 단일 소유권 (Single Ownership)**
하나의 파일 경로는 정확히 하나의 에이전트만 쓰기 권한을 가진다. 읽기는 전원 허용, 쓰기는 소유자만.

**P2. 계약 우선 (Contract First)**
에이전트 간 모든 전달은 사람이 읽는 산문이 아니라 **기계가 검증 가능한 계약 파일**(JSON/YAML/Markdown+FrontMatter)로 한다. 계약이 없으면 작업 시작 불가.

**P3. 게이트 통과 (Gate Enforcement)**
산출물은 담당 Reviewer의 승인 없이 다음 단계로 넘어갈 수 없다. Reviewer는 **생산자와 반드시 다른 에이전트**여야 한다. (자가 검수 금지)

---

## 2. 조직도 v2 — 4계층 구조

```
┌─ Layer 0. GOVERNANCE ──────────────────────────────────┐
│  CEO AI (Orchestrator)                                 │
│  Architecture AI (설계 최종 결정 · ADR 소유)            │
│  Boundary Enforcer AI (소유권 위반 감시)                │
│  Release Manager AI (SemVer · Changelog · Migration)   │
└────────────────────────────────────────────────────────┘
            │
┌─ Layer 1. DEFINITION (무엇을 만들 것인가) ───────────────┐
│  Planning Division      → + Planning Reviewer           │
│  Design Division        → + Design Reviewer             │
│  Contract Division      → + Contract Reviewer  ★신설     │
└────────────────────────────────────────────────────────┘
            │  (Contract 확정 = 착수 조건)
┌─ Layer 2. PRODUCTION (병렬 생산) ───────────────────────┐
│  Token Division    → + Token Reviewer                   │
│  Storybook Division→ + Storybook Reviewer               │
│  React Division    → + Code Reviewer                    │
│  Figma Division    → + Figma Reviewer                   │
│  Docs Division     → + Docs Reviewer                    │
└────────────────────────────────────────────────────────┘
            │
┌─ Layer 3. VERIFICATION (교차 검증) ─────────────────────┐
│  Visual Regression AI  (Storybook ↔ Figma 픽셀 비교)     │
│  Design Drift AI       (토큰/구조 이탈 상시 감시)         │
│  A11y Audit AI         (WCAG 자동 + 수동 시나리오)        │
│  Performance Audit AI  (Bundle · Render · LCP)          │
│  Contract Test AI      (계약 ↔ 구현 일치 검증) ★신설      │
│  Reuse Guard AI        (중복 컴포넌트 차단)               │
│  Naming Guard AI       (네이밍 규칙 강제)                 │
└────────────────────────────────────────────────────────┘
```

---

## 3. 에이전트 카탈로그 (35 Agents)

`W` = 쓰기 소유 경로 / `R` = 읽기 전용 / `G` = 담당 게이트

### Layer 0 — Governance

| ID | Agent | 소유(W) | 핵심 산출물 | 권한 |
|---|---|---|---|---|
| A00 | **CEO AI (Orchestrator)** | `/orchestration/**` | Task Graph, 실행 계획, 에스컬레이션 판정 | 모든 게이트 강제 통과(override) 권한 — 단 ADR 기록 필수 |
| A01 | **Architecture AI** | `/docs/adr/**`, `/docs/architecture/**`, `*.config.*` | ADR, Folder Structure, Dependency Rules, Lint 규칙 | 설계 거부권. **구현 코드 작성 금지** |
| A02 | **Boundary Enforcer AI** | `/.github/CODEOWNERS`, `/tools/boundary/**` | 소유권 위반 리포트 | 위반 PR **자동 차단** |
| A03 | **Release Manager AI** | `/CHANGELOG.md`, `/docs/migration/**`, `package.json[version]` | SemVer, Changelog, Deprecation 정책, Release Note | 릴리스 최종 승인(G8) |

### Layer 1 — Definition

| ID | Agent | 소유(W) | 산출물 | 게이트 |
|---|---|---|---|---|
| A10 | UX Planner | `/docs/plan/ux/**` | IA, User Flow, Sitemap, Screen Flow, Business Flow | → G1 |
| A11 | UI Planner | `/docs/plan/ui/**` | Screen Spec(화면정의서), 컴포넌트 필요/재사용 판정 요청 | → G1 |
| A12 | **Planning Reviewer** ★ | `/docs/plan/**/review/**` | 요구사항 검수 리포트 | **G1 승인권** |
| A13 | UX Designer | `/docs/design/ux/**` | Interaction Spec, Keyboard Map, Focus Order, Motion Spec, Responsive 규칙 | → G2 |
| A14 | UI Designer | `/docs/design/ui/**` | Visual Spec (Layout/Grid/Type/Color/Shadow/Radius/Spacing) | → G2 |
| A15 | Icon Designer | `/assets/icons/**` | SVG (12/16/20/24 × Filled/Outlined/Rounded/Sharp) | → G2 |
| A16 | Illustration Designer | `/assets/illustrations/**` | Empty / Error / Success / Loading / No-Data | → G2 |
| A17 | **Design Reviewer** ★ | `/docs/design/**/review/**` | 디자인 검수 리포트 (토큰 준수 · 접근성 · 일관성) | **G2 승인권** |
| A18 | **Component Contract Engineer** ★핵심 | `/contracts/**` | `*.contract.json` (Props · Variants · Slots · Events · States · A11y) | → G3 |
| A19 | **Contract Reviewer** ★ | `/contracts/**/review/**` | 계약 검수 리포트 (하위호환 · 네이밍 · 타입) | **G3 승인권 — 이 게이트 통과 전 Layer 2 착수 금지** |

### Layer 2 — Production (계약 확정 후 **병렬** 실행)

| ID | Agent | 소유(W) | 산출물 | 게이트 |
|---|---|---|---|---|
| A20 | Design Token Engineer | `/tokens/**` | `tokens.json` (W3C DTCG 포맷) — **Source of Truth** | → G4 |
| A21 | **Token Reviewer** ★ | `/tokens/**/review/**` | 토큰 검수 (명명 · 계층 · 대비비 · 다크모드 페어링) | **G4 승인권** |
| A30 | Storybook Component Engineer | `/packages/ui/src/**` | Atoms → Molecules → Organisms → Templates | → G5 |
| A31 | Storybook Documentation Engineer | `/packages/ui/**/*.mdx` | Usage, Do/Don't, A11y, Responsive, Playground | → G5 |
| A32 | Storybook Pages Engineer | `/packages/ui/pages/**` | Pages 탭 (Dashboard/User/Product/Settings…) — **조립만** | → G5 |
| A33 | **Storybook Reviewer (QA)** ★ | `/packages/ui/**/review/**` | Variant/Boolean/Slot/Dark/RTL/Play Function 전수 검사 | **G5 승인권** |
| A40 | React Front-End Engineer | `/apps/**/src/**` | React + Vite + TS 구현 (Composition, Hook, Context) | → G6 |
| A41 | React Refactoring Agent | `/apps/**/src/**` (A40과 순차 배타) | SOLID · DRY · KISS · YAGNI 리팩터 | → G6 |
| A42 | **Code Reviewer** ★ | PR 코멘트 전용 | 코드 검수 (계약 준수 · 레이어 위반 · 테스트 커버리지) | **G6 승인권** |
| A50 | Figma Plugin Engineer | `/tools/figma-plugin/**` | Storybook → JSON → Figma 자동 생성 플러그인 | → G7 |
| A51 | Figma Component Engineer | Figma File (Components) | Component / Variant / Component Set | → G7 |
| A52 | Figma Variable Engineer | Figma File (Variables) | Color/Type/Radius/Spacing/Shadow Variables | → G7 |
| A53 | Figma UI Designer | Figma File (Layout) | Auto Layout, Constraints, Grid, Responsive | → G7 |
| A54 | Figma UX Designer | Figma File (Prototype) | Prototype, Interaction, Animation | → G7 |
| A55 | Figma Icon Designer | Figma File (Icons) | Icon Component + Variable 연결 | → G7 |
| A56 | **Figma Reviewer (QA)** ★ | `/docs/figma/review/**` | Figma 검수 (Variable 바인딩률 · Naming · Detach 여부) | **G7 승인권** |
| A60 | TDS Documentation AI | `/docs/tds/**` | Markdown · Storybook Docs · Website · PDF · Notion | → G8 |
| A61 | **Docs Reviewer** ★ | `/docs/**/review/**` | 문서 검수 (최신성 · 예제 동작 · 링크 · 용어 통일) | **G8 승인권** |

### Layer 3 — Verification (상시 실행, 게이트 입력값 생성)

| ID | Agent | 역할 | 차단 조건 |
|---|---|---|---|
| A70 | Visual Regression AI | Storybook 스크린샷 ↔ Figma 스크린샷 AI 비교 + Pixel Diff | Diff > 0.1% → G7 차단 |
| A71 | Design Drift AI | Storybook ≠ Figma ≠ Token 이탈 상시 감시 + 자동 수정 PR | Drift 발견 시 알림, 자동 Fix PR 생성 |
| A72 | Accessibility Audit AI | axe-core + Storybook a11y + 수동 시나리오(SR/키보드) | Critical 1건 → G5/G6 차단 |
| A73 | Performance Audit AI | Bundle Size, Render Count, Suspense, Tree Shaking | Budget 초과 → G6 차단 |
| A74 | **Contract Test AI** ★ | `contract.json` ↔ React Props ↔ Storybook argTypes ↔ Figma Properties **4자 일치 검증** | 불일치 1건 → G5/G6/G7 전부 차단 |
| A75 | Component Reuse AI | 신규 요청 시 Storybook 검색 → 유사도 판정 → Reuse/Extend/Create 결정 | 유사도 ≥ 85% → 신규 생성 차단 |
| A76 | Naming Convention AI | Folder/Component/Variant/Variable/Token/Icon/Story/Page | 규칙 위반 → 커밋 차단 |

> ★ = v2에서 신설/승격된 검수·계약 에이전트

---

## 4. 소유권 매트릭스 (물리적 강제)

`.github/CODEOWNERS` — Boundary Enforcer가 생성·관리하며, 위반 시 CI가 PR을 막는다.

```
/docs/adr/**              @architecture-ai
/docs/plan/**             @ux-planner @ui-planner
/docs/design/**           @ux-designer @ui-designer
/contracts/**             @contract-engineer
/tokens/**                @token-engineer
/assets/icons/**          @icon-designer
/packages/ui/src/**       @storybook-component-engineer
/packages/ui/**/*.mdx     @storybook-doc-engineer
/packages/ui/pages/**     @storybook-pages-engineer
/apps/**/src/**           @react-engineer @react-refactorer
/tools/figma-plugin/**    @figma-plugin-engineer
/docs/tds/**              @tds-doc-ai
/CHANGELOG.md             @release-manager
```

**금지 규칙 (Lint로 강제)**

| 금지 | 검출 방법 |
|---|---|
| React 코드에 하드코딩 색상/px | ESLint `no-raw-value` 커스텀 룰 |
| UI 패키지가 앱 코드를 import | `eslint-plugin-boundaries` |
| Atom이 Organism을 import (역방향 의존) | `dependency-cruiser` |
| Figma에서 Variable 미사용 스타일 | Plugin 스캔 |
| 컴포넌트 신규 생성 without Contract | pre-commit hook |

---

## 5. 계약(Contract) 체계 — 진짜 SSOT

### 5.1 단일 진실 공급원 파이프라인

```
tokens.json (DTCG)  ──┬──> CSS Variables  ──> React
                      ├──> Storybook Theme
                      ├──> Figma Variables (Plugin)
                      └──> Tailwind/Panda config

component.contract.json ──┬──> React Props (TS type 자동 생성)
                          ├──> Storybook argTypes 자동 생성
                          ├──> Figma Component Properties (Plugin)
                          └──> Docs 자동 생성
```

**핵심: 이 4곳은 손으로 쓰지 않는다. 계약에서 생성한다.** → Drift가 구조적으로 발생 불가능.

### 5.2 Component Contract 스키마 (예: Button)

```jsonc
{
  "$schema": "https://tds.internal/schemas/component.v1.json",
  "name": "Button",
  "version": "2.1.0",
  "level": "atom",                 // atom | molecule | organism | template | page
  "status": "stable",              // draft | beta | stable | deprecated
  "owner": { "code": "A30", "design": "A14", "figma": "A51" },

  "props": {
    "variant": {
      "type": "enum",
      "values": ["primary", "secondary", "ghost", "danger"],
      "default": "primary",
      "figmaProperty": "Variant",   // Figma Variant 매핑
      "required": false
    },
    "size":     { "type": "enum", "values": ["sm","md","lg"], "default": "md", "figmaProperty": "Size" },
    "loading":  { "type": "boolean", "default": false, "figmaProperty": "Loading" },
    "disabled": { "type": "boolean", "default": false, "figmaProperty": "Disabled" },
    "iconLeft": { "type": "slot", "accepts": ["Icon"] },
    "children": { "type": "node", "required": true }
  },

  "events": {
    "onClick": { "payload": "MouseEvent", "blockedWhen": ["disabled", "loading"] }
  },

  "states": ["default", "hover", "active", "focus-visible", "disabled", "loading"],

  "tokens": {
    "background": "color.action.primary.default",
    "radius": "radius.md",
    "paddingX": "space.4"
  },

  "a11y": {
    "role": "button",
    "keyboard": ["Enter", "Space"],
    "focusVisible": true,
    "ariaDisabled": "when disabled",
    "ariaBusy": "when loading",
    "contrastMin": 4.5
  },

  "responsive": { "breakpoints": ["sm","md","lg"], "behavior": "size-fixed" },

  "compat": {
    "breakingSince": null,
    "deprecatedProps": [{ "name": "type", "replacedBy": "variant", "removeIn": "3.0.0" }]
  }
}
```

### 5.3 Contract Test AI가 검증하는 4자 일치

| 검증 축 | 대상 |
|---|---|
| Contract ↔ React | TS Props 타입, default 값, 이벤트 시그니처 |
| Contract ↔ Storybook | argTypes, Story 조합 커버리지(모든 variant × size × state) |
| Contract ↔ Figma | Component Property 이름/타입/값 |
| Contract ↔ Token | 하드코딩 값 0건, 참조 토큰 존재 여부 |

**하나라도 어긋나면 4개 게이트가 동시에 막힌다.** — 이것이 "100% 동기화"의 실제 구현체다.

---

## 6. 표준 문서 8종

| # | 문서 | 소유자 | 파일 규칙 | 목적 |
|---|---|---|---|---|
| D1 | **ADR** (Architecture Decision Record) | A01 | `/docs/adr/NNNN-title.md` | 결정 · 근거 · 대안 · 결과 |
| D2 | **PRD / Screen Spec** | A11 | `/docs/plan/ui/SCR-NNN.md` | 화면 정의(목록/검색/필터/등록/수정/삭제) |
| D3 | **Design Spec** | A13/A14 | `/docs/design/DS-NNN.md` | 시각/상호작용 명세 |
| D4 | **Component Contract** | A18 | `/contracts/<Name>.contract.json` | 4자 계약 |
| D5 | **Review Report** | 각 Reviewer | `/**/review/RR-<gate>-<id>.md` | 검수 결과 (아래 템플릿) |
| D6 | **Changelog / Release Note** | A03 | `/CHANGELOG.md` | SemVer + Breaking 표기 |
| D7 | **Migration Guide** | A03 | `/docs/migration/vX-to-vY.md` | Deprecated → 대체 경로 |
| D8 | **TDS Guideline** | A60 | `/docs/tds/**` | 패턴 · Best Practice · Do/Don't |

### 6.1 Review Report 템플릿 (모든 Reviewer 공통)

```markdown
---
gate: G5
target: Button@2.1.0
reviewer: A33 (Storybook Reviewer)
producer: A30
result: CHANGES_REQUESTED   # APPROVED | CHANGES_REQUESTED | BLOCKED
severity: major             # blocker | major | minor | nit
date: 2026-07-14
---

## 검수 기준 (Checklist)
- [x] Contract의 모든 prop이 argTypes에 존재
- [x] variant(4) × size(3) × state(6) 조합 Story 커버리지 100%
- [ ] Dark mode Story 누락  ← ❌
- [x] RTL 레이아웃 정상
- [ ] Play Function: loading 중 onClick 차단 검증 없음  ← ❌
- [x] a11y: axe violation 0

## 지적사항
| # | 심각도 | 위치 | 내용 | 요구 조치 |
|---|---|---|---|---|
| 1 | major | Button.stories.tsx | Dark 배경 Story 없음 | `parameters.backgrounds` 추가 |
| 2 | blocker | Button.play.ts | loading 시 클릭 차단 미검증 | Play Function 추가 |

## 판정
BLOCKER 1건 → **G5 미통과**. A30에게 반려. 재검수 SLA: 4h
```

---

## 7. 워크플로우 — 게이트 G0~G8

### 7.1 전체 흐름

```
G0  요청 접수        CEO AI ── Task Graph 생성, Reuse Guard 사전 조회
      │              (기존 컴포넌트로 해결 가능 → 여기서 종료)
      ▼
G1  기획 확정        UX/UI Planner ──▶ Planning Reviewer 승인
      ▼
G2  디자인 확정      UX/UI/Icon Designer ──▶ Design Reviewer 승인
      ▼
G3  ★ 계약 확정      Contract Engineer ──▶ Contract Reviewer 승인
      │              ※ 여기서부터 계약은 Frozen. 변경 시 G3 재진입 + SemVer 판정
      ├──────────────┬──────────────┬──────────────┐   ← 병렬 시작
      ▼              ▼              ▼              ▼
G4 Token 확정    G5 Storybook   G6 React 구현   G7 Figma 동기화
   Token Rev.       Storybook QA    Code Rev.       Figma Rev.
      │              │  + A11y       │ + Perf        │ + Visual Regression
      └──────────────┴──────────────┴──────────────┘
                     ▼
              Contract Test AI (4자 일치 최종 검증)
                     ▼
G8  릴리스          Release Manager ── SemVer · Changelog · Migration
                     ▼
              Design Drift AI (상시 감시 루프로 진입)
```

### 7.2 신규 컴포넌트 요청 시퀀스

```
User: "회원관리 화면에 상태 필터가 필요합니다"

1. CEO AI        → Task 분해, A75(Reuse Guard) 호출
2. Reuse Guard   → Storybook 검색: "Select", "Dropdown", "FilterChip"
                   유사도 78% (Select 존재하나 multi-select 미지원)
                   판정: EXTEND (신규 생성 금지, Select 확장)
3. UI Planner    → SCR-012 Screen Spec 갱신 (필터 동작 정의)
4. Planning Rev. → G1 APPROVED
5. UX Designer   → 키보드 조작(↑↓ Enter Esc), Focus trap 명세
   UI Designer   → 시각 스펙 (기존 토큰만 사용, 신규 토큰 0)
6. Design Rev.   → G2 APPROVED
7. Contract Eng. → Select.contract.json에 `multiple: boolean` 추가
                   → MINOR 버전 (하위호환 O)
8. Contract Rev. → G3 APPROVED, 계약 Frozen
   ─────────── 이하 병렬 ───────────
9a. Storybook Eng. → multiple variant Story 추가
9b. React Eng.     → 구현 (계약에서 생성된 타입 사용)
9c. Figma Eng.     → Component Property 추가 (Plugin 자동)
10. Contract Test  → 4자 일치 ✅
11. Visual Regr.   → Storybook vs Figma diff 0.03% ✅
12. Release Mgr    → Select@2.3.0 릴리스, Changelog 갱신
```

### 7.3 반려(Reject) 처리 상태 머신

```
DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──▶ 다음 게이트
                     │
                     ├─changes_requested──▶ REWORK ──▶ IN_REVIEW (최대 2회)
                     │                          │
                     │                     3회 실패
                     │                          ▼
                     └─blocked───────────▶ ESCALATED → Architecture AI 판정
                                                     → 해결 불가 시 CEO AI + Human
```

**루프 방지 규칙**: 동일 지적사항 3회 반복 시 자동 에스컬레이션. Reviewer는 지적만 하고 **직접 수정하지 않는다** (P1 위반).

---

## 8. 검수 체계 — Division별 DoD & 체크리스트

### G1 · Planning Reviewer (A12)
- [ ] 모든 화면이 User Flow의 노드와 1:1 매핑되는가
- [ ] CRUD 각 상태(목록/검색/필터/등록/수정/삭제)의 **빈 상태 · 에러 · 로딩 · 권한없음** 정의됨
- [ ] 각 화면의 필요 컴포넌트가 **기존/신규**로 분류되고 Reuse Guard 조회 결과가 첨부됨
- [ ] 비즈니스 규칙(권한, 유효성)이 화면별로 명시됨
- [ ] 모호한 문구("적절히", "직관적으로") 0건

### G2 · Design Reviewer (A17)
- [ ] 스펙의 모든 값이 **토큰 참조**인가 (하드코딩 hex/px 0건)
- [ ] 신규 토큰 요청이 있다면 정당화 문서 첨부
- [ ] 대비비 4.5:1 (본문) / 3:1 (대형·UI) 충족
- [ ] 키보드 조작 순서 · Focus 링 · Esc 동작 명시
- [ ] 반응형 3 브레이크포인트 전부 명세
- [ ] 모션: duration/easing이 motion 토큰 참조, `prefers-reduced-motion` 대응

### G3 · Contract Reviewer (A19) — **가장 중요한 게이트**
- [ ] Prop 이름이 Naming Convention 통과 (boolean은 `is/has/can` 또는 형용사, 이벤트는 `on*`)
- [ ] enum 값이 디자인 스펙의 variant와 완전 일치
- [ ] 모든 prop에 `default` 또는 `required: true`
- [ ] Figma Property 매핑 누락 0건
- [ ] a11y 블록(role/keyboard/aria) 작성됨
- [ ] **하위호환 판정**: prop 제거/타입 변경/default 변경 → MAJOR, 추가 → MINOR
- [ ] Deprecated prop에 `removeIn` 버전과 대체재 명시

### G4 · Token Reviewer (A21)
- [ ] 3계층 준수: `primitive` → `semantic` → `component` (컴포넌트가 primitive 직접 참조 금지)
- [ ] 라이트/다크 페어링 누락 0건
- [ ] 순환 참조 없음
- [ ] 미사용 토큰 리포트 (누적 5% 초과 시 정리 요구)

### G5 · Storybook Reviewer (A33)
- [ ] Contract의 모든 prop이 argTypes에 존재 (Contract Test AI 결과 첨부)
- [ ] **조합 커버리지**: variant × size × state 전수
- [ ] Boolean prop은 true/false 모두 Story 존재
- [ ] Slot에 최소/최대 콘텐츠 케이스 (긴 텍스트, 줄바꿈, 오버플로우)
- [ ] Dark / RTL / Responsive Story 존재
- [ ] Play Function으로 인터랙션 검증 (disabled 클릭 차단 등)
- [ ] MDX: Usage · Do/Don't · A11y · Code 4개 섹션 필수
- [ ] axe violations 0 (critical/serious)

### G6 · Code Reviewer (A42)
- [ ] Contract에서 생성된 타입 사용 (수동 타입 선언 0건)
- [ ] 레이어 의존 방향 준수 (Atom ← Molecule ← Organism)
- [ ] 하드코딩 값 0건 (Lint 통과)
- [ ] 앱 코드가 `packages/ui` 내부 경로 직접 import 금지 (public entry만)
- [ ] 리스트 100행 이상 → 가상화 적용 여부
- [ ] Performance Budget: 컴포넌트 추가 gzip +2KB 이내
- [ ] 테스트: 계약의 모든 상태에 대한 렌더 테스트

### G7 · Figma Reviewer (A56)
- [ ] Variable 바인딩률 100% (Detached style 0)
- [ ] Component Set 구조가 Contract variant와 동일
- [ ] Auto Layout 적용, 하드코딩 사이즈 0
- [ ] Visual Regression diff ≤ 0.1%
- [ ] 네이밍: `Component/Variant=primary, Size=md` 규격

### G8 · Docs Reviewer + Release Manager (A61, A03)
- [ ] Changelog에 Breaking Change 명시적 표기
- [ ] Migration Guide 존재 (MAJOR인 경우)
- [ ] 문서 코드 예제가 실제 빌드/실행됨
- [ ] Deprecated 컴포넌트에 콘솔 경고 + 문서 배너

---

## 9. Agent Skill 표준 포맷

각 에이전트는 아래 형식의 **Skill 폴더**로 정의한다. (Claude Agent Skills 규격 호환)

```
/skills/
  storybook-component-engineer/
    SKILL.md                  ← 정체성 · 경계 · 절차
    references/
      atomic-design-rules.md
      story-patterns.md
    scripts/
      generate-story.ts       ← contract.json → *.stories.tsx 생성
      validate-coverage.ts
    templates/
      Component.tsx.hbs
      Component.stories.tsx.hbs
```

### 9.1 SKILL.md 템플릿

```markdown
---
name: storybook-component-engineer
description: Component Contract로부터 Storybook 컴포넌트(Atoms→Templates)를 생성/수정한다.
             신규 컴포넌트 요청, variant 추가, 상태 추가 시 사용.
allowed-tools: [Read, Write(packages/ui/src/**), Bash(pnpm sb:*), Grep]
owns: packages/ui/src/**
reads: contracts/**, tokens/**, docs/design/**
gate: G5
reviewer: storybook-reviewer
---

## 정체성
너는 Storybook 컴포넌트 엔지니어다. **Contract가 유일한 명세**이며, 계약에 없는 것은 만들지 않는다.

## 절대 금지 (Hard Boundary)
- `/apps/**` 수정 금지 (React Engineer 영역)
- `/contracts/**` 수정 금지 — 계약 변경이 필요하면 **작업을 멈추고 Contract Engineer에게 변경 요청서를 낸다**
- `/tokens/**` 수정 금지 — 필요한 토큰이 없으면 Token Engineer에게 요청
- 하드코딩 색상/사이즈 금지 — 100% 토큰 참조
- 자기 산출물 자가 승인 금지 — 반드시 Storybook Reviewer 검수

## 입력 (Preconditions)
1. `contracts/<Name>.contract.json` 이 G3 APPROVED 상태
2. `tokens/tokens.json` 에 참조 토큰이 전부 존재
→ 하나라도 미충족 시 **작업 거부하고 blocker 리포트 생성**

## 절차
1. `scripts/generate-story.ts` 실행 → 골격 생성
2. Atomic level 확인 (atom은 다른 컴포넌트 import 금지)
3. 모든 variant × size × state 조합 Story 작성
4. Dark / RTL / Responsive / Long-content Story 추가
5. Play Function 작성 (계약의 `events.blockedWhen` 전수 검증)
6. `scripts/validate-coverage.ts` 실행 → 100% 아니면 3번으로
7. Review 요청 생성 (템플릿 D5)

## 출력 (Definition of Done)
- `Component.tsx`, `Component.stories.tsx`, `Component.mdx`
- Coverage 리포트 100%
- axe violations 0
- Contract Test AI 통과

## 에스컬레이션
- 계약이 모호하다 → Contract Engineer (SLA 2h)
- 디자인 스펙과 계약이 충돌 → Architecture AI 판정
- 동일 반려 3회 → CEO AI
```

### 9.2 Reviewer Skill 템플릿 (전 Reviewer 공통 골격)

```markdown
---
name: {division}-reviewer
description: {Division} 산출물을 게이트 기준으로 검수하고 APPROVED/CHANGES_REQUESTED/BLOCKED를 판정한다.
allowed-tools: [Read, Write(**/review/**), Bash(pnpm test:*, pnpm lint)]
owns: {division}/**/review/**
gate: G{n}
---

## 정체성
너는 검수자다. **생산하지 않는다. 판정한다.**

## 절대 금지
- 대상 산출물 직접 수정 금지 (수정은 생산자의 일)
- "대체로 괜찮음" 같은 모호한 판정 금지 — 반드시 체크리스트 항목별 O/X
- 체크리스트에 없는 개인 취향으로 반려 금지 → 필요하면 Architecture AI에 규칙 추가 제안

## 절차
1. 체크리스트 전 항목 기계적 검증 (자동화 스크립트 우선)
2. 위반 건별 severity 판정: blocker / major / minor / nit
3. Review Report(D5) 작성
4. 판정:
   - blocker ≥ 1 → BLOCKED
   - major ≥ 1 → CHANGES_REQUESTED
   - minor/nit만 → APPROVED (후속 티켓 발행)
5. 판정 결과를 CEO AI 오케스트레이터에 통보

## 재검수 SLA
4시간 이내. 반려 사유는 **재현 방법 + 기대 결과**를 반드시 포함.
```

---

## 10. 핸드오프 프로토콜 (에이전트 간 메시지 규격)

모든 에이전트 간 통신은 이 envelope을 따른다. 산문 금지.

```jsonc
{
  "id": "TASK-2026-0714-031",
  "type": "handoff",              // handoff | review_request | review_result | escalation | change_request
  "from": "A30",
  "to":   "A33",
  "gate": "G5",
  "subject": "Select@2.3.0 multiple variant 구현 완료",
  "artifacts": [
    "packages/ui/src/Select/Select.stories.tsx",
    "packages/ui/src/Select/Select.mdx"
  ],
  "preconditions_met": {
    "contract_approved": true,
    "contract_version": "2.3.0",
    "tokens_available": true
  },
  "automated_checks": {
    "contract_test": "pass",
    "axe": "0 violations",
    "coverage": "100%"
  },
  "blockers": [],
  "sla_hours": 4,
  "escalation_count": 0
}
```

**Change Request (하위 → 상위 요청)** — 하드 바운더리를 지키면서 변경을 얻는 유일한 경로:

```jsonc
{
  "type": "change_request",
  "from": "A30",          // Storybook Engineer
  "to": "A18",            // Contract Engineer
  "reason": "loading 상태에서 아이콘 슬롯 처리 규칙이 계약에 없음",
  "proposed": { "props.iconLeft.hiddenWhen": ["loading"] },
  "impact": "MINOR",
  "blocking": true        // true면 생산 작업 중단
}
```

---

## 11. 자동화 파이프라인 (CI)

| 트리거 | 실행 | 실패 시 |
|---|---|---|
| pre-commit | Naming Guard, 하드코딩 Lint | 커밋 차단 |
| PR open | Boundary Enforcer (CODEOWNERS 위반) | PR 차단 |
| PR open | Contract Test AI (4자 일치) | PR 차단 |
| PR open | axe-core (Playwright 로 storybook-static 전 스토리 순회 — ADR-0011) | critical/serious ≥ 1 시 차단 + Reviewer에 리포트 |
| PR open | Bundle size diff (size-limit) | Budget 초과 시 차단 |
| PR merge → main | Storybook 배포, Figma Plugin Sync | Drift AI 알림 |
| nightly | Visual Regression (Storybook ↔ Figma) | Drift 리포트 + 자동 Fix PR |
| nightly | 미사용 토큰/컴포넌트 리포트 | Architecture AI 큐 적재 |
| release tag | Changelog 생성, Migration Guide 검증 | 릴리스 차단 |

---

## 12. 메트릭 & SLO

| 지표 | 목표 | 담당 |
|---|---|---|
| Contract ↔ 구현 일치율 | **100%** | A74 |
| Storybook ↔ Figma Visual Diff | ≤ 0.1% | A70 |
| 토큰 미사용(하드코딩) 값 | **0건** | A71 |
| 컴포넌트 중복률 | ≤ 3% | A75 |
| a11y Critical 위반 | **0건** | A72 |
| Story 조합 커버리지 | 100% | A33 |
| 게이트 1회 통과율 | ≥ 70% (낮으면 계약/스펙 품질 문제) | A00 |
| 평균 반려 횟수 | ≤ 1.3회 | A00 |
| Drift 발견 → 수정 리드타임 | ≤ 24h | A71 |
| 신규 컴포넌트 리드타임 (G0→G8) | ≤ 3일 | A00 |

---

## 13. 충돌 · 에스컬레이션 규칙

| 상황 | 판정자 |
|---|---|
| 디자인 스펙 ↔ 계약 충돌 | **Architecture AI** (계약이 우선, 디자인 수정) |
| 접근성 ↔ 비주얼 충돌 | **접근성 우선** (Design Reviewer가 반려) |
| 성능 ↔ 기능 충돌 | Architecture AI, Budget 초과 시 기능 축소 |
| 재사용 ↔ 신규생성 충돌 | Reuse Guard 판정 (유사도 85% 이상은 확장 강제) |
| 하위호환 ↔ 클린 API 충돌 | Release Manager (Deprecation 경로 필수) |
| Reviewer ↔ Producer 3회 교착 | CEO AI → 필요 시 Human |
| CEO AI의 게이트 Override | **반드시 ADR 기록 + 기술부채 티켓 발행** |

---

## 14. 리포지토리 구조

```
/
├── .github/CODEOWNERS              A02
├── contracts/                      A18  ★ SSOT
│   ├── Button.contract.json
│   └── schemas/component.v1.json
├── tokens/                         A20  ★ SSOT
│   └── tokens.json  (DTCG)
├── packages/
│   └── ui/                         A30/A31/A32
│       ├── src/{atoms,molecules,organisms,templates}/
│       ├── pages/                  ← Storybook Pages 탭 (조립 전용)
│       └── generated/              ← 계약에서 자동 생성 (수동 편집 금지)
├── apps/
│   └── admin/                      A40/A41
├── assets/{icons,illustrations}/   A15/A16
├── tools/
│   ├── figma-plugin/               A50
│   ├── codegen/                    contract → types/argTypes/figma
│   ├── boundary/                   A02
│   └── vrt/                        A70
├── docs/
│   ├── adr/                        A01
│   ├── plan/{ux,ui}/               A10/A11
│   ├── design/{ux,ui}/             A13/A14
│   ├── tds/                        A60
│   ├── migration/                  A03
│   └── **/review/                  각 Reviewer
├── skills/                         35개 에이전트 SKILL.md
└── CHANGELOG.md                    A03
```

---

## 15. 도입 로드맵

| Phase | 기간 | 내용 | 완료 조건 |
|---|---|---|---|
| **P0. 골격** | 1주 | Architecture AI, CODEOWNERS, Boundary Enforcer, 리포 구조, Skill 템플릿 | 소유권 위반이 CI에서 차단됨 |
| **P1. SSOT** | 2주 | Token Engineer + Contract Engineer + codegen 파이프라인 | contract.json 1개로 React 타입 + argTypes + Figma Property 동시 생성 |
| **P2. 생산 라인** | 3주 | Storybook/React/Figma Division + 각 Reviewer | Button/Input/Select 3종이 G0→G8 완주 |
| **P3. 검증 라인** | 2주 | Contract Test, VRT, A11y, Reuse, Naming Guard | Drift 자동 감지 + 자동 Fix PR |
| **P4. 확장** | 지속 | Pages 탭, TDS 문서, Release Manager, 다중 Admin 프로젝트 적용 | 2개 이상 프로젝트가 동일 TDS 소비 |

> **먼저 만들 것 딱 3개**: ① `component.contract.json` 스키마 ② `codegen`(계약→4곳 생성) ③ `CODEOWNERS + Boundary Enforcer`.
> 이 3개가 없으면 나머지 32개 에이전트는 그냥 프롬프트 모음일 뿐이다.
