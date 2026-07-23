/**
 * Design System/Templates/Logs/Error Log — 오류 로그 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/logs/errors` → 메뉴 en = "Logs"(로그 관리), 화면 en = "Error Log"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Logs 그룹의 오류 로그 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/logs/errors/ErrorLogPage.tsx (라우트 /logs/errors) 와
 * 4화면이 공유하는 LogListShell·LogFilterPanel·LogToolbar·LogTable(components/*).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다.
 *
 * [행위자가 없다] 앞의 세 화면과 달리 '누가' 가 없다 — 아무도 하지 않았는데 일어난 일이다.
 * [해결 버튼이 없다] 이슈 트래커가 아니라 감사 로그다 — 일어난 일을 '해결됨' 으로 덧칠하지 않는다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 필터 레일 + 보존기간 안내 → Panel (notice = 보존기간)
 *   심각도·발생 위치 필터 축       → SelectField ×2
 *   기간 프리셋 / 직접 지정        → SelectField + DateRangeField
 *   검색 입력                     → SearchField
 *   페이지당 행 수 / 내보내기       → SelectField + Button(secondary)
 *   목록 표(5열, 정렬 헤더)        → Table (occurredAt·occurrences 정렬 가능)
 *   심각도 강조                   → 색 위의 글자('치명'/'오류'/'경고') + Table row tone(이중 인코딩)
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
  title: 'Design System/Templates/Logs/Error Log',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 errors/types.ts 의 ErrorLogEntry 를 화면이 쓰는 필드만 축약해 흉내) ──────── */

type ErrorSeverity = 'critical' | 'error' | 'warning';

/** 심각도 라벨 — 실화면 ERROR_SEVERITY_LABEL 미러 */
const SEVERITY_LABEL: Record<ErrorSeverity, string> = {
  critical: '치명',
  error: '오류',
  warning: '경고',
};

/** 발생 위치 — 실화면 ERROR_SOURCES 미러 */
const ERROR_SOURCES = [
  '결제 서비스',
  '주문 API',
  '알림 발송',
  '정산 배치',
  '이미지 업로드',
] as const;

interface ErrorLogRow {
  readonly id: string;
  readonly occurredAt: string;
  readonly severity: ErrorSeverity;
  readonly source: string;
  readonly code: string;
  readonly message: string;
  readonly occurrences: number;
}

const DEMO_ROWS: readonly ErrorLogRow[] = [
  {
    id: 'e-1',
    occurredAt: '2026-07-21 14:31:55',
    severity: 'critical',
    source: '결제 서비스',
    code: 'PAYMENT_GATEWAY_TIMEOUT',
    message: '결제 게이트웨이 응답 시간 초과',
    occurrences: 340,
  },
  {
    id: 'e-2',
    occurredAt: '2026-07-21 14:24:18',
    severity: 'error',
    source: '주문 API',
    code: 'ORDER_STOCK_MISMATCH',
    message: '재고 수량과 주문 수량이 일치하지 않음',
    occurrences: 27,
  },
  {
    id: 'e-3',
    occurredAt: '2026-07-21 13:58:02',
    severity: 'warning',
    source: '알림 발송',
    code: 'PUSH_TOKEN_EXPIRED',
    message: '만료된 푸시 토큰으로 발송 시도',
    occurrences: 112,
  },
  {
    id: 'e-4',
    occurredAt: '2026-07-21 13:40:47',
    severity: 'error',
    source: '이미지 업로드',
    code: 'IMAGE_TOO_LARGE',
    message: '허용 용량(10MB)을 초과한 이미지',
    occurrences: 9,
  },
  {
    id: 'e-5',
    occurredAt: '2026-07-21 12:11:30',
    severity: 'critical',
    source: '정산 배치',
    code: 'SETTLEMENT_DB_DEADLOCK',
    message: '정산 배치 트랜잭션 교착 상태',
    occurrences: 3,
  },
  {
    id: 'e-6',
    occurredAt: '2026-07-21 11:05:19',
    severity: 'warning',
    source: '주문 API',
    code: 'SLOW_QUERY_DETECTED',
    message: '주문 조회 쿼리 3초 초과',
    occurrences: 58,
  },
  {
    id: 'e-7',
    occurredAt: '2026-07-21 09:47:03',
    severity: 'error',
    source: '결제 서비스',
    code: 'REFUND_ALREADY_PROCESSED',
    message: '이미 처리된 환불에 재요청',
    occurrences: 14,
  },
  {
    id: 'e-8',
    occurredAt: '2026-07-20 22:33:41',
    severity: 'warning',
    source: '알림 발송',
    code: 'EMAIL_BOUNCED',
    message: '수신 거부 주소로 이메일 반송',
    occurrences: 71,
  },
];

/* ── 필터 축 선택지 — 실화면 ERROR_LOG_AXES 미러 ───────────────────────────────────────────── */

const SEVERITY_OPTIONS: readonly {
  readonly value: ErrorSeverity | 'all';
  readonly label: string;
}[] = [
  { value: 'all', label: '전체' },
  { value: 'critical', label: '치명' },
  { value: 'error', label: '오류' },
  { value: 'warning', label: '경고' },
];

const SOURCE_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'all', label: '전체' },
  ...ERROR_SOURCES.map((source) => ({ value: source, label: source })),
];

