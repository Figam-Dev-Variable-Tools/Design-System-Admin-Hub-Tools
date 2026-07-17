// 인증서/특허 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 어댑터에 시드를 넣는다. 실제 연동 시 // TODO(backend) 로 교체.
// [더미] 실명·실제 회사명 금지 — 가상 기관/문서용 URL(cdn.example.com)만.
import { createCrudAdapter } from '../../../shared/crud';
import { sortCertificates } from './types';
import type { CertInput, CertItem } from './types';

const CERT_SEED: readonly CertItem[] = [
  {
    id: 'cert-1',
    name: 'ISO 9001 품질경영시스템 인증',
    issuer: '예시인증원',
    issuedOn: '2023-04-12',
    kind: 'certificate',
    imageUrl: 'https://cdn.example.com/certs/iso9001.png',
  },
  {
    id: 'cert-2',
    name: '공간 배치 최적화 방법 특허',
    issuer: '특허청(예시)',
    issuedOn: '2022-09-01',
    kind: 'patent',
    imageUrl: 'https://cdn.example.com/certs/patent-01.png',
  },
  {
    id: 'cert-3',
    name: '기업부설연구소 인정서',
    issuer: '예시산업진흥원',
    issuedOn: '2021-06-20',
    kind: 'certificate',
    imageUrl: 'https://cdn.example.com/certs/rnd.png',
  },
];

let seq = CERT_SEED.length;

// TODO(backend): GET/POST /api/company/certificates · GET/PUT/DELETE /api/company/certificates/:id
export const certificatesAdapter = createCrudAdapter<CertItem, CertInput>({
  scope: 'certificates',
  seed: CERT_SEED,
  build: (input) => {
    seq += 1;
    return { id: `cert-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortCertificates,
});
