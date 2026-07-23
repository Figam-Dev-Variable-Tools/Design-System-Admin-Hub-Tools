/**
 * Design System/Templates/Sales/Quote List — 견적 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹의 Quotes 엔트리(`/sales/quotes`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/quotes/QuoteListPage.tsx (라우트 /sales/quotes).
 * 견적은 관리자가 만드는 삭제-CRUD 목록이다 — CrudListShell(→ CrudTable → DS Table) 위에 상태 필터 +
 * 검색 + 합계금액 + 상태 배지 + 사슬의 앞뒤(원본 문의 · 연결된 계약) 링크 + 선택 일괄삭제 + 행 액션(수정/삭제).
 * 등록 CTA 는 **없다** — 견적은 문의에서만 발행된다(사슬 밖 생성 차단).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 앱 조각(CrudListShell·CrudTable)을 DS 표면으로 갈음한다:
 *   상단 툴바(검색 + 상태 필터 + 등록) → SearchField + SelectField + Button(primary)+Icon(plus-circle)
 *   선택 일괄삭제 바                    → SelectionBar + Button(danger)
 *   전체선택 헤더 / 행 선택칸 / 순번     → SelectAllHeaderCell · RowSelectCell · SeqHeaderCell · SeqCell
 *   원본 문의 역링크(문의 ↔ 견적 양방향) → 토큰만 쓴 <a> (수동 등록 견적은 원본이 없어 '—')
 *   합계금액                           → computeTotals + 토큰만 쓴 원화 표기
 *   상태 배지                          → StatusBadge (견적 상태 tone)
 *   연결된 계약(있을 때만)              → 링크 (없으면 '—')
 *   행 액션(수정/삭제)                  → RowActions
 *   빈 결과                            → Empty (검색/필터/진짜 비어있음 3분기)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * DS Empty 는 스토리명 `Empty` 와 충돌하므로 `EmptyState` 로 별칭한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  Empty as EmptyState,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Quote List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 sales/quotes/types 를 화면이 쓰는 필드만 축약해 미러) ───────────────────── */

type QuoteTaxMode = 'standard' | 'zero_rated' | 'exempt';
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'ordered';

interface DemoLineItem {
  readonly quantity: number;
  readonly unitPrice: number;
}

interface DemoQuote {
  readonly id: string;
  readonly quoteNo: string;
  readonly accountName: string;
  /** 원본 문의번호 — '' 면 수동 등록 견적(원본 없음) */
  readonly inquiryNo: string;
  readonly taxMode: QuoteTaxMode;
  readonly items: readonly DemoLineItem[];
  readonly validUntil: string;
  readonly status: QuoteStatus;
}

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: '작성중',
  sent: '발송',
  accepted: '승인',
  rejected: '반려',
  expired: '만료',
  ordered: '수주(계약 진행)',
};
const STATUS_TONE: Record<QuoteStatus, StatusBadgeTone> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
  ordered: 'success',
};
const STATUS_OPTIONS: readonly QuoteStatus[] = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'ordered',
];

const FILTER_ALL = 'all';
const TAX_RATE: Record<QuoteTaxMode, number> = { standard: 0.1, zero_rated: 0, exempt: 0 };

/** 합계금액(공급가액 + 세액) — 실화면 computeTotals 미러(라인별 반올림 후 합산) */
const totalOf = (items: readonly DemoLineItem[], taxMode: QuoteTaxMode): number => {
  const rate = TAX_RATE[taxMode];
  let supply = 0;
  let vat = 0;
  for (const item of items) {
    const amount = item.quantity * item.unitPrice;
    supply += amount;
    vat += Math.round(amount * rate);
  }
  return supply + vat;
};

/** 원화 표기 '1,200,000원' — 실화면 formatWon 미러 */
const formatWon = (amount: number): string => `${amount.toLocaleString('ko-KR')}원`;

/**
 * 계약이 붙은 견적인가 — 실화면은 `findContractIdByQuote(quote.id) !== ''` 를 읽는다.
 *
 * 여기가 예전에 '수주 전환' 버튼이었다. 그 버튼은 사라졌다: 수주는 사람이 따로 누르는 일이 아니라
 * **계약이 만들어진 결과**다(실화면 quotes/types 의 상태 전이 머리말).
 */
const hasContract = (status: QuoteStatus): boolean => status === 'ordered';

const DEMO_QUOTES: readonly DemoQuote[] = [
  {
    id: 'q-1',
    quoteNo: 'Q-20260718-003',
    accountName: '대성물산',
    inquiryNo: 'INQ-20260718-001',
    taxMode: 'standard',
    items: [
      { quantity: 1, unitPrice: 18000000 },
      { quantity: 3, unitPrice: 1200000 },
    ],
    validUntil: '2026-08-17',
    status: 'sent',
  },
  {
    id: 'q-2',
    quoteNo: 'Q-20260717-002',
    accountName: '한빛소프트',
    inquiryNo: 'INQ-20260717-004',
    taxMode: 'standard',
    items: [{ quantity: 100, unitPrice: 150000 }],
    validUntil: '2026-08-16',
    status: 'accepted',
  },
  {
    id: 'q-3',
    quoteNo: 'Q-20260716-001',
    accountName: '미래테크',
    inquiryNo: '',
    taxMode: 'zero_rated',
    items: [{ quantity: 2, unitPrice: 4500000 }],
    validUntil: '2026-08-15',
    status: 'draft',
  },
  {
    id: 'q-4',
    quoteNo: 'Q-20260714-005',
    accountName: '세종유통',
    inquiryNo: '',
    taxMode: 'standard',
    items: [{ quantity: 5, unitPrice: 890000 }],
    validUntil: '2026-07-20',
    status: 'expired',
  },
  {
    id: 'q-5',
    quoteNo: 'Q-20260712-004',
    accountName: '동방무역',
    inquiryNo: 'INQ-20260711-009',
    taxMode: 'standard',
    items: [{ quantity: 1, unitPrice: 32000000 }],
    validUntil: '2026-08-11',
    status: 'ordered',
  },
];

