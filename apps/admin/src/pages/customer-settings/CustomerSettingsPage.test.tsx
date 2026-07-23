// 재조회가 편집 폼을 지우지 않는다 (STATE-01) — apps/admin/src/pages/customer-settings/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면은 **저장이 곧 재조회**다: useSaveTierPolicy 의 onSuccess 가 tierPolicyKeys.all 을
// 무효화한다(queries.ts). 예전 코드는 `isFetching: loading` 을 그대로 읽어
// `if (loading || draft === null || validation === null) return <skeleton/>` 로 조기 반환했다 —
// 즉 **저장에 성공한 그 순간 편집 중이던 폼 전체가 스켈레톤 세 줄로 교체**됐다.
// 방금 저장한 사람이 자기 화면을 잃는다. 목록 화면의 STATE-01 과 같은 병이지만 대상이 더 나쁘다:
// 표는 다시 그리면 그만이지만 **폼은 사용자가 손으로 채운 상태**다.
//
// [왜 컴포넌트 테스트로는 못 잡나 — 이 버그가 살아남은 이유]
// TierPolicyCard·TierCriteriaCard 자신은 옳았다: rows 를 받으면 입력을 그린다. 버그는 **페이지가
// 무엇을 loading 이라 부르며 카드에 도달조차 못 했는가**에 있었다 — 조기 반환은 카드보다 위에 있다.
// 카드만 테스트하면 영원히 초록이다. 페이지를 진짜 QueryClient 로 태워 재조회를 일으키고, 그
// 재조회가 **도는 동안** 단언해야 잡힌다 — 두 번째 응답을 즉시 돌려주면 그 순간이 존재하지 않아
// 버그가 있어도 통과하는 공허한 테스트가 된다.
//
// [firstLoading 의 정의가 이 파일의 계약이다]
// `firstLoading = isFetching && data === undefined` — '조회 중'이 아니라 '아직 **보여줄 것이
// 없는** 조회 중'만 스켈레톤이다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import type { TierPolicy } from './types';

/**
 * queries.ts 의 tierPolicyKeys.all — 저장 성공 시 실제로 **이 키**가 무효화된다.
 * invalidateQueries 는 접두 일치라 아래 detail 키까지 함께 무효화된다.
 */
const POLICY_KEY = ['tier-policy'];

/** tierPolicyKeys.detail() — 쿼리가 실제로 앉아 있는 자리. getQueryState 는 **정확 일치**를 요구한다 */
const POLICY_DETAIL_KEY = ['tier-policy', 'detail'];

/** 승급 조건 입력의 접근성 이름 (TierPolicyCard 의 visually-hidden label) */
const VIP_THRESHOLD_LABEL = 'VIP 승급 조건 (누적 구매금액, 원)';

const POLICY: TierPolicy = {
  tiers: [
    { id: 'normal', label: '일반회원', system: true, threshold: 0, discountPercent: 0 },
    { id: 'vip', label: 'VIP', system: true, threshold: 1_000_000, discountPercent: 3 },
    { id: 'vvip', label: 'VVIP', system: true, threshold: 5_000_000, discountPercent: 5 },
  ],
  period: 'all',
  allowDemotion: false,
  recalcTrigger: 'order-completed',
};

// fetchTierPolicy 만 바꾼다 — 검증(zod)·분포 계산·라벨은 진짜를 그대로 쓴다(importOriginal).
// 이 테스트의 주제는 '재조회 중 화면이 무엇을 그리는가' 이지 픽스처의 내용이 아니다.
const fetchTierPolicy = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchTierPolicy,
}));

