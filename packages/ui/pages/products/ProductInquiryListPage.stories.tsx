/**
 * Design System/Templates/Products/Inquiries — 상품 문의 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products/inquiries` → 메뉴 en = "Products"(상품 관리), 화면 en =
 * "Inquiries" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Products 그룹의
 * `['/products/inquiries', '문의', 'Inquiries']`).
 *
 * 대응 실화면: apps/admin/src/pages/products/inquiries/ProductInquiryListPage.tsx
 * (라우트 /products/inquiries).
 * **결제대행(PG)을 끈 상품**의 스토어프론트 버튼은 '구매하기' 대신 '문의하기' 다 — 그 버튼을 누른
 * 고객의 글이 도착하는 곳이 이 목록이다(그 스위치는 /settings/payment 가 쥐고 있다). 그래서 이
 * 목록의 중심 열은 상품도 제목도 아니고 **얼마나 오래 답을 못 받았는가**(경과)다: 운영자가 여기서
 * 하는 판단은 '무엇부터 답할까' 하나뿐이다. 문의는 고객이 만들고 관리자는 답변·종결만 하므로
 * 삭제·일괄작업·선택 체크박스가 **어떤 역할에게도** 없다(실화면 CrudReadListShell). 좌측 상태
 * 필터의 건수는 **필터 이전** 전체 집합에서 세고, 경과의 기준일은 실화면과 같은 고정 시계
 * `TODAY = '2026-07-21'` 이다 — 화면이 `new Date()` 를 읽으면 스토리 회귀 비교가 매일 깨진다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudReadListShell/CrudTable → DS Table(+ SeqHeaderCell·SeqCell — 선택·액션 열은 없다)
 *   FilterRail/FilterPanel      → Panel + 토큰만 쓴 <nav>/<ul>/<li>(button[aria-pressed] + 건수 배지)
 *   DetailCellLink              → 토큰만 쓴 <a>(행 클릭의 키보드 짝)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 처리 상태 필터        → Panel(notice) + 토큰 <nav>(aria-pressed + 건수 배지)
 *   문의번호·상품명·문의자 검색 → SearchField
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   제목(상세로 가는 키보드 경로) → 토큰 <a> (DetailCellLink 갈음)
 *   처리 상태                 → StatusBadge (inquiryStatusTone/Label 미러)
 *   경과('3일째 미답변')       → StatusBadge (elapsedTone/Label 미러 — 색만으로 지연을 말하지 않는다)
 *   목록 표                   → Table (leadingHead=순번 · 행 클릭 → 상세)
 *   빈 결과                   → Empty (검색 지우기 / 필터 초기화)
 *   답변 권한 없음            → Panel notice 안내 문구 (EXC-03)
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
  title: 'Design System/Templates/Products/Inquiries',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 _shared/store · types 미러) ─────────────────────────────────────── */

/** 경과의 기준일 — 실화면 ProductInquiryListPage.TODAY 와 같은 값이라야 스토리가 고정된다 */
const TODAY = '2026-07-21';

/** 이 날을 넘긴 미답변은 붉게 알린다 — 사흘은 국내 커머스 응대 관례의 마지노선이다 */
const OVERDUE_DAYS = 3;

const ENTITY_LABEL = '상품 문의';
const PAGE_SIZE = 10;

type InquiryStatus = 'received' | 'answering' | 'answered' | 'closed';
type InquiryChannel = 'storefront' | 'app' | 'phone' | 'email' | 'kakao';

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/**
 * 상태 문구·색 — 실화면 types.STATUS_META 미러.
 * 미답변 두 상태(접수·답변 중)를 한 색으로 묶지 않는다: '답변 중' 은 이미 사람이 붙은 상태라
 * 방치된 '접수' 와 같은 색이면 운영자가 무엇을 먼저 집어야 할지 알 수 없다.
 */
