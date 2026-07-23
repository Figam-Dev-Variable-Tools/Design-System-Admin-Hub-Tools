// 쿠폰 폼이 화면에서 실제로 그렇게 도는가 — apps/admin/src/pages/products/coupons/CouponFormPage.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 순수 테스트로 충분하지 않은가]
// coupons.test.ts 는 연쇄 규칙·가드 술어가 무엇을 돌려주는지 고정한다. 그런데 이 화면이 실제로
// 틀릴 수 있는 자리는 그 위다:
//   · 1차를 바꿨을 때 **셀렉트가 정말 비는가** (규칙은 옳은데 화면이 예전 값을 들고 있을 수 있다)
//   · 사용 대상을 바꿨을 때 **이전에 고른 id 가 폼에서 사라지는가** (보이지 않는 값이 저장되는 결함)
//   · 잠긴 버튼이 **사유를 달고 있는가**, 그리고 그 잠금이 **제출에도 걸리는가**
//   · 이음매가 미배선일 때 빈 목록이 아니라 **'모른다'** 고 말하는가
//   · 발급 시점마다 **필요한 조건만** 뜨는가
// 그래서 여기서는 페이지를 진짜로 렌더하고 접근성 이름으로 컨트롤을 집는다.
//
// [등급 목록은 이음매로만 온다] 이 화면은 고객 설정 화면을 import 하지 않는다(축1, 임계값 0).
// 테스트도 같은 문을 쓴다 — registerMemberTierCatalogLookup 으로 꽂고, reset 으로 '모른다' 로 되돌린다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  registerMemberTierCatalogLookup,
  resetMemberTierCatalogLookup,
} from '../../../shared/domain/member-tier-catalog';
import type { MemberTierEntry } from '../../../shared/domain/member-tier-catalog';
import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';

const ROUTE = '/products/coupons/new';

/** 기본 3종 + 운영자가 추가한 '골드' — 추가 등급은 발급 기준이 아직 들 수 없다 */
const TIERS: readonly MemberTierEntry[] = [
  { id: 'normal', label: '일반회원', system: true, threshold: 0, discountPercent: 0 },
  { id: 'vip', label: 'VIP', system: true, threshold: 1_000_000, discountPercent: 3 },
  { id: 'tier-gold', label: '골드', system: false, threshold: 3_000_000, discountPercent: 4 },
  { id: 'vvip', label: 'VVIP', system: true, threshold: 5_000_000, discountPercent: 5 },
];

// 저장이 실제로 어댑터에 닿았는지 본다 — '거부' 를 증명하려면 닿지 않았음을 볼 수 있어야 한다
const create = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./data-source')>();
  return { ...actual, couponAdapter: { ...actual.couponAdapter, create } };
});

const { default: CouponFormPage } = await import('./CouponFormPage');

