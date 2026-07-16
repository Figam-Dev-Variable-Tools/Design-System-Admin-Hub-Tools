// 목록 조회 상태 훅 회귀 테스트 — COMP-10(한글 IME) · IA-13(URL 직렬화)
//
// 이 훅의 값어치는 전부 '언제 커밋하느냐'에 있다. 순수 함수가 아니므로(타이머·URL) 실제로 렌더해
// 조합 이벤트를 흘려보내며 커밋을 센다 — 자모마다 질의가 나가는 회귀를 잡는 유일한 방법이다.
//
// [fireEvent 를 쓰는 이유] input.value 를 직접 넣고 Event('input') 을 쏘면 React 의 value tracker 를
// 우회해 onChange 가 발화하지 않는다 — 아무것도 구동하지 못한 채 통과하는 무의미한 테스트가 된다.
// fireEvent.change 는 tracker 를 함께 갱신해 실제 사용자 입력과 같은 경로를 탄다.
import { useEffect, useRef } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useListQueryState } from './useListQueryState';

/** 커밋(=URL 의 q 변화)을 기록하는 하네스. 입력창은 진짜 <input> 이라 조합 이벤트를 그대로 받는다 */
function Harness({ onCommit }: { readonly onCommit: (q: string) => void }) {
  const query = useListQueryState();
  const location = useLocation();
  const search = new URLSearchParams(location.search).get('q') ?? '';
  const previous = useRef<string | null>(null);

  useEffect(() => {
    // 최초 렌더는 커밋이 아니다 — 그 뒤 q 가 바뀔 때만 센다.
    if (previous.current !== null && previous.current !== search) onCommit(search);
    previous.current = search;
  }, [search, onCommit]);

  return (
    <input
      aria-label="검색"
      value={query.draft}
      onChange={(event) => query.setDraft(event.target.value)}
      {...query.imeProps}
    />
  );
}

function setup() {
  const onCommit = vi.fn();
  render(
    <MemoryRouter>
      <Harness onCommit={onCommit} />
    </MemoryRouter>,
  );
  const input: HTMLInputElement = screen.getByLabelText('검색');
  return { onCommit, input };
}

/** debounce 를 지나가게 한다 */
function flush() {
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useListQueryState — COMP-10 한글 IME', () => {
  it('조합 중에는 커밋하지 않는다 — 자모마다 질의가 나가면 안 된다', () => {
    const { onCommit, input } = setup();

    // '홍' 을 조합하는 동안 자모가 쌓인다: ㅎ → 호 → 홍. 조합이 끝나기 전엔 하나도 나가면 안 된다.
    fireEvent.compositionStart(input);
    for (const step of ['ㅎ', '호', '홍']) {
      fireEvent.change(input, { target: { value: step } });
      flush();
    }

    expect(input.value).toBe('홍');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('조합이 끝나면 완성된 낱말로 딱 한 번 커밋한다', () => {
    const { onCommit, input } = setup();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ㅎ' } });
    fireEvent.change(input, { target: { value: '홍길동' } });
    fireEvent.compositionEnd(input, { target: { value: '홍길동' } });
    flush();

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('홍길동');
  });

  it('조합 중 Enter 는 커밋하지 않는다 — 한글 확정이지 검색 실행이 아니다', () => {
    const { onCommit, input } = setup();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '홍' } });
    // isComposing 은 KeyboardEvent 의 읽기전용 속성이라 fireEvent 의 init 으로 넘긴다.
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('조합이 끝난 Enter 는 debounce 를 건너뛰고 즉시 커밋한다', () => {
    const { onCommit, input } = setup();

    fireEvent.change(input, { target: { value: 'order' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: false });

    // 타이머를 돌리지 않았는데도 이미 커밋돼 있어야 한다
    expect(onCommit).toHaveBeenCalledWith('order');
  });
});

describe('useListQueryState — 입력값 보존', () => {
  it('커밋이 trim 해도 타이핑 중인 공백을 지우지 않는다', () => {
    const { input } = setup();

    // '홍 ' 을 치고 잠깐 멈추면 URL 엔 '홍' 이 커밋된다. 그 값을 입력창에 되쓰면 사용자가 친
    // 공백이 사라져 다음 글자가 '홍길'로 붙는다 — 자기 커밋은 입력창에 되쓰지 않아야 한다.
    fireEvent.change(input, { target: { value: '홍 ' } });
    flush();

    expect(input.value).toBe('홍 ');
  });
});
