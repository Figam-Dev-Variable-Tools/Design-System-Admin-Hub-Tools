// 결제(PG) 설정 ↔ 구매 CTA 규칙 고정 (apps/admin/src/shared/commerce/payment-settings.ts)
//
// [이 파일이 지키는 것] "PG 를 안 쓰면 구매/후원 버튼이 문의하기로 바뀐다" 는 요구는 화면 두 곳
// (상품 폼 미리보기 · 프로그램 상세)에서 눈으로만 확인되면 언제든 한쪽만 조용히 갈라진다.
// 규칙은 순수 함수 하나이므로, 그 함수의 판정을 여기서 못박아 두 화면이 같은 답을 받게 한다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  checkoutCta,
  DEFAULT_PAYMENT_SETTINGS,
  INQUIRY_PATH,
  readPaymentSettings,
  resetPaymentSettings,
  writePaymentSettings,
} from './payment-settings';
import type { PaymentSettings } from './payment-settings';

/** PG 계약이 정상적으로 잡힌 상태 — 여기서 한 축씩 무너뜨려 판정을 확인한다 */
const LIVE: PaymentSettings = {
  usePg: true,
  provider: 'toss',
  merchantId: 'tosspayments-mid-0001',
  mode: 'live',
  methods: ['card', 'easypay'],
  inquiryGuide: '결제 준비 중입니다.',
};

afterEach(() => {
  // 모듈 지역 상태다 — 되돌리지 않으면 앞 테스트의 저장이 뒤 테스트의 전제가 된다
  resetPaymentSettings();
});

describe('checkoutCta — PG 사용 여부가 버튼을 정한다', () => {
  it('PG 를 쓰면 상품은 구매하기, 프로그램은 후원하기다', () => {
    expect(checkoutCta(LIVE, 'product')).toMatchObject({ kind: 'purchase', label: '구매하기' });
    expect(checkoutCta(LIVE, 'program')).toMatchObject({ kind: 'purchase', label: '후원하기' });
  });

  it('PG 를 끄면 상품·프로그램 **둘 다** 문의하기다', () => {
    const off: PaymentSettings = { ...LIVE, usePg: false };

    for (const domain of ['product', 'program'] as const) {
      const cta = checkoutCta(off, domain);
      expect(cta.kind).toBe('inquiry');
      expect(cta.label).toBe('문의하기');
    }
  });

  it('문의 CTA 는 도메인별 문의 창구로 보낸다 — 상품 문의와 프로그램 문의는 다른 화면이다', () => {
    const off: PaymentSettings = { ...LIVE, usePg: false };

    expect(checkoutCta(off, 'product').inquiryPath).toBe(INQUIRY_PATH.product);
    expect(checkoutCta(off, 'program').inquiryPath).toBe(INQUIRY_PATH.program);
    // 결제로 가는 CTA 에는 문의 목적지가 없다 — 있으면 화면이 두 갈래를 동시에 그리게 된다
    expect(checkoutCta(LIVE, 'product').inquiryPath).toBeNull();
  });

  it('버튼이 왜 그 모양인지 함께 돌려준다 — 화면이 문구를 지어내지 않는다', () => {
    expect(checkoutCta({ ...LIVE, usePg: false }, 'product').reason).toContain('PG');
    // 테스트 모드는 '연동됨' 과 다른 사실이다 — 문구가 그 차이를 말한다
    expect(checkoutCta({ ...LIVE, mode: 'test' }, 'product').reason).toContain('테스트');
    expect(checkoutCta(LIVE, 'product').reason).toContain('토스페이먼츠');
  });
});

describe('merchantId — 켜 두고 비워 두면 결제로 치지 않는다(fail-closed)', () => {
  it('상점 ID 가 비면 PG 를 켜 두어도 문의하기로 떨어진다', () => {
    const blank: PaymentSettings = { ...LIVE, merchantId: '' };

    expect(checkoutCta(blank, 'product').kind).toBe('inquiry');
    expect(checkoutCta(blank, 'program').label).toBe('문의하기');
  });

  it('공백만 채운 상점 ID 도 비어 있는 것이다', () => {
    expect(checkoutCta({ ...LIVE, merchantId: '   ' }, 'product').kind).toBe('inquiry');
  });
});

describe('설정 저장 — 바꾸면 다음 조회부터 곧바로 반영된다', () => {
  it('기본값은 PG 미사용이다 — 결제되지 않는 구매 버튼으로 출발하지 않는다', () => {
    expect(readPaymentSettings()).toEqual(DEFAULT_PAYMENT_SETTINGS);
    expect(checkoutCta(readPaymentSettings(), 'product').kind).toBe('inquiry');
  });

  it('PG 를 켜서 저장하면 같은 호출이 구매 CTA 를 돌려준다', () => {
    writePaymentSettings(LIVE);

    expect(checkoutCta(readPaymentSettings(), 'product').label).toBe('구매하기');
    expect(checkoutCta(readPaymentSettings(), 'program').label).toBe('후원하기');
  });

  it('다시 끄면 그 자리에서 문의 CTA 로 돌아온다', () => {
    writePaymentSettings(LIVE);
    writePaymentSettings({ ...LIVE, usePg: false });

    expect(checkoutCta(readPaymentSettings(), 'product').label).toBe('문의하기');
  });
});
