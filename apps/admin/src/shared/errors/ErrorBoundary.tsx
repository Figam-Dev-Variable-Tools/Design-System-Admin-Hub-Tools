// 렌더 예외 경계 (A41 소유 — apps/admin/src/shared/errors/**)
//
// [왜 필요한가 — EXC-01]
// 이 앱에는 ErrorBoundary 가 **0건**이었다. React 는 렌더 중 throw 를 잡지 못하면 트리 전체를
// unmount 한다 — 컴포넌트 하나가 던지면 **사이드바까지 사라진 흰 화면**이 남고, 운영자는 다른
// 메뉴로 갈 수조차 없다. 게다가 `useToast` 는 provider 밖에서 의도적으로 throw 하도록 설계돼 있어
// (shared/ui/ToastProvider.tsx) 경계가 없으면 그 방어가 곧 앱 전체 크래시가 된다.
//
// [왜 클래스인가]
// componentDidCatch/getDerivedStateFromError 는 **클래스에만 있는 React API** 다. 훅 등가물이
// 존재하지 않으며, react-error-boundary 도입은 이번 배치의 '라이브러리 금지' 제약에 걸린다.
// 이 파일이 이 앱의 유일한 클래스 컴포넌트인 이유다.
//
// [배치] AppShell 의 <Outlet> 바로 바깥에 두면 화면만 복구 UI 로 바뀌고 **셸(사이드바·헤더)은
// 살아남는다** — 그래서 다른 메뉴로 걸어 나갈 수 있다. 셸 자체가 던지는 경우를 위해 App 루트에도
// 한 겹 더 둔다.
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { referenceOf } from './http-error';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** 복구 UI. resetKey 가 바뀌면 경계가 스스로 풀린다 — 라우트 이동이 곧 복구다 */
  readonly fallback: (state: ErrorBoundaryRenderState) => ReactNode;
  /** 이 값이 바뀌면 오류 상태를 버린다 (보통 location.pathname) */
  readonly resetKey?: string;
}

export interface ErrorBoundaryRenderState {
  readonly error: Error;
  /** 운영자가 신고에 붙일 짧은 상관관계 코드 (EXC-20) */
  readonly reference: string | null;
  /** 같은 화면을 다시 그려 본다 */
  readonly reset: () => void;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
  readonly resetKey: string | undefined;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): Pick<ErrorBoundaryState, 'error'> {
    return { error };
  }

  /**
   * resetKey 가 바뀌면 오류를 버린다 — **렌더 중에** 판정해야 한다.
   * componentDidUpdate 에서 setState 로 지우면 낡은 fallback 이 한 프레임 깜빡인다.
   */
  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): ErrorBoundaryState | null {
    if (props.resetKey === state.resetKey) return null;
    return { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 로깅은 남긴다 — 참조 코드로 신고가 들어오면 이 줄과 대조한다 (EXC-20).
    // 경계가 예외를 삼키므로, 이 한 줄이 없으면 그 예외는 **어디에도 기록되지 않는다**.
    // TODO(backend): 원격 오류 수집(Sentry 등)이 붙으면 이 한 줄이 그 전송 지점이 된다.
    console.error('[ErrorBoundary]', referenceOf(error) ?? '(no-ref)', error, info.componentStack);
  }

  reset(): void {
    this.setState({ error: null });
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    return this.props.fallback({
      error,
      reference: referenceOf(error),
      reset: this.reset,
    });
  }
}
