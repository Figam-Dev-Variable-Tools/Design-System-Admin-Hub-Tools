// 채용 공고의 순수 규칙 (pages/company/careers/types.ts)
//
// [무엇을 지키나] ② 마감은 저장되지 않고 **매번 계산된다** ③ 상시 채용은 1급 상태다
// ④ 지원 경로가 열리지 않는 공고는 공개되지 않는다 ⑤ 비공개 저장이 언제나 가능하다
// ⑥ **그 판정이 경고로 끝나지 않고 저장을 거절한다**(스키마 · 저장소 양쪽).
import { describe, expect, it } from 'vitest';

import { careersAdapter } from './data-source';
import {
  APPLY_METHODS,
  applyMethodBlock,
  careerStateOf,
  closesOnText,
  filterCareers,
  publishBlock,
  searchCareers,
  sortCareers,
} from './types';
import type { Career, CareerInput } from './types';
import { careerSchema, EMPTY_CAREER } from './validation';
import type { CareerFormValues } from './validation';

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

describe('applyMethodBlock — 열리지 않는 지원 경로를 막는다', () => {
  it('이메일 형식이 틀리면 막는다', () => {
    expect(applyMethodBlock('email', 'recruit@')).not.toBeNull();
    expect(applyMethodBlock('email', 'recruit@example.com')).toBeNull();
  });

  // '지원 폼'(id: 'form')은 폼 관리 화면이 사라지면서 함께 걷혔다. 그 자리를 비워 두면
  // **저장돼 있던 옛 공고**(applyMethod: 'form')가 아무 검사도 받지 않고 공개될 수 있다 —
  // 폼을 만들 화면이 없으니 그 공고의 '지원하기' 는 어디로도 가지 않는다. fail-closed 를 지킨다.
  it('없어진 지원 방법을 가진 옛 공고는 공개되지 않는다', () => {
    expect(APPLY_METHODS.map((option) => option.id)).toEqual(['email', 'link']);
    expect(applyMethodBlock('form', 'form-1')).not.toBeNull();
  });

  it('지원 링크는 https 여야 한다 — 지원자가 개인정보를 넣는 화면이다', () => {
    expect(applyMethodBlock('link', 'http://recruit.example.com')).not.toBeNull();
    expect(applyMethodBlock('link', 'https://recruit.example.com')).toBeNull();
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
    expect(publishBlock(input({ published: false, applyTarget: '' }))).toBeNull();
  });

  it('공개하려는데 지원 경로가 비어 있으면 막는다', () => {
    expect(publishBlock(input({ published: true, applyTarget: '' }))).not.toBeNull();
  });

  it('공개 + 올바른 지원 경로는 통과한다', () => {
    expect(publishBlock(input({ published: true }))).toBeNull();
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

/* ── ⑥ 경고가 아니라 거절이다 (저장 경로의 회귀) ─────────────────────────── */

/**
 * 여기부터가 '규칙은 있는데 집행이 없다' 를 막는 자리다.
 *
 * 예전에는 `publishBlock` 의 소비처가 경고 배너 하나뿐이라, 아래 값들이 **경고가 뜬 채로 저장에
 * 성공**했다. 그래서 아래 단언은 규칙이 옳은지가 아니라 **저장 경로가 그 규칙을 통과시키지
 * 않는지**를 본다 — 스키마와 저장소 양쪽에서.
 */
function values(overrides: Partial<CareerFormValues> = {}): CareerFormValues {
  return {
    ...EMPTY_CAREER,
    title: '프로덕트 디자이너',
    jobFunction: 'design',
    employmentType: 'full-time',
    location: '서울 성동구',
    closesOn: '2026-08-31',
    alwaysOpen: false,
    applyMethod: 'email',
    applyTarget: 'recruit@example.com',
    description: '신규 서비스 화면 설계',
    published: true,
    ...overrides,
  };
}

/** 어느 칸에 오류가 붙었는가 — 폼 레벨 이슈는 화면 어디에도 그려지지 않는다 */
function errorFields(input: CareerFormValues): readonly string[] {
  const result = careerSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join('.'));
}

function toInput(form: CareerFormValues): CareerInput {
  return {
    title: form.title,
    jobFunction: form.jobFunction,
    employmentType: form.employmentType,
    location: form.location,
    closesOn: form.alwaysOpen ? null : form.closesOn.trim(),
    applyMethod: form.applyMethod,
    applyTarget: form.applyTarget,
    description: form.description,
    published: form.published,
  };
}

describe('careerSchema — 공개 저장을 거절한다', () => {
  it('http:// 링크를 단 공고는 공개로 저장되지 않는다 — 지원자가 개인정보를 넣는 화면이다', () => {
    const fields = errorFields(
      values({ applyMethod: 'link', applyTarget: 'http://recruit.example.com' }),
    );

    expect(fields).toContain('applyTarget');
  });

  it('빈 이메일을 단 공고는 공개로 저장되지 않는다', () => {
    expect(errorFields(values({ applyMethod: 'email', applyTarget: '' }))).toContain('applyTarget');
  });

  it('같은 값이라도 비공개면 저장된다 — 초안을 잃지 않게 (기존 규칙)', () => {
    expect(
      errorFields(
        values({
          published: false,
          applyMethod: 'link',
          applyTarget: 'http://recruit.example.com',
        }),
      ),
    ).toEqual([]);
  });
});

describe('careerSchema — 마감일을 비운 채 저장할 수 없다', () => {
  it('상시가 아닌데 마감일이 비면 거절된다', () => {
    expect(errorFields(values({ alwaysOpen: false, closesOn: '' }))).toContain('closesOn');
  });

  it('상시 채용이면 마감일이 비어도 통과하고, 저장 값은 null 이다', () => {
    const form = values({ alwaysOpen: true, closesOn: '' });

    expect(errorFields(form)).toEqual([]);
    expect(toInput(form).closesOn).toBeNull();
  });

  it("막지 않으면 무슨 일이 일어나는가 — `''` 는 파생에서 '지난 날짜' 다", () => {
    // 이 단언이 위 두 개의 존재 이유다: 빈 문자열이 저장되면 그 공고는 즉시 마감으로 그려진다
    expect(careerStateOf(career({ closesOn: '' }), TODAY)).toBe('closed');
  });
});

describe('careersAdapter — 저장소도 같은 술어로 거절한다', () => {
  it('공개 + http:// 링크는 422 로 거절된다 (폼이 유일한 입구가 아니다)', async () => {
    await expect(
      careersAdapter.create(
        toInput(values({ applyMethod: 'link', applyTarget: 'http://recruit.example.com' })),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('거절 사유가 고칠 칸의 이름과 함께 온다 — 인라인으로 꽂을 수 있게 (EXC-07)', async () => {
    await expect(
      careersAdapter.update('career-1', toInput(values({ applyMethod: 'email', applyTarget: '' }))),
    ).rejects.toMatchObject({ violations: [{ field: 'applyTarget' }] });
  });

  it("마감일이 `''` 인 저장도 거절된다", async () => {
    await expect(
      careersAdapter.create({ ...toInput(values()), closesOn: '' }),
    ).rejects.toMatchObject({ violations: [{ field: 'closesOn' }] });
  });
});
