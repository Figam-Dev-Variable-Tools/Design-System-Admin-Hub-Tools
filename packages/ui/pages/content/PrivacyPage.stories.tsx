/**
 * Design System/Templates/Content/Privacy Policy — 개인정보 처리방침 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/privacy` → 메뉴 en = "Content"(콘텐츠 관리),
 * 화면 en = "Privacy Policy" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/privacy', '개인정보 처리방침', 'Privacy Policy']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/privacy/PrivacyPage.tsx (라우트 /content/privacy).
 * 약관과 '버전 문서 쌍'이지만 **단일 문서**라 종류 선택(좌측 레일)이 없다 — 툴바 + 버전 이력 표가
 * 전부다. 전문은 목록에 쏟지 않고 행을 눌러 상세(/content/privacy/:id)에서 본다. 현재 시행본은
 * '현재' 배지로 강조한다. 버전은 몇 건뿐이라 페이지네이션도 없다 — 이 화면이 직렬화할 조회 상태는
 * 검색어 하나뿐이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   VersionHistoryTable(앱) → DS Table(+ 선택·순번·행 액션 셀 + StatusBadge)
 *   useListState(URL 소유)   → 스토리 로컬 useState(검색·선택)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   처리방침 버전 검색        → SearchField
 *   새 버전 등록 버튼         → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸  → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                  → SeqHeaderCell · SeqCell
 *   현재 시행본 · 상태 배지    → StatusBadge (현재=info / 시행중=success · 시행예정=info · 만료=neutral)
 *   행 액션(수정·삭제)        → RowActions
 *   선택 일괄 삭제            → SelectionBar + Button(danger)
 *   삭제 확인 · 일괄 삭제 확인 → ConfirmDialog(intent=delete)
 *   버전 이력 표              → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                  → Empty
 *   조회 실패                 → Alert(danger) + 다시 시도 Button
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
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
  title: 'Design System/Templates/Content/Privacy Policy',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/privacy/types.ts 미러 — 레이어 경계라 값으로 복사) ────────────── */

type PrivacyStatus = 'active' | 'scheduled' | 'archived';

const STATUS_LABEL: Record<PrivacyStatus, string> = {
  active: '시행중',
  scheduled: '시행예정',
  archived: '만료',
};

/** 시행중=성공, 시행예정=정보, 만료=중립 — 색만으로 말하지 않도록 라벨과 함께 쓴다 */
const STATUS_TONE: Record<PrivacyStatus, StatusBadgeTone> = {
  active: 'success',
  scheduled: 'info',
  archived: 'neutral',
};

/** 현재 시행본인가 — 상태가 '시행중'인 버전 (실화면 isCurrent 미러) */
const isCurrent = (status: PrivacyStatus): boolean => status === 'active';

/* ── 데모 데이터(실화면 PrivacyVersion 픽스처 미러 — 시행일 내림차순) ──────────────────────── */

interface DemoPrivacyVersion {
  readonly id: string;
  /** 버전 표기 ('v2.1') */
  readonly version: string;
  /** 시행일 — 'YYYY-MM-DD' */
  readonly effectiveDate: string;
  readonly status: PrivacyStatus;
}

const DEMO_VERSIONS: readonly DemoPrivacyVersion[] = [
  { id: 'privacy-v2.1', version: 'v2.1', effectiveDate: '2027-01-01', status: 'scheduled' },
  { id: 'privacy-v2.0', version: 'v2.0', effectiveDate: '2025-03-01', status: 'active' },
  { id: 'privacy-v1.1', version: 'v1.1', effectiveDate: '2024-06-01', status: 'archived' },
  { id: 'privacy-v1.0', version: 'v1.0', effectiveDate: '2023-01-01', status: 'archived' },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

const SELECT_ALL_LABEL_ID = 'privacy-select-all-label';

/* ── 표 열 정의(데이터 열 3개 — 선택·순번은 leading, 액션은 trailing) ───────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'version', header: '버전' },
  { id: 'effectiveDate', header: '시행일', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
];

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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
  minWidth: 0,
  width: `calc(${cssVar('space.6')} * 10)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const versionCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  fontVariantNumeric: 'tabular-nums',
};

const versionLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
};

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

interface PrivacyScreenProps {
  /** 최초 로드 — 표 스켈레톤 */
  readonly loading?: boolean;
  /** 조회 실패 — 화면 전체가 Alert 로 갈린다(실화면은 early return) */
  readonly failed?: boolean;
  readonly initialKeyword?: string;
  readonly initialSelectedIds?: readonly string[];
}