const PERIOD_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'last-7d', label: '최근 7일' },
  { value: 'last-30d', label: '최근 30일' },
  { value: 'custom', label: '직접 지정' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** 보존기간 — 실화면 ERROR_LOG_RETENTION 미러(재발 추적에 필요한 기간) */
const RETENTION = {
  label: '180일',
  basis: '재발 추적에 필요한 기간. 보존기간이 지나면 자동 폐기돼요.',
} as const;

/* ── 표 열 정의(실화면 errors/ErrorLogPage COLUMNS 5열 미러) ─────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'occurredAt', header: '시각', nowrap: true, sortable: true },
  { id: 'severity', header: '심각도', nowrap: true },
  { id: 'code', header: '오류' },
  { id: 'source', header: '발생 위치', nowrap: true },
  { id: 'occurrences', header: '발생 횟수', align: 'end', sortable: true },
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

/* ── 셀 조각(실화면 errors/ErrorLogPage 의 SeverityCell·StackCell 을 DS 토큰으로 재현) ─────────── */

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

/** 심각도 — 색 위에 글자가 있다. 색을 못 봐도 '치명' 은 치명으로 읽힌다 */
function SeverityText({ severity }: { readonly severity: ErrorSeverity }) {
  return (
    <span style={severity === 'warning' ? warningTextStyle : dangerTextStyle}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/** 경고는 warning, 치명·오류는 danger(실화면 toneOf 미러) */
type RowTone = 'danger' | 'warning';
function toneOf(row: ErrorLogRow): RowTone {
  return row.severity === 'warning' ? 'warning' : 'danger';
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface ErrorLogScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
}

function ErrorLogScreen({ loading = false, initialKeyword = '' }: ErrorLogScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [severity, setSeverity] = useState<ErrorSeverity | 'all'>('all');
  const [source, setSource] = useState<string>('all');
  const [period, setPeriod] = useState<string>('last-30d');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<'occurredAt' | 'occurrences'>('occurredAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const rows = DEMO_ROWS.filter((row) => {
      if (severity !== 'all' && row.severity !== severity) return false;
      if (source !== 'all' && row.source !== source) return false;
      if (kw === '') return true;
      return row.code.toLowerCase().includes(kw) || row.message.toLowerCase().includes(kw);
    });
    return [...rows].sort((left, right) => {
      const diff =
        sortKey === 'occurrences'
          ? left.occurrences - right.occurrences
          : left.occurredAt.localeCompare(right.occurredAt);
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [keyword, severity, source, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const criticalCount = filtered.filter((row) => row.severity === 'critical').length;
  const errorCount = filtered.filter((row) => row.severity === 'error').length;
  const highlight =
    criticalCount > 0
      ? `이 기간의 치명 오류 ${criticalCount.toLocaleString('ko-KR')}건`
      : errorCount > 0
        ? `이 기간의 오류 ${errorCount.toLocaleString('ko-KR')}건`
        : null;

  const resetPage = (): void => setPage(1);

  const onSortToggle = (columnId: string): void => {
    if (columnId !== 'occurredAt' && columnId !== 'occurrences') return;
    if (columnId === sortKey) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(columnId);
      setSortDir('desc');
    }
  };

  const rows: TableProps['rows'] = pageRows.map((row) => ({
    id: row.id,
    onActivate: () => {
      /* 실화면: 행을 누르면 스택·컨텍스트 다이얼로그가 열린다 — 템플릿에서는 조작 없음 */
    },
    tone: toneOf(row),
    cells: [
      row.occurredAt,
      <SeverityText key="severity" severity={row.severity} />,
      <Stack key="code" primary={row.code} secondary={row.message} />,
      row.source,
      row.occurrences.toLocaleString('ko-KR'),
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>오류 로그</h1>

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
              <label htmlFor="error-log-severity" style={filterLabelStyle}>
                심각도
              </label>
              <SelectField
                id="error-log-severity"
                value={severity}
                onChange={(event) => {
                  setSeverity(event.target.value as ErrorSeverity | 'all');
                  resetPage();
                }}
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="error-log-source" style={filterLabelStyle}>
                발생 위치
              </label>
              <SelectField
                id="error-log-source"
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  resetPage();
                }}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="error-log-period" style={filterLabelStyle}>
                기간
              </label>
              <SelectField
                id="error-log-period"
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
                label="오류 코드, 메시지 또는 추적 ID 검색"
                placeholder="코드 · 메시지 · 추적 ID 검색"
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  resetPage();
                }}
              />
            </div>

            <div style={toolbarActionsStyle}>
              <div style={filterFieldStyle}>
                <label htmlFor="error-log-size" style={filterLabelStyle}>
                  페이지당 행 수
                </label>
                <SelectField
                  id="error-log-size"
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
              caption="오류 로그 — 행을 누르면 스택과 컨텍스트가 열려요. 이 목록은 읽기 전용이며 수정·삭제할 수 없어요."
              columns={COLUMNS}
              rows={rows}
              sortKey={sortKey}
              sortDirection={sortDir}
              onSortToggle={onSortToggle}
              loading={loading}
              skeletonRows={pageSize}
              empty={
                <EmptyState
                  label="오류 로그"
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
            label="오류 로그 페이지"
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

/** 정상: 오류 로그가 채워진 기본 상태(최신순 · 치명/오류 강조) */
export const Default: Story = {
  render: () => <ErrorLogScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) */
export const Loading: Story = {
  render: () => <ErrorLogScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ErrorLogScreen initialKeyword="NONEXISTENT_ERROR_CODE" />,
};

/** 조회 실패: 인라인 Alert(danger) + 다시 시도(STATE-02) */
export const LoadError: Story = {
  render: () => (
    <div style={pageStyle}>
      <h1 style={headingStyle}>오류 로그</h1>
      <Alert tone="danger">
        <div style={errorBodyStyle}>
          <span>오류 로그를 불러오지 못했어요.</span>
          <Button variant="secondary">다시 시도</Button>
        </div>
      </Alert>
    </div>
  ),
};
