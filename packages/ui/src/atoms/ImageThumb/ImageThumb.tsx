// ImageThumb — 목록 썸네일 (atom · contracts/ImageThumb.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/ImageThumb.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// src 가 비었거나(trim 후 빈 문자열) 로드에 실패하면 빈칸/깨진 이미지 대신 이미지 아이콘 placeholder
// 를 한 곳에서 보장한다 (계약 states: error). src 가 바뀌면 실패 플래그를 초기화한다 — 이전 URL 의
// 실패가 새 URL 로 새지 않게. 실제 이미지는 alt 로, placeholder 는 role="img" + aria-label={alt} 로
// 같은 접근 가능한 이름을 준다 (계약 a11y). 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { useEffect, useState } from 'react';

import type { ImageThumbProps } from '../../../generated/types/ImageThumb.types';
import './ImageThumb.css';

/** 이미지 placeholder 글리프 — 아이콘 자산 패키지에 의존하지 않는 인라인 SVG (px 리터럴 0건, 장식) */
function ImageGlyph() {
  return (
    <svg
      className="tds-image-thumb__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

export function ImageThumb({ src, alt }: ImageThumbProps) {
  const trimmed = src.trim();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  if (trimmed === '' || failed) {
    return (
      <span className="tds-image-thumb tds-image-thumb--placeholder" role="img" aria-label={alt}>
        <ImageGlyph />
      </span>
    );
  }

  return (
    <img
      src={trimmed}
      alt={alt}
      className="tds-image-thumb tds-image-thumb--image"
      onError={() => setFailed(true)}
    />
  );
}
