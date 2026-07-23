// 프로그램 문의 회귀 테스트 — 답변 전이·두 축 필터/검색/집계·미답변 경과·답변 검증
//
// 화면 없이 고정할 수 있는 규칙만 여기서 잠근다. 이 도메인에서 가장 쉽게 갈라지는 사실은
// **답변과 상태**다 — 하나만 옮겨 가면 목록의 미답변 집계와 경과 문구가 동시에 거짓말을 한다.
// 그래서 전이를 가장 먼저 고정한다.
//
// 필터·검색·집계·경과는 **지역 픽스처**로 검사한다: 저장소는 전이 테스트가 실제로 바꾸므로,
// 살아 있는 목록을 읽으면 테스트 실행 순서가 결과를 바꾼다.
//
// 시각은 전부 UTC(Z)다 — 러너의 OS 타임존이 무엇이든 같은 결과여야 한다(ERP-09).
import { describe, expect, it } from 'vitest';

import {
  answerInquiry,
  applyProgramAnswer,
  applyProgramBeginAnswering,
  applyProgramClose,
  beginAnsweringInquiry,
  canAnswerProgramInquiry,
  canBeginAnsweringProgramInquiry,
  canCloseProgramInquiry,
  closeInquiry,
  getProgramInquiry,
  isProgramInquiryUnanswered,
  listProgramInquiries,
  PROGRAM_ANSWER_ON_CLOSED_ERROR,
  PROGRAM_BEGIN_ANSWERING_ERROR,
  PROGRAM_CLOSE_UNANSWERED_ERROR,
  PROGRAM_EMPTY_ANSWER_ERROR,
  PROGRAM_QUOTE_ISSUE_ON_CLOSED_ERROR,
  applyProgramQuoteIssued,
  canIssueProgramQuote,
  toProgramQuoteIssueCandidate,
  toProgramQuoteIssueSource,
} from './_shared/store';
import type { ProgramInquiry } from './_shared/store';
import {
  countProgramInquiriesByStatus,
  countProgramInquiriesByTopic,
  elapsedLabel,
  elapsedTone,
  filterProgramInquiries,
  PROGRAM_INQUIRY_FILTER_ALL,
  programInquiryChannelLabel,
  programInquiryHistory,
  programInquiryStatusLabel,
  programInquiryStatusTone,
  programInquiryTopicLabel,
  programInquiryTopicTone,
  searchProgramInquiries,
  sortProgramInquiries,
  unansweredCount,
} from './types';
import { programAnswerError, programInquiryAnswerSchema } from './validation';

const TODAY = '2026-07-21';

/** 지역 픽스처 한 칸 — 필요한 필드만 바꿔 쓴다 */
function inquiry(overrides: Partial<ProgramInquiry> = {}): ProgramInquiry {
  return {
    id: 'PGQ-20260717-001',
    programId: 'pgm-1',
    programName: '무선 스튜디오 모니터 헤드폰',
    customerName: '한도윤',
    customerContact: 'doyun.h@example.com',
    channel: 'storefront',
    topic: 'reward',
    subject: '리워드 구성 문의',
    message: '2대 세트에 스탠드가 몇 개 오나요?',
    status: 'received',
    createdAt: '2026-07-17T02:40:00Z',
    answeredAt: '',
    answer: '',
    quoteId: '',
    ...overrides,
  };
}

/* ── 답변 전이 (가장 먼저 고정한다) ───────────────────────────────────────── */

