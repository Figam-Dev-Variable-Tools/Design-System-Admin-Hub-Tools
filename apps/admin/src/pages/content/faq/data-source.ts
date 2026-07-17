// FAQ 데이터 소스 어댑터
//
// [백엔드 연동 지점] 함수 시그니처가 프론트 ↔ 백엔드 계약이다. 지금은 픽스처를 돌려준다.
// 백엔드가 붙으면 **이 파일의 함수 본문만** 실제 HTTP 로 바꾸고 화면 코드는 그대로 둔다.
import { wait } from '../../../shared/async';
import { CATEGORY_ALL, PAGE_SIZE } from './types';
import type {
  Faq,
  FaqCategory,
  FaqCategoryUsage,
  FaqListResult,
  FaqSummary,
  VisibilityCounts,
} from './types';

const LATENCY_MS = 400;

/**
 * 실패 경로 재현 스위치 (개발용) — 다른 어댑터와 같은 규약.
 *   ?fail=list · ?fail=detail · ?fail=save · ?fail=delete · ?fail=category · ?fail=all
 */
type FailureOp = 'all' | 'list' | 'detail' | 'save' | 'delete' | 'category' | 'reorder';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;
  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

/* ── 픽스처 ──────────────────────────────────────────────────────────────── */

// mutable — 카테고리 생성/삭제가 이 픽스처를 갱신한다(백엔드가 붙으면 서버 상태가 정본).
export let FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'account', label: '계정' },
  { id: 'payment', label: '결제' },
  { id: 'delivery', label: '배송' },
  { id: 'etc', label: '기타' },
];

const DEFAULT_CATEGORY: FaqCategory = { id: 'etc', label: '기타' };

const QUESTION_SEED: Record<string, string> = {
  account: '비밀번호를 잊어버렸어요',
  payment: '결제 수단은 무엇이 있나요',
  delivery: '배송은 얼마나 걸리나요',
  etc: '탈퇴는 어떻게 하나요',
};

function makeFaq(index: number): Faq {
  const category = FAQ_CATEGORIES[index % FAQ_CATEGORIES.length] ?? DEFAULT_CATEGORY;
  const seq = String(index + 1).padStart(3, '0');
  return {
    id: `FAQ-${seq}`,
    question: `${QUESTION_SEED[category.id] ?? '자주 묻는 질문'} (${seq})`,
    categoryId: category.id,
    categoryLabel: category.label,
    visible: index % 5 !== 0,
    order: index + 1,
    answer:
      `${QUESTION_SEED[category.id] ?? '문의'} 에 대한 답변입니다.\n\n` +
      '고객센터 운영 시간(평일 09:00~18:00)에 1:1 문의를 남기시면 순차적으로 안내해 드립니다.',
  };
}

/** 정렬 순서 오름차순 — 서버가 order 기준으로 내려주는 것을 흉내 낸다.
 *  mutable — 드래그/키보드 재정렬(reorderFaqs)이 이 순서를 갱신한다. */
export let FAQS: Faq[] = Array.from({ length: 20 }, (_, index) => makeFaq(index)).sort(
  (a, b) => a.order - b.order,
);

function toSummary(faq: Faq): FaqSummary {
  return {
    id: faq.id,
    question: faq.question,
    categoryId: faq.categoryId,
    categoryLabel: faq.categoryLabel,
    visible: faq.visible,
    order: faq.order,
  };
}

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export interface FaqQuery {
  /** 카테고리 id 또는 CATEGORY_ALL */
  readonly categoryId: string;
  readonly visibility: 'all' | 'visible' | 'hidden';
  readonly keyword: string;
  readonly page: number;
}

function countByVisibility(faqs: readonly Faq[]): VisibilityCounts {
  return {
    all: faqs.length,
    visible: faqs.filter((faq) => faq.visible).length,
    hidden: faqs.filter((faq) => !faq.visible).length,
  };
}

function countByCategory(faqs: readonly Faq[]): Record<string, number> {
  const counts: Record<string, number> = { [CATEGORY_ALL]: faqs.length };
  for (const category of FAQ_CATEGORIES) counts[category.id] = 0;
  for (const faq of faqs) counts[faq.categoryId] = (counts[faq.categoryId] ?? 0) + 1;
  return counts;
}

/**
 * 카테고리 + 노출 여부(AND) + 질문 키워드 — 서버 쿼리로 대체될 자리.
 * **테스트가 이 함수를 직접 부른다.**
 */
export function applyQuery(query: FaqQuery, source: readonly Faq[] = FAQS): readonly Faq[] {
  const keyword = query.keyword.trim().toLowerCase();
  return source.filter((faq) => {
    if (query.categoryId !== CATEGORY_ALL && faq.categoryId !== query.categoryId) return false;
    if (query.visibility === 'visible' && !faq.visible) return false;
    if (query.visibility === 'hidden' && faq.visible) return false;
    if (keyword === '') return true;
    return faq.question.toLowerCase().includes(keyword);
  });
}

// TODO(backend): GET /api/faq-categories
export async function fetchFaqCategories(signal: AbortSignal): Promise<readonly FaqCategory[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return FAQ_CATEGORIES;
}

// TODO(backend): GET /api/faqs?categoryId=&visibility=&keyword=&page=&size=
export async function fetchFaqs(query: FaqQuery, signal: AbortSignal): Promise<FaqListResult> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');

  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    faqs: filtered.slice(start, start + PAGE_SIZE).map(toSummary),
    visibilityCounts: countByVisibility(FAQS),
    categoryCounts: countByCategory(FAQS),
    total: filtered.length,
  };
}

