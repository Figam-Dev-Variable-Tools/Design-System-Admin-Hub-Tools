// 카카오 브랜드 메시지(구 친구톡) 템플릿 편집기
//
// [이름] 코드는 brandmessage, 화면은 '브랜드 메시지 (구 친구톡)'. 친구톡은 2025-12-31 종료됐고
// 2026-01-01 부터 모든 친구톡 발송이 브랜드 메시지로 자동 대체된다 — 전문과 근거는 kakao.ts 머리말.
// **둘을 맞추려고 어느 한쪽을 고치기 전에 그 머리말을 읽어라.**
//
// [알림톡과 무엇이 다른가 — 이 파일이 따로 있는 이유]
//   · 사전 심사가 없다 → 승인 상태도, 발송 이력 잠금도, 변수 예시값 제출 요건도 없다.
//   · 광고가 가능하다 → (광고) 표기·무료수신거부가 본문 요건이 된다(정보통신망법 제50조 제4항).
//   · 발송 시간이 08:00~20:50 로 제한된다 → 알림톡에는 아예 없는 개념이다.
//   · 본문 상한이 **유형에서 온다**(76~1,300자) → 알림톡처럼 상수 하나로 둘 수 없다.
// 공유하는 것은 버튼 모델과 치환변수뿐이라 그 둘만 같은 컴포넌트를 쓴다.
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
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { BrandCarouselCardsCard, BrandListItemsCard } from './components/BrandCardsCard';
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
  BRAND_MESSAGE_LABEL_AD,
  BRAND_MESSAGE_LABEL_BODY_TYPE,
  IMAGE_CALLOUT_LINES,
  KAKAO_LABEL_BODY,
  LABEL_ATTACH_IMAGE,
} from './copy';
import {
  MESSAGE_TEMPLATE_LIST_PATH,
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
} from './data-source';
import {
  BRAND_MESSAGE_BODY_MAX,
  BRAND_MESSAGE_SEND_WINDOW_LABEL,
  BRAND_MESSAGE_TYPE_HINT,
  BRAND_MESSAGE_TYPE_LABEL,
  kakaoCharCount,
  requiresImage,
} from './kakao';
import type {
  BrandCarouselCard,
  BrandListItem,
  BrandMessageBodyType,
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
  brandMessageTemplateSchema,
  isBrandMessageTemplateValid,
  parseBrandMessageBodyType,
} from './validation';
import type { BrandMessageTemplateFormValues } from './validation';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '메시지 템플릿';
const UNSAVED_MESSAGE =
  '브랜드 메시지 템플릿에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const BODY_FIELD_ID = 'brand-body';

const BODY_TYPES: readonly BrandMessageBodyType[] = [
  'text',
  'image',
  'wide-image',
  'wide-list',
  'carousel',
];

const EMPTY: BrandMessageTemplateFormValues = {
  name: '',
  status: 'draft',
  senderProfileId: '',
  channelId: '',
  bodyType: 'text',
  body: '',
  imageFileName: '',
  listItems: [],
  cards: [],
  buttons: [],
  variableSamples: {},
  isAd: false,
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const windowStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontVariantNumeric: 'tabular-nums',
};

/* 입력 표면은 공용 controlStyle 의 것이다 (AlimtalkTemplateEditor 와 같은 결) */
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

/** 유형 셀렉트 아래 한 줄 설명 — AlimtalkTemplateEditor 의 typeHintStyle 과 같은 자리·같은 이유 */
const typeHintStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const adRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 광고성을 켰을 때 본문이 갖춰야 하는 것 — 규칙과 안내가 같은 자리를 본다 */
const AD_CALLOUT_LINES: readonly string[] = [
  '광고성 메시지는 본문이 (광고) 로 시작해야 해요.',
  '무료수신거부 방법(080 번호 등)을 본문에 적어야 해요.',
  `카카오는 브랜드 메시지를 ${BRAND_MESSAGE_SEND_WINDOW_LABEL} 에만 발송해요.`,
];

function toInput(values: BrandMessageTemplateFormValues): MessageTemplateDraft {
  return {
    name: values.name.trim(),
    status: values.status,
    senderProfileId: values.senderProfileId,
    content: {
      kind: 'brandmessage',
      channelId: values.channelId,
      bodyType: values.bodyType,
      body: values.body.trim(),
      imageFileName: values.imageFileName,
      listItems: values.listItems,
      cards: values.cards,
      buttons: values.buttons,
      variableSamples: values.variableSamples,
      isAd: values.isAd,
    },
  };
}

function toValues(template: MessageTemplate): BrandMessageTemplateFormValues {
  if (template.content.kind !== 'brandmessage') return { ...EMPTY, name: template.name };
  const content = template.content;
  return {
    name: template.name,
    status: template.status,
    senderProfileId: template.senderProfileId,
    channelId: content.channelId,
    bodyType: content.bodyType,
    body: content.body,
    imageFileName: content.imageFileName,
    listItems: content.listItems,
    cards: content.cards,
    buttons: content.buttons,
    variableSamples: content.variableSamples,
    isAd: content.isAd,
  };
}

