// 프로그램도 **같은 술어**로 잠긴다 — 상세의 리워드 금액 · 폼의 후원 금액 입력
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나] 운영자가 못박은 문장이 "프로그램 관리도 동일하게" 였다. 상품에만 배선하면
// 같은 사이트 안에서 상품은 '가격문의' 인데 프로그램은 금액을 그대로 노출하는 상태가 생긴다 —
// 결제창은 어느 쪽에서도 열리지 않으므로 프로그램 쪽이 거짓말을 하게 된다.
//
// [무엇이 잠기고 무엇이 안 잠기나] 잠기는 것은 **고객이 실제로 결제하는 금액**(리워드 금액)뿐이다.
// 목표 금액·모금액·달성률은 캠페인의 사실이지 고객이 지불하는 값이 아니라 그대로 남는다 —
// 그 숫자까지 가리면 운영자가 현황판을 읽을 수 없다.
//
// [세 상태] 연동됨(PG_ON) · 미사용(PG_OFF) · 값이 덜 참(PG_HALF).
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PAYMENT_SETTINGS,
  resetPaymentSettings,
  writePaymentSettings,
} from '../../shared/commerce/payment-settings';
import type { PaymentSettings } from '../../shared/commerce/payment-settings';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { OPERATOR_ROLE_ID } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';
import { getProgram } from './_shared/store';
import ProgramDetailPage from './ProgramDetailPage';
import ProgramFormPage from './ProgramFormPage';
import ProgramListPage from './ProgramListPage';

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

const PG_OFF: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;

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

/** 리워드 3종이 붙어 있고 진행 중인 프로그램 — 금액이 살아 있는 채로 잠기는 것을 본다 */
const SAVED = getProgram('pgm-1');

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

/** 리워드 표가 그려질 때까지 기다린다 — 상세는 스켈레톤에서 출발한다 */
async function renderDetail(): Promise<void> {
  renderAt(`/programs/${SAVED.id}`, '/programs/:id', <ProgramDetailPage />);
  await waitFor(
    () => {
      expect(screen.getByText(SAVED.rewards[0]?.title ?? '')).not.toBeNull();
    },
    { timeout: 8000 },
  );
}

const amountInput = (rewardTitle: string) =>
  screen.getByLabelText<HTMLInputElement>(`${rewardTitle} 후원 금액`);

/** 저장된 값이 실린 수정 폼 — 상세 조회가 끝날 때까지 기다린다(기본 1초로는 부족하다) */
async function renderEditForm(): Promise<void> {
  renderAt(`/programs/${SAVED.id}/edit`, '/programs/:id/edit', <ProgramFormPage />);
  await waitFor(
    () => {
      expect(amountInput(SAVED.rewards[0]?.title ?? '').value).not.toBe('0');
    },
    { timeout: 8000 },
  );
}

