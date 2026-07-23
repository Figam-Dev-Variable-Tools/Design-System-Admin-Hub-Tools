// 결제(PG) 설정 ↔ 구매 CTA 규칙 고정 (apps/admin/src/shared/commerce/payment-settings.ts)
//
// [이 파일이 지키는 것] "PG 를 안 쓰면 구매/후원 버튼이 문의하기로 바뀐다" 는 요구는 화면 두 곳
// (상품 폼 미리보기 · 프로그램 상세)에서 눈으로만 확인되면 언제든 한쪽만 조용히 갈라진다.
// 규칙은 순수 함수 하나이므로, 그 함수의 판정을 여기서 못박아 두 화면이 같은 답을 받게 한다.
//
// [모델이 바뀌어도 계약은 그대로다] 자격증명이 `merchantId: string` 한 칸에서 PG 별 카탈로그
// (./pg-catalog.ts)로 넓어졌지만, 이 파일이 고정하는 **판정**은 바뀌지 않았다 — 픽스처를 만드는
// 방법만 달라졌고 '비면 문의로 떨어진다(fail-closed)' 는 그대로다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  checkoutCta,
  DEFAULT_PAYMENT_SETTINGS,
  INQUIRY_PATH,
  missingCredentialLabels,
  pgSellable,
  readPaymentSettings,
  resetPaymentSettings,
  writePaymentSettings,
} from './payment-settings';
import type { PaymentSettings } from './payment-settings';
import type { PgConnection } from './pg-catalog';

/** 토스 자격증명을 다 채운 연결 */
const TOSS: PgConnection = {
  mode: 'direct',
  provider: 'toss',
  publicValues: { clientKey: 'live_ck_0001', mid: 'tosspayments-mid-0001' },
  storedSecrets: ['secretKey'],
};

/** PG 계약이 정상적으로 잡힌 상태 — 여기서 한 축씩 무너뜨려 판정을 확인한다 */
const LIVE: PaymentSettings = {
  usePg: true,
  connection: TOSS,
  mode: 'live',
  methods: ['card', 'easypay'],
  contractStatus: 'live',
  inquiryGuide: '결제 준비 중이에요.',
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

  it('값은 다 넣었지만 계약이 안 열렸으면 그 사실을 말한다 — 실패를 결제 순간까지 미루지 않는다', () => {
    const reviewing: PaymentSettings = { ...LIVE, contractStatus: 'reviewing' };
    const cta = checkoutCta(reviewing, 'product');

    // 자격증명은 완비라 버튼 자체는 구매하기다 — 막는 것은 계약이 아니라 값이다
    expect(cta.kind).toBe('purchase');
    expect(cta.reason).toContain('실결제 오픈');
  });

  it('계약 상태는 판매 가능 판정을 뒤집지 않는다 — 수기 입력값이 상점을 닫으면 안 된다', () => {
    expect(pgSellable({ ...LIVE, contractStatus: 'none' })).toBe(true);
  });
});

describe('자격증명 — 켜 두고 비워 두면 결제로 치지 않는다(fail-closed)', () => {
  it('필수 공개 값이 비면 PG 를 켜 두어도 문의하기로 떨어진다', () => {
    const blank: PaymentSettings = {
      ...LIVE,
      connection: { ...TOSS, publicValues: { clientKey: 'live_ck_0001', mid: '' } },
    };

    expect(pgSellable(blank)).toBe(false);
    expect(checkoutCta(blank, 'product').kind).toBe('inquiry');
    expect(checkoutCta(blank, 'program').label).toBe('문의하기');
  });

  it('공백만 채운 값도 비어 있는 것이다', () => {
    const spaces: PaymentSettings = {
      ...LIVE,
      connection: { ...TOSS, publicValues: { clientKey: 'live_ck_0001', mid: '   ' } },
    };

    expect(checkoutCta(spaces, 'product').kind).toBe('inquiry');
  });

  it('**필수 비밀이 저장돼 있지 않으면** 공개 값이 다 차 있어도 판매할 수 없다', () => {
    const noSecret: PaymentSettings = { ...LIVE, connection: { ...TOSS, storedSecrets: [] } };

    expect(pgSellable(noSecret)).toBe(false);
    expect(checkoutCta(noSecret, 'product').kind).toBe('inquiry');
  });

  it('무엇이 비었는지 이름으로 말한다 — 운영자가 어느 칸을 채워야 하는지 알 수 있게', () => {
    const noSecret: PaymentSettings = { ...LIVE, connection: { ...TOSS, storedSecrets: [] } };

    expect(missingCredentialLabels(noSecret)).toEqual(['시크릿 키']);
    expect(checkoutCta(noSecret, 'product').reason).toContain('시크릿 키');
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
