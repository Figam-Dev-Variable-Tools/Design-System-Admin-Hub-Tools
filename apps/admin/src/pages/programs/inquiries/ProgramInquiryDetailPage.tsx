// ProgramInquiryDetailPage — 프로그램 문의 상세·답변 (라우트: /programs/inquiries/:id)
//
// 문의 내용 + 문의자 정보 + 답변 작성/수정 + 상태 전환(답변 착수·종결) + 처리 이력.
// 저장은 프레임워크 저수준 훅(useCrudUpdate). 삭제는 없다 — 문의는 후원자가 남긴 기록이다.
//
// [상태는 버튼이 아니라 규칙이 정한다] '답변 완료' 를 직접 고르는 select 를 두지 않는다. 답변을
// 저장하면 상태가 따라 넘어가고(_shared/store 의 applyProgramAnswer), 종결은 답변이 나간 뒤에만
// 열린다. 화면이 상태를 자유롭게 고르게 두면 '답변 없이 답변 완료' 가 만들어지고, 그 순간 목록의
// 미답변 집계와 경과 문구가 전부 거짓말이 된다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatDateTime } from '../../../shared/format';
import { isNotFound } from '../../../shared/errors/http-error';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  hintStyle,
  Icon,
  pageTitleStyle,
  StatusBadge,
  TextareaField,
  Timeline,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudUpdate } from '../../../shared/crud';
import { PROGRAM_INQUIRY_RESOURCE, programInquiryAdapter } from './data-source';
import {
  applyProgramAnswer,
  applyProgramBeginAnswering,
  applyProgramClose,
  canAnswerProgramInquiry,
  canBeginAnsweringProgramInquiry,
  canCloseProgramInquiry,
  PROGRAM_INQUIRY_ANSWER_MAX,
  toProgramInquiryInput,
} from './_shared/store';
import type { ProgramInquiry } from './_shared/store';
import {
  elapsedLabel,
  elapsedTone,
  programInquiryChannelLabel,
  programInquiryHistory,
  programInquiryStatusLabel,
  programInquiryStatusTone,
  programInquiryTopicLabel,
  programInquiryTopicTone,
} from './types';
import { programAnswerError } from './validation';

