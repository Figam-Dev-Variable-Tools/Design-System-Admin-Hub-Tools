// 견적 동작 회귀 테스트 (A41) — 공급가액·부가세(라인별 반올림 합산)·수주전환·필터(순수) + 폼 검증
//   + 문의 승계(자동 생성 견적의 승계 필드·잠금·중복 발행 방지)
import { describe, expect, it } from 'vitest';

import {
  addDays,
  buildQuoteFromInquiry,
  canConvertToOrder,
  computeTotals,
  filterQuotes,
  isInherited,
  lineSupply,
  makeQuoteNo,
  QUOTE_VALID_DAYS,
  searchQuotes,
  sortQuotes,
  toQuoteInput,
} from './types';
import type { Quote, QuoteInheritance, QuoteLineItem } from './types';
import { EMPTY_QUOTE_FORM, quoteSchema } from './validation';
import type { QuoteFormValues } from './validation';

const items: readonly QuoteLineItem[] = [
  { id: 'a', name: '품목A', spec: '', quantity: 2, unitPrice: 1500 },
  { id: 'b', name: '품목B', spec: '', quantity: 1, unitPrice: 999 },
];

function quoteOf(overrides: Partial<Quote> & { id: string }): Quote {
  return {
    quoteNo: 'Q-20260710-001',
    accountName: '(주)테스트',
    accountBizNo: '124-81-00998',
    accountCeo: '김대표',
    contactName: '',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items,
    status: 'draft',
    note: '',
    inquiryId: '',
    inquiryNo: '',
    inquiryBody: '',
    ...overrides,
  };
}

describe('금액 계산(순수)', () => {
  it('라인 공급가액 = 수량 × 단가', () => {
    expect(lineSupply({ quantity: 2, unitPrice: 1500 })).toBe(3000);
  });
  it('과세(10%) — 라인별 반올림 후 합산', () => {
    // 라인A 공급 3000 → 세액 300, 라인B 공급 999 → 세액 round(99.9)=100. 합 세액 400.
    const totals = computeTotals(items, 'standard');
    expect(totals.supply).toBe(3999);
    expect(totals.vat).toBe(400);
    expect(totals.total).toBe(4399);
  });
  it('영세율·면세는 세액 0', () => {
    expect(computeTotals(items, 'zero_rated').vat).toBe(0);
    expect(computeTotals(items, 'exempt').vat).toBe(0);
  });
  it('품목이 없으면 0', () => {
    expect(computeTotals([], 'standard')).toEqual({ supply: 0, vat: 0, total: 0 });
  });
});

describe('수주 전환 가능 여부(순수)', () => {
  it('승인된 견적만 전환 가능', () => {
    expect(canConvertToOrder('accepted')).toBe(true);
    expect(canConvertToOrder('sent')).toBe(false);
    expect(canConvertToOrder('ordered')).toBe(false);
  });
});

