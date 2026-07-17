// Axios API 클라이언트 — 인스턴스 + 인터셉터 (A41 소유 — apps/admin/src/shared/api/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [백엔드 절대 금지 — 그런데 왜 HTTP 클라이언트가 있나]
//
// 이 앱의 실제 네트워크 호출은 **0건이고, 이 파일도 0건을 유지한다.** 여기 있는 것은 백엔드가
// 붙는 날 실제 전송이 들어올 **자리**와, 그 자리 위·아래에 이미 필요한 **인터셉터**다.
//
// 스캐폴드를 '언젠가 쓸 코드'로 놔두면 그것은 죽은 코드다(A83 축5, 임계 0건). 그래서 그렇게 두지
// 않았다 — **픽스처가 이 인스턴스를 실제로 통과한다.** axios 의 `adapter` 옵션은 전송을 갈아끼우는
// **공식 확장점**이고(xhr/http/mock), 여기서는 그 자리에 네트워크 대신 픽스처를 꽂는다.
//
//   요청 인터셉터 → [ 픽스처 트랜스포트 ] → 응답 인터셉터
//                     ↑ 백엔드가 붙으면 이 한 줄(adapter)만 지운다. 위아래는 그대로다.
//
// 그래서 인터셉터는 시늉이 아니라 **하중을 받는다**:
//   · Idempotency-Key 헤더 — 요청 인터셉터가 붙이고, **픽스처 원장이 그 헤더를 읽어** 재시도를
//     재생 처리한다. 인터셉터를 지우면 멱등성이 깨지고 테스트가 붉어진다. (EXC-08 · F3b 의
//     `CrudAdapter.create/update` 멱등키 자리가 여기로 도달한다.)
//   · status → HttpError — `?status=save:409` 스위치는 트랜스포트가 **응답으로** 돌려주고,
//     그 응답을 HttpError 로 바꾸는 것은 **응답 인터셉터뿐**이다. 트랜스포트가 HttpError 를 던져
//     놓고 인터셉터가 되받는 구조였다면 그것은 변환하는 시늉이다 — 그렇게 하지 않았다.
//
// [401 은 여기서 통지하지 않는다 — 정본은 queryClient 다]
// 이유는 아래 `handleResponseError` 주석에 있다. 요약: 이 인스턴스를 지나지 않는 데이터 소스가
// 아직 15개 있어서, 여기서 통지하면 **전수를 덮지 못하면서 이중화만 된다.**
// ─────────────────────────────────────────────────────────────────────────────
import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosAdapter, AxiosInstance, AxiosResponse } from 'axios';

import { wait } from '../async';
import {
  GENERIC_FAILURE_MESSAGE,
  isFailRequested,
  LATENCY_MS,
  requestedStatus,
  STATUS_MESSAGE,
} from '../crud/dev';
import { HTTP_STATUS, HttpError } from '../errors/http-error';
import type { HttpStatus } from '../errors/http-error';

/**
 * 이 요청을 로컬에서 해소하는 픽스처.
 *
 * 백엔드가 붙으면 이 필드와 픽스처 트랜스포트가 **함께** 사라지고, 남는 것은 url·method·헤더다.
 */
interface FixtureSpec {
  /** 실패 재현 스코프 ('history'/'esg'/…) — `?fail=`/`?status=` 가 이것으로 op 을 지목한다 */
  readonly scope: string;
  /** 'list' | 'detail' | 'save' | 'delete' */
  readonly op: string;
  readonly signal?: AbortSignal | undefined;
  readonly idempotencyKey?: string | undefined;
  /**
   * 픽스처 본체. **인자는 요청 헤더에서 읽은 멱등키다** — 호출자가 넘긴 값이 아니라
   * 요청 인터셉터가 붙인 헤더를 트랜스포트가 되읽은 값이다. 실제 서버가 하는 일과 같다.
   */
  readonly resolve: (idempotencyKey: string | undefined) => unknown;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    fixture?: FixtureSpec;
  }
}

/* ── 헤더 규약 ───────────────────────────────────────────────────────────── */

/** 제출 시도 단위 멱등키 (BE-004-EP-03) */
const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/**
 * CSRF 이중 제출 쿠키 규약.
 *
 * TODO(backend): 지금 이 쿠키를 **심는 주체가 없다** — 로그인은 세션을 스토리지에 넣고 끝난다.
 * 그래서 아래 인터셉터는 현재 항상 '쿠키 없음' 가지로 빠진다(헤더가 붙지 않는다). 서버가
 * `Set-Cookie: XSRF-TOKEN=...` 을 내려주기 시작하면 **코드 변경 없이** 헤더가 붙기 시작한다.
 * 지금 값을 지어내 붙이면 그것이야말로 가짜다 — 없는 것은 없는 대로 둔다.
 * (동작 자체는 client.test.ts 가 쿠키를 심어 검증한다.)
 */
