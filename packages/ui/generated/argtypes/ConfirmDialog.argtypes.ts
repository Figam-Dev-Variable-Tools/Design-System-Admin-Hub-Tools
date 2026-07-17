// AUTO-GENERATED from contracts/ConfirmDialog.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ConfirmDialogArgTypes = {
  intent: {
    description: '확인의 의도 — 톤(primary/danger)·기본 확인 라벨·아이콘을 함께 결정한다. 앱 전체에서 \'삭제\'가 항상 같은 빨강으로 보이게 하는 장치다',
    control: {
      type: 'select',
    },
    options: ['create', 'update', 'delete', 'discard'],
    table: {
      category: 'Props',
      type: {
        summary: '\'create\' | \'update\' | \'delete\' | \'discard\'',
      },
    },
  },
  title: {
    description: '다이얼로그 제목',
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
  message: {
    description: '확인 문구 — 무엇을 확인하는지 사람이 읽는 문장',
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
  confirmLabel: {
    description: '확인 버튼 라벨. 빈 문자열이면 intent 의 기본 라벨을 쓴다 (\'회원 삭제\' 처럼 대상을 밝힐 때만 덮어쓴다)',
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
  cancelLabel: {
    description: '취소 버튼 라벨',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"취소"',
      },
    },
  },
  busy: {
    description: '확인 진행 중 — 확인 버튼을 비활성(aria-busy)하고 라벨을 \'처리 중…\' 으로 바꿔 중복 클릭을 막는다. 취소/Esc/딤은 살아 있다',
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
    description: '빈 문자열이 아니면 본문 아래에 danger 배너(Alert)로 표시된다. 복구 경로는 확인 버튼 재클릭이다 (실패해도 다이얼로그를 닫지 않는다)',
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
  onConfirm: {
    description: '확인 버튼 클릭. busy 중에는 발화 금지 (구현은 확인 버튼을 disabled 로 잠근다) — Storybook Play Function이 전수 검증 발화 차단 상태: busy',
    action: 'onConfirm',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'void',
      },
    },
  },
  onCancel: {
    description: '취소·Esc·딤 클릭. 진행 중 요청이 있으면 호출부가 여기서 abort 한다. busy 중에도 살아 있다',
    action: 'onCancel',
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
 * 총 8개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { intent: 'create', busy: 'false' },
  { intent: 'create', busy: 'true' },
  { intent: 'update', busy: 'false' },
  { intent: 'update', busy: 'true' },
  { intent: 'delete', busy: 'false' },
  { intent: 'delete', busy: 'true' },
  { intent: 'discard', busy: 'false' },
  { intent: 'discard', busy: 'true' },
] as const;

export type ConfirmDialogCombination = (typeof combinationMatrix)[number];
