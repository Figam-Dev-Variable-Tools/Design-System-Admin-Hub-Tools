// RowActions — 계약 검증 테스트 (contracts/RowActions.contract.json@1.0.0)
//
//   states[]                default · hover · focus-visible · disabled
//   events.onEdit/onDelete  blockedWhen: ["disabled"] · 조건부 렌더
//
// 계약 a11y: 버튼 aria-label 은 '{label} 수정' / '{label} 삭제'.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import rowActionsCss from './RowActions.css?raw';
import { RowActions } from './RowActions';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('RowActions — 계약 states[] · 조건부 렌더', () => {
  it('RowActions: default 상태 — onEdit/onDelete 모두 있으면 수정·삭제 두 버튼과 라벨', () => {
    render(<RowActions label="공지 제목" onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: '공지 제목 수정' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '공지 제목 삭제' })).not.toBeNull();
  });

  it('RowActions: onEdit 미지정이면 연필이, onDelete 미지정이면 휴지통이 없다', () => {
    const { rerender } = render(<RowActions label="FAQ" onDelete={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'FAQ 수정' })).toBeNull();
    expect(screen.getByRole('button', { name: 'FAQ 삭제' })).not.toBeNull();

    rerender(<RowActions label="FAQ" onEdit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'FAQ 수정' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'FAQ 삭제' })).toBeNull();
  });

  it('RowActions: disabled 상태 — 두 버튼 모두 native disabled', () => {
    render(<RowActions label="배너" disabled onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect((screen.getByRole('button', { name: '배너 수정' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: '배너 삭제' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('RowActions: hover 상태 — ghost 버튼 배경 강조 규칙이 있다', () => {
    const hover = ruleBody(rowActionsCss, '.tds-rowactions__btn:hover:not(:disabled)');
    expect(hover).not.toBeNull();
    expect(hover).toContain('var(--tds-color-surface-raised)');
  });

  it('RowActions: focus-visible 상태 — 키보드 포커스 + 포커스 링 규칙', async () => {
    render(<RowActions label="약관" onEdit={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '약관 수정' }));

    const ring = ruleBody(rowActionsCss, '.tds-rowactions__btn:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });
});

describe('RowActions — 계약 events.blockedWhen(disabled)', () => {
  it('RowActions: disabled 에서 onEdit/onDelete 가 발화하지 않는다 (계약 blockedWhen: disabled)', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<RowActions label="팝업" disabled onEdit={onEdit} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: '팝업 수정' }), {
      pointerEventsCheck: 0,
    });
    await userEvent.click(screen.getByRole('button', { name: '팝업 삭제' }), {
      pointerEventsCheck: 0,
    });
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('RowActions: 활성 상태에서는 클릭이 발화한다 (비발생 단언이 공허하지 않음)', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<RowActions label="팝업" onEdit={onEdit} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: '팝업 수정' }));
    await userEvent.click(screen.getByRole('button', { name: '팝업 삭제' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
