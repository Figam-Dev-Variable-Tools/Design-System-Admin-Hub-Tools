// 유입원 공통 모델의 순수 규칙 (shared/domain/traffic-source.ts)
//
// [무엇을 지키나] 셋이다. ① 미상은 direct 로 흡수되고 **빈 문자열이 만들어지지 않는다**
// ② 최초 접점은 덮어써지지 않는다(광고 기여도가 마지막 클릭으로 뭉개지지 않는다)
// ③ 시각이 없으면 지어내지 않고 거절한다.
// 셋 다 '한 번 잘못 저장되면 되돌릴 수 없는' 성질이라 규칙 층에서 못 박는다.
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRAFFIC_CHANNEL,
  firstTouch,
  isTrafficChannel,
  registerTrafficSourceLookup,
  resetTrafficSourceLookup,
  toTrafficChannel,
  toTrafficSource,
  trafficChannelLabel,
  trafficSourceOf,
  TRAFFIC_CHANNELS,
} from './traffic-source';
import type { TrafficSource } from './traffic-source';

const LANDED = '2026-07-01T02:00:00.000Z';

function source(overrides: Partial<TrafficSource> = {}): TrafficSource {
  return { channel: 'naver', campaign: null, referrer: null, landedAt: LANDED, ...overrides };
}

describe('채널 카탈로그 — 어휘는 한 벌이다', () => {
  it('8개 채널 + direct 로 아홉이다', () => {
    expect(TRAFFIC_CHANNELS).toHaveLength(9);
    expect(TRAFFIC_CHANNELS.filter((channel) => channel.id !== 'direct')).toHaveLength(8);
  });

  it('id 가 중복되지 않는다 — 같은 채널이 두 줄로 집계되지 않게', () => {
    const ids = TRAFFIC_CHANNELS.map((channel) => channel.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('미상은 direct 로 흡수한다 — 빈 문자열도 오타도 열 번째 값이 되지 않는다', () => {
    expect(toTrafficChannel('')).toBe(DEFAULT_TRAFFIC_CHANNEL);
    expect(toTrafficChannel('NAVER')).toBe(DEFAULT_TRAFFIC_CHANNEL);
    expect(toTrafficChannel(undefined)).toBe(DEFAULT_TRAFFIC_CHANNEL);
    expect(toTrafficChannel(42)).toBe(DEFAULT_TRAFFIC_CHANNEL);
    // 카탈로그에 있는 값은 그대로 통과한다
    expect(toTrafficChannel('instagram')).toBe('instagram');
  });

  it('isTrafficChannel 은 카탈로그 밖을 거절한다', () => {
    expect(isTrafficChannel('google')).toBe(true);
    expect(isTrafficChannel('google-ads')).toBe(false);
  });

  it('라벨은 언제나 사람이 읽을 문자열이다 — 빈 칸이 그려지지 않는다', () => {
    for (const channel of TRAFFIC_CHANNELS) {
      expect(trafficChannelLabel(channel.id).length).toBeGreaterThan(0);
    }
  });
});

describe('toTrafficSource — 빈 문자열을 저장하지 않는다', () => {
  it('공백뿐인 캠페인·리퍼러는 null 이 된다 (없음과 빈칸을 구분하지 않는다)', () => {
    const result = toTrafficSource({
      channel: 'naver',
      campaign: '   ',
      referrer: '',
      landedAt: LANDED,
    });

    expect(result).not.toBeNull();
    expect(result?.campaign).toBeNull();
    expect(result?.referrer).toBeNull();
  });

  it('값이 있으면 앞뒤 공백만 털고 그대로 담는다', () => {
    const result = toTrafficSource({
      channel: 'instagram',
      campaign: ' summer-sale ',
      referrer: ' https://example.com/a ',
      landedAt: LANDED,
    });

    expect(result?.campaign).toBe('summer-sale');
    expect(result?.referrer).toBe('https://example.com/a');
  });

  it('landedAt 이 없거나 날짜가 아니면 null — 시각을 지어내지 않는다', () => {
    expect(toTrafficSource({ channel: 'naver' })).toBeNull();
    expect(toTrafficSource({ channel: 'naver', landedAt: '어제' })).toBeNull();
  });
});

describe('firstTouch — 최초 접점은 덮어써지지 않는다', () => {
  it('이미 값이 있으면 새 접점이 와도 그대로다', () => {
    const first = source({ channel: 'instagram', campaign: 'brand-awareness' });
    const later = source({ channel: 'naver', landedAt: '2026-07-20T02:00:00.000Z' });

    // 인스타 광고로 알게 되어 며칠 뒤 검색으로 들어와 구매한 사람 — 공은 인스타의 것이다
    expect(firstTouch(first, later)).toBe(first);
  });

  it('아직 값이 없을 때만 새 접점이 자리를 차지한다', () => {
    const incoming = source({ channel: 'google' });
    expect(firstTouch(null, incoming)).toBe(incoming);
  });
});

describe('조회기 — 미배선은 null 이고, 쓰기 표면은 없다', () => {
  it('배선 전에는 null 이다', () => {
    resetTrafficSourceLookup();
    expect(trafficSourceOf({ domain: 'order', id: 'ord-1' })).toBeNull();
  });

  it('배선되면 그 값을 그대로 준다', () => {
    const known = source({ channel: 'kakao' });
    registerTrafficSourceLookup((ref) => (ref.id === 'ord-1' ? known : null));

    expect(trafficSourceOf({ domain: 'order', id: 'ord-1' })).toEqual(known);
    expect(trafficSourceOf({ domain: 'order', id: 'ord-2' })).toBeNull();
    resetTrafficSourceLookup();
  });

  it('조회기가 던져도 화면을 세우지 않는다 — 모르는 쪽으로 떨어진다', () => {
    registerTrafficSourceLookup(() => {
      throw new Error('저장소 사고');
    });

    expect(trafficSourceOf({ domain: 'member', id: 'm-1' })).toBeNull();
    resetTrafficSourceLookup();
  });
});
