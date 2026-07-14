# @tds/admin — TDS Admin Hub

`@tds/ui` 디자인 시스템을 소비하는 관리자 앱. React + Vite + TypeScript + react-router-dom(v6).

- 쓰기 소유: **A40**(react-engineer) / **A41**(react-refactorer) — 순차 배타
- 게이트: **G6**, 검수: **A42**(code-reviewer)

## 실행 방법

리포 루트에서 실행한다.

```bash
pnpm install
pnpm codegen      # 필수 선행 — tokens.json → @tds/ui/tokens.css(+ tokens.ts, 타입) 생성
pnpm dev:admin    # Vite dev 서버 기동
```

- `pnpm codegen`을 건너뛰면 `src/main.tsx`의 `import '@tds/ui/tokens.css'`가 실패한다.
  (`@tds/ui/tokens.css`는 `packages/ui` package.json exports의 공개 서브패스 — codegen 산출물)
- 기타: `pnpm --filter @tds/admin run build | test | lint`

## 페이지 ↔ Screen Spec(SCR) 매핑

Screen Spec은 A11(UI Planner) 산출물(`docs/plan/ui/SCR-NNN.md`)이다. 문서가 아직 없어도 아래 매핑 경로를 기준으로 유지한다.

| 라우트 | 페이지 파일 | Screen Spec | 상태 |
|---|---|---|---|
| `/login` | `src/pages/login/LoginPage.tsx` | `docs/plan/ui/SCR-001-login.md` | 플레이스홀더 |
| `/dashboard` (기본 리다이렉트 대상) | `src/pages/dashboard/DashboardPage.tsx` | `docs/plan/ui/SCR-002-dashboard.md` | 플레이스홀더 |
| `/products/new` | `src/pages/product-registration/ProductRegistrationPage.tsx` | `docs/plan/ui/SCR-003-product-registration.md` | 플레이스홀더 |

- 레이아웃 셸: `src/shared/layout/AppShell.tsx` (사이드바 내비 + 헤더 골격, 인증 후 화면을 `<Outlet />`으로 렌더링)
- 매핑되지 않은 경로(`*`)와 루트(`/`)는 `/dashboard`로 리다이렉트한다 (`src/App.tsx`).
- **구현 조건**: 각 페이지의 실제 구현은 **G3 계약 승인 + 해당 @tds/ui 모듈 G5 통과 후** A40이 진행한다. 그 전까지 플레이스홀더를 유지한다.

## 하드 바운더리 (G6 체크리스트 — eslint가 기계 강제)

- `@tds/ui`는 public entry로만 import — 내부 경로(`@tds/ui/src/...`) 직접 import 금지.
  유일한 예외: 공개 서브패스 `@tds/ui/tokens.css`.
- 하드코딩 색상 hex / px 리터럴 금지 — 토큰 CSS 변수(`var(--tds-*)`) 참조만 허용.
- `packages/ui/**`, `contracts/**`, `tokens/**` 수정 금지 — 변경 필요 시 소유자에게 change_request 발행.

## A40 · A41 순차 배타(sequential-exclusive) 규칙

`apps/admin/src`의 쓰기 소유자는 A40(기능 구현)과 A41(리팩터) 둘이며, **절대 동시에 작업할 수 없다**.

1. 순서: A40 기능 구현 → G6 검수(A42) → 필요 시 A41 리팩터 → G6 재검수.
2. A41은 동작 변경 금지 — 리팩터만. 신규 기능 필요 발견 시 작업을 멈추고 A40에 반환.
3. 한쪽이 작업 중이면 다른 쪽은 handoff envelope로 완료 통보를 받은 뒤에만 착수.

상세 운영 규칙: [`src/README.md`](./src/README.md) 참조 (레지스트리: `orchestration/registry/agents.json`).
