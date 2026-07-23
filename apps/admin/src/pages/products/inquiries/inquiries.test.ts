// 상품 문의 회귀 테스트 — 답변 전이·필터/검색/집계·미답변 경과·답변 검증
//
// 화면 없이 고정할 수 있는 규칙만 여기서 잠근다. 이 도메인에서 가장 쉽게 갈라지는 사실은
// **답변과 상태**다 — 하나만 옮겨 가면 목록의 미답변 집계와 경과 문구가 동시에 거짓말을 한다.
// 그래서 전이를 가장 먼저 고정한다.
//
// 필터·검색·집계·경과는 **지역 픽스처**로 검사한다: 저장소는 전이 테스트가 실제로 바꾸므로,
// 살아 있는 목록을 읽으면 테스트 실행 순서가 결과를 바꾼다.
import { describe, expect, it } from 'vitest';

import {
  answerInquiry,
  applyAnswer,
  applyBeginAnswering,
  applyClose,
  ANSWER_ON_CLOSED_ERROR,
  beginAnsweringInquiry,
  canAnswer,
  canBeginAnswering,
  canClose,
  closeInquiry,
  CLOSE_UNANSWERED_ERROR,
  EMPTY_ANSWER_ERROR,
  getProductInquiry,
  BEGIN_ANSWERING_ERROR,
  applyQuoteIssued,
  canIssueQuote,
  isUnanswered,
  listProductInquiries,
  QUOTE_ISSUE_ON_CLOSED_ERROR,
  toQuoteIssueCandidate,
  toQuoteIssueSource,
} from './_shared/store';
import type { ProductInquiry } from './_shared/store';
import {
  countInquiriesByStatus,
  elapsedLabel,
  elapsedTone,
  filterInquiriesByStatus,
  INQUIRY_STATUS_ALL,
  inquiryChannelLabel,
  inquiryHistory,
  inquiryStatusLabel,
  inquiryStatusTone,
  searchProductInquiries,
  sortProductInquiries,
  unansweredCount,
} from './types';
import { answerError, productInquiryAnswerSchema } from './validation';

const TODAY = '2026-07-21';

/** 지역 픽스처 한 칸 — 필요한 필드만 바꿔 쓴다 */
function inquiry(overrides: Partial<ProductInquiry> = {}): ProductInquiry {
  return {
    id: 'PIQ-20260718-001',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    customerName: '김서연',
    customerContact: '010-2481-7735',
    channel: 'storefront',
    subject: '재고 문의',
    message: '차콜 M 재입고 예정이 있나요?',
    status: 'received',
    createdAt: '2026-07-18T01:12:00Z',
    answeredAt: '',
    answer: '',
    quoteId: '',
    ...overrides,
  };
}

/* ── 답변 전이 (가장 먼저 고정한다) ───────────────────────────────────────── */

describe('applyAnswer — 답변과 상태는 함께 옮겨 간다', () => {
  it('답변을 저장하면 상태가 답변 완료로 넘어가고 답변 시각이 찍힌다', () => {
    const next = applyAnswer(
      inquiry(),
      '재입고는 다음 주 화요일 예정이에요.',
      '2026-07-21T00:00:00Z',
    );
    expect(next.answer).toBe('재입고는 다음 주 화요일 예정이에요.');
    expect(next.status).toBe('answered');
    expect(next.answeredAt).toBe('2026-07-21T00:00:00Z');
  });

  it('앞뒤 공백은 다듬어 저장한다 — 고객에게 그대로 나가는 글이다', () => {
    expect(applyAnswer(inquiry(), '  확인했어요.  ', '2026-07-21T00:00:00Z').answer).toBe(
      '확인했어요.',
    );
  });

  it('공백만 입력하면 막는다 — 빈 답변이 답변 완료로 집계되면 안 된다', () => {
    expect(() => applyAnswer(inquiry(), '   ', '2026-07-21T00:00:00Z')).toThrow(EMPTY_ANSWER_ERROR);
  });

  it('답변을 고쳐도 최초 답변 시각은 바뀌지 않는다 — 응대 속도를 사후에 바꾸지 않는다', () => {
    const answered = inquiry({
      status: 'answered',
      answeredAt: '2026-07-19T02:00:00Z',
      answer: '첫 답변',
    });
    const fixed = applyAnswer(answered, '오타를 고친 답변', '2026-07-21T06:00:00Z');
    expect(fixed.answeredAt).toBe('2026-07-19T02:00:00Z');
    expect(fixed.answer).toBe('오타를 고친 답변');
    expect(fixed.status).toBe('answered');
  });

  it('종결된 문의는 답변을 수정할 수 없다 — 기록이다', () => {
    const closed = inquiry({ status: 'closed', answeredAt: '2026-07-19T02:00:00Z', answer: '끝' });
    expect(() => applyAnswer(closed, '다시 써요', '2026-07-21T00:00:00Z')).toThrow(
      ANSWER_ON_CLOSED_ERROR,
    );
  });
});

