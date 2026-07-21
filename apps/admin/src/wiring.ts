// 도메인 배선 — 서로를 모르는 두 도메인을 합성 지점에서 잇는다
//
// [왜 필요한가] 관리자 그룹 삭제 가드는 "이 그룹을 발신 프로필로 쓰는 템플릿이 있나?" 를 알아야
// 하는데 그 답은 메시지 템플릿(마케팅)이 갖고 있다. 관리자 화면이 마케팅 스토어를 직접 import
// 하면 pages/admins → pages/marketing 결합이 되고 code-quality 축1 이 blocker 로 잡는다.
// 그래서 공통 층이 조회기의 **자리만** 만들고(shared/fixtures/admin-groups.ts), 구현을 꽂는 일은
// 두 도메인을 모두 아는 이 파일이 한다. 화면끼리는 끝까지 서로를 모른다.
//
// [왜 App.tsx 가 아니라 별도 파일인가] 배선은 앱이 뜰 때도, **테스트가 그 경로를 밟을 때도** 필요하다.
// App.tsx 안에 두면 페이지 단위 테스트는 App 을 렌더하지 않으므로 배선이 빠진 채로 돈다 — 그러면
// 조회기가 없어 삭제가 전부 거절되고(fail-closed), 테스트는 제품이 아니라 미배선 상태를 검증하게 된다.
// import 한 번으로 끝나는 부수효과라 파일 하나로 떼어 두 곳이 같은 것을 쓰게 한다.
//
// [AI 도메인 배선은 여기 없다 — wiring-ai.ts] 이유는 같지만 비용이 다르다. 그쪽은 상품·문의
// 스토어를 통째로 끌어오므로, 여기 두면 `wireDomains()` 를 부르는 운영자 그룹 테스트가 자기와
// 무관한 픽스처까지 매번 적재한다. 배선은 필요한 곳만 지불하면 된다.
import { registerSenderUsageLookup } from './shared/fixtures/admin-groups';
import { templateNamesBySenderProfile } from './pages/marketing/message-templates/store';
import { registerTemplateVariableCatalog } from './shared/domain/template-variables';
import { TEMPLATE_VARIABLE_CATALOG } from './shared/domain/template-variable-catalog';
import { registerPublishedFaqLookup } from './shared/domain/faq-catalog';
import { registerCouponCatalogLookup } from './shared/domain/coupon-catalog';
import { listCatalogCoupons, listTierUpCoupons } from './pages/products/coupons/data-source';
import { registerTierUpCouponLookup } from './shared/domain/coupon-issuance';
import { registerOrderLookup } from './shared/domain/order-ref';
import { registerStockApplier, applyMovements } from './shared/domain/stock';
import { listOrderRefs } from './pages/orders/data-source';
import { listProducts, updateProduct } from './pages/products/_shared/store';
import { toProductInput } from './pages/products/items/types';
import { registerBannerCatalogLookup, toBannerCatalog } from './shared/domain/banner-catalog';
import { BANNERS } from './pages/content/banners/data-source';
import { listPublishedFaqs } from './pages/content/faq/data-source';
import { registerSitePolicyLookup } from './shared/domain/site-policy';
import { siteSettingsStore } from './pages/settings/site/data-source';
import { registerSupplierLookup } from './shared/domain/supplier';
import type { SupplierInfo } from './shared/domain/supplier';
import { companyProfileKey, companyProfileStore } from './pages/company/profile/data-source';
import type { CompanyProfile } from './pages/company/profile/types';
import { queryClient } from './shared/query/queryClient';
import { registerRoleAssigneeCountLookup } from './shared/permissions/permission-store';
import { listAdmins } from './pages/admins/fixtures';

/**
 * 배선을 건다 — 여러 번 불러도 결과가 같다(멱등).
 *
 * 테스트는 파일마다 모듈을 새로 들여올 수 있으므로 '한 번만 호출' 을 요구하지 않는다.
 */
