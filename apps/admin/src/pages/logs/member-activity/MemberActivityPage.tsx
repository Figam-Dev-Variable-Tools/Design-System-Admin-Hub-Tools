// 회원 활동 로그 (라우트: /logs/member-activity)
//
// "이 회원이 정말 그 주문을 했나요?" · "탈퇴 전에 무슨 일이 있었나요?" 에 답하는 화면이다.
//
// [이 파일이 하는 일] 화면의 정의(LogScreenSpec)를 적는 것뿐이다 — 나머지는 LogListShell 이 갖는다.
//
// [두 개의 목적지 — 그리고 왜 헷갈리지 않는가]
//   · **행**을 누르면 그 요청의 **페이로드**가 열린다 (이 화면의 본업 — 무엇을 보냈는가).
//   · **계정 링크**를 누르면 그 **회원 상세**로 간다 (링크는 밑줄과 손가락 커서로 링크임을 말한다).
// 행 이동 훅이 링크 클릭을 행 활성화에서 제외하므로(useRowNavigation 의 인터랙티브 가드)
// 계정을 누른 사람에게 페이로드가 뜨는 일은 없다.
// 탈퇴 회원은 링크가 아니다 — 가리킬 레코드가 없다. 없는 계정을 있는 것처럼 보이게 하지 않는다.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import { OutcomeCell, StackCell } from '../components/cells';
import { LogListShell } from '../components/LogListShell';
import { formatLogTime } from '../time';
import type { LogColumn, LogDetail, LogResult, LogScreenSpec, LogTone } from '../types';
import {
  fetchMemberActivityLogs,
  fetchMemberActivityLogsForExport,
  memberActivitySpec,
  toCsv,
} from './data-source';
import {
  MEMBER_ACTIVITY_AXES,
  MEMBER_ACTIVITY_LABEL,
  MEMBER_ACTIVITY_RETENTION,
  MEMBER_OUTCOME_LABEL,
} from './types';
import type { MemberActivityEntry } from './types';

/** 회원 셀 — 등록 회원은 상세로 가는 링크, 탈퇴 회원은 그냥 글자 */
function MemberCell({ entry }: { readonly entry: MemberActivityEntry }) {
  if (entry.memberId === null) {
    return <StackCell primary={entry.memberAccount} secondary={`${entry.memberName} · 탈퇴`} />;
  }

  return (
    <StackCell
      primary={
        <Link to={`/users/members/${entry.memberId}`} className="tds-ui-link tds-ui-focusable">
          {entry.memberAccount}
        </Link>
      }
      secondary={entry.memberName}
    />
  );
}

const COLUMNS: readonly LogColumn<MemberActivityEntry>[] = [
  {
    id: 'occurredAt',
    label: '시각',
    nowrap: true,
    render: (entry) => formatLogTime(entry.occurredAtIso),
  },
  { id: 'member', label: '회원', nowrap: true, render: (entry) => <MemberCell entry={entry} /> },
  {
    id: 'activity',
    label: '활동',
    nowrap: true,
    render: (entry) => MEMBER_ACTIVITY_LABEL[entry.activity],
  },
  { id: 'summary', label: '내용', render: (entry) => entry.summary },
  {
    id: 'outcome',
    label: '결과',
    nowrap: true,
    render: (entry) => (
      <OutcomeCell
        failed={entry.outcome === 'failure'}
        successLabel={MEMBER_OUTCOME_LABEL.success}
        failureLabel={MEMBER_OUTCOME_LABEL.failure}
        reason={entry.failureReason}
      />
    ),
  },
  {
    id: 'device',
    label: '접속',
    nowrap: true,
    render: (entry) => <StackCell primary={entry.ip} secondary={entry.device} />,
  },
];

function toneOf(entry: MemberActivityEntry): LogTone {
  return entry.outcome === 'failure' ? 'danger' : 'neutral';
}

function detailOf(entry: MemberActivityEntry): LogDetail {
  return {
    title: `${MEMBER_ACTIVITY_LABEL[entry.activity]} · ${entry.memberAccount}`,
    fields: [
      { label: '시각', value: formatLogTime(entry.occurredAtIso) },
      { label: '회원', value: `${entry.memberAccount} (${entry.memberName})` },
      { label: '회원 상태', value: entry.memberId === null ? '탈퇴' : '유지' },
      { label: '활동', value: MEMBER_ACTIVITY_LABEL[entry.activity] },
      { label: '내용', value: entry.summary },
      {
        label: '결과',
        value: (
          <OutcomeCell
            failed={entry.outcome === 'failure'}
            successLabel={MEMBER_OUTCOME_LABEL.success}
            failureLabel={MEMBER_OUTCOME_LABEL.failure}
            reason={entry.failureReason}
          />
        ),
      },
      { label: 'IP', value: entry.ip },
      { label: '기기', value: entry.device },
      { label: '로그 ID', value: entry.id },
    ],
    payload: entry.payload,
    payloadLabel: '요청 페이로드',
  };
}

/** 탈퇴는 되돌릴 수 없는 사건이다 — 실패보다 먼저 말한다 */
function highlightOf(result: LogResult<MemberActivityEntry>): string | null {
  const withdraw = result.axisCounts['activity']?.['withdraw'] ?? 0;
  const failure = result.axisCounts['outcome']?.['failure'] ?? 0;

  if (withdraw > 0) return `이 기간의 탈퇴 ${formatNumber(withdraw)}건`;
  if (failure > 0) return `이 기간의 실패 ${formatNumber(failure)}건`;
  return null;
}

export default function MemberActivityPage() {
  const spec = useMemo<LogScreenSpec<MemberActivityEntry>>(
    () => ({
      scope: 'logs-member',
      route: '/logs/member-activity',
      entityLabel: '회원 활동 로그',
      retention: MEMBER_ACTIVITY_RETENTION,
      axes: MEMBER_ACTIVITY_AXES,
      columns: COLUMNS,
      sortValues: memberActivitySpec.sortValues,
      caption:
        '회원 활동 로그 — 행을 누르면 그 요청의 상세 페이로드가 열리고, 계정을 누르면 회원 상세로 이동합니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다.',
      searchLabel: '회원, 내용 또는 IP 검색',
      searchPlaceholder: '회원 · 내용 · IP 검색',
      csvBaseName: 'member-activity-log',
      toneOf,
      detailOf,
      toCsv,
      fetchPage: fetchMemberActivityLogs,
      fetchExport: fetchMemberActivityLogsForExport,
      highlightOf,
    }),
    [],
  );

  return <LogListShell spec={spec} />;
}
