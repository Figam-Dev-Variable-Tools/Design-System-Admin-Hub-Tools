// 일괄 쓰기 집계(settleAll · settleAllDetailed) 단언 (A41)
//
// 콘텐츠 목록 6종의 일괄 삭제/ON·OFF 가 공유하는 규약: 부분 실패도 건수로 알리고, 취소는 실패가 아니다.
// settleAllDetailed 는 여기에 **사유**를 더한다 — 409 를 재시도로 오안내하지 않으려면 사유가 필요하다.
import { describe, expect, it } from 'vitest';

import { settleAll, settleAllDetailed } from './bulk';
import { HTTP_STATUS, HttpError } from './errors/http-error';

describe('settleAll — 일괄 쓰기 집계', () => {
  it('전원 성공이면 실패 0', async () => {
    expect(await settleAll(['a', 'b', 'c'], () => Promise.resolve())).toBe(0);
  });

  it('실패 건수를 센다', async () => {
    const failed = await settleAll(['a', 'b', 'c'], (id) =>
      id === 'b' ? Promise.reject(new Error('실패')) : Promise.resolve(),
    );
    expect(failed).toBe(1);
  });

  it('취소(AbortError)는 실패로 세지 않는다', async () => {
    const abortError = new DOMException('요청이 취소되었습니다.', 'AbortError');
    const failed = await settleAll(['a', 'b'], (id) =>
      id === 'a' ? Promise.reject(abortError) : Promise.resolve(),
    );
    expect(failed).toBe(0);
  });

  it('빈 목록은 실패 0', async () => {
    expect(await settleAll([], () => Promise.resolve())).toBe(0);
  });
});

describe('settleAllDetailed — 사유를 보존하는 집계', () => {
  it('실패한 항목과 사유를 함께 돌려준다', async () => {
    const conflict = new HttpError(
      HTTP_STATUS.conflict,
      '발송 규칙 3건이 이 템플릿을 쓰고 있습니다.',
    );
    const outcome = await settleAllDetailed(['a', 'b', 'c'], (id) =>
      id === 'b' ? Promise.reject(conflict) : Promise.resolve(),
    );

    expect(outcome.failed).toBe(1);
    expect(outcome.failures).toHaveLength(1);
    // **어느 항목이** 막혔는지 — 건수만으로는 영원히 알 수 없던 것
    expect(outcome.failures[0]?.item).toBe('b');
    // **왜** 막혔는지 — 어댑터가 만든 문장이 호출부까지 살아서 도착해야 한다
    expect(outcome.failures[0]?.reason).toBe(conflict);
  });

  it('사유가 서로 다른 실패를 각각 보존한다 (409 와 500 이 섞인 경우)', async () => {
    const conflict = new HttpError(HTTP_STATUS.conflict, '참조가 남아 있습니다.');
    const server = new HttpError(HTTP_STATUS.serverError, '서버 오류');
    const outcome = await settleAllDetailed(['a', 'b', 'c'], (id) => {
      if (id === 'a') return Promise.reject(conflict);
      if (id === 'b') return Promise.reject(server);
      return Promise.resolve();
    });

    expect(outcome.failed).toBe(2);
    expect(outcome.failures.map((f) => f.item)).toEqual(['a', 'b']);
    expect(outcome.failures.map((f) => f.reason)).toEqual([conflict, server]);
  });

  it('취소(AbortError)는 실패로도 사유로도 남기지 않는다', async () => {
    const abortError = new DOMException('요청이 취소되었습니다.', 'AbortError');
    const outcome = await settleAllDetailed(['a', 'b'], (id) =>
      id === 'a' ? Promise.reject(abortError) : Promise.resolve(),
    );

    expect(outcome.failed).toBe(0);
    expect(outcome.failures).toEqual([]);
  });

  it('전원 성공/빈 목록이면 사유가 없다', async () => {
    expect(await settleAllDetailed(['a'], () => Promise.resolve())).toEqual({
      failed: 0,
      failures: [],
    });
    expect(await settleAllDetailed([], () => Promise.resolve())).toEqual({
      failed: 0,
      failures: [],
    });
  });

  it('settleAll 은 settleAllDetailed 의 건수와 일치한다 (얇은 껍데기 규약)', async () => {
    const run = (id: string) =>
      id === 'b' ? Promise.reject(new Error('실패')) : Promise.resolve();
    const ids = ['a', 'b', 'c'];
    expect(await settleAll(ids, run)).toBe((await settleAllDetailed(ids, run)).failed);
  });
});
