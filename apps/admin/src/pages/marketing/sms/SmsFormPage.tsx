// SmsFormPage — SMS 발송 등록/수정 (라우트: /marketing/sms/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(발송정보·수신자·메시지·
// 예약) + 우측 휴대폰 말풍선 미리보기 2단으로 구성한다. 검증(발신번호·바이트·광고요건·야간·과거예약)의
// 정본은 ./validation. **발송 버튼은 실제 전송이 아니다** — 캠페인(초안/예약)을 저장할 뿐이다.
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
  hintStyle,
  Icon,
  pageTitleStyle,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { smsAdapter } from './data-source';
import { smsSchema } from './validation';
import type { SmsFormValues } from './validation';
import { PhoneMessagePreview } from './components/PhoneMessagePreview';
import { SmsMessageCard } from './components/SmsMessageCard';
import { campaignKind, SMS_NAME_MAX } from './types';
import type { SmsCampaign, SmsCampaignInput } from './types';
import { SegmentPicker } from '../_shared/SegmentPicker';
import { listSegments, listSenderNumbers } from '../_shared/store';
// 발송 화면이 고르는 템플릿은 이제 **메시지 템플릿**(발행 상태 모델)이다 — 레거시 발송 템플릿
// (알림톡 심사 모델)이 아니다. 필터 규칙의 정본은 selectableTemplates 한 곳이다.
import { selectableTemplates } from '../message-templates/store';
import {
  byteLengthOf,
  formatPhone,
  isNightAt,
  messagingNameOf,
  sendSubmitLabel,
  totalRecipients,
  withMessagingName,
} from '../_shared/messaging';
import { cssVar } from '@tds/ui';

const RESOURCE = 'marketing-sms';
const ENTITY_LABEL = 'SMS 발송';
const LIST_PATH = '/marketing/sms';
const UNSAVED_MESSAGE =
  'SMS 발송에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';
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

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.4'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const previewNoteStyle: CSSProperties = {
  ...hintStyle,
  marginTop: cssVar('space.3'),
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
  } = useCrudForm<SmsCampaign, SmsCampaignInput, SmsFormValues>({
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
  const templates = useMemo(() => selectableTemplates('text'), []);

  const senderId = watch('senderId');
  const segmentIds = watch('segmentIds');
  const isAd = watch('isAd');
  const hasImage = watch('hasImage');
  const body = watch('body');
  const status = watch('status');
  const scheduledAt = watch('scheduledAt');

  /**
   * **실제로 나가는 본문** — 운영자가 쓴 본문 앞에 발신 표시 이름이 붙은 것이다.
   *
   * [왜 여기서 한 번만 계산하나] 이 값이 유형 판정(SMS/LMS)·바이트 안내·미리보기 셋의 기준이다.
   * 세 곳이 각자 접두를 붙이면 하나만 고쳐진 채 나머지가 남고, 화면이 말하는 등급과 실제로
   * 과금되는 등급이 갈린다. 접두는 공짜가 아니다 — 이름이 20자면 40byte 를 먹고, 그만큼
   * 90byte 경계가 앞당겨진다(설정 화면이 이 이름만 바이트로 세는 이유가 그것이다).
   *
   * [저장값은 접두를 갖지 않는다] toInput 은 그대로 `values.body` 를 보낸다 — 접두는 발송 시점에
   * 설정에서 붙는 것이라, 저장해 두면 나중에 사이트 이름을 바꿔도 옛 이름이 초안에 박혀 남는다.
   */
  const messagingName = messagingNameOf();
  const sendBody = withMessagingName(body);

  const kind = campaignKind(sendBody, hasImage);
  const bytes = byteLengthOf(sendBody);
  const senderNumber = senders.find((sender) => sender.id === senderId)?.number ?? '';
  const recipients = totalRecipients(segments, [...segmentIds]);

  const nightWarning =
    isAd && status === 'scheduled' && scheduledAt !== '' && isNightAt(scheduledAt);

  /**
   * 템플릿 적용 — 본문과 **이미지 첨부 여부**를 함께 옮긴다.
   *
   * [왜 이미지 플래그까지인가] 이미지가 붙은 템플릿은 MMS 로 나간다(classifySms). 본문만 옮기면
   * 화면은 SMS 로 보이는데 템플릿의 의도는 MMS 라, 운영자가 첨부를 다시 켤 때까지 바이트 안내와
   * 예상 비용이 전부 틀린 값을 가리킨다.
   *
   * setValue 를 지나므로 dirty·검증이 정상으로 따라온다(폼 상태를 우회해 직접 쓰지 않는다).
   */
  const applyTemplate = (id: string) => {
    setTemplatePick(id);
    if (id === NO_TEMPLATE) return;
    const picked = templates.find((template) => template.id === id);
    if (picked === undefined || picked.content.kind !== 'text') return;

    setValue('body', picked.content.body, { shouldDirty: true, shouldValidate: true });
    setValue('hasImage', picked.content.imageFileName.trim() !== '', {
      shouldDirty: true,
      shouldValidate: true,
    });
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
                ? 'SMS 발송을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : 'SMS 발송을 불러오지 못했습니다.'}
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
        <h1 style={pageTitleStyle}>{isEdit ? 'SMS 발송 수정' : 'SMS 발송 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 저장은 발송 예약일 뿐이며 이 화면에서 문자가 즉시 전송되지
          않습니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

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
              messagingName={messagingName}
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
                      aria-describedby={
                        errors.scheduledAt !== undefined ? errorIdOf('sms-scheduled') : undefined
                      }
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
            {/* 미리보기가 받는 것은 입력칸의 글이 아니라 **발송 본문**이다 — 접두가 붙은 채로 보인다 */}
            <PhoneMessagePreview
              senderNumber={senderNumber}
              body={sendBody}
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

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
