// LoginHistoryPage — 로그인 이력 (라우트: /users/login-history)
//
// 좌: 결과 · 계정 유형 · 기간 필터 / 우: 검색 + 내보내기 + 표 + 페이지네이션.
// 배치·스타일·패턴은 회원 관리(MembersPage) / 관리자 관리(AdminsPage)를 **그대로** 따른다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 화면은 읽기 전용 감사 로그다 — 다른 목록 화면과 갈라지는 지점]
//
//   · **삭제 없음 · 수정 없음 · 행 ⋯ 메뉴 없음.** 감사 기록은 불변이어야 한다.
//     지울 수 있는 감사 로그는 감사 로그가 아니다 — 침입자가 가장 먼저 지우는 것이 자기 흔적이다.
//     그래서 data-source.ts 에 쓰기 함수가 **하나도 없고**, 없는 것을 화면이 부를 수는 없다.
//   · **체크박스 없음.** 일괄 액션이 없기 때문이다. 회원 관리에서 '체크박스가 아무 일괄 액션과도
//     연결되지 않았다'가 결함으로 지적됐다(FS-003 검수) — 여기서 반복하지 않는다.
//   · **행 클릭 → 그 계정의 상세** (회원이면 /users/members/:id, 운영자면 /users/admins/:id).
//     미등록 계정은 가리킬 레코드가 없어 이동하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
//
// [실패는 조용히 삼키지 않는다 — shared/ui/README.md 의 기준 "사라져도 되는가"]
//   - 목록 **조회** 실패 → **인라인 배너** (화면이 비어 있고 할 일이 '다시 시도' 하나뿐이다.
//     토스트가 사라지면 빈 화면만 남고, 감사 로그가 **비어 있는 것**과 **못 불러온 것**이 구분되지 않는다)
//   - **내보내기**(사용자가 방금 시작한 작업)의 성공/실패 → 토스트 (실패는 자동으로 사라지지 않고 '다시 시도'가 붙는다)
//   - 기간 직접 지정의 입력 오류 → **그 입력 칸 옆 인라인** (zod — validation.ts)
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 백엔드가 붙어도 이 파일은 바뀌지 않는다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

// (login-history.css 삭제) 실패 행 강조는 이제 DS Table 의 rows[].tone='danger' 가 담당한다 —
// 화면 전용 상태 클래스가 사라졌다.
import { downloadCsv } from '../../shared/download';
import { formatDate, formatNumber } from '../../shared/format';
import { useRouteCan } from '../../shared/permissions/RequirePermission';
import { Alert, Button, hintStyle, Pagination, useToast } from '../../shared/ui';
import { LoginHistoryFilters } from './components/LoginHistoryFilters';
import { LoginHistoryTable } from './components/LoginHistoryTable';
import { LoginHistoryToolbar } from './components/LoginHistoryToolbar';
import { toCsv } from './data-source';
import { presetRange } from './period';
import { useExportLoginHistory, useLoginHistoryQuery } from './queries';
import { PAGE_SIZE } from './types';
import type { AccountKindFilter, DateRange, OutcomeFilter, PeriodId } from './types';
import { validateCustomRange } from './validation';
import type { CustomRangeDraft, RangeIssue } from './validation';
import { cssVar } from '@tds/ui';

/** 검색어 디바운스 — 타이핑 한 글자마다 조회하지 않는다 */
const SEARCH_DEBOUNCE_MS = 250;

