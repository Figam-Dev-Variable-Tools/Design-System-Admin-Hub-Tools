/**
 * Design System/Templates/Sales/Inquiry Detail — 문의 상세·처리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹의 Inquiries 엔트리(`/sales/inquiries`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/inquiries/InquiryDetailPage.tsx (라우트 /sales/inquiries/:id)
 * 와 그 하위 조각(components/InquiryTimeline.tsx → DS Timeline). 문의 정보 + 담당 배정 + 상태 전이 +
 * 답변/내부메모 작성(append) + 대화 타임라인. 삭제는 없다(문의는 고객이 만들고 관리자는 처리만 한다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(button)            → 토큰만 쓴 <button> + Icon(chevron-left)
 *   페이지 제목(pageTitleStyle) → 토큰만 쓴 <h1>(title.lg)
 *   카드 표면 · 카드 제목(CardTitle) → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   유형·채널·우선순위 배지     → StatusBadge
 *   문의 정보(읽기 전용)        → dl/dt/dd (토큰만)
 *   담당 배정                   → FormField + 토큰만 쓴 <input>
 *   처리 상태                   → FormField + SelectField
 *   중복 발행/자동 생성 안내     → Alert(info)
 *   답변·메모 작성              → 구분 토글 Button ×2 + TextareaField
 *   처리 이력(InquiryTimeline)  → Timeline
 *   저장/목록으로               → Button(primary/secondary)
 *   로드 실패                   → Alert(danger) + 목록으로 Button
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  Icon,
  SelectField,
  StatusBadge,
  TextareaField,
  Timeline,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TimelineEvent } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Inquiry Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 sales/inquiries/types 미러) ─────────────────────────────────────── */

const INQUIRY_REPLY_MAX = 1000;

type InquiryType = 'quote' | 'product' | 'support' | 'partnership' | 'claim' | 'etc';
type InquiryChannel = 'web' | 'phone' | 'email' | 'visit';
type InquiryPriority = 'urgent' | 'high' | 'normal' | 'low';
type InquiryStatus =
  'received' | 'assigned' | 'in_progress' | 'hold' | 'quote_issued' | 'answered' | 'closed';
type InquiryEventKind = 'received' | 'note' | 'reply' | 'status';

const TYPE_LABEL: Record<InquiryType, string> = {
  quote: '견적요청',
  product: '제품문의',
  support: '기술지원',
  partnership: '제휴',
  claim: '불만/클레임',
  etc: '기타',
};
const CHANNEL_LABEL: Record<InquiryChannel, string> = {
  web: '웹',
  phone: '전화',
  email: '이메일',
  visit: '방문',
};
const PRIORITY_LABEL: Record<InquiryPriority, string> = {
  urgent: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};
const STATUS_LABEL: Record<InquiryStatus, string> = {
  received: '접수',
  assigned: '배정',
  in_progress: '처리중',
  hold: '보류',
  quote_issued: '견적 발행',
  answered: '완료',
  closed: '종결',
};
const STATUS_OPTIONS: readonly InquiryStatus[] = [
  'received',
  'assigned',
  'in_progress',
  'hold',
  'quote_issued',
  'answered',
  'closed',
];
const EVENT_LABEL: Record<InquiryEventKind, string> = {
  received: '접수',
  note: '내부메모',
  reply: '고객답변',
  status: '상태변경',
};

const priorityTone = (priority: InquiryPriority): StatusBadgeTone => {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'neutral';
  return 'info';
};

/** 타임라인 이벤트 종류 → 배지 tone (실화면 InquiryTimeline.kindTone 미러) */
const eventTone = (kind: InquiryEventKind): StatusBadgeTone => {
  if (kind === 'reply') return 'success';
  if (kind === 'status') return 'info';
  if (kind === 'note') return 'warning';
  return 'neutral';
};

interface DemoEvent {
  readonly id: string;
  readonly at: string;
  readonly author: string;
  readonly kind: InquiryEventKind;
  readonly text: string;
}

