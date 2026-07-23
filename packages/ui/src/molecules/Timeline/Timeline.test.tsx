// Timeline — 계약 검증 테스트 (contracts/Timeline.contract.json@1.0.0)
//
//   default   events 를 <ol aria-label> + <li> 로 렌더, 각 칸에 StatusBadge·작성자·시각·본문
//   format    at(ISO)을 'YYYY-MM-DD HH:mm'(로컬)로 표기, 파싱 실패면 원문 유지
//   empty     빈 배열이면 emptyLabel 을 렌더한다
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Timeline } from './Timeline';
import type { TimelineEvent } from './Timeline';

const EVENT: TimelineEvent = {
  id: '1',
  at: '2026-07-14T09:31:00',
  badgeTone: 'success',
  badgeLabel: '고객답변',
  author: '김담당',
  text: '재발행 완료.',
};

describe('Timeline — 계약 states·format', () => {
  it('Timeline: default — <ol> 이 label 로 이름을 갖고 각 이벤트를 배지·작성자·본문으로 렌더한다', () => {
    render(<Timeline events={[EVENT]} label="문의 처리 이력" />);
    const list = screen.getByRole('list', { name: '문의 처리 이력' });
    expect(list.tagName).toBe('OL');
    expect(screen.getByText('고객답변')).not.toBeNull();
    expect(screen.getByText('김담당')).not.toBeNull();
    expect(screen.getByText('재발행 완료.')).not.toBeNull();
  });

  it("Timeline: at(ISO)을 'YYYY-MM-DD HH:mm' 로 표기한다 (로컬 타임존)", () => {
    render(<Timeline events={[EVENT]} label="이력" />);
    expect(screen.getByText('2026-07-14 09:31')).not.toBeNull();
  });

  it('Timeline: at 파싱이 실패하면 원문을 그대로 표기한다', () => {
    render(<Timeline events={[{ ...EVENT, at: 'not-a-date' }]} label="이력" />);
    expect(screen.getByText('not-a-date')).not.toBeNull();
  });

  it('Timeline: 빈 배열이면 목록 대신 emptyLabel 을 렌더한다', () => {
    render(<Timeline events={[]} label="이력" emptyLabel="기록된 이력이 없어요." />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('기록된 이력이 없어요.')).not.toBeNull();
  });
});
