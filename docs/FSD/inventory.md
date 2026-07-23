# 전수 인벤토리 — 명세를 써야 하는 것 전부

**이 문서가 대상 목록의 정본이다.** 코드에서 직접 뽑았다 — 추측한 항목은 없고, 확인하지 못한 것은 §10 에 적었다.

| 뽑은 원천 | 무엇을 얻었나 |
|---|---|
| `apps/admin/src/shared/layout/nav-config.ts` | 사이드바 잎 74 · 최상위 항목 15 |
| `apps/admin/src/App.tsx` | 라우트 160(잎 74 · 비잎 80 · 리다이렉트 6) + 셸 밖 로그인 1 |
| `apps/admin/src/**/*.tsx` (`<Modal` 렌더 지점) | 팝업 19 |
| `apps/admin/src/**/*.tsx` (`<ConfirmDialog` 렌더 지점) | 확인 다이얼로그 56 |
| `apps/admin/src/**/*.{ts,tsx}` (`toast.*` 호출) | 안내 토스트 154 |
| `apps/admin/src/**/*.tsx` (`<Tabs` 렌더 지점) | 탭 7묶음 |

검증: `pnpm nav:check` 가 아는 화면 수와 잎 74가 **일치**한다.

---

## 1. 총계

| 종류 | 건수 | 문서가 되는가 |
|---|---|---|
| **잎 화면** (사이드바 메뉴) | **74** | 각각 `index.md` |
| **로그인** (셸 밖) | **1** | `login/index.md` |
| **상세 화면** (`/:id`) | **21** | 각각 `detail.md` |
| **등록·수정 화면** (`/new` + `/:id/edit`) | **29** | 각각 `form.md` (두 라우트가 한 화면) |
| **보조 목록** (잎이 아닌 정적 라우트) | **1** | `issuance.md` |
| **탭** (다른 자료를 보는 것) | **9** | 각각 `tab-*.md` |
| **팝업(모달)** | **19** | 화면 전용 16 → `pop-*.md` · 공유 3 → `_common/` |
| 확인 다이얼로그 | 56 (공통 5 · 화면 51) | 문서 아님 — 부모의 §5·§7·§10 |
| 안내 토스트 | 154 (공통 6 · 화면 148) | 문서 아님 — 부모의 §4 성공/실패 처리 |
| 리다이렉트 라우트 | 6 | 문서 아님 — 도착 화면의 §1 관련 화면 |

**기능 명세서 문서 수 = 74 + 1 + 21 + 29 + 1 + 9 + 19 = 154건**
**비기능 명세서 문서 수 = 76건** (잎 74 + 로그인 1 + 쿠폰 발급 현황 1) + 공통 1

라우트 검산: 74(잎) + 80(비잎) + 6(리다이렉트) = **160** = `App.tsx` 의 `APP_ROUTES` 실제 등록 수.
비잎 80개는 화면 51개로 접힌다(상세 21 · 폼 29×2라우트=58 · 보조 목록 1).

---

## 2. 폴더 — 최상위 15 + 로그인

`nav-config.ts` 의 최상위 항목과 1:1 이다. 폴더 이름은 경로 세그먼트다.

| 폴더 | 메뉴명 | 잎 | 비고 |
|---|---|---|---|
| `login` | 로그인 | — | 셸(사이드바) 밖의 단독 화면 |
| `dashboard` | 대시보드 | 1 | 가지가 아니라 최상위 잎이다 |
| `users` | 사용자 관리 | 6 | |
| `content` | 콘텐츠 관리 | 7 | |
| `company` | 기업 관리 | 9 | |
| `orders` | 주문 관리 | 3 | |
| `products` | 상품 관리 | 7 | 문의 1건은 조건부 노출 |
| `programs` | 프로그램 관리 | 3 | 문의 1건은 조건부 노출 |
| `support` | 고객센터 | 5 | |
| `marketing` | 마케팅 관리 | 6 | |
| `sales` | 영업 관리 | 6 | |
| `portfolio` | 포트폴리오 관리 | 3 | |
| `ai` | AI 에이전트 | 2 | |
| `stats` | 통계 | 6 | |
| `logs` | 로그 관리 | 4 | |
| `settings` | 시스템 설정 | 6 | |

**조건부 노출 잎 2개** — `/products/inquiries` · `/programs/inquiries` 는 결제(PG)를 쓰지 않는 동안에만 보인다.
잔여 문의가 있으면 `· 읽기 전용` 꼬리표를 달고 남는다(`nav-config.ts` `resolveNavLeaf`).
**메뉴에서 사라져도 라우트는 살아 있다** — 명세는 그 사실을 함께 적어야 한다.

---

## 3. 잎 화면 74

