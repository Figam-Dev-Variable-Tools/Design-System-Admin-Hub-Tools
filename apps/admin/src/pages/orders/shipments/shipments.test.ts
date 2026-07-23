// 배송 처리 화면 회귀 테스트 — 행 모델 · 작업 상태 · 필터/검색/집계 · 일괄 처리 대상
//   + 픽스처가 주문 픽스처와 실제로 맞물리는지(SKU 대조가 어긋나면 화면이 조용히 죽는다)
//
// [왜 픽스처까지 보나] 커버리지 판정은 SKU 문자열 대조다. 배송 픽스처의 SKU 가 주문 픽스처의 것과
// 한 글자만 달라도 그 주문은 영원히 '발송대기' 에 남고, 화면은 멀쩡해 보이는데 아무 버튼도 듣지
// 않는다. 그 실패는 런타임에만 드러나므로 여기서 못 박는다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  registerCarrierCatalogLookup,
  resetCarrierCatalogLookup,
  shipmentCoverage,
} from '../../../shared/domain/shipment';
import type { Carrier } from '../../../shared/domain/shipment';
import { ORDER_SEED } from '../_shared/store';
import { SHIPMENT_SEED, countShipmentsByCarrier } from './data-source';
import {
  buildShipmentRows,
  carrierSummary,
  countRowsByWork,
  eligibleForDispatch,
  eligibleForInvoice,
  eligibleForPreparing,
  filterRowsByWork,
  partialLabel,
  searchShipmentRows,
  shipmentWorkLabel,
  shipmentWorkStatus,
  SHIPMENT_WORK_ALL,
  SHIPMENT_WORK_FILTER_VALUES,
} from './types';
import type { ShipmentRow } from './types';

const ROWS = buildShipmentRows(ORDER_SEED, SHIPMENT_SEED);

/**
 * 택배사 카탈로그는 **배선으로** 들어온다(src/wiring.ts). 그 정본은 배송 정책 화면이 갖고 있고,
 * 이 테스트가 그것을 직접 import 하면 pages/orders → pages/products 결합이 된다 — 제품 코드에
 * 금지한 것을 테스트에서 하면 결합은 그대로 생긴다. 그래서 여기서는 조회기 자리에 최소 목록을
 * 꽂아 '배선되면 이름이 나온다' 만 확인한다.
 */
const TEST_CARRIERS: readonly Carrier[] = [
  {
    id: 'car-1',
    name: '가상택배',
    code: 'VIRTUAL',
    trackingUrlTemplate: 'https://tracking.example.com/virtual?invoice={{invoice}}',
    active: true,
  },
];

function rowOf(orderId: string): ShipmentRow {
  const row = ROWS.find((candidate) => candidate.id === orderId);
  if (row === undefined) throw new Error(`픽스처에 ${orderId} 행이 없어요.`);
  return row;
}

afterEach(() => {
  resetCarrierCatalogLookup();
});

/* ── 픽스처 정합 ─────────────────────────────────────────────────────────── */

