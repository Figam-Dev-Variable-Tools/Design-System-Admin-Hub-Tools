// ImageGalleryField — 계약 검증 테스트 (contracts/ImageGalleryField.contract.json@1.1.0)
//
//   default   값이 없으면 업로드 placeholder — 썸네일 없음
//   onChange  여러 파일을 고르면 URL 배열로 onChange
//   preview   값이 있으면 썸네일 N개 + 각 제거 버튼
//   remove    개별 제거는 그 항목만 뺀 배열로 onChange
//   error     개수 상한 초과는 상한까지만 담고 role=alert 로 알린다
//   disabled  드롭존이 비활성된다
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageGalleryField } from './ImageGalleryField';

let counter = 0;

beforeEach(() => {
  counter = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-${String(counter++)}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function imageFile(name: string): File {
  return new File(['x'], name, { type: 'image/png' });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (input === null) throw new Error('file input not found');
  return input as HTMLInputElement;
}

describe('ImageGalleryField — 계약 states·onChange', () => {
  it('ImageGalleryField: default — 값이 없으면 업로드 placeholder 를 그리고 썸네일은 없다', () => {
    render(<ImageGalleryField label="본문 이미지" values={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/끌어다 놓으세요/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('ImageGalleryField: 여러 파일을 고르면 URL 배열로 onChange 한다', () => {
    let captured: readonly string[] = [];
    const onChange = vi.fn((next: readonly string[]) => {
      captured = next;
    });
    const { container } = render(
      <ImageGalleryField label="본문 이미지" values={[]} onChange={onChange} />,
    );
    fireEvent.change(fileInput(container), {
      target: { files: [imageFile('a.png'), imageFile('b.png')] },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(captured).toHaveLength(2);
  });

  it('ImageGalleryField: 값이 있으면 썸네일 N개 + 각 제거 버튼을 그린다', () => {
    render(
      <ImageGalleryField
        label="본문 이미지"
        values={['blob:a', 'blob:b', 'blob:c']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByLabelText(/이미지 제거/)).toHaveLength(3);
  });

  it('ImageGalleryField: 개별 제거는 그 항목만 뺀 배열로 onChange 한다', () => {
    const onChange = vi.fn();
    render(
      <ImageGalleryField label="본문 이미지" values={['blob:a', 'blob:b']} onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText('1번째 이미지 제거'));
    expect(onChange).toHaveBeenCalledWith(['blob:b']);
  });

  it('ImageGalleryField: error — 개수 상한을 넘기면 상한까지만 담고 role=alert 로 알린다', () => {
    let captured: readonly string[] = [];
    const onChange = vi.fn((next: readonly string[]) => {
      captured = next;
    });
    const { container } = render(
      <ImageGalleryField label="본문 이미지" values={[]} onChange={onChange} maxFiles={2} />,
    );
    fireEvent.change(fileInput(container), {
      target: { files: [imageFile('a.png'), imageFile('b.png'), imageFile('c.png')] },
    });
    expect(captured).toHaveLength(2);
    expect(screen.getByRole('alert').textContent).toContain('최대');
  });

  it('ImageGalleryField: disabled — 드롭존이 비활성된다', () => {
    render(<ImageGalleryField label="본문 이미지" values={[]} onChange={vi.fn()} disabled />);
    const dropzone = screen.getByRole('button', { name: /끌어다 놓으세요/ }) as HTMLButtonElement;
    expect(dropzone.disabled).toBe(true);
  });
});
