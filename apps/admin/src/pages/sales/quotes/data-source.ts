// 견적 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/sales/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 실제 연동 시 // TODO(backend)
// 로 어댑터 본문만 교체하고 화면은 그대로 둔다. 견적번호는 build 에서 견적일+순번으로 자동 부여한다.
import { createCrudAdapter } from '../../../shared/crud';
import { makeQuoteNo, sortQuotes } from './types';
import type { Quote, QuoteInput } from './types';

const QUOTE_SEED: readonly Quote[] = [
  {
    id: 'qt-1',
    quoteNo: 'Q-20260710-001',
    accountName: '(주)한빛소프트웨어',
    accountBizNo: '124-81-00998',
    accountCeo: '김한빛',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items: [
      { id: 'li-1', name: 'ERP 라이선스(연간)', spec: '100석', quantity: 1, unitPrice: 24000000 },
      { id: 'li-2', name: '초기 구축 컨설팅', spec: '4주', quantity: 1, unitPrice: 6000000 },
    ],
    status: 'sent',
    note: '유효기간 내 발주 시 구축비 10% 할인 가능.',
  },
  {
    id: 'qt-2',
    quoteNo: 'Q-20260705-001',
    accountName: '대성물산 주식회사',
    accountBizNo: '220-81-62517',
    accountCeo: '정대성',
    issueDate: '2026-07-05',
    validUntil: '2026-07-25',
    taxMode: 'standard',
    items: [
      { id: 'li-3', name: '사무기기 유지보수', spec: '월 정기', quantity: 12, unitPrice: 300000 },
    ],
    status: 'accepted',
    note: '',
  },
  {
    id: 'qt-3',
    quoteNo: 'Q-20260620-002',
    accountName: '미래테크놀로지',
    accountBizNo: '120-81-47521',
    accountCeo: '오미래',
    issueDate: '2026-06-20',
    validUntil: '2026-07-05',
    taxMode: 'zero_rated',
    items: [
      { id: 'li-4', name: '수출용 부품 설계', spec: 'Rev.A', quantity: 3, unitPrice: 1500000 },
    ],
    status: 'expired',
    note: '영세율 적용(수출).',
  },
];

let seq = QUOTE_SEED.length;

// TODO(backend): GET/POST /api/sales/quotes · GET/PUT/DELETE /api/sales/quotes/:id
//   · POST /api/sales/quotes/:id/convert (수주 전환 — 견적을 수주(주문)로 복사)
export const quoteAdapter = createCrudAdapter<Quote, QuoteInput>({
  scope: 'sales-quotes',
  seed: QUOTE_SEED,
  build: (input) => {
    seq += 1;
    // 견적번호가 비어 있으면(신규) 견적일+순번으로 자동 부여한다.
    const quoteNo = input.quoteNo.trim() === '' ? makeQuoteNo(input.issueDate, seq) : input.quoteNo;
    return { id: `qt-${String(seq)}`, ...input, quoteNo };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortQuotes,
});
