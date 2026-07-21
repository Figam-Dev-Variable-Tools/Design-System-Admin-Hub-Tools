// 문의 상태 공유 어휘 회귀 테스트 — 공통 순서·타입가드·모듈 확장(순수)
//
// [무엇을 지키나] 영업 문의와 고객센터 1:1 문의는 같은 '접수→처리→완료' 흐름을 각자 선언하고
// 있었다. 그래서 같은 단계가 두 곳에서 다른 집합이 되고, 1:1 문의가 견적 요청으로 넘어가는 전이는
// 표현할 낱말조차 없었다. 공통 어휘 하나와 그 확장 규칙을 여기서 고정한다.
import { describe, expect, it } from 'vitest';

import {
  COMMON_INQUIRY_STATUS_ORDER,
  isCommonInquiryStatus,
  withExtraInquiryStatuses,
} from './inquiry-status';

describe('공통 상태 어휘', () => {
  it('접수→배정→처리중→완료→종결 순서다', () => {
    expect(COMMON_INQUIRY_STATUS_ORDER).toEqual([
      'received',
      'assigned',
      'in_progress',
      'answered',
      'closed',
    ]);
  });
  it('타입가드는 공통 상태만 통과시킨다', () => {
    expect(isCommonInquiryStatus('in_progress')).toBe(true);
    // 'hold' 는 영업 문의만의 상태다 — 공통 어휘에는 없다
    expect(isCommonInquiryStatus('hold')).toBe(false);
    expect(isCommonInquiryStatus(3)).toBe(false);
    expect(isCommonInquiryStatus(null)).toBe(false);
  });
});

describe('모듈 확장 — 공통 순서 사이에 자기 상태를 끼운다', () => {
  // [회귀] 영업 문의가 7단계를 리터럴로 다시 적으면 공통 다섯 단계가 두 번 선언된 셈이 되고,
  // 공통 순서가 바뀔 때 영업만 옛 순서로 남는다.
  it('영업 문의 순서 = 처리중 뒤에 보류·견적 발행', () => {
    expect(withExtraInquiryStatuses('in_progress', ['hold', 'quote_issued'])).toEqual([
      'received',
      'assigned',
      'in_progress',
      'hold',
      'quote_issued',
      'answered',
      'closed',
    ]);
  });
  it('끼울 것이 없으면 공통 순서 그대로다 — 고객센터 티켓이 이 경우다', () => {
    expect(withExtraInquiryStatuses('in_progress', [])).toEqual(COMMON_INQUIRY_STATUS_ORDER);
  });
  it('마지막 단계 뒤에도 끼울 수 있다', () => {
    expect(withExtraInquiryStatuses('closed', ['reopened'])).toEqual([
      ...COMMON_INQUIRY_STATUS_ORDER,
      'reopened',
    ]);
  });
  it('원본 순서를 건드리지 않는다(불변)', () => {
    withExtraInquiryStatuses('received', ['hold']);
    expect(COMMON_INQUIRY_STATUS_ORDER).toHaveLength(5);
  });
});
