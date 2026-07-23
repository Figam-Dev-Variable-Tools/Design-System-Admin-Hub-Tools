// 플랜 화면의 세 탭을 **렌더로** 고정한다 · apps/admin/src/pages/settings/plan/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면의 값어치는 계산이 아니라 **말투**다. 세 가지가 깨져도 어떤 순수 함수 테스트도 빨개지지
// 않는다:
//   ① 모름(null)을 0원·0건으로 그리는 것 — 화면이 거짓 사실을 단정한다. 이 화면 최악의 결함이다.
//   ② 청구 상태가 무엇을 잠갔는지 말하지 않는 것 — billingState 는 엔타이틀먼트 판정이 읽는
//      값인데(planReadOnly), 화면이 그 연결을 말하지 않으면 운영자는 잠긴 저장 버튼의 이유를
//      이 화면에서 끝내지 못한다.
//   ③ 탭이 주소에 남지 않는 것 — '결제내역 탭 좀 봐 주세요' 라는 링크가 존재할 수 없게 된다.
// 그래서 여기서는 화면에 실제로 남은 **글자와 주소**로 단언한다.
//
// [0건과 모름을 같은 단언으로 보지 않는다] `[]` 와 `null` 은 서로 다른 문장을 내야 하고, 그
// 사실을 한 테스트가 아니라 **서로를 부정하는 두 테스트**로 고정한다 — 한쪽만 보면 둘을 뭉친
// 구현도 통과한다.
//
// [플랜을 심는 통로] 사내 어드민이 값을 주는 것과 같은 통로(receivePlan)와, 화면이 없어진 재현
// 액션(devSetBillingState)을 쓴다. 손으로 기본값을 적으면 그 사본이 두 번째 정본이 된다.
// ─────────────────────────────────────────────────────────────────────────────
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { useEntitlementStore } from '../../../shared/entitlements/entitlement-store';
import { planStateForTier } from '../../../shared/entitlements/plan';
import type { BillingState, PlanTier } from '../../../shared/entitlements/plan';
import PlanPage from './PlanPage';
import { BillingPanel } from './components/BillingPanel';
import { InvoiceHistoryPanel } from './components/InvoiceHistoryPanel';
import { UNKNOWN_TEXT } from './subscription';
import type { SubscriptionBilling, SubscriptionInvoice } from './subscription';

/* ── 좌표 ─────────────────────────────────────────────────────────────────── */

/** 모듈 싱글턴이라 테스트 사이에 값이 샌다 — import 시점의 상태를 그대로 떠서 되돌린다 */
const PRISTINE_PLAN = useEntitlementStore.getState().plan;

/** 주소를 화면에 내놓는다 — 탭이 URL 에 실렸다는 것은 **주소로만** 증명된다 */
function LocationProbe() {
  const { pathname, search } = useLocation();
  return <span data-testid="url">{`${pathname}${search}`}</span>;
}

function renderPage(initialPath = '/settings/plan'): void {
  render(
    // main.tsx 와 같은 v7 동작으로 맞춘다 — 앱과 다른 라우터 설정 위에서 단언하지 않는다
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LocationProbe />
      <PlanPage />
    </MemoryRouter>,
  );
}

function currentUrl(): string {
  return screen.getByTestId('url').textContent ?? '';
}

function seedPlan(tier: PlanTier, billingState: BillingState = 'active'): void {
  useEntitlementStore.getState().receivePlan(planStateForTier(tier));
  useEntitlementStore.getState().devSetBillingState(billingState);
}

/** 지금 열린 탭 패널 — 단언이 다른 탭의 글자를 잘못 집지 않게 범위를 좁힌다 */
function activePanel(): HTMLElement {
  const panel = document.querySelector('[role="tabpanel"]');
  if (!(panel instanceof HTMLElement)) throw new Error('탭 패널이 없다');
  return panel;
}

afterEach(() => {
  useEntitlementStore.setState({ plan: PRISTINE_PLAN });
  window.localStorage.clear();
});

/* ── 탭 골격 ──────────────────────────────────────────────────────────────── */

