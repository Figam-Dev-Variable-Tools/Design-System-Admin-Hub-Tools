// AUTO-GENERATED from contracts/Empty.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const EmptyArgTypes = {
  label: {
    description: '대상 명사 — \'회원\', \'공지\', \'문의\' 등. 조사(\'이/가\')는 마지막 음절 받침으로 자동 선택된다',
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
  createVerb: {
    description: '진짜 비어있음 상태 문구의 동사 — \'등록\'/\'접수\' 등. \'{createVerb}된 {label}…\' 로 조립된다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"등록"',
      },
    },
  },
  hasQuery: {
    description: '검색어가 적용된 상태. true 면 \'검색 결과 없음\'(b) 으로 분기한다 (filter/empty 보다 우선)',
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
  hasActiveFilters: {
    description: '필터가 적용된 상태. hasQuery 가 false 이고 이것이 true 면 \'필터 결과 없음\'(c) 으로 분기한다',
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
  action: {
    description: '진짜 비어있음(a) 상태의 primary 생성 CTA 슬롯 — 대상 route 를 아는 앱이 <Button> 을 넣는다. 검색/필터 상태에서는 렌더하지 않는다',
    control: false,
    table: {
      category: 'Slots',
      type: {
        summary: 'ReactNode (accepts: Button)',
      },
      defaultValue: {
        summary: 'null',
      },
    },
  },
  onClearSearch: {
    description: '검색 결과 없음(b) 상태에서 \'검색 지우기\' 클릭. 지정되면 버튼을 그린다 — 미지정이면 그리지 않는다',
    action: 'onClearSearch',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'void',
      },
    },
  },
  onResetFilters: {
    description: '필터 결과 없음(c) 상태에서 \'필터 초기화\' 클릭. 지정되면 버튼을 그린다 — 미지정이면 그리지 않는다',
    action: 'onResetFilters',
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
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { hasQuery: 'false', hasActiveFilters: 'false' },
  { hasQuery: 'false', hasActiveFilters: 'true' },
  { hasQuery: 'true', hasActiveFilters: 'false' },
  { hasQuery: 'true', hasActiveFilters: 'true' },
] as const;

export type EmptyCombination = (typeof combinationMatrix)[number];
