// 픽스처 어댑터의 공통 본체 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [쓰기 계열이 없다 — 그것이 이 섹션의 요점이다]
//
// 회원/운영자 어댑터와 달리 여기에는 POST·PATCH·DELETE 에 해당하는 함수가 **하나도 없다.**
// 감사 로그는 불변이다. 삭제 엔드포인트를 만들지 않았으므로 화면에 삭제 버튼을 붙일 수도 없다 —
// **없는 것을 부를 수는 없다.** 이 파일과 각 data-source.ts 의 공개 표면이 그 불변성의 첫 방어선이다.
//
// (`logs.test.ts` 가 4개 어댑터의 export 목록을 전수로 훑어 이 사실을 단언한다. 누군가
//  `deleteAdminLog` 를 추가하는 순간 그 테스트가 빨개진다.)
//
// [백엔드 없음] 실제 네트워크 요청은 이 앱 어디에도 없다. 연동 지점은 각 화면 data-source.ts 의
// `// TODO(backend)` 주석이다 — 그 함수 본문만 HTTP 호출로 바뀌고 화면은 한 줄도 바뀌지 않는다.
//
// [지연·실패 스위치는 앱 공용을 쓴다] `shared/crud` 의 failIfRequested·LATENCY_MS 를 그대로 쓴다.
// 같은 8줄을 다섯 번째로 복사하지 않는다 (그 규약은 이미 열 개 어댑터가 공유하고 있다).
//   ?fail=list · ?fail=export · ?fail=all · ?fail=logs-api:list (스코프 지정)
// ─────────────────────────────────────────────────────────────────────────────
import { wait } from '../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../shared/crud';
import { runLogExport, runLogQuery } from './query-engine';
import type { LogDataSpec } from './query-engine';
import type { LogEntryBase, LogQuery, LogResult } from './types';

/**
 * 목록 조회 — 필터·정렬·페이지가 전부 적용된 한 페이지.
 * `signal` 은 화면을 떠나거나 조건이 바뀌면 react-query 가 끊어 준다.
 */
export async function fetchLogPage<E extends LogEntryBase>(
  scope: string,
  spec: LogDataSpec<E>,
  query: LogQuery,
  signal: AbortSignal,
): Promise<LogResult<E>> {
  await wait(LATENCY_MS, signal);
  failIfRequested(scope, 'list');
  return runLogQuery(spec, query);
}

/**
 * 내보내기 — **현재 페이지가 아니라** 필터·검색에 걸린 전체를 화면과 같은 순서로 돌려준다 (ERP-12).
 * 취소(AbortSignal)를 받는 이유: 90일치 내보내기는 길다. 사용자가 그만두겠다면 그만둘 수 있어야 한다.
 */
export async function fetchLogExport<E extends LogEntryBase>(
  scope: string,
  spec: LogDataSpec<E>,
  query: LogQuery,
  signal: AbortSignal,
): Promise<readonly E[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(scope, 'export');
  return runLogExport(spec, query);
}
