// 행 목적지 — 캡션이 화면의 실제 동작과 갈라지지 않는지 못 박는다.
//
// 여기서 지키는 것은 문자열 비교가 아니라 **거짓말 금지**다. 예전에는 캡션이
// "행을 누르면 해당 항목으로 이동합니다" 한 문장으로 고정이라, 모달을 여는 화면(이동 없음)과
// 발송이 끝나 눌리지 않는 행에도 그렇게 읽어 줬다. 목적지에서 문장을 파생시키면
// 그 조합이 원리적으로 불가능해진다.
import { describe, expect, it, vi } from 'vitest';

import { rowActivator, rowDisabledReason, rowTargetSentence, type RowTarget } from './rowTarget';

interface Item {
  id: string;
  sent: boolean;
}

const ITEM: Item = { id: '7', sent: false };
const SENT: Item = { id: '8', sent: true };

describe('rowTarget — 캡션은 목적지에서 파생된다', () => {
  it("detail 은 '상세 화면으로 이동' 이라고 말한다", () => {
    const target: RowTarget<Item> = { kind: 'detail', href: (i) => `/reviews/${i.id}` };

    expect(rowTargetSentence(target, '리뷰')).toContain('상세 화면으로 이동');
  });

  it("edit 는 '수정 화면으로 이동' 이라고 말한다", () => {
    const target: RowTarget<Item> = { kind: 'edit', href: (i) => `/x/${i.id}/edit` };

    expect(rowTargetSentence(target, '쿠폰')).toContain('수정 화면으로 이동');
  });

  it("modal 은 '이동' 이라고 말하지 않는다 — 실제로 이동하지 않기 때문이다", () => {
    const target: RowTarget<Item> = { kind: 'modal', open: vi.fn() };
    const sentence = rowTargetSentence(target, '카테고리');

    expect(sentence).toContain('편집 창이 열려요');
    expect(sentence).not.toContain('이동');
  });

  it("none 은 '조회 전용' 이라고 말한다", () => {
    expect(rowTargetSentence({ kind: 'none' }, '로그')).toContain('조회 전용');
  });
});

describe('rowTarget — 갈 수 없는 행은 활성화 자체를 만들지 않는다', () => {
  // 빈 콜백을 넘기면 표는 '갈 수 있다' 고 믿고 커서를 pointer 로 그린다.
  // 그것이 발송 완료 캠페인에서 눌러도 아무 일이 없던 원인이다.
  const target: RowTarget<Item> = {
    kind: 'edit',
    href: (i) => `/campaigns/${i.id}/edit`,
    disabled: (i) => (i.sent ? '발송이 끝나 수정할 수 없어요' : false),
  };

  it('갈 수 있는 행은 활성화 콜백을 준다', () => {
    const navigate = vi.fn();
    const activate = rowActivator(target, ITEM, navigate);

    expect(activate).not.toBeUndefined();
    activate?.();
    expect(navigate).toHaveBeenCalledWith('/campaigns/7/edit');
  });

  it('갈 수 없는 행은 undefined 를 준다 (빈 함수가 아니다)', () => {
    const navigate = vi.fn();

    expect(rowActivator(target, SENT, navigate)).toBeUndefined();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('kind=none 은 언제나 활성화되지 않는다', () => {
    expect(rowActivator({ kind: 'none' }, ITEM, vi.fn())).toBeUndefined();
  });

  it('막힌 이유를 문장으로 돌려준다 — 접근성 이름에 실을 수 있게', () => {
    expect(rowDisabledReason(target, SENT)).toBe('발송이 끝나 수정할 수 없어요');
    expect(rowDisabledReason(target, ITEM)).toBeNull();
  });

  it('modal 목적지는 이동하지 않고 open 을 부른다', () => {
    const open = vi.fn();
    const navigate = vi.fn();

    rowActivator({ kind: 'modal', open }, ITEM, navigate)?.();

    expect(open).toHaveBeenCalledWith(ITEM);
    expect(navigate).not.toHaveBeenCalled();
  });
});
