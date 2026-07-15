// AUTO-GENERATED from contracts/StatusBadge.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const StatusBadgeArgTypes = {
  tone: {
    description: '색 의도 — 무엇의 상태인지가 아니라 \'중립/좋음/주의/위험/정보\'만 표현한다. neutral 은 회색 표면(surface-raised)+테두리(border-default), 나머지 4종은 feedback 토큰 페어(surface/border/text). 호출부가 도메인 상태→tone 매핑을 소유한다',
    control: {
      type: 'select',
    },
    options: ['neutral', 'success', 'warning', 'danger', 'info'],
    table: {
      category: 'Props',
      type: {
        summary: '\'neutral\' | \'success\' | \'warning\' | \'danger\' | \'info\'',
      },
    },
  },
  label: {
    description: '상태 문구 — 색만으로 의미를 전달하지 않도록(WCAG 1.4.1) 상태 의미를 담는 텍스트. 예: \'게시\', \'임시저장\', \'노출\', \'만료\'',
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
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 5개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { tone: 'neutral' },
  { tone: 'success' },
  { tone: 'warning' },
  { tone: 'danger' },
  { tone: 'info' },
] as const;

export type StatusBadgeCombination = (typeof combinationMatrix)[number];
