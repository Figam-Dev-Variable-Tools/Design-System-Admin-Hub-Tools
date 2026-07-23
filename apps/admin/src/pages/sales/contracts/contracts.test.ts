// 계약 동작 회귀 테스트 — 잔여일수·갱신임박·필터·정렬(순수) + 폼 검증(기간 역전·금액)
import { describe, expect, it } from 'vitest';

import {
  buildContractFromQuote,
  CONTRACT_DRAFT_DONE,
  CONTRACT_DRAFT_NOT_ACCEPTED,
  contractDraftBlock,
  daysRemaining,
  isConcludedContract,
  filterContracts,
  isRenewalDue,
  searchContracts,
  sortContracts,
  toContractInput,
} from './types';
import type { Contract } from './types';
import type { Quote } from '../quotes/types';
import { contractSchema } from './validation';
import type { ContractFormValues } from './validation';

function contractOf(overrides: Partial<Contract> & { id: string }): Contract {
  return {
    title: '계약',
    accountId: 'acc-1',
    accountName: '(주)테스트',
    contractType: 'supply',
    startAt: '2026-01-01',
    endAt: '2026-12-31',
    amount: 10000000,
    vatIncluded: false,
    autoRenew: false,
    renewNoticeDays: 0,
    status: 'active',
    signStatus: 'signed',
    ownerName: '담당',
    attachments: [],
    terms: '',
    note: '',
    quoteId: '',
    quoteNo: '',
    ...overrides,
  };
}

describe('daysRemaining · isRenewalDue(순수)', () => {
  it('종료일까지 남은 일수', () => {
    expect(daysRemaining('2026-07-20', '2026-07-10')).toBe(10);
    expect(daysRemaining('2026-07-05', '2026-07-10')).toBe(-5);
  });
  it('진행중 + 자동갱신 + 통지기한 이내면 갱신임박', () => {
    const contract = contractOf({
      id: 'a',
      autoRenew: true,
      renewNoticeDays: 30,
      endAt: '2026-07-20',
    });
    expect(isRenewalDue(contract, '2026-07-10')).toBe(true);
  });
  it('자동갱신이 아니면 갱신임박 아님', () => {
    const contract = contractOf({ id: 'a', autoRenew: false, endAt: '2026-07-20' });
    expect(isRenewalDue(contract, '2026-07-10')).toBe(false);
  });
  it('통지기한 밖이면 갱신임박 아님', () => {
    const contract = contractOf({
      id: 'a',
      autoRenew: true,
      renewNoticeDays: 5,
      endAt: '2026-08-30',
    });
    expect(isRenewalDue(contract, '2026-07-10')).toBe(false);
  });
});

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    contractOf({ id: 'a', title: '가계약', status: 'active', startAt: '2026-01-01' }),
    contractOf({ id: 'b', title: '나계약', status: 'expired', startAt: '2026-03-01' }),
  ];
  it('상태 필터', () => {
    expect(filterContracts(list, 'expired').map((c) => c.id)).toEqual(['b']);
    expect(filterContracts(list, 'all')).toHaveLength(2);
  });
  it('계약명 검색', () => {
    expect(searchContracts(list, '나계약').map((c) => c.id)).toEqual(['b']);
  });
  it('시작일 내림차순 정렬', () => {
    expect(sortContracts(list).map((c) => c.id)).toEqual(['b', 'a']);
  });
  it('toContractInput 은 id 를 뺀다', () => {
    expect(toContractInput(contractOf({ id: 'a' }))).not.toHaveProperty('id');
  });
  // 거래처 참조를 실어 나르지 못하면 저장 한 번에 연결이 끊긴다 — 목록·거래처 상세에서 조용히 빠진다
  it('toContractInput 은 거래처 참조(accountId)를 보존한다', () => {
    expect(toContractInput(contractOf({ id: 'a', accountId: 'acc-2' })).accountId).toBe('acc-2');
  });
});

