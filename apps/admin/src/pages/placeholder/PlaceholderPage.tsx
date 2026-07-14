// 준비 중 화면 (A40 소유 — apps/admin/src/**)
//
// 사이드바(nav-config.ts)에 정의됐지만 아직 구현되지 않은 라우트가 여기로 온다.
// 화면을 하나씩 만들 때마다 App.tsx 에서 실제 페이지로 교체한다 — 사이드바 항목이
// 죽은 링크가 되지 않게 하는 것이 목적이다.
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';

import { collectNavRoutes } from '../../shared/layout/nav-config';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  alignItems: 'flex-start',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'var(--tds-primitive-typography-font-size-18)',
  lineHeight: 'var(--tds-primitive-typography-line-height-tight)',
};

const bodyStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const label = collectNavRoutes().find((leaf) => leaf.to === pathname)?.label ?? pathname;

  return (
    <section style={wrapStyle}>
      <h1 style={titleStyle}>{label}</h1>
      <p style={bodyStyle}>준비 중인 화면입니다.</p>
      <p style={bodyStyle}>{pathname}</p>
    </section>
  );
}
