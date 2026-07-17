// 교환/반품 동작 회귀 테스트 — 필터·검색·정렬 + 교환 재고 규칙(유효성·이동 계획·적용)(순수)
//   + 완료 처리의 재고 반영(어댑터 — 상품 저장소까지 실제로 움직이는지)
import { describe, expect, it } from 'vitest';

import { getProduct } from '../_shared/store';
import type { ProductVariant } from '../_shared/store';
import { returnAdapter } from './data-source';
import {
  applyMovements,
  filterByStatus,
  findVariant,
  isStockApplied,
  movesStock,
  optionLabel,
  planStockMovements,
  searchReturns,
  sortReturns,
  stockIssueMessage,
  toReturnInput,
  validateStockPlan,
} from './types';
import type { ReturnRequest, StockMovement } from './types';

const AT = '2026-07-16T00:00:00.000Z';

/** 색상×사이즈 2축 SKU — 상품 픽스처(prd-1)와 같은 모양 */
const variants: readonly ProductVariant[] = [
  { id: 'v1', sku: 'P-블랙-M', optionValues: ['블랙', 'M'], addPrice: 0, stock: 8, soldOut: false },
  { id: 'v2', sku: 'P-블랙-L', optionValues: ['블랙', 'L'], addPrice: 0, stock: 3, soldOut: false },
  {
    id: 'v3',
    sku: 'P-베이지-M',
    optionValues: ['베이지', 'M'],
    addPrice: 0,
    stock: 0,
    soldOut: true,
  },
];

function returnOf(overrides: Partial<ReturnRequest> & { id: string }): ReturnRequest {
  return {
    orderNo: 'ORD-1',
    productId: 'prd-1',
    productName: '상품',
    customer: '김**',
    kind: 'exchange',
    optionValues: ['블랙', 'M'],
    exchangeOptionValues: [],
    reason: '사이즈 교환',
    reasonDetail: '',
    quantity: 1,
    refundAmount: 0,
    requestedAt: '2026-07-12',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    adminNote: '',
    ...overrides,
  };
}

describe('옵션 표기 · SKU 조회(순수)', () => {
  it('옵션 조합은 슬래시로 잇는다', () => {
    expect(optionLabel(['블랙', 'M'])).toBe('블랙 / M');
  });
  it('옵션 없는 상품은 단일 상품으로 표기한다', () => {
    expect(optionLabel([])).toBe('단일 상품');
  });
  it('값과 순서가 모두 같아야 같은 SKU 다', () => {
    expect(findVariant(variants, ['블랙', 'M'])?.sku).toBe('P-블랙-M');
    expect(findVariant(variants, ['M', '블랙'])).toBeUndefined();
    expect(findVariant(variants, ['블랙'])).toBeUndefined();
  });
});

describe('재고 반영 판정(순수)', () => {
  it('완료 상태에서만 재고가 움직인다', () => {
    expect(movesStock('completed')).toBe(true);
    expect(movesStock('inspecting')).toBe(false);
    expect(movesStock('rejected')).toBe(false);
  });
  it('stockAppliedAt 이 있으면 이미 반영된 요청이다(중복 반영 방지 키)', () => {
    expect(isStockApplied({ stockAppliedAt: '' })).toBe(false);
    expect(isStockApplied({ stockAppliedAt: AT })).toBe(true);
  });
});

describe('교환/반품 재고 유효성(순수)', () => {
  it('반품은 주문 옵션만 있으면 통과한다', () => {
    expect(validateStockPlan(returnOf({ id: 'a', kind: 'return' }), variants)).toBeNull();
  });
  it('주문 옵션이 상품에 없으면 입고 대상을 못 찾는다', () => {
    const request = returnOf({ id: 'a', kind: 'return', optionValues: ['없는색', 'M'] });
    expect(validateStockPlan(request, variants)).toBe('unknown-origin');
  });
  it('교환인데 옵션 미선택이면 막는다', () => {
    expect(validateStockPlan(returnOf({ id: 'a' }), variants)).toBe('no-option');
  });
  it('교환 옵션이 상품에 없으면 막는다', () => {
    const request = returnOf({ id: 'a', exchangeOptionValues: ['없는색', 'L'] });
    expect(validateStockPlan(request, variants)).toBe('unknown-option');
  });
  it('교환 옵션 재고가 수량보다 적으면 교환 불가다', () => {
    const request = returnOf({ id: 'a', exchangeOptionValues: ['베이지', 'M'] });
    expect(validateStockPlan(request, variants)).toBe('insufficient-stock');
  });
  it('재고가 수량과 같으면 통과한다(경계)', () => {
    const request = returnOf({ id: 'a', exchangeOptionValues: ['블랙', 'L'], quantity: 3 });
    expect(validateStockPlan(request, variants)).toBeNull();
  });
  it('재고가 수량보다 하나 모자라면 막는다(경계)', () => {
    const request = returnOf({ id: 'a', exchangeOptionValues: ['블랙', 'L'], quantity: 4 });
    expect(validateStockPlan(request, variants)).toBe('insufficient-stock');
  });
  it('위반마다 다른 복구 안내를 준다', () => {
    expect(stockIssueMessage('no-option')).toContain('선택');
    expect(stockIssueMessage('insufficient-stock')).toContain('재고');
  });
});