| 화면 ID | 화면명 | 라우트 | 구현 |
|---|---|---|---|
| `SCR-DASHBOARD` | 대시보드 | `/dashboard` | `apps/admin/src/pages/dashboard/DashboardPage` |
| `SCR-USERS-ROLES` | 권한 관리 | `/users/roles` | `apps/admin/src/pages/permissions/PermissionsPage` |
| `SCR-USERS-MEMBERS` | 회원 관리 | `/users/members` | `apps/admin/src/pages/members/MembersPage` |
| `SCR-USERS-SETTINGS` | 고객 설정 | `/users/settings` | `apps/admin/src/pages/customer-settings/CustomerSettingsPage` |
| `SCR-USERS-ADMINS` | 관리자 관리 | `/users/admins` | `apps/admin/src/pages/admins/AdminsPage` |
| `SCR-USERS-LOGIN-HISTORY` | 로그인 이력 | `/users/login-history` | `apps/admin/src/pages/login-history/LoginHistoryPage` |
| `SCR-USERS-CONSENTS` | 동의 이력 | `/users/consents` | `apps/admin/src/pages/users/consents/ConsentsPage` |
| `SCR-CONTENT-NEWS` | 뉴스·보도자료 | `/content/news` | `apps/admin/src/pages/content/news/NewsPage` |
| `SCR-CONTENT-NOTICES` | 공지사항 | `/content/notices` | `apps/admin/src/pages/content/notices/NoticesPage` |
| `SCR-CONTENT-FAQ` | FAQ | `/content/faq` | `apps/admin/src/pages/content/faq/FaqPage` |
| `SCR-CONTENT-POPUPS` | 팝업 관리 | `/content/popups` | `apps/admin/src/pages/content/popups/PopupsPage` |
| `SCR-CONTENT-BANNERS` | 배너 관리 | `/content/banners` | `apps/admin/src/pages/content/banners/BannersPage` |
| `SCR-CONTENT-TERMS` | 약관 관리 | `/content/terms` | `apps/admin/src/pages/content/terms/TermsPage` |
| `SCR-CONTENT-PRIVACY` | 개인정보 처리방침 | `/content/privacy` | `apps/admin/src/pages/content/privacy/PrivacyPage` |
| `SCR-COMPANY-PROFILE` | 회사 정보 | `/company/profile` | `apps/admin/src/pages/company/profile/CompanyProfilePage` |
| `SCR-COMPANY-CEO-MESSAGE` | CEO 인사말 | `/company/ceo-message` | `apps/admin/src/pages/company/ceo-message/CeoMessagePage` |
| `SCR-COMPANY-HISTORY` | 연혁 | `/company/history` | `apps/admin/src/pages/company/history/HistoryListPage` |
| `SCR-COMPANY-DIRECTIONS` | 오시는 길 | `/company/directions` | `apps/admin/src/pages/company/directions/DirectionsPage` |
| `SCR-COMPANY-CERTIFICATES` | 인증서/특허 | `/company/certificates` | `apps/admin/src/pages/company/certificates/CertificatesListPage` |
| `SCR-COMPANY-PARTNERS` | 파트너사 | `/company/partners` | `apps/admin/src/pages/company/partners/PartnersPage` → `company/logo-list/LogoListPage` |
| `SCR-COMPANY-CLIENTS` | 고객사 | `/company/clients` | `apps/admin/src/pages/company/clients/ClientsPage` → `company/logo-list/LogoListPage` |
| `SCR-COMPANY-ESG` | ESG | `/company/esg` | `apps/admin/src/pages/company/esg/EsgListPage` |
| `SCR-COMPANY-CAREERS` | 채용 공고 | `/company/careers` | `apps/admin/src/pages/company/careers/CareersListPage` |
| `SCR-ORDERS` | 주문 | `/orders` | `apps/admin/src/pages/orders/OrderListPage` |
| `SCR-ORDERS-SHIPMENTS` | 배송 처리 | `/orders/shipments` | `apps/admin/src/pages/orders/shipments/ShipmentListPage` |
| `SCR-ORDERS-CLAIMS` | 취소/교환/반품 | `/orders/claims` | `apps/admin/src/pages/orders/claims/ClaimsListPage` |
| `SCR-PRODUCTS` | 상품 | `/products` | `apps/admin/src/pages/products/items/ProductListPage` |
| `SCR-PRODUCTS-CATEGORIES` | 카테고리 | `/products/categories` | `apps/admin/src/pages/products/categories/ProductCategoriesPage` |
| `SCR-PRODUCTS-SHIPPING` | 배송 | `/products/shipping` | `apps/admin/src/pages/products/shipping/ShippingPolicyPage` |
| `SCR-PRODUCTS-COUPONS` | 쿠폰 | `/products/coupons` | `apps/admin/src/pages/products/coupons/CouponListPage` |
| `SCR-PRODUCTS-POINTS` | 적립금 | `/products/points` | `apps/admin/src/pages/products/points/PointsPolicyPage` |
| `SCR-PRODUCTS-REVIEWS` | 리뷰 | `/products/reviews` | `apps/admin/src/pages/products/reviews/ReviewListPage` |
| `SCR-PRODUCTS-INQUIRIES` | 문의 (조건부) | `/products/inquiries` | `apps/admin/src/pages/products/inquiries/ProductInquiryListPage` |
| `SCR-PROGRAMS` | 프로그램 | `/programs` | `apps/admin/src/pages/programs/ProgramListPage` |
| `SCR-PROGRAMS-CATEGORIES` | 카테고리 | `/programs/categories` | `apps/admin/src/pages/programs/categories/ProgramCategoriesPage` |
| `SCR-PROGRAMS-INQUIRIES` | 문의 (조건부) | `/programs/inquiries` | `apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage` |
| `SCR-SUPPORT-TICKETS` | 1:1 문의 | `/support/tickets` | `apps/admin/src/pages/support/tickets/TicketListPage` |
| `SCR-SUPPORT-CATEGORIES` | 문의 유형 | `/support/categories` | `apps/admin/src/pages/support/categories/CategoriesPage` |
| `SCR-SUPPORT-REPLIES` | 문의 답변 | `/support/replies` | `apps/admin/src/pages/support/replies/RepliesPage` |
| `SCR-SUPPORT-FAQ` | 자주 묻는 질문 | `/support/faq` | `apps/admin/src/pages/support/faq/CustomerFaqPage` |
| `SCR-SUPPORT-DOWNLOADS` | 자료실 | `/support/downloads` | `apps/admin/src/pages/support/downloads/DownloadListPage` |
| `SCR-MARKETING-EVENTS` | 이벤트 | `/marketing/events` | `apps/admin/src/pages/marketing/events/EventListPage` |
| `SCR-MARKETING-PROMOTIONS` | 프로모션 | `/marketing/promotions` | `apps/admin/src/pages/marketing/promotions/PromotionListPage` |
| `SCR-MARKETING-NEWSLETTERS` | 뉴스레터 | `/marketing/newsletters` | `apps/admin/src/pages/marketing/newsletters/NewsletterListPage` |
| `SCR-MARKETING-SMS` | SMS 발송 | `/marketing/sms` | `apps/admin/src/pages/marketing/sms/SmsListPage` |
| `SCR-MARKETING-EMAIL` | 이메일 발송 | `/marketing/email` | `apps/admin/src/pages/marketing/email/EmailListPage` |
| `SCR-MARKETING-TEMPLATES` | 발송 템플릿 관리 | `/marketing/templates` | `apps/admin/src/pages/marketing/message-templates/MessageTemplateListPage` |
| `SCR-SALES-ACCOUNTS` | 거래처 | `/sales/accounts` | `apps/admin/src/pages/sales/accounts/AccountListPage` |
| `SCR-SALES-CONTRACTS` | 계약 | `/sales/contracts` | `apps/admin/src/pages/sales/contracts/ContractListPage` |
| `SCR-SALES-QUOTES` | 견적 | `/sales/quotes` | `apps/admin/src/pages/sales/quotes/QuoteListPage` |
| `SCR-SALES-BILLING` | 청구·입금 | `/sales/billing` | `apps/admin/src/pages/sales/billing/BillingListPage` |
| `SCR-SALES-INQUIRIES` | 문의 | `/sales/inquiries` | `apps/admin/src/pages/sales/inquiries/InquiryListPage` |
| `SCR-SALES-PROJECTS` | 프로젝트 | `/sales/projects` | `apps/admin/src/pages/sales/projects/ProjectListPage` |
| `SCR-PORTFOLIO-ITEMS` | 포트폴리오 | `/portfolio/items` | `apps/admin/src/pages/portfolio/items/PortfolioListPage` |
| `SCR-PORTFOLIO-CATEGORIES` | 카테고리 | `/portfolio/categories` | `apps/admin/src/pages/portfolio/categories/PortfolioCategoriesPage` |
| `SCR-PORTFOLIO-CASE-STUDIES` | 성공 사례 | `/portfolio/case-studies` | `apps/admin/src/pages/portfolio/case-studies/CaseStudyListPage` |
| `SCR-AI-CHAT` | 새 채팅 | `/ai/chat` | `apps/admin/src/pages/ai/NewChatPage` |
| `SCR-AI-CONVERSATIONS` | 대화 목록 | `/ai/conversations` | `apps/admin/src/pages/ai/ConversationsPage` |
| `SCR-STATS-VISITORS` | 방문자 통계 | `/stats/visitors` | `apps/admin/src/pages/stats/visitors/VisitorStatsPage` |
| `SCR-STATS-MEMBERS` | 회원 통계 | `/stats/members` | `apps/admin/src/pages/stats/members/MemberStatsPage` |
| `SCR-STATS-REVENUE` | 매출 통계 | `/stats/revenue` | `apps/admin/src/pages/stats/revenue/RevenueStatsPage` |
| `SCR-STATS-ORDERS` | 주문 통계 | `/stats/orders` | `apps/admin/src/pages/stats/orders/OrderStatsPage` |
| `SCR-STATS-TRAFFIC` | 유입 분석 | `/stats/traffic` | `apps/admin/src/pages/stats/traffic/TrafficStatsPage` |
| `SCR-STATS-KEYWORDS` | 검색어 분석 | `/stats/keywords` | `apps/admin/src/pages/stats/keywords/KeywordStatsPage` |
| `SCR-LOGS-ADMIN` | 관리자 로그 | `/logs/admin` | `apps/admin/src/pages/logs/admin/AdminLogPage` |
| `SCR-LOGS-MEMBER-ACTIVITY` | 회원 활동 로그 | `/logs/member-activity` | `apps/admin/src/pages/logs/member-activity/MemberActivityPage` |
| `SCR-LOGS-API` | API 로그 | `/logs/api` | `apps/admin/src/pages/logs/api/ApiLogPage` |
| `SCR-LOGS-ERRORS` | 오류 로그 | `/logs/errors` | `apps/admin/src/pages/logs/errors/ErrorLogPage` |
| `SCR-SETTINGS-SITE` | 사이트 설정 | `/settings/site` | `apps/admin/src/pages/settings/site/SiteSettingsPage` |
| `SCR-SETTINGS-API-KEYS` | API Key 설정 | `/settings/api-keys` | `apps/admin/src/pages/settings/api-keys/ApiKeysPage` |
| `SCR-SETTINGS-OAUTH` | OAuth 설정 | `/settings/oauth` | `apps/admin/src/pages/settings/oauth/OAuthPage` |
| `SCR-SETTINGS-PAYMENT` | 결제 설정 | `/settings/payment` | `apps/admin/src/pages/settings/payment/PaymentSettingsPage` |
| `SCR-SETTINGS-PLAN` | 플랜·이용 현황 | `/settings/plan` | `apps/admin/src/pages/settings/plan/PlanPage` |
| `SCR-SETTINGS-NOTIFICATIONS` | 알림 설정 | `/settings/notifications` | `apps/admin/src/pages/settings/notifications/NotificationSettingsPage` |

