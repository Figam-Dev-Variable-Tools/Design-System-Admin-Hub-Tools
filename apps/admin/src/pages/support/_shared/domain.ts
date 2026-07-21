// 고객센터(CS) 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// [왜 _shared 인가] 1:1 문의(티켓)·문의 유형·문의 답변 세 화면이 같은 도메인을 공유한다:
//   - 티켓은 문의 유형(categoryId)을 참조하고, 유형 삭제는 그 유형을 쓰는 티켓/템플릿이 있으면 막힌다.
//   - 답변 템플릿도 유형(categoryId)으로 태깅되고, 티켓 상세가 그 템플릿을 삽입한다.
//   세 data-source 가 서로를 import 하면 결합이 되므로 도메인 타입·순수 규칙을 이 잎 모듈에 모은다
//   (상품 도메인의 _shared/store 와 같은 결 — pages/support 한 페이지 안이라 페이지 간 결합이 아니다).
//
// [국내 CS/헬프데스크 관례 채택] 채널톡·해피톡·Zendesk·카페24 1:1문의 조사 결과:
//   상태를 '책임 이관 흐름'(접수→배정→처리중→답변완료→종결)으로 두고 불가능한 전이를 막는다.
//   SLA 는 우선순위별 목표시간(첫 응답)으로 환산해 임박/초과 배지로 시각화한다.
//   유형/템플릿은 '참조되면 하드 삭제하지 않는다'(사용 중 차단 + 사용여부 소프트 비활성).
import type { StatusTone } from '../../../shared/ui';
import {
  COMMON_INQUIRY_STATUS_ORDER,
  isCommonInquiryStatus,
} from '../../../shared/domain/inquiry-status';
import type { CommonInquiryStatus } from '../../../shared/domain/inquiry-status';

/* ── 문의 유형(카테고리) ───────────────────────────────────────────────────── */

export interface SupportCategory {
  readonly id: string;
  readonly label: string;
  /** 사용여부 — 끄면 신규 문의/템플릿의 유형 선택에서 숨는다(기존 참조는 유지) */
  readonly active: boolean;
}

/** 유형 + 사용 중 건수(티켓·템플릿) — 삭제 차단 판단·목록 배지에 쓴다 */
export interface SupportCategoryUsage extends SupportCategory {
  readonly ticketCount: number;
  readonly templateCount: number;
}

export interface SupportCategoryInput {
  readonly label: string;
  readonly active: boolean;
}

/** 참조 중이면(티켓·템플릿 합 > 0) 삭제할 수 없다 */
export function categoryInUse(usage: SupportCategoryUsage): boolean {
  return usage.ticketCount + usage.templateCount > 0;
}

/** 목록 배지 문구 — '사용 안 함' / '티켓 3 · 템플릿 1' */
export function categoryUsageLabel(usage: SupportCategoryUsage): string {
  const total = usage.ticketCount + usage.templateCount;
  if (total === 0) return '사용 안 함';
  return `티켓 ${String(usage.ticketCount)} · 템플릿 ${String(usage.templateCount)}`;
}

/* ── 1:1 문의(티켓) ────────────────────────────────────────────────────────── */

type TicketChannel = 'web' | 'kakao' | 'naver' | 'phone' | 'email';
type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';
/**
 * 책임 이관 흐름 — 접수→배정→처리중→답변완료→종결.
 *
 * 상태값과 그 순서는 shared/domain/inquiry-status 가 갖는다(영업 문의와 같은 어휘다 — 두 화면이
 * 같은 흐름을 각자 선언하던 자리). 여기서 티켓이 더하는 상태는 없어 공통 유니온을 그대로 쓴다.
 * 문구('답변완료')·색·전이 규칙은 고객센터의 것이라 이 파일에 남는다.
 */
export type TicketStatus = CommonInquiryStatus;
/** 타임라인 이벤트 — 접수/배정/내부메모/고객답변/상태변경 (append-only) */
export type TicketEventKind = 'received' | 'assign' | 'note' | 'reply' | 'status';

export interface TicketEvent {
  readonly id: string;
  /** 발생 시각 ISO */
  readonly at: string;
  readonly author: string;
  readonly kind: TicketEventKind;
  readonly text: string;
}

