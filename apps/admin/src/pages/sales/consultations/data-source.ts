// 상담 이력 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 상담 이력은 읽기 위주라 화면은
// fetchAll/fetchOne 만 쓴다(생성/수정/삭제 UI 없음 — 감사 이력). build/patch 는 프레임워크 계약상 둔다.
//
// [거래처 참조] 시드의 accountId 는 accounts/data-source 의 실제 거래처 id(acc-1~3)를 가리킨다 —
// 이름만 같고 연결이 없는 행이 하나라도 있으면 거래처 상세의 역방향 조회가 조용히 비어 보인다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortConsultations } from './types';
import type { Consultation } from './types';

type ConsultationInput = Omit<Consultation, 'id'>;

const CONSULTATION_SEED: readonly Consultation[] = [
  {
    id: 'cs-1',
    accountId: 'acc-1',
    accountName: '(주)한빛소프트웨어',
    contactPerson: '이영업 팀장',
    consultType: 'meeting',
    topic: 'ERP 구축 범위 협의',
    consultedAt: '2026-07-14T15:00:00',
    consultant: '이영업',
    content: '구축 범위·일정·라이선스 규모를 협의함. 100석 기준으로 견적 요청받음.',
    outcome: 'positive',
    followUpAction: '견적서 발송 및 구축 일정표 공유',
    followUpAt: '2026-07-18',
    followUpDone: false,
    relatedKind: 'quote',
    relatedId: 'qt-1',
  },
  {
    id: 'cs-2',
    accountId: 'acc-2',
    accountName: '대성물산 주식회사',
    contactPerson: '최과장',
    consultType: 'phone',
    topic: '유지보수 계약 갱신 조건 문의',
    consultedAt: '2026-07-13T11:20:00',
    consultant: '박계약',
    content: '내년도 유지보수 단가 인상 여부와 갱신 조건을 안내함.',
    outcome: 'neutral',
    followUpAction: '갱신 견적 재산정 후 회신',
    followUpAt: '2026-07-20',
    followUpDone: false,
    relatedKind: 'contract',
    relatedId: 'ct-2',
  },
  {
    id: 'cs-3',
    accountId: 'acc-3',
    accountName: '미래테크놀로지',
    contactPerson: '오미래 대표',
    consultType: 'visit',
    topic: '납품 지연 클레임 대면 사과',
    consultedAt: '2026-07-11T13:00:00',
    consultant: '박계약',
    content: '납기 지연 경위를 설명하고 보상안(차기 발주 할인)을 제시함. 고객 수용.',
    outcome: 'positive',
    followUpAction: '',
    followUpAt: '',
    followUpDone: true,
    relatedKind: 'inquiry',
    relatedId: 'inq-3',
  },
];

let seq = CONSULTATION_SEED.length;

// TODO(backend): GET /api/sales/consultations · GET /api/sales/consultations/:id (읽기 전용)
export const consultationAdapter = createCrudAdapter<Consultation, ConsultationInput>({
  scope: 'sales-consultations',
  seed: CONSULTATION_SEED,
  build: (input) => {
    seq += 1;
    return { id: `cs-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortConsultations,
});
