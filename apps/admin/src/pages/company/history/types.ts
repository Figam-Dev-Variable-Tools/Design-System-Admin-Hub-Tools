// 연혁 화면 전용 타입 + 순수 규칙

export interface HistoryItem {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly content: string;
}

/** 어댑터 입력 — 저장 시 숫자로 정규화된 값 */
export interface HistoryInput {
  readonly year: number;
  readonly month: number;
  readonly content: string;
}

/**
 * 연도·월 내림차순 정렬(최근이 위). 같은 연·월은 id 로 안정 정렬.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function sortHistory(list: readonly HistoryItem[]): readonly HistoryItem[] {
  return [...list].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export const CONTENT_MAX_LENGTH = 300;
export const YEAR_MIN = 1900;
export const YEAR_MAX = 2200;
