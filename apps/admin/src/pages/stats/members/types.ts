// 회원 통계 도메인 타입
//
// [무엇을 세는가 — 카페24 '회원 현황·가입 통계'의 어휘를 따른다]
//   신규 가입    그 날 가입을 완료한 회원 수
//   탈퇴         그 날 탈퇴 처리된 회원 수 (관리자 강제 탈퇴 포함)
//   순증         신규 가입 − 탈퇴
//   누적 회원 수 그 날 마감 기준으로 남아 있는 전체 회원 수 (순증의 누계)
//
// [왜 순증을 1급 지표로 두나] 신규 가입만 보면 탈퇴가 같은 수로 빠져나가도 화면은 '성장 중'으로
// 읽힌다. 회원이 실제로 늘었는지에 답하는 것은 순증뿐이라, 파생 계산이 아니라 KPI·추이·표에
// 나란히 세운다. 탈퇴는 낮을수록 좋은 지표라 증감 색을 뒤집는다 (StatsKpi.isLowerBetter).
//
// [가입 경로를 세그먼트로 두는 이유] 국내 커머스의 가입은 소셜 로그인으로 크게 기운다. 경로별로
// 가르지 않으면 '카카오 가입이 막혔다' 같은 사고가 전체 평균에 묻혀 며칠씩 보이지 않는다.
import type { SegmentOption } from '../_shared/types';

/** 가입 경로 세그먼트 — 'all' 은 네 경로의 합이다 */
export type MemberChannel = 'all' | 'email' | 'naver' | 'kakao' | 'google';

export const MEMBER_CHANNELS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  { id: 'email', label: '이메일' },
  { id: 'naver', label: '네이버' },
  { id: 'kakao', label: '카카오' },
  { id: 'google', label: '구글' },
];

export function isMemberChannel(value: unknown): value is MemberChannel {
  return typeof value === 'string' && MEMBER_CHANNELS.some((option) => option.id === value);
}

/** 집계가 실제로 쌓이는 경로 — 'all' 은 저장하지 않고 넷을 더해서 만든다 */
export type MemberJoinChannel = Exclude<MemberChannel, 'all'>;

/** 드릴다운 축 — 일자별 흐름에서 등급별 구성으로 파고든다 */
export const MEMBER_BREAKDOWNS: readonly SegmentOption[] = [
  { id: 'daily', label: '일자별' },
  { id: 'tier', label: '등급별' },
];

/** 회원 등급 — 쇼핑몰 기본 4단계 */
export type MemberTier = 'basic' | 'silver' | 'gold' | 'vip';

interface MemberTierDef {
  readonly id: MemberTier;
  readonly label: string;
}

export const MEMBER_TIERS: readonly MemberTierDef[] = [
  { id: 'basic', label: '일반' },
  { id: 'silver', label: '실버' },
  { id: 'gold', label: '골드' },
  { id: 'vip', label: 'VIP' },
];

/** 한 구간(하루)의 회원 지표 — 이미 가입 경로로 좁혀진 값이다 */
export interface MemberRow {
  /** 구간 식별자 — 일자('2026-07-16') */
  readonly id: string;
  /** 표에 보이는 이름 — '2026.07.16' */
  readonly label: string;
  readonly joins: number;
  readonly withdrawals: number;
  /** 그 날 마감 기준 누적 회원 수 — 날짜별 값을 더하면 안 된다(이미 누계다) */
  readonly cumulative: number;
}

/** 등급 구성 한 줄 — 기간 말 시점의 스냅샷이다 */
export interface MemberTierRow {
  readonly id: MemberTier;
  readonly label: string;
  readonly members: number;
}

/**
 * 가입 경로별 집계 한 벌 — 화면이 세그먼트로 하나를 고른다.
 * 경로별 자리를 모두 채워 두므로 세그먼트 전환에 재조회가 필요 없다.
 */
export type MemberByChannel<T> = Readonly<Record<MemberChannel, readonly T[]>>;

export interface MemberStats {
  /** 일자별 — 추이 차트와 기본 표의 원천 */
  readonly daily: MemberByChannel<MemberRow>;
  /** 비교 기간의 일자별. 비교 안 함이면 null */
  readonly compareDaily: MemberByChannel<MemberRow> | null;
  readonly tiers: MemberByChannel<MemberTierRow>;
  readonly compareTiers: MemberByChannel<MemberTierRow> | null;
}

const EMPTY_BY_CHANNEL: MemberByChannel<never> = {
  all: [],
  email: [],
  naver: [],
  kakao: [],
  google: [],
};

export const EMPTY_MEMBER_STATS: MemberStats = {
  daily: EMPTY_BY_CHANNEL,
  compareDaily: null,
  tiers: EMPTY_BY_CHANNEL,
  compareTiers: null,
};

/** 순증 — 신규 가입에서 탈퇴를 뺀 값. 음수면 회원이 줄어든 날이다 */
export function netChangeOf(row: MemberRow): number {
  return row.joins - row.withdrawals;
}

export function sumOf(rows: readonly MemberRow[], pick: (row: MemberRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/**
 * 기간 말 누적 회원 수 — 마지막 날의 마감값이다.
 * 누적은 이미 누계라서 날짜별 값을 더하면 회원 수가 기간 길이만큼 뻥튀기된다.
 */
export function cumulativeOf(rows: readonly MemberRow[]): number {
  return rows[rows.length - 1]?.cumulative ?? 0;
}
