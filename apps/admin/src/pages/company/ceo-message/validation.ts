// CEO 인사말 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../_shared/validation';
import { BODY_MAX_LENGTH, TITLE_MAX_LENGTH } from './types';

export const ceoMessageSchema = z.object({
  title: requiredText('제목', TITLE_MAX_LENGTH),
  body: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '본문을 입력하세요.' }),
    z.refine((value) => value.length <= BODY_MAX_LENGTH, {
      error: `본문은 ${String(BODY_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
  // 사진은 선택 — 업로드 결과(object/data URL)라 형식은 강제하지 않는다.
  photoUrl: z.string(),
});

export type CeoMessageFormValues = z.infer<typeof ceoMessageSchema>;
