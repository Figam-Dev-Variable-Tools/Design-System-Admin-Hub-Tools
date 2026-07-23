/**
 * Design System/Templates/Portfolio/Case Studies — 성공 사례 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/portfolio/case-studies` → 메뉴 en = "Portfolio"(포트폴리오 관리),
 * 화면 en = "Case Studies" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Business 섹션 Portfolio
 * 그룹의 `['/portfolio/case-studies', '성공 사례', 'Case Studies']`).
 *
 * 대응 실화면: apps/admin/src/pages/portfolio/case-studies/CaseStudyListPage.tsx
 * (라우트 /portfolio/case-studies). 실화면은 승격된 CRUD 프레임워크(useCrudList + CrudListShell +
 * CrudTable) 위에 업종 필터와 '노출' 인라인 토글(_shared/publishColumn)을 얹는다 — 형제 화면인
 * 포트폴리오 목록과 같은 골격이되, **관리형 카테고리가 아니라 고정 업종 enum**을 쓰고(배지 톤이
 * 코드로 고정된다) 목록에 이미지 열을 두지 않는다(이미지는 상세/폼에서만).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   업종 필터                  → SelectField (실화면 parseFilter + CASE_INDUSTRY_OPTIONS)
 *   등록 CTA                   → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   업종 배지                  → StatusBadge (industryTone 미러 — 업종별 톤이 옵션 표에 고정돼 있다)
 *   성과 요약(말줄임)           → 토큰만 쓴 <span>(ellipsis)
 *   노출 인라인 토글            → ToggleSwitch (publishToggleColumn 미러)
 *   행 액션(수정·삭제)          → RowActions
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *   목록 표                    → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                    → Empty (필터 초기화 복구)
 *
 * [페이지네이션 없음] 실화면 CrudListShell 은 Pagination 을 그리지 않는다 — 필터를 적용한
 * visibleItems 를 한 번에 보여 준다. 형제 화면(Portfolio List)과 같게 여기에도 두지 않는다.
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
  title: 'Design System/Templates/Portfolio/Case Studies',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 case-studies/types.ts 의 CaseStudy 를 목록이 쓰는 필드만 축약해 미러) ─────── */

type CaseIndustry = 'manufacturing' | 'retail' | 'finance' | 'public' | 'healthcare' | 'it';

interface DemoCase {
  readonly id: string;
  readonly title: string;
  readonly industry: CaseIndustry;
  /** 고객사 — 가상 표기(실명 아님) */
  readonly client: string;
  /** 성과 — 목록에 요약으로 보인다 */
  readonly result: string;
  readonly published: boolean;
  readonly date: string;
}

/** 업종 라벨·톤 — 실화면 CASE_INDUSTRY_OPTIONS 미러(키 접근 안전) */
const INDUSTRY_META: Record<
  CaseIndustry,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  manufacturing: { label: '제조', tone: 'neutral' },
  retail: { label: '유통', tone: 'info' },
  finance: { label: '금융', tone: 'success' },
  public: { label: '공공', tone: 'warning' },
  healthcare: { label: '의료', tone: 'info' },
  it: { label: 'IT·서비스', tone: 'success' },
};

const INDUSTRY_IDS: readonly CaseIndustry[] = [
  'manufacturing',
  'retail',
  'finance',
  'public',
  'healthcare',
  'it',
];

const FILTER_ALL = 'all';
type CaseFilter = typeof FILTER_ALL | CaseIndustry;

/**
 * 일자 내림차순(최근이 위) — 실화면 sortCaseStudies 가 이미 정렬해 내려준 순서.
 * '의료'와 'IT·서비스'는 항목이 0건이라 그 업종으로 거르면 빈 결과가 된다.
 */
const DEMO_CASES: readonly DemoCase[] = [
  {
    id: 'cs-1',
    title: '스마트팩토리 전환으로 불량률 절반 감축',
    industry: 'manufacturing',
    client: '다온정밀',
    result: '6개월 만에 불량률을 52% 낮추고 라인 가동률을 18%p 끌어올렸어요.',
    published: true,
    date: '2024-04-30',
  },
  {
    id: 'cs-2',
    title: '옴니채널 개편으로 재구매율 상승',
    industry: 'retail',
    client: '벨라마켓',
    result: '재구매율이 분기 대비 23% 올랐어요.',
    published: true,
    date: '2024-01-22',
  },
  {
    id: 'cs-3',
    title: '비대면 창구 도입으로 대기시간 단축',
    industry: 'finance',
    client: '한결저축은행',
    result: '평균 대기시간을 14분에서 4분으로 줄였어요.',
    published: false,
    date: '2023-09-14',
  },
  {
    id: 'cs-4',
    title: '시민 참여형 민원 포털 구축',
    industry: 'public',
    client: '새빛시청',
    result: '민원 처리 만족도가 71점에서 88점으로 올랐어요.',
    published: true,
    date: '2023-05-08',
  },
];

