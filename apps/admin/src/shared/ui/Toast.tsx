// 토스트 1건 (A40 소유 — apps/admin/src/shared/ui/**)
//
// [보이는 것] 아이콘 + 문구 + (실패면) '다시 시도' + 닫기(×).
// [사라지는 것] 성공 4초 · 취소 2초 · **실패는 자동으로 사라지지 않는다** —
//   사용자가 닫거나 재시도할 때까지 남는다. 실패를 조용히 삼키지 않기 위해서다.
//
// [a11y]
// - 성공/취소/안내: role="status" + aria-live="polite" (하던 일을 끊지 않는다)
// - 실패:          role="alert"  + aria-live="assertive" (즉시 읽는다)
// - 닫기 버튼이 있어 키보드로 닫을 수 있다.
// - 등장 모션은 ui.css 가 담당하며 prefers-reduced-motion 에서 꺼진다.
import { useEffect } from 'react';
import type { ComponentType, CSSProperties } from 'react';

import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  InfoCircleIcon,
  XCircleIcon,
} from './icons';
import type { IconProps } from './icons';
import { buttonStyle, feedbackStyle } from './styles';
import type { FeedbackTone } from './styles';

/** 토스트의 의미 — 아이콘·톤·자동 소멸 시간을 결정한다 */
export type ToastKind = 'success' | 'cancelled' | 'error' | 'info';

interface KindSpec {
  readonly tone: FeedbackTone;
  /** null = 자동 소멸 없음 */
  readonly durationMs: number | null;
  readonly live: 'status' | 'alert';
  readonly icon: ComponentType<IconProps>;
}

const TOAST_SPEC: Record<ToastKind, KindSpec> = {
  success: { tone: 'success', durationMs: 4000, live: 'status', icon: CheckCircleIcon },
  // 취소는 '눌렸다'는 확인일 뿐이다 — 성공보다 짧게 스친다
  cancelled: { tone: 'info', durationMs: 2000, live: 'status', icon: XCircleIcon },
  // 실패는 남는다. 사용자가 닫거나 재시도해야 사라진다
  error: { tone: 'danger', durationMs: null, live: 'alert', icon: AlertTriangleIcon },
  info: { tone: 'info', durationMs: 4000, live: 'status', icon: InfoCircleIcon },
};

export interface ToastItem {
  readonly id: string;
  readonly kind: ToastKind;
  readonly message: string;
  /** 실패 토스트에만 붙는 복구 경로 — 누르면 토스트를 닫고 다시 시도한다 */
  readonly retry?: () => void;
}

const toastStyle = (tone: FeedbackTone): CSSProperties => ({
  ...feedbackStyle(tone),
  // 뷰포트는 클릭을 통과시킨다(pointerEvents:none) — 토스트 자신만 클릭을 받는다
  pointerEvents: 'auto',
  boxSizing: 'border-box',
  width: 'fit-content',
  minWidth: 'calc(var(--tds-space-6) * 8)',
  maxWidth: '100%',
});

const iconStyle: CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
};

const messageStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  overflowWrap: 'anywhere',
};

const actionStyle: CSSProperties = {
  flexShrink: 0,
  // 배너 톤 위에 얹히므로 배경을 비우고 글자색만 상속한다
  background: 'transparent',
  color: 'inherit',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  textDecoration: 'underline',
};

interface ToastProps {
  readonly toast: ToastItem;
  readonly onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const spec = TOAST_SPEC[toast.kind];
  const Icon = spec.icon;
  const { id } = toast;
  const { durationMs } = spec;

  useEffect(() => {
    if (durationMs === null) return undefined;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, durationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [durationMs, id, onDismiss]);

  return (
    <div
      className="tds-ui-toast"
      role={spec.live}
      aria-live={spec.live === 'alert' ? 'assertive' : 'polite'}
      style={toastStyle(spec.tone)}
    >
      <span style={iconStyle}>
        <Icon />
      </span>

      <span style={messageStyle}>{toast.message}</span>

      {toast.retry !== undefined && (
        <button
          type="button"
          className="tds-ui-btn-ghost tds-ui-focusable"
          style={{ ...buttonStyle('ghost'), ...actionStyle }}
          onClick={() => {
            const { retry } = toast;
            onDismiss(toast.id);
            if (retry !== undefined) retry();
          }}
        >
          다시 시도
        </button>
      )}

      <button
        type="button"
        className="tds-ui-btn-ghost tds-ui-focusable"
        style={{ ...buttonStyle('ghost'), color: 'inherit', flexShrink: 0 }}
        aria-label="알림 닫기"
        onClick={() => {
          onDismiss(toast.id);
        }}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
