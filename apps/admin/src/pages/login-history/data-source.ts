// 로그인 이력 데이터 소스 어댑터 (A40 소유 — apps/admin/src/pages/login-history/**)
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// 지금은 fixtures.ts 의 더미 데이터를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만**
// 실제 HTTP 호출로 교체하면 되고, 화면 코드(LoginHistoryPage)는 한 줄도 바뀌지 않는다.
// 서버·엔드포인트·비즈니스 로직을 여기에 구현하지 않는다.
//
// [쓰기 계열이 없다 — 그것이 이 화면의 요점이다]
// 회원/운영자 어댑터와 달리 여기에는 POST·PATCH·DELETE 에 해당하는 함수가 **하나도 없다.**
// 감사 로그는 불변이다. 삭제 엔드포인트를 만들지 않았으므로 화면에 삭제 버튼을 붙일 수도 없다 —
// **없는 것을 부를 수는 없다.** 이 파일의 공개 표면이 그 불변성의 첫 번째 방어선이다.
import { wait } from '../../shared/async';
import { toCsvText } from '../../shared/download';
import { formatDateTime } from '../../shared/format';
import { LOGIN_HISTORY } from './fixtures';
import { withinRange } from './period';
import { ACCOUNT_KIND_LABEL, FAILURE_REASON_LABEL, OUTCOME_LABEL, PAGE_SIZE } from './types';
import type {
  AccountKindCounts,
  AccountKindFilter,
  DateRange,
  LoginHistoryEntry,
  LoginHistoryResult,
  OutcomeCounts,
  OutcomeFilter,
} from './types';

/** 네트워크 왕복 체감 — 화면의 로딩/스켈레톤 경로를 실제로 타게 하는 최소한의 지연 */
const LATENCY_MS = 400;

/**
 * 실패 경로 재현 스위치 (개발용) — 회원/운영자 어댑터와 같은 규약이다.
 *
 *   /users/login-history?fail=history   → 목록 조회가 실패한다 (인라인 배너 + 다시 시도)
 *   /users/login-history?fail=export    → 내보내기가 실패한다 (실패 토스트 + 다시 시도)
 *   /users/login-history?fail=all       → 둘 다
 *
 * 백엔드가 붙으면 이 함수와 호출부는 함께 사라진다.
 */
type FailureOp = 'all' | 'history' | 'export';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;

  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

export interface LoginHistoryQuery {
  readonly outcome: OutcomeFilter;
  readonly accountKind: AccountKindFilter;
  /** 프리셋이든 직접 지정이든, 어댑터에 닿을 때는 **확정된 구간**이다 (화면이 이미 해석했다) */
  readonly range: DateRange;
  /** 계정·이름·IP 를 대상으로 하는 검색어 */
  readonly keyword: string;
  readonly page: number;
}

/** 기간만 적용 — 좌측 배지 숫자의 모수다 (결과/유형/검색과 무관한 '이 기간의 전부') */
function withinPeriod(range: DateRange): readonly LoginHistoryEntry[] {
  return LOGIN_HISTORY.filter((entry) => withinRange(entry.occurredAtIso, range));
}

function countOutcomes(entries: readonly LoginHistoryEntry[]): OutcomeCounts {
  return {
    all: entries.length,
    success: entries.filter((entry) => entry.outcome === 'success').length,
    failure: entries.filter((entry) => entry.outcome === 'failure').length,
  };
}

function countKinds(entries: readonly LoginHistoryEntry[]): AccountKindCounts {
  return {
    all: entries.length,
    member: entries.filter((entry) => entry.accountKind === 'member').length,
    admin: entries.filter((entry) => entry.accountKind === 'admin').length,
  };
}

/**
 * 기간 + 결과 + 계정 유형 + 검색어(계정·이름·IP) — 전부 AND 로 걸린다.
 * 서버 쿼리로 대체될 자리다.
 *
 * **테스트는 이 함수를 직접 부른다** — 어댑터의 지연(LATENCY_MS)과 `?fail=` 스위치를 거치지 않고
 * 필터 규칙만 검증하기 위해서다. 규칙이 여기 한 곳에만 있으므로 화면과 내보내기가 어긋나지 않는다.
 */
