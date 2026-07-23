// 문자(SMS/LMS/MMS) 템플릿 편집기 — 좌: 발신 프로필 / 중앙: 본문·첨부 / 우: 휴대폰 미리보기
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면 골격은 TemplateEditorShell 이
// 소유한다. 이 파일이 갖는 것은 **문자 고유의 것**뿐이다: 본문 되돌리기 이력, 좌우 패널 접기,
// 치환변수 삽입, SMS/LMS/MMS 등급 표시.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, alertActionRowStyle, Button, useUnsavedChangesDialog } from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import {
  applyVariableSamples,
  byteLengthOf,
  classifySms,
  smsKindLabel,
} from '../_shared/messaging';
import { hasLengthShiftingVariables } from '../../../shared/domain/template-variables';
import { ContentInputCard } from './components/ContentInputCard';
import { EditorToolbar } from './components/EditorToolbar';
import { SaveGlyph } from './components/glyphs';
import { SenderProfileCard } from './components/SenderProfileCard';
import { TextPreviewCard } from './components/TextPreviewCard';
import { ACTION_PUBLISH, ACTION_SAVE_CHANGE, ACTION_SAVE_DRAFT, CHANNEL_CHIP_LABEL } from './copy';
import {
  MESSAGE_TEMPLATE_LIST_PATH,
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
} from './data-source';
import { listSenderProfiles } from './store';
import type { MessageTemplateDraft } from './store';
import { publishedStatusOf } from './status';
import { TemplateEditorShell } from './TemplateEditorShell';
import { centerColumnStyle, channelChipStyle, sideColumnStyle, threeColumnStyle } from './styles';
import { isPublished, TEMPLATE_KIND_LABEL } from './types';
import type { MessageTemplate, TextMessageVendor } from './types';
import { isTextTemplateValid, textTemplateSchema } from './validation';
import type { TextTemplateFormValues } from './validation';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '메시지 템플릿';
const UNSAVED_MESSAGE =
  '메시지 템플릿에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

/** 문자 발송 대행사 — 계약된 회선. 지금은 픽스처의 기본값이고 상세의 'Text message type' 이 보여 준다 */
const DEFAULT_VENDOR: TextMessageVendor = 'SureM';

const EMPTY: TextTemplateFormValues = {
  name: '',
  status: 'draft',
  senderProfileId: '',
  senderPhone: '',
  vendor: DEFAULT_VENDOR,
  subject: '',
  body: '',
  imageFileName: '',
};

/** 되돌리기 이력의 상한 — 무한히 쌓으면 긴 편집 세션에서 메모리가 계속 는다 */
const HISTORY_LIMIT = 50;

const chipRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const gradeStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontVariantNumeric: 'tabular-nums',
};

