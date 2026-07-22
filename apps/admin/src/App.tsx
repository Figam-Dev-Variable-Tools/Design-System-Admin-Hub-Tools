// TDS Admin Hub 라우트 구성 (게이트 G6)
//
// [import 규칙] 컴포넌트는 반드시 @tds/ui public entry에서만 import한다.
//   허용: import { Button } from '@tds/ui';                  ← G3 계약 승인 + G5 통과 후 활성화
//   금지: import { Button } from '@tds/ui/src/atoms/Button'; ← eslint no-restricted-imports가 차단 (G6 체크리스트)
//   예외: '@tds/ui/tokens.css'는 공개 서브패스 export — deep import가 아니다 (src/main.tsx에서 import).
//
// [하드코딩 스타일 금지] 색상 hex / px 값을 코드에 직접 쓰지 않는다.
//   토큰 파이프라인(tokens.json → generated CSS 변수 var(--tds-*)) 참조만 허용 — eslint no-restricted-syntax가 차단.
//
// [라우트 ↔ Screen Spec 매핑] (SCR 문서는 UI 기획 산출물 — 작성 중이면 경로 참조만 유지)
//   /login         → docs/plan/ui/SCR-001-login.md
//   /dashboard     → docs/plan/ui/SCR-002-dashboard.md (기본 리다이렉트 대상)
//   /products      → 상품 관리(목록·등록·수정·카테고리) — SCR-003 상품 등록을 이 체계로 통합했다
//
// [코드 분할] 화면은 라우트 단위 lazy 청크다 (아래 lazy 선언 블록 참조).
//   화면을 추가할 때도 `const X = lazy(() => import('./pages/...'))` 로 적는다 —
//   **정적 import 를 하나 되살리면 그 화면은 다시 진입 번들에 실린다.** 그것이 이 분할이 조용히
//   풀리는 유일한 경로다.
//   실측 (vite build · gzip · 같은 파이프라인 기준):
//     진입 번들  347.15 kB → 117.69 kB  (-229.46 kB · -66.1%)   raw 1,245.76 → 372.46 kB
//     청크        1개 → 212개. 화면당 대개 1~8 kB 를 그때 받는다.
//   남은 117.69 kB 는 프레임워크 코어(react·react-dom·react-router·@tanstack/query)+셸이다 —
//   이건 어느 화면을 열든 필요하므로 진입에 있는 것이 맞다.
import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
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

import { wireDomains } from './wiring';
import { wireAiDomains } from './wiring-ai';
import { cssVar } from '@tds/ui';

// 도메인 배선은 앱이 뜨기 전에 한 번 — 근거는 wiring.ts 머리말
wireDomains();
wireAiDomains();

/**
 * [코드 분할] 화면 모듈은 라우트 단위로 lazy 로 나눈다 — 오너 확정 스택의 Lazy Loading·Code Splitting.
 * 사이드바에서 한 화면을 열 때 그 화면의 코드만 받는다: 130여 화면을 전부 담은 단일 번들을 첫
 * 진입에 내려받게 하지 않는다.
 *
 * 즉시 로드로 남기는 셋 — 나누는 것이 손해인 것들이다:
 *   LoginPage       진입 화면. 쪼개면 첫 페인트 앞에 왕복이 하나 더 붙는다.
 *   DashboardPage   / 의 리다이렉트 대상(랜딩). 같은 이유로 LCP 를 지킨다.
 *   PlaceholderPage 미구현 라우트용 한 줄짜리 화면. 청크로 나눌 실익이 없다.
 */
