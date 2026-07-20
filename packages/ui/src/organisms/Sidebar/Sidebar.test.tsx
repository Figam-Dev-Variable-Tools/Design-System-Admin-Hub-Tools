// Sidebar — 계약 검증 테스트 (contracts/Sidebar.contract.json@1.0.0)
//
//   a11y.role         navigation (<nav aria-label>)
//   a11y.aria         aria-current · aria-expanded · aria-controls
//   states[]          default · hover · focus-visible · open · selected
//   events            onNavigate(href) · onToggle(id)
//
// [왜 이 파일이 이관보다 먼저 존재해야 하나] work-cycle.md §6 — 어떤 화면의 a11y 표면을 DS 로
// 옮기기 전에 그 표면을 보는 검사를 먼저 만든다. 검사 없이 옮기면 통과가 아무것도 증명하지
// 않는다(같은 리포에서 aria-pressed 를 통째로 지웠는데 245건이 전부 통과한 실측이 있다).
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import sidebarCss from './Sidebar.css?raw';
import { Sidebar } from './Sidebar';

const SECTIONS = [
  {
    id: 'ops',
    title: '운영',
    items: [
      { id: 'dashboard', label: '대시보드', href: '/dashboard' },
      { id: 'members', label: '회원', href: '/users/members' },
    ],
  },
  {
    id: 'site',
    title: '사이트',
    items: [
      {
        id: 'company',
        label: '기업 정보',
        children: [
          { id: 'profile', label: '회사 소개', href: '/company/profile' },
          { id: 'history', label: '연혁', href: '/company/history' },
        ],
      },
    ],
  },
];

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  return render(<Sidebar label="주 내비게이션" sections={SECTIONS} {...props} />);
}

/**
 * 스타일시트에서 셀렉터의 선언 블록을 뽑는다 — 규칙이 없으면 null (그러면 단언이 실패한다).
 * hover 규칙이 최상위/하위 항목을 콤마로 묶으므로 "셀렉터 바로 뒤에 여는 중괄호" 를 가정하지 않고
 * 셀렉터 등장 위치에서 다음 여는 중괄호를 찾는다.
 */
function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(selector);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return open < 0 || close < 0 ? null : css.slice(open + 1, close);
}

/** 주 내비게이션 안에서 aria-current=page 를 단 항목들의 href */
function activeHrefs(): string[] {
  const nav = screen.getByRole('navigation', { name: '주 내비게이션' });
  return [...nav.querySelectorAll('[aria-current="page"]')].map(
    (el) => el.getAttribute('href') ?? '',
  );
}

describe('Sidebar — 랜드마크와 구조 (a11y.role)', () => {
  it('Sidebar: default 상태 — nav 랜드마크가 label prop 을 접근 가능한 이름으로 갖는다', () => {
    renderSidebar();
    expect(screen.getByRole('navigation', { name: '주 내비게이션' })).not.toBeNull();
  });

  it('바깥은 complementary 랜드마크, 안쪽이 navigation 이다', () => {
    renderSidebar();
    const complementary = screen.getByRole('complementary');
    expect(complementary.querySelector('nav')).not.toBeNull();
  });

  it('섹션 제목은 h2 이고 항목은 목록(li)에 담긴다 — 스크린리더가 개수를 읽는다', () => {
    renderSidebar();
    expect(screen.getByRole('heading', { level: 2, name: '운영' })).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: '사이트' })).not.toBeNull();
    // 잎 2 + 가지 1 = 최상위 3항목
    const nav = screen.getByRole('navigation', { name: '주 내비게이션' });
    expect(nav.querySelectorAll('ul > li').length).toBe(3);
  });
});

describe('Sidebar — 활성 표시 (states: selected)', () => {
  it('Sidebar: selected 상태 — activeHref 와 같은 링크만 aria-current=page 를 단다', () => {
    renderSidebar({ activeHref: '/users/members' });
    expect(activeHrefs()).toStrictEqual(['/users/members']);
  });

  it('activeHref 가 비어 있으면 아무것도 켜지 않는다', () => {
    renderSidebar({ activeHref: '' });
    expect(activeHrefs()).toStrictEqual([]);
  });

  it('펼친 가지의 하위 링크도 같은 규칙으로 켜진다', () => {
    renderSidebar({ openId: 'company', activeHref: '/company/history' });
    expect(activeHrefs()).toStrictEqual(['/company/history']);
  });

  /** 색 하나에 기대지 않는다 (WCAG 1.4.1) — 마커와 굵기가 함께 바뀐다 */
  it('활성 항목은 시작 모서리 마커 색과 굵기를 함께 바꾼다', () => {
    const active = sidebarCss.slice(sidebarCss.indexOf('.tds-sidebar__item--active'));
    const body = active.slice(active.indexOf('{'), active.indexOf('}'));
    expect(body).toContain('border-inline-start-color');
    expect(body).toContain('font-weight');
  });
});

