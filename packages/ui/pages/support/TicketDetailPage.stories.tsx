/**
 * Design System/Templates/Support/Ticket Detail — 1:1 문의 처리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/support/tickets/:id` → 메뉴 en = "Support"(고객센터). 목록은 같은
 * 카테고리의 Support/Ticket List 스토리에 있다(packages/ui/pages/_data/pages.ts 의 Support 그룹).
 *
 * 대응 실화면: apps/admin/src/pages/support/tickets/TicketDetailPage.tsx (라우트 /support/tickets/:id)
 * 와 그 본문 조각 components/TicketWorkspace.tsx · components/TicketTimeline.tsx. 상세는 저장이 없는
 * 삭제 대신 '처리'(담당 배정·상태 전이·고객답변/내부메모 작성)를 하고, 종결은 되돌릴 수 없어 확인을 받는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 조각 ↔ DS 컴포넌트 매핑:
 *   뒤로가기(button)              → Button(ghost) + Icon(chevron-left)
 *   좌/우 2단 작업 영역            → 토큰만 쓴 grid + Card ×2
 *   카드 제목(CardTitle · 앱)      → 토큰만 쓴 <h2>(DS Card 는 표면만 소유 — 신규 컴포넌트 아님)
 *   제목·우선순위·유형·채널·SLA 배지 → StatusBadge
 *   문의 정보(읽기 전용)           → dl/dt/dd (토큰 레이아웃)
 *   담당 배정                      → TextField(오류 슬롯)
 *   처리 상태 전이                 → FormField + SelectField (허용 다음 상태만)
 *   답변/메모 종류 전환            → Button ×2 (primary/secondary 토글)
 *   답변 템플릿 삽입               → FormField + SelectField
 *   답변·메모 작성                 → TextareaField
 *   저장 실패 배너                 → Alert(danger)
 *   처리 이력(대화 타임라인)       → Timeline (TicketTimeline 이 이벤트를 표시용으로 매핑한 결과 미러)
 *   종결 확인(되돌릴 수 없음)      → ConfirmDialog(intent=update)
 *   조회 실패                      → Alert(danger) + 목록으로 Button
 *
 * SLA·상태 전이·라벨/톤 규칙은 실화면 support/_shared/domain.ts 순수 규칙을 값으로 미러한다(@tds/ui
 * 경계라 직접 import 불가). 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 cssVar/typography·rem 만 참조.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  inlineBadgeRowStyle,
  formRowStyle,
  Icon,
  SelectField,
  StatusBadge,
  TextField,
  TextareaField,
  Timeline,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TimelineEvent } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Ticket Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 라벨·톤·전이 규칙 (실화면 support/_shared/domain.ts 미러) ────────────────────────── */

type TicketChannel = 'web' | 'kakao' | 'naver' | 'phone' | 'email';
type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';
type TicketStatus = 'received' | 'assigned' | 'in_progress' | 'answered' | 'closed';
type TicketEventKind = 'received' | 'assign' | 'note' | 'reply' | 'status';
type ComposerKind = 'reply' | 'note';

const CHANNEL_LABEL: Record<TicketChannel, string> = {
  web: '웹',
  kakao: '카카오톡',
  naver: '네이버톡톡',
  phone: '전화',
  email: '이메일',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  urgent: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  received: '접수',
  assigned: '배정',
  in_progress: '처리중',
  answered: '답변완료',
  closed: '종결',
};

const EVENT_LABEL: Record<TicketEventKind, string> = {
  received: '접수',
  assign: '배정',
  note: '내부메모',
  reply: '고객답변',
  status: '상태변경',
};

const priorityTone = (priority: TicketPriority): StatusBadgeTone => {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'neutral';
  return 'info';
};

const eventTone = (kind: TicketEventKind): StatusBadgeTone => {
  if (kind === 'reply') return 'success';
  if (kind === 'status' || kind === 'assign') return 'info';
  if (kind === 'note') return 'warning';
  return 'neutral';
};

/** 각 상태에서 넘어갈 수 있는 다음 상태들 — 종결은 종착(전이 없음). 실화면 STATUS_FLOW 미러 */
const STATUS_FLOW: Record<TicketStatus, readonly TicketStatus[]> = {
  received: ['assigned', 'closed'],
  assigned: ['in_progress', 'closed'],
  in_progress: ['answered', 'closed'],
  answered: ['closed', 'in_progress'],
  closed: [],
};

const allowedNextStatuses = (current: TicketStatus): readonly TicketStatus[] => [
  current,
  ...STATUS_FLOW[current],
];

const statusRequiresAssignee = (status: TicketStatus): boolean =>
  status === 'in_progress' || status === 'answered';

