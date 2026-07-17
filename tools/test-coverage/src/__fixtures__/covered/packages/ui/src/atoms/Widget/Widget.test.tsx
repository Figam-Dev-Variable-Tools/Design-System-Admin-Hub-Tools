// 골든 픽스처 — 테스트 커버리지 자기 검증(selftest)의 입력. 실행되지 않는다(러너 대상 아님).
// Widget.contract.json 의 states 3개 + events.onClick.blockedWhen 2개를 전수 덮는 "정답지"다.
// selftest 는 이 파일에서 blockedWhen 테스트를 지웠을 때 테스트 커버리지이 blocker 를 띄우는지 확인한다.
import { fn } from '@storybook/test';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { Widget } from './Widget';

it('Widget: renders default state', () => {
  render(<Widget />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});

it('Widget: renders disabled state', () => {
  render(<Widget disabled />);
  expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
});

it('Widget: renders loading state', () => {
  render(<Widget loading />);
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
});

// ── blockedWhen — 금지 동작의 **비발생**을 스파이로 관찰한다 ────────────────
// 렌더 단언(toHaveAttribute('aria-disabled'))으로는 이것을 증명할 수 없다.

it('Widget: onClick — disabled 상태에서 발화하지 않는다', () => {
  const spy = fn();
  render(<Widget disabled onClick={spy} />);
  fireEvent.click(screen.getByRole('button'));
  expect(spy).not.toHaveBeenCalled();
});

it('Widget: onClick — loading 상태에서 발화하지 않는다', () => {
  const spy = fn();
  render(<Widget loading onClick={spy} />);
  fireEvent.click(screen.getByRole('button'));
  expect(spy).not.toHaveBeenCalled();
});