describe('applyProgramAnswer — 답변과 상태는 함께 옮겨 간다', () => {
  it('답변을 저장하면 상태가 답변 완료로 넘어가고 답변 시각이 찍힌다', () => {
    const next = applyProgramAnswer(inquiry(), '스탠드는 1개 포함이에요.', '2026-07-21T00:00:00Z');
    expect(next.answer).toBe('스탠드는 1개 포함이에요.');
    expect(next.status).toBe('answered');
    expect(next.answeredAt).toBe('2026-07-21T00:00:00Z');
  });

  it('앞뒤 공백은 다듬어 저장한다 — 후원자에게 그대로 나가는 글이다', () => {
    expect(applyProgramAnswer(inquiry(), '  확인했어요.  ', '2026-07-21T00:00:00Z').answer).toBe(
      '확인했어요.',
    );
  });

  it('공백만 입력하면 막는다 — 빈 답변이 답변 완료로 집계되면 안 된다', () => {
    expect(() => applyProgramAnswer(inquiry(), '   ', '2026-07-21T00:00:00Z')).toThrow(
      PROGRAM_EMPTY_ANSWER_ERROR,
    );
  });

  it('답변을 고쳐도 최초 답변 시각은 바뀌지 않는다 — 약속이 언제 나갔는지는 고쳐 쓸 수 없다', () => {
    const answered = inquiry({
      status: 'answered',
      answeredAt: '2026-07-18T02:00:00Z',
      answer: '첫 답변',
    });
    const fixed = applyProgramAnswer(answered, '오타를 고친 답변', '2026-07-21T06:00:00Z');
    expect(fixed.answeredAt).toBe('2026-07-18T02:00:00Z');
    expect(fixed.answer).toBe('오타를 고친 답변');
  });

  it('종결된 문의는 답변을 수정할 수 없다 — 기록이다', () => {
    const closed = inquiry({ status: 'closed', answeredAt: '2026-07-18T02:00:00Z', answer: '끝' });
    expect(() => applyProgramAnswer(closed, '다시 써요', '2026-07-21T00:00:00Z')).toThrow(
      PROGRAM_ANSWER_ON_CLOSED_ERROR,
    );
  });
});

describe('applyProgramClose / applyProgramBeginAnswering — 나머지 전이', () => {
  it('답변이 나간 문의만 종결한다', () => {
    const answered = inquiry({
      status: 'answered',
      answeredAt: '2026-07-18T02:00:00Z',
      answer: 'ok',
    });
    expect(applyProgramClose(answered).status).toBe('closed');
  });

  it('미답변 문의는 종결하지 못한다 — 후원자가 답을 못 받은 채 닫히는 길을 막는다', () => {
    expect(() => applyProgramClose(inquiry())).toThrow(PROGRAM_CLOSE_UNANSWERED_ERROR);
    expect(() => applyProgramClose(inquiry({ status: 'answering' }))).toThrow(
      PROGRAM_CLOSE_UNANSWERED_ERROR,
    );
  });

  it('접수 상태만 답변 착수로 바꾼다', () => {
    expect(applyProgramBeginAnswering(inquiry()).status).toBe('answering');
    expect(() => applyProgramBeginAnswering(inquiry({ status: 'answering' }))).toThrow(
      PROGRAM_BEGIN_ANSWERING_ERROR,
    );
  });
});

describe('전이 술어 — 화면의 버튼과 저장소가 같은 판단을 쓴다', () => {
  it('종결만 답변을 막는다', () => {
    expect(canAnswerProgramInquiry('received')).toBe(true);
    expect(canAnswerProgramInquiry('answered')).toBe(true);
    expect(canAnswerProgramInquiry('closed')).toBe(false);
  });

  it('종결은 답변 완료에서만, 답변 착수는 접수에서만 열린다', () => {
    expect(canCloseProgramInquiry('answered')).toBe(true);
    expect(canCloseProgramInquiry('received')).toBe(false);
    expect(canBeginAnsweringProgramInquiry('received')).toBe(true);
    expect(canBeginAnsweringProgramInquiry('answering')).toBe(false);
  });

  it('미답변은 접수·답변 중 두 상태다', () => {
    expect(isProgramInquiryUnanswered('received')).toBe(true);
    expect(isProgramInquiryUnanswered('answering')).toBe(true);
    expect(isProgramInquiryUnanswered('answered')).toBe(false);
    expect(isProgramInquiryUnanswered('closed')).toBe(false);
  });
});

/* ── 저장소 쓰기 (전이 규칙을 그대로 지난다) ─────────────────────────────── */

