// 채용 공고 데이터 소스 어댑터 (라우트: /company/careers)
//
// [백엔드 연동 지점] 공용 CRUD 어댑터에 시드를 넣는다. 실연동은 아래 // TODO(backend).
// [픽스처] 실명·실재 회사명 0건. 이메일 도메인은 example.com(RFC 2606 예약)만 쓴다.
//
// [픽스처가 담아야 하는 경우] 마감 판정이 **파생값**이라, 픽스처에 네 상태가 다 있어야 그
// 파생이 실제로 도는지 화면에서 볼 수 있다: 상시 채용 · 모집 중 · 이미 지난 마감일 · 비공개.
import { createCrudAdapter } from '../../../shared/crud';
import { formatDate, shiftDays } from '../../../shared/format';
import { sortCareers } from './types';
import type { Career, CareerInput } from './types';

/** '오늘로부터 d일 뒤' — 픽스처가 오늘에 상대적이라야 시간이 지나도 네 상태가 유지된다 */
function fromToday(days: number): string {
  return shiftDays(formatDate(new Date()), days);
}

const CAREER_SEED: readonly Career[] = [
  {
    id: 'career-1',
    title: '공간 데이터 플랫폼 프론트엔드 개발자',
    jobFunction: 'engineering',
    employmentType: 'full-time',
    location: '서울 성동구 (재택 병행)',
    // 상시 채용 — 마감일이 '없다' 는 것이 값이다(빈 문자열이 아니다)
    closesOn: null,
    applyMethod: 'email',
    applyTarget: 'recruit@example.com',
    description:
      '공간 배치 데이터를 다루는 어드민과 고객 화면을 함께 만듭니다. 디자인 시스템 기반 개발 경험이 있으면 좋습니다.',
    published: true,
  },
  {
    id: 'career-2',
    title: '프로덕트 디자이너 (신규 서비스)',
    jobFunction: 'design',
    employmentType: 'full-time',
    location: '서울 성동구',
    closesOn: fromToday(21),
    applyMethod: 'link',
    applyTarget: 'https://recruit.example.com/positions/product-designer',
    description: '신규 서비스의 화면 설계와 디자인 시스템 운영을 맡습니다.',
    published: true,
  },
  {
    id: 'career-3',
    title: '2026 상반기 영업 인턴',
    jobFunction: 'sales',
    employmentType: 'intern',
    location: '서울 성동구',
    // 이미 지난 마감일 — 아무도 손대지 않아도 목록에서 '마감' 으로 보여야 한다
    closesOn: fromToday(-9),
    applyMethod: 'email',
    applyTarget: 'recruit@example.com',
    description: '영업 제안서 작성과 고객 미팅 지원 업무를 함께합니다.',
    published: true,
  },
  {
    id: 'career-4',
    title: '경영지원 담당자',
    jobFunction: 'operations',
    employmentType: 'contract',
    location: '원격',
    closesOn: fromToday(45),
    applyMethod: 'email',
    applyTarget: 'recruit@example.com',
    description: '총무·회계 지원 업무를 담당합니다. 공고 문구 검토 중입니다.',
    // 비공개 저장 — 초안을 잃지 않고 다듬을 수 있어야 한다
    published: false,
  },
];

let seq = CAREER_SEED.length;

// TODO(backend): GET/POST /api/company/careers · GET/PUT/DELETE /api/company/careers/:id
//   마감 여부는 **응답에 없다** — 서버도 저장하지 않는다. 마감일과 오늘의 비교가 그 사실이다.
export const careersAdapter = createCrudAdapter<Career, CareerInput>({
  scope: 'careers',
  seed: CAREER_SEED,
  build: (input) => {
    seq += 1;
    return { id: `career-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortCareers,
});
