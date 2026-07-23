// 택배사 연동 ↔ 배송 정책 이음매 회귀 테스트
//
// ┌ 무엇을 지키나 ────────────────────────────────────────────────────────────┐
// │ ① **모르는 것을 '없다' 로 뭉개지 않는다** — 배선 전에는 null 이지 'missing' 이  │
// │    아니다. 이 구분이 무너지면 화면이 운영자에게 **하지 않아도 될 일**을 시킨다:  │
// │    이미 등록돼 있는 택배사를 다시 등록하러 가게 만든다.                        │
// │ ② **꺼진 택배사를 켜진 것과 뭉개지 않는다** — 자격증명이 있어도 새 송장의        │
// │    선택지에 없으면 그 택배사로는 아무것도 나가지 않는다.                       │
// │ ③ **대조 키는 코드다** — 이름으로 맞추면 표기가 바뀌는 날 조용히 어긋난다.       │
// └──────────────────────────────────────────────────────────────────────────┘
import { afterEach, describe, expect, it } from 'vitest';

import { carrierPolicyLink } from './carrier-integration';
import { registerCarrierCatalogLookup, resetCarrierCatalogLookup } from './shipment';
import type { Carrier } from './shipment';

const CJ: Carrier = {
  id: 'car-cj',
  name: 'CJ대한통운',
  code: 'CJGLS',
  trackingUrlTemplate: 'https://tracking.example.com/cj?invoice={{invoice}}',
  active: true,
};

const RETIRED: Carrier = { ...CJ, id: 'car-old', name: '옛길택배', code: 'OLDROAD', active: false };

afterEach(() => {
  // 배선을 물려받으면 '모른다' 경로를 다시는 밟아 볼 수 없다
  resetCarrierCatalogLookup();
});

describe('carrierPolicyLink — 모르는 것과 없는 것을 가른다', () => {
  it('배선 전에는 null 이다 — 빈 목록으로 뭉개지 않는다', () => {
    resetCarrierCatalogLookup();
    expect(carrierPolicyLink('CJGLS')).toBeNull();
  });

  it('목록은 읽었는데 그 코드가 없으면 missing 이다 — 이때야 운영자가 할 일이 있다', () => {
    registerCarrierCatalogLookup(() => [RETIRED]);
    expect(carrierPolicyLink('CJGLS')).toEqual({ state: 'missing', carrier: null });
  });

  it('등록된 택배사를 찾으면 정책이 가진 이름을 함께 돌려준다', () => {
    registerCarrierCatalogLookup(() => [RETIRED, CJ]);

    const link = carrierPolicyLink('CJGLS');
    expect(link?.state).toBe('active');
    // 이름은 **정책의 것**이다 — 연동 카탈로그가 택배사 이름을 소유하지 않는다
    expect(link?.carrier?.name).toBe('CJ대한통운');
  });

  it('꺼 둔 택배사는 active 가 아니다 — 새 송장의 선택지에 없다', () => {
    registerCarrierCatalogLookup(() => [{ ...CJ, active: false }]);
    expect(carrierPolicyLink('CJGLS')?.state).toBe('inactive');
  });

  it('대소문자와 공백은 같은 코드로 본다 — 운영자가 손으로 넣는 값이다', () => {
    registerCarrierCatalogLookup(() => [{ ...CJ, code: ' cjgls ' }]);
    expect(carrierPolicyLink('CJGLS')?.state).toBe('active');
  });

  it('이름이 같아도 코드가 다르면 다른 택배사다 — 표기로 맞추지 않는다', () => {
    // 표기는 언제든 바뀐다('대한통운' → 'CJ대한통운'). 그래서 code 가 식별자다.
    registerCarrierCatalogLookup(() => [{ ...CJ, code: 'CJ-EXPRESS' }]);
    expect(carrierPolicyLink('CJGLS')?.state).toBe('missing');
  });

  it('빈 코드로는 아무것도 묻지 않는다 — 목록 전체와 우연히 맞지 않게', () => {
    registerCarrierCatalogLookup(() => [CJ]);
    expect(carrierPolicyLink('')).toBeNull();
    expect(carrierPolicyLink('   ')).toBeNull();
  });
});
