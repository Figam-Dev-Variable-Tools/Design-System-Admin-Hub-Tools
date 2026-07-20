// TemplateFormPage — 알림톡 템플릿 등록/수정 (라우트: /marketing/templates/alimtalk/new · /:id/edit)
//
// ⚠ [알림톡/브랜드메시지 재구축 대기 중 — 사이드바에 없다]
// /marketing/templates 는 이제 **메시지 템플릿(이메일·문자)** 화면이다. 이 폼이 지워지지 않고 남은
// 이유는 새 모델이 아직 덮지 못하는 것을 들고 있기 때문이다: 카카오 사전 심사 상태, 승인/검수중
// 템플릿의 **내용 잠금**(isTemplateContentLocked), 반려 사유, 그리고 잠긴 문구를 고치는 유일한 길인
// '복제해서 새로 만들기'. 알림톡이 세 번째 종류로 다시 들어올 때 이 규칙들을 그쪽으로 옮긴다
// (TemplateListPage 머리말 · App.tsx 의 /marketing/templates 블록 주석 참고).
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(기본 정보·본문·
// 카카오 심사) + 우측 미리보기 카드 2단으로 구성한다(SMS 발송 폼과 같은 결). 채널(SMS/이메일/알림톡)에
// 따라 필드가 갈린다: 이메일/알림톡은 제목, 이메일은 HTML 본문, 알림톡은 승인상태·반려사유.
import { useEffect, useRef } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { cssVar, ensureRichText } from '@tds/ui';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  Icon,
  pageTitleStyle,
  RichTextField,
  SelectField,
  StatusBadge,
  TextareaField,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { templateAdapter, TEMPLATE_RESOURCE } from './data-source';
import { templateSchema } from './validation';
import type { TemplateFormValues } from './validation';
import { TemplatePreview } from './components/TemplatePreview';
import { VariableInsertBar } from '../_shared/VariableInsertBar';
import {
  APPROVAL_STATUS_OPTIONS,
  byteLengthOf,
  classifySms,
  convertBodyForChannel,
  isTemplateContentLocked,
  MESSAGE_CHANNEL_OPTIONS,
  requiresApproval,
  smsByteLimit,
  smsKindLabel,
  TEMPLATE_BODY_MAX,
  TEMPLATE_NAME_MAX,
  TEMPLATE_TITLE_MAX,
  usesTitle,
} from '../_shared/messaging';
import type { MessageChannel, MessageTemplate, MessageTemplateInput } from '../_shared/messaging';

const ENTITY_LABEL = '발송 템플릿';
const LIST_PATH = '/marketing/templates/alimtalk';
const NEW_PATH = '/marketing/templates/alimtalk/new';

/**
 * 복제 값을 등록 화면으로 넘기는 라우터 state 의 키.
 *
 * 쿼리스트링이 아니라 state 로 넘긴다 — 본문은 2000자까지 가고 치환변수·줄바꿈이 섞인다. URL 에
 * 실으면 길이 상한에 걸리고, 무엇보다 **주소창에 남아** 새로고침·공유 때 다시 복제가 된다.
 */
const DUPLICATE_KEY = 'duplicateFrom';
const UNSAVED_MESSAGE =
  '발송 템플릿에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const EMPTY: TemplateFormValues = {
  name: '',
  channel: 'sms',
  title: '',
  body: '',
  approvalStatus: 'draft',
  rejectReason: '',
};

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
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
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
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

/** 입력(좌) · 미리보기(우) 2단 — 좁은 화면에서는 자동으로 한 단으로 접힌다 */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: cssVar('space.5'),
  alignItems: 'start',
};

