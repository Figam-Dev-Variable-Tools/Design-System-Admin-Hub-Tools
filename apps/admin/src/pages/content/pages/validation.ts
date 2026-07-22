// 페이지 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [무엇을 여기서 보지 않는가] **다른 페이지와의 슬러그 충돌**은 이 스키마가 판정할 수 없다 —
// 폼은 자기 입력만 알기 때문이다. 그 판정은 저장 경로(data-source.assertSlugFree)가 하고,
// 422 로 되돌아와 슬러그 칸에 인라인으로 꽂힌다 (EXC-07). 형식·예약어처럼 **혼자 판단할 수
// 있는 것만** 여기서 본다 — 규칙을 두 곳에 반씩 나눈 것이 아니라, 아는 자가 판단하는 것이다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { PUBLISH_AT_INVALID, isPublishAtFormat } from '../../../shared/domain/publish-schedule';
import {
  BODY_MAX_LENGTH,
  RESERVED_SLUGS,
  SLUG_FORMAT,
  SLUG_MAX_LENGTH,
  SLUG_REQUIRED,
  SLUG_RESERVED,
  SLUG_TOO_LONG,
  TITLE_MAX_LENGTH,
} from './types';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 체크 순서 = 에러 우선순위 (resolver 가 필드당 첫 이슈만 싣는다) */
export const sitePageSchema = z
  .object({
    title: requiredText('제목', TITLE_MAX_LENGTH),
    slug: z.string().check(
      z.refine((value) => value.trim() !== '', { error: SLUG_REQUIRED }),
      z.refine((value) => value.trim().length <= SLUG_MAX_LENGTH, { error: SLUG_TOO_LONG }),
      z.refine((value) => SLUG_RE.test(value.trim()), { error: SLUG_FORMAT }),
      z.refine((value) => !RESERVED_SLUGS.includes(value.trim()), { error: SLUG_RESERVED }),
    ),
    status: z.enum(['draft', 'published', 'archived']),
    publishAt: z.string(),
    body: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '본문을 입력하세요.' }),
      z.refine((value) => value.length <= BODY_MAX_LENGTH, {
        error: `본문은 ${String(BODY_MAX_LENGTH)}자를 넘을 수 없습니다.`,
      }),
    ),
  })
  .check((ctx) => {
    // 예약 규칙의 정본은 shared/domain/publish-schedule 이다 — 여기서 다시 쓰지 않고 그것을 부른다.
    const raw = ctx.value.publishAt.trim();
    if (raw === '') return;
    if (!isPublishAtFormat(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.publishAt,
        path: ['publishAt'],
        message: PUBLISH_AT_INVALID,
      });
      return;
    }
    if (ctx.value.status !== 'published') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.publishAt,
        path: ['publishAt'],
        message: '공개 일시는 발행 상태에서만 지정할 수 있습니다.',
      });
    }
  });

export type SitePageFormValues = z.infer<typeof sitePageSchema>;
