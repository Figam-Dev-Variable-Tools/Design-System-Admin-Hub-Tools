// AUTO-GENERATED from contracts/Badge.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const BadgeArgTypes = {
  count: {
    description: '표시할 개수. hideWhenZero=true 이고 count<=0 이면 아무것도 렌더하지 않는다 (구현: `if (count <= 0) return null`)',
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
  tone: {
    description: '시각 의미. neutral = 텍스트색 배경 위 서피스색 숫자(현행 구현), danger/success = feedback 토큰 페어',
    control: {
      type: 'select',
    },
    options: ['neutral', 'danger', 'success'],
    table: {
      category: 'Props',
      type: {
        summary: '\'neutral\' | \'danger\' | \'success\'',
      },
      defaultValue: {
        summary: '"neutral"',
      },
    },
  },
  hideWhenZero: {
    description: 'count<=0 일 때 렌더 생략 여부. false 면 0 도 표시한다',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
      defaultValue: {
        summary: 'true',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 6개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { tone: 'neutral', hideWhenZero: 'false' },
  { tone: 'neutral', hideWhenZero: 'true' },
  { tone: 'danger', hideWhenZero: 'false' },
  { tone: 'danger', hideWhenZero: 'true' },
  { tone: 'success', hideWhenZero: 'false' },
  { tone: 'success', hideWhenZero: 'true' },
] as const;

export type BadgeCombination = (typeof combinationMatrix)[number];
