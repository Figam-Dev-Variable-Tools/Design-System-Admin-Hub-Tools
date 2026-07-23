// 통계 6개 화면의 상태 머신 전수 검증 (STATE-01 · STATE-02 · EXC-03)
//
// [왜 6개를 한 파일에서 도나] 이 배치의 약속은 '6개 화면이 **같은** 상태 머신을 쓴다'는 것이다.
// 화면마다 테스트를 따로 두면 그 약속이 아니라 화면 하나하나를 검증하게 되고, 다섯 번째 화면이
// 몰래 다른 규칙을 쓰기 시작해도 아무도 모른다. 여기서는 **같은 표를 6번 돌린다** — 한 화면이
// 대열에서 이탈하면 그 줄이 빨개진다.
//
// [E2E 를 대신한다] 이 배치는 E2E 를 돌릴 수 없다(워크트리마다 dev 서버 = 포트 충돌). 그래서
// 실제 라우터·실제 쿼리 클라이언트·실제 픽스처로 페이지를 통째로 렌더해 상태 전이를 단언한다.
// 순수 함수 테스트로는 '조회 실패가 정말 인라인 배너로 뜨는가'를 증명할 수 없다.
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import {
  DEFAULT_PAYMENT_SETTINGS,
  resetPaymentSettings,
  writePaymentSettings,
} from '../../shared/commerce/payment-settings';
import VisitorStatsPage from './visitors/VisitorStatsPage';
import MemberStatsPage from './members/MemberStatsPage';
import RevenueStatsPage from './revenue/RevenueStatsPage';
import OrderStatsPage from './orders/OrderStatsPage';
import TrafficStatsPage from './traffic/TrafficStatsPage';
import KeywordStatsPage from './keywords/KeywordStatsPage';

interface Screen {
  readonly name: string;
  readonly route: string;
  readonly Page: ComponentType;
  /** 이 화면에 반드시 있어야 하는 KPI 하나 — 화면이 진짜 자기 데이터를 그렸는지의 증거 */
  readonly kpi: string;
}

const SCREENS: readonly Screen[] = [
  { name: '방문자 통계', route: '/stats/visitors', Page: VisitorStatsPage, kpi: '순 방문자 수' },
  { name: '회원 통계', route: '/stats/members', Page: MemberStatsPage, kpi: '신규 가입' },
  { name: '매출 통계', route: '/stats/revenue', Page: RevenueStatsPage, kpi: '순매출' },
  { name: '주문 통계', route: '/stats/orders', Page: OrderStatsPage, kpi: '주문 건수' },
  { name: '유입 분석', route: '/stats/traffic', Page: TrafficStatsPage, kpi: '구매전환율' },
  { name: '검색어 분석', route: '/stats/keywords', Page: KeywordStatsPage, kpi: '총 검색수' },
];

/**
 * 이 표는 **결제를 쓰는 사이트**를 전제로 돈다.
 *
 * 매출·주문 통계는 결제를 쓰지 않으면 화면이 통째로 문의·견적 지표로 갈린다(아래 별도 describe).
 * 그 갈림을 여기서 함께 돌리면 '6개 화면이 같은 상태 머신을 쓴다' 는 이 파일의 약속이 흐려진다 —
 * 상태 머신은 화면이 자기 데이터를 그릴 때의 규칙이고, 대체 화면은 그 앞단의 결정이다.
 */
function enablePayments(): void {
  writePaymentSettings({
    ...DEFAULT_PAYMENT_SETTINGS,
    usePg: true,
    // 자격증명이 완비여야 결제를 여는 설정으로 친다(shared/commerce/pg-catalog.ts)
    connection: {
      mode: 'direct',
      provider: 'toss',
      publicValues: { clientKey: 'test_ck_stats', mid: 'tosspayments-test' },
      storedSecrets: ['secretKey'],
    },
  });
}

/**
 * 재현 파라미터(?fail=·?empty=·?delay=)는 data-source 가 **window.location.search** 에서 읽는다
 * (MemoryRouter 가 아니라). 실제 앱과 같은 경로이므로 테스트도 같은 곳에 심는다.
 */
function setBrowserSearch(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

function renderScreen(screen_: Screen, search = '') {
  setBrowserSearch(search);
  enablePayments();
  // 화면마다 새 캐시 — 앞 테스트의 캐시가 다음 테스트의 로딩 상태를 가리지 않는다
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`${screen_.route}${search}`]}>
          <screen_.Page />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  setBrowserSearch('');
  // 테스트가 서로의 결제 설정을 물려받지 않게 한다
  resetPaymentSettings();
});