describe('저장소 — answerInquiry / closeInquiry / beginAnsweringInquiry', () => {
  it('답변하면 저장소의 상태도 함께 넘어간다', () => {
    answerInquiry(
      'PGQ-20260717-001',
      '2대 세트에는 스탠드 1개가 포함돼요.',
      '2026-07-21T00:00:00Z',
    );
    const saved = getProgramInquiry('PGQ-20260717-001');
    expect(saved.status).toBe('answered');
    expect(saved.answeredAt).toBe('2026-07-21T00:00:00Z');
    expect(saved.answer).toContain('스탠드');
  });

  it('답변한 문의는 종결할 수 있다', () => {
    closeInquiry('PGQ-20260717-001');
    expect(getProgramInquiry('PGQ-20260717-001').status).toBe('closed');
  });

  it('미답변 문의의 종결은 저장소도 막는다 — 규칙이 화면에만 있지 않다', () => {
    expect(() => {
      closeInquiry('PGQ-20260721-005');
    }).toThrow(PROGRAM_CLOSE_UNANSWERED_ERROR);
  });

  it('답변 착수는 접수 상태를 답변 중으로 옮긴다', () => {
    beginAnsweringInquiry('PGQ-20260721-005');
    expect(getProgramInquiry('PGQ-20260721-005').status).toBe('answering');
  });

  it('없는 문의번호는 조회에서 막힌다', () => {
    expect(() => getProgramInquiry('PGQ-없는번호')).toThrow('문의를 찾을 수 없어요');
  });
});

/* ── 표시 규칙 ────────────────────────────────────────────────────────────── */

describe('상태·유형·채널 문구', () => {
  it('상태마다 한국어 문구를 준다', () => {
    expect(programInquiryStatusLabel('received')).toBe('접수');
    expect(programInquiryStatusLabel('answering')).toBe('답변 중');
    expect(programInquiryStatusLabel('answered')).toBe('답변 완료');
    expect(programInquiryStatusLabel('closed')).toBe('종결');
  });

  it('방치된 접수만 경고색 — 이미 사람이 붙은 답변 중과 구별한다', () => {
    expect(programInquiryStatusTone('received')).toBe('warning');
    expect(programInquiryStatusTone('answering')).toBe('info');
    expect(programInquiryStatusTone('answered')).toBe('success');
  });

  it('후원 맥락의 문의 유형을 문구로 준다', () => {
    expect(programInquiryTopicLabel('reward')).toBe('리워드');
    expect(programInquiryTopicLabel('delivery')).toBe('배송');
    expect(programInquiryTopicLabel('refund')).toBe('환불');
  });

  it('돈이 걸린 유형(환불·결제)은 눈에 띄는 색을 준다', () => {
    expect(programInquiryTopicTone('refund')).toBe('warning');
    expect(programInquiryTopicTone('payment')).toBe('warning');
    expect(programInquiryTopicTone('etc')).toBe('neutral');
  });

  it('채널 문구 — 결제대행을 끈 프로그램 페이지 유입을 따로 부른다', () => {
    expect(programInquiryChannelLabel('storefront')).toBe('프로그램 페이지');
    expect(programInquiryChannelLabel('kakao')).toBe('카카오톡');
  });
});

/* ── 목록 필터(두 축)·검색·집계 ───────────────────────────────────────────── */