function seedPermissions(): void {
  usePermissionStore.setState({
    roleState: {
      version: ROLE_STATE_VERSION,
      roles: [
        {
          id: 'role-test',
          name: '테스트 역할',
          system: false,
          scope: 'all',
          permissions: createMatrix(true),
          widgets: createWidgets(true),
        },
      ],
      activeRoleId: 'role-test',
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <Routes>
            <Route path={ROUTE} element={<CouponFormPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * 라벨 이름 매처 — FormField 의 필수 마커(' *')는 aria-hidden 장식이지만 label 의 textContent 에는
 * 남는다. 문자열로 정확히 찾으면 필수 필드만 조용히 안 잡히므로 마커를 허용하는 정규식으로 찾는다.
 */
const REGEXP_META = /[.*+?^${}()|[\]\\]/g;

const lbl = (name: string): RegExp =>
  new RegExp('^' + name.replace(REGEXP_META, '\\$&') + '\\s*\\*?$');

const select = (name: string) => screen.getByLabelText<HTMLSelectElement>(lbl(name));

/** 사용 대상을 바꾼다 — 화면이 연쇄 셀렉트를 세울 때까지 기다린다 */
async function chooseTarget(value: string): Promise<void> {
  fireEvent.change(select('사용 대상'), { target: { value } });
}

/** 연쇄 셀렉트가 실제로 섰는지 — 조회가 끝나기 전에는 '불러오는 중' 이다 */
async function waitForChain(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByLabelText(lbl('1차 카테고리'))).not.toBeNull();
  });
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(undefined);
  registerMemberTierCatalogLookup(() => TIERS);
  seedPermissions();
});

afterEach(() => {
  resetMemberTierCatalogLookup();
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

/* ── ② 최소 주문 금액의 자리 ────────────────────────────────────────────────── */

describe('최소 주문 금액은 쿠폰 정보 카드에 있다', () => {
  it("'사용 조건' 이 아니라 '쿠폰 정보' 안에서 찾힌다", () => {
    renderPage();

    const info = screen.getByRole('region', { name: '쿠폰 정보' });
    expect(within(info).getByLabelText(lbl('최소 주문 금액 (원)'))).not.toBeNull();

    const usage = screen.getByRole('region', { name: '사용 조건' });
    expect(within(usage).queryByLabelText(lbl('최소 주문 금액 (원)'))).toBeNull();
  });

  it('할인 칸 바로 뒤, 발급 수량 앞에 온다 — 금액 문장이 이어지도록', () => {
    renderPage();

    const info = screen.getByRole('region', { name: '쿠폰 정보' });
    const order = within(info)
      .getAllByRole('textbox')
      .map((element) => element.getAttribute('id'));

    expect(order.indexOf('coupon-min-order')).toBeGreaterThan(
      order.indexOf('coupon-discount-value'),
    );
    expect(order.indexOf('coupon-min-order')).toBeLessThan(order.indexOf('coupon-quantity'));
  });
});

/* ── ③ 연쇄 드롭다운 ────────────────────────────────────────────────────────── */

describe("사용 대상 '특정 상품' — 1차 → 2차 → 상품", () => {
  it('1차를 고르면 그 아래 상품만 상품 셀렉트에 뜬다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    // 1차를 고르기 전에는 상품을 고를 수 없다 — 전 상품을 쏟아 놓지 않는다
    expect(select('상품').disabled).toBe(true);

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });

    await waitFor(() => {
      expect(select('상품').disabled).toBe(false);
    });
    const labels = Array.from(select('상품').options).map((option) => option.textContent);
    expect(labels).toContain('루미엔 경량 패딩 점퍼 (LMN-PAD-001)');
    expect(labels).not.toContain('노바 베이직 코튼 티셔츠 (NVA-TEE-014)');
  });

  it('2차를 고르면 그 2차의 상품으로 더 좁아진다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    await waitFor(() => {
      expect(select('2차 카테고리').disabled).toBe(false);
    });
    fireEvent.change(select('2차 카테고리'), { target: { value: 'outer-coat' } });

    // '코트' 에 등록된 상품은 없다 — 빈 셀렉트가 아니라 그 사실을 말한다
    expect(select('상품').disabled).toBe(true);
    expect(screen.getByText('이 분류에 등록된 상품이 없어요')).not.toBeNull();
  });

  it('고른 상품을 추가하면 목록에 남고, 저장 잠금이 풀린다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    await waitFor(() => {
      expect(select('상품').disabled).toBe(false);
    });
    fireEvent.change(select('상품'), { target: { value: 'prd-1' } });
    fireEvent.click(screen.getByRole('button', { name: '대상 상품에 추가' }));

    expect(
      screen.getByRole('button', { name: '루미엔 경량 패딩 점퍼 (LMN-PAD-001) 제외' }),
    ).not.toBeNull();
    expect(screen.getByText('1개 선택됨')).not.toBeNull();
    expect(screen.getByRole('button', { name: '등록' }).hasAttribute('disabled')).toBe(false);
  });
});

describe("사용 대상 '특정 카테고리' — 같은 부품이 2단에서 멈춘다", () => {
  it('상품 셀렉트는 아예 없고, 2차를 고르지 않으면 1차가 대상이 된다', async () => {
    renderPage();
    await chooseTarget('category');
    await waitForChain();

    expect(screen.queryByLabelText(lbl('상품'))).toBeNull();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    fireEvent.click(screen.getByRole('button', { name: '대상 카테고리에 추가' }));

    expect(screen.getByRole('button', { name: '아우터 제외' })).not.toBeNull();
  });

  it('2차를 고르면 경로 표기로 남는다', async () => {
    renderPage();
    await chooseTarget('category');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    fireEvent.change(select('2차 카테고리'), { target: { value: 'outer-coat' } });
    fireEvent.click(screen.getByRole('button', { name: '대상 카테고리에 추가' }));

    expect(screen.getByRole('button', { name: '아우터 > 코트 제외' })).not.toBeNull();
  });
});

/* ── 연쇄 초기화 ────────────────────────────────────────────────────────────── */

