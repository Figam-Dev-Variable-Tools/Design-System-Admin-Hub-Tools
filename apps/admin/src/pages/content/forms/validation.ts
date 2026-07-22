// 폼 관리 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// [필드 배열의 규칙은 여기서 다시 쓰지 않는다] 항목 하나가 성립하는 조건은 types.ts 의
// fieldBlock 이 소유한다 — 편집기의 인라인 오류와 저장 거절이 **같은 함수**를 읽어야 하기
// 때문이다. 이 스키마는 그 함수를 부르고, 첫 번째 문제를 폼 레벨 이슈로 올린다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import {
  FORM_DESCRIPTION_MAX,
  FORM_NAME_MAX,
  formPublishBlock,
  invalidFields,
  parseRecipients,
  recipientsBlock,
} from './types';
import type { FormFieldDef } from './types';

const fieldSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'text',
    'email',
    'number',
    'textarea',
    'select',
    'multi-select',
    'checkbox',
    'radio',
    'file',
    'privacy-consent',
  ]),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()),
  hidden: z.boolean(),
});

export const contentFormSchema = z
  .object({
    name: requiredText('폼 이름', FORM_NAME_MAX),
    description: z.string().check(
      z.refine((value) => value.trim().length <= FORM_DESCRIPTION_MAX, {
        error: `설명은 ${String(FORM_DESCRIPTION_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
    status: z.enum(['draft', 'published']),
    /** 줄바꿈·쉼표로 적는다 — 나누는 규칙의 정본은 types.parseRecipients 다 */
    recipients: z.string(),
    fields: z.array(fieldSchema),
  })
  .check((ctx) => {
    const recipients = parseRecipients(ctx.value.recipients);
    const recipientProblem = recipientsBlock(recipients);
    if (recipientProblem !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.recipients,
        path: ['recipients'],
        message: recipientProblem,
      });
    }

    // 항목 하나하나의 성립 조건 — 규칙은 types.fieldBlock 한 곳에만 있다
    const broken = invalidFields(ctx.value.fields as readonly FormFieldDef[])[0];
    if (broken !== undefined) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.fields,
        path: ['fields'],
        message: `'${broken.field.label === '' ? '이름 없는' : broken.field.label}' 항목 — ${broken.reason}`,
      });
      return;
    }

    // 발행은 밖으로 나가는 문이다 — 초안에는 걸리지 않는다(types.formPublishBlock)
    const publish = formPublishBlock({
      status: ctx.value.status,
      fields: ctx.value.fields as readonly FormFieldDef[],
      recipients,
    });
    if (publish !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.status,
        path: ['status'],
        message: publish,
      });
    }
  });

export type ContentFormValues = z.infer<typeof contentFormSchema>;
