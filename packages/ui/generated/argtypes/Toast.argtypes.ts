// AUTO-GENERATED from contracts/Toast.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ToastArgTypes = {
  kind: {
    description: '토스트의 의미 — 톤(feedback 토큰)·아이콘·라이브 리전 시맨틱(error=alert/assertive · 그 외=status/polite)·자동소멸 시간(success/info 4초 · cancelled 2초 · error 없음)을 함께 결정한다',
    control: {
      type: 'select',
    },
    options: ['success', 'cancelled', 'error', 'info'],
    table: {
      category: 'Props',
      type: {
        summary: '\'success\' | \'cancelled\' | \'error\' | \'info\'',
      },
      defaultValue: {
        summary: '"info"',
      },
    },
  },
  message: {
    description: '표시 문구. 아이콘 옆 <span> 으로 렌더된다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
    },
  },
  onDismiss: {
    description: '토스트를 닫는다 — 자동소멸 타이머·닫기(×) 버튼·재시도 버튼이 이 토스트의 id 를 인자로 부른다. 큐에서 제거하는 것은 호출부(ToastProvider)의 책임이다',
    action: 'onDismiss',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'string',
      },
    },
  },
  onRetry: {
    description: '**핸들러를 주면 \'다시 시도\' 버튼이 나타나고, 주지 않으면 나타나지 않는다** (해제 가능 여부가 아니라 복구 경로 유무를 핸들러로 표현 — Alert.onClose 선례). 누르면 이 토스트를 닫고(onDismiss) 재시도를 실행한다. 실패(error) 토스트에만 실제로 붙는다',
    action: 'onRetry',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'void',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 4개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { kind: 'success' },
  { kind: 'cancelled' },
  { kind: 'error' },
  { kind: 'info' },
] as const;

export type ToastCombination = (typeof combinationMatrix)[number];
