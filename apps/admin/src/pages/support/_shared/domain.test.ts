// 고객센터 도메인 규칙 회귀 테스트 — SLA·상태 전이·필터·검색·정렬·타입가드·템플릿(순수)
import { describe, expect, it } from 'vitest';

import {
  allowedNextStatuses,
  appendEvent,
  applyTemplate,
  canSetStatus,
  canTransition,
  categoryInUse,
  categoryUsageLabel,
  filterTickets,
  isTicketChannel,
  isTicketPriority,
  isTicketStatus,
  searchTemplates,
  searchTickets,
  slaDueAt,
  slaTargetHours,
  sortTickets,
  statusRequiresAssignee,
  templatesForCategory,
  ticketSlaState,
  toTicketInput,
} from './domain';
import type { ReplyTemplate, SupportCategoryUsage, Ticket, TicketEvent } from './domain';
import { countCategoryUsage } from './usage';

function ticketOf(overrides: Partial<Ticket> & { id: string }): Ticket {
  return {
    ticketNo: 'CS-20260714-001',
    title: '문의',
    categoryId: 'cat-order',
    categoryLabel: '주문/결제',
    channel: 'web',
    priority: 'normal',
    status: 'received',
    assignee: '',
    customerName: '홍길동',
    contact: 'hong@test.example',
    receivedAt: '2026-07-14T09:00:00',
    body: '내용',
    timeline: [],
    ...overrides,
  };
}

describe('SLA(순수)', () => {
  it('우선순위별 목표시간', () => {
    expect(slaTargetHours('urgent')).toBe(1);
    expect(slaTargetHours('low')).toBe(72);
  });

  it('마감 시각 = 접수 + 목표시간', () => {
    const due = slaDueAt({ receivedAt: '2026-07-14T09:00:00Z', priority: 'urgent' });
    expect(new Date(due).toISOString()).toBe('2026-07-14T10:00:00.000Z');
  });

  it('답변완료/종결이면 met, 마감 지나면 breached, 임박이면 due_soon', () => {
    const base = { receivedAt: '2026-07-14T09:00:00Z', priority: 'normal' as const };
    expect(ticketSlaState({ ...base, status: 'answered' })).toBe('met');
    expect(ticketSlaState({ ...base, status: 'closed' })).toBe('met');
    // normal=24h → 마감 09:00 다음날. 그보다 뒤면 초과
    expect(ticketSlaState({ ...base, status: 'received' }, new Date('2026-07-15T10:00:00Z'))).toBe(
      'breached',
    );
    // 남은 시간이 목표창의 25% 이하(<=6h)면 임박
    expect(ticketSlaState({ ...base, status: 'received' }, new Date('2026-07-15T05:00:00Z'))).toBe(
      'due_soon',
    );
    // 여유
    expect(ticketSlaState({ ...base, status: 'received' }, new Date('2026-07-14T10:00:00Z'))).toBe(
      'on_track',
    );
  });
});

