// 자료실 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 등록 시 다운로드수 0·등록일시 now 를
// build 가 채우고, 수정은 그 둘을 보존한다(patch). 실제 파일 업로드는 없다 — 폼이 파일 메타만 넘긴다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortDownloads } from './types';
import type { DownloadItem, DownloadInput } from './types';

export const DOWNLOAD_RESOURCE = 'support-downloads';

const SEED: readonly DownloadItem[] = [
  {
    id: 'dl-1',
    title: '2026 상반기 제품 카탈로그',
    categoryLabel: '카탈로그',
    version: 'v2.1',
    fileName: 'catalog-2026-h1.pdf',
    fileSize: 4_820_000,
    fileKind: 'document',
    downloadCount: 1284,
    visible: true,
    createdAt: '2026-07-01T09:00:00',
  },
  {
    id: 'dl-2',
    title: '제품 설치 매뉴얼',
    categoryLabel: '제품 매뉴얼',
    version: 'v1.4',
    fileName: 'install-guide.pdf',
    fileSize: 1_640_000,
    fileKind: 'document',
    downloadCount: 532,
    visible: true,
    createdAt: '2026-06-20T14:30:00',
  },
  {
    id: 'dl-3',
    title: '거래 신청서 양식',
    categoryLabel: '양식/서식',
    version: 'v3.0',
    fileName: 'application-form.xlsx',
    fileSize: 88_000,
    fileKind: 'document',
    downloadCount: 210,
    visible: true,
    createdAt: '2026-06-10T11:00:00',
  },
  {
    id: 'dl-4',
    title: '브랜드 브로슈어(구버전)',
    categoryLabel: '브로슈어',
    version: 'v1.0',
    fileName: 'brochure-legacy.zip',
    fileSize: 12_300_000,
    fileKind: 'archive',
    downloadCount: 47,
    visible: false,
    createdAt: '2026-05-02T10:00:00',
  },
];

let seq = SEED.length;

// TODO(backend): GET/POST /api/support/downloads · GET/PUT/DELETE /api/support/downloads/:id · POST /api/uploads
export const downloadAdapter = createCrudAdapter<DownloadItem, DownloadInput>({
  scope: DOWNLOAD_RESOURCE,
  seed: SEED,
  build: (input) => {
    seq += 1;
    return {
      id: `dl-${String(seq)}`,
      ...input,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortDownloads,
});
