/**
 * Design System/Templates/Company/ESG — ESG 활동 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/esg` → 메뉴 en = "Company"(기업 관리), 화면 en = "ESG"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의 `['/company/esg', 'ESG', 'ESG']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/esg/EsgListPage.tsx (라우트 /company/esg).
 * ESG 는 **분류(환경·사회·지배구조)가 곧 읽는 축**이라 다른 기업 관리 목록과 달리 좌측에 건수
 * 배지를 단 필터 레일을 세우고, 오른쪽 열에 CrudListShell(툴바 + 요약 + 일괄 삭제 바 + 표)을 둔다.
 * 검색은 없다 — 활동 건수가 적어 분류만으로 충분하다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *   FilterRail/FilterPanel  → Panel(notice) + SelectField (건수는 선택지 라벨에 함께 적는다)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 필터 레일 + 안내      → Panel (notice = 분류 설명)
 *   분류 필터(건수 배지)        → SelectField (실화면 FilterPanel 의 pressable 목록 + counts)
 *   등록 CTA                  → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   분류 배지                  → StatusBadge (esgCategoryTone 미러 — 환경=success·사회=info·지배구조=neutral)
 *   행 액션(수정·삭제)         → RowActions
 *   선택 일괄 삭제 바          → SelectionBar + Button(danger)
 *   삭제 확인                 → ConfirmDialog(intent=delete)
 *   목록 표                   → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                   → Empty (필터 초기화 복구)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
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
  title: 'Design System/Templates/Company/ESG',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 esg/types.ts 의 EsgItem 미러) ─────────────────────────────────────────── */

type EsgCategory = 'environment' | 'social' | 'governance';

interface DemoEsg {
  readonly id: string;
  readonly category: EsgCategory;
  readonly title: string;
  readonly summary: string;
  /** 활동 일자 'YYYY-MM-DD' */
  readonly date: string;
  /** 본문 이미지 장수 — 목록에는 열이 없고 요약 문구에만 쓴다 */
  readonly imageCount: number;
}

/** 분류 라벨·톤 — 실화면 esgCategoryLabel · esgCategoryTone 미러(키 접근 안전) */
const CATEGORY_META: Record<
  EsgCategory,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  environment: { label: '환경', tone: 'success' },
  social: { label: '사회', tone: 'info' },
  governance: { label: '지배구조', tone: 'neutral' },
};

const CATEGORY_IDS: readonly EsgCategory[] = ['environment', 'social', 'governance'];

const FILTER_ALL = 'all';
type EsgFilter = typeof FILTER_ALL | EsgCategory;

/** 활동 일자 내림차순(최근이 위) — 실화면 sortEsg 가 이미 정렬해 내려준 순서 */
const DEMO_ESG: readonly DemoEsg[] = [
  {
    id: 'esg-1',
    category: 'environment',
    title: '사옥 전력 재생에너지 전환',
    summary: '본사 사옥 전력의 60%를 재생에너지로 전환했습니다.',
    date: '2024-03-05',
    imageCount: 2,
  },
  {
    id: 'esg-2',
    category: 'social',
    title: '지역아동센터 공간 개선 봉사',
    summary: '임직원 봉사단이 지역아동센터 학습 공간을 리모델링했습니다.',
    date: '2023-11-18',
    imageCount: 1,
  },
  {
    id: 'esg-3',
    category: 'governance',
    title: '윤리경영 위원회 신설',
    summary: '사외 위원이 참여하는 윤리경영 위원회를 신설했습니다.',
    date: '2023-07-02',
    imageCount: 0,
  },
  {
    id: 'esg-4',
    category: 'environment',
    title: '전자 계약 도입으로 종이 사용 절감',
    summary: '전자 계약 시스템 도입으로 연간 종이 사용량을 40% 줄였습니다.',
    date: '2022-12-10',
    imageCount: 0,
  },
  {
    id: 'esg-5',
    category: 'social',
    title: '협력사 안전보건 교육 지원',
    summary: '협력사 현장 인력을 대상으로 안전보건 교육 과정을 무상 제공했습니다.',
    date: '2022-08-24',
    imageCount: 1,
  },
];

const ENTITY_LABEL = 'ESG 활동';
const SELECT_ALL_LABEL_ID = 'esg-select-all';

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 4개 — 선택·순번은 leading, 액션은 trailing 으로 별도) ────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'category', header: '분류', nowrap: true },
  { id: 'title', header: '제목' },
  { id: 'summary', header: '내용' },
  { id: 'date', header: '일자', nowrap: true },
];

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

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

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 8) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filterFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const filterLabelStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const summaryCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const titleCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
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

interface EsgScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 분류 필터 초기값 — Filtered 상태에서 한 분류로 좁힌다 */
  readonly initialFilter?: EsgFilter;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
  /** 시드 — Empty(진짜 비어있음) 상태에서 빈 배열을 넣는다 */
  readonly items?: readonly DemoEsg[];
}