describe('PlanPage — 탭 3개와 주소', () => {
  it('탭은 이용현황·결제·결제내역 셋이고 기본은 이용현황이다', () => {
    seedPlan('pro');
    renderPage();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['이용현황', '결제', '결제내역']);
    expect(screen.getByRole('tab', { name: '이용현황' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('기본 탭은 주소에 쓰지 않는다 — 한 화면이 두 개의 URL 을 갖지 않게', () => {
    seedPlan('pro');
    renderPage();

    expect(currentUrl()).toBe('/settings/plan');
  });

  it('탭을 누르면 주소가 바뀌고(?tab=) 패널 내용이 바뀐다', async () => {
    const user = userEvent.setup();
    seedPlan('pro');
    renderPage();

    await user.click(screen.getByRole('tab', { name: '결제내역' }));

    expect(currentUrl()).toBe('/settings/plan?tab=history');
    expect(within(activePanel()).getByText(/구독료/)).not.toBeNull();
    // 이용현황의 표가 남아 있으면 탭이 아니라 아코디언이다
    expect(screen.queryByText('포함 기능')).toBeNull();
  });

  it('기본 탭으로 돌아오면 ?tab= 이 주소에서 지워진다', async () => {
    const user = userEvent.setup();
    seedPlan('pro');
    renderPage();

    await user.click(screen.getByRole('tab', { name: '결제' }));
    expect(currentUrl()).toBe('/settings/plan?tab=billing');

    await user.click(screen.getByRole('tab', { name: '이용현황' }));
    expect(currentUrl()).toBe('/settings/plan');
  });

  it('주소로 들어온 탭이 열린다 — 링크 공유·새로고침이 사는 자리다', () => {
    seedPlan('pro');
    renderPage('/settings/plan?tab=billing');

    expect(screen.getByRole('tab', { name: '결제' }).getAttribute('aria-selected')).toBe('true');
    expect(within(activePanel()).getByText('청구 상태')).not.toBeNull();
  });

  it('모르는 ?tab= 은 기본 탭으로 흘러간다 — 손으로 고친 주소가 빈 화면을 만들지 않게', () => {
    seedPlan('pro');
    renderPage('/settings/plan?tab=거짓말');

    expect(screen.getByRole('tab', { name: '이용현황' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(within(activePanel()).getByText('포함 기능')).not.toBeNull();
  });

  it('탭 패널은 지금 탭의 버튼이 이름을 준다 (WAI-ARIA Tabs)', async () => {
    const user = userEvent.setup();
    seedPlan('pro');
    renderPage();

    await user.click(screen.getByRole('tab', { name: '결제' }));

    const panel = activePanel();
    const labelledBy = panel.getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();
    expect(screen.getByRole('tab', { name: '결제' }).id).toBe(labelledBy);
    expect(panel.id).toBe(screen.getByRole('tab', { name: '결제' }).getAttribute('aria-controls'));
  });
});

/* ── 개발용 전환 패널은 없다 ──────────────────────────────────────────────── */

describe('PlanPage — 화면에 플랜을 바꾸는 손잡이가 없다', () => {
  it('세 탭 어디에도 select 가 없다 — 개발용 플랜 전환 패널은 제거됐다', async () => {
    const user = userEvent.setup();
    seedPlan('basic');
    renderPage();

    for (const name of ['이용현황', '결제', '결제내역']) {
      await user.click(screen.getByRole('tab', { name }));
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.queryByText('개발용 플랜 전환')).toBeNull();
      // 플랜을 올리는 버튼도 없다 — 나가는 길은 링크뿐이다
      expect(screen.queryByRole('button', { name: /업그레이드|플랜 변경|결제하기/ })).toBeNull();
    }
  });
});

/* ── 이용현황 탭 ──────────────────────────────────────────────────────────── */

describe('PlanPage — 이용현황 탭', () => {
  it('쿼터 종은 잠기지 않고 숫자로 말한다 (상품 관리 · free 한도 20)', () => {
    seedPlan('free');
    renderPage();

    const row = screen.getByRole('row', { name: /상품 관리/ });
    expect(within(row).getByText('포함')).not.toBeNull();
    expect(within(row).getByText('한도')).not.toBeNull();
    expect(within(row).getByText('상품 관리 0/20')).not.toBeNull();
  });

  it('잠금 종은 어느 플랜부터 열리는지 말한다 — 권한 문구를 쓰지 않는다', () => {
    seedPlan('free');
    renderPage();

    const row = screen.getByRole('row', { name: /쿠폰/ });
    expect(within(row).getByText('프로 플랜부터')).not.toBeNull();
    expect(screen.queryByText(/권한이 없어요/)).toBeNull();
  });

  it('수준 종은 수준으로 말한다 (고급 통계 · enterprise)', () => {
    seedPlan('enterprise');
    renderPage();

    const row = screen.getByRole('row', { name: /고급 통계/ });
    expect(within(row).getByText('수준')).not.toBeNull();
    expect(within(row).getByText('고급 수준')).not.toBeNull();
  });

  it('판매하지 않는 모듈(absent)은 행 자체가 없다', () => {
    useEntitlementStore.getState().receivePlan({
      ...planStateForTier('enterprise'),
      overrides: { 'marketing.sms': { kind: 'switch', enabled: false } },
    });
    renderPage();

    expect(screen.queryByText(/SMS 발송/)).toBeNull();
  });

  it('행 머리 칸은 왼쪽 정렬이다 — 표의 왼쪽 모서리가 들쭉날쭉해지지 않게', () => {
    seedPlan('pro');
    renderPage();

    const rowHeader = within(screen.getByRole('row', { name: /주문 관리/ })).getByRole('rowheader');
    expect(rowHeader.style.textAlign).toBe('start');
  });
});

/* ── 결제 탭 — 청구 상태 3종 ──────────────────────────────────────────────── */

describe('PlanPage — 결제 탭이 청구 상태를 말한다', () => {
  it('정상: 배너가 없고 등록·수정·삭제가 열려 있다고 말한다', () => {
    seedPlan('pro', 'active');
    renderPage('/settings/plan?tab=billing');

    const panel = activePanel();
    expect(within(panel).getByText('정상')).not.toBeNull();
    expect(within(panel).getByText(/등록·수정·삭제가 모두 열려 있어요/)).not.toBeNull();
    expect(screen.queryByText(/조회만 가능해요/)).toBeNull();
  });

  it('결제 지연: 조회 전용으로 내려앉았다는 사실을 말한다 — 기능이 사라지지 않는다는 것도', () => {
    seedPlan('pro', 'past_due');
    renderPage('/settings/plan?tab=billing');

    const panel = activePanel();
    expect(within(panel).getByText('결제 지연')).not.toBeNull();
    expect(within(panel).getByText(/조회 전용/)).not.toBeNull();
    expect(within(panel).getByText(/기능이 사라지지는 않고/)).not.toBeNull();
  });

  it('이용 정지: 조회 전용이며 쌓인 데이터를 지우지 않는다고 말한다', () => {
    seedPlan('pro', 'suspended');
    renderPage('/settings/plan?tab=billing');

    const panel = activePanel();
    expect(within(panel).getByText('이용 정지')).not.toBeNull();
    expect(within(panel).getByText(/쌓인 데이터는 지워지지 않아요/)).not.toBeNull();
  });

  it('청구 상태 배너는 탭 위에 있어 이용현황 탭에서도 보인다', () => {
    seedPlan('pro', 'past_due');
    renderPage();

    // 이용현황을 보고 있어도 자기 앱이 조회 전용이라는 사실이 화면에 있다
    expect(screen.getByRole('tab', { name: '이용현황' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByText(/결제가 확인되지 않아 지금은 조회만 가능해요/)).not.toBeNull();
  });
});

/* ── 화면이 픽스처의 '모름' 을 그대로 통과시키는가 ────────────────────────────
 *
 * 아래 두 건은 패널이 아니라 **화면**을 본다. 패널만 단언하면 화면이 `?? []` · `?? {}` 한 줄로
 * 모름을 0건·빈 값으로 바꿔 놓아도 전부 초록이다 — 이 화면에서 가장 비싼 결함이 정확히 그 한 줄로
 * 들어온다(../subscription.ts 머리말). */

describe('PlanPage — 모름은 화면까지 모름으로 도착한다', () => {
  it('결제 탭: 결제 정보를 못 받았다는 사실이 화면에 그대로 남는다', () => {
    seedPlan('pro');
    renderPage('/settings/plan?tab=billing');

    expect(
      within(activePanel()).getByText(/아직 결제 수단·다음 청구 정보를 받지 못했어요/),
    ).not.toBeNull();
  });

  it('결제내역 탭: 0건이 아니라 모름으로 도착한다', () => {
    seedPlan('pro');
    renderPage('/settings/plan?tab=history');

    const panel = activePanel();
    expect(within(panel).getByText(/아직 지난 청구 목록을 받지 못했어요/)).not.toBeNull();
    // '없습니다' 로 바뀌어 있으면 픽스처의 null 이 어디선가 [] 로 접혔다는 뜻이다
    expect(within(panel).queryByText(/발생된 구독료 청구가 없어요/)).toBeNull();
  });
});

/* ── 결제 탭 — 모른다 ─────────────────────────────────────────────────────── */

const KNOWN_BILLING: SubscriptionBilling = {
  method: { kind: 'card', hint: '신한 ····1234' },
  cycle: 'yearly',
  nextChargeAt: '2026-08-01',
  nextChargeAmount: { currency: 'KRW', amount: 1_200_000 },
  invoiceEmail: 'billing@example.com',
};

const PARTIAL_BILLING: SubscriptionBilling = {
  method: null,
  cycle: null,
  nextChargeAt: null,
  nextChargeAmount: null,
  invoiceEmail: null,
};

describe('BillingPanel — 모름을 0 으로 흉내 내지 않는다', () => {
  const plan = planStateForTier('pro');

  it('결제 정보를 받지 못했으면(null) 그 사실을 말한다 — 0원·수단 없음으로 그리지 않는다', () => {
    render(<BillingPanel plan={plan} billing={null} />);

    expect(screen.getByText(/아직 결제 수단·다음 청구 정보를 받지 못했어요/)).not.toBeNull();
    expect(screen.queryByText('₩0')).toBeNull();
    expect(screen.queryByText(/등록된 결제 수단이 없어요/)).toBeNull();
  });

  it('받았지만 필드가 비어 있으면 칸마다 확인할 수 없음이라고 쓴다', () => {
    render(<BillingPanel plan={plan} billing={PARTIAL_BILLING} />);

    // 5개 칸(결제 수단·주기·다음 청구일·금액·수신처)이 전부 모름이다
    expect(screen.getAllByText(UNKNOWN_TEXT)).toHaveLength(5);
    // 문서를 받았으므로 '받지 못했습니다' 는 말하지 않는다 — 두 모름은 다른 사실이다
    expect(screen.queryByText(/받지 못했어요/)).toBeNull();
  });

  it('아는 값은 그대로 말한다 — 모름 표기가 값을 삼키지 않는다', () => {
    render(<BillingPanel plan={plan} billing={KNOWN_BILLING} />);

    expect(screen.getByText('신용카드 자동결제 · 신한 ····1234')).not.toBeNull();
    expect(screen.getByText('연간')).not.toBeNull();
    expect(screen.getByText('2026-08-01')).not.toBeNull();
    expect(screen.getByText('billing@example.com')).not.toBeNull();
    expect(screen.queryByText(UNKNOWN_TEXT)).toBeNull();
  });
});

/* ── 결제내역 탭 — 모름 · 0건 · 목록 ──────────────────────────────────────── */

const INVOICES: readonly SubscriptionInvoice[] = [
  {
    id: 'inv-2026-07',
    chargedAt: '2026-07-01',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    planLabel: '프로 연간',
    amount: { currency: 'KRW', amount: 100_000 },
    state: 'paid',
    receiptUrl: 'https://spaceplanning.ai/receipts/inv-2026-07',
  },
  {
    id: 'inv-2026-06',
    chargedAt: '2026-06-01',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    planLabel: '프로 연간',
    amount: { currency: 'KRW', amount: 100_000 },
    state: 'unpaid',
    receiptUrl: null,
  },
];

describe('InvoiceHistoryPanel — 모름 · 0건 · 목록 세 상태', () => {
  it('모름(null): 청구가 없다고 단정하지 않는다', () => {
    render(<InvoiceHistoryPanel invoices={null} />);

    expect(screen.getByText(/아직 지난 청구 목록을 받지 못했어요/)).not.toBeNull();
    // 0건의 말투가 새어 나오면 3년째 결제 중인 고객에게도 같은 문장이 나온다
    expect(screen.queryByText(/발생된 구독료 청구가 없어요/)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('0건([]): 정말 없다고 단정한다 — 모름의 말투를 쓰지 않는다', () => {
    render(<InvoiceHistoryPanel invoices={[]} />);

    expect(screen.getByText(/발생된 구독료 청구가 없어요/)).not.toBeNull();
    expect(screen.queryByText(/받지 못했어요/)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('목록: 청구일이 행 머리(왼쪽 정렬)이고 영수증 없는 건은 링크를 만들지 않는다', () => {
    render(<InvoiceHistoryPanel invoices={INVOICES} />);

    const paidRow = screen.getByRole('row', { name: /2026-07-01/ });
    const rowHeader = within(paidRow).getByRole('rowheader');
    expect(rowHeader.textContent).toBe('2026-07-01');
    expect(rowHeader.style.textAlign).toBe('start');
    expect(within(paidRow).getByRole('link', { name: '영수증 보기' })).not.toBeNull();

    const unpaidRow = screen.getByRole('row', { name: /2026-06-01/ });
    expect(within(unpaidRow).getByText('미납')).not.toBeNull();
    expect(within(unpaidRow).queryByRole('link')).toBeNull();
  });

  it('/sales/billing 과 무엇이 다른지 화면이 직접 말한다 — 두 화면이 서로를 흉내 내지 않게', () => {
    render(<InvoiceHistoryPanel invoices={null} />);

    expect(screen.getByText(/우리가 사내에 내는 구독료/)).not.toBeNull();
    expect(screen.getByText(/\/sales\/billing/)).not.toBeNull();
  });
});
