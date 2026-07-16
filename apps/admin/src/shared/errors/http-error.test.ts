// HttpError 계약 (EXC-04/06 · EXC-20)
//
// 이 타입이 지키는 것은 하나다: **status 로 분기할 수 있어야 한다.** 예전처럼 모든 실패가 generic
// Error 로 붕괴하면 409(충돌)와 500(장애)이 같은 배너를 받는다.
import { describe, expect, it } from 'vitest';

import {
  createErrorReference,
  HTTP_STATUS,
  HttpError,
  isConflict,
  isForbidden,
  isHttpError,
  isNotFound,
  isUnauthorized,
  isUnprocessable,
  referenceOf,
} from './http-error';

describe('HttpError', () => {
  it('status 와 message 를 지니고 Error 로 잡힌다', () => {
    const error = new HttpError(HTTP_STATUS.conflict, '충돌');

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(409);
    expect(error.message).toBe('충돌');
    expect(error.name).toBe('HttpError');
  });

  it('422 의 필드 위반을 실어 나른다 — 폼이 그 입력에 인라인 에러를 꽂는다 (EXC-07)', () => {
    const error = new HttpError(HTTP_STATUS.unprocessable, '검증 실패', {
      violations: [{ field: 'quoteNo', message: '이미 사용 중인 견적번호입니다.' }],
    });

    expect(error.violations).toEqual([
      { field: 'quoteNo', message: '이미 사용 중인 견적번호입니다.' },
    ]);
  });

  it('violations 를 주지 않으면 빈 배열이다 — 소비처가 undefined 를 방어하지 않게 한다', () => {
    expect(new HttpError(HTTP_STATUS.serverError, '장애').violations).toEqual([]);
  });
});

describe('타입 가드', () => {
  it('각 status 를 자기 판정만 통과시킨다', () => {
    expect(isUnauthorized(new HttpError(HTTP_STATUS.unauthorized, ''))).toBe(true);
    expect(isForbidden(new HttpError(HTTP_STATUS.forbidden, ''))).toBe(true);
    expect(isNotFound(new HttpError(HTTP_STATUS.notFound, ''))).toBe(true);
    expect(isUnprocessable(new HttpError(HTTP_STATUS.unprocessable, ''))).toBe(true);

    // 남의 status 에는 반응하지 않는다
    expect(isUnauthorized(new HttpError(HTTP_STATUS.forbidden, ''))).toBe(false);
    expect(isForbidden(new HttpError(HTTP_STATUS.unauthorized, ''))).toBe(false);
  });

  /**
   * 409 와 412 는 **같은 UX 로 수렴한다** — 덮어쓰지 않고 입력을 보존한 채 충돌 다이얼로그를 연다.
   * 둘을 따로 처리하면 If-Match 를 쓰는 엔드포인트만 조용히 유령 저장으로 돌아간다.
   */
  it('409 와 412 를 모두 충돌로 본다 (EXC-04)', () => {
    expect(isConflict(new HttpError(HTTP_STATUS.conflict, ''))).toBe(true);
    expect(isConflict(new HttpError(HTTP_STATUS.preconditionFailed, ''))).toBe(true);
    expect(isConflict(new HttpError(HTTP_STATUS.serverError, ''))).toBe(false);
  });

  /** catch 절의 값은 무엇이든 올 수 있다 — 가드가 unknown 을 안전하게 받아야 한다 */
  it('HttpError 가 아닌 값에 대해 절대 throw 하지 않는다', () => {
    const others: readonly unknown[] = [null, undefined, 'string', 404, {}, new Error('generic')];

    for (const value of others) {
      expect(isHttpError(value)).toBe(false);
      expect(isUnauthorized(value)).toBe(false);
      expect(isConflict(value)).toBe(false);
      expect(referenceOf(value)).toBeNull();
    }
  });
});

describe('오류 참조 코드 (EXC-20)', () => {
  it('HttpError 는 참조 코드를 자동 발급한다', () => {
    expect(referenceOf(new HttpError(HTTP_STATUS.serverError, '장애'))).toMatch(/^TDS-[0-9A-Z]+-/);
  });

  it('주어진 참조 코드를 보존한다 — 서버가 발급한 코드가 있으면 그것이 정본이다', () => {
    const error = new HttpError(HTTP_STATUS.serverError, '장애', { reference: 'TDS-SERVER-1' });
    expect(error.reference).toBe('TDS-SERVER-1');
  });

  it('발급된 코드는 서로 다르다 — 같은 코드는 로그 대조를 무의미하게 만든다', () => {
    const codes = new Set(Array.from({ length: 50 }, () => createErrorReference()));
    expect(codes.size).toBe(50);
  });
});