describe('재고 이동 계획(순수)', () => {
  it('반품은 회수분 입고 한 건이다', () => {
    const moves = planStockMovements(returnOf({ id: 'a', kind: 'return' }), variants, AT);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ direction: 'in', sku: 'P-블랙-M', quantity: 1 });
  });
  it('교환은 회수분 입고 + 재발송분 출고 두 건이다', () => {
    const request = returnOf({ id: 'a', exchangeOptionValues: ['블랙', 'L'] });
    const moves = planStockMovements(request, variants, AT);
    expect(moves.map((move) => [move.direction, move.sku, move.quantity])).toEqual([
      ['in', 'P-블랙-M', 1],
      ['out', 'P-블랙-L', 1],
    ]);
  });
  it('수량이 여러 개면 그만큼 움직인다', () => {
    const request = returnOf({ id: 'a', kind: 'return', quantity: 2 });
    expect(planStockMovements(request, variants, AT)[0]?.quantity).toBe(2);
  });
  it('이동에는 그 시점의 옵션 표기가 스냅숏으로 남는다', () => {
    const moves = planStockMovements(returnOf({ id: 'a', kind: 'return' }), variants, AT);
    expect(moves[0]?.optionLabel).toBe('블랙 / M');
    expect(moves[0]?.at).toBe(AT);
  });
});

describe('재고 이동 적용(순수)', () => {
  const moves: readonly StockMovement[] = [
    { id: 'm1', at: AT, direction: 'in', sku: 'P-블랙-M', optionLabel: '블랙 / M', quantity: 1 },
    { id: 'm2', at: AT, direction: 'out', sku: 'P-블랙-L', optionLabel: '블랙 / L', quantity: 1 },
  ];

  it('입고는 더하고 출고는 뺀다', () => {
    const next = applyMovements(variants, moves);
    expect(next.find((v) => v.sku === 'P-블랙-M')?.stock).toBe(9);
    expect(next.find((v) => v.sku === 'P-블랙-L')?.stock).toBe(2);
  });
  it('이동이 없는 SKU 는 그대로 둔다(참조까지 보존)', () => {
    const next = applyMovements(variants, moves);
    expect(next.find((v) => v.sku === 'P-베이지-M')).toBe(variants[2]);
  });
  it('같은 옵션으로의 교환은 입고·출고가 상쇄된다', () => {
    const request = returnOf({ id: 'a', exchangeOptionValues: ['블랙', 'M'] });
    const next = applyMovements(variants, planStockMovements(request, variants, AT));
    expect(next.find((v) => v.sku === 'P-블랙-M')?.stock).toBe(8);
  });
  it('재고를 음수로 만들지 않는다', () => {
    const over: readonly StockMovement[] = [
      {
        id: 'm3',
        at: AT,
        direction: 'out',
        sku: 'P-블랙-L',
        optionLabel: '블랙 / L',
        quantity: 99,
      },
    ];
    expect(applyMovements(variants, over).find((v) => v.sku === 'P-블랙-L')?.stock).toBe(0);
  });
});

/**
 * 완료 처리의 재고 반영 (G) — 어댑터 경계에서 확인한다. 백엔드가 없으므로 어댑터가 이 전이의 정본이고,
 * 상품 저장소(../_shared/store)의 SKU 재고가 실제로 움직여야 한다. 픽스처는 모듈 상태라 순서에 의존한다.
 */
