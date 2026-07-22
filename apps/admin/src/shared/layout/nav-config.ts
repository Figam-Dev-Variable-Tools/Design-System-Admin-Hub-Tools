// 사이드바 내비게이션 구조 정의.
//
// 이 파일이 어드민 메뉴의 단일 원천이다. 화면이 늘어날 때 여기만 고치면
// 사이드바(AppShell)와 라우트(App.tsx)가 함께 따라온다.
//
// 규칙
// - 가지(branch)는 자기 라우트를 갖지 않는다. 클릭하면 펼쳐질 뿐이다.
// - 잎(leaf)의 to 는 App.tsx 라우트와 1:1 대응한다. 아직 화면이 없으면 준비 중 화면으로 간다.
// - basePath 는 하위 경로의 공통 프리픽스 — 현재 경로가 여기 속하면 사이드바가 자동으로 펼친다.

import {
  INQUIRY_ARCHIVE_SUFFIX,
  inquiryMenuState,
  readInquiryBacklog,
} from '../commerce/inquiry-backlog';
import { INQUIRY_PATH, readPaymentSettings } from '../commerce/payment-settings';
import type { CommerceDomain } from '../commerce/payment-settings';
import type { FeatureKey } from '../permissions/feature-registry';

/**
 * 메뉴가 항상 보이지는 않는 조건 — **선언적 축**이다.
 *
 * `'pg-off'` : 결제(PG)를 쓰지 않는 동안에만 평소처럼 보인다. 결제를 켜면 그 메뉴로 새로 들어올
 * 것이 없으므로 사라지거나(잔여 0건) 읽기 전용으로 남는다(잔여 있음) — 판정은 resolveNavLeaf.
 *
 * 조건을 트리 **데이터**에 적는 이유: 사이드바 렌더 코드에 if 를 심으면 '어느 메뉴가 조건부인가'
 * 를 알려면 렌더 함수를 읽어야 한다. 메뉴는 데이터고, 조건도 메뉴의 성질이다.
 */
type NavVisibility = 'pg-off';

