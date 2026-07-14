---
id: CONTEXT-DIGEST
title: "컨텍스트 다이제스트 — 자주 정독되는 파일의 요약본"
status: generated
date: 2026-07-15
owner: A01 (Architecture AI)
generatedFrom:
  - orchestration/registry/agents.json
  - orchestration/registry/gates.json
  - contracts/*.contract.json
  - tokens/tokens.json
adr: ADR-0010 (T1)
---

# 컨텍스트 다이제스트

> **이 문서는 원본을 대체하지 않는다.**
> 여기 있는 것은 **무엇이 존재하는가**(이름 · 경로 · 키)이지 **값이 무엇인가**가 아니다.
> **정확한 값 · 타입 · 제약 · 근거가 필요하면 반드시 원본을 읽어라.** 원본 경로는 각 절에 명시했다.
> 이 문서만 읽고 판정(계약 검수 · 토큰 값 대조 · 게이트 승인)을 내리는 것은 **금지**다.

**존재 이유** — 감사 실측(`docs/architecture/org-audit-2026-07-15.md` §3.1): `reads: ["**/*"]` 보유 7명(887파일 / 14MB), `contracts/**` 읽기 권한 33/47명, `tokens/tokens.json` 21/47명.
같은 원본을 여러 에이전트가 처음부터 반복 정독한다. **"무엇이 있는지"만 알면 되는 질문에 원본 24.7KB를 여는 것이 낭비의 근원이다.**

**읽는 순서**: 이 다이제스트 → (판정이 필요하면) 원본.

---

## 1. 리포 구조

| 경로 | 내용 | 주 소유자 |
|---|---|---|
| `apps/admin/src/**` | 관리자 앱 (React + Vite + TS). 화면 7종 | A40 / A41 (순차 배타) |
| `apps/*/e2e/**`, `e2e/**` | E2E · 통합 테스트 | A85 |
| `packages/ui/src/**` | 컴포넌트 15종 + Story 25 | A30 |
| `packages/ui/generated/**` | 계약에서 codegen된 타입 — **손으로 쓰지 않는다** | (파생물) |
| `contracts/*.contract.json` | 컴포넌트 계약 15종 — **G3 Frozen Point** | A18 |
| `tokens/tokens.json` | 토큰 145개 (W3C DTCG) — **Source of Truth** | A20 |
| `specs/<라우트>/FS-*.md` · `BE-*.md` | 기능/백엔드 명세 8건 | A62 / A63 |
| `docs/adr/**` | ADR 0001~0010 | A01 |
| `docs/tds/**` | TDS 문서 (API 문서는 계약에서 자동 생성) | A60 |
| `orchestration/registry/{agents,gates}.json` | **조직의 SSOT** — CODEOWNERS·skills가 여기서 파생 | A01 |
| `skills/<slug>/SKILL.md` | 에이전트 50명의 지시서. frontmatter는 레지스트리의 파생물 | (각 에이전트) |
| `tools/**` · `reports/**` | 검증 도구와 그 산출물 | 각 verifier |
| `docs/security/**` · `reports/security/**` | 보안 정책·검수 | A86 |

---

## 2. 게이트 요약 (11)

원본: `orchestration/registry/gates.json` — **entry/exit 조건 · SLA · 체크리스트 · stateMachine · SLO는 원본에만 있다.**

| 게이트 | 제목 | approver | producers | verifiers (차단자) |
|---|---|---|---|---|
| G0 | 요청 접수 · Task Graph | A00 | A00 | A75 |
| G1 | 기획 확정 | A12 | A10 · A11 | — |
| G2 | 디자인 확정 | A17 | A13 · A14 · A15 · A16 | — |
| **G3** | **계약 확정 ★ (Frozen Point)** | A19 | A18 | A76 |
| G4 | Token 확정 | A21 | A20 | A76 |
| G5 | Storybook 구현 | A33 | A30 · A31 · A32 | A72 · A74 · A76 · **A77** |
| G6 | React 구현 | A42 | A40 · A41 · **A85** | A72 · A73 · A74 · A76 · **A77** · **A86** |
| G7 | Figma 동기화 | A56 | A50 · A51~A55 | A70 · A74 · A76 |
| — | contract-test-final (합류 배리어, 게이트 아님) | A74 | — | A74 |
| G8 | 릴리스 | A03 | A60 · A03 | A61 |
| G9 | 명세 확정 (FS + BE) | A64 | A62 · A63 | **A86** |

