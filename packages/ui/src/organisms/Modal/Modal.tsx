// Modal — 모달 다이얼로그 껍데기 (organism · contracts/Modal.contract.json@1.1.0)
//
// 계약 dependencies: [] — atom/molecule 를 조립하지 않는다(닫기 버튼은 자체 인라인 글리프).
// 표면·타이포·간격은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것.
//
// [a11y] role="dialog" + aria-modal + aria-labelledby(제목) + aria-describedby(본문, describedBy 로 주입) /
//        포커스 트랩(Tab·Shift+Tab 순환) / Esc 로 닫힘 / 열릴 때 첫 포커스 가능 요소(또는 initialFocusRef)로 포커스 /
//        닫히면 직전 요소로 포커스 복귀 / 열려 있는 동안 배경 스크롤 잠금.
//        [describedBy] 조립하는 쪽(ConfirmDialog)이 본문(확인 메시지) 요소의 id 를 주면 열릴 때 title 뿐
//        아니라 목적(메시지)까지 announce 된다 — aria-labelledby 만으로는 제목만 읽힌다 (A11Y-02).
//
// [모달 위에 모달] ConfirmDialog 가 폼 모달 위에 겹칠 수 있다(예: 그룹 만들기 → 생성 확인).
// 둘 다 body 로 portal 되며, 나중에 열린 쪽이 위에 온다. Esc 는 stopPropagation 으로
// 위쪽 모달만 닫고, body overflow 는 각자 열릴 때의 값을 복원하므로 중첩이 깨지지 않는다.
//
// [imperative props — 계약 밖 컴포넌트 경계] onClose·onSubmit·initialFocusRef 는 명령형 배선이라
// Figma 대응이 없다. 계약(제목·아이콘·본문·푸터)에 얹어 컴포넌트 경계에서 받는다 (Card 네이티브 패스스루와 동일 원리).
import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';

import type { ModalProps } from '../../../generated/types/Modal.types';
import './Modal.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 닫기 — × (currentColor·1.25em, 장식) */
function CloseGlyph() {
  return (
    <svg
      className="tds-modal__close-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

/** onClose·onSubmit·initialFocusRef — Figma 대응이 없는 명령형 배선 (계약 밖 경계 props) */
interface ModalImperativeProps {
  /** 닫기 요청 — Esc·딤 클릭·닫기 버튼이 부른다 (호출부가 항상 넘긴다) */
  readonly onClose: () => void;
  /** 폼 모달이면 submit 핸들러를 넘긴다 — Enter 로 확인이 동작한다 */
  readonly onSubmit?: () => void;
  /**
   * 열릴 때 포커스를 받을 요소. 주지 않으면 첫 포커스 가능 요소(= 닫기 버튼)로 간다.
   * 입력이 있는 모달은 그 입력을 지정해야 바로 타이핑할 수 있다.
   */
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * 본문(목적) 요소의 id — aria-describedby 로 연결된다. 주면 다이얼로그 open 시 title 과 함께
   * 본문 메시지가 announce 된다. 조립하는 쪽(ConfirmDialog)이 message 요소 id 를 넘긴다 (A11Y-02).
   */
  readonly describedBy?: string;
}

export function Modal({
  title,
  icon = null,
  children,
  footer,
  onClose,
  onSubmit,
  initialFocusRef,
  describedBy,
}: ModalProps & ModalImperativeProps) {
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

  // Esc(닫기) · Tab(포커스 트랩) — 다이얼로그 요소에 네이티브 리스너로 붙인다.
  // [중첩 모달] Esc 는 stopPropagation 으로 최상단 모달만 닫는다. 각 모달은 body 로 개별 portal 되므로
  // DOM 이벤트가 형제 모달로 새지 않는다 (네이티브 리스너가 React 합성 이벤트 버블링 문제를 원천 차단한다).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return undefined;

    const handler = (event: globalThis.KeyboardEvent) => {
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

    dialog.addEventListener('keydown', handler);
    return () => {
      dialog.removeEventListener('keydown', handler);
    };
  }, [focusables, onClose]);

  const body = (
    <div className="tds-modal__overlay">
      {/* 딤 클릭으로 닫기 — 키보드 경로는 Esc 와 닫기 버튼이 담당하므로 aria-hidden */}
      <div className="tds-modal__backdrop" aria-hidden="true" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="tds-modal__dialog"
      >
        <div className="tds-modal__header">
          <span className="tds-modal__title-row">
            {icon}
            <h2 id={titleId} className="tds-modal__title">
              {title}
            </h2>
          </span>
          <button type="button" className="tds-modal__close" aria-label="닫기" onClick={onClose}>
            <CloseGlyph />
          </button>
        </div>

        {onSubmit === undefined ? (
          <>
            {children}
            <div className="tds-modal__footer">{footer}</div>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="tds-modal__form"
          >
            {children}
            <div className="tds-modal__footer">{footer}</div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
