// AUTO-GENERATED from contracts/HelpTip.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const HelpTipArgTypes = {
  label: {
    description: '스크린 리더용 트리거 이름 — 아이콘만 있으므로 aria-label 로 무엇에 대한 도움말인지 밝힌다 (\'그룹 유형 설명\' 등)',
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
  children: {
    description: '패널 본문 — 열렸을 때 아이콘 아래로 뜨는 설명 문단(<p>)의 내용',
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
 * 총 1개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  {  },
] as const;

export type HelpTipCombination = (typeof combinationMatrix)[number];
