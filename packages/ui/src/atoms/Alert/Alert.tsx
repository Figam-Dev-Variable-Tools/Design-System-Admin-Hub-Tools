// Alert — 피드백 메시지 배너 (atom · contracts/Alert.contract.json@1.1.0)
//
// 색상만으로 의미를 전달하지 않는다(WCAG 1.4.1) — tone 별 아이콘을 텍스트와 함께 렌더한다.
// danger 는 즉시 통지(role=alert / aria-live=assertive), 그 외는 대기 통지(role=status / polite).
// tabIndex=-1 — 제출 실패 시 바깥에서 프로그래매틱 포커스를 옮길 수 있게 한다.
//
// [루트는 <div> 다 — <p> 가 아니다 (계약 description)]
//   children 은 node 슬롯이고 실호출부가 블록 자식을 넘긴다 (MemberDetailPage: <div> + <Button> 2개).
//   <p> 안의 <div> 는 브라우저가 <p> 를 자동으로 닫아 레이아웃이 붕괴한다. role/aria-live/tabIndex 는
//   그대로 유지한다.
//
// [닫기 버튼] onClose 핸들러의 **유무**가 해제 가능 여부다 — 별도 boolean prop 을 두지 않는다.
//   배너를 언마운트하는 것은 호출부의 책임이다 (계약 events.onClose).
//
// [ref] 배너 포커스 이동용 ref 는 계약 prop 이 아니라 forwardRef 로 노출한다.
import { forwardRef } from 'react';

import type { AlertProps, AlertTone } from '../../../generated/types/Alert.types';
import './Alert.css';

/**
 * tone 별 아이콘 — 아이콘 자산 패키지에 의존하지 않는 인라인 SVG.
 * currentColor + 1em 기준이라 tone 색상과 글자 크기를 그대로 따라간다 (px 리터럴 0건).
 */
function ToneIcon({ tone }: { readonly tone: AlertTone }) {
  const warning = tone === 'danger' || tone === 'warning';
  return (
    <svg
      className="tds-alert__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {warning ? (
        // 경고 삼각형
        <>
          <path d="M12 3.5 22 20H2L12 3.5Z" />
          <path d="M12 10v4" />
          <path d="M12 17.2h.01" />
        </>
      ) : (
        // 정보 원형 (info · success 공용 — success 는 체크 획을 함께 그린다)
        <>
          <circle cx="12" cy="12" r="9" />
          {tone === 'success' ? (
            <path d="m8.5 12.2 2.4 2.4 4.6-5" />
          ) : (
            <path d="M12 11v5.5M12 7.6h.01" />
          )}
        </>
      )}
    </svg>
  );
}

/** 닫기(×) 글리프 — 아이콘만 있으므로 접근 가능한 이름은 버튼의 aria-label 이 준다 */
function CloseGlyph() {
  return (
    <svg
      className="tds-alert__close-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone = 'danger', children, id = '', onClose },
  ref,
) {
  const assertive = tone === 'danger';
  const dismissible = onClose !== undefined && onClose !== null;

  return (
    <div
      ref={ref}
      id={id === '' ? undefined : id}
      tabIndex={-1}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      className={`tds-alert tds-alert--${tone}`}
    >
      <ToneIcon tone={tone} />
      <span className="tds-alert__body">{children}</span>
      {dismissible ? (
        <button type="button" className="tds-alert__close" aria-label="안내 닫기" onClick={onClose}>
          <CloseGlyph />
        </button>
      ) : null}
    </div>
  );
});