export function wireDomains(): void {
  registerSenderUsageLookup(templateNamesBySenderProfile);

  // 치환 변수 카탈로그 — 6개 도메인(회원·영업·콘텐츠·상품·포트폴리오·고객센터)의 값 목록을
  // 마케팅 편집기가 쓸 수 있게 꽂는다.
  //
  // [왜 편집기가 직접 import 하지 않나] 그러면 '어떤 목록을 쓰는가' 를 편집기가 정하게 된다.
  // 카탈로그는 6개 도메인의 지식이고 편집기는 마케팅의 것이라 소유자가 다르다 — 소유자가
  // 다른 둘을 잇는 자리가 여기다(이 파일 머리말의 첫 문단과 같은 이유).
  //
  // [배선 전에는 '모른다'] 등록되지 않으면 조회기가 빈 배열이 아니라 null 을 준다. 발신 프로필
  // 쪽의 fail-closed 와 반대 방향인 이유는 template-variables.ts 머리말에 적었다 — 요약하면,
  // 빈 목록으로 뭉개면 '알 수 없는 토큰' 경고가 멀쩡한 본문을 전부 오타로 신고한다.
  registerTemplateVariableCatalog(TEMPLATE_VARIABLE_CATALOG);

  // 고객센터 FAQ 큐레이션이 읽을 원본 — 정본은 콘텐츠 관리 FAQ 다.
  //
  // [왜 고객센터가 직접 부르지 않나] pages/support → pages/content 는 페이지 간 결합이다(축1).
  // 그리고 방향도 틀렸다 — '무엇을 큐레이션할 수 있는가' 는 작성 쪽이 답하는 질문이지 큐레이션
  // 화면이 고를 문제가 아니다. 큐레이션 화면은 조회기가 주는 목록 위에 노출·BEST·순서만 얹는다
  // (shared/domain/faq-catalog.ts 머리말).
  registerPublishedFaqLookup(listPublishedFaqs);

  // 프로모션의 쿠폰 연동·회원 상세의 보유 쿠폰이 참조할 원본 — 정본은 상품 관리 쿠폰이다.
  // pages/marketing → pages/products, pages/members → pages/products 는 둘 다 축1(page-coupling)
  // 위반이라, 공통 층이 자리를 만들고(shared/domain/coupon-catalog.ts) 두 도메인을 아는 여기가 꽂는다.
  registerCouponCatalogLookup(listCatalogCoupons);

  // 등급 정책 화면의 '승급 시 발급 쿠폰' 요약이 읽을 원본 — 정본은 상품 관리 쿠폰의 발급 기준이다.
  // pages/customer-settings → pages/products 는 축1(page-coupling) 위반이라 공통 층이 자리를 만들고
  // (shared/domain/coupon-issuance.ts) 두 도메인을 아는 여기가 꽂는다.
  registerTierUpCouponLookup(listTierUpCoupons);

  // 반품의 orderNo·적립 원장의 orderNo·통계가 주문을 가리킬 때 푸는 목록 — 정본은 주문 관리다.
  // pages/products → pages/orders, pages/members → pages/orders 는 축1 위반이라 방향을 뒤집었다.
  registerOrderLookup(listOrderRefs);

  // 주문의 재고 차감·복원이 실제로 닿는 곳 — SKU 재고의 정본은 상품 저장소다.
  // shared → pages 역의존을 피하려고 공통 층은 자리만 만들고 여기가 구현을 꽂는다.
  // 꽂히지 않으면 어댑터가 멱등키를 찍지 않는다 — 재고가 안 움직였는데 '차감 완료'가 남는 일이 없다.
  registerStockApplier((movements) => {
    const skus = new Set(movements.map((movement) => movement.sku));
    for (const product of listProducts()) {
      if (!product.variants.some((variant) => skus.has(variant.sku))) continue;
      updateProduct(product.id, {
        ...toProductInput(product),
        variants: applyMovements(product.variants, movements),
      });
    }
  });

  // 이벤트의 배너 연동이 참조할 원본 — 정본은 콘텐츠 관리 배너다(pages/marketing → pages/content 역시 축1).
  // BANNERS 는 노출 토글·재정렬이 갱신하는 mutable 바인딩이라 호출 시점에 읽는다.
  registerBannerCatalogLookup(() => toBannerCatalog(BANNERS));

  // 역할 삭제 가드가 물어보는 것 — '이 역할을 든 운영자가 몇 명인가'.
  //
  // [왜 권한 층이 직접 세지 않나] 그러면 shared/permissions → pages/admins 결합이 된다(축1,
  // 임계치 0). 그리고 방향이 틀렸다 — '누가 어떤 역할인가' 는 운영자 명부가 답하는 질문이고,
  // 권한 층은 역할이 무엇을 할 수 있는지만 안다(roles.ts 머리말). 위의 발신 프로필 조회기와
  // 똑같은 이음매다: 공통 층이 자리를 만들고, 두 도메인을 아는 이 파일이 구현을 꽂는다.
  //
  // [배선 전에는 삭제가 전부 막힌다] 조회기가 없으면 조회 결과가 0 이 아니라 null(확인 불가)이고,
  // roleDeletionBlock 이 그때도 거절한다 — 모르는 채로 지우게 두지 않는다(fail-closed).
  registerRoleAssigneeCountLookup(
    (roleId) => listAdmins().filter((admin) => admin.roleId === roleId).length,
  );

  wireSitePolicy();
  wireSupplier();
}

