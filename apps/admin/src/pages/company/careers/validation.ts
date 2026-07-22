// 채용 공고 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [여기 없는 것] '지원 방법이 성립하는가' 와 '공개해도 되는가' 는 필드 하나로 판정되지 않는다 —
// 지원 방법에 따라 대상 칸의 뜻이 달라지고, 폼 참조는 **바깥 목록**을 봐야 한다. 그 판정은
// ./types.ts 의 `applyMethodBlock` · `publishBlock` 이 갖는다. 버튼의 disabled 와 저장 거절이
// 같은 술어를 읽어야 하고, 객체 수준 zod 이슈는 필드에 붙지 않아 화면 어디에도 그려지지 않는다.
//
// [마감일] 스키마는 '형식' 까지만 본다. **비어 있어도 통과한다** — 상시 채용이 빈 값으로
// 표현되기 때문이다(폼이 '상시 채용' 체크로 그 뜻을 명시한다 · types.ts 머리말).
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import {
  APPLY_TARGET_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const careerSchema = z.object({
  title: requiredText('공고 제목', TITLE_MAX_LENGTH),
  jobFunction: z
    .string()
    .check(z.refine((value) => value.trim() !== '', { error: '직무를 선택하세요.' })),
  employmentType: z
    .string()
    .check(z.refine((value) => value.trim() !== '', { error: '고용형태를 선택하세요.' })),
  location: requiredText('근무지', LOCATION_MAX_LENGTH),
  /** 상시 채용이면 빈 문자열이다 — 그 뜻은 alwaysOpen 이 갖는다 */
  closesOn: z.string().check(
    z.refine((value) => value.trim() === '' || ISO_DATE_RE.test(value.trim()), {
      error: '마감일 형식이 올바르지 않습니다.',
    }),
  ),
  alwaysOpen: z.boolean(),
  applyMethod: z
    .string()
    .check(z.refine((value) => value.trim() !== '', { error: '지원 방법을 선택하세요.' })),
  applyTarget: z.string().check(
    z.refine((value) => value.trim().length <= APPLY_TARGET_MAX_LENGTH, {
      error: '지원 방법 값이 너무 깁니다.',
    }),
  ),
  description: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '공고 내용을 입력하세요.' }),
    z.refine((value) => value.trim().length <= DESCRIPTION_MAX_LENGTH, {
      error: '공고 내용이 너무 깁니다.',
    }),
  ),
  published: z.boolean(),
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
