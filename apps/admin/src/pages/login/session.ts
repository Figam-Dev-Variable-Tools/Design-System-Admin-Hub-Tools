// 세션 · '이메일 저장' 브라우저 저장소 접근
//
// SCR-001 §3 등록-정상: '이메일 저장' 체크 시 이메일 값만 보관한다 — 비밀번호는 어떤 경우에도 저장하지 않는다 (§5.3-2).
// SCR-001 §5.1: 이미 인증된 사용자가 /login에 진입하면 폼을 노출하지 않고 SCR-002로 즉시 리다이렉트한다.
//
// 세션 저장소는 전역 인증 컨텍스트(shared/)가 도입되면 그쪽으로 이관한다.
// 현재는 로그인 화면만 세션을 읽고/쓰므로 이 폴더 안에 둔다.
import type { AuthSession, UserRole } from './api';

const SESSION_KEY = 'tds.admin.session';
const REMEMBERED_EMAIL_KEY = 'tds.admin.remembered-email';

const USER_ROLES: readonly UserRole[] = ['system_admin', 'operator', 'viewer'];

/** localStorage 접근은 사생활 보호 모드/차단 설정에서 throw할 수 있다 — 실패 시 기능만 비활성화한다 */
function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * 탭이 닫히면 함께 사라지는 저장소 — **'로그인 유지' 를 끈 세션**이 여기 산다.
 *
 * [왜 두 저장소인가] 체크박스가 아무 데도 쓰이지 않으면 그것은 켜고 끌 수 있는 장식이다.
 * 유지/비유지의 차이는 '브라우저를 닫았다 열었을 때 아직 로그인되어 있는가' 하나뿐이고,
 * 그 차이를 만드는 표준 장치가 localStorage(영속) ↔ sessionStorage(탭 수명)다.
 * 키는 같은 이름을 쓴다 — 같은 것을 담는 두 서랍이지 다른 물건이 아니다.
 */
function safeSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function readFrom(storage: Storage | null): AuthSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['userId'] === 'string' &&
    typeof candidate['email'] === 'string' &&
    typeof candidate['issuedAt'] === 'number' &&
    typeof candidate['role'] === 'string' &&
    USER_ROLES.includes(candidate['role'] as UserRole)
  );
}

/**
 * 현재 세션 — 없거나 형식이 깨졌으면 null.
 *
 * **탭 저장소를 먼저 본다.** '로그인 유지' 를 끄고 들어온 세션이 그쪽에 있고, 그것이 더 최근이다
 * (같은 브라우저에 예전 영속 세션이 남아 있어도 방금 한 로그인이 이긴다).
 */
export function readSession(): AuthSession | null {
  return readFrom(safeSessionStorage()) ?? readFrom(safeStorage());
}

/**
 * 세션을 저장한다.
 *
 * @param keepSignedIn 로그인 유지 — true 면 브라우저를 닫아도 남고(localStorage), false 면 탭을
 *   닫는 순간 사라진다(sessionStorage). 기본값은 **유지하지 않음**이다: 이 값을 넘기지 않는
 *   호출자는 '유지할지 정한 적이 없는' 경로라, 공용 PC 에 세션을 남기지 않는 쪽으로 떨어뜨린다.
 *
 * 반대편 서랍은 **반드시 비운다.** 남겨 두면 유지를 끈 로그인 뒤에도 예전 영속 세션이 그대로
 * 살아 있어, 브라우저를 닫았다 열면 '로그아웃했어야 할' 계정으로 다시 들어간다.
 */
export function writeSession(session: AuthSession, keepSignedIn = false): void {
  const target = keepSignedIn ? safeStorage() : safeSessionStorage();
  const other = keepSignedIn ? safeSessionStorage() : safeStorage();

  try {
    other?.removeItem(SESSION_KEY);
  } catch {
    // 정리 실패는 무시 — 아래 저장이 성공하면 readSession 이 어느 쪽을 먼저 보는지가 결과를 정한다.
  }

  if (!target) return;
  try {
    target.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 저장 실패는 인증 결과를 무효화하지 않는다 — 세션 유지만 포기한다.
  }
}

/**
 * 세션을 버린다 — 중간 만료(401) 경로의 유일한 정리 지점 (EXC-02).
 *
 * 401 을 받고도 저장된 세션이 남아 있으면, /login 으로 보낸 직후 RequireAuth 가 그 낡은 세션을
 * '유효' 로 읽어 화면으로 되돌린다 — 무한 왕복이 된다. 그래서 리다이렉트 **전에** 지운다.
 */
export function clearSession(): void {
  // 두 서랍을 모두 비운다 — 한쪽만 지우면 readSession 이 나머지 한쪽을 찾아내 왕복이 되살아난다.
  for (const storage of [safeSessionStorage(), safeStorage()]) {
    if (!storage) continue;
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      // 삭제 실패는 무시 — 저장소가 막힌 브라우저에선 애초에 세션이 영속되지 않았다.
    }
  }
}

/** 직전 로그인에서 저장된 이메일 (§5.2 체크박스 기본값 판정에 사용) */
export function readRememberedEmail(): string | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(REMEMBERED_EMAIL_KEY);
    return raw === null || raw === '' ? null : raw;
  } catch {
    return null;
  }
}

/** 이메일만 보관한다 — 비밀번호 저장 금지 (§5.3-2) */
export function writeRememberedEmail(email: string): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(REMEMBERED_EMAIL_KEY, email);
  } catch {
    // 저장 실패는 무시 — 편의 기능일 뿐이다.
  }
}

/** 체크 해제 상태로 인증 성공 시 기존 저장값 삭제 (§5.3-2) */
export function clearRememberedEmail(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}
