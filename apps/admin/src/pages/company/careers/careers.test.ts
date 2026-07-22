// 채용 공고의 순수 규칙 (pages/company/careers/types.ts)
//
// [무엇을 지키나] ② 마감은 저장되지 않고 **매번 계산된다** ③ 상시 채용은 1급 상태다
// ④ 지원 경로가 열리지 않는 공고는 공개되지 않는다 ⑤ 비공개 저장이 언제나 가능하다.
import { describe, expect, it } from 'vitest';

import { resetApplicationFormLookup } from '../../../shared/domain/application-form';
import type { ApplicationFormRef } from '../../../shared/domain/application-form';
import {
  applyMethodBlock,
  careerStateOf,
  closesOnText,
  filterCareers,
  publishBlock,
  searchCareers,
  sortCareers,
} from './types';
import type { Career, CareerInput } from './types';

const TODAY = '2026-07-22';

function career(overrides: Partial<Career> = {}): Career {
  return {
    id: 'career-1',
    title: '프로덕트 디자이너',
    jobFunction: 'design',
    employmentType: 'full-time',
    location: '서울 성동구',
    closesOn: '2026-08-31',
    applyMethod: 'email',
    applyTarget: 'recruit@example.com',
    description: '신규 서비스 화면 설계',
    published: true,
    ...overrides,
  };
}

/* ── ② 마감은 파생값이다 ─────────────────────────────────────────────────── */

describe('careerStateOf — 마감은 저장되지 않는다', () => {
  it('마감일이 지나면 아무도 손대지 않아도 마감이다', () => {
    expect(careerStateOf(career({ closesOn: '2026-07-21' }), TODAY)).toBe('closed');
  });

  it('마감일 당일까지는 모집 중이다 — 마지막 날을 없는 날로 만들지 않는다', () => {
    expect(careerStateOf(career({ closesOn: TODAY }), TODAY)).toBe('open');
  });

  it('앞으로 남은 공고는 모집 중이다', () => {
    expect(careerStateOf(career({ closesOn: '2026-12-31' }), TODAY)).toBe('open');
  });

  it('비공개면 마감 여부를 따지기 전에 초안이다', () => {
    expect(careerStateOf(career({ closesOn: '2020-01-01', published: false }), TODAY)).toBe(
      'draft',
    );
  });
});

/* ── ③ 상시 채용은 1급이다 ───────────────────────────────────────────────── */

