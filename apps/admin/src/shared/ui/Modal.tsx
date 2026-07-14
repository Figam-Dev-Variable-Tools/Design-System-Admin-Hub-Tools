// 모달 다이얼로그 — 모든 모달의 껍데기 (A40 소유 — apps/admin/src/shared/ui/**)
//
// [a11y] role="dialog" + aria-modal + aria-labelledby / 포커스 트랩(Tab·Shift+Tab 순환) /
//        Esc 로 닫힘 / 열릴 때 첫 포커스 가능 요소로 포커스 / 닫히면 직전 요소로 포커스 복귀 /
//        열려 있는 동안 배경 스크롤 잠금.
//
// [모달 위에 모달] ConfirmDialog 가 폼 모달 위에 겹칠 수 있다(예: 그룹 만들기 → 생성 확인).
// 둘 다 body 로 portal 되며, 나중에 열린 쪽이 위에 온다. Esc 는 stopPropagation 으로
// 위쪽 모달만 닫고, body overflow 는 각자 열릴 때의 값을 복원하므로 중첩이 깨지지 않는다.
import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

import { CloseIcon } from './icons';
import { buttonStyle } from './styles';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
};

/** 배경 딤 — 색을 섞지 않고 토큰 색 + opacity 로만 만든다 (하드코딩 rgba 금지) */
const backdropStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--tds-color-text-default)',
  opacity: 0.45,
};

const dialogStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 'calc(var(--tds-space-6) * 18)',
  maxHeight: '100%',
  overflowY: 'auto',
  paddingTop: 'var(--tds-space-5)',
  paddingBottom: 'var(--tds-space-5)',
  paddingLeft: 'var(--tds-space-5)',
  paddingRight: 'var(--tds-space-5)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
  color: 'var(--tds-color-text-default)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

interface ModalProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer: ReactNode;
  /** 제목 왼쪽 아이콘 — 의도(생성/수정/삭제/이탈)를 색과 함께 이중으로 전달한다 */
  readonly icon?: ReactNode;
  /** 폼 모달이면 submit 핸들러를 넘긴다 — Enter 로 확인이 동작한다 */
  readonly onSubmit?: () => void;
  /**
   * 열릴 때 포커스를 받을 요소. 주지 않으면 첫 포커스 가능 요소(= 닫기 버튼)로 간다.
   * 입력이 있는 모달은 그 입력을 지정해야 바로 타이핑할 수 있다.
   */
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  icon,
  onSubmit,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // 닫힐 때 포커스를 되돌릴 자리 — 모달을 연 그 버튼
  const restoreRef = useRef<Element | null>(null);
  const titleId = useId();

  const focusables = useCallback(
    (): readonly HTMLElement[] =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    [],
  );

  useEffect(() => {
    restoreRef.current = document.activeElement;

    // 지정된 요소 → 첫 포커스 가능 요소 → 다이얼로그 자체 순으로 포커스
    const preferred = initialFocusRef?.current ?? null;
    const first = preferred ?? focusables()[0] ?? null;
    if (first !== null) first.focus();
    else dialogRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      const restore = restoreRef.current;
      if (restore instanceof HTMLElement) restore.focus();
    };
    // 열릴 때 한 번만 실행한다 — initialFocusRef/focusables 는 안정된 참조라 재실행되지 않는다
  }, [focusables, initialFocusRef]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    // 포커스 트랩 — 양 끝에서 반대편으로 감는다
    const items = focusables();
    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const body = (
    <div style={overlayStyle}>
      {/* 딤 클릭으로 닫기 — 키보드 경로는 Esc 와 닫기 버튼이 담당하므로 aria-hidden */}
      <div style={backdropStyle} aria-hidden="true" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={dialogStyle}
        onKeyDown={onKeyDown}
      >
        <div style={headerStyle}>
          <span style={titleRowStyle}>
            {icon}
            <h2 id={titleId} style={titleStyle}>
              {title}
            </h2>
          </span>
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={buttonStyle('ghost')}
            aria-label="닫기"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {onSubmit === undefined ? (
          <>
            {children}
            <div style={footerStyle}>{footer}</div>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            style={formStyle}
          >
            {children}
            <div style={footerStyle}>{footer}</div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
