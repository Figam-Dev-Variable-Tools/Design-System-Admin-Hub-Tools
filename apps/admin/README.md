# @tds/admin — TDS Admin Hub

`@tds/ui` 디자인 시스템을 소비하는 관리자 앱. React + Vite + TypeScript + react-router-dom(v6).

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

Screen Spec은 `docs/plan/ui/SCR-NNN.md` 에 둔다. 문서가 아직 없어도 아래 매핑 경로를 기준으로 유지한다.

| 라우트 | 페이지 파일 | Screen Spec | 상태 |
|---|---|---|---|
| `/login` | `src/pages/login/LoginPage.tsx` | `docs/plan/ui/SCR-001-login.md` | 플레이스홀더 |
| `/dashboard` (기본 리다이렉트 대상) | `src/pages/dashboard/DashboardPage.tsx` | `docs/plan/ui/SCR-002-dashboard.md` | 플레이스홀더 |
| `/products/new` | `src/pages/product-registration/ProductRegistrationPage.tsx` | `docs/plan/ui/SCR-003-product-registration.md` | 플레이스홀더 |

- 레이아웃 셸: `src/shared/layout/AppShell.tsx` (사이드바 내비 + 헤더 골격, 인증 후 화면을 `<Outlet />`으로 렌더링)
- 매핑되지 않은 경로(`*`)와 루트(`/`)는 `/dashboard`로 리다이렉트한다 (`src/App.tsx`).
- **구현 조건**: 각 페이지의 실제 구현은 **해당 계약 승인 + 해당 @tds/ui 모듈 통과 후** 진행한다. 그 전까지 플레이스홀더를 유지한다.

## 하드 바운더리 (G6 체크리스트 — eslint가 기계 강제)

- `@tds/ui`는 public entry로만 import — 내부 경로(`@tds/ui/src/...`) 직접 import 금지.
  유일한 예외: 공개 서브패스 `@tds/ui/tokens.css`.
- 하드코딩 색상 hex / px 리터럴 금지 — 토큰 CSS 변수(`var(--tds-*)`) 참조만 허용.
- `packages/ui/**`, `contracts/**`, `tokens/**` 수정 금지 — 이들은 디자인 시스템 소유 영역이므로 앱에서 직접 고치지 않는다.

## 코드 변경 규칙

`apps/admin/src`는 기능 구현과 리팩터를 분리해서 다룬다.

1. 기능 구현 → 코드 검수 → 필요 시 리팩터 → 재검수 순으로 진행한다.
2. **리팩터는 동작을 바꾸지 않는다 — 구조 개선만.** 리팩터 중 신규 기능이 필요해지면 멈추고 기능 구현 단계로 되돌린다.

상세 규칙: [`src/README.md`](./src/README.md) 참조.
