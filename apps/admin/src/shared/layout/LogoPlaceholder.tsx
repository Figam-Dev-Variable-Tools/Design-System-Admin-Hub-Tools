// 사이드바 로고 자리표시
//
// 실제 로고 자산이 정해지기 전까지 브랜드 영역의 크기·정렬을 잡아두는 플레이스홀더다.
// 자산이 생기면 이 컴포넌트 하나만 교체하면 된다 (AppShell 은 건드릴 필요 없음).
//
// [스타일 규칙] 색상은 토큰 CSS 변수만 — 하드코딩 hex 0건. 크기는 em 기준(부모 font-size 추종).
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

const wrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
};

/** 로고 마크 — 자산 확정 전까지의 자리표시 도형 */
const markStyle: CSSProperties = {
  display: 'block',
  width: '2em',
  height: '2em',
  flexShrink: 0,
};

const wordmarkStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('primitive.typography.font-size.18'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('primitive.typography.line-height.tight'),
  letterSpacing: '0.04em',
};

export default function LogoPlaceholder() {
  return (
    <div style={wrapStyle}>
      <svg
        style={markStyle}
        viewBox="0 0 32 32"
        role="img"
        aria-label="로고 자리표시"
        focusable="false"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8"
          fill="var(--tds-color-surface-raised)"
          stroke="var(--tds-color-border-default)"
          strokeWidth="1.5"
        />
        {/* 이미지 자산이 들어올 자리임을 드러내는 대각선 — 자산 교체 시 함께 사라진다 */}
        <path
          d="M6 26 26 6"
          stroke="var(--tds-color-border-default)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="4" fill="var(--tds-color-action-primary-default)" />
      </svg>
      <p style={wordmarkStyle}>LOGO</p>
    </div>
  );
}
