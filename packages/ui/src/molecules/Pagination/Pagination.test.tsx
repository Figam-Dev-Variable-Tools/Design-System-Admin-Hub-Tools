// Pagination — 계약 검증 테스트 (contracts/Pagination.contract.json@1.1.0)
//
//   states[]              default · hover · focus-visible · disabled
//   events.onChange       선택된 페이지 번호로 발화
//   events.onPageSizeChange  고른 page size 로 발화
//   props(ERP-05)         total · pageSize(opt-in 스위치) · pageSizeOptions · sizeLabel
//
// 계약: totalPages ≤ 1 이면 렌더하지 않음 · 번호 창 최대 5개 · 현재 페이지 aria-current="page".
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import paginationCss from './Pagination.css?raw';
import { Pagination, rangeTextOf } from './Pagination';

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

// ERP-05 acceptanceCheck: "Pagination 이 공유 formatter 로 range 텍스트와 size selector 렌더.
//                          range math 경계를 unit test 로 커버. aria-current/label 보존."
//
// 범위 계산은 순수 함수라 렌더를 거치지 않고 경계를 직접 못 박는다 — 오프-바이-원이 살 곳을 없앤다.
describe('Pagination — rangeTextOf 경계 (ERP-05)', () => {
  it('rangeTextOf: 0건 — x–y 없이 "전체 0건"', () => {
    expect(rangeTextOf(0, 1, 10)).toBe('전체 0건');
  });

  it('rangeTextOf: 1페이지에 다 들어가면 1–total (마지막이 pageSize 가 아니라 total 에서 잘린다)', () => {
    expect(rangeTextOf(3, 1, 10)).toBe('전체 3건 중 1–3');
  });

  it('rangeTextOf: 첫 페이지 — 1–pageSize', () => {
    expect(rangeTextOf(97, 1, 10)).toBe('전체 97건 중 1–10');
  });

  it('rangeTextOf: 중간 페이지 — first 는 (page-1)*pageSize+1', () => {
    expect(rangeTextOf(97, 5, 10)).toBe('전체 97건 중 41–50');
  });

  it('rangeTextOf: 마지막 페이지(부분) — y 가 total 에서 잘린다', () => {
    expect(rangeTextOf(97, 10, 10)).toBe('전체 97건 중 91–97');
  });

  it('rangeTextOf: 마지막 페이지(딱 떨어짐) — y === total', () => {
    expect(rangeTextOf(100, 10, 10)).toBe('전체 100건 중 91–100');
  });

  it('rangeTextOf: 정확히 1건 — 1–1', () => {
    expect(rangeTextOf(1, 1, 10)).toBe('전체 1건 중 1–1');
  });

  it('rangeTextOf: pageSize 경계(1) — 페이지마다 한 행', () => {
    expect(rangeTextOf(3, 2, 1)).toBe('전체 3건 중 2–2');
  });

  it('rangeTextOf: page 가 범위를 넘으면 마지막 유효 페이지로 clamp 한다 (동시 삭제 후 헛 범위 금지)', () => {
    // total 이 3건으로 줄었는데 page 가 아직 9 면 '전체 3건 중 81–83' 같은 헛것이 나오면 안 된다
    expect(rangeTextOf(3, 9, 10)).toBe('전체 3건 중 1–3');
  });

  it('rangeTextOf: page 가 0/음수여도 첫 페이지로 clamp 한다', () => {
    expect(rangeTextOf(97, 0, 10)).toBe('전체 97건 중 1–10');
  });

  it('rangeTextOf: ko-KR 자릿수 구분 — 1,000 단위 콤마', () => {
    expect(rangeTextOf(12345, 2, 100)).toBe('전체 12,345건 중 101–200');
  });
});

