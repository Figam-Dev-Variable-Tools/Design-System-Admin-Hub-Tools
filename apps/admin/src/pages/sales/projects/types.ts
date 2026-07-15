// 프로젝트(영업 기회) 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 국내 CRM 파이프라인 관례: 단계(리드→상담→제안→협상→수주/실주)·단계별 기본 확률·예상매출·가중예상매출·
// 기간·진척·마일스톤·산출물. 단계는 데이터(STAGES)로 들고 있어 순서·확률을 확장하기 쉽다.
import type { StatusTone } from '../../../shared/ui';

/** 파이프라인 단계 — 확장 가능하게 메타(순서·기본확률·정상흐름 여부)를 데이터로 둔다 */
export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Milestone {
  readonly id: string;
  readonly name: string;
  /** 목표일 'YYYY-MM-DD' */
  readonly dueDate: string;
  readonly done: boolean;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly accountName: string;
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
  };
}
