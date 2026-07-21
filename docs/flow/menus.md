# 메뉴별 플로우 차트

사이드바 메뉴 **전수 71장**. 각 장이 그 메뉴의 진입 → 조회 상태 → 액션 → 게이트·검증 → mutation → 성공·실패 → 복귀를 담는다.
코드(페이지 컴포넌트·types.ts·data-source.ts·queries.ts)를 읽고 그린 것이라 상태값과 가드 이름이 실제와 일치한다.

**[전체 목차(HTML)](html/index.html)** — 브라우저로 열면 휠 확대·드래그 이동이 된다.
`.mmd` 는 mermaid.live 에 붙여넣는 원본이다(펜스 없이 통째로 복사).

> **HTML 렌더가 `.mmd` 보다 낡을 수 있다.** `docs/flow/html/**` 는 `.mmd` 의 렌더 산출물인데
> **그 렌더를 도는 스크립트가 `package.json` 에 등록돼 있지 않다**(`.prettierignore` 가 같은 사실을 적어 두었다).
> 이제 HTML 은 `pnpm flow:render` 가 `.mmd` 에서 뽑는다(`pnpm flow:check` 가 낡음·누락·고아를 잡는다).
> 그래도 판단의 근거는 언제나 `.mmd` 다 — HTML 은 파생물이다.

