// 재조회가 행을 지우지 않는다 (STATE-01) — apps/admin/src/pages/content/faq/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면에서 가장 아픈 자리는 **순서 이동**이다. useReorderFaqs 는 낙관적 업데이트로 행을
// 즉시 옮겨 놓고 onSettled 에서 목록을 invalidate 한다 — 한 칸 올릴 때마다 재조회가 돈다.
// 그때 표가 스켈레톤으로 덮이면 방금 옮긴 행을 눈으로 좇을 수 없다. 낙관적 업데이트가 애써
// 만든 '지연 없는 반영'을 화면이 스스로 가려 버리는 셈이다.
// 노출 토글·삭제·일괄 처리·카테고리 삭제, 그리고 필터/검색/페이지 전환(queries.ts 의
// placeholderData 가 이전 행을 들고 있다)도 모두 같은 자리를 지난다 — react-query 를 쓰는
// 이유(ADR-0008 §3.2)를 화면이 버리지 않게 한다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// FaqTable 자신은 옳았다: `loading` 이 true 면 SkeletonRows, false 면 행. 버그는 **페이지가
// 무엇을 loading 이라 부르며 표에 넘겼는가**에 있었다 — `isFetching` 을 그대로 넘겨 재조회까지
// 최초 로드로 취급했다. 그래서 표만 테스트하면 영원히 초록이다. 페이지를 실제 QueryClient 와
// 함께 태워 재조회를 일으키고, **그 재조회가 도는 동안** 단언해야만 잡힌다.
//
// [카테고리 조회는 진짜를 쓴다] importOriginal 스프레드가 fetchFaqCategories 를 살려 둔다 —
// 좌측 필터는 실제 경로 그대로 뜨고, 우리가 바꿔 세우는 것은 목록 조회 하나뿐이다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import type { FaqListResult } from './types';

const RESULT: FaqListResult = {
  faqs: [
    {
      id: 'FAQ-001',
      question: '비밀번호를 잊어버렸어요',
      categoryId: 'account',
      categoryLabel: '계정',
      visible: true,
      order: 1,
    },
  ],
  visibilityCounts: { all: 1, visible: 1, hidden: 0 },
  categoryCounts: { all: 1, account: 1, payment: 0, delivery: 0, etc: 0 },
  total: 1,
};

// fetchFaqs 만 바꾼다 — 픽스처·상수·라벨·카테고리 조회는 진짜를 그대로 쓴다(importOriginal).
// 이 테스트의 주제는 '재조회 중 화면이 무엇을 그리는가' 이지 픽스처의 내용이 아니다.
const fetchFaqs = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchFaqs,
}));

const { default: FaqPage } = await import('./FaqPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/content/faq']}>
          <FaqPage />
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
  fetchFaqs.mockReset();
  fetchFaqs.mockResolvedValue(RESULT);
});

describe('FaqPage — 재조회가 행을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 행이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('비밀번호를 잊어버렸어요')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 행이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('비밀번호를 잊어버렸어요')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 테스트가 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄
     * 때까지 pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: FaqListResult) => void = () => undefined;
    fetchFaqs.mockImplementationOnce(
      () =>
        new Promise<FaqListResult>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 순서 이동·노출 토글·삭제가 끝나면 실제로 이것이 일어난다 (queries.ts 의 invalidateQueries)
    void client.invalidateQueries({ queryKey: ['faqs', 'list'] });

    await waitFor(() => {
      expect(fetchFaqs).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 데이터는 이미 있다.
    // 고치기 전 코드는 이 단언에서 죽는다: 표가 스켈레톤으로 덮이고 행이 사라졌다.
    //
    // aria-busy 는 표에 넘어간 `loading` 을 그대로 비춘다(FaqTable 의 <table aria-busy={loading}>).
    // 즉 이 한 줄은 '재조회가 도는 이 순간 페이지가 loading 을 무엇이라 불렀는가'를 직접 읽는다 —
    // 되돌아간 코드(`loading={isFetching}`)라면 여기서 "true" 가 나온다.
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('false');
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('비밀번호를 잊어버렸어요')).not.toBeNull();
    // 건수 요약도 '불러오는 중…' 으로 되돌아가지 않는다 — 들고 있는 값이 있다
    expect(screen.getByText('전체 1건')).not.toBeNull();

    releaseSecondFetch(RESULT);
    await waitFor(() => {
      expect(screen.getByText('비밀번호를 잊어버렸어요')).not.toBeNull();
    });
  });
});
