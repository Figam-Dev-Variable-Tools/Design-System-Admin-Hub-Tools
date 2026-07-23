/**
 * Design System/Templates/Programs/Program List — 등록된 프로그램 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/programs` → 메뉴 en = "Programs"(프로그램 관리), 화면 en = "Programs"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Programs 그룹의 `['/programs', '프로그램', 'Programs']`).
 *
 * 대응 실화면: apps/admin/src/pages/programs/ProgramListPage.tsx (라우트 /programs).
 * 후원형 펀딩(텀블벅류)이라 목록의 중심 열은 이름이 아니라 모금액/달성률과 남은 일수다 — 등록된
 * 프로그램이 지금 얼마나 가고 있는지를 목록 자체가 말한다. 등록 CTA 와 행의 연필은 **같은 등록
 * 화면**(Program Form)으로 가고, 행 클릭은 상세로 간다(rowTarget kind: 'detail'). 좌측 aside 는
 * 진행 상태 필터이며, 건수 배지는 **필터 이전** 전체 집합에서 센다 — 필터가 자기 배지를 흔들면
 * 비교가 불가능해진다. 남은 일수의 기준일은 실화면과 같은 고정 시계 `TODAY = '2026-07-21'` 이다:
 * 화면이 `new Date()` 를 읽으면 스토리 회귀 비교가 매일 깨진다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions·SelectionBar)
 *   FilterRail/FilterPanel  → Panel + 토큰만 쓴 <nav>/<ul>/<li>(button[aria-pressed] + 건수 배지)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 진행 상태 필터        → Panel(notice) + 토큰 <nav>(aria-pressed + 건수 배지)
 *   프로그램명·창작자 검색      → SearchField
 *   프로그램 등록 CTA          → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   프로그램명 + 한 줄 소개     → DetailCellLink 갈음(토큰 <a>) + 흐린 요약 한 줄
 *   모금액 · 달성률            → StatusBadge (fundingSummary/fundingTone 미러)
 *   진행 상태                 → StatusBadge (programStatusTone/Label 미러)
 *   행 액션(수정·삭제)         → RowActions (연필 → 수정 폼, 휴지통 → 삭제 확인)
 *   선택 일괄 삭제 바          → SelectionBar + Button(danger)
 *   삭제 확인                 → ConfirmDialog(intent=delete)
 *   목록 표                   → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                   → Empty (검색 지우기 / 필터 초기화 / 등록 CTA)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  Panel,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
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
  title: 'Design System/Templates/Programs/Program List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 _shared/store · types 미러) ─────────────────────────────────────── */

/** 남은 일수의 기준일 — 실화면 ProgramListPage.TODAY 와 같은 값이라야 스토리가 고정된다 */
const TODAY = '2026-07-21';

const ENTITY_LABEL = '프로그램';
const PAGE_SIZE = 10;
const SELECT_ALL_LABEL_ID = 'program-select-all';

type ProgramStatus = 'draft' | 'scheduled' | 'live' | 'succeeded' | 'failed';

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/** 실화면 types.STATUS_META 미러 */
const STATUS_META: Record<ProgramStatus, StatusMeta> = {
  draft: { label: '작성 중', tone: 'neutral' },
  scheduled: { label: '오픈 예정', tone: 'info' },
  live: { label: '진행 중', tone: 'success' },
  succeeded: { label: '성공', tone: 'success' },
  failed: { label: '실패', tone: 'danger' },
};

const STATUS_ALL = 'all';
type StatusFilter = typeof STATUS_ALL | ProgramStatus;

const STATUS_FILTERS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: STATUS_ALL, label: '전체' },
  { id: 'draft', label: STATUS_META.draft.label },
  { id: 'scheduled', label: STATUS_META.scheduled.label },
  { id: 'live', label: STATUS_META.live.label },
  { id: 'succeeded', label: STATUS_META.succeeded.label },
  { id: 'failed', label: STATUS_META.failed.label },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const fmt = (value: number): string => KO_NUMBER.format(value);

