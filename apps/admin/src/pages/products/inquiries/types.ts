// 상품 문의 화면 전용 타입 + 뷰 헬퍼
//
// 정본(픽스처·전이 규칙)은 ./_shared/store 다. 여기는 화면이 읽는 **표시 규칙**만 둔다 —
// 상태 문구·색, 목록 필터 축과 건수, 검색, 미답변 집계, 경과 문구, 처리 이력 매핑.
// 전부 순수 함수라 테스트가 화면 없이 고정한다.
import type { StatusBadgeTone } from '@tds/ui';

import { daysBetween, formatDateTime, seoulDayOf } from '../../../shared/format';
import type { TimelineEvent } from '../../../shared/ui';
import { isUnanswered } from './_shared/store';
import type { InquiryStatus, ProductInquiry, ProductInquiryChannel } from './_shared/store';

/* ── 상태 표시 ────────────────────────────────────────────────────────────── */

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/**
 * 상태 문구·색.
 *
 * 미답변 두 상태(접수·답변 중)를 **경고 계열로 함께 묶지 않는다**: '답변 중' 은 이미 사람이 붙은
 * 상태라 방치된 '접수' 와 같은 색이면 운영자가 무엇을 먼저 집어야 할지 알 수 없다.
 */
const STATUS_META: Record<InquiryStatus, StatusMeta> = {
  received: { label: '접수', tone: 'warning' },
  answering: { label: '답변 중', tone: 'info' },
  answered: { label: '답변 완료', tone: 'success' },
  closed: { label: '종결', tone: 'neutral' },
};

export function inquiryStatusLabel(status: InquiryStatus): string {
  return STATUS_META[status].label;
}

export function inquiryStatusTone(status: InquiryStatus): StatusBadgeTone {
  return STATUS_META[status].tone;
}

/** 상태 순서 — 처리 흐름 순(접수 → 답변 중 → 답변 완료 → 종결) */
const STATUS_SEQUENCE: readonly InquiryStatus[] = ['received', 'answering', 'answered', 'closed'];

/** 좌측 필터가 세우는 항목들 — URL 값 좁히기는 shared/crud 의 parseFilter 가 한다 */
const STATUS_OPTIONS: readonly { readonly id: InquiryStatus; readonly label: string }[] =
  STATUS_SEQUENCE.map((status) => ({ id: status, label: STATUS_META[status].label }));

/* ── 채널 표시 ────────────────────────────────────────────────────────────── */

/**
 * 채널 문구. 'storefront' 는 **PG 를 끈 상품 페이지의 문의하기 버튼**이다 — 이 모듈이 존재하는
 * 이유라서 다른 채널과 구별되는 이름을 준다('상품 페이지' 로만 적으면 일반 상담과 섞인다).
 */
const CHANNEL_LABEL: Record<ProductInquiryChannel, string> = {
  storefront: '상품 페이지',
  app: '모바일 앱',
  phone: '전화',
  email: '이메일',
  kakao: '카카오톡',
};

export function inquiryChannelLabel(channel: ProductInquiryChannel): string {
  return CHANNEL_LABEL[channel];
}

/* ── 목록 필터: 상태 ──────────────────────────────────────────────────────── */

export const INQUIRY_STATUS_ALL = 'all';

export type InquiryStatusFilter = typeof INQUIRY_STATUS_ALL | InquiryStatus;

export const INQUIRY_STATUS_FILTERS: readonly {
  readonly id: InquiryStatusFilter;
  readonly label: string;
}[] = [{ id: INQUIRY_STATUS_ALL, label: '전체' }, ...STATUS_OPTIONS];

export const INQUIRY_STATUS_FILTER_VALUES: readonly InquiryStatusFilter[] =
  INQUIRY_STATUS_FILTERS.map((option) => option.id);

export function filterInquiriesByStatus(
  list: readonly ProductInquiry[],
  filter: InquiryStatusFilter,
): readonly ProductInquiry[] {
  if (filter === INQUIRY_STATUS_ALL) return list;
  return list.filter((inquiry) => inquiry.status === filter);
}

