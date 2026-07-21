/**
 * 어드민 화면 인벤토리 — Storybook `Pages/<English Menu>` 카테고리의 단일 데이터 원천.
 *
 * 정본은 `apps/admin/src/shared/layout/nav-config.ts` 다 (플러그인 산출물
 * `tools/figma-plugin/generated/tds-pages.json` 이 같은 정본에서 파생된다).
 * packages/ui 는 앱 코드도 플러그인 산출물도 import 할 수 없으므로(레이어 역방향 의존 금지,
 * eslint.config.js §④ `banApps`), 인벤토리를 **값으로 복사**해 여기 둔다.
 *
 * nav-config.ts 가 바뀌면 이 파일도 함께 갱신한다.
 *
 * 영문 표기 규칙 — 화면의 URL 경로에서 유도한다 (`/users/members` → Members).
 * 경로가 이름을 담지 못하는 경우(`/users/settings`, `/support/categories`)만 한국어 라벨의
 * 뜻을 살려 붙인다.
 */

/** 상위 섹션 — 사이드바 그룹 제목 */
export interface PageSection {
  readonly ko: string;
  readonly en: string;
}

/** 메뉴 — 사이드바 1단계 항목. Storybook 카테고리 `Pages/<en>` 이 된다. */
export interface PageMenu {
  readonly ko: string;
  readonly en: string;
  readonly basePath: string;
  readonly section: PageSection;
}

/** 화면 — 사이드바 잎 항목. 라우트 1건과 1:1 대응한다. */
export interface PageEntry {
  readonly path: string;
  readonly ko: string;
  readonly en: string;
  readonly menu: PageMenu;
}

const SECTION_GENERAL: PageSection = { ko: '일반 관리', en: 'General' };
const SECTION_BUSINESS: PageSection = { ko: '비즈니스', en: 'Business' };
const SECTION_AI: PageSection = { ko: 'AI', en: 'AI' };
const SECTION_ANALYTICS: PageSection = { ko: '분석 · 운영', en: 'Analytics & Operations' };
const SECTION_SYSTEM: PageSection = { ko: '시스템', en: 'System' };

export const SECTIONS: readonly PageSection[] = [
  SECTION_GENERAL,
  SECTION_BUSINESS,
  SECTION_AI,
  SECTION_ANALYTICS,
  SECTION_SYSTEM,
];

/** 메뉴 정의 — [한국어 라벨, 영문 라벨, basePath, 섹션] */
type MenuSpec = readonly [ko: string, en: string, basePath: string, section: PageSection];

/** 화면 정의 — [경로, 한국어 라벨, 영문 라벨] */
type EntrySpec = readonly [path: string, ko: string, en: string];

interface MenuGroupSpec {
  readonly menu: MenuSpec;
  readonly entries: readonly EntrySpec[];
}