const { default: CustomerSettingsPage } = await import('./CustomerSettingsPage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        {/* 미저장 이탈 가드(useUnsavedChangesDialog)가 useNavigate 를 쓴다 — 라우터가 필요하다 */}
        <MemoryRouter initialEntries={['/users/settings']}>
          <CustomerSettingsPage />
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

/**
 * [이 테스트가 공허하지 않다는 증거 — 지우지 말 것]
 *
 * 아래 단언들은 '재조회가 **도는 동안**' 이라야 의미가 있다. 두 번째 응답이 이미 도착했다면
 * 예전 코드의 `loading`(=isFetching) 도 false 라서 **버그를 그대로 둔 채로도 초록**이 된다.
 * 그래서 단언 직전에 캐시 상태를 직접 확인한다: 조회는 진행 중이고, data 는 이미 있다.
 * 이 함수가 통과하는 한, 아래 `skeletonCount() === 0` 은 예전 코드에서 반드시 실패한다.
 */
function expectRefetchInFlightWithData(client: QueryClient): void {
  const state = client.getQueryState(POLICY_DETAIL_KEY);
  expect(state?.fetchStatus).toBe('fetching');
  expect(state?.data).not.toBeUndefined();
}

/** 편집 폼이 실제로 서 있는가 — 좌측 두 카드와 우측 미리보기를 함께 본다 */
function expectFormVisible(): void {
  expect(screen.getByText('등급 정책')).not.toBeNull();
  expect(screen.getByText('등급 산정 기준')).not.toBeNull();
  expect(screen.getByText('현재 등급 분포')).not.toBeNull();
  expect(screen.getByLabelText(VIP_THRESHOLD_LABEL)).not.toBeNull();
}

beforeEach(() => {
  fetchTierPolicy.mockReset();
  fetchTierPolicy.mockResolvedValue(POLICY);
});

describe('CustomerSettingsPage — 재조회가 편집 폼을 지우지 않는다 (STATE-01)', () => {
  it('최초 로드 중에만 스켈레톤을 그린다', async () => {
    renderPage();

    // 아직 응답 전 — 보여줄 정책이 없으므로 스켈레톤이 옳다
    expect(skeletonCount()).toBeGreaterThan(0);
    expect(screen.getByText('등급 정책을 불러오는 중이에요…')).not.toBeNull();

    await waitFor(() => {
      expect(screen.getByText('등급 산정 기준')).not.toBeNull();
    });
    expect(skeletonCount()).toBe(0);
  });

  it('저장이 정책을 무효화해도 편집 폼이 그대로 남는다 — 스켈레톤으로 덮지 않는다', async () => {
    const client = renderPage();

    await waitFor(() => {
      expect(screen.getByText('등급 산정 기준')).not.toBeNull();
    });

    /**
     * [재조회를 **멈춰 세운다**]
     * 단언해야 하는 순간은 '재조회가 도는 동안' 이다. 두 번째 응답을 즉시 돌려주면 그 순간이
     * 존재하지 않아 버그가 있어도 초록이 된다. 그래서 두 번째 호출은 우리가 풀어 줄 때까지
     * pending 으로 붙잡는다.
     */
    let releaseSecondFetch: (value: TierPolicy) => void = () => undefined;
    fetchTierPolicy.mockImplementationOnce(
      () =>
        new Promise<TierPolicy>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    // 저장이 성공하면 실제로 이것이 일어난다 (queries.ts 의 useSaveTierPolicy onSuccess)
    void client.invalidateQueries({ queryKey: POLICY_KEY });

    await waitFor(() => {
      expect(fetchTierPolicy).toHaveBeenCalledTimes(2);
    });

    // 여기가 그 순간이다 — isFetching 은 true 이고 data 는 이미 있다.
    // 고치기 전 코드는 이 단언에서 죽는다: 폼이 스켈레톤 세 줄로 교체됐다.
    expectRefetchInFlightWithData(client);
    expect(skeletonCount()).toBe(0);
    expectFormVisible();
    // 로딩 안내로 되돌아가지도 않는다 — 들고 있는 정책이 있다
    expect(screen.queryByText('등급 정책을 불러오는 중이에요…')).toBeNull();

    releaseSecondFetch(POLICY);
    await waitFor(() => {
      expect(screen.getByText('등급 산정 기준')).not.toBeNull();
    });
  });

  it('재조회가 도는 동안 저장하지 않은 입력이 살아남는다', async () => {
    // 폼이 스켈레톤으로 교체된다는 것은 곧 **손으로 채운 값이 날아간다**는 뜻이다.
    // 앞 테스트가 '폼이 서 있는가'를 봤다면, 이 테스트는 '그 안의 상태가 온전한가'를 본다.
    const client = renderPage();

    const threshold = await screen.findByLabelText<HTMLInputElement>(VIP_THRESHOLD_LABEL);
    expect(threshold.value).toBe('1,000,000');

    // 운영자가 VIP 승급 조건을 고친다 (입력 중에는 숫자만 들어간다 — 포맷은 blur 에서)
    fireEvent.change(threshold, { target: { value: '2000000' } });
    expect(screen.getByLabelText<HTMLInputElement>(VIP_THRESHOLD_LABEL).value).toBe('2000000');

    let releaseSecondFetch: (value: TierPolicy) => void = () => undefined;
    fetchTierPolicy.mockImplementationOnce(
      () =>
        new Promise<TierPolicy>((resolve) => {
          releaseSecondFetch = resolve;
        }),
    );

    void client.invalidateQueries({ queryKey: POLICY_KEY });

    await waitFor(() => {
      expect(fetchTierPolicy).toHaveBeenCalledTimes(2);
    });

    // 재조회가 도는 동안에도 편집 중이던 값은 그 자리에 있다.
    // 고치기 전 코드는 여기서 죽는다: 폼이 언마운트되어 입력 자체를 찾을 수 없었다.
    expectRefetchInFlightWithData(client);
    expect(skeletonCount()).toBe(0);
    expect(screen.getByLabelText<HTMLInputElement>(VIP_THRESHOLD_LABEL).value).toBe('2000000');
    expect(screen.getByText('저장하지 않은 변경 사항이 있어요.')).not.toBeNull();

    releaseSecondFetch(POLICY);
    await waitFor(() => {
      expect(screen.getByText('등급 산정 기준')).not.toBeNull();
    });
  });
});
