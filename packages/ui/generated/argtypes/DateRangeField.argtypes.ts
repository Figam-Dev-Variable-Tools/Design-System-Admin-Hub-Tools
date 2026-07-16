// AUTO-GENERATED from contracts/DateRangeField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const DateRangeFieldArgTypes = {
  label: {
    description: '그룹 라벨 텍스트 — 두 날짜 칸 위에 한 번 그린다. 각 칸의 숨김 라벨(\'label 시작일\'·\'label 종료일\')도 여기서 파생한다',
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
  startValue: {
    description: '시작일 제어값 (YYYY-MM-DD)',
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
  endValue: {
    description: '종료일 제어값 (YYYY-MM-DD)',
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
  required: {
    description: '필수 필드 — 그룹 라벨 옆에 aria-hidden 마커(*)를 붙이고, **두 날짜 입력 각각에 native required + aria-required 를 낸다** (범위는 시작·종료가 함께 있어야 성립한다). 마커만으로는 AT 에 닿지 않는다 — A11Y-11',
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
  disabled: {
    description: '비활성 — 두 날짜 입력을 native disabled 로 함께 막는다',
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
    description: '인라인 오류 메시지(종료≥시작 위반 등). 값이 있으면 role=alert 로 오류 <p> 를 그리고 두 입력에 aria-invalid=true 를 준다. 빈 문자열/미지정이면 오류 없음',
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
  hint: {
    description: '보조 안내 — 오류가 없을 때만 그린다. 빈 문자열/미지정이면 그리지 않는다',
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
  onStartChange: {
    description: '시작일 변경 — 새 문자열(event.target.value)을 넘긴다',
    action: 'onStartChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'string',
      },
    },
  },
  onEndChange: {
    description: '종료일 변경 — 새 문자열(event.target.value)을 넘긴다',
    action: 'onEndChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'string',
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
  { required: 'false', disabled: 'false' },
  { required: 'false', disabled: 'true' },
  { required: 'true', disabled: 'false' },
  { required: 'true', disabled: 'true' },
] as const;

export type DateRangeFieldCombination = (typeof combinationMatrix)[number];
