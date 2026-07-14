// AUTO-GENERATED from contracts/Alert.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const AlertArgTypes = {
  tone: {
    description: '메시지 의미. 색상(feedback 토큰)과 아이콘, 그리고 라이브 리전 시맨틱(danger=assertive / 그 외=polite)을 함께 결정한다',
    control: {
      type: 'select',
    },
    options: ['danger', 'info', 'success', 'warning'],
    table: {
      category: 'Props',
      type: {
        summary: '\'danger\' | \'info\' | \'success\' | \'warning\'',
      },
      defaultValue: {
        summary: '"danger"',
      },
    },
  },
  children: {
    description: '메시지 본문. 아이콘 옆 <span> 으로 렌더된다',
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
  id: {
    description: '요소 id. 폼 컨트롤의 aria-describedby 로 이 메시지를 가리킬 때 쓴다. 빈 문자열이면 id 를 부여하지 않는다',
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
  onClose: {
    description: '닫기(×) 버튼 클릭. **핸들러를 주면 닫기 버튼이 나타나고, 주지 않으면 나타나지 않는다** — 해제 가능 여부는 별도 boolean 이 아니라 이 핸들러의 유무로 결정한다 (shared/ui 선례). 배너를 언마운트하는 것은 호출부의 책임이다 (실사용: MembersPage 상단 안내 배너). 버튼의 접근 가능한 이름은 aria-label="안내 닫기"',
    action: 'onClose',
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
 * 총 4개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { tone: 'danger' },
  { tone: 'info' },
  { tone: 'success' },
  { tone: 'warning' },
] as const;

export type AlertCombination = (typeof combinationMatrix)[number];
