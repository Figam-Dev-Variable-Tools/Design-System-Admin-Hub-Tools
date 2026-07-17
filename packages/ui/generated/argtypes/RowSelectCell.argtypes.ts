// AUTO-GENERATED from contracts/RowSelectCell.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const RowSelectCellArgTypes = {
  id: {
    description: '행 식별자 — 보이지 않는 라벨의 id(\'select-{id}\')를 파생한다(한 문서에 여러 표가 있어도 안 겹친다)',
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
  label: {
    description: '보이지 않는 라벨 문구 — 예: \'{공지 제목} 선택\'. aria-labelledby 로 체크박스에 이어진다',
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
  checked: {
    description: '선택 여부. 제어 값 — onToggle 로만 바뀐다',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
    },
  },
  onToggle: {
    description: '다음 선택 상태(boolean)를 인자로 발화한다',
    action: 'onToggle',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'boolean',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 2개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { checked: 'false' },
  { checked: 'true' },
] as const;

export type RowSelectCellCombination = (typeof combinationMatrix)[number];