interface DemoInquiry {
  readonly inquiryNo: string;
  readonly title: string;
  readonly type: InquiryType;
  readonly channel: InquiryChannel;
  readonly customerName: string;
  readonly company: string;
  readonly contact: string;
  readonly assignee: string;
  readonly priority: InquiryPriority;
  readonly status: InquiryStatus;
  readonly receivedAt: string;
  readonly body: string;
  /** 이 문의로 발행된 견적번호 — '' 면 미발행 */
  readonly quoteNo: string;
  readonly timeline: readonly DemoEvent[];
}

const INQUIRY: DemoInquiry = {
  inquiryNo: 'INQ-20260718-001',
  title: '사무공간 리모델링 견적 요청',
  type: 'quote',
  channel: 'web',
  customerName: '김영도',
  company: '대성물산',
  contact: '02-555-1234 / youngdo@daesung.co.kr',
  assignee: '박상담',
  priority: 'high',
  status: 'in_progress',
  receivedAt: '2026-07-18T09:12:00+09:00',
  body: '본사 3층 사무공간(약 200㎡) 전면 리모델링을 검토 중입니다. 8월 착공 가능 여부와 개략 견적을 요청드립니다.',
  quoteNo: '',
  timeline: [
    {
      id: 'ev-1',
      at: '2026-07-18T09:12:00+09:00',
      author: '시스템',
      kind: 'received',
      text: '웹 문의 접수',
    },
    {
      id: 'ev-2',
      at: '2026-07-18T10:02:00+09:00',
      author: '박상담',
      kind: 'note',
      text: '평면도 수령. 현장 실측 일정 조율 필요.',
    },
    {
      id: 'ev-3',
      at: '2026-07-18T14:30:00+09:00',
      author: '박상담',
      kind: 'reply',
      text: '문의 감사합니다. 금주 내 현장 실측 후 개략 견적을 회신드리겠습니다.',
    },
    {
      id: 'ev-4',
      at: '2026-07-18T14:31:00+09:00',
      author: '관리자',
      kind: 'status',
      text: "상태를 '처리중'으로 변경",
    },
  ],
};

