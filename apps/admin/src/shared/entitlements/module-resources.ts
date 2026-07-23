// 모듈(엔타이틀먼트 키) → 화면(권한 리소스) 매핑
//
// ┌ 왜 nav-config 를 건드리지 않는가 ────────────────────────────────────────┐
// │ nav-config.ts 는 **IA 의 정본**이다. 상용 패키징(무엇을 어느 플랜에 넣는가) │
// │ 은 IA 보다 훨씬 자주 바뀐다 — 영업이 번들을 재구성하는 주기와 정보구조를    │
// │ 재설계하는 주기는 다르다. 두 수명주기를 한 파일에 두면 매번 충돌하고,        │
// │ 메뉴를 옮기는 변경이 과금 변경처럼 보이게 된다. 그래서 매핑은 여기 산다.    │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [화면을 파생시킨다 — 키는 화면이 아니다]
// 엔타이틀먼트 키는 기능(모듈) 단위다(plan.ts). 화면과의 연결은 shared/permissions/resources.ts 가
// 이미 쓰는 규약(`page:{to}` · `group:{basePath}`)을 **그대로 재사용**해서 만든다. 두 축이 같은
// 좌표계를 쓰므로 AppShell 이 잎 하나를 두 번 판정할 때 서로 다른 것을 가리키지 않는다.
//
// [여기 없는 화면은 '해당 없음' 이다 — 차단이 아니다]
// 대부분의 화면(대시보드·사용자·설정·로그…)은 어떤 모듈에도 속하지 않는다. 그것들은 플랜과
// 무관하게 늘 열려 있어야 하는 앱의 뼈대다. 매핑이 없으면 granted 다 (route-entitlement.ts).
import { navGroupResourceId, navPageResourceId } from '../permissions/resources';
import type { ResourceId } from '../permissions/resources';
import { ENTITLEMENT_KEYS } from './plan';
import type { EntitlementKey } from './plan';

/**
 * 모듈이 지배하는 리소스 목록.
 *
 * 가지(group:)를 함께 적는 이유: 모듈 전체가 숨김(absent)이면 그 묶음의 **제목까지** 사라져야 한다.
 * 잎만 적으면 자식이 하나도 없는 빈 가지가 사이드바에 남는다.
 */
export const MODULE_RESOURCES: Readonly<Record<EntitlementKey, readonly ResourceId[]>> = {
  // 주문·배송 처리·클레임(취소/교환/반품)은 한 모듈이다 — 주문 없이 배송이나 환불만 파는 계약은 없다
  'commerce.orders': [
    navGroupResourceId('/orders'),
    navPageResourceId('/orders'),
    navPageResourceId('/orders/shipments'),
    navPageResourceId('/orders/claims'),
  ],

  // 상품의 '본체' — 쿼터 종이라 잠기지 않는다(한도를 넘겨도 화면은 열리고 등록만 막힌다).
  // 배송·쿠폰·적립금은 각자 다른 모듈이라 이 목록에서 빠져 있다.
  'commerce.products': [
    navGroupResourceId('/products'),
    navPageResourceId('/products'),
    navPageResourceId('/products/categories'),
    navPageResourceId('/products/reviews'),
    navPageResourceId('/products/inquiries'),
  ],
  'commerce.coupons': [navPageResourceId('/products/coupons')],
  'commerce.points': [navPageResourceId('/products/points')],
  // 배송 '정책'(배송비·택배사)만 여기다 — 실제 배송 처리는 주문 모듈로 옮겨 갔다(/orders/shipments)
  'commerce.shipping': [navPageResourceId('/products/shipping')],

  'sales.pipeline': [
    navGroupResourceId('/sales'),
    navPageResourceId('/sales/accounts'),
    navPageResourceId('/sales/contracts'),
    navPageResourceId('/sales/quotes'),
    navPageResourceId('/sales/inquiries'),
    navPageResourceId('/sales/projects'),
    // 청구·입금은 수주된 견적에서만 생긴다 — 견적이 플랜에 잠기는데 그 파생물이 안 잠기면
    // 잠금이 반쪽이 된다(매핑에 없으면 fail-open 이라 언제나 열린다).
    navPageResourceId('/sales/billing'),
  ],

  'cms.pages': [
    navGroupResourceId('/content'),
    navPageResourceId('/content/notices'),
    navPageResourceId('/content/faq'),
    navPageResourceId('/content/popups'),
    navPageResourceId('/content/banners'),
    navPageResourceId('/content/terms'),
    navPageResourceId('/content/privacy'),
    // 홈페이지 콘텐츠 — 지금 이 묶음에서 사이트에 싣는 것은 뉴스 하나다.
    // (페이지·메뉴·폼·미디어 화면은 IA 에서 제거됐다 — nav-config.ts 의 콘텐츠 관리 주석)
    navPageResourceId('/content/news'),
    // 채용 공고도 홈페이지 게시판이다 — 기업 관리 가지에 있을 뿐 파는 단위는 CMS 다
    navPageResourceId('/company/careers'),
  ],

  // 발송 채널은 계약이 갈린다 — 이메일만 있는 계약이 흔해 SMS 와 한 키로 묶지 않는다
  'marketing.email': [
    navPageResourceId('/marketing/newsletters'),
    navPageResourceId('/marketing/email'),
  ],
  'marketing.sms': [navPageResourceId('/marketing/sms')],

  'ai.agent': [
    navGroupResourceId('/ai'),
    navPageResourceId('/ai/chat'),
    navPageResourceId('/ai/conversations'),
  ],

  // 통계 묶음 자체는 늘 열린다 — 심화 리포트 세 화면만 상위 플랜의 것이다
  'stats.advanced': [
    navPageResourceId('/stats/revenue'),
    navPageResourceId('/stats/traffic'),
    navPageResourceId('/stats/keywords'),
  ],
};

/**
 * 리소스 → 모듈 (역인덱스).
 *
 * 한 리소스를 두 모듈이 주장하면 그 화면의 판정이 목록 순서에 좌우된다 — 조용히 갈리는 종류의
 * 버그라 테스트가 중복을 막는다(route-entitlement.test.ts 의 'MODULE_RESOURCES — 매핑 자체의
 * 불변식'). 매핑과 그것을 소비하는 경로 판정은 같은 사고로 함께 죽으므로 한 파일에서 본다 —
 * 파일 이름을 맞추자고 스위트를 쪼개면 중복 검사와 경로 판정이 서로를 못 보게 된다.
 */
const RESOURCE_TO_KEY: ReadonlyMap<ResourceId, EntitlementKey> = (() => {
  const map = new Map<ResourceId, EntitlementKey>();
  for (const key of ENTITLEMENT_KEYS) {
    for (const resourceId of MODULE_RESOURCES[key]) map.set(resourceId, key);
  }
  return map;
})();

/** 이 화면을 지배하는 모듈 — 어떤 모듈에도 속하지 않으면 null(= 플랜 대상이 아니다) */
export function entitlementKeyForResource(resourceId: ResourceId): EntitlementKey | null {
  return RESOURCE_TO_KEY.get(resourceId) ?? null;
}
