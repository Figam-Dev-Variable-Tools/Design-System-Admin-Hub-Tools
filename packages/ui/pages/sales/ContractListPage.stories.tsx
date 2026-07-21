/**
 * Design System/Templates/Sales/Contract List — 계약 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹에서 `['/sales/contracts', '계약', 'Contracts']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/contracts/ContractListPage.tsx
 * (라우트 /sales/contracts). 계약은 삭제 가능한 CRUD 목록이라 실화면은 CrudListShell(선택·일괄삭제·
 * 행 액션·등록 CTA)을 쓴다. 목록엔 이미지 열이 없다(첨부는 폼에서 다룬다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기(CrudListShell/CrudTable)와 앱 조각을 DS 표면으로 갈음한다:
 *   상단 라이브 리전(A11Y-16)   → 토큰만 쓴 visually-hidden div(aria-live=polite)
 *   검색 입력                  → SearchField
 *   상태 필터                  → SelectField
 *   등록 CTA(canCreate 게이팅)  → Button(primary) + Icon(plus-circle)
 *   요약 줄('전체 N건 · N건 선택됨') → 토큰만 쓴 <p>
 *   일괄 삭제 바(canRemove)     → SelectionBar + Button(danger)
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   목록 표(데이터 6열 + 선택 + 액션) → Table (leadingHead=선택·순번 / trailingHead=행 액션)
 *   행 액션(수정·삭제)          → RowActions
 *   상태·갱신임박 배지          → StatusBadge
 *   빈 결과                    → Empty (검색 지우기 / 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
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
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Contract List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 모델 · 순수 규칙(실화면 contracts/types.ts 를 화면이 쓰는 필드만 축약해 미러) ────────── */

type ContractType = 'supply' | 'service' | 'maintenance' | 'license' | 'lease' | 'nda';
type ContractStatus = 'draft' | 'review' | 'active' | 'expired' | 'terminated';

interface Contract {
  readonly id: string;
  readonly title: string;
  readonly accountName: string;
  readonly contractType: ContractType;
  readonly startAt: string;
  readonly endAt: string;
  readonly amount: number;
  readonly status: ContractStatus;
  readonly autoRenew: boolean;
  readonly renewNoticeDays: number;
}

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  supply: '공급계약',
  service: '용역계약',
  maintenance: '유지보수',
  license: '라이선스',
  lease: '임대',
  nda: '비밀유지(NDA)',
};

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

const CONTRACT_STATUS_META: Record<ContractStatus, StatusMeta> = {
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '검토중', tone: 'info' },
  active: { label: '진행중', tone: 'success' },
  expired: { label: '만료', tone: 'neutral' },
  terminated: { label: '해지', tone: 'danger' },
};

const CONTRACT_STATUS_OPTIONS: readonly { readonly id: ContractStatus; readonly label: string }[] =
  [
    { id: 'draft', label: '초안' },
    { id: 'review', label: '검토중' },
    { id: 'active', label: '진행중' },
    { id: 'expired', label: '만료' },
    { id: 'terminated', label: '해지' },
  ];

const CONTRACT_FILTER_ALL = 'all';
type ContractStatusFilter = typeof CONTRACT_FILTER_ALL | ContractStatus;

/** 템플릿 고정 '오늘' — 갱신임박 판정 기준점(실화면은 formatDate(new Date())) */
const TODAY = '2026-07-21';

const daysRemaining = (endAt: string, today: string): number => {
  const end = new Date(`${endAt}T00:00:00`).getTime();
  const now = new Date(`${today}T00:00:00`).getTime();
  if (Number.isNaN(end) || Number.isNaN(now)) return 0;
  return Math.round((end - now) / (24 * 60 * 60 * 1000));
};

/** 만료 임박 — 진행중 + 자동갱신 + 통지기한 이내 (실화면 isRenewalDue 미러) */
const isRenewalDue = (item: Contract): boolean => {
  if (item.status !== 'active' || !item.autoRenew) return false;
  const remaining = daysRemaining(item.endAt, TODAY);
  return remaining >= 0 && remaining <= item.renewNoticeDays;
};

/** 원화 표기 '1,200,000원' — 실화면 formatWon 미러 */
const formatWon = (amount: number): string => `${amount.toLocaleString('ko-KR')}원`;

/* ── 데모 데이터(실화면 시드 3건 + 갱신임박 배지가 보이도록 임박 계약 1건 보강) ─────────────────── */

const DEMO_CONTRACTS: readonly Contract[] = [
  {
    id: 'ct-1',
    title: '2026년 SaaS 연간 이용계약',
    accountName: '(주)한빛소프트웨어',
    contractType: 'license',
    startAt: '2026-01-01',
    endAt: '2026-12-31',
    amount: 36000000,
    status: 'active',
    autoRenew: true,
    renewNoticeDays: 30,
  },
  {
    id: 'ct-2',
    title: '전산시스템 유지보수 계약',
    accountName: '대성물산 주식회사',
    contractType: 'maintenance',
    startAt: '2026-03-01',
    endAt: '2027-02-28',
    amount: 18000000,
    status: 'review',
    autoRenew: false,
    renewNoticeDays: 0,
  },
  {
    id: 'ct-3',
    title: '용역 개발 위탁계약(1차)',
    accountName: '미래테크놀로지',
    contractType: 'service',
    startAt: '2025-09-01',
    endAt: '2026-02-28',
    amount: 24000000,
    status: 'expired',
    autoRenew: false,
    renewNoticeDays: 0,
  },
  {
    id: 'ct-4',
    title: '클라우드 인프라 임대계약',
    accountName: '한결엔지니어링',
    contractType: 'lease',
    startAt: '2025-08-15',
    endAt: '2026-08-14',
    amount: 12000000,
    status: 'active',
    autoRenew: true,
    renewNoticeDays: 30,
  },
];