**G3가 가장 중요하다.** 승인 즉시 계약이 Frozen되고 codegen이 G4~G7 4개 라인을 병렬로 연다. G3 통과 전 Layer 2 착수 금지.
**A77 · A86은 approver가 아니라 blocker다** — 승인은 A33/A42/A64가 하고, 그 승인 **전에** A77(테스트 미검증) · A86(보안 결함)이 차단할 수 있다 (ADR-0010).

---

## 3. 계약 15종 요약

원본: `contracts/<Name>.contract.json` — **타입 · enum values · default · required · slots · events.blockedWhen · a11y · tokens 블록은 원본에만 있다.**
아래는 **이름 · level · version · props 키**뿐이다. 계약 검수(A19) · codegen · 4자 일치(A74) 판정에는 **반드시 원본을 읽어라.**

| 컴포넌트 | level | ver | props 키 |
|---|---|---|---|
| Alert | atom | 1.0.0 | tone, children, id |
| Badge | atom | 1.0.0 | count, tone, hideWhenZero |
| Button | atom | 1.0.0 | variant, size, loading, disabled, iconLeft, children |
| Card | atom | 1.0.0 | children, padding, busy |
| Checkbox | atom | 1.0.0 | id, label, checked, disabled |
| TextField | atom | 1.0.0 | id, label, value, type, error, disabled, required, placeholder, trailing |
| DataTable | molecule | 1.0.0 | columns, rows, rowKey, summaryRows, caption, dimZero, empty |
| LineAreaChart | molecule | 1.0.0 | series, labels, showLegend, ariaLabel |
| ListRow | molecule | 1.0.0 | title, meta, icon, href |
| PasswordField | molecule | 1.0.0 | id, label, value, error, disabled, required, revealed |
| SegmentedControl | molecule | 1.0.0 | value, options, size, disabled, ariaLabel |
| Tabs | molecule | 1.0.0 | value, items, ariaLabel |
| ListCard | organism | 1.0.0 | title, count, rows, loading, empty, icon |
| StatsCard | organism | 1.0.0 | title, action, children, loading, error |
| TodoCard | organism | 1.0.0 | title, items, loading, showTotal |

**boolean prop 명명**: `busy` · `revealed` · `showLegend` · `showTotal` · `hideWhenZero` · `dimZero` 는 ADR-0005가 허용한 형태다 (`is/has/can` 강제가 아니다).

---

## 4. 토큰 목록 (145) — 경로만, 값 제외

원본: `tokens/tokens.json` (877행 / 24.7KB) — **값 · `$type` · 다크모드(`$extensions["tds.modes"].dark`) · 참조 체인은 원본에만 있다.**
값이 필요하면 원본을, 값의 **사용**이 필요하면 `packages/ui/generated/`(codegen 산출물)를 읽어라.

**3계층 규칙 (절대 방어선)**: `primitive` → `semantic` → `component`.
**컴포넌트가 primitive를 직접 참조하는 것은 금지**다. 계층을 건너뛰면 semantic 토큰이 죽는다 — Button 계약이 `component.button.*` 13개를 죽였던 것이 그 사례다 (미사용 토큰 42.4% → 27.1%).

### primitive (73)
- `primitive.color.blue.{200,300,400,500,600,700,800}` · `.gray.{0,100,200,300,400,500,600,700,800,900}` · `.red.{100..800}` · `.green.{100..800}` · `.amber.{100..800}` (41)
- `primitive.space.{1,2,3,4,5,6}` (6) · `primitive.radius.{sm,md,lg,full}` (4) · `primitive.border-width.{1,2,4}` (3) · `primitive.breakpoint.{640,768,1024}` (3)
- `primitive.typography.font-family.sans` · `.font-size.{12,14,16,18}` · `.font-weight.{regular,medium,bold}` · `.line-height.{tight,normal}` (10)
- `primitive.motion.duration.{fast,normal,slow}` · `.easing.{standard,decelerate,accelerate}` (6)

