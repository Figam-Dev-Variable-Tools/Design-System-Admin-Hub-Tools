// 미디어 라이브러리 화면 전용 타입 + 순수 규칙
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 라이브러리가 필요한가] 지금까지 이미지·파일은 화면마다 개별 업로드였다. 그래서 같은 로고가
// 다섯 벌 올라가 있어도 아무도 몰랐고, 무엇보다 **어디에 쓰였는지 알 수 없어 지울 수 없었다** —
// 지우면 어느 페이지의 이미지가 깨지는지 확인할 방법 자체가 없었기 때문이다.
//
// [삭제는 사용처를 보고 판단한다 — 카테고리 삭제 차단과 같은 관용구]
// 쓰이는 중이면 막고, **모르면 더 막는다.** '모른다' 를 '안 쓰인다' 로 뭉개면 배선이 빠진 날
// 라이브러리가 통째로 비워질 수 있다. 판정은 shared/domain/media-library.ts 가 소유하고
// (mediaDeleteBlock), 이 파일은 업로드 쪽 규칙만 갖는다.
//
// [대체텍스트는 선택이 아니다] 스크린리더 사용자에게 alt 없는 이미지는 존재하지 않는 것과 같다.
// 나중에 채우겠다는 약속은 지켜지지 않으므로 **올리는 순간**에 받는다.
// ─────────────────────────────────────────────────────────────────────────────
import type { StatusBadgeTone } from '@tds/ui';

/* ── 폴더 ────────────────────────────────────────────────────────────────── */

/** 정리 단위 — 1뎁스다. 폴더 안의 폴더는 만들지 않는다(메뉴·카테고리와 같은 판단) */
export interface MediaFolder {
  readonly id: string;
  readonly label: string;
}

export const UNFILED_FOLDER_ID = 'unfiled';

/* ── 자산 ────────────────────────────────────────────────────────────────── */

export interface MediaAsset {
  readonly id: string;
  readonly fileName: string;
  /** 표시·다운로드 주소 */
  readonly url: string;
  /** 폴더 id — 어느 폴더에도 없으면 UNFILED_FOLDER_ID */
  readonly folderId: string;
  readonly tags: readonly string[];
  /** 대체텍스트 — 비워 둘 수 없다(머리말) */
  readonly alt: string;
  readonly sizeBytes: number;
  /** 소문자 확장자 — 'jpg'·'pdf'. 점은 붙이지 않는다 */
  readonly extension: string;
  readonly uploadedAt: string;
  /** 올린 사람 — 운영 조직 역할명(실명 금지) */
  readonly uploader: string;
}

export type MediaAssetInput = Omit<MediaAsset, 'id'>;

export const ALT_MAX = 100;
export const MEDIA_LIST_PATH = '/content/media';

export function toMediaAssetInput(asset: MediaAsset): MediaAssetInput {
  return {
    fileName: asset.fileName,
    url: asset.url,
    folderId: asset.folderId,
    tags: [...asset.tags],
    alt: asset.alt,
    sizeBytes: asset.sizeBytes,
    extension: asset.extension,
    uploadedAt: asset.uploadedAt,
    uploader: asset.uploader,
  };
}

/* ── 업로드 정책 ─────────────────────────────────────────────────────────── */

/**
 * 허용 확장자 — 이미지와 문서 두 갈래다.
 *
 * 실행 가능한 파일(exe·sh·html)을 받지 않는 이유는 용량이 아니라 **안전**이다. 홈페이지가
 * 그대로 서빙하는 자리라, 업로드된 html 한 장이 그 도메인에서 스크립트를 실행한다.
 */
export const ALLOWED_IMAGE_EXTENSIONS: readonly string[] = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
];
export const ALLOWED_DOC_EXTENSIONS: readonly string[] = [
  'pdf',
  'dwg',
  'zip',
  'xlsx',
  'docx',
  'pptx',
];
export const ALLOWED_EXTENSIONS: readonly string[] = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_DOC_EXTENSIONS,
];

/** 한 파일의 상한(MB) — 홈페이지가 그대로 내려보내므로 방문자의 통신비이기도 하다 */
export const MAX_SIZE_MB = 20;
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const ALT_REQUIRED =
  '대체텍스트를 입력하세요. 화면을 읽어 주는 사용자에게는 이 문장이 곧 이미지입니다.';
export const ALT_TOO_LONG = `대체텍스트는 ${String(ALT_MAX)}자를 넘을 수 없습니다.`;
export const FILE_NAME_REQUIRED = '파일 이름을 입력하세요.';

export function extensionBlockedMessage(extension: string): string {
  return `'.${extension}' 는 올릴 수 없는 형식입니다. 허용 형식: ${ALLOWED_EXTENSIONS.join(', ')}`;
}

export function sizeBlockedMessage(sizeBytes: number): string {
  return `파일이 ${String(MAX_SIZE_MB)}MB 를 넘습니다(${formatBytes(sizeBytes)}). 더 작은 파일로 올려 주세요.`;
}

/** 'image.PNG' → 'png'. 확장자가 없으면 '' */
export function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  if (index <= 0 || index === fileName.length - 1) return '';
  return fileName.slice(index + 1).toLowerCase();
}

