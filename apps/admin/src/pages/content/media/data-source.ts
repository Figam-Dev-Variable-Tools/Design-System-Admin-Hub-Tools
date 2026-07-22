// 미디어 라이브러리 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다. 지금은 픽스처를
// 돌려준다. **파일은 실제로 올라가지 않는다** — url 은 자리표시 이미지를 가리키고, 저장되는 것은
// 메타데이터뿐이다. 그 사실을 감추지 않는다(가짜 업로드 성공을 지어내지 않는다).
// TODO(backend): POST /api/uploads — 파일을 보내고 응답 URL 을 url 로 삼는다.
//
// [삭제 가드는 공통 층이 갖는다] '지울 수 있는가' 는 사용처를 아는 자만 답할 수 있고, 그 조회기는
// shared/domain/media-library.ts 에 있다. 여기서는 그 판정을 **부를 뿐**이라 화면의 버튼과
// 저장소의 거절이 같은 함수를 읽는다.
import { createStoreAdapter } from '../../../shared/crud';
import {
  mediaDeleteBlock,
  mediaUsage,
  type CatalogMediaAsset,
} from '../../../shared/domain/media-library';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { sortMediaAssets, uploadBlock, UNFILED_FOLDER_ID } from './types';
import type { MediaAsset, MediaAssetInput, MediaFolder } from './types';

export const MEDIA_RESOURCE = 'media-assets';

/** 자리표시 이미지 — 실제 업로드가 없으므로 모든 자산이 같은 그림을 가리킨다 */
const PLACEHOLDER_URL = '/fixtures/placeholder-image.svg';

/* ── 폴더 ────────────────────────────────────────────────────────────────── */

export const MEDIA_FOLDERS: readonly MediaFolder[] = [
  { id: 'brand', label: '브랜드' },
  { id: 'projects', label: '프로젝트 사진' },
  { id: 'documents', label: '문서·도면' },
  { id: UNFILED_FOLDER_ID, label: '미분류' },
];

/* ── 픽스처 (표시용 더미 — 가상 회사) ────────────────────────────────────── */

const SEED: readonly MediaAsset[] = [
  {
    id: 'md-001',
    fileName: 'logo-primary.svg',
    url: PLACEHOLDER_URL,
    folderId: 'brand',
    tags: ['로고', '브랜드'],
    alt: '회사 기본 로고',
    sizeBytes: 18_432,
    extension: 'svg',
    uploadedAt: '2026-02-10T10:00',
    uploader: '콘텐츠 운영팀',
  },
  {
    id: 'md-002',
    fileName: 'office-lobby.jpg',
    url: PLACEHOLDER_URL,
    folderId: 'projects',
    tags: ['사무공간', '프로젝트'],
    alt: '리모델링을 마친 사무실 로비 전경',
    sizeBytes: 842_100,
    extension: 'jpg',
    uploadedAt: '2026-03-14T14:20',
    uploader: '콘텐츠 운영팀',
  },
  {
    id: 'md-003',
    fileName: 'showroom-plan.pdf',
    url: PLACEHOLDER_URL,
    folderId: 'documents',
    tags: ['도면'],
    alt: '쇼룸 평면 계획 도면 요약본',
    sizeBytes: 2_411_000,
    extension: 'pdf',
    uploadedAt: '2026-04-02T09:30',
    uploader: '설계팀',
  },
  {
    id: 'md-004',
    fileName: 'office-lobby.jpg',
    url: PLACEHOLDER_URL,
    folderId: UNFILED_FOLDER_ID,
    tags: [],
    alt: '리모델링을 마친 사무실 로비 전경(재업로드)',
    // 같은 이름·크기 — 중복 감지 경로를 화면에서 실제로 밟게 하는 씨앗이다
    sizeBytes: 842_100,
    extension: 'jpg',
    uploadedAt: '2026-05-08T16:05',
    uploader: '마케팅팀',
  },
  {
    id: 'md-005',
    fileName: 'press-kit.zip',
    url: PLACEHOLDER_URL,
    folderId: 'brand',
    tags: ['보도자료', '브랜드'],
    alt: '보도자료용 이미지 묶음',
    sizeBytes: 5_240_000,
    extension: 'zip',
    uploadedAt: '2026-06-11T11:45',
    uploader: '마케팅팀',
  },
];

