// FaqTable 재정렬 UI 동작 단언 (오너 피드백 ③)
//
// 드래그는 마우스 전용이라 jsdom 에서 재현이 불안정하다 — 키보드 대안(위/아래 버튼)이
// 접근성 경로이자 검증 대상이다. 여기서는 그 버튼이 새 순서로 onReorder 를 부르는지,
// 그리고 재정렬 불가(reorderable=false) 화면에서는 버튼이 아예 없는지를 단언한다.
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FaqTable } from './FaqTable';
import type { FaqSummary } from '../types';

const FAQS: readonly FaqSummary[] = [
  {
    id: 'a',
    question: '첫 번째 질문',
    categoryId: 'account',
    categoryLabel: '계정',
    visible: true,
    order: 1,
  },
  {
    id: 'b',
    question: '두 번째 질문',
    categoryId: 'payment',
    categoryLabel: '결제',
    visible: true,
    order: 2,
  },
  {
    id: 'c',
    question: '세 번째 질문',
    categoryId: 'etc',
    categoryLabel: '기타',
    visible: false,
    order: 3,
  },
];

function renderTable(overrides: Partial<Parameters<typeof FaqTable>[0]> = {}) {
  const onReorder = vi.fn();
  render(
    <MemoryRouter>
      <FaqTable
        faqs={FAQS}
        loading={false}
        onDelete={vi.fn()}
        deletingId={null}
        reorderable
        onReorder={onReorder}
        reordering={false}
        selectedIds={new Set()}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
        startIndex={0}
        onToggleVisible={vi.fn()}
        togglingIds={new Set()}
        canUpdate
        canRemove
        {...overrides}
      />
    </MemoryRouter>,
  );
  return { onReorder };
}

describe('FaqTable — 정렬 재정렬', () => {
  it('아래로 이동 버튼은 그 행을 한 칸 아래 순서로 onReorder 한다', async () => {
    const user = userEvent.setup();
    const { onReorder } = renderTable();
    // 두 번째 인자는 **움직인 행**이다 — DS useReorderableRows 가 함께 넘긴다(라이브 영역 낭독용).
    // ['a','b','c'] → ['b','a','c'] 는 'a 를 내렸다' 와 'b 를 올렸다' 가 만드는 같은 배열이라,
    // 배열만 단언하면 어느 쪽 버튼을 눌러도 통과한다.
    await user.click(screen.getByRole('button', { name: '첫 번째 질문 아래로 이동' }));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'], 'a');
  });

  it('위로 이동 버튼은 그 행을 한 칸 위 순서로 onReorder 한다', async () => {
    const user = userEvent.setup();
    const { onReorder } = renderTable();
    await user.click(screen.getByRole('button', { name: '세 번째 질문 위로 이동' }));
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b'], 'c');
  });

  it('첫 행의 위로·마지막 행의 아래로 버튼은 잠긴다', () => {
    renderTable();
    expect(
      (screen.getByRole('button', { name: '첫 번째 질문 위로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '세 번째 질문 아래로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('재정렬 저장 중에는 이동 버튼이 전부 잠긴다', () => {
    renderTable({ reordering: true });
    expect(
      (screen.getByRole('button', { name: '두 번째 질문 아래로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('재정렬 불가(필터/검색) 화면에서는 이동 버튼이 없다', () => {
    renderTable({ reorderable: false });
    expect(screen.queryByRole('button', { name: /이동/ })).toBeNull();
  });
});
