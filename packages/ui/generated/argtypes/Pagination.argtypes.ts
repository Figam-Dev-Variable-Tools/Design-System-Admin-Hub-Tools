// AUTO-GENERATED from contracts/Pagination.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

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
  total: {
    description: '전체 레코드 수 — 범위 요약(\'전체 N건 중 x–y\')의 N. pageSize 와 함께 줘야 의미가 있다. 데이터 prop — Figma 대응 없음 (ADR-0003)',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '0',
      },
    },
  },
  pageSize: {
    description: '페이지당 행 수 — 범위 요약의 x–y 를 계산하는 근거다. **0(기본)이면 범위 요약과 크기 선택을 그리지 않는다** — 이 값이 곧 ERP-05 표면의 opt-in 스위치이자 하위호환 장치다(기존 소비자 11곳은 이 prop 을 넘기지 않아 1.0.0 과 동일하게 렌더된다). 데이터 prop — Figma 대응 없음',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '0',
      },
    },
  },
  pageSizeOptions: {
    description: '페이지 크기 선택지(예: [10, 25, 50, 100]). 비어 있으면(기본) 크기 선택 <select> 를 그리지 않는다 — 범위 요약만 쓰는 소비자를 위해 두 표면을 따로 켠다. 데이터 prop — Figma 대응 없음',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<number>',
      },
      defaultValue: {
        summary: '[]',
      },
    },
  },
  sizeLabel: {
    description: '크기 선택 <select> 의 가시 라벨. 목록마다 세는 단위가 달라도(\'건\'/\'줄\') 라벨만 바꿔 쓴다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"페이지당"',
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
  onPageSizeChange: {
    description: '크기 선택에서 고른 새 page size 를 인자로 발화한다. 페이지 되감기(보통 1로)는 호출부가 소유한다 — 이 컴포넌트는 값만 알린다(도메인을 모른다)',
    action: 'onPageSizeChange',
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
