// AUTO-GENERATED from contracts/RowActions.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const RowActionsArgTypes = {
  label: {
    description: '스크린 리더용 대상 이름 — 행마다 달라야 한다(\'공지 제목\'). 버튼 aria-label 은 \'{label} 수정\'/\'{label} 삭제\'',
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
  disabled: {
    description: '진행 중(삭제 요청 등) — 두 버튼을 잠근다(native disabled)',
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
  onEdit: {
    description: '수정 — 지정되면 연필 버튼을 그린다. 미지정(읽기 전용 행)이면 생략. disabled 에서는 발화 금지 발화 차단 상태: disabled',
    action: 'onEdit',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'void',
      },
    },
  },
  onDelete: {
    description: '삭제 — 지정되면 휴지통 버튼을 그린다. 호출부가 확인 다이얼로그를 연다. disabled 에서는 발화 금지 발화 차단 상태: disabled',
    action: 'onDelete',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'void',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 2개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { disabled: 'false' },
  { disabled: 'true' },
] as const;

export type RowActionsCombination = (typeof combinationMatrix)[number];
