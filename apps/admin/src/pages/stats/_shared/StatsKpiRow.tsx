// KPI 줄 — 지표 카드 4~5장
//
// [대시보드와 다른 점] 대시보드의 통계 카드는 '지금 몇 명'만 보여준다. 여기서는 **비교 기간 대비
// 증감**이 항상 붙는다 — 통계 화면의 질문은 '얼마인가'가 아니라 '늘었나 줄었나'이기 때문이다.
//
// [증감의 색 — 이중 인코딩] 색만으로 증감을 전달하지 않는다 (WCAG 1.4.1). ▲/▼ 글리프 + 부호 +
// 스크린리더 전용 문장('비교 기간 대비 12.3% 증가')을 함께 낸다. 색은 보조 신호다.
//
// [낮을수록 좋은 지표] 탈퇴·취소율·반품률은 증가가 나쁨이다. isLowerBetter 가 색을 뒤집는다 —
// 이게 없으면 탈퇴자 급증이 초록색으로 뜬다.
import type { CSSProperties } from 'react';
import { StatsCard } from '@tds/ui';

import { DeltaText } from './DeltaText';
import { deltaOf, formatMetric } from './format';
import type { Delta } from './format';
import type { StatsKpi } from './types';

/** 카드가 자동으로 줄바꿈되는 반응형 그리드 — 좁은 화면에서 1열로 접힌다 (IA-14) */
const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 8), 1fr))',
  gap: 'var(--tds-space-4)',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
};

const deltaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
};

const hintStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontFamily: 'var(--tds-typography-caption-md-font-family)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

function DeltaLine({ kpi, delta }: { readonly kpi: StatsKpi; readonly delta: Delta }) {
  return (
    <p style={{ ...deltaStyle, margin: 0 }}>
      <DeltaText delta={delta} unit={kpi.unit} />
    </p>
  );
}

/** 비교 안 함 — 증감 자리를 비워두면 카드 높이가 들쭉날쭉해진다 */
function NoCompareLine() {
  return (
    <p style={{ ...deltaStyle, margin: 0, color: 'var(--tds-color-text-muted)' }}>비교 안 함</p>
  );
}

export function StatsKpiRow({
  kpis,
  loading,
  error,
}: {
  readonly kpis: readonly StatsKpi[];
  readonly loading: boolean;
  readonly error: string;
}) {
  return (
    <div style={rowStyle}>
      {kpis.map((kpi) => (
        <StatsCard
          key={kpi.id}
          title={kpi.label}
          // 포맷은 호출부의 일이다 — 카드는 숫자를 모른다 (StatsCard 계약 1.1.0)
          value={loading || error !== '' ? '' : formatMetric(kpi.value, kpi.unit)}
          loading={loading}
          error={error}
        >
          <div style={bodyStyle}>
            {kpi.compareValue === null ? (
              <NoCompareLine />
            ) : (
              <DeltaLine
                kpi={kpi}
                delta={deltaOf(kpi.value, kpi.compareValue, kpi.isLowerBetter)}
              />
            )}
            {kpi.hint === undefined ? null : <p style={hintStyle}>{kpi.hint}</p>}
          </div>
        </StatsCard>
      ))}
    </div>
  );
}