const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';

/** document.cookie 에서 한 항목을 읽는다 — 없으면 null */
function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const entry of document.cookie.split(';')) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

/* ── 픽스처 트랜스포트 (네트워크 자리) ───────────────────────────────────── */

/**
 * `validateStatus` 를 적용한다 — **어댑터의 책임이다.**
 *
 * [이것을 빠뜨리면 인터셉터가 조용히 죽는다]
 * axios 코어(`dispatchRequest`)는 validateStatus 를 보지 **않는다.** 그 판정은 `settle()` 에 있고,
 * settle 을 부르는 것은 내장 어댑터(xhr/http/fetch)**뿐**이다. 커스텀 어댑터가 응답을 그냥
 * resolve 하면 status 가 401 이든 500 이든 **성공으로 통과**하고, 응답 인터셉터의 오류 경로는
 * 영원히 실행되지 않는다 — 401 매핑이 있는데 아무 일도 일어나지 않는 상태가 된다.
 * settle 은 axios 의 공개 표면이 아니라 여기서 같은 일을 한다(내장 어댑터와 동일한 규약).
 */
function settleFixture(response: AxiosResponse): AxiosResponse {
  const validate = response.config.validateStatus;
  if (!validate || validate(response.status)) return response;

  throw new AxiosError(
    `Request failed with status code ${response.status}`,
    response.status >= HTTP_STATUS.serverError
      ? AxiosError.ERR_BAD_RESPONSE
      : AxiosError.ERR_BAD_REQUEST,
    response.config,
    undefined,
    response,
  );
}

/**
 * axios `adapter` — **네트워크를 타지 않는다.** 요청을 픽스처로 해소한다.
 *
 * 실패를 두 갈래로 나누는 것이 이 함수의 핵심이다:
 *   · `?fail=`   → **reject**. status 없는 전송 계층 장애(네트워크 단절)에 해당하고, 실제 axios 도
 *                  그 경우 응답 없이 reject 한다. 인터셉터의 status 매핑을 타지 않으므로 generic
 *                  Error 그대로 화면에 도달한다 — 기존 e2e 가 의존하는 동작 그대로다.
 *   · `?status=` → **응답으로 돌려준다**(status 를 실어서). 서버가 하는 일이 그것이다.
 *                  HttpError 로의 변환은 응답 인터셉터가 한다.
 */
const fixtureTransport: AxiosAdapter = async (config): Promise<AxiosResponse> => {
  const fixture = config.fixture;
  if (fixture === undefined) {
    // 이 인스턴스로 나가는 요청은 전부 픽스처를 단다. 백엔드가 붙으면 이 가지가 정상 경로가 된다.
    throw new HttpError(HTTP_STATUS.serverError, GENERIC_FAILURE_MESSAGE);
  }

  // 지연·취소. axios 의 `signal` 을 쓰지 않고 우리 wait 을 쓰는 이유: axios 의 취소는
  // CanceledError 를 던지는데, 이 앱의 `isAbort` 는 DOMException('AbortError') 를 본다(EXC-09).
  // 취소 오류의 형태를 바꾸면 '취소는 실패가 아니다' 판정이 전부 무너진다 — 형태를 보존한다.
  await wait(LATENCY_MS, fixture.signal);

  const status = requestedStatus(fixture.scope, fixture.op);
  if (status !== null) {
    return settleFixture({
      status,
      statusText: '',
      data: { message: STATUS_MESSAGE[status] },
      headers: new AxiosHeaders(),
      config,
    });
  }

  if (isFailRequested(fixture.scope, fixture.op)) {
    throw new Error(GENERIC_FAILURE_MESSAGE);
  }

  // **헤더에서** 멱등키를 되읽는다 — 요청 인터셉터가 붙인 그 값이다.
  const key = config.headers.get(IDEMPOTENCY_HEADER);
  const data = fixture.resolve(typeof key === 'string' ? key : undefined);

  return settleFixture({
    status: 200,
    statusText: 'OK',
    data,
    headers: new AxiosHeaders(),
    config,
  });
};

/* ── 인터셉터 ────────────────────────────────────────────────────────────── */

/** 재현 가능한 status 만 HttpError 의 status 로 승격한다 — 나머지는 5xx 로 뭉친다 */
function toHttpStatus(status: number): HttpStatus | null {
  const known = Object.values(HTTP_STATUS).find((value) => value === status);
  return known ?? null;
}

/** 응답 body 에서 사람이 읽는 문구를 꺼낸다 — 없으면 generic (raw body 를 노출하지 않는다, EXC-20) */
function messageOf(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const { message } = data as { message: unknown };
    if (typeof message === 'string') return message;
  }
  return GENERIC_FAILURE_MESSAGE;
}