/** 잎 노드 — 실제 라우트로 이동하는 항목 */
interface NavLeaf {
  readonly kind: 'leaf';
  readonly label: string;
  readonly to: string;
  readonly visibleWhen?: NavVisibility;
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
  | 'box'
  | 'briefcase'
  | 'headset'
  | 'megaphone'
  | 'bar-chart'
  | 'scroll-text'
  | 'bell'
  | 'sparkles'
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
 * 같은 30줄 블록이 두 번 반복됐다 (클린코드 점검 축3 `clone:b0039e5b8ebf89b5` · `clone:fb9de3855927b0a8`).
 * 잎은 `[라벨, 경로]` 한 쌍이면 충분하고, 껍데기는 아래 두 함수가 한 벌만 갖는다.
 */

/** 잎 한 쌍 — [보이는 라벨, 라우트 경로] (+ 조건부 메뉴면 그 조건) */
type LeafSpec = readonly [label: string, to: string, visibleWhen?: NavVisibility];

function leaves(specs: readonly LeafSpec[]): readonly NavLeaf[] {
  // exactOptionalPropertyTypes — 조건이 없으면 키 자체를 만들지 않는다
  return specs.map(([label, to, visibleWhen]) => ({
    kind: 'leaf',
    label,
    to,
    ...(visibleWhen !== undefined && { visibleWhen }),
  }));
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
        // 동의·철회 기록 — 개인정보보호법상 의무이고 약관 개정 시 재동의 대상이 여기서 나온다
        ['동의 이력', '/users/consents'],
      ]),

      // 3. 콘텐츠 관리
      branch('file-text', 'menu.content', '콘텐츠 관리', '/content', [
        // 홈페이지 구조 → 게시판 → 자산 → 정책 순. 페이지가 먼저 있어야 메뉴가 가리킬 대상이 생긴다.
        ['페이지 관리', '/content/pages'],
        ['메뉴 관리', '/content/menus'],
        ['뉴스·보도자료', '/content/news'],
        ['폼 관리', '/content/forms'],
        ['미디어 라이브러리', '/content/media'],
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
        ['채용 공고', '/company/careers'],
      ]),
    ],
  },

  {
    title: '비즈니스',
    entries: [
      // 5. 주문 관리 — 커머스의 뿌리. 등록 폼이 없다: 주문은 고객의 결제가 만든다.
      //    반품·적립 원장·통계가 그동안 해석되지 않는 orderNo 문자열로 가리키던 대상이 여기다.
      //    '교환/반품' 은 원래 상품 관리 밑에 있었지만, 취소가 축으로 들어오면서 **클레임 한 축**이
      //    됐고 셋 다 주문에 매달린 사실이라 이리로 옮겼다(취소 없는 반품 화면이 '취소관리' 링크를
      //    받아 내던 것이 그 어긋남의 증상이었다).
      branch('shopping-bag', 'menu.orders', '주문 관리', '/orders', [
        ['주문', '/orders'],
        ['배송 처리', '/orders/shipments'],
        ['취소/교환/반품', '/orders/claims'],
      ]),

      // 6. 포트폴리오 관리
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
        ['쿠폰', '/products/coupons'],
        ['적립금', '/products/points'],
        ['리뷰', '/products/reviews'],
        // 결제(PG)를 쓰지 않는 설정에서는 구매 버튼이 '문의하기'가 된다 — 그 문의가 여기로 들어온다.
        // 결제를 켜면 새 문의가 생기지 않으므로 이 항목은 사라진다(잔여가 남아 있으면 읽기 전용).
        ['문의', '/products/inquiries', 'pg-off'],
      ]),

      // 7. 프로그램 관리 — 후원형 펀딩(목표 금액·기간을 걸고 여는 프로그램)
      //    '프로그램' 은 등록된 프로그램 **목록**이다(목록 > 상세). 등록·수정은 메뉴가 아니라 목록의
      //    CTA·행 액션으로 들어가 같은 등록 화면(ProgramFormPage)을 연다 — 메뉴에 '등록' 을 따로 걸면
      //    목록을 거치지 않는 우회로가 생겨 수정 경로와 갈라진다. 펀딩 진행 현황(달성률·남은 일수)은
      //    목록의 열과 상세가 이미 말하므로 별도 화면을 두지 않는다.
      branch('box', 'menu.programs', '프로그램 관리', '/programs', [
        ['프로그램', '/programs'],
        ['카테고리', '/programs/categories'],
        // 상품과 같은 이유 — PG 미사용 설정에서 후원 버튼이 '문의하기'로 바뀌면 여기로 들어온다
        ['문의', '/programs/inquiries', 'pg-off'],
      ]),

      // 8. 영업 관리
      branch('briefcase', 'menu.sales', '영업 관리', '/sales', [
        ['거래처', '/sales/accounts'],
        ['계약', '/sales/contracts'],
        ['견적', '/sales/quotes'],
        // 수주 전환 다음 마디 — PG 없이 파는 운영에서 실질적인 '결제'가 여기다
        ['청구·입금', '/sales/billing'],
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
        // 메시지 템플릿이 이 자리의 화면이다 — 이메일·문자에 더해 알림톡·브랜드메시지까지 한 목록이
        // 덮는다(종류는 목록의 '만들기' 다이얼로그에서 고른다). 템플릿 메뉴는 이 하나뿐이다.
        ['발송 템플릿 관리', '/marketing/templates'],
      ]),
    ],
  },

  {
    title: 'AI',
    entries: [
      // 10. AI 에이전트 — 멘션한 데이터를 조건으로 조회한다 (언어 모델 미연동)
      branch('sparkles', 'menu.ai', 'AI 에이전트', '/ai', [
        ['새 채팅', '/ai/chat'],
        ['대화 목록', '/ai/conversations'],
      ]),
    ],
  },

  {
    title: '분석 · 운영',
    entries: [
      // 10. 통계
      branch('bar-chart', 'menu.stats', '통계', '/stats', [
        ['방문자 통계', '/stats/visitors'],
        ['회원 통계', '/stats/members'],
        ['매출 통계', '/stats/revenue'],
        ['주문 통계', '/stats/orders'],
        ['유입 분석', '/stats/traffic'],
        ['검색어 분석', '/stats/keywords'],
      ]),

      // 11. 로그 관리
      branch('scroll-text', 'menu.logs', '로그 관리', '/logs', [
        ['관리자 로그', '/logs/admin'],
        ['회원 활동 로그', '/logs/member-activity'],
        ['API 로그', '/logs/api'],
        ['오류 로그', '/logs/errors'],
      ]),
    ],
  },

  {
    title: '시스템',
    entries: [
      // 12. 시스템 설정
      branch('settings', 'menu.settings', '시스템 설정', '/settings', [
        ['사이트 설정', '/settings/site'],
        // 바깥(B2C 홈페이지)과의 연결 — 유입 채널의 정본이 여기다
        ['사이트 연동', '/settings/site-connect'],
        // [경로는 라벨을 따라 바꾸지 않는다] 경로는 북마크와 권한 리소스 키(navPageResourceId)가
        // 매달린 내부 식별자다 — 라벨을 고칠 때 같이 바꾸면 저장된 역할의 권한 키가 어긋나 화면이
        // 통째로 안 보인다. 경로 정리는 권한 마이그레이션을 동반하는 별도 판단이다.
        //
        // [라벨 이력] 원래 API Key 발급·회수 화면이었다가 그 서브시스템이 삭제되고 AI 모델
        // 프로바이더 카탈로그로 교체되면서 한때 'AI 모델 연동' 으로 정정했다. 이후 화면이 프로바이더
        // 자격증명(= API Key) 입력·검증까지 갖추면서 오너 판단으로 'API Key 설정' 으로 되돌렸다
        // (2026-07-20). 두 이름 다 이 화면을 가리키며, 지금 라벨은 경로(`api-keys`)와도 맞는다.
        ['API Key 설정', '/settings/api-keys'],
        ['OAuth 설정', '/settings/oauth'],
        // 결제 연동 여부가 상품·프로그램의 구매/후원 버튼을 '문의하기'로 바꾼다 — 판매 방식의 스위치다
        ['결제 설정', '/settings/payment'],
        // 구독·계약이 무엇을 열어 주는지 보는 화면 — 읽기 전용이다(플랜 변경은 사내 홈페이지 소관)
        ['플랜·이용 현황', '/settings/plan'],
        ['알림 설정', '/settings/notifications'],
        ['다국어 설정', '/settings/languages'],
      ]),
    ],
  },
];

