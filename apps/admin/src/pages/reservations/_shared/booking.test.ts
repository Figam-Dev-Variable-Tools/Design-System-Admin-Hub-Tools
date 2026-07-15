// 예약 상태 흐름 규칙 테스트 (A41) — 전이·라벨·톤·타입가드(순수)
import { describe, expect, it } from 'vitest';

import {
  bookingStatusLabel,
  bookingStatusTone,
  canTransition,
  isBookingStatus,
  isTerminalStatus,
  nextStatuses,
  occupiesSlot,
  statusChoices,
} from './booking';

describe('상태 전이 규칙(순수)', () => {
  it('요청은 확정·취소로만 전이', () => {
    expect([...nextStatuses('requested')]).toEqual(['confirmed', 'cancelled']);
  });
  it('확정은 방문완료·노쇼·취소로 전이', () => {
    expect([...nextStatuses('confirmed')]).toEqual(['visited', 'noshow', 'cancelled']);
  });
  it('종료 상태(방문완료·노쇼·취소)는 전이 없음', () => {
    expect(isTerminalStatus('visited')).toBe(true);
    expect(isTerminalStatus('noshow')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('requested')).toBe(false);
  });
  it('canTransition — 자기 자신은 허용, 되돌리기는 금지', () => {
    expect(canTransition('requested', 'requested')).toBe(true);
    expect(canTransition('requested', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'requested')).toBe(false);
    expect(canTransition('visited', 'cancelled')).toBe(false);
  });
  it('statusChoices — 현재 상태 + 허용 전이', () => {
    expect([...statusChoices('requested')]).toEqual(['requested', 'confirmed', 'cancelled']);
    expect([...statusChoices('visited')]).toEqual(['visited']);
  });
});

describe('자리 점유·라벨·톤(순수)', () => {
  it('요청·확정·방문완료는 자리를 차지하고, 취소·노쇼는 비운다', () => {
    expect(occupiesSlot('requested')).toBe(true);
    expect(occupiesSlot('confirmed')).toBe(true);
    expect(occupiesSlot('visited')).toBe(true);
    expect(occupiesSlot('cancelled')).toBe(false);
    expect(occupiesSlot('noshow')).toBe(false);
  });
  it('완료 라벨은 도메인이 정한다', () => {
    expect(bookingStatusLabel('visited')).toBe('완료');
    expect(bookingStatusLabel('visited', '방문완료')).toBe('방문완료');
    expect(bookingStatusLabel('requested', '방문완료')).toBe('요청');
  });
  it('상태별 톤', () => {
    expect(bookingStatusTone('requested')).toBe('warning');
    expect(bookingStatusTone('confirmed')).toBe('info');
    expect(bookingStatusTone('visited')).toBe('success');
    expect(bookingStatusTone('noshow')).toBe('danger');
    expect(bookingStatusTone('cancelled')).toBe('neutral');
  });
});

describe('isBookingStatus 타입가드(순수)', () => {
  it('알려진 상태만 통과', () => {
    expect(isBookingStatus('confirmed')).toBe(true);
    expect(isBookingStatus('unknown')).toBe(false);
    expect(isBookingStatus(3)).toBe(false);
    expect(isBookingStatus(null)).toBe(false);
  });
});
