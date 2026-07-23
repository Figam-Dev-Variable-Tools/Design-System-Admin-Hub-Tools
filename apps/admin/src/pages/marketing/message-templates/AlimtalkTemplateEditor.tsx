// 카카오 알림톡 템플릿 편집기 — 좌: 발신 / 중앙: 유형·본문·버튼·변수 / 우: 카카오 미리보기
//
// 배선은 공용 CRUD(useCrudForm), 골격은 TemplateEditorShell. 이 파일이 갖는 것은 **알림톡 고유의
// 것**뿐이다: 두 개의 직교하는 유형 축, 버튼명이 합산되는 글자 수 카운터, 심사 상태와 그로 인한 잠금.
//
// [잠금이 이 화면의 중심이다] 한 번이라도 발송된 알림톡은 **영영 수정할 수 없다**. 검수중도 못 고치고,
// 승인만 된 것은 승인을 취소하면 고칠 수 있다 — 세 경우의 길이 서로 다르므로 boolean 하나로 잠그지
// 않고 사유를 받아 배너로 말한다(kakao.ts alimtalkLockReasonOf).
//
// [심사 상태를 화면이 고치지 않는다] approvalStatus 의 주인은 카카오다. 폼에는 들어 있지만 select
// 로 노출하지 않는다 — 운영자가 '승인' 으로 바꿔 잠금을 우회할 수 있으면 잠금이 잠금이 아니다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  controlStyle,
  errorIdOf,
  errorTextStyle,
  FormField,
  SelectField,
  StatusBadge,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { AlimtalkItemsCard } from './components/AlimtalkItemsCard';
import { ImageAttachRow } from './components/ImageAttachRow';
import { InfoCallout } from './components/InfoCallout';
import { KakaoButtonsCard } from './components/KakaoButtonsCard';
import { KakaoPreviewCard } from './components/KakaoPreviewCard';
import { SenderProfileCard } from './components/SenderProfileCard';
import { VariableSamplesCard } from './components/VariableSamplesCard';
import {
  ACTION_PUBLISH,
  ACTION_SAVE_CHANGE,
  ACTION_SAVE_DRAFT,
  ALIMTALK_LABEL_APPROVAL,
  ALIMTALK_LABEL_EMPHASIS_SUBTITLE,
  ALIMTALK_LABEL_EMPHASIS_TITLE,
  ALIMTALK_LABEL_EMPHASIS_TYPE,
  ALIMTALK_LABEL_MESSAGE_TYPE,
  ALIMTALK_IMAGE_CALLOUT_LINES,
  KAKAO_LABEL_BODY,
} from './copy';
import {
  MESSAGE_TEMPLATE_LIST_PATH,
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
} from './data-source';
import {
  ALIMTALK_APPROVAL_LABEL,
  ALIMTALK_CHANNEL_ADD_GUIDE,
  ALIMTALK_EMPHASIS_TYPE_HINT,
  ALIMTALK_EMPHASIS_TYPE_LABEL,
  ALIMTALK_EXTRA_INFO_MAX,
  ALIMTALK_ITEM_HEADER_MAX,
  ALIMTALK_LOCK_MESSAGE,
  ALIMTALK_MESSAGE_TYPE_HINT,
  ALIMTALK_MESSAGE_TYPE_LABEL,
  alimtalkBillableLength,
  alimtalkBodyMaxOf,
  alimtalkHighlightDescriptionMax,
  alimtalkHighlightTitleMax,
  alimtalkLockReasonOf,
  alimtalkVariableBearingText,
  emphasisTruncationWarning,
  hasChannelAddGuide,
  hasExtraInfo,
  kakaoCharCount,
} from './kakao';
import type {
  AlimtalkApprovalStatus,
  AlimtalkEmphasisType,
  AlimtalkItem,
  AlimtalkLengthParts,
  AlimtalkMessageType,
  KakaoButton,
  VariableSampleMap,
} from './kakao';
import { kakaoChannelName, listKakaoChannels, listSenderProfiles } from './store';
import type { MessageTemplateDraft } from './store';
import { publishedStatusOf } from './status';
import { TemplateEditorShell } from './TemplateEditorShell';
import {
  centerColumnStyle,
  channelChipStyle,
  sectionHeadingStyle,
  sectionStyle,
  sideColumnStyle,
  threeColumnStyle,
} from './styles';
import { isPublished, TEMPLATE_KIND_LABEL } from './types';
import type { MessageTemplate } from './types';
import {
  alimtalkTemplateSchema,
  isAlimtalkTemplateValid,
  parseEmphasisType,
  parseMessageType,
} from './validation';
import type { AlimtalkTemplateFormValues } from './validation';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '메시지 템플릿';
const UNSAVED_MESSAGE =
  '알림톡 템플릿에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const BODY_FIELD_ID = 'alimtalk-body';

