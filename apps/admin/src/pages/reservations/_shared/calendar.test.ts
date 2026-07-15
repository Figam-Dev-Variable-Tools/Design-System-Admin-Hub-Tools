// 예약 달력·시간슬롯 헬퍼 테스트 (A41) — 분 환산·겹침·주 계산·과거 판정(순수)
import { describe, expect, it } from 'vitest';

import {
  addDays,
  formatDayLabel,
  isPastDateTime,
  isRealDate,
  isToday,
  rangesOverlap,
  startOfWeek,
  toDateString,
  toMinutes,
  weekDates,
  weekdayLabel,
} from './calendar';

describe('toMinutes(순수)', () => {
  it('시각을 분으로', () => {
    expect(toMinutes('09:00')).toBe(540);
    expect(toMinutes('13:30')).toBe(810);
  });
  it('형식·범위 오류는 NaN', () => {
    expect(Number.isNaN(toMinutes('9:00'))).toBe(true);
    expect(Number.isNaN(toMinutes('25:00'))).toBe(true);
    expect(Number.isNaN(toMinutes('10:70'))).toBe(true);
  });
});

describe('rangesOverlap(순수)', () => {
  it('겹치면 true, 경계 접함은 false', () => {
    expect(rangesOverlap(600, 660, 630, 690)).toBe(true);
    expect(rangesOverlap(540, 600, 600, 660)).toBe(false);
    expect(rangesOverlap(540, 600, 660, 720)).toBe(false);
  });
});

describe('날짜 계산(순수)', () => {
  it('addDays — 월 경계를 넘어간다', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
  });
  it('startOfWeek — 그 주 월요일', () => {
    // 2026-07-16 은 목요일 → 월요일은 2026-07-13
    expect(startOfWeek('2026-07-16')).toBe('2026-07-13');
    // 일요일(2026-07-19)의 주 시작도 2026-07-13
    expect(startOfWeek('2026-07-19')).toBe('2026-07-13');
  });
  it('weekDates — 월~일 7일', () => {
    const dates = weekDates('2026-07-16');
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-07-13');
    expect(dates[6]).toBe('2026-07-19');
  });
  it('weekdayLabel·formatDayLabel', () => {
    expect(weekdayLabel('2026-07-16')).toBe('목');
    expect(formatDayLabel('2026-07-16')).toBe('7월 16일 (목)');
  });
  it('isRealDate — 달력상 존재해야 참', () => {
    expect(isRealDate('2026-07-16')).toBe(true);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2026-7-1')).toBe(false);
  });
});

describe('isToday·isPastDateTime(순수, now 주입)', () => {
  const now = new Date(2026, 6, 16, 12, 0, 0); // 2026-07-16 12:00

  it('isToday', () => {
    expect(isToday('2026-07-16', now)).toBe(true);
    expect(isToday('2026-07-17', now)).toBe(false);
    expect(toDateString(now)).toBe('2026-07-16');
  });
  it('과거 일시는 참, 미래는 거짓', () => {
    expect(isPastDateTime('2026-07-16', '11:00', now)).toBe(true);
    expect(isPastDateTime('2026-07-16', '13:00', now)).toBe(false);
    expect(isPastDateTime('2026-07-15', '23:00', now)).toBe(true);
  });
  it('형식 오류는 과거로 보지 않는다', () => {
    expect(isPastDateTime('', '', now)).toBe(false);
  });
});