const isTicketStatus = (value: string): value is TicketStatus => value in STATUS_LABEL;

/* ── SLA (첫 응답 목표시간) 미러 ──────────────────────────────────────────────────────────────── */

type SlaState = 'met' | 'breached' | 'due_soon' | 'on_track';

const HOUR_MS = 60 * 60 * 1000;
const SLA_TARGET_HOURS: Record<TicketPriority, number> = {
  urgent: 1,
  high: 4,
  normal: 24,
  low: 72,
};
const SLA_DUE_SOON_RATIO = 0.25;
const SLA_TONE: Record<SlaState, StatusBadgeTone> = {
  met: 'success',
  breached: 'danger',
  due_soon: 'warning',
  on_track: 'neutral',
};
const SLA_LABEL: Record<SlaState, string> = {
  met: '응답완료',
  breached: 'SLA 초과',
  due_soon: 'SLA 임박',
  on_track: '정상',
};

function slaState(receivedMs: number, priority: TicketPriority, status: TicketStatus): SlaState {
  if (status === 'answered' || status === 'closed') return 'met';
  const windowMs = SLA_TARGET_HOURS[priority] * HOUR_MS;
  const remaining = receivedMs + windowMs - Date.now();
  if (remaining <= 0) return 'breached';
  if (remaining <= windowMs * SLA_DUE_SOON_RATIO) return 'due_soon';
  return 'on_track';
}

