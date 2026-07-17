// AUTO-GENERATED from contracts/SelectionBar.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const SelectionBarArgTypes = {
  count: {
    description: '선택된 행 수. 0 이면 아무것도 그리지 않는다. 천 단위 구분으로 표기한다',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
    },
  },
  noun: {
    description: '개수 단위 문구(\'건\'/\'명\' 등). 기본 \'건\'',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"건"',
      },
    },
  },
  children: {
    description: '일괄 액션 버튼들(일괄 삭제 · 일괄 ON/OFF 등). 어떤 액션인지는 호출부가 버튼으로 넣는다',
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
  onClear: {
    description: '선택 해제. 지정되면 \'선택 해제\' 버튼을 그리고 누르면 발화한다. 미지정이면 버튼을 그리지 않는다',
    action: 'onClear',
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
 * 총 1개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  {  },
] as const;

export type SelectionBarCombination = (typeof combinationMatrix)[number];
