// 문의 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 국내 CRM 문의관리 관례: 유형·채널·우선순위·담당배정·처리상태(접수→배정→처리중→완료→종결) +
// 대화 타임라인(접수·내부메모·고객답변·상태변경). 문의는 고객이 만들고 관리자는 처리·답변한다.
import type { StatusTone } from '../../../shared/ui';

type InquiryType = 'quote' | 'product' | 'support' | 'partnership' | 'claim' | 'etc';
type InquiryChannel = 'web' | 'phone' | 'email' | 'visit';
type InquiryPriority = 'urgent' | 'high' | 'normal' | 'low';
/** 처리상태 — 접수→배정→처리중→(보류)→견적 발행→완료→종결 */
export type InquiryStatus =
  'received' | 'assigned' | 'in_progress' | 'hold' | 'quote_issued' | 'answered' | 'closed';

/** 타임라인 이벤트 종류 — 접수/내부메모/고객답변/상태변경 (append-only) */
export type InquiryEventKind = 'received' | 'note' | 'reply' | 'status';

export interface InquiryEvent {
  readonly id: string;
  /** 발생 시각 ISO */
  readonly at: string;
  readonly author: string;
  readonly kind: InquiryEventKind;
  readonly text: string;
}

export interface Inquiry {
  readonly id: string;
  readonly inquiryNo: string;
  readonly title: string;
  readonly type: InquiryType;
  readonly channel: InquiryChannel;
  readonly customerName: string;
  readonly company: string;
  readonly contact: string;
  /** 담당자 — 미배정이면 '' */
  readonly assignee: string;
  readonly priority: InquiryPriority;
  readonly status: InquiryStatus;
  /** 접수 일시 ISO */
  readonly receivedAt: string;
  readonly body: string;
  /** 이 문의로 발행된 견적 id — '' 면 미발행. 중복 발행을 막는 키이자 견적으로 가는 링크다 */
  readonly quoteId: string;
  readonly timeline: readonly InquiryEvent[];
}

export type InquiryInput = Omit<Inquiry, 'id'>;

/** 이미 견적이 발행된 문의인가 — 중복 발행 방지·역링크 판정의 단일 정의 */
export function hasIssuedQuote(inquiry: Pick<Inquiry, 'quoteId'>): boolean {
  return inquiry.quoteId !== '';
}

/** 견적 발행을 요청하는 전이인가 — 상태값 리터럴을 화면마다 흩뿌리지 않는다 */
export function requestsQuoteIssue(status: InquiryStatus): boolean {
  return status === 'quote_issued';
}

export const INQUIRY_REPLY_MAX = 1000;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const INQUIRY_TYPE_OPTIONS: readonly Option<InquiryType>[] = [
  { id: 'quote', label: '견적요청' },
  { id: 'product', label: '제품문의' },
  { id: 'support', label: '기술지원' },
  { id: 'partnership', label: '제휴' },
  { id: 'claim', label: '불만/클레임' },
  { id: 'etc', label: '기타' },
];

export const INQUIRY_CHANNEL_OPTIONS: readonly Option<InquiryChannel>[] = [
  { id: 'web', label: '웹' },
  { id: 'phone', label: '전화' },
  { id: 'email', label: '이메일' },
  { id: 'visit', label: '방문' },
];

const INQUIRY_PRIORITY_OPTIONS: readonly Option<InquiryPriority>[] = [
  { id: 'urgent', label: '긴급' },
  { id: 'high', label: '높음' },
  { id: 'normal', label: '보통' },
  { id: 'low', label: '낮음' },
];

export const INQUIRY_STATUS_OPTIONS: readonly Option<InquiryStatus>[] = [
  { id: 'received', label: '접수' },
  { id: 'assigned', label: '배정' },
  { id: 'in_progress', label: '처리중' },
  { id: 'hold', label: '보류' },
  { id: 'quote_issued', label: '견적 발행' },
  { id: 'answered', label: '완료' },
  { id: 'closed', label: '종결' },
];

const label = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

