// NewsletterFormPage — 뉴스레터 등록/수정 (라우트: /marketing/newsletters/new · /:id/edit) · A41 소유
//
// 공용 CRUD 프레임워크(useCrudForm) + 입력 카드(발송정보·구독자·본문·예약) + 우측 이메일 미리보기 2단.
// 구독형이라 수신거부 링크는 항상 포함한다. 검증 정본은 ./validation. **발송 버튼은 실제 전송이 아니다.**
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  SelectField,
  TextareaField,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { useCrudForm } from '../../../shared/crud';
import { newsletterAdapter } from './data-source';
import { newsletterSchema } from './validation';
import type { NewsletterFormValues } from './validation';
import { NEWSLETTER_BODY_MAX, NEWSLETTER_TITLE_MAX } from './types';
import type { NewsletterIssue, NewsletterIssueInput } from './types';
import { SegmentPicker } from '../_shared/SegmentPicker';
import { VariableInsertBar } from '../_shared/VariableInsertBar';
import { EmailPreview } from '../_shared/EmailPreview';
import { listSegments, listSenderEmails, listSendableTemplates } from '../_shared/store';
import { totalRecipients } from '../_shared/messaging';

const RESOURCE = 'marketing-newsletters';
const ENTITY_LABEL = '뉴스레터';
const LIST_PATH = '/marketing/newsletters';
const UNSAVED_MESSAGE =
  '뉴스레터에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';
const NO_TEMPLATE = '';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const previewNoteStyle: CSSProperties = { ...hintStyle, marginTop: 'var(--tds-space-3)' };

const EMPTY: NewsletterFormValues = {
  title: '',
  senderId: 'from-news',
  segmentIds: ['seg-newsletter'],
  body: '',
  status: 'draft',
  scheduledAt: '',
};

function toInput(values: NewsletterFormValues): NewsletterIssueInput {
  return {
    title: values.title.trim(),
    senderId: values.senderId,
    segmentIds: [...values.segmentIds],
    body: values.body.trim(),
    status: values.status,
    scheduledAt: values.status === 'scheduled' ? values.scheduledAt : '',
  };
}

function toValues(issue: NewsletterIssue): NewsletterFormValues {
  const status = issue.status === 'draft' || issue.status === 'scheduled' ? issue.status : 'draft';
  return {
    title: issue.title,
    senderId: issue.senderId,
    segmentIds: [...issue.segmentIds],
    body: issue.body,
    status,
    scheduledAt: issue.scheduledAt,
  };
}

