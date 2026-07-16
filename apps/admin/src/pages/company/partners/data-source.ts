// 파트너사 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/company/partners/**)
//
// [백엔드 연동 지점] 로고 목록 공용 어댑터(createLogoAdapter)에 파트너사 시드를 넣는다. 실제 연동 시
// 아래 // TODO(backend) 엔드포인트로 어댑터 본문을 바꾼다(화면·공용 모듈 코드는 그대로).
// [더미] 실명·실제 회사명 금지 — 가상 회사/문서용 URL(cdn.example.com)만.
import { createLogoAdapter } from '../logo-list/adapter';
import type { LogoItem } from '../logo-list/types';

const PARTNER_SEED: readonly LogoItem[] = [
  {
    id: 'partners-1',
    name: '알파클라우드',
    logoUrl: 'https://cdn.example.com/partners/alpha.png',
    linkUrl: 'https://example.com/alpha',
    order: 1,
    active: true,
  },
  {
    id: 'partners-2',
    name: '베타로지스틱스',
    logoUrl: 'https://cdn.example.com/partners/beta.png',
    linkUrl: 'https://example.com/beta',
    order: 2,
    active: true,
  },
  {
    id: 'partners-3',
    name: '감마소프트',
    logoUrl: 'https://cdn.example.com/partners/gamma.png',
    linkUrl: '',
    order: 3,
    active: false,
  },
  {
    id: 'partners-4',
    name: '델타네트웍스',
    logoUrl: 'https://cdn.example.com/partners/delta.png',
    linkUrl: 'https://example.com/delta',
    order: 4,
    active: true,
  },
];

// TODO(backend): GET/POST /api/company/partners · PUT/DELETE /api/company/partners/:id · PUT /api/company/partners/reorder · PATCH /api/company/partners/:id/active
export const partnersAdapter = createLogoAdapter('partners', PARTNER_SEED);
