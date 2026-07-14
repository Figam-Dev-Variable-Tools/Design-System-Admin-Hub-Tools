// AUTO-GENERATED from contracts/ListRow.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ListRowArgTypes = {
  title: {
    description: '행 제목. 길면 줄바꿈(overflow-wrap: anywhere)',
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
  meta: {
    description: '제목 아래 보조 텍스트 (예: \'작성자 · 날짜\'). 빈 문자열이면 렌더하지 않는다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '""',
      },
    },
  },
  icon: {
    description: '좌측 아이콘 슬롯. 장식용이므로 aria-hidden',
    control: false,
    table: {
      category: 'Slots',
      type: {
        summary: 'ReactNode (accepts: Icon)',
      },
      defaultValue: {
        summary: 'null',
      },
    },
  },
  href: {
    description: '링크 대상. 빈 문자열이면 링크가 아닌 행으로 렌더한다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '""',
      },
    },
  },
  onClick: {
    description: '행 클릭. href 가 있어도 라우팅 가로채기/분석 계측을 위해 함께 발화한다',
    action: 'onClick',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'MouseEvent',
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

export type ListRowCombination = (typeof combinationMatrix)[number];
