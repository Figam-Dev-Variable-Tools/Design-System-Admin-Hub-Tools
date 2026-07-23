// 자료실 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { TITLE_MAX, VERSION_MAX } from './types';

export const downloadSchema = z.object({
  title: requiredText('제목', TITLE_MAX),
  categoryLabel: requiredText('카테고리', 30),
  version: z.string().check(
    z.refine((value) => value.trim().length <= VERSION_MAX, {
      error: `버전은 ${String(VERSION_MAX)}자를 넘을 수 없어요.`,
    }),
  ),
  visible: z.boolean(),
  // 파일은 업로드 필드가 채운다 — 파일명이 비면 미첨부(등록 시 필수). 종류(fileKind)는 파일명에서 파생한다.
  fileName: requiredText('첨부 파일', 260),
  fileSize: z.number(),
});

export type DownloadFormValues = z.infer<typeof downloadSchema>;
