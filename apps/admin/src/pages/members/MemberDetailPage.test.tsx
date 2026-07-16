// 재조회가 회원 카드를 지우지 않는다 (STATE-01) — apps/admin/src/pages/members/MemberDetailPage.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면의 스켈레톤 조건은 `data === undefined` **하나뿐이어야 한다.**
// 예전엔 `isFetching: loading` 을 그대로 읽어 `loading || data === undefined` 로 분기했다 —
// 데이터를 **이미 들고 있어도** 재조회가 도는 동안에는 회원 카드 전체(정보·동의·활동·적립금·
// 쿠폰·메모)가 스켈레톤 열 줄로 교체됐다. 보고 있던 회원이 눈앞에서 사라졌다가 돌아온다 —
// '로딩'이 아니라 고장으로 읽힌다.
//
// [이 화면을 재조회시키는 것은 뮤테이션이 아니다 — 오해하지 말 것]
// queries.ts 의 쓰기 훅은 **상세 키를 무효화하지 않는다.** 전부 memberKeys.lists() 만 건드리고,
// 적립금 지급조차 서버가 돌려준 행을 화면 상태에 반영할 뿐 상세를 다시 읽지 않는다(BE-004 §7.5).
// 그럼에도 이 상세는 재조회된다 — 캐시 계층이 스스로 일으키기 때문이다:
//   ① 재마운트 + stale(staleTime 30초 경과) → refetchOnMount 의 백그라운드 재조회
//      ← **목록 ↔ 상세 왕복**이 정확히 이것이다. 아래 세 번째 테스트가 그 경로다.
//   ② 네트워크 재연결(refetchOnReconnect)
//   ③ 조회 실패 배너의 '다시 시도'(refetch)
// ①은 react-query 를 도입한 이유 그 자체다(ADR-0008 §3.2). 캐시가 든 화면을 스켈레톤으로 가리면
// 캐시는 있으나 마나다. 그러니 이 가드는 **상세를 무효화하는 뮤테이션이 생기든 말든** 서 있어야 한다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// MemberInfoCard·PointsCard 자신은 옳았다: detail 을 받으면 그린다. 버그는 **페이지가 무엇을
// loading 이라 부르며 카드를 아예 렌더하지 않았는가**에 있었다. 카드만 테스트하면 영원히 초록이다.
// 페이지를 진짜 QueryClient 로 태워 재조회를 일으키고, 그 재조회가 **도는 동안** 단언해야 잡힌다 —
// 두 번째 응답을 즉시 돌려주면 그 순간이 존재하지 않아 버그가 있어도 통과하는 공허한 테스트가 된다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import type { MemberDetail } from './types';

const MEMBER_ID = 'm1';

/**
 * queries.ts 의 `memberKeys.detail(listPath, id)` 그대로다.
 * 상세 키에 listPath 가 들어가는 이유는 /users/members/:id 와 /users/admins/:id 가 **같은 화면**을
 * 다른 fetchDetail 로 돌리기 때문이다 — id 만으로 키를 잡으면 두 컨텍스트가 캐시 칸을 공유한다.
 */
const DETAIL_KEY = ['members', 'detail', '/users/members', MEMBER_ID];

const DETAIL: MemberDetail = {
  id: MEMBER_ID,
  nickname: '명재우',

  referralCode: 'RF00001',
  tier: 'vip',
  account: 'myungjw@naver.com',
  name: '명재우',
  phone: '010-1234-5678',
  country: '대한민국',
  address: '서울특별시 강남구 테헤란로 123',
  addressDetail: '4층 2호',
  birthday: '1990-05-11',
  socialLogin: '카카오',
  referrer: '',

  consents: [
    {
      id: 'terms',
      label: '이용약관 동의',
      items: [
        {
          id: 'terms-required',
          label: '(필수) 이용약관',
          agreed: true,
          agreedAt: '2025-03-02 10:11',
        },
      ],
    },
  ],

  joinedAtIso: '2025-03-02T10:11:00.000Z',
  lastLoginAtIso: '2026-07-14T08:30:00.000Z',
  loginCount: 12,
  lastLoginIp: '211.1.2.3',
  activity: { posts: 3, comments: 5, reviews: 2, inquiries: 1 },

  points: 1200,
  pointHistory: [
    { id: 'p1', date: '2026-07-10', reason: '이벤트 참여 보상', orderNo: null, amount: 500 },
  ],

  coupons: [{ id: 'c1', name: '여름 할인 쿠폰', benefit: '10% 할인', expiresAt: '2026-08-31' }],

  memo: 'VIP 승급 예정',
};

// fetchMemberDetail 만 바꾼다 — 나머지(쓰기 계약·픽스처)는 진짜를 그대로 쓴다(importOriginal).
// 이 테스트의 주제는 '재조회 중 화면이 무엇을 그리는가' 이지 픽스처의 내용이 아니다.
const fetchMemberDetail = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchMemberDetail,
}));

const { default: MemberDetailPage } = await import('./MemberDetailPage');

function newClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** App.tsx 의 `/users/members/:id` 라우트를 그대로 세운다 — 화면은 useParams 로 id 를 읽는다 */
function renderPage(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/users/members/${MEMBER_ID}`]}>
          <Routes>
            <Route path="/users/members/:id" element={<MemberDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 스켈레톤은 aria-hidden 인 장식 span 이다 — 표시 여부를 그 존재로 읽는다 */
function skeletonCount(): number {
  return document.querySelectorAll('.tds-ui-skeleton').length;
}

/**
 * [이 테스트가 공허하지 않다는 증거 — 지우지 말 것]
 *
 * 아래 단언들은 '재조회가 **도는 동안**' 이라야 의미가 있다. 두 번째 응답이 이미 도착했다면
 * 예전 코드의 `loading`(=isFetching) 도 false 라서 **버그를 그대로 둔 채로도 초록**이 된다.
 * 그래서 단언 직전에 캐시 상태를 직접 확인한다: 조회는 진행 중이고(data 는 이미 있고).
 * 이 함수가 통과하는 한, 아래 `skeletonCount() === 0` 은 예전 코드에서 반드시 실패한다.
 */
function expectRefetchInFlightWithData(client: QueryClient): void {
  const state = client.getQueryState(DETAIL_KEY);
  expect(state?.fetchStatus).toBe('fetching');
  expect(state?.data).not.toBeUndefined();
}

/** 회원 카드가 실제로 서 있는가 — 카드 제목과 카드 안의 값을 함께 본다 */
function expectMemberCardVisible(): void {
  expect(screen.getByText('회원 정보')).not.toBeNull();
  // 추천인 코드는 이 화면에 단 한 번 나오는 값이다 (닉네임은 아바타·이름 행에 중복 등장한다)
  expect(screen.getByText('RF00001')).not.toBeNull();
  expect(screen.getByText('1,200 포인트 (KRW)')).not.toBeNull();
}

beforeEach(() => {
  fetchMemberDetail.mockReset();
  fetchMemberDetail.mockResolvedValue(DETAIL);
});

describe('MemberDetailPage — 재조회가 회원 카드를 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage(newClient());

    // 아직 응답 전 — 보여줄 데이터가 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('회원 정보')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('데이터가 있는 채로 재조회하면 회원 카드가 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = newClient();
    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('회원 정보')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄 때까지
     * pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: MemberDetail) => void = () => undefined;
    fetchMemberDetail.mockImplementationOnce(
      () =>
        new Promise<MemberDetail>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 재마운트(stale)·재연결·'다시 시도' 가 화면에 만들어 내는 상태와 같다:
    // 관찰자는 붙어 있고, data 는 이미 있고, isFetching 만 true 다.
    void client.invalidateQueries({ queryKey: DETAIL_KEY });

    await waitFor(() => {
      expect(fetchMemberDetail).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — 고치기 전 코드는 이 단언에서 죽는다:
    // 카드가 통째로 스켈레톤 열 줄로 교체되고 회원 정보가 사라졌다.
    expectRefetchInFlightWithData(client);
    expect(skeletonCount()).toBe(0);
    expectMemberCardVisible();
    // 우측 상단 ⋯ 메뉴도 함께 사라졌었다 (data !== undefined 일 때만 렌더된다)
    expect(screen.getByRole('button', { name: '명재우 회원 액션' })).not.toBeNull();

    releaseSecondFetch(DETAIL);
    await waitFor(() => {
      expect(screen.getByText('회원 정보')).not.toBeNull();
    });
  });

  it('목록에 다녀와 다시 열면 캐시된 카드를 먼저 보여준다 — 재조회는 뒤에서 돈다', async () => {
    // [이것이 이 화면의 진짜 재조회 경로다] 상세를 무효화하는 뮤테이션은 없다.
    // 목록 ↔ 상세를 왕복하면 화면이 재마운트되고, 캐시가 stale 이면 refetchOnMount 가 돈다.
    // 그때 캐시가 든 카드를 스켈레톤으로 가리면 캐시를 둔 의미가 없다 (ADR-0008 §3.2).
    const client = newClient();
    const first = renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('회원 정보')).not.toBeNull();
    });

    // 목록으로 나간다 — 상세 화면이 언마운트된다 (캐시는 gcTime 동안 남는다)
    first.unmount();

    // 돌아왔을 때 도는 재조회를 붙잡는다 — 응답 전 순간을 단언해야 하기 때문이다
    let releaseRefetch: (value: MemberDetail) => void = () => undefined;
    fetchMemberDetail.mockImplementationOnce(
      () =>
        new Promise<MemberDetail>((resolve) => {
          releaseRefetch = resolve;
        }),
    );

    // 다시 상세를 연다 — 같은 client(=같은 캐시)를 쓴다
    renderPage(client);

    await waitFor(() => {
      expect(fetchMemberDetail).toHaveBeenCalledTimes(2);
    });

    // 재조회가 도는 중이지만 캐시에 데이터가 있다 — 카드는 **즉시** 서 있어야 한다.
    // 고치기 전 코드는 여기서 죽는다: 왕복할 때마다 스켈레톤이 번쩍인다.
    expectRefetchInFlightWithData(client);
    expect(skeletonCount()).toBe(0);
    expectMemberCardVisible();

    releaseRefetch(DETAIL);
    await waitFor(() => {
      expect(screen.getByText('회원 정보')).not.toBeNull();
    });
  });
});
