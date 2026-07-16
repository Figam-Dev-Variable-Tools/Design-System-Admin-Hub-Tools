// AUTO-GENERATED from contracts/Modal.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ModalArgTypes = {
  title: {
    description: '다이얼로그 제목 — aria-labelledby 로 role=dialog 에 접근성 이름을 준다',
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
  icon: {
    description: '제목 왼쪽 아이콘 슬롯 — 의도(생성/수정/삭제/이탈)를 색과 함께 이중으로 전달한다. 없으면 제목만 렌더',
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
  children: {
    description: '본문 슬롯. 확인 문구·폼 필드 등 조립하는 쪽이 주입한다',
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
  footer: {
    description: '푸터 슬롯 — 오른쪽 정렬된 액션 버튼들(취소/확인 등). 조립하는 쪽이 주입한다',
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

export type ModalCombination = (typeof combinationMatrix)[number];
