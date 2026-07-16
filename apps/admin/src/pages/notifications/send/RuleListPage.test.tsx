// RuleListPage 스모크 — 화면이 실제로 그려지는가 (라우트: /notifications/send)
//
// [왜 필요한가] tsc 와 build 는 '컴파일된다'만 증명한다. 이 화면은 도메인(트리거)·저장소(규칙↔템플릿
// 조회)·공용 CRUD 프레임워크·URL 상태 훅이 처음으로 한자리에서 맞물리는 곳이라, 배선이 어긋나면
// 런타임에만 터진다. 픽스처가 실제로 행으로 그려지고, 이 섹션의 정체성(이벤트 열·정보성 안내·
// ON/OFF 스위치)이 화면에 나오는지까지 본다.
//
// E2E 는 이번 배치에서 금지(포트 충돌)라 jsdom 에서 실제 provider 로 렌더한다.
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import RuleListPage from './RuleListPage';

function renderPage() {
  // 테스트용 QueryClient — 재시도 없이 즉시 실패시켜 픽스처 지연만 기다린다
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/notifications/send']}>
          <RuleListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('RuleListPage — 스모크', () => {
  it('픽스처 규칙을 행으로 그린다 — 이벤트명과 연결된 템플릿명이 보인다', async () => {
    renderPage();

    // 픽스처 ntf-rule-1: order.placed → '주문 접수 안내'(이메일). 못 찾으면 findBy 가 던진다.
    expect(await screen.findByText('주문 접수 안내')).not.toBeNull();
    // 이벤트 열 — 이 섹션을 마케팅과 가르는 축이 첫 열에 보인다
    expect(screen.getAllByText('주문 접수').length).toBeGreaterThan(0);
  });

  it('정보성 알림 안내와 마케팅 관리 링크를 보여준다 — 역할 경계를 화면이 말한다', async () => {
    renderPage();
    await screen.findByText('주문 접수 안내');

    const link = screen.getByRole('link', { name: '마케팅 관리로 이동' });
    expect(link.getAttribute('href')).toBe('/marketing/templates');
  });

  it('규칙마다 자동 발송 ON/OFF 스위치가 있다 — 운영의 핵심 스위치', async () => {
    renderPage();
    await screen.findByText('주문 접수 안내');

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    // 픽스처 ntf-rule-9(휴면 예고)는 꺼둔 표본이라 꺼진 스위치가 최소 하나 있다
    expect(switches.some((element) => element.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('분류 필터는 선택 상태를 aria-pressed 로 알린다 (A11Y-12)', async () => {
    renderPage();
    await screen.findByText('주문 접수 안내');

    // 기본은 '전체' 선택. aria-current 가 아니라 aria-pressed 여야 한다(토글 필터이지 현재 위치가 아니다).
    expect(screen.getByRole('button', { name: /전체/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /보안/ }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: /전체/ }).getAttribute('aria-current')).toBeNull();
  });
});
