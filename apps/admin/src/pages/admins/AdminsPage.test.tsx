// 재조회가 행을 지우지 않는다 (STATE-01) — apps/admin/src/pages/admins/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 운영진 목록은 **좌측 그룹 필터 · 검색어 · 페이지**를 계속 갈아 끼우며 훑는 화면이다.
// 조건을 한 번 만질 때마다 재조회가 돌고, queries.ts 는 그때를 위해 placeholderData 로 이전
// 행을 들고 있다. 그런데 화면이 그 행을 스켈레톤으로 덮으면 운영자는 방금 좁혀 놓은 자리를
// 잃는다 — react-query 를 도입한 이유(ADR-0008 §3.2)를 화면이 스스로 버리는 것이다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// AdminsTable 자신은 옳았다: `loading` 이 true 면 스켈레톤, false 면 행. 버그는 **페이지가
// 무엇을 loading 이라 부르며 넘겼는가**에 있었다 — `isFetching` 을 그대로 넘겨 재조회까지 최초
// 로드로 취급했다. 그래서 표만 테스트하면 영원히 초록이다. 페이지를 실제 QueryClient 와 함께
// 태워 **재조회를 일으키고, 그 재조회가 도는 동안** 단언해야 잡힌다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import type { AdminListResult } from './types';

const RESULT: AdminListResult = {
  admins: [
    {
      id: 'a1',
      nickname: '운영자킴',
      account: 'ops.kim@example.com',
      groupId: 'super',
      group: '최고관리자',
      joinedAt: '2026-01-02',
      department: '운영팀',
      position: '팀장',
      phone: '010-9235-8367',
      memo: '',
    },
  ],
  totalAll: 1,
  groupCounts: { super: 1 },
  total: 1,
};

// fetchAdmins 만 바꾼다 — 픽스처·상수·라벨은 진짜를 그대로 쓴다(importOriginal).
// 좌측 패널이 부르는 fetchAdminGroups 도 진짜가 남는다: 그 쿼리는 캐시 키가 달라
// 목록 무효화에 휘말리지 않으며, 이 테스트의 주제도 아니다.
const fetchAdmins = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchAdmins,
}));

const { default: AdminsPage } = await import('./AdminsPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/users/admins']}>
          <AdminsPage />
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

/**
 * 카드 제목 '전체 운영자 N명' — 숫자만 별도 span 이라 텍스트가 조각나 있다.
 * getByText 로는 잡히지 않으므로 제목 요소째로 읽는다 (좌측 패널의 같은 문구와 섞이지 않게 id 로).
 */
function tableTitleText(): string {
  return document.getElementById('admins-table-title')?.textContent ?? '';
}

beforeEach(() => {
  fetchAdmins.mockReset();
  fetchAdmins.mockResolvedValue(RESULT);
});

describe('AdminsPage — 재조회가 행을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 행이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('운영자킴')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 행이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('운영자킴')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 테스트가 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄
     * 때까지 pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: AdminListResult) => void = () => undefined;
    fetchAdmins.mockImplementationOnce(
      () =>
        new Promise<AdminListResult>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 그룹 필터·검색어·페이지를 바꾸면 실제로 이것이 일어난다 (queries.ts 의 목록 쿼리 키)
    void client.invalidateQueries({ queryKey: ['admins', 'list'] });

    await waitFor(() => {
      expect(fetchAdmins).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 데이터는 이미 있다.
    // 고치기 전 코드는 이 단언에서 죽는다: 표가 스켈레톤으로 덮이고 행이 사라졌다.
    expect(skeletonCount()).toBe(0);
    expect(screen.getByText('운영자킴')).not.toBeNull();
    // 카드 제목의 건수도 '—' 로 되돌아가지 않는다 — 들고 있는 값이 있다
    expect(tableTitleText()).toBe('전체 운영자 1명');

    releaseSecondFetch(RESULT);
    await waitFor(() => {
      expect(screen.getByText('운영자킴')).not.toBeNull();
    });
  });
});
