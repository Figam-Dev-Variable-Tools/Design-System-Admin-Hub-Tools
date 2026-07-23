// Menu — 계약 검증 테스트 (contracts/Menu.contract.json@1.0.0)
//
//   states[]          default · hover · focus-visible · open · disabled
//   a11y.keyboard     ArrowDown · ArrowUp · Home · End · Escape · Tab
//   events.onSelect   blockedWhen: items[].disabled · items[].disabledReason
//
// 키보드 축은 이 컴포넌트 승격의 이유 그 자체다 — 출처 구현 둘 중 약한 쪽에는 화살표·Home/End 가
// 없었다. 그래서 축마다 따로 검사한다.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import menuCss from './Menu.css?raw';
import { Menu } from './Menu';

const ITEMS = [
  { id: 'notify', label: '알림 발송' },
  { id: 'export', label: '내보내기' },
  { id: 'delete', label: '회원 삭제', danger: true },
];

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

/** 팝업을 열고 role=menu 를 돌려준다 — 대부분의 검사가 열린 상태에서 시작한다 */
async function openMenu(user: ReturnType<typeof userEvent.setup>, name = '명재우 회원 액션') {
  await user.click(screen.getByRole('button', { name }));
  return screen.getByRole('menu', { name });
}

describe('Menu — 계약 states[]', () => {
  it('Menu: default 상태 — 트리거만 있고 팝업은 없다. aria-haspopup=menu · aria-expanded=false', () => {
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);

    const trigger = screen.getByRole('button', { name: '명재우 회원 액션' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // 닫혀 있으면 그 id 를 가진 요소가 없으므로 aria-controls 자체를 내린다
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Menu: open 상태 — role=menu 가 label 로 이름을 갖고 각 명령이 role=menuitem 이다', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);

    const menu = await openMenu(user);
    const trigger = screen.getByRole('button', { name: '명재우 회원 액션' });

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    // menu 의 자식은 menuitem 이어야 한다 — <li> 는 role="none" 으로 목록 시맨틱을 걷어낸다
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('Menu: hover 상태 — :hover 규칙이 항목 배경을 raised 로 올린다', () => {
    const rule = ruleBody(menuCss, '.tds-menu__item:hover:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-surface-raised)');
  });

  it('Menu: focus-visible 상태 — 열리면 첫 항목으로 포커스가 옮겨가고 포커스 링 규칙이 있다', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);

    await openMenu(user);

    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '알림 발송' }));

    const ring = ruleBody(menuCss, '.tds-menu__item:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('Menu: disabled 상태 — 잠긴 항목은 native disabled + aria-disabled 이고 포커스를 받지 않는다', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="구글 로그인 더보기"
        items={[
          { id: 'edit', label: '수정', disabledReason: '발송 중에는 바꿀 수 없어요' },
          { id: 'view', label: '보기' },
        ]}
      />,
    );

    await openMenu(user, '구글 로그인 더보기');
    const locked = screen.getByRole('menuitem', { name: '수정' });

    expect(locked.hasAttribute('disabled')).toBe(true);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    // 잠긴 항목을 건너뛰고 다음 활성 항목이 포커스를 받는다
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '보기' }));
  });
});

describe('Menu — 잠긴 이유 (계약 items[].disabledReason)', () => {
  it('Menu: disabledReason 은 항목 아래에 렌더되고 aria-describedby 로 그 항목에 이어진다', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="구글 로그인 더보기"
        items={[{ id: 'edit', label: '수정', disabledReason: '연동을 먼저 껐다 켜야 해요' }]}
      />,
    );

    await openMenu(user, '구글 로그인 더보기');
    const item = screen.getByRole('menuitem', { name: '수정' });
    const reasonId = item.getAttribute('aria-describedby');

    expect(reasonId).not.toBeNull();
    expect(document.getElementById(reasonId ?? '')?.textContent).toBe('연동을 먼저 껐다 켜야 해요');
  });

  it('Menu: disabledReason 이 없으면 aria-describedby 를 붙이지 않는다', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);

    await openMenu(user);

    expect(
      screen.getByRole('menuitem', { name: '알림 발송' }).getAttribute('aria-describedby'),
    ).toBeNull();
  });
});

