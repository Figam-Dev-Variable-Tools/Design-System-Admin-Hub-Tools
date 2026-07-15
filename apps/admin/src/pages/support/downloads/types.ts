// 자료실 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/support/downloads/**)
//
// 국내 자료실(게시판형 다운로드) 관례: 제목·카테고리·첨부파일·버전·다운로드수·노출여부. 버전·다운로드수·
// 노출여부가 일반 파일 목록과 자료실을 가르는 세 축이다(조사). 파일은 상세/폼의 업로드로만 다루고
// 목록엔 이미지 열을 넣지 않는다.
import type { StatusTone } from '../../../shared/ui';

/** 첨부 종류 — 확장자로 파생. 목록/카드의 배지·아이콘 의도에 쓴다. */
type FileKind = 'document' | 'image' | 'archive' | 'etc';

export interface DownloadItem {
  readonly id: string;
  readonly title: string;
  /** 자료 카테고리 라벨(표시용) */
  readonly categoryLabel: string;
  /** 버전 — 개정되는 문서(사양서·양식)의 판 구분. 비면 '-' */
  readonly version: string;
  /** 첨부 파일명 */
  readonly fileName: string;
  /** 첨부 용량(바이트) */
  readonly fileSize: number;
  readonly fileKind: FileKind;
  /** 다운로드 수 — 자동 증가(관리자는 읽기만) */
  readonly downloadCount: number;
  /** 노출 여부 — 끄면 고객센터 자료실에서 숨는다 */
  readonly visible: boolean;
  /** 등록 일시 ISO */
  readonly createdAt: string;
}

export interface DownloadInput {
  readonly title: string;
  readonly categoryLabel: string;
  readonly version: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly fileKind: FileKind;
  readonly visible: boolean;
}

export const TITLE_MAX = 100;
export const VERSION_MAX = 20;
/** 첨부 용량 상한(MB) — 문서/이미지/압축본 */
export const MAX_FILE_SIZE_MB = 20;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

/** 자료 카테고리 — 자료실 고유의 분류(문의 유형과 별개) */
export const DOWNLOAD_CATEGORY_OPTIONS: readonly Option<string>[] = [
  { id: '카탈로그', label: '카탈로그' },
  { id: '제품 매뉴얼', label: '제품 매뉴얼' },
  { id: '양식/서식', label: '양식/서식' },
  { id: '브로슈어', label: '브로슈어' },
  { id: '기타', label: '기타' },
] as const;

/* ── 파일 종류 · 용량 (순수 — 테스트가 직접 부른다) ───────────────────────────── */

const DOCUMENT_EXT = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'hwp',
  'hwpx',
  'txt',
  'csv',
] as const;
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] as const;
const ARCHIVE_EXT = ['zip', 'rar', '7z', 'tar', 'gz'] as const;

/** 파일명 확장자 → 종류. 확장자가 없거나 미지원이면 'etc'. */
export function fileKindOf(fileName: string): FileKind {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) return 'etc';
  const ext = fileName.slice(dot + 1).toLowerCase();
  if ((DOCUMENT_EXT as readonly string[]).includes(ext)) return 'document';
  if ((IMAGE_EXT as readonly string[]).includes(ext)) return 'image';
  if ((ARCHIVE_EXT as readonly string[]).includes(ext)) return 'archive';
  return 'etc';
}

const FILE_KIND_LABEL: Record<FileKind, string> = {
  document: '문서',
  image: '이미지',
  archive: '압축',
  etc: '기타',
};

export function fileKindLabel(kind: FileKind): string {
  return FILE_KIND_LABEL[kind];
}

/** 사람이 읽는 용량 — '0 B' / '12.3 KB' / '3.4 MB' */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * 업로드 파일 검증 — 지원 종류(문서/이미지/압축)·용량 상한. 위반이면 인라인 문구, 통과면 null.
 * 이미지 전용(shared/ui imageFile)과 달리 문서까지 허용하므로 자료실 전용 규칙을 여기 둔다.
 * 테스트가 이 순수 함수를 직접 부른다.
 */
export function downloadFileError(file: File, maxSizeMB: number): string | null {
  if (fileKindOf(file.name) === 'etc') {
    return '문서·이미지·압축 파일만 올릴 수 있습니다.';
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `파일 용량은 ${String(maxSizeMB)}MB 를 넘을 수 없습니다.`;
  }
  return null;
}

/* ── 뷰 헬퍼 · 필터 ──────────────────────────────────────────────────────────── */

export function visibilityTone(visible: boolean): StatusTone {
  return visible ? 'success' : 'neutral';
}

export function visibilityLabel(visible: boolean): string {
  return visible ? '노출' : '숨김';
}

export const DOWNLOAD_FILTER_ALL = 'all';
export type VisibilityFilter = 'all' | 'visible' | 'hidden';
export type CategoryFilter = typeof DOWNLOAD_FILTER_ALL | string;

export function filterDownloads(
  list: readonly DownloadItem[],
  category: CategoryFilter,
  visibility: VisibilityFilter,
): readonly DownloadItem[] {
  return list.filter(
    (item) =>
      (category === DOWNLOAD_FILTER_ALL || item.categoryLabel === category) &&
      (visibility === 'all' ||
        (visibility === 'visible' && item.visible) ||
        (visibility === 'hidden' && !item.visible)),
  );
}

export function searchDownloads(
  list: readonly DownloadItem[],
  keyword: string,
): readonly DownloadItem[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) || item.fileName.toLowerCase().includes(needle),
  );
}

/** 등록일시 내림차순(최근이 위). 같은 시각은 id 안정 정렬. */
export function sortDownloads(list: readonly DownloadItem[]): readonly DownloadItem[] {
  return [...list].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toDownloadInput(item: DownloadItem): DownloadInput {
  return {
    title: item.title,
    categoryLabel: item.categoryLabel,
    version: item.version,
    fileName: item.fileName,
    fileSize: item.fileSize,
    fileKind: item.fileKind,
    visible: item.visible,
  };
}