### semantic (59)
- `color.action.primary.{default,hover,active,disabled}` (4)
- `color.text.{on-primary,default,muted,disabled}` (4) — **`default`·`muted`·`disabled` 중 일부가 미사용(드리프트 경고)**
- `color.surface.{default,raised,skeleton,disabled}` (4) · `color.border.{default,focus}` (2)
- `color.feedback.{danger,success,warning,info}.{surface,border,text}` (12)
- `color.chart.{series-1,series-1-fill,series-2,series-2-fill,axis,label}` (6)
- `space.{1..6}` (6) · `radius.{sm,md,lg,full}` (4) · `border-width.{thin,medium,thick}` (3) · `breakpoint.{sm,md,lg}` (3)
- `typography.body.md` · `typography.label.{md,sm}` · `typography.title.{md,lg}` · `typography.caption.md` (6)
- `motion.duration.{fast,normal,slow}` · `motion.easing.{standard,decelerate}` (5)

### component (13)
- `component.button.{background,background-hover,background-active,background-disabled,text,focus-ring,radius,padding-x,padding-y,gap,typography,transition-duration,transition-easing}` (13)

> **현재 미사용 토큰 23/85건 (27.1%)** — SLO 상한 5%의 5배 (`reports/drift/2026-07-14.md`). 새 컴포넌트는 semantic을 **써야** 하고, 없으면 만들 것이 아니라 **왜 없는지**를 A20에 물어야 한다.

---

## 5. 방어선 규칙 (Hard Rules)

이 규칙들은 취향이 아니라 **도구가 강제**한다. 어기면 커밋/PR/게이트가 막힌다.

| # | 규칙 | 강제 주체 | 어기면 |
|---|---|---|---|
| 1 | **소유 경로(`owns`) 밖 수정 금지** — 경로당 소유자는 1명 (예외: A40↔A41 순차 배타 쌍) | A02 (`pnpm boundary:check`) | **PR 차단** |
| 2 | **하드코딩 색상/px 금지** — 100% 토큰 참조 | A81 (lint 커스텀 룰) · A71 (drift) | **commit/PR 차단** |
| 3 | **토큰 3계층 준수** — component가 primitive 직접 참조 금지 | A21 (G4) · A71 | G4 반려 |
| 4 | **계약이 정본** — 계약에 없는 prop 금지, 계약 생성 타입 사용(수동 타입 선언 0건) | A74 (`pnpm contract-test`, 4자 일치) | **G5·G6·G7 동시 차단** |
| 5 | **G3 통과 전 Layer 2 착수 금지** — 계약은 Frozen, 변경은 G3 재진입 + SemVer 판정 | A19 | G3 반려 |
| 6 | **네이밍 규칙** — Folder/Component/Variant/Variable/Token/Icon/Story/Page | A76 (`pnpm naming:check`, pre-commit) | **commit 차단** |
| 7 | **페이지가 페이지를 import 금지** · 공통 모듈에 도메인 누수 금지 | A83 (`pnpm quality:check`) | **PR 차단** |
| 8 | **테스트 없이 통과 금지** — `--passWithNoTests`의 초록불은 증거가 아니다. 계약 states/events + FS 예외 7축이 덮여야 한다 | **A77** | **G5·G6 차단** |
| 9 | **보안 10축** — 인증/인가 · 열거 오라클 · 레이트리밋 · 멱등성 · CSRF · 세션 무효화 · 감사 로그 · 403↔404 은닉 · **프론트 권한은 보안 경계가 아니다** · 비밀 노출 | **A86** | **G6·G9 차단** |
| 10 | **자가 승인 금지 (P3)** · **산문 핸드오프 금지 (P2 — handoff.v1.json envelope만)** | A02 (validate:registry) · 게이트 | 반려 |
| 11 | **전역 읽기(`reads: **/*`)는 A00·A01·A02·A86만** — 확대는 ADR 필요 | A02 (validate:registry, 경고) | 경고 + A01 |
| 12 | **에이전트 보고는 150행 이내** — 판정 + 지적 목록 + evidence 경로. 근거 서술은 링크로 | (규약, ADR-0010 T4) | — |

