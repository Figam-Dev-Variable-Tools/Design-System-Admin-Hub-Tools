/**
 * Design System/Templates/Company/History — 연혁 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/history` → 메뉴 en = "Company"(기업 관리), 화면 en = "History"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의 `['/company/history', '연혁', 'History']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/history/HistoryListPage.tsx (라우트 /company/history).
 * 연혁은 **등록·수정·삭제가 다 되는 CRUD 목록**이라 선택 체크박스 + 순번 + 행 액션(수정 연필·삭제
 * 휴지통) + 일괄 삭제 바를 갖는다. 검색·필터는 없다 — 항목이 적고 연·월 내림차순(최근이 위)이
 * 곧 읽는 순서라 정렬만으로 충분하다. 등록/수정은 목록이 아니라 별도 라우트(/company/history/new ·
 * /:id/edit)로 간다. 실화면은 shared/crud 의 CrudListShell → CrudTable → DS Table 로 조립된다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   등록 버튼(권한 게이팅)       → Button(primary) + Icon(plus-circle) — canCreate 일 때만 존재(EXC-03)
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   연도 · 월 · 내용 열          → Table columns(3열 · 연/월은 nowrap)
 *   행 액션(수정·삭제)          → RowActions (연필 → 수정 폼, 휴지통 → 삭제 확인)
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인                   → ConfirmDialog(intent=delete)
 *   목록 표                     → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                     → Empty (+ 등록 CTA 슬롯)
 *   조회 실패 배너              → Alert(danger) + Button(secondary)
 *   목록 상태 안내(A11Y-16)      → 항상 마운트된 aria-live 영역
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/History',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 history/types HistoryItem + data-source HISTORY_SEED 미러) ────────────── */

interface DemoHistory {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly content: string;
}

const DEMO_HISTORY: readonly DemoHistory[] = [
  { id: 'history-1', year: 2018, month: 3, content: '주식회사 예시플래닝 설립' },
  { id: 'history-2', year: 2019, month: 7, content: '첫 공공기관 공간 기획 프로젝트 수주' },
  { id: 'history-3', year: 2021, month: 5, content: '기업부설 연구소 설립' },
  { id: 'history-4', year: 2022, month: 11, content: '누적 프로젝트 100건 달성' },
  { id: 'history-5', year: 2024, month: 2, content: '데이터 기반 공간 분석 솔루션 출시' },
];

/** 연·월 내림차순(최근이 위) · 같은 연월은 id 로 안정 정렬 — 실화면 sortHistory 미러 */
const sortHistory = (list: readonly DemoHistory[]): readonly DemoHistory[] =>
  [...list].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

const ENTITY_LABEL = '연혁';
const SELECT_ALL_LABEL_ID = 'history-select-all';
const SKELETON_ROWS = 5;

/** 실화면 nameOf — 삭제 확인·행 액션 라벨이 모두 이 문자열을 쓴다 */
const nameOf = (item: DemoHistory): string => `${fmt(item.year)}년 ${String(item.month)}월`;

/* ── 표 열 정의(데이터 열 3개 — 선택·순번은 leading, 액션은 trailing 으로 별도) ───────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'year', header: '연도', nowrap: true },
  { id: 'month', header: '월', nowrap: true },
  { id: 'content', header: '내용' },
];

/* ── 스타일(토큰·rem·calc 만) ──────────────────────────────────────────────────────────────── */

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

/** 실화면 toolbarStyle — 등록 버튼 하나가 오른쪽 끝에 선다 */
const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const numericStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface HistoryListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading (STATE-01) */
  readonly loading?: boolean;
  /** 조회 실패 — 표 대신 danger 배너 */
  readonly error?: boolean;
  /** 등록 권한 — 없으면 등록 버튼 자체를 그리지 않는다(EXC-03) */
  readonly canCreate?: boolean;
  /** 삭제 권한 — 없으면 선택 열·일괄 삭제 바·휴지통이 모두 사라진다(EXC-03) */
  readonly canRemove?: boolean;
  readonly items?: readonly DemoHistory[];
  readonly initialSelectedIds?: readonly string[];
}

