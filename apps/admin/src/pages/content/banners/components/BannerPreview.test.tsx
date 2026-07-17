// BannerPreview 실시간 반영 단언 (오너 피드백 ⑤)
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BannerPreview } from './BannerPreview';

describe('BannerPreview', () => {
  it('제목을 그대로 비추고, 비면 자리표시를 보인다', () => {
    const { rerender } = render(
      <BannerPreview title="봄 기획전" imageUrl="" linkUrl="" placementLabel="메인" enabled />,
    );
    expect(screen.getByRole('heading', { name: '봄 기획전' })).not.toBeNull();

    rerender(<BannerPreview title="  " imageUrl="" linkUrl="" placementLabel="메인" enabled />);
    expect(screen.getByRole('heading', { name: '배너 제목' })).not.toBeNull();
  });

  it('이미지가 없으면 자리표시, 있으면 <img>', () => {
    const { container, rerender } = render(
      <BannerPreview title="x" imageUrl="" linkUrl="" placementLabel="메인" enabled />,
    );
    expect(screen.getByText('이미지 미리보기')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <BannerPreview
        title="x"
        imageUrl="https://cdn.example.com/b.png"
        linkUrl=""
        placementLabel="메인"
        enabled
      />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/b.png',
    );
  });

  it('링크가 있으면 바로가기 버튼을 보인다', () => {
    render(
      <BannerPreview
        title="x"
        imageUrl=""
        linkUrl="https://example.com"
        placementLabel="서브"
        enabled
      />,
    );
    expect(screen.getByText('바로가기')).not.toBeNull();
  });

  it('노출 OFF 면 위치 캡션에 OFF 안내를 보인다', () => {
    render(
      <BannerPreview title="x" imageUrl="" linkUrl="" placementLabel="서브" enabled={false} />,
    );
    expect(screen.getByText(/노출 OFF/)).not.toBeNull();
    expect(screen.getByText(/서브 영역에 노출/)).not.toBeNull();
  });
});