export const inquiryTypeLabel = (v: InquiryType): string => label(INQUIRY_TYPE_OPTIONS, v);
export const inquiryChannelLabel = (v: InquiryChannel): string => label(INQUIRY_CHANNEL_OPTIONS, v);
export const inquiryPriorityLabel = (v: InquiryPriority): string =>
  label(INQUIRY_PRIORITY_OPTIONS, v);
export const inquiryStatusLabel = (v: InquiryStatus): string => label(INQUIRY_STATUS_OPTIONS, v);

const STATUS_TONE: Record<InquiryStatus, StatusTone> = {
  received: 'neutral',
  assigned: 'info',
  in_progress: 'info',
  hold: 'warning',
  // 견적 발행은 산출물이 나온 진행 단계다 — 종료(완료/종결)와 색으로 구분한다.
  quote_issued: 'info',
  answered: 'success',
  closed: 'neutral',
};

export function inquiryStatusTone(status: InquiryStatus): StatusTone {
  return STATUS_TONE[status];
}

export function inquiryPriorityTone(priority: InquiryPriority): StatusTone {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'neutral';
  return 'info';
}

const EVENT_LABEL: Record<InquiryEventKind, string> = {
  received: '접수',
  note: '내부메모',
  reply: '고객답변',
  status: '상태변경',
};

export function inquiryEventLabel(kind: InquiryEventKind): string {
  return EVENT_LABEL[kind];
}

/** 타입가드 — select 값(문자열)을 InquiryStatus 로 좁힌다(as 캐스팅 대신) */
const STATUS_VALUES = [
  'received',
  'assigned',
  'in_progress',
  'hold',
  'quote_issued',
  'answered',
  'closed',
] as const;

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === 'string' && (STATUS_VALUES as readonly string[]).includes(value);
}

export const INQUIRY_FILTER_ALL = 'all';
export type InquiryTypeFilter = typeof INQUIRY_FILTER_ALL | InquiryType;
export type InquiryChannelFilter = typeof INQUIRY_FILTER_ALL | InquiryChannel;
export type InquiryStatusFilter = typeof INQUIRY_FILTER_ALL | InquiryStatus;

export function filterInquiries(
  list: readonly Inquiry[],
  type: InquiryTypeFilter,
  channel: InquiryChannelFilter,
  status: InquiryStatusFilter,
): readonly Inquiry[] {
  return list.filter(
    (inquiry) =>
      (type === INQUIRY_FILTER_ALL || inquiry.type === type) &&
      (channel === INQUIRY_FILTER_ALL || inquiry.channel === channel) &&
      (status === INQUIRY_FILTER_ALL || inquiry.status === status),
  );
}

export function searchInquiries(list: readonly Inquiry[], keyword: string): readonly Inquiry[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (inquiry) =>
      inquiry.title.toLowerCase().includes(needle) ||
      inquiry.inquiryNo.toLowerCase().includes(needle) ||
      inquiry.customerName.toLowerCase().includes(needle) ||
      inquiry.company.toLowerCase().includes(needle),
  );
}

/** 접수일시 내림차순(최근이 위). 같은 시각은 id 안정 정렬. 테스트가 직접 부른다. */
export function sortInquiries(list: readonly Inquiry[]): readonly Inquiry[] {
  return [...list].sort((a, b) => {
    if (a.receivedAt !== b.receivedAt) return a.receivedAt < b.receivedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toInquiryInput(inquiry: Inquiry): InquiryInput {
  return {
    inquiryNo: inquiry.inquiryNo,
    title: inquiry.title,
    type: inquiry.type,
    channel: inquiry.channel,
    customerName: inquiry.customerName,
    company: inquiry.company,
    contact: inquiry.contact,
    assignee: inquiry.assignee,
    priority: inquiry.priority,
    status: inquiry.status,
    receivedAt: inquiry.receivedAt,
    body: inquiry.body,
    quoteId: inquiry.quoteId,
    timeline: inquiry.timeline,
  };
}

/** 타임라인에 이벤트를 덧붙인다(append-only) — 상세의 답변/메모·상태변경 기록이 쓴다. */
export function appendEvent(
  events: readonly InquiryEvent[],
  event: InquiryEvent,
): readonly InquiryEvent[] {
  return [...events, event];
}
