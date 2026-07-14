// AUTO-GENERATED from contracts/ListCard.contract.json@2.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ListCardArgTypes = {
  title: {
    description: '카드 제목',
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
  count: {
    description: '제목 옆 Badge 에 표시할 총 건수. rows.length 와 다를 수 있다(전체 건수 vs 미리보기 행)',
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
  rows: {
    description: '행 목록. 빈 배열이면 empty 문구를 렌더한다. meta 는 보조 정보(작성자·날짜 등), href 가 있으면 행 전체가 링크. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ id: string; title: string; meta?: string; href?: string }>',
      },
    },
  },
  loading: {
    description: '로딩 중 스켈레톤 행 표시 + aria-busy + onRowClick 차단',
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
  icon: {
    description: '각 행 앞에 붙는 아이콘 슬롯. 목록 성격(주문·문의·상담)을 시각적으로 구분한다',
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
  onRowClick: {
    description: '행 클릭 시 해당 row.id 와 **원본 MouseEvent** 를 함께 전달한다. 호출부가 event.preventDefault() 로 기본 내비게이션을 가로채 SPA 라우팅으로 바꿀 수 있다 — 이 인자가 없으면 href 있는 행은 전체 새로고침이 된다. loading 상태에서는 발화 금지 (구현은 발화 차단과 함께 event.preventDefault() 로 <a> 기본 동작도 막는다) — Storybook Play Function이 전수 검증. **2.0.0 파괴적 변경**: 1.x 의 payload 는 string 이었다 발화 차단 상태: loading',
    action: 'onRowClick',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: '{ id: string; event: MouseEvent }',
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

export type ListCardCombination = (typeof combinationMatrix)[number];
