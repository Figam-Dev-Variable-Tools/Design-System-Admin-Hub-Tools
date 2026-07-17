// 회사 정보 데이터 소스 어댑터
//
// [백엔드 연동 지점] store 의 fetch/save 본문이 프론트 ↔ 백엔드 계약이다. 지금은 픽스처를 돌려준다.
// 백엔드가 붙으면 아래 두 // TODO(backend) 자리를 실제 HTTP 로 바꾸고 화면 코드는 그대로 둔다.
//
// [더미] 실명·실제 회사명 금지 — 가상 회사/문서용 URL(cdn.example.com)만 쓴다.
import { createDocumentStore } from '../../../shared/crud';
import type { CompanyProfile } from './types';

const PROFILE_SEED: CompanyProfile = {
  companyName: '주식회사 예시플래닝',
  businessNumber: '123-45-67890',
  address: '서울특별시 예시구 가상대로 123, 예시타워 8층',
  ceoName: '홍길동',
  contact: '02-0000-0000',
  logoUrl: 'https://cdn.example.com/company/logo.png',
};

export const companyProfileKey = ['company', 'profile'] as const;

// TODO(backend): GET /api/company/profile  ·  PUT /api/company/profile
export const companyProfileStore = createDocumentStore<CompanyProfile>('profile', PROFILE_SEED);
