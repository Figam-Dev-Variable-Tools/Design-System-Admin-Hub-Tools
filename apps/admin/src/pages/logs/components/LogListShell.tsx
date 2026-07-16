// 로그 목록 화면의 셸 — 4화면이 이 한 벌을 공유한다 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 소유하는가] 목록 화면의 '같은 것' 전부:
//   URL 상태(IA-13) · IME 검색(COMP-10) · 정렬(ERP-04) · 페이지네이션+범위(ERP-05/STATE-04) ·
//   빈 상태 3분기(STATE-05) · 조회 실패 인라인 배너(STATE-02) · 권한 게이팅(EXC-03) ·
//   내보내기(ERP-12)+취소(EXC-09) · 상세 페이로드(민감정보 마스킹).
// 화면이 주는 것은 LogScreenSpec 하나뿐이다 — '다른 것'만 적는다.
//
// [배치는 로그인 이력과 같다] 좌: 필터 / 우: 툴바 + 요약 + 표 + 페이지네이션 (IA-04).
// 새 패턴을 발명하지 않는다 — 운영자가 이미 아는 화면이어야 한다.
//
// [실패는 조용히 삼키지 않는다 — shared/ui/README.md 의 기준 "사라져도 되는가"]
//   - 목록 **조회** 실패 → **인라인 배너**. 화면이 비어 있고 할 일이 '다시 시도' 하나뿐이다.
//     토스트가 사라지면 빈 화면만 남고, 감사 로그가 **비어 있는 것**과 **못 불러온 것**이
//     구분되지 않는다 — 감사에서 그 둘을 헷갈리는 것은 치명적이다.
//   - **내보내기**(사용자가 방금 시작한 작업)의 성공/실패 → 토스트 (실패엔 '다시 시도'가 붙는다)
//   - 기간 직접 지정의 입력 오류 → **그 입력 칸 옆 인라인** (zod — validation.ts)
//   - **취소는 실패가 아니다** → 아무 토스트도 띄우지 않는다 (EXC-09)
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import { downloadCsv } from '../../../shared/download';
import { formatNumber } from '../../../shared/format';
import { usePermissions } from '../../../shared/permissions/PermissionProvider';
import { navPageResourceId } from '../../../shared/permissions/resources';
import { Alert, Button, hintStyle, Pagination, useToast } from '../../../shared/ui';
import '../logs.css';
import { withObjectParticle } from '../josa';
import { useLogListState, useSearchInput } from '../list-state';
import { presetRange } from '../period';
import { useLogExport, useLogQuery } from '../queries';
import { kstToday } from '../time';
import type { DateRange, LogEntryBase, LogQuery, LogScreenSpec, PeriodId } from '../types';
import { validateCustomRange } from '../validation';
import type { RangeIssue } from '../validation';
import { LogFilterPanel } from './LogFilterPanel';
import { LogPayloadDialog } from './LogPayloadDialog';
import { LogTable } from './LogTable';
import { LogToolbar } from './LogToolbar';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 필터는 고정 폭, 표는 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
  gap: 'var(--tds-space-6)',
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/** 경고 요약 — 실패는 실패로 보인다 (성공 톤으로 섞지 않는다) */
const highlightStyle: CSSProperties = {
  ...hintStyle,
  color: 'var(--tds-color-feedback-danger-text)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

/**
 * 표 카드의 가로 스크롤 (IA-14 · ERP-15).
 * 컬럼이 8개 넘는 표가 있어 좁은 화면에서 넘친다 — **페이지 그리드를 밀지 않고** 이 안에서 스크롤한다.
 */
const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/**
 * 권한 없음 (EXC-03).
 *
 * **로그는 민감하다.** 사이드바에서 메뉴를 숨기는 것만으로는 부족하다 — 링크를 아는 사람은
 * 주소창에 그대로 칠 수 있고, 그러면 숨긴 화면이 통째로 렌더된다. 그래서 화면 자신이 묻는다.
 * 조회 권한이 없으면 **조회 자체를 걸지 않는다**(useLogQuery 의 enabled) — 권한 없는 화면이
 * 데이터를 받아 놓고 안 보여주는 것은 게이팅이 아니다.
 */
const deniedTitleStyle: CSSProperties = {
  margin: 0,
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const deniedBodyStyle: CSSProperties = { margin: 0 };

function AccessDenied({ label }: { readonly label: string }) {
  return (
    <Alert tone="danger">
      <div>
        <p style={deniedTitleStyle}>접근 권한이 없습니다.</p>
        <p style={deniedBodyStyle}>
          {`${withObjectParticle(label)} 조회할 권한이 없습니다. 필요하다면 최상위 관리자에게 요청해 주세요.`}
        </p>
      </div>
    </Alert>
  );
}

/** 조회 구간 확정 — 프리셋은 코드가 만들고(틀릴 수 없다), 직접 지정만 검증을 거친다 */
function useResolvedRange(
  period: PeriodId,
  draft: { readonly from: string; readonly to: string },
): { readonly range: DateRange | null; readonly rangeIssues: readonly RangeIssue[] } {
  return useMemo(() => {
    if (period !== 'custom') return { range: presetRange(period), rangeIssues: [] };
    const validation = validateCustomRange(draft);
    return { range: validation.range, rangeIssues: validation.issues };
  }, [period, draft]);
}

export function LogListShell<E extends LogEntryBase>({
  spec,
}: {
  readonly spec: LogScreenSpec<E>;
}) {
  const toast = useToast();
  const { can } = usePermissions();

  const resourceId = navPageResourceId(spec.route);
  const canRead = can(resourceId, 'read');
  const canExport = can(resourceId, 'export');

  const sortableKeys = useMemo(() => Object.keys(spec.sortValues), [spec.sortValues]);
  const list = useLogListState(spec.axes, sortableKeys);
  const { state, setKeyword, setPage } = list;

  const search = useSearchInput(state.keyword, setKeyword);

  const [detailEntry, setDetailEntry] = useState<E | null>(null);

  /**
   * 기간 → 확정 구간. 유효하지 않으면 range 는 null 이고 — **조회하지 않는다.**
   * 빈 표를 보여주면 사용자는 *기록이 지워졌다*고 의심한다. 원인이 자기 입력임을 알려야 한다.
   */
  const { range, rangeIssues } = useResolvedRange(state.period, state.draft);

  // range 가 null(입력 오류)이면 쿼리 키를 만들 수 없다 — 조회 자체를 걸지 않는다.
  // 훅은 조건부로 부를 수 없으므로(Rules of Hooks) 안전한 구간을 넣고 enabled 로 끈다.
  const safeRange = range ?? presetRange('today');
  const query: LogQuery = useMemo(
    () => ({
      range: safeRange,
      axes: state.axes,
      keyword: state.keyword,
      sort: state.sort,
      page: state.page,
      pageSize: state.pageSize,
    }),
    [safeRange, state.axes, state.keyword, state.sort, state.page, state.pageSize],
  );

  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useLogQuery(spec.scope, query, spec.fetchPage, { enabled: canRead && range !== null });

  const exportLog = useLogExport(spec.fetchExport);
  const exporting = exportLog.isPending;
  const controllerRef = useRef<AbortController | null>(null);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  const highlight = data === undefined ? null : spec.highlightOf(data);

  // 다른 조건으로 좁혀 총 페이지가 줄면 현재 페이지가 범위를 벗어난다 — 마지막 페이지로 보정한다 (STATE-04)
  useEffect(() => {
    if (data === undefined) return;
    const pages = Math.max(1, Math.ceil(data.total / state.pageSize));
    if (state.page > pages) setPage(pages);
  }, [data, state.page, state.pageSize, setPage]);

  /** 내보내기 — 현재 필터/검색에 걸린 **전체**를 CSV 로 받는다 (현재 페이지가 아니다 — ERP-12) */
  const onExport = useCallback(() => {
    if (range === null) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    exportLog.mutate(
      { query, signal: controller.signal },
      {
        onSuccess: (all) => {
          downloadCsv(`${spec.csvBaseName}-${kstToday()}`, spec.toCsv(all));
          // 무엇을 받았는지 숨기지 않는다 — 현재 페이지가 아니라 '필터 전체'임을 명시한다 (ERP-12)
          toast.success(
            `${spec.entityLabel} ${formatNumber(all.length)}건을 CSV 로 내보냈습니다. (현재 필터 조건 전체)`,
          );
        },
        onError: (cause) => {
          // 취소는 사용자의 선택이지 실패가 아니다 (EXC-09) — 토스트를 띄우지 않는다
          if (isAbort(cause)) {
            exportLog.reset();
            return;
          }
          toast.error('내보내기에 실패했습니다. 잠시 후 다시 시도해 주세요.', { retry: onExport });
        },
      },
    );
  }, [range, query, exportLog, spec, toast]);

  const onCancelExport = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  if (!canRead) return <AccessDenied label={spec.entityLabel} />;

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <LogFilterPanel
          axes={spec.axes}
          axisValues={state.axes}
          axisCounts={data?.axisCounts ?? null}
          period={state.period}
          draft={state.draft}
          rangeIssues={rangeIssues}
          retention={spec.retention}
          onAxisChange={list.setAxis}
          onPeriodChange={list.setPeriod}
          onDraftChange={list.setDraft}
        />

        <div style={mainColumnStyle}>
          <LogToolbar
            search={search}
            searchLabel={spec.searchLabel}
            searchPlaceholder={spec.searchPlaceholder}
            pageSize={state.pageSize}
            onPageSizeChange={list.setPageSize}
            exporting={exporting}
            canExport={canExport}
            onExport={onExport}
            onCancelExport={onCancelExport}
          />

          {error === null ? (
            <>
              <div style={summaryRowStyle}>
                <p style={hintStyle}>
                  <SummaryText
                    range={range}
                    loading={loading}
                    total={total}
                    page={state.page}
                    pageSize={state.pageSize}
                    shown={entries.length}
                  />
                </p>
                {range !== null && !loading && highlight !== null && (
                  <p style={highlightStyle}>{highlight}</p>
                )}
              </div>

              <div style={tableWrapStyle}>
                <LogTable
                  caption={spec.caption}
                  entries={entries}
                  columns={spec.columns}
                  sortValues={spec.sortValues}
                  sort={state.sort}
                  loading={loading && data === undefined && range !== null}
                  skeletonRows={state.pageSize}
                  toneOf={spec.toneOf}
                  onOpen={setDetailEntry}
                  onToggleSort={list.toggleSort}
                  emptyLabel={spec.entityLabel}
                  hasQuery={list.hasQuery}
                  hasActiveFilters={list.hasActiveFilters}
                  onClearSearch={list.clearSearch}
                  onResetFilters={list.resetFilters}
                />
              </div>

              <Pagination
                page={state.page}
                totalPages={totalPages}
                onChange={setPage}
                label={`${spec.entityLabel} 페이지`}
              />
            </>
          ) : (
            // 조회 실패는 인라인이다 — 토스트로 띄우면 사라진 뒤 '기록이 없다'와 구분되지 않는다 (STATE-02)
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>{`${withObjectParticle(spec.entityLabel)} 불러오지 못했습니다.`}</span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  다시 시도
                </Button>
              </div>
            </Alert>
          )}
        </div>
      </div>

      {detailEntry !== null && (
        <LogPayloadDialog
          detail={spec.detailOf(detailEntry)}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}

/**
 * 요약 줄 — '전체 1,234건 중 21–40' (ERP-05).
 *
 * 한국 ERP 그리드는 **지금 몇 번째를 보고 있는가**를 기대한다. 번호만 있는 페이지네이션은
 * '이 페이지가 몇 건인지'를 답하지 않는다. (DS Pagination 은 아직 범위를 그리지 않는다 —
 * 그 승격은 보고서에 남긴다. 그때까지 목록이 자기 요약을 갖는다.)
 */
function SummaryText({
  range,
  loading,
  total,
  page,
  pageSize,
  shown,
}: {
  readonly range: DateRange | null;
  readonly loading: boolean;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly shown: number;
}) {
  if (range === null) return <>조회 기간을 확인해 주세요.</>;
  if (loading && total === 0) return <>불러오는 중…</>;
  if (total === 0) return <>전체 0건</>;

  const first = (page - 1) * pageSize + 1;
  const last = first + shown - 1;
  return <>{`전체 ${formatNumber(total)}건 중 ${formatNumber(first)}–${formatNumber(last)}`}</>;
}