function EsgScreen({
  loading = false,
  initialFilter = FILTER_ALL,
  initialSelectedIds = [],
  items = DEMO_ESG,
}: EsgScreenProps) {
  const [activities, setActivities] = useState<readonly DemoEsg[]>(items);
  const [filter, setFilter] = useState<EsgFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoEsg | null>(null);

  // 분류별 건수(+전체) — 실화면 countEsgByCategory 미러. 좌측 필터의 배지 숫자다
  const counts = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = { [FILTER_ALL]: activities.length };
    for (const id of CATEGORY_IDS) result[id] = 0;
    for (const item of activities) result[item.category] = (result[item.category] ?? 0) + 1;
    return result;
  }, [activities]);

  const visible = useMemo(
    () =>
      filter === FILTER_ALL ? activities : activities.filter((item) => item.category === filter),
    [activities, filter],
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

  // 필터가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다(실화면 useEffect(clear) 미러)
  const changeFilter = (value: EsgFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const removeActivity = (id: string): void => {
    setActivities((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((item, index) => ({
    id: item.id,
    selected: selectedIds.has(item.id),
    onActivate: () => {
      /* 실화면: 행 클릭 → 수정 화면(/company/esg/:id/edit) */
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
    /* 셀은 DS Table 이 각자 keyed <td> 로 감싸지만, 배열 리터럴 안의 JSX 는 react/jsx-key 가
       키를 요구한다 — 열 id 로 키를 준다(위치 고정이라 안정적이다). */
    cells: [
      <StatusBadge
        key="category"
        tone={CATEGORY_META[item.category].tone}
        label={CATEGORY_META[item.category].label}
      />,
      <span key="title" style={titleCellStyle}>
        {item.title}
      </span>,
      <span key="summary" style={summaryCellStyle}>
        {item.summary}
      </span>,
      item.date,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <RowActions
          label={item.title}
          onEdit={() => {
            /* 실화면: 연필 → 수정 화면으로 이동 */
          }}
          onDelete={() => setConfirming(item)}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>ESG</h1>

      <div style={layoutStyle}>
        {/* 좌측 필터 레일 — 분류 축 하나. 건수는 선택지 라벨에 함께 적는다(실화면 counts 배지) */}
        <Panel
          notice={
            <p style={hintStyle}>
              환경 · 사회 · 지배구조 세 축으로 활동을 나눠요. 분류를 고르면 그 축의 활동만 남아요.
            </p>
          }
        >
          <div style={filterFieldStyle}>
            <label htmlFor="esg-filter-category" style={filterLabelStyle}>
              분류
            </label>
            <SelectField
              id="esg-filter-category"
              value={filter}
              onChange={(event) => {
                const raw = event.target.value;
                changeFilter(
                  CATEGORY_IDS.find((id) => id === raw) === undefined
                    ? FILTER_ALL
                    : (raw as EsgCategory),
                );
              }}
            >
              <option value={FILTER_ALL}>{`전체 (${fmt(counts[FILTER_ALL] ?? 0)})`}</option>
              {CATEGORY_IDS.map((id) => (
                <option key={id} value={id}>
                  {`${CATEGORY_META[id].label} (${fmt(counts[id] ?? 0)})`}
                </option>
              ))}
            </SelectField>
          </div>
        </Panel>

        <div style={mainColumnStyle}>
          {/* 툴바 — 등록 CTA 만 오른쪽에 선다(필터는 좌측 레일이 소유한다) */}
          <div style={toolbarStyle}>
            <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
              ESG 활동 등록
            </Button>
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
                for (const id of selectedIds) removeActivity(id);
              }}
            >
              {`선택 ${fmt(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <Table
            caption="ESG 활동 목록 — 행을 누르면 수정 화면으로 이동해요. 체크박스·수정·삭제 버튼은 각자 따로 동작해요."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 ESG 활동 전체 선택"
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
                label={ENTITY_LABEL}
                hasActiveFilters={filter !== FILTER_ALL}
                onResetFilters={() => changeFilter(FILTER_ALL)}
              />
            }
          />
        </div>
      </div>

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="ESG 활동 삭제"
          message={`'${confirming.title}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeActivity(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 세 분류가 섞여 채워진 기본 상태(선택 없음) */
export const Default: Story = {
  render: () => <EsgScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <EsgScreen loading />,
};

/** 빈 결과: 아직 한 건도 등록하지 않은 상태 — Empty(등록 안내, 필터·검색 없음) */
export const Empty: Story = {
  render: () => <EsgScreen items={[]} />,
};

/** 걸러짐: 분류를 '환경'으로 좁힌 상태 — 좌측 필터 건수와 표의 행 수가 맞물린다 */
export const Filtered: Story = {
  render: () => <EsgScreen initialFilter="environment" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <EsgScreen initialSelectedIds={['esg-2', 'esg-4']} />,
};
