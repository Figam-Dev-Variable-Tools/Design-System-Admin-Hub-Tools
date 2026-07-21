// 회원 도메인 모델
//
// [왜 페이지 밖에 있는가] 회원(등급·그룹·상세)은 **회원 화면만의 것이 아니다.**
//   - 운영자 관리(/users/admins)  : 운영자 상세를 같은 MemberDetail 로 내려준다
//   - 고객 설정(/users/settings)  : 등급(MemberTier) 위에 승급 정책을 얹는다
// 예전에는 이 타입들이 pages/members/types.ts 에 있었고 다른 화면이 회원 화면을 가로질러
// import 했다. 회원 화면을 지우면 나머지가 깨졌다. 그래서 도메인은 페이지 밖으로 나왔다.
//
// [무엇이 여기 없는가] 화면 전용 상수(페이지 크기·모달 입력 폼 옵션·메모 길이 제한)는
// 여기 두지 않는다 — 그건 그 페이지의 관심사다 (pages/members/types.ts).
import { couponsById } from './coupon-catalog';
import type { CatalogCoupon } from './coupon-catalog';

/**
 * 회원 등급.
 *
 * 고객은 **회원가입으로만 유입된다** — 관리자가 회원을 직접 생성하는 경로는 없다(요구사항).
 * 등급은 가입 이후 운영 정책(고객 설정 화면)에 따라 승급/조정된다.
 */
export type MemberTier = 'normal' | 'vip' | 'vvip';

export const TIER_LABEL: Record<MemberTier, string> = {
  normal: '일반회원',
  vip: 'VIP',
  vvip: 'VVIP',
};

interface TierFilterDef {
  /** 'all' 은 등급 무관 전체 */
  readonly id: MemberTier | 'all';
  readonly label: string;
}

export const TIER_FILTERS: readonly TierFilterDef[] = [
  { id: 'all', label: '전체 사용자' },
  { id: 'normal', label: '일반 사용자' },
  { id: 'vip', label: 'VIP 사용자' },
  { id: 'vvip', label: 'VVIP 사용자' },
];

/* ── 회원 그룹 ────────────────────────────────────────────────────────────
 *
 * 등급(tier)과 그룹(group)은 다른 축이다.
 * - 등급: 가입 후 운영 정책에 따라 오르내리는 회원 단계 (일반/VIP/VVIP)
 * - 그룹: 관리자가 만드는 임의의 묶음 (배송비 혜택 등 정책을 붙인다)
 * 좌측 패널에서 둘을 함께 고르면 **AND** 로 걸린다.
 */

export interface MemberGroup {
  readonly id: string;
  readonly label: string;
}

/** 그룹별 회원 수 — 좌측 그룹 목록에 배지로 붙는다 (키 = 그룹 id) */
export type GroupCounts = Readonly<Record<string, number>>;

/** 등급별 회원 수 — 좌측 필터에 배지로 붙는다 */
export type TierCounts = Readonly<Record<MemberTier | 'all', number>>;

/** 글/댓글/구매평/문의 활동 카운트 */
interface MemberActivity {
  readonly posts: number;
  readonly comments: number;
  readonly reviews: number;
  readonly inquiries: number;
}

export interface Member {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  readonly tier: MemberTier;
  /** 그룹 id — 필터가 이 값으로 건다 */
  readonly groupId: string;
  /** 그룹 표시명 — 표/CSV 가 그대로 쓴다 */
  readonly group: string;
  /** ISO yyyy-mm-dd — 표시할 때 '4시간전' 같은 상대 시각으로 바뀔 수 있다 */
  readonly joinedAt: string;
  /**
   * ISO 8601 date-time — 상대 시각('4시간전')은 시/분이 있어야 계산된다.
   * 날짜만 필요한 곳(CSV 등)은 joinedAt 을 그대로 쓴다.
   */
  readonly joinedAtIso: string;
  readonly points: number;
  readonly activity: MemberActivity;
  readonly totalPurchase: number;
  readonly memo: string;
}

/* ── 회원 상세 ────────────────────────────────────────────────────────────
 *
 * [읽기 전용 원칙] 상세 화면의 회원 정보는 **표시만** 한다. 관리자가 고칠 수 있는 것은
 * 비밀번호뿐이다(계정 복구 목적). 그래서 아래 필드에는 '수정 가능' 개념이 없고,
 * 화면도 입력 컨트롤이 아니라 dl/dt/dd 텍스트로 렌더한다.
 *
 * [운영자 상세도 이 타입이다] /users/admins/:id 는 회원 상세 화면을 그대로 재사용한다.
 */

/** 동의 항목 1건 — 비활성 체크박스(읽기 전용)로 표시된다 */
interface ConsentItem {
  readonly id: string;
  readonly label: string;
  readonly agreed: boolean;
  /** 'YYYY-MM-DD HH:mm' — 미동의면 null */
  readonly agreedAt: string | null;
}

/** 동의 묶음 — '마케팅 활용 및 광고 수신 동의'처럼 하위 항목이 여럿일 수 있다 */
export interface ConsentGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ConsentItem[];
}

