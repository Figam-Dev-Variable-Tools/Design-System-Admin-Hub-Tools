// 상담 이력 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 CRM 상담이력 관례: 상담유형/채널·주제·내용·상담결과·후속조치(필요/완료). 감사 성격이라 읽기 위주로
// 다룬다(목록·상세). 생성/수정/삭제 UI 없이 이력을 조회한다.
import type { StatusTone } from '../../../shared/ui';
import type { AccountRef } from '../_shared/account-reference';

type ConsultType = 'phone' | 'visit' | 'email' | 'video' | 'meeting';
/** 상담 결과 — 긍정/보통/부정 */
type ConsultOutcome = 'positive' | 'neutral' | 'negative';

/**
 * 이 상담이 가리키는 다른 모듈 — '' 이면 연결이 없다.
 *
 * 예전에는 `related: string` 하나였고 주석은 그것을 '링크' 라고 불렀다. 실제로 저장된 값은
 * `'견적 Q-20260710-001'` 같은 **사람이 읽는 문장**이라 눌리지 않았다 — 상담에서 그 견적으로
 * 가려면 견적 목록으로 나가 번호를 다시 검색해야 했다. 종류와 id 를 나눠 진짜 링크로 만든다.
 */
export type ConsultRelatedKind = 'quote' | 'inquiry' | 'contract' | '';

export interface Consultation extends AccountRef {
  readonly id: string;
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
  /** 관련 모듈 종류 — '' 이면 relatedId 도 '' 다(둘은 함께 채워지거나 함께 빈다) */
  readonly relatedKind: ConsultRelatedKind;
  /** 관련 레코드의 id — 견적 'qt-1' · 문의 'inq-3' · 계약 'ct-2' */
  readonly relatedId: string;
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

interface RelatedMeta {
  readonly label: string;
  /** 그 모듈의 레코드 한 건으로 가는 경로 접두 */
  readonly path: string;
}

/**
 * 관련 모듈별 라벨과 경로.
 *
 * Record 로 든다 — `OPTIONS.find(...) ?? OPTIONS[0]` 류의 폴백은 noUncheckedIndexedAccess 아래에서
 * **모르는 값을 첫 항목으로 둔갑시킨다**(문의를 견적 링크로 보낸다). 키가 유니온이라 종류가
 * 늘면 여기서 컴파일이 깨진다.
 *
 * [계약만 /:id/edit 인 이유] 견적·문의는 읽기 전용 상세가 있지만 계약은 아직 없다 —
 * 지금 계약을 볼 수 있는 유일한 화면이 수정 폼이다. 계약 상세가 생기면 이 한 줄만 바꾼다.
 */
const RELATED_META: Record<Exclude<ConsultRelatedKind, ''>, RelatedMeta> = {
  quote: { label: '견적', path: '/sales/quotes' },
  inquiry: { label: '문의', path: '/sales/inquiries' },
  contract: { label: '계약', path: '/sales/contracts' },
};

/** 상담의 '관련' 링크 — 연결이 없거나 id 가 비면 null(화면이 대체 문구를 쓴다) */
export interface ConsultationRelatedLink {
  /** 무엇으로 가는지 — 링크 글자 그대로 쓴다 */
  readonly label: string;
  readonly to: string;
}

/** 연결이 없을 때 화면이 쓰는 문구 — '—' 한 글자로는 '없다' 와 '못 불러왔다' 가 구분되지 않는다 */
export const CONSULT_NO_RELATION = '연결된 견적·문의·계약이 없습니다.';

export function consultationRelatedLink(
  consultation: Pick<Consultation, 'relatedKind' | 'relatedId'>,
): ConsultationRelatedLink | null {
  const { relatedKind, relatedId } = consultation;
  // 종류만 있고 id 가 없는(또는 그 반대인) 반쪽 연결은 링크로 만들지 않는다 — 404 로 가는 링크다.
  if (relatedKind === '' || relatedId === '') return null;
  const meta = RELATED_META[relatedKind];
  // 계약만 상세가 없어 수정 폼으로 간다 (RELATED_META 주석 참조).
  const to =
    relatedKind === 'contract' ? `${meta.path}/${relatedId}/edit` : `${meta.path}/${relatedId}`;
  return { label: `${meta.label} 보기`, to };
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