describe('상태 전이(순수)', () => {
  it('허용 전이 목록은 현재 상태를 포함한다', () => {
    expect(allowedNextStatuses('received')).toEqual(['received', 'assigned', 'closed']);
    expect(allowedNextStatuses('closed')).toEqual(['closed']);
  });

  it('불가능한 전이를 막는다', () => {
    expect(canTransition('received', 'answered')).toBe(false);
    expect(canTransition('in_progress', 'answered')).toBe(true);
    expect(canTransition('closed', 'in_progress')).toBe(false);
  });

  it('처리중·답변완료는 담당 배정이 필요하다', () => {
    expect(statusRequiresAssignee('answered')).toBe(true);
    expect(statusRequiresAssignee('received')).toBe(false);
    expect(canSetStatus('in_progress', 'answered', '')).toBe(false);
    expect(canSetStatus('in_progress', 'answered', '김상담')).toBe(true);
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    ticketOf({
      id: 'a',
      status: 'received',
      channel: 'web',
      priority: 'high',
      categoryId: 'cat-order',
      receivedAt: '2026-07-10T09:00:00',
    }),
    ticketOf({
      id: 'b',
      status: 'answered',
      channel: 'kakao',
      priority: 'low',
      categoryId: 'cat-delivery',
      customerName: '이배송',
      receivedAt: '2026-07-14T09:00:00',
    }),
  ];

  it('상태·채널·우선순위·유형 복합 필터', () => {
    expect(filterTickets(list, 'received', 'all', 'all', 'all').map((t) => t.id)).toEqual(['a']);
    expect(filterTickets(list, 'all', 'kakao', 'all', 'all').map((t) => t.id)).toEqual(['b']);
    expect(filterTickets(list, 'all', 'all', 'high', 'all').map((t) => t.id)).toEqual(['a']);
    expect(filterTickets(list, 'all', 'all', 'all', 'cat-delivery').map((t) => t.id)).toEqual([
      'b',
    ]);
  });

  it('제목·고객 검색', () => {
    expect(searchTickets(list, '이배송').map((t) => t.id)).toEqual(['b']);
  });

  it('접수일시 내림차순', () => {
    expect(sortTickets(list).map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('toTicketInput 은 id·categoryLabel 을 뺀다', () => {
    const input = toTicketInput(ticketOf({ id: 'a' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('categoryLabel');
  });
});

describe('타입가드(순수)', () => {
  it('유효한 값만 좁힌다', () => {
    expect(isTicketStatus('answered')).toBe(true);
    expect(isTicketStatus('bogus')).toBe(false);
    expect(isTicketChannel('kakao')).toBe(true);
    expect(isTicketChannel(1)).toBe(false);
    expect(isTicketPriority('urgent')).toBe(true);
    expect(isTicketPriority(null)).toBe(false);
  });
});

describe('타임라인·템플릿(순수)', () => {
  it('appendEvent 는 끝에 덧붙이고 원본을 바꾸지 않는다', () => {
    const base: readonly TicketEvent[] = [
      { id: 'e1', at: '2026-07-14T09:00:00', author: '시스템', kind: 'received', text: '접수' },
    ];
    const next = appendEvent(base, {
      id: 'e2',
      at: '2026-07-14T10:00:00',
      author: '관리자',
      kind: 'reply',
      text: '답변',
    });
    expect(next).toHaveLength(2);
    expect(base).toHaveLength(1);
  });

  it('applyTemplate 은 치환 변수를 실제 값으로 바꾼다', () => {
    const out = applyTemplate('{{고객명}}님, {{문의번호}} 담당 {{담당자}}', {
      customerName: '박고객',
      ticketNo: 'CS-1',
      assignee: '',
    });
    expect(out).toBe('박고객님, CS-1 담당 담당자');
  });

  it('templatesForCategory 는 해당 유형 + 공용만 추린다', () => {
    const templates: readonly ReplyTemplate[] = [
      { id: 't1', title: 'A', categoryId: 'cat-order', categoryLabel: '주문/결제', body: '' },
      { id: 't2', title: 'B', categoryId: 'cat-delivery', categoryLabel: '배송', body: '' },
      { id: 't3', title: 'C', categoryId: '', categoryLabel: '전체', body: '' },
    ];
    expect(templatesForCategory(templates, 'cat-order').map((t) => t.id)).toEqual(['t1', 't3']);
    expect(searchTemplates(templates, 'B').map((t) => t.id)).toEqual(['t2']);
  });
});

describe('유형 사용 건수(순수)', () => {
  const usage: SupportCategoryUsage = {
    id: 'c',
    label: '주문',
    active: true,
    ticketCount: 2,
    templateCount: 1,
  };

  it('사용 중 판정·라벨', () => {
    expect(categoryInUse(usage)).toBe(true);
    expect(categoryUsageLabel(usage)).toBe('티켓 2 · 템플릿 1');
    expect(categoryInUse({ ...usage, ticketCount: 0, templateCount: 0 })).toBe(false);
    expect(categoryUsageLabel({ ...usage, ticketCount: 0, templateCount: 0 })).toBe('사용 안 함');
  });

  it('countCategoryUsage 는 티켓·템플릿을 각각 센다', () => {
    const tickets = [{ categoryId: 'c' }, { categoryId: 'c' }, { categoryId: 'x' }];
    const templates = [{ categoryId: 'c' }, { categoryId: 'y' }];
    expect(countCategoryUsage('c', tickets, templates)).toEqual({ tickets: 2, templates: 1 });
  });
});
