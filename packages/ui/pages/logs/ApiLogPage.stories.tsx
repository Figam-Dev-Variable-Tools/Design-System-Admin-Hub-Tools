/**
 * Design System/Templates/Logs/API Log — API 로그 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/logs/api` → 메뉴 en = "Logs"(로그 관리), 화면 en = "API Log"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Logs 그룹의 API 로그 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/logs/api/ApiLogPage.tsx (라우트 /logs/api) 와
 * 4화면이 공유하는 LogListShell·LogFilterPanel·LogToolbar·LogTable(components/*).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다.
 *
 * [읽기 전용 감사 로그] 등록·행 ⋯ 메뉴·체크박스가 없다 — 조회·필터·검색·정렬·상세·내보내기뿐이다.
 *
 * [숫자 컬럼] 응답시간(ms)은 우측 정렬(Table align='end' → tabular-nums). 단위(ms)는 값이 아니라
 * 헤더로 올린다 — 값마다 'ms' 가 따라다니면 자릿수 정렬이 깨진다(실화면 ERP-04/ERP-07 미러).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 필터 레일 + 보존기간 안내 → Panel (notice = 보존기간)
 *   상태·메서드 필터 축           → SelectField ×2
 *   기간 프리셋 / 직접 지정        → SelectField + DateRangeField
 *   검색 입력                     → SearchField
 *   페이지당 행 수 / 내보내기       → SelectField + Button(secondary)
 *   목록 표(6열, 정렬 헤더)        → Table (occurredAt·durationMs 정렬 가능)
 *   5xx/4xx·느린 호출 강조         → Table row tone + 셀 안 계열 이름·'느림' 글자(이중 인코딩)
 *   빈 결과 / 조회 실패            → Empty / Alert(danger)
 *   페이지네이션                   → Pagination + rangeTextOf
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
  title: 'Design System/Templates/Logs/API Log',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 api/types.ts 의 ApiLogEntry 를 화면이 쓰는 필드만 축약해 흉내) ─────────── */

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type StatusClass = '2xx' | '4xx' | '5xx';

const SLOW_THRESHOLD_MS = 1000;

/** 상태 코드 → 계열(실화면 statusClassOf 미러). 3xx 는 이 API 에 없어 2xx 로 접는다 */
function statusClassOf(status: number): StatusClass {
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  return '2xx';
}

interface ApiLogRow {
  readonly id: string;
  readonly occurredAt: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
  readonly client: string;
  readonly clientIp: string;
}

const DEMO_ROWS: readonly ApiLogRow[] = [
  {
    id: 'p-1',
    occurredAt: '2026-07-21 14:32:08',
    method: 'GET',
    path: '/v1/products?category=chair',
    status: 200,
    durationMs: 128,
    client: '모바일 앱',
    clientIp: '58.29.140.77',
  },
  {
    id: 'p-2',
    occurredAt: '2026-07-21 14:31:55',
    method: 'POST',
    path: '/v1/orders',
    status: 500,
    durationMs: 2140,
    client: '파트너사 정산 배치',
    clientIp: '104.28.5.130',
  },
  {
    id: 'p-3',
    occurredAt: '2026-07-21 14:30:12',
    method: 'GET',
    path: '/v1/members/1042',
    status: 404,
    durationMs: 88,
    client: '모바일 앱',
    clientIp: '58.29.140.12',
  },
  {
    id: 'p-4',
    occurredAt: '2026-07-21 14:28:47',
    method: 'PATCH',
    path: '/v1/carts/9931',
    status: 200,
    durationMs: 342,
    client: '웹 프론트',
    clientIp: '211.234.11.9',
  },
  {
    id: 'p-5',
    occurredAt: '2026-07-21 14:27:03',
    method: 'GET',
    path: '/v1/stats/revenue',
    status: 200,
    durationMs: 1580,
    client: '리포트 대시보드',
    clientIp: '104.28.5.201',
  },
  {
    id: 'p-6',
    occurredAt: '2026-07-21 14:25:39',
    method: 'DELETE',
    path: '/v1/coupons/summer-10',
    status: 403,
    durationMs: 61,
    client: '파트너사 정산 배치',
    clientIp: '58.29.140.77',
  },
  {
    id: 'p-7',
    occurredAt: '2026-07-21 14:24:18',
    method: 'PUT',
    path: '/v1/inventory/sku-7781',
    status: 502,
    durationMs: 3010,
    client: '창고 연동',
    clientIp: '211.234.11.40',
  },
  {
    id: 'p-8',
    occurredAt: '2026-07-21 14:22:55',
    method: 'GET',
    path: '/v1/reviews?productId=331',
    status: 200,
    durationMs: 205,
    client: '웹 프론트',
    clientIp: '104.28.5.130',
  },
];

