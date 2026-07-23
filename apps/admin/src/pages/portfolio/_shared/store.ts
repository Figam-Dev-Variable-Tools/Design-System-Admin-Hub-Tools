// 포트폴리오 도메인 모델 · 픽스처 · 순수 규칙
//
// [왜 섹션 내부 _shared 인가] 포트폴리오 화면과 카테고리 화면이 같은 상태를 공유한다: 포트폴리오
// 항목은 카테고리를 참조하고, 카테고리 삭제는 그 카테고리를 쓰는 항목이 있으면 막힌다(사용 중 차단).
// 두 data-source 가 서로를 import 하면 순환이 되므로 픽스처와 순수 규칙을 이 잎 모듈 한 곳에 모은다.
// (pages/portfolio 한 페이지 안이라 페이지 간 결합이 아니다 — page-coupling 은 pages/<첫 세그먼트> 단위다.)
//
// [백엔드 없음] 실제 네트워크 0건 — mutable 배열을 아래 쓰기 함수가 갱신한다. 연동 지점은 각 화면
// data-source.ts 의 // TODO(backend) 주석이다. 정본이 서버로 옮겨가면 이 배열이 서버 상태로 바뀐다.

/* ── 타입 ─────────────────────────────────────────────────────────────────── */

export interface PortfolioCategory {
  readonly id: string;
  readonly label: string;
}

/** 카테고리 + 사용 중 항목 수 — 삭제 차단 판단·목록 배지에 쓴다 */
export interface PortfolioCategoryUsage extends PortfolioCategory {
  readonly itemCount: number;
}

export interface PortfolioItem {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  /** 조회 시점의 카테고리 라벨(비정규화) — 목록 배지에 바로 쓴다 */
  readonly categoryLabel: string;
  /** 고객사 — 가상 표기(실명 아님) */
  readonly client: string;
  readonly summary: string;
  /** 대표 이미지 — 목록엔 넣지 않는다(상세/폼 전용) */
  readonly coverImageUrl: string;
  /** 본문 이미지 다중 */
  readonly imageUrls: readonly string[];
  /** 노출 여부(이진) — 목록에서 바로 토글한다 */
  readonly published: boolean;
  /** 수행·등록 일자 'YYYY-MM-DD' */
  readonly date: string;
}

export interface PortfolioItemInput {
  readonly title: string;
  readonly categoryId: string;
  readonly client: string;
  readonly summary: string;
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly published: boolean;
  readonly date: string;
}

export const MAX_PORTFOLIO_IMAGES = 10;
export const PORTFOLIO_TITLE_MAX = 120;
export const PORTFOLIO_SUMMARY_MAX = 500;
export const PORTFOLIO_CLIENT_MAX = 60;

/** 카테고리 필터의 '전체' 값 */
export const PORTFOLIO_FILTER_ALL = 'all';

/* ── 픽스처 (가상 데이터 — 실명 없음) ─────────────────────────────────────── */

let categories: PortfolioCategory[] = [
  { id: 'residential', label: '주거 공간' },
  { id: 'office', label: '오피스' },
  { id: 'commercial', label: '상업 공간' },
  { id: 'exhibition', label: '전시·문화' },
];

let items: PortfolioItem[] = [
  {
    id: 'pf-1',
    title: '한빛 리버뷰 펜트하우스 리모델링',
    categoryId: 'residential',
    categoryLabel: '주거 공간',
    client: '한빛개발',
    summary: '한강 조망 펜트하우스의 생활 동선을 재구성하고 자연광을 끌어들였습니다.',
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: ['/fixtures/placeholder-image.svg'],
    published: true,
    date: '2024-05-20',
  },
  {
    id: 'pf-2',
    title: '가온 스마트오피스 라운지',
    categoryId: 'office',
    categoryLabel: '오피스',
    client: '가온테크',
    summary: '집중과 협업이 공존하는 하이브리드 업무 라운지를 설계했습니다.',
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: [],
    published: true,
    date: '2024-02-11',
  },
  {
    id: 'pf-3',
    title: '온담 플래그십 스토어',
    categoryId: 'commercial',
    categoryLabel: '상업 공간',
    client: '온담리테일',
    summary: '브랜드 서사를 공간 동선으로 풀어낸 플래그십 스토어입니다.',
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: ['/fixtures/placeholder-image.svg'],
    published: false,
    date: '2023-11-03',
  },
  {
    id: 'pf-4',
    title: '누리 미디어아트 전시관',
    categoryId: 'exhibition',
    categoryLabel: '전시·문화',
    client: '누리문화재단',
    summary: '몰입형 미디어아트를 위한 암전·음향·동선 통합 전시 공간입니다.',
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: [],
    published: true,
    date: '2023-07-19',
  },
];

