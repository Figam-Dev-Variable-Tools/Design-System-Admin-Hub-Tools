// API Key 발급 폼 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../_shared/validation';
import { API_KEY_NAME_MAX, API_KEY_SCOPES } from './types';

export const apiKeyDraftSchema = z
  .object({
    name: requiredText(API_KEY_NAME_MAX, {
      missing: '키 이름을 입력하세요.',
      tooLong: `키 이름은 ${String(API_KEY_NAME_MAX)}자를 넘을 수 없습니다.`,
    }),
    scopes: z.array(z.enum(API_KEY_SCOPES)),
  })
  .check((ctx) => {
    // 스코프 없는 키는 아무것도 못 한다 — 만들 수 있게 두면 '왜 401 이 나지' 로 돌아온다
    if (ctx.value.scopes.length === 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.scopes,
        path: ['scopes'],
        message: '스코프를 하나 이상 선택하세요.',
      });
    }
  });

export type ApiKeyDraftValues = z.infer<typeof apiKeyDraftSchema>;

/**
 * 이름 중복 검사 — 스키마 밖에 있는 이유는 **기존 목록**이 있어야 판정할 수 있기 때문이다
 * (zod 스키마는 값 하나만 본다). 이름은 키를 알아보는 유일한 단서라 중복은 실질적 사고다.
 */
export function duplicateNameError(name: string, existingNames: readonly string[]): string | null {
  const key = name.trim().toLocaleLowerCase();
  if (key === '') return null;
  const duplicated = existingNames.some((item) => item.trim().toLocaleLowerCase() === key);
  return duplicated ? '이미 같은 이름의 키가 있습니다.' : null;
}
