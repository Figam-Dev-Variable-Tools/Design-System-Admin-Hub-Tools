// 이메일 발송 회귀 테스트 — 필터·검색·정렬(순수) + 폼 검증(발신자·수신자·광고제목·수신거부·예약)
import { describe, expect, it } from 'vitest';

import {
  filterEmailCampaigns,
  searchEmailCampaigns,
  sortEmailCampaigns,
  toEmailInput,
} from './types';
import type { EmailCampaign } from './types';
import { emailSchema } from './validation';
import type { EmailFormValues } from './validation';

function campaignOf(overrides: Partial<EmailCampaign> & { id: string }): EmailCampaign {
  return {
    name: '발송',
    subject: '소식',
    senderId: 'from-news',
    senderEmail: 'news@spaceplanning.ai',
    senderName: '뉴스',
    segmentIds: ['seg-newsletter'],
    recipientCount: 100,
    isAd: false,
    body: '본문',
    includeUnsubscribe: true,
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
    ...overrides,
  };
}

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    campaignOf({ id: 'a', name: '가발송', status: 'sent', scheduledAt: '2026-07-01T09:00' }),
    campaignOf({ id: 'b', name: '나발송', subject: '특가', status: 'draft', scheduledAt: '' }),
  ];
  it('상태 필터', () => {
    expect(filterEmailCampaigns(list, 'sent').map((c) => c.id)).toEqual(['a']);
    expect(filterEmailCampaigns(list, 'all')).toHaveLength(2);
  });
  it('제목 검색', () => {
    expect(searchEmailCampaigns(list, '특가').map((c) => c.id)).toEqual(['b']);
  });
  it('예약일시 내림차순', () => {
    expect(sortEmailCampaigns(list).map((c) => c.id)).toEqual(['a', 'b']);
  });
  it('toEmailInput 은 파생값을 뺀다', () => {
    const input = toEmailInput(campaignOf({ id: 'a' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('senderEmail');
    expect(input).not.toHaveProperty('stats');
  });
});

function valuesOf(overrides: Partial<EmailFormValues> = {}): EmailFormValues {
  return {
    name: '7월 뉴스레터',
    subject: '7월의 소식',
    senderId: 'from-news',
    segmentIds: ['seg-newsletter'],
    isAd: false,
    body: '본문입니다.',
    includeUnsubscribe: true,
    status: 'draft',
    scheduledAt: '',
    ...overrides,
  };
}

function messageFor(values: EmailFormValues, path: string): string | undefined {
  const result = emailSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('emailSchema — 발송 경계값', () => {
  it('정상 초안은 통과한다', () => {
    expect(emailSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('제목이 비면 막는다', () => {
    expect(messageFor(valuesOf({ subject: '' }), 'subject')).toContain('입력');
  });
  it('미검증 발신자는 막는다', () => {
    expect(messageFor(valuesOf({ senderId: 'from-noreply' }), 'senderId')).toContain('검증');
  });
  it('수신자 세그먼트가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ segmentIds: [] }), 'segmentIds')).toContain('하나 이상');
  });
  it('광고성인데 제목에 (광고)가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ isAd: true, subject: '특가 세일' }), 'subject')).toContain('광고');
  });
  it('광고성 + (광고) 제목은 통과한다', () => {
    expect(
      emailSchema.safeParse(valuesOf({ isAd: true, subject: '(광고) 특가 세일' })).success,
    ).toBe(true);
  });
  it('수신거부 링크 미포함은 막는다', () => {
    expect(messageFor(valuesOf({ includeUnsubscribe: false }), 'includeUnsubscribe')).toContain(
      '수신거부',
    );
  });
  it('예약 과거시각은 막는다', () => {
    expect(
      messageFor(valuesOf({ status: 'scheduled', scheduledAt: '2020-01-01T10:00' }), 'scheduledAt'),
    ).toContain('이후');
  });
});