export default function NewsletterFormPage() {
  const navigate = useNavigate();
  const [templatePick, setTemplatePick] = useState(NO_TEMPLATE);

  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<NewsletterIssue, NewsletterIssueInput, NewsletterFormValues>({
      resource: RESOURCE,
      adapter: newsletterAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: newsletterSchema,
      empty: EMPTY,
      toInput,
      toValues,
    });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const segments = useMemo(() => listSegments(), []);
  const senders = useMemo(() => listSenderEmails(), []);
  const templates = useMemo(() => listSendableTemplates('email'), []);

  const senderId = watch('senderId');
  const segmentIds = watch('segmentIds');
  const title = watch('title');
  const body = watch('body');
  const status = watch('status');

  const sender = senders.find((item) => item.id === senderId);
  const recipients = totalRecipients(segments, [...segmentIds]);

  const insertVariable = (token: string) =>
    setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true });

  const applyTemplate = (id: string) => {
    setTemplatePick(id);
    if (id === NO_TEMPLATE) return;
    const picked = templates.find((template) => template.id === id);
    if (picked !== undefined) {
      if (title.trim() === '')
        setValue('title', picked.title, { shouldDirty: true, shouldValidate: true });
      setValue('body', picked.body, { shouldDirty: true, shouldValidate: true });
    }
  };

  if (isEdit && loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>뉴스레터를 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={titleStyle}>{isEdit ? '뉴스레터 수정' : '뉴스레터 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 회차번호는 저장 시 자동 부여되며, 수신거부 링크는 항상
          포함됩니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>발송 정보</CardTitle>
              <FormField htmlFor="nl-title" label="제목" required error={errors.title?.message}>
                <input
                  id="nl-title"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.title !== undefined)}
                  maxLength={NEWSLETTER_TITLE_MAX}
                  placeholder="예: 스페이스플래닝 7월 뉴스레터"
                  disabled={disabled}
                  aria-invalid={errors.title !== undefined}
                  aria-describedby={errors.title !== undefined ? errorIdOf('nl-title') : undefined}
                  {...register('title')}
                />
              </FormField>
              <FormField
                htmlFor="nl-sender"
                label="발신자"
                required
                error={errors.senderId?.message}
              >
                <SelectField
                  id="nl-sender"
                  disabled={disabled}
                  invalid={errors.senderId !== undefined}
                  {...register('senderId')}
                >
                  <option value="">발신자 선택</option>
                  {senders.map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.verified}>
                      {`${item.name} <${item.email}>${item.verified ? '' : ' (미검증)'}`}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </Card>

            <Card>
              <CardTitle>구독자</CardTitle>
              <SegmentPicker
                label="구독자 세그먼트"
                required
                segments={segments}
                selectedIds={segmentIds}
                onChange={(ids) =>
                  setValue('segmentIds', [...ids], { shouldDirty: true, shouldValidate: true })
                }
                disabled={disabled}
                error={errors.segmentIds?.message}
              />
            </Card>

            <Card>
              <CardTitle>본문</CardTitle>
              {templates.length > 0 && (
                <FormField
                  htmlFor="nl-template"
                  label="템플릿 불러오기"
                  hint="이메일 템플릿의 제목·본문을 채웁니다."
                >
                  <SelectField
                    id="nl-template"
                    disabled={disabled}
                    value={templatePick}
                    onChange={(event) => applyTemplate(event.target.value)}
                  >
                    <option value={NO_TEMPLATE}>템플릿 선택 안 함</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              )}
              <TextareaField
                label="본문"
                required
                value={body}
                onChange={(value) =>
                  setValue('body', value, { shouldDirty: true, shouldValidate: true })
                }
                maxLength={NEWSLETTER_BODY_MAX}
                disabled={disabled}
                error={errors.body?.message}
                placeholder="뉴스레터 본문을 입력하세요. #{이름} 등 치환변수를 넣을 수 있습니다."
                rows={6}
              />
              <VariableInsertBar onInsert={insertVariable} disabled={disabled} />
            </Card>

            <Card>
              <CardTitle>발송 예약</CardTitle>
              <div style={rowStyle}>
                <FormField htmlFor="nl-status" label="발송 방식" required>
                  <SelectField id="nl-status" disabled={disabled} {...register('status')}>
                    <option value="draft">초안 저장</option>
                    <option value="scheduled">예약 발송</option>
                  </SelectField>
                </FormField>
                {status === 'scheduled' && (
                  <FormField
                    htmlFor="nl-scheduled"
                    label="예약 일시"
                    required
                    error={errors.scheduledAt?.message}
                  >
                    <input
                      id="nl-scheduled"
                      type="datetime-local"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.scheduledAt !== undefined)}
                      disabled={disabled}
                      aria-invalid={errors.scheduledAt !== undefined}
                      {...register('scheduledAt')}
                    />
                  </FormField>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <EmailPreview
              subject={title}
              senderName={sender?.name ?? ''}
              senderEmail={sender?.email ?? ''}
              body={body}
              includeUnsubscribe
            />
            <p style={previewNoteStyle}>
              구독자 {formatNumber(recipients)}명 · 오픈율/클릭율은 발송 후 집계됩니다. 저장은
              발송이 아닙니다.
            </p>
          </Card>
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={saving || loadingDetail}>
            {saving ? '저장 중…' : status === 'scheduled' ? '예약 저장' : '초안 저장'}
          </Button>
        </div>
      </form>

      {unsavedDialog}
    </div>
  );
}
