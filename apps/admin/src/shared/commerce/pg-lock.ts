// 결제(PG)를 쓰지 않을 때 **무엇이 잠기는가** — 축 A 의 화면별 파급을 한 곳에 모은 표
//
// [왜 표가 하나여야 하나] 잠금 판정을 화면마다 쓰면 상품 폼은 적립을 잠갔는데 쿠폰 화면은 열려
// 있는 상태가 생긴다. 운영자는 그때 "적립은 왜 안 되고 쿠폰은 되지?" 를 묻고, 답은 아무 데도
// 없다. 규칙이 하나면 화면이 늘어도 대답이 갈리지 않는다.
//
// [잠금은 값을 지우지 않는다 — 이 파일의 제1원칙]
// 잠긴 섹션의 입력은 disabled 가 되지만 저장된 값은 그대로 남는다. PG 를 다시 켜면 적립률·쿠폰
// 설정·배송비가 **저장해 둔 그대로** 살아난다. 지우는 구현은 되돌릴 수 없다: 운영자는 결제를
// 잠시 끄는 것과 정책을 폐기하는 것을 구분해서 하고 있는데, 코드가 그 둘을 같은 것으로 만든다.
//
// [무엇이 잠기지 '않는가' 도 규칙이다]
//   · 옵션(색상·사이즈)은 잠기지 않는다 — 결제가 없어도 '무엇을 문의하는가' 의 축이라
//     견적 품목 명세로 그대로 쓰인다. 잠기는 것은 그 옆의 **재고 수량**뿐이다(차감 주체인
//     주문이 없다).
//   · 상품 등록·수정 자체도 잠기지 않는다 — 카탈로그는 결제와 무관하게 계속 자란다.
import { pgSellable } from './payment-settings';
import type { PaymentSettings } from './payment-settings';

/**
 * 잠금이 걸리는 자리들 — 화면이 아니라 **섹션** 단위다.
 *
 * 한 화면이 여러 섹션을 갖는다(상품 폼 = 적립금 + 쿠폰 + 재고 + 배송). 화면 단위로 잠그면
 * 상품 등록 자체가 막혀 카탈로그를 못 만든다.
 */
export const PG_LOCK_SECTIONS = [
  'product-points',
  'product-coupons',
  'product-stock',
  'product-shipping',
  'coupon-admin',
  'points-policy',
] as const;

export type PgLockSection = (typeof PG_LOCK_SECTIONS)[number];

/** 지금 이 섹션의 상태 — 화면은 locked 로 입력을 잠그고 reason 을 그대로 보여 준다 */
export interface PgLock {
  readonly locked: boolean;
  /** 왜 잠겼는지. 잠기지 않았으면 빈 문자열 */
  readonly reason: string;
}

const OPEN: PgLock = { locked: false, reason: '' };

/**
 * 섹션별 사유 — **결과가 아니라 원인**을 적는다.
 *
 * '사용할 수 없습니다' 는 운영자에게 아무것도 알려 주지 않는다. 알아야 할 것은 '결제가 없어서'
 * 이고, 그 다음 행동(결제 설정 열기)은 잠금 UI(PgLockNotice)가 링크로 붙인다.
 */
const LOCK_REASON: Readonly<Record<PgLockSection, string>> = {
  'product-points': '결제가 없어 적립이 발생하지 않아요. 저장된 적립 설정은 그대로 보존돼요.',
  'product-coupons':
    '결제가 없어 쿠폰을 사용할 시점이 없어요. 저장된 쿠폰 사용 설정은 그대로 보존돼요.',
  'product-stock':
    '결제가 없어 재고를 차감할 주문이 들어오지 않아요. 옵션 구성은 계속 편집할 수 있어요 — 문의로 받은 요청의 품목 명세가 돼요.',
  'product-shipping':
    '배송비는 결제 금액의 일부라 결제가 없는 동안에는 계산되지 않아요. 저장된 배송 설정은 그대로 보존돼요.',
  'coupon-admin':
    '결제가 없어 쿠폰을 사용할 시점이 없어요. 기존 쿠폰은 조회할 수 있고, 새 발급과 발급 기준 변경만 멈춰요.',
  'points-policy':
    '결제가 없어 적립이 발생하지 않아요. 정책은 열어 두되 저장은 결제를 켠 뒤에 반영하세요.',
};

/**
 * 이 섹션이 지금 잠기는가 — **파생값이다. 어디에도 저장하지 않는다.**
 *
 * 판정 근거는 pgSellable 하나다(축 A). usePg 를 직접 읽지 않는 이유는 payment-settings.ts 에
 * 적었다 — 켜 두고 상점 ID 가 비어 있으면 결제창은 열리지 않는다.
 */
export function pgLock(settings: PaymentSettings, section: PgLockSection): PgLock {
  if (pgSellable(settings)) return OPEN;
  return { locked: true, reason: LOCK_REASON[section] };
}
