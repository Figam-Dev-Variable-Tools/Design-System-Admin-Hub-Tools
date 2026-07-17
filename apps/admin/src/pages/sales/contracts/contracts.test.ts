// 계약 동작 회귀 테스트 (A41) — 잔여일수·갱신임박·필터·정렬(순수) + 폼 검증(기간 역전·금액)
import { describe, expect, it } from 'vitest';

import {
  daysRemaining,
  filterContracts,
  isRenewalDue,
  searchContracts,
  sortContracts,
  toContractInput,
} from './types';
import type { Contract } from './types';
import { contractSchema } from './validation';
import type { ContractFormValues } from './validation';

function contractOf(overrides: Partial<Contract> & { id: string }): Contract {
  return {
    title: '계약',
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
});

function valuesOf(overrides: Partial<ContractFormValues> = {}): ContractFormValues {
  return {
    title: '연간 계약',
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
  it('자동갱신인데 통지기한이 숫자가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ renewNoticeDays: '한달' }), 'renewNoticeDays')).toContain('숫자');
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을 통과시켰다
  // (Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 기간으로 주면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-02-31' }), 'startAt')).toContain('YYYY-MM-DD');
  });
});
