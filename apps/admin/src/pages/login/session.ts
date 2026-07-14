// 세션 · '이메일 저장' 브라우저 저장소 접근 (A40 소유 — apps/admin/src/pages/login/**)
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

/** 현재 세션 — 없거나 형식이 깨졌으면 null */
export function readSession(): AuthSession | null {
  const storage = safeStorage();
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

export function writeSession(session: AuthSession): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 저장 실패는 인증 결과를 무효화하지 않는다 — 세션 유지만 포기한다.
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
