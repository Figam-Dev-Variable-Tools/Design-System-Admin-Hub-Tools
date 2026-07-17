// 팝업 관리 화면의 동작 회귀 테스트
import { describe, expect, it } from 'vitest';

import { applyQuery, nextPriority, POPUPS, setEnabledById } from './data-source';
import type { PopupQuery } from './data-source';
import { popupSchema } from './validation';
import type { PopupFormValues } from './validation';
import type { Popup } from './types';

function popupOf(overrides: Partial<Popup> & { id: string }): Popup {
  return {
    title: '신규 가입 혜택',
    imageUrl: 'https://cdn.example.com/p.png',
    linkUrl: '',
    position: 'home',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    enabled: true,
    priority: 1,
    ...overrides,
  };
}

const SAMPLE: readonly Popup[] = [
  popupOf({ id: '1', title: '가입 혜택', enabled: true }),
  popupOf({ id: '2', title: '시즌 세일', enabled: false }),
  popupOf({ id: '3', title: '앱 다운로드', enabled: true }),
];

function queryOf(overrides: Partial<PopupQuery> = {}): PopupQuery {
  return { enabled: 'all', keyword: '', page: 1, ...overrides };
}

const idsOf = (popups: readonly Popup[]) => popups.map((p) => p.id);

describe('applyQuery — 필터', () => {
  it('기본(전체)은 모든 팝업', () => {
    expect(idsOf(applyQuery(queryOf(), SAMPLE))).toEqual(['1', '2', '3']);
  });

  it('상태 ON 만', () => {
    expect(idsOf(applyQuery(queryOf({ enabled: 'on' }), SAMPLE))).toEqual(['1', '3']);
  });

  it('상태 OFF 만', () => {
    expect(idsOf(applyQuery(queryOf({ enabled: 'off' }), SAMPLE))).toEqual(['2']);
  });

  it('제목 검색 — 공백/대소문자 무시', () => {
    expect(idsOf(applyQuery(queryOf({ keyword: ' 세일 ' }), SAMPLE))).toEqual(['2']);
  });
});

describe('POPUPS 픽스처', () => {
  it('우선순위 오름차순으로 온다', () => {
    const priorities = POPUPS.map((popup) => popup.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });
});

describe('setEnabledById — ON/OFF 토글(순수)', () => {
  it('해당 id 의 enabled 만 바꾼다', () => {
    const next = setEnabledById(SAMPLE, '1', false);
    expect(next.find((p) => p.id === '1')?.enabled).toBe(false);
    expect(next.find((p) => p.id === '3')?.enabled).toBe(true);
  });
});

describe('nextPriority — 우선순위 자동 증분(순수)', () => {
  it('현재 최대 + 1', () => {
    expect(
      nextPriority([popupOf({ id: '1', priority: 2 }), popupOf({ id: '2', priority: 5 })]),
    ).toBe(6);
  });

  it('비면 1', () => {
    expect(nextPriority([])).toBe(1);
  });
});

function valuesOf(overrides: Partial<PopupFormValues> = {}): PopupFormValues {
  return {
    title: '제목',
    imageUrl: 'https://cdn.example.com/a.png',
    linkUrl: '',
    position: 'home',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    enabled: true,
    priority: '1',
    ...overrides,
  };
}

function messageFor(values: PopupFormValues, field: keyof PopupFormValues): string | undefined {
  const result = popupSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('popupSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(popupSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('제목이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '' }), 'title')).toBe('제목을 입력하세요.');
  });

  it('이미지가 비면 막는다', () => {
    expect(messageFor(valuesOf({ imageUrl: '' }), 'imageUrl')).toBe('이미지를 등록하세요.');
  });

  it('이미지 형식은 강제하지 않는다 — 업로드된 값(blob/data URL)을 허용한다', () => {
    expect(popupSchema.safeParse(valuesOf({ imageUrl: 'blob:abc-123' })).success).toBe(true);
  });

  it('링크는 선택 — 비어 있어도 통과한다', () => {
    expect(popupSchema.safeParse(valuesOf({ linkUrl: '' })).success).toBe(true);
  });

  it('링크를 입력했다면 형식은 맞아야 한다', () => {
    expect(messageFor(valuesOf({ linkUrl: 'ftp://x' }), 'linkUrl')).toContain('http');
  });

  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-05-31', endAt: '2026-05-01' }), 'endAt')).toBe(
      '종료일은 시작일보다 빠를 수 없습니다.',
    );
  });

  it('같은 날(시작=종료)은 통과한다', () => {
    expect(
      popupSchema.safeParse(valuesOf({ startAt: '2026-05-01', endAt: '2026-05-01' })).success,
    ).toBe(true);
  });

  it('우선순위가 정수가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ priority: 'x' }), 'priority')).toContain('정수');
  });
});
