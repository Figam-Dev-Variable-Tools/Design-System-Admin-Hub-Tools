// 회원 통계 조회 — 픽스처
//
// [백엔드 0] 지금은 결정론적 픽스처다. 백엔드가 붙으면 build 안쪽만 fetch 로 바꾼다 —
// 지연·실패·빈 상태의 재현 경로(_shared/mock.ts)와 화면은 그대로다.
//
// TODO(backend): GET /api/stats/members?start&end&channel
// TODO(backend): GET /api/stats/members/tiers?start&end&channel
import { daysBetween } from '../../../shared/format';
import { eachDay, formatDayLabel } from '../_shared/period';
import type { StatsPeriod } from '../_shared/period';
import { loadStats, seededRandom, seededSeries } from '../_shared/mock';
import { EMPTY_MEMBER_STATS, MEMBER_TIERS } from './types';
import type {
  MemberByChannel,
  MemberJoinChannel,
  MemberRow,
  MemberStats,
  MemberTier,
  MemberTierRow,
} from './types';

const SCOPE = 'stats-members';

/** 가입 경로별 비중 — 국내 커머스는 소셜 가입이 이메일 가입을 넘는다 */
const CHANNEL_WEIGHTS: Readonly<Record<MemberJoinChannel, number>> = {
  email: 0.22,
  naver: 0.26,
  kakao: 0.34,
  google: 0.18,
};

/** 하루 신규 가입의 기준값·진폭 — 경로별 비중을 곱해 나눈다 */
const DAILY_JOINS = 128;
const DAILY_JOINS_VARIANCE = 64;

/** 누적 곡선의 기준점 — 이 날 마감 기준 누적 회원 수가 BASE_MEMBERS 다 */
const ANCHOR_DATE = '2026-01-01';
const BASE_MEMBERS = 48200;

/**
 * 기준일 이후 하루 평균 순증 — 조회 기간이 기준일에서 얼마나 떨어져 있든 누적을 이어 붙인다.
 * 이 보정이 없으면 비교 기간(더 이른 기간)의 누적이 현재 기간과 같은 값에서 출발해
 * '누적 회원 수'의 증감이 언제나 0으로 뜬다 — 비교가 본체인 화면에서 그것은 버그다.
 */
const DAILY_NET_DRIFT = 82;

/** 회원 등급 구성 — 일반이 대부분이고 VIP 는 소수인 실제 분포 모양 (합 1.00) */
const TIER_WEIGHTS: Readonly<Record<MemberTier, number>> = {
  basic: 0.62,
  silver: 0.24,
  gold: 0.11,
  vip: 0.03,
};

/** 조회 기간이 시작되는 시점의 누적 회원 수 — 기준일에서 흘러온 만큼을 더한다 */
function startCumulativeOf(start: string, weight: number): number {
  // ANCHOR_DATE 는 상수이고 start 는 검증을 통과한 값이라 null 이 나올 수 없다 — 0 은 '기준일 그대로'
  const drift = (daysBetween(ANCHOR_DATE, start) ?? 0) * DAILY_NET_DRIFT;
  return Math.max(0, Math.round((BASE_MEMBERS + drift) * weight));
}

function channelRowsOf(period: StatsPeriod, channel: MemberJoinChannel): readonly MemberRow[] {
  const days = eachDay(period);
  const weight = CHANNEL_WEIGHTS[channel];
  const joins = seededSeries(
    `${SCOPE}:${channel}`,
    days,
    DAILY_JOINS * weight,
    DAILY_JOINS_VARIANCE * weight,
  );

  // 누적은 앞날의 결과를 이어받는다 — 그래서 map 안에서 한 방향으로만 굴린다
  let cumulative = startCumulativeOf(period.start, weight);
  return days.map((day, index) => {
    const dayJoins = joins[index] ?? 0;
    const random = seededRandom(`${SCOPE}:leave:${channel}:${day}`);
    // 탈퇴는 신규의 18~34% 대역 — 성장하는 쇼핑몰의 현실적인 폭이다
    const withdrawals = Math.round(dayJoins * (0.18 + random() * 0.16));
    cumulative += dayJoins - withdrawals;
    return {
      id: day,
      label: formatDayLabel(day),
      joins: dayJoins,
      withdrawals,
      cumulative,
    };
  });
}

/** 'all' 은 네 경로의 합이다 — 따로 만들면 합계와 경로별 값이 어긋나 관리자가 둘 다 못 믿는다 */
function totalRowsOf(
  period: StatsPeriod,
  channels: readonly (readonly MemberRow[])[],
): readonly MemberRow[] {
  return eachDay(period).map((day, index) => {
    const pick = (take: (row: MemberRow) => number): number =>
      channels.reduce((sum, rows) => {
        const row = rows[index];
        return sum + (row === undefined ? 0 : take(row));
      }, 0);

    return {
      id: day,
      label: formatDayLabel(day),
      joins: pick((row) => row.joins),
      withdrawals: pick((row) => row.withdrawals),
      cumulative: pick((row) => row.cumulative),
    };
  });
}

function dailyOf(period: StatsPeriod): MemberByChannel<MemberRow> {
  const email = channelRowsOf(period, 'email');
  const naver = channelRowsOf(period, 'naver');
  const kakao = channelRowsOf(period, 'kakao');
  const google = channelRowsOf(period, 'google');
  return { all: totalRowsOf(period, [email, naver, kakao, google]), email, naver, kakao, google };
}

/** 등급 구성 — 기간 말 누적 회원을 등급 비중으로 나눈다. 등급은 스냅샷이지 일별 흐름이 아니다 */
function tierRowsOf(rows: readonly MemberRow[]): readonly MemberTierRow[] {
  const members = rows[rows.length - 1]?.cumulative ?? 0;
  return MEMBER_TIERS.map((tier) => ({
    id: tier.id,
    label: tier.label,
    members: Math.round(members * TIER_WEIGHTS[tier.id]),
  }));
}

function tiersOf(daily: MemberByChannel<MemberRow>): MemberByChannel<MemberTierRow> {
  return {
    all: tierRowsOf(daily.all),
    email: tierRowsOf(daily.email),
    naver: tierRowsOf(daily.naver),
    kakao: tierRowsOf(daily.kakao),
    google: tierRowsOf(daily.google),
  };
}

interface MemberQuery {
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
}

export function fetchMemberStats(query: MemberQuery, signal: AbortSignal): Promise<MemberStats> {
  return loadStats<MemberStats>(
    SCOPE,
    signal,
    () => {
      const daily = dailyOf(query.period);
      const compareDaily = query.comparePeriod === null ? null : dailyOf(query.comparePeriod);
      return {
        daily,
        compareDaily,
        tiers: tiersOf(daily),
        compareTiers: compareDaily === null ? null : tiersOf(compareDaily),
      };
    },
    () => EMPTY_MEMBER_STATS,
  );
}
