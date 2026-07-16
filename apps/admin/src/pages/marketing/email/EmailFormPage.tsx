// EmailFormPage — 이메일 발송 등록/수정 (라우트: /marketing/email/new · /:id/edit) · A41 소유
//
// SMS 발송과 형제 구조다: 공용 CRUD 프레임워크(useCrudForm) + 입력 카드(발송정보·수신자·본문·예약) +
// 우측 이메일 미리보기 2단. 이메일용 규칙(제목·(광고) 표기·수신거부 링크)을 적용한다. 검증 정본은
// ./validation. **발송 버튼은 실제 전송이 아니다** — 캠페인(초안/예약)을 저장할 뿐이다.
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
  fieldLabelStyle,
  fieldStyle,
  FormField,
  hintStyle,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { useCrudForm } from '../../../shared/crud';
import { emailAdapter } from './data-source';
import { emailSchema } from './validation';
import type { EmailFormValues } from './validation';
import { EmailPreview } from '../_shared/EmailPreview';
import { EmailBodyCard } from './components/EmailBodyCard';
import { EMAIL_NAME_MAX, EMAIL_SUBJECT_MAX } from './types';
import type { EmailCampaign, EmailCampaignInput } from './types';
import { SegmentPicker } from '../_shared/SegmentPicker';
import { listSegments, listSenderEmails, listSendableTemplates } from '../_shared/store';
import { sendSubmitLabel, totalRecipients } from '../_shared/messaging';

const RESOURCE = 'marketing-email';
const ENTITY_LABEL = '이메일 발송';
const LIST_PATH = '/marketing/email';
const UNSAVED_MESSAGE =
  '이메일 발송에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';
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

const EMPTY: EmailFormValues = {
  name: '',
  subject: '',
  senderId: '',
  segmentIds: [],
  isAd: false,
  body: '',
  includeUnsubscribe: true,
  status: 'draft',
  scheduledAt: '',
};

function toInput(values: EmailFormValues): EmailCampaignInput {
  return {
    name: values.name.trim(),
    subject: values.subject.trim(),
    senderId: values.senderId,
    segmentIds: [...values.segmentIds],
    isAd: values.isAd,
    body: values.body.trim(),
    includeUnsubscribe: values.includeUnsubscribe,
    status: values.status,
    scheduledAt: values.status === 'scheduled' ? values.scheduledAt : '',
  };
}

function toValues(campaign: EmailCampaign): EmailFormValues {
  const status =
    campaign.status === 'draft' || campaign.status === 'scheduled' ? campaign.status : 'draft';
  return {
    name: campaign.name,
    subject: campaign.subject,
    senderId: campaign.senderId,
    segmentIds: [...campaign.segmentIds],
    isAd: campaign.isAd,
    body: campaign.body,
    includeUnsubscribe: campaign.includeUnsubscribe,
    status,
    scheduledAt: campaign.scheduledAt,
  };
}

