// 한글 IME 검색 입력 — 조합 중 커밋 금지 단언 (COMP-10 · P0)
//
// [왜 DOM 수준으로 검증하나] 이 로직의 버그는 **영어로 타이핑하면 절대 재현되지 않는다.**
// 순수 함수 테스트로도 잡히지 않는다 — composition 이벤트와 input 이벤트의 **순서**가 본질이기
// 때문이다. 그래서 진짜 <input> 에 진짜 조합 이벤트를 흘려보내 단언한다.
//
// 재현하는 시나리오는 실제 브라우저가 '홍길동'을 칠 때 내는 이벤트 열이다:
//   compositionstart → input(ㅎ) → input(호) → input(홍) → … → compositionend(홍길동) → input(홍길동)
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useImeSearch } from './useImeSearch';

/** 실제 화면과 같은 배선 — 훅이 준 props 를 그대로 <input> 에 붙인다 */
function Harness({ onCommit }: { readonly onCommit: (keyword: string) => void }) {
  const [committed, setCommitted] = useState('');
  const search = useImeSearch(committed, (keyword) => {
    setCommitted(keyword);
    onCommit(keyword);
  });

  return (
    <input
      aria-label="검색어"
      value={search.value}
      onChange={(event) => {
        search.onChange(event.target.value);
      }}
      {...search.inputProps}
    />
  );
}

/** 조합 중 한 글자 — 브라우저는 조합 중에도 input 이벤트를 낸다 */
function typeComposing(input: HTMLElement, value: string): void {
  fireEvent.change(input, { target: { value } });
}

describe('useImeSearch — 한글 조합 (COMP-10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('한글 단어를 완성하면 조회는 정확히 1번 발행된다 — 자모마다가 아니다', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색어');

    fireEvent.compositionStart(input);
    typeComposing(input, 'ㅎ');
    typeComposing(input, '호');
    typeComposing(input, '홍');
    typeComposing(input, '홍ㄱ');
    typeComposing(input, '홍기');
    typeComposing(input, '홍길');
    typeComposing(input, '홍길ㄷ');
    typeComposing(input, '홍길도');
    typeComposing(input, '홍길동');

    // 조합이 끝나기 전에는 시간이 아무리 흘러도 커밋하지 않는다
    vi.advanceTimersByTime(5000);
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { target: { value: '홍길동' } });
    vi.advanceTimersByTime(5000);

    // 자모 9번이 아니라 완성된 단어 1번
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('홍길동');
  });

  it('조합 중 Enter 는 검색을 확정하지 않는다 — 그 Enter 는 글자를 확정하는 Enter 다', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색어');

    fireEvent.compositionStart(input);
    typeComposing(input, '홍길');
    // isComposing=true 인 Enter — '홍길'로 검색되면 안 된다
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('조합이 끝난 뒤의 Enter 는 디바운스를 기다리지 않고 즉시 검색한다', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색어');

    fireEvent.compositionStart(input);
    typeComposing(input, '원피스');
    fireEvent.compositionEnd(input, { target: { value: '원피스' } });

    // 디바운스가 끝나기 전에 Enter — 즉시 나가야 한다
    fireEvent.keyDown(input, { key: 'Enter', isComposing: false });
    expect(onCommit).toHaveBeenCalledWith('원피스');
  });

  it('영문은 조합이 없으므로 디바운스만 지나면 커밋된다', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('검색어');

    typeComposing(input, 'n');
    typeComposing(input, 'ni');
    typeComposing(input, 'nik');
    typeComposing(input, 'nike');

    // 디바운스 전에는 아직
    vi.advanceTimersByTime(100);
    expect(onCommit).not.toHaveBeenCalled();

    // 4글자를 쳤지만 커밋은 마지막 1번뿐이다
    vi.advanceTimersByTime(300);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('nike');
  });

  it('밖에서 검색어가 바뀌면(뒤로가기·링크 진입) 입력창이 따라온다', () => {
    function ExternalHarness({ committed }: { readonly committed: string }) {
      const search = useImeSearch(committed, vi.fn());
      return <input aria-label="검색어" value={search.value} onChange={() => undefined} />;
    }

    const inputValue = (): string => screen.getByLabelText<HTMLInputElement>('검색어').value;

    const { rerender } = render(<ExternalHarness committed="원피스" />);
    expect(inputValue()).toBe('원피스');

    // URL 이 바뀐 상황 — 입력창이 URL 을 따라야 한다 (IA-13)
    rerender(<ExternalHarness committed="니트" />);
    expect(inputValue()).toBe('니트');
  });
});
