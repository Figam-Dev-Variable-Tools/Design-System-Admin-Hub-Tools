// Pagination — 계약 검증 테스트 (contracts/Pagination.contract.json@1.0.0)
//
//   states[]        default · hover · focus-visible · disabled
//   events.onChange 선택된 페이지 번호로 발화
//
// 계약: totalPages ≤ 1 이면 렌더하지 않음 · 번호 창 최대 5개 · 현재 페이지 aria-current="page".
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import paginationCss from './Pagination.css?raw';
import { Pagination } from './Pagination';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('Pagination — 계약 states[]', () => {
  it('Pagination: default 상태 — nav + 번호 창(최대 5) + 현재 페이지 aria-current="page"', () => {
    render(<Pagination page={3} totalPages={10} onChange={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: '회원 목록 페이지' })).not.toBeNull();
    // 번호 창 5개 (1~5 가운데 3)
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: new RegExp(`${n}$`) })).not.toBeNull();
    }
    const current = screen.getByRole('button', { name: /현재 페이지, 3/ });
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('Pagination: totalPages ≤ 1 이면 렌더하지 않는다 (단일 페이지엔 페이지네이션이 없다)', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('Pagination: disabled 상태 — 첫 페이지는 이전, 마지막 페이지는 다음이 native disabled', () => {
    const { rerender } = render(<Pagination page={1} totalPages={10} onChange={vi.fn()} />);
    expect(
      (screen.getByRole('button', { name: '이전 페이지' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    rerender(<Pagination page={10} totalPages={10} onChange={vi.fn()} />);
    expect(
      (screen.getByRole('button', { name: '다음 페이지' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('Pagination: hover 상태 — 비활성/비현재 번호에만 배경 강조 규칙이 있다', () => {
    const hover = ruleBody(
      paginationCss,
      ".tds-pagination__page:not(:disabled):not([aria-current='page']):hover",
    );
    expect(hover).not.toBeNull();
    expect(hover).toContain('var(--tds-color-surface-raised)');
  });

  it('Pagination: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<Pagination page={3} totalPages={10} onChange={vi.fn()} />);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '이전 페이지' }));

    const ring = ruleBody(paginationCss, '.tds-pagination__page:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });
});

describe('Pagination — 계약 events.onChange', () => {
  it('Pagination: 이전/다음/번호 클릭이 대상 페이지 번호로 발화한다', async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} totalPages={10} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '이전 페이지' }));
    expect(onChange).toHaveBeenCalledWith(2);

    await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    expect(onChange).toHaveBeenCalledWith(4);

    await userEvent.click(screen.getByRole('button', { name: /5$/ }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('Pagination: 번호 창은 현재 페이지를 가운데 두고 양 끝에서 붙는다', () => {
    const { rerender } = render(<Pagination page={1} totalPages={10} onChange={vi.fn()} />);
    // page=1 → 1..5
    expect(screen.queryByRole('button', { name: /6$/ })).toBeNull();

    rerender(<Pagination page={10} totalPages={10} onChange={vi.fn()} />);
    // page=10 → 6..10
    expect(screen.getByRole('button', { name: /현재 페이지, 10/ })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /^5$/ })).toBeNull();
  });
});