/** 적립금 증감 내역 1행 */
export interface PointEntry {
  readonly id: string;
  /** ISO yyyy-mm-dd */
  readonly date: string;
  readonly reason: string;
  /** 관련 주문번호 — 수기 지급/차감이면 null */
  readonly orderNo: string | null;
  /** 양수 = 지급, 음수 = 차감 */
  readonly amount: number;
}

/* ── 보유 쿠폰 = 발급(issuance) ────────────────────────────────────────────
 *
 * [예전엔 '쿠폰' 이 두 개였다] 여기에는 `Coupon { id, name, benefit, expiresAt }` 가 있었고,
 * 상품 관리(pages/products/coupons)에는 코드·발급유형·수량·기간을 가진 전혀 다른 `Coupon` 이
 * 있었다. 같은 이름, 다른 것. 회원 픽스처는 '00001-C1' 처럼 카탈로그와 무관한 id 를 지어냈고,
 * 그래서 **회원 상세의 보유 쿠폰과 쿠폰 관리의 발급 수량은 영원히 어긋났다.**
 *
 * 회원이 들고 있는 것은 쿠폰의 '정의' 가 아니라 그 정의의 **발급 1건**이다. 그래서 모델은
 * 카탈로그를 가리키는 참조(couponId)와 발급/사용 시각만 갖고, 이름·혜택·만료일 같은 표시값은
 * 카탈로그에서 조인해 온다(joinIssuedCoupons). 이름도 `IssuedCoupon` 으로 갈라 두 낱말이
 * 다시 겹치지 않게 한다.
 */

/** 회원에게 발급된 쿠폰 1건 — 표시값을 담지 않는다(카탈로그가 정본) */
export interface IssuedCoupon {
  /** 상품 관리 쿠폰의 id — 카탈로그 참조 */
  readonly couponId: string;
  /** 발급일 ISO yyyy-mm-dd */
  readonly issuedAt: string;
  /** 사용일 ISO yyyy-mm-dd — 미사용이면 null */
  readonly usedAt: string | null;
}

/**
 * 발급 1건 + 카탈로그 조인 결과 — 화면이 그대로 그리는 모양.
 *
 * 표시값이 전부 nullable 인 이유: 참조하는 쿠폰이 카탈로그에서 사라질 수 있다(삭제·미배선).
 * 그때 이름을 지어내면 화면은 없는 쿠폰을 있는 것처럼 말한다 — 모르는 것은 null 로 드러낸다.
 */
export interface HeldCoupon {
  readonly couponId: string;
  readonly name: string | null;
  readonly benefitLabel: string | null;
  /** 사용 종료일 — 카탈로그의 endAt */
  readonly expiresAt: string | null;
  readonly issuedAt: string;
  readonly usedAt: string | null;
}

/**
 * 발급 목록 × 쿠폰 카탈로그 → 화면이 쓰는 보유 쿠폰.
 *
 * 순수 함수다(카탈로그를 인자로 받는다) — 조회기 배선 여부는 부르는 쪽이 판단한다.
 * 색인을 한 번만 만들고 재사용한다(couponsById 주석 참조).
 */
export function joinIssuedCoupons(
  issued: readonly IssuedCoupon[],
  catalog: readonly CatalogCoupon[],
): readonly HeldCoupon[] {
  const byId = couponsById(catalog);
  return issued.map((entry) => {
    const found = byId[entry.couponId] ?? null;
    return {
      couponId: entry.couponId,
      name: found === null ? null : found.name,
      benefitLabel: found === null ? null : found.benefitLabel,
      expiresAt: found === null ? null : found.endAt,
      issuedAt: entry.issuedAt,
      usedAt: entry.usedAt,
    };
  });
}

export interface MemberDetail {
  readonly id: string;
  readonly nickname: string;

  /* 회원 정보 — 전부 읽기 전용 */
  readonly referralCode: string;
  readonly tier: MemberTier;
  readonly account: string;
  readonly name: string;
  readonly phone: string;
  readonly country: string;
  readonly address: string;
  readonly addressDetail: string;
  /** ISO yyyy-mm-dd */
  readonly birthday: string;
  /** '카카오' / '네이버' / '없음' 등 */
  readonly socialLogin: string;
  /** 추천인 닉네임 — 없으면 빈 문자열 */
  readonly referrer: string;

  /* 동의 정보 */
  readonly consents: readonly ConsentGroup[];

  /* 활동 정보 */
  readonly joinedAtIso: string;
  readonly lastLoginAtIso: string;
  readonly loginCount: number;
  readonly lastLoginIp: string;
  readonly activity: MemberActivity;

  /* 적립금 */
  readonly points: number;
  readonly pointHistory: readonly PointEntry[];

  /* 보유 쿠폰 — 발급 참조만 담는다. 이름·혜택은 카탈로그 조인이다(joinIssuedCoupons) */
  readonly coupons: readonly IssuedCoupon[];

  /* 관리자 메모 */
  readonly memo: string;
}
