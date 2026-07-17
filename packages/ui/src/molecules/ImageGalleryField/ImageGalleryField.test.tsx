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

// required 를 AT 에 잇는다 (A11Y-11)
//
// 이 갤러리의 required 는 '최소 한 장' 이라는 **묶음 단위** 요구다. 그래서 꼬리표는 그 요구가 아직
// 안 채워진 상태(빈 드롭존)에만 붙고, 이미 한 장 이상 있는 상태의 '추가' 버튼에는 붙지 않는다 —
// 거기서 '필수' 라고 말하면 '더 넣어야 한다' 는 거짓말이 된다.
// (aria-required 는 role=button 이 지원하지 않는다 — ImageUploadField 의 requiredNameSuffix 주석 참조)
describe('ImageGalleryField — required 의 AT 경로', () => {
  it('required 이고 아직 비었으면 드롭존 이름이 필수임을 밝힌다', () => {
    render(<ImageGalleryField label="상세 이미지" values={[]} onChange={vi.fn()} required />);
    expect(screen.getByRole('button', { name: /상세 이미지 \(필수\)/ })).toBeTruthy();
  });

  it('required 가 아니면 꼬리표가 붙지 않는다 (대조)', () => {
    render(<ImageGalleryField label="상세 이미지" values={[]} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /필수/ })).toBeNull();
  });

  it('이미 한 장 이상이면 요구가 충족됐다 — 추가 버튼은 필수라고 말하지 않는다', () => {
    render(
      <ImageGalleryField label="상세 이미지" values={['blob:a']} onChange={vi.fn()} required />,
    );
    expect(screen.getByRole('button', { name: '상세 이미지 이미지 추가' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /필수/ })).toBeNull();
  });

  it('aria-required 를 role=button 에 얹지 않는다 — 지원하지 않는 속성이다', () => {
    const { container } = render(
      <ImageGalleryField label="상세 이미지" values={[]} onChange={vi.fn()} required />,
    );
    expect(container.querySelectorAll('[aria-required]')).toHaveLength(0);
  });
});
