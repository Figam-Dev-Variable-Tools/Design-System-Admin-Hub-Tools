// SelectionBar — 계약 검증 테스트 (contracts/SelectionBar.contract.json@1.0.0)
//
//   states[]       default · focus-visible
//   events.onClear 선택 해제 발화 (지정 시에만 버튼 렌더)
//
// 계약: count=0 이면 렌더하지 않음 · 천 단위 구분 표기 · region 접근성 이름.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import selectionBarCss from './SelectionBar.css?raw';
import { SelectionBar } from './SelectionBar';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('SelectionBar — 계약 states[]', () => {
  it('SelectionBar: default 상태 — region + 천 단위 구분 개수 + 단위 문구 + 액션', () => {
    render(
      <SelectionBar count={1234} noun="명" onClear={vi.fn()}>
        <button type="button">일괄 삭제</button>
      </SelectionBar>,
    );
    const region = screen.getByRole('region', { name: '선택 항목 일괄 작업' });
    expect(region.textContent).toContain('1,234명 선택됨');
    expect(screen.getByRole('button', { name: '일괄 삭제' })).not.toBeNull();
  });

  it('SelectionBar: count=0 이면 렌더하지 않는다 (선택이 없으면 바가 없다)', () => {
    const { container } = render(
      <SelectionBar count={0} onClear={vi.fn()}>
        <button type="button">일괄 삭제</button>
      </SelectionBar>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('SelectionBar: noun 기본값은 "건"', () => {
    render(
      <SelectionBar count={5}>
        <button type="button">일괄 삭제</button>
      </SelectionBar>,
    );
    expect(screen.getByRole('region').textContent).toContain('5건 선택됨');
  });

  it('SelectionBar: focus-visible 상태 — 해제 버튼이 포커스 링 규칙을 갖는다', async () => {
    render(
      <SelectionBar count={2} onClear={vi.fn()}>
        <button type="button">일괄 삭제</button>
      </SelectionBar>,
    );
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '선택 해제' }));

    const ring = ruleBody(selectionBarCss, '.tds-selectionbar__clear:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });
});

describe('SelectionBar — 계약 events.onClear', () => {
  it('SelectionBar: onClear 지정 시 해제 버튼을 그리고 클릭이 발화한다', async () => {
    const onClear = vi.fn();
    render(
      <SelectionBar count={3} onClear={onClear}>
        <button type="button">일괄 삭제</button>
      </SelectionBar>,
    );
    await userEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('SelectionBar: onClear 미지정이면 해제 버튼이 없다', () => {
    render(
      <SelectionBar count={3}>
        <button type="button">일괄 삭제</button>
      </SelectionBar>,
    );
    expect(screen.queryByRole('button', { name: '선택 해제' })).toBeNull();
  });
});
