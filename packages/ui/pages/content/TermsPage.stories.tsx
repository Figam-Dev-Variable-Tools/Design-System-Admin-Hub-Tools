/**
 * Design System/Templates/Content/Terms — 약관 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/terms` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Terms"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의 `['/content/terms', '약관 관리', 'Terms']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/terms/TermsPage.tsx (라우트 /content/terms).
 * 약관은 '문서 하나' 가 아니라 **종류 × 버전 이력**이다 — 좌측 레일이 약관 종류를 고르고, 우측이 그
 * 종류의 버전 이력을 보여준다. 전문(본문)은 목록에 쏟지 않고 행을 눌러 상세(/content/terms/:id)에서
 * 본다. 현재 시행본은 '현재' 배지로 강조한다. 한 종류의 버전은 몇 건뿐이라 페이지네이션이 없다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   FilterRail(앱)          → DS Panel (곁에 서는 세로 스택 껍데기)
 *   FilterPanel(앱)         → 토큰만 쓴 aria-pressed 버튼 목록 (건수 배지 없음 — 세는 것은 버전이지 종류가 아니다)
 *   VersionHistoryTable(앱)  → DS Table(+ 선택·순번·행 액션 셀 + StatusBadge)
 *   useListState(URL 소유)   → 스토리 로컬 useState(종류·검색·선택)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 약관 종류 레일        → Panel + aria-pressed 버튼 목록
 *   약관 버전 검색            → SearchField
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
  title: 'Design System/Templates/Content/Terms',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/terms/types.ts 미러 — 레이어 경계라 값으로 복사) ─────────────── */

type TermsStatus = 'active' | 'scheduled' | 'archived';

const STATUS_LABEL: Record<TermsStatus, string> = {
  active: '시행중',
  scheduled: '시행예정',
  archived: '만료',
};

/** 시행중=성공, 시행예정=정보, 만료=중립 — 색만으로 말하지 않도록 라벨과 함께 쓴다 */
const STATUS_TONE: Record<TermsStatus, StatusBadgeTone> = {
  active: 'success',
  scheduled: 'info',
  archived: 'neutral',
};

/** 현재 시행본인가 — 상태가 '시행중'인 버전 (실화면 isCurrent 미러) */
const isCurrent = (status: TermsStatus): boolean => status === 'active';

/* ── 데모 데이터(실화면 TermsType · TermsVersion 픽스처 미러 — 시행일 내림차순) ──────────────── */

interface DemoTermsType {
  readonly id: string;
  readonly label: string;
}

const TERMS_TYPES: readonly DemoTermsType[] = [
  { id: 'service', label: '이용약관' },
  { id: 'efinance', label: '전자금융거래 이용약관' },
  { id: 'marketing', label: '마케팅 정보 수신 동의' },
];

/** 목록에 없는 종류로 착지하지 않도록 첫 종류를 상수로 고정한다(noUncheckedIndexedAccess) */
const FIRST_TYPE_ID = 'service';

interface DemoTermsVersion {
  readonly id: string;
  readonly typeId: string;
  /** 버전 표기 ('v1.2') */
  readonly version: string;
  /** 시행일 — 'YYYY-MM-DD' */
  readonly effectiveDate: string;
  readonly status: TermsStatus;
}

