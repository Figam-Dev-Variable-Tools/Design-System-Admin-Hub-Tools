// 재조회가 행을 지우지 않는다 (STATE-01) — apps/admin/src/pages/content/banners/**
//
// [무엇을 지키나] 이 화면은 **노출 ON/OFF 토글**이 일상이고 토글 하나가 곧 목록 invalidate 다.
// 그때 표가 스켈레톤으로 덮이면 방금 켠 배너가 눈앞에서 사라진다 — '로딩'이 아니라 고장으로 읽힌다.
//
// [왜 컴포넌트 테스트로는 못 잡나] BannersTable 자신은 옳다: loading 이면 스켈레톤, 아니면 행.
// 버그는 **페이지가 무엇을 loading 이라 부르며 넘겼는가**였다(`isFetching` 직결). 표만 테스트하면
// 영원히 초록이다 — 페이지를 실제 QueryClient 로 태워 재조회가 **도는 동안** 단언해야 잡힌다.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import type { BannerListResult } from './types';

const RESULT: BannerListResult = {
  banners: [
    {
      id: 'b1',
      title: '봄맞이 기획전',
      imageUrl: 'https://cdn.example.com/spring.png',
      linkUrl: 'https://example.com/spring',
      placement: 'main',
      startAt: '2026-03-01',
      endAt: '2026-03-31',
      enabled: true,
      order: 1,
    },
  ],
  total: 1,
};

// fetchBanners 만 바꾼다 — 픽스처·상수·라벨은 진짜를 그대로 쓴다(importOriginal).
// 이 테스트의 주제는 '재조회 중 화면이 무엇을 그리는가' 이지 픽스처의 내용이 아니다.
const fetchBanners = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchBanners,
}));

const { default: BannersPage } = await import('./BannersPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/content/banners']}>
          <BannersPage />
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
  fetchBanners.mockReset();
  fetchBanners.mockResolvedValue(RESULT);
});

describe('BannersPage — 재조회가 행을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('봄맞이 기획전')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 행이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('봄맞이 기획전')).not.toBeNull();
    });

    // [재조회를 멈춰 세운다] 두 번째 응답을 즉시 돌려주면 '재조회가 도는 순간'이 존재하지 않아
    // 버그가 있어도 초록이 된다. 우리가 풀어 줄 때까지 pending 으로 붙잡는다.
    let releaseSecondFetch: (value: BannerListResult) => void = () => undefined;
    fetchBanners.mockImplementationOnce(
      () =>
        new Promise<BannerListResult>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 노출 토글·삭제가 끝나면 실제로 이것이 일어난다 (queries.ts 의 invalidateQueries)
    void client.invalidateQueries({ queryKey: ['banners', 'list'] });

    await waitFor(() => {
      expect(fetchBanners).toHaveBeenCalledTimes(2);
    });

    // 고치기 전 코드는 여기서 죽는다 — 표가 스켈레톤으로 덮이고 행이 사라졌다.
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('봄맞이 기획전')).not.toBeNull();
    expect(screen.getByText('전체 1건')).not.toBeNull();

    releaseSecondFetch(RESULT);
    await waitFor(() => {
      expect(screen.getByText('봄맞이 기획전')).not.toBeNull();
    });
  });
});