/** 좌측 입력 열 — 카드들을 세로로 쌓는다 */
const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/** 우측 미리보기 카드 — 스크롤해도 따라오도록 sticky */
const previewColStyle: CSSProperties = {
  position: 'sticky',
  top: cssVar('space.4'),
  minWidth: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const byteHintStyle: CSSProperties = { ...hintStyle };

function toInput(values: TemplateFormValues): MessageTemplateInput {
  return {
    name: values.name.trim(),
    channel: values.channel,
    title: usesTitle(values.channel) ? values.title.trim() : '',
    body: values.body.trim(),
    approvalStatus: values.approvalStatus,
    rejectReason: values.approvalStatus === 'rejected' ? values.rejectReason.trim() : '',
  };
}

/**
 * 라우터 state 에서 복제 값을 꺼낸다 — 없거나 모양이 다르면 null.
 *
 * state 는 `unknown` 이다. 사용자가 주소를 직접 치거나 오래된 탭이 되살아나면 우리가 넣지 않은
 * 값이 올 수 있으므로, 필드가 전부 문자열인지 확인한 뒤에만 폼에 넣는다.
 */
function readDuplicateState(state: unknown): TemplateFormValues | null {
  if (typeof state !== 'object' || state === null) return null;
  const raw: unknown = (state as Record<string, unknown>)[DUPLICATE_KEY];
  if (typeof raw !== 'object' || raw === null) return null;

  const candidate = raw as Record<string, unknown>;
  const keys = ['name', 'channel', 'title', 'body', 'approvalStatus', 'rejectReason'] as const;
  if (!keys.every((key) => typeof candidate[key] === 'string')) return null;

  const parsed = templateSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function toValues(template: MessageTemplate): TemplateFormValues {
  return {
    name: template.name,
    channel: template.channel,
    title: template.title,
    body: template.body,
    approvalStatus: template.approvalStatus,
    rejectReason: template.rejectReason,
  };
}

export default function TemplateFormPage() {
  const navigate = useNavigate();

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
    loaded,
  } = useCrudForm<MessageTemplate, MessageTemplateInput, TemplateFormValues>({
    resource: TEMPLATE_RESOURCE,
    adapter: templateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: templateSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;

  /**
   * 복제 진입 — 잠긴 템플릿의 '복제해서 새로 만들기' 가 보낸 값으로 등록 폼을 채운다.
   *
   * [왜 한 번만 채우나] state 는 뒤로 가기·새로고침에도 남는다. 매 렌더 reset 하면 사용자가 고친
   * 입력을 계속 덮어써 타이핑이 되지 않는다. 소비했는지를 ref 로 기억해 첫 도착에만 반응한다.
   */
  const { state: navState } = useLocation();
  const duplicateSource = readDuplicateState(navState);
  const duplicateAppliedRef = useRef(false);

  useEffect(() => {
    if (duplicateSource === null || duplicateAppliedRef.current) return;
    duplicateAppliedRef.current = true;
    // dirty 로 표시한다 — 복제본은 '아직 저장되지 않은 편집' 이므로 이탈 경고가 떠야 한다
    reset(duplicateSource, { keepDefaultValues: true });
  }, [duplicateSource, reset]);
  const disabled = saving || loadingDetail;
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const channel = watch('channel');
  const body = watch('body');
  const title = watch('title');
  const approvalStatus = watch('approvalStatus');

  /**
   * 심사에 걸린 내용은 잠근다 — 근거는 **서버가 돌려준 원본**이다(폼 값이 아니다).
   * 폼 값으로 판단하면 승인상태를 '초안' 으로 되돌리는 것만으로 잠금이 풀린다.
   */
  const locked =
    loaded !== undefined && isTemplateContentLocked(loaded.channel, loaded.approvalStatus);
  /** 내용 입력의 최종 비활성 — 저장 중·로딩 중이거나, 심사에 걸려 잠긴 경우 */
  const contentDisabled = disabled || locked;

  /** 잠긴 템플릿을 고치는 유일한 길 — 내용을 들고 등록 화면으로 간다(새로 심사받는다) */
  const duplicate = () => {
    if (loaded === undefined) return;
    navigate(NEW_PATH, {
      state: {
        // 이름은 그대로 두면 목록에서 둘을 구분할 수 없다. 승인 이력은 따라오지 않는다 —
        // 복제본은 아직 심사를 받지 않은 새 템플릿이다.
        [DUPLICATE_KEY]: {
          ...toValues(loaded),
          name: `${loaded.name} (사본)`,
          approvalStatus: 'draft',
          rejectReason: '',
        } satisfies TemplateFormValues,
      },
    });
  };

  const bytes = byteLengthOf(body);
  const smsKind = classifySms(bytes, false);
  const insertVariable = (token: string) =>
    setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true });

  /**
   * 채널 전환 — 채널만 바꾸는 게 아니라 본문 표현도 함께 옮긴다.
   *
   * 이메일 본문은 HTML 이고 SMS·알림톡 본문은 평문이다. 여기서 옮기지 않으면 `<p>…</p>` 가 그대로
   * 남아 저장되고 수신자에게 태그가 문자로 나간다 (convertBodyForChannel 주석 참고).
   */
  const channelField = register('channel');
  const onChannelChange = async (event: ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const next = event.target.value as MessageChannel;
    const converted = convertBodyForChannel(body, channel, next);

    await channelField.onChange(event);
    if (converted !== body) {
      setValue('body', converted, { shouldDirty: true, shouldValidate: true });
    }
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하지 않는다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '발송 템플릿을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '발송 템플릿을 불러오지 못했습니다.'}
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
        <h1 style={pageTitleStyle}>{isEdit ? '발송 템플릿 수정' : '발송 템플릿 등록'}</h1>
        <p style={descriptionStyle}>
          채널을 고르면 필요한 항목이 달라집니다. 오른쪽 미리보기로 수신자가 볼 모습을 실시간으로
          확인할 수 있습니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        {locked && (
          // 막기만 하고 이유를 말하지 않으면 '고장' 으로 읽힌다 — 이유와 나갈 길을 함께 준다
          <Alert tone="info">
            <div style={alertActionRowStyle}>
              <span>
                {loaded?.approvalStatus === 'approved'
                  ? '카카오 승인이 끝난 템플릿입니다. 승인은 이 문구에 대한 것이라 내용을 고치면 승인이 무효가 됩니다.'
                  : '카카오 검수가 진행 중입니다. 심사 대상과 어긋나므로 내용을 고칠 수 없습니다.'}
                {
                  ' 문구를 바꾸려면 복제해서 새 템플릿으로 다시 심사를 받으세요. 템플릿명은 그대로 수정할 수 있습니다.'
                }
              </span>
              <Button variant="secondary" onClick={duplicate}>
                복제해서 새로 만들기
              </Button>
            </div>
          </Alert>
        )}

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>기본 정보</CardTitle>

              <FormField
                htmlFor="template-name"
                label="템플릿명"
                required
                error={errors.name?.message}
              >
                <input
                  id="template-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={TEMPLATE_NAME_MAX}
                  placeholder="예: 주문 완료 안내(SMS)"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={
                    errors.name !== undefined ? errorIdOf('template-name') : undefined
                  }
                  {...register('name')}
                />
              </FormField>

              <FormField
                htmlFor="template-channel"
                label="채널"
                required
                hint="SMS 는 길이에 따라 LMS·MMS 로 자동 분류됩니다. 알림톡은 카카오 사전 심사가 필요합니다."
              >
                <SelectField
                  id="template-channel"
                  disabled={contentDisabled}
                  {...channelField}
                  onChange={(event) => {
                    void onChannelChange(event);
                  }}
                >
                  {MESSAGE_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </Card>

            <Card>
              <CardTitle>본문 작성</CardTitle>

              {usesTitle(channel) && (
                <FormField
                  htmlFor="template-title"
                  label={channel === 'email' ? '이메일 제목' : '강조표기(제목)'}
                  required
                  error={errors.title?.message}
                >
                  <input
                    id="template-title"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.title !== undefined, contentDisabled)}
                    maxLength={TEMPLATE_TITLE_MAX}
                    placeholder={
                      channel === 'email'
                        ? '예: [스페이스플래닝] 이달의 소식'
                        : '예: 배송 출발 안내'
                    }
                    disabled={contentDisabled}
                    aria-invalid={errors.title !== undefined}
                    aria-describedby={
                      errors.title !== undefined ? errorIdOf('template-title') : undefined
                    }
                    {...register('title')}
                  />
                </FormField>
              )}

              {channel === 'email' ? (
                // 이메일 본문은 HTML — 서식(굵게·제목·목록·링크·이미지)을 그대로 담는다.
                // sanitize·평문→HTML 승격은 RichTextField(껍데기)가 경계에서 처리한다.
                <RichTextField
                  label="본문"
                  required
                  value={ensureRichText(body)}
                  onChange={(value) =>
                    setValue('body', value, { shouldDirty: true, shouldValidate: true })
                  }
                  maxLength={TEMPLATE_BODY_MAX}
                  disabled={contentDisabled}
                  error={errors.body?.message}
                  hint="굵게·제목·목록·링크·이미지를 넣을 수 있습니다. #{이름} 등 치환변수도 그대로 씁니다."
                  placeholder="이메일 본문을 작성하세요."
                  rows={12}
                />
              ) : (
                <TextareaField
                  label="본문"
                  required
                  value={body}
                  onChange={(value) =>
                    setValue('body', value, { shouldDirty: true, shouldValidate: true })
                  }
                  maxLength={TEMPLATE_BODY_MAX}
                  disabled={contentDisabled}
                  error={errors.body?.message}
                  placeholder="발송할 문구를 입력하세요. #{이름} 등 치환변수를 넣을 수 있습니다."
                  rows={6}
                />
              )}
              {channel === 'sms' && (
                <p style={byteHintStyle}>
                  {`${String(bytes)} byte · ${smsKindLabel(smsKind)} (한도 ${String(smsByteLimit(smsKind))} byte)`}
                  {smsKind === 'lms' && ' — 90 byte 초과로 LMS 로 발송됩니다.'}
                </p>
              )}

              <VariableInsertBar onInsert={insertVariable} disabled={contentDisabled} />
            </Card>

            {requiresApproval(channel) && (
              <Card>
                <CardTitle>카카오 심사</CardTitle>

                <FormField
                  htmlFor="template-approval"
                  label="승인상태"
                  hint="알림톡은 카카오 사전 심사(검수중→승인/반려)를 거칩니다. 승인된 템플릿만 발송에 쓸 수 있습니다."
                >
                  <SelectField
                    id="template-approval"
                    disabled={disabled}
                    {...register('approvalStatus')}
                  >
                    {APPROVAL_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                {approvalStatus === 'rejected' && (
                  <>
                    <StatusBadge
                      tone="danger"
                      label="반려됨 — 사유를 확인하고 재편집 후 다시 제출하세요."
                    />
                    <TextareaField
                      label="반려 사유"
                      value={watch('rejectReason')}
                      onChange={(value) => setValue('rejectReason', value, { shouldDirty: true })}
                      maxLength={200}
                      disabled={disabled}
                      placeholder="카카오 심사 반려 사유"
                      rows={2}
                    />
                  </>
                )}
              </Card>
            )}
          </div>

          <div style={previewColStyle}>
            <Card>
              <CardTitle>미리보기</CardTitle>
              <TemplatePreview channel={channel} title={title} body={body} />
            </Card>
          </div>
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
            {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
