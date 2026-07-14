// 로그인 이력 더미 데이터 (A40 소유 — apps/admin/src/pages/login-history/**)
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 비즈니스 로직·저장소가 아니다. 백엔드가 붙으면 data-source.ts 가 이 파일 대신 실제 HTTP 응답을
// 돌려주게 되고, 이 파일은 삭제된다.
//
// [실명 0건] 계정·이름·IP 는 전부 임의로 만든 더미다.
//   · 이름은 기존 픽스처의 **마스킹 관례**를 따른다 ('테스***' 처럼 첫 글자만 남긴다).
//     감사 화면은 '누가 시도했는가'를 알면 충분하고, 관리자에게 전체 성명을 흘릴 이유가 없다.
//   · 이메일 도메인은 `example.com` (RFC 2606 예약) — 실재하는 조직을 가리키지 않는다.
//   · IP 는 RFC 5737 문서용 대역만 쓴다 (203.0.113.0/24 · 198.51.100.0/24) — 실재 호스트가 아니다.
//
// [미등록 계정이 왜 여기 있는가 — BE-001]
// BE-001 §4 는 423 `ACCOUNT_LOCKED` 의 조건을 "연속 실패 5회 도달 또는 잠금 유지 중.
// **미등록 이메일도 동일**" 로 못박는다. 미등록 이메일을 다르게 다루면 그 차이 자체가 계정 존재
// 여부를 알려주는 **열거 오라클**이 되기 때문이다(§3.2). 그러므로 미등록 계정의 시도도 서버에서
// 세어지고 잠기며 — **감사 이력에 남는다.** 픽스처가 그 사실을 반영한다:
//   `admin@example.com` · `root@example.com` 처럼 존재하지 않는 계정을 두드리는 행이 실제로 있고,
//   5회째부터는 사유가 '계정 잠김'으로 바뀐다(존재하지 않는 계정도 잠긴다).
//
// [subjectId] 회원/운영자 픽스처에 **실재하는 id** 를 가리킨다 — 행을 눌러 상세로 갔을 때
// 죽은 링크가 되지 않게 하기 위해서다. 미등록 계정만 null 이다(가리킬 레코드가 없다).
import { shiftDays, todayOf } from './period';
import type { AccountKind, LoginFailureReason, LoginHistoryEntry, LoginOutcome } from './types';

/** 시도의 주체 — 계정 하나 */
interface Actor {
  /** 회원/운영자 픽스처의 id. **미등록 계정은 null** */
  readonly subjectId: string | null;
  readonly account: string;
  /** 마스킹된 이름. 미등록 계정은 빈 문자열 — 존재하지 않는 사람의 이름을 지어내지 않는다 */
  readonly name: string;
  readonly accountKind: AccountKind;
}

const MEMBER_ACTORS: readonly Actor[] = [
  { subjectId: 'M-00003', account: 'user1003@example.com', name: '김**', accountKind: 'member' },
  { subjectId: 'M-00017', account: 'user1017@example.com', name: '이**', accountKind: 'member' },
  { subjectId: 'M-00042', account: 'user1042@example.com', name: '박**', accountKind: 'member' },
  { subjectId: 'M-00058', account: 'user1058@example.com', name: '최**', accountKind: 'member' },
  { subjectId: 'M-00071', account: 'user1071@example.com', name: '정**', accountKind: 'member' },
  { subjectId: 'M-00099', account: 'user1099@example.com', name: '강**', accountKind: 'member' },
  { subjectId: 'M-00120', account: 'user1120@example.com', name: '조**', accountKind: 'member' },
  { subjectId: 'M-00151', account: 'user1151@example.com', name: '윤**', accountKind: 'member' },
  { subjectId: 'M-00184', account: 'user1184@example.com', name: '테스***', accountKind: 'member' },
  { subjectId: 'M-00220', account: 'user1220@example.com', name: '임**', accountKind: 'member' },
];

const ADMIN_ACTORS: readonly Actor[] = [
  { subjectId: 'A-00001', account: 'ops01@example.com', name: '한**', accountKind: 'admin' },
  { subjectId: 'A-00002', account: 'ops02@example.com', name: '오**', accountKind: 'admin' },
  { subjectId: 'A-00003', account: 'ops03@example.com', name: '서**', accountKind: 'admin' },
  { subjectId: 'A-00004', account: 'ops04@example.com', name: '신**', accountKind: 'admin' },
];

/**
 * 존재하지 않는 계정 — 무차별 대입/열거 시도가 두드리는 흔한 이름들.
 * 계정 유형은 '회원'으로 기록한다: 서버는 시도가 들어온 **로그인 폼**을 알 뿐,
 * 존재하지 않는 계정의 종류는 알 수 없다 (알 수 있다면 그것이 곧 열거 오라클이다).
 */
