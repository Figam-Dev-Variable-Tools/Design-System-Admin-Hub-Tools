// 문의 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 목록/상세는 fetchAll/fetchOne,
// 답변·상태·담당 저장은 update 를 쓴다(문의 생성은 고객 채널이 만든다 — 관리자 생성 UI 없음).
//
// [문의 → 견적 발행] 상태를 '견적 발행'으로 바꾸면 견적이 자동 생성된다(H). 그 부수효과를 어댑터의
// patch 안에 둔다 — 화면이 '문의 저장'과 '견적 생성'을 두 번 호출하면 하나만 성공하는 창이 생기고,
// 그 창에서 새로고침하면 상태는 '견적 발행'인데 견적이 없는 문의가 남는다. 실 HTTP 는 없다.
import { createCrudAdapter } from '../../../shared/crud';
import { issueQuoteFromInquiry } from '../quotes/data-source';
import { appendEvent, hasIssuedQuote, requestsQuoteIssue, sortInquiries } from './types';
import type { Inquiry, InquiryInput } from './types';

const INQUIRY_SEED: readonly Inquiry[] = [
  {
    id: 'inq-1',
    inquiryNo: 'INQ-20260714-001',
    title: 'ERP 도입 견적 요청',
    type: 'quote',
    channel: 'web',
    customerName: '김담당',
    company: '(주)한빛소프트웨어',
    contact: 'kim@hanbit.example',
    assignee: '이영업',
    priority: 'high',
    status: 'in_progress',
    receivedAt: '2026-07-14T09:20:00',
    body: '100석 기준 ERP 라이선스와 구축 일정에 대한 견적을 요청드립니다.',
    quoteId: '',
    timeline: [
      {
        id: 'ev-1',
        at: '2026-07-14T09:20:00',
        author: '시스템',
        kind: 'received',
        text: '웹 문의 접수',
      },
      {
        id: 'ev-2',
        at: '2026-07-14T10:05:00',
        author: '이영업',
        kind: 'note',
        text: '담당 배정, 견적서 준비 중.',
      },
    ],
  },
  {
    id: 'inq-2',
    inquiryNo: 'INQ-20260713-004',
    title: '유지보수 계약 갱신 문의',
    type: 'support',
    channel: 'phone',
    customerName: '최과장',
    company: '대성물산 주식회사',
    contact: '010-5555-6666',
    assignee: '',
    priority: 'normal',
    status: 'received',
    receivedAt: '2026-07-13T14:10:00',
    body: '내년도 유지보수 계약 갱신 조건을 알고 싶습니다.',
    quoteId: '',
    timeline: [
      {
        id: 'ev-3',
        at: '2026-07-13T14:10:00',
        author: '시스템',
        kind: 'received',
        text: '전화 문의 접수',
      },
    ],
  },
  {
    id: 'inq-3',
    inquiryNo: 'INQ-20260711-002',
    title: '납품 지연 클레임',
    type: 'claim',
    channel: 'email',
    customerName: '오미래',
    company: '미래테크놀로지',
    contact: 'oh@mirae.example',
    assignee: '박계약',
    priority: 'urgent',
    status: 'answered',
    receivedAt: '2026-07-11T08:40:00',
    body: '지난 발주 건 납기가 지연되어 확인 부탁드립니다.',
    quoteId: '',
    timeline: [
      {
        id: 'ev-4',
        at: '2026-07-11T08:40:00',
        author: '시스템',
        kind: 'received',
        text: '이메일 문의 접수',
      },
      {
        id: 'ev-5',
        at: '2026-07-11T11:30:00',
        author: '박계약',
        kind: 'reply',
        text: '납기 지연 사유와 보상안을 회신드렸습니다.',
      },
      {
        id: 'ev-6',
        at: '2026-07-11T11:31:00',
        author: '박계약',
        kind: 'status',
        text: '상태를 완료로 변경',
      },
    ],
  },
];

let seq = INQUIRY_SEED.length;

const SYSTEM_AUTHOR = '시스템';

/**
 * '견적 발행' 전이의 부수효과 — 문의 갱신과 한 덩이로 견적을 만든다.
 *   · 견적 발행이 아니면 아무것도 하지 않는다.
 *   · **이미 발행된 문의면 다시 만들지 않는다**(quoteId 가 멱등 키다) — 상태를 오가도, 저장을 연타해도
 *     견적은 하나다. 견적 저장소도 문의 id 로 한 번 더 교차 확인한다(이중 방어).
 *   · 승계 필드는 buildQuoteFromInquiry(../quotes/types)가 단독으로 정한다.
 */
function issueQuoteIfRequested(item: Inquiry, input: InquiryInput): Inquiry {
  const next: Inquiry = { ...item, ...input, id: item.id };
  if (!requestsQuoteIssue(input.status) || hasIssuedQuote(item)) return next;

  const quote = issueQuoteFromInquiry({
    inquiryId: item.id,
    inquiryNo: item.inquiryNo,
    company: item.company,
    customerName: item.customerName,
    body: item.body,
    // 발행일은 견적일이다 — 문의 접수일이 아니라 오늘이다.
    issueDate: new Date().toISOString().slice(0, 10),
  });

  return {
    ...next,
    quoteId: quote.id,
    timeline: appendEvent(next.timeline, {
      id: `ev-${String(Date.now())}-q`,
      at: new Date().toISOString(),
      author: SYSTEM_AUTHOR,
      kind: 'status',
      // 타임라인 항목은 '무슨 일 — 대상' 라벨형이다. 조사가 붙을 자리가 없어 shared/format 의
      // 조사 헬퍼가 필요 없다(리터럴 '을(를)' 도 물론 없다 — ERP-13).
      text: `견적 자동 생성 — ${quote.quoteNo}`,
    }),
  };
}

// TODO(backend): GET /api/sales/inquiries · GET/PUT /api/sales/inquiries/:id (답변·상태·담당 저장)
//   · '견적 발행' 전이는 견적 생성을 동반한다 — 서버는 문의 갱신 + 견적 생성 + 양방향 링크를 한
//     트랜잭션으로 처리하고, 이미 발행된 문의의 재발행은 기존 견적을 돌려준다(멱등).
export const inquiryAdapter = createCrudAdapter<Inquiry, InquiryInput>({
  scope: 'sales-inquiries',
  seed: INQUIRY_SEED,
  build: (input) => {
    seq += 1;
    return { id: `inq-${String(seq)}`, ...input };
  },
  patch: issueQuoteIfRequested,
  sort: sortInquiries,
});
