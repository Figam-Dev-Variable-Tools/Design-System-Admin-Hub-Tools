// 가격 표시는 **저장값이 아니라 연동 상태의 결과**다 — 상품 목록·폼이 화면에서 실제로 그런가
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 순수 테스트로 충분하지 않은가]
// shared/commerce/pg-axes.test.ts 는 `resolvePriceDisplay` 가 무엇을 돌려주는지 고정한다. 그런데
// 이 배선이 실제로 틀릴 수 있는 자리는 그 위다:
//   · 목록의 금액 칸이 **전 행** 대체되는가 (한 행만 고쳐 놓고 나머지를 잊는 결함)
//   · 폼의 판매가·할인·과세가 **정말 잠기는가** (규칙은 옳은데 disabled 배선이 빠질 수 있다)
//   · 잠긴 채로 **저장된 금액이 화면에 그대로 살아 있는가** ← 가장 조용히 깨지는 지점
//   · 세 화면이 **같은 문장**으로 이유를 말하는가 (화면마다 다시 쓰면 서로 다른 말을 한다)
//   · 없앤 라디오('가격 표시 방식')가 되살아나지 않는가
//
// [세 상태] 연동됨(PG_ON) · 미사용(PG_OFF) · 값이 덜 참(PG_HALF). 운영자가 말한 세 갈래 그대로다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PAYMENT_SETTINGS,
  resetPaymentSettings,
  writePaymentSettings,
} from '../../../shared/commerce/payment-settings';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { OPERATOR_ROLE_ID } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import { getProduct } from '../_shared/store';
import ProductFormPage from './ProductFormPage';
import ProductListPage from './ProductListPage';

/** 연동됨 — 공개 값과 저장된 비밀이 모두 채워져 결제창을 열 수 있다 */
const PG_ON: PaymentSettings = {
  ...DEFAULT_PAYMENT_SETTINGS,
  usePg: true,
  connection: {
    mode: 'direct',
    provider: 'toss',
    publicValues: { clientKey: 'live_ck_1234', mid: 'tosspayments-1234' },
    storedSecrets: ['secretKey'],
  },
};

/** 미사용 — 운영자가 PG 를 쓰지 않기로 정했다(이 앱의 기본 상태) */
const PG_OFF: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;

/** 값이 덜 참 — 켜 두었지만 필수 자격증명이 비어 있다(fail-closed) */
const PG_HALF: PaymentSettings = {
  ...DEFAULT_PAYMENT_SETTINGS,
  usePg: true,
  connection: {
    mode: 'direct',
    provider: 'toss',
    publicValues: { clientKey: '  ', mid: '  ' },
    storedSecrets: [],
  },
};

/**
 * 금액이 살아 있는 채로 잠기는 픽스처 — 판매가 45,000원 · 정률 15% 가 저장돼 있다.
 * 잠금이 값을 지우는 구현이면 이 상수를 쓰는 단언들이 곧바로 깨진다.
 */
const SAVED = getProduct('prd-5');

/**
 * 라벨 이름 매처 — FormField 의 필수 마커(' *')는 aria-hidden 장식이지만 label 의 textContent 에는
 * 남는다. 문자열로 정확히 찾으면 필수 필드만 조용히 안 잡힌다.
 */
const REGEXP_META = /[.*+?^${}()|[\]\\]/g;
const lbl = (name: string): RegExp =>
  new RegExp('^' + name.replace(REGEXP_META, '\\$&') + '\\s*\\*?$');

function renderAt(path: string, pattern: string, element: React.ReactElement) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const renderList = () => renderAt('/products', '/products', <ProductListPage />);

/**
 * 저장된 값이 실린 수정 폼 — 상세 조회(어댑터 지연)가 끝날 때까지 기다린다.
 *
 * 기본 대기(1초)로는 부족하다: 목록·카테고리·쿠폰 조회가 함께 도는 화면이라 CI 의 느린 회차에서
 * 로드 전에 단언이 서고, 그러면 '값이 비어 있다' 는 잘못된 실패가 난다.
 */
