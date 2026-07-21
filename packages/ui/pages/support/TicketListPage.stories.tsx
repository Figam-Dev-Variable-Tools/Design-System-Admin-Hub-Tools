/**
 * Design System/Templates/Support/Ticket List — 1:1 문의 목록(트리아지) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/support/tickets` → 메뉴 en = "Support"(고객센터), 화면 en = "Tickets"
 * (packages/ui/pages/_data/pages.ts 의 Business 섹션 Support 그룹에서 확정).
 *
 * 대응 실화면: apps/admin/src/pages/support/tickets/TicketListPage.tsx (라우트 /support/tickets).
 * 실화면은 **읽기 전용** 껍데기 CrudReadListShell 을 쓴다 — 문의는 고객 채널이 만들고 관리자는 처리·답변만
 * 하므로 삭제·일괄·선택칸이 어떤 역할에게도 없다. 대신 행을 누르면 상세(/support/tickets/:id)로 간다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면 앱 조각은 가장 가까운 DS 표면으로 갈음한다:
 *   CrudReadListShell(앱)          → Table(선택·액션 열 없음) + 요약 문구 + Empty/Alert 직접 조립
 *   검색 입력(IME 안전)            → SearchField
 *   상태·우선순위·채널·유형 필터    → SelectField ×4 (실화면 툴바의 select 네 개)
 *   상태·우선순위·SLA 배지          → StatusBadge (도메인 tone/label 미러)
 *   제목(상세로 가는 링크)          → 토큰만 쓴 강조 텍스트(실화면 DetailCellLink — 행 클릭이 상세로 간다)
 *   빈 결과                        → Empty (검색/필터/진짜 비어있음 구분)
 *   목록 조회 실패                  → Alert(danger) + 다시 시도 Button
 *
 * SLA(첫 응답 목표시간)·상태·우선순위·채널의 라벨/톤 규칙은 실화면 support/_shared/domain.ts 의 순수
 * 규칙을 값으로 미러한다(@tds/ui 경계라 직접 import 하지 못한다). receivedAt 은 마운트 시각 기준 상대값이라
 * 초과/임박/정상/응답완료 네 상태가 항상 재현된다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Empty as EmptyState,
  SearchField,
  SelectField,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Ticket List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 라벨·톤 (실화면 support/_shared/domain.ts 미러 — @tds/ui 경계라 값으로 복사) ──────── */

type TicketChannel = 'web' | 'kakao' | 'naver' | 'phone' | 'email';
type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';
type TicketStatus = 'received' | 'assigned' | 'in_progress' | 'answered' | 'closed';

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

const STATUS_TONE: Record<TicketStatus, StatusBadgeTone> = {
  received: 'neutral',
  assigned: 'info',
  in_progress: 'info',
  answered: 'success',
  closed: 'neutral',
};

const priorityTone = (priority: TicketPriority): StatusBadgeTone => {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'neutral';
  return 'info';
};

/* ── SLA (첫 응답 목표시간 — 우선순위로 환산) 미러 ──────────────────────────────────────────── */

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

function slaState(receivedAtMs: number, priority: TicketPriority, status: TicketStatus): SlaState {
  if (status === 'answered' || status === 'closed') return 'met';
  const windowMs = SLA_TARGET_HOURS[priority] * HOUR_MS;
  const remaining = receivedAtMs + windowMs - Date.now();
  if (remaining <= 0) return 'breached';
  if (remaining <= windowMs * SLA_DUE_SOON_RATIO) return 'due_soon';
  return 'on_track';
}

