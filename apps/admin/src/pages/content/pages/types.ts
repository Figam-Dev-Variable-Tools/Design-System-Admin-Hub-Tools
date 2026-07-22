// 페이지 관리 화면 전용 타입 + 순수 규칙
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 만드는 화면인가] 회사소개 홈페이지의 **임의 페이지**다. 회사 정보·연혁·오시는 길처럼
// 미리 정해진 화면과 달리, '사업영역 > 하위 3페이지' 같은 구조는 운영자가 그때그때 만든다.
//
// [도메인의 자리] 페이지 본체는 이 화면(과 하위 등록/수정)의 것이다 — 그래서 여기 산다.
// 다만 **메뉴 관리가 이 페이지들을 가리킨다**. 그 방향의 참조는 모듈을 가로지르므로 계약을
// 공통 층에 두었다: shared/domain/site-page-catalog.ts. 여기서는 그쪽으로 넘길 요약만 만든다.
//
// [발행 예약은 여기서 판정하지 않는다] '예약중' 은 status + publishAt + 지금 시각의 파생값이고,
// 뉴스·보도자료도 같은 판정을 한다. 규칙이 두 벌이 되지 않도록 shared/domain/publish-schedule.ts
// 한 곳에만 둔다 — 이 파일은 그것을 쓸 뿐 다시 계산하지 않는다.
//
// [슬러그는 주소다 — 이 파일에서 가장 중요한 판단]
// 발행된 페이지의 슬러그를 바꾸면 그 주소를 가리키던 **모든 외부 링크·북마크·검색 결과가
// 죽는다.** 그래서 ① 바꾸기 전에 경고하고 ② 옛 슬러그를 버리지 않고 남긴다. 남겨 두면 백엔드가
// 붙는 날 301 리다이렉트를 걸 근거가 된다 — 지금 버리면 그 근거는 영영 복구되지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import {
  effectivePublishStatus,
  isPubliclyVisible,
  type PublishStatus,
  type StoredPublishStatus,
} from '../../../shared/domain/publish-schedule';
import type { CatalogSitePage } from '../../../shared/domain/site-page-catalog';

/* ── 버전 이력 ───────────────────────────────────────────────────────────── */

/**
 * 저장 한 번의 스냅숏 — **추가만 되는 원장**이다(수정·삭제하지 않는다).
 *
 * 본문을 통째로 복사해 드는 이유는 주문 품목이 단가를 복사해 드는 것과 같다: 되돌리기는
 * '그때 그 내용' 으로 가는 것이지 '지금 값에서 역산한 무엇' 이 아니다.
 */
export interface PageVersion {
  readonly id: string;
  /** 1부터 오르는 판 번호 — 사람이 부르는 이름('v3')이 여기서 나온다 */
  readonly version: number;
  readonly savedAt: string;
  /** 누가 저장했나 — 운영 조직 역할명(실명 금지) */
  readonly actor: string;
  readonly title: string;
  readonly body: string;
  /** 무엇이 바뀌었나 — 되돌리기가 만든 판이면 그 사실이 여기 남는다 */
  readonly note: string;
}

/* ── 페이지 ──────────────────────────────────────────────────────────────── */

export interface SitePage {
  readonly id: string;
  readonly title: string;
  /** 홈페이지 주소 조각 — 소문자·숫자·하이픈 */
  readonly slug: string;
  readonly status: StoredPublishStatus;
  /** 공개 시각 'YYYY-MM-DDTHH:mm' — '' 면 즉시(발행 상태일 때). '예약' 은 여기서 파생된다 */
  readonly publishAt: string;
  readonly body: string;
  /**
   * 처음 발행한 시각 — '' 면 아직 한 번도 공개된 적이 없다.
   *
   * **파생값이 아니라 과거의 사실이다.** 지금 상태가 초안이어도 한 번 공개됐다면 그 주소는
   * 이미 세상에 나가 있다 — 슬러그 변경 경고가 이 값을 읽는다.
   */
  readonly firstPublishedAt: string;
  /** 옛 슬러그 — 최근 것이 앞. 지금 슬러그는 여기 없다 */
  readonly previousSlugs: readonly string[];
  /** 초안 미리보기 토큰 — '' 면 아직 만들지 않았다 */
  readonly previewToken: string;
  /** 최신 판이 앞 */
  readonly versions: readonly PageVersion[];
  readonly updatedAt: string;
}

