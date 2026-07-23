// 회원 통계 — /stats/members
//
// [회원 목록(pages/members)과 무엇이 다른가]
//   목록: 한 사람을 찾고 고치는 화면 — 검색·상세·수정이 본체다.
//   여기: 사람을 세는 화면 — 며칠에 걸쳐 몇 명이 들어오고 나갔는지, 경로별로 어디가 마르는지,
//         남은 회원이 어느 등급에 쏠려 있는지를 본다. 개별 회원은 여기서 열 수 없다(열 이유가 없다).
// 그래서 이 화면은 pages/members 를 import 하지 않는다 — 같은 '회원'이라는 말을 쓸 뿐,
// 다루는 단위가 사람 하나가 아니라 기간의 집계다.
import { useCallback, useMemo } from 'react';
import { SegmentedControl } from '@tds/ui';

import { Card, CardTitle } from '../../../shared/ui';
import { formatNumber, formatSignedNumber } from '../../../shared/format';
import { ShareBarList } from '../_shared/ShareBarList';
import { StatsKpiRow } from '../_shared/StatsKpiRow';
import { StatsPageShell } from '../_shared/StatsPageShell';
import { StatsTable } from '../_shared/StatsTable';
import { StatsTrendCard } from '../_shared/StatsTrendCard';
import { StatsEmpty } from '../_shared/StatsEmpty';
import { formatPercentValue, shareOf } from '../_shared/format';
import { comparePeriodOf } from '../_shared/period';
import { useCsvExport } from '../_shared/useCsvExport';
import { useStatsQuery } from '../_shared/queries';
import { useStatsParams } from '../_shared/useStatsParams';
import type { SegmentOption, ShareItem, StatsColumn, StatsKpi, StatsTrend } from '../_shared/types';
import { fetchMemberStats } from './data-source';
import {
  EMPTY_MEMBER_STATS,
  MEMBER_BREAKDOWNS,
  MEMBER_CHANNELS,
  MEMBER_TIERS,
  cumulativeOf,
  isMemberChannel,
  netChangeOf,
  sumOf,
} from './types';
import type { MemberChannel, MemberRow, MemberTierRow } from './types';

const ROUTE = '/stats/members';

function channelOf(value: string): MemberChannel {
  return isMemberChannel(value) ? value : 'all';
}

/**
 * 일자별 표.
 *
 * 순증은 부호를 달고 나온다('+124' / '-3') — 회원이 줄어든 날을 '124' 처럼 중립적으로 적으면
 * 표를 훑는 눈이 감소를 그냥 지나친다 (ERP-08 의 부호 표기).
 */
const dailyColumns: readonly StatsColumn<MemberRow>[] = [
  {
    key: 'label',
    header: '일자',
    align: 'left',
    render: (row) => row.label,
    csv: (row) => row.label,
    sortValue: (row) => row.id,
  },
  {
    key: 'joins',
    header: '신규 가입',
    align: 'right',
    render: (row) => formatNumber(row.joins),
    csv: (row) => formatNumber(row.joins),
    sortValue: (row) => row.joins,
  },
  {
    key: 'withdrawals',
    header: '탈퇴',
    align: 'right',
    render: (row) => formatNumber(row.withdrawals),
    csv: (row) => formatNumber(row.withdrawals),
    sortValue: (row) => row.withdrawals,
  },
  {
    key: 'net',
    header: '순증',
    align: 'right',
    render: (row) => formatSignedNumber(netChangeOf(row)),
    csv: (row) => formatSignedNumber(netChangeOf(row)),
    sortValue: (row) => netChangeOf(row),
  },
  {
    key: 'cumulative',
    header: '누적 회원',
    align: 'right',
    render: (row) => formatNumber(row.cumulative),
    csv: (row) => formatNumber(row.cumulative),
    sortValue: (row) => row.cumulative,
  },
];

/** 추이 차트가 그릴 수 있는 지표 — URL 의 metric 파라미터가 고른다 */
const TREND_METRICS: readonly SegmentOption[] = [
  { id: 'joins', label: '신규 가입' },
  { id: 'withdrawals', label: '탈퇴' },
  { id: 'net', label: '순증' },
  { id: 'cumulative', label: '누적' },
];

