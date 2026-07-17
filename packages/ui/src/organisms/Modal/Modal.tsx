// Modal — 모달 다이얼로그 껍데기 (organism · contracts/Modal.contract.json@1.1.0)
//
// 계약 dependencies: [] — atom/molecule 를 조립하지 않는다(닫기 버튼은 자체 인라인 글리프).
// 표면·타이포·간격은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
//
// [a11y] role="dialog" + aria-modal + aria-labelledby(제목) + aria-describedby(본문, describedBy 로 주입) /
//        포커스 트랩(Tab·Shift+Tab 순환) / Esc 로 닫힘 / 열릴 때 첫 포커스 가능 요소(또는 initialFocusRef)로 포커스 /
//        닫히면 직전 요소로 포커스 복귀 / 열려 있는 동안 배경 스크롤 잠금 + 배경 aria-hidden 격리.
//        [describedBy] 조립하는 쪽(ConfirmDialog)이 본문(확인 메시지) 요소의 id 를 주면 열릴 때 title 뿐
//        아니라 목적(메시지)까지 announce 된다 — aria-labelledby 만으로는 제목만 읽힌다 (A11Y-02).
//
// ┌ [왜 Radix Dialog 인가 — 실측으로 남은 3결함] ────────────────────────────────────┐
// │ 손으로 짠 트랩에서 5개가 지적됐고 **실앱에서 재현해 3개만 실재**했다:                 │
// │   ✗ hidden/inert 미필터 · ✗ 양수 tabindex — 이 저장소에 재현 경로가 없다(보고서 참조) │
// │   ✓ document 레벨 focusin 가드 부재 — 포커스가 배경으로 나가면 **복귀하지 못했다**     │
// │   ✓ 배경이 inert/aria-hidden 아님 — 배경 51개 포커스 요소가 AT 에 그대로 노출됐다     │
// │   ✓ 스크롤락 스크롤바 폭 미보정 — 모달을 열면 배경이 **스크롤바 폭만큼 점프**했다(실측) │
// │     ⚠ 이 축은 **headless 에서 관측되지 않는다**: overlay 스크롤바라 폭이 0 이라 점프도  │
// │     0 으로 보인다(그래서 처음에 오탐으로 넘길 뻔했다 — headed 로 다시 재서 잡았다).      │
// │     e2e 는 headless 라 여기에 회귀 테스트를 두면 보정을 지워도 통과하는 거짓 초록불이    │
// │     된다. 그래서 두지 않았다. 잠금의 **논리**(중첩 카운팅)는 단위 테스트가 지킨다.       │
// │ 셋 다 '트랩 밖의 문제'다: 트랩 알고리즘이 아니라 **문서 전체의 격리**가 필요하다.       │
// │ Radix 의 FocusScope(트랩+복귀) · hideOthers(배경 격리) · RemoveScroll(폭 보정)      │
// │ 가 정확히 그 셋을 덮는다. 우리는 표면(클래스·DOM·모션)을 그대로 유지한다.              │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// [모달 위에 모달] ConfirmDialog 가 폼 모달 위에 겹칠 수 있다(예: 그룹 만들기 → 생성 확인).
// Radix 의 DismissableLayer 가 **레이어 스택의 최상단에만** Esc/바깥클릭을 배달하므로
// 중첩이 보존된다(직접 stopPropagation 하던 것을 대체한다). 스크롤락도 RemoveScroll 이
// 중첩을 자체적으로 센다 — 우리가 openModalCount 를 세던 이유가 사라졌다.
//
// [imperative props — 계약 밖 컴포넌트 경계] onClose·onSubmit·initialFocusRef 는 명령형 배선이라
// Figma 대응이 없다. 계약(제목·아이콘·본문·푸터)에 얹어 컴포넌트 경계에서 받는다 (Card 네이티브 패스스루와 동일 원리).
//
// [MOTION-01] enter/exit 트랜지션 — **onClose 를 퇴장 애니메이션 뒤로 미룬다**
//   호출부는 전부 `{열림 && <Modal/>}` 로 조건부 마운트한다. 그래서 Modal 이 살아 있다는 것 자체가
//   '열림'이고, Radix `Dialog.Root` 에는 `open` 을 **항상 true** 로 준다. 닫기는 Radix 가
//   `onOpenChange(false)` 로 알려 오고, 우리는 그것을 **즉시 닫힘이 아니라 요청**으로 받아
//   퇴장 애니메이션을 태운 뒤 onClose() 를 부른다 → 부모가 언마운트한다.
//   `open` 이 계속 true 이므로 퇴장 중에도 트랩·스크롤락·배경 격리가 유지된다(사라지는 중에
//   포커스가 새지 않는다). Radix 의 자체 unmount 는 발생하지 않는다 — DOM 의 생사는 부모가 쥔다.
//
//   [MOTION-09 — 퇴장은 되돌릴 수 있다] onClose() 는 '닫아 달라는 요청'이지 '닫혔다'가 아니다.
//   부모는 거부할 수 있다(미저장 이탈 가드가 폐기 확인을 세우고 언마운트하지 않는 경우).
//   거부되면 Modal 은 퇴장 상태에서 **빠져나와 등장 상태로 복귀**한다 — finishClose() 참조.
//   되돌리지 않으면 모달이 opacity:0 인 채 남아 영구히 닫히지 않는다(실제로 출하됐던 회귀다).
//
//   [범위 — 정확히 말한다] 퇴장을 타는 것은 **Modal 이 소유한 닫기 경로**뿐이다: Esc · 딤 클릭 · 닫기(×).
//   푸터 버튼(ConfirmDialog 의 '취소', 폼 모달의 '확인')은 조립하는 쪽이 만든 버튼이라 onClose 가 아니라
//   호출부 콜백을 직접 부르고, 호출부가 곧바로 언마운트한다 — 그 경로는 여전히 즉시 사라진다.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { RefObject } from 'react';