export type SitePageInput = Omit<SitePage, 'id'>;

/** 목록 경로 — 목록·폼이 함께 읽는다(폼이 목록 파일을 import 하지 않도록 값은 여기 있다) */
export const SITE_PAGE_LIST_PATH = '/content/pages';

export const TITLE_MAX_LENGTH = 100;
export const SLUG_MAX_LENGTH = 60;
export const BODY_MAX_LENGTH = 20_000;

/** 항목 → 쓰기 입력(id 제외) */
export function toSitePageInput(page: SitePage): SitePageInput {
  return {
    title: page.title,
    slug: page.slug,
    status: page.status,
    publishAt: page.publishAt,
    body: page.body,
    firstPublishedAt: page.firstPublishedAt,
    previousSlugs: [...page.previousSlugs],
    previewToken: page.previewToken,
    versions: page.versions.map((version) => ({ ...version })),
    updatedAt: page.updatedAt,
  };
}

/** 지금 이 페이지의 상태 — 저장값이 아니라 파생값이다(머리말) */
export function sitePageStatus(page: SitePage, now: Date = new Date()): PublishStatus {
  return effectivePublishStatus(page, now);
}

/** 홈페이지에서 볼 수 있는가 — 메뉴가 '아직 공개 안 됨' 을 경고하는 근거 */
export function isSitePagePublic(page: SitePage, now: Date = new Date()): boolean {
  return isPubliclyVisible(page, now);
}

/** 메뉴 관리가 읽을 요약으로 접는다 — 넘기는 값은 계약에 적힌 넷뿐이다 */
export function toCatalogSitePage(page: SitePage, now: Date = new Date()): CatalogSitePage {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    published: isSitePagePublic(page, now),
  };
}

/** 최근 수정이 위 — 방금 만진 페이지를 찾으러 스크롤하지 않게 한다 */
export function sortSitePages(list: readonly SitePage[]): readonly SitePage[] {
  return [...list].sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
    return a.id.localeCompare(b.id);
  });
}

/* ── 슬러그 규칙 (버튼의 disabled 와 저장의 거절이 같은 술어를 읽는다) ─────── */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 쓸 수 없는 슬러그 — 어드민·API 가 이미 차지한 주소다.
 * 홈페이지와 관리자 화면이 같은 도메인에 붙는 순간 이 값들은 충돌한다.
 */
export const RESERVED_SLUGS: readonly string[] = ['admin', 'api', 'preview', 'assets', 'static'];

export const SLUG_REQUIRED = '주소(슬러그)를 입력하세요.';
export const SLUG_FORMAT = '주소는 소문자·숫자·하이픈만 쓸 수 있습니다. 예: business-design';
export const SLUG_TOO_LONG = `주소는 ${String(SLUG_MAX_LENGTH)}자를 넘을 수 없습니다.`;
export const SLUG_RESERVED = '이미 시스템이 쓰고 있는 주소입니다. 다른 주소를 입력하세요.';

export function slugTakenMessage(title: string): string {
  return `'${title}' 페이지가 이미 쓰고 있는 주소입니다.`;
}

/** 옛 주소와 겹치는가 — 남겨 둔 리다이렉트 근거를 새 페이지가 빼앗지 못하게 한다 */
export function slugRetiredMessage(title: string): string {
  return `'${title}' 페이지가 예전에 쓰던 주소입니다. 그 주소로 들어오는 방문자가 엉뚱한 페이지를 보게 됩니다.`;
}

