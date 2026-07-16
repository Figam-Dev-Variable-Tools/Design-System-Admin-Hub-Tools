// API 로그 (라우트: /logs/api)
//
// "연동이 왜 안 되죠?" · "누가 우리 API 를 두드리고 있죠?" · "어디가 느리죠?" 에 답하는 화면이다.
//
// [이 파일이 하는 일] 화면의 정의(LogScreenSpec)를 적는 것뿐이다 — 나머지는 LogListShell 이 갖는다.
//
// [숫자 컬럼이 처음 등장한다 — ERP-04/ERP-07]
// 응답 시간은 **우측 정렬 + tabular-nums** 다. 등폭 숫자가 아니면 1400 과 980 의 자릿수가
// 어긋나 '어느 쪽이 큰가'를 눈으로 못 읽는다. 단위(ms)는 숫자에 붙이지 않고 **헤더로 올린다** —
// 값마다 'ms' 가 따라다니면 그것이 자릿수 정렬을 다시 깨뜨린다.
import { useMemo } from 'react';

import { formatNumber } from '../../../shared/format';
import { StackCell } from '../components/cells';
import { LogListShell } from '../components/LogListShell';
import { maskTail } from '../masking';
import { formatLogTime } from '../time';
import type { LogColumn, LogDetail, LogResult, LogScreenSpec, LogTone } from '../types';
import { apiLogSpec, fetchApiLogs, fetchApiLogsForExport, toCsv } from './data-source';
import { API_LOG_AXES, API_LOG_RETENTION, SLOW_THRESHOLD_MS, statusClassOf } from './types';
import type { ApiLogEntry } from './types';

/** 상태 코드 — 색만으로 전하지 않는다. 5xx/4xx 는 계열 이름을 글자로 함께 적는다 */
function StatusCell({ entry }: { readonly entry: ApiLogEntry }) {
  const kind = statusClassOf(entry.status);
  if (kind === '2xx') return <span>{entry.status}</span>;

  const tone =
    kind === '5xx'
      ? 'var(--tds-color-feedback-danger-text)'
      : 'var(--tds-color-feedback-warning-text)';

  return (
    <span style={{ color: tone, fontWeight: 'var(--tds-primitive-typography-font-weight-bold)' }}>
      {`${String(entry.status)} ${kind}`}
    </span>
  );
}

/** 느린 호출은 숫자만으로 보이지 않는다 — 임계를 넘으면 글자가 스스로 말한다 */
function DurationCell({ entry }: { readonly entry: ApiLogEntry }) {
  const slow = entry.durationMs >= SLOW_THRESHOLD_MS;
  if (!slow) return <span>{formatNumber(entry.durationMs)}</span>;

  return (
    <span
      style={{
        color: 'var(--tds-color-feedback-warning-text)',
        fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
      }}
    >
      {`${formatNumber(entry.durationMs)} 느림`}
    </span>
  );
}

const COLUMNS: readonly LogColumn<ApiLogEntry>[] = [
  {
    id: 'occurredAt',
    label: '시각',
    nowrap: true,
    render: (entry) => formatLogTime(entry.occurredAtIso),
  },
  { id: 'method', label: '메서드', nowrap: true, render: (entry) => entry.method },
  { id: 'path', label: '경로', render: (entry) => entry.path },
  { id: 'status', label: '상태', nowrap: true, render: (entry) => <StatusCell entry={entry} /> },
  {
    id: 'durationMs',
    label: '응답시간(ms)',
    numeric: true,
    render: (entry) => <DurationCell entry={entry} />,
  },
  {
    id: 'client',
    label: '클라이언트',
    nowrap: true,
    render: (entry) => <StackCell primary={entry.client} secondary={entry.clientIp} />,
  },
];

/** 5xx 는 우리 잘못이고(danger), 4xx 는 부르는 쪽의 잘못이다(warning) — 같은 색으로 섞지 않는다 */
function toneOf(entry: ApiLogEntry): LogTone {
  const kind = statusClassOf(entry.status);
  if (kind === '5xx') return 'danger';
  if (kind === '4xx') return 'warning';
  return entry.durationMs >= SLOW_THRESHOLD_MS ? 'warning' : 'neutral';
}

function detailOf(entry: ApiLogEntry): LogDetail {
  return {
    title: `${entry.method} ${entry.path}`,
    fields: [
      { label: '시각', value: formatLogTime(entry.occurredAtIso) },
      { label: '메서드', value: entry.method },
      { label: '경로', value: entry.path },
      { label: '상태', value: <StatusCell entry={entry} /> },
      { label: '응답시간', value: `${formatNumber(entry.durationMs)} ms` },
      { label: '클라이언트', value: entry.client },
      // 키는 뒤 4자만 — 어느 키였는지 대조해 폐기할 수는 있고, 그것으로 남의 키를 쓸 수는 없다
      { label: 'API 키', value: maskTail(entry.apiKey) },
      { label: '요청 ID', value: entry.requestId },
      { label: '클라이언트 IP', value: entry.clientIp },
      { label: '로그 ID', value: entry.id },
    ],
    payload: entry.payload,
    payloadLabel: '요청 · 응답',
  };
}

/** 5xx 는 우리가 깨진 것이다 — 무엇보다 먼저 말한다 */
function highlightOf(result: LogResult<ApiLogEntry>): string | null {
  const serverErrors = result.axisCounts['status']?.['5xx'] ?? 0;
  const clientErrors = result.axisCounts['status']?.['4xx'] ?? 0;

  if (serverErrors > 0) return `이 기간의 서버 오류(5xx) ${formatNumber(serverErrors)}건`;
  if (clientErrors > 0) return `이 기간의 요청 오류(4xx) ${formatNumber(clientErrors)}건`;
  return null;
}

export default function ApiLogPage() {
  const spec = useMemo<LogScreenSpec<ApiLogEntry>>(
    () => ({
      scope: 'logs-api',
      route: '/logs/api',
      entityLabel: 'API 로그',
      retention: API_LOG_RETENTION,
      axes: API_LOG_AXES,
      columns: COLUMNS,
      sortValues: apiLogSpec.sortValues,
      caption:
        'API 로그 — 행을 누르면 그 호출의 요청·응답이 열립니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다.',
      searchLabel: '경로, 클라이언트 또는 요청 ID 검색',
      searchPlaceholder: '경로 · 클라이언트 · 요청 ID 검색',
      csvBaseName: 'api-log',
      toneOf,
      detailOf,
      toCsv,
      fetchPage: fetchApiLogs,
      fetchExport: fetchApiLogsForExport,
      highlightOf,
    }),
    [],
  );

  return <LogListShell spec={spec} />;
}
