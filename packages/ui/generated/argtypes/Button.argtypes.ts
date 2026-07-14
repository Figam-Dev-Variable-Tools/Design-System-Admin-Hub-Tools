// AUTO-GENERATED from contracts/Button.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ButtonArgTypes = {
  variant: {
    description: '시각 위계. 디자인 스펙(DS)의 variant 목록과 완전 일치해야 함. 기본값 primary 는 유지한다 — apps/admin 의 <Button> 호출부는 전수 감사 결과 100% variant 를 명시하고 있어(무지정 호출부 0건) 기본값 차이로 시각이 뒤집히는 호출부가 없다',
    control: {
      type: 'select',
    },
    options: ['primary', 'secondary', 'ghost', 'danger'],
    table: {
      category: 'Props',
      type: {
        summary: '\'primary\' | \'secondary\' | \'ghost\' | \'danger\'',
      },
      defaultValue: {
        summary: '"primary"',
      },
    },
  },
  type: {
    description: '네이티브 button type. 허용 값은 button · submit · reset 이며 그 외 값은 구현이 button 으로 좁힌다. **기본값 button 은 HTML 기본값(submit) 을 의도적으로 뒤집은 DS 결정이다** — 폼 안의 보조 버튼이 실수로 제출하지 않게 한다. submit 을 주면 폼을 제출한다 (실사용: LoginForm · RoleFormModal · CreateGroupModal · PasswordChangeModal · PointsCard 의 폼 5개). [enum 이 아닌 이유] type 은 시각 변형이 아니라 HTML 시맨틱이라 Figma Component Property 대응이 없다. enum 으로 선언하면 스키마가 figmaProperty 를 강제해(G3) 시각차 0인 3값 Figma Variant 축이 생기고, contract-test 의 조합 커버리지 요구가 3배로 뛴다. 허용 값은 values 로 기술하되 Figma/Variant 축은 만들지 않는다 (스키마 확장 제안: CR-2026-0715-008)',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"button"',
      },
    },
  },
  size: {
    control: {
      type: 'select',
    },
    options: ['sm', 'md', 'lg'],
    table: {
      category: 'Props',
      type: {
        summary: '\'sm\' | \'md\' | \'lg\'',
      },
      defaultValue: {
        summary: '"md"',
      },
    },
  },
  loading: {
    description: '로딩 중 스피너 표시 + onClick 차단 + aria-busy',
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
    description: '비활성. onClick 차단 + aria-disabled',
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
  isFullWidth: {
    description: '컨테이너 100% 폭. 기본은 내용 폭(inline-flex). 실사용: 로그인 제출 CTA (LoginForm — 오너 확정 화면의 시각이다). [이름] boolean prop 은 is/has/can 접두 또는 상태 형용사 화이트리스트만 허용된다 (naming-guard boolean-prop 규칙 · ADR-0005) — CR 원안의 fullWidth 는 규칙 위반이라 isFullWidth 로 좁혔다. Figma 쪽 이름은 FullWidth 로 유지한다',
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
  iconLeft: {
    description: '좌측 아이콘 슬롯. loading 중에는 스피너로 대체되어 숨김 숨김 조건: loading',
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
    description: '버튼 레이블',
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
  onClick: {
    description: 'disabled/loading 상태에서는 발화 금지 — Storybook Play Function이 전수 검증 발화 차단 상태: disabled, loading',
    action: 'onClick',
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
 * 총 96개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { variant: 'primary', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'primary', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'primary', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'primary', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'primary', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'primary', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'primary', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'primary', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'primary', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'primary', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'primary', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'primary', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'primary', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'primary', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'primary', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'primary', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'primary', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'primary', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'primary', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'primary', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'primary', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'primary', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'primary', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'primary', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'secondary', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'secondary', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'secondary', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'secondary', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'secondary', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'secondary', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'secondary', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'secondary', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'secondary', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'secondary', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'secondary', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'secondary', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'secondary', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'secondary', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'secondary', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'secondary', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'secondary', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'secondary', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'secondary', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'secondary', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'secondary', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'secondary', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'secondary', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'secondary', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'ghost', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'ghost', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'ghost', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'ghost', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'ghost', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'ghost', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'ghost', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'ghost', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'ghost', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'ghost', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'ghost', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'ghost', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'ghost', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'ghost', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'ghost', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'ghost', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'ghost', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'ghost', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'ghost', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'ghost', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'ghost', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'ghost', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'ghost', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'ghost', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'danger', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'danger', size: 'sm', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'danger', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'danger', size: 'sm', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'danger', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'danger', size: 'sm', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'danger', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'danger', size: 'sm', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'danger', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'danger', size: 'md', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'danger', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'danger', size: 'md', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'danger', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'danger', size: 'md', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'danger', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'danger', size: 'md', loading: 'true', disabled: 'true', isFullWidth: 'true' },
  { variant: 'danger', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'false' },
  { variant: 'danger', size: 'lg', loading: 'false', disabled: 'false', isFullWidth: 'true' },
  { variant: 'danger', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'false' },
  { variant: 'danger', size: 'lg', loading: 'false', disabled: 'true', isFullWidth: 'true' },
  { variant: 'danger', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'false' },
  { variant: 'danger', size: 'lg', loading: 'true', disabled: 'false', isFullWidth: 'true' },
  { variant: 'danger', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'false' },
  { variant: 'danger', size: 'lg', loading: 'true', disabled: 'true', isFullWidth: 'true' },
] as const;

export type ButtonCombination = (typeof combinationMatrix)[number];
