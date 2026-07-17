// AUTO-GENERATED from contracts/SearchField.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const SearchFieldArgTypes = {
  value: {
    description: '제어 컴포넌트 검색어',
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
    description: '스크린 리더용 라벨 — 시각적으로 감추되 접근 가능한 이름을 준다(\'공지 제목 검색\' 등)',
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
  placeholder: {
    description: '입력 placeholder. 미지정이면 \'검색\'',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"검색"',
      },
    },
  },
  onChange: {
    description: '검색어 변경 — 네이티브 이벤트가 아니라 새 문자열(event.target.value)을 넘긴다 (호출부의 string setter 와 직결)',
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
 * 총 1개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  {  },
] as const;

export type SearchFieldCombination = (typeof combinationMatrix)[number];
