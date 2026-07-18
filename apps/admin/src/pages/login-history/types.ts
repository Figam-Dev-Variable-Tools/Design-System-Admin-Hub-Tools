// 로그인 이력 화면 **전용** 타입
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 화면의 성격 — 읽기 전용 감사 로그. 여기서 나오는 모든 결정의 근거다]
//
// **삭제 없음 · 수정 없음 · 행 ⋯ 메뉴 없음 · 체크박스 없음.**
//
//   · 감사 기록은 **불변**이어야 한다. 지울 수 있는 감사 로그는 감사 로그가 아니다 —
//     침입자가 가장 먼저 지우는 것이 자기 흔적이다. 그래서 이 파일에는 **쓰기 payload 타입이
//     하나도 없다.** 회원 관리의 `CreateGroupInput`·`PointAdjustInput` 에 해당하는 것이
//     여기에는 **존재하지 않으며, 없다는 것이 설계다.**
//   · 일괄 액션이 없으므로 **선택(체크박스)도 없다.** 회원 관리에서 '체크박스가 아무 일괄
//     액션과도 연결되지 않았다'는 것이 이미 결함으로 지적됐다(FS-003 검수). 반복하지 않는다.
//
// 이 화면이 하는 일은 **조회 · 필터 · 검색 · 내보내기** 넷뿐이다.
// ─────────────────────────────────────────────────────────────────────────────

/* ── 로그인 시도 한 건 ────────────────────────────────────────────────────── */

export type LoginOutcome = 'success' | 'failure';

/** 시도한 계정의 종류 — 행 클릭 시 회원 상세로 갈지 운영자 상세로 갈지를 가른다 */
export type AccountKind = 'member' | 'admin';

/**
 * 실패 사유 — **BE-001 이 정의한 것만** 쓴다. 화면이 사유를 지어내지 않는다.
 *
 * `unknown_account`(미등록 계정)가 목록에 있는 이유는 BE-001 §4 다:
 * 423 `ACCOUNT_LOCKED` 의 발생 조건이 "연속 실패 5회 도달 또는 잠금 유지 중.
 * **미등록 이메일도 동일**" 이다. 미등록 이메일을 다르게 취급하면 그 차이 자체가
 * 계정 존재 여부를 알려주는 **열거 오라클**이 된다(§3.2 · §5 '403 vs 404' 열).
 * 즉 **미등록 계정의 시도도 서버에서 세어지고 잠기며, 감사 이력에 남는다.**
 *
 * [보이는 문구 ≠ 기록되는 사유] 로그인 화면은 미등록 계정에도
 * '이메일 또는 비밀번호가 일치하지 않습니다'를 보여준다(계정 비노출, FS-001-EL-019).
 * 그러나 **관리자용 감사 이력**은 진짜 사유를 기록한다 — 그것을 보라고 이 화면이 있다.
 */
export type LoginFailureReason =
  'invalid_password' | 'account_locked' | 'unknown_account' | 'session_expired';

export interface LoginHistoryEntry {
  readonly id: string;
  /** 시도 시각 — ISO date-time */
  readonly occurredAtIso: string;
  /** 시도된 계정(이메일) */
  readonly account: string;
  /** 이름 — 개인정보라 마스킹된 채로 내려온다 ('테스***') */
  readonly name: string;
  readonly accountKind: AccountKind;
  readonly outcome: LoginOutcome;
  /** 성공이면 null */
  readonly failureReason: LoginFailureReason | null;
  /**
   * 이 시도 시점 기준 **그 계정의 연속 실패 횟수** (성공이면 0).
   *
   * **서버가 계산해 내려준다.** 화면이 목록을 훑어 세지 않는다 —
   * 페이지네이션된 목록에서 세면 페이지 경계에서 값이 달라진다(1페이지의 3연속이
   * 2페이지에서는 1연속이 된다). 계정 탈취 시도의 신호를 페이지 나누기가 지워서는 안 된다.
   */
  readonly consecutiveFailures: number;
  readonly ip: string;
  /** 기기 — 브라우저 ('Chrome 126') */
  readonly browser: string;
  /** 기기 — OS ('Windows 11') */
  readonly os: string;
  /**
   * 이동할 계정 레코드의 id. **미등록 계정은 null** — 가리킬 계정이 존재하지 않는다.
   * (`detailPathOf` 가 null 을 돌려주고, 그 행은 클릭해도 이동하지 않는다.)
   */
  readonly subjectId: string | null;
}

/* ── 라벨 ────────────────────────────────────────────────────────────────── */

export const OUTCOME_LABEL: Record<LoginOutcome, string> = {
  success: '성공',
  failure: '실패',
};

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  member: '회원',
  admin: '운영자',
};

export const FAILURE_REASON_LABEL: Record<LoginFailureReason, string> = {
  invalid_password: '비밀번호 불일치',
  account_locked: '계정 잠김',
  unknown_account: '미등록 계정',
  session_expired: '세션 만료',
};