/** 처음 열었을 때의 기간 — 최근 30일. 오늘만 보면 어제 새벽의 연속 실패를 놓친다 */
const DEFAULT_PERIOD: PeriodId = 'last-30d';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 필터는 고정 폭, 표는 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
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

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 실패 건수 — 요약 줄에서도 실패는 실패로 보인다 (성공 톤으로 섞지 않는다) */
const failureSummaryStyle: CSSProperties = {
  ...hintStyle,
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

/** 표 카드의 가로 스크롤 — 컬럼이 8개라 좁은 화면에서 넘칠 수 있다 */
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

export default function LoginHistoryPage() {
  const toast = useToast();

  // [EXC-03] 이 화면의 유일한 쓰기성 액션은 내보내기다 — 감사 기록에는 삭제도 수정도 없다.
  // 그런데 그 하나가 계정·이름·IP 가 담긴 파일을 뽑아낸다. 로그 화면(LogListShell)과 같은 게이팅:
  // 권한이 없으면 버튼을 **비활성이 아니라 부재**로 둔다. read 게이팅은 여기의 일이 아니다 —
  // AppShell 이 <Outlet> 을 RequirePermission 으로 감싸 모든 라우트를 한 번에 덮는다.
  const canExport = useRouteCan('export');

  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [accountKind, setAccountKind] = useState<AccountKindFilter>('all');
  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  // 직접 지정의 초기값 = 지금 보고 있던 프리셋 구간. '직접 지정'을 눌렀는데 입력이 비어
  // 결과가 사라지는 일이 없다 — 사용자는 좁히거나 넓히기만 하면 된다.
  const [customDraft, setCustomDraft] = useState<CustomRangeDraft>(() => presetRange('last-30d'));

  const exportHistory = useExportLoginHistory();
  const exporting = exportHistory.isPending;

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  /**
   * 기간 → 확정 구간. 프리셋은 코드가 만들고(틀릴 수 없다), 직접 지정만 검증을 거친다.
   * 입력이 유효하지 않으면 range 는 null 이고 — **조회하지 않는다.**
   * 빈 표를 보여주면 사용자는 *기록이 지워졌다*고 의심한다. 원인이 자기 입력임을 알려야 한다.
   */
  const { range, rangeIssues } = useMemo((): {
    readonly range: DateRange | null;
    readonly rangeIssues: readonly RangeIssue[];
  } => {
    if (period !== 'custom') return { range: presetRange(period), rangeIssues: [] };
    const validation = validateCustomRange(customDraft);
    return { range: validation.range, rangeIssues: validation.issues };
  }, [period, customDraft]);

  // 조건이 바뀌면 1페이지부터 다시 — 뒤쪽 페이지를 보다 필터를 바꾸면 빈 화면이 뜨는 걸 막는다
  useEffect(() => {
    setPage(1);
  }, [outcome, accountKind, period, keyword, range?.from, range?.to]);

  // range 가 null(입력 오류)이면 쿼리 키를 만들 수 없다 — 조회 자체를 걸지 않는다.
  // 훅은 조건부로 부를 수 없으므로(Rules of Hooks) 안전한 구간을 넣고 enabled 로 끈다.
  const safeRange = range ?? presetRange('today');
  const query = useMemo(
    () => ({ outcome, accountKind, range: safeRange, keyword, page }),
    [outcome, accountKind, safeRange, keyword, page],
  );

  const { data, isFetching, error, refetch } = useLoginHistoryQuery(query, {
    enabled: range !== null,
  });
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 감사 화면은 기간·결과·계정
   * 종류를 계속 바꿔 가며 훑는 곳이라 재조회가 잦고, queries.ts 가 placeholderData 로 이전 행을
   * 들고 있는데도 조건을 한 번 만질 때마다 표가 통째로 깜빡였다.
   */
  const firstLoading = isFetching && data === undefined;

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const failureTotal = data?.outcomeCounts.failure ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 다른 조건으로 좁혀 총 페이지가 줄면 현재 페이지가 범위를 벗어난다 — 마지막 페이지로 보정한다
  useEffect(() => {
    if (data === undefined) return;
    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (page > pages) setPage(pages);
  }, [data, page]);

  const onPeriodChange = (next: PeriodId) => {
    // '직접 지정'으로 들어올 때 지금 보던 구간을 그대로 물려준다 (빈 입력으로 떨어뜨리지 않는다)
    if (next === 'custom' && period !== 'custom') {
      setCustomDraft(range ?? presetRange('last-30d'));
    }
    setPeriod(next);
  };

  /** 내보내기 — 현재 필터/검색에 걸린 **전체**를 CSV 로 받는다 (현재 페이지가 아니다) */
  const onExport: () => void = () => {
    if (range === null) return;
    const controller = new AbortController();

    exportHistory.mutate(
      { query, signal: controller.signal },
      {
        onSuccess: (all) => {
          const failed = all.filter((entry) => entry.outcome === 'failure').length;
          // 파일명의 날짜도 서울 기준이다 — 화면이 KST 로 보여준 것을 KST 로 저장한다
          downloadCsv(`login-history-${formatDate(new Date())}`, toCsv(all));

          // 성공 안내에도 실패 건수를 함께 적는다 — 파일 안에 무엇이 들어 있는지 숨기지 않는다
          toast.success(
            failed === 0
              ? `로그인 이력 ${formatNumber(all.length)}건을 CSV 로 내보냈어요.`
              : `로그인 이력 ${formatNumber(all.length)}건을 CSV 로 내보냈어요. (실패 ${formatNumber(failed)}건 포함)`,
          );
        },
        onError: () => {
          // 실패는 성공 톤으로 알릴 수 없다 — 자동으로 사라지지 않는 실패 토스트 + 재시도
          toast.error('내보내기에 실패했어요. 잠시 후 다시 시도해 주세요.', { retry: onExport });
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <LoginHistoryFilters
          outcome={outcome}
          accountKind={accountKind}
          period={period}
          outcomeCounts={data?.outcomeCounts ?? null}
          kindCounts={data?.kindCounts ?? null}
          customDraft={customDraft}
          rangeIssues={rangeIssues}
          onOutcomeChange={setOutcome}
          onAccountKindChange={setAccountKind}
          onPeriodChange={onPeriodChange}
          onCustomDraftChange={setCustomDraft}
        />

        <div style={mainColumnStyle}>
          <LoginHistoryToolbar
            keyword={keywordInput}
            onKeywordChange={setKeywordInput}
            onExport={onExport}
            exporting={exporting}
            canExport={canExport}
          />

          {error === null ? (
            <>
              <div style={summaryRowStyle}>
                <p style={hintStyle}>
                  {range === null
                    ? '조회 기간을 확인해 주세요.'
                    : firstLoading
                      ? '불러오는 중…'
                      : `전체 ${formatNumber(total)}건`}
                </p>
                {range !== null && !firstLoading && failureTotal > 0 && (
                  <p style={failureSummaryStyle}>
                    {`이 기간의 로그인 실패 ${formatNumber(failureTotal)}건`}
                  </p>
                )}
              </div>

              <div style={tableWrapStyle}>
                <LoginHistoryTable entries={entries} loading={firstLoading && range !== null} />
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                label="로그인 이력 페이지"
              />
            </>
          ) : (
            // 조회 실패는 인라인이다 — 토스트로 띄우면 사라진 뒤 '기록이 없다'와 구분되지 않는다
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>로그인 이력을 불러오지 못했어요.</span>
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
    </div>
  );
}
