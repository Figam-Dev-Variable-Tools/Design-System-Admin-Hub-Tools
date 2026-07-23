// 채용 공고 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [규칙은 여기서 다시 쓰지 않는다] '지원 방법이 성립하는가' 와 '공개해도 되는가' 는 필드 하나로
// 판정되지 않는다 — 지원 방법에 따라 대상 칸의 뜻이 달라지고, 폼 참조는 **바깥 목록**을 봐야
// 한다. 그 판정의 정본은 ./types.ts 의 `applyMethodBlock` · `publishBlock` 이고, 이 스키마는
// 그것을 **부를 뿐**이다. 화면의 경고 배너·저장 거절·저장소의 거절이 같은 함수를 읽어야
// 갈라지지 않는다(shared/domain/order.ts 의 orderTransitionBlock · claims 의 refundActionBlock 이
// 선례다).
//
// [이슈는 반드시 필드에 붙인다] 객체 수준(path 없는) zod 이슈는 어느 `FormField` 의
// `error` 로도 흘러가지 않아 **화면 어디에도 그려지지 않는다.** 그래서 아래 `.check` 는 언제나
// `path` 를 준다 — 공개 게이트는 `applyTarget`(문제가 실제로 있는 칸), 마감일은 `closesOn`.
//
// [마감일 — '비어 있어도 통과' 를 되돌렸다]
// 예전에는 스키마가 형식까지만 보고 빈 값을 통과시켰다. 상시 채용을 빈 값으로 표현한다고 봤기
// 때문인데 **폼은 그렇게 저장하지 않는다**: '상시 채용' 을 켜면 `toInput` 이 `null` 을 만든다
// (CareersFormPage.tsx). 그래서 남은 빈 값은 상시 채용이 아니라 **아직 안 정한 날짜**이고,
// 그대로 저장하면 `closesOn: ''` 가 되어 `careerStateOf` 의 `'' < today` 가 참이 된다 —
// 방금 만든 공고가 즉시 '마감' 으로 그려진다.
//
// **`''` 를 `null` 로 접지 않고 검증에서 막는 쪽을 골랐다.** 접으면 '아직 안 정함' 이 소리 없이
// '상시 채용' 이 되고, 그것은 types.ts 머리말이 `closesOn: string | null` 로 굳이 갈라 놓은 두
// 상태를 다시 하나로 만드는 일이다. 되묻는 비용은 한 번이지만, 잘못 접힌 공고는 아무도 알아채지
// 못한 채 '상시 채용' 으로 홈페이지에 걸린다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import {
  APPLY_TARGET_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  publishBlock,
  TITLE_MAX_LENGTH,
} from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const CLOSES_ON_REQUIRED =
  '마감일을 정하거나 ‘상시 채용’ 을 켜세요. 비워 두면 오늘 이전 날짜로 읽혀 공고가 곧바로 마감돼요.';

export const careerSchema = z
  .object({
    title: requiredText('공고 제목', TITLE_MAX_LENGTH),
    jobFunction: z
      .string()
      .check(z.refine((value) => value.trim() !== '', { error: '직무를 선택하세요.' })),
    employmentType: z
      .string()
      .check(z.refine((value) => value.trim() !== '', { error: '고용형태를 선택하세요.' })),
    location: requiredText('근무지', LOCATION_MAX_LENGTH),
    /** 'YYYY-MM-DD'. 상시 채용일 때만 비어 있을 수 있다 — 그 뜻은 alwaysOpen 이 갖는다 */
    closesOn: z.string().check(
      z.refine((value) => value.trim() === '' || ISO_DATE_RE.test(value.trim()), {
        error: '마감일 형식이 올바르지 않아요.',
      }),
    ),
    alwaysOpen: z.boolean(),
    applyMethod: z
      .string()
      .check(z.refine((value) => value.trim() !== '', { error: '지원 방법을 선택하세요.' })),
    applyTarget: z.string().check(
      z.refine((value) => value.trim().length <= APPLY_TARGET_MAX_LENGTH, {
        error: '지원 방법 값이 너무 길어요.',
      }),
    ),
    description: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '공고 내용을 입력하세요.' }),
      z.refine((value) => value.trim().length <= DESCRIPTION_MAX_LENGTH, {
        error: '공고 내용이 너무 길어요.',
      }),
    ),
    published: z.boolean(),
  })
  .check((ctx) => {
    const values = ctx.value;

    // ③ 상시가 아닌데 날짜가 비었다 — 저장하면 `''` 가 되고 파생이 그것을 '지난 날짜' 로 읽는다
    if (!values.alwaysOpen && values.closesOn.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: values.closesOn,
        path: ['closesOn'],
        message: CLOSES_ON_REQUIRED,
      });
    }

    // ⑤ 공개는 밖으로 나가는 문이다 — 비공개 저장에는 걸리지 않는다(types.publishBlock).
    const publish = publishBlock({
      title: values.title,
      jobFunction: values.jobFunction,
      employmentType: values.employmentType,
      location: values.location,
      closesOn: values.alwaysOpen ? null : values.closesOn.trim(),
      applyMethod: values.applyMethod,
      applyTarget: values.applyTarget,
      description: values.description,
      published: values.published,
    });

    if (publish !== null) {
      ctx.issues.push({
        code: 'custom',
        input: values.applyTarget,
        // 문제가 실제로 있는 칸에 붙인다 — A11Y-13 의 '첫 invalid 로 포커스' 가 여기로 온다
        path: ['applyTarget'],
        message: publish,
      });
    }
  });

export type CareerFormValues = z.infer<typeof careerSchema>;

/** 새 공고의 기준선 — 상시 채용이 아니라 마감일 있는 공고가 기본이다(대부분이 그렇다) */
export const EMPTY_CAREER: CareerFormValues = {
  title: '',
  jobFunction: '',
  employmentType: 'full-time',
  location: '',
  closesOn: '',
  alwaysOpen: false,
  applyMethod: 'email',
  applyTarget: '',
  description: '',
  published: false,
};