export interface Ticket {
  readonly id: string;
  readonly ticketNo: string;
  readonly title: string;
  /** 문의 유형 id */
  readonly categoryId: string;
  /** 조회 시점 유형 라벨(비정규화) — 목록에 바로 쓴다 */
  readonly categoryLabel: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  /** 담당자 — 미배정이면 '' */
  readonly assignee: string;
  readonly customerName: string;
  readonly contact: string;
  /** 접수 일시 ISO */
  readonly receivedAt: string;
  readonly body: string;
  readonly timeline: readonly TicketEvent[];
}

/** 저장 입력 — 라벨은 서버가 조인하므로 제외, id 제외 */
export type TicketInput = Omit<Ticket, 'id' | 'categoryLabel'>;

export const TICKET_REPLY_MAX = 1000;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const TICKET_CHANNEL_OPTIONS: readonly Option<TicketChannel>[] = [
  { id: 'web', label: '웹' },
  { id: 'kakao', label: '카카오톡' },
  { id: 'naver', label: '네이버톡톡' },
  { id: 'phone', label: '전화' },
  { id: 'email', label: '이메일' },
] as const;

export const TICKET_PRIORITY_OPTIONS: readonly Option<TicketPriority>[] = [
  { id: 'urgent', label: '긴급' },
  { id: 'high', label: '높음' },
  { id: 'normal', label: '보통' },
  { id: 'low', label: '낮음' },
] as const;

/** 상태 문구 — **고객센터의 말투다.** 같은 'answered' 를 영업 문의는 '완료' 라 부른다 */
const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  received: '접수',
  assigned: '배정',
  in_progress: '처리중',
  answered: '답변완료',
  closed: '종결',
};

/** 순서는 공통 흐름 그대로 — 옵션은 공통 순서 × 이 화면의 문구로 조립한다 */
export const TICKET_STATUS_OPTIONS: readonly Option<TicketStatus>[] =
  COMMON_INQUIRY_STATUS_ORDER.map((id) => ({ id, label: TICKET_STATUS_LABEL[id] }));

const TICKET_EVENT_OPTIONS: readonly Option<TicketEventKind>[] = [
  { id: 'received', label: '접수' },
  { id: 'assign', label: '배정' },
  { id: 'note', label: '내부메모' },
  { id: 'reply', label: '고객답변' },
  { id: 'status', label: '상태변경' },
] as const;

const labelOf = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

export const ticketChannelLabel = (v: TicketChannel): string => labelOf(TICKET_CHANNEL_OPTIONS, v);
export const ticketPriorityLabel = (v: TicketPriority): string =>
  labelOf(TICKET_PRIORITY_OPTIONS, v);
/** 상태만 Record 직접 조회 — 옵션 배열을 훑지 않는다(누락 시 컴파일이 막는다) */
export const ticketStatusLabel = (v: TicketStatus): string => TICKET_STATUS_LABEL[v];
export const ticketEventLabel = (v: TicketEventKind): string => labelOf(TICKET_EVENT_OPTIONS, v);

const STATUS_TONE: Record<TicketStatus, StatusTone> = {
  received: 'neutral',
  assigned: 'info',
  in_progress: 'info',
  answered: 'success',
  closed: 'neutral',
};

export function ticketStatusTone(status: TicketStatus): StatusTone {
  return STATUS_TONE[status];
}

export function ticketPriorityTone(priority: TicketPriority): StatusTone {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'neutral';
  return 'info';
}

/* ── SLA (첫 응답 목표시간 — 우선순위로 환산) ──────────────────────────────────
 *
 * 조사: Zendesk 는 우선순위가 정해져야 SLA 목표가 적용된다. 목록의 '임박(amber)/초과(red)' 배지가
 * 보이지 않는 마감시계를 시각 트리거로 바꾼다. 여기서는 첫 응답 SLA 만 모델링한다(가장 널리 쓰는 축). */

type SlaState = 'met' | 'breached' | 'due_soon' | 'on_track';

const HOUR_MS = 60 * 60 * 1000;

/** 우선순위별 첫 응답 목표시간(시간) */
const SLA_TARGET_HOURS: Record<TicketPriority, number> = {
  urgent: 1,
  high: 4,
  normal: 24,
  low: 72,
};

/** 남은 시간이 목표창의 이 비율 이하로 떨어지면 '임박' */
const SLA_DUE_SOON_RATIO = 0.25;

export function slaTargetHours(priority: TicketPriority): number {
  return SLA_TARGET_HOURS[priority];
}

/** 첫 응답 마감 시각 ISO — 접수 시각 + 목표시간 */
export function slaDueAt(ticket: Pick<Ticket, 'receivedAt' | 'priority'>): string {
  const received = new Date(ticket.receivedAt).getTime();
  return new Date(received + slaTargetHours(ticket.priority) * HOUR_MS).toISOString();
}