describe('applyClose / applyBeginAnswering — 나머지 전이', () => {
  it('답변이 나간 문의만 종결한다', () => {
    const answered = inquiry({
      status: 'answered',
      answeredAt: '2026-07-19T02:00:00Z',
      answer: 'ok',
    });
    expect(applyClose(answered).status).toBe('closed');
  });

  it('미답변 문의는 종결하지 못한다 — 고객이 답을 못 받은 채 닫히는 길을 막는다', () => {
    expect(() => applyClose(inquiry())).toThrow(CLOSE_UNANSWERED_ERROR);
    expect(() => applyClose(inquiry({ status: 'answering' }))).toThrow(CLOSE_UNANSWERED_ERROR);
  });

  it('접수 상태만 답변 착수로 바꾼다', () => {
    expect(applyBeginAnswering(inquiry()).status).toBe('answering');
    expect(() => applyBeginAnswering(inquiry({ status: 'answering' }))).toThrow(
      BEGIN_ANSWERING_ERROR,
    );
  });
});

describe('전이 술어 — 화면의 버튼과 저장소가 같은 판단을 쓴다', () => {
  it('종결만 답변을 막는다', () => {
    expect(canAnswer('received')).toBe(true);
    expect(canAnswer('answering')).toBe(true);
    expect(canAnswer('answered')).toBe(true);
    expect(canAnswer('closed')).toBe(false);
  });

  it('종결은 답변 완료에서만 열린다', () => {
    expect(canClose('answered')).toBe(true);
    expect(canClose('received')).toBe(false);
    expect(canClose('closed')).toBe(false);
  });

  it('답변 착수는 접수에서만 열린다', () => {
    expect(canBeginAnswering('received')).toBe(true);
    expect(canBeginAnswering('answering')).toBe(false);
  });

  it('미답변은 접수·답변 중 두 상태다', () => {
    expect(isUnanswered('received')).toBe(true);
    expect(isUnanswered('answering')).toBe(true);
    expect(isUnanswered('answered')).toBe(false);
    expect(isUnanswered('closed')).toBe(false);
  });
});

/* ── 저장소 쓰기 (전이 규칙을 그대로 지난다) ─────────────────────────────── */

describe('저장소 — answerInquiry / closeInquiry / beginAnsweringInquiry', () => {
  it('답변하면 저장소의 상태도 함께 넘어간다', () => {
    answerInquiry(
      'PIQ-20260718-001',
      '재입고는 다음 주 화요일 예정이에요.',
      '2026-07-21T00:00:00Z',
    );
    const saved = getProductInquiry('PIQ-20260718-001');
    expect(saved.status).toBe('answered');
    expect(saved.answeredAt).toBe('2026-07-21T00:00:00Z');
    expect(saved.answer).toContain('재입고');
  });

  it('답변한 문의는 종결할 수 있다', () => {
    closeInquiry('PIQ-20260718-001');
    expect(getProductInquiry('PIQ-20260718-001').status).toBe('closed');
  });

  it('미답변 문의의 종결은 저장소도 막는다 — 규칙이 화면에만 있지 않다', () => {
    expect(() => {
      closeInquiry('PIQ-20260721-005');
    }).toThrow(CLOSE_UNANSWERED_ERROR);
  });

  it('답변 착수는 접수 상태를 답변 중으로 옮긴다', () => {
    beginAnsweringInquiry('PIQ-20260721-005');
    expect(getProductInquiry('PIQ-20260721-005').status).toBe('answering');
  });

  it('없는 문의번호는 조회에서 막힌다', () => {
    expect(() => getProductInquiry('PIQ-없는번호')).toThrow('문의를 찾을 수 없어요');
  });
});

/* ── 표시 규칙 ────────────────────────────────────────────────────────────── */