const UNKNOWN_ACTORS: readonly Actor[] = [
  { subjectId: null, account: 'admin@example.com', name: '', accountKind: 'member' },
  { subjectId: null, account: 'root@example.com', name: '', accountKind: 'member' },
  { subjectId: null, account: 'test@example.com', name: '', accountKind: 'member' },
];

const KNOWN_ACTORS: readonly Actor[] = [...MEMBER_ACTORS, ...ADMIN_ACTORS];

const BROWSERS = ['Chrome 126', 'Safari 17', 'Edge 126', 'Firefox 127', 'Samsung Internet 25'];
const OSES = ['Windows 11', 'macOS 14', 'Android 14', 'iOS 17', 'Windows 10'];

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0');
}

/** 일상 접속 IP — 문서용 대역 203.0.113.0/24 */
function usualIp(seed: number): string {
  return `203.0.113.${String(((seed * 7) % 240) + 10)}`;
}

/** 수상한 IP — 문서용 대역 198.51.100.0/24. 실패 연쇄가 이 대역에서 온다 */
function foreignIp(seed: number): string {
  return `198.51.100.${String(((seed * 13) % 240) + 10)}`;
}

/**
 * 아직 연속 실패 횟수가 붙지 않은 시도 한 건.
 * **연속 실패는 시도 하나만 봐서는 알 수 없다** — 그 계정의 앞선 시도들을 함께 봐야 한다.
 */
export interface RawAttempt {
  readonly actor: Actor;
  readonly occurredAtIso: string;
  readonly outcome: LoginOutcome;
  readonly failureReason: LoginFailureReason | null;
  readonly ip: string;
  readonly browser: string;
  readonly os: string;
}

/** '오늘'을 기준으로 d일 전, hh:mm 의 ISO date-time */
function at(daysAgo: number, hour: number, minute: number, now: Date = new Date()): string {
  return `${shiftDays(todayOf(now), -daysAgo)}T${pad(hour, 2)}:${pad(minute, 2)}:00`;
}

function success(actor: Actor, seed: number, occurredAtIso: string): RawAttempt {
  return {
    actor,
    occurredAtIso,
    outcome: 'success',
    failureReason: null,
    ip: usualIp(seed),
    browser: BROWSERS[seed % BROWSERS.length] ?? 'Chrome 126',
    os: OSES[seed % OSES.length] ?? 'Windows 11',
  };
}

function failure(
  actor: Actor,
  seed: number,
  occurredAtIso: string,
  reason: LoginFailureReason,
  ip: string,
): RawAttempt {
  return {
    actor,
    occurredAtIso,
    outcome: 'failure',
    failureReason: reason,
    ip,
    browser: BROWSERS[seed % BROWSERS.length] ?? 'Chrome 126',
    os: OSES[seed % OSES.length] ?? 'Windows 11',
  };
}

/** 조회 범위 — 오늘부터 45일 전까지 */
const HISTORY_DAYS = 45;

/**
 * 계정 탈취 시도가 시작되는 임계 — BE-001 의 잠금 규칙(연속 5회)과 같은 수다.
 * 5회째부터 서버는 잠그고, 그 이후의 시도는 '계정 잠김'으로 기록된다.
 */
const LOCK_AT = 5;

function routineAttempts(now: Date): readonly RawAttempt[] {
  const out: RawAttempt[] = [];

  for (let day = 0; day < HISTORY_DAYS; day += 1) {
    KNOWN_ACTORS.forEach((actor, index) => {
      // 매일 전원이 접속하지는 않는다 — 인덱스로 결정적으로 흩뿌린다(새로고침해도 흔들리지 않는다)
      if ((day + index) % 4 !== 0) return;
      const seed = day * 17 + index;
      out.push(success(actor, seed, at(day, 8 + ((index * 3) % 11), (seed * 11) % 60, now)));

      // 가끔은 오타를 낸다 — 성공 직전의 **고립된 1회 실패**. 배지가 붙지 않는 경계값이다
      if ((day + index) % 12 !== 0) return;
      out.push(
        failure(
          actor,
          seed,
          at(
            day,
            8 + ((index * 3) % 11),
            ((seed * 11) % 60) - 1 < 0 ? 0 : ((seed * 11) % 60) - 1,
            now,
          ),
          'invalid_password',
          usualIp(seed),
        ),
      );
    });
  }

  return out;
}

/** 세션 만료 — 오래 열어둔 탭이 재인증에 실패한 흔적. 연쇄가 아니라 낱개로 흩어진다 */
function sessionExpiryAttempts(now: Date): readonly RawAttempt[] {
  return KNOWN_ACTORS.filter((_, index) => index % 5 === 2).map((actor, i) => {
    const day = 3 + i * 9;
    const seed = 200 + i;
    return failure(actor, seed, at(day, 18, 40 + i, now), 'session_expired', usualIp(seed));
  });
}