describe('Sidebar — 포인터·키보드 상태 (states: hover · focus-visible)', () => {
  // hover 는 포인터 의사 클래스라 jsdom 에 실제 상태가 없다 — 검증할 수 있는 유일한 진짜
  // 단언은 스타일시트 규칙 자체다. 규칙을 지우면 이 테스트가 실패한다 (Button 선례).
  it('Sidebar: hover 상태 — 최상위·하위 항목이 같은 raised 배경으로 올라간다', () => {
    const top = ruleBody(sidebarCss, '.tds-sidebar__item:hover');
    const sub = ruleBody(sidebarCss, '.tds-sidebar__sub-item:hover');

    expect(top).not.toBeNull();
    expect(top).toContain('var(--tds-color-surface-raised)');
    // 두 층이 갈라지면 같은 목록 안에서 hover 가 두 가지 색으로 보인다
    expect(sub).toBe(top);
  });

  it('Sidebar: focus-visible 상태 — 링크가 키보드 포커스를 받고 :focus-visible 규칙이 링을 그린다', async () => {
    renderSidebar();

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: '대시보드' }));

    // 두께는 CSS 키워드가 아니라 단일 토큰 border-width.medium 에서 온다 (TOKEN-02)
    const ring = ruleBody(sidebarCss, '.tds-sidebar__item:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-border-width-medium)');
    expect(ring).toContain('var(--tds-color-border-focus)');
  });
});

describe('Sidebar — 가지 펼침 (states: open · aria-expanded/controls)', () => {
  it('접힌 가지는 aria-expanded=false 이고 aria-controls 를 달지 않는다', () => {
    renderSidebar({ openId: '' });
    const branch = screen.getByRole('button', { name: /기업 정보/ });
    expect(branch.getAttribute('aria-expanded')).toBe('false');
    // 접혀 있으면 그 id 를 가진 요소가 없으므로 속성 자체를 내린다
    expect(branch.getAttribute('aria-controls')).toBeNull();
  });

  it('Sidebar: open 상태 — 펼친 가지는 aria-expanded=true 이고 aria-controls 가 실재하는 목록을 가리킨다', () => {
    renderSidebar({ openId: 'company' });
    const branch = screen.getByRole('button', { name: /기업 정보/ });
    expect(branch.getAttribute('aria-expanded')).toBe('true');

    const controls = branch.getAttribute('aria-controls');
    expect(controls).not.toBeNull();
    expect(document.getElementById(controls ?? '')).not.toBeNull();
  });

  /** 보이지 않는 것이 탭 순서에 남으면 키보드 사용자가 허공을 지난다 */
  it('접힌 가지의 하위 링크는 DOM 에 아예 없다', () => {
    renderSidebar({ openId: '' });
    expect(screen.queryByRole('link', { name: '회사 소개' })).toBeNull();

    renderSidebar({ openId: 'company' });
    expect(screen.getByRole('link', { name: '회사 소개' })).not.toBeNull();
  });

  it('펼침 버튼은 열지 닫을지를 정하지 않고 자기 id 만 올린다', async () => {
    const onToggle = vi.fn();
    renderSidebar({ openId: 'company', onToggle });

    await userEvent.click(screen.getByRole('button', { name: /기업 정보/ }));
    expect(onToggle).toHaveBeenCalledWith('company');
    // DS 는 자기 상태를 바꾸지 않는다 — openId 가 그대로면 여전히 펼쳐져 있다
    expect(screen.getByRole('button', { name: /기업 정보/ }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });
});

describe('Sidebar — 이동 (events.onNavigate)', () => {
  it('진짜 href 를 그린다 — 라우터가 없어도 링크로 동작한다', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: '대시보드' }).getAttribute('href')).toBe('/dashboard');
  });

  it('수식키 없는 왼쪽 클릭은 가로채서 href 를 올린다', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });

    await userEvent.click(screen.getByRole('link', { name: '회원' }));
    expect(onNavigate).toHaveBeenCalledWith('/users/members');
  });

  /** 새 탭 열기는 링크의 기본 계약이다 — 그것까지 가로채면 진짜 href 를 그린 의미가 사라진다 */
  it('Ctrl/Meta 를 누른 클릭은 가로채지 않는다', () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });

    // userEvent.click 은 수식키 상태를 합성 이벤트로 실어 주지 않는다 — 그 상태 자체가
    // 검사 대상이라 fireEvent 로 ctrlKey 를 직접 태운다
    fireEvent.click(screen.getByRole('link', { name: '회원' }), { button: 0, ctrlKey: true });
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('link', { name: '회원' }), { button: 0, metaKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('onNavigate 를 주지 않으면 기본 동작을 막지 않는다', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: '회원' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('Sidebar — 슬롯과 토큰', () => {
  it('brand 슬롯이 주입한 것을 그대로 그린다 — DS 는 특정 로고를 담지 않는다', () => {
    renderSidebar({ brand: <span>내 로고</span> });
    expect(screen.getByText('내 로고')).not.toBeNull();
  });

  it('brand 를 주지 않아도 렌더된다', () => {
    renderSidebar();
    expect(screen.getByRole('navigation', { name: '주 내비게이션' })).not.toBeNull();
  });

  /** RTL 에서 사이드바와 활성 마커가 함께 반대편으로 가야 한다 */
  it('방향 의존 속성이 전부 논리 속성이다 (left/right 0건)', () => {
    const physical = sidebarCss.match(/\b(border|padding|margin)-(left|right)\b/g) ?? [];
    expect(physical).toStrictEqual([]);
  });
});
