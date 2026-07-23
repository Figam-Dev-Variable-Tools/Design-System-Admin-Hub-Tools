// 프로젝트(영업 기회) 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 CRM 파이프라인 관례: 단계(리드→상담→제안→협상→수주/실주)·단계별 기본 확률·예상매출·가중예상매출·
// 기간·진척·마일스톤·산출물. 단계는 데이터(STAGES)로 들고 있어 순서·확률을 확장하기 쉽다.
import type { StatusTone } from '../../../shared/ui';
import type { AccountRef } from '../_shared/account-reference';

/** 파이프라인 단계 — 확장 가능하게 메타(순서·기본확률·정상흐름 여부)를 데이터로 둔다 */
export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Milestone {
  readonly id: string;
  readonly name: string;
  /** 목표일 'YYYY-MM-DD' */
  readonly dueDate: string;
  readonly done: boolean;
}

/**
 * 프로젝트(영업 기회).
 *
 * 거래처는 AccountRef 두 필드로 참조한다 — `accountId`(마스터를 가리키는 **정본**, '' 이면 미등록)
 * 와 `accountName`(파이프라인 목록이 쓰는 비정규화 표시 라벨). 두 값이 어긋나면 accountId 가
 * 이긴다. 근거는 ../_shared/account-reference 머리말.
 */
export interface Project extends AccountRef {
  readonly id: string;
  readonly name: string;
  readonly stage: PipelineStage;
  /** 수주 확률(%) 0~100 — 단계 기본값에서 조정 가능 */
  readonly probability: number;
  /** 예상매출(원) */
  readonly expectedRevenue: number;
  readonly startAt: string;
  readonly endAt: string;
  readonly ownerName: string;
  /** 진척률(%) 0~100 */
  readonly progress: number;
  readonly milestones: readonly Milestone[];
  /** 산출물 목록 */
  readonly deliverables: readonly string[];
  /** 실주 사유 — stage='lost' 일 때 */
  readonly lostReason: string;
  readonly note: string;
  /**
   * 이 프로젝트를 낳은 계약 id — '' 면 계약 없이 생긴 프로젝트(옛 데이터).
   *
   * [문서에는 있고 코드에는 없던 마지막 화살표] `docs/flow/mmd/03-sales-pipeline.mmd` 는
   * 문의 → 견적 → 계약 → 프로젝트를 그려 두었지만, 프로젝트에는 계약을 가리키는 필드가 **한 칸도
   * 없었다.** 그래서 체결된 계약은 그 다음이 없는 종점이었고, 프로젝트는 어디서 왔는지 앱이
   * 답하지 못했다. 계약이 견적을 가리키는 방식(../contracts/types.ts 의 quoteId)과 같은 모양이다.
   */
  readonly contractId: string;
  /** 원 계약명(승계 스냅숏 — 표시·역링크용). 계약명을 나중에 고쳐도 이 값은 움직이지 않는다 */
  readonly contractTitle: string;
}

export type ProjectInput = Omit<Project, 'id'>;

export const PROJECT_NAME_MAX = 80;
export const PROJECT_MAX_MILESTONES = 12;

interface StageMeta {
  readonly id: PipelineStage;
  readonly label: string;
  /** 단계 기본 확률(%) */
  readonly probability: number;
  /** 정상 진행 흐름에 속하는 단계인지(실주는 흐름 밖) */
  readonly inFlow: boolean;
  readonly tone: StatusTone;
}

const LEAD_META: StageMeta = {
  id: 'lead',
  label: '리드',
  probability: 10,
  inFlow: true,
  tone: 'neutral',
};

export const STAGES: readonly StageMeta[] = [
  LEAD_META,
  { id: 'qualified', label: '상담', probability: 30, inFlow: true, tone: 'info' },
  { id: 'proposal', label: '제안', probability: 50, inFlow: true, tone: 'info' },
  { id: 'negotiation', label: '협상', probability: 70, inFlow: true, tone: 'warning' },
  { id: 'won', label: '수주', probability: 100, inFlow: true, tone: 'success' },
  { id: 'lost', label: '실주', probability: 0, inFlow: false, tone: 'danger' },
];

/** 정상 진행 흐름(실주 제외) — 스텝퍼가 쓴다 */
export const PIPELINE_FLOW: readonly PipelineStage[] = STAGES.filter((stage) => stage.inFlow).map(
  (stage) => stage.id,
);

function stageMeta(stage: PipelineStage): StageMeta {
  return STAGES.find((meta) => meta.id === stage) ?? LEAD_META;
}

export function stageLabel(stage: PipelineStage): string {
  return stageMeta(stage).label;
}

export function stageTone(stage: PipelineStage): StatusTone {
  return stageMeta(stage).tone;
}

/** 단계 기본 확률 — 단계 변경 시 확률 자동 채움에 쓴다 */
export function defaultProbability(stage: PipelineStage): number {
  return stageMeta(stage).probability;
}

/** 가중 예상매출 = 예상매출 × 확률/100 (반올림) */
export function weightedRevenue(project: Pick<Project, 'expectedRevenue' | 'probability'>): number {
  return Math.round((project.expectedRevenue * project.probability) / 100);
}

