// AUTO-GENERATED from contracts/Pagination.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const PaginationArgTypes = {
  page: {
    description: '현재 페이지 (1-based). 번호 창이 이 값을 가운데 두려 민다',
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
  totalPages: {
    description: '전체 페이지 수. 1 이하이면 컴포넌트가 렌더되지 않는다',
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
  label: {
    description: 'nav 의 접근성 이름(aria-label). 회원 목록이 기본값 — 다른 목록이 재사용할 때만 바꾼다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"회원 목록 페이지"',
      },
    },
  },
  onChange: {
    description: '선택된 페이지 번호를 인자로 발화한다. 이전/다음/번호 버튼 모두 이 콜백으로 귀결된다',
    action: 'onChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'number',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 1개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  {  },
] as const;

export type PaginationCombination = (typeof combinationMatrix)[number];
