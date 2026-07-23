// SMS 발송 회귀 테스트 — 유형 판정·필터·정렬(순수) + 폼 검증(발신번호·수신자·광고·예약·야간)
import { describe, expect, it } from 'vitest';

import { smsAdapter } from './data-source';
import {
  campaignKind,
  filterSmsCampaigns,
  searchSmsCampaigns,
  sortSmsCampaigns,
  toSmsInput,
} from './types';
import type { SmsCampaign } from './types';
import { smsSchema } from './validation';
import type { SmsFormValues } from './validation';

function campaignOf(overrides: Partial<SmsCampaign> & { id: string }): SmsCampaign {
  return {
    name: '발송',
    senderId: 'snd-main',
    senderNumber: '15881234',
    segmentIds: ['seg-all'],
    recipientCount: 100,
    isAd: false,
    body: '정보성 안내예요.',
    hasImage: false,
    kind: 'sms',
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0 },
    ...overrides,
  };
}

describe('campaignKind (SMS/LMS/MMS 자동판정)', () => {
  it('90byte 이하 텍스트는 SMS', () => {
    expect(campaignKind('짧은 문구', false)).toBe('sms');
  });
  it('90byte 초과는 LMS', () => {
    expect(campaignKind('가'.repeat(50), false)).toBe('lms');
  });
  it('이미지가 있으면 MMS', () => {
    expect(campaignKind('짧은 문구', true)).toBe('mms');
  });
});

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    campaignOf({ id: 'a', name: '가발송', status: 'sent', scheduledAt: '2026-07-01T10:00' }),
    campaignOf({ id: 'b', name: '나발송', status: 'draft', scheduledAt: '' }),
  ];
  it('상태 필터', () => {
    expect(filterSmsCampaigns(list, 'sent').map((c) => c.id)).toEqual(['a']);
    expect(filterSmsCampaigns(list, 'all')).toHaveLength(2);
  });
  it('발송명 검색', () => {
    expect(searchSmsCampaigns(list, '나발송').map((c) => c.id)).toEqual(['b']);
  });
  it('예약일시 내림차순(예약 있는 것이 위)', () => {
    expect(sortSmsCampaigns(list).map((c) => c.id)).toEqual(['a', 'b']);
  });
  it('toSmsInput 은 파생값을 뺀다', () => {
    const input = toSmsInput(campaignOf({ id: 'a' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('senderNumber');
    expect(input).not.toHaveProperty('kind');
    expect(input).not.toHaveProperty('stats');
  });
});

function valuesOf(overrides: Partial<SmsFormValues> = {}): SmsFormValues {
  return {
    name: '7월 안내',
    senderId: 'snd-main',
    segmentIds: ['seg-all'],
    isAd: false,
    hasImage: false,
    body: '정보성 안내예요.',
    status: 'draft',
    scheduledAt: '',
    ...overrides,
  };
}

function messageFor(values: SmsFormValues, path: string): string | undefined {
  const result = smsSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('smsSchema — 발송 경계값', () => {
  it('정상 초안은 통과한다', () => {
    expect(smsSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('발송명이 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
  });
  it('미검증 발신번호는 막는다', () => {
    expect(messageFor(valuesOf({ senderId: 'snd-new' }), 'senderId')).toContain('검증');
  });
  it('발신번호 미선택은 막는다', () => {
    expect(messageFor(valuesOf({ senderId: '' }), 'senderId')).toContain('선택');
  });
  it('수신자 세그먼트가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ segmentIds: [] }), 'segmentIds')).toContain('하나 이상');
  });
  it('광고성인데 (광고)/수신거부가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ isAd: true, body: '여름세일 안내' }), 'body')).toContain('광고');
  });
  it('광고성 요건을 갖추면 통과한다', () => {
    expect(
      smsSchema.safeParse(
        valuesOf({ isAd: true, body: '(광고) 여름세일 무료수신거부 080-123-4567' }),
      ).success,
    ).toBe(true);
  });
  it('예약인데 일시가 비면 막는다', () => {
    expect(messageFor(valuesOf({ status: 'scheduled', scheduledAt: '' }), 'scheduledAt')).toContain(
      '입력',
    );
  });
  it('예약 일시가 과거면 막는다', () => {
    expect(
      messageFor(valuesOf({ status: 'scheduled', scheduledAt: '2020-01-01T10:00' }), 'scheduledAt'),
    ).toContain('이후');
  });
  it('광고성 + 야간(23시) 예약은 막는다', () => {
    expect(
      messageFor(
        valuesOf({
          isAd: true,
          body: '(광고) 세일 무료수신거부 080',
          status: 'scheduled',
          scheduledAt: '2030-01-01T23:00',
        }),
        'scheduledAt',
      ),
    ).toContain('야간');
  });
  it('정보성은 야간 예약이 허용된다', () => {
    expect(
      smsSchema.safeParse(valuesOf({ status: 'scheduled', scheduledAt: '2030-01-01T23:00' }))
        .success,
    ).toBe(true);
  });
});

/**
 * 편집 게이팅의 어댑터 강제 — 화면만 가리면 우회된다.
 *
 * 목록의 onEdit 을 상태로 가려도 `/marketing/sms/sms-1/edit` 을 주소창에 직접 치면 폼이 열리고,
 * 그대로 저장하면 발송완료 캠페인의 상태가 '초안'으로 강등된다(FS-034 §7 #11). 백엔드가 없으므로
 * **어댑터가 이 전이의 정본**이고, 여기서 422 로 막는 것이 유일한 실효 방어선이다
 * (BE-034 §3.1 `CAMPAIGN_NOT_EDITABLE`). 픽스처는 모듈 상태라 순서에 의존한다.
 */
describe('발송 상태별 편집 게이팅(어댑터)', () => {
  const signal = new AbortController().signal;

  it('초안·예약은 저장된다', async () => {
    const draft = await smsAdapter.fetchOne('sms-3', signal);
    await smsAdapter.update('sms-3', { ...toSmsInput(draft), name: '배송 지연 사과 안내(수정)' });
    expect((await smsAdapter.fetchOne('sms-3', signal)).name).toBe('배송 지연 사과 안내(수정)');

    const scheduled = await smsAdapter.fetchOne('sms-2', signal);
    await smsAdapter.update('sms-2', { ...toSmsInput(scheduled), name: 'VIP 사은품 안내(수정)' });
    expect((await smsAdapter.fetchOne('sms-2', signal)).name).toBe('VIP 사은품 안내(수정)');
  });

  it('발송완료 캠페인의 수정은 422 로 거절하고 원본을 그대로 둔다', async () => {
    // sms-1: status 'sent'
    const sent = await smsAdapter.fetchOne('sms-1', signal);

    await expect(
      smsAdapter.update('sms-1', { ...toSmsInput(sent), name: '몰래 고친 이름', status: 'draft' }),
    ).rejects.toMatchObject({ status: 422 });

    const after = await smsAdapter.fetchOne('sms-1', signal);
    expect(after.name).toBe(sent.name);
    expect(after.status).toBe('sent');
  });
});