**셸 밖 화면 1**

| 화면 ID | 화면명 | 라우트 | 구현 |
|---|---|---|---|
| `SCR-LOGIN` | 로그인 | `/login` | `apps/admin/src/pages/login/LoginPage` |

> `PlaceholderPage`(준비 중 화면)는 **지금 도달할 수 없다** — 잎 74개가 전부 구현돼 있어
> `App.tsx` 의 `pendingRoutes` 가 0건이다. 명세 대상이 아니다.

---

## 4. 상세 화면 21

| 화면 ID | 라우트 | 구현 |
|---|---|---|
| `SCR-USERS-MEMBERS-DETAIL` | `/users/members/:id` | `apps/admin/src/pages/members/MemberDetailPage` |
| `SCR-USERS-ADMINS-DETAIL` | `/users/admins/:id` | `apps/admin/src/pages/admins/AdminDetailPage` |
| `SCR-CONTENT-NOTICES-DETAIL` | `/content/notices/:id` | `apps/admin/src/pages/content/notices/NoticeDetailPage` |
| `SCR-CONTENT-FAQ-DETAIL` | `/content/faq/:id` | `apps/admin/src/pages/content/faq/FaqDetailPage` |
| `SCR-CONTENT-TERMS-DETAIL` | `/content/terms/:id` | `apps/admin/src/pages/content/terms/TermsDetailPage` |
| `SCR-CONTENT-PRIVACY-DETAIL` | `/content/privacy/:id` | `apps/admin/src/pages/content/privacy/PrivacyDetailPage` |
| `SCR-ORDERS-DETAIL` | `/orders/:id` | `apps/admin/src/pages/orders/OrderDetailPage` |
| `SCR-ORDERS-CLAIMS-DETAIL` | `/orders/claims/:id` | `apps/admin/src/pages/orders/claims/ClaimDetailPage` |
| `SCR-PRODUCTS-REVIEWS-DETAIL` | `/products/reviews/:id` | `apps/admin/src/pages/products/reviews/ReviewDetailPage` |
| `SCR-PRODUCTS-INQUIRIES-DETAIL` | `/products/inquiries/:id` | `apps/admin/src/pages/products/inquiries/ProductInquiryDetailPage` |
| `SCR-PROGRAMS-DETAIL` | `/programs/:id` | `apps/admin/src/pages/programs/ProgramDetailPage` |
| `SCR-PROGRAMS-INQUIRIES-DETAIL` | `/programs/inquiries/:id` | `apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage` |
| `SCR-SUPPORT-TICKETS-DETAIL` | `/support/tickets/:id` | `apps/admin/src/pages/support/tickets/TicketDetailPage` |
| `SCR-MARKETING-TEMPLATES-DETAIL` | `/marketing/templates/:id` | `apps/admin/src/pages/marketing/message-templates/MessageTemplateDetailPage` |
| `SCR-SALES-ACCOUNTS-DETAIL` | `/sales/accounts/:id` | `apps/admin/src/pages/sales/accounts/AccountDetailPage` |
| `SCR-SALES-QUOTES-DETAIL` | `/sales/quotes/:id` | `apps/admin/src/pages/sales/quotes/QuoteDetailPage` |
| `SCR-SALES-BILLING-DETAIL` | `/sales/billing/:id` | `apps/admin/src/pages/sales/billing/BillingDetailPage` |
| `SCR-SALES-INQUIRIES-DETAIL` | `/sales/inquiries/:id` | `apps/admin/src/pages/sales/inquiries/InquiryDetailPage` |
| `SCR-SETTINGS-API-KEYS-DETAIL` | `/settings/api-keys/:providerId` | `apps/admin/src/pages/settings/api-keys/AiConnectionPage` |
| `SCR-SETTINGS-OAUTH-DETAIL` | `/settings/oauth/:provider` | `apps/admin/src/pages/settings/oauth/OAuthProviderPage` |
| `SCR-SETTINGS-PAYMENT-DETAIL` | `/settings/payment/:target` | `apps/admin/src/pages/settings/payment/PgProviderPage` |

---

## 5. 등록·수정 화면 29

**두 라우트가 한 화면이다** — 같은 컴포넌트가 `:id` 유무로 등록/수정을 겸한다.

