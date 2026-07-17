// 성공 사례 화면 전용 타입 + 순수 규칙
//
// 포트폴리오 항목과 달리 성공 사례는 관리형 카테고리가 아니라 **고정 업종 enum**을 쓴다
// (다중 상태 → 배지). 목록엔 이미지 열을 넣지 않는다.
import type { StatusTone } from '../../../shared/ui';

export type CaseIndustry = 'manufacturing' | 'retail' | 'finance' | 'public' | 'healthcare' | 'it';

export interface CaseStudy {
  readonly id: string;
  readonly title: string;
  readonly industry: CaseIndustry;
  /** 고객사 — 가상 표기(실명 아님) */
  readonly client: string;
  /** 과제 */
  readonly challenge: string;
  /** 해결 */
  readonly solution: string;
  /** 성과 — 목록에 요약으로 보인다 */
  readonly result: string;
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly published: boolean;
  readonly date: string;
}

export interface CaseStudyInput {
  readonly title: string;
  readonly industry: CaseIndustry;
  readonly client: string;
  readonly challenge: string;
  readonly solution: string;
  readonly result: string;
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly published: boolean;
  readonly date: string;
}

export const MAX_CASE_IMAGES = 10;
export const CASE_TITLE_MAX = 120;
export const CASE_CLIENT_MAX = 60;
export const CASE_TEXT_MAX = 500;

interface IndustryOption {
  readonly id: CaseIndustry;
  readonly label: string;
  readonly tone: StatusTone;
}

export const CASE_INDUSTRY_OPTIONS: readonly IndustryOption[] = [
  { id: 'manufacturing', label: '제조', tone: 'neutral' },
  { id: 'retail', label: '유통', tone: 'info' },
  { id: 'finance', label: '금융', tone: 'success' },
  { id: 'public', label: '공공', tone: 'warning' },
  { id: 'healthcare', label: '의료', tone: 'info' },
  { id: 'it', label: 'IT·서비스', tone: 'success' },
];

export function industryLabel(industry: CaseIndustry): string {
  return CASE_INDUSTRY_OPTIONS.find((option) => option.id === industry)?.label ?? industry;
}

export function industryTone(industry: CaseIndustry): StatusTone {
  return CASE_INDUSTRY_OPTIONS.find((option) => option.id === industry)?.tone ?? 'neutral';
}

export const CASE_FILTER_ALL = 'all';
export type CaseFilter = typeof CASE_FILTER_ALL | CaseIndustry;

/** 일자 내림차순(최근이 위). 같은 날짜는 id 로 안정 정렬. **테스트가 직접 부른다.** */
export function sortCaseStudies(list: readonly CaseStudy[]): readonly CaseStudy[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 업종 필터('전체'면 전체). **테스트가 직접 부른다.** */
export function filterCaseStudies(
  list: readonly CaseStudy[],
  filter: CaseFilter,
): readonly CaseStudy[] {
  if (filter === CASE_FILTER_ALL) return list;
  return list.filter((item) => item.industry === filter);
}

/** 항목 → 폼/쓰기 입력(id 제외). 목록 인라인 토글과 폼이 함께 쓴다. */
export function toCaseStudyInput(item: CaseStudy): CaseStudyInput {
  return {
    title: item.title,
    industry: item.industry,
    client: item.client,
    challenge: item.challenge,
    solution: item.solution,
    result: item.result,
    coverImageUrl: item.coverImageUrl,
    imageUrls: [...item.imageUrls],
    published: item.published,
    date: item.date,
  };
}