describe('상태 문구·색', () => {
  it('상태마다 한국어 문구를 준다', () => {
    expect(inquiryStatusLabel('received')).toBe('접수');
    expect(inquiryStatusLabel('answering')).toBe('답변 중');
    expect(inquiryStatusLabel('answered')).toBe('답변 완료');
    expect(inquiryStatusLabel('closed')).toBe('종결');
  });

  it('방치된 접수만 경고색 — 이미 사람이 붙은 답변 중과 구별한다', () => {
    expect(inquiryStatusTone('received')).toBe('warning');
    expect(inquiryStatusTone('answering')).toBe('info');
    expect(inquiryStatusTone('answered')).toBe('success');
  });

  it('채널 문구 — 결제대행을 끈 상품 페이지 유입을 따로 부른다', () => {
    expect(inquiryChannelLabel('storefront')).toBe('상품 페이지');
    expect(inquiryChannelLabel('kakao')).toBe('카카오톡');
  });
});

/* ── 목록 필터·검색·집계 ──────────────────────────────────────────────────── */

describe('목록 필터·집계(순수)', () => {
  const list: readonly ProductInquiry[] = [
    inquiry({ id: 'PIQ-A', status: 'received' }),
    inquiry({ id: 'PIQ-B', status: 'answering' }),
    inquiry({ id: 'PIQ-C', status: 'answered', answeredAt: '2026-07-19T01:00:00Z', answer: 'ok' }),
    inquiry({ id: 'PIQ-D', status: 'closed', answeredAt: '2026-07-19T01:00:00Z', answer: 'ok' }),
    inquiry({ id: 'PIQ-E', status: 'received' }),
  ];

  it('전체는 그대로 통과시킨다', () => {
    expect(filterInquiriesByStatus(list, INQUIRY_STATUS_ALL)).toHaveLength(list.length);
  });

  it('상태로 거른다', () => {
    expect(filterInquiriesByStatus(list, 'received').map((item) => item.id)).toEqual([
      'PIQ-A',
      'PIQ-E',
    ]);
  });

  it('집계는 전체 수와 상태별 수를 함께 낸다', () => {
    const counts = countInquiriesByStatus(list);
    expect(counts[INQUIRY_STATUS_ALL]).toBe(5);
    expect(counts.received).toBe(2);
    expect(counts.answering).toBe(1);
    expect(counts.answered + counts.closed).toBe(2);
  });

  it('미답변은 접수 + 답변 중 — 좌측 안내와 배지가 같은 수를 말한다', () => {
    expect(unansweredCount(list)).toBe(3);
  });
});

describe('searchProductInquiries — 문의번호·상품명·문의자·제목', () => {
  const list: readonly ProductInquiry[] = [
    inquiry({ id: 'PIQ-A', subject: '재고 문의', productName: '루미엔 경량 패딩 점퍼' }),
    inquiry({
      id: 'PIQ-B',
      subject: '사이즈 교환',
      productName: '테라 스니커즈 데일리',
      customerName: '박지훈',
    }),
  ];

  it('빈 검색어는 전체를 돌려준다', () => {
    expect(searchProductInquiries(list, '   ')).toHaveLength(2);
  });

  it('문의번호로 찾는다 — 고객이 전화로 부르는 값이다', () => {
    expect(searchProductInquiries(list, 'piq-b').map((item) => item.id)).toEqual(['PIQ-B']);
  });

  it('상품명·문의자·제목으로도 찾는다', () => {
    expect(searchProductInquiries(list, '스니커즈').map((item) => item.id)).toEqual(['PIQ-B']);
    expect(searchProductInquiries(list, '박지훈').map((item) => item.id)).toEqual(['PIQ-B']);
    expect(searchProductInquiries(list, '재고').map((item) => item.id)).toEqual(['PIQ-A']);
  });
});