| 화면 ID | 라우트 | 구현 |
|---|---|---|
| `SCR-USERS-ADMINS-FORM` | `/users/admins/new` · `/users/admins/:id/edit` | `apps/admin/src/pages/admins/AdminFormPage` |
| `SCR-CONTENT-NOTICES-FORM` | `/content/notices/new` · `/content/notices/:id/edit` | `apps/admin/src/pages/content/notices/NoticeFormPage` |
| `SCR-CONTENT-FAQ-FORM` | `/content/faq/new` · `/content/faq/:id/edit` | `apps/admin/src/pages/content/faq/FaqFormPage` |
| `SCR-CONTENT-POPUPS-FORM` | `/content/popups/new` · `/content/popups/:id/edit` | `apps/admin/src/pages/content/popups/PopupFormPage` |
| `SCR-CONTENT-BANNERS-FORM` | `/content/banners/new` · `/content/banners/:id/edit` | `apps/admin/src/pages/content/banners/BannerFormPage` |
| `SCR-CONTENT-TERMS-FORM` | `/content/terms/new` · `/content/terms/:id/edit` | `apps/admin/src/pages/content/terms/TermsFormPage` |
| `SCR-CONTENT-PRIVACY-FORM` | `/content/privacy/new` · `/content/privacy/:id/edit` | `apps/admin/src/pages/content/privacy/PrivacyFormPage` |
| `SCR-CONTENT-NEWS-FORM` | `/content/news/new` · `/content/news/:id/edit` | `apps/admin/src/pages/content/news/NewsFormPage` |
| `SCR-COMPANY-HISTORY-FORM` | `/company/history/new` · `/company/history/:id/edit` | `apps/admin/src/pages/company/history/HistoryFormPage` |
| `SCR-COMPANY-CERTIFICATES-FORM` | `/company/certificates/new` · `/company/certificates/:id/edit` | `apps/admin/src/pages/company/certificates/CertificatesFormPage` |
| `SCR-COMPANY-ESG-FORM` | `/company/esg/new` · `/company/esg/:id/edit` | `apps/admin/src/pages/company/esg/EsgFormPage` |
| `SCR-COMPANY-CAREERS-FORM` | `/company/careers/new` · `/company/careers/:id/edit` | `apps/admin/src/pages/company/careers/CareersFormPage` |
| `SCR-PORTFOLIO-ITEMS-FORM` | `/portfolio/items/new` · `/portfolio/items/:id/edit` | `apps/admin/src/pages/portfolio/items/PortfolioFormPage` |
| `SCR-PORTFOLIO-CASE-STUDIES-FORM` | `/portfolio/case-studies/new` · `/portfolio/case-studies/:id/edit` | `apps/admin/src/pages/portfolio/case-studies/CaseStudyFormPage` |
| `SCR-PRODUCTS-FORM` | `/products/new` · `/products/:id/edit` | `apps/admin/src/pages/products/items/ProductFormPage` |
| `SCR-PRODUCTS-COUPONS-FORM` | `/products/coupons/new` · `/products/coupons/:id/edit` | `apps/admin/src/pages/products/coupons/CouponFormPage` |
| `SCR-PROGRAMS-FORM` | `/programs/new` · `/programs/:id/edit` | `apps/admin/src/pages/programs/ProgramFormPage` |
| `SCR-SALES-ACCOUNTS-FORM` | `/sales/accounts/new` · `/sales/accounts/:id/edit` | `apps/admin/src/pages/sales/accounts/AccountFormPage` |
| `SCR-SALES-CONTRACTS-FORM` | `/sales/contracts/new` · `/sales/contracts/:id/edit` | `apps/admin/src/pages/sales/contracts/ContractFormPage` |
| `SCR-SALES-QUOTES-FORM` | `/sales/quotes/new` · `/sales/quotes/:id/edit` | `apps/admin/src/pages/sales/quotes/QuoteFormPage` |
| `SCR-SALES-PROJECTS-FORM` | `/sales/projects/new` · `/sales/projects/:id/edit` | `apps/admin/src/pages/sales/projects/ProjectFormPage` |
| `SCR-SUPPORT-REPLIES-FORM` | `/support/replies/new` · `/support/replies/:id/edit` | `apps/admin/src/pages/support/replies/ReplyFormPage` |
| `SCR-SUPPORT-DOWNLOADS-FORM` | `/support/downloads/new` · `/support/downloads/:id/edit` | `apps/admin/src/pages/support/downloads/DownloadFormPage` |
| `SCR-MARKETING-EVENTS-FORM` | `/marketing/events/new` · `/marketing/events/:id/edit` | `apps/admin/src/pages/marketing/events/EventFormPage` |
| `SCR-MARKETING-PROMOTIONS-FORM` | `/marketing/promotions/new` · `/marketing/promotions/:id/edit` | `apps/admin/src/pages/marketing/promotions/PromotionFormPage` |
| `SCR-MARKETING-NEWSLETTERS-FORM` | `/marketing/newsletters/new` · `/marketing/newsletters/:id/edit` | `apps/admin/src/pages/marketing/newsletters/NewsletterFormPage` |
| `SCR-MARKETING-SMS-FORM` | `/marketing/sms/new` · `/marketing/sms/:id/edit` | `apps/admin/src/pages/marketing/sms/SmsFormPage` |
| `SCR-MARKETING-EMAIL-FORM` | `/marketing/email/new` · `/marketing/email/:id/edit` | `apps/admin/src/pages/marketing/email/EmailFormPage` |
| `SCR-MARKETING-TEMPLATES-FORM` | `/marketing/templates/new` · `/marketing/templates/:id/edit` | `apps/admin/src/pages/marketing/message-templates/MessageTemplateEditorPage` |

**보조 목록 1**

| 화면 ID | 라우트 | 구현 | 비고 |
|---|---|---|---|
| `SCR-PRODUCTS-COUPONS-ISSUANCE` | `/products/coupons/issuance` | `apps/admin/src/pages/products/coupons/CouponIssuanceListPage` | 사이드바에 없다. 권한은 잎 `/products/coupons` 가 덮는다 |

**리다이렉트 6** — 문서를 갖지 않고 도착 화면의 §1 관련 화면에 적는다.

| 옛 경로 | 도착 |
|---|---|
| `/products/returns` · `/products/returns/*` | `SCR-ORDERS-CLAIMS` |
| `/marketing/templates/alimtalk` · `/marketing/templates/alimtalk/*` | `SCR-MARKETING-TEMPLATES` |
| `/marketing/message-templates` · `/marketing/message-templates/*` | `SCR-MARKETING-TEMPLATES` |

---

## 6. 탭 — 라우트가 바뀌지 않는 화면 상태

`<Tabs>` 렌더 지점은 7곳이다. 그중 **문서가 되는 탭은 9개**(3묶음)이고 나머지는 필터·모드 전환이라 부모의 §3 컴포넌트다.