beforeEach(() => {
  // 폼은 canSubmit 이 없으면 403 화면을 그린다 — 이 파일이 보려는 축을 보려면 권한을 열어 둔다
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  resetPaymentSettings();
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

/* ── 상세 ────────────────────────────────────────────────────────────────── */

describe('프로그램 상세 — 리워드 금액은 연동 상태를 그린다', () => {
  it('연동됨: 리워드 금액을 그대로 그리고 잠금 안내가 없다', async () => {
    writePaymentSettings(PG_ON);
    await renderDetail();

    expect(screen.getByText('189,000원')).not.toBeNull();
    expect(screen.queryAllByText('가격문의')).toHaveLength(0);
    expect(screen.queryByText(/가격문의로 대체돼요/)).toBeNull();
  });

  it.each([
    ['미사용', PG_OFF],
    ['값이 덜 참', PG_HALF],
  ])('%s: 리워드 **전 줄**이 가격문의로 바뀌고 이유를 말한다', async (_label, settings) => {
    writePaymentSettings(settings);
    await renderDetail();

    expect(screen.getAllByText('가격문의')).toHaveLength(SAVED.rewards.length);
    expect(screen.queryByText('189,000원')).toBeNull();
    expect(screen.getByText(/가격문의로 대체돼요/)).not.toBeNull();
    // 결제가 없는 동안 이 프로그램에 실제로 들어오는 것은 후원이 아니라 문의다
    expect(screen.getByRole('link', { name: '문의 화면 열기' })).not.toBeNull();
  });

  it('잠겨도 목표·모금·달성률은 가려지지 않는다 — 현황판이 계속 읽혀야 한다', async () => {
    writePaymentSettings(PG_OFF);
    await renderDetail();

    // 목표·모금액은 금액 그대로 남고, 대체된 것은 리워드 줄뿐이다
    expect(screen.getAllByText('10,000,000원').length).toBeGreaterThan(0);
    expect(screen.getAllByText('14,320,000원').length).toBeGreaterThan(0);
    expect(screen.getAllByText('143%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('가격문의')).toHaveLength(SAVED.rewards.length);
  });
});

/* ── 목록 ────────────────────────────────────────────────────────────────── */

describe('프로그램 목록 — 대체할 금액이 없다', () => {
  /**
   * [겨냥을 분명히 한다] 이 목록의 금액 열은 **목표금액·모금액**뿐이고 둘 다 고객이 지불하는
   * 값이 아니다. 그래서 잠금 배너도 없고 대체도 없다 — '아무것도 안 했다' 가 아니라
   * '여기에는 대체할 값이 없다' 가 이 화면의 옳은 답이라는 것을 못박는다.
   */
  it.each([
    ['연동됨', PG_ON],
    ['미사용', PG_OFF],
  ])('%s: 목표금액은 그대로이고 가격문의로 바뀌는 칸이 없다', async (_label, settings) => {
    writePaymentSettings(settings);
    renderAt('/programs', '/programs', <ProgramListPage />);

    await waitFor(
      () => {
        expect(screen.getByText('10,000,000원')).not.toBeNull();
      },
      { timeout: 8000 },
    );
    expect(screen.queryAllByText('가격문의')).toHaveLength(0);
  });
});

/* ── 폼 ──────────────────────────────────────────────────────────────────── */

describe('프로그램 폼 — 후원 금액의 잠금과 값 보존', () => {
  it('연동됨: 후원 금액을 입력할 수 있고 잠금 안내가 없다', async () => {
    writePaymentSettings(PG_ON);
    await renderEditForm();

    for (const reward of SAVED.rewards) {
      expect(amountInput(reward.title).disabled).toBe(false);
    }
    expect(screen.queryByText(/가격문의로 대체돼요/)).toBeNull();
  });

  it.each([
    ['미사용', PG_OFF],
    ['값이 덜 참', PG_HALF],
  ])('%s: 후원 금액만 잠기고 나머지 칸은 계속 편집된다', async (_label, settings) => {
    writePaymentSettings(settings);
    await renderEditForm();

    const first = SAVED.rewards[0]?.title ?? '';
    expect(amountInput(first).disabled).toBe(true);
    // 결제가 없어도 '무엇을 주는가' 는 계속 다듬는 값이다 — 문의로 들어온 요청의 품목 명세가 된다
    expect(screen.getByLabelText<HTMLInputElement>(`${first} 리워드명`).disabled).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>(`${first} 설명`).disabled).toBe(false);
    expect(
      screen.getByLabelText<HTMLInputElement>(`${first} 수량 한정 (0 이면 무제한)`).disabled,
    ).toBe(false);
    // 목표 금액은 고객이 지불하는 값이 아니다 — 잠그면 캠페인 설계 자체가 막힌다
    expect(screen.getByLabelText<HTMLInputElement>(/^목표 금액\(원\)\s*\*?$/).disabled).toBe(false);

    expect(screen.getByText(/가격문의로 대체돼요/)).not.toBeNull();
    expect(screen.getByText(/입력해 둔 후원 금액은 지워지지 않고 그대로 보존돼요/)).not.toBeNull();
  });

  /**
   * [가장 조용히 깨지는 지점] 잠금이 금액을 0 으로 눕히는 구현이면 저장 한 번으로 리워드 값이
   * 전부 사라진다 — 그리고 화면은 잠겨 있으므로 아무도 눈치채지 못한다.
   */
  it.each([
    ['미사용', PG_OFF],
    ['값이 덜 참', PG_HALF],
  ])('%s: 잠겨 있어도 저장된 후원 금액이 칸에 그대로 남아 있다', async (_label, settings) => {
    writePaymentSettings(settings);
    await renderEditForm();

    for (const reward of SAVED.rewards) {
      expect(amountInput(reward.title).value).toBe(String(reward.amount));
    }
  });
});
