// 신청서 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [백엔드 연동 지점] 신청은 고객 채널(웹 폼)이 만든다 — 이 화면엔 생성 UI 가 없다. 관리자는 상태 전이 +
// 메모로 처리(update)만 한다. build/patch 는 프레임워크 계약상 두되 화면은 fetchAll/fetchOne/update 만 쓴다.
//   // TODO(backend): GET /api/reservations/applications · GET·PUT /api/reservations/applications/:id
import { createCrudAdapter } from '../../../shared/crud';
import { sortApplications } from './types';
import type { Application, ApplicationInput } from './types';

const APPLICATION_SEED: readonly Application[] = [
  {
    id: 'app-1',
    code: 'APP-20260716-001',
    type: 'quote',
    applicantName: '한빛기획',
    applicantContact: 'sales@**.co.kr',
    submittedAt: '2026-07-16T09:20:00',
    status: 'received',
    fields: [
      { label: '희망 품목', value: '기업 세미나 공간 대관' },
      { label: '예상 인원', value: '30명' },
      { label: '희망 예산', value: '150만원' },
    ],
    adminNote: '',
    history: [
      {
        id: 'app-1-h1',
        at: '2026-07-16T09:20:00',
        status: 'received',
        by: '시스템',
        note: '웹 폼으로 접수',
      },
    ],
  },
  {
    id: 'app-2',
    code: 'APP-20260715-002',
    type: 'consulting',
    applicantName: '이수민',
    applicantContact: '010-2222-**33',
    submittedAt: '2026-07-15T14:05:00',
    status: 'reviewing',
    fields: [
      { label: '상담 분야', value: '브랜드 컨설팅' },
      { label: '희망 시간대', value: '평일 오후' },
    ],
    adminNote: '담당 배정 검토 중',
    history: [
      {
        id: 'app-2-h1',
        at: '2026-07-15T14:05:00',
        status: 'received',
        by: '시스템',
        note: '웹 폼으로 접수',
      },
      {
        id: 'app-2-h2',
        at: '2026-07-15T16:30:00',
        status: 'reviewing',
        by: '박컨설',
        note: '검토 시작',
      },
    ],
  },
  {
    id: 'app-3',
    code: 'APP-20260714-001',
    type: 'partnership',
    applicantName: '대성물산',
    applicantContact: 'biz@**.com',
    submittedAt: '2026-07-14T11:40:00',
    status: 'approved',
    fields: [
      { label: '제휴 유형', value: '유통 파트너' },
      { label: '회사 규모', value: '중견기업' },
    ],
    adminNote: '제휴 조건 협의 완료 — 계약 단계로 이관 예정',
    history: [
      {
        id: 'app-3-h1',
        at: '2026-07-14T11:40:00',
        status: 'received',
        by: '시스템',
        note: '웹 폼으로 접수',
      },
      {
        id: 'app-3-h2',
        at: '2026-07-14T13:00:00',
        status: 'reviewing',
        by: '김상담',
        note: '적격 검토',
      },
      {
        id: 'app-3-h3',
        at: '2026-07-15T10:00:00',
        status: 'approved',
        by: '김상담',
        note: '제휴 승인',
      },
    ],
  },
  {
    id: 'app-4',
    code: 'APP-20260713-003',
    type: 'trial',
    applicantName: '정우성',
    applicantContact: 'woo@**.net',
    submittedAt: '2026-07-13T18:22:00',
    status: 'rejected',
    fields: [
      { label: '체험 제품', value: '프리미엄 플랜' },
      { label: '사용 목적', value: '개인 테스트' },
    ],
    adminNote: '무료 체험 대상(기업 고객) 아님 — 반려',
    history: [
      {
        id: 'app-4-h1',
        at: '2026-07-13T18:22:00',
        status: 'received',
        by: '시스템',
        note: '웹 폼으로 접수',
      },
      {
        id: 'app-4-h2',
        at: '2026-07-14T09:10:00',
        status: 'rejected',
        by: '이응대',
        note: '대상 조건 불충족으로 반려',
      },
    ],
  },
];

let seq = APPLICATION_SEED.length;

export const applicationAdapter = createCrudAdapter<Application, ApplicationInput>({
  scope: 'reservation-applications',
  seed: APPLICATION_SEED,
  build: (input) => {
    seq += 1;
    return { id: `app-${String(seq)}`, code: `APP-NEW-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortApplications,
});
