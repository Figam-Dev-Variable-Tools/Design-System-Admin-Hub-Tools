// 예약 달력·시간슬롯 헬퍼 테스트 — 분 환산·겹침·주 계산·과거 판정(순수)
import { afterEach, describe, expect, it } from 'vitest';

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

/**
 * 이 프로세스가 원래 보던 타임존 — **resolved 값**을 잡아 둔다.
 *
 * [왜 process.env.TZ 를 저장하지 않는가 — 실제로 밟은 지뢰]
 * 이 호스트에서 `process.env.TZ` 는 **undefined** 다(존은 OS 가 준다). 그래서 흔한 관용구인
 *   `const original = process.env.TZ; … process.env.TZ = original;`
 * 는 복원이 아니라 **파괴**다: undefined 를 대입하면 문자열 `'undefined'` 가 들어가 존이
 * `Etc/Unknown` 이 된다. `delete process.env.TZ` 도 되돌리지 못한다(Node 가 이미 바뀐 존을 문다).
 * 그 오염은 이 파일을 넘어간다 — vitest 워커는 프로세스를 재사용하므로, 뒤에 같은 워커에서
 * 도는 다른 테스트가 날짜를 잘못 읽고 **간헐적으로** 깨진다(실제로 pre-commit 이 한 번 그렇게
 * 무너졌다). 되돌리는 유일한 방법은 원래 **존 이름을 명시적으로 다시 대입**하는 것이다.
 */
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function restoreZone(): void {
  process.env.TZ = ORIGINAL_ZONE;
}

/* ── 실재하는 순간 → 달력 날짜는 **서울 기준**이다 (ERP-09) ────────────────────
 *
 * [왜 타임존을 바꿔 가며 보나] 이 결함은 개발자의 노트북(Asia/Seoul)에서는 **절대 보이지 않는다** —
 * 로컬 기준과 KST 가 같기 때문이다. 기존 테스트가 못 잡은 이유도 그것이다: now 를
 * `new Date(2026, 6, 16, 12, 0, 0)` 처럼 **로컬 파츠로** 만들면 그 전제 자체가 보는 사람의
 * 타임존을 따라 움직여서, 어느 존에서 돌려도 초록불이 난다.
 *
 * 그래서 순간을 UTC 로 못박고 TZ 를 실제로 바꿔서 본다. */

describe('isToday·isPastDateTime — 보는 사람의 타임존이 답을 바꾸지 않는다', () => {
  // 2026-07-17T22:30Z = 서울 2026-07-18 07:30. 서울의 업무일은 07-18 이고 07:00 슬롯은 이미 지났다.
  const now = new Date('2026-07-17T22:30:00Z');
  afterEach(restoreZone);

  /** 이 존들에서 로컬 날짜는 07-17 이거나(뉴욕·UTC) 시각이 어긋난다(베를린) — 서울과 갈린다 */
  const zones = ['UTC', 'America/New_York', 'Europe/Berlin', 'America/Los_Angeles'] as const;

  it("'오늘'은 어느 존에서 보든 서울의 오늘이다", () => {
    for (const zone of zones) {
      process.env.TZ = zone;
      // TZ 가 정말 적용됐는지 확인한다 — 안 먹으면 이 테스트는 아무것도 지키지 않는다
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);

      expect(isToday('2026-07-18', now)).toBe(true);
      expect(isToday('2026-07-17', now)).toBe(false);
    }
  });

  it('이미 지난 슬롯은 어느 존에서 보든 과거다 — 07:30 KST 에 07:00 은 지났다', () => {
    for (const zone of zones) {
      process.env.TZ = zone;
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);

      // 베를린 운영자에게 이 슬롯이 '예약 가능'으로 보이면 그 예약은 과거로 들어간다
      expect(isPastDateTime('2026-07-18', '07:00', now)).toBe(true);
      expect(isPastDateTime('2026-07-18', '08:00', now)).toBe(false);
    }
  });
});

/* ── 날짜 문자열 산술은 타임존과 무관하다 ─────────────────────────────────────
 *
 * 이쪽은 순간이 개입하지 않아 오프셋이 상쇄된다 — UTC 정오로 바꿔도 얻는 것이 없다는 근거를
 * 못박아 둔다(같은 입력 → 같은 출력, 존 무관). */

describe('날짜 문자열 산술 — 존이 바뀌어도 같은 답', () => {
  afterEach(restoreZone);

  it('addDays·startOfWeek·weekdayLabel 은 존과 무관하다', () => {
    // 자정에 DST 가 걸리는 존(Santiago)과 날짜변경선 근처(Midway)까지 포함한다
    for (const zone of ['UTC', 'America/New_York', 'America/Santiago', 'Pacific/Midway']) {
      process.env.TZ = zone;
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);

      expect(addDays('2026-07-16', 1)).toBe('2026-07-17');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(startOfWeek('2026-07-16')).toBe('2026-07-13');
      expect(weekdayLabel('2026-07-16')).toBe('목');
      expect(isRealDate('2026-02-30')).toBe(false);
    }
  });
});