/* ── 표 열 정의(데이터 열 7개 — 선택/순번/액션 열은 leadingHead·trailingHead 로 별도) ─────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'quoteNo', header: '견적번호', nowrap: true },
  { id: 'account', header: '거래처' },
  { id: 'inquiry', header: '원본 문의', nowrap: true },
  { id: 'total', header: '합계금액', align: 'end', nowrap: true },
  { id: 'validUntil', header: '유효기간', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'contract', header: '계약', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'quote-select-all-label';

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
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const monoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 액션 셀 — 실화면 CrudTable.actionCellStyle 미러(우측 정렬 · 세로 가운데) */
const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  verticalAlign: 'middle',
  textAlign: 'right',
  width: `calc(${cssVar('space.6')} * 3)`,
};

const actionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

/** 시각적으로만 숨김 — 액션 헤더의 접근성 이름 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface QuoteListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음) 재현 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — SelectionBar(일괄삭제) 재현 */
  readonly initialSelectedIds?: readonly string[];
}

function QuoteListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: QuoteListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<QuoteStatus | typeof FILTER_ALL>(FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );

  // 상태 필터 + 견적번호/거래처 키워드 — 실화면 filterQuotes·searchQuotes 미러
  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_QUOTES.filter((quote) => {
      if (status !== FILTER_ALL && quote.status !== status) return false;
      if (kw === '') return true;
      return (
        quote.quoteNo.toLowerCase().includes(kw) || quote.accountName.toLowerCase().includes(kw)
      );
    });
  }, [keyword, status]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const quote of visible) {
        if (checked) next.add(quote.id);
        else next.delete(quote.id);
      }
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((quote, index) => ({
    id: quote.id,
    selected: selectedIds.has(quote.id),
    onActivate: () => {
      /* 실화면: 행 클릭 → 견적 수정(/sales/quotes/:id/edit). 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={quote.id}
        label={`${quote.quoteNo} 선택`}
        checked={selectedIds.has(quote.id)}
        onToggle={(checked) => toggleOne(quote.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      <span key="quoteNo" style={monoStyle}>
        {quote.quoteNo}
      </span>,
      quote.accountName,
      // 원본 문의로 가는 역링크 — 수동 등록 견적은 원본이 없다
      quote.inquiryNo === '' ? (
        <span key="inquiryNo" style={mutedStyle}>
          —
        </span>
      ) : (
        <a
          key="inquiryNo"
          href={`#inquiry-${quote.inquiryNo}`}
          style={linkStyle}
          aria-label={`${quote.quoteNo} 원본 문의 ${quote.inquiryNo}`}
        >
          {quote.inquiryNo}
        </a>
      ),
      formatWon(totalOf(quote.items, quote.taxMode)),
      <span key="validUntil" style={mutedStyle}>
        {quote.validUntil}
      </span>,
      <StatusBadge
        key="status"
        tone={STATUS_TONE[quote.status]}
        label={STATUS_LABEL[quote.status]}
      />,
      hasContract(quote.status) ? (
        <a key="contract" href={`#contract-${quote.quoteNo}`} style={linkStyle}>
          계약 열기
        </a>
      ) : (
        <span key="contract" style={mutedStyle}>
          —
        </span>
      ),
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <span style={actionsWrapStyle}>
          <RowActions label={quote.quoteNo} onEdit={() => undefined} onDelete={() => undefined} />
        </span>
      </td>,
    ],
  }));

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <div style={searchWrapStyle}>
          <SearchField
            label="견적번호·거래처 검색"
            value={keyword}
            placeholder="견적번호 · 거래처 검색"
            onChange={setKeyword}
          />
        </div>
        <span style={selectWrapStyle}>
          <SelectField
            value={status}
            aria-label="상태로 거르기"
            onChange={(event) => setStatus(event.target.value as QuoteStatus | typeof FILTER_ALL)}
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
      {/* 등록 CTA 가 없다 — 권한 문제가 아니라 순서 문제다. 견적은 문의에서만 발행된다
          (실화면 QuoteListPage 의 같은 자리 주석). */}
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>견적</h1>

      {toolbar}

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" size="sm">
          {`선택 ${selectedCount.toLocaleString('ko-KR')}건 삭제`}
        </Button>
      </SelectionBar>

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${visible.length.toLocaleString('ko-KR')}건`}
        {selectedCount > 0 ? ` · ${selectedCount.toLocaleString('ko-KR')}건 선택됨` : ''}
      </p>

      <Table
        caption="견적 목록 — 행을 누르면 견적 수정 화면으로 이동해요. 체크박스·수정·삭제 버튼은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 견적 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
          <SeqHeaderCell key="seq" />,
        ]}
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={5}
        empty={
          <EmptyState
            label="견적"
            hasQuery={keyword.trim() !== ''}
            hasActiveFilters={status !== FILTER_ALL}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setStatus(FILTER_ALL)}
          />
        }
      />
    </div>
  );
}

/** 정상: 견적 목록이 채워진 기본 상태(상태 배지가 다양하게 섞임 · 수주 견적에만 계약 링크) */
export const Default: Story = {
  render: () => <QuoteListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <QuoteListScreen loading />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <QuoteListScreen initialSelectedIds={['q-1', 'q-2']} />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <QuoteListScreen initialKeyword="존재하지 않는 견적" />,
};
