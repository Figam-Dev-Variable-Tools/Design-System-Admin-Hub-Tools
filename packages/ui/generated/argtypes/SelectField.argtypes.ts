// AUTO-GENERATED from contracts/SelectField.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const SelectFieldArgTypes = {
  isInvalid: {
    description: '오류 상태 — 입력의 controlStyle(invalid) 와 같은 붉은(feedback.danger) 테두리를 낸다. 메시지는 감싸는 FormField 가 렌더한다(이 컨트롤은 테두리만 바꾼다)',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
      defaultValue: {
        summary: 'false',
      },
    },
  },
  children: {
    description: '<option> 들 — 호출부가 넣는다 (raw <select> 와 동일). 커스텀 컴포넌트로 감싸지 않고 그대로 <select> 자식으로 렌더한다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'ReactNode',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 2개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { isInvalid: 'false' },
  { isInvalid: 'true' },
] as const;

export type SelectFieldCombination = (typeof combinationMatrix)[number];
