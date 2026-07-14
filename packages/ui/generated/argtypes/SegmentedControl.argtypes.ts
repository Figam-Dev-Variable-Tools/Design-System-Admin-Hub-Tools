// AUTO-GENERATED from contracts/SegmentedControl.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const SegmentedControlArgTypes = {
  value: {
    description: '선택된 세그먼트의 id. options[].id 중 하나여야 한다',
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
  options: {
    description: '세그먼트 목록. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ id: string; label: string }>',
      },
    },
  },
  size: {
    description: '세그먼트 높이·좌우 패딩 스케일',
    control: {
      type: 'select',
    },
    options: ['sm', 'md'],
    table: {
      category: 'Props',
      type: {
        summary: '\'sm\' | \'md\'',
      },
      defaultValue: {
        summary: '"md"',
      },
    },
  },
  disabled: {
    description: '그룹 전체 비활성. onChange 차단 + aria-disabled',
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
  ariaLabel: {
    description: 'radiogroup 의 접근 가능한 이름 (예: \'조회 기간\'). 시각 레이블이 없으므로 필수',
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
  onChange: {
    description: '선택된 세그먼트의 id 를 전달. disabled 에서는 발화 금지 — Storybook Play Function이 전수 검증 발화 차단 상태: disabled',
    action: 'onChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'string',
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
  { size: 'sm', disabled: 'false' },
  { size: 'sm', disabled: 'true' },
  { size: 'md', disabled: 'false' },
  { size: 'md', disabled: 'true' },
] as const;

export type SegmentedControlCombination = (typeof combinationMatrix)[number];