/**
 * 이 슬러그를 쓸 수 없는 이유 — 쓸 수 있으면 null.
 *
 * `others` 는 **자기 자신을 제외한** 나머지 전부다(수정 화면에서 자기 주소를 그대로 두는 것은
 * 충돌이 아니다). 형식 → 예약어 → 중복 순으로 본다: 형식이 틀린 값의 중복을 말해도 소용없다.
 */
export function slugBlock(slug: string, others: readonly SitePage[]): string | null {
  const value = slug.trim();
  if (value === '') return SLUG_REQUIRED;
  if (value.length > SLUG_MAX_LENGTH) return SLUG_TOO_LONG;
  if (!SLUG_RE.test(value)) return SLUG_FORMAT;
  if (RESERVED_SLUGS.includes(value)) return SLUG_RESERVED;

  const taken = others.find((page) => page.slug === value);
  if (taken !== undefined) return slugTakenMessage(taken.title);

  const retired = others.find((page) => page.previousSlugs.includes(value));
  if (retired !== undefined) return slugRetiredMessage(retired.title);

  return null;
}

export function canUseSlug(slug: string, others: readonly SitePage[]): boolean {
  return slugBlock(slug, others) === null;
}

export const SLUG_CHANGE_WARNING =
  '이미 공개된 주소입니다. 바꾸면 기존 링크·북마크·검색 결과가 모두 끊깁니다. 옛 주소는 되돌릴 수 있도록 보관합니다.';

/**
 * 지금 이 변경을 경고해야 하는가 — 경고할 것이 없으면 null.
 *
 * **막지 않는다.** 주소를 바꿔야 할 정당한 이유는 있다(오타·개편). 다만 무엇을 잃는지 모른 채
 * 바꾸게 두지 않는다 — 경고는 거절이 아니라 사실 통지다.
 */
export function slugChangeWarning(page: SitePage, nextSlug: string): string | null {
  if (page.firstPublishedAt === '') return null;
  if (nextSlug.trim() === page.slug) return null;
  return SLUG_CHANGE_WARNING;
}

/** 옛 슬러그를 앞에 쌓는다 — 같은 값을 두 번 담지 않는다(멱등) */
export function withRetiredSlug(
  previousSlugs: readonly string[],
  retired: string,
  nextSlug: string,
): readonly string[] {
  if (retired === '' || retired === nextSlug) return previousSlugs;
  return [retired, ...previousSlugs.filter((slug) => slug !== retired && slug !== nextSlug)];
}

/* ── 미리보기 링크 ───────────────────────────────────────────────────────── */

/**
 * 초안 미리보기 주소 — 토큰이 없으면 null.
 *
 * [지금은 링크를 **만들어 보관만** 한다] 이 주소를 실제로 열어 주는 것은 홈페이지(B2C)의 일이고
 * 백엔드가 토큰을 검증해야 성립한다. 그래서 여기서는 주소 문자열까지만 만들고, 열리는 척하지
 * 않는다 — 열리지 않는 링크를 '미리보기' 버튼으로 그려 두면 그것은 고장 난 화면이다.
 * TODO(backend): GET /preview/:slug?token= — 토큰을 검증해 초안을 렌더한다.
 */
export function previewPath(page: Pick<SitePage, 'slug' | 'previewToken'>): string | null {
  if (page.previewToken === '') return null;
  return `/preview/${page.slug}?token=${page.previewToken}`;
}

/* ── 버전 이력 · 되돌리기 ────────────────────────────────────────────────── */

/** 다음 판 번호 — 이력은 추가만 되므로 최대값 + 1 이다 */
export function nextVersionNumber(versions: readonly PageVersion[]): number {
  return versions.reduce((max, version) => Math.max(max, version.version), 0) + 1;
}

