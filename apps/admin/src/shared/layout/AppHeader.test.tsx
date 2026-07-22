// AppHeader — 셸 상단 바의 a11y 표면과 앱 배선 · apps/admin/src/shared/layout/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 생겼나]
// AppHeader 에는 검사가 **하나도 없었다.** 그 상태로 DS(@tds/ui 의 Header)로 이관하면
// 통과가 아무것도 증명하지 않는다 — 같은 리포에서 aria-pressed 를 통째로 지웠는데 245건이
// 전부 통과한 실측이 있다 (work-cycle.md §6 "검사가 없는 표면에서 초록은 증거가 아니다").
//
// [무엇을 지키나] 이관 뒤에도 남아야 하는 것은 셋이다.
//   1) banner 랜드마크가 있다
//   2) 화면 제목이 <h1> 이고 **하나뿐**이다 — 화면 130여 개가 자기 제목을 여기 맡긴다 (IA-02)
//   3) 그 제목이 nav-config 의 findNavLabel 과 **같은 답**이다 — 사이드바 활성 표시와
//      갈리지 않게 하는 것이 이 판정을 한 벌로 유지하는 이유다
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AppHeader from './AppHeader';
import { findNavLabel } from './nav-config';

/*
 * [왜 프로바이더를 두르나] 헤더 우측에 알림 벨이 들어오면서 이 컴포넌트가 조회(useQuery)와
 * 권한(usePermissions)을 쓰게 됐다 — 실제 앱에서는 둘 다 이미 헤더를 감싸고 있다.
 * 벨을 프로바이더 없이도 돌게 만드는 방어는 넣지 않는다: 그러면 배선이 빠진 채로도 초록이라
 * 진짜 앱에서 벨이 죽는 날 이 테스트가 아무 말도 하지 않는다.
 */
function renderAt(pathname: string): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[pathname]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppHeader />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppHeader — 랜드마크와 제목 계층', () => {
  it('banner 랜드마크를 낸다', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('banner')).not.toBeNull();
  });

  it('화면 제목은 <h1> 이며 하나뿐이다', () => {
    renderAt('/users/members');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  /** 눈썹(브랜드·역할)이 <h2> 가 되면 스크린리더 제목 목록이 브랜드 이름으로 오염된다 */
  it('브랜드·역할 눈썹은 제목 계층에 들어가지 않는다', () => {
    renderAt('/dashboard');
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByText(/LOGO · 관리자/).tagName).toBe('P');
  });
});

describe('AppHeader — 제목은 nav-config 가 정본이다', () => {
  /**
   * 기대값을 손으로 적지 않고 findNavLabel 에서 가져오는 것이 요점이다.
   * 사이드바 활성 표시(AppShell.nav-active.test.tsx)가 같은 함수를 쓰므로, 둘이 갈리면 여기서 깨진다.
   */
  it.each([
    '/dashboard',
    '/users/members',
    '/settings/oauth/kakao',
    '/content/notices/3/edit',
    '/company/history/new',
  ])('%s 의 <h1> 은 findNavLabel 의 답과 같다', (pathname) => {
    renderAt(pathname);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(findNavLabel(pathname));
    document.body.innerHTML = '';
  });
});

describe('AppHeader — 우측 메타 (앱만 아는 사실)', () => {
  it('로그인 계정을 낸다', () => {
    renderAt('/dashboard');
    expect(screen.getByText('test@example.com')).not.toBeNull();
  });

  /** 기계가 읽는 날짜는 <time dateTime> 이다 — 한국어 표기 문자열만으로는 파싱되지 않는다 */
  it('오늘 날짜를 <time dateTime> 으로 낸다', () => {
    renderAt('/dashboard');
    const time = document.querySelector('time');
    expect(time).not.toBeNull();
    expect(time?.getAttribute('dateTime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
