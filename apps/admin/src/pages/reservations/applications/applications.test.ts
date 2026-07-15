// 신청서 동작 회귀 테스트 (A41) — 상태 전이·필터·검색·정렬·타임라인 환산(순수)
import { describe, expect, it } from 'vitest';

import {
  canTransition,
  filterApplications,
  isApplicationStatus,
  isTerminalStatus,
  searchApplications,
  sortApplications,
  statusChoices,
  toTimelineEvents,
} from './types';
import type { Application, ApplicationEvent } from './types';

function applicationOf(overrides: Partial<Application> & { id: string }): Application {
  return {
    code: 'APP-20260716-000',
    type: 'quote',
    applicantName: '한빛기획',
    applicantContact: 'a@b.co',
    submittedAt: '2026-07-16T09:00:00',
    status: 'received',
    fields: [],
    adminNote: '',
    history: [],
    ...overrides,
  };
}

describe('상태 전이 규칙(순수)', () => {
  it('접수 → 검토/반려', () => {
    expect([...statusChoices('received')]).toEqual(['received', 'reviewing', 'rejected']);
  });
  it('검토 → 승인/반려, 승인 → 완료', () => {
    expect(canTransition('reviewing', 'approved')).toBe(true);
    expect(canTransition('approved', 'completed')).toBe(true);
    expect(canTransition('received', 'completed')).toBe(false);
  });
  it('반려·완료는 종료', () => {
    expect(isTerminalStatus('rejected')).toBe(true);
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('received')).toBe(false);
  });
  it('isApplicationStatus 타입가드', () => {
    expect(isApplicationStatus('approved')).toBe(true);
    expect(isApplicationStatus('nope')).toBe(false);
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    applicationOf({
      id: 'a',
      status: 'received',
      submittedAt: '2026-07-14T09:00:00',
      code: 'APP-1',
      applicantName: '가나기획',
    }),
    applicationOf({
      id: 'b',
      status: 'approved',
      submittedAt: '2026-07-16T09:00:00',
      code: 'APP-2',
      applicantName: '다라물산',
    }),
  ];

  it('상태 필터', () => {
    expect(filterApplications(list, 'approved').map((a) => a.id)).toEqual(['b']);
    expect(filterApplications(list, 'all')).toHaveLength(2);
  });
  it('신청자 검색', () => {
    expect(searchApplications(list, '다라').map((a) => a.id)).toEqual(['b']);
  });
  it('접수일시 내림차순 정렬', () => {
    expect(sortApplications(list).map((a) => a.id)).toEqual(['b', 'a']);
  });
});

describe('toTimelineEvents — 이력 환산(순수)', () => {
  it('상태·작성자·본문으로 환산하고 메모 없으면 기본 문구', () => {
    const history: readonly ApplicationEvent[] = [
      { id: 'h1', at: '2026-07-16T09:00:00', status: 'received', by: '시스템', note: '접수' },
      { id: 'h2', at: '2026-07-16T10:00:00', status: 'reviewing', by: '박컨설', note: '' },
    ];
    const events = toTimelineEvents(history);
    expect(events.map((event) => event.badgeLabel)).toEqual(['접수', '검토중']);
    expect(events.map((event) => event.badgeTone)).toEqual(['neutral', 'info']);
    // 메모가 없으면 기본 문구, 있으면 메모 그대로
    expect(events.map((event) => event.text)).toEqual(['접수', '검토중(으)로 변경']);
  });
});