const PermissionsPage = lazy(() => import('./pages/permissions/PermissionsPage'));
const MembersPage = lazy(() => import('./pages/members/MembersPage'));
const MemberDetailPage = lazy(() => import('./pages/members/MemberDetailPage'));
const AdminsPage = lazy(() => import('./pages/admins/AdminsPage'));
const AdminDetailPage = lazy(() => import('./pages/admins/AdminDetailPage'));
const AdminFormPage = lazy(() => import('./pages/admins/AdminFormPage'));
const CustomerSettingsPage = lazy(() => import('./pages/customer-settings/CustomerSettingsPage'));
const LoginHistoryPage = lazy(() => import('./pages/login-history/LoginHistoryPage'));
const ConsentsPage = lazy(() => import('./pages/users/consents/ConsentsPage'));
const CareersListPage = lazy(() => import('./pages/company/careers/CareersListPage'));
const CareersFormPage = lazy(() => import('./pages/company/careers/CareersFormPage'));
const SiteConnectPage = lazy(() => import('./pages/settings/site-connect/SiteConnectPage'));
const NotificationSettingsPage = lazy(
  () => import('./pages/settings/notifications/NotificationSettingsPage'),
);
const LanguagesPage = lazy(() => import('./pages/settings/languages/LanguagesPage'));
const NoticesPage = lazy(() => import('./pages/content/notices/NoticesPage'));
const NoticeDetailPage = lazy(() => import('./pages/content/notices/NoticeDetailPage'));
const NoticeFormPage = lazy(() => import('./pages/content/notices/NoticeFormPage'));
const FaqPage = lazy(() => import('./pages/content/faq/FaqPage'));
const FaqDetailPage = lazy(() => import('./pages/content/faq/FaqDetailPage'));
const FaqFormPage = lazy(() => import('./pages/content/faq/FaqFormPage'));
const PopupsPage = lazy(() => import('./pages/content/popups/PopupsPage'));
const PopupFormPage = lazy(() => import('./pages/content/popups/PopupFormPage'));
const BannersPage = lazy(() => import('./pages/content/banners/BannersPage'));
const BannerFormPage = lazy(() => import('./pages/content/banners/BannerFormPage'));
const TermsPage = lazy(() => import('./pages/content/terms/TermsPage'));
const TermsDetailPage = lazy(() => import('./pages/content/terms/TermsDetailPage'));
const TermsFormPage = lazy(() => import('./pages/content/terms/TermsFormPage'));
const PrivacyPage = lazy(() => import('./pages/content/privacy/PrivacyPage'));
const PrivacyDetailPage = lazy(() => import('./pages/content/privacy/PrivacyDetailPage'));
const PrivacyFormPage = lazy(() => import('./pages/content/privacy/PrivacyFormPage'));
const SitePagesPage = lazy(() => import('./pages/content/pages/SitePagesPage'));
const SitePageFormPage = lazy(() => import('./pages/content/pages/SitePageFormPage'));
const SiteMenusPage = lazy(() => import('./pages/content/menus/SiteMenusPage'));
const ContentFormsPage = lazy(() => import('./pages/content/forms/ContentFormsPage'));
const ContentFormEditPage = lazy(() => import('./pages/content/forms/ContentFormEditPage'));
const MediaLibraryPage = lazy(() => import('./pages/content/media/MediaLibraryPage'));
const NewsPage = lazy(() => import('./pages/content/news/NewsPage'));
const NewsFormPage = lazy(() => import('./pages/content/news/NewsFormPage'));
const CompanyProfilePage = lazy(() => import('./pages/company/profile/CompanyProfilePage'));
const CeoMessagePage = lazy(() => import('./pages/company/ceo-message/CeoMessagePage'));
const DirectionsPage = lazy(() => import('./pages/company/directions/DirectionsPage'));
const PartnersPage = lazy(() => import('./pages/company/partners/PartnersPage'));
const ClientsPage = lazy(() => import('./pages/company/clients/ClientsPage'));
const HistoryListPage = lazy(() => import('./pages/company/history/HistoryListPage'));
const HistoryFormPage = lazy(() => import('./pages/company/history/HistoryFormPage'));
const CertificatesListPage = lazy(
  () => import('./pages/company/certificates/CertificatesListPage'),
);
const CertificatesFormPage = lazy(
  () => import('./pages/company/certificates/CertificatesFormPage'),
);
const EsgListPage = lazy(() => import('./pages/company/esg/EsgListPage'));
const EsgFormPage = lazy(() => import('./pages/company/esg/EsgFormPage'));
const PortfolioListPage = lazy(() => import('./pages/portfolio/items/PortfolioListPage'));
const PortfolioFormPage = lazy(() => import('./pages/portfolio/items/PortfolioFormPage'));
const PortfolioCategoriesPage = lazy(
  () => import('./pages/portfolio/categories/PortfolioCategoriesPage'),
);
const CaseStudyListPage = lazy(() => import('./pages/portfolio/case-studies/CaseStudyListPage'));
const CaseStudyFormPage = lazy(() => import('./pages/portfolio/case-studies/CaseStudyFormPage'));
const OrderListPage = lazy(() => import('./pages/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'));
const ShipmentListPage = lazy(() => import('./pages/orders/shipments/ShipmentListPage'));
const ClaimsListPage = lazy(() => import('./pages/orders/claims/ClaimsListPage'));
const ClaimDetailPage = lazy(() => import('./pages/orders/claims/ClaimDetailPage'));
const ProductListPage = lazy(() => import('./pages/products/items/ProductListPage'));
const ProductFormPage = lazy(() => import('./pages/products/items/ProductFormPage'));
const ProductCategoriesPage = lazy(
  () => import('./pages/products/categories/ProductCategoriesPage'),
);
const CouponListPage = lazy(() => import('./pages/products/coupons/CouponListPage'));
const CouponFormPage = lazy(() => import('./pages/products/coupons/CouponFormPage'));
const CouponIssuanceListPage = lazy(
  () => import('./pages/products/coupons/CouponIssuanceListPage'),
);
const ReviewListPage = lazy(() => import('./pages/products/reviews/ReviewListPage'));
const ReviewDetailPage = lazy(() => import('./pages/products/reviews/ReviewDetailPage'));
const ShippingPolicyPage = lazy(() => import('./pages/products/shipping/ShippingPolicyPage'));
const PointsPolicyPage = lazy(() => import('./pages/products/points/PointsPolicyPage'));
const ProductInquiryListPage = lazy(
  () => import('./pages/products/inquiries/ProductInquiryListPage'),
);
const ProductInquiryDetailPage = lazy(
  () => import('./pages/products/inquiries/ProductInquiryDetailPage'),
);
const ProgramListPage = lazy(() => import('./pages/programs/ProgramListPage'));
const ProgramDetailPage = lazy(() => import('./pages/programs/ProgramDetailPage'));
const ProgramFormPage = lazy(() => import('./pages/programs/ProgramFormPage'));
const ProgramCategoriesPage = lazy(
  () => import('./pages/programs/categories/ProgramCategoriesPage'),
);
const ProgramInquiryListPage = lazy(
  () => import('./pages/programs/inquiries/ProgramInquiryListPage'),
);
const ProgramInquiryDetailPage = lazy(
  () => import('./pages/programs/inquiries/ProgramInquiryDetailPage'),
);
const AccountListPage = lazy(() => import('./pages/sales/accounts/AccountListPage'));
const AccountFormPage = lazy(() => import('./pages/sales/accounts/AccountFormPage'));
const AccountDetailPage = lazy(() => import('./pages/sales/accounts/AccountDetailPage'));
const ContractListPage = lazy(() => import('./pages/sales/contracts/ContractListPage'));
const ContractFormPage = lazy(() => import('./pages/sales/contracts/ContractFormPage'));
const QuoteListPage = lazy(() => import('./pages/sales/quotes/QuoteListPage'));
const QuoteFormPage = lazy(() => import('./pages/sales/quotes/QuoteFormPage'));
const QuoteDetailPage = lazy(() => import('./pages/sales/quotes/QuoteDetailPage'));
const BillingListPage = lazy(() => import('./pages/sales/billing/BillingListPage'));
const BillingDetailPage = lazy(() => import('./pages/sales/billing/BillingDetailPage'));
const InquiryListPage = lazy(() => import('./pages/sales/inquiries/InquiryListPage'));
const InquiryDetailPage = lazy(() => import('./pages/sales/inquiries/InquiryDetailPage'));
const ProjectListPage = lazy(() => import('./pages/sales/projects/ProjectListPage'));
const ProjectFormPage = lazy(() => import('./pages/sales/projects/ProjectFormPage'));
const ConsultationListPage = lazy(() => import('./pages/sales/consultations/ConsultationListPage'));
const ConsultationDetailPage = lazy(
  () => import('./pages/sales/consultations/ConsultationDetailPage'),
);
const TicketListPage = lazy(() => import('./pages/support/tickets/TicketListPage'));
const TicketDetailPage = lazy(() => import('./pages/support/tickets/TicketDetailPage'));
const CategoriesPage = lazy(() => import('./pages/support/categories/CategoriesPage'));
const RepliesPage = lazy(() => import('./pages/support/replies/RepliesPage'));
const ReplyFormPage = lazy(() => import('./pages/support/replies/ReplyFormPage'));
const CustomerFaqPage = lazy(() => import('./pages/support/faq/CustomerFaqPage'));
const DownloadListPage = lazy(() => import('./pages/support/downloads/DownloadListPage'));
const DownloadFormPage = lazy(() => import('./pages/support/downloads/DownloadFormPage'));
const EventListPage = lazy(() => import('./pages/marketing/events/EventListPage'));
const EventFormPage = lazy(() => import('./pages/marketing/events/EventFormPage'));
const PromotionListPage = lazy(() => import('./pages/marketing/promotions/PromotionListPage'));
const PromotionFormPage = lazy(() => import('./pages/marketing/promotions/PromotionFormPage'));
const NewsletterListPage = lazy(() => import('./pages/marketing/newsletters/NewsletterListPage'));
const NewsletterFormPage = lazy(() => import('./pages/marketing/newsletters/NewsletterFormPage'));
const SmsListPage = lazy(() => import('./pages/marketing/sms/SmsListPage'));
const SmsFormPage = lazy(() => import('./pages/marketing/sms/SmsFormPage'));
const EmailListPage = lazy(() => import('./pages/marketing/email/EmailListPage'));
const EmailFormPage = lazy(() => import('./pages/marketing/email/EmailFormPage'));
/* 메시지 템플릿 — 이메일·문자·알림톡·브랜드메시지 4종을 한 모델이 덮는다 */
const MessageTemplateListPage = lazy(
  () => import('./pages/marketing/message-templates/MessageTemplateListPage'),
);
const MessageTemplateEditorPage = lazy(
  () => import('./pages/marketing/message-templates/MessageTemplateEditorPage'),
);
const MessageTemplateDetailPage = lazy(
  () => import('./pages/marketing/message-templates/MessageTemplateDetailPage'),
);
const AdminLogPage = lazy(() => import('./pages/logs/admin/AdminLogPage'));
const MemberActivityPage = lazy(() => import('./pages/logs/member-activity/MemberActivityPage'));
const ApiLogPage = lazy(() => import('./pages/logs/api/ApiLogPage'));
const ErrorLogPage = lazy(() => import('./pages/logs/errors/ErrorLogPage'));
const NewChatPage = lazy(() => import('./pages/ai/NewChatPage'));
const AiConversationsPage = lazy(() => import('./pages/ai/ConversationsPage'));
const VisitorStatsPage = lazy(() => import('./pages/stats/visitors/VisitorStatsPage'));
const MemberStatsPage = lazy(() => import('./pages/stats/members/MemberStatsPage'));
const RevenueStatsPage = lazy(() => import('./pages/stats/revenue/RevenueStatsPage'));
const OrderStatsPage = lazy(() => import('./pages/stats/orders/OrderStatsPage'));
const TrafficStatsPage = lazy(() => import('./pages/stats/traffic/TrafficStatsPage'));
const KeywordStatsPage = lazy(() => import('./pages/stats/keywords/KeywordStatsPage'));
const SiteSettingsPage = lazy(() => import('./pages/settings/site/SiteSettingsPage'));
const ApiKeysPage = lazy(() => import('./pages/settings/api-keys/ApiKeysPage'));
/* AI 프로바이더 자격증명 상세 — 연동 목록에서 이름(또는 '앱 설정')을 누르면 여기로 온다.
   권한은 따로 걸지 않는다: findCoveringLeaf 가 이 경로를 잎 '/settings/api-keys' 로 풀어 주므로
   AppShell 의 RequirePermission 이 목록과 **똑같이** 덮는다 (shared/permissions/route-resource). */
