// 페이지 관리 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다. 지금은 아래 픽스처
// (브라우저 안 더미)를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만** 실제 HTTP 호출로
// 바꾸면 되고, 화면 코드는 한 줄도 바뀌지 않는다. 서버·DB·비즈니스 로직을 여기 구현하지 않는다.
//
// [왜 store 를 노출하는가] 메뉴 관리가 '가리킬 수 있는 페이지' 를 물어야 하는데, 그 답은 여기
// 있다. 다만 메뉴 화면이 이 파일을 직접 import 하면 두 모듈이 한 몸이 된다 — 그래서 조회기의
// 자리는 공통 층에 있고(shared/domain/site-page-catalog.ts), 아래 listCatalogSitePages 를 거기에
// 꽂는 일은 `src/wiring.ts` 가 한다.
//
// [실명 금지] 작성자는 개인 실명이 아니라 운영 조직 역할명이다.
import { wait } from '../../../shared/async';
import { createStoreAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import type { CatalogSitePage } from '../../../shared/domain/site-page-catalog';
import { applyRevert, slugBlock, snapshotOf, sortSitePages, toCatalogSitePage } from './types';
import type { SitePage, SitePageInput } from './types';

export const SITE_PAGE_RESOURCE = 'site-pages';

/** 저장을 기록하는 손 — 백엔드가 붙으면 세션의 운영자 이름이 온다 */
export const PAGE_ACTOR = '콘텐츠 운영팀';

/* ── 픽스처 (표시용 더미 — 가상 회사) ────────────────────────────────────── */

interface PageSeed {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: SitePage['status'];
  readonly publishAt: string;
  readonly firstPublishedAt: string;
  readonly summary: string;
}

const SEEDS: readonly PageSeed[] = [
  {
    id: 'pg-001',
    title: '사업영역',
    slug: 'business',
    status: 'published',
    publishAt: '',
    firstPublishedAt: '2026-03-02T10:00',
    summary: '공간 기획부터 시공 감리까지, 저희가 맡는 일의 범위를 소개합니다.',
  },
  {
    id: 'pg-002',
    title: '공간 기획',
    slug: 'business-planning',
    status: 'published',
    publishAt: '',
    firstPublishedAt: '2026-03-02T10:00',
    summary: '사용자 동선과 운영 시나리오에서 출발해 도면을 만듭니다.',
  },
  {
    id: 'pg-003',
    title: '시공 관리',
    slug: 'business-construction',
    status: 'published',
    publishAt: '',
    firstPublishedAt: '2026-03-10T09:00',
    summary: '설계 의도가 현장에서 그대로 구현되도록 공정을 관리합니다.',
  },
  {
    id: 'pg-004',
    title: '데이터 분석',
    slug: 'business-analytics',
    status: 'published',
    publishAt: '2026-12-01T09:00',
    firstPublishedAt: '',
    summary: '운영 데이터를 모아 다음 공간의 근거로 만듭니다.',
  },
  {
    id: 'pg-005',
    title: '채용 안내',
    slug: 'recruit',
    status: 'draft',
    publishAt: '',
    firstPublishedAt: '',
    summary: '함께 일할 분을 찾습니다. 직무와 절차를 정리하고 있습니다.',
  },
  {
    id: 'pg-006',
    title: '2025 브랜드 소개',
    slug: 'brand-2025',
    status: 'archived',
    publishAt: '',
    firstPublishedAt: '2025-01-05T09:00',
    summary: '지난해 브랜드 소개 페이지입니다. 지금은 보관 상태입니다.',
  },
];

function bodyOf(seed: PageSeed): string {
  return (
    `<h2>${seed.title}</h2>\n<p>${seed.summary}</p>\n` +
    '<p>자세한 내용이 필요하시면 문의 폼으로 알려 주세요. 담당자가 확인 후 회신드립니다.</p>'
  );
}

function makePage(seed: PageSeed): SitePage {
  const savedAt = seed.firstPublishedAt === '' ? '2026-06-01T09:00' : seed.firstPublishedAt;
  const base: SitePage = {
    id: seed.id,
    title: seed.title,
    slug: seed.slug,
    status: seed.status,
    publishAt: seed.publishAt,
    body: bodyOf(seed),
    firstPublishedAt: seed.firstPublishedAt,
    previousSlugs: seed.id === 'pg-006' ? ['brand'] : [],
    previewToken: '',
    versions: [],
    updatedAt: savedAt,
  };
  return { ...base, versions: [snapshotOf(base, savedAt, PAGE_ACTOR, '최초 등록')] };
}

/** 픽스처 원본 — mutable. 등록·수정·삭제·되돌리기가 이 배열을 갱신한다 */
let PAGES: readonly SitePage[] = sortSitePages(SEEDS.map(makePage));

let seq = SEEDS.length;

/* ── 저장소 표면 (어댑터와 배선이 함께 읽는다) ───────────────────────────── */

export function listSitePages(): readonly SitePage[] {
  return PAGES;
}

export function getSitePage(id: string): SitePage {
  const page = PAGES.find((item) => item.id === id);
  if (page === undefined) throw new Error('페이지를 찾을 수 없습니다.');
  return page;
}

/**
 * 슬러그 충돌을 **저장 경로에서** 막는다 (EXC-07).
 *
 * 폼의 zod 스키마는 자기 입력만 본다 — 다른 페이지가 그 주소를 쓰는지는 알지 못한다. 그래서
 * 422 로 되돌려 RHF 가 그 입력에 인라인 오류를 꽂게 한다(폼 상단 배너가 아니라 슬러그 칸이다).
 */
function assertSlugFree(slug: string, selfId: string | null): void {
  const others = PAGES.filter((page) => page.id !== selfId);
  const blocked = slugBlock(slug, others);
  if (blocked === null) return;
  throw new HttpError(HTTP_STATUS.unprocessable, blocked, {
    violations: [{ field: 'slug', message: blocked }],
  });
}

export function addSitePage(input: SitePageInput): void {
  assertSlugFree(input.slug, null);
  seq += 1;
  const id = `pg-${String(seq).padStart(3, '0')}`;
  const created: SitePage = { id, ...input };
  PAGES = sortSitePages([
    ...PAGES,
    { ...created, versions: [snapshotOf(created, input.updatedAt, PAGE_ACTOR, '최초 등록')] },
  ]);
}

export function updateSitePage(id: string, input: SitePageInput): void {
  assertSlugFree(input.slug, id);
  PAGES = sortSitePages(PAGES.map((page) => (page.id === id ? { ...page, ...input } : page)));
}

export function removeSitePage(id: string): void {
  PAGES = PAGES.filter((page) => page.id !== id);
}

/** 되돌리기·미리보기 토큰처럼 폼을 거치지 않는 갱신 — 계산된 결과를 그대로 심는다 */
export function replaceSitePage(next: SitePage): void {
  PAGES = sortSitePages(PAGES.map((page) => (page.id === next.id ? next : page)));
}

/* ── 배선용 조회기 (메뉴 관리가 읽는다 — src/wiring.ts 가 꽂는다) ─────────── */

// TODO(backend): GET /api/site-pages?fields=id,title,slug,published
export function listCatalogSitePages(): readonly CatalogSitePage[] {
  const now = new Date();
  return PAGES.map((page) => toCatalogSitePage(page, now));
}

/* ── 폼을 거치지 않는 두 조작 (되돌리기 · 미리보기 링크) ─────────────────── */

// TODO(backend): POST /api/site-pages/:id/revert  { versionId }
export async function revertSitePageVersion(
  id: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SITE_PAGE_RESOURCE, 'save');
  // 가드는 순수 규칙이 갖는다 — 화면의 버튼과 여기가 같은 함수를 읽는다(applyRevert 가 던진다)
  replaceSitePage(applyRevert(getSitePage(id), versionId, stampNow(), PAGE_ACTOR));
}