describe('연쇄 초기화 — 위를 바꾸면 아래를 버린다', () => {
  it('1차를 바꾸면 2차와 상품 선택이 비워진다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    await waitFor(() => {
      expect(select('상품').disabled).toBe(false);
    });
    fireEvent.change(select('2차 카테고리'), { target: { value: 'outer-jacket' } });
    fireEvent.change(select('1차 카테고리'), { target: { value: 'top' } });

    expect(select('2차 카테고리').value).toBe('');
    expect(select('상품').value).toBe('');
  });

  it('2차를 바꾸면 상품만 버리고 1차는 남는다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'top' } });
    await waitFor(() => {
      expect(select('상품').disabled).toBe(false);
    });
    fireEvent.change(select('상품'), { target: { value: 'prd-2' } });
    fireEvent.change(select('2차 카테고리'), { target: { value: 'top-tee' } });

    expect(select('1차 카테고리').value).toBe('top');
    expect(select('상품').value).toBe('');
  });
});

/* ── 사용 대상을 바꿨을 때 이전 선택이 남지 않는다 ───────────────────────────── */

describe('사용 대상을 바꾸면 이전에 고른 대상을 버린다', () => {
  it('상품을 골라 둔 채 회원등급으로 바꾸면 아무것도 선택되어 있지 않다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    await waitFor(() => {
      expect(select('상품').disabled).toBe(false);
    });
    fireEvent.change(select('상품'), { target: { value: 'prd-1' } });
    fireEvent.click(screen.getByRole('button', { name: '대상 상품에 추가' }));
    expect(screen.getByText('1개 선택됨')).not.toBeNull();

    await chooseTarget('member_grade');

    // 화면에 보이지 않는 값이 폼에 남아 함께 저장되면 안 된다
    expect(screen.getByText('0개 선택됨')).not.toBeNull();
    for (const box of screen.getAllByRole<HTMLInputElement>('checkbox')) {
      expect(box.checked).toBe(false);
    }
  });

  it('상품으로 되돌아오면 연쇄 좌표도 처음부터다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    fireEvent.change(select('1차 카테고리'), { target: { value: 'outer' } });
    await chooseTarget('category');
    await waitForChain();
    await chooseTarget('product');
    await waitForChain();

    expect(select('1차 카테고리').value).toBe('');
  });
});

/* ── 거부 사유 ──────────────────────────────────────────────────────────────── */

describe('가드 — 버튼 disabled 와 저장 거부가 같은 술어를 읽는다', () => {
  it('특정 상품인데 아무것도 고르지 않으면 사유를 말하고 버튼을 잠근다', async () => {
    renderPage();
    await chooseTarget('product');
    await waitForChain();

    expect(screen.getByText('대상 상품을 한 개 이상 선택하세요.')).not.toBeNull();
    const submit = screen.getByRole<HTMLButtonElement>('button', {
      name: '등록 — 대상 상품을 한 개 이상 선택하세요.',
    });
    expect(submit.disabled).toBe(true);
  });

  /**
   * [이 테스트는 zod 가 아니라 가드를 본다]
   * 필수 칸을 비워 둔 채 제출하면 zod 가 먼저 막아서 어댑터에 닿지 않는다 — 그러면 가드를 떼어도
   * 초록이라 아무것도 증명하지 못한다(실제로 뮤테이션 검증에서 그 공허함이 드러났다).
   * 그래서 **스키마가 통과하는 값**을 채우고, 남은 유일한 차단 사유가 가드가 되게 만든다.
   */
  function fillValidBasics(): void {
    fireEvent.change(screen.getByLabelText(lbl('쿠폰명')), { target: { value: '테스트 쿠폰' } });
    fireEvent.change(screen.getByLabelText(lbl('쿠폰 코드')), { target: { value: 'TEST10' } });
    fireEvent.change(screen.getByLabelText(lbl('할인 금액 (원)')), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('쿠폰 사용 기간 시작일'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('쿠폰 사용 기간 종료일'), {
      target: { value: '2026-08-31' },
    });
  }

  it('스키마가 통과해도 가드가 서 있으면 저장이 어댑터에 닿지 않는다', async () => {
    resetMemberTierCatalogLookup(); // 등급 목록을 모르는 상태 — 승급 시점이 성립하지 않는다
    const { container } = renderPage();
    fillValidBasics();
    fireEvent.change(select('발급 시점'), { target: { value: 'tier_up' } });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    if (form !== null) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getAllByText(/승급 대상 등급을 고를 수 없어요/).length).toBeGreaterThan(0);
    });
    expect(create).not.toHaveBeenCalled();
  });

  // 위 테스트가 '항상 막힌다' 로 공허해지지 않도록 하는 대조군 — 가드가 풀리면 실제로 저장된다
  it('가드가 풀리면 같은 제출이 어댑터에 닿는다', async () => {
    const { container } = renderPage();
    fillValidBasics();
    fireEvent.change(select('발급 시점'), { target: { value: 'tier_up' } });

    const form = container.querySelector('form');
    if (form !== null) fireEvent.submit(form);

    await waitFor(() => {
      expect(create).toHaveBeenCalled();
    });
  });
});