/** 달성률(%) — 목표가 0이면 0. 100을 넘을 수 있다(초과 달성) — 실화면 store.fundingRate 미러 */
const fundingRate = (goalAmount: number, pledgedAmount: number): number =>
  goalAmount <= 0 ? 0 : Math.round((pledgedAmount / goalAmount) * 100);

/** 목표를 채웠나 — 실화면 store.isGoalReached 미러 */
const isGoalReached = (goalAmount: number, pledgedAmount: number): boolean =>
  goalAmount > 0 && pledgedAmount >= goalAmount;

/** 남은 일수 — 종료일 포함으로 센다. 이미 지났으면 0 (실화면 store.daysLeft 미러) */
function daysLeft(endDate: string, today: string): number {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(end) || Number.isNaN(now)) return 0;
  const diff = Math.ceil((end - now) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/* ── 데모 데이터(실화면 _shared/store 픽스처를 목록이 쓰는 필드만 축약해 미러) ─────────────────── */

interface DemoProgram {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly creator: string;
  readonly summary: string;
  readonly goalAmount: number;
  readonly pledgedAmount: number;
  readonly backerCount: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: ProgramStatus;
}

const DEMO_PROGRAMS: readonly DemoProgram[] = [
  {
    id: 'pgm-1',
    title: '무선 스튜디오 모니터 헤드폰',
    categoryLabel: '음향기기',
    creator: '사운드랩',
    summary: '스튜디오 모니터링을 그대로 옮긴 무선 헤드폰',
    goalAmount: 10_000_000,
    pledgedAmount: 14_320_000,
    backerCount: 412,
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    status: 'live',
  },
  {
    id: 'pgm-2',
    title: '접이식 원목 사이드테이블',
    categoryLabel: '가구',
    creator: '노크우드',
    summary: '한 손으로 접히는 원목 사이드테이블',
    goalAmount: 5_000_000,
    pledgedAmount: 2_150_000,
    backerCount: 86,
    startDate: '2026-07-05',
    endDate: '2026-08-15',
    status: 'live',
  },
  {
    id: 'pgm-3',
    title: '도시 산책 에세이집',
    categoryLabel: '출판',
    creator: '걷는사람',
    summary: '열두 도시의 골목을 걸어 적은 산문집',
    goalAmount: 3_000_000,
    pledgedAmount: 3_480_000,
    backerCount: 231,
    startDate: '2026-04-01',
    endDate: '2026-05-31',
    status: 'succeeded',
  },
  {
    id: 'pgm-4',
    title: '휴대용 커피 드리퍼',
    categoryLabel: '주방',
    creator: '데일리브루',
    summary: '납작하게 접히는 스테인리스 드리퍼',
    goalAmount: 8_000_000,
    pledgedAmount: 1_960_000,
    backerCount: 54,
    startDate: '2026-03-01',
    endDate: '2026-04-15',
    status: 'failed',
  },
  {
    id: 'pgm-5',
    title: '마그네틱 충전 스탠드',
    categoryLabel: '모바일 액세서리',
    creator: '스냅기어',
    summary: '각도가 고정되는 자석식 충전 거치대',
    goalAmount: 6_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    startDate: '2026-08-01',
    endDate: '2026-09-10',
    status: 'scheduled',
  },
];

/** '143% · 14,320,000원' — 달성률과 모금액을 함께 읽힌다(실화면 fundingSummary 미러) */
const fundingSummary = (program: DemoProgram): string =>
  `${fmt(fundingRate(program.goalAmount, program.pledgedAmount))}% · ${fmt(program.pledgedAmount)}원`;

/** 달성 여부에 따른 색 — 색만으로 전달하지 않게 문구와 함께 쓴다 */
const fundingTone = (program: DemoProgram): StatusBadgeTone =>
  isGoalReached(program.goalAmount, program.pledgedAmount) ? 'success' : 'info';

/**
 * 남은 일수 문구 — 끝난 펀딩의 '0일' 은 '오늘 마감' 과 구별되지 않는다. 상태가 이미 결론을
 * 말하므로 종료된 건은 '종료' 를, 아직 열지 않은 초안은 셀 대상이 없다는 뜻의 '—' 를 쓴다.
 */
function daysLeftText(program: DemoProgram): string {
  if (program.status === 'succeeded' || program.status === 'failed') return '종료';
  if (program.status === 'draft') return '—';
  const left = daysLeft(program.endDate, TODAY);
  return left === 0 ? '오늘 마감' : `${fmt(left)}일`;
}

/** 상태별 건수 — 좌측 필터 배지. 키를 빠짐없이 적어 인덱싱 접근을 쓰지 않는다 */
function countByStatus(list: readonly DemoProgram[]): Readonly<Record<StatusFilter, number>> {
  const counts: Record<StatusFilter, number> = {
    all: list.length,
    draft: 0,
    scheduled: 0,
    live: 0,
    succeeded: 0,
    failed: 0,
  };
  for (const program of list) counts[program.status] += 1;
  return counts;
}

/* ── 표 열 정의(데이터 열 9개 — 선택·순번은 leading, 액션은 trailing 으로 별도) ──────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '프로그램명' },
  { id: 'creator', header: '창작자', nowrap: true },
  { id: 'category', header: '카테고리', nowrap: true },
  { id: 'goal', header: '목표금액', align: 'end' },
  { id: 'funding', header: '모금액 · 달성률', nowrap: true },
  { id: 'backers', header: '후원자수', align: 'end' },
  { id: 'period', header: '기간', nowrap: true },
  { id: 'daysLeft', header: '남은 일수', align: 'end' },
  { id: 'status', header: '상태', nowrap: true },
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

const titleCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const detailLinkStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
};

/** 한 줄 소개는 보조 정보다 — 제목보다 약하게, 한 줄을 넘기지 않는다 */
const summaryTextStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const numericTextStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const periodStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ProgramsScreenProps {
  readonly loading?: boolean;
  readonly programs?: readonly DemoProgram[];
  readonly initialKeyword?: string;
  readonly initialStatus?: StatusFilter;
  readonly initialSelectedIds?: readonly string[];
}

function ProgramsScreen({
  loading = false,
  programs = DEMO_PROGRAMS,
  initialKeyword = '',
  initialStatus = STATUS_ALL,
  initialSelectedIds = [],
}: ProgramsScreenProps) {
  const [items, setItems] = useState<readonly DemoProgram[]>(programs);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoProgram | null>(null);

  // 건수 배지는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 — 0 과 '모름'은 다르다
  const counts = useMemo(() => (loading ? null : countByStatus(items)), [items, loading]);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return items.filter((program) => {
      if (status !== STATUS_ALL && program.status !== status) return false;
      if (needle === '') return true;
      return (
        program.title.toLowerCase().includes(needle) ||
        program.creator.toLowerCase().includes(needle)
      );
    });
  }, [items, status, keyword]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;
  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = status !== STATUS_ALL;

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
      for (const program of visible) {
        if (checked) next.add(program.id);
        else next.delete(program.id);
      }
      return next;
    });
  };

  const removeProgram = (id: string): void => {
    setItems((prev) => prev.filter((program) => program.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const createButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      프로그램 등록
    </Button>
  );

  const rows: TableProps['rows'] = visible.map((program, index) => ({
    id: program.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 현황 상세(/programs/:id) — 수정 폼은 연필 액션의 몫이다 */
    },
    selected: selectedIds.has(program.id),
    leading: [
      <RowSelectCell
        key="select"
        id={program.id}
        label={`${program.title} 선택`}
        checked={selectedIds.has(program.id)}
        onToggle={(checked) => toggleOne(program.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      <span key="title" style={titleCellStyle}>
        {/* 행 클릭(마우스)의 키보드 짝 — 이 링크가 없으면 Tab 으로 상세에 닿을 길이 사라진다 */}
        <a href="#program-detail" style={detailLinkStyle}>
          {program.title}
        </a>
        {program.summary.trim() !== '' && <span style={summaryTextStyle}>{program.summary}</span>}
      </span>,
      program.creator,
      program.categoryLabel,
      <span key="goal" style={numericTextStyle}>{`${fmt(program.goalAmount)}원`}</span>,
      <StatusBadge key="funding" tone={fundingTone(program)} label={fundingSummary(program)} />,
      <span key="backers" style={numericTextStyle}>{`${fmt(program.backerCount)}명`}</span>,
      <span key="period" style={periodStyle}>{`${program.startDate} ~ ${program.endDate}`}</span>,
      <span key="days-left" style={numericTextStyle}>
        {daysLeftText(program)}
      </span>,
      <StatusBadge
        key="status"
        tone={STATUS_META[program.status].tone}
        label={STATUS_META[program.status].label}
      />,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={program.title}
          onEdit={() => {
            /* 실화면: 연필 → 프로그램 수정 폼(/programs/:id/edit) */
          }}
          onDelete={() => setConfirming(program)}
        />
      </td>,
    ],
  }));

  return (
    <div style={layoutStyle}>
      <Panel
        notice={
          <p style={noticeStyle}>
            성공·실패는 기간이 끝난 뒤 목표 달성 여부로 갈려요. 진행 중에는 아직 정해지지 않아요.
          </p>
        }
      >
        <nav style={filterNavStyle} aria-label="프로그램 상태 필터">
          <h2 style={filterHeadingStyle}>진행 상태</h2>
          <ul style={filterListStyle}>
            {STATUS_FILTERS.map((option) => {
              const active = status === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => {
                      setStatus(option.id);
                      // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 (STATE-04-b)
                      setSelectedIds(new Set());
                    }}
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
              label="프로그램명·창작자 검색"
              value={keyword}
              placeholder="프로그램명 · 창작자 검색"
              onChange={(next) => {
                setKeyword(next);
                setSelectedIds(new Set());
              }}
            />
          </span>
          {createButton}
        </div>

        <p style={summaryStyle}>
          {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
          {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
        </p>

        {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
        <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
          <Button
            variant="danger"
            onClick={() => {
              for (const id of selectedIds) removeProgram(id);
            }}
          >
            {`선택 ${fmt(selectedCount)}건 삭제`}
          </Button>
        </SelectionBar>

        <Table
          caption="프로그램 현황 목록 — 행을 누르면 현황 상세 화면으로 이동해요. 체크박스·수정·삭제 버튼은 각자 따로 동작해요."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[
            <SelectAllHeaderCell
              key="select-all"
              label="이 페이지의 프로그램 전체 선택"
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
              label={ENTITY_LABEL}
              hasQuery={hasQuery}
              hasActiveFilters={hasActiveFilters}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => setStatus(STATUS_ALL)}
              action={createButton}
            />
          }
        />

        {confirming !== null && (
          <ConfirmDialog
            intent="delete"
            title="프로그램 삭제"
            message={`'${confirming.title}' 프로그램을 삭제할까요? 되돌릴 수 없어요.`}
            confirmLabel="프로그램 삭제"
            onConfirm={() => {
              removeProgram(confirming.id);
              setConfirming(null);
            }}
            onCancel={() => setConfirming(null)}
          />
        )}
      </div>
    </div>
  );
}

/** 정상: 진행 상태 필터 + 현황 목록(모금액·달성률 배지, 남은 일수는 고정 기준일 2026-07-21) */
export const Default: Story = {
  render: () => <ProgramsScreen />,
};

/** 최초 로드: 표 스켈레톤 + 건수 배지 '—' — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ProgramsScreen loading programs={[]} />,
};

/** 빈 결과: 등록된 프로그램 없음 → 등록 CTA (STATE-05) */
export const Empty: Story = {
  render: () => <ProgramsScreen programs={[]} />,
};

/** 필터 결과 없음: '작성 중'만 봤을 때 해당 건이 없음 → 필터 초기화 (STATE-05) */
export const FilteredEmpty: Story = {
  render: () => <ProgramsScreen initialStatus="draft" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <ProgramsScreen initialSelectedIds={['pgm-2', 'pgm-4']} />,
};
