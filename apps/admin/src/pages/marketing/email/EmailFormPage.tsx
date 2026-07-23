// EmailFormPage — 이메일 발송 등록/수정 (라우트: /marketing/email/new · /:id/edit)
//
// SMS 발송과 형제 구조다: 공용 CRUD 프레임워크(useCrudForm) + 입력 카드(발송정보·수신자·본문·예약) +
// 우측 이메일 미리보기 2단. 이메일용 규칙(제목·(광고) 표기·수신거부 링크)을 적용한다. 검증 정본은
// ./validation. **발송 버튼은 실제 전송이 아니다** — 캠페인(초안/예약)을 저장할 뿐이다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  formRowStyle,
  hintStyle,
  Icon,
  pageTitleStyle,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { emailAdapter } from './data-source';
import { emailSchema } from './validation';
import type { EmailFormValues } from './validation';
import { EmailPreview } from '../_shared/EmailPreview';
import { EmailBodyCard } from './components/EmailBodyCard';
import { EMAIL_NAME_MAX, EMAIL_SUBJECT_MAX } from './types';
import type { EmailCampaign, EmailCampaignInput } from './types';
import { SegmentPicker } from '../_shared/SegmentPicker';
import { listSegments, listSenderEmails } from '../_shared/store';
// 발송 화면이 고르는 템플릿은 이제 **메시지 템플릿**(발행 상태 모델)이다 — 레거시 발송 템플릿
// (알림톡 심사 모델)이 아니다. 필터 규칙의 정본은 selectableTemplates 한 곳이다.
import { selectableTemplates } from '../message-templates/store';
import { renderBlocksToPlainText } from '../message-templates/render-html';
import { sendSubmitLabel, totalRecipients } from '../_shared/messaging';
import { cssVar } from '@tds/ui';

const RESOURCE = 'marketing-email';
const ENTITY_LABEL = '이메일 발송';
const LIST_PATH = '/marketing/email';
const UNSAVED_MESSAGE =
  '이메일 발송에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';
const NO_TEMPLATE = '';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const previewNoteStyle: CSSProperties = { ...hintStyle, marginTop: cssVar('space.3') };

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

  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<EmailCampaign, EmailCampaignInput, EmailFormValues>({
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
  const templates = useMemo(() => selectableTemplates('email'), []);

  const senderId = watch('senderId');
  const segmentIds = watch('segmentIds');
  const subject = watch('subject');
  const isAd = watch('isAd');
  const body = watch('body');
  const includeUnsubscribe = watch('includeUnsubscribe');
  const status = watch('status');

  const sender = senders.find((item) => item.id === senderId);
  const recipients = totalRecipients(segments, [...segmentIds]);

  /**
   * 템플릿 적용 — 제목과 본문을 옮긴다.
   *
   * [왜 HTML 이 아니라 평문인가]
   * 이메일 템플릿의 본문은 **블록 목록**이고, 이 폼의 본문 필드는 **평범한 textarea** 다
   * (EmailBodyCard). 예전에는 renderBlocksToHtml 의 결과를 sanitize 해서 그대로 넣었는데,
   * textarea 는 HTML 을 해석하지 않으므로 운영자 화면에 `<h2>이달의 소식</h2>` 이 **글자 그대로**
   * 보였다 — 마크업이 사람에게 노출됐고, 그 상태로 저장하면 수신자에게도 태그가 나간다.
   *
   * 그래서 블록 모델에서 **직접 평문을 만든다**(renderBlocksToPlainText). HTML 을 만들어 놓고
   * 태그를 벗기지 않는 이유는 그쪽 머리말에 적어 두었다 — 버튼의 주소나 이미지의 대체 텍스트처럼
   * 태그 바깥에 있던 뜻이 벗기는 순간 이미 사라져 있기 때문이다.
   *
   * renderBlocksToHtml 은 여전히 '메일로 나갈 때의 모습' 의 정본이다(발송 계층이 쓸 자리).
   * 이 화면이 쓰지 않을 뿐이다.
   */
  const applyTemplate = (id: string) => {
    setTemplatePick(id);
    if (id === NO_TEMPLATE) return;
    const picked = templates.find((template) => template.id === id);
    if (picked === undefined || picked.content.kind !== 'email') return;

    const text = renderBlocksToPlainText(picked.content.blocks);
    setValue('subject', picked.content.subject, { shouldDirty: true, shouldValidate: true });
    setValue('body', text, { shouldDirty: true, shouldValidate: true });
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '이메일 발송을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '이메일 발송을 불러오지 못했어요.'}
            </span>
            {loadFailure === 'error' && (
              <Button variant="secondary" onClick={retryLoad}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
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
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '이메일 발송 수정' : '이메일 발송 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 저장은 발송 예약일 뿐이며 이 화면에서 메일이 즉시 전송되지
          않아요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

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
                hint="광고성 메일은 제목이 '(광고)'로 시작해야 해요."
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
                  aria-describedby={
                    errors.subject !== undefined ? errorIdOf('email-subject') : undefined
                  }
                  {...register('subject')}
                />
              </FormField>
              <FormField
                htmlFor="email-sender"
                label="발신자"
                required
                error={errors.senderId?.message}
                hint="도메인 인증(SPF/DKIM)이 완료된 발신자만 선택할 수 있어요."
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
                <p style={hintStyle}>광고성이면 제목에 &quot;(광고)&quot; 표기가 필요해요.</p>
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
              <div style={formRowStyle}>
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
                      aria-describedby={
                        errors.scheduledAt !== undefined ? errorIdOf('email-scheduled') : undefined
                      }
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
              선택 대상 {formatNumber(recipients)}명 · 오픈율/클릭율은 발송 후 집계돼요. 저장은
              발송이 아니에요.
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

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
