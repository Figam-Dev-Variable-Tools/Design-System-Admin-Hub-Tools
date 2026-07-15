// 사이드바 내비게이션 구조 정의 (A40 소유 — apps/admin/src/**).
//
// 이 파일이 어드민 메뉴의 단일 원천이다. 화면이 늘어날 때 여기만 고치면
// 사이드바(AppShell)와 라우트(App.tsx)가 함께 따라온다.
//
// 규칙
// - 가지(branch)는 자기 라우트를 갖지 않는다. 클릭하면 펼쳐질 뿐이다.
// - 잎(leaf)의 to 는 App.tsx 라우트와 1:1 대응한다. 아직 화면이 없으면 준비 중 화면으로 간다.
// - basePath 는 하위 경로의 공통 프리픽스 — 현재 경로가 여기 속하면 사이드바가 자동으로 펼친다.

import type { FeatureKey } from '../permissions/feature-registry';

/** 잎 노드 — 실제 라우트로 이동하는 항목 */
interface NavLeaf {
  readonly kind: 'leaf';
  readonly label: string;
  readonly to: string;
}

/** 가지 노드 — 하위 항목을 펼치는 항목 (자신은 라우트를 갖지 않는다) */
export interface NavBranch {
  readonly kind: 'branch';
  readonly label: string;
  readonly basePath: string;
  readonly children: readonly NavLeaf[];
}

type NavItem = NavLeaf | NavBranch;

/** 아이콘 식별자 — AppShell 이 실제 SVG 컴포넌트로 매핑한다 */
export type NavIconName =
  | 'layout-grid'
  | 'users'
  | 'file-text'
  | 'building'
  | 'image'
  | 'shopping-bag'
  | 'briefcase'
  | 'headset'
  | 'megaphone'
  | 'calendar'
  | 'bar-chart'
  | 'scroll-text'
  | 'bell'
  | 'settings';

export interface NavEntry {
  readonly icon: NavIconName;
  /** 이 메뉴를 노출할지 결정하는 권한 키 — 최상위 관리자가 ON/OFF 한다 */
  readonly permission: FeatureKey;
  readonly item: NavItem;
}

interface NavSection {
  readonly title: string;
  readonly entries: readonly NavEntry[];
}

/* ── 트리 생성기 ─────────────────────────────────────────────────────────────
 *
 * 메뉴는 **데이터**다. 예전에는 `kind: 'leaf'` · `kind: 'branch'` 리터럴이 14벌 늘어서서
 * 같은 30줄 블록이 두 번 반복됐다 (A83 축3 `clone:b0039e5b8ebf89b5` · `clone:fb9de3855927b0a8`).
 * 잎은 `[라벨, 경로]` 한 쌍이면 충분하고, 껍데기는 아래 두 함수가 한 벌만 갖는다.
 */

/** 잎 한 쌍 — [보이는 라벨, 라우트 경로] */
type LeafSpec = readonly [label: string, to: string];

function leaves(specs: readonly LeafSpec[]): readonly NavLeaf[] {
  return specs.map(([label, to]) => ({ kind: 'leaf', label, to }));
}

/** 가지 — 자기 라우트를 갖지 않고 펼쳐지기만 한다 */
function branch(
  icon: NavIconName,
  permission: FeatureKey,
  label: string,
  basePath: string,
  children: readonly LeafSpec[],
): NavEntry {
  return {
    icon,
    permission,
    item: { kind: 'branch', label, basePath, children: leaves(children) },
  };
}