describe('sortProductInquiries — 최근 접수가 위', () => {
  it('접수 최신순으로 세우고 같은 시각은 번호로 안정 정렬한다', () => {
    const sorted = sortProductInquiries([
      inquiry({ id: 'PIQ-A', createdAt: '2026-07-10T00:00:00Z' }),
      inquiry({ id: 'PIQ-C', createdAt: '2026-07-20T00:00:00Z' }),
      inquiry({ id: 'PIQ-B', createdAt: '2026-07-20T00:00:00Z' }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['PIQ-C', 'PIQ-B', 'PIQ-A']);
  });

  it('원본 배열을 바꾸지 않는다 — 저장소는 정렬로 흔들리지 않는다', () => {
    const source = [
      inquiry({ id: 'PIQ-A', createdAt: '2026-07-10T00:00:00Z' }),
      inquiry({ id: 'PIQ-B', createdAt: '2026-07-20T00:00:00Z' }),
    ];
    sortProductInquiries(source);
    expect(source.map((item) => item.id)).toEqual(['PIQ-A', 'PIQ-B']);
  });
});

/* ── 경과 문구 ────────────────────────────────────────────────────────────── */

describe('elapsedLabel — 미답변 경과와 응대 소요', () => {
  it('미답변은 접수일부터 오늘까지 센다', () => {
    expect(elapsedLabel(inquiry({ createdAt: '2026-07-18T01:12:00Z' }), TODAY)).toBe(
      '3일째 미답변',
    );
  });

  it('오늘 접수된 건은 날짜가 아니라 사실을 말한다', () => {
    expect(elapsedLabel(inquiry({ createdAt: '2026-07-20T23:30:00Z' }), TODAY)).toBe('오늘 접수');
  });

  it('답변된 건은 접수 → 최초 답변까지를 센다 — 이미 끝난 구간이다', () => {
    expect(
      elapsedLabel(
        inquiry({
          status: 'answered',
          createdAt: '2026-07-15T00:05:00Z',
          answeredAt: '2026-07-16T02:20:00Z',
        }),
        TODAY,
      ),
    ).toBe('1일 만에 답변');
  });

  it('같은 날 답변은 당일 답변', () => {
    expect(
      elapsedLabel(
        inquiry({
          status: 'closed',
          createdAt: '2026-07-10T07:30:00Z',
          answeredAt: '2026-07-10T09:02:00Z',
        }),
        TODAY,
      ),
    ).toBe('당일 답변');
  });

  it('읽을 수 없는 시각은 0일로 위장하지 않는다', () => {
    expect(elapsedLabel(inquiry({ createdAt: '언젠가' }), TODAY)).toBe('—');
  });
});

describe('elapsedTone — 색은 문구를 거들 뿐', () => {
  it('사흘을 넘긴 미답변은 붉게 알린다', () => {
    expect(elapsedTone(inquiry({ createdAt: '2026-07-18T01:12:00Z' }), TODAY)).toBe('danger');
  });

  it('하루 이상이면 경고, 오늘 접수는 정보', () => {
    expect(elapsedTone(inquiry({ createdAt: '2026-07-20T01:00:00Z' }), TODAY)).toBe('warning');
    expect(elapsedTone(inquiry({ createdAt: '2026-07-21T01:00:00Z' }), TODAY)).toBe('info');
  });

  it('답변이 끝난 건은 색으로 재촉하지 않는다', () => {
    expect(
      elapsedTone(inquiry({ status: 'answered', answeredAt: '2026-07-19T01:00:00Z' }), TODAY),
    ).toBe('neutral');
  });
});

/* ── 처리 이력 (저장된 사실에서 파생) ─────────────────────────────────────── */

describe('inquiryHistory — 접수·답변·종결', () => {
  it('미답변이면 접수 한 칸뿐이다', () => {
    expect(inquiryHistory(inquiry()).map((event) => event.badgeLabel)).toEqual(['접수']);
  });

  it('답변 중이면 담당 착수가 한 칸 붙는다', () => {
    expect(inquiryHistory(inquiry({ status: 'answering' })).map((e) => e.badgeLabel)).toEqual([
      '접수',
      '답변 중',
    ]);
  });

  it('종결이면 접수·답변·종결 세 칸이 된다', () => {
    const events = inquiryHistory(
      inquiry({ status: 'closed', answeredAt: '2026-07-19T01:00:00Z', answer: '안내드렸어요.' }),
    );
    expect(events.map((event) => event.badgeLabel)).toEqual(['접수', '답변', '종결']);
    expect(events[1]?.text).toBe('안내드렸어요.');
  });
});

/* ── 답변 검증 ────────────────────────────────────────────────────────────── */

describe('productInquiryAnswerSchema — 답변 검증', () => {
  it('정상 답변은 통과한다', () => {
    expect(productInquiryAnswerSchema.safeParse({ answer: '재입고 예정이에요.' }).success).toBe(
      true,
    );
  });

  it('공백만 있는 답변은 막는다', () => {
    expect(productInquiryAnswerSchema.safeParse({ answer: '   ' }).success).toBe(false);
  });

  it('최대 길이를 넘기면 막는다', () => {
    expect(productInquiryAnswerSchema.safeParse({ answer: 'ㄱ'.repeat(1001) }).success).toBe(false);
  });

  it('화면이 읽는 오류 문구는 스키마가 낸다 — 판단이 둘로 갈라지지 않는다', () => {
    expect(answerError('   ')).toBe('답변 내용을 입력하세요.');
    expect(answerError('정상 답변')).toBeNull();
  });
});

/* ── 픽스처 ───────────────────────────────────────────────────────────────── */

describe('픽스처', () => {
  it('문의번호는 접수일이 박힌 사람이 읽는 번호다 — URL 과 같은 값을 쓴다', () => {
    for (const item of listProductInquiries()) {
      expect(item.id).toMatch(/^PIQ-\d{8}-\d{3}$/);
    }
  });
});

/* ── 문의 → 견적 발행 ──────────────────────────────────────────────────────────
 *
 * [왜 여기 있나] 결제대행을 끈 운영에서 이 경로가 유일한 매출 경로다. 예전에는 상품 문의에
 * 견적으로 가는 길이 한 줄도 없어서, '단체 주문 120장 단가 문의' 에 답변만 남기면 그 거래가
 * 성사됐는지도 얼마인지도 앱이 영영 몰랐다.
 *
 * 어휘는 영업 문의에서 빌렸다(`quote_issued`) — 같은 사실에 두 낱말을 만들지 않는다. */

describe('applyQuoteIssued — 견적 id 와 상태는 함께 옮겨 간다', () => {
  it('발행하면 견적 id 가 붙고 상태가 견적 발행으로 넘어간다', () => {
    const next = applyQuoteIssued(inquiry({ status: 'answering' }), 'qt-7');
    expect(next.quoteId).toBe('qt-7');
    expect(next.status).toBe('quote_issued');
  });

  /* [멱등] 두 번 눌러도 견적은 하나다 — quoteId 가 멱등키다(영업 문의 선례 그대로). */
  it('이미 발행된 문의는 그대로다 — 두 번 눌러도 견적 id 가 바뀌지 않는다', () => {
    const issued = applyQuoteIssued(inquiry(), 'qt-7');
    expect(applyQuoteIssued(issued, 'qt-9')).toBe(issued);
  });

  it('종결된 문의는 막는다', () => {
    expect(() => applyQuoteIssued(inquiry({ status: 'closed' }), 'qt-7')).toThrow(
      QUOTE_ISSUE_ON_CLOSED_ERROR,
    );
  });

  /* 답변을 이미 보낸 뒤에 '그럼 견적 주세요' 가 오는 것은 흔한 일이다 — 그 문을 닫으면
     운영자가 앱 밖에서 견적을 만들게 된다. */
  it('답변 완료된 문의도 견적을 낼 수 있다 — 종결만 막는다', () => {
    expect(canIssueQuote('received')).toBe(true);
    expect(canIssueQuote('answered')).toBe(true);
    expect(canIssueQuote('quote_issued')).toBe(true);
    expect(canIssueQuote('closed')).toBe(false);
  });

  it('견적 발행은 미답변이 아니다 — 견적서가 나갔다면 그것이 응답이다', () => {
    expect(isUnanswered('quote_issued')).toBe(false);
  });

  it('경과 문구가 견적 발행을 답변 완료로 뭉개지 않는다', () => {
    const issued = inquiry({ status: 'quote_issued', quoteId: 'qt-7' });
    expect(elapsedLabel(issued, TODAY)).toBe('견적 발행');
    expect(elapsedTone(issued, TODAY)).toBe('info');
  });

  it('처리 이력에 견적 발행이 남는다 — 저장된 사실(quoteId)에서 파생한다', () => {
    const events = inquiryHistory(inquiry({ status: 'quote_issued', quoteId: 'qt-7' }));
    expect(events.some((event) => event.badgeLabel === '견적 발행')).toBe(true);
  });
});

describe('견적 발행 요청으로 옮기기(순수)', () => {
  it('상품명이 견적의 품목이 되고, 문의자가 거래처 표시 라벨이 된다', () => {
    const source = toQuoteIssueSource(inquiry());
    expect(source.channel).toBe('product');
    expect(source.itemName).toBe('루미엔 경량 패딩 점퍼');
    expect(source.accountLabel).toBe('김서연');
  });
  it('발행 가능 판정에 필요한 값만 넘긴다', () => {
    expect(toQuoteIssueCandidate(inquiry())).toEqual({
      id: 'PIQ-20260718-001',
      quoteId: '',
      issuable: true,
    });
  });
});
