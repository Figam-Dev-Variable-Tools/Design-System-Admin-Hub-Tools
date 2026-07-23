/**
 * Design System/Templates/Programs/Inquiry Detail — 프로그램 문의 상세·답변 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/programs/inquiries/:id` → 메뉴 en = "Programs"(프로그램 관리),
 * 화면 en = "Inquiries" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Programs 그룹의
 * `['/programs/inquiries', '문의', 'Inquiries']`).
 *
 * 대응 실화면: apps/admin/src/pages/programs/inquiries/ProgramInquiryDetailPage.tsx
 * (라우트 /programs/inquiries/:id).
 * 문의 내용 + 문의자 정보 + 답변 작성/수정 + 상태 전환(답변 착수·종결) + 처리 이력. **삭제가 없다** —
 * 문의는 후원자가 남긴 기록이다(PG 를 끈 프로그램의 '문의하기' 로 들어온 글이다).
 *
 * [상품 문의와 무엇이 다른가] 축이 하나 더 있다. 후원은 **아직 만들어지지 않은 것에 돈을 먼저
 * 거는 일**이라 질문이 리워드 구성·배송 예정·환불 조건에 몰리고, 그 갈래(topic)에 따라 답하는
 * 사람이 다르다 — 그래서 상세도 유형 배지를 제목 아래에 함께 세운다. 경과의 마지노선도 이틀로
 * 짧다(마감이 있는 판매다).
 *
 * [상태는 버튼이 아니라 규칙이 정한다] '답변 완료' 를 직접 고르는 select 가 없다. 답변을 저장하면
 * 상태가 따라 넘어가고(store 의 applyProgramAnswer), 종결은 답변이 나간 뒤에만 열리며, 종결된
 * 문의는 답변 입력칸 자체가 사라진다. 경과 기준일은 목록과 같은 고정 시계 `TODAY = '2026-07-21'` 이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   shared/ui CardTitle · dl/dt/dd · pageTitleStyle → 토큰만 쓴 로컬 조립(신규 DS 컴포넌트 아님)
 *   useUnsavedChangesDialog                        → 저장 안내 문구로 갈음(라우터가 없는 스토리)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로 복귀             → Icon(chevron-left) + 토큰 <button>
 *   화면 제목                → 토큰 <h1>(title.xl)
 *   카드 표면 · 카드 제목      → Card + 토큰 <h2>(CardTitle 갈음)
 *   처리 상태 · 유형 · 채널 · 경과 → StatusBadge ×4 (statusTone · topicTone · elapsedTone 미러)
 *   문의 정보(읽기 전용)       → dl/dt/dd(토큰) + pre-wrap 본문
 *   답변 작성/수정            → TextareaField (maxLength=1000 · 저장하면 상태가 넘어간다는 hint)
 *   종결된 문의의 발송 답변     → 토큰 <p> + 안내 문구(수정 불가)
 *   답변 착수 · 문의 종결 · 답변 저장 → Button ×3 (전이 규칙이 허용할 때만 그린다 · EXC-03)
 *   문의자 정보              → Card + dl/dt/dd (문의 유형 포함)
 *   처리 이력                → Timeline (programInquiryHistory 미러 — 저장된 사실에서 파생)
 *   최초 로드                → Card + Skeleton ×N (재조회로는 덮지 않는다 · STATE-01)
 *   404 / 조회 실패           → Alert(danger) (+ 서버 오류에만 다시 시도 · EXC-12)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Icon,
  Skeleton,
  StatusBadge,
  TextareaField,
  Timeline,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TimelineEvent } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Programs/Inquiry Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 _shared/store · types 미러) ─────────────────────────────────────── */

/** 경과 기준일 — 목록 화면과 같은 값을 쓴다(두 화면이 다른 날짜를 말하면 안 된다) */
const TODAY = '2026-07-21';

/** 상품(사흘)보다 하루 짧다 — 마감이 있는 펀딩이라 답이 늦으면 후원 자체가 사라진다 */
const OVERDUE_DAYS = 2;
const ANSWER_MAX = 1000;