const MESSAGE_TYPES: readonly AlimtalkMessageType[] = [
  'basic',
  'extra-info',
  'channel-add',
  'complex',
];
const EMPHASIS_TYPES: readonly AlimtalkEmphasisType[] = ['none', 'title', 'image', 'item-list'];

const EMPTY: AlimtalkTemplateFormValues = {
  name: '',
  status: 'draft',
  senderProfileId: '',
  channelId: '',
  messageType: 'basic',
  emphasisType: 'none',
  emphasisTitle: '',
  emphasisSubtitle: '',
  emphasisImageFileName: '',
  itemHeader: '',
  itemHighlightTitle: '',
  itemHighlightDescription: '',
  itemHighlightThumbnailFileName: '',
  items: [],
  extraInfo: '',
  body: '',
  buttons: [],
  variableSamples: {},
  approvalStatus: 'draft',
  rejectReason: '',
  hasBeenSent: false,
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/* 입력 표면은 공용 controlStyle 의 것이다 — 오류 테두리·잠금 배경까지 앱의 다른 입력과 같다
   (ContentInputCard 가 문자 본문 textarea 를 그렇게 조립한다). 여기서 더하는 것은 높이·리사이즈뿐. */
const bodyTextareaStyle = (invalid: boolean, disabled: boolean): CSSProperties => ({
  ...controlStyle(invalid, disabled),
  minHeight: `calc(${cssVar('space.10')} * 6)`,
  resize: 'vertical',
  fontFamily: cssVar('typography.body.md.font-family'),
  lineHeight: cssVar('typography.body.md.line-height'),
});

const counterStyle: CSSProperties = {
  alignSelf: 'flex-end',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  fontVariantNumeric: 'tabular-nums',
};

const typeRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const typeFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: `calc(${cssVar('space.10')} * 3)`,
  minWidth: 0,
};

/**
 * 셀렉트 아래 한 줄 설명.
 *
 * [왜 필요한가] '부가정보형'·'복합형' 은 이름만으로 무엇이 달라지는지 알 수 없는 낱말이다. 종전에는
 * 구현하지 않은 유형에 '(준비 중)' 을 붙여 두어 고를 수 없다는 사실만 알렸는데, 이제 넷 다 고를 수
 * 있게 되면서 **고르기 전에 뜻을 알려 주는 자리**가 필요해졌다. 문구의 정본은 kakao.ts 다.
 */
const typeHintStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 심사 상태 배지의 색 의도 — 반려만 붉게(고쳐야 할 것이 있다는 유일한 상태다) */
function approvalToneOf(status: AlimtalkApprovalStatus) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return status === 'inspecting' ? ('info' as const) : ('neutral' as const);
}

/**
 * 오류 객체에서 사람이 읽을 문구만 꺼낸다.
 *
 * [왜 `errors.x?.message` 로 충분하지 않은가] react-hook-form 은 **객체·맵 필드**(여기서는
 * variableSamples: Record<string, string>)의 오류를 '키별 오류 맵' 으로도 타이핑한다. 그래서
 * `.message` 가 '메시지' 가 아니라 **'message' 라는 이름의 변수에 대한 오류**로 해석되고, 값이
 * 문자열이 아니라 FieldError 가 된다 — 그대로 그리면 [object Object] 가 화면에 뜬다.
 * 문자열일 때만 읽어서 그 사고를 타입 단계에서 닫는다(`as` 로 우기지 않는다).
 */
function messageOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('message' in error)) return undefined;
  return typeof error.message === 'string' ? error.message : undefined;
}

function toInput(values: AlimtalkTemplateFormValues): MessageTemplateDraft {
  return {
    name: values.name.trim(),
    status: values.status,
    senderProfileId: values.senderProfileId,
    content: {
      kind: 'alimtalk',
      channelId: values.channelId,
      messageType: values.messageType,
      emphasisType: values.emphasisType,
      emphasisTitle: values.emphasisTitle.trim(),
      emphasisSubtitle: values.emphasisSubtitle.trim(),
      emphasisImageFileName: values.emphasisImageFileName,
      itemHeader: values.itemHeader.trim(),
      itemHighlightTitle: values.itemHighlightTitle.trim(),
      itemHighlightDescription: values.itemHighlightDescription.trim(),
      itemHighlightThumbnailFileName: values.itemHighlightThumbnailFileName,
      items: values.items,
      extraInfo: values.extraInfo.trim(),
      body: values.body.trim(),
      buttons: values.buttons,
      variableSamples: values.variableSamples,
      approvalStatus: values.approvalStatus,
      rejectReason: values.rejectReason,
      hasBeenSent: values.hasBeenSent,
    },
  };
}

/**
 * 불러온 템플릿 → 폼 값. 종류가 다르면 빈 폼을 준다 — 주소를 손으로 고쳐 다른 종류의 id 로
 * 들어와도 화면이 깨지지 않는다(`as` 로 우기지 않는다. TextTemplateEditor toValues 와 같은 결).
 */
function toValues(template: MessageTemplate): AlimtalkTemplateFormValues {
  if (template.content.kind !== 'alimtalk') return { ...EMPTY, name: template.name };
  const content = template.content;
  return {
    name: template.name,
    status: template.status,
    senderProfileId: template.senderProfileId,
    channelId: content.channelId,
    messageType: content.messageType,
    emphasisType: content.emphasisType,
    emphasisTitle: content.emphasisTitle,
    emphasisSubtitle: content.emphasisSubtitle,
    emphasisImageFileName: content.emphasisImageFileName,
    itemHeader: content.itemHeader,
    itemHighlightTitle: content.itemHighlightTitle,
    itemHighlightDescription: content.itemHighlightDescription,
    itemHighlightThumbnailFileName: content.itemHighlightThumbnailFileName,
    items: content.items,
    extraInfo: content.extraInfo,
    body: content.body,
    buttons: content.buttons,
    variableSamples: content.variableSamples,
    approvalStatus: content.approvalStatus,
    rejectReason: content.rejectReason,
    hasBeenSent: content.hasBeenSent,
  };
}

