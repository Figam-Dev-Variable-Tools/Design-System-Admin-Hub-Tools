// ImageThumb — 계약 검증 테스트 (contracts/ImageThumb.contract.json@1.0.0)
//
//   states[]   default(실제 이미지) · error(빈 src / 로드 실패 → placeholder)
//   events     없음 (onError 는 내부에서 처리 — 외부 이벤트 없음)
//
// 계약 a11y: 실제 이미지는 alt 로, placeholder 는 role="img" + aria-label={alt} 로 같은 이름을 준다.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageThumb } from './ImageThumb';

describe('ImageThumb — 계약 states[]', () => {
  it('ImageThumb: default 상태 — 유효한 src 는 <img> 로 렌더되고 alt 로 접근 가능한 이름을 갖는다', () => {
    render(<ImageThumb src="https://example.com/logo.png" alt="회사 로고" />);
    const img = screen.getByRole('img', { name: '회사 로고' });

    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/logo.png');
  });

  it('ImageThumb: default 상태 — src 앞뒤 공백을 제거한 뒤 렌더한다', () => {
    render(<ImageThumb src="  https://example.com/logo.png  " alt="회사 로고" />);

    expect(screen.getByRole('img', { name: '회사 로고' }).getAttribute('src')).toBe(
      'https://example.com/logo.png',
    );
  });

  it('ImageThumb: error 상태(빈 src) — trim 후 빈 문자열이면 placeholder(role=img + aria-label)', () => {
    render(<ImageThumb src="   " alt="로고 없음" />);
    const placeholder = screen.getByRole('img', { name: '로고 없음' });

    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder.className).toContain('tds-image-thumb--placeholder');
  });

  it('ImageThumb: error 상태(로드 실패) — onError 가 나면 같은 alt 를 유지한 채 placeholder 로 폴백한다', () => {
    render(<ImageThumb src="https://example.com/broken.png" alt="깨진 이미지" />);

    // 처음에는 <img> 로 렌더된다
    const img = screen.getByRole('img', { name: '깨진 이미지' });
    expect(img.tagName).toBe('IMG');

    // 로드 실패 → placeholder <span> 으로 폴백, alt 는 그대로 aria-label 이 된다
    fireEvent.error(img);
    const placeholder = screen.getByRole('img', { name: '깨진 이미지' });
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder.className).toContain('tds-image-thumb--placeholder');
  });
});
