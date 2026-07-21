/**
 * Design System/Templates/Support/Download List — 자료실 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Support"(고객센터)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Support 그룹, 화면 en = "Downloads" 의 목록 화면.
 *
 * 대응 실화면: apps/admin/src/pages/support/downloads/DownloadListPage.tsx (라우트 /support/downloads)
 * 와 그 하위 조립(types.ts). 실화면은 공용 CRUD 프레임워크(useCrudList + CrudListShell) 위에 카테고리·
 * 노출 필터 + 검색 툴바를 얹고, 목록에서 노출 토글을 바로 바꾼다. 목록엔 이미지 열이 없다(파일은 상세/폼에서만).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 껍데기(CrudListShell/CrudTable)를 DS 표면으로 갈음한다:
 *   검색                    → SearchField
 *   카테고리·노출 필터       → SelectField ×2
 *   등록 버튼               → Button(primary) + Icon(plus-circle)
 *   선택 일괄 삭제 바        → SelectionBar + Button(danger)
 *   전체선택 헤더/행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   목록 표                 → Table (leadingHead=선택 / trailingHead=행 액션)
 *   카테고리 배지           → StatusBadge(info)
 *   노출 토글               → ToggleSwitch (목록에서 바로 노출/숨김)
 *   행 수정/삭제            → IconButton + Icon(pencil/trash)
 *   빈 결과                 → Empty
 *   삭제 확인               → ConfirmDialog(intent=delete)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  IconButton,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  StatusBadge,
  Table,
  ToggleSwitch,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Download List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 downloads/types 미러) ────────────────────────────────────────────────── */

type FileKind = 'document' | 'image' | 'archive' | 'etc';

interface DemoDownload {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly version: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly fileKind: FileKind;
  readonly downloadCount: number;
  readonly visible: boolean;
}

const CATEGORY_ALL = 'all';
const DOWNLOAD_CATEGORY_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: '카탈로그', label: '카탈로그' },
  { id: '제품 매뉴얼', label: '제품 매뉴얼' },
  { id: '양식/서식', label: '양식/서식' },
  { id: '브로슈어', label: '브로슈어' },
  { id: '기타', label: '기타' },
];

type VisibilityFilter = 'all' | 'visible' | 'hidden';
const VISIBILITY_OPTIONS: readonly { readonly id: VisibilityFilter; readonly label: string }[] = [
  { id: 'all', label: '전체 노출상태' },
  { id: 'visible', label: '노출' },
  { id: 'hidden', label: '숨김' },
];

const FILE_KIND_LABEL: Record<FileKind, string> = {
  document: '문서',
  image: '이미지',
  archive: '압축',
  etc: '기타',
};

