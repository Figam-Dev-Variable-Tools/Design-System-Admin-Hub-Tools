// 청구 상세의 **동시 저장이 입금을 지우지 않는가** (어댑터 + 렌더)
//
// ─────────────────────────────────────────────────────────────────────────────
// [재현 경로 — 지어낸 상황이 아니다]
// 이 화면의 저장은 입금 기록이든 비고 한 줄이든 **문서 한 벌을 통째로** 보낸다. 그래서 두 운영자가
// 같은 청구를 열어 두면 이런 일이 실제로 일어났다:
//   ① A 가 입금을 기록한다 → 저장된다
//   ② B 의 화면은 그 전에 열렸다. B 의 문서에는 그 입금이 없다.
//   ③ B 가 저장한다 → 문서가 갈리면서 **A 의 입금이 흔적 없이 사라지고 성공 토스트가 뜬다.**
// 입금은 회계 기록이라 되돌릴 수단이 없다(./types 규칙 ①).
//
// [왜 어댑터와 렌더를 함께 태우나] 거절만으로는 절반이다 — 409 를 받은 화면이 무엇을 보여 주는지가
// 나머지 절반이다. 이웃(shared/crud 의 FormConflictDialog)과 같은 관용구로 '최신 내용 불러오기 /
// 이어서 편집' 을 묻고, 그동안 **방금 친 입력을 버리지 않는다.**
//
// [A 는 흉내가 아니다] 다른 운영자의 저장은 mock 이 아니라 **같은 저장소**(billingAdapter)로 실제로
// 일어난다 — 화면이 읽는 그 문서를 정말로 바꾼다. 관용구는 pages/orders/claims 의 렌더 테스트와 같다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import BillingDetailPage from './BillingDetailPage';
import { billingAdapter } from './data-source';
import { BILLING_PAYMENT_LOST, toBillingInput } from './types';
import type { BillingPayment } from './types';

const ROUTE = '/sales/billing/:id';

/** 픽스처 응답 지연(400ms)이 있으므로 기본 1초로는 빠듯하다 */
const WAIT = { timeout: 4000 } as const;

/** A 가 남긴 입금 — 이 메모가 화면에서 사라지면 회계 기록이 사라진 것이다 */
const OTHER_PAYMENT: BillingPayment = {
  id: 'bp-other',
  paidOn: '2026-07-20',
  amount: 500000,
  memo: '다른 관리자 기록분',
};

function seedFullPermissions(): void {
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

/** 다른 관리자가 입금을 기록한다 — 저장소를 실제로 바꾼다(내 화면은 그 사실을 모른다) */
async function otherAdminRecordsPayment(id: string, payment: BillingPayment): Promise<void> {
  const signal = new AbortController().signal;
  const current = await billingAdapter.fetchOne(id, signal);
  await billingAdapter.update(id, {
    ...toBillingInput(current),
    payments: [...current.payments, payment],
  });
}

function renderDetail(id: string): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/sales/billing/${id}`]}>
          <Routes>
            <Route path={ROUTE} element={<BillingDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * 상세가 도착할 때까지 기다린다 — 그 전에는 '불러오는 중…' 뿐이다.
 *
 * 라벨을 정규식으로 찾는 이유: 필수 필드의 <label> 에는 장식 마커(' *')가 붙어 있어 완전일치가
 * 어긋난다(FormField 의 required 마커는 aria-hidden 이지만 라벨 텍스트에는 남는다).
 */
async function loaded(): Promise<HTMLElement> {
  return screen.findByLabelText(/^입금액/, {}, WAIT);
}

beforeEach(() => {
  seedFullPermissions();
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('저장소는 남의 입금을 지우는 저장을 받지 않는다 (409)', () => {
  it('내가 읽은 뒤 기록된 입금은 내 저장으로 사라지지 않는다', async () => {
    const signal = new AbortController().signal;
    // B 가 화면을 연 시점의 문서 — 아직 입금이 하나(bp-1)뿐이다
    const stale = await billingAdapter.fetchOne('bl-1', signal);

    await otherAdminRecordsPayment('bl-1', OTHER_PAYMENT);

    // B 가 비고만 고쳐 저장한다 — 예전에는 이 한 번으로 A 의 입금이 사라졌다
    const failure: unknown = await billingAdapter
      .update('bl-1', { ...toBillingInput(stale), note: '잔금 확인 요청' })
      .then(() => null)
      .catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(BILLING_PAYMENT_LOST);

    // 거절됐으므로 A 의 입금도, B 가 덮으려던 비고도 그대로다(부분 적용이 없다)
    const after = await billingAdapter.fetchOne('bl-1', signal);
    expect(after.payments.map((payment) => payment.id)).toEqual(['bp-1', 'bp-other']);
    expect(after.note).toBe(stale.note);
  });
});

describe('409 를 받은 화면 — 충돌을 묻고 입력을 버리지 않는다 (EXC-04)', () => {
  it('입금확인이 거절되면 충돌 다이얼로그가 뜨고, 불러오면 남의 입금이 보인다', async () => {
    renderDetail('bl-2');
    const amountInput = await loaded();

    // 화면이 뜬 **뒤** 다른 관리자가 입금을 기록한다 — 내 문서는 이제 낡았다
    await otherAdminRecordsPayment('bl-2', OTHER_PAYMENT);

    fireEvent.change(amountInput, { target: { value: '400000' } });
    fireEvent.change(screen.getByLabelText('입금자명 · 메모'), { target: { value: '내 기록분' } });
    fireEvent.click(screen.getByRole('button', { name: '입금확인 기록' }));

    // 조용히 성공하지 않는다 — 무엇이 충돌했는지 말하고 무엇을 할지 묻는다
    const dialog = await screen.findByRole('dialog', {}, WAIT);
    expect(dialog.textContent).toContain('다른 관리자가 입금을 기록했어요');
    expect(screen.getByRole('button', { name: '최신 내용 불러오기' })).not.toBeNull();

    // 입력은 살아 있다 — 예전에는 호출 직후에 비워 다시 쳐야 했다
    expect(screen.getByDisplayValue('400000')).not.toBeNull();
    expect(screen.getByDisplayValue('내 기록분')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '최신 내용 불러오기' }));

    // A 의 입금이 화면에 있다. 내 기록은 적용되지 않았다 — 지워진 것도, 겹쳐 쓴 것도 없다
    await waitFor(() => {
      expect(screen.getByText(OTHER_PAYMENT.memo)).not.toBeNull();
    }, WAIT);
    expect(screen.queryByText('내 기록분')).toBeNull();
  });
});
