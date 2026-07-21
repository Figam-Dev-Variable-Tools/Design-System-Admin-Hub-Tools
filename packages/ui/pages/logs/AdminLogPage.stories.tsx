/**
 * Design System/Templates/Logs/Admin Log — 관리자 로그 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/logs/admin` → 메뉴 en = "Logs"(로그 관리), 화면 en = "Admin Log"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Logs 그룹의 관리자 로그 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/logs/admin/AdminLogPage.tsx (라우트 /logs/admin) 와
 * 4화면이 공유하는 LogListShell·LogFilterPanel·LogToolbar·LogTable(components/*).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각(FilterRail/FilterPanel·
 * LogTable 등)은 DS 표면으로 갈음한다: 좌측 필터 레일 → Panel + SelectField, 목록 표 → Table.
 *
 * [읽기 전용 감사 로그] 등록 버튼·행 ⋯ 메뉴·체크박스가 없다 — 감사 기록은 불변이다. 이 화면이 하는
 * 일은 조회·필터·검색·정렬·상세 열람·내보내기 여섯뿐이다 (실화면 logs/types.ts 참조).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 필터 레일 + 보존기간 안내 → Panel (notice = 보존기간)
 *   결과·액션 필터 축            → SelectField ×2 (실화면은 FilterPanel 의 pressable 목록)
 *   기간 프리셋 / 직접 지정       → SelectField + DateRangeField (custom 일 때만)
 *   검색 입력(돋보기 겹침)        → SearchField
 *   페이지당 행 수               → SelectField
 *   내보내기 버튼                → Button(secondary) + Icon(download)
 *   목록 표(6열, 정렬 헤더)       → Table (occurredAt 기본 정렬 desc)
 *   실패 행 강조                 → Table row tone='danger' (+ 셀 안 ✕ 아이콘·글자 이중 인코딩)
 *   빈 결과                     → Empty (createVerb='기록')
 *   조회 실패 인라인 배너         → Alert(danger)
 *   페이지네이션(범위+번호)       → Pagination + rangeTextOf
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  DateRangeField,
  Empty as EmptyState,
  Icon,
  Panel,
  Pagination,
  SearchField,
  SelectField,
  Table,
  cssVar,
  rangeTextOf,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Logs/Admin Log',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 admin/types.ts 의 AdminLogEntry 를 화면이 쓰는 필드만 축약해 흉내) ───────── */

type AdminAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'permission';
type Outcome = 'success' | 'failure';

/** 액션 라벨 — 실화면 ADMIN_ACTION_LABEL 미러 */
const ACTION_LABEL: Record<AdminAction, string> = {
  login: '로그인',
  logout: '로그아웃',
  create: '등록',
  update: '수정',
  delete: '삭제',
  export: '내보내기',
  permission: '권한 변경',
};

interface AdminLogRow {
  readonly id: string;
  readonly occurredAt: string;
  readonly actorAccount: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly action: AdminAction;
  readonly targetType: string;
  readonly targetLabel: string;
  readonly outcome: Outcome;
  readonly failureReason: string | null;
  readonly ip: string;
}