/** mutable — 업로드·수정·삭제가 이 배열을 갱신한다 */
let ASSETS: readonly MediaAsset[] = sortMediaAssets(SEED);

let seq = SEED.length;

/* ── 저장소 표면 ─────────────────────────────────────────────────────────── */

export function listMediaAssets(): readonly MediaAsset[] {
  return ASSETS;
}

export function getMediaAsset(id: string): MediaAsset {
  const asset = ASSETS.find((item) => item.id === id);
  if (asset === undefined) throw new Error('파일을 찾을 수 없습니다.');
  return asset;
}

function assertUploadable(input: MediaAssetInput): void {
  const blocked = uploadBlock({
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    alt: input.alt,
  });
  if (blocked === null) return;
  throw new HttpError(HTTP_STATUS.unprocessable, blocked, {
    violations: [{ field: input.alt.trim() === '' ? 'alt' : 'fileName', message: blocked }],
  });
}

export function addMediaAsset(input: MediaAssetInput): void {
  assertUploadable(input);
  seq += 1;
  ASSETS = sortMediaAssets([...ASSETS, { id: `md-${String(seq).padStart(3, '0')}`, ...input }]);
}

export function updateMediaAsset(id: string, input: MediaAssetInput): void {
  assertUploadable(input);
  ASSETS = sortMediaAssets(
    ASSETS.map((asset) => (asset.id === id ? { ...asset, ...input } : asset)),
  );
}

/**
 * 삭제 — **사용처를 확인하고**, 모르면 지우지 않는다 (fail-closed).
 *
 * 화면의 삭제 버튼도 같은 판정(mediaDeleteBlock)을 읽어 미리 잠근다. 그래도 여기서 다시 묻는
 * 이유는 화면이 본 순간과 실제로 지우는 순간 사이에 누군가 그 파일을 갖다 쓸 수 있어서다.
 */
export function removeMediaAsset(id: string): void {
  const blocked = mediaDeleteBlock(mediaUsage(id));
  if (blocked !== null) throw new HttpError(HTTP_STATUS.conflict, blocked);
  ASSETS = ASSETS.filter((asset) => asset.id !== id);
}

/* ── 배선용 조회기 (뉴스 첨부가 읽는다 — src/wiring.ts 가 꽂는다) ─────────── */

// TODO(backend): GET /api/media?fields=id,fileName,url,alt,sizeBytes
export function listCatalogMediaAssets(): readonly CatalogMediaAsset[] {
  return ASSETS.map((asset) => ({
    id: asset.id,
    fileName: asset.fileName,
    url: asset.url,
    alt: asset.alt,
    sizeBytes: asset.sizeBytes,
  }));
}

/** 'YYYY-MM-DDTHH:mm' — 업로드 시각의 표기를 한 곳에서만 만든다 */
export function stampNow(): string {
  return new Date().toISOString().slice(0, 16);
}

export const MEDIA_UPLOADER = '콘텐츠 운영팀';
export const MEDIA_PLACEHOLDER_URL = PLACEHOLDER_URL;

/* ── CRUD 어댑터 ─────────────────────────────────────────────────────────── */

// TODO(backend): GET/POST /api/media · GET/PUT/DELETE /api/media/:id
export const mediaAssetAdapter = createStoreAdapter<MediaAsset, MediaAssetInput>({
  scope: MEDIA_RESOURCE,
  list: listMediaAssets,
  getOne: getMediaAsset,
  add: addMediaAsset,
  update: updateMediaAsset,
  remove: removeMediaAsset,
});