const AiConnectionPage = lazy(() => import('./pages/settings/api-keys/AiConnectionPage'));
const OAuthPage = lazy(() => import('./pages/settings/oauth/OAuthPage'));
const PaymentSettingsPage = lazy(() => import('./pages/settings/payment/PaymentSettingsPage'));
const PlanPage = lazy(() => import('./pages/settings/plan/PlanPage'));
/* 소셜 로그인 제공자 상세 — 목록에서 타일(링크)을 누르면 여기로 온다.
   권한은 따로 걸지 않는다: findCoveringLeaf 가 이 경로를 잎 '/settings/oauth' 로 풀어 주므로
   AppShell 의 RequirePermission 이 목록과 **똑같이** 덮는다 (shared/permissions/route-resource). */
const OAuthProviderPage = lazy(() => import('./pages/settings/oauth/OAuthProviderPage'));

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
  /* 운영자 상세·등록·수정 — **운영자 전용 화면**이다.
     예전에는 상세가 회원 상세(MemberDetailPage)에 조회 함수만 주입한 재사용이었다. 그 결과
     운영자에게 '회원 유형: 일반회원' 이 붙고 적립금·쿠폰 카드가 빈 채로 떴으며, 무엇보다 ⋯ 메뉴의
     삭제가 **회원 어댑터**를 불러 운영자 id 로 회원 엔드포인트를 때렸다(FS-005 §7 #3·#4).

     ['new' 가 ':id' 보다 위에 있는 이유] react-router 는 정적 세그먼트를 동적 세그먼트보다
     구체적인 것으로 쳐서 순서와 무관하게 'new' 를 먼저 고르지만, **읽는 사람에게는 순서가
     곧 규칙으로 보인다.** 아래에 두면 언젠가 누군가 ':id' 가 'new' 를 가로챈다고 읽고 고치려 든다. */
  { path: '/users/admins/new', element: <AdminFormPage /> },
  { path: '/users/admins/:id', element: <AdminDetailPage /> },
  { path: '/users/admins/:id/edit', element: <AdminFormPage /> },
  // 로그인 이력 — 읽기 전용 감사 로그(상세·쓰기 라우트 없음).
  { path: '/users/login-history', element: <LoginHistoryPage />, implemented: true },
  // 동의 이력 — 개인정보보호법상 동의·철회 기록은 append-only 다
  { path: '/users/consents', element: <ConsentsPage />, implemented: true },

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

  // 홈페이지 콘텐츠 — 임의 페이지·메뉴 트리·문의 폼·미디어·뉴스.
  // 상세(:id) 라우트가 없는 것은 의도다: 다섯 화면 모두 행 클릭이 편집으로 간다.
  { path: '/content/pages', element: <SitePagesPage />, implemented: true },
  { path: '/content/pages/new', element: <SitePageFormPage /> },
  { path: '/content/pages/:id/edit', element: <SitePageFormPage /> },
  { path: '/content/menus', element: <SiteMenusPage />, implemented: true },
  { path: '/content/forms', element: <ContentFormsPage />, implemented: true },
  { path: '/content/forms/new', element: <ContentFormEditPage /> },
  { path: '/content/forms/:id/edit', element: <ContentFormEditPage /> },
  { path: '/content/media', element: <MediaLibraryPage />, implemented: true },
  { path: '/content/news', element: <NewsPage />, implemented: true },
  { path: '/content/news/new', element: <NewsFormPage /> },
  { path: '/content/news/:id/edit', element: <NewsFormPage /> },

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
  { path: '/company/careers', element: <CareersListPage />, implemented: true },
  { path: '/company/careers/new', element: <CareersFormPage /> },
  { path: '/company/careers/:id/edit', element: <CareersFormPage /> },

  // 포트폴리오 — 포트폴리오/카테고리/성공사례.
  { path: '/portfolio/items', element: <PortfolioListPage />, implemented: true },
  { path: '/portfolio/items/new', element: <PortfolioFormPage /> },
  { path: '/portfolio/items/:id/edit', element: <PortfolioFormPage /> },
  { path: '/portfolio/categories', element: <PortfolioCategoriesPage />, implemented: true },
  { path: '/portfolio/case-studies', element: <CaseStudyListPage />, implemented: true },
  { path: '/portfolio/case-studies/new', element: <CaseStudyFormPage /> },
  { path: '/portfolio/case-studies/:id/edit', element: <CaseStudyFormPage /> },

  // 주문 — 목록 > 상세. 등록·삭제 라우트는 없다(고객의 결제가 만들고, 거래 기록은 지우지 않는다).
  { path: '/orders', element: <OrderListPage />, implemented: true },
  // 정적 잎은 '/orders/:id' 보다 먼저 잡혀야 한다
  { path: '/orders/shipments', element: <ShipmentListPage />, implemented: true },
  // 취소·교환·반품을 한 축으로 묶은 클레임 — 예전 '/products/returns' 가 여기로 왔다
  { path: '/orders/claims', element: <ClaimsListPage />, implemented: true },
  { path: '/orders/claims/:id', element: <ClaimDetailPage /> },
  /* 옛 경로로 저장해 둔 북마크·링크가 조용히 대시보드로 튕기지 않게 넘겨 준다.
     교환/반품은 상품 관리 밑에 있었고 취소가 축으로 들어오면서 여기로 옮겨 왔다. */
  { path: '/products/returns', element: <Navigate to="/orders/claims" replace /> },
  { path: '/products/returns/*', element: <Navigate to="/orders/claims" replace /> },
  { path: '/orders/:id', element: <OrderDetailPage /> },

  // 상품 — 상품/카테고리/쿠폰/리뷰/교환·반품/배송·적립금.
  { path: '/products', element: <ProductListPage />, implemented: true },
  { path: '/products/new', element: <ProductFormPage /> },
  { path: '/products/:id/edit', element: <ProductFormPage /> },
  { path: '/products/categories', element: <ProductCategoriesPage />, implemented: true },
  { path: '/products/coupons', element: <CouponListPage />, implemented: true },
  // 발급 현황·이력 — 정적 잎이라 '/products/coupons/:id/edit' 보다 먼저 잡힌다.
  // 권한은 findCoveringLeaf 가 '/products/coupons' 로 풀어 준다(nav 잎을 새로 만들지 않는다).
  { path: '/products/coupons/issuance', element: <CouponIssuanceListPage /> },
  { path: '/products/coupons/new', element: <CouponFormPage /> },
  { path: '/products/coupons/:id/edit', element: <CouponFormPage /> },
  { path: '/products/reviews', element: <ReviewListPage />, implemented: true },
  { path: '/products/reviews/:id', element: <ReviewDetailPage /> },
  { path: '/products/shipping', element: <ShippingPolicyPage />, implemented: true },
  { path: '/products/points', element: <PointsPolicyPage />, implemented: true },
  // 문의 — PG 미사용 설정에서 구매 버튼이 '문의하기'가 되면 이리로 들어온다 (shared/commerce)
  { path: '/products/inquiries', element: <ProductInquiryListPage />, implemented: true },
  { path: '/products/inquiries/:id', element: <ProductInquiryDetailPage /> },

  // 프로그램(후원형 펀딩) — 목록 > 상세 · 등록·수정 · 카테고리(2Depth).
  // 등록(new)과 수정(:id/edit)은 **같은 화면**(ProgramFormPage)이다 — 채워 두느냐 비워 두느냐만 다르다.
  // 정적 잎('/programs/new'·'/programs/categories')이 '/programs/:id' 보다 구체적이라 먼저 잡힌다.
  { path: '/programs', element: <ProgramListPage />, implemented: true },
  { path: '/programs/new', element: <ProgramFormPage /> },
  { path: '/programs/categories', element: <ProgramCategoriesPage />, implemented: true },
  { path: '/programs/inquiries', element: <ProgramInquiryListPage />, implemented: true },
  { path: '/programs/inquiries/:id', element: <ProgramInquiryDetailPage /> },
  { path: '/programs/:id', element: <ProgramDetailPage /> },
  { path: '/programs/:id/edit', element: <ProgramFormPage /> },

  // 영업 — 거래처/계약/견적/문의/프로젝트/상담이력.
  { path: '/sales/accounts', element: <AccountListPage />, implemented: true },
  { path: '/sales/accounts/new', element: <AccountFormPage /> },
  { path: '/sales/accounts/:id/edit', element: <AccountFormPage /> },
  // 조회 전용 상세 — 읽기 권한만 있는 사람이 값을 보려고 수정 폼을 열지 않게 한다.
  // 거래처의 계약·견적·프로젝트·상담 역방향 조회도 여기에 있다.
  { path: '/sales/accounts/:id', element: <AccountDetailPage /> },
  { path: '/sales/contracts', element: <ContractListPage />, implemented: true },
  { path: '/sales/contracts/new', element: <ContractFormPage /> },
  { path: '/sales/contracts/:id/edit', element: <ContractFormPage /> },
  { path: '/sales/quotes', element: <QuoteListPage />, implemented: true },
  { path: '/sales/quotes/new', element: <QuoteFormPage /> },
  { path: '/sales/quotes/:id/edit', element: <QuoteFormPage /> },
  // 문의의 '견적 보기'가 가는 곳 — 발행·수주된 견적을 편집 폼으로 열지 않는다
  { path: '/sales/quotes/:id', element: <QuoteDetailPage /> },
  // 수주 이후가 비어 있던 자리 — 청구 안내 발송과 입금확인이 여기서 닫힌다
  { path: '/sales/billing', element: <BillingListPage />, implemented: true },
  { path: '/sales/billing/:id', element: <BillingDetailPage /> },
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
  /* ── 발송 템플릿 (/marketing/templates) ────────────────────────────────────
   *
   * 이 자리의 화면은 **메시지 템플릿(이메일·문자)** 이다. 운영자가 이미 쓰던 경로가 새 시스템으로
   * 바뀐 것이지 옆에 화면이 하나 더 생긴 것이 아니다 — 메뉴에 '템플릿' 이 둘이면 어디에 만들어야
   * 하는지를 매번 고민하게 된다.
   *
   * [알림톡 화면이 왜 사라졌나] 한동안 옛 알림톡 화면을 /alimtalk 아래에 세워 뒀다 — 카카오
   * 알림톡은 심사 주체가 우리가 아닌 별개 생명주기라(사전 심사·승인 잠금·반려 사유) 새 모델이
   * 아직 덮지 못한다고 봤기 때문이다. 그런데 새 모델은 그 사이에 알림톡을 덮었고(종류 4종 ·
   * AlimtalkTemplateEditor · 승인 잠금), 사이드바에 올리지 않은 그 경로는 앱 안 어디에서도
   * 링크되지 않아 **아무도 닿을 수 없는 중복 화면**으로 남아 있었다. 지금은 지웠다.
   * 옛 경로로 저장된 북마크는 아래 리다이렉트가 새 목록으로 넘겨 준다.
   */
  { path: '/marketing/templates', element: <MessageTemplateListPage />, implemented: true },
  // 등록은 종류를 쿼리로 받는다(?kind=text|email|alimtalk) — 라우트를 종류별로 가르면 수정 경로도 갈라야 한다
  { path: '/marketing/templates/new', element: <MessageTemplateEditorPage /> },
  {
    path: '/marketing/templates/alimtalk',
    element: <Navigate to="/marketing/templates" replace />,
  },
  {
    path: '/marketing/templates/alimtalk/*',
    element: <Navigate to="/marketing/templates" replace />,
  },
  /* :id 는 alimtalk 뒤에 온다 — 위의 고정 경로들이 먼저 걸리도록 순서를 지킨다 */
  { path: '/marketing/templates/:id', element: <MessageTemplateDetailPage /> },
  { path: '/marketing/templates/:id/edit', element: <MessageTemplateEditorPage /> },
  /* 옛 경로로 저장해 둔 북마크·링크가 404 를 만나지 않게 넘겨 준다 (한동안 유지한다) */
  {
    path: '/marketing/message-templates',
    element: <Navigate to="/marketing/templates" replace />,
  },
  {
    path: '/marketing/message-templates/*',
    element: <Navigate to="/marketing/templates" replace />,
  },

  // AI 에이전트 — 멘션한 데이터를 조건으로 조회한다. 열어 둔 대화는 라우트가 아니라
  // 쿼리스트링(`?c=`)에 실린다 — 같은 화면의 상태이지 다른 화면이 아니기 때문이다 (IA-13).
  { path: '/ai/chat', element: <NewChatPage />, implemented: true },
  { path: '/ai/conversations', element: <AiConversationsPage />, implemented: true },

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

  // 시스템 설정 — 시크릿을 다루는 화면이지만 403 게이팅은 이 섹션이 따로 하지 않는다 —
  // AppShell 이 <Outlet> 을 RequirePermission 으로 감싸 모든 라우트를 한 번에 덮는다
  // (shared/permissions · EXC-03).
  { path: '/settings/site', element: <SiteSettingsPage />, implemented: true },
  // 사이트 설정과 짝이다 — 하나는 우리 사이트의 값, 하나는 바깥과의 연결
  { path: '/settings/site-connect', element: <SiteConnectPage />, implemented: true },
  { path: '/settings/api-keys', element: <ApiKeysPage />, implemented: true },
  { path: '/settings/api-keys/:providerId', element: <AiConnectionPage /> },
  // AI 연동과 OAuth 가 목록/상세로 갈린다 — 붙일 수 있는 대상이 13종·6종이라
  // 한 화면에 자격증명을 다 펼치면 무엇을 채워야 하는지가 보이지 않는다.
  { path: '/settings/oauth', element: <OAuthPage />, implemented: true },
  { path: '/settings/oauth/:provider', element: <OAuthProviderPage /> },
  // 결제 연동 여부가 상품·프로그램의 구매/후원 버튼을 '문의하기'로 바꾼다 (shared/commerce)
  { path: '/settings/payment', element: <PaymentSettingsPage />, implemented: true },
  // 구독·계약이 무엇을 열어 주는지 보는 화면 — 읽기 전용이다(플랜 변경은 사내 홈페이지 소관)
  { path: '/settings/plan', element: <PlanPage />, implemented: true },
  { path: '/settings/notifications', element: <NotificationSettingsPage />, implemented: true },
  { path: '/settings/languages', element: <LanguagesPage />, implemented: true },
];

