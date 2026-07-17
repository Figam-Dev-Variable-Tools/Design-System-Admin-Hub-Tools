// AUTO-GENERATED from contracts/RichTextField.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const RichTextFieldArgTypes = {
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
    description: '제어 컴포넌트 입력값 — **sanitize 된 HTML 문자열**. 에디터에 넣기 전에 다시 sanitize 한다(저장된 값을 신뢰하지 않는다)',
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
    description: '최대 **평문** 길이 — 카운터(\'N/max\')의 분모. HTML 마크업 길이가 아니라 richTextLength(value) 를 센다',
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
    description: '필수 필드 — FormField 로 내려보내 레이블에 마커(*)를 그리고, 편집 영역에 aria-required 를 함께 잇는다 (마커는 aria-hidden 장식이라 그것만으로는 AT 에 닿지 않는다 — A11Y-11 · TextareaField 미러)',
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
    description: '비활성 — 에디터를 non-editable 로 두고 툴바 버튼을 native disabled 로 막는다. onChange 발화도 차단한다(blockedWhen)',
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
    description: '본문이 비었을 때 편집 영역에 그리는 보조 예시 텍스트',
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
    description: '편집 영역 최소 표시 행 수 — 최소 높이를 space 토큰 배수로 환산한다(TextareaField 의 rows 미러)',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '6',
      },
    },
  },
  onChange: {
    description: '본문 변경 — 이벤트가 아니라 **sanitize 된 새 HTML 문자열**을 넘긴다. disabled 에서는 발화 금지 발화 차단 상태: disabled',
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

export type RichTextFieldCombination = (typeof combinationMatrix)[number];
