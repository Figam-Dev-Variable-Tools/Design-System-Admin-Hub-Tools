// RowSelectCell — 계약 검증 테스트 (contracts/RowSelectCell.contract.json@1.0.0)
//
//   states[]        default · focus-visible · checked
//   events.onToggle 다음 선택 상태(boolean)로 발화
//
// 계약 a11y: 시각적으로 숨긴 라벨(span#select-{id})을 aria-labelledby 로 잇는다.
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import rowSelectCellCss from './RowSelectCell.css?raw';
import { RowSelectCell } from './RowSelectCell';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

function renderInTable(ui: ReactElement) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('RowSelectCell — 계약 states[]', () => {
  it('RowSelectCell: default 상태(미선택) — 숨긴 라벨로 접근 이름을 얻고 미체크', () => {
    renderInTable(
      <RowSelectCell id="faq-1" label="첫 번째 질문 선택" checked={false} onToggle={vi.fn()} />,
    );
    const box = screen.getByRole('checkbox', { name: '첫 번째 질문 선택' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    // aria-labelledby 가 id 파생 라벨(select-faq-1)을 가리킨다
    expect(box.getAttribute('aria-labelledby')).toBe('select-faq-1');
  });

  it('RowSelectCell: checked 상태 — native checked', () => {
    renderInTable(<RowSelectCell id="m-9" label="회원 선택" checked onToggle={vi.fn()} />);
    expect((screen.getByRole('checkbox', { name: '회원 선택' }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('RowSelectCell: focus-visible 상태 — 키보드 포커스 + 포커스 링 규칙', async () => {
    renderInTable(<RowSelectCell id="x" label="선택" checked={false} onToggle={vi.fn()} />);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: '선택' }));

    const ring = ruleBody(rowSelectCellCss, '.tds-rowselectcell__input:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });
});

describe('RowSelectCell — 계약 events.onToggle', () => {
  it('RowSelectCell: 클릭이 다음 선택 상태(boolean)로 발화한다', async () => {
    const onToggle = vi.fn();
    renderInTable(<RowSelectCell id="a" label="선택" checked={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox', { name: '선택' }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
