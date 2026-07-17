// AUTO-GENERATED from contracts/TextareaField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const TextareaFieldArgTypes = {
  label: {
    description: '필드 레이블 — FormField 로 내려보낸다',
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
  value: {
    description: '제어 컴포넌트 입력값. 카운터(\'value.length/maxLength\')의 분자도 이 길이에서 나온다',
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
  maxLength: {
    description: '최대 길이 — native maxLength 와 카운터 분모(\'N/max\')를 함께 정한다',
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
  required: {
    description: '필수 필드 — FormField 로 내려보내 레이블에 마커(*)를 그리고, **동시에 <textarea> 자신에게 native required + aria-required 로 잇는다** (마커는 aria-hidden 장식이라 그것만으로는 AT 에 닿지 않는다 — A11Y-11)',
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
    description: '비활성 — native disabled 로 입력을 막는다. onChange 발화도 차단한다(blockedWhen)',
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
    description: '인라인 오류 메시지 — FormField 로 내려보낸다. 값이 있으면 aria-invalid=true + aria-describedby=errorIdOf(id). 빈 문자열/미지정이면 오류 없음',
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
    description: '보조 안내 — FormField 로 내려보낸다. 오류가 없을 때만 그리고, 그때 aria-describedby=hintIdOf(id)',
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
  placeholder: {
    description: '보조 예시 텍스트. 빈 문자열/미지정이면 속성을 부여하지 않는다',
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
  rows: {
    description: 'textarea 표시 행 수(native rows). 최소 높이는 별도로 토큰 배수로도 보장한다',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '8',
      },
    },
  },
  onChange: {
    description: '입력값 변경 — 이벤트가 아니라 새 문자열(event.target.value)을 그대로 넘긴다. disabled 에서는 발화 금지(내부 가드 + native disabled 이중 차단) 발화 차단 상태: disabled',
    action: 'onChange',
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
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { required: 'false', disabled: 'false' },
  { required: 'false', disabled: 'true' },
  { required: 'true', disabled: 'false' },
  { required: 'true', disabled: 'true' },
] as const;

export type TextareaFieldCombination = (typeof combinationMatrix)[number];