export function isImageExtension(extension: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

/** 사람이 읽는 용량 — 소수점 한 자리까지. 표기 규칙을 한 곳에만 둔다 */
export function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${String(sizeBytes)}B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

/** 올리려는 파일의 최소 사실 — 실제 File 이 아니어도 판정할 수 있게 좁혀 둔다 */
export interface UploadCandidate {
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly alt: string;
}

/**
 * 이 파일을 올릴 수 없는 이유 — 올릴 수 있으면 null.
 *
 * 순서가 곧 우선순위다: 이름 → 형식 → 용량 → 대체텍스트. 형식이 틀린 파일의 용량을 말해도
 * 소용없고, 올릴 수 없는 파일의 대체텍스트를 요구하는 것은 더 나쁘다.
 */
export function uploadBlock(candidate: UploadCandidate): string | null {
  const fileName = candidate.fileName.trim();
  if (fileName === '') return FILE_NAME_REQUIRED;

  const extension = extensionOf(fileName);
  if (!ALLOWED_EXTENSIONS.includes(extension)) return extensionBlockedMessage(extension);
  if (candidate.sizeBytes > MAX_SIZE_BYTES) return sizeBlockedMessage(candidate.sizeBytes);

  const alt = candidate.alt.trim();
  if (alt === '') return ALT_REQUIRED;
  if (alt.length > ALT_MAX) return ALT_TOO_LONG;
  return null;
}

export function canUpload(candidate: UploadCandidate): boolean {
  return uploadBlock(candidate) === null;
}

/* ── 중복 업로드 감지 ────────────────────────────────────────────────────── */

/**
 * 같은 파일을 이미 갖고 있는가 — 없으면 null.
 *
 * 이름 + 크기로 본다. 해시가 정확하지만 지금은 파일 내용을 읽지 않으므로(업로드가 없다) 그
 * 둘이 실무에서 가장 잘 맞는 근사다. **막지 않고 알린다** — 같은 이름의 다른 개정본을 올리는
 * 일은 정당하고, 그것까지 거절하면 운영자가 파일명을 무의미하게 비틀게 된다.
 * TODO(backend): 업로드가 붙으면 콘텐츠 해시(sha-256)로 바꾼다 — 이름을 바꾼 같은 파일도 잡힌다.
 */
export function findDuplicate(
  assets: readonly MediaAsset[],
  candidate: Pick<UploadCandidate, 'fileName' | 'sizeBytes'>,
): MediaAsset | null {
  const fileName = candidate.fileName.trim().toLowerCase();
  return (
    assets.find(
      (asset) =>
        asset.fileName.toLowerCase() === fileName && asset.sizeBytes === candidate.sizeBytes,
    ) ?? null
  );
}

export function duplicateWarningMessage(asset: MediaAsset): string {
  return `같은 이름·크기의 파일이 이미 있습니다(${asset.fileName} · ${formatBytes(asset.sizeBytes)}). 그대로 올리면 두 벌이 남습니다.`;
}

/* ── 목록 필터 ───────────────────────────────────────────────────────────── */

export const FOLDER_FILTER_ALL = 'all';

/** 폴더별 자산 수 — 좌측 필터의 배지가 읽는다 */
export function countByFolder(
  assets: readonly MediaAsset[],
  folders: readonly MediaFolder[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = { [FOLDER_FILTER_ALL]: assets.length };
  for (const folder of folders) {
    counts[folder.id] = assets.filter((asset) => asset.folderId === folder.id).length;
  }
  return counts;
}

/** 이 목록에 실제로 쓰이는 태그 — 손으로 관리하는 태그 사전을 두지 않는다(파생값) */
export function collectTags(assets: readonly MediaAsset[]): readonly string[] {
  return [...new Set(assets.flatMap((asset) => asset.tags))].sort((a, b) => a.localeCompare(b));
}

/** 폴더 + 태그 + 파일명/대체텍스트 키워드 — 서버 쿼리로 대체될 자리 */
export function filterMediaAssets(
  assets: readonly MediaAsset[],
  folderId: string,
  tag: string,
  keyword: string,
): readonly MediaAsset[] {
  const needle = keyword.trim().toLowerCase();
  return assets.filter((asset) => {
    if (folderId !== FOLDER_FILTER_ALL && asset.folderId !== folderId) return false;
    if (tag !== '' && !asset.tags.includes(tag)) return false;
    if (needle === '') return true;
    return (
      asset.fileName.toLowerCase().includes(needle) || asset.alt.toLowerCase().includes(needle)
    );
  });
}

/** 최근 업로드가 위 */
export function sortMediaAssets(assets: readonly MediaAsset[]): readonly MediaAsset[] {
  return [...assets].sort((a, b) => {
    if (a.uploadedAt !== b.uploadedAt) return b.uploadedAt.localeCompare(a.uploadedAt);
    return a.id.localeCompare(b.id);
  });
}

/** 사용 중 배지의 색 의도 — 쓰이는 중이면 정보, 미사용이면 중립, 모르면 경고 */
export function usageTone(count: number | null): StatusBadgeTone {
  if (count === null) return 'warning';
  return count === 0 ? 'neutral' : 'info';
}

export function usageLabel(count: number | null): string {
  if (count === null) return '확인 불가';
  return count === 0 ? '미사용' : `${String(count)}곳 사용 중`;
}