const DEMO_ROWS: readonly AdminLogRow[] = [
  {
    id: 'a-1',
    occurredAt: '2026-07-21 14:32:08',
    actorAccount: 'sohee@example.com',
    actorName: '한**',
    actorRole: '운영자',
    action: 'permission',
    targetType: '역할',
    targetLabel: 'user1042@example.com',
    outcome: 'success',
    failureReason: null,
    ip: '211.234.11.9',
  },
  {
    id: 'a-2',
    occurredAt: '2026-07-21 14:05:51',
    actorAccount: 'jaemin@example.com',
    actorName: '신**',
    actorRole: '매니저',
    action: 'update',
    targetType: '회원',
    targetLabel: 'buyer0197@example.com',
    outcome: 'success',
    failureReason: null,
    ip: '58.29.140.77',
  },
  {
    id: 'a-3',
    occurredAt: '2026-07-21 13:47:22',
    actorAccount: 'minji@example.com',
    actorName: '박**',
    actorRole: '운영자',
    action: 'login',
    targetType: '세션',
    targetLabel: '관리자 콘솔',
    outcome: 'failure',
    failureReason: '2차 인증 실패',
    ip: '104.28.5.130',
  },
  {
    id: 'a-4',
    occurredAt: '2026-07-21 11:19:03',
    actorAccount: 'woosung@example.com',
    actorName: '정**',
    actorRole: '매니저',
    action: 'delete',
    targetType: '공지사항',
    targetLabel: '7월 정기점검 안내',
    outcome: 'success',
    failureReason: null,
    ip: '211.234.11.40',
  },
  {
    id: 'a-5',
    occurredAt: '2026-07-21 10:58:44',
    actorAccount: 'dohyun@example.com',
    actorName: '임**',
    actorRole: '운영자',
    action: 'export',
    targetType: '회원 목록',
    targetLabel: '회원 전체 CSV',
    outcome: 'success',
    failureReason: null,
    ip: '58.29.140.12',
  },
  {
    id: 'a-6',
    occurredAt: '2026-07-21 09:41:17',
    actorAccount: 'areum@example.com',
    actorName: '윤**',
    actorRole: '매니저',
    action: 'create',
    targetType: '쿠폰',
    targetLabel: '여름 특가 10% 쿠폰',
    outcome: 'success',
    failureReason: null,
    ip: '104.28.5.201',
  },
  {
    id: 'a-7',
    occurredAt: '2026-07-20 18:22:35',
    actorAccount: 'sehoon@example.com',
    actorName: '오**',
    actorRole: '운영자',
    action: 'permission',
    targetType: '역할',
    targetLabel: 'staff0021@example.com',
    outcome: 'failure',
    failureReason: '권한 범위 초과',
    ip: '211.234.11.9',
  },
  {
    id: 'a-8',
    occurredAt: '2026-07-20 17:03:59',
    actorAccount: 'suji@example.com',
    actorName: '배**',
    actorRole: '매니저',
    action: 'logout',
    targetType: '세션',
    targetLabel: '관리자 콘솔',
    outcome: 'success',
    failureReason: null,
    ip: '58.29.140.77',
  },
];

/* ── 필터 축 선택지 — 실화면 ADMIN_LOG_AXES 미러 ───────────────────────────────────────────── */

const OUTCOME_OPTIONS: readonly { readonly value: Outcome | 'all'; readonly label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'success', label: '성공' },
  { value: 'failure', label: '실패' },
];

const ACTION_OPTIONS: readonly { readonly value: AdminAction | 'all'; readonly label: string }[] = [
  { value: 'all', label: '전체' },
  ...(Object.keys(ACTION_LABEL) as AdminAction[]).map((action) => ({
    value: action,
    label: ACTION_LABEL[action],
  })),
];

