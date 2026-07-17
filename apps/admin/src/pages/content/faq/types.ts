// FAQ 화면 **전용** 타입
//
// 공지사항과 같은 결: 도메인 모델은 여기(페이지 전용)에 두고, 공통으로 승격한 것은 도메인을
// 모르는 UI(StatusBadge·FormField·TextareaField…)뿐이다.
import type { StatusTone } from '../../../shared/ui';

export interface FaqCategory {
  readonly id: string;
  readonly label: string;
}

/** 카테고리 + 사용 중인 FAQ 수 — 관리 모달이 삭제 차단 판단에 쓴다(오너 피드백 ④) */
export interface FaqCategoryUsage {
  readonly id: string;
  readonly label: string;
  /** 이 카테고리에 속한 FAQ 수 — 1건 이상이면 삭제를 막는다 */
  readonly faqCount: number;
}

// [승격됨] moveArrayItem(재정렬의 원자 연산)은 배너 목록이 두 번째 소비자가 되며 shared/ui 로 올렸다.
// 페이지는 `import { moveArrayItem } from '../../../shared/ui'` 로 가져온다.

/** 목록 행 — 답변(answer)은 상세에서만 내려온다 */
export interface FaqSummary {
  readonly id: string;
  readonly question: string;
  /** 카테고리 id */
  readonly categoryId: string;
  /** 카테고리 라벨 (목록 표시용 — 서버가 조인해 내려준다) */
  readonly categoryLabel: string;
  /** 노출 여부 — 끄면 사용자 화면에서 숨는다 */
  readonly visible: boolean;
  /** 정렬 순서 — 작을수록 위에 온다 */
  readonly order: number;
}

/** 상세 — 목록 행 + 답변 */
export interface Faq extends FaqSummary {
  readonly answer: string;
}

/** 노출 여부의 색 의도 — 노출=성공, 숨김=중립 */
export function visibilityTone(visible: boolean): StatusTone {
  return visible ? 'success' : 'neutral';
}

export function visibilityLabel(visible: boolean): string {
  return visible ? '노출' : '숨김';
}

/* ── 필터 ────────────────────────────────────────────────────────────────── */

/** 카테고리 필터의 '전체' 값 — 카테고리 id 와 섞이지 않게 상수로 둔다 */
export const CATEGORY_ALL = 'all';

export type VisibilityFilter = 'all' | 'visible' | 'hidden';

interface FilterDef<T> {
  readonly id: T;
  readonly label: string;
}

export const VISIBILITY_FILTERS: readonly FilterDef<VisibilityFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'visible', label: '노출' },
  { id: 'hidden', label: '숨김' },
];

/* ── 조회 결과 ───────────────────────────────────────────────────────────── */

export interface VisibilityCounts {
  readonly all: number;
  readonly visible: number;
  readonly hidden: number;
}

export interface FaqListResult {
  readonly faqs: readonly FaqSummary[];
  readonly visibilityCounts: VisibilityCounts;
  /** 카테고리별 건수 — 좌측 필터 배지 (키: 카테고리 id, CATEGORY_ALL 포함) */
  readonly categoryCounts: Record<string, number>;
  readonly total: number;
}

export const PAGE_SIZE = 10;

export const QUESTION_MAX_LENGTH = 200;
export const ANSWER_MAX_LENGTH = 5000;
/** 카테고리명 최대 길이 — 모달 검증과 안내 문구가 함께 읽는다 */
export const CATEGORY_NAME_MAX_LENGTH = 30;