function valuesOf(overrides: Partial<ContractFormValues> = {}): ContractFormValues {
  return {
    title: '연간 계약',
    accountId: 'acc-1',
    accountName: '(주)테스트',
    contractType: 'license',
    startAt: '2026-01-01',
    endAt: '2026-12-31',
    amount: '36000000',
    vatIncluded: false,
    autoRenew: true,
    renewNoticeDays: '30',
    status: 'active',
    signStatus: 'signed',
    ownerName: '김영업',
    attachments: [],
    terms: '',
    note: '',
    quoteId: '',
    quoteNo: '',
    ...overrides,
  };
}

function messageFor(values: ContractFormValues, path: string): string | undefined {
  const result = contractSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('contractSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(contractSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('계약명이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '' }), 'title')).toContain('입력');
  });
  it('금액이 0이면 막는다', () => {
    expect(messageFor(valuesOf({ amount: '0' }), 'amount')).toContain('0보다');
  });
  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-12-31', endAt: '2026-01-01' }), 'endAt')).toContain(
      '빠를',
    );
  });
  // 미등록 거래처와의 첫 계약을 막지 않는다 — 대신 폼이 그 대가를 경고로 드러낸다
  it('accountId 가 비어도(미등록 거래처) 통과한다', () => {
    expect(contractSchema.safeParse(valuesOf({ accountId: '' })).success).toBe(true);
  });
  it('자동갱신인데 통지기한이 숫자가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ renewNoticeDays: '한달' }), 'renewNoticeDays')).toContain('숫자');
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을 통과시켰다
  // (Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 기간으로 주면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-02-31' }), 'startAt')).toContain('YYYY-MM-DD');
  });
});

/* ── 견적 → 계약 ───────────────────────────────────────────────────────────────
 *
 * [무엇이 틀려 있었나] `docs/flow/mmd/03-sales-pipeline.mmd` 는 견적 → 계약 화살표를 그려 두었지만
 * 계약에는 견적을 가리키는 필드가 한 칸도 없었다. 문서와 코드가 어긋난 자리다. 이 블록이 그
 * 화살표를 코드에 존재하게 한다. */

function quoteOf(status: Quote['status'], overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'qt-9',
    quoteNo: 'Q-20260710-009',
    accountId: 'acc-1',
    accountName: '(주)가상상사',
    accountBizNo: '',
    accountCeo: '',
    contactName: '김담당',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items: [{ id: 'li-1', name: '품목', spec: '', quantity: 2, unitPrice: 500000 }],
    status,
    note: '',
    sources: [],
    ...overrides,
  };
}

/* ── 계약 생성 가드 ──────────────────────────────────────────────────────────
 *
 * [겨냥이 옮겨졌다] 예전에는 '수주 전환된 견적에서만' 이었다. 그때는 운영자가 '수주 전환' 을 먼저
 * 누르고 계약을 또 눌러야 했고, 그래서 한 사건을 두 번 누르다 한 번을 빠뜨린 견적이 생겼다.
 * 지금 수주는 **계약이 만들어진 결과**이므로 계약의 입구는 그 앞 칸인 '승인' 이다. */
describe('계약 생성 가드 — 승인된 견적에서만', () => {
  it('승인된 견적이면 통과한다 — 이것이 사슬의 입구다', () => {
    expect(contractDraftBlock('accepted', '')).toBeNull();
  });
  /* 계약이 지워졌거나 이 규칙 이전의 데이터라 상태만 수주인 견적이 있을 수 있다. 그때 문을 닫으면
     그 견적은 영원히 계약을 가질 수 없다 — 수동 등록이 막혀 있어 우회로가 없다. */
  it('계약 없는 수주 견적도 통과한다 — 막다른 골목을 만들지 않는다', () => {
    expect(contractDraftBlock('ordered', '')).toBeNull();
  });
  it('작성중·발송·반려·만료는 막는다', () => {
    for (const status of ['draft', 'sent', 'rejected', 'expired'] as const) {
      expect(contractDraftBlock(status, '')).toBe(CONTRACT_DRAFT_NOT_ACCEPTED);
    }
  });
  it('이미 계약이 있으면 막는다 — 견적 하나에 계약 하나다', () => {
    expect(contractDraftBlock('ordered', 'ct-1')).toBe(CONTRACT_DRAFT_DONE);
    expect(contractDraftBlock('accepted', 'ct-1')).toBe(CONTRACT_DRAFT_DONE);
  });
});