/**
 * 계정 탈취 시도 — **이 화면이 존재하는 이유**.
 * 어제 새벽, 낯선 IP 에서 한 회원 계정에 연속 6회. 5회째부터 서버가 잠근다(BE-001).
 * 연속 실패 배지가 1,2,3,4,5,6 으로 자라는 것이 표에서 그대로 보여야 한다.
 */
function takeoverAttempts(now: Date): readonly RawAttempt[] {
  const target = MEMBER_ACTORS[1];
  if (target === undefined) return [];

  return Array.from({ length: 6 }, (_, i) =>
    failure(
      target,
      41,
      at(1, 3, 12 + i * 2, now),
      i + 1 < LOCK_AT ? 'invalid_password' : 'account_locked',
      foreignIp(9),
    ),
  );
}

/**
 * 미등록 계정 두드리기 — 존재하지 않는 계정도 세어지고 잠긴다(BE-001 §4: "미등록 이메일도 동일").
 * 사용자에게는 '이메일 또는 비밀번호가 일치하지 않습니다'만 보이지만, **감사 이력에는 진짜 사유**가 남는다.
 */
function unknownAccountAttempts(now: Date): readonly RawAttempt[] {
  const out: RawAttempt[] = [];

  UNKNOWN_ACTORS.forEach((actor, index) => {
    const day = index;
    for (let i = 0; i < LOCK_AT + 1; i += 1) {
      out.push(
        failure(
          actor,
          60 + index,
          at(day, 2, 5 + i * 3, now),
          // 5회째부터는 서버가 (존재하지 않는) 계정을 잠근 상태다 — 응답도 사유도 '계정 잠김'이 된다
          i + 1 < LOCK_AT ? 'unknown_account' : 'account_locked',
          foreignIp(index + 1),
        ),
      );
    }
  });

  return out;
}

/**
 * 연속 실패 횟수를 채운다 — **계정별로 시간순으로 걸으며 센다.**
 *
 * 성공이 끼면 0으로 끊긴다. 그래서 '실패 5회 연속'은 *그 계정이 5번 연달아 막혔다*는 뜻이지
 * '총 5번 실패했다'가 아니다. 이 구분이 계정 탈취 신호의 전부다.
 *
 * 실제 서버는 이 값을 이미 갖고 있다(BE-001 의 실패 카운터). 이 함수는 **서버가 하는 일을
 * 픽스처에서 흉내 내는 것**이며, 백엔드가 붙으면 응답의 필드를 그대로 쓰고 여기는 사라진다.
 * **화면은 이 계산을 하지 않는다** — 페이지네이션된 목록에서 세면 페이지 경계가 값을 왜곡한다.
 */
export function withConsecutiveFailures(
  attempts: readonly RawAttempt[],
): readonly LoginHistoryEntry[] {
  const chronological = [...attempts].sort((a, b) =>
    a.occurredAtIso.localeCompare(b.occurredAtIso),
  );

  const streaks = new Map<string, number>();
  const entries = chronological.map((attempt, index) => {
    const previous = streaks.get(attempt.actor.account) ?? 0;
    const streak = attempt.outcome === 'failure' ? previous + 1 : 0;
    streaks.set(attempt.actor.account, streak);

    return {
      id: `LH-${pad(index + 1, 5)}`,
      occurredAtIso: attempt.occurredAtIso,
      account: attempt.actor.account,
      name: attempt.actor.name,
      accountKind: attempt.actor.accountKind,
      outcome: attempt.outcome,
      failureReason: attempt.failureReason,
      consecutiveFailures: streak,
      ip: attempt.ip,
      browser: attempt.browser,
      os: attempt.os,
      subjectId: attempt.actor.subjectId,
    } satisfies LoginHistoryEntry;
  });

  // 표시는 최신순 — 감사 화면에서 먼저 보아야 하는 것은 방금 일어난 일이다
  return entries.sort((a, b) => b.occurredAtIso.localeCompare(a.occurredAtIso));
}

function buildHistory(now: Date = new Date()): readonly LoginHistoryEntry[] {
  return withConsecutiveFailures([
    ...routineAttempts(now),
    ...sessionExpiryAttempts(now),
    ...takeoverAttempts(now),
    ...unknownAccountAttempts(now),
  ]);
}

/**
 * 목록 화면이 소비하는 픽스처.
 * '오늘' 기준으로 만들어진다 — 그래야 '오늘 / 최근 7일' 필터가 빈 화면이 되지 않는다.
 */
export const LOGIN_HISTORY: readonly LoginHistoryEntry[] = buildHistory();
