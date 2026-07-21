/**
 * Design System/Templates/Support/Replies — 문의 답변 템플릿 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/support/replies` → 메뉴 en = "Support"(고객센터), 화면 en = "Replies"
 * (packages/ui/pages/_data/pages.ts 의 Support 그룹에서 확정 — 화면 한국어명은 '문의 답변').
 *
 * 대응 실화면: apps/admin/src/pages/support/replies/RepliesPage.tsx (라우트 /support/replies).
 * 실화면은 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 검색 툴바와 컬럼(제목·유형 태그·
 * 본문 미리보기)만 얹는다 — 티켓 목록과 달리 등록/수정(폼 페이지)·삭제·일괄 삭제가 있는 쓰기 목록이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 앱 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable(앱)   → Table + 선택 프리미티브로 직접 조립
 *   검색 입력(IME 안전)           → SearchField
 *   템플릿 등록 CTA               → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸      → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   유형 태그 배지                → StatusBadge (공용='전체' neutral, 특정 유형 info)
 *   본문 미리보기(한 줄 말줄임)   → 토큰만 쓴 truncate 텍스트
 *   일괄 삭제 바                  → SelectionBar + Button(danger)
 *   행 액션(수정/삭제)            → RowActions
 *   빈 결과                       → Empty(검색 지우기 복구)
 *
 * [페이지네이션 없음] 실화면 CrudListShell 은 Pagination 을 그리지 않는다 — 검색을 적용한 visibleItems 를
 * 한 번에 보여 준다. 충실히 미러하여 여기에도 페이지네이션을 두지 않는다.
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
  SelectionBar,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Replies',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 ReplyTemplate 을 목록이 쓰는 필드만 축약해 미러) ───────────────────────── */

interface DemoTemplate {
  readonly id: string;
  readonly title: string;
  /** 유형 태그 라벨 — 공용이면 '전체' */
  readonly categoryLabel: string;
  /** 공용(유형 태그 없음)이면 true — 배지 톤을 neutral 로 */
  readonly shared: boolean;
  readonly body: string;
}

const DEMO_TEMPLATES: readonly DemoTemplate[] = [
  {
    id: 'tpl-1',
    title: '배송 지연 사과 안내',
    categoryLabel: '배송',
    shared: false,
    body: '{{고객명}}님, 문의({{문의번호}}) 주셔서 감사합니다. 배송 지연으로 불편을 드려 죄송합니다. 확인 후 빠르게 조치하겠습니다. 담당자 {{담당자}} 드림.',
  },
  {
    id: 'tpl-2',
    title: '접수 완료 안내',
    categoryLabel: '전체',
    shared: true,
    body: '{{고객명}}님, 문의가 정상 접수되었습니다. 확인 후 순차적으로 답변드리겠습니다.',
  },
  {
    id: 'tpl-3',
    title: '환불 처리 완료 안내',
    categoryLabel: '결제·환불',
    shared: false,
    body: '{{고객명}}님, 요청하신 환불이 완료되었습니다. 카드사에 따라 실제 반영까지 3~5영업일이 소요될 수 있습니다.',
  },
  {
    id: 'tpl-4',
    title: '상품 재입고 안내',
    categoryLabel: '상품 문의',
    shared: false,
    body: '{{고객명}}님, 문의하신 상품은 다음 주 중 재입고 예정입니다. 입고 시 알림을 받아보시겠어요?',
  },
  {
    id: 'tpl-5',
    title: '문의 종결 안내',
    categoryLabel: '전체',
    shared: true,
    body: '{{고객명}}님, 문의가 처리 완료되어 종결합니다. 추가 문의는 새 문의로 접수해 주세요.',
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 본문 한 줄 미리보기(60자 말줄임) — 실화면 bodyPreview 미러 */
function bodyPreview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine;
}

const tagTone = (shared: boolean): StatusBadgeTone => (shared ? 'neutral' : 'info');

/* ── 표 열 정의(데이터 열 3개 — 선택 열은 leadingHead, 액션 열은 trailingHead 로 별도) ─────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'tag', header: '유형 태그', nowrap: true },
  { id: 'preview', header: '본문 미리보기' },
];

const SELECT_ALL_LABEL_ID = 'support-templates-select-all';

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

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const titleCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const previewCellStyle: CSSProperties = {
  display: 'block',
  color: cssVar('color.text.muted'),
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
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

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ──────────────────────────── */

type ScreenState = 'default' | 'loading' | 'empty' | 'selection';

function RepliesScreen({ state }: { state: ScreenState }) {
  const loading = state === 'loading';

  const [keyword, setKeyword] = useState(state === 'empty' ? '존재하지 않는 템플릿' : '');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(state === 'selection' ? ['tpl-1', 'tpl-3'] : []),
  );

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (kw === '') return DEMO_TEMPLATES;
    return DEMO_TEMPLATES.filter(
      (template) =>
        template.title.toLowerCase().includes(kw) || template.body.toLowerCase().includes(kw),
    );
  }, [keyword]);

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
    setSelectedIds(checked ? new Set(visible.map((template) => template.id)) : new Set());
  };

  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };

  const rows: TableProps['rows'] = visible.map((template) => ({
    id: template.id,
    selected: selectedIds.has(template.id),
    onActivate: () => {
      /* 실화면에서는 수정 화면(/support/replies/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={template.id}
        label={`${template.title} 선택`}
        checked={selectedIds.has(template.id)}
        onToggle={(checked) => toggleOne(template.id, checked)}
      />,
    ],
    cells: [
      <span style={titleCellStyle}>{template.title}</span>,
      <StatusBadge tone={tagTone(template.shared)} label={template.categoryLabel} />,
      <span style={previewCellStyle}>{bodyPreview(template.body)}</span>,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={template.title}
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
      <h1 style={headingStyle}>답변 템플릿</h1>

      {/* 툴바 — 검색 + 템플릿 등록 CTA */}
      <div style={toolbarStyle}>
        <span style={searchWrapStyle}>
          <SearchField
            value={keyword}
            onChange={changeKeyword}
            label="제목·본문 검색"
            placeholder="제목 · 본문 검색"
          />
        </span>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          템플릿 등록
        </Button>
      </div>

      <p style={summaryStyle} aria-busy={loading}>
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
        caption="답변 템플릿 목록 — 행을 누르면 수정 화면으로 이동합니다. 체크박스·수정·삭제 버튼은 각자의 동작을 수행합니다."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 답변 템플릿 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
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
            label="답변 템플릿"
            hasQuery={keyword.trim() !== ''}
            onClearSearch={() => changeKeyword('')}
          />
        }
      />
    </div>
  );
}

/** 정상: 답변 템플릿 목록이 채워진 기본 상태(선택 없음) */
export const Default: Story = {
  render: () => <RepliesScreen state="default" />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <RepliesScreen state="loading" />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <RepliesScreen state="empty" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <RepliesScreen state="selection" />,
};