/** 치환 후 등급이 갈릴 때 — 건당 과금이 달라지므로 흐린 회색으로 흘려보내지 않는다 */
const gradeShiftStyle: CSSProperties = {
  ...gradeStyle,
  color: cssVar('color.feedback.warning.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

function toInput(values: TextTemplateFormValues): MessageTemplateDraft {
  return {
    name: values.name.trim(),
    status: values.status,
    senderProfileId: values.senderProfileId,
    content: {
      kind: 'text',
      subject: values.subject.trim(),
      body: values.body.trim(),
      imageFileName: values.imageFileName,
      vendor: values.vendor,
      senderPhone: values.senderPhone,
    },
  };
}

/**
 * 불러온 템플릿 → 폼 값.
 *
 * content 는 판별 유니온이라 이메일 템플릿이 올 수도 있다 — 라우트가 종류를 보고 이 편집기를
 * 고르므로 실제로는 오지 않지만, `as` 로 우기는 대신 kind 를 확인하고 아니면 빈 폼을 준다
 * (주소를 손으로 고쳐 이메일 id 를 문자 편집기에 넣어도 화면이 깨지지 않는다).
 */
function toValues(template: MessageTemplate): TextTemplateFormValues {
  if (template.content.kind !== 'text') return { ...EMPTY, name: template.name };
  const { subject, body, imageFileName, vendor, senderPhone } = template.content;
  return {
    name: template.name,
    status: template.status,
    senderProfileId: template.senderProfileId,
    senderPhone,
    vendor,
    subject,
    body,
    imageFileName,
  };
}

export default function TextTemplateEditor() {
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
  } = useCrudForm<MessageTemplate, MessageTemplateDraft, TextTemplateFormValues>({
    resource: MESSAGE_TEMPLATE_RESOURCE,
    adapter: messageTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: MESSAGE_TEMPLATE_LIST_PATH,
    schema: textTemplateSchema,
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

  /* ── 본문 되돌리기 ────────────────────────────────────────────────────────
   *
   * [왜 브라우저 기본 undo 로 충분하지 않은가] 치환변수 삽입·첨부 해제는 **우리가 값을 바꾸는**
   * 조작이라 textarea 의 네이티브 undo 스택에 들어가지 않는다. 툴바에 되돌리기를 두는 이상
   * 그 조작들도 되돌려져야 하므로 값 단위 이력을 따로 든다. */
  const [past, setPast] = useState<readonly string[]>([]);
  const [future, setFuture] = useState<readonly string[]>([]);

  const commitBody = (next: string) => {
    setPast((stack) => [...stack, values.body].slice(-HISTORY_LIMIT));
    setFuture([]);
    setValue('body', next, { shouldDirty: true, shouldValidate: true });
  };

  const undo = () => {
    const previous = past.at(-1);
    if (previous === undefined) return;
    setPast((stack) => stack.slice(0, -1));
    setFuture((stack) => [values.body, ...stack]);
    setValue('body', previous, { shouldDirty: true, shouldValidate: true });
  };

  const redo = () => {
    const next = future[0];
    if (next === undefined) return;
    setFuture((stack) => stack.slice(1));
    setPast((stack) => [...stack, values.body].slice(-HISTORY_LIMIT));
    setValue('body', next, { shouldDirty: true, shouldValidate: true });
  };

  /* ── 패널 접기 ───────────────────────────────────────────────────────────── */
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 변수 삽입 — 커서 자리에 넣는다. 포커스가 본문에 없으면 끝에 붙인다.
   * 끝에만 붙이면 문장 가운데에 이름을 넣으려던 운영자가 매번 잘라내기·붙여넣기를 하게 된다.
   */
  const insertVariable = (token: string) => {
    const node = textareaRef.current;
    const body = values.body;
    if (node === null || node.selectionStart === null) {
      commitBody(`${body}${token}`);
      return;
    }
    const start = node.selectionStart;
    const end = node.selectionEnd ?? start;
    commitBody(`${body.slice(0, start)}${token}${body.slice(end)}`);
  };

  /**
   * 본문 내려받기 — 검수용으로 문구를 텍스트 파일로 뽑는다.
   * 서버를 거치지 않으므로 Blob 을 만들어 임시 링크를 눌러 준다(만든 URL 은 곧바로 되돌린다).
   */
  const download = () => {
    const blob = new Blob([values.body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${values.name.trim() === '' ? 'message-template' : values.name.trim()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ── 헤더 액션 ───────────────────────────────────────────────────────────── */

  const valid = useMemo(() => isTextTemplateValid(values), [values]);
  /** 발행본을 고치는 중인가 — 근거는 폼 값이 아니라 **서버가 돌려준 원본**이다 */
  const editingPublished = loaded !== undefined && isPublished(loaded.status);

  const bytes = byteLengthOf(values.body);
  /* 제목도 승격 사유다 — 칩 옆의 '현재 등급' 이 미리보기와 다른 답을 내면 안 된다
     (_shared/messaging classifySms 머리말) */
  const grade = classifySms(
    bytes,
    values.imageFileName.trim() !== '',
    values.subject.trim() !== '',
  );

  /* ── 치환 후 길이 ───────────────────────────────────────────────────────────
   *
   * [왜 두 숫자를 보여 주는가] 위의 `bytes` 는 **작성 중인 글자**의 길이다. 그런데 SMS 90byte /
   * LMS 2,000byte 상한이 걸리는 것은 **발송되는 글자**다. `#{member.name}` 은 편집기에서
   * 15byte 지만 발송될 때는 '명재우' 6byte 이고, `#{quote.totalAmount}` 는 21byte 자리에
   * '33,000,000' 10byte 가 들어간다. 즉 두 값은 구조적으로 다르다.
   *
   * 차이를 숨기면 두 방향으로 틀린다: 상한 안쪽이라 믿고 저장했다가 발송 단계에서 LMS 로
   * 승격돼 건당 과금이 뛰거나, 반대로 상한을 넘은 줄 알고 멀쩡한 문구를 줄인다.
   *
   * [이 숫자는 보장이 아니다] 표본값은 픽스처 한 사람의 값이다. 실제 수신자는 이름이 다섯
   * 자일 수도, 주소가 두 줄일 수도 있다. 그래서 화면 문구가 '표본 기준' 과 '수신자마다
   * 달라진다' 를 반드시 함께 말한다 — 숫자만 보여 주면 운영자가 그것을 상한으로 착각한다.
   * (shared/domain/template-variables.ts 의 [치환 후 길이] 문단) */
  const hasVariables = hasLengthShiftingVariables(values.body);
  const sampleBytes = byteLengthOf(applyVariableSamples(values.body));
  const sampleGrade = classifySms(
    sampleBytes,
    values.imageFileName.trim() !== '',
    values.subject.trim() !== '',
  );
  /* 등급이 갈리면 과금이 갈린다 — 그때는 안내가 아니라 경고여야 한다 */
  const gradeShifts = hasVariables && sampleGrade !== grade;

  const actions = editingPublished ? (
    // 이미 발행된 것에는 '초안으로 저장' 이 없다 — 발행을 취소하는 길은 사용 여부 토글이지 저장이 아니다
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
        iconLeft={<SaveGlyph />}
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
        {...(editingPublished && { eyebrow: `${TEMPLATE_KIND_LABEL.text} 템플릿` })}
        chip={
          <div style={chipRowStyle}>
            {/*
              채널 칩은 '정보이자 선택 가능' 이다(목업). 실제로 고르는 것은 **대행사 회선**이고
              SMS/LMS/MMS 등급은 길이·이미지가 자동으로 정하므로, 칩 옆에 지금 등급을 함께 적는다 —
              고를 수 없는 것을 고르는 것처럼 보이게 두지 않는다.
            */}
            <select
              className="tds-ui-focusable"
              style={channelChipStyle}
              value={values.vendor}
              disabled={disabled}
              aria-label={`${CHANNEL_CHIP_LABEL} 발송 회선`}
              onChange={(event) =>
                setValue('vendor', event.target.value as TextMessageVendor, { shouldDirty: true })
              }
            >
              {(['SureM', 'NHN', 'Solapi'] as const).map((vendor) => (
                <option key={vendor} value={vendor}>
                  {`${CHANNEL_CHIP_LABEL} · ${vendor}`}
                </option>
              ))}
            </select>
            <span
              style={gradeStyle}
            >{`현재 등급 ${smsKindLabel(grade)} · ${String(bytes)} byte`}</span>
            {hasVariables && (
              /* 치환 후 값은 별도의 칩이다 — 위 숫자와 한 줄에 붙이면 어느 쪽이 상한에 걸리는
                 값인지 흐려진다. 등급까지 갈리면 색을 바꿔 '과금이 달라진다' 를 먼저 알린다. */
              <span style={gradeShifts ? gradeShiftStyle : gradeStyle}>
                {`치환 후 ${smsKindLabel(sampleGrade)} · ${String(sampleBytes)} byte (표본 기준 — 수신자마다 달라져요)`}
              </span>
            )}
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
                // 편집기의 글자는 목업이 정한 영문이다 (copy.ts 머리말)
                profiles={profiles}
                profileId={values.senderProfileId}
                channel={{ kind: 'text', phone: values.senderPhone }}
                disabled={disabled}
                profileError={errors.senderProfileId?.message}
                channelError={errors.senderPhone?.message}
                onProfileChange={(id) => {
                  setValue('senderProfileId', id, { shouldDirty: true, shouldValidate: true });
                  // 프로필이 바뀌면 이전 번호는 그 프로필의 것이 아니다 — 남겨 두면 다른 프로필의
                  // 번호로 발송되는 조합이 저장된다. 비우고 다시 고르게 한다.
                  setValue('senderPhone', '', { shouldDirty: true, shouldValidate: true });
                }}
                onChannelChange={(phone) =>
                  setValue('senderPhone', phone, { shouldDirty: true, shouldValidate: true })
                }
              />
            </div>
          )}

          <div style={centerColumnStyle}>
            <ContentInputCard
              toolbar={
                <EditorToolbar
                  leftCollapsed={leftCollapsed}
                  rightCollapsed={rightCollapsed}
                  onToggleLeft={() => setLeftCollapsed((value) => !value)}
                  onToggleRight={() => setRightCollapsed((value) => !value)}
                  canUndo={past.length > 0}
                  canRedo={future.length > 0}
                  onUndo={undo}
                  onRedo={redo}
                  variablesOpen={variablesOpen}
                  onToggleVariables={() => setVariablesOpen((value) => !value)}
                  onInsertVariable={insertVariable}
                  onDownload={download}
                  disabled={disabled}
                />
              }
              subject={values.subject}
              body={values.body}
              imageFileName={values.imageFileName}
              disabled={disabled}
              bodyError={errors.body?.message}
              subjectError={errors.subject?.message}
              onSubjectChange={(subject) =>
                setValue('subject', subject, { shouldDirty: true, shouldValidate: true })
              }
              onBodyChange={commitBody}
              onImageChange={(fileName) =>
                setValue('imageFileName', fileName, { shouldDirty: true, shouldValidate: true })
              }
              textareaRef={textareaRef}
            />
          </div>

          {!rightCollapsed && (
            <div style={sideColumnStyle}>
              <TextPreviewCard
                subject={values.subject}
                body={values.body}
                imageFileName={values.imageFileName}
                senderPhone={values.senderPhone}
              />
            </div>
          )}
        </div>
      </TemplateEditorShell>

      <FormConflictDialog conflict={conflict} />
      {unsavedDialog}
    </form>
  );
}
