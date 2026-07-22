// 미디어 업로드/수정 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [규칙을 다시 쓰지 않는다] 형식·용량·대체텍스트의 판정은 types.uploadBlock 이 소유한다 —
// 저장소도 같은 함수를 부른다. 이 스키마는 그것을 폼 경계로 옮겨 **첫 번째 문제를 그 입력에**
// 꽂을 뿐이다.
import * as z from 'zod/mini';

import {
  ALT_MAX,
  ALT_REQUIRED,
  ALT_TOO_LONG,
  ALLOWED_EXTENSIONS,
  extensionBlockedMessage,
  extensionOf,
  FILE_NAME_REQUIRED,
  MAX_SIZE_BYTES,
  sizeBlockedMessage,
} from './types';

export const mediaAssetSchema = z
  .object({
    fileName: z.string().check(
      z.refine((value) => value.trim() !== '', { error: FILE_NAME_REQUIRED }),
      z.refine((value) => ALLOWED_EXTENSIONS.includes(extensionOf(value.trim())), {
        error: `허용 형식: ${ALLOWED_EXTENSIONS.join(', ')}`,
      }),
    ),
    /** 숫자 문자열 — 실제 업로드가 없으므로 운영자가 직접 적는다(백엔드가 붙으면 File 이 준다) */
    sizeBytes: z.string(),
    folderId: z.string(),
    tags: z.string(),
    alt: z.string().check(
      z.refine((value) => value.trim() !== '', { error: ALT_REQUIRED }),
      z.refine((value) => value.trim().length <= ALT_MAX, { error: ALT_TOO_LONG }),
    ),
  })
  .check((ctx) => {
    const size = Number(ctx.value.sizeBytes.trim());
    if (!Number.isFinite(size) || size <= 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.sizeBytes,
        path: ['sizeBytes'],
        message: '용량을 바이트 단위 숫자로 입력하세요.',
      });
      return;
    }
    if (size > MAX_SIZE_BYTES) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.sizeBytes,
        path: ['sizeBytes'],
        message: sizeBlockedMessage(size),
      });
    }
    // 확장자는 위에서 이미 걸렀지만, 문구를 '무엇이 문제인지' 로 좁혀 다시 말한다
    const extension = extensionOf(ctx.value.fileName.trim());
    if (extension !== '' && !ALLOWED_EXTENSIONS.includes(extension)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.fileName,
        path: ['fileName'],
        message: extensionBlockedMessage(extension),
      });
    }
  });

export type MediaAssetFormValues = z.infer<typeof mediaAssetSchema>;

/** 쉼표·줄바꿈으로 적은 태그를 목록으로 — 나누는 규칙을 한 곳에만 둔다 */
export function parseTags(raw: string): readonly string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter((value) => value !== ''),
    ),
  ];
}

export function formatTags(tags: readonly string[]): string {
  return tags.join(', ');
}