| 메뉴 | 경로 | 보기 | mermaid 원본 |
|---|---|---|---|
| 새 채팅 | `/ai/chat` | [HTML](html/menus/ai-chat.html) | [mmd](mmd/menus/ai-chat.mmd) |
| 대화 목록 | `/ai/conversations` | [HTML](html/menus/ai-conversations.html) | [mmd](mmd/menus/ai-conversations.mmd) |
| CEO 인사말 | `/company/ceo-message` | [HTML](html/menus/company-ceo-message.html) | [mmd](mmd/menus/company-ceo-message.mmd) |
| 인증서/특허 | `/company/certificates` | [HTML](html/menus/company-certificates.html) | [mmd](mmd/menus/company-certificates.mmd) |
| 고객사 | `/company/clients` | [HTML](html/menus/company-clients.html) | [mmd](mmd/menus/company-clients.mmd) |
| 오시는 길 | `/company/directions` | [HTML](html/menus/company-directions.html) | [mmd](mmd/menus/company-directions.mmd) |
| ESG | `/company/esg` | [HTML](html/menus/company-esg.html) | [mmd](mmd/menus/company-esg.mmd) |
| 연혁 | `/company/history` | [HTML](html/menus/company-history.html) | [mmd](mmd/menus/company-history.mmd) |
| 파트너사 | `/company/partners` | [HTML](html/menus/company-partners.html) | [mmd](mmd/menus/company-partners.mmd) |
| 회사 정보 | `/company/profile` | [HTML](html/menus/company-profile.html) | [mmd](mmd/menus/company-profile.mmd) |
| 배너 관리 | `/content/banners` | [HTML](html/menus/content-banners.html) | [mmd](mmd/menus/content-banners.mmd) |
| FAQ | `/content/faq` | [HTML](html/menus/content-faq.html) | [mmd](mmd/menus/content-faq.mmd) |
| 공지사항 | `/content/notices` | [HTML](html/menus/content-notices.html) | [mmd](mmd/menus/content-notices.mmd) |
| 팝업 관리 | `/content/popups` | [HTML](html/menus/content-popups.html) | [mmd](mmd/menus/content-popups.mmd) |
| 개인정보 처리방침 | `/content/privacy` | [HTML](html/menus/content-privacy.html) | [mmd](mmd/menus/content-privacy.mmd) |
| 약관 관리 | `/content/terms` | [HTML](html/menus/content-terms.html) | [mmd](mmd/menus/content-terms.mmd) |
| 대시보드 | `/dashboard` | [HTML](html/menus/dashboard.html) | [mmd](mmd/menus/dashboard.mmd) |
| 관리자 로그 | `/logs/admin` | [HTML](html/menus/logs-admin.html) | [mmd](mmd/menus/logs-admin.mmd) |
| API 로그 | `/logs/api` | [HTML](html/menus/logs-api.html) | [mmd](mmd/menus/logs-api.mmd) |
| 오류 로그 | `/logs/errors` | [HTML](html/menus/logs-errors.html) | [mmd](mmd/menus/logs-errors.mmd) |
| 회원 활동 로그 | `/logs/member-activity` | [HTML](html/menus/logs-member-activity.html) | [mmd](mmd/menus/logs-member-activity.mmd) |
| 이메일 발송 | `/marketing/email` | [HTML](html/menus/marketing-email.html) | [mmd](mmd/menus/marketing-email.mmd) |
| 이벤트 | `/marketing/events` | [HTML](html/menus/marketing-events.html) | [mmd](mmd/menus/marketing-events.mmd) |
| 뉴스레터 | `/marketing/newsletters` | [HTML](html/menus/marketing-newsletters.html) | [mmd](mmd/menus/marketing-newsletters.mmd) |
| 프로모션 | `/marketing/promotions` | [HTML](html/menus/marketing-promotions.html) | [mmd](mmd/menus/marketing-promotions.mmd) |
| SMS 발송 | `/marketing/sms` | [HTML](html/menus/marketing-sms.html) | [mmd](mmd/menus/marketing-sms.mmd) |
| 발송 템플릿 관리 | `/marketing/templates` | [HTML](html/menus/marketing-templates.html) | [mmd](mmd/menus/marketing-templates.mmd) |
| 취소/교환/반품 | `/orders/claims` | [HTML](html/menus/orders-claims.html) | [mmd](mmd/menus/orders-claims.mmd) |
| 배송 처리 | `/orders/shipments` | [HTML](html/menus/orders-shipments.html) | [mmd](mmd/menus/orders-shipments.mmd) |
| 주문 | `/orders` | [HTML](html/menus/orders.html) | [mmd](mmd/menus/orders.mmd) |
| 성공 사례 | `/portfolio/case-studies` | [HTML](html/menus/portfolio-case-studies.html) | [mmd](mmd/menus/portfolio-case-studies.mmd) |
| 포트폴리오 카테고리 | `/portfolio/categories` | [HTML](html/menus/portfolio-categories.html) | [mmd](mmd/menus/portfolio-categories.mmd) |
| 포트폴리오 | `/portfolio/items` | [HTML](html/menus/portfolio-items.html) | [mmd](mmd/menus/portfolio-items.mmd) |
| 상품 카테고리 | `/products/categories` | [HTML](html/menus/products-categories.html) | [mmd](mmd/menus/products-categories.mmd) |
| 쿠폰 | `/products/coupons` | [HTML](html/menus/products-coupons.html) | [mmd](mmd/menus/products-coupons.mmd) |
| 문의 (상품) | `/products/inquiries` | [HTML](html/menus/products-inquiries.html) | [mmd](mmd/menus/products-inquiries.mmd) |
| 상품 | `/products` | [HTML](html/menus/products-items.html) | [mmd](mmd/menus/products-items.mmd) |
| 적립금 | `/products/points` | [HTML](html/menus/products-points.html) | [mmd](mmd/menus/products-points.mmd) |
| 리뷰 | `/products/reviews` | [HTML](html/menus/products-reviews.html) | [mmd](mmd/menus/products-reviews.mmd) |
| 배송 | `/products/shipping` | [HTML](html/menus/products-shipping.html) | [mmd](mmd/menus/products-shipping.mmd) |
| 프로그램 카테고리 | `/programs/categories` | [HTML](html/menus/programs-categories.html) | [mmd](mmd/menus/programs-categories.mmd) |
| 문의 (프로그램) | `/programs/inquiries` | [HTML](html/menus/programs-inquiries.html) | [mmd](mmd/menus/programs-inquiries.mmd) |
| 프로그램 | `/programs` | [HTML](html/menus/programs-items.html) | [mmd](mmd/menus/programs-items.mmd) |
| 거래처 | `/sales/accounts` | [HTML](html/menus/sales-accounts.html) | [mmd](mmd/menus/sales-accounts.mmd) |
| 청구·입금 | `/sales/billing` | [HTML](html/menus/sales-billing.html) | [mmd](mmd/menus/sales-billing.mmd) |
| 상담 이력 | `/sales/consultations` | [HTML](html/menus/sales-consultations.html) | [mmd](mmd/menus/sales-consultations.mmd) |
| 계약 | `/sales/contracts` | [HTML](html/menus/sales-contracts.html) | [mmd](mmd/menus/sales-contracts.mmd) |
| 문의 (영업) | `/sales/inquiries` | [HTML](html/menus/sales-inquiries.html) | [mmd](mmd/menus/sales-inquiries.mmd) |
| 프로젝트 | `/sales/projects` | [HTML](html/menus/sales-projects.html) | [mmd](mmd/menus/sales-projects.mmd) |
| 견적 | `/sales/quotes` | [HTML](html/menus/sales-quotes.html) | [mmd](mmd/menus/sales-quotes.mmd) |
| API Key 설정 | `/settings/api-keys` | [HTML](html/menus/settings-api-keys.html) | [mmd](mmd/menus/settings-api-keys.mmd) |
| OAuth 설정 | `/settings/oauth` | [HTML](html/menus/settings-oauth.html) | [mmd](mmd/menus/settings-oauth.mmd) |
| 결제 설정 | `/settings/payment` | [HTML](html/menus/settings-payment.html) | [mmd](mmd/menus/settings-payment.mmd) |
| 플랜·이용 현황 | `/settings/plan` | [HTML](html/menus/settings-plan.html) | [mmd](mmd/menus/settings-plan.mmd) |
| 사이트 설정 | `/settings/site` | [HTML](html/menus/settings-site.html) | [mmd](mmd/menus/settings-site.mmd) |
| 검색어 분석 | `/stats/keywords` | [HTML](html/menus/stats-keywords.html) | [mmd](mmd/menus/stats-keywords.mmd) |
| 회원 통계 | `/stats/members` | [HTML](html/menus/stats-members.html) | [mmd](mmd/menus/stats-members.mmd) |
| 주문 통계 | `/stats/orders` | [HTML](html/menus/stats-orders.html) | [mmd](mmd/menus/stats-orders.mmd) |
| 매출 통계 | `/stats/revenue` | [HTML](html/menus/stats-revenue.html) | [mmd](mmd/menus/stats-revenue.mmd) |
| 유입 분석 | `/stats/traffic` | [HTML](html/menus/stats-traffic.html) | [mmd](mmd/menus/stats-traffic.mmd) |
| 방문자 통계 | `/stats/visitors` | [HTML](html/menus/stats-visitors.html) | [mmd](mmd/menus/stats-visitors.mmd) |
| 문의 유형 | `/support/categories` | [HTML](html/menus/support-categories.html) | [mmd](mmd/menus/support-categories.mmd) |
| 자료실 | `/support/downloads` | [HTML](html/menus/support-downloads.html) | [mmd](mmd/menus/support-downloads.mmd) |
| 자주 묻는 질문 | `/support/faq` | [HTML](html/menus/support-faq.html) | [mmd](mmd/menus/support-faq.mmd) |
| 문의 답변 | `/support/replies` | [HTML](html/menus/support-replies.html) | [mmd](mmd/menus/support-replies.mmd) |
| 1:1 문의 | `/support/tickets` | [HTML](html/menus/support-tickets.html) | [mmd](mmd/menus/support-tickets.mmd) |
| 관리자 관리 | `/users/admins` | [HTML](html/menus/users-admins.html) | [mmd](mmd/menus/users-admins.mmd) |
| 로그인 이력 | `/users/login-history` | [HTML](html/menus/users-login-history.html) | [mmd](mmd/menus/users-login-history.mmd) |
| 회원 관리 | `/users/members` | [HTML](html/menus/users-members.html) | [mmd](mmd/menus/users-members.mmd) |
| 권한 관리 | `/users/roles` | [HTML](html/menus/users-roles.html) | [mmd](mmd/menus/users-roles.mmd) |
| 고객 설정 | `/users/settings` | [HTML](html/menus/users-settings.html) | [mmd](mmd/menus/users-settings.mmd) |

