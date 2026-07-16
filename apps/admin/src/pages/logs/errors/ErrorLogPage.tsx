// 오류 로그 (라우트: /logs/errors)
//
// "무엇이 깨졌나?" 에 답하는 화면이다. 앞의 세 화면과 달리 **행위자가 없다** —
// 아무도 하지 않았는데 일어난 일이다.
//
// [이 파일이 하는 일] 화면의 정의(LogScreenSpec)를 적는 것뿐이다 — 나머지는 LogListShell 이 갖는다.
//
// [해결 버튼이 없다] 이슈 트래커가 아니라 감사 로그다 — 일어난 일을 '해결됨'으로 덧칠할 수 있다면
// 그것은 이미 불변 기록이 아니다 (./types.ts 참조).
import { useMemo } from 'react';

import { formatNumber } from '../../../shared/format';
import { StackCell } from '../components/cells';
import { LogListShell } from '../components/LogListShell';
import { formatLogTime } from '../time';
import type { LogColumn, LogDetail, LogResult, LogScreenSpec, LogTone } from '../types';
import { errorLogSpec, fetchErrorLogs, fetchErrorLogsForExport, toCsv } from './data-source';
import { ERROR_LOG_AXES, ERROR_LOG_RETENTION, ERROR_SEVERITY_LABEL } from './types';
import type { ErrorLogEntry, ErrorSeverity } from './types';

const severityColor: Record<ErrorSeverity, string> = {
  critical: 'var(--tds-color-feedback-danger-text)',
  error: 'var(--tds-color-feedback-danger-text)',
  warning: 'var(--tds-color-feedback-warning-text)',
};

/** 심각도 — 색 위에 **글자**가 있다. 색을 못 봐도 '치명'은 치명으로 읽힌다 */
function SeverityCell({ severity }: { readonly severity: ErrorSeverity }) {
  return (
    <span
      style={{
        color: severityColor[severity],
        fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
      }}
    >
      {ERROR_SEVERITY_LABEL[severity]}
    </span>
  );
}

const COLUMNS: readonly LogColumn<ErrorLogEntry>[] = [
  {
    id: 'occurredAt',
    label: '시각',
    nowrap: true,
    render: (entry) => formatLogTime(entry.occurredAtIso),
  },
  {
    id: 'severity',
    label: '심각도',
    nowrap: true,
    render: (entry) => <SeverityCell severity={entry.severity} />,
  },
  {
    id: 'code',
    label: '오류',
    // 코드 아래 메시지 — 코드는 개발자가 검색하는 열쇠이고, 메시지는 운영자가 읽는 문장이다
    render: (entry) => <StackCell primary={entry.code} secondary={entry.message} />,
  },
  { id: 'source', label: '발생 위치', nowrap: true, render: (entry) => entry.source },
  {
    id: 'occurrences',
    label: '발생 횟수',
    numeric: true,
    // 1회와 340회는 완전히 다른 사건이다 — 이 숫자가 없으면 표에서 둘이 똑같이 한 줄로 보인다
    render: (entry) => formatNumber(entry.occurrences),
  },
];

function toneOf(entry: ErrorLogEntry): LogTone {
  return entry.severity === 'warning' ? 'warning' : 'danger';
}

function detailOf(entry: ErrorLogEntry): LogDetail {
  return {
    title: entry.code,
    fields: [
      { label: '시각', value: formatLogTime(entry.occurredAtIso) },
      { label: '심각도', value: <SeverityCell severity={entry.severity} /> },
      { label: '발생 위치', value: entry.source },
      { label: '오류 코드', value: entry.code },
      { label: '메시지', value: entry.message },
      { label: '발생 횟수', value: `${formatNumber(entry.occurrences)}회` },
      // EXC-20 — 운영자가 이것을 복사해 개발자에게 준다. 없으면 '오류 났어요'로 끝나 아무도 못 찾는다
      { label: '추적 ID', value: entry.traceId },
      { label: '로그 ID', value: entry.id },
    ],
    payload: entry.payload,
    payloadLabel: '스택 · 컨텍스트',
  };
}

/** 치명은 무엇보다 먼저 말한다 — 경고 300건보다 치명 1건이 급하다 */
function highlightOf(result: LogResult<ErrorLogEntry>): string | null {
  const critical = result.axisCounts['severity']?.['critical'] ?? 0;
  const errors = result.axisCounts['severity']?.['error'] ?? 0;

  if (critical > 0) return `이 기간의 치명 오류 ${formatNumber(critical)}건`;
  if (errors > 0) return `이 기간의 오류 ${formatNumber(errors)}건`;
  return null;
}

export default function ErrorLogPage() {
  const spec = useMemo<LogScreenSpec<ErrorLogEntry>>(
    () => ({
      scope: 'logs-errors',
      route: '/logs/errors',
      entityLabel: '오류 로그',
      retention: ERROR_LOG_RETENTION,
      axes: ERROR_LOG_AXES,
      columns: COLUMNS,
      sortValues: errorLogSpec.sortValues,
      caption:
        '오류 로그 — 행을 누르면 스택과 컨텍스트가 열립니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다.',
      searchLabel: '오류 코드, 메시지 또는 추적 ID 검색',
      searchPlaceholder: '코드 · 메시지 · 추적 ID 검색',
      csvBaseName: 'error-log',
      toneOf,
      detailOf,
      toCsv,
      fetchPage: fetchErrorLogs,
      fetchExport: fetchErrorLogsForExport,
      highlightOf,
    }),
    [],
  );

  return <LogListShell spec={spec} />;
}