function HistoryListScreen({
  loading = false,
  error = false,
  canCreate = true,
  canRemove = true,
  items = DEMO_HISTORY,
  initialSelectedIds = [],
}: HistoryListScreenProps) {
  const [rowsData, setRowsData] = useState<readonly DemoHistory[]>(() => sortHistory(items));
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoHistory | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const selection = tableSelectionState(rowsData, selectedIds);
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
      for (const item of rowsData) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const removeItems = (ids: readonly string[]): void => {
    const doomed = new Set(ids);
    setRowsData((prev) => prev.filter((item) => !doomed.has(item.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>연혁</h1>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>연혁 목록을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const rows: TableProps['rows'] = rowsData.map((item, index) => ({
    id: item.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 연혁 수정 폼(/company/history/:id/edit) */
    },
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 CrudTable 미러) — false 는
    // 정의된 boolean 이라 exactOptionalPropertyTypes 위반이 아니다.
    selected: canRemove && selectedIds.has(item.id),
    leading: canRemove
      ? [
          <RowSelectCell
            key="select"
            id={item.id}
            label={`${nameOf(item)} 선택`}
            checked={selectedIds.has(item.id)}
            onToggle={(checked) => toggleOne(item.id, checked)}
          />,
          <SeqCell key="seq" seq={index + 1} />,
        ]
      : [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      <span key="year" style={numericStyle}>{`${fmt(item.year)}년`}</span>,
      <span key="month" style={numericStyle}>{`${String(item.month)}월`}</span>,
      item.content,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={nameOf(item)}
          onEdit={() => {
            /* 실화면: 연필 → 연혁 수정 폼(/company/history/:id/edit) */
          }}
          {...(canRemove && { onDelete: () => setConfirming(item) })}
        />
      </td>,
    ],
  }));

  const registerButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      연혁 등록
    </Button>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>연혁</h1>

      {/* [A11Y-16] 항상 마운트된 polite live region — 목록이 0행이 되는 전환이 이 줄로 들린다 */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {loading
          ? ''
          : rowsData.length === 0
            ? '조건에 맞는 연혁 결과가 없어요.'
            : `연혁 ${fmt(rowsData.length)}건을 찾았어요.`}
      </div>

      <div style={toolbarStyle}>{canCreate && registerButton}</div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(rowsData.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      {/* 삭제 권한이 없으면 선택 바 자체를 그리지 않는다 — 이 바의 유일한 액션이 일괄 삭제다 */}
      {canRemove && (
        <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
          <Button variant="danger" onClick={() => setBulkOpen(true)}>
            {`선택 ${fmt(selectedCount)}건 삭제`}
          </Button>
        </SelectionBar>
      )}

      <Table
        caption={
          canRemove
            ? '연혁 목록 — 행을 누르면 수정 폼으로 이동해요. 체크박스·수정·삭제 버튼은 각자 따로 동작해요.'
            : '연혁 목록 — 행을 누르면 수정 폼으로 이동해요. 조회 권한만 있어 삭제 버튼은 없어요.'
        }
        columns={COLUMNS}
        rows={rows}
        leadingHead={
          canRemove
            ? [
                <SelectAllHeaderCell
                  key="select-all"
                  label="이 페이지의 연혁 전체 선택"
                  labelId={SELECT_ALL_LABEL_ID}
                  selection={selection}
                  onToggleAll={toggleAll}
                />,
                <SeqHeaderCell key="seq" />,
              ]
            : [<SeqHeaderCell key="seq" />]
        }
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={SKELETON_ROWS}
        empty={<EmptyState label={ENTITY_LABEL} {...(canCreate && { action: registerButton })} />}
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="연혁 삭제"
          message={`'${nameOf(confirming)}'을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeItems([confirming.id]);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="연혁 일괄 삭제"
          message={`선택한 연혁 ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removeItems([...selectedIds]);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 연·월 내림차순으로 정렬된 연혁 목록(선택 없음) */
export const Default: Story = {
  render: () => <HistoryListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <HistoryListScreen loading items={[]} />,
};

/** 빈 상태: 등록된 연혁 없음 — Table empty 슬롯의 Empty 가 등록 CTA 를 함께 그린다(STATE-05) */
export const Empty: Story = {
  render: () => <HistoryListScreen items={[]} />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <HistoryListScreen initialSelectedIds={['history-5', 'history-3']} />,
};

/** 읽기 전용: 등록·삭제 권한 없음 → 등록 버튼·선택 열·일괄 삭제 바·휴지통이 모두 사라진다(EXC-03) */
export const ReadOnly: Story = {
  render: () => <HistoryListScreen canCreate={false} canRemove={false} />,
};
