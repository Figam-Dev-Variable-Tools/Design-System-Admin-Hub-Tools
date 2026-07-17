// AUTO-GENERATED from contracts/Timeline.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const TimelineArgTypes = {
  events: {
    description: '표시용으로 환산된 타임라인 이벤트 목록. at 은 ISO 시각, badgeTone/badgeLabel 은 StatusBadge 로 렌더, author/text 는 작성자/본문. 빈 배열이면 emptyLabel 을 렌더한다. 데이터 prop — Figma 대응 없음 (ADR-0003)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ id: string; at: string; badgeTone: \'neutral\' | \'success\' | \'warning\' | \'danger\' | \'info\'; badgeLabel: string; author: string; text: string }>',
      },
    },
  },
  label: {
    description: '스크린 리더용 목록 이름 — \'문의 처리 이력\' 등. <ol> 의 aria-label 이 된다',
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
  emptyLabel: {
    description: 'events 가 빈 배열일 때 표시할 문구',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"기록된 이력이 없습니다."',
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

export type TimelineCombination = (typeof combinationMatrix)[number];