// TODO(backend): GET /api/faqs/:id
export async function fetchFaq(id: string, signal: AbortSignal): Promise<Faq> {
  await wait(LATENCY_MS, signal);
  failIfRequested('detail');

  const faq = FAQS.find((item) => item.id === id);
  if (faq === undefined) throw new Error('FAQ 를 찾을 수 없습니다');
  return faq;
}

/* ── 쓰기 계열 ───────────────────────────────────────────────────────────── */

export interface FaqInput {
  readonly question: string;
  readonly categoryId: string;
  readonly answer: string;
  readonly visible: boolean;
  readonly order: number;
}

export interface FaqCategoryInput {
  readonly name: string;
}

// TODO(backend): POST /api/faq-categories
export async function createFaqCategory(
  input: FaqCategoryInput,
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('category');
  const id = `faqcat-${String(FAQ_CATEGORIES.length + 1)}`;
  FAQ_CATEGORIES = [...FAQ_CATEGORIES, { id, label: input.name.trim() }];
}

/* ── 카테고리 사용량 · 삭제 (오너 피드백 ④) ─────────────────────────────────── */

/** 카테고리별 사용 중인 FAQ 수 — 삭제 차단 판단에 쓴다. **테스트가 이 함수를 직접 부른다.** */
export function countFaqsByCategory(source: readonly Faq[] = FAQS): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const category of FAQ_CATEGORIES) counts[category.id] = 0;
  for (const faq of source) counts[faq.categoryId] = (counts[faq.categoryId] ?? 0) + 1;
  return counts;
}

// TODO(backend): GET /api/faq-categories  (각 카테고리의 사용 중 FAQ 수 포함)
export async function fetchFaqCategoryUsage(
  signal: AbortSignal,
): Promise<readonly FaqCategoryUsage[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  const counts = countFaqsByCategory();
  return FAQ_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    faqCount: counts[category.id] ?? 0,
  }));
}

// TODO(backend): DELETE /api/faq-categories/:id
export async function deleteFaqCategory(id: string, signal?: AbortSignal): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('category');
  // 안전 기본값: 사용 중인 카테고리는 삭제하지 않는다(서버는 409 로 막는다). 프론트도 버튼을 잠근다.
  if (FAQS.some((faq) => faq.categoryId === id)) {
    throw new Error('사용 중인 카테고리는 삭제할 수 없습니다.');
  }
  FAQ_CATEGORIES = FAQ_CATEGORIES.filter((category) => category.id !== id);
}

/* ── 정렬 순서 재정렬 (오너 피드백 ③) ───────────────────────────────────────── */

/**
 * orderedIds 에 담긴 항목들을, 그들이 원래 차지하던 전역 슬롯 안에서 그 순서대로 재배치하고
 * 전체 order 를 1..n 으로 다시 매긴다. 화면에 보이지 않는(다른 페이지) 항목의 상대 순서는 보존된다.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function reorderByIds(list: readonly Faq[], orderedIds: readonly string[]): Faq[] {
  const idSet = new Set(orderedIds);
  const byId = new Map(list.map((faq) => [faq.id, faq]));
  const moved = orderedIds.map((id) => byId.get(id)).filter((faq): faq is Faq => faq !== undefined);
  let cursor = 0;
  const next = list.map((faq) => (idSet.has(faq.id) ? (moved[cursor++] ?? faq) : faq));
  return next.map((faq, index) => ({ ...faq, order: index + 1 }));
}

// TODO(backend): PUT /api/faqs/reorder  { orderedIds }
export async function reorderFaqs(
  orderedIds: readonly string[],
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('reorder');
  FAQS = reorderByIds(FAQS, orderedIds);
}

/* ── 노출 여부 토글 (목록에서 바로 — 낙관적 업데이트) ────────────────────────── */

/** id 의 노출 여부만 바꾼 새 목록. **테스트가 이 순수 함수를 직접 부른다.** */
export function setVisibilityById(list: readonly Faq[], id: string, visible: boolean): Faq[] {
  return list.map((faq) => (faq.id === id ? { ...faq, visible } : faq));
}

// TODO(backend): PATCH /api/faqs/:id/visibility
export async function setFaqVisibility(
  id: string,
  visible: boolean,
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
  FAQS = setVisibilityById(FAQS, id, visible);
}

/* ── 정렬 순서 자동 증분 (새 항목 = 현재 최대 + 1) ─────────────────────────── */

/** 현재 최대 order + 1 (비면 1). **테스트가 이 순수 함수를 직접 부른다.** */
export function nextOrder(list: readonly Faq[]): number {
  return list.reduce((max, faq) => Math.max(max, faq.order), 0) + 1;
}

// TODO(backend): GET /api/faqs/next-order  (또는 목록 응답에 최대 order 포함)
export async function fetchNextFaqOrder(signal?: AbortSignal): Promise<number> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return nextOrder(FAQS);
}

// TODO(backend): POST /api/faqs
export async function createFaq(input: FaqInput, signal?: AbortSignal): Promise<void> {
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): PUT /api/faqs/:id
export async function updateFaq(id: string, input: FaqInput, signal?: AbortSignal): Promise<void> {
  void id;
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): DELETE /api/faqs/:id
export async function deleteFaq(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await wait(LATENCY_MS, signal);
  failIfRequested('delete');
}
