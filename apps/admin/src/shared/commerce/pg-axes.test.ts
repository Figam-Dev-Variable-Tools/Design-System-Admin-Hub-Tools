// 결제 축의 순수 규칙 — 가격 표시 파생 · 섹션 잠금 · 조건부 메뉴 가시성
//
// 화면을 렌더하지 않는다. 이 파일이 지키는 것은 '무엇이 참인가' 이고, 그 답이 화면마다 갈리지
// 않게 하는 것이 이 축을 shared 에 둔 이유다.
//
// [축이 하나가 됐다] 예전에는 축이 둘이었다(전역 pgSellable + 상품별 priceDisplay). 운영 요구로
// 상품별 축이 사라졌다 — 가격 표시는 고르는 값이 아니라 **연동 상태의 결과**다(./price-display.ts).
// 그래서 이 파일의 '축 B' 단언들도 '상품이 무엇을 골랐는가' 가 아니라 '연동이 되어 있는가' 를 본다.
import { describe, expect, it, afterEach } from 'vitest';

import {
  inquiryCountFor,
  inquiryMenuState,
  readInquiryBacklog,
  registerInquiryBacklogLookup,
  resetInquiryBacklogLookup,
} from './inquiry-backlog';
import type { InquiryBacklog } from './inquiry-backlog';
import { pgLock, PG_LOCK_SECTIONS } from './pg-lock';
import {
  DEFAULT_PAYMENT_SETTINGS,
  pgSellable,
  registerPgCredentialHealth,
  resetPgCredentialHealth,
} from './payment-settings';
import type { PaymentSettings } from './payment-settings';
import { DEFAULT_PRICE_INQUIRY_TEXT, resolvePriceDisplay } from './price-display';

/** PG 를 실제로 열 수 있는 설정 — 자격증명(공개 값 + 저장된 비밀)까지 채워야 결제창이 열린다 */
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

/**
 * 켜 두었지만 자격증명이 반쪽인 설정 — fail-closed 판정의 대상.
 * 공개 값은 공백뿐이고 필수 비밀도 저장돼 있지 않다.
 */
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

const PG_OFF: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;

function backlogOf(partial: Partial<InquiryBacklog>): InquiryBacklog {
  return {
    total: 0,
    open: 0,
    slaBreached: 0,
    averageResponseHours: null,
    byTarget: {},
    ...partial,
  };
}

afterEach(() => {
  resetInquiryBacklogLookup();
  resetPgCredentialHealth();
});

describe('축 A — pgSellable', () => {
  it('자격증명이 비어 있으면 켜 두어도 결제를 열 수 없다(fail-closed)', () => {
    expect(pgSellable(PG_ON)).toBe(true);
    expect(pgSellable(PG_HALF)).toBe(false);
    expect(pgSellable(PG_OFF)).toBe(false);
  });
});

describe('가격 표시 — 고르는 값이 아니라 연동 상태의 결과다', () => {
  it('연동이 되어 있으면 금액을 그대로 노출한다', () => {
    expect(resolvePriceDisplay(PG_ON).kind).toBe('amount');
    expect(resolvePriceDisplay(PG_ON).text).toBe('');
  });

  it('PG 를 끄면 금액이 이미 설정돼 있어도 전부 가격문의로 대체된다', () => {
    const resolved = resolvePriceDisplay(PG_OFF);
    expect(resolved.kind).toBe('inquiry');
    expect(resolved.text).toBe(DEFAULT_PRICE_INQUIRY_TEXT);
  });

  it('켜 두었어도 자격증명이 반쪽이면 가격문의다 — fail-closed', () => {
    expect(resolvePriceDisplay(PG_HALF).kind).toBe('inquiry');
  });

  /**
   * [술어는 하나다] 금액 입력 차단과 가격 문의 대체가 갈리면 **금액은 입력되는데 표시는
   * 문의**이거나 그 반대가 생긴다. 두 필드가 언제나 같은 답을 낸다는 것을 못박는다.
   */
  it('금액 입력 차단은 가격 문의 대체와 **항상 같은 답**이다', () => {
    for (const settings of [PG_ON, PG_HALF, PG_OFF]) {
      const resolved = resolvePriceDisplay(settings);
      expect(resolved.amountFieldsLocked).toBe(resolved.kind === 'inquiry');
    }
  });

  it('세 갈래가 서로 다른 원인을 말한다 — 다음에 할 일이 달라서다', () => {
    expect(resolvePriceDisplay(PG_OFF).reason).toContain('쓰지 않도록');
    // 값이 덜 찼다 — 무엇이 비었는지 이름으로 짚는다
    expect(resolvePriceDisplay(PG_HALF).reason).toContain('시크릿 키');
  });

  /*
   * ⓑ '키가 실제로 유효한가' 는 **프론트가 알 수 없다** — 연결 테스트를 만들지 않기로 했고,
   * 그 판단은 유지한다. 그래서 이 축은 백엔드가 꽂는 심으로만 움직인다.
   */
  it('백엔드가 거절을 알려 주면 값이 다 차 있어도 가격문의로 닫힌다', () => {
    registerPgCredentialHealth(() => 'invalid');

    expect(pgSellable(PG_ON)).toBe(false);
    expect(resolvePriceDisplay(PG_ON).kind).toBe('inquiry');
    expect(resolvePriceDisplay(PG_ON).reason).toContain('거절');
  });

  it("배선 전에는 '확인한 적 없음' 이지 '이상 있음' 이 아니다 — 멀쩡한 상점을 닫지 않는다", () => {
    // 이것이 없으면 백엔드가 붙기 전까지 모든 사이트가 영원히 가격문의가 되고,
    // 같은 사실을 보는 checkoutCta 는 '구매하기' 를 그려 두 축이 서로 모순된다.
    expect(resolvePriceDisplay(PG_ON).kind).toBe('amount');
  });
});

