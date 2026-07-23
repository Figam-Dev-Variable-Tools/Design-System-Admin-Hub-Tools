// TableReorder — 동작 고정 테스트 (계약 비대상 순수 훅/유틸 + 표 조각)
//
// moveArrayItem(순수 연산) · useReorderableRows(드래그/키보드 이동) · ReorderMoveButtons(경계 잠금) ·
// ReorderGripCell/HeaderCell(표시). 순수 로직이라 스토리 없이 테스트로만 동작을 고정한다.
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  moveArrayItem,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  useReorderableRows,
} from './TableReorder';

describe('moveArrayItem — 재정렬의 원자 연산', () => {
  it('from → to 로 옮긴 새 배열을 돌려준다', () => {
    expect(moveArrayItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveArrayItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveArrayItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  });

  it('범위를 벗어나거나 from===to 이면 원본 복사본을 돌려준다(불변)', () => {
    const src = ['a', 'b', 'c'];
    expect(moveArrayItem(src, 1, 1)).toEqual(src);
    expect(moveArrayItem(src, -1, 0)).toEqual(src);
    expect(moveArrayItem(src, 0, 9)).toEqual(src);
    // 새 배열이어야 한다 (원본 참조 아님)
    expect(moveArrayItem(src, 1, 1)).not.toBe(src);
  });
});

describe('useReorderableRows — 드래그/키보드 이동', () => {
  it('moveBy 가 index 를 delta 만큼 옮긴 새 순서로 onReorder 를 부른다', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderableRows(['a', 'b', 'c'], onReorder, false));
    act(() => result.current.moveBy(0, 1));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'], 'a');
  });

  /**
   * 움직인 행의 id 를 함께 넘긴다 — 배열만으로는 되짚을 수 없다.
   * ['a','b','c'] → ['b','a','c'] 는 'a 를 내렸다' 와 'b 를 올렸다' 가 만드는 **같은 배열**이라,
   * 호출부가 diff 로 추측하면 라이브 영역이 엉뚱한 행을 부른다.
   */
  it('이웃 맞바꿈에서도 무엇이 움직였는지 구별된다 (같은 배열 · 다른 movedId)', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderableRows(['a', 'b', 'c'], onReorder, false));
    act(() => result.current.moveBy(0, 1)); // a 를 아래로
    act(() => result.current.moveBy(1, -1)); // (같은 ids 기준) b 를 위로
    expect(onReorder.mock.calls[0]).toEqual([['b', 'a', 'c'], 'a']);
    expect(onReorder.mock.calls[1]).toEqual([['b', 'a', 'c'], 'b']);
  });

  it('locked 이면 rowProps.draggable 가 false 다 (저장 중 드래그 잠금)', () => {
    const { result } = renderHook(() => useReorderableRows(['a', 'b'], vi.fn(), true));
    expect(result.current.rowProps('a').draggable).toBe(false);
  });

  it('rowStyle 은 base 스타일을 보존한다(피드백을 얹기만 한다)', () => {
    const { result } = renderHook(() => useReorderableRows(['a', 'b'], vi.fn(), false));
    const base = { background: 'red' };
    expect(result.current.rowStyle('a', base)).toMatchObject(base);
  });
});

describe('ReorderMoveButtons — 경계 잠금 + onMove', () => {
  function renderButtons(props: {
    index: number;
    count: number;
    locked: boolean;
    onMove: (i: number, d: number) => void;
  }) {
    return render(
      <table>
        <tbody>
          <tr>
            <td>
              <ReorderMoveButtons label="첫 번째 질문" {...props} />
            </td>
          </tr>
        </tbody>
      </table>,
    );
  }

  it('첫 행은 위로가, 마지막 행은 아래로가 잠긴다', () => {
    renderButtons({ index: 0, count: 3, locked: false, onMove: vi.fn() });
    expect(
      (screen.getByRole('button', { name: '첫 번째 질문 위로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '첫 번째 질문 아래로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('locked 이면 둘 다 잠긴다', () => {
    renderButtons({ index: 1, count: 3, locked: true, onMove: vi.fn() });
    expect(
      (screen.getByRole('button', { name: '첫 번째 질문 위로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '첫 번째 질문 아래로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('클릭이 onMove(index, ±1) 로 발화한다', async () => {
    const onMove = vi.fn();
    renderButtons({ index: 1, count: 3, locked: false, onMove });
    await userEvent.click(screen.getByRole('button', { name: '첫 번째 질문 위로 이동' }));
    expect(onMove).toHaveBeenCalledWith(1, -1);
    await userEvent.click(screen.getByRole('button', { name: '첫 번째 질문 아래로 이동' }));
    expect(onMove).toHaveBeenCalledWith(1, 1);
  });
});

describe('ReorderGripCell · ReorderGripHeaderCell — 표시', () => {
  it('헤더 grip 열은 보이지 않는 라벨을 둔다', () => {
    render(
      <table>
        <thead>
          <tr>
            <ReorderGripHeaderCell />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByText('정렬 손잡이')).not.toBeNull();
  });

  it('행 grip 열은 aria-hidden 장식 셀이다', () => {
    render(
      <table>
        <tbody>
          <tr>
            <ReorderGripCell />
          </tr>
        </tbody>
      </table>,
    );
    // aria-hidden 셀이라 role=cell 로 잡히지 않는다
    expect(screen.queryByRole('cell')).toBeNull();
  });
});