describe('견적번호 생성(순수)', () => {
  it("'Q-YYYYMMDD-NNN' 형식", () => {
    expect(makeQuoteNo('2026-07-16', 7)).toBe('Q-20260716-007');
  });
});

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    quoteOf({ id: 'a', quoteNo: 'Q-1', status: 'sent', issueDate: '2026-07-01' }),
    quoteOf({
      id: 'b',
      quoteNo: 'Q-2',
      accountName: '가나상사',
      status: 'accepted',
      issueDate: '2026-07-05',
    }),
  ];
  it('상태 필터', () => {
    expect(filterQuotes(list, 'accepted').map((q) => q.id)).toEqual(['b']);
    expect(filterQuotes(list, 'all')).toHaveLength(2);
  });
  it('거래처 검색', () => {
    expect(searchQuotes(list, '가나').map((q) => q.id)).toEqual(['b']);
  });
  it('견적일 내림차순 정렬', () => {
    expect(sortQuotes(list).map((q) => q.id)).toEqual(['b', 'a']);
  });
  it('toQuoteInput 은 id 를 뺀다', () => {
    expect(toQuoteInput(quoteOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

describe('문의 → 견적 승계(순수)', () => {
  const inheritance: QuoteInheritance = {
    inquiryId: 'inq-1',
    inquiryNo: 'INQ-20260714-001',
    company: '(주)한빛소프트웨어',
    customerName: '김담당',
    body: '100석 기준 ERP 견적을 요청드립니다.',
    issueDate: '2026-07-16',
  };

  it('회사·담당자·문의내용·문의번호를 승계한다', () => {
    const quote = buildQuoteFromInquiry(inheritance);
    expect(quote.accountName).toBe('(주)한빛소프트웨어');
    expect(quote.contactName).toBe('김담당');
    expect(quote.inquiryBody).toBe('100석 기준 ERP 견적을 요청드립니다.');
    expect(quote.inquiryNo).toBe('INQ-20260714-001');
    expect(quote.inquiryId).toBe('inq-1');
  });
  it('견적번호는 승계하지 않는다 — 저장 시 자동 채번한다', () => {
    expect(buildQuoteFromInquiry(inheritance).quoteNo).toBe('');
  });
  it('품목이 비어 있으므로 작성중으로 시작한다(발송 아님)', () => {
    const quote = buildQuoteFromInquiry(inheritance);
    expect(quote.status).toBe('draft');
    expect(quote.items).toHaveLength(0);
  });
  it('유효기간은 견적일 + 30일이다', () => {
    expect(buildQuoteFromInquiry(inheritance).validUntil).toBe('2026-08-15');
  });
  it('문의가 갖지 않는 값(사업자번호·대표자)은 비워 둔다', () => {
    const quote = buildQuoteFromInquiry(inheritance);
    expect(quote.accountBizNo).toBe('');
    expect(quote.accountCeo).toBe('');
  });
  it('승계 견적은 잠금 대상이고, 수동 견적은 아니다', () => {
    expect(isInherited(buildQuoteFromInquiry(inheritance))).toBe(true);
    expect(isInherited({ inquiryId: '' })).toBe(false);
  });
});

describe('날짜 더하기(순수)', () => {
  it('월 경계를 넘긴다', () => {
    expect(addDays('2026-07-16', QUOTE_VALID_DAYS)).toBe('2026-08-15');
  });
  it('연 경계를 넘긴다', () => {
    expect(addDays('2026-12-20', 30)).toBe('2027-01-19');
  });
  it('윤년 2월을 센다', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('해석할 수 없는 날짜는 그대로 돌려준다', () => {
    expect(addDays('', 30)).toBe('');
  });
});

/**
 * 신규 등록 폼이 실제로 제출하는 값.
 *
 * **빈 폼(EMPTY_QUOTE_FORM)에서 출발해 사람이 채울 수 있는 칸만 채운다.** 값을 처음부터 다 적어 두면
 * 실제 제출 경로를 타지 않는다 — quoteNo 는 폼에서 readOnly 라 사용자가 채울 방법이 없는데도, 테스트가
 * 제 사본에 번호를 적어 넣는 바람에 "readOnly + required 라 등록이 영영 불가능" 한 교착을 놓쳤다.
 */
function valuesOf(overrides: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    ...EMPTY_QUOTE_FORM,
    accountName: '(주)테스트',
    accountBizNo: '124-81-00998',
    accountCeo: '김대표',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    items: [{ id: 'a', name: '품목A', spec: '', quantity: 2, unitPrice: 1500 }],
    ...overrides,
  };
}

function messageFor(values: QuoteFormValues, path: string): string | undefined {
  const result = quoteSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('quoteSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(quoteSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('거래처가 비면 막는다', () => {
    expect(messageFor(valuesOf({ accountName: '' }), 'accountName')).toContain('입력');
  });
  it('품목이 없으면 막는다', () => {
    expect(messageFor(valuesOf({ items: [] }), 'items')).toContain('한 개');
  });
  it('수량이 0이면 막는다', () => {
    expect(
      messageFor(
        valuesOf({ items: [{ id: 'a', name: '품목', spec: '', quantity: 0, unitPrice: 100 }] }),
        'items',
      ),
    ).toContain('수량');
  });
  it('유효기간이 견적일보다 빠르면 막는다', () => {
    expect(
      messageFor(valuesOf({ issueDate: '2026-08-09', validUntil: '2026-07-10' }), 'validUntil'),
    ).toContain('빠를');
  });
});

describe('quoteSchema — 견적번호는 자동 채번이라 요구하지 않는다', () => {
  // [교착 회귀] 폼의 견적번호는 readOnly 다(사용자가 채울 수단이 없다). 검증이 그 값을 요구하면
  // 신규 등록은 영구 불가능해지고, 게다가 화면에 오류를 띄울 필드도 아니라 **조용히** 실패한다.
  it('빈 견적번호로도 신규 등록이 통과한다 — 사용자가 채울 수 없는 값을 요구하지 않는다', () => {
    expect(EMPTY_QUOTE_FORM.quoteNo).toBe('');
    expect(quoteSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('견적번호 때문에 막히지 않는다 — 어떤 이슈도 quoteNo 를 가리키지 않는다', () => {
    expect(messageFor(valuesOf(), 'quoteNo')).toBeUndefined();
  });

  it('수정 시 기존 번호를 실어 보내도 통과한다 (보존 경로)', () => {
    expect(quoteSchema.safeParse(valuesOf({ quoteNo: 'Q-20260710-001' })).success).toBe(true);
  });

  // 빈 값이 검증을 통과하는 것만으로는 부족하다 — 저장소가 실제로 번호를 붙여 줘야 등록이 완결된다.
  it('빈 견적번호는 데이터소스가 견적일+순번으로 채운다', () => {
    expect(makeQuoteNo('2026-07-10', 4)).toBe('Q-20260710-004');
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을
  // 통과시켰다(Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 주면 막는다', () => {
    expect(messageFor(valuesOf({ issueDate: '2026-02-31' }), 'issueDate')).toContain('YYYY-MM-DD');
  });
});