describe('픽스처 — 배송 건은 주문 픽스처의 실제 주문·SKU 를 가리킨다', () => {
  it('모든 배송 건의 주문번호가 실재한다', () => {
    const orderIds = new Set(ORDER_SEED.map((order) => order.id));
    for (const shipment of SHIPMENT_SEED) {
      expect(orderIds.has(shipment.orderId)).toBe(true);
    }
  });

  it('모든 배송 건의 SKU 가 그 주문의 품목에 있다 — 대조가 어긋나면 커버리지가 0 이 된다', () => {
    for (const shipment of SHIPMENT_SEED) {
      const order = ORDER_SEED.find((candidate) => candidate.id === shipment.orderId);
      expect(order).toBeDefined();
      const skus = new Set(order?.lines.map((line) => line.sku) ?? []);
      for (const line of shipment.lines) {
        expect(skus.has(line.sku)).toBe(true);
      }
    }
  });

  it('모든 배송 건이 택배사를 가리킨다 — 택배사 없는 송장은 추적할 방법이 없다', () => {
    for (const shipment of SHIPMENT_SEED) {
      expect(shipment.carrierId).not.toBe('');
    }
  });

  it('같은 택배사에 같은 송장번호가 두 번 쓰이지 않았다', () => {
    const keys = SHIPMENT_SEED.map((shipment) => `${shipment.carrierId}:${shipment.invoiceNo}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('택배사 사용 건수 조회기가 실제 원장을 센다 — 삭제 가드의 근거다', () => {
    const expected = SHIPMENT_SEED.filter((shipment) => shipment.carrierId === 'car-1').length;
    expect(countShipmentsByCarrier('car-1')).toBe(expected);
    // 배송 건이 없는 택배사는 0 — 그때만 삭제가 열린다.
    expect(countShipmentsByCarrier('car-3')).toBe(0);
  });
});

/* ── 행 모델 ─────────────────────────────────────────────────────────────── */

describe('행 모델 — 처리 대상만 남고, 송장이 없는 주문도 행이 된다', () => {
  it('취소된 주문과 입금 전 주문은 목록에 없다', () => {
    const ids = ROWS.map((row) => row.id);
    // ORD-20260719-0003 은 취소, ORD-20260721-0001 은 입금 전이다.
    expect(ids).not.toContain('ORD-20260719-0003');
    expect(ids).not.toContain('ORD-20260721-0001');
  });

  it('배송 건이 하나도 없는 주문도 행으로 선다 — 정작 할 일이 가장 많은 주문이다', () => {
    const row = rowOf('ORD-20260720-0002');
    expect(row.shipments).toHaveLength(0);
    expect(row.work).toBe('pending');
    expect(row.remaining).toHaveLength(2);
  });

  it('송장만 붙고 아직 안 나간 주문은 배송대기다 (규칙 1)', () => {
    const row = rowOf('ORD-20260716-0005');
    expect(row.work).toBe('waiting');
    expect(row.remaining).toHaveLength(0);
  });

  it('전부 도착한 주문은 배송완료다', () => {
    expect(rowOf('ORD-20260710-0148').work).toBe('delivered');
  });

  it('일부만 나간 주문은 발송대기에 남고 부분발송을 표기한다', () => {
    const row = rowOf('ORD-20260712-0031');
    // 패딩 1개만 나갔고 티셔츠 2개는 송장도 없다 — 남은 일이 있으므로 발송대기다.
    expect(row.work).toBe('pending');
    expect(partialLabel(row)).toBe('부분발송 1/3');
    expect(row.remaining).toEqual([{ sku: 'NVA-TEE-014-화이트', quantity: 2 }]);
  });

  it('작업 상태 판정은 커버리지 판정과 어긋나지 않는다', () => {
    for (const row of ROWS) {
      const complete = shipmentCoverage(row.order.lines, row.shipments).complete;
      expect(row.work === 'pending').toBe(!complete);
      expect(shipmentWorkStatus(row.order, row.shipments)).toBe(row.work);
    }
  });
});

/* ── 필터 · 검색 · 집계 ──────────────────────────────────────────────────── */

describe('필터 · 검색 · 집계', () => {
  it('전체 필터는 모든 행을 준다', () => {
    expect(filterRowsByWork(ROWS, SHIPMENT_WORK_ALL)).toHaveLength(ROWS.length);
  });

  it('네 갈래가 전부 픽스처에 있다 — 빈 필터로 출발하지 않는다', () => {
    const counts = countRowsByWork(ROWS);
    expect(counts.pending).toBeGreaterThan(0);
    expect(counts.waiting).toBeGreaterThan(0);
    expect(counts.delivered).toBeGreaterThan(0);
    expect(counts[SHIPMENT_WORK_ALL]).toBe(ROWS.length);
  });

  it('건수의 합은 전체와 같다 — 어느 행도 두 갈래에 동시에 속하지 않는다', () => {
    const counts = countRowsByWork(ROWS);
    expect(counts.pending + counts.waiting + counts.shipping + counts.delivered).toBe(ROWS.length);
  });

  it('필터 값 목록은 전체를 포함한다 — parseFilter 가 되돌릴 자리다', () => {
    expect(SHIPMENT_WORK_FILTER_VALUES).toContain(SHIPMENT_WORK_ALL);
    expect(SHIPMENT_WORK_FILTER_VALUES).toContain('delivered');
  });

  it('주문번호로 찾는다', () => {
    expect(searchShipmentRows(ROWS, 'ORD-20260716-0005')).toHaveLength(1);
  });

  it('수령인으로 찾는다', () => {
    const found = searchShipmentRows(ROWS, '서다인');
    expect(found.map((row) => row.id)).toEqual(['ORD-20260716-0005']);
  });

  it('송장번호로 찾는다 — 택배사가 부르는 번호는 이쪽이다', () => {
    const found = searchShipmentRows(ROWS, '4415-2280-0091');
    expect(found.map((row) => row.id)).toEqual(['ORD-20260716-0005']);
  });

  it('빈 검색어는 전부 통과시킨다', () => {
    expect(searchShipmentRows(ROWS, '   ')).toHaveLength(ROWS.length);
  });

  it('작업 상태 라벨은 화면의 어휘와 같다', () => {
    expect(shipmentWorkLabel('pending')).toBe('발송대기');
    expect(shipmentWorkLabel('waiting')).toBe('배송대기');
  });
});

/* ── 일괄 처리 대상 ──────────────────────────────────────────────────────── */

describe('일괄 처리 대상 — 버튼의 건수와 저장의 허용이 같은 술어를 읽는다', () => {
  it('이미 지난 단계의 주문은 배송준비중 대상이 아니다', () => {
    const targets = eligibleForPreparing(ROWS);
    // 배송준비중(0002)·배송대기(0005)·배송중(0031)·완료 건은 되돌릴 수 없다.
    expect(targets.map((row) => row.id)).not.toContain('ORD-20260720-0002');
    expect(targets.map((row) => row.id)).not.toContain('ORD-20260716-0005');
  });

  it('배송보류 주문은 배송준비중으로 되돌릴 수 없다 — 흐름은 한 방향이다', () => {
    expect(eligibleForPreparing([rowOf('ORD-20260718-0004')])).toHaveLength(0);
  });

  it('잔량이 남은 주문만 송장 입력 대상이다', () => {
    const targets = eligibleForInvoice(ROWS).map((row) => row.id);
    expect(targets).toContain('ORD-20260720-0002');
    expect(targets).toContain('ORD-20260712-0031');
    expect(targets).not.toContain('ORD-20260716-0005');
  });

  it('송장이 붙은 배송대기 건이 있어야 발송처리 대상이다', () => {
    const targets = eligibleForDispatch(ROWS).map((row) => row.id);
    expect(targets).toEqual(['ORD-20260716-0005']);
  });
});

/* ── 표시 ────────────────────────────────────────────────────────────────── */

describe('택배사 열 — 배선 전에는 이름을 지어내지 않는다', () => {
  it('배송 건이 없으면 대시', () => {
    expect(carrierSummary(rowOf('ORD-20260720-0002'))).toBe('—');
  });

  it('배선 전에는 알 수 없다고 말한다', () => {
    expect(carrierSummary(rowOf('ORD-20260716-0005'))).toBe('알 수 없는 택배사');
  });

  it('배선되면 택배사 이름을 말한다', () => {
    registerCarrierCatalogLookup(() => TEST_CARRIERS);
    expect(carrierSummary(rowOf('ORD-20260716-0005'))).toBe('가상택배');
  });
});