describe.each(SCREENS)('$name — 상태 머신', (screen_) => {
  it('조회에 성공하면 KPI 와 조회 조건을 그린다', async () => {
    renderScreen(screen_);

    // 조회 조건 바는 로딩과 무관하게 처음부터 있다 — 조건을 바꿔 재조회할 손잡이이기 때문이다
    expect(screen.getByRole('region', { name: '조회 조건' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(screen_.kpi).length).toBeGreaterThan(0);
    });

    // 성공 상태에서는 에러 배너가 없다 (STATE-01: 네 상태 중 정확히 하나)
    expect(screen.queryByText('통계를 불러오지 못했어요.')).toBeNull();
  });

  it('조회 실패는 인라인 배너와 다시 시도로 뜬다 — 토스트가 아니다 (STATE-02)', async () => {
    renderScreen(screen_, '?fail=list');

    await waitFor(() => {
      expect(screen.getByText('통계를 불러오지 못했어요.')).toBeDefined();
    });

    // 사용자가 할 일은 재시도 하나뿐이므로 그 손잡이가 화면에 남아 있어야 한다
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeDefined();
    // 실패 상태에서 KPI 를 함께 그리면 '실패'와 '0건'을 구분할 수 없게 된다
    expect(screen.queryByText(screen_.kpi)).toBeNull();
  });

  it('한 화면만 실패시켜도 나머지는 멀쩡하다 — 스코프가 갈려 있다', async () => {
    renderScreen(screen_, '?fail=stats-visitors:list');

    if (screen_.route === '/stats/visitors') {
      await waitFor(() => {
        expect(screen.getByText('통계를 불러오지 못했어요.')).toBeDefined();
      });
      return;
    }

    await waitFor(() => {
      expect(screen.getAllByText(screen_.kpi).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('통계를 불러오지 못했어요.')).toBeNull();
  });

  it('집계가 0이어도 에러가 아니다 — 성공한 빈 상태다 (STATE-01)', async () => {
    renderScreen(screen_, '?empty=all');

    await waitFor(() => {
      expect(screen.getAllByText(screen_.kpi).length).toBeGreaterThan(0);
    });
    // 빈 것과 실패한 것은 다르다
    expect(screen.queryByText('통계를 불러오지 못했어요.')).toBeNull();
  });

  it('종료일이 시작일보다 빠르면 조용한 empty 가 아니라 검증 오류다 (COMP-11)', async () => {
    renderScreen(screen_, '?preset=custom&start=2026-07-16&end=2026-07-01');

    // 메시지는 **정확히 한 번**, 고칠 수 있는 입력칸 옆에만 뜬다.
    // (배너로 한 번 더 띄우면 스크린리더가 같은 문장을 두 번 읽는다.)
    await waitFor(() => {
      expect(screen.getAllByText('종료일은 시작일보다 빠를 수 없어요.')).toHaveLength(1);
    });

    // 말이 안 되는 범위로는 조회하지 않는다 — 본문이 뜨지 않는다
    expect(screen.queryByText(screen_.kpi)).toBeNull();
  });
});

/* ── 결제를 쓰지 않을 때 — 매출·주문 화면이 갈린다 ───────────────────────────
 *
 * 매출 0 을 그리는 대신 지금 실제로 움직이는 지표(문의·견적)를 보여 준다. 0 을 그리면 운영자는
 * 장애로 읽는다 — 그 판단이 화면에 실제로 반영되는지 여기서 확인한다.
 */
describe('결제 미사용 — 매출·주문 통계 대체', () => {
  function renderWithoutPg(Page: ComponentType, route: string) {
    setBrowserSearch('');
    // 기본 설정이 곧 PG 미사용이다(DEFAULT_PAYMENT_SETTINGS.usePg === false)
    resetPaymentSettings();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Page />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );
  }

  it('매출 통계 자리에 문의·견적 지표가 선다 — 매출 0 을 그리지 않는다', () => {
    renderWithoutPg(RevenueStatsPage, '/stats/revenue');

    expect(screen.getAllByText('문의 건수').length).toBeGreaterThan(0);
    expect(screen.getAllByText('견적 수락률').length).toBeGreaterThan(0);
    // 매출 KPI 는 아예 그리지 않는다
    expect(screen.queryByText('순매출')).toBeNull();
  });

  it('주문 통계도 같은 패널로 갈린다 — 두 화면이 같은 규칙을 쓴다', () => {
    renderWithoutPg(OrderStatsPage, '/stats/orders');

    expect(screen.getAllByText('평균 응답시간').length).toBeGreaterThan(0);
    expect(screen.queryByText('주문 건수')).toBeNull();
  });

  it('결제와 무관한 화면은 갈리지 않는다 — 방문자 통계는 그대로다', async () => {
    renderWithoutPg(VisitorStatsPage, '/stats/visitors');

    await waitFor(() => {
      expect(screen.getAllByText('순 방문자 수').length).toBeGreaterThan(0);
    });
  });
});
