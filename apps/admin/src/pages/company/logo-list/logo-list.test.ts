// 로고 목록(파트너사·고객사 공유)의 동작 회귀 테스트
//
// 목록 동작=필터/재정렬/순번(순수 함수), 폼 동작=검증(logoSchema), 어댑터=CRUD·일괄 삭제.
import { describe, expect, it } from 'vitest';

import { isConflict } from '../../../shared/errors/http-error';
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
    active: true,
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

  it('로고가 비면 막는다', () => {
    expect(messageFor(valuesOf({ logoUrl: '' }), 'logoUrl')).toContain('로고');
  });

  /**
   * [알려진 빚 — 계약이 아니다]
   * 같은 파일의 linkUrl 은 optionalHttpUrl 로 http(s) 를 **강제한다** — 그것은 사람이 칠 수 있는
   * 하이퍼링크이기 때문이다. logoUrl 을 같이 조이지 못하는 이유는 하나뿐이다: ImageUploadField 가
   * 아직 업로드하지 않아 `blob:…` 말고는 낼 수 있는 값이 없다. 두 필드의 규칙이 다른 것은
   * 일관성 부족이 아니라 **이음매의 유무** 차이다.
   * TODO(backend): POST /api/uploads 가 붙으면 이 단언은 뒤집힌다(blob: 거절).
   */
  it('업로드 이음매가 없어 blob: 이 통과한다 — TODO(backend): POST /api/uploads 후 거절로 바뀐다', () => {
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

  /**
   * [EXC-04] 없는 id 의 쓰기는 조용히 성공하지 않는다 — 유령 저장 금지.
   *
   * map/filter 는 없는 id 를 **그냥 지나치고 성공을 반환**한다. 그래서 다른 관리자가 방금 지운
   * 로고를 수정·삭제·토글하면 '변경했습니다' 가 뜨지만 바뀐 것은 아무것도 없었다.
   * 공용 프레임워크의 두 팩토리(createCrudAdapter·createStoreAdapter)가 같은 자리에서 같은
   * 판정을 한다 — 이 팩토리만 뚫려 있을 이유가 없었다. (shared/crud/crud.test.ts 가 그 둘을 건다.)
   */
  it('없는 id 의 update 를 409 로 막는다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await expect(
      adapter.update('ghost', {
        name: '유령',
        logoUrl: 'https://cdn.example.com/g.png',
        linkUrl: '',
      }),
    ).rejects.toSatisfy(isConflict);
  });

  it('없는 id 의 remove 를 409 로 막는다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await expect(adapter.remove('ghost')).rejects.toSatisfy(isConflict);
  });

  it('없는 id 의 setActive 를 409 로 막는다 — 유령 행의 토글이 성공으로 보이지 않는다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await expect(adapter.setActive('ghost', false)).rejects.toSatisfy(isConflict);
  });

  it('신규 등록 항목은 기본 노출(active: true)', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await adapter.create({ name: '델타', logoUrl: 'https://cdn.example.com/d.png', linkUrl: '' });
    const list = await adapter.fetchAll(new AbortController().signal);
    expect(list.find((x) => x.name === '델타')?.active).toBe(true);
  });

  it('setActive 는 해당 항목의 노출 여부만 바꾼다', async () => {
    const adapter = createLogoAdapter('test', SAMPLE);
    await adapter.setActive('b', false);
    const list = await adapter.fetchAll(new AbortController().signal);
    expect(list.find((x) => x.id === 'b')?.active).toBe(false);
    expect(list.find((x) => x.id === 'a')?.active).toBe(true);
  });
});
