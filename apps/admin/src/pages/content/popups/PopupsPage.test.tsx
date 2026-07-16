// 재조회가 행을 지우지 않는다 (STATE-01) — apps/admin/src/pages/content/popups/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면의 일상은 **행 위의 ON/OFF 스위치**다. 그런데 queries.ts 의 useSetPopupEnabled 는
// onSettled 에서 목록을 invalidate 한다 — 즉 스위치를 한 번 누를 때마다 재조회가 돈다.
// 그때 표가 스켈레톤으로 덮이면, 낙관적 업데이트로 방금 켜 둔 팝업이 눈앞에서 사라졌다가
// 되돌아온다. 운영자에게 이것은 '로딩'이 아니라 **토글이 실패한 것**으로 읽힌다.
// 삭제·일괄 삭제·일괄 ON/OFF, 그리고 필터/페이지 전환(placeholderData 가 이전 행을 들고 있다)도
// 같은 자리를 지난다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// PopupsTable 자신은 옳다: `loading` 이 true 면 SkeletonRows, false 면 행. 버그는 **페이지가
// 무엇을 loading 이라 부르며 표에 넘겼는가**였다 — `isFetching` 을 그대로 넘겨 재조회까지
// 최초 로드로 취급했다. 그래서 표만 테스트하면 영원히 초록이다. 페이지를 실제 QueryClient 로
// 태워 재조회를 일으키고, **그 재조회가 도는 동안** 단언해야만 잡힌다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import type { PopupListResult } from './types';

const RESULT: PopupListResult = {
  popups: [
    {
      id: 'PU-001',
      title: '신규 가입 혜택',
      imageUrl: 'https://cdn.example.com/popups/001.png',
      linkUrl: 'https://example.com/event/001',
      position: 'home',
      startAt: '2026-03-01',
      endAt: '2026-03-31',
      enabled: true,
      priority: 1,
    },
  ],
  total: 1,
};

// fetchPopups 만 바꾼다 — 픽스처·상수·라벨은 진짜를 그대로 쓴다(importOriginal).
// 이 테스트의 주제는 '재조회 중 화면이 무엇을 그리는가' 이지 픽스처의 내용이 아니다.
const fetchPopups = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchPopups,
}));

const { default: PopupsPage } = await import('./PopupsPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/content/popups']}>
          <PopupsPage />
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
  fetchPopups.mockReset();
  fetchPopups.mockResolvedValue(RESULT);
});

describe('PopupsPage — 재조회가 행을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 행이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('신규 가입 혜택')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 행이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('신규 가입 혜택')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 테스트가 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄
     * 때까지 pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: PopupListResult) => void = () => undefined;
    fetchPopups.mockImplementationOnce(
      () =>
        new Promise<PopupListResult>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // ON/OFF 토글·삭제·일괄 처리가 끝나면 실제로 이것이 일어난다 (queries.ts 의 invalidateQueries)
    void client.invalidateQueries({ queryKey: ['popups', 'list'] });

    await waitFor(() => {
      expect(fetchPopups).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 데이터는 이미 있다.
    // 고치기 전 코드는 이 단언에서 죽는다: 표가 스켈레톤으로 덮이고 행이 사라졌다.
    //
    // aria-busy 는 표에 넘어간 `loading` 을 그대로 비춘다(PopupsTable 의 <table aria-busy={loading}>).
    // 즉 이 한 줄은 '재조회가 도는 이 순간 페이지가 loading 을 무엇이라 불렀는가'를 직접 읽는다 —
    // 되돌아간 코드(`loading={isFetching}`)라면 여기서 "true" 가 나온다.
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('false');
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('신규 가입 혜택')).not.toBeNull();
    // 건수 요약도 '불러오는 중…' 으로 되돌아가지 않는다 — 들고 있는 값이 있다
    expect(screen.getByText('전체 1건')).not.toBeNull();

    releaseSecondFetch(RESULT);
    await waitFor(() => {
      expect(screen.getByText('신규 가입 혜택')).not.toBeNull();
    });
  });
});
