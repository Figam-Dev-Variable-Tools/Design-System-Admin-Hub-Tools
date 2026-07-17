// 일괄 삭제 실패 문구(bulkDeleteErrorMessage) 단언 (A41)
//
// [이 파일이 왜 생겼나] 일괄 삭제의 409 갭을 덮는 테스트가 저장소 어디에도 없었다 —
// crud.test.ts 는 단건 409 만 보고, bulk.test.ts 는 건수만 봤다. 그래서
// '재시도하면 또 409 인 실패에 재시도를 권한다'는 오안내가 아무 경보 없이 살아 있었다.
// 규칙을 고쳤으면 그 규칙이 지켜지는지 재는 자리도 함께 만든다.
import { describe, expect, it } from 'vitest';

import { HTTP_STATUS, HttpError } from '../errors/http-error';
import { bulkDeleteErrorMessage } from './useCrudList';

const conflict = (message: string) => ({ reason: new HttpError(HTTP_STATUS.conflict, message) });
const serverError = () => ({ reason: new HttpError(HTTP_STATUS.serverError, '서버 오류') });

describe('bulkDeleteErrorMessage — 일괄 삭제 실패 문구', () => {
  it('409 사유가 있으면 그 문장을 그대로 보여 주고 재시도를 권하지 않는다', () => {
    const message = bulkDeleteErrorMessage(3, [
      conflict('발송 규칙 3건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다.'),
    ]);

    expect(message).toContain('3건 중 1건을 삭제하지 못했습니다.');
    expect(message).toContain('발송 규칙 3건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다.');
    // 핵심 단언 — 409 는 시간이 푸는 실패가 아니다. 재시도 권유는 잘못된 복구 수단이다.
    expect(message).not.toContain('다시 시도');
  });

  it('409 가 아닌 실패만 있으면 재시도를 권한다 (500 은 실제로 시간이 푼다)', () => {
    const message = bulkDeleteErrorMessage(2, [serverError()]);

    expect(message).toBe('2건 중 1건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('409 와 재시도 가능 실패가 섞이면 둘 다 말한다', () => {
    const message = bulkDeleteErrorMessage(5, [conflict('참조가 남아 있습니다.'), serverError()]);

    expect(message).toContain('5건 중 2건을 삭제하지 못했습니다.');
    expect(message).toContain('참조가 남아 있습니다.');
    // 한쪽만 고쳐서는 끝낼 수 없으므로 재시도 안내도 남는다
    expect(message).toContain('나머지는 잠시 후 다시 시도해 주세요.');
  });

  it('같은 409 사유가 여러 건이어도 문장은 한 번만 (소음 방지)', () => {
    const reason = '참조가 남아 있어 삭제할 수 없습니다.';
    const message = bulkDeleteErrorMessage(3, [
      conflict(reason),
      conflict(reason),
      conflict(reason),
    ]);

    expect(message).toBe(`3건 중 3건을 삭제하지 못했습니다. ${reason}`);
    // 같은 문장이 3번 쌓이면 정보가 아니라 소음이다
    expect(message.split(reason)).toHaveLength(2);
  });

  it('서로 다른 409 사유는 모두 보여 준다', () => {
    const message = bulkDeleteErrorMessage(2, [
      conflict('규칙이 씁니다.'),
      conflict('이미 삭제됐습니다.'),
    ]);

    expect(message).toContain('규칙이 씁니다.');
    expect(message).toContain('이미 삭제됐습니다.');
  });

  it('메시지 없는 409 는 재시도 안내로 떨어진다 (빈 문장을 보여 주지 않는다)', () => {
    const message = bulkDeleteErrorMessage(1, [
      { reason: new HttpError(HTTP_STATUS.conflict, '') },
    ]);

    expect(message).toBe('1건 중 1건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('천 단위 구분자를 쓴다', () => {
    const message = bulkDeleteErrorMessage(1200, [serverError()]);

    expect(message).toContain('1,200건 중 1건');
  });
});