/** 이 문의 창구가 상품의 것인가 프로그램의 것인가 — 경로가 곧 도메인이다 */
function inquiryDomainOf(to: string): CommerceDomain {
  return to === INQUIRY_PATH.program ? 'program' : 'product';
}

/**
 * 조건부 잎을 지금 상태에 맞춰 푼다 — 감출 것이면 null, 남길 것이면 (필요하면 라벨을 고쳐) 돌려준다.
 *
 * [왜 사이드바가 아니라 여기인가] 판정 자체는 결제 설정과 잔여 문의의 일이라 shared/commerce 가
 * 갖는다(inquiryMenuState). 여기서 하는 일은 그 답을 **메뉴의 말**로 옮기는 것뿐이다 —
 * 사라지거나, 라벨에 읽기 전용 꼬리표가 붙거나.
 *
 * [라우트는 사라지지 않는다] collectNavRoutes 는 이 함수를 지나지 않는다. 메뉴에서 감춰도 URL 로
 * 들어온 과거 문의 화면은 살아 있어야 한다 — 감추는 것과 없애는 것은 다른 결정이다.
 */
export function resolveNavLeaf(leaf: NavLeaf): NavLeaf | null {
  if (leaf.visibleWhen !== 'pg-off') return leaf;

  const domain = inquiryDomainOf(leaf.to);
  const state = inquiryMenuState(readPaymentSettings(), readInquiryBacklog(domain));

  if (state === 'open') return leaf;
  if (state === 'hidden') return null;
  // 남은 문의가 있다(또는 아직 모른다) — 지우면 과거 문의가 접근 불가가 된다
  return { ...leaf, label: `${leaf.label}${INQUIRY_ARCHIVE_SUFFIX}` };
}

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
 * `to` 가 pathname 을 **세그먼트 경계에서** 감싸는가.
 *
 * 단순 startsWith 는 '/products' 가 '/products-archive' 를 삼킨다 — 남남인 두 화면이 같은 이름을
 * 갖게 된다. 그래서 정확히 같거나, 뒤에 '/' 가 오는 경우만 인정한다.
 */
