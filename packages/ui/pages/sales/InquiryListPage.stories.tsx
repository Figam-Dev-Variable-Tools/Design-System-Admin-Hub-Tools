/**
 * Design System/Templates/Sales/Inquiry List — 문의 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹(`['영업 관리', 'Sales', '/sales', …]`)의 Inquiries 엔트리(`/sales/inquiries`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/inquiries/InquiryListPage.tsx (라우트 /sales/inquiries).
 * 문의는 고객·채널이 만들고 관리자는 처리·답변만 한다 — 그래서 실화면은 삭제-CRUD 껍데기가 아니라
 * 읽기 전용 껍데기 CrudReadListShell(→ CrudTable → DS Table)을 쓴다: 선택칸·액션 열·일괄삭제 바가
 * 어떤 역할에게도 없고, 행 클릭은 상세로만 간다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다. 실화면 앱 조각(CrudReadListShell·DetailCellLink)은 DS 표면으로 갈음한다:
 *   상단 툴바(검색 + 유형/채널/상태 필터) → SearchField + SelectField ×3
 *   순번 열                              → SeqHeaderCell · SeqCell
 *   유형·상태 배지                        → StatusBadge (우선순위 tone / 상태 tone)
 *   제목·견적 링크(DetailCellLink)        → 토큰만 쓴 <a> (행 클릭은 마우스 전용, 링크가 키보드 경로)
 *   목록 표(읽기 전용 · 선택/액션 없음)    → Table (leadingHead=순번, 행 leading=순번)
 *   빈 결과                              → Empty (검색/필터/진짜 비어있음 3분기)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * DS Empty 는 스토리명 `Empty` 와 충돌하므로 `EmptyState` 로 별칭한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Empty as EmptyState,
  SearchField,
  SeqCell,
  SeqHeaderCell,
  SelectField,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Inquiry List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 sales/inquiries/types 를 화면이 쓰는 필드만 축약해 미러) ───────────────── */

type InquiryType = 'quote' | 'product' | 'support' | 'partnership' | 'claim' | 'etc';
type InquiryChannel = 'web' | 'phone' | 'email' | 'visit';
type InquiryPriority = 'urgent' | 'high' | 'normal' | 'low';
type InquiryStatus =
  'received' | 'assigned' | 'in_progress' | 'hold' | 'quote_issued' | 'answered' | 'closed';

interface DemoInquiry {
  readonly id: string;
  readonly inquiryNo: string;
  readonly title: string;
  readonly type: InquiryType;
  readonly channel: InquiryChannel;
  readonly customerName: string;
  readonly company: string;
  readonly assignee: string;
  readonly priority: InquiryPriority;
  readonly status: InquiryStatus;
  readonly receivedAt: string;
  /** 이 문의로 발행된 견적번호 — '' 면 미발행 */
  readonly quoteNo: string;
}

/** 라벨 맵 — 실화면 types 의 *_OPTIONS 미러 */
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
const STATUS_LABEL: Record<InquiryStatus, string> = {
  received: '접수',
  assigned: '배정',
  in_progress: '처리중',
  hold: '보류',
  quote_issued: '견적 발행',
  answered: '완료',
  closed: '종결',
};

const TYPE_OPTIONS: readonly InquiryType[] = [
  'quote',
  'product',
  'support',
  'partnership',
  'claim',
  'etc',
];
const CHANNEL_OPTIONS: readonly InquiryChannel[] = ['web', 'phone', 'email', 'visit'];
const STATUS_OPTIONS: readonly InquiryStatus[] = [
  'received',
  'assigned',
  'in_progress',
  'hold',
  'quote_issued',
  'answered',
  'closed',
];

/** 상태 → tone (실화면 inquiryStatusTone 미러) */
const STATUS_TONE: Record<InquiryStatus, StatusBadgeTone> = {
  received: 'neutral',
  assigned: 'info',
  in_progress: 'info',
  hold: 'warning',
  quote_issued: 'info',
  answered: 'success',
  closed: 'neutral',
};

/** 우선순위 → tone (실화면 inquiryPriorityTone 미러) */
const priorityTone = (priority: InquiryPriority): StatusBadgeTone => {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'neutral';
  return 'info';
};

const FILTER_ALL = 'all';

