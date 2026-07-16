// 조회 상태의 URL 직렬화 + IME 안전 검색 (IA-13 · COMP-10) — content 목록의 대표 화면
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 공지사항이 대표인가]
// content 배치(공지·배너·팝업·FAQ·약관·처리방침)와 로고 목록은 같은 방식으로 useListState 에
// 얹혔다. 그중 공지사항만이 **필터 2종 + 페이지 + 한글 검색**을 한 화면에서 전부 쓴다 — 나머지는
// 이 조합의 부분집합이다. 그래서 계약을 여기서 못 박는다.
//
// [왜 훅 테스트로는 부족한가]
// useListState.test.tsx 는 훅이 URL 을 읽고 쓴다는 것을 증명한다. 그러나 **페이지가 그 값을 실제
// 조회에 실어 보내는가**는 증명하지 않는다 — 훅을 부르기만 하고 filters 를 쿼리에 안 넣어도 훅
// 테스트는 초록이다. 그래서 페이지를 실제 QueryClient 와 함께 태우고 **data-source 에 도달한
// 쿼리**를 단언한다. 그것이 '복원됐다'의 유일한 증거다(입력창 값은 보이는 것일 뿐이다).
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import type { NoticeListResult } from './types';

/** 3페이지짜리 목록 — ?page=2 가 보정(STATE-04) 없이 살아남는 크기여야 한다 (PAGE_SIZE=10) */
const RESULT: NoticeListResult = {
  notices: [
    {
      id: 'n1',
      title: '서비스 점검 안내',
      category: 'maintenance',
      status: 'published',
      pinned: true,
      author: '관리자',
      publishedAtIso: '2026-01-02T03:04:05.000Z',
      views: 12,
    },
  ],
  categoryCounts: { all: 25, notice: 10, event: 5, maintenance: 10 },
  statusCounts: { all: 25, published: 20, draft: 3, scheduled: 2 },
  total: 25,
};

const fetchNotices = vi.hoisted(() => vi.fn());

vi.mock('./data-source', () => ({
  fetchNotices,
  fetchNotice: vi.fn(),
  createNotice: vi.fn(() => Promise.resolve()),
  updateNotice: vi.fn(() => Promise.resolve()),
  deleteNotice: vi.fn(() => Promise.resolve()),
}));

const { default: NoticesPage } = await import('./NoticesPage');

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <NoticesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** data-source 에 도달한 n 번째 쿼리 — 화면이 무엇을 조회했는가의 유일한 증거 */
function queryAt(index: number): unknown {
  return fetchNotices.mock.calls[index]?.[0];
}

const searchInput = () => screen.getByLabelText<HTMLInputElement>('공지 제목 검색');

