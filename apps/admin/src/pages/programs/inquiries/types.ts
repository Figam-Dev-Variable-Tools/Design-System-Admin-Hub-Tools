// 프로그램 문의 화면 전용 타입 + 뷰 헬퍼
//
// 정본(픽스처·전이 규칙)은 ./_shared/store 다. 여기는 화면이 읽는 **표시 규칙**만 둔다 —
// 상태·유형 문구와 색, 목록 필터 두 축과 건수, 검색, 미답변 집계, 경과 문구, 처리 이력 매핑.
// 전부 순수 함수라 테스트가 화면 없이 고정한다.
import type { StatusBadgeTone } from '@tds/ui';

import { daysBetween, formatDateTime, seoulDayOf } from '../../../shared/format';
import type { TimelineEvent } from '../../../shared/ui';
import { isProgramInquiryUnanswered } from './_shared/store';
import type {
  ProgramInquiry,
  ProgramInquiryChannel,
  ProgramInquiryStatus,
  ProgramInquiryTopic,
} from './_shared/store';

/* ── 상태 표시 ────────────────────────────────────────────────────────────── */

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/**
 * 상태 문구·색.
 *
 * 미답변 두 상태(접수·답변 중)를 같은 색으로 묶지 않는다: '답변 중' 은 이미 사람이 붙은 상태라
 * 방치된 '접수' 와 같은 색이면 운영자가 무엇을 먼저 집어야 할지 알 수 없다.
 */
const STATUS_META: Record<ProgramInquiryStatus, StatusMeta> = {
  received: { label: '접수', tone: 'warning' },
  answering: { label: '답변 중', tone: 'info' },
  // 견적 발행은 산출물이 나온 **진행** 단계다 — 종료(답변 완료/종결)와 색으로 구분한다.
  quote_issued: { label: '견적 발행', tone: 'info' },
  answered: { label: '답변 완료', tone: 'success' },
  closed: { label: '종결', tone: 'neutral' },
};

export function programInquiryStatusLabel(status: ProgramInquiryStatus): string {
  return STATUS_META[status].label;
}

export function programInquiryStatusTone(status: ProgramInquiryStatus): StatusBadgeTone {
  return STATUS_META[status].tone;
}

/** 상태 순서 — 처리 흐름 순(접수 → 답변 중 → 견적 발행 → 답변 완료 → 종결) */
const STATUS_SEQUENCE: readonly ProgramInquiryStatus[] = [
  'received',
  'answering',
  'quote_issued',
  'answered',
  'closed',
];

/** 좌측 필터가 세우는 항목들 — URL 값 좁히기는 shared/crud 의 parseFilter 가 한다 */
const STATUS_OPTIONS: readonly { readonly id: ProgramInquiryStatus; readonly label: string }[] =
  STATUS_SEQUENCE.map((status) => ({ id: status, label: STATUS_META[status].label }));

/* ── 유형·채널 표시 ───────────────────────────────────────────────────────── */

/**
 * 문의 유형 문구. 후원형 펀딩에서 이 축이 필요한 이유는 처리하는 사람이 다르기 때문이다 —
 * 리워드·배송은 창작자 확인이 필요하고, 환불·결제는 운영이 바로 답할 수 있다.
 */
const TOPIC_META: Record<ProgramInquiryTopic, StatusMeta> = {
  reward: { label: '리워드', tone: 'info' },
  delivery: { label: '배송', tone: 'info' },
  refund: { label: '환불', tone: 'warning' },
  payment: { label: '결제', tone: 'warning' },
  etc: { label: '기타', tone: 'neutral' },
};

export function programInquiryTopicLabel(topic: ProgramInquiryTopic): string {
  return TOPIC_META[topic].label;
}

export function programInquiryTopicTone(topic: ProgramInquiryTopic): StatusBadgeTone {
  return TOPIC_META[topic].tone;
}

const TOPIC_SEQUENCE: readonly ProgramInquiryTopic[] = [
  'reward',
  'delivery',
  'refund',
  'payment',
  'etc',
];

const TOPIC_OPTIONS: readonly { readonly id: ProgramInquiryTopic; readonly label: string }[] =
  TOPIC_SEQUENCE.map((topic) => ({ id: topic, label: TOPIC_META[topic].label }));

/**
 * 채널 문구. 'storefront' 는 **PG 를 끈 프로그램 페이지의 문의하기 버튼**이다 — 이 모듈이
 * 존재하는 이유라서 다른 채널과 구별되는 이름을 준다.
 */
const CHANNEL_LABEL: Record<ProgramInquiryChannel, string> = {
  storefront: '프로그램 페이지',
  app: '모바일 앱',
  phone: '전화',
  email: '이메일',
  kakao: '카카오톡',
};

export function programInquiryChannelLabel(channel: ProgramInquiryChannel): string {
  return CHANNEL_LABEL[channel];
}

/* ── 목록 필터: 상태 · 유형 ───────────────────────────────────────────────── */

export const PROGRAM_INQUIRY_FILTER_ALL = 'all';