/**
 * 응답 오류 → HttpError. **이 변환의 유일한 지점이다** (shared/errors/http-error.ts 헤더의 TODO(lib)).
 *
 * [401 을 여기서 통지하지 않는 이유 — 정본 분담]
 * queryClient 의 QueryCache/MutationCache `onError` 가 `notifySessionExpired` 를 부른다. 그것을
 * 여기로 옮기자는 것이 원래 계획이었으나(옛 TODO(lib)), 코드를 세어 보면 옮길 수 없다:
 * **픽스처 데이터 소스 15개가 이 인스턴스를 지나지 않고** `failIfRequested` 로 401 을 직접 던진다
 * (pages/members · pages/content/* · pages/stats · pages/settings · pages/support · pages/logs …).
 * 여기서 통지하면 그 15개의 401 은 아무도 못 보고, crud.ts 경유분만 **두 곳에서** 통지된다 —
 * 전수도 못 덮고 이중화만 남는다.
 *
 * 그래서 분담을 이렇게 못박는다:
 *   · **status → HttpError 변환의 정본 = 여기.** 전송 계층의 관심사다.
 *   · **401 통지의 정본 = queryClient.** 모든 query/mutation 실패가 그곳으로 수렴하므로
 *     axios 경유든 아니든 전수를 덮는다.
 * 통지가 이 파일로 내려오는 조건은 하나다: 15개 데이터 소스가 전부 이 인스턴스를 지날 때.
 * 그때 queryClient 의 두 캐시 훅이 사라진다. 그 전에 옮기면 401 처리에 구멍이 생긴다.
 */
function handleResponseError(cause: unknown): never {
  if (axios.isAxiosError(cause) && cause.response !== undefined) {
    const status = toHttpStatus(cause.response.status);
    throw new HttpError(
      status ?? HTTP_STATUS.serverError,
      messageOf(cause.response.data as unknown),
    );
  }
  // 취소(DOMException AbortError) · `?fail=` generic Error 는 손대지 않고 그대로 올린다.
  throw cause;
}

function createApiClient(): AxiosInstance {
  const instance = axios.create({
    // TODO(backend): 실제 origin 으로 바꾼다 (예: import.meta.env.VITE_API_BASE_URL).
    //   지금 이 값이 붙는 요청은 **한 건도 전송되지 않는다** — 아래 adapter 가 픽스처로 해소한다.
    baseURL: '/api',
    // 쿠키 세션·CSRF 이중 제출 쿠키를 위해 필요하다 (TODO(backend) 와 짝).
    withCredentials: true,
    // ★ 이 한 줄이 '백엔드 없음'을 강제한다. 지우는 순간 실제 전송이 시작된다.
    adapter: fixtureTransport,
  });

  instance.interceptors.request.use((config) => {
    const key = config.fixture?.idempotencyKey;
    if (key !== undefined) config.headers.set(IDEMPOTENCY_HEADER, key);

    const csrf = readCookie(CSRF_COOKIE);
    if (csrf !== null) config.headers.set(CSRF_HEADER, csrf);

    return config;
  });

  instance.interceptors.response.use((response) => response, handleResponseError);

  return instance;
}

/** 앱 전체에서 **하나** — 인터셉터가 한 벌이어야 규약이 한 벌이다 */
export const apiClient = createApiClient();

/* ── 소비 표면 ───────────────────────────────────────────────────────────── */

/**
 * [export 하지 않는다] 이 타입의 이름을 import 하는 곳은 없다 — 호출자(crud.ts 의 어댑터)는
 * 객체 리터럴을 그대로 넘겨 **구조적으로** 맞춘다. 이름을 export 하면 소비자 0인 export 가 되어
 * dead-code(A83 축5, 임계 0건) 가 한 건 늘 뿐이다. 같은 판단을 crud.ts 의 WriteContext 가 이미 했다.
 */
interface FixtureRequest<T> {
  readonly scope: string;
  readonly op: string;
  readonly signal?: AbortSignal | undefined;
  readonly idempotencyKey?: string | undefined;
  /** 인자는 **요청 헤더에서 되읽은** 멱등키다 (FixtureSpec.resolve 주석 참조) */
  readonly resolve: (idempotencyKey: string | undefined) => T;
}

/**
 * 픽스처 요청 1건을 인스턴스에 태운다 — 어댑터가 부르는 유일한 표면.
 *
 * TODO(backend): url·method 는 지금 스코프/op 을 그대로 옮긴 자리표시다. 실제 연동 시 각 화면
 * data-source.ts 의 `// TODO(backend)` 에 적힌 엔드포인트가 여기로 온다.
 */
export async function fixtureRequest<T>(request: FixtureRequest<T>): Promise<T> {
  const response = await apiClient.request<T>({
    url: `/${request.scope}/${request.op}`,
    method: 'POST',
    fixture: {
      scope: request.scope,
      op: request.op,
      signal: request.signal,
      idempotencyKey: request.idempotencyKey,
      resolve: request.resolve,
    },
  });
  return response.data;
}
