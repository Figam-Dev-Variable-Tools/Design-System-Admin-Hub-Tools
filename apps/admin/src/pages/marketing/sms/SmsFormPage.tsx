// SmsFormPage — SMS 발송 등록/수정 (라우트: /marketing/sms/new · /:id/edit) · A41 소유
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(발송정보·수신자·메시지·
// 예약) + 우측 휴대폰 말풍선 미리보기 2단으로 구성한다. 검증(발신번호·바이트·광고요건·야간·과거예약)의
// 정본은 ./validation. **발송 버튼은 실제 전송이 아니다** — 캠페인(초안/예약)을 저장할 뿐이다.
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
import { smsAdapter } from './data-source';
import { smsSchema } from './validation';
import type { SmsFormValues } from './validation';
import { PhoneMessagePreview } from './components/PhoneMessagePreview';
import { SmsMessageCard } from './components/SmsMessageCard';
import { campaignKind, SMS_NAME_MAX } from './types';
import type { SmsCampaign, SmsCampaignInput } from './types';
import { SegmentPicker } from '../_shared/SegmentPicker';
import { listSegments, listSenderNumbers, listSendableTemplates } from '../_shared/store';
import {
  byteLengthOf,
  formatPhone,
  isNightAt,
  sendSubmitLabel,
  totalRecipients,
} from '../_shared/messaging';

const RESOURCE = 'marketing-sms';
const ENTITY_LABEL = 'SMS 발송';
const LIST_PATH = '/marketing/sms';
const UNSAVED_MESSAGE =
  'SMS 발송에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';
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

const previewNoteStyle: CSSProperties = {
  ...hintStyle,
  marginTop: 'var(--tds-space-3)',
};

const EMPTY: SmsFormValues = {
  name: '',
  senderId: '',
  segmentIds: [],
  isAd: false,
  hasImage: false,
  body: '',
  status: 'draft',
  scheduledAt: '',
};

function toInput(values: SmsFormValues): SmsCampaignInput {
  return {
    name: values.name.trim(),
    senderId: values.senderId,
    segmentIds: [...values.segmentIds],
    isAd: values.isAd,
    hasImage: values.hasImage,
    body: values.body.trim(),
    status: values.status,
    scheduledAt: values.status === 'scheduled' ? values.scheduledAt : '',
  };
}

function toValues(campaign: SmsCampaign): SmsFormValues {
  // 발송중/완료/취소는 편집 대상이 아니지만, 조회로 들어오면 편집 가능 상태로 낮춰 안전하게 연다.
  const status =
    campaign.status === 'draft' || campaign.status === 'scheduled' ? campaign.status : 'draft';
  return {
    name: campaign.name,
    senderId: campaign.senderId,
    segmentIds: [...campaign.segmentIds],
    isAd: campaign.isAd,
    hasImage: campaign.hasImage,
    body: campaign.body,
    status,
    scheduledAt: campaign.scheduledAt,
  };
}

export default function SmsFormPage() {
  const navigate = useNavigate();
  const [templatePick, setTemplatePick] = useState(NO_TEMPLATE);

  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<SmsCampaign, SmsCampaignInput, SmsFormValues>({
      resource: RESOURCE,
      adapter: smsAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: smsSchema,
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
  const senders = useMemo(() => listSenderNumbers(), []);
  const templates = useMemo(() => listSendableTemplates('sms'), []);

  const senderId = watch('senderId');
  const segmentIds = watch('segmentIds');
  const isAd = watch('isAd');
  const hasImage = watch('hasImage');
  const body = watch('body');
  const status = watch('status');
  const scheduledAt = watch('scheduledAt');

  const kind = campaignKind(body, hasImage);
  const bytes = byteLengthOf(body);
  const senderNumber = senders.find((sender) => sender.id === senderId)?.number ?? '';
  const recipients = totalRecipients(segments, [...segmentIds]);

  const nightWarning =
    isAd && status === 'scheduled' && scheduledAt !== '' && isNightAt(scheduledAt);

  const applyTemplate = (id: string) => {
    setTemplatePick(id);
    if (id === NO_TEMPLATE) return;
    const picked = templates.find((template) => template.id === id);
    if (picked !== undefined) {
      setValue('body', picked.body, { shouldDirty: true, shouldValidate: true });
    }
  };

  if (isEdit && loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>SMS 발송을 불러오지 못했습니다. </span>
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
        <h1 style={titleStyle}>{isEdit ? 'SMS 발송 수정' : 'SMS 발송 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 저장은 발송 예약일 뿐이며 이 화면에서 문자가 즉시 전송되지
          않습니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>발송 정보</CardTitle>
              <FormField htmlFor="sms-name" label="발송명" required error={errors.name?.message}>
                <input
                  id="sms-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={SMS_NAME_MAX}
                  placeholder="예: 7월 여름세일 안내"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={errors.name !== undefined ? errorIdOf('sms-name') : undefined}
                  {...register('name')}
                />
              </FormField>
              <FormField
                htmlFor="sms-sender"
                label="발신번호"
                required
                error={errors.senderId?.message}
                hint="사전등록(검증)된 번호만 선택할 수 있습니다(전기통신사업법 제84조의2)."
              >
                <SelectField
                  id="sms-sender"
                  disabled={disabled}
                  isInvalid={errors.senderId !== undefined}
                  {...register('senderId')}
                >
                  <option value="">발신번호 선택</option>
                  {senders.map((sender) => (
                    <option key={sender.id} value={sender.id} disabled={!sender.verified}>
                      {`${formatPhone(sender.number)} · ${sender.label}${sender.verified ? '' : ' (미검증)'}`}
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
                  label="광고성 메시지 여부"
                  onLabel="광고성"
                  offLabel="정보성"
                />
                <p style={hintStyle}>
                  광고성이면 본문에 &quot;(광고)&quot; 표기·무료수신거부 안내가 필요하고,
                  야간(21~08시) 발송이 제한됩니다.
                </p>
              </div>
            </Card>

            <SmsMessageCard
              disabled={disabled}
              templates={templates}
              templatePick={templatePick}
              onApplyTemplate={applyTemplate}
              body={body}
              isAd={isAd}
              hasImage={hasImage}
              kind={kind}
              bytes={bytes}
              errors={errors}
              setValue={setValue}
            />

            <Card>
              <CardTitle>발송 예약</CardTitle>
              <div style={rowStyle}>
                <FormField htmlFor="sms-status" label="발송 방식" required>
                  <SelectField id="sms-status" disabled={disabled} {...register('status')}>
                    <option value="draft">초안 저장</option>
                    <option value="scheduled">예약 발송</option>
                  </SelectField>
                </FormField>
                {status === 'scheduled' && (
                  <FormField
                    htmlFor="sms-scheduled"
                    label="예약 일시"
                    required
                    error={errors.scheduledAt?.message}
                  >
                    <input
                      id="sms-scheduled"
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
              {nightWarning && (
                <Alert tone="danger">
                  광고성 메시지는 21시~익일 8시에 예약할 수 없습니다(야간 광고 전송 제한,
                  정보통신망법 제50조 제3항).
                </Alert>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <PhoneMessagePreview
              senderNumber={senderNumber}
              body={body}
              kind={kind}
              hasImage={hasImage}
            />
            <p style={previewNoteStyle}>
              선택 대상 {formatNumber(recipients)}명 · 건당 과금(유형별 단가)은 발송 시 합산됩니다.
              저장은 발송이 아닙니다.
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
