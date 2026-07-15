// 로고 목록(파트너사·고객사 공유)의 동작 회귀 테스트 (A41)
//
// 목록 동작=필터/재정렬/순번(순수 함수), 폼 동작=검증(logoSchema), 어댑터=CRUD·일괄 삭제.
import { describe, expect, it } from 'vitest';

import { createLogoAdapter } from './adapter';
import { filterLogos, nextLogoOrder, reorderLogosByIds } from './types';
import type { LogoItem } from './types';
import { logoSchema } from './validation';
import type { LogoFormValues } from './validation';

function logoOf(overrides: Partial<LogoItem> & { id: string }): LogoItem {
  return {
    name: '가상파트너',
    logoUrl: 'https://cdn.example.com/a.png',
    linkUrl: '',
    order: 1,
    ...overrides,
  };
}

const SAMPLE: readonly LogoItem[] = [
  logoOf({ id: 'a', name: '알파컴퍼니', order: 1 }),
  logoOf({ id: 'b', name: '베타그룹', order: 2 }),
  logoOf({ id: 'c', name: '감마파트너', order: 3 }),
];

describe('filterLogos — 이름 검색', () => {
  it('키워드가 비면 전체를 돌려준다', () => {
    expect(filterLogos(SAMPLE, '  ').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('이름 부분일치 — 대소문자·앞뒤 공백 무시', () => {
    expect(filterLogos(SAMPLE, ' 베타 ').map((x) => x.id)).toEqual(['b']);
  });

  it('걸리는 것이 없으면 빈 배열', () => {
    expect(filterLogos(SAMPLE, '없음')).toEqual([]);
  });
});

describe('reorderLogosByIds — 재정렬(순수)', () => {
  it('새 순서로 재배치하고 order 를 1..n 으로 다시 매긴다', () => {
    const next = reorderLogosByIds(SAMPLE, ['c', 'a', 'b']);
    expect(next.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((x) => x.order)).toEqual([1, 2, 3]);
  });
});

describe('nextLogoOrder — 정렬 순서 자동 증분(순수)', () => {
  it('현재 최대 + 1', () => {
    expect(nextLogoOrder(SAMPLE)).toBe(4);
  });

  it('비면 1', () => {
    expect(nextLogoOrder([])).toBe(1);
  });
});

function valuesOf(overrides: Partial<LogoFormValues> = {}): LogoFormValues {
  return {
    name: '알파컴퍼니',
    logoUrl: 'https://cdn.example.com/a.png',
    linkUrl: 'https://example.com',
    ...overrides,
  };
}

function messageFor(values: LogoFormValues, field: keyof LogoFormValues): string | undefined {
  const result = logoSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('logoSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(logoSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('이름이 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '  ' }), 'name')).toContain('입력');
  });

  it('로고가 비면 막는다 (형식은 강제하지 않는다 — 업로드된 값 허용)', () => {
    expect(messageFor(valuesOf({ logoUrl: '' }), 'logoUrl')).toContain('로고');
    expect(logoSchema.safeParse(valuesOf({ logoUrl: 'blob:abc-123' })).success).toBe(true);
  });

  it('링크는 선택 — 비어 있어도 통과한다', () => {
    expect(logoSchema.safeParse(valuesOf({ linkUrl: '' })).success).toBe(true);
  });
});

describe('createLogoAdapter — CRUD 규약', () => {
  it('등록하면 목록 끝에 order 를 이어 붙인다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await adapter.create({ name: '델타', logoUrl: 'https://cdn.example.com/d.png', linkUrl: '' });
    const list = await adapter.fetchAll(new AbortController().signal);
    expect(list).toHaveLength(4);
    expect(list[3]?.name).toBe('델타');
    expect(list[3]?.order).toBe(4);
  });

  it('수정은 해당 항목만 바꾼다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await adapter.update('b', {
      name: '베타-수정',
      logoUrl: 'https://cdn.example.com/b.png',
      linkUrl: '',
    });
    const list = await adapter.fetchAll(new AbortController().signal);
    expect(list.find((x) => x.id === 'b')?.name).toBe('베타-수정');
    expect(list.find((x) => x.id === 'a')?.name).toBe('알파컴퍼니');
  });

  it('삭제하면 목록에서 빠진다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await adapter.remove('a');
    const list = await adapter.fetchAll(new AbortController().signal);
    expect(list.map((x) => x.id)).toEqual(['b', 'c']);
  });
});
