// 로그인 이력 표
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 표에 **없는** 것 — 그리고 왜 없는가]
//
//   · **체크박스 열이 없다.** 일괄 액션이 없기 때문이다. 선택은 무언가를 하기 위한 것이지
//     선택 그 자체가 목적이 아니다 (회원 관리에서 지적된 결함 — FS-003 검수).
//   · **⋯ 액션 열이 없다.** 삭제도 수정도 없다. 감사 기록은 불변이다 —
//     지울 수 있는 감사 로그는 감사 로그가 아니다. 침입자가 가장 먼저 지우는 것이 자기 흔적이다.
//
// 이 표가 하는 일은 **보여주는 것과, 눌러서 그 계정으로 가는 것** 둘뿐이다.
// ─────────────────────────────────────────────────────────────────────────────
//
// [표 골격은 @tds/ui 의 Table 이 소유한다] 예전에는 이 파일이 <table>·스켈레톤·빈 행·행 이동
// 가드를 손으로 그렸다. 이제 DS Table 에 columns/rows 만 넘긴다. 실패 행의 위험 강조는 DS Table 의
// `tone: 'danger'` 로 옮겼다(예전의 tds-lh-failed 클래스를 대신한다) — 색조는 hover 에도 살아남고
// 하드코딩 색이 아니라 feedback 토큰에서 온다.
//
// [실패 행 강조] 색만으로 전달하지 않는다 — tone(danger 배경) + ✕ 아이콘 + '실패' 글자 +
// 실패 사유 + 연속 실패 배지가 함께 간다. 색을 못 보는 사람도 어느 행이 실패인지 읽을 수 있다.
//
// [행 이동은 두 목적지로 갈린다] 회원이면 /users/members/:id, 운영자면 /users/admins/:id.
// 미등록 계정은 가리킬 레코드가 없어 이동하지 않는다(그 행에는 onActivate 를 걸지 않는다 —
// 커서도 pointer 가 되지 않는다). 계정 이름 링크는 DS Table 가드가 <a> 내부 클릭을 행 활성화에서
// 제외하므로 행 이동과 공존한다.
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { badgeStyle, Icon } from '../../../shared/ui';
import { formatDateTime } from '../../../shared/format';
import {
  ACCOUNT_KIND_LABEL,
  consecutiveFailureLabel,
  detailPathOf,
  FAILURE_REASON_LABEL,
  OUTCOME_LABEL,
  PAGE_SIZE,
} from '../types';
import type { LoginHistoryEntry } from '../types';
import { cssVar, Table } from '@tds/ui';

const COLUMNS = [
  { id: 'time', header: '시각', nowrap: true },
  { id: 'account', header: '계정', nowrap: true },
  { id: 'name', header: '이름', nowrap: true },
  { id: 'kind', header: '유형', nowrap: true },
  { id: 'outcome', header: '결과', nowrap: true },
  { id: 'reason', header: '실패 사유', nowrap: true },
  { id: 'ip', header: 'IP', nowrap: true },
  { id: 'device', header: '기기' },
] as const;

const mutedStyle: CSSProperties = { color: cssVar('color.text.muted') };

/** 결과 셀 — 아이콘 + 글자 + 배지를 한 줄로 */
const outcomeInnerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const failureTextStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

/** '실패 3회 연속' — 계정 탈취 시도의 신호. 이 배지가 이 화면이 존재하는 이유다 */
const streakBadgeStyle: CSSProperties = {
  ...badgeStyle,
  background: cssVar('color.feedback.danger.border'),
  color: cssVar('color.text.on-primary'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const reasonStyle: CSSProperties = { color: cssVar('color.feedback.danger.text') };

const accountStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

/** 기기 — 브라우저와 OS 를 한 칸에 두 줄로 */
const deviceStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0 };
const deviceSubStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

interface LoginHistoryTableProps {
  readonly entries: readonly LoginHistoryEntry[];
  readonly loading: boolean;
}

export function LoginHistoryTable({ entries, loading }: LoginHistoryTableProps) {
  const navigate = useNavigate();

  const rows = entries.map((entry) => {
    const failed = entry.outcome === 'failure';
    const detailPath = detailPathOf(entry);
    const streak = consecutiveFailureLabel(entry);

    return {
      id: entry.id,
      /* 셀은 DS Table 이 각자 keyed <td> 로 감싸지만, 배열 리터럴 안의 JSX 는 react/jsx-key 가
         키를 요구한다 — 열 id 로 키를 준다(위치 고정이라 안정적이다). */
      cells: [
        formatDateTime(entry.occurredAtIso),
        detailPath === null ? (
          <span key="account" style={accountStyle}>
            {entry.account}
          </span>
        ) : (
          <Link
            key="account"
            to={detailPath}
            className="tds-ui-link tds-ui-focusable"
            style={accountStyle}
          >
            {entry.account}
          </Link>
        ),
        // 미등록 계정에는 이름이 없다 — 존재하지 않는 사람의 이름을 지어내지 않는다
        entry.name === '' ? (
          <span key="name" style={mutedStyle}>
            —
          </span>
        ) : (
          entry.name
        ),
        ACCOUNT_KIND_LABEL[entry.accountKind],
        <span key="outcome" style={outcomeInnerStyle}>
          {failed ? (
            <>
              <span style={failureTextStyle}>
                <Icon name="x-circle" />
                {OUTCOME_LABEL.failure}
              </span>
              {streak !== null && <span style={streakBadgeStyle}>{streak}</span>}
            </>
          ) : (
            OUTCOME_LABEL.success
          )}
        </span>,
        entry.failureReason === null ? (
          <span key="reason" style={mutedStyle}>
            —
          </span>
        ) : (
          <span key="reason" style={reasonStyle}>
            {FAILURE_REASON_LABEL[entry.failureReason]}
          </span>
        ),
        entry.ip,
        <span key="device" style={deviceStyle}>
          <span>{entry.browser}</span>
          <span style={deviceSubStyle}>{entry.os}</span>
        </span>,
      ],
      // 실패 행은 위험 색조 — 배경은 그 위의 강조일 뿐, 뜻은 셀 안 아이콘·글자·배지가 전한다
      ...(failed && { tone: 'danger' as const }),
      // 미등록 계정은 갈 곳이 없다 — onActivate 를 걸지 않아 커서도 pointer 가 되지 않는다
      ...(detailPath !== null && {
        onActivate: () => {
          navigate(detailPath);
        },
      }),
    };
  });

  return (
    <Table
      caption="로그인 이력 — 행을 누르면 해당 계정의 상세로 이동해요. 미등록 계정은 가리킬 계정이 없어 이동하지 않아요. 이 목록은 읽기 전용이며 수정·삭제할 수 없어요."
      columns={COLUMNS}
      rows={rows}
      loading={loading}
      skeletonRows={PAGE_SIZE}
      empty="조회된 로그인 이력이 없어요."
    />
  );
}