export default function EmailFormPage() {
  const navigate = useNavigate();
  const [templatePick, setTemplatePick] = useState(NO_TEMPLATE);

  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<EmailCampaign, EmailCampaignInput, EmailFormValues>({
      resource: RESOURCE,
      adapter: emailAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: emailSchema,
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
  const subject = watch('subject');
  const isAd = watch('isAd');
  const body = watch('body');
  const includeUnsubscribe = watch('includeUnsubscribe');
  const status = watch('status');

  const sender = senders.find((item) => item.id === senderId);
  const recipients = totalRecipients(segments, [...segmentIds]);

  const applyTemplate = (id: string) => {
    setTemplatePick(id);
    if (id === NO_TEMPLATE) return;
    const picked = templates.find((template) => template.id === id);
    if (picked !== undefined) {
      setValue('subject', picked.title, { shouldDirty: true, shouldValidate: true });
      setValue('body', picked.body, { shouldDirty: true, shouldValidate: true });
    }
  };

  if (isEdit && loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>이메일 발송을 불러오지 못했습니다. </span>
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
        <h1 style={titleStyle}>{isEdit ? '이메일 발송 수정' : '이메일 발송 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 저장은 발송 예약일 뿐이며 이 화면에서 메일이 즉시 전송되지
          않습니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>발송 정보</CardTitle>
              <FormField htmlFor="email-name" label="발송명" required error={errors.name?.message}>
                <input
                  id="email-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={EMAIL_NAME_MAX}
                  placeholder="예: 7월 뉴스레터 발송"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={errors.name !== undefined ? errorIdOf('email-name') : undefined}
                  {...register('name')}
                />
              </FormField>
              <FormField
                htmlFor="email-subject"
                label="제목"
                required
                error={errors.subject?.message}
                hint="광고성 메일은 제목이 '(광고)'로 시작해야 합니다."
              >
                <input
                  id="email-subject"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.subject !== undefined)}
                  maxLength={EMAIL_SUBJECT_MAX}
                  placeholder="예: [스페이스플래닝] 7월의 새로운 소식"
                  disabled={disabled}
                  aria-invalid={errors.subject !== undefined}
                  {...register('subject')}
                />
              </FormField>
              <FormField
                htmlFor="email-sender"
                label="발신자"
                required
                error={errors.senderId?.message}
                hint="도메인 인증(SPF/DKIM)이 완료된 발신자만 선택할 수 있습니다."
              >
                <SelectField
                  id="email-sender"
                  disabled={disabled}
                  isInvalid={errors.senderId !== undefined}
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
              <CardTitle>수신자</CardTitle>
              <SegmentPicker
                label="수신자 세그먼트"
                required
                segments={segments}
                selectedIds={segmentIds}
                onChange={(ids) =>
                  setValue('segmentIds', [...ids], { shouldDirty: true, shouldValidate: true })
                }
                disabled={disabled}
                error={errors.segmentIds?.message}
              />
              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>광고성 여부</span>
                <ToggleSwitch
                  checked={isAd}
                  onChange={(next) =>
                    setValue('isAd', next, { shouldDirty: true, shouldValidate: true })
                  }
                  disabled={disabled}
                  label="광고성 메일 여부"
                  onLabel="광고성"
                  offLabel="정보성"
                />
                <p style={hintStyle}>광고성이면 제목에 &quot;(광고)&quot; 표기가 필요합니다.</p>
              </div>
            </Card>

            <EmailBodyCard
              disabled={disabled}
              templates={templates}
              templatePick={templatePick}
              onApplyTemplate={applyTemplate}
              body={body}
              subject={subject}
              isAd={isAd}
              includeUnsubscribe={includeUnsubscribe}
              errors={errors}
              setValue={setValue}
            />

            <Card>
              <CardTitle>발송 예약</CardTitle>
              <div style={rowStyle}>
                <FormField htmlFor="email-status" label="발송 방식" required>
                  <SelectField id="email-status" disabled={disabled} {...register('status')}>
                    <option value="draft">초안 저장</option>
                    <option value="scheduled">예약 발송</option>
                  </SelectField>
                </FormField>
                {status === 'scheduled' && (
                  <FormField
                    htmlFor="email-scheduled"
                    label="예약 일시"
                    required
                    error={errors.scheduledAt?.message}
                  >
                    <input
                      id="email-scheduled"
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
              subject={subject}
              senderName={sender?.name ?? ''}
              senderEmail={sender?.email ?? ''}
              body={body}
              includeUnsubscribe={includeUnsubscribe}
            />
            <p style={previewNoteStyle}>
              선택 대상 {formatNumber(recipients)}명 · 오픈율/클릭율은 발송 후 집계됩니다. 저장은
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
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {sendSubmitLabel(saving, status)}
          </Button>
        </div>
      </form>

      {unsavedDialog}
    </div>
  );
}
