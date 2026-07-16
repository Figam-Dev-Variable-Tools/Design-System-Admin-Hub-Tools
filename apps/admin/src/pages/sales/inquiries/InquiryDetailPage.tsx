// InquiryDetailPage — 문의 상세·처리 (라우트: /sales/inquiries/:id) · A41 소유
//
// 문의 정보 + 대화 타임라인 + 담당 배정 + 상태 전이 + 답변/내부메모 작성(append). 저장은 프레임워크
// 저수준 훅(useCrudUpdate). 삭제는 없다(문의는 고객이 만들고 관리자는 처리만 한다).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { directionParticle, formatDateTime } from '../../../shared/format';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  controlStyle,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  pageTitleStyle,
  SelectField,
  StatusBadge,
  TextareaField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudUpdate } from '../../../shared/crud';
import { inquiryAdapter } from './data-source';
import { InquiryTimeline } from './components/InquiryTimeline';
import {
  appendEvent,
  hasIssuedQuote,
  INQUIRY_REPLY_MAX,
  INQUIRY_STATUS_OPTIONS,
  inquiryChannelLabel,
  inquiryPriorityLabel,
  inquiryPriorityTone,
  inquiryStatusLabel,
  inquiryTypeLabel,
  isInquiryStatus,
  requestsQuoteIssue,
  toInquiryInput,
} from './types';
import type { InquiryEvent, InquiryEventKind, InquiryStatus } from './types';

const RESOURCE = 'sales-inquiries';
const LIST_PATH = '/sales/inquiries';
const QUOTE_PATH = '/sales/quotes';
const ADMIN_AUTHOR = '관리자';
const UNSAVED_MESSAGE =
  '처리 내용에 저장하지 않은 변경이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 12), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
};

const composerHeadStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => inquiryAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const inquiry = detailQuery.data;

  const update = useCrudUpdate(RESOURCE, inquiryAdapter);
  const saving = update.isPending;

  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<InquiryStatus>('received');
  const [composerKind, setComposerKind] = useState<InquiryEventKind>('reply');
  const [composer, setComposer] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (inquiry === undefined) return;
    setAssignee(inquiry.assignee);
    setStatus(inquiry.status);
  }, [inquiry]);

  const dirty = useMemo(() => {
    if (inquiry === undefined) return false;
    return assignee !== inquiry.assignee || status !== inquiry.status || composer.trim() !== '';
  }, [inquiry, assignee, status, composer]);

  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  const issued = inquiry !== undefined && hasIssuedQuote(inquiry);
  // 이번 저장에서 견적이 실제로 생성되는가 — 이미 발행됐으면 상태를 다시 골라도 생성되지 않는다.
  const issuesQuoteNow = inquiry !== undefined && requestsQuoteIssue(status) && !issued;

  const onSave = () => {
    if (inquiry === undefined || id === undefined) return;
    setServerError(null);
    const now = new Date().toISOString();
    let timeline = inquiry.timeline;

    if (status !== inquiry.status) {
      // [ERP-13] 조사는 shared/format 이 런타임에 고른다 — 문형을 비트는 대신 조사를 계산한다.
      const statusText = inquiryStatusLabel(status);
      const statusEvent: InquiryEvent = {
        id: `ev-${String(Date.now())}-s`,
        at: now,
        author: ADMIN_AUTHOR,
        kind: 'status',
        text: `상태를 '${statusText}'${directionParticle(statusText)} 변경`,
      };
      timeline = appendEvent(timeline, statusEvent);
    }
    if (composer.trim() !== '') {
      const composerEvent: InquiryEvent = {
        id: `ev-${String(Date.now())}-c`,
        at: now,
        author: ADMIN_AUTHOR,
        kind: composerKind,
        text: composer.trim(),
      };
      timeline = appendEvent(timeline, composerEvent);
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      {
        id,
        input: { ...toInquiryInput(inquiry), assignee: assignee.trim(), status, timeline },
        signal: controller.signal,
      },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setComposer('');
          // 견적이 새로 발행됐는지는 저장 전 상태로 판단한다 — 이미 발행된 문의는 재저장해도 생성되지 않는다.
          toast.success(
            issuesQuoteNow
              ? '문의 처리 내용을 저장하고 견적을 발행했습니다.'
              : '문의 처리 내용을 저장했습니다.',
          );
          void detailQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  if (detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>문의를 불러오지 못했습니다. </span>
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
        <h1 style={pageTitleStyle}>문의 처리</h1>
      </div>

      {inquiry === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: 'var(--tds-color-text-muted)' }}>불러오는 중…</p>
        </Card>
      ) : (
        <div style={layoutStyle}>
          <Card>
            <CardTitle>
              {inquiry.title}
              <StatusBadge
                tone={inquiryPriorityTone(inquiry.priority)}
                label={inquiryPriorityLabel(inquiry.priority)}
              />
            </CardTitle>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            <div style={badgeRowStyle}>
              <StatusBadge tone="neutral" label={inquiryTypeLabel(inquiry.type)} />
              <StatusBadge tone="info" label={inquiryChannelLabel(inquiry.channel)} />
            </div>

            <dl style={dlStyle}>
              <dt style={dtStyle}>문의번호</dt>
              <dd style={ddStyle}>{inquiry.inquiryNo}</dd>
              <dt style={dtStyle}>고객</dt>
              <dd style={ddStyle}>{inquiry.customerName}</dd>
              <dt style={dtStyle}>거래처</dt>
              <dd style={ddStyle}>{inquiry.company}</dd>
              <dt style={dtStyle}>연락처</dt>
              <dd style={ddStyle}>{inquiry.contact}</dd>
              <dt style={dtStyle}>접수일시</dt>
              <dd style={ddStyle}>{formatDateTime(inquiry.receivedAt)}</dd>
              <dt style={dtStyle}>문의내용</dt>
              <dd style={ddStyle}>{inquiry.body}</dd>
            </dl>

            <div style={rowStyle}>
              <FormField htmlFor="inquiry-assignee" label="담당 배정">
                <input
                  id="inquiry-assignee"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  value={assignee}
                  placeholder="담당자 이름"
                  disabled={saving}
                  onChange={(event) => setAssignee(event.target.value)}
                />
              </FormField>
              <FormField
                htmlFor="inquiry-status"
                label="처리 상태"
                hint={
                  issued
                    ? '이미 견적이 발행된 문의입니다 — 다시 발행되지 않습니다.'
                    : '‘견적 발행’으로 바꾸면 견적이 자동 생성됩니다.'
                }
              >
                <SelectField
                  id="inquiry-status"
                  value={status}
                  disabled={saving}
                  onChange={(event) => {
                    if (isInquiryStatus(event.target.value)) setStatus(event.target.value);
                  }}
                >
                  {INQUIRY_STATUS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            {/* [중복 발행 방지] 이미 발행된 문의는 재생성하지 않는다 — 왜 버튼이 다시 만들지 않는지
                운영자에게 알리고, 대신 그 견적으로 가는 길을 준다(양방향 링크). */}
            {issued && (
              <Alert tone="info">
                <div style={alertActionRowStyle}>
                  <span>이미 이 문의로 견적이 발행되었습니다. 견적은 다시 생성되지 않습니다.</span>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`${QUOTE_PATH}/${inquiry.quoteId}/edit`)}
                  >
                    발행된 견적 보기
                  </Button>
                </div>
              </Alert>
            )}

            {issuesQuoteNow && (
              <Alert tone="info">
                저장하면 이 문의의 거래처·담당자·문의내용을 승계한 견적이 자동 생성됩니다.
              </Alert>
            )}

            <div style={fieldStyle}>
              <span style={fieldLabelStyle}>답변 · 메모 작성</span>
              <div style={composerHeadStyle}>
                <Button
                  type="button"
                  variant={composerKind === 'reply' ? 'primary' : 'secondary'}
                  disabled={saving}
                  onClick={() => setComposerKind('reply')}
                >
                  고객답변
                </Button>
                <Button
                  type="button"
                  variant={composerKind === 'note' ? 'primary' : 'secondary'}
                  disabled={saving}
                  onClick={() => setComposerKind('note')}
                >
                  내부메모
                </Button>
              </div>
              <TextareaField
                label={composerKind === 'reply' ? '고객답변 내용' : '내부메모 내용'}
                value={composer}
                onChange={setComposer}
                maxLength={INQUIRY_REPLY_MAX}
                disabled={saving}
                placeholder={
                  composerKind === 'reply'
                    ? '고객에게 전달할 답변을 입력하세요.'
                    : '내부 공유용 처리 메모를 입력하세요.'
                }
                rows={4}
              />
            </div>

            <div style={actionsStyle}>
              <Button variant="secondary" disabled={saving} onClick={() => navigate(LIST_PATH)}>
                목록으로
              </Button>
              <Button variant="primary" size="md" disabled={saving || !dirty} onClick={onSave}>
                {saving ? '저장 중…' : '처리 저장'}
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>처리 이력</CardTitle>
            <InquiryTimeline events={inquiry.timeline} />
          </Card>
        </div>
      )}

      {unsavedDialog}
    </div>
  );
}
