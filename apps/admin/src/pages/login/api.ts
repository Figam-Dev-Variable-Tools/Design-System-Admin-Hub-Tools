// 로그인 인증 API — 로컬 mock
//
// 백엔드 부재 상태에서 SCR-001 §3(등록: 정상/에러/로딩) · §5.3(실패 카운트·잠금·타임아웃)을
// 재현 가능한 형태로 흉내 낸다. 실제 API가 준비되면 이 모듈만 교체하면 된다(호출부 시그니처 유지).
//
// [재현 시나리오 — 수동 검증용 계정]
//   admin@tds.local    / password123 → 인증 성공(시스템 관리자)
//   operator@tds.local / password123 → 인증 성공(운영자)
//   inactive@tds.local / (임의)      → 계정 비활성 (§3 에러 (c))
//   locked@tds.local   / (임의)      → 계정 잠금   (§3 에러 (b))
//   error@tds.local    / (임의)      → 서버 오류   (§3 에러 (d))
//   timeout@tds.local  / (임의)      → 무응답 → 호출부 10초 타임아웃 → §3 에러 (d)
//   그 외 이메일/오답 비밀번호       → 자격 증명 불일치 (§3 에러 (a)), 연속 5회 시 30분 잠금

/** 연속 실패 허용 횟수 — 도달 시 잠금 (SCR-001 §5.3-1) */
const MAX_LOGIN_ATTEMPTS = 5;

/** 계정 잠금 지속 시간 30분 (SCR-001 §5.3-1) */
const LOCK_DURATION_MS = 30 * 60 * 1000;

/** 제출 타임아웃 10초 (SCR-001 §5.3-6) — 호출부(LoginPage)가 AbortController로 강제한다 */
export const LOGIN_TIMEOUT_MS = 10 * 1000;

export type UserRole = 'system_admin' | 'operator' | 'viewer';

/** 인증 성공 시 발급되는 세션 (mock — 실제로는 서버 발급 토큰) */
export interface AuthSession {
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly issuedAt: number;
}

interface LoginInput {
  readonly email: string;
  readonly password: string;
}

/** 인증 실패 종류 — SCR-001 §3 등록-에러 (a)~(d)에 1:1 대응 */
export type LoginResult =
  | { readonly ok: true; readonly session: AuthSession }
  | {
      readonly ok: false;
      readonly kind: 'invalid_credentials';
      readonly failedCount: number;
      readonly maxAttempts: number;
    }
  | { readonly ok: false; readonly kind: 'account_locked' }
  | { readonly ok: false; readonly kind: 'account_inactive' }
  | { readonly ok: false; readonly kind: 'server_error' };

/** 요청 중단(타임아웃 포함) — 호출부는 이 에러를 네트워크 오류(§3 에러 (d))로 처리한다 */
class LoginAbortError extends Error {
  constructor() {
    super('로그인 요청이 중단되었어요.');
    this.name = 'LoginAbortError';
  }
}

interface MockAccount {
  readonly userId: string;
  readonly password: string;
  readonly role: UserRole;
  readonly active: boolean;
}

const MOCK_ACCOUNTS: ReadonlyMap<string, MockAccount> = new Map([
  [
    'admin@tds.local',
    { userId: 'u-001', password: 'password123', role: 'system_admin', active: true },
  ],
  [
    'operator@tds.local',
    { userId: 'u-002', password: 'password123', role: 'operator', active: true },
  ],
  ['viewer@tds.local', { userId: 'u-003', password: 'password123', role: 'viewer', active: true }],
  [
    'inactive@tds.local',
    { userId: 'u-004', password: 'password123', role: 'viewer', active: false },
  ],
] satisfies readonly (readonly [string, MockAccount])[]);

/** 항상 서버 오류를 유도하는 이메일 */
const SERVER_ERROR_EMAIL = 'error@tds.local';
/** 응답하지 않아 호출부 타임아웃을 유도하는 이메일 */
const TIMEOUT_EMAIL = 'timeout@tds.local';
/** 항상 잠금 상태인 이메일 */
const ALWAYS_LOCKED_EMAIL = 'locked@tds.local';

/** 통신 지연 흉내 (§3 로딩 상태 관찰용) */
const NETWORK_LATENCY_MS = 700;
/** 타임아웃 유도용 지연 — LOGIN_TIMEOUT_MS보다 길다 */
const NO_RESPONSE_LATENCY_MS = LOGIN_TIMEOUT_MS * 2;

interface AttemptState {
  failedCount: number;
  lockedUntil: number;
}

/** 계정별 실패 카운트/잠금 — mock 서버 상태(새로고침 시 초기화된다) */
const attemptStore = new Map<string, AttemptState>();

function readAttemptState(email: string): AttemptState {
  const existing = attemptStore.get(email);
  if (existing) return existing;
  const created: AttemptState = { failedCount: 0, lockedUntil: 0 };
  attemptStore.set(email, created);
  return created;
}

/** 지연 대기 — signal 중단 시 LoginAbortError로 reject한다 */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new LoginAbortError());
      return;
    }
    const timerId = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      globalThis.clearTimeout(timerId);
      reject(new LoginAbortError());
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 인증 요청 (mock).
 * @throws {LoginAbortError} signal 중단(호출부 10초 타임아웃 포함) 시.
 */
export async function login(input: LoginInput, signal: AbortSignal): Promise<LoginResult> {
  const email = normalizeEmail(input.email);

  if (email === TIMEOUT_EMAIL) {
    await delay(NO_RESPONSE_LATENCY_MS, signal);
    return { ok: false, kind: 'server_error' };
  }

  await delay(NETWORK_LATENCY_MS, signal);

  if (email === SERVER_ERROR_EMAIL) {
    return { ok: false, kind: 'server_error' };
  }

  const attempt = readAttemptState(email);
  const now = Date.now();

  // 잠금 판정(서버 소관 — §5.3-1). 잠금 중 제출은 §3 에러 (b)로 응답한다.
  if (email === ALWAYS_LOCKED_EMAIL || attempt.lockedUntil > now) {
    return { ok: false, kind: 'account_locked' };
  }
  if (attempt.lockedUntil !== 0 && attempt.lockedUntil <= now) {
    // 잠금 만료 → 카운트 리셋
    attempt.lockedUntil = 0;
    attempt.failedCount = 0;
  }

  const account = MOCK_ACCOUNTS.get(email);

  if (account && !account.active) {
    return { ok: false, kind: 'account_inactive' };
  }

  if (account && account.password === input.password) {
    // 인증 성공 → 실패 카운트 0으로 리셋 (§5.3-1)
    attempt.failedCount = 0;
    attempt.lockedUntil = 0;
    return {
      ok: true,
      session: { userId: account.userId, email, role: account.role, issuedAt: now },
    };
  }

  // 자격 증명 불일치 — 존재하지 않는 계정도 동일하게 취급(계정 존재 여부 노출 금지)
  attempt.failedCount += 1;
  if (attempt.failedCount >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOCK_DURATION_MS;
    return { ok: false, kind: 'account_locked' };
  }

  return {
    ok: false,
    kind: 'invalid_credentials',
    failedCount: attempt.failedCount,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
  };
}
