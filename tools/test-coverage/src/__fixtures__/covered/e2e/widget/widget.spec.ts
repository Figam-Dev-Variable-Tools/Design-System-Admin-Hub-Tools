// 골든 픽스처 — E2E 테스트 명명 규칙(`<화면 ID> / <예외 상황> — <단언>`)의 정답지.
// SCR-WIDGET 의 동작 칸 2개(조회 결과 없음 · 권한 없음)를 화면 ID + 상황 이름으로 덮는다.
// 나머지 열 상황은 명세가 `해당 없음` 을 선언했으므로 테스트를 요구하지 않는다 — 그 부재가 정답이다.
import { expect, it } from 'vitest';

import { renderWidgetScreen } from './harness';

it('SCR-WIDGET / 조회 결과 없음 — 항목이 0건이면 안내를 렌더한다', async () => {
  const screen = await renderWidgetScreen({ items: [] });
  expect(screen.getByText('표시할 항목이 없습니다')).toBeInTheDocument();
});

it('SCR-WIDGET / 권한 없음 — 읽기 권한이 없으면 본문 대신 안내를 렌더한다', async () => {
  const screen = await renderWidgetScreen({ canRead: false });
  expect(screen.getByText('접근 권한이 없어요')).toBeInTheDocument();
});