type InquiryStatus = 'received' | 'answering' | 'answered' | 'closed';
type InquiryChannel = 'storefront' | 'app' | 'phone' | 'email' | 'kakao';
type InquiryTopic = 'reward' | 'delivery' | 'refund' | 'payment' | 'etc';

interface BadgeMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

const STATUS_META: Record<InquiryStatus, BadgeMeta> = {
  received: { label: '접수', tone: 'warning' },
  answering: { label: '답변 중', tone: 'info' },
  answered: { label: '답변 완료', tone: 'success' },
  closed: { label: '종결', tone: 'neutral' },
};

const TOPIC_META: Record<InquiryTopic, BadgeMeta> = {
  reward: { label: '리워드', tone: 'info' },
  delivery: { label: '배송', tone: 'info' },
  refund: { label: '환불', tone: 'warning' },
  payment: { label: '결제', tone: 'warning' },
  etc: { label: '기타', tone: 'neutral' },
};

const CHANNEL_LABEL: Record<InquiryChannel, string> = {
  storefront: '프로그램 페이지',
  app: '모바일 앱',
  phone: '전화',
  email: '이메일',
  kakao: '카카오톡',
};

/* 전이 규칙(순수 술어) — 버튼의 노출과 저장의 허용이 **같은 판단**을 쓰게 한다 */

const isUnanswered = (status: InquiryStatus): boolean =>
  status === 'received' || status === 'answering';

/** 답변을 쓰거나 고칠 수 있나 — 종결된 문의는 기록이라 손대지 않는다 */
const canAnswer = (status: InquiryStatus): boolean => status !== 'closed';

/** 종결할 수 있나 — 답변이 나간 뒤에만 닫는다 */
const canClose = (status: InquiryStatus): boolean => status === 'answered';

/** 답변 착수로 바꿀 수 있나 — 접수 직후 한 번만 */
const canBeginAnswering = (status: InquiryStatus): boolean => status === 'received';

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const fmt = (value: number): string => KO_NUMBER.format(value);

/** KST 오프셋(ms) — 시각은 UTC 로 저장하고 표기만 서울 달력으로 환산한다(ERP-09) */
const SEOUL_OFFSET_MS = 32_400_000;