/**
 * 사이트 기본 설정을 발송 화면·로그인 화면이 읽을 수 있게 꽂는다.
 *
 * [왜 여기인가] pages/marketing → pages/settings, pages/login → pages/settings 는 둘 다 축1
 * 위반이다. 공통 층(shared/domain/site-policy.ts)이 계약과 등록기를 갖고, 두 도메인을 모두 아는
 * 이 파일이 구현을 넣는다 — 이 파일 머리말의 첫 문단과 같은 이유다.
 *
 * [왜 peek() 인가] 조회기 계약이 동기(`() => SitePolicy`)라 Promise 를 돌려줄 수 없다. 픽스처
 * 저장소는 그 자리를 위해 peek 을 내보낸다(settings/_shared/store.ts 의 머리말이 같은 사정을
 * AI 프로바이더 조회기에 대해 적어 두었다). 백엔드가 붙으면 이 한 줄은 react-query 캐시 읽기로
 * 바뀐다 — 아래 공급자 배선이 이미 그 모양이다.
 *
 * [전용 이름이 꺼져 있으면 사이트 이름] 어느 쪽을 쓸지는 **설정 도메인의 규칙**이다(화면의 안내
 * 문구가 그렇게 말한다). 읽는 쪽이 그 분기를 알면 SMS·이메일·뉴스레터가 각자 다시 분기하게 되고,
 * 한 곳만 고쳐진 채 나머지가 남는다. 그래서 판단을 여기서 끝내고 결과만 넘긴다.
 */
function wireSitePolicy(): void {
  registerSitePolicyLookup(() => {
    const { value } = siteSettingsStore.peek();
    const dedicated = value.messagingName.trim();
    return {
      messagingName: value.messagingNameEnabled && dedicated !== '' ? dedicated : value.siteName,
      keepSignedIn: value.keepSignedIn,
    };
  });
}

/** 회사 정보 → 견적서가 인쇄하는 공급자 정보. 필드 대응은 여기 한 곳에서만 정한다 */
function toSupplier(profile: CompanyProfile): SupplierInfo {
  return {
    name: profile.companyName,
    bizNo: profile.businessNumber,
    ceoName: profile.ceoName,
    address: profile.address,
    phone: profile.contact,
  };
}

/**
 * 견적서 공급자(자사) 블록의 값을 회사 정보에서 끌어온다.
 *
 * [왜 여기인가] pages/sales → pages/company 는 축1 위반이다. 견적 화면은 조회기가 주는 값만
 * 인쇄하고 '회사 정보' 라는 모듈을 끝까지 모른다(shared/domain/supplier.ts 머리말).
 *
 * [왜 store 가 아니라 캐시를 읽나] 회사 정보 저장소는 `createDocumentStore` 라 동기 peek 이 없다
 * (그 표면은 시스템 설정 저장소에만 있다). 대신 **react-query 캐시**를 읽는다 — 어차피 백엔드가
 * 붙으면 '지금 값' 을 동기로 아는 유일한 통로가 캐시다(settings/_shared/store.ts 의 peek 머리말이
 * 같은 이전 경로를 적어 두었다). 회사 정보 화면의 저장은 이 키를 무효화하므로, 저장 직후 다시
 * 채워진 캐시가 곧바로 견적서에 반영된다.
 *
 * [왜 미리 한 번 채우나] 캐시는 그 화면을 한 번도 열지 않았으면 비어 있다. 그대로 두면 회사
 * 정보를 멀쩡히 등록해 둔 계정도 견적서에서 '(회사 정보 미등록)' 폴백을 본다 — 배선이 있는데
 * 없는 것처럼 보이는 상태다. 앱이 뜰 때 한 번만 채워 그 구멍을 막는다(실패해도 폴백이 받는다).
 */
function wireSupplier(): void {
  registerSupplierLookup(() => {
    const profile = queryClient.getQueryData<CompanyProfile>(companyProfileKey);
    return profile === undefined ? null : toSupplier(profile);
  });

  if (queryClient.getQueryData(companyProfileKey) === undefined) {
    void queryClient.prefetchQuery({
      queryKey: companyProfileKey,
      queryFn: ({ signal }) => companyProfileStore.fetch(signal),
    });
  }
}
