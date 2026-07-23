// StatsTrendChart — Recharts 도입이 무엇을 잃지 않았는지 고정한다 (ADR-0011)
//
// 이 파일이 지키는 것은 '차트가 예쁘게 그려지는가' 가 아니다 — 그건 VRT/눈의 일이다.
// 여기서 고정하는 것은 **라이브러리를 바꿔도 계약이 그대로인가**다:
//   1) role="img" + 추세 문장 aria-label (LineAreaChart 가 주던 유일한 접근성 표면)
//   2) 범례가 **진짜 텍스트**다 — 색 점만으로 계열을 구분시키지 않는다 (WCAG 1.4.1)
//   3) 비교 기간이 없으면 비교 범례도 없다
//
// [jsdom 과 Recharts] ResponsiveContainer 는 ResizeObserver 로 폭을 재는데 jsdom 에는 크기가
// 없다 — 그래서 SVG 내부(경로·눈금)는 렌더되지 않는다. 그것을 단언하지 않는 이유가 이것이며,
// 동시에 **접근성 표면을 SVG 밖(figure/div/ul)에 둔 이유**이기도 하다: 계약이 렌더 엔진의
// 측정 성공 여부에 매달리지 않는다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatsTrendChart } from './StatsTrendChart';

const LABELS = ['7.14', '7.15', '7.16'] as const;
const CURRENT = [10, 30, 20] as const;
const COMPARE = [5, 15, 25] as const;

describe('StatsTrendChart — 엔진이 Recharts 로 바뀌어도 계약은 그대로다', () => {
  it('role=img 와 추세 문장 aria-label 을 그대로 낸다', () => {
    render(
      <StatsTrendChart
        labels={LABELS}
        current={CURRENT}
        compare={COMPARE}
        ariaLabel="7월 방문자 추이 — 합계 60명, 최고 30명. 비교 기간 6월이 함께 표시돼요."
      />,
    );
    expect(
      screen.getByRole('img', {
        name: '7월 방문자 추이 — 합계 60명, 최고 30명. 비교 기간 6월이 함께 표시돼요.',
      }),
    ).toBeDefined();
  });

  it('범례는 색 점이 아니라 텍스트로 계열을 알린다 — 비교 기간이 있으면 둘 다', () => {
    render(
      <StatsTrendChart labels={LABELS} current={CURRENT} compare={COMPARE} ariaLabel="추이" />,
    );
    expect(screen.getByText('현재 기간')).toBeDefined();
    expect(screen.getByText('비교 기간')).toBeDefined();
  });

  it('비교 기간이 null 이면 비교 범례를 그리지 않는다 — 없는 계열을 있다고 말하지 않는다', () => {
    render(<StatsTrendChart labels={LABELS} current={CURRENT} compare={null} ariaLabel="추이" />);
    expect(screen.getByText('현재 기간')).toBeDefined();
    expect(screen.queryByText('비교 기간')).toBeNull();
  });

  it('값이 전부 0 이어도 죽지 않는다 — 집계가 0인 기간은 에러가 아니다 (STATE-01)', () => {
    render(
      <StatsTrendChart labels={LABELS} current={[0, 0, 0]} compare={null} ariaLabel="추이 — 0" />,
    );
    expect(screen.getByRole('img', { name: '추이 — 0' })).toBeDefined();
  });
});