/**
 * 첫 응답 SLA 상태. 답변완료/종결이면 목표를 채운 것으로 본다('met').
 * 그 외는 마감까지 남은 시간으로 초과/임박/여유를 가른다. now 는 테스트에서 고정 가능.
 */
export function ticketSlaState(
  ticket: Pick<Ticket, 'receivedAt' | 'priority' | 'status'>,
  now: Date = new Date(),
): SlaState {
  if (ticket.status === 'answered' || ticket.status === 'closed') return 'met';
  const due = new Date(slaDueAt(ticket)).getTime();
  const remaining = due - now.getTime();
  if (remaining <= 0) return 'breached';
  const windowMs = slaTargetHours(ticket.priority) * HOUR_MS;
  if (remaining <= windowMs * SLA_DUE_SOON_RATIO) return 'due_soon';
  return 'on_track';
}

const SLA_TONE: Record<SlaState, StatusTone> = {
  met: 'success',
  breached: 'danger',
  due_soon: 'warning',
  on_track: 'neutral',
};

export function slaTone(state: SlaState): StatusTone {
  return SLA_TONE[state];
}

const SLA_LABEL: Record<SlaState, string> = {
  met: '응답완료',
  breached: 'SLA 초과',
  due_soon: 'SLA 임박',
  on_track: '정상',
};

export function slaStateLabel(state: SlaState): string {
  return SLA_LABEL[state];
}

