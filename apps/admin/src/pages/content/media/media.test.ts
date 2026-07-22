// 미디어 라이브러리 순수 규칙 회귀 테스트
//
// [무엇을 못 박는가] 이 화면의 사고는 셋이다.
//   ① 실행 가능한 파일이 홈페이지 도메인에 올라가는 것
//   ② 대체텍스트 없는 이미지가 들어와 스크린리더 사용자에게 '존재하지 않는' 것이 되는 것
//   ③ 같은 파일이 조용히 두 벌 쌓이는 것
// (삭제 차단은 shared/domain/media-library.test.ts 가 맡는다 — 규칙의 자리가 거기다.)
import { describe, expect, it } from 'vitest';

import {
  ALT_REQUIRED,
  ALT_TOO_LONG,
  canUpload,
  collectTags,
  countByFolder,
  duplicateWarningMessage,
  extensionBlockedMessage,
  extensionOf,
  FILE_NAME_REQUIRED,
  filterMediaAssets,
  findDuplicate,
  FOLDER_FILTER_ALL,
  formatBytes,
  isImageExtension,
  MAX_SIZE_BYTES,
  sizeBlockedMessage,
  sortMediaAssets,
  UNFILED_FOLDER_ID,
  uploadBlock,
  usageLabel,
  usageTone,
} from './types';
import type { MediaAsset, MediaFolder } from './types';

const asset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: 'md-1',
  fileName: 'office-lobby.jpg',
  url: '/fixtures/placeholder-image.svg',
  folderId: 'projects',
  tags: ['사무공간'],
  alt: '사무실 로비 전경',
  sizeBytes: 842_100,
  extension: 'jpg',
  uploadedAt: '2026-03-14T14:20',
  uploader: '콘텐츠 운영팀',
  ...overrides,
});

const FOLDERS: readonly MediaFolder[] = [
  { id: 'projects', label: '프로젝트 사진' },
  { id: UNFILED_FOLDER_ID, label: '미분류' },
];

describe('extensionOf', () => {
  it('마지막 점 뒤를 소문자로 준다', () => {
    expect(extensionOf('office-lobby.JPG')).toBe('jpg');
    expect(extensionOf('a.b.pdf')).toBe('pdf');
  });

  it('확장자가 없으면 빈 문자열이다 — 지어내지 않는다', () => {
    expect(extensionOf('README')).toBe('');
    expect(extensionOf('.gitignore')).toBe('');
    expect(extensionOf('trailing.')).toBe('');
  });

  it('이미지 여부를 확장자로 가른다', () => {
    expect(isImageExtension('png')).toBe(true);
    expect(isImageExtension('pdf')).toBe(false);
  });
});

describe('uploadBlock', () => {
  it('이름이 비면 막는다', () => {
    expect(uploadBlock({ fileName: ' ', sizeBytes: 100, alt: '설명' })).toBe(FILE_NAME_REQUIRED);
  });

  it('실행 가능한 파일은 막는다 — 홈페이지 도메인에서 실행될 수 있다', () => {
    expect(uploadBlock({ fileName: 'hack.html', sizeBytes: 100, alt: '설명' })).toBe(
      extensionBlockedMessage('html'),
    );
    expect(uploadBlock({ fileName: 'run.exe', sizeBytes: 100, alt: '설명' })).toBe(
      extensionBlockedMessage('exe'),
    );
  });

  it('상한을 넘는 파일은 막는다', () => {
    const tooBig = MAX_SIZE_BYTES + 1;
    expect(uploadBlock({ fileName: 'big.jpg', sizeBytes: tooBig, alt: '설명' })).toBe(
      sizeBlockedMessage(tooBig),
    );
  });

  it('대체텍스트는 필수다 — 나중에 채우겠다는 약속은 지켜지지 않는다', () => {
    expect(uploadBlock({ fileName: 'a.jpg', sizeBytes: 100, alt: '   ' })).toBe(ALT_REQUIRED);
    expect(uploadBlock({ fileName: 'a.jpg', sizeBytes: 100, alt: 'ㄱ'.repeat(101) })).toBe(
      ALT_TOO_LONG,
    );
  });

  it('형식이 틀린 파일에는 용량·대체텍스트를 묻지 않는다 — 순서가 곧 우선순위다', () => {
    expect(uploadBlock({ fileName: 'hack.exe', sizeBytes: MAX_SIZE_BYTES + 1, alt: '' })).toBe(
      extensionBlockedMessage('exe'),
    );
  });

  it('모두 갖추면 올릴 수 있다', () => {
    expect(canUpload({ fileName: 'plan.pdf', sizeBytes: 1024, alt: '평면 계획' })).toBe(true);
  });
});

