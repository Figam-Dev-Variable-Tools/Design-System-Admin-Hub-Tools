// 구성비 막대 — 순위 + 점유율
//
// [왜 파이/다계열 차트가 아닌가] 순위가 본질인 데이터는 **한 가지 색의 길이 비교**가 무지개
// 파이보다 읽기 쉽고 색각 이상에도 안전하다. 길이는 정렬된 채로 눈에 들어오지만, 색은 범례를
// 오가며 대조해야 한다.
//
//   ⚠ 예전 이 자리엔 '구분 가능한 계열 색이 2개뿐(chart.series-1/2)'이라는 이유가 함께 적혀
//   있었다. **그 전제는 지금 거짓이다** — TOKEN-13 이 chart.series-3..6 을 추가해 6계열까지
//   서로 다른 hue 가 나온다(LineAreaChart 가 이미 그렇게 쓴다). 색이 모자라서 단색을 고른 게
//   아니라, **이 데이터에는 단색 길이 비교가 맞아서** 고른 것이다. 색이 늘었다고 파이로
//   되돌릴 이유가 되지 않는다.
//
// [막대는 장식이다] 점유율 수치를 글자로 이미 찍으므로 막대에 aria 를 달지 않는다 —
// 스크린리더가 같은 값을 두 번 읽게 하지 않는다.
//
// [상태는 여기가 든다 — StatsTable 과 같은 계약]
// 처음에는 이 컴포넌트가 막대만 그리고 loading/empty 는 호출부가 알아서 했다. 그랬더니 주문·유입·
// 회원 세 화면이 **똑같은 3분기(로딩 문구 → 합계 0 → 막대)** 를 각자 손으로 다시 썼다
// (클린코드 점검 축3에서 중복으로 지적된 지점이다). 같은 자리에 사는 StatsTable 은
// 이미 loading/empty 를 자기가 든다 — 형제 컴포넌트가 상태 계약을 달리 가지면 화면마다 빈 상태가
// 갈라진다. 그래서 계약을 StatsTable 에 맞췄다.
import type { CSSProperties, ReactNode } from 'react';

import { cssVar, Skeleton } from '@tds/ui';

import { DeltaText } from './DeltaText';
import { deltaOf, formatMetric, formatPercentValue, shareOf } from './format';
import type { MetricUnit } from './format';
import type { ShareItem } from './types';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  margin: 0,
  paddingInlineStart: 0,
  listStyle: 'none',
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  color: cssVar('color.text.default'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const valueStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const trackStyle: CSSProperties = {
  blockSize: cssVar('space.2'),
  marginBlockStart: cssVar('space.1'),
  background: cssVar('color.surface.raised'),
  borderRadius: cssVar('radius.full'),
  overflow: 'hidden',
};

const fillStyle: CSSProperties = {
  blockSize: '100%',
  background: cssVar('color.chart.series-1'),
  borderRadius: cssVar('radius.full'),
};

const shareStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

// [이관 메모 — 막대 높이가 space-5 에서 Skeleton 의 space-4 로 줄었다]
// 예전 이 자리에 blockSize: space-5 짜리 skeletonRowStyle 이 있었다. Skeleton 계약의 shape 는
// line(space-4) · circle · block(space-10) 뿐이라 space-5 를 표현할 수단이 없고, 계약에 없는
// style prop 을 뚫는 것은 G6 위반이다. '조금 더 두꺼운 줄' 은 shape 가 아니라 크기 문제이며
// 호출부 하나를 위해 DS enum 을 늘리는 것이 더 나쁜 거래라고 판단해 line 을 그대로 쓴다.
// COMP-06 이 지키려던 것은 **개수**(skeletonCount)이고 그것은 그대로다. 1단계(4px) 차이의
// 시각 판정은 브라우저 없이 확인 불가 — VRT 대상으로 넘긴다.

interface ShareBarListProps {
  readonly items: readonly ShareItem[];
  readonly unit: MetricUnit;
  /** 최초 로드 — 이때만 스켈레톤이다. 재조회는 false 다 (STATE-01) */
  readonly loading: boolean;
  /**
   * 스켈레톤 막대 수 — 이 축의 **항목 수**를 넘긴다(주문 상태 7 · 유입 채널 5 · 회원 등급 4).
   * 로딩 중에는 items 가 비어 있어 셀 수 없으므로 호출부가 준다. 하드코딩된 5줄이 아니라
   * 실제 모양과 같은 수여야 로딩→완료에서 레이아웃이 튀지 않는다 (COMP-06).
   */
  readonly skeletonCount: number;
  /** 합계가 0일 때 — 호출부가 Empty 를 3분기로 만들어 넘긴다 (STATE-05) */
  readonly empty: ReactNode;
}

export function ShareBarList({ items, unit, loading, skeletonCount, empty }: ShareBarListProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  // 스켈레톤은 StatsTable 과 같은 결이다 — 문구가 아니라 올 모양을 미리 그린다
  if (loading) {
    return (
      <div style={listStyle} aria-busy="true">
        {Array.from({ length: skeletonCount }, (_, index) => (
          <Skeleton key={`skeleton-${String(index)}`} />
        ))}
      </div>
    );
  }

  // 조회는 성공했는데 집계된 값이 0 — 에러가 아니다 (STATE-01).
  // 합계가 0이면 모든 막대가 0%라 '데이터가 없다'와 '전부 0이다'를 구분할 수 없다.
  if (total === 0) return <>{empty}</>;

  return (
    <ul style={listStyle}>
      {items.map((item) => {
        const share = shareOf(item.value, total);
        const delta = item.compareValue === null ? null : deltaOf(item.value, item.compareValue);
        return (
          <li key={item.id}>
            <div style={headRowStyle}>
              <span style={labelStyle}>{item.label}</span>
              <span style={valueStyle}>
                <span>{formatMetric(item.value, unit)}</span>
                <span style={shareStyle}>{formatPercentValue(share)}%</span>
                {delta === null ? null : <DeltaText delta={delta} unit={unit} />}
              </span>
            </div>
            <div style={trackStyle}>
              <div
                aria-hidden="true"
                style={{ ...fillStyle, inlineSize: `${formatPercentValue(share)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