| 화면 ID | 탭 | 부모 | 상태가 어디 실리는가 | 구현 |
|---|---|---|---|---|
| `TAB-SETTINGS-PLAN-USAGE` | 이용현황 | `SCR-SETTINGS-PLAN` | `?tab=`(기본값은 URL 에 쓰지 않는다) | `apps/admin/src/pages/settings/plan/tabs.ts` · `PlanPage.tsx:128` |
| `TAB-SETTINGS-PLAN-BILLING` | 결제 | 〃 | 〃 | 〃 |
| `TAB-SETTINGS-PLAN-HISTORY` | 결제내역 | 〃 | 〃 | 〃 |
| `TAB-USERS-CONSENTS-ITEMS` | 동의 항목 | `SCR-USERS-CONSENTS` | **컴포넌트 상태**(URL 아님) | `apps/admin/src/pages/users/consents/ConsentsPage.tsx:41-47,143` |
| `TAB-USERS-CONSENTS-HISTORY` | 동의 이력 | 〃 | 〃 | 〃 |
| `TAB-USERS-CONSENTS-COMPLIANCE` | 재동의 · 파기 | 〃 | 〃 | 〃 |
| `TAB-DASHBOARD-PRODUCTS` | 상품 | `SCR-DASHBOARD` | 컴포넌트 상태 · **권한으로 걸러진다** | `apps/admin/src/pages/dashboard/types.ts:18-24` · `useDashboardTabs.ts` |
| `TAB-DASHBOARD-INQUIRIES` | 문의 | 〃 | 〃 | 〃 |
| `TAB-DASHBOARD-SALES` | 영업 | 〃 | 〃 | 〃 |

**문서가 되지 않는 `<Tabs>` 4곳** — 부모 화면의 §3 UI 컴포넌트로 적는다.

| 위치 | 무엇인가 | 왜 화면이 아닌가 |
|---|---|---|
| `apps/admin/src/pages/settings/api-keys/components/IntegrationsCard.tsx:212` | 연동 분류·상태 필터 | 같은 목록을 거른다 |
| `apps/admin/src/pages/admins/components/AdminsToolbar.tsx:32` | `ADMIN_TABS` | **탭이 한 개뿐이다**(`운영진 목록`) — 축이 성립하지 않는다. §10 미결 참조 |
| `apps/admin/src/pages/marketing/message-templates/email/EmailToolbar.tsx:160` | 편집 / 미리보기 | 같은 편집기의 모드 전환 |
| `apps/admin/src/pages/marketing/message-templates/email/EmailBuilder.tsx:367` | STYLE / INSPECT 패널 | 같은 편집기의 패널 전환 |

**탭이 아닌 URL 상태** — 부모 §3·§8 에 적는다.

| 축 | 어디에 | 근거 |
|---|---|---|
| 목록 필터·검색어·페이지·정렬 | 전 목록 화면의 쿼리스트링 | `apps/admin/src/shared/crud/useListState.ts` |
| AI 채팅의 열린 대화 | `?c=` | `apps/admin/src/pages/ai/NewChatPage.tsx` |
| 통계 조회 조건(preset·start·end·compare·segment·view·metric) | 쿼리스트링 | `apps/admin/src/pages/stats/_shared/useStatsParams.ts` |
| 템플릿 등록 종류 | `?kind=text\|email\|alimtalk` | `App.tsx` 의 `/marketing/templates/new` 주석 |

---

## 7. 팝업(모달) 19

### 7.1 화면 전용 팝업 16 — `pop-*.md`

