// AUTO-GENERATED from contracts/Card.contract.json@1.2.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const CardArgTypes = {
  children: {
    description: '카드 본문. 컨테이너는 flex column 이며 minWidth:0 으로 그리드 내 축소를 허용한다',
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
  padding: {
    description: '내부 여백. md = space.5(현행 구현값), lg = space.6',
    control: {
      type: 'select',
    },
    options: ['md', 'lg'],
    table: {
      category: 'Props',
      type: {
        summary: '\'md\' | \'lg\'',
      },
      defaultValue: {
        summary: '"md"',
      },
    },
  },
  elevation: {
    description: '표면 높이. flat = 그림자 없음(기본), raised = shadow.raised 로 강조 카드처럼 부상시킨다',
    control: {
      type: 'select',
    },
    options: ['flat', 'raised'],
    table: {
      category: 'Props',
      type: {
        summary: '\'flat\' | \'raised\'',
      },
      defaultValue: {
        summary: '"flat"',
      },
    },
  },
  busy: {
    description: '데이터 로딩 중. aria-busy="true" 를 부여한다',
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
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 8개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { padding: 'md', elevation: 'flat', busy: 'false' },
  { padding: 'md', elevation: 'flat', busy: 'true' },
  { padding: 'md', elevation: 'raised', busy: 'false' },
  { padding: 'md', elevation: 'raised', busy: 'true' },
  { padding: 'lg', elevation: 'flat', busy: 'false' },
  { padding: 'lg', elevation: 'flat', busy: 'true' },
  { padding: 'lg', elevation: 'raised', busy: 'false' },
  { padding: 'lg', elevation: 'raised', busy: 'true' },
] as const;

export type CardCombination = (typeof combinationMatrix)[number];