describe('Pagination — 범위 요약 · 크기 선택 (ERP-05)', () => {
  it('Pagination: pageSize 를 주면 범위 요약을 role=status 로 그린다 (AT 에도 announce)', () => {
    render(<Pagination page={2} totalPages={10} total={97} pageSize={10} onChange={vi.fn()} />);

    const summary = screen.getByRole('status');
    expect(summary.textContent).toBe('전체 97건 중 11–20');
  });

  it('Pagination: pageSizeOptions 를 주면 가시 라벨과 연결된 크기 선택을 그린다', () => {
    render(
      <Pagination
        page={1}
        totalPages={10}
        total={97}
        pageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('페이지당') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('10');
    expect([...select.options].map((o) => o.textContent)).toEqual([
      '10건',
      '25건',
      '50건',
      '100건',
    ]);
  });

  it('Pagination: sizeLabel 로 크기 선택 라벨을 바꾼다 (목록마다 세는 단위가 다르다)', () => {
    render(
      <Pagination
        page={1}
        totalPages={10}
        total={97}
        pageSize={20}
        pageSizeOptions={[20, 50]}
        sizeLabel="페이지당 행 수"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('페이지당 행 수')).not.toBeNull();
  });

  it('Pagination: 크기를 고르면 onPageSizeChange 가 숫자로 발화한다', async () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={1}
        totalPages={10}
        total={97}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        onChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('페이지당'), '50');

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    // 문자열이 아니라 숫자로 넘긴다 (계약 payload: number)
    expect(onPageSizeChange).not.toHaveBeenCalledWith('50');
  });

  it('Pagination: 0건 — 번호 줄은 감추고 "전체 0건" 요약은 남긴다', () => {
    render(
      <Pagination
        page={1}
        totalPages={0}
        total={0}
        pageSize={10}
        pageSizeOptions={[10, 25]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('status').textContent).toBe('전체 0건');
    expect(screen.queryByRole('navigation')).toBeNull();
    // 0건에서도 크기 선택은 남는다 — 크기를 늘려 다시 조회하는 길을 막지 않는다
    expect(screen.getByLabelText('페이지당')).not.toBeNull();
  });

  it('Pagination: 1페이지 — 번호 줄은 감추고 요약은 남긴다', () => {
    render(<Pagination page={1} totalPages={1} total={3} pageSize={10} onChange={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toBe('전체 3건 중 1–3');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('Pagination: 범위 표면을 켜도 aria-current/label 이 보존된다 (계약 a11y 회귀 금지)', () => {
    render(
      <Pagination
        page={3}
        totalPages={10}
        total={97}
        pageSize={10}
        pageSizeOptions={[10, 25]}
        label="로그 페이지"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('navigation', { name: '로그 페이지' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: /현재 페이지, 3/ }).getAttribute('aria-current'),
    ).toBe('page');
  });
});

// 기존 소비자 11곳은 pageSize 를 넘기지 않는다 — 그들에게 1.0.0 과 렌더가 동일함을 못 박는다.
describe('Pagination — pageSize 미지정 시 1.0.0 동작 유지 (하위호환)', () => {
  it('Pagination: pageSize 미지정이면 범위 요약도 크기 선택도 그리지 않는다', () => {
    render(<Pagination page={3} totalPages={10} total={97} onChange={vi.fn()} />);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('Pagination: pageSize 미지정이면 최상위가 <nav> 그대로다 (DOM 구조 무변경)', () => {
    const { container } = render(<Pagination page={3} totalPages={10} onChange={vi.fn()} />);

    expect((container.firstChild as HTMLElement).tagName).toBe('NAV');
    expect((container.firstChild as HTMLElement).className).toBe('tds-pagination');
  });

  it('Pagination: pageSize 미지정 + totalPages ≤ 1 이면 여전히 null 이다', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={3} onChange={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('Pagination: pageSize 는 있고 pageSizeOptions 가 비면 요약만 그린다 (두 표면은 따로 켠다)', () => {
    render(<Pagination page={2} totalPages={10} total={97} pageSize={10} onChange={vi.fn()} />);

    expect(screen.getByRole('status')).not.toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
