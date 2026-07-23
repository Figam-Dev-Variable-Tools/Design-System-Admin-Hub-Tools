// MessageTemplateDetailPage — 메시지 템플릿 상세 (라우트: /marketing/templates/:id)
//
// 읽기 전용 3단: 좌(발신 프로필 · 잠김) / 중앙(상태 이력 표) / 우(미리보기).
//
// [헤더 액션이 상태마다 갈린다] 규칙의 정본은 status.ts 의 actionsFor 다 — 화면은 그 결과를 그릴 뿐
// `status === 'draft'` 를 스스로 세지 않는다(같은 판단이 편집기에도 있어 어긋나기 쉽다).
//
// [왜 상태 변경이 저장(update)이 아니라 별도 호출인가] 이 화면에는 편집 폼이 없다. 토글 하나를
// 켜려고 본문 전체를 되보내면, 그 사이 다른 관리자가 고친 본문을 화면이 들고 있던 옛 값으로
// 덮어쓴다 (store.ts setMessageTemplateStatus 머리말).
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isAbort } from '../../../shared/async';
import { formatDateTime } from '../../../shared/format';
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  ddStyle,
  dlStyle,
  dtStyle,
  Icon,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import type { StatusTone } from '../../../shared/ui';
import { RowToggle, useCrudDelete, useCrudItem } from '../../../shared/crud';
import { SenderProfileCard } from './components/SenderProfileCard';
import { TextPreviewCard } from './components/TextPreviewCard';
import { EmailPreviewCard } from './components/EmailPreviewCard';
import { KakaoPreviewCard } from './components/KakaoPreviewCard';
import {
  ALIMTALK_APPROVAL_LABEL,
  ALIMTALK_EMPHASIS_TYPE_LABEL,
  ALIMTALK_MESSAGE_TYPE_LABEL,
  BRAND_MESSAGE_SEND_WINDOW_LABEL,
  BRAND_MESSAGE_TYPE_LABEL,
} from './kakao';
import type { AlimtalkApprovalStatus } from './kakao';
import {
  DETAIL_KIND_LABEL,
  DETAIL_LABEL_AD,
  DETAIL_LABEL_APPROVAL,
  DETAIL_LABEL_KAKAO_CHANNEL,
  DETAIL_LABEL_KAKAO_TYPE,
  DETAIL_LABEL_REJECT_REASON,
  DETAIL_LABEL_SEND_WINDOW,
  DETAIL_LABEL_SENT,
  DETAIL_LABEL_CREATED_AT,
  DETAIL_LABEL_CREATED_BY,
  DETAIL_LABEL_EDITED_AT,
  DETAIL_LABEL_EDITED_BY,
  DETAIL_LABEL_SENDER,
  DETAIL_LABEL_STATUS,
  DETAIL_LABEL_TEXT_TYPE,
  DETAIL_LABEL_TYPE,
  DETAIL_STATUS_HISTORY,
  detailKindEyebrowOf,
} from './copy';
import {
  MESSAGE_TEMPLATE_LIST_PATH,
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
  messageTemplateEditPath,
} from './data-source';
import {
  kakaoChannelName,
  listKakaoChannels,
  listSenderProfiles,
  senderProfileName,
  setMessageTemplateStatus,
} from './store';
import type { MessageTemplateDraft } from './store';
import { actionsFor, publishedStatusOf, statusToneOf, toggledStatusOf } from './status';
import {
  accentTitleStyle,
  centerColumnStyle,
  editorPageStyle,
  sideColumnStyle,
  threeColumnStyle,
} from './styles';
import { TEMPLATE_STATUS_LABEL, templateKindOf } from './types';
import type { MessageTemplate, TemplateContent, TemplateStatus } from './types';
import { cssVar, typography } from '@tds/ui';

const ENTITY_LABEL = '메시지 템플릿';

/**
 * 심사 상태 배지의 색 의도 — 반려만 붉게 둔다(고쳐야 할 것이 있는 유일한 상태다).
 * 발행 상태의 statusToneOf 와 **별개 함수**인 것이 요점이다: 두 축은 서로 다른 것을 말한다.
 */
function approvalToneOf(status: AlimtalkApprovalStatus): StatusTone {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return status === 'inspecting' ? 'info' : 'neutral';
}

