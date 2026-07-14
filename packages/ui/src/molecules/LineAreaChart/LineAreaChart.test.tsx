// LineAreaChart — 계약 검증 테스트 (contracts/LineAreaChart.contract.json@1.0.0)
//
//   states[]   default · loading
//   events     없음 → blockedWhen 없음
//
// ⚠ loading 상태는 **테스트할 수 없다**: 계약이 `states: ["default","loading"]` 과
//   `a11y.ariaBusy: "when loading"` 을 선언하면서도 **loading 을 켤 prop 을 선언하지 않았다**
//   (props = series · labels · showLegend · ariaLabel).
//   A18 에 change_request 발행 — orchestration/tasks/CR-2026-0715-002.json. 그때까지 미커버로 남긴다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineAreaChart } from './LineAreaChart';

const series = [
  { id: 'visitors', label: '방문자', kind: 'area' as const, values: [10, 40, 30] },
  { id: 'views', label: '페이지뷰', kind: 'line' as const, values: [20, 25, 60] },
];
const labels = ['월', '화', '수'];

describe('LineAreaChart — 계약 states[]', () => {
  it('LineAreaChart: default 상태 — role=img 가 ariaLabel 로 이름을 갖는다', () => {
    render(<LineAreaChart series={series} labels={labels} ariaLabel="주간 방문자 추세" />);

    expect(screen.getByRole('img', { name: '주간 방문자 추세' })).not.toBeNull();
  });

  it('LineAreaChart: default 상태 — showLegend=true(기본) 면 계열 범례를 렌더하고 색 점은 aria-hidden 이다', () => {
    const { container } = render(
      <LineAreaChart series={series} labels={labels} ariaLabel="주간 방문자 추세" />,
    );

    expect(container.querySelectorAll('.tds-chart__legend-item')).toHaveLength(2);
    expect(screen.getByText('페이지뷰')).not.toBeNull();
    for (const dot of container.querySelectorAll('.tds-chart__legend-dot')) {
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('LineAreaChart: default 상태 — showLegend=false 면 범례를 렌더하지 않고 x축 라벨은 그대로 그린다', () => {
    const { container } = render(
      <LineAreaChart
        series={series}
        labels={labels}
        showLegend={false}
        ariaLabel="주간 방문자 추세"
      />,
    );

    expect(container.querySelector('.tds-chart__legend')).toBeNull();
    for (const label of labels) {
      expect(screen.getByText(label)).not.toBeNull();
    }
  });
});