async function renderEditForm(): Promise<void> {
  renderAt('/products/prd-5/edit', '/products/:id/edit', <ProductFormPage />);
  await waitFor(
    () => {
      expect(screen.getByLabelText<HTMLInputElement>(lbl('판매가 (원)')).value).not.toBe('');
    },
    { timeout: 8000 },
  );
}

const priceInput = () => screen.getByLabelText<HTMLInputElement>(lbl('판매가 (원)'));
const discountInput = () => screen.getByLabelText<HTMLInputElement>(lbl('할인율 (%)'));
const discountTypeSelect = () => screen.getByLabelText<HTMLSelectElement>(lbl('할인 방식'));
const taxSwitch = () => screen.getByRole<HTMLButtonElement>('switch', { name: '과세 상품 여부' });

beforeEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  resetPaymentSettings();
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

/* ── 목록 ────────────────────────────────────────────────────────────────── */

describe('상품 목록 — 금액 칸은 연동 상태를 그린다', () => {
  it('연동됨: 금액을 그대로 그리고 잠금 안내가 없다', async () => {
    writePaymentSettings(PG_ON);
    renderList();

    // 129,000원 − 20% = 103,200원 (할인 반영 최종가)
    await waitFor(() => {
      expect(screen.getByText('103,200원')).not.toBeNull();
    });
    expect(screen.queryAllByText('가격문의')).toHaveLength(0);
    expect(screen.queryByText(/가격문의로 대체돼요/)).toBeNull();
    // 주문이 들어오는 상태라 재고 열이 서 있다
    expect(screen.getByRole('columnheader', { name: '재고' })).not.toBeNull();
  });

  it('미사용: 금액이 이미 설정된 행까지 **전부** 가격문의로 바뀐다', async () => {
    writePaymentSettings(PG_OFF);
    renderList();

    await waitFor(() => {
      expect(screen.getAllByText('가격문의').length).toBeGreaterThan(0);
    });
    // 표의 행 수만큼 — 한 행만 고치고 나머지를 잊는 결함을 막는다
    const rows = screen.getAllByRole('row').length - 1; // 헤더 한 줄 제외
    expect(screen.getAllByText('가격문의')).toHaveLength(rows);
    expect(screen.queryByText('103,200원')).toBeNull();
    // 재고 열은 사라지고 그 자리에 문의 건수가 선다
    expect(screen.queryByRole('columnheader', { name: '재고' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: '문의' })).not.toBeNull();
  });

  it('값이 덜 참: 켜 두었어도 가격문의이고, 무엇이 비었는지 이름으로 짚는다', async () => {
    writePaymentSettings(PG_HALF);
    renderList();

    await waitFor(() => {
      expect(screen.getAllByText('가격문의').length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/시크릿 키/)).not.toBeNull();
  });

  it('잠금 안내는 **한 장**이고, 사유는 결제 설정이 낸 문장 그대로다', async () => {
    writePaymentSettings(PG_OFF);
    renderList();

    await waitFor(() => {
      expect(screen.getAllByText('가격문의').length).toBeGreaterThan(0);
    });
    // 금액 대체와 재고 열 교체는 같은 사실의 두 결과라 배너가 둘이면 원인이 둘로 읽힌다
    expect(screen.getAllByRole('link', { name: '결제 설정 열기' })).toHaveLength(1);
    expect(
      screen.getByText(/PG 결제를 쓰지 않도록 설정되어 있어 모든 금액이 가격문의로 대체돼요/),
    ).not.toBeNull();
    // 결제가 없는 동안 실제로 쌓이는 곳으로 보낸다
    expect(screen.getByRole('link', { name: '문의 화면 열기' })).not.toBeNull();
  });
});

/* ── 폼 ──────────────────────────────────────────────────────────────────── */

describe('상품 폼 — 금액 칸의 잠금과 값 보존', () => {
  it('연동됨: 금액·할인·과세를 입력할 수 있고 잠금 안내가 없다', async () => {
    writePaymentSettings(PG_ON);
    await renderEditForm();

    expect(priceInput().disabled).toBe(false);
    expect(discountTypeSelect().disabled).toBe(false);
    expect(taxSwitch().disabled).toBe(false);
    expect(screen.queryByText(/가격문의로 대체돼요/)).toBeNull();
  });

  it.each([
    ['미사용', PG_OFF],
    ['값이 덜 참', PG_HALF],
  ])('%s: 금액·할인·과세가 잠기고 왜 잠겼는지 말한다', async (_label, settings) => {
    writePaymentSettings(settings);
    await renderEditForm();

    expect(priceInput().disabled).toBe(true);
    expect(discountTypeSelect().disabled).toBe(true);
    expect(discountInput().disabled).toBe(true);
    expect(taxSwitch().disabled).toBe(true);

    // 사유·다음 행동·값 보존 약속을 한 벌로 말한다(PgLockNotice)
    expect(screen.getByText(/가격문의로 대체돼요/)).not.toBeNull();
    expect(
      screen.getByText(/입력한 판매가·할인·과세 구분은 지워지지 않고 그대로 보존돼요/),
    ).not.toBeNull();
  });

  /**
   * [이 파일에서 가장 중요한 단언]
   * 잠금이 값을 **지우는** 구현이면(0 으로 눕히거나 빈 문자열로 바꾸면) 운영자는 연동을 마친 뒤
   * 예전 판매가를 기억으로 복원해야 한다. 그래서 잠긴 상태의 화면에 저장값이 그대로 실려 있는지를
   * 못박는다 — 픽스처의 값을 하드코딩하지 않고 저장소에서 읽어 비교한다.
   */
  it.each([
    ['미사용', PG_OFF],
    ['값이 덜 참', PG_HALF],
  ])('%s: 잠겨 있어도 저장된 판매가·할인율이 칸에 그대로 남아 있다', async (_label, settings) => {
    writePaymentSettings(settings);
    await renderEditForm();

    expect(priceInput().value).toBe(String(SAVED.pricing.price));
    expect(discountInput().value).toBe(String(SAVED.pricing.discountValue));
    expect(discountTypeSelect().value).toBe(SAVED.pricing.discountType);
    expect(taxSwitch().getAttribute('aria-checked')).toBe(String(SAVED.pricing.taxable));
  });

  it('연동을 마치면 잠겨 있던 값이 그대로 편집 가능해진다 — 되살아나는 것이 같은 값이다', async () => {
    writePaymentSettings(PG_ON);
    await renderEditForm();

    expect(priceInput().value).toBe(String(SAVED.pricing.price));
    expect(discountInput().value).toBe(String(SAVED.pricing.discountValue));
  });

  /**
   * [겨냥을 옮긴 단언] 예전에는 '가격 표시' 라디오와 '가격 대체 문구' 입력을 지키는 테스트가 있었다.
   * 그 전제(상품마다 고른다)가 사라졌으므로 **되살아나지 않는 것**을 지키게 겨냥을 옮긴다.
   */
  it.each([
    ['연동됨', PG_ON],
    ['미사용', PG_OFF],
  ])("%s: '가격 표시' 라디오와 대체 문구 입력은 어느 상태에서도 없다", async (_label, settings) => {
    writePaymentSettings(settings);
    await renderEditForm();

    expect(screen.queryByRole('radiogroup', { name: '가격 표시 방식' })).toBeNull();
    expect(screen.queryByLabelText(lbl('가격 대체 문구'))).toBeNull();
    // 좌측 구획 목차도 그 축을 더 이상 세지 않는다 — 구획은 남고 필드만 줄었다
    const rail = screen.getByRole('navigation', { name: '상품 폼 구획 이동' });
    expect(within(rail).getByText('가격 · 할인')).not.toBeNull();
  });
});