/** 마일스톤 진척 — 완료 수 / 전체 수(%) */
export function milestoneProgress(milestones: readonly Milestone[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((milestone) => milestone.done).length;
  return Math.round((done / milestones.length) * 100);
}

export const PROJECT_FILTER_ALL = 'all';
export type StageFilter = typeof PROJECT_FILTER_ALL | PipelineStage;

export function filterProjects(list: readonly Project[], filter: StageFilter): readonly Project[] {
  if (filter === PROJECT_FILTER_ALL) return list;
  return list.filter((project) => project.stage === filter);
}

export function searchProjects(list: readonly Project[], keyword: string): readonly Project[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (project) =>
      project.name.toLowerCase().includes(needle) ||
      project.accountName.toLowerCase().includes(needle),
  );
}

/** 예상 마감(종료)일 오름차순(임박이 위). 같은 날짜는 id 안정 정렬. 테스트가 직접 부른다. */
export function sortProjects(list: readonly Project[]): readonly Project[] {
  return [...list].sort((a, b) => {
    if (a.endAt !== b.endAt) return a.endAt < b.endAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function toProjectInput(project: Project): ProjectInput {
  return {
    name: project.name,
    accountId: project.accountId,
    accountName: project.accountName,
    stage: project.stage,
    probability: project.probability,
    expectedRevenue: project.expectedRevenue,
    startAt: project.startAt,
    endAt: project.endAt,
    ownerName: project.ownerName,
    progress: project.progress,
    milestones: project.milestones,
    deliverables: project.deliverables,
    lostReason: project.lostReason,
    note: project.note,
    contractId: project.contractId,
    contractTitle: project.contractTitle,
  };
}

/* ── 계약 → 프로젝트 ──────────────────────────────────────────────────────── */

export const PROJECT_DRAFT_NOT_CONCLUDED =
  '체결이 끝난 계약(진행중 · 서명완료)만 프로젝트로 넘길 수 있어요.';
export const PROJECT_DRAFT_DONE = '이미 프로젝트가 만들어진 계약이에요.';

/**
 * 지금 이 계약으로 프로젝트를 만들 수 없는 이유 — 만들 수 있으면 null.
 *
 * 견적 → 계약과 **같은 모양**이다(../contracts/types.ts 의 contractDraftBlock): 버튼의 disabled
 * 조건과 생성 경로의 거절이 이 한 술어를 읽고, 거절은 boolean 이 아니라 사유 문자열이다.
 *
 * '무엇이 계약 완료인가' 의 판정은 계약 도메인이 갖는다(isConcludedContract) — 프로젝트가 계약
 * 상태 유니온을 자기 방식으로 다시 읽으면 두 화면이 다른 '완료' 를 갖게 된다.
 *
 * [이미 프로젝트가 있으면 먼저 막는다] 순서가 중요하다. 계약이 만료로 넘어간 뒤에도 '이미 있다'
 * 는 사실이 '체결이 안 끝났다' 보다 정확한 설명이다 — 운영자가 찾아야 할 것은 그 프로젝트다.
 */
export function projectDraftBlock(concluded: boolean, existingProjectId: string): string | null {
  if (existingProjectId !== '') return PROJECT_DRAFT_DONE;
  if (!concluded) return PROJECT_DRAFT_NOT_CONCLUDED;
  return null;
}

/**
 * 계약 → 프로젝트 입력(순수) — 무엇이 계약에서 넘어오는지의 단일 정의.
 *
 * 단계는 `won`(수주)에서 시작한다: 계약이 체결됐다는 것은 파이프라인의 앞 칸(리드·상담·제안·협상)이
 * 이미 끝났다는 뜻이다. 여기서 'lead' 로 시작하면 방금 도장을 찍은 거래가 확률 10% 로 집계되어
 * 가중예상매출이 거짓이 된다.
 *
 * 예상매출은 계약금액의 **스냅숏**이다(파생 저장이 아니라 승계값 — 계약을 나중에 고쳐도 이미
 * 시작한 프로젝트의 목표액이 사후에 움직이지 않는다. 계약이 견적 합계를 스냅숏으로 받는 것과 같다).
 * 진척·마일스톤·산출물은 승계 대상이 아니다 — 계약은 그 정보를 갖지 않는다.
 */
export function buildProjectFromContract(
  contract: ProjectSourceContract,
  concludedOn: string,
): ProjectInput {
  return {
    name: contract.title,
    accountId: contract.accountId,
    accountName: contract.accountName,
    stage: 'won',
    probability: defaultProbability('won'),
    expectedRevenue: contract.amount,
    // 계약 기간이 곧 수행 기간의 출발값이다. 계약에 기간이 없으면(있을 수 없지만) 체결일로 연다.
    startAt: contract.startAt === '' ? concludedOn : contract.startAt,
    endAt: contract.endAt === '' ? concludedOn : contract.endAt,
    ownerName: contract.ownerName,
    progress: 0,
    milestones: [],
    deliverables: [],
    lostReason: '',
    note: '',
    contractId: contract.id,
    contractTitle: contract.title,
  };
}

/**
 * 프로젝트가 계약에서 받아 오는 값 — **계약의 전부가 아니라 필요한 칸만** 적는다.
 *
 * `Contract` 를 통째로 받으면 이 파일이 계약의 상태·서명·첨부·조항까지 알게 되고, 계약이 필드를
 * 하나 늘릴 때마다 프로젝트가 흔들린다. 완료 판정(isConcludedContract)이 계약 쪽에 남아 있는 것과
 * 같은 이유다 — 각자 자기 것만 안다.
 */
export interface ProjectSourceContract {
  readonly id: string;
  readonly title: string;
  readonly accountId: string;
  readonly accountName: string;
  readonly amount: number;
  readonly startAt: string;
  readonly endAt: string;
  readonly ownerName: string;
}
