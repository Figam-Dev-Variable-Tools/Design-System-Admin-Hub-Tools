// 이미지 업로드 필드 회귀 테스트 (A41) — 프리뷰·placeholder·클라이언트 검증
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageUploadField } from './ImageUploadField';

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

describe('ImageUploadField', () => {
  it('값이 없으면 업로드 안내(placeholder)를 그린다 — 이미지는 없다', () => {
    render(<ImageUploadField label="로고" value="" onChange={vi.fn()} />);
    expect(screen.getByText(/끌어다 놓으세요/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('값이 있으면 미리보기 이미지를 그린다', () => {
    render(<ImageUploadField label="로고" value="blob:existing" onChange={vi.fn()} />);
    expect(screen.getByAltText('로고 미리보기')).toBeTruthy();
  });

  it('이미지 파일을 고르면 object URL 로 onChange 한다', () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUploadField label="로고" value="" onChange={onChange} />);
    fireEvent.change(fileInput(container), { target: { files: [imageFile()] } });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('blob:mock-url');
  });

  it('이미지가 아니면 막고 오류를 인라인으로 알린다', () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUploadField label="로고" value="" onChange={onChange} />);
    const notImage = new File(['x'], 'note.txt', { type: 'text/plain' });
    fireEvent.change(fileInput(container), { target: { files: [notImage] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('이미지 파일');
  });
});
