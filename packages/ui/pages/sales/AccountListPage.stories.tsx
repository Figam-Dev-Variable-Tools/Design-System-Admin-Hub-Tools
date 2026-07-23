/**
 * Design System/Templates/Sales/Account List — 거래처 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/sales/accounts` → 메뉴 en = "Sales"(영업 관리), 화면 en = "Accounts"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Sales 그룹의 Accounts 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/sales/accounts/AccountListPage.tsx (라우트 /sales/accounts) 와 그
 * 목록 껍데기(shared/crud/CrudListShell → CrudTable). 실화면은 useCrudList + useListState(URL 소유) 위에
 * 거래유형 필터·검색·신용등급 배지·거래 상태 인라인 토글·일괄 삭제를 얹는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 껍데기(CrudListShell/CrudTable)는
 * DS 표면으로 갈음한다:
 *   검색 입력                  → SearchField
 *   거래유형 필터               → SelectField (전체 유형 + TRADE_TYPE_OPTIONS)
 *   등록 버튼                   → Button(primary) + Icon(plus-circle)
 *   선택 일괄 삭제               → SelectionBar + Button(danger)
 *   전체선택/행 선택칸            → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                     → SeqHeaderCell · SeqCell
 *   목록 표                     → Table (leadingHead=선택·순번 / trailingHead=행 액션)
 *   거래유형·신용등급 배지        → StatusBadge
 *   거래 상태 인라인 토글         → ToggleSwitch
 *   행 수정/삭제                → RowActions
 *   빈 결과                     → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  Empty as EmptyState,
  Icon,
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
  ToggleSwitch,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Account List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 pages/sales/accounts/types 모델을 화면이 쓰는 필드만 축약해 흉내) ────────── */

type TradeType = 'sales' | 'purchase' | 'both';
type CreditGrade = 'A' | 'B' | 'C' | 'D';

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

/** 거래유형 선택지 — 실화면 TRADE_TYPE_OPTIONS 미러 */
const TRADE_TYPE_OPTIONS: readonly Option<TradeType>[] = [
  { id: 'sales', label: '매출처' },
  { id: 'purchase', label: '매입처' },
  { id: 'both', label: '매입매출' },
];

const CREDIT_GRADE_LABEL: Record<CreditGrade, string> = {
  A: 'A (우량)',
  B: 'B (정상)',
  C: 'C (주의)',
  D: 'D (불량)',
};

const TRADE_FILTER_ALL = 'all';
type TradeFilter = typeof TRADE_FILTER_ALL | TradeType;

const label = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

const tradeTypeLabel = (value: TradeType): string => label(TRADE_TYPE_OPTIONS, value);

/** 거래유형 배지 색 — 실화면 tradeTypeTone 미러 */
const tradeTypeTone = (value: TradeType): StatusBadgeTone => {
  if (value === 'sales') return 'info';
  if (value === 'purchase') return 'warning';
  return 'success';
};

/** 신용등급 배지 색 — 실화면 creditGradeTone 미러(A 진해질수록 위험) */
const creditGradeTone = (value: CreditGrade): StatusBadgeTone => {
  if (value === 'A') return 'success';
  if (value === 'B') return 'info';
  if (value === 'C') return 'warning';
  return 'danger';
};

interface DemoAccount {
  readonly id: string;
  readonly name: string;
  readonly ceoName: string;
  readonly bizNo: string;
  readonly tradeType: TradeType;
  readonly creditGrade: CreditGrade;
  readonly primaryContact: string;
  readonly lastTradeAt: string;
  readonly active: boolean;
}

const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: 'a-1',
    name: '(주)한빛소프트웨어',
    ceoName: '김한빛',
    bizNo: '123-45-67890',
    tradeType: 'sales',
    creditGrade: 'A',
    primaryContact: '이영업',
    lastTradeAt: '2026-06-30',
    active: true,
  },
  {
    id: 'a-2',
    name: '가온유통(주)',
    ceoName: '박가온',
    bizNo: '211-88-45123',
    tradeType: 'both',
    creditGrade: 'B',
    primaryContact: '정구매',
    lastTradeAt: '2026-06-12',
    active: true,
  },
  {
    id: 'a-3',
    name: '세종홀딩스',
    ceoName: '최세종',
    bizNo: '305-81-22456',
    tradeType: 'purchase',
    creditGrade: 'C',
    primaryContact: '한총무',
    lastTradeAt: '2026-05-02',
    active: false,
  },
  {
    id: 'a-4',
    name: '도담물산',
    ceoName: '오도담',
    bizNo: '144-86-33012',
    tradeType: 'sales',
    creditGrade: 'B',
    primaryContact: '윤대리',
    lastTradeAt: '',
    active: true,
  },
  {
    id: 'a-5',
    name: '푸른바이오(주)',
    ceoName: '강푸른',
    bizNo: '512-87-90011',
    tradeType: 'both',
    creditGrade: 'D',
    primaryContact: '서과장',
    lastTradeAt: '2026-03-18',
    active: false,
  },
  {
    id: 'a-6',
    name: '온누리에듀',
    ceoName: '임온누리',
    bizNo: '220-88-11234',
    tradeType: 'sales',
    creditGrade: 'A',
    primaryContact: '신주임',
    lastTradeAt: '2026-06-25',
    active: true,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 7개 — 선택/순번/액션 열은 별도) ───────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '사업자명' },
  { id: 'ceo', header: '대표자', nowrap: true },
  { id: 'trade', header: '거래유형', nowrap: true },
  { id: 'credit', header: '신용등급', nowrap: true },
  { id: 'contact', header: '대표담당' },
  { id: 'lastTrade', header: '최근거래', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'account-select-all';

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
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
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

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface AccountListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(실화면 firstLoading 미러) */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
}

function AccountListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: AccountListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<TradeFilter>(TRADE_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [accounts, setAccounts] = useState<readonly DemoAccount[]>(DEMO_ACCOUNTS);

  // 거래유형 필터(AND) + 상호/사업자번호/대표자 키워드 — 실화면 filterAccounts/searchAccounts 미러
  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const digits = kw.replace(/\D/g, '');
    return accounts.filter((account) => {
      if (filter !== TRADE_FILTER_ALL && account.tradeType !== filter) return false;
      if (kw === '') return true;
      return (
        account.name.toLowerCase().includes(kw) ||
        account.ceoName.toLowerCase().includes(kw) ||
        (digits !== '' && account.bizNo.replace(/\D/g, '').includes(digits))
      );
    });
  }, [keyword, filter, accounts]);

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
      for (const account of visible) {
        if (checked) next.add(account.id);
        else next.delete(account.id);
      }
      return next;
    });
  };

  // 거래 상태 인라인 토글 — 실화면 useCrudRowUpdate 미러(여기서는 로컬 상태만 바꾼다)
  const toggleActive = (id: string, active: boolean): void => {
    setAccounts((prev) =>
      prev.map((account) => (account.id === id ? { ...account, active } : account)),
    );
  };

  // 조건이 바뀌면 선택을 비운다 — 화면에 없는 행이 선택된 채 일괄 삭제되지 않게(실화면 STATE-04-b)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };
  const changeFilter = (value: TradeFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const rows: TableProps['rows'] = visible.map((account, index) => ({
    id: account.id,
    selected: selectedIds.has(account.id),
    onActivate: () => {
      /* 실화면에서는 수정 화면(/sales/accounts/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={account.id}
        label={`${account.name} 선택`}
        checked={selectedIds.has(account.id)}
        onToggle={(checked) => toggleOne(account.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      account.name,
      account.ceoName,
      <StatusBadge
        key="tradeType"
        tone={tradeTypeTone(account.tradeType)}
        label={tradeTypeLabel(account.tradeType)}
      />,
      <StatusBadge
        key="creditGrade"
        tone={creditGradeTone(account.creditGrade)}
        label={CREDIT_GRADE_LABEL[account.creditGrade]}
      />,
      account.primaryContact,
      <span key="lastTradeAt" style={mutedStyle}>
        {account.lastTradeAt === '' ? '—' : account.lastTradeAt}
      </span>,
      <ToggleSwitch
        key="active"
        checked={account.active}
        onChange={(next) => toggleActive(account.id, next)}
        label={`${account.name} 거래 여부`}
        onLabel="거래중"
        offLabel="중지"
      />,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <RowActions
          label={account.name}
          onEdit={() => {
            /* 실화면: 수정 화면으로 이동 */
          }}
          onDelete={() => {
            /* 실화면: 삭제 확인 다이얼로그를 연다 */
          }}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>거래처</h1>

      {/* 툴바 — 검색 + 거래유형 필터 + 등록 */}
      <div style={toolbarStyle}>
        <div style={filtersStyle}>
          <div style={searchWrapStyle}>
            <SearchField
              label="사업자명·사업자번호·대표자 검색"
              value={keyword}
              placeholder="사업자명 · 사업자번호 · 대표자 검색"
              onChange={changeKeyword}
            />
          </div>
          <span style={selectWrapStyle}>
            <SelectField
              value={filter}
              aria-label="거래유형으로 거르기"
              onChange={(event) => changeFilter(event.target.value as TradeFilter)}
            >
              <option value={TRADE_FILTER_ALL}>전체 유형</option>
              {TRADE_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>

        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          거래처 등록
        </Button>
      </div>

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" size="sm">
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <Table
        caption="거래처 목록 — 행을 누르면 수정 화면으로 이동해요. 체크박스·수정·삭제 버튼과 거래 상태 토글은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 거래처 전체 선택"
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
        skeletonRows={DEMO_ACCOUNTS.length}
        empty={
          <EmptyState
            label="거래처"
            hasQuery={keyword.trim() !== ''}
            hasActiveFilters={filter !== TRADE_FILTER_ALL}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setFilter(TRADE_FILTER_ALL)}
          />
        }
      />
    </div>
  );
}

/** 정상: 거래처 목록이 채워진 기본 상태(선택 없음 · 거래 상태 토글 인라인) */
export const Default: Story = {
  render: () => <AccountListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <AccountListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <AccountListScreen initialKeyword="존재하지 않는 거래처" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <AccountListScreen initialSelectedIds={['a-1', 'a-2', 'a-3']} />,
};
