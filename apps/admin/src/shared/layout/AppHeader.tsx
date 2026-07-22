// AppHeader — 콘텐츠 영역 상단 헤더 (DS Header 의 앱 배선)
//
// 좌측: 브랜드/역할 라벨 + 현재 화면의 한국어 명칭(nav-config 에서 유도)
// 우측: 오늘 날짜 + 로그인 계정
//
// [DS 로 옮긴 것 / 여기 남은 것] 바의 시각·배치·<h1> 소유·높이 고정은 전부 @tds/ui 의 Header 가
// 가져갔다. 여기 남은 것은 **앱만 아는 사실** 셋뿐이다: 제목이 어느 라우트에서 유도되는가
// (findNavLabel), 오늘이 며칠인가, 누가 로그인해 있는가. DS 가 이것들을 배우면 다른 앱에서 쓸 수
// 없는 컴포넌트가 된다 (contracts/Header.contract.json 의 description 참조).
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';

import { cssVar, Header } from '@tds/ui';

import { findNavLabel } from './nav-config';
import { NotificationBell } from '../notifications';

/** 브랜드 워드마크 — 로고 자산 확정 전까지 자리표시 (사이드바 LogoPlaceholder 와 동일 문구) */
const BRAND_LABEL = 'LOGO';
const ROLE_LABEL = '관리자';

// 로그인 세션이 앱 전역 상태로 올라오면 여기서 읽는다 (현재는 mock).
const ACCOUNT_EMAIL = 'test@example.com';

const dateStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const accountStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
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
  const now = new Date();

  return (
    <Header
      title={findNavLabel(pathname)}
      eyebrow={`${BRAND_LABEL} · ${ROLE_LABEL}`}
      meta={
        <>
          <p style={dateStyle}>
            <time dateTime={now.toISOString().slice(0, 10)}>{formatToday(now)}</time>
          </p>
          <p style={accountStyle}>{ACCOUNT_EMAIL}</p>
          {/* 알림 벨 — 안읽음 수·목록·이동이 전부 알림 층 안에서 끝난다(shared/notifications).
              헤더는 '어디에 놓을지' 만 정하고 알림이 무엇인지 알지 못한다. */}
          <NotificationBell />
        </>
      }
    />
  );
}