/* ── 이음매 미배선 ──────────────────────────────────────────────────────────── */

describe('등급 이음매가 미배선이면 성공을 흉내 내지 않는다', () => {
  beforeEach(() => {
    resetMemberTierCatalogLookup();
  });

  it("회원등급 대상: 빈 목록이 아니라 '고를 수 없다' 고 말한다", async () => {
    renderPage();
    await chooseTarget('member_grade');

    expect(screen.getByText(/회원 등급 목록을 불러오지 못했어요/)).not.toBeNull();
    expect(screen.queryByText('고를 수 있는 대상이 없어요. 먼저 대상을 등록해 주세요.')).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: '등록 — 대상 회원등급 목록을 불러오지 못했어요. 고를 수 없는 채로 저장하지 않아요.',
      }).disabled,
    ).toBe(true);
  });

  it('등급 승급 시점: 승급 대상 등급 셀렉트 대신 이유가 뜬다', async () => {
    renderPage();
    fireEvent.change(select('발급 시점'), { target: { value: 'tier_up' } });

    const trigger = screen.getByRole('region', { name: '발급 기준' });
    expect(within(trigger).queryByLabelText(lbl('승급 대상 등급'))).toBeNull();
    expect(within(trigger).getByText(/승급 대상 등급을 고를 수 없어요/)).not.toBeNull();

    // 카드의 안내와 저장 가드가 같은 사실을 말한다 — 하나만 말하면 다른 하나가 거짓이 된다
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: '등록 — 회원 등급 목록을 불러오지 못해 승급 대상 등급을 고를 수 없어요.',
      }).disabled,
    ).toBe(true);
  });
});

/* ── ④ 발급 시점별 조건 ─────────────────────────────────────────────────────── */

describe('발급 시점 — 필요한 것만 더 묻는다', () => {
  it("운영자 직접 발급은 조건 칸이 없고, 힌트가 '조건이 없어요' 라고 말한다", () => {
    renderPage();

    expect(screen.queryByLabelText(lbl('승급 대상 등급'))).toBeNull();
    expect(screen.queryByLabelText(lbl('생일 며칠 전 발급'))).toBeNull();
    expect(screen.getByText(/여기서 더 정할 조건이 없어요/)).not.toBeNull();
  });

  it('회원 가입 시·첫 구매도 조건 칸을 만들지 않는다', () => {
    renderPage();

    for (const value of ['signup', 'first_order']) {
      fireEvent.change(select('발급 시점'), { target: { value } });
      expect(screen.queryByLabelText(lbl('승급 대상 등급'))).toBeNull();
      expect(screen.queryByLabelText(lbl('생일 며칠 전 발급'))).toBeNull();
      expect(screen.getByText(/더 정할 조건이 없어요/)).not.toBeNull();
    }
  });

  it('등급 승급 시점은 등급 카탈로그의 기본 제공 등급만 고르게 한다', () => {
    renderPage();
    fireEvent.change(select('발급 시점'), { target: { value: 'tier_up' } });

    const labels = Array.from(select('승급 대상 등급').options).map((option) => option.textContent);
    expect(labels).toEqual(['일반회원', 'VIP', 'VVIP']);
    // 운영자가 추가한 등급은 조용히 빠지지 않는다 — 이름을 적어 사실을 말한다
    expect(screen.getByText(/골드 등급은 아직 발급 기준으로 고를 수 없어요/)).not.toBeNull();
  });

  it('생일은 일수를, 고객 다운로드는 기간을 묻는다', () => {
    renderPage();

    fireEvent.change(select('발급 시점'), { target: { value: 'birthday' } });
    expect(screen.getByLabelText(lbl('생일 며칠 전 발급'))).not.toBeNull();
    expect(screen.queryByLabelText(lbl('승급 대상 등급'))).toBeNull();

    fireEvent.change(select('발급 시점'), { target: { value: 'download' } });
    expect(screen.queryByLabelText(lbl('생일 며칠 전 발급'))).toBeNull();
    expect(screen.getAllByLabelText(/시작일|종료일/).length).toBeGreaterThan(0);
  });
});
