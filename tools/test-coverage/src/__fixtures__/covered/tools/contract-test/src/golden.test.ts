// 골든 픽스처 테스트 — 입력 → 기대 출력. 검증 도구의 판정을 검증한다.
import { expect, it } from 'vitest';
it('golden: Widget.input.json → Widget.expected.txt', () => {
  expect(generate(readFixture('Widget.input.json'))).toBe(readFixture('Widget.expected.txt'));
});
