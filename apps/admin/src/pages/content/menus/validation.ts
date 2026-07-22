// 메뉴 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [왜 폼 값이 판별 유니온이 아닌가] 폼은 라디오 하나와 입력 셋을 동시에 들고 있다 — 대상을
// 'page' 로 골랐다가 'external' 로 바꿔도 방금 쓴 URL 이 사라지면 안 되기 때문이다. 그래서
// **폼 값은 평면**이고, 저장 직전에 고른 종류에 따라 MenuTarget 으로 접는다(toMenuTarget).
// 유니온의 이점(잘못된 조합을 만들 수 없음)은 도메인 타입이 계속 갖는다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import {
  MENU_LABEL_MAX,
  MENU_PAGE_REQUIRED,
  MENU_URL_FORMAT,
  MENU_URL_MAX,
  MENU_URL_REQUIRED,
} from './types';
import type { BoardId, MenuTarget } from './types';

const HTTP_URL_RE = /^https?:\/\/\S+$/;

export const siteMenuSchema = z
  .object({
    label: requiredText('메뉴 이름', MENU_LABEL_MAX),
    location: z.enum(['header', 'footer', 'mobile']),
    /** '' 이면 1뎁스 — select 의 빈 옵션이 그 뜻이다 */
    parentId: z.string(),
    targetKind: z.enum(['page', 'external', 'board']),
    pageId: z.string(),
    url: z.string(),
    boardId: z.enum(['news', 'notices', 'faq']),
  })
  .check((ctx) => {
    // 고르지 않은 종류의 칸은 비어 있어도 된다 — 지금 고른 것만 본다
    if (ctx.value.targetKind === 'page' && ctx.value.pageId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.pageId,
        path: ['pageId'],
        message: MENU_PAGE_REQUIRED,
      });
      return;
    }
    if (ctx.value.targetKind !== 'external') return;
    const url = ctx.value.url.trim();
    if (url === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.url,
        path: ['url'],
        message: MENU_URL_REQUIRED,
      });
      return;
    }
    if (url.length > MENU_URL_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.url,
        path: ['url'],
        message: `주소는 ${String(MENU_URL_MAX)}자를 넘을 수 없습니다.`,
      });
      return;
    }
    if (!HTTP_URL_RE.test(url)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.url,
        path: ['url'],
        message: MENU_URL_FORMAT,
      });
    }
  });

export type SiteMenuFormValues = z.infer<typeof siteMenuSchema>;

/** 평면 폼 값 → 판별 유니온. 접는 자리를 한 곳으로 모은다(머리말) */
export function toMenuTarget(values: SiteMenuFormValues): MenuTarget {
  switch (values.targetKind) {
    case 'page':
      return { kind: 'page', pageId: values.pageId.trim() };
    case 'external':
      return { kind: 'external', url: values.url.trim() };
    case 'board':
      return { kind: 'board', boardId: values.boardId };
  }
}

/** 판별 유니온 → 평면 폼 값. 고르지 않은 칸은 기본값으로 채운다 */
export function fromMenuTarget(target: MenuTarget): {
  readonly targetKind: MenuTarget['kind'];
  readonly pageId: string;
  readonly url: string;
  readonly boardId: BoardId;
} {
  switch (target.kind) {
    case 'page':
      return { targetKind: 'page', pageId: target.pageId, url: '', boardId: 'news' };
    case 'external':
      return { targetKind: 'external', pageId: '', url: target.url, boardId: 'news' };
    case 'board':
      return { targetKind: 'board', pageId: '', url: '', boardId: target.boardId };
  }
}
