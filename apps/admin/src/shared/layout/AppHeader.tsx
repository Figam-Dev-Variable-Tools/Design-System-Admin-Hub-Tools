// AppHeader — 콘텐츠 영역 상단 헤더 (A40 소유 — apps/admin/src/**)
//
// 좌측: 브랜드/역할 라벨 + 현재 화면의 한국어 명칭(nav-config 에서 유도)
// 우측: 오늘 날짜 + 로그인 계정
//
// [스타일 규칙] 토큰 CSS 변수만 — 하드코딩 색상 hex / px 리터럴 0건.
// React 스타일에서 단축 속성(padding)과 개별 속성(paddingLeft)을 섞지 않는다.
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';

import { TOP_BAR_HEIGHT } from './layout-metrics';
import { findNavLabel } from './nav-config';

/** 브랜드 워드마크 — 로고 자산 확정 전까지 자리표시 (사이드바 LogoPlaceholder 와 동일 문구) */
const BRAND_LABEL = 'LOGO';
const ROLE_LABEL = '관리자';

// 로그인 세션이 앱 전역 상태로 올라오면 여기서 읽는다 (현재는 mock).
const ACCOUNT_EMAIL = 'admin@klipse.com';

// 높이를 사이드바 로고 영역과 동일한 TOP_BAR_HEIGHT 로 고정 — 두 구분선이 한 줄로 이어진다.
const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-4)',
  boxSizing: 'border-box',
  height: TOP_BAR_HEIGHT,
  paddingLeft: 'var(--tds-space-6)',
  paddingRight: 'var(--tds-space-6)',
  background: 'var(--tds-color-surface-default)',
  borderBottom: 'thin solid var(--tds-color-border-default)',
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  marginTop: 'var(--tds-space-1)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-primitive-typography-font-size-18)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  lineHeight: 'var(--tds-primitive-typography-line-height-tight)',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 'var(--tds-space-1)',
};

const dateStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const accountStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

/** 2026. 7. 14 (화) */
function formatToday(now: Date): string {
  const date = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(now);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(now);
  return `${date} (${weekday})`;
}

export default function AppHeader() {
  const { pathname } = useLocation();
  const title = findNavLabel(pathname);
  const now = new Date();

  return (
    <header style={headerStyle}>
      <div>
        <p style={eyebrowStyle}>
          {BRAND_LABEL} · {ROLE_LABEL}
        </p>
        <h1 style={titleStyle}>{title}</h1>
      </div>

      <div style={metaStyle}>
        <p style={dateStyle}>
          <time dateTime={now.toISOString().slice(0, 10)}>{formatToday(now)}</time>
        </p>
        <p style={accountStyle}>{ACCOUNT_EMAIL}</p>
      </div>
    </header>
  );
}
