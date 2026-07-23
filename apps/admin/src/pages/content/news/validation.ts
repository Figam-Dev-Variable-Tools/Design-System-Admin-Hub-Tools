// 뉴스·보도자료 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [예약 규칙을 다시 쓰지 않는다] 공개 일시가 성립하는 조건은 shared/domain/publish-schedule 이
// 소유한다 — 저장소도 같은 함수로 거절한다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isPublishAtFormat, PUBLISH_AT_INVALID } from '../../../shared/domain/publish-schedule';
import { NEWS_BODY_MAX, NEWS_TITLE_MAX } from './types';

export const newsPostSchema = z
  .object({
    title: requiredText('제목', NEWS_TITLE_MAX),
    categoryId: z.string().check(
      z.refine((value) => value.trim() !== '', {
        error: '분류를 고르세요.',
      }),
    ),
    pinned: z.boolean(),
    status: z.enum(['draft', 'published', 'archived']),
    publishAt: z.string(),
    body: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '본문을 입력하세요.' }),
      z.refine((value) => value.length <= NEWS_BODY_MAX, {
        error: `본문은 ${String(NEWS_BODY_MAX)}자를 넘을 수 없어요.`,
      }),
    ),
  })
  .check((ctx) => {
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
        message: '공개 일시는 발행 상태에서만 지정할 수 있어요.',
      });
    }
  });

export type NewsPostFormValues = z.infer<typeof newsPostSchema>;