/**
 * 초안 미리보기 링크를 발급한다 — **주소 문자열을 만들어 보관할 뿐**이다.
 *
 * 실제로 그 주소를 열어 주는 것은 홈페이지(B2C)와 백엔드의 일이다. 여기서 열리는 척하면
 * 운영자는 공유한 링크가 죽었다는 사실을 상대방에게 듣고서야 알게 된다.
 * TODO(backend): POST /api/site-pages/:id/preview-token → { token, expiresAt }
 */
export async function issuePreviewToken(id: string, signal?: AbortSignal): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SITE_PAGE_RESOURCE, 'save');
  replaceSitePage({ ...getSitePage(id), previewToken: crypto.randomUUID() });
}

/** 'YYYY-MM-DDTHH:mm' — 저장 시각의 표기를 한 곳에서만 만든다(폼도 이것을 쓴다) */
export function stampNow(): string {
  return new Date().toISOString().slice(0, 16);
}

/* ── CRUD 어댑터 ─────────────────────────────────────────────────────────── */

// TODO(backend): GET/POST /api/site-pages · GET/PUT/DELETE /api/site-pages/:id
export const sitePageAdapter = createStoreAdapter<SitePage, SitePageInput>({
  scope: SITE_PAGE_RESOURCE,
  list: listSitePages,
  getOne: getSitePage,
  add: addSitePage,
  update: updateSitePage,
  remove: removeSitePage,
});