const STATUS_META: Record<InquiryStatus, StatusMeta> = {
  received: { label: '접수', tone: 'warning' },
  answering: { label: '답변 중', tone: 'info' },
  answered: { label: '답변 완료', tone: 'success' },
  closed: { label: '종결', tone: 'neutral' },
};

/** 채널 문구 — 'storefront' 가 PG 를 끈 상품 페이지의 '문의하기' 버튼이다(이 모듈의 존재 이유) */
const CHANNEL_LABEL: Record<InquiryChannel, string> = {
  storefront: '상품 페이지',
  app: '모바일 앱',
  phone: '전화',
  email: '이메일',
  kakao: '카카오톡',
};

const STATUS_ALL = 'all';
type StatusFilter = typeof STATUS_ALL | InquiryStatus;

/** 좌측 필터 축 — 처리 흐름 순(접수 → 답변 중 → 답변 완료 → 종결) */
const STATUS_FILTERS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: STATUS_ALL, label: '전체' },
  { id: 'received', label: STATUS_META.received.label },
  { id: 'answering', label: STATUS_META.answering.label },
  { id: 'answered', label: STATUS_META.answered.label },
  { id: 'closed', label: STATUS_META.closed.label },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const fmt = (value: number): string => KO_NUMBER.format(value);

/** KST 오프셋(ms) — 시각은 UTC 로 저장하고 표기만 서울 달력으로 환산한다(ERP-09) */
const SEOUL_OFFSET_MS = 32_400_000;