/** 읽기 전용 표면이라 편집 콜백은 전부 무시한다 — 잠근 카드가 요구하는 모양만 채운다 */
const noop = (): void => undefined;

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const titleColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
  overflowWrap: 'anywhere',
};

const eyebrowStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
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

/** 값은 오른쪽 정렬 — 목업의 라벨/값 표 */
const valueStyle: CSSProperties = { ...ddStyle, textAlign: 'right' };

/** 삭제는 되돌릴 수 없다 — 붉은 테두리 버튼으로 다른 액션과 시각적으로 갈라 놓는다 */
const destructiveStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('component.button.gap'),
  paddingTop: cssVar('component.button.padding-y'),
  paddingBottom: cssVar('component.button.padding-y'),
  paddingLeft: cssVar('component.button.padding-x'),
  paddingRight: cssVar('component.button.padding-x'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.feedback.danger.border'),
  borderRadius: cssVar('component.button.radius'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.feedback.danger.text'),
  ...typography('typography.label.md'),
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

/**
 * 왼쪽 카드의 둘째 칸이 무엇인가 — 종류가 정한다.
 *
 * 이메일에 발신번호가 '비어 있는' 것이 아니라 **없는 개념**인 것과 같은 이유로, 카카오에는
 * 발신번호도 발신 주소도 없고 대신 발신 채널이 있다(SenderProfileCard 머리말).
 * switch 라 종류가 하나 더 늘면 컴파일 오류로 이 자리가 드러난다.
 */
function senderChannelOf(content: TemplateContent) {
  switch (content.kind) {
    case 'text':
      return { kind: 'text', phone: content.senderPhone } as const;
    case 'email':
      return { kind: 'email', email: content.senderEmail } as const;
    case 'alimtalk':
    case 'brandmessage':
      return {
        kind: 'kakao',
        channelId: content.channelId,
        channels: listKakaoChannels(),
      } as const;
  }
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div style={{ display: 'contents' }}>
      <dt style={dtStyle}>{label}</dt>
      <dd style={valueStyle}>{children}</dd>
    </div>
  );
}

export default function MessageTemplateDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const client = useQueryClient();

  const detail = useCrudItem<MessageTemplate, MessageTemplateDraft>(
    MESSAGE_TEMPLATE_RESOURCE,
    messageTemplateAdapter,
    id,
  );
  const template = detail.data;

  /**
   * 상태 변경 — 어댑터의 update 를 쓰지 않고 store 의 상태 전용 함수를 부른다(머리말 참고).
   * TODO(backend): PATCH /api/marketing/message-templates/:id/status
   */
  const changeStatus = useMutation({
    mutationFn: (next: TemplateStatus) => {
      setMessageTemplateStatus(id, next);
      return Promise.resolve();
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [MESSAGE_TEMPLATE_RESOURCE] });
    },
  });

  /**
   * 상태 변경의 유일한 입구 — 토글과 '발행' 버튼이 **같은 문**을 지난다.
   * 컨트롤을 없앤 술어(canUpdate)가 여기서 요청을 거절하므로 둘이 갈라질 수 없다.
   */
  const requestStatus = (next: TemplateStatus) => {
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
    changeStatus.mutate(next);
  };

  const remove = useCrudDelete<MessageTemplate, MessageTemplateDraft>(
    MESSAGE_TEMPLATE_RESOURCE,
    messageTemplateAdapter,
  );

  /**
   * [EXC-03] 이 상세의 액션은 서로 다른 권한을 탄다 — 사용 토글·발행·수정은 update, 삭제는 remove.
   *
   * 이 화면은 껍데기를 쓰지 않아 게이팅을 하나도 받지 못했다. 그런데 여기 '발행' 은 **실제 발송에
   * 쓰이는 템플릿을 살아 있게 만드는** 조작이고, 사용 토글은 그것을 즉시 끄고 켠다.
   *
   * [도메인 잠금과 권한 잠금은 다르다] `actionsFor(status)` 는 **상태가 허용하는가**를 말하고
   * (초안은 삭제할 수 있지만 승인 대기 중인 알림톡은 아니다), 이 두 값은 **내가 해도 되는가**를
   * 말한다. 둘 다 통과해야 컨트롤이 존재한다 — 순서는 권한이 먼저다.
   */
  const { canUpdate, canRemove } = useRouteWritePermissions();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    remove.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const confirmDelete = () => {
    if (template === undefined) return;
    // 휴지통을 없앤 술어가 삭제 경로도 막는다 (EXC-03)
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    remove.mutate(
      { id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success(`'${template.name}'을(를) 삭제했어요.`);
          navigate(MESSAGE_TEMPLATE_LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  if (detail.error !== null) {
    return (
      <Alert tone="danger">
        <div style={alertActionRowStyle}>
          <span>{ENTITY_LABEL}을(를) 불러오지 못했어요. 이미 삭제되었을 수 있어요.</span>
          <Button variant="secondary" onClick={() => navigate(MESSAGE_TEMPLATE_LIST_PATH)}>
            목록으로
          </Button>
        </div>
      </Alert>
    );
  }

  if (template === undefined) return null;

  const kind = templateKindOf(template);
  const actions = actionsFor(template.status);
  const busy = changeStatus.isPending || remove.isPending;

  return (
    <div style={editorPageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(MESSAGE_TEMPLATE_LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div style={headerStyle}>
        <div style={titleColumnStyle}>
          <span style={eyebrowStyle}>{detailKindEyebrowOf(kind)}</span>
          <h1 style={titleStyle}>{template.name}</h1>
        </div>

        <div style={actionsStyle}>
          {actions.canToggleActive && (
            /* 토글에는 보이는 라벨이 없다 — 무엇을 켜는지는 접근성 이름이 말한다 (A11Y).
               권한이 없으면 스위치는 사라지고 '지금 사용 중인가' 라는 사실만 배지로 남는다
               (shared/crud/RowToggle 이 그 규칙의 정본이다). */
            <RowToggle
              checked={template.status === 'active'}
              busy={busy}
              canUpdate={canUpdate}
              label={`'${template.name}' 발송 사용 여부`}
              onLabel="ON"
              offLabel="OFF"
              onChange={() => requestStatus(toggledStatusOf(template.status))}
            />
          )}

          {actions.canDelete && canRemove && (
            <button
              type="button"
              className="tds-ui-focusable"
              style={destructiveStyle}
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              <Icon name="trash" />
              삭제
            </button>
          )}

          {actions.canEdit && canUpdate && (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => navigate(messageTemplateEditPath(template.id))}
            >
              수정
            </Button>
          )}

          {actions.canPublish && canUpdate && (
            <Button
              variant="primary"
              size="md"
              disabled={busy}
              onClick={() => requestStatus(publishedStatusOf(template.status))}
            >
              발행
            </Button>
          )}
        </div>
      </div>

      <div style={threeColumnStyle}>
        <div style={sideColumnStyle}>
          <SenderProfileCard
            profiles={listSenderProfiles()}
            profileId={template.senderProfileId}
            /*
             * 둘째 칸은 종류가 정한다 — 문자면 발신번호, 이메일이면 발신 주소.
             * 예전에는 이메일에도 번호 칸을 그리고 값만 빈 문자열로 넘겼다. 그러면 이메일 상세가
             * '발신번호: (비어 있음)' 을 보여 준다 — 이메일에 발신번호는 **비어 있는 것이 아니라
             * 없는 개념**이다(SenderProfileCard 머리말).
             */
            channel={senderChannelOf(template.content)}
            // 상세는 읽기 전용이다 — 같은 카드를 잠근 모습으로 쓴다(SenderProfileCard 머리말)
            disabled
            onProfileChange={noop}
            onChannelChange={noop}
          />
        </div>

        <div style={centerColumnStyle}>
          <Card>
            <CardTitle>
              <span style={accentTitleStyle}>{DETAIL_STATUS_HISTORY}</span>
            </CardTitle>
            <dl style={dlStyle}>
              <Row label={DETAIL_LABEL_STATUS}>
                <StatusBadge
                  tone={statusToneOf(template.status)}
                  label={TEMPLATE_STATUS_LABEL[template.status]}
                />
              </Row>
              <Row label={DETAIL_LABEL_TYPE}>{DETAIL_KIND_LABEL[kind]}</Row>
              {/* 대행사 회선은 문자에만 있는 개념이다 — 이메일에는 이 줄 자체를 그리지 않는다 */}
              {template.content.kind === 'text' && (
                <Row label={DETAIL_LABEL_TEXT_TYPE}>{template.content.vendor}</Row>
              )}

              {/* ── 카카오 전용 줄 ────────────────────────────────────────────
                  없는 개념은 빈 값으로 그리지 않고 줄째 그리지 않는다 — '심사 상태: —' 는
                  이메일에 심사가 있는데 값이 없다는 뜻으로 읽힌다(SenderProfileCard 머리말). */}
              {(template.content.kind === 'alimtalk' ||
                template.content.kind === 'brandmessage') && (
                <Row label={DETAIL_LABEL_KAKAO_CHANNEL}>
                  {kakaoChannelName(template.content.channelId)}
                </Row>
              )}

              {template.content.kind === 'alimtalk' && (
                <>
                  <Row label={DETAIL_LABEL_KAKAO_TYPE}>
                    {/* 두 축을 함께 읽어야 이 템플릿의 모양을 안다 — 한쪽만 적으면 절반이다 */}
                    {`${ALIMTALK_MESSAGE_TYPE_LABEL[template.content.messageType]} · ${
                      ALIMTALK_EMPHASIS_TYPE_LABEL[template.content.emphasisType]
                    }`}
                  </Row>
                  <Row label={DETAIL_LABEL_APPROVAL}>
                    <StatusBadge
                      tone={approvalToneOf(template.content.approvalStatus)}
                      label={ALIMTALK_APPROVAL_LABEL[template.content.approvalStatus]}
                    />
                  </Row>
                  {/* 발송 이력은 '수정할 수 있는가' 를 가르는 사실이라 상세가 드러내야 한다 */}
                  <Row label={DETAIL_LABEL_SENT}>
                    {template.content.hasBeenSent ? '발송됨 (수정 불가)' : '발송 전'}
                  </Row>
                  {template.content.approvalStatus === 'rejected' &&
                    template.content.rejectReason.trim() !== '' && (
                      <Row label={DETAIL_LABEL_REJECT_REASON}>{template.content.rejectReason}</Row>
                    )}
                </>
              )}

              {template.content.kind === 'brandmessage' && (
                <>
                  <Row label={DETAIL_LABEL_KAKAO_TYPE}>
                    {BRAND_MESSAGE_TYPE_LABEL[template.content.bodyType]}
                  </Row>
                  <Row label={DETAIL_LABEL_AD}>{template.content.isAd ? '광고성' : '정보성'}</Row>
                  {/* 알림톡에는 없는 제약이라 이 종류에서만 적는다 */}
                  <Row label={DETAIL_LABEL_SEND_WINDOW}>{BRAND_MESSAGE_SEND_WINDOW_LABEL}</Row>
                </>
              )}
              <Row label={DETAIL_LABEL_SENDER}>{senderProfileName(template.senderProfileId)}</Row>
              <Row label={DETAIL_LABEL_CREATED_BY}>{template.createdBy}</Row>
              <Row label={DETAIL_LABEL_CREATED_AT}>{formatDateTime(template.createdAt)}</Row>
              <Row label={DETAIL_LABEL_EDITED_BY}>{template.lastEditedBy}</Row>
              <Row label={DETAIL_LABEL_EDITED_AT}>{formatDateTime(template.lastEditedAt)}</Row>
            </dl>
          </Card>
        </div>

        <div style={sideColumnStyle}>
          {/*
            미리보기도 종류마다 통째로 다른 물건이다. 이메일만 편집기를 잠가서 놓지 않는다 —
            좁은 우측 칸에 프리셋 레일·툴바·STYLE 패널까지 딸려와 화면이 찌그러진다. 렌더링
            정본은 그대로 EmailCanvas 다 (EmailPreviewCard 머리말 참고).
          */}
          {template.content.kind === 'text' && (
            <TextPreviewCard
              subject={template.content.subject}
              body={template.content.body}
              imageFileName={template.content.imageFileName}
              senderPhone={template.content.senderPhone}
            />
          )}
          {template.content.kind === 'email' && (
            <EmailPreviewCard
              value={template.content}
              senderProfiles={listSenderProfiles()}
              senderProfileId={template.senderProfileId}
            />
          )}
          {(template.content.kind === 'alimtalk' || template.content.kind === 'brandmessage') && (
            <KakaoPreviewCard
              content={template.content}
              channelName={kakaoChannelName(template.content.channelId)}
            />
          )}
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          intent="delete"
          title={`${ENTITY_LABEL} 삭제`}
          message={`'${template.name}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          busy={remove.isPending}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