export type ProgramInquiryStatusFilter = typeof PROGRAM_INQUIRY_FILTER_ALL | ProgramInquiryStatus;
export type ProgramInquiryTopicFilter = typeof PROGRAM_INQUIRY_FILTER_ALL | ProgramInquiryTopic;

export const PROGRAM_INQUIRY_STATUS_FILTERS: readonly {
  readonly id: ProgramInquiryStatusFilter;
  readonly label: string;
}[] = [{ id: PROGRAM_INQUIRY_FILTER_ALL, label: '전체' }, ...STATUS_OPTIONS];

export const PROGRAM_INQUIRY_STATUS_FILTER_VALUES: readonly ProgramInquiryStatusFilter[] =
  PROGRAM_INQUIRY_STATUS_FILTERS.map((option) => option.id);

export const PROGRAM_INQUIRY_TOPIC_FILTERS: readonly {
  readonly id: ProgramInquiryTopicFilter;
  readonly label: string;
}[] = [{ id: PROGRAM_INQUIRY_FILTER_ALL, label: '전체' }, ...TOPIC_OPTIONS];

export const PROGRAM_INQUIRY_TOPIC_FILTER_VALUES: readonly ProgramInquiryTopicFilter[] =
  PROGRAM_INQUIRY_TOPIC_FILTERS.map((option) => option.id);

/** 두 축을 한 번에 건다 — 화면이 filter().filter() 로 순서를 만들지 않게 한다 */
export function filterProgramInquiries(
  list: readonly ProgramInquiry[],
  status: ProgramInquiryStatusFilter,
  topic: ProgramInquiryTopicFilter,
): readonly ProgramInquiry[] {
  return list.filter(
    (inquiry) =>
      (status === PROGRAM_INQUIRY_FILTER_ALL || inquiry.status === status) &&
      (topic === PROGRAM_INQUIRY_FILTER_ALL || inquiry.topic === topic),
  );
}

/** 건수 배지 — **필터 이전** 전체 집합에서 센다(필터가 자기 배지를 흔들면 비교가 불가능하다) */
export function countProgramInquiriesByStatus(
  list: readonly ProgramInquiry[],
): Record<ProgramInquiryStatusFilter, number> {
  const counts: Record<ProgramInquiryStatusFilter, number> = {
    [PROGRAM_INQUIRY_FILTER_ALL]: list.length,
    received: 0,
    answering: 0,
    quote_issued: 0,
    answered: 0,
    closed: 0,
  };
  for (const inquiry of list) counts[inquiry.status] += 1;
  return counts;
}

export function countProgramInquiriesByTopic(
  list: readonly ProgramInquiry[],
): Record<ProgramInquiryTopicFilter, number> {
  const counts: Record<ProgramInquiryTopicFilter, number> = {
    [PROGRAM_INQUIRY_FILTER_ALL]: list.length,
    reward: 0,
    delivery: 0,
    refund: 0,
    payment: 0,
    etc: 0,
  };
  for (const inquiry of list) counts[inquiry.topic] += 1;
  return counts;
}

/** 아직 답이 안 나간 건수 — 좌측 안내와 배지가 같은 수를 말하게 하는 단일 정의 */
export function unansweredCount(list: readonly ProgramInquiry[]): number {
  return list.filter((inquiry) => isProgramInquiryUnanswered(inquiry.status)).length;
}

/** 문의번호·프로그램명·문의자·제목으로 찾는다 — 운영자가 실제로 손에 쥔 단서들이다 */
export function searchProgramInquiries(
  list: readonly ProgramInquiry[],
  keyword: string,
): readonly ProgramInquiry[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (inquiry) =>
      inquiry.id.toLowerCase().includes(needle) ||
      inquiry.programName.toLowerCase().includes(needle) ||
      inquiry.customerName.toLowerCase().includes(needle) ||
      inquiry.subject.toLowerCase().includes(needle),
  );
}

