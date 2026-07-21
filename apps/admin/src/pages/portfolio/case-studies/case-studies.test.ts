// 성공 사례 동작 회귀 테스트 — 정렬·필터·업종 라벨(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { parseFilter } from '../../../shared/crud';
import {
  CASE_FILTER_ALL,
  CASE_INDUSTRY_OPTIONS,
  filterCaseStudies,
  industryLabel,
  industryTone,
  MAX_CASE_IMAGES,
  sortCaseStudies,
  toCaseStudyInput,
} from './types';
import type { CaseFilter, CaseStudy } from './types';

/** 화면(CaseStudyListPage)이 URL 값을 좁힐 때 쓰는 허용값과 같은 목록 */
const CASE_FILTER_VALUES: readonly CaseFilter[] = [
  CASE_FILTER_ALL,
  ...CASE_INDUSTRY_OPTIONS.map((option) => option.id),
];
import { caseStudySchema } from './validation';
import type { CaseStudyFormValues } from './validation';

function itemOf(overrides: Partial<CaseStudy> & { id: string }): CaseStudy {
  return {
    title: '제목',
    industry: 'manufacturing',
    client: '다온정밀',
    challenge: '과제',
    solution: '해결',
    result: '성과',
    coverImageUrl: 'blob:cover',
    imageUrls: [],
    published: true,
    date: '2023-01-01',
    ...overrides,
  };
}

const SAMPLE: readonly CaseStudy[] = [
  itemOf({ id: 'a', industry: 'manufacturing', date: '2024-04-30' }),
  itemOf({ id: 'b', industry: 'retail', date: '2024-01-22' }),
  itemOf({ id: 'c', industry: 'manufacturing', date: '2023-09-14' }),
];

describe('sortCaseStudies — 일자 내림차순(순수)', () => {
  it('최근 일자가 위로 온다', () => {
    expect(sortCaseStudies(SAMPLE).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterCaseStudies — 업종 필터(순수)', () => {
  it('전체는 모두 돌려준다', () => {
    expect(filterCaseStudies(SAMPLE, 'all').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('제조만', () => {
    expect(filterCaseStudies(SAMPLE, 'manufacturing').map((x) => x.id)).toEqual(['a', 'c']);
  });
});

describe('industryLabel · industryTone', () => {
  it('업종 라벨과 색 의도를 돌려준다', () => {
    expect(industryLabel('finance')).toBe('금융');
    expect(industryLabel('it')).toBe('IT·서비스');
    expect(industryTone('finance')).toBe('success');
  });
});

describe('toCaseStudyInput — 항목 → 폼 입력', () => {
  it('id 를 뺀 입력을 만든다', () => {
    const input = toCaseStudyInput(itemOf({ id: 'a', title: '전환 사례' }));
    expect(input).not.toHaveProperty('id');
    expect(input.title).toBe('전환 사례');
  });
});

function valuesOf(overrides: Partial<CaseStudyFormValues> = {}): CaseStudyFormValues {
  return {
    title: '스마트팩토리 전환',
    industry: 'manufacturing',
    client: '다온정밀',
    challenge: '수작업 검사로 불량 유출',
    solution: '비전 검사 도입',
    result: '불량률 52% 감축',
    date: '2024-04-30',
    coverImageUrl: 'blob:cover',
    imageUrls: [],
    published: true,
    ...overrides,
  };
}

function messageFor(
  values: CaseStudyFormValues,
  field: keyof CaseStudyFormValues,
): string | undefined {
  const result = caseStudySchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('caseStudySchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(caseStudySchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('과제·해결·성과가 비면 막는다', () => {
    expect(messageFor(valuesOf({ challenge: '' }), 'challenge')).toContain('입력');
    expect(messageFor(valuesOf({ solution: '  ' }), 'solution')).toContain('입력');
    expect(messageFor(valuesOf({ result: '' }), 'result')).toContain('입력');
  });

  it('업종이 enum 밖이면 막는다', () => {
    expect(
      messageFor(valuesOf({ industry: 'other' as CaseStudyFormValues['industry'] }), 'industry'),
    ).toContain('선택');
  });

  it('대표 이미지가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ coverImageUrl: '' }), 'coverImageUrl')).toContain('등록');
  });

  it('본문 이미지가 최대 장수를 넘으면 막는다', () => {
    const many = Array.from({ length: MAX_CASE_IMAGES + 1 }, (_, i) => `blob:${String(i)}`);
    expect(messageFor(valuesOf({ imageUrls: many }), 'imageUrls')).toContain('최대');
  });
});

/* ── URL 이 소유하는 업종 필터 (IA-13) ───────────────────────────────────── */

describe('업종 필터의 URL 값 해석 — parseFilter', () => {
  it('알고 있는 업종은 그대로 통과한다 — ?industry=manufacturing 링크가 살아 있어야 한다', () => {
    for (const option of CASE_INDUSTRY_OPTIONS) {
      expect(parseFilter(option.id, CASE_FILTER_VALUES, CASE_FILTER_ALL)).toBe(option.id);
    }
  });

  it('손으로 고친 값·오탈자는 전체로 되돌린다 (빈 화면 대신 전체를 보여준다)', () => {
    expect(parseFilter('거짓말', CASE_FILTER_VALUES, CASE_FILTER_ALL)).toBe(CASE_FILTER_ALL);
    expect(parseFilter('', CASE_FILTER_VALUES, CASE_FILTER_ALL)).toBe(CASE_FILTER_ALL);
  });

  it("'전체'도 허용값이다 — URL 에 남아 있어도 통과한다", () => {
    expect(parseFilter(CASE_FILTER_ALL, CASE_FILTER_VALUES, CASE_FILTER_ALL)).toBe(CASE_FILTER_ALL);
  });
});
