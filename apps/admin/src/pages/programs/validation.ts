// 프로그램 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 금액·기간은 입력 중 원값을 보존하려 문자열로 받고 여기서 형식·범위를 판정한다.
// 기간은 두 날짜의 **관계**(시작 ≤ 종료)까지 봐야 하므로 refine 으로 교차 검증한다.
import { richTextLength } from '@tds/ui';
import * as z from 'zod/mini';

import { requiredText } from '../../shared/crud';
import {
  MAX_PROGRAM_OPTION_GROUPS,
  PROGRAM_CATEGORY_NAME_MAX,
  PROGRAM_DESCRIPTION_MAX,
  PROGRAM_SUMMARY_MAX,
  PROGRAM_TITLE_MAX,
} from './_shared/store';

const INT_RE = /^\d+$/;

const rewardSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  description: z.string(),
  limitCount: z.number(),
  claimedCount: z.number(),
  /** 이 리워드가 후원자에게 고르게 할 옵션 그룹 id — 정의는 optionGroups 가 갖는다 */
  optionGroupIds: z.array(z.string()),
});

const optionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(z.string()),
});

export const programSchema = z
  .object({
    title: requiredText('프로그램명', PROGRAM_TITLE_MAX),
    categoryId: z.string().check(z.minLength(1, '카테고리를 선택하세요.')),
    creator: requiredText('창작자', 40),
    summary: requiredText('한 줄 소개', PROGRAM_SUMMARY_MAX),
    story: z.string(),
    // 상세 설명은 RichTextField 가 받는 **HTML** 이다 — 상한은 마크업이 아니라 평문 길이에 건다.
    // value.length 로 재면 '굵게' 한 번에 <strong></strong> 17자가 붙어 쓰지도 않은 글자수로 제출이
    // 막힌다. 카운터와 같은 함수(richTextLength)로 판정해야 화면의 'N/2000' 과 어긋나지 않는다.
    // (스토리에는 상한이 없다 — 창작자의 서술을 자를 이유가 없다. 화면 카운터는 작성 가이드다.)
    description: z.string().check(
      z.refine((value) => richTextLength(value) <= PROGRAM_DESCRIPTION_MAX, {
        error: `상세 설명은 ${String(PROGRAM_DESCRIPTION_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
    goalAmount: z
      .string()
      .check(z.refine((value) => INT_RE.test(value.trim()), '목표 금액은 숫자만 입력하세요.'))
      .check(z.refine((value) => Number(value.trim()) > 0, '목표 금액은 1원 이상이어야 합니다.')),
    startDate: z.string().check(z.minLength(1, '시작일을 입력하세요.')),
    endDate: z.string().check(z.minLength(1, '종료일을 입력하세요.')),
    status: z.enum(['draft', 'scheduled', 'live', 'succeeded', 'failed']),
    coverImageUrl: z.string(),
    thumbnailUrl: z.string(),
    // 값이 빈 그룹은 여기서 막지 않는다 — 작성 중에 그룹 자리를 먼저 잡는 것은 정상적인 순서다.
    // 저장 경로(normalizeProgramOptionGroups)가 조용히 버린다. 반대로 **값은 있는데 이름이 없는**
    // 그룹은 막는다: 리워드 편집기에서 무엇을 고르는 선택지인지 부를 이름이 없어진다.
    optionGroups: z.array(optionGroupSchema).check(
      z.refine((groups) => groups.length <= MAX_PROGRAM_OPTION_GROUPS, {
        error: `옵션은 최대 ${String(MAX_PROGRAM_OPTION_GROUPS)}개까지 만들 수 있습니다.`,
      }),
      z.refine(
        (groups) => groups.every((group) => group.values.length === 0 || group.name.trim() !== ''),
        { error: '옵션값을 입력한 옵션에는 옵션명을 함께 입력하세요.' },
      ),
      z.refine(
        (groups) => {
          const names = groups.map((group) => group.name.trim()).filter((name) => name !== '');
          return new Set(names).size === names.length;
        },
        { error: '옵션명이 중복되었습니다. 서로 다른 이름을 입력하세요.' },
      ),
    ),
    rewards: z.array(rewardSchema),
  })
  .check(
    z.refine((values) => values.startDate <= values.endDate, {
      message: '종료일은 시작일과 같거나 그 뒤여야 합니다.',
      path: ['endDate'],
    }),
    // 리워드는 **정의된 옵션 그룹만** 가리킬 수 있다. 그룹을 지운 뒤 남은 참조는 후원 화면에서
    // 이름 없는 선택지가 된다 — 화면이 참조를 함께 떼지만, 정본은 이 규칙이다.
    z.refine(
      (values) => {
        const defined = new Set(values.optionGroups.map((group) => group.id));
        return values.rewards.every((reward) =>
          reward.optionGroupIds.every((id) => defined.has(id)),
        );
      },
      {
        message: '삭제된 옵션을 가리키는 리워드가 있습니다. 리워드의 옵션 선택을 다시 확인하세요.',
        path: ['rewards'],
      },
    ),
  );

export type ProgramFormValues = z.infer<typeof programSchema>;

export const programCategorySchema = z.object({
  name: requiredText('카테고리 이름', PROGRAM_CATEGORY_NAME_MAX),
  /** 상위 카테고리 id. 빈 문자열이면 최상위(1Depth) */
  parentId: z.string(),
});

export type ProgramCategoryFormValues = z.infer<typeof programCategorySchema>;
