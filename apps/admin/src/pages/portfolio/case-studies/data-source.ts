// 성공 사례 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/portfolio/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 createCrudAdapter 에 시드를 넣는다(포트폴리오 항목과 달리
// 카테고리 결합이 없어 프레임워크 어댑터를 그대로 쓴다). 실제 연동 시 // TODO(backend) 로 교체.
import { createCrudAdapter } from '../../../shared/crud';
import { sortCaseStudies } from './types';
import type { CaseStudy, CaseStudyInput } from './types';

const CASE_SEED: readonly CaseStudy[] = [
  {
    id: 'cs-1',
    title: '스마트팩토리 전환으로 불량률 절반 감축',
    industry: 'manufacturing',
    client: '다온정밀',
    challenge: '수작업 검사로 불량 유출이 잦고 라인 정지가 반복됐습니다.',
    solution: '비전 검사와 실시간 대시보드를 도입해 공정을 표준화했습니다.',
    result: '6개월 만에 불량률을 52% 낮추고 라인 가동률을 18%p 끌어올렸습니다.',
    coverImageUrl: 'https://cdn.example.com/case/daon-cover.jpg',
    imageUrls: ['https://cdn.example.com/case/daon-1.jpg'],
    published: true,
    date: '2024-04-30',
  },
  {
    id: 'cs-2',
    title: '옴니채널 개편으로 재구매율 상승',
    industry: 'retail',
    client: '벨라마켓',
    challenge: '온·오프라인 재고와 고객 데이터가 단절돼 있었습니다.',
    solution: '통합 주문·재고 시스템과 멤버십을 연결했습니다.',
    result: '재구매율이 분기 대비 23% 올랐습니다.',
    coverImageUrl: 'https://cdn.example.com/case/bella-cover.jpg',
    imageUrls: [],
    published: true,
    date: '2024-01-22',
  },
  {
    id: 'cs-3',
    title: '비대면 창구 도입으로 대기시간 단축',
    industry: 'finance',
    client: '한결저축은행',
    challenge: '지점 창구 혼잡으로 고객 대기시간이 길었습니다.',
    solution: '영상 상담 창구와 사전 서류 검증을 도입했습니다.',
    result: '평균 대기시간을 14분에서 4분으로 줄였습니다.',
    coverImageUrl: 'https://cdn.example.com/case/hangyeol-cover.jpg',
    imageUrls: [],
    published: false,
    date: '2023-09-14',
  },
  {
    id: 'cs-4',
    title: '시민 참여형 민원 포털 구축',
    industry: 'public',
    client: '새빛시청',
    challenge: '민원 접수 채널이 분산돼 처리 현황을 알기 어려웠습니다.',
    solution: '단일 포털과 처리 단계 알림을 제공했습니다.',
    result: '민원 처리 만족도가 71점에서 88점으로 올랐습니다.',
    coverImageUrl: 'https://cdn.example.com/case/saebit-cover.jpg',
    imageUrls: [],
    published: true,
    date: '2023-05-08',
  },
];

let seq = CASE_SEED.length;

// TODO(backend): GET/POST /api/portfolio/case-studies · GET/PUT/DELETE /api/portfolio/case-studies/:id
export const caseStudyAdapter = createCrudAdapter<CaseStudy, CaseStudyInput>({
  scope: 'case-studies',
  seed: CASE_SEED,
  build: (input) => {
    seq += 1;
    return { id: `cs-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortCaseStudies,
});