/* ── 좌측 필터 ───────────────────────────────────────────────────────────── */

export type OutcomeFilter = LoginOutcome | 'all';
export type AccountKindFilter = AccountKind | 'all';

/** 기간 프리셋. 'custom' 만 사용자 입력(직접 지정)을 받는다 */
export type PeriodId = 'today' | 'last-7d' | 'last-30d' | 'custom';

interface FilterDef<T> {
  readonly id: T;
  readonly label: string;
}

export const OUTCOME_FILTERS: readonly FilterDef<OutcomeFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'success', label: '성공' },
  { id: 'failure', label: '실패' },
];

export const ACCOUNT_KIND_FILTERS: readonly FilterDef<AccountKindFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'member', label: '회원' },
  { id: 'admin', label: '운영자' },
];

export const PERIOD_FILTERS: readonly FilterDef<PeriodId>[] = [
  { id: 'today', label: '오늘' },
  { id: 'last-7d', label: '최근 7일' },
  { id: 'last-30d', label: '최근 30일' },
  { id: 'custom', label: '직접 지정' },
];

/**
 * 프리셋이 덮는 날짜 수 — **오늘을 포함한다.**
 * '최근 7일' = 오늘 + 앞선 6일. (6일이 아니라 7일이라고 읽히도록 여기서 한 번만 정의한다.)
 */
export const PERIOD_DAYS: Record<Exclude<PeriodId, 'custom'>, number> = {
  today: 1,
  'last-7d': 7,
  'last-30d': 30,
};

/** 직접 지정으로 조회할 수 있는 최대 기간 — 그 이상은 내보내기로 받는다 */
export const MAX_RANGE_DAYS = 90;

/** 조회 구간 — 양 끝 포함. 'YYYY-MM-DD' (로컬) */
export interface DateRange {
  readonly from: string;
  readonly to: string;
}

/* ── 조회 결과 ───────────────────────────────────────────────────────────── */

/**
 * 축별 배지 숫자 — **필터 유니온을 그대로 키로 삼는다.**
 * 필터 항목이 늘면 건수도 함께 늘어야 하는데, 손으로 적은 필드 목록은 그 사실을 강제하지 못한다.
 * (Record 로 두면 공유 FilterPanel 의 `counts`(id → 건수)에도 그대로 들어간다.)
 */
export type OutcomeCounts = Readonly<Record<OutcomeFilter, number>>;

export type AccountKindCounts = Readonly<Record<AccountKindFilter, number>>;

export interface LoginHistoryResult {
  readonly entries: readonly LoginHistoryEntry[];
  /**
   * 좌측 필터의 배지 숫자.
   *
   * **기간 안에서만** 센다 — 결과/유형/검색어와는 무관하다.
   * 기간은 이 화면의 *스코프*이고(감사 로그는 언제나 '언제부터 언제까지'를 먼저 정한다),
   * 결과·유형은 그 스코프 안을 나누는 축이다. 그래서 '이 기간에 성공 N · 실패 M' 이 읽힌다.
   */
  readonly outcomeCounts: OutcomeCounts;
  readonly kindCounts: AccountKindCounts;
  /** 필터·검색까지 전부 적용한 뒤의 건수 (페이지네이션용) */
  readonly total: number;
}

export const PAGE_SIZE = 10;

/* ── 표시 규칙 ───────────────────────────────────────────────────────────── */

/**
 * 연속 실패 배지를 다는 최소 횟수.
 * 1회 실패는 오타다. **2회부터가 신호**이고, 이 배지가 이 화면이 존재하는 이유다.
 */
export const FAILURE_STREAK_BADGE_MIN = 2;

/** '실패 3회 연속' — 배지를 달 이유가 없으면 null (성공 행 · 첫 실패) */
export function consecutiveFailureLabel(entry: LoginHistoryEntry): string | null {
  if (entry.outcome !== 'failure') return null;
  if (entry.consecutiveFailures < FAILURE_STREAK_BADGE_MIN) return null;
  return `실패 ${String(entry.consecutiveFailures)}회 연속`;
}

/**
 * 행을 누르면 갈 곳 — **해당 계정의 상세**.
 * 회원이면 회원 상세, 운영자면 운영자 상세. 두 화면 모두 이미 존재한다(App.tsx).
 *
 * 미등록 계정은 **null** 이다. 존재하지 않는 계정의 상세는 없다 —
 * 여기서 억지로 경로를 만들면 죽은 링크가 되고, 없는 계정을 있는 것처럼 보이게 한다.
 */
export function detailPathOf(entry: LoginHistoryEntry): string | null {
  if (entry.subjectId === null) return null;
  return entry.accountKind === 'admin'
    ? `/users/admins/${entry.subjectId}`
    : `/users/members/${entry.subjectId}`;
}