describe('목록 필터·집계(순수)', () => {
  const list: readonly ProgramInquiry[] = [
    inquiry({ id: 'PGQ-A', status: 'received', topic: 'reward' }),
    inquiry({ id: 'PGQ-B', status: 'answering', topic: 'delivery' }),
    inquiry({
      id: 'PGQ-C',
      status: 'answered',
      topic: 'refund',
      answeredAt: '2026-07-18T01:00:00Z',
      answer: 'ok',
    }),
    inquiry({
      id: 'PGQ-D',
      status: 'closed',
      topic: 'payment',
      answeredAt: '2026-07-18T01:00:00Z',
      answer: 'ok',
    }),
    inquiry({ id: 'PGQ-E', status: 'received', topic: 'reward' }),
  ];

  it('전체는 그대로 통과시킨다', () => {
    expect(
      filterProgramInquiries(list, PROGRAM_INQUIRY_FILTER_ALL, PROGRAM_INQUIRY_FILTER_ALL),
    ).toHaveLength(list.length);
  });

  it('상태로 거른다', () => {
    expect(
      filterProgramInquiries(list, 'received', PROGRAM_INQUIRY_FILTER_ALL).map((item) => item.id),
    ).toEqual(['PGQ-A', 'PGQ-E']);
  });

  it('유형으로 거른다', () => {
    expect(
      filterProgramInquiries(list, PROGRAM_INQUIRY_FILTER_ALL, 'refund').map((item) => item.id),
    ).toEqual(['PGQ-C']);
  });

  it('두 축은 함께 걸린다 — 교집합이다', () => {
    expect(filterProgramInquiries(list, 'received', 'reward').map((item) => item.id)).toEqual([
      'PGQ-A',
      'PGQ-E',
    ]);
    expect(filterProgramInquiries(list, 'received', 'refund')).toHaveLength(0);
  });

  it('상태 집계는 전체 수와 상태별 수를 함께 낸다', () => {
    const counts = countProgramInquiriesByStatus(list);
    expect(counts[PROGRAM_INQUIRY_FILTER_ALL]).toBe(5);
    expect(counts.received).toBe(2);
    expect(counts.answering).toBe(1);
    expect(counts.answered + counts.closed).toBe(2);
  });

  it('유형 집계도 같은 규칙으로 낸다', () => {
    const counts = countProgramInquiriesByTopic(list);
    expect(counts[PROGRAM_INQUIRY_FILTER_ALL]).toBe(5);
    expect(counts.reward).toBe(2);
    expect(counts.delivery).toBe(1);
    expect(counts.etc).toBe(0);
  });

  it('미답변은 접수 + 답변 중 — 좌측 안내와 배지가 같은 수를 말한다', () => {
    expect(unansweredCount(list)).toBe(3);
  });
});

describe('searchProgramInquiries — 문의번호·프로그램명·문의자·제목', () => {
  const list: readonly ProgramInquiry[] = [
    inquiry({ id: 'PGQ-A', subject: '리워드 구성 문의' }),
    inquiry({
      id: 'PGQ-B',
      subject: '배송 예정일',
      programName: '접이식 원목 사이드테이블',
      customerName: '서예린',
    }),
  ];

  it('빈 검색어는 전체를 돌려준다', () => {
    expect(searchProgramInquiries(list, '   ')).toHaveLength(2);
  });

  it('문의번호로 찾는다 — 후원자가 전화로 부르는 값이다', () => {
    expect(searchProgramInquiries(list, 'pgq-b').map((item) => item.id)).toEqual(['PGQ-B']);
  });

  it('프로그램명·문의자·제목으로도 찾는다', () => {
    expect(searchProgramInquiries(list, '사이드테이블').map((item) => item.id)).toEqual(['PGQ-B']);
    expect(searchProgramInquiries(list, '서예린').map((item) => item.id)).toEqual(['PGQ-B']);
    expect(searchProgramInquiries(list, '리워드').map((item) => item.id)).toEqual(['PGQ-A']);
  });
});

