// 로그인 이력 표
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 표에 **없는** 것 — 그리고 왜 없는가]
//
//   · **체크박스 열이 없다.** 일괄 액션이 없기 때문이다. 선택은 무언가를 하기 위한 것이지
//     선택 그 자체가 목적이 아니다 (회원 관리에서 지적된 결함 — FS-003 검수).
//   · **⋯ 액션 열이 없다.** 삭제도 수정도 없다. 감사 기록은 불변이다 —
//     지울 수 있는 감사 로그는 감사 로그가 아니다. 침입자가 가장 먼저 지우는 것이 자기 흔적이다.
//     `data-source.ts` 에 삭제 함수를 만들지 않았으므로 **여기서 부를 수 있는 것도 없다.**
//
// 이 표가 하는 일은 **보여주는 것과, 눌러서 그 계정으로 가는 것** 둘뿐이다.
// ─────────────────────────────────────────────────────────────────────────────
//
// [실패 행 강조] 색만으로 전달하지 않는다 — 배경(danger surface) + ✕ 아이콘 + '실패' 글자 +
// 실패 사유 + 연속 실패 배지가 함께 간다. 색을 못 보는 사람도 어느 행이 실패인지 읽을 수 있다.
//
// [a11y] 시각적으로 숨긴 <caption> · 모든 th 에 scope · 행 이동 경로 외에 이름 링크가 따로 있다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  badgeStyle,
  Icon,
  SkeletonRows,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { formatDateTime } from '../../../shared/format';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import {
  ACCOUNT_KIND_LABEL,
  consecutiveFailureLabel,
  detailPathOf,
  FAILURE_REASON_LABEL,
  OUTCOME_LABEL,
  PAGE_SIZE,
} from '../types';
import type { LoginHistoryEntry } from '../types';
import { cssVar } from '@tds/ui';

const COLUMNS = ['시각', '계정', '이름', '유형', '결과', '실패 사유', 'IP', '기기'] as const;

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const accountCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  whiteSpace: 'nowrap',
};

/** 값이 없는 칸 — 지어내지 않고 '—' 로 비워 둔다 */
const emptyValueStyle: CSSProperties = {
  ...nowrapCellStyle,
  color: cssVar('color.text.muted'),
};

const emptyRowStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

/** 결과 셀의 내용물 — 아이콘 + 글자 + 배지를 한 줄로 (td 에 직접 flex 를 주면 표 레이아웃이 깨진다) */
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

const reasonCellStyle: CSSProperties = {
  ...nowrapCellStyle,
  color: cssVar('color.feedback.danger.text'),
};

/** 기기 — 브라우저와 OS 를 한 칸에 두 줄로 */
const deviceStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

const deviceSubStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface LoginHistoryTableProps {
  readonly entries: readonly LoginHistoryEntry[];
  readonly loading: boolean;
}

export function LoginHistoryTable({ entries, loading }: LoginHistoryTableProps) {
  // 행 어디를 눌러도 그 계정의 상세로 간다 — 이름 링크는 훅이 알아서 제외한다
  const { rowNavProps } = useRowNavigation();

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        로그인 이력 — 행을 누르면 해당 계정의 상세로 이동합니다. 미등록 계정은 가리킬 계정이 없어
        이동하지 않습니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다.
      </caption>

      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={COLUMNS.length} />
        ) : entries.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length} style={emptyRowStyle}>
              조회된 로그인 이력이 없습니다.
            </td>
          </tr>
        ) : (
          entries.map((entry) => {
            const failed = entry.outcome === 'failure';
            const detailPath = detailPathOf(entry);
            const streak = consecutiveFailureLabel(entry);

            // 미등록 계정은 갈 곳이 없다 — 행 이동도, 손가락 커서도 붙이지 않는다
            const navProps = detailPath === null ? {} : rowNavProps(detailPath);

            return (
              <tr
                key={entry.id}
                className={failed ? 'tds-ui-row tds-lh-failed' : 'tds-ui-row'}
                {...navProps}
              >
                <td style={nowrapCellStyle}>{formatDateTime(entry.occurredAtIso)}</td>

                <td style={accountCellStyle}>
                  {detailPath === null ? (
                    entry.account
                  ) : (
                    <Link to={detailPath} className="tds-ui-link tds-ui-focusable">
                      {entry.account}
                    </Link>
                  )}
                </td>

                {/* 미등록 계정에는 이름이 없다 — 존재하지 않는 사람의 이름을 지어내지 않는다 */}
                {entry.name === '' ? (
                  <td style={emptyValueStyle}>—</td>
                ) : (
                  <td style={nowrapCellStyle}>{entry.name}</td>
                )}

                <td style={nowrapCellStyle}>{ACCOUNT_KIND_LABEL[entry.accountKind]}</td>

                <td style={nowrapCellStyle}>
                  <span style={outcomeInnerStyle}>
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
                  </span>
                </td>

                {entry.failureReason === null ? (
                  <td style={emptyValueStyle}>—</td>
                ) : (
                  <td style={reasonCellStyle}>{FAILURE_REASON_LABEL[entry.failureReason]}</td>
                )}

                <td style={nowrapCellStyle}>{entry.ip}</td>

                <td style={nowrapCellStyle}>
                  <span style={deviceStyle}>
                    <span>{entry.browser}</span>
                    <span style={deviceSubStyle}>{entry.os}</span>
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