export default function BrandMessageTemplateEditor() {
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
  } = useCrudForm<MessageTemplate, MessageTemplateDraft, BrandMessageTemplateFormValues>({
    resource: MESSAGE_TEMPLATE_RESOURCE,
    adapter: messageTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: MESSAGE_TEMPLATE_LIST_PATH,
    schema: brandMessageTemplateSchema,
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

  const disabled = saving || loadingDetail;
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const valid = useMemo(() => isBrandMessageTemplateValid(values), [values]);
  const editingPublished = loaded !== undefined && isPublished(loaded.status);

  /* 상한이 **유형에서 온다** — 유형을 바꾸면 카운터의 분모가 함께 바뀐다(알림톡과 갈리는 지점) */
  const max = BRAND_MESSAGE_BODY_MAX[values.bodyType];
  const length = kakaoCharCount(values.body);
  const needsImage = requiresImage(values.bodyType);
  const bodyError = errors.body?.message;

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

  if (loadFailure !== null) {
    return (
      <Alert tone="danger">
        <div style={alertActionRowStyle}>
          <span>
            {loadFailure === 'not-found'
              ? '브랜드 메시지 템플릿을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
              : '브랜드 메시지 템플릿을 불러오지 못했어요.'}
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
        {...(editingPublished && { eyebrow: `${TEMPLATE_KIND_LABEL.brandmessage} 템플릿` })}
        chip={
          <div style={chipRowStyle}>
            <span style={channelChipStyle}>{TEMPLATE_KIND_LABEL.brandmessage}</span>
            {/* 발송 시간대는 이 채널에만 있는 제약이다 — 칩 옆에 상시 적어 둔다 */}
            <span style={windowStyle}>{`발송 가능 ${BRAND_MESSAGE_SEND_WINDOW_LABEL}`}</span>
          </div>
        }
        actions={actions}
        disabled={disabled}
      >
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={threeColumnStyle}>
          {!leftCollapsed && (
            <div style={sideColumnStyle}>
              <SenderProfileCard
                profiles={profiles}
                profileId={values.senderProfileId}
                channel={{ kind: 'kakao', channelId: values.channelId, channels }}
                disabled={disabled}
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
              <section style={sectionStyle}>
                <FormField htmlFor="brand-body-type" label={BRAND_MESSAGE_LABEL_BODY_TYPE}>
                  <SelectField
                    id="brand-body-type"
                    value={values.bodyType}
                    disabled={disabled}
                    onChange={(event) =>
                      setValue('bodyType', parseBrandMessageBodyType(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {BODY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {`${BRAND_MESSAGE_TYPE_LABEL[type]} (${String(BRAND_MESSAGE_BODY_MAX[type])}자)`}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                {/* 유형 이름과 자수만으로는 무엇이 달라지는지 알 수 없다 — 뜻을 한 줄로 적는다 */}
                <span style={typeHintStyle}>{BRAND_MESSAGE_TYPE_HINT[values.bodyType]}</span>
              </section>

              <section style={sectionStyle}>
                {/*
                  라벨을 눈에 보이게 적는다. ToggleSwitch 의 label 은 **접근성 이름**이라 화면에는
                  'OFF' 만 남는다 — 상세 화면처럼 문맥이 옆에 있는 자리면 충분하지만, 여기서는
                  이 스위치가 무엇을 켜는지 화면 어디에도 적혀 있지 않게 된다.
                */}
                <h3 style={sectionHeadingStyle}>{BRAND_MESSAGE_LABEL_AD}</h3>
                <div style={adRowStyle}>
                  {/* 광고성 여부는 본문 요건을 통째로 바꾼다 — 켜는 순간 규칙이 나타나야 한다 */}
                  <ToggleSwitch
                    checked={values.isAd}
                    label={BRAND_MESSAGE_LABEL_AD}
                    onChange={(next: boolean) =>
                      setValue('isAd', next, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                </div>
                {values.isAd && <InfoCallout lines={AD_CALLOUT_LINES} />}
              </section>

              <section style={sectionStyle}>
                <label htmlFor={BODY_FIELD_ID} style={sectionHeadingStyle}>
                  {`${KAKAO_LABEL_BODY} *`}
                </label>
                <textarea
                  id={BODY_FIELD_ID}
                  className="tds-ui-input tds-ui-focusable"
                  style={bodyTextareaStyle(bodyError !== undefined, disabled)}
                  value={values.body}
                  disabled={disabled}
                  aria-required="true"
                  aria-invalid={bodyError !== undefined}
                  // [A11Y-11] '잘못됨' 만 알리고 이유를 말하지 않는 입력을 만들지 않는다
                  {...(bodyError !== undefined && {
                    'aria-describedby': errorIdOf(BODY_FIELD_ID),
                  })}
                  onChange={(event) =>
                    setValue('body', event.target.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {/* 분모가 유형에서 온다 — 유형 이름을 함께 적어 '왜 400자인가' 를 화면이 말하게 한다 */}
                <span style={counterStyle}>
                  {`${String(length)} / ${String(max)}자 · ${BRAND_MESSAGE_TYPE_LABEL[values.bodyType]}`}
                </span>
                {bodyError !== undefined && (
                  <p id={errorIdOf(BODY_FIELD_ID)} style={errorTextStyle} role="alert">
                    {bodyError}
                  </p>
                )}
              </section>

              {/* ── 카드형 ─────────────────────────────────────────────────
                  와이드 리스트형·캐러셀형은 **항목·카드가 곧 본문**이다. 위 body 는 그 위에 붙는
                  머리글 한 줄일 뿐이라, 이 배열이 비면 유형을 고른 뜻이 사라진다.
                  (그래서 requiresImage 가 이 두 유형에서 false 다 — 이미지가 항목마다 딸려 있다.) */}
              {values.bodyType === 'wide-list' && (
                <BrandListItemsCard
                  items={values.listItems}
                  disabled={disabled}
                  {...(errors.listItems?.message !== undefined && {
                    error: errors.listItems.message,
                  })}
                  onChange={(listItems: readonly BrandListItem[]) =>
                    setValue('listItems', listItems, { shouldDirty: true, shouldValidate: true })
                  }
                />
              )}

              {values.bodyType === 'carousel' && (
                <BrandCarouselCardsCard
                  cards={values.cards}
                  disabled={disabled}
                  {...(errors.cards?.message !== undefined && { error: errors.cards.message })}
                  onChange={(cards: readonly BrandCarouselCard[]) =>
                    setValue('cards', cards, { shouldDirty: true, shouldValidate: true })
                  }
                />
              )}

              {/* 이미지 칸은 유형이 요구할 때만 나타난다 — 텍스트형에는 붙일 자리가 없다 */}
              {needsImage && (
                <section style={sectionStyle}>
                  <h3 style={sectionHeadingStyle}>{`${LABEL_ATTACH_IMAGE} *`}</h3>
                  <InfoCallout lines={IMAGE_CALLOUT_LINES} />
                  <ImageAttachRow
                    fileName={values.imageFileName}
                    disabled={disabled}
                    onChange={(fileName: string) =>
                      setValue('imageFileName', fileName, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  {errors.imageFileName?.message !== undefined && (
                    <Alert tone="danger">{errors.imageFileName.message}</Alert>
                  )}
                </section>
              )}

              <KakaoButtonsCard
                buttons={values.buttons}
                /* 브랜드 메시지에는 메시지 유형 축이 없다 — AC 제약은 알림톡만의 규칙이다. 대신
                 **본문 유형**이 개수·이름 상한을 정한다(와이드 이미지형은 2개·8자) */
                context={{ kind: 'brandmessage', bodyType: values.bodyType }}
                disabled={disabled}
                onChange={(buttons: readonly KakaoButton[]) =>
                  setValue('buttons', buttons, { shouldDirty: true, shouldValidate: true })
                }
              />
              {errors.buttons?.message !== undefined && (
                <Alert tone="danger">{errors.buttons.message}</Alert>
              )}

              {/*
                심사가 없으므로 예시값이 **제출 요건은 아니다**(그래서 스키마가 막지 않는다).
                그래도 칸은 둔다 — 변수가 실제로 무엇으로 채워지는지를 적어 두는 자리가 없으면
                템플릿을 넘겨받은 다음 사람이 `#{쿠폰명}` 에 무엇이 오는지 알 길이 없다.
              */}
              <VariableSamplesCard
                /* 브랜드 메시지에는 강조 영역이 없다 — 변수가 놓이는 곳은 본문뿐이다 */
                text={values.body}
                samples={values.variableSamples}
                disabled={disabled}
                onChange={(samples: VariableSampleMap) =>
                  setValue('variableSamples', samples, { shouldDirty: true, shouldValidate: true })
                }
              />
            </Card>
          </div>

          <div style={sideColumnStyle}>
            <KakaoPreviewCard
              channelName={kakaoChannelName(values.channelId)}
              content={{
                kind: 'brandmessage',
                channelId: values.channelId,
                bodyType: values.bodyType,
                body: values.body,
                imageFileName: values.imageFileName,
                listItems: values.listItems,
                cards: values.cards,
                buttons: values.buttons,
                variableSamples: values.variableSamples,
                isAd: values.isAd,
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => setLeftCollapsed((v) => !v)}>
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
