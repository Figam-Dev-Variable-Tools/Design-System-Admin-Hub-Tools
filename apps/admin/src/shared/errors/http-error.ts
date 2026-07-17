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
// 실제 HTTP 는 이 앱 어디에도 없다. 픽스처가 이 오류를 만들어 401/403/409 경로를 재현한다.
//
// [Axios 도입 후 — 변환 지점이 생겼다]
// `?status=save:409` 스위치가 만드는 실패는 이제 shared/api/client.ts 의 픽스처 트랜스포트가
// **응답 status 로** 돌려주고, 그것을 이 타입으로 바꾸는 것은 **응답 인터셉터 한 곳뿐**이다
// (`error.response.status` → HttpError). 백엔드가 붙어도 바뀌는 것은 status 의 출처뿐이고
// 변환 지점은 그대로다. 화면 코드는 손대지 않는다.
//
// 다만 **모든** HttpError 가 그 인터셉터에서 나지는 않는다. 픽스처가 도메인 판단으로 직접 던지는
// 것들(fetchOne 의 404 · update 의 409 — crud.ts)은 여전히 생성 지점이 픽스처다. 그것들은
// 백엔드가 붙는 날 실제 응답 status 가 되고, 그때 인터셉터로 자연히 흡수된다.

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
 * 이 세션의 무작위 표식 — 모듈이 올라올 때 **한 번만** 뽑는다.
 *
 * 36^6 ≈ 21.8억. 다른 탭·다른 운영자의 코드와 겹치지 않게 하는 것이 이 조각의 일이다.
 */
const SESSION_MARK = Math.floor(Math.random() * 2_176_782_336)
  .toString(36)
  .toUpperCase()
  .padStart(6, '0');

/** 이 세션에서 몇 번째로 발급된 코드인가 — 같은 세션 안의 충돌을 **확률이 아니라 구조로** 막는다 */
let referenceSeq = 0;

/**
 * 오류 참조 코드 — `TDS-<base36 시각>-<세션표식><일련번호>`.
 *
 * 시각을 품어 로그 라인과 대조할 수 있고, 짧아서 운영자가 채팅에 그대로 옮길 수 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 순수 난수가 아닌가 — 그리고 왜 순수 카운터도 아닌가]
 *
 * 예전에는 `Math.random() * 46_656` (36^3) 한 번이었다. 같은 밀리초 안에서 코드 50개를 뽑으면
 * 생일 역설로 **2.6%** 확률로 둘이 겹친다(실측 2.54% — 40번에 한 번). 코드가 겹치는 순간
 * 이 값의 존재 이유(로그 대조)가 사라지므로, 그것을 잡는 테스트가 40번에 한 번 붉어졌다.
 * 그 불안정을 재시도로 덮는 것은 결함을 숨기는 것이지 고치는 것이 아니다.
 *
 * 그렇다고 세션 카운터만 쓰면 더 나빠진다: 카운터는 새로고침마다 0으로 돌아가므로, 다른 탭의
 * 두 운영자가 같은 밀리초에 실패하면 **둘 다** `TDS-<시각>-001` 을 받는다 — 확률적 충돌이
 * 확정적 충돌이 된다. 이 코드는 티켓에 붙는 값이고 세션 밖에서 대조된다.
 *
 * 그래서 둘을 겹친다:
 *   · 세션표식(난수 36^6) — **세션 사이**의 충돌을 무시할 수준으로 낮춘다
 *   · 일련번호(카운터)    — **한 세션 안**에서는 겹칠 수 없게 한다(구조적 보장)
 * 한 세션 안의 코드는 결코 같지 않으므로 위 테스트는 이제 확률에 기대지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function createErrorReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const seq = referenceSeq.toString(36).toUpperCase();
  referenceSeq += 1;
  return `TDS-${stamp}-${SESSION_MARK}${seq}`;
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
