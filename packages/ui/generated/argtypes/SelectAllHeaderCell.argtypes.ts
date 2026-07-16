// AUTO-GENERATED from contracts/SelectAllHeaderCell.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const SelectAllHeaderCellArgTypes = {
  label: {
    description: '보이지 않는 라벨 문구 — 예: \'이 페이지의 회원 전체 선택\'',
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
  labelId: {
    description: '라벨 요소의 id — 표마다 달라야 한다(한 문서에 두 표가 있을 수 있다). TriStateCheckbox 의 labelledBy 로 이어진다',
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
  selection: {
    description: '이 페이지의 선택 상태 — 동반 유틸 tableSelectionState 가 계산한다. allSelected → 체크박스 on, someSelected → mixed(부분 선택). 데이터 prop — Figma 대응 없음',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: '{ readonly allSelected: boolean; readonly someSelected: boolean }',
      },
    },
  },
  onToggleAll: {
    description: '전체선택/해제 — 다음 상태(boolean)를 인자로 발화한다',
    action: 'onToggleAll',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'boolean',
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

export type SelectAllHeaderCellCombination = (typeof combinationMatrix)[number];