/** '2시간 12분' 형태 — 시/분만 보여준다(초 단위는 목록에서 노이즈) */
function durationLabel(ms: number): string {
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${String(hours)}시간 ${String(minutes)}분`;
  return `${String(minutes)}분`;
}

/** 마감까지 남은/초과 시간 문구 — 상세 화면 SLA 안내 */
export function slaRemainingLabel(
  ticket: Pick<Ticket, 'receivedAt' | 'priority' | 'status'>,
  now: Date = new Date(),
): string {
  if (ticket.status === 'answered' || ticket.status === 'closed') return '첫 응답 완료';
  const due = new Date(slaDueAt(ticket)).getTime();
  const remaining = due - now.getTime();
  if (remaining <= 0) return `${durationLabel(-remaining)} 초과`;
  return `${durationLabel(remaining)} 남음`;
}

/* ── 상태 전이 규칙 (불가능한 전이를 막는다) ─────────────────────────────────── */

/** 각 상태에서 넘어갈 수 있는 다음 상태들. 종결은 종착(전이 없음). */
const STATUS_FLOW: Record<TicketStatus, readonly TicketStatus[]> = {
  received: ['assigned', 'closed'],
  assigned: ['in_progress', 'closed'],
  in_progress: ['answered', 'closed'],
  answered: ['closed', 'in_progress'],
  closed: [],
};

/** 현재 상태를 포함해(변경 안 함도 유효) 선택 가능한 상태들 */
export function allowedNextStatuses(current: TicketStatus): readonly TicketStatus[] {
  return [current, ...STATUS_FLOW[current]];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return from === to || STATUS_FLOW[from].includes(to);
}

/** 담당자가 있어야 하는 상태 — 처리중·답변완료는 배정 없이 갈 수 없다(조사: 담당 없이 답변완료 금지) */
export function statusRequiresAssignee(status: TicketStatus): boolean {
  return status === 'in_progress' || status === 'answered';
}

/** 전이 가능 + 담당 요건까지 본 최종 판정 */
export function canSetStatus(from: TicketStatus, to: TicketStatus, assignee: string): boolean {
  if (!canTransition(from, to)) return false;
  if (statusRequiresAssignee(to) && assignee.trim() === '') return false;
  return true;
}

/* ── 타입가드 (select 문자열 → 유니온) ───────────────────────────────────────── */

const CHANNEL_VALUES = ['web', 'kakao', 'naver', 'phone', 'email'] as const;
const PRIORITY_VALUES = ['urgent', 'high', 'normal', 'low'] as const;

/** 티켓 상태 = 공통 상태 — 판정도 공통 가드에 위임한다(값 목록 사본을 두지 않는다) */
export function isTicketStatus(value: unknown): value is TicketStatus {
  return isCommonInquiryStatus(value);
}

export function isTicketChannel(value: unknown): value is TicketChannel {
  return typeof value === 'string' && (CHANNEL_VALUES as readonly string[]).includes(value);
}

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === 'string' && (PRIORITY_VALUES as readonly string[]).includes(value);
}

/* ── 필터 · 검색 · 정렬 · 타임라인 ───────────────────────────────────────────── */

export const TICKET_FILTER_ALL = 'all';
export type TicketStatusFilter = typeof TICKET_FILTER_ALL | TicketStatus;
export type TicketChannelFilter = typeof TICKET_FILTER_ALL | TicketChannel;
export type TicketPriorityFilter = typeof TICKET_FILTER_ALL | TicketPriority;
type TicketCategoryFilter = typeof TICKET_FILTER_ALL | string;

export function filterTickets(
  list: readonly Ticket[],
  status: TicketStatusFilter,
  channel: TicketChannelFilter,
  priority: TicketPriorityFilter,
  categoryId: TicketCategoryFilter,
): readonly Ticket[] {
  return list.filter(
    (ticket) =>
      (status === TICKET_FILTER_ALL || ticket.status === status) &&
      (channel === TICKET_FILTER_ALL || ticket.channel === channel) &&
      (priority === TICKET_FILTER_ALL || ticket.priority === priority) &&
      (categoryId === TICKET_FILTER_ALL || ticket.categoryId === categoryId),
  );
}

export function searchTickets(list: readonly Ticket[], keyword: string): readonly Ticket[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(needle) ||
      ticket.ticketNo.toLowerCase().includes(needle) ||
      ticket.customerName.toLowerCase().includes(needle),
  );
}

/** 접수일시 내림차순(최근이 위). 같은 시각은 id 안정 정렬. */
export function sortTickets(list: readonly Ticket[]): readonly Ticket[] {
  return [...list].sort((a, b) => {
    if (a.receivedAt !== b.receivedAt) return a.receivedAt < b.receivedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function appendEvent(
  events: readonly TicketEvent[],
  event: TicketEvent,
): readonly TicketEvent[] {
  return [...events, event];
}

export function toTicketInput(ticket: Ticket): TicketInput {
  return {
    ticketNo: ticket.ticketNo,
    title: ticket.title,
    categoryId: ticket.categoryId,
    channel: ticket.channel,
    priority: ticket.priority,
    status: ticket.status,
    assignee: ticket.assignee,
    customerName: ticket.customerName,
    contact: ticket.contact,
    receivedAt: ticket.receivedAt,
    body: ticket.body,
    timeline: ticket.timeline,
  };
}

/* ── 답변 템플릿 ───────────────────────────────────────────────────────────── */

export interface ReplyTemplate {
  readonly id: string;
  readonly title: string;
  /** 유형 태그 id — 전체 공용이면 '' */
  readonly categoryId: string;
  /** 조회 시점 유형 라벨(비정규화). 공용이면 '전체' */
  readonly categoryLabel: string;
  readonly body: string;
}

export type ReplyTemplateInput = Omit<ReplyTemplate, 'id' | 'categoryLabel'>;

export const TEMPLATE_TITLE_MAX = 60;
export const TEMPLATE_BODY_MAX = 1000;
export const CATEGORY_LABEL_MAX = 30;

/** 공용(유형 태그 없음) 표기 */
export const TEMPLATE_ALL_LABEL = '전체';

/**
 * 템플릿 본문의 치환 변수({{고객명}}·{{문의번호}}·{{담당자}})를 실제 값으로 바꾼다.
 * 티켓 답변 작성 시 삽입하며 값을 채운다(조사: 변수 치환으로 로봇 같은 상용구를 피한다).
 */
export function applyTemplate(
  body: string,
  vars: { readonly customerName: string; readonly ticketNo: string; readonly assignee: string },
): string {
  return body
    .replaceAll('{{고객명}}', vars.customerName)
    .replaceAll('{{문의번호}}', vars.ticketNo)
    .replaceAll('{{담당자}}', vars.assignee === '' ? '담당자' : vars.assignee);
}

/** 티켓 유형에 맞는 템플릿만(+공용) 추린다 — 상세의 템플릿 선택 목록 */
export function templatesForCategory(
  templates: readonly ReplyTemplate[],
  categoryId: string,
): readonly ReplyTemplate[] {
  return templates.filter(
    (template) => template.categoryId === '' || template.categoryId === categoryId,
  );
}

export function searchTemplates(
  list: readonly ReplyTemplate[],
  keyword: string,
): readonly ReplyTemplate[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (template) =>
      template.title.toLowerCase().includes(needle) || template.body.toLowerCase().includes(needle),
  );
}
