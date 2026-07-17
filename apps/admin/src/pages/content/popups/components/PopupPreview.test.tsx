// PopupPreview 실시간 반영 단언 (오너 피드백 ⑤)
//
// 미리보기는 입력을 즉시 비추어야 한다 — 제목/링크/노출 위치/ON·OFF 가 화면에 그대로 나타나는지,
// 이미지가 없으면 자리표시로 대체하는지를 단언한다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PopupPreview } from './PopupPreview';

describe('PopupPreview', () => {
  it('제목을 그대로 비춘다', () => {
    render(
      <PopupPreview title="여름 세일" imageUrl="" linkUrl="" positionLabel="메인 홈" enabled />,
    );
    expect(screen.getByRole('heading', { name: '여름 세일' })).not.toBeNull();
  });

  it('제목이 비면 자리표시(팝업 제목)를 보인다', () => {
    render(<PopupPreview title="  " imageUrl="" linkUrl="" positionLabel="메인 홈" enabled />);
    expect(screen.getByRole('heading', { name: '팝업 제목' })).not.toBeNull();
  });

  it('이미지 URL 이 없으면 이미지 자리표시를 보인다', () => {
    const { container } = render(
      <PopupPreview title="x" imageUrl="" linkUrl="" positionLabel="메인 홈" enabled />,
    );
    expect(screen.getByText('이미지 미리보기')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('이미지 URL 이 있으면 <img> 로 렌더한다', () => {
    const { container } = render(
      <PopupPreview
        title="x"
        imageUrl="https://cdn.example.com/a.png"
        linkUrl=""
        positionLabel="메인 홈"
        enabled
      />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('링크가 있으면 링크 버튼을, 없으면 감춘다', () => {
    const { rerender } = render(
      <PopupPreview
        title="x"
        imageUrl=""
        linkUrl="https://example.com"
        positionLabel="메인 홈"
        enabled
      />,
    );
    expect(screen.getByText('자세히 보기')).not.toBeNull();

    rerender(<PopupPreview title="x" imageUrl="" linkUrl="" positionLabel="메인 홈" enabled />);
    expect(screen.queryByText('자세히 보기')).toBeNull();
  });

  it('노출 OFF 면 위치 캡션에 OFF 안내를 보인다', () => {
    render(
      <PopupPreview
        title="x"
        imageUrl=""
        linkUrl=""
        positionLabel="이벤트 페이지"
        enabled={false}
      />,
    );
    expect(screen.getByText(/노출 OFF/)).not.toBeNull();
    expect(screen.getByText(/이벤트 페이지 에 노출/)).not.toBeNull();
  });
});