describe('sortProgramInquiries — 최근 접수가 위', () => {
  it('접수 최신순으로 세우고 같은 시각은 번호로 안정 정렬한다', () => {
    const sorted = sortProgramInquiries([
      inquiry({ id: 'PGQ-A', createdAt: '2026-07-10T00:00:00Z' }),
      inquiry({ id: 'PGQ-C', createdAt: '2026-07-20T00:00:00Z' }),
      inquiry({ id: 'PGQ-B', createdAt: '2026-07-20T00:00:00Z' }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['PGQ-C', 'PGQ-B', 'PGQ-A']);
  });

  it('원본 배열을 바꾸지 않는다 — 저장소는 정렬로 흔들리지 않는다', () => {
    const source = [
      inquiry({ id: 'PGQ-A', createdAt: '2026-07-10T00:00:00Z' }),
      inquiry({ id: 'PGQ-B', createdAt: '2026-07-20T00:00:00Z' }),
    ];
    sortProgramInquiries(source);
    expect(source.map((item) => item.id)).toEqual(['PGQ-A', 'PGQ-B']);
  });
});

/* ── 경과 문구 ────────────────────────────────────────────────────────────── */

describe('elapsedLabel — 미답변 경과와 응대 소요', () => {
  it('미답변은 접수일부터 오늘까지 센다', () => {
    // 2026-07-17T02:40Z = KST 07-17 11:40 → 7월 21일까지 나흘
    expect(elapsedLabel(inquiry(), TODAY)).toBe('4일째 미답변');
  });

  it('오늘 접수된 건은 날짜가 아니라 사실을 말한다', () => {
    // 2026-07-20T22:10Z = KST 07-21 07:10 — 자르면 어제가 되는 값이다
    expect(elapsedLabel(inquiry({ createdAt: '2026-07-20T22:10:00Z' }), TODAY)).toBe('오늘 접수');
  });

  it('답변된 건은 접수 → 최초 답변까지를 센다 — 이미 끝난 구간이다', () => {
    expect(
      elapsedLabel(
        inquiry({
          status: 'answered',
          createdAt: '2026-07-14T01:20:00Z',
          answeredAt: '2026-07-15T05:10:00Z',
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
          createdAt: '2026-07-08T05:05:00Z',
          answeredAt: '2026-07-08T08:30:00Z',
        }),
        TODAY,
      ),
    ).toBe('당일 답변');
  });

  it('읽을 수 없는 시각은 0일로 위장하지 않는다', () => {
    expect(elapsedLabel(inquiry({ createdAt: '언젠가' }), TODAY)).toBe('—');
  });
});

describe('elapsedTone — 마감이 있는 판매라 상품보다 하루 빠르게 경고한다', () => {
  it('이틀을 넘긴 미답변은 붉게 알린다', () => {
    expect(elapsedTone(inquiry({ createdAt: '2026-07-19T01:00:00Z' }), TODAY)).toBe('danger');
  });

  it('하루면 경고, 오늘 접수는 정보', () => {
    expect(elapsedTone(inquiry({ createdAt: '2026-07-20T01:00:00Z' }), TODAY)).toBe('warning');
    expect(elapsedTone(inquiry({ createdAt: '2026-07-21T01:00:00Z' }), TODAY)).toBe('info');
  });

  it('답변이 끝난 건은 색으로 재촉하지 않는다', () => {
    expect(
      elapsedTone(inquiry({ status: 'answered', answeredAt: '2026-07-18T01:00:00Z' }), TODAY),
    ).toBe('neutral');
  });
});

/* ── 처리 이력 (저장된 사실에서 파생) ─────────────────────────────────────── */

describe('programInquiryHistory — 접수·답변·종결', () => {
  it('미답변이면 접수 한 칸뿐이고, 그 문구가 채널과 유형을 함께 말한다', () => {
    const events = programInquiryHistory(inquiry());
    expect(events.map((event) => event.badgeLabel)).toEqual(['접수']);
    expect(events[0]?.text).toContain('프로그램 페이지');
    expect(events[0]?.text).toContain('리워드');
  });

  it('답변 중이면 담당 착수가 한 칸 붙는다', () => {
    expect(
      programInquiryHistory(inquiry({ status: 'answering' })).map((e) => e.badgeLabel),
    ).toEqual(['접수', '답변 중']);
  });

  it('종결이면 접수·답변·종결 세 칸이 된다', () => {
    const events = programInquiryHistory(
      inquiry({ status: 'closed', answeredAt: '2026-07-18T01:00:00Z', answer: '안내드렸어요.' }),
    );
    expect(events.map((event) => event.badgeLabel)).toEqual(['접수', '답변', '종결']);
    expect(events[1]?.text).toBe('안내드렸어요.');
  });
});

/* ── 답변 검증 ────────────────────────────────────────────────────────────── */

describe('programInquiryAnswerSchema — 답변 검증', () => {
  it('정상 답변은 통과한다', () => {
    expect(programInquiryAnswerSchema.safeParse({ answer: '스탠드는 1개예요.' }).success).toBe(
      true,
    );
  });

  it('공백만 있는 답변은 막는다', () => {
    expect(programInquiryAnswerSchema.safeParse({ answer: '   ' }).success).toBe(false);
  });

  it('최대 길이를 넘기면 막는다', () => {
    expect(programInquiryAnswerSchema.safeParse({ answer: 'ㄱ'.repeat(1001) }).success).toBe(false);
  });

  it('화면이 읽는 오류 문구는 스키마가 낸다 — 판단이 둘로 갈라지지 않는다', () => {
    expect(programAnswerError('   ')).toBe('답변 내용을 입력하세요.');
    expect(programAnswerError('정상 답변')).toBeNull();
  });
});

/* ── 픽스처 ───────────────────────────────────────────────────────────────── */

describe('픽스처', () => {
  it('문의번호는 접수일이 박힌 사람이 읽는 번호다 — URL 과 같은 값을 쓴다', () => {
    for (const item of listProgramInquiries()) {
      expect(item.id).toMatch(/^PGQ-\d{8}-\d{3}$/);
    }
  });
});

/* ── 문의 → 견적 발행 ──────────────────────────────────────────────────────────
 *
 * 후원형 펀딩에서도 결제대행을 끄면 '후원하기' 가 '문의하기' 로 바뀐다. 그 문의가 실제 후원으로
 * 이어지려면 금액이 적힌 문서가 필요한데, 예전에는 이 모듈에서 견적으로 가는 길이 없었다.
 *
 * 어휘는 영업 문의·상품 문의와 같다(`quote_issued`) — 같은 사실에 세 낱말을 만들지 않는다. */

describe('applyProgramQuoteIssued — 견적 id 와 상태는 함께 옮겨 간다', () => {
  it('발행하면 견적 id 가 붙고 상태가 견적 발행으로 넘어간다', () => {
    const next = applyProgramQuoteIssued(inquiry({ status: 'answering' }), 'qt-7');
    expect(next.quoteId).toBe('qt-7');
    expect(next.status).toBe('quote_issued');
  });

  /* [멱등] 두 번 눌러도 견적은 하나다 — quoteId 가 멱등키다. */
  it('이미 발행된 문의는 그대로다 — 두 번 눌러도 견적 id 가 바뀌지 않는다', () => {
    const issued = applyProgramQuoteIssued(inquiry(), 'qt-7');
    expect(applyProgramQuoteIssued(issued, 'qt-9')).toBe(issued);
  });

  it('종결된 문의는 막는다', () => {
    expect(() => applyProgramQuoteIssued(inquiry({ status: 'closed' }), 'qt-7')).toThrow(
      PROGRAM_QUOTE_ISSUE_ON_CLOSED_ERROR,
    );
  });

  it('종결만 막는다 — 답변 뒤에 오는 견적 요청도 받는다', () => {
    expect(canIssueProgramQuote('received')).toBe(true);
    expect(canIssueProgramQuote('answered')).toBe(true);
    expect(canIssueProgramQuote('closed')).toBe(false);
  });

  it('견적 발행은 미답변이 아니다 — 견적서가 나갔다면 그것이 응답이다', () => {
    expect(isProgramInquiryUnanswered('quote_issued')).toBe(false);
  });

  it('경과 문구가 견적 발행을 답변 완료로 뭉개지 않는다', () => {
    const issued = inquiry({ status: 'quote_issued', quoteId: 'qt-7' });
    expect(elapsedLabel(issued, TODAY)).toBe('견적 발행');
    expect(elapsedTone(issued, TODAY)).toBe('info');
  });

  it('처리 이력에 견적 발행이 남는다 — 저장된 사실(quoteId)에서 파생한다', () => {
    const events = programInquiryHistory(inquiry({ status: 'quote_issued', quoteId: 'qt-7' }));
    expect(events.some((event) => event.badgeLabel === '견적 발행')).toBe(true);
  });
});

describe('견적 발행 요청으로 옮기기(순수)', () => {
  it('프로그램명이 견적의 품목이 되고, 후원자가 거래처 표시 라벨이 된다', () => {
    const source = toProgramQuoteIssueSource(inquiry());
    expect(source.channel).toBe('program');
    expect(source.itemName).toBe(inquiry().programName);
    expect(source.accountLabel).toBe(inquiry().customerName);
  });
  it('발행 가능 판정에 필요한 값만 넘긴다', () => {
    expect(toProgramQuoteIssueCandidate(inquiry())).toEqual({
      id: inquiry().id,
      quoteId: '',
      issuable: true,
    });
  });
});
