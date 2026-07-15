// 이미지 파일 검증 회귀 테스트 (A41)
import { describe, expect, it } from 'vitest';

import { imageFileError } from './imageFile';

function fileOf(type: string, sizeBytes: number): File {
  const file = new File(['x'], 'sample', { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('imageFileError — 클라이언트 검증', () => {
  it('이미지 타입이면서 용량 이내면 통과(null)', () => {
    expect(imageFileError(fileOf('image/png', 1024), 5)).toBeNull();
  });

  it('이미지가 아니면 막는다', () => {
    expect(imageFileError(fileOf('text/plain', 10), 5)).toContain('이미지 파일');
  });

  it('용량 상한을 넘으면 막는다', () => {
    expect(imageFileError(fileOf('image/png', 6 * 1024 * 1024), 5)).toContain('5MB');
  });
});
