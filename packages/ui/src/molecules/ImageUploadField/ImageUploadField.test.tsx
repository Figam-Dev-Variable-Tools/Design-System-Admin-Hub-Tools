// ImageUploadField — 계약 검증 테스트 (contracts/ImageUploadField.contract.json@1.1.0)
//
//   default   미선택이면 업로드 안내(placeholder) — 이미지는 없다
//   preview   값이 있으면 미리보기 이미지(alt)
//   onChange  이미지 파일을 고르면 object URL 로 onChange, 제거하면 '' 로 onChange
//   error     이미지가 아니면 막고 role=alert 인라인 오류 (로컬 검증)
//   disabled  드롭존이 비활성된다
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageUploadField, imageFileError, requiredNameSuffix } from './ImageUploadField';

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

// required 를 AT 에 잇는다 (A11Y-11)
//
// [왜 aria-required 를 단언하지 않나] 이 필드가 AT 에 내놓는 컨트롤은 <button>(드롭존)이다.
// aria-required 는 role=button 이 지원하는 속성이 아니라 붙이면 거짓 시맨틱이자 axe 위반이다.
// 진짜 <input type="file"> 은 aria-hidden + tabIndex=-1 인 트리거라 AT 가 보지 못한다.
// 그래서 필수가 닿는 경로는 **접근성 이름** 하나뿐이고, 이 테스트가 그 경로를 고정한다.
// (마커 * 는 aria-hidden 이라 이름에 들어가지 않는다 — 그것이 이 결함의 출발점이었다)
describe('ImageUploadField — required 의 AT 경로', () => {
  it('required 면 드롭존의 접근성 이름이 필수임을 밝힌다', () => {
    render(<ImageUploadField label="대표 이미지" value="" onChange={vi.fn()} required />);
    expect(screen.getByRole('button', { name: /대표 이미지 \(필수\)/ })).toBeTruthy();
  });

  it('required 가 아니면 이름에 필수 꼬리표가 붙지 않는다 (대조)', () => {
    render(<ImageUploadField label="대표 이미지" value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /필수/ })).toBeNull();
    expect(screen.getByRole('button', { name: /대표 이미지 이미지 업로드/ })).toBeTruthy();
  });

  it('aria-required 를 role=button 에 얹지 않는다 — 지원하지 않는 속성이다', () => {
    const { container } = render(
      <ImageUploadField label="대표 이미지" value="" onChange={vi.fn()} required />,
    );
    expect(container.querySelectorAll('[aria-required]')).toHaveLength(0);
  });
});

describe('requiredNameSuffix — 순수 유틸', () => {
  it('required 면 꼬리표를, 아니면 빈 문자열을 준다', () => {
    expect(requiredNameSuffix(true)).toBe(' (필수)');
    expect(requiredNameSuffix(false)).toBe('');
  });
});