const GROUPS: readonly MenuGroupSpec[] = [
  {
    menu: ['대시보드', 'Dashboard', '/dashboard', SECTION_GENERAL],
    entries: [['/dashboard', '대시보드', 'Dashboard']],
  },
  {
    menu: ['사용자 관리', 'Users', '/users', SECTION_GENERAL],
    entries: [
      ['/users/members', '회원 관리', 'Members'],
      ['/users/settings', '고객 설정', 'Customer Settings'],
      ['/users/admins', '관리자 관리', 'Admins'],
      ['/users/roles', '권한 관리', 'Roles'],
      ['/users/login-history', '로그인 이력', 'Login History'],
    ],
  },
  {
    menu: ['콘텐츠 관리', 'Content', '/content', SECTION_GENERAL],
    entries: [
      ['/content/notices', '공지사항', 'Notices'],
      ['/content/faq', 'FAQ', 'FAQ'],
      ['/content/popups', '팝업 관리', 'Popups'],
      ['/content/banners', '배너 관리', 'Banners'],
      ['/content/terms', '약관 관리', 'Terms'],
      ['/content/privacy', '개인정보 처리방침', 'Privacy Policy'],
    ],
  },
  {
    menu: ['기업 관리', 'Company', '/company', SECTION_GENERAL],
    entries: [
      ['/company/profile', '회사 정보', 'Profile'],
      ['/company/ceo-message', 'CEO 인사말', 'CEO Message'],
      ['/company/history', '연혁', 'History'],
      ['/company/directions', '오시는 길', 'Directions'],
      ['/company/certificates', '인증서/특허', 'Certificates'],
      ['/company/partners', '파트너사', 'Partners'],
      ['/company/clients', '고객사', 'Clients'],
      ['/company/esg', 'ESG', 'ESG'],
    ],
  },
  {
    menu: ['포트폴리오 관리', 'Portfolio', '/portfolio', SECTION_BUSINESS],
    entries: [
      ['/portfolio/items', '포트폴리오', 'Items'],
      ['/portfolio/categories', '카테고리', 'Categories'],
      ['/portfolio/case-studies', '성공 사례', 'Case Studies'],
    ],
  },
  {
    menu: ['주문 관리', 'Orders', '/orders', SECTION_BUSINESS],
    entries: [['/orders', '주문 관리', 'Orders']],
  },
  {
    menu: ['상품 관리', 'Products', '/products', SECTION_BUSINESS],
    entries: [
      ['/products', '상품', 'Products'],
      ['/products/categories', '카테고리', 'Categories'],
      ['/products/shipping', '배송', 'Shipping'],
      ['/products/returns', '교환/반품', 'Returns'],
      ['/products/coupons', '쿠폰', 'Coupons'],
      ['/products/points', '적립금', 'Points'],
      ['/products/reviews', '리뷰', 'Reviews'],
      ['/products/inquiries', '문의', 'Inquiries'],
    ],
  },
  {
    menu: ['프로그램 관리', 'Programs', '/programs', SECTION_BUSINESS],
    entries: [
      ['/programs', '프로그램', 'Programs'],
      ['/programs/categories', '카테고리', 'Categories'],
      ['/programs/inquiries', '문의', 'Inquiries'],
    ],
  },
  {
    menu: ['영업 관리', 'Sales', '/sales', SECTION_BUSINESS],
    entries: [
      ['/sales/accounts', '거래처', 'Accounts'],
      ['/sales/contracts', '계약', 'Contracts'],
      ['/sales/quotes', '견적', 'Quotes'],
      ['/sales/inquiries', '문의', 'Inquiries'],
      ['/sales/projects', '프로젝트', 'Projects'],
      ['/sales/consultations', '상담 이력', 'Consultations'],
    ],
  },
  {
    menu: ['고객센터', 'Support', '/support', SECTION_BUSINESS],
    entries: [
      ['/support/tickets', '1:1 문의', 'Tickets'],
      ['/support/categories', '문의 유형', 'Inquiry Categories'],
      ['/support/replies', '문의 답변', 'Replies'],
      ['/support/faq', '자주 묻는 질문', 'FAQ'],
      ['/support/downloads', '자료실', 'Downloads'],
    ],
  },
  {
    menu: ['마케팅 관리', 'Marketing', '/marketing', SECTION_BUSINESS],
    entries: [
      ['/marketing/events', '이벤트', 'Events'],
      ['/marketing/promotions', '프로모션', 'Promotions'],
      ['/marketing/newsletters', '뉴스레터', 'Newsletters'],
      ['/marketing/sms', 'SMS 발송', 'SMS'],
      ['/marketing/email', '이메일 발송', 'Email'],
      ['/marketing/templates', '발송 템플릿 관리', 'Templates'],
    ],
  },
  {
    menu: ['AI 에이전트', 'AI Agent', '/ai', SECTION_AI],
    entries: [
      ['/ai/chat', '새 채팅', 'New Chat'],
      ['/ai/conversations', '대화 목록', 'Conversations'],
    ],
  },
  {
    menu: ['통계', 'Statistics', '/stats', SECTION_ANALYTICS],
    entries: [
      ['/stats/visitors', '방문자 통계', 'Visitors'],
      ['/stats/members', '회원 통계', 'Members'],
      ['/stats/revenue', '매출 통계', 'Revenue'],
      ['/stats/orders', '주문 통계', 'Orders'],
      ['/stats/traffic', '유입 분석', 'Traffic'],
      ['/stats/keywords', '검색어 분석', 'Keywords'],
    ],
  },
  {
    menu: ['로그 관리', 'Logs', '/logs', SECTION_ANALYTICS],
    entries: [
      ['/logs/admin', '관리자 로그', 'Admin Logs'],
      ['/logs/member-activity', '회원 활동 로그', 'Member Activity'],
      ['/logs/api', 'API 로그', 'API Logs'],
      ['/logs/errors', '오류 로그', 'Error Logs'],
    ],
  },
  {
    menu: ['시스템 설정', 'Settings', '/settings', SECTION_SYSTEM],
    entries: [
      ['/settings/site', '사이트 설정', 'Site'],
      ['/settings/api-keys', 'API Key 설정', 'API Keys'],
      ['/settings/oauth', 'OAuth 설정', 'OAuth'],
      ['/settings/payment', '결제 설정', 'Payment'],
    ],
  },
];

function toMenu([ko, en, basePath, section]: MenuSpec): PageMenu {
  return { ko, en, basePath, section };
}

/** 메뉴 13개 — 사이드바 순서 그대로 */
export const MENUS: readonly PageMenu[] = GROUPS.map((group) => toMenu(group.menu));

/** 화면 68개 — 사이드바 순서 그대로 */
export const PAGES: readonly PageEntry[] = GROUPS.flatMap((group) => {
  const menu = toMenu(group.menu);
  return group.entries.map(([path, ko, en]) => ({ path, ko, en, menu }));
});

/** 영문 메뉴명으로 메뉴를 찾는다 — 없는 이름이면 스토리 작성 실수이므로 즉시 던진다. */
export function menuByEnglishName(en: string): PageMenu {
  const found = MENUS.find((menu) => menu.en === en);
  if (found === undefined) {
    throw new Error(`[pages/_data] 알 수 없는 메뉴 영문명: ${en}`);
  }
  return found;
}

/** 해당 메뉴에 속한 화면 목록 */
export function pagesOfMenu(menu: PageMenu): readonly PageEntry[] {
  return PAGES.filter((page) => page.menu.en === menu.en);
}