/**
 * 사이드바에 있는데 아직 화면이 없는 경로 — 죽은 링크 방지의 원천.
 * APP_ROUTES 의 implemented 플래그에서 파생한다(중복 유지 로직 제거).
 */
const IMPLEMENTED = new Set(
  APP_ROUTES.filter((route) => route.implemented === true).map((route) => route.path),
);

/**
 * 화면 코드가 도착하기를 기다리는 동안의 자리표시 (lazy 청크 1회 로드).
 *
 * **일부러 aria-hidden 이다.** 이것은 '조회 중'이 아니라 '코드 오는 중'이고, 그 둘은 다른 사실이다.
 * 화면이 도착하면 화면 자신이 자기 조회 상태를 aria-busy·스켈레톤으로 다시 알린다 (STATE-01·FS-002).
 * 여기서 또 하나의 로딩을 announce 하면 같은 전이를 두 번 말하게 된다.
 */
function RouteFallback() {
  return <div style={{ minBlockSize: cssVar('space.10') }} aria-hidden="true" />;
}

/**
 * 라우트 청크 경계 — 셸(사이드바) **안쪽**이다.
 * 바깥에 두면 화면을 옮길 때마다 사이드바까지 자리표시로 바뀐다. 셸은 남고 본문만 기다려야 한다.
 */
function SuspendedOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

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

              {/* [코드 분할] 화면은 lazy 청크라 도착을 기다려야 한다 — 그 경계가 여기다.
                index 리다이렉트는 코드가 없으므로 이 바깥에 남는다. */}
              <Route element={<SuspendedOutlet />}>
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
            </Route>

            {/* 정의되지 않은 경로 — 대시보드로 기본 리다이렉트 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}