/** 디바운스(250ms)를 넘긴다. act 로 감싸는 이유: 타이머가 URL(=React 상태)을 바꾼다 */
async function afterDebounce(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

beforeEach(() => {
  fetchNotices.mockReset();
  fetchNotices.mockResolvedValue(RESULT);
});

describe('NoticesPage — 조회 상태의 원천은 URL 이다 (IA-13)', () => {
  /**
   * 운영자의 실제 동선: '점검 · 게시' 를 걸고 2페이지에서 공지를 연다 → Back.
   * 상태가 useState 에만 있으면 그 Back 은 **필터 없는 1페이지**에 착지한다. 이 테스트는 그
   * 착지 지점(= 필터가 걸린 URL)이 view 를 그대로 복원함을 못 박는다.
   */
  it('필터·페이지·검색어가 걸린 URL 로 들어오면 그 조건 그대로 조회한다', async () => {
    renderAt('/content/notices?page=2&q=%EC%A0%90%EA%B2%80&category=maintenance&status=published');

    await waitFor(() => {
      expect(fetchNotices).toHaveBeenCalled();
    });

    // 첫 조회부터 URL 의 조건이 실려 나간다 — 1페이지를 한 번 조회하고 나서 따라잡는 것이 아니다
    expect(queryAt(0)).toEqual({
      category: 'maintenance',
      status: 'published',
      keyword: '점검',
      page: 2,
    });
    // 검색창도 URL 의 검색어를 들고 있다 — Back 했는데 입력창만 비어 있으면 조건을 못 읽는다
    expect(searchInput().value).toBe('점검');
  });

  it('파라미터가 없으면 기본 view — 전체 분류·전체 상태·1페이지', async () => {
    renderAt('/content/notices');

    await waitFor(() => {
      expect(fetchNotices).toHaveBeenCalled();
    });
    expect(queryAt(0)).toEqual({ category: 'all', status: 'all', keyword: '', page: 1 });
  });

  /** 손으로 고친 URL 이 목록을 깨지 않게 한다 — 없는 분류는 캐스팅되지 않고 'all' 로 접힌다 */
  it('허용 목록에 없는 분류/상태 파라미터는 전체로 접는다', async () => {
    renderAt('/content/notices?category=%EA%B1%B0%EC%A7%93&status=bogus');

    await waitFor(() => {
      expect(fetchNotices).toHaveBeenCalled();
    });
    expect(queryAt(0)).toMatchObject({ category: 'all', status: 'all' });
  });
});

describe('NoticesPage — 한글 검색은 조합이 끝난 뒤 한 번만 조회한다 (COMP-10)', () => {
  /**
   * '점검' 두 글자를 치는 동안 change 는 'ㅈ'→'저'→'점'→'점ㄱ'→'점거'→'점검' 으로 온다.
   * 조합 중 커밋하면 **자모 단위 부분 문자열로 조회가 나가고**, 조합 확정용 Enter 가 '점ㄱ' 같은
   * 반쪽 낱말을 제출한다. 이 화면은 한글 제목을 찾는 곳이라 그 두 가지가 곧 일상이다.
   */
  it('조합 중에는 조회하지 않고, 조합이 끝난 뒤 완성된 낱말로 정확히 한 번 조회한다', async () => {
    vi.useFakeTimers();
    try {
      renderAt('/content/notices');
      await afterDebounce();

      // 마운트 조회 1회. 이 뒤로 늘어나는 호출은 전부 '타이핑이 일으킨 조회' 다.
      expect(fetchNotices).toHaveBeenCalledTimes(1);
      const input = searchInput();

      fireEvent.compositionStart(input);
      for (const value of ['ㅈ', '저', '점', '점ㄱ', '점거', '점검']) {
        fireEvent.change(input, { target: { value } });
        await afterDebounce();
      }

      // 조합 중 Enter 는 IME 의 **확정 키**다 — 폼 제출이 아니다. '점거' 로 조회가 나가면 안 된다.
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
      await afterDebounce();

      // 디바운스를 여섯 번 넘겼는데도 조회는 마운트 1회 그대로다
      expect(fetchNotices).toHaveBeenCalledTimes(1);

      fireEvent.compositionEnd(input, { target: { value: '점검' } });
      await afterDebounce();

      expect(fetchNotices).toHaveBeenCalledTimes(2);
      expect(queryAt(1)).toMatchObject({ keyword: '점검', page: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * 커밋된 검색어는 URL 에 남아야 한다 — 그래야 상세에서 Back 했을 때 검색이 살아 있다.
   * (IA-13 과 COMP-10 이 만나는 지점: IME 로 친 한글이 공유 가능한 링크가 된다.)
   */
  it('조합이 끝난 검색어는 URL 에 실린다 — 3페이지에서 검색하면 1페이지로 돌아간다', async () => {
    vi.useFakeTimers();
    try {
      renderAt('/content/notices?page=3');
      await afterDebounce();
      expect(queryAt(0)).toMatchObject({ page: 3 });

      const input = searchInput();
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '점검' } });
      fireEvent.compositionEnd(input, { target: { value: '점검' } });
      await afterDebounce();

      // 3페이지를 보다 검색하면 결과가 3페이지어치가 아닐 수 있다 — 빈 화면 대신 1페이지로
      const last = fetchNotices.mock.calls.length - 1;
      expect(queryAt(last)).toMatchObject({ keyword: '점검', page: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});
