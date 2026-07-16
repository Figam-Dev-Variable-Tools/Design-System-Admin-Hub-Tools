// AUTO-GENERATED from contracts/Toast.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** `Toast.kind` 허용 값 (계약이 유일한 원천) */
export type ToastKind = 'success' | 'cancelled' | 'error' | 'info';

/** 계약에 선언된 상호작용 상태 */
export type ToastState = 'default';

/**
 * 토스트 1건 — 아이콘 + 문구 + (실패면) '다시 시도' + 닫기(×). 결과 통지의 시각 단위다. 큐/위치/최대 개수는 조립하는 쪽(ToastProvider)이 소유한다 (ADR-0003).

[kind 가 톤·아이콘·라이브·자동소멸을 정한다] success=4초 자동소멸/status · cancelled=2초/status · info=4초/status · error=**자동소멸 없음**\/alert. 실패를 조용히 삼키지 않기 위해 error 는 사용자가 닫거나 재시도할 때까지 남는다.

[a11y — 1.1.0: 라이브 영역을 소유하지 않는다] 토스트는 동적으로 삽입되는 노드이고, **내용과 함께 생성된 라이브 영역은 스크린리더에서 신뢰성 있게 announce 되지 않는다**. 그래서 role/aria-live 를 Toast 에서 떼고, 토스트보다 먼저·항상 존재하는 ToastProvider 의 **지속 라이브 영역 2개**(비-error=polite · error=assertive)가 통지를 소유한다 (A11Y-01). Toast 는 시각 표현(tone·아이콘)과 자동소멸·닫기/재시도 배선만 담당한다. kind 는 여전히 **어느 라이브 영역으로 갈지**를 결정하며, 그 분배는 ToastProvider 가 수행한다. 닫기 버튼으로 키보드로 닫을 수 있다. 등장 모션은 prefers-reduced-motion 에서 꺼진다.

[imperative props — 계약 밖 컴포넌트 경계] id(큐 키·onDismiss 인자)·onDismiss·onRetry 는 명령형 배선이라 Figma 대응이 없다. 계약 props(kind·message)는 디자인이 보는 표면만 기술한다 (Alert 와 동일 판정). onRetry 를 주면 '다시 시도' 버튼이 나타난다 — 별도 boolean 이 아니라 핸들러 유무로 결정한다 (Alert.onClose 선례).
 */
export interface ToastProps {
  /**
   * 토스트의 의미 — 톤(feedback 토큰)·아이콘·라이브 리전 시맨틱(error=alert/assertive · 그 외=status/polite)·자동소멸 시간(success/info 4초 · cancelled 2초 · error 없음)을 함께 결정한다
   * @default "info"
   */
  kind?: ToastKind;
  /**
   * 표시 문구. 아이콘 옆 <span> 으로 렌더된다
   */
  message: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 토스트를 닫는다 — 자동소멸 타이머·닫기(×) 버튼·재시도 버튼이 이 토스트의 id 를 인자로 부른다. 큐에서 제거하는 것은 호출부(ToastProvider)의 책임이다
   */
  onDismiss?: (payload: string) => void;
  /**
   * **핸들러를 주면 '다시 시도' 버튼이 나타나고, 주지 않으면 나타나지 않는다** (해제 가능 여부가 아니라 복구 경로 유무를 핸들러로 표현 — Alert.onClose 선례). 누르면 이 토스트를 닫고(onDismiss) 재시도를 실행한다. 실패(error) 토스트에만 실제로 붙는다
   */
  onRetry?: (payload: void) => void;
}