/** 접수 최신순(위가 최근). 같은 시각은 문의번호로 안정 정렬한다 */
export function sortProgramInquiries(list: readonly ProgramInquiry[]): readonly ProgramInquiry[] {
  return [...list].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/* ── 경과 문구 ────────────────────────────────────────────────────────────── */

/**
 * 이 날을 넘긴 미답변은 붉게 알린다.
 *
 * 상품(사흘)보다 하루 짧다 — 펀딩은 **마감이 있는 판매**라, 답이 늦으면 후원 자체가 사라진다.
 * 답을 못 받은 사람은 기다리지 않고 그냥 후원을 접는다.
 */
const OVERDUE_DAYS = 2;
/** 값을 읽을 수 없을 때(형식 깨짐)의 표기 — 0일로 위장하지 않는다 */
const UNKNOWN_ELAPSED = '—';

type ElapsedInquiry = Pick<ProgramInquiry, 'status' | 'createdAt' | 'answeredAt'>;

/** 견적만 나가고 답변 글은 아직인 상태 — 경과 문구가 '답변 완료' 로 뭉개지 않게 가른다 */
function isQuoteOnly(inquiry: ElapsedInquiry): boolean {
  return inquiry.status === 'quote_issued' && inquiry.answeredAt === '';
}

/** 접수일부터 오늘까지 며칠이 지났나 — 읽을 수 없으면 null */
function pendingDays(inquiry: ElapsedInquiry, today: string): number | null {
  const created = seoulDayOf(inquiry.createdAt);
  if (created === null) return null;
  const diff = daysBetween(created, today);
  return diff === null ? null : Math.max(diff, 0);
}

/**
 * 경과 문구 — '3일째 미답변' / '오늘 접수' / '2일 만에 답변' / '당일 답변'.
 *
 * 미답변은 **접수일부터 오늘까지**, 답변된 건은 **접수일부터 최초 답변일까지** 를 센다: 전자는
 * 아직 흘러가는 시간이고 후자는 이미 끝난 사실이라 세는 구간이 다르다. `today` 를 인자로 받는
 * 이유는 픽스처의 경과가 실행하는 날마다 달라지면 스토리·테스트 비교가 매일 깨지기 때문이다.
 */
export function elapsedLabel(inquiry: ElapsedInquiry, today: string): string {
  // 견적을 보냈지만 답변 글은 아직인 건 — '답변 완료' 도 '미답변' 도 사실이 아니다.
  if (isQuoteOnly(inquiry)) return '견적 발행';
  if (!isProgramInquiryUnanswered(inquiry.status)) {
    const created = seoulDayOf(inquiry.createdAt);
    const answered = seoulDayOf(inquiry.answeredAt);
    if (created === null || answered === null) return '답변 완료';
    const spent = daysBetween(created, answered);
    if (spent === null) return '답변 완료';
    return spent <= 0 ? '당일 답변' : `${String(spent)}일 만에 답변`;
  }

  const days = pendingDays(inquiry, today);
  if (days === null) return UNKNOWN_ELAPSED;
  return days === 0 ? '오늘 접수' : `${String(days)}일째 미답변`;
}

/** 경과의 색 — 문구와 함께만 쓴다(색만으로 지연을 말하지 않는다) */
export function elapsedTone(inquiry: ElapsedInquiry, today: string): StatusBadgeTone {
  if (isQuoteOnly(inquiry)) return 'info';
  if (!isProgramInquiryUnanswered(inquiry.status)) return 'neutral';
  const days = pendingDays(inquiry, today);
  if (days === null) return 'neutral';
  if (days >= OVERDUE_DAYS) return 'danger';
  return days === 0 ? 'info' : 'warning';
}

/* ── 처리 이력 ────────────────────────────────────────────────────────────── */

const SUPPORTER_AUTHOR = '후원자';
const ADMIN_AUTHOR = '관리자';

/**
 * 처리 이력 — 별도 로그 테이블이 아니라 **저장된 사실에서 파생**한다.
 *
 * 접수(createdAt)·답변(answeredAt)·종결(status)은 이미 문의가 들고 있는 값이다. 이력을 따로
 * 쌓으면 답변을 고쳤을 때 이력과 본문이 갈라지는 순간이 생긴다 — 파생이면 갈라질 수 없다.
 */
export function programInquiryHistory(inquiry: ProgramInquiry): readonly TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${inquiry.id}-received`,
      at: inquiry.createdAt,
      author: SUPPORTER_AUTHOR,
      badgeTone: 'neutral',
      badgeLabel: '접수',
      text: `${programInquiryChannelLabel(inquiry.channel)} 채널로 ${programInquiryTopicLabel(inquiry.topic)} 문의가 접수되었어요.`,
    },
  ];

  if (inquiry.status === 'answering') {
    events.push({
      id: `${inquiry.id}-answering`,
      at: inquiry.createdAt,
      author: ADMIN_AUTHOR,
      badgeTone: 'info',
      badgeLabel: '답변 중',
      text: '담당자가 답변을 준비하고 있어요.',
    });
  }

  // 견적 발행도 저장된 사실(quoteId)에서 파생한다 — 별도 로그를 쌓으면 갈라질 자리가 생긴다.
  if (inquiry.quoteId !== '') {
    events.push({
      id: `${inquiry.id}-quote`,
      at: inquiry.createdAt,
      author: ADMIN_AUTHOR,
      badgeTone: 'info',
      badgeLabel: '견적 발행',
      text: '이 문의로 견적이 발행되었어요.',
    });
  }

  if (inquiry.answeredAt !== '') {
    events.push({
      id: `${inquiry.id}-answered`,
      at: inquiry.answeredAt,
      author: ADMIN_AUTHOR,
      badgeTone: 'success',
      badgeLabel: '답변',
      text: inquiry.answer,
    });
  }

  if (inquiry.status === 'closed') {
    events.push({
      id: `${inquiry.id}-closed`,
      at: inquiry.answeredAt,
      author: ADMIN_AUTHOR,
      badgeTone: 'neutral',
      badgeLabel: '종결',
      text: `답변 발송(${formatDateTime(inquiry.answeredAt)}) 후 문의가 종결되었어요.`,
    });
  }

  return events;
}
