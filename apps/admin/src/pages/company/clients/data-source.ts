// 고객사 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/company/clients/**)
//
// 파트너사와 동일한 로고 목록 공용 어댑터를 고객사 시드로 쓴다.
// [더미] 실명·실제 회사명 금지 — 가상 회사/문서용 URL 만.
import { createLogoAdapter } from '../logo-list/adapter';
import type { LogoItem } from '../logo-list/types';

const CLIENT_SEED: readonly LogoItem[] = [
  {
    id: 'clients-1',
    name: '예시전자',
    logoUrl: 'https://cdn.example.com/clients/c1.png',
    linkUrl: 'https://example.com/c1',
    order: 1,
    active: true,
  },
  {
    id: 'clients-2',
    name: '가상은행',
    logoUrl: 'https://cdn.example.com/clients/c2.png',
    linkUrl: '',
    order: 2,
    active: false,
  },
  {
    id: 'clients-3',
    name: '샘플리테일',
    logoUrl: 'https://cdn.example.com/clients/c3.png',
    linkUrl: 'https://example.com/c3',
    order: 3,
    active: true,
  },
];

// TODO(backend): GET/POST /api/company/clients · PUT/DELETE /api/company/clients/:id · PUT /api/company/clients/reorder · PATCH /api/company/clients/:id/active
export const clientsAdapter = createLogoAdapter('clients', CLIENT_SEED);
