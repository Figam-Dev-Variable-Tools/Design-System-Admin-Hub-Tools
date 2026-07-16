// 관리자 로그 데이터 소스 어댑터 (apps/admin/src/pages/logs/admin/**)
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// 지금은 fixtures.ts 의 더미 데이터를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만**
// 실제 HTTP 호출로 교체하면 되고, 화면 코드는 한 줄도 바뀌지 않는다.
// 서버·엔드포인트·비즈니스 로직을 여기에 구현하지 않는다.
//
// [쓰기 계열이 없다 — 그것이 이 화면의 요점이다]
// 회원/운영자 어댑터와 달리 여기에는 POST·PATCH·DELETE 에 해당하는 함수가 **하나도 없다.**
// 감사 로그는 불변이다. 삭제 엔드포인트를 만들지 않았으므로 화면에 삭제 버튼을 붙일 수도 없다 —
// **없는 것을 부를 수는 없다.** 이 파일의 공개 표면이 그 불변성의 방어선이다
// (logs.test.ts 가 이 모듈의 export 목록을 전수로 단언한다).
import { fetchLogExport, fetchLogPage } from '../adapter';
import { toLogCsv } from '../query-engine';
import type { LogCsvColumn, LogDataSpec } from '../query-engine';
import { formatLogTime } from '../time';
import type { LogQuery, LogResult } from '../types';
import { ADMIN_LOGS } from './fixtures';
import { ADMIN_ACTION_LABEL, ADMIN_OUTCOME_LABEL } from './types';
import type { AdminLogEntry } from './types';

/** 캐시 키 · 개발용 실패 스위치의 스코프 (?fail=logs-admin:list) */
const SCOPE = 'logs-admin';

/**
 * 조회 규칙 — 어느 축으로 나뉘고 무엇을 검색하고 무엇으로 정렬하는가.
 * 규칙의 실행은 공용 엔진(../query-engine.ts)이 한다 — 4화면이 같은 규칙을 쓰기 위해서다.
 *
 * **테스트가 이것을 직접 쓴다** — 어댑터의 지연과 `?fail=` 스위치를 거치지 않고 규칙만 검증한다.
 */
export const adminLogSpec: LogDataSpec<AdminLogEntry> = {
  entries: ADMIN_LOGS,
  axes: [
    { key: 'outcome', valueOf: (entry) => entry.outcome },
    { key: 'action', valueOf: (entry) => entry.action },
  ],
  // IP 로 찾을 수 있어야 '이 IP 가 무엇을 했나'를 볼 수 있다 — 그것이 감사의 첫 질문이다
  searchOf: (entry) => [
    entry.actorAccount,
    entry.actorName,
    entry.targetType,
    entry.targetLabel,
    entry.ip,
  ],
  sortValues: {
    occurredAt: (entry) => entry.occurredAtIso,
    actor: (entry) => entry.actorAccount,
    action: (entry) => ADMIN_ACTION_LABEL[entry.action],
    target: (entry) => entry.targetLabel,
    outcome: (entry) => ADMIN_OUTCOME_LABEL[entry.outcome],
    ip: (entry) => entry.ip,
  },
};

// TODO(backend): GET /api/logs/admin?from=&to=&outcome=&action=&keyword=&sort=&dir=&page=&size=
//   응답의 `total` 은 필터·검색까지 적용한 뒤의 건수여야 한다(페이지네이션의 모수).
//   `axisCounts` 는 **기간 안에서만** 센 값이다 — 축·검색과 무관하다 (query-engine.ts 참조).
export async function fetchAdminLogs(
  query: LogQuery,
  signal: AbortSignal,
): Promise<LogResult<AdminLogEntry>> {
  return fetchLogPage(SCOPE, adminLogSpec, query, signal);
}

/** 내보내기 — 현재 페이지가 아니라 필터/검색에 걸린 전체를 내려준다 */
// TODO(backend): GET /api/logs/admin/export?from=&to=&outcome=&action=&keyword=&sort=&dir=
export async function fetchAdminLogsForExport(
  query: LogQuery,
  signal: AbortSignal,
): Promise<readonly AdminLogEntry[]> {
  return fetchLogExport(SCOPE, adminLogSpec, query, signal);
}

/**
 * 내보내기 CSV — 어느 열을 어떤 라벨로 내보낼지만 정한다.
 * 이스케이프·BOM·파일 저장은 shared/download.ts 가 맡는다 (ERP-12 — BOM 이 없으면 엑셀이 한글을 깨뜨린다).
 *
 * **실패를 성공 톤으로 옮겨 적지 않는다.** '결과' 열에는 '실패'가 그대로 들어가고 사유가 함께 나간다 —
 * 화면에서 빨갛게 보이던 행은 CSV 에서도 실패다. (색은 파일로 옮겨지지 않는다. 문자열이 스스로 말해야 한다.)
 *
 * **페이로드 열은 없다.** 페이로드에는 비밀번호·토큰이 들어 있고, CSV 는 마스킹을 거치지 않은 채
 * 메일로 오간다. 감사에 필요한 '무엇을 했는가'는 액션·대상 열이 이미 말한다 —
 * 파일로 반출되는 순간 통제할 수 없는 것을 파일에 싣지 않는다.
 */
const CSV_COLUMNS: readonly LogCsvColumn<AdminLogEntry>[] = [
  { header: '시각(KST)', cell: (entry) => formatLogTime(entry.occurredAtIso) },
  { header: '행위자', cell: (entry) => entry.actorAccount },
  { header: '이름', cell: (entry) => entry.actorName },
  { header: '역할', cell: (entry) => entry.actorRole },
  { header: '액션', cell: (entry) => ADMIN_ACTION_LABEL[entry.action] },
  { header: '대상 유형', cell: (entry) => entry.targetType },
  { header: '대상', cell: (entry) => entry.targetLabel },
  { header: '결과', cell: (entry) => ADMIN_OUTCOME_LABEL[entry.outcome] },
  { header: '실패 사유', cell: (entry) => entry.failureReason ?? '' },
  { header: 'IP', cell: (entry) => entry.ip },
];

export function toCsv(entries: readonly AdminLogEntry[]): string {
  return toLogCsv(CSV_COLUMNS, entries);
}