describe('Menu — 계약 a11y.keyboard', () => {
  it('Menu: ArrowDown 은 닫힌 트리거에서 팝업을 연다', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);

    screen.getByRole('button', { name: '명재우 회원 액션' }).focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('menu')).not.toBeNull();
  });

  it('Menu: ArrowDown/ArrowUp 은 항목 사이를 순환 이동한다', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);
    await openMenu(user);

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '내보내기' }));

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '회원 삭제' }));

    // 마지막에서 한 번 더 → 첫 항목으로 순환
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '알림 발송' }));

    // 첫 항목에서 위로 → 마지막으로 순환
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '회원 삭제' }));
  });

  it('Menu: Home/End 는 첫 항목·마지막 항목으로 간다', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);
    await openMenu(user);

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '회원 삭제' }));

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '알림 발송' }));
  });

  it('Menu: Escape 는 팝업을 닫고 **트리거로 포커스를 되돌린다**', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);
    await openMenu(user);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '명재우 회원 액션' }));
  });

  it('Menu: Tab 은 팝업을 닫되 포커스를 트리거로 되돌리지 않는다 (포커스를 가두지 않는다)', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} />);
    await openMenu(user);

    await user.keyboard('{Tab}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).not.toBe(
      screen.getByRole('button', { name: '명재우 회원 액션' }),
    );
  });
});

describe('Menu — 계약 events', () => {
  it('Menu: onSelect 는 선택된 항목의 id 를 전달하고 팝업을 닫는다', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} onSelect={onSelect} />);
    await openMenu(user);

    await user.click(screen.getByRole('menuitem', { name: '회원 삭제' }));

    expect(onSelect).toHaveBeenCalledWith('delete');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Menu: onSelect 는 명령 실행으로 닫을 때 트리거로 포커스를 되돌리지 않는다 (다이얼로그가 열릴 수 있다)', async () => {
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} onSelect={vi.fn()} />);
    await openMenu(user);

    await user.click(screen.getByRole('menuitem', { name: '알림 발송' }));

    expect(document.activeElement).not.toBe(
      screen.getByRole('button', { name: '명재우 회원 액션' }),
    );
  });

  // 이름이 계약 조건 두 개(items[].disabled · items[].disabledReason)를 그대로 부른다 —
  // 이 테스트는 두 조건을 한 번에 클릭해 확인하므로 이름도 둘을 함께 지목해야 한다.
  it('Menu: onSelect — items[].disabled · items[].disabledReason 상태에서 발화하지 않는다 (blockedWhen)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Menu
        label="구글 로그인 더보기"
        items={[
          { id: 'edit', label: '수정', disabledReason: '발송 중에는 바꿀 수 없어요' },
          { id: 'lock', label: '잠금', disabled: true },
        ]}
        onSelect={onSelect}
      />,
    );
    await openMenu(user, '구글 로그인 더보기');

    await user.click(screen.getByRole('menuitem', { name: '수정' }));
    await user.click(screen.getByRole('menuitem', { name: '잠금' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Menu: onOpenChange 는 열림/닫힘을 한 번씩만 전달한다', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Menu label="명재우 회원 액션" items={ITEMS} onOpenChange={onOpenChange} />);

    await openMenu(user);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });
});

describe('Menu — 계약 props.align · props.trigger', () => {
  it('Menu: align 은 논리 속성으로 팝업 모서리를 정한다 (RTL 에서 자동으로 뒤집힌다)', () => {
    const end = ruleBody(menuCss, '.tds-menu__popup--end');
    const start = ruleBody(menuCss, '.tds-menu__popup--start');

    expect(end).toContain('inset-inline-end');
    expect(start).toContain('inset-inline-start');
  });

  it('Menu: trigger=more-vertical 은 같은 글리프를 90도 돌린 변형 클래스를 붙인다', () => {
    const { container } = render(
      <Menu label="구글 로그인 더보기" items={ITEMS} trigger="more-vertical" />,
    );

    expect(container.querySelector('.tds-menu__trigger--more-vertical')).not.toBeNull();
    expect(ruleBody(menuCss, '.tds-menu__trigger--more-vertical > .tds-icon')).toContain(
      'rotate(90deg)',
    );
  });
});

describe('Menu — 바깥 클릭', () => {
  it('Menu: 팝업 바깥을 누르면 닫힌다', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Menu label="명재우 회원 액션" items={ITEMS} />
        <button type="button">바깥 버튼</button>
      </div>,
    );
    await openMenu(user);

    await user.click(screen.getByRole('button', { name: '바깥 버튼' }));

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
