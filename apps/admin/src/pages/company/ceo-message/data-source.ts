// CEO 인사말 데이터 소스 어댑터
//
// [백엔드 연동 지점] store 의 fetch/save 본문이 프론트 ↔ 백엔드 계약이다. 지금은 픽스처.
// [더미] 실명·실제 회사명 금지 — 가상 회사/문서용 URL 만.
import { createDocumentStore } from '../../../shared/crud';
import type { CeoMessage } from './types';

const CEO_MESSAGE_SEED: CeoMessage = {
  title: '고객과 함께 성장하는 기업이 되겠습니다',
  body:
    '안녕하십니까. 주식회사 예시플래닝을 찾아주신 여러분께 진심으로 감사드립니다.\n\n' +
    '저희는 공간 기획을 기반으로 고객의 문제를 함께 풀어 가는 것을 사명으로 삼고 있어요. ' +
    '앞으로도 정직과 신뢰를 바탕으로 더 나은 가치를 만들어 가겠습니다.\n\n대표이사 홍길동 드림',
  photoUrl: '/fixtures/placeholder-image.svg',
};

export const ceoMessageKey = ['company', 'ceo-message'] as const;

// TODO(backend): GET /api/company/ceo-message  ·  PUT /api/company/ceo-message
export const ceoMessageStore = createDocumentStore<CeoMessage>('ceo-message', CEO_MESSAGE_SEED);
