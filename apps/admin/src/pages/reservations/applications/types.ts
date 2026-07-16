// 신청서 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// 국내 관례를 따른다: 커스텀 폼으로 접수된 신청(견적·상담·체험·제휴·채용)을 관리자가 처리한다.
// 신청은 고객 채널이 만들고(생성 UI 없음) 관리자는 상태 전이 + 메모로 처리한다(교환/반품 처리 선례).
// 상태 흐름: 접수 → 검토중 → 승인/반려, 승인 → 완료. 반려·완료는 종료. 처리 이력은 타임라인으로 본다.
import { directionParticle } from '../../../shared/format';
import type { StatusTone, TimelineEvent } from '../../../shared/ui';

type ApplicationType = 'quote' | 'consulting' | 'trial' | 'partnership' | 'recruit';
export type ApplicationStatus = 'received' | 'reviewing' | 'approved' | 'rejected' | 'completed';

const APPLICATION_STATUSES = [
  'received',
  'reviewing',
  'approved',
  'rejected',
  'completed',
] as const;

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** 신청 폼의 한 항목 — 신청 유형마다 다른 커스텀 필드를 라벨/값 쌍으로 보존한다 */
interface ApplicationField {
  readonly label: string;
  readonly value: string;
}

/** 처리 이력 한 칸 — 상태 변경을 시간순으로 남긴다(타임라인 원천) */
export interface ApplicationEvent {
  readonly id: string;
  readonly at: string;
  readonly status: ApplicationStatus;
  readonly by: string;
  readonly note: string;
}

export interface Application {
  readonly id: string;
  /** 신청번호 — 'APP-YYYYMMDD-NNN' */
  readonly code: string;
  readonly type: ApplicationType;
  readonly applicantName: string;
  /** 연락처/이메일 — 마스킹 표기 */
  readonly applicantContact: string;
  /** 접수 일시 ISO */
  readonly submittedAt: string;
  readonly status: ApplicationStatus;
  readonly fields: readonly ApplicationField[];
  /** 관리자 처리 메모 */
  readonly adminNote: string;
  readonly history: readonly ApplicationEvent[];
}

export type ApplicationInput = Omit<Application, 'id' | 'code'>;

export const APPLICATION_NOTE_MAX = 500;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

const APPLICATION_TYPE_OPTIONS: readonly Option<ApplicationType>[] = [
  { id: 'quote', label: '견적 신청' },
  { id: 'consulting', label: '상담 신청' },
  { id: 'trial', label: '체험 신청' },
  { id: 'partnership', label: '제휴 신청' },
  { id: 'recruit', label: '채용 지원' },
];

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  received: { label: '접수', tone: 'neutral' },
  reviewing: { label: '검토중', tone: 'info' },
  approved: { label: '승인', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  completed: { label: '완료', tone: 'success' },
};

const label = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

export function applicationTypeLabel(type: ApplicationType): string {
  return label(APPLICATION_TYPE_OPTIONS, type);
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  return STATUS_META[status].label;
}

export function applicationStatusTone(status: ApplicationStatus): StatusTone {
  return STATUS_META[status].tone;
}

/** 상태 전이 규칙 — 접수↦검토/반려 · 검토↦승인/반려 · 승인↦완료 · 반려·완료 종료 */
const TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  received: ['reviewing', 'rejected'],
  reviewing: ['approved', 'rejected'],
  approved: ['completed'],
  rejected: [],
  completed: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** select 후보 — 현재 상태 + 허용 전이 */
export function statusChoices(from: ApplicationStatus): readonly ApplicationStatus[] {
  return [from, ...TRANSITIONS[from]];
}

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** 처리 이력 → 타임라인 이벤트(도메인 → 표시용 환산) */
export function toTimelineEvents(history: readonly ApplicationEvent[]): readonly TimelineEvent[] {
  return history.map((event) => ({
    id: event.id,
    at: event.at,
    badgeTone: applicationStatusTone(event.status),
    badgeLabel: applicationStatusLabel(event.status),
    author: event.by,
    text:
      event.note === ''
        ? `${applicationStatusLabel(event.status)}${directionParticle(applicationStatusLabel(event.status))} 변경`
        : event.note,
  }));
}

/** 항목 → 쓰기 입력(id·code 제외). 상세 처리 저장이 쓴다. */
export function toApplicationInput(application: Application): ApplicationInput {
  return {
    type: application.type,
    applicantName: application.applicantName,
    applicantContact: application.applicantContact,
    submittedAt: application.submittedAt,
    status: application.status,
    fields: application.fields,
    adminNote: application.adminNote,
    history: application.history,
  };
}

export const APPLICATION_FILTER_ALL = 'all';
export type ApplicationStatusFilter = typeof APPLICATION_FILTER_ALL | ApplicationStatus;

export function filterApplications(
  list: readonly Application[],
  status: ApplicationStatusFilter,
): readonly Application[] {
  if (status === APPLICATION_FILTER_ALL) return list;
  return list.filter((application) => application.status === status);
}

export function searchApplications(
  list: readonly Application[],
  keyword: string,
): readonly Application[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (application) =>
      application.code.toLowerCase().includes(needle) ||
      application.applicantName.toLowerCase().includes(needle) ||
      application.applicantContact.toLowerCase().includes(needle),
  );
}

/** 접수일시 내림차순(최근이 위). 같은 시각은 id 안정 정렬. */
export function sortApplications(list: readonly Application[]): readonly Application[] {
  return [...list].sort((a, b) => {
    if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}