export default function AlimtalkTemplateEditor() {
  const navigate = useNavigate();
  const profiles = listSenderProfiles();
  const channels = listKakaoChannels();

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
  } = useCrudForm<MessageTemplate, MessageTemplateDraft, AlimtalkTemplateFormValues>({
    resource: MESSAGE_TEMPLATE_RESOURCE,
    adapter: messageTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: MESSAGE_TEMPLATE_LIST_PATH,
    schema: alimtalkTemplateSchema,
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
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  /**
   * 잠금의 근거는 폼 값이 아니라 **서버가 돌려준 원본**이다.
   * 폼 값으로 판단하면 심사 상태를 바꾸는 것만으로 잠금이 풀린다 — 잠금이 잠금이 아니게 된다
   * (_shared/messaging isTemplateContentLocked 머리말이 같은 사고를 적어 두었다).
   */
  const lockReason =
    loaded !== undefined && loaded.content.kind === 'alimtalk'
      ? alimtalkLockReasonOf(loaded.content.approvalStatus, loaded.content.hasBeenSent)
      : null;

  const locked = lockReason !== null;
  const disabled = saving || loadingDetail;
  /** 내용 입력의 잠금 — 템플릿명은 우리 내부 라벨이라 심사 대상이 아니다(잠그지 않는다) */
  const contentDisabled = disabled || locked;

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const valid = useMemo(() => isAlimtalkTemplateValid(values), [values]);
  const editingPublished = loaded !== undefined && isPublished(loaded.status);

  /**
   * 카운터가 세는 값 = 심사가 세는 값.
   *
   * 본문만이 아니라 **강조·아이템리스트·부가정보·채널추가 안내·버튼명**이 모두 들어간다. 무엇이
   * 들어가는지의 정본은 kakao.ts 이고 화면은 조각을 넘기기만 한다 — 여기서 다시 세면 카운터와
   * 저장 검증이 서로 다른 답을 낸다(kakao.ts alimtalkBillableLength 머리말).
   */
  const lengthParts: AlimtalkLengthParts = {
    body: values.body,
    emphasisType: values.emphasisType,
    emphasisTitle: values.emphasisTitle,
    emphasisSubtitle: values.emphasisSubtitle,
    itemHeader: values.itemHeader,
    itemHighlightTitle: values.itemHighlightTitle,
    itemHighlightDescription: values.itemHighlightDescription,
    items: values.items,
    messageType: values.messageType,
    extraInfo: values.extraInfo,
    buttons: values.buttons,
  };
  const length = alimtalkBillableLength(lengthParts);
  /* 분모도 유형이 정한다 — 아이템리스트형만 700자다(kakao.ts ALIMTALK_ITEM_LIST_BODY_MAX) */
  const lengthMax = alimtalkBodyMaxOf(values.emphasisType);
  const bodyError = errors.body?.message;

  /* 말줄임 경고는 **오류가 아니다** — 카카오는 받아 주고 안드로이드 수신 화면에서만 잘린다.
     그래서 저장을 막지 않고 알리기만 한다(kakao.ts emphasisTruncationWarning 머리말). */
  const truncationWarning =
    values.emphasisType === 'title'
      ? emphasisTruncationWarning(values.emphasisTitle, values.emphasisSubtitle)
      : null;

  /** 하이라이트 상한은 썸네일 유무가 정한다 — 썸네일이 글자 자리를 실제로 빼앗는다 */
  const hasHighlightThumbnail = values.itemHighlightThumbnailFileName.trim() !== '';

  const setField = (
    field:
      | 'emphasisTitle'
      | 'emphasisSubtitle'
      | 'emphasisImageFileName'
      | 'itemHeader'
      | 'itemHighlightTitle'
      | 'itemHighlightDescription'
      | 'itemHighlightThumbnailFileName'
      | 'extraInfo'
      | 'body',
    next: string,
  ): void => {
    setValue(field, next, { shouldDirty: true, shouldValidate: true });
  };

  /*
   * [왜 잠금이 저장 버튼을 잠그지 않는가]
   * 잠기는 것은 **내용**이지 템플릿 전체가 아니다. 템플릿명은 운영자가 목록에서 찾으려고 붙인
   * 내부 라벨이라 심사 대상이 아니고, 그래서 위에서 입력을 열어 두었다. 그런데 저장까지 막으면
   * '고칠 수는 있는데 저장은 안 되는 칸' 이 되어 화면이 스스로와 모순된다.
   *
   * 내용이 함께 새어 나가지 않는 근거는 버튼이 아니라 **입력이 잠겼다는 사실**이다 — 잠긴 동안
   * 폼의 내용 필드는 바뀔 수 없으므로 저장해도 같은 내용이 되돌아간다.
   */
  const actions = editingPublished ? (
    <Button
      type="submit"
      variant="primary"
      size="md"
      disabled={disabled || !valid}
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
        onClick={() => setValue('status', 'draft')}
      >
        {ACTION_SAVE_DRAFT}
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={disabled || !valid}
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
              ? '알림톡 템플릿을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
              : '알림톡 템플릿을 불러오지 못했어요.'}
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
        {...(editingPublished && { eyebrow: `${TEMPLATE_KIND_LABEL.alimtalk} 템플릿` })}
        chip={
          <div style={chipRowStyle}>
            <span style={channelChipStyle}>{TEMPLATE_KIND_LABEL.alimtalk}</span>
            {/*
              심사 상태는 발행 상태와 **별개 축**이다 — 'Active 인데 반려' 도 정상이다.
              그래서 상태 배지 옆이 아니라 여기 칩 줄에 따로 붙인다(kakao.ts 머리말).
            */}
            <StatusBadge
              tone={approvalToneOf(values.approvalStatus)}
              label={`${ALIMTALK_LABEL_APPROVAL} · ${ALIMTALK_APPROVAL_LABEL[values.approvalStatus]}`}
            />
          </div>
        }
        actions={actions}
        disabled={disabled}
      >
        <FormServerError serverError={serverError} errorReference={errorReference} />

        {/* 잠금은 '왜' 를 함께 말한다 — 사유마다 운영자가 갈 길이 다르다 */}
        {lockReason !== null && <Alert tone="warning">{ALIMTALK_LOCK_MESSAGE[lockReason]}</Alert>}

        {/* 반려 사유는 카카오가 준 글자다. 잠금과 별개로 언제나 보여야 고칠 수 있다 */}
        {values.approvalStatus === 'rejected' && values.rejectReason.trim() !== '' && (
          <Alert tone="danger">{`반려 사유 — ${values.rejectReason}`}</Alert>
        )}

        <div style={threeColumnStyle}>
          {!leftCollapsed && (
            <div style={sideColumnStyle}>
              <SenderProfileCard
                profiles={profiles}
                profileId={values.senderProfileId}
                channel={{ kind: 'kakao', channelId: values.channelId, channels }}
                disabled={contentDisabled}
                profileError={errors.senderProfileId?.message}
                channelError={errors.channelId?.message}
                onProfileChange={(id) =>
                  setValue('senderProfileId', id, { shouldDirty: true, shouldValidate: true })
                }
                onChannelChange={(channelId) =>
                  setValue('channelId', channelId, { shouldDirty: true, shouldValidate: true })
                }
              />
            </div>
          )}

          <div style={centerColumnStyle}>
            <Card>
              {/* ── 두 개의 직교하는 축 ─────────────────────────────────────
                  나란히 둔 것이 곧 설명이다: 둘은 각자 고르는 것이고 서로를 제약하지 않는다.
                  한 줄짜리 '유형' 셀렉트 하나로 합치면 4×4 조합이 표현되지 않는다(kakao.ts). */}
              <section style={sectionStyle}>
                <div style={typeRowStyle}>
                  <span style={typeFieldStyle}>
                    <FormField htmlFor="alimtalk-message-type" label={ALIMTALK_LABEL_MESSAGE_TYPE}>
                      <SelectField
                        id="alimtalk-message-type"
                        value={values.messageType}
                        disabled={contentDisabled}
                        onChange={(event) =>
                          setValue('messageType', parseMessageType(event.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        {MESSAGE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {ALIMTALK_MESSAGE_TYPE_LABEL[type]}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                    {/* 유형 이름만으로는 무엇이 달라지는지 알 수 없다 — 고른 유형의 뜻을 적는다 */}
                    <span style={typeHintStyle}>
                      {ALIMTALK_MESSAGE_TYPE_HINT[values.messageType]}
                    </span>
                  </span>

                  <span style={typeFieldStyle}>
                    <FormField
                      htmlFor="alimtalk-emphasis-type"
                      label={ALIMTALK_LABEL_EMPHASIS_TYPE}
                    >
                      <SelectField
                        id="alimtalk-emphasis-type"
                        value={values.emphasisType}
                        disabled={contentDisabled}
                        onChange={(event) =>
                          setValue('emphasisType', parseEmphasisType(event.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        {EMPHASIS_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {ALIMTALK_EMPHASIS_TYPE_LABEL[type]}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                    <span style={typeHintStyle}>
                      {ALIMTALK_EMPHASIS_TYPE_HINT[values.emphasisType]}
                    </span>
                  </span>
                </div>
              </section>

              {/* 강조표기형일 때만 나타난다 — 다른 유형에서는 채울 수 없는 칸이다 */}
              {values.emphasisType === 'title' && (
                <section style={sectionStyle}>
                  <FormField
                    htmlFor="alimtalk-emphasis-title"
                    label={ALIMTALK_LABEL_EMPHASIS_TITLE}
                    required
                    {...(errors.emphasisTitle?.message !== undefined && {
                      error: errors.emphasisTitle.message,
                    })}
                  >
                    <input
                      id="alimtalk-emphasis-title"
                      type="text"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(
                        errors.emphasisTitle?.message !== undefined,
                        contentDisabled,
                      )}
                      value={values.emphasisTitle}
                      disabled={contentDisabled}
                      onChange={(event) => setField('emphasisTitle', event.target.value)}
                    />
                  </FormField>

                  {/*
                    보조문구는 **선택이 아니다** — 제작가이드 §2-2 가 "Title과 Subtitle은 함께
                    등록되어야 하며, 각각 단독으로 사용할 수 없음" 이라고 못박는다. 그래서 required 다.
                  */}
                  <FormField
                    htmlFor="alimtalk-emphasis-subtitle"
                    label={ALIMTALK_LABEL_EMPHASIS_SUBTITLE}
                    required
                  >
                    <input
                      id="alimtalk-emphasis-subtitle"
                      type="text"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(false, contentDisabled)}
                      value={values.emphasisSubtitle}
                      disabled={contentDisabled}
                      onChange={(event) => setField('emphasisSubtitle', event.target.value)}
                    />
                  </FormField>

                  {/* 말줄임은 오류가 아니라 경고다 — 저장을 막지 않고 알리기만 한다 */}
                  {truncationWarning !== null && <Alert tone="warning">{truncationWarning}</Alert>}
                </section>
              )}

              {/* ── 이미지형 ────────────────────────────────────────────────
                  규격(800×400 · 2:1 · 500KB)이 안내가 아니라 업로드 조건이다 — 비율이 어긋나면
                  카카오가 파일을 아예 받지 않는다(kakao.ts ALIMTALK_IMAGE_* 머리말). */}
              {values.emphasisType === 'image' && (
                <section style={sectionStyle}>
                  <h3 style={sectionHeadingStyle}>강조 이미지 *</h3>
                  <InfoCallout lines={ALIMTALK_IMAGE_CALLOUT_LINES} />
                  <ImageAttachRow
                    fileName={values.emphasisImageFileName}
                    disabled={contentDisabled}
                    onChange={(fileName: string) => setField('emphasisImageFileName', fileName)}
                  />
                  {errors.emphasisImageFileName?.message !== undefined && (
                    <Alert tone="danger">{errors.emphasisImageFileName.message}</Alert>
                  )}
                </section>
              )}

              {/* ── 아이템리스트형 ──────────────────────────────────────────
                  헤더·하이라이트는 선택이고 아이템 표만 필수다. 선택 칸을 필수처럼 그리면
                  운영자가 채울 것이 없는 칸을 채우려고 문장을 지어낸다. */}
              {values.emphasisType === 'item-list' && (
                <>
                  <section style={sectionStyle}>
                    <FormField
                      htmlFor="alimtalk-item-header"
                      label={`헤더 (선택 · ${String(ALIMTALK_ITEM_HEADER_MAX)}자)`}
                      {...(errors.itemHeader?.message !== undefined && {
                        error: errors.itemHeader.message,
                      })}
                    >
                      <input
                        id="alimtalk-item-header"
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(
                          errors.itemHeader?.message !== undefined,
                          contentDisabled,
                        )}
                        value={values.itemHeader}
                        disabled={contentDisabled}
                        onChange={(event) => setField('itemHeader', event.target.value)}
                      />
                    </FormField>

                    {/*
                      하이라이트 상한이 **썸네일 유무로 달라진다** — 라벨이 그 숫자를 그때그때
                      들고 있어야 한다. 고정 숫자를 적어 두면 썸네일을 붙인 순간 라벨이 거짓말을 한다.
                    */}
                    <FormField
                      htmlFor="alimtalk-item-highlight-title"
                      label={`아이템 하이라이트 제목 (선택 · ${String(alimtalkHighlightTitleMax(hasHighlightThumbnail))}자)`}
                    >
                      <input
                        id="alimtalk-item-highlight-title"
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(false, contentDisabled)}
                        value={values.itemHighlightTitle}
                        disabled={contentDisabled}
                        onChange={(event) => setField('itemHighlightTitle', event.target.value)}
                      />
                    </FormField>

                    <FormField
                      htmlFor="alimtalk-item-highlight-description"
                      label={`아이템 하이라이트 설명 (선택 · ${String(alimtalkHighlightDescriptionMax(hasHighlightThumbnail))}자)`}
                    >
                      <input
                        id="alimtalk-item-highlight-description"
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(false, contentDisabled)}
                        value={values.itemHighlightDescription}
                        disabled={contentDisabled}
                        onChange={(event) =>
                          setField('itemHighlightDescription', event.target.value)
                        }
                      />
                    </FormField>

                    <h3 style={sectionHeadingStyle}>하이라이트 썸네일 (선택 · 1:1)</h3>
                    <ImageAttachRow
                      fileName={values.itemHighlightThumbnailFileName}
                      disabled={contentDisabled}
                      onChange={(fileName: string) =>
                        setField('itemHighlightThumbnailFileName', fileName)
                      }
                    />
                  </section>

                  <AlimtalkItemsCard
                    items={values.items}
                    disabled={contentDisabled}
                    {...(messageOf(errors.items) !== undefined && {
                      error: messageOf(errors.items),
                    })}
                    onChange={(items: readonly AlimtalkItem[]) =>
                      setValue('items', items, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                </>
              )}

              {/* ── 부가정보 (부가정보형 · 복합형) ──────────────────────────
                  **광고성 문구를 넣을 수 있는 유일한 영역**이라 별도로 존재한다. 대신 치환변수를
                  쓸 수 없다 — 고정 안내를 담는 자리라 발송마다 값이 달라지면 뜻이 사라진다. */}
              {hasExtraInfo(values.messageType) && (
                <section style={sectionStyle}>
                  <label htmlFor="alimtalk-extra-info" style={sectionHeadingStyle}>
                    부가정보 *
                  </label>
                  <textarea
                    id="alimtalk-extra-info"
                    className="tds-ui-input tds-ui-focusable"
                    style={bodyTextareaStyle(
                      errors.extraInfo?.message !== undefined,
                      contentDisabled,
                    )}
                    value={values.extraInfo}
                    disabled={contentDisabled}
                    aria-required="true"
                    aria-invalid={errors.extraInfo?.message !== undefined}
                    {...(errors.extraInfo?.message !== undefined && {
                      'aria-describedby': errorIdOf('alimtalk-extra-info'),
                    })}
                    onChange={(event) => setField('extraInfo', event.target.value)}
                  />
                  <span style={counterStyle}>
                    {`${String(kakaoCharCount(values.extraInfo))} / ${String(ALIMTALK_EXTRA_INFO_MAX)}자 · 치환변수 불가`}
                  </span>
                  {errors.extraInfo?.message !== undefined && (
                    <p id={errorIdOf('alimtalk-extra-info')} style={errorTextStyle} role="alert">
                      {errors.extraInfo.message}
                    </p>
                  )}
                </section>
              )}

              {/* ── 채널 추가 안내 (채널추가형 · 복합형) ────────────────────
                  문구가 **카카오 고정**이라 입력칸이 아니라 읽기 전용 표시다. 고칠 수 있게 두면
                  한 글자만 달라져도 반려된다(kakao.ts ALIMTALK_CHANNEL_ADD_GUIDE). */}
              {hasChannelAddGuide(values.messageType) && (
                <section style={sectionStyle}>
                  <h3 style={sectionHeadingStyle}>채널 추가 안내</h3>
                  <InfoCallout
                    lines={[
                      ALIMTALK_CHANNEL_ADD_GUIDE,
                      '이 문구는 카카오가 정한 고정 문장이라 수정할 수 없어요.',
                      '이 글자 수도 본문 상한에 합산돼요.',
                    ]}
                  />
                </section>
              )}

              <section style={sectionStyle}>
                <label htmlFor={BODY_FIELD_ID} style={sectionHeadingStyle}>
                  {`${KAKAO_LABEL_BODY} *`}
                </label>
                <textarea
                  id={BODY_FIELD_ID}
                  className="tds-ui-input tds-ui-focusable"
                  style={bodyTextareaStyle(bodyError !== undefined, contentDisabled)}
                  value={values.body}
                  disabled={contentDisabled}
                  aria-required="true"
                  aria-invalid={bodyError !== undefined}
                  // [A11Y-11] '잘못됨' 만 알리고 이유를 말하지 않는 입력을 만들지 않는다
                  {...(bodyError !== undefined && {
                    'aria-describedby': errorIdOf(BODY_FIELD_ID),
                  })}
                  onChange={(event) => setField('body', event.target.value)}
                />
                {/*
                  카운터가 '글자' 라고 말하고 실제로 글자를 센다 — 문자 편집기의 byte 배지와 다른 축이다.
                  버튼명이 합산된다는 사실을 카운터 자체가 적어 둔다: 그렇지 않으면 본문만 세던
                  운영자가 반려를 받고 나서야 규칙을 알게 된다.
                */}
                <span style={counterStyle}>
                  {`${String(length)} / ${String(lengthMax)}자 (강조·부가정보·버튼명 포함)`}
                </span>
                {bodyError !== undefined && (
                  <p id={errorIdOf(BODY_FIELD_ID)} style={errorTextStyle} role="alert">
                    {bodyError}
                  </p>
                )}
              </section>

              <KakaoButtonsCard
                buttons={values.buttons}
                context={{ kind: 'alimtalk', messageType: values.messageType }}
                disabled={contentDisabled}
                onChange={(buttons: readonly KakaoButton[]) =>
                  setValue('buttons', buttons, { shouldDirty: true, shouldValidate: true })
                }
              />
              {errors.buttons?.message !== undefined && (
                <Alert tone="danger">{errors.buttons.message}</Alert>
              )}

              <VariableSamplesCard
                /* 강조 제목·보조문구도 심사에 함께 나간다 — 거기 쓴 변수도 예시값이 필요하다 */
                text={alimtalkVariableBearingText(lengthParts)}
                samples={values.variableSamples}
                disabled={contentDisabled}
                onChange={(samples: VariableSampleMap) =>
                  setValue('variableSamples', samples, { shouldDirty: true, shouldValidate: true })
                }
              />
              {messageOf(errors.variableSamples) !== undefined && (
                <Alert tone="danger">{messageOf(errors.variableSamples)}</Alert>
              )}
            </Card>
          </div>

          <div style={sideColumnStyle}>
            <KakaoPreviewCard
              channelName={kakaoChannelName(values.channelId)}
              content={{
                kind: 'alimtalk',
                channelId: values.channelId,
                messageType: values.messageType,
                emphasisType: values.emphasisType,
                emphasisTitle: values.emphasisTitle,
                emphasisSubtitle: values.emphasisSubtitle,
                emphasisImageFileName: values.emphasisImageFileName,
                itemHeader: values.itemHeader,
                itemHighlightTitle: values.itemHighlightTitle,
                itemHighlightDescription: values.itemHighlightDescription,
                itemHighlightThumbnailFileName: values.itemHighlightThumbnailFileName,
                items: values.items,
                extraInfo: values.extraInfo,
                body: values.body,
                buttons: values.buttons,
                variableSamples: values.variableSamples,
                approvalStatus: values.approvalStatus,
                rejectReason: values.rejectReason,
                hasBeenSent: values.hasBeenSent,
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => setLeftCollapsed((value) => !value)}>
              {leftCollapsed ? '발신 정보 펼치기' : '발신 정보 접기'}
            </Button>
          </div>
        </div>
      </TemplateEditorShell>

      <FormConflictDialog conflict={conflict} />
      {unsavedDialog}
    </form>
  );
}
