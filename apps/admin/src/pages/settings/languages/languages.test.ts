// 다국어 설정의 순수 규칙 (pages/settings/languages/rules.ts)
//
// [무엇을 지키나] ① 기본 언어는 지워지지 않는다 ② 통화·시간대는 지역에서만 온다
// ③ URL 전략은 하나뿐이고 주소가 충돌하지 않는다 ④ 미번역은 폴백하고 배지를 단다.
import { describe, expect, it } from 'vitest';

import {
  addLocaleBlock,
  localeUrlOf,
  missingCountOf,
  regionSummaryOf,
  removeLocaleBlock,
  saveBlock,
  setDefaultBlock,
  translationRowsOf,
} from './rules';
import { localeIdOf, REGIONS, translationKey } from './types';
import type { LanguageSettingsDoc, LocaleEntry } from './types';

function locale(overrides: Partial<LocaleEntry> = {}): LocaleEntry {
  return {
    id: 'ko-KR',
    languageId: 'ko',
    regionId: 'KR',
    siteName: '예시 사이트',
    urlKey: 'ko',
    published: true,
    ...overrides,
  };
}

const EN = locale({ id: 'en-US', languageId: 'en', regionId: 'US', urlKey: 'en' });

function doc(overrides: Partial<LanguageSettingsDoc> = {}): LanguageSettingsDoc {
  return {
    defaultLocaleId: 'ko-KR',
    urlStrategy: 'path-prefix',
    baseHost: 'example.com',
    locales: [locale(), EN],
    ...overrides,
  };
}

describe('① 기본 언어는 지울 수 없다', () => {
  it('기본 언어 삭제는 사유와 함께 거절된다', () => {
    const reason = removeLocaleBlock(doc(), 'ko-KR');

    expect(reason).not.toBeNull();
    expect(reason ?? '').toContain('기본 언어');
  });

  it('마지막 한 개도 지울 수 없다', () => {
    expect(removeLocaleBlock(doc({ locales: [locale()] }), 'ko-KR')).not.toBeNull();
  });

  it('기본이 아닌 언어는 지울 수 있다', () => {
    expect(removeLocaleBlock(doc(), 'en-US')).toBeNull();
  });

  it('비공개 언어는 기본이 될 수 없다 — 폴백이 보이지 않는 곳으로 떨어진다', () => {
    const reason = setDefaultBlock(locale({ published: false }));
    expect(reason).not.toBeNull();
  });

  it('저장 시에도 같은 술어가 본다 — 기본이 목록에 없으면 거절', () => {
    expect(saveBlock(doc({ defaultLocaleId: 'ja-JP' }))).not.toBeNull();
  });
});

describe('언어 추가', () => {
  it('같은 언어×지역 조합은 두 번 추가되지 않는다', () => {
    expect(addLocaleBlock([locale(), EN], 'en', 'US')).not.toBeNull();
  });

  it('같은 언어라도 지역이 다르면 추가된다 — 영어는 미국과 싱가포르가 다르다', () => {
    expect(addLocaleBlock([locale(), EN], 'en', 'SG')).toBeNull();
    expect(localeIdOf('en', 'SG')).toBe('en-SG');
  });

  it('언어나 지역을 고르지 않으면 막는다', () => {
    expect(addLocaleBlock([], '', 'KR')).not.toBeNull();
    expect(addLocaleBlock([], 'ko', '')).not.toBeNull();
  });
});

describe('② 통화·시간대는 지역이 갖는다', () => {
  it('지역마다 통화가 다르다 — 언어로는 정할 수 없다', () => {
    expect(regionSummaryOf('US')).toContain('USD');
    expect(regionSummaryOf('SG')).toContain('SGD');
    // 같은 영어권인데 통화가 다르다는 것이 이 축의 존재 이유다
    expect(regionSummaryOf('US')).not.toBe(regionSummaryOf('SG'));
  });

  it('모르는 지역은 null 이다 — 통화를 지어내지 않는다', () => {
    expect(regionSummaryOf('ZZ')).toBeNull();
  });

  it('카탈로그의 모든 지역이 통화와 시간대를 갖는다', () => {
    for (const region of REGIONS) {
      expect(region.currency).toMatch(/^[A-Z]{3}$/);
      expect(region.timeZone).toContain('/');
    }
  });
});

describe('③ URL 전략은 하나뿐이다', () => {
  it('경로 접두 — 기본 언어에는 접두를 붙이지 않는다 (중복 색인 방지)', () => {
    expect(localeUrlOf('path-prefix', 'example.com', locale(), true)).toBe('https://example.com/');
    expect(localeUrlOf('path-prefix', 'example.com', EN, false)).toBe('https://example.com/en/');
  });

  it('서브도메인 — 같은 로케일이 다른 주소를 갖는다', () => {
    expect(localeUrlOf('subdomain', 'example.com', EN, false)).toBe('https://en.example.com/');
  });

  it('입력한 스킴·후행 슬래시는 털어 낸다', () => {
    expect(localeUrlOf('path-prefix', 'https://example.com/', EN, false)).toBe(
      'https://example.com/en/',
    );
  });

  it('URL 키가 겹치면 저장을 거절한다 — 같은 주소를 두 언어가 나눠 가질 수 없다', () => {
    const clashing = doc({ locales: [locale({ urlKey: 'x' }), { ...EN, urlKey: 'x' }] });
    expect(saveBlock(clashing)).not.toBeNull();
  });

  it('URL 키가 비었거나 형식이 틀리면 거절한다', () => {
    expect(saveBlock(doc({ locales: [locale(), { ...EN, urlKey: '' }] }))).not.toBeNull();
    expect(saveBlock(doc({ locales: [locale(), { ...EN, urlKey: 'EN US' }] }))).not.toBeNull();
  });

  it('기준 도메인이 없으면 거절한다', () => {
    expect(saveBlock(doc({ baseHost: '   ' }))).not.toBeNull();
  });

  it('규칙을 지키면 통과한다', () => {
    expect(saveBlock(doc())).toBeNull();
  });
});

describe('④ 미번역은 폴백하고 배지를 단다', () => {
  const entries = [
    {
      id: 'notice-1',
      kindLabel: '공지사항',
      title: '여름 휴무 안내',
      publishedAt: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'faq-2',
      kindLabel: 'FAQ',
      title: '배송은 얼마나 걸리나요',
      publishedAt: '2026-05-01T00:00:00.000Z',
    },
  ];

  const index = new Set([translationKey('notice-1', 'en-US')]);

  it('번역된 것과 아닌 것을 가른다', () => {
    const rows = translationRowsOf(entries, 'en-US', index);

    expect(rows.find((row) => row.entryId === 'notice-1')?.state).toBe('translated');
    expect(rows.find((row) => row.entryId === 'faq-2')?.state).toBe('missing');
  });

  it('미번역이어도 제목이 비지 않는다 — 기본 언어 제목이 그대로 온다(폴백)', () => {
    const rows = translationRowsOf(entries, 'ja-JP', new Set());

    expect(rows.every((row) => row.title !== '')).toBe(true);
    expect(rows.every((row) => row.state === 'missing')).toBe(true);
  });

  it('미번역 수는 목록에서 센다 — 저장하지 않는다', () => {
    expect(missingCountOf(translationRowsOf(entries, 'en-US', index))).toBe(1);
  });
});
