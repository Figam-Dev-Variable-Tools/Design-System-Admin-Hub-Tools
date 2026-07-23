/**
 * Design System/Templates/Portfolio/Portfolio List — 포트폴리오 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/portfolio` → 메뉴 en = "Portfolio"(포트폴리오 관리)
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Business 섹션의 Portfolio 그룹).
 *
 * 대응 실화면: apps/admin/src/pages/portfolio/items/PortfolioListPage.tsx (라우트 /portfolio/items).
 * 실화면은 승격된 CRUD 프레임워크(useCrudList + CrudListShell + CrudTable) 위에 분류 필터와
 * '노출' 인라인 토글을 얹는다. 이 스토리는 그 껍데기가 그리는 결과를 DS 표면으로 재조립한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable(앱)   → Table + 선택 프리미티브로 직접 조립
 *   분류 필터(좌측 없음, 툴바)     → SelectField
 *   등록 CTA                       → Button(primary) + Icon(plus-circle)
 *   일괄 삭제 바                    → SelectionBar + Button(danger)
 *   전체선택 헤더 / 행 선택칸       → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                         → SeqHeaderCell · SeqCell
 *   분류 배지                       → StatusBadge (categoryTone 미러)
 *   노출 인라인 토글                → ToggleSwitch (publishToggleColumn 미러)
 *   행 액션(수정/삭제)              → RowActions
 *   빈 결과                         → Empty
 *
 * [페이지네이션 없음] 실화면 CrudListShell 은 Pagination 을 그리지 않는다 — 필터를 적용한
 * visibleItems 를 한 번에 보여 준다. 충실히 미러하여 여기에도 페이지네이션을 두지 않는다.
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
  title: 'Design System/Templates/Portfolio/Portfolio List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 _shared/store 픽스처를 화면이 쓰는 필드만 축약해 미러) ────────────────── */

interface DemoCategory {
  readonly id: string;
  readonly label: string;
}

interface DemoItem {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  readonly categoryLabel: string;
  readonly client: string;
  readonly date: string;
  readonly published: boolean;
}

const FILTER_ALL = 'all';

/** 분류 옵션 — 실화면 fetchPortfolioCategoryOptions 미러. 'branding' 은 항목이 0건이라 필터 시 빈 결과. */
const CATEGORIES: readonly DemoCategory[] = [
  { id: 'residential', label: '주거 공간' },
  { id: 'office', label: '오피스' },
  { id: 'commercial', label: '상업 공간' },
  { id: 'exhibition', label: '전시·문화' },
  { id: 'branding', label: '공간 브랜딩' },
];