const DEMO_VERSIONS: readonly DemoTermsVersion[] = [
  {
    id: 'service-v2.0',
    typeId: 'service',
    version: 'v2.0',
    effectiveDate: '2027-01-01',
    status: 'scheduled',
  },
  {
    id: 'service-v1.1',
    typeId: 'service',
    version: 'v1.1',
    effectiveDate: '2025-01-01',
    status: 'active',
  },
  {
    id: 'service-v1.0',
    typeId: 'service',
    version: 'v1.0',
    effectiveDate: '2024-01-01',
    status: 'archived',
  },
  {
    id: 'efinance-v2.0',
    typeId: 'efinance',
    version: 'v2.0',
    effectiveDate: '2027-02-01',
    status: 'scheduled',
  },
  {
    id: 'efinance-v1.1',
    typeId: 'efinance',
    version: 'v1.1',
    effectiveDate: '2025-02-01',
    status: 'active',
  },
  {
    id: 'efinance-v1.0',
    typeId: 'efinance',
    version: 'v1.0',
    effectiveDate: '2024-02-01',
    status: 'archived',
  },
  {
    id: 'marketing-v2.0',
    typeId: 'marketing',
    version: 'v2.0',
    effectiveDate: '2027-03-01',
    status: 'scheduled',
  },
  {
    id: 'marketing-v1.1',
    typeId: 'marketing',
    version: 'v1.1',
    effectiveDate: '2025-03-01',
    status: 'active',
  },
  {
    id: 'marketing-v1.0',
    typeId: 'marketing',
    version: 'v1.0',
    effectiveDate: '2024-03-01',
    status: 'archived',
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

const SELECT_ALL_LABEL_ID = 'terms-select-all-label';

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

/** 좌: 약관 종류 레일 / 우: 툴바 + 버전 이력 표 */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const railHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const railListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const railButtonStyle = (active: boolean): CSSProperties => ({
  display: 'block',
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
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  textAlign: 'left',
  cursor: 'pointer',
  ...typography('typography.label.md'),
});

const railNoticeStyle: CSSProperties = {
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

interface TermsScreenProps {
  /** 최초 로드 — 표 스켈레톤 */
  readonly loading?: boolean;
  /** 조회 실패 — 인라인 Alert 로 갈린다 */
  readonly failed?: boolean;
  readonly initialTypeId?: string;
  readonly initialKeyword?: string;
  readonly initialSelectedIds?: readonly string[];
}

function TermsScreen({
  loading = false,
  failed = false,
  initialTypeId = FIRST_TYPE_ID,
  initialKeyword = '',
  initialSelectedIds = [],
}: TermsScreenProps) {
  const [versions, setVersions] = useState<readonly DemoTermsVersion[]>(DEMO_VERSIONS);
  const [typeId, setTypeId] = useState(initialTypeId);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoTermsVersion | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return versions.filter((version) => {
      if (version.typeId !== typeId) return false;
      if (kw === '') return true;
      return version.version.toLowerCase().includes(kw);
    });
  }, [versions, typeId, keyword]);

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

  const rows: TableProps['rows'] = visible.map((version, index) => ({
    id: version.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 약관 버전 상세(/content/terms/:id)에서 전문을 본다 */
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
            /* 실화면: 연필 → 약관 버전 수정 폼(/content/terms/:id/edit) */
          }}
          onDelete={() => setConfirming(version)}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>약관 관리</h1>

      <div style={layoutStyle}>
        <Panel
          notice={
            <>
              <p style={railNoticeStyle}>
                약관은 종류마다 버전 이력을 따로 가져요. 시행 중인 버전은 목록에서 &apos;현재&apos;
                배지로 표시돼요.
              </p>
              <p style={railNoticeStyle}>
                전문은 버전 행을 눌러 상세에서 봐요 — 목록은 이력만 보여줘요.
              </p>
            </>
          }
        >
          <nav aria-label="약관 종류">
            <p style={railHeadingStyle}>약관 종류</p>
            <ul style={railListStyle}>
              {TERMS_TYPES.map((type) => {
                const active = type.id === typeId;
                return (
                  <li key={type.id}>
                    <button
                      type="button"
                      style={railButtonStyle(active)}
                      aria-pressed={active}
                      onClick={() => {
                        setTypeId(type.id);
                        setSelectedIds(new Set());
                      }}
                    >
                      {type.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Panel>

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                label="약관 버전 검색"
                placeholder="버전 검색 (예: v1.1)"
                value={keyword}
                onChange={setKeyword}
              />
            </span>
            <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
              새 버전 등록
            </Button>
          </div>

          {failed ? (
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>약관을 불러오지 못했어요.</span>
                <Button variant="secondary">다시 시도</Button>
              </div>
            </Alert>
          ) : (
            <>
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
                caption="약관 버전 이력 — 체크박스로 선택하고, 행을 누르면 전문을 봐요. 수정/삭제 버튼으로 각 버전을 관리해요."
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
                  <th
                    key="actions-head"
                    scope="col"
                    className="tds-table__head tds-table__head--end"
                  >
                    <span style={visuallyHidden}>행 액션</span>
                  </th>,
                ]}
                loading={loading}
                skeletonRows={3}
                empty={
                  <EmptyState
                    label="버전"
                    hasQuery={keyword.trim() !== ''}
                    onClearSearch={() => setKeyword('')}
                  />
                }
              />
            </>
          )}
        </div>
      </div>

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="약관 버전 삭제"
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
          title="약관 버전 일괄 삭제"
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

/** 정상: 이용약관의 버전 이력 3건(시행예정 · 시행중'현재' · 만료) */
export const Default: Story = {
  render: () => <TermsScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <TermsScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <TermsScreen initialKeyword="v9.9" />,
};

/** 선택됨: 만료 버전 2건 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <TermsScreen initialSelectedIds={['service-v1.0', 'service-v2.0']} />,
};

/** 에러: 버전 이력 조회 실패 — 인라인 Alert(danger) + 다시 시도(좌측 종류 레일은 남는다) */
export const Error: Story = {
  render: () => <TermsScreen failed />,
};
