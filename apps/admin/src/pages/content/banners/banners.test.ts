// 배너 관리 화면의 동작 회귀 테스트
import { describe, expect, it } from 'vitest';

import { applyQuery, BANNERS, nextOrder, reorderByIds, setEnabledById } from './data-source';
import type { BannerQuery } from './data-source';
import { bannerSchema } from './validation';
import type { BannerFormValues } from './validation';
import type { Banner } from './types';

function bannerOf(overrides: Partial<Banner> & { id: string }): Banner {
  return {
    title: '봄 시즌 기획전',
    imageUrl: 'https://cdn.example.com/b.png',
    linkUrl: '',
    placement: 'main',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    enabled: true,
    order: 1,
    ...overrides,
  };
}

const SAMPLE: readonly Banner[] = [
  bannerOf({ id: '1', title: '봄 기획전', placement: 'main' }),
  bannerOf({ id: '2', title: '신상 입고', placement: 'sub' }),
  bannerOf({ id: '3', title: '브랜드데이', placement: 'main' }),
];

function queryOf(overrides: Partial<BannerQuery> = {}): BannerQuery {
  return { placement: 'all', keyword: '', page: 1, ...overrides };
}

const idsOf = (banners: readonly Banner[]) => banners.map((b) => b.id);

describe('applyQuery — 필터', () => {
  it('기본(전체)은 모든 배너', () => {
    expect(idsOf(applyQuery(queryOf(), SAMPLE))).toEqual(['1', '2', '3']);
  });

  it('위치 필터 — 메인만', () => {
    expect(idsOf(applyQuery(queryOf({ placement: 'main' }), SAMPLE))).toEqual(['1', '3']);
  });

  it('위치 필터 — 서브만', () => {
    expect(idsOf(applyQuery(queryOf({ placement: 'sub' }), SAMPLE))).toEqual(['2']);
  });

  it('제목 검색 — 공백/대소문자 무시', () => {
    expect(idsOf(applyQuery(queryOf({ keyword: ' 신상 ' }), SAMPLE))).toEqual(['2']);
  });
});

describe('BANNERS 픽스처', () => {
  it('정렬 순서 오름차순으로 온다', () => {
    const orders = BANNERS.map((banner) => banner.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });
});

describe('setEnabledById — ON/OFF 토글(순수)', () => {
  it('해당 id 의 enabled 만 바꾸고 나머지는 그대로 둔다', () => {
    const next = setEnabledById(SAMPLE, '2', false);
    expect(next.find((b) => b.id === '2')?.enabled).toBe(false);
    expect(next.find((b) => b.id === '1')?.enabled).toBe(SAMPLE[0]?.enabled);
  });

  it('없는 id 면 원본과 같은 값', () => {
    const next = setEnabledById(SAMPLE, '없음', false);
    expect(next.map((b) => b.enabled)).toEqual(SAMPLE.map((b) => b.enabled));
  });
});

describe('nextOrder — 정렬 순서 자동 증분(순수)', () => {
  it('현재 최대 + 1', () => {
    expect(nextOrder([bannerOf({ id: '1', order: 3 }), bannerOf({ id: '2', order: 7 })])).toBe(8);
  });

  it('비면 1', () => {
    expect(nextOrder([])).toBe(1);
  });
});

describe('reorderByIds — 재정렬 지속(순수, FAQ 와 동일 규칙)', () => {
  const list = [
    bannerOf({ id: 'a', order: 1 }),
    bannerOf({ id: 'b', order: 2 }),
    bannerOf({ id: 'c', order: 3 }),
    bannerOf({ id: 'd', order: 4 }),
  ];

  it('옮긴 항목들을 슬롯 안에서 새 순서로 재배치하고 order 를 1..n 으로 다시 매긴다', () => {
    const next = reorderByIds(list, ['b', 'a']);
    expect(next.map((b) => b.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(next.map((b) => b.order)).toEqual([1, 2, 3, 4]);
  });

  it('옮기지 않은 항목의 상대 순서를 보존한다', () => {
    const next = reorderByIds(list, ['d', 'c']);
    expect(next.map((b) => b.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});

function valuesOf(overrides: Partial<BannerFormValues> = {}): BannerFormValues {
  return {
    title: '제목',
    imageUrl: 'https://cdn.example.com/a.png',
    linkUrl: '',
    placement: 'main',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    enabled: true,
    order: '1',
    ...overrides,
  };
}

function messageFor(values: BannerFormValues, field: keyof BannerFormValues): string | undefined {
  const result = bannerSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('bannerSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(bannerSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('이미지가 비면 막는다 (형식은 강제하지 않는다 — 업로드된 값 허용)', () => {
    expect(messageFor(valuesOf({ imageUrl: '' }), 'imageUrl')).toContain('이미지');
    // 업로드 결과는 object/data URL 이라 http 형식이 아니어도 통과해야 한다
    expect(bannerSchema.safeParse(valuesOf({ imageUrl: 'blob:abc-123' })).success).toBe(true);
  });

  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-05-31', endAt: '2026-05-01' }), 'endAt')).toBe(
      '종료일은 시작일보다 빠를 수 없습니다.',
    );
  });

  it('정렬 순서가 정수가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ order: '1.2' }), 'order')).toContain('정수');
  });
});