function covers(to: string, pathname: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * 이 경로가 속한 **가지의 basePath** — 어떤 가지에도 속하지 않으면 null (예: '/dashboard').
 *
 * 사이드바가 "한 번에 한 가지만 펼친다" 를 지키려면 '지금 열려 있어야 할 가지' 를 물어볼 곳이
 * 하나 있어야 한다. 그 답은 메뉴 트리만 알고 있으므로 여기가 그 자리다.
 *
 * 가장 **긴** basePath 를 고른다 — 가지끼리 프리픽스가 겹치면 얕은 쪽이 먼저 걸려 엉뚱한 가지가
 * 열린다. 경계 판정은 findCoveringLeaf 와 같은 covers() 를 쓴다.
 */
export function findCoveringBranch(pathname: string): string | null {
  let best: string | null = null;

  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      const item = entry.item;
      if (item.kind !== 'branch') continue;
      if (!covers(item.basePath, pathname)) continue;
      if (best === null || item.basePath.length > best.length) best = item.basePath;
    }
  }

  return best;
}

/**
 * 이 경로를 지배하는 **가장 구체적인 잎** — 어떤 잎에도 속하지 않으면 null.
 *
 * 라우트는 잎보다 많다: '/company/history' 는 잎이지만 '/company/history/new' 와
 * '/company/history/12/edit' 는 잎이 아니다(사이드바에 없다). 그 서브라우트들이 '자기가 누구인지'
 * 물으면 답할 자리가 여기다. 규칙은 하나다 — **자기를 감싸는 가장 긴 잎이 곧 자기다.**
 *
 * 이 규칙은 권한(permissions/route-resource.ts)이 이미 쓰고 있었다. 화면 제목이 같은 질문에
 * 다른 규칙으로 답하고 있었기에 둘의 답이 갈렸다(아래 findNavLabel 참조) — 이제 한 곳이 답한다.
 */
export function findCoveringLeaf(pathname: string): NavLeaf | null {
  let best: NavLeaf | null = null;

  for (const leaf of collectNavRoutes()) {
    if (!covers(leaf.to, pathname)) continue;
    // 더 긴 잎이 더 구체적이다 — '/products/categories' 가 '/products' 를 이긴다
    if (best === null || leaf.to.length > best.to.length) best = leaf;
  }

  return best;
}

/**
 * 현재 경로의 한국어 화면 명칭 — 앱에서 가장 많이 보이는 `<h1>` 이자 라우트 이동 시
 * 스크린리더가 읽는 이름이다 (AppHeader · RouteFocusAnnouncer).
 *
 * [IA-02 — 서브라우트 제목이 전부 틀렸던 이유]
 * 예전에는 **정확히 일치하는 잎**만 찾고, 못 찾으면 **가지 라벨**로 떨어뜨렸다. 그래서 잎이 아닌
 * 라우트 — 즉 모든 `/new` 와 `/:id/edit` 화면 — 이 자기 이름 대신 섹션 이름을 달았다:
 *   '/company/history/new'  → '기업 관리'   (기대: '연혁')
 *   '/products/9/edit'      → '상품 관리'   (기대: '상품 관리 > 상품' 의 '상품')
 * 26개 화면 대부분이 해당됐다. h1 이 틀리면 스크린리더 사용자는 **어느 폼에 들어왔는지 모른다** —
 * 모든 등록/수정 화면이 같은 이름으로 announce 됐다.
 *
 * 이제 '자기를 감싸는 가장 구체적인 잎' 을 쓴다(findCoveringLeaf). 등록/수정 같은 **행위**는
 * 제목에 넣지 않는다: 그 문구는 nav 에 없고, 여기서 지어내면 레이아웃이 카피를 발명하게 된다.
 * 화면이 등록인지 수정인지는 폼 자신이 말한다(FormPageShell 의 cardTitle · 제출 버튼).
 */
export function findNavLabel(pathname: string): string {
  return findCoveringLeaf(pathname)?.label ?? pathname;
}
