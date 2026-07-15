// 목록 썸네일 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [왜 공통인가] 로고 목록·인증서 목록·미리보기가 작은 이미지를 보여준다. URL 이 비었거나 로드에
// 실패하면 빈칸/깨진 이미지 대신 **이미지 아이콘 placeholder** 를 그린다 — 한 곳에서 보장한다.
//
// [도메인을 모른다] 무슨 이미지인지 알지 못한다 — src(URL 문자열)와 접근성 이름(alt)만 받는다.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { ImageIcon } from './icons';

const boxStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: 'calc(var(--tds-space-6) * 2.5)',
  height: 'var(--tds-space-6)',
};

const imageStyle: CSSProperties = {
  ...boxStyle,
  objectFit: 'contain',
};

const placeholderStyle: CSSProperties = {
  ...boxStyle,
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-sm)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-muted)',
};

interface ImageThumbProps {
  readonly src: string;
  /** 접근성 이름 — placeholder 일 때도 이 이름으로 읽힌다 */
  readonly alt: string;
}

export function ImageThumb({ src, alt }: ImageThumbProps) {
  const trimmed = src.trim();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  if (trimmed === '' || failed) {
    return (
      <span style={placeholderStyle} role="img" aria-label={alt}>
        <ImageIcon aria-hidden="true" />
      </span>
    );
  }

  return <img src={trimmed} alt={alt} style={imageStyle} onError={() => setFailed(true)} />;
}