const DEMO_INQUIRIES: readonly DemoInquiry[] = [
  {
    id: 'iq-1',
    inquiryNo: 'INQ-20260718-001',
    title: '사무공간 리모델링 견적 요청',
    type: 'quote',
    channel: 'web',
    customerName: '김영도',
    company: '대성물산',
    assignee: '박상담',
    priority: 'high',
    status: 'quote_issued',
    receivedAt: '2026-07-18T09:12:00+09:00',
    quoteNo: 'Q-20260718-003',
  },
  {
    id: 'iq-2',
    inquiryNo: 'INQ-20260717-004',
    title: 'ERP 라이선스 100석 도입 문의',
    type: 'product',
    channel: 'phone',
    customerName: '이서준',
    company: '한빛소프트',
    assignee: '',
    priority: 'urgent',
    status: 'received',
    receivedAt: '2026-07-17T16:40:00+09:00',
    quoteNo: '',
  },
  {
    id: 'iq-3',
    inquiryNo: 'INQ-20260717-002',
    title: '설치 후 로그인 오류 기술지원 요청',
    type: 'support',
    channel: 'email',
    customerName: '최유진',
    company: '미래테크',
    assignee: '정지원',
    priority: 'normal',
    status: 'in_progress',
    receivedAt: '2026-07-17T11:05:00+09:00',
    quoteNo: '',
  },
  {
    id: 'iq-4',
    inquiryNo: 'INQ-20260716-007',
    title: '총판 파트너십 제안',
    type: 'partnership',
    channel: 'visit',
    customerName: '한지민',
    company: '세종유통',
    assignee: '박상담',
    priority: 'low',
    status: 'hold',
    receivedAt: '2026-07-16T14:20:00+09:00',
    quoteNo: '',
  },
  {
    id: 'iq-5',
    inquiryNo: 'INQ-20260715-011',
    title: '납품 지연 관련 클레임',
    type: 'claim',
    channel: 'phone',
    customerName: '오세훈',
    company: '동방무역',
    assignee: '정지원',
    priority: 'urgent',
    status: 'answered',
    receivedAt: '2026-07-15T10:30:00+09:00',
    quoteNo: '',
  },
  {
    id: 'iq-6',
    inquiryNo: 'INQ-20260714-005',
    title: '유지보수 계약 갱신 문의',
    type: 'etc',
    channel: 'web',
    customerName: '배수지',
    company: '가온산업',
    assignee: '박상담',
    priority: 'normal',
    status: 'closed',
    receivedAt: '2026-07-14T13:48:00+09:00',
    quoteNo: '',
  },
];