export function applyQuery(
  query: LoginHistoryQuery,
  source: readonly LoginHistoryEntry[] = LOGIN_HISTORY,
): readonly LoginHistoryEntry[] {
  const keyword = query.keyword.trim().toLowerCase();

  return source.filter((entry) => {
    if (!withinRange(entry.occurredAtIso, query.range)) return false;
    if (query.outcome !== 'all' && entry.outcome !== query.outcome) return false;
    if (query.accountKind !== 'all' && entry.accountKind !== query.accountKind) return false;
    if (keyword === '') return true;

    // 검색 대상은 계정·이름·IP 다. IP 로 찾을 수 있어야 '이 IP 가 무엇을 두드렸나'를 볼 수 있다 —
    // 그것이 감사 화면의 첫 번째 질문이다.
    return (
      entry.account.toLowerCase().includes(keyword) ||
      entry.name.toLowerCase().includes(keyword) ||
      entry.ip.includes(keyword)
    );
  });
}

// TODO(backend): GET /api/login-history?outcome=&accountKind=&from=&to=&keyword=&page=&size=
//   응답은 이미 최신순으로 정렬돼 있어야 한다. `consecutiveFailures` 는 **서버가 계산해 내려준다**
//   (페이지네이션된 목록에서 프론트가 세면 페이지 경계에서 값이 왜곡된다 — types.ts 참조).
export async function fetchLoginHistory(
  query: LoginHistoryQuery,
  signal: AbortSignal,
): Promise<LoginHistoryResult> {
  await wait(LATENCY_MS, signal);
  failIfRequested('history');

  const period = withinPeriod(query.range);
  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    entries: filtered.slice(start, start + PAGE_SIZE),
    outcomeCounts: countOutcomes(period),
    kindCounts: countKinds(period),
    total: filtered.length,
  };
}

/** 내보내기 — 현재 페이지가 아니라 필터/검색에 걸린 전체를 내려준다 */
// TODO(backend): GET /api/login-history/export?outcome=&accountKind=&from=&to=&keyword=
export async function fetchLoginHistoryForExport(
  query: LoginHistoryQuery,
  signal: AbortSignal,
): Promise<readonly LoginHistoryEntry[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('export');
  return applyQuery(query);
}

/**
 * 내보내기 CSV 직렬화 — 어느 열을 어떤 라벨로 내보낼지만 정한다.
 * 이스케이프·BOM·파일 저장은 shared/download.ts 가 맡는다 (회원 목록과 같은 구현).
 *
 * **실패를 성공 톤으로 옮겨 적지 않는다.** '결과' 열에는 '실패'가 그대로 들어가고,
 * '실패 사유'와 '연속 실패' 열이 함께 나간다 — 화면에서 빨갛게 보이던 행은 CSV 에서도 실패다.
 * (색은 파일로 옮겨지지 않는다. 그래서 **문자열이 스스로 말해야 한다.**)
 */
export function toCsv(entries: readonly LoginHistoryEntry[]): string {
  const header = [
    '시각',
    '계정',
    '이름',
    '유형',
    '결과',
    '실패 사유',
    '연속 실패',
    'IP',
    '브라우저',
    'OS',
  ];

  const rows = entries.map((entry) => [
    formatDateTime(entry.occurredAtIso),
    entry.account,
    entry.name,
    ACCOUNT_KIND_LABEL[entry.accountKind],
    OUTCOME_LABEL[entry.outcome],
    entry.failureReason === null ? '' : FAILURE_REASON_LABEL[entry.failureReason],
    entry.outcome === 'failure' ? String(entry.consecutiveFailures) : '',
    entry.ip,
    entry.browser,
    entry.os,
  ]);

  return toCsvText(header, rows);
}
