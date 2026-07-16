// 회원 활동 로그 **전용** 타입 (apps/admin/src/pages/logs/member-activity/**)
//
// [무엇을 기록하는가] **회원이 서비스에서 한 일.** 가입 · 로그인 · 주문 · 리뷰 · 적립금 · 탈퇴.
// 이 화면은 "이 회원이 정말 그 주문을 했나요?" · "탈퇴 전에 무슨 일이 있었나요?" 에 답한다.
//
// [관리자 로그와 무엇이 다른가] 행위자가 **회원**이라는 점이다. 그래서 개인정보 밀도가 훨씬 높고
// (주문 페이로드에는 배송지와 결제수단이 들어 있다) 보존기간이 훨씬 짧다 — 아래 RETENTION 참조.
import type { LogEntryBase, LogFilterAxis, RetentionPolicy } from '../types';
import { ALL_FILTER } from '../types';

/* ── 활동 ────────────────────────────────────────────────────────────────── */

export type MemberActivity =
  'signup' | 'login' | 'order' | 'payment' | 'review' | 'point' | 'profile' | 'withdraw';

export const MEMBER_ACTIVITY_LABEL: Record<MemberActivity, string> = {
  signup: '가입',
  login: '로그인',
  order: '주문',
  payment: '결제',
  review: '리뷰',
  point: '적립금',
  profile: '정보 수정',
  withdraw: '탈퇴',
};

export type MemberOutcome = 'success' | 'failure';

export const MEMBER_OUTCOME_LABEL: Record<MemberOutcome, string> = {
  success: '성공',
  failure: '실패',
};

/* ── 항목 ────────────────────────────────────────────────────────────────── */

export interface MemberActivityEntry extends LogEntryBase {
  readonly occurredAtIso: string;
  /** 회원 계정(이메일) — 마스킹된 채로 내려온다 */
  readonly memberAccount: string;
  /** 회원 이름 — 마스킹 ('김**') */
  readonly memberName: string;
  /** 회원 상세로 이동할 id. 탈퇴 회원은 null — 가리킬 레코드가 남아 있지 않다 */
  readonly memberId: string | null;
  readonly activity: MemberActivity;
  /** 무엇을 했는지 한 줄 ('주문 ORD-20260714-0031 · 128,000원') */
  readonly summary: string;
  readonly outcome: MemberOutcome;
  readonly failureReason: string | null;
  readonly ip: string;
  /** 기기 — 'Chrome 126 · Windows 11' */
  readonly device: string;
  /** 요청 본문. 날것 그대로 (마스킹은 표시 시점에 — ../masking.ts) */
  readonly payload: unknown;
}

/* ── 좌측 필터 축 ────────────────────────────────────────────────────────── */

export const MEMBER_ACTIVITY_AXES: readonly LogFilterAxis[] = [
  {
    key: 'outcome',
    heading: '결과',
    ariaLabel: '처리 결과 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      { id: 'success', label: '성공' },
      { id: 'failure', label: '실패' },
    ],
  },
  {
    key: 'activity',
    heading: '활동',
    ariaLabel: '활동 종류 필터',
    options: [
      { id: ALL_FILTER, label: '전체' },
      ...(Object.keys(MEMBER_ACTIVITY_LABEL) as MemberActivity[]).map((activity) => ({
        id: activity,
        label: MEMBER_ACTIVITY_LABEL[activity],
      })),
    ],
  },
];

/* ── 보존기간 ────────────────────────────────────────────────────────────── */

/**
 * 회원 활동 로그는 **관리자 로그보다 훨씬 짧게** 남긴다 (3년 vs 1년).
 *
 * 관리자 로그는 '우리 직원이 무엇을 했나'라서 오래 들고 있는 것이 통제이지만,
 * 이 로그는 **남의 개인정보**다. 오래 들고 있는 것 자체가 위험이고 비용이다 —
 * 개인정보는 목적을 다하면 지우는 것이 원칙이지 자산이 아니다.
 */
export const MEMBER_ACTIVITY_RETENTION: RetentionPolicy = {
  label: '1년',
  basis: '개인정보 최소 보관 원칙. 보존기간이 지나면 자동 폐기됩니다.',
};
