// ESG 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 어댑터에 시드를 넣는다. 실제 연동 시 // TODO(backend) 로 교체.
import { createCrudAdapter } from '../../../shared/crud';
import { sortEsg } from './types';
import type { EsgInput, EsgItem } from './types';

const ESG_SEED: readonly EsgItem[] = [
  {
    id: 'esg-1',
    category: 'environment',
    title: '사옥 전력 재생에너지 전환',
    summary: '본사 사옥 전력의 60%를 재생에너지로 전환했습니다.',
    date: '2024-03-05',
    imageUrls: [
      'https://cdn.example.com/esg/solar-1.jpg',
      'https://cdn.example.com/esg/solar-2.jpg',
    ],
  },
  {
    id: 'esg-2',
    category: 'social',
    title: '지역아동센터 공간 개선 봉사',
    summary: '임직원 봉사단이 지역아동센터 학습 공간을 리모델링했습니다.',
    date: '2023-11-18',
    imageUrls: ['https://cdn.example.com/esg/volunteer.jpg'],
  },
  {
    id: 'esg-3',
    category: 'governance',
    title: '윤리경영 위원회 신설',
    summary: '사외 위원이 참여하는 윤리경영 위원회를 신설했습니다.',
    date: '2023-07-02',
    imageUrls: [],
  },
  {
    id: 'esg-4',
    category: 'environment',
    title: '전자 계약 도입으로 종이 사용 절감',
    summary: '전자 계약 시스템 도입으로 연간 종이 사용량을 40% 줄였습니다.',
    date: '2022-12-10',
    imageUrls: [],
  },
];

let seq = ESG_SEED.length;

// TODO(backend): GET/POST /api/company/esg · GET/PUT/DELETE /api/company/esg/:id
export const esgAdapter = createCrudAdapter<EsgItem, EsgInput>({
  scope: 'esg',
  seed: ESG_SEED,
  build: (input) => {
    seq += 1;
    return { id: `esg-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortEsg,
});