const LIST_PATH = '/programs/inquiries';
/** 경과 기준일 — 목록과 같은 값을 쓴다(두 화면이 다른 날짜를 말하면 안 된다) */
const TODAY = '2026-07-21';
const UNSAVED_MESSAGE =
  '작성 중인 답변이 저장되지 않았습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
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
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 12), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 후원자가 쓴 글은 줄바꿈이 의미다 — 문단을 뭉개지 않는다 */
const messageStyle: CSSProperties = {
  whiteSpace: 'pre-wrap',
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

export default function ProgramInquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useQuery({
    queryKey: [PROGRAM_INQUIRY_RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => programInquiryAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const inquiry = detailQuery.data;

  const update = useCrudUpdate(PROGRAM_INQUIRY_RESOURCE, programInquiryAdapter);
  const saving = update.isPending;

  const [answer, setAnswer] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 로드되면 편집 상태를 채운다 — 이미 답변한 문의는 그 답변이 폼의 출발점이다(수정 흐름)
  useEffect(() => {
    if (inquiry === undefined) return;
    setAnswer(inquiry.answer);
  }, [inquiry]);

  const dirty = inquiry !== undefined && answer.trim() !== inquiry.answer;
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  const history = useMemo(
    () => (inquiry === undefined ? [] : programInquiryHistory(inquiry)),
    [inquiry],
  );

  /**
   * 저장의 단일 경로 — 답변도 상태 전환도 '다음 문의 한 벌' 을 만들어 통째로 보낸다.
   * 세 동작이 각자 mutate 를 배선하면 성공/실패 처리와 abort 정리가 셋으로 갈라진다.
   */
  const commit = (next: ProgramInquiry, message: string) => {
    if (id === undefined) return;
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      { id, input: toProgramInquiryInput(next), signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success(message);
          void detailQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onSaveAnswer = () => {
    if (inquiry === undefined || !canAnswerProgramInquiry(inquiry.status)) return;
    // 판정은 zod 스키마가 한다 — 화면이 자기 조건문으로 다시 판단하면 규칙이 둘로 갈라진다
    const invalid = programAnswerError(answer);
    if (invalid !== null) {
      setFieldError(invalid);
      return;
    }
    setFieldError(null);
    const first = inquiry.answeredAt === '';
    commit(
      applyProgramAnswer(inquiry, answer, new Date().toISOString()),
      first ? '답변을 저장하고 답변 완료로 변경했습니다.' : '답변을 수정했습니다.',
    );
  };

  const onBeginAnswering = () => {
    if (inquiry === undefined || !canBeginAnsweringProgramInquiry(inquiry.status)) return;
    commit(applyProgramBeginAnswering(inquiry), '답변 중으로 변경했습니다.');
  };

  const onClose = () => {
    if (inquiry === undefined || !canCloseProgramInquiry(inquiry.status)) return;
    commit(applyProgramClose(inquiry), '문의를 종결했습니다.');
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 지워진 문의에 '다시 시도' 는 영원히 실패한다.
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '문의를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '문의를 불러오지 못했습니다.'}
            </span>
            {!notFound && (
              <Button variant="secondary" onClick={() => void detailQuery.refetch()}>
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
        <h1 style={pageTitleStyle}>프로그램 문의 처리</h1>
      </div>

      {inquiry === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      ) : (
        <div style={layoutStyle}>
          <Card>
            <CardTitle>
              {inquiry.subject}
              <StatusBadge
                tone={programInquiryStatusTone(inquiry.status)}
                label={programInquiryStatusLabel(inquiry.status)}
              />
            </CardTitle>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            <div style={badgeRowStyle}>
              <StatusBadge
                tone={programInquiryTopicTone(inquiry.topic)}
                label={programInquiryTopicLabel(inquiry.topic)}
              />
              <StatusBadge tone="info" label={programInquiryChannelLabel(inquiry.channel)} />
              <StatusBadge
                tone={elapsedTone(inquiry, TODAY)}
                label={elapsedLabel(inquiry, TODAY)}
              />
            </div>

            <dl style={dlStyle}>
              <dt style={dtStyle}>문의번호</dt>
              <dd style={ddStyle}>{inquiry.id}</dd>
              <dt style={dtStyle}>프로그램</dt>
              <dd style={ddStyle}>{inquiry.programName}</dd>
              <dt style={dtStyle}>접수일시</dt>
              <dd style={ddStyle}>{formatDateTime(inquiry.createdAt)}</dd>
              <dt style={dtStyle}>답변일시</dt>
              <dd style={ddStyle}>
                {inquiry.answeredAt === '' ? '미답변' : formatDateTime(inquiry.answeredAt)}
              </dd>
              <dt style={dtStyle}>문의 내용</dt>
              <dd style={ddStyle}>
                <span style={messageStyle}>{inquiry.message}</span>
              </dd>
            </dl>

            {/* 답변은 후원자에게 그대로 나가는 글이다 — 종결된 문의는 기록이라 손대지 않는다 */}
            {canAnswerProgramInquiry(inquiry.status) ? (
              <TextareaField
                label={inquiry.answer === '' ? '답변 작성' : '답변 수정'}
                value={answer}
                onChange={(next) => {
                  setAnswer(next);
                  setFieldError(null);
                }}
                maxLength={PROGRAM_INQUIRY_ANSWER_MAX}
                disabled={saving || !canUpdate}
                error={fieldError ?? undefined}
                hint="저장하면 상태가 '답변 완료' 로 넘어갑니다."
                placeholder="후원자에게 전달할 답변을 입력하세요."
                rows={6}
              />
            ) : (
              <>
                <span style={fieldLabelStyle}>발송한 답변</span>
                <p style={messageStyle}>{inquiry.answer}</p>
                <p style={hintStyle}>종결된 문의라 답변을 수정할 수 없습니다.</p>
              </>
            )}

            {!canUpdate && (
              <Alert tone="info">이 문의에 답변할 권한이 없습니다. 조회만 가능합니다.</Alert>
            )}

            <div style={actionsStyle}>
              <Button variant="secondary" disabled={saving} onClick={() => navigate(LIST_PATH)}>
                목록으로
              </Button>
              {/* 누를 수 없는 것을 보여 주지 않는다 (EXC-03) — 권한과 전이 규칙이 함께 결정한다 */}
              {canUpdate && canBeginAnsweringProgramInquiry(inquiry.status) && (
                <Button variant="secondary" disabled={saving} onClick={onBeginAnswering}>
                  답변 착수
                </Button>
              )}
              {canUpdate && canCloseProgramInquiry(inquiry.status) && (
                <Button variant="secondary" disabled={saving} onClick={onClose}>
                  문의 종결
                </Button>
              )}
              {canUpdate && canAnswerProgramInquiry(inquiry.status) && (
                <Button
                  variant="primary"
                  size="md"
                  loading={saving}
                  disabled={saving || !dirty}
                  onClick={onSaveAnswer}
                >
                  답변 저장
                </Button>
              )}
            </div>
          </Card>

          <div style={pageStyle}>
            <Card>
              <CardTitle>문의자 정보</CardTitle>
              <dl style={dlStyle}>
                <dt style={dtStyle}>문의자</dt>
                <dd style={ddStyle}>{inquiry.customerName}</dd>
                <dt style={dtStyle}>연락처</dt>
                <dd style={ddStyle}>{inquiry.customerContact}</dd>
                <dt style={dtStyle}>문의 유형</dt>
                <dd style={ddStyle}>{programInquiryTopicLabel(inquiry.topic)}</dd>
                <dt style={dtStyle}>유입 채널</dt>
                <dd style={ddStyle}>{programInquiryChannelLabel(inquiry.channel)}</dd>
              </dl>
              <p style={hintStyle}>
                답변은 위 연락처로 회신됩니다. 결제대행을 끈 프로그램은 후원하기 대신 문의하기
                버튼이 노출됩니다.
              </p>
            </Card>

            <Card>
              <CardTitle>처리 이력</CardTitle>
              <Timeline events={history} label="프로그램 문의 처리 이력" />
            </Card>
          </div>
        </div>
      )}

      {unsavedDialog}
    </div>
  );
}