/** 잎 — 바로 라우트로 가는 단일 항목 */
function leaf(icon: NavIconName, permission: FeatureKey, label: string, to: string): NavEntry {
  return { icon, permission, item: { kind: 'leaf', label, to } };
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: '일반 관리',
    entries: [
      // 1. 대시보드 — 로그인 후 랜딩
      leaf('layout-grid', 'menu.dashboard', '대시보드', '/dashboard'),

      // 2. 사용자 관리
      branch('users', 'menu.users', '사용자 관리', '/users', [
        ['회원 관리', '/users/members'],
        ['고객 설정', '/users/settings'],
        ['관리자 관리', '/users/admins'],
        ['권한 관리', '/users/roles'],
        ['로그인 이력', '/users/login-history'],
      ]),

      // 3. 콘텐츠 관리
      branch('file-text', 'menu.content', '콘텐츠 관리', '/content', [
        ['공지사항', '/content/notices'],
        ['FAQ', '/content/faq'],
        ['팝업 관리', '/content/popups'],
        ['배너 관리', '/content/banners'],
        ['약관 관리', '/content/terms'],
        ['개인정보 처리방침', '/content/privacy'],
      ]),

      // 4. 기업 관리
      branch('building', 'menu.company', '기업 관리', '/company', [
        ['회사 정보', '/company/profile'],
        ['CEO 인사말', '/company/ceo-message'],
        ['연혁', '/company/history'],
        ['오시는 길', '/company/directions'],
        ['인증서/특허', '/company/certificates'],
        ['파트너사', '/company/partners'],
        ['고객사', '/company/clients'],
        ['ESG', '/company/esg'],
      ]),
    ],
  },

  {
    title: '비즈니스',
    entries: [
      // 5. 포트폴리오 관리
      branch('image', 'menu.portfolio', '포트폴리오 관리', '/portfolio', [
        ['포트폴리오', '/portfolio/items'],
        ['카테고리', '/portfolio/categories'],
        ['성공 사례', '/portfolio/case-studies'],
      ]),

      // 6. 상품 관리
      branch('shopping-bag', 'menu.products', '상품 관리', '/products', [
        ['상품', '/products'],
        ['카테고리', '/products/categories'],
        ['배송', '/products/shipping'],
        ['교환/반품', '/products/returns'],
        ['쿠폰', '/products/coupons'],
        ['적립금', '/products/points'],
        ['리뷰', '/products/reviews'],
      ]),

      // 7. 영업 관리
      branch('briefcase', 'menu.sales', '영업 관리', '/sales', [
        ['거래처', '/sales/accounts'],
        ['계약', '/sales/contracts'],
        ['견적', '/sales/quotes'],
        ['문의', '/sales/inquiries'],
        ['프로젝트', '/sales/projects'],
        ['상담 이력', '/sales/consultations'],
      ]),

      // 8. 고객센터
      branch('headset', 'menu.support', '고객센터', '/support', [
        ['1:1 문의', '/support/tickets'],
        ['문의 유형', '/support/categories'],
        ['문의 답변', '/support/replies'],
        ['자주 묻는 질문', '/support/faq'],
        ['자료실', '/support/downloads'],
      ]),

      // 9. 마케팅 관리
      branch('megaphone', 'menu.marketing', '마케팅 관리', '/marketing', [
        ['이벤트', '/marketing/events'],
        ['프로모션', '/marketing/promotions'],
        ['뉴스레터', '/marketing/newsletters'],
        ['SMS 발송', '/marketing/sms'],
        ['이메일 발송', '/marketing/email'],
        ['발송 템플릿 관리', '/marketing/templates'],
      ]),

      // 10. 예약/신청 관리
      branch('calendar', 'menu.reservations', '예약/신청 관리', '/reservations', [
        ['예약', '/reservations'],
        ['신청서', '/reservations/applications'],
        ['상담 예약', '/reservations/consultations'],
        ['예약 일정', '/reservations/schedule'],
      ]),
    ],
  },

  {
    title: '분석 · 운영',
    entries: [
      // 11. 통계
      branch('bar-chart', 'menu.stats', '통계', '/stats', [
        ['방문자 통계', '/stats/visitors'],
        ['회원 통계', '/stats/members'],
        ['매출 통계', '/stats/revenue'],
        ['주문 통계', '/stats/orders'],
        ['유입 분석', '/stats/traffic'],
        ['검색어 분석', '/stats/keywords'],
      ]),

      // 12. 로그 관리
      branch('scroll-text', 'menu.logs', '로그 관리', '/logs', [
        ['관리자 로그', '/logs/admin'],
        ['회원 활동 로그', '/logs/member-activity'],
        ['API 로그', '/logs/api'],
        ['오류 로그', '/logs/errors'],
      ]),

      // 13. 알림 관리
      branch('bell', 'menu.notifications', '알림 관리', '/notifications', [
        ['알림 발송', '/notifications/send'],
        ['이메일 템플릿', '/notifications/email-templates'],
        ['SMS 템플릿', '/notifications/sms-templates'],
      ]),
    ],
  },

  {
    title: '시스템',
    entries: [
      // 14. 시스템 설정
      branch('settings', 'menu.settings', '시스템 설정', '/settings', [
        ['사이트 설정', '/settings/site'],
        ['언어 관리', '/settings/languages'],
        ['API Key 관리', '/settings/api-keys'],
        ['OAuth 설정', '/settings/oauth'],
      ]),
    ],
  },
];

/** 사이드바에 등장하는 모든 잎 경로 — App.tsx 라우트 생성에 쓴다 */
export function collectNavRoutes(): readonly NavLeaf[] {
  const leaves: NavLeaf[] = [];
  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      if (entry.item.kind === 'leaf') leaves.push(entry.item);
      else leaves.push(...entry.item.children);
    }
  }
  return leaves;
}

/**
 * 현재 경로의 한국어 화면 명칭 — 헤더 제목에 쓴다.
 * 잎에서 정확히 못 찾으면 가지 라벨로 대체하고, 그것도 없으면 경로를 그대로 돌려준다.
 */
export function findNavLabel(pathname: string): string {
  const exact = collectNavRoutes().find((leaf) => leaf.to === pathname);
  if (exact !== undefined) return exact.label;

  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      const item = entry.item;
      if (item.kind === 'branch' && pathname.startsWith(item.basePath)) return item.label;
    }
  }
  return pathname;
}