/* ── 필터 축 선택지 — 실화면 API_LOG_AXES 미러 ─────────────────────────────────────────────── */

const STATUS_OPTIONS: readonly { readonly value: StatusClass | 'all'; readonly label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '2xx', label: '성공 (2xx)' },
  { value: '4xx', label: '요청 오류 (4xx)' },
  { value: '5xx', label: '서버 오류 (5xx)' },
];

const METHOD_OPTIONS: readonly { readonly value: HttpMethod | 'all'; readonly label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

const PERIOD_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'last-7d', label: '최근 7일' },
  { value: 'last-30d', label: '최근 30일' },
  { value: 'custom', label: '직접 지정' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** 보존기간 — 실화면 API_LOG_RETENTION 미러(트래픽 부피가 커 가장 짧게 남긴다) */
const RETENTION = {
  label: '90일',
  basis: '트래픽 부피가 커 단기 보존해요. 보존기간이 지나면 자동 폐기돼요.',
} as const;

/* ── 표 열 정의(실화면 api/ApiLogPage COLUMNS 6열 미러) ──────────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'occurredAt', header: '시각', nowrap: true, sortable: true },
  { id: 'method', header: '메서드', nowrap: true },
  { id: 'path', header: '경로' },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'durationMs', header: '응답시간(ms)', align: 'end', sortable: true },
  { id: 'client', header: '클라이언트', nowrap: true },
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

const tableWrapStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 };

const mutedStyle: CSSProperties = { color: cssVar('color.text.muted') };

const dangerTextStyle: CSSProperties = {
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const warningTextStyle: CSSProperties = {
  color: cssVar('color.feedback.warning.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 셀 조각(실화면 api/ApiLogPage 의 StatusCell·DurationCell·StackCell 을 DS 토큰으로 재현) ──── */

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

/** 상태 코드 — 색만으로 전하지 않는다. 5xx/4xx 는 계열 이름을 글자로 함께 적는다 */
function StatusText({ status }: { readonly status: number }) {
  const kind = statusClassOf(status);
  if (kind === '2xx') return <span>{status}</span>;
  return (
    <span style={kind === '5xx' ? dangerTextStyle : warningTextStyle}>{`${status} ${kind}`}</span>
  );
}

/** 느린 호출은 숫자만으로 보이지 않는다 — 임계를 넘으면 글자가 스스로 말한다 */
function DurationText({ ms }: { readonly ms: number }) {
  const value = ms.toLocaleString('ko-KR');
  if (ms < SLOW_THRESHOLD_MS) return <span>{value}</span>;
  return <span style={warningTextStyle}>{`${value} 느림`}</span>;
}

/** 5xx 는 우리 잘못(danger), 4xx 는 부르는 쪽 잘못(warning) — 느린 호출은 warning(실화면 toneOf 미러) */
type RowTone = 'danger' | 'warning';
function toneOf(row: ApiLogRow): RowTone | undefined {
  const kind = statusClassOf(row.status);
  if (kind === '5xx') return 'danger';
  if (kind === '4xx') return 'warning';
  return row.durationMs >= SLOW_THRESHOLD_MS ? 'warning' : undefined;
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface ApiLogScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
}

function ApiLogScreen({ loading = false, initialKeyword = '' }: ApiLogScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<StatusClass | 'all'>('all');
  const [method, setMethod] = useState<HttpMethod | 'all'>('all');
  const [period, setPeriod] = useState<string>('last-30d');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<'occurredAt' | 'durationMs'>('occurredAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const rows = DEMO_ROWS.filter((row) => {
      if (status !== 'all' && statusClassOf(row.status) !== status) return false;
      if (method !== 'all' && row.method !== method) return false;
      if (kw === '') return true;
      return row.path.toLowerCase().includes(kw) || row.client.toLowerCase().includes(kw);
    });
    return [...rows].sort((left, right) => {
      const diff =
        sortKey === 'durationMs'
          ? left.durationMs - right.durationMs
          : left.occurredAt.localeCompare(right.occurredAt);
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [keyword, status, method, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const serverErrors = filtered.filter((row) => statusClassOf(row.status) === '5xx').length;
  const clientErrors = filtered.filter((row) => statusClassOf(row.status) === '4xx').length;
  const highlight =
    serverErrors > 0
      ? `이 기간의 서버 오류(5xx) ${serverErrors.toLocaleString('ko-KR')}건`
      : clientErrors > 0
        ? `이 기간의 요청 오류(4xx) ${clientErrors.toLocaleString('ko-KR')}건`
        : null;

  const resetPage = (): void => setPage(1);

  const onSortToggle = (columnId: string): void => {
    if (columnId !== 'occurredAt' && columnId !== 'durationMs') return;
    if (columnId === sortKey) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(columnId);
      setSortDir('desc');
    }
  };

  const rows: TableProps['rows'] = pageRows.map((row) => {
    const tone = toneOf(row);
    return {
      id: row.id,
      onActivate: () => {
        /* 실화면: 행을 누르면 그 호출의 요청·응답 다이얼로그가 열린다 — 템플릿에서는 조작 없음 */
      },
      ...(tone === undefined ? {} : { tone }),
      cells: [
        row.occurredAt,
        row.method,
        row.path,
        <StatusText key="status" status={row.status} />,
        <DurationText key="duration" ms={row.durationMs} />,
        <Stack key="client" primary={row.client} secondary={row.clientIp} />,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>API 로그</h1>

      <div style={layoutStyle}>
        <Panel
          notice={
            <>
              <p style={retentionStyle}>{`보존기간 ${RETENTION.label}`}</p>
              <p style={hintStyle}>{RETENTION.basis}</p>
              <p style={hintStyle}>
                이 기록은 감사 로그예요. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
                제공해요.
              </p>
              <p style={hintStyle}>시각은 모두 한국 표준시(KST) 기준이에요.</p>
            </>
          }
        >
          <div style={filterStackStyle}>
            <div style={filterFieldStyle}>
              <label htmlFor="api-log-status" style={filterLabelStyle}>
                상태
              </label>
              <SelectField
                id="api-log-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as StatusClass | 'all');
                  resetPage();
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="api-log-method" style={filterLabelStyle}>
                메서드
              </label>
              <SelectField
                id="api-log-method"
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value as HttpMethod | 'all');
                  resetPage();
                }}
              >
                {METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="api-log-period" style={filterLabelStyle}>
                기간
              </label>
              <SelectField
                id="api-log-period"
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
              <div style={filterFieldStyle}>
                <DateRangeField
                  label="조회 기간"
                  startValue={draftFrom}
                  endValue={draftTo}
                  onStartChange={setDraftFrom}
                  onEndChange={setDraftTo}
                  hint="한 번에 최대 90일까지 조회할 수 있어요."
                />
              </div>
            )}
          </div>
        </Panel>

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <div style={searchWrapStyle}>
              <SearchField
                label="경로, 클라이언트 또는 요청 ID 검색"
                placeholder="경로 · 클라이언트 · 요청 ID 검색"
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  resetPage();
                }}
              />
            </div>

            <div style={toolbarActionsStyle}>
              <div style={filterFieldStyle}>
                <label htmlFor="api-log-size" style={filterLabelStyle}>
                  페이지당 행 수
                </label>
                <SelectField
                  id="api-log-size"
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
              caption="API 로그 — 행을 누르면 그 호출의 요청·응답이 열려요. 이 목록은 읽기 전용이며 수정·삭제할 수 없어요."
              columns={COLUMNS}
              rows={rows}
              sortKey={sortKey}
              sortDirection={sortDir}
              onSortToggle={onSortToggle}
              loading={loading}
              skeletonRows={pageSize}
              empty={
                <EmptyState
                  label="API 로그"
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
            label="API 로그 페이지"
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

/** 정상: API 로그가 채워진 기본 상태(최신순 · 5xx/4xx·느린 호출 강조) */
export const Default: Story = {
  render: () => <ApiLogScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) */
export const Loading: Story = {
  render: () => <ApiLogScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ApiLogScreen initialKeyword="/v9/존재하지-않는-경로" />,
};

/** 조회 실패: 인라인 Alert(danger) + 다시 시도(STATE-02) */
export const LoadError: Story = {
  render: () => (
    <div style={pageStyle}>
      <h1 style={headingStyle}>API 로그</h1>
      <Alert tone="danger">
        <div style={errorBodyStyle}>
          <span>API 로그를 불러오지 못했어요.</span>
          <Button variant="secondary">다시 시도</Button>
        </div>
      </Alert>
    </div>
  ),
};
