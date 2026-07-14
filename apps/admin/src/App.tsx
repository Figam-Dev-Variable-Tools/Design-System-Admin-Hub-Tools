// TDS Admin Hub 라우트 구성 (A40 소유, 게이트 G6, 검수 A42)
//
// [import 규칙] 컴포넌트는 반드시 @tds/ui public entry에서만 import한다.
//   허용: import { Button } from '@tds/ui';                  ← G3 계약 승인 + G5 통과 후 활성화
//   금지: import { Button } from '@tds/ui/src/atoms/Button'; ← eslint no-restricted-imports가 차단 (G6 체크리스트)
//   예외: '@tds/ui/tokens.css'는 공개 서브패스 export — deep import가 아니다 (src/main.tsx에서 import).
//
// [하드코딩 스타일 금지] 색상 hex / px 값을 코드에 직접 쓰지 않는다.
//   토큰 파이프라인(tokens.json → generated CSS 변수 var(--tds-*)) 참조만 허용 — eslint no-restricted-syntax가 차단.
//
// [라우트 ↔ Screen Spec 매핑] (SCR 문서는 A11 UI Planner 산출물 — 작성 중이면 경로 참조만 유지)
//   /login         → docs/plan/ui/SCR-001-login.md
//   /dashboard     → docs/plan/ui/SCR-002-dashboard.md (기본 리다이렉트 대상)
//   /products/new  → docs/plan/ui/SCR-003-product-registration.md
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './shared/layout/AppShell';
import { collectNavRoutes } from './shared/layout/nav-config';
import { queryClient } from './shared/query/queryClient';
import { ToastProvider } from './shared/ui';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductRegistrationPage from './pages/product-registration/ProductRegistrationPage';
import PlaceholderPage from './pages/placeholder/PlaceholderPage';
import PermissionsPage from './pages/permissions/PermissionsPage';
import MembersPage from './pages/members/MembersPage';
import MemberDetailPage from './pages/members/MemberDetailPage';
import AdminsPage from './pages/admins/AdminsPage';
import CustomerSettingsPage from './pages/customer-settings/CustomerSettingsPage';
import LoginHistoryPage from './pages/login-history/LoginHistoryPage';
import { fetchAdminDetail } from './pages/admins/data-source';

/**
 * 실제 화면이 있는 경로 — 나머지 사이드바 항목(nav-config.ts)은 준비 중 화면으로 간다.
 * 화면을 하나 완성할 때마다 여기에 경로를 추가하고 아래 <Route>를 명시한다.
 */
const IMPLEMENTED = new Set([
  '/dashboard',
  '/products/new',
  '/users/roles',
  '/users/members',
  '/users/settings',
  '/users/admins',
  '/users/login-history',
]);

export default function App() {
  // 사이드바에 있는데 아직 화면이 없는 경로 — 죽은 링크 방지
  const pendingRoutes = collectNavRoutes().filter((leaf) => !IMPLEMENTED.has(leaf.to));

  return (
    // 서버 상태(조회·캐시·무효화)는 앱 전체가 하나의 QueryClient 를 쓴다 — 기본값은 shared/query 참조.
    // 토스트보다 바깥에 둔다: 쓰기 뮤테이션이 성공하면 캐시를 무효화하고 그 결과를 토스트가 나른다.
    <QueryClientProvider client={queryClient}>
      {/* 결과 통지(성공/실패/취소 토스트)는 앱 전체가 하나의 큐를 쓴다 — 화면마다 배너 상태를 두지 않는다.
          라우트 밖에 있어야 화면을 이동해도 토스트가 살아남는다 (예: 회원 삭제 후 목록으로 돌아갈 때). */}
      <ToastProvider>
        <Routes>
          {/* 로그인 — 셸(사이드바) 밖의 단독 화면 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 인증 후 화면 — AppShell(사이드바) 레이아웃 라우트 */}
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products/new" element={<ProductRegistrationPage />} />
            <Route path="/users/roles" element={<PermissionsPage />} />
            <Route path="/users/members" element={<MembersPage />} />
            {/* 상세는 사이드바(nav-config)에 없는 경로 — IMPLEMENTED 와 무관하게 라우트만 둔다 */}
            <Route path="/users/members/:id" element={<MemberDetailPage />} />
            <Route path="/users/settings" element={<CustomerSettingsPage />} />

            {/* 관리자(운영진) 관리 — 상세는 회원 상세 화면을 재사용한다.
              달라지는 것은 목록 복귀 경로와 상세 조회 함수뿐이라 props 로만 주입한다. */}
            <Route path="/users/admins" element={<AdminsPage />} />
            <Route
              path="/users/admins/:id"
              element={<MemberDetailPage listPath="/users/admins" fetchDetail={fetchAdminDetail} />}
            />

            {/* 로그인 이력 — **읽기 전용 감사 로그**. 상세 라우트가 없다:
              이력 한 건에는 펼쳐 볼 것이 없고, 행을 누르면 그 계정(회원/운영자) 상세로 간다.
              쓰기 라우트도 없다 — 감사 기록은 이 앱이 바꾸지 않는다. */}
            <Route path="/users/login-history" element={<LoginHistoryPage />} />

            {/* 사이드바 정의는 있으나 미구현 — 화면을 만들 때마다 위로 옮긴다 */}
            {pendingRoutes.map((leaf) => (
              <Route key={leaf.to} path={leaf.to} element={<PlaceholderPage />} />
            ))}
          </Route>

          {/* 정의되지 않은 경로 — 대시보드로 기본 리다이렉트 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </QueryClientProvider>
  );
}
