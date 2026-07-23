// 비동기 공용 유틸
//
// 데이터 소스 어댑터(pages/**/data-source.ts)와 화면이 함께 쓴다.
// **실제 네트워크 호출은 이 앱 어디에도 없다** — 백엔드가 없기 때문이다(HTTP 클라이언트 0건).
// 여기 있는 것은 취소 규약뿐이다.

/**
 * 지연 + 취소.
 *
 * signal 을 주면 abort 시 즉시 reject 한다. 쓰기 계열도 signal 을 받는다 —
 * 모달을 Esc·딤 클릭으로 닫으면 진행 중이던 요청이 취소되어야 하기 때문이다.
 *
 * 백엔드가 붙으면 이 함수는 사라지고 실제 요청이 그 자리에 온다.
 */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new DOMException('요청이 취소되었어요.', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('요청이 취소되었어요.', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * abort 로 취소된 요청인가.
 *
 * **취소는 실패가 아니다** — 화면을 떠났거나 사용자가 다이얼로그를 닫은 것이므로
 * 실패 토스트를 띄우지 않는다. 모든 화면이 같은 판정을 쓰도록 여기 하나만 둔다.
 */
export function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError';
}
