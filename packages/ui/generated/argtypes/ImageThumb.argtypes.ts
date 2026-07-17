// AUTO-GENERATED from contracts/ImageThumb.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ImageThumbArgTypes = {
  src: {
    description: '이미지 URL. 앞뒤 공백을 제거한 뒤 빈 문자열이면 placeholder 를 렌더한다. 로드에 실패해도(onError) placeholder 로 폴백한다',
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
  alt: {
    description: '접근성 이름 — 실제 이미지의 alt 이자 placeholder(role=img)의 aria-label 이다. 두 경로 모두 같은 이름으로 읽힌다',
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
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 1개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  {  },
] as const;

export type ImageThumbCombination = (typeof combinationMatrix)[number];
