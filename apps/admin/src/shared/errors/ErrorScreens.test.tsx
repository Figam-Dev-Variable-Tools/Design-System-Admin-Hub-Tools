// 복구 화면의 a11y 표면 — @tds/ui Result 승격 이관을 지키는 검사
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 생겼나]
// 이관 직전 실측: 이 두 화면(RouteErrorScreen · ForbiddenScreen)의 a11y 표면을 보는 검사가
// 리포 전체에 **0건**이었다. work-cycle.md §6 이 못박은 함정이 정확히 이것이다 —
// "어떤 화면의 a11y 표면을 이관하기 전에 그 표면을 보는 검사를 먼저 만든다. 검사 없이
// 이관하면 통과가 무엇도 증명하지 않는다." (이메일 툴바에서 aria-pressed 를 통째로 지웠는데
// 245건이 전부 통과한 그 사건.)
//
// [무엇을 지키나 — '렌더됐다' 로는 아무것도 지키지 못한다]
// 껍데기가 shared/errors 의 지역 마크업에서 @tds/ui Result 로 넘어갔다. 그 이관이 조용히
// 깨뜨릴 수 있는 것은 셋이고, 셋 다 눈에 보이지 않는다:
//   1. role="alert" — 화면이 그려지지 못했다는 사실이 보조기술에 즉시 가지 않게 된다
//   2. h2 — h1 으로 바뀌면 AppHeader 의 화면 이름과 함께 '이 문서의 제목' 이 둘이 된다
//   3. 참조 코드의 빈 문자열 센티널 — null 을 그대로 넘기면 'null' 이 화면에 찍힌다
// 그래서 '무엇이 보인다' 가 아니라 **역할·제목 단계·센티널**을 단언한다.
//
// [EXC-20] raw stack/서버 body 가 새지 않는다는 것도 함께 못박는다 — 계약에 그 prop 이
// 없다는 것이 강제 수단이지만, 호출부가 description 에 실어 보낼 수는 있으므로 여기서 본다.
// ─────────────────────────────────────────────────────────────────────────────
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ForbiddenScreen, RouteErrorScreen } from './ErrorScreens';

/** 지금 주소를 화면에 내놓는다 — '대시보드로' 가 진짜 이동인지 URL 로 본다 */
function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderScreen(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/members/42']}>
      <LocationProbe />
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RouteErrorScreen — 렌더 예외 복구 화면 (EXC-01)', () => {
  it('role="alert" 라이브 영역이다 — 화면이 그려지지 못한 사실이 즉시 전달된다', () => {
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('문제가 발생했어요');
  });

  it('제목은 h2 다 — 페이지의 h1 은 AppHeader 가 소유하므로 h1 을 하나 더 만들지 않는다', () => {
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('문제가 발생했어요');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('참조 코드가 있으면 "오류 코드 <코드>" 로 보인다 (EXC-20 — 신고에 붙일 유일한 기술 정보)', () => {
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('오류 코드 A1B2C3');
  });

  it('참조 코드가 null 이면 그 줄 자체가 없다 — "null" 이 화면에 찍히지 않는다', () => {
    renderScreen(<RouteErrorScreen reference={null} onRetry={vi.fn()} />);
    const text = screen.getByRole('alert').textContent ?? '';
    expect(text).not.toContain('오류 코드');
    expect(text).not.toContain('null');
    // '없음' 단언 옆의 '있음' 앵커 (work-cycle §6 — toBe(0) 형 단언 함정)
    expect(text).toContain('문제가 발생했어요');
  });

  it('탈출구가 둘이다 — 다시 시도 + 대시보드로', () => {
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('다시 시도를 누르면 onRetry 가 발화한다 — 경계를 풀어 같은 화면을 다시 그린다', async () => {
    const onRetry = vi.fn();
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('대시보드로를 누르면 주소가 /dashboard 로 바뀐다 (패널 노출이 아니라 진짜 이동)', async () => {
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '대시보드로' }));
    expect(screen.getByTestId('pathname').textContent).toBe('/dashboard');
  });

  it('stack trace·서버 body·status 코드를 산문으로 노출하지 않는다 (EXC-20)', () => {
    renderScreen(<RouteErrorScreen reference="A1B2C3" onRetry={vi.fn()} />);
    const text = screen.getByRole('alert').textContent ?? '';
    for (const leak of ['at ', 'Error:', '500', '403', 'stack', '{']) {
      expect(text).not.toContain(leak);
    }
  });
});

describe('ForbiddenScreen — 권한 없음 화면 (EXC-03)', () => {
  it('role="alert" 로 사유를 알린다', () => {
    renderScreen(<ForbiddenScreen />);
    expect(screen.getByRole('alert').textContent).toContain('접근 권한이 없어요');
  });

  it('제목은 h2 다', () => {
    renderScreen(<ForbiddenScreen />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('접근 권한이 없어요');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('재시도 버튼을 주지 않는다 — 다시 눌러도 또 403 이므로 탈출구는 하나뿐이다', () => {
    renderScreen(<ForbiddenScreen />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('대시보드로');
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  });

  it('참조 코드 줄이 없다 — 신고할 고장이 아니라 권한 상태다', () => {
    renderScreen(<ForbiddenScreen />);
    expect(screen.getByRole('alert').textContent).not.toContain('오류 코드');
  });

  it('대시보드로를 누르면 주소가 /dashboard 로 바뀐다', async () => {
    renderScreen(<ForbiddenScreen />);
    await userEvent.click(screen.getByRole('button', { name: '대시보드로' }));
    expect(screen.getByTestId('pathname').textContent).toBe('/dashboard');
  });
});
