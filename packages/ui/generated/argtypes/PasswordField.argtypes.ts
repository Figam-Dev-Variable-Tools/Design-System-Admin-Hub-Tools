// AUTO-GENERATED from contracts/PasswordField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const PasswordFieldArgTypes = {
  id: {
    description: 'input 의 id. label 의 htmlFor 및 토글 버튼의 aria-controls 가 참조한다',
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
    description: '필드 레이블. 시각적으로 노출되며 input 의 접근 가능한 이름이 된다',
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
    description: '제어 컴포넌트 입력값',
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
  error: {
    description: '인라인 에러 메시지. 빈 문자열이면 에러 없음 — 값이 있으면 aria-invalid + aria-describedby 연결',
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
    description: '비활성. 입력·토글 모두 차단 + aria-disabled',
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
    description: '필수 입력. native required 속성 → aria-required. **레이블에 시각 마커(*)를 주입하지 않는다** — 이 문장의 이전 판("레이블에 필수 표식")은 오기(erratum)였다. TextField.required 와 동일 판정: 라벨 textContent = 접근 가능한 이름이며, 마커는 getByLabel 정확일치를 깨고 오너 확정 로그인 화면에 없던 표식을 만든다',
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
  name: {
    description: '폼 제출 키이자 비밀번호 관리자의 필드 판정 근거. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="password")',
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
    description: '브라우저 자동완성 힌트 (current-password · new-password). **없으면 비밀번호 관리자 채우기가 퇴행한다.** 실사용: LoginForm(autoComplete="current-password")',
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
    description: '보조 예시 텍스트. TextField 에는 있으나 PasswordField 가 전달하지 않아 끊겨 있던 표면이다 — 자식 TextField 로 그대로 내려보낸다',
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
  revealed: {
    description: '표시/숨김 상태. true 면 input type=text(평문) + 눈 감김 아이콘, false 면 type=password + 눈 아이콘',
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
  onChange: {
    description: '입력값 변경 발화 차단 상태: disabled',
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
    description: '포커스 이탈 — 폼 검증 트리거 지점. disabled 에서는 발화 금지 (자식 TextField 의 가드로 실제 차단된다 — CR-2026-0715-003 실측). 계약이 현실보다 약했던 부분의 정정이며, 이 보장을 고정하는 테스트는 A30 이 채운다 발화 차단 상태: disabled',
    action: 'onBlur',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'FocusEvent<HTMLInputElement>',
      },
    },
  },
  onToggleReveal: {
    description: '표시/숨김 토글 버튼 클릭. disabled 에서는 발화 금지 — Storybook Play Function이 전수 검증 발화 차단 상태: disabled',
    action: 'onToggleReveal',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'MouseEvent',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 8개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { disabled: 'false', required: 'false', revealed: 'false' },
  { disabled: 'false', required: 'false', revealed: 'true' },
  { disabled: 'false', required: 'true', revealed: 'false' },
  { disabled: 'false', required: 'true', revealed: 'true' },
  { disabled: 'true', required: 'false', revealed: 'false' },
  { disabled: 'true', required: 'false', revealed: 'true' },
  { disabled: 'true', required: 'true', revealed: 'false' },
  { disabled: 'true', required: 'true', revealed: 'true' },
] as const;

export type PasswordFieldCombination = (typeof combinationMatrix)[number];
