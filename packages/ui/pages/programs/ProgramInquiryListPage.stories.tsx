/**
 * Design System/Templates/Programs/Inquiries — 프로그램 문의 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/programs/inquiries` → 메뉴 en = "Programs"(프로그램 관리), 화면 en =
 * "Inquiries" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Programs 그룹의
 * `['/programs/inquiries', '문의', 'Inquiries']`).
 *
 * 대응 실화면: apps/admin/src/pages/programs/inquiries/ProgramInquiryListPage.tsx
 * (라우트 /programs/inquiries).
 * **결제대행(PG)을 끈 프로그램**의 페이지 버튼은 '후원하기' 대신 '문의하기' 다 — 그 버튼을 누른
 * 후원자의 글이 도착하는 곳이다(스위치는 /settings/payment 가 쥔다). 펀딩은 **마감이 있는 판매**라
 * 답이 늦으면 후원 자체가 사라진다: 그래서 중심 열은 제목이 아니라 **경과**이고, 붉게 알리는
 * 마지노선도 상품(사흘)보다 하루 짧은 **이틀**이다. 필터 축이 둘인 이유도 같다 — 리워드·배송은
 * 창작자 확인이 필요하고 환불·결제는 운영이 바로 답할 수 있어 **처리하는 사람이 다르다**.
 * 문의는 후원자가 만들고 관리자는 답변·종결만 하므로 삭제·일괄작업·선택 체크박스가 없다
 * (실화면 CrudReadListShell). 건수는 **필터 이전** 전체 집합에서 세고, 경과 기준일은 실화면과 같은
 * 고정 시계 `TODAY = '2026-07-21'` 이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudReadListShell/CrudTable → DS Table(+ SeqHeaderCell·SeqCell — 선택·액션 열은 없다)
 *   FilterRail/FilterPanel ×2   → Panel + 토큰만 쓴 <nav>/<ul>/<li>(button[aria-pressed] + 건수 배지)
 *   DetailCellLink              → 토큰만 쓴 <a>(행 클릭의 키보드 짝)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 상태 · 유형 두 필터     → Panel(notice) + 토큰 <nav> ×2 (aria-pressed + 건수 배지)
 *   문의번호·프로그램명·문의자 검색 → SearchField
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   제목(상세로 가는 키보드 경로)  → 토큰 <a> (DetailCellLink 갈음)
 *   문의 유형                  → StatusBadge (programInquiryTopicTone/Label 미러)
 *   처리 상태                  → StatusBadge (programInquiryStatusTone/Label 미러)
 *   경과('2일째 미답변')        → StatusBadge (elapsedTone/Label 미러 — 색만으로 지연을 말하지 않는다)
 *   목록 표                    → Table (leadingHead=순번 · 행 클릭 → 상세)
 *   빈 결과                    → Empty (검색 지우기 / 필터 초기화)
 *   답변 권한 없음              → Panel notice 안내 문구 (EXC-03)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Empty as EmptyState,
  Panel,
  SearchField,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Programs/Inquiries',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 _shared/store · types 미러) ─────────────────────────────────────── */

/** 경과의 기준일 — 실화면 ProgramInquiryListPage.TODAY 와 같은 값이라야 스토리가 고정된다 */
const TODAY = '2026-07-21';

/** 상품(사흘)보다 하루 짧다 — 마감이 있는 펀딩은 답이 늦으면 후원자가 그냥 접는다 */
const OVERDUE_DAYS = 2;

const ENTITY_LABEL = '프로그램 문의';
const PAGE_SIZE = 10;

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

/** 유형 문구·색 — 후원형 펀딩에서 실제로 몰리는 질문의 갈래(실화면 TOPIC_META 미러) */
const TOPIC_META: Record<InquiryTopic, BadgeMeta> = {
  reward: { label: '리워드', tone: 'info' },
  delivery: { label: '배송', tone: 'info' },
  refund: { label: '환불', tone: 'warning' },
  payment: { label: '결제', tone: 'warning' },
  etc: { label: '기타', tone: 'neutral' },
};

/** 채널 문구 — 'storefront' 가 PG 를 끈 프로그램 페이지의 '문의하기' 버튼이다 */
const CHANNEL_LABEL: Record<InquiryChannel, string> = {
  storefront: '프로그램 페이지',
  app: '모바일 앱',
  phone: '전화',
  email: '이메일',
  kakao: '카카오톡',
};