describe('findDuplicate', () => {
  const existing = asset();

  it('같은 이름·크기면 잡는다 (대소문자 무시)', () => {
    expect(
      findDuplicate([existing], { fileName: 'OFFICE-LOBBY.JPG', sizeBytes: 842_100 })?.id,
    ).toBe('md-1');
  });

  it('이름이 같아도 크기가 다르면 다른 파일이다', () => {
    expect(findDuplicate([existing], { fileName: 'office-lobby.jpg', sizeBytes: 1 })).toBeNull();
  });

  it('경고 문구는 무엇이 겹치는지 말한다', () => {
    expect(duplicateWarningMessage(existing)).toContain('office-lobby.jpg');
  });
});

describe('표기', () => {
  it('용량은 단위를 붙여 읽힌다', () => {
    expect(formatBytes(512)).toBe('512B');
    expect(formatBytes(2048)).toBe('2.0KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0MB');
  });

  it("사용처 배지는 0건과 '모른다' 를 가른다", () => {
    expect(usageLabel(0)).toBe('미사용');
    expect(usageLabel(2)).toBe('2곳 사용 중');
    expect(usageLabel(null)).toBe('확인 불가');
    expect(usageTone(null)).toBe('warning');
    expect(usageTone(0)).toBe('neutral');
    expect(usageTone(3)).toBe('info');
  });
});

describe('목록 정렬 · 필터', () => {
  const a = asset({ id: 'md-1', uploadedAt: '2026-03-14T14:20', tags: ['사무공간'] });
  const b = asset({
    id: 'md-2',
    fileName: 'logo.svg',
    extension: 'svg',
    folderId: UNFILED_FOLDER_ID,
    alt: '회사 로고',
    tags: ['로고', '브랜드'],
    uploadedAt: '2026-05-08T16:05',
  });
  const all = [a, b];

  it('최근 업로드가 위다', () => {
    expect(sortMediaAssets(all).map((item) => item.id)).toEqual(['md-2', 'md-1']);
  });

  it('폴더 건수는 전체를 함께 센다', () => {
    expect(countByFolder(all, FOLDERS)).toEqual({
      [FOLDER_FILTER_ALL]: 2,
      projects: 1,
      [UNFILED_FOLDER_ID]: 1,
    });
  });

  it('태그 목록은 실제로 쓰인 것에서만 나온다 (사전을 따로 두지 않는다)', () => {
    expect(collectTags(all)).toEqual(['로고', '브랜드', '사무공간']);
  });

  it('폴더·태그·키워드가 함께 걸린다', () => {
    expect(filterMediaAssets(all, 'projects', '', '').map((item) => item.id)).toEqual(['md-1']);
    expect(filterMediaAssets(all, FOLDER_FILTER_ALL, '로고', '').map((item) => item.id)).toEqual([
      'md-2',
    ]);
    // 검색은 파일명과 대체텍스트를 함께 본다
    expect(filterMediaAssets(all, FOLDER_FILTER_ALL, '', '로비').map((item) => item.id)).toEqual([
      'md-1',
    ]);
    expect(filterMediaAssets(all, FOLDER_FILTER_ALL, '', 'logo').map((item) => item.id)).toEqual([
      'md-2',
    ]);
  });
});
