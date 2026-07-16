// HTTP 오류 타입 (A41 소유 — apps/admin/src/shared/errors/**)
//
// [왜 이 파일이 있나]
// 지금까지 이 앱의 모든 실패는 `new Error('요청을 처리하지 못했습니다.')` 하나로 붕괴했다.
// 그래서 화면은 **검증 거절(422)·권한 상실(403)·낙관적 동시성 충돌(409)·서버 장애(500)** 를
// 구분할 수 없었고, 전부 같은 '잠시 후 다시 시도해 주세요' 배너로 그렸다 — 잘못된 복구 수단을
// 제시하는 셈이다(409 는 재시도하면 또 409 다).
//
// 여기서는 **status 를 지닌 단일 오류 타입**만 정의한다. 화면이 status 로 분기할 수 있게 되는 것이
// EXC-04(409 충돌)·EXC-02(401 재인증)·EXC-03(403 강등)의 전제다.
//
// [백엔드 없음 — 이것은 seam 이다]
// 실제 HTTP 는 이 앱 어디에도 없다. 픽스처 어댑터가 이 오류를 **직접 throw** 해서 401/403/409 경로를
// 재현한다. 백엔드가 붙으면 응답 status 를 그대로 이 타입에 담는 곳이 딱 한 군데 생긴다.
// TODO(lib): Axios 도입 시 response interceptor 가 이 변환의 유일한 지점이 된다
//   (`error.response.status` → HttpError). 화면 코드는 그대로 둔다.

/** 화면이 분기하는 status — 이 앱이 실제로 다르게 그리는 것만 둔다 */
export const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  preconditionFailed: 412,
  unprocessable: 422,
  tooManyRequests: 429,
  serverError: 500,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/** 422 의 필드 단위 거절 — RHF setError 로 그 입력에 그대로 꽂는다 (EXC-07) */
export interface FieldViolation {
  readonly field: string;
  readonly message: string;
}

/**
 * status 를 지닌 오류.
 *
 * `reference` 는 운영자가 내부 티켓에 붙일 수 있는 짧은 상관관계 코드다 — 5xx/예상외 실패에서
 * 사용자에게 보이는 유일한 기술 정보이며, raw 서버 body/stack 은 절대 노출하지 않는다(EXC-20).
 */
export class HttpError extends Error {
  readonly status: HttpStatus;
  readonly reference: string;
  readonly violations: readonly FieldViolation[];

  constructor(
    status: HttpStatus,
    message: string,
    options: { readonly violations?: readonly FieldViolation[]; readonly reference?: string } = {},
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.violations = options.violations ?? [];
    this.reference = options.reference ?? createErrorReference();
  }
}

/**
 * 오류 참조 코드 — `TDS-<base36 시각>-<난수>`.
 *
 * 시각을 품어 로그 라인과 대조할 수 있고, 짧아서 운영자가 채팅에 그대로 옮길 수 있다.
 */
export function createErrorReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.floor(Math.random() * 46_656)
    .toString(36)
    .toUpperCase()
    .padStart(3, '0');
  return `TDS-${stamp}-${noise}`;
}

/* ── 타입 가드 (unknown 만 받는다 — catch 절의 값은 any 가 아니다) ───────────── */

export function isHttpError(cause: unknown): cause is HttpError {
  return cause instanceof HttpError;
}

function hasStatus(cause: unknown, status: HttpStatus): boolean {
  return isHttpError(cause) && cause.status === status;
}

/** 세션 만료·미인증 — 재인증 경로로 보낸다 (EXC-02) */
export function isUnauthorized(cause: unknown): boolean {
  return hasStatus(cause, HTTP_STATUS.unauthorized);
}

/** 권한 없음 — 재시도 수단을 주지 않는다. 재시도해도 또 403 이다 (EXC-03) */
export function isForbidden(cause: unknown): boolean {
  return hasStatus(cause, HTTP_STATUS.forbidden);
}

export function isNotFound(cause: unknown): boolean {
  return hasStatus(cause, HTTP_STATUS.notFound);
}

/**
 * 낙관적 동시성 충돌 — 409(내용 충돌) 와 412(If-Match 불일치)는 **같은 UX** 로 수렴한다:
 * 덮어쓰지 않고 사용자 입력을 보존한 채 충돌 다이얼로그를 연다 (EXC-04).
 */
export function isConflict(cause: unknown): boolean {
  return hasStatus(cause, HTTP_STATUS.conflict) || hasStatus(cause, HTTP_STATUS.preconditionFailed);
}

/** 필드 단위 검증 거절 — 폼이 그 입력에 인라인 에러를 꽂는다 (EXC-07) */
export function isUnprocessable(cause: unknown): boolean {
  return hasStatus(cause, HTTP_STATUS.unprocessable);
}

/** 사용자에게 보여도 되는 참조 코드 — HttpError 가 아니면 없다(무엇을 지어내지 않는다) */
export function referenceOf(cause: unknown): string | null {
  return isHttpError(cause) ? cause.reference : null;
}
