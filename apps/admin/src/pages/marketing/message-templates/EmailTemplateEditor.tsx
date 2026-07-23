// 이메일 템플릿 편집기 — 셸(제목·저장·발행) + EmailBuilder(블록 편집·캔버스 미리보기)
//
// [문자 편집기와 무엇이 같고 무엇이 다른가] 머리(TemplateEditorShell)와 저장 배선(useCrudForm)은
// 같다 — 두 종류의 저장·발행 규칙이 다를 이유가 없기 때문이다. 다른 것은 본문뿐이고, 그 본문은
// 통째로 EmailBuilder 의 것이다(EmailEditorSlot 머리말의 경계 설명).
//
// [본문이 폼 값 하나인 이유] 블록 스택·캔버스 스타일·제목·발신 주소는 EmailBuilder 가 한 덩어리
// (EmailTemplateContent)로 편집한다. 셸이 그것을 필드별로 쪼개 들고 있으면 블록이 한 종류 늘 때마다
// 셸도 함께 고쳐야 한다 — 편집기가 소유한 모양을 셸이 따라 적지 않는다.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, alertActionRowStyle, Button, useUnsavedChangesDialog } from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { EmailEditorSlot } from './EmailEditorSlot';
import { SaveGlyph } from './components/glyphs';
import { ACTION_PUBLISH, ACTION_SAVE_CHANGE, ACTION_SAVE_DRAFT } from './copy';
import {
  MESSAGE_TEMPLATE_LIST_PATH,
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
} from './data-source';
import { DEFAULT_EMAIL_CANVAS, listSenderProfiles } from './store';
import type { MessageTemplateDraft } from './store';
import { publishedStatusOf } from './status';
import { TemplateEditorShell } from './TemplateEditorShell';
import { isPublished, TEMPLATE_KIND_LABEL } from './types';
import type { EmailTemplateContent, MessageTemplate } from './types';
import {
  emailTemplateSchema,
  isEmailTemplatePublishable,
  isEmailTemplateValid,
} from './validation';
import type { EmailTemplateFormValues } from './validation';

const ENTITY_LABEL = '메시지 템플릿';
const UNSAVED_MESSAGE =
  '메시지 템플릿에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const EMPTY_CONTENT: EmailTemplateContent = {
  kind: 'email',
  senderEmail: '',
  subject: '',
  preheader: '',
  blocks: [],
  canvas: DEFAULT_EMAIL_CANVAS,
};

const EMPTY: EmailTemplateFormValues = {
  name: '',
  status: 'draft',
  senderProfileId: '',
  content: EMPTY_CONTENT,
};

function toInput(values: EmailTemplateFormValues): MessageTemplateDraft {
  return {
    name: values.name.trim(),
    status: values.status,
    senderProfileId: values.senderProfileId,
    content: values.content,
  };
}

/**
 * 불러온 템플릿 → 폼 값.
 * 문자 템플릿이 오면(주소를 손으로 고친 경우) 이름만 살리고 빈 본문을 준다 — `as` 로 우기지 않는다.
 */
function toValues(template: MessageTemplate): EmailTemplateFormValues {
  if (template.content.kind !== 'email') return { ...EMPTY, name: template.name };
  return {
    name: template.name,
    status: template.status,
    senderProfileId: template.senderProfileId,
    content: template.content,
  };
}

export default function EmailTemplateEditor() {
  const navigate = useNavigate();
  const profiles = listSenderProfiles();

  const {
    form,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
    loaded,
  } = useCrudForm<MessageTemplate, MessageTemplateDraft, EmailTemplateFormValues>({
    resource: MESSAGE_TEMPLATE_RESOURCE,
    adapter: messageTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: MESSAGE_TEMPLATE_LIST_PATH,
    schema: emailTemplateSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    watch,
    setValue,
    formState: { errors },
  } = form;

  const values = watch();
  const disabled = saving || loadingDetail;
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const valid = useMemo(() => isEmailTemplateValid(values), [values]);
  /**
   * 발행 문턱은 초안 저장보다 높다 — 발송 전 점검(수신거부·CTA 링크·이미지 대체 텍스트)이
   * 여기서만 걸린다. 근거는 validation.ts 의 [발송 전 점검 — 발행할 때만] 머리말.
   */
  const publishable = useMemo(() => isEmailTemplatePublishable(values), [values]);
  /** 발행본을 고치는 중인가 — 근거는 폼 값이 아니라 **서버가 돌려준 원본**이다 */
  const editingPublished = loaded !== undefined && isPublished(loaded.status);

  const actions = editingPublished ? (
    /* 이미 발행된 템플릿을 고치는 중이다 — 저장하면 그대로 발행본이 되므로 발행과 같은 문턱을 쓴다 */
    <Button
      type="submit"
      variant="primary"
      size="md"
      disabled={disabled || !publishable}
      onClick={() => setValue('status', loaded.status)}
    >
      {ACTION_SAVE_CHANGE}
    </Button>
  ) : (
    <>
      <Button
        type="submit"
        variant="secondary"
        size="md"
        disabled={disabled || !valid}
        iconLeft={<SaveGlyph />}
        onClick={() => setValue('status', 'draft')}
      >
        {ACTION_SAVE_DRAFT}
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={disabled || !publishable}
        onClick={() => setValue('status', publishedStatusOf('draft'))}
      >
        {ACTION_PUBLISH}
      </Button>
    </>
  );

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하지 않는다.
  if (loadFailure !== null) {
    return (
      <Alert tone="danger">
        <div style={alertActionRowStyle}>
          <span>
            {loadFailure === 'not-found'
              ? '메시지 템플릿을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
              : '메시지 템플릿을 불러오지 못했어요.'}
          </span>
          {loadFailure === 'error' && (
            <Button variant="secondary" onClick={retryLoad}>
              다시 시도
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(MESSAGE_TEMPLATE_LIST_PATH)}>
            목록으로
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <TemplateEditorShell
        title={values.name}
        onTitleChange={(name) =>
          setValue('name', name, { shouldDirty: true, shouldValidate: true })
        }
        titleError={errors.name?.message}
        {...(editingPublished && { eyebrow: `${TEMPLATE_KIND_LABEL.email} 템플릿` })}
        actions={actions}
        disabled={disabled}
      >
        <FormServerError serverError={serverError} errorReference={errorReference} />

        {/* 본문은 통째로 EmailBuilder 의 것이다 — 셸은 값과 콜백만 내려보낸다 */}
        <EmailEditorSlot
          value={values.content}
          onChange={(content) =>
            setValue('content', content, { shouldDirty: true, shouldValidate: true })
          }
          disabled={disabled}
          senderProfiles={profiles}
          senderProfileId={values.senderProfileId}
          onSenderProfileChange={(id) =>
            setValue('senderProfileId', id, { shouldDirty: true, shouldValidate: true })
          }
        />
      </TemplateEditorShell>

      <FormConflictDialog conflict={conflict} />
      {unsavedDialog}
    </form>
  );
}
