// AUTO-GENERATED from contracts/DataTable.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const DataTableArgTypes = {
  columns: {
    description: '컬럼 정의. align 기본값은 \'right\'(수치). unit 은 요약(tfoot) 행에 붙는다. unitInBody=true 면 **본문(tbody) 행에도** 같은 unit 접미사를 붙인다 (기본 false — 현행 동작 유지). 실사용: 대시보드 기간별 분석의 매출액 컬럼만 본문에 \'원\' 을 붙인다 (PeriodTable.tsx:114 — column.key === \'revenue\' 일 때만 withUnit). 현행 구현은 본문 셀에 withUnit=false 를 하드코딩해(DataTable.tsx:84) 이 컬럼의 단위가 사라진다. 데이터 prop — Figma 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ key: string; label: string; align?: \'left\' | \'right\'; unit?: string; unitInBody?: boolean }>',
      },
    },
  },
  rows: {
    description: '본문 행. 각 행은 columns[].key 를 키로 갖는다. 빈 배열이면 empty 문구를 렌더한다. 데이터 prop — Figma 대응 없음',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<Record<string, string | number>>',
      },
    },
  },
  rowKey: {
    description: '행 식별 컬럼 키. React key 이자 th[scope=row] 로 렌더되는 컬럼이다',
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
  summaryRows: {
    description: 'tfoot 에 렌더되는 합계/요약 행. 강조 배경 + 단위 표기. 데이터 prop — Figma 대응 없음',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<Record<string, string | number>>',
      },
      defaultValue: {
        summary: '[]',
      },
    },
  },
  caption: {
    description: '표의 목적을 설명하는 caption. 시각적으로 숨기되 스크린리더에는 노출한다',
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
  dimZero: {
    description: '0 이하의 수치 셀을 흐리게 처리 — 눈이 0을 건너뛰고 유의미한 수치에 먼저 가게 한다',
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
  empty: {
    description: 'rows 가 빈 배열일 때 표시할 문구',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"표시할 항목이 없습니다."',
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
  { dimZero: 'false' },
  { dimZero: 'true' },
] as const;

export type DataTableCombination = (typeof combinationMatrix)[number];
