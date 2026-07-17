// 자료실 규칙 회귀 테스트 — 파일 종류·용량·검증·필터·검색·정렬(순수)
import { describe, expect, it } from 'vitest';

import {
  downloadFileError,
  fileKindOf,
  filterDownloads,
  formatBytes,
  searchDownloads,
  sortDownloads,
  toDownloadInput,
} from './types';
import type { DownloadItem } from './types';

function fileOf(name: string, sizeBytes: number): File {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function itemOf(overrides: Partial<DownloadItem> & { id: string }): DownloadItem {
  return {
    title: '자료',
    categoryLabel: '카탈로그',
    version: 'v1.0',
    fileName: 'a.pdf',
    fileSize: 1024,
    fileKind: 'document',
    downloadCount: 0,
    visible: true,
    createdAt: '2026-07-01T09:00:00',
    ...overrides,
  };
}

describe('파일 종류·용량(순수)', () => {
  it('확장자로 종류를 판별한다', () => {
    expect(fileKindOf('spec.pdf')).toBe('document');
    expect(fileKindOf('logo.png')).toBe('image');
    expect(fileKindOf('bundle.zip')).toBe('archive');
    expect(fileKindOf('noext')).toBe('etc');
    expect(fileKindOf('weird.xyz')).toBe('etc');
  });

  it('사람이 읽는 용량', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('downloadFileError — 클라이언트 검증(순수)', () => {
  it('지원 종류 + 용량 이내면 통과', () => {
    expect(downloadFileError(fileOf('doc.pdf', 1024), 20)).toBeNull();
    expect(downloadFileError(fileOf('img.png', 1024), 20)).toBeNull();
  });

  it('미지원 종류는 막는다', () => {
    expect(downloadFileError(fileOf('run.exe', 10), 20)).toContain('문서·이미지·압축');
  });

  it('용량 상한을 넘으면 막는다', () => {
    expect(downloadFileError(fileOf('big.zip', 21 * 1024 * 1024), 20)).toContain('20MB');
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    itemOf({
      id: 'a',
      categoryLabel: '카탈로그',
      visible: true,
      fileName: 'catalog.pdf',
      createdAt: '2026-07-01T09:00:00',
    }),
    itemOf({
      id: 'b',
      categoryLabel: '양식/서식',
      visible: false,
      fileName: 'form.xlsx',
      createdAt: '2026-07-05T09:00:00',
    }),
  ];

  it('카테고리·노출 필터', () => {
    expect(filterDownloads(list, '양식/서식', 'all').map((i) => i.id)).toEqual(['b']);
    expect(filterDownloads(list, 'all', 'visible').map((i) => i.id)).toEqual(['a']);
    expect(filterDownloads(list, 'all', 'hidden').map((i) => i.id)).toEqual(['b']);
  });

  it('제목·파일명 검색', () => {
    expect(searchDownloads(list, 'form').map((i) => i.id)).toEqual(['b']);
  });

  it('등록일시 내림차순', () => {
    expect(sortDownloads(list).map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('toDownloadInput 은 id·downloadCount·createdAt 을 뺀다', () => {
    const input = toDownloadInput(itemOf({ id: 'a' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('downloadCount');
    expect(input).not.toHaveProperty('createdAt');
  });
});
