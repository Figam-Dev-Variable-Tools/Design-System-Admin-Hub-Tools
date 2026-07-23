// 채용 공고 데이터 소스 어댑터 (라우트: /company/careers)
//
// [백엔드 연동 지점] 공용 CRUD 어댑터에 시드를 넣는다. 실연동은 아래 // TODO(backend).
// [픽스처] 실명·실재 회사명 0건. 이메일 도메인은 example.com(RFC 2606 예약)만 쓴다.
//
// [픽스처가 담아야 하는 경우] 마감 판정이 **파생값**이라, 픽스처에 네 상태가 다 있어야 그
// 파생이 실제로 도는지 화면에서 볼 수 있다: 상시 채용 · 모집 중 · 이미 지난 마감일 · 비공개.
//
// [가드는 순수 규칙이 갖는다] 공개 게이트의 판정은 types.ts 의 `publishBlock` 이 하고 여기서는
// 부를 뿐이다 — 화면(스키마)이 통과시킨 것을 저장소가 거절하거나, 그 반대가 생기지 않게 한다.
import { createCrudAdapter } from '../../../shared/crud';
import type { CrudAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { formatDate, shiftDays } from '../../../shared/format';
import { publishBlock, sortCareers } from './types';
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
      '공간 배치 데이터를 다루는 어드민과 고객 화면을 함께 만들어요. 디자인 시스템 기반 개발 경험이 있으면 좋아요.',
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
    description: '신규 서비스의 화면 설계와 디자인 시스템 운영을 맡아요.',
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
    description: '영업 제안서 작성과 고객 미팅 지원 업무를 함께해요.',
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
    description: '총무·회계 지원 업무를 담당해요. 공고 문구 검토 중이에요.',
    // 비공개 저장 — 초안을 잃지 않고 다듬을 수 있어야 한다
    published: false,
  },
];

let seq = CAREER_SEED.length;

// TODO(backend): GET/POST /api/company/careers · GET/PUT/DELETE /api/company/careers/:id
//   마감 여부는 **응답에 없다** — 서버도 저장하지 않는다. 마감일과 오늘의 비교가 그 사실이다.
const baseAdapter = createCrudAdapter<Career, CareerInput>({
  scope: 'careers',
  seed: CAREER_SEED,
  build: (input) => {
    seq += 1;
    return { id: `career-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortCareers,
});

/**
 * 저장 전 마지막 문.
 *
 * 스키마가 이미 같은 판정을 하지만 여기에도 둔다 — **폼이 저장의 유일한 입구가 아니기 때문이다**
 * (목록의 인라인 수정·복제·연동 뒤의 다른 호출자). 사유는 `applyTarget` 이라는 필드 이름과 함께
 * 422 로 되돌린다: `useCrudForm` 이 `violations` 를 읽어 그 칸에 인라인 오류를 꽂고 포커스를
 * 옮긴다(EXC-07). 폼 레벨 배너로 올리면 어느 칸을 고쳐야 하는지 사용자가 찾아야 한다.
 */
function assertSavable(input: CareerInput): void {
  // 마감일 빈 문자열은 계약 밖이다 — `careerStateOf` 가 그것을 '지난 날짜' 로 읽는다(validation.ts)
  if (input.closesOn === '') {
    const message = '마감일이 비어 있어요. 날짜를 정하거나 상시 채용으로 저장하세요.';
    throw new HttpError(HTTP_STATUS.unprocessable, message, {
      violations: [{ field: 'closesOn', message }],
    });
  }

  const publish = publishBlock(input);
  if (publish !== null) {
    throw new HttpError(HTTP_STATUS.unprocessable, publish, {
      violations: [{ field: 'applyTarget', message: publish }],
    });
  }
}

export const careersAdapter: CrudAdapter<Career, CareerInput> = {
  ...baseAdapter,
  // async 라 동기 throw 가 **거절된 프라미스**로 나간다 — mutation 의 onError 가 그것을 받는다
  create: async (input, context) => {
    assertSavable(input);
    await baseAdapter.create(input, context);
  },
  update: async (id, input, context) => {
    assertSavable(input);
    await baseAdapter.update(id, input, context);
  },
};
