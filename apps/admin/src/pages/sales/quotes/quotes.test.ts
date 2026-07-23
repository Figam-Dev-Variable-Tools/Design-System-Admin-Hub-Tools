// 견적 동작 회귀 테스트 — 공급가액·부가세(라인별 반올림 합산)·수주전환·필터(순수) + 폼 검증
//   + 문의 승계(자동 생성 견적의 승계 필드·잠금·중복 발행 방지)
//   + 견적서 공급자(자사) 정보의 출처 — 회사 정보 주입과 폴백
import { afterEach, describe, expect, it } from 'vitest';

// 공급자 조회기의 **계약**만 여기서 본다. 회사 정보 문서가 실제로 이 조회기에 닿는지는
// 배선 지점의 테스트가 본다(src/wiring.test.ts) — 이 파일에서 pages/company 를 import 하면
// pages/sales → pages/company 결합이라 code-quality 축1 이 잡는다(테스트 파일도 스캔 대상이다).
import {
  registerSupplierLookup,
  resetSupplierLookup,
  SUPPLIER_FALLBACK,
} from '../../../shared/domain/supplier';
import {
  addDays,
  buildQuoteFromSources,
  computeTotals,
  filterQuotes,
  isInherited,
  lineSupply,
  makeQuoteNo,
  QUOTE_CONVERT_DONE,
  QUOTE_CONVERT_NOT_ACCEPTED,
  QUOTE_MANUAL_STATUSES,
  QUOTE_STATUS_NEXT_IS_CONTRACT,
  QUOTE_VALID_DAYS,
  quoteConvertBlock,
  quoteOrderDriftBlock,
  quoteSourceHref,
  quoteStatusAlready,
  quoteStatusChangeBlock,
  quoteStatusTerminal,
  quoteStatusTransitions,
  quoteSupplier,
  searchQuotes,
  sortQuotes,
  toQuoteInput,
} from './types';
import type { Quote, QuoteLineItem } from './types';
import type { QuoteIssueSource } from '../../../shared/domain/quote-issue';
import { EMPTY_QUOTE_FORM, quoteSchema } from './validation';
import type { QuoteFormValues } from './validation';

const items: readonly QuoteLineItem[] = [
  { id: 'a', name: '품목A', spec: '', quantity: 2, unitPrice: 1500 },
  { id: 'b', name: '품목B', spec: '', quantity: 1, unitPrice: 999 },
];

