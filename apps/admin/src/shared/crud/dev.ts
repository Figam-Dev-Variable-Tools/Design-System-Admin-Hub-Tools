// 개발용 실패 재현 스위치 + 지연 상수 (앱 공용 선언적 CRUD 프레임워크)
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
export const STATUS_MESSAGE: Readonly<Record<HttpStatus, string>> = {
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

/**
 * `<op>:<code>` 목록에서 이 op 에 걸린 status 를 찾는다.
 *
 * [왜 export 인가] 두 소비자가 있고 **필요한 형태가 다르다**:
 *   · failIfRequested (아래)        — status 를 **throw** 한다. 어댑터가 직접 던지는 옛 경로.
 *   · shared/api 의 픽스처 트랜스포트 — status 를 **응답으로 돌려준다**. 서버가 하는 일이 그것이고,
 *     그래야 401→HttpError 변환을 response interceptor 가 **실제로** 수행한다. 트랜스포트가
 *     HttpError 를 던져 놓고 인터셉터가 그것을 되받는 구조는 변환하는 시늉일 뿐이다.
 * 판정 로직은 여기 한 벌이다 — 두 소비자가 같은 스위치를 본다.
 */
export function requestedStatus(scope: string, op: string): HttpStatus | null {
  const raw = new URLSearchParams(window.location.search).get(STATUS_PARAM);
  if (raw === null) return null;

  for (const entry of raw.split(',')) {
    /*
     * **마지막 ':' 에서만 가른다.** 스코프를 붙인 형태가 `orders:save:409` 라 조각이 셋인데,
     * split(':') 을 두 변수에 담으면 code 가 'save' 가 되어 parseInt 가 NaN 이 된다 —
     * 그래서 스코프 지정이 통째로 죽어 있었고, `?status=save:409` 가 주문·배송처럼
     * 같은 op 를 가진 **모든 어댑터에 한꺼번에** 걸렸다. 코드는 언제나 맨 뒤 한 조각이다.
     */
    const trimmed = entry.trim();
    const at = trimmed.lastIndexOf(':');
    if (at <= 0) continue;
    const target = trimmed.slice(0, at);
    const code = trimmed.slice(at + 1);
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
  if (isFailRequested(scope, op)) {
    throw new Error(GENERIC_FAILURE_MESSAGE);
  }
}

/**
 * status 없는 generic 실패 문구.
 *
 * **HttpError 가 아니다** — 이 값은 `new Error()` 로만 나간다. status 를 붙이면 EXC-20 의 참조
 * 코드(`referenceOf`)가 화면에 새로 나타난다. `?fail=` 은 기존 e2e 전량이 의존하는 계약이라
 * 표시가 달라지면 안 된다. status 가 필요한 실패는 `?status=` 쪽이다.
 */
export const GENERIC_FAILURE_MESSAGE = '요청을 처리하지 못했습니다.';

/**
 * `?fail=` 로 이 op 이 지목됐는가.
 *
 * requestedStatus 와 같은 이유로 export 한다 — 픽스처 트랜스포트는 이것을 **응답이 아니라
 * reject** 로 표현한다. status 없는 실패는 HTTP 응답이 아니라 **전송 계층 장애**(네트워크 단절)에
 * 해당하고, 실제 axios 도 그 경우 응답 없이 reject 한다. 그래서 인터셉터의 status 매핑을 타지 않고
 * generic Error 그대로 화면에 도달한다 — 지금 동작과 정확히 같다.
 */
export function isFailRequested(scope: string, op: string): boolean {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return false;
  const requested = flags.split(',').map((flag) => flag.trim());
  return (
    requested.includes('all') || requested.includes(op) || requested.includes(`${scope}:${op}`)
  );
}
