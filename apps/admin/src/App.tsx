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
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
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
import ReservationListPage from './pages/reservations/ReservationListPage';
import ReservationFormPage from './pages/reservations/ReservationFormPage';
import ApplicationListPage from './pages/reservations/applications/ApplicationListPage';
import ApplicationDetailPage from './pages/reservations/applications/ApplicationDetailPage';
import ConsultationBookingListPage from './pages/reservations/consultations/ConsultationBookingListPage';
import ConsultationBookingFormPage from './pages/reservations/consultations/ConsultationBookingFormPage';
import ScheduleCalendarPage from './pages/reservations/schedule/ScheduleCalendarPage';

/**
 * 실제 화면이 있는 경로 — 나머지 사이드바 항목(nav-config.ts)은 준비 중 화면으로 간다.
 * 화면을 하나 완성할 때마다 여기에 경로를 추가하고 아래 <Route>를 명시한다.
 */
const IMPLEMENTED = new Set([
  '/dashboard',
  '/products',
  '/products/categories',
  '/products/coupons',
  '/products/reviews',
  '/products/returns',
  '/products/shipping',
  '/products/points',
  '/users/roles',
  '/users/members',
  '/users/settings',
  '/users/admins',
  '/users/login-history',
  '/content/notices',
  '/content/faq',
  '/content/popups',
  '/content/banners',
  '/content/terms',
  '/content/privacy',
  '/company/profile',
  '/company/ceo-message',
  '/company/directions',
  '/company/partners',
  '/company/clients',
  '/company/history',
  '/company/certificates',
  '/company/esg',
  '/portfolio/items',
  '/portfolio/categories',
  '/portfolio/case-studies',
  '/sales/accounts',
  '/sales/contracts',
  '/sales/quotes',
  '/sales/inquiries',
  '/sales/projects',
  '/sales/consultations',
  '/support/tickets',
  '/support/categories',
  '/support/replies',
  '/support/faq',
  '/support/downloads',
  '/marketing/events',
  '/marketing/promotions',
  '/marketing/newsletters',
  '/marketing/sms',
  '/marketing/email',
  '/marketing/templates',
  '/reservations',
  '/reservations/applications',
  '/reservations/consultations',
  '/reservations/schedule',
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

            {/* 콘텐츠 관리 — 공지사항 (목록 · 등록 · 상세 · 수정).
              등록/수정은 하나의 폼(NoticeFormPage)이 겸한다 — :id 유무로 갈린다.
              상세/폼 라우트는 사이드바(nav-config)에 없어 IMPLEMENTED 와 무관하게 라우트만 둔다. */}
            <Route path="/content/notices" element={<NoticesPage />} />
            <Route path="/content/notices/new" element={<NoticeFormPage />} />
            <Route path="/content/notices/:id" element={<NoticeDetailPage />} />
            <Route path="/content/notices/:id/edit" element={<NoticeFormPage />} />

            {/* 콘텐츠 관리 — FAQ (목록 · 등록 · 상세 · 수정). 카테고리 등록은 목록의 모달이다. */}
            <Route path="/content/faq" element={<FaqPage />} />
            <Route path="/content/faq/new" element={<FaqFormPage />} />
            <Route path="/content/faq/:id" element={<FaqDetailPage />} />
            <Route path="/content/faq/:id/edit" element={<FaqFormPage />} />

            {/* 콘텐츠 관리 — 팝업/배너 (목록 · 등록 · 수정).
              등록/수정은 하나의 폼 페이지(오른쪽 실시간 미리보기 2단)가 겸한다 — :id 유무로 갈린다.
              폼 라우트는 사이드바(nav-config)에 없어 IMPLEMENTED 와 무관하게 라우트만 둔다. */}
            <Route path="/content/popups" element={<PopupsPage />} />
            <Route path="/content/popups/new" element={<PopupFormPage />} />
            <Route path="/content/popups/:id/edit" element={<PopupFormPage />} />
            <Route path="/content/banners" element={<BannersPage />} />
            <Route path="/content/banners/new" element={<BannerFormPage />} />
            <Route path="/content/banners/:id/edit" element={<BannerFormPage />} />

            {/* 콘텐츠 관리 — 약관/개인정보 처리방침 (목록 · 등록 · 상세 · 수정 · 버전 이력 표 공유).
              목록은 툴바+버전 이력, 행 클릭 → 상세(전문), 등록/수정은 별도 폼 페이지.
              상세/폼 라우트는 사이드바(nav-config)에 없어 IMPLEMENTED 와 무관하게 라우트만 둔다.
              '/new' 는 '/:id' 보다 먼저 와야 한다(정적 경로 우선). */}
            <Route path="/content/terms" element={<TermsPage />} />
            <Route path="/content/terms/new" element={<TermsFormPage />} />
            <Route path="/content/terms/:id" element={<TermsDetailPage />} />
            <Route path="/content/terms/:id/edit" element={<TermsFormPage />} />
            <Route path="/content/privacy" element={<PrivacyPage />} />
            <Route path="/content/privacy/new" element={<PrivacyFormPage />} />
            <Route path="/content/privacy/:id" element={<PrivacyDetailPage />} />
            <Route path="/content/privacy/:id/edit" element={<PrivacyFormPage />} />

            {/* 기업 관리 — 단일 문서형 3종 (회사 정보·CEO 인사말·오시는 길).
              목록 없이 문서 1건을 불러와 편집하는 폼 하나. 저장은 토스트, 필드 오류는 인라인. */}
            <Route path="/company/profile" element={<CompanyProfilePage />} />
            <Route path="/company/ceo-message" element={<CeoMessagePage />} />
            <Route path="/company/directions" element={<DirectionsPage />} />

            {/* 기업 관리 — 파트너사·고객사는 동일 모듈(logo-list)을 config 로 공유한다.
              목록 + 추가/수정 모달 + 삭제팝업 + 드래그 재정렬. */}
            <Route path="/company/partners" element={<PartnersPage />} />
            <Route path="/company/clients" element={<ClientsPage />} />

            {/* 기업 관리 — 연혁 (목록 · 등록 · 수정). 등록/수정은 하나의 폼(:id 유무로 갈린다).
              '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). */}
            <Route path="/company/history" element={<HistoryListPage />} />
            <Route path="/company/history/new" element={<HistoryFormPage />} />
            <Route path="/company/history/:id/edit" element={<HistoryFormPage />} />

            {/* 기업 관리 — 인증서/특허 (목록 · 등록 · 수정). 구분(인증서/특허) 필터. */}
            <Route path="/company/certificates" element={<CertificatesListPage />} />
            <Route path="/company/certificates/new" element={<CertificatesFormPage />} />
            <Route path="/company/certificates/:id/edit" element={<CertificatesFormPage />} />

            {/* 기업 관리 — ESG (카테고리별 목록 · 등록 · 수정). */}
            <Route path="/company/esg" element={<EsgListPage />} />
            <Route path="/company/esg/new" element={<EsgFormPage />} />
            <Route path="/company/esg/:id/edit" element={<EsgFormPage />} />

            {/* 포트폴리오 관리 — 포트폴리오 (목록 · 등록 · 수정). 등록/수정은 하나의 폼(:id 유무로 갈린다).
              '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). 목록엔 이미지 열을 넣지 않는다. */}
            <Route path="/portfolio/items" element={<PortfolioListPage />} />
            <Route path="/portfolio/items/new" element={<PortfolioFormPage />} />
            <Route path="/portfolio/items/:id/edit" element={<PortfolioFormPage />} />

            {/* 포트폴리오 관리 — 카테고리 (목록 · 추가/수정 모달 · 삭제팝업, 사용 중 차단). */}
            <Route path="/portfolio/categories" element={<PortfolioCategoriesPage />} />

            {/* 포트폴리오 관리 — 성공 사례 (목록 · 등록 · 수정). 업종 필터 + 노출 토글. */}
            <Route path="/portfolio/case-studies" element={<CaseStudyListPage />} />
            <Route path="/portfolio/case-studies/new" element={<CaseStudyFormPage />} />
            <Route path="/portfolio/case-studies/:id/edit" element={<CaseStudyFormPage />} />

            {/* 상품 관리 — 상품 (목록 · 등록 · 수정). 등록/수정은 하나의 폼(:id 유무로 갈린다).
              옵션·SKU 매트릭스 + 우측 실시간 상품 카드 미리보기. 목록엔 이미지 열을 넣지 않는다.
              '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). 예전 product-registration 을 통합했다. */}
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />

            {/* 상품 관리 — 카테고리 (목록 · 추가/수정 모달 · 삭제팝업, 사용 중 차단). */}
            <Route path="/products/categories" element={<ProductCategoriesPage />} />

            {/* 상품 관리 — 쿠폰 (목록 · 등록 · 수정). 발급유형·대상·조건·기간 + 우측 쿠폰 카드 미리보기.
              '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). */}
            <Route path="/products/coupons" element={<CouponListPage />} />
            <Route path="/products/coupons/new" element={<CouponFormPage />} />
            <Route path="/products/coupons/:id/edit" element={<CouponFormPage />} />

            {/* 상품 관리 — 리뷰 (목록 · 상세). 상세는 고객 화면 미리보기 + 노출 토글 + 관리자 답변 + 삭제. */}
            <Route path="/products/reviews" element={<ReviewListPage />} />
            <Route path="/products/reviews/:id" element={<ReviewDetailPage />} />

            {/* 상품 관리 — 교환/반품 (요청 목록 · 처리 상세). 감사 성격이라 삭제 없이 상태만 진행한다. */}
            <Route path="/products/returns" element={<ReturnsListPage />} />
            <Route path="/products/returns/:id" element={<ReturnDetailPage />} />

            {/* 상품 관리 — 배송·적립금 (정책 설정형 — 단일 문서 편집). 목록이 아니라 정책 1건을 고친다. */}
            <Route path="/products/shipping" element={<ShippingPolicyPage />} />
            <Route path="/products/points" element={<PointsPolicyPage />} />

            {/* 영업 관리 — 거래처 (목록 · 등록 · 수정). 등록/수정은 하나의 폼(:id 유무로 갈린다).
              사업자정보·거래조건·담당자 복수 + 우측 사업자 정보 미리보기. 목록엔 이미지 열이 없다.
              '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). */}
            <Route path="/sales/accounts" element={<AccountListPage />} />
            <Route path="/sales/accounts/new" element={<AccountFormPage />} />
            <Route path="/sales/accounts/:id/edit" element={<AccountFormPage />} />

            {/* 영업 관리 — 계약 (목록 · 등록 · 수정). 금액·기간·자동갱신·전자서명 상태 + 첨부 업로드
              + 우측 계약서 요약 미리보기. '/new' 는 '/:id/edit' 보다 먼저 온다. */}
            <Route path="/sales/contracts" element={<ContractListPage />} />
            <Route path="/sales/contracts/new" element={<ContractFormPage />} />
            <Route path="/sales/contracts/:id/edit" element={<ContractFormPage />} />

            {/* 영업 관리 — 견적 (목록 · 등록 · 수정). 라인아이템 편집표(공급가액·부가세·합계 자동계산)
              + 우측 견적서 문서 미리보기 + 승인 견적 인라인 수주 전환. '/new' 는 '/:id/edit' 보다 먼저. */}
            <Route path="/sales/quotes" element={<QuoteListPage />} />
            <Route path="/sales/quotes/new" element={<QuoteFormPage />} />
            <Route path="/sales/quotes/:id/edit" element={<QuoteFormPage />} />

            {/* 영업 관리 — 문의 (읽기 전용 목록 · 상세 처리). 문의는 고객 채널이 만들고 관리자는
              타임라인·답변·상태·담당만 처리한다. 상세 라우트만 두고 등록/삭제는 없다. */}
            <Route path="/sales/inquiries" element={<InquiryListPage />} />
            <Route path="/sales/inquiries/:id" element={<InquiryDetailPage />} />

            {/* 영업 관리 — 프로젝트(영업 기회) (목록 · 등록 · 수정). 파이프라인 단계·확률·예상매출·
              마일스톤·산출물 + 우측 파이프라인 스텝퍼/가중예상매출. '/new' 는 '/:id/edit' 보다 먼저. */}
            <Route path="/sales/projects" element={<ProjectListPage />} />
            <Route path="/sales/projects/new" element={<ProjectFormPage />} />
            <Route path="/sales/projects/:id/edit" element={<ProjectFormPage />} />

            {/* 영업 관리 — 상담 이력 (읽기 전용 목록 · 상세). 감사 성격이라 조회만 한다.
              유형·후속조치 대기 필터 + 검색, 상세는 상담 내용·후속조치를 읽기 전용으로 보여준다. */}
            <Route path="/sales/consultations" element={<ConsultationListPage />} />
            <Route path="/sales/consultations/:id" element={<ConsultationDetailPage />} />

            {/* 고객센터 — 1:1 문의 (읽기 전용 목록 · 상세 처리). 문의는 고객 채널이 만들고 관리자는
              타임라인·답변·상태·담당만 처리한다(SLA 임박/초과 배지·상태 전이 차단·답변 템플릿 삽입).
              상세 라우트만 두고 등록/삭제는 없다. */}
            <Route path="/support/tickets" element={<TicketListPage />} />
            <Route path="/support/tickets/:id" element={<TicketDetailPage />} />

            {/* 고객센터 — 문의 유형 (목록 · 추가/수정 모달 · 삭제팝업, 사용 중 차단 · 사용여부 소프트 비활성). */}
            <Route path="/support/categories" element={<CategoriesPage />} />

            {/* 고객센터 — 문의 답변(템플릿) (목록 · 등록 · 수정). 자주 쓰는 답변을 티켓 답변에 삽입한다.
              '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). */}
            <Route path="/support/replies" element={<RepliesPage />} />
            <Route path="/support/replies/new" element={<ReplyFormPage />} />
            <Route path="/support/replies/:id/edit" element={<ReplyFormPage />} />

            {/* 고객센터 — 자주 묻는 질문 (고객노출 FAQ 큐레이션: 표시 순서 DnD·노출·BEST 고정).
              작성/수정/삭제·카테고리는 콘텐츠 관리 FAQ 소관이라 여기엔 폼이 없다(역할 차별화). */}
            <Route path="/support/faq" element={<CustomerFaqPage />} />

            {/* 고객센터 — 자료실 (목록 · 등록 · 수정). 카테고리·버전·다운로드수·노출 + 파일 업로드.
              목록엔 이미지 열을 넣지 않는다. '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). */}
            <Route path="/support/downloads" element={<DownloadListPage />} />
            <Route path="/support/downloads/new" element={<DownloadFormPage />} />
            <Route path="/support/downloads/:id/edit" element={<DownloadFormPage />} />

            {/* 마케팅 관리 — 이벤트·프로모션 (목록 · 등록 · 수정 · 삭제팝업). 기간·대상·혜택·상태(예정/
              진행/종료). 등록/수정은 하나의 폼(:id 유무로 갈린다). '/new' 는 '/:id/edit' 보다 먼저 온다. */}
            <Route path="/marketing/events" element={<EventListPage />} />
            <Route path="/marketing/events/new" element={<EventFormPage />} />
            <Route path="/marketing/events/:id/edit" element={<EventFormPage />} />
            <Route path="/marketing/promotions" element={<PromotionListPage />} />
            <Route path="/marketing/promotions/new" element={<PromotionFormPage />} />
            <Route path="/marketing/promotions/:id/edit" element={<PromotionFormPage />} />

            {/* 마케팅 관리 — 뉴스레터 (발송회차 목록 오픈율/클릭율 · 등록 · 수정). 회차번호 자동 채번,
              구독자 세그먼트·예약·이메일 미리보기. 저장은 발송이 아니다(// TODO(backend) 발송 트리거). */}
            <Route path="/marketing/newsletters" element={<NewsletterListPage />} />
            <Route path="/marketing/newsletters/new" element={<NewsletterFormPage />} />
            <Route path="/marketing/newsletters/:id/edit" element={<NewsletterFormPage />} />

            {/* 마케팅 관리 — SMS/이메일 발송 (목록 · 등록 · 수정). 수신자 세그먼트·발신번호/발신자·바이트
              카운터(SMS/LMS/MMS)·야간발송 차단·수신거부·예약 + 미리보기(휴대폰 말풍선/이메일).
              발송은 실제 전송이 아니다 — 캠페인(초안/예약)만 저장한다(// TODO(backend) 발송 트리거). */}
            <Route path="/marketing/sms" element={<SmsListPage />} />
            <Route path="/marketing/sms/new" element={<SmsFormPage />} />
            <Route path="/marketing/sms/:id/edit" element={<SmsFormPage />} />
            <Route path="/marketing/email" element={<EmailListPage />} />
            <Route path="/marketing/email/new" element={<EmailFormPage />} />
            <Route path="/marketing/email/:id/edit" element={<EmailFormPage />} />

            {/* 마케팅 관리 — 발송 템플릿 (목록 · 등록 · 수정). SMS/이메일/알림톡 채널별 문구, 치환변수,
              알림톡 승인상태(검수중/승인/반려). 발송 화면이 승인된 템플릿을 삽입한다. */}
            <Route path="/marketing/templates" element={<TemplateListPage />} />
            <Route path="/marketing/templates/new" element={<TemplateFormPage />} />
            <Route path="/marketing/templates/:id/edit" element={<TemplateFormPage />} />

            {/* 예약/신청 관리 — 예약 (목록 · 등록 · 수정). 등록/수정은 하나의 폼(:id 유무로 갈린다).
              같은 자원에 시간이 겹치는 더블부킹·과거 일시는 폼에서 경고한다(비차단). 정원 초과·예약금
              음수·시간 역전은 검증으로 차단한다. '/new' 는 '/:id/edit' 보다 먼저 온다(정적 경로 우선). */}
            <Route path="/reservations" element={<ReservationListPage />} />
            <Route path="/reservations/new" element={<ReservationFormPage />} />

            {/* 예약/신청 관리 — 신청서 (읽기 전용 목록 · 상세 처리). 신청은 고객 채널이 만들고 관리자는
              상태 전이(허용 전이만) + 메모 + 처리 이력 타임라인으로 처리한다. 등록/삭제는 없다. */}
            <Route path="/reservations/applications" element={<ApplicationListPage />} />
            <Route path="/reservations/applications/:id" element={<ApplicationDetailPage />} />

            {/* 예약/신청 관리 — 상담 예약 (목록 · 등록 · 수정 · 삭제팝업). 상담유형·희망일시·담당·상태.
              상태는 전이 규칙이 허용하는 후보로만 좁힌다. '/new' 는 '/:id/edit' 보다 먼저 온다. */}
            <Route path="/reservations/consultations" element={<ConsultationBookingListPage />} />
            <Route
              path="/reservations/consultations/new"
              element={<ConsultationBookingFormPage />}
            />
            <Route
              path="/reservations/consultations/:id/edit"
              element={<ConsultationBookingFormPage />}
            />

            {/* 예약/신청 관리 — 예약 일정 (라이브러리 없이 직접 만든 일/주 캘린더). 시간 슬롯별 예약·
              가용량·마감을 격자로 보여주고, 슬롯 클릭 → 해당 예약. 예약 화면과 같은 어댑터를 읽는다. */}
            <Route path="/reservations/schedule" element={<ScheduleCalendarPage />} />

            {/* 예약 수정 폼 — 정적 하위 경로(applications·consultations·schedule) 뒤에 둔다(:id 최후) */}
            <Route path="/reservations/:id/edit" element={<ReservationFormPage />} />

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
