// 프로젝트 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 실제 연동 시 // TODO(backend)
// 로 어댑터 본문만 교체하고 화면은 그대로 둔다.
//
// [거래처 참조] 시드의 accountId 는 accounts/data-source 의 실제 거래처 id(acc-1~3)를 가리킨다 —
// 이름만 같고 연결이 없는 행이 하나라도 있으면 거래처 상세의 역방향 조회가 조용히 비어 보인다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortProjects } from './types';
import type { Project, ProjectInput } from './types';

const PROJECT_SEED: readonly Project[] = [
  {
    id: 'prj-1',
    name: '한빛소프트 ERP 구축',
    accountId: 'acc-1',
    accountName: '(주)한빛소프트웨어',
    stage: 'negotiation',
    probability: 70,
    expectedRevenue: 42000000,
    startAt: '2026-07-01',
    endAt: '2026-10-31',
    ownerName: '이영업',
    progress: 40,
    milestones: [
      { id: 'ms-1', name: '요구사항 확정', dueDate: '2026-07-20', done: true },
      { id: 'ms-2', name: '계약 체결', dueDate: '2026-08-10', done: false },
      { id: 'ms-3', name: '1차 오픈', dueDate: '2026-10-01', done: false },
    ],
    deliverables: ['요구사항 정의서', '구축 제안서'],
    lostReason: '',
    note: '경쟁사 대비 가격 우위. 협상 마무리 단계.',
  },
  {
    id: 'prj-2',
    name: '대성물산 유지보수 전환',
    accountId: 'acc-2',
    accountName: '대성물산 주식회사',
    stage: 'proposal',
    probability: 50,
    expectedRevenue: 18000000,
    startAt: '2026-06-15',
    endAt: '2026-09-15',
    ownerName: '박계약',
    progress: 25,
    milestones: [{ id: 'ms-4', name: '제안서 제출', dueDate: '2026-07-25', done: false }],
    deliverables: [],
    lostReason: '',
    note: '',
  },
  {
    id: 'prj-3',
    name: '미래테크 수출부품 설계',
    accountId: 'acc-3',
    accountName: '미래테크놀로지',
    stage: 'lost',
    probability: 0,
    expectedRevenue: 12000000,
    startAt: '2026-05-01',
    endAt: '2026-06-30',
    ownerName: '이수주',
    progress: 100,
    milestones: [],
    deliverables: [],
    lostReason: '경쟁사 대비 납기 조건 불리',
    note: '차기 발주 시 재접촉 예정.',
  },
];

let seq = PROJECT_SEED.length;

// TODO(backend): GET/POST /api/sales/projects · GET/PUT/DELETE /api/sales/projects/:id
export const projectAdapter = createCrudAdapter<Project, ProjectInput>({
  scope: 'sales-projects',
  seed: PROJECT_SEED,
  build: (input) => {
    seq += 1;
    return { id: `prj-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortProjects,
});
