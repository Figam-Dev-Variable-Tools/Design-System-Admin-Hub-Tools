// 거래처 동작 회귀 테스트 (A41) — 사업자번호 검증·필터·정렬·대표담당(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { bizNoDigits, formatBizNo, formatWon, isValidBizNo } from '../_shared/business';
import {
  filterAccounts,
  primaryContact,
  searchAccounts,
  sortAccounts,
  toAccountInput,
} from './types';
import type { Account, AccountContact } from './types';
import { accountSchema } from './validation';
import type { AccountFormValues } from './validation';

function contactOf(overrides: Partial<AccountContact> & { id: string }): AccountContact {
  return {
    name: '홍길동',
    department: '구매팀',
    position: '팀장',
    phone: '010-1111-2222',
    email: 'hong@company.example',
    primary: false,
    ...overrides,
  };
}

function accountOf(overrides: Partial<Account> & { id: string }): Account {
  return {
    name: '(주)테스트',
    bizNo: '124-81-00998',
    ceoName: '김대표',
    bizType: '서비스',
    bizItem: '소프트웨어',
    tradeType: 'sales',
    taxType: 'general',
    creditGrade: 'B',
    creditLimit: 10000000,
    paymentTerm: 'net_30',
    address: '서울',
    phone: '02-000-0000',
    contacts: [contactOf({ id: 'c1', primary: true })],
    active: true,
    lastTradeAt: '2026-07-01',
    note: '',
    ...overrides,
  };
}

describe('isValidBizNo — 사업자등록번호 체크섬(순수)', () => {
  it('국세청 체크섬을 통과하는 번호는 유효', () => {
    expect(isValidBizNo('124-81-00998')).toBe(true);
    expect(isValidBizNo('220-81-62517')).toBe(true);
    expect(isValidBizNo('1208147521')).toBe(true);
  });
  it('체크섬이 틀리면 무효', () => {
    expect(isValidBizNo('123-45-67890')).toBe(false);
  });
  it('자리수가 모자라면 무효', () => {
    expect(isValidBizNo('124-81-0099')).toBe(false);
  });
});

describe('formatBizNo · bizNoDigits — 표기(순수)', () => {
  it('3-2-5 하이픈 표기', () => {
    expect(formatBizNo('1248100998')).toBe('124-81-00998');
  });
  it('입력 중 부분 표기', () => {
    expect(formatBizNo('12481')).toBe('124-81');
  });
  it('숫자만 남긴다(최대 10자리)', () => {
    expect(bizNoDigits('124-81-00998xyz9')).toBe('1248100998');
  });
  it('원화 표기', () => {
    expect(formatWon(1200000)).toBe('1,200,000원');
  });
});

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    accountOf({ id: 'a', name: '나무상사', tradeType: 'sales' }),
    accountOf({ id: 'b', name: '가나테크', tradeType: 'purchase' }),
  ];

  it('거래유형 필터', () => {
    expect(filterAccounts(list, 'purchase').map((a) => a.id)).toEqual(['b']);
    expect(filterAccounts(list, 'all')).toHaveLength(2);
  });

  it('상호 검색', () => {
    expect(searchAccounts(list, '가나').map((a) => a.id)).toEqual(['b']);
  });

  it('사업자번호는 하이픈 무시하고 검색', () => {
    expect(
      searchAccounts(list, '1248100998')
        .map((a) => a.id)
        .sort(),
    ).toEqual(['a', 'b']);
  });

  it('상호 가나다 정렬', () => {
    expect(sortAccounts(list).map((a) => a.id)).toEqual(['b', 'a']);
  });

  it('toAccountInput 은 id 를 뺀다', () => {
    expect(toAccountInput(accountOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

describe('primaryContact — 대표담당(순수)', () => {
  it('primary 플래그를 우선한다', () => {
    const account = accountOf({
      id: 'a',
      contacts: [contactOf({ id: 'c1' }), contactOf({ id: 'c2', name: '이대표', primary: true })],
    });
    expect(primaryContact(account)?.name).toBe('이대표');
  });
  it('없으면 첫 담당자', () => {
    const account = accountOf({
      id: 'a',
      contacts: [contactOf({ id: 'c1', name: '첫째', primary: false })],
    });
    expect(primaryContact(account)?.name).toBe('첫째');
  });
});

function valuesOf(overrides: Partial<AccountFormValues> = {}): AccountFormValues {
  return {
    name: '(주)테스트',
    bizNo: '124-81-00998',
    ceoName: '김대표',
    bizType: '서비스',
    bizItem: '소프트웨어',
    tradeType: 'sales',
    taxType: 'general',
    creditGrade: 'B',
    creditLimit: '10000000',
    paymentTerm: 'net_30',
    address: '서울',
    phone: '02-000-0000',
    contacts: [
      {
        id: 'c1',
        name: '홍길동',
        department: '구매팀',
        position: '팀장',
        phone: '010-1111-2222',
        email: 'hong@company.example',
        primary: true,
      },
    ],
    active: true,
    lastTradeAt: '2026-07-01',
    note: '',
    ...overrides,
  };
}

function messageFor(values: AccountFormValues, path: string): string | undefined {
  const result = accountSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('accountSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(accountSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('상호가 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
  });
  it('사업자번호 체크섬이 틀리면 막는다', () => {
    expect(messageFor(valuesOf({ bizNo: '123-45-67890' }), 'bizNo')).toContain('사업자등록번호');
  });
  it('여신한도에 숫자가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ creditLimit: '많음' }), 'creditLimit')).toContain('숫자');
  });
  it('담당자가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ contacts: [] }), 'contacts')).toContain('한 명');
  });
  it('담당자 이메일 형식이 틀리면 막는다', () => {
    const bad = valuesOf({
      contacts: [
        {
          id: 'c1',
          name: '홍길동',
          department: '구매팀',
          position: '팀장',
          phone: '010-1111-2222',
          email: 'not-an-email',
          primary: true,
        },
      ],
    });
    expect(messageFor(bad, 'contacts')).toContain('이메일');
  });
});
