// ListRow — 계약 검증 테스트 (contracts/ListRow.contract.json@1.0.0)
//
//   states[]         default · hover · focus-visible
//   events.onClick   blockedWhen 없음 — 계약이 금지 상태를 선언하지 않았으므로 **항상 발화해야 한다**
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import listRowCss from './ListRow.css?raw';
import { ListRow } from './ListRow';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('ListRow — 계약 states[]', () => {
  it('ListRow: default 상태 — href 가 없으면 button, 있으면 link 로 렌더된다', () => {
    const { unmount } = render(<ListRow title="주문 1024번" meta="김철수 · 3분 전" />);
    expect(screen.getByRole('button', { name: /주문 1024번/ })).not.toBeNull();
    unmount();

    render(<ListRow title="주문 1024번" href="/orders/1024" />);
    const link = screen.getByRole('link', { name: /주문 1024번/ });
    expect(link.getAttribute('href')).toBe('/orders/1024');
  });

  it('ListRow: default 상태 — 아이콘 슬롯은 장식이므로 aria-hidden=true 다', () => {
    const { container } = render(<ListRow title="주문 1024번" icon={<span>*</span>} />);
    const icon = container.querySelector('.tds-listrow__icon');

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('ListRow: hover 상태 — :hover 규칙이 행 배경을 raised 표면으로 바꾼다', () => {
    const rule = ruleBody(listRowCss, '.tds-listrow:hover');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-surface-raised)');
  });

  it('ListRow: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<ListRow title="주문 1024번" />);
    const row = screen.getByRole('button', { name: /주문 1024번/ });

    await userEvent.tab();
    expect(document.activeElement).toBe(row);

    const ring = ruleBody(listRowCss, '.tds-listrow:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });
});

describe('ListRow — 계약 events.onClick', () => {
  it('ListRow: onClick 은 button 행에서 발화한다', async () => {
    const onClick = vi.fn();
    render(<ListRow title="주문 1024번" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: /주문 1024번/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ListRow: onClick 은 href 가 있는 link 행에서도 발화한다 (라우팅 가로채기·계측을 위해)', async () => {
    const onClick = vi.fn();
    render(<ListRow title="주문 1024번" href="/orders/1024" onClick={onClick} />);

    await userEvent.click(screen.getByRole('link', { name: /주문 1024번/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
