// 토스트 provider + useToast() 훅
//
// [왜 공통 모듈인가] 예전에는 페이지마다 성공/실패 배너 상태(notice)를 따로 들고 있었다.
// 같은 코드가 화면 수만큼 복제됐고, 배너가 레이아웃을 밀어 표가 아래로 튀었다.
// 이제 결과 통지는 앱 전체에서 하나의 큐가 담당한다 — 페이지는 상태를 갖지 않는다.
//
//   const toast = useToast();
//   toast.success();                                  // '작업이 완료되었습니다'
//   toast.success('회원 3명을 삭제했습니다.');
//   toast.cancelled();                                // '작업이 취소되었습니다'
//   toast.error('삭제에 실패했습니다.', { retry: () => retryDelete() });
//
// [무엇을 토스트로 띄우고 무엇을 인라인으로 남기는가] → shared/ui/README.md 의 기준을 따른다.
//
// [위치] 화면 정중앙 하단. 여러 개면 위로 쌓이고(최근 것이 아래), 최대 3개까지만 남는다.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { cssVar, Toast } from '@tds/ui';
import type { ToastKind } from '@tds/ui';

/** 큐 항목 — 위치/큐/최대개수를 소유한 provider 의 것. Toast(@tds/ui)는 kind·message·id 만 받는다 */
interface ToastItem {
  readonly id: string;
  readonly kind: ToastKind;
  readonly message: string;
  /** 실패 토스트에만 붙는 복구 경로 — 누르면 토스트를 닫고 다시 시도한다 */
  readonly retry?: () => void;
}

/** 동시에 떠 있을 수 있는 최대 개수 — 넘치면 가장 오래된 것부터 사라진다 */
const MAX_TOASTS = 3;

/** 호출부가 문구를 주지 않았을 때의 기본값 */
const DEFAULT_SUCCESS_MESSAGE = '작업이 완료되었습니다';
const DEFAULT_CANCELLED_MESSAGE = '작업이 취소되었습니다';

interface ToastErrorOptions {
  /** 주면 실패 토스트에 '다시 시도' 버튼이 붙는다 */
  readonly retry?: () => void;
}

interface ToastApi {
  /** 성공 — 4초 후 자동 소멸. 문구를 주지 않으면 '작업이 완료되었습니다' */
  readonly success: (message?: string) => void;
  /** 취소 — 2초 후 자동 소멸. 문구를 주지 않으면 '작업이 취소되었습니다' */
  readonly cancelled: (message?: string) => void;
  /** 실패 — **자동으로 사라지지 않는다.** 복구 경로가 있으면 retry 를 준다 */
  readonly error: (message: string, options?: ToastErrorOptions) => void;
  /** 정보 — 4초 후 자동 소멸 */
  readonly info: (message: string) => void;
  readonly dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * 라이브 영역 1개 — 뷰포트 안에서 토스트를 세로로 쌓는다.
 * 비어 있어도 DOM 에 남아야 하므로(A11Y-01) 높이 0 인 채 자리만 지킨다.
 */
const regionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

/**
 * 하단 중앙 고정. 클릭은 통과시키고(pointerEvents:none) 토스트만 받는다 —
 * 빈 영역이 화면 아래쪽 버튼을 가로채면 안 된다.
 */
const viewportStyle: CSSProperties = {
  position: 'fixed',
  bottom: cssVar('space.6'),
  left: '50%',
  transform: 'translateX(-50%)',
  // 모달 오버레이(z-index 10) 위에 온다 — 모달 안에서 취소해도 토스트가 보여야 한다
  zIndex: 20,
  display: 'flex',
  // 아래가 바닥에 고정되어 있으므로 목록이 길어지면 위로 자란다 (최근 것이 아래)
  flexDirection: 'column',
  alignItems: 'center',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  width: 'max-content',
  maxWidth: '100%',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  pointerEvents: 'none',
};

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  // id 는 렌더와 무관한 단조 증가값 — key 충돌이 없으면 그만이다
  const seqRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, retry?: () => void) => {
    seqRef.current += 1;
    const id = `toast-${String(seqRef.current)}`;
    const item: ToastItem =
      retry === undefined ? { id, kind, message } : { id, kind, message, retry };

    setToasts((prev) => {
      // 넘치면 가장 오래된 것부터 버린다 — 화면을 토스트로 덮지 않는다
      const next = [...prev, item];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message = DEFAULT_SUCCESS_MESSAGE) => {
        push('success', message);
      },
      cancelled: (message = DEFAULT_CANCELLED_MESSAGE) => {
        push('cancelled', message);
      },
      error: (message: string, options?: ToastErrorOptions) => {
        push('error', message, options?.retry);
      },
      info: (message: string) => {
        push('info', message);
      },
      dismiss,
    }),
    [dismiss, push],
  );

  // kind → 라이브 영역 분배 (A11Y-01). error 만 즉시(assertive), 나머지는 대기(polite).
  const politeToasts = toasts.filter((toast) => toast.kind !== 'error');
  const errorToasts = toasts.filter((toast) => toast.kind === 'error');

  const renderToast = (toast: ToastItem) => (
    <Toast
      key={toast.id}
      id={toast.id}
      kind={toast.kind}
      message={toast.message}
      onDismiss={dismiss}
      onRetry={toast.retry}
    />
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* [A11Y-01] 라이브 영역 2개를 **토스트보다 먼저·항상** 마운트한다. 내용과 함께 생성된 라이브
          영역은 NVDA/JAWS/VoiceOver 가 신뢰성 있게 읽지 않으므로, Toast 자신의 aria-live 에 의존하지
          않는다 (1.1.0 에서 Toast 는 role/aria-live 를 갖지 않는다). kind 로 큐를 갈라 주입만 한다.

          [assertive 영역에 role="alert" 를 쓰지 않는 이유]
          role="alert" 는 ARIA 상 aria-live="assertive" + aria-atomic="true" 와 정확히 동치다. 그런데
          이 영역은 **항상 존재**하므로 role 을 붙이면 앱 전역에서 getByRole('alert') 가 늘 이 빈 영역을
          집어 인라인 Alert 배너와 구분되지 않는다(‘배너 없음’ 단언이 성립 불가). 그래서 동치인
          aria-live="assertive" 로 영역을 만든다. aria-atomic="false" 는 스택 전체를 다시 읽지 않고
          새로 들어온 토스트만 읽게 하므로 토스트 스택에는 role=alert 의 암묵 atomic=true 보다 정확하다. */}
      <div style={viewportStyle}>
        <div style={regionStyle} role="status" aria-live="polite" aria-atomic="false">
          {politeToasts.map(renderToast)}
        </div>
        <div style={regionStyle} aria-live="assertive" aria-atomic="false">
          {errorToasts.map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * 결과 통지 API.
 *
 * Provider 없이 쓰면 즉시 던진다 — 조용히 무시하면 실패 안내가 사라져 사용자가 모르게 된다.
 * App.tsx 최상단이 <ToastProvider> 로 감싼다.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error('useToast()는 <ToastProvider> 안에서만 쓸 수 있습니다 — App.tsx를 확인하세요.');
  }
  return api;
}