const DEMO_DOWNLOADS: readonly DemoDownload[] = [
  {
    id: 'd-1',
    title: '2026 상반기 제품 카탈로그',
    categoryLabel: '카탈로그',
    version: 'v2.1',
    fileName: 'catalog-2026H1.pdf',
    fileSize: 8_540_000,
    fileKind: 'document',
    downloadCount: 1284,
    visible: true,
  },
  {
    id: 'd-2',
    title: '스마트 도어락 설치 매뉴얼',
    categoryLabel: '제품 매뉴얼',
    version: 'v1.3',
    fileName: 'doorlock-install.pdf',
    fileSize: 3_120_000,
    fileKind: 'document',
    downloadCount: 642,
    visible: true,
  },
  {
    id: 'd-3',
    title: '거래명세서 양식',
    categoryLabel: '양식/서식',
    version: '',
    fileName: 'transaction-form.xlsx',
    fileSize: 48_200,
    fileKind: 'document',
    downloadCount: 210,
    visible: true,
  },
  {
    id: 'd-4',
    title: '회사 소개 브로슈어',
    categoryLabel: '브로슈어',
    version: 'v3.0',
    fileName: 'company-brochure.zip',
    fileSize: 24_800_000,
    fileKind: 'archive',
    downloadCount: 158,
    visible: false,
  },
  {
    id: 'd-5',
    title: '무선 청소기 사용 설명서',
    categoryLabel: '제품 매뉴얼',
    version: 'v1.0',
    fileName: 'vacuum-manual.pdf',
    fileSize: 2_040_000,
    fileKind: 'document',
    downloadCount: 87,
    visible: true,
  },
  {
    id: 'd-6',
    title: '개인정보 수집 동의서 양식',
    categoryLabel: '양식/서식',
    version: '',
    fileName: 'privacy-consent.hwp',
    fileSize: 96_400,
    fileKind: 'document',
    downloadCount: 45,
    visible: false,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 사람이 읽는 용량 — '0 B' / '12.3 KB' / '3.4 MB' — 실화면 formatBytes 미러 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${String(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const fileKindLabel = (kind: FileKind): string => FILE_KIND_LABEL[kind];

const SELECT_ALL_LABEL_ID = 'support-downloads-select-all';

/* ── 표 열 정의(데이터 열 6개 — 선택/액션 열은 leadingHead·trailingHead 로 별도) ───────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '제목' },
  { id: 'category', header: '카테고리', nowrap: true },
  { id: 'file', header: '파일' },
  { id: 'version', header: '버전', nowrap: true },
  { id: 'downloads', header: '다운로드수', align: 'end' },
  { id: 'visible', header: '노출', nowrap: true },
];

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
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 3.5)` };

const spacerStyle: CSSProperties = { flexGrow: 1 };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const fileCellStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const numericStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const titleStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
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

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface DownloadListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty 상태를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
  /** 삭제 확인 초기값 */
  readonly initialDeleteId?: string;
}

function DownloadListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
  initialDeleteId,
}: DownloadListScreenProps) {
  const [items, setItems] = useState<readonly DemoDownload[]>(DEMO_DOWNLOADS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [category, setCategory] = useState<string>(CATEGORY_ALL);
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [pendingDelete, setPendingDelete] = useState<DemoDownload | null>(
    () => DEMO_DOWNLOADS.find((item) => item.id === initialDeleteId) ?? null,
  );

  const visibleItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== CATEGORY_ALL && item.categoryLabel !== category) return false;
      if (visibility === 'visible' && !item.visible) return false;
      if (visibility === 'hidden' && item.visible) return false;
      if (kw === '') return true;
      return item.title.toLowerCase().includes(kw) || item.fileName.toLowerCase().includes(kw);
    });
  }, [items, category, visibility, keyword]);

  const selection = tableSelectionState(visibleItems, selectedIds);
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
      for (const item of visibleItems) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const toggleVisible = (id: string, next: boolean): void => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, visible: next } : item)));
  };

  const rows: TableProps['rows'] = visibleItems.map((item) => ({
    id: item.id,
    selected: selectedIds.has(item.id),
    onActivate: () => {
      /* 실화면에서는 자료 수정(/support/downloads/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={item.id}
        label={`${item.title} 선택`}
        checked={selectedIds.has(item.id)}
        onToggle={(checked) => toggleOne(item.id, checked)}
      />,
    ],
    cells: [
      <span style={titleStyle}>{item.title}</span>,
      <StatusBadge tone="info" label={item.categoryLabel} />,
      <span style={fileCellStyle}>
        {`${item.fileName} · ${fileKindLabel(item.fileKind)} · ${formatBytes(item.fileSize)}`}
      </span>,
      item.version.trim() === '' ? '-' : item.version,
      <span style={numericStyle}>{fmt(item.downloadCount)}</span>,
      <ToggleSwitch
        key="visible"
        checked={item.visible}
        label={`${item.title} 노출 여부`}
        onLabel="노출"
        offLabel="숨김"
        onChange={(next) => toggleVisible(item.id, next)}
      />,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <span style={{ display: 'inline-flex', gap: cssVar('space.1') }}>
          <IconButton icon={<Icon name="pencil" />} label={`${item.title} 수정`} size="sm" />
          <IconButton
            icon={<Icon name="trash" />}
            label={`${item.title} 삭제`}
            size="sm"
            onClick={() => setPendingDelete(item)}
          />
        </span>
      </td>,
    ],
  }));

  const changeKeyword = (value: string): void => setKeyword(value);
  const changeCategory = (value: string): void => setCategory(value);
  const changeVisibility = (value: VisibilityFilter): void => setVisibility(value);

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>자료실</h1>

      {/* 툴바 — 검색 + 카테고리/노출 필터 + 등록 */}
      <div style={toolbarStyle}>
        <div style={searchWrapStyle}>
          <SearchField
            label="제목·파일명 검색"
            value={keyword}
            placeholder="제목 · 파일명 검색"
            onChange={changeKeyword}
          />
        </div>
        <span style={selectWrapStyle}>
          <SelectField
            value={category}
            aria-label="카테고리로 거르기"
            onChange={(event) => changeCategory(event.target.value)}
          >
            <option value={CATEGORY_ALL}>전체 카테고리</option>
            {DOWNLOAD_CATEGORY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={visibility}
            aria-label="노출 상태로 거르기"
            onChange={(event) => changeVisibility(event.target.value as VisibilityFilter)}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={spacerStyle} />
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          자료 등록
        </Button>
      </div>

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" size="sm">
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visibleItems.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <Table
        caption="자료 목록 — 행을 누르면 자료 수정으로 이동합니다. 체크박스·노출 토글·액션 버튼은 각자의 동작을 수행합니다."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 목록의 자료 전체 선택"
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
        skeletonRows={6}
        empty={
          <EmptyState
            label="자료"
            hasQuery={keyword.trim() !== ''}
            onClearSearch={() => setKeyword('')}
          />
        }
      />

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="자료 삭제"
          message={`'${pendingDelete.title}' 자료를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="자료 삭제"
          onConfirm={() => setPendingDelete(null)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** 정상: 자료 목록이 채워진 기본 상태(선택 없음) */
export const Default: Story = {
  render: () => <DownloadListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <DownloadListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <DownloadListScreen initialKeyword="존재하지 않는 자료" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <DownloadListScreen initialSelectedIds={['d-1', 'd-4']} />,
};

/** 삭제 확인: 한 자료에 대한 ConfirmDialog */
export const DeleteConfirm: Story = {
  render: () => <DownloadListScreen initialDeleteId="d-4" />,
};
