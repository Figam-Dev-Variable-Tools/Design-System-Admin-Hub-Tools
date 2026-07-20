// 증감 표기 — 색 + 글리프 + 스크린리더 문장의 **3중 인코딩**
//
// [왜 컴포넌트인가]
// 이 3중은 규칙이 아니라 **한 벌의 코드**여야 한다. 예전엔 KPI 카드와 구성비 막대가 각자 증감을
// 그렸고, 둘 다 TONE_COLOR 사본을 들고 있었으며, 그러다 한쪽이 어긋났다:
//   StatsKpiRow  — 색 + ▲/▼ + SR 문장  (3중, 온전)
//   ShareBarList — 색 + ▲/▼          (SR 문장 없음)
// 화살표 '▲' 는 눈에는 방향이지만 스크린리더에는 문자다 — 읽어 주는 이름이 리더·설정마다 다르고
// 아예 건너뛰기도 한다. 그래서 '증가/감소'를 **말로** 한 번 더 해야 방향이 사실로 전달된다.
// 같은 사실을 두 곳에서 각자 인코딩하면 언젠가 한쪽이 빠진다. 그래서 한 곳으로 모은다.
//
// [색은 셋째 신호다] 색은 글리프·문장 위에 얹는 보조일 뿐이다 (WCAG 1.4.1). 색을 빼도 방향은
// ▲/▼ 로 보이고 '증가/감소' 로 들린다.
import type { CSSProperties } from 'react';

import { describeDelta, formatDeltaPercent } from './format';
import type { Delta, DeltaTone, MetricUnit } from './format';
import { cssVar } from '@tds/ui';

const TONE_COLOR: Readonly<Record<DeltaTone, string>> = {
  positive: cssVar('color.feedback.success.text'),
  negative: cssVar('color.feedback.danger.text'),
  neutral: cssVar('color.text.muted'),
};

/**
 * 시각적으로 숨기고 접근성 트리에는 남긴다 — display:none/visibility:hidden 은 SR 에서도 사라진다.
 * 1px 상자로 만들 때 px 리터럴 대신 가장 작은 토큰(border-width-thin)을 쓴다 (TokenGuard).
 */
const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  inlineSize: cssVar('border-width.thin'),
  blockSize: cssVar('border-width.thin'),
  padding: 0,
  margin: 'calc(var(--tds-border-width-thin) * -1)',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * 증감 한 조각 — `▲ 12.3%`(눈) + `비교 기간 대비 12.3% (1,234명) 증가`(귀) + 색(보조).
 *
 * unit 이 필요한 이유: SR 문장은 퍼센트만이 아니라 **실제 증감량**을 단위와 함께 말한다
 * ('12.3% 증가'보다 '12.3% (1,234명) 증가'가 행동 가능한 사실이다).
 */
export function DeltaText({ delta, unit }: { readonly delta: Delta; readonly unit: MetricUnit }) {
  return (
    <span style={{ color: TONE_COLOR[delta.tone] }}>
      {/* 화살표는 장식이 아니라 방향 신호다 — 다만 스크린리더에는 옆 문장으로 다시 전한다 */}
      <span aria-hidden="true">{formatDeltaPercent(delta)}</span>
      <span style={srOnlyStyle}>{describeDelta(delta, unit)}</span>
    </span>
  );
}
