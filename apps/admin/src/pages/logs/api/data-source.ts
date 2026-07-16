// API 로그 데이터 소스 어댑터 (apps/admin/src/pages/logs/api/**)
//
// [백엔드 연동 지점] 함수 본문만 실제 HTTP 호출로 교체하면 되고, 화면 코드는 바뀌지 않는다.
// [쓰기 계열 0건] 감사 로그는 불변이다 (logs.test.ts 가 export 목록을 전수로 단언한다).
import { fetchLogExport, fetchLogPage } from '../adapter';
import { maskTail } from '../masking';
import { toLogCsv } from '../query-engine';
import type { LogCsvColumn, LogDataSpec } from '../query-engine';
import { formatLogTime } from '../time';
import type { LogQuery, LogResult } from '../types';
import { API_LOGS } from './fixtures';
import { statusClassOf } from './types';
import type { ApiLogEntry } from './types';

/** 캐시 키 · 개발용 실패 스위치의 스코프 (?fail=logs-api:list) */
const SCOPE = 'logs-api';

export const apiLogSpec: LogDataSpec<ApiLogEntry> = {
  entries: API_LOGS,
  axes: [
    // 상태는 낱개 코드가 아니라 **계열**로 나뉜다 — 운영자가 묻는 것은 '깨진 게 있나' 다
    { key: 'status', valueOf: (entry) => statusClassOf(entry.status) },
    { key: 'method', valueOf: (entry) => entry.method },
  ],
  // API 키로는 검색하지 않는다 — 키 전문을 입력해야 걸리는 검색은 키를 화면에 붙여넣게 만든다.
  // 그 대신 요청 ID 로 찾는다(서버 로그와 대조하는 열쇠이자, 유출돼도 무해한 식별자다).
  searchOf: (entry) => [entry.path, entry.client, entry.requestId, entry.clientIp],
  sortValues: {
    occurredAt: (entry) => entry.occurredAtIso,
    method: (entry) => entry.method,
    path: (entry) => entry.path,
    status: (entry) => entry.status,
    // 숫자로 정렬한다 — 문자열로 비교하면 '90' 이 '1400' 보다 크다
    durationMs: (entry) => entry.durationMs,
    client: (entry) => entry.client,
  },
};

// TODO(backend): GET /api/logs/api?from=&to=&status=&method=&keyword=&sort=&dir=&page=&size=
export async function fetchApiLogs(
  query: LogQuery,
  signal: AbortSignal,
): Promise<LogResult<ApiLogEntry>> {
  return fetchLogPage(SCOPE, apiLogSpec, query, signal);
}

// TODO(backend): GET /api/logs/api/export?from=&to=&status=&method=&keyword=&sort=&dir=
export async function fetchApiLogsForExport(
  query: LogQuery,
  signal: AbortSignal,
): Promise<readonly ApiLogEntry[]> {
  return fetchLogExport(SCOPE, apiLogSpec, query, signal);
}

/**
 * CSV — 헤더는 한국어, BOM 은 shared/download 가 붙인다 (ERP-12).
 *
 * **API 키 열은 마스킹된 채로 나간다** (뒤 4자만). 다른 화면의 CSV 는 민감한 열을 아예 빼지만,
 * 여기서는 '어느 키가 401 을 맞고 있나'가 곧 그 파일을 만드는 이유다 —
 * 뒤 4자면 키를 특정해 폐기할 수 있고, 그것으로 남의 키를 쓸 수는 없다.
 */
const CSV_COLUMNS: readonly LogCsvColumn<ApiLogEntry>[] = [
  { header: '시각(KST)', cell: (entry) => formatLogTime(entry.occurredAtIso) },
  { header: '메서드', cell: (entry) => entry.method },
  { header: '경로', cell: (entry) => entry.path },
  { header: '상태', cell: (entry) => String(entry.status) },
  { header: '응답시간(ms)', cell: (entry) => String(entry.durationMs) },
  { header: '클라이언트', cell: (entry) => entry.client },
  { header: 'API 키', cell: (entry) => maskTail(entry.apiKey) },
  { header: '요청 ID', cell: (entry) => entry.requestId },
  { header: '클라이언트 IP', cell: (entry) => entry.clientIp },
];

export function toCsv(entries: readonly ApiLogEntry[]): string {
  return toLogCsv(CSV_COLUMNS, entries);
}
