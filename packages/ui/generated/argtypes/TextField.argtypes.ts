// AUTO-GENERATED from contracts/TextField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const TextFieldArgTypes = {
  id: {
    description: 'input 의 id. label htmlFor 및 에러 메시지 id(`{id}-error`)의 기준',
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
  label: {
    description: '가시 라벨. <label htmlFor={id}> 로 렌더 — placeholder 로 대체 금지',
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
    description: '제어 값. onChange 와 항상 짝을 이룬다',
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
  type: {
    description: 'input type',
    control: {
      type: 'select',
    },
    options: ['text', 'email', 'password', 'number'],
    table: {
      category: 'Props',
      type: {
        summary: '\'text\' | \'email\' | \'password\' | \'number\'',
      },
      defaultValue: {
        summary: '"text"',
      },
    },
  },
  error: {
    description: '위반 메시지. 빈 문자열이면 정상 상태 — 비어있지 않으면 error 상태(테두리 danger + 메시지 렌더 + aria-invalid)',
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
  disabled: {
    description: '비활성. native disabled 속성 — onBlur/onChange 발화 없음',
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
  required: {
    description: '필수 입력. native required 속성 → aria-required. **라벨에 시각 마커(*)를 주입하지 않는다** — <label> 의 textContent 가 곧 접근 가능한 이름이므로 마커를 넣으면 이름이 "이메일*" 이 되어 getByLabel/getByLabelText 정확일치 셀렉터가 깨지고(E2E FS-001), 오너 확정 로그인 화면에 없던 표식이 새로 나타난다. 현행 구현(TextField.tsx:63-67)이 계약에 없는 마커를 주입하고 있다 — 정정 대상(A30). 표식이 필요한 화면이 실제로 생기면 그때 실호출부와 함께 prop 을 추가한다',
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
  placeholder: {
    description: '보조 예시 텍스트. 라벨을 대체하지 않는다',
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
  name: {
    description: '폼 제출 키이자 브라우저 자동완성·비밀번호 관리자의 필드 판정 근거. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="email")',
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
  autoComplete: {
    description: '브라우저 자동완성 힌트 (username · email · current-password …). 빈 문자열이면 속성을 부여하지 않는다. **없으면 자격증명 자동완성이 퇴행한다** — 기능 손실이지 장식이 아니다. 실사용: LoginForm(autoComplete="username")',
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
  inputMode: {
    description: '모바일 소프트 키보드 힌트 (email · numeric · tel …). 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(inputMode="email")',
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
  trailing: {
    description: '입력 오른쪽에 겹쳐 놓는 요소(비밀번호 표시 토글 등). 있으면 입력의 오른쪽 여백을 넓혀 텍스트와 겹치지 않게 한다',
    control: false,
    table: {
      category: 'Slots',
      type: {
        summary: 'ReactNode (accepts: Button, Icon)',
      },
      defaultValue: {
        summary: 'null',
      },
    },
  },
  onChange: {
    description: '입력 변경. 제어 컴포넌트이므로 필수 — 부모가 value 를 갱신한다',
    action: 'onChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'ChangeEvent<HTMLInputElement>',
      },
    },
  },
  onBlur: {
    description: '포커스 이탈(주로 blur-시점 유효성 검사 트리거). disabled 에서는 발화 금지 — Storybook Play Function 이 전수 검증 발화 차단 상태: disabled',
    action: 'onBlur',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'FocusEvent<HTMLInputElement>',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 16개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { type: 'text', disabled: 'false', required: 'false' },
  { type: 'text', disabled: 'false', required: 'true' },
  { type: 'text', disabled: 'true', required: 'false' },
  { type: 'text', disabled: 'true', required: 'true' },
  { type: 'email', disabled: 'false', required: 'false' },
  { type: 'email', disabled: 'false', required: 'true' },
  { type: 'email', disabled: 'true', required: 'false' },
  { type: 'email', disabled: 'true', required: 'true' },
  { type: 'password', disabled: 'false', required: 'false' },
  { type: 'password', disabled: 'false', required: 'true' },
  { type: 'password', disabled: 'true', required: 'false' },
  { type: 'password', disabled: 'true', required: 'true' },
  { type: 'number', disabled: 'false', required: 'false' },
  { type: 'number', disabled: 'false', required: 'true' },
  { type: 'number', disabled: 'true', required: 'false' },
  { type: 'number', disabled: 'true', required: 'true' },
] as const;

export type TextFieldCombination = (typeof combinationMatrix)[number];
