// 재조회가 행을 지우지 않는다 (STATE-01) — apps/admin/src/pages/login-history/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 감사 화면은 **결과 · 계정 유형 · 기간 · 검색어**를 계속 바꿔 가며 훑는 곳이다 — 조건을 한 번
// 만질 때마다 재조회가 돈다. queries.ts 가 placeholderData 로 이전 행을 들고 있는데도 화면이
// 그것을 스켈레톤으로 가리면, 필터를 좁힐 때마다 표가 통째로 깜빡인다.
//
// 그리고 이 화면에서는 그 깜빡임이 단순한 거슬림이 아니다. 여기서 찾는 것은 **연속 실패**다 —
// 방금 눈에 걸린 실패 행을 붙잡고 조건을 좁히는 순간 그 행이 사라지면, 운영자는 자기가 무엇을
// 보고 있었는지 잃는다. 감사 로그가 **비어 있는 것**과 **불러오는 중인 것**은 다르다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// LoginHistoryTable 자신은 옳았다: `loading` 이 true 면 스켈레톤, false 면 행. 버그는 **페이지가
// 무엇을 loading 이라 부르며 넘겼는가**에 있었다 — `isFetching` 을 그대로 넘겨 재조회까지 최초
// 로드로 취급했다. 그래서 표만 테스트하면 영원히 초록이다. 페이지를 실제 QueryClient 와 함께
// 태워 **재조회를 일으키고, 그 재조회가 도는 동안** 단언해야 잡힌다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import type { LoginHistoryResult } from './types';

// 기간은 화면이 정한다 — 기본값은 '최근 30일' 이고 그 구간은 언제나 유효하다.
// 그래서 조회가 켜지고(enabled: range !== null) 표가 그려진다.
const RESULT: LoginHistoryResult = {
  entries: [
    {
      id: 'lh1',
      occurredAtIso: '2026-07-16T01:02:03.000Z',
      account: 'ops.kim@example.com',
      name: '김운***',
      accountKind: 'admin',
      outcome: 'failure',
      failureReason: 'invalid_password',
      consecutiveFailures: 3,
      ip: '203.0.113.7',
      browser: 'Chrome 126',
      os: 'Windows 11',
      subjectId: 'a1',
    },
  ],
  outcomeCounts: { all: 1, success: 0, failure: 1 },
  kindCounts: { all: 1, member: 0, admin: 1 },
  total: 1,
};

// fetchLoginHistory 만 바꾼다 — 픽스처·상수·라벨은 진짜를 그대로 쓴다(importOriginal).
// 내보내기(fetchLoginHistoryForExport)와 toCsv 도 진짜가 남는다: 이 테스트의 주제는
// '재조회 중 화면이 무엇을 그리는가' 이지 픽스처의 내용이 아니다.
const fetchLoginHistory = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchLoginHistory,
}));

const { default: LoginHistoryPage } = await import('./LoginHistoryPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/users/login-history']}>
          <LoginHistoryPage />
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
  fetchLoginHistory.mockReset();
  fetchLoginHistory.mockResolvedValue(RESULT);
});

describe('LoginHistoryPage — 재조회가 행을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 행이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('ops.kim@example.com')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 행이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('ops.kim@example.com')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 테스트가 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄
     * 때까지 pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: LoginHistoryResult) => void = () => undefined;
    fetchLoginHistory.mockImplementationOnce(
      () =>
        new Promise<LoginHistoryResult>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 결과·계정 유형·기간·검색어·페이지를 바꾸면 실제로 이것이 일어난다 (queries.ts 의 목록 쿼리 키)
    void client.invalidateQueries({ queryKey: ['login-history', 'list'] });

    await waitFor(() => {
      expect(fetchLoginHistory).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 데이터는 이미 있다.
    // 고치기 전 코드는 이 단언에서 죽는다: 표가 스켈레톤으로 덮이고 행이 사라졌다.
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('ops.kim@example.com')).not.toBeNull();
    // 요약 줄도 '불러오는 중…' 으로 되돌아가지 않는다 — 들고 있는 값이 있다
    expect(screen.getByText('전체 1건')).not.toBeNull();
    // 실패 요약은 이 화면의 존재 이유다 — 재조회가 그것을 지우지 않는다
    expect(screen.getByText('이 기간의 로그인 실패 1건')).not.toBeNull();

    releaseSecondFetch(RESULT);
    await waitFor(() => {
      expect(screen.getByText('ops.kim@example.com')).not.toBeNull();
    });
  });
});
