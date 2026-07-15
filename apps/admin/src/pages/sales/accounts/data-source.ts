// 거래처 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/sales/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 실제 연동 시 // TODO(backend)
// 로 어댑터 본문만 교체하고 화면은 그대로 둔다. 사업자번호는 국세청 체크섬을 통과하는 값으로 시드한다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortAccounts } from './types';
import type { Account, AccountInput } from './types';

const ACCOUNT_SEED: readonly Account[] = [
  {
    id: 'acc-1',
    name: '(주)한빛소프트웨어',
    bizNo: '124-81-00998',
    ceoName: '김한빛',
    bizType: '서비스',
    bizItem: '소프트웨어 개발',
    tradeType: 'sales',
    taxType: 'general',
    creditGrade: 'A',
    creditLimit: 50000000,
    paymentTerm: 'net_30',
    address: '서울특별시 강남구 테헤란로 123, 8층',
    phone: '02-1234-5678',
    contacts: [
      {
        id: 'ct-1',
        name: '이영업',
        department: '구매팀',
        position: '팀장',
        phone: '010-1111-2222',
        email: 'lee@hanbit.example',
        primary: true,
      },
      {
        id: 'ct-2',
        name: '박담당',
        department: '개발팀',
        position: '대리',
        phone: '010-3333-4444',
        email: 'park@hanbit.example',
        primary: false,
      },
    ],
    active: true,
    lastTradeAt: '2026-07-10',
    note: '연간 유지보수 계약 갱신 예정 거래처.',
  },
  {
    id: 'acc-2',
    name: '대성물산 주식회사',
    bizNo: '220-81-62517',
    ceoName: '정대성',
    bizType: '도소매',
    bizItem: '사무기기',
    tradeType: 'purchase',
    taxType: 'general',
    creditGrade: 'B',
    creditLimit: 20000000,
    paymentTerm: 'eom',
    address: '경기도 성남시 분당구 판교로 45',
    phone: '031-777-8888',
    contacts: [
      {
        id: 'ct-3',
        name: '최구매',
        department: '영업부',
        position: '과장',
        phone: '010-5555-6666',
        email: 'choi@daesung.example',
        primary: true,
      },
    ],
    active: true,
    lastTradeAt: '2026-06-28',
    note: '',
  },
  {
    id: 'acc-3',
    name: '미래테크놀로지',
    bizNo: '120-81-47521',
    ceoName: '오미래',
    bizType: '제조',
    bizItem: '전자부품',
    tradeType: 'both',
    taxType: 'general',
    creditGrade: 'C',
    creditLimit: 10000000,
    paymentTerm: 'net_60',
    address: '인천광역시 연수구 송도과학로 32',
    phone: '032-555-1212',
    contacts: [
      {
        id: 'ct-4',
        name: '한재무',
        department: '재무팀',
        position: '차장',
        phone: '010-7777-8888',
        email: '',
        primary: true,
      },
    ],
    active: false,
    lastTradeAt: '2026-03-15',
    note: '여신 한도 초과 이력 있음 — 거래 재개 전 검토 필요.',
  },
];

let seq = ACCOUNT_SEED.length;

// TODO(backend): GET/POST /api/sales/accounts · GET/PUT/DELETE /api/sales/accounts/:id
export const accountAdapter = createCrudAdapter<Account, AccountInput>({
  scope: 'sales-accounts',
  seed: ACCOUNT_SEED,
  build: (input) => {
    seq += 1;
    return { id: `acc-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortAccounts,
});
