// AUTO-GENERATED from contracts/TodoCard.contract.json@2.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const TodoCardArgTypes = {
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
      defaultValue: {
        summary: '"오늘의 할일"',
      },
    },
  },
  items: {
    description: '할일 항목 목록. count > 0 인 항목은 강조색(color.feedback.danger.text), 0 인 항목은 흐리게(color.text.disabled) 렌더한다. href 가 있으면 링크, 없으면 정적 텍스트. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ key: string; label: string; count: number; href?: string }>',
      },
    },
  },
  loading: {
    description: '로딩 중 스켈레톤 표시 + aria-busy + onItemClick 차단',
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
  showTotal: {
    description: '제목 옆에 items 의 count 합계를 Badge 로 표시',
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
  onItemClick: {
    description: '항목 클릭 시 해당 item.key 와 **원본 MouseEvent** 를 함께 전달한다. 호출부가 event.preventDefault() 로 기본 내비게이션을 가로채 SPA 라우팅으로 바꿀 수 있다. loading 상태에서는 발화 금지 (구현은 이미 event.preventDefault() 로 <a> 기본 동작도 막는다 — TodoCard.tsx:25-28) — Storybook Play Function이 전수 검증. **2.0.0 파괴적 변경**: 1.x 의 payload 는 string 이었다 발화 차단 상태: loading',
    action: 'onItemClick',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: '{ key: string; event: MouseEvent }',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 4개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { loading: 'false', showTotal: 'false' },
  { loading: 'false', showTotal: 'true' },
  { loading: 'true', showTotal: 'false' },
  { loading: 'true', showTotal: 'true' },
] as const;

export type TodoCardCombination = (typeof combinationMatrix)[number];
