// 관리자 로그 (라우트: /logs/admin)
//
// "그 회원 등급 누가 바꿨어요?" 에 답하는 화면이다.
//
// [이 파일이 하는 일] **화면의 정의(LogScreenSpec)를 적는 것뿐이다.**
// 조회·URL 상태·IME 검색·정렬·페이지네이션·빈 상태·에러·권한·내보내기·상세는 전부
// LogListShell 이 갖는다 (4화면이 한 벌을 공유한다 — IA-04 목록 템플릿).
// 여기 적히는 것은 **이 화면만의 것**: 축의 어휘 · 컬럼 · 강조 규칙 · 상세의 모양.
//
// [읽기 전용] 등록 버튼도, 행 ⋯ 메뉴도, 체크박스도 없다. 감사 기록은 불변이다 — ../types.ts 참조.
//
// [두 개의 목적지 — 회원 활동 로그와 같은 규약]
//   · **행**을 누르면 그 요청의 **페이로드**가 열린다 (이 화면의 본업 — 무엇을 보냈는가).
//   · **행위자 계정**을 누르면 운영자 상세로, **대상 이름**을 누르면 그 대상의 화면으로 간다.
// 그래야 "그 회원 등급 누가 바꿨어요?" 가 이 표에서 끝나지 않고 **다음 한 걸음**으로 이어진다.
// 행 이동 훅이 링크 클릭을 행 활성화에서 제외하므로 둘이 충돌하지 않는다.
// id 가 없는 행(옛 기록·목록 반출)은 링크가 아니라 글자다 — types.ts 의 actorId/targetId 참조.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import { OutcomeCell, StackCell } from '../components/cells';
import { LogListShell } from '../components/LogListShell';
import { formatLogTime } from '../time';
import type { LogColumn, LogDetail, LogResult, LogScreenSpec, LogTone } from '../types';
import { adminLogSpec, fetchAdminLogs, fetchAdminLogsForExport, toCsv } from './data-source';
import {
  ADMIN_ACTION_LABEL,
  ADMIN_LOG_AXES,
  ADMIN_LOG_RETENTION,
  ADMIN_OUTCOME_LABEL,
  adminLogActorPath,
  adminLogTargetPath,
} from './types';
import type { AdminLogEntry } from './types';

/** 갈 곳이 있으면 링크, 없으면 그대로 글자 — 없는 화면을 있는 것처럼 보이게 하지 않는다 */
function LinkedText({ to, children }: { readonly to: string | null; readonly children: string }) {
  if (to === null) return <>{children}</>;
  return (
    <Link to={to} className="tds-ui-link tds-ui-focusable">
      {children}
    </Link>
  );
}

/** 컬럼 id 는 곧 정렬 키다 — data-source 의 sortValues 와 이름이 맞아야 정렬 가능 컬럼이 된다 (ERP-04) */
const COLUMNS: readonly LogColumn<AdminLogEntry>[] = [
  {
    id: 'occurredAt',
    label: '시각',
    nowrap: true,
    render: (entry) => formatLogTime(entry.occurredAtIso),
  },
  {
    id: 'actor',
    label: '행위자',
    nowrap: true,
    // 계정 아래 이름+역할 — 그때의 역할이 함께 보여야 '권한이 있었나'를 그 자리에서 판단한다.
    // 역할은 **그때의 값**이라 링크로 만들지 않는다(지금의 역할과 다를 수 있다 — 그것이 감사다).
    render: (entry) => (
      <StackCell
        primary={<LinkedText to={adminLogActorPath(entry)}>{entry.actorAccount}</LinkedText>}
        secondary={`${entry.actorName} · ${entry.actorRole}`}
      />
    ),
  },
  {
    id: 'action',
    label: '액션',
    nowrap: true,
    render: (entry) => ADMIN_ACTION_LABEL[entry.action],
  },
  {
    id: 'target',
    label: '대상',
    render: (entry) => (
      <StackCell
        primary={<LinkedText to={adminLogTargetPath(entry)}>{entry.targetLabel}</LinkedText>}
        secondary={entry.targetType}
      />
    ),
  },
  {
    id: 'outcome',
    label: '결과',
    nowrap: true,
    render: (entry) => (
      <OutcomeCell
        failed={entry.outcome === 'failure'}
        successLabel={ADMIN_OUTCOME_LABEL.success}
        failureLabel={ADMIN_OUTCOME_LABEL.failure}
        reason={entry.failureReason}
      />
    ),
  },
  { id: 'ip', label: 'IP', nowrap: true, render: (entry) => entry.ip },
];