/* ── '계약 완료' 의 정의 ─────────────────────────────────────────────────────
 *
 * 상태 유니온에 '완료' 는 없다. 없는 상태를 만들지 않고, 이미 있는 두 사실의 교집합으로 정의했다 —
 * 근거는 ./types 의 isConcludedContract 머리말에 있다. 그 판단을 여기 못 박는다. */
describe('계약 완료 판정 — 진행중 + 서명완료', () => {
  it('진행중이고 서명이 끝났으면 완료다', () => {
    expect(isConcludedContract('active', 'signed')).toBe(true);
  });
  it('도장이 안 찍혔으면 완료가 아니다 — 검토중·일부서명도 마찬가지다', () => {
    expect(isConcludedContract('active', 'sent')).toBe(false);
    expect(isConcludedContract('active', 'partial')).toBe(false);
    expect(isConcludedContract('review', 'signed')).toBe(false);
    expect(isConcludedContract('draft', 'signed')).toBe(false);
  });
  /* '계약 완료' 는 '계약 체결 완료' 이지 '계약 종료' 가 아니다 — 끝난 계약에서 새 일을 시작하지 않는다. */
  it('만료·해지는 완료가 아니라 끝난 것이다', () => {
    expect(isConcludedContract('expired', 'signed')).toBe(false);
    expect(isConcludedContract('terminated', 'signed')).toBe(false);
  });
});

describe('견적 → 계약 승계(순수)', () => {
  it('원 견적을 가리킨다 — 이것이 문서의 화살표다', () => {
    const draft = buildContractFromQuote(quoteOf('ordered'), '2026-07-20');
    expect(draft.quoteId).toBe('qt-9');
    expect(draft.quoteNo).toBe('Q-20260710-009');
  });
  it('금액은 견적 합계(공급가액 + 세액)를 옮긴다', () => {
    expect(buildContractFromQuote(quoteOf('ordered'), '2026-07-20').amount).toBe(1100000);
  });
  /* 면세·영세율 견적의 합계에는 애초에 세액이 없다 — '부가세 포함'이라고 적으면 거짓이 된다. */
  it('부가세 포함 표기는 과세 견적일 때만 참이다', () => {
    expect(buildContractFromQuote(quoteOf('ordered'), '2026-07-20').vatIncluded).toBe(true);
    expect(
      buildContractFromQuote(quoteOf('ordered', { taxMode: 'exempt' }), '2026-07-20').vatIncluded,
    ).toBe(false);
  });
  it('거래처 참조를 승계하고 초안·미발송으로 시작한다', () => {
    const draft = buildContractFromQuote(quoteOf('ordered'), '2026-07-20');
    expect(draft.accountId).toBe('acc-1');
    expect(draft.status).toBe('draft');
    expect(draft.signStatus).toBe('unsigned');
  });
  it('기본 계약기간은 시작일 + 1년이다 — 초안의 출발값일 뿐이다', () => {
    const draft = buildContractFromQuote(quoteOf('ordered'), '2026-07-20');
    expect(draft.startAt).toBe('2026-07-20');
    expect(draft.endAt).toBe('2027-07-20');
  });
  it('초안이 계약 폼 검증을 통과한다 — 만들자마자 저장할 수 없는 초안을 만들지 않는다', () => {
    const draft = buildContractFromQuote(quoteOf('ordered'), '2026-07-20');
    const values: ContractFormValues = {
      ...draft,
      amount: String(draft.amount),
      renewNoticeDays: String(draft.renewNoticeDays),
      attachments: [...draft.attachments],
    };
    expect(contractSchema.safeParse(values).success).toBe(true);
  });
});
