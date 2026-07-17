// ⋯ 액션 드롭다운
//
// [요구사항] 회원 목록의 행 액션과 회원 상세의 우측 상단 메뉴는 **'회원 삭제' / '알림 발송' 두 개뿐**이다.
// 다른 액션(추가·등급 변경 등)은 이 화면의 책임이 아니다 — 항목을 늘릴 때는 요구사항부터 확인할 것.
//
// [a11y] aria-haspopup="menu" + aria-expanded / role="menu" · role="menuitem" /
//        Esc·바깥 클릭으로 닫힘 / ↑↓·Home·End 로 항목 이동 / 닫히면 트리거로 포커스 복귀.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

import { buttonStyle } from '../../../shared/ui';
import { MoreHorizontalIcon } from '../icons';

const wrapperStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + var(--tds-space-1))',
  right: 0,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 'calc(var(--tds-space-6) * 6)',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-default)',
};

function itemStyle(danger: boolean, disabled: boolean): CSSProperties {
  return {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: 'var(--tds-space-2)',
    paddingBottom: 'var(--tds-space-2)',
    paddingLeft: 'var(--tds-space-3)',
    paddingRight: 'var(--tds-space-3)',
    borderStyle: 'none',
    borderWidth: 0,
    background: 'transparent',
    color: disabled
      ? 'var(--tds-color-text-disabled)'
      : danger
        ? 'var(--tds-color-feedback-danger-text)'
        : 'var(--tds-color-text-default)',
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

interface MenuAction {
  readonly id: string;
  readonly label: string;
  /** 파괴적 액션 — 붉은 텍스트로 구분한다 */
  readonly danger?: boolean;
  /** 진행 중인 항목 — 중복 클릭을 막는다 (라벨은 호출부가 '발송 중…' 으로 바꾼다) */
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

interface ActionMenuProps {
  readonly actions: readonly MenuAction[];
  /** 스크린 리더용 트리거 이름 — 행마다 달라야 한다 ('명재우 회원 액션') */
  readonly label: string;
}

export function ActionMenu({ actions, label }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // 바깥 클릭 — pointerdown 으로 잡아야 메뉴 밖 버튼의 click 이 한 번에 먹는다
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && wrapperRef.current?.contains(target) === true) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // 열리면 첫 항목으로 포커스를 옮긴다 (키보드 사용자가 바로 이동할 수 있게)
  // 진행 중(disabled) 항목은 포커스 대상에서 빠진다
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector('button:not([disabled])');
    if (first instanceof HTMLElement) first.focus();
  }, [open]);

  const moveFocus = (delta: number, absolute?: 'first' | 'last') => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [],
    );
    if (items.length === 0) return;

    const current = items.findIndex((item) => item === document.activeElement);
    let nextIndex: number;
    if (absolute === 'first') nextIndex = 0;
    else if (absolute === 'last') nextIndex = items.length - 1;
    else nextIndex = (current + delta + items.length) % items.length;

    items[nextIndex]?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'Escape':
        event.stopPropagation();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0, 'first');
        break;
      case 'End':
        event.preventDefault();
        moveFocus(0, 'last');
        break;
      case 'Tab':
        // 메뉴 밖으로 탭 아웃하면 닫는다 (포커스는 자연스럽게 흘러가게 둔다)
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <button
        ref={triggerRef}
        type="button"
        className="tds-ui-btn-ghost tds-ui-focusable"
        style={buttonStyle('ghost')}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontalIcon />
      </button>

      {open && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          style={menuStyle}
          onKeyDown={onMenuKeyDown}
        >
          {actions.map((action) => {
            const danger = action.danger === true;
            const disabled = action.disabled === true;
            return (
              <li key={action.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`tds-mem-menuitem${danger ? ' tds-mem-menuitem-danger' : ''} tds-ui-focusable`}
                  style={itemStyle(danger, disabled)}
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={() => {
                    close(false);
                    action.onSelect();
                  }}
                >
                  {action.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
