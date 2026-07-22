// 미디어 라이브러리 조회기 + 사용처 역참조 — **자리만** 만든다 (목록의 정본은 미디어 관리가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 두 방향의 손가락이 모두 없었다]
//   ① 첨부하는 쪽 → 라이브러리 : 뉴스·보도자료가 첨부파일을 고르려면 자산 목록을 알아야 한다.
//   ② 라이브러리 → 사용하는 쪽 : 미디어를 지우기 전에 **어디에 쓰였는지** 알아야 한다.
// 둘 다 모듈을 가로지르는 질문이라, 화면이 서로를 직접 import 하면 그 순간 한 몸이 된다
// (code-quality 축1 page-coupling · blocker · 임계값 0건).
//
// 그래서 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 구현을 꽂는 일은 두 도메인을 모두 아는
// `src/wiring.ts` 가 한다. 선례: coupon-catalog.ts · faq-catalog.ts · shipment.ts(사용 건수).
//
// [②는 조회기가 여럿이다 — 그래서 이름표를 단다]
// 자산을 쓰는 화면은 하나가 아니다(뉴스 첨부, 페이지 본문…). 등록기를 덮어쓰기로 두면 나중에
// 배선된 하나만 남아 **나머지 사용처가 조용히 사라진다** — 그 상태에서 삭제 차단은 "아무 데도
// 안 쓰임" 이라고 답하고, 홈페이지의 이미지가 깨진다. 그래서 이름표(도메인 키)로 모은다.
//
// [왜 사용처는 fail-closed 인가 — 카탈로그와 반대다]
// 카탈로그(①)를 못 읽으면 '고를 것이 없다' 는 불편에서 끝난다. 그러나 사용처(②)를 못 읽는데
// 삭제를 허용하면 **되돌릴 수 없는 파괴**다. 그래서 '모른다' 는 곧 '지우지 못한다' 로 수렴한다
// (roleDeletionBlock 이 같은 판단을 한다). 두 방향의 기본값이 다른 것은 실수가 아니라 규칙이다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 첨부 대상으로 고를 수 있는 자산 한 건 — **라이브러리가 소유하는 값만** 담는다.
 *
 * 폴더·태그·업로더는 여기 없다. 그것은 정리하는 쪽의 축이고, 첨부하는 쪽이 알 이유가 없다.
 */
export interface CatalogMediaAsset {
  /** 미디어 라이브러리의 id — 첨부 레코드가 이 값을 키로 삼는다 */
  readonly id: string;
  readonly fileName: string;
  /** 표시·다운로드 주소 */
  readonly url: string;
  /** 대체텍스트 — 첨부하는 화면이 그대로 쓴다(접근성은 복사되지 않으면 사라진다) */
  readonly alt: string;
  readonly sizeBytes: number;
}

type MediaCatalogLookup = () => readonly CatalogMediaAsset[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let catalogLookup: MediaCatalogLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerMediaCatalogLookup(next: MediaCatalogLookup): void {
  catalogLookup = next;
}

export function resetMediaCatalogLookup(): void {
  catalogLookup = null;
}

/** 지금 첨부할 수 있는 자산 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function mediaCatalog(): readonly CatalogMediaAsset[] | null {
  if (catalogLookup === null) return null;
  return catalogLookup();
}

/** 미디어 라이브러리 목록 경로 — 첨부 화면이 '라이브러리에서 관리' 로 건너뛰는 실 */
export const MEDIA_LIBRARY_PATH = '/content/media';

export function mediaAssetsById(
  catalog: readonly CatalogMediaAsset[],
): Readonly<Record<string, CatalogMediaAsset>> {
  const byId: Record<string, CatalogMediaAsset> = {};
  for (const asset of catalog) byId[asset.id] = asset;
  return byId;
}

/** 카탈로그에서 한 건 — 없으면 null(삭제됐거나 아직 모르는 id) */
export function findCatalogMediaAsset(
  catalog: readonly CatalogMediaAsset[],
  assetId: string,
): CatalogMediaAsset | null {
  return mediaAssetsById(catalog)[assetId] ?? null;
}

/* ── 사용처 역참조 (삭제를 막는 근거) ─────────────────────────────────────── */

/** 이 자산을 쓰고 있는 한 곳 — 화면은 이 줄을 눌러 그 항목을 열어 본다 */
export interface MediaUsageRef {
  /** 쓰고 있는 항목의 id */
  readonly id: string;
  /** 어떤 도메인인가 — '뉴스'·'페이지'. 목록에서 종류별로 묶어 보인다 */
  readonly domainLabel: string;
  /** 그 항목의 이름 — 운영자가 무엇인지 알아볼 수 있는 값 */
  readonly label: string;
  /** 그 항목으로 가는 경로 — 여기서 연결을 끊는다 */
  readonly path: string;
}

type MediaUsageLookup = (assetId: string) => readonly MediaUsageRef[];

/** 도메인 키 → 조회기. 이름표를 다는 이유는 머리말(②)에 있다 */
const usageLookups = new Map<string, MediaUsageLookup>();

/** 조회기를 꽂는다 — 같은 이름은 덮어쓴다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerMediaUsageLookup(domain: string, lookup: MediaUsageLookup): void {
  usageLookups.set(domain, lookup);
}

/** 테스트가 미배선 상태로 되돌린다 — fail-closed 경로를 실제로 밟아 보기 위한 것이다 */
export function resetMediaUsageLookups(): void {
  usageLookups.clear();
}

/**
 * 이 자산이 쓰이는 곳 전부 — **조회기가 하나도 없으면 null**('모른다').
 *
 * 0건과 null 을 가르는 것이 이 함수의 전부다. 0건은 '지워도 된다' 이고 null 은 '알 수 없으니
 * 지우지 않는다' 이다 — 둘을 뭉개면 배선이 빠진 날 라이브러리가 통째로 비워질 수 있다.
 */
export function mediaUsage(assetId: string): readonly MediaUsageRef[] | null {
  if (usageLookups.size === 0) return null;
  const refs: MediaUsageRef[] = [];
  for (const lookup of usageLookups.values()) refs.push(...lookup(assetId));
  return refs;
}

export const MEDIA_DELETE_UNKNOWN =
  '사용처를 확인할 수 없어 삭제할 수 없습니다. 잠시 후 다시 시도해 주세요.';

/** 사용 중이라 못 지운다 — 몇 곳인지까지 말한다(어디인지는 화면이 목록으로 보인다) */
export function mediaDeleteInUse(count: number): string {
  return `${String(count)}곳에서 사용 중이라 삭제할 수 없습니다. 사용처에서 먼저 연결을 끊어 주세요.`;
}

/**
 * 이 자산을 지울 수 없는 이유 — 지울 수 있으면 null.
 *
 * 삭제 버튼의 disabled 와 저장소의 거절이 **이 한 함수를 함께 읽는다**(order.ts 의 규약).
 * 둘이 각자 판단하면 '눌리는데 거부당하는 버튼' 이나 그 반대가 생긴다.
 */
export function mediaDeleteBlock(usage: readonly MediaUsageRef[] | null): string | null {
  if (usage === null) return MEDIA_DELETE_UNKNOWN;
  if (usage.length > 0) return mediaDeleteInUse(usage.length);
  return null;
}

export function canDeleteMedia(usage: readonly MediaUsageRef[] | null): boolean {
  return mediaDeleteBlock(usage) === null;
}
