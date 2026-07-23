// 프로젝트 데이터 소스 · 저장소
//
// [백엔드 연동 지점] 실제 연동 시 // TODO(backend) 엔드포인트로 저장소 함수 본문만 교체하고 화면은
// 그대로 둔다.
//
// [왜 createCrudAdapter 가 아니라 저장소인가] 프로젝트는 이제 계약을 가리킨다(Project.contractId).
// 계약 화면의 '프로젝트 만들기' 버튼은 **그리는 순간** '이 계약에 이미 프로젝트가 있는가' 를 알아야
// 하는데, createCrudAdapter 는 목록을 클로저에 가둬 비동기 fetchAll 로만 내준다. 저장소를 노출하고
// 그 위에 createStoreAdapter 를 얹으면 같은 목록을 동기로도 읽을 수 있다(../contracts/data-source
// 가 견적 → 계약에서 먼저 밟은 길이다).
//
// [거래처 참조] 시드의 accountId 는 accounts/data-source 의 실제 거래처 id(acc-1~3)를 가리킨다 —
// 이름만 같고 연결이 없는 행이 하나라도 있으면 거래처 상세의 역방향 조회가 조용히 비어 보인다.
import { createStoreAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { buildProjectFromContract, sortProjects } from './types';
import type { Project, ProjectInput, ProjectSourceContract } from './types';

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
    // [옛 데이터] 이 규칙(프로젝트는 계약에서만 생긴다)이 생기기 전에 만들어진 프로젝트라
    // 계약 참조가 없다. 조용히 정상인 척하지 않는다 — 상세가 그 사실을 말한다(ProjectFormPage).
    contractId: '',
    contractTitle: '',
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
    // [옛 데이터] 이 규칙(프로젝트는 계약에서만 생긴다)이 생기기 전에 만들어진 프로젝트라
    // 계약 참조가 없다. 조용히 정상인 척하지 않는다 — 상세가 그 사실을 말한다(ProjectFormPage).
    contractId: '',
    contractTitle: '',
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
    // [옛 데이터] 이 규칙(프로젝트는 계약에서만 생긴다)이 생기기 전에 만들어진 프로젝트라
    // 계약 참조가 없다. 조용히 정상인 척하지 않는다 — 상세가 그 사실을 말한다(ProjectFormPage).
    contractId: '',
    contractTitle: '',
  },
];

let projects = sortProjects(PROJECT_SEED);
let seq = PROJECT_SEED.length;

/* ── 프로젝트 저장소 (어댑터가 위임한다) ─────────────────────────────────── */

function listProjects(): readonly Project[] {
  return sortProjects(projects);
}

function getProject(id: string): Project {
  const found = projects.find((project) => project.id === id);
  // 404 와 500 은 복구 수단이 다르다 — '목록으로' vs '다시 시도' (EXC-12).
  if (found === undefined) throw new HttpError(HTTP_STATUS.notFound, '프로젝트를 찾을 수 없어요.');
  return found;
}

function addProject(input: ProjectInput): void {
  seq += 1;
  projects = sortProjects([...projects, { id: `prj-${String(seq)}`, ...input }]);
}

function updateProject(id: string, input: ProjectInput): void {
  // [EXC-04] 없는 id 를 조용히 지나치고 성공을 반환하면 '저장했습니다' 유령 토스트가 뜬다.
  if (!projects.some((project) => project.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 프로젝트예요.');
  }
  projects = sortProjects(
    projects.map((project) => (project.id === id ? { ...project, ...input, id } : project)),
  );
}

function removeProject(id: string): void {
  if (!projects.some((project) => project.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 프로젝트예요.');
  }
  projects = projects.filter((project) => project.id !== id);
}

/**
 * 계약 → 프로젝트 역방향 조회 — 중복 생성을 막는 판정의 정본. 없으면 ''.
 *
 * 빈 문자열이 '없음' 인 것은 이 도메인의 규약이다(../contracts/data-source 의
 * findContractIdByQuote 와 같은 결) — `undefined` 를 섞으면 호출부마다 두 가지 없음을 다루게 된다.
 *
 * [막다른 골목이 아니다] 프로젝트를 지우면 이 조회가 다시 '' 를 주고 계약의 '프로젝트 만들기'
 * 버튼이 되살아난다. 수동 등록을 막은 뒤에도 잘못 만든 프로젝트에서 빠져나올 길이 남는다.
 */
export function findProjectIdByContract(contractId: string): string {
  if (contractId === '') return '';
  return projects.find((project) => project.contractId === contractId)?.id ?? '';
}

/**
 * 계약 → 프로젝트 생성. 프로젝트를 만드는 유일한 문이다(수동 등록은 없다).
 *
 * **계약 id 가 멱등키다.** 이미 프로젝트가 있으면 새로 만들지 않고 그 프로젝트를 돌려준다 —
 * 호출부의 projectDraftBlock 이 첫 번째 방어선이고 여기가 두 번째다. 버튼이 잠깐 살아 있다가
 * 죽는 사이에 두 번 누른 사람이 두 번째 프로젝트를 만들지 못하게 한다(견적 → 계약과 같은 함정,
 * ../quotes/QuoteDetailPage 의 주석이 그 사고를 적어 두었다).
 *
 * 되돌려 쓰기는 없다 — 계약에는 '프로젝트가 생겼다' 를 적을 칸이 없고, 만들지도 않는다.
 * 그 사실의 정본은 프로젝트의 `contractId` 하나이며, 두 곳에 적으면 언젠가 갈라진다(파생값 금지).
 */
// TODO(backend): POST /api/sales/contracts/:id/project — 이미 있으면 기존 프로젝트를 돌려준다.
export function createProjectFromContract(
  contract: ProjectSourceContract,
  concludedOn: string,
): { readonly project: Project; readonly created: boolean } {
  const existingId = findProjectIdByContract(contract.id);
  const existing = projects.find((project) => project.id === existingId);
  if (existing !== undefined) return { project: existing, created: false };

  seq += 1;
  const project: Project = {
    id: `prj-${String(seq)}`,
    ...buildProjectFromContract(contract, concludedOn),
  };
  projects = sortProjects([...projects, project]);
  return { project, created: true };
}

// TODO(backend): GET/POST /api/sales/projects · GET/PUT/DELETE /api/sales/projects/:id
export const projectAdapter = createStoreAdapter<Project, ProjectInput>({
  scope: 'sales-projects',
  list: listProjects,
  getOne: getProject,
  add: addProject,
  update: updateProject,
  remove: removeProject,
});
