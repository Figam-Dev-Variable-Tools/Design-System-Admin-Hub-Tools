// status 재현 스위치 파싱 회귀 테스트
//
// [왜 이 파일이 생겼나] `?status=<scope>:<op>:<code>` 의 **스코프 지정이 통째로 죽어 있었다.**
// `entry.split(':')` 을 두 변수에 담았기 때문에 조각이 셋인 `orders:save:409` 에서 code 가
// 'save' 가 되고 parseInt 가 NaN 이 됐다. 그래서 스코프를 붙여도 아무 데도 걸리지 않았고,
// 대신 `?status=save:409` 가 **같은 op 을 가진 모든 어댑터에 한꺼번에** 걸렸다 —
// 주문 하나만 409 로 재현하려던 사람이 배송까지 함께 깨뜨리고 있었다는 뜻이다.
//
// 이 스위치는 스펙이 요구하는 실패 경로(EXC-02/03/04/06)를 화면에서 보는 유일한 수단이라,
// 조용히 틀린 채로 두면 그 경로들이 검증된 적 없는 상태가 된다.
import { afterEach, describe, expect, it } from 'vitest';

import { requestedStatus } from './dev';

/** 주소창을 갈아 끼운다 — requestedStatus 는 window.location.search 를 읽는다 */
function withQuery(search: string): void {
  window.history.replaceState({}, '', search === '' ? '/' : `/?${search}`);
}

afterEach(() => {
  withQuery('');
});

describe('requestedStatus — 스코프 지정', () => {
  it('scope:op:code 가 그 스코프에만 걸린다', () => {
    withQuery('status=orders:save:409');

    expect(requestedStatus('orders', 'save')).toBe(409);
    // 같은 op 을 가진 다른 어댑터는 걸리지 않는다 — 이것이 스코프를 붙이는 이유다
    expect(requestedStatus('shipments', 'save')).toBeNull();
  });

  it('scope 없는 op:code 는 op 이 같은 모든 스코프에 걸린다 — 옛 형태 그대로', () => {
    withQuery('status=save:409');

    expect(requestedStatus('orders', 'save')).toBe(409);
    expect(requestedStatus('shipments', 'save')).toBe(409);
    expect(requestedStatus('orders', 'list')).toBeNull();
  });

  it('all:code 는 op 을 가리지 않는다', () => {
    withQuery('status=all:500');

    expect(requestedStatus('orders', 'save')).toBe(500);
    expect(requestedStatus('billing', 'list')).toBe(500);
  });

  it('여러 항목을 쉼표로 나열하면 각자 자기 자리에만 걸린다', () => {
    withQuery('status=orders:save:409,shipments:list:401');

    expect(requestedStatus('orders', 'save')).toBe(409);
    expect(requestedStatus('shipments', 'list')).toBe(401);
    expect(requestedStatus('orders', 'list')).toBeNull();
  });

  it('재현 대상이 아닌 코드는 무시한다 — 아무 숫자나 던지게 두지 않는다', () => {
    withQuery('status=orders:save:418');

    expect(requestedStatus('orders', 'save')).toBeNull();
  });

  it('망가진 항목은 조용히 건너뛴다', () => {
    withQuery('status=,:409,orders:save,orders:save:409');

    // 앞의 셋은 형태가 깨졌지만 마지막 하나는 살아 있어야 한다
    expect(requestedStatus('orders', 'save')).toBe(409);
  });

  it('스위치가 없으면 null — 평상시에는 아무것도 하지 않는다', () => {
    withQuery('');

    expect(requestedStatus('orders', 'save')).toBeNull();
  });
});