## 조건부 메뉴 — 표에 있는데 사이드바에는 없을 수 있는 둘

`문의 (상품)`·`문의 (프로그램)` 두 잎은 `nav-config.ts` 에서 `visibleWhen: 'pg-off'` 를 달고 있다.
결제(PG)를 켜면 그 창구로 **새로 들어올 것이 없으므로** 잔여 문의가 0건이면 사이드바에서 사라지고,
남아 있으면 라벨에 `INQUIRY_ARCHIVE_SUFFIX`(`' · 읽기 전용'`)가 붙는다 — 판정은 `inquiryMenuState`
(`shared/commerce/inquiry-backlog.ts`).

**라우트는 사라지지 않는다.** `collectNavRoutes()` 는 `resolveNavLeaf` 를 지나지 않으므로 URL 로 들어온
과거 문의 화면은 계속 열린다. 그래서 이 표는 두 메뉴를 **항상** 싣는다 — 감추는 것과 없애는 것은 다른 결정이다.

## 사라진 두 장

| 옛 차트 | 무슨 일이 있었나 |
|---|---|
| `products-returns.mmd` | 교환/반품이 `/orders/claims` 로 옮겨 가며 **취소가 축으로 들어왔다**. `orders-claims.mmd` 가 그 자리를 대신한다 |
| `marketing-alimtalk.mmd` | 알림톡 전용 화면이 없어졌다. `/marketing/templates/alimtalk` 은 이제 `/marketing/templates` 로 `Navigate replace` 하며(`App.tsx`), 종류는 발송 템플릿의 `?kind=text\|email\|alimtalk` 로 고른다 |
