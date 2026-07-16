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
//   /products      → 상품 관리(목록·등록·수정·카테고리) — SCR-003 상품 등록을 이 체계로 통합했다
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './shared/auth/RequireAuth';
import { ErrorBoundary } from './shared/errors/ErrorBoundary';
import { RouteErrorScreen } from './shared/errors/ErrorScreens';
import AppShell from './shared/layout/AppShell';
import { collectNavRoutes } from './shared/layout/nav-config';
import { queryClient } from './shared/query/queryClient';
import { ToastProvider } from './shared/ui';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PlaceholderPage from './pages/placeholder/PlaceholderPage';
import PermissionsPage from './pages/permissions/PermissionsPage';
import MembersPage from './pages/members/MembersPage';
import MemberDetailPage from './pages/members/MemberDetailPage';
import AdminsPage from './pages/admins/AdminsPage';
import CustomerSettingsPage from './pages/customer-settings/CustomerSettingsPage';
import LoginHistoryPage from './pages/login-history/LoginHistoryPage';
import { fetchAdminDetail } from './pages/admins/data-source';
import NoticesPage from './pages/content/notices/NoticesPage';
import NoticeDetailPage from './pages/content/notices/NoticeDetailPage';
import NoticeFormPage from './pages/content/notices/NoticeFormPage';
import FaqPage from './pages/content/faq/FaqPage';
import FaqDetailPage from './pages/content/faq/FaqDetailPage';
import FaqFormPage from './pages/content/faq/FaqFormPage';
import PopupsPage from './pages/content/popups/PopupsPage';
import PopupFormPage from './pages/content/popups/PopupFormPage';
import BannersPage from './pages/content/banners/BannersPage';
import BannerFormPage from './pages/content/banners/BannerFormPage';
import TermsPage from './pages/content/terms/TermsPage';
import TermsDetailPage from './pages/content/terms/TermsDetailPage';
import TermsFormPage from './pages/content/terms/TermsFormPage';
import PrivacyPage from './pages/content/privacy/PrivacyPage';
import PrivacyDetailPage from './pages/content/privacy/PrivacyDetailPage';
import PrivacyFormPage from './pages/content/privacy/PrivacyFormPage';
import CompanyProfilePage from './pages/company/profile/CompanyProfilePage';
import CeoMessagePage from './pages/company/ceo-message/CeoMessagePage';
import DirectionsPage from './pages/company/directions/DirectionsPage';
import PartnersPage from './pages/company/partners/PartnersPage';
import ClientsPage from './pages/company/clients/ClientsPage';
import HistoryListPage from './pages/company/history/HistoryListPage';
import HistoryFormPage from './pages/company/history/HistoryFormPage';
import CertificatesListPage from './pages/company/certificates/CertificatesListPage';
import CertificatesFormPage from './pages/company/certificates/CertificatesFormPage';
import EsgListPage from './pages/company/esg/EsgListPage';
import EsgFormPage from './pages/company/esg/EsgFormPage';
import PortfolioListPage from './pages/portfolio/items/PortfolioListPage';
import PortfolioFormPage from './pages/portfolio/items/PortfolioFormPage';
import PortfolioCategoriesPage from './pages/portfolio/categories/PortfolioCategoriesPage';
import CaseStudyListPage from './pages/portfolio/case-studies/CaseStudyListPage';
import CaseStudyFormPage from './pages/portfolio/case-studies/CaseStudyFormPage';
import ProductListPage from './pages/products/items/ProductListPage';
import ProductFormPage from './pages/products/items/ProductFormPage';
import ProductCategoriesPage from './pages/products/categories/ProductCategoriesPage';
import CouponListPage from './pages/products/coupons/CouponListPage';
import CouponFormPage from './pages/products/coupons/CouponFormPage';
import ReviewListPage from './pages/products/reviews/ReviewListPage';
import ReviewDetailPage from './pages/products/reviews/ReviewDetailPage';
import ReturnsListPage from './pages/products/returns/ReturnsListPage';
import ReturnDetailPage from './pages/products/returns/ReturnDetailPage';
import ShippingPolicyPage from './pages/products/shipping/ShippingPolicyPage';
import PointsPolicyPage from './pages/products/points/PointsPolicyPage';
import AccountListPage from './pages/sales/accounts/AccountListPage';
import AccountFormPage from './pages/sales/accounts/AccountFormPage';
import ContractListPage from './pages/sales/contracts/ContractListPage';
import ContractFormPage from './pages/sales/contracts/ContractFormPage';
import QuoteListPage from './pages/sales/quotes/QuoteListPage';
import QuoteFormPage from './pages/sales/quotes/QuoteFormPage';
import InquiryListPage from './pages/sales/inquiries/InquiryListPage';
import InquiryDetailPage from './pages/sales/inquiries/InquiryDetailPage';
import ProjectListPage from './pages/sales/projects/ProjectListPage';
import ProjectFormPage from './pages/sales/projects/ProjectFormPage';
import ConsultationListPage from './pages/sales/consultations/ConsultationListPage';
import ConsultationDetailPage from './pages/sales/consultations/ConsultationDetailPage';
import TicketListPage from './pages/support/tickets/TicketListPage';
import TicketDetailPage from './pages/support/tickets/TicketDetailPage';
import CategoriesPage from './pages/support/categories/CategoriesPage';
import RepliesPage from './pages/support/replies/RepliesPage';
import ReplyFormPage from './pages/support/replies/ReplyFormPage';
import CustomerFaqPage from './pages/support/faq/CustomerFaqPage';
import DownloadListPage from './pages/support/downloads/DownloadListPage';
import DownloadFormPage from './pages/support/downloads/DownloadFormPage';
import EventListPage from './pages/marketing/events/EventListPage';
import EventFormPage from './pages/marketing/events/EventFormPage';
import PromotionListPage from './pages/marketing/promotions/PromotionListPage';
import PromotionFormPage from './pages/marketing/promotions/PromotionFormPage';
import NewsletterListPage from './pages/marketing/newsletters/NewsletterListPage';
import NewsletterFormPage from './pages/marketing/newsletters/NewsletterFormPage';
import SmsListPage from './pages/marketing/sms/SmsListPage';
import SmsFormPage from './pages/marketing/sms/SmsFormPage';
import EmailListPage from './pages/marketing/email/EmailListPage';
import EmailFormPage from './pages/marketing/email/EmailFormPage';
import TemplateListPage from './pages/marketing/templates/TemplateListPage';
import TemplateFormPage from './pages/marketing/templates/TemplateFormPage';
import AdminLogPage from './pages/logs/admin/AdminLogPage';
import MemberActivityPage from './pages/logs/member-activity/MemberActivityPage';
import ApiLogPage from './pages/logs/api/ApiLogPage';
import ErrorLogPage from './pages/logs/errors/ErrorLogPage';
import RuleListPage from './pages/notifications/send/RuleListPage';
import RuleFormPage from './pages/notifications/send/RuleFormPage';
import EmailTemplateListPage from './pages/notifications/email-templates/EmailTemplateListPage';
import EmailTemplateFormPage from './pages/notifications/email-templates/EmailTemplateFormPage';
import SmsTemplateListPage from './pages/notifications/sms-templates/SmsTemplateListPage';
import SmsTemplateFormPage from './pages/notifications/sms-templates/SmsTemplateFormPage';
import ReservationListPage from './pages/reservations/ReservationListPage';
import ReservationFormPage from './pages/reservations/ReservationFormPage';
import ApplicationListPage from './pages/reservations/applications/ApplicationListPage';
import ApplicationDetailPage from './pages/reservations/applications/ApplicationDetailPage';
import ConsultationBookingListPage from './pages/reservations/consultations/ConsultationBookingListPage';
import ConsultationBookingFormPage from './pages/reservations/consultations/ConsultationBookingFormPage';
import ScheduleCalendarPage from './pages/reservations/schedule/ScheduleCalendarPage';
import VisitorStatsPage from './pages/stats/visitors/VisitorStatsPage';
import MemberStatsPage from './pages/stats/members/MemberStatsPage';
import RevenueStatsPage from './pages/stats/revenue/RevenueStatsPage';
import OrderStatsPage from './pages/stats/orders/OrderStatsPage';
import TrafficStatsPage from './pages/stats/traffic/TrafficStatsPage';
import KeywordStatsPage from './pages/stats/keywords/KeywordStatsPage';