function quoteOf(overrides: Partial<Quote> & { id: string }): Quote {
  return {
    quoteNo: 'Q-20260710-001',
    accountId: 'acc-1',
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
    sources: [],
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

/* ── 상태 전이표 ──────────────────────────────────────────────────────────────
 *
 * [무엇을 지키나] 견적 상세의 상태 버튼과 저장 경로가 **같은 술어**를 읽는다. 그래서 여기 고정하는
 * 것은 화면이 아니라 규칙이다 — 표가 바뀌면 두 곳이 함께 바뀐다.
 *
 * `canConvertToOrder` 가 있던 자리다. 그 함수는 사라졌지만 그것이 지키던 규칙('승인된 견적만
 * 수주가 된다')은 사라지지 않았다 — 아래 '수주 되돌려 쓰기 가드' 가 같은 규칙을 지킨다. */
describe('상태 전이표(순수)', () => {
  it('작성중 → 발송만 열려 있다', () => {
    expect(quoteStatusTransitions('draft')).toEqual(['sent']);
    expect(quoteStatusChangeBlock('draft', 'sent')).toBeNull();
  });
  it('발송 → 승인·반려 두 갈래', () => {
    expect(quoteStatusChangeBlock('sent', 'accepted')).toBeNull();
    expect(quoteStatusChangeBlock('sent', 'rejected')).toBeNull();
  });
  /* 되돌리는 전이를 열면 '계약이 이미 생긴 견적을 되돌리면 무엇이 되는가' 에 답해야 한다.
     답할 수 없으므로 막는다 — 그 판단을 여기 못 박는다. */
  it('되돌리는 전이는 전부 막힌다 — 승인·수주에서 발송으로 돌아갈 수 없다', () => {
    expect(quoteStatusChangeBlock('accepted', 'sent')).toBe(QUOTE_STATUS_NEXT_IS_CONTRACT);
    expect(quoteStatusChangeBlock('ordered', 'sent')).toBe(quoteStatusTerminal('ordered'));
    expect(quoteStatusChangeBlock('ordered', 'accepted')).toBe(quoteStatusTerminal('ordered'));
  });
  it('반려·만료는 종점이다', () => {
    expect(quoteStatusTransitions('rejected')).toEqual([]);
    expect(quoteStatusChangeBlock('rejected', 'sent')).toBe(quoteStatusTerminal('rejected'));
    expect(quoteStatusChangeBlock('expired', 'accepted')).toBe(quoteStatusTerminal('expired'));
  });
  it('건너뛰는 전이는 지금 갈 수 있는 곳을 알려 준다 — 거절은 boolean 이 아니라 문장이다', () => {
    const blocked = quoteStatusChangeBlock('draft', 'accepted');
    expect(blocked).not.toBeNull();
    expect(blocked).toContain('승인');
    expect(blocked).toContain('발송');
  });
  it('같은 상태로 바꾸는 것은 이미 그 상태라고 말한다', () => {
    expect(quoteStatusChangeBlock('sent', 'sent')).toBe(quoteStatusAlready('sent'));
  });
  /* `ordered` 가 손으로 고르는 칸에 섞이면 '계약 없는 수주 견적' 을 사람이 만들 수 있게 된다 —
     그러면 청구가 계약 없이 열린다(../billing/types 규칙 ③ 의 근거가 무너진다). */
  it('수주(계약 진행)는 사람이 고르는 칸이 아니다 — 계약이 만든다', () => {
    expect(QUOTE_MANUAL_STATUSES).not.toContain('ordered');
    expect(QUOTE_MANUAL_STATUSES).toEqual(['sent', 'accepted', 'rejected']);
  });
});

/* ── 되돌려 쓰기의 어긋남 ────────────────────────────────────────────────────
 *
 * 계약은 있는데 견적 상태가 따라오지 못한 상태 — 반쪽 저장의 자국이거나 이 규칙 이전의 데이터다.
 * 화면이 조용히 정상인 척하지 않게, 그 어긋남을 규칙이 이름으로 갖고 있다. */
describe('계약 ↔ 견적 상태 어긋남', () => {
  it('계약이 없으면 어긋남도 없다 — 상태가 무엇이든', () => {
    expect(quoteOrderDriftBlock('sent', '')).toBeNull();
    expect(quoteOrderDriftBlock('draft', '')).toBeNull();
  });
  it('계약이 있고 수주면 멀쩡하다', () => {
    expect(quoteOrderDriftBlock('ordered', 'ct-1')).toBeNull();
  });
  it('계약이 있는데 승인에 머물러 있으면 그 사실을 말한다', () => {
    const drift = quoteOrderDriftBlock('accepted', 'ct-1');
    expect(drift).not.toBeNull();
    expect(drift).toContain('승인');
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
  it('toQuoteInput 은 거래처 참조(accountId)를 보존한다', () => {
    expect(toQuoteInput(quoteOf({ id: 'a', accountId: 'acc-2' })).accountId).toBe('acc-2');
  });
});

describe('문의 → 견적 승계(순수)', () => {
  const salesSource: QuoteIssueSource = {
    id: 'inq-1',
    no: 'INQ-20260714-001',
    channel: 'sales',
    accountLabel: '(주)한빛소프트웨어',
    customerName: '김담당',
    // 영업 문의는 무엇을 파는지 모른다 — 품목은 운영자가 세운다
    itemName: '',
    body: '100석 기준 ERP 견적을 요청드려요.',
  };
  const ISSUE_DATE = '2026-07-16';
  const built = () => buildQuoteFromSources([salesSource], ISSUE_DATE);

  it('회사·담당자·문의내용·문의번호를 승계한다', () => {
    const quote = built();
    expect(quote.accountName).toBe('(주)한빛소프트웨어');
    expect(quote.contactName).toBe('김담당');
    expect(quote.sources[0]?.body).toBe('100석 기준 ERP 견적을 요청드려요.');
    expect(quote.sources[0]?.no).toBe('INQ-20260714-001');
    expect(quote.sources[0]?.id).toBe('inq-1');
  });
  it('견적번호는 승계하지 않는다 — 저장 시 자동 채번한다', () => {
    expect(built().quoteNo).toBe('');
  });
  it('품목이 비어 있으므로 작성중으로 시작한다(발송 아님)', () => {
    const quote = built();
    expect(quote.status).toBe('draft');
    expect(quote.items).toHaveLength(0);
  });
  it('유효기간은 견적일 + 30일이다', () => {
    expect(built().validUntil).toBe('2026-08-15');
  });
  // 문의는 회사 **이름 문자열**만 갖는다 — 이름으로 거래처를 추측하면 동명 거래처에 남의 견적이 붙는다.
  // 그래서 미등록('')으로 시작하고, 폼이 '연결되지 않았다'는 사실과 연결 수단을 함께 보여 준다.
  it('거래처는 미등록으로 시작한다 — 이름만으로 id 를 추측하지 않는다', () => {
    expect(built().accountId).toBe('');
    expect(built().accountName).toBe('(주)한빛소프트웨어');
  });
  it('문의가 갖지 않는 값(사업자번호·대표자)은 비워 둔다', () => {
    const quote = built();
    expect(quote.accountBizNo).toBe('');
    expect(quote.accountCeo).toBe('');
  });
  it('승계 견적은 잠금 대상이고, 수동 견적은 아니다', () => {
    expect(isInherited(built())).toBe(true);
    expect(isInherited({ sources: [] })).toBe(false);
  });
});

/* ── 견적 바구니 — 여러 문의를 한 견적으로 ─────────────────────────────────────
 *
 * [무엇을 고정하나] 상품·프로그램 문의는 무엇에 대한 문의인지 알고 있어서 그 한 줄이 견적의
 * 품목이 된다. 여러 건을 합치면 그 줄들이 그대로 바구니가 되고, **원본은 전부 남는다** —
 * 하나라도 빠지면 그 문의는 견적 없이 남아 다시 발행될 수 있다. */
describe('견적 바구니 — 여러 문의 합치기(순수)', () => {
  const sourceOf = (id: string, itemName: string): QuoteIssueSource => ({
    id,
    no: id,
    channel: 'product',
    accountLabel: '김서연',
    customerName: '김서연',
    itemName,
    body: `${itemName} 문의`,
  });
  const merged = () =>
    buildQuoteFromSources(
      [sourceOf('PIQ-1', '경량 패딩 점퍼'), sourceOf('PIQ-2', '코튼 티셔츠')],
      '2026-07-16',
    );

  it('합친 문의가 모두 원본으로 남는다', () => {
    expect(merged().sources.map((source) => source.id)).toEqual(['PIQ-1', 'PIQ-2']);
  });
  it('문의마다 품목 한 줄이 생기고 단가는 0 으로 시작한다 — 금액은 운영자가 채운다', () => {
    const items = merged().items;
    expect(items.map((item) => item.name)).toEqual(['경량 패딩 점퍼', '코튼 티셔츠']);
    expect(items.every((item) => item.quantity === 1 && item.unitPrice === 0)).toBe(true);
  });
  it('라인 id 는 원본 문의 id 에서 파생한다 — 같은 문의가 두 줄이 되지 않는다', () => {
    expect(merged().items.map((item) => item.id)).toEqual(['li-PIQ-1', 'li-PIQ-2']);
  });
  it('거래처·담당자는 첫 문의를 따른다', () => {
    expect(merged().accountName).toBe('김서연');
    expect(merged().contactName).toBe('김서연');
  });
  it('품목명이 없는 문의(영업)는 줄을 만들지 않는다 — 빈 견적이 그대로 유지된다', () => {
    expect(buildQuoteFromSources([salesSourceForBasket], '2026-07-16').items).toHaveLength(0);
  });
});

const salesSourceForBasket: QuoteIssueSource = {
  id: 'inq-9',
  no: 'INQ-20260716-009',
  channel: 'sales',
  accountLabel: '(주)가상상사',
  customerName: '이담당',
  itemName: '',
  body: '견적 요청',
};

/* ── 원본 문의로 가는 역링크 ───────────────────────────────────────────────────
 *
 * [무엇이 틀려 있었나] 견적 화면 세 곳이 각자 `const INQUIRY_PATH = '/sales/inquiries'` 를 들고
 * 있었고, 그래서 상품·프로그램 문의에서 발행한 견적은 **갈 수 없는 링크**를 갖게 될 참이었다.
 * (게다가 `shared/commerce/payment-settings.ts` 에 같은 이름의 다른 상수가 이미 있었다.) */
describe('원본 문의 경로 — 창구마다 목적지가 다르다', () => {
  it('영업 문의', () => {
    expect(quoteSourceHref({ id: 'inq-1', no: 'INQ-1', channel: 'sales', body: '' })).toBe(
      '/sales/inquiries/inq-1',
    );
  });
  it('상품 문의', () => {
    expect(quoteSourceHref({ id: 'PIQ-1', no: 'PIQ-1', channel: 'product', body: '' })).toBe(
      '/products/inquiries/PIQ-1',
    );
  });
  it('프로그램 문의', () => {
    expect(quoteSourceHref({ id: 'PGQ-1', no: 'PGQ-1', channel: 'program', body: '' })).toBe(
      '/programs/inquiries/PGQ-1',
    );
  });
});

/* ── 수주 되돌려 쓰기 가드 ──────────────────────────────────────────────────────
 *
 * 사람이 부르는 술어가 아니다 — 계약이 만들어질 때 견적 저장소가 읽는다(./data-source 의
 * markQuoteOrdered). 거절 사유가 문자열인 이유는 반쪽 저장이 났을 때 화면이 **왜** 못 바꿨는지를
 * 자기 문장으로 지어내지 않게 하기 위해서다. */
describe('수주 되돌려 쓰기 가드', () => {
  it('승인된 견적만 수주가 된다', () => {
    expect(quoteConvertBlock('accepted')).toBeNull();
  });
  it('이미 수주면 그 사실을 이유로 돌려준다 — 되돌리는 전이는 없다', () => {
    expect(quoteConvertBlock('ordered')).toBe(QUOTE_CONVERT_DONE);
  });
  it('작성중·발송·반려·만료는 막는다', () => {
    for (const status of ['draft', 'sent', 'rejected', 'expired'] as const) {
      expect(quoteConvertBlock(status)).toBe(QUOTE_CONVERT_NOT_ACCEPTED);
    }
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
    accountId: 'acc-1',
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
  // 문의 → 견적 자동 발행은 accountId 없이 시작한다 — 여기서 요구하면 그 경로가 통째로 막힌다
  it('accountId 가 비어도(미등록 거래처) 통과한다', () => {
    expect(quoteSchema.safeParse(valuesOf({ accountId: '' })).success).toBe(true);
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

/* ── 공급자(자사) 정보 — 회사 정보에서 온다 ─────────────────────────────────────
 *
 * [무엇이 틀려 있었나] 견적서 상단의 공급자 블록은 이 폴더 안에 하드코딩된 상수였다.
 * 회사 정보 화면에는 다른 회사가 저장돼 있었고, 그래서 **회사 정보를 고쳐도 인쇄되는 견적서는
 * 바뀌지 않았다.** 두 화면이 같은 사실을 다르게 말했고, 종이에 나가는 쪽이 아무도 고칠 수 없는
 * 쪽이었다.
 *
 * [무엇을 고정하는가] ① 배선이 있으면 회사 정보가 그대로 인쇄된다 ② 배선이 없으면 그럴듯한
 * 회사가 아니라 '미등록' 자리표시가 나온다 — 폴백이 진짜처럼 보이면 그대로 발송된다. */
describe('견적서 공급자 — 회사 정보 주입과 폴백', () => {
  afterEach(() => {
    resetSupplierLookup();
  });

  it('배선이 없으면 폴백이다 — 그리고 그것이 폴백임이 값에서 읽힌다', () => {
    resetSupplierLookup();
    const supplier = quoteSupplier();
    expect(supplier).toBe(SUPPLIER_FALLBACK);
    expect(supplier.name).toContain('미등록');
    // 어떤 실제 사업자번호와도 겹치지 않는 값이라 '진짜 회사' 로 오인되지 않는다
    expect(supplier.bizNo).toBe('000-00-00000');
  });

  it('회사 정보를 꽂으면 그 값이 그대로 견적서 공급자가 된다', () => {
    registerSupplierLookup(() => ({
      name: '주식회사 예시플래닝',
      bizNo: '123-45-67890',
      ceoName: '홍길동',
      address: '서울특별시 예시구 가상대로 123',
      phone: '02-0000-0000',
    }));

    expect(quoteSupplier().name).toBe('주식회사 예시플래닝');
    expect(quoteSupplier().bizNo).toBe('123-45-67890');
  });

  /** 회사 정보는 운영 중에 바뀐다 — 모듈 로드 시점에 얼려 두면 저장이 견적서에 나타나지 않는다 */
  it('조회할 때마다 지금 값을 읽는다 — 저장한 회사 정보가 다음 인쇄에 곧바로 반영된다', () => {
    let companyName = '이전 상호';
    registerSupplierLookup(() => ({
      name: companyName,
      bizNo: '111-11-11111',
      ceoName: '대표',
      address: '주소',
      phone: '전화',
    }));
    expect(quoteSupplier().name).toBe('이전 상호');

    companyName = '바뀐 상호';
    expect(quoteSupplier().name).toBe('바뀐 상호');
  });

  it('조회기가 던지거나 아직 모르면 견적서를 세우지 않고 폴백으로 그린다', () => {
    registerSupplierLookup(() => {
      throw new Error('회사 정보 조회 사고');
    });
    expect(quoteSupplier()).toBe(SUPPLIER_FALLBACK);

    registerSupplierLookup(() => null);
    expect(quoteSupplier()).toBe(SUPPLIER_FALLBACK);
  });
});