const ENTITY_LABEL = '성공 사례';
const SELECT_ALL_LABEL_ID = 'case-study-select-all';

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 5개 — 선택·순번은 leading, 액션은 trailing 으로 별도) ────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'industry', header: '업종', nowrap: true },
  { id: 'title', header: '제목' },
  { id: 'client', header: '고객사', nowrap: true },
  { id: 'result', header: '성과' },
  { id: 'published', header: '노출', nowrap: true },
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

const resultCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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

interface CaseStudyListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 업종 필터 초기값 — 항목 0건인 업종('의료')으로 Empty(필터 결과 없음)를 만든다 */
  readonly initialFilter?: CaseFilter;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
}

function CaseStudyListScreen({
  loading = false,
  initialFilter = FILTER_ALL,
  initialSelectedIds = [],
}: CaseStudyListScreenProps) {
  const [cases, setCases] = useState<readonly DemoCase[]>(DEMO_CASES);
  const [filter, setFilter] = useState<CaseFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoCase | null>(null);

  const visible = useMemo(
    () => (filter === FILTER_ALL ? cases : cases.filter((item) => item.industry === filter)),
    [cases, filter],
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
  const changeFilter = (value: CaseFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const togglePublished = (id: string, next: boolean): void => {
    setCases((prev) => prev.map((item) => (item.id === id ? { ...item, published: next } : item)));
  };

  const removeCase = (id: string): void => {
    setCases((prev) => prev.filter((item) => item.id !== id));
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
      /* 실화면: 행 클릭 → 수정 화면(/portfolio/case-studies/:id/edit) */
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
        key="industry"
        tone={INDUSTRY_META[item.industry].tone}
        label={INDUSTRY_META[item.industry].label}
      />,
      <span key="title" style={titleCellStyle}>
        {item.title}
      </span>,
      item.client,
      <span key="result" style={resultCellStyle}>
        {item.result}
      </span>,
      <ToggleSwitch
        key="published"
        checked={item.published}
        onChange={(next) => togglePublished(item.id, next)}
        label={`${item.title} 노출 여부`}
        onLabel="게시"
        offLabel="숨김"
      />,
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
      <h1 style={headingStyle}>성공 사례</h1>

      {/* 툴바 — 업종 필터(좌) + 등록 CTA(우). 이 화면에는 검색이 없다 */}
      <div style={toolbarStyle}>
        <span style={filterStyle}>
          <SelectField
            value={filter}
            aria-label="업종으로 거르기"
            onChange={(event) => {
              const raw = event.target.value;
              changeFilter(
                INDUSTRY_IDS.find((id) => id === raw) === undefined
                  ? FILTER_ALL
                  : (raw as CaseIndustry),
              );
            }}
          >
            <option value={FILTER_ALL}>전체 업종</option>
            {INDUSTRY_IDS.map((id) => (
              <option key={id} value={id}>
                {INDUSTRY_META[id].label}
              </option>
            ))}
          </SelectField>
        </span>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          성공 사례 등록
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
          size="sm"
          onClick={() => {
            for (const id of selectedIds) removeCase(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="성공 사례 목록 — 행을 누르면 수정 화면으로 이동해요. 체크박스·노출 토글·수정·삭제 버튼은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 성공 사례 전체 선택"
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
        skeletonRows={4}
        empty={
          <EmptyState
            label={ENTITY_LABEL}
            hasActiveFilters={filter !== FILTER_ALL}
            onResetFilters={() => changeFilter(FILTER_ALL)}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="성공 사례 삭제"
          message={`'${confirming.title}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeCase(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 업종이 섞여 채워진 기본 상태(숨김 1건 포함 · 선택 없음) */
export const Default: Story = {
  render: () => <CaseStudyListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CaseStudyListScreen loading />,
};

/** 빈 결과: 항목이 0건인 업종('의료')으로 걸렀을 때 — Empty(필터 초기화 복구) */
export const Empty: Story = {
  render: () => <CaseStudyListScreen initialFilter="healthcare" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <CaseStudyListScreen initialSelectedIds={['cs-1', 'cs-3']} />,
};