/**
 * AppShell(사이드바) 안에서 인증 후 렌더하는 라우트 — 선언 배열의 **단일 원천**이다.
 * 선언 순서를 그대로 유지한다(React Router 는 정적 세그먼트를 :id 보다 먼저 매칭하지만, 읽는 사람을
 * 위해 '/new' 를 '/:id/edit' 앞에 둔다). 화면을 하나 완성하면 여기에 한 줄을 추가한다.
 *
 * implemented=true 는 **사이드바(nav-config) 리프이면서 실제 화면이 있는 경로**를 뜻한다 —
 * 이 플래그가 아래 IMPLEMENTED 집합(준비 중 화면 라우팅의 원천)을 만든다. 상세/폼(:id·/new)
 * 라우트는 사이드바에 없어 implemented 를 붙이지 않는다(라우트만 둔다).
 */
interface AppRoute {
  readonly path: string;
  readonly element: ReactNode;
  readonly implemented?: boolean;
}

const APP_ROUTES: readonly AppRoute[] = [
  { path: '/dashboard', element: <DashboardPage />, implemented: true },

  // 회원/운영진/설정/이력 — 상세는 사이드바에 없어 라우트만 둔다.
  { path: '/users/roles', element: <PermissionsPage />, implemented: true },
  { path: '/users/members', element: <MembersPage />, implemented: true },
  { path: '/users/members/:id', element: <MemberDetailPage /> },
  { path: '/users/settings', element: <CustomerSettingsPage />, implemented: true },
  { path: '/users/admins', element: <AdminsPage />, implemented: true },
  // 관리자 상세는 회원 상세 화면을 재사용한다 — 복귀 경로와 조회 함수만 props 로 주입한다.
  {
    path: '/users/admins/:id',
    element: <MemberDetailPage listPath="/users/admins" fetchDetail={fetchAdminDetail} />,
  },
  // 로그인 이력 — 읽기 전용 감사 로그(상세·쓰기 라우트 없음).
  { path: '/users/login-history', element: <LoginHistoryPage />, implemented: true },

  // 콘텐츠 — 공지/FAQ (목록·등록·상세·수정). 등록/수정은 하나의 폼이 :id 유무로 겸한다.
  { path: '/content/notices', element: <NoticesPage />, implemented: true },
  { path: '/content/notices/new', element: <NoticeFormPage /> },
  { path: '/content/notices/:id', element: <NoticeDetailPage /> },
  { path: '/content/notices/:id/edit', element: <NoticeFormPage /> },
  { path: '/content/faq', element: <FaqPage />, implemented: true },
  { path: '/content/faq/new', element: <FaqFormPage /> },
  { path: '/content/faq/:id', element: <FaqDetailPage /> },
  { path: '/content/faq/:id/edit', element: <FaqFormPage /> },

  // 콘텐츠 — 팝업/배너 (목록·등록·수정, 우측 실시간 미리보기).
  { path: '/content/popups', element: <PopupsPage />, implemented: true },
  { path: '/content/popups/new', element: <PopupFormPage /> },
  { path: '/content/popups/:id/edit', element: <PopupFormPage /> },
  { path: '/content/banners', element: <BannersPage />, implemented: true },
  { path: '/content/banners/new', element: <BannerFormPage /> },
  { path: '/content/banners/:id/edit', element: <BannerFormPage /> },

  // 콘텐츠 — 약관/개인정보 (목록·등록·상세·수정 + 버전 이력). '/new' 가 '/:id' 보다 먼저.
  { path: '/content/terms', element: <TermsPage />, implemented: true },
  { path: '/content/terms/new', element: <TermsFormPage /> },
  { path: '/content/terms/:id', element: <TermsDetailPage /> },
  { path: '/content/terms/:id/edit', element: <TermsFormPage /> },
  { path: '/content/privacy', element: <PrivacyPage />, implemented: true },
  { path: '/content/privacy/new', element: <PrivacyFormPage /> },
  { path: '/content/privacy/:id', element: <PrivacyDetailPage /> },
  { path: '/content/privacy/:id/edit', element: <PrivacyFormPage /> },

  // 기업 — 단일 문서형 3종 + 로고형 2종(파트너사·고객사).
  { path: '/company/profile', element: <CompanyProfilePage />, implemented: true },
  { path: '/company/ceo-message', element: <CeoMessagePage />, implemented: true },
  { path: '/company/directions', element: <DirectionsPage />, implemented: true },
  { path: '/company/partners', element: <PartnersPage />, implemented: true },
  { path: '/company/clients', element: <ClientsPage />, implemented: true },

  // 기업 — 연혁/인증서/ESG (목록·등록·수정). '/new' 가 '/:id/edit' 보다 먼저.
  { path: '/company/history', element: <HistoryListPage />, implemented: true },
  { path: '/company/history/new', element: <HistoryFormPage /> },
  { path: '/company/history/:id/edit', element: <HistoryFormPage /> },
  { path: '/company/certificates', element: <CertificatesListPage />, implemented: true },
  { path: '/company/certificates/new', element: <CertificatesFormPage /> },
  { path: '/company/certificates/:id/edit', element: <CertificatesFormPage /> },
  { path: '/company/esg', element: <EsgListPage />, implemented: true },
  { path: '/company/esg/new', element: <EsgFormPage /> },
  { path: '/company/esg/:id/edit', element: <EsgFormPage /> },

  // 포트폴리오 — 포트폴리오/카테고리/성공사례.
  { path: '/portfolio/items', element: <PortfolioListPage />, implemented: true },
  { path: '/portfolio/items/new', element: <PortfolioFormPage /> },
  { path: '/portfolio/items/:id/edit', element: <PortfolioFormPage /> },
  { path: '/portfolio/categories', element: <PortfolioCategoriesPage />, implemented: true },
  { path: '/portfolio/case-studies', element: <CaseStudyListPage />, implemented: true },
  { path: '/portfolio/case-studies/new', element: <CaseStudyFormPage /> },
  { path: '/portfolio/case-studies/:id/edit', element: <CaseStudyFormPage /> },

  // 상품 — 상품/카테고리/쿠폰/리뷰/교환·반품/배송·적립금.
  { path: '/products', element: <ProductListPage />, implemented: true },
  { path: '/products/new', element: <ProductFormPage /> },
  { path: '/products/:id/edit', element: <ProductFormPage /> },
  { path: '/products/categories', element: <ProductCategoriesPage />, implemented: true },
  { path: '/products/coupons', element: <CouponListPage />, implemented: true },
  { path: '/products/coupons/new', element: <CouponFormPage /> },
  { path: '/products/coupons/:id/edit', element: <CouponFormPage /> },
  { path: '/products/reviews', element: <ReviewListPage />, implemented: true },
  { path: '/products/reviews/:id', element: <ReviewDetailPage /> },
  { path: '/products/returns', element: <ReturnsListPage />, implemented: true },
  { path: '/products/returns/:id', element: <ReturnDetailPage /> },
  { path: '/products/shipping', element: <ShippingPolicyPage />, implemented: true },
  { path: '/products/points', element: <PointsPolicyPage />, implemented: true },

  // 영업 — 거래처/계약/견적/문의/프로젝트/상담이력.
  { path: '/sales/accounts', element: <AccountListPage />, implemented: true },
  { path: '/sales/accounts/new', element: <AccountFormPage /> },
  { path: '/sales/accounts/:id/edit', element: <AccountFormPage /> },
  { path: '/sales/contracts', element: <ContractListPage />, implemented: true },
  { path: '/sales/contracts/new', element: <ContractFormPage /> },
  { path: '/sales/contracts/:id/edit', element: <ContractFormPage /> },
  { path: '/sales/quotes', element: <QuoteListPage />, implemented: true },
  { path: '/sales/quotes/new', element: <QuoteFormPage /> },
  { path: '/sales/quotes/:id/edit', element: <QuoteFormPage /> },
  { path: '/sales/inquiries', element: <InquiryListPage />, implemented: true },
  { path: '/sales/inquiries/:id', element: <InquiryDetailPage /> },
  { path: '/sales/projects', element: <ProjectListPage />, implemented: true },
  { path: '/sales/projects/new', element: <ProjectFormPage /> },
  { path: '/sales/projects/:id/edit', element: <ProjectFormPage /> },
  { path: '/sales/consultations', element: <ConsultationListPage />, implemented: true },
  { path: '/sales/consultations/:id', element: <ConsultationDetailPage /> },

  // 고객센터 — 티켓/유형/답변템플릿/FAQ 큐레이션/자료실.
  { path: '/support/tickets', element: <TicketListPage />, implemented: true },
  { path: '/support/tickets/:id', element: <TicketDetailPage /> },
  { path: '/support/categories', element: <CategoriesPage />, implemented: true },
  { path: '/support/replies', element: <RepliesPage />, implemented: true },
  { path: '/support/replies/new', element: <ReplyFormPage /> },
  { path: '/support/replies/:id/edit', element: <ReplyFormPage /> },
  { path: '/support/faq', element: <CustomerFaqPage />, implemented: true },
  { path: '/support/downloads', element: <DownloadListPage />, implemented: true },
  { path: '/support/downloads/new', element: <DownloadFormPage /> },
  { path: '/support/downloads/:id/edit', element: <DownloadFormPage /> },

  // 마케팅 — 이벤트/프로모션/뉴스레터/SMS/이메일/템플릿.
  { path: '/marketing/events', element: <EventListPage />, implemented: true },
  { path: '/marketing/events/new', element: <EventFormPage /> },
  { path: '/marketing/events/:id/edit', element: <EventFormPage /> },
  { path: '/marketing/promotions', element: <PromotionListPage />, implemented: true },
  { path: '/marketing/promotions/new', element: <PromotionFormPage /> },
  { path: '/marketing/promotions/:id/edit', element: <PromotionFormPage /> },
  { path: '/marketing/newsletters', element: <NewsletterListPage />, implemented: true },
  { path: '/marketing/newsletters/new', element: <NewsletterFormPage /> },
  { path: '/marketing/newsletters/:id/edit', element: <NewsletterFormPage /> },
  { path: '/marketing/sms', element: <SmsListPage />, implemented: true },
  { path: '/marketing/sms/new', element: <SmsFormPage /> },
  { path: '/marketing/sms/:id/edit', element: <SmsFormPage /> },
  { path: '/marketing/email', element: <EmailListPage />, implemented: true },
  { path: '/marketing/email/new', element: <EmailFormPage /> },
  { path: '/marketing/email/:id/edit', element: <EmailFormPage /> },
  { path: '/marketing/templates', element: <TemplateListPage />, implemented: true },
  { path: '/marketing/templates/new', element: <TemplateFormPage /> },
  { path: '/marketing/templates/:id/edit', element: <TemplateFormPage /> },

  // 알림 관리 — 트랜잭션/시스템 알림(마케팅 캠페인과 역할이 다르다: 이벤트 트리거로 시스템이 자동 발송).
  // 발송 규칙/이메일 템플릿/SMS 템플릿. 등록/수정은 하나의 폼이 :id 유무로 겸한다.
  { path: '/notifications/send', element: <RuleListPage />, implemented: true },
  { path: '/notifications/send/new', element: <RuleFormPage /> },
  { path: '/notifications/send/:id/edit', element: <RuleFormPage /> },
  { path: '/notifications/email-templates', element: <EmailTemplateListPage />, implemented: true },
  { path: '/notifications/email-templates/new', element: <EmailTemplateFormPage /> },
  { path: '/notifications/email-templates/:id/edit', element: <EmailTemplateFormPage /> },
  { path: '/notifications/sms-templates', element: <SmsTemplateListPage />, implemented: true },
  { path: '/notifications/sms-templates/new', element: <SmsTemplateFormPage /> },
  { path: '/notifications/sms-templates/:id/edit', element: <SmsTemplateFormPage /> },

  // 예약/신청 — 예약/신청서/상담예약/일정. 정적 하위 경로 뒤에 '/reservations/:id/edit'(:id 최후).
  { path: '/reservations', element: <ReservationListPage />, implemented: true },
  { path: '/reservations/new', element: <ReservationFormPage /> },
  { path: '/reservations/applications', element: <ApplicationListPage />, implemented: true },
  { path: '/reservations/applications/:id', element: <ApplicationDetailPage /> },
  {
    path: '/reservations/consultations',
    element: <ConsultationBookingListPage />,
    implemented: true,
  },
  { path: '/reservations/consultations/new', element: <ConsultationBookingFormPage /> },
  { path: '/reservations/consultations/:id/edit', element: <ConsultationBookingFormPage /> },
  { path: '/reservations/schedule', element: <ScheduleCalendarPage />, implemented: true },
  { path: '/reservations/:id/edit', element: <ReservationFormPage /> },

  // 통계 — 6개 분석 화면. 조회 전용이라 상세/폼 라우트가 없다(:id 가 없는 유일한 섹션).
  // 조회 조건은 전부 쿼리스트링에 실린다(preset·start·end·compare·segment·view·metric·sort·page)
  // — 라우트가 아니라 URL 파라미터가 화면 상태의 원천이다 (IA-13).
  { path: '/stats/visitors', element: <VisitorStatsPage />, implemented: true },
  { path: '/stats/members', element: <MemberStatsPage />, implemented: true },
  { path: '/stats/revenue', element: <RevenueStatsPage />, implemented: true },
  { path: '/stats/orders', element: <OrderStatsPage />, implemented: true },
  { path: '/stats/traffic', element: <TrafficStatsPage />, implemented: true },
  { path: '/stats/keywords', element: <KeywordStatsPage />, implemented: true },

  // 로그 관리 — 읽기 전용 감사 로그 4종. 상세는 목록 위의 다이얼로그라 라우트가 없고,
  // 쓰기 라우트(등록/수정)는 **존재하지 않는다**: 감사 기록은 불변이다 (pages/logs/types.ts).
  { path: '/logs/admin', element: <AdminLogPage />, implemented: true },
  { path: '/logs/member-activity', element: <MemberActivityPage />, implemented: true },
  { path: '/logs/api', element: <ApiLogPage />, implemented: true },
  { path: '/logs/errors', element: <ErrorLogPage />, implemented: true },
];

