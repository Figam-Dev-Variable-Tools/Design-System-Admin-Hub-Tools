// 사이트 연동의 순수 규칙 (pages/settings/site-connect/rules.ts)
//
// [무엇을 지키나] ① 성립하지 않는 연동은 켤 수 없고 **이유를 말한다** ② 평문 키는 저장 문서에
// 담기지 않는다 ③ 유입 데이터에는 쓰기 표면이 없다.
import { describe, expect, it } from 'vitest';

import * as dataSource from './data-source';
import {
  enableBlock,
  firstInvalidOrigin,
  parseAllowedOrigins,
  saveBlock,
  toDoc,
  toObservation,
  toValues,
} from './rules';
import { EMPTY_SITE_CONNECT } from './validation';
import type { SiteConnectValues } from './validation';

function values(overrides: Partial<SiteConnectValues> = {}): SiteConnectValues {
  return { ...EMPTY_SITE_CONNECT, ...overrides };
}

const READY = values({
  siteUrl: 'https://shop.example.com',
  hasSecret: true,
});

describe('허용 출처 파싱 — 빈 문자열을 목록에 넣지 않는다', () => {
  it('줄바꿈·쉼표로 나누고 빈 줄을 버린다', () => {
    const parsed = parseAllowedOrigins('https://a.example.com\n\n , https://b.example.com  \n');
    expect(parsed).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('경로가 붙은 출처는 거절한다 — Origin 헤더와 영영 일치하지 않는다', () => {
    expect(firstInvalidOrigin('https://a.example.com/kr')).toBe('https://a.example.com/kr');
  });

  it('평문 http 도 거절한다', () => {
    expect(firstInvalidOrigin('http://a.example.com')).toBe('http://a.example.com');
  });

  it('올바른 목록은 통과한다', () => {
    expect(firstInvalidOrigin('https://a.example.com\nhttps://b.example.com')).toBeNull();
  });
});

describe('enableBlock — 성립하지 않는 연동은 켤 수 없다', () => {
  it('도메인이 없으면 막고 이유를 말한다', () => {
    const reason = enableBlock(values({ hasSecret: true }));
    expect(reason).not.toBeNull();
    expect(reason ?? '').toContain('홈페이지 도메인');
  });

  it('키가 없으면 막는다 — 검증할 수 없는 이벤트는 전부 거절되기 때문이다', () => {
    const reason = enableBlock(values({ siteUrl: 'https://shop.example.com' }));
    expect(reason).not.toBeNull();
    expect(reason ?? '').toContain('연동 키');
  });

  it('새 키를 입력 중이면 아직 저장 전이어도 켤 수 있다', () => {
    expect(
      enableBlock(values({ siteUrl: 'https://shop.example.com', secretInput: 'whsec_x' })),
    ).toBeNull();
  });

  it('출처 형식이 틀리면 막는다', () => {
    const reason = enableBlock({ ...READY, allowedOrigins: 'shop.example.com' });
    expect(reason).not.toBeNull();
  });

  it('도메인·키가 갖춰지면 켤 수 있다', () => {
    expect(enableBlock(READY)).toBeNull();
  });
});

describe('saveBlock — 저장 경로가 같은 술어로 거절한다', () => {
  it('꺼진 채로 저장하는 것은 언제나 허용된다 (도메인만 고치러 온 사람을 막지 않는다)', () => {
    expect(saveBlock(values({ siteUrl: '' }))).toBeNull();
  });

  it('토글을 우회해 enabled=true 로 들어와도 거절한다', () => {
    expect(saveBlock(values({ enabled: true }))).not.toBeNull();
  });

  it('꺼져 있어도 출처 형식이 틀리면 거절한다 — 저장되면 켤 때 조용히 막힌다', () => {
    expect(saveBlock(values({ allowedOrigins: 'ftp://x.example.com' }))).not.toBeNull();
  });
});

describe('toDoc / toValues — 평문 키는 문서에 담기지 않는다', () => {
  it('저장 문서에는 hasSecret 만 있고 입력한 평문은 어디에도 없다', () => {
    const doc = toDoc(values({ siteUrl: 'https://shop.example.com', secretInput: 'whsec_secret' }));

    expect(doc.hasSecret).toBe(true);
    expect(JSON.stringify(doc)).not.toContain('whsec_secret');
  });

  it('키 입력을 비워 두면 기존 저장 상태가 그대로다 (빈 문자열 = 그대로 둔다)', () => {
    expect(toDoc(values({ hasSecret: true, secretInput: '' })).hasSecret).toBe(true);
    expect(toDoc(values({ hasSecret: false, secretInput: '  ' })).hasSecret).toBe(false);
  });

  it('문서를 폼으로 되돌리면 키 칸은 언제나 비어 있다 — 채울 값을 우리도 갖고 있지 않다', () => {
    const back = toValues({
      enabled: true,
      siteUrl: 'https://shop.example.com',
      allowedOrigins: ['https://www.example.com'],
      hasSecret: true,
    });

    expect(back.secretInput).toBe('');
    expect(back.hasSecret).toBe(true);
    expect(back.allowedOrigins).toBe('https://www.example.com');
  });
});

describe('관측 해석 — 지어내지 않는다', () => {
  it('시각이 없는 이벤트는 관측이 되지 못한다', () => {
    expect(toObservation('obs-x', '한**', 'member', 'mem-1', { channel: 'naver' })).toBeNull();
  });

  it('모르는 채널은 direct 로 흡수된다', () => {
    const observation = toObservation('obs-x', '한**', 'member', 'mem-1', {
      channel: 'unknown-source',
      landedAt: '2026-07-01T00:00:00.000Z',
    });

    expect(observation?.source.channel).toBe('direct');
  });
});

describe('유입 데이터의 공개 표면 — 어드민에서 고칠 수 없다', () => {
  it('data-source 에 관측을 쓰는 함수가 없다', () => {
    const mutating = Object.keys(dataSource).filter((name) =>
      /^(set|update|patch|delete|remove|append|record)Traffic/i.test(name),
    );

    expect(mutating).toEqual([]);
  });

  it('조회기는 모르는 대상에 null 을 준다', () => {
    expect(dataSource.findTrafficSource({ domain: 'order', id: '없는-주문' })).toBeNull();
  });

  it('픽스처의 관측은 최초 접점 최신순이다', () => {
    const list = dataSource.listTrafficObservations();
    const times = list.map((observation) => observation.source.landedAt);

    expect([...times].sort((a, b) => b.localeCompare(a))).toEqual(times);
  });
});
