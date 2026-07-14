// 회원 화면 **전용** 타입 (A40 소유 — apps/admin/src/pages/members/**)
//
// [도메인의 SSOT 는 여기가 아니다] 회원 등급·그룹·상세 같은 **도메인 모델은
// shared/domain/member.ts** 가 갖는다. 운영자 관리와 고객 설정도 같은 모델을 쓰기 때문이다.
// 예전에는 이 파일이 도메인을 갖고 있었고 다른 화면이 회원 화면을 가로질러 import 했다 —
// 회원 화면을 지우면 나머지가 깨지는 구조였다.
//
// 여기 남은 것은 **회원 화면의 관심사**뿐이다: 그룹 생성 폼의 선택지, 페이지 크기, 메모 길이 제한 등.
//
// 편의를 위해 도메인 모델을 그대로 재수출한다 — 회원 화면 안에서는 './types' 하나만 보면 된다.
// (다른 페이지는 이 파일이 아니라 shared/domain/member 를 직접 import 한다.)
import type { GroupCounts, Member, TierCounts } from '../../shared/domain/member';

// ConsentItem · MemberActivity · TierFilterDef 는 재수출하지 않는다 —
// 회원 화면 어디서도 직접 쓰지 않아 도메인 파일 안의 지역 타입으로 되돌렸다 (죽은 공개 표면).
export type {
  ConsentGroup,
  Coupon,
  GroupCounts,
  Member,
  MemberDetail,
  MemberGroup,
  MemberTier,
  PointEntry,
  TierCounts,
} from '../../shared/domain/member';

export { TIER_FILTERS, TIER_LABEL } from '../../shared/domain/member';

/* ── 회원 그룹 만들기 (모달 폼) ───────────────────────────────────────────── */

/** 그룹 유형 — '운영진 그룹'은 /users/admins 가 소비한다. 회원 상세에는 노출하지 않는다 */
type GroupType = 'member' | 'staff';

export const GROUP_TYPE_OPTIONS: readonly { readonly id: GroupType; readonly label: string }[] = [
  { id: 'member', label: '일반 회원 그룹' },
  { id: 'staff', label: '운영진 그룹' },
];

type ShippingBenefit = 'none' | 'free' | 'conditional';

export const SHIPPING_BENEFIT_OPTIONS: readonly {
  readonly id: ShippingBenefit;
  readonly label: string;
}[] = [
  { id: 'none', label: '없음' },
  { id: 'free', label: '무료 배송' },
  { id: 'conditional', label: '조건부 무료 배송' },
];

/** '새 그룹 만들기' 모달의 제출 payload */
export interface CreateGroupInput {
  readonly name: string;
  readonly type: GroupType;
  readonly shippingBenefit: ShippingBenefit;
}

/** 그룹 필터의 '전체' 값 — 그룹 id 와 섞이지 않게 상수로 둔다 */
export const GROUP_ALL = 'all';

/* ── 목록 조회 결과 ──────────────────────────────────────────────────────── */

export interface MemberListResult {
  readonly members: readonly Member[];
  readonly counts: TierCounts;
  readonly groupCounts: GroupCounts;
  /** 필터/검색 적용 후 전체 건수 (페이지네이션용) */
  readonly total: number;
}

export const PAGE_SIZE = 10;

/* ── 적립금 지급/차감 폼 ─────────────────────────────────────────────────── */

export type PointAdjustKind = 'grant' | 'deduct';

export const POINT_ADJUST_LABEL: Record<PointAdjustKind, string> = {
  grant: '지급',
  deduct: '차감',
};

export interface PointAdjustInput {
  readonly kind: PointAdjustKind;
  readonly amount: number;
  readonly reason: string;
}

/* ── 관리자 메모 ─────────────────────────────────────────────────────────── */

/** 최대 길이 — 카운터('N/500')와 검증이 함께 참조한다 */
export const MEMO_MAX_LENGTH = 500;