/**
 * 사이드바에 있는데 아직 화면이 없는 경로 — 죽은 링크 방지의 원천.
 * APP_ROUTES 의 implemented 플래그에서 파생한다(중복 유지 로직 제거).
 */
const IMPLEMENTED = new Set(
  APP_ROUTES.filter((route) => route.implemented === true).map((route) => route.path),
);

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
        {/*
          [루트 경계 — EXC-01] AppShell 안쪽 경계(<Outlet> 바깥)가 화면 예외를 잡고 셸을 살린다.
          이 바깥 경계는 **셸 자체가 던지는 경우**(nav-config 파손 · AppHeader 예외)를 위한 최후
          보루다. 여기까지 오면 사이드바는 못 살리지만 흰 화면 대신 복구 UI 가 남는다.
          resetKey 를 주지 않는다 — 셸이 죽은 상태에선 라우트 이동으로 복구된다고 가정할 수 없다.
        */}
        <ErrorBoundary
          fallback={({ reference, reset }) => (
            <RouteErrorScreen reference={reference} onRetry={reset} />
          )}
        >
          <Routes>
            {/* 로그인 — 셸(사이드바) 밖의 단독 화면 */}
            <Route path="/login" element={<LoginPage />} />

            {/* 인증 후 화면 — AppShell(사이드바) 레이아웃 라우트.
              [EXC-02] RequireAuth 가 셸보다 **바깥**이다: 세션이 없으면 셸도 그리지 않고
              /login?returnUrl=<현재 경로> 로 보낸다. 안쪽에 두면 인증되지 않은 사용자에게
              사이드바가 한 프레임 번쩍이고 그 사이 화면의 쿼리가 발사된다. */}
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              {/* 설정 배열(APP_ROUTES) 을 그대로 렌더한다 — 경로·element·순서의 단일 원천.
                준비 중 화면(pendingRoutes)은 아래에서 이어 붙인다. */}
              {APP_ROUTES.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}

              {/* 사이드바 정의는 있으나 미구현 — 화면을 만들 때마다 위로 옮긴다 */}
              {pendingRoutes.map((leaf) => (
                <Route key={leaf.to} path={leaf.to} element={<PlaceholderPage />} />
              ))}
            </Route>

            {/* 정의되지 않은 경로 — 대시보드로 기본 리다이렉트 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}
