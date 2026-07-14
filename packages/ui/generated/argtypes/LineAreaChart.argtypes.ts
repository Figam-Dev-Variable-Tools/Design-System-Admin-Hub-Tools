// AUTO-GENERATED from contracts/LineAreaChart.contract.json@1.0.1 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const LineAreaChartArgTypes = {
  series: {
    description: '계열 목록. values 길이는 labels 길이와 같아야 한다. 데이터 prop — Figma 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ id: string; label: string; kind: \'line\' | \'area\'; values: readonly number[] }>',
      },
    },
  },
  labels: {
    description: 'x축 눈금 라벨. 데이터 prop — Figma 대응 없음',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<string>',
      },
    },
  },
  showLegend: {
    description: '계열 범례 표시 여부. 범례는 장식이 아니라 계열 식별 수단이므로 기본 노출',
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
  ariaLabel: {
    description: 'role=img 의 접근 가능한 이름. 차트가 전달하는 추세를 문장으로 기술한다',
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
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 2개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { showLegend: 'false' },
  { showLegend: 'true' },
] as const;

export type LineAreaChartCombination = (typeof combinationMatrix)[number];
