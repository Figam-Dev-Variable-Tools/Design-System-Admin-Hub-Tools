// 상담 이력 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 CRM 상담이력 관례: 상담유형/채널·주제·내용·상담결과·후속조치(필요/완료). 감사 성격이라 읽기 위주로
// 다룬다(목록·상세). 생성/수정/삭제 UI 없이 이력을 조회한다.
import type { StatusTone } from '../../../shared/ui';

type ConsultType = 'phone' | 'visit' | 'email' | 'video' | 'meeting';
/** 상담 결과 — 긍정/보통/부정 */
type ConsultOutcome = 'positive' | 'neutral' | 'negative';

export interface Consultation {
  readonly id: string;
  readonly accountName: string;
  /** 상담 대상자(거래처 측) */
  readonly contactPerson: string;
  readonly consultType: ConsultType;
  readonly topic: string;
  /** 상담 일시 ISO */
  readonly consultedAt: string;
  readonly consultant: string;
  readonly content: string;
  readonly outcome: ConsultOutcome;
  /** 후속조치 내용 — 없으면 '' */
  readonly followUpAction: string;
  /** 후속 예정일 'YYYY-MM-DD' — 없으면 '' */
  readonly followUpAt: string;
  readonly followUpDone: boolean;
  /** 관련(기회/문의/계약) 링크 요약 */
  readonly related: string;
}

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const CONSULT_TYPE_OPTIONS: readonly Option<ConsultType>[] = [
  { id: 'phone', label: '전화상담' },
  { id: 'visit', label: '방문상담' },
  { id: 'email', label: '이메일' },
  { id: 'video', label: '화상상담' },
  { id: 'meeting', label: '대면미팅' },
];

const CONSULT_OUTCOME_OPTIONS: readonly Option<ConsultOutcome>[] = [
  { id: 'positive', label: '긍정' },
  { id: 'neutral', label: '보통' },
  { id: 'negative', label: '부정' },
];

const label = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

export const consultTypeLabel = (v: ConsultType): string => label(CONSULT_TYPE_OPTIONS, v);
export const consultOutcomeLabel = (v: ConsultOutcome): string => label(CONSULT_OUTCOME_OPTIONS, v);

export function consultOutcomeTone(outcome: ConsultOutcome): StatusTone {
  if (outcome === 'positive') return 'success';
  if (outcome === 'negative') return 'danger';
  return 'neutral';
}

/** 후속조치 대기 여부 — 후속조치가 있고 아직 완료되지 않았다 */
export function hasPendingFollowUp(consultation: Consultation): boolean {
  return consultation.followUpAction.trim() !== '' && !consultation.followUpDone;
}

export const CONSULT_FILTER_ALL = 'all';
export type ConsultTypeFilter = typeof CONSULT_FILTER_ALL | ConsultType;

export function filterConsultations(
  list: readonly Consultation[],
  type: ConsultTypeFilter,
  pendingOnly: boolean,
): readonly Consultation[] {
  return list.filter(
    (consultation) =>
      (type === CONSULT_FILTER_ALL || consultation.consultType === type) &&
      (!pendingOnly || hasPendingFollowUp(consultation)),
  );
}

export function searchConsultations(
  list: readonly Consultation[],
  keyword: string,
): readonly Consultation[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (consultation) =>
      consultation.accountName.toLowerCase().includes(needle) ||
      consultation.topic.toLowerCase().includes(needle) ||
      consultation.consultant.toLowerCase().includes(needle),
  );
}

/** 상담일시 내림차순(최근이 위). 같은 시각은 id 안정 정렬. 테스트가 직접 부른다. */
export function sortConsultations(list: readonly Consultation[]): readonly Consultation[] {
  return [...list].sort((a, b) => {
    if (a.consultedAt !== b.consultedAt) return a.consultedAt < b.consultedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}
