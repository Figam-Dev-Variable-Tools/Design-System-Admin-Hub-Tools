// AUTO-GENERATED from contracts/ImageGalleryField.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ImageGalleryFieldArgTypes = {
  label: {
    description: '필드 라벨 — 드롭존의 접근 가능한 이름과 각 타일 alt 의 기준',
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
  values: {
    description: '현재 이미지 URL 배열. 빈 배열이면 드롭존만, 있으면 그리드 프리뷰 + 개별 제거. 데이터 prop — Figma 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<string>',
      },
    },
  },
  required: {
    description: '필수 표식(*)을 라벨에 붙인다 (장식 — aria-hidden)',
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
    description: '드롭존/추가/제거를 비활성한다',
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
    description: '스키마가 내려주는 오류 — 로컬 검증 오류(타입·용량·개수)보다 우선. 비어 있지 않으면 danger 테두리 + role=alert 인라인 오류',
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
    description: '도움말 문구 — 오류가 없을 때만 표시된다',
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
  maxFiles: {
    description: '등록 가능한 최대 장수. 초과분은 인라인 오류로 막고 상한까지만 담는다',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '10',
      },
    },
  },
  maxSizeMB: {
    description: '파일당 용량 상한(MB). 초과하면 인라인 오류로 막는다',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '5',
      },
    },
  },
  onChange: {
    description: '이미지 목록이 바뀌면 새 URL 배열을 넘긴다 — 네이티브 이벤트가 아니라 값 콜백이다',
    action: 'onChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'readonly string[]',
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

export type ImageGalleryFieldCombination = (typeof combinationMatrix)[number];