export default function MemberStatsPage() {
  const params = useStatsParams({
    segments: MEMBER_CHANNELS,
    views: MEMBER_BREAKDOWNS,
    metrics: TREND_METRICS,
    defaultSort: { key: 'label', direction: 'desc' },
  });
  const exportState = useCsvExport();

  const comparePeriod = comparePeriodOf(params.period, params.compare);
  const channel = channelOf(params.segment);

  // 조회 조건 전체가 키에 들어간다 — 늦게 온 이전 조건의 응답이 현재를 덮지 못한다 (COMP-10)
  const query = useStatsQuery(
    ['stats', 'members', params.period, comparePeriod, params.compare],
    useCallback(
      (signal: AbortSignal) => fetchMemberStats({ period: params.period, comparePeriod }, signal),
      [params.period, comparePeriod],
    ),
  );

  const stats = query.data ?? EMPTY_MEMBER_STATS;
  const rows = stats.daily[channel];
  const tierRows = stats.tiers[channel];

  // 가입 경로는 화면 전체를 좁힌다 — KPI·추이·표가 모두 고른 경로의 값이다. 그래서 방문자 화면과
  // 달리 라벨에 경로 이름을 붙이지 않는다('카카오 신규 가입'). 조회 조건 바가 이미 경로를 말하고
  // 있는데 지표마다 다시 붙이면 카드 제목이 길어지기만 한다.
  const kpis = useMemo<readonly StatsKpi[]>(() => {
    const compare = stats.compareDaily === null ? null : stats.compareDaily[channel];
    const joins = (source: readonly MemberRow[]): number => sumOf(source, (row) => row.joins);
    const leaves = (source: readonly MemberRow[]): number =>
      sumOf(source, (row) => row.withdrawals);

    return [
      {
        id: 'joins',
        label: '신규 가입',
        unit: 'people',
        value: joins(rows),
        compareValue: compare === null ? null : joins(compare),
        hint: '기간 안에 가입을 완료한 회원 수예요.',
      },
      {
        id: 'withdrawals',
        label: '탈퇴',
        unit: 'people',
        value: leaves(rows),
        compareValue: compare === null ? null : leaves(compare),
        // 탈퇴가 늘어난 것을 초록으로 칠하지 않는다
        isLowerBetter: true,
        hint: '기간 안에 탈퇴 처리된 회원 수예요.',
      },
      {
        id: 'net',
        label: '순증',
        unit: 'people',
        value: joins(rows) - leaves(rows),
        compareValue: compare === null ? null : joins(compare) - leaves(compare),
        hint: '신규 가입에서 탈퇴를 뺀 값이에요.',
      },
      {
        id: 'cumulative',
        label: '누적 회원 수',
        unit: 'people',
        value: cumulativeOf(rows),
        compareValue: compare === null ? null : cumulativeOf(compare),
        hint: '기간 마지막 날 마감 기준으로 남아 있는 전체 회원 수예요.',
      },
    ];
  }, [stats, channel, rows]);

  const trends = useMemo<readonly StatsTrend[]>(() => {
    const compare = stats.compareDaily === null ? null : stats.compareDaily[channel];
    const labels = rows.map((row) => row.label);
    const trendOf = (id: string, label: string, pick: (row: MemberRow) => number): StatsTrend => ({
      id,
      label,
      labels,
      unit: 'people',
      current: rows.map(pick),
      compare: compare === null ? null : compare.map(pick),
    });

    return [
      trendOf('joins', '신규 가입', (row) => row.joins),
      trendOf('withdrawals', '탈퇴', (row) => row.withdrawals),
      trendOf('net', '순증', netChangeOf),
      trendOf('cumulative', '누적', (row) => row.cumulative),
    ];
  }, [stats, channel, rows]);

  // 등급별 CSV — 구성비까지 담는다. 화면이 보여주는 값과 엑셀의 값이 같아야 한다 (ERP-12)
  const tierColumns = useMemo<readonly StatsColumn<MemberTierRow>[]>(() => {
    const total = tierRows.reduce((sum, row) => sum + row.members, 0);
    const shareText = (row: MemberTierRow): string =>
      formatPercentValue(shareOf(row.members, total));

    return [
      {
        key: 'label',
        header: '등급',
        align: 'left',
        render: (row) => row.label,
        csv: (row) => row.label,
      },
      {
        key: 'members',
        header: '회원 수',
        align: 'right',
        render: (row) => formatNumber(row.members),
        csv: (row) => formatNumber(row.members),
      },
      {
        key: 'share',
        header: '구성비 (%)',
        align: 'right',
        render: shareText,
        csv: shareText,
      },
    ];
  }, [tierRows]);

  const tierItems = useMemo<readonly ShareItem[]>(() => {
    const compare = stats.compareTiers === null ? null : stats.compareTiers[channel];
    return tierRows.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.members,
      compareValue:
        compare === null ? null : (compare.find((item) => item.id === row.id)?.members ?? null),
    }));
  }, [stats, channel, tierRows]);

  const isTierView = params.view === 'tier';
  const viewLabel = MEMBER_BREAKDOWNS.find((item) => item.id === params.view)?.label ?? '일자별';
  const exportCount = isTierView ? tierRows.length : rows.length;

  return (
    <StatsPageShell
      description="가입 경로별로 신규 가입과 탈퇴를 갈라 보고, 순증과 누적 회원 수의 흐름을 비교 기간과 견주는 회원 분석이에요. 신규 가입만 세면 탈퇴가 같은 수로 빠져나가도 성장으로 읽히므로, 순증을 나란히 둬요."
      route={ROUTE}
      params={params}
      segments={MEMBER_CHANNELS}
      segmentLabel="가입 경로"
      error={query.error}
      onRetry={query.refetch}
      exportState={exportState}
      exportCount={exportCount}
      onExport={() => {
        if (isTierView) {
          exportState.start({
            baseName: 'stats-members-tier',
            columns: tierColumns,
            rows: tierRows,
          });
          return;
        }
        exportState.start({ baseName: 'stats-members-daily', columns: dailyColumns, rows });
      }}
    >
      <StatsKpiRow kpis={kpis} loading={query.isFirstLoad} error={query.error} />

      <StatsTrendCard
        title="회원 추이"
        trends={trends}
        activeId={params.metric}
        onActiveChange={params.setMetric}
        period={params.period}
        comparePeriod={comparePeriod}
        loading={query.isFirstLoad}
        error={query.error}
      />

      <Card>
        <CardTitle
          action={
            <SegmentedControl
              value={params.view}
              options={MEMBER_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
              size="sm"
              ariaLabel="드릴다운 축"
              disabled={query.isFirstLoad}
              onChange={params.setView}
            />
          }
        >
          {viewLabel} 상세
        </CardTitle>

        {/* [등급별을 표가 아니라 구성비 막대로 그리는 이유] 등급은 4행짜리 스냅샷이라 정렬·페이지가
            할 일이 없고, 여기서의 질문은 '몇 명인가'가 아니라 '어디에 쏠려 있나'다. 막대의 길이가
            그 답을 한눈에 준다 — 같은 값을 숫자로만 적은 표는 4행을 눈으로 비교하게 만든다.
            (일자별은 반대다 — 날짜가 수십 행이라 정렬·페이지·가로 스크롤이 있는 표여야 한다.) */}
        {isTierView ? (
          /* 등급별은 표가 아니라 구성비 막대다 — '골드가 몇 명인가'보다
             '회원이 어느 등급에 쏠려 있나'가 물음이라 길이로 읽힌다 */
          <ShareBarList
            items={tierItems}
            unit="people"
            loading={query.isFirstLoad}
            skeletonCount={MEMBER_TIERS.length}
            empty={
              <StatsEmpty
                label="회원 등급"
                hasActiveFilters={params.hasActiveFilters}
                onResetFilters={params.resetFilters}
              />
            }
          />
        ) : (
          <StatsTable
            rows={rows}
            columns={dailyColumns}
            rowKey={(row) => row.id}
            caption={`${viewLabel} 회원 상세`}
            sort={params.sort}
            onToggleSort={params.toggleSort}
            page={params.page}
            pageSize={params.pageSize}
            onPageChange={params.setPage}
            onPageSizeChange={params.setPageSize}
            loading={query.isFirstLoad}
            empty={
              <StatsEmpty
                label="가입 기록"
                hasActiveFilters={params.hasActiveFilters}
                onResetFilters={params.resetFilters}
              />
            }
          />
        )}
      </Card>
    </StatsPageShell>
  );
}

/** 등급 구성 — 로딩/빈/정상의 세 갈래를 표와 같은 규칙으로 가른다 (STATE-01) */
