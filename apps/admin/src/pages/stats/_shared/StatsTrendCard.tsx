// 추이 카드 — 지표 선택 + 현재/비교 기간 겹쳐 그리기
//
// [대시보드와 다른 점] 대시보드의 방문자 카드는 '일/주/월' 축만 바꾼다. 여기서는
//   (1) **어떤 지표**를 볼지 고르고 (방문자/페이지뷰/체류시간 …)
//   (2) **비교 기간**이 같은 x축에 겹쳐 그려진다.
// 대시보드가 '지금 어떤가'라면 이 카드는 '지난 기간과 견주어 어떤가'다.
//
// [계열 색 — 해결됨, 이 카드가 2계열인 건 이제 색 때문이 아니다]
//   TOKEN-13 이 chart.series-3..6(+fill)을 tokens.json 에 넣었고 LineAreaChart 가 6계열까지
//   서로 다른 hue 로 그린다. 즉 **색 제약은 없다.**
//   그런데도 이 카드가 2계열인 이유는 이 카드가 답하는 질문이 '한 지표를 두 기간에 걸쳐
//   견주면 어떤가'이기 때문이다 — 현재 + 비교, 그 둘이 전부다. 지표를 여러 개 보고 싶으면
//   위의 SegmentedControl 로 바꿔 가며 보는 것이 이 화면의 설계다(겹쳐 그리면 어느 선이 어느
//   지표인지 범례를 오가며 대조해야 한다).
//   다계열이 필요해지면 지금은 그냥 series 에 더 넣으면 된다 — 막던 것은 사라졌다.
//
// [그리는 순서] 현재를 area(면적)로 먼저 깔고 비교를 line 으로 위에 얹는다. 반대로 하면
// 나중에 그리는 면적이 비교선을 덮는다 (StatsTrendChart 가 그 순서를 소유한다).
//
// [차트 엔진] 통계는 Recharts 를 쓴다 (오너 확정 스택 · ADR-0011). DS 의 LineAreaChart 가
// 아니라 StatsTrendChart 인 이유는 그 파일 헤더에 있다 — 요약하면 LineAreaChart 는 **lazy 가
// 아닌 대시보드**도 쓰기 때문에, 거기에 Recharts 를 넣으면 진입 청크가 108% 커진다.
import type { CSSProperties } from 'react';
import { cssVar, SegmentedControl, StatsCard } from '@tds/ui';

import { formatMetric } from './format';
import { formatPeriodLabel } from './period';
import type { StatsPeriod } from './period';
import { StatsTrendChart } from './StatsTrendChart';
import type { StatsTrend } from './types';

const emptyStyle: CSSProperties = {
  margin: 0,
  paddingBlock: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

interface StatsTrendCardProps {
  readonly title: string;
  /** 고를 수 있는 지표들 — 1개면 선택 컨트롤을 그리지 않는다 */
  readonly trends: readonly StatsTrend[];
  readonly activeId: string;
  readonly onActiveChange: (id: string) => void;
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
  readonly loading: boolean;
  readonly error: string;
}

/** 차트가 전달하는 추세를 문장으로 — role=img 의 접근 가능한 이름 */
function ariaLabelOf(trend: StatsTrend, period: StatsPeriod, compare: StatsPeriod | null): string {
  const peak = trend.current.length === 0 ? 0 : Math.max(...trend.current);
  const total = trend.current.reduce((sum, value) => sum + value, 0);
  const head = `${formatPeriodLabel(period)} ${trend.label} 추이 — 합계 ${formatMetric(total, trend.unit)}, 최고 ${formatMetric(peak, trend.unit)}`;
  return compare === null
    ? head
    : `${head}. 비교 기간 ${formatPeriodLabel(compare)}이 함께 표시됩니다.`;
}

export function StatsTrendCard({
  title,
  trends,
  activeId,
  onActiveChange,
  period,
  comparePeriod,
  loading,
  error,
}: StatsTrendCardProps) {
  const active = trends.find((trend) => trend.id === activeId) ?? trends[0];

  // 액션(지표 토글)은 loading 중에도 떠 있는 채 비활성이다 — 사라지면 자기 클릭에 자기가
  // 없어져 레이아웃이 튀고 포커스를 잃는다 (StatsCard 계약 1.0.1 erratum).
  const action =
    trends.length <= 1 ? null : (
      <SegmentedControl
        value={active?.id ?? ''}
        options={trends.map((trend) => ({ id: trend.id, label: trend.label }))}
        size="sm"
        ariaLabel="추이 지표"
        disabled={loading}
        onChange={onActiveChange}
      />
    );

  const hasData = active !== undefined && active.current.length > 0;

  return (
    <StatsCard title={title} action={action} loading={loading} error={error}>
      {hasData ? (
        <StatsTrendChart
          labels={active.labels}
          current={active.current}
          compare={active.compare}
          ariaLabel={ariaLabelOf(active, period, comparePeriod)}
        />
      ) : (
        // 조회는 성공했는데 집계된 값이 0건 — 에러가 아니다 (STATE-01)
        <p style={emptyStyle}>선택한 기간에 집계된 값이 없습니다.</p>
      )}
    </StatsCard>
  );
}
