// 발행 예약 — 저장하는 것과 파생하는 것을 가르는 한 벌
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 페이지 밖에 있나] 발행/예약을 말하는 화면이 하나가 아니기 때문이다. 지금 이 규칙을 쓰는
// 것은 뉴스·보도자료(/content/news)뿐이지만, 발행 시각을 다루는 화면은 계속 늘어난다.
// 화면마다 '예약' 을 각자 판정하면 같은 시각에 한쪽은 '예약', 다른쪽은 '발행' 이라고 말하는 날이
// 온다. 규칙이 두 벌이면 언제나 갈라진다 — 그래서 판정은 여기 한 곳에만 있다.
// (임의 페이지를 만들던 화면 /content/pages 가 이 규칙의 두 번째 사용처였는데, IA 에서 제거됐다.)
//
// [예약은 상태가 아니라 시각이다 — 이 파일에서 가장 중요한 판단]
// 'scheduled' 를 **저장하지 않는다.** 저장하면 예약 시각이 지난 뒤에도 레코드는 계속 'scheduled'
// 라고 말하고, 그 상태를 진짜로 바꾸는 것은 아무도 없다(백엔드 배치가 없으니 영원히 없다).
// 그러면 목록은 '예약' 이라 쓰고 홈페이지는 이미 공개하는, 서로 다른 두 이야기가 남는다.
// 저장하는 것은 `status`(운영자의 의도)와 `publishAt`(언제) 둘뿐이고, '예약중' 은 그 둘과
// **지금 시각**에서 매번 만든다. 시간이 흐르면 저장된 값을 건드리지 않아도 답이 바뀐다.
//
// [왜 publishAt 이 빈 문자열을 갖는가] '지정하지 않았다' 를 null 대신 '' 로 든 것은 주문·배너가
// 이미 쓰는 리포의 관례다(paidAt·canceledAt). 발행 상태에서 '' 는 '즉시 공개' 를 뜻한다.
// ─────────────────────────────────────────────────────────────────────────────
import type { StatusBadgeTone } from '@tds/ui';

/** 실제로 저장되는 상태 — 운영자의 의도 세 가지 */
export type StoredPublishStatus = 'draft' | 'published' | 'archived';

/** 화면이 읽는 상태 — 저장값 + 시간이 만든 'scheduled' */
export type PublishStatus = StoredPublishStatus | 'scheduled';

export const STORED_PUBLISH_STATUSES: readonly StoredPublishStatus[] = [
  'draft',
  'published',
  'archived',
];

export const PUBLISH_STATUS_LABEL: Readonly<Record<PublishStatus, string>> = {
  draft: '초안',
  scheduled: '예약',
  published: '발행',
  archived: '보관',
};

/** 상태의 색 의도 — 발행=성공, 예약=정보, 초안·보관=중립 */
export const PUBLISH_STATUS_TONE: Readonly<Record<PublishStatus, StatusBadgeTone>> = {
  draft: 'neutral',
  scheduled: 'info',
  published: 'success',
  archived: 'neutral',
};

export function isStoredPublishStatus(value: unknown): value is StoredPublishStatus {
  return typeof value === 'string' && STORED_PUBLISH_STATUSES.some((status) => status === value);
}

export function publishStatusLabel(status: PublishStatus): string {
  return PUBLISH_STATUS_LABEL[status];
}

/** 저장되는 두 값 — 이 모양을 가진 것이면 무엇이든 판정할 수 있다(페이지도 뉴스도) */
export interface PublishSchedule {
  readonly status: StoredPublishStatus;
  /** 공개 시각 'YYYY-MM-DDTHH:mm' — '' 면 즉시(발행 상태일 때) */
  readonly publishAt: string;
}

/**
 * 'YYYY-MM-DDTHH:mm' 인가 — 손으로 고친 값이 조용히 통과하지 않게 한다.
 *
 * [왜 Date 로 파싱만 하고 끝내지 않는가] JS 의 Date 는 **넘치는 날짜를 조용히 굴린다**:
 * '2026-02-31' 은 NaN 이 아니라 3월 3일이 된다. 그대로 통과시키면 운영자가 적은 2월 31일이
 * 아무 경고 없이 3월 3일 공개로 저장되고, 목록에는 그가 적지 않은 날짜가 떠 있게 된다.
 * 그래서 되읽어 **같은 값인지 확인**한다.
 */
export function isPublishAtFormat(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (match === null) return false;

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  if (hour === undefined || minute === undefined) return false;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day &&
    parsed.getHours() === hour &&
    parsed.getMinutes() === minute
  );
}

/**
 * 지금 이 항목의 상태 — **저장값 + 지금 시각**에서 만든다(머리말).
 *
 * 초안·보관은 시각과 무관하다: 예약 시각이 남아 있어도 공개되지 않는다. 그래서 그 둘은
 * publishAt 을 보지 않고 그대로 돌려준다 — 보관한 글이 예약 시각이 되어 되살아나면 사고다.
 */
export function effectivePublishStatus(
  schedule: PublishSchedule,
  now: Date = new Date(),
): PublishStatus {
  if (schedule.status !== 'published') return schedule.status;
  if (schedule.publishAt === '') return 'published';
  if (!isPublishAtFormat(schedule.publishAt)) return 'published';
  return new Date(schedule.publishAt).getTime() > now.getTime() ? 'scheduled' : 'published';
}

/** 지금 홈페이지에 보이는가 — 노출 여부를 화면마다 다시 계산하지 않게 한다 */
export function isPubliclyVisible(schedule: PublishSchedule, now: Date = new Date()): boolean {
  return effectivePublishStatus(schedule, now) === 'published';
}

/* ── 입력 가드 (버튼의 disabled 와 저장의 거절이 같은 술어를 읽는다) ────────── */

export const PUBLISH_AT_INVALID = '공개 일시 형식이 올바르지 않아요.';
export const PUBLISH_AT_NOT_PUBLISHED =
  '공개 일시는 발행 상태에서만 지정할 수 있어요. 초안·보관은 예약되지 않아요.';

/**
 * 이 조합을 저장할 수 없는 이유 — 저장할 수 있으면 null.
 *
 * 문자열을 돌려주는 이유는 order.ts 의 orderTransitionBlock 과 같다: 화면이 **왜** 막혔는지를
 * 스스로 지어내지 않게 하려는 것이다. boolean 만 주면 사유가 화면마다 다시 쓰이고 갈라진다.
 */
export function publishScheduleBlock(schedule: PublishSchedule): string | null {
  if (schedule.publishAt === '') return null;
  if (!isPublishAtFormat(schedule.publishAt)) return PUBLISH_AT_INVALID;
  if (schedule.status !== 'published') return PUBLISH_AT_NOT_PUBLISHED;
  return null;
}

export function canSavePublishSchedule(schedule: PublishSchedule): boolean {
  return publishScheduleBlock(schedule) === null;
}