/** 지금 내용을 한 판으로 굳힌다 — 저장할 때마다 한 줄이 쌓인다 */
export function snapshotOf(
  page: Pick<SitePage, 'title' | 'body' | 'versions'>,
  at: string,
  actor: string,
  note: string,
): PageVersion {
  const version = nextVersionNumber(page.versions);
  return {
    // 같은 밀리초에 두 번 저장돼도 키가 겹치지 않도록 판 번호를 함께 넣는다
    id: `pv-${at}-${String(version)}`,
    version,
    savedAt: at,
    actor,
    title: page.title,
    body: page.body,
    note,
  };
}

export const REVERT_NOT_FOUND = '되돌릴 판을 찾을 수 없습니다. 이력을 다시 불러와 주세요.';
export const REVERT_SAME = '지금 내용과 같은 판입니다. 되돌릴 것이 없습니다.';

/** 이 판으로 되돌릴 수 없는 이유 — 되돌릴 수 있으면 null */
export function revertBlock(page: SitePage, versionId: string): string | null {
  const target = page.versions.find((version) => version.id === versionId);
  if (target === undefined) return REVERT_NOT_FOUND;
  if (target.title === page.title && target.body === page.body) return REVERT_SAME;
  return null;
}

export function canRevert(page: SitePage, versionId: string): boolean {
  return revertBlock(page, versionId) === null;
}

/**
 * 그 판으로 되돌린다 — 막힌 되돌리기는 **던진다**(술어가 먼저 걸러 주므로 여기 도달하면 버그다).
 *
 * 되돌리기도 **새 판을 만든다.** 이력을 잘라 내지 않는 이유: 되돌린 뒤 '역시 아니었다' 가
 * 일상이기 때문이다. 판을 지우면 그 복구가 불가능해진다 — 원장은 앞으로만 자란다.
 */
export function applyRevert(
  page: SitePage,
  versionId: string,
  at: string,
  actor: string,
): SitePage {
  const blocked = revertBlock(page, versionId);
  if (blocked !== null) throw new Error(blocked);

  const target = page.versions.find((version) => version.id === versionId);
  // revertBlock 이 이미 존재를 확인했다 — 타입을 좁히기 위한 최소한의 방어다
  if (target === undefined) throw new Error(REVERT_NOT_FOUND);

  const reverted: SitePage = { ...page, title: target.title, body: target.body, updatedAt: at };
  return {
    ...reverted,
    versions: [
      snapshotOf(reverted, at, actor, `v${String(target.version)} 내용으로 되돌림`),
      ...page.versions,
    ],
  };
}

/* ── 목록 필터 ───────────────────────────────────────────────────────────── */

export type SitePageStatusFilter = PublishStatus | 'all';

interface FilterDef<T> {
  readonly id: T;
  readonly label: string;
}

export const STATUS_FILTERS: readonly FilterDef<SitePageStatusFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'scheduled', label: '예약' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
];

export const STATUS_FILTER_VALUES: readonly SitePageStatusFilter[] = STATUS_FILTERS.map(
  (filter) => filter.id,
);

/** 저장 폼의 선택지 — 파생 상태(예약)는 고를 수 없다. 예약은 시각으로 만든다 */
export const STORED_STATUS_OPTIONS: readonly FilterDef<StoredPublishStatus>[] = [
  { id: 'draft', label: '초안' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
];

/**
 * 상태 + 제목/주소 키워드 — 서버 쿼리로 대체될 자리.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function filterSitePages(
  list: readonly SitePage[],
  status: SitePageStatusFilter,
  keyword: string,
  now: Date = new Date(),
): readonly SitePage[] {
  const needle = keyword.trim().toLowerCase();
  return list.filter((page) => {
    if (status !== 'all' && sitePageStatus(page, now) !== status) return false;
    if (needle === '') return true;
    return page.title.toLowerCase().includes(needle) || page.slug.toLowerCase().includes(needle);
  });
}
