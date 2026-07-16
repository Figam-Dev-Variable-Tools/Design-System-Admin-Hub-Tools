// 재조회가 행을 지우지 않는다 (STATE-01) — apps/admin/src/pages/content/notices/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 삭제·일괄 삭제가 끝나면 목록을 invalidate 한다. 그때 표가 스켈레톤으로 덮이면 운영자가 방금
// 훑던 자리를 잃는다. queries.ts 가 placeholderData 로 이전 행을 들고 있는데도 화면이 그것을
// 스켈레톤으로 가리면, react-query 를 도입한 이유(ADR-0008 §3.2)를 화면이 스스로 버리는 것이다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// NoticesTable 자신은 옳았다: `loading` 이 true 면 스켈레톤, false 면 행. 버그는 **페이지가
// 무엇을 loading 이라 부르며 넘겼는가**에 있었다 — `isFetching` 을 그대로 넘겨 재조회까지 최초
// 로드로 취급했다. 그래서 표만 테스트하면 영원히 초록이다. 페이지를 실제 QueryClient 와 함께
// 태워 **재조회를 일으키고, 그 재조회가 도는 동안** 단언해야 잡힌다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import type { NoticeListResult } from './types';

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
  categoryCounts: { all: 1, notice: 0, event: 0, maintenance: 1 },
  statusCounts: { all: 1, published: 1, draft: 0, scheduled: 0 },
  total: 1,
};

// 데이터 소스를 고정한다 — 이 테스트의 주제는 '재조회 중 화면이 무엇을 그리는가' 이지
// 픽스처의 내용이 아니다.
const fetchNotices = vi.hoisted(() => vi.fn());

vi.mock('./data-source', () => ({
  fetchNotices,
  fetchNotice: vi.fn(),
  createNotice: vi.fn(() => Promise.resolve()),
  updateNotice: vi.fn(() => Promise.resolve()),
  deleteNotice: vi.fn(() => Promise.resolve()),
}));

const { default: NoticesPage } = await import('./NoticesPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/content/notices']}>
          <NoticesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return client;
}

/** 스켈레톤은 aria-hidden 인 장식 span 이다 — 표시 여부를 그 존재로 읽는다 */
function skeletonCount(): number {
  return document.querySelectorAll('.tds-ui-skeleton').length;
}

beforeEach(() => {
  fetchNotices.mockReset();
  fetchNotices.mockResolvedValue(RESULT);
});

describe('NoticesPage — 재조회가 행을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 행이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 행이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 테스트가 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄
     * 때까지 pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: NoticeListResult) => void = () => undefined;
    fetchNotices.mockImplementationOnce(
      () =>
        new Promise<NoticeListResult>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 삭제·일괄 삭제가 끝나면 실제로 이것이 일어난다 (queries.ts 의 invalidateQueries)
    void client.invalidateQueries({ queryKey: ['notices', 'list'] });

    await waitFor(() => {
      expect(fetchNotices).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 데이터는 이미 있다.
    // 고치기 전 코드는 이 단언에서 죽는다: 표가 스켈레톤으로 덮이고 행이 사라졌다.
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    // 건수 요약도 '불러오는 중…' 으로 되돌아가지 않는다 — 들고 있는 값이 있다
    expect(screen.getByText('전체 1건')).not.toBeNull();

    releaseSecondFetch(RESULT);
    await waitFor(() => {
      expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    });
  });
});
