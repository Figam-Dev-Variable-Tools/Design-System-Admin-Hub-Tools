// ImageUploadField — 계약 검증 테스트 (contracts/ImageUploadField.contract.json@1.0.0)
//
//   default   미선택이면 업로드 안내(placeholder) — 이미지는 없다
//   preview   값이 있으면 미리보기 이미지(alt)
//   onChange  이미지 파일을 고르면 object URL 로 onChange, 제거하면 '' 로 onChange
//   error     이미지가 아니면 막고 role=alert 인라인 오류 (로컬 검증)
//   disabled  드롭존이 비활성된다
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageUploadField, imageFileError } from './ImageUploadField';

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function imageFile(): File {
  return new File(['x'], 'photo.png', { type: 'image/png' });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (input === null) throw new Error('file input not found');
  return input as HTMLInputElement;
}

describe('ImageUploadField — 계약 states·onChange', () => {
  it('ImageUploadField: default — 값이 없으면 업로드 안내(placeholder)를 그리고 이미지는 없다', () => {
    render(<ImageUploadField label="로고" value="" onChange={vi.fn()} />);
    expect(screen.getByText(/끌어다 놓으세요/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('ImageUploadField: 값이 있으면 미리보기 이미지를 그린다', () => {
    render(<ImageUploadField label="로고" value="blob:existing" onChange={vi.fn()} />);
    expect(screen.getByAltText('로고 미리보기')).toBeTruthy();
  });

  it('ImageUploadField: 이미지 파일을 고르면 object URL 로 onChange 한다', () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUploadField label="로고" value="" onChange={onChange} />);
    fireEvent.change(fileInput(container), { target: { files: [imageFile()] } });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('blob:mock-url');
  });

  it('ImageUploadField: error — 이미지가 아니면 막고 role=alert 로 인라인 오류를 알린다', () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUploadField label="로고" value="" onChange={onChange} />);
    const notImage = new File(['x'], 'note.txt', { type: 'text/plain' });
    fireEvent.change(fileInput(container), { target: { files: [notImage] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('이미지 파일');
  });

  it('ImageUploadField: 제거하면 빈 문자열로 onChange 한다', () => {
    const onChange = vi.fn();
    render(<ImageUploadField label="로고" value="blob:existing" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '제거' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('ImageUploadField: disabled — 드롭존이 비활성된다', () => {
    render(<ImageUploadField label="로고" value="" onChange={vi.fn()} disabled />);
    const dropzone = screen.getByRole('button', { name: /이미지 업로드/ }) as HTMLButtonElement;
    expect(dropzone.disabled).toBe(true);
  });
});

describe('imageFileError — 클라이언트 검증 순수 함수 (ImageGalleryField 와 공유)', () => {
  function fileOf(type: string, sizeBytes: number): File {
    const file = new File(['x'], 'sample', { type });
    Object.defineProperty(file, 'size', { value: sizeBytes });
    return file;
  }

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
