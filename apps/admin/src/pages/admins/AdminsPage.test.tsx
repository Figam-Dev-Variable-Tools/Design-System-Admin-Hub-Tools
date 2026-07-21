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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import type { AdminQuery } from './data-source';
import type { AdminListResult } from './types';

const RESULT: AdminListResult = {
  admins: [
    {
      id: 'a1',
      nickname: '운영자킴',
      account: 'ops.kim@example.com',
      groupId: 'super',
      group: '최고관리자',
      roleId: 'role-operator',
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

/**
 * 지금 URL 의 쿼리스트링을 그대로 뱉는 탐침.
 *
 * 'URL 이 상태를 소유한다'(IA-13)는 화면 안의 값이 아니라 **주소**로만 증명된다 — 화면이 옳게
 * 보여도 주소가 그대로면 그 필터는 공유할 수도, Back 으로 되돌아올 수도 없다.
 */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderPage(entry = '/users/admins') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[entry]}>
          <AdminsPage />
          <LocationProbe />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return client;
}

/** 마지막으로 나간 목록 조회의 조건 — 화면이 무엇을 물었는지는 이것으로만 알 수 있다 */
function lastQuery(): AdminQuery | undefined {
  return fetchAdmins.mock.calls.at(-1)?.[0] as AdminQuery | undefined;
}

function locationSearch(): string {
  return screen.getByTestId('location-search').textContent ?? '';
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

/**
 * 역할 열 · 역할 필터
 *
 * [왜 이 화면의 핵심인가] '누가 무슨 권한인가' 는 관리자 관리 화면이 답해야 하는 질문인데,
 * 예전에는 역할이 등록 폼과 상세에만 있어 **목록 어디에서도 답할 수 없었다**. 그리고 권한 관리의
 * '이 역할 운영자 N명' 링크는 이 필터가 URL 을 소유할 때에만 착지할 곳이 생긴다.
 */
describe('AdminsPage — 역할 열과 ?role= 필터 (IA-13)', () => {
  /** 표의 다섯 번째 칸(체크박스·닉네임·계정·그룹 다음)이 역할이다 */
  function roleCellText(nickname: string): string {
    const row = screen.getByText(nickname).closest('tr');
    const cells = row === null ? [] : Array.from(row.querySelectorAll('td'));
    return cells[4]?.textContent ?? '';
  }

  it('표가 roleId 를 역할 이름으로 되돌려 그린다', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('운영자킴')).not.toBeNull();
    });

    // 픽스처의 roleId 는 'role-operator' — 권한 스토어의 기본 역할 '운영자'
    expect(roleCellText('운영자킴')).toBe('운영자');
  });

  it('?role= 이 조회 조건을 정하고, 필터를 바꾸면 URL 이 따라 바뀐다', async () => {
    renderPage('/users/admins?role=role-viewer');

    // 들어온 주소가 곧 첫 조회 조건이다 — 링크로 들어온 사람이 '전체'를 보지 않는다
    await waitFor(() => {
      expect(lastQuery()?.roleId).toBe('role-viewer');
    });

    fireEvent.change(screen.getByLabelText('역할'), { target: { value: 'role-operator' } });

    await waitFor(() => {
      expect(lastQuery()?.roleId).toBe('role-operator');
    });
    // 상태의 소유자는 URL 이다 — 컴포넌트 useState 였다면 주소는 그대로였을 것이다
    expect(locationSearch()).toBe('?role=role-operator');

    // 기본값('전체')으로 되돌리면 파라미터가 사라진다 — 같은 화면이 두 개의 주소를 갖지 않는다
    fireEvent.change(screen.getByLabelText('역할'), { target: { value: 'all' } });

    await waitFor(() => {
      expect(lastQuery()?.roleId).toBe('all');
    });
    expect(locationSearch()).toBe('');
  });

  it('존재하지 않는 역할을 가리키는 주소는 전체로 되돌린다', async () => {
    // 손으로 고친 URL 이거나, 그 사이 삭제된 역할을 가리키는 옛 링크다.
    // 없는 id 로 그대로 조회하면 화면이 영원히 0건이 된다 — 그것은 '검색 결과 없음' 이 아니라 고장이다.
    renderPage('/users/admins?role=role-deleted-long-ago');

    await waitFor(() => {
      expect(lastQuery()?.roleId).toBe('all');
    });
  });
});