function PrivacyScreen({
  loading = false,
  failed = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: PrivacyScreenProps) {
  const [versions, setVersions] = useState<readonly DemoPrivacyVersion[]>(DEMO_VERSIONS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoPrivacyVersion | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (kw === '') return versions;
    return versions.filter((version) => version.version.toLowerCase().includes(kw));
  }, [versions, keyword]);

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
      for (const version of visible) {
        if (checked) next.add(version.id);
        else next.delete(version.id);
      }
      return next;
    });
  };

  const removeVersions = (ids: ReadonlySet<string>): void => {
    setVersions((prev) => prev.filter((version) => !ids.has(version.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  if (failed) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>개인정보 처리방침</h1>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>개인정보 처리방침을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const rows: TableProps['rows'] = visible.map((version, index) => ({
    id: version.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 처리방침 버전 상세(/content/privacy/:id)에서 전문을 본다 */
    },
    selected: selectedIds.has(version.id),
    leading: [
      <RowSelectCell
        key="select"
        id={version.id}
        label={`버전 ${version.version} 선택`}
        checked={selectedIds.has(version.id)}
        onToggle={(checked) => toggleOne(version.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      <span key="version" style={versionCellStyle}>
        <span style={versionLinkStyle}>{version.version}</span>
        {isCurrent(version.status) && <StatusBadge tone="info" label="현재" />}
      </span>,
      version.effectiveDate,
      <StatusBadge
        key="status"
        tone={STATUS_TONE[version.status]}
        label={STATUS_LABEL[version.status]}
      />,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={`버전 ${version.version}`}
          onEdit={() => {
            /* 실화면: 연필 → 처리방침 버전 수정 폼(/content/privacy/:id/edit) */
          }}
          onDelete={() => setConfirming(version)}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>개인정보 처리방침</h1>

      <div style={toolbarStyle}>
        <span style={searchWrapStyle}>
          <SearchField
            label="처리방침 버전 검색"
            placeholder="버전 검색 (예: v2.0)"
            value={keyword}
            onChange={setKeyword}
          />
        </span>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          새 버전 등록
        </Button>
      </div>

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" onClick={() => setBulkOpen(true)}>
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="개인정보 처리방침 버전 이력 — 체크박스로 선택하고, 행을 누르면 전문을 봐요. 수정/삭제 버튼으로 각 버전을 관리해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 목록의 버전 전체 선택"
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
            label="버전"
            hasQuery={keyword.trim() !== ''}
            onClearSearch={() => setKeyword('')}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="처리방침 버전 삭제"
          message={`${confirming.version} 버전을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="버전 삭제"
          onConfirm={() => {
            removeVersions(new Set([confirming.id]));
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="처리방침 버전 일괄 삭제"
          message={`선택한 버전 ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removeVersions(selectedIds);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 처리방침 버전 이력 4건(시행예정 · 시행중'현재' · 만료 2건) */
export const Default: Story = {
  render: () => <PrivacyScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <PrivacyScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <PrivacyScreen initialKeyword="v9.9" />,
};

/** 선택됨: 만료 버전 2건 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <PrivacyScreen initialSelectedIds={['privacy-v1.0', 'privacy-v1.1']} />,
};

/** 에러: 버전 이력 조회 실패 — 화면 전체가 Alert(danger) + 다시 시도로 갈린다 */
export const Error: Story = {
  render: () => <PrivacyScreen failed />,
};