---

## 6. 에이전트 50명 — 어디를 보면 되는가

**전수 목록은 `orchestration/registry/agents.json`이 유일한 정본이다.** 여기 옮겨 적으면 반드시 드리프트한다 (ADR-0001 결정 2: *"소유권 매트릭스를 두 곳에 수기 유지하면 반드시 드리프트한다"*).

- 파일 → 소유자를 알고 싶다: `.github/CODEOWNERS` (레지스트리에서 자동 생성) 또는 `pnpm boundary:check <path>`
- 에이전트의 권한·차단권을 알고 싶다: `agents.json`의 해당 항목 (`owns` · `reads` · `blocks` · `blockCondition`)
- 에이전트의 행동 규범을 알고 싶다: `skills/<slug>/SKILL.md`

| division | 인원 | 구성 |
|---|---|---|
| governance (L0) | 8 | A00 A01 A02 A03 A80 A81 A82 **A86** |
| planning (L1) | 3 | A10 A11 A12 |
| design (L1) | 5 | A13 A14 A15 A16 A17 |
| contract (L1) | 2 | A18 A19 |
| token (L2) | 2 | A20 A21 |
| storybook (L2) | 5 | A30 A31 A32 A33 A84 |
| react (L2) | 4 | A40 A41 A42 **A85** |
| figma (L2) | 7 | A50 A51 A52 A53 A54 A55 A56 |
| docs (L2) | 5 | A60 A61 A62 A63 A64 |
| verification (L3) | 9 | A70 A71 A72 A73 A74 A75 A76 A83 **A77** |

---

## 7. 생성 방법 — 이 문서는 손으로 쓰지 않는다

**드리프트는 구조로 막는다.** 요약본과 원본이 다른 손에서 갈라지면 즉시 어긋난다 (ADR-0001 결정 2).
따라서 §2 · §3 · §4 · §6은 **원본에서 기계 생성**하며, 손으로 수정하지 않는다.

| 절 | 원천 | 추출 규칙 |
|---|---|---|
| §2 게이트 | `orchestration/registry/gates.json` | `gates[].{id,title,approver,producers,verifiers}` + `agents[].blocks`에서 역방향 차단자 유도. **entry/exit/SLA/checklist는 제외**(원본 참조 유도) |
| §3 계약 | `contracts/*.contract.json` | `{name, level, version, Object.keys(props)}`. **타입·default·enum values·a11y·tokens 블록은 제외** |
| §4 토큰 | `tokens/tokens.json` | leaf 경로 전수 나열 후 계층별 그룹핑. **`$value`·`$type`·다크모드 확장은 제외** |
| §6 부서 | `orchestration/registry/agents.json` | `division`별 `id` 집계. **owns/reads는 제외 — CODEOWNERS가 정본** |

**§1 · §5 · §7은 사람이 쓰는 부분**이며(구조 설명 · 규칙 요약), 규칙이 바뀌면 ADR과 함께 갱신한다.

**구현**: `tools/boundary/`의 `generate-codeowners.ts`와 **같은 패턴**(레지스트리 → 파생물)으로 `pnpm digest:generate`를 둔다.
CI(A82)가 **재생성 결과와 커밋된 파일의 diff가 0인지 검사**한다 — CODEOWNERS와 동일한 방식이다. diff가 있으면 PR 차단.
**도구 구현 전까지는 이 문서를 갱신하는 자가 위 추출 규칙을 그대로 따른다** (ADR-0010 후속 작업).

**갱신 트리거**: 계약 추가/변경 · 토큰 추가/삭제 · 게이트 변경 · 레지스트리 변경. 넷 중 하나라도 일어나면 이 문서는 **stale**이며, stale한 다이제스트는 **없느니만 못하다.**