/** 'YYYY-MM-DD HH:mm' — 실화면 shared/format.formatDateTime 규약 미러(@tds/ui 경계로 자족 구현) */
const pad2 = (value: number): string => String(value).padStart(2, '0');
const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const ymd = `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${ymd} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

/* ── 표 열 정의(데이터 열 8개 — 순번 열은 leadingHead·행 leading 으로 별도) ────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'type', header: '유형', nowrap: true },
  { id: 'channel', header: '채널', nowrap: true },
  { id: 'title', header: '제목' },
  { id: 'customer', header: '고객/거래처', nowrap: true },
  { id: 'assignee', header: '담당', nowrap: true },
  { id: 'received', header: '접수일시', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'quote', header: '견적', nowrap: true },
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

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 4)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const dashStyle: CSSProperties = { color: cssVar('color.text.muted') };

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface InquiryListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음) 재현용 미매칭어 */
  readonly initialKeyword?: string;
  /** 상태 필터 초기값 — 상태별 거르기 재현 */
  readonly initialStatus?: InquiryStatus | typeof FILTER_ALL;
}

function InquiryListScreen({
  loading = false,
  initialKeyword = '',
  initialStatus = FILTER_ALL,
}: InquiryListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [type, setType] = useState<InquiryType | typeof FILTER_ALL>(FILTER_ALL);
  const [channel, setChannel] = useState<InquiryChannel | typeof FILTER_ALL>(FILTER_ALL);
  const [status, setStatus] = useState<InquiryStatus | typeof FILTER_ALL>(initialStatus);

  // 유형 + 채널 + 상태(AND) + 제목/문의번호/고객/거래처 키워드 — 실화면 filterInquiries·searchInquiries 미러
  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_INQUIRIES.filter((item) => {
      if (type !== FILTER_ALL && item.type !== type) return false;
      if (channel !== FILTER_ALL && item.channel !== channel) return false;
      if (status !== FILTER_ALL && item.status !== status) return false;
      if (kw === '') return true;
      return (
        item.title.toLowerCase().includes(kw) ||
        item.inquiryNo.toLowerCase().includes(kw) ||
        item.customerName.toLowerCase().includes(kw) ||
        item.company.toLowerCase().includes(kw)
      );
    });
  }, [keyword, type, channel, status]);

  const hasActiveFilters = type !== FILTER_ALL || channel !== FILTER_ALL || status !== FILTER_ALL;

  const rows: TableProps['rows'] = visible.map((item, index) => ({
    id: item.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 문의 상세(/sales/inquiries/:id). 템플릿에서는 조작 없음 */
    },
    leading: [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      <StatusBadge key="type" tone={priorityTone(item.priority)} label={TYPE_LABEL[item.type]} />,
      CHANNEL_LABEL[item.channel],
      // 제목은 상세로 가는 키보드 경로다(행 클릭은 마우스 전용 — DetailCellLink 미러)
      <a key="title" href={`#inquiry-${item.id}`} style={linkStyle}>
        {item.title}
      </a>,
      `${item.customerName} / ${item.company}`,
      item.assignee === '' ? '미배정' : item.assignee,
      formatDateTime(item.receivedAt),
      <StatusBadge
        key="status"
        tone={STATUS_TONE[item.status]}
        label={STATUS_LABEL[item.status]}
      />,
      // 견적 열은 발행된 문의만 견적으로 가는 역링크를 준다(문의 ↔ 견적 양방향)
      item.quoteNo === '' ? (
        <span key="quote" style={dashStyle}>
          —
        </span>
      ) : (
        <a
          key="quote"
          href={`#quote-${item.quoteNo}`}
          style={linkStyle}
          aria-label={`${item.title} 발행 견적`}
        >
          견적 보기
        </a>
      ),
    ],
  }));

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <div style={searchWrapStyle}>
        <SearchField
          label="제목·문의번호·고객·거래처 검색"
          value={keyword}
          placeholder="제목 · 문의번호 · 고객 검색"
          onChange={setKeyword}
        />
      </div>
      <span style={selectWrapStyle}>
        <SelectField
          value={type}
          aria-label="유형으로 거르기"
          onChange={(event) => setType(event.target.value as InquiryType | typeof FILTER_ALL)}
        >
          <option value={FILTER_ALL}>전체 유형</option>
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {TYPE_LABEL[option]}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={channel}
          aria-label="채널로 거르기"
          onChange={(event) => setChannel(event.target.value as InquiryChannel | typeof FILTER_ALL)}
        >
          <option value={FILTER_ALL}>전체 채널</option>
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CHANNEL_LABEL[option]}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={status}
          aria-label="상태로 거르기"
          onChange={(event) => setStatus(event.target.value as InquiryStatus | typeof FILTER_ALL)}
        >
          <option value={FILTER_ALL}>전체 상태</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABEL[option]}
            </option>
          ))}
        </SelectField>
      </span>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>문의</h1>

      {toolbar}

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${visible.length.toLocaleString('ko-KR')}건`}
      </p>

      <Table
        caption="문의 목록 — 조회 전용입니다. 행을 누르면 문의 상세로 이동합니다."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[<SeqHeaderCell key="seq" />]}
        loading={loading}
        skeletonRows={6}
        empty={
          <EmptyState
            label="문의"
            createVerb="접수"
            hasQuery={keyword.trim() !== ''}
            hasActiveFilters={hasActiveFilters}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => {
              setType(FILTER_ALL);
              setChannel(FILTER_ALL);
              setStatus(FILTER_ALL);
            }}
          />
        }
      />
    </div>
  );
}

/** 정상: 문의 목록이 채워진 기본 상태(유형·채널·상태 배지가 다양하게 섞임) */
export const Default: Story = {
  render: () => <InquiryListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <InquiryListScreen loading />,
};

/** 상태 필터: '접수' 상태만 남기고 걸러진 목록 — 상태 SelectField 로 좁힌 결과 */
export const StatusFiltered: Story = {
  render: () => <InquiryListScreen initialStatus="received" />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <InquiryListScreen initialKeyword="등록되지 않은 문의" />,
};
