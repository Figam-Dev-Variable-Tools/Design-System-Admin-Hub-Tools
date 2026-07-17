// shared/format 의 규칙 고정 (apps/admin/src/shared/format.ts)
//
// [왜 이 파일이 있나] 여기 있는 규칙들은 전부 **여러 사본이 각자 구현하던 것**이 수렴한 결과다.
// 조사(ERP-13)는 세 곳이, 시각 표기·달력 산술(ERP-09)은 세 곳이 각자 갖고 있었다. 수렴하면서
// 각 사본이 지키던 경계 조건을 여기 한 벌로 모은다 — **사본이 사라져도 그 사본이 알고 있던
// 사실은 남아야 한다.** 이 파일이 그 기억이다.
import { describe, expect, it } from 'vitest';

import {
  dayCount,
  daysBetween,
  directionParticle,
  formatDate,
  formatDateTime,
  isCalendarDate,
  objectParticle,
  seoulDayOf,
  shiftDays,
  topicParticle,
} from './format';

/* ── 시각 표기 — 고정 표시 타임존 (ERP-09) ─────────────────────────────────────
 *
 * [이 블록이 곧 ERP-09 의 acceptance 다]
 *   "포맷 함수 정의 TZ, UTC 입력이 OS TZ 무관 동일"
 *
 * 아래 단언들은 **러너의 OS 타임존이 무엇이든 통과해야 한다.** 그것을 확인하는 방법은
 * 프로세스 TZ 를 바꿔 두 번 돌리는 것이다:
 *
 *   TZ=Asia/Seoul      npx vitest run src/shared/format.test.ts
 *   TZ=America/New_York npx vitest run src/shared/format.test.ts
 *
 * 두 실행의 결과가 같아야 한다. 예전 구현(브라우저 로컬 게터)은 이 파일을 통과하지 못한다 —
 * 그것이 이 블록이 존재하는 이유다. **테스트가 로컬 타임존을 타면 그 테스트는 버그를 고정한다.**
 */

describe('시각 — 표시 타임존은 Asia/Seoul 로 고정이다 (ERP-09)', () => {
  it('UTC 입력을 KST 로 환산해 그린다 (+9시간)', () => {
    // 러너가 뉴욕이든 서울이든 이 값이어야 한다 — 그것이 이 함수의 존재 이유다
    expect(formatDateTime('2026-07-14T02:31:09Z')).toBe('2026-07-14 11:31');
  });

  it('**러너 타임존과 무관하게 같은 벽시계 문자열이다** — acceptance 그 자체', () => {
    // 이 단언은 '무엇이 나오는가'가 아니라 '무엇에 의존하지 않는가'를 고정한다.
    // 하드코딩된 기대값이 곧 KST 의 벽시계이고, 러너의 시계는 이 식에 등장하지 않는다.
    const utcNoon = '2026-01-15T12:00:00Z'; // 겨울 — 서머타임을 쓰는 존이라면 여기서 갈린다
    const utcSummer = '2026-07-15T12:00:00Z'; // 여름 — KST 는 둘 다 UTC+9 로 같아야 한다
    expect(formatDateTime(utcNoon)).toBe('2026-01-15 21:00');
    expect(formatDateTime(utcSummer)).toBe('2026-07-15 21:00');

    // 한국은 서머타임이 없다 — 두 계절의 오프셋이 같다는 것을 명시적으로 못박는다
    expect(formatDateTime('2026-01-15T00:00:00Z')).toBe('2026-01-15 09:00');
    expect(formatDateTime('2026-07-15T00:00:00Z')).toBe('2026-07-15 09:00');
  });

  it('자정을 넘는 환산에서 날짜가 함께 넘어간다', () => {
    // UTC 22:00 은 서울의 **다음 날** 오전 7시다
    expect(formatDateTime('2026-07-14T22:00:00Z')).toBe('2026-07-15 07:00');
  });

  it('같은 순간을 다르게 적은 두 ISO 는 같은 시각으로 나온다', () => {
    expect(formatDateTime('2026-07-14T11:31:00+09:00')).toBe(
      formatDateTime('2026-07-14T02:31:00Z'),
    );
    expect(formatDateTime('2026-07-13T22:31:00-04:00')).toBe(
      formatDateTime('2026-07-14T02:31:00Z'),
    );
  });

  it('formatDate 도 KST 고정이다 — new Date() 를 주면 그것이 서울의 오늘이다', () => {
    // 2026-07-15 16:30 UTC = 2026-07-16 01:30 KST → 서울에서는 이미 16일이다
    expect(formatDate(new Date('2026-07-15T16:30:00Z'))).toBe('2026-07-16');
    // 2026-07-15 14:59 UTC = 2026-07-15 23:59 KST → 서울 자정 직전은 아직 전날이다
    expect(formatDate(new Date('2026-07-15T14:59:00Z'))).toBe('2026-07-15');
  });

  it('seoulDayOf — 달력일은 KST 기준이다 (자르기가 아니다)', () => {
    // iso.slice(0,10) 이었다면 '2026-07-14' 가 나와 하루가 밀린다 (login-history 의 실제 버그)
    expect(seoulDayOf('2026-07-14T22:00:00Z')).toBe('2026-07-15');
    expect(seoulDayOf('2026-07-14T00:30:00Z')).toBe('2026-07-14');
  });

  it('파싱할 수 없는 값은 지어내지 않는다', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date'); // 원본을 그대로
    expect(seoulDayOf('not-a-date')).toBeNull();
    expect(formatDate(new Date('not-a-date'))).toBe(''); // 'NaN-NaN-NaN' 을 흘리지 않는다
  });
});