/** 'YYYY-MM-DD HH:mm' 로컬 — 실화면 shared/format.formatDateTime 규약(경계로 직접 구현) */
const pad2 = (value: number): string => String(value).padStart(2, '0');
function formatDateTime(ms: number): string {
  const date = new Date(ms);
  const ymd = `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${ymd} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/* ── 데모 데이터(실화면 Ticket 모델을 목록이 쓰는 필드만 축약해 미러) ───────────────────────── */

interface DemoTicket {
  readonly id: string;
  readonly ticketNo: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly assignee: string;
  readonly customerName: string;
  /** 접수 시각 = 마운트 시각에서 이만큼 이전(시간) — SLA 상태를 결정론적으로 재현 */
  readonly receivedHoursAgo: number;
}

const FILTER_ALL = 'all';

interface FilterOption<T extends string> {
  readonly id: T;
  readonly label: string;
}

const STATUS_OPTIONS: readonly FilterOption<TicketStatus>[] = [
  { id: 'received', label: '접수' },
  { id: 'assigned', label: '배정' },
  { id: 'in_progress', label: '처리중' },
  { id: 'answered', label: '답변완료' },
  { id: 'closed', label: '종결' },
];

const PRIORITY_OPTIONS: readonly FilterOption<TicketPriority>[] = [
  { id: 'urgent', label: '긴급' },
  { id: 'high', label: '높음' },
  { id: 'normal', label: '보통' },
  { id: 'low', label: '낮음' },
];

const CHANNEL_OPTIONS: readonly FilterOption<TicketChannel>[] = [
  { id: 'web', label: '웹' },
  { id: 'kakao', label: '카카오톡' },
  { id: 'naver', label: '네이버톡톡' },
  { id: 'phone', label: '전화' },
  { id: 'email', label: '이메일' },
];

const CATEGORY_OPTIONS: readonly FilterOption<string>[] = [
  { id: 'refund', label: '결제·환불' },
  { id: 'delivery', label: '배송' },
  { id: 'product', label: '상품 문의' },
  { id: 'account', label: '계정' },
  { id: 'etc', label: '기타' },
];

const CATEGORY_LABEL = new Map(CATEGORY_OPTIONS.map((option) => [option.id, option.label]));

const DEMO_TICKETS: readonly (DemoTicket & { readonly categoryId: string })[] = [
  {
    id: 't-1',
    ticketNo: 'INQ-20260',
    title: '결제했는데 주문이 취소되었어요',
    categoryId: 'refund',
    categoryLabel: '결제·환불',
    channel: 'kakao',
    priority: 'urgent',
    status: 'received',
    assignee: '',
    customerName: '김서연',
    receivedHoursAgo: 2,
  },
  {
    id: 't-2',
    ticketNo: 'INQ-20259',
    title: '배송이 일주일째 안 와요',
    categoryId: 'delivery',
    categoryLabel: '배송',
    channel: 'web',
    priority: 'high',
    status: 'assigned',
    assignee: '이상담',
    customerName: '박민지',
    receivedHoursAgo: 3.7,
  },
  {
    id: 't-3',
    ticketNo: 'INQ-20258',
    title: '상품 옵션을 변경하고 싶습니다',
    categoryId: 'product',
    categoryLabel: '상품 문의',
    channel: 'naver',
    priority: 'normal',
    status: 'in_progress',
    assignee: '강응대',
    customerName: '최유진',
    receivedHoursAgo: 1,
  },
  {
    id: 't-4',
    ticketNo: 'INQ-20257',
    title: '앱에서 로그인이 안 됩니다',
    categoryId: 'account',
    categoryLabel: '계정',
    channel: 'email',
    priority: 'urgent',
    status: 'assigned',
    assignee: '박운영',
    customerName: '정우성',
    receivedHoursAgo: 0.3,
  },
  {
    id: 't-5',
    ticketNo: 'INQ-20255',
    title: '교환 신청 잘 접수됐는지 확인 부탁드려요',
    categoryId: 'delivery',
    categoryLabel: '배송',
    channel: 'phone',
    priority: 'normal',
    status: 'answered',
    assignee: '이상담',
    customerName: '한소희',
    receivedHoursAgo: 30,
  },
  {
    id: 't-6',
    ticketNo: 'INQ-20251',
    title: '단순 이용 후기 남깁니다',
    categoryId: 'etc',
    categoryLabel: '기타',
    channel: 'web',
    priority: 'low',
    status: 'closed',
    assignee: '강응대',
    customerName: '오세훈',
    receivedHoursAgo: 80,
  },
  {
    id: 't-7',
    ticketNo: 'INQ-20250',
    title: '세금계산서 재발행 요청',
    categoryId: 'refund',
    categoryLabel: '결제·환불',
    channel: 'email',
    priority: 'high',
    status: 'received',
    assignee: '',
    customerName: '윤아름',
    receivedHoursAgo: 10,
  },
  {
    id: 't-8',
    ticketNo: 'INQ-20248',
    title: '재고 입고 일정이 궁금합니다',
    categoryId: 'product',
    categoryLabel: '상품 문의',
    channel: 'kakao',
    priority: 'normal',
    status: 'assigned',
    assignee: '최지원',
    customerName: '배수지',
    receivedHoursAgo: 5,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(읽기 전용 — 선택·액션 열 없음) ───────────────────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'status', header: '상태', nowrap: true },
  { id: 'priority', header: '우선순위', nowrap: true },
  { id: 'category', header: '유형', nowrap: true },
  { id: 'channel', header: '채널', nowrap: true },
  { id: 'title', header: '제목' },
  { id: 'customer', header: '고객', nowrap: true },
  { id: 'assignee', header: '담당', nowrap: true },
  { id: 'sla', header: 'SLA', nowrap: true },
  { id: 'received', header: '접수일시', nowrap: true },
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

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 3.5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const titleCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  color: cssVar('color.action.primary.default'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ──────────────────────────── */

type ScreenState = 'default' | 'loading' | 'empty' | 'error';

function TicketListScreen({ state }: { state: ScreenState }) {
  const loading = state === 'loading';
  const failed = state === 'error';

  const [keyword, setKeyword] = useState(state === 'empty' ? '존재하지 않는 문의' : '');
  const [status, setStatus] = useState<TicketStatus | typeof FILTER_ALL>(FILTER_ALL);
  const [priority, setPriority] = useState<TicketPriority | typeof FILTER_ALL>(FILTER_ALL);
  const [channel, setChannel] = useState<TicketChannel | typeof FILTER_ALL>(FILTER_ALL);
  const [categoryId, setCategoryId] = useState<string>(FILTER_ALL);

  // 접수 시각은 마운트 시각 기준으로 한 번 고정한다 — 행마다 SLA 가 일관되게 계산되도록.
  const now = useMemo(() => Date.now(), []);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_TICKETS.filter((ticket) => {
      if (status !== FILTER_ALL && ticket.status !== status) return false;
      if (priority !== FILTER_ALL && ticket.priority !== priority) return false;
      if (channel !== FILTER_ALL && ticket.channel !== channel) return false;
      if (categoryId !== FILTER_ALL && ticket.categoryId !== categoryId) return false;
      if (kw === '') return true;
      return (
        ticket.title.toLowerCase().includes(kw) ||
        ticket.ticketNo.toLowerCase().includes(kw) ||
        ticket.customerName.toLowerCase().includes(kw)
      );
    });
  }, [keyword, status, priority, channel, categoryId]);

  const rows: TableProps['rows'] = visible.map((ticket) => {
    const receivedMs = now - ticket.receivedHoursAgo * HOUR_MS;
    const sla = slaState(receivedMs, ticket.priority, ticket.status);
    return {
      id: ticket.id,
      onActivate: () => {
        /* 실화면에서는 문의 상세(/support/tickets/:id)로 이동한다 — 템플릿에서는 조작 없음 */
      },
      cells: [
        <StatusBadge tone={STATUS_TONE[ticket.status]} label={STATUS_LABEL[ticket.status]} />,
        <StatusBadge
          tone={priorityTone(ticket.priority)}
          label={PRIORITY_LABEL[ticket.priority]}
        />,
        ticket.categoryLabel,
        CHANNEL_LABEL[ticket.channel],
        <span style={titleCellStyle}>{ticket.title}</span>,
        ticket.customerName,
        ticket.assignee === '' ? '미배정' : ticket.assignee,
        <StatusBadge tone={SLA_TONE[sla]} label={SLA_LABEL[sla]} />,
        formatDateTime(receivedMs),
      ],
    };
  });

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters =
    status !== FILTER_ALL ||
    priority !== FILTER_ALL ||
    channel !== FILTER_ALL ||
    categoryId !== FILTER_ALL;

  const resetFilters = (): void => {
    setStatus(FILTER_ALL);
    setPriority(FILTER_ALL);
    setChannel(FILTER_ALL);
    setCategoryId(FILTER_ALL);
  };

  const toolbar = (
    <div style={toolbarStyle}>
      <span style={searchWrapStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="제목·문의번호·고객 검색"
          placeholder="제목 · 문의번호 · 고객 검색"
        />
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={status}
          onChange={(event) => setStatus(event.target.value as TicketStatus | typeof FILTER_ALL)}
          aria-label="상태로 거르기"
        >
          <option value={FILTER_ALL}>전체 상태</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as TicketPriority | typeof FILTER_ALL)
          }
          aria-label="우선순위로 거르기"
        >
          <option value={FILTER_ALL}>전체 우선순위</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={channel}
          onChange={(event) => setChannel(event.target.value as TicketChannel | typeof FILTER_ALL)}
          aria-label="채널로 거르기"
        >
          <option value={FILTER_ALL}>전체 채널</option>
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="유형으로 거르기"
        >
          <option value={FILTER_ALL}>전체 유형</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {CATEGORY_LABEL.get(option.id) ?? option.label}
            </option>
          ))}
        </SelectField>
      </span>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>1:1 문의</h1>

      {toolbar}

      {failed ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>1:1 문의 목록을 불러오지 못했습니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <>
          <p style={summaryStyle} aria-busy={loading}>
            {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
          </p>

          <Table
            caption="1:1 문의 목록 — 행을 누르면 문의 상세로 이동합니다. 문의는 고객이 접수하므로 삭제·일괄 작업이 없습니다."
            columns={COLUMNS}
            rows={rows}
            loading={loading}
            skeletonRows={8}
            empty={
              <EmptyState
                label="문의"
                createVerb="접수"
                hasQuery={hasQuery}
                hasActiveFilters={hasActiveFilters}
                onClearSearch={() => setKeyword('')}
                onResetFilters={resetFilters}
              />
            }
          />
        </>
      )}
    </div>
  );
}

/** 정상: 상태·우선순위·SLA 배지가 채워진 문의 트리아지 목록(초과·임박·정상·응답완료가 모두 보인다) */
export const Default: Story = {
  render: () => <TicketListScreen state="default" />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <TicketListScreen state="loading" />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <TicketListScreen state="empty" />,
};

/** 에러: 목록 조회 실패 — Alert(danger) + 다시 시도(실화면 CrudReadListShell error 흐름) */
export const Error: Story = {
  render: () => <TicketListScreen state="error" />,
};