describe('상시 채용', () => {
  it('마감일 null 은 상시 채용이며 닫히지 않는다', () => {
    expect(careerStateOf(career({ closesOn: null }), TODAY)).toBe('always');
    expect(careerStateOf(career({ closesOn: null }), '2099-01-01')).toBe('always');
  });

  it('목록에는 날짜 대신 그 사실을 적는다 — 빈 칸을 만들지 않는다', () => {
    expect(closesOnText(career({ closesOn: null }))).toBe('상시 채용');
    expect(closesOnText(career({ closesOn: '2026-08-31' }))).toBe('2026-08-31');
  });

  it('정렬은 상시 → 마감일 먼 순 → 비공개 순이다', () => {
    const sorted = sortCareers([
      career({ id: 'a', closesOn: '2026-01-01' }),
      career({ id: 'b', closesOn: null }),
      career({ id: 'c', closesOn: '2026-12-31' }),
      career({ id: 'd', closesOn: '2026-06-01', published: false }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['b', 'c', 'a', 'd']);
  });
});

/* ── ④ 지원 방법 ─────────────────────────────────────────────────────────── */

const FORMS: readonly ApplicationFormRef[] = [
  { id: 'form-1', name: '2026 상반기 지원서', published: true },
  { id: 'form-2', name: '초안 지원서', published: false },
];

describe('applyMethodBlock — 열리지 않는 지원 경로를 막는다', () => {
  it('이메일 형식이 틀리면 막는다', () => {
    expect(applyMethodBlock('email', 'recruit@', FORMS)).not.toBeNull();
    expect(applyMethodBlock('email', 'recruit@example.com', FORMS)).toBeNull();
  });

  it('지원 링크는 https 여야 한다 — 지원자가 개인정보를 넣는 화면이다', () => {
    expect(applyMethodBlock('link', 'http://recruit.example.com', FORMS)).not.toBeNull();
    expect(applyMethodBlock('link', 'https://recruit.example.com', FORMS)).toBeNull();
  });

  it('폼 목록을 모르면(null) 폼을 고를 수 없고 이유를 말한다', () => {
    const reason = applyMethodBlock('form', 'form-1', null);

    expect(reason).not.toBeNull();
    // '등록된 폼이 없습니다' 로 뭉개지 않는다 — 없는 것과 모르는 것은 다르다
    expect(reason ?? '').toContain('확인할 수 없어');
  });

  it('미발행 폼을 붙이면 막는다 — 지원자가 빈 화면을 본다', () => {
    const reason = applyMethodBlock('form', 'form-2', FORMS);
    expect(reason).not.toBeNull();
    expect(reason ?? '').toContain('발행');
  });

  it('발행된 폼은 통과한다', () => {
    expect(applyMethodBlock('form', 'form-1', FORMS)).toBeNull();
  });

  it('목록에 없는 폼 id 는 막는다', () => {
    expect(applyMethodBlock('form', 'form-999', FORMS)).not.toBeNull();
  });
});

/* ── ⑤ 비공개 저장 ───────────────────────────────────────────────────────── */

describe('publishBlock — 공개할 때만 지원 경로를 따진다', () => {
  const input = (overrides: Partial<CareerInput> = {}): CareerInput => {
    const full = career();
    return {
      title: full.title,
      jobFunction: full.jobFunction,
      employmentType: full.employmentType,
      location: full.location,
      closesOn: full.closesOn,
      applyMethod: full.applyMethod,
      applyTarget: full.applyTarget,
      description: full.description,
      published: full.published,
      ...overrides,
    };
  };

  it('비공개 저장은 지원 경로가 비어 있어도 허용된다 — 초안을 잃지 않게', () => {
    expect(publishBlock(input({ published: false, applyTarget: '' }), null)).toBeNull();
  });

  it('공개하려는데 지원 경로가 비어 있으면 막는다', () => {
    expect(publishBlock(input({ published: true, applyTarget: '' }), FORMS)).not.toBeNull();
  });

  it('공개 + 올바른 지원 경로는 통과한다', () => {
    expect(publishBlock(input({ published: true }), FORMS)).toBeNull();
  });
});

/* ── 목록 좁히기 ─────────────────────────────────────────────────────────── */

describe('필터·검색', () => {
  const list = [
    career({ id: 'a', jobFunction: 'design', employmentType: 'full-time', closesOn: null }),
    career({
      id: 'b',
      jobFunction: 'engineering',
      employmentType: 'intern',
      closesOn: '2026-01-01',
    }),
    career({ id: 'c', jobFunction: 'design', employmentType: 'intern', published: false }),
  ];

  it('직무·고용형태·상태가 AND 로 걸린다', () => {
    expect(filterCareers(list, 'design', 'all', 'all', TODAY).map((item) => item.id)).toEqual([
      'a',
      'c',
    ]);
    expect(filterCareers(list, 'all', 'intern', 'all', TODAY).map((item) => item.id)).toEqual([
      'b',
      'c',
    ]);
    expect(filterCareers(list, 'all', 'all', 'closed', TODAY).map((item) => item.id)).toEqual([
      'b',
    ]);
    expect(filterCareers(list, 'all', 'all', 'always', TODAY).map((item) => item.id)).toEqual([
      'a',
    ]);
  });

  it('제목·근무지에서 찾는다', () => {
    expect(searchCareers(list, '성동')).toHaveLength(3);
    expect(searchCareers(list, '디자이너')).toHaveLength(3);
    expect(searchCareers(list, '  ')).toHaveLength(3);
    expect(searchCareers(list, '부산')).toHaveLength(0);
  });
});

describe('폼 조회기의 미배선 상태', () => {
  it('reset 하면 다시 "모른다" 로 돌아간다 — 그 경로를 실제로 밟아 본다', () => {
    resetApplicationFormLookup();
    expect(applyMethodBlock('form', 'form-1', null)).not.toBeNull();
  });
});
