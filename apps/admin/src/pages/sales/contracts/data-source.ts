// 계약 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/sales/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 실제 연동 시 // TODO(backend)
// 로 어댑터 본문만 교체하고 화면은 그대로 둔다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortContracts } from './types';
import type { Contract, ContractInput } from './types';

const CONTRACT_SEED: readonly Contract[] = [
  {
    id: 'ct-1',
    title: '2026년 SaaS 연간 이용계약',
    accountName: '(주)한빛소프트웨어',
    contractType: 'license',
    startAt: '2026-01-01',
    endAt: '2026-12-31',
    amount: 36000000,
    vatIncluded: false,
    autoRenew: true,
    renewNoticeDays: 30,
    status: 'active',
    signStatus: 'signed',
    ownerName: '김영업',
    attachments: [],
    terms: '연간 라이선스 12개월, 계정 100석 기준. 미납 시 서비스 일시중지 조항 포함.',
    note: '',
  },
  {
    id: 'ct-2',
    title: '전산시스템 유지보수 계약',
    accountName: '대성물산 주식회사',
    contractType: 'maintenance',
    startAt: '2026-03-01',
    endAt: '2027-02-28',
    amount: 18000000,
    vatIncluded: true,
    autoRenew: false,
    renewNoticeDays: 0,
    status: 'review',
    signStatus: 'sent',
    ownerName: '박계약',
    attachments: [],
    terms: '월 1회 정기점검, 장애 대응 SLA 4시간. 부가세 포함 금액.',
    note: '법무 검토 회신 대기.',
  },
  {
    id: 'ct-3',
    title: '용역 개발 위탁계약(1차)',
    accountName: '미래테크놀로지',
    contractType: 'service',
    startAt: '2025-09-01',
    endAt: '2026-02-28',
    amount: 24000000,
    vatIncluded: false,
    autoRenew: false,
    renewNoticeDays: 0,
    status: 'expired',
    signStatus: 'signed',
    ownerName: '이수주',
    attachments: [],
    terms: '착수금 30% / 중도금 40% / 잔금 30%. 산출물 검수 후 잔금 지급.',
    note: '',
  },
];

let seq = CONTRACT_SEED.length;

// TODO(backend): GET/POST /api/sales/contracts · GET/PUT/DELETE /api/sales/contracts/:id
export const contractAdapter = createCrudAdapter<Contract, ContractInput>({
  scope: 'sales-contracts',
  seed: CONTRACT_SEED,
  build: (input) => {
    seq += 1;
    return { id: `ct-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortContracts,
});
