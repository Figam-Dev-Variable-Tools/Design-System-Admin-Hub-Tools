// 배너 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/content/banners/**)
//
// [백엔드 연동 지점] 함수 시그니처가 프론트 ↔ 백엔드 계약이다. 지금은 픽스처를 돌려준다.
// [이미지 업로드 없음] 이미지는 URL 문자열로만 저장한다 — TODO(backend): POST /api/uploads.
import { wait } from '../../../shared/async';
import { PAGE_SIZE } from './types';
import type { Banner, BannerListResult, BannerPlacement } from './types';

const LATENCY_MS = 400;

type FailureOp = 'all' | 'list' | 'detail' | 'save' | 'delete' | 'reorder';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;
  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

/* ── 픽스처 ──────────────────────────────────────────────────────────────── */

const PLACEMENTS: readonly BannerPlacement[] = ['main', 'sub'];
const TITLE_SEED = ['봄 시즌 기획전', '신상품 입고', '무료배송 이벤트', '브랜드데이'];

function makeBanner(index: number): Banner {
  const placement = PLACEMENTS[index % PLACEMENTS.length] ?? 'main';
  const seq = String(index + 1).padStart(3, '0');
  const month = (index % 12) + 1;
  const mm = String(month).padStart(2, '0');
  return {
    id: `BN-${seq}`,
    title: `${TITLE_SEED[index % TITLE_SEED.length] ?? '배너'} (${seq})`,
    imageUrl: `https://cdn.example.com/banners/${seq}.png`,
    linkUrl: index % 3 === 0 ? '' : `https://example.com/promo/${seq}`,
    placement,
    startAt: `2026-${mm}-01`,
    endAt: `2026-${mm}-28`,
    enabled: index % 4 !== 0,
    order: index + 1,
  };
}

/** 정렬 순서 오름차순 — 서버가 order 기준으로 내려주는 것을 흉내 낸다.
 *  mutable — ON/OFF 토글(setBannerEnabled)·드래그 재정렬(reorderBanners)이 이 상태를 갱신한다. */
export let BANNERS: Banner[] = Array.from({ length: 12 }, (_, index) => makeBanner(index)).sort(
  (a, b) => a.order - b.order,
);

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export interface BannerQuery {
  readonly placement: 'all' | BannerPlacement;
  readonly keyword: string;
  readonly page: number;
}

/** 위치 + 제목 키워드 — 서버 쿼리로 대체될 자리. **테스트가 이 함수를 직접 부른다.** */
export function applyQuery(
  query: BannerQuery,
  source: readonly Banner[] = BANNERS,
): readonly Banner[] {
  const keyword = query.keyword.trim().toLowerCase();
  return source.filter((banner) => {
    if (query.placement !== 'all' && banner.placement !== query.placement) return false;
    if (keyword === '') return true;
    return banner.title.toLowerCase().includes(keyword);
  });
}

// TODO(backend): GET /api/banners?placement=&keyword=&page=&size=
export async function fetchBanners(
  query: BannerQuery,
  signal: AbortSignal,
): Promise<BannerListResult> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');

  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;
  return {
    banners: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
  };
}

// TODO(backend): GET /api/banners/:id
export async function fetchBanner(id: string, signal: AbortSignal): Promise<Banner> {
  await wait(LATENCY_MS, signal);
  failIfRequested('detail');
  const banner = BANNERS.find((item) => item.id === id);
  if (banner === undefined) throw new Error('배너를 찾을 수 없습니다');
  return banner;
}

/* ── 쓰기 계열 ───────────────────────────────────────────────────────────── */

export interface BannerInput {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly placement: BannerPlacement;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  readonly order: number;
}

/* ── ON/OFF 토글 (목록에서 바로 — 낙관적 업데이트) ──────────────────────────── */

/** id 의 ON/OFF 만 바꾼 새 목록. **테스트가 이 순수 함수를 직접 부른다.** */
export function setEnabledById(list: readonly Banner[], id: string, enabled: boolean): Banner[] {
  return list.map((banner) => (banner.id === id ? { ...banner, enabled } : banner));
}

// TODO(backend): PATCH /api/banners/:id/enabled
export async function setBannerEnabled(
  id: string,
  enabled: boolean,
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
  BANNERS = setEnabledById(BANNERS, id, enabled);
}

/* ── 정렬 순서 자동 증분 (새 항목 = 현재 최대 + 1) ─────────────────────────── */

/** 현재 최대 order + 1 (비면 1). **테스트가 이 순수 함수를 직접 부른다.** */
export function nextOrder(list: readonly Banner[]): number {
  return list.reduce((max, banner) => Math.max(max, banner.order), 0) + 1;
}

// TODO(backend): GET /api/banners/next-order
export async function fetchNextBannerOrder(signal?: AbortSignal): Promise<number> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return nextOrder(BANNERS);
}

/* ── 정렬 순서 재정렬 (FAQ 와 동일 규칙 — 드래그/키보드) ───────────────────── */

/**
 * orderedIds 의 항목들을 그들이 차지하던 슬롯 안에서 새 순서로 재배치하고 전체 order 를 1..n 으로
 * 다시 매긴다. 화면에 보이지 않는(다른 페이지) 항목의 상대 순서는 보존된다.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function reorderByIds(list: readonly Banner[], orderedIds: readonly string[]): Banner[] {
  const idSet = new Set(orderedIds);
  const byId = new Map(list.map((banner) => [banner.id, banner]));
  const moved = orderedIds
    .map((id) => byId.get(id))
    .filter((banner): banner is Banner => banner !== undefined);
  let cursor = 0;
  const next = list.map((banner) => (idSet.has(banner.id) ? (moved[cursor++] ?? banner) : banner));
  return next.map((banner, index) => ({ ...banner, order: index + 1 }));
}

// TODO(backend): PUT /api/banners/reorder  { orderedIds }
export async function reorderBanners(
  orderedIds: readonly string[],
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('reorder');
  BANNERS = reorderByIds(BANNERS, orderedIds);
}

// TODO(backend): POST /api/banners
export async function createBanner(input: BannerInput, signal?: AbortSignal): Promise<void> {
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): PUT /api/banners/:id
export async function updateBanner(
  id: string,
  input: BannerInput,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): DELETE /api/banners/:id
export async function deleteBanner(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await wait(LATENCY_MS, signal);
  failIfRequested('delete');
}
