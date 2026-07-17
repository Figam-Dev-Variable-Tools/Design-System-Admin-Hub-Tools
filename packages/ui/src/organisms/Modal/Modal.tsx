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
//
// [MOTION-01] enter/exit 트랜지션 — **onClose 를 퇴장 애니메이션 뒤로 미룬다**
//   호출부는 전부 `{열림 && <Modal/>}` 로 조건부 마운트한다. 그래서 부모가 언마운트하는 순간
//   DOM 이 즉시 사라진다 — AnimatePresence 를 Modal **안**에 두어도 자기 언마운트는 못 막는다
//   (AnimatePresence 는 조건부 렌더의 **상위**에 있어야 한다).
//   대신 Modal 이 이미 소유한 **onClose 의 호출 시점**을 늦춘다: Esc·딤·닫기(×) →
//   퇴장 애니메이션 재생 → 끝나면 그때 onClose() → 부모가 언마운트.
//   결과적으로 "exit 완료 후에만 DOM 제거"가 성립하며, 호출부 13곳과 계약을 **한 줄도 바꾸지 않는다**.
//
//   [범위 — 정확히 말한다] 퇴장을 타는 것은 **Modal 이 소유한 닫기 경로**뿐이다: Esc · 딤 클릭 · 닫기(×).
//   푸터 버튼(ConfirmDialog 의 '취소', 폼 모달의 '확인')은 조립하는 쪽이 만든 버튼이라 onClose 가 아니라
//   호출부 콜백을 직접 부르고, 호출부가 곧바로 언마운트한다 — 그 경로는 여전히 즉시 사라진다.
//   푸터까지 덮으려면 Modal 이 requestClose 를 context 로 내리고 ConfirmDialog/폼 모달이 그것을 쓰도록
//   해야 한다(별도 배치 — ConfirmDialog·호출부 소유 영역). 지금은 **가장 흔한 닫기 제스처 3종**을 덮는다.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';

import type { ModalProps } from '../../../generated/types/Modal.types';
import './Modal.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 퇴장 애니메이션의 keyframes 이름 — 이 애니메이션의 animationend 만 '닫힘 완료'로 친다 */
const DIALOG_EXIT_ANIMATION = 'tds-modal-dialog-out';

/**
 * 퇴장 애니메이션이 실제로 도는가 — computed style 로 **관측**한다 (추측하지 않는다).
 *
 * [왜 matchMedia 가 아니라 computed style 인가 — MOTION-03 의 단일 게이트]
 * reduced-motion 판단을 CSS(@media)와 JS(matchMedia) 두 곳에 두면 둘이 어긋날 수 있다.
 * 그래서 **CSS 가 유일한 판단자**이고 JS 는 그 결과를 읽기만 한다: reduced-motion 에서 CSS 가
 * animation 을 끄면 여기서 false 가 되어 애니메이션을 기다리지 않고 즉시 닫는다.
 *
 * [jsdom] CSS 를 적용하지 않아 animationName 이 '' → false → 단위 테스트에서는 '닫기 즉시 onClose'
 * 라는 기존 동작이 그대로 유지된다 (테스트가 애니메이션 배관을 흉내 낼 필요가 없다).
 */
function willAnimate(element: HTMLElement | null): boolean {
  if (element === null || typeof window.getComputedStyle !== 'function') return false;
  const style = window.getComputedStyle(element);
  if (style.animationName === '' || style.animationName === 'none') return false;
  return Number.parseFloat(style.animationDuration) > 0;
}

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

  // 퇴장 중인가 — true 가 되면 퇴장 애니메이션이 붙고, 끝나면 onClose() 가 불린다 (MOTION-01)
  const [closing, setClosing] = useState(false);
  // 닫기 요청은 한 번만 — 퇴장 중 Esc 연타·딤 클릭이 onClose 를 중복 호출하지 않게 한다
  const closingRef = useRef(false);

  /** 닫기 요청 — 즉시 닫지 않고 퇴장 애니메이션을 시작한다 */
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
  }, []);

  // 퇴장 애니메이션이 없으면(reduced-motion·jsdom) 기다릴 것이 없다 — 즉시 닫는다
  useEffect(() => {
    if (!closing) return;
    if (!willAnimate(dialogRef.current)) onClose();
  }, [closing, onClose]);

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
        requestClose();
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
  }, [focusables, requestClose]);

  const body = (
    <div className={`tds-modal__overlay${closing ? ' tds-modal__overlay--closing' : ''}`}>
      {/* 딤 클릭으로 닫기 — 키보드 경로는 Esc 와 닫기 버튼이 담당하므로 aria-hidden */}
      <div className="tds-modal__backdrop" aria-hidden="true" onClick={requestClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="tds-modal__dialog"
        // 퇴장 애니메이션이 끝난 **그때** 부모에게 닫힘을 알린다 → 부모가 언마운트 (MOTION-01).
        // 등장 애니메이션의 animationend 와 섞이지 않도록 keyframes 이름으로 정확히 가른다.
        onAnimationEnd={(event) => {
          if (event.animationName === DIALOG_EXIT_ANIMATION) onClose();
        }}
      >
        <div className="tds-modal__header">
          <span className="tds-modal__title-row">
            {icon}
            <h2 id={titleId} className="tds-modal__title">
              {title}
            </h2>
          </span>
          <button
            type="button"
            className="tds-modal__close"
            aria-label="닫기"
            onClick={requestClose}
          >
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
