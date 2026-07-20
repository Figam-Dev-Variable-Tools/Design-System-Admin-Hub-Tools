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
import { formatDate, formatNumber, objectParticle } from '../../../shared/format';
import { useRouteCan } from '../../../shared/permissions/RequirePermission';
import { Alert, Button, hintStyle, Pagination, rangeTextOf, useToast } from '../../../shared/ui';
import { useDebouncedSearch } from '../../../shared/crud';
import '../logs.css';
import { useLogListState } from '../list-state';
import { presetRange } from '../period';
import { useLogExport, useLogQuery } from '../queries';
import type { DateRange, LogEntryBase, LogQuery, LogScreenSpec, PeriodId } from '../types';
import { validateCustomRange } from '../validation';
import type { RangeIssue } from '../validation';
import { LogFilterPanel } from './LogFilterPanel';
import { LogPayloadDialog } from './LogPayloadDialog';
import { LogTable } from './LogTable';
import { LogToolbar } from './LogToolbar';
import { cssVar } from '@tds/ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 필터는 고정 폭, 표는 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 경고 요약 — 실패는 실패로 보인다 (성공 톤으로 섞지 않는다) */
const highlightStyle: CSSProperties = {
  ...hintStyle,
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
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
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

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
  // EXC-03 (write) — 내보내기 버튼의 게이팅. read 게이팅은 이 화면의 일이 아니다:
  // AppShell 이 <Outlet> 을 RequirePermission 으로 감싸 모든 라우트를 한 번에 덮는다.
  const canExport = useRouteCan('export');

  const sortableKeys = useMemo(() => Object.keys(spec.sortValues), [spec.sortValues]);
  const list = useLogListState(spec.axes, sortableKeys);
  const { state, setKeyword, setPage } = list;

  // COMP-10 — 조합 판정·디바운스는 공유 훅이 소유한다 (이 섹션의 사본은 수렴됐다).
  const search = useDebouncedSearch({ initial: state.keyword, onCommit: setKeyword });

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
  } = useLogQuery(spec.scope, query, spec.fetchPage, { enabled: range !== null });

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
          // 파일명의 날짜도 서울 기준이다 — 화면이 KST 로 보여준 것을 KST 로 저장한다
          downloadCsv(`${spec.csvBaseName}-${formatDate(new Date())}`, spec.toCsv(all));
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
                <span>{`${spec.entityLabel}${objectParticle(spec.entityLabel)} 불러오지 못했습니다.`}</span>
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
 * '이 페이지가 몇 건인지'를 답하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [산술은 DS 의 것을 쓴다 — 그리는 것만 여기서 한다]
 *
 * 이 자리는 범위 말고도 '조회 기간을 확인해 주세요.'·'불러오는 중…' 을 말해야 한다. DS
 * Pagination 컴포넌트는 그 두 상태를 표현할 수 없으므로 통째로 얹지 못한다. 그렇다고 산술을
 * 여기 한 벌 더 적으면 수식이 갈라진다 — **실제로 갈라져 있었다**: 이 사본은 clamp 가 없고
 * `shown` 기반이라, page 가 범위를 벗어난 순간(동시 삭제 후 refetch 사이) '전체 3건 중 81–80'
 * 같은 뒤집힌 범위를 그렸다. 그래서 계산은 DS 의 rangeTextOf 한 벌에 맡긴다 — 그쪽은 clamp 를
 * 하고 경계 단언도 갖고 있다. (통계 표는 컴포넌트째로 얹을 수 있어 그렇게 했다.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function SummaryText({
  range,
  loading,
  total,
  page,
  pageSize,
}: {
  readonly range: DateRange | null;
  readonly loading: boolean;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}) {
  if (range === null) return <>조회 기간을 확인해 주세요.</>;
  if (loading && total === 0) return <>불러오는 중…</>;
  return <>{rangeTextOf(total, page, pageSize)}</>;
}