describe('완료 처리의 재고 반영(어댑터)', () => {
  const signal = new AbortController().signal;
  const stockOf = (productId: string, sku: string): number =>
    getProduct(productId).variants.find((variant) => variant.sku === sku)?.stock ?? -1;

  it('교환 완료는 원래 옵션을 입고하고 새 옵션을 출고한다', async () => {
    // ret-1: 루미엔 패딩(prd-1) 블랙/M 주문 → 블랙/L 로 교환, 수량 1
    const before = await returnAdapter.fetchOne('ret-1', signal);
    const inBefore = stockOf('prd-1', 'LMN-PAD-001-블랙-M');
    const outBefore = stockOf('prd-1', 'LMN-PAD-001-블랙-L');

    await returnAdapter.update('ret-1', {
      ...toReturnInput(before),
      exchangeOptionValues: ['블랙', 'L'],
      status: 'completed',
    });

    expect(stockOf('prd-1', 'LMN-PAD-001-블랙-M')).toBe(inBefore + 1);
    expect(stockOf('prd-1', 'LMN-PAD-001-블랙-L')).toBe(outBefore - 1);
  });

  it('반영된 요청에는 이동 이력과 반영 시각이 남는다', async () => {
    const after = await returnAdapter.fetchOne('ret-1', signal);
    expect(isStockApplied(after)).toBe(true);
    expect(after.stockMovements.map((move) => move.direction)).toEqual(['in', 'out']);
  });

  it('이미 반영된 요청을 다시 저장해도 재고가 또 움직이지 않는다(중복 반영 방지)', async () => {
    const applied = await returnAdapter.fetchOne('ret-1', signal);
    const inStock = stockOf('prd-1', 'LMN-PAD-001-블랙-M');

    await returnAdapter.update('ret-1', { ...toReturnInput(applied), status: 'completed' });
    await returnAdapter.update('ret-1', { ...toReturnInput(applied), status: 'completed' });

    expect(stockOf('prd-1', 'LMN-PAD-001-블랙-M')).toBe(inStock);
    expect((await returnAdapter.fetchOne('ret-1', signal)).stockMovements).toHaveLength(2);
  });

  it('재고가 부족한 옵션으로는 완료할 수 없다 — 422 로 막고 재고를 건드리지 않는다', async () => {
    // ret-5: 카밀 데님(prd-4) — 모든 사이즈 재고 0
    const request = await returnAdapter.fetchOne('ret-5', signal);
    const before = stockOf('prd-4', 'CML-DNM-051-30');

    await expect(
      returnAdapter.update('ret-5', {
        ...toReturnInput(request),
        exchangeOptionValues: ['32'],
        status: 'completed',
      }),
    ).rejects.toMatchObject({ status: 422 });

    expect(stockOf('prd-4', 'CML-DNM-051-30')).toBe(before);
    expect(isStockApplied(await returnAdapter.fetchOne('ret-5', signal))).toBe(false);
  });

  it('완료가 아닌 전이는 재고를 건드리지 않는다', async () => {
    const request = await returnAdapter.fetchOne('ret-2', signal);
    const before = stockOf('prd-3', 'TRA-SNK-207-260');

    await returnAdapter.update('ret-2', { ...toReturnInput(request), status: 'inspecting' });

    expect(stockOf('prd-3', 'TRA-SNK-207-260')).toBe(before);
    expect(isStockApplied(await returnAdapter.fetchOne('ret-2', signal))).toBe(false);
  });

  it('반품 완료는 회수분만 입고한다', async () => {
    const request = await returnAdapter.fetchOne('ret-3', signal);
    const before = stockOf('prd-2', 'NVA-TEE-014-화이트');

    await returnAdapter.update('ret-3', { ...toReturnInput(request), status: 'completed' });

    // 수량 2건 반품 → 화이트 재고 +2, 이동은 입고 한 건
    expect(stockOf('prd-2', 'NVA-TEE-014-화이트')).toBe(before + 2);
    const after = await returnAdapter.fetchOne('ret-3', signal);
    expect(after.stockMovements).toHaveLength(1);
    expect(after.stockMovements[0]).toMatchObject({ direction: 'in', quantity: 2 });
  });
});

describe('필터 · 검색 · 정렬 · 입력 변환(순수)', () => {
  const list: readonly ReturnRequest[] = [
    returnOf({ id: 'a', status: 'requested', requestedAt: '2026-07-10', orderNo: 'ORD-A' }),
    returnOf({ id: 'b', status: 'completed', requestedAt: '2026-07-12', productName: '가나다' }),
  ];

  it('상태 필터 — 전체면 그대로', () => {
    expect(filterByStatus(list, 'all')).toHaveLength(2);
    expect(filterByStatus(list, 'completed').map((r) => r.id)).toEqual(['b']);
  });
  it('주문번호·상품·신청자 검색', () => {
    expect(searchReturns(list, 'ord-a').map((r) => r.id)).toEqual(['a']);
    expect(searchReturns(list, '가나').map((r) => r.id)).toEqual(['b']);
  });
  it('접수일 내림차순 정렬', () => {
    expect(sortReturns(list).map((r) => r.id)).toEqual(['b', 'a']);
  });
  it('toReturnInput 은 id 를 뺀다', () => {
    expect(toReturnInput(returnOf({ id: 'a' }))).not.toHaveProperty('id');
  });
  it('toReturnInput 은 옵션·이동 배열을 복사한다(원본 공유 금지)', () => {
    const request = returnOf({ id: 'a', optionValues: ['블랙', 'M'] });
    expect(toReturnInput(request).optionValues).not.toBe(request.optionValues);
    expect(toReturnInput(request).optionValues).toEqual(['블랙', 'M']);
  });
});