const PERIOD_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'last-7d', label: '최근 7일' },
  { value: 'last-30d', label: '최근 30일' },
  { value: 'custom', label: '직접 지정' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** 보존기간 — 실화면 ADMIN_LOG_RETENTION 미러(관리자 로그는 가장 오래 남는다) */
const RETENTION = {
  label: '3년',
  basis: '내부 통제·감사 대응 기록. 보존기간이 지나면 자동 폐기됩니다.',
} as const;

/* ── 표 열 정의(실화면 admin/AdminLogPage COLUMNS 6열 미러) ──────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'occurredAt', header: '시각', nowrap: true, sortable: true },
  { id: 'actor', header: '행위자', nowrap: true },
  { id: 'action', header: '액션', nowrap: true },
  { id: 'target', header: '대상' },
  { id: 'outcome', header: '결과', nowrap: true },
  { id: 'ip', header: 'IP', nowrap: true },
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

const headingStyle: CSSProperties = { ...typography('typography.title.lg'), margin: 0 };

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

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const toolbarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: cssVar('space.2'),
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

const filterStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const hintStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const highlightStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  margin: 0,
};

const retentionStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  margin: 0,
};

const noticeHintStyle: CSSProperties = { ...hintStyle };

const tableWrapStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 };

const mutedStyle: CSSProperties = { color: cssVar('color.text.muted') };

const outcomeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const failureStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 셀 조각(실화면 components/cells.tsx 의 StackCell·OutcomeCell 을 DS 토큰으로 재현) ────────── */

function Stack({
  primary,
  secondary,
}: {
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
}) {
  return (
    <span style={stackStyle}>
      <span>{primary}</span>
      <span style={mutedStyle}>{secondary}</span>
    </span>
  );
}

function Outcome({ failed, reason }: { readonly failed: boolean; readonly reason: string | null }) {
  if (!failed) return <span style={outcomeRowStyle}>성공</span>;
  return (
    <span style={outcomeRowStyle}>
      <span style={failureStyle}>
        <Icon name="x-circle" />
        실패
      </span>
      {reason !== null && reason !== '' ? <span style={mutedStyle}>{reason}</span> : null}
    </span>
  );
}

/** 실패 행만 붉게 — 색은 셀 안 아이콘·글자 위의 보강일 뿐이다(실화면 toneOf 미러) */
type RowTone = 'danger' | 'warning';
function toneOf(row: AdminLogRow): RowTone | undefined {
  return row.outcome === 'failure' ? 'danger' : undefined;
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface AdminLogScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
}

function AdminLogScreen({ loading = false, initialKeyword = '' }: AdminLogScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [outcome, setOutcome] = useState<Outcome | 'all'>('all');
  const [action, setAction] = useState<AdminAction | 'all'>('all');
  const [period, setPeriod] = useState<string>('last-30d');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const rows = DEMO_ROWS.filter((row) => {
      if (outcome !== 'all' && row.outcome !== outcome) return false;
      if (action !== 'all' && row.action !== action) return false;
      if (kw === '') return true;
      return (
        row.actorAccount.toLowerCase().includes(kw) ||
        row.actorName.toLowerCase().includes(kw) ||
        row.targetLabel.toLowerCase().includes(kw) ||
        row.ip.toLowerCase().includes(kw)
      );
    });
    // occurredAt 기본 정렬 — 감사 화면은 언제나 최신순(실화면 DEFAULT_SORT desc)
    return [...rows].sort((left, right) =>
      sortDir === 'desc'
        ? right.occurredAt.localeCompare(left.occurredAt)
        : left.occurredAt.localeCompare(right.occurredAt),
    );
  }, [keyword, outcome, action, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const permissionCount = filtered.filter((row) => row.action === 'permission').length;
  const failureCount = filtered.filter((row) => row.outcome === 'failure').length;
  const highlight =
    permissionCount > 0
      ? `이 기간의 권한 변경 ${permissionCount.toLocaleString('ko-KR')}건`
      : failureCount > 0
        ? `이 기간의 실패 ${failureCount.toLocaleString('ko-KR')}건`
        : null;

  const resetPage = (): void => setPage(1);

  const rows: TableProps['rows'] = pageRows.map((row) => {
    const tone = toneOf(row);
    return {
      id: row.id,
      onActivate: () => {
        /* 실화면: 행을 누르면 그 요청의 상세 페이로드 다이얼로그가 열린다 — 템플릿에서는 조작 없음 */
      },
      ...(tone === undefined ? {} : { tone }),
      cells: [
        row.occurredAt,
        <Stack primary={row.actorAccount} secondary={`${row.actorName} · ${row.actorRole}`} />,
        ACTION_LABEL[row.action],
        <Stack primary={row.targetLabel} secondary={row.targetType} />,
        <Outcome failed={row.outcome === 'failure'} reason={row.failureReason} />,
        row.ip,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>관리자 로그</h1>

      <div style={layoutStyle}>
        {/* 좌측 필터 레일 — 결과·액션 축 + 기간 + 보존기간 안내 */}
        <Panel
          notice={
            <>
              <p style={retentionStyle}>{`보존기간 ${RETENTION.label}`}</p>
              <p style={noticeHintStyle}>{RETENTION.basis}</p>
              <p style={noticeHintStyle}>
                이 기록은 감사 로그입니다. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
                제공합니다.
              </p>
              <p style={noticeHintStyle}>시각은 모두 한국 표준시(KST) 기준입니다.</p>
            </>
          }
        >
          <div style={filterStackStyle}>
            <div style={filterFieldStyle}>
              <label htmlFor="admin-log-outcome" style={filterLabelStyle}>
                결과
              </label>
              <SelectField
                id="admin-log-outcome"
                value={outcome}
                onChange={(event) => {
                  setOutcome(event.target.value as Outcome | 'all');
                  resetPage();
                }}
              >
                {OUTCOME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="admin-log-action" style={filterLabelStyle}>
                액션
              </label>
              <SelectField
                id="admin-log-action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value as AdminAction | 'all');
                  resetPage();
                }}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="admin-log-period" style={filterLabelStyle}>
                기간
              </label>
              <SelectField
                id="admin-log-period"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  resetPage();
                }}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            {period === 'custom' && (
              <DateRange from={draftFrom} to={draftTo} onFrom={setDraftFrom} onTo={setDraftTo} />
            )}
          </div>
        </Panel>

        <div style={mainColumnStyle}>
          {/* 툴바 — 검색(좌) + 페이지 크기 + 내보내기(우) */}
          <div style={toolbarStyle}>
            <div style={searchWrapStyle}>
              <SearchField
                label="행위자, 대상 또는 IP 검색"
                placeholder="행위자 · 대상 · IP 검색"
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  resetPage();
                }}
              />
            </div>

            <div style={toolbarActionsStyle}>
              <div style={filterFieldStyle}>
                <label htmlFor="admin-log-size" style={filterLabelStyle}>
                  페이지당 행 수
                </label>
                <SelectField
                  id="admin-log-size"
                  value={String(pageSize)}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as PageSize);
                    resetPage();
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={String(size)}>
                      {`${String(size)}줄씩`}
                    </option>
                  ))}
                </SelectField>
              </div>

              <Button variant="secondary" iconLeft={<Icon name="download" />}>
                내보내기
              </Button>
            </div>
          </div>

          <div style={summaryRowStyle}>
            <p style={hintStyle}>
              {loading ? '불러오는 중…' : rangeTextOf(total, safePage, pageSize)}
            </p>
            {!loading && highlight !== null && <p style={highlightStyle}>{highlight}</p>}
          </div>

          <div style={tableWrapStyle}>
            <Table
              caption="관리자 로그 — 행을 누르면 그 요청의 상세 페이로드가 열립니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다."
              columns={COLUMNS}
              rows={rows}
              sortKey="occurredAt"
              sortDirection={sortDir}
              onSortToggle={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              loading={loading}
              skeletonRows={pageSize}
              empty={
                <EmptyState
                  label="관리자 로그"
                  createVerb="기록"
                  hasQuery={keyword.trim() !== ''}
                  onClearSearch={() => setKeyword('')}
                />
              }
            />
          </div>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            label="관리자 로그 페이지"
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

/** 직접 지정 기간 입력 — 실화면 LogFilterPanel 의 custom 분기 미러 */
function DateRange({
  from,
  to,
  onFrom,
  onTo,
}: {
  readonly from: string;
  readonly to: string;
  readonly onFrom: (value: string) => void;
  readonly onTo: (value: string) => void;
}) {
  return (
    <div style={filterFieldStyle}>
      <DateRangeField
        label="조회 기간"
        startValue={from}
        endValue={to}
        onStartChange={onFrom}
        onEndChange={onTo}
        hint="한 번에 최대 90일까지 조회할 수 있습니다."
      />
    </div>
  );
}

/** 정상: 관리자 로그가 채워진 기본 상태(최신순 · 권한 변경/실패 강조) */
export const Default: Story = {
  render: () => <AdminLogScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <AdminLogScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구, createVerb='기록') */
export const Empty: Story = {
  render: () => <AdminLogScreen initialKeyword="존재하지 않는 행위자" />,
};

/** 조회 실패: 목록을 못 불러온 경우 — 인라인 Alert(danger) + 다시 시도(STATE-02) */
export const LoadError: Story = {
  render: () => (
    <div style={pageStyle}>
      <h1 style={headingStyle}>관리자 로그</h1>
      <Alert tone="danger">
        <div style={errorBodyStyle}>
          <span>관리자 로그를 불러오지 못했습니다.</span>
          <Button variant="secondary">다시 시도</Button>
        </div>
      </Alert>
    </div>
  ),
};