function seoulDayOf(iso: string): string | null {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return new Date(at + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  const kst = new Date(at + SEOUL_OFFSET_MS).toISOString();
  return `${kst.slice(0, 10)} ${kst.slice(11, 16)}`;
}

function daysBetween(from: string, to: string): number | null {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

/* ── 데모 데이터(실화면 _shared/store 픽스처 미러 — 가상 인물·가상 연락처) ─────────────────────── */

interface DemoInquiry {
  /** 문의번호를 겸한다 — 'PGQ-YYYYMMDD-NNN' */
  readonly id: string;
  readonly programName: string;
  readonly customerName: string;
  readonly customerContact: string;
  readonly channel: InquiryChannel;
  readonly topic: InquiryTopic;
  readonly subject: string;
  readonly message: string;
  readonly status: InquiryStatus;
  readonly createdAt: string;
  /** 최초 답변 일시 ISO — 미답변이면 '' */
  readonly answeredAt: string;
  readonly answer: string;
}

/** 접수 · 리워드 문의 — 창작자 확인이 필요한 갈래다(4일째 미답변 · 이틀 마지노선을 넘겼다) */
const DEMO_RECEIVED: DemoInquiry = {
  id: 'PGQ-20260717-001',
  programName: '무선 스튜디오 모니터 헤드폰',
  customerName: '한도윤',
  customerContact: 'doyun.h@example.com',
  channel: 'storefront',
  topic: 'reward',
  subject: '2대 세트 리워드에 스탠드가 두 개 오나요',
  message:
    '2대 세트 리워드를 후원하려는데 구성 설명에 스탠드가 하나로 적혀 있어요.\n헤드폰만 두 대인가요?',
  status: 'received',
  createdAt: '2026-07-17T02:40:00Z',
  answeredAt: '',
  answer: '',
};

/** 답변 완료 · 환불 문의 — 답변이 나갔으므로 이제 '문의 종결' 이 열린다 */
const DEMO_ANSWERED: DemoInquiry = {
  id: 'PGQ-20260714-003',
  programName: '휴대용 커피 드리퍼',
  customerName: '노지오',
  customerContact: 'jio.no@example.com',
  channel: 'email',
  topic: 'refund',
  subject: '목표 미달로 끝나면 후원금은 어떻게 되나요',
  message: '펀딩이 실패하면 결제한 금액은 자동으로 돌려받는 건가요? 절차를 알고 싶어요.',
  status: 'answered',
  createdAt: '2026-07-14T01:20:00Z',
  answeredAt: '2026-07-15T05:10:00Z',
  answer:
    '목표 금액에 도달하지 못하면 결제는 진행되지 않으며, 이미 승인된 건은 전액 자동 취소됩니다. 취소 내역은 등록하신 이메일로 안내드립니다.',
};

/** 종결 · 결제 문의 — PG 를 끈 동안 특히 자주 들어오는 갈래다. 기록이라 고칠 수 없다 */
const DEMO_CLOSED: DemoInquiry = {
  id: 'PGQ-20260708-004',
  programName: '도시 산책 에세이집',
  customerName: '유하람',
  customerContact: '02-3391-7742',
  channel: 'phone',
  topic: 'payment',
  subject: '카드 결제가 되지 않아 후원을 못 했어요',
  message: '후원하기 버튼이 문의하기로 바뀌어 있는데 결제는 어떻게 진행하나요?',
  status: 'closed',
  createdAt: '2026-07-08T05:05:00Z',
  answeredAt: '2026-07-08T08:30:00Z',
  answer:
    '현재 카드 결제를 잠시 중단하고 있어 계좌 후원으로 안내드렸습니다. 입금 확인 후 후원자 명단에 반영되었습니다.',
};

/* ── 경과 문구(목록과 같은 규칙) ───────────────────────────────────────────────────────────── */

function pendingDays(inquiry: DemoInquiry, today: string): number | null {
  const created = seoulDayOf(inquiry.createdAt);
  if (created === null) return null;
  const diff = daysBetween(created, today);
  return diff === null ? null : Math.max(diff, 0);
}

function elapsedLabel(inquiry: DemoInquiry, today: string): string {
  if (!isUnanswered(inquiry.status)) {
    const created = seoulDayOf(inquiry.createdAt);
    const answered = seoulDayOf(inquiry.answeredAt);
    if (created === null || answered === null) return '답변 완료';
    const spent = daysBetween(created, answered);
    if (spent === null) return '답변 완료';
    return spent <= 0 ? '당일 답변' : `${fmt(spent)}일 만에 답변`;
  }
  const days = pendingDays(inquiry, today);
  if (days === null) return '—';
  return days === 0 ? '오늘 접수' : `${fmt(days)}일째 미답변`;
}

function elapsedTone(inquiry: DemoInquiry, today: string): StatusBadgeTone {
  if (!isUnanswered(inquiry.status)) return 'neutral';
  const days = pendingDays(inquiry, today);
  if (days === null) return 'neutral';
  if (days >= OVERDUE_DAYS) return 'danger';
  return days === 0 ? 'info' : 'warning';
}

/**
 * 처리 이력 — 별도 로그가 아니라 **저장된 사실에서 파생**한다(실화면 programInquiryHistory 미러).
 * 이력을 따로 쌓으면 답변을 고쳤을 때 이력과 본문이 갈라진다 — 파생이면 갈라질 수 없다.
 */
function programInquiryHistory(inquiry: DemoInquiry): readonly TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${inquiry.id}-received`,
      at: inquiry.createdAt,
      author: '후원자',
      badgeTone: 'neutral',
      badgeLabel: '접수',
      text: `${CHANNEL_LABEL[inquiry.channel]} 채널로 ${TOPIC_META[inquiry.topic].label} 문의가 접수되었어요.`,
    },
  ];

  if (inquiry.status === 'answering') {
    events.push({
      id: `${inquiry.id}-answering`,
      at: inquiry.createdAt,
      author: '관리자',
      badgeTone: 'info',
      badgeLabel: '답변 중',
      text: '담당자가 답변을 준비하고 있습니다.',
    });
  }

  if (inquiry.answeredAt !== '') {
    events.push({
      id: `${inquiry.id}-answered`,
      at: inquiry.answeredAt,
      author: '관리자',
      badgeTone: 'success',
      badgeLabel: '답변',
      text: inquiry.answer,
    });
  }

  if (inquiry.status === 'closed') {
    events.push({
      id: `${inquiry.id}-closed`,
      at: inquiry.answeredAt,
      author: '관리자',
      badgeTone: 'neutral',
      badgeLabel: '종결',
      text: `답변 발송(${formatDateTime(inquiry.answeredAt)}) 후 문의가 종결되었어요.`,
    });
  }

  return events;
}

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
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
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
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
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
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
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr)`,
  gap: cssVar('space.2'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

/** 후원자가 쓴 글은 줄바꿈이 의미다 — 문단을 뭉개지 않는다 */
const messageStyle: CSSProperties = {
  ...typography('typography.body.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function DetailCard({
  title,
  children,
}: {
  readonly title: ReactNode;
  readonly children: ReactNode;
}) {
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

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

interface InquiryDetailScreenProps {
  readonly inquiry?: DemoInquiry;
  readonly loading?: boolean;
  /** 조회 실패의 종류 — 404 에는 '다시 시도'를 권하지 않는다(영원히 실패한다 · EXC-12) */
  readonly failure?: 'not-found' | 'error';
  /** 답변 권한 — 없으면 저장·전이 버튼 자체가 없다 (EXC-03) */
  readonly canUpdate?: boolean;
}

function ProgramInquiryDetailScreen({
  inquiry = DEMO_RECEIVED,
  loading = false,
  failure,
  canUpdate = true,
}: InquiryDetailScreenProps) {
  const [answer, setAnswer] = useState(inquiry.answer);

  const backLink = (
    <button type="button" style={backLinkStyle}>
      <Icon name="chevron-left" />
      목록으로
    </button>
  );

  if (failure !== undefined) {
    const notFound = failure === 'not-found';
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>
              {notFound
                ? '문의를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '문의를 불러오지 못했어요.'}
            </span>
            <span style={badgeRowStyle}>
              {!notFound && <Button variant="secondary">다시 시도</Button>}
              <Button variant="secondary">목록으로</Button>
            </span>
          </div>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        {backLink}
        <h1 style={pageTitleStyle}>프로그램 문의 처리</h1>
        <div style={layoutStyle} aria-busy="true">
          {[0, 1].map((column) => (
            <Card key={`col-${String(column)}`}>
              <div style={skeletonBodyStyle}>
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const editable = canAnswer(inquiry.status);
  // 답변 본문이 바뀌어야 저장이 열린다 — 같은 글을 다시 저장하면 응대 시각만 흔들린다
  const dirty = answer.trim() !== inquiry.answer;

  return (
    <div style={pageStyle}>
      {backLink}

      <h1 style={pageTitleStyle}>프로그램 문의 처리</h1>

      <div style={layoutStyle}>
        <DetailCard
          title={
            <span style={cardTitleRowStyle}>
              {inquiry.subject}
              <StatusBadge
                tone={STATUS_META[inquiry.status].tone}
                label={STATUS_META[inquiry.status].label}
              />
            </span>
          }
        >
          <div style={badgeRowStyle}>
            <StatusBadge
              tone={TOPIC_META[inquiry.topic].tone}
              label={TOPIC_META[inquiry.topic].label}
            />
            <StatusBadge tone="info" label={CHANNEL_LABEL[inquiry.channel]} />
            <StatusBadge tone={elapsedTone(inquiry, TODAY)} label={elapsedLabel(inquiry, TODAY)} />
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
              <p style={messageStyle}>{inquiry.message}</p>
            </dd>
          </dl>

          {editable ? (
            <TextareaField
              label={inquiry.answer === '' ? '답변 작성' : '답변 수정'}
              value={answer}
              maxLength={ANSWER_MAX}
              disabled={!canUpdate}
              hint="저장하면 상태가 '답변 완료' 로 넘어가요."
              placeholder="후원자에게 전달할 답변을 입력하세요."
              rows={6}
              onChange={setAnswer}
            />
          ) : (
            <>
              <span style={fieldLabelStyle}>발송한 답변</span>
              <p style={messageStyle}>{inquiry.answer}</p>
              <p style={hintStyle}>종결된 문의라 답변을 수정할 수 없어요.</p>
            </>
          )}

          {!canUpdate && (
            <Alert tone="info">이 문의에 답변할 권한이 없어요. 조회만 가능해요.</Alert>
          )}

          <div style={actionsStyle}>
            <Button variant="secondary">목록으로</Button>
            {/* 누를 수 없는 것을 보여 주지 않는다 (EXC-03) — 권한과 전이 규칙이 함께 결정한다 */}
            {canUpdate && canBeginAnswering(inquiry.status) && (
              <Button variant="secondary">답변 착수</Button>
            )}
            {canUpdate && canClose(inquiry.status) && (
              <Button variant="secondary">문의 종결</Button>
            )}
            {canUpdate && editable && (
              <Button variant="primary" size="md" disabled={!dirty}>
                답변 저장
              </Button>
            )}
          </div>
        </DetailCard>

        <div style={columnStyle}>
          <DetailCard title="문의자 정보">
            <dl style={dlStyle}>
              <dt style={dtStyle}>문의자</dt>
              <dd style={ddStyle}>{inquiry.customerName}</dd>
              <dt style={dtStyle}>연락처</dt>
              <dd style={ddStyle}>{inquiry.customerContact}</dd>
              <dt style={dtStyle}>문의 유형</dt>
              <dd style={ddStyle}>{TOPIC_META[inquiry.topic].label}</dd>
              <dt style={dtStyle}>유입 채널</dt>
              <dd style={ddStyle}>{CHANNEL_LABEL[inquiry.channel]}</dd>
            </dl>
            <p style={hintStyle}>
              답변은 위 연락처로 회신돼요. 결제대행을 끈 프로그램은 후원하기 대신 문의하기 버튼이
              노출돼요.
            </p>
          </DetailCard>

          <DetailCard title="처리 이력">
            <Timeline events={programInquiryHistory(inquiry)} label="프로그램 문의 처리 이력" />
          </DetailCard>
        </div>
      </div>
    </div>
  );
}

/** 정상: 접수 · 리워드 문의 — '답변 착수' 가 열려 있고 경과가 '4일째 미답변'(danger)을 글자로 말한다 */
export const Default: Story = {
  render: () => <ProgramInquiryDetailScreen />,
};

/** 최초 로드: 카드 본문 스켈레톤 — 아직 데이터가 없을 때만 켠다(재조회로는 덮지 않는다 · STATE-01) */
export const Loading: Story = {
  render: () => <ProgramInquiryDetailScreen loading />,
};

/** 답변 완료: 환불 문의에 답이 나갔다 — '문의 종결' 이 열리고 답변칸은 수정 흐름이 된다 */
export const Answered: Story = {
  render: () => <ProgramInquiryDetailScreen inquiry={DEMO_ANSWERED} />,
};

/** 종결: 결제 문의(PG 를 끈 동안 몰리는 갈래) — 입력칸 대신 발송한 답변과 수정 불가 안내 */
export const Closed: Story = {
  render: () => <ProgramInquiryDetailScreen inquiry={DEMO_CLOSED} />,
};

/** 404: 이미 삭제된 문의 — '다시 시도'를 권하지 않고 목록으로만 돌려보낸다 (EXC-12) */
export const NotFound: Story = {
  render: () => <ProgramInquiryDetailScreen failure="not-found" />,
};
