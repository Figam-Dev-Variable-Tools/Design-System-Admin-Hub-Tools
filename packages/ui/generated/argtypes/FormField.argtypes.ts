// AUTO-GENERATED from contracts/FormField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const FormFieldArgTypes = {
  htmlFor: {
    description: '컨트롤의 id — <label> 의 htmlFor 와 잇는다. 힌트/오류 <p> 의 id 는 여기서 파생한다(errorIdOf·hintIdOf)',
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
    description: '필드 레이블 텍스트. 시각적으로 노출되며 htmlFor 로 컨트롤의 접근 가능한 이름이 된다',
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
    description: '필수 필드 — 레이블 옆에 붉은 시각 마커(*)를 붙인다. 마커는 aria-hidden 장식이다(라벨 텍스트 오염 방지). 마커만으로는 필수 여부가 AT 에 닿지 않으므로, 구현이 이 값을 **단일 폼 컨트롤 자식의 aria-required 로 주입**한다 (a11y.aria.required-wiring — A11Y-11). 실제 필수 검증은 자식 컨트롤/스키마가 소유한다',
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
    description: '인라인 오류 메시지. 빈 문자열/미지정이면 오류 없음(힌트를 대신 그린다). 값이 있으면 role=alert 로 오류 <p>(id=errorIdOf(htmlFor))를 그린다. 호출부는 errors.x?.message(string|undefined)를 그대로 넘긴다 — 구현이 정규화한다',
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
    description: '보조 안내 문구. 오류가 없을 때만 힌트 <p>(id=hintIdOf(htmlFor))로 그린다. 빈 문자열/미지정이면 그리지 않는다',
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
  counter: {
    description: '우측 상단 글자수 카운터 표시 문자열(\'12/500\' 등). 빈 문자열/미지정이면 그리지 않는다. tabular-nums 로 자릿수 흔들림을 막는다',
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
  help: {
    description: '라벨 옆 ⓘ 도움말 패널 본문 — 있으면 HelpTip(atom) 을 그려 열면 설명이 펼쳐진다. 미지정이면 도움말을 그리지 않는다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'ReactNode',
      },
      defaultValue: {
        summary: 'null',
      },
    },
  },
  children: {
    description: '폼 컨트롤 슬롯 — input/select/textarea 를 호출부가 넣는다. 이 껍데기는 감싸지 않고 그대로 렌더한다',
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
 * 총 2개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { required: 'false' },
  { required: 'true' },
] as const;

export type FormFieldCombination = (typeof combinationMatrix)[number];
