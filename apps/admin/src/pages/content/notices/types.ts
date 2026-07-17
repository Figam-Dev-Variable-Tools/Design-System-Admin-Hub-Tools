// 공지사항 화면 **전용** 타입
//
// [도메인의 자리] 공지사항은 이 화면(과 하위 상세/등록)에서만 쓰는 콘텐츠다 — 다른 페이지가
// 가로질러 쓰지 않는다. 그래서 도메인 모델을 여기 둔다(회원처럼 shared/domain 으로 올리지 않는다).
// 공통으로 승격한 것은 **도메인을 모르는** UI 뿐이다(StatusBadge·FormField·TextareaField…).
//
// [상태 → 색] status/category 를 StatusBadge 의 tone(색 의도)으로 옮기는 규칙은 도메인 지식이다 —
// 그래서 tone 맵이 여기 산다. 공통 배지는 '게시'가 초록이어야 한다는 걸 알지 못한다.
import type { StatusTone } from '../../../shared/ui';

/** 분류 — 공지/이벤트/점검 */
export type NoticeCategory = 'notice' | 'event' | 'maintenance';

/** 게시 상태 — 게시/임시저장/예약 */
export type NoticeStatus = 'published' | 'draft' | 'scheduled';

export const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  notice: '공지',
  event: '이벤트',
  maintenance: '점검',
};

export const STATUS_LABEL: Record<NoticeStatus, string> = {
  published: '게시',
  draft: '임시저장',
  scheduled: '예약',
};

/** 게시 상태의 색 의도 — 게시=성공, 임시저장=중립, 예약=정보 */
export const STATUS_TONE: Record<NoticeStatus, StatusTone> = {
  published: 'success',
  draft: 'neutral',
  scheduled: 'info',
};

/** 목록 행 — 본문(body)은 상세에서만 내려온다 */
export interface NoticeSummary {
  readonly id: string;
  readonly title: string;
  readonly category: NoticeCategory;
  readonly status: NoticeStatus;
  /** 상단 고정 여부 — 목록 맨 위에 고정으로 노출된다 */
  readonly pinned: boolean;
  readonly author: string;
  /** 게시일(예약이면 예약 시각) — ISO date-time */
  readonly publishedAtIso: string;
  readonly views: number;
}

/** 상세 — 목록 행 + 본문 */
export interface Notice extends NoticeSummary {
  readonly body: string;
}

/* ── 필터 ────────────────────────────────────────────────────────────────── */

export type CategoryFilter = NoticeCategory | 'all';
export type StatusFilter = NoticeStatus | 'all';

interface FilterDef<T> {
  readonly id: T;
  readonly label: string;
}

export const CATEGORY_FILTERS: readonly FilterDef<CategoryFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'notice', label: '공지' },
  { id: 'event', label: '이벤트' },
  { id: 'maintenance', label: '점검' },
];

export const STATUS_FILTERS: readonly FilterDef<StatusFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'published', label: '게시' },
  { id: 'draft', label: '임시저장' },
  { id: 'scheduled', label: '예약' },
];

/** 폼 select 의 선택지 (전체 옵션이 없는 순수 값) */
export const CATEGORY_OPTIONS: readonly FilterDef<NoticeCategory>[] = [
  { id: 'notice', label: '공지' },
  { id: 'event', label: '이벤트' },
  { id: 'maintenance', label: '점검' },
];

export const STATUS_OPTIONS: readonly FilterDef<NoticeStatus>[] = [
  { id: 'published', label: '게시' },
  { id: 'draft', label: '임시저장' },
  { id: 'scheduled', label: '예약' },
];

/* ── 조회 결과 ───────────────────────────────────────────────────────────── */

export interface CategoryCounts {
  readonly all: number;
  readonly notice: number;
  readonly event: number;
  readonly maintenance: number;
}

export interface StatusCounts {
  readonly all: number;
  readonly published: number;
  readonly draft: number;
  readonly scheduled: number;
}

export interface NoticeListResult {
  readonly notices: readonly NoticeSummary[];
  readonly categoryCounts: CategoryCounts;
  readonly statusCounts: StatusCounts;
  /** 필터/검색 적용 후 전체 건수 (페이지네이션용) */
  readonly total: number;
}

export const PAGE_SIZE = 10;

/** 본문 최대 길이 — 카운터와 검증이 함께 읽는다 */
export const TITLE_MAX_LENGTH = 100;
export const BODY_MAX_LENGTH = 5000;
