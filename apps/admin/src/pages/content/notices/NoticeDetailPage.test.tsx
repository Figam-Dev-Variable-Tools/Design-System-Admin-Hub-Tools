// 재조회가 본문을 지우지 않는다 (STATE-01) — apps/admin/src/pages/content/notices/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 목록 화면과 다른 갈래의 같은 버그]
// 목록에서는 `isFetching` 을 표의 `loading` 으로 넘긴 것이 버그였다. 상세 화면의 버그는 모양이
// 다르다: 본문 분기가 `isFetching || data === undefined` 였다. `|| data === undefined` 가 붙어
// 있어 언뜻 옳아 보이지만, **앞의 isFetching 하나로 이미 참이 된다** — 캐시가 공지 본문을 쥐고
// 있는 재조회 순간에도 스켈레톤이 그것을 덮었다.
//
// [무엇이 재조회를 일으키나 — 여기가 이 화면의 핵심이다]
// 이 상세를 invalidate 하는 쓰기는 이 화면에 없다. 방아쇠는 **목록 ↔ 상세 왕복**이다:
// queryClient 는 staleTime 30초 + refetchOnMount 기본값(true)이므로, 30초 뒤 같은 공지를 다시
// 열면 캐시된 본문을 든 채(data 있음) 재조회가 돈다(isFetching true). 예전 조건은 바로 그
// 순간에 본문을 스켈레톤으로 교체했다 — 캐시를 두고도 캐시의 이득(ADR-0008 §3.2)을 버린 것이다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import type { Notice } from './types';

const NOTICE: Notice = {
  id: 'n1',
  title: '서비스 점검 안내',
  category: 'maintenance',
  status: 'published',
  pinned: true,
  author: '관리자',
  publishedAtIso: '2026-01-02T03:04:05.000Z',
  views: 12,
  body: '7월 20일 02:00 ~ 04:00 사이 정기 점검이 있어요.',
};

// fetchNotice 만 바꾼다 — 픽스처·상수·라벨은 진짜를 그대로 쓴다(importOriginal).
const fetchNotice = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchNotice,
}));

const { default: NoticeDetailPage } = await import('./NoticeDetailPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/content/notices/n1']}>
          <Routes>
            <Route path="/content/notices/:id" element={<NoticeDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return client;
}

/** 스켈레톤은 aria-hidden 인 장식 span 이다 — 표시 여부를 그 존재로 읽는다 */
function skeletonCount(): number {
  // `.tds-skeleton` 은 @tds/ui Skeleton 이 그리는 클래스다 (계약 Skeleton.contract.json).
  // 예전엔 shared/ui/ui.css 의 `.tds-ui-skeleton` 과 공존했으나 렌더 사이트 21곳을 전부
  // 이관하면서 원본 클래스가 사라졌다 — 셀렉터도 함께 좁혔다.
  // ⚠ 이 값이 0 인지를 단언하는 검사 옆에는 반드시 `toBeGreaterThan(0)` 앵커를 둔다.
  //    셀렉터가 낡으면 카운터가 조용히 0 을 세는데 `toBe(0)` 은 그 상태에서도 통과한다.
  return document.querySelectorAll('.tds-skeleton').length;
}

beforeEach(() => {
  fetchNotice.mockReset();
  fetchNotice.mockResolvedValue(NOTICE);
});

describe('NoticeDetailPage — 재조회가 본문을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 본문이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('본문이 있는 채로 재조회하면 본문이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
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
    let releaseSecondFetch: (value: Notice) => void = () => undefined;
    fetchNotice.mockImplementationOnce(
      () =>
        new Promise<Notice>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 목록에 다녀와 staleTime 이 지난 뒤 다시 여는 것이 실제로 이것과 같다 (refetchOnMount)
    void client.invalidateQueries({ queryKey: ['notices', 'detail', 'n1'] });

    await waitFor(() => {
      expect(fetchNotice).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 본문은 이미 있다.
    // 고치기 전 코드(`loading || data === undefined`)는 이 단언에서 죽는다.
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    expect(screen.getByText(/정기 점검이 있어요/)).not.toBeNull();

    releaseSecondFetch(NOTICE);
    await waitFor(() => {
      expect(screen.getByText('서비스 점검 안내')).not.toBeNull();
    });
  });
});