describe('PG off 시 섹션 잠금', () => {
  it('PG 를 열 수 있으면 어느 섹션도 잠기지 않는다', () => {
    for (const section of PG_LOCK_SECTIONS) {
      expect(pgLock(PG_ON, section)).toEqual({ locked: false, reason: '' });
    }
  });

  it('PG 를 열 수 없으면 모든 섹션이 사유와 함께 잠긴다', () => {
    for (const settings of [PG_OFF, PG_HALF]) {
      for (const section of PG_LOCK_SECTIONS) {
        const lock = pgLock(settings, section);
        expect(lock.locked).toBe(true);
        expect(lock.reason).not.toBe('');
      }
    }
  });

  it('사유는 결과가 아니라 원인을 말한다 — 적립·쿠폰은 "결제가 없어" 로 시작한다', () => {
    expect(pgLock(PG_OFF, 'product-points').reason).toContain('결제가 없어');
    expect(pgLock(PG_OFF, 'product-coupons').reason).toContain('결제가 없어');
  });

  it('재고 잠금 사유가 옵션은 계속 편집된다고 말한다 — 견적 품목 명세로 쓰인다', () => {
    expect(pgLock(PG_OFF, 'product-stock').reason).toContain('옵션');
  });
});

describe('조건부 메뉴 가시성', () => {
  it('PG 미사용이면 문의는 지금도 들어온다 — 메뉴는 평소대로', () => {
    expect(inquiryMenuState(PG_OFF, backlogOf({ total: 0 }))).toBe('open');
  });

  it('PG 사용 + 잔여 0건이면 메뉴가 사라진다', () => {
    expect(inquiryMenuState(PG_ON, backlogOf({ total: 0 }))).toBe('hidden');
  });

  it('PG 사용 + 잔여가 남아 있으면 메뉴는 남기고 읽기 전용으로 표시한다', () => {
    expect(inquiryMenuState(PG_ON, backlogOf({ total: 3 }))).toBe('archive');
  });

  it('배선 전(모름)에는 지우지 않는다 — fail-open', () => {
    expect(inquiryMenuState(PG_ON, null)).toBe('archive');
  });

  it('미답변이 0 이어도 종결된 과거 문의가 있으면 남긴다 — 기록의 접근로를 끊지 않는다', () => {
    expect(inquiryMenuState(PG_ON, backlogOf({ total: 12, open: 0 }))).toBe('archive');
  });
});

describe('잔여 문의 조회 seam', () => {
  it('배선 전에는 0 이 아니라 null 이다', () => {
    expect(readInquiryBacklog('product')).toBeNull();
    expect(inquiryCountFor('product', 'prd-1')).toBeNull();
  });

  it('도메인별로 다른 답을 준다 — 상품과 프로그램의 창구가 다르다', () => {
    registerInquiryBacklogLookup((domain) =>
      domain === 'product'
        ? backlogOf({ total: 2, byTarget: { 'prd-1': 2 } })
        : backlogOf({ total: 5 }),
    );

    expect(readInquiryBacklog('product')?.total).toBe(2);
    expect(readInquiryBacklog('program')?.total).toBe(5);
    expect(inquiryCountFor('product', 'prd-1')).toBe(2);
    // 문의가 없는 상품은 '모름' 이 아니라 0 건이다
    expect(inquiryCountFor('product', 'prd-9')).toBe(0);
  });
});