import type { ModalProps } from '../../../generated/types/Modal.types';
import './Modal.css';

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

  /**
   * 퇴장이 끝났다 — 이제 부모에게 알린다. 부모가 **거부하면 퇴장을 되돌린다** (MOTION-09).
   *
   * [왜 거부를 감지할 수 있나 — 언마운트가 곧 수락이다]
   * 호출부는 전부 `{열림 && <Modal/>}` 이라 Modal 에는 `open` prop 이 없다. 그래서 '닫혔다' 의
   * 유일한 관측 가능한 신호는 **부모가 우리를 언마운트했는가** 뿐이다. onClose() 직후 리셋을
   * 같은 배치에 넣으면 두 경우가 저절로 갈린다:
   *   · 수락 → 부모가 언마운트 → 이 setState 는 버려진다 (되돌아오는 깜빡임이 없다)
   *   · 거부 → 우리는 살아 있다 → closing 이 풀려 **등장 상태로 복귀**한다
   *
   * [왜 필요한가 — 출하된 회귀] 예전에는 `closingRef` 가 리셋되지 않아, dirty 가드처럼 닫기를
   * 거부하는 부모를 만나면 모달이 `opacity:0` + `pointer-events:none` 인 채 영구히 남았다.
   * 그 뒤 Esc·딤·× 는 전부 위 조기 반환에 걸려 **다시는 닫을 수 없었고**, 화면에서 사라진
   * 모달 안에 포커스와 입력이 갇혔다. 닫기 거부는 정상적인 흐름이지 끝 상태가 아니다.
   */
  const finishClose = useCallback(() => {
    onClose();
    closingRef.current = false;
    setClosing(false);
  }, [onClose]);

  // 퇴장 애니메이션이 없으면(reduced-motion·jsdom) 기다릴 것이 없다 — 즉시 닫는다
  useEffect(() => {
    if (!closing) return;
    if (!willAnimate(dialogRef.current)) finishClose();
  }, [closing, finishClose]);

  /**
   * 닫히면 열기 직전 요소로 포커스 복귀 (계약 a11y.aria.focus) — **우리가 직접 한다.**
   *
   * [왜 Radix 에 맡기지 않나 — 우리 구조에서는 그 훅이 울리지 않는다]
   * Radix 의 포커스 복귀(onCloseAutoFocus)는 `open` 이 true→false 로 **전이**할 때 돈다.
   * 그런데 우리는 `open` 을 항상 true 로 두고 **부모의 언마운트**로 닫는다(MOTION-01/09 의 latch).
   * 그래서 Radix 입장에서 그 전이는 영원히 오지 않고, 복귀도 영영 실행되지 않는다 —
   * 실제로 이 배치에서 언마운트 후 activeElement 가 <body> 로 떨어지는 것을 관측했다.
   * `open` 을 전이시키면 Radix 가 복귀를 해 주지만, 그 순간 '언마운트만이 수락 신호'라는
   * latch 설계가 무너진다(PR #38 이 고친 회귀가 되돌아온다). 트랩·격리·스크롤락은 Radix 에
   * 맡기고, 복귀만 우리가 쥔다 — 이 둘은 서로 간섭하지 않는다(Radix 는 아무것도 하지 않으므로).
   */
  useEffect(() => {
    restoreRef.current = document.activeElement;
    return () => {
      const restore = restoreRef.current;
      if (restore instanceof HTMLElement) restore.focus();
    };
  }, []);

  const body = (
    <div className={`tds-modal__overlay${closing ? ' tds-modal__overlay--closing' : ''}`}>
      {/* 딤 — 클릭 닫기는 Radix 의 onPointerDownOutside 가 담당한다(레이어 최상단에만 배달).
          키보드 경로는 Esc 와 닫기 버튼이 담당하므로 aria-hidden */}
      <Dialog.Overlay className="tds-modal__backdrop" aria-hidden="true" />

      <Dialog.Content
        ref={dialogRef}
        // [왜 직접 다나] Radix 는 aria-modal 을 달지 않는다 — 배경을 aria-hidden 으로 **실제로**
        // 격리하는 편이 낫다고 보기 때문이다(그 격리는 hideOthers 가 해 주고 있다).
        // 그러나 우리 계약 Modal@1.1.0 이 `aria-modal: "true"` 를 명시한다. 격리와 aria-modal 은
        // 배타적이지 않고(둘 다 켜도 서로를 해치지 않는다) 계약이 표면의 진실이므로 여기서 채운다.
        aria-modal="true"
        // [퇴장 중에는 클릭을 받지 않는다] 사라지는 중인 다이얼로그를 다시 누를 수 있으면 안 된다.
        //
        // 예전에는 `.tds-modal__overlay--closing { pointer-events: none }` 하나로 자식 전부가
        // 상속으로 죽었다. 그런데 Radix(DismissableLayer)는 body 를 pointer-events:none 으로
        // 덮고 **자기 레이어에 inline 으로 auto** 를 박는다 — inline 이 이기므로 다이얼로그만
        // 상속을 벗어나 퇴장 중에도 살아난다(푸터의 '확인'이 퇴장 150ms 사이에 눌릴 수 있었다).
        // Radix 는 `style={{ pointerEvents: ..., ...props.style }}` 순으로 펼치므로 **우리 style 이
        // 뒤에 와서 이긴다**. closing 일 때만 준다 — 평시에 주면(undefined 라도) Radix 의 auto 를
        // 덮어써 다이얼로그가 통째로 죽는다.
        style={closing ? { pointerEvents: 'none' } : undefined}
        aria-describedby={describedBy}
        className="tds-modal__dialog"
        // 열릴 때 포커스: 지정 요소가 있으면 그리로, 없으면 Radix 기본(첫 포커스 가능 요소 = 닫기 버튼)
        onOpenAutoFocus={(event) => {
          const preferred = initialFocusRef?.current ?? null;
          if (preferred === null) return;
          event.preventDefault();
          preferred.focus();
        }}
        // 퇴장 애니메이션이 끝난 **그때** 부모에게 닫힘을 알린다 → 부모가 언마운트 (MOTION-01).
        // 등장 애니메이션의 animationend 와 섞이지 않도록 keyframes 이름으로 정확히 가른다
        // (이 핸들러는 버블링을 타므로 본문 자식의 애니메이션도 여기로 올라온다).
        onAnimationEnd={(event) => {
          if (event.animationName === DIALOG_EXIT_ANIMATION) finishClose();
        }}
      >
        <div className="tds-modal__header">
          <span className="tds-modal__title-row">
            {icon}
            <Dialog.Title asChild>
              <h2 className="tds-modal__title">{title}</h2>
            </Dialog.Title>
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
      </Dialog.Content>
    </div>
  );

  return (
    // [open 은 항상 true] 마운트되어 있다는 것이 곧 열림이다 — 닫힘의 결정권은 부모의 언마운트에 있다.
    // Radix 가 스스로 닫지 않게 하고(onOpenChange 를 requestClose 로 받아), 퇴장 중에도
    // 트랩·스크롤락·배경 격리를 유지시킨다. 이것이 PR #38 의 latch 설계를 그대로 보존한다.
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <Dialog.Portal>{body}</Dialog.Portal>
    </Dialog.Root>
  );
}
