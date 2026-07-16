// 개발용 실패 재현 스위치 + 지연 상수 (A41 소유 — apps/admin/src/shared/crud/** · 앱 공용 선언적 CRUD 프레임워크)
//
// 콘텐츠 어댑터(faq·notices…)의 failIfRequested 규약을 기업 관리 어댑터들이 공유한다.
// 열 개 어댑터가 같은 8줄을 복사하는 대신 여기 한 벌만 둔다(모두 pages/company 아래라 결합이 아니다).
//
// [백엔드 없음] 실제 네트워크 호출은 이 앱 어디에도 없다 — 여기 있는 것은 지연·취소·실패 재현뿐이다.
// 각 어댑터의 함수 본문에 붙은 // TODO(backend) 주석이 실제 연동 지점이다.
import { HTTP_STATUS, HttpError } from '../errors/http-error';
import type { HttpStatus } from '../errors/http-error';

/** 픽스처 응답 지연 — 로딩 상태를 화면에서 볼 수 있게 한다 */
export const LATENCY_MS = 400;

/**
 * status 재현 스위치 — `?status=<op>:<code>` 로 **특정 op 을 특정 HTTP status 로** 실패시킨다.
 *
 * [왜 `?fail=` 로 부족한가]
 * `?fail=save` 는 언제나 같은 generic Error 를 던진다. 그래서 401(재인증)·403(권한 강등)·
 * 409(동시성 충돌)·422(필드 거절)처럼 **UX 가 완전히 다른 실패들**을 재현할 수단이 없었다 —
 * 스펙이 요구하는 경로(EXC-02/03/04/06)를 화면에서 볼 수도, e2e 로 검증할 수도 없었다는 뜻이다.
 *
 * 예) `?status=save:409` · `?status=list:401` · `?status=delete:403` · `?status=all:500`
 */
const STATUS_PARAM = 'status';

/** 재현 가능한 status — 화면이 실제로 다르게 그리는 것만 연다 */
const REPRODUCIBLE: readonly HttpStatus[] = [
  HTTP_STATUS.badRequest,
  HTTP_STATUS.unauthorized,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.notFound,
  HTTP_STATUS.conflict,
  HTTP_STATUS.preconditionFailed,
  HTTP_STATUS.unprocessable,
  HTTP_STATUS.tooManyRequests,
  HTTP_STATUS.serverError,
];

function isReproducibleStatus(value: number): value is HttpStatus {
  return REPRODUCIBLE.some((status) => status === value);
}

/** 사람이 읽는 문구 — 화면이 status 로 분기하므로 여기서는 최소한만 정한다 */
const STATUS_MESSAGE: Readonly<Record<HttpStatus, string>> = {
  [HTTP_STATUS.badRequest]: '요청이 올바르지 않습니다.',
  [HTTP_STATUS.unauthorized]: '세션이 만료되었습니다.',
  [HTTP_STATUS.forbidden]: '권한이 없습니다.',
  [HTTP_STATUS.notFound]: '항목을 찾을 수 없습니다.',
  [HTTP_STATUS.conflict]: '다른 사용자가 먼저 변경했습니다.',
  [HTTP_STATUS.preconditionFailed]: '다른 사용자가 먼저 변경했습니다.',
  [HTTP_STATUS.unprocessable]: '입력값을 확인해 주세요.',
  [HTTP_STATUS.tooManyRequests]: '요청이 너무 많습니다.',
  [HTTP_STATUS.serverError]: '요청을 처리하지 못했습니다.',
};

/** `<op>:<code>` 목록에서 이 op 에 걸린 status 를 찾는다 */
function requestedStatus(scope: string, op: string): HttpStatus | null {
  const raw = new URLSearchParams(window.location.search).get(STATUS_PARAM);
  if (raw === null) return null;

  for (const entry of raw.split(',')) {
    const [target, code] = entry.trim().split(':');
    if (target === undefined || code === undefined) continue;
    if (target !== 'all' && target !== op && target !== `${scope}:${op}`) continue;

    const parsed = Number.parseInt(code, 10);
    if (isReproducibleStatus(parsed)) return parsed;
  }

  return null;
}

/**
 * 실패 경로 재현 스위치(개발용) — 콘텐츠 어댑터와 같은 규약.
 *   ?fail=list · ?fail=save · ?fail=delete · ?fail=all · ?fail=partners:save (스코프 지정)
 *   ?status=save:409 · ?status=list:401 (status 지정 — 위 STATUS_PARAM 주석 참조)
 *
 * 두 스위치를 함께 두는 이유: `?fail=` 은 기존 e2e 전량이 의존하는 계약이라 의미를 바꾸지 않는다.
 * status 가 필요한 새 경로만 `?status=` 로 표현한다.
 */
export function failIfRequested(scope: string, op: string): void {
  const status = requestedStatus(scope, op);
  if (status !== null) {
    throw new HttpError(status, STATUS_MESSAGE[status]);
  }

  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;
  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op) || requested.includes(`${scope}:${op}`)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}
