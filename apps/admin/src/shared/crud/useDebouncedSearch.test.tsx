// 한글(IME) 안전 검색 (COMP-10)
//
// 이 축은 **영어 QA 에 보이지 않는다** — 조합 이벤트가 없는 입력에서는 모든 것이 정상으로 보인다.
// 그래서 계약을 여기서 못 박는다: 조합 중에는 커밋하지 않고, 조합 중 Enter 는 제출하지 않는다.
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDebouncedSearch } from './useDebouncedSearch';

function Harness({ onCommit, minLength }: { onCommit: (v: string) => void; minLength?: number }) {
  const [initial] = useState('');
  const { input, setInput, inputProps } = useDebouncedSearch({
    initial,
    onCommit,
    ...(minLength !== undefined && { minLength }),
  });

  return (
    <input
      aria-label="검색"
      value={input}
      onChange={(event) => setInput(event.target.value)}
      {...inputProps}
    />
  );
}

/** 250ms 디바운스를 넘긴다 — 실시간을 기다리면 테스트가 느리고 불안정하다 */
async function afterDebounce(): Promise<void> {
  await vi.advanceTimersByTimeAsync(300);
}

describe('useDebouncedSearch — 디바운스', () => {
  it('타이핑이 멈춘 뒤 한 번만 커밋한다 — 글자마다 조회하지 않는다', async () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색');

    fireEvent.change(input, { target: { value: 'h' } });
    fireEvent.change(input, { target: { value: 'ho' } });
    fireEvent.change(input, { target: { value: 'hong' } });
    expect(onCommit).not.toHaveBeenCalled();

    await afterDebounce();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('hong');
    vi.useRealTimers();
  });

  it('앞뒤 공백을 떼고 커밋한다', async () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    fireEvent.change(screen.getByLabelText('검색'), { target: { value: '  홍길동  ' } });
    await afterDebounce();

    expect(onCommit).toHaveBeenCalledWith('홍길동');
    vi.useRealTimers();
  });

  it('minLength 미만은 커밋하지 않지만, 빈 문자열(검색 해제)은 언제나 커밋한다', async () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} minLength={2} />);
    const input = screen.getByLabelText('검색');

    fireEvent.change(input, { target: { value: '홍' } });
    await afterDebounce();
    expect(onCommit).not.toHaveBeenCalled();

    // 지우는 것은 '검색 해제' 라 길이 정책과 무관하다 — 안 그러면 검색을 못 지운다
    fireEvent.change(input, { target: { value: '' } });
    await afterDebounce();
    expect(onCommit).toHaveBeenCalledWith('');
    vi.useRealTimers();
  });
});

describe('useDebouncedSearch — IME 조합 (COMP-10)', () => {
  /**
   * 한글 '홍' 하나를 치는 동안 change 는 'ㅎ' → '호' → '홍' 으로 세 번 온다.
   * 조합 중 커밋하면 자모 단위 부분 문자열로 조회가 나간다.
   */
  it('조합 중에는 커밋하지 않고, 조합이 끝난 뒤 완성된 값으로 한 번만 커밋한다', async () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ㅎ' } });
    await afterDebounce();
    fireEvent.change(input, { target: { value: '호' } });
    await afterDebounce();
    fireEvent.change(input, { target: { value: '홍' } });
    await afterDebounce();

    // 조합 중에는 디바운스가 지나도 커밋이 없다
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { target: { value: '홍' } });
    await afterDebounce();

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('홍');
    vi.useRealTimers();
  });

  /**
   * 조합 중 Enter 는 **IME 의 확정 키**다. 이것을 제출로 처리하면 '홍길ㄷ' 같은 부분 문자열이
   * 나간다 — 사용자는 조합을 끝냈을 뿐인데 화면이 엉뚱한 결과로 바뀐다.
   */
  it('조합 중 Enter 는 커밋하지 않는다 (nativeEvent.isComposing)', async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색');

    fireEvent.change(input, { target: { value: '홍길ㄷ' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onCommit).not.toHaveBeenCalled();
  });

  /**
   * isComposing 이 누락된 합성 이벤트(자동화·일부 IME)에서도 막혀야 한다 —
   * 우리가 관측한 compositionstart 가 두 번째 신호다.
   */
  it('isComposing 이 없어도 compositionstart 이후의 Enter 는 커밋하지 않는다', async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색');

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍길ㄷ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('조합이 아닌 Enter 는 디바운스를 기다리지 않고 즉시 커밋한다 (명시적 제출)', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색');

    fireEvent.change(input, { target: { value: 'hong' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('hong');
  });
});
