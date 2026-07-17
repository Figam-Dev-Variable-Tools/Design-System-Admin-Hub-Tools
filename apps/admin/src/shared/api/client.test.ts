// Axios 클라이언트 회귀 테스트
//
// 이 파일이 지키는 것은 두 가지다:
//   ① **실 HTTP 0건** — 이 프로젝트의 최상위 제약. 전송 계층을 감시해 한 건도 나가지 않음을 증명한다.
//   ② **인터셉터가 하중을 받는다** — CSRF 헤더·Idempotency-Key 헤더·status→HttpError 변환이
//      시늉이 아니라 실제로 동작함을 확인한다. 인터셉터를 지우면 여기가 붉어진다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isAbort } from '../async';
import { HTTP_STATUS, isHttpError, isUnauthorized } from '../errors/http-error';
import { apiClient, fixtureRequest } from './client';

/** 쿼리스트링 스위치(`?fail=` · `?status=`)를 세운다 — dev.ts 가 location.search 를 읽는다 */
function setSearch(search: string): void {
  window.history.replaceState({}, '', search === '' ? '/' : `/?${search}`);
}

beforeEach(() => {
  setSearch('');
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('실 HTTP 0건 — 백엔드 절대 금지', () => {
  it('요청이 성공해도 XMLHttpRequest·fetch 를 한 번도 열지 않는다', async () => {
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const send = vi.spyOn(XMLHttpRequest.prototype, 'send');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const data = await fixtureRequest({
      scope: 'test',
      op: 'list',
      resolve: () => ['a', 'b'],
    });

    expect(data).toEqual(['a', 'b']);
    expect(open).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('실패 경로에서도 전송이 일어나지 않는다', async () => {
    const send = vi.spyOn(XMLHttpRequest.prototype, 'send');
    setSearch('status=list:500');

    await expect(
      fixtureRequest({ scope: 'test', op: 'list', resolve: () => 'unreachable' }),
    ).rejects.toBeInstanceOf(Error);

    expect(send).not.toHaveBeenCalled();
  });
});

describe('요청 인터셉터 — Idempotency-Key (EXC-08)', () => {
  it('호출자가 넘긴 멱등키가 **헤더를 거쳐** 픽스처에 도달한다', async () => {
    const seen: (string | undefined)[] = [];

    await fixtureRequest({
      scope: 'test',
      op: 'save',
      idempotencyKey: 'key-1',
      resolve: (key) => {
        seen.push(key);
      },
    });

    // 픽스처는 config.headers 에서 되읽는다 — 인터셉터가 붙이지 않았다면 undefined 였을 값이다.
    expect(seen).toEqual(['key-1']);
  });

  it('키를 주지 않으면 헤더가 없고 픽스처는 undefined 를 받는다', async () => {
    const seen: (string | undefined)[] = [];

    await fixtureRequest({
      scope: 'test',
      op: 'save',
      resolve: (key) => {
        seen.push(key);
      },
    });

    expect(seen).toEqual([undefined]);
  });
});

describe('요청 인터셉터 — CSRF 이중 제출 쿠키', () => {
  it('XSRF-TOKEN 쿠키가 있으면 X-XSRF-TOKEN 헤더로 옮겨 붙인다', async () => {
    document.cookie = 'XSRF-TOKEN=tok-abc; path=/';
    let header: unknown;

    // 조립된 요청 헤더를 관측한다 — transformRequest 는 요청 인터셉터 **뒤**에 돈다.
    const response = await apiClient.request({
      url: '/test/save',
      method: 'POST',
      fixture: {
        scope: 'test',
        op: 'save',
        resolve: () => undefined,
      },
      transformRequest: [
        (data, headers) => {
          header = headers.get('X-XSRF-TOKEN');
          return data;
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(header).toBe('tok-abc');
  });

  it('쿠키가 없으면 헤더를 지어내지 않는다 — 없는 것은 없는 대로 둔다', async () => {
    let header: unknown = 'sentinel';

    await apiClient.request({
      url: '/test/save',
      method: 'POST',
      fixture: { scope: 'test', op: 'save', resolve: () => undefined },
      transformRequest: [
        (data, headers) => {
          header = headers.get('X-XSRF-TOKEN');
          return data;
        },
      ],
    });

    expect(header).toBeUndefined();
  });
});

describe('응답 인터셉터 — status → HttpError', () => {
  it('`?status=save:401` 은 응답으로 와서 인터셉터가 HttpError(401) 로 바꾼다', async () => {
    setSearch('status=save:401');

    const cause = await fixtureRequest({
      scope: 'test',
      op: 'save',
      resolve: () => undefined,
    }).catch((error: unknown) => error);

    expect(isHttpError(cause)).toBe(true);
    expect(isUnauthorized(cause)).toBe(true);
  });

  it('409 도 같은 경로로 매핑된다', async () => {
    setSearch('status=save:409');

    const cause = await fixtureRequest({
      scope: 'test',
      op: 'save',
      resolve: () => undefined,
    }).catch((error: unknown) => error);

    expect(isHttpError(cause)).toBe(true);
    expect(isHttpError(cause) ? cause.status : null).toBe(HTTP_STATUS.conflict);
  });

  it('픽스처가 status 를 돌려주지 않으면 resolve 의 값이 그대로 반환된다', async () => {
    await expect(
      fixtureRequest({ scope: 'test', op: 'detail', resolve: () => ({ id: 'x' }) }),
    ).resolves.toEqual({ id: 'x' });
  });
});

describe('전송 계층 장애와 취소는 인터셉터가 손대지 않는다', () => {
  it('`?fail=save` 는 status 없는 generic Error 로 남는다 (HttpError 가 아니다)', async () => {
    setSearch('fail=save');

    const cause = await fixtureRequest({
      scope: 'test',
      op: 'save',
      resolve: () => undefined,
    }).catch((error: unknown) => error);

    // HttpError 로 승격하면 EXC-20 의 참조 코드가 화면에 새로 뜬다 — 기존 e2e 계약이 깨진다.
    expect(cause).toBeInstanceOf(Error);
    expect(isHttpError(cause)).toBe(false);
  });

  it('abort 는 DOMException(AbortError) 형태를 유지한다 (EXC-09)', async () => {
    const controller = new AbortController();
    const pending = fixtureRequest({
      scope: 'test',
      op: 'list',
      signal: controller.signal,
      resolve: () => 'unreachable',
    }).catch((error: unknown) => error);

    controller.abort();
    const cause = await pending;

    // axios 의 CanceledError 로 바뀌면 isAbort 가 false 가 되고 '취소는 실패가 아니다'가 무너진다.
    expect(isAbort(cause)).toBe(true);
  });
});
