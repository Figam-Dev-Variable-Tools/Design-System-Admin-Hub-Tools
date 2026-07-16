// 오류 로그 데이터 소스 어댑터 (apps/admin/src/pages/logs/errors/**)
//
// [백엔드 연동 지점] 함수 본문만 실제 HTTP 호출로 교체하면 되고, 화면 코드는 바뀌지 않는다.
// [쓰기 계열 0건] '해결됨' 토글조차 없다 — 이것은 이슈 트래커가 아니라 감사 로그다 (./types.ts 참조).
import { fetchLogExport, fetchLogPage } from '../adapter';
import { toLogCsv } from '../query-engine';
import type { LogCsvColumn, LogDataSpec } from '../query-engine';
import { formatLogTime } from '../time';
import type { LogQuery, LogResult } from '../types';
import { ERROR_LOGS } from './fixtures';
import { ERROR_SEVERITY_LABEL, ERROR_SEVERITY_RANK } from './types';
import type { ErrorLogEntry } from './types';

/** 캐시 키 · 개발용 실패 스위치의 스코프 (?fail=logs-errors:list) */
const SCOPE = 'logs-errors';

export const errorLogSpec: LogDataSpec<ErrorLogEntry> = {
  entries: ERROR_LOGS,
  axes: [
    { key: 'severity', valueOf: (entry) => entry.severity },
    { key: 'source', valueOf: (entry) => entry.source },
  ],
  // 코드·메시지·추적 ID 로 찾는다 — 개발자가 티켓에 붙여 온 그 문자열이 그대로 검색어가 된다
  searchOf: (entry) => [entry.code, entry.message, entry.source, entry.traceId],
  sortValues: {
    occurredAt: (entry) => entry.occurredAtIso,
    // **사전순이 아니라 심각한 순** — 사전순이면 '경고'가 '치명'보다 위로 온다
    severity: (entry) => ERROR_SEVERITY_RANK[entry.severity],
    source: (entry) => entry.source,
    code: (entry) => entry.code,
    occurrences: (entry) => entry.occurrences,
  },
};

// TODO(backend): GET /api/logs/errors?from=&to=&severity=&source=&keyword=&sort=&dir=&page=&size=
export async function fetchErrorLogs(
  query: LogQuery,
  signal: AbortSignal,
): Promise<LogResult<ErrorLogEntry>> {
  return fetchLogPage(SCOPE, errorLogSpec, query, signal);
}

// TODO(backend): GET /api/logs/errors/export?from=&to=&severity=&source=&keyword=&sort=&dir=
export async function fetchErrorLogsForExport(
  query: LogQuery,
  signal: AbortSignal,
): Promise<readonly ErrorLogEntry[]> {
  return fetchLogExport(SCOPE, errorLogSpec, query, signal);
}

/**
 * CSV — 헤더는 한국어, BOM 은 shared/download 가 붙인다 (ERP-12).
 *
 * **스택/컨텍스트 열은 없다.** 스택에는 내부 경로·커넥션 문자열·토큰이 들어 있다 —
 * 그것이 파일로 나가 메일로 오가면 내부 구조를 통째로 흘리는 것이다 (EXC-20 의 'raw 미노출'과 같은 이유).
 * 대신 **추적 ID** 를 싣는다: 개발자는 그것 하나로 서버 로그에서 전문을 찾는다.
 */
const CSV_COLUMNS: readonly LogCsvColumn<ErrorLogEntry>[] = [
  { header: '시각(KST)', cell: (entry) => formatLogTime(entry.occurredAtIso) },
  { header: '심각도', cell: (entry) => ERROR_SEVERITY_LABEL[entry.severity] },
  { header: '발생 위치', cell: (entry) => entry.source },
  { header: '오류 코드', cell: (entry) => entry.code },
  { header: '메시지', cell: (entry) => entry.message },
  { header: '발생 횟수', cell: (entry) => String(entry.occurrences) },
  { header: '추적 ID', cell: (entry) => entry.traceId },
];

export function toCsv(entries: readonly ErrorLogEntry[]): string {
  return toLogCsv(CSV_COLUMNS, entries);
}
