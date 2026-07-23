// 클레임 상세의 **실패가 보이는가** (렌더) — 순수 규칙만으로는 잡히지 않는 세 결함의 재현 경로
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 렌더까지 태우나]
// 세 결함은 전부 '규칙은 맞는데 화면이 그것을 쓰지 않는다' 는 성질이었다:
//   ① 환불 완료 버튼이 **폼의 드래프트** 상태로 잠기고, 저장은 **저장된** 상태를 보냈다
//      → 버튼은 열려 있는데 어댑터가 422 로 거절하는 '눌리는데 거부당하는 버튼'.
//   ② 그 422 를 그리는 자리가 교환 옵션 필드 하나뿐이라 취소·반품에서는 아무 표시도 없었다
//      → 버튼만 조용히 다시 활성화된다(EXC-07).
//   ③ 확인 다이얼로그가 확인 즉시 닫혀 실패를 되받지 못했다 → busy·error prop 이 죽은 배선
//      (FEEDBACK-02 의 '실패하면 남아서 재시도를 받는다').
//   ④ 실패가 떠도 **포커스는 눌렀던 버튼에 남았다** → 스크린리더 사용자는 실패를 모른다(A11Y-13).
//   ⑤ 400 은 필드 거절 경로를 타지 않아 `error.fields` 가 버려졌다 → 어느 칸이 틀렸는지 알 수 없다.
// 다섯 다 '어떤 노드가 화면에 있는가 · 포커스가 어디에 있는가' 의 문제라 순수 테스트로는 고정되지 않는다.
// 관용구는 shared/crud/form-permission.test.tsx 를 따른다(권한 시드 + 라우트 렌더).
//
// [실패는 지어내지 않는다] 422 는 스위치로 흉내 내지 않고 **도메인 규칙으로** 만든다: 반품 클레임의
// 주문 옵션이 상품에서 사라진 상태(unknown-origin)를 조회기에 심으면, 화면은 그것을 미리 알 수
// 없고(옵션 조회는 교환에서만 돈다) 완료 저장이 실제로 422 로 되돌아온다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerOrderLookup, resetOrderLookup } from '../../../shared/domain/order-ref';
import type { OrderRef } from '../../../shared/domain/order-ref';
import {
  registerReturnFeeLookup,
  resetReturnFeeLookup,
} from '../../../shared/domain/shipping-policy';
import { registerStockApplier, resetStockApplier } from '../../../shared/domain/stock';
import { registerVariantLookup, resetVariantLookup } from '../../../shared/domain/variant-ref';
import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import ClaimDetailPage from './ClaimDetailPage';
import { claimAdapter } from './data-source';
import { REFUND_CLAIM_INCOMPLETE, REFUND_TRANSITION_DONE, REFUND_UNSAVED_CLAIM } from './refund';
import {
  CLAIM_NOTE_MAX,
  CLAIM_TRANSITION_TERMINAL,
  stockIssueMessage,
  toClaimInput,
} from './types';

/** 픽스처 clm-3 — 반품 · 검수중 · 환불 미접수(prd-2 '화이트' 2개) */
const CLAIM_ID = 'clm-3';
/** 픽스처 clm-7 — 취소 · 접수 · 환불접수 · 비회원(적립금 0). 다중 위반 재현 전용이라 다른 테스트가 쓰지 않는다 */
const CONCURRENT_CLAIM_ID = 'clm-7';
const ROUTE = '/orders/claims/:id';

/** 서버가 400 으로 거절하는 길이 — 화면의 maxLength 는 사람의 키 입력만 막는다 */
const NOTE_OVER_MAX = CLAIM_NOTE_MAX + 1;

/** 재고 반영이 422 로 막히는 이유 — 주문된 옵션이 상품에서 사라졌다 */
const STOCK_422 = stockIssueMessage('unknown-origin');

/** 픽스처 응답 지연(400ms)이 있으므로 기본 1초로는 빠듯하다 */
const WAIT = { timeout: 4000 } as const;

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

const ORDERS: readonly OrderRef[] = [
  {
    id: 'ORD-20260708-0092',
    orderedAt: '2026-07-08T00:00:00.000Z',
    status: 'delivered',
    customerName: '이서준',
    total: 39800,
    canceled: false,
  },
];

