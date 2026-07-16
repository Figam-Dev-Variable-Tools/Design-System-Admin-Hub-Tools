// AUTO-GENERATED from contracts/StatsCard.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const StatsCardArgTypes = {
  title: {
    description: '카드 제목 (예: \'방문자\', \'기간별 분석\')',
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
  action: {
    description: '헤더 우측 액션 슬롯 — 기간 토글(SegmentedControl) 또는 단일 액션(Button). 없으면 제목만 렌더. **loading/error 상태에서도 계속 렌더한다** — 이 슬롯은 본문을 다시 불러오는 손잡이(기간 토글)라서 로딩 중에 사라지면 자기 클릭에 자기가 없어진다. 로딩 중 비활성이 필요하면 호출부가 슬롯 컴포넌트에 disabled 를 준다 (SegmentedControl·Button 모두 disabled 를 지원한다)',
    control: false,
    table: {
      category: 'Slots',
      type: {
        summary: 'ReactNode (accepts: SegmentedControl, Button)',
      },
      defaultValue: {
        summary: 'null',
      },
    },
  },
  value: {
    description: 'KPI 대표 수치 — 비어 있지 않으면 본문 위에 display 타이포(typography.display.sm = 24px, tabular-nums)로 렌더한다. 대시보드의 지배적 숫자이므로 본문(body.md)보다 확실히 크다 (TOKEN-05). 포맷팅(천단위·단위)은 호출부가 shared/format 으로 끝낸 문자열을 넘긴다 — 카드는 숫자를 모른다. 차트/표만 담는 카드는 비워 둔다',
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
  children: {
    description: '본문 슬롯. 차트·표 등 통계 표현 단위를 조립하는 쪽이 주입한다. loading/error 상태에서는 스켈레톤/에러 문구로 대체되어 렌더되지 않는다',
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
  loading: {
    description: '로딩 중 본문을 스켈레톤으로 대체 + aria-busy',
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
  error: {
    description: '빈 문자열이 아니면 본문 대신 이 문구를 role="alert" 로 렌더한다 (error 상태). loading 보다 우선',
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
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 2개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { loading: 'false' },
  { loading: 'true' },
] as const;

export type StatsCardCombination = (typeof combinationMatrix)[number];
