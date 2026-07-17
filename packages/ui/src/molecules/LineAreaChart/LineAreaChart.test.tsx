// LineAreaChart — 계약 검증 테스트 (contracts/LineAreaChart.contract.json@1.1.0)
//
//   states[]   default · loading
//   events     없음 → blockedWhen 없음
//
// ⚠ loading 상태는 **테스트할 수 없다**: 계약이 `states: ["default","loading"]` 과
//   `a11y.ariaBusy: "when loading"` 을 선언하면서도 **loading 을 켤 prop 을 선언하지 않았다**
//   (props = series · labels · showLegend · ariaLabel).
//   계약 엔지니어에 변경 요청 발행. 그때까지 미커버로 남긴다.
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

// TOKEN-13 acceptanceCheck: "chart story 가 하드코딩 색 없이 6개 구분 series 렌더"
// 스토리는 눈으로만 확인되므로, '되돌아옴' 회귀는 여기서 기계적으로 막는다.
describe('LineAreaChart — 6계열 categorical 팔레트 (TOKEN-13)', () => {
  const sixSeries = Array.from({ length: 6 }, (_, index) => ({
    id: `s${String(index + 1)}`,
    label: `계열 ${String(index + 1)}`,
    kind: 'line' as const,
    values: [10, 20, 30],
  }));

  it('LineAreaChart: 6계열이 서로 다른 색 토큰을 받는다 (3번째부터 1번 색으로 되돌아오지 않는다)', () => {
    const { container } = render(
      <LineAreaChart series={sixSeries} labels={labels} ariaLabel="6계열 분포" />,
    );

    const dots = [...container.querySelectorAll('.tds-chart__legend-dot')];
    expect(dots).toHaveLength(6);

    const colors = dots.map((dot) => (dot as HTMLElement).style.background);
    expect(new Set(colors).size).toBe(6);
  });

  it('LineAreaChart: 계열 색은 전부 chart.series-* 토큰 참조다 (하드코딩 색 0건)', () => {
    const { container } = render(
      <LineAreaChart series={sixSeries} labels={labels} ariaLabel="6계열 분포" />,
    );

    for (const dot of container.querySelectorAll('.tds-chart__legend-dot')) {
      expect((dot as HTMLElement).style.background).toMatch(
        /^var\(--tds-color-chart-series-[1-6]\)$/,
      );
    }
  });

  it('LineAreaChart: 7번째 계열부터 순환한다 (토큰 수를 넘으면 1번으로 되돌아온다)', () => {
    const seven = [
      ...sixSeries,
      { id: 's7', label: '계열 7', kind: 'line' as const, values: [10, 20, 30] },
    ];
    const { container } = render(
      <LineAreaChart series={seven} labels={labels} ariaLabel="7계열 분포" />,
    );

    const dots = [...container.querySelectorAll('.tds-chart__legend-dot')];
    expect((dots[6] as HTMLElement).style.background).toBe(
      (dots[0] as HTMLElement).style.background,
    );
  });
});