function renderDetail(claimId: string = CLAIM_ID): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/orders/claims/${claimId}`]}>
          <Routes>
            <Route path={ROUTE} element={<ClaimDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 상세가 도착할 때까지 기다린다 — 그 전에는 '불러오는 중…' 뿐이다 */
async function loaded(): Promise<HTMLElement> {
  return screen.findByLabelText('처리 상태', {}, WAIT);
}

/**
 * 이 버튼이 잠겨 있는가.
 *
 * [jest-dom 매처를 쓰지 않는 이유] `toBeDisabled` 는 이 앱의 tsc 설정에서 타입이 잡히지 않는다 —
 * vitest.setup.ts 의 전역 확장이 tsc 의 시야 밖이다. 설정은 이 배치의 소유가 아니므로 표준
 * 단언으로 쓴다 (shared/crud/CrudTable.test.tsx · pages/logs/components/LogTable.test.tsx 규약).
 */
function isLocked(name: string): boolean {
  return screen.getByRole('button', { name }).hasAttribute('disabled');
}

beforeEach(() => {
  seedFullPermissions();
  registerOrderLookup(() => ORDERS);
  // 주문된 '화이트' 가 상품에서 사라졌다 — 회수분을 입고할 SKU 를 찾을 수 없다(unknown-origin)
  registerVariantLookup((productId) =>
    productId === 'prd-2'
      ? [{ id: 'p2-b', sku: 'NVA-TEE-014-블루', optionValues: ['블루'], stock: 7 }]
      : null,
  );
  registerStockApplier(() => undefined);
  // 정책을 모르면 반품배송비 입력이 빈 칸이 되고, 그 자체가 환불 완료를 막는다 —
  // 이 테스트가 보려는 것은 그 잠금이 아니므로 정책을 배선해 둔다.
  registerReturnFeeLookup(() => 3000);
});

afterEach(() => {
  resetOrderLookup();
  resetVariantLookup();
  resetStockApplier();
  resetReturnFeeLookup();
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('환불 완료 버튼은 저장이 보낼 값으로 잠긴다 (결함 1)', () => {
  it('저장하지 않은 채 상태만 완료로 바꿔도 버튼은 열리지 않는다 — 예전에는 열리고 422 였다', async () => {
    renderDetail();
    const statusSelect = await loaded();

    // 편집 전: 저장된 상태(검수중)의 진짜 사유를 말한다
    expect(isLocked('환불 완료 처리')).toBe(true);
    expect(screen.getByText(REFUND_CLAIM_INCOMPLETE)).not.toBeNull();

    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    // 편집 후: 여전히 잠겨 있고, 무엇을 하면 되는지로 사유가 바뀐다
    expect(isLocked('환불 완료 처리')).toBe(true);
    expect(screen.getByText(REFUND_UNSAVED_CLAIM)).not.toBeNull();
  });
});

describe('취소·반품의 422 도 보인다 · 다이얼로그는 실패해도 남는다 (결함 2 · 3)', () => {
  it('확인 다이얼로그가 실패를 되받아 사유를 보이고 재시도를 기다린다', async () => {
    renderDetail();
    const statusSelect = await loaded();
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    // 재고를 움직이는 저장이라 확인을 한 번 받는다
    fireEvent.click(screen.getByRole('button', { name: '처리 저장' }));
    expect(screen.getByText('반품 재고 반영')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '재고 반영' }));

    // 실패했다 — 다이얼로그는 닫히지 않고 사유를 보여 준다(FEEDBACK-02)
    await waitFor(() => {
      expect(screen.getAllByText(STOCK_422).length).toBeGreaterThan(0);
    }, WAIT);
    expect(screen.getByText('반품 재고 반영')).not.toBeNull();
    // 확인 버튼이 되살아나 재클릭이 곧 재시도다 — busy·error prop 이 살아 있다는 뜻이다
    expect(isLocked('재고 반영')).toBe(false);
  });

  it('다이얼로그를 닫아도 사유가 화면에 남는다 — 반품에는 인라인 자리가 없다', async () => {
    renderDetail();
    const statusSelect = await loaded();
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    fireEvent.click(screen.getByRole('button', { name: '처리 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '재고 반영' }));

    await waitFor(() => {
      expect(screen.getAllByText(STOCK_422).length).toBeGreaterThan(0);
    }, WAIT);

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    // 다이얼로그는 닫혔는데 실패는 남아 있다 — 예전에는 여기서 아무 문구도 없었다(EXC-07)
    await waitFor(() => {
      expect(screen.queryByText('반품 재고 반영')).toBeNull();
    }, WAIT);
    expect(screen.getByText(STOCK_422)).not.toBeNull();
  });
});

/**
 * [결함 a·c 회귀] 실패가 **포커스도 옮기는가** · 400 이 어느 칸인지 말하는가.
 *
 * 예전에는 배너가 떠도 포커스가 눌렀던 '처리 저장' 버튼에 그대로 남았다 — 스크린리더 사용자는
 * 저장이 실패했다는 사실 자체를 듣지 못한 채 서 있었다(A11Y-13). 그리고 400 은 필드 거절 경로를
 * 타지 않아, 서버가 `error.fields` 로 어느 칸이 틀렸는지 알려 주는데도 화면은 그것을 버렸다.
 *
 * [왜 500자를 넘길 수 있나 — 지어낸 상황이 아니다] textarea 의 `maxLength` 는 **사람의 키 입력**만
 * 막는다. 프로그램적으로 채워진 값(자동입력·브라우저 확장·구형 클라이언트)은 그대로 제출되고,
 * 그것을 거르는 것은 서버의 일이다(BE-044 §6.1 의 400 `VALIDATION_FAILED`).
 */
describe('저장 실패는 포커스를 옮긴다 · 400 도 어느 칸인지 말한다 (결함 a · c)', () => {
  it('400 이 지목한 칸의 사유가 배너에 뜨고 포커스가 그 배너로 간다', async () => {
    renderDetail();
    await loaded();

    const note = screen.getByLabelText('처리 메모');
    fireEvent.change(note, { target: { value: 'ㄱ'.repeat(NOTE_OVER_MAX) } });

    // 재고를 움직이지 않는 저장이라 확인 다이얼로그가 끼지 않는다 — 실패가 곧장 카드 배너로 온다
    const save = screen.getByRole('button', { name: '처리 저장' });
    save.focus();
    fireEvent.click(save);

    const banner = await screen.findByRole('alert', {}, WAIT);
    // 서버가 지목한 칸(adminNote)의 사유가 그대로 읽힌다. 400 본문의 top-level 문구는 일반문이라
    // (`입력값을 확인해 주세요.`) `error.fields` 를 읽지 않으면 이 문장이 나올 수 없다 — 결함 c 의 반증점.
    expect(banner.textContent).toContain(`${String(CLAIM_NOTE_MAX)}자를 넘을 수 없어요`);
    // 필드 거절은 예상외 실패가 아니다 — 참조 코드를 붙여 '장애처럼' 보이게 하지 않는다(EXC-20)
    expect(banner.textContent).not.toContain('오류 코드');
    // 포커스가 배너로 옮겨 온다 — 예전에는 눌렀던 버튼에 그대로 남았다
    await waitFor(() => {
      expect(document.activeElement).toBe(banner);
    }, WAIT);
  });

  it('확인 다이얼로그가 떠 있으면 포커스를 밖으로 끌어내지 않는다 — 트랩이 깨진다', async () => {
    renderDetail();
    const statusSelect = await loaded();
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    fireEvent.click(screen.getByRole('button', { name: '처리 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '재고 반영' }));

    await waitFor(() => {
      expect(screen.getAllByText(STOCK_422).length).toBeGreaterThan(0);
    }, WAIT);

    // 사유는 다이얼로그 안 danger 배너(role=alert)가 즉시 읽어 준다 — 포커스는 모달 안에 남는다
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

/**
 * [결함 b 회귀 — 렌더까지] 한 응답에 실린 위반이 **전부** 화면에 남는가.
 *
 * ┌ 왜 이 시나리오여야 했나 ─────────────────────────────────────────────────┐
 * │ 이 화면은 모든 가드를 어댑터와 **같은 술어**로 미러한다(그게 설계다). 그래서   │
 * │ UI 조작만으로는 위반 두 개를 동시에 만들 수 없다 — 두 번째를 만들려는 버튼이  │
 * │ 이미 잠겨 있다. 여러 위반이 한꺼번에 오는 것은 **서버 쪽 사실**이다.          │
 * │                                                                          │
 * │ `?status=<scope>:save:422` 재현 스위치로는 이 형태를 만들 수 없다: 픽스처     │
 * │ 트랜스포트는 응답 본문을 `{ message }` 하나로 만들고(shared/api/client.ts),  │
 * │ 응답 인터셉터도 그 문구만 HttpError 로 옮긴다 — **violations 를 실을 통로가   │
 * │ 없다.** 스위치가 만드는 422 는 언제나 위반 0건이라 배너 한 줄로 수렴하고,     │
 * │ 그래서 '첫 위반만 남는' 결함을 반증하지 못한다.                              │
 * │                                                                          │
 * │ 그래서 흉내가 아니라 **실제로 일어나는 실패**를 쓴다: 내가 화면을 연 뒤 다른   │
 * │ 운영자가 같은 클레임을 완료·환불완료로 저장한 경우다. 내 문서는 낡았고, 그것을 │
 * │ 그대로 보내면 상태 축과 환불 축이 **동시에** 거꾸로 간다 — 어댑터는 두 위반을 │
 * │ 한 응답에 싣는다(같은 조합을 claims.test.ts 가 어댑터 경계에서 이미 고정한다).│
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 이 클레임(clm-7)은 취소·비회원이라 완료가 재고도 적립금 원장도 건드리지 않는다 — 다른 배선을
 * 끌어들이지 않고 '먼저 저장한 다른 운영자' 하나만 재현한다.
 */
describe('한 응답의 위반이 전부 화면에 남는다 — 첫 위반만 남지 않는다 (결함 b)', () => {
  /** 이 주문이 있어야 취소 완료가 성립한다(출고 전) — 전역 시드에는 clm-3 의 주문뿐이다 */
  const CANCEL_ORDER: OrderRef = {
    id: 'ORD-20260719-0003',
    orderedAt: '2026-07-19T00:00:00.000Z',
    status: 'pending',
    customerName: '남기훈',
    total: 103200,
    canceled: false,
  };

  /** 다른 운영자가 먼저 저장한다 — mock 이 아니라 같은 저장소를 실제로 바꾼다 */
  async function otherOperatorCompletes(): Promise<void> {
    const signal = new AbortController().signal;
    const current = await claimAdapter.fetchOne(CONCURRENT_CLAIM_ID, signal);
    await claimAdapter.update(CONCURRENT_CLAIM_ID, {
      ...toClaimInput(current),
      status: 'completed',
      refund: { ...current.refund, status: 'completed' },
    });
  }

  it('상태·환불이 함께 거절되면 두 사유가 모두 배너에 있다', async () => {
    registerOrderLookup(() => [...ORDERS, CANCEL_ORDER]);
    renderDetail(CONCURRENT_CLAIM_ID);
    await loaded();

    await otherOperatorCompletes();

    // 내 화면은 그 사실을 모른다 — 메모 한 줄을 고쳐 저장한다(재고를 움직이지 않아 확인도 없다)
    fireEvent.change(screen.getByLabelText('처리 메모'), { target: { value: '고객 재통화' } });
    fireEvent.click(screen.getByRole('button', { name: '처리 저장' }));

    const banner = await screen.findByRole('alert', {}, WAIT);
    // 인라인 자리가 없는 위반(status · refundStatus)은 **전부** 배너로 수렴한다
    expect(banner.textContent).toContain(CLAIM_TRANSITION_TERMINAL);
    // 예전에는 violations[0] 만 읽어 이 두 번째 사유가 조용히 사라졌다 — 결함 b 의 반증점
    expect(banner.textContent).toContain(REFUND_TRANSITION_DONE);
    // 필드 거절은 예상외 실패가 아니다 — 참조 코드를 붙이지 않는다(EXC-20)
    expect(banner.textContent).not.toContain('오류 코드');

    // 교환 옵션 필드가 없는 화면이라 인라인으로 샌 위반도 없다
    expect(screen.queryByLabelText('교환 옵션')).toBeNull();
  });
});