/** ISO(UTC) → 서울 달력일 'YYYY-MM-DD'. 읽을 수 없으면 null (실화면 seoulDayOf 미러) */
function seoulDayOf(iso: string): string | null {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return new Date(at + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO(UTC) → 'YYYY-MM-DD HH:mm'(KST) — 실화면 formatDateTime 미러 */
function formatDateTime(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  const kst = new Date(at + SEOUL_OFFSET_MS).toISOString();
  return `${kst.slice(0, 10)} ${kst.slice(11, 16)}`;
}

/** 두 달력일 사이의 일수 — 읽을 수 없으면 null (실화면 daysBetween 미러) */
function daysBetween(from: string, to: string): number | null {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

/** 아직 고객이 답을 못 받은 상태인가 — 미답변 집계·경과 문구의 단일 정의 */
const isUnanswered = (status: InquiryStatus): boolean =>
  status === 'received' || status === 'answering';

/* ── 데모 데이터(실화면 _shared/store 픽스처 미러 — 가상 인물·가상 연락처) ─────────────────────── */

interface DemoInquiry {
  /** 문의번호를 겸한다 — 'PIQ-YYYYMMDD-NNN'. 고객이 전화로 부르는 번호와 URL 이 같은 값이다 */
  readonly id: string;
  readonly productName: string;
  readonly customerName: string;
  readonly channel: InquiryChannel;
  readonly subject: string;
  readonly status: InquiryStatus;
  /** 접수 일시 ISO(UTC) */
  readonly createdAt: string;
  /** 최초 답변 일시 ISO(UTC) — 미답변이면 '' */
  readonly answeredAt: string;
}

/** 접수 최신순(위가 최근) — 실화면 sortProductInquiries 가 이미 정렬해 넘긴 순서다 */
const DEMO_INQUIRIES: readonly DemoInquiry[] = [
  {
    id: 'PIQ-20260721-005',
    productName: '카밀 워시드 데님 팬츠',
    customerName: '최유진',
    channel: 'kakao',
    subject: '입고 알림을 받고 싶습니다',
    status: 'received',
    createdAt: '2026-07-20T23:30:00Z',
    answeredAt: '',
  },
  {
    id: 'PIQ-20260720-002',
    productName: '테라 스니커즈 데일리',
    customerName: '박지훈',
    channel: 'app',
    subject: '사이즈 교환이 가능한지 궁금합니다',
    status: 'answering',
    createdAt: '2026-07-20T05:40:00Z',
    answeredAt: '',
  },
  {
    id: 'PIQ-20260718-001',
    productName: '루미엔 경량 패딩 점퍼',
    customerName: '김서연',
    channel: 'storefront',
    subject: '구매 전 재고 확인 부탁드립니다',
    status: 'received',
    createdAt: '2026-07-18T01:12:00Z',
    answeredAt: '',
  },
  {
    id: 'PIQ-20260715-003',
    productName: '노바 베이직 코튼 티셔츠',
    customerName: '이하늘',
    channel: 'phone',
    subject: '단체 주문 시 가격 문의',
    status: 'answered',
    createdAt: '2026-07-15T00:05:00Z',
    answeredAt: '2026-07-16T02:20:00Z',
  },
  {
    id: 'PIQ-20260710-004',
    productName: '오브제 미니멀 크로스백',
    customerName: '정민우',
    channel: 'email',
    subject: '카드 결제 대신 계좌이체가 가능한가요',
    status: 'closed',
    createdAt: '2026-07-10T07:30:00Z',
    answeredAt: '2026-07-10T09:02:00Z',
  },
];

/** 접수일부터 오늘까지 며칠이 지났나 — 읽을 수 없으면 null */
function pendingDays(inquiry: DemoInquiry, today: string): number | null {
  const created = seoulDayOf(inquiry.createdAt);
  if (created === null) return null;
  const diff = daysBetween(created, today);
  return diff === null ? null : Math.max(diff, 0);
}

/**
 * 경과 문구 — 미답변은 **접수일부터 오늘까지**, 답변된 건은 **접수일부터 최초 답변일까지** 를 센다:
 * 전자는 아직 흘러가는 시간이고 후자는 이미 끝난 사실이라 세는 구간이 다르다(실화면 elapsedLabel 미러).
 */
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
  // 값을 읽을 수 없을 때(형식 깨짐)는 0일로 위장하지 않는다
  if (days === null) return '—';
  return days === 0 ? '오늘 접수' : `${fmt(days)}일째 미답변`;
}

/** 경과의 색 — 문구와 함께만 쓴다(색만으로 지연을 말하지 않는다) */
function elapsedTone(inquiry: DemoInquiry, today: string): StatusBadgeTone {
  if (!isUnanswered(inquiry.status)) return 'neutral';
  const days = pendingDays(inquiry, today);
  if (days === null) return 'neutral';
  if (days >= OVERDUE_DAYS) return 'danger';
  return days === 0 ? 'info' : 'warning';
}

/** 상태별 건수 — 좌측 필터 배지. 키를 빠짐없이 적어 인덱싱 접근을 쓰지 않는다 */
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

/** 아직 답이 안 나간 건수 — 좌측 안내와 배지가 같은 수를 말하게 하는 단일 정의 */
const unansweredCount = (list: readonly DemoInquiry[]): number =>
  list.filter((inquiry) => isUnanswered(inquiry.status)).length;

/* ── 표 열 정의(데이터 열 8개 — 순번은 leading 으로 별도) ───────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'no', header: '문의번호', nowrap: true },
  { id: 'product', header: '상품명' },
  { id: 'customer', header: '문의자', nowrap: true },
  { id: 'subject', header: '제목' },
  { id: 'channel', header: '채널', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'createdAt', header: '접수일', nowrap: true },
  { id: 'elapsed', header: '경과', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (실화면 layoutStyle 미러) */
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
  height: cssVar('space.5'),
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

/** 문의번호는 고객이 전화로 부르는 값이다 — 줄바꿈 없이 한 덩이로 읽힌다 */
const inquiryNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  color: cssVar('color.text.muted'),
};

const productCellStyle: CSSProperties = {
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
  /** 답변 권한 — 없으면 좌측 안내가 '조회만 가능하다' 는 사실을 미리 밝힌다 (EXC-03) */
  readonly canUpdate?: boolean;
}

function ProductInquiriesScreen({
  loading = false,
  inquiries = DEMO_INQUIRIES,
  initialKeyword = '',
  initialStatus = STATUS_ALL,
  canUpdate = true,
}: InquiriesScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 — 0 과 '모름' 은 다른 사실이다
  const counts = useMemo(() => (loading ? null : countByStatus(inquiries)), [inquiries, loading]);
  const pending = useMemo(() => unansweredCount(inquiries), [inquiries]);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      if (status !== STATUS_ALL && inquiry.status !== status) return false;
      if (needle === '') return true;
      return (
        inquiry.id.toLowerCase().includes(needle) ||
        inquiry.productName.toLowerCase().includes(needle) ||
        inquiry.customerName.toLowerCase().includes(needle) ||
        inquiry.subject.toLowerCase().includes(needle)
      );
    });
  }, [inquiries, status, keyword]);

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = status !== STATUS_ALL;

  const rows: TableProps['rows'] = visible.map((inquiry, index) => ({
    id: inquiry.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 문의 상세·답변(/products/inquiries/:id) */
    },
    leading: [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      <span key="no" style={inquiryNoStyle}>
        {inquiry.id}
      </span>,
      <span key="product" style={productCellStyle}>
        {inquiry.productName}
      </span>,
      inquiry.customerName,
      // 제목은 상세로 가는 **키보드 경로**다 — 행 클릭은 마우스 전용이다
      <a key="subject" href="#product-inquiry-detail" style={detailLinkStyle}>
        {inquiry.subject}
      </a>,
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
                ? '미답변 건수를 세는 중입니다.'
                : `답변을 기다리는 문의가 ${fmt(pending)}건 있습니다.`}
            </p>
            <p style={noticeStyle}>
              결제대행을 끈 상품은 구매하기 대신 문의하기 버튼이 노출되고, 그 문의가 이 목록으로
              들어옵니다.
            </p>
            {!canUpdate && <p style={noticeStyle}>답변 권한이 없어 조회만 가능합니다.</p>}
          </>
        }
      >
        <nav style={filterNavStyle} aria-label="상품 문의 상태 필터">
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
                      {counts === null ? '—' : fmt(counts[option.id])}
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
              label="문의번호·상품명·문의자·제목 검색"
              value={keyword}
              placeholder="문의번호 · 상품명 · 문의자 검색"
              onChange={setKeyword}
            />
          </span>
        </div>

        <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}</p>

        <Table
          caption="상품 문의 목록 — 행을 누르면 문의 상세로 이동해 답변을 작성합니다. 삭제·일괄작업은 없습니다."
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
              onResetFilters={() => setStatus(STATUS_ALL)}
            />
          }
        />
      </div>
    </div>
  );
}

/** 정상: 상태 필터 + 문의 목록 — 경과 배지가 '3일째 미답변'까지 글자로 말한다(기준일 2026-07-21) */
export const Default: Story = {
  render: () => <ProductInquiriesScreen />,
};

/** 최초 로드: 표 스켈레톤 + 건수 배지 '—' — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ProductInquiriesScreen loading inquiries={[]} />,
};

/** 빈 상태: 접수된 문의가 아직 없음 — 등록 CTA 는 없다(문의는 고객이 만든다 · STATE-05) */
export const Empty: Story = {
  render: () => <ProductInquiriesScreen inquiries={[]} />,
};

/** 필터: '접수'만 골라 아직 사람이 붙지 않은 건만 본다 — 건수 배지는 필터 이전 전체를 유지한다 */
export const Filtered: Story = {
  render: () => <ProductInquiriesScreen initialStatus="received" />,
};

/** 읽기 전용: 답변 권한 없음 → 좌측 레일이 그 사실을 미리 밝힌다 (EXC-03) */
export const ReadOnly: Story = {
  render: () => <ProductInquiriesScreen canUpdate={false} />,
};