/** 건수 배지 — **필터 이전** 전체 집합에서 센다(필터가 자기 배지를 흔들면 비교가 불가능하다) */
export function countInquiriesByStatus(
  list: readonly ProductInquiry[],
): Record<InquiryStatusFilter, number> {
  const counts: Record<InquiryStatusFilter, number> = {
    [INQUIRY_STATUS_ALL]: list.length,
    received: 0,
    answering: 0,
    answered: 0,
    closed: 0,
  };
  for (const inquiry of list) counts[inquiry.status] += 1;
  return counts;
}

/** 아직 답이 안 나간 건수 — 목록 상단 안내와 좌측 레일이 같은 수를 말하게 하는 단일 정의 */
export function unansweredCount(list: readonly ProductInquiry[]): number {
  return list.filter((inquiry) => isUnanswered(inquiry.status)).length;
}

/** 문의번호·상품명·문의자·제목으로 찾는다 — 운영자가 실제로 손에 쥔 단서들이다 */
export function searchProductInquiries(
  list: readonly ProductInquiry[],
  keyword: string,
): readonly ProductInquiry[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (inquiry) =>
      inquiry.id.toLowerCase().includes(needle) ||
      inquiry.productName.toLowerCase().includes(needle) ||
      inquiry.customerName.toLowerCase().includes(needle) ||
      inquiry.subject.toLowerCase().includes(needle),
  );
}

/** 접수 최신순(위가 최근). 같은 시각은 문의번호로 안정 정렬한다 */
export function sortProductInquiries(list: readonly ProductInquiry[]): readonly ProductInquiry[] {
  return [...list].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/* ── 경과 문구 ────────────────────────────────────────────────────────────── */

/** 이 날을 넘긴 미답변은 붉게 알린다 — 사흘은 국내 커머스 응대 관례의 마지노선이다 */
const OVERDUE_DAYS = 3;
/** 값을 읽을 수 없을 때(형식 깨짐)의 표기 — 0일로 위장하지 않는다 */
const UNKNOWN_ELAPSED = '—';

type ElapsedInquiry = Pick<ProductInquiry, 'status' | 'createdAt' | 'answeredAt'>;

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
  if (!isUnanswered(inquiry.status)) {
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
  if (!isUnanswered(inquiry.status)) return 'neutral';
  const days = pendingDays(inquiry, today);
  if (days === null) return 'neutral';
  if (days >= OVERDUE_DAYS) return 'danger';
  return days === 0 ? 'info' : 'warning';
}

/* ── 처리 이력 ────────────────────────────────────────────────────────────── */

const SYSTEM_AUTHOR = '고객';
const ADMIN_AUTHOR = '관리자';

/**
 * 처리 이력 — 별도 로그 테이블이 아니라 **저장된 사실에서 파생**한다.
 *
 * 접수(createdAt)·답변(answeredAt)·종결(status)은 이미 문의가 들고 있는 값이다. 이력을 따로
 * 쌓으면 답변을 고쳤을 때 이력과 본문이 갈라지는 순간이 생긴다 — 파생이면 갈라질 수 없다.
 * 종결 시각은 저장하지 않으므로 답변 시각을 기준으로 마지막 칸을 세운다(시각은 답변의 것임을
 * 문구가 밝힌다).
 */
export function inquiryHistory(inquiry: ProductInquiry): readonly TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${inquiry.id}-received`,
      at: inquiry.createdAt,
      author: SYSTEM_AUTHOR,
      badgeTone: 'neutral',
      badgeLabel: '접수',
      text: `${inquiryChannelLabel(inquiry.channel)} 채널로 문의가 접수되었습니다.`,
    },
  ];

  if (inquiry.status === 'answering') {
    events.push({
      id: `${inquiry.id}-answering`,
      at: inquiry.createdAt,
      author: ADMIN_AUTHOR,
      badgeTone: 'info',
      badgeLabel: '답변 중',
      text: '담당자가 답변을 준비하고 있습니다.',
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
      text: `답변 발송(${formatDateTime(inquiry.answeredAt)}) 후 문의가 종결되었습니다.`,
    });
  }

  return events;
}
