// 회원 활동 로그 데이터 소스 어댑터 (apps/admin/src/pages/logs/member-activity/**)
//
// [백엔드 연동 지점] 함수 본문만 실제 HTTP 호출로 교체하면 되고, 화면 코드는 바뀌지 않는다.
// [쓰기 계열 0건] 감사 로그는 불변이다 — 삭제·수정 함수가 없으므로 화면이 부를 수 있는 것도 없다.
//   (logs.test.ts 가 이 모듈의 export 목록을 전수로 단언한다.)
import { fetchLogExport, fetchLogPage } from '../adapter';
import { toLogCsv } from '../query-engine';
import type { LogCsvColumn, LogDataSpec } from '../query-engine';
import { formatLogTime } from '../time';
import type { LogQuery, LogResult } from '../types';
import { MEMBER_ACTIVITY_LOGS } from './fixtures';
import { MEMBER_ACTIVITY_LABEL, MEMBER_OUTCOME_LABEL } from './types';
import type { MemberActivityEntry } from './types';

/** 캐시 키 · 개발용 실패 스위치의 스코프 (?fail=logs-member:list) */
const SCOPE = 'logs-member';

export const memberActivitySpec: LogDataSpec<MemberActivityEntry> = {
  entries: MEMBER_ACTIVITY_LOGS,
  axes: [
    { key: 'outcome', valueOf: (entry) => entry.outcome },
    { key: 'activity', valueOf: (entry) => entry.activity },
  ],
  searchOf: (entry) => [entry.memberAccount, entry.memberName, entry.summary, entry.ip],
  sortValues: {
    occurredAt: (entry) => entry.occurredAtIso,
    member: (entry) => entry.memberAccount,
    activity: (entry) => MEMBER_ACTIVITY_LABEL[entry.activity],
    summary: (entry) => entry.summary,
    outcome: (entry) => MEMBER_OUTCOME_LABEL[entry.outcome],
  },
};

// TODO(backend): GET /api/logs/member-activity?from=&to=&outcome=&activity=&keyword=&sort=&dir=&page=&size=
export async function fetchMemberActivityLogs(
  query: LogQuery,
  signal: AbortSignal,
): Promise<LogResult<MemberActivityEntry>> {
  return fetchLogPage(SCOPE, memberActivitySpec, query, signal);
}

// TODO(backend): GET /api/logs/member-activity/export?from=&to=&outcome=&activity=&keyword=&sort=&dir=
export async function fetchMemberActivityLogsForExport(
  query: LogQuery,
  signal: AbortSignal,
): Promise<readonly MemberActivityEntry[]> {
  return fetchLogExport(SCOPE, memberActivitySpec, query, signal);
}

/**
 * CSV — 헤더는 한국어, BOM 은 shared/download 가 붙인다 (ERP-12).
 *
 * **페이로드 열은 없다.** 주문/결제 페이로드에는 카드번호·전화번호·주소가 들어 있고,
 * CSV 는 마스킹을 거치지 않은 채 메일로 오간다. 이 파일이 유출되면 그것은 개인정보 유출 사고다 —
 * 감사에 필요한 '무엇을 했는가'는 활동·내용 열이 이미 말한다.
 */
const CSV_COLUMNS: readonly LogCsvColumn<MemberActivityEntry>[] = [
  { header: '시각(KST)', cell: (entry) => formatLogTime(entry.occurredAtIso) },
  { header: '회원', cell: (entry) => entry.memberAccount },
  { header: '이름', cell: (entry) => entry.memberName },
  { header: '활동', cell: (entry) => MEMBER_ACTIVITY_LABEL[entry.activity] },
  { header: '내용', cell: (entry) => entry.summary },
  { header: '결과', cell: (entry) => MEMBER_OUTCOME_LABEL[entry.outcome] },
  { header: '실패 사유', cell: (entry) => entry.failureReason ?? '' },
  { header: 'IP', cell: (entry) => entry.ip },
  { header: '기기', cell: (entry) => entry.device },
];

export function toCsv(entries: readonly MemberActivityEntry[]): string {
  return toLogCsv(CSV_COLUMNS, entries);
}
