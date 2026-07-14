# Design-System-Admin-Hub-Tools

> React + Design System + Storybook + Figma **100% 동기화** 플랫폼
> Enterprise Front-End AI Organization v2 — 50 AI 에이전트 · G0~G9 품질 게이트 · Contract SSOT

설계 원본: [docs/architecture/org-design-v2.md](docs/architecture/org-design-v2.md) · 결정 기록: [docs/adr/](docs/adr/)

## 운영 3대 원칙

| 원칙 | 내용 | 강제 수단 |
|---|---|---|
| **P1. 단일 소유권** | 하나의 경로는 정확히 하나의 에이전트만 쓴다 | CODEOWNERS (레지스트리에서 자동 생성) + CI 차단 |
| **P2. 계약 우선** | 전달은 기계 검증 가능한 계약 파일로만 | `contracts/schemas/` + `orchestration/schemas/` |
| **P3. 게이트 통과** | Reviewer 승인 없이 다음 단계 진행 불가, 자가 검수 금지 | `orchestration/registry/gates.json` + 상태 머신 |

### P4. 검사의 존재와 검사의 작동은 다르다

이 리포에서 가장 비싸게 배운 원칙이다. **게이트는 후자만을 증거로 받는다.**

실제로 이 조직에서 발견된 **공허 통과(vacuous pass)** 4건 — 전부 초록불을 켜고 있었고, 전부 아무것도 보증하지 않았다:

| 무엇이 | 어떻게 거짓말했나 | 처리 |
|---|---|---|
| `pnpm test` | `--passWithNoTests` → **테스트 0건에 초록불** | 제거 (A77이 차단) |
| Storybook play function **62건** | `expect` **0개** · 스파이 **0개** → **실패할 수 없는 검사** | 단언 주입 (A30) |
| `bundle-size` CI job | dist 없이 초록불 | job **제거** ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 기준 이미지 0건 → "비교 0건 중 실패 0건 → **PASS**" | `NOT_VERIFIED` (exit 2) |

**공집합 위에서 참인 명제는 아무것도 증명하지 않는다.** 측정 불가는 통과가 아니다 — 전제가 없으면 도구는 초록불 대신 `NOT_VERIFIED`를 낸다.

그리고 **방어선은 사람의 검수가 아니라 구조가 지킨다.** 하드코딩 색상 0건 · 4자 일치 15/15는 디자이너가 지킨 것이 아니라 `tokens.json` 단일 원천 + codegen + 린트 커스텀 룰이 지켰다.

## 단일 진실 공급원 (SSOT)

```
orchestration/registry/agents.json ──> CODEOWNERS · skills/ · 오케스트레이션  (조직의 SSOT)
contracts/*.contract.json ──────────> React 타입 · Storybook argTypes · Figma Properties · Docs  (컴포넌트의 SSOT)
tokens/tokens.json (DTCG) ──────────> CSS Variables · Storybook Theme · Figma Variables  (디자인 값의 SSOT)
specs/**/FS-*.md ───────────────────> E2E 테스트 시나리오 · 예외 7축 커버리지 격자  (동작의 SSOT)
```

**이 네 곳에서 파생되는 파일은 손으로 쓰지 않는다.** `pnpm codegen`이 생성하고, `pnpm contract-test`가 4자 일치(Contract ↔ React ↔ Storybook ↔ Figma)를 검증하며, 불일치 1건이면 G5/G6/G7이 동시에 차단된다.

## 백엔드는 만들지 않는다 (절대 조건)

**서버 코드 · DB 스키마 · 실제 HTTP 호출은 이 리포에 존재하지 않는다.** 백엔드는 별도 개발자가 작업한다.

- `pages/*/data-source.ts` — fixture를 반환하는 **프론트 어댑터**. 연동 지점은 `// TODO(backend): GET /api/...` 주석으로만 표시한다
- `specs/**/BE-*.md` · `openapi/openapi.yaml` — **문서와 스키마**이지 구현이 아니다
- `openapi-typescript`가 생성한 타입은 어댑터 경계에서 **양방향 컴파일 검증**에 쓰인다 — 스키마가 프론트와 어긋나면 백엔드 개발자가 만질 바로 그 파일에서 컴파일 에러가 난다

## 리포지토리 구조