/** 실패 행만 붉게 — 색은 아이콘·글자 위의 **강조**일 뿐이다 (cells.tsx 참조) */
function toneOf(entry: AdminLogEntry): LogTone {
  return entry.outcome === 'failure' ? 'danger' : 'neutral';
}

function detailOf(entry: AdminLogEntry): LogDetail {
  return {
    title: `${ADMIN_ACTION_LABEL[entry.action]} · ${entry.targetLabel}`,
    fields: [
      { label: '시각', value: formatLogTime(entry.occurredAtIso) },
      { label: '행위자', value: `${entry.actorAccount} (${entry.actorName})` },
      { label: '당시 역할', value: entry.actorRole },
      { label: '액션', value: ADMIN_ACTION_LABEL[entry.action] },
      { label: '대상', value: `${entry.targetLabel} · ${entry.targetType}` },
      {
        label: '결과',
        value: (
          <OutcomeCell
            failed={entry.outcome === 'failure'}
            successLabel={ADMIN_OUTCOME_LABEL.success}
            failureLabel={ADMIN_OUTCOME_LABEL.failure}
            reason={entry.failureReason}
          />
        ),
      },
      { label: 'IP', value: entry.ip },
      { label: '로그 ID', value: entry.id },
    ],
    payload: entry.payload,
    payloadLabel: '요청 페이로드',
  };
}

/**
 * 요약 줄의 경고 — **권한 변경은 그냥 지나치면 안 되는 사건**이다.
 * 실패보다 먼저 말한다: 실패는 시끄럽고(누군가 막혔다) 권한 변경은 조용하다(누군가 열어줬다).
 * 조용한 쪽이 더 위험하다.
 */
function highlightOf(result: LogResult<AdminLogEntry>): string | null {
  const permission = result.axisCounts['action']?.['permission'] ?? 0;
  const failure = result.axisCounts['outcome']?.['failure'] ?? 0;

  if (permission > 0) return `이 기간의 권한 변경 ${formatNumber(permission)}건`;
  if (failure > 0) return `이 기간의 실패 ${formatNumber(failure)}건`;
  return null;
}

export default function AdminLogPage() {
  // spec 은 렌더마다 새로 만들지 않는다 — 셸의 useMemo(쿼리 키·정렬 키)가 매번 갱신되면
  // 조회가 무한히 다시 돈다.
  const spec = useMemo<LogScreenSpec<AdminLogEntry>>(
    () => ({
      scope: 'logs-admin',
      route: '/logs/admin',
      entityLabel: '관리자 로그',
      retention: ADMIN_LOG_RETENTION,
      axes: ADMIN_LOG_AXES,
      columns: COLUMNS,
      // 정렬 규칙은 **어댑터의 것**을 그대로 쓴다 — 두 벌을 두면 헤더는 정렬 가능하다고 하는데
      // 어댑터는 그 키를 모르는 상태가 조용히 생긴다 (컬럼 id = 정렬 키의 단일 원천)
      sortValues: adminLogSpec.sortValues,
      caption:
        '관리자 로그 — 행을 누르면 그 요청의 상세 페이로드가 열리고, 행위자 계정이나 대상 이름을 누르면 그 화면으로 이동합니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다.',
      searchLabel: '행위자, 대상 또는 IP 검색',
      searchPlaceholder: '행위자 · 대상 · IP 검색',
      csvBaseName: 'admin-log',
      toneOf,
      detailOf,
      toCsv,
      fetchPage: fetchAdminLogs,
      fetchExport: fetchAdminLogsForExport,
      highlightOf,
    }),
    [],
  );

  return <LogListShell spec={spec} />;
}
