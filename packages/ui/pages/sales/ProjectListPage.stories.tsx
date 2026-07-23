/**
 * Design System/Templates/Sales/Project List — 프로젝트(영업 기회) 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/sales/projects` → 메뉴 en = "Sales"(영업 관리), 화면 en = "Projects"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Sales 그룹의 Projects 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/sales/projects/ProjectListPage.tsx (라우트 /sales/projects) 와 그
 * 목록 껍데기(shared/crud/CrudListShell → CrudTable). 실화면은 useCrudList + useListState(URL 소유) 위에
 * 단계 필터·검색·진척 바·단계 배지·일괄 삭제를 얹는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 껍데기(CrudListShell/CrudTable)는
 * DS 표면으로 갈음한다:
 *   검색 입력              → SearchField
 *   단계 필터              → SelectField (전체 단계 + STAGES)
 *   등록 버튼              → Button(primary) + Icon(plus-circle)
 *   선택 일괄 삭제          → SelectionBar + Button(danger)
 *   전체선택/행 선택칸       → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                → SeqHeaderCell · SeqCell
 *   목록 표                → Table (leadingHead=선택·순번 / trailingHead=행 액션)
 *   단계 배지              → StatusBadge (tone=stageTone, label=stageLabel)
 *   진척 바                → 토큰만 쓴 트랙/채움 span (DS 진행바 부재 — 토큰 레이아웃으로 대체)
 *   행 수정/삭제           → RowActions
 *   빈 결과                → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem/% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
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
  title: 'Design System/Templates/Sales/Project List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 pages/sales/projects/types 모델을 화면이 쓰는 필드만 축약해 흉내) ────────── */

type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface StageMeta {
  readonly id: PipelineStage;
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/** 파이프라인 단계 메타 — 실화면 types.STAGES 미러(순서·라벨·tone) */
const STAGES: readonly StageMeta[] = [
  { id: 'lead', label: '리드', tone: 'neutral' },
  { id: 'qualified', label: '상담', tone: 'info' },
  { id: 'proposal', label: '제안', tone: 'info' },
  { id: 'negotiation', label: '협상', tone: 'warning' },
  { id: 'won', label: '수주', tone: 'success' },
  { id: 'lost', label: '실주', tone: 'danger' },
];

const PROJECT_FILTER_ALL = 'all';
type StageFilter = typeof PROJECT_FILTER_ALL | PipelineStage;

const STAGE_BY_ID = Object.fromEntries(STAGES.map((meta) => [meta.id, meta])) as Record<
  PipelineStage,
  StageMeta
>;
const stageMeta = (stage: PipelineStage): StageMeta => STAGE_BY_ID[stage];
const stageLabel = (stage: PipelineStage): string => stageMeta(stage).label;
const stageTone = (stage: PipelineStage): StatusBadgeTone => stageMeta(stage).tone;

interface DemoProject {
  readonly id: string;
  readonly name: string;
  readonly accountName: string;
  readonly stage: PipelineStage;
  readonly expectedRevenue: number;
  readonly startAt: string;
  readonly endAt: string;
  readonly progress: number;
}

const DEMO_PROJECTS: readonly DemoProject[] = [
  {
    id: 'p-1',
    name: '한빛소프트 ERP 구축',
    accountName: '(주)한빛소프트웨어',
    stage: 'negotiation',
    expectedRevenue: 42000000,
    startAt: '2026-03-02',
    endAt: '2026-09-30',
    progress: 40,
  },
  {
    id: 'p-2',
    name: '가온마트 통합 물류 시스템',
    accountName: '가온유통(주)',
    stage: 'proposal',
    expectedRevenue: 88000000,
    startAt: '2026-04-01',
    endAt: '2026-12-20',
    progress: 15,
  },
  {
    id: 'p-3',
    name: '세종그룹 사내 포털 리뉴얼',
    accountName: '세종홀딩스',
    stage: 'won',
    expectedRevenue: 25000000,
    startAt: '2026-01-10',
    endAt: '2026-06-30',
    progress: 100,
  },
  {
    id: 'p-4',
    name: '도담물산 재고 관리 고도화',
    accountName: '도담물산',
    stage: 'qualified',
    expectedRevenue: 17000000,
    startAt: '2026-05-04',
    endAt: '2026-10-31',
    progress: 5,
  },
  {
    id: 'p-5',
    name: '나래항공 예약 엔진 개선',
    accountName: '나래항공',
    stage: 'lead',
    expectedRevenue: 63000000,
    startAt: '2026-06-01',
    endAt: '2027-02-28',
    progress: 0,
  },
  {
    id: 'p-6',
    name: '푸른바이오 LIMS 도입',
    accountName: '푸른바이오(주)',
    stage: 'lost',
    expectedRevenue: 31000000,
    startAt: '2026-02-01',
    endAt: '2026-07-31',
    progress: 20,
  },
  {
    id: 'p-7',
    name: '온누리에듀 LMS 재구축',
    accountName: '온누리에듀',
    stage: 'proposal',
    expectedRevenue: 54000000,
    startAt: '2026-05-15',
    endAt: '2026-11-30',
    progress: 25,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');
/** 원화 표기 — 실화면 _shared/business.formatWon 미러 */
const formatWon = (amount: number): string => `${fmt(amount)}원`;

/* ── 표 열 정의(데이터 열 6개 — 선택/순번/액션 열은 leadingHead·trailingHead·leading·trailing 으로 별도) ── */

const COLUMNS: TableProps['columns'] = [
  { id: 'stage', header: '단계', nowrap: true },
  { id: 'name', header: '프로젝트명' },
  { id: 'account', header: '거래처' },
  { id: 'revenue', header: '예상매출', align: 'end' },
  { id: 'period', header: '기간', nowrap: true },
  { id: 'progress', header: '진척' },
];

const SELECT_ALL_LABEL_ID = 'project-select-all';

/* ── 스타일(토큰·rem·% 만) ─────────────────────────────────────────────────────────────────── */

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

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const progressWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: `calc(${cssVar('space.6')} * 3)`,
};

const progressTrackStyle: CSSProperties = {
  position: 'relative',
  flexGrow: 1,
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  overflow: 'hidden',
};

const progressFillStyle = (progress: number): CSSProperties => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  width: `${String(Math.max(0, Math.min(100, progress)))}%`,
  background: cssVar('color.action.primary.default'),
});

const progressLabelStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  color: cssVar('color.text.muted'),
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

interface ProjectListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(실화면 firstLoading 미러) */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
}

function ProjectListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: ProjectListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<StageFilter>(PROJECT_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );

  // 단계 필터(AND) + 프로젝트명/거래처 키워드 — 실화면 filterProjects/searchProjects 미러
  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_PROJECTS.filter((project) => {
      if (filter !== PROJECT_FILTER_ALL && project.stage !== filter) return false;
      if (kw === '') return true;
      return (
        project.name.toLowerCase().includes(kw) || project.accountName.toLowerCase().includes(kw)
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
      for (const project of visible) {
        if (checked) next.add(project.id);
        else next.delete(project.id);
      }
      return next;
    });
  };

  // 조건이 바뀌면 선택을 비운다 — 화면에 없는 행이 선택된 채 일괄 삭제되지 않게(실화면 STATE-04-b)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };
  const changeFilter = (value: StageFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const rows: TableProps['rows'] = visible.map((project, index) => ({
    id: project.id,
    selected: selectedIds.has(project.id),
    onActivate: () => {
      /* 실화면에서는 수정 화면(/sales/projects/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={project.id}
        label={`${project.name} 선택`}
        checked={selectedIds.has(project.id)}
        onToggle={(checked) => toggleOne(project.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      <StatusBadge key="stage" tone={stageTone(project.stage)} label={stageLabel(project.stage)} />,
      project.name,
      project.accountName,
      formatWon(project.expectedRevenue),
      <span key="period" style={periodStyle}>{`${project.startAt} ~ ${project.endAt}`}</span>,
      <span key="progress" style={progressWrapStyle}>
        <span style={progressTrackStyle} aria-hidden="true">
          <span style={progressFillStyle(project.progress)} />
        </span>
        <span style={progressLabelStyle}>{`${fmt(project.progress)}%`}</span>
      </span>,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <RowActions
          label={project.name}
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
      <h1 style={headingStyle}>프로젝트</h1>

      {/* 툴바 — 검색 + 단계 필터 + 등록 */}
      <div style={toolbarStyle}>
        <div style={filtersStyle}>
          <div style={searchWrapStyle}>
            <SearchField
              label="프로젝트명·거래처 검색"
              value={keyword}
              placeholder="프로젝트명 · 거래처 검색"
              onChange={changeKeyword}
            />
          </div>
          <span style={selectWrapStyle}>
            <SelectField
              value={filter}
              aria-label="단계로 거르기"
              onChange={(event) => changeFilter(event.target.value as StageFilter)}
            >
              <option value={PROJECT_FILTER_ALL}>전체 단계</option>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>

        {/* 등록 CTA 가 없다 — 권한 문제가 아니라 순서 문제다. 프로젝트은(는) 앞 칸에서만 생긴다
          (실화면의 같은 자리 주석). */}
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
        caption="프로젝트 목록 — 행을 누르면 수정 화면으로 이동해요. 체크박스·수정·삭제 버튼은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 프로젝트 전체 선택"
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
        skeletonRows={DEMO_PROJECTS.length}
        empty={
          <EmptyState
            label="프로젝트"
            hasQuery={keyword.trim() !== ''}
            hasActiveFilters={filter !== PROJECT_FILTER_ALL}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setFilter(PROJECT_FILTER_ALL)}
          />
        }
      />
    </div>
  );
}

/** 정상: 프로젝트 목록이 채워진 기본 상태(선택 없음) */
export const Default: Story = {
  render: () => <ProjectListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ProjectListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ProjectListScreen initialKeyword="존재하지 않는 프로젝트" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <ProjectListScreen initialSelectedIds={['p-1', 'p-2', 'p-4']} />,
};