function durationLabel(ms: number): string {
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${String(hours)}시간 ${String(minutes)}분`;
  return `${String(minutes)}분`;
}

function slaRemainingLabel(
  receivedMs: number,
  priority: TicketPriority,
  status: TicketStatus,
): string {
  if (status === 'answered' || status === 'closed') return '첫 응답 완료';
  const remaining = receivedMs + SLA_TARGET_HOURS[priority] * HOUR_MS - Date.now();
  if (remaining <= 0) return `${durationLabel(-remaining)} 초과`;
  return `${durationLabel(remaining)} 남음`;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');
function formatDateTime(ms: number): string {
  const date = new Date(ms);
  const ymd = `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${ymd} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/* ── 데모 데이터 — 실화면 Ticket 형태를 대표값으로 인라인 ─────────────────────────────────────── */

interface DemoTicket {
  readonly ticketNo: string;
  readonly title: string;
  readonly categoryId: string;
  readonly categoryLabel: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly assignee: string;
  readonly customerName: string;
  readonly contact: string;
  /** 접수 = 마운트 시각에서 이만큼 이전(시간) */
  readonly receivedHoursAgo: number;
  readonly body: string;
}

const TICKET: DemoTicket = {
  ticketNo: 'INQ-20259',
  title: '배송이 일주일째 안 와요',
  categoryId: 'delivery',
  categoryLabel: '배송',
  channel: 'web',
  priority: 'high',
  status: 'in_progress',
  assignee: '이상담',
  customerName: '박민지',
  contact: 'minji@example.com',
  receivedHoursAgo: 3.7,
  body: '5월 12일에 주문한 상품이 아직도 배송 중으로만 표시됩니다. 언제 받을 수 있을지 확인 부탁드립니다.',
};

interface DemoTemplate {
  readonly id: string;
  readonly categoryLabel: string;
  readonly title: string;
  readonly body: string;
}

/** 이 유형(배송)에 맞는 템플릿 + 공용('전체') — 실화면 templatesForCategory 결과 미러 */
const TEMPLATES: readonly DemoTemplate[] = [
  {
    id: 'tpl-1',
    categoryLabel: '배송',
    title: '배송 지연 사과 안내',
    body: '{{고객명}}님, 문의({{문의번호}}) 주셔서 감사합니다. 배송 지연으로 불편을 드려 죄송합니다. 확인 후 빠르게 조치하겠습니다. 담당자 {{담당자}} 드림.',
  },
  {
    id: 'tpl-2',
    categoryLabel: '전체',
    title: '접수 완료 안내',
    body: '{{고객명}}님, 문의가 정상 접수되었습니다. 확인 후 순차적으로 답변드리겠습니다.',
  },
];

/** 접수·배정·상태변경·내부메모로 쌓인 처리 이력(append-only) */
interface DemoEvent {
  readonly id: string;
  readonly hoursAgo: number;
  readonly author: string;
  readonly kind: TicketEventKind;
  readonly text: string;
}

const TIMELINE: readonly DemoEvent[] = [
  {
    id: 'e-1',
    hoursAgo: 3.7,
    author: '시스템',
    kind: 'received',
    text: '웹 채널로 문의가 접수되었습니다.',
  },
  { id: 'e-2', hoursAgo: 3.2, author: '이상담', kind: 'assign', text: '담당자에 이상담 배정.' },
  {
    id: 'e-3',
    hoursAgo: 3.0,
    author: '이상담',
    kind: 'status',
    text: '상태를 배정 → 처리중으로 변경.',
  },
  {
    id: 'e-4',
    hoursAgo: 2.4,
    author: '이상담',
    kind: 'note',
    text: '택배사 조회 결과 물류센터 지연. 재출고 요청함.',
  },
];

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  alignSelf: 'flex-start',
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 12), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr)',
  columnGap: cssVar('space.4'),
  rowGap: cssVar('space.3'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const composerFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const composerLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const composerHeadStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const mutedStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 로컬 카드 제목(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ── */

function WorkCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleRowStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

/* ── 처리 이력 타임라인 — TicketTimeline(앱)이 이벤트를 표시용으로 매핑한 결과를 DS Timeline 으로 미러 ── */

function toTimelineEvent(event: DemoEvent, now: number): TimelineEvent {
  return {
    id: event.id,
    at: new Date(now - event.hoursAgo * HOUR_MS).toISOString(),
    author: event.author,
    badgeTone: eventTone(event.kind),
    badgeLabel: EVENT_LABEL[event.kind],
    text: event.text,
  };
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ──────────────────────────── */

type ScreenState = 'default' | 'loading' | 'error' | 'closing' | 'serverError';

function TicketDetailScreen({ state }: { state: ScreenState }) {
  const now = useMemo(() => Date.now(), []);
  const receivedMs = now - TICKET.receivedHoursAgo * HOUR_MS;

  const [assignee, setAssignee] = useState(TICKET.assignee);
  const [status, setStatus] = useState<TicketStatus>(
    state === 'closing' ? 'closed' : TICKET.status,
  );
  const [composerKind, setComposerKind] = useState<ComposerKind>('reply');
  const [composer, setComposer] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [confirmClose, setConfirmClose] = useState(state === 'closing');

  const serverError =
    state === 'serverError' ? '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' : null;

  const statusOptions = allowedNextStatuses(TICKET.status);
  const assigneeRequiredError =
    statusRequiresAssignee(status) && assignee.trim() === ''
      ? '이 상태로 바꾸려면 담당자를 먼저 배정하세요.'
      : null;

  const sla = slaState(receivedMs, TICKET.priority, TICKET.status);
  const showTemplatePicker = composerKind === 'reply' && TEMPLATES.length > 0;

  const onSelectTemplate = (nextId: string): void => {
    setTemplateId(nextId);
    if (nextId === '') return;
    const template = TEMPLATES.find((item) => item.id === nextId);
    if (template === undefined) return;
    setComposerKind('reply');
    setComposer(
      template.body
        .replaceAll('{{고객명}}', TICKET.customerName)
        .replaceAll('{{문의번호}}', TICKET.ticketNo)
        .replaceAll('{{담당자}}', assignee.trim() === '' ? '담당자' : assignee.trim()),
    );
  };

  const backLink = (
    <span style={backLinkStyle}>
      <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
        목록으로
      </Button>
    </span>
  );

  if (state === 'error') {
    return (
      <div style={pageStyle}>
        {backLink}
        <h1 style={pageTitleStyle}>문의 처리</h1>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>문의를 불러오지 못했어요.</span>
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div style={pageStyle}>
        {backLink}
        <h1 style={pageTitleStyle}>문의 처리</h1>
        <Card>
          <p style={mutedStyle}>불러오는 중…</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {backLink}
      <h1 style={pageTitleStyle}>문의 처리</h1>

      <div style={layoutStyle}>
        {/* 좌측 — 문의 정보 + 처리(담당·상태·답변/메모 작성) */}
        <WorkCard
          title={
            <span style={inlineBadgeRowStyle}>
              {TICKET.title}
              <StatusBadge
                tone={priorityTone(TICKET.priority)}
                label={PRIORITY_LABEL[TICKET.priority]}
              />
            </span>
          }
        >
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <div style={badgeRowStyle}>
            <StatusBadge tone="neutral" label={TICKET.categoryLabel} />
            <StatusBadge tone="info" label={CHANNEL_LABEL[TICKET.channel]} />
            <StatusBadge
              tone={SLA_TONE[sla]}
              label={`${SLA_LABEL[sla]} · ${slaRemainingLabel(receivedMs, TICKET.priority, TICKET.status)}`}
            />
          </div>

          <dl style={dlStyle}>
            <dt style={dtStyle}>문의번호</dt>
            <dd style={ddStyle}>{TICKET.ticketNo}</dd>
            <dt style={dtStyle}>고객</dt>
            <dd style={ddStyle}>{TICKET.customerName}</dd>
            <dt style={dtStyle}>연락처</dt>
            <dd style={ddStyle}>{TICKET.contact}</dd>
            <dt style={dtStyle}>접수일시</dt>
            <dd style={ddStyle}>{formatDateTime(receivedMs)}</dd>
            <dt style={dtStyle}>문의내용</dt>
            <dd style={ddStyle}>{TICKET.body}</dd>
          </dl>

          <div style={formRowStyle}>
            <TextField
              id="ticket-assignee"
              label="담당 배정"
              value={assignee}
              placeholder="담당자 이름"
              onChange={(event) => setAssignee(event.target.value)}
              error={assigneeRequiredError ?? ''}
            />
            <FormField htmlFor="ticket-status" label="처리 상태">
              <SelectField
                id="ticket-status"
                value={status}
                onChange={(event) => {
                  if (isTicketStatus(event.target.value)) setStatus(event.target.value);
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABEL[option]}
                  </option>
                ))}
              </SelectField>
            </FormField>
          </div>

          <div style={composerFieldStyle}>
            <span style={composerLabelStyle}>답변 · 메모 작성</span>
            <div style={composerHeadStyle}>
              <Button
                type="button"
                variant={composerKind === 'reply' ? 'primary' : 'secondary'}
                onClick={() => setComposerKind('reply')}
              >
                고객답변
              </Button>
              <Button
                type="button"
                variant={composerKind === 'note' ? 'primary' : 'secondary'}
                onClick={() => setComposerKind('note')}
              >
                내부메모
              </Button>
            </div>

            {showTemplatePicker && (
              <FormField htmlFor="ticket-template" label="답변 템플릿 삽입">
                <SelectField
                  id="ticket-template"
                  value={templateId}
                  onChange={(event) => onSelectTemplate(event.target.value)}
                >
                  <option value="">템플릿 선택…</option>
                  {TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {`[${template.categoryLabel}] ${template.title}`}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            )}

            <TextareaField
              label={composerKind === 'reply' ? '고객답변 내용' : '내부메모 내용'}
              value={composer}
              onChange={setComposer}
              maxLength={1000}
              rows={4}
              placeholder={
                composerKind === 'reply'
                  ? '고객에게 전달할 답변을 입력하세요. 템플릿을 골라 채운 뒤 수정할 수 있어요.'
                  : '내부 공유용 처리 메모를 입력하세요.'
              }
            />
          </div>

          <div style={actionsStyle}>
            <Button variant="secondary">목록으로</Button>
            <Button
              variant="primary"
              size="md"
              disabled={assigneeRequiredError !== null}
              onClick={() => {
                if (status === 'closed' && TICKET.status !== 'closed') setConfirmClose(true);
              }}
            >
              처리 저장
            </Button>
          </div>
        </WorkCard>

        {/* 우측 — 처리 이력(대화 타임라인) */}
        <WorkCard title="처리 이력">
          <Timeline
            label="문의 처리 이력"
            events={TIMELINE.map((event) => toTimelineEvent(event, now))}
          />
        </WorkCard>
      </div>

      {/* 종결 확인 — 되돌릴 수 없다는 사실을 문구가 직접 말한다(ConfirmDialog 계약) */}
      {confirmClose && (
        <ConfirmDialog
          intent="update"
          title="문의 종결"
          message={`'${TICKET.ticketNo}' 문의를 종결해요. 종결한 문의는 다시 열 수 없으며, 추가 문의는 새 문의로 접수해야 해요.`}
          confirmLabel="종결"
          onConfirm={() => setConfirmClose(false)}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  );
}

/** 정상 — 정보·SLA·담당·상태·답변 작성·처리 이력 타임라인이 모두 채워진 처리 화면 */
export const Default: Story = {
  render: () => <TicketDetailScreen state="default" />,
};

/** 로딩 — 상세 미도착 시 실화면이 그리는 '불러오는 중…' 카드(STATE-01: ticket === undefined) */
export const Loading: Story = {
  render: () => <TicketDetailScreen state="loading" />,
};

/** 저장 실패 — 처리 저장이 실패했을 때 좌측 카드 상단에 Alert(danger) 노출 */
export const ServerError: Story = {
  render: () => <TicketDetailScreen state="serverError" />,
};

/** 종결 확인 — 종결로 넘기는 저장에서만 뜨는 ConfirmDialog(되돌릴 수 없음을 문구가 경고) */
export const Closing: Story = {
  render: () => <TicketDetailScreen state="closing" />,
};

/** 에러 — 상세 조회 실패 시 Alert(danger) + 목록으로(실화면 detailQuery.error 흐름) */
export const LoadError: Story = {
  render: () => <TicketDetailScreen state="error" />,
};