const FILTER_ALL = 'all';
type StatusFilter = typeof FILTER_ALL | InquiryStatus;
type TopicFilter = typeof FILTER_ALL | InquiryTopic;

const STATUS_FILTERS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체' },
  { id: 'received', label: STATUS_META.received.label },
  { id: 'answering', label: STATUS_META.answering.label },
  { id: 'answered', label: STATUS_META.answered.label },
  { id: 'closed', label: STATUS_META.closed.label },
];

const TOPIC_FILTERS: readonly { readonly id: TopicFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체' },
  { id: 'reward', label: TOPIC_META.reward.label },
  { id: 'delivery', label: TOPIC_META.delivery.label },
  { id: 'refund', label: TOPIC_META.refund.label },
  { id: 'payment', label: TOPIC_META.payment.label },
  { id: 'etc', label: TOPIC_META.etc.label },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
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

const isUnanswered = (status: InquiryStatus): boolean =>
  status === 'received' || status === 'answering';

/* ── 데모 데이터(실화면 _shared/store 픽스처 미러 — 가상 인물·가상 연락처) ─────────────────────── */

interface DemoInquiry {
  /** 문의번호를 겸한다 — 'PGQ-YYYYMMDD-NNN' */
  readonly id: string;
  readonly programName: string;
  readonly customerName: string;
  readonly channel: InquiryChannel;
  readonly topic: InquiryTopic;
  readonly subject: string;
  readonly status: InquiryStatus;
  readonly createdAt: string;
  readonly answeredAt: string;
}

/** 접수 최신순(위가 최근) — 실화면 sortProgramInquiries 가 이미 정렬해 넘긴 순서다 */
const DEMO_INQUIRIES: readonly DemoInquiry[] = [
  {
    id: 'PGQ-20260721-005',
    programName: '마그네틱 충전 스탠드',
    customerName: '배시온',
    channel: 'kakao',
    topic: 'etc',
    subject: '오픈 알림을 받고 싶어요',
    status: 'received',
    createdAt: '2026-07-20T22:10:00Z',
    answeredAt: '',
  },
  {
    id: 'PGQ-20260719-002',
    programName: '접이식 원목 사이드테이블',
    customerName: '서예린',
    channel: 'app',
    topic: 'delivery',
    subject: '배송 예정일이 언제인지 궁금해요',
    status: 'answering',
    createdAt: '2026-07-19T07:15:00Z',
    answeredAt: '',
  },
  {
    id: 'PGQ-20260717-001',
    programName: '무선 스튜디오 모니터 헤드폰',
    customerName: '한도윤',
    channel: 'storefront',
    topic: 'reward',
    subject: '2대 세트 리워드에 스탠드가 두 개 오나요',
    status: 'received',
    createdAt: '2026-07-17T02:40:00Z',
    answeredAt: '',
  },
  {
    id: 'PGQ-20260714-003',
    programName: '휴대용 커피 드리퍼',
    customerName: '노지오',
    channel: 'email',
    topic: 'refund',
    subject: '목표 미달로 끝나면 후원금은 어떻게 되나요',
    status: 'answered',
    createdAt: '2026-07-14T01:20:00Z',
    answeredAt: '2026-07-15T05:10:00Z',
  },
  {
    id: 'PGQ-20260708-004',
    programName: '도시 산책 에세이집',
    customerName: '유하람',
    channel: 'phone',
    topic: 'payment',
    subject: '카드 결제가 되지 않아 후원을 못 했어요',
    status: 'closed',
    createdAt: '2026-07-08T05:05:00Z',
    answeredAt: '2026-07-08T08:30:00Z',
  },
];

function pendingDays(inquiry: DemoInquiry, today: string): number | null {
  const created = seoulDayOf(inquiry.createdAt);
  if (created === null) return null;
  const diff = daysBetween(created, today);
  return diff === null ? null : Math.max(diff, 0);
}

/** 미답변은 접수일부터 오늘까지, 답변된 건은 접수일부터 최초 답변일까지 센다(실화면 elapsedLabel 미러) */
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

/** 상태별 건수 — 키를 빠짐없이 적어 인덱싱 접근을 쓰지 않는다 */
function countByStatus(list: readonly DemoInquiry[]): Readonly<Record<StatusFilter, number>> {
  const counts: Record<StatusFilter, number> = {
    all: list.length,
    received: 0,
    answering: 0,
    answered: 0,
    closed: 0,
  };
  for (const inquiry of list) counts[inquiry.status] += 1;
  return counts;
}

/** 유형별 건수 — 같은 규칙(필터 이전 전체 집합) */
function countByTopic(list: readonly DemoInquiry[]): Readonly<Record<TopicFilter, number>> {
  const counts: Record<TopicFilter, number> = {
    all: list.length,
    reward: 0,
    delivery: 0,
    refund: 0,
    payment: 0,
    etc: 0,
  };
  for (const inquiry of list) counts[inquiry.topic] += 1;
  return counts;
}

const unansweredCount = (list: readonly DemoInquiry[]): number =>
  list.filter((inquiry) => isUnanswered(inquiry.status)).length;

/* ── 표 열 정의(데이터 열 9개 — 순번은 leading 으로 별도) ───────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'no', header: '문의번호', nowrap: true },
  { id: 'program', header: '프로그램명' },
  { id: 'customer', header: '문의자', nowrap: true },
  { id: 'subject', header: '제목' },
  { id: 'topic', header: '유형', nowrap: true },
  { id: 'channel', header: '채널', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'createdAt', header: '접수일', nowrap: true },
  { id: 'elapsed', header: '경과', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const filterNavStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const filterHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: cssVar('space.3'),
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

/** 선택 시 배경 강조 + 액션 색 — aria-pressed 로 상태를 말한다(A11Y-12) */
const filterItemStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  fontWeight: active
    ? cssVar('primitive.typography.font-weight.bold')
    : cssVar('primitive.typography.font-weight.regular'),
  textAlign: 'left',
  cursor: 'pointer',
});

const countBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: cssVar('space.5'),
  aspectRatio: '1',
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
  lineHeight: '1',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const noticeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

/** 문의번호는 후원자가 전화로 부르는 값이다 — 줄바꿈 없이 한 덩이로 읽힌다 */
const inquiryNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  color: cssVar('color.text.muted'),
};

const programCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const detailLinkStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
};

const dateTextStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface InquiriesScreenProps {
  readonly loading?: boolean;
  readonly inquiries?: readonly DemoInquiry[];
  readonly initialKeyword?: string;
  readonly initialStatus?: StatusFilter;
  readonly initialTopic?: TopicFilter;
  /** 답변 권한 — 없으면 좌측 안내가 '조회만 가능하다' 는 사실을 미리 밝힌다 (EXC-03) */
  readonly canUpdate?: boolean;
}

function ProgramInquiriesScreen({
  loading = false,
  inquiries = DEMO_INQUIRIES,
  initialKeyword = '',
  initialStatus = FILTER_ALL,
  initialTopic = FILTER_ALL,
  canUpdate = true,
}: InquiriesScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [topic, setTopic] = useState<TopicFilter>(initialTopic);

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null — 0 과 '모름' 은 다른 사실이다
  const statusCounts = useMemo(
    () => (loading ? null : countByStatus(inquiries)),
    [inquiries, loading],
  );
  const topicCounts = useMemo(
    () => (loading ? null : countByTopic(inquiries)),
    [inquiries, loading],
  );
  const pending = useMemo(() => unansweredCount(inquiries), [inquiries]);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      if (status !== FILTER_ALL && inquiry.status !== status) return false;
      if (topic !== FILTER_ALL && inquiry.topic !== topic) return false;
      if (needle === '') return true;
      return (
        inquiry.id.toLowerCase().includes(needle) ||
        inquiry.programName.toLowerCase().includes(needle) ||
        inquiry.customerName.toLowerCase().includes(needle) ||
        inquiry.subject.toLowerCase().includes(needle)
      );
    });
  }, [inquiries, status, topic, keyword]);

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = status !== FILTER_ALL || topic !== FILTER_ALL;

  const resetFilters = (): void => {
    setStatus(FILTER_ALL);
    setTopic(FILTER_ALL);
  };

  const rows: TableProps['rows'] = visible.map((inquiry, index) => ({
    id: inquiry.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 문의 상세·답변(/programs/inquiries/:id) */
    },
    leading: [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      <span key="no" style={inquiryNoStyle}>
        {inquiry.id}
      </span>,
      <span key="program" style={programCellStyle}>
        {inquiry.programName}
      </span>,
      inquiry.customerName,
      // 제목은 상세로 가는 **키보드 경로**다 — 행 클릭은 마우스 전용이다
      <a key="subject" href="#program-inquiry-detail" style={detailLinkStyle}>
        {inquiry.subject}
      </a>,
      <StatusBadge
        key="topic"
        tone={TOPIC_META[inquiry.topic].tone}
        label={TOPIC_META[inquiry.topic].label}
      />,
      CHANNEL_LABEL[inquiry.channel],
      <StatusBadge
        key="status"
        tone={STATUS_META[inquiry.status].tone}
        label={STATUS_META[inquiry.status].label}
      />,
      <span key="created" style={dateTextStyle}>
        {formatDateTime(inquiry.createdAt)}
      </span>,
      <StatusBadge
        key="elapsed"
        tone={elapsedTone(inquiry, TODAY)}
        label={elapsedLabel(inquiry, TODAY)}
      />,
    ],
  }));

  return (
    <div style={layoutStyle}>
      <Panel
        notice={
          <>
            <p style={noticeStyle}>
              {loading
                ? '미답변 건수를 세는 중이에요.'
                : `답변을 기다리는 문의가 ${fmt(pending)}건 있어요.`}
            </p>
            <p style={noticeStyle}>
              결제대행을 끈 프로그램은 후원하기 대신 문의하기 버튼이 노출되고, 그 문의가 이 목록으로
              들어와요. 마감이 있는 펀딩이라 답변이 늦으면 후원이 사라져요.
            </p>
            {!canUpdate && <p style={noticeStyle}>답변 권한이 없어 조회만 가능해요.</p>}
          </>
        }
      >
        <nav style={filterNavStyle} aria-label="프로그램 문의 상태 필터">
          <h2 style={filterHeadingStyle}>처리 상태</h2>
          <ul style={filterListStyle}>
            {STATUS_FILTERS.map((option) => {
              const active = status === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => setStatus(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={countBadgeStyle}>
                      {statusCounts === null ? '—' : fmt(statusCounts[option.id])}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <nav style={filterNavStyle} aria-label="프로그램 문의 유형 필터">
          <h2 style={filterHeadingStyle}>문의 유형</h2>
          <ul style={filterListStyle}>
            {TOPIC_FILTERS.map((option) => {
              const active = topic === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => setTopic(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={countBadgeStyle}>
                      {topicCounts === null ? '—' : fmt(topicCounts[option.id])}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </Panel>

      <div style={pageStyle}>
        <div style={toolbarStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              label="문의번호·프로그램명·문의자·제목 검색"
              value={keyword}
              placeholder="문의번호 · 프로그램명 · 문의자 검색"
              onChange={setKeyword}
            />
          </span>
        </div>

        <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}</p>

        <Table
          caption="프로그램 문의 목록 — 행을 누르면 문의 상세로 이동해 답변을 작성해요. 삭제·일괄작업은 없어요."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[<SeqHeaderCell key="seq" />]}
          loading={loading}
          skeletonRows={PAGE_SIZE}
          empty={
            <EmptyState
              label={ENTITY_LABEL}
              createVerb="접수"
              hasQuery={hasQuery}
              hasActiveFilters={hasActiveFilters}
              onClearSearch={() => setKeyword('')}
              onResetFilters={resetFilters}
            />
          }
        />
      </div>
    </div>
  );
}

/** 정상: 상태·유형 두 필터 + 문의 목록 — 이틀을 넘긴 미답변이 danger 로 갈린다(기준일 2026-07-21) */
export const Default: Story = {
  render: () => <ProgramInquiriesScreen />,
};

/** 최초 로드: 표 스켈레톤 + 건수 배지 '—' — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ProgramInquiriesScreen loading inquiries={[]} />,
};

/** 빈 상태: 접수된 문의가 아직 없음 — 등록 CTA 는 없다(문의는 후원자가 만든다 · STATE-05) */
export const Empty: Story = {
  render: () => <ProgramInquiriesScreen inquiries={[]} />,
};

/** 필터: 유형 '환불'만 골라 운영이 바로 답할 건을 추린다 — 건수 배지는 필터 이전 전체를 유지한다 */
export const Filtered: Story = {
  render: () => <ProgramInquiriesScreen initialTopic="refund" />,
};

/** 읽기 전용: 답변 권한 없음 → 좌측 레일이 그 사실을 미리 밝힌다 (EXC-03) */
export const ReadOnly: Story = {
  render: () => <ProgramInquiriesScreen canUpdate={false} />,
};