| 화면 ID | 팝업명 | 부모 화면 | 구현 |
|---|---|---|---|
| `POP-USERS-MEMBERS-CREATE-GROUP` | 그룹 만들기 | `SCR-USERS-MEMBERS` | `apps/admin/src/pages/members/components/CreateGroupModal.tsx` |
| `POP-USERS-MEMBERS-PASSWORD-CHANGE` | 비밀번호 변경 | `SCR-USERS-MEMBERS-DETAIL` | `apps/admin/src/pages/members/components/PasswordChangeModal.tsx` |
| `POP-USERS-ADMINS-CREATE-GROUP` | 운영진 그룹 만들기 | `SCR-USERS-ADMINS` | `apps/admin/src/pages/admins/components/CreateAdminGroupModal.tsx` |
| `POP-USERS-ROLES-ROLE-FORM` | 역할 추가·수정 | `SCR-USERS-ROLES` | `apps/admin/src/pages/permissions/components/RoleFormModal.tsx` |
| `POP-USERS-SETTINGS-TIER-FORM` | 등급 추가·수정 | `SCR-USERS-SETTINGS` | `apps/admin/src/pages/customer-settings/components/TierFormModal.tsx` |
| `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | FAQ 분류 관리 | `SCR-CONTENT-FAQ` | `apps/admin/src/pages/content/faq/components/ManageFaqCategoriesModal.tsx` |
| `POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH` | 주소 검색 | `SCR-COMPANY-DIRECTIONS` | `apps/admin/src/pages/company/directions/AddressSearchModal.tsx` |
| `POP-ORDERS-DETAIL-CANCEL` | 주문 취소 | `SCR-ORDERS-DETAIL` | `apps/admin/src/pages/orders/OrderDetailPage.tsx:575` (인라인) |
| `POP-ORDERS-SHIPMENTS-INVOICE-BULK` | 송장 일괄 등록 | `SCR-ORDERS-SHIPMENTS` | `apps/admin/src/pages/orders/shipments/components/InvoiceBulkDialog.tsx` |
| `POP-PRODUCTS-CATEGORIES-CATEGORY-FORM` | 카테고리 추가·수정 | `SCR-PRODUCTS-CATEGORIES` | `apps/admin/src/pages/products/categories/components/ProductCategoryFormModal.tsx` |
| `POP-PRODUCTS-SHIPPING-CARRIER-FORM` | 택배사 추가·수정 | `SCR-PRODUCTS-SHIPPING` | `apps/admin/src/pages/products/shipping/components/CarrierFormModal.tsx` |
| `POP-PROGRAMS-CATEGORIES-CATEGORY-FORM` | 카테고리 추가·수정 | `SCR-PROGRAMS-CATEGORIES` | `apps/admin/src/pages/programs/categories/components/ProgramCategoryFormModal.tsx` |
| `POP-PORTFOLIO-CATEGORIES-CATEGORY-FORM` | 카테고리 추가·수정 | `SCR-PORTFOLIO-CATEGORIES` | `apps/admin/src/pages/portfolio/categories/components/PortfolioCategoryFormModal.tsx` |
| `POP-SUPPORT-CATEGORIES-CATEGORY-FORM` | 문의 유형 추가·수정 | `SCR-SUPPORT-CATEGORIES` | `apps/admin/src/pages/support/categories/components/CategoryFormModal.tsx` |
| `POP-MARKETING-TEMPLATES-NEW-KIND` | 템플릿 종류 고르기 | `SCR-MARKETING-TEMPLATES` | `apps/admin/src/pages/marketing/message-templates/components/NewTemplateKindDialog.tsx` |
| `POP-MARKETING-TEMPLATES-FORM-BLOCK-PICKER` | 이메일 블록 고르기 | `SCR-MARKETING-TEMPLATES-FORM` | `apps/admin/src/pages/marketing/message-templates/email/BlockPicker.tsx` |

### 7.2 여러 화면이 공유하는 팝업 3 — `_common/`

| 화면 ID | 팝업명 | 어느 화면이 쓰는가 | 구현 |
|---|---|---|---|
| `POP-COMMON-LOGO-FORM` | 로고 등록·수정 | `SCR-COMPANY-PARTNERS` · `SCR-COMPANY-CLIENTS` (같은 `LogoListPage` 를 공유한다) | `apps/admin/src/pages/company/logo-list/LogoFormModal.tsx` |
| `POP-COMMON-LOG-PAYLOAD` | 로그 원문 보기 | 로그 4화면 전부 | `apps/admin/src/pages/logs/components/LogPayloadDialog.tsx` |
| `POP-COMMON-SETTINGS-CONFLICT` | 저장 충돌 (설정) | `SCR-SETTINGS-SITE` · `SCR-SETTINGS-OAUTH`(+상세) · `SCR-SETTINGS-PAYMENT`(+상세) · `SCR-SETTINGS-API-KEYS-DETAIL` | `apps/admin/src/pages/settings/_shared/ConflictDialog.tsx` |

---

## 8. 확인 다이얼로그 56 — 문서가 아니라 절

`<ConfirmDialog>` 렌더 지점 전수다. **부모 문서의 §5 이벤트 · §7 예외 처리 · §10 화면 이동(팝업 여부 `Y`)** 에 적는다.

### 8.1 공통 층 5 — `_common/` 에 한 번 적고 각 화면이 참조

| 이름 | 구현 | 어느 화면에 걸리는가 |
|---|---|---|
| 삭제 확인 (단건) | `apps/admin/src/shared/crud/useCrudList.tsx:215` | `CrudListShell` 을 쓰는 모든 목록 |
| 삭제 확인 (일괄) | `apps/admin/src/shared/crud/useCrudList.tsx:227` | 〃 |
| 저장되지 않은 변경 (페이지 이탈) | `apps/admin/src/shared/ui/useUnsavedChangesDialog.tsx:212` | 모든 폼 화면 |
| 저장되지 않은 변경 (모달 닫기) | `apps/admin/src/shared/ui/useModalDirtyGuard.tsx:76` | 입력을 가진 모든 팝업 |
| 저장 충돌 (폼) | `apps/admin/src/shared/crud/FormFeedback.tsx:63` — '다른 사용자가 먼저 변경했습니다' | 모든 폼 화면 |

### 8.2 화면 고유 51

| 부모 화면 | 제목 | 구현 |
|---|---|---|
| `SCR-USERS-ADMINS-DETAIL` | 운영자 삭제 | `pages/admins/AdminDetailPage.tsx:265` |
| `SCR-USERS-ADMINS` | 운영진 그룹 삭제 | `pages/admins/AdminsPage.tsx:412` |
| `POP-USERS-ADMINS-CREATE-GROUP` | 운영진 그룹 만들기 | `pages/admins/components/CreateAdminGroupModal.tsx:339` |
| `SCR-AI-CONVERSATIONS` | 대화를 삭제할까요? | `pages/ai/ConversationsPage.tsx:179` |
| `SCR-COMPANY-PARTNERS` · `SCR-COMPANY-CLIENTS` | 〈엔티티〉 삭제 | `pages/company/logo-list/LogoListPage.tsx:343` |
| 〃 | 〈엔티티〉 일괄 삭제 | `pages/company/logo-list/LogoListPage.tsx:356` |
| `SCR-CONTENT-BANNERS` | 배너 삭제 | `pages/content/banners/BannersPage.tsx:387` |
| `SCR-CONTENT-BANNERS` | 배너 일괄 삭제 | `pages/content/banners/BannersPage.tsx:400` |
| `POP-CONTENT-FAQ-MANAGE-CATEGORIES` | 카테고리 만들기 | `pages/content/faq/components/ManageFaqCategoriesModal.tsx:338` |
| 〃 | 카테고리 삭제 | `pages/content/faq/components/ManageFaqCategoriesModal.tsx:350` |
| `SCR-CONTENT-FAQ-DETAIL` | FAQ 삭제 | `pages/content/faq/FaqDetailPage.tsx:211` |
| `SCR-CONTENT-FAQ` | FAQ 삭제 | `pages/content/faq/FaqPage.tsx:446` |
| `SCR-CONTENT-FAQ` | FAQ 일괄 삭제 | `pages/content/faq/FaqPage.tsx:459` |
| `SCR-CONTENT-NOTICES-DETAIL` | 공지 삭제 | `pages/content/notices/NoticeDetailPage.tsx:226` |
| `SCR-CONTENT-NOTICES` | 공지 삭제 | `pages/content/notices/NoticesPage.tsx:314` |
| `SCR-CONTENT-NOTICES` | 공지 일괄 삭제 | `pages/content/notices/NoticesPage.tsx:327` |
| `SCR-CONTENT-POPUPS` | 팝업 삭제 | `pages/content/popups/PopupsPage.tsx:357` |
| `SCR-CONTENT-POPUPS` | 팝업 일괄 삭제 | `pages/content/popups/PopupsPage.tsx:370` |
| `SCR-CONTENT-PRIVACY-DETAIL` | 처리방침 버전 삭제 | `pages/content/privacy/PrivacyDetailPage.tsx:207` |
| `SCR-CONTENT-PRIVACY` | 처리방침 버전 삭제 | `pages/content/privacy/PrivacyPage.tsx:242` |
| `SCR-CONTENT-PRIVACY` | 처리방침 버전 일괄 삭제 | `pages/content/privacy/PrivacyPage.tsx:255` |
| `SCR-CONTENT-TERMS-DETAIL` | 약관 버전 삭제 | `pages/content/terms/TermsDetailPage.tsx:209` |
| `SCR-CONTENT-TERMS` | 약관 버전 삭제 | `pages/content/terms/TermsPage.tsx:321` |
| `SCR-CONTENT-TERMS` | 약관 버전 일괄 삭제 | `pages/content/terms/TermsPage.tsx:334` |
| `SCR-USERS-SETTINGS` | 등급 정책 저장 | `pages/customer-settings/CustomerSettingsPage.tsx:441` |
| `SCR-USERS-SETTINGS` | 등급 삭제 | `pages/customer-settings/useTierEditing.tsx:120` |
| `SCR-MARKETING-TEMPLATES-DETAIL` | 〈엔티티〉 삭제 | `pages/marketing/message-templates/MessageTemplateDetailPage.tsx:492` |
| `POP-USERS-MEMBERS-CREATE-GROUP` | 그룹 만들기 | `pages/members/components/CreateGroupModal.tsx:273` |
| `SCR-USERS-MEMBERS-DETAIL` | 적립금 내역 삭제 | `pages/members/components/PointsCard.tsx:390` |
| `SCR-USERS-MEMBERS-DETAIL` | 회원 삭제 | `pages/members/MemberDetailPage.tsx:311` |
| `SCR-USERS-MEMBERS` | 회원 삭제 | `pages/members/MembersPage.tsx:473` |
| `SCR-ORDERS-CLAIMS-DETAIL` | (동적 제목) | `pages/orders/claims/ClaimDetailPage.tsx:621` |
| `SCR-ORDERS-CLAIMS-DETAIL` | 환불 완료 처리 | `pages/orders/claims/ClaimDetailPage.tsx:638` |
| `SCR-ORDERS-DETAIL` | (동적 제목) | `pages/orders/OrderDetailPage.tsx:553` |
| `SCR-ORDERS` | 〈상태〉 일괄 처리 | `pages/orders/OrderListPage.tsx:379` |
| `SCR-ORDERS-SHIPMENTS` | 배송준비중 일괄 처리 | `pages/orders/shipments/ShipmentListPage.tsx:493` |
| `SCR-ORDERS-SHIPMENTS` | 발송처리 | `pages/orders/shipments/ShipmentListPage.tsx:524` |
| `SCR-USERS-ROLES` | 역할 삭제 | `pages/permissions/PermissionsPage.tsx:189` |
| `SCR-PORTFOLIO-CATEGORIES` | 카테고리 삭제 | `pages/portfolio/categories/PortfolioCategoriesPage.tsx:292` |
| `SCR-PRODUCTS-CATEGORIES` | 카테고리 삭제 | `pages/products/categories/ProductCategoriesPage.tsx:503` |
| `SCR-PRODUCTS-REVIEWS-DETAIL` | 리뷰 삭제 | `pages/products/reviews/ReviewDetailPage.tsx:307` |
| `SCR-PRODUCTS-SHIPPING` | 택배사 삭제 | `pages/products/shipping/components/CarrierSection.tsx:309` |
| `SCR-PROGRAMS-CATEGORIES` | 카테고리 삭제 | `pages/programs/categories/ProgramCategoriesPage.tsx:532` |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 〈이름〉 연동 저장 | `pages/settings/api-keys/AiConnectionPage.tsx:649` |
| `SCR-SETTINGS-OAUTH` | 로그인 버튼 순서 · 표시 정책 저장 | `pages/settings/oauth/OAuthPage.tsx:475` |
| `SCR-SETTINGS-OAUTH-DETAIL` | 〈제목〉 설정 저장 | `pages/settings/oauth/OAuthProviderPage.tsx:505` |
| `SCR-SETTINGS-PAYMENT` | 결제 설정 저장 | `pages/settings/payment/PaymentSettingsPage.tsx:519` |
| `SCR-SETTINGS-PAYMENT-DETAIL` | 〈라벨〉 연동 설정 저장 | `pages/settings/payment/PgProviderPage.tsx:853` |
| `SCR-SETTINGS-SITE` | 기본 설정 저장 | `pages/settings/site/SiteSettingsPage.tsx:642` |
| `SCR-SUPPORT-CATEGORIES` | 문의 유형 삭제 | `pages/support/categories/CategoriesPage.tsx:315` |
| `SCR-SUPPORT-TICKETS-DETAIL` | 문의 종결 | `pages/support/tickets/TicketDetailPage.tsx:240` |

> 경로는 전부 `apps/admin/src/` 아래다.
> **(동적 제목) 2건**은 상태에 따라 제목이 달라진다 — 명세를 쓸 때 **경우마다 한 행씩** 적어야 한다.

---

## 9. 안내 토스트 154 — 문서가 아니라 §4 의 성공/실패 처리

토스트는 화면이 아니라 **한 기능의 결과 통지**다. 그래서 별도 절을 만들지 않고
기능 명세서 §4 의 **성공 처리 · 실패 처리** 칸에 **문구 그대로** 적는다.
아래 건수는 **작성자가 대조할 체크섬**이다 — 문서에 적힌 토스트 수가 이 표보다 적으면 빠뜨린 것이다.

**종류 4** — `success`(4초 후 소멸) · `error`(**자동으로 사라지지 않는다** · retry 를 가질 수 있다) ·
`cancelled`(2초) · `info`(4초, 현재 사용처 0건). 근거: `apps/admin/src/shared/ui/ToastProvider.tsx:43-53`.

### 9.1 공통 층 6 — 화면마다 반복해 적지 않는다

| 위치 | 종류 | 문구 |
|---|---|---|
| `shared/crud/useCrudForm.ts:249` | success | `〈엔티티〉를 등록/수정했습니다.` |
| `shared/crud/useCrudList.tsx:170` | success | `'〈이름〉'을 삭제했습니다.` |
| `shared/crud/useCrudList.tsx:206` | success | `〈엔티티〉 N건을 삭제했습니다.` |
| `shared/crud/useCrudRowUpdate.ts:49` | success | 호출부가 준 문구 |
| `shared/crud/useCrudRowUpdate.ts:53` | error | `변경하지 못했습니다. 잠시 후 다시 시도해 주세요.` |
| `shared/ui/ConfirmDialog.tsx:39` | cancelled | `작업이 취소되었습니다` |

### 9.2 섹션 공유 2

| 위치 | 종류 | 어느 화면이 쓰는가 |
|---|---|---|
| `pages/logs/components/LogListShell.tsx:185,195` | success · error | 로그 4화면 |
| `pages/stats/_shared/useCsvExport.ts:75,82` | success · error | 통계 6화면 |

### 9.3 화면별 건수 (146)

| 화면 파일 | 성공 | 실패 | 취소 |
|---|---|---|---|
| `pages/admins/AdminDetailPage.tsx` | 1 | 0 | 0 |
| `pages/admins/AdminsPage.tsx` | 2 | 0 | 0 |
| `pages/ai/ConversationsPage.tsx` | 1 | 1 | 0 |
| `pages/company/ceo-message/CeoMessagePage.tsx` | 1 | 0 | 0 |
| `pages/company/certificates/CertificatesListPage.tsx` | 1 | 2 | 0 |
| `pages/company/directions/DirectionsPage.tsx` | 1 | 0 | 0 |
| `pages/company/logo-list/LogoListPage.tsx` | 5 | 2 | 0 |
| `pages/company/profile/CompanyProfilePage.tsx` | 1 | 0 | 0 |
| `pages/content/banners/BannerFormPage.tsx` | 2 | 0 | 0 |
| `pages/content/banners/BannersPage.tsx` | 5 | 3 | 0 |
| `pages/content/faq/FaqDetailPage.tsx` | 1 | 0 | 0 |
| `pages/content/faq/FaqFormPage.tsx` | 2 | 0 | 0 |
| `pages/content/faq/FaqPage.tsx` | 7 | 3 | 0 |
| `pages/content/notices/NoticeDetailPage.tsx` | 1 | 0 | 0 |
| `pages/content/notices/NoticeFormPage.tsx` | 2 | 0 | 0 |
| `pages/content/notices/NoticesPage.tsx` | 2 | 0 | 0 |
| `pages/content/popups/PopupFormPage.tsx` | 2 | 0 | 0 |
| `pages/content/popups/PopupsPage.tsx` | 4 | 2 | 0 |
| `pages/content/privacy/PrivacyDetailPage.tsx` | 1 | 0 | 0 |
| `pages/content/privacy/PrivacyPage.tsx` | 2 | 0 | 0 |
| `pages/content/privacy/components/VersionForm.tsx` | 2 | 0 | 0 |
| `pages/content/terms/TermsDetailPage.tsx` | 1 | 0 | 0 |
| `pages/content/terms/TermsPage.tsx` | 2 | 0 | 0 |
| `pages/content/terms/components/VersionForm.tsx` | 2 | 0 | 0 |
| `pages/customer-settings/CustomerSettingsPage.tsx` | 1 | 2 | 0 |
| `pages/customer-settings/useTierEditing.tsx` | 2 | 0 | 0 |
| `pages/login-history/LoginHistoryPage.tsx` | 1 | 1 | 0 |
| `pages/marketing/message-templates/MessageTemplateDetailPage.tsx` | 1 | 0 | 0 |
| `pages/members/MemberDetailPage.tsx` | 3 | 1 | 0 |
| `pages/members/MembersPage.tsx` | 5 | 3 | 0 |
| `pages/members/components/MemoCard.tsx` | 1 | 0 | 0 |
| `pages/members/components/PointsCard.tsx` | 2 | 0 | 0 |
| `pages/orders/OrderDetailPage.tsx` | 1 | 0 | 0 |
| `pages/orders/OrderListPage.tsx` | 1 | 0 | 0 |
| `pages/orders/claims/ClaimDetailPage.tsx` | 1 | 0 | 0 |
| `pages/orders/shipments/ShipmentListPage.tsx` | 1 | 0 | 0 |
| `pages/permissions/PermissionsPage.tsx` | 4 | 1 | 0 |
| `pages/portfolio/categories/PortfolioCategoriesPage.tsx` | 2 | 0 | 0 |
| `pages/products/categories/ProductCategoriesPage.tsx` | 2 | 0 | 0 |
| `pages/products/inquiries/ProductInquiryDetailPage.tsx` | 1 | 0 | 0 |
| `pages/products/inquiries/ProductInquiryListPage.tsx` | 1 | 1 | 0 |
| `pages/products/points/PointsPolicyPage.tsx` | 1 | 0 | 0 |
| `pages/products/reviews/ReviewDetailPage.tsx` | 2 | 0 | 0 |
| `pages/products/shipping/ShippingPolicyPage.tsx` | 1 | 0 | 0 |
| `pages/products/shipping/components/CarrierSection.tsx` | 2 | 0 | 0 |
| `pages/programs/categories/ProgramCategoriesPage.tsx` | 2 | 0 | 0 |
| `pages/programs/inquiries/ProgramInquiryDetailPage.tsx` | 1 | 0 | 0 |
| `pages/programs/inquiries/ProgramInquiryListPage.tsx` | 1 | 1 | 0 |
| `pages/sales/inquiries/InquiryDetailPage.tsx` | 1 | 0 | 0 |
| `pages/settings/api-keys/AiConnectionPage.tsx` | 2 | 0 | 0 |
| `pages/settings/notifications/NotificationSettingsPage.tsx` | 1 | 1 | 0 |
| `pages/settings/oauth/OAuthPage.tsx` | 2 | 0 | 0 |
| `pages/settings/oauth/OAuthProviderPage.tsx` | 2 | 0 | 0 |
| `pages/settings/oauth/components/OAuthProviderCard.tsx` | 1 | 1 | 0 |
| `pages/settings/payment/PaymentSettingsPage.tsx` | 2 | 0 | 0 |
| `pages/settings/payment/PgProviderPage.tsx` | 3 | 1 | 0 |
| `pages/settings/site/SiteSettingsPage.tsx` | 2 | 0 | 0 |
| `pages/support/categories/CategoriesPage.tsx` | 2 | 0 | 0 |
| `pages/support/faq/CustomerFaqPage.tsx` | 3 | 3 | 0 |
| `pages/support/tickets/TicketDetailPage.tsx` | 1 | 0 | 0 |
| `pages/users/consents/ConsentsPage.tsx` | 1 | 1 | 0 |

> 경로는 전부 `apps/admin/src/` 아래다. 합계 **성공 114 · 실패 32 = 146**,
> 여기에 공통 6 + 섹션 공유 2×2 = 8 을 더하면 **154**.
>
> **토스트가 하나도 없는 화면**이 많다 — 조회 전용 화면(통계·로그·상세 일부)이 그렇다.
> 그 사실도 명세에 적힌다: '이 화면에는 결과 통지 토스트가 없다'.

---

## 10. 확인하지 못한 것 · 미결

| # | 무엇 | 상태 |
|---|---|---|
| 1 | **`ADMIN_TABS` 가 한 개짜리 탭이다** — `[{ id: 'list', label: '운영진 목록' }]`(`pages/admins/types.ts:115`). 탭 줄이 있는데 고를 것이 없다. 화면 축인지, 지우다 만 자리인지 코드만 봐서는 판정할 수 없다 | 운영자·구현 확인 필요 |
| 2 | **코드가 지금도 바뀌는 중이다** — 지도 항목 제거 · 주소 검색 확장 · **사용자 문구 전면 정리**가 진행 중이다. 이 인벤토리의 **구조**(화면·팝업·탭 목록)는 그 영향을 거의 받지 않지만, **문구**(§3 Label·Placeholder · §6 오류 메시지 · §7 사용자 메시지 · §8 안내 메시지)는 전부 바뀐다 | **워딩 정리가 끝난 뒤** 명세를 쓴다 |
| 3 | **`/settings/api-keys` 의 연동 카탈로그가 편집 중이다** — `INTEGRATION_CATEGORIES` 에 항목이 오가는 중이라 목록·탭·자격증명 칸이 지금 값과 달라질 수 있다 | 마지막 묶음으로 미룬다([`plan.md`](plan.md)) |
| 4 | **고객 화면 축(User View)이 새 양식에 자리가 없다** — 옛 명세는 FS §8 에 '어드민의 값이 고객 화면에서 무엇이 되는가' 를 적었고, 그 규약과 이미 확인된 대응 7건이 [`../reference/user-view.md`](../reference/user-view.md) 에 남아 있다. 새 10절 양식에는 대응하는 절이 없다 | **운영자 판단 필요** — ①버린다 ②§1 관련 화면/§4 후속 동작에 녹인다 ③10절 뒤에 부록으로 붙인다 |
| 5 | **토스트 문구를 이 인벤토리에 옮겨 적지 않았다** — 건수만 셌다. 문구는 워딩 정리 후 바뀌므로 지금 옮기면 곧 낡는다 | 의도된 것 |
| 6 | **동적 제목 확인 다이얼로그 2건**(주문 상세 · 클레임 상세)은 상태마다 제목이 다르다 | 명세 작성 시 경우별로 전개 |