const DEMO_ITEMS: readonly DemoItem[] = [
  {
    id: 'pf-1',
    title: '한빛 리버뷰 펜트하우스 리모델링',
    categoryId: 'residential',
    categoryLabel: '주거 공간',
    client: '한빛개발',
    date: '2024-05-20',
    published: true,
  },
  {
    id: 'pf-2',
    title: '가온 스마트오피스 라운지',
    categoryId: 'office',
    categoryLabel: '오피스',
    client: '가온테크',
    date: '2024-02-11',
    published: true,
  },
  {
    id: 'pf-3',
    title: '온담 플래그십 스토어',
    categoryId: 'commercial',
    categoryLabel: '상업 공간',
    client: '온담리테일',
    date: '2023-11-03',
    published: false,
  },
  {
    id: 'pf-4',
    title: '누리 미디어아트 전시관',
    categoryId: 'exhibition',
    categoryLabel: '전시·문화',
    client: '누리문화재단',
    date: '2023-07-19',
    published: true,
  },
  {
    id: 'pf-5',
    title: '마루 협동조합 커뮤니티 오피스',
    categoryId: 'office',
    categoryLabel: '오피스',
    client: '마루협동조합',
    date: '2023-04-08',
    published: true,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 분류 배지 색 — 실화면 items/types.categoryTone 미러(id 해시로 톤 안정 배정) */
const CATEGORY_TONES: readonly StatusBadgeTone[] = ['info', 'success', 'warning', 'neutral'];
const categoryTone = (categoryId: string): StatusBadgeTone => {
  let hash = 0;
  for (let index = 0; index < categoryId.length; index += 1) {
    hash = (hash + categoryId.charCodeAt(index)) % CATEGORY_TONES.length;
  }
  return CATEGORY_TONES[hash] ?? 'neutral';
};

/* ── 표 열 정의(데이터 열 — 선택/순번/액션 열은 leadingHead·trailingHead 로 별도) ──────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'category', header: '분류', nowrap: true },
  { id: 'title', header: '제목' },
  { id: 'client', header: '고객사' },
  { id: 'date', header: '일자', nowrap: true },
  { id: 'published', header: '노출', nowrap: true },
];

const SELECT_ALL_LABEL_ID = 'portfolio-select-all-label';

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

const filterStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const titleCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const clientCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('component.table.cell-padding-y'),
  paddingBottom: cssVar('component.table.cell-padding-y'),
  paddingLeft: cssVar('component.table.cell-padding-x'),
  paddingRight: cssVar('component.table.cell-padding-x'),
  textAlign: 'right',
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

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface PortfolioListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 분류 필터 초기값 — 'branding'(항목 0건)으로 Empty(필터 결과 없음)를 만든다 */
  readonly initialFilter?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
}

function PortfolioListScreen({
  loading = false,
  initialFilter = FILTER_ALL,
  initialSelectedIds = [],
}: PortfolioListScreenProps) {
  const [filter, setFilter] = useState(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [published, setPublished] = useState<ReadonlySet<string>>(
    () => new Set(DEMO_ITEMS.filter((item) => item.published).map((item) => item.id)),
  );

  const visible = useMemo(
    () =>
      filter === FILTER_ALL ? DEMO_ITEMS : DEMO_ITEMS.filter((item) => item.categoryId === filter),
    [filter],
  );

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

  const togglePublished = (id: string, next: boolean): void => {
    setPublished((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const changeFilter = (value: string): void => {
    setFilter(value);
    // 분류가 바뀌면 선택을 비운다(실화면 useEffect(clear) 미러)
    setSelectedIds(new Set());
  };

  const rows: TableProps['rows'] = visible.map((item, index) => ({
    id: item.id,
    selected: selectedIds.has(item.id),
    onActivate: () => {
      /* 실화면에서는 수정 화면(/portfolio/items/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
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
      <StatusBadge
        key="category"
        tone={categoryTone(item.categoryId)}
        label={item.categoryLabel}
      />,
      <span key="title" style={titleCellStyle}>
        {item.title}
      </span>,
      <span key="client" style={clientCellStyle}>
        {item.client}
      </span>,
      item.date,
      <ToggleSwitch
        key="published"
        checked={published.has(item.id)}
        onChange={(next) => togglePublished(item.id, next)}
        label={`${item.title} 노출 여부`}
        onLabel="게시"
        offLabel="숨김"
      />,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={item.title}
          onEdit={() => {
            /* 실화면: 수정 화면으로 이동 */
          }}
          onDelete={() => {
            /* 실화면: 삭제 확인 다이얼로그 */
          }}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>포트폴리오</h1>

      {/* 툴바 — 분류 필터 + 등록 CTA */}
      <div style={toolbarStyle}>
        <span style={filterStyle}>
          <SelectField
            value={filter}
            onChange={(event) => changeFilter(event.target.value)}
            aria-label="분류로 거르기"
          >
            <option value={FILTER_ALL}>전체 분류</option>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectField>
        </span>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          포트폴리오 등록
        </Button>
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" size="sm">
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="포트폴리오 목록 — 행을 누르면 수정 화면으로 이동해요. 체크박스·노출 토글·수정·삭제 버튼은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 포트폴리오 전체 선택"
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
            label="포트폴리오"
            hasActiveFilters={filter !== FILTER_ALL}
            onResetFilters={() => setFilter(FILTER_ALL)}
          />
        }
      />
    </div>
  );
}

/** 정상: 포트폴리오 목록이 채워진 기본 상태(선택 없음) */
export const Default: Story = {
  render: () => <PortfolioListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <PortfolioListScreen loading />,
};

/** 빈 결과: 항목이 0건인 분류로 걸렀을 때 — Empty(필터 초기화 복구) */
export const Empty: Story = {
  render: () => <PortfolioListScreen initialFilter="branding" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <PortfolioListScreen initialSelectedIds={['pf-1', 'pf-3']} />,
};