/* ── 달력일 산술 (ERP-09 — 앵커는 UTC 정오) ────────────────────────────────── */

describe('달력일 산술 — 날짜를 더한다, 시각을 더하지 않는다', () => {
  it('shiftDays 는 월·연 경계를 넘는다', () => {
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDays('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('윤년 2월을 넘나든다', () => {
    expect(shiftDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDays('2028-02-28', 2)).toBe('2028-03-01');
  });

  it('형식이 아니면 그대로 돌려준다 — 지어낸 날짜를 만들지 않는다', () => {
    expect(shiftDays('', 30)).toBe('');
    expect(shiftDays('2026-7-1', 1)).toBe('2026-7-1');
  });

  it('daysBetween 은 차이, dayCount 는 양 끝 포함 일수다', () => {
    expect(daysBetween('2026-07-10', '2026-07-16')).toBe(6);
    expect(daysBetween('2026-07-16', '2026-07-16')).toBe(0);
    expect(daysBetween('2026-07-16', '2026-07-10')).toBe(-6); // 뒤집히면 음수 — 검증이 이걸 본다
    expect(dayCount('2026-07-01', '2026-07-01')).toBe(1);
    expect(dayCount('2026-07-01', '2026-07-10')).toBe(10);
  });

  it('산술의 앵커가 UTC 정오라 러너 타임존을 타지 않는다', () => {
    // 자정 앵커였다면 음수 오프셋 존에서 하루가 밀릴 수 있는 자리들이다.
    // (두 앵커는 UTC 앵커라 실제로는 동치다 — 이 단언은 그 동치가 깨지는 날을 잡는다.)
    expect(shiftDays('2026-01-01', 0)).toBe('2026-01-01');
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(dayCount('2026-01-01', '2026-12-31')).toBe(365);
  });

  it('형식이 아니면 null — NaN 을 흘려보내지 않는다', () => {
    expect(daysBetween('2026-07-01', 'nope')).toBeNull();
    expect(dayCount('nope', '2026-07-01')).toBeNull();
  });

  it('isCalendarDate — 실재하지 않는 날짜를 걸러내고, 타입가드로 좁혀 준다', () => {
    expect(isCalendarDate('2026-07-16')).toBe(true);
    expect(isCalendarDate('2026-02-28')).toBe(true);
    expect(isCalendarDate('2026-02-31')).toBe(false); // 형식은 맞지만 존재하지 않는다
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-7-1')).toBe(false); // 0패딩이 아니면 사전순 비교가 깨진다
    expect(isCalendarDate('20260716')).toBe(false);
    // unknown 을 받는다 — URL 파라미터(string | null)를 캐스팅 없이 그대로 넘길 수 있다
    expect(isCalendarDate(20260716)).toBe(false);
    expect(isCalendarDate(null)).toBe(false);
    expect(isCalendarDate(undefined)).toBe(false);
  });
});

describe('조사(助詞) — 받침으로 고른다 (ERP-13)', () => {
  it('목적격: 받침이 있으면 "을", 없으면 "를"', () => {
    expect(objectParticle('기록')).toBe('을'); // ㄱ 받침
    expect(objectParticle('알림')).toBe('을'); // ㅁ 받침
    expect(objectParticle('템플릿')).toBe('을'); // ㅅ 받침
    expect(objectParticle('메시지')).toBe('를'); // 받침 없음
    expect(objectParticle('관리자 로그')).toBe('를');
  });

  it('보조사: 받침이 있으면 "은", 없으면 "는"', () => {
    expect(topicParticle('본문')).toBe('은');
    expect(topicParticle('제목')).toBe('은');
    expect(topicParticle('메시지')).toBe('는');
  });

  it('한글이 아니면 받침 없음으로 본다 — "API를" 이 "API을" 보다 자연스럽다', () => {
    expect(objectParticle('API')).toBe('를');
    expect(objectParticle('SMS')).toBe('를');
    expect(topicParticle('API')).toBe('는');
  });

  it('빈 문자열에도 죽지 않는다', () => {
    expect(objectParticle('')).toBe('를');
    expect(topicParticle('')).toBe('는');
    expect(directionParticle('')).toBe('로');
  });

  it('방향격: ㄹ 받침은 받침 없음처럼 "로" 를 쓴다 (서울으로 가 아니라 서울로)', () => {
    expect(directionParticle('서울')).toBe('로'); // ㄹ 받침 — 예외
    expect(directionParticle('종결')).toBe('로'); // ㄹ 받침 — 예외
    expect(directionParticle('답변완료')).toBe('로'); // 받침 없음
    expect(directionParticle('접수')).toBe('로'); // 받침 없음
    expect(directionParticle('보류중')).toBe('으로'); // ㅇ 받침
    expect(directionParticle('반려됨')).toBe('으로'); // ㅁ 받침
  });
});