/* ── 표 열 정의(데이터 6열 — 선택·순번은 leadingHead, 액션은 trailingHead 로 별도) ────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '계약명' },
  { id: 'accountName', header: '거래처' },
  { id: 'type', header: '유형', nowrap: true },
  { id: 'period', header: '계약기간', nowrap: true },
  { id: 'amount', header: '금액', align: 'end' },
  { id: 'status', header: '상태', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'contract-select-all';
const PAGE_SIZE = 10;

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

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const actionCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

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

interface ContractListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 → SelectionBar 노출 */
  readonly initialSelectedIds?: readonly string[];
}

function ContractListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: ContractListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<ContractStatusFilter>(CONTRACT_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );

  // 상태 필터 + 계약명/거래처 키워드 — 실화면 filterContracts/searchContracts 미러
  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return DEMO_CONTRACTS.filter((item) => {
      if (filter !== CONTRACT_FILTER_ALL && item.status !== filter) return false;
      if (needle === '') return true;
      return (
        item.title.toLowerCase().includes(needle) || item.accountName.toLowerCase().includes(needle)
      );
    });
  }, [keyword, filter]);

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
      for (const item of visible) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  // 조건이 바뀌면 선택을 비운다 — 화면에 없는 행이 선택된 채 '선택 N건 삭제' 가 되지 않게 (STATE-04-b)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };
  const changeFilter = (value: ContractStatusFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = filter !== CONTRACT_FILTER_ALL;

  const rows: TableProps['rows'] = visible.map((item, index) => {
    const meta = CONTRACT_STATUS_META[item.status];
    return {
      id: item.id,
      selected: selectedIds.has(item.id),
      onActivate: () => {
        /* 실화면에서는 계약 수정(/sales/contracts/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
      },
      leading: [
        <RowSelectCell
          key="select"
          id={item.id}
          label={`${item.title} 선택`}
          checked={selectedIds.has(item.id)}
          onToggle={(checked) => toggleOne(item.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        item.title,
        item.accountName,
        CONTRACT_TYPE_LABEL[item.contractType],
        <span key="period" style={periodStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
        formatWon(item.amount),
        <span key="status" style={statusCellStyle}>
          <StatusBadge tone={meta.tone} label={meta.label} />
          {isRenewalDue(item) && <StatusBadge tone="warning" label="갱신임박" />}
        </span>,
      ],
      trailing: [
        <td key="actions" className="tds-table__cell tds-table__cell--end">
          <span style={actionCellStyle}>
            <RowActions
              label={item.title}
              onEdit={() => {
                /* 실화면: 수정 화면으로 이동 */
              }}
              onDelete={() => {
                /* 실화면: 삭제 확인 다이얼로그 */
              }}
            />
          </span>
        </td>,
      ],
    };
  });

  const announcement = loading
    ? ''
    : visible.length === 0
      ? '조건에 맞는 계약 결과가 없습니다.'
      : `계약 ${String(visible.length)}건을 찾았습니다.`;

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={changeKeyword}
          label="계약명·거래처 검색"
          placeholder="계약명 · 거래처 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => changeFilter(event.target.value as ContractStatusFilter)}
            aria-label="상태로 거르기"
          >
            <option value={CONTRACT_FILTER_ALL}>전체 상태</option>
            {CONTRACT_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      {/* 등록 CTA — 실화면은 create 권한이 있을 때만 존재한다(EXC-03). 템플릿은 항상 표시 */}
      <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
        계약 등록
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>계약</h1>

      {/* [A11Y-16] 항상 마운트된 polite live region — 실화면 껍데기가 소유하는 자리 */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {announcement}
      </div>

      {toolbar}

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${String(visible.length)}건`}
        {selectedCount > 0 ? ` · ${String(selectedCount)}건 선택됨` : ''}
      </p>

      {/* 일괄 삭제 바 — 실화면은 canRemove 일 때만. count 0 이면 SelectionBar 가 스스로 렌더 안 함 */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" size="sm">
          {`선택 ${String(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="계약 목록 — 행을 누르면 계약 수정 화면으로 이동합니다. 체크박스·수정·삭제 버튼은 각자의 동작을 수행합니다."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 계약 전체 선택"
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
        skeletonRows={PAGE_SIZE}
        empty={
          <EmptyState
            label="계약"
            hasQuery={hasQuery}
            hasActiveFilters={hasActiveFilters}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setFilter(CONTRACT_FILTER_ALL)}
          />
        }
      />
    </div>
  );
}

/** 정상: 계약 목록이 채워진 기본 상태(선택 없음 · '갱신임박' 배지 포함) */
export const Default: Story = {
  render: () => <ContractListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ContractListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ContractListScreen initialKeyword="존재하지 않는 계약" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <ContractListScreen initialSelectedIds={['ct-1', 'ct-2']} />,
};