const pad2 = (value: number): string => String(value).padStart(2, '0');
const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const ymd = `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${ymd} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const toTimelineEvent = (event: DemoEvent): TimelineEvent => ({
  id: event.id,
  at: event.at,
  author: event.author,
  badgeTone: eventTone(event.kind),
  badgeLabel: EVENT_LABEL[event.kind],
  text: event.text,
});

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
  ...typography('typography.label.md'),
  cursor: 'pointer',
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

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
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
  gridTemplateColumns: `minmax(0, max-content) minmax(0, 1fr)`,
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

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.4'),
};

const controlStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
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

const alertActionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const mutedTextStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

/* ── 로컬 레이아웃 조립(신규 DS 컴포넌트 아님 — 토큰만 쓴 표면/타이포) ───────────────────────── */

function DetailCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface InquiryDetailScreenProps {
  /** 상세 조회 로딩(data 미도착) — 실화면 '불러오는 중…' 카드 */
  readonly loading?: boolean;
  /** 로드 실패 — Alert(danger) + 목록으로 */
  readonly loadError?: boolean;
  /** 이미 견적이 발행된 문의 — 중복 발행 방지 Alert(info) + 발행된 견적 보기 */
  readonly issued?: boolean;
}

function InquiryDetailScreen({
  loading = false,
  loadError = false,
  issued = false,
}: InquiryDetailScreenProps) {
  const [assignee, setAssignee] = useState(INQUIRY.assignee);
  const [status, setStatus] = useState<InquiryStatus>(issued ? 'quote_issued' : INQUIRY.status);
  const [composerKind, setComposerKind] = useState<'reply' | 'note'>('reply');
  const [composer, setComposer] = useState('');
  const statusFieldId = useId();
  const assigneeFieldId = useId();

  // 이번 저장에서 견적이 실제로 생성되는가 — 이미 발행됐으면 상태를 다시 골라도 생성되지 않는다
  const issuesQuoteNow = status === 'quote_issued' && !issued;

  if (loadError) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>문의를 불러오지 못했습니다.</span>
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button type="button" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>문의 처리</h1>
      </div>

      {loading ? (
        <Card>
          <p style={mutedTextStyle}>불러오는 중…</p>
        </Card>
      ) : (
        <div style={layoutStyle}>
          <DetailCard
            title={
              <>
                {INQUIRY.title}
                <StatusBadge
                  tone={priorityTone(INQUIRY.priority)}
                  label={PRIORITY_LABEL[INQUIRY.priority]}
                />
              </>
            }
          >
            <div style={badgeRowStyle}>
              <StatusBadge tone="neutral" label={TYPE_LABEL[INQUIRY.type]} />
              <StatusBadge tone="info" label={CHANNEL_LABEL[INQUIRY.channel]} />
            </div>

            <dl style={dlStyle}>
              <InfoRow label="문의번호">{INQUIRY.inquiryNo}</InfoRow>
              <InfoRow label="고객">{INQUIRY.customerName}</InfoRow>
              <InfoRow label="거래처">{INQUIRY.company}</InfoRow>
              <InfoRow label="연락처">{INQUIRY.contact}</InfoRow>
              <InfoRow label="접수일시">{formatDateTime(INQUIRY.receivedAt)}</InfoRow>
              <InfoRow label="문의내용">{INQUIRY.body}</InfoRow>
            </dl>

            <div style={rowStyle}>
              <FormField htmlFor={assigneeFieldId} label="담당 배정">
                <input
                  id={assigneeFieldId}
                  type="text"
                  style={controlStyle}
                  value={assignee}
                  placeholder="담당자 이름"
                  onChange={(event) => setAssignee(event.target.value)}
                />
              </FormField>
              <FormField
                htmlFor={statusFieldId}
                label="처리 상태"
                hint={
                  issued
                    ? '이미 견적이 발행된 문의입니다 — 다시 발행되지 않습니다.'
                    : '‘견적 발행’으로 바꾸면 견적이 자동 생성됩니다.'
                }
              >
                <SelectField
                  id={statusFieldId}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as InquiryStatus)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {STATUS_LABEL[option]}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            {/* [중복 발행 방지] 이미 발행된 문의는 재생성하지 않는다 — 대신 그 견적으로 가는 길을 준다 */}
            {issued ? (
              <Alert tone="info">
                <div style={alertActionRowStyle}>
                  <span>이미 이 문의로 견적이 발행되었습니다. 견적은 다시 생성되지 않습니다.</span>
                  <Button variant="secondary">발행된 견적 보기</Button>
                </div>
              </Alert>
            ) : null}

            {issuesQuoteNow ? (
              <Alert tone="info">
                저장하면 이 문의의 거래처·담당자·문의내용을 승계한 견적이 자동 생성됩니다.
              </Alert>
            ) : null}

            <div style={fieldStyle}>
              <span style={fieldLabelStyle}>답변 · 메모 작성</span>
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
              <TextareaField
                label={composerKind === 'reply' ? '고객답변 내용' : '내부메모 내용'}
                value={composer}
                onChange={setComposer}
                maxLength={INQUIRY_REPLY_MAX}
                rows={4}
                placeholder={
                  composerKind === 'reply'
                    ? '고객에게 전달할 답변을 입력하세요.'
                    : '내부 공유용 처리 메모를 입력하세요.'
                }
              />
            </div>

            <div style={actionsStyle}>
              <Button variant="secondary">목록으로</Button>
              <Button variant="primary" size="md">
                처리 저장
              </Button>
            </div>
          </DetailCard>

          <DetailCard title="처리 이력">
            <Timeline events={INQUIRY.timeline.map(toTimelineEvent)} label="문의 처리 이력" />
          </DetailCard>
        </div>
      )}
    </div>
  );
}

/** 정상: 로드 완료된 문의 상세(처리중 · 미발행) — 정보 카드 + 처리 이력 타임라인 */
export const Default: Story = {
  render: () => <InquiryDetailScreen />,
};

/** 로딩: 상세 조회 중(data === undefined) — 실화면 '불러오는 중…' 카드 */
export const Loading: Story = {
  render: () => <InquiryDetailScreen loading />,
};

/** 견적 발행됨: 중복 발행 방지 Alert(info) + '발행된 견적 보기' 역링크 (상태 변형) */
export const QuoteIssued: Story = {
  render: () => <InquiryDetailScreen issued />,
};

/** 로드 실패: 문의를 불러오지 못함 — Alert(danger) + 목록으로 */
export const LoadError: Story = {
  render: () => <InquiryDetailScreen loadError />,
};
