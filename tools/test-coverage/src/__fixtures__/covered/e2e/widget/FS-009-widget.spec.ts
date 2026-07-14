// 골든 픽스처 — A85 명명 규칙(`FS-NNN-EL-nnn: <축> — <단언>`)의 정답지.
// FS-009-EL-002 의 동작 칸 2개(빈 상태 · 로딩)를 요소번호 + 축 이름으로 덮는다.
// FS-009-EL-001 · EL-003 은 7축이 전부 N/A/위임이므로 테스트를 요구하지 않는다 — 그 부재가 정답이다.
import { expect, it } from 'vitest';

import { renderWidgetScreen } from './harness';

it('FS-009-EL-002: 빈 상태 — 항목이 0건이면 안내를 렌더한다', async () => {
  const screen = await renderWidgetScreen({ items: [] });
  expect(screen.getByText('표시할 항목이 없습니다')).toBeInTheDocument();
});

it('FS-009-EL-002: 로딩 — 조회 중 스켈레톤 3행을 렌더한다', async () => {
  const screen = await renderWidgetScreen({ pending: true });
  expect(screen.getAllByTestId('skeleton-row')).toHaveLength(3);
});
