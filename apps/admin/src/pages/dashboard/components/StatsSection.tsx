// 통계 섹션 — 방문자 차트 카드 + 기간별 분석 카드
//
// 두 카드는 각각 권한(dashboard.stats.visitors / dashboard.stats.period)에 걸려 있어
// 최상위 관리자가 개별로 끌 수 있다. 둘 다 꺼지면 섹션 자체가 사라진다.
//
// [이 파일이 하는 일은 어댑터다] 카드 껍데기·차트·표·토글은 전부 @tds/ui 가 소유한다
// (StatsCard · LineAreaChart · SegmentedControl · DataTable). 여기 남은 것은 **도메인 → 데이터 prop**
// 변환뿐이다: 방문자/페이지뷰를 계열로, 기간 행을 표 행으로 옮긴다 (ADR-0003: 도메인은 올라가지 않는다).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { cssVar, DataTable, LineAreaChart, SegmentedControl, StatsCard } from '@tds/ui';

import { BarChartIcon } from '../../../shared/icons';
import { usePermissions } from '../../../shared/permissions/PermissionProvider';
import { pgSellable, readPaymentSettings } from '../../../shared/commerce/payment-settings';
import { useStatsQuery } from '../queries';
import { STATS_RANGES } from '../stats-types';
import type { StatsData, StatsRange } from '../stats-types';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const sectionTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  margin: 0,
  color: cssVar('color.action.primary.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 18), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

/**
 * 기간별 분석 표의 컬럼 — 단위(unit)는 합계 행에 붙고,
 * **매출액만 본문 행에도 붙인다**(`unitInBody`). 이미지 규격이 그렇다: 본문은 숫자만, 매출액만 '원'.
 * 이 플래그를 빼면 본문의 '원' 이 조용히 사라진다 (계약 DataTable.columns.unitInBody).
 */
const PERIOD_COLUMNS = [
  { key: 'period', label: '일자', align: 'left' },
  { key: 'orders', label: '주문수', unit: '건' },
  { key: 'revenue', label: '매출액', unit: '원', unitInBody: true },
  { key: 'visitors', label: '방문자', unit: '명' },
  { key: 'signups', label: '가입', unit: '명' },
  { key: 'inquiries', label: '문의' },
  { key: 'reviews', label: '후기' },
] as const;

/**
 * 결제를 쓰지 않을 때의 컬럼 — 주문수·매출액을 **감춘다**.
 *
 * 결제가 없으면 두 열은 구조적으로 0 이다. 0 을 그리면 운영자는 장애로 읽고, 매일 아침 없는
 * 원인을 찾는다. 남은 열(방문자·가입·문의·후기)은 결제와 무관하게 계속 사실이다.
 */
const PERIOD_COLUMNS_NO_PG = PERIOD_COLUMNS.filter(
  (column) => column.key !== 'orders' && column.key !== 'revenue',
);

/**
 * 본문 행과 합계 행의 키 필드가 다르다 (본문은 `date`, 합계는 `label`).
 * DataTable 의 rowKey 는 하나뿐이므로 **어댑터에서 `period` 로 통일**한다 — 계약을 넓히지 않는다.
 */
function toTableRows(data: StatsData): {
  readonly rows: readonly Record<string, string | number>[];
  readonly summaryRows: readonly Record<string, string | number>[];
} {
  return {
    rows: data.periodRows.map(({ date, ...values }) => ({ period: date, ...values })),
    summaryRows: data.summaries.map(({ label, ...values }) => ({ period: label, ...values })),
  };
}

interface StatsSectionProps {
  readonly range: StatsRange;
  readonly onRangeChange: (range: StatsRange) => void;
}

export function StatsSection({ range, onRangeChange }: StatsSectionProps) {
  const { isEnabled } = usePermissions();
  const showVisitors = isEnabled('dashboard.stats.visitors');
  const showPeriod = isEnabled('dashboard.stats.period');

  /**
   * [STATE-01 의 예외 — `isFetching` 이 여기서는 **옳다**. 지우지 말 것]
   *
   * 목록 화면들은 스켈레톤 조건을 `data === undefined` 로 좁혔다(재조회 중 이전 행 유지).
   * 통계 카드는 그 규칙을 따르지 않는다. 이유는 '옛 동작 보존'이 아니라 **조회가 기간 토글에
   * 종속**되기 때문이다:
   *
   *   · 조회는 기간(일/주/월)의 함수다 (FS-002-EL-027). '월'을 누른 순간 화면에 남아 있는
   *     '일' 차트는 갱신 중인 같은 데이터가 아니라 **다른 기간의 집계**다 — 토글은 '월'을
   *     가리키는데 차트는 '일'을 그리는 상태는 유지가 아니라 **거짓말**이다.
   *   · 그래서 명세가 못 박는다: FS-002-EL-034 '**조회 중이거나 데이터가 아직 없으면** 범례·차트
   *     대신 스켈레톤', EL-039(표도 동일), EL-027 '조회 중 두 카드 모두 aria-busy="true" 이며
   *     스켈레톤으로 대체된다'. e2e FS-002-EL-027/028/036 이 기간 토글 직후의 aria-busy 를
   *     그대로 단언한다.
   *
   * (StatsCard 는 `busy` 와 스켈레톤을 `loading` 하나로 묶은 계약이라 'aria-busy 는 켜고 차트는
   *  남긴다'를 앱층에서 만들 수 없다 — 규칙을 바꾸려면 packages/ui 계약부터 갈라야 한다.)
   */
  const { data, isFetching: loading, error } = useStatsQuery(range, showVisitors || showPeriod);

  const chart = useMemo(() => {
    if (data === undefined) return null;
    const points = data.visitors;
    const maxValue = points.reduce(
      (max, point) => Math.max(max, point.visitors, point.pageViews),
      0,
    );
    return {
      maxValue,
      labels: points.map((point) => point.label),
      // 면적(페이지뷰)이 먼저다 — 나중에 그리는 선(방문자)이 면적 위로 올라와야 가려지지 않는다
      series: [
        {
          id: 'pageViews',
          label: '페이지뷰',
          kind: 'area' as const,
          values: points.map((point) => point.pageViews),
        },
        {
          id: 'visitors',
          label: '방문자',
          kind: 'line' as const,
          values: points.map((point) => point.visitors),
        },
      ],
    };
  }, [data]);

  if (!showVisitors && !showPeriod) return null;

  /**
   * SegmentedControl 은 도메인을 모른다 — onChange 로 `string` 을 준다.
   * 캐스팅하지 않고 옵션 목록에서 되찾아 좁힌다.
   */
  const handleRangeChange = (id: string) => {
    const next = STATS_RANGES.find((option) => option.id === id);
    if (next !== undefined) onRangeChange(next.id);
  };

  /**
   * 기간 토글 — **로딩 중에도 떠 있는 채 비활성된다.**
   * (계약 StatsCard 1.0.1: 액션 슬롯을 언마운트하지 않는다. 언마운트하면 방금 누른 토글이 자기
   *  클릭에 사라져 레이아웃이 튀고 포커스를 잃는다. 비활성은 호출부인 여기가 disabled 로 준다.)
   */
  const rangeToggle = (
    <SegmentedControl
      value={range}
      options={STATS_RANGES}
      ariaLabel="조회 기간"
      disabled={loading}
      onChange={handleRangeChange}
    />
  );

  const table = data === undefined ? null : toTableRows(data);
  const failed = error !== null;

  // 렌더 시점에 읽는다 — 결제 설정을 바꾸면 다음 렌더가 곧바로 다른 표를 그린다
  const ordersArrive = pgSellable(readPaymentSettings());
  const periodColumns = ordersArrive ? PERIOD_COLUMNS : PERIOD_COLUMNS_NO_PG;
  const periodCaption = ordersArrive
    ? '일자별 주문수 · 매출액 · 방문자 · 가입 · 문의 · 후기와 기간 합계'
    : '일자별 방문자 · 가입 · 문의 · 후기와 기간 합계 (결제 미사용 — 주문수 · 매출액 제외)';

  return (
    <section style={sectionStyle} aria-labelledby="dashboard-stats-title">
      <h2 id="dashboard-stats-title" style={sectionTitleStyle}>
        <BarChartIcon />
        통계
      </h2>

      <div style={gridStyle}>
        {showVisitors && (
          <StatsCard
            title="방문자"
            action={rangeToggle}
            loading={loading || chart === null}
            error={failed ? '방문자 통계를 불러오지 못했어요.' : ''}
          >
            {chart !== null && (
              <LineAreaChart
                series={chart.series}
                labels={chart.labels}
                ariaLabel={`기간별 방문자 및 페이지뷰 추이 — 최대 ${String(chart.maxValue)}`}
              />
            )}
          </StatsCard>
        )}

        {showPeriod && (
          <StatsCard
            title="기간별 분석"
            loading={loading || table === null}
            error={failed ? '기간별 분석을 불러오지 못했어요.' : ''}
          >
            {table !== null && (
              <DataTable
                columns={periodColumns}
                rows={table.rows}
                summaryRows={table.summaryRows}
                rowKey="period"
                caption={periodCaption}
              />
            )}
          </StatsCard>
        )}
      </div>
    </section>
  );
}