let categorySeq = categories.length;
let itemSeq = items.length;

/* ── 순수 규칙 (테스트가 직접 부른다) ─────────────────────────────────────── */

/** 일자 내림차순(최근이 위). 같은 날짜는 id 로 안정 정렬. */
export function sortPortfolioItems(list: readonly PortfolioItem[]): readonly PortfolioItem[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 카테고리 필터('전체'면 전체) */
export function filterPortfolioItems(
  list: readonly PortfolioItem[],
  categoryId: string,
): readonly PortfolioItem[] {
  if (categoryId === PORTFOLIO_FILTER_ALL) return list;
  return list.filter((item) => item.categoryId === categoryId);
}

/** 전체 + 카테고리별 건수 — 좌측 필터 배지 */
export function countPortfolioByCategory(list: readonly PortfolioItem[]): Record<string, number> {
  const counts: Record<string, number> = { [PORTFOLIO_FILTER_ALL]: list.length };
  for (const category of categories) counts[category.id] = 0;
  for (const item of list) counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
  return counts;
}

/** 특정 카테고리를 쓰는 항목 수 — 카테고리 삭제 차단 판단 */
export function countItemsUsingCategory(
  categoryId: string,
  list: readonly PortfolioItem[],
): number {
  return list.filter((item) => item.categoryId === categoryId).length;
}

const labelOf = (categoryId: string): string =>
  categories.find((category) => category.id === categoryId)?.label ?? categoryId;

/* ── 항목 저장소 API (data-source 어댑터가 부른다) ────────────────────────── */

export function listItems(): readonly PortfolioItem[] {
  return sortPortfolioItems(items);
}

export function getItem(id: string): PortfolioItem {
  const found = items.find((item) => item.id === id);
  if (found === undefined) throw new Error('포트폴리오를 찾을 수 없어요');
  return found;
}

export function addItem(input: PortfolioItemInput): void {
  itemSeq += 1;
  items = [
    ...items,
    { id: `pf-${String(itemSeq)}`, ...input, categoryLabel: labelOf(input.categoryId) },
  ];
}

export function updateItem(id: string, input: PortfolioItemInput): void {
  items = items.map((item) =>
    item.id === id ? { ...item, ...input, categoryLabel: labelOf(input.categoryId) } : item,
  );
}

export function removeItem(id: string): void {
  items = items.filter((item) => item.id !== id);
}

/* ── 카테고리 저장소 API ──────────────────────────────────────────────────── */

export function listCategories(): readonly PortfolioCategory[] {
  return categories;
}

/** 카테고리 + 사용 중 항목 수 — 목록/삭제 차단에 쓴다 */
export function listCategoryUsage(): readonly PortfolioCategoryUsage[] {
  return categories.map((category) => ({
    ...category,
    itemCount: countItemsUsingCategory(category.id, items),
  }));
}

export function getCategoryUsage(id: string): PortfolioCategoryUsage {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) throw new Error('카테고리를 찾을 수 없어요');
  return { ...found, itemCount: countItemsUsingCategory(found.id, items) };
}

export function addCategory(label: string): void {
  categorySeq += 1;
  categories = [...categories, { id: `pf-cat-${String(categorySeq)}`, label: label.trim() }];
}

export function updateCategory(id: string, label: string): void {
  const trimmed = label.trim();
  categories = categories.map((category) =>
    category.id === id ? { ...category, label: trimmed } : category,
  );
  // 라벨 변경을 항목의 비정규화 라벨에도 반영한다(백엔드가 붙으면 서버가 정합성을 맡는다)
  items = items.map((item) =>
    item.categoryId === id ? { ...item, categoryLabel: trimmed } : item,
  );
}

/** 사용 중이면 삭제하지 않는다(서버는 409 로 막는다). 프론트도 버튼을 잠근다. */
export function removeCategory(id: string): void {
  if (countItemsUsingCategory(id, items) > 0) {
    throw new Error('사용 중인 카테고리는 삭제할 수 없어요.');
  }
  categories = categories.filter((category) => category.id !== id);
}