```
├── orchestration/          A00  조직 SSOT — 에이전트/게이트 레지스트리, 핸드오프 스키마, 태스크
├── contracts/              A18  컴포넌트 계약(SSOT) + 스키마 · review/(A19)
├── tokens/                 A20  tokens.json (W3C DTCG, 3계층) · review/(A21)
├── packages/ui/            A30~A33  Storybook 컴포넌트 15종 · foundations/ · generated/(수정 금지)
├── apps/admin/             A40~A41  React Admin 앱 (Mid / Senior 순차 배타)
├── specs/                  A62~A64  기능명세 FS-* (요소별 넘버링 + 예외 7축) · BE-* (예외 9축)
├── openapi/                A80  OpenAPI 3.1 스키마 (문서 — 서버 아님)
├── e2e/                    A85  E2E 시나리오 (테스트명이 FS 요소 번호를 인용)
├── tools/
│   ├── codegen/                 계약/토큰 → 4곳 생성 파이프라인
│   ├── boundary/           A02  CODEOWNERS 생성 + 소유권/reads 스코프 검사
│   ├── contract-test/      A74  4자 일치 검증
│   ├── test-coverage/      A77  계약 states · blockedWhen · FS 예외축 커버리지 (라인 % 아님)
│   ├── code-quality/       A83  클린코드 6축 (결합·누수·중복·복잡도·죽은코드·레이어)
│   ├── vrt/                A70  Visual Regression
│   ├── drift/              A71  Design Drift 감시
│   ├── a11y/               A72  접근성 감사
│   ├── perf/               A73  성능 예산 감사
│   ├── reuse-guard/        A75  중복 컴포넌트 차단
│   ├── naming-guard/       A76  네이밍 규칙 강제
│   └── figma-plugin/       A50  Contract/Token → Figma 자동 생성
├── docs/
│   ├── adr/                A01  아키텍처 결정 기록 (0001~0010)
│   ├── architecture/       A01  프론트엔드 컨벤션 (A40/A41/A30 필독) · 조직 감사
│   ├── plan/ design/            A10~A17
│   ├── figma/              A51~A56  Figma 스펙 미러 + 검수
│   ├── tds/                A60~A61  디자인 시스템 문서
│   ├── security/           A86  보안 검토 (G6·G9 차단)
│   └── _templates/              표준 문서 + 게이트 체크리스트
├── reports/                Layer 3 검증 산출물 (게이트 입력 — 기계 생성, 포매터 제외)
└── skills/                 50 에이전트 SKILL.md (+ _templates/)
```

## 워크플로우 (게이트 G0~G9)

```
G0 접수(A00·Reuse판정) → G1 기획(A12) → G2 디자인(A17) → G3 계약확정★(A19, Frozen)
   → [병렬] G4 토큰(A21) · G5 Storybook(A33) · G6 React(A42) · G7 Figma(A56)
   → 4자 일치 최종검증(A74) → G8 릴리스(A03) → G9 명세확정(A64)
   → Drift 상시감시(A71)

차단권만 갖는 검증자 (승인권 없음 — 게이트당 승인자는 1명이어야 상태머신이 깨지지 않는다):
   A77 커버리지(G5·G6) · A83 클린코드(PR) · A86 보안(G6·G9)
```

### 페이지-모듈 파이프라인

**페이지가 먼저, 모듈이 나중이다.** 오너가 화면을 확정하면 거기서 공통 모듈을 역추출한다.

```
① Admin 페이지 구축(A40) → 오너 컨펌 → ② 모듈 후보 추출(A84·A75)
   → ③ Storybook/Figma 중복 검사 → 재활용 or 신규 등록(G0→G3→G5)
   → ④ Pages 조합(A32, 조립 전용) → ⑤ Figma 동기화(A50)
   → ⑥ 검증(A70 VRT ≤0.1% · A74 4자 일치)
```

정식 규정: [docs/tds/guidelines/page-module-pipeline.md](docs/tds/guidelines/page-module-pipeline.md)

## 빠른 시작

```bash
pnpm install
pnpm codegen              # 계약/토큰 → 타입·argTypes·figma.json·CSS 생성
pnpm gate:precheck        # 계약 + 소유권 + 네이밍 + 4자 일치 (리뷰 요청 전 필수)
pnpm dev:admin            # Admin 앱
pnpm sb                   # Storybook
```

### 게이트 검사

```bash
pnpm validate:registry    # A02  에이전트 50 · 게이트 11 · SKILL 정합성
pnpm boundary:check       # A02  소유권 경계 (CODEOWNERS와 동일 규칙)
pnpm contract-test        # A74  4자 일치
pnpm coverage:check       # A77  계약 states · blockedWhen · FS 예외축
pnpm quality:check        # A83  클린코드 6축 (blocker 1건 → PR 차단)
pnpm lint && pnpm format:check
pnpm test                 # 단언 있는 테스트만 테스트로 센다
```

## 에이전트 카탈로그

50개 전체 목록·소유 경로·게이트·차단 조건은 [orchestration/registry/agents.json](orchestration/registry/agents.json), 스킬 정의는 [skills/](skills/) 참조.

프론트엔드 작업자(A40·A41·A30)는 [docs/architecture/frontend-conventions.md](docs/architecture/frontend-conventions.md)를 **먼저 읽는다** — React style 단축/롱핸드 혼용 금지, 미디어쿼리 `var()` 불가, 토스트 vs 인라인 판정 기준 등 실제로 버그를 냈던 규칙들이 들어 있다.
