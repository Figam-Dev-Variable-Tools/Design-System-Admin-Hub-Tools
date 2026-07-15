// 문의 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/sales/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 목록/상세는 fetchAll/fetchOne,
// 답변·상태·담당 저장은 update 를 쓴다(문의 생성은 고객 채널이 만든다 — 관리자 생성 UI 없음).
import { createCrudAdapter } from '../../../shared/crud';
import { sortInquiries } from './types';
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

// TODO(backend): GET /api/sales/inquiries · GET/PUT /api/sales/inquiries/:id (답변·상태·담당 저장)
export const inquiryAdapter = createCrudAdapter<Inquiry, InquiryInput>({
  scope: 'sales-inquiries',
  seed: INQUIRY_SEED,
  build: (input) => {
    seq += 1;
    return { id: `inq-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortInquiries,
});
